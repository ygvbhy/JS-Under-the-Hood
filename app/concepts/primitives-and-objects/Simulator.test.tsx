import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

function highlightedLine(): string | undefined {
  const row = document.querySelector('[aria-current="step"]')
  return row?.textContent ?? undefined
}

describe('Simulator', () => {
  it('처음에는 재할당 시나리오의 0단계("실행 전")를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: '원시 값과 객체 시뮬레이터' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '재할당' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(/코드를 실행하기 전입니다/)).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('다음을 누르면 강조 줄이 1번 줄로 옮겨 간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('단계 2: a에 10을 넣음')).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent('1let a = 10;')
    // 메모리 시각화: 변수 a = 10
    const binding = screen.getByText('a', { selector: 'span.font-mono' }).closest('li')!
    expect(within(binding).getByText('10')).toBeInTheDocument()
    expect(within(binding).getByText('새로 생김')).toBeInTheDocument()
  })

  it('시나리오를 바꾸면 0단계로 돌아가고 코드가 바뀐다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('단계 3: b에 a의 값을 넣음')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '변경' }))
    expect(screen.getByRole('radio', { name: '변경' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('단계 1 / 5')).toBeInTheDocument()
    expect(screen.getByText(/const q = p;/)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('영역에 포커스가 있을 때 ArrowRight/ArrowLeft/Home이 단계를 옮긴다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    screen.getByRole('region', { name: '원시 값과 객체 시뮬레이터' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('단계 2: a에 10을 넣음')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('단계 3: b에 a의 값을 넣음')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('단계 2: a에 10을 넣음')).toBeInTheDocument()
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

  it('라디오에 포커스가 있을 때 방향키는 라디오 선택 이동에 쓰이고 단계는 그대로다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    screen.getByRole('radio', { name: '재할당' }).focus()
    await user.keyboard('{ArrowRight}')
    // 라디오 이동 → 시나리오 전환으로 0단계로 돌아가지만, 단계 이동 키로 처리되어 +1이 되지는 않는다
    expect(screen.getByRole('radio', { name: '변경' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
  })

  it('변경 시나리오 마지막 단계는 콘솔에 "2 true"를 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '변경' }))
    const next = screen.getByRole('button', { name: '다음' })
    for (let i = 0; i < 4; i++) await user.click(next)
    expect(screen.getByText('단계 5: 출력')).toBeInTheDocument()
    const consolePanel = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consolePanel).getByText('2 true')).toBeInTheDocument()
    expect(highlightedLine()).toContain('console.log(p.n, p === q);')
    expect(next).toBeDisabled()
  })

  it('함수에 전달 시나리오: 호출 종료 단계에서 호출 영역이 사라지고 객체 B가 흐려진다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('radio', { name: '함수에 전달' }))
    const next = screen.getByRole('button', { name: '다음' })
    for (let i = 0; i < 3; i++) await user.click(next)
    expect(screen.getByText('change(o, x) 호출')).toBeInTheDocument()
    for (let i = 0; i < 4; i++) await user.click(next)
    expect(screen.getByText('단계 8: 호출 종료')).toBeInTheDocument()
    expect(screen.queryByText('change(o, x) 호출')).not.toBeInTheDocument()
    expect(screen.getByText('더 이상 참조되지 않음')).toBeInTheDocument()
  })

  it('자동 재생 중에는 설명 영역의 aria-live가 꺼진다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const explanation = screen.getByText('단계 1: 실행 전').parentElement!
    expect(explanation).toHaveAttribute('aria-live', 'polite')
    await user.click(screen.getByRole('button', { name: '자동 재생' }))
    expect(explanation).toHaveAttribute('aria-live', 'off')
  })
})
