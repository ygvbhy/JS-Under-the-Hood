import type { AsyncGenState, GenState } from './scenarios'

type Props = {
  state: AsyncGenState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: AsyncGenState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const GEN_STATE_LABEL: Record<GenState, string> = {
  'suspended-start': '시작 전에 멈춤',
  'suspended-yield': 'yield에서 멈춤',
  executing: '요청을 처리하는 중(await로 멈춰 있어도 이 상태)',
  'draining-queue': '큐에 남은 요청을 본문 없이 끝내는 중',
  completed: '끝남',
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

export function AsyncGenView({ state, prevState }: Props) {
  const { genState, queue, promises, jobs, running } = state
  const diff = <T,>(a: T, b: T | undefined) => !!prevState && !sameJson(a, b)

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Box
        title="async 제너레이터 상태"
        hint="상태와 지금 코드를 실행 중인 곳"
        changed={diff([genState, running], prevState && [prevState.genState, prevState.running])}
      >
        <div
          role="group"
          aria-label="async 제너레이터 상태 (상태와 실행 중인 곳)"
          className="space-y-1"
        >
          <p className={`${itemBase} border-accent bg-highlight`} data-item="gen-state">
            <span className="font-semibold">{`상태: ${genState}`}</span>
            <span className="block text-xs">{GEN_STATE_LABEL[genState]}</span>
          </p>
          <p className={`${itemBase} border-border bg-surface`} data-item="running">
            {`지금 실행 중: ${running}`}
          </p>
        </div>
      </Box>
      <Box
        title="요청 큐"
        hint="next·return 호출마다 요청 하나, 맨 앞이 먼저 처리됨"
        changed={diff(queue, prevState?.queue)}
      >
        <ol aria-label="요청 큐 (맨 앞이 먼저 처리)" className="space-y-1">
          {queue.length === 0 ? (
            <li className="text-muted text-sm">비어 있음</li>
          ) : (
            queue.map((req, i) => (
              <li
                key={req}
                data-item={req}
                className={`${itemBase} ${i === 0 ? 'border-accent bg-highlight' : 'border-border bg-surface'}`}
              >
                {req}
              </li>
            ))
          )}
        </ol>
      </Box>
      <Box
        title="프로미스"
        hint="next·return()이 돌려준 프로미스와 변수에 담긴 프로미스"
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
                <p>{p.result === null ? `상태: ${p.state}` : `상태: ${p.state} (${p.result})`}</p>
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
