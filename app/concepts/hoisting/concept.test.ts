import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { format } from 'node:util'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type Val } from './scenarios'

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
  it('var에 담은 함수 표현식을 미리 호출하면 TypeError', () => {
    expect(errorNameOf('triple(3); var triple = function (n) { return n * 3; };')).toBe('TypeError')
  })

  it('선언하지 않은 이름을 읽으면 ReferenceError, typeof는 undefined', () => {
    expect(errorNameOf('nope;')).toBe('ReferenceError')
    expect(runInNewContext('typeof nope')).toBe('undefined')
  })

  it('const에 담은 함수 표현식을 미리 호출하면 ReferenceError, let도 선언문 앞에서 읽으면 ReferenceError', () => {
    expect(errorNameOf('triple(3); const triple = function (n) { return n * 3; };')).toBe(
      'ReferenceError',
    )
    expect(errorNameOf('triple(3); let triple = function (n) { return n * 3; };')).toBe(
      'ReferenceError',
    )
    expect(errorNameOf('a; let a = 1;')).toBe('ReferenceError')
  })

  it('대입 없는 var 재선언은 값을 바꾸지 않는다', () => {
    expect(runInNewContext('var a = 1; var a; a')).toBe(1)
  })

  it('함수 선언 뒤의 대입 없는 var는 함수를 undefined로 만들지 않는다', () => {
    expect(runInNewContext('function item() {} var item; typeof item')).toBe('function')
  })

  it('함수 안의 var도 본문 실행 전에 처리되어 undefined로 읽힌다', () => {
    expect(
      runInNewContext("function f() { var r = typeof x; var x = 2; return r + ' ' + x; } f()"),
    ).toBe('undefined 2')
  })

  it('함수 안에서 매개변수와 같은 이름의 var는 인수 값으로 시작한다', () => {
    expect(runInNewContext('function f(x) { var x; return x } f(1)')).toBe(1)
  })

  it('함수 안에서도 같은 이름의 var와 함수 선언이 있으면 선언 처리 뒤 값은 함수다', () => {
    expect(
      runInNewContext(
        "function f() { var r = typeof g; var g = 1; function g() {} return r + ' ' + typeof g } f()",
      ),
    ).toBe('function number')
  })

  it('호스트가 미리 제공한 전역 이름은 선언하지 않아도 ReferenceError가 아니다', () => {
    expect(runInNewContext('existing', { existing: 'host' })).toBe('host')
  })

  it('전역 객체에 이미 있는 이름: var 선언은 기존 값을 유지하고 함수 선언은 함수로 바꾼다', () => {
    expect(runInNewContext('var existing; existing', { existing: 'host' })).toBe('host')
    expect(runInNewContext('function existing() {} typeof existing', { existing: 'host' })).toBe(
      'function',
    )
  })

  it('선언 처리는 스크립트 하나 단위다: 같은 컨텍스트의 다음 스크립트 선언은 앞 스크립트가 실행될 때 아직 없다', () => {
    const context = createContext({})
    expect(runInContext('typeof later', context)).toBe('undefined')
    runInContext('function later() {}', context)
    expect(runInContext('typeof later', context)).toBe('function')
  })
})

// 본문·단순화의 "클래식 스크립트 기준" 서술 근거. ES 모듈과 Node CommonJS 파일은 vm 스크립트로 재현할 수 없어
// 같은 Node로 별도 프로세스를 띄워 확인한다.
const runNode = (args: string[]): { out: string; err: string } => {
  try {
    return {
      out: execFileSync(process.execPath, args, { encoding: 'utf8', stdio: 'pipe' }),
      err: '',
    }
  } catch (e) {
    const { stdout, stderr } = e as { stdout: string; stderr: string }
    return { out: stdout, err: stderr }
  }
}
const runModule = (source: string) => runNode(['--input-type=module', '-e', source])
const exampleSource = (file: string) => readFileSync(join(examplesDir, file), 'utf8')

