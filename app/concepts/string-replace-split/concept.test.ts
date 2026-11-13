import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { tableBody } from '../../../tests/helpers/expression-tables'

// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function evaluate(source: string): string {
  try {
    return JSON.stringify(runInNewContext(source))
  } catch (e) {
    return (e as Error).name
  }
}

describe('식 → 결과 표', () => {
  const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')
  const rows = tableBody(mdx, ['식', '결과', '이유'])

  it('표 행이 14개 이상이다', () => {
    expect(rows.length).toBeGreaterThanOrEqual(14)
  })

  // 화면 글자 = 평가하는 글자가 되도록, 이스케이프가 필요한 글자는 식 칸에 쓰지 않는다.
  it('식 칸에 \\ < > { } 백틱 큰따옴표가 없다', () => {
    for (const [expr] of rows) {
      expect(expr).not.toMatch(/[\\<>{}`"]/)
    }
  })

  it.each(rows.map((r) => [r[0], r[1]]))('`%s` → 결과 칸', (expr, result) => {
    expect(evaluate(expr)).toBe(result)
  })
})

describe('본문 서술의 근거', () => {
  it('g와 y가 함께 있으면 처음부터 이어지는 매치까지만 바꾼다', () => {
    expect(evaluate("'aba'.replace(/a/gy, 'x')")).toBe('"xba"')
    expect(evaluate("'aba'.replaceAll(/a/gy, 'x')")).toBe('"xba"')
  })

  it('gy는 lastIndex를 0으로 되돌린 뒤 시작하고, y만 있으면 lastIndex 위치의 매치 하나만 바꾼다', () => {
    expect(evaluate("var r = /a/gy; r.lastIndex = 2; 'aba'.replace(r, 'x')")).toBe('"xba"')
    expect(evaluate("var s = /a/y; s.lastIndex = 2; 'aba'.replace(s, 'x')")).toBe('"abx"')
  })

  it('정규식의 점은 줄 끝 문자에 매치하지 않는다', () => {
    expect(evaluate("'a' + String.fromCharCode(10) + 'b'")).toBe('"a\\nb"')
    expect(evaluate("('a' + String.fromCharCode(10) + 'b').replace(/./g, '!')")).toBe('"!\\n!"')
  })

  it('split은 limit에 도달하면 남은 부분을 버린다', () => {
    expect(evaluate("'a-b-c'.split('-', 2)")).toBe('["a","b"]')
  })

  it('문자열도 정규식도 아닌 인수는 문자열로 바뀌고, 치환값을 생략하면 undefined가 들어간다', () => {
    expect(evaluate("'a1'.replace(1, 'x')")).toBe('"ax"')
    expect(evaluate("'abc'.replace('b')")).toBe('"aundefinedc"')
  })

  it('split의 구분자가 undefined이면 생략한 것과 같고, null은 문자열 null로 바뀐다', () => {
    expect(evaluate("'aundefinedb'.replace(undefined, 'x')")).toBe('"axb"')
    expect(evaluate("'aundefinedb'.split(undefined)")).toBe('["aundefinedb"]')
    expect(evaluate("'anullb'.split(null)")).toBe('["a","b"]')
  })

  it('y만 있으면 lastIndex 위치에 매치가 없을 때 아무것도 바꾸지 않는다', () => {
    expect(evaluate("var r = /a/y; ['baa'.replace(r, 'X'), r.lastIndex]")).toBe('["baa",0]')
  })

  it('문자열 패턴의 치환 함수 인수는 매치 문자열, 위치, 원래 문자열이다', () => {
    expect(
      evaluate(
        "var a; 'ab'.replace('a', function () { a = Array.prototype.slice.call(arguments); return 'z'; }); a",
      ),
    ).toBe('["a",0,"ab"]')
  })

  it('$00도 글자 그대로 남는다', () => {
    expect(evaluate("'a'.replace(/(a)/, '[$00]')")).toBe('"[$00]"')
  })

  it('split의 정규식 구분자는 y와 lastIndex에도 관계없이 자른다', () => {
    expect(evaluate("var y = /,/y; y.lastIndex = 3; ['a,b,c'.split(y), y.lastIndex]")).toBe(
      '[["a","b","c"],3]',
    )
  })

  it('y 플래그만 있는 replace는 lastIndex 위치에서 한 번 시도하고 lastIndex를 바꾼다', () => {
    expect(evaluate("var r = /a/y; r.lastIndex = 1; ['baa'.replace(r, 'X'), r.lastIndex]")).toBe(
      '["bXa",2]',
    )
  })

  it('g도 y도 없는 replace는 lastIndex를 무시하고 바꾸지 않는다', () => {
    expect(evaluate("var r = /b/; r.lastIndex = 3; ['abc'.replace(r, 'X'), r.lastIndex]")).toBe(
      '["aXc",3]',
    )
  })

  it.each([
    ["'ab'.replace(/(?<x>a)/, '[$<zz>]')", '"[]b"'],
    ["'b'.replace(/(?<x>a)?b/, '[$<x>]')", '"[]"'],
    ["'ab'.replace(/(a)/, '[$<x>]')", '"[$<x>]b"'],
    ["'ab'.replace(/(?<x>a)/, '[$<x]')", '"[$<x]b"'],
  ])('$<name>: `%s` → %s', (source, expected) => {
    expect(evaluate(source)).toBe(expected)
  })

  it('$nn: 두 자리가 그룹 수보다 크면 한 자리 + 숫자 글자', () => {
    expect(evaluate("'a'.replace(/(a)/, '[$01|$10]')")).toBe('"[a|a0]"')
  })

  it('매치에 참여하지 않은 그룹의 $1은 빈 문자열', () => {
    expect(evaluate("'b'.replace(/(a)?b/, '[$1]')")).toBe('"[]"')
  })

  it('g 정규식의 치환 함수 안에서 lastIndex는 이미 0이다', () => {
    expect(
      evaluate(
        "var a = []; var x = /a/g; 'aa'.replace(x, function () { a.push(x.lastIndex); return 'b' }); a",
      ),
    ).toBe('[0,0]')
  })

  it('이름 있는 그룹이 있을 때만 치환 함수의 마지막 인수가 객체다', () => {
    const args = (re: string) =>
      evaluate(
        `var n; 'a'.replace(${re}, function () { n = [arguments.length, typeof arguments[arguments.length - 1]] }); n`,
      )
    expect(args('/(?<x>a)/')).toBe('[5,"object"]')
    expect(args('/(a)/')).toBe('[4,"string"]')
  })

  it('치환 함수의 반환값은 $ 패턴으로 해석되지 않는다', () => {
    expect(evaluate("'abc'.replace('b', function () { return '$&' })")).toBe('"a$&c"')
  })

  it('참여하지 않은 split 캡처는 undefined로 끼어든다', () => {
    expect(evaluate("var r = 'a1b'.split(/(x)?1/); [r.length, r[1] === undefined]")).toBe(
      '[3,true]',
    )
  })

  it('matchAll에 문자열을 주면 g 정규식이 되어 점 기호가 모든 글자에 매치된다', () => {
    expect(evaluate("Array.from('a.b'.matchAll('.')).length")).toBe('3')
  })

  it('g 없는 정규식의 matchAll은 호출만으로 TypeError다', () => {
    expect(evaluate("'aa'.matchAll(/a/)")).toBe('TypeError')
  })

  it('replaceAll의 g 정규식 치환 함수도 위치를 모두 찾은 뒤 불린다(lastIndex 0)', () => {
    expect(
      evaluate(
        "var a = []; var x = /a/g; 'aa'.replaceAll(x, function () { a.push(x.lastIndex); return 'b' }); a",
      ),
    ).toBe('[0,0]')
  })

  it('빈 문자열 패턴: replace는 맨 앞 한 번, replaceAll은 모든 위치', () => {
    expect(evaluate("['abc'.replace('', '-'), 'abc'.replaceAll('', '-')]")).toBe(
      '["-abc","-a-b-c-"]',
    )
  })

  it('split: limit 0은 빈 배열, 빈 문자열은 구분자에 따라 [""] 또는 []', () => {
    expect(evaluate("['abc'.split('b', 0), ''.split(','), ''.split('')]")).toBe('[[],[""],[]]')
  })

  it('split의 정규식 구분자는 g·lastIndex와 관계없이 자르고 원래 lastIndex를 바꾸지 않는다', () => {
    expect(
      evaluate("var re = /([0-9])/g; re.lastIndex = 3; ['a1b2c'.split(re).length, re.lastIndex]"),
    ).toBe('[5,3]')
  })
})
