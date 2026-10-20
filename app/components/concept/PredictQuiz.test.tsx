import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PredictQuiz } from './PredictQuiz'

const props = {
  question: '무엇이 출력될까요?',
  choices: ['10 20', '20 20', '10 10'],
  answer: 0,
  explanation: '재할당은 다른 변수에 영향을 주지 않는다.',
}

describe('PredictQuiz (하이드레이션 후)', () => {
  it('선택 전에는 정답 확인이 비활성이다', async () => {
    render(<PredictQuiz {...props} />)
    expect(await screen.findByRole('group', { name: /무엇이 출력될까요/ })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('button', { name: '정답 확인' })).toBeDisabled()
    expect(screen.queryByText(props.explanation)).not.toBeInTheDocument()
  })

  it('오답을 고르고 확인하면 오답·정답 표시와 해설이 보인다', async () => {
    const user = userEvent.setup()
    render(<PredictQuiz {...props} />)
    await user.click(await screen.findByRole('radio', { name: /20 20/ }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))

    expect(screen.getByText(/오답입니다/)).toBeInTheDocument()
    expect(screen.getByText('✓ 정답')).toBeInTheDocument()
    expect(screen.getByText('✗ 선택한 답 (오답)')).toBeInTheDocument()
    expect(screen.getByText(props.explanation)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 풀기' })).toBeInTheDocument()
  })

  it('정답을 고르면 정답입니다가 표시된다', async () => {
    const user = userEvent.setup()
    render(<PredictQuiz {...props} />)
    await user.click(await screen.findByRole('radio', { name: /10 20/ }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(screen.getByText('정답입니다.')).toBeInTheDocument()
  })

  it('다시 풀기는 선택과 해설을 초기화한다', async () => {
    const user = userEvent.setup()
    render(<PredictQuiz {...props} />)
    await user.click(await screen.findByRole('radio', { name: /20 20/ }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    await user.click(screen.getByRole('button', { name: '다시 풀기' }))

    expect(screen.queryByText(props.explanation)).not.toBeInTheDocument()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
      expect(radio).toBeEnabled()
    }
    expect(screen.getByRole('button', { name: '정답 확인' })).toBeDisabled()
  })
})

describe('PredictQuiz (프리렌더 마크업)', () => {
  it('질문·선택지 목록과 <details> 정답·해설을 포함하고 라디오는 없다', () => {
    const html = renderToString(<PredictQuiz {...props} />)
    expect(html).toContain('<details')
    expect(html).toContain('정답 보기')
    expect(html).toContain('<ol')
    expect(html).toContain('무엇이 출력될까요?')
    expect(html).toContain('정답: 1번')
    expect(html).toContain(props.explanation)
    expect(html).not.toContain('type="radio"')
  })
})
