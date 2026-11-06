import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ModuleGraphView } from './ModuleGraphView'
import type { ModuleState } from './scenarios'

type Props = {
  scenarios: Scenario<ModuleState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 모듈 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="ES 모듈 시뮬레이터"
      renderState={(state, prevState) => <ModuleGraphView state={state} prevState={prevState} />}
    />
  )
}
