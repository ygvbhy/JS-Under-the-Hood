import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts, getConcept } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const EXAMPLE_IDS = [
  'same-name',
  'skipped-case',
  'fall-through',
  'braces',
  'declaration-kinds',
  'function-in-case',
  'head-and-case',
]
const src = (n: number) => readExample(concept.examples[n - 1].file)
const expectedOf = (n: number) => concept.examples[n - 1].expectedOutput

// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function errorNameOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (e) {
    return (e as Error).name
  }
  return undefined
}

// --- 예제 파일 조건 -------------------------------------------------------------------------------

describe('예제 파일 조건', () => {
  it('예제 7개가 계획의 순서와 파일 이름으로 등록되어 있다', () => {
    expect(concept.examples.map((e) => e.id)).toEqual(EXAMPLE_IDS)
    expect(concept.examples.map((e) => e.file)).toEqual(EXAMPLE_IDS.map((id) => `${id}.js`))
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it('예제 파일에 eval이 없고 지시어도 없다', () => {
    for (const e of concept.examples) {
      const code = readExample(e.file)
      expect(code, e.file).not.toMatch(/\beval\b/)
      expect(code.startsWith(STRICT), e.file).toBe(false)
    }
  })
})

// --- 'use strict'; 접두 ----------------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each([1, 2, 3, 4, 5, 7])('예제 %i: 붙여도 출력이 같다', (n) => {
    expect(runExample(src(n))).toEqual(expectedOf(n))
    expect(runExample(STRICT + src(n))).toEqual(expectedOf(n))
  })

  it('예제 6은 sloppy mode에 기대며 strict mode에서는 둘째·셋째 줄이 ReferenceError다', () => {
    expect(runExample(src(6))).toEqual(['function', 'true', 'false'])
    expect(runExample(STRICT + src(6))).toEqual(['function', 'ReferenceError', 'ReferenceError'])
  })
})

// --- 본문 주장: 실제 스크립트에서의 early error ---------------------------------------------------

describe('실제 스크립트의 early error', () => {
  it('예제 1의 첫 코드 문자열을 스크립트에 그대로 쓰면 SyntaxError이고 어떤 줄도 실행되지 않는다', () => {
    const first = src(1).match(/tryCompile\('([^']*)'\)/)![1]
    expect(first).toBe('switch (n) { case 0: let x = 1; break; case 1: let x = 2; }')
    const out: string[] = []
    const run = () =>
      runInNewContext(`console.log(1);\n${first}`, {
        console: { log: (...a: unknown[]) => out.push(format(...a)) },
      })
    expect(errorNameOf(run)).toBe('SyntaxError')
    expect(out).toEqual([])
  })

  it('switch 안의 var는 더 안쪽 블록에 있어도 case의 let·함수 선언과 충돌하고, switch 밖의 var와는 충돌하지 않는다', () => {
    const parse = (code: string) => errorNameOf(() => new Script(code))
    expect(
      parse('function g(n) { switch (n) { case 0: let x = 1; break; case 1: { var x; } } }'),
    ).toBe('SyntaxError')
    expect(
      parse('function g(n) { switch (n) { case 0: function f() {} break; case 1: var f; } }'),
    ).toBe('SyntaxError')
    expect(parse('function g(n) { var x; switch (n) { case 0: let x = 1; } }')).toBeUndefined()
    expect(parse('function g(n) { switch (n) { case 0: let x = 1; } var x; }')).toBeUndefined()
  })

  it('case 안의 더 안쪽 블록에 쓴 let은 다른 case의 var와 충돌하지 않는다', () => {
    const parse = (code: string) => errorNameOf(() => new Script(code))
    expect(
      parse('function g(n) { switch (n) { case 0: { let x = 1; } break; case 1: var x; } }'),
    ).toBeUndefined()
  })

  // using 선언을 지원하지 않는 Node(22)에서는 건너뛴다.
  const supportsUsing = errorNameOf(() => new Script('{ using u = null; }')) === undefined
  it.skipIf(!supportsUsing)(
    'using 선언은 case 절에 바로 쓰면 이름 중복 없이도 SyntaxError이고 중괄호 블록 안에서는 된다',
    () => {
      const parse = (code: string) => errorNameOf(() => new Script(code))
      expect(parse('function g(n) { switch (n) { case 0: using u = null; } }')).toBe('SyntaxError')
      expect(parse('function g(n) { switch (n) { default: using u = null; } }')).toBe('SyntaxError')
      expect(parse('function g(n) { switch (n) { case 0: { using u = null; } } }')).toBeUndefined()
    },
  )
})

