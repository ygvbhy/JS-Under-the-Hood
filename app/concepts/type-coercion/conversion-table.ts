// 본문 변환 표의 데이터. content.mdx가 이 배열로 표를 그리고,
// concept.test.ts가 같은 배열을 vm 실행 결과와 대조한다(본문 표와 검증이 어긋나지 않게).
// source: 소스 표기, toString: 결과 문자열을 큰따옴표로 감싼 표기,
// toNumber: String(n) (NaN 포함), toBoolean: 'true' | 'false'
export type ConversionRow = {
  source: string
  toString: string
  toNumber: string
  toBoolean: 'true' | 'false'
}

export const conversionTable: ConversionRow[] = [
  { source: 'undefined', toString: '"undefined"', toNumber: 'NaN', toBoolean: 'false' },
  { source: 'null', toString: '"null"', toNumber: '0', toBoolean: 'false' },
  { source: 'true', toString: '"true"', toNumber: '1', toBoolean: 'true' },
  { source: 'false', toString: '"false"', toNumber: '0', toBoolean: 'false' },
  { source: '0', toString: '"0"', toNumber: '0', toBoolean: 'false' },
  { source: "''", toString: '""', toNumber: '0', toBoolean: 'false' },
  { source: "'0'", toString: '"0"', toNumber: '0', toBoolean: 'true' },
  { source: "' 12 '", toString: '" 12 "', toNumber: '12', toBoolean: 'true' },
  { source: "'12px'", toString: '"12px"', toNumber: 'NaN', toBoolean: 'true' },
]
