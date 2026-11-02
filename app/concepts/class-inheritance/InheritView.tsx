import { useId } from 'react'
import type {
  Binding,
  ClassBox,
  Frame,
  InheritState,
  ObjectBox,
  ObjectRef,
  Prop,
  Val,
} from './scenarios'

type Props = {
  state: InheritState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'
const headingClass = 'text-muted mb-2 text-sm font-semibold'

const KIND_LABELS: Record<Frame['kind'], string> = {
  base: '기본 클래스 생성자',
  derived: '파생 클래스 생성자',
  'default-derived': '기본 생성자(내장)',
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  return v.type === 'string' ? `"${v.display}"` : v.display
}

function labelOf(state: InheritState, ref: ObjectRef): string {
  return state.objects.find((o) => o.id === ref.id)?.label ?? ref.id
}

function ObjectChip({ state, value }: { state: InheritState; value: ObjectRef }) {
  return (
    <span
      data-ref-to={value.id}
      className="border-accent bg-surface text-fg inline-block rounded-full border px-2 font-mono whitespace-nowrap"
    >
      → {labelOf(state, value)}
    </span>
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

function NameList({ items, empty }: { items: string[]; empty: string }) {
  return items.length === 0 ? (
    <span className="text-muted text-sm">{empty}</span>
  ) : (
    <>
      {items.map((m) => (
        <span key={m} className={`font-mono ${wrap}`}>
          {m}
        </span>
      ))}
    </>
  )
}

function ClassCard({ cls }: { cls: ClassBox }) {
  return (
    <li
      data-class-name={cls.name}
      data-changed={cls.created ? 'true' : undefined}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        cls.created ? `${changedClass} border-accent` : 'border-border bg-surface'
      }`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={`font-mono ${wrap}`}>{cls.name}</span>
        <Badge>{cls.kind === 'base' ? '기본 클래스' : '파생 클래스'}</Badge>
        {!cls.hasOwnConstructor && <Badge>기본 생성자</Badge>}
        {cls.created && <Badge>새로 생김</Badge>}
      </p>
      <ul className="mt-1 space-y-1">
        <Line label="extends">
          <span className={`font-mono ${wrap}`}>
            {cls.kind === 'derived' ? cls.ctorParent : '없음'}
          </span>
        </Line>
        <Line label="생성자 쪽 [[Prototype]]">
          <span className={`font-mono ${wrap}`}>{cls.ctorParent}</span>
        </Line>
        <Line label="prototype 쪽 [[Prototype]]">
          <span className={`font-mono ${wrap}`}>{cls.protoParent}</span>
        </Line>
        <Line label="메서드">
          <NameList items={cls.methods} empty="없음" />
        </Line>
        <Line label="필드">
          <NameList items={cls.fields} empty="없음" />
        </Line>
      </ul>
    </li>
  )
}

function thisText(state: InheritState, status: Frame['thisStatus']) {
  if (status === 'uninitialized') return <span className="font-semibold">초기화 전</span>
  if (status === 'none') return <span className="font-semibold">없음(내장 기본 생성자)</span>
  return <ObjectChip state={state} value={status} />
}

function FrameCard({
  state,
  frame,
  running,
}: {
  state: InheritState
  frame: Frame
  running: boolean
}) {
  return (
    <li
      data-frame-fn={frame.fn}
      className={`rounded-lg border-2 px-3 py-2 ${running ? 'border-accent' : 'border-border'} bg-surface`}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={`font-mono ${wrap}`}>{frame.fn}</span>
        <Badge>{KIND_LABELS[frame.kind]}</Badge>
        {running && <Badge>실행 중</Badge>}
      </p>
      <ul className="mt-1 space-y-1">
        <Line label="new.target">
          <span className={`font-mono ${wrap}`}>{frame.newTarget}</span>
        </Line>
        {frame.args.length > 0 && (
          <Line label="인수">
            {frame.args.map((v, i) => (
              <span key={i} className={`font-mono ${wrap}`}>
                {formatVal(v)}
              </span>
            ))}
          </Line>
        )}
        <Line label="this">{thisText(state, frame.thisStatus)}</Line>
      </ul>
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
        {object.created && <Badge>새로 생김</Badge>}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-muted text-xs">[[Prototype]]</span>
        <span className={`font-mono ${wrap}`}>{object.proto}</span>
      </p>
      {object.props.length === 0 ? (
        <p className="text-muted mt-1 text-sm">자기 프로퍼티 없음</p>
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

function BindingRow({ binding, state }: { binding: Binding; state: InheritState }) {
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

export function InheritView({ state }: Props) {
  const classesId = useId()
  const framesId = useId()
  const objectsId = useId()
  const lookupId = useId()
  const { lookup, error } = state
  // frames는 아래가 먼저 쌓인 순서다. 화면에는 맨 위(지금 실행 중)를 먼저 보여 준다.
  const topFirst = [...state.frames].reverse()

  return (
    <div className="space-y-4">
      <section aria-labelledby={classesId} className="min-w-0">
        <p id={classesId} className={headingClass}>
          클래스와 두 체인
        </p>
        {state.classes.length === 0 ? (
          <p className="text-muted text-sm">아직 평가된 클래스가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {state.classes.map((c) => (
              <ClassCard key={c.name} cls={c} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby={framesId} className="min-w-0">
        <p id={framesId} className={headingClass}>
          생성 중인 호출
        </p>
        {topFirst.length === 0 ? (
          <p className="text-muted text-sm">진행 중인 생성자 호출이 없습니다.</p>
        ) : (
          <>
            <p className="text-muted mb-1 text-xs">맨 위가 지금 실행 중</p>
            <ol className="space-y-2">
              {topFirst.map((f, i) => (
                <FrameCard key={`${f.fn}-${i}`} state={state} frame={f} running={i === 0} />
              ))}
            </ol>
          </>
        )}
      </section>
      <section aria-labelledby={objectsId} className="min-w-0">
        <p id={objectsId} className={headingClass}>
          객체와 변수
        </p>
        {state.objects.length === 0 ? (
          <p className="text-muted text-sm">아직 만들어진 객체가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {state.objects.map((o) => (
              <ObjectCard key={o.id} object={o} />
            ))}
          </ul>
        )}
        {state.bindings.length === 0 ? (
          <p className="text-muted mt-2 text-sm">아직 표시할 변수가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {state.bindings.map((b) => (
              <BindingRow key={b.name} binding={b} state={state} />
            ))}
          </ul>
        )}
      </section>
      {(lookup || error) && (
        <section aria-labelledby={lookupId} className="min-w-0">
          <p id={lookupId} className={headingClass}>
            메서드 찾기
          </p>
          {lookup && (
            <div className="border-accent bg-surface space-y-1 rounded-lg border-2 px-3 py-2">
              <p className="font-semibold">
                <code className={`font-mono ${wrap}`}>{lookup.expr}</code>
              </p>
              <ul className="space-y-1">
                <Line label="찾기 시작한 곳">
                  <span className={`font-mono ${wrap}`}>{lookup.startAt}</span>
                </Line>
                {lookup.via && (
                  <Line label="시작점의 근거">
                    <span className={wrap}>{lookup.via}</span>
                  </Line>
                )}
                <Line label="찾은 곳">
                  <span className={`font-mono ${wrap}`}>{lookup.foundIn}</span>
                </Line>
                <Line label="this">
                  <ObjectChip state={state} value={lookup.thisValue} />
                </Line>
              </ul>
            </div>
          )}
          {error && (
            <div className="border-accent bg-highlight mt-2 space-y-1 rounded-lg border-2 px-3 py-2">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                <Badge>오류</Badge>
                <span>{error.name} 발생</span>
              </p>
              <p className={`text-sm ${wrap}`}>{error.reason}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
