import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { MemoryView } from './MemoryView'
import type { MemoryState } from './scenarios'

type Props = {
  scenarios: Scenario<MemoryState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 메모리 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="원시 값과 객체 시뮬레이터"
      renderState={(state, prevState) => <MemoryView state={state} prevState={prevState} />}
    />
  )
}
