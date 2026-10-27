import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ComparisonView } from './ComparisonView'
import type { EqState } from './scenarios'

type Props = {
  scenarios: Scenario<EqState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 비교 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="동등 비교 시뮬레이터"
      renderState={(state) => <ComparisonView state={state} />}
    />
  )
}
