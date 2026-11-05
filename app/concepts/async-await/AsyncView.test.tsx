import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AsyncView } from './AsyncView'
import { scenarios } from './scenarios'

const basic = scenarios.find((s) => s.id === 'basic')!
const inter = scenarios.find((s) => s.id === 'interleave')!
const stepOf = (steps: typeof basic.steps, title: string) => steps.find((s) => s.title === title)!

const listItems = (name: RegExp) =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((li) => li.textContent)
const sectionOf = (title: string) => screen.getByText(title).closest('section')!

describe('AsyncView', () => {
  it('첫 단계: 스택에 전역 코드만, 호출·프로미스 없음, Job 큐 비어 있음, "(바뀜)" 없음', () => {
    render(<AsyncView state={basic.steps[0].state} />)
    expect(listItems(/^실행 컨텍스트 스택/)).toEqual(['전역 코드'])
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent('없음')
    expect(screen.getByRole('list', { name: /^프로미스 \(/ })).toHaveTextContent('없음')
    expect(screen.getByRole('list', { name: /^프로미스 Job 큐/ })).toHaveTextContent('비어 있음')
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('스택은 위(지금 실행 중)가 먼저 나온다', () => {
    render(<AsyncView state={basic.steps[1].state} />)
    expect(listItems(/^실행 컨텍스트 스택/)).toEqual(['work 본문', '전역 코드'])
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveAccessibleName(
      '실행 컨텍스트 스택 (위가 지금 실행 중)',
    )
  })

  it('스택이 비면 "비어 있음"을 보여 준다', () => {
    render(<AsyncView state={stepOf(basic.steps, '동기 코드 끝').state} />)
    expect(screen.getByRole('list', { name: /^실행 컨텍스트 스택/ })).toHaveTextContent('비어 있음')
  })

  it('async 함수 호출의 상태를 실행 중 / await에서 멈춤 / 끝남으로 보여 준다', () => {
    const { unmount } = render(<AsyncView state={basic.steps[1].state} />)
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent('work()')
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent(
      '상태: 실행 중',
    )
    unmount()
    const { unmount: unmount2 } = render(
      <AsyncView state={stepOf(basic.steps, 'await null').state} />,
    )
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent(
      '상태: await에서 멈춤',
    )
    unmount2()
    render(<AsyncView state={basic.steps.at(-1)!.state} />)
    expect(screen.getByRole('list', { name: /^async 함수 호출/ })).toHaveTextContent('상태: 끝남')
  })

  it('프로미스의 상태, 결과, 등록된 반응을 보여 준다', () => {
    const { unmount } = render(<AsyncView state={stepOf(basic.steps, 'p.then(...)').state} />)
    const list = screen.getByRole('list', { name: /^프로미스 \(/ })
    expect(list).toHaveTextContent('p')
    expect(list).toHaveTextContent('상태: pending')
    expect(list).toHaveTextContent('등록된 반응: then 콜백')
    unmount()
    render(<AsyncView state={basic.steps.at(-1)!.state} />)
    const done = screen.getByRole('list', { name: /^프로미스 \(/ })
    expect(done).toHaveTextContent("상태: fulfilled ('done')")
    expect(done).toHaveTextContent('등록된 반응: 없음')
  })

  it('Job 큐는 넣은 순서대로 맨 앞이 먼저 나온다', () => {
    render(<AsyncView state={stepOf(inter.steps, '동기 코드 끝').state} />)
    expect(listItems(/^프로미스 Job 큐/)).toEqual(['task 재개', 'then 1 콜백'])
    expect(screen.getByRole('list', { name: /^프로미스 Job 큐/ })).toHaveAccessibleName(
      '프로미스 Job 큐 (맨 앞이 먼저 실행)',
    )
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // await null 단계: 스택, 호출 상태, Job 큐가 바뀌고 프로미스는 그대로
    const k = basic.steps.findIndex((s) => s.title === 'await null')
    render(<AsyncView state={basic.steps[k].state} prevState={basic.steps[k - 1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(3)
    expect(within(sectionOf('프로미스')).queryByText('(바뀜)')).toBeNull()
    expect(within(sectionOf('프로미스 Job 큐')).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    const k = basic.steps.findIndex((s) => s.title === "console.log('a2')")
    render(<AsyncView state={basic.steps[k].state} prevState={basic.steps[k - 1].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })
})
