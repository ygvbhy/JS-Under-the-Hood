import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts, getConcept } from '~/lib/concepts'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { pairs } from './pairs'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const src = (id: string) => readExample(concept.examples.find((e) => e.id === id)!.file)
const expectedOf = (n: number) => concept.examples[n - 1].expectedOutput
const EXAMPLE_IDS = [
  'null-vs-zero',
  'undefined-and-nan',
  'le-ge-definition',
  'range-check',
  'conversion-order',
]

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
  it('예제 5는 배열·push·join 없이 문자열을 누적한다', () => {
    const code = src('conversion-order')
    expect(code).toContain('log += name')
    expect(code).not.toMatch(/\[|\.push\(|\.join\(/)
  })

  it('예제 4·5는 함수를 선언하고 호출한다', () => {
    expect(src('range-check')).toContain('function inRange(v)')
    expect(src('conversion-order')).toContain('function val(name, n)')
  })
})

// --- 틀린 모델 -------------------------------------------------------------------------------
// 예제 원문의 비교식을 M.op(l, r)로 명시 치환(치환 횟수를 단언)하고, 샌드박스에 모델 M을 넣어 실제로 실행한다.
// M이 실제 연산자이면 출력이 expectedOutput과 같아야 한다(치환이 의미를 보존한다는 대조).
// 모델 출력은 하드코딩해 단언하고 정답과 달라야 한다. 퀴즈의 오답은 이 모델 출력에서 만든다.

type Collected = { out: string[]; error: string | null }
type Op = (a: unknown, b: unknown) => boolean
type Model = { lt: Op; gt: Op; le: Op; ge: Op; eq: Op }

function runWithModel(code: string, m: Model): Collected {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) }, M: m }
  try {
    runInNewContext(code, sandbox)
    return { out, error: null }
  } catch (e) {
    return { out, error: (e as Error).name }
  }
}

// 소스에서 from이 정확히 count번 있는지 확인한 뒤 모두 to로 바꾼다($ 패턴 해석을 피하려고 split/join을 쓴다).
function swap(code: string, from: string, to: string, count = 1): string {
  const parts = code.split(from)
  expect(parts.length - 1, from).toBe(count)
  return parts.join(to)
}

const SWAPS: Record<number, [string, string][]> = {
  1: [
    ['null > 0', 'M.gt(null, 0)'],
    ['null == 0', 'M.eq(null, 0)'],
    ['null >= 0', 'M.ge(null, 0)'],
    ['null < 1', 'M.lt(null, 1)'],
    ['null <= 0', 'M.le(null, 0)'],
    ['null == false', 'M.eq(null, false)'],
  ],
  2: [
    ['undefined > 0', 'M.gt(undefined, 0)'],
    ['undefined < 0', 'M.lt(undefined, 0)'],
    ['undefined >= 0', 'M.ge(undefined, 0)'],
    ['undefined <= 0', 'M.le(undefined, 0)'],
    ['NaN < 1', 'M.lt(NaN, 1)'],
    ['NaN > 1', 'M.gt(NaN, 1)'],
    ['NaN >= 1', 'M.ge(NaN, 1)'],
    ['NaN <= NaN', 'M.le(NaN, NaN)'],
  ],
  3: [
    ['a <= b', 'M.le(a, b)'],
    ['a < b', 'M.lt(a, b)'],
    ['a == b', 'M.eq(a, b)'],
    ['!(a > b)', '!M.gt(a, b)'],
    ['c >= d', 'M.ge(c, d)'],
    ['c > d ||', 'M.gt(c, d) ||'],
    ['c == d', 'M.eq(c, d)'],
    ['!(c < d)', '!M.lt(c, d)'],
  ],
  4: [
    ['v >= 0', 'M.ge(v, 0)'],
    ['v <= 10', 'M.le(v, 10)'],
  ],
  // 예제 5는 피연산자를 썽크로 넘겨 모델이 평가와 변환의 순서를 정하게 한다.
  5: [
    ["val('a', 1) > val('b', 2)", "M.gt(() => val('a', 1), () => val('b', 2))"],
    ["val('a', 1) <= val('b', 2)", "M.le(() => val('a', 1), () => val('b', 2))"],
  ],
}

