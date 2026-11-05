// 본문 "값별 결과표로 정리" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 행의 setup 뒤에 열의 probe를 붙여 새 vm 컨텍스트에서 실행하고, 그 결과(문자열)가 cells[i]와 같은지 확인한다.
// 결과가 undefined 값이면 RETURNS_UNDEFINED, 예외가 나면 예외의 name(TypeError)이 결과 문자열이 된다.
export const RETURNS_UNDEFINED = '(undefined)'

export const columns: { key: string; label: string; probe: string }[] = [
  { key: 'property', label: 'JSON.stringify({ v: x })', probe: 'JSON.stringify({ v: x })' },
  { key: 'element', label: 'JSON.stringify([x])', probe: 'JSON.stringify([x])' },
  { key: 'top', label: 'JSON.stringify(x)', probe: 'JSON.stringify(x)' },
]

// probe를 감싸는 실행 코드: undefined는 RETURNS_UNDEFINED로, 예외는 name으로 바꿔 문자열로 비교한다.
export function wrapProbe(probe: string): string {
  return `var r; try { r = ${probe}; r === undefined ? '${RETURNS_UNDEFINED}' : r } catch (e) { e.name }`
}

export const rows: {
  value: string
  setup: string
  cells: [string, string, string]
}[] = [
  {
    value: 'undefined',
    setup: 'var x = undefined;',
    cells: ['{}', '[null]', RETURNS_UNDEFINED],
  },
  {
    value: 'function () {}',
    setup: 'var x = function () {};',
    cells: ['{}', '[null]', RETURNS_UNDEFINED],
  },
  {
    value: "Symbol('s')",
    setup: "var x = Symbol('s');",
    cells: ['{}', '[null]', RETURNS_UNDEFINED],
  },
  { value: 'null', setup: 'var x = null;', cells: ['{"v":null}', '[null]', 'null'] },
  { value: 'NaN', setup: 'var x = NaN;', cells: ['{"v":null}', '[null]', 'null'] },
  { value: 'Infinity', setup: 'var x = Infinity;', cells: ['{"v":null}', '[null]', 'null'] },
  { value: '-0', setup: 'var x = -0;', cells: ['{"v":0}', '[0]', '0'] },
  { value: "'hi'", setup: "var x = 'hi';", cells: ['{"v":"hi"}', '["hi"]', '"hi"'] },
  {
    value: 'new Date(0)',
    setup: 'var x = new Date(0);',
    cells: [
      '{"v":"1970-01-01T00:00:00.000Z"}',
      '["1970-01-01T00:00:00.000Z"]',
      '"1970-01-01T00:00:00.000Z"',
    ],
  },
  {
    value: 'new Number(1)',
    setup: 'var x = new Number(1);',
    cells: ['{"v":1}', '[1]', '1'],
  },
  {
    value: 'new Map([[1, 2]])',
    setup: 'var x = new Map([[1, 2]]);',
    cells: ['{"v":{}}', '[{}]', '{}'],
  },
  { value: '1n', setup: 'var x = 1n;', cells: ['TypeError', 'TypeError', 'TypeError'] },
  {
    value: 'var x = {}; x.self = x;',
    setup: 'var x = {}; x.self = x;',
    cells: ['TypeError', 'TypeError', 'TypeError'],
  },
]
