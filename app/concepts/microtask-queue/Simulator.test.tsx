import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '마이크로태스크 큐 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "동기 코드, 마이크로태스크, 타이머" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '동기 코드, 마이크로태스크, 타이머' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^콜 스택/ })).toHaveTextContent('전역 코드')
    expect(screen.getByRole('list', { name: /^태스크 큐/ })).toHaveTextContent('비어 있음')
    expect(screen.getByRole('list', { name: /^마이크로태스크 큐/ })).toHaveTextContent('비어 있음')
    expect(screen.getByText('아님')).toBeInTheDocument()
  })

  it('다음을 네 번 누르면 then 1을 등록하는 줄이 강조되고 마이크로태스크 큐에 then 1 콜백이 나타난다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 4: ${scenarios[0].steps[3].title}`)).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent('Promise.resolve().then(function () {')
    expect(screen.getByRole('list', { name: /^마이크로태스크 큐/ })).toHaveTextContent(
      'then 1 콜백',
    )
  })

  it('체크포인트 단계에서 "진행 중"이 표시된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const i = scenarios[0].steps.findIndex((s) => s.state.checkpoint)
    for (let k = 0; k < i; k++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('진행 중')).toBeInTheDocument()
  })

  it('시나리오를 바꾸면 첫 단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    const other = scenarios[1]
    await user.click(screen.getByRole('radio', { name: other.label }))
    expect(screen.getByRole('radio', { name: other.label })).toBeChecked()
    expect(screen.getByText(`단계 1: ${other.steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByText(`단계 1 / ${other.steps.length}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).not.toBeNull()
    expect(screen.getByRole('list', { name: /^태스크 큐/ })).toHaveTextContent('비어 있음')
  })
})