function swapped(n: number): string {
  let code = src(EXAMPLE_IDS[n - 1])
  for (const [from, to] of SWAPS[n]) code = swap(code, from, to)
  return code
}

const real: Model = {
  lt: (a, b) => (a as number) < (b as number),
  gt: (a, b) => (a as number) > (b as number),
  le: (a, b) => (a as number) <= (b as number),
  ge: (a, b) => (a as number) >= (b as number),
  eq: (a, b) => a == b,
}
const withOps = (o: Partial<Model>): Model => ({ ...real, ...o })
const num = (v: unknown) => v as number
const undefAsZero = (v: unknown) => (v === undefined ? 0 : num(v))
// falsy는 0, truthy는 1로 보는 모델(객체는 그대로)
const truthyAsOne = (v: unknown) => (typeof v === 'object' && v !== null ? num(v) : v ? 1 : 0)
const nullInvolved = (a: unknown, b: unknown) => a === null || b === null
const mixesStringAndNonString = (a: unknown, b: unknown) =>
  (typeof a === 'string') !== (typeof b === 'string')

const nullNotConverted = withOps({
  lt: (a, b) => !nullInvolved(a, b) && num(a) < num(b),
  gt: (a, b) => !nullInvolved(a, b) && num(a) > num(b),
  le: (a, b) => !nullInvolved(a, b) && num(a) <= num(b),
  ge: (a, b) => !nullInvolved(a, b) && num(a) >= num(b),
})
const orEqual = withOps({
  ge: (a, b) => num(a) > num(b) || a == b,
  le: (a, b) => num(a) < num(b) || a == b,
})
const negation = withOps({
  ge: (a, b) => !(num(a) < num(b)),
  le: (a, b) => !(num(a) > num(b)),
})
const undefinedAsZero = withOps({
  lt: (a, b) => undefAsZero(a) < undefAsZero(b),
  gt: (a, b) => undefAsZero(a) > undefAsZero(b),
  le: (a, b) => undefAsZero(a) <= undefAsZero(b),
  ge: (a, b) => undefAsZero(a) >= undefAsZero(b),
})
const falsyAsZero = withOps({
  lt: (a, b) => truthyAsOne(a) < truthyAsOne(b),
  gt: (a, b) => truthyAsOne(a) > truthyAsOne(b),
  le: (a, b) => truthyAsOne(a) <= truthyAsOne(b),
  ge: (a, b) => truthyAsOne(a) >= truthyAsOne(b),
})
const nullEqualsZero = withOps({
  eq: (a, b) => (a === null ? 0 : a) == (b === null ? 0 : b),
})
const nanEqualsItself = withOps({
  le: (a, b) => (Number.isNaN(a) && Number.isNaN(b) ? true : num(a) <= num(b)),
  ge: (a, b) => (Number.isNaN(a) && Number.isNaN(b) ? true : num(a) >= num(b)),
})
const noStringNumberCompare = withOps({
  lt: (a, b) => !mixesStringAndNonString(a, b) && num(a) < num(b),
  gt: (a, b) => !mixesStringAndNonString(a, b) && num(a) > num(b),
  le: (a, b) => !mixesStringAndNonString(a, b) && num(a) <= num(b),
  ge: (a, b) => !mixesStringAndNonString(a, b) && num(a) >= num(b),
})

