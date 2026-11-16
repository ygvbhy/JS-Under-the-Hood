import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts, getConcept } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const BACKSLASH = String.fromCharCode(92)
const STRICT = "'use strict';\n"

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열은 작은따옴표로 표시) 또는 던져진 오류의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다.
function show(code: string): string {
  try {
    const v = runInNewContext(code)
    return typeof v === 'string' ? `'${v}'` : String(v)
  } catch (e) {
    return (e as Error).name
  }
}

// 새 컨텍스트에서 코드를 실행해 오류 이름 또는 'no error'를 돌려준다.
function errorOf(code: string): string {
  try {
    runInNewContext(code)
    return 'no error'
  } catch (e) {
    return (e as Error).name
  }
}

const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')

describe('strict mode가 바꾸는 동작 표', () => {
  const header = ['바뀌는 것', '코드', 'sloppy mode 결과', 'strict mode 결과', '자세히']
  const rows = tableBody(mdx, header)

  it('행이 5개다', () => {
    expect(rows).toHaveLength(5)
  })

  it.each(rows.map((r) => [r[0], r[1], r[2], r[3]]))(
    '%s: `%s`는 sloppy mode에서 %s, strict mode에서 %s',
    (_name, code, sloppy, strict) => {
      expect(show(code)).toBe(sloppy)
      expect(show(STRICT + code)).toBe(strict)
    },
  )

  it('자세히 칸의 링크가 모두 실제 개념을 가리킨다', () => {
    const start = mdx.indexOf(`>${header[0]}</th>`)
    const table = mdx.slice(start, mdx.indexOf('</table>', start))
    const slugs = [...table.matchAll(/\]\(\/concepts\/([a-z0-9-]+)\)/g)].map((m) => m[1])
    expect(slugs).toHaveLength(rows.length)
    for (const slug of slugs) {
      expect(() => getConcept(slug)).not.toThrow()
    }
  })
})

describe('지시어 프롤로그 주장 검증', () => {
  const probe = 'probeName = 1;'

  it('지시어는 프롤로그 안(맨 앞)에 있어야 효과가 있고, 문자열 식 문이 아닌 문 뒤에서는 효과가 없다', () => {
    expect(errorOf("'use strict'; " + probe)).toBe('ReferenceError')
    expect(errorOf('var x = 1; ' + "'use strict'; " + probe)).toBe('no error')
  })

  it('주석 뒤의 지시어와 큰따옴표 지시어는 효과가 있다', () => {
    expect(errorOf("/* 주석 */ // 주석\n'use strict'; " + probe)).toBe('ReferenceError')
    expect(errorOf('"use strict"; ' + probe)).toBe('ReferenceError')
  })

  it('앞에 문자열 식 문만 있으면 지시어가 효과가 있다', () => {
    expect(errorOf("'note'; 'use strict'; " + probe)).toBe('ReferenceError')
  })

  it('이스케이프 시퀀스가 든 것은 값이 같아도 지시어가 아니다', () => {
    const escaped = "'use" + BACKSLASH + "u0020strict'"
    expect(runInNewContext(escaped)).toBe('use strict')
    expect(errorOf(escaped + '; ' + probe)).toBe('no error')
  })

  it('줄 잇기가 든 것은 값이 같아도 지시어가 아니다', () => {
    const continued = "'use " + BACKSLASH + '\n' + "strict'"
    expect(runInNewContext(continued)).toBe('use strict')
    expect(errorOf(continued + '; ' + probe)).toBe('no error')
  })

  it('이스케이프·줄 잇기가 든 문자열 식 문 뒤에서도 프롤로그가 이어져 지시어가 효과를 낸다', () => {
    const escaped = "'use" + BACKSLASH + "u0020strict'; "
    const continued = "'use " + BACKSLASH + '\n' + "strict'; "
    expect(errorOf(escaped + "'use strict'; " + probe)).toBe('ReferenceError')
    expect(errorOf(continued + "'use strict'; " + probe)).toBe('ReferenceError')
  })

  it('괄호로 감싼 것은 지시어가 아니다', () => {
    expect(errorOf("('use strict'); " + probe)).toBe('no error')
  })

  it('함수 안의 지시어는 바깥 Script를 strict로 만들지 않는다', () => {
    expect(errorOf("function f() { 'use strict'; } outerName = 1;")).toBe('no error')
  })

  it('지시어보다 앞에 쓰인 매개변수와 함수 이름도 strict 규칙을 따른다', () => {
    expect(errorOf("function f(a, a) { 'use strict'; }")).toBe('SyntaxError')
    expect(errorOf("function eval() { 'use strict'; }")).toBe('SyntaxError')
    expect(errorOf('function f(a, a) {}')).toBe('no error')
    expect(errorOf('function eval() {}')).toBe('no error')
  })
})

