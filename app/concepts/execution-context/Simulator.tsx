import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { ExecView } from './ExecView'
import type { ExecState } from './scenarios'

type Props = {
  scenarios: Scenario<ExecState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 실행 컨텍스트 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="실행 컨텍스트 시뮬레이터"
      renderState={(state) => <ExecView state={state} />}
    />
  )
}
