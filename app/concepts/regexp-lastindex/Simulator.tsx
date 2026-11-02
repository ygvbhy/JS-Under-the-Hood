import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { RegexView } from './RegexView'
import type { RegexState } from './scenarios'

type Props = {
  scenarios: Scenario<RegexState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 배열 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="lastIndex 시뮬레이터"
      renderState={(state, prevState) => <RegexView state={state} prevState={prevState} />}
    />
  )
}
