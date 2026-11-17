import { useId } from 'react'
import type { NodeId, NodeMoveState } from './scenarios'

type Props = {
  state: NodeMoveState
  // 바로 이전 단계의 상태. 달라진 칸을 "바뀜"으로 표시한다.
  prevState?: NodeMoveState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'
const rowBase = `border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade}`
const headingClass = 'text-muted mb-2 text-sm font-semibold'

function Badge({ children = '바뀜' }: { children?: string }) {
  return <span className={badgeClass}>{children}</span>
}

// 문서에 연결된 노드는 부모(ul)와 어떤 부모의 자식 목록에 든 노드다.
// 그 밖의 노드가 문서에서 떨어진 노드다(scenarios.ts 주석의 전제).
function detachedIds(state: NodeMoveState): NodeId[] {
  const attached = new Set<NodeId>(state.parents.map((p) => p.id))
  for (const p of state.parents) for (const c of p.children) attached.add(c)
  return Object.keys(state.nodes).filter((id) => !attached.has(id))
}

function NodeRow({
  state,
  id,
  changed,
  detached,
  parent,
}: {
  state: NodeMoveState
  id: NodeId
  changed: boolean
  detached?: boolean
  parent?: boolean
}) {
  const names = state.variables.filter((v) => v.nodeId === id).map((v) => v.name)
  return (
    <li
      data-node-id={id}
      data-changed={changed ? 'true' : undefined}
      data-detached={detached ? 'true' : undefined}
      className={`${rowBase} ${changed ? changedClass : 'bg-surface'}`}
    >
      <span className={`font-mono font-semibold ${wrap}`}>{state.nodes[id].label}</span>{' '}
      <span className="text-muted font-mono text-xs">{id}</span>{' '}
      {names.length > 0 && (
        <span className={`font-mono text-sm ${wrap}`}>변수 {names.join(', ')}</span>
      )}{' '}
      {parent && <Badge>문서에 연결됨</Badge>}
      {detached && <Badge>문서에서 떨어짐</Badge>} {changed && <Badge />}
    </li>
  )
}

export function NodeMoveView({ state, prevState }: Props) {
  const treeId = useId()
  const detachedHeadingId = useId()
  const hasPrev = prevState !== undefined
  const detached = detachedIds(state)
  const prevDetached = new Set(prevState ? detachedIds(prevState) : [])

  return (
    <div className="space-y-4">
      <section aria-labelledby={treeId} className="min-w-0">
        <p id={treeId} className={headingClass}>
          문서의 노드 트리
        </p>
        <ul className="space-y-3">
          {state.parents.map((parent) => {
            const prevParent = prevState?.parents.find((p) => p.id === parent.id)
            return (
              <li key={parent.id} className="min-w-0">
                <ul className="space-y-1">
                  <NodeRow state={state} id={parent.id} changed={false} parent />
                </ul>
                {parent.children.length === 0 ? (
                  <p className="mt-1 ml-4 text-sm">자식 없음</p>
                ) : (
                  <ul className="mt-1 ml-4 space-y-1">
                    {parent.children.map((id, index) => (
                      <NodeRow
                        key={id}
                        state={state}
                        id={id}
                        changed={hasPrev && prevParent?.children[index] !== id}
                      />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <section aria-labelledby={detachedHeadingId} className="min-w-0">
        <p id={detachedHeadingId} className={headingClass}>
          문서에서 떨어진 노드
        </p>
        {detached.length === 0 ? (
          <p className="text-sm">없음</p>
        ) : (
          <ul className="space-y-1">
            {detached.map((id) => (
              <NodeRow
                key={id}
                state={state}
                id={id}
                changed={hasPrev && !prevDetached.has(id)}
                detached
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
