import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const fileOf = (id: string) => concept.examples.find((e) => e.id === id)!.file
const expectedOf = (id: string) => concept.examples.find((e) => e.id === id)!.expectedOutput

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열) 또는 던져진 오류의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    return (e as Error).name
  }
}

// 출력(console.log, util.format)과 던져진 오류의 이름을 함께 돌려준다.
function runCollect(
  code: string,
  extra: Record<string, unknown> = {},
): { out: string[]; error: string | null } {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) }, ...extra }
  try {
    runInNewContext(code, sandbox)
    return { out, error: null }
  } catch (e) {
    return { out, error: (e as Error).name }
  }
}

// 소스에서 from이 정확히 있는지 확인한 뒤 모두 to로 바꾼다($ 패턴 해석을 피하려고 split/join을 쓴다).
function swap(src: string, from: string, to: string, count = 1): string {
  const parts = src.split(from)
  expect(parts.length - 1, from).toBe(count)
  return parts.join(to)
}

// --- 'use strict'; 접두 ---------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s',
    (id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      if (id === 'frozen-template') {
        // 예제 4는 첫 줄이 'use strict';라서 strict mode의 TypeError를 보인다.
        expect(code.startsWith(STRICT)).toBe(true)
      } else {
        expect(code.startsWith(STRICT)).toBe(false)
        expect(runExample(STRICT + code)).toEqual(expectedOutput)
      }
    },
  )
})

// --- 틀린 모델 -------------------------------------------------------------------------------
// 예제마다 틀린 모델을 코드로 흉내 낸다. 모델 'real'은 명세대로의 흉내이고 expectedOutput과 같아야 한다.

type Model = 'real' | 'M1' | 'M2' | 'M3'

// 예제 1: M1 끼운 값도 문자열로 바뀐다, M2 조각 수 = 값 수(끝 빈 문자열 없음), M3 괄호로 감싸도 태그드 템플릿과 같다.
function model1(m: Model): string[] {
  let src = readExample(fileOf('tag-arguments'))
  const site = 'inspect`id:${item}, next:${item.id + 1}`'
  const pieces = m === 'M2' ? "['id:', ', next:']" : "['id:', ', next:', '']"
  const values = m === 'M1' ? 'String(item), String(item.id + 1)' : 'item, item.id + 1'
  src = swap(src, site, `inspect(${pieces}, ${values})`)
  if (m === 'M3') {
    src = swap(src, 'kind`id`', "kind(['id'])")
    src = swap(src, 'kind(`id`)', "kind(['id'])")
  }
  return runCollect(src).out
}

// 예제 2: M1 빈 조각은 넣지 않는다, M2 조각 수 = 값 수(마지막 조각을 버린다).
function model2(m: Model): string[] {
  let src = readExample(fileOf('strings-count'))
  const sites: [string, string[], number[]][] = [
    ['count`plain`', ['plain'], []],
    ['count`${1}`', ['', ''], [1]],
    ['count`${1}${2}`', ['', '', ''], [1, 2]],
    ['count`a${1}b`', ['a', 'b'], [1]],
  ]
  for (const [site, pieces, values] of sites) {
    const used =
      m === 'M1' ? pieces.filter((p) => p !== '') : m === 'M2' ? pieces.slice(0, -1) : pieces
    src = swap(src, site, `count(${JSON.stringify(used)}, ...${JSON.stringify(values)})`)
  }
  return runCollect(src).out
}

// 예제 3: M1 평가할 때마다 새 배열, M2 글자가 같으면 같은 배열(ES2017판까지의 규칙), M3 함수 객체마다 새 배열.
function model3(m: Model): string[] {
  const cache = new Map<string, string[]>()
  const ids = new WeakMap<object, number>()
  let next = 0
  const get = (site: string, pieces: string[], callee?: object): string[] => {
    if (m === 'M1') return [...pieces]
    let key = site
    if (m === 'M2') key = pieces.join('|')
    if (m === 'M3' && callee) {
      if (!ids.has(callee)) ids.set(callee, next++)
      key = `${site}@${ids.get(callee)}`
    }
    if (!cache.has(key)) cache.set(key, [...pieces])
    return cache.get(key)!
  }
  let src = readExample(fileOf('same-site'))
  const xSite = 'keep`x${i}`'
  const parts = src.split(xSite)
  expect(parts).toHaveLength(3) // 반복문 안(A)과 반복문 밖(B)
  src = `${parts[0]}keep(__get('A', ['x', '']))${parts[1]}keep(__get('B', ['x', '']))${parts[2]}`
  src = swap(src, 'keep`y`', "keep(__get('C', ['y'], arguments.callee))")
  return runCollect(src, { __get: get }).out
}

