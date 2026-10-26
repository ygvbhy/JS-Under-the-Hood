import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '암묵적 타입 변환 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "+ 의 순서" 시나리오의 0단계("실행 전")를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '+ 의 순서' })).toBeChecked()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(/코드를 실행하기 전입니다/)).toBeInTheDocument()
    expect(screen.getByText('아직 계산 중인 연산이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('다음을 누르면 1번 줄이 강조되고 계산 중인 연산이 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText("단계 2: '3' + 4: 피연산자 확인")).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent("const a = '3' + 4 + 5;")
    const region = screen.getByRole('region', { name: '계산 중인 연산' })
    expect(within(region).getByText("'3' + 4")).toBeInTheDocument()
    expect(within(region).getByText('→ "4"').closest('p')).toHaveTextContent(
      '→ "4" (문자열, ToString)',
    )
    expect(within(region).getByText(/한쪽이 문자열이므로 문자열 연결/)).toBeInTheDocument()
    expect(within(region).queryByText(/^결과:/)).not.toBeInTheDocument()
  })

  it('시나리오를 바꾸면 0단계로 돌아가고 코드가 바뀐다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText("단계 3: '3' + 4의 결과")).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '> 비교' }))
    expect(screen.getByRole('radio', { name: '> 비교' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(`단계 1 / ${scenarios[2].steps.length}`)).toBeInTheDocument()
    expect(screen.getByText(/const e = '10' > 9;/)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
    expect(screen.getByText('아직 계산 중인 연산이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
  })

  it('영역에 포커스가 있을 때 ArrowRight/ArrowLeft/Home이 단계를 옮긴다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    screen.getByRole('region', { name: REGION_NAME }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText("단계 2: '3' + 4: 피연산자 확인")).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText("단계 3: '3' + 4의 결과")).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText("단계 2: '3' + 4: 피연산자 확인")).toBeInTheDocument()
    await user.keyboard('{Home}')
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
  })

  it('결과 단계에서 "결과: "34" (문자열)"을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const next = screen.getByRole('button', { name: '다음' })
    await user.click(next)
    await user.click(next)
    const region = screen.getByRole('region', { name: '계산 중인 연산' })
    expect(within(region).getByText('결과:').closest('p')).toHaveTextContent('결과: "34" (문자열)')
  })

  it('+ 의 순서 시나리오 마지막 단계: 변수 a, b는 문자열이고 콘솔은 한 줄이다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const next = screen.getByRole('button', { name: '다음' })
    for (let i = 0; i < scenarios[0].steps.length - 1; i++) await user.click(next)
    expect(screen.getByText('단계 10: 3번 줄 출력')).toBeInTheDocument()
    const vars = screen.getByRole('region', { name: '변수' })
    const items = within(vars).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('"345"')
    expect(items[1]).toHaveTextContent('"75"')
    expect(within(vars).getAllByText('문자열')).toHaveLength(2)
    const consolePanel = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consolePanel).getByText('345 75')).toBeInTheDocument()
    expect(next).toHaveAttribute('aria-disabled', 'true')
  })

  describe('스크린 리더 안내', () => {
    it('처음에는 비어 있고, 다음을 누르면 해당 단계가 안내된다', async () => {
      const user = userEvent.setup()
      render(<Simulator scenarios={scenarios} />)
      const live = screen.getByRole('status')
      expect(live).toHaveAttribute('aria-live', 'polite')
      expect(live).toHaveTextContent('')
      await user.click(screen.getByRole('button', { name: '다음' }))
      expect(live).toHaveTextContent(/^단계 2: '3' \+ 4: 피연산자 확인\. /)
      expect(live.textContent).toContain(scenarios[0].steps[1].explanation)
    })
  })
})
