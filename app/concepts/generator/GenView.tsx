import type { GenState } from './scenarios'

type Props = {
  state: GenState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: GenState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

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

export function GenView({ state, prevState }: Props) {
  const { stack, gens, call, result } = state
  const diff = <T,>(a: T, b: T | undefined) => !!prevState && !sameJson(a, b)
  const topFirst = [...stack].reverse() // 위가 지금 실행 중
  const callText = call ? `${call.target}.${call.method}(${call.arg})` : '없음'
  const resultText = result ? `{ value: ${result.value}, done: ${String(result.done)} }` : '없음'

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
        title="제너레이터 객체"
        hint="상태와 본문이 기억하는 변수"
        changed={diff(gens, prevState?.gens)}
      >
        <ul aria-label="제너레이터 객체 (변수 이름과 상태)" className="space-y-1">
          {gens.length === 0 ? (
            <li className="text-muted text-sm">없음</li>
          ) : (
            gens.map((g) => (
              <li
                key={g.name}
                data-item={g.name}
                className={`${itemBase} ${g.status === 'executing' ? 'border-accent bg-highlight' : 'border-border bg-surface'}`}
              >
                <p className="font-semibold">{g.name}</p>
                <p>{`상태: ${g.status}`}</p>
                {g.vars.length === 0 ? (
                  <p className="text-muted">변수 없음</p>
                ) : (
                  <ul aria-label={`${g.name}의 변수`}>
                    {g.vars.map((v) => (
                      <li key={v.name}>{`${v.name} = ${v.value}`}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))
          )}
        </ul>
      </Box>
      <Box title="지금 호출" hint="처리 중인 메서드 호출" changed={diff(call, prevState?.call)}>
        <p className={`font-mono text-sm font-semibold ${wrap}`}>{callText}</p>
      </Box>
      <Box
        title="돌려준 결과"
        hint="호출이 돌려준 결과 객체"
        changed={diff(result, prevState?.result)}
      >
        <p className={`font-mono text-sm font-semibold ${wrap}`}>{resultText}</p>
      </Box>
    </div>
  )
}
