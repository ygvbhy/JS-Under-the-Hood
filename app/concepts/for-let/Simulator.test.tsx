import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'for 문의 let 시뮬레이터'

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

  it('시나리오 라디오가 3개 모두 있다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(scenarios).toHaveLength(3)
    for (const s of scenarios) {
      expect(screen.getByRole('radio', { name: s.label })).toBeInTheDocument()
    }
  })

  it('let 시나리오의 첫 "새 반복 레코드" 단계에서 "남아 있음"과 2번째 반복 레코드를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    const title = '새 반복 레코드'
    const index = scenarios[1].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    expect(screen.getAllByText('남아 있음').length).toBeGreaterThan(0)
    const region = screen.getByRole('region', { name: '실행 컨텍스트' })
    expect(region).toHaveTextContent('LexicalEnvironment: 2번째 반복 레코드')
  })

  it('let 시나리오의 본문 블록 레코드는 "바인딩 없음"을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    const index = scenarios[1].steps.findIndex((s) => s.title === '본문 실행: fns[0]에 함수')
    await next(user, index)
    expect(screen.getByText('바인딩 없음')).toBeInTheDocument()
  })

  it('let 시나리오의 호출 단계에서 함수의 [[Environment]]부터 찾는다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    const index = scenarios[1].steps.findIndex((s) => s.title === 'fns[0]() 호출')
    await next(user, index)
    expect(screen.getByRole('region', { name: '찾기' })).toHaveTextContent(
      '익명 함수(fns[0])의 [[Environment]]부터',
    )
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
