import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlowView } from './FlowView'
import { scenarios } from './scenarios'
import type { FlowState } from './scenarios'

describe('FlowView', () => {
  it('빈 상태에서는 두 영역의 빈 상태 문구를 보여 준다', () => {
    render(<FlowView state={{ bindings: [], blocks: [] }} />)
    expect(screen.getByRole('region', { name: '실행 중인 구조' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '변수' })).toBeInTheDocument()
    expect(screen.getByText('아직 실행 중인 switch나 반복문이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
  })

  it('fall-through 7단계: 두 번의 비교와 이어서 실행 문장을 보여 준다', () => {
    render(<FlowView state={scenarios[0].steps[6].state} />)
    const region = screen.getByRole('region', { name: '실행 중인 구조' })
    expect(within(region).getByText('switch')).toBeInTheDocument()
    expect(within(region).getByText('switch (level)')).toBeInTheDocument()
    expect(within(region).getAllByText('비교')).toHaveLength(2)
    expect(within(region).getByText('case 3: 2 === 3 → false')).toBeInTheDocument()
    expect(
      within(region).getByText('break가 없어 case 1의 문장으로 이어서 실행(식은 평가하지 않음)'),
    ).toBeInTheDocument()
    expect(within(region).getByText('이어서 실행')).toBeInTheDocument()
  })

  it('반복문 안의 switch 6단계: switch 블록이 for 블록 안에 중첩된다', () => {
    render(<FlowView state={scenarios[2].steps[5].state} />)
    const region = screen.getByRole('region', { name: '실행 중인 구조' })
    const forBlock = within(region).getByText('반복문').parentElement!.parentElement!
    const switchBlock = within(region).getByText('switch').parentElement!.parentElement!
    expect(forBlock).not.toBe(switchBlock)
    expect(forBlock.contains(switchBlock)).toBe(true)
    expect(switchBlock.contains(forBlock)).toBe(false)
    expect(within(forBlock).getByText('1회차')).toBeInTheDocument()
    expect(within(switchBlock).getByText('break')).toBeInTheDocument()
    expect(within(switchBlock).getByText('가장 가까운 switch를 끝냄')).toBeInTheDocument()
  })

  it('변수 생성 단계에서 "새로 생김" 배지와 강조를 보여 준다', () => {
    render(<FlowView state={scenarios[1].steps[1].state} />)
    const rows = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    expect(within(rows[rows.length - 1]).getByText('새로 생김')).toBeInTheDocument()
    expect(rows[rows.length - 1]).toHaveClass('bg-highlight')
  })

  it('값이 바뀐 단계에서 "값이 바뀜" 배지를 보여 준다', () => {
    render(<FlowView state={scenarios[1].steps[5].state} />)
    expect(screen.getByText('값이 바뀜')).toBeInTheDocument()
  })

  it('문자열 값은 따옴표로 감싸 보여 주고 문자열 배지를 단다', () => {
    const state: FlowState = {
      bindings: [
        {
          name: 'grade',
          declaredWith: 'const',
          value: { type: 'string', display: '1' },
        },
      ],
      blocks: [
        {
          kind: 'switch',
          code: 'switch (grade)',
          events: [
            { kind: 'value', code: 'grade', value: { type: 'string', display: '1' } },
            {
              kind: 'compare',
              caseCode: 'case 1',
              left: { type: 'string', display: '1' },
              right: { type: 'number', display: '1' },
              result: false,
            },
          ],
        },
      ],
    }
    render(<FlowView state={state} />)
    expect(screen.getByText('grade의 값 "1"')).toBeInTheDocument()
    expect(screen.getByText('case 1: "1" === 1 → false')).toBeInTheDocument()
    const row = within(screen.getByRole('region', { name: '변수' })).getByRole('listitem')
    expect(within(row).getByText('"1"')).toBeInTheDocument()
    expect(within(row).getByText('문자열')).toBeInTheDocument()
  })
})
