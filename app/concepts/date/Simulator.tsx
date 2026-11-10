import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { DateFieldsView } from './DateFieldsView'
import type { DateFieldsState } from './scenarios'

type Props = {
  scenarios: Scenario<DateFieldsState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 Date 필드 계산 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="Date 필드 계산 시뮬레이터"
      renderState={(state, prevState) => <DateFieldsView state={state} prevState={prevState} />}
    />
  )
}
