import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { comparison } from './comparison'
import { concept } from './meta'

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
    ['메서드 축약의 중복 매개변수', '({ m(a, a) {} })'],
    ['화살표 함수의 중복 매개변수', '(x, x) => 1'],
    ['rest 파라미터 뒤의 매개변수', '(...a, b) => 1'],
    ['메서드가 아닌 일반 함수 안의 super', 'function f() { return super.x }'],
    ['sloppy function의 rest 파라미터와 중복 매개변수', 'function f(a, a, ...rest) {}'],
    ['sloppy function의 기본값과 중복 매개변수', 'function f(a, a = 1) {}'],
    ['괄호 없는 rest 파라미터 화살표 함수', 'var f = ...a => a'],
    ['괄호 없는 구조 분해 매개변수 화살표 함수', 'var f = {a} => a'],
  ])('%s는 스크립트를 실행하기 전에 SyntaxError다', (_name, source) => {
    expect(errorNameOf(source)).toBe('SyntaxError')
  })

  it('제너레이터 메서드와 async 제너레이터 메서드는 new로 부를 수 없지만 prototype 프로퍼티가 있다', () => {
    expect(
      runInNewContext(
        'var o = { *g() {}, async *ag() {} }; JSON.stringify([o.g.hasOwnProperty("prototype"), o.ag.hasOwnProperty("prototype")])',
      ),
    ).toBe('[true,true]')
    expect(errorNameOf('var o = { *g() {} }; new o.g()')).toBe('TypeError')
    expect(errorNameOf('var o = { async *ag() {} }; new o.ag()')).toBe('TypeError')
  })

  it('전역 화살표 함수에서 arguments를 읽으면 ReferenceError다', () => {
    expect(errorNameOf('var f = () => arguments; f()')).toBe('ReferenceError')
  })

  it('super로 찾은 메서드의 this는 [[HomeObject]]가 아니라 호출 시점의 this다', () => {
    expect(
      runInNewContext(
        'var base = { greet() { return this.name } }; var child = { name: "child", greet() { return super.greet() } }; Object.setPrototypeOf(child, base); var borrowed = { name: "borrowed", greet: child.greet }; borrowed.greet()',
      ),
    ).toBe('borrowed')
  })

  it('sloppy mode의 function은 중복 매개변수를 허용하고 뒤 인수를 쓴다', () => {
    expect(runInNewContext('function f(a, a) { return a } f(1, 2)')).toBe(2)
  })

  it('화살표 함수는 this를 만들 때 저장하지 않고 쓸 때 바깥에서 찾는다', () => {
    expect(
      runInNewContext(
        'class A {}; class B extends A { constructor() { var f = () => this; super(); this.ok = f() === this } }; new B().ok',
      ),
    ).toBe(true)
    expect(
      errorNameOf(
        'class A {}; class B extends A { constructor() { var f = () => this; f(); super() } }; new B()',
      ),
    ).toBe('ReferenceError')
  })
})

describe('비교표 근거', () => {
  const exampleIds = concept.examples.map((example) => example.id)

  it('표의 예제 id는 모두 meta.examples에 있다', () => {
    for (const row of comparison) {
      if (row.exampleId !== null) expect(exampleIds).toContain(row.exampleId)
    }
  })

  // 칸마다 새 컨텍스트에서 실행해 다른 칸의 상태에 의존하지 않는다.
  for (const row of comparison) {
    for (const [kind, cell] of [
      ['일반 함수', row.normal],
      ['메서드 축약', row.method],
      ['화살표 함수', row.arrow],
    ] as const) {
      it(`${row.aspect} / ${kind}: probe 결과가 표와 같다`, () => {
        let actual: string
        try {
          actual = String(runInNewContext(cell.probe))
        } catch (e) {
          actual = (e as Error).name
        }
        expect(actual).toBe(cell.expected)
      })
    }
  }
})
