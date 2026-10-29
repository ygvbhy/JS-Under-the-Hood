import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type FnCard, type ThisState, type ThisVal } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')

// 컨텍스트 안에서 JSON 문자열로 만들어 돌려주고 호스트에서 파싱한다(realm이 달라 instanceof를 쓰지 않는다).
const jsonOf = (source: string): unknown => JSON.parse(runInNewContext(source) as string)

const STRICT = "'use strict';\n"

describe('본문 주장 검증', () => {
  it('클래식 스크립트 최상위 this는 sloppy·strict 모두 globalThis다', () => {
    expect(runInNewContext('this === globalThis')).toBe(true)
    expect(runInNewContext(`${STRICT}this === globalThis`)).toBe(true)
  })

  it('객체 리터럴의 화살표 함수 프로퍼티는 o.m()으로 불러도 바깥(최상위) this를 쓴다', () => {
    expect(
      jsonOf(`const o = { m: () => this }; JSON.stringify([o.m() === globalThis, o.m() === o])`),
    ).toEqual([true, false])
  })

  it('함수 안의 객체 리터럴 화살표 프로퍼티는 그 함수의 this를 쓴다', () => {
    expect(
      jsonOf(
        `const kim = {}; function make() { const o = { m: () => this }; return [o.m() === kim, o.m() === o]; }
         JSON.stringify(make.call(kim))`,
      ),
    ).toEqual([true, false])
  })

  it("대괄호로 쓴 obj['m']()·obj[key]()도 프로퍼티 참조라 this는 obj다", () => {
    expect(
      jsonOf(
        `const obj = { m() { return this; } }; const key = 'm';
         JSON.stringify([obj['m']() === obj, obj[key]() === obj])`,
      ),
    ).toEqual([true, true])
  })

  it('super.m()의 this는 기준 값(프로토타입)이 아니라 현재 this다 (단순화 근거)', () => {
    expect(
      jsonOf(
        `const proto = { m() { return this; } };
         const obj = { __proto__: proto, n() { return super.m(); } };
         JSON.stringify([obj.n() === obj, obj.n() === proto])`,
      ),
    ).toEqual([true, false])
  })

  it('프로토타입 체인에서 찾은 메서드도 this는 점 앞의 객체다', () => {
    expect(
      jsonOf(
        `const proto = { who() { return this; } }; const child = Object.create(proto);
         JSON.stringify([Object.hasOwn(child, 'who'), child.who() === child, child.who() === proto])`,
      ),
    ).toEqual([false, true, false])
  })

  it('sloppy f.call(1)의 typeof this는 object이고 strict는 number다', () => {
    expect(runInNewContext('function f() { return typeof this; } f.call(1)')).toBe('object')
    expect(runInNewContext(`function f() { ${STRICT} return typeof this; } f.call(1)`)).toBe(
      'number',
    )
  })

  it('sloppy f.call(null)의 this는 globalThis이고 strict는 null이다', () => {
    expect(runInNewContext('function f() { return this === globalThis; } f.call(null)')).toBe(true)
    expect(runInNewContext(`function f() { ${STRICT} return this === null; } f.call(null)`)).toBe(
      true,
    )
  })

  it("bound function의 name은 'bound whoAmI'이고 prototype 프로퍼티가 없다", () => {
    expect(
      jsonOf(
        `function whoAmI() {} const g = whoAmI.bind(null);
         JSON.stringify([g.name, Object.hasOwn(g, 'prototype'), Object.hasOwn(whoAmI, 'prototype')])`,
      ),
    ).toEqual(['bound whoAmI', false, true])
  })

  it('bound function의 length는 묶은 인수만큼 줄어들고 0보다 작아지지 않는다', () => {
    expect(runInNewContext('function g(a, b, c) {} g.bind(null, 1).length')).toBe(2)
    expect(runInNewContext('function whoAmI() {} whoAmI.bind({}, 1, 2).length')).toBe(0)
  })

  it('strict 메서드 안 중첩 함수(일반 호출)의 this는 undefined다', () => {
    expect(
      runInNewContext(
        `${STRICT}const o = { m() { function inner() { return String(this); } return inner(); } }; o.m()`,
      ),
    ).toBe('undefined')
  })

  it('book?.w()는 this를 유지하고 (f = b.w)()는 this를 잃는다', () => {
    const setup = `${STRICT}const book = { w() { return this === book; } };`
    expect(runInNewContext(`${setup} book?.w()`)).toBe(true)
    expect(runInNewContext(`${setup} let f; (f = book.w)()`)).toBe(false)
  })

  it('bound 생성자로 만든 객체는 bound와 원본 모두의 instanceof가 true다', () => {
    expect(
      jsonOf(
        `function B() {} const BB = B.bind(null); const o = new BB();
         JSON.stringify([o instanceof BB, o instanceof B])`,
      ),
    ).toEqual([true, true])
  })

  it('화살표 함수에 call(1)을 해도 this는 바깥 this다', () => {
    expect(runInNewContext('const a = () => this; a.call(1) === globalThis')).toBe(true)
  })

  it('f.bind(null)은 f와 다른 새 함수다', () => {
    expect(runInNewContext('function f() {} f.bind(null) !== f')).toBe(true)
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
  // 모듈은 항상 strict라 sloppy 예제의 출력만 달라진다. 나머지는 expectedOutput과 같다.
  const moduleOutput: Record<string, string[]> = {
    'extract-sloppy.js': ['book', 'undefined'],
    'plain-call.js': ['false', 'undefined'],
    'nested-function.js': ['true', 'false', 'false'],
  }

  const expected = (file: string, ext: '.mjs' | '.cjs') =>
    (ext === '.mjs' && moduleOutput[file]
      ? moduleOutput[file]
      : concept.examples.find((e) => e.file === file)!.expectedOutput
    ).join('\n') + '\n'

  const runNodeFile = (path: string) =>
    execFileSync(process.execPath, [path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

  const runAs = (file: string, ext: '.mjs' | '.cjs') => {
    const dir = mkdtempSync(join(tmpdir(), 'this-binding-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return runNodeFile(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it.each(concept.examples.map((e) => e.file))('%s (.cjs): 클래식 스크립트와 같은 출력', (file) => {
    expect(runAs(file, '.cjs')).toBe(expected(file, '.cjs'))
  })

  it.each(concept.examples.map((e) => e.file))(
    '%s (.mjs): sloppy 예제 3개만 모듈(strict) 결과로 달라진다',
    (file) => {
      expect(runAs(file, '.mjs')).toBe(expected(file, '.mjs'))
    },
  )

  it.each(Object.keys(moduleOutput))(
    '%s: package.json에 "type": "module"이 있으면 .js도 .mjs와 같은 결과다',
    (file) => {
      const dir = mkdtempSync(join(tmpdir(), 'this-binding-'))
      try {
        writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
        writeFileSync(join(dir, file), readExample(file))
        expect(runNodeFile(join(dir, file))).toBe(expected(file, '.mjs'))
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    },
  )
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 호출 결정 구조(참조 → thisArg → 함수 모드 규칙 → this)
// + 예제에 탐침을 끼워 컨텍스트 안에서 `===`로 판정한 실제 this와의 대조

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const sourceOf = (id: string) => readExample(exampleOf(id).file)
const scenarioById = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 불변식', () => {
  it('시나리오 id와 exampleId가 meta.examples의 id와 일치한다', () => {
    expect(scenarios.map((s) => [s.id, s.exampleId])).toEqual([
      ['extract', 'extract-sloppy'],
      ['callback', 'callback'],
      ['bind', 'bind-rules'],
      ['parens', 'parens-comma'],
    ])
    for (const s of scenarios) expect(exampleOf(s.exampleId)).toBeDefined()
  })

  it.each(scenarios)('$id: 공통 불변식', (scenario) => {
    const example = exampleOf(scenario.exampleId)
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('시나리오별 단계 수', () => {
    expect(Object.fromEntries(scenarios.map((s) => [s.id, s.steps.length]))).toEqual({
      extract: 5,
      callback: 8,
      bind: 8,
      parens: 5,
    })
  })
})

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const GLOBAL: ThisVal = { kind: 'global' }

// 불리는 함수의 모드 규칙으로 this를 계산한다(시나리오의 thisValue와 별도로 구현).
const applyMode = (mode: string, thisArg: ThisVal): ThisVal =>
  mode === 'sloppy' && thisArg.kind === 'undefined' ? GLOBAL : thisArg

function expectedThisValue(fns: FnCard[], calleeId: string, thisArg: ThisVal): ThisVal {
  const byId = (id: string) => fns.find((f) => f.id === id)!
  const f = byId(calleeId)
  if (f.mode === 'arrow') return f.lexicalThis!
  if (f.mode !== 'bound') return applyMode(f.mode, thisArg)
  // bound 함수는 받은 thisArg를 버린다. 원본이 bound면 그 bound로 이어지고, 가장 안쪽 bound의 boundThis가 원본에 전달된다.
  let inner = f
  while (byId(inner.targetId!).mode === 'bound') inner = byId(inner.targetId!)
  const target = byId(inner.targetId!)
  return target.mode === 'arrow' ? target.lexicalThis! : applyMode(target.mode, inner.boundThis!)
}

const modeKeyword = { sloppy: 'sloppy', strict: 'strict', arrow: '화살표', bound: 'bound' } as const

const vals = (state: ThisState): ThisVal[] =>
  [
    ...state.functions.flatMap((f) => [f.lexicalThis, f.boundThis]),
    ...state.history.map((h) => h.thisValue),
    ...(state.current
      ? [
          state.current.thisArg,
          state.current.thisValue,
          ...(state.current.firstArg ? [state.current.firstArg] : []),
          ...(state.current.ref.kind === 'property' ? [state.current.ref.base] : []),
        ]
      : []),
  ].filter((v): v is ThisVal => v !== undefined)

describe('시나리오 구조', () => {
  it.each(scenarios)('$id: 참조는 존재하는 카드를 가리키고 id·이름이 겹치지 않는다', (s) => {
    s.steps.forEach((step, i) => {
      const { state } = step
      const where = `${s.id} 단계 ${i + 1}`
      const objectIds = state.objects.map((o) => o.id)
      const fnIds = state.functions.map((f) => f.id)
      expect(new Set(objectIds).size, `${where}: 객체 id 중복`).toBe(objectIds.length)
      expect(new Set(fnIds).size, `${where}: 함수 id 중복`).toBe(fnIds.length)
      expect(new Set(state.bindings.map((b) => b.name)).size, `${where}: 변수 이름 중복`).toBe(
        state.bindings.length,
      )
      for (const v of vals(state))
        if (v.kind === 'object')
          expect(objectIds, `${where}: 없는 객체 ${v.id}를 가리킴`).toContain(v.id)
      for (const f of state.functions)
        if (f.targetId) expect(fnIds, `${where}: 없는 원본 ${f.targetId}`).toContain(f.targetId)
      if (state.current) {
        expect(fnIds, `${where}: 없는 callee ${state.current.callee}`).toContain(
          state.current.callee,
        )
        const ref = state.current.ref
        if (ref.kind === 'function-property') expect(fnIds).toContain(ref.fnId)
      }
      // 변수의 값 표시는 존재하는 카드의 label이다
      const labels = [
        ...state.objects.map((o) => `객체 ${o.label}`),
        ...state.functions.map((f) => `함수 ${f.label}`),
      ]
      for (const b of state.bindings)
        expect(labels, `${where}: 변수 ${b.name}의 값이 카드에 없음`).toContain(b.value)
    })
  })

  it.each(scenarios)(
    '$id: 모드별 필드가 맞다(arrow·bound만 lexicalThis·boundThis를 가진다)',
    (s) => {
      for (const step of s.steps)
        for (const f of step.state.functions) {
          expect(f.lexicalThis !== undefined, `${f.id}: lexicalThis`).toBe(f.mode === 'arrow')
          expect(f.boundThis !== undefined, `${f.id}: boundThis`).toBe(f.mode === 'bound')
          expect(f.targetId !== undefined, `${f.id}: targetId`).toBe(f.mode === 'bound')
        }
    },
  )

  it.each(scenarios)('$id: thisArg는 함수 자리 식의 참조·call/apply 규칙을 따른다', (s) => {
    s.steps.forEach((step, i) => {
      const cur = step.state.current
      if (!cur) return
      const where = `${s.id} 단계 ${i + 1} ${cur.expr}`
      if (cur.via) {
        // call·apply: 함수 자리 식은 함수의 call/apply 프로퍼티이고 thisArg는 첫 인수다
        expect(cur.ref.kind, `${where}: via의 ref`).toBe('function-property')
        if (cur.ref.kind === 'function-property') {
          expect(cur.ref.key, `${where}: ref.key`).toBe(cur.via)
          expect(cur.ref.fnId, `${where}: call 대상이 callee`).toBe(cur.callee)
        }
        expect(cur.firstArg, `${where}: 첫 인수`).not.toBeNull()
        expect(cur.thisArg, `${where}: thisArg = 첫 인수`).toEqual(cur.firstArg)
        return
      }
      expect(cur.firstArg, `${where}: via 없는데 첫 인수`).toBeNull()
      expect(cur.ref.kind, `${where}`).not.toBe('function-property')
      if (cur.ref.kind === 'property')
        expect(cur.thisArg, `${where}: 기준 값`).toEqual(cur.ref.base)
      else expect(cur.thisArg, `${where}: 참조 아님 → undefined`).toEqual({ kind: 'undefined' })
    })
  })

  it.each(scenarios)('$id: thisValue와 rule은 불리는 함수의 모드 규칙과 같다', (s) => {
    s.steps.forEach((step, i) => {
      const cur = step.state.current
      if (!cur) return
      const where = `${s.id} 단계 ${i + 1} ${cur.expr}`
      const callee = step.state.functions.find((f) => f.id === cur.callee)!
      expect(cur.thisValue, `${where}: thisValue`).toEqual(
        expectedThisValue(step.state.functions, cur.callee, cur.thisArg),
      )
      expect(cur.rule, `${where}: rule에 모드 이름`).toContain(modeKeyword[callee.mode])
    })
  })

  it.each(scenarios)('$id: history는 이전 history에 이번 결정을 더한 것과 같다', (s) => {
    let prev: ThisState['history'] = []
    s.steps.forEach((step, i) => {
      const cur = step.state.current
      const expected = cur ? [...prev, { expr: cur.expr, thisValue: cur.thisValue }] : prev
      expect(step.state.history, `${s.id} 단계 ${i + 1}`).toEqual(expected)
      prev = step.state.history
    })
  })

  it.each(scenarios)('$id: changed·created 표시는 이전 단계와의 실제 차이와 같다', (s) => {
    // 실행 전(0단계)에는 함수 선언만 있고, 이 단계의 항목에는 created·changed가 붙지 않는다
    let prev: ThisState = s.steps[0].state
    expect(prev.objects.length + prev.bindings.length, `${s.id}: 0단계`).toBe(0)
    expect(prev.functions.some((f) => f.created)).toBe(false)
    const strip = <T extends { created?: true }>(c: T) => ({ ...c, created: undefined })
    s.steps.slice(1).forEach((step, j) => {
      const i = j + 1
      const where = `${s.id} 단계 ${i + 1}`
      const cur = step.state
      for (const b of cur.bindings) {
        const before = prev.bindings.find((x) => x.name === b.name)
        expect(b.changed === true, `${where}: 변수 ${b.name}의 changed`).toBe(
          !before || before.value !== b.value,
        )
      }
      for (const o of cur.objects) {
        const before = prev.objects.find((x) => x.id === o.id)
        expect(o.created === true, `${where}: 객체 ${o.id}의 created`).toBe(!before)
        if (before)
          expect(sameJson(strip(before), strip(o)), `${where}: 객체 ${o.id} 변경`).toBe(true)
      }
      for (const f of cur.functions) {
        const before = prev.functions.find((x) => x.id === f.id)
        expect(f.created === true, `${where}: 함수 ${f.id}의 created`).toBe(!before)
        if (before)
          expect(sameJson(strip(before), strip(f)), `${where}: 함수 ${f.id} 변경`).toBe(true)
      }
      for (const b of prev.bindings) expect(cur.bindings.some((x) => x.name === b.name)).toBe(true)
      for (const o of prev.objects) expect(cur.objects.some((x) => x.id === o.id)).toBe(true)
      for (const f of prev.functions) expect(cur.functions.some((x) => x.id === f.id)).toBe(true)
      prev = cur
    })
  })
})

// --- 탐침 ---------------------------------------------------------------------------------------
// 함수 본문이 실제로 받은 this를 __probe에 기록한다. 기록은 실행 순서대로 결정 단계(current가 있는 단계)와 하나씩 대응한다.
// 비교는 컨텍스트 안에서 `===`로 하고 불리언만 호스트로 돌려준다(realm이 달라 호스트에서 객체를 비교하지 않는다).

const PROBE = '__probe.push(this);'

// replace: 표현식 본문 화살표 함수처럼 줄 뒤에 끼울 수 없는 곳. inserts: [원본 줄 번호] 뒤에 끼운다.
const probeSpecs: Record<
  string,
  { replace?: [string, string][]; inserts: Record<number, string> }
> = {
  // 줄 2: whoAmI 본문 시작
  extract: { inserts: { 2: PROBE } },
  // 줄 5 report, 6 plain, 10 viaThat 본문 시작 + 화살표 viaArrow 본문. 실행 순서: report, plain, plain(bound 경유), viaThat, viaArrow
  callback: {
    replace: [
      [
        'const viaArrow = () => this === book;',
        'const viaArrow = () => (__probe.push(this), this === book);',
      ],
    ],
    inserts: { 5: PROBE, 6: PROBE, 10: PROBE },
  },
  // 줄 1: 최종 원본 whoAmI 본문 시작(bound 경유 호출 4번 모두 여기로 온다)
  bind: { inserts: { 1: PROBE } },
  // 줄 3: whoAmI 본문 시작
  parens: { inserts: { 3: PROBE } },
}

function insertAfterLines(source: string, inserts: Record<number, string>): string {
  const out: string[] = []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (inserts[i + 1] !== undefined) out.push(inserts[i + 1])
  })
  return out.join('\n')
}

// 기대 this를 컨텍스트 안의 식으로 바꾼다(객체 id = 예제의 변수 이름).
const exprOfThis = (v: ThisVal): string =>
  v.kind === 'global' ? 'globalThis' : v.kind === 'object' ? v.id : 'undefined'

describe('시나리오 탐침 대조 (예제를 실제로 실행한 this와 비교)', () => {
  it.each(scenarios)('$id: 결정 단계마다 thisValue가 실제 this와 같다(===)', (s) => {
    const spec = probeSpecs[s.id]
    let source = sourceOf(s.exampleId)
    for (const [from, to] of spec.replace ?? []) {
      expect(source).toContain(from)
      source = source.replace(from, to)
    }
    const expectedThis = s.steps.flatMap((st) =>
      st.state.current ? [st.state.current.thisValue] : [],
    )
    const comparisons = expectedThis.map((v, i) => `__probe[${i}] === ${exprOfThis(v)}`)
    const out: string[] = []
    const __probe: unknown[] = []
    const result = runInNewContext(
      `${insertAfterLines(source, spec.inserts)}\nJSON.stringify([__probe.length, ${comparisons.join(', ')}]);`,
      { console: { log: (...args: unknown[]) => out.push(args.map(String).join(' ')) }, __probe },
      { timeout: 2000 },
    ) as string
    expect(JSON.parse(result)).toEqual([expectedThis.length, ...expectedThis.map(() => true)])
    // 탐침을 끼운 코드의 출력이 원본과 같다
    expect(out).toEqual(exampleOf(s.exampleId).expectedOutput)
  })

  it('callback: 결정 단계 수는 호출 수와 같다(report 1회 + callback 4회)', () => {
    const count = scenarioById('callback').steps.filter((st) => st.state.current).length
    expect(count).toBe(5)
  })
})
