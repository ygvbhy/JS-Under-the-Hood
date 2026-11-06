import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'ES 모듈 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 라이브 바인딩 시나리오의 첫 단계를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '라이브 바인딩' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 시작')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '모듈 main(인라인)' })).toHaveTextContent(
      '바인딩 없음',
    )
  })

  it('링크 단계에서 main의 count가 counter.js의 count를 가리킨다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 3: ${scenarios[0].steps[2].title}`)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'main(인라인)의 바인딩' })).toHaveTextContent(
      'count → counter.js의 count',
    )
  })

  it('inc() 실행 단계에서 counter.js 칸에만 (바뀜)이 붙는다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText(`단계 6: ${scenarios[0].steps[5].title}`)).toBeInTheDocument()
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    expect(screen.getByLabelText('지금 실행 중인 코드')).toHaveTextContent('count += 1;')
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
    expect(screen.getByRole('region', { name: '모듈 main(인라인)' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '모듈 cycle-a.js' })).toBeNull()
  })
})
