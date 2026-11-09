import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format, inspect } from 'node:util'
import { Script, createContext, runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'
import type { AsyncGenState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

const nextMacrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['queue', 'break'])
    expect(scenarios.map((s) => s.label)).toEqual(['next를 연달아 부르면', 'for await의 break'])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['queue', 'for-await-break'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 queue 20, break 15이고 각각 20 이하다', () => {
    expect(scenarioOf('queue').steps).toHaveLength(20)
    expect(scenarioOf('break').steps).toHaveLength(15)
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  queue: {
    3: '  await null;',
    4: "  yield 'a';",
    6: "  yield 'b';",
    9: 'var it = gen();',
    10: 'var p1 = it.next();',
    11: "p1.then((r) => console.log('1번:', JSON.stringify(r)));",
    12: 'var p2 = it.next();',
    13: "p2.then((r) => console.log('2번:', JSON.stringify(r)));",
    14: 'var p3 = it.next();',
    15: "p3.then((r) => console.log('3번:', JSON.stringify(r)));",
    16: "console.log('동기 코드 끝');",
  },
  break: {
    3: '    yield 1;',
    6: '    await null;',
    7: "    console.log('정리');",
    11: '  for await (const v of gen()) {',
    12: '    console.log(v);',
    13: '    break;',
    15: "  console.log('반복문 뒤');",
    17: 'var p = run();',
  },
}

const isActive = (s: AsyncGenState) => s.genState === 'executing' || s.genState === 'draining-queue'

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

  it('명세 문장: 요청 큐가 비어 있지 않은 것과 상태가 executing 또는 draining-queue인 것은 같다', () => {
    steps.forEach((step, k) => {
      const { queue, genState } = step.state
      expect(queue.length > 0, `단계 ${k + 1}: 큐 ${queue.length}개, 상태 ${genState}`).toBe(
        isActive(step.state),
      )
    })
  })

  it('첫 단계는 suspended-start이고 큐가 비었으며, 마지막 단계는 completed이고 큐와 Job 큐가 비었다', () => {
    expect(steps[0].state.genState).toBe('suspended-start')
    expect(steps[0].state.queue).toEqual([])
    expect(steps[0].output).toEqual([])
    const last = steps.at(-1)!
    expect(last.state.genState).toBe('completed')
    expect(last.state.queue).toEqual([])
    expect(last.state.jobs).toEqual([])
    expect(last.output).toEqual(example.expectedOutput)
    for (const p of last.state.promises) expect(p.state, p.name).toBe('fulfilled')
  })

  it('이 시나리오의 상태 전이는 허용한 순서뿐이고 completed에서 되돌아가지 않는다', () => {
    const allowed: Record<string, string[]> = {
      'suspended-start': ['executing'],
      'suspended-yield': ['executing'],
      executing: ['suspended-yield', 'draining-queue'],
      'draining-queue': ['completed'],
      completed: [],
    }
    steps.forEach((step, k) => {
      if (k === 0) return
      const before = steps[k - 1].state.genState
      const after = step.state.genState
      if (before === after) return
      expect(allowed[before], `단계 ${k + 1}: ${before} → ${after}`).toContain(after)
    })
  })

  it('요청 큐는 뒤에 넣고 앞에서만 꺼낸다(FIFO)', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state.queue
      const cur = step.state.queue
      const appended = cur.length >= prev.length && prev.every((r, i) => cur[i] === r)
      const shifted = prev.length > 0 && prev.slice(1).every((r, i) => cur[i] === r)
      expect(appended || shifted, `단계 ${k + 1}: ${prev} → ${cur}`).toBe(true)
      expect(cur.length, `단계 ${k + 1}`).toBeGreaterThanOrEqual(prev.length - 1)
    })
  })

  it('Job 큐는 뒤에 넣고 앞에서만 꺼낸다(FIFO)', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state.jobs
      const cur = step.state.jobs
      const appended = cur.length >= prev.length && prev.every((j, i) => cur[i] === j)
      const shifted = prev.length > 0 && prev.slice(1).every((j, i) => cur[i] === j)
      expect(appended || shifted, `단계 ${k + 1}: ${prev} → ${cur}`).toBe(true)
    })
  })

  it('이행된 프로미스는 되돌아가지 않고, 이름은 바뀌더라도 프로미스 수는 줄지 않는다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state.promises
      const cur = step.state.promises
      expect(cur.length, `단계 ${k + 1}`).toBeGreaterThanOrEqual(prev.length)
      const prevSettled = prev.filter((p) => p.state !== 'pending').length
      const curSettled = cur.filter((p) => p.state !== 'pending').length
      expect(curSettled, `단계 ${k + 1}`).toBeGreaterThanOrEqual(prevSettled)
    })
  })

  it('한 단계에 출력은 많아야 한 줄 늘어난다', () => {
    let previous: string[] = []
    steps.forEach((step, k) => {
      const added = step.output!.slice(previous.length)
      previous = step.output!
      expect(added.length, `단계 ${k + 1}`).toBeLessThanOrEqual(1)
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
  const text = inspect(value, { depth: 1 }).replace(/\s+/g, ' ')
  const m = /^Promise \{ (.*) \}$/.exec(text)
  if (!m) return null
  const body = m[1]
  if (body === '<pending>') return { state: 'pending', result: null }
  if (body.startsWith('<rejected> ')) return { state: 'rejected', result: body.slice(11) }
  return { state: 'fulfilled', result: body }
}

type Snapshot = { output: string[]; vars: Record<string, Observed | null> }

// 예제를 새 컨텍스트에서 실행하며 console.log가 불릴 때마다 전역 var 프로미스의 상태를 기록한다.
// 동기 코드가 끝난 직후(Job이 하나도 실행되기 전)의 출력과 프로미스 상태도 읽는다.
async function runAndRecord(
  source: string,
  names: string[],
): Promise<{ logs: Snapshot[]; syncEnd: Snapshot }> {
  const output: string[] = []
  const logs: Snapshot[] = []
  const snapshot = (): Snapshot => ({
    output: [...output],
    vars: Object.fromEntries(names.map((n) => [n, readPromise(context[n])])),
  })
  const context = createContext({
    console: {
      log: (...args: unknown[]) => {
        output.push(format(...args))
        logs.push(snapshot())
      },
    },
  })
  runInContext(source, context, { timeout: 2000 })
  const syncEnd = snapshot()
  await nextMacrotask() // 큐에 있던 프로미스 Job이 모두 실행된다
  return { logs, syncEnd }
}

const VARS: Record<string, string[]> = { queue: ['p1', 'p2', 'p3'], break: ['p'] }

const expectedVars = (state: AsyncGenState, names: string[]) =>
  Object.fromEntries(
    names.map((n) => {
      const p = state.promises.find((x) => x.name === n)
      return [n, p ? { state: p.state, result: p.result } : null]
    }),
  )

describe.each(scenarios)('시나리오 $id: 실제 실행과 대조', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const names = VARS[scenario.id]

  it('실제 출력 순서가 expectedOutput과 같다', async () => {
    const { logs } = await runAndRecord(readExample(example.file), names)
    expect(logs.at(-1)!.output).toEqual(example.expectedOutput)
  })

  it('출력 줄마다, 그 줄이 시나리오에서 처음 나오는 단계의 프로미스 상태가 실제 실행과 같다', async () => {
    const { logs } = await runAndRecord(readExample(example.file), names)
    expect(logs).toHaveLength(example.expectedOutput.length)
    logs.forEach((log, i) => {
      const k = scenario.steps.findIndex((s) => s.output!.length > i)
      expect(k, `${i + 1}번째 출력이 나오는 단계`).toBeGreaterThanOrEqual(0)
      const step = scenario.steps[k]
      expect(step.output!.slice(0, i + 1), `단계 ${k + 1}의 출력`).toEqual(log.output)
      expect(
        expectedVars(step.state, names),
        `${i + 1}번째 출력 "${log.output[i]}" 시점의 프로미스`,
      ).toEqual(log.vars)
    })
  })

  it('동기 코드가 끝난 직후의 출력과 프로미스 상태가 시나리오 단계와 같다', async () => {
    const { syncEnd } = await runAndRecord(readExample(example.file), names)
    const title =
      scenario.id === 'queue' ? "console.log('동기 코드 끝')" : 'next의 프로미스를 Await'
    const step = scenario.steps.find((s) => s.title === title)!
    expect(step.output).toEqual(syncEnd.output)
    expect(expectedVars(step.state, names)).toEqual(syncEnd.vars)
  })
})

describe('시나리오별 개념 불변식', () => {
  it('queue: 상태가 executing이면서 요청이 3개인 단계가 있다', () => {
    const { steps } = scenarioOf('queue')
    expect(steps.some((s) => s.state.genState === 'executing' && s.state.queue.length === 3)).toBe(
      true,
    )
    expect(steps.find((s) => s.title === 'p2.then 등록, var p3 = it.next()')!.state.queue).toEqual([
      '요청 1',
      '요청 2',
      '요청 3',
    ])
  })

  it('queue: 요청이 큐에 남은 채 p1이 이행되고, 그 단계에서도 상태는 executing이다(멈추지 않고 이어 감)', () => {
    const { steps } = scenarioOf('queue')
    const k = steps.findIndex(
      (s) => s.state.promises.find((p) => p.name === 'p1')?.state === 'fulfilled',
    )
    const step = steps[k]
    expect(step.state.queue).toEqual(['요청 2', '요청 3'])
    expect(step.state.genState).toBe('executing')
    expect(step.state.jobs).toContain('1번 콜백')
    // 다음 요청 처리도 같다
    const k2 = steps.findIndex(
      (s) => s.state.promises.find((p) => p.name === 'p2')?.state === 'fulfilled',
    )
    expect(steps[k2].state.queue).toEqual(['요청 3'])
    expect(steps[k2].state.genState).toBe('executing')
  })

  it('queue: 두 번째 next와 세 번째 next는 상태가 executing이라 재개하지 않고 큐에 넣기만 한다', () => {
    const { steps } = scenarioOf('queue')
    for (const title of ['p1.then 등록, var p2 = it.next()', 'p2.then 등록, var p3 = it.next()']) {
      const k = steps.findIndex((s) => s.title === title)
      expect(steps[k - 1].state.genState).toBe('executing')
      expect(steps[k].state.genState).toBe('executing')
      expect(steps[k].state.jobs).toEqual(steps[k - 1].state.jobs)
    }
  })

  it('queue: 마지막에 draining-queue를 거쳐 completed가 되고, 그 단계에서 p3이 이행된다', () => {
    const { steps } = scenarioOf('queue')
    const d = steps.findIndex((s) => s.state.genState === 'draining-queue')
    expect(d).toBeGreaterThan(0)
    expect(steps[d].state.queue).toEqual(['요청 3'])
    expect(steps[d + 1].state.genState).toBe('completed')
    expect(steps[d + 1].state.promises.find((p) => p.name === 'p3')?.state).toBe('fulfilled')
  })

  it('break: break 단계에서 return 요청이 큐에 들어가고 suspended-yield였던 본문이 재개된다', () => {
    const { steps } = scenarioOf('break')
    const k = steps.findIndex((s) => s.title === 'break, return() 호출')
    expect(steps[k - 1].state.genState).toBe('suspended-yield')
    expect(steps[k].state.genState).toBe('executing')
    expect(steps[k].state.queue).toEqual(['요청 2(return)'])
  })

  it('break: 정리가 반복문 뒤보다 먼저 출력되고, 그 사이 상태는 draining-queue를 거쳐 completed가 된다', () => {
    const { steps } = scenarioOf('break')
    const logs = steps.at(-1)!.output!
    expect(logs).toEqual(['1', '정리', '반복문 뒤'])
    const cleanup = steps.findIndex((s) => s.output!.length === 2)
    const after = steps.findIndex((s) => s.output!.length === 3)
    expect(cleanup).toBeLessThan(after)
    expect(steps.slice(cleanup, after).some((s) => s.state.genState === 'draining-queue')).toBe(
      true,
    )
    expect(steps[after].state.genState).toBe('completed')
  })
})

// --- 명세가 정한 문법과 검증 ---------------------------------------------------------------------

describe('for await와 next의 검증', () => {
  const compiles = (src: string) => {
    try {
      new Script(src)
      return true
    } catch (e) {
      return e instanceof SyntaxError ? false : Promise.reject(e)
    }
  }

  it('for await를 async 밖에 쓰면 SyntaxError다', () => {
    expect(compiles('for await (const v of []) {}')).toBe(false)
    expect(compiles('function f() { for await (const v of []) {} }')).toBe(false)
    expect(compiles('function* g() { for await (const v of []) {} }')).toBe(false)
  })

  it('async 함수와 async 제너레이터 안의 for await는 통과한다', () => {
    expect(compiles('async function f() { for await (const v of []) {} }')).toBe(true)
    expect(compiles('async function* g() { for await (const v of []) {} }')).toBe(true)
  })

  it('이터레이터가 아닌 this로 next를 부르면 throw하지 않고 프로미스를 돌려주며 TypeError로 거부된다', async () => {
    const context = createContext({})
    runInContext(
      `
      async function* gen() {}
      var thrown = null;
      var isPromise = false;
      var rejection = null;
      try {
        var r = gen().next.call({});
        isPromise = r instanceof Promise;
        r.catch(function (e) { rejection = e.name; });
      } catch (e) {
        thrown = e.name;
      }
      `,
      context,
      { timeout: 2000 },
    )
    await nextMacrotask()
    expect(context.thrown).toBeNull()
    expect(context.isPromise).toBe(true)
    expect(context.rejection).toBe('TypeError')
  })
})

// --- 예제로 보이지 않은 경로: 인라인 소스로 확인 ---------------------------------------------------

async function runInline(source: string): Promise<string[]> {
  const output: string[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => void output.push(format(...args)) },
  })
  runInContext(source, context, { timeout: 2000 })
  await nextMacrotask()
  await nextMacrotask()
  return output
}

