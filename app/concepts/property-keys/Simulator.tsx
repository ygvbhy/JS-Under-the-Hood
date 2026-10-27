import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { PropertyView } from './PropertyView'
import type { PropertyState } from './scenarios'

type Props = {
  scenarios: Scenario<PropertyState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 프로퍼티 접근 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="프로퍼티 키 시뮬레이터"
      renderState={(state, prevState) => <PropertyView state={state} prevState={prevState} />}
    />
  )
}
