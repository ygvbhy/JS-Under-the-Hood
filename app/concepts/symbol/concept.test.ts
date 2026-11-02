import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { columns, operations, setup } from './key-visibility'
import { concept } from './meta'

// 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
function errorName(code: string): string {
  try {
    runInNewContext(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

describe('본문 주장 검증', () => {
  it('new Symbol()은 TypeError다', () => {
    expect(errorName('new Symbol()')).toBe('TypeError')
  })

  it('Symbol.keyFor에 심벌이 아닌 값을 넘기면 TypeError다', () => {
    expect(errorName("Symbol.keyFor('x')")).toBe('TypeError')
  })

  it('심벌을 문자열과 더하면 TypeError다', () => {
    expect(errorName("Symbol('a') + ''")).toBe('TypeError')
  })

  it('템플릿 리터럴에 심벌을 넣으면 TypeError다', () => {
    expect(errorName('`${Symbol("a")}`')).toBe('TypeError')
  })

  it('단항 +를 심벌에 쓰면 TypeError다', () => {
    expect(errorName('+Symbol()')).toBe('TypeError')
  })

  it('Symbol.for의 키는 ToString을 거친다', () => {
    expect(runInNewContext("String(Symbol.for(1) === Symbol.for('1'))")).toBe('true')
  })

  it('description은 문자열로 저장된다', () => {
    expect(runInNewContext("String(Symbol(123).description === '123')")).toBe('true')
  })

  it('열거 불가 심벌 키도 getOwnPropertySymbols에는 나오고 Object.keys에는 나오지 않는다', () => {
    expect(
      runInNewContext(
        "var o = {}; Object.defineProperty(o, Symbol('h'), { value: 1, enumerable: false }); Object.getOwnPropertySymbols(o).length + ' ' + Object.keys(o).length",
      ),
    ).toBe('1 0')
  })

  it('프로토타입의 심벌 키는 in으로 찾지만 자기 심벌 키 목록에는 없다', () => {
    expect(
      runInNewContext(
        'var s = Symbol("p"); var proto = { [s]: 1 }; var o = Object.create(proto); (s in o) + " " + Object.getOwnPropertySymbols(o).length',
      ),
    ).toBe('true 0')
  })

  it('객체 스프레드는 열거 가능한 심벌 키를 복사한다', () => {
    expect(runInNewContext('var s = Symbol("k"); String({ ...{ [s]: 1 } }[s])')).toBe('1')
  })

  it('well-known 심벌은 Symbol의 쓰기·열거·설정 불가 프로퍼티다', () => {
    for (const name of ['iterator', 'toStringTag', 'toPrimitive']) {
      expect(
        runInNewContext(
          `var d = Object.getOwnPropertyDescriptor(Symbol, '${name}'); [d.writable, d.enumerable, d.configurable].join(' ')`,
        ),
      ).toBe('false false false')
    }
  })

  it('Symbol.toPrimitive 메서드가 객체를 돌려주면 TypeError다', () => {
    expect(errorName('var o = { [Symbol.toPrimitive]() { return {}; } }; +o')).toBe('TypeError')
  })

  it('불리언 변환은 true, 문자열과의 ==는 오류 없이 false, Object(sym)은 래퍼 객체다', () => {
    expect(
      runInNewContext(
        "var sym = Symbol('id'); [!!sym, sym == 'Symbol(id)', typeof Object(sym), Object(sym).valueOf() === sym].join(' ')",
      ),
    ).toBe('true false object true')
  })

  it('ToPropertyKey는 객체를 먼저 ToPrimitive로 바꾸므로 심벌을 돌려주는 객체는 심벌 키가 된다', () => {
    expect(
      runInNewContext(
        "var s = Symbol('s'); var t = {}; t[{ [Symbol.toPrimitive]() { return s; } }] = 7; String(Reflect.ownKeys(t).length === 1 && Reflect.ownKeys(t)[0] === s && t[s] === 7)",
      ),
    ).toBe('true')
  })

  it('심벌을 앞에 두고 문자열과 더해도 TypeError다', () => {
    expect(errorName("var sym = Symbol('a'); sym + ''")).toBe('TypeError')
  })
})

describe('연산 표 근거', () => {
  const exampleIds = concept.examples.map((example) => example.id)

  it('표는 8행 × 3칸이고 열 이름이 3개다', () => {
    expect(operations).toHaveLength(8)
    expect(columns).toHaveLength(3)
    for (const row of operations) expect(row.cells).toHaveLength(3)
  })

  it('표의 예제 id는 모두 meta.examples에 있다', () => {
    for (const row of operations) expect(exampleIds).toContain(row.exampleId)
  })

  // 칸마다 새 컨텍스트에서 실행해 다른 칸의 상태에 의존하지 않는다.
  for (const row of operations) {
    row.cells.forEach((cell, i) => {
      it(`${row.operation} / ${columns[i].key}: probe 결과가 표와 같다`, () => {
        const actual = String(runInNewContext(`${setup} ${cell.probe}`))
        expect(actual).toBe(cell.expected)
      })

      it(`${row.operation} / ${columns[i].key}: 표 글자(${cell.text})와 expected가 맞물린다`, () => {
        const expected = cell.text === '빠짐' ? 'false' : 'true'
        expect(cell.expected).toBe(expected)
      })
    })
  }
})
