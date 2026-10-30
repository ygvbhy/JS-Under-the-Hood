// 본문 "전역 객체의 프로퍼티" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// checkable이 null이 아닌 행은 테스트가 vm 새 컨텍스트에서 names가 전역 객체의 자기 프로퍼티인지, 종류('value'·'function'·'object')와 attributes가 맞는지 확인한다.
// null인 행(호스트가 더한 것, 코드가 만든 것)은 호스트·코드에 따라 달라지므로 검증하지 않는다.
export const globalProps: {
  source: string
  names: string[]
  attributes: string
  note: string
  checkable: 'value' | 'function' | 'object' | null
}[] = [
  {
    source: '명세: 값 프로퍼티',
    names: ['globalThis', 'Infinity', 'NaN', 'undefined'],
    attributes:
      'globalThis는 쓰기·재정의 가능, 열거 불가 / 나머지 셋은 쓰기·삭제·재정의 불가, 열거 불가',
    note: '값이 정해져 있는 프로퍼티입니다. 나머지 셋은 대입해도 바뀌지 않습니다.',
    checkable: 'value',
  },
  {
    source: '명세: 함수 프로퍼티',
    names: [
      'eval',
      'isFinite',
      'isNaN',
      'parseFloat',
      'parseInt',
      'decodeURI',
      'decodeURIComponent',
      'encodeURI',
      'encodeURIComponent',
    ],
    attributes: '쓰기 가능, 열거 불가, 재정의 가능',
    note: '빌트인 전역 함수입니다.',
    checkable: 'function',
  },
  {
    source: '명세: 생성자 프로퍼티(일부)',
    names: ['Object', 'Array', 'Number', 'String', 'Boolean', 'Symbol', 'Promise', 'Error'],
    attributes: '쓰기 가능, 열거 불가, 재정의 가능',
    note: '표에는 일부만 적었습니다.',
    checkable: 'function',
  },
  {
    source: '명세: 기타 프로퍼티',
    names: ['Atomics', 'JSON', 'Math', 'Reflect'],
    attributes: '쓰기 가능, 열거 불가, 재정의 가능',
    note: '함수가 아닌 객체 값을 가진 프로퍼티입니다.',
    checkable: 'object',
  },
  {
    source: '호스트가 더한 것(예)',
    names: ['console', 'window', 'document', 'setTimeout', 'global', 'process'],
    attributes: '호스트가 정함',
    note: '브라우저는 window·document, Node.js는 global·process, 둘 다 console·setTimeout을 가집니다. 동작은 호스트가 정합니다.',
    checkable: null,
  },
  {
    source: '코드가 만든 것',
    names: ['전역 var 선언', '전역 함수 선언', '암묵적 전역', 'globalThis.x = … 대입'],
    attributes: '만드는 방법에 따라 다름',
    note: '전역 let·const·class는 전역 객체의 프로퍼티가 되지 않습니다.',
    checkable: null,
  },
]
