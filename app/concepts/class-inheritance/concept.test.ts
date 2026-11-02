import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import {
  scenarios,
  type Frame,
  type InheritState,
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

describe('본문 주장 검증', () => {
  it('기반 클래스의 필드는 생성자 본문보다 먼저 초기화되고, 원시 값 return은 무시된다', () => {
    expect(
      runInNewContext(
        'class B { x = 1; constructor() { this.seen = this.x; return 5 } }; var b = new B(); [b.seen, b instanceof B].join(" ")',
      ),
    ).toBe('1 true')
  })

  it('파생 생성자가 객체를 return하면 super()를 부르지 않아도 오류 없이 그 객체가 결과다', () => {
    expect(
      runInNewContext(
        'class B {}; class D extends B { constructor() { return { ok: 1 } } }; JSON.stringify(new D())',
      ),
    ).toBe('{"ok":1}')
  })

  it('생성자이지만 prototype 프로퍼티가 없는 bind 함수를 extends하면 TypeError다', () => {
    expect(runInNewContext('typeof new ((function F() {}).bind(null))()')).toBe('object')
    expect(errorNameOf('class X extends (function F() {}).bind(null) {}')).toBe('TypeError')
  })

  it('super.method()는 HomeObject의 그때의 [[Prototype]]에서 찾는다', () => {
    expect(
      runInNewContext(
        'class Parent { who() { return "Parent" } }; class Child extends Parent { who() { return super.who() + ">Child" } }; Object.setPrototypeOf(Child.prototype, { who() { return "Q" } }); new Child().who()',
      ),
    ).toBe('Q>Child')
  })

  it('super()는 호출 시점의 생성자 쪽 [[Prototype]]을 부모 생성자로 쓴다', () => {
    expect(
      runInNewContext(
        'class A { constructor() { this.from = "A" } }; class O { constructor() { this.from = "O" } }; class D extends A { constructor() { super() } }; Object.setPrototypeOf(D, O); new D().from',
      ),
    ).toBe('O')
  })

  it('기본 생성자는 명시적 super(...args)와 달리 배열의 반복자를 호출하지 않는다', () => {
    const patch =
      'Array.prototype[Symbol.iterator] = function () { throw new Error("iter") }; class B { constructor(a) { this.a = a } };'
    expect(
      runInNewContext(
        patch +
          'class E extends B { constructor(...args) { super(...args) } }; try { new E(1); "no error" } catch (e) { e.message }',
      ),
    ).toBe('iter')
    expect(runInNewContext(patch + 'class F extends B {}; new F(1).a')).toBe(1)
  })

  it('기본 생성자를 쓰는 클래스도 String()은 클래스 소스를 돌려주고, 화살표 함수를 bind한 함수는 생성자가 아니다', () => {
    expect(runInNewContext('class Animal {}; class Cat extends Animal {}; String(Cat)')).toBe(
      'class Cat extends Animal {}',
    )
    expect(errorNameOf('var b = (() => {}).bind(); new b()')).toBe('TypeError')
  })

  it('기본 생성자는 받은 인수를 그대로 부모 생성자에 넘긴다', () => {
    expect(
      jsonOf(
        'class A { constructor(...a) { this.a = a; } } class B extends A {} JSON.stringify(new B(1, "x").a)',
      ),
    ).toEqual([1, 'x'])
  })

  it('기본 생성자도 new.target을 그대로 넘긴다: 부모 생성자의 new.target은 new로 부른 자식 클래스다', () => {
    expect(
      runInNewContext(
        'let t; class A { constructor() { t = new.target; } } class B extends A {} new B(); t === B',
      ),
    ).toBe(true)
  })

  it('두 번째 super()는 부모 생성자가 다시 실행된 뒤 ReferenceError를 던진다', () => {
    expect(
      runInNewContext(
        'let n = 0; let name = null; class Base { constructor() { n++; } } class Twice extends Base { constructor() { super(); super(); } } try { new Twice(); } catch (e) { name = e.name; } n + ":" + name',
      ),
    ).toBe('2:ReferenceError')
  })

  it('super()를 부르지 않고 끝나는 파생 생성자는 ReferenceError다 (부모 생성자는 실행되지 않는다)', () => {
    expect(
      runInNewContext(
        'let n = 0; let name = null; class Base { constructor() { n++; } } class NoSuper extends Base { constructor() {} } try { new NoSuper(); } catch (e) { name = e.name; } n + ":" + name',
      ),
    ).toBe('0:ReferenceError')
  })

  it('super() 전에 this를 쓰면 ReferenceError이고 부모 생성자는 실행되지 않으며 객체도 만들어지지 않는다', () => {
    expect(
      runInNewContext(
        'let n = 0; let name = null; class Animal { constructor() { n++; } } class Dog extends Animal { constructor() { this.kind = "dog"; super(); } } try { new Dog(); } catch (e) { name = e.name; } n + ":" + name',
      ),
    ).toBe('0:ReferenceError')
    expect(errorNameOf(readExample('this-before-super.js'))).toBeNull() // 오류는 try/catch로 잡혀 출력된다
  })

  it('객체는 기본 클래스 생성자 안에서 만들어지고 그 프로토타입은 newTarget의 prototype이다', () => {
    expect(
      runInNewContext(
        `const seen = [];
class Animal { constructor() { seen.push(Object.getPrototypeOf(this) === Dog.prototype, Object.getPrototypeOf(this) === Animal.prototype, new.target === Dog); this.self = this; } }
class Dog extends Animal { constructor() { super(); seen.push(this === this.self); } }
const pet = new Dog();
seen.push(Object.getPrototypeOf(pet) === Dog.prototype);
seen.join()`,
      ),
    ).toBe('true,false,true,true,true')
  })

  it('파생 클래스의 this는 부모 생성자가 만든 그 객체다 (super() 반환값이 this에 바인딩된다)', () => {
    expect(
      runInNewContext(
        'let inBase; class A { constructor() { inBase = this; } } class B extends A { constructor() { super(); this.same = this === inBase; } } new B().same',
      ),
    ).toBe(true)
  })

  it('extends null의 생성자 쪽 [[Prototype]]은 Function.prototype이고 prototype의 [[Prototype]]은 null이다', () => {
    expect(
      runInNewContext(
        'const C = class extends null {}; [Object.getPrototypeOf(C) === Function.prototype, Object.getPrototypeOf(C.prototype)].join()',
      ),
    ).toBe('true,')
  })

  it('extends가 없는 클래스는 생성자 쪽이 Function.prototype, prototype 쪽이 Object.prototype이다', () => {
    expect(
      runInNewContext(
        'class A {} [Object.getPrototypeOf(A) === Function.prototype, Object.getPrototypeOf(A.prototype) === Object.prototype].join()',
      ),
    ).toBe('true,true')
  })

  it('extends가 만드는 두 체인: 생성자 쪽은 부모 클래스, prototype 쪽은 부모의 prototype이다', () => {
    expect(
      runInNewContext(
        'class A {} class B extends A {} [Object.getPrototypeOf(B) === A, Object.getPrototypeOf(B.prototype) === A.prototype].join()',
      ),
    ).toBe('true,true')
  })

  it('field-order: 부모(Base) 생성자 본문에서는 Object.keys(this)에 label이 없고, 생성이 끝나면 있다', () => {
    const result = jsonOf(`let inBase;
class Base { constructor() { inBase = Object.keys(this); } }
class Derived extends Base { label = 'derived'; }
const d = new Derived();
JSON.stringify({ inBase, after: Object.keys(d) })`)
    expect(result).toEqual({ inBase: [], after: ['label'] })
  })

  it('명시한 파생 생성자에서도 필드는 super()가 돌아온 뒤에 초기화된다', () => {
    expect(
      jsonOf(
        `let after; class Base {} class D extends Base { label = 1; constructor() { super(); after = Object.keys(this); } } new D(); JSON.stringify(after)`,
      ),
    ).toEqual(['label'])
  })

  it('super.speak()를 부를 때 this는 인스턴스 그대로다 (부모 prototype의 메서드를 찾지만 this가 부모 객체가 되지 않는다)', () => {
    expect(
      runInNewContext(
        'let seen; class Animal { speak() { seen = this; return 1; } } class Dog extends Animal { speak() { return super.speak(); } } const pet = new Dog(); pet.speak(); seen === pet && Object.getPrototypeOf(seen) === Dog.prototype',
      ),
    ).toBe(true)
  })

  it('super.speak()는 부모 prototype의 메서드를 찾는다 (자식의 오버라이드가 아니다)', () => {
    expect(
      runInNewContext(
        'class Animal { speak() { return "A"; } } class Dog extends Animal { speak() { return "D"; } call() { return super.speak(); } } new Dog().call() + new Dog().speak()',
      ),
    ).toBe('AD')
  })

  it('this.describe()처럼 부모 생성자 안에서 부른 메서드는 인스턴스의 프로토타입 체인에서 정해진다 (오버라이드가 선택된다)', () => {
    expect(runExample(readExample('field-order.js')).length).toBe(2)
    expect(
      runInNewContext(
        'class B { constructor() { this.r = this.f(); } f() { return "base"; } } class D extends B { f() { return "derived"; } } new D().r',
      ),
    ).toBe('derived')
  })

  it('super-method: pet은 speak를 자기 프로퍼티로 갖지 않고 Dog.prototype이 갖는다', () => {
    expect(runExample(readExample('super-method.js'))[1]).toBe('false true')
  })

  it.each(concept.examples)(
    '$file: 실제 실행 결과가 expectedOutput과 같다',
    ({ file, expectedOutput }) => {
      expect(runExample(readExample(file))).toEqual(expectedOutput)
    },
  )
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 단계 구조(참조, changed·created = 실제 변화, 객체 생성 위치, this 상태, 필드 시점, 찾기)
// + 예제에 탐침 코드를 끼워 컨텍스트 안에서 얻은 실제 값과의 대조

const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const sourceOf = (id: string) => readExample(exampleOf(id).file)
const scenarioById = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 불변식', () => {
  it('시나리오 id와 exampleId가 meta.examples의 id와 일치한다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'construct-derived',
      'this-before-super',
      'super-method',
      'field-order',
    ])
    for (const s of scenarios) expect(s.exampleId).toBe(s.id)
  })

  it.each(scenarios)('$id: 공통 불변식', (scenario) => {
    const example = exampleOf(scenario.exampleId)
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('시나리오별 단계 수', () => {
    expect(Object.fromEntries(scenarios.map((s) => [s.id, s.steps.length]))).toEqual({
      'construct-derived': 12,
      'this-before-super': 7,
      'super-method': 12,
      'field-order': 13,
    })
  })

  it.each(scenarios)('$id: 0번 단계는 코드 줄 없이 빈 상태다', (s) => {
    expect(s.steps[0].line).toBeUndefined()
    expect(s.steps[0].state).toEqual({
      classes: [],
      frames: [],
      objects: [],
      bindings: [],
      lookup: null,
      error: null,
    })
  })

  it.each(scenarios)('$id: 설명에 금지어(피동 표현)가 없다', (s) => {
    for (const step of s.steps) {
      expect(step.title + step.explanation).not.toContain('찾' + '히')
    }
  })
})