// 예제 4: M1 동결만 뺀 배열, M2 raw도 열거된다, M3 strict에서도 조용히 무시(sloppy로 실행해 흉내 낸다).
function model4(m: Model): string[] {
  const mk = () => {
    const strings = ['a', 'b']
    const raw = ['a', 'b']
    if (m !== 'M1') Object.freeze(raw)
    Object.defineProperty(strings, 'raw', {
      value: raw,
      writable: false,
      enumerable: m === 'M2',
      configurable: false,
    })
    if (m !== 'M1') Object.freeze(strings)
    return strings
  }
  let src = readExample(fileOf('frozen-template'))
  src = swap(src, 'keep`a${1}b`', 'keep(__mk())')
  if (m === 'M3') src = swap(src, STRICT, '')
  return runCollect(src, { __mk: mk }).out
}

// 예제 5: M1 raw도 이스케이프를 해석한다, M2 String.raw는 넘긴 값을 모두 붙인다.
function model5(m: Model): string[] {
  const TAB = 'a\tb'
  const RAW = 'a\\tb'
  const tpl = (cooked: string[], raw: string[]) => Object.assign([...cooked], { raw })
  const first = m === 'M1' ? TAB : RAW
  const a = tpl([TAB], [first])
  const b = tpl([TAB, 'c'], [first, 'c'])
  const rawFn = (strings: { raw: string[] }, ...subs: unknown[]) => {
    const r = strings.raw
    let out = ''
    for (let i = 0; i < r.length; i++) {
      out += r[i]
      if (i + 1 < r.length && i < subs.length) out += String(subs[i])
    }
    if (m === 'M2') out += subs.slice(r.length - 1).join('')
    return out
  }
  let src = readExample(fileOf('cooked-raw'))
  src = swap(src, 'both`a\\tb`', 'both(__a)')
  src = swap(src, 'String.raw`a\\tb${1 + 1}c`', '__raw(__b, 1 + 1)')
  src = swap(src, 'String.raw`a\\tb`', '__raw(__a)')
  src = swap(src, 'String.raw({', '__raw({')
  return runCollect(src, { __a: a, __b: b, __raw: rawFn }).out
}

// 예제 6: M1 태그가 있어도 SyntaxError(태그 이름을 지운 스크립트), M2 cooked도 raw와 같은 글자.
function model6(m: Model): { out: string[]; error: string | null } {
  let src = readExample(fileOf('invalid-escape'))
  if (m === 'M1') {
    src = swap(src, 'both`', '`', 2)
    src = swap(src, 'String.raw`', '`')
    return runCollect(src)
  }
  const cookedOf = (raw: string) => (m === 'M2' ? raw : undefined)
  const a = Object.assign([cookedOf('\\unicode')], { raw: ['\\unicode'] })
  const b = Object.assign([cookedOf('C:\\xyz')], { raw: ['C:\\xyz'] })
  const rawFn = (strings: { raw: string[] }) => strings.raw.join('')
  src = swap(src, 'both`\\unicode`', 'both(__a)')
  src = swap(src, 'both`C:\\xyz`', 'both(__b)')
  src = swap(src, 'String.raw`\\unicode`', '__raw(__a)')
  return runCollect(src, { __a: a, __b: b, __raw: rawFn })
}

const MODEL_OUTPUT: Record<number, { wrong: string[]; wrongLines: string[][] }> = {}
{
  const wrongLines: Record<number, string[][]> = {
    1: [model1('M2'), model1('M1'), model1('M3')],
    2: [model2('M1'), model2('M2')],
    3: [model3('M1'), model3('M2'), model3('M3')],
    4: [model4('M1'), model4('M2'), model4('M3')],
    5: [model5('M1'), model5('M2')],
    6: [model6('M2').out],
  }
  for (const [n, lines] of Object.entries(wrongLines)) {
    MODEL_OUTPUT[Number(n)] = { wrong: lines.map((l) => l.join(' / ')), wrongLines: lines }
  }
}

