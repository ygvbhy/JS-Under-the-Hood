import type { CollectionState } from './scenarios'
import { TASKS } from './scenarios'

type Props = {
  state: CollectionState
  // 바로 이전 단계의 상태. class가 달라진 li를 "바뀜"으로 표시한다.
  prevState?: CollectionState
}

const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function ItemCard({
  index,
  state,
  prevState,
}: {
  index: number
  state: CollectionState
  prevState?: CollectionState
}) {
  const className = state.classes[index]
  const changed = !!prevState && prevState.classes[index] !== className
  const isTarget = state.target === index
  return (
    <li
      data-item-index={index}
      className={`min-w-0 rounded-lg border-2 px-3 py-2 ${fade} ${
        isTarget ? 'border-accent' : 'border-border'
      } ${changed ? changedClass : 'bg-surface'}`}
    >
      <p className={`font-semibold ${wrap}`}>{TASKS[index]}</p>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs">
        <span className="border-border rounded border px-1.5 font-mono">{className}</span>
        {changed && <span>(바뀜)</span>}
        {isTarget && <span className="font-semibold">이번에 바꾸는 항목</span>}
      </p>
    </li>
  )
}

function conditionText(check: NonNullable<CollectionState['check']>): string {
  return `${check.i} < ${check.length} → ${check.result ? '참' : '거짓 (반복 끝)'}`
}

export function CollectionView({ state, prevState }: Props) {
  const { collection, check } = state
  const label = state.kind === 'live' ? 'HTMLCollection (살아 있음)' : 'NodeList (정적)'
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-semibold">li 4개(문서 순서)</p>
        <ul aria-label="li 4개" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TASKS.map((_, i) => (
            <ItemCard key={i} index={i} state={state} prevState={prevState} />
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span className="font-mono">todos</span>
          <span>{label}</span>
          <span className="font-mono">
            {collection === null ? 'todos.length 없음' : `todos.length ${collection.length}`}
          </span>
        </p>
        {collection === null ? (
          <p className="text-muted text-sm">아직 만들지 않음</p>
        ) : collection.length === 0 ? (
          <p className="text-muted text-sm">컬렉션이 비어 있습니다.</p>
        ) : (
          <ul aria-label="todos에 든 항목" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {collection.map((liIndex, k) => (
              <li
                key={k}
                data-collection-index={k}
                className="border-border bg-surface min-w-0 rounded-lg border px-3 py-2"
              >
                <p className="font-mono text-xs">{`todos[${k}]`}</p>
                <p className={`text-sm font-semibold ${wrap}`}>{TASKS[liIndex]}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-sm">
        <span className="font-mono">{`i = ${state.i === null ? '아직 없음' : state.i}`}</span>
        {check && (
          <span>
            {' · 반복 조건 '}
            <span className="font-mono">{conditionText(check)}</span>
          </span>
        )}
      </p>
    </div>
  )
}
