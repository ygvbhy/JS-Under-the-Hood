import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { NodeMoveView } from './NodeMoveView'
import type { NodeMoveState } from './scenarios'

type Props = {
  scenarios: Scenario<NodeMoveState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 노드 트리 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="DOM 조작 시뮬레이터"
      renderState={(state, prevState) => <NodeMoveView state={state} prevState={prevState} />}
    />
  )
}
