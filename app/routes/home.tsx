import { Link } from 'react-router'

export function meta() {
  return [{ title: 'JS Under the Hood' }]
}

export default function Home() {
  return (
    <main>
      <h1>JS Under the Hood</h1>
      <p>임시 홈 페이지</p>
      <Link to="/concepts/primitives-and-objects">원시 값과 객체: 재할당과 변경</Link>
    </main>
  )
}
