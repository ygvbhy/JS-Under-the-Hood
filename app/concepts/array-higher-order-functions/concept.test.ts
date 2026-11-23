import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type LoopState } from './scenarios'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값.
const evaluate = (code: string): unknown => runInNewContext(code)

// --- 'use strict'; 접두 ---------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s: 지시어가 없어도 있어도 출력이 같다',
    (_id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      expect(runExample(STRICT + code)).toEqual(expectedOutput)
    },
  )
})

// --- 퀴즈 -------------------------------------------------------------------------------------

// 예제마다 틀린 모델의 출력(퀴즈 오답). 정답은 expectedOutput을 ' / '로 이은 문자열이다.
// 대부분 모델 하나의 출력이고, 예제 1의 '[1,2] [1,2]'는 콜백 안 push가 원본에 반영되지 않는다는 모델,
// 예제 3의 마지막 오답은 두 오해(map 복사 + filter가 끝난 뒤 요소를 담음)를 함께 가진 경우의 출력이다.
const WRONG: Record<number, string[]> = {
  1: ['[1,2,3,4] [1,2,3,4]', '[1,2] [1,2]'],
  2: ['[1,2,3] 2 / [1,2,3] [2,3]', '[1,2,null] 2 / [1,3,null] [2,3]', '[1,2] 2 / [1,2,3] [2,3]'],
  3: [
    '[10,20,30] 6 / [1,2,3] [0,0,0]',
    '[10,20,300] 6 / [0,0,0] [0,0,0]',
    '[10,20,30] 6 / [0,0,0] [0,0,0]',
  ],
  4: [
    '15 [3,15,7,40] / [15,40] [3,15,7,40] / undefined [] -1',
    '15 [3,15] / [15] [3,15] / undefined [] -1',
    '15 [3,15] / [15,40] [3,15,7,40] / -1 [] -1',
  ],
  5: ['0:1 2:3 / 1 2', '0:1 1:undefined 2:3 / 1 2 3', '0:1 1:undefined 2:3 / 1 2'],
  6: [
    'true [1,2,3,4] / false [1,2,3,4] / false true',
    'true [1,2] / false [1,2] / false false',
    'true [1,2,3,4] / false [1,2,3,4] / false false',
  ],
  7: [
    '[1,2,3,4] [1,2,3,[4]] / [1,2,3,4] [1,2,3] / [[1,10],[2,20]] / [1,[10],2,[20]] / [1,3]',
    '[1,2,[3,[4]]] [1,2,3,[4]] / [1,2,3,4] [1,null,2,null,3] / [[1,10],[2,20]] / [1,[10],2,[20]] / [1,3]',
    '[1,2,[3,[4]]] [1,2,3,[4]] / [1,2,3,4] [1,2,3] / [[1,10],[2,20]] / [1,10,2,20] / [1,3]',
  ],
}