describe('예제로 보이지 않은 경로', () => {
  it('suspended-yield에서 throw()를 부르면 yield 자리의 catch가 잡는다', async () => {
    const out = await runInline(`
      async function* g() { try { yield 1; } catch (e) { console.log('잡음', e.message); yield '복구'; } }
      var it = g();
      it.next().then(function () {
        return it.throw(new Error('x')).then(function (r) { console.log(JSON.stringify(r)); });
      });
    `)
    expect(out).toEqual(['잡음 x', '{"value":"복구","done":false}'])
  })

  it('completed에서 return(값)을 부르면 값을 기다린 뒤 done이 true인 결과가 된다', async () => {
    const out = await runInline(`
      async function* g() {}
      var it = g();
      it.next().then(function () { return it.return(Promise.resolve('값')); })
        .then(function (r) { console.log(JSON.stringify(r)); });
    `)
    expect(out).toEqual(['{"value":"값","done":true}'])
  })

  it('시작 전 return(거부된 프로미스)는 거부되고, 그 뒤의 next는 done이 true로 이행된다', async () => {
    const out = await runInline(`
      async function* g() { console.log('실행되지 않음'); }
      var it = g();
      it.return(Promise.reject(new Error('r'))).catch(function (e) { console.log('거부', e.message); });
      it.next().then(function (r) { console.log(JSON.stringify(r)); });
    `)
    expect([...out].sort()).toEqual(['거부 r', '{"done":true}'].sort())
  })

  it('본문이 끝난 뒤 큐에 남은 next·throw·return·next는 각각 done true·거부·값과 done true·done true로 끝난다', async () => {
    const out = await runInline(`
      async function* g() { await null; }
      var it = g();
      it.next().then(function (r) { console.log('1 ' + JSON.stringify(r)); });
      it.throw(new Error('E')).catch(function (e) { console.log('2 거부 ' + e.message); });
      it.return('v').then(function (r) { console.log('3 ' + JSON.stringify(r)); });
      it.next().then(function (r) { console.log('4 ' + JSON.stringify(r)); });
    `)
    expect([...out].sort()).toEqual(
      ['1 {"done":true}', '2 거부 E', '3 {"value":"v","done":true}', '4 {"done":true}'].sort(),
    )
  })

  it('break로 나갈 때 return이 객체가 아닌 값으로 끝나면 TypeError다', async () => {
    const out = await runInline(`
      var src = { [Symbol.asyncIterator]() { return {
        next() { return Promise.resolve({ value: 1, done: false }); },
        return() { return 1; },
      }; } };
      (async function () {
        try { for await (const v of src) { break; } } catch (e) { console.log(e.name); }
      })();
    `)
    expect(out).toEqual(['TypeError'])
  })

  it('반복문 본문의 예외로 나갈 때는 return의 결과가 이상해도 원래 예외가 우선한다', async () => {
    const out = await runInline(`
      var src = { [Symbol.asyncIterator]() { return {
        next() { return Promise.resolve({ value: 1, done: false }); },
        return() { return 1; },
      }; } };
      (async function () {
        try { for await (const v of src) { throw new Error('원래'); } } catch (e) { console.log(e.message); }
      })();
    `)
    expect(out).toEqual(['원래'])
  })

  it('done이 true인 결과와 함께 온 거부는 동기 이터레이터를 닫지 않고, done이 false이면 닫는다', async () => {
    const make = (done: boolean) => `
      var src = { [Symbol.iterator]() { return {
        next() { return { value: Promise.reject(new Error('x')), done: ${done} }; },
        return() { console.log('닫힘'); return {}; },
      }; } };
      (async function () {
        try { for await (const v of src) {} } catch (e) { console.log('잡음 ' + e.message); }
      })();
    `
    expect(await runInline(make(true))).toEqual(['잡음 x'])
    expect(await runInline(make(false))).toEqual(['닫힘', '잡음 x'])
  })
})