// --- 틀린 모델 -------------------------------------------------------------------------------------
// 예제 파일 원문을 명시 치환(치환 횟수를 단언)한 코드를 같은 실행기 방식으로 실행한다.
// 출력은 하드코딩해 단언한다. 퀴즈의 오답은 이 모델 출력에서 만든다.
// 오류로 끝나고 출력이 0줄인 SyntaxError는 'SyntaxError로 실행되지 않음'으로 쓴다.

function runModel(code: string): string {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) } }
  try {
    runInNewContext(code, sandbox, { timeout: 2000 })
  } catch (e) {
    const name = (e as Error).name
    if (out.length === 0 && name === 'SyntaxError') return 'SyntaxError로 실행되지 않음'
    throw new Error(`예상하지 못한 오류 ${name} (출력 ${out.length}줄)`, { cause: e })
  }
  return out.join(' / ')
}

// from이 정확히 count번 있는지 확인한 뒤 모두 to로 바꾼다($ 패턴 해석을 피하려고 split/join을 쓴다).
function rep(code: string, from: string, to: string, count = 1): string {
  const parts = code.split(from)
  expect(parts.length - 1, from).toBe(count)
  return parts.join(to)
}

type Model = {
  name: string
  apply: (code: string) => string
  // runModel이 돌려주는 값(하드코딩)
  output: string
  // 퀴즈 선택지에 오르는 값(하드코딩)
  choice: string
}

// 퀴즈에 쓰는 값: 예제 5는 출력에서 ok인 줄의 라벨, 나머지는 출력 전체
function quizValue(n: number, output: string): string {
  if (n !== 5) return output
  return output
    .split(' / ')
    .filter((line) => line.endsWith(' ok'))
    .map((line) => line.slice(0, -3))
    .join(', ')
}

