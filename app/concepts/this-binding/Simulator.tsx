import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ThisView } from './ThisView'
import type { ThisState } from './scenarios'

type Props = {
  scenarios: Scenario<ThisState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 this 결정 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="this 결정 시뮬레이터"
      renderState={(state) => <ThisView state={state} />}
    />
  )
}
