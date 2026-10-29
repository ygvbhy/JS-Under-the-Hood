import { useId } from 'react'
import type { Binding, ContextCard, EnvRecord, ExecState, Lookup } from './scenarios'

type Props = {
  state: ExecState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words'

const PHASE_LABELS: Record<ContextCard['phase'], string> = {
  instantiation: '선언 처리',
  evaluation: '실행',
}

const KIND_LABELS: Record<EnvRecord['kind'], string> = {
  global: '전역',
  function: '함수',
  declarative: '선언적',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function envLabel(state: ExecState, id: string): string {
  return state.envs.find((e) => e.id === id)?.label ?? id
}

function Name({ children }: { children: string }) {
  return <span className={`font-mono ${wrap}`}>{children}</span>
}

function ContextItem({
  state,
  ctx,
  running,
}: {
  state: ExecState
  ctx: ContextCard
  running: boolean
}) {
  return (
    <li
      data-ctx-id={ctx.id}
      data-running={running ? 'true' : undefined}
      data-changed={ctx.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        ctx.created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <Name>{ctx.label}</Name>
        {running && <Badge>실행 중</Badge>}
        <Badge>{PHASE_LABELS[ctx.phase]}</Badge>
        {ctx.created && <Badge>새로 생김</Badge>}
      </p>
      <p className="mt-1 text-sm">
        <span className="text-muted">LexicalEnvironment →</span>{' '}
        <Name>{envLabel(state, ctx.lexicalEnv)}</Name>
      </p>
      <p className="text-sm">
        <span className="text-muted">VariableEnvironment →</span>{' '}
        <Name>{envLabel(state, ctx.variableEnv)}</Name>
      </p>
    </li>
  )
}

function BindingRow({ binding }: { binding: Binding }) {
  return (
    <li
      data-binding-name={binding.name}
      data-changed={binding.changed ? 'true' : undefined}
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>{' '}
      <span className={wrap}>
        → {binding.state === 'uninitialized' ? '초기화 전' : binding.value}
      </span>
      {binding.changed && <Badge>바뀜</Badge>}
    </li>
  )
}

function BindingList({ bindings }: { bindings: Binding[] }) {
  if (bindings.length === 0) return <p className="text-muted text-sm">바인딩 없음</p>
  return (
    <ul className="space-y-1">
      {bindings.map((b) => (
        <BindingRow key={b.name} binding={b} />
      ))}
    </ul>
  )
}

function EnvItem({
  state,
  env,
  running,
}: {
  state: ExecState
  env: EnvRecord
  running: ContextCard | undefined
}) {
  const isLexical = running?.lexicalEnv === env.id
  const isVariable = running?.variableEnv === env.id
  return (
    <li
      data-env-id={env.id}
      data-changed={env.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        env.created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <Name>{env.label}</Name>
        <Badge>{KIND_LABELS[env.kind]}</Badge>
        {env.created && <Badge>새로 생김</Badge>}
      </p>
      {(isLexical || isVariable) && (
        <p className="mt-1 flex flex-wrap items-center gap-2">
          {isLexical && <Badge>실행 중 컨텍스트의 LexicalEnvironment</Badge>}
          {isVariable && <Badge>실행 중 컨텍스트의 VariableEnvironment</Badge>}
        </p>
      )}
      <div className="mt-2 space-y-2">
        {env.kind === 'global' ? (
          <>
            <div data-part="object" className="border-border rounded-md border border-dashed p-2">
              <p className="text-muted mb-1 text-xs font-semibold">
                객체 환경 레코드 (전역 객체의 프로퍼티)
              </p>
              <BindingList bindings={env.objectBindings ?? []} />
            </div>
            <div
              data-part="declarative"
              className="border-border rounded-md border border-dashed p-2"
            >
              <p className="text-muted mb-1 text-xs font-semibold">선언적 환경 레코드</p>
              <BindingList bindings={env.bindings} />
            </div>
          </>
        ) : (
          <BindingList bindings={env.bindings} />
        )}
      </div>
      {env.thisBinding && (
        <p className="mt-2 text-sm">
          {env.thisBinding.status === 'lexical' ? (
            'this 바인딩 없음'
          ) : (
            <>
              this: <Name>{env.thisBinding.value}</Name>
            </>
          )}
        </p>
      )}
      <p className="text-sm">
        바깥([[OuterEnv]]):{' '}
        {env.outerId === null ? '없음(null)' : <Name>{envLabel(state, env.outerId)}</Name>}
      </p>
    </li>
  )
}

function LookupBox({ state, lookup }: { state: ExecState; lookup: Lookup }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">
        찾는 것: <Name>{lookup.kind === 'this' ? 'this' : lookup.name}</Name>
      </p>
      <ol className="space-y-1">
        {lookup.path.map((id, i) => {
          const found = id === lookup.foundIn
          const part =
            found && lookup.part ? (lookup.part === 'declarative' ? '선언적 칸' : '객체 칸') : null
          return (
            <li
              key={id}
              data-env-id={id}
              data-found={found ? 'true' : undefined}
              className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${
                found ? `${changedClass} border-accent border-2` : 'bg-surface'
              }`}
            >
              <span className="text-muted text-xs">{i + 1}</span>
              <Name>{envLabel(state, id)}</Name>
              {found && <Badge>찾음</Badge>}
              {part && <Badge>{part}</Badge>}
            </li>
          )
        })}
      </ol>
      <p>
        결과: <Name>{lookup.result}</Name>
      </p>
    </div>
  )
}

export function ExecView({ state }: Props) {
  const stackId = useId()
  const envsId = useId()
  const fnsId = useId()
  const lookupId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'
  const running = state.stack[state.stack.length - 1]
  const topFirst = [...state.stack].reverse()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby={stackId} className="min-w-0">
          <p id={stackId} className={headingClass}>
            실행 컨텍스트 스택
          </p>
          {state.stack.length === 0 ? (
            <p className="text-muted text-sm">실행 컨텍스트 없음 (실행 전)</p>
          ) : (
            <>
              <p className="text-muted mb-2 text-xs">
                위가 지금 실행 중, 아래로 갈수록 먼저 쌓인 컨텍스트
              </p>
              <ol className="space-y-2">
                {topFirst.map((ctx) => (
                  <ContextItem key={ctx.id} state={state} ctx={ctx} running={ctx === running} />
                ))}
              </ol>
            </>
          )}
        </section>
        <section aria-labelledby={envsId} className="min-w-0">
          <p id={envsId} className={headingClass}>
            환경 레코드
          </p>
          {state.envs.length === 0 ? (
            <p className="text-muted text-sm">아직 표시할 환경 레코드가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {state.envs.map((e) => (
                <EnvItem key={e.id} state={state} env={e} running={running} />
              ))}
            </ul>
          )}
        </section>
      </div>
      <section aria-labelledby={fnsId} className="min-w-0">
        <p id={fnsId} className={headingClass}>
          함수 객체
        </p>
        {state.functions.length === 0 ? (
          <p className="text-muted text-sm">아직 표시할 함수 객체가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {state.functions.map((f) => (
              <li
                key={f.name}
                data-fn-name={f.name}
                className="border-border bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1"
              >
                <Name>{f.name}</Name>{' '}
                <span className={wrap}>
                  → [[Environment]]: <Name>{envLabel(state, f.environmentId)}</Name>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby={lookupId} className="min-w-0">
        <p id={lookupId} className={headingClass}>
          찾기
        </p>
        {state.lookup ? (
          <LookupBox state={state} lookup={state.lookup} />
        ) : (
          <p className="text-muted text-sm">이 단계에서 찾는 이름 없음</p>
        )}
      </section>
    </div>
  )
}
