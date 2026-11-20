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

// name 칸 표기('decl')와 같게 작은따옴표로 감싼 name을 돌려주는 식으로 감싼다.
const quoted = (expr: string) => `"'" + (${expr}) + "'"`

// 비교표 행마다: 코드·name·이유·예제 칸 전체 문구를 정확히 비교하고, probe가 실제로 실행한 name이 name 칸과 같은지 확인한다.
const table: { code: string; name: string; reason: string; example: number; probe: string }[] = [
  {
    code: 'function decl() {}',
    name: "'decl'",
    reason: '함수 선언에 쓴 이름',
    example: 1,
    probe: 'function decl() {} ' + quoted('decl.name'),
  },
  {
    code: 'var v = function () {};',
    name: "'v'",
    reason: '초기화식이 익명 함수 정의라 바인딩 이름을 받음',
    example: 1,
    probe: 'var v = function () {}; ' + quoted('v.name'),
  },
  {
    code: 'later = function () {};',
    name: "'later'",
    reason: '왼쪽이 식별자이고 오른쪽이 익명 함수 정의라 그 이름을 받음',
    example: 1,
    probe: 'var later; later = function () {}; ' + quoted('later.name'),
  },
  {
    code: 'prop: () => {}',
    name: "'prop'",
    reason: '값이 익명 함수 정의라 프로퍼티 키를 받음',
    example: 2,
    probe: quoted('({ prop: () => {} }).prop.name'),
  },
  {
    code: 'get size()',
    name: "'get size'",
    reason: 'getter는 프로퍼티 키 앞에 get을 붙임',
    example: 2,
    probe: quoted("Object.getOwnPropertyDescriptor({ get size() { return 1; } }, 'size').get.name"),
  },
  {
    code: 'o.p = () => {};',
    name: "''",
    reason: '왼쪽이 식별자가 아니라 이름을 받지 못함',
    example: 3,
    probe: 'var o = {}; o.p = () => {}; ' + quoted('o.p.name'),
  },
  {
    code: 'const comma = (0, function () {});',
    name: "''",
    reason: '오른쪽 식이 쉼표 식이라 함수 정의가 아님',
    example: 3,
    probe: 'const comma = (0, function () {}); ' + quoted('comma.name'),
  },
  {
    code: 'const copy = original;',
    name: "'original'",
    reason: '새 함수를 만들지 않고 이미 있는 함수로 초기화',
    example: 4,
    probe: 'function original() {} const copy = original; ' + quoted('copy.name'),
  },
  {
    code: "new Function('return 1')",
    name: "'anonymous'",
    reason: 'Function 생성자가 정한 이름',
    example: 4,
    probe: quoted("new Function('return 1').name"),
  },
  {
    code: 'f.bind(null)',
    name: "'bound z'",
    reason: 'defineProperty로 name을 z로 바꾼 뒤라 bind할 때의 name 앞에 bound를 붙임',
    example: 5,
    probe:
      "function f() {} Object.defineProperty(f, 'name', { value: 'z' }); " +
      quoted('f.bind(null).name'),
  },
]

describe('비교표', () => {
  const rows = tableBody(mdx, ['코드', 'name', '이유', '예제'])

  it('행이 10개이고 코드 칸이 정의와 같다', () => {
    expect(rows).toHaveLength(table.length)
    expect(rows.map((r) => r[0])).toEqual(table.map((t) => t.code))
  })

  it.each(table.map((t, i) => [i + 1, t] as const))('행 %i', (i, t) => {
    const row = rows[i - 1]
    // 칸 전체 문구를 정확히 비교한다(부분 문자열이 아니다).
    expect(row).toEqual([t.code, t.name, t.reason, String(t.example)])
    // probe가 실제로 실행한 name이 name 칸과 같다.
    expect(show(t.probe), t.probe).toBe(t.name)
    // 예제 칸 번호의 예제 파일에 코드 칸 문자열이 그대로 있다.
    const file = exampleFilesByNumber(mdx).get(t.example)
    expect(file, `예제 ${t.example}`).toBeDefined()
    expect(readExample(file!)).toContain(t.code)
  })
})

