import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConversionView } from './ConversionView'
import { scenarios } from './scenarios'
import type { ConvState } from './scenarios'

function stateOf(scenarioId: string, index: number): ConvState {
  const scenario = scenarios.find((s) => s.id === scenarioId)!
  return scenario.steps[index].state
}

describe('ConversionView', () => {
  it('빈 상태에서는 두 영역의 빈 상태 문구를 보여 준다', () => {
    render(<ConversionView state={{ bindings: [] }} />)
    expect(screen.getByText('계산 중인 연산')).toBeInTheDocument()
    expect(screen.getByText('변수')).toBeInTheDocument()
    expect(screen.getByText('아직 계산 중인 연산이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
  })

  it('두 영역은 제목으로 이름 붙은 region이다', () => {
    render(<ConversionView state={{ bindings: [] }} />)
    expect(screen.getByRole('region', { name: '계산 중인 연산' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '변수' })).toBeInTheDocument()
  })

  it('A 단계: 연산 소스, 피연산자, 변환 줄, 규칙 문구를 보여 주고 결과는 없다', () => {
    // plus-order 2번째 단계: '3' + 4 — 4가 "4"로 바뀜
    render(<ConversionView state={stateOf('plus-order', 1)} />)
    const region = screen.getByRole('region', { name: '계산 중인 연산' })
    expect(within(region).getByText("'3' + 4")).toBeInTheDocument()
    expect(within(region).getByText('왼쪽')).toBeInTheDocument()
    expect(within(region).getByText('오른쪽')).toBeInTheDocument()
    // 타입 배지: 왼쪽은 문자열, 오른쪽은 숫자
    expect(within(region).getByText('문자열')).toBeInTheDocument()
    expect(within(region).getByText('숫자')).toBeInTheDocument()
    // 변환 줄은 오른쪽 카드에만 있다
    expect(within(region).getAllByText(/^→ /)).toHaveLength(1)
    const converted = within(region).getByText('→ "4"').closest('p')!
    expect(converted).toHaveTextContent('→ "4" (문자열, ToString)')
    expect(converted).toHaveTextContent('ToString')
    expect(within(region).getByText(/한쪽이 문자열이므로 문자열 연결/)).toBeInTheDocument()
    expect(within(region).queryByText(/^결과:/)).not.toBeInTheDocument()
  })

  it('B 단계: 문자열 결과는 큰따옴표와 타입으로 "결과: 값 (타입)"을 보여 준다', () => {
    // plus-order 3번째 단계: '3' + 4 → "34"
    render(<ConversionView state={stateOf('plus-order', 2)} />)
    const region = screen.getByRole('region', { name: '계산 중인 연산' })
    const result = within(region).getByText('결과:').closest('p')!
    expect(result).toHaveTextContent('결과: "34" (문자열)')
    expect(within(region).getByText('"34"')).toBeInTheDocument()
  })

  it('숫자·불리언 결과는 따옴표 없이 타입과 함께 보인다', () => {
    // plus-order 7번째 단계: 3 + 4 → 7 (변환 줄 없음, 숫자 덧셈 규칙)
    const { unmount } = render(<ConversionView state={stateOf('plus-order', 6)} />)
    expect(screen.queryByText(/^→ /)).not.toBeInTheDocument()
    expect(screen.getByText('문자열이 없으므로 숫자 덧셈', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('결과:').closest('p')).toHaveTextContent('결과: 7 (숫자)')
    unmount()

    // compare 3번째 단계: '10' > 9 → true
    render(<ConversionView state={stateOf('compare', 2)} />)
    expect(screen.getByText('결과:').closest('p')).toHaveTextContent('결과: true (불리언)')
    expect(screen.getByText('→ 10').closest('p')).toHaveTextContent('→ 10 (숫자, ToNumber)')
  })

  it('규칙 문구 매핑: numeric, string-compare, numeric-compare', () => {
    const { unmount } = render(<ConversionView state={stateOf('numeric-mix', 1)} />)
    expect(screen.getByText(/피연산자를 숫자로 바꿔 계산/)).toBeInTheDocument()
    unmount()

    const second = render(<ConversionView state={stateOf('compare', 3)} />)
    expect(screen.getByText(/둘 다 문자열이므로 문자열로 비교/)).toBeInTheDocument()
    expect(screen.queryByText(/^→ /)).not.toBeInTheDocument()
    second.unmount()

    render(<ConversionView state={stateOf('compare', 1)} />)
    expect(screen.getByText(/둘 다 문자열은 아니므로 숫자로 바꿔 비교/)).toBeInTheDocument()
  })

  it('changed 변수는 const 배지, 타입 배지, "새로 생김" 배지와 강조 배경을 가진다', () => {
    // plus-order 4번째 단계(index 4): a를 "345"로 초기화
    render(<ConversionView state={stateOf('plus-order', 4)} />)
    const region = screen.getByRole('region', { name: '변수' })
    const items = within(region).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('const')).toBeInTheDocument()
    expect(within(items[0]).getByText('a')).toBeInTheDocument()
    expect(within(items[0]).getByText('"345"')).toBeInTheDocument()
    expect(within(items[0]).getByText('문자열')).toBeInTheDocument()
    expect(within(items[0]).getByText('새로 생김')).toBeInTheDocument()
    expect(items[0]).toHaveClass('bg-highlight')
  })

  it('changed가 없으면 "새로 생김" 배지와 강조 배경이 없다', () => {
    // plus-order 마지막 단계: a, b가 모두 기존 변수
    render(<ConversionView state={stateOf('plus-order', 9)} />)
    expect(screen.queryByText('새로 생김')).not.toBeInTheDocument()
    const items = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    for (const item of items) expect(item).not.toHaveClass('bg-highlight')
    expect(within(items[1]).getByText('"75"')).toBeInTheDocument()
  })

  it('불리언 변수는 따옴표 없이 불리언 배지와 함께 보인다', () => {
    // compare 마지막 단계: e = true, f = false
    render(<ConversionView state={stateOf('compare', 5)} />)
    const items = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    expect(within(items[0]).getByText('true')).toBeInTheDocument()
    expect(within(items[0]).getByText('불리언')).toBeInTheDocument()
    expect(within(items[1]).getByText('false')).toBeInTheDocument()
  })
})
