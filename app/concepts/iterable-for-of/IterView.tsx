import type { Field, IterState, ProtocolCall } from './scenarios'

type Props = {
  state: IterState
  // 바로 이전 단계의 상태. 같은 이름 필드·같은 이름 루프 변수의 값이 달라졌으면 "바뀜"으로 표시한다.
  prevState?: IterState
}

const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function isFieldChanged(field: Field, prevState?: IterState): boolean {
  if (field.changed) return true
  const prev = prevState?.iterator?.fields.find((f) => f.name === field.name)
  return !!prev && prev.value !== field.value
}

function isBindingChanged(state: IterState, prevState?: IterState): boolean {
  const prev = prevState?.binding
  return (
    !!state.binding &&
    !!prev &&
    prev.name === state.binding.name &&
    prev.value !== state.binding.value
  )
}

function Chip({ text, changed }: { text: string; changed: boolean }) {
  return (
    <span
      className={`border-border rounded border px-1.5 font-mono text-sm ${wrap} ${fade} ${
        changed ? `${changedClass} border-accent` : 'bg-surface'
      }`}
    >
      {`${text}${changed ? ' (바뀜)' : ''}`}
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface min-w-0 rounded-lg border-2 px-3 py-2">
      <p className="mb-1 text-sm font-semibold">{title}</p>
      {children}
    </div>
  )
}

function callText(call: ProtocolCall): string {
  switch (call.kind) {
    case 'get-iterator':
      return `${call.target}[Symbol.iterator]() → 이터레이터`
    case 'next':
      return `next() → { value: ${call.result.value}, done: ${call.result.done} }`
    case 'return':
      return 'return()'
  }
}

export function IterView({ state, prevState }: Props) {
  const { iterable, iterator, binding, calls } = state
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="이터러블">
          {iterable ? (
            <p className={wrap}>
              <span className="font-mono font-semibold">{iterable.name}</span>
              <span className="text-sm">{` · ${iterable.summary}`}</span>
            </p>
          ) : (
            <p className="text-muted text-sm">아직 만든 값이 없습니다.</p>
          )}
        </Card>
        <Card title="이터레이터">
          {iterator ? (
            <div className="space-y-1">
              <p className={`text-sm ${wrap}`}>{iterator.label}</p>
              <div className="flex flex-wrap gap-1">
                {iterator.fields.map((f) => (
                  <Chip
                    key={f.name}
                    text={`${f.name} ${f.value}`}
                    changed={isFieldChanged(f, prevState)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm">아직 이터레이터가 없습니다.</p>
          )}
        </Card>
        <Card title="루프 변수">
          {binding ? (
            <Chip
              text={`${binding.name} ${binding.value}`}
              changed={isBindingChanged(state, prevState)}
            />
          ) : (
            <p className="text-muted text-sm">아직 값을 받지 않았습니다.</p>
          )}
        </Card>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">이번 단계의 호출</p>
        {calls.length === 0 ? (
          <p className="text-muted text-sm">이번 단계에서는 호출이 없습니다.</p>
        ) : (
          <ul aria-label="이번 단계의 호출" className="space-y-2">
            {calls.map((c, i) => (
              <li
                key={i}
                className={`border-border bg-surface min-w-0 rounded-lg border px-3 py-2 font-mono text-sm ${wrap}`}
              >
                {callText(c)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
