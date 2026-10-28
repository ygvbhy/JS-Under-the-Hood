import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type AttrState, type ObjectBox } from './scenarios'

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

// 컨텍스트 안에서 JSON 문자열로 만들어 돌려주고 호스트에서 파싱한다(realm이 달라 instanceof를 쓰지 않는다).
const jsonOf = (source: string): unknown => JSON.parse(runInNewContext(source) as string)

const sloppyExamples = ['writable-sloppy.js', 'three-levels.js', 'freeze-shallow.js']

describe('본문 주장 검증', () => {
  it('getter만 있는 프로퍼티에 대입하면 sloppy mode에서는 무시되어 다시 읽으면 getter 값이 나온다', () => {
    expect(runInNewContext('const o = { get a() { return 1; } }; o.a = 5; o.a')).toBe(1)
  })

  it('getter만 있는 프로퍼티에 대입하면 strict mode에서는 TypeError다', () => {
    expect(errorNameOf("'use strict'; const o = { get a() { return 1; } }; o.a = 5;")).toBe(
      'TypeError',
    )
  })

  it('확장 불가 객체에 프로퍼티를 추가하면 sloppy mode에서는 무시된다', () => {
    expect(runInNewContext('const o = Object.preventExtensions({}); o.a = 1; typeof o.a')).toBe(
      'undefined',
    )
  })

  it('확장 불가 객체에 프로퍼티를 추가하면 strict mode에서는 TypeError다', () => {
    expect(errorNameOf("'use strict'; const o = Object.preventExtensions({}); o.a = 1;")).toBe(
      'TypeError',
    )
  })

  it('configurable true·writable false: defineProperty로 값을 바꿀 수 있다', () => {
    expect(
      runInNewContext(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1, configurable: true }); Object.defineProperty(o, 'a', { value: 2 }); o.a",
      ),
    ).toBe(2)
  })

  it('configurable false·writable true: writable을 false로 바꿀 수 있고 값도 바꿀 수 있다', () => {
    expect(
      runInNewContext(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1, writable: true }); Object.defineProperty(o, 'a', { value: 2 }); Object.defineProperty(o, 'a', { writable: false }); o.a + ':' + Object.getOwnPropertyDescriptor(o, 'a').writable",
      ),
    ).toBe('2:false')
  })

  it('configurable false·writable false: writable을 true로 바꾸면 TypeError다', () => {
    expect(
      errorNameOf(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1 }); Object.defineProperty(o, 'a', { writable: true });",
      ),
    ).toBe('TypeError')
  })

  it('configurable false·writable false: 같은 값으로 재정의하면 오류가 없다', () => {
    expect(
      errorNameOf(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1 }); Object.defineProperty(o, 'a', { value: 1 });",
      ),
    ).toBeNull()
  })

  it('configurable false인 데이터 프로퍼티를 접근자로 바꾸면 TypeError다', () => {
    expect(
      errorNameOf(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1 }); Object.defineProperty(o, 'a', { get() { return 1; } });",
      ),
    ).toBe('TypeError')
  })

  it('configurable true인 데이터 프로퍼티는 접근자로 바꿀 수 있다', () => {
    expect(
      runInNewContext(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1, configurable: true }); Object.defineProperty(o, 'a', { get() { return 7; } }); o.a",
      ),
    ).toBe(7)
  })

  it('이미 있는 프로퍼티를 defineProperty로 고치면 생략한 어트리뷰트는 그대로다', () => {
    expect(
      jsonOf(
        "const o = { a: 1 }; Object.defineProperty(o, 'a', { value: 2 }); JSON.stringify(Object.getOwnPropertyDescriptor(o, 'a'))",
      ),
    ).toEqual({ value: 2, writable: true, enumerable: true, configurable: true })
  })

  it('sloppy mode에서 막힌 대입도 오른쪽 식은 평가된다(함수 호출이 일어난다)', () => {
    expect(
      jsonOf(
        "let calls = 0; const next = () => { calls++; return 'B2'; }; const o = {}; Object.defineProperty(o, 'code', { value: 'A1' }); o.code = next(); JSON.stringify([calls, o.code])",
      ),
    ).toEqual([1, 'A1'])
  })

  it('defineProperty의 같은 값 판단은 SameValue다: NaN→NaN은 허용, 0→-0은 TypeError', () => {
    expect(
      runInNewContext(
        "const o = {}; Object.defineProperty(o, 'a', { value: NaN }); Object.defineProperty(o, 'a', { value: NaN }); Number.isNaN(o.a)",
      ),
    ).toBe(true)
    expect(
      errorNameOf(
        "const o = {}; Object.defineProperty(o, 'a', { value: 0 }); Object.defineProperty(o, 'a', { value: -0 });",
      ),
    ).toBe('TypeError')
  })

  it('없는 키의 디스크립터는 undefined다', () => {
    expect(runInNewContext("typeof Object.getOwnPropertyDescriptor({}, 'a')")).toBe('undefined')
  })

  it('enumerable false: Object.keys에는 없지만 in은 true다', () => {
    expect(
      jsonOf(
        "const o = {}; Object.defineProperty(o, 'a', { value: 1 }); JSON.stringify({ keys: Object.keys(o).length, has: 'a' in o })",
      ),
    ).toEqual({ keys: 0, has: true })
  })

  it('freeze한 객체의 setter는 여전히 호출된다', () => {
    expect(
      runInNewContext('let n = 0; const o = Object.freeze({ set a(v) { n = v; } }); o.a = 9; n'),
    ).toBe(9)
  })

  it('freeze 뒤 접근자 디스크립터는 configurable false이고 writable 필드가 없다', () => {
    expect(
      jsonOf(
        "const o = Object.freeze({ get a() { return 1; } }); const d = Object.getOwnPropertyDescriptor(o, 'a'); JSON.stringify({ configurable: d.configurable, hasWritable: 'writable' in d })",
      ),
    ).toEqual({ configurable: false, hasWritable: false })
  })

  it('seal: 데이터 프로퍼티는 writable true·configurable false이고 확장 불가다', () => {
    expect(
      jsonOf(
        "const o = Object.seal({ a: 1 }); const d = Object.getOwnPropertyDescriptor(o, 'a'); JSON.stringify({ w: d.writable, c: d.configurable, ext: Object.isExtensible(o) })",
      ),
    ).toEqual({ w: true, c: false, ext: false })
  })

  it('freeze: 데이터 프로퍼티는 writable false·configurable false이고 확장 불가다', () => {
    expect(
      jsonOf(
        "const o = Object.freeze({ a: 1 }); const d = Object.getOwnPropertyDescriptor(o, 'a'); JSON.stringify({ w: d.writable, c: d.configurable, ext: Object.isExtensible(o) })",
      ),
    ).toEqual({ w: false, c: false, ext: false })
  })

  it('preventExtensions: 어트리뷰트는 그대로고 확장 불가다', () => {
    expect(
      jsonOf(
        "const o = Object.preventExtensions({ a: 1 }); const d = Object.getOwnPropertyDescriptor(o, 'a'); JSON.stringify({ w: d.writable, e: d.enumerable, c: d.configurable, ext: Object.isExtensible(o) })",
      ),
    ).toEqual({ w: true, e: true, c: true, ext: false })
  })

  it('Object.freeze는 객체면 그 객체를 돌려주고 객체가 아니면 그대로 돌려준다', () => {
    expect(runInNewContext('const o = {}; Object.freeze(o) === o')).toBe(true)
    expect(runInNewContext('Object.freeze(5)')).toBe(5)
  })

  it('무시된 대입식의 값은 오른쪽 값이다', () => {
    expect(runInNewContext('const o = Object.freeze({ a: 1 }); (o.a = 2)')).toBe(2)
  })

  it('리터럴 getter의 디스크립터는 enumerable true·configurable true·set undefined다', () => {
    expect(
      jsonOf(
        "const d = Object.getOwnPropertyDescriptor({ get a() { return 1; } }, 'a'); JSON.stringify({ e: d.enumerable, c: d.configurable, set: typeof d.set })",
      ),
    ).toEqual({ e: true, c: true, set: 'undefined' })
  })

  it('freeze한 객체는 sealed이고 확장 불가다', () => {
    expect(
      jsonOf(
        'const o = Object.freeze({ a: 1 }); JSON.stringify({ sealed: Object.isSealed(o), ext: Object.isExtensible(o) })',
      ),
    ).toEqual({ sealed: true, ext: false })
  })

  it('상속된 non-writable 프로퍼티가 있으면 자기 프로퍼티를 추가하는 대입도 무시된다 (단순화 항목의 근거)', () => {
    expect(
      runInNewContext(
        "const p = {}; Object.defineProperty(p, 'a', { value: 1 }); const o = Object.create(p); o.a = 2; o.a + ':' + Object.prototype.hasOwnProperty.call(o, 'a')",
      ),
    ).toBe('1:false')
  })

  it('setter만 있는 프로퍼티를 읽으면 undefined다', () => {
    expect(runInNewContext('const o = { set a(v) {} }; typeof o.a')).toBe('undefined')
  })

  it('configurable false인 프로퍼티를 delete하면 sloppy mode에서는 false를 돌려준다', () => {
    expect(
      runInNewContext("const o = {}; Object.defineProperty(o, 'a', { value: 1 }); delete o.a"),
    ).toBe(false)
  })

  it('defineProperty로 바꿀 수 없는 재정의는 strict 지시어와 관계없이 TypeError다', () => {
    const source =
      "const o = {}; Object.defineProperty(o, 'a', { value: 1 }); Object.defineProperty(o, 'a', { value: 2 });"
    expect(errorNameOf(source)).toBe('TypeError')
    expect(errorNameOf(`'use strict'; ${source}`)).toBe('TypeError')
  })

  it('예제 3에서 use strict를 빼면 대입·삭제가 오류 없이 무시되어 A1 하나만 출력된다', () => {
    const source = readExample('writable-strict.js')
    expect(source.startsWith("'use strict';\n")).toBe(true)
    expect(runExample(source.replace("'use strict';\n", ''))).toEqual(['A1'])
  })

  it('예제 4 첫 줄에 use strict를 붙여도 출력이 같다', () => {
    expect(runExample(`'use strict';\n${readExample('redefine.js')}`)).toEqual(['TypeError', 'A1'])
  })

  it.each(sloppyExamples)('%s: strict mode로 실행하면 잡히지 않은 TypeError로 끝난다', (file) => {
    expect(errorNameOf(`'use strict';\n${readExample(file)}`)).toBe('TypeError')
  })

  it.each(concept.examples.filter((e) => !sloppyExamples.includes(e.file)))(
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
    const dir = mkdtempSync(join(tmpdir(), 'property-attributes-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return runNodeFile(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it.each(concept.examples.map((e) => e.file))('%s (.cjs): 클래식 스크립트와 같은 출력', (file) => {
    const result = runAs(file, '.cjs')
    expect(result.status).toBe(0)
    expect(result.stdout).toBe(expected(file))
  })

  it.each(concept.examples.map((e) => e.file).filter((f) => !sloppyExamples.includes(f)))(
    '%s (.mjs): 클래식 스크립트와 같은 출력',
    (file) => {
      const result = runAs(file, '.mjs')
      expect(result.status).toBe(0)
      expect(result.stdout).toBe(expected(file))
    },
  )

  it.each(sloppyExamples)(
    '%s (.mjs): 모듈은 항상 strict라 잡히지 않은 TypeError로 끝난다',
    (file) => {
      const result = runAs(file, '.mjs')
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('TypeError')
    },
  )
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(참조, 배타 필드, changed = 실제 변화, op 종류)
// + 예제에 탐침 코드를 끼워 컨텍스트 안에서 얻은 실제 디스크립터와의 대조 + op 실행 검증

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const sourceOf = (id: string) => readExample(exampleOf(id).file)
const scenarioById = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 불변식', () => {
  it('시나리오 id와 exampleId가 meta.examples의 id와 일치한다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'writable-sloppy',
      'writable-strict',
      'getter',
      'freeze-shallow',
    ])
    for (const s of scenarios) expect(s.exampleId).toBe(s.id)
  })

  it.each(scenarios)('$id: 공통 불변식', (scenario) => {
    const example = exampleOf(scenario.exampleId)
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('시나리오별 단계 수', () => {
    expect(Object.fromEntries(scenarios.map((s) => [s.id, s.steps.length]))).toEqual({
      'writable-sloppy': 7,
      'writable-strict': 8,
      getter: 7,
      'freeze-shallow': 9,
    })
  })
})

