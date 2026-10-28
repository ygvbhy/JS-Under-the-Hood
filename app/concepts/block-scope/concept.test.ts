import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Script, createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type BlockState } from './scenarios'

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
  it.each(['let a = 1; let a = 2;', 'var a = 1; let a = 2;', 'let a = 1; var a = 2;'])(
    '중복 선언은 SyntaxError: %s',
    (source) => {
      expect(errorNameOf(source)).toBe('SyntaxError')
    },
  )

  it('중복 선언은 early error라 앞의 문장도 실행되지 않는다', () => {
    const out: unknown[] = []
    let name: string | null = null
    try {
      runInNewContext('console.log(1); let a = 1; let a = 2;', {
        console: { log: (...args: unknown[]) => out.push(args) },
      })
    } catch (e) {
      name = (e as Error).name
    }
    expect(name).toBe('SyntaxError')
    expect(out).toEqual([])
  })

  it('const 재할당은 sloppy mode에서도 TypeError', () => {
    expect(errorNameOf('const b = 1; b = 2;')).toBe('TypeError')
  })

  it('초기값 없는 const 선언은 SyntaxError', () => {
    expect(errorNameOf('const c;')).toBe('SyntaxError')
  })

  it('암묵적 전역은 대입 전에 읽으면 ReferenceError', () => {
    expect(errorNameOf('x; x = 1;')).toBe('ReferenceError')
  })

  it('var는 선언문 전에 읽으면 undefined', () => {
    expect(runInNewContext('var r = q; var q = 1; r')).toBeUndefined()
  })

  it('블록 안의 let은 블록 밖에서 ReferenceError', () => {
    expect(errorNameOf('{ let z = 1; } z')).toBe('ReferenceError')
  })

  it('strict mode에서 선언 없는 대입은 ReferenceError', () => {
    expect(errorNameOf("'use strict'; function f() { w = 1 } f()")).toBe('ReferenceError')
  })

  it('var로 선언한 전역 변수는 delete가 false', () => {
    expect(runInNewContext('var dv = 1; delete dv')).toBe(false)
  })

  it('맨 바깥의 함수 선언은 전역 객체의 프로퍼티', () => {
    expect(runInNewContext('function gf() {} globalThis.gf === gf')).toBe(true)
  })

  it('strict mode에서 식별자에 delete를 쓰면 SyntaxError', () => {
    expect(errorNameOf("'use strict'; var sd = 1; delete sd")).toBe('SyntaxError')
  })

  it('let과 같은 이름의 var가 안쪽 블록에 있어도 SyntaxError, 블록 바깥에 있으면 허용', () => {
    expect(errorNameOf('let x; if (true) { var x; }')).toBe('SyntaxError')
    expect(errorNameOf('function f() { let x; { var x; } }')).toBe('SyntaxError')
    expect(runInNewContext('{ let a = 1; } var a = 2; a')).toBe(2)
  })

  it('안쪽 함수 안의 var는 바깥의 let과 충돌하지 않는다', () => {
    expect(errorNameOf('let x; function f() { var x; }')).toBeNull()
    expect(errorNameOf('function g() { let y; function h() { var y; } }')).toBeNull()
    expect(errorNameOf('let x; if (true) { if (true) { var x; } }')).toBe('SyntaxError')
  })

  it('for…in 머리의 const는 초기값 없이 쓸 수 있다', () => {
    expect(runInNewContext("var r = ''; for (const k in { a: 1, b: 2 }) { r += k } r")).toBe('ab')
  })

  it('스크립트가 나뉘면 뒤 스크립트의 선언 처리에서 SyntaxError, 그 스크립트의 어떤 줄도 실행되지 않는다', () => {
    const out: unknown[] = []
    const context = createContext({ console: { log: (...args: unknown[]) => out.push(args) } })
    runInContext('let shared = 1;', context)
    const second = new Script("console.log('ran'); var shared = 2;") // 컴파일은 된다(early error 아님)
    let name: string | null = null
    try {
      second.runInContext(context)
    } catch (e) {
      name = (e as Error).name
    }
    expect(name).toBe('SyntaxError')
    expect(out).toEqual([])
  })
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
    const dir = mkdtempSync(join(tmpdir(), 'block-scope-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return runNodeFile(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  const sameInBoth = [
    'block-var-let.js',
    'function-block.js',
    'for-loop.js',
    'redeclare.js',
    'const-object.js',
  ]

  it.each(sameInBoth.flatMap((f) => (['.mjs', '.cjs'] as const).map((ext) => [f, ext] as const)))(
    '%s (%s): 클래식 스크립트와 같은 출력',
    (file, ext) => {
      const result = runAs(file, ext)
      expect(result.status).toBe(0)
      expect(result.stdout).toBe(expected(file))
    },
  )

  it('implicit-global.js: .mjs는 ReferenceError, .cjs는 클래식 스크립트와 같은 출력', () => {
    const esm = runAs('implicit-global.js', '.mjs')
    expect(esm.status).not.toBe(0)
    expect(esm.stderr).toContain('ReferenceError')
    const cjs = runAs('implicit-global.js', '.cjs')
    expect(cjs.status).toBe(0)
    expect(cjs.stdout).toBe(expected('implicit-global.js'))
  })

  it('implicit-vs-var.js: .mjs는 SyntaxError, .cjs는 클래식 스크립트와 같은 출력', () => {
    const esm = runAs('implicit-vs-var.js', '.mjs')
    expect(esm.status).not.toBe(0)
    expect(esm.stderr).toContain('SyntaxError')
    const cjs = runAs('implicit-vs-var.js', '.cjs')
    expect(cjs.status).toBe(0)
    expect(cjs.stdout).toBe(expected('implicit-vs-var.js'))
  })

  it.each(['.mjs', '.cjs'] as const)('global-object.js (%s): 세 값이 모두 undefined', (ext) => {
    const result = runAs('global-object.js', ext)
    expect(result.status).toBe(0)
    expect(result.stdout).toBe('undefined\nundefined\nundefined\n')
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(바깥 스코프 연결, 찾기 경로) + 함수 정의 위치 표·블록 선언 이름(소스에서 계산)
// + 예제에 스냅샷 코드를 끼워 얻은 실제 값과의 대조

// 함수를 "정의한 곳"의 스코프. 손으로 쓴 표이고, 아래에서 소스의 줄 범위 포함 관계로 계산한 값과 대조한다.
const definitionTable: Record<string, string> = { pick: 'global', setScore: 'global' }

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

type Probe = { name: string; type: string; text: string; error: string | null; own: boolean }

// 예제를 새 컨텍스트에서 실행하되 afterLine 줄(0 = 맨 앞) 뒤에 names를 평가하는 코드를 끼운다.
// 값은 컨텍스트 안에서 typeof·String으로 읽어 JSON 문자열로 넘기고(호스트에서 sandbox를 읽지 않는다),
// 이름 평가가 던진 오류의 이름과 "전역 객체의 own property인가"도 컨텍스트 안에서 계산한다.
// 가장 먼저 실행된 스냅샷만 기록한다.
function probeAt(source: string, afterLine: number, names: string[]): Probe[] {
  let recorded: Probe[] | null = null
  const sandbox = {
    console: { log: () => {} },
    __snap: (json: string) => {
      recorded ??= JSON.parse(json) as Probe[]
    },
  }
  const one = (n: string) =>
    `(() => { const own = Object.prototype.hasOwnProperty.call(globalThis, '${n}'); ` +
    `try { const t = typeof ${n}; return { name: '${n}', type: t, ` +
    `text: t === 'undefined' ? 'undefined' : String(${n}), error: null, own }; } ` +
    `catch (e) { return { name: '${n}', type: 'error', text: '', error: e.name, own }; } })()`
  const probe = `__snap(JSON.stringify([${names.map(one).join(', ')}]));`
  const out: string[] = afterLine === 0 ? [probe] : []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (i + 1 === afterLine) out.push(probe)
  })
  runInNewContext(out.join('\n'), sandbox, { timeout: 2000 })
  expect(recorded, `줄 ${afterLine} 뒤의 스냅샷이 실행되지 않았습니다`).not.toBeNull()
  return recorded!
}

const displayOf = (type: string, text: string) => (type === 'string' ? `'${text}'` : text)

// 못 찾고 끝나는 찾기 경로가 허용되는 단계(시나리오 id, 단계 번호 0-based).
const notFoundAllowList = [
  ['block-var-let', 9],
  ['function-block', 9],
  ['implicit-global', 4],
]

describe('block-scope 시나리오 id', () => {
  it('시나리오 id 순서는 block-var-let, function-block, implicit-global이다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'block-var-let',
      'function-block',
      'implicit-global',
    ])
  })

  it('단계 수는 10 / 10 / 8이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([10, 10, 8])
  })

  it('못 찾고 끝나는 찾기 경로는 허용 목록의 단계에만 있다', () => {
    const found: [string, number][] = []
    for (const sc of scenarios) {
      sc.steps.forEach((step, i) => {
        const lookup = step.state.lookup
        if (lookup && !lookup.path.at(-1)!.found) found.push([sc.id, i])
      })
    }
    expect(found).toEqual(notFoundAllowList)
  })
})

