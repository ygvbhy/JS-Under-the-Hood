import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format, inspect } from 'node:util'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type AllLedgerState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

const nextMacrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

// util.inspect가 찍는 프로미스 표기에서 상태와 결과를 뽑는다.
// 'Promise { [ 'A', 'B', 'c' ] }', 'Promise { <pending> }', 'Promise { <rejected> Error: b failed at ... }'
type Observed = { state: 'pending' | 'fulfilled' | 'rejected'; value: string | null }

function readPromise(value: unknown): Observed {
  const text = inspect(value, { depth: 2 }).replace(/\s+/g, ' ')
  const m = /^Promise \{ (.*) \}$/.exec(text)
  if (!m) throw new Error(`프로미스가 아닙니다: ${text}`)
  const body = m[1]
  if (body === '<pending>') return { state: 'pending', value: null }
  if (body.startsWith('<rejected> ')) {
    const reason = body.slice('<rejected> '.length)
    const err = /^(\w*Error: .*?)(?: at |$)/.exec(reason)
    return { state: 'rejected', value: err ? err[1] : reason }
  }
  return { state: 'fulfilled', value: body }
}

// --- 실행 기록 -----------------------------------------------------------------------------------

type ElementCall = { index: number; value: string; resultStateAtCall: Observed['state'] }

