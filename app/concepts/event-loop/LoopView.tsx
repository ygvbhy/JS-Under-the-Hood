import type { LoopState } from './scenarios'

type Props = {
  state: LoopState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: LoopState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i])

type SectionProps = {
  title: string
  hint: string
  label: string
  items: string[]
  changed: boolean
  highlightFirst?: boolean
}

function Section({ title, hint, label, items, changed, highlightFirst = false }: SectionProps) {
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
          <li className="text-muted text-sm">비어 있음</li>
        ) : (
          items.map((name, i) => (
            <li
              key={name}
              data-item={name}
              className={`min-w-0 rounded border-2 px-2 py-1 font-mono text-sm ${wrap} ${fade} ${
                highlightFirst && i === 0
                  ? 'border-accent bg-highlight'
                  : 'border-border bg-surface'
              }`}
            >
              {name}
            </li>
          ))
        )}
      </ol>
    </section>
  )
}

export function LoopView({ state, prevState }: Props) {
  const { stack, waiting, queue, task } = state
  const diff = (a: string[], b: string[] | undefined) => !!prevState && !sameList(a, b ?? [])
  const taskChanged = !!prevState && task !== prevState.task
  const topFirst = [...stack].reverse() // 위가 지금 실행 중

  return (
    <div className="space-y-3">
      <div
        className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${taskChanged ? 'bg-highlight' : ''}`}
      >
        <p className="text-muted text-xs">지금 태스크</p>
        <p className={`font-mono text-sm font-semibold ${wrap}`}>
          {task ?? '없음'}
          {taskChanged && <span className="ml-1 font-sans text-xs font-normal">(바뀜)</span>}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Section
          title="콜 스택"
          hint="맨 위가 지금 실행 중"
          label="콜 스택 (위가 지금 실행 중)"
          items={topFirst}
          changed={diff(stack, prevState?.stack)}
          highlightFirst
        />
        <Section
          title="대기 중인 타이머"
          hint="지연이 끝나기를 기다리는 중"
          label="대기 중인 타이머 (등록 순서)"
          items={waiting}
          changed={diff(waiting, prevState?.waiting)}
        />
        <Section
          title="태스크 큐"
          hint="맨 앞이 먼저 꺼내짐"
          label="태스크 큐 (맨 앞이 먼저 실행)"
          items={queue}
          changed={diff(queue, prevState?.queue)}
          highlightFirst
        />
      </div>
    </div>
  )
}
