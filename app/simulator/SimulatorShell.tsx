import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { CodeView } from './CodeView'
import { StepControls } from './StepControls'
import type { Scenario } from './types'
import { useStepper } from './useStepper'

type Props<S> = {
  scenarios: Scenario<S>[]
  label: string // 영역 aria-label, 예: "원시 값과 객체 시뮬레이터"
  renderState: (state: S, prevState: S | undefined) => ReactNode
}

// 개념 공통 셸: 시나리오 선택, 코드, 단계 이동, 시각화(renderState), 단계 설명, 콘솔 출력을 배치한다.
// 배치: 1024px 이상은 [코드 + 콘솔] | [시각화 + 설명] 2열에 컨트롤이 위쪽 전체 폭,
// 그보다 좁으면 코드 → 컨트롤(sticky) → 시각화 → 설명 → 콘솔 순서로 쌓는다.
// DOM 순서는 좁은 화면의 시각 순서와 같게 둔다.
export function SimulatorShell<S>({ scenarios, label, renderState }: Props<S>) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id)
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0]
  const stepper = useStepper({ total: scenario.steps.length })
  const controlsRef = useRef<HTMLDivElement>(null)
  const radioName = useId()

  const step = scenario.steps[stepper.index]
  const prevState = stepper.index > 0 ? scenario.steps[stepper.index - 1].state : undefined
  const output = step.output ?? []

  // 스크린 리더용 안내(항상 aria-live="polite"인 sr-only 영역). 재생이 아닐 때 단계가 바뀌면 그 단계를,
  // 재생이 멈추면(일시정지·마지막 단계 자동 정지) 현재 단계를 한 번 읽는다. 재생 중에는 값을 고정한다.
  // 프리렌더·첫 렌더는 빈 문자열이라 페이지를 열 때 읽지 않고, 사용자 조작으로 단계·시나리오·재생 상태가
  // 처음 바뀐 뒤부터 채워진다. effect 대신 렌더 중 상태 조정(useStepper와 같은 방식)을 써서
  // 단계 변경과 같은 커밋에 반영한다.
  const announceKey = `${scenario.id}:${stepper.index}:${stepper.playing}`
  const [prevAnnounceKey, setPrevAnnounceKey] = useState(announceKey)
  const [announcement, setAnnouncement] = useState('')
  if (prevAnnounceKey !== announceKey) {
    setPrevAnnounceKey(announceKey)
    if (!stepper.playing) {
      setAnnouncement(`단계 ${stepper.index + 1}: ${step.title}. ${step.explanation}`)
    }
  }

  const selectScenario = (id: string) => {
    setScenarioId(id)
    stepper.reset() // 단계 수가 같은 시나리오로 바꿔도 처음으로 돌아가도록 명시적으로 초기화
  }

  // 영역 자체나 단계 컨트롤 버튼에 포커스가 있을 때만 키를 처리한다.
  // 코드 블록(가로 스크롤), 라디오(←/→로 선택 이동), select 등 다른 요소의 기본 키 동작은 건드리지 않는다.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const target = event.target
    const onRegion = target === event.currentTarget
    const onControlButton =
      target instanceof HTMLButtonElement && !!controlsRef.current?.contains(target)
    if (!onRegion && !onControlButton) return

    if (event.key === 'ArrowRight') stepper.next()
    else if (event.key === 'ArrowLeft') stepper.prev()
    else if (event.key === 'Home') stepper.reset()
    else return
    event.preventDefault()
  }

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      data-wide=""
      onKeyDown={onKeyDown}
      className="border-border bg-bg my-6 rounded-xl border p-3 sm:p-4"
    >
      <fieldset className="mb-3 min-w-0">
        <legend className="text-muted mb-1 text-sm">시나리오</legend>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((s) => (
            <label key={s.id} className="relative">
              <input
                type="radio"
                name={radioName}
                value={s.id}
                checked={s.id === scenario.id}
                onChange={() => selectScenario(s.id)}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <span className="border-border bg-surface text-fg peer-checked:border-accent peer-checked:bg-highlight peer-focus-visible:outline-accent inline-flex min-h-10 items-center rounded-md border px-3 peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:gap-x-6">
        <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
          <CodeView code={scenario.code} line={step.line} label="예제 코드" />
        </div>

        <div
          ref={controlsRef}
          className="bg-bg sticky top-0 z-10 -mx-3 border-b border-transparent px-3 py-2 sm:-mx-4 sm:px-4 lg:static lg:col-span-2 lg:row-start-1 lg:m-0 lg:p-0"
        >
          <StepControls stepper={stepper} label="단계 이동" />
        </div>

        <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:self-start">
          {renderState(step.state, prevState)}
          <div className="border-border bg-surface rounded-lg border px-3 py-2">
            <p className="font-semibold">
              단계 {stepper.index + 1}: {step.title}
            </p>
            <p className="mt-1">{step.explanation}</p>
          </div>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>
        </div>

        <section
          aria-labelledby={`${radioName}-console`}
          className="min-w-0 lg:col-start-1 lg:row-start-3 lg:self-start"
        >
          <p id={`${radioName}-console`} className="text-muted mb-1 text-sm font-semibold">
            콘솔 출력
          </p>
          <div className="border-border bg-surface min-h-10 rounded-lg border px-3 py-2 font-mono text-sm">
            {output.length === 0 ? (
              <p className="text-muted">(아직 출력 없음)</p>
            ) : (
              <ul>
                {output.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
