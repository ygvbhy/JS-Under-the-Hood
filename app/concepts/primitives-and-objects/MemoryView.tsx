import { useEffect, useRef } from 'react'
import type { Binding, MemoryState, ObjectEntry, Prop, Value } from './scenarios'

type Props = {
  state: MemoryState
  // 바로 이전 단계의 상태. `changed` 항목이 이전에 없던 것이면 "새로 생김", 있던 것이면 "변경됨"으로 표시한다.
  // 없으면(첫 단계) `changed` 항목은 모두 "새로 생김"으로 본다.
  prevState?: MemoryState
}

const MARKERS: Record<Binding['declaredWith'], string> = {
  let: 'let',
  const: 'const',
  var: 'var',
  param: '매개변수',
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'

function formatPrimitive(value: Extract<Value, { kind: 'primitive' }>): string {
  return value.type === 'string' ? `"${value.display}"` : value.display
}

function objectLabel(state: MemoryState, id: string): string {
  return state.objects.find((o) => o.id === id)?.label ?? id
}

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function ValueView({ value, state }: { value: Value; state: MemoryState }) {
  if (value.kind === 'primitive') {
    return <span className="font-mono">{formatPrimitive(value)}</span>
  }
  // 참조 칩: 접근성·좁은 화면에서도 의미를 전달하는 기본 수단(화살표는 장식)
  return (
    <span
      data-ref-to={value.id}
      className="border-accent bg-surface text-fg inline-block rounded-full border px-2 font-mono whitespace-nowrap"
    >
      → {objectLabel(state, value.id)}
    </span>
  )
}

function referencedIds(state: MemoryState): Set<string> {
  const ids = new Set<string>()
  for (const scope of state.scopes) {
    for (const b of scope.bindings) if (b.value.kind === 'object') ids.add(b.value.id)
  }
  for (const o of state.objects) {
    for (const p of o.props) if (p.value.kind === 'object') ids.add(p.value.id)
  }
  return ids
}

function hadBinding(prev: MemoryState | undefined, scopeId: string, name: string): boolean {
  return !!prev?.scopes.find((s) => s.id === scopeId)?.bindings.some((b) => b.name === name)
}

function hadProp(prev: MemoryState | undefined, objectId: string, key: string): boolean {
  return !!prev?.objects.find((o) => o.id === objectId)?.props.some((p) => p.key === key)
}

function BindingRow({
  binding,
  scopeId,
  state,
  prevState,
}: {
  binding: Binding
  scopeId: string
  state: MemoryState
  prevState?: MemoryState
}) {
  return (
    <li
      className={`border-border flex items-center gap-2 rounded-md border px-2 py-1 ${fade} ${
        binding.changed ? changedClass : 'bg-surface'
      }`}
    >
      <span className="text-muted w-14 shrink-0 text-xs">{MARKERS[binding.declaredWith]}</span>
      <span className="font-mono font-semibold">{binding.name}</span>
      {binding.changed && (
        <Badge>{hadBinding(prevState, scopeId, binding.name) ? '변경됨' : '새로 생김'}</Badge>
      )}
      <span className="ml-auto min-w-0 text-right">
        <ValueView value={binding.value} state={state} />
      </span>
    </li>
  )
}

function PropRow({
  prop,
  objectId,
  state,
  prevState,
}: {
  prop: Prop
  objectId: string
  state: MemoryState
  prevState?: MemoryState
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded px-2 py-0.5 ${fade} ${
        prop.changed ? changedClass : ''
      }`}
    >
      <span className="font-mono">{prop.key}:</span>
      <ValueView value={prop.value} state={state} />
      {prop.changed && (
        <Badge>{hadProp(prevState, objectId, prop.key) ? '변경됨' : '새로 생김'}</Badge>
      )}
    </li>
  )
}

function ObjectCard({
  object,
  state,
  prevState,
  referenced,
}: {
  object: ObjectEntry
  state: MemoryState
  prevState?: MemoryState
  referenced: boolean
}) {
  const isNew = !prevState?.objects.some((o) => o.id === object.id)
  return (
    <li
      data-object-id={object.id}
      className={`rounded-lg border-2 px-3 py-2 ${fade} ${
        object.changed ? `${changedClass} border-accent` : 'border-border bg-surface'
      } ${referenced ? '' : 'border-dashed'}`}
    >
      {/* 접근할 수 없는 객체(어떤 바인딩·객체 프로퍼티도 쓰지 않음)는 내용만 흐리게 하고, 안내 문구는 대비를 지키도록 흐리지 않는다 */}
      <div className={`${fade} ${referenced ? '' : 'opacity-70'}`}>
        <p className="flex items-center gap-2 font-semibold">
          {object.label}
          {object.changed && isNew && <Badge>새로 생김</Badge>}
        </p>
        <ul className="mt-1 space-y-0.5">
          {object.props.map((p) => (
            <PropRow
              key={p.key}
              prop={p}
              objectId={object.id}
              state={state}
              prevState={prevState}
            />
          ))}
        </ul>
      </div>
      {!referenced && <p className="text-muted mt-1 text-xs">더 이상 접근할 수 없음</p>}
    </li>
  )
}

const SVG_NS = 'http://www.w3.org/2000/svg'

// 참조 칩 → 객체 카드 화살표를 SVG에 그린다. 장식이므로 React 상태가 아니라 DOM에 직접 그리고,
// 두 열이 나란히 놓이는 폭(sm, 640px 이상)에서만 그린다. 측정에 실패하면 아무것도 그리지 않는다.
function drawArrows(container: HTMLElement, svg: SVGSVGElement) {
  const group = svg.querySelector('g')
  if (!group) return
  group.replaceChildren()
  if (typeof window.matchMedia !== 'function' || !window.matchMedia('(min-width: 640px)').matches) {
    return
  }
  const box = container.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return

  const cards = new Map<string, HTMLElement>()
  container.querySelectorAll<HTMLElement>('[data-object-id]').forEach((el) => {
    if (el.dataset.objectId) cards.set(el.dataset.objectId, el)
  })
  const chips = [...container.querySelectorAll<HTMLElement>('[data-ref-to]')]

  // 같은 카드로 들어오는 화살표가 겹치지 않도록 도착 지점을 조금씩 어긋나게 한다
  const incoming = new Map<string, number>()
  for (const chip of chips) {
    const id = chip.dataset.refTo
    if (id) incoming.set(id, (incoming.get(id) ?? 0) + 1)
  }
  const seen = new Map<string, number>()

  for (const chip of chips) {
    const id = chip.dataset.refTo
    const card = id ? cards.get(id) : undefined
    if (!id || !card) continue
    const c = chip.getBoundingClientRect()
    const t = card.getBoundingClientRect()
    const index = seen.get(id) ?? 0
    seen.set(id, index + 1)
    const spread = ((incoming.get(id) ?? 1) - 1) / 2
    const x1 = c.right - box.left
    const y1 = c.top + c.height / 2 - box.top
    const x2 = t.left - box.left
    const y2 = t.top + Math.min(t.height / 2, 20) - box.top + (index - spread) * 6
    // 칩이 카드보다 오른쪽에 있거나 거의 맞닿아 있으면(열이 나란하지 않음) 그리지 않는다
    if (x2 - x1 < 12) continue
    const dx = Math.max((x2 - x1) / 2, 16)
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2 - 1} ${y2}`)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.5')
    path.setAttribute('marker-end', 'url(#memory-arrowhead)')
    group.appendChild(path)
  }
}

