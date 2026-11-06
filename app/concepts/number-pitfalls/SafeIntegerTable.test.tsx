import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SafeIntegerTable } from './SafeIntegerTable'

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('SafeIntegerTable', () => {
  it('열 머리글 4개와 본문 7행이 있다', () => {
    render(<SafeIntegerTable />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(4)
    expect(bodyRows()).toHaveLength(7)
    expect(screen.getByRole('table', { name: /Number 값/ })).toBeInTheDocument()
  })

  it('값이 바뀐 행은 텍스트로 표시한다', () => {
    render(<SafeIntegerTable />)
    expect(screen.getAllByText(/다른 값이 됨/)).toHaveLength(2)
    expect(bodyRows()[3]).toHaveTextContent('다른 값이 됨')
    expect(bodyRows()[0]).not.toHaveTextContent('다른 값이 됨')
  })

  it('…994 행은 공유하지 않지만 안전하지 않다', () => {
    render(<SafeIntegerTable />)
    const cells = within(bodyRows()[4]).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent('9007199254740994')
    expect(cells[2]).toHaveTextContent('아니오')
    expect(cells[3]).toHaveTextContent('아니오')
  })
})