const emptyState: AttrState = { bindings: [], objects: [], op: null }
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const sorted = (a: readonly string[] | undefined) => [...(a ?? [])].sort()

describe('시나리오 구조', () => {
  const sloppyScenarios = ['writable-sloppy', 'freeze-shallow']

  it.each(scenarios)('$id: 참조·필드·changed 표시·op 종류', (scenario) => {
    scenario.steps.forEach((step, i) => {
      const where = `${scenario.id} 단계 ${i + 1}`
      const { state } = step
      const prev = i === 0 ? emptyState : scenario.steps[i - 1].state
      const ids = state.objects.map((o) => o.id)
      expect(new Set(ids).size, `${where}: 객체 id가 겹칩니다`).toBe(ids.length)

      // 참조: 바인딩·프로퍼티 값의 ObjectRef가 존재하는 객체를 가리킨다
      const checkRef = (v: { kind?: string; id?: string }, what: string) => {
        if (v.kind === 'object') expect(ids, `${where}: ${what}`).toContain(v.id)
      }
      for (const b of state.bindings) checkRef(b.value as { kind?: string; id?: string }, b.name)
      for (const o of state.objects) {
        for (const p of o.props) {
          if (p.kind === 'data') {
            expect(p, `${where}: 데이터 프로퍼티에 get/set이 있습니다`).not.toHaveProperty('get')
            expect(p).not.toHaveProperty('set')
            expect(p).toHaveProperty('value')
            expect(typeof p.writable).toBe('boolean')
            checkRef(p.value as { kind?: string; id?: string }, `${o.id}.${p.key}`)
          } else {
            expect(p, `${where}: 접근자 프로퍼티에 value/writable이 있습니다`).not.toHaveProperty(
              'value',
            )
            expect(p).not.toHaveProperty('writable')
            expect(p.get === null || typeof p.get === 'string').toBe(true)
            expect(p.set === null || typeof p.set === 'string').toBe(true)
          }
        }
      }
      if (state.op) {
        expect(ids, `${where}: op.objectId`).toContain(state.op.objectId)
      }

      // changed 표시 = 이전 단계와의 실제 차이
      for (const b of state.bindings) {
        const before = prev.bindings.find((x) => x.name === b.name)
        const expected = !before || !sameJson(before.value, b.value)
        expect(b.changed === true, `${where}: 변수 ${b.name}의 changed`).toBe(expected)
      }
      for (const o of state.objects) {
        const before = prev.objects.find((x) => x.id === o.id)
        const objExpected: string[] = !before
          ? ['created']
          : before.extensible !== o.extensible
            ? ['extensible']
            : []
        expect(sorted(o.changed), `${where}: 객체 ${o.id}의 changed`).toEqual(objExpected)
        for (const p of o.props) {
          const bp = before?.props.find((x) => x.key === p.key)
          let expected: string[]
          if (!bp) expected = ['created']
          else {
            expect(bp.kind, `${where}: ${o.id}.${p.key}의 종류가 바뀌었습니다`).toBe(p.kind)
            const fields =
              p.kind === 'data'
                ? ['value', 'writable', 'enumerable', 'configurable']
                : ['get', 'set', 'enumerable', 'configurable']
            expected = fields.filter(
              (f) =>
                !sameJson(
                  (bp as unknown as Record<string, unknown>)[f],
                  (p as unknown as Record<string, unknown>)[f],
                ),
            )
          }
          expect(sorted(p.changed), `${where}: ${o.id}.${p.key}의 changed`).toEqual(expected.sort())
        }
      }

      // op 종류
      if (state.op?.result === 'ignored') {
        expect(sloppyScenarios, `${where}: ignored는 sloppy 시나리오에만`).toContain(scenario.id)
        expect(state.op.kind).toBe('assign')
      }
      if (state.op?.result === 'delete-false') {
        expect(scenario.id, `${where}: delete-false는 sloppy 시나리오에만`).toBe('writable-sloppy')
      }
      if (state.op?.result === 'TypeError') {
        expect(scenario.id, `${where}: TypeError는 strict 시나리오에만`).toBe('writable-strict')
      }
    })
  })
})