const emptyState: InheritState = {
  classes: [],
  frames: [],
  objects: [],
  bindings: [],
  lookup: null,
  error: null,
}
const isRef = (v: unknown): v is ObjectRef =>
  typeof v === 'object' && v !== null && 'kind' in (v as object)
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const boxOf = (state: InheritState, id: string) => state.objects.find((o) => o.id === id)
const classOf = (state: InheritState, name: string) => state.classes.find((c) => c.name === name)
const top = (frames: Frame[]) => frames[frames.length - 1]
const hasBase = (frames: Frame[]) => frames.some((f) => f.kind === 'base')

describe('시나리오 구조', () => {
  it.each(scenarios)('$id: 참조는 존재하는 객체를 가리키고 id·이름이 겹치지 않는다', (s) => {
    s.steps.forEach((step, i) => {
      const { state } = step
      const where = `${s.id} 단계 ${i + 1}`
      const ids = state.objects.map((o) => o.id)
      expect(new Set(ids).size, `${where}: 객체 id 중복`).toBe(ids.length)
      expect(new Set(state.bindings.map((b) => b.name)).size, `${where}: 변수 이름 중복`).toBe(
        state.bindings.length,
      )
      expect(new Set(state.classes.map((c) => c.name)).size, `${where}: 클래스 이름 중복`).toBe(
        state.classes.length,
      )
      for (const o of state.objects)
        expect(new Set(o.props.map((p) => p.key)).size, `${where}: 프로퍼티 키 중복`).toBe(
          o.props.length,
        )
      const refs: unknown[] = [
        ...state.bindings.map((b) => b.value),
        ...state.frames.map((f) => f.thisStatus),
        state.lookup?.thisValue,
      ]
      for (const r of refs)
        if (isRef(r)) expect(ids, `${where}: 없는 객체 ${r.id}를 가리킴`).toContain(r.id)
    })
  })

  it.each(scenarios)('$id: changed·created 표시는 이전 단계와의 실제 차이와 같다', (s) => {
    let prev = emptyState
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const cur = step.state
      for (const c of cur.classes)
        expect(c.created === true, `${where}: 클래스 ${c.name}의 created`).toBe(
          !classOf(prev, c.name),
        )
      for (const b of cur.bindings) {
        const before = prev.bindings.find((x) => x.name === b.name)
        const differs = !before || !sameJson(before.value, b.value)
        expect(b.changed === true, `${where}: 변수 ${b.name}의 changed`).toBe(differs)
      }
      for (const o of cur.objects) {
        const before = boxOf(prev, o.id)
        expect(o.created === true, `${where}: 객체 ${o.id}의 created`).toBe(!before)
        for (const p of o.props) {
          const old = before?.props.find((x) => x.key === p.key)
          const differs = !old || !sameJson(old.value, p.value)
          expect(p.changed === true, `${where}: ${o.id}.${p.key}의 changed`).toBe(differs)
        }
      }
      // 클래스·변수·객체·프로퍼티가 사라지지 않고, 객체의 proto는 바뀌지 않는다
      for (const c of prev.classes) expect(classOf(cur, c.name)).toBeDefined()
      for (const b of prev.bindings) expect(cur.bindings.some((x) => x.name === b.name)).toBe(true)
      for (const o of prev.objects) {
        const now = boxOf(cur, o.id)
        expect(now, `${where}: 객체 ${o.id}가 사라짐`).toBeDefined()
        expect(now!.proto, `${where}: 객체 ${o.id}의 proto가 바뀜`).toBe(o.proto)
        for (const p of o.props) expect(now!.props.some((x) => x.key === p.key)).toBe(true)
      }
      prev = cur
    })
  })

  it.each(scenarios)('$id: frame은 평가된 클래스와 일치하고 this 상태가 kind에 맞다', (s) => {
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const { state } = step
      state.frames.forEach((f, fi) => {
        const c = classOf(state, f.fn)
        expect(c, `${where}: 평가되지 않은 클래스 ${f.fn}의 frame`).toBeDefined()
        expect(classOf(state, f.newTarget), `${where}: newTarget ${f.newTarget}`).toBeDefined()
        // 기본 클래스 생성자만 base, 생성자를 직접 쓴 파생 클래스는 derived, 생략하면 default-derived
        if (c!.kind === 'base') expect(f.kind).toBe('base')
        else expect(f.kind).toBe(c!.hasOwnConstructor ? 'derived' : 'default-derived')
        if (f.kind === 'base') {
          expect(isRef(f.thisStatus), `${where}: base frame은 객체를 this로 가진다`).toBe(true)
          expect(fi, `${where}: base frame은 맨 위에만 있다`).toBe(state.frames.length - 1)
        }
        if (f.kind === 'default-derived')
          expect(f.thisStatus, `${where}: 기본 생성자에는 this 바인딩이 없다`).toBe('none')
        if (f.kind === 'derived')
          expect(
            f.thisStatus === 'none',
            `${where}: 직접 쓴 파생 생성자에는 this 바인딩이 있다`,
          ).toBe(false)
        // 인수와 newTarget은 부모 생성자로 그대로 전달된다 (이 시나리오들은 인수를 그대로 넘기는 예제다)
        expect(f.newTarget, `${where}: frame의 newTarget이 다름`).toBe(state.frames[0].newTarget)
        expect(f.args, `${where}: frame의 인수가 다름`).toEqual(state.frames[0].args)
      })
    })
  })

  it.each(scenarios)(
    '$id: 객체는 base frame이 새로 push된 단계에서만 만들어지고 proto는 newTarget.prototype이다',
    (s) => {
      let prev = emptyState
      s.steps.forEach((step, i) => {
        const where = `${s.id} 단계 ${i + 1}`
        const cur = step.state
        const created = cur.objects.filter((o) => !boxOf(prev, o.id))
        const freshBase =
          cur.frames.length === prev.frames.length + 1 && top(cur.frames)?.kind === 'base'
        // base frame이 새로 push되면 같은 단계에서 객체가 만들어진다 (OrdinaryCreateFromConstructor)
        expect(created.length, `${where}: base frame push ↔ 객체 생성`).toBe(freshBase ? 1 : 0)
        for (const o of created) {
          const t = top(cur.frames)
          expect(t.kind, `${where}: 객체는 base frame에서 만들어진다`).toBe('base')
          expect(t.thisStatus, `${where}: base frame의 this가 새 객체`).toEqual({
            kind: 'object',
            id: o.id,
          })
          expect(o.proto, `${where}: proto는 newTarget의 prototype`).toBe(
            `${t.newTarget}.prototype`,
          )
          expect(o.props, `${where}: 만들어진 직후에는 자기 프로퍼티가 없다`).toEqual([])
        }
        prev = cur
      })
    },
  )

  it.each(scenarios)('$id: 파생 frame의 this는 super()가 돌아오는 단계에서 초기화된다', (s) => {
    let prev = emptyState
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const cur = step.state
      cur.frames.forEach((f, idx) => {
        if (f.kind !== 'derived') return
        const before = prev.frames[idx]?.fn === f.fn ? prev.frames[idx] : undefined
        if (f.thisStatus === 'uninitialized') {
          // 한번 초기화된 this가 다시 초기화 전으로 돌아가지 않는다
          if (before) expect(before.thisStatus, `${where}: this가 되돌아감`).toBe('uninitialized')
          // 파생 frame이 맨 위인 동안에는 아직 만들어진 객체가 없다
          if (idx === cur.frames.length - 1)
            expect(cur.objects, `${where}: this가 초기화 전인데 객체가 있음`).toEqual([])
        } else {
          expect(isRef(f.thisStatus)).toBe(true)
          if (before && before.thisStatus === 'uninitialized') {
            // 초기화 전 → 객체: 위에 있던 base frame이 돌아온 바로 그 단계, 그 frame이 만든 객체
            const popped = prev.frames[idx + 1]
            expect(cur.frames.length, `${where}: super()가 돌아온 단계`).toBe(idx + 1)
            expect(prev.frames.length, `${where}: 부모 frame이 있었음`).toBe(idx + 2)
            expect(popped.kind).toBe('base')
            expect(f.thisStatus, `${where}: this는 부모가 만든 객체`).toEqual(popped.thisStatus)
          } else {
            // 이미 초기화된 상태가 아니라면 처음부터 객체였을 수 없다
            expect(before, `${where}: 초기화 전을 거치지 않음`).toBeDefined()
          }
        }
      })
      prev = cur
    })
  })

  it.each(scenarios)('$id: 파생 클래스의 필드는 부모 생성자가 돌아온 뒤에만 객체에 있다', (s) => {
    const fields = (st: InheritState) => st.classes.flatMap((c) => c.fields)
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const { state } = step
      for (const o of state.objects)
        for (const key of fields(state)) {
          if (!o.props.some((p) => p.key === key)) continue
          expect(hasBase(state.frames), `${where}: base frame이 있는 동안 필드 ${key}가 보임`).toBe(
            false,
          )
          // 직접 쓴 파생 frame이 있다면 그 this는 이미 초기화되어 있다
          for (const f of state.frames.filter((x) => x.kind === 'derived'))
            expect(isRef(f.thisStatus), `${where}: this 초기화 전에 필드가 보임`).toBe(true)
        }
    })
    // 필드가 있는 클래스를 쓰는 시나리오는 마지막에 모든 필드가 객체에 있다
    const last = s.steps[s.steps.length - 1].state
    for (const key of fields(last)) expect(last.objects[0].props.map((p) => p.key)).toContain(key)
  })

  it.each(scenarios)('$id: 메서드 찾기의 this는 언제나 그 인스턴스이고 찾는 경로가 맞다', (s) => {
    s.steps.forEach((step, i) => {
      const where = `${s.id} 단계 ${i + 1}`
      const { state } = step
      const lk = state.lookup
      if (!lk) return
      expect(state.objects, `${where}: 인스턴스가 하나`).toHaveLength(1)
      expect(lk.thisValue, `${where}: this가 인스턴스가 아님`).toEqual({
        kind: 'object',
        id: state.objects[0].id,
      })
      const method = /\.(\w+)\(\)$/.exec(lk.expr)![1]
      const inst = state.objects[0]
      // 찾는 경로: 시작점 → [[Prototype]] 체인 (이름 문자열 기준)
      const protoChain = (name: string): string[] => {
        const out: string[] = []
        let cur: string | null = name
        while (cur) {
          out.push(cur)
          const owner = state.classes.find((c) => `${c.name}.prototype` === cur)
          cur = owner ? owner.protoParent : null
        }
        return out
      }
      const startsAtInstance = lk.startAt === inst.label
      const path = startsAtInstance
        ? [inst.label, ...protoChain(inst.proto)]
        : protoChain(lk.startAt)
      expect(path, `${where}: foundIn이 경로에 있음`).toContain(lk.foundIn)
      const holderOf = (name: string) =>
        name === inst.label
          ? inst.props.some((p) => p.key === method)
          : state.classes.find((c) => `${c.name}.prototype` === name)?.methods.includes(method)
      expect(holderOf(lk.foundIn), `${where}: foundIn에 메서드가 있음`).toBe(true)
      // 가장 먼저 만난 곳이 foundIn이어야 한다
      for (const before of path.slice(0, path.indexOf(lk.foundIn)))
        expect(holderOf(before) ?? false, `${where}: ${before}에 이미 있음`).toBe(false)
      if (lk.expr.startsWith('super.')) {
        // super는 HomeObject의 [[Prototype]]에서 찾기 시작한다: via가 가리킨 prototype의 protoParent
        expect(lk.via, `${where}: super 찾기에는 via가 있다`).toBeDefined()
        const home = state.classes.find((c) => lk.via!.includes(`${c.name}.prototype`))
        expect(home, `${where}: via의 HomeObject`).toBeDefined()
        expect(lk.startAt, `${where}: super의 시작점`).toBe(home!.protoParent)
        expect(startsAtInstance).toBe(false)
      } else {
        expect(lk.via).toBeUndefined()
      }
    })
  })

  it.each(scenarios)('$id: 마지막 단계에는 진행 중인 호출이 없다', (s) => {
    expect(s.steps[s.steps.length - 1].state.frames).toEqual([])
  })

  it('this-before-super: 객체는 한 번도 만들어지지 않고 Animal frame도 없다', () => {
    const s = scenarioById('this-before-super')
    s.steps.forEach((step, i) => {
      expect(step.state.objects, `단계 ${i + 1}`).toEqual([])
      expect(step.state.frames.some((f) => f.fn === 'Animal')).toBe(false)
      expect(step.state.bindings).toEqual([])
    })
  })

  it('this-before-super: ReferenceError는 8번 줄에서 시작되고 Dog frame의 this는 초기화 전이다', () => {
    const s = scenarioById('this-before-super')
    const errorSteps = s.steps.map((st, i) => [i, st.state.error] as const).filter(([, e]) => e)
    expect(errorSteps.map(([i]) => i)).toEqual([4, 5, 6])
    for (const [, e] of errorSteps) expect(e!.name).toBe('ReferenceError')
    expect(s.steps[4].line).toEqual({ from: 8, to: 8 })
    expect(s.steps[4].state.frames).toEqual([
      {
        fn: 'Dog',
        kind: 'derived',
        newTarget: 'Dog',
        args: [{ type: 'string', display: 'Rex' }],
        thisStatus: 'uninitialized',
      },
    ])
    expect(readExample('this-before-super.js').split('\n')[7]).toBe("    this.kind = 'dog';")
  })

  it.each(scenarios.filter((s) => s.id !== 'this-before-super'))('$id: error가 없다', (s) => {
    for (const step of s.steps) expect(step.state.error).toBeNull()
  })

  it('super-method: 두 lookup은 pet.speak()(Dog.prototype)와 super.speak()(Animal.prototype)다', () => {
    const lookups = scenarioById('super-method')
      .steps.map((st) => st.state.lookup)
      .filter((l) => l !== null)
    expect(lookups.map((l) => [l.expr, l.startAt, l.foundIn])).toEqual([
      ['pet.speak()', '객체 A', 'Dog.prototype'],
      ['super.speak()', 'Animal.prototype', 'Animal.prototype'],
      ['super.speak()', 'Animal.prototype', 'Animal.prototype'],
    ])
  })

  it('super-method, field-order: Dog·Derived 기본 생성자 frame은 this 바인딩이 없다', () => {
    for (const id of ['super-method', 'field-order']) {
      const kinds = scenarioById(id).steps.flatMap((st) =>
        st.state.frames.filter((f) => f.kind !== 'base').map((f) => [f.kind, f.thisStatus]),
      )
      expect(kinds.length).toBeGreaterThan(0)
      for (const k of kinds) expect(k).toEqual(['default-derived', 'none'])
    }
  })

  it('field-order: 필드 label은 Base 본문 단계에는 없고 Base 반환 뒤 필드 초기화 단계에서 생긴다', () => {
    const s = scenarioById('field-order')
    const labelSteps = s.steps
      .map((st, i) => [i, st.state.objects[0]?.props.some((p) => p.key === 'label')] as const)
      .filter(([, has]) => has)
      .map(([i]) => i)
    expect(labelSteps).toEqual([9, 10, 11, 12])
    for (const i of [4, 5, 6, 7]) expect(hasBase(s.steps[i].state.frames), `단계 ${i}`).toBe(true)
    expect(s.steps[9].line).toEqual({ from: 10, to: 10 })
    // 단계 9 직전(8)에서는 Base frame이 이미 돌아왔다
    expect(hasBase(s.steps[8].state.frames)).toBe(false)
    expect(s.steps[9].state.objects[0].props.find((p) => p.key === 'label')!.changed).toBe(true)
  })

  it('construct-derived: Dog frame의 this는 단계 4·5까지 초기화 전이고 단계 6부터 객체 A다', () => {
    const s = scenarioById('construct-derived')
    const dogThis = s.steps.map((st) => st.state.frames.find((f) => f.fn === 'Dog')?.thisStatus)
    expect(dogThis).toEqual([
      undefined,
      undefined,
      undefined,
      'uninitialized',
      'uninitialized',
      'uninitialized',
      { kind: 'object', id: 'a' },
      { kind: 'object', id: 'a' },
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    expect(s.steps[4].state.objects[0].proto).toBe('Dog.prototype')
  })
})

