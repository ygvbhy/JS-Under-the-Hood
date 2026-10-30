import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type ClosureState, type EnvRecord } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')

describe('본문 주장 검증', () => {
  it('같은 함수를 두 번 부르면 돌려받는 안쪽 함수 객체는 서로 다르다(!==)', () => {
    expect(
      runInNewContext(
        `function mk() { return function () {}; }
         const a = mk(); const b = mk(); a !== b`,
      ),
    ).toBe(true)
  })

  it('같은 호출에서 나온 두 메서드가 같은 바인딩을 공유한다(inc 뒤 get이 1)', () => {
    expect(
      runInNewContext(
        `function mk() { let n = 0; return { inc() { n += 1; }, get() { return n; } }; }
         const c = mk(); c.inc(); c.get()`,
      ),
    ).toBe(1)
  })

  it('반환한 뒤 바꾸는 함수로 바꾼 값을 읽는 함수가 읽는다(5)', () => {
    expect(
      runInNewContext(
        `function mk() { let v = 1; return { set(x) { v = x; }, get() { return v; } }; }
         const c = mk(); c.set(5); c.get()`,
      ),
    ).toBe(5)
  })

  it('전역 함수도 정의 뒤에 바뀐 전역 let의 값을 읽는다(2)', () => {
    expect(runInNewContext(`let g = 1; function read() { return g; } g = 2; read()`)).toBe(2)
  })

  it('매개변수 바인딩도 남고(mk(7)() → 7), 함수를 만든 뒤 매개변수를 바꾸면 바뀐 값을 읽는다(9)', () => {
    expect(runInNewContext('function mk(p) { return function () { return p; }; } mk(7)()')).toBe(7)
    expect(
      runInNewContext(
        `function mk(p) { const f = function () { return p; }; p = 9; return f; }
         mk(7)()`,
      ),
    ).toBe(9)
  })

  it('레코드의 바인딩과 이름이 같은 프로퍼티를 대입하면 객체에 새 프로퍼티가 생길 뿐 바인딩은 그대로다', () => {
    expect(
      runInNewContext(
        `function mk() { let balance = 100; return { get() { return balance; } }; }
         const o = mk(); const before = Object.hasOwn(o, 'balance'); o.balance = 0;
         JSON.stringify([before, Object.hasOwn(o, 'balance'), o.balance, o.get()])`,
      ),
    ).toBe('[false,true,0,100]')
  })

  it('객체와 프로토타입 체인 어디에도 없는 프로퍼티를 읽으면 undefined다', () => {
    expect(
      runInNewContext(
        `function mk() { let balance = 100; return { get() { return balance; } }; }
         const o = mk(); JSON.stringify(['balance' in o, o.balance === undefined])`,
      ),
    ).toBe('[false,true]')
  })

  it('이름 있는 함수 식의 이름은 함수 안에서만 보이고 sloppy mode에서 대입해도 바뀌지 않는다', () => {
    expect(
      runInNewContext(
        `const f = function g() { g = 1; return typeof g; };
         JSON.stringify([f(), typeof g])`,
      ),
    ).toBe('["function","undefined"]')
  })
})

describe('예제 실제 실행', () => {
  it.each(concept.examples)(
    '$file: 실제 실행 결과가 expectedOutput과 같다',
    ({ file, expectedOutput }) => {
      expect(runExample(readExample(file))).toEqual(expectedOutput)
    },
  )
})

