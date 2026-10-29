import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import {
  callStages,
  newStages,
  scenarios,
  type Invocation,
  type NewState,
  type ObjectBox,
  type ObjectRef,
  type Val,
} from './scenarios'

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

const BOOK = 'function Book(title) { this.title = title; }'

describe('본문 주장 검증', () => {
  it('괄호 없는 new Book도 new 호출이다: new.target이 Book이고 인수가 없어 title은 undefined다', () => {
    expect(
      jsonOf(
        `let t; function Book(title) { t = new.target === Book; this.title = title; } const o = new Book; JSON.stringify({ t, o })`,
      ),
    ).toEqual({ t: true, o: {} })
  })

  it('일반 호출의 new.target은 undefined다', () => {
    expect(runInNewContext('function Book() { return typeof new.target; } Book()')).toBe(
      'undefined',
    )
  })

  it('new 호출의 new.target은 그 함수다', () => {
    expect(runInNewContext('function Book() { this.t = new.target === Book; } new Book().t')).toBe(
      true,
    )
  })

  it('화살표 함수에 new를 쓰면 TypeError다', () => {
    expect(errorNameOf('const f = () => {}; new f();')).toBe('TypeError')
  })

  it('숫자 1에 new를 쓰면 TypeError다', () => {
    expect(errorNameOf('new 1();')).toBe('TypeError')
  })

  it('함수를 return하면 그 함수가 결과다', () => {
    expect(
      runInNewContext(
        'const f = function () {}; function Book() { this.a = 1; return f; } const r = new Book(); [typeof r, r === f].join()',
      ),
    ).toBe('function,true')
  })

  it('배열을 return하면 그 배열이 결과다', () => {
    expect(
      runInNewContext(
        'const arr = [1, 2]; function Book() { this.a = 1; return arr; } const r = new Book(); (r === arr) + ":" + Array.isArray(r)',
      ),
    ).toBe('true:true')
  })

  it.each([
    ['return;', 'return;'],
    ['return undefined', 'return undefined;'],
    ["return 'x'", "return 'x';"],
  ])('%s: this 객체가 결과다', (_name, stmt) => {
    expect(
      jsonOf(`function Book(title) { this.title = title; ${stmt} } JSON.stringify(new Book('JS'))`),
    ).toEqual({ title: 'JS' })
  })

  it('원시 값을 return해도 결과는 this 객체와 같다(===)', () => {
    expect(
      runInNewContext("let self; function Book() { self = this; return 'x'; } new Book() === self"),
    ).toBe(true)
  })

  it('객체를 return하면 결과는 this 객체가 아니다(===)', () => {
    expect(
      runInNewContext('let self; function Book() { self = this; return {}; } new Book() === self'),
    ).toBe(false)
  })

  it('함수 표현식도 new로 호출된다', () => {
    expect(
      jsonOf(
        "const Book = function (title) { this.title = title; }; JSON.stringify(new Book('JS'))",
      ),
    ).toEqual({ title: 'JS' })
  })

  it('인수가 본문보다 먼저 평가된다(arg → body 순서)', () => {
    expect(
      runInNewContext(
        "const log = []; function Book() { log.push('body'); } new Book(log.push('arg')); log.join()",
      ),
    ).toBe('arg,body')
  })

  it('생성자가 아닌 함수에 new를 써도 인수는 TypeError보다 먼저 평가된다', () => {
    expect(
      runInNewContext(
        "const log = []; try { new Math.max(log.push('arg')); } catch (e) { log.push(e.name); } log.join()",
      ),
    ).toBe('arg,TypeError')
  })

  it('제너레이터와 async function은 생성자가 아니다(선언·표현식 모두 new → TypeError)', () => {
    expect(errorNameOf('function* g() {} new g();')).toBe('TypeError')
    expect(errorNameOf('const g = function* () {}; new g();')).toBe('TypeError')
    expect(errorNameOf('async function f() {} new f();')).toBe('TypeError')
    expect(errorNameOf('const f = async function () {}; new f();')).toBe('TypeError')
  })

  it('함수 표현식을 값으로 둔 프로퍼티는 생성자다(메서드 축약과 다름)', () => {
    expect(
      jsonOf(
        'const shop = { order: function () { this.k = 1; } }; JSON.stringify(new shop.order())',
      ),
    ).toEqual({ k: 1 })
  })

  it('일반 호출의 결과는 return 값 그대로다(원시 값도 그대로)', () => {
    expect(runInNewContext('function Book() { return 100; } Book()')).toBe(100)
  })

  it('클래스: 기본 클래스는 원시 값 return을 무시하고, new 없이 호출하면 TypeError다 (단순화 근거)', () => {
    expect(
      jsonOf('class A { constructor() { this.a = 1; return 1; } } JSON.stringify(new A())'),
    ).toEqual({ a: 1 })
    expect(errorNameOf('class A {} A();')).toBe('TypeError')
  })

  it('파생 클래스: undefined가 아닌 원시 값 return은 TypeError, undefined는 this (단순화 근거)', () => {
    expect(
      errorNameOf('class A {} class B extends A { constructor() { super(); return 1; } } new B();'),
    ).toBe('TypeError')
    expect(
      jsonOf(
        'class A {} class B extends A { constructor() { super(); this.b = 1; return undefined; } } JSON.stringify(new B())',
      ),
    ).toEqual({ b: 1 })
  })

  it('Reflect.construct로 newTarget을 따로 주면 new.target과 프로토타입이 그것을 따른다 (단순화 근거)', () => {
    expect(
      runInNewContext(
        'function F() { this.t = new.target === G; } function G() {} const o = Reflect.construct(F, [], G); [o.t, Object.getPrototypeOf(o) === G.prototype].join()',
      ),
    ).toBe('true,true')
  })

  it('Map은 new 없이 호출하면 TypeError, Date는 new 없이 호출하면 문자열이다', () => {
    expect(errorNameOf('Map();')).toBe('TypeError')
    expect(runInNewContext('[typeof Date(), typeof new Date()].join()')).toBe('string,object')
  })

  it('생성자 본문이 throw하면 new 식이 그 오류를 던진다', () => {
    expect(errorNameOf('function Book() { throw new RangeError("x"); } new Book();')).toBe(
      'RangeError',
    )
  })

  it('Book.prototype은 객체이고 새 객체의 프로토타입이다 (단순화 항목의 근거)', () => {
    expect(
      runInNewContext(
        `${BOOK} [typeof Book.prototype, Object.getPrototypeOf(new Book()) === Book.prototype].join()`,
      ),
    ).toBe('object,true')
  })

  it('Object(null)과 new Object(undefined)는 빈 객체다', () => {
    expect(jsonOf('JSON.stringify([Object(null), new Object(undefined)])')).toEqual([{}, {}])
  })

  it('Object는 new 유무와 관계없이 객체를 돌려준다', () => {
    expect(runInNewContext("[typeof Object('a'), typeof new Object('a')].join()")).toBe(
      'object,object',
    )
  })

  it('Number는 new 없이 원시 값, new로 객체를 돌려준다', () => {
    expect(runInNewContext('[typeof Number(5), typeof new Number(5)].join()')).toBe('number,object')
  })

  it('without-new-sloppy.js: 첫 줄에 use strict를 붙이면 TypeError다(모듈 결과와 일치)', () => {
    expect(errorNameOf(`'use strict';\n${readExample('without-new-sloppy.js')}`)).toBe('TypeError')
  })

  it('without-new-sloppy.js: 일반 호출이라 새 객체 없이 전역 title이 생긴다', () => {
    expect(runExample(readExample('without-new-sloppy.js'))).toEqual(['undefined', 'JS'])
  })

  it('without-new-strict.js: 첫 줄이 use strict 지시어다', () => {
    expect(readExample('without-new-strict.js').startsWith("'use strict';\n")).toBe(true)
  })

  it('without-new-strict.js: 지시어를 빼면 오류 없이 전역 title이 생겨 string 하나만 출력된다', () => {
    const source = readExample('without-new-strict.js')
    expect(runExample(source.replace("'use strict';\n", ''))).toEqual(['string'])
  })

  it.each(concept.examples)(
    '$file: 실제 실행 결과가 expectedOutput과 같다',
    ({ file, expectedOutput }) => {
      expect(runExample(readExample(file))).toEqual(expectedOutput)
    },
  )
})

