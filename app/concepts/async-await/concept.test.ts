import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format, inspect } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'
import type { AsyncState, CallStatus } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

const nextMacrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['basic', 'interleave'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '첫 await까지는 동기로',
      'await 뒤의 코드와 then 콜백',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['sync-until-await', 'interleave'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 basic 14, interleave 16이고 각각 20 이하다', () => {
    expect(scenarioOf('basic').steps).toHaveLength(14)
    expect(scenarioOf('interleave').steps).toHaveLength(16)
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  basic: {
    1: 'async function work() {',
    2: "  console.log('a1');",
    3: '  await null;',
    4: "  console.log('a2');",
    5: "  return 'done';",
    6: '}',
    7: 'var p = work();',
    8: "console.log('after call');",
    9: 'p.then(function (v) {',
    10: "  console.log('then ' + v);",
    11: '});',
  },
  interleave: {
    1: 'async function task() {',
    2: "  await 'not a promise';",
    3: "  console.log('task after await');",
    4: '}',
    5: 'task();',
    6: 'Promise.resolve()',
    7: '  .then(function () {',
    8: "    console.log('then 1');",
    9: '  })',
    10: '  .then(function () {',
    11: "    console.log('then 2');",
    12: '  });',
    13: "console.log('sync');",
  },
}

const TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  running: ['awaiting', 'completed'],
  awaiting: ['running'],
  completed: [],
}

