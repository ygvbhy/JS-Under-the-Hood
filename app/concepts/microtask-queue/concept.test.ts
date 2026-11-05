import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['basic', 'nested', 'click', 'message'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '동기 코드, 마이크로태스크, 타이머',
      '체크포인트는 큐가 빌 때까지',
      'click()의 리스너',
      'message 이벤트의 리스너',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual([
      'basic',
      'nested',
      'click-listeners',
      'message-listeners',
    ])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 basic 16, nested 15, click 14, message 16이다', () => {
    expect(scenarios[0].steps).toHaveLength(16)
    expect(scenarios[1].steps).toHaveLength(15)
    expect(scenarios[2].steps).toHaveLength(14)
    expect(scenarios[3].steps).toHaveLength(16)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  basic: {
    6: "console.log('스크립트 시작');",
    7: 'setTimeout(function () {',
    8: "  console.log('타이머 0ms');",
    9: '}, 0);',
    10: 'Promise.resolve().then(function () {',
    11: "  console.log('then 1');",
    12: '});',
    13: 'queueMicrotask(function () {',
    14: "  console.log('queueMicrotask');",
    15: '});',
    16: 'Promise.resolve().then(function () {',
    17: "  console.log('then 2');",
    18: '});',
    19: "console.log('스크립트 끝');",
    20: '</script>',
  },
  nested: {
    6: 'setTimeout(function () {',
    7: "  console.log('타이머 0ms');",
    8: '}, 0);',
    9: 'queueMicrotask(function () {',
    10: "  console.log('m1');",
    11: '  queueMicrotask(function () {',
    12: "    console.log('m2');",
    13: '    queueMicrotask(function () {',
    14: "      console.log('m3');",
    15: '    });',
    16: '  });',
    17: '});',
    18: "console.log('스크립트 끝');",
    19: '</script>',
  },
  click: {
    7: "var save = document.getElementById('save');",
    8: "save.addEventListener('click', function () {",
    9: "  console.log('리스너 1');",
    10: '  queueMicrotask(function () {',
    11: "    console.log('마이크로태스크 1');",
    12: '  });',
    13: '});',
    14: "save.addEventListener('click', function () {",
    15: "  console.log('리스너 2');",
    16: '  queueMicrotask(function () {',
    17: "    console.log('마이크로태스크 2');",
    18: '  });',
    19: '});',
    20: 'save.click();',
    21: "console.log('click() 뒤');",
    22: '</script>',
  },
  message: {
    6: "window.addEventListener('message', function () {",
    7: "  console.log('리스너 1');",
    8: '  queueMicrotask(function () {',
    9: "    console.log('마이크로태스크 1');",
    10: '  });',
    11: '});',
    12: "window.addEventListener('message', function () {",
    13: "  console.log('리스너 2');",
    14: '  queueMicrotask(function () {',
    15: "    console.log('마이크로태스크 2');",
    16: '  });',
    17: '});',
    18: "window.postMessage('m', '*');",
    19: "console.log('스크립트 끝');",
    20: '</script>',
  },
}

