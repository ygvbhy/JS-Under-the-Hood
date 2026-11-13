import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { KeyOrderView } from './KeyOrderView'
import type { KeyOrderState } from './scenarios'

type Props = {
  scenarios: Scenario<KeyOrderState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 키 목록 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="키 순서 시뮬레이터"
      renderState={(state, prevState) => <KeyOrderView state={state} prevState={prevState} />}
    />
  )
}
