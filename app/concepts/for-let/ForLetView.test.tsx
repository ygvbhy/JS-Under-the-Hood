import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ForLetView } from './ForLetView'
import { scenarios } from './scenarios'

function stepOf(id: string, title: string, nth = 0) {
  const steps = scenarios.find((s) => s.id === id)!.steps.filter((s) => s.title === title)
  if (!steps[nth]) throw new Error(`단계 없음: ${id} / ${title} / ${nth}`)
  return steps[nth].state
}

function renderStep(id: string, title: string, nth = 0) {
  return render(<ForLetView state={stepOf(id, title, nth)} />)
}

const env = (id: string) => document.querySelector<HTMLElement>(`[data-env-id="${id}"]`)!
const lookupArea = () => screen.getByRole('region', { name: '찾기' })
const retainedIds = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-retained="true"]')).map((e) =>
    e.getAttribute('data-env-id'),
  )

describe('ForLetView', () => {
  it('실행 전에는 빈 상태 문구를 보여 준다', () => {
    renderStep('let', '실행 전')
    expect(screen.getByText('실행 컨텍스트 없음 (실행 전)')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 환경 레코드가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 찾는 이름 없음')).toBeInTheDocument()
    expect(screen.queryByText('지금 실행 중')).not.toBeInTheDocument()
    expect(screen.queryByText('남아 있음')).not.toBeInTheDocument()
  })

  it('전역 실행 컨텍스트와 LexicalEnvironment가 가리키는 레코드를 글자로 보여 주고 그 카드에만 "지금 실행 중"을 붙인다', () => {
    renderStep('let', '새 반복 레코드')
    const region = screen.getByRole('region', { name: '실행 컨텍스트' })
    expect(region).toHaveTextContent('전역 실행 컨텍스트')
    expect(region).toHaveTextContent('LexicalEnvironment: 2번째 반복 레코드')
    expect(screen.getAllByText('지금 실행 중')).toHaveLength(1)
    expect(within(env('iter2')).getByText('지금 실행 중')).toBeInTheDocument()
    expect(within(env('iter2')).getByText('새로 생김')).toBeInTheDocument()
  })

  it('레코드 종류 배지와 바깥 연결(전역은 없음 (null))을 보여 준다', () => {
    renderStep('let', '새 반복 레코드')
    expect(within(env('global')).getByText('전역')).toBeInTheDocument()
    expect(within(env('iter1')).getByText('반복')).toBeInTheDocument()
    expect(within(env('block1')).getByText('본문 블록')).toBeInTheDocument()
    expect(env('global')).toHaveTextContent('바깥: 없음 (null)')
    expect(env('iter2')).toHaveTextContent('바깥: 전역 환경 레코드')
    expect(env('block1')).toHaveTextContent('바깥: 1번째 반복 레코드')
  })

  it('머리 레코드 종류 배지를 보여 준다', () => {
    renderStep('let', 'for 머리: let i = 0')
    expect(within(env('loop')).getByText('반복 머리')).toBeInTheDocument()
    expect(env('loop')).toHaveTextContent('바깥: 전역 환경 레코드')
  })

  it('본문 블록 레코드는 "바인딩 없음"을 보여 준다', () => {
    renderStep('let', '본문 실행: fns[0]에 함수')
    expect(within(env('block1')).getByText('바인딩 없음')).toBeInTheDocument()
  })

  it('초기화 전 바인딩은 값 대신 "초기화 전"으로 보인다', () => {
    renderStep('let', '전역 코드의 선언 처리')
    const row = env('global').querySelector<HTMLElement>('[data-binding-name="fns"]')!
    expect(row).toHaveTextContent('fns = 초기화 전')
    expect(row).toHaveTextContent('바뀜')
  })

  it('전역 레코드는 객체 칸을 objectBindings가 있을 때만 그린다', () => {
    const { unmount } = renderStep('var', 'fns 초기화')
    const objectPart = env('global').querySelector<HTMLElement>('[data-part="object"]')!
    const declarativePart = env('global').querySelector<HTMLElement>('[data-part="declarative"]')!
    expect(objectPart).toHaveTextContent('객체 환경 레코드 (전역 객체의 프로퍼티)')
    expect(within(objectPart).getByText('i')).toBeInTheDocument()
    expect(within(declarativePart).getByText('fns')).toBeInTheDocument()
    unmount()
    renderStep('let', 'fns 초기화')
    expect(document.querySelectorAll('[data-part="object"]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-part="declarative"]')).toHaveLength(1)
  })

  it('"남아 있음"은 LexicalEnvironment에서 닿지 않는 레코드에만 붙고 닿는 함수를 보여 준다', () => {
    renderStep('let', '새 반복 레코드')
    expect(retainedIds()).toEqual(['iter1', 'block1'])
    expect(screen.getAllByText('남아 있음')).toHaveLength(2)
    expect(env('iter1')).toHaveTextContent('이 레코드에 닿는 함수: 익명 함수(fns[0])')
    expect(env('iter2')).not.toHaveTextContent('남아 있음')
    expect(env('global')).not.toHaveTextContent('이 레코드에 닿는 함수')
  })

  it('레코드 카드 아래에 그 레코드를 [[Environment]]로 가리키는 함수를 보여 준다', () => {
    renderStep('let', '새 반복 레코드')
    expect(env('block1')).toHaveTextContent(
      '[[Environment]]로 가리키는 함수: 익명 함수(fns[0]) (fns의 0 프로퍼티)',
    )
    expect(env('iter1')).not.toHaveTextContent('[[Environment]]로 가리키는 함수')
  })

  it('이름 찾기: context에서 시작하면 LexicalEnvironment 이름을 보여 준다', () => {
    renderStep('let', '조건 i < 3: 참')
    const area = lookupArea()
    expect(area).toHaveTextContent('찾는 것: i')
    expect(area).toHaveTextContent('시작: LexicalEnvironment(1번째 반복 레코드)부터')
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(1)
    expect(path[0]).toHaveTextContent('1번째 반복 레코드')
    expect(path[0]).toHaveTextContent('찾음')
    expect(area).toHaveTextContent('결과: 0')
  })

  it('이름 찾기: 함수 호출은 [[Environment]]부터 경로의 없음/찾음을 순서대로 보여 준다', () => {
    renderStep('let', 'fns[0]() 호출')
    const area = lookupArea()
    expect(area).toHaveTextContent('시작: 익명 함수(fns[0])의 [[Environment]]부터')
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(2)
    expect(path[0]).toHaveTextContent('1번째 본문 블록 레코드')
    expect(path[0]).toHaveTextContent('없음')
    expect(path[0]).not.toHaveTextContent('찾음')
    expect(path[1]).toHaveTextContent('1번째 반복 레코드')
    expect(path[1]).toHaveTextContent('찾음')
    expect(within(area).getAllByText('찾음')).toHaveLength(1)
    expect(area).toHaveTextContent('결과: 0')
  })

  it('이름 찾기: 전역 객체 칸에서 찾으면 칸 이름을 보여 준다', () => {
    renderStep('var', 'fns[0]() 호출')
    const area = lookupArea()
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(2)
    expect(path[0]).toHaveTextContent('없음')
    expect(path[1]).toHaveTextContent('전역 환경 레코드')
    expect(path[1]).toHaveTextContent('찾음')
    expect(path[1]).toHaveTextContent('객체 칸')
    expect(area).toHaveTextContent('결과: 3')
  })

  it('바뀐 바인딩에는 색뿐 아니라 "바뀜" 글자도 붙는다', () => {
    renderStep('let', '증가식 i++')
    const row = env('iter2').querySelector<HTMLElement>('[data-binding-name="i"]')!
    expect(row).toHaveAttribute('data-changed', 'true')
    expect(row).toHaveTextContent('i = 1')
    expect(row).toHaveTextContent('바뀜')
    expect(screen.getAllByText('바뀜')).toHaveLength(1)
  })
})
