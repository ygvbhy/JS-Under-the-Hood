import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PropertyView } from './PropertyView'
import { scenarios } from './scenarios'
import type { PropertyState } from './scenarios'

function stepOf(id: string, index: number) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  return { state: steps[index].state, prevState: index > 0 ? steps[index - 1].state : undefined }
}

function renderStep(id: string, index: number) {
  const { state, prevState } = stepOf(id, index)
  return render(<PropertyView state={state} prevState={prevState} />)
}

const card = () => document.querySelector<HTMLElement>('[data-object-id="A"]')!

describe('PropertyView', () => {
  it('빈 상태 문구 2개와 "아직 이 코드가 만든 객체가 없습니다."를 보여 준다', () => {
    renderStep('same-key', 0)
    expect(screen.getByText('이 단계에는 프로퍼티 접근이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 이 코드가 만든 객체가 없습니다.')).toBeInTheDocument()
  })

  it('빈 객체는 "프로퍼티 없음"과 "새로 생김", 변수는 "→ 객체 A" 칩을 보여 준다', () => {
    renderStep('same-key', 1)
    expect(within(card()).getByText('프로퍼티 없음')).toBeInTheDocument()
    expect(within(card()).getByText('새로 생김')).toBeInTheDocument()
    const row = screen.getByText('scores').closest('li')!
    expect(within(row).getByText('const')).toBeInTheDocument()
    expect(within(row).getByText('→ 객체 A')).toBeInTheDocument()
    expect(within(row).getByText('새로 생김')).toBeInTheDocument()
  })

  it('same-key 3단계: 숫자 1이 문자열 키 "1"이 되어 추가된다', () => {
    renderStep('same-key', 2)
    const access = screen.getByRole('region', { name: '프로퍼티 접근' })
    expect(within(access).getByText('scores[1]')).toBeInTheDocument()
    expect(within(access).getByText('대괄호 표기')).toBeInTheDocument()
    expect(within(access).getByText('대괄호 안의 값')).toBeInTheDocument()
    expect(within(access).getByText('1')).toBeInTheDocument()
    expect(within(access).getByText('숫자')).toBeInTheDocument()
    expect(within(access).getByText('프로퍼티 키')).toBeInTheDocument()
    expect(within(access).getByText('"1"')).toBeInTheDocument()
    expect(within(access).getByText('문자열')).toBeInTheDocument()
    expect(within(access).getByText('추가')).toBeInTheDocument()
    const row = within(card()).getByText('"1":').closest('li')!
    expect(within(row).getByText('"금"')).toBeInTheDocument()
    expect(within(row).getByText('새로 생김')).toBeInTheDocument()
  })

  it('dot-vs-bracket 7단계: 점 표기로 키 "key"를 읽고 그 행에 "읽음"이 붙는다', () => {
    renderStep('dot-vs-bracket', 6)
    const access = screen.getByRole('region', { name: '프로퍼티 접근' })
    expect(within(access).getByText('점 표기')).toBeInTheDocument()
    expect(within(access).getByText('점 뒤의 이름')).toBeInTheDocument()
    expect(within(access).getByText('"key"')).toBeInTheDocument()
    expect(within(access).getByText('읽음')).toBeInTheDocument()
    const row = within(card()).getByText('"key":').closest('li')!
    expect(within(row).getByText('읽음')).toBeInTheDocument()
    expect(within(card()).getAllByText('읽음')).toHaveLength(1)
  })

  it('add-delete 7단계: "삭제" 배지가 보이고 카드에는 "a" 키가 없다', () => {
    renderStep('add-delete', 6)
    const access = screen.getByRole('region', { name: '프로퍼티 접근' })
    expect(within(access).getByText('삭제')).toBeInTheDocument()
    expect(within(card()).queryByText('"a":')).toBeNull()
    expect(within(card()).getByText('"b":')).toBeInTheDocument()
  })

  it('값이 바뀐 프로퍼티는 "값이 바뀜"을 보여 준다', () => {
    renderStep('add-delete', 4)
    const row = within(card()).getByText('"a":').closest('li')!
    expect(within(row).getByText('값이 바뀜')).toBeInTheDocument()
    expect(screen.getByText('갱신')).toBeInTheDocument()
  })

  it('없는 키를 읽으면 "없음" 배지를 보이고 카드에는 "읽음"이 없다', () => {
    renderStep('add-delete', 2)
    expect(screen.getByText('없음')).toBeInTheDocument()
    expect(within(card()).queryByText('읽음')).toBeNull()
  })

  it('없는 키를 지우면 "삭제할 것 없음" 배지를 보인다', () => {
    renderStep('add-delete', 8)
    expect(screen.getByText('삭제할 것 없음')).toBeInTheDocument()
  })

  it('불리언·undefined 값은 따옴표 없이 보인다', () => {
    const state: PropertyState = {
      bindings: [
        { name: 'ok', declaredWith: 'const', value: { type: 'boolean', display: 'true' } },
      ],
      objects: [],
      access: null,
    }
    render(<PropertyView state={state} />)
    expect(screen.getByText('true')).toBeInTheDocument()
  })
})
