import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'Promise.all 장부 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "넣은 순서로 모으기" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '넣은 순서로 모으기' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^기다리는 Job/ })).toHaveTextContent('비어 있음')
    expect(screen.getByText('요소 장부')).toBeInTheDocument()
  })

  it('다음을 두 번 누르면 Promise.all 호출 단계가 되어 남은 개수 1과 pending 결과가 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 3: ${scenarios[0].steps[2].title}`)).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent('var all = Promise.all([a, b, ')
    expect(screen.getByRole('region', { name: '남은 개수' })).toHaveTextContent('1')
    expect(screen.getByRole('region', { name: '결과 프로미스' })).toHaveTextContent(
      'pending (대기)',
    )
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
    expect(screen.getByRole('list', { name: /^기다리는 Job/ })).toHaveTextContent('비어 있음')
  })
})
