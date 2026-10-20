import { Link } from 'react-router'

export function meta() {
  return [
    { title: '페이지를 찾을 수 없습니다 | JS Under the Hood' },
    { name: 'robots', content: 'noindex' },
  ]
}

export default function NotFound() {
  return (
    <main>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>요청한 주소에 해당하는 페이지가 없습니다.</p>
      <Link to="/">홈으로 돌아가기</Link>
    </main>
  )
}
