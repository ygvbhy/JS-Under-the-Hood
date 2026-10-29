import { useId } from 'react'
import type {
  Binding,
  Determination,
  FnCard,
  FnMode,
  HistoryRow,
  ObjectCard,
  ThisState,
  ThisVal,
} from './scenarios'

type Props = {
  state: ThisState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const MODE_LABELS: Record<FnMode, string> = {
  sloppy: 'sloppy',
  strict: 'strict',
  arrow: '화살표',
  bound: 'bound',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function valText(state: ThisState, v: ThisVal): string {
  if (v.kind === 'global') return '전역 객체'
  if (v.kind === 'undefined') return 'undefined'
  return state.objects.find((o) => o.id === v.id)?.label ?? v.id
}

function fnLabel(state: ThisState, id: string): string {
  return state.functions.find((f) => f.id === id)?.label ?? id
}

function Val({ state, value }: { state: ThisState; value: ThisVal }) {
  return <span className={`font-mono ${wrap}`}>{valText(state, value)}</span>
}

function RefText({ state, d }: { state: ThisState; d: Determination }) {
  const { ref } = d
  switch (ref.kind) {
    case 'property':
      return (
        <>
          프로퍼티 참조, 기준 값 <Val state={state} value={ref.base} />
        </>
      )
    case 'name':
      return (
        <>
          변수 이름 <code className={`font-mono ${wrap}`}>{ref.name}</code>: 참조의 기준 값 없음
        </>
      )
    case 'value':
      return <>참조가 아닌 값: {ref.why}</>
    case 'function-property': {
      const label = fnLabel(state, ref.fnId)
      return (
        <>
          <code className={`font-mono ${wrap}`}>{`${ref.fnId}.${ref.key}`}</code>: 기준 값은 함수{' '}
          <span className={`font-mono ${wrap}`}>{label}</span>
        </>
      )
    }
  }
}

function DeterminationItem({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="border-border bg-surface rounded-md border px-2 py-1">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-muted text-xs">{index}</span>
        <span className="text-muted text-xs font-semibold">{title}</span>
      </p>
      <p className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 ${wrap}`}>{children}</p>
    </li>
  )
}

function DeterminationBox({ state, d }: { state: ThisState; d: Determination }) {
  const calleeCard = state.functions.find((f) => f.id === d.callee)
  const calleeMode = calleeCard?.mode
  return (
    <div className="space-y-2">
      <p className="font-semibold">
        ‘<code className={`font-mono ${wrap}`}>{d.expr}</code>’ 호출
      </p>
      <ol className="space-y-1">
        <DeterminationItem index={1} title="함수 자리의 식">
          <span>
            <RefText state={state} d={d} />
          </span>
        </DeterminationItem>
        <DeterminationItem index={2} title="thisArg">
          {d.via && d.firstArg ? (
            <span>
              {d.via}의 첫 인수 <Val state={state} value={d.firstArg} />가 thisArg
            </span>
          ) : (
            <span>
              thisArg <Val state={state} value={d.thisArg} />
            </span>
          )}
        </DeterminationItem>
        <DeterminationItem index={3} title="불리는 함수">
          <span className={`font-mono font-semibold ${wrap}`}>{calleeCard?.label ?? d.callee}</span>
          {calleeMode && <Badge>{MODE_LABELS[calleeMode]}</Badge>}
          <span>{d.rule}</span>
        </DeterminationItem>
        <DeterminationItem index={4} title="this">
          <Val state={state} value={d.thisValue} />
        </DeterminationItem>
      </ol>
    </div>
  )
}

function FnCardItem({ state, fn }: { state: ThisState; fn: FnCard }) {
  return (
    <li
      data-fn-id={fn.id}
      data-changed={fn.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        fn.created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={`font-mono ${wrap}`}>{fn.label}</span>
        <Badge>{MODE_LABELS[fn.mode]}</Badge>
        {fn.created && <Badge>새로 생김</Badge>}
      </p>
      {fn.mode === 'arrow' && fn.lexicalThis && (
        <p className="mt-1 text-sm">
          바깥 this: <Val state={state} value={fn.lexicalThis} />
        </p>
      )}
      {fn.mode === 'bound' && (
        <>
          {fn.boundThis && (
            <p className="mt-1 text-sm">
              묶인 this: <Val state={state} value={fn.boundThis} />
            </p>
          )}
          {fn.targetId && (
            <p className="text-sm">
              원본: <span className={`font-mono ${wrap}`}>{fnLabel(state, fn.targetId)}</span>
            </p>
          )}
        </>
      )}
    </li>
  )
}

function ObjectItem({ object }: { object: ObjectCard }) {
  return (
    <li
      data-object-id={object.id}
      data-changed={object.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        object.created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={`font-mono ${wrap}`}>{object.label}</span>
        {object.created && <Badge>새로 생김</Badge>}
      </p>
      {object.name !== undefined && (
        <p className="mt-1 text-sm">
          name: <span className={`font-mono ${wrap}`}>{`"${object.name}"`}</span>
        </p>
      )}
    </li>
  )
}

function BindingRow({ binding }: { binding: Binding }) {
  return (
    <li
      data-changed={binding.changed ? 'true' : undefined}
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>
      <span className={wrap}>→ {binding.value}</span>
      {binding.changed && <Badge>새로 생김</Badge>}
    </li>
  )
}

function HistoryTable({
  state,
  rows,
  highlightLast,
}: {
  state: ThisState
  rows: HistoryRow[]
  highlightLast: boolean
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">호출식별 this 비교표</caption>
      <thead>
        <tr>
          <th scope="col" className="border-border border-b px-2 py-1 text-left">
            호출식
          </th>
          <th scope="col" className="border-border border-b px-2 py-1 text-left">
            this
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isNew = highlightLast && i === rows.length - 1
          return (
            <tr
              key={i}
              data-current={isNew ? 'true' : undefined}
              className={`${fade} ${isNew ? changedClass : ''}`}
            >
              <td className="border-border border-b px-2 py-1 break-words">
                <code className="font-mono break-words">{row.expr}</code>
              </td>
              <td className={`border-border border-b px-2 py-1 ${wrap}`}>
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Val state={state} value={row.thisValue} />
                  {isNew && <Badge>방금 결정</Badge>}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function ThisView({ state }: Props) {
  const decideId = useId()
  const fnsId = useId()
  const objectsId = useId()
  const varsId = useId()
  const historyId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      <section aria-labelledby={decideId} className="min-w-0">
        <p id={decideId} className={headingClass}>
          this 결정
        </p>
        {state.current ? (
          <DeterminationBox state={state} d={state.current} />
        ) : (
          <p className="text-muted text-sm">진행 중인 호출 없음</p>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby={fnsId} className="min-w-0">
          <p id={fnsId} className={headingClass}>
            함수
          </p>
          {state.functions.length === 0 ? (
            <p className="text-muted text-sm">아직 표시할 함수가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {state.functions.map((f) => (
                <FnCardItem key={f.id} state={state} fn={f} />
              ))}
            </ul>
          )}
        </section>
        <div className="min-w-0 space-y-4">
          <section aria-labelledby={objectsId} className="min-w-0">
            <p id={objectsId} className={headingClass}>
              객체
            </p>
            {state.objects.length === 0 ? (
              <p className="text-muted text-sm">아직 표시할 객체가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {state.objects.map((o) => (
                  <ObjectItem key={o.id} object={o} />
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby={varsId} className="min-w-0">
            <p id={varsId} className={headingClass}>
              변수
            </p>
            {state.bindings.length === 0 ? (
              <p className="text-muted text-sm">아직 표시할 변수가 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {state.bindings.map((b) => (
                  <BindingRow key={b.name} binding={b} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <section aria-labelledby={historyId} className="min-w-0">
        <p id={historyId} className={headingClass}>
          호출별 this 비교
        </p>
        {state.history.length === 0 ? (
          <p className="text-muted text-sm">아직 결정한 호출 없음</p>
        ) : (
          <HistoryTable state={state} rows={state.history} highlightLast={state.current !== null} />
        )}
      </section>
    </div>
  )
}
