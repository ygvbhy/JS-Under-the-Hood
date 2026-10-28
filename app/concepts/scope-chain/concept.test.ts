import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type ScopeState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')
const withLet = (source: string) => source.replace(/\bvar\b/g, 'let')

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
  it('함수 안에서 끝까지 찾지 못한 이름을 읽으면 ReferenceError', () => {
    expect(errorNameOf('function f() { return missing } f()')).toBe('ReferenceError')
  })

  it('함수 안의 var는 바깥에서 보이지 않는다', () => {
    expect(runInNewContext('function o() { var a = 1 } o(); typeof a')).toBe('undefined')
  })

  it.each(['scope-chain.js', 'lexical-scope.js', 'shadowing.js', 'assign-outer.js'])(
    '%s: var를 let으로 바꿔도 결과가 같다',
    (file) => {
      const source = readExample(file)
      expect(runExample(withLet(source))).toEqual(runExample(source))
    },
  )

  it.each(['scope-chain.js', 'lexical-scope.js', 'shadowing.js'])(
    '%s: var를 const로 바꿔도 결과가 같다',
    (file) => {
      const source = readExample(file)
      expect(runExample(source.replace(/\bvar\b/g, 'const'))).toEqual(runExample(source))
    },
  )

  it('찾지 못한 이름에 대입하면 sloppy mode에서는 전역 객체의 프로퍼티가 생기고, strict mode에서는 ReferenceError', () => {
    expect(
      runInNewContext(
        "function f() { undeclared = 1 } f(); Object.prototype.hasOwnProperty.call(globalThis, 'undeclared')",
      ),
    ).toBe(true)
    expect(errorNameOf("'use strict'; function f() { undeclared = 1 } f();")).toBe('ReferenceError')
  })

  it('shadow-hoisting.js: var를 let으로 바꾸면 ReferenceError', () => {
    expect(errorNameOf(withLet(readExample('shadow-hoisting.js')))).toBe('ReferenceError')
  })

  it("scope-chain.js: 'use strict'를 붙여도 결과가 같다", () => {
    const source = readExample('scope-chain.js')
    expect(runExample(`'use strict';\n${source}`)).toEqual(runExample(source))
  })
})

