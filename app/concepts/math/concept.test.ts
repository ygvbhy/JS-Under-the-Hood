import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
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
const src = (id: string) => readExample(concept.examples.find((e) => e.id === id)!.file)
const expectedOf = (n: number) => concept.examples[n - 1].expectedOutput

// --- 'use strict'; 접두 ---------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '%s: 지시어가 없고, 붙여도 출력이 같다',
    (_id, file, expectedOutput) => {
      const code = readExample(file)
      expect(code.startsWith(STRICT)).toBe(false)
      expect(runExample(code)).toEqual(expectedOutput)
      expect(runExample(STRICT + code)).toEqual(expectedOutput)
    },
  )
})

// --- 예제 파일 조건 -----------------------------------------------------------------------------

describe('예제 파일 조건', () => {
  it('예제 1은 apply로 인수 목록을 넘긴다', () => {
    expect(src('empty-args')).toContain('.apply(')
  })

  it('어느 예제에도 스프레드(...)와 reduce가 없다', () => {
    for (const e of concept.examples) {
      const code = readExample(e.file)
      expect(code, e.file).not.toContain('...')
      expect(code, e.file).not.toContain('reduce')
    }
  })
})

// --- 틀린 모델 -------------------------------------------------------------------------------
// 샌드박스의 Math를 모델로 바꿔 예제를 실제로 실행한다. 모델은 실제 Math의 함수를 복사한 뒤 해당 함수만 바꾼다.
// 모델 출력은 하드코딩해 단언하고 정답과 달라야 한다. 퀴즈의 오답은 이 모델 출력에서 만든다.

type Collected = { out: string[]; error: string | null }

function runWithMath(code: string, model: object): Collected {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) }, Math: model }
  try {
    runInNewContext(code, sandbox)
    return { out, error: null }
  } catch (e) {
    return { out, error: (e as Error).name }
  }
}

function modelMath(overrides: Record<string, unknown>): object {
  const m: Record<string, unknown> = {}
  for (const k of Object.getOwnPropertyNames(Math)) {
    m[k] = (Math as unknown as Record<string, unknown>)[k]
  }
  return Object.assign(m, overrides)
}

type Fn = (...a: unknown[]) => number | undefined
// ToNumber처럼 단항 +를 쓴다. Number(v)는 BigInt를 숫자로 바꾸지만 ToNumber(BigInt)는 TypeError를 던진다.
const toNum = (v: unknown) => +(v as number)
const gt = (n: number, h: number) => n > h
const lt = (n: number, h: number) => n < h
const ge = (n: number, h: number) => n >= h
const le = (n: number, h: number) => n <= h

// start 값에서 시작하거나('first'면 첫 인수에서 시작) 더 나은 값으로 바꾸는 반복. NaN은 만나면 NaN(return) 또는 건너뜀(skip).
function scan(
  start: number | 'first',
  better: (n: number, h: number) => boolean,
  nanMode: 'return' | 'skip' = 'return',
): Fn {
  return (...a) => {
    if (start === 'first' && a.length === 0) return undefined
    let h = start === 'first' ? toNum(a[0]) : start
    for (const x of start === 'first' ? a.slice(1) : a) {
      const n = toNum(x)
      if (Number.isNaN(n)) {
        if (nanMode === 'return') return NaN
        continue
      }
      if (better(n, h)) h = n
    }
    return h
  }
}

const real = Math as unknown as Record<'max' | 'min' | 'floor' | 'trunc' | 'round', Fn> & {
  sign: (x: number) => number
  abs: (x: number) => number
}
const noMinusZero = (f: Fn): Fn => {
  return (...a) => (f(...a) as number) + 0
}

