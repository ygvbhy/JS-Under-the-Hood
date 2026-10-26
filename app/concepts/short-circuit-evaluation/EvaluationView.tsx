import { useId } from 'react'
import type { Binding, Check, EvalState, Part, Val } from './scenarios'

type Props = {
  state: EvalState
}

const CHECK_LABELS: Record<Check, string> = {
  truthy: 'truthy',
  falsy: 'falsy',
  nullish: 'null 또는 undefined',
  'not-nullish': 'null·undefined 아님',
}

const STATUS_LABELS: Record<Part['status'], string> = {
  evaluated: '평가함',
  skipped: '평가 안 함',
  pending: '아직 평가 전',
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function formatVal(value: Val): string {
  return value.type === 'string' ? `"${value.display}"` : value.display
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function PartRow({ part }: { part: Part }) {
  const skipped = part.status === 'skipped'
  return (
    <li
      className={`border-border bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade}`}
    >
      <span className={`min-w-0 font-mono ${wrap} ${skipped ? 'text-muted line-through' : ''}`}>
        {part.code}
      </span>
      <Badge>{STATUS_LABELS[part.status]}</Badge>
      {part.value && (
        <span className="min-w-0">
          <span className="text-muted text-xs">값 </span>
          <span className={`font-mono ${wrap}`}>{formatVal(part.value)}</span>
        </span>
      )}
      {part.check && <span className="text-sm">{`판정: ${CHECK_LABELS[part.check]}`}</span>}
    </li>
  )
}

function BindingRow({ binding }: { binding: Binding }) {
  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? 'bg-highlight' : 'bg-surface'
      }`}
    >
      <Badge>{binding.declaredWith}</Badge>
      <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>
      <span aria-hidden="true">=</span>
      <span className={`min-w-0 font-mono ${wrap}`}>{formatVal(binding.value)}</span>
      {binding.changed && <Badge>새로 생김</Badge>}
    </li>
  )
}

export function EvaluationView({ state }: Props) {
  const evaluationId = useId()
  const bindingsId = useId()
  const { evaluation, bindings } = state

  return (
    <div className="space-y-4">
      <section aria-labelledby={evaluationId} className="min-w-0">
        <p id={evaluationId} className="text-muted mb-2 text-sm font-semibold">
          평가 중인 식
        </p>
        {evaluation ? (
          <div className="border-border bg-surface rounded-lg border px-3 py-2">
            <p className={`font-mono ${wrap}`}>{evaluation.code}</p>
            <ol className="mt-2 space-y-1">
              {evaluation.parts.map((part, i) => (
                <PartRow key={i} part={part} />
              ))}
            </ol>
            {evaluation.result && (
              <p className="border-border mt-2 border-t pt-2 font-semibold">
                <span>결과:</span>{' '}
                <span className={`font-mono ${wrap}`}>{formatVal(evaluation.result)}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 평가 중인 식이 없습니다.
          </div>
        )}
      </section>

      <section aria-labelledby={bindingsId} className="min-w-0">
        <p id={bindingsId} className="text-muted mb-2 text-sm font-semibold">
          변수
        </p>
        {bindings.length === 0 ? (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 표시할 변수가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1">
            {bindings.map((b) => (
              <BindingRow key={b.name} binding={b} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
