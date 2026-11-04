import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PathView } from './PathView'
import { scenarios } from './scenarios'

const icon = scenarios.find((s) => s.id === 'icon')!

const nodeRow = (name: string) => document.querySelector(`[data-node="${name}"]`) as HTMLElement

describe('PathView', () => {
  it('첫 단계: 경로 대신 안내와 등록된 리스너를 보이고 패널은 NONE과 null이다', () => {
    render(<PathView state={icon.steps[0].state} />)
    expect(screen.getByText('click()을 부르면 이벤트 경로가 정해집니다')).toBeInTheDocument()
    expect(screen.getByText('디스패치 전')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-node]')).toHaveLength(0)
    const list = within(screen.getByRole('list', { name: '등록된 리스너' }))
    expect(list.getAllByRole('listitem')).toHaveLength(icon.steps[0].state.listeners.length)
    expect(list.getByText('card 캡처')).toBeInTheDocument()
    expect(list.getByText('document 버블')).toBeInTheDocument()
    expect(screen.getByText('0 NONE')).toBeInTheDocument()
    expect(screen.getByText('없음')).toBeInTheDocument()
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('캡처 순회 단계: 지금 노드만 "지금 방문"이고 phase는 1 CAPTURING_PHASE다', () => {
    const index = icon.steps.findIndex((s) => s.state.node === 'card' && s.state.pass === 'capture')
    render(<PathView state={icon.steps[index].state} />)
    expect(screen.getByText('↓ 캡처 순회')).toBeInTheDocument()
    expect(screen.getAllByText('지금 방문')).toHaveLength(1)
    expect(within(nodeRow('card')).getByText('지금 방문')).toBeInTheDocument()
    expect(within(nodeRow('card')).getByText('card 캡처')).toBeInTheDocument()
    expect(within(nodeRow('card')).getByText('card 버블')).toBeInTheDocument()
    expect(screen.getByText('1 CAPTURING_PHASE')).toBeInTheDocument()
    // 경로는 window가 위, 타깃이 아래
    const names = [...document.querySelectorAll('[data-node]')].map((el) =>
      el.getAttribute('data-node'),
    )
    expect(names).toEqual(['window', 'document', 'html', 'body', 'card', 'save', 'icon'])
  })

  it('타깃 단계: phase는 2 AT_TARGET이고 target 글자가 타깃 노드에 붙는다', () => {
    const index = icon.steps.findIndex((s) => s.state.node === 'icon' && s.state.pass === 'capture')
    render(<PathView state={icon.steps[index].state} />)
    expect(screen.getByText('2 AT_TARGET')).toBeInTheDocument()
    expect(within(nodeRow('icon')).getByText('지금 방문')).toBeInTheDocument()
    expect(within(nodeRow('icon')).getByText('target')).toBeInTheDocument()
  })

  it('버블 순회 단계: 순회 방향 글자와 3 BUBBLING_PHASE를 보인다', () => {
    const index = icon.steps.findIndex((s) => s.state.node === 'card' && s.state.pass === 'bubble')
    render(<PathView state={icon.steps[index].state} />)
    expect(screen.getByText('↑ 버블 순회')).toBeInTheDocument()
    expect(screen.getByText('3 BUBBLING_PHASE')).toBeInTheDocument()
  })

  it('끝 단계: 디스패치 끝, currentTarget은 null이고 phase는 0 NONE이다', () => {
    render(<PathView state={icon.steps.at(-1)!.state} />)
    expect(screen.getByText('디스패치 끝')).toBeInTheDocument()
    expect(screen.getByText('0 NONE')).toBeInTheDocument()
    expect(screen.queryByText('지금 방문')).toBeNull()
  })

  it('이전 단계와 달라진 값에 "(바뀜)"을 붙인다', () => {
    // 1단계 → 2단계(window 캡처): eventPhase, target, currentTarget, 실행된 리스너가 모두 바뀐다
    render(<PathView state={icon.steps[1].state} prevState={icon.steps[0].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(4)
  })

  it('값이 같으면 "(바뀜)"이 없고 prevState가 없어도 표시하지 않는다', () => {
    // 같은 단계를 이전 단계로 넘기면 달라진 값이 없다
    const { rerender } = render(
      <PathView state={icon.steps[1].state} prevState={icon.steps[1].state} />,
    )
    expect(screen.queryByText('(바뀜)')).toBeNull()
    rerender(<PathView state={icon.steps[1].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })
})
