import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { concept } from './meta'
import { scenarios } from './scenarios'

const dir = import.meta.dirname
const examplesDir = join(dir, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['next-frame', 'microtask-between', 'cancel'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '콜백 안에서 다시 등록',
      '콜백 사이의 마이크로태스크',
      'cancelAnimationFrame',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['next-frame', 'microtask-between', 'cancel'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 next-frame 18, microtask-between 16, cancel 17이다', () => {
    expect(scenarioOf('next-frame').steps).toHaveLength(18)
    expect(scenarioOf('microtask-between').steps).toHaveLength(16)
    expect(scenarioOf('cancel').steps).toHaveLength(17)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  'next-frame': {
    6: 'requestAnimationFrame(function (t1) {',
    7: "  console.log('raf1');",
    8: '  requestAnimationFrame(function (t3) {',
    9: "    console.log('raf3', t3 > t1);",
    10: '  });',
    11: '});',
    12: 'requestAnimationFrame(function () {',
    13: "  console.log('raf2');",
    14: '});',
    15: "console.log('스크립트 끝');",
    16: '</script>',
  },
  'microtask-between': {
    6: 'requestAnimationFrame(function () {',
    7: "  console.log('raf1');",
    8: '  Promise.resolve().then(function () {',
    9: "    console.log('then');",
    10: '  });',
    11: '});',
    12: 'requestAnimationFrame(function () {',
    13: "  console.log('raf2');",
    14: '});',
    15: "console.log('스크립트 끝');",
    16: '</script>',
  },
  cancel: {
    6: 'var a = requestAnimationFrame(function () {',
    7: "  console.log('A');",
    8: '});',
    9: 'cancelAnimationFrame(a);',
    10: 'var c;',
    11: 'requestAnimationFrame(function () {',
    12: "  console.log('B');",
    13: '  cancelAnimationFrame(c);',
    14: '});',
    15: 'c = requestAnimationFrame(function () {',
    16: "  console.log('C');",
    17: '});',
    18: 'requestAnimationFrame(function () {',
    19: "  console.log('D');",
    20: '});',
    21: '</script>',
  },
}

// 출력 줄을 찍는 console.log 원문(기본은 console.log('<출력>'))
const LOG_SNIPPET: Record<string, string> = { 'raf3 true': "console.log('raf3', t3 > t1)" }

// 콜백 이름 → handle (등록 순서로 1부터)
const HANDLE_OF: Record<string, Record<string, number>> = {
  'next-frame': { 'raf1 콜백': 1, 'raf2 콜백': 2, 'raf3 콜백': 3 },
  'microtask-between': { 'raf1 콜백': 1, 'raf2 콜백': 2 },
  cancel: { 'A 콜백': 1, 'B 콜백': 2, 'C 콜백': 3, 'D 콜백': 4 },
}

const isFrameTask = (task: string | null) => task !== null && task.startsWith('렌더링 갱신')

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps
  const handleOf = HANDLE_OF[scenario.id]

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('첫 단계는 스크립트 태스크 시작이고 모든 칸이 비어 있으며 출력이 비어 있다', () => {
    expect(steps[0].title).toBe('스크립트 태스크 시작')
    expect(steps[0].state).toEqual({
      stack: ['전역 코드'],
      callbacks: [],
      frameHandles: null,
      current: null,
      microtasks: [],
      task: '스크립트',
      frameTime: null,
      checkpoint: false,
    })
    expect(steps[0].output).toEqual([])
  })

  it('마지막 단계는 모든 칸이 비고 출력이 expectedOutput이다', () => {
    const last = steps.at(-1)!
    expect(last.state).toEqual({
      stack: [],
      callbacks: [],
      frameHandles: null,
      current: null,
      microtasks: [],
      task: null,
      frameTime: null,
      checkpoint: false,
    })
    expect(last.output).toEqual(example.expectedOutput)
  })

  it('새 출력 줄이 생긴 단계의 line 범위 안에 그 출력을 찍는 console.log가 있다', () => {
    const lines = source().split('\n')
    let previous: string[] = []
    steps.forEach((step, k) => {
      const output = step.output!
      const added = output.slice(previous.length)
      expect(added.length, `단계 ${k + 1}: 한 단계에 한 줄까지`).toBeLessThanOrEqual(1)
      for (const text of added) {
        const { from, to } = step.line!
        const snippet = LOG_SNIPPET[text] ?? `console.log('${text}')`
        const found = lines.slice(from - 1, to).some((l) => l.includes(snippet))
        expect(found, `단계 ${k + 1}: ${text}`).toBe(true)
      }
      previous = output
    })
  })

  it('(a) 콜백이 스택에 있는 단계에서 그 handle은 current이고 frameHandles에 있으며 callbacks에는 없다', () => {
    let seen = 0
    steps.forEach((step, k) => {
      const { stack, callbacks, frameHandles, current } = step.state
      const names = stack.filter((n) => n in handleOf)
      expect(names.length, `단계 ${k + 1}: rAF 콜백은 동시에 하나만`).toBeLessThanOrEqual(1)
      for (const name of names) {
        seen += 1
        const handle = handleOf[name]
        expect(current, `단계 ${k + 1}`).toBe(handle)
        expect(frameHandles, `단계 ${k + 1}`).toContain(handle)
        expect(
          callbacks.some((c) => c.handle === handle),
          `단계 ${k + 1}: 실행 중인 handle이 맵에 남아 있음`,
        ).toBe(false)
      }
      // current는 항상 이번 목록 안의 값이다
      if (current !== null) {
        expect(frameHandles, `단계 ${k + 1}: current`).toContain(current)
      }
      // 맵의 콜백 이름은 등록한 handle과 짝이 맞는다
      for (const c of callbacks) expect(handleOf[c.name], `단계 ${k + 1}: ${c.name}`).toBe(c.handle)
    })
    expect(seen).toBeGreaterThan(0)
  })

  it('(b) current가 바뀔 때: 맵에 있던 handle이면 그 콜백을 호출하며 맵에서 지우고, 맵에 없으면 스택이 빈 채 건너뛴다. 목록 순서대로 나아간다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const { stack, callbacks, frameHandles, current } = step.state
      if (current === prev.current || current === null) return
      const where = `단계 ${k + 1}`
      const list = frameHandles!
      const prevIndex = prev.current === null ? -1 : list.indexOf(prev.current)
      expect(list.indexOf(current), `${where}: 목록 순서`).toBe(prevIndex + 1)
      const wasInMap = prev.callbacks.some((c) => c.handle === current)
      if (wasInMap) {
        expect(
          stack.map((n) => handleOf[n]),
          `${where}: 호출`,
        ).toEqual([current])
        expect(
          callbacks.some((c) => c.handle === current),
          `${where}: 호출 전에 맵에서 지움`,
        ).toBe(false)
      } else {
        expect(stack, `${where}: 건너뜀`).toEqual([])
      }
    })
  })

  it('(c) 프레임 중 새로 등록한 handle은 맵에만 있고 목록에 없으며, handle은 지금까지 쓴 최대값 + 1이다', () => {
    let maxSeen = 0
    steps.forEach((step, k) => {
      const prev = k > 0 ? steps[k - 1].state : undefined
      const { callbacks, frameHandles, current } = step.state
      for (const c of callbacks) {
        const isNew = !prev || !prev.callbacks.some((p) => p.handle === c.handle)
        // 이전 단계에서 실행·취소로 사라진 적이 있는 handle은 다시 나타나지 않는다
        if (isNew && c.handle <= maxSeen)
          throw new Error(`단계 ${k + 1}: handle ${c.handle} 재사용`)
        if (isNew) {
          expect(c.handle, `단계 ${k + 1}: 새 handle`).toBe(maxSeen + 1)
          if (frameHandles !== null) {
            expect(frameHandles, `단계 ${k + 1}: 새 handle은 목록에 없다`).not.toContain(c.handle)
          }
          maxSeen = c.handle
        }
      }
      // 목록에도 있고 맵에도 있는 handle은 아직 처리 차례가 오지 않은 것이다
      if (frameHandles !== null && current !== null) {
        for (const c of callbacks) {
          if (frameHandles.includes(c.handle)) {
            expect(c.handle, `단계 ${k + 1}`).toBeGreaterThan(current)
          }
        }
      }
      // 같은 프레임 안에서 목록은 바뀌지 않는다
      if (prev && prev.frameHandles !== null && frameHandles !== null) {
        expect(frameHandles, `단계 ${k + 1}: 목록 고정`).toEqual(prev.frameHandles)
      }
    })
  })

  it('(d) 콜백이 새로 시작될 때 마이크로태스크 큐는 비어 있다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const started = step.state.stack.some((n) => n in handleOf && !prev.stack.includes(n))
      if (started) expect(step.state.microtasks, `단계 ${k + 1}`).toEqual([])
    })
  })

  it('(e) frameTime은 렌더링 갱신 중에만 있고 같은 프레임 안에서 바뀌지 않으며 목록도 그때만 있다', () => {
    steps.forEach((step, k) => {
      const { task, frameTime, frameHandles, current, checkpoint } = step.state
      const where = `단계 ${k + 1}`
      if (isFrameTask(task)) {
        expect(frameTime, where).toBe(task === '렌더링 갱신 (프레임 1)' ? 'T1' : 'T2')
        expect(frameHandles, where).not.toBeNull()
      } else {
        expect(frameTime, where).toBeNull()
        expect(frameHandles, where).toBeNull()
        expect(current, where).toBeNull()
      }
      if (task === null) {
        expect(step.state.stack, where).toEqual([])
        expect(checkpoint, where).toBe(false)
      }
    })
  })

  it('(f) 렌더링 갱신 태스크의 첫 단계에서 handle 목록은 그 시점 콜백 맵의 handle 순서와 같다', () => {
    steps.forEach((step, k) => {
      if (!isFrameTask(step.state.task)) return
      if (k > 0 && isFrameTask(steps[k - 1].state.task)) return
      expect(step.state.frameHandles, `단계 ${k + 1}`).toEqual(
        step.state.callbacks.map((c) => c.handle),
      )
    })
  })

  it('(g) 렌더링 갱신 태스크의 마지막 단계에서 current는 목록의 마지막 handle이다(목록을 끝까지 처리했다)', () => {
    steps.forEach((step, k) => {
      if (!isFrameTask(step.state.task)) return
      const next = steps[k + 1]
      if (next && isFrameTask(next.state.task)) return
      const handles = step.state.frameHandles!
      expect(step.state.current, `단계 ${k + 1}`).toBe(handles[handles.length - 1])
    })
  })

  it('마이크로태스크 체크포인트: 스택이 빈 채 시작하고 그동안 스택에는 큐 맨 앞에서 빠진 것만 오르며, 체크포인트 밖에서는 스택이 빈 채 큐가 차 있지 않다', () => {
    steps.forEach((step, k) => {
      const { stack, microtasks, checkpoint } = step.state
      const prev = k > 0 ? steps[k - 1].state : undefined
      const where = `단계 ${k + 1}`
      if (!checkpoint) {
        if (stack.length === 0) expect(microtasks, `${where}: 스택이 빈 채 큐가 참`).toEqual([])
        return
      }
      if (!prev?.checkpoint) {
        expect(stack, `${where}: 체크포인트 시작`).toEqual([])
        expect(microtasks.length, `${where}: 체크포인트 시작`).toBeGreaterThan(0)
        expect(prev!.stack.length, `${where}: 앞 콜백이 끝난 직후`).toBe(1)
        return
      }
      if (stack.join() !== prev.stack.join()) {
        expect(stack, where).toEqual([prev.microtasks[0]])
        expect(microtasks, where).toEqual(prev.microtasks.slice(1))
      }
    })
  })

  it('렌더링 갱신 태스크가 시작되는 단계의 설명은 "그림을 위해 고른 순간"임을 밝힌다', () => {
    let count = 0
    steps.forEach((step, k) => {
      if (k === 0) return
      if (isFrameTask(step.state.task) && !isFrameTask(steps[k - 1].state.task)) {
        count += 1
        expect(step.explanation, `단계 ${k + 1}`).toContain('그림을 위해 고른 것')
        expect(step.explanation, `단계 ${k + 1}`).toContain(
          '보장되는 것은 그림에 나온 콜백의 실행 순서입니다',
        )
      }
    })
    expect(count).toBeGreaterThan(0)
  })

  it('설명에 쓰지 않기로 한 용어가 없다', () => {
    for (const step of steps) {
      expect(step.explanation).not.toMatch(/복사|공유|우선순위|매크로태스크/)
    }
  })
})

