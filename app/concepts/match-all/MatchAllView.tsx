import type { MatchAllState, MatchCall, MatchRange, RegexCard } from './scenarios'

type Props = {
  state: MatchAllState
  // 바로 이전 단계의 상태. 같은 이름 카드의 lastIndex나 같은 슬롯의 값이 달라졌으면 "바뀜"으로 표시한다.
  prevState?: MatchAllState
}

const changedClass = 'bg-highlight'
const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

function isCardChanged(card: RegexCard, prevState?: MatchAllState): boolean {
  if (card.lastIndexChanged) return true
  const prev = prevState?.regexes.find((r) => r.name === card.name)
  return !!prev && prev.lastIndex !== card.lastIndex
}

function Chip({ text, changed }: { text: string; changed: boolean }) {
  return (
    <span
      className={`border-border rounded border px-1.5 font-mono text-sm ${wrap} ${fade} ${
        changed ? `${changedClass} border-accent` : 'bg-surface'
      }`}
    >
      {`${text}${changed ? ' (바뀜)' : ''}`}
    </span>
  )
}

function Card({
  title,
  note,
  children,
  name,
}: {
  title: string
  note?: string
  children: React.ReactNode
  name?: string
}) {
  return (
    <div
      data-card={name}
      className="border-border bg-surface min-w-0 rounded-lg border-2 px-3 py-2"
    >
      <p className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
        <span>{title}</span>
        {note && <span className="text-muted text-xs font-normal">{note}</span>}
      </p>
      {children}
    </div>
  )
}

function RegexCardView({ card, prevState }: { card: RegexCard; prevState?: MatchAllState }) {
  const changed = isCardChanged(card, prevState)
  return (
    <Card
      title={card.kind === 'original' ? 're' : '복제본'}
      note={card.kind === 'original' ? '코드의 변수' : '코드에 이름이 없음'}
      name={card.kind}
    >
      <p className="flex flex-wrap items-center gap-2">
        <span className={`font-mono text-sm ${wrap}`}>{card.literal}</span>
        <Chip text={`lastIndex ${card.lastIndex}`} changed={changed} />
      </p>
    </Card>
  )
}

function rangeText(range: MatchRange): string {
  if (range.start === range.end) return `${range.start}번 위치의 빈 문자열`
  return range.end - range.start === 1
    ? `${range.start}번 칸`
    : `${range.start}~${range.end - 1}번 칸`
}

// 숫자 뒤의 조사 '으로/로': 읽었을 때 끝소리에 ㄹ 아닌 받침이 있으면 '으로'(0 영, 3 삼, 6 육, 10 십 …).
function roParticle(n: number): string {
  const last = n % 10
  return last === 0 || last === 3 || last === 6 ? '으로' : '로'
}

function callText(call: MatchCall, input: string | undefined): string {
  switch (call.kind) {
    case 'get-iterator':
      return 'it[Symbol.iterator]() → it 자기 자신'
    case 'next':
      if (call.branch === 'done')
        return 'next() → [[Done]]이 true라 exec 없이 { value: undefined, done: true }'
      if (call.branch === 'miss')
        return 'next() → exec가 null이라 [[Done]]을 true로 하고 { value: undefined, done: true }'
      return 'next() → exec 결과를 value로 { done: false }'
    case 'exec':
      return `복제본.exec('${input ?? ''}'): lastIndex ${call.before}에서 시작 → ${
        call.match ? `${rangeText(call.match)}에 매치` : '매치 없음'
      } → lastIndex ${call.after}`
    case 'advance':
      return `next가 복제본의 lastIndex를 ${call.from}에서 ${call.to}${roParticle(call.to)} 한 칸 더 옮김 (빈 매치)`
  }
}

