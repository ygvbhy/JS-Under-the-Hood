import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TryView } from './TryView'
import { scenarios } from './scenarios'

const override = scenarios.find((s) => s.id === 'override')!
const fixed = scenarios.find((s) => s.id === 'fixed')!
const stepOf = (steps: typeof override.steps, title: string) =>
  steps.find((s) => s.title === title)!
const indexOf = (steps: typeof override.steps, title: string) =>
  steps.findIndex((s) => s.title === title)

const listItems = (name: RegExp) =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)
const sectionOf = (title: string) => screen.getByText(title).closest('section')!

describe('TryView', () => {
  it('첫 단계: 스택에 전역 코드만, 변수 없음, 완료는 모두 아직 없음, "(바뀜)" 없음', () => {
    render(<TryView state={override.steps[0].state} />)
    expect(listItems(/^실행 컨텍스트 스택/)).toEqual(['전역 코드'])
    expect(screen.getByRole('list', { name: /^지역 변수/ })).toHaveTextContent('없음')
    expect(screen.getByRole('list', { name: /^블록의 완료/ })).toHaveTextContent(
      'try 블록아직 없음finally 블록아직 없음',
    )
    expect(screen.getByLabelText('try 문의 결과')).toHaveTextContent('아직 없음')
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('스택은 위(지금 실행 중)가 먼저 나온다', () => {
    render(<TryView state={override.steps[1].state} />)
    expect(listItems(/^실행 컨텍스트 스택/)).toEqual(['pick', '전역 코드'])
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveAccessibleName(
      '실행 컨텍스트 스택 (위가 지금 실행 중)',
    )
  })

  it('지역 변수를 이름 = 값으로 보여 준다', () => {
    render(<TryView state={stepOf(fixed.steps, 'x = 2').state} />)
    expect(listItems(/^지역 변수/)).toEqual(['x = 2'])
  })

  it('완료를 정상 완료 / return 완료 (값) 으로 보여 주고, 아직 없으면 아직 없음이다', () => {
    const { unmount } = render(<TryView state={stepOf(override.steps, "return 'try'").state} />)
    expect(screen.getByRole('list', { name: /^블록의 완료/ })).toHaveTextContent(
      "try 블록return 완료 ('try')finally 블록아직 없음",
    )
    unmount()
    render(<TryView state={stepOf(fixed.steps, 'finally 블록이 정상 완료').state} />)
    expect(screen.getByRole('list', { name: /^블록의 완료/ })).toHaveTextContent(
      'try 블록return 완료 (1)finally 블록정상 완료',
    )
    expect(screen.getByLabelText('try 문의 결과')).toHaveTextContent('return 완료 (1)')
  })

  it('throw 완료도 값과 함께 보여 준다', () => {
    const state = {
      ...override.steps[0].state,
      tryResult: { kind: 'throw' as const, value: "Error('x')" },
    }
    render(<TryView state={state} />)
    expect(screen.getByRole('list', { name: /^블록의 완료/ })).toHaveTextContent(
      "throw 완료 (Error('x'))",
    )
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // pick() 호출 단계: 스택만 바뀐다
    render(<TryView state={override.steps[1].state} prevState={override.steps[0].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    expect(within(sectionOf('실행 컨텍스트 스택')).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('try 블록의 완료가 정해지는 단계는 블록의 완료 칸만 바뀐다', () => {
    const k = indexOf(override.steps, "return 'try'")
    render(<TryView state={override.steps[k].state} prevState={override.steps[k - 1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    expect(within(sectionOf('블록의 완료')).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    const k = indexOf(override.steps, 'console.log(pick())')
    render(<TryView state={override.steps[k].state} prevState={override.steps[k - 1].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })
})
