import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Anchor } from './MdxElements'

describe('Anchor', () => {
  it('내부 링크는 href와 title을 유지한다', () => {
    render(
      <MemoryRouter>
        <Anchor href="/concepts/x" title="설명">
          내부
        </Anchor>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: '내부' })
    expect(link).toHaveAttribute('href', '/concepts/x')
    expect(link).toHaveAttribute('title', '설명')
  })

  it('외부 링크는 target과 rel을 유지한다', () => {
    render(
      <MemoryRouter>
        <Anchor href="https://example.com">외부</Anchor>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /외부/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
