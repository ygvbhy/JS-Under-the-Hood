import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { TdzView } from './TdzView'
import type { TdzState } from './scenarios'

type Props = {
  scenarios: Scenario<TdzState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 TDZ 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="TDZ 시뮬레이터"
      renderState={(state) => <TdzView state={state} />}
    />
  )
}
