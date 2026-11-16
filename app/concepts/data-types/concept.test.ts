import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { concept } from './meta'

// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function errorNameOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (e) {
    return (e as Error).name
  }
  return undefined
}

const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)
const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
const BACKSLASH = String.fromCharCode(92)

// 소스 코드 문자열을 평가해 값을 돌려준다(본문 주장 검증용).
function evaluate(code: string): unknown {
  return runInNewContext(code)
}

const SPEC_TYPES = [
  'Undefined',
  'Null',
  'Boolean',
  'String',
  'Symbol',
  'Number',
  'BigInt',
  'Object',
]

// 값 하나의 명세 타입. typeof가 object·function이면 Object, null은 Null이다.
function specTypeOf(value: unknown): string {
  if (value === null) return 'Null'
  const t = typeof value
  if (t === 'object' || t === 'function') return 'Object'
  return t === 'bigint' ? 'BigInt' : t.charAt(0).toUpperCase() + t.slice(1)
}

describe('언어 타입 표', () => {
  const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')
  const rows = tableBody(mdx, ['타입', '값의 예', '분류'])

  it('행이 8개이고 타입 칸이 명세의 8개 타입과 순서까지 같다', () => {
    expect(rows).toHaveLength(8)
    expect(rows.map((r) => r[0])).toEqual(SPEC_TYPES)
  })

  it.each(rows.map((r) => [r[0], r[1], r[2]]))('%s: `%s`는 %s', (type, example, category) => {
    expect(['원시 값', '객체']).toContain(category)
    const value = evaluate('(' + example + ')')
    expect(specTypeOf(value)).toBe(type)
    // 분류가 '원시 값'인 것은 타입이 Object가 아닌 것과 정확히 같다.
    expect(category === '원시 값').toBe(type !== 'Object')
  })
})

describe('줄바꿈 주장 검증', () => {
  const parseError = (code: string) => errorNameOf(() => new Script(code))

  it('작은따옴표·큰따옴표 문자열 안의 LF·CR은 SyntaxError다', () => {
    expect(parseError("'a" + LF + "b'")).toBe('SyntaxError')
    expect(parseError('"a' + LF + 'b"')).toBe('SyntaxError')
    expect(parseError("'a" + CR + "b'")).toBe('SyntaxError')
    expect(parseError('"a' + CR + 'b"')).toBe('SyntaxError')
  })

  it('U+2028·U+2029는 따옴표 문자열에 쓸 수 있다', () => {
    expect(parseError("'a" + LS + "b'")).toBeUndefined()
    expect(parseError("'a" + PS + "b'")).toBeUndefined()
    expect(parseError('"a' + LS + 'b"')).toBeUndefined()
  })

  it('백슬래시 바로 뒤의 줄바꿈(줄 잇기)은 허용되고 값에 아무것도 넣지 않는다', () => {
    expect(parseError("'a" + BACKSLASH + LF + "b'")).toBeUndefined()
    expect(evaluate("'a" + BACKSLASH + LF + "b'")).toBe('ab')
    expect(evaluate('"a' + BACKSLASH + CR + LF + 'b"')).toBe('ab')
  })

  it('템플릿 리터럴의 LF·CRLF·CR 줄바꿈은 값에서 모두 LF 하나가 된다', () => {
    for (const nl of [LF, CR + LF, CR]) {
      expect(parseError('`a' + nl + 'b`')).toBeUndefined()
      expect(evaluate('`a' + nl + 'b`')).toBe('a' + LF + 'b')
    }
  })

  it('템플릿 리터럴 안의 U+2028·U+2029는 LF로 바뀌지 않는다', () => {
    expect(evaluate('`a' + LS + 'b`')).toBe('a' + LS + 'b')
    expect(evaluate('`a' + PS + 'b`')).toBe('a' + PS + 'b')
  })

  it('세 가지 따옴표는 같은 코드 유닛 나열이면 같은 String 값을 만든다', () => {
    expect(evaluate('\'JS\' === "JS" && "JS" === `JS` && typeof `JS` === \'string\'')).toBe(true)
  })
})

describe('undefined와 null 주장 검증', () => {
  it('undefined는 리터럴이 아니라 식별자라서 함수 안에서 var로 선언할 수 있다', () => {
    expect(evaluate('(function () { var undefined = 1; return undefined; })()')).toBe(1)
  })

  it('null은 리터럴이라 식별자로 선언하면 SyntaxError다', () => {
    expect(errorNameOf(() => new Script('var null = 1;'))).toBe('SyntaxError')
  })

  it('var x = undefined;로 직접 할당해도 값은 undefined다(값이 undefined여도 할당하지 않았다는 뜻은 아니다)', () => {
    expect(evaluate('var x = undefined; x === undefined')).toBe(true)
  })

  it('let 변수를 선언문이 실행되기 전에 읽으면 undefined가 아니라 ReferenceError다', () => {
    expect(errorNameOf(() => runInNewContext('x; let x;'))).toBe('ReferenceError')
  })

  it('초기값 없이 선언한 let 변수도 선언문이 실행된 뒤에는 undefined다', () => {
    expect(evaluate('let x; x === undefined')).toBe(true)
  })

  it('기준은 코드 위치가 아니라 실행 시점이다: 선언문 위의 함수도 선언문 실행 뒤에 부르면 읽는다', () => {
    expect(evaluate('function read() { return y; } let y = 1; read()')).toBe(1)
  })

  it('const는 초기값 없는 선언 자체가 SyntaxError다', () => {
    expect(errorNameOf(() => new Script('const c;'))).toBe('SyntaxError')
  })

  it('undefined와 null은 ===로 다르고 ==로 같으며 typeof null은 object다', () => {
    expect(evaluate('undefined === null')).toBe(false)
    expect(evaluate('undefined == null')).toBe(true)
    expect(evaluate('typeof null')).toBe('object')
  })

  it('구조 분해의 기본값은 undefined에만 쓰이고 null에는 쓰이지 않는다', () => {
    expect(evaluate('var { a = 1 } = { a: undefined }; a')).toBe(1)
    expect(evaluate('var { b = 1 } = { b: null }; b')).toBe(null)
  })
})

describe('메타', () => {
  it("title·summary·tags에 '객체'가 없어 홈 '객체' 검색에 걸리지 않는다", () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })
})
