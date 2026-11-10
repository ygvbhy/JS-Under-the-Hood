import type { AllLedgerState, ElementInfo } from './scenarios'

type Props = {
  state: AllLedgerState
  // 바로 이전 단계의 상태. 내용이 달라진 칸에 "(바뀜)"을 붙인다.
  prevState?: AllLedgerState
}

const fade = 'motion-safe:transition-[background-color,opacity] motion-safe:duration-300'
const wrap = 'break-words [overflow-wrap:anywhere]'

// 상태는 색만으로 구분하지 않도록 항상 텍스트(영문 상태 이름과 한국어)로 함께 쓴다.
const STATE_TEXT: Record<AllLedgerState['result']['state'], string> = {
  none: '아직 없음 (Promise.all 호출 전)',
  pending: 'pending (대기)',
  fulfilled: 'fulfilled (이행)',
  rejected: 'rejected (거부)',
}

const ELEMENT_STATE_TEXT: Record<ElementInfo['state'], string> = {
  pending: 'pending (대기)',
  fulfilled: 'fulfilled (이행)',
  rejected: 'rejected (거부)',
}

const RESULT_BORDER: Record<AllLedgerState['result']['state'], string> = {
  none: 'border-l-border',
  pending: 'border-l-border',
  fulfilled: 'border-l-success',
  rejected: 'border-l-danger',
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i])

const Changed = () => <span className="ml-1 text-xs font-normal">(바뀜)</span>

function Cell({ changed, children }: { changed: boolean; children: React.ReactNode }) {
  return (
    <td
      className={`border-border border-t px-2 py-1 align-top ${wrap} ${fade} ${changed ? 'bg-highlight' : ''}`}
    >
      {children}
      {changed && <Changed />}
    </td>
  )
}

export function AllLedgerView({ state, prevState }: Props) {
  const { running, result, remaining, values, elements, jobs } = state
  const runningChanged = !!prevState && running !== prevState.running
  const resultChanged =
    !!prevState &&
    (result.state !== prevState.result.state || result.value !== prevState.result.value)
  const remainingChanged = !!prevState && remaining !== prevState.remaining
  const jobsChanged = !!prevState && !sameList(jobs, prevState.jobs)

  return (
    <div className="space-y-3">
      <div
        className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${runningChanged ? 'bg-highlight' : ''}`}
      >
        <p className="text-muted text-xs">지금 실행 중</p>
        <p className={`font-mono text-sm font-semibold ${wrap}`}>
          {running}
          {runningChanged && <Changed />}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <section
          aria-label="결과 프로미스"
          data-result={result.state}
          className={`border-border min-w-0 rounded-lg border border-l-4 p-2 ${RESULT_BORDER[result.state]} ${fade} ${
            resultChanged ? 'bg-highlight' : 'bg-surface'
          }`}
        >
          <p className="text-sm font-semibold">
            <span>결과 프로미스 (all)</span>
            {resultChanged && <Changed />}
          </p>
          <p className="text-sm">{STATE_TEXT[result.state]}</p>
          {result.value !== null && (
            <p className={`font-mono text-sm ${wrap}`}>
              <span className="text-muted font-sans text-xs">결과 </span>
              {result.value}
            </p>
          )}
        </section>
        <section
          aria-label="남은 개수"
          className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${
            remainingChanged ? 'bg-highlight' : 'bg-surface'
          }`}
        >
          <p className="text-sm font-semibold">
            <span>남은 개수</span>
            {remainingChanged && <Changed />}
          </p>
          <p className={`font-mono text-sm ${wrap}`} data-remaining={remaining ?? 'none'}>
            {remaining === null ? '아직 없음' : remaining}
          </p>
          <p className="text-muted text-xs">0이 되면 values로 결과를 이행시킵니다</p>
        </section>
      </div>
      <section className="min-w-0">
        {elements.length === 0 ? (
          <>
            <p className="text-sm font-semibold">요소 장부</p>
            <p className="text-muted text-sm">아직 없음</p>
          </>
        ) : (
          <div
            role="region"
            tabIndex={0}
            aria-label="요소 장부 표 (가로로 스크롤할 수 있음)"
            className="border-border focus-visible:outline-accent overflow-x-auto rounded-lg border focus-visible:outline-2"
          >
            <table className="w-full text-left text-sm">
              <caption className="px-2 pt-2 text-left text-sm font-semibold">
                요소 장부 (요소를 올린 순서 = 자리 번호 순서)
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1 text-xs font-semibold">
                    자리 번호
                  </th>
                  <th scope="col" className="px-2 py-1 text-xs font-semibold">
                    요소
                  </th>
                  <th scope="col" className="px-2 py-1 text-xs font-semibold">
                    요소 프로미스 상태
                  </th>
                  <th scope="col" className="px-2 py-1 text-xs font-semibold">
                    요소 함수 호출 여부
                  </th>
                  <th scope="col" className="px-2 py-1 text-xs font-semibold">
                    values 칸
                  </th>
                </tr>
              </thead>
              <tbody>
                {elements.map((element, i) => {
                  const prev = prevState?.elements.find((e) => e.index === element.index)
                  const isNew = !!prevState && !prev
                  const prevValue = prev ? prevState!.values[i] : undefined
                  return (
                    <tr key={element.index} data-element={element.index}>
                      <Cell changed={isNew}>{element.index}</Cell>
                      <Cell changed={false}>
                        <span className="font-mono">{element.label}</span>
                      </Cell>
                      <Cell changed={!!prev && prev.state !== element.state}>
                        {ELEMENT_STATE_TEXT[element.state]}
                      </Cell>
                      <Cell changed={!!prev && prev.called !== element.called}>
                        {element.called ? '불림 (true)' : '아직 (false)'}
                      </Cell>
                      <Cell changed={!!prev && prevValue !== values[i]}>
                        {values[i] === null ? (
                          <span className="text-muted">비어 있음 (undefined)</span>
                        ) : (
                          <span className="font-mono">{values[i]}</span>
                        )}
                      </Cell>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section
        className={`border-border min-w-0 rounded-lg border p-2 ${fade} ${
          jobsChanged ? 'bg-highlight' : 'bg-surface'
        }`}
      >
        <p className="text-sm font-semibold">
          <span>기다리는 Job</span>
          {jobsChanged && <Changed />}
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
  )
}
