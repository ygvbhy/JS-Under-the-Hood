import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type EnvRecord, type ExecState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')

// 컨텍스트 안에서 JSON 문자열로 만들어 돌려주고 호스트에서 파싱한다(realm이 달라 instanceof를 쓰지 않는다).
const jsonOf = (source: string): unknown => JSON.parse(runInNewContext(source) as string)

const STRICT = "'use strict';\n"

describe('본문 주장 검증', () => {
  it('sloppy 함수에서 최상위 let x와 직접 eval("var x")는 SyntaxError다', () => {
    expect(
      runInNewContext(
        `function f() { let x = 1; try { eval('var x = 2'); return 'no error'; } catch (e) { return e.name; } }
         f()`,
      ),
    ).toBe('SyntaxError')
  })

  it('strict 함수에서는 직접 eval("var x")가 오류 없이 새 레코드에 선언되어 바깥 x는 1 그대로다', () => {
    expect(
      runInNewContext(
        `${STRICT}function f() { let x = 1; eval('var x = 2'); return x; }
         f()`,
      ),
    ).toBe(1)
  })

  it('함수 안 var는 전역 객체의 프로퍼티가 아니다', () => {
    expect(
      runInNewContext('function f() { var inside = 1; } f(); Object.hasOwn(globalThis, "inside")'),
    ).toBe(false)
  })

  it('블록 안의 전역 var는 전역 객체의 프로퍼티다', () => {
    expect(runInNewContext('{ var blockVar = 1; } Object.hasOwn(globalThis, "blockVar")')).toBe(
      true,
    )
  })

  it('블록의 let은 블록 뒤에서 typeof가 undefined다', () => {
    expect(runInNewContext('{ let inBlock = 1; } typeof inBlock')).toBe('undefined')
  })

  it('함수 선언은 함수 본문 안에서도 선언 처리 때 만들어진다', () => {
    expect(
      runInNewContext('function f() { const t = typeof g; function g() {} return t; } f()'),
    ).toBe('function')
  })

  it('함수 최상위 let을 선언 전에 읽으면 ReferenceError다', () => {
    expect(
      runInNewContext(
        `function f() { try { return String(v); } catch (e) { return e.name; } let v = 1; }
         f()`,
      ),
    ).toBe('ReferenceError')
  })

  it('화살표 함수 안 this는 바깥 메서드의 this와 같다(===)', () => {
    expect(
      jsonOf(
        `const obj = { m() { const arrow = () => this; return JSON.stringify([arrow() === this, arrow() === obj]); } };
         obj.m()`,
      ),
    ).toEqual([true, true])
  })

  it('초기화 전 바인딩은 대입해도, typeof로 읽어도 ReferenceError다', () => {
    expect(
      runInNewContext(
        `function f() { try { v = 1; return 'no error'; } catch (e) { return e.name; } let v; }
         f()`,
      ),
    ).toBe('ReferenceError')
    expect(
      runInNewContext(
        `function f() { try { return typeof v; } catch (e) { return e.name; } let v; }
         f()`,
      ),
    ).toBe('ReferenceError')
  })

  it('전역에서 같은 이름이 양쪽에 있으면 선언적 레코드의 let이 찾히고 전역 객체 프로퍼티는 가려진다', () => {
    expect(
      jsonOf(
        `globalThis.dup = 'object'; let dup = 'declarative'; JSON.stringify([dup, globalThis.dup])`,
      ),
    ).toEqual(['declarative', 'object'])
  })

  it('sloppy 함수의 블록 안 함수 선언은 블록 앞에서도 바인딩이 있다 (Annex B, 단순화 근거)', () => {
    // typeof는 선언되지 않은 이름에도 'undefined'라 구분이 안 되므로 직접 읽어 ReferenceError 여부를 본다.
    const readBeforeBlock = `function f() { let r; try { r = String(g); } catch (e) { r = e.name; } { function g() {} } return r; } f()`
    expect(runInNewContext(readBeforeBlock)).toBe('undefined')
    expect(runInNewContext(`${STRICT}${readBeforeBlock}`)).toBe('ReferenceError')
    expect(runInNewContext('function f() { { function g() {} } return typeof g; } f()')).toBe(
      'function',
    )
  })

  it('화살표 함수가 아닌 함수 안에서는 선언하지 않은 arguments를 쓸 수 있다 (단순화 근거)', () => {
    expect(runInNewContext('function f() { return typeof arguments; } f()')).toBe('object')
    expect(runInNewContext(`${STRICT}function f() { return typeof arguments; } f()`)).toBe('object')
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
  // 모듈과 CommonJS의 최상위 코드는 전역 코드가 아니라 global-records.js만 달라진다. 나머지는 expectedOutput과 같다.
  const nonScriptOutput: Record<string, string[]> = {
    'global-records.js': ['false', 'false', 'undefined', '2'],
  }

  const expected = (file: string) =>
    (nonScriptOutput[file] ?? concept.examples.find((e) => e.file === file)!.expectedOutput).join(
      '\n',
    ) + '\n'

  const runNodeFile = (path: string) =>
    execFileSync(process.execPath, [path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

  const runAs = (file: string, ext: '.mjs' | '.cjs') => {
    const dir = mkdtempSync(join(tmpdir(), 'execution-context-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return runNodeFile(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it.each(concept.examples.map((e) => e.file))(
    '%s (.cjs): global-records.js만 클래식 스크립트와 달라진다',
    (file) => {
      expect(runAs(file, '.cjs')).toBe(expected(file))
    },
  )

  it.each(concept.examples.map((e) => e.file))(
    '%s (.mjs): global-records.js만 클래식 스크립트와 달라진다',
    (file) => {
      expect(runAs(file, '.mjs')).toBe(expected(file))
    },
  )

  it('global-records.js: package.json에 "type": "module"이 있으면 .js도 .mjs와 같은 결과다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'execution-context-'))
    try {
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
      writeFileSync(join(dir, 'global-records.js'), readExample('global-records.js'))
      expect(runNodeFile(join(dir, 'global-records.js'))).toBe(expected('global-records.js'))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(바깥 레코드 연결, 컨텍스트와 레코드의 도달 가능성, 블록 복원, 탐색 경로)
// + 예제에 탐침을 끼워 얻은 실제 값·스택·전역 객체 프로퍼티·this와의 대조
// 경로(path)·result·바깥 연결(outerId)은 시나리오에 손으로 쓴 값이고, 아래 검사가 상태에서 다시 계산한 값과 대조한다.

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

// 손으로 쓴 표: 함수 이름 → 그 함수 객체의 [[Environment]], 화살표 함수, 함수 환경 레코드의 this.
const fnEnvironmentTable: Record<string, string> = {
  first: 'global',
  second: 'global',
  show: 'global',
  run: 'global',
  test: 'global',
  regular: 'global',
  arrow: 'regular-lex',
}
const arrowFns = new Set(['arrow'])
const thisTable: Record<string, string> = {
  first: '전역 객체',
  second: '전역 객체',
  show: '전역 객체',
  run: '전역 객체',
  test: '전역 객체',
  regular: '객체 obj',
}
// 객체의 프로퍼티라서 `함수 이름` 바인딩 없이 함수 객체가 있는 메서드(obj의 regular)
const heldByObject = new Set(['regular'])

describe('execution-context 시나리오 id', () => {
  it('시나리오 id 순서는 stack, lookup, block, this이다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['stack', 'lookup', 'block', 'this'])
  })

  it('exampleId는 call-stack, lookup-defined, block-env, this-env이다', () => {
    expect(scenarios.map((s) => s.exampleId)).toEqual([
      'call-stack',
      'lookup-defined',
      'block-env',
      'this-env',
    ])
  })

  it('단계 수는 11 / 10 / 14 / 10이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([11, 10, 14, 10])
  })
})

// --- 상태에서 계산하는 헬퍼 ---------------------------------------------------------------------

const envOf = (state: ExecState, id: string) => state.envs.find((e) => e.id === id)

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
function chainIds(state: ExecState, startId: string): string[] {
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
function visibleBindings(state: ExecState): Map<string, { binding: Binding; envId: string }> {
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

// GetThisEnvironment: LexicalEnvironment부터 초기화된 this 바인딩이 있는 첫 레코드까지
function thisEnvironmentPath(state: ExecState): string[] {
  const top = state.stack.at(-1)!
  const path: string[] = []
  for (const id of chainIds(state, top.lexicalEnv)) {
    path.push(id)
    if (envOf(state, id)!.thisBinding?.status === 'initialized') break
  }
  return path
}

const thisValueOf = (state: ExecState): string => {
  const path = thisEnvironmentPath(state)
  const tb = envOf(state, path.at(-1)!)!.thisBinding
  expect(tb?.status, '경로의 마지막 레코드에 초기화된 this가 있어야 합니다').toBe('initialized')
  return (tb as { status: 'initialized'; value: string }).value
}

// 소스에서 계산하는 선언 이름. 최상위 선언은 줄 맨 앞에서 시작하는 예제만 쓴다.
const globalNamesOf = (src: string) => ({
  object: [...src.matchAll(/^(?:function|var) (\w+)/gm)].map((m) => m[1]),
  declarative: [...src.matchAll(/^(?:let|const) (\w+)/gm)].map((m) => m[1]),
})
const allVarNames = (src: string) => [...src.matchAll(/\bvar (\w+)/g)].map((m) => m[1])
const allLexNames = (src: string) => [...src.matchAll(/\b(?:let|const) (\w+)/g)].map((m) => m[1])

describe.each(scenarios)('execution-context 시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)
  const steps = scenario.steps
  const stateAt = (i: number): ExecState => steps[i].state

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
      for (const c of state.stack) {
        expect(ids, `${where}: ${c.id}.lexicalEnv`).toContain(c.lexicalEnv)
        expect(ids, `${where}: ${c.id}.variableEnv`).toContain(c.variableEnv)
      }
      for (const e of state.envs) {
        if (e.id === 'global') expect(e.outerId, `${where}: 전역의 바깥`).toBeNull()
        else expect(ids, `${where}: ${e.id}의 outerId`).toContain(e.outerId)
      }
      for (const f of state.functions) expect(ids, `${where}: ${f.name}`).toContain(f.environmentId)
      if (state.lookup) {
        for (const id of state.lookup.path) expect(ids, `${where}: 탐색 경로 ${id}`).toContain(id)
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

  it('함수 환경 레코드의 바깥은 그 함수 객체의 [[Environment]]이고, 함수 객체의 [[Environment]]는 정의한 곳의 표와 같다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const where = `단계 ${i + 1}`
      for (const f of state.functions) {
        expect(f.environmentId, `${where}: ${f.name}.[[Environment]]`).toBe(
          fnEnvironmentTable[f.name],
        )
      }
      for (const c of state.stack.slice(1)) {
        const env = envOf(state, c.variableEnv)!
        const f = state.functions.find((x) => x.name === c.id)
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

  it('블록 레코드: 진입 단계에서 LexicalEnvironment만 바뀌고(바깥은 직전 LexicalEnvironment), 끝난 단계에서 복원되며 그 뒤로는 없다', () => {
    const blockSteps = steps
      .map((s, i) => [s, i] as const)
      .filter(([s]) => s.state.envs.some((e) => e.id === 'block'))
    if (blockSteps.length === 0) return
    // 블록 레코드가 있는 단계는 소스의 `{` 줄부터 `}` 줄 직전까지의 줄을 실행하는 단계뿐이다(`}` 줄을 실행하는 단계는 이미 복원된 뒤).
    const srcLines = source.split('\n')
    const open = srcLines.findIndex((l) => /^ {2}\{$/.test(l)) + 1
    const close = srcLines.findIndex((l, k) => k + 1 > open && /^ {2}\}$/.test(l)) + 1
    expect(open).toBeGreaterThan(0)
    expect(close).toBeGreaterThan(open)
    steps.forEach((s, i) => {
      if (!s.line) return
      const inside = s.line.from >= open && s.line.to < close
      expect(
        s.state.envs.some((e) => e.id === 'block'),
        `단계 ${i + 1}: 줄 ${s.line.from}의 블록 레코드 유무`,
      ).toBe(inside)
    })
    const entry = blockSteps[0][1]
    const exit = blockSteps.at(-1)![1] + 1
    // 진입과 끝 사이에는 블록 레코드가 계속 있다
    expect(blockSteps.map(([, i]) => i)).toEqual(
      Array.from({ length: exit - entry }, (_, k) => entry + k),
    )
    const topBefore = stateAt(entry - 1).stack.at(-1)!
    const topEntry = stateAt(entry).stack.at(-1)!
    const topExit = stateAt(exit).stack.at(-1)!
    const block = envOf(stateAt(entry), 'block')!
    expect(block.created, '진입 단계의 created').toBe(true)
    expect(block.kind).toBe('declarative')
    expect(block.outerId, '블록의 바깥 = 들어가기 직전의 LexicalEnvironment').toBe(
      topBefore.lexicalEnv,
    )
    expect(topEntry.id).toBe(topBefore.id)
    expect(topEntry.lexicalEnv, '진입: LexicalEnvironment = 블록 레코드').toBe('block')
    expect(topEntry.variableEnv, '진입: VariableEnvironment은 그대로').toBe(topBefore.variableEnv)
    for (let i = entry; i < exit; i++) {
      expect(stateAt(i).stack.at(-1)!.lexicalEnv, `단계 ${i + 1}`).toBe('block')
    }
    expect(topExit.id).toBe(topBefore.id)
    expect(topExit.lexicalEnv, '끝: LexicalEnvironment 복원').toBe(topBefore.lexicalEnv)
    expect(topExit.variableEnv).toBe(topBefore.variableEnv)
    expect(envOf(stateAt(exit), 'block'), '끝: 블록 레코드는 그림에서 빠진다').toBeUndefined()
    for (let i = exit; i < steps.length; i++) {
      expect(envOf(stateAt(i), 'block'), `단계 ${i + 1}`).toBeUndefined()
      expect(stateAt(i).stack.every((c) => c.lexicalEnv !== 'block')).toBe(true)
    }
  })

  it('레코드 도달 가능성: 레코드는 어떤 컨텍스트(또는 남아 있는 함수 객체)의 바깥 연결로 닿는 것만 있고, 함수 객체는 바인딩이 가리키는 것만 있다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const where = `단계 ${i + 1}`
      const fromContexts = new Set<string>()
      for (const c of state.stack) {
        for (const id of chainIds(state, c.lexicalEnv)) fromContexts.add(id)
        for (const id of chainIds(state, c.variableEnv)) fromContexts.add(id)
      }
      const reachable = new Set(fromContexts)
      for (const f of state.functions) {
        for (const id of chainIds(state, f.environmentId)) reachable.add(id)
      }
      expect([...state.envs.map((e) => e.id)].sort(), `${where}: 레코드 집합`).toEqual(
        [...reachable].sort(),
      )
      // 함수 객체: 컨텍스트에서 닿는 레코드의 `함수 이름` 바인딩이 가리키거나 객체의 메서드다
      const held = new Set<string>()
      for (const id of fromContexts) {
        const env = envOf(state, id)!
        for (const b of [...env.bindings, ...(env.objectBindings ?? [])]) {
          if (b.value?.startsWith('함수 ')) held.add(b.value.slice(3))
        }
      }
      const hasObject = [...fromContexts].some((id) =>
        [...envOf(state, id)!.bindings].some((b) => b.value === '객체 obj'),
      )
      for (const f of state.functions) {
        const ok = held.has(f.name) || (heldByObject.has(f.name) && hasObject)
        expect(ok, `${where}: 함수 객체 ${f.name}를 가리키는 곳이 없습니다`).toBe(true)
      }
      for (const name of held) {
        expect(
          state.functions.map((f) => f.name),
          `${where}: 바인딩이 가리키는 함수 ${name}의 함수 객체`,
        ).toContain(name)
      }
    })
  })

  it('전역 환경 레코드: var·함수 선언은 객체 칸, let·const는 선언적 칸이고 this는 전역 객체다', () => {
    const names = globalNamesOf(source)
    steps.slice(1).forEach((step, k) => {
      const g = envOf(step.state, 'global')!
      const where = `단계 ${k + 2}`
      expect(g.kind).toBe('global')
      expect(
        g.objectBindings!.map((b) => b.name),
        `${where}: 객체 칸`,
      ).toEqual(names.object)
      expect(
        g.bindings.map((b) => b.name),
        `${where}: 선언적 칸`,
      ).toEqual(names.declarative)
      for (const b of g.objectBindings!) expect(b.state, `${where}: ${b.name}`).toBe('initialized')
      expect(g.thisBinding, where).toEqual({ status: 'initialized', value: '전역 객체' })
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

  it('선언 종류: 함수 환경 레코드에는 var 이름만, 선언적 레코드에는 let·const 이름만 있고, 새 선언적 레코드의 바인딩은 모두 초기화 전이다', () => {
    const vars = allVarNames(source)
    const lexes = allLexNames(source)
    steps.forEach((step, i) => {
      for (const e of step.state.envs) {
        const where = `단계 ${i + 1}: ${e.id}`
        if (e.kind === 'function') {
          for (const b of e.bindings) {
            expect(vars, `${where}.${b.name}`).toContain(b.name)
            expect(b.state, `${where}.${b.name}`).toBe('initialized')
            if (e.created) expect(b.value, `${where}.${b.name}`).toBe('undefined')
          }
        }
        if (e.kind === 'declarative') {
          expect(e.thisBinding, where).toBeUndefined()
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

  it('this 바인딩: 함수 환경 레코드는 표의 this(화살표 함수만 lexical), 전역은 전역 객체, 선언적 레코드에는 없다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      for (const c of state.stack.slice(1)) {
        const env = envOf(state, c.variableEnv)!
        const where = `단계 ${i + 1}: ${c.id}`
        if (arrowFns.has(c.id)) expect(env.thisBinding, where).toEqual({ status: 'lexical' })
        else
          expect(env.thisBinding, where).toEqual({ status: 'initialized', value: thisTable[c.id] })
      }
      for (const e of state.envs) {
        if (e.thisBinding?.status === 'lexical') {
          const owner = state.stack.find((c) => c.variableEnv === e.id)
          expect(owner && arrowFns.has(owner.id), `단계 ${i + 1}: ${e.id}만 lexical이 아님`).toBe(
            true,
          )
        }
      }
    })
  })

  it('탐색 경로: 실행 중 컨텍스트의 LexicalEnvironment에서 시작해 [[OuterEnv]]를 따라가고 처음 찾은 레코드에서 끝난다', () => {
    steps.forEach((step, i) => {
      const state = step.state
      const lk = state.lookup
      if (!lk) return
      const where = `단계 ${i + 1}`
      const top = state.stack.at(-1)!
      expect(top.phase, `${where}: 탐색은 실행 단계에서`).toBe('evaluation')
      expect(lk.path[0], `${where}: 경로는 LexicalEnvironment에서 시작`).toBe(top.lexicalEnv)
      expect(lk.path.at(-1), `${where}: foundIn은 경로의 끝`).toBe(lk.foundIn)
      lk.path.forEach((id, k) => {
        if (k > 0)
          expect(id, `${where}: 경로는 outerId를 따라야 합니다`).toBe(
            envOf(state, lk.path[k - 1])!.outerId,
          )
      })
      if (lk.kind === 'identifier') {
        const expectedPath: string[] = []
        for (const id of chainIds(state, top.lexicalEnv)) {
          expectedPath.push(id)
          if (bindingIn(envOf(state, id)!, lk.name)) break
        }
        expect(lk.path, `${where}: 첫 번째로 이름을 가진 레코드에서 멈춘다`).toEqual(expectedPath)
        const found = bindingIn(envOf(state, lk.foundIn)!, lk.name)
        expect(found, `${where}: foundIn에 ${lk.name}가 있어야 합니다`).toBeDefined()
        expect(found!.binding.state, `${where}: 초기화된 바인딩만 읽는다`).toBe('initialized')
        expect(lk.result, `${where}: result`).toBe(found!.binding.value)
        if (lk.foundIn === 'global') expect(lk.part, `${where}: part`).toBe(found!.part)
        else expect(lk.part, `${where}: 전역이 아니면 part 없음`).toBeUndefined()
      } else {
        expect(lk.name).toBe('this')
        expect(lk.path, `${where}: this 바인딩이 있는 첫 레코드에서 멈춘다`).toEqual(
          thisEnvironmentPath(state),
        )
        expect(lk.result, `${where}: result`).toBe(thisValueOf(state))
        expect(lk.part).toBeUndefined()
      }
    })
  })

  it('created·changed: 그 단계에 새로 생기거나 바뀐 항목에만 붙는다', () => {
    steps.forEach((step, i) => {
      const prev = i === 0 ? stateAt(0) : stateAt(i - 1)
      const cur = step.state
      const where = `단계 ${i + 1}`
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
        }
      }
    })
  })
})

// --- 탐침 ---------------------------------------------------------------------------------------
// 예제에 (1) 함수 본문 시작에 `__stack.push`와 try, 끝에 finally `__stack.pop`을 끼우고 (2) 단계마다 정한 위치에 스냅샷을 끼워
// 첫 번째로 실행된 스냅샷만 기록한다. 스냅샷은 컨텍스트 안에서 스택, this, 보이는 이름의 값(초기화 전이면 오류 이름),
// "전역 객체의 own property인가"를 계산해 JSON 문자열로 넘긴다. 호스트에서 비교한다(realm이 다르다).
// 끼운 코드는 줄 수를 바꾸지 않는 식 바꾸기(함수 시작·끝)와 줄 뒤 삽입뿐이고, 어떤 예제에서도 같은 줄이 두 번 실행되지 않는다.

type ProbePoint = { after: number } | { marker: string } | null
type ProbePlan = {
  fns: { name: string; from: number; to: number }[] // 함수 헤더 줄(`{`로 끝남)과 닫는 줄(`}`로 시작)
  replace?: [string, string][] // 한 줄 화살표 함수처럼 줄로 끼울 수 없는 곳(줄 수 불변). 표식 `/*@이름*/`
  points: ProbePoint[] // 단계마다: 그 단계 상태를 확인할 위치(원본 줄 번호 뒤, 0 = 맨 앞). 줄이 반환·블록 끝이면 반환 직전/끝난 직후
}

const probePlans: Record<string, ProbePlan> = {
  stack: {
    fns: [
      { name: 'first', from: 1, to: 5 },
      { name: 'second', from: 6, to: 9 },
    ],
    points: [
      null,
      { after: 0 }, // 전역 선언 처리
      { after: 1 }, // first 본문 시작
      { after: 2 },
      { after: 6 }, // second 본문 시작
      { after: 7 },
      { after: 8 },
      { after: 2 }, // second 반환: 3번 줄 직전(first가 실행 중)
      { after: 4 },
      { after: 9 }, // first 반환: 10번 줄 직전(전역 코드)
      { after: 11 },
    ],
  },
  lookup: {
    fns: [
      { name: 'show', from: 2, to: 4 },
      { name: 'run', from: 5, to: 8 },
    ],
    points: [
      null,
      { after: 0 },
      { after: 1 },
      { after: 5 }, // run 본문 시작: label은 초기화 전
      { after: 6 },
      { after: 2 }, // show 본문 시작
      { after: 2 }, // return label 직전
      { after: 6 }, // show 반환: 7번 줄 직전(run이 실행 중)
      { after: 8 }, // run 반환: 9번 줄 직전(전역 코드)
      { after: 9 },
    ],
  },
  block: {
    fns: [{ name: 'test', from: 2, to: 11 }],
    points: [
      null,
      { after: 0 },
      { after: 1 },
      { after: 2 }, // test 본문 시작
      { after: 3 },
      { after: 4 }, // 블록 진입 직후(블록의 x는 초기화 전)
      { after: 5 },
      { after: 6 },
      { after: 7 },
      { after: 8 }, // 블록 끝난 직후
      { after: 9 },
      { after: 10 },
      { after: 11 }, // test 반환: 12번 줄 직전(전역 코드)
      { after: 13 },
    ],
  },
  this: {
    fns: [{ name: 'regular', from: 3, to: 6 }],
    replace: [
      [
        'const arrow = () => this.name;',
        "const arrow = () => { __stack.push('arrow'); try { /*@arrow*/ return this.name; } finally { __stack.pop(); } };",
      ],
    ],
    points: [
      null,
      { after: 0 },
      { after: 7 },
      { after: 3 }, // regular 본문 시작
      { after: 4 },
      { marker: 'arrow' }, // arrow 본문(한 줄 안)
      { marker: 'arrow' },
      { after: 4 }, // arrow 반환: 5번 줄 직전
      { after: 7 }, // regular 반환: 8번 줄 직전
      { after: 8 },
    ],
  },
}

type Snapshot = {
  stack: string[]
  self: string
  vals: { name: string; error: string | null; disp: string | null; own: boolean }[]
}

const probeExpr = (names: string[]) => {
  const one = (n: string) =>
    `(() => { const __own = Object.prototype.hasOwnProperty.call(globalThis, '${n}'); ` +
    `try { const __v = ${n}; const __t = typeof __v; ` +
    `const __d = __t === 'string' ? "'" + __v + "'" : __t === 'function' ? '함수 ' + __v.name : ` +
    `__t === 'object' ? '객체 ' + __v.name : String(__v); ` +
    `return { name: '${n}', error: null, disp: __d, own: __own }; } ` +
    `catch (e) { return { name: '${n}', error: e.name, disp: null, own: __own }; } })()`
  const self =
    `(() => this === globalThis ? '전역 객체' : ` +
    `(typeof this === 'object' && this !== null ? '객체 ' + this.name : String(this)))()`
  return `__snap(JSON.stringify({ stack: __stack.slice(), self: ${self}, vals: [${names.map(one).join(', ')}] }));`
}

function instrumentedSource(source: string, plan: ProbePlan, point: ProbePoint, names: string[]) {
  const lines = source.split('\n')
  for (const f of plan.fns) {
    const head = lines[f.from - 1]
    const open = head.lastIndexOf('{')
    expect(open, `${f.name} 헤더 줄에 {가 있어야 합니다`).toBeGreaterThanOrEqual(0)
    lines[f.from - 1] =
      head.slice(0, open) + `{ __stack.push('${f.name}'); try {` + head.slice(open + 1)
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
  const out: string[] = []
  runInNewContext(
    instrumentedSource(source, plan, point, names),
    {
      console: { log: (...args: unknown[]) => out.push(args.map(String).join(' ')) },
      __snap: (json: string) => {
        recorded ??= JSON.parse(json) as Snapshot
      },
      __stack: [],
    },
    { timeout: 2000 },
  )
  expect(recorded, `스냅샷이 실행되지 않았습니다: ${JSON.stringify(point)}`).not.toBeNull()
  return { snapshot: recorded as unknown as Snapshot, out }
}

describe.each(scenarios)('execution-context 시나리오 탐침 대조 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)
  const plan = probePlans[scenario.id]

  it('단계마다 탐침 위치가 하나씩 있고 실행 전 단계만 null이다', () => {
    expect(plan.points.length).toBe(scenario.steps.length)
    plan.points.forEach((p, i) => expect(p === null, `단계 ${i + 1}`).toBe(i === 0))
  })

  it('탐침 코드는 줄 수를 바꾸지 않는 식 바꾸기라서 예제의 출력이 원본과 같다', () => {
    scenario.steps.forEach((step, i) => {
      if (i === 0) return
      const names = ['__none']
      const { out } = runProbe(source, plan, plan.points[i], names)
      expect(out, `단계 ${i + 1}`).toEqual(example.expectedOutput)
    })
  })

  it('단계마다 실제 실행과 같다: 스택(함수 이름 순서), this, 보이는 이름의 값·초기화 전, 전역 객체 프로퍼티, lookup.result', () => {
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
          ...(state.lookup?.kind === 'identifier' ? [state.lookup.name] : []),
        ]),
      ]
      const { snapshot } = runProbe(source, plan, plan.points[i], names)

      // (2) 스택: 함수 컨텍스트의 이름 순서
      expect(snapshot.stack, `${where}: 스택`).toEqual(
        state.stack.filter((c) => c.code === 'function').map((c) => c.id),
      )

      // this: GetThisEnvironment로 정한 값
      expect(snapshot.self, `${where}: this`).toBe(thisValueOf(state))

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
      if (state.lookup?.kind === 'identifier') {
        const p = snapshot.vals.find((v) => v.name === state.lookup!.name)!
        expect(p.error, `${where}: lookup`).toBeNull()
        expect(p.disp, `${where}: lookup.result`).toBe(state.lookup.result)
      } else if (state.lookup?.kind === 'this') {
        expect(snapshot.self, `${where}: lookup.result(this)`).toBe(state.lookup.result)
      }
    })
  })
})