// --- 탐침 ---------------------------------------------------------------------------------------
// 예제의 정해진 줄 뒤에 탐침을 끼워 실행하고, 그 시점의 실제 값과 단계 상태를 비교한다.
//
// 탐침은 `this`가 초기화된 곳(기본 클래스 생성자 본문, super()가 돌아온 뒤의 파생 생성자 본문,
// 메서드 본문, 필드 초기화 식)이나 생성자 바깥에서만 끼운다.
// 파생 생성자에서 super() 전의 줄(construct-derived의 7번 줄 뒤 등)에는 끼우지 않는다. 그 줄에서는 this를 읽는 것 자체가
// ReferenceError이고, 이 개념의 요점이 바로 그 "아직 객체가 없음"이라 탐침 코드가 동작을 바꾸기 때문이다.
// 기본 생성자(생성자를 생략한 파생 클래스)에는 소스 코드가 없어 탐침을 끼울 줄이 없다.

function insertAfterLines(source: string, inserts: Record<number, string>): string {
  const out: string[] = []
  source.split('\n').forEach((line, i) => {
    out.push(line)
    if (inserts[i + 1] !== undefined) out.push(inserts[i + 1])
  })
  return out.join('\n')
}

type Snap = Record<string, unknown>

function runWithProbes(source: string, inserts: Record<number, string>) {
  const out: string[] = []
  const snaps: { snap: Snap; output: string[] }[] = []
  const sandbox = {
    console: { log: (...args: unknown[]) => out.push(args.map(String).join(' ')) },
    __snap: (json: string) => snaps.push({ snap: JSON.parse(json), output: [...out] }),
  }
  runInNewContext(insertAfterLines(source, inserts), sandbox, { timeout: 2000 })
  return { snaps, out }
}

