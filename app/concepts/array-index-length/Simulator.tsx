import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ArrayView } from './ArrayView'
import type { ArrayState } from './scenarios'

type Props = {
  scenarios: Scenario<ArrayState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 배열 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="배열 length 시뮬레이터"
      renderState={(state, prevState) => <ArrayView state={state} prevState={prevState} />}
    />
  )
}
