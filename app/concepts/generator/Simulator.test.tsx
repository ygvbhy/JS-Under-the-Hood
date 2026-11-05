import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '제너레이터 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "next와 yield의 왕복" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'next와 yield의 왕복' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveTextContent('전역 코드')
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent('없음')
  })

  it("다음을 두 번 누르면 it.next('ignored') 줄이 강조되고 상태가 executing이다", async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 3: ${scenarios[0].steps[2].title}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent(
      "var r1 = it.next('ignored');",
    )
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent(
      '상태: executing',
    )
    expect(screen.getByText("it.next('ignored')", { selector: 'p.font-mono' })).toBeInTheDocument()
  })

  it('yield 단계에서 suspended-yield와 돌려준 결과가 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent(
      '상태: suspended-yield',
    )
    expect(screen.getByText('{ value: first, done: false }')).toBeInTheDocument()
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
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent('없음')
  })
})
