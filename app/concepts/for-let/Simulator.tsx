import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ForLetView } from './ForLetView'
import type { ForLetState } from './scenarios'

type Props = {
  scenarios: Scenario<ForLetState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 for 문의 let 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="for 문의 let 시뮬레이터"
      renderState={(state) => <ForLetView state={state} />}
    />
  )
}