describe('실행 방식에 따른 차이 (ES 모듈 / Node CommonJS)', () => {
  const runNodeFile = (file: string) => execFileSync(process.execPath, [file], { encoding: 'utf8' })

  it.each(['.mjs', '.cjs'])('%s 파일로 실행해도 예제 출력이 같다', (ext) => {
    const dir = mkdtempSync(join(tmpdir(), 'scope-chain-'))
    try {
      for (const example of concept.examples) {
        const file = join(dir, example.file.replace(/\.js$/, ext))
        writeFileSync(file, readExample(example.file))
        expect(runNodeFile(file), `${example.file} ${ext}`).toBe(
          example.expectedOutput.join('\n') + '\n',
        )
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it.each(['.mjs', '.cjs'])(
    '%s 파일의 맨 바깥 var는 전역 객체의 프로퍼티가 되지 않지만, 바깥의 전역 이름은 찾는다',
    (ext) => {
      const dir = mkdtempSync(join(tmpdir(), 'scope-chain-'))
      try {
        const file = join(dir, `probe${ext}`)
        writeFileSync(
          file,
          "var a = 1; globalThis.b = 2; console.log(typeof globalThis.a + ' ' + b)",
        )
        expect(runNodeFile(file)).toBe('undefined 2\n')
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
  )
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(바깥 스코프 연결, 찾기 경로) + 함수 정의 위치 표(소스에서 계산)
// + 예제에 스냅샷 코드를 끼워 얻은 실제 값과의 대조

// 함수를 "정의한 곳"의 스코프. 손으로 쓴 표이고, 아래에서 소스의 줄 범위 포함 관계로 계산한 값과 대조한다.
const definitionTable: Record<string, string> = {
  outer: 'global',
  inner: 'outer',
  show: 'global',
  run: 'global',
  report: 'global',
}

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

type Entry = [name: string, type: string, text: string]

// 예제를 새 컨텍스트에서 실행하되 afterLine 줄(0 = 맨 앞) 뒤에 names를 평가하는 코드를 끼운다.
// 값은 컨텍스트 안에서 typeof·String으로 읽어 JSON 문자열로 넘긴다(호스트에서 sandbox를 읽지 않는다).
// 가장 먼저 실행된 스냅샷만 기록한다.
function snapshotAt(source: string, afterLine: number, names: string[]): Entry[] {
  let recorded: Entry[] | null = null
  const sandbox = {
    console: { log: () => {} },
    __snap: (json: string) => {
      recorded ??= JSON.parse(json) as Entry[]
    },
  }
  const probe = `__snap(JSON.stringify([${names
    .map((n) => `['${n}', typeof ${n}, typeof ${n} === 'undefined' ? 'undefined' : String(${n})]`)
    .join(', ')}]));`
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

describe('시나리오 id', () => {
  it('시나리오 id 순서는 scope-chain, lexical-scope, shadow-hoisting이다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['scope-chain', 'lexical-scope', 'shadow-hoisting'])
  })

  it('단계 수는 15 / 11 / 10이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([15, 11, 10])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readExample(example!.file)
  const steps = scenario.steps
  const stateAt = (i: number): ScopeState => steps[i].state
  const isLast = (i: number) => i === steps.length - 1

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

  it('구조: 스코프 id 유일, outerId는 같은 단계의 스코프(전역만 null), currentId 존재', () => {
    steps.forEach((step, i) => {
      const { scopes, currentId } = step.state
      const ids = scopes.map((s) => s.id)
      const where = `단계 ${i + 1}`
      expect(new Set(ids).size, `${where}: 스코프 id 중복`).toBe(ids.length)
      for (const s of scopes) {
        if (s.id === 'global') expect(s.outerId, `${where}: global`).toBeNull()
        else {
          expect(s.outerId, `${where}: ${s.id}의 outerId`).not.toBeNull()
          expect(ids, `${where}: ${s.id}의 outerId가 없는 스코프를 가리킵니다`).toContain(s.outerId)
        }
        expect(s.label).toBe(s.id === 'global' ? '전역 스코프' : `${s.id} 함수 스코프`)
      }
      if (scopes.length === 0) expect(currentId, where).toBeNull()
      else {
        expect(ids[0], `${where}: 전역이 첫 번째`).toBe('global')
        expect(ids, `${where}: currentId가 없는 스코프입니다`).toContain(currentId)
      }
    })
  })

  it('찾기 경로: 현재 스코프에서 시작해 outerId 순서로 올라가고, 처음 찾은 곳(또는 전역)에서 끝난다', () => {
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
        if (k < path.length - 1) expect(p.found, `${where}: 중간 스코프는 found:false`).toBe(false)
      })
      const last = path[path.length - 1]
      if (last.found) return
      // 못 찾고 끝나려면 전역까지 올라간 경우뿐이고, 이 예외는 scope-chain의 마지막 단계에서만 허용한다.
      expect(last.scopeId, `${where}: 못 찾았다면 전역에서 끝나야 합니다`).toBe('global')
      expect(scenario.id, `${where}: 못 찾는 단계는 scope-chain에만 있어야 합니다`).toBe(
        'scope-chain',
      )
      expect(isLast(i), `${where}: 못 찾는 단계는 마지막 단계여야 합니다`).toBe(true)
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
        if (s.id === 'global') continue
        expect(s.outerId, `단계 ${i + 1}: ${s.id}의 outerId`).toBe(definitionTable[s.id])
        expect(s.outerId).toBe(computed[s.id])
      }
    })
  })

  it('호출 시작·함수 끝 단계: 스코프 추가/제거, 현재 스코프, 강조 줄이 소스의 함수 범위와 같다', () => {
    const ranges = functionRanges(source())
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
        for (const bd of step.state.scopes.at(-1)!.bindings) expect(bd.changed).toBe('created')
      } else if (end) {
        const f = ranges.find((r) => r.name === end[1])!
        expect(prevIds.at(-1), `${where}: 가장 나중에 만든 스코프가 끝난다`).toBe(f.name)
        expect(ids).toEqual(prevIds.slice(0, -1))
        expect(step.state.currentId, `${where}: 호출한 쪽 스코프로 돌아간다`).toBe(prevIds.at(-2))
        expect(step.state.lookup).toBeNull()
        expect(step.line).toEqual({ from: f.to, to: f.to })
      } else if (i > 1) {
        expect(ids, `${where}: 스코프 목록은 그대로`).toEqual(prevIds)
      }
    })
  })

  it('changed는 이전 단계와 비교해 새로 생기면 created, 값이 바뀌면 updated, 나머지는 없다', () => {
    steps.forEach((step, i) => {
      for (const s of step.state.scopes) {
        const prevScope = i === 0 ? undefined : stateAt(i - 1).scopes.find((p) => p.id === s.id)
        for (const bd of s.bindings) {
          const prev = prevScope?.bindings.find((p) => p.name === bd.name)
          const expected = !prev
            ? 'created'
            : prev.value.type !== bd.value.type || prev.value.display !== bd.value.display
              ? 'updated'
              : undefined
          expect(bd.changed, `단계 ${i + 1}: ${s.id}.${bd.name}의 changed`).toBe(expected)
        }
        // 스코프 안 이름 중복 없음
        const names = s.bindings.map((bd) => bd.name)
        expect(new Set(names).size, `단계 ${i + 1}: ${s.id}의 이름 중복`).toBe(names.length)
      }
    })
  })

  it('스냅샷 대조: 전역 선언 처리 = 실행 전 전역 이름·값, 호출 시작 = 함수 본문 첫머리의 이름·값', () => {
    const check = (stepIdx: number, scopeId: string, entries: Entry[]) => {
      const scope = stateAt(stepIdx).scopes.find((s) => s.id === scopeId)!
      for (const bd of scope.bindings) {
        const [, type, text] = entries.find(([n]) => n === bd.name)!
        const where = `단계 ${stepIdx + 1}: ${scopeId}.${bd.name}`
        expect(bd.value.type, `${where}의 type`).toBe(type)
        if (type === 'function') {
          expect(text.startsWith(`function ${bd.name}(`), `${where}: 실제 함수 원문`).toBe(true)
          expect(bd.value.display.startsWith(`function ${bd.name}(`), `${where}: display`).toBe(
            true,
          )
        } else {
          expect(bd.value.display, `${where}의 display`).toBe(displayOf(type, text))
        }
      }
    }
    steps.forEach((step, i) => {
      if (step.title === '전역 선언 처리') {
        const names = stateAt(i).scopes[0].bindings.map((bd) => bd.name)
        check(i, 'global', snapshotAt(source(), 0, names))
      } else if (step.title.startsWith('호출 시작: ')) {
        const scope = stateAt(i).scopes.at(-1)!
        if (scope.bindings.length === 0) return
        const names = scope.bindings.map((bd) => bd.name)
        check(i, scope.id, snapshotAt(source(), step.line!.from, names))
      }
    })
  })

  it('스냅샷 대조: 이름 찾기 단계마다 실제 값 = 찾은 스코프에 표시한 값 (읽기는 line.from 앞, 대입은 line.to 뒤)', () => {
    steps.forEach((step, i) => {
      const { lookup, scopes } = step.state
      if (!lookup) return
      const where = `단계 ${i + 1}: ${lookup.name}`
      const afterLine = lookup.purpose === 'read' ? step.line!.from - 1 : step.line!.to
      const [[, type, text]] = snapshotAt(source(), afterLine, [lookup.name])
      const last = lookup.path.at(-1)!
      if (!last.found) {
        // 끝까지 못 찾음: 실제로도 그 위치에서 선언되어 있지 않다(typeof는 'undefined').
        expect(type, `${where}: 못 찾은 이름의 typeof`).toBe('undefined')
        return
      }
      const bd = scopes
        .find((s) => s.id === last.scopeId)!
        .bindings.find((x) => x.name === lookup.name)!
      expect(bd.value.type, `${where}의 type`).toBe(type)
      if (type === 'function') {
        expect(text.startsWith(`function ${lookup.name}(`)).toBe(true)
        expect(bd.value.display.startsWith(`function ${lookup.name}(`)).toBe(true)
      } else {
        expect(bd.value.display, `${where}의 display`).toBe(displayOf(type, text))
      }
    })
  })
})

describe('scope-chain: 마지막 단계의 못 찾는 typeof', () => {
  it('15번 줄 앞에서 typeof area는 실제로 undefined이고, 경로는 전역 하나에서 found:false로 끝난다', () => {
    const [[, type]] = snapshotAt(readExample('scope-chain.js'), 14, ['area'])
    expect(type).toBe('undefined')
    const last = scenarios[0].steps.at(-1)!
    expect(last.state.lookup).toEqual({
      name: 'area',
      purpose: 'read',
      path: [{ scopeId: 'global', found: false }],
    })
  })
})
