import type { AsyncState, CallStatus } from './scenarios'

type Props = {
  state: AsyncState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: AsyncState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const STATUS_LABEL: Record<CallStatus, string> = {
  running: '실행 중',
  awaiting: 'await에서 멈춤',
  completed: '끝남',
}

const PROMISE_LABEL = { pending: 'pending', fulfilled: 'fulfilled', rejected: 'rejected' } as const

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

export function AsyncView({ state, prevState }: Props) {
  const { stack, calls, promises, jobs } = state
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
          {stack.length === 0 ? (
            <li className="text-muted text-sm">비어 있음</li>
          ) : (
            topFirst.map((name, i) => (
              <li
                key={name}
                className={`${itemBase} ${i === 0 ? 'border-accent bg-highlight' : 'border-border bg-surface'}`}
              >
                {name}
              </li>
            ))
          )}
        </ol>
      </Box>
      <Box
        title="async 함수 호출"
        hint="실행 중 · await에서 멈춤 · 끝남"
        changed={diff(calls, prevState?.calls)}
      >
        <ul aria-label="async 함수 호출 (이름과 상태)" className="space-y-1">
          {calls.length === 0 ? (
            <li className="text-muted text-sm">없음</li>
          ) : (
            calls.map((c) => (
              <li
                key={c.name}
                data-item={c.name}
                className={`${itemBase} ${c.status === 'running' ? 'border-accent bg-highlight' : 'border-border bg-surface'}`}
              >
                <p className="font-semibold">{c.name}</p>
                <p>{`상태: ${STATUS_LABEL[c.status]}`}</p>
              </li>
            ))
          )}
        </ul>
      </Box>
      <Box
        title="프로미스"
        hint="변수에 담긴 프로미스의 상태와 등록된 반응"
        changed={diff(promises, prevState?.promises)}
      >
        <ul aria-label="프로미스 (이름과 상태)" className="space-y-1">
          {promises.length === 0 ? (
            <li className="text-muted text-sm">없음</li>
          ) : (
            promises.map((p) => (
              <li
                key={p.name}
                data-item={p.name}
                className={`${itemBase} border-border bg-surface`}
              >
                <p className="font-semibold">{p.name}</p>
                <p>
                  {p.result === null
                    ? `상태: ${PROMISE_LABEL[p.state]}`
                    : `상태: ${PROMISE_LABEL[p.state]} (${p.result})`}
                </p>
                <p>{`등록된 반응: ${p.reactions.length === 0 ? '없음' : p.reactions.join(', ')}`}</p>
              </li>
            ))
          )}
        </ul>
      </Box>
      <Box title="프로미스 Job 큐" hint="맨 앞이 먼저 실행됨" changed={diff(jobs, prevState?.jobs)}>
        <ol aria-label="프로미스 Job 큐 (맨 앞이 먼저 실행)" className="space-y-1">
          {jobs.length === 0 ? (
            <li className="text-muted text-sm">비어 있음</li>
          ) : (
            jobs.map((job, i) => (
              <li
                key={`${job}-${i}`}
                data-item={job}
                className={`${itemBase} ${i === 0 ? 'border-accent bg-highlight' : 'border-border bg-surface'}`}
              >
                {job}
              </li>
            ))
          )}
        </ol>
      </Box>
    </div>
  )
}