const MODELS: Record<number, Model[]> = {
  1: [
    {
      name: 'case마다 자기 블록이 있다',
      apply: (c) =>
        rep(
          rep(
            rep(
              c,
              'case 0: let x = 1; break; case 1: let x = 2; }',
              'case 0: { let x = 1; break; } case 1: { let x = 2; } }',
            ),
            'case 0: let x = 1; break; case 1: let y = 2; }',
            'case 0: { let x = 1; break; } case 1: { let y = 2; } }',
          ),
          'case 0: const x = 1; break; default: const x = 2; }',
          'case 0: { const x = 1; break; } default: { const x = 2; } }',
        ),
      output: 'ok / ok / ok / ok',
      choice: 'ok / ok / ok / ok',
    },
    {
      name: 'case 절에는 let·const를 바로 쓸 수 없다',
      apply: (c) => rep(rep(c, ': let ', ': if (n) let ', 4), ': const ', ': if (n) const ', 2),
      output: 'SyntaxError / SyntaxError / ok / SyntaxError',
      choice: 'SyntaxError / SyntaxError / ok / SyntaxError',
    },
    {
      name: 'default는 case와 따로다',
      apply: (c) => rep(c, 'default: const x = 2; }', 'default: { const x = 2; } }'),
      output: 'SyntaxError / ok / ok / ok',
      choice: 'SyntaxError / ok / ok / ok',
    },
  ],
  2: [
    {
      name: 'case마다 자기 블록이 있다(case 1의 level은 바깥 level)',
      apply: (c) =>
        rep(
          rep(
            rep(c, '    case 0:\n', '    case 0: {\n'),
            '      break;\n    case 1:\n',
            '      break;\n    }\n    case 1: {\n',
          ),
          '      }\n  }\n}',
          '      }\n    }\n  }\n}',
        ),
      output: 'low / high / high',
      choice: 'low / high / high',
    },
    {
      name: 'switch 안 let은 var처럼 동작한다',
      apply: (c) => rep(c, 'let level', 'var level', 2),
      output: 'low / high / none',
      choice: 'low / high / none',
    },
  ],
  3: [
    {
      name: 'case마다 자기 블록이 있다',
      apply: (c) =>
        rep(
          rep(
            rep(c, '    case 0:\n', '    case 0: {\n'),
            "      let step = 'A';\n    case 1:\n",
            "      let step = 'A';\n    }\n    case 1: {\n",
          ),
          '      }\n  }\n}',
          '      }\n    }\n  }\n}',
        ),
      output: 'ReferenceError / ReferenceError',
      choice: 'ReferenceError / ReferenceError',
    },
    {
      name: 'switch 안 let은 var처럼 동작한다',
      apply: (c) => rep(c, 'let step', 'var step'),
      output: 'A / undefined',
      choice: 'A / undefined',
    },
  ],
  4: [
    {
      name: '블록의 닫는 중괄호가 switch를 끝낸다',
      apply: (c) =>
        rep(
          c,
          '      console.log(word);\n    }\n    case 1',
          '      console.log(word);\n      break;\n    }\n    case 1',
        ),
      output: 'zero / one / outer',
      choice: 'zero / one / outer',
    },
    {
      name: '중괄호를 쳐도 같은 블록이다(중괄호 제거)',
      apply: (c) =>
        rep(
          rep(
            rep(
              rep(
                rep(rep(c, 'case 0: {', 'case 0:'), 'case 1: {', 'case 1:'),
                'case 2: {',
                'case 2:',
              ),
              '      console.log(word);\n    }\n    case 1',
              '      console.log(word);\n    case 1',
            ),
            '      break;\n    }\n    case 2',
            '      break;\n    case 2',
          ),
          '      console.log(word);\n    }\n  }',
          '      console.log(word);\n  }',
        ),
      output: 'SyntaxError로 실행되지 않음',
      choice: 'SyntaxError로 실행되지 않음',
    },
    {
      name: '중괄호 안의 let은 var처럼 함수 전체에서 보인다',
      apply: (c) => rep(c, '      let word', '      var word', 2),
      output: 'zero / one / one / undefined',
      choice: 'zero / one / one / undefined',
    },
  ],
  5: [
    {
      name: '함수 선언도 let처럼 중복할 수 없다',
      apply: (c) => rep(c, 'function f() {}', 'let f = function () {};', 4),
      output:
        'class SyntaxError / let-class SyntaxError / let-var SyntaxError / var-var ok / function SyntaxError / strict-function SyntaxError',
      choice: 'var-var',
    },
    {
      name: 'var는 같은 이름의 let과 충돌하지 않는다',
      apply: (c) =>
        rep(
          rep(
            c,
            "'switch (n) { case 0: let v = 1; break; case 1: var v = 2; }'",
            "'var v; switch (n) { case 0: let v = 1; break; case 1: v = 2; }'",
          ),
          "'switch (n) { case 0: var v = 1; break; case 1: var v = 2; }'",
          "'var v; switch (n) { case 0: v = 1; break; case 1: v = 2; }'",
        ),
      output:
        'class SyntaxError / let-class SyntaxError / let-var ok / var-var ok / function ok / strict-function SyntaxError',
      choice: 'let-var, var-var, function',
    },
    {
      name: '함수 선언의 중복은 strict mode에서도 허용된다',
      apply: (c) => rep(c, `"'use strict'; switch`, `"switch`),
      output:
        'class SyntaxError / let-class SyntaxError / let-var SyntaxError / var-var ok / function ok / strict-function ok',
      choice: 'var-var, function, strict-function',
    },
  ],
  6: [
    {
      name: 'case 안 블록의 함수 선언',
      apply: (c) =>
        rep(
          rep(
            rep(c, '    case 0:\n', '    case 0: {\n'),
            '      break;\n    case 1:\n',
            '      break;\n    }\n    case 1: {\n',
          ),
          '      function helper() {}\n  }\n',
          '      function helper() {}\n    }\n  }\n',
        ),
      output: 'undefined / true / false',
      choice: 'undefined / true / false',
    },
    {
      name: '함수 선언은 함수 맨 위로 옮겨진다',
      apply: (c) =>
        rep(
          rep(c, '      function helper() {}\n', ''),
          'function run(n) {\n',
          'function run(n) {\n  function helper() {}\n',
        ),
      output: 'function / false / false',
      choice: 'function / false / false',
    },
    {
      name: '블록 안 함수 선언은 블록 밖에 이름을 만들지 않는다(strict mode 의미)',
      apply: (c) => STRICT + c,
      output: 'function / ReferenceError / ReferenceError',
      choice: 'function / ReferenceError / ReferenceError',
    },
  ],
  7: [
    {
      name: '머리 식도 블록 안에서 평가된다',
      apply: (c) =>
        rep(
          rep(c, '    switch (limit) {', '    {\n    switch (limit) {'),
          '        let limit = 99;\n    }\n',
          '        limit = 99;\n    }\n    let limit;\n    }\n',
        ),
      output: 'ReferenceError / ReferenceError',
      choice: 'ReferenceError / ReferenceError',
    },
    {
      name: 'let은 함수 스코프이고 TDZ만 있다',
      apply: (c) =>
        rep(
          rep(c, '        let limit = 99;\n', '        limit = 99;\n'),
          '  }\n}\ncheck(1);',
          '  }\n  let limit;\n}\ncheck(1);',
        ),
      output: 'ReferenceError / ReferenceError',
      choice: 'ReferenceError / ReferenceError',
    },
    {
      name: 'case 식도 블록 밖에서 평가된다',
      apply: (c) =>
        rep(
          rep(
            rep(c, '    switch (limit) {', '    var c1 = v, c2 = limit;\n    switch (limit) {'),
            'case v:',
            'case c1:',
          ),
          'case limit:',
          'case c2:',
        ),
      output: 'v / limit',
      choice: 'v / limit',
    },
    {
      name: 'case마다 자기 블록이 있다',
      apply: (c) =>
        rep(
          rep(
            rep(
              rep(c, '      case v:\n', '      case v: {\n'),
              '        break;\n      case limit:\n',
              '        break;\n      }\n      case limit: {\n',
            ),
            '        break;\n      default:\n',
            '        break;\n      }\n      default: {\n',
          ),
          '        let limit = 99;\n    }\n',
          '        let limit = 99;\n      }\n    }\n',
        ),
      output: 'v / limit',
      choice: 'v / limit',
    },
    {
      name: 'switch 안 let은 var처럼 동작한다',
      apply: (c) =>
        rep(rep(c, 'let limit = 99', 'var limit = 99'), 'let limit = 1', 'var limit = 1'),
      output: 'limit / limit',
      choice: 'limit / limit',
    },
  ],
}

