import { SimulatorShell } from '~/simulator'
import type { Scenario } from '~/simulator'
import { CollectionView } from './CollectionView'
import type { CollectionState } from './scenarios'

type Props = {
  scenarios: Scenario<CollectionState>[]
}

// 개념 전용 래퍼: 공통 셸에 영역 라벨과 컬렉션 시각화만 넘긴다.
export function Simulator({ scenarios }: Props) {
  return (
    <SimulatorShell
      scenarios={scenarios}
      label="컬렉션 시뮬레이터"
      renderState={(state, prevState) => <CollectionView state={state} prevState={prevState} />}
    />
  )
}
