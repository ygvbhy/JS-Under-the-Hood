import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'async 제너레이터 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "next를 연달아 부르면" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'next를 연달아 부르면' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^async 제너레이터 상태/ })).toHaveTextContent(
      '상태: suspended-start',
    )
    expect(screen.getByRole('list', { name: /^요청 큐/ })).toHaveTextContent('비어 있음')
  })

  it('다음을 누르면 요청이 큐에 쌓이고 마지막 next에서 3개가 된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const k = scenarios[0].steps.findIndex((s) => s.title === 'p2.then 등록, var p3 = it.next()')
    for (let i = 0; i < k; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    const current = Array.from(document.querySelectorAll('[aria-current="step"]'))
      .map((el) => el.textContent)
      .join('\n')
    expect(current).toContain('var p3 = it.next();')
    expect(screen.getByRole('list', { name: /^요청 큐/ })).toHaveTextContent('요청 3')
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
  })
})