describe('틀린 모델', () => {
  it('치환 없이 같은 실행기로 돌리면 expectedOutput과 같다(실행기 대조)', () => {
    for (let n = 1; n <= 7; n++)
      expect(runModel(src(n)), `예제 ${n}`).toBe(expectedOf(n).join(' / '))
  })

  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    describe(`예제 ${n}`, () => {
      it.each(MODELS[n].map((m) => [m.name, m] as const))(
        '%s: 출력이 하드코딩 값과 같다',
        (_name, m) => {
          const output = runModel(m.apply(src(n)))
          expect(output).toBe(m.output)
          expect(quizValue(n, output)).toBe(m.choice)
          // 정답과 달라야 한다(예제 5는 퀴즈에 오르는 값으로 비교한다).
          expect(m.choice).not.toBe(quizValue(n, expectedOf(n).join(' / ')))
        },
      )
    })
  }

  it('예제 6은 strict mode로 실행하면 퀴즈의 넷째 선택지와 같다', () => {
    expect(runModel(STRICT + src(6))).toBe('function / ReferenceError / ReferenceError')
  })
})

// --- 퀴즈 ------------------------------------------------------------------------------------------

const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
  const body = m[1]
  const question = body.match(/question="([^"]*)"/)![1]
  const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
  const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
  const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
  const example = Number(question.match(/예제 (\d+)/)![1])
  return { block: body, choices, answer, example }
})

