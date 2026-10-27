import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { FlowView } from './FlowView'
import type { FlowState } from './scenarios'

type Props = {
  scenarios: Scenario<FlowState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 실행 구조 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="switch와 break·continue 시뮬레이터"
      renderState={(state) => <FlowView state={state} />}
    />
  )
}
