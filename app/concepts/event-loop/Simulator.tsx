import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { LoopView } from './LoopView'
import type { LoopState } from './scenarios'

type Props = {
  scenarios: Scenario<LoopState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 이벤트 루프 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="이벤트 루프 시뮬레이터"
      renderState={(state, prevState) => <LoopView state={state} prevState={prevState} />}
    />
  )
}
