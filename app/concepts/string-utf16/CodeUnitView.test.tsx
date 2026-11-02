import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeUnitView } from './CodeUnitView'

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('CodeUnitView', () => {
  it('region에 aria-label이 있고 첫 프리셋이 선택되어 있다', () => {
    render(<CodeUnitView />)
    expect(screen.getByRole('region', { name: '코드 유닛 보기' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('radio', { name: 'a😀b' })).toBeChecked()
  })

  it('첫 프리셋은 표 4행이고 U+1F600이 rowSpan 2로 나온다', () => {
    render(<CodeUnitView />)
    expect(bodyRows()).toHaveLength(4)
    expect(screen.getByText('length 4 · 코드 포인트 3개')).toBeInTheDocument()
    const cell = screen.getByText('U+1F600')
    expect(cell).toHaveAttribute('rowspan', '2')
    expect(screen.getByText('d83d')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: "'a😀b'의 코드 유닛" })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
  })

  it('쌍의 둘째 행에는 코드 포인트·글자 칸이 없다', () => {
    render(<CodeUnitView />)
    expect(within(bodyRows()[2]).getAllByRole('cell')).toHaveLength(3)
    expect(within(bodyRows()[1]).getAllByRole('cell')).toHaveLength(5)
  })

  it('다른 프리셋을 고르면 요약과 행 수가 바뀌고 ZWJ 이름이 보인다', () => {
    render(<CodeUnitView />)
    fireEvent.click(screen.getByRole('radio', { name: '가족 이모지' }))
    expect(bodyRows()).toHaveLength(8)
    expect(screen.getByText('length 8 · 코드 포인트 5개')).toBeInTheDocument()
    expect(screen.getAllByText('ZWJ(폭 없는 결합자)')).toHaveLength(2)
  })

  it('결합 부호는 이름 텍스트로 보인다', () => {
    render(<CodeUnitView />)
    fireEvent.click(screen.getByRole('radio', { name: 'é (e + 결합 부호)' }))
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByText('결합 양음 부호')).toBeInTheDocument()
  })

  it('짝 없는 서로게이트는 종류와 글자 자리 텍스트로 보인다', () => {
    render(
      <CodeUnitView samples={[{ id: 'lone', label: '반쪽', value: '\ud83d', note: '메모' }]} />,
    )
    expect(screen.getByText('짝 없는 상위 서로게이트')).toBeInTheDocument()
    expect(screen.getByText('(그릴 수 없음)')).toBeInTheDocument()
  })
})