// 컨텍스트 안에서 실행되는 탐침 식. 객체는 자기 프로퍼티(원시 값)만 읽는다.
// CLS는 그 단계까지 평가된 클래스 목록이고, protoName은 객체를 prototype 이름으로 바꾼다.
const helpers = (classNames: string[]) =>
  `const CLS = [${classNames.join(', ')}];` +
  `const val = (v) => v === undefined ? { type: 'undefined', display: 'undefined' } : { type: typeof v, display: String(v) };` +
  `const props = (o) => Object.keys(o).map((k) => ({ key: k, value: val(o[k]) }));` +
  `const protoName = (p) => { if (p === Object.prototype) return 'Object.prototype'; const c = CLS.find((x) => x.prototype === p); return c ? c.name + '.prototype' : '?'; };` +
  `const ctorName = (f) => { if (f === Function.prototype) return 'Function.prototype'; const c = CLS.find((x) => x === f); return c ? c.name : '?'; };` +
  `const desc = (v) => (typeof v === 'object' && v !== null) ? { props: props(v), proto: protoName(Object.getPrototypeOf(v)) } : val(v);` +
  `const classInfo = (c) => ({ name: c.name, ctorParent: ctorName(Object.getPrototypeOf(c)), protoParent: protoName(Object.getPrototypeOf(c.prototype)), methods: Object.getOwnPropertyNames(c.prototype).filter((k) => k !== 'constructor'), hasOwnConstructor: /\\bconstructor\\s*\\(/.test(Function.prototype.toString.call(c)) });` +
  `const holder = (start, key) => { for (let p = start; p !== null; p = Object.getPrototypeOf(p)) if (Object.prototype.hasOwnProperty.call(p, key)) return p === this ? '객체 A' : protoName(p); return null; };`

