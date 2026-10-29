import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Lookup, type ObjectCard, type ProtoState } from './scenarios'

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

const STRICT = "'use strict';\n"

describe('본문 주장 검증', () => {
  it('inherited-readonly.js에 첫 줄 use strict를 붙이면 item.id = 2에서 TypeError다', () => {
    expect(errorNameOf(STRICT + readExample('inherited-readonly.js'))).toBe('TypeError')
  })

  it('runExample로도 strict 버전은 TypeError를 던지고 sloppy 버전은 출력한다', () => {
    expect(() => runExample(STRICT + readExample('inherited-readonly.js'))).toThrow(
      expect.objectContaining({ name: 'TypeError' }),
    )
    expect(runExample(readExample('inherited-readonly.js'))).toEqual(['1', 'false', '2', '1'])
  })

  it('상속된 getter만 있는 프로퍼티에 대입하면 sloppy는 무시하고 strict는 TypeError다', () => {
    const body = `const base = { get x() { return 'g'; } }; const item = Object.create(base); item.x = 1;`
    expect(jsonOf(`${body} JSON.stringify({ v: item.x, own: Object.hasOwn(item, 'x') })`)).toEqual({
      v: 'g',
      own: false,
    })
    expect(errorNameOf(STRICT + body)).toBe('TypeError')
  })

  it('new Book()의 constructor는 Book이고 자기 프로퍼티가 아니다', () => {
    expect(
      jsonOf(
        `function Book() {} const a = new Book(); JSON.stringify({ same: a.constructor === Book, own: Object.hasOwn(a, 'constructor') })`,
      ),
    ).toEqual({ same: true, own: false })
  })

  it('Book.prototype을 새 객체로 교체한 뒤 만든 객체의 constructor는 Object다', () => {
    expect(
      runInNewContext(
        `function Book() {} Book.prototype = { kind: 'book' }; const a = new Book(); String(a.constructor === Object)`,
      ),
    ).toBe('true')
  })

  it('Object.create에 객체도 null도 아닌 값을 넘기면 TypeError다', () => {
    expect(errorNameOf('Object.create(1);')).toBe('TypeError')
    expect(errorNameOf('Object.create(undefined);')).toBe('TypeError')
  })

  it('메서드 축약과 화살표 함수에는 prototype 프로퍼티가 없다', () => {
    expect(
      jsonOf(
        `const o = { m() {} }; const f = () => {}; JSON.stringify([typeof o.m.prototype, typeof f.prototype])`,
      ),
    ).toEqual(['undefined', 'undefined'])
  })

  it('자기 프로퍼티 값이 undefined여도 in은 true이고 !== undefined 검사는 false다', () => {
    expect(
      jsonOf(`const o = { x: undefined }; JSON.stringify({ i: 'x' in o, d: o.x !== undefined })`),
    ).toEqual({ i: true, d: false })
  })

  it('Object.prototype에 __proto__ 접근자(get·set)가 있고 {}의 자기 프로퍼티는 아니다', () => {
    expect(
      jsonOf(
        `const d = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__'); JSON.stringify({ get: typeof d.get, set: typeof d.set, own: Object.hasOwn({}, '__proto__') })`,
      ),
    ).toEqual({ get: 'function', set: 'function', own: false })
  })

  it('Object.create(null) 객체의 __proto__는 undefined다', () => {
    expect(runInNewContext(`typeof Object.create(null).__proto__`)).toBe('undefined')
  })

  it('상속된 프로퍼티를 delete하면 true를 돌려주지만 여전히 읽힌다', () => {
    expect(
      jsonOf(
        `const base = { x: 1 }; const item = Object.create(base); const r = delete item.x; JSON.stringify({ r, x: item.x })`,
      ),
    ).toEqual({ r: true, x: 1 })
  })

  it('함수·Function.prototype·F.prototype의 [[Prototype]] 연결', () => {
    expect(
      jsonOf(
        `function F() {} JSON.stringify([
          Object.getPrototypeOf(F) === Function.prototype,
          Object.getPrototypeOf(Function.prototype) === Object.prototype,
          Object.getPrototypeOf(F.prototype) === Object.prototype,
        ])`,
      ),
    ).toEqual([true, true, true])
  })

  it('F.prototype의 서술자는 writable true·enumerable false·configurable false이고 constructor는 enumerable false다', () => {
    expect(
      jsonOf(
        `function F() {} const p = Object.getOwnPropertyDescriptor(F, 'prototype'); const c = Object.getOwnPropertyDescriptor(F.prototype, 'constructor');
         JSON.stringify({ w: p.writable, e: p.enumerable, c: p.configurable, ce: c.enumerable })`,
      ),
    ).toEqual({ w: true, e: false, c: false, ce: false })
  })

  it('체인에 순환을 만들면 TypeError다', () => {
    expect(
      errorNameOf(`const a = {}; const b = Object.create(a); Object.setPrototypeOf(a, b);`),
    ).toBe('TypeError')
  })

  it('Object.prototype의 [[Prototype]]을 바꾸려 하면 TypeError다', () => {
    expect(errorNameOf('Object.setPrototypeOf(Object.prototype, {});')).toBe('TypeError')
  })

  it('JSON.stringify는 상속된 프로퍼티를 넣지 않는다', () => {
    expect(
      runInNewContext(
        `const base = { kind: 'book' }; const item = Object.create(base); item.title = 'JS'; JSON.stringify(item)`,
      ),
    ).toBe('{"title":"JS"}')
  })

  it('자기 프로퍼티가 열거 불가이면 같은 이름의 상속된 열거 가능 프로퍼티도 for...in에 나오지 않는다', () => {
    expect(
      jsonOf(
        `const base = { x: 1 }; const item = Object.create(base); Object.defineProperty(item, 'x', { value: 2, enumerable: false });
         const keys = []; for (const k in item) keys.push(k); JSON.stringify(keys)`,
      ),
    ).toEqual([])
  })

  it('1 instanceof F는 false이고 Object.create(null) instanceof Object도 false다', () => {
    expect(
      jsonOf(
        `function F() {} JSON.stringify([1 instanceof F, Object.create(null) instanceof Object])`,
      ),
    ).toEqual([false, false])
  })

  it('Function.prototype에 Symbol.hasInstance 메서드가 있다', () => {
    expect(runInNewContext(`typeof Function.prototype[Symbol.hasInstance]`)).toBe('function')
  })

  it('상속된 메서드는 Object.prototype에서 온다: ({}).hasOwnProperty는 자기 프로퍼티가 아니다', () => {
    expect(
      jsonOf(
        `const o = {}; JSON.stringify({ own: Object.hasOwn(o, 'hasOwnProperty'), fromProto: o.hasOwnProperty === Object.prototype.hasOwnProperty, r: o.hasOwnProperty('x') })`,
      ),
    ).toEqual({ own: false, fromProto: true, r: false })
  })

  it('생성자 자신의 프로퍼티(Book.count)는 new Book().count로 읽히지 않는다', () => {
    expect(runInNewContext('function Book() {} Book.count = 1; String(new Book().count)')).toBe(
      'undefined',
    )
  })

  it('F.prototype이 객체가 아니면 new F()의 [[Prototype]]은 Object.prototype이다', () => {
    expect(
      runInNewContext(
        'function F() {} F.prototype = 1; Object.getPrototypeOf(new F()) === Object.prototype',
      ),
    ).toBe(true)
  })

  it('instanceof: 왼쪽 값이 객체가 아니면 F.prototype을 확인하기 전에 false, 객체이면 F.prototype이 객체가 아닐 때 TypeError', () => {
    expect(runInNewContext('function F() {} F.prototype = 1; 1 instanceof F')).toBe(false)
    expect(errorNameOf('function F() {} F.prototype = 1; ({}) instanceof F')).toBe('TypeError')
  })

  it('제너레이터 메서드는 축약 문법이지만 prototype 프로퍼티가 있다', () => {
    expect(runInNewContext('typeof ({ *g() {} }).g.prototype')).toBe('object')
  })

  it('JSON.stringify는 열거 불가인 자기 프로퍼티도 넣지 않는다', () => {
    expect(
      runInNewContext(
        "const o = {}; Object.defineProperty(o, 'x', { value: 1 }); JSON.stringify(o)",
      ),
    ).toBe('{}')
  })

  it('대입받는 객체가 확장 불가이면 상속된 쓰기 가능 프로퍼티가 있어도 자기 프로퍼티가 생기지 않는다(sloppy 무시, strict TypeError)', () => {
    const setup =
      'const base = { c: 1 }; const item = Object.create(base); Object.preventExtensions(item); item.c = 2;'
    expect(jsonOf(`${setup} JSON.stringify([item.c, Object.hasOwn(item, 'c')])`)).toEqual([
      1,
      false,
    ])
    expect(errorNameOf(`'use strict'; ${setup}`)).toBe('TypeError')
  })

  it('in은 열거 가능 여부를 따지지 않는다: 열거 불가인 Object.prototype.toString에도 true', () => {
    expect(
      jsonOf(
        `const d = Object.getOwnPropertyDescriptor(Object.prototype, 'toString'); JSON.stringify([d.enumerable, 'toString' in {}])`,
      ),
    ).toEqual([false, true])
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
  const strictOnlyModuleExamples = ['inherited-readonly.js']

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
    const dir = mkdtempSync(join(tmpdir(), 'prototype-chain-'))
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

  it.each(concept.examples.map((e) => e.file).filter((f) => !strictOnlyModuleExamples.includes(f)))(
    '%s (.mjs): 클래식 스크립트와 같은 출력',
    (file) => {
      const result = runAs(file, '.mjs')
      expect(result.status).toBe(0)
      expect(result.stdout).toBe(expected(file))
    },
  )

  it.each(strictOnlyModuleExamples)(
    '%s (.mjs): 모듈은 항상 strict라 잡히지 않은 TypeError로 끝난다',
    (file) => {
      const result = runAs(file, '.mjs')
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('TypeError')
    },
  )

  it('package.json에 "type": "module"이 있으면 .js 파일도 모듈이라 inherited-readonly.js가 TypeError로 끝난다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'prototype-chain-'))
    try {
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
      writeFileSync(join(dir, 'inherited-readonly.js'), readExample('inherited-readonly.js'))
      const result = runNodeFile(join(dir, 'inherited-readonly.js'))
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('TypeError')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(참조, 경로, changed·created = 실제 변화)
// + 예제에 탐침 코드를 끼워 컨텍스트 안에서 얻은 실제 객체와의 대조(카드·[[Prototype]]·자기 프로퍼티)
// + 탐색 경로 대조(get·set·instanceof). 동일성(===) 비교는 모두 컨텍스트 안에서 하고 JSON으로 돌려받는다(realm이 다르다).

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const sourceOf = (id: string) => readExample(exampleOf(id).file)

describe('시나리오 불변식', () => {
  it('시나리오 id와 exampleId가 meta.examples의 id와 일치한다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'chain',
      'prototype-property',
      'shadowing',
      'instanceof',
    ])
    for (const s of scenarios) expect(s.exampleId).toBe(s.id)
  })

  it.each(scenarios)('$id: 공통 불변식', (scenario) => {
    const example = exampleOf(scenario.exampleId)
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('시나리오별 단계 수', () => {
    expect(Object.fromEntries(scenarios.map((s) => [s.id, s.steps.length]))).toEqual({
      chain: 10,
      'prototype-property': 9,
      shadowing: 10,
      instanceof: 11,
    })
  })
})

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const cardOf = (state: ProtoState, id: string) => state.objects.find((o) => o.id === id)
const isRefValue = (v: unknown): v is { kind: 'ref'; id: string } =>
  typeof v === 'object' && v !== null && (v as { kind?: string }).kind === 'ref'

describe('시나리오 구조', () => {
  it.each(scenarios)('$id: 참조는 존재하는 카드를 가리키고 id·이름·키가 겹치지 않는다', (s) => {
    s.steps.forEach((step, i) => {
      const { state } = step
      const where = `${s.id} 단계 ${i + 1}`
      const ids = state.objects.map((o) => o.id)
      expect(new Set(ids).size, `${where}: 카드 id 중복`).toBe(ids.length)
      expect(new Set(state.bindings.map((b) => b.name)).size, `${where}: 변수 이름 중복`).toBe(
        state.bindings.length,
      )
      for (const b of state.bindings)
        if (isRefValue(b.value))
          expect(ids, `${where}: 없는 카드 ${b.value.id}`).toContain(b.value.id)
      for (const o of state.objects) {
        expect(new Set(o.props.map((p) => p.key)).size, `${where}: ${o.id} 프로퍼티 키 중복`).toBe(
          o.props.length,
        )
        for (const p of o.props)
          if (isRefValue(p.value))
            expect(ids, `${where}: 없는 카드 ${p.value.id}`).toContain(p.value.id)
        if (o.proto.kind === 'ref')
          expect(ids, `${where}: 없는 카드 ${o.proto.id}`).toContain(o.proto.id)
      }
      const lk = state.lookup
      if (lk) {
        expect(ids, `${where}: startId`).toContain(lk.startId)
        if (lk.kind === 'instanceof') expect(ids, `${where}: targetId`).toContain(lk.targetId)
        for (const p of lk.path) expect(ids, `${where}: 경로의 카드 ${p.id}`).toContain(p.id)
      }
    })
  })

  it.each(scenarios)('$id: 탐색 경로는 카드의 [[Prototype]]을 따라가고 끝 표시와 일치한다', (s) => {
    s.steps.forEach((step, i) => {
      const lk: Lookup | null = step.state.lookup
      if (!lk) return
      const where = `${s.id} 단계 ${i + 1}`
      const path = lk.path
      expect(path.length, `${where}: 빈 경로`).toBeGreaterThan(0)
      const first =
        lk.kind === 'instanceof'
          ? cardOf(step.state, lk.startId)!.proto
          : { kind: 'ref', id: lk.startId }
      expect(first.kind, `${where}: 시작`).toBe('ref')
      expect(path[0].id, `${where}: 첫 칸`).toBe((first as { id: string }).id)
      for (let k = 0; k + 1 < path.length; k++) {
        const proto = cardOf(step.state, path[k].id)!.proto
        expect(proto, `${where}: 칸 ${k + 1}의 [[Prototype]]`).toEqual({
          kind: 'ref',
          id: path[k + 1].id,
        })
      }
      const flags = path.map((p) => ('match' in p ? p.match : p.found))
      const hit = lk.end === 'found' || lk.end === 'match'
      expect(
        flags.slice(0, -1).every((f) => f === false),
        `${where}: 찾음·일치는 마지막 칸만`,
      ).toBe(true)
      expect(flags[flags.length - 1], `${where}: 끝 표시와 마지막 칸`).toBe(hit)
      if (!hit) {
        // 끝이 null이면 마지막 카드의 [[Prototype]]이 null이다
        expect(cardOf(step.state, path[path.length - 1].id)!.proto).toEqual({ kind: 'null' })
      }
      if (lk.kind === 'instanceof') {
        expect(lk.outcome, `${where}: outcome`).toBe(String(lk.end === 'match'))
        const target = cardOf(step.state, lk.targetId)!
        expect(target, `${where}: target 카드`).toBeDefined()
        if (hit) expect(path[path.length - 1].id).toBe(lk.targetId)
        else
          expect(
            path.map((p) => p.id),
            `${where}: 불일치 경로에 대상이 있음`,
          ).not.toContain(lk.targetId)
      } else {
        // get·set: 찾은 카드에만 키가 있다(set은 대입 직전 상태 기준이라 앞 단계 카드를 본다)
        const state = lk.kind === 'set' ? s.steps[i - 1].state : step.state
        path.forEach((p, k) => {
          const has = cardOf(state, p.id)!.props.some((x) => x.key === lk.key)
          expect(has, `${where}: ${p.id}의 ${lk.key}`).toBe(
            k === path.length - 1 && lk.end === 'found',
          )
        })
      }
    })
  })

  it.each(scenarios)(
    '$id: changed·created·protoChanged 표시는 이전 단계와의 실제 차이와 같다',
    (s) => {
      s.steps.forEach((step, i) => {
        const where = `${s.id} 단계 ${i + 1}`
        const cur = step.state
        // 0단계에는 표시가 없다
        const prev = i === 0 ? cur : s.steps[i - 1].state
        for (const b of cur.bindings) {
          const before = prev.bindings.find((x) => x.name === b.name)
          const differs = i > 0 && (!before || !sameJson(before.value, b.value))
          expect(b.changed === true, `${where}: 변수 ${b.name}의 changed`).toBe(differs)
        }
        for (const o of cur.objects as ObjectCard[]) {
          const before = cardOf(prev, o.id)
          expect(o.created === true, `${where}: ${o.id}의 created`).toBe(i > 0 && !before)
          expect(o.protoChanged === true, `${where}: ${o.id}의 protoChanged`).toBe(
            i > 0 && (!before || !sameJson(before.proto, o.proto)),
          )
          for (const p of o.props) {
            const old = before?.props.find((x) => x.key === p.key)
            const expected =
              i === 0
                ? undefined
                : !old
                  ? 'created'
                  : sameJson(old.value, p.value)
                    ? undefined
                    : 'updated'
            expect(p.changed, `${where}: ${o.id}.${p.key}의 changed`).toBe(expected)
          }
        }
        // 카드와 변수는 사라지지 않는다
        for (const b of prev.bindings)
          expect(cur.bindings.some((x) => x.name === b.name)).toBe(true)
        for (const o of prev.objects)
          expect(cardOf(cur, o.id), `${where}: ${o.id} 사라짐`).toBeDefined()
      })
    },
  )
})

// --- 탐침 ---------------------------------------------------------------------------------------

function insertAfterLines(source: string, inserts: Record<number, string>): string {
  const out: string[] = inserts[0] !== undefined ? [inserts[0]] : []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (inserts[i + 1] !== undefined) out.push(inserts[i + 1])
  })
  return out.join('\n')
}

// 컨텍스트 안에서 실행되는 탐침 함수. spec(변수·카드)과 roots(변수 이름 → 실제 값)를 받아
// 카드를 실제 객체에 동일성으로 대응시키고(변수, Object.prototype·Function.prototype, [[Prototype]], 데이터 프로퍼티 값),
// 카드와 실제 객체를 비교한 불일치 목록과 탐색 경로를 JSON 문자열로 돌려준다. 접근자 프로퍼티의 값은 읽지 않는다(서술자만).
const PROBE_FN = `function (spec, roots, lookup, fname) {
  const errors = [];
  const real = new Map();
  const isObj = (v) => (typeof v === 'object' && v !== null) || typeof v === 'function';
  const idOf = (o) => { for (const [id, r] of real) if (r === o) return id; return null; };
  let progress = false;
  const link = (id, o, why) => {
    if (!isObj(o)) { errors.push(why + ': ' + id + '에 대응하는 값이 객체가 아님'); return; }
    if (real.has(id)) { if (real.get(id) !== o) errors.push(why + ': ' + id + '가 서로 다른 두 객체에 대응'); return; }
    const other = idOf(o);
    if (other !== null) { errors.push(why + ': ' + id + '와 ' + other + '가 같은 객체에 대응'); return; }
    real.set(id, o); progress = true;
  };
  const builtins = { 'Object.prototype': Object.prototype, 'Function.prototype': Function.prototype };
  for (const c of spec.objects) if (c.builtin) link(c.id, builtins[c.id], '내장 ' + c.id);
  for (const b of spec.bindings) if (b.value.kind === 'ref') link(b.value.id, roots[b.name], '변수 ' + b.name);
  do {
    progress = false;
    for (const c of spec.objects) {
      const o = real.get(c.id);
      if (!o) continue;
      if (c.proto.kind === 'ref') link(c.proto.id, Object.getPrototypeOf(o), c.id + '의 [[Prototype]]');
      for (const pr of c.props) {
        if (pr.value.kind !== 'ref') continue;
        const d = Object.getOwnPropertyDescriptor(o, pr.key);
        if (d && 'value' in d) link(pr.value.id, d.value, c.id + '.' + pr.key);
      }
    }
  } while (progress);
  for (const c of spec.objects) if (!real.has(c.id)) errors.push(c.id + ': 실제 객체와 대응하지 못함');
  const val = (v) => ({ type: v === null ? 'null' : typeof v, display: typeof v === 'string' ? "'" + v + "'" : String(v) });
  for (const c of spec.objects) {
    const o = real.get(c.id);
    if (!o) continue;
    const p = Object.getPrototypeOf(o);
    if (c.proto.kind === 'null' && p !== null) errors.push(c.id + ': [[Prototype]]이 null이 아님');
    if (c.proto.kind === 'ref' && p !== real.get(c.proto.id)) errors.push(c.id + ': [[Prototype]]이 ' + c.proto.id + '가 아님');
    if (c.proto.kind === 'omitted' && p !== Function.prototype) errors.push(c.id + ': [[Prototype]]이 Function.prototype이 아님');
    const keys = Reflect.ownKeys(o).filter((k) => typeof k === 'string');
    if (c.omittedNote === undefined) {
      if (JSON.stringify(keys) !== JSON.stringify(c.props.map((x) => x.key))) errors.push(c.id + ': 자기 프로퍼티 키 ' + JSON.stringify(keys));
    } else {
      let last = -1;
      for (const pr of c.props) {
        const j = keys.indexOf(pr.key);
        if (j < 0) errors.push(c.id + '.' + pr.key + ': 자기 프로퍼티가 아님');
        else { if (j <= last) errors.push(c.id + '.' + pr.key + ': 순서 다름'); last = j; }
      }
    }
    for (const pr of c.props) {
      const d = Object.getOwnPropertyDescriptor(o, pr.key);
      if (!d) continue;
      const name = c.id + '.' + pr.key;
      if (pr.note === 'setter') {
        if ('value' in d) errors.push(name + ': 접근자가 아님');
      } else {
        if (!('value' in d)) { errors.push(name + ': 데이터 프로퍼티가 아님'); continue; }
        if (d.writable !== (pr.note !== 'readonly')) errors.push(name + ': writable ' + d.writable);
        if (pr.value.kind === 'ref') { if (d.value !== real.get(pr.value.id)) errors.push(name + ': 값이 ' + pr.value.id + '가 아님'); }
        else { const v = val(d.value); if (v.type !== pr.value.type || v.display !== pr.value.display) errors.push(name + ': 값 ' + JSON.stringify(v)); }
      }
      if (d.enumerable !== (pr.note !== 'hidden')) errors.push(name + ': enumerable ' + d.enumerable);
    }
  }
  let result = null;
  if (lookup) {
    const start = real.get(lookup.startId);
    if (lookup.kind === 'instanceof') {
      const F = roots[fname];
      const target = F.prototype;
      if (target !== real.get(lookup.targetId)) errors.push('targetId가 ' + fname + '.prototype과 다름');
      const path = [];
      let end = 'null';
      for (let o = Object.getPrototypeOf(start); o !== null; o = Object.getPrototypeOf(o)) {
        const match = o === target;
        path.push({ id: idOf(o), match });
        if (match) { end = 'match'; break; }
      }
      result = { path, end, outcome: String(start instanceof F) };
    } else {
      const path = [];
      let end = 'null';
      for (let o = start; o !== null; o = Object.getPrototypeOf(o)) {
        const found = Object.hasOwn(o, lookup.key);
        path.push({ id: idOf(o), found });
        if (found) { end = 'found'; break; }
      }
      result = { path, end };
    }
  }
  return JSON.stringify({ errors, result });
}`

// [시나리오 id, 단계(0부터)] — 모든 단계를 탐침으로 대조한다.
const stepPoints: [string, number][] = scenarios.flatMap((s) =>
  s.steps.map((_, i): [string, number] => [s.id, i]),
)

// 탐침 한 번: afterLine 뒤(0이면 맨 앞)에서 state의 카드·lookup을 실제 실행 값과 대조한다.
function probeAt(
  id: string,
  state: ProtoState,
  lookup: Lookup | null,
  afterLine: number,
  expectedOutput: string[],
) {
  const rootNames = state.bindings
    .filter((b) => isRefValue(b.value))
    .map((b) => `${JSON.stringify(b.name)}: ${b.name}`)
  const fname =
    lookup?.kind === 'instanceof' && lookup.targetId === 'Object.prototype' ? 'Object' : 'Book'
  const rootsExpr = `{ ${[...rootNames, 'Object: Object'].join(', ')} }`
  const spec = { bindings: state.bindings, objects: state.objects }
  const call = `__snap((${PROBE_FN})(${JSON.stringify(spec)}, ${rootsExpr}, ${JSON.stringify(lookup)}, ${JSON.stringify(fname)}));`

  const out: string[] = []
  const snaps: { json: string; output: string[] }[] = []
  const sandbox = {
    console: { log: (...args: unknown[]) => out.push(args.map(String).join(' ')) },
    __snap: (json: string) => snaps.push({ json, output: [...out] }),
  }
  runInNewContext(insertAfterLines(sourceOf(id), { [afterLine]: call }), sandbox, { timeout: 2000 })

  expect(snaps, '탐침 실행 횟수').toHaveLength(1)
  const probed = JSON.parse(snaps[0].json) as {
    errors: string[]
    result: { path: unknown[]; end: string; outcome?: string } | null
  }
  expect(probed.errors, '카드와 실제 객체의 불일치').toEqual([])
  expect(snaps[0].output, '그 시점의 콘솔 출력').toEqual(expectedOutput)
  // 탐침을 끼운 코드의 최종 출력이 원본과 같다
  expect(out).toEqual(exampleOf(id).expectedOutput)

  if (lookup === null) {
    expect(probed.result).toBeNull()
  } else if (lookup.kind === 'instanceof') {
    expect(probed.result).toEqual({ path: lookup.path, end: lookup.end, outcome: lookup.outcome })
  } else {
    expect(probed.result).toEqual({ path: lookup.path, end: lookup.end })
  }
}

describe('시나리오 스냅샷·경로 대조 (예제를 실제로 실행한 값과 비교)', () => {
  it.each(stepPoints)('%s 단계 %i', (id, index) => {
    const scenario = scenarios.find((s) => s.id === id)!
    const step = scenario.steps[index]
    const lookup = step.state.lookup
    if (lookup?.kind === 'set') {
      // set은 대입 직전 체인을 보여 주므로 그 줄 앞(앞 단계의 상태·출력)에서 경로를 대조하고,
      // 대입 뒤 상태는 그 줄 뒤에서 따로 대조한다.
      const prev = scenario.steps[index - 1]
      probeAt(id, prev.state, lookup, step.line!.from - 1, prev.output ?? [])
      probeAt(id, step.state, null, step.line!.to, step.output ?? [])
    } else {
      probeAt(id, step.state, lookup, index === 0 ? 0 : step.line!.to, step.output ?? [])
    }
  })
})