describe('예제가 없는 주장의 탐침', () => {
  it('본문: 클래스, 클래스 필드, 디스트럭처링 기본값도 이름을 받는다', () => {
    expect(show('const B = class {}; B.name')).toBe('B')
    expect(show('class C { h = () => {}; } new C().h.name')).toBe('h')
    expect(show('const { a = () => {} } = {}; a.name')).toBe('a')
  })

  it('본문: 이름 없는 제너레이터·async 함수 식과 클래스 식도 익명 함수 정의라 이름을 받는다', () => {
    expect(
      show(
        'const g = function* () {}; const a = async function () {}; const aa = async () => {}; const K = class {}; [g.name, a.name, aa.name, K.name].join(" ")',
      ),
    ).toBe('g a aa K')
  })

  it('단순화: 상속한 클래스에서 name을 지우면 부모 클래스의 name을 읽는다(일반 함수 f와 다름)', () => {
    expect(show('class A {} class D extends A {} delete D.name; D.name')).toBe('A')
    expect(show('const g = function* () {}; Object.getPrototypeOf(g) === Function.prototype')).toBe(
      'false',
    )
  })

  it('본문: 심벌 키 메서드의 name은 [설명] 꼴이고 설명이 없으면 빈 문자열이다', () => {
    expect(show("const d = Symbol('d'); ({ [d]: function () {} })[d].name")).toBe('[d]')
    expect(show('const s = Symbol(); ({ [s]: function () {} })[s].name')).toBe('')
  })

  it('본문: __proto__: function () {}와 왼쪽을 괄호로 감싼 대입은 빈 문자열이다', () => {
    expect(show('const p = ({ __proto__: function () {} }); Object.getPrototypeOf(p).name')).toBe(
      '',
    )
    expect(show('var x; (x) = function () {}; x.name')).toBe('')
  })

  it('본문: ||=, &&=, ??=도 왼쪽이 식별자이면 이름을 넘긴다', () => {
    expect(show('var x = null; x ??= function () {}; x.name')).toBe('x')
    expect(show('var y = 0; y ||= function () {}; y.name')).toBe('y')
    expect(show('var z = 1; z &&= function () {}; z.name')).toBe('z')
  })

  it('본문: 삼항 식과 || 식의 오른쪽은 이름을 넘기지 않는다', () => {
    expect(show('const t = true ? function () {} : 0; t.name')).toBe('')
    expect(show('const u = null || function () {}; u.name')).toBe('')
  })

  it('본문: 이름 있는 함수 정의는 바인딩 이름을 받지 않는다', () => {
    expect(show('({ p: function q() {} }).p.name')).toBe('q')
    expect(show('function g() {} ({ p: g }).p.name')).toBe('g')
  })

  it('본문: Function.prototype 자신의 name은 빈 문자열이고 자기 프로퍼티다', () => {
    expect(show("Object.hasOwn(Function.prototype, 'name') + ' ' + Function.prototype.name")).toBe(
      'true ',
    )
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
      // sloppy mode의 막힌 대입 무시에 기대는 예제 5만 지시어를 붙이면 달라진다(5번 줄에서 TypeError로 중단).
      if (id === 'name-attributes') {
        expect(strictOutput).toBeNull()
        expect(runCollect(STRICT + code)).toEqual({ out: ['false false true'], error: 'TypeError' })
        expect(code.split('\n')[4]).toBe("f.name = 'z';")
      } else {
        expect(strictOutput).toEqual(expectedOutput)
      }
    },
  )
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
  const numbers = [1, 2, 3, 4, 5]

  it('퀴즈가 예제 1~5마다 하나씩 5개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(5)
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

  it('order는 257이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(257)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('본문에서 bound function의 이름을 "원래 이름"이라고 쓰지 않는다', () => {
    expect(mdx).not.toMatch(/원래 이름/)
  })
})
