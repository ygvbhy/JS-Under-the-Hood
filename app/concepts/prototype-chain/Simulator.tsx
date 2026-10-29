import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ProtoView } from './ProtoView'
import type { ProtoState } from './scenarios'

type Props = {
  scenarios: Scenario<ProtoState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 프로토타입 체인 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="프로토타입 체인 시뮬레이터"
      renderState={(state) => <ProtoView state={state} />}
    />
  )
}
