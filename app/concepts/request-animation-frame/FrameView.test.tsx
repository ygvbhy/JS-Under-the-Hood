import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FrameView } from './FrameView'
import { scenarios } from './scenarios'

const nextFrame = scenarios.find((s) => s.id === 'next-frame')!
const between = scenarios.find((s) => s.id === 'microtask-between')!
const cancel = scenarios.find((s) => s.id === 'cancel')!

const itemsOf = (name: string) =>
  within(screen.getByRole('list', { name: new RegExp(`^${name}`) }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

describe('FrameView', () => {
  it('첫 단계: 콜 스택에 전역 코드가 있고 나머지 칸은 비어 있으며 "(바뀜)"이 없다', () => {
    render(<FrameView state={nextFrame.steps[0].state} />)
    expect(itemsOf('콜 스택')).toEqual(['전역 코드'])
    expect(itemsOf('콜백 맵')).toEqual(['비어 있음'])
    expect(itemsOf('이번 실행의 handle 목록')).toEqual(['없음 (렌더링 갱신 밖)'])
    expect(itemsOf('마이크로태스크 큐')).toEqual(['비어 있음'])
    expect(screen.getByText('지금 태스크')).toBeInTheDocument()
    expect(screen.getByText('스크립트')).toBeInTheDocument()
    expect(screen.getByText('프레임 타임스탬프')).toBeInTheDocument()
    expect(screen.getByText('아님')).toBeInTheDocument()
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('콜백 맵은 handle 번호와 콜백 이름을 보여 준다', () => {
    render(<FrameView state={nextFrame.steps[2].state} />)
    expect(itemsOf('콜백 맵')).toEqual(['handle 1: raf1 콜백', 'handle 2: raf2 콜백'])
  })

  it('콜백을 실행하는 단계: 그 handle은 맵에 없고 목록에서 "지금"으로 표시되며 타임스탬프가 보인다', () => {
    const step = nextFrame.steps.find((s) => s.title === 'handle 1: 맵에서 지우고 콜백 호출')!
    render(<FrameView state={step.state} />)
    expect(itemsOf('콜 스택')).toEqual(['raf1 콜백'])
    expect(itemsOf('콜백 맵')).toEqual(['handle 2: raf2 콜백'])
    expect(itemsOf('이번 실행의 handle 목록')).toEqual(['handle 1 (지금)', 'handle 2'])
    expect(screen.getByText('렌더링 갱신 (프레임 1)')).toBeInTheDocument()
    expect(screen.getByText('T1')).toBeInTheDocument()
  })

  it('콜백 안에서 다시 등록한 handle은 맵에만 있고 목록에는 없다', () => {
    const step = nextFrame.steps.find((s) => s.title.startsWith('콜백 안에서 다시 등록'))!
    render(<FrameView state={step.state} />)
    expect(itemsOf('콜백 맵')).toEqual(['handle 2: raf2 콜백', 'handle 3: raf3 콜백'])
    expect(itemsOf('이번 실행의 handle 목록')).toEqual(['handle 1 (지금)', 'handle 2'])
  })

  it('콜 스택은 위가 먼저(지금 실행 중), 마이크로태스크 큐는 앞이 먼저 나온다', () => {
    const step = between.steps.find((s) => s.state.stack.length === 1 && s.state.microtasks.length)!
    render(<FrameView state={step.state} />)
    expect(screen.getByRole('list', { name: /^콜 스택/ })).toHaveAccessibleName(
      '콜 스택 (위가 지금 실행 중)',
    )
    expect(itemsOf('마이크로태스크 큐')).toEqual(['then 콜백'])
  })

  it('체크포인트가 진행 중이면 "진행 중"으로 표시하고 지금 태스크는 렌더링 갱신으로 유지된다', () => {
    const step = between.steps.find((s) => s.state.checkpoint)!
    render(<FrameView state={step.state} />)
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(screen.queryByText('아님')).toBeNull()
    expect(screen.getByText('렌더링 갱신 (프레임 1)')).toBeInTheDocument()
  })

  it('건너뜀 단계: 스택이 비고 handle 3이 "지금"이며 맵에는 없다', () => {
    const step = cancel.steps.find((s) => s.title.startsWith('handle 3: 맵에 없어서 건너뜀'))!
    render(<FrameView state={step.state} />)
    expect(itemsOf('콜 스택')).toEqual(['비어 있음'])
    expect(itemsOf('콜백 맵')).toEqual(['handle 4: D 콜백'])
    expect(itemsOf('이번 실행의 handle 목록')).toEqual(['handle 2', 'handle 3 (지금)', 'handle 4'])
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // 2단계(rAF 등록): 콜백 맵만 달라진다
    render(<FrameView state={nextFrame.steps[1].state} prevState={nextFrame.steps[0].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    const section = screen.getByText('콜백 맵').closest('section')!
    expect(within(section).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    render(<FrameView state={nextFrame.steps[3].state} prevState={nextFrame.steps[2].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('처리 중인 handle만 달라지면 handle 목록 칸에만 "(바뀜)"이 붙는다', () => {
    const i = cancel.steps.findIndex((s) => s.title.startsWith('handle 3: 맵에 없어서 건너뜀'))
    render(<FrameView state={cancel.steps[i].state} prevState={cancel.steps[i - 1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    const section = screen.getByText('이번 실행의 handle 목록').closest('section')!
    expect(within(section).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('프레임이 시작되면 지금 태스크, 타임스탬프, handle 목록 칸에 "(바뀜)"이 붙는다', () => {
    const i = nextFrame.steps.findIndex((s) => s.state.frameHandles !== null)
    render(<FrameView state={nextFrame.steps[i].state} prevState={nextFrame.steps[i - 1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(3)
  })
})
