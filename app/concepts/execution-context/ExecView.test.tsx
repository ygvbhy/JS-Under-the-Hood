import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExecView } from './ExecView'
import { scenarios } from './scenarios'

function stepOf(id: string, title: string) {
  const step = scenarios.find((s) => s.id === id)!.steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계 없음: ${id} / ${title}`)
  return step.state
}

function renderStep(id: string, title: string) {
  return render(<ExecView state={stepOf(id, title)} />)
}

const ctx = (id: string) => document.querySelector<HTMLElement>(`[data-ctx-id="${id}"]`)!
const env = (id: string) =>
  document.querySelector<HTMLElement>(`[data-env-id="${id}"]:not([data-found])`)!
const stackItems = () =>
  within(screen.getByRole('region', { name: '실행 컨텍스트 스택' })).getAllByRole('listitem')
const lookupArea = () => screen.getByRole('region', { name: '찾기' })

describe('ExecView', () => {
  it('실행 전에는 빈 상태 문구를 보여 준다', () => {
    renderStep('lookup', '실행 전')
    expect(screen.getByText('실행 컨텍스트 없음 (실행 전)')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 환경 레코드가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 함수 객체가 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 단계에서 찾는 이름 없음')).toBeInTheDocument()
    expect(screen.queryByText('실행 중')).not.toBeInTheDocument()
  })

  it('스택은 맨 위(실행 중)부터 그리고 "실행 중" 배지는 맨 위에만 있다', () => {
    renderStep('stack', 'second() 호출: 컨텍스트 쌓기')
    expect(
      screen.getByText('위가 지금 실행 중, 아래로 갈수록 먼저 쌓인 컨텍스트'),
    ).toBeInTheDocument()
    const items = stackItems()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('second 실행 컨텍스트')
    expect(items[1]).toHaveTextContent('first 실행 컨텍스트')
    expect(items[2]).toHaveTextContent('전역 실행 컨텍스트')
    expect(items[0]).toHaveTextContent('실행 중')
    expect(items[1]).not.toHaveTextContent('실행 중')
    expect(items[2]).not.toHaveTextContent('실행 중')
    expect(screen.getAllByText('실행 중')).toHaveLength(1)
  })

  it('단계 배지: 쌓은 단계는 선언 처리, 다음 단계는 실행', () => {
    const { unmount } = renderStep('stack', 'first() 호출: 컨텍스트 쌓기')
    expect(within(ctx('first')).getByText('선언 처리')).toBeInTheDocument()
    expect(within(ctx('global')).getByText('실행')).toBeInTheDocument()
    unmount()
    renderStep('stack', '출력: first start')
    expect(within(ctx('first')).getByText('실행')).toBeInTheDocument()
    expect(within(ctx('first')).queryByText('선언 처리')).not.toBeInTheDocument()
  })

  it('컨텍스트 카드에 LexicalEnvironment와 VariableEnvironment가 가리키는 레코드를 보여 준다', () => {
    const { unmount } = renderStep('lookup', 'label 이름 찾기')
    expect(ctx('show')).toHaveTextContent('LexicalEnvironment → show 선언적 환경 레코드')
    expect(ctx('show')).toHaveTextContent('VariableEnvironment → show 함수 환경 레코드')
    unmount()
    // 블록 안에서는 LexicalEnvironment만 블록 레코드로 바뀐다.
    renderStep('block', '블록 안에서 x 찾기')
    expect(ctx('test')).toHaveTextContent('LexicalEnvironment → 블록 환경 레코드')
    expect(ctx('test')).toHaveTextContent('VariableEnvironment → test 함수 환경 레코드')
    expect(ctx('global')).toHaveTextContent('LexicalEnvironment → 전역 환경 레코드')
    expect(ctx('global')).toHaveTextContent('VariableEnvironment → 전역 환경 레코드')
    // 레코드 카드에도 실행 중 컨텍스트가 가리키는 쪽을 글자로 표시한다.
    expect(env('block')).toHaveTextContent('실행 중 컨텍스트의 LexicalEnvironment')
    expect(env('block')).not.toHaveTextContent('실행 중 컨텍스트의 VariableEnvironment')
    expect(env('test-fn')).toHaveTextContent('실행 중 컨텍스트의 VariableEnvironment')
    expect(env('test-fn')).not.toHaveTextContent('실행 중 컨텍스트의 LexicalEnvironment')
    expect(env('global')).not.toHaveTextContent('실행 중 컨텍스트의')
  })

  it('레코드 종류 배지 3가지(전역·함수·선언적)를 보여 준다', () => {
    renderStep('lookup', 'show() 호출: 컨텍스트 쌓기')
    expect(within(env('global')).getByText('전역')).toBeInTheDocument()
    expect(within(env('show-fn')).getByText('함수')).toBeInTheDocument()
    expect(within(env('show-lex')).getByText('선언적')).toBeInTheDocument()
  })

  it('전역 레코드는 객체 환경 레코드와 선언적 환경 레코드 두 칸으로 나눠 그린다', () => {
    renderStep('lookup', "run의 label에 'run'이 들어감")
    const global = env('global')
    const objectPart = global.querySelector<HTMLElement>('[data-part="object"]')!
    const declarativePart = global.querySelector<HTMLElement>('[data-part="declarative"]')!
    expect(objectPart).toHaveTextContent('객체 환경 레코드 (전역 객체의 프로퍼티)')
    expect(within(objectPart).getByText('show')).toBeInTheDocument()
    expect(within(objectPart).getByText('run')).toBeInTheDocument()
    expect(within(objectPart).queryByText('label')).not.toBeInTheDocument()
    expect(declarativePart).toHaveTextContent('선언적 환경 레코드')
    expect(within(declarativePart).getByText('label')).toBeInTheDocument()
    expect(within(declarativePart).queryByText('show')).not.toBeInTheDocument()
    expect(declarativePart).toHaveTextContent("label → 'global'")
    // 함수·선언적 레코드에는 두 칸이 없다.
    expect(document.querySelectorAll('[data-part]')).toHaveLength(2)
  })

  it('초기화 전 바인딩은 값 대신 "초기화 전"으로 보인다', () => {
    const { unmount } = renderStep('lookup', '전역 코드의 선언 처리')
    const row = env('global').querySelector<HTMLElement>('[data-binding-name="label"]')!
    expect(row).toHaveTextContent('label → 초기화 전')
    unmount()
    renderStep('lookup', "label에 'global'이 들어감")
    const after = env('global').querySelector<HTMLElement>('[data-binding-name="label"]')!
    expect(after).toHaveTextContent("label → 'global'")
    expect(after).not.toHaveTextContent('초기화 전')
  })

  it('this 값과 "this 바인딩 없음"을 보여 준다', () => {
    renderStep('this', 'arrow() 호출: 컨텍스트 쌓기')
    expect(env('global')).toHaveTextContent('this: 전역 객체')
    expect(env('regular-fn')).toHaveTextContent('this: 객체 obj')
    expect(env('arrow-fn')).toHaveTextContent('this 바인딩 없음')
    expect(env('arrow-fn')).not.toHaveTextContent('this:')
    // 선언적 레코드는 this 행이 없다.
    expect(env('arrow-lex')).not.toHaveTextContent('this')
  })

  it('바깥([[OuterEnv]]) 연결을 레코드 이름으로, 전역은 없음(null)으로 보여 준다', () => {
    renderStep('lookup', 'show() 호출: 컨텍스트 쌓기')
    expect(env('global')).toHaveTextContent('바깥([[OuterEnv]]): 없음(null)')
    // show의 바깥은 호출한 run이 아니라 정의한 전역이다.
    expect(env('show-fn')).toHaveTextContent('바깥([[OuterEnv]]): 전역 환경 레코드')
    expect(env('show-lex')).toHaveTextContent('바깥([[OuterEnv]]): show 함수 환경 레코드')
    expect(env('run-fn')).toHaveTextContent('바깥([[OuterEnv]]): 전역 환경 레코드')
  })

  it('함수 객체는 [[Environment]]가 가리키는 레코드 이름을 보여 준다', () => {
    const { unmount } = renderStep('lookup', 'show() 호출: 컨텍스트 쌓기')
    const fns = document.querySelectorAll<HTMLElement>('[data-fn-name]')
    expect(fns).toHaveLength(2)
    expect(fns[0]).toHaveTextContent('show → [[Environment]]: 전역 환경 레코드')
    expect(fns[1]).toHaveTextContent('run → [[Environment]]: 전역 환경 레코드')
    unmount()
    renderStep('this', 'arrow() 호출: 컨텍스트 쌓기')
    const arrow = document.querySelector<HTMLElement>('[data-fn-name="arrow"]')!
    expect(arrow).toHaveTextContent('arrow → [[Environment]]: regular 선언적 환경 레코드')
  })

  it('이름 찾기는 경로를 순서대로 보여 주고 찾은 레코드에 "찾음"과 칸을 표시한다', () => {
    renderStep('lookup', 'label 이름 찾기')
    const area = lookupArea()
    expect(area).toHaveTextContent('찾는 것: label')
    const path = within(area).getAllByRole('listitem')
    expect(path).toHaveLength(3)
    expect(path[0]).toHaveTextContent('show 선언적 환경 레코드')
    expect(path[1]).toHaveTextContent('show 함수 환경 레코드')
    expect(path[2]).toHaveTextContent('전역 환경 레코드')
    expect(within(area).getAllByText('찾음')).toHaveLength(1)
    expect(path[2]).toHaveTextContent('찾음')
    expect(path[2]).toHaveTextContent('선언적 칸')
    expect(path[0]).not.toHaveTextContent('찾음')
    // run의 레코드는 경로에 없다.
    expect(area).not.toHaveTextContent('run 선언적 환경 레코드')
    expect(area).toHaveTextContent("결과: 'global'")
  })

  it('this 찾기는 this 바인딩이 있는 레코드에서 멈추고 칸 표시는 없다', () => {
    renderStep('this', 'this 찾기')
    const area = lookupArea()
    expect(area).toHaveTextContent('찾는 것: this')
    const path = within(area).getAllByRole('listitem')
    expect(path.map((li) => li.getAttribute('data-env-id'))).toEqual([
      'arrow-lex',
      'arrow-fn',
      'regular-lex',
      'regular-fn',
    ])
    expect(path[3]).toHaveTextContent('찾음')
    expect(within(area).queryByText('선언적 칸')).not.toBeInTheDocument()
    expect(within(area).queryByText('객체 칸')).not.toBeInTheDocument()
    expect(area).toHaveTextContent('결과: 객체 obj')
  })

  it('전역 객체 칸에서 찾으면 "객체 칸"을 표시한다', () => {
    const lookups = scenarios.flatMap((s) =>
      s.steps.filter((st) => st.state.lookup?.part === 'object').map((st) => st.state),
    )
    // 시나리오에 객체 칸에서 찾는 단계가 있으면 확인하고, 없으면 같은 상태를 직접 만들어 확인한다.
    const base = stepOf('lookup', 'label 이름 찾기')
    const state = lookups[0] ?? {
      ...base,
      lookup: { ...base.lookup!, part: 'object' as const },
    }
    render(<ExecView state={state} />)
    expect(within(lookupArea()).getByText('객체 칸')).toBeInTheDocument()
    expect(within(lookupArea()).queryByText('선언적 칸')).not.toBeInTheDocument()
  })

  it('"새로 생김"과 "바뀜"은 그 단계의 항목에만 붙는다', () => {
    const { unmount } = renderStep('lookup', 'run() 호출: 컨텍스트 쌓기')
    expect(within(ctx('run')).getByText('새로 생김')).toBeInTheDocument()
    expect(within(ctx('global')).queryByText('새로 생김')).not.toBeInTheDocument()
    expect(within(env('run-fn')).getByText('새로 생김')).toBeInTheDocument()
    expect(within(env('run-lex')).getAllByText('새로 생김').length).toBeGreaterThan(0)
    expect(within(env('global')).queryByText('새로 생김')).not.toBeInTheDocument()
    expect(env('run-lex').querySelector('[data-binding-name="label"]')).toHaveTextContent('바뀜')
    expect(env('global').querySelector('[data-changed="true"]')).toBeNull()
    unmount()
    // 값만 바뀐 단계: 컨텍스트·레코드는 새로 생기지 않고 바인딩만 바뀜.
    renderStep('lookup', "run의 label에 'run'이 들어감")
    expect(screen.queryByText('새로 생김')).not.toBeInTheDocument()
    expect(screen.getAllByText('바뀜')).toHaveLength(1)
    expect(env('run-lex')).toHaveTextContent("label → 'run'")
  })
})
