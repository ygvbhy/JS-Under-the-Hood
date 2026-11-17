import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'classList와 style 시뮬레이터'

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
    expect(screen.getByRole('region', { name: '요소의 어트리뷰트' })).toHaveTextContent(
      'style = "font-size:20px"',
    )
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('시나리오 라디오가 2개 모두 있다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(scenarios).toHaveLength(2)
    for (const s of scenarios) {
      expect(screen.getByRole('radio', { name: s.label })).toBeInTheDocument()
    }
  })

  it('다음을 누르면 9번 줄이 강조된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent("const box = document.getElementById('box');")
  })

  it('첫 시나리오에서 style.color를 대입하면 어트리뷰트가 직렬화된 문자열로 바뀜으로 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const title = "box.style.color = 'blue'"
    const index = scenarios[0].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    const attrs = screen.getByRole('region', { name: '요소의 어트리뷰트' })
    expect(attrs).toHaveTextContent('style = "font-size: 20px; color: blue;"')
    expect(within(attrs).getByText('바뀜')).toBeInTheDocument()
  })

  it('두 번째 시나리오에서 이미 있는 토큰을 add하면 어트리뷰트의 중복이 정리된다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    expect(screen.getByRole('region', { name: '요소의 어트리뷰트' })).toHaveTextContent(
      'class = "a b a"',
    )
    const index = scenarios[1].steps.findIndex((s) => s.title === "list.add('a')")
    await next(user, index)
    expect(screen.getByRole('region', { name: '요소의 어트리뷰트' })).toHaveTextContent(
      'class = "a b"',
    )
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[1].label })).toBeChecked()
    expect(screen.getByRole('region', { name: /classList의 토큰 집합/ })).toBeInTheDocument()
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
