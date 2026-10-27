import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type CallState, type Val } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체라 instanceof 대신 name으로 검사한다.
const errorNameOf = (source: string): string | null => {
  try {
    runInNewContext(source)
    return null
  } catch (e) {
    return (e as Error).name
  }
}

describe('본문 주장 검증', () => {
  it('함수가 아닌 값을 호출하면 TypeError: `g()()`(g()는 문자열), `x()`(x는 1)', () => {
    expect(errorNameOf("function g(){ return 'a'; } g()();")).toBe('TypeError')
    expect(errorNameOf('const x = 1; x();')).toBe('TypeError')
  })

  it('값 없는 `return;`과 return이 없는 함수의 호출 결과는 undefined', () => {
    expect(runInNewContext('function f(){ return; } typeof f()')).toBe('undefined')
    expect(runInNewContext('function f(){} typeof f()')).toBe('undefined')
  })

  it('남는 인수는 매개변수에 들어가지 않지만 arguments에는 남는다', () => {
    expect(
      runInNewContext('function f(a){ return arguments.length + " " + arguments[1]; } f(1, 2)'),
    ).toBe('2 2')
  })

  it('기본값 식은 기본값이 필요한 호출마다 평가된다', () => {
    expect(
      runInNewContext(
        'let k = 0; function f(a = ++k){ return a; } [f(), f(), f(5), f()].join(",")',
      ),
    ).toBe('1,2,5,3')
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 예제를 계측해 얻은 실제 호출 기록과 시나리오에서 뽑은 기록의 대조 + 호출 영역 일관성
// + 반환 방식 + 최종 변수 + changed 계산

function fail(message: string): never {
  expect.fail(message)
  throw new Error(message)
}

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)
const sameVal = (a: Val, b: Val): boolean => a.type === b.type && a.display === b.display

// 호출 기록: ['enter', callee, [[typeof, String]]] / ['params', callee, [[name, typeof, String]]]
// / ['exit', callee, typeof, String] / ['out', line]
type Rec = unknown[]

// 함수 머리 줄(`function name(params) {`)만 계측한다. 머리 줄 끝에 같은 줄로 __p(...)를 붙이고,
// 맨 앞에서 `name = __wrap(name, name)`으로 함수를 감싼다(함수 선언은 코드 실행 전에 만들어진다).
function runInstrumented(source: string): { records: Rec[]; snap: [string, string, string][] } {
  const records: Rec[] = []
  const names: string[] = []
  const instrumented = source.replace(
    /^function (\w+)\(([^)]*)\) \{$/gm,
    (m: string, name: string, params: string) => {
      names.push(name)
      const ps = params
        .split(',')
        .map((p) => p.trim().split('=')[0].trim())
        .filter(Boolean)
      const pairs = ps.map((p) => `[${JSON.stringify(p)}, ${p}]`).join(', ')
      return `${m} __p(${JSON.stringify(name)}, [${pairs}]);`
    },
  )
  const prelude = names.map((n) => `${n} = __wrap(${JSON.stringify(n)}, ${n});`).join(' ')
  const declared = [...source.matchAll(/^(?:const|let|var) (\w+)/gm)].map((m) => m[1])
  const snapshot = `__snap = JSON.stringify([${declared
    .map((n) => `[${JSON.stringify(n)}, typeof ${n}, String(${n})]`)
    .join(', ')}]);`
  const sandbox: Record<string, unknown> = {
    console: { log: (...a: unknown[]) => records.push(['out', format(...a)]) },
    __p: (name: string, ps: [string, unknown][]) =>
      records.push(['params', name, ps.map(([k, v]) => [k, typeof v, String(v)])]),
    __wrap: (name: string, fn: (...a: unknown[]) => unknown) =>
      function (this: unknown, ...args: unknown[]) {
        records.push(['enter', name, args.map((a) => [typeof a, String(a)])])
        const r = fn.apply(this, args)
        records.push(['exit', name, typeof r, String(r)])
        return r
      },
  }
  runInNewContext(`${prelude}\n${instrumented}\n${snapshot}`, sandbox, { timeout: 2000 })
  return { records, snap: JSON.parse(sandbox.__snap as string) as [string, string, string][] }
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 arg-count, no-return, eval-order다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['arg-count', 'no-return', 'eval-order'])
  })

  it('단계 수는 10 / 15 / 12이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([10, 15, 12])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const steps = scenario.steps
  const lineTextOf = (i: number): string => {
    const line = steps[i].line
    expect(line, `단계 ${i + 1}: line이 필요합니다`).toBeDefined()
    expect(line!.from, `단계 ${i + 1}: line은 한 줄이어야 합니다`).toBe(line!.to)
    return source().split('\n')[line!.from - 1]
  }
  const stateAt = (i: number): CallState => (i < 0 ? steps[0].state : steps[i].state)

  // 함수 머리 줄에서 매개변수 이름 순서를 읽는다.
  const paramNamesOf = (callee: string): string[] => {
    const m = new RegExp(`^function ${callee}\\(([^)]*)\\) \\{$`, 'm').exec(source())
    if (!m) return fail(`함수 ${callee}의 머리 줄을 찾지 못했습니다`)
    return m[1]
      .split(',')
      .map((p) => p.trim().split('=')[0].trim())
      .filter(Boolean)
  }

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('첫 단계는 line이 없는 빈 상태·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ bindings: [], pending: null, call: null })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
    })
  })

  it('호출 기록 대조: 예제를 계측해 얻은 실제 기록(순서까지) = 시나리오에서 뽑은 기록', () => {
    const real = runInstrumented(source()).records
    const fromSteps: Rec[] = []
    steps.forEach((step, i) => {
      const prev = stateAt(i - 1)
      const { call } = step.state
      if (i > 0 && call && prev.call?.id !== call.id) {
        fromSteps.push(['enter', call.callee, call.args.map((a) => [a.type, a.display])])
        fromSteps.push([
          'params',
          call.callee,
          call.params.map((p) => [p.name, p.value.type, p.value.display]),
        ])
      }
      if (i > 0 && call?.result && !(prev.call?.id === call.id && prev.call.result)) {
        fromSteps.push(['exit', call.callee, call.result.value.type, call.result.value.display])
      }
      const before = i === 0 ? 0 : (steps[i - 1].output ?? []).length
      for (const line of (step.output ?? []).slice(before)) fromSteps.push(['out', line])
    })
    expect(fromSteps, '시나리오의 호출·반환·출력 순서가 실제 실행 기록과 다릅니다').toEqual(real)
  })

  describe('호출 영역 일관성', () => {
    it('호출 id 중복·같은 id의 호출은 result 외에 그대로', () => {
      const seen = new Map<string, string>()
      const ids: string[] = []
      steps.forEach((step, i) => {
        const call = step.state.call
        if (!call) return
        const { result: _result, ...rest } = call
        void _result
        const key = JSON.stringify(rest)
        const prevKey = seen.get(call.id)
        if (prevKey === undefined) {
          seen.set(call.id, key)
          ids.push(call.id)
        } else {
          expect(key, `단계 ${i + 1}: 같은 호출 ${call.id}의 내용이 바뀌었습니다`).toBe(prevKey)
        }
      })
      expect(duplicates(ids)).toEqual([])
    })

    it('ignored = args.slice(params.length), 매개변수 이름·순서·from·값이 인수와 맞다', () => {
      steps.forEach((step, i) => {
        const call = step.state.call
        if (!call) return
        const where = `단계 ${i + 1}`
        const names = paramNamesOf(call.callee)
        expect(
          call.params.map((p) => p.name),
          `${where}: 매개변수 이름·순서가 함수 머리 줄과 다릅니다`,
        ).toEqual(names)
        expect(call.ignored, `${where}: ignored가 args.slice(params.length)와 다릅니다`).toEqual(
          call.args.slice(names.length),
        )
        call.params.forEach((p, k) => {
          if (k < call.args.length) {
            expect(p.from, `${where}: ${p.name}의 from`).toBe('argument')
            expect(sameVal(p.value, call.args[k]), `${where}: ${p.name}의 값 = args[${k}]`).toBe(
              true,
            )
          } else {
            expect(p.from, `${where}: ${p.name}의 from`).toBe('missing')
            expect(p.value, `${where}: ${p.name}의 값은 undefined`).toEqual({
              type: 'undefined',
              display: 'undefined',
            })
          }
        })
      })
    })

    it('새 call.code와 새 pending.code는 그 단계 강조 줄 원문에 들어 있다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        const prev = stateAt(i - 1)
        const { call, pending } = step.state
        if (call && prev.call?.id !== call.id) {
          expect(lineTextOf(i).includes(call.code), `단계 ${i + 1}: call.code "${call.code}"`).toBe(
            true,
          )
        }
        if (pending && JSON.stringify(pending) !== JSON.stringify(prev.pending)) {
          expect(
            lineTextOf(i).includes(pending.code),
            `단계 ${i + 1}: pending.code "${pending.code}"`,
          ).toBe(true)
        }
      })
    })

    it('pending에 채워진 값은 그 뒤 같은 callee 호출의 args와 같은 위치 값이다', () => {
      steps.forEach((step, i) => {
        const pending = step.state.pending
        if (!pending) return
        const later = steps
          .slice(i + 1)
          .map((s) => s.state.call)
          .find((c) => c && c.callee === pending.callee)
        if (!later) return fail(`단계 ${i + 1}: 이후 ${pending.callee} 호출이 없습니다`)
        expect(later.code, `단계 ${i + 1}: pending.code = 이후 호출의 code`).toBe(pending.code)
        expect(later.args.length, `단계 ${i + 1}: 인수 개수`).toBe(pending.args.length)
        pending.args.forEach((v, k) => {
          if (v === null) return
          expect(
            sameVal(v, later.args[k]),
            `단계 ${i + 1}: pending.args[${k}]이 이후 호출의 args[${k}]와 다릅니다`,
          ).toBe(true)
        })
      })
    })
  })

  it('반환 방식(how)은 그 단계 강조 줄 원문과 맞다', () => {
    steps.forEach((step, i) => {
      const call = step.state.call
      if (!call?.result) return
      const prev = i === 0 ? null : stateAt(i - 1).call
      if (prev?.id === call.id && prev.result) return // 결과가 처음 나타난 단계만 검사
      const text = lineTextOf(i).trim()
      const where = `단계 ${i + 1}`
      switch (call.result.how) {
        case 'return-empty':
          expect(text, `${where}: return-empty는 return; 줄`).toBe('return;')
          break
        case 'return':
          expect(text.startsWith('return '), `${where}: return은 "return 식;" 줄`).toBe(true)
          break
        case 'end':
          expect(text, `${where}: end는 함수 본문을 닫는 }줄`).toBe('}')
          break
      }
    })
  })

  it('최종 변수는 예제 끝 스냅샷과 같고, 변수가 생기는 단계의 값은 바로 앞 단계 호출 결과다', () => {
    const real = runInstrumented(source()).snap
    const last = steps[steps.length - 1].state.bindings
    expect(
      last.map((b) => [b.name, b.value.type, b.value.display]),
      '마지막 단계의 변수가 실제 실행 결과와 다릅니다',
    ).toEqual(real)
    steps.forEach((step, i) => {
      if (i === 0) return
      const prevNames = new Set(stateAt(i - 1).bindings.map((b) => b.name))
      for (const b of step.state.bindings) {
        if (prevNames.has(b.name)) continue
        const result = stateAt(i - 1).call?.result
        if (!result)
          return fail(`단계 ${i + 1}: ${b.name}이 생기는데 앞 단계에 호출 결과가 없습니다`)
        expect(
          sameVal(b.value, result.value),
          `단계 ${i + 1}: ${b.name}의 값이 앞 단계 호출 결과와 다릅니다`,
        ).toBe(true)
        expect(
          new RegExp(`\\b${b.declaredWith} ${b.name}\\b`).test(source()),
          `단계 ${i + 1}: ${b.name}`,
        ).toBe(true)
      }
      expect(duplicates(step.state.bindings.map((b) => b.name)), `단계 ${i + 1}`).toEqual([])
    })
  })

  it('changed는 이전 단계와 비교해 새로 생기거나 값이 바뀐 변수에만 붙는다', () => {
    steps.forEach((step, i) => {
      const prev = i === 0 ? { bindings: [] } : stateAt(i - 1)
      for (const b of step.state.bindings) {
        const before = prev.bindings.find((p) => p.name === b.name)
        const expected = !before || !sameVal(before.value, b.value) ? true : undefined
        expect(b.changed, `단계 ${i + 1}: 변수 ${b.name}의 changed가 계산값과 다릅니다`).toBe(
          expected,
        )
      }
    })
  })
})