describe('틀린 모델의 출력', () => {
  it('명세대로 흉내 낸 모델(real)은 expectedOutput과 같다', () => {
    expect(model1('real')).toEqual(expectedOf('tag-arguments'))
    expect(model2('real')).toEqual(expectedOf('strings-count'))
    expect(model3('real')).toEqual(expectedOf('same-site'))
    expect(model4('real')).toEqual(expectedOf('frozen-template'))
    expect(model5('real')).toEqual(expectedOf('cooked-raw'))
    expect(model6('real')).toEqual({ out: expectedOf('invalid-escape'), error: null })
  })

  it('예제 1: M2 조각 수 = 값 수 / M1 끼운 값도 문자열 / M3 괄호로 감싸도 같다', () => {
    expect(model1('M2')).toEqual([
      '["id:",", next:"] 2 2',
      'object number',
      '2 number',
      'id:[object Object], next:8',
      'object string',
    ])
    expect(model1('M1')).toEqual([
      '["id:",", next:",""] 3 2',
      'string string',
      '2 number',
      'id:[object Object], next:8',
      'object string',
    ])
    expect(model1('M3')).toEqual([
      '["id:",", next:",""] 3 2',
      'object number',
      '2 number',
      'id:[object Object], next:8',
      'object object',
    ])
  })

  it('예제 2: M1 빈 조각은 넣지 않는다 / M2 조각 수 = 값 수', () => {
    expect(model2('M1')).toEqual(['["plain"] 0', '[] 1', '[] 2', '["a","b"] 1'])
    expect(model2('M2')).toEqual(['[] 0', '[""] 1', '["",""] 2', '["a"] 1'])
  })

  it('예제 3: M1 평가할 때마다 새 배열 / M2 글자가 같으면 같은 배열 / M3 함수 객체마다 새 배열', () => {
    expect(model3('M1')).toEqual(['false false', 'false', 'false false'])
    expect(model3('M2')).toEqual(['true true', 'true', 'false true'])
    expect(model3('M3')).toEqual(['true true', 'false', 'false false'])
  })

  it('예제 4: M1 동결만 뺀 배열 / M2 raw도 열거된다 / M3 strict에서도 조용히 무시', () => {
    expect(model4('M1')).toEqual(['false false true', 'z 0,1'])
    expect(model4('M2')).toEqual(['true true true', 'TypeError', 'a 0,1,raw'])
    expect(model4('M3')).toEqual(['true true true', 'a 0,1'])
  })

  it('예제 5: M1 raw도 이스케이프를 해석한다 / M2 String.raw는 넘긴 값을 모두 붙인다', () => {
    expect(model5('M1')).toEqual(['"a\\tb" 3', '"a\\tb" 3', '"a\\tb2c"', 'false', 'x1y'])
    expect(model5('M2')).toEqual(['"a\\tb" 3', '"a\\\\tb" 4', '"a\\\\tb2c"', 'true', 'x1y2'])
  })

  it('예제 6: M1 태그가 있어도 SyntaxError(출력 없음) / M2 cooked도 raw와 같은 글자', () => {
    expect(model6('M1')).toEqual({ out: [], error: 'SyntaxError' })
    expect(model6('M2')).toEqual({
      out: ['\\unicode "\\\\unicode"', 'C:\\xyz "C:\\\\xyz"', '\\unicode'],
      error: null,
    })
  })

  it('모든 틀린 모델의 출력은 정답과 다르다', () => {
    for (const [n, { wrongLines }] of Object.entries(MODEL_OUTPUT)) {
      const correct = concept.examples[Number(n) - 1].expectedOutput
      for (const lines of wrongLines) expect(lines, `예제 ${n}`).not.toEqual(correct)
    }
    expect(model6('M1').out).not.toEqual(expectedOf('invalid-escape'))
  })
})

// --- 탐침: 본문 주장 -----------------------------------------------------------------------------

