// 본문 값 쌍 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// left·right는 피연산자의 소스 문자열이고, 칸의 결과는 하드코딩한 값이다(concept.test.ts가 실제로 평가해 대조한다).
export type Pair = {
  left: string
  right: string
  lt: boolean
  gt: boolean
  le: boolean
  ge: boolean
  eq: boolean
}

export const pairs: Pair[] = [
  { left: 'null', right: '0', lt: false, gt: false, le: true, ge: true, eq: false },
  { left: 'undefined', right: '0', lt: false, gt: false, le: false, ge: false, eq: false },
  { left: 'NaN', right: '1', lt: false, gt: false, le: false, ge: false, eq: false },
  { left: "''", right: '0', lt: false, gt: false, le: true, ge: true, eq: true },
  { left: "' '", right: '0', lt: false, gt: false, le: true, ge: true, eq: true },
  { left: "'abc'", right: '1', lt: false, gt: false, le: false, ge: false, eq: false },
  { left: 'false', right: '0', lt: false, gt: false, le: true, ge: true, eq: true },
  { left: 'null', right: 'undefined', lt: false, gt: false, le: false, ge: false, eq: true },
]
