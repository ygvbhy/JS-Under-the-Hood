import { useEffect, useRef } from 'react'
import type { LineRange } from './types'

type Props = {
  code: string
  line?: LineRange
  label?: string
}

export function CodeView({ code, line, label }: Props) {
  const containerRef = useRef<HTMLPreElement>(null)
  const from = line?.from
  const to = line?.to
  const shownRef = useRef(`${from}-${to}`) // 마지막으로 처리한 강조 범위(StrictMode 이중 실행에도 안전)

  const lines = (code.endsWith('\n') ? code.slice(0, -1) : code).split(/\r?\n/)
  const isHighlighted = (n: number) =>
    from !== undefined && to !== undefined && n >= from && n <= to

  // 강조 줄이 바뀔 때만, 코드 블록 안에서만 스크롤한다(페이지 스크롤·첫 렌더 스크롤 없음).
  // scrollIntoView는 상위 스크롤 영역(페이지)까지 움직이므로 컨테이너 scrollTop을 직접 조정한다.
  useEffect(() => {
    const key = `${from}-${to}`
    if (shownRef.current === key) return
    shownRef.current = key
    const container = containerRef.current
    const row = container?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!container || !row) return
    const cRect = container.getBoundingClientRect()
    const rRect = row.getBoundingClientRect()
    if (rRect.top < cRect.top) container.scrollTop -= cRect.top - rRect.top
    else if (rRect.bottom > cRect.bottom) container.scrollTop += rRect.bottom - cRect.bottom
  }, [from, to])

  return (
    <pre
      ref={containerRef}
      // 가로·세로로 스크롤되는 영역은 키보드로도 접근할 수 있어야 한다
      tabIndex={0}
      role={label ? 'region' : undefined}
      aria-label={label}
      className="border-border bg-surface text-fg max-h-96 overflow-auto rounded-lg border py-2 font-mono text-sm leading-6"
    >
      <code className="block w-max min-w-full">
        {lines.map((text, i) => {
          const n = i + 1
          const highlighted = isHighlighted(n)
          return (
            <span
              key={n}
              aria-current={highlighted ? 'step' : undefined}
              className={`flex border-l-4 pr-4 ${
                highlighted ? 'border-accent bg-highlight' : 'border-transparent'
              }`}
            >
              <span
                aria-hidden="true"
                className="text-muted w-10 shrink-0 pr-3 text-right tabular-nums select-none"
              >
                {n}
              </span>
              <span className="min-h-[1lh] whitespace-pre">{text}</span>
            </span>
          )
        })}
      </code>
    </pre>
  )
}
