import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InheritView } from './InheritView'
import { scenarios } from './scenarios'

function renderStep(id: string, index: number) {
  const state = scenarios.find((s) => s.id === id)!.steps[index].state
  return render(<InheritView state={state} />)
}

const classCard = (name: string) =>
  document.querySelector<HTMLElement>(`[data-class-name="${name}"]`)!
const frameCard = (fn: string) => document.querySelector<HTMLElement>(`[data-frame-fn="${fn}"]`)!
const objCard = (id: string) => document.querySelector<HTMLElement>(`[data-object-id="${id}"]`)!
const lookupArea = () => screen.getByRole('region', { name: '메서드 찾기' })

describe('InheritView', () => {
  it('빈 상태 문구를 보여 주고 메서드 찾기 영역은 없다', () => {
    renderStep('construct-derived', 0)
    expect(screen.getByText('아직 평가된 클래스가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('진행 중인 생성자 호출이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 만들어진 객체가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '메서드 찾기' })).toBeNull()
  })

  it('클래스 카드가 두 체인과 새로 생김 표시를 보여 준다', () => {
    renderStep('construct-derived', 2)
    const animal = classCard('Animal')
    expect(within(animal).getByText('Function.prototype')).toBeInTheDocument()
    expect(within(animal).getByText('Object.prototype')).toBeInTheDocument()
    expect(within(animal).queryByText('새로 생김')).toBeNull()
    const dog = classCard('Dog')
    expect(within(dog).getByText('파생 클래스')).toBeInTheDocument()
    expect(within(dog).getAllByText('Animal')).toHaveLength(2) // extends + 생성자 쪽
    expect(within(dog).getByText('Animal.prototype')).toBeInTheDocument()
    expect(within(dog).getByText('새로 생김')).toBeInTheDocument()
    expect(dog).toHaveAttribute('data-changed', 'true')
  })

  it('생성자를 생략한 클래스에는 기본 생성자 배지를 붙인다', () => {
    renderStep('super-method', 2)
    expect(within(classCard('Dog')).getByText('기본 생성자')).toBeInTheDocument()
    expect(within(classCard('Animal')).queryByText('기본 생성자')).toBeNull()
    expect(within(classCard('Animal')).getByText('speak')).toBeInTheDocument()
  })

  it('파생 생성자 frame의 this는 super 전에는 초기화 전, 뒤에는 객체 A다', () => {
    const { unmount } = renderStep('construct-derived', 4)
    expect(screen.getByText('맨 위가 지금 실행 중')).toBeInTheDocument()
    expect(within(frameCard('Dog')).getByText('초기화 전')).toBeInTheDocument()
    expect(within(frameCard('Dog')).getByText('파생 클래스 생성자')).toBeInTheDocument()
    expect(within(frameCard('Animal')).getByText('기본 클래스 생성자')).toBeInTheDocument()
    expect(within(frameCard('Animal')).getByText('→ 객체 A')).toBeInTheDocument()
    expect(within(objCard('a')).getByText('새로 생김')).toBeInTheDocument()
    expect(within(objCard('a')).getByText('Dog.prototype')).toBeInTheDocument()
    // 맨 위(Animal)가 먼저 나온다
    const frames = document.querySelectorAll('[data-frame-fn]')
    expect(frames[0]).toHaveAttribute('data-frame-fn', 'Animal')
    unmount()
    renderStep('construct-derived', 6)
    expect(within(frameCard('Dog')).queryByText('초기화 전')).toBeNull()
    expect(within(frameCard('Dog')).getByText('→ 객체 A')).toBeInTheDocument()
  })

  it('기본 파생 생성자 frame의 this는 "없음(내장 기본 생성자)"이다', () => {
    renderStep('super-method', 3)
    const dog = frameCard('Dog')
    expect(within(dog).getByText('없음(내장 기본 생성자)')).toBeInTheDocument()
    expect(within(dog).getByText('기본 생성자(내장)')).toBeInTheDocument()
    expect(within(dog).getByText('"Rex"')).toBeInTheDocument()
  })

  it('super.speak() 단계는 시작점·HomeObject 근거·찾은 곳·this를 보여 준다', () => {
    renderStep('super-method', 8)
    const area = lookupArea()
    expect(within(area).getByText('super.speak()')).toBeInTheDocument()
    expect(within(area).getAllByText('Animal.prototype')).toHaveLength(2) // 시작점 + 찾은 곳
    expect(within(area).getByText('HomeObject인 Dog.prototype의 [[Prototype]]')).toBeInTheDocument()
    expect(within(area).getByText('→ 객체 A')).toBeInTheDocument()
  })

  it('this 초기화 전 오류를 ReferenceError 발생과 이유로 보여 준다', () => {
    renderStep('this-before-super', 4)
    const area = lookupArea()
    expect(within(area).getByText('ReferenceError 발생')).toBeInTheDocument()
    expect(within(area).getByText('this 바인딩이 초기화 전입니다')).toBeInTheDocument()
    expect(within(frameCard('Dog')).getByText('초기화 전')).toBeInTheDocument()
  })

  it('필드 label은 Base 본문 단계에는 없고 필드 초기화 뒤에 추가된다', () => {
    const keyRow = (key: string) => objCard('a').querySelector(`[data-prop-key="${key}"]`)
    const { unmount } = renderStep('field-order', 5) // this.label 읽기
    expect(keyRow('label')).toBeNull()
    expect(within(lookupArea()).getByText('this.describe()')).toBeInTheDocument()
    unmount()
    renderStep('field-order', 9) // label 필드 초기화
    expect(keyRow('label')).not.toBeNull()
    expect(keyRow('label')).toHaveAttribute('data-changed', 'true')
    expect(within(keyRow('label') as HTMLElement).getByText('"derived"')).toBeInTheDocument()
  })

  it('변수는 새로 생김 표시와 객체 참조를 보여 준다', () => {
    renderStep('construct-derived', 8)
    const binding = screen.getByText('pet').closest('li')!
    expect(binding).toHaveAttribute('data-changed', 'true')
    expect(within(binding).getByText('→ 객체 A')).toBeInTheDocument()
    expect(within(binding).getByText('새로 생김')).toBeInTheDocument()
  })
})
