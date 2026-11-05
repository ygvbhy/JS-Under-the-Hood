import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PromiseView } from './PromiseView'
import { scenarios } from './scenarios'

const chain = scenarios.find((s) => s.id === 'chain')!
const adopt = scenarios.find((s) => s.id === 'adopt')!

const jobItems = () =>
  within(screen.getByRole('list', { name: /^기다리는 Job/ }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

const cardOf = (name: string) => document.querySelector<HTMLElement>(`[data-promise="${name}"]`)!

describe('PromiseView', () => {
  it('첫 단계: 프로미스가 없고 Job 목록은 비어 있으며 "(바뀜)"이 없다', () => {
    render(<PromiseView state={chain.steps[0].state} />)
    expect(screen.getByText('지금 실행 중')).toBeInTheDocument()
    expect(screen.getByText('동기 코드')).toBeInTheDocument()
    expect(screen.getByText('아직 없음')).toBeInTheDocument()
    expect(jobItems()).toEqual(['비어 있음'])
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('상태를 색만이 아니라 텍스트(영문 상태 이름과 한국어)로 보여 준다', () => {
    // chain 마지막: p1·p2·p4 이행, p3 거부
    render(<PromiseView state={chain.steps.at(-1)!.state} />)
    expect(cardOf('p1')).toHaveTextContent('fulfilled (이행)')
    expect(cardOf('p1')).toHaveTextContent('결과 1')
    expect(cardOf('p3')).toHaveTextContent('rejected (거부)')
    expect(cardOf('p3')).toHaveTextContent('결과 Error: bad 2')
    expect(cardOf('p4')).toHaveTextContent('결과 undefined')
  })

  it('pending 프로미스는 상태와 등록된 반응을, 반응이 없으면 안내 문구를 보여 준다', () => {
    // 3단계 p2.then: p2는 pending이고 반응 둘, p3는 반응 없음
    const step = chain.steps[3]
    render(<PromiseView state={step.state} />)
    expect(cardOf('p2')).toHaveTextContent('pending (대기)')
    const reactions = within(screen.getByRole('list', { name: 'p2에 등록된 반응' })).getAllByRole(
      'listitem',
    )
    expect(reactions.map((li) => li.textContent)).toEqual([
      '이행되면 콜백 실행 → p3',
      '거부되면 사유를 그대로 → p3',
    ])
    expect(cardOf('p3')).toHaveTextContent('pending (대기)')
    expect(cardOf('p3')).toHaveTextContent('등록된 반응 없음')
    expect(cardOf('p2')).not.toHaveTextContent('결과')
  })

  it('이미 정해진 프로미스에는 반응 목록을 그리지 않는다', () => {
    render(<PromiseView state={chain.steps.at(-1)!.state} />)
    expect(screen.queryByRole('list', { name: /에 등록된 반응$/ })).toBeNull()
  })

  it('잠긴(locked in) 프로미스는 따라가는 대상과 함께 pending으로 보인다', () => {
    // adopt 7단계(0-based): outer가 inner를 따라가는 중
    const step = adopt.steps[7]
    render(<PromiseView state={step.state} />)
    expect(cardOf('outer')).toHaveTextContent('pending (대기)')
    expect(cardOf('outer')).toHaveTextContent('inner의 결과를 따라가는 중')
    expect(cardOf('inner')).toHaveTextContent('fulfilled (이행)')
  })

  it('Job은 넣은 순서대로, 맨 앞이 먼저 나온다', () => {
    // chain 2단계: Job 하나
    render(<PromiseView state={chain.steps[2].state} />)
    expect(jobItems()).toEqual(['반응 Job 1 (p1 → p2)'])
    expect(screen.getByRole('list', { name: /^기다리는 Job/ })).toHaveAccessibleName(
      '기다리는 Job (맨 앞이 먼저 실행)',
    )
  })

  it('Job을 실행 중인 단계는 지금 실행 중 칸에 Job 이름이 나오고 그 Job은 목록에서 빠진다', () => {
    const step = chain.steps[7]
    render(<PromiseView state={step.state} />)
    expect(screen.getByText('반응 Job 1 (p1 → p2)')).toBeInTheDocument()
    expect(jobItems()).toEqual(['반응 Job 2 (p2 → p3)'])
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다', () => {
    // 2단계(p1.then): 새 프로미스 p2 카드와 Job 목록이 달라진다. 지금 실행 중과 p1은 그대로
    render(<PromiseView state={chain.steps[2].state} prevState={chain.steps[1].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(2)
    expect(within(cardOf('p2')).getByText('(바뀜)')).toBeInTheDocument()
    expect(within(cardOf('p1')).queryByText('(바뀜)')).toBeNull()
    const jobSection = screen.getByText('기다리는 Job').closest('section')!
    expect(within(jobSection).getByText('(바뀜)')).toBeInTheDocument()
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    // chain 4→5단계(console.log): 출력만 늘고 상태는 그대로다
    render(<PromiseView state={chain.steps[5].state} prevState={chain.steps[4].state} />)
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('프로미스가 정해지면 그 카드와 Job 칸, 지금 실행 중에 "(바뀜)"이 붙는다', () => {
    // chain 7단계(Job 1): 지금 실행 중, p2 카드(pending → fulfilled), Job 목록
    render(<PromiseView state={chain.steps[7].state} prevState={chain.steps[6].state} />)
    expect(screen.getAllByText('(바뀜)')).toHaveLength(3)
    expect(within(cardOf('p2')).getByText('(바뀜)')).toBeInTheDocument()
  })
})
