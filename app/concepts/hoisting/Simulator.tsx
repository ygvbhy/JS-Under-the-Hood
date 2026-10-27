import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { HoistView } from './HoistView'
import type { HoistState } from './scenarios'

type Props = {
  scenarios: Scenario<HoistState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 호이스팅 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="호이스팅 시뮬레이터"
      renderState={(state) => <HoistView state={state} />}
    />
  )
}