type Model = { math: object; out: string[]; error: string | null }
const MODELS: Record<number, Record<string, Model>> = {
  1: {
    '0에서 시작': {
      math: modelMath({ max: scan(0, gt), min: scan(0, lt) }),
      out: ['0 0', '0 0', 'true', '3 0'],
      error: null,
    },
    '첫 인수에서 시작': {
      math: modelMath({ max: scan('first', gt), min: scan('first', lt) }),
      out: ['undefined undefined', 'undefined undefined', 'false', 'NaN NaN'],
      error: null,
    },
    '인수가 없으면 TypeError': {
      math: modelMath({
        max: (...a: unknown[]) => {
          if (a.length === 0) throw new TypeError('no args')
          return real.max(...(a as number[]))
        },
        min: (...a: unknown[]) => {
          if (a.length === 0) throw new TypeError('no args')
          return real.min(...(a as number[]))
        },
      }),
      out: [],
      error: 'TypeError',
    },
  },
  2: {
    'NaN이면 변환을 멈춤': {
      math: modelMath({ max: scan(-Infinity, gt, 'return') }),
      // NaN에서 멈춰 1n을 변환하지 않으므로 4번째 출력이 없다.
      out: ['0 NaN 10 number', 'NaN a', 'RangeError a,t'],
      error: null,
    },
    'NaN을 건너뜀': {
      math: modelMath({ max: scan(-Infinity, gt, 'skip') }),
      out: ['0 1 10 number', '2 a,b,c', 'RangeError a,t', 'TypeError'],
      error: null,
    },
    'null을 무시': {
      math: modelMath({
        max: (...a: unknown[]) => real.max(...(a.filter((x) => x !== null) as number[])),
      }),
      out: ['-1 NaN 10 number', 'NaN a,b,c', 'RangeError a,t', 'TypeError'],
      error: null,
    },
    '문자열끼리는 문자열로 비교': {
      math: modelMath({
        max: (...a: unknown[]) =>
          a.every((x) => typeof x === 'string')
            ? (a as string[]).reduce((p, c) => (c > p ? c : p))
            : real.max(...(a as number[])),
      }),
      out: ['0 NaN 9 number', 'NaN a,b,c', 'RangeError a,t', 'TypeError'],
      error: null,
    },
    '변환 실패를 NaN으로 침': {
      math: modelMath({
        max: (...a: unknown[]) =>
          real.max(
            ...a.map((x) => {
              try {
                return toNum(x)
              } catch {
                return NaN
              }
            }),
          ),
      }),
      // 예외가 나지 않으므로 catch 안의 3·4번째 출력이 없다.
      out: ['0 NaN 10 number', 'NaN a,b,c'],
      error: null,
    },
  },
  3: {
    '먼저 온 쪽이 남음': {
      math: modelMath({ max: scan(-Infinity, gt), min: scan(Infinity, lt) }),
      out: ['-0 0', '0 -0', '-0 -0 0 0', '-0 0'],
      error: null,
    },
    '나중에 온 쪽이 남음': {
      math: modelMath({ max: scan(-Infinity, ge), min: scan(Infinity, le) }),
      out: ['0 -0', '-0 0', '-0 -0 0 0', '-0 0'],
      error: null,
    },
    'max는 0을 +0으로, min은 0을 -0으로': {
      math: modelMath({
        max: (...a: unknown[]) => {
          const r = real.max(...(a as number[])) as number
          return r === 0 ? 0 : r
        },
        min: (...a: unknown[]) => {
          const r = real.min(...(a as number[])) as number
          return r === 0 ? -0 : r
        },
      }),
      out: ['0 0', '-0 -0', '0 0 -0 -0', '-0 0'],
      error: null,
    },
    '-0이 없음': {
      math: modelMath({ max: noMinusZero(real.max), min: noMinusZero(real.min) }),
      out: ['0 0', '0 0', '0 0 0 0', '-0 0'],
      error: null,
    },
  },
  4: {
    'floor가 trunc와 같음': {
      math: modelMath({ floor: real.trunc }),
      out: [
        '-1.5 -1 -1 -1 -1',
        '-0.5 -0 -0 -0 -0',
        '-0.4 -0 -0 -0 -0',
        '0.4 0 1 0 0',
        '1.5 1 2 1 2',
        '-0 0',
      ],
      error: null,
    },
    'round가 floor(x + 0.5)': {
      math: modelMath({ round: (x: unknown) => real.floor(toNum(x) + 0.5) }),
      out: [
        '-1.5 -2 -1 -1 -1',
        '-0.5 -1 -0 -0 0',
        '-0.4 -1 -0 -0 0',
        '0.4 0 1 0 0',
        '1.5 1 2 1 2',
        '0 0',
      ],
      error: null,
    },
    '0에서 먼 쪽으로 반올림': {
      math: modelMath({
        round: (x: unknown) => {
          const n = toNum(x)
          return real.sign(n) * (real.round(real.abs(n)) as number) || (n < 0 ? -0 : 0)
        },
      }),
      out: [
        '-1.5 -2 -1 -1 -2',
        '-0.5 -1 -0 -0 -1',
        '-0.4 -1 -0 -0 -0',
        '0.4 0 1 0 0',
        '1.5 1 2 1 2',
        '-0 0',
      ],
      error: null,
    },
    '-0이 없음': {
      math: modelMath({
        floor: noMinusZero(real.floor),
        ceil: noMinusZero(Math.ceil as Fn),
        trunc: noMinusZero(real.trunc),
        round: noMinusZero(real.round),
      }),
      out: [
        '-1.5 -2 -1 -1 -1',
        '-0.5 -1 0 0 0',
        '-0.4 -1 0 0 0',
        '0.4 0 1 0 0',
        '1.5 1 2 1 2',
        '0 0',
      ],
      error: null,
    },
  },
}

