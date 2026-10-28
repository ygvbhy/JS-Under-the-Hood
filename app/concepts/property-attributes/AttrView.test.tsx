import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttrView } from './AttrView'
import { scenarios } from './scenarios'

function renderStep(id: string, index: number) {
  const state = scenarios.find((s) => s.id === id)!.steps[index].state
  return render(<AttrView state={state} />)
}

const card = (id = 'A') => document.querySelector<HTMLElement>(`[data-object-id="${id}"]`)!
const row = (key: string, id = 'A') =>
  card(id).querySelector<HTMLElement>(`[data-prop-key="${key}"]`)!

describe('AttrView', () => {
  it('빈 상태 문구 3개를 보여 준다', () => {
    renderStep('writable-sloppy', 0)
    expect(screen.getByText('이 단계에서는 프로퍼티를 다루지 않습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 이 코드가 만든 객체가 없습니다.')).toBeInTheDocument()
  })

  it('빈 객체는 "프로퍼티 없음", "확장 가능", 변수는 "→ 객체 A" 칩을 보여 준다', () => {
    renderStep('writable-sloppy', 1)
    expect(within(card()).getByText('프로퍼티 없음')).toBeInTheDocument()
    expect(within(card()).getByText('확장 가능')).toBeInTheDocument()
    expect(within(card()).getByText('새로 생김')).toBeInTheDocument()
    const binding = screen.getByText('item').closest('li')!
    expect(within(binding).getByText('const')).toBeInTheDocument()
    expect(within(binding).getByText('→ 객체 A')).toBeInTheDocument()
  })

  it('데이터 프로퍼티의 값과 어트리뷰트 칩을 보여 준다', () => {
    renderStep('writable-sloppy', 3)
    const r = row('code')
    expect(within(r).getByText('데이터')).toBeInTheDocument()
    expect(within(r).getByText('"A1"')).toBeInTheDocument()
    expect(within(r).getByText('writable: false')).toBeInTheDocument()
    expect(within(r).getByText('enumerable: true')).toBeInTheDocument()
    expect(within(r).getByText('configurable: false')).toBeInTheDocument()
  })

  it('접근자 프로퍼티는 get·set과 "접근자" 배지를 보여 준다', () => {
    renderStep('getter', 3)
    const r = row('next')
    expect(within(r).getByText('접근자')).toBeInTheDocument()
    expect(within(r).getByText('get: get next() { … }')).toBeInTheDocument()
    expect(within(r).getByText('set: 없음')).toBeInTheDocument()
    expect(within(r).queryByText('데이터')).toBeNull()
    const binding = screen.getByText('reads = 1').closest('li')!
    expect(within(binding).getByText('let')).toBeInTheDocument()
  })

  it('freeze 단계에서 A는 "확장 불가", B는 "확장 가능"이고 바뀐 칩만 강조된다', () => {
    renderStep('freeze-shallow', 2)
    expect(within(card('A')).getByText('확장 불가')).toBeInTheDocument()
    expect(within(card('B')).getByText('확장 가능')).toBeInTheDocument()
    expect(within(card('A')).getByText('확장 불가')).toHaveAttribute('data-changed', 'true')
    const level = row('level')
    expect(within(level).getByText('writable: false')).toHaveAttribute('data-changed', 'true')
    expect(within(level).getByText('configurable: false')).toHaveAttribute('data-changed', 'true')
    expect(within(level).getByText('enumerable: true')).not.toHaveAttribute('data-changed')
    expect(level).not.toHaveAttribute('data-changed')
    expect(screen.getByText('적용됨')).toBeInTheDocument()
  })

  it('다른 객체를 가리키는 값은 "→ 객체 B" 칩으로 보인다', () => {
    renderStep('freeze-shallow', 3)
    expect(within(row('limits')).getByText('→ 객체 B')).toBeInTheDocument()
  })

  it('새로 만든 프로퍼티는 행 전체가 강조된다', () => {
    renderStep('writable-sloppy', 2)
    expect(row('code')).toHaveAttribute('data-changed', 'true')
    expect(within(row('code')).getByText('새로 생김')).toBeInTheDocument()
    expect(screen.getByText('프로퍼티를 만듦')).toBeInTheDocument()
  })

  it('ignored: 무시됨 문장을 보여 준다', () => {
    renderStep('writable-sloppy', 3)
    expect(screen.getByText("item.code = 'B2'")).toBeInTheDocument()
    expect(
      screen.getByText('writable이 false라 대입이 무시됨 — strict mode가 아니라 오류 없음'),
    ).toBeInTheDocument()
  })

  it('delete-false 문장을 보여 준다', () => {
    renderStep('writable-sloppy', 5)
    expect(
      screen.getByText('configurable이 false라 삭제되지 않음 — delete 결과 false'),
    ).toBeInTheDocument()
  })

  it('읽기 문장을 보여 준다', () => {
    renderStep('writable-sloppy', 4)
    expect(screen.getByText('값을 읽음: "A1"')).toBeInTheDocument()
  })

  it('TypeError 문장을 보여 준다', () => {
    renderStep('writable-strict', 3)
    expect(screen.getByText('TypeError 발생')).toBeInTheDocument()
  })

  it('getter-called 문장과 describe 문장을 보여 준다', () => {
    const { unmount } = renderStep('getter', 3)
    expect(screen.getByText('getter 호출 → 1 반환')).toBeInTheDocument()
    unmount()
    renderStep('getter', 5)
    expect(screen.getByText('디스크립터를 읽음 (getter는 호출하지 않음)')).toBeInTheDocument()
  })

  it('updated와 integrity 검사 문장을 보여 준다', () => {
    const { unmount } = renderStep('freeze-shallow', 4)
    expect(screen.getByText('값이 바뀜: 20')).toBeInTheDocument()
    expect(within(row('max', 'B')).getByText('값:').parentElement).toHaveAttribute(
      'data-changed',
      'true',
    )
    unmount()
    renderStep('freeze-shallow', 7)
    expect(screen.getByText('결과: true')).toBeInTheDocument()
  })
})