describe('탐침', () => {
  it('태그 없는 템플릿 리터럴의 잘못된 이스케이프는 SyntaxError이고 앞줄의 출력도 없다', () => {
    expect(runCollect("console.log('before');\n`\\unicode`")).toEqual({
      out: [],
      error: 'SyntaxError',
    })
    expect(runCollect("console.log('before');\n`C:\\xyz`")).toEqual({
      out: [],
      error: 'SyntaxError',
    })
  })

  it('프로퍼티 참조로 부르면 this가 그 객체다', () => {
    expect(show('var obj = { tag(s) { return this === obj; } }; obj.tag`x`')).toBe('true')
  })

  it('평가 순서는 태그 식, ${} 식 왼쪽부터, 호출이다', () => {
    const code = [
      'var log = [];',
      "function tagExpr() { log.push('tag'); return function () { log.push('call'); return log.join(','); }; }",
      "function v(n) { log.push('v' + n); return n; }",
      'tagExpr()`x${v(1)}y${v(2)}z`',
    ].join('\n')
    expect(show(code)).toBe('tag,v1,v2,call')
  })

  it('템플릿 객체와 raw의 프로퍼티 디스크립터와 동결', () => {
    const code = [
      'function keep(s) { return s; }',
      'var s = keep`a${1}b`;',
      "var d0 = Object.getOwnPropertyDescriptor(s, '0');",
      "var dr = Object.getOwnPropertyDescriptor(s, 'raw');",
      "var r0 = Object.getOwnPropertyDescriptor(s.raw, '0');",
      '[d0.writable, d0.enumerable, d0.configurable, dr.writable, dr.enumerable, dr.configurable,',
      ' r0.writable, r0.enumerable, r0.configurable, Object.isFrozen(s), Object.isFrozen(s.raw)].join()',
    ].join('\n')
    expect(show(code)).toBe('false,true,false,false,false,false,false,true,false,true,true')
  })

  it('sloppy mode에서 조각 배열 대입은 무시되고 push는 TypeError다', () => {
    const code = [
      'function keep(s) { return s; }',
      "var s = keep`a`; s[0] = 'z'; var r = s[0]; var e;",
      "try { s.push('q'); } catch (x) { e = x.name; }",
      "r + ' ' + e",
    ].join('\n')
    expect(show(code)).toBe('a TypeError')
  })

  it('잘못된 이스케이프가 든 조각만 undefined이고 다른 조각은 정상이다', () => {
    const code = [
      'function t(s) { return String(s[0]) + " " + s[1] + " " + JSON.stringify(s.raw); }',
      't`\\u${1}ok`',
    ].join('\n')
    expect(show(code)).toBe('undefined ok ["\\\\u","ok"]')
  })

  it('\\x 뒤가 16진수가 아닌 조각도 태그가 있으면 undefined, 태그가 없으면 SyntaxError다', () => {
    expect(show('function t(s) { return String(s[0]) + " " + s.raw[0]; } t`C:\\xyz`')).toBe(
      'undefined C:\\xyz',
    )
    expect(show('`C:\\xyz`')).toBe('SyntaxError')
  })

  it('eval로 다시 파싱하면 다른 템플릿 객체이고, 같은 위치의 반복은 같은 객체다', () => {
    const code = [
      'function keep(s) { return s; }',
      "var src = 'keep`x`';",
      'var a = eval(src), b = eval(src);',
      'var r = [];',
      'for (var i = 0; i < 2; i++) r.push(keep`x`);',
      "(a === b) + ' ' + (r[0] === r[1])",
    ].join('\n')
    expect(show(code)).toBe('false true')
  })

  it('같은 위치에서 태그 함수만 달라도 같은 템플릿 객체다', () => {
    const code = [
      'function a(s) { return s; } function b(s) { return s; }',
      'var r = [];',
      'for (var f of [a, b]) r.push(f`x`);',
      'r[0] === r[1]',
    ].join('\n')
    expect(show(code)).toBe('true')
  })

  it('raw 문자열에서도 CRLF는 LF로 바뀐다', () => {
    const code =
      'function t(s) { return JSON.stringify(s[0]) + JSON.stringify(s.raw[0]); }\nt`a\r\nb`'
    expect(show(code)).toBe('"a\\nb""a\\nb"')
    const lone =
      'function t(s) { return JSON.stringify(s[0]) + JSON.stringify(s.raw[0]); }\nt`a\rb`'
    expect(show(lone)).toBe('"a\\nb""a\\nb"')
  })

  it('Function 생성자로 다시 파싱하면 다른 템플릿 객체이고, 같은 함수를 두 번 부르면 같은 객체다', () => {
    const code = [
      'function keep(s) { return s; }',
      "var f = Function('keep', 'return keep`x`;');",
      "var g = Function('keep', 'return keep`x`;');",
      "(f(keep) === g(keep)) + ' ' + (f(keep) === f(keep))",
    ].join('\n')
    expect(show(code)).toBe('false true')
  })

  it('\\u 뒤에 {가 오는 코드 포인트 이스케이프는 잘못된 이스케이프가 아니다', () => {
    expect(show('function t(s) { return s[0] + " " + s.raw[0]; } t`\\u{41}`')).toBe('A \\u{41}')
    expect(show('`\\u{41}`')).toBe('A')
  })

  it('태그와 템플릿 사이에 공백·줄바꿈이 있어도 태그드 템플릿이고, 세미콜론 없는 줄 다음의 백틱 줄은 앞 식의 태그가 된다', () => {
    expect(show('function keep(s) { return s; }\nArray.isArray(keep   `y`)')).toBe('true')
    const code = [
      'function keep(s) { return s; }',
      'var r = keep',
      '`x`;',
      'Array.isArray(r) + " " + JSON.stringify(r)',
    ].join('\n')
    expect(show(code)).toBe('true ["x"]')
  })

  it('String.raw는 raw의 각 인덱스 값을 ToString해 읽고, 값이 모자라면 남은 자리에 아무것도 끼우지 않는다', () => {
    expect(show("String.raw({ raw: 'abc' }, '-', '+')")).toBe('a-b+c')
    expect(show("String.raw({ raw: ['x', 'y', 'z'] }, 1)")).toBe('x1yz')
  })

  it('다음 줄의 백틱은 앞 줄 끝의 MemberExpression만 태그로 삼고, 함수가 아니면 TypeError, return 뒤에서는 세미콜론이 삽입된다', () => {
    const tag = 'function keep(s) { return s; }\n'
    expect(show(tag + 'var a = 1 + keep\n`x`;\na')).toBe('1x')
    expect(show("var s = 'str'\n`x`;")).toBe('TypeError')
    expect(show('function r() {\n  return\n  `x`;\n}\nString(r())')).toBe('undefined')
  })

  it('String.raw는 raw의 length를 먼저 읽고(LengthOfArrayLike) 인덱스 값을 차례로 읽는다', () => {
    const code = [
      'var log = [];',
      'var raw = {',
      "  get length() { log.push('length'); return 2; },",
      "  get 0() { log.push('0'); return 'a'; },",
      "  get 1() { log.push('1'); return 'b'; },",
      '};',
      "String.raw({ raw: raw }, 1) + ' ' + log.join()",
    ].join('\n')
    expect(show(code)).toBe('a1b length,0,1')
    expect(show("String.raw({ raw: { length: '2', 0: 1, 1: 2 } }, '-')")).toBe('1-2')
  })

  it('동결된 템플릿 객체도 WeakMap의 키로 써서 위치마다 값을 기억할 수 있다', () => {
    const code = [
      'var seen = new WeakMap();',
      'function count(s) { var n = (seen.get(s) || 0) + 1; seen.set(s, n); return n; }',
      'var out = [];',
      'for (var i = 0; i < 3; i++) out.push(count`k`);',
      'out.push(count`k`);',
      'out.join()',
    ].join('\n')
    expect(show(code)).toBe('1,2,3,1')
  })

  it('숫자 이스케이프 \\1·\\8·\\01은 잘못된 이스케이프이고, 뒤에 숫자가 없는 \\0과 \\q는 유효하다', () => {
    const tag = 'function t(s) { return String(s[0]) + "|" + s.raw[0]; }\n'
    expect(show(tag + 't`C:\\123`')).toBe('undefined|C:\\123')
    expect(show(tag + '[t`\\1`, t`\\8`, t`\\01`].join(" ")')).toBe(
      'undefined|\\1 undefined|\\8 undefined|\\01',
    )
    expect(show('JSON.stringify(`\\q`) + " " + `\\0`.charCodeAt(0)')).toBe('"q" 0')
    expect(show('`C:\\123`')).toBe('SyntaxError')
  })

  it('옵셔널 체이닝 뒤의 태그드 템플릿은 SyntaxError다', () => {
    expect(show('var o = { t() {} }; o?.t`x`')).toBe('SyntaxError')
  })

  it('예제 1의 템플릿은 객체 item 자체와 숫자 8을 값으로 넘긴다', () => {
    const code = [
      'var item = { id: 7 };',
      'function inspect(strings, ...values) {',
      '  return (values[0] === item) + " " + (values[1] === 8) + " " + values.length;',
      '}',
      'inspect`id:${item}, next:${item.id + 1}`',
    ].join('\n')
    expect(show(code)).toBe('true true 2')
  })
})

