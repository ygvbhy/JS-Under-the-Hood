import { Link } from 'react-router'
import { buildMeta } from '~/lib/seo'

export function meta() {
  return buildMeta({
    title: '페이지를 찾을 수 없습니다',
    description: '요청한 주소에 해당하는 페이지가 없습니다.',
    path: '/404',
    noindex: true,
  })
}

export default function NotFound() {
  return (
    <div>
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted mt-4">요청한 주소에 해당하는 페이지가 없습니다.</p>
      <p className="mt-6">
        <Link to="/" className="text-accent underline underline-offset-4">
          홈으로 돌아가기
        </Link>
      </p>
    </div>
  )
}
