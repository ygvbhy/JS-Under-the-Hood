export type LineRange = { from: number; to: number } // 1-based, inclusive

export type Step<S> = {
  title: string // "q.n에 2를 할당 (객체 변경)"
  explanation: string // 왜 이렇게 되는지 (평문 1~3문장)
  line?: LineRange // 현재 실행 위치; 시작/종료 단계는 생략 가능
  state: S // 이 단계 시점의 전체 상태
  output?: string[] // 이 단계까지 누적된 console 출력 (출력 없는 개념은 생략)
}

export type Scenario<S> = {
  id: string // URL-safe
  label: string
  exampleId: string // meta.examples[].id — 코드 원본·기대 출력의 출처
  code: string // examples/<file>?raw
  steps: Step<S>[] // ≥ 2
}
