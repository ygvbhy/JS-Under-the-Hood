import type { PromiseInfo, PromiseSimState } from './scenarios'

type Props = {
  state: PromiseSimState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: PromiseSimState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

// 상태는 색만으로 구분하지 않도록 항상 텍스트(영문 상태 이름과 한국어)로 함께 쓴다.
const STATE_TEXT: Record<PromiseInfo['state'], string> = {
  pending: 'pending (대기)',
  fulfilled: 'fulfilled (이행)',
  rejected: 'rejected (거부)',
}

const STATE_BORDER: Record<PromiseInfo['state'], string> = {
  pending: 'border-l-border',
  fulfilled: 'border-l-success',
  rejected: 'border-l-danger',
}

const samePromise = (a: PromiseInfo, b: PromiseInfo | undefined) =>
  !!b &&
  a.state === b.state &&
  a.result === b.result &&
  a.lockedTo === b.lockedTo &&
  a.reactions.length === b.reactions.length &&
  a.reactions.every((r, i) => r === b.reactions[i])

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i])

function PromiseCard({ promise, changed }: { promise: PromiseInfo; changed: boolean }) {
  const { name, state, result, lockedTo, reactions } = promise
  return (
    <li
      data-promise={name}
      className={`border-border min-w-0 rounded-lg border border-l-4 p-2 ${STATE_BORDER[state]} ${fade} ${
        changed ? 'bg-highlight' : 'bg-surface'
      }`}
    >
      <p className={`font-mono text-sm font-semibold ${wrap}`}>
        <span>{name}</span>
        {changed && <span className="ml-1 font-sans text-xs font-normal">(바뀜)</span>}
      </p>
      <p className="text-sm">{STATE_TEXT[state]}</p>
      {result !== null && (
        <p className={`font-mono text-sm ${wrap}`}>
          <span className="text-muted font-sans text-xs">결과 </span>
          {result}
        </p>
      )}
      {lockedTo !== undefined && (
        <p className={`text-xs ${wrap}`}>
          resolve는 불렸지만 <span className="font-mono">{lockedTo}</span>의 결과를 따라가는 중이라
          아직 pending입니다.
        </p>
      )}
      {state === 'pending' &&
        (reactions.length === 0 ? (
          <p className="text-muted text-xs">등록된 반응 없음</p>
        ) : (
          <ul aria-label={`${name}에 등록된 반응`} className="mt-1 space-y-1">
            {reactions.map((reaction) => (
              <li
                key={reaction}
                className={`border-border bg-surface rounded border px-2 py-1 text-xs ${wrap}`}
              >
                {reaction}
              </li>
            ))}
          </ul>
        ))}
    </li>
  )
}

export function PromiseView({ state, prevState }: Props) {
  const { running, promises, jobs } = state
  const runningChanged = !!prevState && running !== prevState.running
  const jobsChanged = !!prevState && !sameList(jobs, prevState.jobs)

  return (
    <div className="space-y-3">
      <div
        className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${runningChanged ? 'bg-highlight' : ''}`}
      >
        <p className="text-muted text-xs">지금 실행 중</p>
        <p className={`font-mono text-sm font-semibold ${wrap}`}>
          {running}
          {runningChanged && <span className="ml-1 font-sans text-xs font-normal">(바뀜)</span>}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <section className="min-w-0 sm:col-span-2">
          <p className="text-sm font-semibold">프로미스</p>
          <p className="text-muted mb-1 text-xs">변수 이름, 상태, 결과, 등록된 반응</p>
          {promises.length === 0 ? (
            <p className="text-muted text-sm">아직 없음</p>
          ) : (
            <ul aria-label="프로미스 (변수 이름, 상태, 결과)" className="space-y-2">
              {promises.map((promise) => (
                <PromiseCard
                  key={promise.name}
                  promise={promise}
                  changed={
                    !!prevState &&
                    !samePromise(
                      promise,
                      prevState.promises.find((p) => p.name === promise.name),
                    )
                  }
                />
              ))}
            </ul>
          )}
        </section>
        <section
          className={`border-border min-w-0 self-start rounded-lg border p-2 ${fade} ${
            jobsChanged ? 'bg-highlight' : 'bg-surface'
          }`}
        >
          <p className="text-sm font-semibold">
            <span>기다리는 Job</span>
            {jobsChanged && <span className="ml-1 text-xs font-normal">(바뀜)</span>}
          </p>
          <p className="text-muted mb-1 text-xs">맨 앞이 먼저 실행됨</p>
          <ol aria-label="기다리는 Job (맨 앞이 먼저 실행)" className="space-y-1">
            {jobs.length === 0 ? (
              <li className="text-muted text-sm">비어 있음</li>
            ) : (
              jobs.map((job, i) => (
                <li
                  key={job}
                  data-item={job}
                  className={`min-w-0 rounded border-2 px-2 py-1 font-mono text-sm ${wrap} ${fade} ${
                    i === 0 ? 'border-accent bg-highlight' : 'border-border bg-surface'
                  }`}
                >
                  {job}
                </li>
              ))
            )}
          </ol>
        </section>
      </div>
    </div>
  )
}