export function MemoryView({ state, prevState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // 상태가 바뀔 때마다, 그리고 영역 크기가 바뀔 때마다 화살표를 다시 계산한다
  useEffect(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return
    const redraw = () => drawArrows(container, svg)
    redraw()
    window.addEventListener('resize', redraw)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(redraw)
    observer?.observe(container)
    return () => {
      window.removeEventListener('resize', redraw)
      observer?.disconnect()
    }
  }, [state])

  const referenced = referencedIds(state)
  const isEmpty = state.objects.length === 0 && state.scopes.every((s) => s.bindings.length === 0)

  if (isEmpty) {
    return (
      <div className="border-border bg-surface text-muted rounded-lg border px-3 py-6 text-center">
        아직 표시할 변수가 없습니다.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-10">
        <section aria-label="변수" className="min-w-0">
          <p className="text-muted mb-2 text-sm font-semibold" aria-hidden="true">
            변수
          </p>
          <div className="space-y-3">
            {state.scopes.map((scope) => (
              <div key={scope.id}>
                <p className="mb-1 text-sm font-semibold">{scope.label}</p>
                <ul className="space-y-1">
                  {scope.bindings.map((b) => (
                    <BindingRow
                      key={b.name}
                      binding={b}
                      scopeId={scope.id}
                      state={state}
                      prevState={prevState}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section aria-label="객체" className="min-w-0">
          <p className="text-muted mb-2 text-sm font-semibold" aria-hidden="true">
            객체
          </p>
          {state.objects.length === 0 ? (
            <p className="text-muted text-sm">아직 이 코드가 만든 객체가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {state.objects.map((o) => (
                <ObjectCard
                  key={o.id}
                  object={o}
                  state={state}
                  prevState={prevState}
                  referenced={referenced.has(o.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      <svg
        ref={svgRef}
        aria-hidden="true"
        focusable="false"
        className="text-accent pointer-events-none absolute inset-0 hidden h-full w-full overflow-hidden sm:block"
      >
        <defs>
          <marker
            id="memory-arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <g />
      </svg>
    </div>
  )
}