// 예제 5의 모델: 피연산자는 썽크로 넘어온다. 변환은 ToNumber처럼 단항 +를 쓴다.
type ThunkOp = (l: () => unknown, r: () => unknown) => boolean
type ThunkModel = { gt: ThunkOp; le: ThunkOp }
// 둘 다 평가한 뒤 왼쪽부터 변환(실제)
const bothThenLeft = (cmp: (x: number, y: number) => boolean): ThunkOp => {
  return (l, r) => {
    const lv = l()
    const rv = r()
    const x = +(lv as number)
    const y = +(rv as number)
    return cmp(x, y)
  }
}
// 평가하자마자 변환
const interleave = (cmp: (x: number, y: number) => boolean): ThunkOp => {
  return (l, r) => {
    const x = +(l() as number)
    const y = +(r() as number)
    return cmp(x, y)
  }
}
// 둘 다 평가한 뒤 오른쪽부터 변환
const bothThenRight = (cmp: (x: number, y: number) => boolean): ThunkOp => {
  return (l, r) => {
    const lv = l()
    const rv = r()
    const y = +(rv as number)
    const x = +(lv as number)
    return cmp(x, y)
  }
}
const gtCmp = (x: number, y: number) => x > y
const leCmp = (x: number, y: number) => x <= y
const thunkModels: Record<string, ThunkModel> = {
  실제: { gt: bothThenLeft(gtCmp), le: bothThenLeft(leCmp) },
  '평가하자마자 변환': { gt: interleave(gtCmp), le: interleave(leCmp) },
  '둘 다 평가한 뒤 오른쪽부터 변환': { gt: bothThenRight(gtCmp), le: bothThenRight(leCmp) },
}

type Expected = { model: Model | ThunkModel; out: string[] }
const MODELS: Record<number, Record<string, Expected>> = {
  1: {
    'null이 낀 관계 비교는 모두 false': {
      model: nullNotConverted,
      out: ['false false false', 'false false false'],
    },
    '<=·>=는 <·>이거나 ==': { model: orEqual, out: ['false false false', 'true false false'] },
    '==도 null을 0으로': { model: nullEqualsZero, out: ['false true true', 'true true true'] },
  },
  2: {
    '<=·>=는 반대 연산자의 부정': {
      model: negation,
      out: ['false false true true', 'false false true true'],
    },
    'undefined도 0': {
      model: undefinedAsZero,
      out: ['false false true true', 'false false false false'],
    },
    'NaN은 자기 자신과 같음': {
      model: nanEqualsItself,
      out: ['false false false false', 'false false false true'],
    },
    'null은 falsy라서 0(불리언을 거쳐 숫자로)': {
      model: falsyAsZero,
      out: ['false false true true', 'true false false true'],
    },
  },
  3: {
    '<=·>=는 <·>이거나 ==': { model: orEqual, out: ['false false true', 'false false true'] },
    '<=·>=는 반대 연산자의 부정': { model: negation, out: ['true false true', 'true false true'] },
    '==도 null을 0으로': { model: nullEqualsZero, out: ['true true true', 'false false true'] },
  },
  4: {
    'null이 낀 관계 비교는 모두 false': {
      model: nullNotConverted,
      out: ['false false true true', 'true false true false'],
    },
    'truthy는 1, falsy는 0': {
      model: falsyAsZero,
      out: ['true true true true', 'true true true true'],
    },
    '문자열과 숫자는 비교하지 않음': {
      model: noStringNumberCompare,
      out: ['true false false false', 'false false true false'],
    },
    '<=·>=는 반대 연산자의 부정': {
      model: negation,
      out: ['true true true true', 'true true true false'],
    },
  },
  5: {
    '평가하자마자 변환': {
      model: thunkModels['평가하자마자 변환'],
      out: ['false aAbB', 'true aAbB'],
    },
    '둘 다 평가한 뒤 오른쪽부터 변환': {
      model: thunkModels['둘 다 평가한 뒤 오른쪽부터 변환'],
      out: ['false abBA', 'true abBA'],
    },
  },
}

// 예제 1은 출력이 정답과 같아 이 모델들을 가려내지 못한다(예제 2·3·4가 가려낸다).
const SAME_AS_ANSWER_IN_EXAMPLE_1: Record<string, Model> = {
  '<=·>=는 반대 연산자의 부정': negation,
  '관계 비교에서 null은 falsy라서 0': falsyAsZero,
  'undefined도 0': undefinedAsZero,
}

