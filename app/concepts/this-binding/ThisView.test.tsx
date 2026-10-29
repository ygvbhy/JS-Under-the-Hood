import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { scenarios } from './scenarios'
import { ThisView } from './ThisView'

function stateOf(id: string, index: number) {
  return scenarios.find((s) => s.id === id)!.steps[index].state
}

function renderStep(id: string, index: number) {
  return render(<ThisView state={stateOf(id, index)} />)
}

const decideArea = () => screen.getByRole('region', { name: 'this 결정' })
const items = () => within(decideArea()).getAllByRole('listitem')
const fnCard = (id: string) => document.querySelector<HTMLElement>(`[data-fn-id="${id}"]`)!
const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('ThisView', () => {
  it('빈 상태 문구를 보여 주고 결정 목록과 표는 없다', () => {
    renderStep('extract', 0)
    expect(screen.getByText('진행 중인 호출 없음')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 함수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 객체가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 결정한 호출 없음')).toBeInTheDocument()
    expect(document.querySelector('ol')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('프로퍼티 참조: 네 칸이 순서대로 기준 값, thisArg, 규칙, this를 글자로 보여 준다', () => {
    renderStep('extract', 3) // book.whoAmI()
    const li = items()
    expect(li).toHaveLength(4)
    expect(decideArea()).toHaveTextContent('book.whoAmI()')
    expect(li[0]).toHaveTextContent('함수 자리의 식')
    expect(li[0]).toHaveTextContent('프로퍼티 참조, 기준 값 book')
    expect(li[1]).toHaveTextContent('thisArg book')
    expect(li[2]).toHaveTextContent('whoAmI')
    expect(li[2]).toHaveTextContent('sloppy')
    expect(li[2]).toHaveTextContent('sloppy 함수: 객체인 thisArg는 그대로 받음')
    expect(li[3]).toHaveTextContent('this')
    expect(li[3]).toHaveTextContent('book')
  })

  it('변수 이름: 기준 값이 없고 thisArg는 undefined, this는 전역 객체', () => {
    renderStep('extract', 4) // whoAmI()
    const li = items()
    expect(li[0]).toHaveTextContent('변수 이름 whoAmI: 참조의 기준 값 없음')
    expect(li[1]).toHaveTextContent('thisArg undefined')
    expect(li[2]).toHaveTextContent('undefined인 thisArg는 전역 객체로 바꿔 받음')
    expect(li[3]).toHaveTextContent('전역 객체')
  })

  it('참조가 아닌 값: 이유 문장을 보여 주고 strict 함수는 undefined를 그대로 받는다', () => {
    const last = scenarios.find((s) => s.id === 'parens')!.steps.length - 1
    renderStep('parens', last) // (0, book.whoAmI)()
    const li = items()
    expect(li[0]).toHaveTextContent('참조가 아닌 값')
    expect(li[0]).toHaveTextContent('쉼표 연산자는 오른쪽 식의 값을 꺼내 돌려주므로')
    expect(li[2]).toHaveTextContent('strict')
    expect(li[2]).toHaveTextContent('strict 함수: thisArg를 그대로 받음')
    expect(li[3]).toHaveTextContent('undefined')
  })

  it('call 호출: 함수 자리 식의 기준 값은 함수이고 첫 인수가 thisArg가 된다', () => {
    const index = scenarios
      .find((s) => s.id === 'bind')!
      .steps.findIndex((s) => s.state.current?.via === 'call')
    expect(index).toBeGreaterThan(0)
    renderStep('bind', index) // bound.call(lee)
    const li = items()
    expect(li[0]).toHaveTextContent('bound.call: 기준 값은 함수 whoAmI.bind(kim)')
    expect(li[1]).toHaveTextContent('call의 첫 인수 lee가 thisArg')
    expect(li[2]).toHaveTextContent(
      'bound 함수: 받은 thisArg를 쓰지 않고 묶인 this로 원본 함수를 부름',
    )
    expect(li[3]).toHaveTextContent('kim')
  })

  it('apply로 부르면 "apply의 첫 인수"로 쓴다', () => {
    const base = stateOf('bind', 3)
    const current = {
      ...base.current!,
      via: 'apply' as const,
      firstArg: { kind: 'undefined' as const },
    }
    render(<ThisView state={{ ...base, current }} />)
    expect(items()[1]).toHaveTextContent('apply의 첫 인수 undefined가 thisArg')
  })

  it('함수 모드 배지 네 가지(sloppy·strict·화살표·bound)를 글자로 보여 준다', () => {
    const cb = scenarios.find((s) => s.id === 'callback')!
    const { unmount } = render(<ThisView state={cb.steps[cb.steps.length - 1].state} />)
    expect(within(fnCard('run')).getByText('sloppy')).toBeInTheDocument()
    expect(within(fnCard('viaArrow')).getByText('화살표')).toBeInTheDocument()
    expect(within(fnCard('boundPlain')).getByText('bound')).toBeInTheDocument()
    unmount()
    const pc = scenarios.find((s) => s.id === 'parens')!
    renderStep('parens', 1)
    expect(within(fnCard('whoAmI')).getByText('strict')).toBeInTheDocument()
    expect(pc.steps[1].state.functions[0].mode).toBe('strict')
  })

  it('화살표 함수는 바깥 this, bound 함수는 묶인 this와 원본을 보여 준다', () => {
    const cb = scenarios.find((s) => s.id === 'callback')!
    render(<ThisView state={cb.steps[cb.steps.length - 1].state} />)
    expect(fnCard('viaArrow')).toHaveTextContent('바깥 this: book')
    expect(fnCard('viaArrow')).not.toHaveTextContent('묶인 this')
    expect(fnCard('boundPlain')).toHaveTextContent('묶인 this: book')
    expect(fnCard('boundPlain')).toHaveTextContent('원본: plain')
    expect(fnCard('boundPlain')).toHaveTextContent('plain.bind(this)')
    expect(fnCard('plain')).not.toHaveTextContent('원본')
  })

  it('만들어진 함수·객체와 바뀐 변수에 "새로 생김"을 글자로 표시하고 다음 단계에서는 없다', () => {
    const { unmount } = renderStep('extract', 1)
    expect(within(fnCard('whoAmI')).getByText('새로 생김')).toBeInTheDocument()
    expect(
      within(document.querySelector<HTMLElement>('[data-object-id="book"]')!).getByText(
        '새로 생김',
      ),
    ).toBeInTheDocument()
    expect(document.querySelectorAll('[data-changed="true"]')).toHaveLength(3)
    unmount()
    renderStep('extract', 3)
    expect(screen.queryByText('새로 생김')).toBeNull()
    expect(document.querySelector('[data-changed]')).toBeNull()
  })

  it('객체 카드는 name 프로퍼티 값을 보여 준다', () => {
    renderStep('bind', 1)
    const kim = document.querySelector<HTMLElement>('[data-object-id="kim"]')!
    expect(kim).toHaveTextContent('name: "Kim"')
  })

  it('비교표 행 수는 history 길이와 같고 방금 결정한 마지막 행만 표시한다', () => {
    for (const s of scenarios) {
      s.steps.forEach((step, i) => {
        const { unmount } = render(<ThisView state={step.state} />)
        if (step.state.history.length === 0) {
          expect(screen.queryByRole('table')).toBeNull()
        } else {
          expect(rows()).toHaveLength(step.state.history.length)
          const marked = document.querySelectorAll('tr[data-current="true"]')
          expect(marked, `${s.id} ${i}`).toHaveLength(step.state.current ? 1 : 0)
          if (step.state.current) {
            expect(marked[0]).toBe(rows()[rows().length - 1])
            expect(marked[0]).toHaveTextContent('방금 결정')
            expect(marked[0]).toHaveTextContent(step.state.current.expr)
          } else {
            expect(screen.queryByText('방금 결정')).toBeNull()
          }
        }
        unmount()
      })
    }
  })

  it('비교표는 호출식과 this 두 열이고 캡션이 있다', () => {
    renderStep('callback', 7)
    const table = screen.getByRole('table', { name: '호출식별 this 비교표' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['호출식', 'this'])
    expect(table).toHaveTextContent('callback() ← run(plain.bind(this))')
  })
})
