import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { AsyncView } from './AsyncView'
import type { AsyncState } from './scenarios'

type Props = {
  scenarios: Scenario<AsyncState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 async/await 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="async/await 시뮬레이터"
      renderState={(state, prevState) => <AsyncView state={state} prevState={prevState} />}
    />
  )
}
