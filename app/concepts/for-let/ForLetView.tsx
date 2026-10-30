import { useId } from 'react'
import type { Binding, EnvRecord, ForLetState, Lookup } from './scenarios'

type Props = {
  state: ForLetState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words'

const KIND_LABELS: Record<EnvRecord['kind'], string> = {
  global: '전역',
  loop: '반복 머리',
  iteration: '반복',
  block: '본문 블록',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function envLabel(state: ForLetState, id: string): string {
  return state.envs.find((e) => e.id === id)?.label ?? id
}

// 이 레코드를 [[Environment]]로(또는 그 바깥 연결로) 가리키는 함수 객체의 label들
function holders(state: ForLetState, envId: string): string[] {
  const reaches = (startId: string | null): boolean => {
    const seen = new Set<string>()
    let id = startId
    while (id !== null && !seen.has(id)) {
      if (id === envId) return true
      seen.add(id)
      id = state.envs.find((e) => e.id === id)?.outerId ?? null
    }
    return false
  }
  return state.functions.filter((f) => reaches(f.environmentId)).map((f) => f.label)
}

function Name({ children }: { children: string }) {
  return <span className={`font-mono ${wrap}`}>{children}</span>
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
        = {binding.state === 'uninitialized' ? '초기화 전' : binding.value}
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

function EnvItem({ state, env }: { state: ForLetState; env: EnvRecord }) {
  const running = state.lexicalEnv === env.id
  const pointing = state.functions.filter((f) => f.environmentId === env.id)
  return (
    <li
      data-env-id={env.id}
      data-running={running ? 'true' : undefined}
      data-changed={env.created ? 'true' : undefined}
      data-retained={env.retained ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        env.created
          ? `${changedClass} border-accent`
          : env.retained
            ? 'border-accent bg-surface border-dashed'
            : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <Name>{env.label}</Name>
        <Badge>{KIND_LABELS[env.kind]}</Badge>
        {running && <Badge>지금 실행 중</Badge>}
        {env.created && <Badge>새로 생김</Badge>}
        {env.retained && <Badge>남아 있음</Badge>}
      </p>
      <p className="text-sm">
        바깥: {env.outerId === null ? '없음 (null)' : <Name>{envLabel(state, env.outerId)}</Name>}
      </p>
      {env.retained && (
        <p className="mt-1 text-sm" data-retained-reason>
          실행 컨텍스트의 LexicalEnvironment에서는 닿지 않음 · 이 레코드에 닿는 함수:{' '}
          <Name>{holders(state, env.id).join(', ')}</Name>
        </p>
      )}
      <div className="mt-2 space-y-2">
        {env.kind === 'global' ? (
          <>
            {env.objectBindings && (
              <div data-part="object" className="border-border rounded-md border border-dashed p-2">
                <p className="text-muted mb-1 text-xs font-semibold">
                  객체 환경 레코드 (전역 객체의 프로퍼티)
                </p>
                <BindingList bindings={env.objectBindings} />
              </div>
            )}
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
      {pointing.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {pointing.map((f) => (
            <li key={f.id} data-points-fn={f.label} className={wrap}>
              [[Environment]]로 가리키는 함수: <Name>{f.label}</Name> ({f.heldBy})
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function LookupBox({ state, lookup }: { state: ForLetState; lookup: Lookup }) {
  const startFn =
    lookup.start === 'context' ? null : state.functions.find((f) => f.id === lookup.start)
  return (
    <div className="space-y-2">
      <p className="font-semibold">
        찾는 것: <Name>{lookup.name}</Name>
      </p>
      <p className={`text-sm ${wrap}`}>
        시작:{' '}
        {startFn ? (
          <>
            <Name>{startFn.label}</Name>의 [[Environment]]부터
          </>
        ) : (
          <>
            LexicalEnvironment(
            <Name>{state.lexicalEnv === null ? '없음' : envLabel(state, state.lexicalEnv)}</Name>
            )부터
          </>
        )}
      </p>
      <ol className="space-y-1">
        {lookup.path.map((id, i) => {
          const found = id === lookup.foundIn
          const part =
            found && lookup.part ? (lookup.part === 'declarative' ? '선언적 칸' : '객체 칸') : null
          return (
            <li
              key={id}
              data-lookup-id={id}
              data-found={found ? 'true' : undefined}
              className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${
                found ? `${changedClass} border-accent border-2` : 'bg-surface'
              }`}
            >
              <span className="text-muted text-xs">{i + 1}</span>
              <Name>{envLabel(state, id)}</Name>
              <Badge>{found ? '찾음' : '없음'}</Badge>
              {part && <Badge>{part}</Badge>}
            </li>
          )
        })}
        {lookup.foundIn === null && (
          <li
            data-not-found="true"
            className="border-border bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1"
          >
            <Badge>찾지 못함</Badge>
          </li>
        )}
      </ol>
      <p>
        결과: <Name>{lookup.result}</Name>
      </p>
    </div>
  )
}

export function ForLetView({ state }: Props) {
  const ctxId = useId()
  const envsId = useId()
  const lookupId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      <section aria-labelledby={ctxId} className="min-w-0">
        <p id={ctxId} className={headingClass}>
          실행 컨텍스트
        </p>
        {state.lexicalEnv === null ? (
          <p className="text-muted text-sm">실행 컨텍스트 없음 (실행 전)</p>
        ) : (
          <div className="border-border bg-surface rounded-lg border-2 px-3 py-2">
            <p className="font-semibold">전역 실행 컨텍스트</p>
            <p className="text-sm">
              <span className="text-muted">LexicalEnvironment:</span>{' '}
              <Name>{envLabel(state, state.lexicalEnv)}</Name>
            </p>
          </div>
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
              <EnvItem key={e.id} state={state} env={e} />
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
