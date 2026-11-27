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
  'forward',
  'get-trap',
  'date-slot',
  'private-field',
  'receiver',
  'set-false',
  'invariant',
  'hide',
  'revocable',
]
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const src = (n: number) => readExample(concept.examples[n - 1].file)
const expectedOf = (n: number) => concept.examples[n - 1].expectedOutput

// --- 예제 파일 조건 -------------------------------------------------------------------------------

describe('예제 파일 조건', () => {
  it('예제 9개가 계획의 순서와 파일 이름으로 등록되어 있고 본문의 file= 순서와 같다', () => {
    expect(concept.examples.map((e) => e.id)).toEqual(EXAMPLE_IDS)
    expect(concept.examples.map((e) => e.file)).toEqual(EXAMPLE_IDS.map((id) => `${id}.js`))
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it('예제 파일에 eval이 없고 첫 줄 지시어가 없으며, 예제 6만 함수 안에 지시어가 하나 있다', () => {
    for (const [i, e] of concept.examples.entries()) {
      const code = readExample(e.file)
      expect(code, e.file).not.toMatch(/\beval\b/)
      expect(code.startsWith(STRICT), e.file).toBe(false)
      const directives = code.match(/^\s*['"]use strict['"]/gm) ?? []
      expect(directives, e.file).toHaveLength(i + 1 === 6 ? 1 : 0)
    }
  })
})

// --- 실행 도구 ---------------------------------------------------------------------------------------

type Run = { lines: string[]; thrown: string | null; line: number | null }

// 잡히지 않은 예외로 끝나는 모델도 그때까지의 출력과 예외 종류를 얻는다.
function runModel(code: string): Run {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) } }
  try {
    runInNewContext(code, sandbox, { timeout: 2000 })
  } catch (e) {
    const error = e as Error
    const where = /evalmachine\.<anonymous>:(\d+)/.exec(error.stack ?? '')
    return { lines: out, thrown: error.name, line: where ? Number(where[1]) : null }
  }
  return { lines: out, thrown: null, line: null }
}

// from이 정확히 count번 있는지 확인한 뒤 모두 to로 바꾼다($ 패턴 해석을 피하려고 split/join을 쓴다).
function rep(code: string, from: string, to: string, count = 1): string {
  const parts = code.split(from)
  expect(parts.length - 1, from).toBe(count)
  return parts.join(to)
}

// 퀴즈에 적는 형태: 빈 출력 줄은 '빈 줄', 잡히지 않은 TypeError는 멈춘 위치를 말로 적는다.
function quizText(run: Run, lastOnly: boolean, stopLine?: number): string {
  const lines = (lastOnly ? run.lines.slice(-1) : run.lines).map((l) => (l === '' ? '빈 줄' : l))
  if (run.thrown === null) return lines.join(' / ')
  expect(run.thrown).toBe('TypeError')
  if (lines.length === 0) return `아무것도 출력하지 않고 ${stopLine}번 줄에서 TypeError로 멈춘다`
  return `${lines.join(' / ')} / 그다음 줄에서 TypeError로 멈춘다`
}

describe("'use strict'; 접두 검사", () => {
  it.each(NUMBERS.filter((n) => n !== 6))('예제 %i: 붙여도 출력이 같다', (n) => {
    expect(runExample(src(n))).toEqual(expectedOf(n))
    expect(runExample(STRICT + src(n))).toEqual(expectedOf(n))
  })

  it('예제 6: sloppy에서는 expectedOutput과 같고 붙이면 8번 줄에서 TypeError로 끝난다', () => {
    expect(runExample(src(6))).toEqual(expectedOf(6))
    const run = runModel(STRICT + src(6))
    expect(run.thrown).toBe('TypeError')
    expect(run.lines).toEqual([])
    // 접두 한 줄 때문에 한 줄 밀린다.
    expect(run.line).toBe(9)
  })
})

// --- 틀린 모델 -------------------------------------------------------------------------------------
// 예제 파일 원문을 명시 치환(치환 횟수를 단언)한 코드를 실행해 출력을 얻는다.
// 출력은 하드코딩하지 않고 실행으로 얻으며, 퀴즈의 오답은 이 출력과 같아야 한다.

type Model = { name: string; apply: (code: string) => string }

const BIND =
  "    const value = Reflect.get(target, key, receiver);\n    return typeof value === 'function' ? value.bind(target) : value;"
const RETURN_REFLECT = '    return Reflect.get(target, key, receiver);'
const DATE_VIA = `new Proxy(date, {\n  get(target, key, receiver) {\n${RETURN_REFLECT}\n  },\n})`
const DATE_BOUND = `new Proxy(date, {\n  get(target, key, receiver) {\n${BIND}\n  },\n})`
const COUNTER_PROXY = `new Proxy(counter, {\n  get(target, key, receiver) {\n    seen.push(String(key));\n${RETURN_REFLECT}\n  },\n})`

// J2: 대상의 자기 프로퍼티가 설정 불가이고 값이 다르면 쓰기 가능 여부와 무관하게 던지는 검사
const CHECK_J2 =
  'function checkJ2(target, key, value) {\n  const d = Object.getOwnPropertyDescriptor(target, key);\n  if (d && !d.configurable && value !== d.value) throw new TypeError("invariant");\n  return value;\n}\n'

const HIDE_HAS =
  "  has(target, key) {\n    return !String(key).startsWith('_') && key in target;\n  },\n"
const HIDE_OWN_KEYS_BLOCK =
  "  ownKeys(target) {\n    return Reflect.ownKeys(target).filter((key) => !String(key).startsWith('_'));\n  },\n"
const HIDE_GET =
  "\n  get(target, key) {\n    return String(key).startsWith('_') ? undefined : target[key];\n  },\n});"

const MODELS: Record<number, Model[]> = {
  1: [
    {
      name: 'A: 프록시는 대상의 복사본이다',
      apply: (c) => rep(c, 'new Proxy(target, {})', 'Object.assign({}, target)'),
    },
    {
      name: 'B: 프록시는 대상 자신이다',
      apply: (c) => rep(c, 'new Proxy(target, {})', 'target'),
    },
  ],
  2: [
    {
      name: 'C: in도 get 트랩의 결과를 따른다',
      apply: (c) =>
        rep(
          c,
          '  },\n});',
          '  },\n  has(target, key) {\n    return this.get(target, key) !== undefined;\n  },\n});',
        ),
    },
    {
      name: 'M: 트랩이 돌려준 값이 대상에 저장된다',
      apply: (c) => rep(c, 'return -1;', 'target[key] = -1;\n    return -1;'),
    },
  ],
  3: [
    {
      name: 'D: 핸들러를 무시하고 대상 자체를 다룬다',
      apply: (c) => {
        let code = rep(c, 'const proxy = new Proxy(date, {});', 'const proxy = date;')
        code = rep(code, DATE_VIA, 'date')
        return rep(code, DATE_BOUND, 'date')
      },
    },
    {
      name: 'F: Reflect.get으로 넘기면 해결된다',
      apply: (c) => rep(c, RETURN_REFLECT, BIND),
    },
  ],
  4: [
    {
      name: 'P: get 트랩이 메서드를 대상에 묶어 준다',
      apply: (c) => rep(c, RETURN_REFLECT, BIND),
    },
    {
      name: 'D: 핸들러를 무시하고 대상 자체를 다룬다',
      apply: (c) => rep(c, COUNTER_PROXY, 'counter'),
    },
  ],
  5: [
    {
      name: 'G1: target[key]도 receiver를 쓴다',
      apply: (c) =>
        rep(
          c,
          'get(target, key) {\n    return target[key];',
          'get(target, key, receiver) {\n    return Reflect.get(target, key, receiver);',
        ),
    },
    {
      name: 'G2: receiver를 빼도 같다',
      apply: (c) => rep(c, RETURN_REFLECT, '    return Reflect.get(target, key);'),
    },
  ],
  6: [
    {
      name: 'H1: set이 false이면 늘 TypeError다',
      apply: (c) => STRICT + c,
    },
    {
      name: 'H2: set이 false여도 대입된다',
      apply: (c) =>
        rep(
          c,
          '  set() {\n    calls += 1;',
          '  set(target, key, value) {\n    calls += 1;\n    target[key] = value;',
        ),
    },
  ],
  7: [
    {
      name: 'J1: 트랩은 아무 값이나 돌려준다',
      apply: (c) => rep(c, 'Object.freeze({ level: 1 })', '{ level: 1 }'),
    },
    {
      name: 'J2: 설정 불가이면 쓰기 여부와 무관하게 걸린다',
      apply: (c) => {
        let code = rep(
          c,
          'get() {\n    return 2;\n  },',
          'get(target, key) {\n    return checkJ2(target, key, 2);\n  },',
          2,
        )
        code = rep(
          code,
          "return key === 'level' ? 1 : 2;",
          "return checkJ2(target, key, key === 'level' ? 1 : 2);",
        )
        return CHECK_J2 + code
      },
    },
  ],
  8: [
    {
      name: 'K1: has 트랩이 Object.keys에도 적용된다',
      apply: (c) => rep(c, `${HIDE_HAS}});`, `${HIDE_HAS}${HIDE_OWN_KEYS_BLOCK}});`),
    },
    {
      name: 'K2: ownKeys 트랩이 in에도 적용된다',
      apply: (c) => rep(c, HIDE_OWN_KEYS_BLOCK, `${HIDE_HAS}${HIDE_OWN_KEYS_BLOCK}`),
    },
    {
      name: 'K3: 숨기면 값도 읽을 수 없다',
      apply: (c) => rep(c, '\n});', HIDE_GET, 2),
    },
  ],
  9: [
    {
      name: 'L1: revoke하면 프록시가 null이 된다',
      apply: (c) =>
        rep(
          rep(c, 'const proxy = pair.proxy;', 'let proxy = pair.proxy;'),
          'pair.revoke();\nconsole.log(proxy ===',
          'proxy = null;\nconsole.log(proxy ===',
        ),
    },
    {
      name: 'L2: revoke는 대상으로 넘기는 것을 막지 않는다',
      apply: (c) => rep(c, 'pair.revoke();\nconsole.log(proxy ===', 'console.log(proxy ==='),
    },
  ],
}

// 퀴즈가 보이는 출력: 예제 5는 마지막 줄만, 나머지는 전체
const lastOnly = (n: number) => n === 5
const answerText = (n: number) =>
  (lastOnly(n) ? expectedOf(n).slice(-1) : expectedOf(n)).join(' / ')
const modelText = (n: number, m: Model) => quizText(runModel(m.apply(src(n))), lastOnly(n), 8)

describe('틀린 모델', () => {
  it('치환 없이 같은 실행기로 돌리면 expectedOutput과 같다(실행기 대조)', () => {
    for (const n of NUMBERS) {
      const run = runModel(src(n))
      expect(run.thrown, `예제 ${n}`).toBeNull()
      expect(run.lines, `예제 ${n}`).toEqual(expectedOf(n))
    }
  })

  for (const n of NUMBERS) {
    it.each(MODELS[n].map((m) => [m.name, m] as const))(
      `예제 ${n} %s: 출력이 정답과 다르다`,
      (_name, m) => {
        expect(modelText(n, m)).not.toBe(answerText(n))
      },
    )
  }

  // 실행으로 얻은 모델 출력이 계획의 값과 같은지 확인한다.
  it('모델 출력이 계획 3절의 값과 같다', () => {
    const out = (n: number, i: number) => modelText(n, MODELS[n][i])
    expect(out(1, 0)).toBe('1 undefined / false a,b / false')
    expect(out(1, 1)).toBe('1 2 / true a,b / true')
    expect(out(2, 0)).toBe('1000 -1 undefined / true')
    expect(out(2, 1)).toBe('1000 -1 -1 / true')
    expect(out(3, 0)).toBe('true true / 0 / 0 / 0 / 0')
    expect(out(3, 1)).toBe('true true / TypeError / 0 / 0 / 0')
    expect(out(4, 0)).toBe('1 / increment / 2 3')
    expect(out(4, 1)).toBe('1 / 빈 줄 / 2 3')
    expect(out(5, 0)).toBe('a b')
    expect(out(5, 1)).toBe('base base')
    expect(out(6, 0)).toBe('아무것도 출력하지 않고 8번 줄에서 TypeError로 멈춘다')
    expect(out(6, 1)).toBe('1 1 / false / TypeError / false / TypeError')
    expect(out(7, 0)).toBe('2 / 2 / 1 / 2 2')
    expect(out(7, 1)).toBe('TypeError / 2 / 1 / 그다음 줄에서 TypeError로 멈춘다')
    expect(out(8, 0)).toBe('false name / true name {"name":"kim"} / abc abc true')
    expect(out(8, 1)).toBe('false name,_token / false name {"name":"kim"} / abc abc true')
    expect(out(8, 2)).toBe(
      'false name,_token / true name {"name":"kim"} / undefined undefined true',
    )
    expect(out(9, 0)).toBe('1 / false true object / TypeError / TypeError / undefined')
    expect(out(9, 1)).toBe('1 / true false object / 1 / true / undefined')
  })

  it('H1은 8번 줄(접두 때문에 9번째 줄)에서 멈춘다', () => {
    const run = runModel(MODELS[6][0].apply(src(6)))
    expect(run.line).toBe(8 + 1)
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
  it('퀴즈가 예제 1~9마다 하나씩 9개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(NUMBERS)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(NUMBERS)
  })

  it('선택지와 정답 위치가 계획과 같다', () => {
    expect(quizzes.map((q) => q.choices)).toEqual([
      ['1 undefined / false a,b / false', '1 2 / true a,b / false', '1 2 / true a,b / true'],
      ['1000 -1 undefined / false', '1000 -1 undefined / true', '1000 -1 -1 / true'],
      [
        'true true / 0 / 0 / 0 / 0',
        'true true / TypeError / 0 / 0 / 0',
        'true true / TypeError / 0 / TypeError / 0',
      ],
      ['1 / increment / 2 3', 'TypeError / increment / 1 2', '1 / 빈 줄 / 2 3'],
      ['a b', 'base base', 'a base'],
      [
        '1 undefined / false / TypeError / false / TypeError',
        '1 1 / false / TypeError / false / TypeError',
        '아무것도 출력하지 않고 8번 줄에서 TypeError로 멈춘다',
      ],
      [
        '2 / 2 / 1 / 2 2',
        'TypeError / 2 / 1 / 2 2',
        'TypeError / 2 / 1 / 그다음 줄에서 TypeError로 멈춘다',
      ],
      [
        'false name / true name {"name":"kim"} / abc abc true',
        'false name,_token / false name {"name":"kim"} / abc abc true',
        'false name,_token / true name {"name":"kim"} / abc abc true',
        'false name,_token / true name {"name":"kim"} / undefined undefined true',
      ],
      [
        '1 / true false object / 1 / true / undefined',
        '1 / true false object / TypeError / TypeError / undefined',
        '1 / false true object / TypeError / TypeError / undefined',
      ],
    ])
    expect(quizzes.map((q) => q.answer)).toEqual([1, 0, 2, 1, 2, 0, 1, 2, 1])
  })

  it.each(NUMBERS)('예제 %i 퀴즈: 정답 선택지는 실제 출력이고 선택지에 중복이 없다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(answerText(n))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(NUMBERS)('예제 %i 퀴즈: 오답 선택지 집합은 모델 출력 집합과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const fromModels = MODELS[n].map((m) => modelText(n, m))
    expect(new Set(fromModels)).toEqual(new Set(wrong))
    expect(fromModels).toHaveLength(wrong.length)
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

  it('행이 9개이고 첫 칸이 예제 N으로 시작하며 결과 칸이 expectedOutput과 같다', () => {
    expect(rows).toHaveLength(9)
    rows.forEach((r, i) => {
      expect(r[0]).toMatch(new RegExp(`^예제 ${i + 1}: `))
      expect(r[1]).toBe(expectedOf(i + 1).join(' / '))
    })
  })
})

describe('연산과 트랩 대응 표', () => {
  const rows = tableBody(mdx, [
    '연산',
    '먼저 부르는 내부 메서드',
    '트랩',
    '같은 내부 메서드를 부르는 Reflect 함수',
    '기록된 트랩 전체',
  ])

  // 모든 트랩을 Reflect로 넘기며 이름을 기록하는 프록시(대상 { a: 1 })
  const RECORDER = `const log = [];
const handler = {};
for (const name of ['get', 'set', 'has', 'ownKeys', 'getOwnPropertyDescriptor', 'defineProperty', 'deleteProperty', 'getPrototypeOf', 'setPrototypeOf', 'isExtensible', 'preventExtensions']) {
  handler[name] = (...args) => {
    log.push(name);
    return Reflect[name](...args);
  };
}
const p = new Proxy({ a: 1 }, handler);
`
  const record = (op: string) => runInNewContext(`${RECORDER}${op};\nlog.join(', ')`) as string

  const INTERNAL: Record<string, string> = {
    get: '[[Get]]',
    set: '[[Set]]',
    has: '[[HasProperty]]',
    ownKeys: '[[OwnPropertyKeys]]',
  }

  it('행이 5개이고 연산 칸이 계획과 같다', () => {
    expect(rows.map((r) => r[0])).toEqual([
      'p.a',
      'p.b = 2',
      "'a' in p",
      'Object.keys(p)',
      'Reflect.ownKeys(p)',
    ])
  })

  it.each([0, 1, 2, 3, 4])(
    '%i번째 행: 첫 트랩·내부 메서드·Reflect 함수·기록 칸이 실행과 같다',
    (i) => {
      const [op, internal, trap, reflectFn, recorded] = rows[i]
      const log = record(op)
      // 연산이 처음 부르는 트랩이 트랩 칸과 같고, 내부 메서드와 Reflect 함수 칸이 그 트랩에 대응한다.
      expect(log.split(', ')[0]).toBe(trap)
      expect(internal).toBe(INTERNAL[trap])
      expect(reflectFn).toBe(`Reflect.${trap}`)
      expect(recorded).toBe(log)
    },
  )

  it('JSON.stringify(p)는 get, ownKeys, getOwnPropertyDescriptor, get 순서로 트랩을 부른다', () => {
    expect(record('JSON.stringify(p)')).toBe('get, ownKeys, getOwnPropertyDescriptor, get')
    expect(mdx).toContain(
      '`toJSON`을 읽는 `get`, `ownKeys`, `getOwnPropertyDescriptor`, 값을 읽는 `get` 순서',
    )
  })
})

describe('실패 알림 비교 표', () => {
  const rows = tableBody(mdx, ['코드', '실패 신호', '결과'])
  const SETUP =
    'let calls = 0;\nconst readonly = new Proxy({}, {\n  set() {\n    calls += 1;\n    return false;\n  },\n});\nconst frozen = Object.freeze({});\n'

  function outcome(cell: string): string {
    const strict = cell.startsWith('strict mode의 ')
    const op = cell.replace(/^(sloppy|strict) mode의 /, '')
    const code = `${strict ? STRICT : ''}${SETUP}
      let result;
      try {
        const r = (${op});
        result = r === false ? 'false 반환' : '조용히 무시';
      } catch (e) {
        result = e.name;
      }
      result;`
    return runInNewContext(code) as string
  }

  it('행이 5개이다', () => {
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => r[0])).toEqual([
      'sloppy mode의 readonly.x = 1',
      'strict mode의 readonly.x = 1',
      "Reflect.set(readonly, 'x', 1)",
      "Object.defineProperty(frozen, 'x', { value: 1 })",
      "Reflect.defineProperty(frozen, 'x', { value: 1 })",
    ])
  })

  it.each([0, 1, 2, 3, 4])('%i번째 행: 결과 칸이 실행 결과와 같다', (i) => {
    expect(outcome(rows[i][0])).toBe(rows[i][2])
  })

  it('실패 신호 칸: Set 행은 [[Set]]이 false, Define 행은 [[DefineOwnProperty]]가 false이다', () => {
    expect(rows.map((r) => r[1])).toEqual([
      '[[Set]]이 false',
      '[[Set]]이 false',
      '[[Set]]이 false',
      '[[DefineOwnProperty]]가 false',
      '[[DefineOwnProperty]]가 false',
    ])
    const flags = runInNewContext(`${SETUP}
      JSON.stringify([
        Reflect.set(readonly, 'x', 1),
        Reflect.defineProperty(frozen, 'x', { value: 1 }),
      ]);`) as string
    expect(JSON.parse(flags)).toEqual([false, false])
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

// --- 본문이 근거로 쓰는 실행 사실 ---------------------------------------------------------------------

describe('본문의 실행 근거', () => {
  it('bind로 고친 프록시는 읽을 때마다 새 함수를 돌려준다', () => {
    const code = `${src(3)}\nbound.getTime === bound.getTime;`
    expect(runInNewContext(code, { console: { log() {} } })).toBe(false)
  })

  // 식 하나를 새 컨텍스트에서 평가해 JSON 문자열 또는 예외 이름을 돌려준다.
  const probe = (setup: string, expr: string) =>
    runInNewContext(
      `${setup}\ntry { JSON.stringify(${expr}); } catch (e) { e.name; }`,
      {},
    ) as string
  const BOUND = `const h = { get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  } };
  const toTarget = { get(target, key) { return Reflect.get(target, key, target); } };
  class C { #count = 1; get count() { return this.#count; } }`

  it('bind 트랩은 private·내부 슬롯 getter에서 TypeError이고, receiver에 대상을 넘기면 성공한다', () => {
    expect(probe(BOUND, 'new Proxy(new C(), h).count')).toBe('TypeError')
    expect(probe(BOUND, 'new Proxy(new Map(), h).size')).toBe('TypeError')
    expect(probe(BOUND, 'new Proxy(new C(), toTarget).count')).toBe('1')
    expect(probe(BOUND, 'new Proxy(new Map(), toTarget).size')).toBe('0')
  })

  it('bind 트랩은 동결한 대상의 자기 메서드에서만 불변 조건으로 TypeError이고 상속한 메서드는 동작한다', () => {
    expect(probe(BOUND, 'typeof new Proxy(Object.freeze({ f() {} }), h).f')).toBe('TypeError')
    const inherited = `${BOUND}\nclass K { f() { return 'k'; } }`
    expect(probe(inherited, 'new Proxy(Object.freeze(new K()), h).f()')).toBe('"k"')
    expect(probe(BOUND, 'new Proxy(Object.freeze(new Date(0)), h).getTime()')).toBe('0')
  })

  it('return을 빠뜨린 set 트랩은 대상에 저장해도 실패로 처리된다', () => {
    const setup = `const target = {};
    const p = new Proxy(target, { set(t, k, v, r) { Reflect.set(t, k, v, r); } });`
    expect(probe(setup, "(() => { 'use strict'; p.x = 1; })()")).toBe('TypeError')
    expect(
      probe(setup, "[(() => { 'use strict'; try { p.x = 1; } catch {} })(), target.x][1]"),
    ).toBe('1')
    expect(probe(setup, "[Reflect.set(p, 'y', 2), target.y]")).toBe('[false,2]')
  })

  it('Array.isArray와 JSON.stringify는 배열 프록시의 대상을 보고, 취소하면 Array.isArray가 TypeError이다', () => {
    expect(probe('', 'Array.isArray(new Proxy([], {}))')).toBe('true')
    expect(probe('', 'JSON.stringify(new Proxy([1, 2], {}))')).toBe('"[1,2]"')
    const revoked = 'const pair = Proxy.revocable([], {}); pair.revoke();'
    expect(probe(revoked, 'Array.isArray(pair.proxy)')).toBe('TypeError')
  })

  it('취소한 프록시의 typeof는 취소 전과 같다(대상이 함수이면 function)', () => {
    const setup = 'const pair = Proxy.revocable(function () {}, {}); pair.revoke();'
    expect(probe(setup, 'typeof pair.proxy')).toBe('"function"')
  })

  it('get 불변 조건의 같은 값은 SameValue다(NaN 통과, 0에 -0은 TypeError)', () => {
    const setup = 'const frozen = Object.freeze({ n: NaN, z: 0 });'
    expect(probe(setup, 'Number.isNaN(new Proxy(frozen, { get: () => NaN }).n)')).toBe('true')
    expect(probe(setup, 'new Proxy(frozen, { get: () => -0 }).z')).toBe('TypeError')
  })
})

// --- 메타와 본문 조건 ----------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('summary에 "객체"가 있어 홈의 "객체" 검색에 걸린다', () => {
    expect(filterConcepts([concept], '객체').map((c) => c.slug)).toEqual(['proxy-reflect'])
  })

  it('order는 307이고 summary는 160자 이하이며 category는 objects, reviewedAt은 2026-11-27이다', () => {
    expect(concept.order).toBe(307)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
    expect(concept.category).toBe('objects')
    expect(concept.reviewedAt).toBe('2026-11-27')
  })

  it('goals에 백틱이 없고 simplifications가 7개이다', () => {
    for (const g of concept.goals) expect(g).not.toContain('`')
    expect(concept.simplifications).toHaveLength(7)
  })

  it('한정 문구: Object.hasOwn, 최소 형태, 프록시 값은 그대로가 본문에 있고 a에 바로는 없다', () => {
    expect(mdx).toContain('Object.hasOwn')
    expect(mdx).toContain('최소 형태')
    expect(mdx).toContain('프록시 값은 그대로')
    expect(mdx).not.toContain('a에 바로')
  })

  it('영어 인용문이 명세의 두 판에 같은 문장 Q1~Q4의 부분집합이다', () => {
    const allowed = [
      'A Proxy object is an exotic object whose essential internal methods are partially implemented using ECMAScript code.',
      "A proxy's handler object does not necessarily have a method corresponding to every essential internal method.",
      'ECMAScript Proxy objects maintain these invariants by means of runtime checks on the result of traps invoked on the [[ProxyHandler]] object.',
      'The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable own data property.',
    ]
    const quotes = [...mdx.matchAll(/^> (\S.*)$/gm)].map((m) => m[1])
    expect(quotes.length).toBeGreaterThan(0)
    for (const q of quotes) expect(allowed, q).toContain(q)
    expect(quotes).toEqual(allowed)
  })

  it('독자용 본문에 "테스트"와 eval이 없고 문단이 import·export로 시작하지 않는다', () => {
    expect(mdx).not.toContain('테스트')
    expect(mdx).not.toMatch(/\beval\b/)
    expect(mdx).not.toMatch(/^(import|export)\b/m)
  })

  it('접근자 필드를 [[Getter]] 표기로 쓰지 않는다', () => {
    expect(mdx).not.toContain('[[Getter]]')
    expect(mdx).not.toContain('[[Setter]]')
  })

  it('동작 원리의 h3 8개가 계획과 같다', () => {
    const section = mdx.slice(mdx.indexOf('## 동작 원리'), mdx.indexOf('## 예제'))
    expect([...section.matchAll(/^### (.*)$/gm)].map((m) => m[1])).toEqual([
      '프록시는 연산을 트랩으로 받는다',
      'Reflect는 기본 동작을 함수로 부른다',
      'receiver는 getter의 this가 된다',
      '내부 슬롯과 private 요소는 대상에 있다',
      '트랩 결과는 검사를 거친다',
      'has와 ownKeys는 서로 다른 연산을 바꾼다',
      '취소한 프록시',
      '이 페이지가 다루지 않는 것',
    ])
  })

  it('class-accessors 링크가 계획의 문구로 걸려 있다', () => {
    expect(mdx).toContain('[클래스의 getter와 setter](/concepts/class-accessors)')
  })

  it('흔한 오해 Callout 4개의 제목이 계획과 같다', () => {
    const titles = [...mdx.matchAll(/<Callout type="misconception" title="([^"]*)"/g)].map(
      (m) => m[1],
    )
    expect(titles).toEqual([
      '프록시는 대상을 복사한 객체다',
      '빈 핸들러 프록시는 대상과 똑같이 동작한다',
      '트랩에서 target[key]로 넘기면 Reflect.get과 같다',
      'has 트랩으로 숨기면 그 프로퍼티는 보이지 않는다',
    ])
  })

  it('제목에 맨 중괄호를 쓰지 않는다(MDX가 빈 JSX 식으로 읽어 지운다)', () => {
    const headings = [...mdx.matchAll(/^#{2,4} (.*)$/gm)].map((m) => m[1])
    for (const h of headings) {
      expect(h.replace(/`[^`]*`/g, ''), h).not.toMatch(/[{}]/)
    }
  })
})
