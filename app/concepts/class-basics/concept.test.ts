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
    ['같은 스코프의 let과 클래스 이름 중복', 'let A; class A {}'],
    ['클래스 밖에서 private 필드 접근', 'class W { #b = 1 } var w = new W(); w.#b'],
    ['클래스 메서드의 중복 매개변수(strict)', 'class A { m(a, a) {} }'],
  ])('%s는 스크립트를 실행하기 전에 SyntaxError다', (_name, source) => {
    expect(errorNameOf(source)).toBe('SyntaxError')
  })

  it('클래스 본문 안에 있는 function 선언은 그 클래스의 private 이름을 쓸 수 있다', () => {
    expect(
      runInNewContext(
        'class A { #secret = 0; read() { return this.#secret } static make() { function F() { this.#secret = 1 } return F } }; var a = new A(); A.make().call(a); a.read()',
      ),
    ).toBe(1)
  })

  it('객체 리터럴의 메서드 정의도 생성자가 아니지만 열거는 된다', () => {
    expect(errorNameOf('new ({ make() {} }).make()')).toBe('TypeError')
    expect(runInNewContext('Object.keys({ hello() {} }).join()')).toBe('hello')
  })

  it('바깥 클래스 이름에 다시 대입해도 클래스 안의 이름은 원래 클래스를 가리킨다', () => {
    expect(
      runInNewContext(
        'class C { static who() { return typeof C } }; var who = C.who; C = 1; who() + " " + typeof C',
      ),
    ).toBe('function number')
  })

  it("'use strict' 스크립트에서는 꺼낸 생성자 함수 메서드의 this도 undefined다", () => {
    expect(
      runInNewContext(
        "'use strict'; function F() {} F.prototype.m = function () { return this }; var m = new F().m; String(m())",
      ),
    ).toBe('undefined')
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
      ['생성자 함수', row.fn],
      ['클래스', row.cls],
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
