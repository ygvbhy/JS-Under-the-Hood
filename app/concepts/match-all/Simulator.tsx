import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { MatchAllView } from './MatchAllView'
import type { MatchAllState } from './scenarios'

type Props = {
  scenarios: Scenario<MatchAllState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="matchAll 시뮬레이터"
      renderState={(state, prevState) => <MatchAllView state={state} prevState={prevState} />}
    />
  )
}
