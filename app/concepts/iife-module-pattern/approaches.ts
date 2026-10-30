// 본문 "전역 이름을 줄이는 방법" 비교표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// exampleId가 null이 아닌 행은 테스트가 그 예제를 실행해, 실행 전후 전역 객체에 새로 생긴 자기 프로퍼티 이름이 globals와 같은지 확인한다.
export const approaches: {
  method: string
  exampleId: string | null
  globals: string[]
  hidden: string
  changeable: string
}[] = [
  {
    method: '전역 var·함수 선언',
    exampleId: 'name-collision',
    globals: ['version', 'init'],
    hidden: '없음',
    changeable: '전부(같은 이름으로 다시 선언하거나 대입)',
  },
  {
    method: '네임스페이스 객체',
    exampleId: 'namespace',
    globals: ['MyApp'],
    hidden: '없음',
    changeable: '프로퍼티 전부',
  },
  {
    method: '즉시 실행 함수',
    exampleId: 'iife-basic',
    globals: ['result'],
    hidden: '함수 안의 var·let·함수 선언',
    changeable: '결과를 담은 전역 이름',
  },
  {
    method: '모듈 패턴',
    exampleId: 'module-pattern',
    globals: ['Counter'],
    hidden: '함수 안의 변수(count)',
    changeable: '반환한 객체의 프로퍼티',
  },
  {
    method: '블록 + let·const',
    exampleId: 'block-let',
    globals: [],
    hidden: '블록 안의 let·const',
    changeable: '없음',
  },
  {
    method: 'ES 모듈',
    exampleId: null,
    globals: [],
    hidden: '별도 개념',
    changeable: '별도 개념',
  },
]
