import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { DefaultParametersView } from './DefaultParametersView'
import type { DefaultParametersState } from './scenarios'

type Props = {
  scenarios: Scenario<DefaultParametersState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 매개변수 기본값 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="매개변수 기본값 시뮬레이터"
      renderState={(state) => <DefaultParametersView state={state} />}
    />
  )
}
