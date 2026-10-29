import { useId } from 'react'
import type { Binding, Lookup, ObjectCard, Prop, ProtoState, Ref, Val } from './scenarios'

type Props = {
  state: ProtoState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const NOTE_LABELS: Record<NonNullable<Prop['note']>, string> = {
  readonly: '쓰기 불가',
  setter: 'setter',
  hidden: '열거 불가',
}

const PURPOSE_LABELS = { get: '읽기', set: '대입', instanceof: 'instanceof' } as const

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function labelOf(state: ProtoState, id: string): string {
  return state.objects.find((o) => o.id === id)?.label ?? id
}

function RefChip({ state, value }: { state: ProtoState; value: Ref }) {
  return (
    <span
      data-ref-to={value.id}
      className={`border-accent bg-surface text-fg inline-block rounded-full border px-2 font-mono ${wrap}`}
    >
      → {labelOf(state, value.id)}
    </span>
  )
}

function AnyValue({ state, value }: { state: ProtoState; value: Val | Ref }) {
  return 'kind' in value ? (
    <RefChip state={state} value={value} />
  ) : (
    <span className={`font-mono ${wrap}`}>{value.display}</span>
  )
}

function LookupArea({ state, lookup }: { state: ProtoState; lookup: Lookup }) {
  const isInstanceof = lookup.kind === 'instanceof'
  const status = (flag: boolean) =>
    isInstanceof ? (flag ? '일치' : '불일치') : flag ? '찾음' : '없음'
  const items = lookup.path.map((p) => ({
    id: p.id,
    flag: 'found' in p ? p.found : p.match,
  }))
  const endsInNull = lookup.end === 'null'
  return (
    <>
      <p className={`mb-2 text-sm ${wrap}`}>
        {isInstanceof ? (
          <>
            <span className="font-mono font-semibold">{labelOf(state, lookup.startId)}</span>{' '}
            instanceof 비교 (비교 대상:{' '}
            <span className="font-mono font-semibold">{labelOf(state, lookup.targetId)}</span>)
          </>
        ) : (
          <>
            <span className="font-mono font-semibold">{lookup.key}</span>{' '}
            {PURPOSE_LABELS[lookup.kind]}
          </>
        )}
      </p>
      <ol className="space-y-1">
        {items.map(({ id, flag }) => (
          <li
            key={id}
            className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
              flag ? changedClass : 'bg-surface'
            }`}
          >
            <span className={wrap}>{labelOf(state, id)}</span>
            <Badge>{status(flag)}</Badge>
          </li>
        ))}
        {endsInNull && (
          <li className="border-border bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1">
            <span className="font-mono">null</span>
            <Badge>체인 끝</Badge>
            <span className="text-muted text-sm">null — 체인 끝</span>
          </li>
        )}
      </ol>
      <p className={`mt-2 text-sm ${wrap}`}>
        <span className="text-muted">결과: </span>
        <span className="font-mono font-semibold">{lookup.outcome}</span>
      </p>
    </>
  )
}

function BindingRow({ binding, state }: { binding: Binding; state: ProtoState }) {
  return (
    <li
      data-changed={binding.changed ? 'true' : undefined}
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <Badge>{binding.declaredWith}</Badge>
      {'kind' in binding.value ? (
        <>
          <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>
          <RefChip state={state} value={binding.value} />
        </>
      ) : (
        <span className={`font-mono font-semibold ${wrap}`}>
          {`${binding.name} = ${binding.value.display}`}
        </span>
      )}
      {binding.changed && <Badge>새로 생김</Badge>}
    </li>
  )
}

function PropRow({ prop, state }: { prop: Prop; state: ProtoState }) {
  return (
    <li
      data-prop-key={prop.key}
      data-changed={prop.changed ? 'true' : undefined}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-2 py-1 ${fade} ${
        prop.changed ? changedClass : ''
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{prop.key}</span>
      <AnyValue state={state} value={prop.value} />
      {prop.note && <Badge>{NOTE_LABELS[prop.note]}</Badge>}
      {prop.changed && <Badge>{prop.changed === 'created' ? '새로 생김' : '값이 바뀜'}</Badge>}
    </li>
  )
}

function ProtoRow({ card, state }: { card: ObjectCard; state: ProtoState }) {
  const { proto } = card
  return (
    <p
      data-proto-row
      data-changed={card.protoChanged ? 'true' : undefined}
      className={`border-muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-dashed px-2 py-1 text-sm italic ${fade} ${
        card.protoChanged ? changedClass : ''
      }`}
    >
      <span className="text-muted">[[Prototype]] (내부 슬롯)</span>
      {proto.kind === 'ref' ? (
        <RefChip state={state} value={proto} />
      ) : proto.kind === 'null' ? (
        <span className="font-mono">→ null</span>
      ) : (
        <span className={`font-mono ${wrap}`}>{`→ ${proto.label} (그림에서 생략)`}</span>
      )}
      {card.protoChanged && <Badge>새로 정해짐</Badge>}
    </p>
  )
}

function Card({
  card,
  state,
  pathIndex,
}: {
  card: ObjectCard
  state: ProtoState
  pathIndex: number
}) {
  const onPath = pathIndex >= 0
  return (
    <li
      data-object-id={card.id}
      data-on-path={onPath ? 'true' : undefined}
      data-changed={card.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        card.created
          ? `${changedClass} border-accent`
          : onPath
            ? 'border-accent bg-surface'
            : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={wrap}>{card.label}</span>
        {onPath && <Badge>{`경로 ${pathIndex + 1}`}</Badge>}
        {card.created && <Badge>새로 생김</Badge>}
      </p>
      {card.props.length === 0 ? (
        // 생략 안내가 있는 카드(내장 객체)는 자기 프로퍼티가 있지만 그리지 않았을 뿐이다.
        !card.omittedNote && <p className="text-muted mt-1 text-sm">자기 프로퍼티 없음</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {card.props.map((p) => (
            <PropRow key={p.key} prop={p} state={state} />
          ))}
        </ul>
      )}
      {card.omittedNote && <p className="text-muted mt-1 text-xs">{card.omittedNote}</p>}
      <ProtoRow card={card} state={state} />
    </li>
  )
}

export function ProtoView({ state }: Props) {
  const lookupId = useId()
  const varsId = useId()
  const objectsId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'
  const { lookup } = state
  const pathIds = lookup?.path.map((p) => p.id) ?? []

  return (
    <div className="space-y-4">
      <section aria-labelledby={lookupId} className="min-w-0">
        <p id={lookupId} className={headingClass}>
          탐색 경로
        </p>
        {lookup === null ? (
          <p className="text-muted text-sm">이 단계에는 탐색이 없습니다.</p>
        ) : (
          <LookupArea state={state} lookup={lookup} />
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-labelledby={varsId} className="min-w-0">
          <p id={varsId} className={headingClass}>
            변수
          </p>
          {state.bindings.length === 0 ? (
            <p className="text-muted text-sm">아직 표시할 변수가 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {state.bindings.map((b) => (
                <BindingRow key={b.name} binding={b} state={state} />
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby={objectsId} className="min-w-0">
          <p id={objectsId} className={headingClass}>
            객체
          </p>
          {state.objects.length === 0 ? (
            <p className="text-muted text-sm">아직 표시할 객체가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {state.objects.map((o) => (
                <Card key={o.id} card={o} state={state} pathIndex={pathIds.indexOf(o.id)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