describe('실행 방식에 따른 차이 (ES 모듈 / Node CommonJS)', () => {
  // 이 개념의 예제는 전역 객체의 프로퍼티나 최상위 this에 의존하지 않아 모듈·CommonJS 결과도 expectedOutput과 같다.
  const expected = (file: string) =>
    concept.examples.find((e) => e.file === file)!.expectedOutput.join('\n') + '\n'

  const runAs = (file: string, ext: '.mjs' | '.cjs') => {
    const dir = mkdtempSync(join(tmpdir(), 'closure-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return execFileSync(process.execPath, [path], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it.each(concept.examples.map((e) => e.file))('%s (.cjs): 클래식 스크립트와 같다', (file) => {
    expect(runAs(file, '.cjs')).toBe(expected(file))
  })

  it.each(concept.examples.map((e) => e.file))('%s (.mjs): 클래식 스크립트와 같다', (file) => {
    expect(runAs(file, '.mjs')).toBe(expected(file))
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(바깥 레코드 연결, 컨텍스트·함수 객체를 통한 도달 가능성과 retained, 함수 객체의 environmentId, 탐색 경로)
// + 예제에 탐침을 끼워 얻은 실제 값·스택·탐색 결과와의 대조
// 경로(path)·result·바깥 연결(outerId)·retained·environmentId·heldBy는 시나리오에 손으로 쓴 값이고, 아래 검사가 상태에서 다시 계산한 값과 대조한다.

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

type Holder = { text: string; env: string; name: string }
type ScenarioTable = {
  // 함수 객체 id → 그 함수 객체의 [[Environment]]
  fnEnvironment: Record<string, string>
  // 호출 id(컨텍스트 id) → 그 호출이 부르는 함수 객체 id
  callFn: Record<string, string>
  // 함수 객체 id → 그 함수 객체를 가리키는 곳(heldBy에 쓰는 문구 순서). 레코드·바인딩 이름으로 확인한다.
  holders: Record<string, Holder[]>
  // 호출 id → 탐침이 쌓는 스택 이름(기본: `#n`을 뗀 호출 id)
  probeNames?: Record<string, string>
  // `count`·`name` 바인딩이 초기화되거나 바뀌는 순서: [레코드 id, 이름, 값]
  valueChanges: [string, string, string][]
}

const tables: Record<string, ScenarioTable> = {
  counter: {
    fnEnvironment: { makeCounter: 'global', increment: 'makeCounter-lex' },
    callFn: { makeCounter: 'makeCounter', increment: 'increment' },
    holders: {
      makeCounter: [{ text: '변수 makeCounter', env: 'global', name: 'makeCounter' }],
      increment: [
        { text: '변수 next', env: 'global', name: 'next' },
        {
          text: 'makeCounter 함수 환경 레코드의 increment',
          env: 'makeCounter-fn',
          name: 'increment',
        },
      ],
    },
    valueChanges: [
      ['makeCounter-lex', 'count', '0'],
      ['makeCounter-lex', 'count', '1'],
      ['makeCounter-lex', 'count', '2'],
    ],
  },
  independent: {
    fnEnvironment: {
      makeCounter: 'global',
      first: 'makeCounter#1-lex',
      second: 'makeCounter#2-lex',
    },
    callFn: {
      'makeCounter#1': 'makeCounter',
      'makeCounter#2': 'makeCounter',
      first: 'first',
      second: 'second',
    },
    holders: {
      makeCounter: [{ text: '변수 makeCounter', env: 'global', name: 'makeCounter' }],
      first: [{ text: '변수 first', env: 'global', name: 'first' }],
      second: [{ text: '변수 second', env: 'global', name: 'second' }],
    },
    probeNames: { first: 'anon1', second: 'anon2' },
    valueChanges: [
      ['makeCounter#1-lex', 'count', '0'],
      ['makeCounter#2-lex', 'count', '0'],
      ['makeCounter#1-lex', 'count', '1'],
      ['makeCounter#1-lex', 'count', '2'],
      ['makeCounter#2-lex', 'count', '1'],
    ],
  },
  shared: {
    fnEnvironment: {
      makeCounter: 'global',
      increment: 'makeCounter-lex',
      get: 'makeCounter-lex',
    },
    callFn: { makeCounter: 'makeCounter', increment: 'increment', get: 'get' },
    holders: {
      makeCounter: [{ text: '변수 makeCounter', env: 'global', name: 'makeCounter' }],
      increment: [{ text: 'counter의 increment 메서드', env: 'global', name: 'counter' }],
      get: [{ text: 'counter의 get 메서드', env: 'global', name: 'counter' }],
    },
    valueChanges: [
      ['makeCounter-lex', 'count', '0'],
      ['makeCounter-lex', 'count', '1'],
      ['makeCounter-lex', 'count', '2'],
    ],
  },
  binding: {
    fnEnvironment: { makeGreeter: 'global', greet: 'makeGreeter-lex' },
    callFn: { makeGreeter: 'makeGreeter', greet: 'greet' },
    holders: {
      makeGreeter: [{ text: '변수 makeGreeter', env: 'global', name: 'makeGreeter' }],
      greet: [
        { text: '변수 sayHi', env: 'global', name: 'sayHi' },
        {
          text: 'makeGreeter 선언적 환경 레코드의 greet',
          env: 'makeGreeter-lex',
          name: 'greet',
        },
      ],
    },
    valueChanges: [
      ['makeGreeter-lex', 'name', "'Kim'"],
      ['makeGreeter-lex', 'name', "'Lee'"],
    ],
  },
}

describe('closure 시나리오 id', () => {
  it('시나리오 id 순서는 counter, independent, shared, binding이다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['counter', 'independent', 'shared', 'binding'])
  })

  it('exampleId는 counter, independent, shared-env, binding-not-value이다', () => {
    expect(scenarios.map((s) => s.exampleId)).toEqual([
      'counter',
      'independent',
      'shared-env',
      'binding-not-value',
    ])
  })

  it('단계 수는 14 / 20 / 16 / 10이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([14, 20, 16, 10])
  })
})

// --- 상태에서 계산하는 헬퍼 ---------------------------------------------------------------------

const envOf = (state: ClosureState, id: string) => state.envs.find((e) => e.id === id)

// 레코드 하나에서 이름 찾기. 전역 환경 레코드는 선언적 칸을 먼저, 객체 칸을 나중에 본다(전역 HasBinding).
function bindingIn(
  env: EnvRecord,
  name: string,
): { binding: Binding; part: 'declarative' | 'object' } | undefined {
  const d = env.bindings.find((b) => b.name === name)
  if (d) return { binding: d, part: 'declarative' }
  const o = env.objectBindings?.find((b) => b.name === name)
  if (o) return { binding: o, part: 'object' }
  return undefined
}

// startId부터 [[OuterEnv]]를 따라간 레코드 id들(시작 포함). 순환하면 실패한다.
function chainIds(state: ClosureState, startId: string): string[] {
  const out: string[] = []
  let cur: string | null = startId
  while (cur !== null) {
    expect(out, `[[OuterEnv]] 순환: ${cur}`).not.toContain(cur)
    out.push(cur)
    const env = envOf(state, cur)
    expect(env, `레코드 ${cur}가 없습니다`).toBeDefined()
    cur = env!.outerId
  }
  return out
}

// 실행 중 컨텍스트의 LexicalEnvironment에서 보이는 이름(안쪽이 바깥을 가린다)
function visibleBindings(state: ClosureState): Map<string, { binding: Binding; envId: string }> {
  const out = new Map<string, { binding: Binding; envId: string }>()
  const top = state.stack.at(-1)
  if (!top) return out
  for (const id of chainIds(state, top.lexicalEnv)) {
    const env = envOf(state, id)!
    for (const b of [...env.bindings, ...(env.objectBindings ?? [])]) {
      if (!out.has(b.name)) out.set(b.name, { binding: b, envId: id })
    }
  }
  return out
}

// 실행 컨텍스트들의 LexicalEnvironment·VariableEnvironment에서 바깥 연결로 닿는 레코드
function contextReachable(state: ClosureState): Set<string> {
  const out = new Set<string>()
  for (const c of state.stack) {
    for (const id of chainIds(state, c.lexicalEnv)) out.add(id)
    for (const id of chainIds(state, c.variableEnv)) out.add(id)
  }
  return out
}

// 소스에서 계산하는 선언 이름. 최상위 선언은 줄 맨 앞에서 시작하는 예제만 쓴다.
const globalNamesOf = (src: string) => ({
  object: [...src.matchAll(/^(?:function|var) (\w+)/gm)].map((m) => m[1]),
  declarative: [...src.matchAll(/^(?:let|const) (\w+)/gm)].map((m) => m[1]),
})
const nestedFnNames = (src: string) => [...src.matchAll(/^ +function (\w+)/gm)].map((m) => m[1])
const allVarNames = (src: string) => [...src.matchAll(/\bvar (\w+)/g)].map((m) => m[1])
const allLexNames = (src: string) => [...src.matchAll(/\b(?:let|const) (\w+)/g)].map((m) => m[1])

const holderPresent = (state: ClosureState, h: Holder, envs: Set<string>) => {
  if (!envs.has(h.env)) return false
  const found = bindingIn(envOf(state, h.env)!, h.name)
  return found?.binding.state === 'initialized'
}

describe.each(scenarios)('closure 시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)
  const steps = scenario.steps
  const table = tables[scenario.id]
  const stateAt = (i: number): ClosureState => steps[i].state

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source)
  })

  it('첫 두 단계: 실행 전(빈 상태, line 없음), 전역 코드의 선언 처리(전역만, line 없음, instantiation)', () => {
    expect(steps[0].title).toBe('실행 전')
    expect(steps[0].state).toEqual({ stack: [], envs: [], functions: [], lookup: null })
    expect(steps[0].line).toBeUndefined()
    expect(steps[1].title).toBe('전역 코드의 선언 처리')
    expect(steps[1].line).toBeUndefined()
    expect(stateAt(1).stack.map((c) => [c.id, c.phase])).toEqual([['global', 'instantiation']])
    expect(stateAt(1).envs.map((e) => e.id)).toEqual(['global'])
    expect(stateAt(1).lookup).toBeNull()
    steps.slice(2).forEach((step, k) => expect(step.line, `단계 ${k + 3}`).toBeDefined())
  })

  it('제목·설명이 있고 "복사"·"사라"를 쓰지 않는다', () => {
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.explanation.length).toBeGreaterThan(0)
      expect(step.title + step.explanation).not.toMatch(/복사|사라/)
    }
  })

  it('스택: 맨 아래만 전역, 나머지는 함수이고 id는 유일하며 phase instantiation은 새로 쌓은 컨텍스트뿐이다', () => {
    steps.forEach((step, i) => {
      const { stack } = step.state
      const where = `단계 ${i + 1}`
      stack.forEach((c, k) => {
        expect(c.code, `${where}: ${c.id}`).toBe(k === 0 ? 'global' : 'function')
        if (k === 0) expect(c.id).toBe('global')
        else expect(c.id).not.toBe('global')
        expect(c.phase === 'instantiation', `${where}: ${c.id}의 phase`).toBe(c.created === true)
      })
      expect(new Set(stack.map((c) => c.id)).size, `${where}: 컨텍스트 id 중복`).toBe(stack.length)
      expect(stack.length === 0, `${where}: 스택이 비는 것은 실행 전뿐`).toBe(i === 0)
    })
  })

  it('참조 무결성: 컨텍스트의 레코드, outerId, 함수 객체의 environmentId, 탐색 경로가 모두 같은 단계의 레코드를 가리킨다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const ids = state.envs.map((e) => e.id)
      const where = `단계 ${i + 1}`
      expect(new Set(ids).size, `${where}: 레코드 id 중복`).toBe(ids.length)
      expect(new Set(state.functions.map((f) => f.id)).size, `${where}: 함수 객체 id 중복`).toBe(
        state.functions.length,
      )
      expect(
        new Set(state.functions.map((f) => f.label)).size,
        `${where}: 함수 객체 label은 서로 달라야 합니다`,
      ).toBe(state.functions.length)
      for (const c of state.stack) {
        expect(ids, `${where}: ${c.id}.lexicalEnv`).toContain(c.lexicalEnv)
        expect(ids, `${where}: ${c.id}.variableEnv`).toContain(c.variableEnv)
      }
      for (const e of state.envs) {
        if (e.id === 'global') expect(e.outerId, `${where}: 전역의 바깥`).toBeNull()
        else expect(ids, `${where}: ${e.id}의 outerId`).toContain(e.outerId)
      }
      for (const f of state.functions) expect(ids, `${where}: ${f.id}`).toContain(f.environmentId)
      if (state.lookup) {
        for (const id of state.lookup.path) expect(ids, `${where}: 탐색 경로 ${id}`).toContain(id)
        if (state.lookup.foundIn !== null)
          expect(state.lookup.path, `${where}: foundIn`).toContain(state.lookup.foundIn)
      }
    })
  })

  it('각 컨텍스트의 LexicalEnvironment에서 [[OuterEnv]]를 따라가면 VariableEnvironment에 닿는다', () => {
    steps.forEach((step, i) => {
      for (const c of step.state.stack) {
        expect(chainIds(step.state, c.lexicalEnv), `단계 ${i + 1}: ${c.id}`).toContain(
          c.variableEnv,
        )
      }
    })
  })

  it('함수 환경 레코드의 바깥은 그 호출이 부른 함수 객체의 [[Environment]]이고, 함수 객체의 [[Environment]]는 표와 같다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const where = `단계 ${i + 1}`
      for (const f of state.functions) {
        expect(f.environmentId, `${where}: ${f.id}.[[Environment]]`).toBe(table.fnEnvironment[f.id])
      }
      for (const c of state.stack.slice(1)) {
        const env = envOf(state, c.variableEnv)!
        const fnId = table.callFn[c.id]
        const f = state.functions.find((x) => x.id === fnId)
        expect(fnId, `${where}: ${c.id}의 호출 표`).toBeDefined()
        expect(env.kind, `${where}: ${c.id}`).toBe('function')
        expect(f, `${where}: ${c.id}의 함수 객체`).toBeDefined()
        expect(env.outerId, `${where}: ${c.id} 함수 환경 레코드의 바깥`).toBe(f!.environmentId)
      }
    })
  })

  it('함수 환경 레코드마다 바깥이 그 레코드인 최상위 선언적 레코드가 정확히 하나 있다(sloppy 함수, 비어 있어도)', () => {
    steps.forEach((step, i) => {
      for (const env of step.state.envs.filter((e) => e.kind === 'function')) {
        const inner = step.state.envs.filter((e) => e.outerId === env.id)
        expect(inner.length, `단계 ${i + 1}: ${env.id}`).toBe(1)
        expect(inner[0].kind).toBe('declarative')
        expect(inner[0].id).toBe(env.id.replace(/-fn$/, '-lex'))
      }
    })
  })

  it('도달 가능성: 레코드는 컨텍스트 또는 남은 함수 객체의 바깥 연결로 닿는 것만 있고, 함수 객체는 가리키는 곳이 남아 있을 때만 있으며, retained는 컨텍스트로 닿지 않는 레코드뿐이다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const where = `단계 ${i + 1}`
      const fromContexts = contextReachable(state)
      // 뿌리(컨텍스트에서 닿는 레코드)에서 함수 객체와 그 [[Environment]]의 바깥 연결을 반복해서 따라간다.
      const reachableEnvs = new Set(fromContexts)
      const reachableFns = new Set<string>()
      for (let changed = true; changed;) {
        changed = false
        for (const [fnId, holders] of Object.entries(table.holders)) {
          if (reachableFns.has(fnId)) continue
          if (!holders.some((h) => holderPresent(state, h, reachableEnvs))) continue
          reachableFns.add(fnId)
          const envId = table.fnEnvironment[fnId]
          const chain: string[] = []
          let cur: string | null = envId
          while (cur !== null) {
            chain.push(cur)
            cur = envOf(state, cur)?.outerId ?? null
          }
          for (const id of chain) reachableEnvs.add(id)
          changed = true
        }
      }
      expect(state.envs.map((e) => e.id).sort(), `${where}: 레코드 집합`).toEqual(
        [...reachableEnvs].sort(),
      )
      expect(state.functions.map((f) => f.id).sort(), `${where}: 함수 객체 집합`).toEqual(
        [...reachableFns].sort(),
      )
      for (const e of state.envs) {
        expect(e.retained === true, `${where}: ${e.id}의 retained`).toBe(!fromContexts.has(e.id))
        expect(e.retained === undefined || e.retained === true).toBe(true)
        if (e.retained)
          expect(e.created, `${where}: ${e.id}는 새로 생긴 레코드가 아님`).toBeUndefined()
      }
      // heldBy: 컨텍스트로 닿는 레코드에서 그 함수 객체를 가리키는 첫 곳의 문구
      for (const f of state.functions) {
        const first = table.holders[f.id].find((h) => holderPresent(state, h, fromContexts))
        expect(first, `${where}: ${f.id}를 가리키는 곳`).toBeDefined()
        expect(f.heldBy, `${where}: ${f.id}.heldBy`).toBe(first!.text)
      }
    })
  })

  it('전역 환경 레코드: var·함수 선언은 객체 칸, let·const는 선언적 칸이다', () => {
    const names = globalNamesOf(source)
    steps.slice(1).forEach((step, k) => {
      const g = envOf(step.state, 'global')!
      const where = `단계 ${k + 2}`
      expect(g.kind).toBe('global')
      expect(g.retained, `${where}: 전역은 retained가 아님`).toBeUndefined()
      expect(
        g.objectBindings!.map((b) => b.name),
        `${where}: 객체 칸`,
      ).toEqual(names.object)
      expect(
        g.bindings.map((b) => b.name),
        `${where}: 선언적 칸`,
      ).toEqual(names.declarative)
      for (const b of g.objectBindings!) expect(b.state, `${where}: ${b.name}`).toBe('initialized')
    })
    // 전역 선언 처리 직후: 함수는 함수 객체, let·const는 초기화 전
    const g1 = envOf(stateAt(1), 'global')!
    for (const b of g1.bindings) {
      expect([b.state, b.value], b.name).toEqual(['uninitialized', null])
    }
    for (const b of g1.objectBindings!) {
      expect(b.value, b.name).toBe(`함수 ${b.name}`)
    }
  })

  it('선언 종류: 함수 환경 레코드에는 var·함수 선언 이름만, 선언적 레코드에는 let·const 이름만 있고, 새 레코드의 바인딩은 종류에 맞는 초기 상태다', () => {
    const vars = allVarNames(source)
    const fns = nestedFnNames(source)
    const lexes = allLexNames(source)
    steps.forEach((step, i) => {
      for (const e of step.state.envs) {
        const where = `단계 ${i + 1}: ${e.id}`
        if (e.kind === 'function') {
          for (const b of e.bindings) {
            expect([...vars, ...fns], `${where}.${b.name}`).toContain(b.name)
            expect(b.state, `${where}.${b.name}`).toBe('initialized')
            if (e.created)
              expect(b.value, `${where}.${b.name}`).toBe(
                fns.includes(b.name) ? `함수 ${b.name}` : 'undefined',
              )
          }
        }
        if (e.kind === 'declarative') {
          for (const b of e.bindings) expect(lexes, `${where}.${b.name}`).toContain(b.name)
          if (e.created)
            for (const b of e.bindings) expect(b.state, `${where}.${b.name}`).toBe('uninitialized')
        }
        for (const b of [...e.bindings, ...(e.objectBindings ?? [])]) {
          expect(b.state === 'uninitialized', `${where}.${b.name}`).toBe(b.value === null)
        }
      }
    })
  })

  it('탐색 경로: 실행 중 컨텍스트의 LexicalEnvironment에서 시작해 [[OuterEnv]]를 따라가고 처음 찾은 레코드에서 끝나며, 못 찾으면 끝(전역)까지 간다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const lk = state.lookup
      if (!lk) return
      const where = `단계 ${i + 1}`
      const top = state.stack.at(-1)!
      expect(top.phase, `${where}: 탐색은 실행 단계에서`).toBe('evaluation')
      expect(lk.path[0], `${where}: 경로는 LexicalEnvironment에서 시작`).toBe(top.lexicalEnv)
      lk.path.forEach((id, k) => {
        if (k > 0)
          expect(id, `${where}: 경로는 outerId를 따라야 합니다`).toBe(
            envOf(state, lk.path[k - 1])!.outerId,
          )
      })
      const expectedPath: string[] = []
      let foundId: string | null = null
      for (const id of chainIds(state, top.lexicalEnv)) {
        expectedPath.push(id)
        if (bindingIn(envOf(state, id)!, lk.name)) {
          foundId = id
          break
        }
      }
      expect(lk.path, `${where}: 첫 번째로 이름을 가진 레코드에서 멈춘다`).toEqual(expectedPath)
      expect(lk.foundIn, `${where}: foundIn`).toBe(foundId)
      if (foundId === null) {
        expect(
          envOf(state, lk.path.at(-1)!)!.outerId,
          `${where}: 경로의 끝은 바깥이 없는 전역`,
        ).toBeNull()
        expect(lk.part).toBeUndefined()
        expect(lk.result, `${where}: 찾지 못한 이름의 typeof`).toBe("'undefined'")
        const srcLine = source.split('\n')[step.line!.from - 1]
        expect(srcLine, `${where}: 못 찾아도 에러가 없는 것은 typeof뿐`).toContain(
          `typeof ${lk.name}`,
        )
      } else {
        const found = bindingIn(envOf(state, foundId)!, lk.name)!
        expect(found.binding.state, `${where}: 초기화된 바인딩만 읽는다`).toBe('initialized')
        expect(lk.result, `${where}: result`).toBe(found.binding.value)
        if (foundId === 'global') expect(lk.part, `${where}: part`).toBe(found.part)
        else expect(lk.part, `${where}: 전역이 아니면 part 없음`).toBeUndefined()
      }
    })
  })

  it('created·changed: 그 단계에 새로 생기거나 바뀐 항목에만 붙고, 값이 바뀌는 레코드는 그 단계에 컨텍스트로 닿는 레코드뿐이다', () => {
    steps.forEach((step, i) => {
      const prev = i === 0 ? stateAt(0) : stateAt(i - 1)
      const cur = step.state
      const where = `단계 ${i + 1}`
      const reach = i === 0 ? new Set<string>() : contextReachable(cur)
      for (const c of cur.stack) {
        const isNew = i === 0 ? true : !prev.stack.some((p) => p.id === c.id)
        expect(c.created === true, `${where}: 컨텍스트 ${c.id}의 created`).toBe(isNew)
        expect(c.created === undefined || c.created === true).toBe(true)
      }
      for (const e of cur.envs) {
        const before = i === 0 ? undefined : envOf(prev, e.id)
        expect(e.created === true, `${where}: 레코드 ${e.id}의 created`).toBe(!before)
        const all = [...e.bindings, ...(e.objectBindings ?? [])]
        for (const b of all) {
          const was = before && bindingIn(before, b.name)?.binding
          const isChanged = !was || was.state !== b.state || was.value !== b.value
          expect(b.changed === true, `${where}: ${e.id}.${b.name}의 changed`).toBe(isChanged)
          expect(b.changed === undefined || b.changed === true).toBe(true)
          if (before && isChanged)
            expect(
              reach.has(e.id),
              `${where}: ${e.id}.${b.name}는 실행 중 컨텍스트로 닿아야 바뀝니다`,
            ).toBe(true)
        }
      }
    })
  })

  it('count·name 바인딩이 초기화되고 바뀌는 순서와 레코드가 표와 같다', () => {
    const names = new Set(table.valueChanges.map(([, name]) => name))
    const seen: [string, string, string][] = []
    steps.forEach((step) => {
      for (const e of step.state.envs) {
        if (e.id === 'global') continue
        for (const b of e.bindings) {
          if (names.has(b.name) && b.changed && b.state === 'initialized')
            seen.push([e.id, b.name, b.value!])
        }
      }
    })
    expect(seen).toEqual(table.valueChanges)
  })

  if (scenario.id === 'independent') {
    it('두 익명 함수는 서로 다른 레코드를 [[Environment]]로 가리키고, 같은 단계에서 두 레코드가 따로 있다', () => {
      const both = steps.filter((s) => s.state.functions.some((f) => f.id === 'second'))
      expect(both.length).toBeGreaterThan(0)
      for (const s of both) {
        const first = s.state.functions.find((f) => f.id === 'first')!
        const second = s.state.functions.find((f) => f.id === 'second')!
        expect(first.environmentId).not.toBe(second.environmentId)
        expect(first.label).not.toBe(second.label)
        expect(envOf(s.state, first.environmentId)).toBeDefined()
        expect(envOf(s.state, second.environmentId)).toBeDefined()
      }
    })
  }

  if (scenario.id === 'shared') {
    it('같은 호출에서 만든 두 메서드의 [[Environment]]는 같은 레코드(makeCounter 선언적 레코드)다', () => {
      const both = steps.filter((s) => s.state.functions.some((f) => f.id === 'get'))
      expect(both.length).toBeGreaterThan(0)
      for (const s of both) {
        const inc = s.state.functions.find((f) => f.id === 'increment')!
        const get = s.state.functions.find((f) => f.id === 'get')!
        expect(inc.environmentId).toBe(get.environmentId)
        expect(inc.environmentId).toBe('makeCounter-lex')
      }
    })
  }
})

