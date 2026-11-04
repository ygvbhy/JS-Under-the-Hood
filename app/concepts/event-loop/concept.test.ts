import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['sync', 'nested', 'click'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '동기 코드와 타이머',
      '콜백 안에서 예약',
      'click()은 그 자리에서',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['sync-and-timers', 'nested', 'click-sync'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 sync 12, nested 15, click 12이다', () => {
    expect(scenarios[0].steps).toHaveLength(12)
    expect(scenarios[1].steps).toHaveLength(15)
    expect(scenarios[2].steps).toHaveLength(12)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  sync: {
    8: "console.log('스크립트 시작');",
    9: 'setTimeout(function () {',
    10: "  console.log('a 0ms');",
    11: '}, 0);',
    12: 'setTimeout(function () {',
    13: "  console.log('b 10ms');",
    14: '}, 10);',
    15: 'var start = performance.now();',
    16: 'while (performance.now() - start < 50) {}',
    17: "console.log('스크립트 끝');",
  },
  nested: {
    8: 'setTimeout(function () {',
    9: "  console.log('a 시작');",
    10: '  setTimeout(function () {',
    11: "    console.log('c');",
    12: '  }, 0);',
    13: "  console.log('a 끝');",
    14: '}, 0);',
    15: 'setTimeout(function () {',
    16: "  console.log('b');",
    17: '}, 0);',
    18: "console.log('스크립트 끝');",
  },
  click: {
    9: "var save = document.getElementById('save');",
    10: "save.addEventListener('click', function () {",
    11: "  console.log('click 리스너');",
    12: '});',
    13: 'setTimeout(function () {',
    14: "  console.log('타이머 0ms');",
    15: '}, 0);',
    16: "console.log('click() 전');",
    17: 'save.click();',
    18: "console.log('click() 뒤');",
  },
}

// 태스크의 첫 프레임 이름: '스크립트' 태스크는 전역 코드, 콜백 태스크는 콜백 이름
const frameOf = (task: string) => (task === '스크립트' ? '전역 코드' : task)

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('① 이름은 콜 스택·대기·큐 중 두 곳에 동시에 있지 않다(스택 안의 같은 이름 중복도 없다)', () => {
    steps.forEach((step, k) => {
      const { stack, waiting, queue } = step.state
      const all = [...stack, ...waiting, ...queue].filter((n) => n !== '전역 코드')
      expect(new Set(all).size, `단계 ${k + 1}`).toBe(all.length)
    })
  })

  it('② 태스크가 null에서 X로 바뀌면 직전 큐의 맨 앞이 X이고 이번 큐에서 빠진다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const { task, queue } = step.state
      if (prev.task === null && task !== null) {
        expect(prev.queue[0], `단계 ${k + 1}`).toBe(task)
        expect(queue, `단계 ${k + 1}`).toEqual(prev.queue.slice(1))
      }
    })
  })

  it('③ task가 있으면 stack[0]이 그 프레임이고, task가 null이면 stack이 비었다', () => {
    steps.forEach((step, k) => {
      const { task, stack } = step.state
      if (task === null) expect(stack, `단계 ${k + 1}`).toEqual([])
      else expect(stack[0], `단계 ${k + 1}`).toBe(frameOf(task))
    })
  })

  it('④ 큐에 새로 들어간 이름은 직전 단계에서 대기 중이었고, 큐 안의 순서는 바뀌지 않는다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const { queue } = step.state
      const added = queue.filter((n) => !prev.queue.includes(n))
      for (const n of added) expect(prev.waiting, `단계 ${k + 1}: ${n}`).toContain(n)
      // 앞 단계에 있던 이름은 같은 상대 순서로 남고(맨 앞은 빠질 수 있다), 새 이름은 뒤에 붙는다
      const kept = queue.filter((n) => prev.queue.includes(n))
      expect(kept, `단계 ${k + 1}: 기존 큐 순서`).toEqual(
        prev.queue.filter((n) => kept.includes(n)),
      )
      expect(queue.slice(0, kept.length), `단계 ${k + 1}: 새 이름은 뒤에`).toEqual(kept)
    })
  })

  it('⑤ 새 출력 줄이 생긴 단계의 line 범위 안에 그 출력을 찍는 console.log가 있다', () => {
    const lines = source().split('\n')
    let previous: string[] = []
    steps.forEach((step, k) => {
      const output = step.output!
      const added = output.slice(previous.length)
      expect(added.length, `단계 ${k + 1}: 한 단계에 한 줄까지`).toBeLessThanOrEqual(1)
      for (const text of added) {
        const { from, to } = step.line!
        const found = lines.slice(from - 1, to).some((l) => l.includes(`console.log('${text}')`))
        expect(found, `단계 ${k + 1}: ${text}`).toBe(true)
      }
      previous = output
    })
  })

  it('⑥ 마지막 단계는 스택·대기·큐가 비고 task가 null이며 출력이 예제의 expectedOutput이다', () => {
    const last = steps.at(-1)!
    expect(last.state).toEqual({ stack: [], waiting: [], queue: [], task: null })
    expect(last.output).toEqual(example.expectedOutput)
  })

  it('첫 단계는 스크립트 태스크 시작이고 출력이 비어 있다', () => {
    expect(steps[0].title).toBe('스크립트 태스크 시작')
    expect(steps[0].state).toEqual({
      stack: ['전역 코드'],
      waiting: [],
      queue: [],
      task: '스크립트',
    })
    expect(steps[0].output).toEqual([])
  })

  it('⑦ 큐로 옮기는 단계의 설명은 "그림을 위해 고른 순간"임을 밝힌다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      if (step.state.queue.some((n) => !prev.queue.includes(n))) {
        expect(step.explanation, `단계 ${k + 1}`).toContain('그림을 위해 고른 것')
        expect(step.explanation, `단계 ${k + 1}`).toContain('보장되는 것은 실행 순서뿐')
      }
    })
  })
})