describe('실행 방식에 따른 차이 (ES 모듈 / Node CommonJS)', () => {
  const sloppyExamples = ['without-new-sloppy.js']

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
    const dir = mkdtempSync(join(tmpdir(), 'new-operator-'))
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
// 공통 불변식 + 단계 구조(참조, 단계 순서, changed·created = 실제 변화, role = 결과)
// + 예제에 탐침 코드를 끼워 컨텍스트 안에서 얻은 실제 값과의 대조 + 결과 객체 검증

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const sourceOf = (id: string) => readExample(exampleOf(id).file)
const scenarioById = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 불변식', () => {
  it('시나리오 id와 exampleId가 meta.examples의 id와 일치한다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'basic',
      'return-object',
      'return-primitive',
      'without-new-sloppy',
    ])
    for (const s of scenarios) expect(s.exampleId).toBe(s.id)
  })

  it.each(scenarios)('$id: 공통 불변식', (scenario) => {
    const example = exampleOf(scenario.exampleId)
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('시나리오별 단계 수', () => {
    expect(Object.fromEntries(scenarios.map((s) => [s.id, s.steps.length]))).toEqual({
      basic: 18,
      'return-object': 9,
      'return-primitive': 9,
      'without-new-sloppy': 8,
    })
  })
})

const emptyState: NewState = { bindings: [], objects: [], invocation: null }
const isRef = (v: Val | ObjectRef): v is ObjectRef => 'kind' in v
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const boxOf = (state: NewState, id: string) => state.objects.find((o) => o.id === id)

