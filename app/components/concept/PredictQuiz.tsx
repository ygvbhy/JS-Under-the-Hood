import { useId, useRef, useState, type ReactNode } from 'react'
import { useHydrated } from '~/lib/useHydrated'

type Props = {
  question: ReactNode
  choices: string[]
  answer: number // 0-based 정답 인덱스
  explanation: ReactNode
}

const box = 'border-border bg-surface my-6 rounded-lg border p-4'
const button =
  'bg-accent text-accent-fg rounded-md px-4 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-50'

// 하이드레이션 안전: 프리렌더(= 하이드레이션 전, JS 없음)에는 질문·선택지·<details> 정답만 그리고,
// useHydrated()가 true가 된 뒤에 라디오 퀴즈로 바꾼다.
export function PredictQuiz({ question, choices, answer, explanation }: Props) {
  const hydrated = useHydrated()
  const name = useId()
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  if (!hydrated) {
    return (
      <div className={box}>
        <p className="font-semibold">예측해 보기</p>
        <div className="mt-2">{question}</div>
        <ol className="mt-2 list-decimal space-y-1 pl-6">
          {choices.map((choice) => (
            <li key={choice}>
              <code>{choice}</code>
            </li>
          ))}
        </ol>
        <details className="mt-3">
          <summary className="cursor-pointer font-medium">정답 보기</summary>
          <div className="mt-2 space-y-2">
            <p>
              {`정답: ${answer + 1}번`} <code>{choices[answer]}</code>
            </p>
            <div>{explanation}</div>
          </div>
        </details>
      </div>
    )
  }

  const isCorrect = selected === answer

  function reset() {
    setSelected(null)
    setRevealed(false)
    fieldsetRef.current?.focus()
  }

  return (
    <div className={box}>
      <fieldset ref={fieldsetRef} tabIndex={-1} className="focus:outline-none">
        <legend className="font-semibold">
          <span className="block">예측해 보기</span>
          <span className="mt-2 block font-normal">{question}</span>
        </legend>
        <ul className="mt-2 space-y-2">
          {choices.map((choice, i) => (
            <li key={choice}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value={i}
                  checked={selected === i}
                  disabled={revealed}
                  onChange={() => setSelected(i)}
                  className="accent-accent size-4"
                />
                <code>{choice}</code>
                {revealed && i === answer && (
                  <span className="text-success font-semibold">✓ 정답</span>
                )}
                {revealed && i === selected && i !== answer && (
                  <span className="text-danger font-semibold">✗ 선택한 답 (오답)</span>
                )}
                {revealed && i === selected && i === answer && (
                  <span className="text-muted">선택한 답</span>
                )}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="mt-3">
        {revealed ? (
          <button type="button" className={button} onClick={reset}>
            다시 풀기
          </button>
        ) : (
          <button
            type="button"
            className={button}
            disabled={selected === null}
            onClick={() => setRevealed(true)}
          >
            정답 확인
          </button>
        )}
      </div>
      <div aria-live="polite" className="mt-3">
        {revealed && (
          <div className="space-y-2">
            <p className="font-semibold">
              {isCorrect ? '정답입니다.' : `오답입니다. 정답은 ${answer + 1}번입니다.`}
            </p>
            <div>{explanation}</div>
          </div>
        )}
      </div>
    </div>
  )
}
