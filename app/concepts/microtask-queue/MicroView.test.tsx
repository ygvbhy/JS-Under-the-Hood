import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MicroView } from './MicroView'
import { scenarios } from './scenarios'

const basic = scenarios.find((s) => s.id === 'basic')!
const click = scenarios.find((s) => s.id === 'click')!
const message = scenarios.find((s) => s.id === 'message')!

const itemsOf = (name: string) =>
  within(screen.getByRole('list', { name: new RegExp(`^${name}`) }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

describe('MicroView', () => {
  it('첫 단계: 콜 스택에 전역 코드가 있고 나머지 세 칸은 비어 있으며 "(바뀜)"이 없다', () => {
    render(<MicroView state={basic.steps[0].state} />)
    expect(itemsOf('콜 스택')).toEqual(['전역 코드'])
    expect(itemsOf('대기 중인 타이머')).toEqual(['비어 있음'])
    expect(itemsOf('태스크 큐')).toEqual(['비어 있음'])
    expect(itemsOf('마이크로태스크 큐')).toEqual(['비어 있음'])
    expect(screen.getByText('지금 태스크')).toBeInTheDocument()
    expect(screen.getByText('스크립트')).toBeInTheDocument()
    expect(screen.getByText('마이크로태스크 체크포인트')).toBeInTheDocument()
    expect(screen.getByText('아님')).toBeInTheDocument()
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('콜 스택은 위가 먼저(지금 실행 중), 마이크로태스크 큐는 앞이 먼저 나온다', () => {
    const step = click.steps.find((s) => s.state.stack.length === 2)!
    render(<MicroView state={step.state} />)
    expect(itemsOf('콜 스택')).toEqual(['리스너 1', '전역 코드'])
    expect(screen.getByRole('list', { name: /^콜 스택/ })).toHaveAccessibleName(
      '콜 스택 (위가 지금 실행 중)',
    )
    const queued = basic.steps.find((s) => s.state.microtasks.length === 3)!
    render(<MicroView state={queued.state} />)
    expect(screen.getAllByRole('list', { name: /^마이크로태스크 큐/ })[1]).toHaveTextContent(
      'then 1 콜백queueMicrotask 콜백then 2 콜백',
    )
  })

  it('체크포인트가 진행 중이면 "진행 중"으로 표시한다', () => {
    const step = basic.steps.find((s) => s.state.checkpoint)!
    render(<MicroView state={step.state} />)
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(screen.queryByText('아님')).toBeNull()
  })

  it('태스크 사이에는 지금 태스크가 "없음"이다', () => {
    render(<MicroView state={basic.steps.at(-1)!.state} />)
    expect(screen.getByText('없음')).toBeInTheDocument()
    expect(itemsOf('콜 스택')).toEqual(['비어 있음'])
    expect(itemsOf('마이크로태스크 큐')).toEqual(['비어 있음'])
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // 3단계(타이머 등록): 대기 중인 타이머만 달라진다
    render(<MicroView state={basic.steps[2].state} prevState={basic.steps[1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    const section = screen.getByText('대기 중인 타이머').closest('section')!
    expect(within(section).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    render(<MicroView state={basic.steps[1].state} prevState={basic.steps[0].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('체크포인트가 시작되면 체크포인트 줄과 콜 스택 칸에 "(바뀜)"이 붙는다', () => {
    const i = basic.steps.findIndex((s) => s.state.checkpoint)
    render(<MicroView state={basic.steps[i].state} prevState={basic.steps[i - 1].state} />)
    // 콜 스택(전역 코드가 빠짐), 체크포인트
    expect(screen.getAllByText('(바뀜)')).toHaveLength(2)
    const status = screen.getByText('마이크로태스크 체크포인트').parentElement!
    expect(within(status).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('message 시나리오: 체크포인트 중에도 지금 태스크는 message 이벤트로 유지된다', () => {
    const step = message.steps.find((s) => s.state.checkpoint)!
    render(<MicroView state={step.state} />)
    expect(screen.getByText('message 이벤트')).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
  })
})
