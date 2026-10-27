import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '동등 비교 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "숫자와 문자열" 시나리오의 0단계("실행 전")를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '숫자와 문자열' })).toBeChecked()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(/코드를 실행하기 전입니다/)).toBeInTheDocument()
    expect(screen.getByText('아직 비교 중인 식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('다음을 누르면 1번 줄이 강조되고 라운드 1이 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText("단계 2: 0 == '': 라운드 1")).toBeInTheDocument()
    const row = document.querySelector('[aria-current="step"]')!
    expect(row).toHaveTextContent("const a = 0 == '';")
    const region = screen.getByRole('region', { name: '비교 중인 식' })
    expect(within(region).getByText('라운드 1')).toBeInTheDocument()
    expect(within(region).getByText(/^→ 오른쪽 값을 숫자로/)).toHaveTextContent('"" → 0 (ToNumber)')
    expect(within(region).queryByText(/결과:/)).not.toBeInTheDocument()
  })

  it('시나리오를 바꾸면 0단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText("단계 3: 0 == '': 라운드 2")).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '불리언과 비교' }))
    expect(screen.getByRole('radio', { name: '불리언과 비교' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(`단계 1 / ${scenarios[1].steps.length}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
    expect(screen.getByText('아직 비교 중인 식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('(아직 출력 없음)')).toBeInTheDocument()
  })
})
