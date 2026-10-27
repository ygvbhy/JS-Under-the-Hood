import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { CallView } from './CallView'
import type { CallState } from './scenarios'

type Props = {
  scenarios: Scenario<CallState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 함수 호출 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="함수 호출 시뮬레이터"
      renderState={(state, prevState) => <CallView state={state} prevState={prevState} />}
    />
  )
}