// --- 탐침 ---------------------------------------------------------------------------------------

// 탐침이 컨텍스트 안에서 만드는 모양과 같은 모양으로 화면 상태를 바꾼다.
type NormVal = { type: string; display: string } | { object: NormObj }
type NormProp =
  | {
      key: string
      kind: 'data'
      value: NormVal
      writable: boolean
      enumerable: boolean
      configurable: boolean
    }
  | {
      key: string
      kind: 'accessor'
      get: 'function' | null
      set: 'function' | null
      enumerable: boolean
      configurable: boolean
    }
type NormObj = { extensible: boolean; props: NormProp[] }

function normalizeObject(state: AttrState, id: string): NormObj {
  const o = state.objects.find((x) => x.id === id)!
  const val = (v: { kind: 'object'; id: string } | { type: string; display: string }): NormVal =>
    'kind' in v ? { object: normalizeObject(state, v.id) } : { type: v.type, display: v.display }
  return {
    extensible: o.extensible,
    props: o.props.map((p): NormProp =>
      p.kind === 'data'
        ? {
            key: p.key,
            kind: 'data',
            value: val(p.value),
            writable: p.writable,
            enumerable: p.enumerable,
            configurable: p.configurable,
          }
        : {
            key: p.key,
            kind: 'accessor',
            get: p.get === null ? null : 'function',
            set: p.set === null ? null : 'function',
            enumerable: p.enumerable,
            configurable: p.configurable,
          },
    ),
  }
}

