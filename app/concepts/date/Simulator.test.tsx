import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'Date 필드 계산 시뮬레이터'

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
    expect(screen.getByText('아직 Date를 가리키는 변수가 없습니다.')).toBeInTheDocument()
  })

  it('시나리오 라디오가 2개 모두 있다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(scenarios).toHaveLength(2)
    for (const s of scenarios) {
      expect(screen.getByRole('radio', { name: s.label })).toBeInTheDocument()
    }
  })

  it('첫 시나리오의 MakeDay 단계에서 2월 1일에 30일을 더해 3월 3일이 된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const title = 'MakeDay(2026, 1, 31)'
    const index = scenarios[0].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    const area = screen.getByRole('region', { name: 'MakeDay 계산' })
    expect(area).toHaveTextContent('연 2026, 월 1 (2월), 일 1')
    expect(area).toHaveTextContent('+30일')
    expect(area).toHaveTextContent('연 2026, 월 2 (3월), 일 3')
  })

  it('"[[DateValue]] 저장" 단계에서 변수 d가 바뀜으로 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const index = scenarios[0].steps.findIndex((s) => s.title === '[[DateValue]] 저장')
    await next(user, index)
    const row = document.querySelector<HTMLElement>('[data-date-name="d"]')!
    expect(row).toHaveTextContent('연 2026, 월 2 (3월), 일 3')
    expect(row).toHaveTextContent('바뀜')
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[1].label })).toBeChecked()
  })

  it.each([0, 1])(
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