// 새 컨텍스트에서 Promise.all을 감싸 호출 중임을 표시하고, 그동안 Promise.prototype.then에 넘어온
// 첫 인수(요소 함수)를 감싸 호출 기록을 남긴다. 자리 번호는 then이 불린 순서(= 요소를 올린 순서)다.
// 감싼 함수는 원래 요소 함수를 같은 인수로 부르고 반환값을 그대로 돌려준다.
async function runWithElementTrace(source: string): Promise<{
  output: string[]
  calls: ElementCall[]
  all: unknown
}> {
  const output: string[] = []
  const calls: ElementCall[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  const install = runInContext(
    `(function (rec) {
  var origThen = Promise.prototype.then;
  var origAll = Promise.all;
  var inAll = false;
  var next = 0;
  Promise.all = function (iterable) {
    inAll = true;
    next = 0;
    try { return origAll.call(this, iterable); } finally { inAll = false; }
  };
  Promise.prototype.then = function (onFulfilled, onRejected) {
    if (inAll && typeof onFulfilled === 'function') {
      var index = next++;
      var original = onFulfilled;
      onFulfilled = function (value) {
        rec(index, JSON.stringify(value));
        return original.call(this, value);
      };
    }
    return origThen.call(this, onFulfilled, onRejected);
  };
})`,
    context,
  ) as (rec: (index: number, value: string) => void) => void
  install((index, value) => {
    calls.push({
      index,
      value,
      resultStateAtCall: readPromise((context as Record<string, unknown>).all).state,
    })
  })
  runInContext(source, context, { timeout: 2000 })
  await nextMacrotask()
  return { output, calls, all: (context as Record<string, unknown>).all }
}

async function runPlain(source: string): Promise<string[]> {
  const output: string[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  runInContext(source, context, { timeout: 2000 })
  await nextMacrotask()
  return output
}

// --- 시나리오 구조 도우미 ------------------------------------------------------------------------

const ELEMENT_JOB = /^요소 함수 Job \(자리 (\d+)\)$/

// 요소 함수 Job이 실행되는 단계(running이 요소 함수 Job으로 바뀐 단계)의 번호와 자리 번호
function elementJobSteps(steps: { state: AllLedgerState }[]): { step: number; index: number }[] {
  const found: { step: number; index: number }[] = []
  steps.forEach((s, k) => {
    const m = ELEMENT_JOB.exec(s.state.running)
    if (!m) return
    if (k > 0 && steps[k - 1].state.running === s.state.running) return
    found.push({ step: k, index: Number(m[1]) })
  })
  return found
}

// 시나리오의 values 칸 표기('A' → "A")를 실행 기록의 JSON 표기로 바꾼다.
const toJson = (cell: string | null) => (cell === null ? null : JSON.stringify(cell.slice(1, -1)))

// --- ①② 구조 ------------------------------------------------------------------------------------

describe('시나리오 구조', () => {
  it('② 시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['input-order', 'keeps-going'])
    expect(scenarios.map((s) => s.label)).toEqual(['넣은 순서로 모으기', '하나가 거부될 때'])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['input-order', 'keeps-going'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('② 단계 수는 input-order 18, keeps-going 15이고 각각 20 이하다', () => {
    expect(scenarioOf('input-order').steps).toHaveLength(18)
    expect(scenarioOf('keeps-going').steps).toHaveLength(15)
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps

  it('① 공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('① 첫 단계는 빈 장부·line 없음이고 나머지 단계에는 line이 있다', () => {
    expect(steps[0].line).toBeUndefined()
    expect(steps[0].state).toEqual({
      running: '동기 코드',
      result: { state: 'none', value: null },
      remaining: null,
      iterationDone: false,
      values: [],
      elements: [],
      jobs: [],
    })
    expect(steps[0].output).toEqual([])
    steps.slice(1).forEach((step, k) => expect(step.line, `단계 ${k + 2}`).toBeDefined())
  })

  it('장부 구조: values 칸 수 = 요소 수이고, 호출된 요소의 칸만 채워져 있으며, 자리 번호는 0부터 차례다', () => {
    steps.forEach((step, k) => {
      const { values, elements } = step.state
      const where = `단계 ${k + 1}`
      expect(values.length, `${where}: values 칸 수`).toBe(elements.length)
      elements.forEach((e, i) => {
        expect(e.index, `${where}: 자리 번호`).toBe(i)
        expect(values[i] !== null, `${where}: values[${i}] 채움 = 요소 함수 호출`).toBe(e.called)
      })
    })
  })

  it('Job이 실행되는 단계의 running은 직전 단계 jobs의 맨 앞이고, 마지막에는 jobs가 비었다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const { running, jobs } = step.state
      const prev = steps[k - 1].state
      if (running !== '동기 코드' && running !== '없음' && running !== prev.running) {
        expect(prev.jobs[0], `단계 ${k + 1}`).toBe(running)
        expect(jobs.slice(0, prev.jobs.length - 1), `단계 ${k + 1}: 기존 Job 순서`).toEqual(
          prev.jobs.slice(1),
        )
      }
    })
    expect(steps.at(-1)!.state.jobs).toEqual([])
    expect(steps.at(-1)!.state.running).toBe('없음')
  })

  it('⑤ 새 출력 줄이 생긴 단계의 line 범위 안에 console.log가 있다', () => {
    const lines = source().split('\n')
    steps.forEach((step, k) => {
      if (k === 0) return
      if (step.output!.length > steps[k - 1].output!.length) {
        const { from, to } = step.line!
        expect(lines.slice(from - 1, to).join('\n'), `단계 ${k + 1}`).toContain('console.log')
      }
    })
  })

  // ④ 남은 개수는 명세 규칙(1 + 등록한 요소 수 - 반복 끝 1 - 요소 함수가 처음 불린 횟수)으로 계산한다.
  it('④ 모든 단계에서 남은 개수 = 1 + 등록한 요소 수 − (반복 끝? 1 : 0) − 요소 함수가 불린 요소 수', () => {
    steps.forEach((step, k) => {
      const { remaining, elements, iterationDone } = step.state
      const where = `단계 ${k + 1}`
      if (remaining === null) {
        expect(elements, `${where}: Promise.all 호출 전`).toEqual([])
        expect(iterationDone, `${where}: Promise.all 호출 전`).toBe(false)
        return
      }
      const called = elements.filter((e) => e.called).length
      expect(remaining, where).toBe(1 + elements.length - (iterationDone ? 1 : 0) - called)
    })
  })

  it('④ 결과 프로미스는 남은 개수가 0이 된 단계에서만 이행되고, 한 번 정해진 결과는 바뀌지 않는다', () => {
    steps.forEach((step, k) => {
      const { result, remaining } = step.state
      if (result.state === 'fulfilled') expect(remaining, `단계 ${k + 1}`).toBe(0)
      if (remaining === 0) expect(result.state, `단계 ${k + 1}`).toBe('fulfilled')
      if (k > 0) {
        const prev = steps[k - 1].state.result
        if (prev.state === 'fulfilled' || prev.state === 'rejected') {
          expect(result, `단계 ${k + 1}`).toEqual(prev)
        }
      }
    })
  })

  // ③ 실행 기록(then 감싸기)의 요소 함수 호출 순서·값이 시나리오의 요소 함수 Job 단계와 같다.
  it('③ 요소 함수가 불린 순서(자리 번호·값)가 시나리오의 요소 함수 Job 단계 순서·values 변화와 같다', async () => {
    const { calls } = await runWithElementTrace(source())
    const jobSteps = elementJobSteps(steps)
    expect(
      jobSteps.map((j) => j.index),
      '요소 함수 Job의 자리 번호 순서',
    ).toEqual(calls.map((c) => c.index))
    jobSteps.forEach(({ step, index }, n) => {
      const before = steps[step - 1].state
      const after = steps[step].state
      // 이 Job은 자기 자리의 칸만 비어 있던 값에서 실행 기록의 값으로 바꾼다
      expect(before.values[index], `단계 ${step + 1}: 실행 전 칸`).toBeNull()
      expect(toJson(after.values[index]), `단계 ${step + 1}: 실행 기록의 값`).toBe(calls[n].value)
      after.values.forEach((cell, i) => {
        if (i !== index) expect(cell, `단계 ${step + 1}: 다른 칸`).toBe(before.values[i])
      })
      // 호출 시점의 결과 프로미스 상태 = 직전 단계의 결과 상태
      expect(before.result.state, `단계 ${step + 1}: 호출 시점의 결과 상태`).toBe(
        calls[n].resultStateAtCall,
      )
      expect(after.elements[index].called).toBe(true)
    })
  })

  it('⑤ 마지막 단계의 결과 프로미스가 모든 Job이 끝난 뒤 util.inspect(all)과 같다', async () => {
    const { all } = await runWithElementTrace(source())
    const observed = readPromise(all)
    expect(steps.at(-1)!.state.result).toEqual(observed)
  })

  it('⑥ then을 감싼 실행과 감싸지 않은 실행의 출력이 모두 expectedOutput이다', async () => {
    const wrapped = await runWithElementTrace(source())
    const plain = await runPlain(source())
    expect(plain).toEqual(example.expectedOutput)
    expect(wrapped.output).toEqual(example.expectedOutput)
  })
})

// --- ③ 기대하는 실행 기록 (테스트가 시나리오를 따라가는 것이 아니라 실제 실행에서 얻은 값) --------------

describe('요소 함수 호출 기록', () => {
  it('③ input-order: 자리 2("c") → 자리 1("B") → 자리 0("A") 순으로, 결과가 pending일 때 불린다', async () => {
    const { calls } = await runWithElementTrace(readExample('input-order.js'))
    expect(calls).toEqual([
      { index: 2, value: '"c"', resultStateAtCall: 'pending' },
      { index: 1, value: '"B"', resultStateAtCall: 'pending' },
      { index: 0, value: '"A"', resultStateAtCall: 'pending' },
    ])
  })

  it('③ keeps-going: 결과가 이미 거부된 뒤에 자리 0("A")의 요소 함수가 불린다', async () => {
    const { calls } = await runWithElementTrace(readExample('keeps-going.js'))
    expect(calls).toEqual([{ index: 0, value: '"A"', resultStateAtCall: 'rejected' }])
  })
})

// --- ⑦ 본문 근거: 빈 이터러블 --------------------------------------------------------------------

describe('⑦ 빈 이터러블을 넘긴 직후의 상태', () => {
  // 호출 직후(콜백이나 Job이 하나도 실행되기 전)의 프로미스 상태를 읽는다.
  // 거부된 프로미스에는 빈 처리기를 달아 처리되지 않은 거부가 프로세스에 보고되지 않게 한다.
  const syncState = (expression: string): Observed => {
    const context = createContext({})
    const p = runInContext(
      `(function () { var p = ${expression}; p.catch(function () {}); return p; })()`,
      context,
      { timeout: 2000 },
    )
    return readPromise(p)
  }

  it('Promise.all([])과 Promise.allSettled([])는 호출 직후 빈 배열로 이행되어 있다', () => {
    expect(syncState('Promise.all([])')).toEqual({ state: 'fulfilled', value: '[]' })
    expect(syncState('Promise.allSettled([])')).toEqual({ state: 'fulfilled', value: '[]' })
  })

  it('Promise.race([])는 pending이다', () => {
    expect(syncState('Promise.race([])')).toEqual({ state: 'pending', value: null })
  })

  it('Promise.any([])는 호출 직후 AggregateError로 거부되어 있다', () => {
    const observed = syncState('Promise.any([])')
    expect(observed.state).toBe('rejected')
    expect(observed.value).toMatch(/AggregateError/)
  })

  it('이행된 결과에 단 then 콜백은 호출 안에서 실행되지 않는다', () => {
    const output: string[] = []
    const context = createContext({ log: (s: string) => output.push(s) })
    runInContext(`Promise.all([]).then(function () { log('callback'); }); log('sync');`, context, {
      timeout: 2000,
    })
    expect(output).toEqual(['sync'])
  })
})
