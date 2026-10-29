import { useId } from 'react'
import { callStages, newStages } from './scenarios'
import type {
  Binding,
  Invocation,
  NewState,
  ObjectBox,
  ObjectRef,
  Param,
  Prop,
  Stage,
  Val,
} from './scenarios'

type Props = {
  state: NewState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const STAGE_LABELS: Record<Stage, string> = {
  check: '인수 평가·생성자 확인',
  create: '새 객체 생성',
  bind: 'this 연결',
  body: '본문 실행',
  result: '결과 결정',
}

const CALL_STAGE_LABELS: Record<Stage, string> = {
  ...STAGE_LABELS,
  check: '인수 평가',
  bind: 'this 결정',
}

const ROLE_LABELS: Record<NonNullable<ObjectBox['role']>, string> = {
  this: 'this',
  result: 'new 식의 결과',
  unused: '결과로 쓰이지 않음',
  global: '전역 객체',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function ObjectChip({ state, value }: { state: NewState; value: ObjectRef }) {
  const label = state.objects.find((o) => o.id === value.id)?.label ?? value.id
  return (
    <span
      data-ref-to={value.id}
      className="border-accent bg-surface text-fg inline-block rounded-full border px-2 font-mono whitespace-nowrap"
    >
      → {label}
    </span>
  )
}

function AnyValue({ state, value }: { state: NewState; value: Val | ObjectRef }) {
  return 'kind' in value ? (
    <ObjectChip state={state} value={value} />
  ) : (
    <span className={`font-mono ${wrap}`}>{formatVal(value)}</span>
  )
}

function StageList({ invocation }: { invocation: Invocation }) {
  const stages: readonly Stage[] = invocation.mode === 'new' ? newStages : callStages
  const labels = invocation.mode === 'new' ? STAGE_LABELS : CALL_STAGE_LABELS
  const current = stages.indexOf(invocation.stage)
  return (
    <ol className="space-y-1">
      {stages.map((stage, i) => {
        const isCurrent = i === current
        return (
          <li
            key={stage}
            aria-current={isCurrent ? 'step' : undefined}
            className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
              isCurrent ? `${changedClass} border-accent font-semibold` : 'bg-surface'
            }`}
          >
            <span className="text-muted text-xs">{i + 1}</span>
            <span className={wrap}>{labels[stage]}</span>
            {isCurrent && <Badge>현재</Badge>}
            {i < current && <Badge>완료</Badge>}
          </li>
        )
      })}
    </ol>
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

function ParamRow({ param }: { param: Param }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-2 py-0.5">
      <span className={`font-mono ${wrap}`}>{`${param.name} = ${formatVal(param.value)}`}</span>
      <Badge>{param.from === 'argument' ? '인수' : '인수 없음'}</Badge>
    </li>
  )
}

function CallBox({ state, invocation }: { state: NewState; invocation: Invocation }) {
  const { thisValue, returned, result } = invocation
  return (
    <div className="border-accent bg-surface space-y-2 rounded-lg border-2 px-3 py-2">
      <p className="font-semibold">
        ‘<code className={`font-mono ${wrap}`}>{invocation.code}</code>’ 호출
      </p>
      <ul className="space-y-1">
        <Line label="인수">
          {invocation.args.length === 0 ? (
            <span className="text-muted text-sm">없음</span>
          ) : (
            invocation.args.map((v, i) => (
              <span key={i} className={`font-mono ${wrap}`}>
                {formatVal(v)}
              </span>
            ))
          )}
        </Line>
        <Line label="this">
          {thisValue === null ? (
            <span className="text-muted text-sm">아직 정해지지 않음</span>
          ) : thisValue === 'undefined' ? (
            <span className="font-mono">undefined</span>
          ) : (
            <ObjectChip state={state} value={thisValue} />
          )}
        </Line>
      </ul>
      {invocation.params.length > 0 && (
        <ul className="space-y-0.5">
          {invocation.params.map((p) => (
            <ParamRow key={p.name} param={p} />
          ))}
        </ul>
      )}
      {returned && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge>{returned.how === 'return' ? 'return' : '본문 끝'}</Badge>
          <span className="text-muted text-xs">
            {returned.how === 'return' ? 'return 값' : '본문 끝까지 실행'}
          </span>
          <AnyValue state={state} value={returned.value} />
        </p>
      )}
      {result && (
        <p className="flex flex-wrap items-center gap-2">
          <Badge>{invocation.mode === 'new' ? 'new 식의 결과' : '호출의 결과'}</Badge>
          <AnyValue state={state} value={result} />
        </p>
      )}
    </div>
  )
}

function BindingRow({ binding, state }: { binding: Binding; state: NewState }) {
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
          <ObjectChip state={state} value={binding.value} />
        </>
      ) : (
        <span className={`font-mono font-semibold ${wrap}`}>
          {`${binding.name} = ${formatVal(binding.value)}`}
        </span>
      )}
      {binding.changed && <Badge>새로 생김</Badge>}
    </li>
  )
}

function PropRow({ prop }: { prop: Prop }) {
  return (
    <li
      data-prop-key={prop.key}
      data-changed={prop.changed ? 'true' : undefined}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-2 py-1 ${fade} ${
        prop.changed ? changedClass : ''
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{prop.key}</span>
      <span className={`font-mono ${wrap}`}>{formatVal(prop.value)}</span>
      {prop.changed && <Badge>추가·변경</Badge>}
    </li>
  )
}

function ObjectCard({ object }: { object: ObjectBox }) {
  return (
    <li
      data-object-id={object.id}
      data-changed={object.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        object.created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        {object.label}
        {object.role && <Badge>{ROLE_LABELS[object.role]}</Badge>}
        {object.created && <Badge>새로 만듦</Badge>}
      </p>
      {object.props.length === 0 ? (
        <p className="text-muted mt-1 text-sm">프로퍼티 없음</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {object.props.map((p) => (
            <PropRow key={p.key} prop={p} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function NewView({ state }: Props) {
  const stageId = useId()
  const callId = useId()
  const varsId = useId()
  const objectsId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'
  const { invocation } = state

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby={stageId} className="min-w-0">
          <p id={stageId} className={headingClass}>
            호출 단계
          </p>
          {invocation ? (
            <StageList invocation={invocation} />
          ) : (
            <p className="text-muted text-sm">진행 중인 호출이 없습니다.</p>
          )}
        </section>
        <section aria-labelledby={callId} className="min-w-0">
          <p id={callId} className={headingClass}>
            호출 영역
          </p>
          {invocation ? (
            <CallBox state={state} invocation={invocation} />
          ) : (
            <p className="text-muted text-sm">실행 중인 함수 호출이 없습니다.</p>
          )}
        </section>
      </div>
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
                <ObjectCard key={o.id} object={o} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