// --- 탐침 ---------------------------------------------------------------------------------------
// 예제에 (1) 함수 본문 시작에 `__stack.push`와 try, 끝에 finally `__stack.pop`을 끼우고 (2) 단계마다 정한 위치에 스냅샷을 끼워
// nth번째로 실행된 스냅샷만 기록한다(기본 1번째). 스냅샷은 컨텍스트 안에서 스택과 보이는 이름의 값(초기화 전이면 오류 이름),
// "전역 객체의 own property인가"를 계산해 JSON 문자열로 넘긴다. 호스트에서 비교한다(realm이 다르다).
// 끼운 코드는 줄 수를 바꾸지 않는 식 바꾸기(함수 시작·끝)와 줄 뒤 삽입뿐이다.
// 반환 단계는 "반환 직전"이 아니라 호출한 줄에서 컨텍스트가 빠진 뒤의 상태이므로, 호출 줄 앞(또는 호출한 쪽 줄 뒤)에서 같은 가시 상태를 확인한다.
// 남은 레코드의 값은 컨텍스트로 닿는 단계에서만 바뀌고(위 created·changed 검사), 닿는 단계의 값은 아래에서 실제 값과 대조한다.

type ProbePoint = { after: number; nth?: number } | { marker: string; nth?: number } | null
type ProbePlan = {
  fns: { name: string; from: number; to: number; push?: string }[] // 함수 헤더 줄(`{`로 끝남)과 닫는 줄(`}`로 시작)
  replace?: [string, string][] // 줄로 끼울 수 없는 곳(줄 수 불변). 표식 `/*@이름*/`
  points: ProbePoint[] // 단계마다: 그 단계 상태를 확인할 위치(원본 줄 번호 뒤, 0 = 맨 앞)
}