describe.each(scenarios)('block-scope 시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readExample(example!.file)
  const steps = scenario.steps
  const stateAt = (i: number): BlockState => steps[i].state

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

  it('전역 선언 처리: 함수 선언이 먼저, 그 뒤에 var 이름, 모두 created·전역 객체 프로퍼티', () => {
    const bindings = stateAt(1).scopes[0].bindings
    const kinds = bindings.map((bd) => bd.declaredBy)
    expect(kinds.lastIndexOf('function'), '함수 선언이 var 이름보다 앞').toBeLessThan(
      kinds.includes('var') ? kinds.indexOf('var') : kinds.length,
    )
    for (const bd of bindings) {
      expect(bd.changed, bd.name).toBe('created')
      expect(bd.onGlobalObject, bd.name).toBe(true)
    }
  })

  it('구조: 스코프 id 유일, outerId는 같은 단계의 스코프(전역만 null), currentId 존재, 라벨·종류·전역 객체 표시', () => {
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
          // 전역 객체의 프로퍼티가 되는 것은 전역의 var·함수 선언·암묵적 전역뿐이다.
          const expectedOnGlobal =
            s.id === 'global' && bd.declaredBy !== 'let' && bd.declaredBy !== 'const'
          expect(bd.onGlobalObject === true, `${where}: ${s.id}.${bd.name}의 onGlobalObject`).toBe(
            expectedOnGlobal,
          )
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

  it('이름의 declaredBy는 소스의 선언과 맞다(암묵적 전역은 선언 키워드 없이 대입만)', () => {
    const src = source()
    for (const step of steps) {
      for (const s of step.state.scopes) {
        for (const bd of s.bindings) {
          if (bd.declaredBy === 'function')
            expect(src, bd.name).toMatch(new RegExp(`function ${bd.name}\\(`))
          else if (bd.declaredBy === 'implicit') {
            expect(src, bd.name).toMatch(new RegExp(`^\\s*${bd.name} = `, 'm'))
            expect(namesDeclared(src, 'var|let|const'), bd.name).not.toContain(bd.name)
          } else expect(namesDeclared(src, bd.declaredBy), bd.name).toContain(bd.name)
        }
      }
    }
  })

  it('찾기 경로: 현재 스코프에서 시작해 outerId 순서로 올라가고, 처음 찾은 곳(또는 허용된 단계의 전역)에서 끝난다', () => {
    steps.forEach((step, i) => {
      const { lookup, scopes, currentId } = step.state
      if (!lookup) return
      const where = `단계 ${i + 1}`
      const { path, name } = lookup
      const last = path[path.length - 1]
      // 암묵적 전역을 만드는 단계는 같은 단계의 상태에 이미 새 이름이 있으므로 이전 단계 기준으로 유무를 본다.
      const reference = !last.found && i > 0 ? stateAt(i - 1).scopes : scopes
      expect(path.length, `${where}: 경로가 비어 있습니다`).toBeGreaterThan(0)
      expect(path[0].scopeId, `${where}: 경로는 currentId에서 시작`).toBe(currentId)
      path.forEach((p, k) => {
        const scope = reference.find((s) => s.id === p.scopeId)
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
        if (k < path.length - 1) expect(p.found, `${where}: 중간 스코프는 found:false`).toBe(false)
      })
      if (!last.found)
        expect(last.scopeId, `${where}: 못 찾았다면 전역에서 끝나야 합니다`).toBe('global')
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

  it('호출 시작·함수 끝: 스코프 추가/제거, 현재 스코프, 강조 줄, 함수 본문의 var 이름이 소스의 함수 범위와 같다', () => {
    const src = source()
    const ranges = functionRanges(src)
    steps.forEach((step, i) => {
      const where = `단계 ${i + 1}`
      const start = /^호출 시작: (\w+)$/.exec(step.title)
      const end = /^(\w+) 함수 끝$/.exec(step.title)
      const prevIds = i === 0 ? [] : stateAt(i - 1).scopes.map((s) => s.id)
      const ids = step.state.scopes.map((s) => s.id)
      if (start) {
        const f = ranges.find((r) => r.name === start[1])!
        expect(ids, `${where}: 새 스코프는 맨 뒤에 추가`).toEqual([...prevIds, f.name])
        expect(step.state.currentId).toBe(f.name)
        expect(step.state.lookup).toBeNull()
        expect(step.line).toEqual({ from: f.from, to: f.to })
        const scope = step.state.scopes.at(-1)!
        expect(scope.kind).toBe('function')
        // 함수 본문 어디에서 선언했든(블록 안 포함) var 이름은 함수 스코프에 undefined로 있다.
        const body = sourceLines(src, f.from + 1, f.to - 1)
        expect(scope.bindings.map((bd) => bd.name).sort(), `${where}: 함수 스코프 이름`).toEqual(
          namesDeclared(body, 'var').sort(),
        )
        for (const bd of scope.bindings) {
          expect(bd.changed).toBe('created')
          expect(bd.declaredBy).toBe('var')
          expect(bd.value.type).toBe('undefined')
        }
      } else if (end) {
        const f = ranges.find((r) => r.name === end[1])!
        expect(prevIds.at(-1), `${where}: 가장 나중에 만든 스코프가 끝난다`).toBe(f.name)
        expect(ids).toEqual(prevIds.slice(0, -1))
        expect(step.state.currentId, `${where}: 호출한 쪽 스코프로 돌아간다`).toBe(prevIds.at(-2))
        expect(step.state.lookup).toBeNull()
        expect(step.line).toEqual({ from: f.to, to: f.to })
      }
    })
  })

  it('블록 진입·끝: 바깥은 직전의 현재 스코프, 이름은 블록 줄 범위의 let·const와 같고 var는 없다', () => {
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
      const ids = step.state.scopes.map((s) => s.id)
      expect(ids, `${where}: 새 스코프는 맨 뒤에 추가`).toEqual([
        ...prev.scopes.map((s) => s.id),
        'if-block',
      ])
      const block = step.state.scopes.at(-1)!
      expect(block.kind).toBe('block')
      expect(block.outerId, `${where}: 블록의 outerId는 직전의 currentId`).toBe(prev.currentId)
      expect(step.state.currentId).toBe('if-block')
      expect(step.state.lookup).toBeNull()
      const inBlock = sourceLines(src, from + 1, to - 1)
      expect(block.bindings.map((bd) => bd.name).sort(), `${where}: 블록 스코프 이름`).toEqual(
        namesDeclared(inBlock, 'let|const').sort(),
      )
      for (const bd of block.bindings) {
        expect(['let', 'const'], `${where}: ${bd.name}`).toContain(bd.declaredBy)
        expect(bd.value.type).toBe('uninitialized')
        expect(bd.changed).toBe('created')
      }
      // 블록 끝: 같은 줄 범위의 닫는 중괄호 줄, 블록 스코프를 빼고 바깥으로 돌아간다.
      const endIdx = steps.findIndex((s, k) => k > i && s.title === '블록 끝')
      expect(endIdx, `${where}: 블록 끝 단계`).toBeGreaterThan(i)
      const end = steps[endIdx]
      expect(end.line).toEqual({ from: to, to })
      expect(end.state.scopes.map((s) => s.id)).toEqual(prev.scopes.map((s) => s.id))
      expect(end.state.currentId).toBe(block.outerId)
      expect(end.state.lookup).toBeNull()
      expect(stateAt(endIdx - 1).scopes.at(-1)!.id, `${where}: 마지막 스코프가 끝난다`).toBe(
        'if-block',
      )
    }
    // 블록 스코프는 블록 진입~블록 끝 사이에만 있다.
    steps.forEach((step, i) => {
      const hasBlock = step.state.scopes.some((s) => s.kind === 'block')
      const inside = entries.some((e) => {
        const endIdx = steps.findIndex((s, k) => k > e && s.title === '블록 끝')
        return i >= e && i < endIdx
      })
      expect(hasBlock, `단계 ${i + 1}`).toBe(inside)
    })
  })

  it('changed는 이전 단계와 비교해 새로 생기면 created, 초기화되면 initialized, 값이 바뀌면 updated, 나머지는 없다', () => {
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
                ? 'updated'
                : undefined
          expect(bd.changed, `단계 ${i + 1}: ${s.id}.${bd.name}의 changed`).toBe(expected)
        }
      }
    })
  })

  it('스냅샷 대조: 전역 선언 처리·호출 시작·블록 진입 시점의 이름·값·초기화 전·전역 객체 프로퍼티 여부', () => {
    const check = (stepIdx: number, scopeId: string, probes: Probe[]) => {
      const scope = stateAt(stepIdx).scopes.find((s) => s.id === scopeId)!
      for (const bd of scope.bindings) {
        const p = probes.find((x) => x.name === bd.name)!
        const where = `단계 ${stepIdx + 1}: ${scopeId}.${bd.name}`
        if (bd.value.type === 'uninitialized') {
          // 초기화 전인 이름은 실제로도 그 시점에 이름 평가가 ReferenceError를 던진다.
          expect(p.error, `${where}: 초기화 전이면 ReferenceError`).toBe('ReferenceError')
        } else {
          expect(p.error, `${where}: 오류 없이 평가`).toBeNull()
          expect(bd.value.type, `${where}의 type`).toBe(p.type)
          if (p.type === 'function') {
            expect(p.text.startsWith(`function ${bd.name}(`), `${where}: 실제 함수 원문`).toBe(true)
            expect(bd.value.display.startsWith(`function ${bd.name}(`), `${where}: display`).toBe(
              true,
            )
          } else {
            expect(bd.value.display, `${where}의 display`).toBe(displayOf(p.type, p.text))
          }
        }
        expect(p.own, `${where}: 전역 객체 프로퍼티 여부`).toBe(bd.onGlobalObject === true)
      }
    }
    steps.forEach((step, i) => {
      if (step.title === '전역 선언 처리') {
        const names = stateAt(i).scopes[0].bindings.map((bd) => bd.name)
        check(i, 'global', probeAt(source(), 0, names))
      } else if (step.title.startsWith('호출 시작: ') || step.title === '블록 진입') {
        const scope = stateAt(i).scopes.at(-1)!
        if (scope.bindings.length === 0) return
        const names = scope.bindings.map((bd) => bd.name)
        check(i, scope.id, probeAt(source(), step.line!.from, names))
      }
    })
  })

  it('스냅샷 대조: 이름 찾기 단계마다 실제 값 = 찾은 스코프에 표시한 값 (읽기는 line.from 앞, 대입은 line.to 뒤)', () => {
    steps.forEach((step, i) => {
      const { lookup, scopes } = step.state
      if (!lookup) return
      const where = `단계 ${i + 1}: ${lookup.name}`
      const last = lookup.path.at(-1)!
      if (!last.found) {
        // 끝까지 못 찾음: 대입이라도 대입 전에는 실제로 선언되어 있지 않다(typeof는 'undefined').
        const [p] = probeAt(source(), step.line!.from - 1, [lookup.name])
        expect(p.type, `${where}: 못 찾은 이름의 typeof`).toBe('undefined')
        expect(p.error).toBeNull()
        return
      }
      const afterLine = lookup.purpose === 'read' ? step.line!.from - 1 : step.line!.to
      const [p] = probeAt(source(), afterLine, [lookup.name])
      const bd = scopes
        .find((s) => s.id === last.scopeId)!
        .bindings.find((x) => x.name === lookup.name)!
      expect(p.error, `${where}: 오류 없이 평가`).toBeNull()
      expect(bd.value.type, `${where}의 type`).toBe(p.type)
      if (p.type === 'function') {
        expect(p.text.startsWith(`function ${lookup.name}(`)).toBe(true)
        expect(bd.value.display.startsWith(`function ${lookup.name}(`)).toBe(true)
      } else {
        expect(bd.value.display, `${where}의 display`).toBe(displayOf(p.type, p.text))
      }
    })
  })
})

