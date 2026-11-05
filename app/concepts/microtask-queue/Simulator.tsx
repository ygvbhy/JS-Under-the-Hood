import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { MicroView } from './MicroView'
import type { MicroState } from './scenarios'

type Props = {
  scenarios: Scenario<MicroState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 마이크로태스크 큐 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="마이크로태스크 큐 시뮬레이터"
      renderState={(state, prevState) => <MicroView state={state} prevState={prevState} />}
    />
  )
}
