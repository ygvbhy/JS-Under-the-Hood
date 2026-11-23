import { useId, type ReactNode } from 'react'
import type { Cell, Check, LoopState } from './scenarios'

type Props = {
  state: LoopState
  prevState?: LoopState
}

const badgeClass =
  'border-border bg-surface text-fg shrink-0 rounded border px-1.5 text-xs leading-5 whitespace-nowrap'
const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words'
const headingClass = 'text-muted mb-2 text-sm font-semibold'

const CHECK_TEXT: Record<Check, string> = {
  present: 'HasProperty → true',
  absent: 'HasProperty → false → 콜백 안 부름',
  'not-checked': 'find는 확인하지 않고 Get',
}

const NO_PROPERTY = '프로퍼티 없음(HasProperty false)'

// 끝 단계: 인덱스가 고정한 길이에 닿으면 그 인덱스에서는 확인도 읽기도 하지 않고 루프를 끝낸다.
const LOOP_DONE = {
  check: '확인하지 않음(인덱스가 고정한 길이에 닿아 루프 끝)',
  read: '읽지 않음(루프 끝)',
}
// find(FindViaPredicate)에는 HasProperty 단계가 없다.
const FIND_NO_CHECK = 'find는 확인하지 않음'

function Badge({ children }: { children: string }) {
  return <span className={badgeClass}>{children}</span>
}

function Row({
  name,
  title,
  changed,
  children,
}: {
  name: string
  title: string
  changed: boolean
  children: ReactNode
}) {
  return (
    <li
      data-row={name}
      data-changed={changed ? 'true' : undefined}
      className={`border-border rounded-md border px-2 py-1 ${fade} ${
        changed ? changedClass : 'bg-surface'
      }`}
    >
      <p className="text-muted text-xs">{title}</p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={wrap}>{children}</span>
        {changed && <Badge>바뀜</Badge>}
      </p>
    </li>
  )
}

const same = <T,>(a: T | undefined, b: T) => JSON.stringify(a) === JSON.stringify(b)

function cellText(cell: Cell): string {
  if (cell.kind === 'value') return cell.value
  if (cell.kind === 'hole') return '구멍'
  return 'length 밖'
}

export function LoopView({ state, prevState }: Props) {
  const lengthId = useId()
  const arrayId = useId()
  const stepId = useId()
  const resultId = useId()
  const p = prevState
  const { array } = state

  return (
    <div className="space-y-4">
      <section aria-labelledby={lengthId} className="min-w-0">
        <p id={lengthId} className={headingClass}>
          길이
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          <Row
            name="fixed-length"
            title="시작 때 읽은 길이(고정)"
            changed={p?.fixedLength !== state.fixedLength}
          >
            {state.fixedLength === null ? '아직 읽지 않음' : state.fixedLength}
          </Row>
          <Row
            name="current-length"
            title="배열의 지금 length"
            changed={p?.array?.length !== array?.length}
          >
            {array === null ? '배열 없음' : array.length}
          </Row>
        </ul>
      </section>
      <section aria-labelledby={arrayId} className="min-w-0">
        <p id={arrayId} className={headingClass}>
          {array === null ? '배열' : `배열 ${array.name}`}
        </p>
        {array === null ? (
          <p className="text-muted text-sm">아직 만든 배열이 없습니다.</p>
        ) : (
          <>
            <ol className="flex flex-wrap gap-1">
              {array.cells.map((cell, i) => {
                const current = state.k === i
                const outOfRange = state.fixedLength !== null && i >= state.fixedLength
                const before = p?.array?.cells[i]
                return (
                  <li
                    key={i}
                    data-cell={i}
                    data-kind={cell.kind}
                    data-current={current ? 'true' : undefined}
                    className={`rounded-md border px-2 py-1 text-center text-sm ${fade} ${
                      current ? 'border-fg border-2 font-semibold' : 'border-border'
                    } ${same(before, cell) ? 'bg-surface' : changedClass} ${
                      cell.kind === 'value' ? '' : 'border-dashed'
                    }`}
                  >
                    <span className="text-muted block text-xs">
                      인덱스 {i}
                      {current && ' (지금 k)'}
                    </span>
                    <span className="block font-mono">{cellText(cell)}</span>
                    {outOfRange && <span className="text-muted block text-xs">방문 범위 밖</span>}
                  </li>
                )
              })}
            </ol>
            {array.cells.some((c) => c.kind !== 'value') && (
              <p className="text-muted mt-1 text-xs">
                구멍과 length 밖은 둘 다 프로퍼티가 없어서 HasProperty가 false입니다.
              </p>
            )}
          </>
        )}
      </section>
      <section aria-labelledby={stepId} className="min-w-0">
        <p id={stepId} className={headingClass}>
          지금 하는 일
        </p>
        {state.call === null ? (
          <p className="text-muted text-sm">이 단계에서 진행 중인 콜백 메서드 없음</p>
        ) : (
          <ol className="space-y-1">
            <Row name="call" title="실행 중인 호출" changed={p?.call !== state.call}>
              <span className="font-mono">{state.call}</span>
            </Row>
            <Row name="k" title="지금 보는 인덱스 k" changed={p?.k !== state.k}>
              {state.k === null ? '아직 없음' : state.k}
            </Row>
            <Row name="check" title="프로퍼티 확인" changed={p?.check !== state.check}>
              {state.check !== null
                ? CHECK_TEXT[state.check]
                : state.outcome !== null
                  ? LOOP_DONE.check
                  : state.method === 'find'
                    ? FIND_NO_CHECK
                    : '아직 확인 전'}
            </Row>
            <Row name="read" title="Get으로 읽은 값" changed={p?.read !== state.read}>
              {state.read === null ? (
                state.check === 'absent' ? (
                  `읽지 않음: ${NO_PROPERTY}`
                ) : state.outcome !== null ? (
                  LOOP_DONE.read
                ) : (
                  '아직 읽기 전'
                )
              ) : (
                <span className="font-mono">{state.read}</span>
              )}
            </Row>
            <Row name="callback" title="콜백이 한 일" changed={p?.callback !== state.callback}>
              {state.callback === null ? (
                '없음'
              ) : (
                <span className="font-mono">{state.callback}</span>
              )}
            </Row>
            {state.method === 'find' && (
              <Row
                name="returned"
                title="콜백 반환값 판정"
                changed={p?.returned !== state.returned}
              >
                {state.returned === null ? (
                  '없음'
                ) : (
                  <span className="font-mono">{state.returned}</span>
                )}
              </Row>
            )}
          </ol>
        )}
      </section>
      <section aria-labelledby={resultId} className="min-w-0">
        <p id={resultId} className={headingClass}>
          결과
        </p>
        <ul className="space-y-1">
          <Row
            name="visited"
            title={
              state.visited === null ? '콜백이 모은 값' : `콜백이 모은 값 ${state.visited.name}`
            }
            changed={!same(p?.visited, state.visited)}
          >
            {state.visited === null ? (
              '아직 만들지 않음'
            ) : state.visited.items.length === 0 ? (
              '빈 배열'
            ) : (
              <span className="font-mono">{state.visited.items.join(', ')}</span>
            )}
          </Row>
          <Row name="outcome" title="메서드가 끝난 이유" changed={p?.outcome !== state.outcome}>
            {state.outcome === null ? '아직 끝나지 않음' : state.outcome}
          </Row>
        </ul>
      </section>
    </div>
  )
}
