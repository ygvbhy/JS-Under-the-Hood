import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ClosureView } from './ClosureView'
import type { ClosureState } from './scenarios'

type Props = {
  scenarios: Scenario<ClosureState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 클로저 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="클로저 시뮬레이터"
      renderState={(state) => <ClosureView state={state} />}
    />
  )
}