const probePlans: Record<string, ProbePlan> = {
  counter: {
    fns: [
      { name: 'makeCounter', from: 1, to: 8 },
      { name: 'increment', from: 3, to: 6 },
    ],
    points: [
      null,
      { after: 0 },
      { after: 1 }, // makeCounter 본문 시작: count는 초기화 전
      { after: 2 },
      { after: 9 }, // makeCounter 반환: next 초기화 직후(10번 줄 앞)
      { after: 3 }, // 첫 next(): increment 본문 시작
      { after: 3 },
      { after: 4 },
      { after: 9 }, // 첫 next() 반환: 전역 코드
      { after: 3, nth: 2 }, // 두 번째 next()
      { after: 3, nth: 2 },
      { after: 4, nth: 2 },
      { after: 9 },
      { after: 11 }, // typeof count
    ],
  },
  independent: {
    fns: [
      { name: 'makeCounter', from: 1, to: 7 },
      { name: 'anon', from: 3, to: 6, push: "'anon' + __id" },
    ],
    replace: [['let count = 0;', 'let count = 0; const __id = ++__count;']],
    points: [
      null,
      { after: 0 },
      { after: 1 }, // 첫 번째 makeCounter 본문 시작
      { after: 2 },
      { after: 8 }, // first 초기화 직후
      { after: 1, nth: 2 }, // 두 번째 makeCounter
      { after: 2, nth: 2 },
      { after: 9 }, // second 초기화 직후
      { after: 3 }, // first() 첫 호출(익명 함수 본문 시작)
      { after: 3 },
      { after: 4 },
      { after: 9 },
      { after: 3, nth: 2 }, // first() 두 번째 호출
      { after: 3, nth: 2 },
      { after: 4, nth: 2 },
      { after: 9 },
      { after: 3, nth: 3 }, // second() 호출
      { after: 3, nth: 3 },
      { after: 4, nth: 3 },
      { after: 11 },
    ],
  },
  shared: {
    fns: [
      { name: 'makeCounter', from: 1, to: 11 },
      { name: 'increment', from: 4, to: 6 },
      { name: 'get', from: 7, to: 9 },
    ],
    points: [
      null,
      { after: 0 },
      { after: 1 },
      { after: 2 },
      { after: 12 }, // counter 초기화 직후
      { after: 4 }, // 첫 increment() 본문 시작
      { after: 4 },
      { after: 5 },
      { after: 12 },
      { after: 4, nth: 2 },
      { after: 4, nth: 2 },
      { after: 5, nth: 2 },
      { after: 12 },
      { after: 7 }, // get() 본문 시작
      { after: 7 },
      { after: 14 },
    ],
  },
  binding: {
    fns: [{ name: 'makeGreeter', from: 1, to: 6 }],
    replace: [
      [
        "() => 'Hi, ' + name;",
        "() => { __stack.push('greet'); try { /*@greet*/ return 'Hi, ' + name; } finally { __stack.pop(); } };",
      ],
    ],
    points: [
      null,
      { after: 0 },
      { after: 1 },
      { after: 2 },
      { after: 3 },
      { after: 4 },
      { after: 7 }, // greet 초기화 직후
      { marker: 'greet' }, // 화살표 함수 본문
      { marker: 'greet' },
      { after: 7 },
    ],
  },
}

