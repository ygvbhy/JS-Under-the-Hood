import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ConceptPager } from './ConceptPager'

function renderPager(slug: string) {
  render(
    <MemoryRouter>
      <ConceptPager slug={slug} />
    </MemoryRouter>,
  )
  return screen.getByRole('navigation', { name: '학습 순서' })
}

describe('ConceptPager', () => {
  it('첫 개념은 이전 없이 다음 링크만 있다', () => {
    const nav = renderPager('primitives-and-objects')
    expect(within(nav).getByText('학습 순서 1 / 23')).toBeInTheDocument()
    expect(within(nav).queryByText('이전 개념')).not.toBeInTheDocument()
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/concepts/short-circuit-evaluation')
    expect(links[0]).toHaveTextContent('다음 개념')
  })

  it('마지막 개념은 다음 없이 이전 링크만 있다', () => {
    const nav = renderPager('for-let')
    expect(within(nav).getByText('학습 순서 23 / 23')).toBeInTheDocument()
    expect(within(nav).queryByText('다음 개념')).not.toBeInTheDocument()
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/concepts/closure')
    expect(links[0]).toHaveTextContent('이전 개념')
  })

  it('중간 개념은 이전·다음 링크가 모두 있다', () => {
    const nav = renderPager('hoisting')
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(['/concepts/function-calls', '/concepts/scope-chain'])
  })
})