type Kind = 'outer' | 'ctor' | 'method' | 'field' | 'lookup' | 'catch'
type Extra = { start?: string; key?: string; thisIs?: string }

const probeCode = (expr: string, classNames: string[]) =>
  `__snap(JSON.stringify((() => {${helpers(classNames)} return ${expr}; })()));`

const probeExpr = (kind: Kind, state: InheritState, extra: Extra): string => {
  const bindings = `{ ${state.bindings.map((b) => `${b.name}: desc(${b.name})`).join(', ')} }`
  const base = `classes: CLS.map(classInfo), bindings: ${bindings}`
  switch (kind) {
    case 'outer':
      return `{ ${base} }`
    case 'catch':
      return `{ ${base}, error: e.name }`
    case 'ctor':
      return `{ ${base}, self: props(this), proto: protoName(Object.getPrototypeOf(this)), newTarget: new.target.name }`
    case 'method':
    case 'field':
      return `{ ${base}, self: props(this), proto: protoName(Object.getPrototypeOf(this)) }`
    case 'lookup': {
      const start = extra.start!
      const startAt = `(${start} === this ? '객체 A' : protoName(${start}))`
      return `{ ${base}, self: props(this), proto: protoName(Object.getPrototypeOf(this)), startAt: ${startAt}, foundIn: holder(${start}, '${extra.key}')${extra.thisIs ? `, thisIsInstance: this === ${extra.thisIs}` : ''} }`
    }
  }
}

