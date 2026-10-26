import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { EvaluationView } from './EvaluationView'
import type { EvalState } from './scenarios'

type Props = {
  scenarios: Scenario<EvalState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 평가 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="단축 평가 시뮬레이터"
      renderState={(state) => <EvaluationView state={state} />}
    />
  )
}
