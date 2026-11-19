import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열) 또는 던져진 오류의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    return (e as Error).name
  }
}

// 비교표의 칸마다: 칸 텍스트가 text와 정확히 같고(부정·뒤바뀐 칸이 통과하지 않도록 전체 문구를 비교한다), 그 칸이 주장하는 동작을 probes가 실제로 실행해 확인한다.
type Cell = { text: string; probes: { probe: string; expected: string }[] }

const SLOPPY_NAMED = 'var f = function g() { g = 1; return typeof g; }; f()'
const STRICT_NAMED =
  "var f = function g() { 'use strict'; try { g = 1; } catch (e) { return e.name; } return typeof g; }; f()"
// 익명 함수 표현식 안에는 자기 이름 바인딩이 없어 바깥 변수를 읽는다(이름 있는 쪽은 function).
const ANON_READS_OUTER =
  'var fact = function () { return typeof fact; }; var k = fact; fact = 1; k()'
const NAMED_OWN_BINDING =
  'var fact = function fact() { return typeof fact; }; var k = fact; fact = 1; k()'
const NO_BINDING_IN_CTOR = "new Function('return typeof anonymous')()"
const outerScope = (make: string) =>
  `var x = 'global'; function o() { var x = 'local'; return ${make}; } o()`

const table: { form: string; example: string; cells: [Cell, Cell, Cell] }[] = [
  {
    form: '함수 선언',
    example: '1, 2',
    cells: [
      {
        text: '둘러싼 스코프의 변수',
        probes: [
          {
            probe: 'function outer() { function inner() {} return typeof inner; } outer()',
            expected: 'function',
          },
        ],
      },
      {
        text: '보통 변수처럼 다시 대입할 수 있음',
        probes: [{ probe: 'function d() {} d = 1; typeof d', expected: 'number' }],
      },
      {
        text: '선언이 놓인 곳의 스코프',
        probes: [
          {
            probe:
              "var x = 'global'; function o() { var x = 'local'; function inner() { return x; } return inner(); } o()",
            expected: 'local',
          },
        ],
      },
    ],
  },
  {
    form: '익명 함수 표현식',
    example: '4',
    cells: [
      {
        text: '해당 없음(이름 바인딩 없음)',
        probes: [{ probe: ANON_READS_OUTER, expected: 'number' }],
      },
      {
        text: '해당 없음(이름 바인딩 없음)',
        probes: [{ probe: ANON_READS_OUTER, expected: 'number' }],
      },
      {
        text: '식을 평가한 곳의 스코프',
        probes: [{ probe: outerScope('(function () { return x; })()'), expected: 'local' }],
      },
    ],
  },
  {
    form: '이름 있는 함수 표현식',
    example: '1, 2, 3, 4',
    cells: [
      {
        text: '그 함수 표현식만을 위한 환경(함수 안에서만 보임)',
        probes: [
          {
            probe: 'var f = function g() { return typeof g; }; f() + " " + typeof g',
            expected: 'function undefined',
          },
          { probe: NAMED_OWN_BINDING, expected: 'function' },
        ],
      },
      {
        text: 'sloppy mode에서는 무시, strict mode에서는 TypeError',
        probes: [
          { probe: SLOPPY_NAMED, expected: 'function' },
          { probe: STRICT_NAMED, expected: 'TypeError' },
        ],
      },
      {
        text: '식을 평가한 곳의 스코프',
        probes: [{ probe: outerScope('(function g() { return x; })()'), expected: 'local' }],
      },
    ],
  },
  {
    form: 'Function 생성자',
    example: '5',
    cells: [
      {
        text: '해당 없음(이름 바인딩 없음)',
        probes: [{ probe: NO_BINDING_IN_CTOR, expected: 'undefined' }],
      },
      {
        text: '해당 없음(이름 바인딩 없음)',
        probes: [{ probe: NO_BINDING_IN_CTOR, expected: 'undefined' }],
      },
      {
        text: '전역 환경(만든 곳의 지역 변수는 보지 못함)',
        probes: [
          { probe: outerScope("new Function('return x')()"), expected: 'global' },
          { probe: "let toplet = 'seen'; new Function('return toplet')()", expected: 'seen' },
        ],
      },
    ],
  },
]

describe('비교표', () => {
  const rows = tableBody(mdx, [
    '형태',
    '이름 바인딩이 생기는 곳',
    '그 이름에 대입하면',
    '함수가 보는 바깥 스코프',
    '예제',
  ])

  it('행이 4개이고 형태 칸이 정의와 같다', () => {
    expect(rows.map((r) => r[0])).toEqual(table.map((t) => t.form))
  })

  for (const [i, t] of table.entries()) {
    describe(t.form, () => {
      it('예제 칸이 대응표와 같고 번호가 본문의 실제 예제 번호다', () => {
        expect(rows[i][4]).toBe(t.example)
        const files = exampleFilesByNumber(mdx)
        for (const n of t.example.split(', ').map(Number)) {
          expect(files.has(n), `예제 ${n}`).toBe(true)
        }
      })

      it.each(t.cells.map((c, col) => [col + 1, c] as const))(
        '칸 %i: 칸 텍스트가 text와 같고 probe 결과가 같다',
        (col, cell) => {
          expect(rows[i][col], `${t.form} 칸 ${col}`).toBe(cell.text)
          for (const { probe, expected } of cell.probes) expect(show(probe), probe).toBe(expected)
        },
      )
    })
  }

  it('"해당 없음" 칸은 모두 이름 바인딩 없음으로 설명한다', () => {
    for (const r of rows) {
      for (const cell of r.slice(1, 3)) {
        if (cell.includes('해당 없음')) expect(cell).toContain('이름 바인딩 없음')
      }
    }
  })
})

