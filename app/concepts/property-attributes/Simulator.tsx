import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { AttrView } from './AttrView'
import type { AttrState } from './scenarios'

type Props = {
  scenarios: Scenario<AttrState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 프로퍼티 어트리뷰트 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="프로퍼티 어트리뷰트 시뮬레이터"
      renderState={(state) => <AttrView state={state} />}
    />
  )
}
