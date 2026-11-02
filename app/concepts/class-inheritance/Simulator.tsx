import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { InheritView } from './InheritView'
import type { InheritState } from './scenarios'

type Props = {
  scenarios: Scenario<InheritState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 클래스 상속 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="클래스 상속 시뮬레이터"
      renderState={(state) => <InheritView state={state} />}
    />
  )
}
