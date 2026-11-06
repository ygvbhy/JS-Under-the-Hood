import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RoundingView } from './RoundingView'

describe('RoundingView', () => {
  it('region에 aria-label이 있고 첫 프리셋이 선택되어 있다', () => {
    render(<RoundingView />)
    expect(screen.getByRole('region', { name: '반올림 판정 보기' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    expect(screen.getByRole('radio', { name: '(1.005).toFixed(2)' })).toBeChecked()
  })

  it('첫 프리셋은 저장 값과 아래 후보의 배지, 결과를 보인다', () => {
    render(<RoundingView />)
    expect(
      screen.getByText('1.00499999999999989341858963598497211933135986328125'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('더 가까움')).toHaveLength(1)
    expect(screen.queryByText('정확히 가운데')).not.toBeInTheDocument()
    expect(
      screen.getByText('1.00', { selector: 'span.font-mono.font-semibold' }),
    ).toBeInTheDocument()
  })

  it('위 후보가 가까운 프리셋은 위 후보에 배지가 붙는다', () => {
    render(<RoundingView />)
    fireEvent.click(screen.getByRole('radio', { name: '(8.345).toFixed(2)' }))
    const items = screen.getAllByRole('listitem')
    expect(items[0]).not.toHaveTextContent('더 가까움')
    expect(items[1]).toHaveTextContent('더 가까움')
  })

  it('가운데 프리셋은 두 후보 모두 정확히 가운데로 표시한다', () => {
    render(<RoundingView />)
    fireEvent.click(screen.getByRole('radio', { name: '(-2.5).toFixed(0)' }))
    expect(screen.getAllByText('정확히 가운데')).toHaveLength(2)
    expect(screen.queryByText('더 가까움')).not.toBeInTheDocument()
    expect(screen.getByText('-3')).toBeInTheDocument()
  })
})
