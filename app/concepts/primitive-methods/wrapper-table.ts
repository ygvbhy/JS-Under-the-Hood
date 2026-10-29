// 본문 "원시 타입별 정리" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 결과 표기 규칙(테스트가 같은 규칙으로 vm에서 평가해 비교한다)
// - readSource 결과: 문자열은 작은따옴표로 감싼다('5.0'), 그 밖의 값은 String(값)(2), 오류는 오류 이름(TypeError)
// - newSource 결과: 'typeof: ' + typeof 값(typeof: object), 오류는 오류 이름(TypeError)
// - newSource가 null이면 해당 없음(null·undefined에는 래퍼 객체가 없다)
export const wrapperTable: {
  type: string
  wrapper: string
  readSource: string
  readResult: string
  newSource: string | null
  newResult: string | null
}[] = [
  {
    type: 'String',
    wrapper: 'String',
    readSource: "'hi'.length",
    readResult: '2',
    newSource: "new String('hi')",
    newResult: 'typeof: object',
  },
  {
    type: 'Number',
    wrapper: 'Number',
    readSource: '(5).toFixed(1)',
    readResult: "'5.0'",
    newSource: 'new Number(5)',
    newResult: 'typeof: object',
  },
  {
    type: 'Boolean',
    wrapper: 'Boolean',
    readSource: 'true.toString()',
    readResult: "'true'",
    newSource: 'new Boolean(true)',
    newResult: 'typeof: object',
  },
  {
    type: 'Symbol',
    wrapper: 'Symbol',
    readSource: "Symbol('id').description",
    readResult: "'id'",
    newSource: "new Symbol('id')",
    newResult: 'TypeError',
  },
  {
    type: 'BigInt',
    wrapper: 'BigInt',
    readSource: '(10n).toString()',
    readResult: "'10'",
    newSource: 'new BigInt(10)',
    newResult: 'TypeError',
  },
  {
    type: 'Null',
    wrapper: '없음',
    readSource: 'null.x',
    readResult: 'TypeError',
    newSource: null,
    newResult: null,
  },
  {
    type: 'Undefined',
    wrapper: '없음',
    readSource: 'undefined.x',
    readResult: 'TypeError',
    newSource: null,
    newResult: null,
  },
]
