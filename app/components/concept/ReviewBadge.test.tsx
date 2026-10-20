import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReviewBadge } from './ReviewBadge'

describe('ReviewBadge', () => {
  it('reviewedAt이 null이면 검토 중 배지와 툴팁을 보여준다', () => {
    render(<ReviewBadge reviewedAt={null} />)
    const badge = screen.getByText('검토 중')
    expect(badge).toHaveAttribute('title', '내용 검토가 끝나지 않았습니다')
  })

  it('날짜가 있으면 검토일을 time 요소로 보여준다', () => {
    const { container } = render(<ReviewBadge reviewedAt="2026-10-20" />)
    expect(screen.getByText(/검토일/)).toBeInTheDocument()
    const time = container.querySelector('time')
    expect(time).toHaveAttribute('datetime', '2026-10-20')
    expect(time).toHaveTextContent('2026-10-20')
    expect(screen.queryByText('검토 중')).not.toBeInTheDocument()
  })
})
