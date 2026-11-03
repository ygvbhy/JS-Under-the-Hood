import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { IterView } from './IterView'
import type { IterState } from './scenarios'

type Props = {
  scenarios: Scenario<IterState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 이터레이터 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="이터레이터 시뮬레이터"
      renderState={(state, prevState) => <IterView state={state} prevState={prevState} />}
    />
  )
}