describe('시나리오별 개념 불변식', () => {
  it('next-frame: raf3은 맵에만 있다가 두 번째 프레임(T2)에서 실행되고, 첫 프레임의 목록은 [1, 2]이다', () => {
    const { steps } = scenarioOf('next-frame')
    const frame1 = steps.filter((s) => s.state.task === '렌더링 갱신 (프레임 1)')
    const frame2 = steps.filter((s) => s.state.task === '렌더링 갱신 (프레임 2)')
    expect(frame1.length).toBeGreaterThan(0)
    expect(frame2.length).toBeGreaterThan(0)
    expect(frame1.every((s) => s.state.frameHandles!.join() === '1,2')).toBe(true)
    expect(frame2.every((s) => s.state.frameHandles!.join() === '3')).toBe(true)
    expect(frame1.some((s) => s.state.stack.includes('raf3 콜백'))).toBe(false)
    const ran = steps.filter((s) => s.state.stack.includes('raf3 콜백'))
    expect(ran.length).toBeGreaterThan(0)
    expect(ran.every((s) => s.state.frameTime === 'T2')).toBe(true)
    // raf3은 등록된 뒤 프레임 1이 끝날 때까지 맵에 남는다
    const registered = steps.findIndex((s) => s.state.callbacks.some((c) => c.handle === 3))
    expect(steps[registered].state.task).toBe('렌더링 갱신 (프레임 1)')
    expect(steps[registered].state.stack).toEqual(['raf1 콜백'])
    // 실행 순서: raf1, raf2, raf3
    const order = steps
      .filter((s) => s.state.stack.length === 1 && s.state.stack[0] in HANDLE_OF['next-frame'])
      .map((s) => s.state.stack[0])
    expect([...new Set(order)]).toEqual(['raf1 콜백', 'raf2 콜백', 'raf3 콜백'])
  })

  it('microtask-between: then 콜백은 raf1 콜백이 끝난 뒤, raf2 콜백이 시작하기 전의 체크포인트에서 실행된다', () => {
    const { steps } = scenarioOf('microtask-between')
    const idx = (pred: (s: (typeof steps)[number]) => boolean) => steps.findIndex(pred)
    const raf1 = idx((s) => s.state.stack[0] === 'raf1 콜백')
    const then = idx((s) => s.state.stack[0] === 'then 콜백')
    const raf2 = idx((s) => s.state.stack[0] === 'raf2 콜백')
    expect(raf1).toBeGreaterThanOrEqual(0)
    expect(raf1).toBeLessThan(then)
    expect(then).toBeLessThan(raf2)
    expect(steps[then].state.checkpoint).toBe(true)
    expect(steps[then].state.stack).toEqual(['then 콜백'])
    // 체크포인트 동안 목록·current는 그대로이고 raf2 handle은 아직 맵에 있다
    expect(steps[then].state.callbacks.map((c) => c.handle)).toEqual([2])
    expect(steps[then].state.current).toBe(1)
    // raf1 콜백이 실행되는 동안에는 체크포인트가 없다
    expect(
      steps.filter((s) => s.state.stack[0] === 'raf1 콜백').every((s) => !s.state.checkpoint),
    ).toBe(true)
  })

  it('cancel: A와 C 콜백은 스택에 오르지 않고, handle 3은 목록에 남아 건너뛰며, 취소는 맵에서만 지운다', () => {
    const { steps } = scenarioOf('cancel')
    expect(steps.some((s) => s.state.stack.some((n) => n === 'A 콜백' || n === 'C 콜백'))).toBe(
      false,
    )
    // A는 스크립트 안에서 취소되어 프레임이 시작되기 전에 맵에서 사라진다
    const frameStart = steps.findIndex((s) => s.state.frameHandles !== null)
    expect(steps[frameStart].state.frameHandles).toEqual([2, 3, 4])
    expect(steps[frameStart - 1].state.callbacks.some((c) => c.handle === 1)).toBe(false)
    // 프레임 중 취소: B 콜백이 실행되는 단계에서 맵에서는 3이 사라지지만 목록은 그대로다
    const cancelC = steps.findIndex(
      (s) => s.state.stack[0] === 'B 콜백' && !s.state.callbacks.some((c) => c.handle === 3),
    )
    expect(cancelC).toBeGreaterThan(frameStart)
    expect(steps[cancelC].state.frameHandles).toEqual([2, 3, 4])
    // 건너뜀 단계는 정확히 하나이고 handle 3이다
    const skips = steps.filter((s, i) => {
      if (i === 0) return false
      const prev = steps[i - 1].state
      return (
        s.state.current !== null && s.state.current !== prev.current && s.state.stack.length === 0
      )
    })
    expect(skips).toHaveLength(1)
    expect(skips[0].state.current).toBe(3)
    expect(skips[0].state.callbacks.some((c) => c.handle === 3)).toBe(false)
  })
})

