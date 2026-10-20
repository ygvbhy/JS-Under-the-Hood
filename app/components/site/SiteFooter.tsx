import { Link } from 'react-router'

export function SiteFooter() {
  return (
    <footer className="border-border text-muted border-t text-sm">
      <p className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link to="/about#accuracy" className="text-accent underline underline-offset-4">
          정확성 정책
        </Link>
        <span aria-hidden="true"> · </span>
        콘텐츠는 ECMAScript 명세와 실제 실행 결과를 기준으로 작성됩니다.
      </p>
    </footer>
  )
}
