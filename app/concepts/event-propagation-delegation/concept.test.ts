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
    expect(scenarios.map((s) => s.id)).toEqual(['icon', 'button'])
    expect(scenarios.map((s) => s.label)).toEqual(['아이콘을 클릭', '버튼을 직접 클릭'])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['path-icon', 'path-button'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 icon 16, button 13이다', () => {
    expect(scenarios[0].steps).toHaveLength(16)
    expect(scenarios[1].steps).toHaveLength(13)
  })
})

// 시나리오 선언: 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  icon: {
    22: "window.addEventListener('click', function (e) {",
    25: '}, true);',
    26: "card.addEventListener('click', show('card 캡처'), true);",
    27: "save.addEventListener('click', show('save 캡처'), true);",
    28: "save.addEventListener('click', show('save 버블'));",
    29: "card.addEventListener('click', show('card 버블'));",
    30: "document.addEventListener('click', show('document 버블'));",
    31: "document.getElementById('icon').click();",
    32: "console.log('끝', last.eventPhase, last.currentTarget);",
  },
  button: {
    21: "window.addEventListener('click', function (e) {",
    23: '}, true);',
    24: "save.addEventListener('click', show('save 버블'));",
    25: "save.addEventListener('click', show('save 캡처'), true);",
    26: "card.addEventListener('click', show('card 버블'));",
    27: "card.addEventListener('click', show('card 캡처'), true);",
    28: 'save.click();',
  },
}

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)!
  const source = () => readExample(example.file)
  const steps = scenario.steps
  const isIcon = scenario.id === 'icon'
  const expectedPath = JSON.parse(example.expectedOutput[0]) as string[]
  const target = expectedPath[0]
  const listeners = steps[0].state.listeners

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('등록된 리스너의 줄 번호가 그 리스너를 등록한 줄이다', () => {
    const lines = source().split('\n')
    for (const l of listeners) {
      if (l.label === 'window 캡처') {
        expect(lines[l.line - 1]).toContain("window.addEventListener('click'")
        continue
      }
      const name = l.label.split(' ')[0]
      const line = lines[l.line - 1]
      expect(line, l.label).toContain(`${name}.addEventListener('click', show('${l.label}')`)
      expect(line.includes("'), true);"), l.label).toBe(l.capture)
    }
    // 시나리오의 모든 단계에서 listeners는 같다(고정)
    steps.forEach((step, k) => expect(step.state.listeners, `단계 ${k + 1}`).toEqual(listeners))
  })

  it('첫 단계는 "실행 전": path null, 디스패치 전 상태, 빈 출력이다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toEqual({ from: isIcon ? 31 : 28, to: isIcon ? 31 : 28 })
    expect(first.state).toEqual({
      path: null,
      listeners,
      pass: null,
      node: null,
      eventPhase: 0,
      target: null,
      fired: null,
    })
    expect(first.output).toEqual([])
  })

  it('① path는 null이 아닐 때 예제 첫 출력 줄(composedPath)과 같고, 첫 출력부터 null이 아니다', () => {
    steps.forEach((step, k) => {
      const { path } = step.state
      const hasOutput = step.output!.length > 0
      expect(path !== null, `단계 ${k + 1}: path는 출력이 생긴 뒤부터 non-null`).toBe(hasOutput)
      if (path !== null) expect(path, `단계 ${k + 1}`).toEqual(expectedPath)
    })
  })

  it('② 캡처 순회 방문 순서는 path 역순, 버블 순회는 path 순서이고 단계가 그 순서로 이어진다', () => {
    const capture = steps.filter((s) => s.state.pass === 'capture').map((s) => s.state.node)
    const bubble = steps.filter((s) => s.state.pass === 'bubble').map((s) => s.state.node)
    expect(capture).toEqual([...expectedPath].reverse())
    expect(bubble).toEqual(expectedPath)
    // 캡처 순회 단계가 모두 버블 순회 단계보다 앞선다
    const lastCapture = steps.map((s) => s.state.pass).lastIndexOf('capture')
    const firstBubble = steps.findIndex((s) => s.state.pass === 'bubble')
    expect(lastCapture).toBeLessThan(firstBubble)
  })

  it('③ eventPhase 규칙: node가 target이면 2, 아니면 캡처 1·버블 3, 방문 밖은 0', () => {
    steps.forEach((step, k) => {
      const { node, pass, eventPhase, target: t } = step.state
      if (pass === null) {
        expect(node, `단계 ${k + 1}`).toBeNull()
        expect(eventPhase, `단계 ${k + 1}`).toBe(0)
        return
      }
      expect(t, `단계 ${k + 1}: target`).toBe(target)
      const expected = node === t ? 2 : pass === 'capture' ? 1 : 3
      expect(eventPhase, `단계 ${k + 1}: ${node} ${pass}`).toBe(expected)
    })
  })

  it('④ fired 리스너는 방문 노드에 있고 순회 종류와 capture가 맞다', () => {
    steps.forEach((step, k) => {
      const { fired, node, pass } = step.state
      if (fired === null) return
      const matches = listeners.filter((l) => l.label === fired)
      expect(matches, `단계 ${k + 1}: ${fired}`).toHaveLength(1)
      expect(matches[0].node, `단계 ${k + 1}: 노드`).toBe(node)
      expect(matches[0].capture, `단계 ${k + 1}: capture`).toBe(pass === 'capture')
      // 그 노드·순회에 맞는 리스너가 있으면 반드시 실행된다
      expect(step.line, `단계 ${k + 1}`).toBeDefined()
    })
    // 방문 단계에서 순회에 맞는 리스너가 있는데 fired가 null이면 안 된다
    steps.forEach((step, k) => {
      const { node, pass, fired } = step.state
      if (pass === null) return
      const expected = listeners.find((l) => l.node === node && l.capture === (pass === 'capture'))
      expect(fired, `단계 ${k + 1}`).toBe(expected ? expected.label : null)
    })
  })

  it('⑤ 모든 리스너가 정확히 한 번 실행된다', () => {
    const firedLabels = steps.flatMap((s) => (s.state.fired ? [s.state.fired] : []))
    expect([...firedLabels].sort()).toEqual(listeners.map((l) => l.label).sort())
  })

  it('⑥ 출력은 fired 단계에서만 한 줄 늘고(icon의 끝 단계 제외) 새 줄이 공식과 같다', () => {
    let previous: string[] = []
    steps.forEach((step, k) => {
      const output = step.output!
      const { fired, path, eventPhase, node, target: t } = step.state
      const added = output.length - previous.length
      const isEnd = isIcon && k === steps.length - 1
      if (fired !== null) {
        expect(added, `단계 ${k + 1}: 한 줄 증가`).toBe(1)
        const expectedLine =
          fired === 'window 캡처' ? JSON.stringify(path) : `${fired} ${eventPhase} ${t} ${node}`
        expect(output.at(-1), `단계 ${k + 1}`).toBe(expectedLine)
      } else if (isEnd) {
        expect(added).toBe(1)
        expect(output.at(-1)).toBe('끝 0 null')
      } else {
        expect(added, `단계 ${k + 1}: 출력 변화 없음`).toBe(0)
      }
      previous = output
    })
    expect(previous).toEqual(example.expectedOutput)
  })

  it('⑦ 마지막 단계: icon은 디스패치 끝(32번 줄, node null, phase 0, target icon), button은 window 버블 방문이다', () => {
    const last = steps.at(-1)!
    if (isIcon) {
      expect(last.title).toBe('디스패치 끝')
      expect(last.line).toEqual({ from: 32, to: 32 })
      expect(last.state).toMatchObject({
        pass: null,
        node: null,
        eventPhase: 0,
        target: 'icon',
        fired: null,
      })
      expect(last.output!.at(-1)).toBe('끝 0 null')
    } else {
      expect(last.state).toMatchObject({ pass: 'bubble', node: 'window', eventPhase: 3 })
      expect(last.output).toEqual(example.expectedOutput)
    }
  })
})