describe('퀴즈', () => {
  const numbers = [1, 2, 3, 4, 5, 6, 7]

  it('퀴즈가 예제 1~7마다 하나씩 7개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
  })

  it('선택지와 정답 위치가 계획과 같다', () => {
    expect(quizzes.map((q) => q.choices)).toEqual([
      [
        'ok / ok / ok / ok',
        'SyntaxError / SyntaxError / ok / SyntaxError',
        'SyntaxError / ok / ok / ok',
        'SyntaxError / ok / ok / SyntaxError',
      ],
      ['low / high / high', 'low / ReferenceError / none', 'low / high / none'],
      ['A / undefined', 'ReferenceError / ReferenceError', 'A / ReferenceError'],
      [
        'zero / one / one / outer',
        'zero / one / outer',
        'SyntaxError로 실행되지 않음',
        'zero / one / one / undefined',
      ],
      [
        'var-var',
        'var-var, function',
        'let-var, var-var, function',
        'var-var, function, strict-function',
      ],
      [
        'undefined / true / false',
        'function / false / false',
        'function / true / false',
        'function / ReferenceError / ReferenceError',
      ],
      ['ReferenceError / ReferenceError', 'v / limit', 'limit / limit', 'v / ReferenceError'],
    ])
    expect(quizzes.map((q) => q.answer)).toEqual([3, 1, 2, 0, 1, 2, 3])
  })

  it.each(numbers)('예제 %i 퀴즈: 정답 선택지는 실제 출력이고 선택지에 중복이 없다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(quizValue(n, expectedOf(n).join(' / ')))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)(
    '예제 %i 퀴즈: 모델 출력은 모두 선택지에 있고 오답마다 그것을 내는 모델이 있다',
    (n) => {
      const quiz = quizzes.find((q) => q.example === n)!
      const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
      const fromModels = MODELS[n].map((m) => quizValue(n, runModel(m.apply(src(n)))))
      for (const v of fromModels) expect(quiz.choices, v).toContain(v)
      expect(new Set(fromModels)).toEqual(new Set(wrong))
    },
  )

  it('예제 6 퀴즈의 넷째 선택지는 strict mode 결과이고 해설이 그 사실을 밝힌다', () => {
    const quiz = quizzes.find((q) => q.example === 6)!
    expect(quiz.choices[3]).toBe(runModel(STRICT + src(6)))
    expect(quiz.block).toContain(
      '네 번째 선택지는 strict mode, ES 모듈, 또는 그 규칙을 지원하지 않는 호스트의 결과',
    )
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })

  it('explanation 속성에는 큰따옴표와 백슬래시가 없고 오답 모델을 짚는다', () => {
    for (const q of quizzes) {
      expect(q.block, `예제 ${q.example}`).toMatch(/explanation="[^"\\]*"\s*$/)
      expect(q.block, `예제 ${q.example}`).toContain('모델')
    }
  })
})

// --- 표 ----------------------------------------------------------------------------------------------

describe('결과 표', () => {
  const rows = tableBody(mdx, ['예제', '결과', '배제한 모델'])

  it('행이 7개이고 첫 칸이 예제 N으로 시작한다', () => {
    expect(rows).toHaveLength(7)
    rows.forEach((r, i) => expect(r[0]).toMatch(new RegExp(`^예제 ${i + 1}: `)))
  })

  it('예제 7의 배제한 모델에 let은 함수 스코프이고 TDZ만 있다는 모델이 있다', () => {
    expect(rows[6][2]).toContain('let은 함수 스코프이고 TDZ만 있다')
  })
})

