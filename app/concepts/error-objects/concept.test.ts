import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
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
const EXAMPLE_IDS = [
  'subclass-name',
  'name-ways',
  'json-empty',
  'message-rules',
  'to-string-rules',
  'cause',
  'subclass-cause',
  'call-without-new',
]
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]
const src = (n: number) => readExample(concept.examples[n - 1].file)
const expectedOf = (n: number) => concept.examples[n - 1].expectedOutput

// --- 예제 파일 조건 -------------------------------------------------------------------------------

describe('예제 파일 조건', () => {
  it('예제 8개가 계획의 순서와 파일 이름으로 등록되어 있고 본문의 file= 순서와 같다', () => {
    expect(concept.examples.map((e) => e.id)).toEqual(EXAMPLE_IDS)
    expect(concept.examples.map((e) => e.file)).toEqual(EXAMPLE_IDS.map((id) => `${id}.js`))
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it('예제 파일에 eval과 지시어가 없다', () => {
    for (const e of concept.examples) {
      const code = readExample(e.file)
      expect(code, e.file).not.toMatch(/\beval\b/)
      expect(code.startsWith(STRICT), e.file).toBe(false)
      expect(code, e.file).not.toMatch(/^\s*['"]use strict['"]/m)
    }
  })
})

describe("'use strict'; 접두 검사", () => {
  it.each(NUMBERS)('예제 %i: 붙여도 출력이 같다', (n) => {
    expect(runExample(src(n))).toEqual(expectedOf(n))
    expect(runExample(STRICT + src(n))).toEqual(expectedOf(n))
  })
})

// --- 틀린 모델 -------------------------------------------------------------------------------------
// 예제 파일 원문을 명시 치환(치환 횟수를 단언)한 코드를 같은 실행기 방식으로 실행해 출력을 얻는다.
// 출력은 하드코딩하지 않고 실행으로 얻으며, 퀴즈의 오답은 이 출력에서 만든다.
// 퀴즈가 보이는 줄만 비교하므로 모델마다 lines(출력 줄 인덱스)를 둔다.

function runLines(code: string): string[] {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) } }
  runInNewContext(code, sandbox, { timeout: 2000 })
  return out
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
  lines: number[]
  // 퀴즈 선택지에 오르는지(예제 2의 B 모델은 퀴즈에 쓰지 않는다)
  inQuiz?: boolean
}

// 예제 5의 toString을 대신하는 모델 구현(name 처리만 다름)
const errorToStringModel = (nameExpr: string) =>
  `const errorToString = function () {\n  const name = ${nameExpr};\n  const msg = this.message === undefined ? '' : String(this.message);\n  if (name === '') return msg;\n  if (msg === '') return name;\n  return name + ': ' + msg;\n};`
const TO_STRING_ORIGINAL = 'const errorToString = Error.prototype.toString;'

// 예제 6의 cause를 만드는 단계를 대신하는 모델(조건만 다름)
const causeModel = (condition: string) =>
  `function MyErr(msg, opts) {\n  const e = new Error(msg);\n  if (${condition}) {\n    Object.defineProperty(e, 'cause', { value: opts.cause, writable: true, configurable: true });\n  }\n  return e;\n}\n`
const OBJ = "opts !== null && typeof opts === 'object'"
const causeSource = (condition: string) => (c: string) =>
  causeModel(`${OBJ} && ${condition}`) + rep(c, 'new Error(', 'new MyErr(', 5)

const MODELS: Record<number, Model[]> = {
  1: [
    {
      // A: name은 클래스 이름에서 정해진다
      name: 'A: Error.prototype.name이 this.constructor.name을 돌려준다',
      apply: (c) =>
        "Object.defineProperty(Error.prototype, 'name', { get() { return this.constructor.name; }, configurable: true });\n" +
        c,
      lines: [0],
    },
    {
      name: '인스턴스에 name이 생겨야 읽힌다(Error.prototype에 name이 없다)',
      apply: (c) => 'delete Error.prototype.name;\n' + c,
      lines: [0],
    },
  ],
  2: [
    {
      // B: toString은 constructor.name을 쓴다
      name: 'B: toString이 constructor.name을 쓴다',
      apply: (c) =>
        "Error.prototype.toString = function () {\n  return this.constructor.name + ': ' + this.message;\n};\n" +
        c,
      lines: [0],
      inQuiz: false,
    },
    {
      // C: 열거 가능하면 상속한 것도 직렬화된다(for...in으로 모은다)
      name: 'C: for...in으로 모은 객체를 직렬화한다',
      apply: (c) =>
        'function forIn(o) {\n  const r = {};\n  for (const k in o) r[k] = o[k];\n  return JSON.stringify(r);\n}\n' +
        rep(c, 'JSON.stringify(a), JSON.stringify(p)', 'forIn(a), forIn(p)'),
      lines: [3],
    },
    {
      // C': 대입한 name도 열거 불가다
      name: "C': 대입한 name을 열거 불가로 만든다",
      apply: (c) =>
        rep(
          c,
          "this.name = 'Assigned';",
          "Object.defineProperty(this, 'name', { value: 'Assigned', writable: true, configurable: true });",
        ),
      lines: [3],
    },
  ],
  3: [
    {
      // D: message가 열거 가능하다
      name: 'D: message를 열거 가능으로 만든다',
      apply: (c) =>
        rep(
          c,
          "const e = new Error('bad');",
          "const e = new Error('bad');\nObject.defineProperty(e, 'message', { enumerable: true });",
        ),
      lines: [0],
    },
    {
      // E: JSON.stringify가 toString 결과를 쓴다
      name: 'E: JSON이 String(e)을 직렬화한다',
      apply: (c) => rep(c, 'JSON.stringify(e)', 'JSON.stringify(String(e))'),
      lines: [0],
    },
  ],
  4: [
    {
      // F: 기본값 ''이 자기 프로퍼티로 들어간다
      name: "F: 기본값 ''을 자기 프로퍼티로 만든다",
      apply: (c) =>
        rep(
          c,
          'const none = new Error();',
          "const none = new Error();\nObject.defineProperty(none, 'message', { value: '', writable: true, configurable: true });",
        ),
      lines: [0, 2],
    },
    {
      // F': ''도 생략과 같다
      name: "F': ''도 생략과 같다",
      apply: (c) =>
        rep(c, "Object.hasOwn(new Error(''), 'message')", "Object.hasOwn(new Error(), 'message')"),
      lines: [0, 2],
    },
  ],
  5: [
    {
      // G: undefined name도 ToString한다
      name: 'G: undefined name도 ToString한다',
      apply: (c) => rep(c, TO_STRING_ORIGINAL, errorToStringModel('String(this.name)')),
      lines: [1, 2],
    },
    {
      // H: 값이 없거나 null인 name은 빈 값과 같다
      name: 'H: undefined·null name은 빈 값이다',
      apply: (c) =>
        rep(
          c,
          TO_STRING_ORIGINAL,
          errorToStringModel(
            'this.name === undefined || this.name === null ? "" : String(this.name)',
          ),
        ),
      lines: [1, 2],
    },
  ],
  6: [
    {
      // I: 자기 프로퍼티만 보고, 값이 undefined이면 생략과 같다
      name: 'I: 자기 프로퍼티이고 값이 undefined가 아닐 때만',
      apply: causeSource("Object.hasOwn(opts, 'cause') && opts.cause !== undefined"),
      lines: [3, 4],
    },
    {
      // I: 상속도 보지만, 값이 undefined이면 생략과 같다
      name: 'I: 값이 undefined가 아닐 때만(상속 포함)',
      apply: causeSource("'cause' in opts && opts.cause !== undefined"),
      lines: [3, 4],
    },
    {
      // I: 자기 프로퍼티만 보고, 값은 무관하다
      name: 'I: 자기 프로퍼티일 때만(값 무관)',
      apply: causeSource("Object.hasOwn(opts, 'cause')"),
      lines: [3, 4],
    },
  ],
  7: [
    {
      // J: 직접 쓴 생성자도 cause를 자동으로 전달한다
      name: 'J: 직접 쓴 생성자도 options를 전달한다',
      apply: (c) =>
        rep(c, "super('invalid ' + field);", "super('invalid ' + field, arguments[1]);"),
      lines: [0, 1, 2],
    },
    {
      // J': 기본 생성자는 options를 넘기지 않는다
      name: "J': 기본 생성자가 options를 넘기지 않는다",
      apply: (c) =>
        rep(
          c,
          'class ValidationError extends Error {}',
          'class ValidationError extends Error {\n  constructor(message) {\n    super(message);\n  }\n}',
        ),
      lines: [0, 1, 2],
    },
  ],
  8: [
    {
      // K: 클래스도 new 없이 객체를 만든다(catch가 실행되지 않는다)
      name: 'K: ValidationError가 new 없이도 객체를 만든다',
      apply: (c) =>
        rep(
          c,
          'class ValidationError extends Error {}',
          'function ValidationError(message) {\n  return new Error(message);\n}',
        ),
      lines: [0, 1],
    },
  ],
}

const pick = (lines: string[], idx: number[]) => idx.map((i) => lines[i]).join(' / ')
const modelOutput = (n: number, m: Model) => pick(runLines(m.apply(src(n))), m.lines)

// 퀴즈의 정답이 보여 주는 expectedOutput 줄 인덱스(예제 8은 TypeError 줄까지 전체)
const ANSWER_LINES: Record<number, number[]> = {
  1: [0],
  2: [3],
  3: [0],
  4: [0, 2],
  5: [1, 2],
  6: [3, 4],
  7: [0, 1, 2],
  8: [0, 1, 2],
}

describe('틀린 모델', () => {
  it('치환 없이 같은 실행기로 돌리면 expectedOutput과 같다(실행기 대조)', () => {
    for (const n of NUMBERS) expect(runLines(src(n)), `예제 ${n}`).toEqual(expectedOf(n))
  })

  for (const n of NUMBERS) {
    describe(`예제 ${n}`, () => {
      it.each(MODELS[n].map((m) => [m.name, m] as const))(
        '%s: 출력이 정답과 다르다',
        (_name, m) => {
          const lines = n === 8 ? ANSWER_LINES[n] : m.lines
          const output = pick(runLines(m.apply(src(n))), lines)
          expect(output).not.toBe(pick(expectedOf(n), lines))
        },
      )
    })
  }

  // 실행으로 얻은 모델 출력이 계획 2절의 값과 같은지 확인한다(값 자체는 실행이 정한다).
  it('모델 출력이 계획 2절의 값과 같다', () => {
    const byName = (n: number, prefix: string) => MODELS[n].find((m) => m.name.startsWith(prefix))!
    expect(modelOutput(1, byName(1, 'A:'))).toBe('ValidationError ValidationError')
    expect(modelOutput(2, byName(2, 'B:'))).toBe('AssignedError: a ProtoError: p')
    expect(modelOutput(2, byName(2, 'C:'))).toBe('{"name":"Assigned"} {"name":"Proto"}')
    expect(modelOutput(2, byName(2, "C':"))).toBe('{} {}')
    expect(modelOutput(3, byName(3, 'D:'))).toBe('bad {"message":"bad"}')
    expect(modelOutput(3, byName(3, 'E:'))).toBe('bad "Error: bad"')
    expect(modelOutput(4, byName(4, 'F:'))).toBe('true "" / true')
    expect(modelOutput(4, byName(4, "F':"))).toBe('false "" / false')
    expect(modelOutput(5, byName(5, 'G:'))).toBe('undefined: m / null: m')
    expect(modelOutput(5, byName(5, 'H:'))).toBe('m / m')
    expect(modelOutput(6, MODELS[6][0])).toBe('false undefined / undefined false')
    expect(modelOutput(6, MODELS[6][1])).toBe('false undefined / 3 true')
    expect(modelOutput(6, MODELS[6][2])).toBe('true undefined / undefined false')
    expect(modelOutput(7, byName(7, 'J:'))).toBe('1 / invalid age true / 1')
    expect(modelOutput(7, byName(7, "J':"))).toBe('undefined / invalid age false / 1')
    expect(modelOutput(8, byName(8, 'K:'))).toBe('true true Error: x / RangeError: r')
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
  it('퀴즈가 예제 1~8마다 하나씩 8개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(NUMBERS)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(NUMBERS)
  })

  it('선택지와 정답 위치가 계획과 같다', () => {
    expect(quizzes.map((q) => q.choices)).toEqual([
      ['ValidationError ValidationError', 'Error ValidationError', 'undefined ValidationError'],
      ['{"name":"Assigned"} {}', '{} {}', '{"name":"Assigned"} {"name":"Proto"}'],
      ['bad {"message":"bad"}', 'bad "Error: bad"', 'bad {}'],
      ['true "" / true', 'false "" / false', 'false "" / true'],
      ['Error: m / null: m', 'undefined: m / null: m', 'm / m'],
      [
        'false undefined / undefined false',
        'true undefined / 3 true',
        'false undefined / 3 true',
        'true undefined / undefined false',
      ],
      [
        '1 / invalid age true / 1',
        'undefined / invalid age false / 1',
        '1 / invalid age false / 1',
      ],
      ['true true Error: x / RangeError: r', 'true true Error: x / RangeError: r / TypeError'],
    ])
    expect(quizzes.map((q) => q.answer)).toEqual([1, 0, 2, 2, 0, 1, 2, 1])
  })

  it.each(NUMBERS)('예제 %i 퀴즈: 정답 선택지는 실제 출력이고 선택지에 중복이 없다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(pick(expectedOf(n), ANSWER_LINES[n]))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(NUMBERS)('예제 %i 퀴즈: 오답 선택지 집합은 퀴즈에 쓴 모델 출력 집합과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const fromModels = MODELS[n].filter((m) => m.inQuiz !== false).map((m) => modelOutput(n, m))
    expect(new Set(fromModels)).toEqual(new Set(wrong))
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
  const rows = tableBody(mdx, ['예제', '결과'])

  it('행이 8개이고 첫 칸이 예제 N으로 시작하며 결과 칸이 expectedOutput과 같다', () => {
    expect(rows).toHaveLength(8)
    rows.forEach((r, i) => {
      expect(r[0]).toMatch(new RegExp(`^예제 ${i + 1}: `))
      expect(r[1]).toBe(expectedOf(i + 1).join(' / '))
    })
  })
})

describe('name 지정 방법 표', () => {
  const rows = tableBody(mdx, [
    '방법',
    'name이 있는 곳',
    '인스턴스의 자기 프로퍼티인가',
    'String 결과',
    'JSON 결과',
  ])

  // 행마다 새 컨텍스트에서 예제의 클래스와 같은 방식으로 인스턴스를 만들어 칸을 계산한다.
  // JSON 칸은 Node에서 실행한 결과다(명세가 보장하는 값이 아니다).
  const SETUPS = [
    "class ValidationError extends Error {}\nconst x = new ValidationError('bad');",
    "class AssignedError extends Error {\n  constructor(message) {\n    super(message);\n    this.name = 'Assigned';\n  }\n}\nconst x = new AssignedError('a');",
    "class ProtoError extends Error {}\nProtoError.prototype.name = 'Proto';\nconst x = new ProtoError('p');",
  ]

  function probe(setup: string) {
    const code = `${setup}
      let holder = x;
      while (!Object.hasOwn(holder, 'name')) holder = Object.getPrototypeOf(holder);
      const enumerable = Object.getOwnPropertyDescriptor(holder, 'name').enumerable;
      let where;
      if (holder === x) where = '인스턴스';
      else if (holder === Error.prototype) where = 'Error.prototype';
      else where = holder.constructor.name + '.prototype' + (enumerable ? '(열거 가능)' : '');
      const own = Object.hasOwn(x, 'name') ? (enumerable ? '예(열거 가능)' : '예') : '아니요';
      JSON.stringify({ where, own, str: String(x), json: JSON.stringify(x) });`
    return JSON.parse(runInNewContext(code) as string) as {
      where: string
      own: string
      str: string
      json: string
    }
  }

  it('행이 3개이고 방법 칸이 계획과 같다', () => {
    expect(rows.map((r) => r[0])).toEqual([
      '아무것도 안 함(예제 1)',
      '생성자에서 대입(예제 2의 a)',
      'prototype에 대입(예제 2의 p)',
    ])
  })

  it.each([0, 1, 2])('%i번째 행: 위치·자기 프로퍼티·String·JSON 칸이 실행과 같다', (i) => {
    const [, where, own, str, json] = rows[i]
    const r = probe(SETUPS[i])
    // extractTables가 <code>와 뒤따르는 글자 사이에 공백을 넣으므로 그 공백만 없애고 비교한다.
    expect(where.replace(' (', '(')).toBe(r.where)
    expect(own).toBe(r.own)
    expect(str).toBe(r.str)
    expect(json).toBe(r.json)
  })
})

describe('toString 규칙 표', () => {
  const rows = tableBody(mdx, ['name 값', 'message 값', '적용 규칙', '결과'])

  // 칸의 식('Custom', null, '')을 평가해 객체를 만든다. '없음'이면 그 프로퍼티를 두지 않는다.
  function resultOf(nameCell: string, messageCell: string): string {
    if (nameCell.startsWith('상속한')) {
      expect(messageCell).toMatch(/^상속한/)
      return runInNewContext('String(new Error())') as string
    }
    const props: string[] = []
    if (!nameCell.startsWith('없음')) props.push(`name: ${nameCell}`)
    if (!messageCell.startsWith('없음')) props.push(`message: ${messageCell}`)
    return runInNewContext(`Error.prototype.toString.call({ ${props.join(', ')} })`) as string
  }

  it('행이 7개이다', () => {
    expect(rows).toHaveLength(7)
  })

  it.each([0, 1, 2, 3, 4, 5, 6])('%i번째 행: 결과 칸이 실제 toString 결과와 같다', (i) => {
    const [nameCell, messageCell, , result] = rows[i]
    expect(result).toBe(resultOf(nameCell, messageCell))
  })

  it('표의 결과 칸 순서가 예제 5의 출력과 같다', () => {
    expect(rows.map((r) => r[3])).toEqual(expectedOf(5))
  })
})

describe('표 마크업', () => {
  it('표가 region 래퍼 안에 있고 칸에 <가 없다', () => {
    expect(mdx.match(/role="region"/g)).toHaveLength(3)
    expect(mdx.match(/좁은 화면에서는 가로로 스크롤할 수 있습니다/g)).toHaveLength(3)
    for (const m of mdx.matchAll(/^[ \t]*<table\b[\s\S]*?<\/table>/gm)) {
      expect(m[0]).not.toMatch(/\{\s*['"`][^'"`]*</)
    }
  })
})

// --- 메타와 본문 조건 ----------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title에 "객체"가 있어 홈의 "객체" 검색에 걸린다', () => {
    expect(filterConcepts([concept], '객체').map((c) => c.slug)).toEqual(['error-objects'])
  })

  it('order는 471이고 summary는 160자 이하이며 category는 objects, reviewedAt은 2026-11-27이다', () => {
    expect(concept.order).toBe(471)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
    expect(concept.category).toBe('objects')
    expect(concept.reviewedAt).toBe('2026-11-27')
  })

  it('한정 문구: Node 한정, 자기 프로퍼티 여부, 처음 만나는 name, 자기 프로퍼티 stack이 본문에 있다', () => {
    expect(mdx).toContain('Node에서 실행한 결과')
    expect(mdx).toContain('자기 프로퍼티가 아니라서')
    expect(mdx).toContain('처음 만나는 `name`')
    expect(mdx).toContain('자기 프로퍼티 `stack`')
    // stack의 형태(접근자·데이터)는 Node 버전마다 달라 본문에 쓰지 않는다.
    expect(mdx).not.toContain('접근자 `stack`')
  })

  it('prototype의 name을 열거 불가라서 JSON에 안 나온다고 설명하는 문구가 없다', () => {
    expect(mdx).not.toContain('열거되지 않아 JSON')
    expect(mdx).not.toMatch(/열거되지 않는\s*`name`/)
    // 본문은 오히려 열거 가능하다고 밝히고 "열거 불가라서가 아닙니다"로 부정한다.
    expect(mdx).toContain('`name`이 열거 불가라서가 아닙니다')
  })

  it('영어 인용문이 명세의 두 판에 같은 문장 5개와 정확히 같다', () => {
    const quotes = [...mdx.matchAll(/^> (\S.*)$/gm)].map((m) => m[1])
    expect(quotes).toEqual([
      'The initial value of Error.prototype.name is "Error".',
      'The initial value of Error.prototype.message is the empty String.',
      'The initial value of the "name" property of the prototype for a given NativeError constructor is the String value consisting of the name of the constructor (the name used instead of NativeError).',
      'A conforming implementation of ECMAScript may provide additional types, values, objects, properties, and functions beyond those described in this specification.',
      'Thus the function call Error(…) is equivalent to the object creation expression new Error(…) with the same arguments.',
    ])
  })

  it('독자용 본문에 "테스트"와 eval이 없고 문단이 import·export로 시작하지 않는다', () => {
    expect(mdx).not.toContain('테스트')
    expect(mdx).not.toMatch(/\beval\b/)
    expect(mdx).not.toMatch(/^(import|export)\b/m)
  })

  it('new 없이 부른 클래스의 TypeError를 기본 생성자의 NewTarget 검사로 설명하고 클래스 개념 링크로 원인을 돌리지 않는다', () => {
    expect(mdx).toContain('기본 생성자는 NewTarget이 undefined이면 TypeError를 던집니다')
    expect(mdx).not.toContain('(/concepts/class-basics)')
  })

  it('제목에 맨 중괄호를 쓰지 않는다(MDX가 빈 JSX 식으로 읽어 지운다)', () => {
    const headings = [...mdx.matchAll(/^#{2,4} (.*)$/gm)].map((m) => m[1])
    for (const h of headings) {
      expect(h.replace(/`[^`]*`/g, ''), h).not.toMatch(/[{}]/)
    }
  })
})
