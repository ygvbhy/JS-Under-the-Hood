import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClosureView } from './ClosureView'
import { scenarios } from './scenarios'

function stepOf(id: string, title: string) {
  const step = scenarios.find((s) => s.id === id)!.steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계 없음: ${id} / ${title}`)
  return step.state
}

function renderStep(id: string, title: string) {
  return render(<ClosureView state={stepOf(id, title)} />)
}

const ctx = (id: string) => document.querySelector<HTMLElement>(`[data-ctx-id="${id}"]`)!
const env = (id: string) =>
  document.querySelector<HTMLElement>(`[data-env-id="${id}"]:not([data-found])`)!
const fn = (label: string) => document.querySelector<HTMLElement>(`[data-fn-name="${label}"]`)!
const stackItems = () =>
  within(screen.getByRole('region', { name: '실행 컨텍스트 스택' })).getAllByRole('listitem')
const lookupArea = () => screen.getByRole('region', { name: '찾기' })
const retainedIds = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-retained="true"]')).map((e) =>
    e.getAttribute('data-env-id'),
  )

const AFTER_RETURN = 'makeCounter 반환: 컨텍스트 빠짐, next 초기화'

describe('ClosureView', () => {
  it('실행 전에는 빈 상태 문구를 보여 준다', () => {
    renderStep('counter', '실행 전')
    expect(screen.getByText('실행 컨텍스트 없음 (실행 전)')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 환경 레코드가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 함수 객체가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 찾는 이름 없음')).toBeInTheDocument()
    expect(screen.queryByText('실행 중')).not.toBeInTheDocument()
    expect(screen.queryByText('남아 있음')).not.toBeInTheDocument()
  })

  it('스택은 맨 위(실행 중)부터 그리고 "실행 중" 배지는 맨 위에만 있다', () => {
    renderStep('counter', 'next() 호출: 컨텍스트 쌓기')
    expect(
      screen.getByText('위가 지금 실행 중, 아래로 갈수록 먼저 쌓인 컨텍스트'),
    ).toBeInTheDocument()
    const items = stackItems()
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('increment 실행 컨텍스트')
    expect(items[1]).toHaveTextContent('전역 실행 컨텍스트')
    expect(items[0]).toHaveTextContent('실행 중')
    expect(items[1]).not.toHaveTextContent('실행 중')
    expect(screen.getAllByText('실행 중')).toHaveLength(1)
  })

  it('단계 배지: 쌓은 단계는 선언 처리, 다음 단계는 실행', () => {
    const { unmount } = renderStep('counter', 'next() 호출: 컨텍스트 쌓기')
    expect(within(ctx('increment')).getByText('선언 처리')).toBeInTheDocument()
    expect(within(ctx('global')).getByText('실행')).toBeInTheDocument()
    unmount()
    renderStep('counter', 'count 이름 찾기')
    expect(within(ctx('increment')).getByText('실행')).toBeInTheDocument()
    expect(within(ctx('increment')).queryByText('선언 처리')).not.toBeInTheDocument()
  })

  it('컨텍스트 카드와 레코드 카드에 LexicalEnvironment·VariableEnvironment가 가리키는 쪽을 글자로 보여 준다', () => {
    renderStep('counter', 'count 이름 찾기')
    expect(ctx('increment')).toHaveTextContent('LexicalEnvironment → increment 선언적 환경 레코드')
    expect(ctx('increment')).toHaveTextContent('VariableEnvironment → increment 함수 환경 레코드')
    expect(ctx('global')).toHaveTextContent('LexicalEnvironment → 전역 환경 레코드')
    expect(ctx('global')).toHaveTextContent('VariableEnvironment → 전역 환경 레코드')
    expect(env('increment-lex')).toHaveTextContent('실행 중 컨텍스트의 LexicalEnvironment')
    expect(env('increment-lex')).not.toHaveTextContent('실행 중 컨텍스트의 VariableEnvironment')
    expect(env('increment-fn')).toHaveTextContent('실행 중 컨텍스트의 VariableEnvironment')
    expect(env('global')).not.toHaveTextContent('실행 중 컨텍스트의')
  })

  it('레코드 종류 배지 3가지(전역·함수·선언적)를 보여 준다', () => {
    renderStep('counter', 'next() 호출: 컨텍스트 쌓기')
    expect(within(env('global')).getByText('전역')).toBeInTheDocument()
    expect(within(env('increment-fn')).getByText('함수')).toBeInTheDocument()
    expect(within(env('increment-lex')).getByText('선언적')).toBeInTheDocument()
  })

  it('전역 레코드는 객체 환경 레코드와 선언적 환경 레코드 두 칸으로 나눠 그린다', () => {
    renderStep('counter', AFTER_RETURN)
    const global = env('global')
    const objectPart = global.querySelector<HTMLElement>('[data-part="object"]')!
    const declarativePart = global.querySelector<HTMLElement>('[data-part="declarative"]')!
    expect(objectPart).toHaveTextContent('객체 환경 레코드 (전역 객체의 프로퍼티)')
    expect(within(objectPart).getByText('makeCounter')).toBeInTheDocument()
    expect(within(objectPart).queryByText('next')).not.toBeInTheDocument()
    expect(declarativePart).toHaveTextContent('선언적 환경 레코드')
    expect(within(declarativePart).getByText('next')).toBeInTheDocument()
    expect(within(declarativePart).queryByText('makeCounter')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-part]')).toHaveLength(2)
  })

  it('초기화 전 바인딩은 값 대신 "초기화 전"으로 보인다', () => {
    const { unmount } = renderStep('counter', 'makeCounter() 호출: 컨텍스트 쌓기')
    const row = env('makeCounter-lex').querySelector<HTMLElement>('[data-binding-name="count"]')!
    expect(row).toHaveTextContent('count → 초기화 전')
    unmount()
    renderStep('counter', 'count에 0이 들어감')
    const after = env('makeCounter-lex').querySelector<HTMLElement>('[data-binding-name="count"]')!
    expect(after).toHaveTextContent('count → 0')
    expect(after).not.toHaveTextContent('초기화 전')
  })

  it('바깥([[OuterEnv]]) 연결을 레코드 이름으로, 전역은 없음(null)으로 보여 준다', () => {
    renderStep('counter', 'next() 호출: 컨텍스트 쌓기')
    expect(env('global')).toHaveTextContent('바깥([[OuterEnv]]): 없음(null)')
    // increment의 바깥은 호출한 전역이 아니라 만든 곳(makeCounter)의 레코드다.
    expect(env('increment-fn')).toHaveTextContent(
      '바깥([[OuterEnv]]): makeCounter 선언적 환경 레코드',
    )
    expect(env('increment-lex')).toHaveTextContent('바깥([[OuterEnv]]): increment 함수 환경 레코드')
    expect(env('makeCounter-fn')).toHaveTextContent('바깥([[OuterEnv]]): 전역 환경 레코드')
  })

  it('이름 찾기는 경로를 순서대로 보여 주고 찾은 레코드에 "찾음"을 표시한다', () => {
    renderStep('counter', 'count 이름 찾기')
    const area = lookupArea()
    expect(area).toHaveTextContent('찾는 것: count')
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(3)
    expect(path[0]).toHaveTextContent('increment 선언적 환경 레코드')
    expect(path[1]).toHaveTextContent('increment 함수 환경 레코드')
    expect(path[2]).toHaveTextContent('makeCounter 선언적 환경 레코드')
    expect(within(area).getAllByText('찾음')).toHaveLength(1)
    expect(path[2]).toHaveTextContent('찾음')
    expect(path[0]).not.toHaveTextContent('찾음')
    expect(within(area).queryByText('찾지 못함')).not.toBeInTheDocument()
    expect(area).toHaveTextContent('결과: 0')
  })

  it('전역에서 찾지 못하면 "찾지 못함"을 표시하고 결과도 보여 준다', () => {
    renderStep('counter', 'typeof count: 전역에서 찾지 못함')
    const area = lookupArea()
    expect(area).toHaveTextContent('찾는 것: count')
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(2)
    expect(path[0]).toHaveTextContent('전역 환경 레코드')
    expect(path[0]).not.toHaveTextContent('찾음')
    expect(path[1]).toHaveTextContent('찾지 못함')
    expect(within(area).queryByText('찾음')).not.toBeInTheDocument()
    expect(area).toHaveTextContent("결과: 'undefined'")
  })

  it('"새로 생김"과 "바뀜"은 그 단계의 항목에만 붙는다', () => {
    const { unmount } = renderStep('counter', 'next() 호출: 컨텍스트 쌓기')
    expect(within(ctx('increment')).getByText('새로 생김')).toBeInTheDocument()
    expect(within(ctx('global')).queryByText('새로 생김')).not.toBeInTheDocument()
    expect(within(env('increment-fn')).getByText('새로 생김')).toBeInTheDocument()
    expect(within(env('global')).queryByText('새로 생김')).not.toBeInTheDocument()
    expect(within(env('makeCounter-lex')).queryByText('새로 생김')).not.toBeInTheDocument()
    unmount()
    renderStep('counter', 'count가 1이 됨')
    expect(screen.queryByText('새로 생김')).not.toBeInTheDocument()
    expect(screen.getAllByText('바뀜')).toHaveLength(1)
    expect(env('makeCounter-lex')).toHaveTextContent('count → 1')
  })

  describe('남아 있음', () => {
    it('반환 뒤 스택에는 전역만 있고, 이유와 함께 "남아 있음"이 makeCounter의 두 레코드에만 붙는다', () => {
      renderStep('counter', AFTER_RETURN)
      expect(stackItems()).toHaveLength(1)
      expect(retainedIds()).toEqual(['makeCounter-fn', 'makeCounter-lex'])
      expect(screen.getAllByText('남아 있음')).toHaveLength(2)
      for (const id of ['makeCounter-fn', 'makeCounter-lex']) {
        expect(within(env(id)).getByText('남아 있음')).toBeInTheDocument()
        expect(env(id)).toHaveTextContent('실행 컨텍스트 없이 남음 · 가리키는 함수: increment')
      }
      expect(within(env('global')).queryByText('남아 있음')).not.toBeInTheDocument()
      expect(env('global')).not.toHaveTextContent('실행 컨텍스트 없이 남음')
    })

    it('실행 컨텍스트가 가리키는 호출 단계에서는 "남아 있음"이 없다', () => {
      renderStep('counter', 'next() 호출: 컨텍스트 쌓기')
      expect(retainedIds()).toEqual([])
      expect(screen.queryByText('남아 있음')).not.toBeInTheDocument()
      expect(screen.queryByText(/실행 컨텍스트 없이 남음/)).not.toBeInTheDocument()
    })

    it('남은 레코드의 이유는 그 레코드에 닿는 함수 객체 이름들이다(shared는 두 메서드)', () => {
      renderStep('shared', 'makeCounter 반환: 컨텍스트 빠짐, counter 초기화')
      expect(retainedIds()).toEqual(['makeCounter-fn', 'makeCounter-lex'])
      expect(env('makeCounter-lex')).toHaveTextContent(
        '실행 컨텍스트 없이 남음 · 가리키는 함수: increment, get',
      )
      expect(env('makeCounter-fn')).toHaveTextContent(
        '실행 컨텍스트 없이 남음 · 가리키는 함수: increment, get',
      )
    })
  })

  describe('함수 객체', () => {
    it('[[Environment]]가 가리키는 레코드 이름과 가리키는 곳을 보여 준다', () => {
      renderStep('counter', AFTER_RETURN)
      const fns = document.querySelectorAll<HTMLElement>('[data-fn-name]')
      expect(fns).toHaveLength(2)
      expect(fns[0]).toHaveTextContent('makeCounter → [[Environment]]: 전역 환경 레코드')
      expect(fns[0]).toHaveTextContent('가리키는 곳: 변수 makeCounter')
      expect(fns[1]).toHaveTextContent(
        'increment → [[Environment]]: makeCounter 선언적 환경 레코드',
      )
      expect(fns[1]).toHaveTextContent('가리키는 곳: 변수 next')
    })

    it('호출 중에는 함수 환경 레코드의 바인딩이 가리키는 곳으로 보인다', () => {
      renderStep('counter', 'count에 0이 들어감')
      expect(fn('increment')).toHaveTextContent(
        '가리키는 곳: makeCounter 함수 환경 레코드의 increment',
      )
    })

    it('shared: 두 메서드가 같은 [[Environment]] 레코드 이름을 보여 준다', () => {
      renderStep('shared', 'makeCounter 반환: 컨텍스트 빠짐, counter 초기화')
      const label = 'makeCounter 선언적 환경 레코드'
      expect(fn('increment')).toHaveTextContent(`[[Environment]]: ${label}`)
      expect(fn('get')).toHaveTextContent(`[[Environment]]: ${label}`)
      expect(fn('increment')).toHaveTextContent('가리키는 곳: counter의 increment 메서드')
      expect(fn('get')).toHaveTextContent('가리키는 곳: counter의 get 메서드')
    })

    it('independent: 레코드 세트 두 개와 서로 다른 [[Environment]]의 익명 함수 둘을 보여 준다', () => {
      renderStep('independent', '두 번째 반환: 컨텍스트 빠짐, second 초기화')
      const ids = Array.from(document.querySelectorAll('[data-env-id]')).map((e) =>
        e.getAttribute('data-env-id'),
      )
      expect(ids).toEqual([
        'global',
        'makeCounter#1-fn',
        'makeCounter#1-lex',
        'makeCounter#2-fn',
        'makeCounter#2-lex',
      ])
      expect(retainedIds()).toHaveLength(4)
      expect(env('makeCounter#1-lex')).toHaveTextContent('가리키는 함수: 익명 함수(first)')
      expect(env('makeCounter#2-lex')).toHaveTextContent('가리키는 함수: 익명 함수(second)')
      expect(env('makeCounter#1-lex')).not.toHaveTextContent('익명 함수(second)')
      const first = fn('익명 함수(first)')
      const second = fn('익명 함수(second)')
      expect(first).toHaveTextContent('[[Environment]]: makeCounter(1번째 호출) 선언적 환경 레코드')
      expect(second).toHaveTextContent(
        '[[Environment]]: makeCounter(2번째 호출) 선언적 환경 레코드',
      )
      expect(first).toHaveTextContent('가리키는 곳: 변수 first')
      expect(second).toHaveTextContent('가리키는 곳: 변수 second')
    })
  })
})
