import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ArgumentsView } from './ArgumentsView'
import type { ArgumentsState } from './scenarios'

type Props = {
  scenarios: Scenario<ArgumentsState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 arguments 객체 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="arguments 객체 시뮬레이터"
      renderState={(state) => <ArgumentsView state={state} />}
    />
  )
}
