import { useId } from 'react'
import type {
  AccessorProp,
  AttrState,
  Binding,
  DataProp,
  ObjectBox,
  ObjectRef,
  Op,
  Val,
} from './scenarios'

type Props = {
  state: AttrState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function opResultText(op: Op): string {
  const value = op.value ? formatVal(op.value) : ''
  switch (op.result) {
    case 'value':
      if (op.kind === 'describe') return '디스크립터를 읽음 (getter는 호출하지 않음)'
      if (op.kind === 'integrity') return `결과: ${value}`
      return `값을 읽음: ${value}`
    case 'created':
      return '프로퍼티를 만듦'
    case 'updated':
      return `값이 바뀜: ${value}`
    case 'ignored':
      return 'writable이 false라 대입이 무시됨 — strict mode가 아니라 오류 없음'
    case 'deleted':
      return '프로퍼티를 지움'
    case 'delete-false':
      return 'configurable이 false라 삭제되지 않음 — delete 결과 false'
    case 'TypeError':
      return 'TypeError 발생'
    case 'getter-called':
      return `getter 호출 → ${value} 반환`
    case 'setter-called':
      return op.value ? `setter 호출 (대입한 값: ${value})` : 'setter 호출'
    case 'applied':
      return '적용됨'
  }
}

function OpPanel({ op }: { op: Op | null }) {
  if (!op) {
    return <p className="text-muted text-sm">이 단계에서는 프로퍼티를 다루지 않습니다.</p>
  }
  return (
    <div className="space-y-2">
      <p>
        <code className={`font-mono font-semibold ${wrap}`}>{op.code}</code>
      </p>
      <p className={`text-sm ${wrap}`}>{opResultText(op)}</p>
    </div>
  )
}

function Chip({ text, changed }: { text: string; changed: boolean }) {
  return (
    <span
      data-changed={changed ? 'true' : undefined}
      className={`border-border rounded border px-1.5 font-mono text-xs leading-5 ${wrap} ${fade} ${
        changed ? changedClass : 'bg-surface'
      }`}
    >
      {text}
    </span>
  )
}

function ObjectChip({ state, value }: { state: AttrState; value: ObjectRef }) {
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

function BindingRow({ binding, state }: { binding: Binding; state: AttrState }) {
  const isRef = 'kind' in binding.value
  return (
    <li
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
      {binding.changed && !isRef && <Badge>값이 바뀜</Badge>}
    </li>
  )
}

function DataBody({
  prop,
  state,
  has,
}: {
  prop: DataProp
  state: AttrState
  has: (f: string) => boolean
}) {
  return (
    <>
      <span
        data-changed={has('value') ? 'true' : undefined}
        className={`flex flex-wrap items-center gap-x-1 rounded px-1 ${fade} ${
          has('value') ? changedClass : ''
        }`}
      >
        <span className="text-muted text-xs">값:</span>
        {'kind' in prop.value ? (
          <ObjectChip state={state} value={prop.value} />
        ) : (
          <span className={`font-mono ${wrap}`}>{formatVal(prop.value)}</span>
        )}
      </span>
      <Chip text={`writable: ${prop.writable}`} changed={has('writable')} />
    </>
  )
}

function AccessorBody({ prop, has }: { prop: AccessorProp; has: (f: string) => boolean }) {
  return (
    <>
      <Chip text={`get: ${prop.get ?? '없음'}`} changed={has('get')} />
      <Chip text={`set: ${prop.set ?? '없음'}`} changed={has('set')} />
    </>
  )
}

function PropRow({ prop, state }: { prop: DataProp | AccessorProp; state: AttrState }) {
  const changed: string[] = prop.changed ?? []
  const created = changed.includes('created')
  const has = (f: string) => changed.includes(f)
  return (
    <li
      data-prop-key={prop.key}
      data-changed={created ? 'true' : undefined}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded px-2 py-1 ${fade} ${
        created ? changedClass : ''
      }`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{prop.key}</span>
      <Badge>{prop.kind === 'data' ? '데이터' : '접근자'}</Badge>
      {prop.kind === 'data' ? (
        <DataBody prop={prop} state={state} has={has} />
      ) : (
        <AccessorBody prop={prop} has={has} />
      )}
      <Chip text={`enumerable: ${prop.enumerable}`} changed={has('enumerable')} />
      <Chip text={`configurable: ${prop.configurable}`} changed={has('configurable')} />
      {created && <Badge>새로 생김</Badge>}
    </li>
  )
}

function ObjectCard({ object, state }: { object: ObjectBox; state: AttrState }) {
  const changed = object.changed ?? []
  const created = changed.includes('created')
  return (
    <li
      data-object-id={object.id}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        {object.label}
        <span
          data-changed={changed.includes('extensible') ? 'true' : undefined}
          className={`${badgeClass} ${fade} ${changed.includes('extensible') ? changedClass : ''}`}
        >
          {object.extensible ? '확장 가능' : '확장 불가'}
        </span>
        {created && <Badge>새로 생김</Badge>}
      </p>
      {object.props.length === 0 ? (
        <p className="text-muted mt-1 text-sm">프로퍼티 없음</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {object.props.map((p) => (
            <PropRow key={p.key} prop={p} state={state} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function AttrView({ state }: Props) {
  const opId = useId()
  const varsId = useId()
  const objectsId = useId()
  const headingClass = 'text-muted mb-2 text-sm font-semibold'

  return (
    <div className="space-y-4">
      <section aria-labelledby={opId} className="border-border bg-surface rounded-lg border p-3">
        <p id={opId} className={headingClass}>
          이번 단계의 동작
        </p>
        <OpPanel op={state.op} />
      </section>
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
            <p className="text-muted text-sm">아직 이 코드가 만든 객체가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {state.objects.map((o) => (
                <ObjectCard key={o.id} object={o} state={state} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