function normalizeBindings(state: AttrState): Record<string, NormVal> {
  return Object.fromEntries(
    state.bindings.map((b) => [
      b.name,
      'kind' in b.value
        ? { object: normalizeObject(state, b.value.id) }
        : { type: b.value.type, display: b.value.display },
    ]),
  )
}

function insertAfterLine(source: string, afterLine: number, code: string): string {
  const out: string[] = afterLine === 0 ? [code] : []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (i + 1 === afterLine) out.push(code)
  })
  return out.join('\n')
}

// 컨텍스트 안에서 실행되는 탐침. 접근자는 함수 유무만 읽고 값은 읽지 않는다(getter가 호출되면 reads가 바뀌기 때문).
// 데이터 프로퍼티의 값이 객체면 그 객체도 같은 방식으로 따라간다(config.limits 같은 경우).
function probeCode(names: string[]): string {
  return (
    `__snap(JSON.stringify((() => {` +
    `const val = (v) => (typeof v === 'object' && v !== null) ? { object: obj(v) } : { type: typeof v, display: String(v) };` +
    `const obj = (o) => { const d = Object.getOwnPropertyDescriptors(o);` +
    `return { extensible: Object.isExtensible(o), props: Reflect.ownKeys(d).map((k) => { const p = d[k];` +
    `return 'value' in p ? { key: k, kind: 'data', value: val(p.value), writable: p.writable, enumerable: p.enumerable, configurable: p.configurable }` +
    `: { key: k, kind: 'accessor', get: typeof p.get === 'function' ? 'function' : null, set: typeof p.set === 'function' ? 'function' : null, enumerable: p.enumerable, configurable: p.configurable }; }) }; };` +
    `return { ${names.map((n) => `${n}: val(${n})`).join(', ')} }; })()));`
  )
}

