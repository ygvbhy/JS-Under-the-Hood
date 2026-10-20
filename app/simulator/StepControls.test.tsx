import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StepControls } from './StepControls'
import { useStepper } from './useStepper'

function Harness({ total = 3, autoplay }: { total?: number; autoplay?: boolean }) {
  const stepper = useStepper({ total })
  return <StepControls stepper={stepper} autoplay={autoplay} label="테스트 컨트롤" />
}

describe('StepControls', () => {
  it('첫 단계에서는 처음으로·이전이 비활성화된다', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: '처음으로' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('button', { name: '이전' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: '다음' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByText('단계 1 / 3')).toBeInTheDocument()
  })

  it('마지막 단계에서는 다음이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('button', { name: '다음' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: '이전' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('button', { name: '처음으로' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByText('단계 3 / 3')).toBeInTheDocument()
  })

  it('비활성(aria-disabled) 버튼을 눌러도 단계가 바뀌지 않는다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '이전' }))
    await user.click(screen.getByRole('button', { name: '처음으로' }))
    expect(screen.getByText('단계 1 / 3')).toBeInTheDocument()
  })

  it('다음을 눌러 마지막 단계가 되어도 포커스가 버튼에 남는다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const next = screen.getByRole('button', { name: '다음' })
    next.focus()
    await user.click(next)
    await user.click(next)
    expect(screen.getByText('단계 3 / 3')).toBeInTheDocument()
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(document.activeElement).toBe(next)
  })

  it('처음으로·이전으로 첫 단계에 도달해도 포커스가 버튼에 남는다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    const first = screen.getByRole('button', { name: '처음으로' })
    await user.click(first)
    expect(first).toHaveAttribute('aria-disabled', 'true')
    expect(document.activeElement).toBe(first)

    await user.click(screen.getByRole('button', { name: '다음' }))
    const prev = screen.getByRole('button', { name: '이전' })
    await user.click(prev)
    expect(prev).toHaveAttribute('aria-disabled', 'true')
    expect(document.activeElement).toBe(prev)
  })

  it('다음을 누르면 단계가 진행되고 처음으로를 누르면 되돌아간다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('단계 2 / 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '처음으로' }))
    expect(screen.getByText('단계 1 / 3')).toBeInTheDocument()
  })

  it('autoplay=false면 재생 버튼과 속도 선택이 없다', () => {
    render(<Harness autoplay={false} />)
    expect(screen.queryByRole('button', { name: '자동 재생' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('속도')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument()
  })

  it('재생 버튼의 이름이 자동 재생과 일시정지 사이에서 바뀐다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '자동 재생' }))
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '일시정지' }))
    expect(screen.getByRole('button', { name: '자동 재생' })).toBeInTheDocument()
  })

  it('속도 선택은 0.5×, 1×, 2× 옵션을 제공하고 값을 바꿀 수 있다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const select = screen.getByLabelText('속도')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['0.5×', '1×', '2×'])
    expect(select).toHaveValue('1')
    await user.selectOptions(select, '2')
    expect(select).toHaveValue('2')
  })

  it('모든 버튼은 type="button"이다', () => {
    render(<Harness />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })
})