describe('예제가 없는 주장의 탐침', () => {
  it('본문: 맨 바깥 let은 Function 생성자로 만든 함수에 보인다(전역 객체의 프로퍼티만 보는 것이 아니다)', () => {
    expect(
      show("let toplet = 'seen'; typeof globalThis.toplet + ' ' + new Function('return toplet')()"),
    ).toBe('undefined seen')
  })

  it('본문: Function 생성자로 만든 함수 안에는 anonymous라는 이름 바인딩이 없다', () => {
    expect(show("new Function('return typeof anonymous')()")).toBe('undefined')
  })

  it('본문: const에 대입하면 sloppy mode에서도 TypeError다(함수 표현식 이름과 다르다)', () => {
    expect(show('const c = 1; try { c = 2; } catch (e) { e.name; }')).toBe('TypeError')
  })

  it('본문: 변수에 담은 익명 함수 표현식의 name은 변수 이름으로 정해진다(이름 바인딩과 별개)', () => {
    expect(show('var fact = function () {}; fact.name')).toBe('fact')
  })

  it('본문: 이름 있는 함수 표현식의 이름은 바깥에도 전역 객체에도 없다', () => {
    expect(show("var a = function b() {}; typeof b + ' ' + ('b' in globalThis)")).toBe(
      'undefined false',
    )
  })

  it('본문: 함수 본문의 문 맨 앞 function () {}는 SyntaxError이고 return 뒤는 괜찮다', () => {
    expect(show('function wrap() { function () {} }')).toBe('SyntaxError')
    expect(show('function wrap() { return function () {}; } typeof wrap()')).toBe('function')
  })
})

// 출력과 던져진 오류의 이름을 함께 돌려준다(runExample은 던지면 이미 수집한 출력을 잃는다).
function runCollect(code: string): { out: string[]; error: string | null } {
  const out: string[] = []
  try {
    runInNewContext(code, { console: { log: (...a: unknown[]) => out.push(a.join(' ')) } })
    return { out, error: null }
  } catch (e) {
    return { out, error: (e as Error).name }
  }
}

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s',
    (id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      let strictOutput: string[] | null
      try {
        strictOutput = runExample(STRICT + code)
      } catch {
        strictOutput = null
      }
      // 이름 있는 함수 표현식 이름에 대한 sloppy 대입 무시에 기대는 예제 2만 지시어를 붙이면 달라진다(TypeError로 중단).
      if (id === 'rebind') {
        expect(strictOutput).toBeNull()
        // 첫 출력 뒤 f()의 g = 1에서 TypeError가 나 스크립트가 멈춘다.
        expect(runCollect(STRICT + code)).toEqual({ out: ['number'], error: 'TypeError' })
      } else {
        expect(strictOutput).toEqual(expectedOutput)
      }
    },
  )
})

describe('예제 5의 전역 스크립트 전제', () => {
  it('맨 바깥 코드를 함수로 감싸면(CommonJS처럼) x가 전역에 없어 11번 줄 호출에서 ReferenceError다', () => {
    const code = readExample('function-constructor.js')
    expect(runCollect(`(function () {\n${code}\n})();`)).toEqual({
      out: ['local'],
      error: 'ReferenceError',
    })
  })
})

// content.mdx의 PredictQuiz를 읽어 정답 선택지가 예제의 expectedOutput을 ' / '로 이은 문자열과 같은지 검사한다.
describe('퀴즈 정답', () => {
  const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
    const body = m[1]
    const question = body.match(/question="([^"]*)"/)![1]
    const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
    const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
    const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
    const example = Number(question.match(/예제 (\d+)/)![1])
    return { choices, answer, example }
  })
  const numbers = [1, 2, 3, 4, 5, 6]

  it('퀴즈가 예제 1~6마다 하나씩 6개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(6)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const expected = concept.examples[n - 1].expectedOutput.join(' / ')
    expect(quiz.choices).toHaveLength(4)
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 95다', () => {
    expect(concept.order).toBe(95)
  })

  it('본문에 "이름이 없" 표현이 없다(이름 바인딩으로 한정해 쓴다)', () => {
    expect(mdx).not.toMatch(/이름이 없/)
  })

  it('"함수 식"이라는 표현을 쓰지 않는다(함수 표현식으로 통일)', () => {
    expect(mdx).not.toMatch(/함수 식(?!별)/)
  })
})