// afterLine 줄 뒤에 탐침을 끼워 실행하고, 그 시점의 변수·객체 스냅샷과 지금까지의 콘솔 출력을 돌려준다.
function snapshotAt(source: string, afterLine: number, names: string[]) {
  const out: string[] = []
  const snaps: { bindings: Record<string, NormVal>; output: string[] }[] = []
  const sandbox = {
    console: { log: (...args: unknown[]) => out.push(args.join(' ')) },
    __snap: (json: string) => {
      snaps.push({ bindings: JSON.parse(json), output: [...out] })
    },
  }
  runInNewContext(insertAfterLine(source, afterLine, probeCode(names)), sandbox, { timeout: 2000 })
  expect(snaps.length, `줄 ${afterLine} 뒤의 탐침이 실행되지 않았습니다`).toBe(1)
  return snaps[0]
}

// [시나리오 id, 단계(0부터), 그 단계의 상태에 해당하는 코드 위치(afterLine)]
// try 블록 안에서 오류가 나는 줄은 오류를 잡은 뒤의 catch 블록 첫 줄(`} catch (e) {` 줄 뒤)에서 읽는다.
const snapshotPoints: [string, number, number][] = [
  ['writable-sloppy', 1, 1],
  ['writable-sloppy', 2, 2],
  ['writable-sloppy', 3, 3],
  ['writable-sloppy', 4, 4],
  ['writable-sloppy', 5, 5],
  ['writable-sloppy', 6, 6],
  ['writable-strict', 1, 2],
  ['writable-strict', 2, 3],
  ['writable-strict', 3, 6], // 5번 줄이 던진 TypeError를 잡은 직후(catch 블록 첫 줄)
  ['writable-strict', 4, 7],
  ['writable-strict', 5, 11], // 10번 줄이 던진 TypeError를 잡은 직후
  ['writable-strict', 6, 12],
  ['writable-strict', 7, 14],
  ['getter', 1, 1],
  ['getter', 2, 7],
  ['getter', 3, 8],
  ['getter', 4, 9],
  ['getter', 5, 10],
  ['getter', 6, 11],
  ['freeze-shallow', 1, 1],
  ['freeze-shallow', 2, 2],
  ['freeze-shallow', 3, 3],
  ['freeze-shallow', 4, 4],
  ['freeze-shallow', 5, 5],
  ['freeze-shallow', 6, 6],
  ['freeze-shallow', 7, 7],
  ['freeze-shallow', 8, 8],
]