describe('선언 종류 표', () => {
  const rows = tableBody(mdx, ['선언', '두 case에 같은 이름', '선언한 case보다 앞 case에서 읽기'])

  // 칸 값을 대조할 선언 코드(이름 자리 x). strict는 스크립트 앞의 지시어로 함수를 strict로 만든다.
  const KINDS: { label: string; decl: (x: string) => string; strict: boolean }[] = [
    { label: 'let', decl: (x) => `let ${x} = 1;`, strict: false },
    { label: 'const', decl: (x) => `const ${x} = 1;`, strict: false },
    { label: 'class', decl: (x) => `class ${x} {}`, strict: false },
    { label: 'var', decl: (x) => `var ${x} = 1;`, strict: false },
    { label: '함수 선언(sloppy, 웹 호환 규칙)', decl: (x) => `function ${x}() {}`, strict: false },
    { label: '함수 선언(strict)', decl: (x) => `function ${x}() {}`, strict: true },
  ]

  // 둘째 열: 함수 안 switch (n) { case 0: <선언> break; case 1: <같은 이름 선언> }의 컴파일 결과
  const compileResult = (decl: (x: string) => string, strict: boolean) => {
    const body = `${strict ? "'use strict'; " : ''}switch (n) { case 0: ${decl('x')} break; case 1: ${decl('x')} }`
    return errorNameOf(() => runInNewContext('new Function(body)', { body })) ?? 'ok'
  }

  // 셋째 열: 선언이 하나인 switch에서 n이 0일 때 case 0에서 x를 읽은 결과(오류면 이름, 아니면 typeof)
  const readResult = (decl: (x: string) => string, strict: boolean) => {
    const code = `${strict ? "'use strict'; " : ''}(function (n) { switch (n) { case 0: try { var v = x; return typeof v; } catch (e) { return e.name; } case 1: ${decl('x')} } })(0)`
    return runInNewContext(code) as string
  }

  it('행이 6개이고 첫 칸이 계획의 선언 이름과 같다', () => {
    expect(rows.map((r) => r[0])).toEqual(KINDS.map((k) => k.label))
  })

  it.each(KINDS.map((k, i) => [k.label, i] as const))(
    '%s 행: 두 칸이 실행 결과와 같다',
    (_label, i) => {
      const { decl, strict } = KINDS[i]
      expect(rows[i][1]).toBe(compileResult(decl, strict))
      expect(rows[i][2]).toBe(readResult(decl, strict))
    },
  )

  it('칸 값이 계획과 같다', () => {
    expect(rows.map((r) => [r[1], r[2]])).toEqual([
      ['SyntaxError', 'ReferenceError'],
      ['SyntaxError', 'ReferenceError'],
      ['SyntaxError', 'ReferenceError'],
      ['ok', 'undefined'],
      ['ok', 'function'],
      ['SyntaxError', 'function'],
    ])
  })
})

describe('표 마크업', () => {
  it('표가 region 래퍼 안에 있고 칸에 <가 없다', () => {
    expect(mdx.match(/role="region"/g)).toHaveLength(2)
    expect(mdx.match(/좁은 화면에서는 가로로 스크롤할 수 있습니다/g)).toHaveLength(2)
    for (const m of mdx.matchAll(/^[ \t]*<table\b[\s\S]*?<\/table>/gm)) {
      expect(m[0]).not.toMatch(/\{\s*['"`][^'"`]*</)
    }
  })
})

// --- 메타와 본문 조건 ----------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags·goals에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
    expect(
      [concept.title, concept.summary, ...concept.tags, ...concept.goals].join('\n'),
    ).not.toContain('객체')
  })

  it('order는 145이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(145)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('slug가 있는 선수 개념의 order는 모두 145보다 작다', () => {
    for (const p of concept.prerequisites) {
      if ('slug' in p && p.slug) expect(getConcept(p.slug).order, p.slug).toBeLessThan(145)
    }
  })

  it('독자용 본문에 "테스트"와 eval이 없고 문단이 import·export로 시작하지 않는다', () => {
    expect(mdx).not.toContain('테스트')
    expect(mdx).not.toMatch(/\beval\b/)
    expect(mdx).not.toMatch(/^(import|export)\b/m)
  })

  it('함수 선언 문단이 호스트 조건과 바깥 바인딩의 범위를 밝힌다', () => {
    expect(mdx).toContain('웹 브라우저 호스트에서는 필수이고 다른 호스트에서는 규범이지만 선택')
    expect(mdx).toContain('Node에서 실행한 결과')
    expect(mdx).toContain('이 페이지는 선언이 하나인 경우만 보고')
    expect(mdx).toContain('블록 안 함수 선언마다 감싼 함수에 같은 이름의 바인딩을 따로 만드는 것')
  })

  it('중괄호가 해결하는 것을 같은 이름 선언으로 한정하고 다른 case에서 이름이 안 보이는 근거를 예제 4로 든다', () => {
    expect(mdx).toContain('중괄호가 해결하는 것은 같은 이름 선언이 중복이라는 문제뿐입니다')
    expect(mdx).toContain('예제 4의 `pick(2)`')
  })
})
