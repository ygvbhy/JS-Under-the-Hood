// 본문 결과 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
export const typeofTable: { source: string; specType: string; result: string }[] = [
  { source: 'undefined', specType: 'Undefined', result: 'undefined' },
  { source: 'null', specType: 'Null', result: 'object' },
  { source: 'true', specType: 'Boolean', result: 'boolean' },
  { source: '42', specType: 'Number', result: 'number' },
  { source: 'NaN', specType: 'Number', result: 'number' },
  { source: "'hi'", specType: 'String', result: 'string' },
  { source: "Symbol('id')", specType: 'Symbol', result: 'symbol' },
  { source: '10n', specType: 'BigInt', result: 'bigint' },
  { source: '{ x: 1 }', specType: 'Object', result: 'object' },
  { source: 'function () {}', specType: 'Object(호출 가능)', result: 'function' },
]
