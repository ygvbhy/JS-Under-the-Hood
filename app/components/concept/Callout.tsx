import type { ReactNode } from 'react'

type CalloutType = 'note' | 'warning' | 'misconception'

const STYLES: Record<CalloutType, { label: string; box: string }> = {
  note: { label: '참고', box: 'border-border bg-surface' },
  warning: { label: '주의', box: 'border-danger bg-surface' },
  misconception: { label: '흔한 오해', box: 'border-accent bg-highlight' },
}

// 유형은 테두리 색뿐 아니라 항상 보이는 라벨 텍스트로도 구분한다(색상 단독 의존 금지).
export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: CalloutType
  title?: string
  children: ReactNode
}) {
  const { label, box } = STYLES[type]
  return (
    <div role="note" className={`${box} my-6 rounded-lg border border-l-4 px-4 py-3`}>
      <p className="font-semibold">
        {label}
        {title && <span> · {title}</span>}
      </p>
      <div className="mt-1 space-y-2 [&>p]:my-0">{children}</div>
    </div>
  )
}
