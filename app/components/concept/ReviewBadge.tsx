export function ReviewBadge({ reviewedAt }: { reviewedAt: string | null }) {
  if (reviewedAt === null) {
    return (
      <span
        title="내용 검토가 끝나지 않았습니다"
        className="bg-highlight text-fg border-border inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
      >
        검토 중<span className="sr-only">: 내용 검토가 끝나지 않았습니다</span>
      </span>
    )
  }
  return (
    <span className="text-muted border-border inline-block rounded-full border px-2 py-0.5 text-xs font-medium">
      검토일 <time dateTime={reviewedAt}>{reviewedAt}</time>
    </span>
  )
}