// --- 분해 표 -----------------------------------------------------------------------------------

type Row = {
  template: string
  strings: string
  raw: string
  rest: string
  example: number
  values: (item: object) => unknown[]
}

const TABLE: Row[] = [
  {
    template: 't`plain`',
    strings: '["plain"]',
    raw: '["plain"]',
    rest: '없음',
    example: 2,
    values: () => [],
  },
  {
    template: 't`${1}${2}`',
    strings: '["","",""]',
    raw: '["","",""]',
    rest: '1, 2',
    example: 2,
    values: () => [1, 2],
  },
  {
    template: 't`id:${item}, next:${item.id + 1}`',
    strings: '["id:",", next:",""]',
    raw: '["id:",", next:",""]',
    rest: 'item 그 자체(===), 8',
    example: 1,
    values: (item) => [item, 8],
  },
  {
    template: 't`a\\tb`',
    strings: '["a\\tb"]',
    raw: '["a\\\\tb"]',
    rest: '없음',
    example: 5,
    values: () => [],
  },
  {
    template: 't`\\unicode`',
    strings: '[undefined]',
    raw: '["\\\\unicode"]',
    rest: '없음',
    example: 6,
    values: () => [],
  },
]

// 예제 파일마다 그 파일이 쓰는 태그 함수 이름.
const TAG_OF_FILE: Record<string, string> = {
  'tag-arguments.js': 'inspect',
  'strings-count.js': 'count',
  'same-site.js': 'keep',
  'frozen-template.js': 'keep',
  'cooked-raw.js': 'both',
  'invalid-escape.js': 'both',
}

