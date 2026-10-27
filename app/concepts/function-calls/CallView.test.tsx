import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CallView } from './CallView'
import { scenarios } from './scenarios'

// n은 1부터 센 단계 번호
function renderStep(id: string, n: number) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  const index = n - 1
  return render(
    <CallView
      state={steps[index].state}
      prevState={index > 0 ? steps[index - 1].state : undefined}
    />,
  )
}

const callRegion = () => screen.getByRole('region', { name: '호출 영역' })

describe('CallView', () => {
  it('빈 상태 문구 2개를 보여 주고 "인수 평가 중"은 그리지 않는다', () => {
    renderStep('arg-count', 1)
    expect(screen.getByText('실행 중인 함수 호출이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('인수 평가 중')).toBeNull()
  })

  it('arg-count 5단계: add(1)에서 b는 undefined이고 "인수 없음"이다', () => {
    renderStep('arg-count', 5)
    const region = callRegion()
    expect(within(region).getByText('add(1)')).toBeInTheDocument()
    expect(within(region).getByText('a = 1').closest('li')).toHaveTextContent('인수')
    const b = within(region).getByText('b = undefined').closest('li')!
    expect(within(b).getByText('undefined')).toBeInTheDocument()
    expect(within(b).getByText('인수 없음')).toBeInTheDocument()
  })

  it('arg-count 6단계: "return 값: NaN" 결과를 보인다', () => {
    renderStep('arg-count', 6)
    const region = callRegion()
    expect(within(region).getByText(/return 값/)).toHaveTextContent('return 값: NaN')
  })

  it('arg-count 8단계: 매개변수에 들어가지 않은 인수 3을 보인다', () => {
    renderStep('arg-count', 8)
    const line = within(callRegion()).getByText('매개변수에 들어가지 않은 인수').closest('li')!
    expect(within(line).getByText('3')).toBeInTheDocument()
  })

  it('arg-count 2단계: 모든 매개변수가 "인수"이고 무시된 인수 줄이 없다', () => {
    renderStep('arg-count', 2)
    expect(within(callRegion()).queryByText('매개변수에 들어가지 않은 인수')).toBeNull()
    expect(within(callRegion()).queryByText('인수 없음')).toBeNull()
  })

  it('no-return 4단계: "본문 끝까지 실행 → undefined"를 보인다', () => {
    renderStep('no-return', 4)
    expect(within(callRegion()).getByText(/본문 끝까지 실행/)).toHaveTextContent(
      '본문 끝까지 실행 → undefined',
    )
  })

  it('no-return 8단계: "값 없는 return; → undefined"를 보인다', () => {
    renderStep('no-return', 8)
    expect(within(callRegion()).getByText(/값 없는 return;/)).toHaveTextContent(
      '값 없는 return; → undefined',
    )
  })

  it('no-return 5단계: 변수 a에 "새로 생김"이 붙는다', () => {
    renderStep('no-return', 5)
    const vars = screen.getByRole('region', { name: '변수' })
    const row = within(vars).getByText('a = undefined').closest('li')!
    expect(within(row).getByText('const')).toBeInTheDocument()
    expect(within(row).getByText('새로 생김')).toBeInTheDocument()
  })

  it('no-return 6단계: 이미 있던 변수 a에는 배지가 없다', () => {
    renderStep('no-return', 6)
    const vars = screen.getByRole('region', { name: '변수' })
    expect(within(vars).queryByText('새로 생김')).toBeNull()
    expect(within(vars).queryByText('값이 바뀜')).toBeNull()
  })

  it('이전 단계에 있던 변수가 changed이면 "값이 바뀜"을 보인다', () => {
    const base = { bindings: [], pending: null, call: null }
    const v = {
      name: 'x',
      declaredWith: 'const' as const,
      value: { type: 'number' as const, display: '1' },
    }
    render(
      <CallView
        state={{ ...base, bindings: [{ ...v, changed: true }] }}
        prevState={{ ...base, bindings: [v] }}
      />,
    )
    expect(screen.getByText('값이 바뀜')).toBeInTheDocument()
  })

  it('no-return 1단계 문자열 인수는 큰따옴표로 보인다', () => {
    renderStep('no-return', 2)
    expect(within(callRegion()).getByText('name = "민지"')).toBeInTheDocument()
    expect(within(callRegion()).getByText('문자열')).toBeInTheDocument()
  })

  it('eval-order 2단계: "인수 평가 중"에 평가 전 2개와 square(2) 호출이 함께 보인다', () => {
    renderStep('eval-order', 2)
    const pending = screen.getByRole('region', { name: '인수 평가 중' })
    expect(within(pending).getByText('add(square(2), square(3))')).toBeInTheDocument()
    expect(within(pending).getAllByText('평가 전')).toHaveLength(2)
    expect(within(pending).getByText('1번째')).toBeInTheDocument()
    expect(within(pending).getByText('2번째')).toBeInTheDocument()
    expect(within(callRegion()).getByText('square(2)')).toBeInTheDocument()
  })

  it('eval-order 5단계: 첫 번째 인수는 4, 두 번째는 평가 전이다', () => {
    renderStep('eval-order', 5)
    const pending = screen.getByRole('region', { name: '인수 평가 중' })
    expect(within(pending).getByText('4')).toBeInTheDocument()
    expect(within(pending).getAllByText('평가 전')).toHaveLength(1)
  })

  it('eval-order 8단계: "인수 평가 중"이 없다', () => {
    renderStep('eval-order', 8)
    expect(screen.queryByText('인수 평가 중')).toBeNull()
    expect(within(callRegion()).getByText('add(square(2), square(3))')).toBeInTheDocument()
  })

  it('eval-order 11단계: 변수 total에 "새로 생김"이 붙는다', () => {
    renderStep('eval-order', 11)
    const row = screen.getByText('total = 13').closest('li')!
    expect(within(row).getByText('새로 생김')).toBeInTheDocument()
  })
})