describe('시나리오 스냅샷 대조 (예제를 실제로 실행한 값과 비교)', () => {
  it('실행 전(줄이 없는) 단계를 뺀 모든 단계가 표에 있다', () => {
    const covered = new Set(snapshotPoints.map(([id, i]) => `${id}:${i}`))
    for (const s of scenarios) {
      s.steps.forEach((step, i) => {
        expect(covered.has(`${s.id}:${i}`), `${s.id} 단계 ${i + 1}`).toBe(step.line !== undefined)
      })
    }
  })

  it.each(snapshotPoints)('%s 단계 %i (줄 %i 뒤)', (id, index, afterLine) => {
    const scenario = scenarioById(id)
    const step = scenario.steps[index]
    const snap = snapshotAt(
      sourceOf(id),
      afterLine,
      step.state.bindings.map((b) => b.name),
    )
    expect(snap.bindings, '변수·객체 디스크립터').toEqual(normalizeBindings(step.state))
    expect(snap.output, '콘솔 출력').toEqual(step.output ?? [])
  })
})

// --- op 검증 --------------------------------------------------------------------------------------

const linesOf = (source: string) => source.split('\n')

describe('시나리오 op 검증', () => {
  const opSteps = scenarios.flatMap((s) =>
    s.steps.flatMap((step, index) =>
      step.state.op ? [{ id: s.id, index, step, op: step.state.op }] : [],
    ),
  )

  const withResult = (...results: string[]) => opSteps.filter((x) => results.includes(x.op.result))

  it.each(withResult('ignored', 'delete-false').map((x) => [x.id, x.index] as const))(
    '%s 단계 %i: sloppy에서는 오류 없이 넘어가고 그 줄만 strict로 실행하면 TypeError다',
    (id, index) => {
      const step = scenarioById(id).steps[index]
      const source = linesOf(sourceOf(id))
      const upTo = (n: number) => source.slice(0, n).join('\n')
      const line = step.line!.from
      expect(errorNameOf(upTo(line))).toBeNull()
      // 앞 줄은 sloppy 그대로 실행하고, 그 줄의 문장만 strict 함수 안에서 실행한다.
      const strictLine = `(function () { 'use strict'; ${source[line - 1].trim()} })();`
      expect(errorNameOf(`${upTo(line - 1)}\n${strictLine}`)).toBe('TypeError')
    },
  )

  it.each(withResult('TypeError').map((x) => [x.id, x.index] as const))(
    '%s 단계 %i: 그 줄이 실제로 TypeError를 던진다',
    (id, index) => {
      const step = scenarioById(id).steps[index]
      const source = linesOf(sourceOf(id))
      const line = step.line!.from
      // 그 줄이 든 try 블록의 앞까지 그대로 실행하고, 같은 문장을 새 try…catch로 감싸 실행한다.
      let tryLine = line - 1
      while (source[tryLine - 1].trim() !== 'try {') tryLine--
      const prefix = source.slice(0, tryLine - 1).join('\n')
      let result: string | null = null
      runInNewContext(
        `${prefix}\ntry { ${source[line - 1].trim()} __r('none'); } catch (e) { __r(e.name); }`,
        { console: { log: () => {} }, __r: (r: string) => (result = r) },
      )
      expect(result).toBe('TypeError')
    },
  )

  it.each(withResult('getter-called').map((x) => [x.id, x.index] as const))(
    '%s 단계 %i: reads가 이전 단계보다 정확히 1 늘고 op.value와 같다',
    (id, index) => {
      const scenario = scenarioById(id)
      const readsOf = (i: number) => {
        const b = scenario.steps[i].state.bindings.find((x) => x.name === 'reads')!
        return Number((b.value as { display: string }).display)
      }
      expect(readsOf(index)).toBe(readsOf(index - 1) + 1)
      expect(scenario.steps[index].state.op!.value!.display).toBe(String(readsOf(index)))
    },
  )

  it('describe 단계는 getter를 호출하지 않아 reads가 그대로다', () => {
    const scenario = scenarioById('getter')
    opSteps
      .filter((x) => x.op.kind === 'describe')
      .forEach(({ index }) => {
        const reads = (i: number) =>
          JSON.stringify(scenario.steps[i].state.bindings.find((b) => b.name === 'reads'))
        expect(JSON.parse(reads(index)).value).toEqual(JSON.parse(reads(index - 1)).value)
      })
  })

  it('freeze-shallow: 안쪽 객체 B는 freeze 단계에서 바뀌지 않는다', () => {
    const steps = scenarioById('freeze-shallow').steps
    const find = (i: number, id: string): ObjectBox =>
      steps[i].state.objects.find((o) => o.id === id)!
    expect(find(2, 'B').extensible).toBe(true)
    expect(find(2, 'B').props.map((p) => p.kind === 'data' && p.value)).toEqual(
      find(1, 'B').props.map((p) => p.kind === 'data' && p.value),
    )
  })
})
