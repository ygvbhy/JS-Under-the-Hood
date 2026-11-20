import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ToPrimitiveView } from './ToPrimitiveView'
import type { ToPrimitiveState } from './scenarios'

type Props = {
  scenarios: Scenario<ToPrimitiveState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 ToPrimitive 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="객체를 원시 값으로 시뮬레이터"
      renderState={(state, prevState) => <ToPrimitiveView state={state} prevState={prevState} />}
    />
  )
}
