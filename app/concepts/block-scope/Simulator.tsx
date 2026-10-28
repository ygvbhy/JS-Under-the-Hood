import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { BlockView } from './BlockView'
import type { BlockState } from './scenarios'

type Props = {
  scenarios: Scenario<BlockState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 블록 스코프 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="블록 스코프 시뮬레이터"
      renderState={(state) => <BlockView state={state} />}
    />
  )
}
