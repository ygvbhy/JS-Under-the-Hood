import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProtoView } from './ProtoView'
import { scenarios } from './scenarios'
import type { ProtoState } from './scenarios'

const byId = (id: string) => scenarios.find((s) => s.id === id)!
const stepState = (id: string, title: string): ProtoState =>
  byId(id).steps.find((s) => s.title === title)!.state

const card = (id: string) => {
  const el = document.querySelector<HTMLElement>(`[data-object-id="${id}"]`)
  if (!el) throw new Error(`card ${id} not found`)
  return el
}

const EMPTY: ProtoState = { bindings: [], objects: [], lookup: null }

describe('ProtoView', () => {
  it('빈 상태와 탐색이 없는 상태에서 안내 문구를 보여 준다', () => {
    render(<ProtoView state={EMPTY} />)
    expect(screen.getByText('이 단계에는 탐색이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 객체가 없습니다.')).toBeInTheDocument()
    expect(document.querySelector('ol')).toBeNull()
  })

  it('get 경로를 끝까지 못 찾으면 "없음" 칸들과 null 끝 칸, 결과를 보여 준다', () => {
    render(<ProtoView state={stepState('chain', 'item.price 읽기')} />)
    const items = within(document.querySelector('ol')!).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(within(items[0]).getByText('객체 item')).toBeInTheDocument()
    expect(within(items[3]).getByText('Object.prototype')).toBeInTheDocument()
    for (const i of [0, 1, 2, 3]) expect(within(items[i]).getByText('없음')).toBeInTheDocument()
    expect(within(items[4]).getByText('null — 체인 끝')).toBeInTheDocument()
    expect(screen.getByText('읽기')).toBeInTheDocument()
    expect(screen.getByText('undefined', { selector: 'span.font-semibold' })).toBeInTheDocument()
  })

  it('get 경로에서 찾은 칸은 "찾음"이고 경로 카드에 배지와 data-on-path가 붙는다', () => {
    render(<ProtoView state={stepState('chain', 'item.lang 읽기')} />)
    const items = within(document.querySelector('ol')!).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('없음')).toBeInTheDocument()
    expect(within(items[1]).getByText('찾음')).toBeInTheDocument()
    expect(card('item')).toHaveAttribute('data-on-path', 'true')
    expect(within(card('item')).getByText('경로 1')).toBeInTheDocument()
    expect(within(card('mid')).getByText('경로 2')).toBeInTheDocument()
    expect(card('base')).not.toHaveAttribute('data-on-path')
    expect(within(card('base')).queryByText(/^경로/)).toBeNull()
  })

  it('set 경로는 "대입" 목적과 결과 문장을 보여 준다', () => {
    const state = stepState('shadowing', "item.color = 'blue' 대입")
    render(<ProtoView state={state} />)
    expect(state.lookup?.kind).toBe('set')
    expect(screen.getByText('대입')).toBeInTheDocument()
    expect(screen.getByText(state.lookup!.outcome as string)).toBeInTheDocument()
    expect(within(document.querySelector('ol')!).getAllByText('없음').length).toBeGreaterThan(0)
  })

  it('instanceof 경로는 비교 대상과 "불일치"·"일치"를 보여 준다', () => {
    render(<ProtoView state={stepState('instanceof', 'a instanceof Object')} />)
    const items = within(document.querySelector('ol')!).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('불일치')).toBeInTheDocument()
    expect(within(items[1]).getByText('일치')).toBeInTheDocument()
    expect(screen.getByText(/비교 대상/)).toHaveTextContent('Object.prototype')
    expect(screen.getByText('true', { selector: 'span.font-semibold' })).toBeInTheDocument()
  })

  it('함수의 prototype 프로퍼티 줄과 [[Prototype]] 줄은 서로 다른 글자와 모양으로 그려진다', () => {
    render(<ProtoView state={byId('prototype-property').steps[0].state} />)
    const book = card('Book')
    const propRow = book.querySelector('[data-prop-key="prototype"]')!
    const protoRow = book.querySelector('[data-proto-row]')!
    expect(propRow).toHaveTextContent('prototype')
    expect(propRow).toHaveTextContent('→ Book.prototype')
    expect(propRow).not.toHaveTextContent('[[Prototype]]')
    expect(protoRow).toHaveTextContent('[[Prototype]] (내부 슬롯)')
    expect(protoRow).toHaveTextContent('→ Function.prototype')
    expect(protoRow.className).toContain('border-dashed')
    expect(propRow.className).not.toContain('border-dashed')
    expect(card('bookProto').querySelector('[data-proto-row]')).toHaveTextContent(
      '→ Object.prototype',
    )
  })

  it('내장 카드는 생략 안내를, Object.prototype은 [[Prototype]]이 null임을 보여 준다', () => {
    render(<ProtoView state={byId('chain').steps[0].state} />)
    const op = card('Object.prototype')
    expect(
      within(op).getByText('toString·hasOwnProperty 등 다른 프로퍼티 생략'),
    ).toBeInTheDocument()
    expect(op.querySelector('[data-proto-row]')).toHaveTextContent('→ null')
    // 내장 객체는 자기 프로퍼티를 생략했을 뿐이므로 "자기 프로퍼티 없음"이라고 쓰지 않는다.
    expect(within(op).queryByText('자기 프로퍼티 없음')).toBeNull()
  })

  it('생략 안내가 없는 빈 카드는 "자기 프로퍼티 없음"을 보여 준다', () => {
    render(<ProtoView state={stepState('chain', 'const mid = Object.create(base)')} />)
    expect(within(card('mid')).getByText('자기 프로퍼티 없음')).toBeInTheDocument()
  })

  it('그리지 않은 [[Prototype]]은 이름과 "(그림에서 생략)"을 보여 준다', () => {
    render(<ProtoView state={byId('instanceof').steps[0].state} />)
    expect(card('Book').querySelector('[data-proto-row]')).toHaveTextContent(
      '→ Function.prototype (그림에서 생략)',
    )
  })

  it('프로퍼티 칩 세 가지(쓰기 불가, setter, 열거 불가)를 글자로 보여 준다', () => {
    const state: ProtoState = {
      bindings: [],
      objects: [
        {
          id: 'o',
          label: '객체 o',
          props: [
            { key: 'a', value: { type: 'number', display: '1' }, note: 'readonly' },
            { key: 'b', value: { type: 'undefined', display: 'undefined' }, note: 'setter' },
            { key: 'c', value: { type: 'string', display: "'x'" }, note: 'hidden' },
          ],
          proto: { kind: 'null' },
        },
      ],
      lookup: null,
    }
    render(<ProtoView state={state} />)
    const o = card('o')
    expect(
      within(o.querySelector('[data-prop-key="a"]') as HTMLElement).getByText('쓰기 불가'),
    ).toBeInTheDocument()
    expect(
      within(o.querySelector('[data-prop-key="b"]') as HTMLElement).getByText('setter'),
    ).toBeInTheDocument()
    expect(
      within(o.querySelector('[data-prop-key="c"]') as HTMLElement).getByText('열거 불가'),
    ).toBeInTheDocument()
  })

  it('바뀐 프로퍼티·변수·새 카드·[[Prototype]]에 data-changed와 "새로 생김"을 붙인다', () => {
    render(<ProtoView state={stepState('chain', "mid.lang = 'ko'")} />)
    const lang = card('mid').querySelector('[data-prop-key="lang"]')!
    expect(lang).toHaveAttribute('data-changed', 'true')
    expect(lang.className).toContain('bg-highlight')
    expect(card('mid')).not.toHaveAttribute('data-changed')
  })

  it('새로 만든 카드와 그 변수·[[Prototype]] 줄을 강조한다', () => {
    render(<ProtoView state={stepState('chain', 'const mid = Object.create(base)')} />)
    const mid = card('mid')
    expect(mid).toHaveAttribute('data-changed', 'true')
    expect(mid.className).toContain('bg-highlight')
    expect(within(mid).getByText('새로 생김')).toBeInTheDocument()
    expect(mid.querySelector('[data-proto-row]')).toHaveAttribute('data-changed', 'true')
    expect(card('base')).not.toHaveAttribute('data-changed')
    const binding = screen.getByText('mid').closest('li')!
    expect(binding).toHaveAttribute('data-changed', 'true')
  })
})
