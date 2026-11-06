import type { Completion, TryState } from './scenarios'

type Props = {
  state: TryState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: TryState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const KIND_LABEL = { normal: '정상 완료', return: 'return 완료', throw: 'throw 완료' } as const

const completionText = (c: Completion | null): string => {
  if (c === null) return '아직 없음'
  return c.value === null ? KIND_LABEL[c.kind] : `${KIND_LABEL[c.kind]} (${c.value})`
}

type BoxProps = {
  title: string
  hint: string
  changed: boolean
  children: React.ReactNode
}

function Box({ title, hint, changed, children }: BoxProps) {
  return (
    <section
      className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${changed ? 'bg-highlight' : 'bg-surface'}`}
    >
      <p className="text-sm font-semibold">
        <span>{title}</span>
        {changed && <span className="ml-1 text-xs font-normal">(바뀜)</span>}
      </p>
      <p className="text-muted mb-1 text-xs">{hint}</p>
      {children}
    </section>
  )
}

const itemBase = `min-w-0 rounded border-2 px-2 py-1 font-mono text-sm ${wrap} ${fade}`

export function TryView({ state, prevState }: Props) {
  const { stack, vars, tryResult, finallyResult, result } = state
  const diff = <T,>(a: T, b: T | undefined) => !!prevState && !sameJson(a, b)
  const topFirst = [...stack].reverse() // 위가 지금 실행 중

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Box
        title="실행 컨텍스트 스택"
        hint="맨 위가 지금 실행 중"
        changed={diff(stack, prevState?.stack)}
      >
        <ol aria-label="실행 컨텍스트 스택 (위가 지금 실행 중)" className="space-y-1">
          {topFirst.map((name, i) => (
            <li
              key={name}
              className={`${itemBase} ${i === 0 ? 'border-accent bg-highlight' : 'border-border bg-surface'}`}
            >
              {name}
            </li>
          ))}
        </ol>
      </Box>
      <Box
        title="지역 변수"
        hint="지금 실행 중인 함수의 변수"
        changed={diff(vars, prevState?.vars)}
      >
        <ul aria-label="지역 변수 (이름과 값)" className="space-y-1">
          {vars.length === 0 ? (
            <li className="text-muted text-sm">없음</li>
          ) : (
            vars.map((v) => (
              <li
                key={v.name}
                data-item={v.name}
                className={`${itemBase} border-border bg-surface`}
              >
                {`${v.name} = ${v.value}`}
              </li>
            ))
          )}
        </ul>
      </Box>
      <Box
        title="블록의 완료"
        hint="try 블록과 finally 블록이 어떻게 끝났는지"
        changed={diff([tryResult, finallyResult], [prevState?.tryResult, prevState?.finallyResult])}
      >
        <ul aria-label="블록의 완료 (try 블록, finally 블록)" className="space-y-1">
          <li data-item="try 블록" className={`${itemBase} border-border bg-surface`}>
            <p className="font-semibold">try 블록</p>
            <p>{completionText(tryResult)}</p>
          </li>
          <li data-item="finally 블록" className={`${itemBase} border-border bg-surface`}>
            <p className="font-semibold">finally 블록</p>
            <p>{completionText(finallyResult)}</p>
          </li>
        </ul>
      </Box>
      <Box
        title="try 문의 결과"
        hint="try 문 전체가 어떻게 끝났는지"
        changed={diff(result, prevState?.result)}
      >
        <p
          aria-label="try 문의 결과"
          className={`${itemBase} ${result === null ? 'border-border bg-surface text-muted' : 'border-accent bg-highlight'}`}
        >
          {completionText(result)}
        </p>
      </Box>
    </div>
  )
}
