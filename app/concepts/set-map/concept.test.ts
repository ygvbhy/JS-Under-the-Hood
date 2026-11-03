import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { columns, mapProbe, rows } from './sameness-table'

// 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
function errorName(code: string): string {
  try {
    runInNewContext(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

describe('본문 주장 검증: TypeError', () => {
  const cases: [string, string][] = [
    ['WeakMap의 키가 원시 값이면 TypeError다', 'new WeakMap().set(1, 1)'],
    ['WeakSet의 값이 원시 값이면 TypeError다', "new WeakSet().add('a')"],
    [
      'Symbol.for로 등록한 심벌은 WeakMap의 키가 될 수 없어 TypeError다',
      "new WeakMap().set(Symbol.for('r'), 1)",
    ],
    ['new 없이 Map을 부르면 TypeError다', 'Map()'],
    ['이터러블이 아닌 값으로 Set을 만들면 TypeError다', 'new Set(5)'],
  ]
  for (const [name, code] of cases) {
    it(name, () => {
      expect(errorName(code)).toBe('TypeError')
    })
  }

  it('등록하지 않은 심벌은 WeakMap의 키가 될 수 있다', () => {
    expect(errorName("new WeakMap().set(Symbol('u'), 1)")).toBe('no error')
  })
})

describe('본문 주장 검증: 그 밖의 동작', () => {
  it('Set의 forEach 콜백은 (값, 값, set)을 받는다', () => {
    expect(
      runInNewContext(
        "var s = new Set(['x']); var got; s.forEach(function (a, b, c) { got = [a, b, c === s ? 1 : 0]; }); JSON.stringify(got)",
      ),
    ).toBe('["x","x",1]')
  })

  it('Set.prototype.keys와 values는 같은 함수다', () => {
    expect(runInNewContext('Set.prototype.keys === Set.prototype.values')).toBe(true)
  })

  it('size는 get만 있는 접근자 프로퍼티다', () => {
    expect(
      runInNewContext(
        "var d = Object.getOwnPropertyDescriptor(Map.prototype, 'size'); typeof d.get + ' ' + typeof d.set",
      ),
    ).toBe('function undefined')
  })

  it('Set의 size도 get만 있는 접근자 프로퍼티다', () => {
    expect(
      runInNewContext(
        "var d = Object.getOwnPropertyDescriptor(Set.prototype, 'size'); typeof d.get + ' ' + typeof d.set",
      ),
    ).toBe('function undefined')
  })

  it('생성자 인수를 생략하거나 undefined·null을 넘기면 빈 컬렉션이다', () => {
    expect(
      runInNewContext(
        "[new Set().size, new Set(undefined).size, new Map(null).size, new Map().size].join(' ')",
      ),
    ).toBe('0 0 0 0')
  })

  it('순회 중 방문한 값을 지웠다가 다시 넣으면 다시 방문한다', () => {
    expect(
      runInNewContext(
        'var s = new Set([1, 2]); var seen = []; for (var v of s) { seen.push(v); if (v === 1 && seen.length === 1) { s.delete(1); s.add(1); } } JSON.stringify(seen)',
      ),
    ).toBe('[1,2,1]')
  })

  it('이미 있는 값을 add하면 같은 Set을 돌려주고 size는 그대로다', () => {
    expect(
      runInNewContext('var s = new Set([1]); var r = s.add(1); (r === s) + " " + s.size'),
    ).toBe('true 1')
  })

  it('Object.fromEntries는 Map의 키를 일반 객체의 프로퍼티 키로 바꾼다', () => {
    expect(
      runInNewContext(
        'JSON.stringify(Object.keys(Object.fromEntries(new Map([[1, "a"], [{}, "b"]]))))',
      ),
    ).toBe('["1","[object Object]"]')
  })

  it('Set에 -0을 넣으면 +0으로 저장된다', () => {
    expect(runInNewContext('Object.is([...new Set([-0])][0], 0)')).toBe(true)
  })

  it('Map의 키 -0도 +0으로 저장된다', () => {
    expect(runInNewContext('Object.is([...new Map([[-0, 1]]).keys()][0], 0)')).toBe(true)
  })
})

describe('같음 비교표 근거', () => {
  it('표는 8행이고 열이 4개다', () => {
    expect(rows).toHaveLength(8)
    expect(columns).toHaveLength(4)
    for (const row of rows) expect(row.same).toHaveLength(4)
  })

  // 칸마다 새 컨텍스트에서 실행해 다른 칸의 상태에 의존하지 않는다.
  for (const row of rows) {
    columns.forEach((column, i) => {
      it(`${row.pair} / ${column.key}: probe 결과가 표와 같다`, () => {
        const actual = String(runInNewContext(`${row.setup} ${column.probe}`))
        expect(actual).toBe(String(row.same[i]))
      })
    })
  }

  for (const row of rows) {
    it(`${row.pair}: Map도 Set과 같은 기준으로 키를 구분한다`, () => {
      const setResult = String(runInNewContext(`${row.setup} ${columns[2].probe}`))
      const mapResult = String(runInNewContext(`${row.setup} ${mapProbe}`))
      expect(mapResult).toBe(setResult)
    })
  }
})
