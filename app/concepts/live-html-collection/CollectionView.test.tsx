import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CollectionView } from './CollectionView'
import { scenarios } from './scenarios'

const live = scenarios.find((s) => s.id === 'live')!
const stat = scenarios.find((s) => s.id === 'static')!

const itemList = () => screen.getByRole('list', { name: 'li 4개' })
const cells = () => document.querySelectorAll('[data-collection-index]')

describe('CollectionView', () => {
  it('첫 단계: li 4개의 할 일 글자와 todo 배지가 있고 컬렉션은 아직 만들지 않음이다', () => {
    render(<CollectionView state={live.steps[0].state} />)
    const list = within(itemList())
    for (const task of ['청소', '빨래', '설거지', '장보기']) {
      expect(list.getByText(task)).toBeInTheDocument()
    }
    expect(list.getAllByText('todo')).toHaveLength(4)
    expect(screen.getByText('아직 만들지 않음')).toBeInTheDocument()
    expect(screen.getByText('i = 아직 없음')).toBeInTheDocument()
    expect(cells()).toHaveLength(0)
  })

  it('종류에 따라 컬렉션 이름이 달라진다', () => {
    const { rerender } = render(<CollectionView state={live.steps[2].state} />)
    expect(screen.getByText('HTMLCollection (살아 있음)')).toBeInTheDocument()
    rerender(<CollectionView state={stat.steps[2].state} />)
    expect(screen.getByText('NodeList (정적)')).toBeInTheDocument()
  })

  it('컬렉션 칸 수가 state.collection 길이와 같고 가리키는 li 글자를 보인다', () => {
    const step = live.steps.find((s) => s.state.collection?.length === 2)!
    render(<CollectionView state={step.state} />)
    expect(cells()).toHaveLength(2)
    expect(screen.getByText('todos.length 2')).toBeInTheDocument()
    const first = cells()[0] as HTMLElement
    expect(within(first).getByText('todos[0]')).toBeInTheDocument()
    expect(within(first).getByText('빨래')).toBeInTheDocument()
    const second = cells()[1] as HTMLElement
    expect(within(second).getByText('장보기')).toBeInTheDocument()
  })

  it('대입 단계는 대상 항목을 글자로 표시하고 이전 단계와 달라진 class에 "(바뀜)"을 붙인다', () => {
    const index = live.steps.findIndex((s) => s.line?.from === 22)
    render(
      <CollectionView state={live.steps[index].state} prevState={live.steps[index - 1].state} />,
    )
    expect(screen.getAllByText('이번에 바꾸는 항목')).toHaveLength(1)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    const card = document.querySelector('[data-item-index="0"]') as HTMLElement
    expect(within(card).getByText('done')).toBeInTheDocument()
    expect(within(card).getByText('이번에 바꾸는 항목')).toBeInTheDocument()
  })

  it('prevState가 없으면 "(바뀜)"을 표시하지 않는다', () => {
    const index = live.steps.findIndex((s) => s.line?.from === 22)
    render(<CollectionView state={live.steps[index].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('조건 검사 단계는 조건 결과를 글자로 보인다', () => {
    const last = live.steps.filter((s) => s.line?.from === 21).at(-1)!
    render(<CollectionView state={last.state} />)
    expect(screen.getByText('2 < 2 → 거짓 (반복 끝)')).toBeInTheDocument()
  })
})