describe('시나리오 구조', () => {
  it.each(scenarios)('$id: 객체 참조는 존재하는 객체를 가리키고 id·이름이 겹치지 않는다', (s) => {
    s.steps.forEach((step, i) => {
      const { state } = step
      const where = `${s.id} 단계 ${i + 1}`
      const ids = state.objects.map((o) => o.id)
      expect(new Set(ids).size, `${where}: 객체 id 중복`).toBe(ids.length)
      expect(new Set(state.bindings.map((b) => b.name)).size, `${where}: 변수 이름 중복`).toBe(
        state.bindings.length,
      )
      for (const o of state.objects)
        expect(new Set(o.props.map((p) => p.key)).size, `${where}: 프로퍼티 키 중복`).toBe(
          o.props.length,
        )
      const refs: (Val | ObjectRef | 'undefined' | null)[] = [
        ...state.bindings.map((b) => b.value),
        state.invocation?.thisValue ?? null,
        state.invocation?.returned?.value ?? null,
        state.invocation?.result ?? null,
      ]
      for (const r of refs)
        if (r !== null && typeof r === 'object' && isRef(r))
          expect(ids, `${where}: 없는 객체 ${r.id}를 가리킴`).toContain(r.id)
    })
  })

  it.each(scenarios)('$id: 단계가 mode의 순서대로만 진행하고 호출이 result에서 끝난다', (s) => {
    let prev: Invocation | null = null
    let prevIndex = -1
    s.steps.forEach((step, i) => {
      const inv = step.state.invocation
      const where = `${s.id} 단계 ${i + 1}`
      if (inv === null) {
        // 호출이 끝난 단계는 직전에 result 단계였어야 한다
        if (prev !== null) expect(prev.stage, `${where}: result 없이 호출이 끝남`).toBe('result')
        prev = null
        prevIndex = -1
        for (const o of step.state.objects)
          expect(
            o.role === undefined || o.role === 'global',
            `${where}: 호출이 끝났는데 role이 남음`,
          ).toBe(true)
        return
      }
      const order: readonly string[] = inv.mode === 'new' ? newStages : callStages
      const idx = order.indexOf(inv.stage)
      expect(idx, `${where}: ${inv.mode} 호출에 없는 단계 ${inv.stage}`).toBeGreaterThanOrEqual(0)
      if (prev === null) {
        expect(inv.stage, `${where}: 호출은 check로 시작`).toBe('check')
      } else {
        expect(inv.mode, `${where}: mode 변경`).toBe(prev.mode)
        expect(inv.code, `${where}: 호출 식 변경`).toBe(prev.code)
        expect(idx === prevIndex || idx === prevIndex + 1, `${where}: 단계 건너뜀/역행`).toBe(true)
        if (idx === prevIndex) expect(inv.stage, `${where}: 같은 단계 반복은 body만`).toBe('body')
      }
      // result 단계부터 결과가 있고, 그 전에는 없다
      expect(inv.result !== null, `${where}: result 단계에서만 결과가 있다`).toBe(
        inv.stage === 'result',
      )
      prev = inv
      prevIndex = idx
    })
    expect(prev, `${s.id}: 마지막에 호출이 끝나지 않음`).toBeNull()
  })

  it('call 호출에는 새 객체 생성이 없다: 전역 객체 외에 만들어지는 객체가 없다', () => {
    const s = scenarioById('without-new-sloppy')
    for (const step of s.steps) {
      expect(step.state.invocation === null || step.state.invocation.mode === 'call').toBe(true)
      expect(step.state.objects.every((o) => o.role === undefined || o.role === 'global')).toBe(
        true,
      )
      expect(step.state.objects.map((o) => o.id)).toEqual(['global'])
    }
  })

  it.each(scenarios)('$id: changed·created 표시는 이전 단계와의 실제 차이와 같다', (s) => {
    let prev = emptyState
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const cur = step.state
      for (const b of cur.bindings) {
        const before = prev.bindings.find((x) => x.name === b.name)
        const differs = !before || !sameJson(before.value, b.value)
        expect(b.changed === true, `${where}: 변수 ${b.name}의 changed`).toBe(differs)
      }
      for (const o of cur.objects) {
        const before = boxOf(prev, o.id)
        // 전역 객체는 코드 실행 전부터 있으므로 created가 붙지 않는다
        if (o.role === 'global') expect(o.created, `${where}: 전역 객체에 created`).toBeUndefined()
        else expect(o.created === true, `${where}: 객체 ${o.id}의 created`).toBe(!before)
        for (const p of o.props) {
          const old = before?.props.find((x) => x.key === p.key)
          const differs = !old || !sameJson(old.value, p.value)
          expect(p.changed === true, `${where}: ${o.id}.${p.key}의 changed`).toBe(differs)
        }
      }
      // 프로퍼티·변수·객체가 사라지지 않는다
      for (const b of prev.bindings) expect(cur.bindings.some((x) => x.name === b.name)).toBe(true)
      for (const o of prev.objects) {
        const now = boxOf(cur, o.id)
        expect(now, `${where}: 객체 ${o.id}가 사라짐`).toBeDefined()
        for (const p of o.props) expect(now!.props.some((x) => x.key === p.key)).toBe(true)
      }
      prev = cur
    })
  })

  it.each(scenarios)('$id: role은 호출의 this·결과와 일치한다', (s) => {
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const { invocation: inv, objects } = step.state
      const byRole = (r: NonNullable<ObjectBox['role']>) => objects.filter((o) => o.role === r)
      const thisObj =
        inv && inv.thisValue && inv.thisValue !== 'undefined' ? inv.thisValue.id : null
      const resultObj = inv?.result && isRef(inv.result) ? inv.result.id : null
      // 'result' 역할은 invocation.result가 가리키는 객체 하나뿐이다
      expect(
        byRole('result').map((o) => o.id),
        `${where}: result 역할`,
      ).toEqual(resultObj ? [resultObj] : [])
      if (inv?.stage === 'result' && inv.mode === 'new') {
        // result 단계에서 this 객체는 결과 아니면 unused다
        const roleOfThis = boxOf(step.state, thisObj!)!.role
        expect(roleOfThis === 'result' || roleOfThis === 'unused', `${where}: this 객체 role`).toBe(
          true,
        )
        expect(roleOfThis === 'result', `${where}`).toBe(thisObj === resultObj)
      }
      // 'this' 역할은 body 이전·본문 중(result 이전)의 this 객체 하나
      const thisRoles = byRole('this').map((o) => o.id)
      const expectedThis =
        inv && inv.mode === 'new' && thisObj && inv.stage !== 'result' ? [thisObj] : []
      expect(thisRoles, `${where}: this 역할`).toEqual(expectedThis)
    })
  })
})

