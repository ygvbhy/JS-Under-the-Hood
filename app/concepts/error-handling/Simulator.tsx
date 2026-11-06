import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { TryView } from './TryView'
import type { TryState } from './scenarios'

type Props = {
  scenarios: Scenario<TryState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 try/catch/finally 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="try/catch/finally 시뮬레이터"
      renderState={(state, prevState) => <TryView state={state} prevState={prevState} />}
    />
  )
}
