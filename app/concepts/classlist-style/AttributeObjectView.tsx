import { useId } from 'react'
import type { AttributeObjectState, Declaration } from './scenarios'

type Props = {
  state: AttributeObjectState
  // 바로 이전 단계의 상태. 달라진 칸을 "바뀜"으로 표시한다.
  prevState?: AttributeObjectState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'
const rowBase = `border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1 ${fade}`
const headingClass = 'text-muted mb-2 text-sm font-semibold'

function Badge() {
  return <span className={badgeClass}>바뀜</span>
}

function describeValue(value: string | null): string {
  return value === null ? '없음' : `"${value}"`
}

function AttributeRow({
  name,
  value,
  prevValue,
  hasPrev,
}: {
  name: 'class' | 'style'
  value: string | null
  prevValue: string | null
  hasPrev: boolean
}) {
  const changed = hasPrev && value !== prevValue
  return (
    <li
      data-attr-name={name}
      data-changed={changed ? 'true' : undefined}
      className={`${rowBase} ${changed ? changedClass : 'bg-surface'}`}
    >
      <span className="font-mono font-semibold">{name}</span>{' '}
      <span className={`font-mono ${wrap}`}>= {describeValue(value)}</span> {changed && <Badge />}
    </li>
  )
}

const sameDeclaration = (a: Declaration, b: Declaration) =>
  a.property === b.property && a.value === b.value

export function AttributeObjectView({ state, prevState }: Props) {
  const attrsId = useId()
  const objectId = useId()
  const { attributes, tokens, declarations } = state
  const hasPrev = prevState !== undefined

  const tokenChanged = hasPrev && JSON.stringify(prevState.tokens) !== JSON.stringify(tokens)
  const declarationsChanged =
    hasPrev && JSON.stringify(prevState.declarations) !== JSON.stringify(declarations)

  return (
    <div className="space-y-4">
      <section aria-labelledby={attrsId} className="min-w-0">
        <p id={attrsId} className={headingClass}>
          요소의 어트리뷰트
        </p>
        <ul className="space-y-1">
          {tokens !== null && (
            <AttributeRow
              name="class"
              value={attributes.class}
              prevValue={prevState?.attributes.class ?? null}
              hasPrev={hasPrev}
            />
          )}
          {declarations !== null && (
            <AttributeRow
              name="style"
              value={attributes.style}
              prevValue={prevState?.attributes.style ?? null}
              hasPrev={hasPrev}
            />
          )}
        </ul>
      </section>
      {tokens !== null && (
        <section aria-labelledby={objectId} className="min-w-0">
          <p id={objectId} className={headingClass}>
            classList의 토큰 집합 {tokenChanged && <Badge />}
          </p>
          {tokens.length === 0 ? (
            <p className="text-sm">토큰 없음(빈 집합)</p>
          ) : (
            <ul className="space-y-1">
              {tokens.map((token) => {
                const added = hasPrev && !(prevState.tokens ?? []).includes(token)
                return (
                  <li
                    key={token}
                    data-token={token}
                    data-changed={added ? 'true' : undefined}
                    className={`${rowBase} ${added ? changedClass : 'bg-surface'}`}
                  >
                    <span className={`font-mono font-semibold ${wrap}`}>{token}</span>{' '}
                    {added && <Badge />}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
      {declarations !== null && (
        <section aria-labelledby={objectId} className="min-w-0">
          <p id={objectId} className={headingClass}>
            style의 선언 {declarationsChanged && <Badge />}
          </p>
          {declarations.length === 0 ? (
            <p className="text-sm">선언 없음</p>
          ) : (
            <ul className="space-y-1">
              {declarations.map((d) => {
                const added =
                  hasPrev && !(prevState.declarations ?? []).some((p) => sameDeclaration(p, d))
                return (
                  <li
                    key={d.property}
                    data-declaration={d.property}
                    data-changed={added ? 'true' : undefined}
                    className={`${rowBase} ${added ? changedClass : 'bg-surface'}`}
                  >
                    <span className={`font-mono font-semibold ${wrap}`}>{d.property}</span>{' '}
                    <span className={`font-mono ${wrap}`}>: {d.value}</span> {added && <Badge />}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