const stringsText = (arr: ArrayLike<unknown>) =>
  '[' +
  Array.from(arr)
    .map((x) => (x === undefined ? 'undefined' : JSON.stringify(x)))
    .join(',') +
  ']'

// 표 칸의 백슬래시는 JSX 문자열 식 안이라 짝으로만 나와야 한다. 짝을 풀면 JS 문자열 해석과 같다.
const PAIRS_ONLY = /^(?:[^\\]|\\\\)*$/
function unescapePairs(cell: string): string {
  expect(cell, '백슬래시는 짝으로만 나와야 한다').toMatch(PAIRS_ONLY)
  return cell.replace(/\\\\/g, '\\')
}

describe('분해 표', () => {
  const rows = tableBody(mdx, ['템플릿', 'strings', 'strings.raw', '나머지 인수', '예제'])

  it('행이 5개이고 템플릿 칸이 정의와 같다', () => {
    expect(rows).toHaveLength(TABLE.length)
    expect(rows.map((r) => unescapePairs(r[0]))).toEqual(TABLE.map((t) => t.template))
  })

  it.each(TABLE.map((t, i) => [i + 1, t] as const))('행 %i', (i, t) => {
    const row = rows[i - 1]
    const [template, strings, raw, rest, example] = [
      unescapePairs(row[0]),
      unescapePairs(row[1]),
      unescapePairs(row[2]),
      row[3],
      row[4],
    ]
    // 칸 전체 문구를 정확히 비교한다.
    expect(template).toBe(t.template)
    expect(strings).toBe(t.strings)
    expect(raw).toBe(t.raw)
    expect(rest).toBe(t.rest)
    expect(example).toBe(String(t.example))

    // 행의 템플릿을 실제로 평가한다: 태그 t가 받은 인수를 기록한다.
    const item = { id: 7 }
    const calls: { s: ArrayLike<unknown> & { raw: ArrayLike<unknown> }; v: unknown[] }[] = []
    const record = (s: ArrayLike<unknown> & { raw: ArrayLike<unknown> }, ...v: unknown[]) => {
      calls.push({ s, v })
    }
    runInNewContext(template, { t: record, item })
    expect(calls).toHaveLength(1)
    const { s, v } = calls[0]
    expect(strings).toBe(stringsText(s))
    expect(raw).toBe(stringsText(s.raw))

    // 나머지 인수 칸의 문구가 실제 값과 맞다.
    const expectedValues = t.values(item)
    expect(v).toHaveLength(expectedValues.length)
    expectedValues.forEach((x, k) => expect(v[k]).toBe(x))
    if (i === 3) {
      expect(v[0]).toBe(item)
      expect(v[1]).toBe(8)
    }

    // 예제 칸: 그 행의 템플릿이 해당 예제 파일에 있고 다른 예제 파일에는 없다(t 대신 그 파일의 태그 이름으로 바꿔 찾는다).
    const ownFile = concept.examples[t.example - 1].file
    for (const [file, tag] of Object.entries(TAG_OF_FILE)) {
      const needle = tag + template.slice(1)
      const has = readExample(file).includes(needle)
      expect(has, `${file}에서 ${needle}`).toBe(file === ownFile)
    }
  })
})

