import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { columns, rows, setup } from './default-table'

// 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
function errorName(code: string): string {
  try {
    runInNewContext(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

// 실행하지 않고 컴파일(파싱)만 한다. 파싱 오류 이름을 돌려준다.
function compileErrorName(code: string): string {
  try {
    new Script(code)
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

describe('본문 주장 검증: TypeError', () => {
  const cases: [string, string][] = [
    ['null을 객체 패턴으로 디스트럭처링하면 TypeError다', 'var {a} = null'],
    ['undefined를 객체 패턴으로 디스트럭처링하면 TypeError다', 'var {a} = undefined'],
    ['null을 배열 패턴으로 디스트럭처링하면 TypeError다', 'var [a] = null'],
    ['이터러블이 아닌 일반 객체를 배열 패턴으로 디스트럭처링하면 TypeError다', 'var [a] = {}'],
    ['null을 배열 스프레드하면 TypeError다', '[...null]'],
    ['null을 인수 스프레드하면 TypeError다', 'Math.max(...null)'],
    ['이터러블이 아닌 일반 객체를 배열 스프레드하면 TypeError다', '[...{a:1}]'],
    ['null을 객체 패턴으로 할당 디스트럭처링하면 TypeError다', 'var a; ({a} = null)'],
    ['인수 없이 객체 패턴 매개변수 함수를 부르면 TypeError다', 'function f({a}){} f()'],
  ]
  for (const [name, code] of cases) {
    it(name, () => {
      expect(errorName(code)).toBe('TypeError')
    })
  }
})

describe('본문 주장 검증: SyntaxError', () => {
  const cases: [string, string][] = [
    ['배열 패턴에서 rest 요소 뒤에 요소가 오면 SyntaxError다', 'var [...r, last] = [1,2]'],
    ['객체 패턴에서 rest 프로퍼티 뒤에 프로퍼티가 오면 SyntaxError다', 'var {...r, a} = {}'],
    ['괄호 없이 { 로 시작하는 문장은 블록으로 읽혀 SyntaxError다', 'var x; { x } = { x: 1 }'],
  ]
  for (const [name, code] of cases) {
    it(name, () => {
      expect(compileErrorName(code)).toBe('SyntaxError')
    })
  }

  it('괄호로 감싼 객체 패턴 할당은 파싱된다', () => {
    expect(compileErrorName('var x; ({ x } = { x: 1 })')).toBe('no error')
  })
})

describe('본문 주장 검증: 그 밖의 동작', () => {
  it('Object.assign은 null과 undefined 출처를 건너뛴다', () => {
    expect(runInNewContext('JSON.stringify(Object.assign({a:1}, null, undefined))')).toBe('{"a":1}')
  })

  it('객체 rest는 열거 가능한 심벌 키도 담는다', () => {
    expect(
      runInNewContext("var s = Symbol('s'); var { a, ...r } = { a: 1, [s]: 2 }; a + ' ' + r[s]"),
    ).toBe('1 2')
  })

  it('객체 스프레드는 리터럴 앞쪽에 정의한 같은 이름의 setter를 부르지 않고 데이터 프로퍼티로 바꾼다', () => {
    expect(
      runInNewContext(
        "var calls = []; var source = { get value() { calls.push('get'); return 1; } }; var o = { set value(v) { calls.push('set ' + v); }, ...source }; var d = Object.getOwnPropertyDescriptor(o, 'value'); [calls.join(','), d.value, typeof d.set, d.writable].join(' ')",
      ),
    ).toBe('get 1 undefined true')
  })

  it('문자열의 객체 스프레드는 코드 유닛마다, 배열 스프레드는 코드 포인트마다 값을 만든다', () => {
    expect(runInNewContext("Object.keys({ ...'😀' }).length + ' ' + [...'😀'].length")).toBe('2 1')
  })

  it('Math.max는 배열 인수를 문자열로 바꿔 숫자로 해석한다', () => {
    expect(
      runInNewContext("String([3, 1, 2]) + ' ' + Math.max([3, 1, 2]) + ' ' + Math.max([7])"),
    ).toBe('3,1,2 NaN 7')
  })

  it('*는 null을 0으로 바꾼다', () => {
    expect(runInNewContext('3 * null')).toBe(0)
  })

  it('없는 프로퍼티, 모자란 요소, 넘기지 않은 인수의 값은 undefined다', () => {
    expect(
      runInNewContext(
        'var [m] = []; [typeof ({}).v, typeof m, typeof (function (p) { return p; })()].join(" ")',
      ),
    ).toBe('undefined undefined undefined')
  })

  it('객체 rest로 받은 getter는 데이터 프로퍼티가 된다', () => {
    expect(
      runInNewContext(
        "var { ...r } = { get g() { return 1; } }; var d = Object.getOwnPropertyDescriptor(r, 'g'); typeof d.get + ' ' + d.value",
      ),
    ).toBe('undefined 1')
  })
})

describe('기본값 표 근거', () => {
  it('표는 7행 × 4칸이고 열 이름이 4개다', () => {
    expect(rows).toHaveLength(7)
    expect(columns).toHaveLength(4)
    for (const row of rows) expect(row.cells).toHaveLength(4)
  })

  // 칸마다 새 컨텍스트에서 실행해 다른 칸의 상태에 의존하지 않는다.
  for (const row of rows) {
    row.cells.forEach((cell, i) => {
      it(`${row.value} / ${columns[i].key}: probe 결과가 표와 같다`, () => {
        const actual = String(runInNewContext(`${setup};${cell.probe}`))
        expect(actual).toBe(cell.result)
      })
    })
  }
})
