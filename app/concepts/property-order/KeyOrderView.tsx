import type { ObjCard, KeyOrderState, Prop, Val } from './scenarios'

type Props = {
  state: KeyOrderState
  // 이 View는 Prop.change로 표시를 정하므로 prevState는 쓰지 않는다(공통 셸의 renderState 시그니처를 맞추기 위해 받는다).
  prevState?: KeyOrderState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function KeyChip({ prop }: { prop: Prop }) {
  return (
    <li
      data-key={prop.key}
      className={`border-border flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded border px-2 py-1 ${fade} ${
        prop.change ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono text-sm ${wrap}`}>{`"${prop.key}"`}</span>
      <span className={`text-muted font-mono text-sm ${wrap}`}>{formatVal(prop.value)}</span>
      {prop.change && (
        <span className={badgeClass}>{prop.change === 'new' ? '새로 생김' : '값 바뀜'}</span>
      )}
    </li>
  )
}

function Lane({ title, keys }: { title: string; keys: Prop[] }) {
  return (
    <section aria-label={title} className="border-border min-w-0 rounded border px-2 py-2">
      <h4 className="text-muted mb-1 text-xs">{title}</h4>
      {keys.length === 0 ? (
        <p className="text-muted text-sm">없음</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {keys.map((p) => (
            <KeyChip key={p.key} prop={p} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Card({ card }: { card: ObjCard }) {
  const ordered = [...card.indexKeys, ...card.stringKeys].map((p) => p.key)
  return (
    <li
      data-object-name={card.name}
      className="border-border bg-surface min-w-0 rounded-lg border-2 px-3 py-2"
    >
      <p className={`font-mono font-semibold ${wrap}`}>{card.name}</p>
      <div className="mt-2 space-y-2">
        <Lane title="배열 인덱스 키 (작은 수부터)" keys={card.indexKeys} />
        <Lane title="그 밖의 문자열 키 (만든 순서)" keys={card.stringKeys} />
      </div>
      {card.removed && card.removed.length > 0 && (
        <p className={`mt-2 text-sm ${wrap}`}>
          {`지워짐: ${card.removed.map((k) => `"${k}"`).join(', ')}`}
        </p>
      )}
      <p className={`mt-2 text-sm ${wrap}`}>
        <span className="text-muted">Object.keys 결과 </span>
        <span className="font-mono">{JSON.stringify(ordered)}</span>
      </p>
    </li>
  )
}

export function KeyOrderView({ state }: Props) {
  if (state.objects.length === 0) {
    return <p className="text-muted text-sm">아직 표시할 객체가 없습니다.</p>
  }
  return (
    <ul className="space-y-3">
      {state.objects.map((c) => (
        <Card key={c.name} card={c} />
      ))}
    </ul>
  )
}
