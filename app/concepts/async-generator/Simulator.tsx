import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { AsyncGenView } from './AsyncGenView'
import type { AsyncGenState } from './scenarios'

type Props = {
  scenarios: Scenario<AsyncGenState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 async 제너레이터 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="async 제너레이터 시뮬레이터"
      renderState={(state, prevState) => <AsyncGenView state={state} prevState={prevState} />}
    />
  )
}
