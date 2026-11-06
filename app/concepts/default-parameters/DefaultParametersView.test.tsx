import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DefaultParametersView } from './DefaultParametersView'
import { scenarios } from './scenarios'

function stepOf(id: string, title: string) {
  const step = scenarios.find((s) => s.id === id)!.steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계 없음: ${id} / ${title}`)
  return step.state
}

function renderStep(id: string, title: string) {
  return render(<DefaultParametersView state={stepOf(id, title)} />)
}

const env = (id: string) => document.querySelector<HTMLElement>(`[data-env-id="${id}"]`)!
const lookupArea = () => screen.getByRole('region', { name: '찾기' })
const contextArea = () => screen.getByRole('region', { name: '실행 컨텍스트' })

describe('DefaultParametersView', () => {
  it('실행 전에는 전역 레코드만 보이고 실행 컨텍스트 칸에 "실행 전"을 보여 준다', () => {
    renderStep('param-scope', '실행 전')
    expect(contextArea()).toHaveTextContent('실행 중인 코드: 실행 전')
    expect(contextArea()).toHaveTextContent('LexicalEnvironment: 없음 (실행 전)')
    expect(document.querySelectorAll('[data-env-id]')).toHaveLength(1)
    expect(screen.getByText('이 단계에서 찾는 이름 없음')).toBeInTheDocument()
    expect(screen.queryByText('지금 실행 중')).not.toBeInTheDocument()
  })

  it('전역 레코드는 객체 칸만 그린다', () => {
    renderStep('param-scope', '실행 전')
    expect(env('global').querySelectorAll('[data-part="object"]')).toHaveLength(1)
    expect(env('global').querySelectorAll('[data-part="declarative"]')).toHaveLength(0)
    expect(env('global')).toHaveTextContent('객체 환경 레코드 (전역 객체의 프로퍼티)')
    expect(env('global')).toHaveTextContent('read = 함수')
  })

  it('실행 중인 코드와 LexicalEnvironment, "지금 실행 중" 배지를 글자로 보여 준다', () => {
    renderStep('param-scope', 'read() 호출: 매개변수 레코드')
    expect(contextArea()).toHaveTextContent('실행 중인 코드: read 호출')
    expect(contextArea()).toHaveTextContent('LexicalEnvironment: 매개변수 레코드')
    expect(screen.getAllByText('지금 실행 중')).toHaveLength(1)
    expect(within(env('params')).getByText('지금 실행 중')).toBeInTheDocument()
    expect(within(env('params')).getByText('새로 생김')).toBeInTheDocument()
  })

  it('레코드 종류 배지와 바깥 연결을 보여 준다', () => {
    renderStep('param-scope', '본문 var 레코드 생성')
    expect(within(env('global')).getByText('전역')).toBeInTheDocument()
    expect(within(env('params')).getByText('매개변수')).toBeInTheDocument()
    expect(within(env('vars')).getByText('본문 var')).toBeInTheDocument()
    expect(env('global')).toHaveTextContent('바깥: 없음 (null)')
    expect(env('params')).toHaveTextContent('바깥: 전역 환경 레코드')
    expect(env('vars')).toHaveTextContent('바깥: 매개변수 레코드')
  })

  it('초기화 전 바인딩은 값 대신 "초기화 전"으로 보인다', () => {
    renderStep('param-scope', 'read() 호출: 매개변수 레코드')
    const row = env('params').querySelector<HTMLElement>('[data-binding-name="get"]')!
    expect(row).toHaveTextContent('get = 초기화 전')
    expect(row).toHaveTextContent('바뀜')
  })

  it('함수 객체를 [[Environment]]로 가리키는 레코드 아래에 보여 준다', () => {
    renderStep('param-scope', '기본값 식 평가: 함수 생성')
    expect(env('params')).toHaveTextContent(
      '[[Environment]]로 가리키는 함수: 익명 함수(get의 기본값) (매개변수 get)',
    )
    expect(env('global')).not.toHaveTextContent('[[Environment]]로 가리키는 함수')
  })

  it('이름 찾기: get() 안의 탐색은 함수의 [[Environment]]부터 본문 var 레코드를 거치지 않는다', () => {
    renderStep('param-scope', 'get() 호출: 안의 x 탐색')
    expect(contextArea()).toHaveTextContent('실행 중인 코드: get 호출')
    expect(contextArea()).toHaveTextContent('LexicalEnvironment: 그리지 않음')
    const area = lookupArea()
    expect(area).toHaveTextContent('찾는 것: x')
    expect(area).toHaveTextContent('시작: 익명 함수(get의 기본값)의 [[Environment]]부터')
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(2)
    expect(path[0]).toHaveTextContent('매개변수 레코드')
    expect(path[0]).toHaveTextContent('없음')
    expect(path[0]).not.toHaveTextContent('찾음')
    expect(path[1]).toHaveTextContent('전역 환경 레코드')
    expect(path[1]).toHaveTextContent('찾음')
    expect(path[1]).toHaveTextContent('객체 칸')
    expect(area).toHaveTextContent("결과: 'outer'")
  })

  it('이름 찾기: context에서 시작하면 LexicalEnvironment 이름을 보여 준다', () => {
    renderStep('param-scope', '본문의 x 탐색')
    const area = lookupArea()
    expect(area).toHaveTextContent('시작: LexicalEnvironment(본문 var 레코드)부터')
    expect(within(area).getAllByRole('listitem')).toHaveLength(1)
    expect(area).toHaveTextContent("결과: 'body'")
  })

  it('바뀐 바인딩에는 색뿐 아니라 "바뀜" 글자도 붙는다', () => {
    renderStep('same-name-var', "x = 'body'")
    const row = env('vars').querySelector<HTMLElement>('[data-binding-name="x"]')!
    expect(row).toHaveAttribute('data-changed', 'true')
    expect(row).toHaveTextContent("x = 'body'")
    expect(screen.getAllByText('바뀜')).toHaveLength(1)
  })

  it('호출이 끝난 단계에는 전역 레코드만 남는다', () => {
    renderStep('same-name-var', 'demo 호출 끝')
    expect(document.querySelectorAll('[data-env-id]')).toHaveLength(1)
    expect(contextArea()).toHaveTextContent('실행 중인 코드: 전역 코드')
  })
})
