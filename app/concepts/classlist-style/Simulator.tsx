import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { AttributeObjectView } from './AttributeObjectView'
import type { AttributeObjectState } from './scenarios'

type Props = {
  scenarios: Scenario<AttributeObjectState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 어트리뷰트·토큰 집합·선언 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="classList와 style 시뮬레이터"
      renderState={(state, prevState) => (
        <AttributeObjectView state={state} prevState={prevState} />
      )}
    />
  )
}
