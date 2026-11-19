import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'requestAnimationFrame 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "콜백 안에서 다시 등록" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '콜백 안에서 다시 등록' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^콜 스택/ })).toHaveTextContent('전역 코드')
    expect(screen.getByRole('list', { name: /^콜백 맵/ })).toHaveTextContent('비어 있음')
    expect(screen.getByRole('list', { name: /^마이크로태스크 큐/ })).toHaveTextContent('비어 있음')
    expect(screen.getByText('아님')).toBeInTheDocument()
  })

  it('다음을 두 번 누르면 두 번째 requestAnimationFrame 등록 줄이 강조되고 맵에 handle 2가 나타난다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 3: ${scenarios[0].steps[2].title}`)).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent('requestAnimationFrame(function () {')
    expect(screen.getByRole('list', { name: /^콜백 맵/ })).toHaveTextContent('handle 2: raf2 콜백')
  })

  it('체크포인트 단계에서 "진행 중"이 표시된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '콜백 사이의 마이크로태스크' }))
    const i = scenarios[1].steps.findIndex((s) => s.state.checkpoint)
    for (let k = 0; k < i; k++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('진행 중')).toBeInTheDocument()
  })

  it('시나리오를 바꾸면 첫 단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    const other = scenarios[2]
    await user.click(screen.getByRole('radio', { name: other.label }))
    expect(screen.getByRole('radio', { name: other.label })).toBeChecked()
    expect(screen.getByText(`단계 1: ${other.steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByText(`단계 1 / ${other.steps.length}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).not.toBeNull()
    expect(screen.getByRole('list', { name: /^콜백 맵/ })).toHaveTextContent('비어 있음')
  })
})
