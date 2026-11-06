import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModuleGraphView } from './ModuleGraphView'
import { scenarios } from './scenarios'

const live = scenarios.find((s) => s.id === 'live')!
const cycle = scenarios.find((s) => s.id === 'cycle')!
const stepOf = (steps: typeof live.steps, title: string) => steps.find((s) => s.title === title)!
const indexOf = (steps: typeof live.steps, title: string) =>
  steps.findIndex((s) => s.title === title)

const card = (file: string) => screen.getByRole('region', { name: `모듈 ${file}` })
const bindingsOf = (file: string) =>
  within(card(file)).getByRole('list', { name: `${file}의 바인딩` })

describe('ModuleGraphView', () => {
  it('첫 단계: 단계 띠에 로드가 현재 단계로 표시되고 모듈 카드에 바인딩이 없다', () => {
    render(<ModuleGraphView state={live.steps[0].state} />)
    const phases = within(screen.getByRole('list', { name: '모듈 처리 단계' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(phases).toEqual(['로드(현재 단계)', '링크', '평가'])
    expect(card('main(인라인)')).toHaveTextContent('상태: 로드됨')
    expect(bindingsOf('main(인라인)')).toHaveTextContent('바인딩 없음')
    expect(screen.queryByText('(바뀜)')).toBeNull()
    expect(screen.queryByLabelText('지금 실행 중인 코드')).toBeNull()
  })

  it('링크 단계: main의 import는 counter.js의 바인딩을 가리키고 대상 값을 글자로 보인다', () => {
    render(<ModuleGraphView state={stepOf(live.steps, '링크: 바인딩 만들기').state} />)
    expect(bindingsOf('main(인라인)')).toHaveTextContent('count → counter.js의 count')
    expect(bindingsOf('main(인라인)')).toHaveTextContent('지금 값: 초기화 전')
    expect(bindingsOf('main(인라인)')).toHaveTextContent('inc → counter.js의 inc')
    expect(bindingsOf('main(인라인)')).toHaveTextContent('지금 값: 함수 inc')
    expect(bindingsOf('counter.js')).toHaveTextContent('count = 초기화 전')
    expect(bindingsOf('counter.js')).toHaveTextContent('inc = 함수 inc')
  })

  it('count를 바꾸면 main의 지금 값이 대상을 따라가고 (바뀜)은 counter.js의 칸에만 붙는다', () => {
    const k = indexOf(live.steps, 'inc() 호출: count += 1')
    render(<ModuleGraphView state={live.steps[k].state} prevState={live.steps[k - 1].state} />)
    expect(bindingsOf('main(인라인)')).toHaveTextContent('지금 값: 1')
    expect(screen.getAllByText('(바뀜)')).toHaveLength(1)
    expect(within(bindingsOf('counter.js')).getByText('(바뀜)')).toBeInTheDocument()
    expect(within(bindingsOf('main(인라인)')).queryByText('(바뀜)')).toBeNull()
  })

  it('running이 있으면 실행 중인 파일과 코드를 보인다', () => {
    const k = indexOf(live.steps, 'inc() 호출: count += 1')
    render(<ModuleGraphView state={live.steps[k].state} />)
    const running = screen.getByLabelText('지금 실행 중인 코드')
    expect(running).toHaveTextContent('counter.js에서 실행 중')
    expect(running).toHaveTextContent('count += 1;')
  })

  it('순환: ReferenceError 단계에서 value가 초기화 전으로 보인다', () => {
    render(<ModuleGraphView state={stepOf(cycle.steps, 'console.log(value): 초기화 전').state} />)
    expect(bindingsOf('cycle-b.js')).toHaveTextContent('value → cycle-a.js의 value')
    expect(bindingsOf('cycle-b.js')).toHaveTextContent('지금 값: 초기화 전')
    expect(bindingsOf('cycle-b.js')).toHaveTextContent('지금 값: 함수 hello')
    expect(card('cycle-a.js')).toHaveTextContent('상태: 평가 중')
  })

  it('순환: a의 value가 초기화되면 b의 import가 같은 값을 가리킨다', () => {
    render(<ModuleGraphView state={stepOf(cycle.steps, "cycle-a.js: value = 'a의 값'").state} />)
    expect(bindingsOf('cycle-a.js')).toHaveTextContent("value = 'a의 값'")
    expect(bindingsOf('cycle-b.js')).toHaveTextContent("지금 값: 'a의 값'")
  })

  it('출력만 달라진 단계에는 (바뀜)이 없다', () => {
    const k = indexOf(live.steps, 'console.log(count)')
    render(<ModuleGraphView state={live.steps[k].state} prevState={live.steps[k - 1].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })
})