describe('실행 방식에 따른 차이 (클래식 스크립트 / ES 모듈 / Node CommonJS)', () => {
  it('ES 모듈에서도 var는 undefined로, 함수 선언은 함수로 실행 전에 초기화된다', () => {
    expect(runModule(exampleSource('var-before.js')).out).toBe('undefined\n10\n')
    expect(runModule(exampleSource('decl-vs-expr.js')).out).toBe('8\nundefined\n9\n')
    expect(runModule(exampleSource('unexecuted-var.js')).out).toBe('undefined\nundefined\n')
  })

  it('ES 모듈에서는 같은 이름의 var와 함수 선언, 같은 이름의 함수 선언 두 개가 SyntaxError다', () => {
    expect(runModule(exampleSource('same-name.js')).err).toContain('SyntaxError')
    expect(runModule(exampleSource('duplicate-function.js')).err).toContain('SyntaxError')
  })

  it('ES 모듈의 var·함수 선언은 전역 객체의 프로퍼티가 되지 않고, 코드는 strict mode다', () => {
    const { out } = runModule(
      'var score = 10; function f() {} console.log(typeof globalThis.score, typeof globalThis.f, (function () { return this })() === undefined)',
    )
    expect(out).toBe('undefined undefined true\n')
  })

  it('클래식 스크립트의 맨 바깥 var·함수 선언은 전역 객체의 프로퍼티가 된다', () => {
    expect(
      runInNewContext(
        'var score = 10; function f() {} typeof globalThis.score + " " + typeof globalThis.f',
      ),
    ).toBe('number function')
  })

  it('Node CommonJS 파일에서는 예제 출력이 같지만 var·함수 선언이 전역 객체의 프로퍼티가 되지 않는다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hoisting-cjs-'))
    try {
      for (const example of concept.examples) {
        const file = join(dir, example.file.replace(/\.js$/, '.cjs'))
        writeFileSync(file, exampleSource(example.file))
        expect(runNode([file]).out, example.file).toBe(example.expectedOutput.join('\n') + '\n')
      }
      const probe = join(dir, 'probe.cjs')
      writeFileSync(
        probe,
        'var score = 10; function f() {} console.log(typeof globalThis.score, typeof globalThis.f)',
      )
      expect(runNode([probe]).out).toBe('undefined undefined\n')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조 + 선언 처리 순서(소스에서 계산) + 예제에 스냅샷 코드를 끼워 얻은 실제 값과의 대조
// + declaredBy + changed 계산

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

type Snap = { entries: [string, string, string][]; outCount: number }

// 지정한 줄(0 = 맨 앞) 뒤에 컨텍스트 안에서 읽는 스냅샷 코드를 끼워 실행한다. 호스트에서 sandbox 객체를 읽으면
// 대입 전 var가 absent로 보이므로 반드시 컨텍스트 안에서 hasOwnProperty·typeof·String으로 읽는다.
function runWithSnapshots(
  source: string,
  names: string[],
  afterLines: number[],
): { snaps: Map<number, Snap>; logs: string[] } {
  const snaps = new Map<number, Snap>()
  const logs: string[] = []
  const sandbox = {
    console: { log: (...a: unknown[]) => logs.push(format(...a)) },
    __snap: (at: number, entries: [string, string, string][]) =>
      snaps.set(at, { entries: entries.map(([n, t, s]) => [n, t, s]), outCount: logs.length }),
  }
  const has = (n: string) => `Object.prototype.hasOwnProperty.call(globalThis, '${n}')`
  const probe = (at: number) =>
    `__snap(${at}, [${names
      .map((n) => `['${n}', ${has(n)} ? typeof ${n} : 'absent', ${has(n)} ? String(${n}) : '']`)
      .join(', ')}]);`
  const out: string[] = [probe(0)]
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (afterLines.includes(i + 1)) out.push(probe(i + 1))
  })
  runInNewContext(out.join('\n'), sandbox, { timeout: 2000 })
  return { snaps, logs }
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 var-before, decl-vs-expr, same-name이다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['var-before', 'decl-vs-expr', 'same-name'])
  })

  it('단계 수는 5 / 8 / 6이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([5, 8, 6])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const sourceLines = () => source().split('\n')
  const steps = scenario.steps
  const lineTextOf = (i: number): string => {
    const line = steps[i].line
    expect(line, `단계 ${i + 1}: line이 필요합니다`).toBeDefined()
    return sourceLines()
      .slice(line!.from - 1, line!.to)
      .join('\n')
  }
  const bindingsAt = (i: number): Binding[] => (i < 0 ? [] : steps[i].state.bindings)
  const sameVal = (a: Val, b: Val): boolean => a.type === b.type && a.display === b.display
  const declareIdx = () => steps.flatMap((s, i) => (s.state.phase === 'declare' ? [i] : []))
  const runIdx = () => steps.flatMap((s, i) => (s.state.phase === 'run' ? [i] : []))
  const finalNames = () => steps[steps.length - 1].state.bindings.map((b) => b.name)

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('단계 구조: 첫 단계만 before(빈 목록, line 없음), 그 뒤 declare들, 그 뒤 run들, run의 line은 겹치지 않고 증가한다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.state).toEqual({ phase: 'before', bindings: [] })
    expect(first.line).toBeUndefined()
    expect(first.output).toEqual([])
    const phases = steps.map((s) => s.state.phase)
    const d = declareIdx()
    const r = runIdx()
    expect(phases.filter((p) => p === 'before').length).toBe(1)
    expect(d.length).toBeGreaterThan(0)
    expect(r.length).toBeGreaterThan(0)
    expect([...d, ...r], '단계 순서는 before, declare들, run들이어야 합니다').toEqual(
      Array.from({ length: steps.length - 1 }, (_, k) => k + 1),
    )
    expect(Math.max(...d)).toBeLessThan(Math.min(...r))
    steps.slice(1).forEach((step, k) => expect(step.line, `단계 ${k + 2}`).toBeDefined())
    r.slice(1).forEach((i, k) => {
      expect(steps[i].line!.from, `단계 ${i + 1}: run line은 앞 단계 뒤에서 시작`).toBeGreaterThan(
        steps[r[k]].line!.to,
      )
    })
  })

  it('선언 처리 순서(GlobalDeclarationInstantiation): 함수 선언(같은 이름은 마지막 것)을 소스 순서로, 그다음 함수 선언과 이름이 다른 var를 소스 순서로(이름 중복 제거)', () => {
    const funcs: [number, string][] = []
    const vars: [number, string][] = []
    sourceLines().forEach((text, i) => {
      const f = /^function (\w+)\(/.exec(text)
      if (f) funcs.push([i + 1, f[1]])
      const v = /^var (\w+)/.exec(text)
      if (v) vars.push([i + 1, v[1]])
    })
    const lastFuncs = funcs.filter(([, n], i) => !funcs.slice(i + 1).some(([, m]) => m === n))
    const firstVars = vars.filter(
      ([, n], i) => !vars.slice(0, i).some(([, m]) => m === n) && !funcs.some(([, m]) => m === n),
    )
    const expected = [...lastFuncs, ...firstVars]
    const actual = declareIdx().map((i) => steps[i].line!.from)
    expect(actual, '선언 처리 단계의 줄 순서가 명세 순서와 다릅니다').toEqual(
      expected.map(([from]) => from),
    )
    declareIdx().forEach((i, k) => {
      expect(
        lineTextOf(i).includes(expected[k][1]),
        `단계 ${i + 1}: 강조 줄에 ${expected[k][1]}가 있어야 합니다`,
      ).toBe(true)
    })
  })

  it('스냅샷 대조: 마지막 선언 처리 단계 = 실행 전 스냅샷, 각 실행 단계 = 그 단계 line.to 뒤 스냅샷(출력 포함)', () => {
    const names = finalNames()
    const runs = runIdx()
    const { snaps, logs } = runWithSnapshots(
      source(),
      names,
      runs.map((i) => steps[i].line!.to),
    )
    expect(logs, '예제 실제 출력이 expectedOutput과 다릅니다').toEqual(example!.expectedOutput)

    const compare = (i: number, snap: Snap) => {
      const where = `단계 ${i + 1}`
      const live = snap.entries.filter(([, t]) => t !== 'absent')
      const bindings = steps[i].state.bindings
      expect(
        bindings.map((b) => b.name).sort(),
        `${where}: 만들어진 이름 목록이 실제와 다릅니다`,
      ).toEqual(live.map(([n]) => n).sort())
      for (const b of bindings) {
        const [, t, s] = snap.entries.find(([n]) => n === b.name)!
        expect(b.value.type, `${where}: ${b.name}의 type`).toBe(t)
        if (b.value.type === 'function') {
          const firstLine = s.split('\n')[0]
          const display = s.includes('\n') ? `${firstLine} … }` : s
          expect(b.value.display, `${where}: ${b.name}의 display`).toBe(display)
          const range = b.value.source
          const text = sourceLines()
            .slice(range.from - 1, range.to)
            .join('\n')
          expect(
            text.includes(s),
            `${where}: ${b.name}의 source 줄 범위에 함수 원문이 있어야 합니다`,
          ).toBe(true)
        } else {
          expect(b.value.display, `${where}: ${b.name}의 display`).toBe(s)
        }
      }
      expect(steps[i].output, `${where}: output`).toEqual(logs.slice(0, snap.outCount))
    }

    const lastDeclare = Math.max(...declareIdx())
    compare(lastDeclare, snaps.get(0)!)
    expect(snaps.get(0)!.outCount, '선언 처리가 끝난 시점에는 출력이 없어야 합니다').toBe(0)
    expect(steps[lastDeclare].output).toEqual([])
    for (const i of runs) compare(i, snaps.get(steps[i].line!.to)!)
  })

  it('declaredBy는 그 이름이 처음 생긴 선언 처리 단계의 강조 줄이 function으로 시작하면 function, var면 var', () => {
    const seen = new Set<string>()
    steps.forEach((step, i) => {
      for (const b of step.state.bindings) {
        if (seen.has(b.name)) continue
        seen.add(b.name)
        expect(
          step.state.phase,
          `단계 ${i + 1}: ${b.name}은 선언 처리 단계에서 생겨야 합니다`,
        ).toBe('declare')
        expect(
          lineTextOf(i).includes(b.name),
          `단계 ${i + 1}: 강조 줄에 ${b.name}가 있어야 합니다`,
        ).toBe(true)
        const expected = lineTextOf(i).startsWith('function') ? 'function' : 'var'
        expect(b.declaredBy, `단계 ${i + 1}: ${b.name}의 declaredBy`).toBe(expected)
      }
    })
    steps.forEach((step, i) => {
      const names = step.state.bindings.map((b) => b.name)
      expect(duplicates(names), `단계 ${i + 1}`).toEqual([])
      step.state.bindings.forEach((b) => {
        const prev = bindingsAt(i - 1).find((p) => p.name === b.name)
        if (prev)
          expect(b.declaredBy, `단계 ${i + 1}: ${b.name}의 declaredBy는 그대로`).toBe(
            prev.declaredBy,
          )
      })
    })
  })

  it('changed는 이전 단계와 비교해 새로 생기면 created, 값이 바뀌면 updated, 나머지는 없다', () => {
    steps.forEach((step, i) => {
      for (const b of step.state.bindings) {
        const before = bindingsAt(i - 1).find((p) => p.name === b.name)
        const expected = !before
          ? 'created'
          : !sameVal(before.value, b.value)
            ? 'updated'
            : undefined
        expect(b.changed, `단계 ${i + 1}: ${b.name}의 changed가 계산값과 다릅니다`).toBe(expected)
      }
    })
  })
})