// --- 탐침 ---------------------------------------------------------------------------------------

function insertAfterLines(source: string, inserts: Record<number, string>): string {
  const out: string[] = []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (inserts[i + 1] !== undefined) out.push(inserts[i + 1])
  })
  return out.join('\n')
}

// 컨텍스트 안에서 실행되는 탐침 식. 객체는 자기 프로퍼티(원시 값)만 읽는다. 전역 객체는 title만 읽는다.
const PROBE_HELPERS =
  `const val = (v) => v === null ? { type: 'null', display: 'null' } : (typeof v === 'object' || typeof v === 'function') ? { object: props(v) } : { type: typeof v, display: String(v) };` +
  `const props = (o) => Object.keys(o).map((k) => ({ key: k, value: val(o[k]) }));` +
  `const gt = () => Object.prototype.hasOwnProperty.call(globalThis, 'title') ? val(globalThis.title) : null;`

const probeCode = (expr: string) =>
  `__snap(JSON.stringify((() => {${PROBE_HELPERS} return ${expr}; })()));`

type Snap = Record<string, unknown>

// 정해진 줄들 뒤에 탐침을 끼워 실행하고, 탐침 실행 순서대로 스냅샷(+그 시점 콘솔 출력)과 최종 출력을 돌려준다.
function runWithProbes(source: string, inserts: Record<number, string>, extra: object = {}) {
  const out: string[] = []
  const snaps: { snap: Snap; output: string[] }[] = []
  const sandbox = {
    console: { log: (...args: unknown[]) => out.push(args.map(String).join(' ')) },
    __snap: (json: string) => snaps.push({ snap: JSON.parse(json), output: [...out] }),
    ...extra,
  }
  runInNewContext(insertAfterLines(source, inserts), sandbox, { timeout: 2000 })
  return { snaps, out }
}

