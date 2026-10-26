import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '단축 평가 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "값을 돌려줌" 시나리오의 0단계("실행 전")를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '값을 돌려줌' })).toBeChecked()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(/코드를 실행하기 전입니다/)).toBeInTheDocument()
    expect(screen.getByText('아직 평가 중인 식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('다음을 누르면 1번 줄이 강조되고 평가 중인 식의 조각이 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText("단계 2: 0 || 'hello'의 왼쪽 평가")).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent("const a = 0 || 'hello';")
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    expect(within(region).getByText("0 || 'hello'")).toBeInTheDocument()
    expect(within(region).getByText('평가함')).toBeInTheDocument()
    expect(within(region).getByText('아직 평가 전')).toBeInTheDocument()
    expect(within(region).getByText('판정: falsy')).toBeInTheDocument()
  })

  it('시나리오를 바꾸면 0단계로 돌아가고 코드가 바뀐다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText("단계 3: a에 'hello'를 넣음")).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '오른쪽 건너뛰기' }))
    expect(screen.getByRole('radio', { name: '오른쪽 건너뛰기' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('단계 1 / 10')).toBeInTheDocument()
    expect(screen.getByText(/function check\(label, value\)/)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
  })

  it('영역에 포커스가 있을 때 ArrowRight/ArrowLeft/Home이 단계를 옮긴다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    screen.getByRole('region', { name: REGION_NAME }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText("단계 2: 0 || 'hello'의 왼쪽 평가")).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText("단계 3: a에 'hello'를 넣음")).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText("단계 2: 0 || 'hello'의 왼쪽 평가")).toBeInTheDocument()
    await user.keyboard('{Home}')
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
  })

  it('코드 블록에 포커스가 있으면 방향키를 가로채지 않는다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    screen.getByRole('region', { name: '예제 코드' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
  })

  it('오른쪽 건너뛰기 시나리오: 평가하지 않은 check("B", 1)은 "평가 안 함"이고 콘솔에 "평가: B"가 없다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '오른쪽 건너뛰기' }))
    const next = screen.getByRole('button', { name: '다음' })
    await user.click(next)
    await user.click(next)
    expect(screen.getByText("단계 3: check('B', 1)을 평가하지 않음")).toBeInTheDocument()
    const view = screen.getByRole('region', { name: '평가 중인 식' })
    const skipped = within(view).getByText('평가 안 함').closest('li')!
    expect(within(skipped).getByText("check('B', 1)")).toBeInTheDocument()
    const consolePanel = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consolePanel).getByText('평가: A')).toBeInTheDocument()
    expect(within(consolePanel).queryByText('평가: B')).not.toBeInTheDocument()
  })

  it('오른쪽 건너뛰기 시나리오 마지막 단계는 콘솔에 일곱 줄을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '오른쪽 건너뛰기' }))
    const next = screen.getByRole('button', { name: '다음' })
    for (let i = 0; i < 9; i++) await user.click(next)
    expect(screen.getByText('단계 10: z 출력')).toBeInTheDocument()
    const consolePanel = screen.getByRole('region', { name: '콘솔 출력' })
    const lines = within(consolePanel)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(lines).toEqual(['평가: A', '0', '평가: C', 'ok', '평가: E', '평가: F', '2'])
    expect(next).toHaveAttribute('aria-disabled', 'true')
  })

  it('?. 체인 시나리오: guest 단계에서 체인의 나머지가 "평가 안 함"이고 결과는 undefined다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '?. 체인' }))
    const next = screen.getByRole('button', { name: '다음' })
    for (let i = 0; i < 5; i++) await user.click(next)
    expect(screen.getByText('단계 6: guest?.profile.age의 평가')).toBeInTheDocument()
    const view = screen.getByRole('region', { name: '평가 중인 식' })
    expect(within(view).getAllByText('평가 안 함')).toHaveLength(2)
    expect(within(view).getByText('결과:').closest('p')).toHaveTextContent('결과: undefined')
  })

  describe('스크린 리더 안내', () => {
    it('설명 패널 자체에는 aria-live가 없고, 별도 sr-only status 영역이 polite로 있다', () => {
      render(<Simulator scenarios={scenarios} />)
      const panel = screen.getByText('단계 1: 실행 전').parentElement!
      expect(panel).not.toHaveAttribute('aria-live')
      const live = screen.getByRole('status')
      expect(live).toHaveAttribute('aria-live', 'polite')
      expect(live).toHaveClass('sr-only')
    })

    it('처음에는 비어 있고, 다음을 누르면 해당 단계가 안내된다', async () => {
      const user = userEvent.setup()
      render(<Simulator scenarios={scenarios} />)
      const live = screen.getByRole('status')
      expect(live).toHaveTextContent('')
      await user.click(screen.getByRole('button', { name: '다음' }))
      expect(live).toHaveTextContent(/^단계 2: 0 \|\| 'hello'의 왼쪽 평가\. /)
      expect(live.textContent).toContain(scenarios[0].steps[1].explanation)
    })
  })
})
