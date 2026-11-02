import type { ArrayCard, ArrayState, Prop, Val } from './scenarios'
import { isArrayIndex } from './scenarios'

type Props = {
  state: ArrayState
  // 바로 이전 단계의 상태. `changed` 프로퍼티가 같은 이름 배열에 이전에 없던 키면 "새로 생김", 있던 키면 "값 바뀜"으로 표시한다.
  prevState?: ArrayState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function hadKey(prev: ArrayState | undefined, name: string, key: string): boolean {
  return !!prev?.arrays.find((a) => a.name === name)?.props.some((p) => p.key === key)
}

function PropRow({
  prop,
  card,
  prevState,
}: {
  prop: Prop
  card: ArrayCard
  prevState?: ArrayState
}) {
  return (
    <tr className={`border-border border-t ${fade} ${prop.changed ? changedClass : ''}`}>
      <td className={`px-2 py-1 font-mono ${wrap}`}>{`"${prop.key}"`}</td>
      <td className={`px-2 py-1 font-mono ${wrap}`}>
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
          {formatVal(prop.value)}
          {prop.changed && (
            <Badge>{hadKey(prevState, card.name, prop.key) ? '값 바뀜' : '새로 생김'}</Badge>
          )}
        </span>
      </td>
      <td className="px-2 py-1">
        <Badge>{isArrayIndex(prop.key) ? '인덱스' : '인덱스 아님'}</Badge>
      </td>
    </tr>
  )
}

function IndexStrip({ card }: { card: ArrayCard }) {
  const byKey = new Map(card.props.map((p) => [p.key, p]))
  const cells = Array.from({ length: card.length }, (_, i) => ({ i, prop: byKey.get(String(i)) }))
  return (
    <div className="mt-3">
      <p className="text-muted mb-1 text-xs">
        칸 보기 (0 ~ length - 1) <span>· 설명용 표현이며 엔진의 저장 방식이 아닙니다</span>
      </p>
      {cells.length === 0 ? (
        <p className="text-muted text-sm">length가 0이라 칸이 없습니다.</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {cells.map(({ i, prop }) => (
            <li
              key={i}
              data-cell-index={i}
              className={`border-border flex min-w-12 flex-col items-center rounded border px-2 py-1 text-center ${fade} ${
                prop ? (prop.changed ? changedClass : 'bg-surface') : 'bg-surface border-dashed'
              }`}
            >
              <span className="text-muted text-xs">{i}</span>
              {prop ? (
                <span className={`font-mono text-sm ${wrap}`}>{formatVal(prop.value)}</span>
              ) : (
                <span className="text-muted text-sm">구멍</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Card({ card, prevState }: { card: ArrayCard; prevState?: ArrayState }) {
  return (
    <li
      data-array-name={card.name}
      className="border-border bg-surface min-w-0 rounded-lg border-2 px-3 py-2"
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={`font-mono ${wrap}`}>{card.name}</span>
        <span
          className={`border-border rounded border px-1.5 font-mono text-sm ${fade} ${
            card.lengthChanged ? `${changedClass} border-accent` : 'bg-surface'
          }`}
        >
          {`length: ${card.length}`}
        </span>
        {card.lengthChanged && <Badge>바뀜</Badge>}
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="text-muted pb-1 text-left text-xs">
            {`${card.name}의 자기 프로퍼티`}
          </caption>
          <thead>
            <tr className="text-muted text-xs">
              <th scope="col" className="px-2 py-1 font-normal">
                키
              </th>
              <th scope="col" className="px-2 py-1 font-normal">
                값
              </th>
              <th scope="col" className="px-2 py-1 font-normal">
                종류
              </th>
            </tr>
          </thead>
          <tbody>
            {card.props.map((p) => (
              <PropRow key={p.key} prop={p} card={card} prevState={prevState} />
            ))}
            <tr className="border-border border-t">
              <td className="px-2 py-1 font-mono">{'"length"'}</td>
              <td className="px-2 py-1 font-mono">{card.length}</td>
              <td className="px-2 py-1">
                <Badge>열거 안 됨</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {card.removed && card.removed.length > 0 && (
        <p className={`mt-2 text-sm ${wrap}`}>
          {`이 단계에서 지워진 키: ${card.removed.map((k) => `"${k}"`).join(', ')}`}
        </p>
      )}
      <IndexStrip card={card} />
    </li>
  )
}

export function ArrayView({ state, prevState }: Props) {
  if (state.arrays.length === 0) {
    return <p className="text-muted text-sm">아직 표시할 배열이 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {state.arrays.map((c) => (
        <Card key={c.name} card={c} prevState={prevState} />
      ))}
    </ul>
  )
}