type NormVal = { type: string; display: string } | { object: { key: string; value: NormVal }[] }
const normVal = (v: Val): NormVal => ({ type: v.type, display: v.display })
const normProps = (o: ObjectBox) => o.props.map((p) => ({ key: p.key, value: normVal(p.value) }))
const normBinding = (state: NewState, v: Val | ObjectRef): NormVal =>
  isRef(v) ? { object: normProps(boxOf(state, v.id)!) } : normVal(v)

// [시나리오 id, 단계(0부터), 탐침을 끼울 줄(afterLine), 종류]
// 'ctor': 생성자 본문 안(this의 자기 프로퍼티를 읽는다). 'sloppy-ctor': this가 전역 객체인지와 전역 title을 읽는다.
// 'outer': 바깥 줄(선언된 변수 값, sloppy 시나리오는 전역 title도 읽는다).
type Kind = 'ctor' | 'sloppy-ctor' | 'outer'
const snapshotPoints: [string, number, number, Kind][] = [
  // basic: 줄 1 function, 2·3 본문, 5·6 const, 7·8·9 출력
  ['basic', 3, 1, 'ctor'],
  ['basic', 4, 2, 'ctor'],
  ['basic', 5, 3, 'ctor'],
  ['basic', 7, 5, 'outer'],
  ['basic', 10, 1, 'ctor'],
  ['basic', 11, 2, 'ctor'],
  ['basic', 12, 3, 'ctor'],
  ['basic', 14, 6, 'outer'],
  ['basic', 15, 7, 'outer'],
  ['basic', 16, 8, 'outer'],
  ['basic', 17, 9, 'outer'],
  // return-object: 단계 5(return 줄)는 별도 테스트
  ['return-object', 3, 1, 'ctor'],
  ['return-object', 4, 2, 'ctor'],
  ['return-object', 7, 5, 'outer'],
  ['return-object', 8, 6, 'outer'],
  // return-primitive: return 줄은 this 객체를 바꾸지 않으므로 줄 2 뒤(return 직전)와 같은 상태다
  ['return-primitive', 3, 1, 'ctor'],
  ['return-primitive', 4, 2, 'ctor'],
  ['return-primitive', 5, 2, 'ctor'],
  ['return-primitive', 7, 5, 'outer'],
  ['return-primitive', 8, 6, 'outer'],
  // without-new-sloppy
  ['without-new-sloppy', 2, 1, 'sloppy-ctor'],
  ['without-new-sloppy', 3, 2, 'sloppy-ctor'],
  ['without-new-sloppy', 5, 4, 'outer'],
  ['without-new-sloppy', 6, 5, 'outer'],
  ['without-new-sloppy', 7, 6, 'outer'],
]