describe('본문 보충 주장 검증', () => {
  it('this·arguments는 호출하는 쪽이 아니라 호출되는 함수가 strict인지로 정해진다', () => {
    const sloppyFn = 'function s(a) { a = 2; return typeof this + " " + arguments[0]; } '
    expect(show(sloppyFn + "(function () { 'use strict'; return s(1); })()")).toBe("'object 2'")
    const strictFn =
      "function t(a) { 'use strict'; a = 2; return typeof this + ' ' + arguments[0]; } "
    expect(show(strictFn + 't(1)')).toBe("'undefined 1'")
  })

  it('sloppy mode의 매개변수 이름 중복은 목록이 단순한 function 함수에서만 허용된다', () => {
    expect(errorOf('(function (a, a) {})')).toBe('no error')
    expect(errorOf('(a, a) => 1')).toBe('SyntaxError')
    expect(errorOf('({ m(a, a) {} })')).toBe('SyntaxError')
    expect(errorOf('(function (a, a = 1) {})')).toBe('SyntaxError')
  })

  it('strict mode 예약어 9개는 바인딩 이름·레이블로 쓸 수 없지만 프로퍼티 이름으로는 쓸 수 있다', () => {
    const words = [
      'implements',
      'interface',
      'let',
      'package',
      'private',
      'protected',
      'public',
      'static',
      'yield',
    ]
    for (const w of words) {
      expect(errorOf(`var ${w}; function f(${w}) {} ${w}: ;`)).toBe('no error')
      expect(errorOf(`${STRICT}var ${w};`)).toBe('SyntaxError')
      expect(errorOf(`${STRICT}function ${w}() {}`)).toBe('SyntaxError')
      expect(errorOf(`${STRICT}(function (${w}) {})`)).toBe('SyntaxError')
      expect(errorOf(`${STRICT}${w}: ;`)).toBe('SyntaxError')
      expect(errorOf(`${STRICT}var o = { ${w}: 1 }; o.${w};`)).toBe('no error')
    }
  })
})

describe('Function 생성자 주장 검증', () => {
  it("'use strict'; 스크립트 안에서도 지시어 없는 new Function 본문은 sloppy다", () => {
    expect(errorOf(STRICT + "new Function('dynamicName = 1;')()")).toBe('no error')
    expect(errorOf(STRICT + 'new Function("\'use strict\'; dynamicName2 = 1;")()')).toBe(
      'ReferenceError',
    )
    expect(errorOf(STRICT + "new Function(\"'note'; 'use strict'; dynamicName3 = 1;\")()")).toBe(
      'ReferenceError',
    )
  })

  it("예제 3은 맨 앞에 'use strict';를 붙여 실행해도 출력이 같다", () => {
    const example = concept.examples.find((e) => e.id === 'syntax-errors')
    if (!example || example.runtime !== 'ecmascript') throw new Error('예제 3을 찾지 못했습니다')
    const code = readFileSync(join(import.meta.dirname, 'examples', example.file), 'utf8')
    expect(runExample(STRICT + code)).toEqual(example.expectedOutput)
    expect(runExample(code)).toEqual(example.expectedOutput)
  })
})

describe('메타', () => {
  it("title·summary·tags에 '객체'가 없어 홈 '객체' 검색에 걸리지 않는다", () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })
})
