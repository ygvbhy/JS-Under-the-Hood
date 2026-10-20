import { useId, type ReactNode } from 'react'
import { SPEEDS, type Speed, type Stepper } from './useStepper'

type Props = {
  stepper: Stepper
  autoplay?: boolean // false면 재생·속도 컨트롤을 숨긴다
  label?: string // 컨트롤 묶음의 접근 가능한 이름
}

const buttonClass =
  'inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border bg-surface px-2 text-fg hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
    >
      {children}
    </svg>
  )
}

const FirstIcon = () => (
  <Icon>
    <path d="M6 5h2v14H6zM20 5v14L9 12z" />
  </Icon>
)
const PrevIcon = () => (
  <Icon>
    <path d="M17 5v14L6 12z" />
  </Icon>
)
const NextIcon = () => (
  <Icon>
    <path d="M7 5v14l11-7z" />
  </Icon>
)
const PlayIcon = () => (
  <Icon>
    <path d="M7 4v16l13-8z" />
  </Icon>
)
const PauseIcon = () => (
  <Icon>
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </Icon>
)

function isSpeed(value: number): value is Speed {
  return (SPEEDS as readonly number[]).includes(value)
}

export function StepControls({ stepper, autoplay = true, label = '단계 이동' }: Props) {
  const { index, total, isFirst, isLast, playing, speed } = stepper
  const speedId = useId()

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonClass}
        aria-label="처음으로"
        disabled={isFirst}
        onClick={stepper.reset}
      >
        <FirstIcon />
      </button>
      <button
        type="button"
        className={buttonClass}
        aria-label="이전"
        disabled={isFirst}
        onClick={stepper.prev}
      >
        <PrevIcon />
      </button>
      {autoplay && (
        <button
          type="button"
          className={buttonClass}
          aria-label={playing ? '일시정지' : '자동 재생'}
          onClick={stepper.toggle}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}
      <button
        type="button"
        className={buttonClass}
        aria-label="다음"
        disabled={isLast}
        onClick={stepper.next}
      >
        <NextIcon />
      </button>
      {/* 단계 안내는 셸이 별도 live 영역으로 담당하므로 여기서는 읽지 않는다 */}
      <span aria-live="off" className="text-muted min-w-20 px-1 text-sm tabular-nums">
        단계 {index + 1} / {total}
      </span>
      {autoplay && (
        <div className="ml-auto flex items-center gap-2 text-sm">
          <label htmlFor={speedId} className="text-muted">
            속도
          </label>
          <select
            id={speedId}
            className="border-border bg-surface text-fg min-h-10 rounded-md border px-2"
            value={speed}
            onChange={(e) => {
              const value = Number(e.target.value)
              if (isSpeed(value)) stepper.setSpeed(value)
            }}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