// 퀴즈의 오답에 쓴 모델
const QUIZ_MODELS: Record<number, string[]> = {
  1: ['0에서 시작', '첫 인수에서 시작', '인수가 없으면 TypeError'],
  2: ['NaN이면 변환을 멈춤', 'NaN을 건너뜀', 'null을 무시'],
  3: ['먼저 온 쪽이 남음', '나중에 온 쪽이 남음', 'max는 0을 +0으로, min은 0을 -0으로'],
  4: ['floor가 trunc와 같음', 'round가 floor(x + 0.5)', '0에서 먼 쪽으로 반올림'],
}

const EXAMPLE_IDS = ['empty-args', 'nan-and-coercion', 'signed-zero', 'to-integer']

describe.each([1, 2, 3, 4])('예제 %i: 틀린 모델', (n) => {
  it.each(Object.entries(MODELS[n]))('%s: 하드코딩한 출력과 같고 정답과 다르다', (_name, m) => {
    const r = runWithMath(src(EXAMPLE_IDS[n - 1]), m.math)
    expect(r.out).toEqual(m.out)
    expect(r.error).toBe(m.error)
    expect(r.out).not.toEqual(expectedOf(n))
  })

  it('모델 없이 실제 Math로 실행하면 expectedOutput과 같다', () => {
    const r = runWithMath(src(EXAMPLE_IDS[n - 1]), Math)
    expect(r).toEqual({ out: expectedOf(n), error: null })
  })
})

// --- 퀴즈 -------------------------------------------------------------------------------------

const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
  const body = m[1]
  const question = body.match(/question="([^"]*)"/)![1]
  const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
  const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
  const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
  const example = Number(question.match(/예제 (\d+)/)![1])
  return { block: body, choices, answer, example }
})

// 퀴즈가 묻는 출력 줄 범위(0부터, 끝은 제외)
const QUIZ_LINES: Record<number, [number, number]> = {
  1: [0, 3],
  2: [0, 2],
  3: [0, 3],
  4: [1, 2],
}

function toChoice(r: { out: string[]; error: string | null }, n: number): string {
  if (r.error !== null) {
    expect(r.out).toEqual([])
    return `아무것도 출력되지 않고 ${r.error}로 멈춥니다`
  }
  const [from, to] = QUIZ_LINES[n]
  return r.out.slice(from, to).join(' / ')
}

describe('퀴즈', () => {
  const numbers = [1, 2, 3, 4]
  const answers = [1, 3, 0, 2]

  it('퀴즈가 예제 1~4마다 하나씩 4개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(4)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it('선택지와 정답 위치가 계획과 같다', () => {
    expect(quizzes.map((q) => q.choices)).toEqual([
      [
        '0 0 / 0 0 / true',
        '-Infinity Infinity / -Infinity Infinity / true',
        'undefined undefined / undefined undefined / false',
        '아무것도 출력되지 않고 TypeError로 멈춥니다',
      ],
      [
        '0 NaN 10 number / NaN a',
        '0 1 10 number / 2 a,b,c',
        '-1 NaN 10 number / NaN a,b,c',
        '0 NaN 10 number / NaN a,b,c',
      ],
      [
        '0 0 / -0 -0 / -0 -0 0 0',
        '-0 0 / 0 -0 / -0 -0 0 0',
        '0 -0 / -0 0 / -0 -0 0 0',
        '0 0 / -0 -0 / 0 0 -0 -0',
      ],
      ['-0.5 -0 -0 -0 -0', '-0.5 -1 -0 -0 0', '-0.5 -1 -0 -0 -0', '-0.5 -1 -0 -0 -1'],
    ])
    expect(quizzes.map((q) => q.answer)).toEqual(answers)
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput의 해당 줄이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const [from, to] = QUIZ_LINES[n]
    const expected = expectedOf(n).slice(from, to).join(' / ')
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)('예제 %i 퀴즈: 오답은 틀린 모델의 출력과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const fromModels = QUIZ_MODELS[n].map((name) => {
      const m = MODELS[n][name]
      return toChoice(runWithMath(src(EXAMPLE_IDS[n - 1]), m.math), n)
    })
    expect(new Set(wrong)).toEqual(new Set(fromModels))
    expect(wrong).toHaveLength(QUIZ_MODELS[n].length)
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })

  it('explanation 속성에는 큰따옴표와 백슬래시가 없다', () => {
    for (const q of quizzes) {
      expect(q.block, `예제 ${q.example}`).toMatch(/explanation="[^"\\]*"\s*$/)
    }
  })
})

// --- 정수 함수 표 -------------------------------------------------------------------------------

const show = (n: number) => (Object.is(n, -0) ? '-0' : String(n))

