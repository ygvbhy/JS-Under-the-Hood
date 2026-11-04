import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['live', 'static'])
    expect(scenarios.map((s) => s.label)).toEqual(['살아 있는 HTMLCollection', '정적인 NodeList'])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['live-loop', 'static-loop'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 live 12, static 18이다', () => {
    expect(scenarios[0].steps).toHaveLength(12)
    expect(scenarios[1].steps).toHaveLength(18)
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)!
  const source = () => readExample(example.file)
  const steps = scenario.steps
  const isLive = scenario.id === 'live'

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    expect(lines[20]).toBe('for (var i = 0; i < todos.length; i++) {')
    expect(lines[21]).toBe("  todos[i].className = 'done';")
    expect(lines[22]).toBe("  show('i=' + i);")
    expect(lines[19]).toBe("show('시작');")
    expect(lines[24]).toBe("show('끝');")
  })

  it('첫 단계는 line이 없는 초기 상태·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({
      kind: scenario.id,
      classes: ['todo', 'todo', 'todo', 'todo'],
      collection: null,
      i: null,
      target: null,
      check: null,
    })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
    })
  })

  it('① 컬렉션 규칙: live는 todo인 li 번호 목록, static은 15번 줄부터 항상 [0,1,2,3]', () => {
    steps.forEach((step, k) => {
      const { collection, classes } = step.state
      if (collection === null) return
      if (isLive) {
        const expected = classes.flatMap((c, idx) => (c === 'todo' ? [idx] : []))
        expect(collection, `단계 ${k + 1}`).toEqual(expected)
      } else {
        expect(collection, `단계 ${k + 1}`).toEqual([0, 1, 2, 3])
      }
    })
    // 15번 줄 이전에는 null, 15번 줄부터는 null이 아니다
    steps.forEach((step, k) => {
      if (!step.line) return
      expect(step.state.collection === null, `단계 ${k + 1}`).toBe(step.line.from < 15)
    })
  })

  it('② 22번 줄 단계: target은 앞 단계 collection[i]이고 그 li의 class만 todo에서 done으로 바뀐다', () => {
    const targetSteps = steps.filter((s) => s.line?.from === 22)
    expect(targetSteps.length).toBeGreaterThan(0)
    steps.forEach((step, k) => {
      if (step.line?.from !== 22) {
        expect(step.state.target, `단계 ${k + 1}`).toBeNull()
        return
      }
      const prev = steps[k - 1].state
      const { target, i, classes } = step.state
      expect(i, `단계 ${k + 1}`).not.toBeNull()
      expect(target, `단계 ${k + 1}: target`).toBe(prev.collection![i!])
      classes.forEach((c, idx) => {
        if (idx === target) {
          expect(prev.classes[idx], `단계 ${k + 1}: 바뀌기 전 class`).toBe('todo')
          expect(c, `단계 ${k + 1}: 바뀐 class`).toBe('done')
        } else {
          expect(c, `단계 ${k + 1}: li ${idx}`).toBe(prev.classes[idx])
        }
      })
    })
  })

  it('③ 21번 줄 단계: check는 i < length 결과이고 length는 collection.length, i는 state.i다', () => {
    const checks = steps.filter((s) => s.line?.from === 21)
    expect(checks.length).toBeGreaterThan(0)
    steps.forEach((step, k) => {
      if (step.line?.from !== 21) {
        expect(step.state.check, `단계 ${k + 1}`).toBeNull()
        return
      }
      const { check, collection, i } = step.state
      expect(check, `단계 ${k + 1}`).not.toBeNull()
      expect(check!.result, `단계 ${k + 1}: result`).toBe(check!.i < check!.length)
      expect(check!.length, `단계 ${k + 1}: length`).toBe(collection!.length)
      expect(check!.i, `단계 ${k + 1}: i`).toBe(i)
    })
  })

  it('④ 출력이 한 줄 늘어난 단계의 새 줄은 "라벨 length classes"와 같다', () => {
    let grown = 0
    let previous: string[] = []
    steps.forEach((step, k) => {
      const output = step.output!
      const added = output.length - previous.length
      expect(added, `단계 ${k + 1}: 한 단계에 한 줄까지`).toBeLessThanOrEqual(1)
      if (added === 1) {
        grown++
        const { collection, classes, i } = step.state
        const label = { 20: '시작', 23: `i=${i}`, 25: '끝' }[step.line!.from as 20 | 23 | 25]
        expect(label, `단계 ${k + 1}: 출력을 만드는 줄`).toBeDefined()
        expect(output.at(-1), `단계 ${k + 1}`).toBe(
          `${label} ${collection!.length} ${JSON.stringify(classes)}`,
        )
      }
      previous = output
    })
    expect(grown).toBe(example.expectedOutput.length)
  })

  it('⑦ 마지막 단계의 class: live는 done/todo/done/todo, static은 모두 done', () => {
    const last = steps.at(-1)!.state.classes
    expect(last).toEqual(
      isLive ? ['done', 'todo', 'done', 'todo'] : ['done', 'done', 'done', 'done'],
    )
  })
})
