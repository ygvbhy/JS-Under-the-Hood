import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComparisonView } from './ComparisonView'
import { scenarios } from './scenarios'
import type { EqState } from './scenarios'

function stateOf(scenarioId: string, index: number): EqState {
  const scenario = scenarios.find((s) => s.id === scenarioId)!
  return scenario.steps[index].state
}

describe('ComparisonView', () => {
  it('빈 상태에서는 두 영역의 빈 상태 문구를 보여 준다', () => {
    render(<ComparisonView state={{ bindings: [] }} />)
    expect(screen.getByRole('region', { name: '비교 중인 식' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '변수' })).toBeInTheDocument()
    expect(screen.getByText('아직 비교 중인 식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
  })

  it('라운드 2개 상태: 라운드 번호, 규칙 문구, 변환 줄을 보여 주고 결과는 없다', () => {
    // boolean 시나리오 3번째 단계: false == '0'의 라운드 1, 2
    render(<ComparisonView state={stateOf('boolean', 2)} />)
    const region = screen.getByRole('region', { name: '비교 중인 식' })
    expect(within(region).getByText("false == '0'")).toBeInTheDocument()
    expect(within(region).getByText('== 느슨한 비교')).toBeInTheDocument()
    expect(within(region).getAllByRole('listitem')).toHaveLength(2)
    expect(within(region).getByText('라운드 1')).toBeInTheDocument()
    expect(within(region).getByText('라운드 2')).toBeInTheDocument()
    expect(
      within(region).getByText('한쪽이 불리언이므로 불리언을 숫자로 바꿔 다시 비교'),
    ).toBeInTheDocument()
    expect(
      within(region).getByText('숫자와 문자열이므로 문자열을 숫자로 바꿔 다시 비교'),
    ).toBeInTheDocument()
    const conversions = within(region).getAllByText(/^→ /)
    expect(conversions).toHaveLength(2)
    expect(conversions[0]).toHaveTextContent('→ 왼쪽 값을 숫자로: false → 0 (ToNumber)')
    expect(conversions[1]).toHaveTextContent('→ 오른쪽 값을 숫자로: "0" → 0 (ToNumber)')
    expect(within(region).queryByText(/결과:/)).not.toBeInTheDocument()
  })

  it('문자열 값은 큰따옴표로, 타입은 배지로 보인다', () => {
    // number-string 시나리오 2번째 단계: 0 == '' 라운드 1
    render(<ComparisonView state={stateOf('number-string', 1)} />)
    const region = screen.getByRole('region', { name: '비교 중인 식' })
    expect(within(region).getByText('""')).toBeInTheDocument()
    expect(within(region).getByText('문자열')).toBeInTheDocument()
    expect(within(region).getByText('숫자')).toBeInTheDocument()
    expect(within(region).getByText(/^→ 오른쪽 값을 숫자로/)).toHaveTextContent('"" → 0 (ToNumber)')
  })

  it('결과 단계: "결과: true (불리언)"과 "새로 생김" 변수를 보여 준다', () => {
    // number-string 시나리오 4번째 단계: a를 true로 초기화
    render(<ComparisonView state={stateOf('number-string', 3)} />)
    const region = screen.getByRole('region', { name: '비교 중인 식' })
    expect(within(region).getByText('결과:').closest('p')).toHaveTextContent('결과: true (불리언)')
    const items = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('const')).toBeInTheDocument()
    expect(within(items[0]).getByText('a')).toBeInTheDocument()
    expect(within(items[0]).getByText('true')).toBeInTheDocument()
    expect(within(items[0]).getByText('불리언')).toBeInTheDocument()
    expect(within(items[0]).getByText('새로 생김')).toBeInTheDocument()
    expect(items[0]).toHaveClass('bg-highlight')
  })

  it('NaN은 NaN으로 표시한다', () => {
    // boolean 시나리오 8번째 단계: true == 'true' 라운드 3 (1 == NaN)
    render(<ComparisonView state={stateOf('boolean', 7)} />)
    const region = screen.getByRole('region', { name: '비교 중인 식' })
    expect(within(region).getByText(/^→ 오른쪽 값을 숫자로/)).toHaveTextContent(
      '"true" → NaN (ToNumber)',
    )
    expect(within(region).getAllByText('NaN').length).toBeGreaterThan(0)
  })

  it('=== 식은 일치 비교 배지와 타입 불일치 규칙을 보여 주고 변환 줄이 없다', () => {
    // number-string 시나리오 7번째 단계: 0 === ''
    render(<ComparisonView state={stateOf('number-string', 6)} />)
    const region = screen.getByRole('region', { name: '비교 중인 식' })
    expect(within(region).getByText('=== 일치 비교')).toBeInTheDocument()
    expect(
      within(region).getByText('===는 타입이 다르면 값을 바꾸지 않고 false'),
    ).toBeInTheDocument()
    expect(within(region).queryByText(/^→ /)).not.toBeInTheDocument()
  })

  it('null-undefined 규칙 문구를 보여 준다', () => {
    render(<ComparisonView state={stateOf('null-undefined', 1)} />)
    expect(screen.getByText('null과 undefined이므로 true')).toBeInTheDocument()
  })
})
