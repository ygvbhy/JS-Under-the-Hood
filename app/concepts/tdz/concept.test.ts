import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type TdzState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')

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
  it.each([
    'console.log(a); let a = 1;',
    'let x = 1; { console.log(x); let x = 2; }',
    'function f() { return x; } console.log(f()); let x = 1;',
    'let x = x;',
    'function h() { console.log(v); let v = 1; } h();',
  ])('선언 전에 읽으면 ReferenceError: %s', (source) => {
    expect(errorNameOf(source)).toBe('ReferenceError')
  })

  it('선언문보다 아래에 쓴 함수라도 선언문 실행 전에 호출하면 ReferenceError, 뒤에 호출하면 값을 읽는다', () => {
    expect(errorNameOf('f(); let x = 1; function f() { return x; }')).toBe('ReferenceError')
    expect(runInNewContext('let x = 1; function f() { return x; } f()')).toBe(1)
  })

  it('let x = x는 초기값을 먼저 평가해 초기화 전인 x를 읽는다', () => {
    expect(errorNameOf('let x = x;')).toBe('ReferenceError')
    expect(errorNameOf('let y = (() => 1)(); let x = y;')).toBeNull()
  })

  it('const의 for…of 머리는 초기값 없이 쓴다 (본문 예외 문장의 근거)', () => {
    expect(runInNewContext("let s = ''; for (const c of 'ab') { s += c; } s")).toBe('ab')
  })

  it('선언 없는 이름의 typeof는 오류 없이 undefined다', () => {
    expect(runInNewContext('typeof zz')).toBe('undefined')
  })

  it('선언 전 let에 sloppy mode로 대입해도 ReferenceError이고 암묵적 전역이 생기지 않는다', () => {
    expect(errorNameOf('a = 2; let a = 1;')).toBe('ReferenceError')
    expect(
      runInNewContext(
        "try { a = 2; } catch (e) {} let a = 1; Object.prototype.hasOwnProperty.call(globalThis, 'a')",
      ),
    ).toBe(false)
  })

  it('선언 전 const에 대입하면 TypeError가 아니라 ReferenceError다', () => {
    expect(errorNameOf('x = 1; const x = 2;')).toBe('ReferenceError')
  })

  it('바깥 let을 가리는 블록이 아니면 바깥 값을 읽는다', () => {
    expect(runInNewContext('let x = 1; { x }')).toBe(1)
  })

  it('초기값이 없는 let은 선언문 실행 뒤 undefined다', () => {
    expect(runInNewContext('let x; x')).toBeUndefined()
  })

  it('class 선언도 선언 전에 쓰면 ReferenceError다 (단순화 항목의 근거)', () => {
    expect(errorNameOf('new C(); class C {}')).toBe('ReferenceError')
  })

  it('기본값 매개변수도 뒤 매개변수를 먼저 쓰면 ReferenceError다 (단순화 항목의 근거)', () => {
    expect(errorNameOf('function f(a = b, b) {} f();')).toBe('ReferenceError')
  })

  it('잡지 않은 오류는 앞줄 출력 뒤에 멈춘다 (early error와 다름)', () => {
    const out: string[] = []
    const sandbox = { console: { log: (...args: unknown[]) => out.push(args.join(' ')) } }
    let name: string | null = null
    try {
      runInNewContext('console.log(1); console.log(a); console.log(2); let a;', sandbox)
    } catch (e) {
      name = (e as Error).name
    }
    expect(name).toBe('ReferenceError')
    expect(out).toEqual(['1'])
  })

  it.each(concept.examples)(
    '$file: strict mode로 실행해도 같은 출력',
    ({ file, expectedOutput }) => {
      expect(runExample(`'use strict';\n${readExample(file)}`)).toEqual(expectedOutput)
    },
  )
})

