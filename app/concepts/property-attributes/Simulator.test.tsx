import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '프로퍼티 어트리뷰트 시뮬레이터'

async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

describe('Simulator', () => {
  it('처음에는 "쓰기 금지: sloppy mode" 시나리오의 1단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '쓰기 금지: sloppy mode' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('아직 이 코드가 만든 객체가 없습니다.')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('대입이 무시되는 단계에서 무시됨 문장을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    expect(screen.getByText('단계 4: 3번 줄: item.code에 대입')).toBeInTheDocument()
    expect(
      screen.getByText('writable이 false라 대입이 무시됨 — strict mode가 아니라 오류 없음'),
    ).toBeInTheDocument()
  })

  it('strict mode 시나리오에서 TypeError 단계에 도달한다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '쓰기 금지: strict mode' }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    await next(user, 3)
    expect(screen.getByText('단계 4: 5번 줄: item.code에 대입')).toBeInTheDocument()
    expect(screen.getByText('TypeError 발생')).toBeInTheDocument()
  })

  it('첫 시나리오의 마지막 단계에서 콘솔에 A1, false, A1을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const last = scenarios[0].steps.length
    await next(user, last - 1)
    expect(screen.getByText(`단계 ${last} / ${last}`)).toBeInTheDocument()
    const consoleRegion = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consoleRegion).getAllByText('A1')).toHaveLength(2)
    expect(within(consoleRegion).getByText('false')).toBeInTheDocument()
  })
})
