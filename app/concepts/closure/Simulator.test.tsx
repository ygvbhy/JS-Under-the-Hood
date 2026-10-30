import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '클로저 시뮬레이터'

async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

describe('Simulator', () => {
  it('처음에는 첫 시나리오의 1단계(실행 전)를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[0].label })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('실행 컨텍스트 없음 (실행 전)')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 찾는 이름 없음')).toBeInTheDocument()
  })

  it('counter의 반환 단계에서 "남아 있음"과 이유를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const title = 'makeCounter 반환: 컨텍스트 빠짐, next 초기화'
    const index = scenarios[0].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    expect(screen.getAllByText('남아 있음')).toHaveLength(2)
    expect(screen.getAllByText(/실행 컨텍스트 없이 남음/)).toHaveLength(2)
    const stack = within(screen.getByRole('region', { name: '실행 컨텍스트 스택' }))
    expect(stack.getAllByRole('listitem')).toHaveLength(1)
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[1].label })).toBeChecked()
    expect(screen.getByText('실행 컨텍스트 없음 (실행 전)')).toBeInTheDocument()
  })

  it('첫 시나리오의 마지막 단계에서 콘솔 출력이 meta의 expectedOutput과 같다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const last = scenarios[0].steps.length
    await next(user, last - 1)
    expect(screen.getByText(`단계 ${last} / ${last}`)).toBeInTheDocument()
    const consoleRegion = screen.getByRole('region', { name: '콘솔 출력' })
    const expected = concept.examples.find((e) => e.id === scenarios[0].exampleId)!.expectedOutput
    for (const line of expected) {
      expect(within(consoleRegion).getAllByText(line).length).toBeGreaterThan(0)
    }
  })
})
