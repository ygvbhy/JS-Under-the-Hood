import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = 'TDZ 시뮬레이터'

describe('Simulator', () => {
  it('처음에는 "선언 전에 읽기" 시나리오의 1단계("실행 전")를 보여 준다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '선언 전에 읽기' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText('아직 코드를 실행하지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('오류 단계로 가면 이름 찾기 영역에 ReferenceError 문구가 보인다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('단계 3: 2번 줄: score 읽기')).toBeInTheDocument()
    const lookup = screen.getByRole('region', { name: '이름 찾기' })
    expect(
      within(lookup).getByText('전역 스코프에서 찾음 — 초기화 전이라 ReferenceError'),
    ).toBeInTheDocument()
  })

  it('시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('radio', { name: '안쪽 블록의 가림' }))
    expect(screen.getByRole('radio', { name: '안쪽 블록의 가림' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    expect(screen.getByText(`단계 1 / ${scenarios[1].steps.length}`)).toBeInTheDocument()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
    expect(screen.getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
  })

  it('마지막 단계에서 콘솔 출력 두 줄을 보여 준다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    const last = scenarios[0].steps.length
    for (let i = 1; i < last; i++) {
      await user.click(screen.getByRole('button', { name: '다음' }))
    }
    expect(screen.getByText(`단계 ${last} / ${last}`)).toBeInTheDocument()
    const consoleRegion = screen.getByRole('region', { name: '콘솔 출력' })
    expect(within(consoleRegion).getByText('ReferenceError')).toBeInTheDocument()
    expect(within(consoleRegion).getByText('10')).toBeInTheDocument()
  })
})
