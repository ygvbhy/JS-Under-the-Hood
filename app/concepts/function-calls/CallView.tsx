import { useId } from 'react'
import type { Binding, Call, CallResult, CallState, Param, Pending, Val } from './scenarios'

type Props = {
  state: CallState
  // 바로 이전 단계의 상태. `changed` 변수가 이전에 있던 것이면 "값이 바뀜", 없던 것이면 "새로 생김"으로 표시한다.
  // 없으면(첫 단계) `changed` 변수는 모두 "새로 생김"으로 본다.
  prevState?: CallState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const TYPE_LABELS: Record<Val['type'], string> = {
  number: '숫자',
  string: '문자열',
  undefined: 'undefined',
}

const RESULT_BADGES: Record<CallResult['how'], string> = {
  return: 'return',
  'return-empty': 'return;',
  end: '본문 끝',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function resultText(result: CallResult): string {
  switch (result.how) {
    case 'return':
      return `return 값: ${formatVal(result.value)}`
    case 'return-empty':
      return `값 없는 return; → ${formatVal(result.value)}`
    case 'end':
      return `본문 끝까지 실행 → ${formatVal(result.value)}`
  }
}

function hadBinding(prev: CallState | undefined, name: string): boolean {
  return !!prev?.bindings.some((b) => b.name === name)
}

function ValueList({ values }: { values: Val[] }) {
  if (values.length === 0) return <span className="text-muted text-sm">없음</span>
  return (
    <>
      {values.map((v, i) => (
        <span key={i} className={`font-mono ${wrap}`}>
          {formatVal(v)}
        </span>
      ))}
    </>
  )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-muted text-xs">{label}</span>
      {children}
    </li>
  )
}

function PendingPanel({ pending }: { pending: Pending }) {
  return (
    <div className="space-y-2">
      <p className={`font-mono font-semibold ${wrap}`}>{pending.code}</p>
      <ul className="space-y-1">
        {pending.args.map((arg, i) => (
          <Line key={i} label={`${i + 1}번째`}>
            {arg ? (
              <span className={`font-mono ${wrap}`}>{formatVal(arg)}</span>
            ) : (
              <Badge>평가 전</Badge>
            )}
          </Line>
        ))}
      </ul>
    </div>
  )
}

function ParamRow({ param }: { param: Param }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-2 py-0.5">
      <span className={`font-mono ${wrap}`}>{`${param.name} = ${formatVal(param.value)}`}</span>
      <Badge>{TYPE_LABELS[param.value.type]}</Badge>
      <Badge>{param.from === 'argument' ? '인수' : '인수 없음'}</Badge>
    </li>
  )
}

function CallBox({ call }: { call: Call }) {
  return (
    <div className="border-accent bg-surface space-y-2 rounded-lg border-2 px-3 py-2">
      <p className="font-semibold">
        ‘<code className={`font-mono ${wrap}`}>{call.code}</code>’ 호출
      </p>
      <ul className="space-y-1">
        <Line label="인수">
          <ValueList values={call.args} />
        </Line>
        {call.ignored.length > 0 && (
          <Line label="매개변수에 들어가지 않은 인수">
            <ValueList values={call.ignored} />
          </Line>
        )}
      </ul>
      {call.params.length > 0 && (
        <ul className="space-y-0.5">
          {call.params.map((p) => (
            <ParamRow key={p.name} param={p} />
          ))}
        </ul>
      )}
      {call.result && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge>{RESULT_BADGES[call.result.how]}</Badge>
          <Badge>{TYPE_LABELS[call.result.value.type]}</Badge>
          <span className={`min-w-0 text-sm ${wrap}`}>{resultText(call.result)}</span>
        </p>
      )}
    </div>
  )
}

function BindingRow({ binding, prevState }: { binding: Binding; prevState?: CallState }) {
  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className="text-muted w-12 shrink-0 text-xs">{binding.declaredWith}</span>
      <span className={`font-mono font-semibold ${wrap}`}>
        {`${binding.name} = ${formatVal(binding.value)}`}
      </span>
      {binding.changed && (
        <Badge>{hadBinding(prevState, binding.name) ? '값이 바뀜' : '새로 생김'}</Badge>
      )}
    </li>
  )
}

export function CallView({ state, prevState }: Props) {
  const pendingId = useId()
  const callId = useId()
  const varsId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      {state.pending && (
        <section
          aria-labelledby={pendingId}
          className="border-border bg-surface rounded-lg border p-3"
        >
          <p id={pendingId} className={headingClass}>
            인수 평가 중
          </p>
          <PendingPanel pending={state.pending} />
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby={callId} className="min-w-0">
          <p id={callId} className={headingClass}>
            호출 영역
          </p>
          {state.call ? (
            <CallBox call={state.call} />
          ) : (
            <p className="text-muted text-sm">실행 중인 함수 호출이 없습니다.</p>
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
                <BindingRow key={b.name} binding={b} prevState={prevState} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