function Cells({
  text,
  match,
  exec,
}: {
  text: string
  match: MatchRange | null
  exec: Extract<MatchCall, { kind: 'exec' }> | undefined
}) {
  const cells = Array.from({ length: text.length + 1 }, (_, i) => i)
  return (
    <ul aria-label={`'${text}'의 글자 칸`} className="mt-2 flex flex-wrap gap-1">
      {cells.map((i) => {
        const isEnd = i === text.length
        const matched = !!match && i >= match.start && i < match.end
        const emptyHere = !!match && match.start === match.end && match.start === i
        return (
          <li key={i} data-cell-index={i} className="flex w-7 flex-col items-center">
            <span className="text-muted text-xs">{i}</span>
            <span
              className={`border-border flex h-7 w-7 items-center justify-center rounded border font-mono text-sm ${fade} ${
                matched || emptyHere ? `${changedClass} border-accent` : 'bg-surface'
              } ${isEnd ? 'border-dashed' : ''}`}
            >
              {isEnd ? <span className="text-muted text-[10px]">끝</span> : text[i]}
            </span>
            <span className="flex flex-col items-center text-[10px] leading-4 whitespace-nowrap">
              {matched && <span className="font-semibold">매치</span>}
              {emptyHere && <span className="font-semibold">빈 매치</span>}
              {exec && i === exec.before && <span>시작</span>}
              {exec && i === exec.after && <span>다음</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function MatchAllView({ state, prevState }: Props) {
  const { regexes, iterator, input, calls, results } = state
  const exec = calls.find((c): c is Extract<MatchCall, { kind: 'exec' }> => c.kind === 'exec')
  const prevIter = prevState?.iterator
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {regexes.length === 0 ? (
          <Card title="정규 표현식">
            <p className="text-muted text-sm">아직 만든 정규 표현식이 없습니다.</p>
          </Card>
        ) : (
          regexes.map((c) => <RegexCardView key={c.name} card={c} prevState={prevState} />)
        )}
        <Card title="이터레이터" note="matchAll이 돌려준 값">
          {iterator ? (
            <div className="flex flex-wrap gap-1">
              <Chip
                text={`[[Done]] ${iterator.done}`}
                changed={!!prevIter && prevIter.done !== iterator.done}
              />
              <Chip
                text={`[[Global]] ${iterator.global}`}
                changed={!!prevIter && prevIter.global !== iterator.global}
              />
              <Chip
                text={`[[Unicode]] ${iterator.unicode}`}
                changed={!!prevIter && prevIter.unicode !== iterator.unicode}
              />
            </div>
          ) : (
            <p className="text-muted text-sm">아직 이터레이터가 없습니다.</p>
          )}
        </Card>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">검색 문자열</p>
        {input ? (
          <div className="border-border bg-surface min-w-0 rounded-lg border px-3 py-2">
            <p className={`font-mono text-sm ${wrap}`}>{`'${input.text}'`}</p>
            <Cells text={input.text} match={input.match} exec={exec} />
            {exec && (
              <p className="text-muted mt-1 text-xs">
                시작 = 검색을 시작한 칸(호출 직전 lastIndex), 다음 = 호출 뒤 lastIndex가 가리키는 칸
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">아직 검색 문자열이 없습니다.</p>
        )}
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">이번 단계의 호출</p>
        {calls.length === 0 ? (
          <p className="text-muted text-sm">이번 단계에서는 호출이 없습니다.</p>
        ) : (
          <ul aria-label="이번 단계의 호출" className="space-y-2">
            {calls.map((c, i) => (
              <li
                key={i}
                className={`border-border bg-surface min-w-0 rounded-lg border px-3 py-2 font-mono text-sm ${wrap}`}
              >
                {callText(c, input?.text)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">지금까지 받은 매치</p>
        {results.length === 0 ? (
          <p className="text-muted text-sm">아직 받은 매치가 없습니다.</p>
        ) : (
          <ol aria-label="지금까지 받은 매치" className="space-y-1">
            {results.map((r, i) => (
              <li key={i} className={`font-mono text-sm ${wrap}`}>
                {`${JSON.stringify(r.text)} · index ${r.index}`}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
