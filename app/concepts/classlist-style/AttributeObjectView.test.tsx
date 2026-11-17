import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttributeObjectView } from './AttributeObjectView'
import { scenarios } from './scenarios'

function stepIndex(id: string, title: string): number {
  const index = scenarios.find((s) => s.id === id)!.steps.findIndex((s) => s.title === title)
  if (index < 0) throw new Error(`단계 없음: ${id} / ${title}`)
  return index
}

function renderStep(id: string, title: string) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  const index = stepIndex(id, title)
  return render(
    <AttributeObjectView
      state={steps[index].state}
      prevState={index > 0 ? steps[index - 1].state : undefined}
    />,
  )
}

const attrsArea = () => screen.getByRole('region', { name: '요소의 어트리뷰트' })

describe('AttributeObjectView', () => {
  it('실행 전에는 style 어트리뷰트와 선언 목록을 보여 주고 바뀜 표시가 없다', () => {
    renderStep('style-attribute', '실행 전')
    expect(attrsArea()).toHaveTextContent('style = "font-size:20px"')
    expect(attrsArea()).not.toHaveTextContent('class')
    const area = screen.getByRole('region', { name: /style의 선언/ })
    expect(area.querySelector('[data-declaration="font-size"]')).toHaveTextContent(': 20px')
    expect(screen.queryByRole('region', { name: /classList의 토큰 집합/ })).not.toBeInTheDocument()
    expect(screen.queryByText('바뀜')).not.toBeInTheDocument()
  })

  it('선언을 더한 단계에서는 어트리뷰트 칸과 새 선언이 "바뀜"으로 보인다', () => {
    renderStep('style-attribute', "box.style.color = 'blue'")
    expect(attrsArea()).toHaveTextContent('style = "font-size: 20px; color: blue;"')
    expect(document.querySelector('[data-attr-name="style"]')).toHaveAttribute(
      'data-changed',
      'true',
    )
    expect(document.querySelector('[data-declaration="color"]')).toHaveAttribute(
      'data-changed',
      'true',
    )
    expect(document.querySelector('[data-declaration="font-size"]')).not.toHaveAttribute(
      'data-changed',
    )
  })

  it('setAttribute 뒤에는 선언이 새 어트리뷰트 값으로 바뀐다', () => {
    renderStep('style-attribute', "box.setAttribute('style', 'margin-top: 4px')")
    expect(document.querySelector('[data-declaration="margin-top"]')).toHaveTextContent(': 4px')
    expect(document.querySelector('[data-declaration="color"]')).toBeNull()
    expect(document.querySelectorAll('[data-declaration]')).toHaveLength(1)
  })

  it('removeAttribute 뒤에는 어트리뷰트가 "없음"이고 선언이 없다고 보여 준다', () => {
    renderStep('style-attribute', "box.removeAttribute('style')")
    expect(attrsArea()).toHaveTextContent('style = 없음')
    expect(screen.getByText('선언 없음')).toBeInTheDocument()
  })

  it('classList 시나리오의 실행 전에는 class 어트리뷰트 원문과 중복이 빠진 토큰 집합을 보여 준다', () => {
    renderStep('token-set', '실행 전')
    expect(attrsArea()).toHaveTextContent('class = "a b a"')
    expect(attrsArea()).not.toHaveTextContent('style')
    const area = screen.getByRole('region', { name: /classList의 토큰 집합/ })
    expect(area.querySelectorAll('[data-token]')).toHaveLength(2)
    expect(within(area).getByText('a')).toBeInTheDocument()
    expect(within(area).getByText('b')).toBeInTheDocument()
  })

  it('이미 있는 토큰을 add하면 어트리뷰트만 "바뀜"이고 토큰 집합은 바뀌지 않는다', () => {
    renderStep('token-set', "list.add('a')")
    expect(attrsArea()).toHaveTextContent('class = "a b"')
    expect(screen.getAllByText('바뀜')).toHaveLength(1)
    expect(document.querySelector('[data-attr-name="class"]')).toHaveAttribute(
      'data-changed',
      'true',
    )
    expect(document.querySelectorAll('[data-token][data-changed]')).toHaveLength(0)
  })

  it('토큰을 뺀 단계에서는 집합 제목에 "바뀜"이 보인다', () => {
    renderStep('token-set', "list.toggle('b')를 출력")
    const area = screen.getByRole('region', { name: /classList의 토큰 집합/ })
    expect(within(area).getByText('바뀜')).toBeInTheDocument()
    expect(area.querySelectorAll('[data-token]')).toHaveLength(1)
  })

  it('예외가 난 단계에서는 아무것도 바뀌지 않는다', () => {
    renderStep('token-set', "list.add('c', 'd e')가 예외를 던짐")
    expect(screen.queryByText('바뀜')).not.toBeInTheDocument()
    expect(attrsArea()).toHaveTextContent('class = "a b"')
  })

  it('모든 토큰을 빼면 class 어트리뷰트는 빈 문자열로 남고 집합은 비어 있다', () => {
    renderStep('token-set', "list.remove('a', 'b')")
    expect(attrsArea()).toHaveTextContent('class = ""')
    expect(attrsArea()).not.toHaveTextContent('없음')
    expect(screen.getByText('토큰 없음(빈 집합)')).toBeInTheDocument()
  })
})
