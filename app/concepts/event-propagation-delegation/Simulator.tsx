import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { PathView } from './PathView'
import type { PropagationState } from './scenarios'

type Props = {
  scenarios: Scenario<PropagationState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 이벤트 경로 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="이벤트 전파 시뮬레이터"
      renderState={(state, prevState) => <PathView state={state} prevState={prevState} />}
    />
  )
}
