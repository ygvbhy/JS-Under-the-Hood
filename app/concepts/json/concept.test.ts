import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { columns, rows, wrapProbe } from './value-table'

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
    ['객체 프로퍼티의 BigInt는 TypeError다', 'JSON.stringify({ n: 1n })'],
    ['최상위 BigInt는 TypeError다', 'JSON.stringify(1n)'],
    ['순환 객체는 TypeError다', 'var c = {}; c.self = c; JSON.stringify(c)'],
    ['순환 배열은 TypeError다', 'var c = []; c.push(c); JSON.stringify(c)'],
  ]
  for (const [name, code] of cases) {
    it(name, () => {
      expect(errorName(code)).toBe('TypeError')
    })
  }

  it('같은 객체를 두 번 담은 배열은 순환이 아니라서 두 번 직렬화된다', () => {
    expect(runInNewContext('var s = {}; JSON.stringify([s, s])')).toBe('[{},{}]')
  })
})

describe('본문 주장 검증: JSON.parse의 SyntaxError', () => {
  const cases: [string, string][] = [
    ['작은따옴표 문자열 키', `JSON.parse("{'a':1}")`],
    ['끝 쉼표', 'JSON.parse(\'{"a":1,}\')'],
    ['undefined', "JSON.parse('undefined')"],
    ['NaN', "JSON.parse('NaN')"],
    ['따옴표 없는 키', "JSON.parse('{a:1}')"],
    ['빈 문자열', "JSON.parse('')"],
    ['앞에 0이 붙은 숫자 01', "JSON.parse('01')"],
  ]
  for (const [name, code] of cases) {
    it(`${name}은 SyntaxError다`, () => {
      expect(errorName(code)).toBe('SyntaxError')
    })
  }
})