describe('block-scope: 마지막 단계의 못 찾는 typeof', () => {
  it('block-var-let: 7번 줄 앞에서 typeof drink는 실제로 undefined이고, 경로는 전역 하나에서 found:false', () => {
    const [p] = probeAt(readExample('block-var-let.js'), 6, ['drink'])
    expect(p.type).toBe('undefined')
    expect(scenarios[0].steps.at(-1)!.state.lookup).toEqual({
      name: 'drink',
      purpose: 'read',
      path: [{ scopeId: 'global', found: false }],
    })
  })

  it('function-block: 9번 줄 앞에서 typeof item은 실제로 undefined이고, 경로는 전역 하나에서 found:false', () => {
    const [p] = probeAt(readExample('function-block.js'), 8, ['item'])
    expect(p.type).toBe('undefined')
    expect(scenarios[1].steps.at(-1)!.state.lookup).toEqual({
      name: 'item',
      purpose: 'read',
      path: [{ scopeId: 'global', found: false }],
    })
  })
})

describe('block-scope: 암묵적 전역', () => {
  const src = () => readExample('implicit-global.js')

  it('2번 줄 대입 전에는 전역 객체에 score가 없고, 대입 뒤에는 own property다', () => {
    const [beforeAssign] = probeAt(src(), 1, ['score'])
    expect(beforeAssign.own).toBe(false)
    expect(beforeAssign.type).toBe('undefined')
    const [afterAssign] = probeAt(src(), 2, ['score'])
    expect(afterAssign.own).toBe(true)
    expect(afterAssign.text).toBe('100')
  })

  it('시나리오: 대입 단계에서 전역 스코프에 implicit·100·전역 객체 프로퍼티가 created로 생긴다', () => {
    const step = scenarios[2].steps[4]
    expect(step.line).toEqual({ from: 2, to: 2 })
    expect(step.state.scopes[0].bindings.at(-1)).toEqual({
      name: 'score',
      declaredBy: 'implicit',
      value: { type: 'number', display: '100' },
      onGlobalObject: true,
      changed: 'created',
    })
    const prev = scenarios[2].steps[3].state.scopes[0]
    expect(prev.bindings.some((bd) => bd.name === 'score')).toBe(false)
  })
})
