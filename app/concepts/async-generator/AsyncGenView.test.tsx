import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AsyncGenView } from './AsyncGenView'
import { scenarios } from './scenarios'

const queue = scenarios.find((s) => s.id === 'queue')!
const brk = scenarios.find((s) => s.id === 'break')!
const stepOf = (steps: typeof queue.steps, title: string) => steps.find((s) => s.title === title)!

const listItems = (name: RegExp) =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)
const sectionOf = (title: string) => screen.getByText(title).closest('section')!

describe('AsyncGenView', () => {
  it('첫 단계: suspended-start, 큐·프로미스·Job 없음, "(바뀜)" 없음', () => {
    render(<AsyncGenView state={queue.steps[0].state} />)
    expect(screen.getByRole('group', { name: /^async 제너레이터 상태/ })).toHaveTextContent(
      '상태: suspended-start',
    )
    expect(screen.getByRole('list', { name: /^요청 큐/ })).toHaveTextContent('비어 있음')
    expect(screen.getByRole('list', { name: /^프로미스 \(/ })).toHaveTextContent('없음')
    expect(screen.getByRole('list', { name: /^프로미스 Job 큐/ })).toHaveTextContent('비어 있음')
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('요청 큐는 맨 앞이 먼저 나오고 요청이 3개 쌓인 단계가 있다', () => {
    render(<AsyncGenView state={stepOf(queue.steps, 'p2.then 등록, var p3 = it.next()').state} />)
    expect(listItems(/^요청 큐/)).toEqual(['요청 1', '요청 2', '요청 3'])
    expect(screen.getByRole('list', { name: /^요청 큐/ })).toHaveAccessibleName(
      '요청 큐 (맨 앞이 먼저 처리)',
    )
    expect(screen.getByRole('group', { name: /^async 제너레이터 상태/ })).toHaveTextContent(
      '상태: executing',
    )
  })

  it('프로미스의 상태와 결과를 보여 준다', () => {
    const { unmount } = render(<AsyncGenView state={queue.steps[0].state} />)
    unmount()
    render(<AsyncGenView state={queue.steps.at(-1)!.state} />)
    const list = screen.getByRole('list', { name: /^프로미스 \(/ })
    expect(list).toHaveTextContent("상태: fulfilled ({ value: 'a', done: false })")
    expect(list).toHaveTextContent('상태: fulfilled ({ value: undefined, done: true })')
    expect(screen.getByRole('group', { name: /^async 제너레이터 상태/ })).toHaveTextContent(
      '상태: completed',
    )
  })

  it('Job 큐는 넣은 순서대로 맨 앞이 먼저 나온다', () => {
    render(<AsyncGenView state={stepOf(queue.steps, "yield 'b'의 await").state} />)
    expect(listItems(/^프로미스 Job 큐/)).toEqual(['1번 콜백', 'gen 재개'])
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // 요청 1 완료 단계: 상태·실행 중인 곳은 그대로 executing이지만 큐, 프로미스, Job 큐가 바뀐다
    const k = queue.steps.findIndex((s) => s.title === 'Job: 재개, 요청 1 완료')
    render(<AsyncGenView state={queue.steps[k].state} prevState={queue.steps[k - 1].state} />)
    expect(within(sectionOf('요청 큐')).getByText('(바뀜)')).toBeInTheDocument()
    expect(within(sectionOf('프로미스')).getByText('(바뀜)')).toBeInTheDocument()
    expect(within(sectionOf('프로미스 Job 큐')).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    const k = queue.steps.findIndex((s) => s.title === "console.log('a 뒤')")
    render(<AsyncGenView state={queue.steps[k].state} prevState={queue.steps[k - 1].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('break 시나리오에서 suspended-yield와 draining-queue를 모두 보여 준다', () => {
    const yielded = brk.steps.find((s) => s.state.genState === 'suspended-yield')!
    const { unmount } = render(<AsyncGenView state={yielded.state} />)
    expect(screen.getByRole('group', { name: /^async 제너레이터 상태/ })).toHaveTextContent(
      'yield에서 멈춤',
    )
    unmount()
    const draining = brk.steps.find((s) => s.state.genState === 'draining-queue')!
    render(<AsyncGenView state={draining.state} />)
    expect(screen.getByRole('group', { name: /^async 제너레이터 상태/ })).toHaveTextContent(
      '본문 없이 끝내는 중',
    )
  })
})
