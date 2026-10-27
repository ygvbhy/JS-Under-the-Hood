import { useId } from 'react'
import type { Binding, EvalEvent, IncState } from './scenarios'

type Props = {
  state: IncState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const KIND_LABELS: Record<EvalEvent['kind'], string> = {
  read: '읽기',
  write: '쓰기',
  result: '식의 값',
}

const CHANGED_LABELS = { created: '새로 생김', updated: '값이 바뀜' } as const

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

// 숫자를 한국어로 읽을 때 받침이 있는 끝자리(영·일·삼·육·칠·팔)에는 '을', 나머지에는 '를'을 붙인다.
function withObjectParticle(display: string): string {
  return `${display}${'013678'.includes(display.at(-1) ?? '') ? '을' : '를'}`
}

function eventText(event: EvalEvent): string {
  switch (event.kind) {
    case 'read':
      return `${event.name}의 값 ${event.value.display}`
    case 'write':
      return `${event.name}에 ${withObjectParticle(event.value.display)} 넣음`
    case 'result':
      return `${event.code} → ${event.value.display}`
  }
}

function EventItem({ event }: { event: EvalEvent }) {
  return (
    <li
      className={`border-border bg-surface flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade}`}
    >
      <Badge>{KIND_LABELS[event.kind]}</Badge>
      <span
        className={`min-w-0 ${event.kind === 'result' ? 'font-mono font-semibold' : ''} ${wrap}`}
      >
        {eventText(event)}
      </span>
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
      <span>=</span>
      <span className={`min-w-0 font-mono ${wrap}`}>{binding.value.display}</span>
      <Badge>숫자</Badge>
      {binding.changed && <Badge>{CHANGED_LABELS[binding.changed]}</Badge>}
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
            <p className={`min-w-0 font-mono ${wrap}`}>{evaluation.code}</p>
            <ol className="mt-2 space-y-2">
              {evaluation.events.map((e, i) => (
                <EventItem key={i} event={e} />
              ))}
            </ol>
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
