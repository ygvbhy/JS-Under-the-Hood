import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { concept } from './meta'
import { isArrayIndex, scenarios, type KeyOrderState, type ObjCard, type Prop } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

// 키가 실행에서 배열 인덱스처럼 앞에 오는지: 문자열 키 x를 먼저 만든 객체에 키를 넣어 x보다 앞에 나오는지 본다.
const runsAsIndex = (key: string): boolean =>
  runInNewContext(
    `var o = { x: 0 }; o[${JSON.stringify(key)}] = 1; Object.keys(o)[0] !== 'x'`,
  ) as boolean

const BOUNDARY_KEYS = [
  '0',
  '9',
  '10',
  '4294967294',
  '4294967295',
  '9007199254740991',
  '01',
  '1.5',
  '-1',
  '-0',
]

describe('본문 서술의 근거', () => {
  it('심벌 키는 Reflect.ownKeys에서 문자열 키 뒤에 온다', () => {
    expect(
      runInNewContext(
        "var s = Symbol('s'); var o = {}; o[s] = 1; o.b = 1; o[0] = 1; Reflect.ownKeys(o).map(String).join()",
      ),
    ).toBe('0,b,Symbol(s)')
  })

  it('기존 키를 defineProperty로 재정의해도 Object.keys 순서가 그대로다', () => {
    expect(
      runInNewContext(
        "var o = { a: 1, b: 2 }; Object.defineProperty(o, 'a', { value: 3 }); Object.keys(o).join()",
      ),
    ).toBe('a,b')
  })

  it('enumerable을 false에서 true로 바꿔도 Object.keys 순서가 그대로다', () => {
    expect(
      runInNewContext(
        "var o = { a: 1, b: 2 }; Object.defineProperty(o, 'a', { enumerable: false }); Object.defineProperty(o, 'a', { enumerable: true }); Object.keys(o).join()",
      ),
    ).toBe('a,b')
  })

  it('퀴즈: { b, 10, a, 9 }의 Object.keys는 ["9","10","b","a"]', () => {
    expect(runInNewContext('JSON.stringify(Object.keys({ b: 0, 10: 0, a: 0, 9: 0 }))')).toBe(
      '["9","10","b","a"]',
    )
  })

  it('delete 뒤 다시 만든 배열 인덱스 키는 숫자 크기 자리로 돌아간다', () => {
    expect(
      runInNewContext('var o = { 1: 1, a: 2, b: 3 }; delete o[1]; o[1] = 1; Object.keys(o).join()'),
    ).toBe('1,a,b')
  })

  it('for...in: 열거할 수 없는 자기 키도 같은 이름의 상속된 키를 가린다', () => {
    expect(
      runInNewContext(
        "var p = { x: 1, y: 2 }; var o = Object.create(p); Object.defineProperty(o, 'x', { value: 3, enumerable: false }); var r = []; for (var k in o) r.push(k); r.join()",
      ),
    ).toBe('y')
  })

  it('예제 5 해설: Object.prototype에는 for...in으로 나올 키가 없다', () => {
    expect(runInNewContext('var r = []; for (var k in Object.prototype) r.push(k); r.length')).toBe(
      0,
    )
  })

  it('for...in은 심벌 키를 돌지 않는다', () => {
    expect(
      runInNewContext(
        "var o = { a: 1 }; o[Symbol('s')] = 2; var r = []; for (var k in o) r.push(k); r.join()",
      ),
    ).toBe('a')
  })

  it('Map은 숫자 모양 키도 넣은 순서로 돌려준다', () => {
    expect(
      runInNewContext("var m = new Map([['b', 0], ['2', 0], ['1', 0]]); [...m.keys()].join()"),
    ).toBe('b,2,1')
  })

  it('JSON.stringify도 같은 키 순서로 직렬화한다', () => {
    expect(runInNewContext('JSON.stringify({ b: 0, 2: 0, a: 0, 1: 0 })')).toBe(
      '{"1":0,"2":0,"b":0,"a":0}',
    )
  })
})

// --- 시나리오 검사 ------------------------------------------------------------------------------

type Snap = { name: string; keys: [string, string, string][] }

// 예제의 1..to 줄 뒤에 스냅숏 코드를 이어 붙인 한 스크립트를 실행한다. const도 같은 스크립트라 읽힌다.
function runUntil(source: string, to: number): { snap: Snap[]; output: string[] } {
  const code = source.split('\n').slice(0, to).join('\n')
  const declared = [...code.matchAll(/^(?:const|let|var) (\w+)/gm)].map((m) => m[1])
  const output: string[] = []
  const sandbox: Record<string, unknown> = {
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  }
  const entries = declared
    .map((n) => `typeof ${n} !== 'undefined' ? [${JSON.stringify(n)}, ${n}] : null`)
    .join(', ')
  const snapshot = `
__snap = JSON.stringify([${entries}].filter(Boolean).map(function (p) {
  var v = p[1];
  return { name: p[0], keys: Object.keys(v).map(function (k) { return [k, typeof v[k], String(v[k])]; }) };
}));`
  runInNewContext(`${code}\n${snapshot}`, sandbox, { timeout: 2000 })
  return { snap: JSON.parse(sandbox.__snap as string) as Snap[], output }
}