// 태스크의 첫 프레임 후보: 스크립트는 전역 코드, 타이머는 콜백 이름, message 이벤트는 리스너
const FIRST_FRAMES: Record<string, string[]> = {
  스크립트: ['전역 코드'],
  '타이머 콜백': ['타이머 콜백'],
  'message 이벤트': ['리스너 1', '리스너 2'],
}

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps
  // 이 시나리오에서 마이크로태스크 큐에 들어간 적 있는 모든 이름
  const microtaskNames = new Set(steps.flatMap((s) => s.state.microtasks))

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('첫 단계는 스크립트 태스크 시작이고 출력이 비어 있다', () => {
    expect(steps[0].title).toBe('스크립트 태스크 시작')
    expect(steps[0].state).toEqual({
      stack: ['전역 코드'],
      waiting: [],
      tasks: [],
      microtasks: [],
      task: '스크립트',
      checkpoint: false,
    })
    expect(steps[0].output).toEqual([])
  })

  it('① 이름은 스택·대기·태스크 큐·마이크로태스크 큐 중 두 곳에 동시에 있지 않다', () => {
    steps.forEach((step, k) => {
      const { stack, waiting, tasks, microtasks } = step.state
      const all = [...stack, ...waiting, ...tasks, ...microtasks].filter((n) => n !== '전역 코드')
      expect(new Set(all).size, `단계 ${k + 1}`).toBe(all.length)
    })
  })

  it('② 태스크가 null에서 X로 바뀌면 직전 태스크 큐의 맨 앞이 X이고 직전 마이크로태스크 큐는 비어 있다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const { task, tasks } = step.state
      if (prev.task === null && task !== null) {
        expect(prev.tasks[0], `단계 ${k + 1}`).toBe(task)
        expect(tasks, `단계 ${k + 1}`).toEqual(prev.tasks.slice(1))
        expect(prev.microtasks, `단계 ${k + 1}: 마이크로태스크가 남은 채 태스크를 꺼냄`).toEqual([])
      }
    })
  })

  it('③ task가 null이면 스택이 비었고, 있으면 스택이 비었거나 stack[0]이 첫 프레임(체크포인트 중에는 마이크로태스크 콜백)이다', () => {
    steps.forEach((step, k) => {
      const { task, stack, checkpoint } = step.state
      if (task === null) {
        expect(stack, `단계 ${k + 1}`).toEqual([])
        expect(checkpoint, `단계 ${k + 1}: 태스크 밖에서 체크포인트`).toBe(false)
        return
      }
      if (stack.length === 0) return
      if (checkpoint) expect(microtaskNames.has(stack[0]), `단계 ${k + 1}`).toBe(true)
      else expect(FIRST_FRAMES[task], `단계 ${k + 1}`).toContain(stack[0])
    })
  })

  it('④ 체크포인트는 스택이 빈 채 시작하고, 그 동안 스택에는 큐 맨 앞에서 빠진 마이크로태스크 콜백만 오르며, 큐가 비면 끝난다', () => {
    steps.forEach((step, k) => {
      const { stack, microtasks, checkpoint } = step.state
      const prev = k > 0 ? steps[k - 1].state : undefined
      const where = `단계 ${k + 1}`
      if (!checkpoint) {
        // 체크포인트 밖에서는 마이크로태스크 콜백 프레임이 없다
        expect(
          stack.some((f) => microtaskNames.has(f)),
          where,
        ).toBe(false)
        if (prev?.checkpoint) {
          expect(stack, `${where}: 체크포인트 끝`).toEqual([])
          expect(microtasks, `${where}: 체크포인트 끝`).toEqual([])
        }
        return
      }
      if (!prev?.checkpoint) {
        // false → true: 스택이 비어 있고 처리할 마이크로태스크가 있다
        expect(stack, `${where}: 체크포인트 시작`).toEqual([])
        expect(microtasks.length, `${where}: 체크포인트 시작`).toBeGreaterThan(0)
        return
      }
      // 체크포인트 도중: 프레임이 바뀌면 직전 큐 맨 앞이 올라온 것이다
      if (stack.join() !== prev.stack.join()) {
        expect(stack, where).toEqual([prev.microtasks[0]])
        expect(microtasks, where).toEqual(prev.microtasks.slice(1))
      }
      expect(stack.length, where).toBeLessThanOrEqual(1)
      expect(
        stack.every((f) => microtaskNames.has(f)),
        where,
      ).toBe(true)
    })
  })

  it('⑤ 마이크로태스크 큐와 태스크 큐는 앞에서만 빠지고 새 이름은 뒤에 붙으며, 태스크 큐 새 이름은 대기 중이던 타이머거나 postMessage 단계의 message 이벤트다', () => {
    const lines = source().split('\n')
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const where = `단계 ${k + 1}`
      for (const key of ['microtasks', 'tasks'] as const) {
        const before = prev[key]
        const after = step.state[key]
        // 맨 앞에서 0개 또는 1개가 빠지고 나머지 순서는 유지된다
        const drop = before.length > 0 && after[0] !== before[0] ? 1 : 0
        const kept = before.slice(drop)
        expect(after.slice(0, kept.length), `${where}: ${key} 기존 순서`).toEqual(kept)
        for (const n of after.slice(kept.length)) {
          expect(before, `${where}: ${key} 새 이름 ${n}`).not.toContain(n)
        }
      }
      const addedTasks = step.state.tasks.filter((n) => !prev.tasks.includes(n))
      for (const n of addedTasks) {
        if (n === 'message 이벤트') {
          const { from, to } = step.line!
          expect(lines.slice(from - 1, to).join('\n'), `${where}: ${n}`).toContain('postMessage')
        } else {
          expect(prev.waiting, `${where}: ${n}`).toContain(n)
          expect(step.state.waiting, `${where}: ${n}`).not.toContain(n)
        }
      }
    })
  })

  it('⑥ 새 출력 줄이 생긴 단계의 line 범위 안에 그 출력을 찍는 console.log가 있다', () => {
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

  it('⑦ 마지막 단계는 모든 칸이 비고 task가 null·checkpoint가 false이며 출력이 expectedOutput이다', () => {
    const last = steps.at(-1)!
    expect(last.state).toEqual({
      stack: [],
      waiting: [],
      tasks: [],
      microtasks: [],
      task: null,
      checkpoint: false,
    })
    expect(last.output).toEqual(example.expectedOutput)
  })

  it('⑦ 타이머를 태스크 큐로 옮기는 단계의 설명은 "그림을 위해 고른 순간"임을 밝힌다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      if (step.state.tasks.some((n) => !prev.tasks.includes(n) && prev.waiting.includes(n))) {
        expect(step.explanation, `단계 ${k + 1}`).toContain('그림을 위해 고른 것')
        expect(step.explanation, `단계 ${k + 1}`).toContain('보장되는 것은 실행 순서뿐')
      }
    })
  })

  it('설명에 쓰지 않기로 한 용어가 없다', () => {
    for (const step of steps) {
      expect(step.explanation).not.toMatch(/우선순위|매크로태스크/)
    }
  })
})