// 탐침을 끼우지 않는 단계: 인수 평가·생성 직후·결과 결정(본문 줄이 아니라 줄 사이의 상태)과 return-object의 return 줄(별도 테스트)
const unprobed = (id: string, i: number): boolean => {
  const step = scenarioById(id).steps[i]
  const inv = step.state.invocation
  if (!step.line) return true
  if (id === 'return-object' && i === 5) return true
  return inv !== null && (inv.stage === 'check' || inv.stage === 'create' || inv.stage === 'result')
}

function expectedProbe(state: NewState, kind: Kind, hasGlobal: boolean): Snap {
  const inv = state.invocation
  if (kind === 'ctor') {
    const self = boxOf(state, (inv!.thisValue as ObjectRef).id)!
    return { self: normProps(self) }
  }
  const global = state.objects.find((o) => o.role === 'global')
  const gTitle = global?.props.find((p) => p.key === 'title')
  const gtExpected = gTitle ? normVal(gTitle.value) : null
  if (kind === 'sloppy-ctor') {
    const thisBox = boxOf(state, (inv!.thisValue as ObjectRef).id)!
    return { thisIsGlobal: thisBox.role === 'global', title: gtExpected }
  }
  return {
    bindings: Object.fromEntries(state.bindings.map((b) => [b.name, normBinding(state, b.value)])),
    ...(hasGlobal && { title: gtExpected }),
  }
}

const probeExpr = (kind: Kind, state: NewState, hasGlobal: boolean): string => {
  if (kind === 'ctor') return `{ self: props(this) }`
  if (kind === 'sloppy-ctor') return `{ thisIsGlobal: this === globalThis, title: gt() }`
  const names = state.bindings.map((b) => `${b.name}: val(${b.name})`).join(', ')
  return `{ bindings: { ${names} }${hasGlobal ? ', title: gt()' : ''} }`
}

