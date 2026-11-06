import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type DefaultParametersState, type EnvRecord } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체이므로 name으로 비교한다.
const errorName = (code: string) => {
  try {
    runInNewContext(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

describe('본문 주장 검증', () => {
  it('기본값이 없으면 본문의 var x는 새 값 없이 인수 값 그대로다', () => {
    expect(runInNewContext("function f(x) { var x; return x; } f('arg')")).toBe('arg')
  })

  it('rest가 있으면 sloppy여도 arguments와 연결되지 않는다', () => {
    expect(runInNewContext('function f(a, ...r) { a = 2; return arguments[0]; } f(0)')).toBe(0)
  })

  it("rest 매개변수가 있는 함수 본문의 'use strict'는 SyntaxError다", () => {
    expect(errorName(`new Function('...r', "'use strict'; return r;")`)).toBe('SyntaxError')
  })

  it('rest만 있고 식이 없으면 var x는 같은 레코드를 쓰므로 인수 값이다', () => {
    expect(runInNewContext("function f(x, ...r) { var x; return x; } f('arg')")).toBe('arg')
  })

  it('기본값 안의 함수는 뒤 매개변수가 초기화된 뒤에 호출하면 오류가 나지 않는다', () => {
    expect(runInNewContext('function f(g = () => b, b = 1) { return g(); } f()')).toBe(1)
  })

  it('undefined를 직접 넘겨도 기본값 식이 평가된다(필수 인수 패턴)', () => {
    expect(
      errorName(
        `function need() { throw new TypeError('x'); } function f(a = need()) {} f(undefined)`,
      ),
    ).toBe('TypeError')
  })

  it('arguments 바인딩은 매개변수 레코드에 있고 본문 var arguments는 그 값으로 시작한다', () => {
    expect(
      runInNewContext(
        `function f(a, h = () => arguments[0]) {
           var arguments = 9;
           return arguments + ' ' + h();
         }
         f(7)`,
      ),
    ).toBe('9 7')
    expect(
      runInNewContext('function f(a = 1) { var arguments; return typeof arguments; } f()'),
    ).toBe('object')
  })

  it('매개변수 목록에 식이 없으면 본문의 var x는 같은 바인딩이라 매개변수를 덮어쓴다', () => {
    expect(runInNewContext("function f(x) { var x = 'body'; return arguments[0]; } f('arg')")).toBe(
      'body',
    )
  })

  it('바깥에 같은 이름이 있어도 초기화 전인 매개변수를 읽으면 ReferenceError다', () => {
    expect(errorName("var x = 'outer'; function f(x = x) {} f()")).toBe('ReferenceError')
  })

  it.each([
    ['함수 선언', 'function y() {}'],
    ['let', 'let y = 1;'],
    ['const', 'const y = 1;'],
    ['클래스', 'class y {}'],
  ])('기본값 안의 함수는 본문의 %s를 보지 못한다', (_, decl) => {
    const code = `function f(g = () => typeof y) { ${decl} return g(); } f()`
    expect(runInNewContext(code)).toBe('undefined')
    expect(runInNewContext("'use strict'; " + code)).toBe('undefined')
  })

  it('이름 있는 함수 식도 기본값 안에서는 본문의 var를 보지 못한다', () => {
    expect(
      runInNewContext(
        "var x = 'outer'; function f(g = function n() { return x; }) { var x = 'body'; return g(); } f()",
      ),
    ).toBe('outer')
  })

  it('이름 중복은 단순하지 않은 목록이면 식이 없어도 SyntaxError다', () => {
    expect(errorName(`new Function('a', '...a', '')`)).toBe('SyntaxError')
    expect(runInNewContext(`new Function('a', 'a', 'return a;')(1, 2)`)).toBe(2)
  })

  it('같은 이름의 let은 매개변수 목록에 식이 없어도 SyntaxError다', () => {
    expect(errorName(`new Function('a', 'let a;')`)).toBe('SyntaxError')
  })

  it('매핑된 arguments도 넘기지 않은 인수의 매개변수와는 연결되지 않는다', () => {
    expect(runInNewContext('function f(a) { a = 2; return typeof arguments[0]; } f()')).toBe(
      'undefined',
    )
  })

  it("파일 첫 줄 'use strict'면 단순한 매개변수도 arguments와 연결되지 않는다", () => {
    expect(
      runInNewContext("'use strict'; function plain(a) { a = 2; return arguments[0]; } plain(0)"),
    ).toBe(0)
  })

  it("파일 첫 줄 'use strict'와 기본값 함수는 함께 허용된다", () => {
    expect(runInNewContext("'use strict'; function f(a = 1) { return a; } f()")).toBe(1)
  })

  it('화살표 함수와 메서드 축약에서도 기본값 안의 함수는 바깥 x(outer)를 본다', () => {
    expect(
      runInNewContext(
        "var x = 'outer'; var f = (g = () => x) => { var x = 'body'; return g(); }; f()",
      ),
    ).toBe('outer')
    expect(
      runInNewContext("var x = 'outer'; ({ m(g = () => x) { var x = 'body'; return g(); } }).m()"),
    ).toBe('outer')
  })

  it('매개변수와 같은 이름의 let은 SyntaxError다', () => {
    expect(errorName('new Function("a = 1", "let a;")')).toBe('SyntaxError')
    expect(errorName('eval("function f(a = 1) { let a; }")')).toBe('SyntaxError')
  })

  it('식이 있는 목록에서 중복 매개변수 이름은 SyntaxError다', () => {
    expect(errorName('eval("function f(a, a = 1) {}")')).toBe('SyntaxError')
  })
})

// --- 시나리오 검사 ----------------------------------------------------------------------------

const byId = (s: DefaultParametersState) => new Map<string, EnvRecord>(s.envs.map((e) => [e.id, e]))

// 레코드 id에서 outerId를 따라 닿는 id들(자기 자신 포함)
function chain(s: DefaultParametersState, start: string | null): string[] {
  const m = byId(s)
  const out: string[] = []
  let cur: string | null = start
  while (cur !== null) {
    const rec = m.get(cur)
    expect(rec, `레코드 ${cur}가 envs에 없습니다`).toBeDefined()
    out.push(cur)
    cur = rec!.outerId
  }
  return out
}

const hasBinding = (
  e: EnvRecord,
  name: string,
): { b: Binding; part?: 'declarative' | 'object' } | null => {
  const d = e.bindings.find((b) => b.name === name)
  if (d) return { b: d, ...(e.kind === 'global' && { part: 'declarative' as const }) }
  const o = e.objectBindings?.find((b) => b.name === name)
  return o ? { b: o, part: 'object' } : null
}

const sameBinding = (a: Binding, b: Binding) => a.value === b.value && a.state === b.state

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const label = (n: number) => `단계 ${n + 1}(${scenario.steps[n].title})`

  it('공통 불변식(코드 원문, 출력, 줄 범위)', () => {
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('첫 단계: 프리렌더에서 읽히는 실행 전 상태(줄 강조·탐색·함수 없음)', () => {
    const first = scenario.steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state.running).toBe('실행 전')
    expect(first.state.lexicalEnv).toBeNull()
    expect(first.state.lookup).toBeNull()
    expect(first.state.functions).toEqual([])
    expect(first.state.envs.map((e) => e.id)).toEqual(['global'])
    expect(first.output).toEqual([])
  })

  it('바깥 연결: vars → params → global, 전역만 objectBindings를 쓴다', () => {
    scenario.steps.forEach((step, n) => {
      const s = step.state
      const ids = s.envs.map((e) => e.id)
      expect(new Set(ids).size, `${label(n)}: env id 중복`).toBe(ids.length)
      expect(ids[0], `${label(n)}: 첫 레코드는 전역`).toBe('global')
      const expectedOuter = { global: null, params: 'global', vars: 'params' } as const
      for (const e of s.envs) {
        expect(e.kind, `${label(n)}: kind는 id와 같다`).toBe(e.id)
        expect(e.outerId, `${label(n)}: ${e.id}의 바깥`).toBe(expectedOuter[e.id])
        if (e.id !== 'global')
          expect(e.objectBindings, `${label(n)}: ${e.id}는 객체 칸이 없다`).toBeUndefined()
      }
      if (ids.includes('vars'))
        expect(ids, `${label(n)}: vars에는 params가 필요`).toContain('params')
      if (s.lexicalEnv !== null)
        expect(ids, `${label(n)}: lexicalEnv가 envs에 없음`).toContain(s.lexicalEnv)
      if (s.lexicalEnv === null)
        expect(['실행 전', 'get 호출'], `${label(n)}: lexicalEnv null`).toContain(s.running)
    })
  })

  it('함수 객체의 environmentId는 항상 params이고 단계가 이어지는 동안 바뀌지 않는다', () => {
    scenario.steps.forEach((step, n) => {
      const s = step.state
      for (const f of s.functions) {
        expect(f.environmentId, `${label(n)}: ${f.id}`).toBe('params')
        expect(
          s.envs.map((e) => e.id),
          `${label(n)}: params가 없음`,
        ).toContain('params')
      }
    })
  })

  it('호출이 끝난 단계(전역 코드)에는 params·vars·함수가 없다', () => {
    scenario.steps.forEach((step, n) => {
      const s = step.state
      if (s.running === '전역 코드') {
        expect(
          s.envs.map((e) => e.id),
          `${label(n)}: 전역 코드 단계의 레코드`,
        ).toEqual(['global'])
        expect(s.functions, `${label(n)}: 전역 코드 단계의 함수`).toEqual([])
        expect(s.lexicalEnv, `${label(n)}: 전역 코드 단계의 lexicalEnv`).toBe('global')
      } else if (s.running !== '실행 전') {
        expect(
          s.envs.map((e) => e.id),
          `${label(n)}: 호출 중에는 params가 있다`,
        ).toContain('params')
      }
    })
    const callEnd = scenario.steps.findIndex(
      (st, n) => n > 0 && st.state.running === '전역 코드' && st.state.envs.length === 1,
    )
    expect(callEnd).toBeGreaterThan(0)
  })

  it('탐색 재계산: 경로·foundIn·part·result가 상태와 같다', () => {
    let count = 0
    scenario.steps.forEach((step, n) => {
      const s = step.state
      const lk = s.lookup
      if (!lk) return
      count++
      let start: string | null
      if (lk.start === 'context') start = s.lexicalEnv
      else {
        const f = s.functions.find((x) => x.id === lk.start)
        expect(f, `${label(n)}: start 함수 ${lk.start}`).toBeDefined()
        start = f!.environmentId
      }
      const m = byId(s)
      const walked: string[] = []
      let found: { id: string; b: Binding; part?: 'declarative' | 'object' } | null = null
      for (const id of chain(s, start)) {
        walked.push(id)
        const hit = hasBinding(m.get(id)!, lk.name)
        if (hit) {
          found = { id, ...hit }
          break
        }
      }
      expect(found, `${label(n)}: ${lk.name}을 찾지 못함`).not.toBeNull()
      expect(lk.foundIn, `${label(n)}: foundIn`).toBe(found!.id)
      expect(lk.path, `${label(n)}: path`).toEqual(walked)
      expect(found!.b.state, `${label(n)}: 초기화된 바인딩`).toBe('initialized')
      expect(lk.result, `${label(n)}: result`).toBe(found!.b.value)
      expect(lk.part, `${label(n)}: part`).toBe(found!.part)
      if (s.running === 'get 호출') expect(lk.start, `${label(n)}: get 안 탐색`).not.toBe('context')
    })
    expect(count).toBeGreaterThan(0)
  })

  it('created·changed 표시가 직전 단계와의 차이와 맞는다', () => {
    scenario.steps.forEach((step, n) => {
      const prev = n > 0 ? scenario.steps[n - 1].state : undefined
      const prevMap = new Map((prev?.envs ?? []).map((e) => [e.id, e]))
      for (const e of step.state.envs) {
        const where = `${label(n)}: ${e.id}`
        const old = prevMap.get(e.id)
        expect(e.created === true, `${where}의 created`).toBe(!old)
        const all = [...e.bindings, ...(e.objectBindings ?? [])]
        const oldAll = old ? [...old.bindings, ...(old.objectBindings ?? [])] : []
        for (const b of all) {
          const ob = oldAll.find((x) => x.name === b.name)
          const expected = !ob || !sameBinding(ob, b)
          expect(b.changed === true, `${where}.${b.name}의 changed`).toBe(expected)
        }
      }
    })
  })
})

describe('시나리오 결과 대조', () => {
  it('param-scope: get 안 탐색은 전역 x(outer), 본문 탐색은 vars의 x(body)', () => {
    const steps = scenarios.find((s) => s.id === 'param-scope')!.steps
    const inGet = steps.find((st) => st.state.running === 'get 호출')!.state.lookup!
    expect(inGet.path).toEqual(['params', 'global'])
    expect(inGet.result).toBe("'outer'")
    const body = steps.filter((st) => st.state.lookup?.start === 'context')
    expect(body.map((st) => st.state.lookup!.result)).toEqual(["'body'"])
    expect(exampleOf('param-scope').expectedOutput).toEqual(['outer body'])
  })

  it('same-name-var: 본문 x의 변경은 params의 x를 바꾸지 않는다', () => {
    const steps = scenarios.find((s) => s.id === 'same-name-var')!.steps
    const last = steps.find((st) => st.state.running === 'get 호출')!.state
    const x = (id: string) =>
      last.envs.find((e) => e.id === id)!.bindings.find((b) => b.name === 'x')!
    expect(x('params').value).toBe("'arg'")
    expect(x('vars').value).toBe("'body'")
    expect(last.lookup!.result).toBe("'arg'")
  })
})
