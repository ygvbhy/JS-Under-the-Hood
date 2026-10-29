import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { NewView } from './NewView'
import type { NewState } from './scenarios'

type Props = {
  scenarios: Scenario<NewState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 new 연산자 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="new 연산자 시뮬레이터"
      renderState={(state) => <NewView state={state} />}
    />
  )
}