describe('시나리오 스냅샷 대조 (예제를 실제로 실행한 값과 비교)', () => {
  it('탐침을 끼우지 않는 단계를 뺀 모든 단계가 표에 있다', () => {
    const covered = new Set(snapshotPoints.map(([id, i]) => `${id}:${i}`))
    for (const s of scenarios) {
      s.steps.forEach((_, i) => {
        expect(covered.has(`${s.id}:${i}`), `${s.id} 단계 ${i + 1}`).toBe(!unprobed(s.id, i))
      })
    }
  })

  it.each(snapshotPoints)('%s 단계 %i (줄 %i 뒤, %s)', (id, index, afterLine, kind) => {
    const scenario = scenarioById(id)
    const step = scenario.steps[index]
    const hasGlobal = scenario.steps.some((st) => st.state.objects.some((o) => o.role === 'global'))
    // 같은 줄이 여러 번 실행되면(basic의 생성자 본문) 같은 줄을 지나는 단계들을 실행 순서대로 대응시킨다.
    const sameLine = snapshotPoints
      .filter(([sid, , line]) => sid === id && line === afterLine)
      .map(([, i]) => i)
    const nth = sameLine.indexOf(index)
    const { snaps, out } = runWithProbes(sourceOf(id), {
      [afterLine]: probeCode(probeExpr(kind, step.state, hasGlobal)),
    })
    // return-primitive 단계 4와 5는 같은 줄·같은 상태라 같은 실행 시점에 대응한다.
    const hits = snaps.length
    const expectedHits =
      id === 'return-primitive' && afterLine === 2 ? 1 : id === 'basic' && kind === 'ctor' ? 2 : 1
    expect(hits, `줄 ${afterLine} 뒤 탐침 실행 횟수`).toBe(expectedHits)
    const hit = snaps[id === 'return-primitive' && afterLine === 2 ? 0 : nth]
    expect(hit.snap).toEqual(expectedProbe(step.state, kind, hasGlobal))
    expect(hit.output, '그 시점의 콘솔 출력').toEqual(step.output ?? [])
    // 탐침을 끼운 코드의 최종 출력이 원본과 같다
    expect(out).toEqual(exampleOf(id).expectedOutput)
  })

  it('return-object 단계 6(return 줄): 새 객체 B가 만들어지고 A는 그대로다', () => {
    const scenario = scenarioById('return-object')
    const step = scenario.steps[5]
    const source = sourceOf('return-object').replace(
      "  return { title: 'other' };",
      `  const __o = { title: 'other' };\n${probeCode(`{ self: props(this), ret: props(__o) }`)}\n  return __o;`,
    )
    expect(source).not.toBe(sourceOf('return-object'))
    const { snaps, out } = runWithProbes(source, {})
    expect(snaps).toHaveLength(1)
    const inv = step.state.invocation!
    const retBox = boxOf(step.state, (inv.returned!.value as ObjectRef).id)!
    expect(snaps[0].snap).toEqual({
      self: normProps(boxOf(step.state, (inv.thisValue as ObjectRef).id)!),
      ret: normProps(retBox),
    })
    expect(snaps[0].output).toEqual(step.output)
    expect(out).toEqual(exampleOf('return-object').expectedOutput)
  })
})

// --- 결과 검증 ----------------------------------------------------------------------------------
// 실행 중 this를 배열에 담고, new 식의 결과가 그 this와 같은지(===)를 컨텍스트 안에서 판정해
// 시나리오의 role('result' = 같음, 'unused' = 다름)과 대조한다.

describe('new 식의 결과가 this 객체인지 (실제 실행 대조)', () => {
  // [시나리오 id, 생성자 머리 줄, [new 식을 대입하는 줄, 변수 이름][]]
  const cases: [string, number, [number, string][]][] = [
    [
      'basic',
      1,
      [
        [5, 'a'],
        [6, 'b'],
      ],
    ],
    ['return-object', 1, [[5, 'book']]],
    ['return-primitive', 1, [[5, 'book']]],
  ]

  it.each(cases)('%s', (id, headerLine, assigns) => {
    const scenario = scenarioById(id)
    const expected = scenario.steps
      .filter((st) => st.state.invocation?.stage === 'result')
      .map((st) => {
        const inv = st.state.invocation!
        const thisBox = boxOf(st.state, (inv.thisValue as ObjectRef).id)!
        expect(['result', 'unused']).toContain(thisBox.role)
        return thisBox.role === 'result'
      })
    expect(expected).toHaveLength(assigns.length)

    const inserts: Record<number, string> = { [headerLine]: '__this.push(this);' }
    for (const [line, name] of assigns)
      inserts[line] = `__same.push(${name} === __this[__this.length - 1]);`
    const __this: unknown[] = []
    const __same: boolean[] = []
    const { out } = runWithProbes(sourceOf(id), inserts, { __this, __same })
    expect(__this).toHaveLength(assigns.length)
    expect(__same).toEqual(expected)
    expect(out).toEqual(exampleOf(id).expectedOutput)
  })

  it('without-new-sloppy: new 없이 호출하면 결과는 undefined이고 this는 전역 객체다', () => {
    const result = runInNewContext(
      `${readExample('without-new-sloppy.js').split('\n').slice(0, 3).join('\n')}\nconst r = Book('JS'); JSON.stringify([r === undefined, globalThis.title])`,
    ) as string
    expect(JSON.parse(result)).toEqual([true, 'JS'])
  })
})
