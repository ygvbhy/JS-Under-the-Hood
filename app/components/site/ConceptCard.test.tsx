import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { ConceptMeta } from '~/lib/concepts'
import { listConcepts } from '~/lib/concepts'
import { ConceptCard } from './ConceptCard'

const concept: ConceptMeta = listConcepts()[0]

function renderCard(position?: number) {
  return render(
    <MemoryRouter>
      <ConceptCard concept={concept} position={position} />
    </MemoryRouter>,
  )
}

describe('ConceptCard position', () => {
  it('position이 있으면 제목 줄에 "n번째"를 보여 준다', () => {
    renderCard(3)
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading.textContent).toContain('3번째')
    expect(heading.firstElementChild?.textContent).toBe('3번째')
  })

  it('position이 없으면 "번째" 표시가 없다', () => {
    renderCard()
    expect(screen.getByRole('heading', { level: 4 }).textContent).not.toContain('번째')
  })
})
