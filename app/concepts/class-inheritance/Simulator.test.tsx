import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Simulator } from './Simulator'
import { scenarios } from './scenarios'

const REGION_NAME = '클래스 상속 시뮬레이터'

describe('Simulator', () => {
  it('시나리오 라디오 4개를 보여 주고 처음에는 1단계다', () => {
    render(<Simulator scenarios={scenarios} />)
    expect(screen.getByRole('region', { name: REGION_NAME })).toBeInTheDocument()
    for (const name of [
      '파생 클래스 객체 만들기',
      'super() 전에 this',
      'super.method() 호출',
      '필드 초기화 순서',
    ]) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: '파생 클래스 객체 만들기' })).toBeChecked()
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
  })

  it('다음·이전으로 단계를 이동하고 시나리오를 바꾸면 1단계로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Simulator scenarios={scenarios} />)
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('단계 2: class Animal 평가')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('radio', { name: 'super() 전에 this' }))
    expect(screen.getByText('단계 1: 실행 전')).toBeInTheDocument()
  })
})