type NormVal = { type: string; display: string }
const normVal = (v: Val): NormVal => ({ type: v.type, display: v.display })
const normProps = (o: ObjectBox) => o.props.map((p) => ({ key: p.key, value: normVal(p.value) }))

function expectedProbe(kind: Kind, state: InheritState, extra: Extra): Snap {
  const classes = state.classes.map((c) => ({
    name: c.name,
    ctorParent: c.ctorParent,
    protoParent: c.protoParent,
    methods: c.methods,
    hasOwnConstructor: c.hasOwnConstructor,
  }))
  const bindings = Object.fromEntries(
    state.bindings.map((b) => {
      if (isRef(b.value)) {
        const box = boxOf(state, b.value.id)!
        return [b.name, { props: normProps(box), proto: box.proto }]
      }
      return [b.name, normVal(b.value)]
    }),
  )
  const base: Snap = { classes, bindings }
  if (kind === 'outer') return base
  if (kind === 'catch') return { ...base, error: state.error!.name }
  const self = state.objects[0]
  const withSelf = { ...base, self: normProps(self), proto: self.proto }
  if (kind === 'ctor') return { ...withSelf, newTarget: top(state.frames).newTarget }
  if (kind === 'method' || kind === 'field') return withSelf
  return {
    ...withSelf,
    startAt: state.lookup!.startAt,
    foundIn: state.lookup!.foundIn,
    ...(extra.thisIs && { thisIsInstance: true }),
  }
}