type Snapshot = {
  stack: string[]
  vals: { name: string; error: string | null; disp: string | null; own: boolean }[]
}

const probeExpr = (names: string[]) => {
  const one = (n: string) =>
    `(() => { const __own = Object.prototype.hasOwnProperty.call(globalThis, '${n}'); ` +
    `try { const __v = ${n}; const __t = typeof __v; ` +
    `const __d = __t === 'string' ? "'" + __v + "'" : ` +
    `__t === 'function' ? (__v.name === '' ? '익명 함수(${n})' : '함수 ' + __v.name) : ` +
    `__t === 'object' ? '객체 ${n}' : String(__v); ` +
    `return { name: '${n}', error: null, disp: __d, own: __own }; } ` +
    `catch (e) { return { name: '${n}', error: e.name, disp: null, own: __own }; } })()`
  return `__snap(JSON.stringify({ stack: __stack.slice(), vals: [${names.map(one).join(', ')}] }));`
}

function instrumentedSource(source: string, plan: ProbePlan, point: ProbePoint, names: string[]) {
  const lines = source.split('\n')
  for (const f of plan.fns) {
    const head = lines[f.from - 1]
    const open = head.lastIndexOf('{')
    expect(open, `${f.name} 헤더 줄에 {가 있어야 합니다`).toBeGreaterThanOrEqual(0)
    lines[f.from - 1] =
      head.slice(0, open) +
      `{ __stack.push(${f.push ?? `'${f.name}'`}); try {` +
      head.slice(open + 1)
    const tail = lines[f.to - 1]
    const close = tail.indexOf('}')
    expect(close, `${f.name} 닫는 줄에 }가 있어야 합니다`).toBeGreaterThanOrEqual(0)
    lines[f.to - 1] =
      tail.slice(0, close) + '} finally { __stack.pop(); } }' + tail.slice(close + 1)
  }
  let text = lines.join('\n')
  for (const [from, to] of plan.replace ?? []) {
    expect(text).toContain(from)
    text = text.replace(from, to)
  }
  const probe = probeExpr(names)
  if (point && 'marker' in point) {
    expect(text).toContain(`/*@${point.marker}*/`)
    return text.replace(`/*@${point.marker}*/`, probe)
  }
  const out: string[] = point && point.after === 0 ? [probe] : []
  text.split('\n').forEach((line, i) => {
    out.push(line)
    if (point && i + 1 === point.after) out.push(probe)
  })
  return out.join('\n')
}

