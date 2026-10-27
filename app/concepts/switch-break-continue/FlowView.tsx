import { useId } from 'react'
import type { Binding, Block, FlowEvent, FlowState, Val } from './scenarios'

type Props = {
  state: FlowState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const TYPE_LABELS: Record<Val['type'], string> = { number: '숫자', string: '문자열' }
const CHANGED_LABELS = { created: '새로 생김', updated: '값이 바뀜' } as const

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function formatVal(v: Val): string {
  switch (v.type) {
    case 'string':
      return `"${v.display}"`
    case 'number':
      return v.display
  }
}

function eventBadge(event: FlowEvent): string {
  switch (event.kind) {
    case 'value':
      return '값'
    case 'compare':
      return '비교'
    case 'default':
      return 'default'
    case 'fall-through':
      return '이어서 실행'
    case 'condition':
      return '조건'
    case 'jump':
      return event.statement
    case 'exit':
      return '끝'
  }
}

function jumpText(event: Extract<FlowEvent, { kind: 'jump' }>): string {
  switch (event.statement) {
    case 'break':
      return event.target === 'switch' ? '가장 가까운 switch를 끝냄' : '가장 가까운 반복문을 끝냄'
    case 'continue':
      return '이번 반복을 끝내고 증감식으로'
  }
}

function exitText(event: Extract<FlowEvent, { kind: 'exit' }>): string {
  switch (event.reason) {
    case 'end':
      return '마지막 문장까지 실행해 switch를 벗어남'
    case 'no-match':
      return '일치하는 case도 default도 없어 switch를 벗어남'
  }
}

function eventText(event: FlowEvent): string {
  switch (event.kind) {
    case 'value':
      return `${event.code}의 값 ${formatVal(event.value)}`
    case 'compare':
      return `${event.caseCode}: ${formatVal(event.left)} === ${formatVal(event.right)} → ${event.result}`
    case 'default':
      return '일치하는 case가 없어 default부터 실행'
    case 'fall-through':
      return `break가 없어 ${event.caseCode}의 문장으로 이어서 실행(식은 평가하지 않음)`
    case 'condition':
      return `${event.code} → ${event.result}`
    case 'jump':
      return jumpText(event)
    case 'exit':
      return exitText(event)
  }
}

function EventItem({ event }: { event: FlowEvent }) {
  return (
    <li
      className={`border-border bg-surface flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade}`}
    >
      <Badge>{eventBadge(event)}</Badge>
      <span className={`min-w-0 ${wrap}`}>{eventText(event)}</span>
    </li>
  )
}

function BlockBox({ blocks }: { blocks: Block[] }) {
  const [block, ...inner] = blocks
  return (
    <div className="border-border bg-surface min-w-0 rounded-lg border px-3 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <Badge>{block.kind === 'for' ? '반복문' : 'switch'}</Badge>
        <span className={`min-w-0 font-mono ${wrap}`}>{block.code}</span>
        {block.iteration !== undefined && <span>{block.iteration}회차</span>}
      </div>
      {block.events.length > 0 && (
        <ol className="mt-2 space-y-2">
          {block.events.map((e, i) => (
            <EventItem key={i} event={e} />
          ))}
        </ol>
      )}
      {inner.length > 0 && (
        <div className="mt-2 ml-2">
          <BlockBox blocks={inner} />
        </div>
      )}
    </div>
  )
}

function BindingRow({ binding }: { binding: Binding }) {
  return (
    <li
      className={`border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? 'bg-highlight' : 'bg-surface'
      }`}
    >
      <Badge>{binding.declaredWith}</Badge>
      <span className={`font-mono font-semibold ${wrap}`}>{binding.name}</span>
      <span>=</span>
      <span className={`min-w-0 font-mono ${wrap}`}>{formatVal(binding.value)}</span>
      <Badge>{TYPE_LABELS[binding.value.type]}</Badge>
      {binding.changed && <Badge>{CHANGED_LABELS[binding.changed]}</Badge>}
    </li>
  )
}

export function FlowView({ state }: Props) {
  const flowId = useId()
  const bindingsId = useId()
  const { blocks, bindings } = state

  return (
    <div className="space-y-4">
      <section aria-labelledby={flowId} className="min-w-0">
        <p id={flowId} className="text-muted mb-2 text-sm font-semibold">
          실행 중인 구조
        </p>
        {blocks.length > 0 ? (
          <BlockBox blocks={blocks} />
        ) : (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 실행 중인 switch나 반복문이 없습니다.
          </div>
        )}
      </section>

      <section aria-labelledby={bindingsId} className="min-w-0">
        <p id={bindingsId} className="text-muted mb-2 text-sm font-semibold">
          변수
        </p>
        {bindings.length === 0 ? (
          <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
            아직 표시할 변수가 없습니다.
          </div>
        ) : (
          <ul className="space-y-1">
            {bindings.map((b) => (
              <BindingRow key={b.name} binding={b} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
