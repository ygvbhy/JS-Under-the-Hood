import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { PromiseView } from './PromiseView'
import type { PromiseSimState } from './scenarios'

type Props = {
  scenarios: Scenario<PromiseSimState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 프로미스 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="프로미스 시뮬레이터"
      renderState={(state, prevState) => <PromiseView state={state} prevState={prevState} />}
    />
  )
}
