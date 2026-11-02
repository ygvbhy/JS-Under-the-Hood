import type { ExecCall, RegexCard, RegexState } from './scenarios'

type Props = {
  state: RegexState
  // 바로 이전 단계의 상태. 같은 이름 카드의 lastIndex가 달라졌으면 "바뀜"으로 표시한다.
  prevState?: RegexState
}

const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function isChanged(card: RegexCard, prevState?: RegexState): boolean {
  if (card.lastIndexChanged) return true
  const prev = prevState?.regexes.find((r) => r.name === card.name)
  return !!prev && prev.lastIndex !== card.lastIndex
}

function Card({ card, prevState }: { card: RegexCard; prevState?: RegexState }) {
  const changed = isChanged(card, prevState)
  return (
    <li
      data-regex-name={card.name}
      className="border-border bg-surface min-w-0 rounded-lg border-2 px-3 py-2"
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span className={`font-mono ${wrap}`}>{card.name}</span>
        <span className={`font-mono text-sm ${wrap}`}>{card.literal}</span>
        <span
          className={`border-border rounded border px-1.5 font-mono text-sm ${fade} ${
            changed ? `${changedClass} border-accent` : 'bg-surface'
          }`}
        >
          {`lastIndex ${card.lastIndex}${changed ? ' (바뀜)' : ''}`}
        </span>
      </p>
    </li>
  )
}

function resultText(call: ExecCall): string {
  if (call.method === 'test') return call.match ? 'true' : 'false'
  return call.match ? `index ${call.match.start}` : 'null'
}

// 매치 범위는 끝 위치를 포함하지 않으므로(lastIndex = 끝 위치) 칸 번호로는 start ~ end - 1이다.
function matchText(call: ExecCall): string {
  if (!call.match) return ' (매치 없음)'
  const { start, end } = call.match
  if (start === end) return ` (${start}번 위치의 빈 문자열에 매치)`
  return start === end - 1 ? ` (${start}번 칸에 매치)` : ` (${start}~${end - 1}번 칸에 매치)`
}

function Cells({ call }: { call: ExecCall }) {
  const { input, match, before, after } = call
  const cells = Array.from({ length: input.length + 1 }, (_, i) => i)
  return (
    <ul aria-label={`'${input}'의 글자 칸`} className="mt-2 flex flex-wrap gap-1">
      {cells.map((i) => {
        const isEnd = i === input.length
        const matched = !!match && i >= match.start && i < match.end
        const ch = isEnd ? '' : input[i]
        return (
          <li key={i} data-cell-index={i} className="flex w-7 flex-col items-center">
            <span className="text-muted text-xs">{i}</span>
            <span
              className={`border-border flex h-7 w-7 items-center justify-center rounded border font-mono text-sm ${fade} ${
                matched ? `${changedClass} border-accent` : 'bg-surface'
              } ${isEnd ? 'border-dashed' : ''}`}
            >
              {isEnd ? (
                <span className="text-muted text-[10px]">끝</span>
              ) : ch === ' ' ? (
                <>
                  <span aria-hidden="true">␣</span>
                  <span className="sr-only">공백</span>
                </>
              ) : (
                ch
              )}
            </span>
            <span className="flex flex-col items-center text-[10px] leading-4 whitespace-nowrap">
              {matched && <span className="font-semibold">매치</span>}
              {i === before && <span>시작</span>}
              {i === after && <span>다음</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Call({ call }: { call: ExecCall }) {
  return (
    <li className="border-border bg-surface min-w-0 rounded-lg border px-3 py-2">
      <p className={`font-mono text-sm ${wrap}`}>
        {`${call.regex}.${call.method}('${call.input}')`}
      </p>
      <Cells call={call} />
      <p className="text-muted mt-1 text-xs">
        시작 = 검색을 시작한 칸(호출 직전 lastIndex), 다음 = 호출 뒤 lastIndex가 가리키는 칸
      </p>
      <p className="mt-1 text-sm">
        <span>
          {`결과: ${resultText(call)}`}
          {matchText(call)}
        </span>
        <span className="font-mono">{` · lastIndex ${call.before} → ${call.after}`}</span>
      </p>
    </li>
  )
}

export function RegexView({ state, prevState }: Props) {
  return (
    <div className="space-y-3">
      {state.regexes.length === 0 ? (
        <p className="text-muted text-sm">아직 만든 정규 표현식이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {state.regexes.map((c) => (
            <Card key={c.name} card={c} prevState={prevState} />
          ))}
        </ul>
      )}
      <div>
        <p className="mb-1 text-sm font-semibold">이 단계의 검색</p>
        {state.calls.length === 0 ? (
          <p className="text-muted text-sm">이 단계에서는 검색이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {state.calls.map((c, i) => (
              <Call key={i} call={c} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
