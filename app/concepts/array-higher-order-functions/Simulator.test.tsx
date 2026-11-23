import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '배열 고차 함수 시뮬레이터'

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
    expect(screen.getByText('이 단계에서 진행 중인 콜백 메서드 없음')).toBeInTheDocument()
  })

  it('1단계는 line이 없고 output이 빈 배열이다', () => {
    for (const s of scenarios) {
      expect(s.steps[0].title).toBe('실행 전')
      expect(s.steps[0].line).toBeUndefined()
      expect(s.steps[0].output).toEqual([])
    }
  })

  it('시나리오 라디오가 3개 모두 있고 단계 수가 정해져 있다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(scenarios.map((s) => [s.label, s.steps.length])).toEqual([
      ['push한 요소는 방문하지 않는다', 10],
      ['pop·shift 뒤의 인덱스', 21],
      ['find는 프로퍼티가 없는 인덱스도 읽는다', 23],
    ])
    for (const s of scenarios) {
      expect(screen.getByRole('radio', { name: s.label })).toBeInTheDocument()
    }
  })

  it('콜백에서 push한 뒤에도 고정한 길이는 그대로이고 지금 length만 늘어난다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const title = '인덱스 0: 콜백 실행'
    const index = scenarios[0].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    expect(row('fixed-length')).toHaveTextContent('2')
    expect(row('current-length')).toHaveTextContent('3')
  })

  it('이전 버튼으로 돌아가면 이전 단계 상태가 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 5)
    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByText(`단계 5: ${scenarios[0].steps[4].title}`)).toBeInTheDocument()
    expect(row('current-length')).toHaveTextContent('2')
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: scenarios[2].label }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[2].label })).toBeChecked()
  })

  it('두 번째 시나리오에서 프로퍼티가 없는 인덱스는 콜백을 부르지 않는다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    const title = 'a 인덱스 2: 프로퍼티가 없어 콜백을 부르지 않는다'
    const index = scenarios[1].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(row('check')).toHaveTextContent('HasProperty → false → 콜백 안 부름')
  })

  it('세 번째 시나리오에서 find의 반환 판정과 확인하지 않는 Get이 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[2].label }))
    const title = 'a 인덱스 1: 콜백 실행'
    const index = scenarios[2].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(row('check')).toHaveTextContent('find는 확인하지 않고 Get')
    expect(row('returned')).toHaveTextContent('undefined → false → 계속')
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