describe('시나리오별 개념 불변식', () => {
  it('⑧ nested: c는 a 콜백이 실행되는 동안 등록되어 b 뒤에 선다', () => {
    const steps = scenarios.find((s) => s.id === 'nested')!.steps
    const registered = steps.findIndex((s) => s.state.waiting.includes('c 콜백'))
    expect(steps[registered].state.task).toBe('a 콜백')
    expect(steps[registered].state.queue).toEqual(['b 콜백'])
    const queued = steps.find((s) => s.state.queue.includes('c 콜백'))!
    expect(queued.state.queue).toEqual(['b 콜백', 'c 콜백'])
  })

  it('⑧ click: 리스너는 전역 코드 위에 쌓이고 task는 스크립트로 유지되며 큐는 쓰이지 않는다', () => {
    const steps = scenarios.find((s) => s.id === 'click')!.steps
    const listenerSteps = steps.filter((s) => s.state.stack.includes('click 리스너'))
    expect(listenerSteps.length).toBeGreaterThan(0)
    for (const s of listenerSteps) {
      expect(s.state.stack).toEqual(['전역 코드', 'click 리스너'])
      expect(s.state.task).toBe('스크립트')
      expect(s.state.queue).toEqual([])
    }
    // 'click 리스너' 출력은 큐에 아무것도 들어가기 전에 나온다
    const printed = steps.findIndex((s) => s.output!.includes('click 리스너'))
    expect(steps.slice(0, printed + 1).every((s) => s.state.queue.length === 0)).toBe(true)
  })

  it('sync: 스크립트 태스크가 끝나기 전에는 어떤 콜백도 실행되지 않는다', () => {
    const steps = scenarios.find((s) => s.id === 'sync')!.steps
    const firstCallback = steps.findIndex((s) => s.state.task?.endsWith('콜백'))
    const scriptEnd = steps.findIndex((s) => s.state.task === null)
    expect(scriptEnd).toBeLessThan(firstCallback)
    expect(steps.slice(0, scriptEnd).every((s) => s.state.task === '스크립트')).toBe(true)
  })
})

describe('예제 출력 불변식', () => {
  it('예제 파일이 모두 있다', () => {
    for (const e of concept.examples) {
      expect(() => readExample(e.file), e.file).not.toThrow()
    }
  })

  it('task-sources: 타이머 1은 타이머 2보다 앞이다(표준이 보장하는 같은 소스 안의 순서만 단언)', () => {
    const out = exampleOf('task-sources').expectedOutput
    expect(out.indexOf('타이머 1')).toBeGreaterThanOrEqual(0)
    expect(out.indexOf('타이머 1')).toBeLessThan(out.indexOf('타이머 2'))
  })

  it('chunks: 다른 타이머는 조각 2보다 앞이다', () => {
    const out = exampleOf('chunks').expectedOutput
    expect(out.indexOf('다른 타이머')).toBeGreaterThanOrEqual(0)
    expect(out.indexOf('다른 타이머')).toBeLessThan(out.indexOf('조각 2'))
  })
})