// [시나리오 id, 단계(0부터), 탐침을 끼울 줄(afterLine), 종류, 추가 인수]
// 종류: 'outer' 바깥 줄(클래스·const 변수) / 'ctor' 기본 클래스 생성자 본문 또는 super() 뒤 파생 생성자 본문
// / 'method' 메서드 본문 / 'field' 필드 초기화 식(그 필드 줄 뒤에 필드를 하나 더 끼운다) / 'lookup' 메서드 본문 + 찾는 경로
// / 'catch' catch 블록 안
const snapshotPoints: [string, number, number, Kind, Extra?][] = [
  // construct-derived: 줄 1~5 Animal, 6~11 Dog, 12 new Dog, 13~15 출력
  ['construct-derived', 1, 5, 'outer'],
  ['construct-derived', 2, 11, 'outer'],
  ['construct-derived', 4, 2, 'ctor'], // Animal 생성자 본문 시작: 객체 A가 Dog.prototype으로 만들어진 직후
  ['construct-derived', 5, 3, 'ctor'],
  ['construct-derived', 6, 8, 'ctor'], // super(name) 뒤 Dog 본문: this가 초기화된 뒤
  ['construct-derived', 7, 9, 'ctor'],
  ['construct-derived', 8, 12, 'outer'],
  ['construct-derived', 9, 13, 'outer'],
  ['construct-derived', 10, 14, 'outer'],
  ['construct-derived', 11, 15, 'outer'],
  // this-before-super: 줄 1~5 Animal, 6~11 Dog, 12~16 try/catch
  ['this-before-super', 1, 5, 'outer'],
  ['this-before-super', 2, 11, 'outer'],
  ['this-before-super', 5, 14, 'catch'],
  ['this-before-super', 6, 15, 'catch'],
  // super-method: 줄 1~8 Animal(speak 5~7), 9~13 Dog(speak 10~12), 14 const pet, 15·16 출력
  ['super-method', 1, 8, 'outer'],
  ['super-method', 2, 13, 'outer'],
  ['super-method', 4, 2, 'ctor'], // 기본 생성자가 부른 Animal 생성자 본문 시작
  ['super-method', 5, 3, 'ctor'],
  ['super-method', 6, 14, 'outer'],
  ['super-method', 7, 10, 'lookup', { start: 'this', key: 'speak', thisIs: 'pet' }], // Dog.prototype.speak 본문 시작
  [
    'super-method',
    8,
    5,
    'lookup',
    { start: 'Object.getPrototypeOf(Dog.prototype)', key: 'speak', thisIs: 'pet' },
  ], // Animal.prototype.speak 본문 시작 (super.speak()로만 도달)
  [
    'super-method',
    9,
    5,
    'lookup',
    { start: 'Object.getPrototypeOf(Dog.prototype)', key: 'speak', thisIs: 'pet' },
  ], // 6번 줄(return)은 그 뒤에 끼울 수 없어 같은 시점(본문 시작)과 비교한다. 상태는 8단계와 같다.
  ['super-method', 10, 15, 'outer'],
  ['super-method', 11, 16, 'outer'],
  // field-order: 줄 1~8 Base(생성자 2~4), 9~14 Derived(필드 10), 15 const d, 16·17 출력
  ['field-order', 1, 8, 'outer'],
  ['field-order', 2, 14, 'outer'],
  ['field-order', 4, 2, 'ctor'],
  ['field-order', 5, 11, 'lookup', { start: 'this', key: 'describe' }], // Derived.prototype.describe 본문 시작
  ['field-order', 6, 11, 'lookup', { start: 'this', key: 'describe' }], // 12번 줄(return)은 뒤에 끼울 수 없어 같은 시점과 비교 (label 읽기는 별도 테스트)
  ['field-order', 7, 3, 'ctor'],
  ['field-order', 8, 3, 'ctor'], // Base 생성자 본문 끝(3번 줄 뒤) = Base가 돌아오기 직전. 단계 7과 같은 객체 상태
  ['field-order', 9, 10, 'field'], // label 필드 뒤에 둔 두 번째 필드 초기화 식에서 읽는다
  ['field-order', 10, 15, 'outer'],
  ['field-order', 11, 16, 'outer'],
  ['field-order', 12, 17, 'outer'],
]