// content.mdx의 PredictQuiz를 읽어 정답 선택지가 예제의 expectedOutput을 ' / '로 이은 문자열과 같은지 검사한다.
describe('퀴즈 정답', () => {
  const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
    const body = m[1]
    const question = body.match(/question="([^"]*)"/)![1]
    const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
    const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
    const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
    const example = Number(question.match(/예제 (\d+)/)![1])
    return { choices, answer, example }
  })
  const files = exampleFilesByNumber(mdx)

  it('예제 번호가 1~7이고 meta.examples도 7개다', () => {
    expect([...files.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(quizzes.map((q) => q.example)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(concept.examples).toHaveLength(7)
  })

  it.each([1, 2, 3, 4, 5, 6, 7])(
    '예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다',
    (n) => {
      const file = files.get(n)!
      const example = concept.examples.find((e) => e.file === file)
      expect(example, `${file}이 meta.examples에 없습니다`).toBeDefined()
      const quiz = quizzes.find((q) => q.example === n)!
      const expected = example!.expectedOutput.join(' / ')
      expect(quiz.choices[quiz.answer]).toBe(expected)
      expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
      expect(quiz.choices.filter((c) => c === expected)).toHaveLength(1)
    },
  )

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

describe('메타 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 441이고 category는 async다', () => {
    expect(concept.order).toBe(441)
    expect(concept.category).toBe('async')
  })

  it('예제는 모두 browser 런타임이고 animation-loop만 settleMs 1000이다', () => {
    expect(concept.examples.every((e) => e.runtime === 'browser')).toBe(true)
    const settle = concept.examples.filter((e) => 'settleMs' in e).map((e) => e.id)
    expect(settle).toEqual(['animation-loop'])
  })

  it('본문에 "복사해서"·"공유해서" 표현이 없다', () => {
    expect(mdx).not.toMatch(/복사해서|공유해서/)
  })
})
