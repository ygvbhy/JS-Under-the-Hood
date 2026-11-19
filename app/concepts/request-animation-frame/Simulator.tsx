import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { FrameView } from './FrameView'
import type { RafState } from './scenarios'

type Props = {
  scenarios: Scenario<RafState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 애니메이션 프레임 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="requestAnimationFrame 시뮬레이터"
      renderState={(state, prevState) => <FrameView state={state} prevState={prevState} />}
    />
  )
}