describe('정수 함수 표', () => {
  const header = ['x', 'Math.floor', 'Math.ceil', 'Math.trunc', 'Math.round']
  const rows = tableBody(mdx, header)

  it('행 수와 칸 텍스트가 하드코딩 목록과 같다', () => {
    expect(rows).toEqual([
      ['-1.5', '-2', '-1', '-1', '-1'],
      ['-0.5', '-1', '-0', '-0', '-0'],
      ['-0.4', '-1', '-0', '-0', '-0'],
      ['0.4', '0', '1', '0', '0'],
      ['1.5', '1', '2', '1', '2'],
    ])
  })

  it('칸마다 실제 Math 계산의 show 표기와 같다', () => {
    for (const [x, floor, ceil, trunc, round] of rows) {
      const v = Number(x)
      expect([floor, ceil, trunc, round], x).toEqual([
        show(Math.floor(v)),
        show(Math.ceil(v)),
        show(Math.trunc(v)),
        show(Math.round(v)),
      ])
    }
  })

  it('행마다 예제 4의 1~5번째 출력 줄과 같다', () => {
    const lines = expectedOf(4).slice(0, 5)
    expect(rows.map((r) => r.join(' '))).toEqual(lines)
  })
})

// --- Math.max·Math.min 규칙 표 ------------------------------------------------------------------

describe('규칙 표', () => {
  const rows = tableBody(mdx, ['상황', 'Math.max·Math.min이 하는 일', '근거'])

  it('행 수와 칸 텍스트가 하드코딩 목록과 같다', () => {
    expect(rows).toEqual([
      ['인수 없음', 'Math.max()는 -Infinity, Math.min()은 Infinity입니다', '예제 1의 1번 줄'],
      ['null 인수', '0으로 바뀌어 0으로 비교됩니다', '예제 2의 1번 줄 첫째 값'],
      ['undefined 인수', 'NaN으로 바뀌어 결과가 NaN입니다', '예제 2의 1번 줄 둘째 값'],
      [
        '숫자 문자열 인수',
        '숫자로 바뀌어 숫자끼리 비교되고 결과는 number입니다',
        '예제 2의 1번 줄 셋째·넷째 값',
      ],
      [
        '앞 인수가 NaN',
        '뒤 인수도 왼쪽부터 끝까지 변환되고, 변환이 예외를 던지지 않으면 결과는 NaN입니다',
        '예제 2의 2번 줄',
      ],
      [
        '변환이 예외를 던짐',
        '그 예외가 그대로 나가고 뒤 인수는 변환되지 않습니다',
        '예제 2의 3~4번 줄',
      ],
      [
        '가장 큰(min은 가장 작은) 값이 0이고 +0과 -0이 함께 있음',
        'max는 +0, min은 -0이고 인수 순서와 관계없습니다',
        '예제 3의 1~2번 줄',
      ],
      [
        '부호가 반대인 0이 없음(max의 -0 하나, min의 +0 하나 등)',
        '0의 부호가 바뀌지 않고 그대로 남습니다',
        '예제 3의 3번 줄',
      ],
    ])
  })

  it('행마다 근거 예제의 출력이 규칙과 같다', () => {
    const [e1, e2, e3] = [1, 2, 3].map((n) => expectedOf(n).map((l) => l.split(' ')))
    expect(e1[0]).toEqual(['-Infinity', 'Infinity']) // 1행
    expect(e2[0][0]).toBe('0') // 2행: null이 0으로 바뀌어 -1보다 큼
    expect(e2[0][1]).toBe('NaN') // 3행
    expect(e2[0].slice(2)).toEqual(['10', 'number']) // 4행
    expect(e2[1][0]).toBe('NaN') // 5행
    expect(e2[1][1]).toBe('a,b,c')
    expect(e2[2]).toEqual(['RangeError', 'a,t']) // 6행
    expect(e2[3]).toEqual(['TypeError'])
    expect(e3[0]).toEqual(['0', '0']) // 7행: max
    expect(e3[1]).toEqual(['-0', '-0']) // 7행: min
    expect(e3[2]).toEqual(['-0', '-0', '0', '0']) // 8행
  })
})

// --- 메타와 본문 조건 --------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 278이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(278)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('선수 개념의 order는 모두 278보다 작다', () => {
    for (const p of concept.prerequisites) {
      expect(getConcept(p.slug).order, p.slug).toBeLessThan(278)
    }
  })

  it('title·summary·goals에 백틱이 없다', () => {
    const text = [concept.title, concept.summary, ...concept.goals].join('\n')
    expect(text).not.toContain('`')
  })

  it('본문에 근거 없는 의도와 증명 주장이 없다', () => {
    expect(mdx).not.toContain('항등원')
    expect(mdx).not.toMatch(/예제가 (모든|모두)[^.]*변환한 뒤 비교/)
    expect(mdx).not.toContain('테스트')
  })
})
