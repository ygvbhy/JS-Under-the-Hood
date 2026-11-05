import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'async/await 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "첫 await까지는 동기로" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '첫 await까지는 동기로' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveTextContent('전역 코드')
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent('없음')
  })

  it('다음을 한 번 누르면 var p = work() 줄이 강조되고 호출이 실행 중이다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 2: ${scenarios[0].steps[1].title}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('var p = work();')
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent(
      '상태: 실행 중',
    )
  })

  it('await 단계에서 호출이 await에서 멈추고 Job 큐에 work 재개가 들어간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent(
      '상태: await에서 멈춤',
    )
    expect(screen.getByRole('list', { name: /^프로미스 Job 큐/ })).toHaveTextContent('work 재개')
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
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent('없음')
  })
})
