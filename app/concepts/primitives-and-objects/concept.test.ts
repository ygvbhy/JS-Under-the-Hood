import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type MemoryState, type Value } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')

function objectIdsIn(value: Value): string[] {
  return value.kind === 'object' ? [value.id] : []
}

function duplicates(items: string[]): string[] {
  return items.filter((item, i) => items.indexOf(item) !== i)
}

// L2: 시나리오 불변식 ①~⑤(공통 헬퍼) + ⑥ 상태 참조 무결성(이 개념 전용)
describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않는다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
  })

  it('시나리오는 reassign, mutate, pass-to-function 순서다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['reassign', 'mutate', 'pass-to-function'])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    const source = readFileSync(join(examplesDir, example!.file), 'utf8')
    assertScenarioInvariants(scenario, example!, source)
  })

  it.each(scenario.steps.map((step, i) => [i + 1, step.title, step.state] as const))(
    '단계 %i "%s": 상태 참조가 올바르다 (⑥)',
    (_n, _title, state: MemoryState) => {
      const objectIds = state.objects.map((o) => o.id)
      expect(duplicates(objectIds), '객체 id가 중복됩니다').toEqual([])
      expect(duplicates(state.scopes.map((s) => s.id)), 'scope id가 중복됩니다').toEqual([])

      const known = new Set(objectIds)
      for (const scope of state.scopes) {
        expect(
          duplicates(scope.bindings.map((b) => b.name)),
          `scope "${scope.id}"의 바인딩 이름이 중복됩니다`,
        ).toEqual([])
        for (const b of scope.bindings) {
          for (const id of objectIdsIn(b.value)) {
            expect(known.has(id), `바인딩 ${b.name}이 없는 객체 "${id}"를 가리킵니다`).toBe(true)
          }
        }
      }
      for (const o of state.objects) {
        expect(duplicates(o.props.map((p) => p.key)), `객체 ${o.id}의 프로퍼티 중복`).toEqual([])
        for (const p of o.props) {
          for (const id of objectIdsIn(p.value)) {
            expect(known.has(id), `${o.id}.${p.key}가 없는 객체 "${id}"를 가리킵니다`).toBe(true)
          }
        }
      }
    },
  )

  it('첫 단계는 line이 없는 빈 상태이고 output은 모두 문자열 배열이다', () => {
    const first = scenario.steps[0]
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ scopes: [], objects: [] })
    for (const step of scenario.steps) expect(Array.isArray(step.output)).toBe(true)
  })
})
