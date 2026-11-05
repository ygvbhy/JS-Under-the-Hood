import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format, inspect } from 'node:util'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type PromiseInfo } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

const nextMacrotask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

// --- 시나리오 id·단계 수 -------------------------------------------------------------------------

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['chain', 'adopt'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '이미 이행된 프로미스와 then 체인',
      '콜백이 프로미스를 반환할 때',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['chain', 'return-promise'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 chain 11, adopt 12이고 각각 20 이하다', () => {
    expect(scenarios[0].steps).toHaveLength(11)
    expect(scenarios[1].steps).toHaveLength(12)
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

// --- 실행 기록 헬퍼 ------------------------------------------------------------------------------

type Observed = { state: PromiseInfo['state']; result: string | null }

// util.inspect가 찍는 프로미스 표기에서 상태와 결과를 뽑는다.
// 'Promise { 1 }', 'Promise { <pending> }', 'Promise { <rejected> Error: bad 2 at ... }'
// 변수가 아직 선언되지 않았거나 프로미스가 아니면 null이다.
function readPromise(value: unknown): Observed | null {
  const text = inspect(value, { depth: 0 }).replace(/\s+/g, ' ')
  const m = /^Promise \{ (.*) \}$/.exec(text)
  if (!m) return null
  const body = m[1]
  if (body === '<pending>') return { state: 'pending', result: null }
  if (body.startsWith('<rejected> ')) {
    const reason = body.slice('<rejected> '.length)
    const err = /^(\w*Error: .*?)(?: at |$)/.exec(reason)
    return { state: 'rejected', result: err ? err[1] : reason }
  }
  return { state: 'fulfilled', result: body }
}

const expectedOf = (promises: PromiseInfo[], name: string): Observed | null => {
  const p = promises.find((x) => x.name === name)
  return p ? { state: p.state, result: p.result } : null
}

type Snapshot = { vars: Record<string, Observed | null>; output: string[] }

function snapshotOf(context: Record<string, unknown>, names: string[], output: string[]): Snapshot {
  const vars: Record<string, Observed | null> = {}
  for (const name of names) vars[name] = readPromise(context[name])
  return { vars, output: [...output] }
}

// 예제의 앞쪽 count줄만 새 컨텍스트에서 실행하고 그 직후(Job이 하나도 실행되기 전)의 상태를 읽는다.
// 이 컨텍스트에서는 then이 돌려주는 프로미스에 빈 거부 처리기를 달아, 일부만 실행한 코드에서
// 처리되지 않은 거부가 Node 프로세스에 보고되지 않게 한다(상태 읽기에는 영향이 없다).
function runPrefix(source: string, count: number, names: string[]): Snapshot {
  const output: string[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  runInContext(
    `(function () {
  var origThen = Promise.prototype.then;
  Promise.prototype.then = function (f, r) {
    var derived = origThen.call(this, f, r);
    origThen.call(derived, undefined, function () {});
    return derived;
  };
})()`,
    context,
  )
  const lines = source.split('\n').slice(0, count).join('\n')
  if (count > 0) runInContext(lines, context, { timeout: 2000 })
  return snapshotOf(context, names, output)
}

type Checkpoint = { kind: 'handler' | 'then' | 'final'; snapshot: Snapshot }

// 새 컨텍스트에서 Promise.prototype.then을 감싸, then 호출과 then에 넘긴 콜백의 시작을 기록한다.
// 기록하는 시점(동기 코드가 끝난 직후, 이후 then 호출·콜백 시작마다, 모든 Job이 끝난 뒤)에
// 예제의 전역 프로미스 변수를 읽는다. catch도 then을 Invoke하므로 감싼 함수를 지난다.
// 콜백 시작 시점의 상태는 그 앞 Job이 끝난 상태와 같다(Job은 하나씩 끝까지 실행된다).
// NewPromiseResolveThenableJob은 콜백이 아니라 then 호출로만 보인다.
async function runWithTrace(
  source: string,
  names: string[],
): Promise<{ syncEnd: Snapshot; checkpoints: Checkpoint[] }> {
  const output: string[] = []
  const checkpoints: Checkpoint[] = []
  let recording = false
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  const record = (kind: 'handler' | 'then') => {
    if (recording) checkpoints.push({ kind, snapshot: snapshotOf(context, names, output) })
  }
  const install = runInContext(
    `(function (rec) {
  var origThen = Promise.prototype.then;
  Promise.prototype.then = function (onFulfilled, onRejected) {
    rec('then');
    var wrap = function (h) {
      return typeof h === 'function'
        ? function (x) { rec('handler'); return h.call(this, x); }
        : h;
    };
    return origThen.call(this, wrap(onFulfilled), wrap(onRejected));
  };
})`,
    context,
  ) as (rec: (kind: 'handler' | 'then') => void) => void
  install(record)
  runInContext(source, context, { timeout: 2000 })
  const syncEnd = snapshotOf(context, names, output)
  recording = true
  await nextMacrotask() // 대기 중이던 Job이 모두 실행된다
  checkpoints.push({ kind: 'final', snapshot: snapshotOf(context, names, output) })
  return { syncEnd, checkpoints }
}

// --- 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문 ---------------------------------------

const FIXED_LINES: Record<string, Record<number, string>> = {
  chain: {
    1: 'var p1 = new Promise(function (resolve) {',
    2: "  console.log('executor');",
    3: '  resolve(1);',
    4: '});',
    5: 'var p2 = p1.then(function (v) {',
    6: "  console.log('then', v);",
    7: '  return v + 1;',
    8: '});',
    9: 'var p3 = p2.then(function (v) {',
    10: "  throw new Error('bad ' + v);",
    11: '});',
    12: 'var p4 = p3.catch(function (e) {',
    13: "  console.log('catch', e.message);",
    14: '});',
    15: "console.log('sync end', p1 === p2);",
  },
  adopt: {
    1: 'var inner = new Promise(function (resolve) {',
    2: "  resolve('inner value');",
    3: '});',
    4: "var start = Promise.resolve('start');",
    5: 'var outer = start.then(function () {',
    6: '  return inner;',
    7: '});',
    8: 'var last = outer.then(function (v) {',
    9: "  console.log('outer got', v);",
    10: '});',
    11: 'console.log(outer === inner, Promise.resolve(inner) === inner);',
  },
}

// 동기 단계(단계 번호 0-based → 예제 앞쪽에서 실행한 줄 수). 단계의 line.to와도 같아야 한다.
const SYNC_PREFIX: Record<string, Record<number, number>> = {
  chain: { 0: 0, 1: 4, 2: 8, 3: 11, 4: 14, 5: 15 },
  adopt: { 0: 0, 1: 3, 2: 4, 3: 7, 4: 10, 5: 11 },
}

// 동기 코드가 끝난 뒤의 체크포인트 순서와, 각각이 가리키는 단계 번호(0-based).
// 체크포인트 시점의 상태는 해당 단계의 상태와 같아야 한다.
const CHECKPOINTS: Record<string, { kind: Checkpoint['kind']; steps: number[] }[]> = {
  chain: [
    { kind: 'handler', steps: [6] }, // Job 1의 콜백 시작 = 동기 코드가 끝난 상태
    { kind: 'handler', steps: [7] }, // Job 2의 콜백 시작 = Job 1이 끝난 상태
    { kind: 'handler', steps: [8] }, // Job 3의 콜백 시작 = Job 2가 끝난 상태
    { kind: 'final', steps: [9, 10] }, // Job 3이 끝난 상태
  ],
  adopt: [
    { kind: 'handler', steps: [6] }, // Job 1의 콜백 시작 = 동기 코드가 끝난 상태
    { kind: 'then', steps: [7] }, // Job 2(NewPromiseResolveThenableJob)가 inner.then을 부름 = Job 1이 끝난 상태
    { kind: 'handler', steps: [8] }, // Job 3(outer의 resolve 함수)의 시작 = Job 2가 끝난 상태
    { kind: 'handler', steps: [9] }, // Job 4의 콜백 시작 = Job 3이 끝난 상태
    { kind: 'final', steps: [10, 11] }, // Job 4가 끝난 상태
  ],
}

// --- 시나리오 검사 -------------------------------------------------------------------------------

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps
  const names = steps.at(-1)!.state.promises.map((p) => p.name)

  const expectSnapshot = (snap: Snapshot, stepIndex: number, where: string) => {
    const step = steps[stepIndex]
    for (const name of names) {
      expect(snap.vars[name], `${where}: ${name} (단계 ${stepIndex + 1})`).toEqual(
        expectedOf(step.state.promises, name),
      )
    }
    expect(snap.output, `${where}: 출력 (단계 ${stepIndex + 1})`).toEqual(step.output)
  }

  it('① 공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('① 첫 단계는 빈 상태·line 없음이고 나머지 단계에는 line이 있다', () => {
    expect(steps[0].line).toBeUndefined()
    expect(steps[0].state).toEqual({ running: '동기 코드', promises: [], jobs: [] })
    expect(steps[0].output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
    })
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('② 동기 단계: 예제 앞쪽 줄까지만 실행한 상태와 단계의 프로미스·출력이 같다', () => {
    const table = SYNC_PREFIX[scenario.id]
    for (const [stepIndex, count] of Object.entries(table)) {
      const k = Number(stepIndex)
      if (k > 0) expect(steps[k].line?.to, `단계 ${k + 1}의 line.to`).toBe(count)
      expectSnapshot(runPrefix(source(), count, names), k, `앞 ${count}줄 실행`)
    }
  })

  it('② Job 단계: then·콜백 기록 시점의 프로미스 상태·출력이 대응하는 단계와 같다', async () => {
    const { syncEnd, checkpoints } = await runWithTrace(source(), names)
    expectSnapshot(syncEnd, 5, '동기 코드 끝')
    const table = CHECKPOINTS[scenario.id]
    expect(
      checkpoints.map((c) => c.kind),
      '동기 코드 뒤 체크포인트 종류와 개수',
    ).toEqual(table.map((t) => t.kind))
    table.forEach((entry, i) => {
      for (const stepIndex of entry.steps) {
        expectSnapshot(checkpoints[i].snapshot, stepIndex, `체크포인트 ${i + 1} (${entry.kind})`)
      }
    })
  })

  it('③ 이름 중복이 없고, lockedTo가 있으면 pending이며, 반응이 있는 프로미스는 pending이다', () => {
    steps.forEach((step, k) => {
      const where = `단계 ${k + 1}`
      const promiseNames = step.state.promises.map((p) => p.name)
      expect(new Set(promiseNames).size, `${where}: 프로미스 이름 중복`).toBe(promiseNames.length)
      expect(new Set(step.state.jobs).size, `${where}: Job 이름 중복`).toBe(step.state.jobs.length)
      for (const p of step.state.promises) {
        if (p.lockedTo !== undefined) {
          expect(p.state, `${where}: ${p.name}.lockedTo`).toBe('pending')
          expect(promiseNames, `${where}: ${p.name}.lockedTo 대상`).toContain(p.lockedTo)
        }
        if (p.reactions.length > 0) expect(p.state, `${where}: ${p.name}.reactions`).toBe('pending')
        if (p.state === 'pending') expect(p.result, `${where}: ${p.name}.result`).toBeNull()
        else expect(p.result, `${where}: ${p.name}.result`).not.toBeNull()
      }
    })
  })

  it('③ 프로미스는 한 번 정해지면 바뀌지 않고, 한 번 나타난 이름은 사라지지 않는다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state.promises
      for (const before of prev) {
        const after = step.state.promises.find((p) => p.name === before.name)
        expect(after, `단계 ${k + 1}: ${before.name}`).toBeDefined()
        if (before.state !== 'pending') {
          expect(after!.state, `단계 ${k + 1}: ${before.name}`).toBe(before.state)
          expect(after!.result, `단계 ${k + 1}: ${before.name}`).toBe(before.result)
        }
      }
    })
  })

  it('③ lockedTo는 정해질 때까지 유지되고, thenable Job이 있는 동안에만 있으며, 잠긴 프로미스가 있으면 처리할 Job이 남아 있다', () => {
    steps.forEach((step, k) => {
      const where = `단계 ${k + 1}`
      const { running, jobs, promises } = step.state
      const locked = promises.filter((p) => p.lockedTo !== undefined)
      const thenableJobs = [running, ...jobs].filter((name) => name.startsWith('thenable Job'))
      // NewPromiseResolveThenableJob은 resolve가 thenable을 받았을 때만 들어가므로 잠긴 프로미스가 있다
      if (thenableJobs.length > 0)
        expect(locked.length, `${where}: thenable Job의 대상`).toBeGreaterThan(0)
      if (locked.length > 0) {
        expect(
          jobs.length > 0 || running.startsWith('반응 Job'),
          `${where}: 잠긴 프로미스를 처리할 Job`,
        ).toBe(true)
      }
      if (k === 0) return
      for (const before of steps[k - 1].state.promises) {
        if (before.lockedTo === undefined) continue
        const after = promises.find((p) => p.name === before.name)!
        if (after.state === 'pending') {
          expect(after.lockedTo, `${where}: ${before.name}는 정해질 때까지 잠겨 있다`).toBe(
            before.lockedTo,
          )
        }
      }
    })
  })

  it('③ Job이 실행되는 단계의 running은 직전 단계 jobs의 맨 앞이고, 이번 jobs에는 없다', () => {
    steps.forEach((step, k) => {
      if (k === 0) return
      const { running, jobs } = step.state
      const prev = steps[k - 1].state
      const isJob = running !== '동기 코드' && running !== '없음'
      if (isJob) {
        expect(prev.jobs[0], `단계 ${k + 1}`).toBe(running)
        expect(jobs, `단계 ${k + 1}`).not.toContain(running)
        // 새로 넣은 Job은 기존 Job 뒤에 붙는다
        expect(jobs.slice(0, prev.jobs.length - 1), `단계 ${k + 1}: 기존 Job 순서`).toEqual(
          prev.jobs.slice(1),
        )
      } else {
        // Job이 실행 중이 아닌 단계에서는 jobs가 줄어들지 않는다(Job이 시작되는 것은 running으로 보인다)
        expect(jobs.slice(0, prev.jobs.length), `단계 ${k + 1}`).toEqual(prev.jobs)
      }
    })
  })

  it('③ 모든 Job은 한 번씩만 실행되고 마지막에는 jobs가 비었다', () => {
    const ran = steps
      .map((s) => s.state.running)
      .filter((r, k) => r !== '동기 코드' && r !== '없음' && r !== steps[k - 1]?.state.running)
    expect(new Set(ran).size).toBe(ran.length)
    const last = steps.at(-1)!.state
    expect(last.jobs).toEqual([])
    expect(last.running).toBe('없음')
    expect(last.promises.every((p) => p.state !== 'pending')).toBe(true)
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
})

