import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '객체를 원시 값으로 시뮬레이터'

async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

const row = (name: string) => document.querySelector<HTMLElement>(`[data-row="${name}"]`)!

describe('Simulator', () => {
  it('처음에는 첫 시나리오의 1단계(실행 전)를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[0].label })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 진행 중인 ToPrimitive 없음')).toBeInTheDocument()
  })

  it('시나리오 라디오가 3개 모두 있고 단계 수가 정해져 있다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(scenarios.map((s) => [s.label, s.steps.length])).toEqual([
      ['힌트에 따라 순서가 바뀐다', 15],
      ['객체를 돌려주면 다음 메서드', 24],
      ['둘 다 실패하면 TypeError', 17],
    ])
    for (const s of scenarios) {
      expect(screen.getByRole('radio', { name: s.label })).toBeInTheDocument()
    }
  })

  it('valueOf 호출 단계에서 toString이 "부르지 않음"이고 숫자 1이 타입과 함께 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const title = "o + '': o.valueOf 호출"
    const index = scenarios[0].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    expect(row('attempt-valueOf')).toHaveTextContent('원시 값 → 사용')
    expect(row('attempt-toString')).toHaveTextContent('부르지 않음')
    expect(row('outcome')).toHaveTextContent('원시 값 1 (타입 number)')
  })

  it('이전 버튼으로 돌아가면 이전 단계 상태가 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 5)
    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByText(`단계 5: ${scenarios[0].steps[4].title}`)).toBeInTheDocument()
    expect(row('ordinary')).toHaveTextContent('OrdinaryToPrimitive에 number')
    expect(row('attempt-valueOf')).toHaveTextContent('호출 전')
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: scenarios[2].label }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[2].label })).toBeChecked()
  })

  it('세 번째 시나리오의 마지막 호출 실패 단계에서 TypeError가 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[2].label }))
    const title = "stubborn + '': TypeError"
    const index = scenarios[2].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(row('outcome')).toHaveTextContent('TypeError 발생')
    expect(row('attempt-valueOf')).toHaveTextContent('객체를 돌려줌 → 다음으로')
    expect(row('attempt-toString')).toHaveTextContent('객체를 돌려줌 → 더 시도할 메서드 없음')
  })

  it.each([0, 1, 2])(
    '시나리오 %i의 마지막 단계에서 콘솔 출력이 meta의 expectedOutput과 같다',
    async (n) => {
      const user = userEvent.setup()
      render(<Simulator scenarios={scenarios} />)
      if (n > 0) await user.click(screen.getByRole('radio', { name: scenarios[n].label }))
      const last = scenarios[n].steps.length
      await next(user, last - 1)
      expect(screen.getByText(`단계 ${last} / ${last}`)).toBeInTheDocument()
      const consoleRegion = screen.getByRole('region', { name: '콘솔 출력' })
      const expected = concept.examples.find((e) => e.id === scenarios[n].exampleId)!.expectedOutput
      for (const line of expected) {
        expect(within(consoleRegion).getAllByText(line).length).toBeGreaterThan(0)
      }
    },
  )
})
