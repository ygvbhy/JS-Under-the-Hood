import { useId } from 'react'
import type { Access, Binding, ObjectBox, ObjectRef, Prop, PropertyState, Val } from './scenarios'

type Props = {
  state: PropertyState
  // 바로 이전 단계의 상태. `changed` 항목이 이전에 없던 것이면 "새로 생김", 있던 것이면 "값이 바뀜"으로 표시한다.
  // 없으면(첫 단계) `changed` 항목은 모두 "새로 생김"으로 본다.
  prevState?: PropertyState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const TYPE_LABELS: Record<Val['type'], string> = {
  number: '숫자',
  string: '문자열',
  boolean: '불리언',
  undefined: 'undefined',
}

const RESULT_LABELS: Record<Access['result'], string> = {
  found: '읽음',
  missing: '없음',
  created: '추가',
  updated: '갱신',
  deleted: '삭제',
  'delete-missing': '삭제할 것 없음',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function resultText(access: Access): string {
  const key = `키 "${access.key}" 프로퍼티가`
  switch (access.result) {
    case 'found':
      return `${key} 있어 읽은 값: ${formatVal(access.value)}`
    case 'missing':
      return `${key} 없어 undefined`
    case 'created':
      return `${key} 없어 추가함, 넣은 값: ${formatVal(access.value)}`
    case 'updated':
      return `${key} 있어 값을 바꿈, 새 값: ${formatVal(access.value)}`
    case 'deleted':
      return `키 "${access.key}" 프로퍼티를 지움, delete의 값: ${formatVal(access.value)}`
    case 'delete-missing':
      return `${key} 없어 지울 것이 없음, delete의 값: ${formatVal(access.value)}`
  }
}

function hadBinding(prev: PropertyState | undefined, name: string): boolean {
  return !!prev?.bindings.some((b) => b.name === name)
}

function hadProp(prev: PropertyState | undefined, objectId: string, key: string): boolean {
  return !!prev?.objects.find((o) => o.id === objectId)?.props.some((p) => p.key === key)
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-muted text-xs">{label}</span>
      {children}
    </li>
  )
}

function AccessPanel({ access }: { access: Access | null }) {
  if (!access) {
    return <p className="text-muted text-sm">이 단계에는 프로퍼티 접근이 없습니다.</p>
  }
  const bracket = access.notation === 'bracket'
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2">
        <code className={`font-mono font-semibold ${wrap}`}>{access.code}</code>
        <Badge>{bracket ? '대괄호 표기' : '점 표기'}</Badge>
      </p>
      <ul className="space-y-1">
        {bracket && access.keyValue ? (
          <Line label="대괄호 안의 값">
            <span className={`font-mono ${wrap}`}>{formatVal(access.keyValue)}</span>
            <Badge>{TYPE_LABELS[access.keyValue.type]}</Badge>
          </Line>
        ) : (
          <Line label="점 뒤의 이름">
            <span className={`font-mono ${wrap}`}>{access.keyExpr}</span>
          </Line>
        )}
        <Line label="프로퍼티 키">
          <span className={`font-mono ${wrap}`}>{`"${access.key}"`}</span>
          <Badge>문자열</Badge>
        </Line>
      </ul>
      <p className="flex flex-wrap items-center gap-2">
        <Badge>{RESULT_LABELS[access.result]}</Badge>
        <span className={`min-w-0 text-sm ${wrap}`}>{resultText(access)}</span>
      </p>
    </div>
  )
}

function ObjectChip({ state, value }: { state: PropertyState; value: ObjectRef }) {
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

function BindingRow({
  binding,
  state,
  prevState,
}: {
  binding: Binding
  state: PropertyState
  prevState?: PropertyState
}) {
  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className="text-muted w-12 shrink-0 text-xs">{binding.declaredWith}</span>
      <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>
      {binding.changed && (
        <Badge>{hadBinding(prevState, binding.name) ? '값이 바뀜' : '새로 생김'}</Badge>
      )}
      <span className="ml-auto min-w-0 text-right">
        {'kind' in binding.value ? (
          <ObjectChip state={state} value={binding.value} />
        ) : (
          <span className={`font-mono ${wrap}`}>{formatVal(binding.value)}</span>
        )}
      </span>
    </li>
  )
}

function PropRow({
  prop,
  objectId,
  read,
  prevState,
}: {
  prop: Prop
  objectId: string
  read: boolean
  prevState?: PropertyState
}) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-2 py-0.5 ${fade} ${
        prop.changed ? changedClass : ''
      }`}
    >
      <span className={`font-mono ${wrap}`}>{`"${prop.key}":`}</span>
      <span className={`font-mono ${wrap}`}>{formatVal(prop.value)}</span>
      {prop.changed && (
        <Badge>{hadProp(prevState, objectId, prop.key) ? '값이 바뀜' : '새로 생김'}</Badge>
      )}
      {read && <Badge>읽음</Badge>}
    </li>
  )
}

function ObjectCard({
  object,
  access,
  prevState,
}: {
  object: ObjectBox
  access: Access | null
  prevState?: PropertyState
}) {
  const isNew = !prevState?.objects.some((o) => o.id === object.id)
  return (
    <li
      data-object-id={object.id}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        object.changed ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        {object.label}
        {object.changed && isNew && <Badge>새로 생김</Badge>}
      </p>
      {object.props.length === 0 ? (
        <p className="text-muted mt-1 text-sm">프로퍼티 없음</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {object.props.map((p) => (
            <PropRow
              key={p.key}
              prop={p}
              objectId={object.id}
              read={access?.result === 'found' && access.key === p.key}
              prevState={prevState}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function PropertyView({ state, prevState }: Props) {
  const accessId = useId()
  const varsId = useId()
  const objectsId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      <section
        aria-labelledby={accessId}
        className="border-border bg-surface rounded-lg border p-3"
      >
        <p id={accessId} className={headingClass}>
          프로퍼티 접근
        </p>
        <AccessPanel access={state.access} />
      </section>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby={varsId} className="min-w-0">
          <p id={varsId} className={headingClass}>
            변수
          </p>
          {state.bindings.length === 0 ? (
            <p className="text-muted text-sm">아직 표시할 변수가 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {state.bindings.map((b) => (
                <BindingRow key={b.name} binding={b} state={state} prevState={prevState} />
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby={objectsId} className="min-w-0">
          <p id={objectsId} className={headingClass}>
            객체
          </p>
          {state.objects.length === 0 ? (
            <p className="text-muted text-sm">아직 이 코드가 만든 객체가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {state.objects.map((o) => (
                <ObjectCard key={o.id} object={o} access={state.access} prevState={prevState} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
