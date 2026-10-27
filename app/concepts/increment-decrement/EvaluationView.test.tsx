import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EvaluationView } from './EvaluationView'
import { scenarios } from './scenarios'
import type { IncState } from './scenarios'

function stateOf(index: number): IncState {
  return scenarios[0].steps[index].state
}

describe('EvaluationView', () => {
  it('빈 상태에서는 두 영역의 빈 상태 문구를 보여 준다', () => {
    render(<EvaluationView state={{ bindings: [] }} />)
    expect(screen.getByRole('region', { name: '평가 중인 식' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '변수' })).toBeInTheDocument()
    expect(screen.getByText('아직 평가 중인 식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
  })

  it('사건 3개: 배지와 문장을 순서대로 보여 주고 새로 생긴 변수를 강조한다', () => {
    render(<EvaluationView state={stateOf(4)} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    expect(within(region).getByText('a++')).toBeInTheDocument()
    const items = within(region).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('읽기')).toBeInTheDocument()
    expect(within(items[0]).getByText('a의 값 1')).toBeInTheDocument()
    expect(within(items[1]).getByText('쓰기')).toBeInTheDocument()
    expect(within(items[1]).getByText('a에 2를 넣음')).toBeInTheDocument()
    expect(within(items[2]).getByText('식의 값')).toBeInTheDocument()
    expect(within(items[2]).getByText('a++ → 1')).toBeInTheDocument()

    const rows = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).not.toHaveClass('bg-highlight')
    expect(within(rows[1]).getByText('const')).toBeInTheDocument()
    expect(within(rows[1]).getByText('숫자')).toBeInTheDocument()
    expect(within(rows[1]).getByText('새로 생김')).toBeInTheDocument()
    expect(rows[1]).toHaveClass('bg-highlight')
  })

  it('쓰기 단계: 값이 바뀐 변수에 "값이 바뀜" 배지를 보여 준다', () => {
    render(<EvaluationView state={stateOf(3)} />)
    const rows = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByText('2')).toBeInTheDocument()
    expect(within(rows[0]).getByText('값이 바뀜')).toBeInTheDocument()
    expect(rows[0]).toHaveClass('bg-highlight')
  })

  it('쓰기 문장의 조사는 숫자를 읽는 소리에 맞춘다(1을, 2를)', () => {
    // self-assign 6단계: 사건 4개(x에 2를 넣음 → … → x에 1을 넣음)
    render(<EvaluationView state={scenarios[1].steps[5].state} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    expect(within(region).getByText('x에 2를 넣음')).toBeInTheDocument()
    expect(within(region).getByText('x에 1을 넣음')).toBeInTheDocument()
  })
})
