import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GenView } from './GenView'
import { scenarios } from './scenarios'

const next = scenarios.find((s) => s.id === 'next')!
const ret = scenarios.find((s) => s.id === 'return')!

const stackItems = () =>
  within(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)
const sectionOf = (title: string) => screen.getByText(title).closest('section')!

describe('GenView', () => {
  it('첫 단계: 스택에 전역 코드만, 제너레이터 없음, 호출·결과 없음, "(바뀜)" 없음', () => {
    render(<GenView state={next.steps[0].state} />)
    expect(stackItems()).toEqual(['전역 코드'])
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent('없음')
    expect(sectionOf('지금 호출')).toHaveTextContent('없음')
    expect(sectionOf('돌려준 결과')).toHaveTextContent('없음')
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('스택은 위(지금 실행 중)가 먼저 나온다', () => {
    const step = next.steps.find((s) => s.state.stack.length === 2)!
    render(<GenView state={step.state} />)
    expect(stackItems()).toEqual(['talk 본문', '전역 코드'])
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveAccessibleName(
      '실행 컨텍스트 스택 (위가 지금 실행 중)',
    )
  })

  it('제너레이터 카드에 이름, 상태 텍스트, 기억하는 변수를 보여 준다', () => {
    const step = next.steps[1]
    render(<GenView state={step.state} />)
    const card = screen.getByRole('list', { name: /^제너레이터 객체/ })
    expect(card).toHaveTextContent('it')
    expect(card).toHaveTextContent('상태: suspended-start')
    expect(within(card).getByRole('list', { name: 'it의 변수' })).toHaveTextContent(
      'a = undefinedb = undefined',
    )
  })

  it('변수가 없는 제너레이터는 "변수 없음"을 보여 준다', () => {
    render(<GenView state={ret.steps[1].state} />)
    expect(screen.getByText('변수 없음')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent(
      '상태: suspended-start',
    )
  })

  it('지금 호출과 돌려준 결과를 코드 형식으로 보여 준다', () => {
    const hi = next.steps.find((s) => s.state.call?.arg === "'hi'")!
    render(<GenView state={hi.state} />)
    expect(sectionOf('지금 호출')).toHaveTextContent("it.next('hi')")
    const yielded = next.steps.find((s) => s.state.result?.value === 'first')!
    render(<GenView state={yielded.state} />)
    expect(screen.getAllByText('{ value: first, done: false }').length).toBeGreaterThan(0)
  })

  it('인수 없는 호출은 it.next()로, return 호출은 it.return(...)으로 보여 준다', () => {
    const noArg = ret.steps.find((s) => s.state.call?.method === 'next')!
    render(<GenView state={noArg.state} />)
    expect(sectionOf('지금 호출')).toHaveTextContent('it.next()')
    const r = ret.steps.find((s) => s.state.call?.method === 'return')!
    render(<GenView state={r.state} />)
    expect(screen.getAllByText("it.return('중단')").length).toBeGreaterThan(0)
  })

  it('completed 제너레이터의 결과는 done: true이다', () => {
    render(<GenView state={next.steps.at(-1)!.state} />)
    expect(screen.getByRole('list', { name: /^제너레이터 객체/ })).toHaveTextContent(
      '상태: completed',
    )
    expect(sectionOf('돌려준 결과')).toHaveTextContent('{ value: undefined, done: true }')
    expect(sectionOf('지금 호출')).toHaveTextContent('없음')
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // 2 → 3단계(next 호출): 스택, 제너레이터 상태, 지금 호출이 바뀐다. 결과는 그대로 없음
    render(<GenView state={next.steps[2].state} prevState={next.steps[1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(3)
    expect(within(sectionOf('돌려준 결과')).queryByText('(바뀜)')).toBeNull()
    expect(within(sectionOf('지금 호출')).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    render(<GenView state={next.steps[4].state} prevState={next.steps[3].state} />)
    // 4 → 5단계: 호출만 비워진다
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    const same = next.steps[7].state
    render(<GenView state={same} prevState={next.steps[6].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
  })
})
