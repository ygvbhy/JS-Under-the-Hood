import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'try/catch/finally 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "finally의 return이 덮는다" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'finally의 return이 덮는다' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveTextContent('전역 코드')
    expect(screen.getByLabelText('try 문의 결과')).toHaveTextContent('아직 없음')
  })

  it("다음을 두 번 누르면 return 'try' 줄이 강조되고 try 블록이 return 완료다", async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 3: ${scenarios[0].steps[2].title}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("return 'try';")
    expect(screen.getByRole('list', { name: /^블록의 완료/ })).toHaveTextContent(
      "return 완료 ('try')",
    )
  })

  it("try 문의 결과 단계에서 결과가 return 완료 ('finally')가 된다", async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByLabelText('try 문의 결과')).toHaveTextContent("return 완료 ('finally')")
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
    expect(screen.getByLabelText('try 문의 결과')).toHaveTextContent('아직 없음')
  })
})
