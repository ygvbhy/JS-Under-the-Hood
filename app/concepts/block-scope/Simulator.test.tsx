import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '블록 스코프 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "블록 안의 var와 let" 시나리오의 1단계("실행 전")를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '블록 안의 var와 let' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('아직 코드를 실행하지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('다음을 두 번 누르면 3단계에서 if 블록 줄이 강조된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('단계 3: 블록 진입')).toBeInTheDocument()
    const rows = document.querySelectorAll('[aria-current="step"]')
    expect(rows.length).toBeGreaterThan(1)
    expect(rows[0]).toHaveTextContent('if (true) {')
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    const other = scenarios[1]
    await user.click(screen.getByRole('radio', { name: other.label }))
    expect(screen.getByRole('radio', { name: other.label })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(`단계 1 / ${other.steps.length}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
    expect(screen.getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
  })

  it('마지막 단계에서 콘솔 출력 세 줄을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const last = scenarios[0].steps.length
    for (let i = 1; i < last; i++) {
      await user.click(screen.getByRole('button', { name: '다음' }))
    }
    expect(screen.getByText(`단계 ${last} / ${last}`)).toBeInTheDocument()
    const consoleRegion = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consoleRegion).getByText('사과 물')).toBeInTheDocument()
    expect(within(consoleRegion).getByText('사과')).toBeInTheDocument()
    expect(within(consoleRegion).getByText('undefined')).toBeInTheDocument()
  })
})
