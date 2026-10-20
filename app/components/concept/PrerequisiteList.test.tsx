import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { PrerequisiteList } from './PrerequisiteList'

describe('PrerequisiteList', () => {
  it('slug가 있으면 링크, 없으면 준비 중 텍스트 칩이다', () => {
    render(
      <MemoryRouter>
        <PrerequisiteList
          prerequisites={[{ label: '실행 컨텍스트', slug: 'execution-context' }, { label: '변수' }]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2, name: '선행 개념' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '실행 컨텍스트' })).toHaveAttribute(
      'href',
      '/concepts/execution-context',
    )
    expect(screen.queryByRole('link', { name: /변수/ })).not.toBeInTheDocument()
    expect(screen.getByText('변수')).toBeInTheDocument()
    expect(screen.getByText('(준비 중)')).toHaveClass('sr-only')
  })

  it('비어 있으면 섹션을 숨긴다', () => {
    const { container } = render(
      <MemoryRouter>
        <PrerequisiteList prerequisites={[]} />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
