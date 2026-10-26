import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ConversionView } from './ConversionView'
import type { ConvState } from './scenarios'

type Props = {
  scenarios: Scenario<ConvState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 변환 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="암묵적 타입 변환 시뮬레이터"
      renderState={(state) => <ConversionView state={state} />}
    />
  )
}
