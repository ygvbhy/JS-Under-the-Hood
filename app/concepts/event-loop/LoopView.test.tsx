import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoopView } from './LoopView'
import { scenarios } from './scenarios'

const sync = scenarios.find((s) => s.id === 'sync')!
const click = scenarios.find((s) => s.id === 'click')!

const itemsOf = (name: string) =>
  within(screen.getByRole('list', { name: new RegExp(`^${name}`) }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

describe('LoopView', () => {
  it('첫 단계: 콜 스택에 전역 코드가 있고 나머지 두 칸은 비어 있으며 "(바뀜)"이 없다', () => {
    render(<LoopView state={sync.steps[0].state} />)
    expect(itemsOf('콜 스택')).toEqual(['전역 코드'])
    expect(itemsOf('대기 중인 타이머')).toEqual(['비어 있음'])
    expect(itemsOf('태스크 큐')).toEqual(['비어 있음'])
    expect(screen.getByText('지금 태스크')).toBeInTheDocument()
    expect(screen.getByText('스크립트')).toBeInTheDocument()
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('콜 스택은 위가 먼저(지금 실행 중), 큐는 앞이 먼저 나온다', () => {
    const clickStep = click.steps.find((s) => s.state.stack.length === 2)!
    render(<LoopView state={clickStep.state} />)
    expect(itemsOf('콜 스택')).toEqual(['click 리스너', '전역 코드'])
    expect(screen.getByRole('list', { name: /^콜 스택/ })).toHaveAccessibleName(
      '콜 스택 (위가 지금 실행 중)',
    )
  })

  it('큐에 두 콜백이 있으면 먼저 실행될 것이 앞에 나온다', () => {
    const step = sync.steps.find((s) => s.state.queue.length === 2)!
    render(<LoopView state={step.state} />)
    expect(itemsOf('태스크 큐')).toEqual(['a 콜백', 'b 콜백'])
    expect(itemsOf('대기 중인 타이머')).toEqual(['비어 있음'])
  })

  it('태스크 사이에는 지금 태스크가 "없음"이다', () => {
    const step = sync.steps.at(-1)!
    render(<LoopView state={step.state} />)
    expect(screen.getByText('없음')).toBeInTheDocument()
    expect(itemsOf('콜 스택')).toEqual(['비어 있음'])
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // 3단계(a 타이머 등록): 대기 중인 타이머만 달라진다
    render(<LoopView state={sync.steps[2].state} prevState={sync.steps[1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    const section = screen.getByText('대기 중인 타이머').closest('section')!
    expect(within(section).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    render(<LoopView state={sync.steps[1].state} prevState={sync.steps[0].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('태스크가 바뀌면 지금 태스크 줄과 스택·큐 칸에 "(바뀜)"이 붙는다', () => {
    const i = sync.steps.findIndex((s) => s.state.task === 'a 콜백')
    render(<LoopView state={sync.steps[i].state} prevState={sync.steps[i - 1].state} />)
    // 지금 태스크, 콜 스택, 태스크 큐
    expect(screen.getAllByText('(바뀜)')).toHaveLength(3)
  })
})
