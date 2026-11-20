import { useId, type ReactNode } from 'react'
import type { AttemptStatus, Hint, ToPrimitiveState } from './scenarios'

type Props = {
  state: ToPrimitiveState
  prevState?: ToPrimitiveState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words'
const headingClass = 'text-muted mb-2 text-sm font-semibold'

const HINT_TEXT: Record<Hint, string> = {
  none: '없음 (힌트를 주지 않음)',
  string: 'string',
  number: 'number',
}

const EXOTIC_TEXT = {
  unchecked: '확인 전',
  absent: '없음 → OrdinaryToPrimitive로 진행',
  present: '있음 → 그 메서드를 부름',
}

const STATUS_TEXT: Record<AttemptStatus, string> = {
  pending: '호출 전',
  'not-callable': '호출할 수 없음',
  'returned-object': '객체를 돌려줌 → 다음으로',
  'returned-primitive': '원시 값 → 사용',
  'not-called': '부르지 않음',
}

// 마지막으로 시도한 메서드가 객체를 돌려주면 넘어갈 다음 메서드가 없다.
const LAST_OBJECT_TEXT = '객체를 돌려줌 → 더 시도할 메서드 없음'

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function Row({
  name,
  title,
  changed,
  children,
}: {
  name: string
  title: string
  changed: boolean
  children: ReactNode
}) {
  return (
    <li
      data-row={name}
      data-changed={changed ? 'true' : undefined}
      className={`border-border rounded-md border px-2 py-1 ${fade} ${
        changed ? changedClass : 'bg-surface'
      }`}
    >
      <p className="text-muted text-xs">{title}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={wrap}>{children}</span>
        {changed && <Badge>바뀜</Badge>}
      </p>
    </li>
  )
}

const same = <T,>(a: T | undefined, b: T) => JSON.stringify(a) === JSON.stringify(b)

function outcomeText(state: ToPrimitiveState): string {
  const o = state.outcome
  if (o === null) return '아직 정해지지 않음'
  if (o.kind === 'TypeError') return 'TypeError 발생 (원시 값을 얻지 못함)'
  return `원시 값 ${o.value} (타입 ${o.type})`
}

export function ToPrimitiveView({ state, prevState }: Props) {
  const callId = useId()
  const attemptsId = useId()
  const resultId = useId()
  const p = prevState

  return (
    <div className="space-y-4">
      <section aria-labelledby={callId} className="min-w-0">
        <p id={callId} className={headingClass}>
          ToPrimitive 진행
        </p>
        {state.call === null ? (
          <p className="text-muted text-sm">이 단계에서 진행 중인 ToPrimitive 없음</p>
        ) : (
          <ol className="space-y-1">
            <Row name="call" title="평가 중인 식" changed={p?.call !== state.call}>
              <span className="font-mono">{state.call}</span>
            </Row>
            <Row name="target" title="원시 값으로 바꾸는 대상" changed={p?.target !== state.target}>
              <span className="font-mono">{state.target}</span>
            </Row>
            <Row name="hint" title="받은 힌트" changed={p?.hint !== state.hint}>
              {HINT_TEXT[state.hint ?? 'none']}
            </Row>
            <Row name="exotic" title="Symbol.toPrimitive 확인" changed={p?.exotic !== state.exotic}>
              {EXOTIC_TEXT[state.exotic]}
            </Row>
            <Row
              name="ordinary"
              title="OrdinaryToPrimitive에 넘긴 힌트"
              changed={p?.ordinaryHint !== state.ordinaryHint}
            >
              {state.ordinaryHint === null
                ? '아직 호출 전'
                : `OrdinaryToPrimitive에 ${state.ordinaryHint}`}
            </Row>
          </ol>
        )}
      </section>
      <section aria-labelledby={attemptsId} className="min-w-0">
        <p id={attemptsId} className={headingClass}>
          메서드 호출 순서
        </p>
        {state.attempts.length === 0 ? (
          <p className="text-muted text-sm">아직 부른 메서드가 없습니다.</p>
        ) : (
          <ol className="space-y-1">
            {state.attempts.map((a, i) => {
              const before = p?.attempts.find((x) => x.method === a.method)
              return (
                <Row
                  key={a.method}
                  name={`attempt-${a.method}`}
                  title={`${i + 1}번째로 시도`}
                  changed={!same(before, a)}
                >
                  <span className="font-mono">{a.method}</span>:{' '}
                  {a.status === 'returned-object' && i === state.attempts.length - 1
                    ? LAST_OBJECT_TEXT
                    : STATUS_TEXT[a.status]}
                  {a.value !== undefined && (
                    <>
                      {' '}
                      (<span className="font-mono">{a.value}</span>)
                    </>
                  )}
                </Row>
              )
            })}
          </ol>
        )}
      </section>
      <section aria-labelledby={resultId} className="min-w-0">
        <p id={resultId} className={headingClass}>
          결과
        </p>
        <ul className="space-y-1">
          <Row name="outcome" title="ToPrimitive의 결과" changed={!same(p?.outcome, state.outcome)}>
            {outcomeText(state)}
          </Row>
          <Row name="after" title="연산이 이어서 하는 일" changed={p?.after !== state.after}>
            {state.after === null ? '없음' : <span className="font-mono">{state.after}</span>}
          </Row>
        </ul>
      </section>
    </div>
  )
}
