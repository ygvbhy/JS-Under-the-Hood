import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NewView } from './NewView'
import { scenarios } from './scenarios'

function renderStep(id: string, index: number) {
  const state = scenarios.find((s) => s.id === id)!.steps[index].state
  return render(<NewView state={state} />)
}

const card = (id: string) => document.querySelector<HTMLElement>(`[data-object-id="${id}"]`)!
const callArea = () => screen.getByRole('region', { name: '호출 영역' })
const stageItems = () => within(document.querySelector('ol')!).getAllByRole('listitem')

describe('NewView', () => {
  it('빈 상태 문구를 보여 주고 단계 목록은 없다', () => {
    renderStep('basic', 0)
    expect(screen.getByText('진행 중인 호출이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('실행 중인 함수 호출이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 객체가 없습니다.')).toBeInTheDocument()
    expect(document.querySelector('ol')).toBeNull()
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
  })

  it('new 호출은 5단계 목록에서 현재(aria-current)와 완료를 글자로 표시한다', () => {
    renderStep('basic', 3) // 'this 연결' 단계
    const items = stageItems()
    expect(items).toHaveLength(5)
    expect(items[1]).toHaveTextContent('새 객체 생성')
    expect(items[0]).toHaveTextContent('완료')
    expect(items[1]).toHaveTextContent('완료')
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[2]).toHaveTextContent('this 연결')
    expect(items[2]).toHaveTextContent('현재')
    expect(items[3]).not.toHaveAttribute('aria-current')
    expect(items[3]).not.toHaveTextContent('현재')
    expect(items[3]).not.toHaveTextContent('완료')
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
  })

  it('new 없는 호출은 "새 객체 생성" 없이 4단계 목록을 보인다', () => {
    renderStep('without-new-sloppy', 2) // this 결정 단계
    const items = stageItems()
    expect(items).toHaveLength(4)
    expect(screen.queryByText('새 객체 생성')).toBeNull()
    expect(items[0]).toHaveTextContent('인수 평가')
    expect(items[1]).toHaveTextContent('this 결정')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
  })

  it('this가 정해지기 전과 객체·전역 객체로 정해진 뒤를 구분해 보여 준다', () => {
    const { unmount } = renderStep('basic', 1)
    expect(within(callArea()).getByText('아직 정해지지 않음')).toBeInTheDocument()
    unmount()
    const { unmount: unmount2 } = renderStep('basic', 3)
    expect(within(callArea()).getByText('→ 객체 A')).toBeInTheDocument()
    expect(within(card('a')).getByText('this')).toBeInTheDocument()
    unmount2()
    renderStep('without-new-sloppy', 2)
    expect(within(callArea()).getByText('→ 전역 객체')).toBeInTheDocument()
    expect(within(card('global')).getAllByText('전역 객체')).toHaveLength(2) // 라벨 + 역할 배지
  })

  it('new로 만든 객체는 "새로 만듦" 표시와 강조를 갖는다', () => {
    renderStep('basic', 2)
    expect(within(card('a')).getByText('새로 만듦')).toBeInTheDocument()
    expect(card('a')).toHaveAttribute('data-changed', 'true')
    expect(within(card('a')).getByText('프로퍼티 없음')).toBeInTheDocument()
  })

  it('역할 배지: result는 "new 식의 결과", unused는 "결과로 쓰이지 않음"', () => {
    const { unmount } = renderStep('return-object', 6)
    expect(within(card('a')).getByText('결과로 쓰이지 않음')).toBeInTheDocument()
    expect(within(card('b')).getByText('new 식의 결과')).toBeInTheDocument()
    unmount()
    renderStep('basic', 6)
    expect(within(card('a')).getByText('new 식의 결과')).toBeInTheDocument()
  })

  it('return 값과 결과를 보여 준다', () => {
    const { unmount } = renderStep('return-object', 5)
    expect(within(callArea()).getByText('return 값')).toBeInTheDocument()
    expect(within(callArea()).getByText('→ 객체 B')).toBeInTheDocument()
    unmount()
    const { unmount: unmount2 } = renderStep('return-primitive', 6)
    expect(within(callArea()).getByText('100')).toBeInTheDocument()
    expect(within(callArea()).getAllByText('→ 객체 A')).toHaveLength(2) // this + 결과
    expect(within(callArea()).getByText('new 식의 결과')).toBeInTheDocument()
    unmount2()
    renderStep('without-new-sloppy', 4)
    expect(within(callArea()).getByText('본문 끝까지 실행')).toBeInTheDocument()
    expect(within(callArea()).getByText('호출의 결과')).toBeInTheDocument()
    expect(within(callArea()).getAllByText('undefined').length).toBeGreaterThanOrEqual(2)
  })

  it('바뀐 프로퍼티와 변수에 data-changed를 붙인다', () => {
    const { unmount } = renderStep('basic', 4)
    const row = card('a').querySelector<HTMLElement>('[data-prop-key="title"]')!
    expect(row).toHaveAttribute('data-changed', 'true')
    expect(within(row).getByText('"JS"')).toBeInTheDocument()
    unmount()
    renderStep('basic', 7)
    const binding = screen.getByText('a').closest('li')!
    expect(binding).toHaveAttribute('data-changed', 'true')
    expect(within(binding).getByText('→ 객체 A')).toBeInTheDocument()
    const unchanged = card('a').querySelector<HTMLElement>('[data-prop-key="title"]')!
    expect(unchanged).not.toHaveAttribute('data-changed')
  })
})
