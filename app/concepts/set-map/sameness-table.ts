// 본문 "같음 비교표로 정리" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 행의 setup 뒤에 열의 probe(짧은 스크립트)를 붙여 새 vm 컨텍스트에서 실행하고, 완료 값이 String(same[i])와 같은지 확인한다.
// same이 true면 표에 '같음', false면 '다름'으로 보인다.
// code가 true인 열 이름은 코드라서 본문 표에서 <code>로 감싸 줄바꿈되지 않게 한다.
export const columns: { key: string; label: string; probe: string; code?: boolean }[] = [
  { key: 'strict', label: 'a === b', probe: 'String(a === b)', code: true },
  { key: 'is', label: 'Object.is(a, b)', probe: 'String(Object.is(a, b))', code: true },
  {
    key: 'collection',
    label: 'Set·Map (SameValueZero)',
    probe: 'String(new Set([a, b]).size === 1)',
  },
  {
    key: 'object',
    label: '일반 객체 키',
    probe:
      'var o = {}; o[a] = 1; o[b] = 2; String(Object.keys(o).length + Object.getOwnPropertySymbols(o).length === 1)',
  },
]

// Map이 Set과 같은 기준으로 키를 구분하는지 테스트가 따로 확인한다(표에는 열을 두지 않는다).
export const mapProbe = 'String(new Map([[a, 1], [b, 2]]).size === 1)'

export const rows: {
  pair: string
  setup: string
  same: [boolean, boolean, boolean, boolean]
}[] = [
  { pair: 'NaN, NaN', setup: 'var a = NaN, b = NaN;', same: [false, true, true, true] },
  { pair: '0, -0', setup: 'var a = 0, b = -0;', same: [true, false, true, true] },
  { pair: "1, '1'", setup: "var a = 1, b = '1';", same: [false, false, false, true] },
  { pair: "true, 'true'", setup: "var a = true, b = 'true';", same: [false, false, false, true] },
  { pair: "'a', 'a'", setup: "var a = 'a', b = 'a';", same: [true, true, true, true] },
  {
    pair: '{}, {} (서로 다른 객체)',
    setup: 'var a = {}, b = {};',
    same: [false, false, false, true],
  },
  { pair: 'a, a (같은 객체)', setup: 'var a = {}, b = a;', same: [true, true, true, true] },
  {
    pair: "Symbol('k'), Symbol('k')",
    setup: "var a = Symbol('k'), b = Symbol('k');",
    same: [false, false, false, false],
  },
]