describe.each([1, 2, 3, 4, 5])('예제 %i: 틀린 모델', (n) => {
  it('치환 뒤에 원문의 비교 연산자가 남지 않는다', () => {
    const code = swapped(n).replace(/=>/g, '')
    expect(code).not.toMatch(/[<>]|==/)
  })

  it('실제 연산을 하는 모델 M은 expectedOutput과 같은 출력을 낸다', () => {
    const model = n === 5 ? thunkModels['실제'] : real
    const r = runWithModel(swapped(n), model as unknown as Model)
    expect(r).toEqual({ out: expectedOf(n), error: null })
  })

  it.each(Object.entries(MODELS[n]))('%s: 하드코딩한 출력과 같고 정답과 다르다', (_name, m) => {
    const r = runWithModel(swapped(n), m.model as unknown as Model)
    expect(r.out).toEqual(m.out)
    expect(r.error).toBeNull()
    expect(r.out).not.toEqual(expectedOf(n))
  })
})

describe('예제 1이 가려내지 못하는 모델', () => {
  it.each(Object.entries(SAME_AS_ANSWER_IN_EXAMPLE_1))('%s: 출력이 정답과 같다', (_name, m) => {
    expect(runWithModel(swapped(1), m).out).toEqual(expectedOf(1))
  })
})

// 예제 3은 1번 줄에서 <=만, 2번 줄에서 >=만 대조하므로, 두 후보를 섞은 모델(<=는 >의 부정, >=는 >이거나 ==)은
// 예제 3의 출력을 그대로 맞힌다. 이 모델은 예제 1(null >= 0)과 예제 2(undefined <= 0)가 가려낸다.
const mixedDefinition = withOps({
  ge: (a, b) => num(a) > num(b) || a == b,
  le: (a, b) => !(num(a) > num(b)),
})

describe('예제 3이 가려내지 못하는 섞인 정의 모델', () => {
  it('예제 3의 출력은 정답과 같다', () => {
    expect(runWithModel(swapped(3), mixedDefinition).out).toEqual(expectedOf(3))
  })

  it('예제 1과 예제 2에서는 정답과 다르다', () => {
    expect(runWithModel(swapped(1), mixedDefinition).out).toEqual([
      'false false false',
      'true true false',
    ])
    expect(runWithModel(swapped(2), mixedDefinition).out).toEqual([
      'false false false true',
      'false false false true',
    ])
  })
})

// --- 값 쌍 표 -------------------------------------------------------------------------------------

