import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToPrimitiveView } from './ToPrimitiveView'
import { scenarios } from './scenarios'

function steps(id: string) {
  return scenarios.find((s) => s.id === id)!.steps
}

function renderStep(id: string, title: string) {
  const all = steps(id)
  const i = all.findIndex((s) => s.title === title)
  if (i < 0) throw new Error(`단계 없음: ${id} / ${title}`)
  return render(
    <ToPrimitiveView state={all[i].state} prevState={i > 0 ? all[i - 1].state : undefined} />,
  )
}

const row = (name: string) => document.querySelector<HTMLElement>(`[data-row="${name}"]`)!
const attemptsArea = () => screen.getByRole('region', { name: '메서드 호출 순서' })

describe('ToPrimitiveView', () => {
  it('실행 전에는 진행 중인 ToPrimitive와 부른 메서드가 없다고 글자로 알려 준다', () => {
    renderStep('hint-order', '실행 전')
    expect(screen.getByText('이 단계에서 진행 중인 ToPrimitive 없음')).toBeInTheDocument()
    expect(attemptsArea()).toHaveTextContent('아직 부른 메서드가 없습니다.')
    expect(row('outcome')).toHaveTextContent('아직 정해지지 않음')
    expect(row('after')).toHaveTextContent('없음')
  })

  it("힌트 없음은 '없음'으로 보이고 Symbol.toPrimitive 확인 전에는 OrdinaryToPrimitive가 호출 전이다", () => {
    renderStep('hint-order', "o + '': ToPrimitive(o) 시작")
    expect(row('hint')).toHaveTextContent('없음 (힌트를 주지 않음)')
    expect(row('exotic')).toHaveTextContent('확인 전')
    expect(row('ordinary')).toHaveTextContent('아직 호출 전')
    expect(row('ordinary')).not.toHaveTextContent('number')
  })

  it('Symbol.toPrimitive가 없다고 확인한 뒤에야 OrdinaryToPrimitive에 number를 넘긴다', () => {
    renderStep('hint-order', "o + '': Symbol.toPrimitive 확인")
    expect(row('exotic')).toHaveTextContent('없음 → OrdinaryToPrimitive로 진행')
    expect(row('ordinary')).toHaveTextContent('아직 호출 전')
    renderStep('hint-order', "o + '': OrdinaryToPrimitive(number)")
    expect(
      within(document.body).getAllByText('OrdinaryToPrimitive에 number').length,
    ).toBeGreaterThan(0)
    expect(row('attempt-valueOf')).toHaveTextContent('호출 전')
    expect(row('attempt-toString')).toHaveTextContent('호출 전')
  })

  it('valueOf가 원시 값을 주면 toString은 "부르지 않음"이고 결과는 값과 타입을 함께 보인다', () => {
    renderStep('hint-order', "o + '': o.valueOf 호출")
    expect(row('attempt-valueOf')).toHaveTextContent('원시 값 → 사용')
    expect(row('attempt-toString')).toHaveTextContent('부르지 않음')
    expect(row('outcome')).toHaveTextContent('원시 값 1 (타입 number)')
  })

  it("숫자 1과 문자열 '1'은 타입으로 구분되어 보인다", () => {
    renderStep('hint-order', "o + '': o.valueOf 호출")
    expect(row('outcome')).toHaveTextContent('원시 값 1 (타입 number)')
    expect(row('outcome')).not.toHaveTextContent('타입 string')
    renderStep('hint-order', '`${o}`: o.toString 호출')
    const outcomes = document.querySelectorAll('[data-row="outcome"]')
    expect(outcomes[1]).toHaveTextContent("원시 값 'two' (타입 string)")
  })

  it('연산이 하는 일(after)은 ToPrimitive 결과와 구분되어 따로 보인다', () => {
    renderStep('hint-order', "o + '': 연산이 원시 값으로 계속")
    expect(row('after')).toHaveTextContent('1 + \'\' → ToString(1) → "1"')
  })

  it('string 힌트는 toString을 먼저 시도한다', () => {
    renderStep('hint-order', '`${o}`: o.toString 호출')
    const items = within(attemptsArea()).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('toString')
    expect(items[1]).toHaveTextContent('valueOf')
    expect(row('attempt-valueOf')).toHaveTextContent('부르지 않음')
  })

  it('객체를 돌려준 메서드는 "객체를 돌려줌 → 다음으로"로 보인다', () => {
    renderStep('array-and-object', 'a + 1: a.valueOf 호출')
    expect(row('attempt-valueOf')).toHaveTextContent('객체를 돌려줌 → 다음으로')
    expect(row('attempt-valueOf')).toHaveTextContent('[1, 2]')
    expect(row('attempt-toString')).toHaveTextContent('호출 전')
    expect(row('outcome')).toHaveTextContent('아직 정해지지 않음')
  })

  it('마지막으로 시도한 메서드가 객체를 돌려주면 "더 시도할 메서드 없음"으로 보인다', () => {
    renderStep('type-error', "stubborn + '': TypeError")
    expect(row('attempt-valueOf')).toHaveTextContent('객체를 돌려줌 → 다음으로')
    expect(row('attempt-toString')).toHaveTextContent('객체를 돌려줌 → 더 시도할 메서드 없음')
  })

  it('두 메서드를 모두 호출할 수 없으면 "호출할 수 없음"과 TypeError가 보인다', () => {
    renderStep('type-error', 'String(bare): TypeError')
    expect(row('attempt-toString')).toHaveTextContent('호출할 수 없음')
    expect(row('attempt-valueOf')).toHaveTextContent('호출할 수 없음')
    expect(row('outcome')).toHaveTextContent('TypeError 발생')
  })

  it('이전 단계와 같은 행은 "바뀜"이 없고 바뀐 행에만 붙는다', () => {
    renderStep('hint-order', "o + '': Symbol.toPrimitive 확인")
    expect(row('exotic')).toHaveAttribute('data-changed', 'true')
    expect(row('hint')).not.toHaveAttribute('data-changed')
    expect(within(row('exotic')).getByText('바뀜')).toBeInTheDocument()
  })

  it('prevState 없이도(첫 렌더) 그려진다', () => {
    render(<ToPrimitiveView state={steps('hint-order')[2].state} />)
    expect(row('call')).toHaveTextContent("o + ''")
  })
})