// content.mdx의 PredictQuiz를 읽는다. block은 원문 그대로다(따옴표 검사용).
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
    expect(concept.examples).toHaveLength(7)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput, 오답은 틀린 모델의 출력이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const expected = concept.examples[n - 1].expectedOutput.join(' / ')
    // 예제 1은 3지선다(시작 때 복사 모델은 정답과 출력이 같아 오답이 될 수 없다), 나머지는 4지선다
    expect(quiz.choices).toHaveLength(n === 1 ? 3 : 4)
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    expect([...wrong].sort()).toEqual([...WRONG[n]].sort())
  })

  it('PredictQuiz 속성 값 안에 큰따옴표가 없다(속성 구분용 4개뿐)', () => {
    for (const q of quizzes) expect(q.block.match(/"/g)?.length, `예제 ${q.example}`).toBe(4)
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

// --- 비교표 -----------------------------------------------------------------------------------

type Row = {
  method: string
  hole: string // 프로퍼티 없는 인덱스 칸
  stops: string // 멈추는 때 칸
  returns: string // 돌려주는 값 칸
  examples: number[]
  // 콜백이 계속하라는 값을 돌려주는 식(구멍 probe용)과 판정 콜백(멈추는 때 probe용)
  keepGoing: string
  judge: string
  // 돌려주는 값 칸을 확인하는 식(true여야 한다)
  returnsProbe: string
}

const SKIP = '콜백을 부르지 않음'
const READ = 'undefined로 읽어 콜백을 부름'
const END = '끝까지'
const FIRST_TRUTHY = '콜백이 처음 truthy를 돌려줄 때'
const FIRST_FALSY = '콜백이 처음 falsy를 돌려줄 때'

const table: Row[] = [
  {
    method: 'forEach',
    hole: SKIP,
    stops: END,
    returns: 'undefined',
    examples: [1, 2],
    keepGoing: 'undefined',
    judge: 'x > 1',
    returnsProbe: '[1, 2].forEach((x) => x) === undefined',
  },
  {
    method: 'map',
    hole: `${SKIP}(결과에도 구멍)`,
    stops: END,
    returns: '시작 때 읽은 길이와 같은 길이의 새 배열',
    examples: [3, 7],
    keepGoing: 'x',
    judge: 'x > 1',
    // 순회 중 push로 늘어나도 결과는 시작 때 읽은 길이(3)이고, 구멍이었던 자리는 결과에서도 구멍이다.
    returnsProbe: `(function () {
      var a = [1, 2, 3];
      var r = a.map((x) => { a.push(0); return x; });
      var h = [1, , 3].map((x) => x);
      return Array.isArray(r) && r !== a && r.length === 3 && a.length === 6 && h.length === 3 && !(1 in h);
    })()`,
  },
  {
    method: 'filter',
    hole: SKIP,
    stops: END,
    returns: '콜백이 truthy를 돌려준 때 넘긴 값만 담은 새 배열',
    examples: [3, 4],
    keepGoing: 'false',
    judge: 'x > 1',
    // 콜백이 그 자리를 0으로 바꿔도 결과에는 콜백에 넘긴 값이 담기고, falsy인 값은 빠진다.
    returnsProbe: `(function () {
      var a = [1, 2, 3];
      var r = a.filter((x, i) => { a[i] = 0; return x > 1; });
      return JSON.stringify(r) === '[2,3]' && JSON.stringify(a) === '[0,0,0]' && JSON.stringify([1, 2].filter((x) => false)) === '[]';
    })()`,
  },
  {
    method: 'some',
    hole: SKIP,
    stops: FIRST_TRUTHY,
    returns: 'true 또는 false',
    examples: [6],
    keepGoing: 'false',
    judge: 'x > 1',
    returnsProbe: '[1, 2].some((x) => x > 1) === true && [1, 2].some((x) => x > 5) === false',
  },
  {
    method: 'every',
    hole: SKIP,
    stops: FIRST_FALSY,
    returns: 'true 또는 false',
    examples: [6],
    keepGoing: 'true',
    judge: 'x < 2',
    returnsProbe: '[1, 2].every((x) => x < 5) === true && [1, 2].every((x) => x < 2) === false',
  },
  {
    method: 'find',
    hole: READ,
    stops: FIRST_TRUTHY,
    returns: '그 요소 또는 undefined',
    examples: [4, 5],
    keepGoing: 'false',
    judge: 'x > 1',
    returnsProbe:
      '[1, 2, 3].find((x) => x > 1) === 2 && [1, 2, 3].find((x) => x > 5) === undefined',
  },
  {
    method: 'findIndex',
    hole: READ,
    stops: FIRST_TRUTHY,
    returns: '그 인덱스 또는 -1',
    examples: [4],
    keepGoing: 'false',
    judge: 'x > 1',
    returnsProbe:
      '[1, 2, 3].findIndex((x) => x > 1) === 1 && [1, 2, 3].findIndex((x) => x > 5) === -1',
  },
  {
    method: 'flatMap',
    hole: SKIP,
    stops: END,
    returns: '콜백 결과를 깊이 1만 펼친 새 배열',
    examples: [7],
    keepGoing: '[]',
    judge: 'x > 1',
    returnsProbe: `(function () {
      var r = [1, 2].flatMap((x) => [x, [x * 10]]);
      return JSON.stringify(r) === '[1,[10],2,[20]]' && Array.isArray(r[1]) && r.length === 4;
    })()`,
  },
]

// 칸 문구 → 구멍 probe가 기대하는 콜백 호출 인덱스(배열 [1, , 3])
const HOLE_CALLS: Record<string, number[]> = {
  [SKIP]: [0, 2],
  [`${SKIP}(결과에도 구멍)`]: [0, 2],
  [READ]: [0, 1, 2],
}
// 칸 문구 → 배열 [1, 2, 3, 4]에 판정 콜백을 줬을 때 콜백이 불리는 횟수
const STOP_CALLS: Record<string, number> = {
  [END]: 4,
  [FIRST_TRUTHY]: 2,
  [FIRST_FALSY]: 2,
}

describe('비교표', () => {
  const rows = tableBody(mdx, [
    '메서드',
    '프로퍼티 없는 인덱스',
    '멈추는 때',
    '돌려주는 값',
    '예제',
  ])

  it('행이 8개이고 메서드 칸이 정의와 같다', () => {
    expect(rows).toHaveLength(table.length)
    expect(rows.map((r) => r[0])).toEqual(table.map((t) => t.method))
  })

  it.each(table.map((t, i) => [i + 1, t] as const))('행 %i', (i, t) => {
    // 칸 전체 문구를 정확히 비교한다(부분 문자열이 아니다).
    expect(rows[i - 1]).toEqual([t.method, t.hole, t.stops, t.returns, t.examples.join(', ')])

    // 프로퍼티 없는 인덱스 칸: [1, , 3]에서 콜백이 불린 인덱스
    const holeCalls = evaluate(`
      var seen = [];
      [1, , 3].${t.method}((x, i) => { seen.push(i); return ${t.keepGoing}; });
      seen.join(',')`)
    expect(holeCalls, `프로퍼티 없는 인덱스: ${t.method}`).toBe(HOLE_CALLS[t.hole].join(','))
    // find·findIndex는 구멍을 undefined로 읽는다
    if (t.hole === READ) {
      expect(
        evaluate(
          `var v = 'none'; [1, , 3].${t.method}((x, i) => { if (i === 1) v = typeof x; return false; }); v`,
        ),
      ).toBe('undefined')
    }

    // 멈추는 때 칸: [1, 2, 3, 4]에 판정 콜백을 줬을 때 콜백이 불린 횟수
    const calls = evaluate(`
      var n = 0;
      [1, 2, 3, 4].${t.method}((x) => { n++; return ${t.judge}; });
      n`)
    expect(calls, `멈추는 때: ${t.method}`).toBe(STOP_CALLS[t.stops])

    // 돌려주는 값 칸
    expect(evaluate(t.returnsProbe), `돌려주는 값: ${t.method}`).toBe(true)

    // 예제 칸은 그 메서드를 쓰는 예제 전부다(번호의 파일이 메서드를 쓰고, 쓰는 파일은 모두 칸에 있다)
    const using = [...exampleFilesByNumber(mdx)]
      .filter(([, file]) => readExample(file).includes(`.${t.method}(`))
      .map(([n]) => n)
    expect(t.examples, `예제 칸: ${t.method}`).toEqual(using)
  })

  // 정규화된 칸이 아니라 원문 표 블록에서 검사한다. 정규화(태그 제거)는 칸 안의 <...>를 지우므로 놓친다.
  it('표 칸 원문에서 <code> 태그를 뺀 문구에 `<`가 없다', () => {
    const start = mdx.indexOf('<th className="border-border border px-3 py-2">메서드</th>')
    expect(start).toBeGreaterThan(0)
    const block = mdx.slice(start, mdx.indexOf('</table>', start))
    const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    expect(cells).toHaveLength(table.length * 5)
    for (const cell of cells) {
      expect(cell.replace(/<\/?code>/g, ''), cell).not.toMatch(/</)
    }
  })
})

// --- 시나리오 ---------------------------------------------------------------------------------

// 추적 대상 배열 선언 줄(예제 원문에 그대로 있어야 한다). 이 줄만 __track(...)으로 바꾼다.
const DECLS: Record<string, { name: string; line: string }[]> = {
  'push-during-foreach': [{ name: 'nums', line: 'var nums = [1, 2];' }],
  'remove-during-foreach': [
    { name: 'a', line: 'var a = [1, 2, 3];' },
    { name: 'b', line: 'var b = [1, 2, 3];' },
  ],
  'find-reads-missing-index': [
    { name: 'a', line: 'var a = [1, , 3];' },
    { name: 'b', line: 'var b = [1, 2, 3];' },
  ],
}

type Event =
  | { kind: 'length'; value: number }
  | { kind: 'has'; k: number; result: boolean }
  | { kind: 'get'; k: number; value: string }

type Traced = { call: string; events: Event[] }

const isIndex = (key: string | symbol): key is string =>
  typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)

// 예제 원문에서 배열 선언 줄만 Proxy를 만드는 __track(...)으로 바꿔 실행하고, forEach·find가 배열에 한
// 접근(length 읽기, 인덱스 has·get)을 호출마다 기록한다. 기록은 그 메서드에 들어간 뒤 콜백을 부르는
// 동안을 빼고 빠져나오기 전까지만 켠다(콜백 안의 push·pop·shift나 마지막 JSON.stringify는 제외).
function traceExample(id: string): { traced: Traced[]; output: string[] } {
  const example = exampleOf(id)
  let code = readExample(example.file)
  for (const { name, line } of DECLS[id]) {
    expect(code.split(line).length - 1, `${id}: 선언 줄 "${line}"`).toBe(1)
    code = code.replace(line, line.replace(/= (.*);$/, `= __track('${name}', $1);`))
  }
  const traced: Traced[] = []
  let current: Traced | null = null
  const output: string[] = []
  const track = (name: string, target: unknown[]) => {
    const proxy: unknown[] = new Proxy(target, {
      get(t, key, receiver) {
        if (key === 'forEach' || key === 'find') {
          return (cb: (...args: unknown[]) => unknown) => {
            const entry: Traced = { call: `${name}.${key}(콜백)`, events: [] }
            traced.push(entry)
            const wrapped = (...args: unknown[]) => {
              current = null
              try {
                return cb(...args)
              } finally {
                current = entry
              }
            }
            current = entry
            try {
              return (Array.prototype[key] as (cb: unknown) => unknown).call(proxy, wrapped)
            } finally {
              current = null
            }
          }
        }
        const value = Reflect.get(t, key, receiver)
        if (current && key === 'length')
          current.events.push({ kind: 'length', value: value as number })
        if (current && isIndex(key))
          current.events.push({ kind: 'get', k: Number(key), value: String(value) })
        return value
      },
      has(t, key) {
        const result = Reflect.has(t, key)
        if (current && isIndex(key)) current.events.push({ kind: 'has', k: Number(key), result })
        return result
      },
    })
    return proxy
  }
  runInNewContext(code, {
    console: { log: (...args: unknown[]) => output.push(args.join(' ')) },
    __track: track,
  })
  return { traced, output }
}

// 시나리오 한 호출의 단계에서 기대하는 접근 목록: 확인 단계(callback이 null이고 check가 있는 단계)마다
// forEach는 has → (있으면) get, find는 get만이다.
function expectedEvents(steps: { state: LoopState }[]): Event[] {
  const expected: Event[] = []
  for (const { state } of steps) {
    if (state.k === null || state.check === null || state.callback !== null) continue
    if (state.check === 'not-checked') {
      expected.push({ kind: 'get', k: state.k, value: state.read! })
    } else {
      expected.push({ kind: 'has', k: state.k, result: state.check === 'present' })
      if (state.check === 'present') expected.push({ kind: 'get', k: state.k, value: state.read! })
    }
  }
  return expected
}

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)

  it('공통 불변식(코드 원문, 출력, 줄 범위)', () => {
    assertScenarioInvariants(scenario, example, source)
  })

  it('첫 단계: 프리렌더에서 읽히는 실행 전 상태', () => {
    const first = scenario.steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.output).toEqual([])
    expect(first.state.call).toBeNull()
    expect(first.state.method).toBeNull()
    expect(first.state.fixedLength).toBeNull()
    expect(first.state.outcome).toBeNull()
  })

  it('상태 불변식: 칸은 고정한 길이와 지금 length를 덮고, 구멍은 length 안쪽에만 있다', () => {
    for (const { title, state } of scenario.steps) {
      const where = `${scenario.id} / ${title}`
      if (state.array === null) continue
      const { length, cells } = state.array
      expect(cells.length, where).toBe(Math.max(state.fixedLength ?? 0, length))
      cells.forEach((cell, i) => {
        if (i >= length) expect(cell.kind, `${where} 인덱스 ${i}`).toBe('beyond-length')
        else expect(cell.kind, `${where} 인덱스 ${i}`).not.toBe('beyond-length')
      })
      // HasProperty 결과는 find에서는 확인하지 않고, 루프 밖이면 없다
      if (state.method === 'find') expect(state.check, where).not.toBe('present')
      if (state.method === null) expect(state.check, where).toBeNull()
      if (state.check === 'absent') expect(state.read, where).toBeNull()
    }
  })

  it('실제 실행(Proxy)의 접근 기록이 시나리오 단계와 같다: length 1회, 인덱스 has·get 순서와 값', () => {
    const { traced, output } = traceExample(scenario.id)
    // 추적한 실행도 같은 출력을 낸다
    expect(output).toEqual(example.expectedOutput)

    const calls = [...new Set(scenario.steps.map((s) => s.state.call).filter((c) => c !== null))]
    expect(traced.map((t) => t.call)).toEqual(calls)

    for (const t of traced) {
      const steps = scenario.steps.filter((s) => s.state.call === t.call)
      // 콜백 밖 length 읽기는 호출당 정확히 1회이고 값이 시나리오의 fixedLength와 같다
      const lengths = t.events.filter((e) => e.kind === 'length')
      expect(lengths, `${t.call}: length 읽기`).toHaveLength(1)
      expect(t.events[0], `${t.call}: length가 가장 먼저`).toEqual(lengths[0])
      const fixed = new Set(steps.map((s) => s.state.fixedLength))
      expect([...fixed], `${t.call}: fixedLength`).toEqual([
        (lengths[0] as { value: number }).value,
      ])
      // 인덱스 has·get
      expect(
        t.events.filter((e) => e.kind !== 'length'),
        `${t.call}: 인덱스 접근`,
      ).toEqual(expectedEvents(steps))
    }
  })
})