// --- 퀴즈 -------------------------------------------------------------------------------------

const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
  const body = m[1]
  const question = body.match(/question="([^"]*)"/)![1]
  const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
  // 선택지는 JS 문자열이다. 백슬래시를 짝으로만 쓰는지 확인하고 해석한다.
  const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) =>
    unescapePairs(c[1]),
  )
  const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
  const example = Number(question.match(/예제 (\d+)/)![1])
  return { block: body, choices, answer, example }
})

describe('퀴즈', () => {
  const numbers = [1, 2, 3, 4, 5, 6]
  const choiceCounts = [4, 3, 4, 4, 3, 3]
  const M1_6 = '아무것도 출력되지 않고 SyntaxError로 실행이 멈춥니다'

  it('퀴즈가 예제 1~6마다 하나씩 6개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(6)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const expected = concept.examples[n - 1].expectedOutput.join(' / ')
    expect(quiz.choices).toHaveLength(choiceCounts[n - 1])
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)('예제 %i 퀴즈: 오답은 틀린 모델의 출력과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const modelOutputs = [...MODEL_OUTPUT[n].wrong]
    if (n === 6) modelOutputs.unshift(M1_6) // M1은 출력이 없고 SyntaxError로 멈추는 모델이다
    expect(new Set(wrong)).toEqual(new Set(modelOutputs))
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })

  it('explanation 속성에는 큰따옴표와 백슬래시가 없다', () => {
    for (const q of quizzes) {
      expect(q.block, `예제 ${q.example}`).toMatch(/explanation="[^"\\]*"\s*$/)
    }
  })
})

// --- 메타와 본문 조건 --------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 292이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(292)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('title·summary·goals에 백틱이 없다', () => {
    const texts = [concept.title, concept.summary, ...concept.goals]
    for (const t of texts) expect(t).not.toContain('`')
  })

  it('본문 첫 평문 줄에 백틱이 없다', () => {
    const first = mdx.split('\n').find((l) => l.trim() && !/^(#|import |export |<|```)/.test(l))!
    expect(first).not.toContain('`')
  })

  it('설계 의도와 만드는 시점을 단정하는 문구가 없다', () => {
    expect(mdx).not.toMatch(/동결.{0,30}위해|위해.{0,30}동결|처음 평가할 때 만들/)
  })

  it('16진수 4자리 유니코드 이스케이프를 쓰지 않는다', () => {
    const files = [
      mdx,
      readFileSync(join(dir, 'meta.ts'), 'utf8'),
      ...concept.examples.map((e) => readExample(e.file)),
    ]
    for (const text of files) expect(text).not.toMatch(/\\u[0-9a-fA-F]{4}/)
  })

  it('판 이력은 ES2017판까지와 ES2018판부터로 쓴다', () => {
    expect(mdx).toContain('ES2017판까지')
    expect(mdx).toContain('ES2018판부터')
  })

  it('뒤 개념(객체를 원시 값으로)은 "에서 다룹니다" 꼴이고 simplifications는 개념 이름으로 가리킨다', () => {
    expect(mdx).toMatch(/\[객체를 원시 값으로\]\(\/concepts\/to-primitive\)에서 다룹니다/)
    expect(concept.simplifications.join(' ')).toContain('객체를 원시 값으로 개념에서 다룹니다')
  })
})
