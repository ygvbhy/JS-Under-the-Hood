import type { RafCallback, RafState } from './scenarios'

type Props = {
  state: RafState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: RafState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const sameList = <T,>(a: T[], b: T[]) => a.length === b.length && a.every((v, i) => v === b[i])

const sameCallbacks = (a: RafCallback[], b: RafCallback[]) =>
  a.length === b.length && a.every((v, i) => v.handle === b[i].handle && v.name === b[i].name)

type Item = {
  key: string | number
  text: string
  highlight?: boolean
}

type SectionProps = {
  title: string
  hint: string
  label: string
  items: Item[]
  empty?: string
  changed: boolean
}

function Section({ title, hint, label, items, empty = '비어 있음', changed }: SectionProps) {
  return (
    <section
      className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${changed ? 'bg-highlight' : 'bg-surface'}`}
    >
      <p className="text-sm font-semibold">
        <span>{title}</span>
        {changed && <span className="ml-1 text-xs font-normal">(바뀜)</span>}
      </p>
      <p className="text-muted mb-1 text-xs">{hint}</p>
      <ol aria-label={label} className="space-y-1">
        {items.length === 0 ? (
          <li className="text-muted text-sm">{empty}</li>
        ) : (
          items.map((item) => (
            <li
              key={item.key}
              data-item={item.text}
              className={`min-w-0 rounded border-2 px-2 py-1 font-mono text-sm ${wrap} ${fade} ${
                item.highlight ? 'border-accent bg-highlight' : 'border-border bg-surface'
              }`}
            >
              {item.text}
            </li>
          ))
        )}
      </ol>
    </section>
  )
}

type StatusProps = {
  label: string
  value: string
  changed: boolean
}

function Status({ label, value, changed }: StatusProps) {
  return (
    <div
      className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${changed ? 'bg-highlight' : ''}`}
    >
      <p className="text-muted text-xs">{label}</p>
      <p className={`font-mono text-sm font-semibold ${wrap}`}>
        {value}
        {changed && <span className="ml-1 font-sans text-xs font-normal">(바뀜)</span>}
      </p>
    </div>
  )
}

export function FrameView({ state, prevState }: Props) {
  const { stack, callbacks, frameHandles, current, microtasks, task, frameTime, checkpoint } = state
  const taskChanged = !!prevState && task !== prevState.task
  const frameTimeChanged = !!prevState && frameTime !== prevState.frameTime
  const checkpointChanged = !!prevState && checkpoint !== prevState.checkpoint
  const stackChanged = !!prevState && !sameList(stack, prevState.stack)
  const callbacksChanged = !!prevState && !sameCallbacks(callbacks, prevState.callbacks)
  const handlesChanged =
    !!prevState &&
    (!sameList(frameHandles ?? [], prevState.frameHandles ?? []) ||
      (frameHandles === null) !== (prevState.frameHandles === null) ||
      current !== prevState.current)
  const microtasksChanged = !!prevState && !sameList(microtasks, prevState.microtasks)
  const topFirst = [...stack].reverse() // 위가 지금 실행 중

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Status label="지금 태스크" value={task ?? '없음'} changed={taskChanged} />
        <Status label="프레임 타임스탬프" value={frameTime ?? '없음'} changed={frameTimeChanged} />
        <Status
          label="마이크로태스크 체크포인트"
          value={checkpoint ? '진행 중' : '아님'}
          changed={checkpointChanged}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Section
          title="콜 스택"
          hint="맨 위가 지금 실행 중"
          label="콜 스택 (위가 지금 실행 중)"
          items={topFirst.map((name, i) => ({ key: name, text: name, highlight: i === 0 }))}
          changed={stackChanged}
        />
        <Section
          title="콜백 맵"
          hint="handle → 콜백. 호출하기 전에 지워짐"
          label="콜백 맵 (handle 순서)"
          items={callbacks.map((c) => ({ key: c.handle, text: `handle ${c.handle}: ${c.name}` }))}
          changed={callbacksChanged}
        />
        <Section
          title="이번 실행의 handle 목록"
          hint="실행이 시작될 때 얻음. 강조는 지금 처리 중이거나 방금 처리한 handle"
          label="이번 실행의 handle 목록 (처리 순서)"
          items={(frameHandles ?? []).map((h) => ({
            key: h,
            text: h === current ? `handle ${h} (지금)` : `handle ${h}`,
            highlight: h === current,
          }))}
          empty={frameHandles === null ? '없음 (렌더링 갱신 밖)' : '비어 있음'}
          changed={handlesChanged}
        />
        <Section
          title="마이크로태스크 큐"
          hint="맨 앞이 먼저 실행됨"
          label="마이크로태스크 큐 (맨 앞이 먼저 실행)"
          items={microtasks.map((name, i) => ({ key: name, text: name, highlight: i === 0 }))}
          changed={microtasksChanged}
        />
      </div>
    </div>
  )
}
