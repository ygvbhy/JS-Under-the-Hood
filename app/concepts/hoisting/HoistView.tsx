import { useId } from 'react'
import type { Binding, HoistState, Val } from './scenarios'

type Props = {
  state: HoistState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const TYPE_LABELS: Record<Val['type'], string> = {
  undefined: 'undefined',
  number: '숫자',
  function: '함수',
}

const DECLARED_BY_LABELS: Record<Binding['declaredBy'], string> = {
  var: 'var 선언으로 생김',
  function: '함수 선언으로 생김',
}

const CHANGED_LABELS: Record<NonNullable<Binding['changed']>, string> = {
  created: '새로 생김',
  updated: '값이 바뀜',
}

const PHASES: { phase: 'declare' | 'run'; label: string }[] = [
  { phase: 'declare', label: '선언 처리 (코드 실행 전)' },
  { phase: 'run', label: '실행' },
]

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function BindingRow({ binding }: { binding: Binding }) {
  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>
        {`${binding.name} = ${binding.value.display}`}
      </span>
      <Badge>{DECLARED_BY_LABELS[binding.declaredBy]}</Badge>
      <Badge>{TYPE_LABELS[binding.value.type]}</Badge>
      {binding.changed && <Badge>{CHANGED_LABELS[binding.changed]}</Badge>}
    </li>
  )
}

export function HoistView({ state }: Props) {
  const phaseId = useId()
  const namesId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby={phaseId} className="min-w-0">
        <p id={phaseId} className={headingClass}>
          진행 단계
        </p>
        <ol className="space-y-1">
          {PHASES.map(({ phase, label }) => (
            <li
              key={phase}
              className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
                state.phase === phase ? changedClass : 'bg-surface'
              }`}
            >
              <span className={wrap}>{label}</span>
              {state.phase === phase && <Badge>지금</Badge>}
            </li>
          ))}
        </ol>
        {state.phase === 'before' && (
          <p className="text-muted mt-2 text-sm">아직 코드를 실행하지 않았습니다.</p>
        )}
      </section>
      <section aria-labelledby={namesId} className="min-w-0">
        <p id={namesId} className={headingClass}>
          선언으로 만들어진 이름
        </p>
        {state.bindings.length === 0 ? (
          <p className="text-muted text-sm">아직 만들어진 이름이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {state.bindings.map((b) => (
              <BindingRow key={b.name} binding={b} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
