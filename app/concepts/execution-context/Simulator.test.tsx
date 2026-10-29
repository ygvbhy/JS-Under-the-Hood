import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '실행 컨텍스트 시뮬레이터'

async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
  for (let i = 0; i < times; i++) {
    await user.click(screen.getByRole('button', { name: '다음' }))
  }
}

describe('Simulator', () => {
  it('처음에는 "호출 스택" 시나리오의 1단계(실행 전)를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '호출 스택' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('실행 컨텍스트 없음 (실행 전)')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 찾는 이름 없음')).toBeInTheDocument()
  })

  it('lookup 시나리오의 "label 이름 찾기" 단계에서 경로와 찾은 곳, 결과를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '이름 찾기와 정의한 곳' }))
    const lookup = scenarios.find((s) => s.id === 'lookup')!
    const index = lookup.steps.findIndex((s) => s.title === 'label 이름 찾기')
    await next(user, index)
    expect(screen.getByText(`단계 ${index + 1}: label 이름 찾기`)).toBeInTheDocument()
    const area = within(screen.getByRole('region', { name: '찾기' }))
    const path = area.getAllByRole('listitem')
    expect(path).toHaveLength(3)
    expect(path[2]).toHaveTextContent('전역 환경 레코드')
    expect(path[2]).toHaveTextContent('찾음')
    expect(path[2]).toHaveTextContent('선언적 칸')
    expect(screen.getByRole('region', { name: '찾기' })).toHaveTextContent("결과: 'global'")
    expect(screen.getByRole('region', { name: '찾기' })).not.toHaveTextContent(
      'run 선언적 환경 레코드',
    )
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await next(user, 3)
    await user.click(screen.getByRole('radio', { name: '블록의 환경 교체와 복원' }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '블록의 환경 교체와 복원' })).toBeChecked()
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