const BODY_SUFFIX = ' 본문'
const isBodyFrame = (frame: string) => frame.endsWith(BODY_SUFFIX)
const bodyFrameOf = (callName: string) => callName.replace('()', '') + BODY_SUFFIX
// Job 이름 → 그 Job이 실행될 때 스택에 오르는 프레임 이름
const frameOfJob = (job: string) =>
  job.endsWith(' 재개') ? job.replace(' 재개', BODY_SUFFIX) : job

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

  it('첫 단계는 실행 시작이고 전역 코드만 스택에 있으며 나머지는 비어 있다', () => {
    expect(steps[0].title).toBe('실행 시작')
    expect(steps[0].state).toEqual({ stack: ['전역 코드'], calls: [], promises: [], jobs: [] })
    expect(steps[0].output).toEqual([])
  })

  it('마지막 단계는 스택과 Job 큐가 비어 있고 출력이 expectedOutput이며 호출은 모두 끝남이다', () => {
    const last = steps.at(-1)!
    expect(last.state.stack).toEqual([])
    expect(last.state.jobs).toEqual([])
    expect(last.output).toEqual(example.expectedOutput)
    for (const c of last.state.calls) expect(c.status, c.name).toBe('completed')
  })

  it('호출 상태 전이는 running ↔ awaiting → completed뿐이고 새 호출은 running으로 생기며 사라지지 않는다', () => {
    steps.forEach((step, k) => {
      const prev = k > 0 ? steps[k - 1].state.calls : []
      for (const c of step.state.calls) {
        const before = prev.find((p) => p.name === c.name)
        const where = `단계 ${k + 1}: ${c.name}`
        if (!before) {
          expect(c.status, where).toBe('running')
          continue
        }
        if (before.status === c.status) continue
        expect(TRANSITIONS[before.status], `${where} ${before.status} → ${c.status}`).toContain(
          c.status,
        )
      }
      for (const p of prev) {
        expect(
          step.state.calls.some((c) => c.name === p.name),
          `단계 ${k + 1}: ${p.name}가 사라짐`,
        ).toBe(true)
      }
    })
  })

  it('running인 호출은 하나 이하이고 스택 맨 위가 그 본문이며, 없으면 스택에 본문 프레임이 없다', () => {
    steps.forEach((step, k) => {
      const { stack, calls } = step.state
      const where = `단계 ${k + 1}`
      const running = calls.filter((c) => c.status === 'running')
      expect(running.length, `${where}: 동시에 running은 하나`).toBeLessThanOrEqual(1)
      const bodies = stack.filter(isBodyFrame)
      if (running.length === 0) {
        expect(bodies, `${where}: running이 없는데 본문 프레임이 있음`).toEqual([])
      } else {
        expect(bodies, where).toEqual([bodyFrameOf(running[0].name)])
        expect(stack.at(-1), `${where}: 맨 위가 실행 중인 본문`).toBe(bodyFrameOf(running[0].name))
      }
    })
  })

  it('전역 코드는 스택 맨 아래에만 있고 한 번 사라지면 다시 오르지 않는다', () => {
    let gone = false
    steps.forEach((step, k) => {
      const { stack } = step.state
      const where = `단계 ${k + 1}`
      const idx = stack.indexOf('전역 코드')
      if (idx !== -1) {
        expect(idx, where).toBe(0)
        expect(gone, `${where}: 전역 코드가 끝난 뒤 다시 오름`).toBe(false)
      } else if (k > 0) {
        gone = true
      }
    })
  })

  it('Job 큐는 FIFO다: 앞에서만 꺼내고 뒤에만 넣으며, 꺼낸 Job은 스택에 오르고 전역 코드가 끝난 뒤에만 꺼낸다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      const cur = step.state
      const where = `단계 ${k + 1}`
      const keptAll =
        cur.jobs.length >= prev.jobs.length && prev.jobs.every((j, i) => cur.jobs[i] === j)
      const popped =
        prev.jobs.length > 0 &&
        cur.jobs.length >= prev.jobs.length - 1 &&
        prev.jobs.slice(1).every((j, i) => cur.jobs[i] === j)
      expect(keptAll || popped, `${where}: Job 큐가 FIFO가 아님 ${prev.jobs} → ${cur.jobs}`).toBe(
        true,
      )
      // 앞 Job을 꺼내는 단계(큐가 줄어드는 단계)
      if (!keptAll) {
        expect(prev.stack, `${where}: Job은 스택이 비었을 때만 꺼냄`).toEqual([])
        expect(cur.stack, `${where}: 꺼낸 Job의 프레임이 스택에 오름`).toEqual([
          frameOfJob(prev.jobs[0]),
        ])
      }
      // 한 단계에 Job은 많아야 하나만 꺼낸다
      expect(cur.jobs.length, where).toBeGreaterThanOrEqual(prev.jobs.length - 1)
    })
  })

  it('한 단계에 출력은 많아야 한 줄 늘고, 늘어난 줄은 그 단계 line 범위의 console.log와 같다', () => {
    const lines = source().split('\n')
    let previous: string[] = []
    steps.forEach((step, k) => {
      const added = step.output!.slice(previous.length)
      previous = step.output!
      expect(added.length, `단계 ${k + 1}`).toBeLessThanOrEqual(1)
      if (added.length === 0) return
      const { from, to } = step.line!
      const literals = lines
        .slice(from - 1, to)
        .map((l) => /console\.log\('([^']*)'/.exec(l)?.[1])
        .filter((x): x is string => x !== undefined)
      expect(literals.length, `단계 ${k + 1}: line 범위에 console.log가 없음`).toBeGreaterThan(0)
      expect(
        literals.some((lit) => added[0].startsWith(lit)),
        `단계 ${k + 1}: ${added[0]}`,
      ).toBe(true)
    })
  })

  it('설명에 판마다 다른 이름과 명세에 없는 슬롯 이름이 없다', () => {
    for (const step of steps) {
      expect(step.explanation).not.toMatch(/RunSuspendedContext|RunCallerContext|\[\[Async/)
      expect(step.title).not.toMatch(/RunSuspendedContext|RunCallerContext|\[\[Async/)
    }
  })
})

// --- 실제 실행과 대조 ----------------------------------------------------------------------------

type Observed = { state: 'pending' | 'fulfilled' | 'rejected'; result: string | null }

// util.inspect가 찍는 프로미스 표기에서 상태와 결과를 뽑는다.
// 변수가 아직 선언되지 않았거나(undefined) 프로미스가 아니면 null이다.
function readPromise(value: unknown): Observed | null {
  const text = inspect(value, { depth: 0 }).replace(/\s+/g, ' ')
  const m = /^Promise \{ (.*) \}$/.exec(text)
  if (!m) return null
  const body = m[1]
  if (body === '<pending>') return { state: 'pending', result: null }
  if (body.startsWith('<rejected> ')) return { state: 'rejected', result: body.slice(11) }
  return { state: 'fulfilled', result: body }
}

type Record_ = { output: string[]; p: Observed | null }

// 예제를 새 컨텍스트에서 실행하며 console.log가 불릴 때마다 전역 변수 p의 상태를 기록한다.
// 동기 코드가 끝난 직후(Job이 하나도 실행되기 전)의 출력과 p도 읽는다.
async function runAndRecord(source: string): Promise<{ logs: Record_[]; syncEnd: Record_ }> {
  const output: string[] = []
  const logs: Record_[] = []
  const context = createContext({
    console: {
      log: (...args: unknown[]) => {
        output.push(format(...args))
        logs.push({ output: [...output], p: readPromise(context.p) })
      },
    },
  })
  runInContext(source, context, { timeout: 2000 })
  const syncEnd = { output: [...output], p: readPromise(context.p) }
  await nextMacrotask() // 큐에 있던 프로미스 Job이 모두 실행된다
  return { logs, syncEnd }
}

const expectedP = (state: AsyncState): Observed | null => {
  const p = state.promises.find((x) => x.name === 'p')
  return p ? { state: p.state, result: p.result } : null
}

describe.each(scenarios)('시나리오 $id와 실제 실행의 대조', (scenario) => {
  const example = exampleOf(scenario.exampleId)

  it('실제 출력 순서가 expectedOutput과 같다', async () => {
    const { logs } = await runAndRecord(readExample(example.file))
    expect(logs.at(-1)!.output).toEqual(example.expectedOutput)
  })

  it('출력 줄마다, 그 줄이 시나리오에서 처음 나오는 단계의 p 상태가 실제 실행의 p 상태와 같다', async () => {
    const { logs } = await runAndRecord(readExample(example.file))
    expect(logs).toHaveLength(example.expectedOutput.length)
    logs.forEach((log, i) => {
      const k = scenario.steps.findIndex((s) => s.output!.length > i)
      expect(k, `${i + 1}번째 출력이 나오는 단계`).toBeGreaterThanOrEqual(0)
      const step = scenario.steps[k]
      expect(step.output!.slice(0, i + 1), `단계 ${k + 1}의 출력`).toEqual(log.output)
      expect(expectedP(step.state), `${i + 1}번째 출력 "${log.output[i]}" 시점의 p`).toEqual(log.p)
    })
  })

  it('동기 코드가 끝난 직후 상태(출력, p)가 시나리오의 동기 코드 끝 단계와 같다', async () => {
    const { syncEnd } = await runAndRecord(readExample(example.file))
    const k = scenario.steps.findIndex((s, i) => i > 0 && s.state.stack.length === 0)
    const step = scenario.steps[k]
    expect(step.title).toBe('동기 코드 끝')
    expect(step.output).toEqual(syncEnd.output)
    expect(expectedP(step.state)).toEqual(syncEnd.p)
  })
})

describe('시나리오별 개념 불변식', () => {
  it('basic: p에 대입되기 전의 프로미스는 이름이 다르고, await에서 멈춘 뒤에도 pending이다', () => {
    const { steps } = scenarioOf('basic')
    const awaiting = steps.findIndex((s) => s.state.calls[0]?.status === 'awaiting')
    expect(steps[awaiting - 1].state.promises.map((p) => p.name)).toEqual(['work()의 프로미스'])
    expect(steps[awaiting].state.promises[0].state).toBe('pending')
    expect(steps[awaiting].state.jobs).toEqual(['work 재개'])
  })

  it('basic: return 단계에서 p가 이행되고 등록돼 있던 then 반응이 Job으로 옮겨진다', () => {
    const { steps } = scenarioOf('basic')
    const k = steps.findIndex((s) => s.state.promises[0]?.state === 'fulfilled')
    expect(steps[k - 1].state.promises[0].reactions).toEqual(['then 콜백'])
    expect(steps[k].state.promises[0]).toEqual({
      name: 'p',
      state: 'fulfilled',
      result: "'done'",
      reactions: [],
    })
    expect(steps[k].state.jobs).toEqual(['then 콜백'])
    expect(steps[k].state.calls[0].status).toBe('completed')
  })

  it('interleave: 변수에 담긴 프로미스가 없고, Job은 task 재개 → then 1 콜백 → then 2 콜백 순으로 실행된다', () => {
    const { steps } = scenarioOf('interleave')
    for (const s of steps) expect(s.state.promises).toEqual([])
    const jobFrames = steps
      .filter((s, k) => k > 0 && s.state.stack.length === 1 && s.state.stack[0] !== '전역 코드')
      .map((s) => s.state.stack[0])
    expect([...new Set(jobFrames)]).toEqual(['task 본문', 'then 1 콜백', 'then 2 콜백'])
    const afterSync = steps.find((s) => s.title === '동기 코드 끝')!
    expect(afterSync.state.jobs).toEqual(['task 재개', 'then 1 콜백'])
  })
})
