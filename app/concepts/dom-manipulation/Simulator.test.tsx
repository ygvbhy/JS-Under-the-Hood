import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'DOM 조작 시뮬레이터'

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
    expect(screen.getByRole('region', { name: '문서의 노드 트리' })).toHaveTextContent(
      'li#first "A"',
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
    expect(row).toHaveTextContent("var list = document.getElementById('list');")
  })

  it('첫 시나리오에서 자식을 제거하는 단계에 가면 first가 떨어진 노드 영역에 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const title = 'list.innerHTML += ...: ② 자식을 모두 제거한다'
    const index = scenarios[0].steps.findIndex((s) => s.title === title)
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: ${title}`)).toBeInTheDocument()
    const detached = screen.getByRole('region', { name: '문서에서 떨어진 노드' })
    expect(detached).toHaveTextContent('li#first "A"')
    expect(detached).toHaveTextContent('변수 first')
    expect(within(detached).getByText('문서에서 떨어짐')).toBeInTheDocument()
  })

  it('두 번째 시나리오로 바꾸면 todo와 done 두 목록이 보이고 appendChild 뒤에 a가 done에 있다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    const tree = screen.getByRole('region', { name: '문서의 노드 트리' })
    expect(tree).toHaveTextContent('ul#todo')
    expect(tree).toHaveTextContent('ul#done')
    const index = scenarios[1].steps.findIndex((s) => s.title === 'done.appendChild(a)')
    await next(user, index)
    expect(
      [...tree.querySelectorAll('[data-node-id]')].map((r) => r.getAttribute('data-node-id')),
    ).toEqual(['todo', 'b', 'done', 'a'])
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: scenarios[1].label }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: scenarios[1].label })).toBeChecked()
    expect(screen.getByRole('region', { name: '문서에서 떨어진 노드' })).toBeInTheDocument()
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
