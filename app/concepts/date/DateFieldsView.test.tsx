import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DateFieldsView } from './DateFieldsView'
import { scenarios } from './scenarios'

function steps(id: string) {
  return scenarios.find((s) => s.id === id)!.steps
}

function indexOf(id: string, title: string) {
  const i = steps(id).findIndex((s) => s.title === title)
  if (i < 0) throw new Error(`단계 없음: ${id} / ${title}`)
  return i
}

function renderStep(id: string, title: string) {
  const i = indexOf(id, title)
  const all = steps(id)
  return render(
    <DateFieldsView state={all[i].state} prevState={i > 0 ? all[i - 1].state : undefined} />,
  )
}

const dateRow = (name: string) => document.querySelector<HTMLElement>(`[data-date-name="${name}"]`)!
const calcRow = (key: string) => document.querySelector<HTMLElement>(`[data-calc-row="${key}"]`)!
const datesArea = () => screen.getByRole('region', { name: '변수가 가리키는 Date (로컬 필드)' })
const calcArea = () => screen.getByRole('region', { name: 'MakeDay 계산' })

describe('DateFieldsView', () => {
  it('실행 전에는 변수도 계산도 없다고 글자로 알려 준다', () => {
    renderStep('month-overflow', '실행 전')
    expect(datesArea()).toHaveTextContent('아직 Date를 가리키는 변수가 없습니다.')
    expect(calcArea()).toHaveTextContent('진행 중인 MakeDay 계산 없음')
    expect(screen.queryByText('바뀜')).not.toBeInTheDocument()
  })

  it('월은 Date가 세는 0부터의 값과 사람이 읽는 월을 함께 보여 준다', () => {
    renderStep('month-overflow', 'd 초기화')
    expect(dateRow('d')).toHaveTextContent('연 2026, 월 0 (1월), 일 31')
  })

  it('MakeDay 계산 칸을 순서대로 보인다(입력 → 맞춘 연·월 → 1일 → 더할 날수 → 결과)', () => {
    renderStep('month-overflow', 'MakeDay(2026, 1, 31)')
    const rows = within(calcArea()).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('연 2026, 월 1 (2월), 일 31')
    expect(rows[1]).toHaveTextContent('연 2026, 월 1 (2월)')
    expect(rows[2]).toHaveTextContent('연 2026, 월 1 (2월), 일 1')
    expect(rows[3]).toHaveTextContent('+30일')
    expect(rows[4]).toHaveTextContent('연 2026, 월 2 (3월), 일 3')
  })

  it('계산 칸이 처음 나타나면 모든 칸에 "바뀜" 글자가 붙는다', () => {
    renderStep('month-overflow', '생성자: MakeDay(2026, 0, 31)')
    expect(within(calcArea()).getAllByText('바뀜')).toHaveLength(5)
  })

  it('이전 단계와 같은 계산 칸은 "바뀜"이 없고 바뀐 칸에만 붙는다', () => {
    renderStep('month-overflow', 'MakeDay(2026, 1, 31)')
    // 이전 단계는 setMonth 로컬 필드 읽기(계산 없음)이므로 전부 바뀜
    expect(within(calcArea()).getAllByText('바뀜')).toHaveLength(5)
  })

  it('계산이 같은 단계가 이어지면 바뀐 계산 칸이 없고, 바뀐 Date 행에만 "바뀜"이 붙는다', () => {
    renderStep('month-overflow', '[[DateValue]] 저장')
    expect(within(calcArea()).queryByText('바뀜')).not.toBeInTheDocument()
    expect(calcRow('result')).not.toHaveAttribute('data-changed')
    expect(dateRow('d')).toHaveAttribute('data-changed', 'true')
    expect(dateRow('d')).toHaveTextContent('연 2026, 월 2 (3월), 일 3')
    expect(within(datesArea()).getAllByText('바뀜')).toHaveLength(1)
  })

  it('음수 날수는 - 부호로 보여 준다', () => {
    renderStep('field-overflow', '생성자(2026, 0, -1): 일 -1')
    expect(calcRow('add')).toHaveTextContent('-2일')
    expect(calcRow('result')).toHaveTextContent('연 2025, 월 11 (12월), 일 30')
  })

  it('이미 있던 변수는 값이 같으면 "바뀜"이 없고, 새 변수에만 붙는다', () => {
    renderStep('field-overflow', 'nextYear 초기화')
    expect(dateRow('lastOfFeb')).not.toHaveAttribute('data-changed')
    expect(dateRow('nextYear')).toHaveAttribute('data-changed', 'true')
    expect(dateRow('nextYear')).toHaveTextContent('연 2027, 월 0 (1월), 일 1')
  })

  it('prevState 없이도(첫 렌더) 그려진다', () => {
    render(<DateFieldsView state={steps('month-overflow')[2].state} />)
    expect(dateRow('d')).toBeInTheDocument()
  })
})