// --- 본문 주장 검증 ------------------------------------------------------------------------------

// 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
function errorName(code: string): string {
  try {
    runInNewContext(code, { console: { log: () => {} } })
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

type Settled =
  { ok: true; value: unknown } | { ok: false; name: string; message: string; errors?: string[] }

// 식이 돌려주는 프로미스가 정해진 결과를 JSON으로 옮겨 읽는다.
async function settle(expression: string): Promise<Settled> {
  const sandbox: { result?: string } = {}
  runInNewContext(
    `(${expression}).then(function (v) {
  result = JSON.stringify({ ok: true, value: v });
}, function (e) {
  result = JSON.stringify({
    ok: false,
    name: e && e.name,
    message: e && e.message,
    errors: e && e.errors ? e.errors.map(function (x) { return x.message; }) : undefined
  });
});`,
    sandbox,
  )
  await nextMacrotask()
  return JSON.parse(sandbox.result!) as Settled
}

describe('본문 주장 검증', () => {
  it('Promise 생성자는 executor가 없거나 new 없이 부르면 TypeError다', () => {
    expect(errorName('new Promise()')).toBe('TypeError')
    expect(errorName('new Promise(1)')).toBe('TypeError')
    expect(errorName('Promise(function () {})')).toBe('TypeError')
  })

  it('executor가 throw하면 그 프로미스는 그 사유로 거부된다', async () => {
    expect(
      await settle(`new Promise(function () { throw new TypeError('in executor'); })`),
    ).toMatchObject({ ok: false, name: 'TypeError', message: 'in executor' })
  })

  it('이미 resolve한 뒤의 throw·reject는 효과가 없다', async () => {
    expect(
      await settle(
        `new Promise(function (resolve) { resolve('first'); throw new Error('ignored'); })`,
      ),
    ).toEqual({ ok: true, value: 'first' })
  })

  it('다른 프로미스로 resolve한 프로미스는 pending이어도 이미 resolved라서 reject해도 효과가 없다', async () => {
    expect(
      await settle(
        `new Promise(function (resolve, reject) {
  resolve(Promise.resolve('followed'));
  reject(new Error('no effect'));
})`,
      ),
    ).toEqual({ ok: true, value: 'followed' })
  })

  it('자기 자신으로 resolve하면 TypeError로 거부된다', async () => {
    expect(
      await settle(
        `(function () { var p = Promise.resolve().then(function () { return p; }); return p; })()`,
      ),
    ).toMatchObject({ ok: false, name: 'TypeError' })
  })

  it('catch(f)는 이 프로미스의 then을 (undefined, f)로 부른다', () => {
    const result = runInNewContext(
      `var seen;
var p = Promise.resolve();
p.then = function (a, b) { seen = [a, b]; return 'from then'; };
var f = function () {};
var r = p.catch(f);
JSON.stringify([seen[0] === undefined, seen[1] === f, r])`,
    )
    expect(result).toBe('[true,true,"from then"]')
  })

  it('함수가 아닌 인수는 값을 그대로 통과시킨다', async () => {
    expect(
      await settle(`Promise.resolve(5).then(null).then(undefined, null).then('not a function')`),
    ).toEqual({ ok: true, value: 5 })
    expect(
      await settle(`Promise.reject(new RangeError('kept')).then(null).then(function () {})`),
    ).toMatchObject({ ok: false, name: 'RangeError', message: 'kept' })
  })

  it('catch 콜백이 정상 반환하면 다음 프로미스는 그 반환값으로 이행된다', async () => {
    expect(
      await settle(`Promise.reject(new Error('x')).catch(function () { return 'recovered'; })`),
    ).toEqual({
      ok: true,
      value: 'recovered',
    })
  })

  it('Promise.resolve(p)는 같은 생성자의 프로미스를 그대로 돌려주고, thenable은 새 프로미스로 감싼다', () => {
    expect(
      runInNewContext(`var p = Promise.resolve(1);
var t = { then: function () {} };
JSON.stringify([Promise.resolve(p) === p, Promise.resolve(t) === t, p.then(function () {}) === p])`),
    ).toBe('[true,false,false]')
  })

  it('finally 콜백이 거부된 프로미스를 반환하면 그 사유로 바뀐다', async () => {
    expect(
      await settle(
        `Promise.resolve('data').finally(function () { return Promise.reject(new Error('from finally')); })`,
      ),
    ).toMatchObject({ ok: false, message: 'from finally' })
  })

  it('finally 콜백이 정상 반환하면 원래 값이나 거부 사유가 그대로 이어진다', async () => {
    expect(
      await settle(`Promise.resolve('data').finally(function () { return 'ignored'; })`),
    ).toEqual({
      ok: true,
      value: 'data',
    })
    expect(
      await settle(
        `Promise.reject(new RangeError('kept')).finally(function () { return 'ignored'; })`,
      ),
    ).toMatchObject({ ok: false, name: 'RangeError', message: 'kept' })
  })

  it('finally 콜백이 반환한 프로미스가 이행될 때까지 기다린 뒤 원래 값을 잇는다', () => {
    const order: string[] = []
    runInNewContext(
      `Promise.resolve('orig')
  .finally(function () { return Promise.resolve().then(function () { log('inside'); }); })
  .then(function (v) { log('after ' + v); });`,
      { log: (s: string) => order.push(s) },
      { microtaskMode: 'afterEvaluate' },
    )
    expect(order).toEqual(['inside', 'after orig'])
  })

  it('finally 콜백이 영영 pending인 프로미스를 반환하면 다음 프로미스도 pending이다', async () => {
    const sandbox: { done?: boolean } = {}
    runInNewContext(
      `Promise.resolve('x').finally(function () { return new Promise(function () {}); })
  .then(function () { done = true; }, function () { done = true; });`,
      sandbox,
    )
    await nextMacrotask()
    expect(sandbox.done).toBeUndefined()
  })

  it('finally 콜백이 거부하는 thenable을 반환하면 그 사유로 바뀐다', async () => {
    expect(
      await settle(
        `Promise.resolve('o').finally(function () { return { then: function (f, r) { r(new Error('thenable rejected')); } }; })`,
      ),
    ).toMatchObject({ ok: false, message: 'thenable rejected' })
  })

  it('thenable이 또 thenable로 resolve하면 다시 따라간다', async () => {
    expect(
      await settle(
        `Promise.resolve({ then: function (f) { f({ then: function (g) { g('deep'); } }); } })`,
      ),
    ).toEqual({ ok: true, value: 'deep' })
  })

  it('Promise.any는 모두 거부되면 errors에 사유를 모은 AggregateError로 거부된다', async () => {
    expect(
      await settle(
        `Promise.any([Promise.reject(new Error('boom')), Promise.reject(new Error('boom 2'))])`,
      ),
    ).toMatchObject({ ok: false, name: 'AggregateError', errors: ['boom', 'boom 2'] })
  })

  it('Promise.all은 하나라도 거부되면, 영영 pending인 것이 있어도 그 사유로 거부된다', async () => {
    expect(
      await settle(
        `Promise.all([Promise.resolve(1), Promise.reject(new Error('boom')), new Promise(function () {})])`,
      ),
    ).toMatchObject({ ok: false, message: 'boom' })
  })

  it('Promise.all은 넣은 순서대로 값을 모으고 프로미스가 아닌 값도 받는다', async () => {
    expect(
      await settle(
        `Promise.all([new Promise(function (r) { r('slow'); }), 'plain', Promise.resolve(3)])`,
      ),
    ).toEqual({ ok: true, value: ['slow', 'plain', 3] })
  })

  it('Promise.race는 먼저 정해진 것을 따른다(영영 pending인 것이 있어도)', async () => {
    expect(
      await settle(`Promise.race([new Promise(function () {}), Promise.resolve('first')])`),
    ).toEqual({ ok: true, value: 'first' })
  })

  it('Promise.allSettled는 {status, value|reason} 배열로 이행된다', async () => {
    expect(await settle(`Promise.allSettled([Promise.resolve(1), Promise.reject('no')])`)).toEqual({
      ok: true,
      value: [
        { status: 'fulfilled', value: 1 },
        { status: 'rejected', reason: 'no' },
      ],
    })
  })
})