// 탐침을 끼우지 않는 단계와 그 이유
const unprobed: Record<string, number[]> = {
  // 0: 실행 전. 3: 파생 생성자 본문 시작(this 초기화 전)
  'construct-derived': [0, 3],
  // 3·4: Dog 생성자 본문(this 초기화 전)
  'this-before-super': [0, 3, 4],
  // 3: 소스 코드가 없는 기본 생성자
  'super-method': [0, 3],
  'field-order': [0, 3],
}

describe('시나리오 스냅샷 대조 (예제를 실제로 실행한 값과 비교)', () => {
  it('탐침을 끼우지 않는 단계를 뺀 모든 단계가 표에 있고 겹치지 않는다', () => {
    for (const s of scenarios) {
      const probed = snapshotPoints.filter(([id]) => id === s.id).map(([, i]) => i)
      const skipped = unprobed[s.id]
      expect(
        [...probed, ...skipped].sort((a, b) => a - b),
        s.id,
      ).toEqual(s.steps.map((_, i) => i))
    }
  })

  it.each(snapshotPoints)('%s 단계 %i (줄 %i 뒤, %s)', (id, index, afterLine, kind, extra = {}) => {
    const scenario = scenarioById(id)
    const step = scenario.steps[index]
    const code = probeCode(
      probeExpr(kind, step.state, extra),
      step.state.classes.map((c) => c.name),
    )
    const { snaps, out } = runWithProbes(sourceOf(id), {
      [afterLine]: kind === 'field' ? `  __p = ${code}` : code,
    })
    expect(snaps, `줄 ${afterLine} 뒤 탐침 실행 횟수`).toHaveLength(1)
    expect(snaps[0].snap).toEqual(expectedProbe(kind, step.state, extra))
    expect(snaps[0].output, '그 시점의 콘솔 출력').toEqual(step.output ?? [])
    // 탐침을 끼운 코드의 최종 출력이 원본과 같다
    expect(out).toEqual(exampleOf(id).expectedOutput)
  })

  it('field-order 단계 6: this.label을 읽는 시점에 객체에 label이 없고 읽은 값은 undefined다', () => {
    const step = scenarioById('field-order').steps[6]
    expect(step.line).toEqual({ from: 12, to: 12 })
    expect(step.state.objects[0].props).toEqual([])
    const source = sourceOf('field-order').replace(
      "    return 'label=' + this.label;",
      `    ${probeCode(`{ hasLabel: 'label' in this, own: Object.keys(this), value: String(this.label) }`, [])}\n    return 'label=' + this.label;`,
    )
    expect(source).not.toBe(sourceOf('field-order'))
    const { snaps, out } = runWithProbes(source, {})
    expect(snaps).toHaveLength(1)
    expect(snaps[0].snap).toEqual({ hasLabel: false, own: [], value: 'undefined' })
    expect(snaps[0].output).toEqual([])
    expect(out).toEqual(exampleOf('field-order').expectedOutput)
  })

  it('field-order: Base 생성자 안의 this.describe는 Derived.prototype의 메서드다', () => {
    const source = sourceOf('field-order').replace(
      '    this.text = this.describe();',
      '    __snap(JSON.stringify(this.describe === Derived.prototype.describe));\n    this.text = this.describe();',
    )
    const { snaps } = runWithProbes(source, {})
    expect(snaps.map((s) => s.snap)).toEqual([true])
  })

  it('field-order: 클래스 Derived의 label 필드는 소스에서 11번 줄 앞(10번 줄)에 선언되어 있다', () => {
    expect(readExample('field-order.js').split('\n')[9]).toBe("  label = 'derived';")
    const derived = scenarioById('field-order').steps[2].state.classes[1]
    expect(derived.fields).toEqual(['label'])
  })
})