describe('본문 주장 검증: 그 밖의 동작', () => {
  it('배열 replacer는 배열 요소를 거르지 않고 모든 깊이의 객체에서 그 키만 고른다', () => {
    expect(runInNewContext("JSON.stringify({ a: [{ a: 1, b: 2 }, 5], b: 1 }, ['a'])")).toBe(
      '{"a":[{"a":1},5]}',
    )
  })

  it('replacer 첫 호출의 this는 빈 문자열 키로 value를 가진 wrapper다', () => {
    expect(
      runInNewContext(
        "var first; JSON.stringify(true, function (k, v) { if (first === undefined) first = (this[''] === v) + ' ' + JSON.stringify(k); return v; }); first",
      ),
    ).toBe('true ""')
  })

  it('하위 호출의 this는 그 값을 가진 holder다', () => {
    expect(
      runInNewContext(
        "var o = { a: 1 }; var ok; JSON.stringify(o, function (k, v) { if (k === 'a') ok = this === o; return v; }); ok",
      ),
    ).toBe(true)
  })

  it('toJSON이 replacer보다 먼저 불려 replacer는 문자열을 받는다', () => {
    expect(
      runInNewContext(
        "var t; JSON.stringify({ d: new Date(0) }, function (k, v) { if (k === 'd') t = typeof v; return v; }); t",
      ),
    ).toBe('string')
  })

  it('replacer 안에서 this[key]를 읽으면 toJSON 이전의 원래 값을 얻는다', () => {
    expect(
      runInNewContext(
        "var orig; JSON.stringify({ d: new Date(0) }, function (k, v) { if (k === 'd') orig = this[k] instanceof Date; return v; }); orig",
      ),
    ).toBe(true)
  })

  it('space가 10을 넘는 숫자면 10칸 공백이다', () => {
    expect(runInNewContext("JSON.stringify({ a: 1 }, null, 20).split('\\n')[1]")).toBe(
      ' '.repeat(10) + '"a": 1',
    )
  })

  it('space가 문자열이면 그 문자열로 들여쓴다', () => {
    expect(runInNewContext("JSON.stringify({ a: 1 }, null, '--')")).toBe('{\n--"a": 1\n}')
  })

  it('함수가 아닌 toJSON은 일반 프로퍼티로 직렬화된다', () => {
    expect(runInNewContext('JSON.stringify({ toJSON: 1, a: 2 })')).toBe('{"toJSON":1,"a":2}')
  })

  it('상속한 toJSON도 쓰인다', () => {
    expect(
      runInNewContext(
        "var base = { toJSON: function () { return 'P'; } }; JSON.stringify([Object.create(base)])",
      ),
    ).toBe('["P"]')
  })

  it('Date.prototype.toJSON은 범용이라 toISOString만 있으면 쓸 수 있다', () => {
    expect(
      runInNewContext("Date.prototype.toJSON.call({ toISOString: function () { return 'iso'; } })"),
    ).toBe('iso')
  })

  it('JSON.parse의 결과 객체의 프로토타입은 Object.prototype이다', () => {
    expect(runInNewContext("Object.getPrototypeOf(JSON.parse('{}')) === Object.prototype")).toBe(
      true,
    )
  })

  it('JSON.parse의 결과 배열은 일반 배열이다', () => {
    expect(runInNewContext("Array.isArray(JSON.parse('[1]'))")).toBe(true)
  })

  it('자기 getter는 값으로 직렬화되고 프로토타입의 getter는 빠진다', () => {
    expect(
      runInNewContext(
        "var own = { get g() { return 1; } }; var proto = { get h() { return 2; } }; JSON.stringify(own) + ' ' + JSON.stringify(Object.create(proto))",
      ),
    ).toBe('{"g":1} {}')
  })

  it('wrapper의 키는 빈 문자열이라 최상위 toJSON의 key 인수는 빈 문자열이다', () => {
    expect(
      runInNewContext('JSON.stringify({ toJSON: function (k) { return typeof k + k.length; } })'),
    ).toBe('"string0"')
  })

  it('space 숫자 2는 한 단계마다 공백 두 칸, 1보다 작으면 들여쓰기가 없다', () => {
    expect(runInNewContext('JSON.stringify({ a: [1] }, null, 2)')).toBe(
      '{\n  "a": [\n    1\n  ]\n}',
    )
    expect(runInNewContext('JSON.stringify({ a: [1] }, null, 0)')).toBe('{"a":[1]}')
  })

  it('Number·String 래퍼는 ToNumber·ToString을 거치고 Boolean 래퍼는 슬롯 값을 쓴다', () => {
    expect(
      runInNewContext(
        "var n = new Number(7); n.valueOf = function () { return 42; }; var s = new String('7'); s.toString = function () { return 'x'; }; var b = new Boolean(false); b.valueOf = function () { return true; }; JSON.stringify([n, s, b])",
      ),
    ).toBe('[42,"x",false]')
  })

  it('배열 replacer는 목록 순서대로 읽어 상속·열거 불가 프로퍼티도 직렬화한다', () => {
    expect(
      runInNewContext(
        "var base = { inherited: 'proto' }; var user = Object.create(base); user.name = 'lee'; Object.defineProperty(user, 'password', { value: 'secret', enumerable: false }); JSON.stringify(user, ['password', 'inherited', 'name'])",
      ),
    ).toBe('{"password":"secret","inherited":"proto","name":"lee"}')
  })

  it('BigInt.prototype.toJSON을 정의하면 BigInt도 TypeError 없이 직렬화된다', () => {
    expect(
      runInNewContext(
        'BigInt.prototype.toJSON = function () { return this.toString(); }; JSON.stringify({ v: 1n })',
      ),
    ).toBe('{"v":"1"}')
  })

  it('Date.prototype.toJSON은 this를 숫자 힌트로 바꾼 결과가 유한하지 않으면 null이다', () => {
    expect(
      runInNewContext(
        "Date.prototype.toJSON.call({ valueOf: function () { return NaN; }, toISOString: function () { return 'iso'; } })",
      ),
    ).toBe(null)
  })

  it('빈 텍스트는 SyntaxError지만 \'""\'는 빈 문자열이다', () => {
    expect(runInNewContext('JSON.parse(\'""\')')).toBe('')
  })

  it('화살표 함수 replacer의 this는 holder가 아니다', () => {
    expect(
      runInNewContext(
        "var o = { a: 1 }; var isHolder; JSON.stringify(o, (k, v) => { if (k === 'a') isHolder = this === o; return v; }); isHolder",
      ),
    ).toBe(false)
  })

  it('JSON.parse(JSON.stringify(x))를 거치면 함수·심벌 값 프로퍼티도 빠진다', () => {
    expect(
      runInNewContext(
        "var src = { greet: function () {}, id: Symbol('s'), n: 1 }; JSON.stringify(Object.keys(JSON.parse(JSON.stringify(src))))",
      ),
    ).toBe('["n"]')
  })

  it('reviver가 undefined를 돌려주면 배열 요소도 지워져 구멍이 된다', () => {
    expect(
      runInNewContext(
        "var a = JSON.parse('[1,2]', function (k, v) { return k === '0' ? undefined : v; }); (0 in a) + ' ' + a.length",
      ),
    ).toBe('false 2')
  })
})

describe('값별 결과표 근거', () => {
  it('표는 13행이고 열이 3개다', () => {
    expect(rows).toHaveLength(13)
    expect(columns).toHaveLength(3)
    for (const row of rows) expect(row.cells).toHaveLength(3)
  })

  // 칸마다 새 컨텍스트에서 실행해 다른 칸의 상태에 의존하지 않는다.
  for (const row of rows) {
    columns.forEach((column, i) => {
      it(`${row.value} / ${column.key}: probe 결과가 표와 같다`, () => {
        const actual = String(runInNewContext(`${row.setup} ${wrapProbe(column.probe)}`))
        expect(actual).toBe(row.cells[i])
      })
    })
  }
})
