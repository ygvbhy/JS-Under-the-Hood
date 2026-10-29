import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'new 연산자 시뮬레이터'

async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

describe('Simulator', () => {
  it('처음에는 "객체 두 개 만들기" 시나리오의 1단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '객체 두 개 만들기' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('진행 중인 호출이 없습니다.')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('객체를 return하는 시나리오의 결과 결정 단계에서 A가 결과로 쓰이지 않음을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '객체를 return하면' }))
    await next(user, 6)
    expect(screen.getByText('단계 7: 결과 결정: return한 객체 B가 결과')).toBeInTheDocument()
    expect(screen.getByText('결과로 쓰이지 않음')).toBeInTheDocument()
    expect(screen.getAllByText('new 식의 결과')).toHaveLength(2) // 호출 영역 + 객체 B 카드
  })

  it('시나리오를 바꾸면 1단계로 돌아가고 new 없는 호출은 4단계 목록을 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 2)
    await user.click(screen.getByRole('radio', { name: 'new 없이 호출하면' }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    await next(user, 1)
    expect(document.querySelectorAll('ol > li')).toHaveLength(4)
    expect(screen.queryByText('새 객체 생성')).toBeNull()
  })

  it('첫 시나리오의 마지막 단계에서 콘솔에 두 객체의 JSON과 false를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const last = scenarios[0].steps.length
    await next(user, last - 1)
    expect(screen.getByText(`단계 ${last} / ${last}`)).toBeInTheDocument()
    const consoleRegion = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consoleRegion).getByText('false')).toBeInTheDocument()
  })
})
