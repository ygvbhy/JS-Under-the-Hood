import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HoistView } from './HoistView'
import { scenarios } from './scenarios'

// n은 1부터 센 단계 번호
function renderStep(id: string, n: number) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  return render(<HoistView state={steps[n - 1].state} />)
}

const phaseRegion = () => screen.getByRole('region', { name: '진행 단계' })
const namesRegion = () => screen.getByRole('region', { name: '선언으로 만들어진 이름' })

describe('HoistView', () => {
  it('1단계(실행 전): 빈 상태 문구 2개를 보여 주고 "지금" 배지가 없다', () => {
    renderStep('var-before', 1)
    expect(screen.getByText('아직 코드를 실행하지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 만들어진 이름이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('지금')).toBeNull()
  })

  it('var-before 2단계: 선언 처리에 "지금", score는 undefined로 새로 생김', () => {
    renderStep('var-before', 2)
    const item = within(phaseRegion()).getByText('선언 처리 (코드 실행 전)').closest('li')!
    expect(within(item).getByText('지금')).toBeInTheDocument()
    expect(within(phaseRegion()).getAllByText('지금')).toHaveLength(1)
    expect(screen.queryByText('아직 코드를 실행하지 않았습니다.')).toBeNull()
    const row = within(namesRegion()).getByText('score = undefined').closest('li')!
    expect(within(row).getByText('var 선언으로 생김')).toBeInTheDocument()
    expect(within(row).getByText('undefined')).toBeInTheDocument()
    expect(within(row).getByText('새로 생김')).toBeInTheDocument()
  })

  it('var-before 4단계: score가 10으로 "값이 바뀜"', () => {
    renderStep('var-before', 4)
    const row = within(namesRegion()).getByText('score = 10').closest('li')!
    expect(within(row).getByText('숫자')).toBeInTheDocument()
    expect(within(row).getByText('값이 바뀜')).toBeInTheDocument()
  })

  it('decl-vs-expr 3단계: 함수 선언 double과 undefined인 triple이 함께 보인다', () => {
    renderStep('decl-vs-expr', 3)
    const double = within(namesRegion())
      .getByText('double = function double(n) { … }')
      .closest('li')!
    expect(within(double).getByText('함수 선언으로 생김')).toBeInTheDocument()
    expect(within(double).getByText('함수')).toBeInTheDocument()
    const triple = within(namesRegion()).getByText('triple = undefined').closest('li')!
    expect(within(triple).getByText('var 선언으로 생김')).toBeInTheDocument()
  })

  it('decl-vs-expr 4단계: "지금"이 실행 항목에 있다', () => {
    renderStep('decl-vs-expr', 4)
    const run = within(phaseRegion()).getByText('실행').closest('li')!
    expect(within(run).getByText('지금')).toBeInTheDocument()
    const declare = within(phaseRegion()).getByText('선언 처리 (코드 실행 전)').closest('li')!
    expect(within(declare).queryByText('지금')).toBeNull()
  })

  it('same-name 4단계: item은 1이지만 만든 선언은 "함수 선언으로 생김"으로 남는다', () => {
    renderStep('same-name', 4)
    const row = within(namesRegion()).getByText('item = 1').closest('li')!
    expect(within(row).getByText('함수 선언으로 생김')).toBeInTheDocument()
    expect(within(row).getByText('숫자')).toBeInTheDocument()
  })
})
