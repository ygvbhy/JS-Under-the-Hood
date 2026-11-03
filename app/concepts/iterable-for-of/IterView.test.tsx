import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IterView } from './IterView'
import { scenarios } from './scenarios'
import type { IterState } from './scenarios'

const empty: IterState = { iterable: null, iterator: null, binding: null, calls: [] }

const nextState = (index: string, value: string, changed: boolean): IterState => ({
  iterable: { name: 'letters', summary: "배열 ['a', 'b']" },
  iterator: {
    label: '배열 이터레이터',
    fields: [
      { name: '[[IteratedArrayLike]]', value: 'letters' },
      { name: '[[ArrayLikeNextIndex]]', value: index, ...(changed && { changed: true }) },
    ],
  },
  binding: { name: 'ch', value },
  calls: [{ kind: 'next', result: { value, done: false } }],
})

describe('IterView', () => {
  it('아무것도 없으면 빈 상태 문구와 호출 없음 문구를 보여 준다', () => {
    render(<IterView state={empty} />)
    expect(screen.getByText('아직 만든 값이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 이터레이터가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 값을 받지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('이번 단계에서는 호출이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '이번 단계의 호출' })).toBeNull()
  })

  it('호출 목록에 get-iterator, next, return이 정해진 모양으로 나온다', () => {
    const state: IterState = {
      ...empty,
      calls: [
        { kind: 'get-iterator', target: 'letters' },
        { kind: 'next', result: { value: "'a'", done: false } },
        { kind: 'next', result: { value: 'undefined', done: true } },
        { kind: 'return' },
      ],
    }
    render(<IterView state={state} />)
    const list = screen.getByRole('list', { name: '이번 단계의 호출' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      'letters[Symbol.iterator]() → 이터레이터',
      "next() → { value: 'a', done: false }",
      'next() → { value: undefined, done: true }',
      'return()',
    ])
  })

  it('세 카드에 이터러블·이터레이터 필드·루프 변수가 나온다', () => {
    render(<IterView state={nextState('1', "'a'", false)} />)
    expect(screen.getByText('이터러블')).toBeInTheDocument()
    expect(screen.getByText('letters')).toBeInTheDocument()
    expect(screen.getByText("배열 ['a', 'b']", { exact: false })).toBeInTheDocument()
    expect(screen.getByText('배열 이터레이터')).toBeInTheDocument()
    expect(screen.getByText('[[IteratedArrayLike]] letters')).toBeInTheDocument()
    expect(screen.getByText("ch 'a'")).toBeInTheDocument()
  })

  it('바뀐 필드에는 "(바뀜)"을 표시하고, 안 바뀐 필드에는 표시하지 않는다', () => {
    render(<IterView state={nextState('1', "'a'", true)} />)
    expect(screen.getByText('[[ArrayLikeNextIndex]] 1 (바뀜)')).toBeInTheDocument()
    expect(screen.getByText('[[IteratedArrayLike]] letters')).toBeInTheDocument()
  })

  it('이전 단계와 비교해 필드와 루프 변수가 달라졌으면 changed 없이도 "(바뀜)"을 표시한다', () => {
    const prev = nextState('1', "'a'", false)
    const { rerender } = render(<IterView state={nextState('2', "'b'", false)} prevState={prev} />)
    expect(screen.getByText('[[ArrayLikeNextIndex]] 2 (바뀜)')).toBeInTheDocument()
    expect(screen.getByText("ch 'b' (바뀜)")).toBeInTheDocument()
    rerender(<IterView state={prev} prevState={prev} />)
    expect(screen.getByText('[[ArrayLikeNextIndex]] 1')).toBeInTheDocument()
    expect(screen.getByText("ch 'a'")).toBeInTheDocument()
  })

  it('시나리오 2의 return 단계는 return()을 호출 목록에 보여 준다', () => {
    const step = scenarios[1].steps.find((s) => s.state.calls.some((c) => c.kind === 'return'))!
    render(<IterView state={step.state} />)
    expect(screen.getByText('return()')).toBeInTheDocument()
    expect(screen.getByText('left 1')).toBeInTheDocument()
  })
})
