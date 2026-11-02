import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { isArrayIndex, scenarios, type ArrayCard, type ArrayState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체라 instanceof 대신 name으로 검사한다.
const errorNameOf = (source: string): string | null => {
  try {
    runInNewContext(source)
    return null
  } catch (e) {
    return (e as Error).name
  }
}

describe('본문 주장 검증', () => {
  it('`[,].length`는 1', () => {
    expect(runInNewContext('[,].length')).toBe(1)
  })

  it('`[1, 2, ,].length`는 3(마지막 쉼표 하나는 세지 않는다)', () => {
    expect(runInNewContext('[1, 2, ,].length')).toBe(3)
  })

  it('`new Array(1.5)`는 RangeError', () => {
    expect(errorNameOf('new Array(1.5)')).toBe('RangeError')
  })

  it('in은 프로토타입 체인까지 봐서 Array.prototype에 같은 키가 있으면 구멍에서도 true, Object.hasOwn은 false', () => {
    expect(
      runInNewContext(
        "Array.prototype[1] = 'proto'; var a = [1, , 3]; [1 in a, a[1], Object.hasOwn(a, 1)].join()",
      ),
    ).toBe('true,proto,false')
  })

  it('length에 2^32 이상을 대입하면 RangeError, 2^32 - 1은 허용', () => {
    expect(
      runInNewContext('var a = [1, 2]; try { a.length = 4294967296; } catch (e) { e.name }'),
    ).toBe('RangeError')
    expect(runInNewContext('var a = [1, 2]; a.length = 4294967295; a.length')).toBe(4294967295)
  })

  it('`Object.getPrototypeOf([]) === Array.prototype`', () => {
    expect(runInNewContext('Object.getPrototypeOf([]) === Array.prototype')).toBe(true)
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

type Snap = { name: string; length: number; props: [string, string, string][] }

// 예제의 1..to 줄 + 스냅샷 코드를 실행한다. var로 선언한 이름마다 length와 Object.keys 순서의 [키, 타입, 문자열]을 기록한다.
function runUntil(source: string, to: number): { snap: Snap[]; output: string[] } {
  const code = source.split('\n').slice(0, to).join('\n')
  const declared = [...code.matchAll(/^var (\w+)/gm)].map((m) => m[1])
  const output: string[] = []
  const sandbox: Record<string, unknown> = {
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  }
  const pairs = declared.map((n) => `[${JSON.stringify(n)}, ${n}]`).join(', ')
  const snapshot = `
__snap = JSON.stringify([${pairs}].map(function (p) {
  var v = p[1];
  return { name: p[0], length: v.length, props: Object.keys(v).map(function (k) { return [k, typeof v[k], String(v[k])]; }) };
}));`
  runInNewContext(`${code}\n${snapshot}`, sandbox, { timeout: 2000 })
  return { snap: JSON.parse(sandbox.__snap as string) as Snap[], output }
}

const sameCardContent = (a: ArrayCard, b: ArrayCard): boolean =>
  a.length === b.length &&
  a.props.length === b.props.length &&
  a.props.every(
    (p, i) =>
      p.key === b.props[i].key &&
      p.value.type === b.props[i].value.type &&
      p.value.display === b.props[i].value.display,
  )

// 이전 단계와의 차이로 changed·lengthChanged·removed를 계산한다. 처음 나타난 배열은 모든 프로퍼티가 changed이고 length > 0이면 lengthChanged다.
function expectedDiff(prev: ArrayState, curr: ArrayState): ArrayCard[] {
  return curr.arrays.map((c) => {
    const p = prev.arrays.find((x) => x.name === c.name)
    return {
      name: c.name,
      length: c.length,
      ...((p ? p.length !== c.length : c.length > 0) && { lengthChanged: true }),
      props: c.props.map((prop) => {
        const old = p?.props.find((q) => q.key === prop.key)
        const changed =
          !old || old.value.type !== prop.value.type || old.value.display !== prop.value.display
        return { key: prop.key, value: prop.value, ...(changed && { changed: true }) }
      }),
      ...(p &&
        p.props.some((q) => !c.props.some((r) => r.key === q.key)) && {
          removed: p.props.filter((q) => !c.props.some((r) => r.key === q.key)).map((q) => q.key),
        }),
    }
  })
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 index-keys, shrink-length, holes다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['index-keys', 'shrink-length', 'holes'])
  })

  it('라벨과 exampleId가 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.label)).toEqual([
      '인덱스와 length',
      'length 줄이고 늘리기',
      '구멍과 undefined',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['index-keys', 'shrink-length', 'holes'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })
})

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
    expect(first.state).toEqual({ arrays: [] })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
      expect(step.line!.from, `단계 ${k + 2}: 줄은 단계마다 1씩 늘어납니다`).toBe(k + 1)
    })
  })

  it('모든 단계에서 배열 length ≤ 8, 배열 이름·키가 중복되지 않는다', () => {
    steps.forEach((step, i) => {
      expect(duplicates(step.state.arrays.map((a) => a.name)), `단계 ${i + 1}`).toEqual([])
      for (const a of step.state.arrays) {
        expect(a.length, `단계 ${i + 1}: ${a.name}`).toBeLessThanOrEqual(8)
        expect(duplicates(a.props.map((p) => p.key)), `단계 ${i + 1}: ${a.name}`).toEqual([])
      }
    })
  })

  it('실행 대조: 예제를 단계의 줄까지 실제로 실행한 결과 = 상태(이름·순서, 키 순서·타입·표시, length, 출력)', () => {
    steps.forEach((step, i) => {
      if (i === 0) return
      const real = runUntil(source(), step.line!.to)
      const where = `단계 ${i + 1}`
      expect(
        step.state.arrays.map((a) => a.name),
        `${where}: 배열 이름·순서`,
      ).toEqual(real.snap.map((s) => s.name))
      step.state.arrays.forEach((a, k) => {
        const r = real.snap[k]
        expect(a.length, `${where}: ${a.name}.length`).toBe(r.length)
        expect(
          a.props.map((p) => [p.key, p.value.type, p.value.display]),
          `${where}: ${a.name}의 프로퍼티`,
        ).toEqual(r.props)
      })
      expect(step.output, `${where}: 출력`).toEqual(real.output)
    })
  })

  it('changed·lengthChanged·removed가 이전 단계와의 차이와 같다', () => {
    steps.forEach((step, i) => {
      const prev = i === 0 ? { arrays: [] } : steps[i - 1].state
      expect(step.state.arrays, `단계 ${i + 1}`).toEqual(expectedDiff(prev, step.state))
    })
  })

  it('이어지는 단계는 diff 계산이 의미 있도록 내용이 서로 다르거나 출력만 늘어난다', () => {
    // 출력 줄(console.log)만 실행하는 단계는 상태 내용이 이전과 같아야 한다.
    steps.forEach((step, i) => {
      if (i === 0) return
      const text = source().split('\n')[step.line!.from - 1]
      if (!text.startsWith('console.log')) return
      const prev = steps[i - 1].state.arrays
      expect(step.state.arrays.length, `단계 ${i + 1}`).toBe(prev.length)
      step.state.arrays.forEach((a, k) =>
        expect(sameCardContent(a, prev[k]), `단계 ${i + 1}`).toBe(true),
      )
    })
  })
})

describe('isArrayIndex가 실제 동작과 같다', () => {
  const scenarioKeys = new Set<string>()
  for (const s of scenarios) {
    for (const step of s.steps) {
      for (const a of step.state.arrays) {
        for (const p of a.props) scenarioKeys.add(p.key)
      }
    }
  }
  const keys = [...scenarioKeys, '-1', '01', '1.5', '4294967295', '4294967294', '0']

  it.each(keys)('키 %j: 배열에 대입해 length가 바뀌는지 = isArrayIndex', (key) => {
    const changes = runInNewContext(`var a = []; a[${JSON.stringify(key)}] = 1; a.length > 0`)
    expect(isArrayIndex(key)).toBe(changes)
  })
})
