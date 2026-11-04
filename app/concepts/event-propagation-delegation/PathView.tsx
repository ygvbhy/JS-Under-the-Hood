import type { Listener, PropagationState } from './scenarios'

type Props = {
  state: PropagationState
  // 바로 이전 단계의 상태. 값이 달라진 항목에 "(바뀜)"을 붙인다.
  prevState?: PropagationState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const PHASE_NAMES = ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'] as const

function ListenerChip({ listener, fired }: { listener: Listener; fired: boolean }) {
  return (
    <li
      data-listener={listener.label}
      className={`border-border flex min-w-0 items-center gap-1 rounded border px-1.5 py-0.5 text-xs ${fade} ${
        fired ? 'border-accent bg-highlight' : 'bg-surface'
      }`}
    >
      <span className={`font-mono ${wrap}`}>{listener.label}</span>
    </li>
  )
}

function passText(state: PropagationState): string {
  if (state.pass === 'capture') return '↓ 캡처 순회'
  if (state.pass === 'bubble') return '↑ 버블 순회'
  return state.path === null ? '디스패치 전' : '디스패치 끝'
}

function PanelRow({ term, value, changed }: { term: string; value: string; changed: boolean }) {
  return (
    <div className={`min-w-0 rounded px-2 py-1 ${fade} ${changed ? 'bg-highlight' : ''}`}>
      <dt className="text-muted text-xs">{term}</dt>
      <dd className={`font-mono text-sm font-semibold ${wrap}`}>
        {value}
        {changed && <span className="ml-1 font-sans text-xs font-normal">(바뀜)</span>}
      </dd>
    </div>
  )
}

export function PathView({ state, prevState }: Props) {
  const { path, listeners, node, target, eventPhase, fired } = state
  const phaseText = `${eventPhase} ${PHASE_NAMES[eventPhase]}`
  const changed = (next: unknown, prev: unknown) => !!prevState && next !== prev
  const rows = path === null ? null : [...path].reverse() // window가 위, 타깃이 아래

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{passText(state)}</p>
      {state.pass === null && path !== null && (
        <p className="text-muted text-sm">
          디스패치가 끝나 이벤트의 경로는 비워졌습니다(composedPath()는 빈 배열). 아래는 지나온
          경로입니다.
        </p>
      )}

      {rows === null ? (
        <div className="space-y-2">
          <p className="text-muted text-sm">click()을 부르면 이벤트 경로가 정해집니다</p>
          <p className="text-sm font-semibold">등록된 리스너</p>
          <ul aria-label="등록된 리스너" className="flex flex-wrap gap-2">
            {listeners.map((l) => (
              <li
                key={l.label}
                data-listener={l.label}
                className="border-border bg-surface flex min-w-0 items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
              >
                <span className={`font-mono ${wrap}`}>{l.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ol aria-label="이벤트 경로 (window부터 타깃까지)" className="space-y-1">
          {rows.map((name) => {
            const isCurrent = node === name
            const mine = listeners.filter((l) => l.node === name)
            return (
              <li
                key={name}
                data-node={name}
                className={`min-w-0 rounded-lg border-2 px-3 py-2 ${fade} ${
                  isCurrent ? 'border-accent bg-highlight' : 'border-border bg-surface'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-mono text-sm font-semibold ${wrap}`}>{name}</span>
                  {name === target && <span className="text-xs">target</span>}
                  {isCurrent && <span className="text-xs font-semibold">지금 방문</span>}
                </div>
                {mine.length > 0 && (
                  <ul aria-label={`${name}의 리스너`} className="mt-1 flex flex-wrap gap-1">
                    {mine.map((l) => (
                      <ListenerChip key={l.label} listener={l} fired={fired === l.label} />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <dl className="border-border grid grid-cols-1 gap-1 rounded-lg border p-2 sm:grid-cols-2">
        <PanelRow
          term="eventPhase"
          value={phaseText}
          changed={changed(eventPhase, prevState?.eventPhase)}
        />
        <PanelRow
          term="target"
          value={target ?? 'null'}
          changed={changed(target, prevState?.target)}
        />
        <PanelRow
          term="currentTarget"
          value={node ?? 'null'}
          changed={changed(node, prevState?.node)}
        />
        <PanelRow
          term="이번에 실행된 리스너"
          value={fired ?? '없음'}
          changed={changed(fired, prevState?.fired)}
        />
      </dl>
    </div>
  )
}
