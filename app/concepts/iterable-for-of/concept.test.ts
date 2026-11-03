import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type ProtocolCall } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

// --- 호출 기록 헬퍼 ------------------------------------------------------------------------------

type CallRecord = { kind: 'get-iterator' } | { kind: 'next'; value: string; done: boolean }

// 새 컨텍스트에서 %ArrayIteratorPrototype%.next와 Array.prototype[Symbol.iterator]를
// 원래 함수를 부르는 기록용 함수로 감싼 뒤 예제를 실행한다.
// for...of는 GetIterator에서 Symbol.iterator 메서드를, 반복마다 next를 프로퍼티 조회로 부르므로 감싼 함수가 불린다.
// 값은 시나리오와 같은 표시용 표기(문자열은 따옴표, 그 밖은 String)로 기록한다.
function runWithTrace(source: string): { trace: CallRecord[]; output: string[] } {
  const trace: CallRecord[] = []
  const output: string[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  const install = runInContext(
    `(function (rec) {
  var arrayIterProto = Object.getPrototypeOf([][Symbol.iterator]());
  var origNext = arrayIterProto.next;
  arrayIterProto.next = function () {
    var r = origNext.call(this);
    rec({
      kind: 'next',
      value: typeof r.value === 'string' ? "'" + r.value + "'" : String(r.value),
      done: r.done,
    });
    return r;
  };
  var origIter = Array.prototype[Symbol.iterator];
  Array.prototype[Symbol.iterator] = function () {
    rec({ kind: 'get-iterator' });
    return origIter.call(this);
  };
})`,
    context,
  ) as (rec: (r: CallRecord) => void) => void
  install((r) => trace.push(r))
  runInContext(source, context, { timeout: 2000 })
  return { trace, output }
}

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

// 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
function errorName(code: string): string {
  try {
    runInNewContext(code, { console: { log: () => {} } })
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

const run = (code: string): unknown => runInNewContext(code)

// --- 본문 주장 검증 ------------------------------------------------------------------------------

describe('본문 주장 검증', () => {
  it('Symbol.iterator 메서드가 없는 일반 객체와 null에 for...of를 쓰면 TypeError다', () => {
    expect(errorName('for (var x of {a: 1}) {}')).toBe('TypeError')
    expect(errorName('for (var x of null) {}')).toBe('TypeError')
  })

  it('length와 인덱스 키만 있는 유사 배열 객체는 for...of도 스프레드도 TypeError지만 Array.from은 length로 읽는다', () => {
    expect(errorName("for (var x of { 0: 'a', length: 1 }) {}")).toBe('TypeError')
    expect(errorName('[...{a: 1}]')).toBe('TypeError')
    expect(run("JSON.stringify(Array.from({ 0: 'a', 1: 'b', length: 2 }))")).toBe('["a","b"]')
  })

  it('for...in은 null을 만나면 반복하지 않는다', () => {
    expect(run('var n = 0; for (var k in null) n++; n')).toBe(0)
  })

  it('next가 객체가 아닌 값을 돌려주면 TypeError다', () => {
    expect(
      errorName('for (var x of { [Symbol.iterator]() { return { next() { return 1 } } } }) {}'),
    ).toBe('TypeError')
  })

  it('Symbol.iterator 메서드가 객체가 아닌 값을 돌려주면 TypeError다', () => {
    expect(errorName('for (var x of { [Symbol.iterator]() { return 1 } }) {}')).toBe('TypeError')
  })

  it('결과 객체에 done이 없으면 false로 보고 계속 돈다', () => {
    expect(
      run(`
var i = 0;
var seen = [];
for (var x of { [Symbol.iterator]() { return { next() { i++; return i < 3 ? { value: i } : { done: true } } } } }) seen.push(x);
seen.join(',')
`),
    ).toBe('1,2')
  })

  it('끝까지 돌아 done: true로 끝나면 return을 부르지 않는다', () => {
    expect(
      run(`
var log = [];
var it = { [Symbol.iterator]() { var i = 0; return {
  next() { log.push('n'); return i++ < 1 ? { value: i, done: false } : { done: true } },
  return() { log.push('r'); return {} },
} } };
for (var x of it) {}
log.join(',')
`),
    ).toBe('n,n')
  })

  it('break할 때 return이 객체가 아닌 값을 돌려주면 TypeError다', () => {
    expect(
      errorName(`
var it = { [Symbol.iterator]() { return {
  next() { return { value: 1, done: false } },
  return() { return 1 },
} } };
for (var x of it) break;
`),
    ).toBe('TypeError')
  })

  it('끝난 배열 이터레이터는 배열에 push해도 다시 돌지 않는다', () => {
    expect(
      run(`
var arr = [1];
var it = arr[Symbol.iterator]();
it.next(); it.next();
arr.push(2);
JSON.stringify(it.next())
`),
    ).toBe('{"done":true}')
  })

  it('배열 이터레이터의 프로토타입의 프로토타입에 자기 Symbol.iterator가 있다', () => {
    expect(
      run(`
var it = [][Symbol.iterator]();
var proto = Object.getPrototypeOf(it);
var protoProto = Object.getPrototypeOf(proto);
[
  Object.prototype.hasOwnProperty.call(it, Symbol.iterator),
  Object.prototype.hasOwnProperty.call(proto, Symbol.iterator),
  Object.prototype.hasOwnProperty.call(protoProto, Symbol.iterator),
].join(',')
`),
    ).toBe('false,false,true')
  })

  it('arguments 객체의 Symbol.iterator는 Array.prototype.values다', () => {
    expect(
      run('(function () { return arguments[Symbol.iterator] === Array.prototype.values; })(1)'),
    ).toBe(true)
  })

  it('Symbol.iterator가 null이거나 함수가 아닌 값이어도 for...of는 TypeError다', () => {
    expect(errorName('for (var x of { [Symbol.iterator]: null }) {}')).toBe('TypeError')
    expect(errorName('for (var x of { [Symbol.iterator]: 1 }) {}')).toBe('TypeError')
  })

  it('next만 가진 직접 만든 이터레이터는 이터러블이 아니라 for...of에 넣으면 TypeError다', () => {
    expect(
      errorName(
        'var c = { [Symbol.iterator]() { return { next() { return { done: true }; } }; } }; for (var n of c[Symbol.iterator]()) {}',
      ),
    ).toBe('TypeError')
  })

  it('join은 undefined 요소를 빈 문자열로 바꾼다', () => {
    expect(run('[1, undefined, 3].join()')).toBe('1,,3')
  })
})

// --- 시나리오 검사 -------------------------------------------------------------------------------

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 array-loop, custom-break이다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['array-loop', 'custom-break'])
  })

  it('라벨과 exampleId가 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.label)).toEqual([
      '배열을 for...of로',
      '직접 만든 이터러블과 break',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['array-loop', 'custom-iterable'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 각각 9, 13이다(a11y e2e의 20단계 이하 전제)', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([9, 13])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)!
  const source = () => readExample(example.file)
  const steps = scenario.steps
  const allCalls = (): ProtocolCall[] => steps.flatMap((s) => s.state.calls)

  it('① 공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('첫 단계는 line이 없는 빈 상태·빈 출력이고, 나머지 단계는 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ iterable: null, iterator: null, binding: null, calls: [] })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
    })
  })

  it('한 줄 line만 쓰고, 객체 선언 범위(1~15)만 예외다', () => {
    steps.slice(1).forEach((step, k) => {
      const { from, to } = step.line!
      if (scenario.id === 'custom-break' && k === 0) {
        expect({ from, to }, '단계 2').toEqual({ from: 1, to: 15 })
      } else {
        expect(from, `단계 ${k + 2}`).toBe(to)
      }
    })
  })

  it('필드 changed는 이전 단계와 값이 달라진 단계에서만 true다', () => {
    steps.forEach((step, i) => {
      const prevFields = i === 0 ? undefined : steps[i - 1].state.iterator?.fields
      for (const f of step.state.iterator?.fields ?? []) {
        const old = prevFields?.find((p) => p.name === f.name)
        const changed = old !== undefined && old.value !== f.value
        expect(f.changed === true, `단계 ${i + 1}: ${f.name}`).toBe(changed)
      }
    })
  })

  it('프로토콜 호출은 그 호출의 결과가 정해지는 줄의 단계에만 있다', () => {
    const lines = source().split('\n')
    steps.slice(1).forEach((step, i) => {
      const text = lines[step.line!.from - 1]
      for (const c of step.state.calls) {
        if (c.kind === 'get-iterator') expect(text, `단계 ${i + 2}`).toContain('for (')
        if (c.kind === 'next' && scenario.id === 'array-loop')
          expect(text, `단계 ${i + 2}`).toContain('for (')
        if (c.kind === 'next' && scenario.id === 'custom-break')
          expect(text, `단계 ${i + 2}`).toContain('return left > 0')
        if (c.kind === 'return') expect(text, `단계 ${i + 2}`).toContain('return { done: true }')
      }
    })
  })

  if (scenario.id === 'array-loop') {
    it('② 호출 기록 대조: 모든 단계의 calls를 이은 목록 = 예제 실행 중 get-iterator·next 기록', () => {
      const { trace, output } = runWithTrace(source())
      // 메서드를 감싸도 결과가 바뀌지 않는다
      expect(output).toEqual(example.expectedOutput)

      const calls = allCalls()
      expect(calls.length, '호출 횟수').toBe(trace.length)
      calls.forEach((c, i) => {
        const t = trace[i]
        const where = `호출 ${i + 1}`
        expect(c.kind, `${where}: kind`).toBe(t.kind)
        if (c.kind === 'next' && t.kind === 'next') {
          expect(c.result.value, `${where}: value`).toBe(t.value)
          expect(c.result.done, `${where}: done`).toBe(t.done)
        }
        if (c.kind === 'get-iterator') {
          expect(c.target, `${where}: target`).toBe(steps[1].state.iterable!.name)
        }
      })
    })

    it('④ 상태 일관성: [[ArrayLikeNextIndex]]는 지금까지 done: false인 next 개수, done: true 뒤 [[IteratedArrayLike]]는 undefined', () => {
      let falseCount = 0
      let finished = false
      let lastValue: string | null = null
      steps.forEach((step, i) => {
        for (const c of step.state.calls) {
          if (c.kind !== 'next') continue
          if (c.result.done) finished = true
          else {
            falseCount++
            lastValue = c.result.value
          }
        }
        const fields = step.state.iterator?.fields
        if (fields) {
          const get = (name: string) => fields.find((f) => f.name === name)!.value
          expect(get('[[ArrayLikeNextIndex]]'), `단계 ${i + 1}: index`).toBe(String(falseCount))
          expect(get('[[IteratedArrayLike]]'), `단계 ${i + 1}: array`).toBe(
            finished ? 'undefined' : 'letters',
          )
        } else {
          expect(falseCount, `단계 ${i + 1}: 이터레이터 없이 next 호출`).toBe(0)
        }
        if (lastValue !== null) {
          expect(step.state.binding?.value, `단계 ${i + 1}: binding`).toBe(lastValue)
        } else {
          expect(step.state.binding, `단계 ${i + 1}: binding`).toBeNull()
        }
      })
    })
  } else {
    it('③ 출력 대조: calls의 next·return 순서 = 예제 출력의 next·return 줄 순서, done: false의 value = 본문 출력', () => {
      const expected = example.expectedOutput
      const markerSequence = expected.filter((l) => l === 'next' || l === 'return')
      const calls = allCalls().filter((c) => c.kind !== 'get-iterator')
      expect(calls.map((c) => c.kind)).toEqual(markerSequence)

      // done: false인 next의 value는 next·return 줄이 아닌 본문 출력을 순서대로 이룬다
      const bodyLines = expected.filter((l) => l !== 'next' && l !== 'return')
      const values = calls.flatMap((c) =>
        c.kind === 'next' && !c.result.done ? [c.result.value] : [],
      )
      expect(values).toEqual(bodyLines)

      // return은 정확히 한 번, 마지막 호출이다
      expect(calls.filter((c) => c.kind === 'return')).toHaveLength(1)
      expect(calls[calls.length - 1].kind).toBe('return')
    })

    it('④ 상태 일관성: left는 3 − done: false인 next 개수, binding은 마지막 done: false 결과의 value', () => {
      let falseCount = 0
      let lastValue: string | null = null
      steps.forEach((step, i) => {
        for (const c of step.state.calls) {
          if (c.kind === 'next' && !c.result.done) {
            falseCount++
            lastValue = c.result.value
          }
        }
        const left = step.state.iterator?.fields.find((f) => f.name === 'left')
        if (left) expect(left.value, `단계 ${i + 1}: left`).toBe(String(3 - falseCount))
        else expect(falseCount, `단계 ${i + 1}: 이터레이터 없이 next 호출`).toBe(0)
        if (lastValue !== null) {
          expect(step.state.binding?.value, `단계 ${i + 1}: binding`).toBe(lastValue)
        } else {
          expect(step.state.binding, `단계 ${i + 1}: binding`).toBeNull()
        }
      })
    })
  }
})