const ids = ['basic-order', 'reassign-delete', 'not-index']

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 basic-order, reassign-delete, not-index다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(ids)
  })

  it('라벨과 exampleId가 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.label)).toEqual([
      '키를 하나씩 추가',
      '다시 대입과 delete',
      '배열 인덱스가 아닌 숫자 키',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(ids)
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })
})

// 이전 단계와의 차이로 change·removed를 계산한다. 처음 나타난 객체는 모든 키가 'new'다.
function expectedDiff(prev: KeyOrderState, curr: KeyOrderState): ObjCard[] {
  const diffLane = (p: ObjCard | undefined, keys: ObjCard['indexKeys']) =>
    keys.map((prop) => {
      const old = [...(p?.indexKeys ?? []), ...(p?.stringKeys ?? [])].find(
        (q) => q.key === prop.key,
      )
      const change: Prop['change'] = !old
        ? 'new'
        : old.value.type !== prop.value.type || old.value.display !== prop.value.display
          ? 'value'
          : undefined
      return { key: prop.key, value: prop.value, ...(change && { change }) }
    })
  return curr.objects.map((c) => {
    const p = prev.objects.find((x) => x.name === c.name)
    const now = [...c.indexKeys, ...c.stringKeys].map((q) => q.key)
    const gone = p
      ? [...p.indexKeys, ...p.stringKeys].map((q) => q.key).filter((k) => !now.includes(k))
      : []
    return {
      name: c.name,
      indexKeys: diffLane(p, c.indexKeys),
      stringKeys: diffLane(p, c.stringKeys),
      ...(gone.length > 0 && { removed: gone }),
    }
  })
}

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readExample(example!.file)
  const steps = scenario.steps

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('첫 단계는 line이 없는 빈 상태·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ objects: [] })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
    })
  })

  it('실행 대조: 예제를 단계의 줄까지 실제로 실행한 결과 = 상태(객체 이름·순서, 키 순서·타입·표시, 출력)', () => {
    steps.forEach((step, i) => {
      if (i === 0) return
      const real = runUntil(source(), step.line!.to)
      const where = `단계 ${i + 1}`
      expect(
        step.state.objects.map((o) => o.name),
        `${where}: 객체 이름·순서`,
      ).toEqual(real.snap.map((s) => s.name))
      step.state.objects.forEach((o, k) => {
        expect(
          [...o.indexKeys, ...o.stringKeys].map((p) => [p.key, p.value.type, p.value.display]),
          `${where}: ${o.name}의 키`,
        ).toEqual(real.snap[k].keys)
      })
      expect(step.output, `${where}: 출력`).toEqual(real.output)
    })
  })

  it('칸 독립 판정: indexKeys의 키는 모두 배열 인덱스, stringKeys의 키는 모두 아니다', () => {
    steps.forEach((step, i) => {
      for (const o of step.state.objects) {
        for (const p of o.indexKeys) {
          expect(isArrayIndex(p.key), `단계 ${i + 1}: ${o.name}.indexKeys ${p.key}`).toBe(true)
        }
        for (const p of o.stringKeys) {
          expect(isArrayIndex(p.key), `단계 ${i + 1}: ${o.name}.stringKeys ${p.key}`).toBe(false)
        }
      }
    })
  })

  it('change·removed가 이전 단계와의 차이와 같다', () => {
    steps.forEach((step, i) => {
      const prev = i === 0 ? { objects: [] } : steps[i - 1].state
      expect(step.state.objects, `단계 ${i + 1}`).toEqual(expectedDiff(prev, step.state))
    })
  })
})

describe('isArrayIndex가 실제 동작과 같다', () => {
  const scenarioKeys = new Set<string>()
  for (const s of scenarios) {
    for (const step of s.steps) {
      for (const o of step.state.objects) {
        for (const p of [...o.indexKeys, ...o.stringKeys]) scenarioKeys.add(p.key)
      }
    }
  }
  const keys = [...new Set([...scenarioKeys, ...BOUNDARY_KEYS])]

  it.each(keys)('키 %j: { x: 0 }에 넣어 x보다 앞에 오는지 = isArrayIndex', (key) => {
    expect(isArrayIndex(key)).toBe(runsAsIndex(key))
  })
})

describe('content.mdx 키 분류 표', () => {
  it('표의 각 키 판정이 실행과 같다', () => {
    const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')
    const rows = tableBody(mdx, ['키', '배열 인덱스인가', '이유'])
    expect(rows.length).toBeGreaterThanOrEqual(10)
    for (const [keyCell, answer] of rows) {
      const m = keyCell.match(/^'(.*)'$/)
      expect(m, `키 칸 "${keyCell}"은 작은따옴표로 감싼 텍스트여야 합니다`).not.toBeNull()
      expect(['예', '아니요'], `키 ${keyCell}의 둘째 칸`).toContain(answer)
      expect(answer === '예', `키 ${keyCell}`).toBe(runsAsIndex(m![1]))
    }
  })
})