// --- 예제가 없는 주장의 탐침 ------------------------------------------------------------------

describe('예제가 없는 주장의 탐침', () => {
  it('본문: shift로 당겨진 값 중 지금 인덱스 바로 뒤의 값만 방문하지 않고, 그 뒤 값은 한 칸 앞 인덱스에서 방문한다', () => {
    const a = [1, 2, 3, 4]
    const seen: number[] = []
    a.forEach((x) => {
      seen.push(x)
      if (x === 1) a.shift()
    })
    expect(seen).toEqual([1, 3, 4])
    expect(mdx).toContain(
      '지금 인덱스 바로 뒤에 있던 값은 이미 값을 읽은 지금 인덱스로 옮겨져 다시 읽지 않고',
    )
    expect(mdx).not.toMatch(/지난 인덱스/)
    expect(mdx).not.toMatch(/당겨진 값은 이미 지난 인덱스로 가서 방문하지 않습니다/)
  })

  it('본문·학습 목표: pop·shift는 끝 인덱스를 지운다(length가 줄어서 프로퍼티가 없어진다고 쓰지 않는다)', () => {
    const order: string[] = []
    const p = new Proxy([1, 2, 3], {
      deleteProperty(t, k) {
        order.push(`delete ${String(k)}`)
        return Reflect.deleteProperty(t, k)
      },
      set(t, k, v) {
        if (k === 'length') order.push(`length ${v}`)
        return Reflect.set(t, k, v)
      },
    })
    p.pop()
    expect(order).toEqual(['delete 2', 'length 2'])
    expect(mdx).not.toMatch(/length`?가 줄어 프로퍼티가 없어진/)
    for (const goal of concept.goals) expect(goal).not.toMatch(/length가 줄어 프로퍼티가 없어진/)
  })

  it('본문: map 결과의 길이는 시작 때 읽은 길이이고, 구멍이었던 자리는 결과에서도 구멍이다', () => {
    expect(
      evaluate(
        'var a = [1, 2, 3]; var r = a.map((x) => { a.push(0); return x; }); [r.length, a.length].join(" ")',
      ),
    ).toBe('3 6')
    expect(evaluate('1 in [1, , 3].map((x) => x)')).toBe(false)
  })

  it('본문: filter는 콜백에 넘긴 값을 결과에 담는다', () => {
    expect(
      evaluate(
        'var a = [1, 2, 3]; var r = a.filter((x, i) => { a[i] = 0; return true; }); JSON.stringify(r) + JSON.stringify(a)',
      ),
    ).toBe('[1,2,3][0,0,0]')
  })

  it('본문: find는 구멍에서 undefined를 돌려주고 findIndex는 1이다', () => {
    expect(evaluate('[1, , 3].find((x) => x === undefined)')).toBeUndefined()
    expect(evaluate('[1, , 3].findIndex((x) => x === undefined)')).toBe(1)
    // 못 찾은 것도 undefined라 find의 반환값만으로는 구별할 수 없다
    expect(evaluate('[1, 3].find((x) => x === undefined)')).toBeUndefined()
  })

  it('본문: 빈 배열의 some은 false, every는 true이고 콜백을 부르지 않는다', () => {
    expect(
      evaluate(
        'var n = 0; var s = [].some(() => { n++; return true; }); var e = [].every(() => { n++; return false; }); [s, e, n].join(" ")',
      ),
    ).toBe('false true 0')
  })

  it('본문: 시작 때 값을 복사하는 모델이면 예제 3의 map은 인덱스 2에서 3을 받아 30을 돌려준다', () => {
    expect(
      evaluate(
        'var src = [1, 2, 3]; var snap = src.slice(); var mapped = snap.map((x, i) => { if (i === 0) src[2] = 30; src.push(0); return x * 10; }); JSON.stringify(mapped) + " " + src.length',
      ),
    ).toBe('[10,20,30] 6')
  })

  it('본문: join은 undefined를 빈 문자열로 바꾸므로 예제 5는 String(x)를 쓴다', () => {
    expect(evaluate('[1, undefined].join(" ")')).toBe('1 ')
    expect(evaluate('[1, undefined].map(String).join(" ")')).toBe('1 undefined')
  })

  it('단순화: reduce도 HasProperty가 false인 인덱스에서 콜백을 부르지 않는다', () => {
    expect(evaluate('JSON.stringify([1, , 3].reduce((acc, x, i) => acc.concat(i), []))')).toBe(
      '[0,2]',
    )
  })

  it('단순화: flatMap은 콜백이 돌려준 유사 배열을 펼치지 않는다', () => {
    expect(evaluate('JSON.stringify([1].flatMap(() => ({ 0: "a", length: 1 })))')).toBe(
      '[{"0":"a","length":1}]',
    )
  })

  it('본문: 깊이 0이어도 원본 배열의 구멍은 건너뛴다', () => {
    expect(evaluate('var r = [1, , 2].flat(0); [r.length, JSON.stringify(r)].join(" ")')).toBe(
      '2 [1,2]',
    )
    expect(mdx).toContain('깊이 0이어도 원본의 구멍은 건너뜁니다')
    expect(mdx).not.toContain('펼치는 깊이 안에서')
  })

  it('본문: 깊이가 모자라 펼치지 않은 안쪽 배열의 구멍은 남는다', () => {
    expect(
      evaluate('var r = [[[1, , 2]]].flat(); [r.length, r[0].length, 1 in r[0]].join(" ")'),
    ).toBe('1 3 false')
  })

  it('본문: flat은 깊이를 생략하면 1이고, 구멍은 결과에 들어가지 않으며, flatMap은 깊이 1만 펼친다', () => {
    expect(evaluate('JSON.stringify([1, [2, [3]]].flat())')).toBe('[1,2,[3]]')
    expect(evaluate('var r = [1, , [2, , 3]].flat(); r.length + " " + JSON.stringify(r)')).toBe(
      '3 [1,2,3]',
    )
    expect(evaluate('JSON.stringify([1].flatMap((x) => [[x]]))')).toBe('[[1]]')
  })

  it('본문: 구멍을 만난 flatMap은 콜백을 부르지 않는다', () => {
    expect(
      evaluate('var s = []; [1, , 3].flatMap((x) => { s.push(x); return [x]; }); s.join(",")'),
    ).toBe('1,3')
  })

  it('본문: 같은 데이터를 for...of로 돌리면 4개를 방문한다', () => {
    expect(
      evaluate(
        'var q = [1, 2], s = []; for (var x of q) { s.push(x); if (x < 3) q.push(x + 2); } JSON.stringify(s)',
      ),
    ).toBe('[1,2,3,4]')
  })
})

// 증거 범위: 틀린 모델을 흉내 낸 forEach로 예제를 실행해, 예제가 어느 모델을 가리고 어느 모델과 출력이 같은지 확인한다.
describe('예제의 증거 범위(틀린 모델과의 대조)', () => {
  const COPY = `function __m(a, cb) { var c = a.slice(); for (var i = 0; i < c.length; i++) if (i in c) cb(c[i], i, a); }\n`
  const REREAD = `function __m(a, cb) { for (var i = 0; i < a.length; i++) if (i in a) cb(a[i], i, a); }\n`
  const withModel = (model: string, id: string) =>
    runExample(model + readExample(exampleOf(id).file).replace(/(\w+)\.forEach\(/g, '__m($1, '))

  it('예제 1: 시작 때 복사 모델은 출력이 같고, length를 다시 읽는 모델은 다르다', () => {
    const expected = exampleOf('push-during-foreach').expectedOutput
    expect(withModel(COPY, 'push-during-foreach')).toEqual(expected)
    expect(withModel(REREAD, 'push-during-foreach')).toEqual(['[1,2,3,4] [1,2,3,4]'])
  })

  // 고정한 길이와 지금 length 중 작은 쪽까지만 돌고 HasProperty를 확인하지 않는 모델(forEach·map·filter)
  const MIN_NO_HAS = [
    'Array.prototype.forEach = function (cb) { var f = this.length; for (var i = 0; i < Math.min(f, this.length); i++) cb(this[i], i, this); };',
    'Array.prototype.map = function (cb) { var f = this.length, r = new Array(f); for (var i = 0; i < Math.min(f, this.length); i++) r[i] = cb(this[i], i, this); return r; };',
    'Array.prototype.filter = function (cb) { var f = this.length, r = []; for (var i = 0; i < Math.min(f, this.length); i++) { var v = this[i]; if (cb(v, i, this)) r.push(v); } return r; };',
    '',
  ].join('\n')

  it('예제 1~3은 작은 쪽까지만 돌고 HasProperty를 확인하지 않는 모델로도 출력이 같고, 가운데 구멍에서만 갈린다', () => {
    for (const id of ['push-during-foreach', 'remove-during-foreach', 'read-when-visited']) {
      const example = exampleOf(id)
      expect(runExample(MIN_NO_HAS + readExample(example.file)), id).toEqual(example.expectedOutput)
    }
    const middle =
      'var c = [1, 2, 3], s = []; c.forEach((x, i) => { s.push(x); if (i === 0) delete c[1]; }); console.log(JSON.stringify(s), c.length);'
    expect(runExample(middle)).toEqual(['[1,3] 3'])
    expect(runExample(MIN_NO_HAS + middle)).toEqual(['[1,null,3] 3'])
    expect(
      runExample(
        'var d = [1, 2, 3], t = []; d.find((x, i) => { t.push(String(x)); if (i === 0) delete d[1]; }); console.log(t.join(" "));',
      ),
    ).toEqual(['1 undefined 3'])
    // 본문이 가리키는 배열 메서드의 함정 예제 7: 실제 forEach는 구멍에서 콜백을 부르지 않아 visited가 2, 모델은 3
    const pitfalls = readFileSync(
      join(dir, '../array-method-pitfalls/examples/holes-and-reduce.js'),
      'utf8',
    )
    expect(runExample(pitfalls)[0].split(' ')[0]).toBe('2')
    expect(runExample(MIN_NO_HAS + pitfalls)[0].split(' ')[0]).toBe('3')
    expect(mdx).toContain('예제 1~3은')
    expect(mdx).toContain('[배열 메서드의 함정](/concepts/array-method-pitfalls)의 예제 7에서')
  })

  it('예제 2: length를 다시 읽는 모델은 출력이 같고, 시작 때 복사 모델은 다르다', () => {
    const expected = exampleOf('remove-during-foreach').expectedOutput
    expect(withModel(REREAD, 'remove-during-foreach')).toEqual(expected)
    expect(withModel(COPY, 'remove-during-foreach')).toEqual(['[1,2,3] 2', '[1,2,3] [2,3]'])
  })
})

// --- 메타와 본문 조건 -------------------------------------------------------------------------

// 문장 단위로 나눈 본문(코드 펜스·퀴즈·표 제외). 줄 안에서 마침표 뒤 공백으로도 나눈다.
const prose = mdx
  .replace(/```[\s\S]*?```/g, '')
  .replace(/<PredictQuiz\b[\s\S]*?\n\/>/g, '')
  .replace(/<div\n[\s\S]*?<\/table>\s*<\/div>/g, '')
const lines = prose.split('\n')
const sentences = lines.flatMap((l) => l.split(/(?<=[.?!])\s+/))

describe('메타와 본문 조건', () => {
  it('title·summary에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 272이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(272)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('시뮬레이터가 예제 5 퀴즈 바로 뒤, 예제 6 앞에 독립된 줄로 있다', () => {
    const at = (s: string) => mdx.indexOf(s)
    const quiz5 = [...mdx.matchAll(/<PredictQuiz\b[\s\S]*?\n\/>/g)][4]
    expect(quiz5[0]).toContain('예제 5의 출력')
    const quizEnd = quiz5.index! + quiz5[0].length
    const sim = at('<Simulator scenarios={scenarios} />')
    expect(sim).toBeGreaterThan(quizEnd)
    expect(sim).toBeLessThan(at('### 예제 6'))
    expect(mdx.slice(quizEnd, sim)).not.toMatch(/^#{1,3}\s/m)
    expect(mdx.slice(sim - 2, sim + '<Simulator scenarios={scenarios} />'.length + 2)).toBe(
      '\n\n<Simulator scenarios={scenarios} />\n\n',
    )
  })

  it('산문의 `<`와 `{`는 모두 백틱 안에 있다', () => {
    for (const line of lines) {
      const t = line.trim()
      if (t.startsWith('<') || t.startsWith('import ')) continue
      expect(t.replace(/`[^`]*`/g, ''), line).not.toMatch(/[<{]/)
    }
  })

  it('옛 명세 이름(len, O, findRec)을 쓰지 않는다', () => {
    expect(mdx).not.toMatch(/\blen\b|\bfindRec\b|\bO\b/)
  })

  it('예제 1은 복사 모델과 출력이 같다고, 예제 2는 length 재확인 모델과 출력이 같다고 밝힌다', () => {
    expect(mdx).toContain('복사해 돈다는 모델과는 출력이 같습니다')
    expect(mdx).toMatch(/length`를 매번 다시 읽는 모델과는 출력이 같습니다/)
    expect(mdx).toContain(
      '값 2는 이미 값을 읽은 인덱스 0(지금 콜백이 실행 중인 인덱스)으로 옮겨져 다시 읽지 않았습니다',
    )
    expect(mdx).toContain('`shift`가 지운 값 1은 그 `shift`를 부른 콜백이 이미 받은 값입니다')
  })

  it('forEach가 복사한다고 주장하지 않는다: 복사를 말하는 문장은 모델·반박·오해 표시가 있다', () => {
    for (const s of sentences.filter((s) => s.includes('복사'))) {
      expect(s, s).toMatch(/모델|아니라|misconception|복사본이라면/)
    }
  })

  it('"구멍을 건너뛴다"는 문장은 메서드를 한정하고, 콜백 메서드 전체를 일반화하지 않는다', () => {
    expect(mdx).not.toMatch(/콜백 메서드는 모두/)
    for (const s of sentences.filter((s) => /구멍(을|은)? ?건너뛴|구멍.*건너뛰/.test(s))) {
      expect(s, s).toMatch(/forEach|map|filter|some|every|find|flatMap/)
    }
  })

  it('"지운 자리·지운 요소"는 pop 문맥에서만 쓰고 shift는 그렇게 설명하지 않는다', () => {
    for (const s of sentences.filter((s) => /지운 (자리|요소)/.test(s))) {
      expect(s, s).toContain('pop')
      expect(s, s).not.toContain('shift')
    }
  })
})