describe('시나리오별 개념 불변식', () => {
  it('basic: 스크립트 끝 출력이 then 1보다 앞이고 타이머 태스크는 체크포인트가 끝난 뒤에 실행된다', () => {
    const { steps } = scenarioOf('basic')
    const indexOfOutput = (text: string) => steps.findIndex((s) => s.output!.includes(text))
    expect(indexOfOutput('스크립트 끝')).toBeGreaterThanOrEqual(0)
    expect(indexOfOutput('스크립트 끝')).toBeLessThan(indexOfOutput('then 1'))
    const lastCheckpoint = steps.map((s) => s.state.checkpoint).lastIndexOf(true)
    const timerTask = steps.findIndex((s) => s.state.task === '타이머 콜백')
    expect(timerTask).toBeGreaterThan(lastCheckpoint)
    // 타이머 태스크를 꺼내는 단계 이전에는 마이크로태스크 큐가 비어 있다
    expect(steps[timerTask - 1].state.microtasks).toEqual([])
  })

  it('basic: 마이크로태스크는 큐에 넣은 순서(then 1, queueMicrotask, then 2)대로 실행된다', () => {
    const { steps } = scenarioOf('basic')
    const ran = steps.filter((s) => s.state.checkpoint && s.state.stack.length === 1)
    expect(ran.map((s) => s.state.stack[0])).toEqual([
      'then 1 콜백',
      'queueMicrotask 콜백',
      'then 2 콜백',
    ])
  })

  it('nested: m2·m3가 관련된 단계는 모두 같은 하나의 체크포인트 구간 안이다', () => {
    const { steps } = scenarioOf('nested')
    const flags = steps.map((s) => s.state.checkpoint)
    const first = flags.indexOf(true)
    const last = flags.lastIndexOf(true)
    expect(flags.slice(first, last + 1).every(Boolean)).toBe(true)
    const related = steps
      .map((s, i) => ({ s, i }))
      .filter(({ s }) =>
        [...s.state.stack, ...s.state.microtasks].some((n) => n === 'm2 콜백' || n === 'm3 콜백'),
      )
    expect(related.length).toBeGreaterThan(0)
    for (const { i } of related) {
      expect(i).toBeGreaterThanOrEqual(first)
      expect(i).toBeLessThanOrEqual(last)
    }
  })

  it('click: 리스너 단계의 스택은 [전역 코드, 리스너]이고 그동안 체크포인트가 없으며, 마이크로태스크 1 출력은 click() 뒤 다음이다', () => {
    const { steps } = scenarioOf('click')
    const listenerSteps = steps.filter((s) => s.state.stack.some((f) => f.startsWith('리스너')))
    expect(listenerSteps.length).toBeGreaterThan(0)
    for (const s of listenerSteps) {
      expect(s.state.stack).toHaveLength(2)
      expect(s.state.stack[0]).toBe('전역 코드')
      expect(s.state.checkpoint).toBe(false)
      expect(s.state.task).toBe('스크립트')
    }
    const indexOfOutput = (text: string) => steps.findIndex((s) => s.output!.includes(text))
    expect(indexOfOutput('click() 뒤')).toBeGreaterThanOrEqual(0)
    expect(indexOfOutput('click() 뒤')).toBeLessThan(indexOfOutput('마이크로태스크 1'))
    // 마이크로태스크 1 콜백이 큐에 들어간 뒤에도 전역 코드가 끝나기 전에는 체크포인트가 없다
    const firstCheckpoint = steps.findIndex((s) => s.state.checkpoint)
    expect(steps.slice(0, firstCheckpoint).every((s) => s.state.stack[0] === '전역 코드')).toBe(
      true,
    )
  })

  it('message: 리스너 1 단계의 스택은 [리스너 1](전역 코드 없음)이고 마이크로태스크 1 출력은 리스너 2 출력보다 앞이다', () => {
    const { steps } = scenarioOf('message')
    const listener1 = steps.filter((s) => s.state.stack.includes('리스너 1'))
    expect(listener1.length).toBeGreaterThan(0)
    for (const s of listener1) expect(s.state.stack).toEqual(['리스너 1'])
    const indexOfOutput = (text: string) => steps.findIndex((s) => s.output!.includes(text))
    expect(indexOfOutput('마이크로태스크 1')).toBeGreaterThanOrEqual(0)
    expect(indexOfOutput('마이크로태스크 1')).toBeLessThan(indexOfOutput('리스너 2'))
    // 리스너 1 → 체크포인트 → 리스너 2 → 체크포인트: 체크포인트 구간이 두 번 있다
    const starts = steps.filter((s, i) => s.state.checkpoint && !steps[i - 1].state.checkpoint)
    expect(starts).toHaveLength(2)
    // 스크립트 태스크 안에서는 체크포인트가 없다(큐가 비어 있어 그리지 않는다)
    expect(steps.filter((s) => s.state.task === '스크립트').every((s) => !s.state.checkpoint)).toBe(
      true,
    )
  })
})
