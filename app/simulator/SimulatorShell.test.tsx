import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SimulatorShell } from './SimulatorShell'
import type { Scenario } from './types'

type TestState = { n: number }

const scenarios: Scenario<TestState>[] = [
  {
    id: 'a',
    label: '시나리오 A',
    exampleId: 'a',
    code: 'let n = 1\nn = 2',
    steps: [
      { title: 'A 시작', explanation: 'A 설명 0', state: { n: 0 } },
      { title: 'A 둘째', explanation: 'A 설명 1', state: { n: 1 } },
      { title: 'A 셋째', explanation: 'A 설명 2', state: { n: 2 } },
    ],
  },
  {
    id: 'b',
    label: '시나리오 B',
    exampleId: 'b',
    code: 'let n = 10',
    steps: [
      { title: 'B 시작', explanation: 'B 설명 0', state: { n: 10 } },
      { title: 'B 둘째', explanation: 'B 설명 1', state: { n: 11 } },
    ],
  },
]

function renderShell() {
  return render(
    <SimulatorShell
      scenarios={scenarios}
      label="테스트 시뮬레이터"
      renderState={(state, prevState) => (
        <p>
          n={state.n}, prev={prevState?.n ?? '없음'}
        </p>
      )}
    />,
  )
}

describe('SimulatorShell', () => {
  it('label이 영역(region)의 이름이 된다', () => {
    renderShell()
    expect(screen.getByRole('region', { name: '테스트 시뮬레이터' })).toBeInTheDocument()
  })

  it('renderState가 첫 단계에서는 prevState 없이, 다음 단계에서는 이전 단계 state를 받는다', async () => {
    const user = userEvent.setup()
    renderShell()
    expect(screen.getByText('n=0, prev=없음')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('n=1, prev=0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('n=2, prev=1')).toBeInTheDocument()
  })

  it('시나리오를 바꾸면 0단계로 돌아가고 prevState가 다시 없어진다', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('n=1, prev=0')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '시나리오 B' }))
    expect(screen.getByText('n=10, prev=없음')).toBeInTheDocument()
    expect(screen.getByText('단계 1 / 2')).toBeInTheDocument()
  })
})
