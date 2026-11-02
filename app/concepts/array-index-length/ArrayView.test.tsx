import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ArrayView } from './ArrayView'
import type { ArrayState } from './scenarios'

const s = (display: string) => ({ type: 'string' as const, display })

describe('ArrayView', () => {
  it('배열이 없으면 빈 상태 문구를 보여 준다', () => {
    render(<ArrayView state={{ arrays: [] }} />)
    expect(screen.getByText('아직 표시할 배열이 없습니다.')).toBeInTheDocument()
  })

  it('length 5에 프로퍼티 0, 1, 4만 있으면 칸 2, 3은 "구멍"이다', () => {
    const state: ArrayState = {
      arrays: [
        {
          name: 'a',
          length: 5,
          props: [
            { key: '0', value: s('x') },
            { key: '1', value: s('y') },
            { key: '4', value: s('z') },
          ],
        },
      ],
    }
    render(<ArrayView state={state} />)
    expect(screen.getAllByText('구멍')).toHaveLength(2)
    const cell2 = document.querySelector<HTMLElement>('[data-cell-index="2"]')!
    expect(within(cell2).getByText('구멍')).toBeInTheDocument()
    const cell4 = document.querySelector<HTMLElement>('[data-cell-index="4"]')!
    expect(within(cell4).getByText('"z"')).toBeInTheDocument()
    expect(document.querySelector('[data-cell-index="5"]')).toBeNull()
  })

  it('키 종류 배지: 숫자 문자열은 "인덱스", color는 "인덱스 아님"', () => {
    const state: ArrayState = {
      arrays: [
        {
          name: 'a',
          length: 1,
          props: [
            { key: '0', value: s('x') },
            { key: 'color', value: s('red') },
          ],
        },
      ],
    }
    render(<ArrayView state={state} />)
    const idxRow = screen.getByText('"0"').closest('tr')!
    expect(within(idxRow).getByText('인덱스')).toBeInTheDocument()
    const colorRow = screen.getByText('"color"').closest('tr')!
    expect(within(colorRow).getByText('인덱스 아님')).toBeInTheDocument()
  })

  it('removed가 있으면 지워진 키를 보여 준다', () => {
    const state: ArrayState = {
      arrays: [{ name: 'nums', length: 2, props: [], removed: ['2', '3'] }],
    }
    render(<ArrayView state={state} />)
    expect(screen.getByText('이 단계에서 지워진 키: "2", "3"')).toBeInTheDocument()
  })

  it('lengthChanged면 "바뀜"을 보여 주고 아니면 보여 주지 않는다', () => {
    const base = { name: 'a', length: 2, props: [] }
    const { rerender } = render(
      <ArrayView state={{ arrays: [{ ...base, lengthChanged: true }] }} />,
    )
    expect(screen.getByText('length: 2')).toBeInTheDocument()
    expect(screen.getByText('바뀜')).toBeInTheDocument()
    rerender(<ArrayView state={{ arrays: [base] }} />)
    expect(screen.queryByText('바뀜')).toBeNull()
  })

  it('changed 프로퍼티는 이전에 없던 키면 "새로 생김", 있던 키면 "값 바뀜"이다', () => {
    const prev: ArrayState = {
      arrays: [{ name: 'a', length: 1, props: [{ key: '0', value: s('x') }] }],
    }
    const state: ArrayState = {
      arrays: [
        {
          name: 'a',
          length: 2,
          props: [
            { key: '0', value: s('w'), changed: true },
            { key: '1', value: s('y'), changed: true },
          ],
        },
      ],
    }
    render(<ArrayView state={state} prevState={prev} />)
    expect(within(screen.getByText('"0"').closest('tr')!).getByText('값 바뀜')).toBeInTheDocument()
    expect(
      within(screen.getByText('"1"').closest('tr')!).getByText('새로 생김'),
    ).toBeInTheDocument()
  })
})