describe('실행 방식에 따른 차이 (ES 모듈 / Node CommonJS)', () => {
  const expected = (file: string) =>
    concept.examples.find((e) => e.file === file)!.expectedOutput.join('\n') + '\n'

  // 오류로 끝난 실행은 execFileSync가 던지므로 stdout·stderr·status를 모아 돌려준다.
  const runNodeFile = (path: string) => {
    try {
      const stdout = execFileSync(process.execPath, [path], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { status: 0, stdout, stderr: '' }
    } catch (e) {
      const err = e as { status: number; stdout: string; stderr: string }
      return { status: err.status, stdout: err.stdout, stderr: err.stderr }
    }
  }

  const runAs = (file: string, ext: '.mjs' | '.cjs') => {
    const dir = mkdtempSync(join(tmpdir(), 'tdz-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return runNodeFile(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it.each(
    concept.examples.flatMap((e) =>
      (['.mjs', '.cjs'] as const).map((ext) => [e.file, ext] as const),
    ),
  )('%s (%s): 클래식 스크립트와 같은 출력', (file, ext) => {
    const result = runAs(file, ext)
    expect(result.status).toBe(0)
    expect(result.stdout).toBe(expected(file))
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(바깥 스코프 연결, 찾기 경로, 오류 표시) + 함수 정의 위치(소스에서 계산)
// + 예제에 스냅샷 코드를 끼워 컨텍스트 안에서 얻은 실제 값과의 대조

// 함수를 "정의한 곳"의 스코프. 손으로 쓴 표이고, 아래에서 소스의 줄 범위 포함 관계로 계산한 값과 대조한다.
const definitionTable: Record<string, string> = { show: 'global' }

type FnRange = { name: string; from: number; to: number }

// `function 이름(`부터 짝이 맞는 `}`까지의 줄 범위(1-based). 예제에는 중괄호가 든 문자열이 없다.
function functionRanges(source: string): FnRange[] {
  const lineOf = (index: number) => source.slice(0, index).split('\n').length
  return [...source.matchAll(/function (\w+)\(/g)].map((m) => {
    let i = source.indexOf('{', m.index)
    let depth = 0
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++
      else if (source[i] === '}' && --depth === 0) break
    }
    return { name: m[1], from: lineOf(m.index), to: lineOf(i) }
  })
}

function enclosingOf(f: FnRange, all: FnRange[]): string {
  const containers = all
    .filter((g) => g.from < f.from && g.to > f.to)
    .sort((a, b) => a.to - a.from - (b.to - b.from))
  return containers.length > 0 ? containers[0].name : 'global'
}

const sourceLines = (source: string, from: number, to: number) =>
  source
    .split('\n')
    .slice(from - 1, to)
    .join('\n')
const namesDeclared = (text: string, keywords: string) =>
  [...text.matchAll(new RegExp(`\\b(?:${keywords}) (\\w+)`, 'g'))].map((m) => m[1])

type Probe = { name: string; type: string; text: string; error: string | null }

// 예제를 새 컨텍스트에서 실행하되 afterLine 줄(0 = 맨 앞) 뒤에 names를 평가하는 코드를 끼운다.
// 끼운 코드는 그 줄이 속한 블록·함수 본문 안에서 실행되므로 같은 스코프를 본다.
// 값은 컨텍스트 안에서 typeof·String으로 읽어 JSON 문자열로 넘긴다(호스트에서 sandbox를 읽지 않는다).
// 같은 위치가 여러 번 실행되면 nth번째(0부터) 실행의 스냅샷을 돌려준다.
function probeAt(source: string, afterLine: number, names: string[], nth = 0): Probe[] {
  const snaps: Probe[][] = []
  const sandbox = {
    console: { log: () => {} },
    __snap: (json: string) => {
      snaps.push(JSON.parse(json) as Probe[])
    },
  }
  const one = (n: string) =>
    `(() => { try { const t = typeof ${n}; return { name: '${n}', type: t, ` +
    `text: t === 'undefined' ? 'undefined' : String(${n}), error: null }; } ` +
    `catch (e) { return { name: '${n}', type: 'error', text: '', error: e.name }; } })()`
  const probe = `__snap(JSON.stringify([${names.map(one).join(', ')}]));`
  runInNewContext(insertAfterLine(source, afterLine, probe), sandbox, { timeout: 2000 })
  expect(
    snaps.length,
    `줄 ${afterLine} 뒤의 ${nth + 1}번째 스냅샷이 실행되지 않았습니다`,
  ).toBeGreaterThan(nth)
  return snaps[nth]
}

function insertAfterLine(source: string, afterLine: number, code: string): string {
  const out: string[] = afterLine === 0 ? [code] : []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (i + 1 === afterLine) out.push(code)
  })
  return out.join('\n')
}

// afterLine 뒤에서 name을 읽으면 어떻게 되는지(던진 오류의 이름 또는 null)와, 그 시점까지의 실제 출력.
function readProbeAt(source: string, afterLine: number, name: string, nth = 0) {
  const out: string[] = []
  const results: { error: string | null; output: string[] }[] = []
  const sandbox = {
    console: { log: (...args: unknown[]) => out.push(args.join(' ')) },
    __read: (error: string | null) => {
      results.push({ error, output: [...out] })
    },
  }
  const code = `__read((() => { try { ${name}; return null; } catch (e) { return e.name; } })());`
  runInNewContext(insertAfterLine(source, afterLine, code), sandbox, { timeout: 2000 })
  expect(results.length, `줄 ${afterLine} 뒤의 ${nth + 1}번째 실행이 없습니다`).toBeGreaterThan(nth)
  return results[nth]
}

const displayOf = (type: string, text: string) => (type === 'string' ? `'${text}'` : text)

// currentId에서 outerId를 따라 올라가며, 이름마다 가장 안쪽 바인딩(= 실제로 보이는 것)을 모은다.
function visibleBindings(state: TdzState): Map<string, Binding> {
  const map = new Map<string, Binding>()
  let id = state.currentId
  while (id !== null) {
    const scope = state.scopes.find((s) => s.id === id)!
    for (const bd of scope.bindings) if (!map.has(bd.name)) map.set(bd.name, bd)
    id = scope.outerId
  }
  return map
}

// 스냅샷 대조 위치: [시나리오 id, 단계(0부터), 그 단계의 상태에 해당하는 코드 위치(afterLine), 몇 번째 실행인지]
const snapshotPoints: [string, number, number, number?][] = [
  ['let-before', 1, 0],
  ['let-before', 2, 1],
  ['let-before', 4, 6],
  ['let-before', 5, 6],
  ['shadow', 1, 0],
  ['shadow', 2, 1],
  ['shadow', 3, 2],
  ['shadow', 4, 3],
  ['shadow', 6, 8],
  ['shadow', 7, 8],
  ['shadow', 9, 10],
  ['time-not-place', 1, 0],
  ['time-not-place', 3, 1],
  ['time-not-place', 4, 1],
  ['time-not-place', 6, 9],
  ['time-not-place', 9, 1, 1],
]

// 단계마다 화면에 있어야 하는 스코프 id (생긴 순서).
const expectedScopeIds: Record<string, string[][]> = {
  'let-before': [[], ['global'], ['global'], ['global'], ['global'], ['global']],
  shadow: [
    [],
    ['global'],
    ['global'],
    ['global', 'if-block'],
    ['global', 'if-block'],
    ['global', 'if-block'],
    ['global', 'if-block'],
    ['global', 'if-block'],
    ['global'],
    ['global'],
  ],
  'time-not-place': [
    [],
    ['global'],
    ['global'],
    ['global', 'show'],
    ['global', 'show'],
    ['global'],
    ['global'],
    ['global'],
    ['global', 'show'],
    ['global', 'show'],
    ['global'],
  ],
}

describe('tdz 시나리오 id', () => {
  it('시나리오 id 순서는 let-before, shadow, time-not-place이다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['let-before', 'shadow', 'time-not-place'])
  })

  it('단계 수는 6 / 10 / 11이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([6, 10, 11])
  })
})

describe.each(scenarios)('tdz 시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readExample(example!.file)
  const steps = scenario.steps
  const stateAt = (i: number): TdzState => steps[i].state

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('첫 두 단계: 실행 전(빈 상태, line 없음), 전역 선언 처리(전역 스코프만, line 없음)', () => {
    expect(steps[0].title).toBe('실행 전')
    expect(steps[0].state).toEqual({ scopes: [], currentId: null, lookup: null })
    expect(steps[0].line).toBeUndefined()
    expect(steps[1].title).toBe('전역 선언 처리')
    expect(steps[1].line).toBeUndefined()
    expect(stateAt(1).scopes.map((s) => s.id)).toEqual(['global'])
    expect(stateAt(1).currentId).toBe('global')
    expect(stateAt(1).lookup).toBeNull()
    steps.slice(2).forEach((step, k) => expect(step.line, `단계 ${k + 3}`).toBeDefined())
  })

  it('전역 선언 처리: 모든 이름이 created이고, let 이름은 초기화 전, 함수 선언은 함수 값이다', () => {
    for (const bd of stateAt(1).scopes[0].bindings) {
      expect(bd.changed, bd.name).toBe('created')
      expect(bd.value.type === 'uninitialized', bd.name).toBe(bd.declaredBy === 'let')
      expect(bd.value.type === 'function', bd.name).toBe(bd.declaredBy === 'function')
    }
  })

  it('단계마다 화면에 있는 스코프 id가 기대한 목록과 같다', () => {
    expect(steps.map((s) => s.state.scopes.map((sc) => sc.id))).toEqual(
      expectedScopeIds[scenario.id],
    )
  })

  it('구조: 스코프 id 유일, outerId는 같은 단계의 스코프(전역만 null), currentId 존재, 라벨·종류·값 표시', () => {
    steps.forEach((step, i) => {
      const { scopes, currentId } = step.state
      const ids = scopes.map((s) => s.id)
      const where = `단계 ${i + 1}`
      expect(new Set(ids).size, `${where}: 스코프 id 중복`).toBe(ids.length)
      for (const s of scopes) {
        if (s.id === 'global') {
          expect(s.outerId, `${where}: global`).toBeNull()
          expect(s.kind).toBe('global')
          expect(s.label).toBe('전역 스코프')
        } else {
          expect(s.outerId, `${where}: ${s.id}의 outerId`).not.toBeNull()
          expect(ids, `${where}: ${s.id}의 outerId가 없는 스코프를 가리킵니다`).toContain(s.outerId)
          if (s.kind === 'block') {
            expect(s.id).toBe('if-block')
            expect(s.label).toBe('if 블록 스코프')
          } else {
            expect(s.kind).toBe('function')
            expect(s.label).toBe(`${s.id} 함수 스코프`)
          }
        }
        const names = s.bindings.map((bd) => bd.name)
        expect(new Set(names).size, `${where}: ${s.id}의 이름 중복`).toBe(names.length)
        for (const bd of s.bindings) {
          expect(
            (bd.value.type === 'uninitialized') === (bd.value.display === '초기화 전'),
            `${where}: ${bd.name}`,
          ).toBe(true)
          if (bd.value.type === 'uninitialized')
            expect(['let', 'const'], `${where}: ${bd.name}`).toContain(bd.declaredBy)
        }
      }
      if (scopes.length === 0) expect(currentId, where).toBeNull()
      else {
        expect(ids[0], `${where}: 전역이 첫 번째`).toBe('global')
        expect(ids, `${where}: currentId가 없는 스코프입니다`).toContain(currentId)
      }
    })
  })

  it('이름의 declaredBy는 소스의 선언과 맞다', () => {
    const src = source()
    for (const step of steps) {
      for (const s of step.state.scopes) {
        for (const bd of s.bindings) {
          if (bd.declaredBy === 'function')
            expect(src, bd.name).toMatch(new RegExp(`function ${bd.name}\\(`))
          else expect(namesDeclared(src, bd.declaredBy), bd.name).toContain(bd.name)
        }
      }
    }
  })

  it('찾기 경로: currentId에서 시작해 outerId를 따라 올라가고, 처음 찾은 스코프에서 끝나며, error는 초기화 전일 때만 붙는다', () => {
    steps.forEach((step, i) => {
      const { lookup, scopes, currentId } = step.state
      if (!lookup) return
      const where = `단계 ${i + 1}`
      const { path, name } = lookup
      expect(path.length, `${where}: 경로가 비어 있습니다`).toBeGreaterThan(0)
      expect(path[0].scopeId, `${where}: 경로는 currentId에서 시작`).toBe(currentId)
      path.forEach((p, k) => {
        const scope = scopes.find((s) => s.id === p.scopeId)
        expect(scope, `${where}: 경로의 스코프 ${p.scopeId}가 없습니다`).toBeDefined()
        if (k > 0) {
          const prev = scopes.find((s) => s.id === path[k - 1].scopeId)!
          expect(p.scopeId, `${where}: 경로는 이전 스코프의 outerId를 따라야 합니다`).toBe(
            prev.outerId,
          )
        }
        const has = scope!.bindings.some((bd) => bd.name === name)
        expect(has, `${where}: ${p.scopeId}의 ${name} 유무가 found(${p.found})와 다릅니다`).toBe(
          p.found,
        )
        expect(p.found, `${where}: 마지막 스코프만 found:true`).toBe(k === path.length - 1)
      })
      // 경로의 끝 = 가장 안쪽에 보이는 바인딩이 있는 스코프
      const last = path[path.length - 1]
      expect(last.found, `${where}: 이 시나리오의 모든 찾기는 이름을 찾는다`).toBe(true)
      const found = scopes
        .find((s) => s.id === last.scopeId)!
        .bindings.find((bd) => bd.name === name)!
      expect(found, `${where}: 경로의 끝이 가장 안쪽 바인딩`).toBe(
        visibleBindings(step.state).get(name),
      )
      expect(lookup.error === 'ReferenceError', `${where}: error ⇔ 찾은 이름이 초기화 전`).toBe(
        found.value.type === 'uninitialized',
      )
      if (lookup.error) expect(lookup.purpose, `${where}: 오류는 읽기 단계`).toBe('read')
    })
  })

  it('함수 스코프의 outerId는 정의 위치 표와 같고, 표는 소스의 줄 범위 포함 관계 계산과 같다', () => {
    const ranges = functionRanges(source())
    const computed = Object.fromEntries(ranges.map((f) => [f.name, enclosingOf(f, ranges)]))
    for (const f of ranges) {
      expect(computed[f.name], `${f.name}의 계산된 정의 위치`).toBe(definitionTable[f.name])
    }
    steps.forEach((step, i) => {
      for (const s of step.state.scopes) {
        if (s.kind !== 'function') continue
        expect(s.outerId, `단계 ${i + 1}: ${s.id}의 outerId`).toBe(definitionTable[s.id])
        expect(s.outerId).toBe(computed[s.id])
      }
    })
  })

  it('호출 시작·끝: 함수 스코프는 소스의 함수 줄 범위로 강조되고, 호출 중에만 있으며, 끝나면 호출한 쪽으로 돌아간다', () => {
    const ranges = functionRanges(source())
    steps.forEach((step, i) => {
      const where = `단계 ${i + 1}`
      const prevIds = i === 0 ? [] : stateAt(i - 1).scopes.map((s) => s.id)
      const ids = step.state.scopes.map((s) => s.id)
      const start = /^(\w+) 호출 시작$/.exec(step.title)
      if (start) {
        const f = ranges.find((r) => r.name === start[1])!
        expect(ids, `${where}: 새 스코프는 맨 뒤에 추가`).toEqual([...prevIds, f.name])
        expect(step.state.currentId).toBe(f.name)
        expect(step.state.lookup).toBeNull()
        expect(step.line).toEqual({ from: f.from, to: f.to })
        const scope = step.state.scopes.at(-1)!
        expect(scope.kind).toBe('function')
        // 함수 본문에는 let·const·함수 선언이 없어서 함수 스코프는 비어 있다.
        const body = sourceLines(source(), f.from + 1, f.to - 1)
        expect(scope.bindings.map((bd) => bd.name)).toEqual(
          namesDeclared(body, 'let|const|function'),
        )
      } else if (prevIds.length > ids.length && prevIds.at(-1) !== 'global') {
        expect(ids, `${where}: 가장 나중에 만든 스코프가 끝난다`).toEqual(prevIds.slice(0, -1))
        expect(step.state.currentId, `${where}: 바깥 스코프로 돌아간다`).toBe(prevIds.at(-2))
        expect(step.state.lookup).toBeNull()
      }
    })
  })

  it('블록 진입·끝: 바깥은 직전의 현재 스코프, 이름은 블록 줄 범위의 let·const와 같다', () => {
    const src = source()
    const entries = steps.flatMap((step, i) => (step.title === '블록 진입' ? [i] : []))
    for (const i of entries) {
      const step = steps[i]
      const where = `단계 ${i + 1}`
      const { from, to } = step.line!
      const lineList = src.split('\n')
      expect(lineList[from - 1].trimEnd().endsWith('{'), `${where}: 블록 시작 줄`).toBe(true)
      expect(lineList[to - 1].trim(), `${where}: 블록 끝 줄`).toBe('}')
      const prev = stateAt(i - 1)
      const block = step.state.scopes.at(-1)!
      expect(block.kind).toBe('block')
      expect(block.outerId, `${where}: 블록의 outerId는 직전의 currentId`).toBe(prev.currentId)
      expect(step.state.currentId).toBe('if-block')
      expect(step.state.lookup).toBeNull()
      // 블록 바로 안(try 안이 아니라 블록 본문)의 let 이름
      const inBlock = sourceLines(src, from + 1, to - 1)
      expect(block.bindings.map((bd) => bd.name).sort(), `${where}: 블록 스코프 이름`).toEqual(
        namesDeclared(inBlock, 'let|const').sort(),
      )
      for (const bd of block.bindings) {
        expect(bd.value.type).toBe('uninitialized')
        expect(bd.changed).toBe('created')
      }
      const endIdx = steps.findIndex((s, k) => k > i && s.title === '블록 끝')
      expect(endIdx, `${where}: 블록 끝 단계`).toBeGreaterThan(i)
      const end = steps[endIdx]
      expect(end.line).toEqual({ from: to, to })
      expect(end.state.scopes.map((s) => s.id)).toEqual(prev.scopes.map((s) => s.id))
      expect(end.state.currentId).toBe(block.outerId)
      expect(end.state.lookup).toBeNull()
    }
  })

  it('changed는 이전 단계와 비교해 새로 생기면 created, 초기화되면 initialized, 나머지는 없다', () => {
    steps.forEach((step, i) => {
      for (const s of step.state.scopes) {
        const prevScope = i === 0 ? undefined : stateAt(i - 1).scopes.find((p) => p.id === s.id)
        for (const bd of s.bindings) {
          const prev = prevScope?.bindings.find((p) => p.name === bd.name)
          const expected = !prev
            ? 'created'
            : prev.value.type === 'uninitialized' && bd.value.type !== 'uninitialized'
              ? 'initialized'
              : prev.value.type !== bd.value.type || prev.value.display !== bd.value.display
                ? 'unexpected-change'
                : undefined
          expect(bd.changed, `단계 ${i + 1}: ${s.id}.${bd.name}의 changed`).toBe(expected)
        }
      }
    })
  })

  it('스냅샷 대조: 컨텍스트 안에서 읽은 실제 값 = 보이는 이름의 표시 값 (초기화 전 ⇔ ReferenceError)', () => {
    const points = snapshotPoints.filter(([id]) => id === scenario.id)
    expect(points.length).toBeGreaterThan(0)
    for (const [, stepIdx, afterLine, nth] of points) {
      const visible = visibleBindings(stateAt(stepIdx))
      const probes = probeAt(source(), afterLine, [...visible.keys()], nth ?? 0)
      for (const [name, bd] of visible) {
        const p = probes.find((x) => x.name === name)!
        const where = `단계 ${stepIdx + 1}(줄 ${afterLine} 뒤): ${name}`
        if (bd.value.type === 'uninitialized') {
          expect(p.error, `${where}: 초기화 전이면 ReferenceError`).toBe('ReferenceError')
        } else {
          expect(p.error, `${where}: 오류 없이 평가`).toBeNull()
          expect(bd.value.type, `${where}의 type`).toBe(p.type)
          if (p.type === 'function') {
            expect(p.text.startsWith(`function ${name}(`), `${where}: 실제 함수 원문`).toBe(true)
            expect(bd.value.display.startsWith(`function ${name}(`), `${where}: display`).toBe(true)
          } else {
            expect(bd.value.display, `${where}의 display`).toBe(displayOf(p.type, p.text))
          }
        }
      }
    }
  })

  it('오류 단계: 그 줄에서 이름을 읽으면 실제로 ReferenceError이고, 단계 output은 그 시점까지의 실제 출력과 같다', () => {
    const errorSteps = steps.flatMap((step, i) => (step.state.lookup?.error ? [i] : []))
    expect(errorSteps.length).toBeGreaterThan(0)
    for (const i of errorSteps) {
      const step = steps[i]
      const where = `단계 ${i + 1}`
      const result = readProbeAt(source(), step.line!.from - 1, step.state.lookup!.name)
      expect(result.error, `${where}: 실제로 던지는 오류`).toBe(step.state.lookup!.error)
      expect(step.output, `${where}: output`).toEqual(result.output)
    }
  })

  it('오류가 없는 읽기 단계: 그 줄에서 이름을 읽으면 실제로 오류 없이 읽힌다', () => {
    steps.forEach((step, i) => {
      const lookup = step.state.lookup
      if (!lookup || lookup.purpose !== 'read' || lookup.error) return
      const nth = scenario.id === 'time-not-place' && i === 9 ? 1 : 0
      const result = readProbeAt(source(), step.line!.from - 1, lookup.name, nth)
      expect(result.error, `단계 ${i + 1}`).toBeNull()
    })
  })
})