describe('값 쌍 표(pairs.ts)', () => {
  it('피연산자 목록이 하드코딩 목록과 같다', () => {
    expect(pairs.map((p) => [p.left, p.right])).toEqual([
      ['null', '0'],
      ['undefined', '0'],
      ['NaN', '1'],
      ["''", '0'],
      ["' '", '0'],
      ["'abc'", '1'],
      ['false', '0'],
      ['null', 'undefined'],
    ])
  })

  it('본문이 pairs.map으로 표를 그린다', () => {
    expect(mdx).toContain("import { pairs } from './pairs'")
    expect(mdx).toContain('{pairs.map((row) => (')
  })

  it.each(pairs.map((p) => [`${p.left}, ${p.right}`, p] as const))(
    '%s: 칸마다 식을 실제로 평가한 값과 같다',
    (_name, p) => {
      const evalOp = (op: string) => runInNewContext(`${p.left} ${op} ${p.right}`) as boolean
      expect([p.lt, p.gt, p.le, p.ge, p.eq]).toEqual(['<', '>', '<=', '>=', '=='].map(evalOp))
    },
  )

  it('(null, 0) 행은 예제 1의 1번 줄(>, ==, >=)과 같다', () => {
    const row = pairs[0]
    expect([row.gt, row.eq, row.ge].map(String).join(' ')).toBe(expectedOf(1)[0])
  })

  it("원문 표 블록(map 밖)에 <code>{'… < …'}처럼 <를 담은 칸이 없다", () => {
    for (const m of mdx.matchAll(/^[ \t]*<table\b[\s\S]*?<\/table>/gm)) {
      if (/\{\s*[\w.]+\.map\(/.test(m[0])) continue
      expect(m[0]).not.toMatch(/<code>\{\s*['"`][^'"`]*</)
    }
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

// 퀴즈의 오답에 쓴 모델
const QUIZ_MODELS: Record<number, string[]> = {
  1: ['null이 낀 관계 비교는 모두 false', '<=·>=는 <·>이거나 ==', '==도 null을 0으로'],
  2: ['<=·>=는 반대 연산자의 부정', 'undefined도 0', 'NaN은 자기 자신과 같음'],
  3: ['<=·>=는 <·>이거나 ==', '<=·>=는 반대 연산자의 부정', '==도 null을 0으로'],
  4: ['null이 낀 관계 비교는 모두 false', 'truthy는 1, falsy는 0', '문자열과 숫자는 비교하지 않음'],
  5: ['평가하자마자 변환', '둘 다 평가한 뒤 오른쪽부터 변환'],
}

describe('퀴즈', () => {
  const numbers = [1, 2, 3, 4, 5]

  it('퀴즈가 예제 1~5마다 하나씩 5개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(5)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it('선택지와 정답 위치가 계획과 같다', () => {
    expect(quizzes.map((q) => q.choices)).toEqual([
      [
        'false false false / false false false',
        'false false false / true false false',
        'false false true / true true false',
        'false true true / true true true',
      ],
      [
        'false false false false / false false false false',
        'false false true true / false false true true',
        'false false true true / false false false false',
        'false false false false / false false false true',
      ],
      [
        'false false true / false false true',
        'true false true / true false true',
        'true true true / false false true',
        'true false true / false false true',
      ],
      [
        'false false true true / true false true false',
        'true false true true / true false true false',
        'true true true true / true true true true',
        'true false false false / false false true false',
      ],
      ['false aAbB / true aAbB', 'false abBA / true abBA', 'false abAB / true abAB'],
    ])
    expect(quizzes.map((q) => q.answer)).toEqual([2, 0, 3, 1, 2])
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput 전체 줄이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expectedOf(n).join(' / '))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)('예제 %i 퀴즈: 오답은 틀린 모델의 출력과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const fromModels = QUIZ_MODELS[n].map((name) => {
      const m = MODELS[n][name]
      return runWithModel(swapped(n), m.model as unknown as Model).out.join(' / ')
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

// --- 메타와 본문 조건 --------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags·goals에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
    expect(
      [concept.title, concept.summary, ...concept.tags, ...concept.goals].join('\n'),
    ).not.toContain('객체')
  })

  it('order는 45이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(45)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('slug가 있는 선수 개념의 order는 모두 45보다 작다', () => {
    for (const p of concept.prerequisites) {
      if ('slug' in p && p.slug) expect(getConcept(p.slug).order, p.slug).toBeLessThan(45)
    }
    expect(concept.prerequisites.map((p) => p.label)).toContain('함수 선언과 호출')
  })

  it('title·summary·goals에 백틱이 없다', () => {
    const text = [concept.title, concept.summary, ...concept.goals].join('\n')
    expect(text).not.toContain('`')
  })

  it('독자용 본문에 "테스트"가 없다', () => {
    expect(mdx).not.toContain('테스트')
  })

  it('본문이 뒤집기를 예제로 보이지 못한다고 밝힌다', () => {
    expect(mdx).toContain(
      '자리를 바꾼다는 것은 명세가 정의를 적는 방식이어서 실행 결과로는 구별되지 않습니다',
    )
    expect(mdx).toContain('이 출력으로 구별할 수 없습니다')
  })
})