function runProbe(source: string, plan: ProbePlan, point: ProbePoint, names: string[]) {
  let recorded: Snapshot | null = null
  let calls = 0
  const nth = point?.nth ?? 1
  const out: string[] = []
  runInNewContext(
    instrumentedSource(source, plan, point, names),
    {
      console: { log: (...args: unknown[]) => out.push(args.map(String).join(' ')) },
      __snap: (json: string) => {
        calls += 1
        if (calls === nth) recorded = JSON.parse(json) as Snapshot
      },
      __stack: [],
      __count: 0,
    },
    { timeout: 2000 },
  )
  expect(
    recorded,
    `스냅샷이 ${nth}번째로 실행되지 않았습니다: ${JSON.stringify(point)}`,
  ).not.toBeNull()
  return { snapshot: recorded as unknown as Snapshot, out }
}

describe.each(scenarios)('closure 시나리오 탐침 대조 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)
  const plan = probePlans[scenario.id]
  const table = tables[scenario.id]
  const probeName = (id: string) => table.probeNames?.[id] ?? id.replace(/#\d+$/, '')

  it('단계마다 탐침 위치가 하나씩 있고 실행 전 단계만 null이다', () => {
    expect(plan.points.length).toBe(scenario.steps.length)
    plan.points.forEach((p, i) => expect(p === null, `단계 ${i + 1}`).toBe(i === 0))
  })

  it('탐침 코드는 줄 수를 바꾸지 않는 식 바꾸기라서 예제의 출력이 원본과 같다', () => {
    scenario.steps.forEach((step, i) => {
      if (i === 0) return
      const { out } = runProbe(source, plan, plan.points[i], ['__none'])
      expect(out, `단계 ${i + 1}`).toEqual(example.expectedOutput)
    })
  })

  it('단계마다 실제 실행과 같다: 스택(호출 순서), 보이는 이름의 값·초기화 전, 전역 객체 프로퍼티, lookup.result', () => {
    scenario.steps.forEach((step, i) => {
      if (i === 0) return
      const state = step.state
      const where = `단계 ${i + 1} "${step.title}"`
      const visible = visibleBindings(state)
      const global = envOf(state, 'global')!
      const globalNames = [...global.bindings, ...(global.objectBindings ?? [])].map((b) => b.name)
      const names = [
        ...new Set([
          ...visible.keys(),
          ...globalNames,
          ...(state.lookup ? [state.lookup.name] : []),
        ]),
      ]
      const { snapshot } = runProbe(source, plan, plan.points[i], names)

      // (2) 스택: 함수 컨텍스트의 호출 순서
      expect(snapshot.stack, `${where}: 스택`).toEqual(
        state.stack.filter((c) => c.code === 'function').map((c) => probeName(c.id)),
      )

      // (1) 값과 초기화 전
      for (const [name, { binding }] of visible) {
        const p = snapshot.vals.find((v) => v.name === name)!
        if (binding.state === 'uninitialized') {
          expect(p.error, `${where}: ${name}은 초기화 전이라 ReferenceError`).toBe('ReferenceError')
        } else {
          expect(p.error, `${where}: ${name}은 읽을 수 있어야 합니다`).toBeNull()
          expect(p.disp, `${where}: ${name}의 값`).toBe(binding.value)
        }
      }

      // (3) 전역 객체의 프로퍼티: 객체 칸은 true, 선언적 칸은 false
      for (const b of global.objectBindings ?? []) {
        expect(snapshot.vals.find((v) => v.name === b.name)!.own, `${where}: ${b.name}`).toBe(true)
      }
      for (const b of global.bindings) {
        expect(snapshot.vals.find((v) => v.name === b.name)!.own, `${where}: ${b.name}`).toBe(false)
      }

      // (4) lookup.result
      if (state.lookup) {
        const p = snapshot.vals.find((v) => v.name === state.lookup!.name)!
        if (state.lookup.foundIn === null) {
          expect(p.error, `${where}: 찾지 못한 이름은 읽으면 ReferenceError`).toBe('ReferenceError')
        } else {
          expect(p.error, `${where}: lookup`).toBeNull()
          expect(p.disp, `${where}: lookup.result`).toBe(state.lookup.result)
        }
      }
    })
  })
})
