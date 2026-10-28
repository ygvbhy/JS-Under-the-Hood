import { useId } from 'react'
import type { Binding, Scope, ScopeState, Val } from './scenarios'

type Props = {
  state: ScopeState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const TYPE_LABELS: Record<Val['type'], string> = {
  string: '문자열',
  number: '숫자',
  undefined: 'undefined',
  function: '함수',
}

const CHANGED_LABELS: Record<NonNullable<Binding['changed']>, string> = {
  created: '새로 생김',
  updated: '값이 바뀜',
}

const PURPOSE_LABELS = { read: '읽기', assign: '대입' } as const

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
      <Badge>{TYPE_LABELS[binding.value.type]}</Badge>
      {binding.changed && <Badge>{CHANGED_LABELS[binding.changed]}</Badge>}
    </li>
  )
}

function ScopeCard({
  scope,
  outer,
  isCurrent,
  inPath,
}: {
  scope: Scope
  outer: Scope | undefined
  isCurrent: boolean
  inPath: boolean
}) {
  const outerText =
    scope.outerId === null
      ? '바깥 스코프: 없음 (가장 바깥)'
      : `바깥 스코프: ${outer?.label ?? scope.outerId}`
  return (
    <li
      className={`border-border rounded-md border p-2 ${fade} ${inPath ? changedClass : 'bg-surface'}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`font-semibold ${wrap}`}>{scope.label}</span>
        <Badge>{outerText}</Badge>
        {isCurrent && <Badge>지금 실행 중</Badge>}
      </div>
      {scope.bindings.length === 0 ? (
        <p className="text-muted text-sm">이름이 없습니다.</p>
      ) : (
        <ul className="space-y-1">
          {scope.bindings.map((b) => (
            <BindingRow key={b.name} binding={b} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function ScopeView({ state }: Props) {
  const lookupId = useId()
  const scopesId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'
  const { scopes, currentId, lookup } = state
  const byId = (id: string) => scopes.find((s) => s.id === id)
  const pathIds = new Set(lookup?.path.map((p) => p.scopeId))
  const lastFound = lookup?.path[lookup.path.length - 1]?.found

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby={lookupId} className="min-w-0">
        <p id={lookupId} className={headingClass}>
          이름 찾기
        </p>
        {scopes.length === 0 ? (
          <p className="text-muted text-sm">아직 코드를 실행하지 않았습니다.</p>
        ) : lookup === null ? (
          <p className="text-muted text-sm">이 단계에서는 이름을 찾지 않습니다.</p>
        ) : (
          <>
            <p className={`mb-2 text-sm ${wrap}`}>
              <span className="font-mono font-semibold">{lookup.name}</span>{' '}
              {PURPOSE_LABELS[lookup.purpose]}
            </p>
            <ol className="space-y-1">
              {lookup.path.map(({ scopeId, found }) => {
                const scope = byId(scopeId)
                const binding = scope?.bindings.find((b) => b.name === lookup.name)
                return (
                  <li
                    key={scopeId}
                    className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
                      found ? changedClass : 'bg-surface'
                    }`}
                  >
                    <span className={wrap}>{scope?.label ?? scopeId}</span>
                    <Badge>{found ? `있음: ${binding?.value.display ?? ''}` : '없음'}</Badge>
                  </li>
                )
              })}
            </ol>
            {lastFound === false && (
              <p className="text-muted mt-2 text-sm">끝까지 찾지 못했습니다.</p>
            )}
          </>
        )}
      </section>
      <section aria-labelledby={scopesId} className="min-w-0">
        <p id={scopesId} className={headingClass}>
          스코프
        </p>
        {scopes.length === 0 ? (
          <p className="text-muted text-sm">아직 만들어진 스코프가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {scopes.map((scope) => (
              <ScopeCard
                key={scope.id}
                scope={scope}
                outer={scope.outerId === null ? undefined : byId(scope.outerId)}
                isCurrent={scope.id === currentId}
                inPath={pathIds.has(scope.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
