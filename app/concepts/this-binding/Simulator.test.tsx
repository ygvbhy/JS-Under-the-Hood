import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'this 결정 시뮬레이터'

async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

describe('Simulator', () => {
  it('처음에는 "메서드를 꺼내 호출하면" 시나리오의 1단계(실행 전)를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '메서드를 꺼내 호출하면' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('진행 중인 호출 없음')).toBeInTheDocument()
    expect(screen.getByText('아직 결정한 호출 없음')).toBeInTheDocument()
  })

  it('extract 시나리오의 whoAmI() 단계에서 전역 객체, undefined thisArg, sloppy 규칙을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const index = scenarios[0].steps.findIndex((s) => s.title.startsWith('whoAmI():'))
    await next(user, index)
    expect(
      screen.getByText(`단계 ${index + 1}: ${scenarios[0].steps[index].title}`),
    ).toBeInTheDocument()
    const items = within(screen.getByRole('region', { name: 'this 결정' })).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[1]).toHaveTextContent('thisArg undefined')
    expect(items[2]).toHaveTextContent('sloppy 함수: undefined인 thisArg는 전역 객체로 바꿔 받음')
    expect(items[3]).toHaveTextContent('전역 객체')
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: '괄호와 쉼표' }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '괄호와 쉼표' })).toBeChecked()
    expect(screen.getByText('진행 중인 호출 없음')).toBeInTheDocument()
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
