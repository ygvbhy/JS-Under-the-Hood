import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '프로미스 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "이미 이행된 프로미스와 then 체인" 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '이미 이행된 프로미스와 then 체인' })).toBeChecked()
    expect(screen.getByText(`단계 1: ${scenarios[0].steps[0].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^기다리는 Job/ })).toHaveTextContent('비어 있음')
    expect(screen.getByText('아직 없음')).toBeInTheDocument()
  })

  it('다음을 세 번 누르면 p1.then을 호출한 단계가 되어 Job이 들어가고 p2가 pending으로 나타난다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 3: ${scenarios[0].steps[2].title}`)).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent('var p2 = p1.then(function (v) {')
    expect(screen.getByRole('list', { name: /^기다리는 Job/ })).toHaveTextContent(
      '반응 Job 1 (p1 → p2)',
    )
    expect(document.querySelector('[data-promise="p2"]')).toHaveTextContent('pending (대기)')
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
