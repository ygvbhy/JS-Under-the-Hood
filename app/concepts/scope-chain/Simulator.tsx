import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ScopeView } from './ScopeView'
import type { ScopeState } from './scenarios'

type Props = {
  scenarios: Scenario<ScopeState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 스코프 체인 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="스코프 체인 시뮬레이터"
      renderState={(state) => <ScopeView state={state} />}
    />
  )
}
