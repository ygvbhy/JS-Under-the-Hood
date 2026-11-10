import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { AllLedgerView } from './AllLedgerView'
import type { AllLedgerState } from './scenarios'

type Props = {
  scenarios: Scenario<AllLedgerState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 Promise.all 장부 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="Promise.all 장부 시뮬레이터"
      renderState={(state, prevState) => <AllLedgerView state={state} prevState={prevState} />}
    />
  )
}
