import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AllLedgerView } from './AllLedgerView'
import { scenarios } from './scenarios'

const inputOrder = scenarios.find((s) => s.id === 'input-order')!
const keepsGoing = scenarios.find((s) => s.id === 'keeps-going')!

const jobItems = () =>
  within(screen.getByRole('list', { name: /^기다리는 Job/ }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

const rowOf = (index: number) => document.querySelector<HTMLElement>(`[data-element="${index}"]`)!

describe('AllLedgerView', () => {
  it('첫 단계: 결과 프로미스와 남은 개수가 없고 장부 표 대신 안내를 보여 주며 "(바뀜)"이 없다', () => {
    render(<AllLedgerView state={inputOrder.steps[0].state} />)
    expect(screen.getByText('지금 실행 중')).toBeInTheDocument()
    expect(screen.getByText('동기 코드')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '결과 프로미스' })).toHaveTextContent('아직 없음')
    expect(screen.getByRole('region', { name: '남은 개수' })).toHaveTextContent('아직 없음')
    expect(screen.queryByRole('table')).toBeNull()
    expect(jobItems()).toEqual(['비어 있음'])
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('요소 장부는 caption과 열 머리글이 있는 표이고, 가로 스크롤 영역(region, 포커스 가능)에 담긴다', () => {
    render(<AllLedgerView state={inputOrder.steps[6].state} />)
    const table = screen.getByRole('table', { name: /요소 장부/ })
    expect(table.querySelector('caption')).not.toBeNull()
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['자리 번호', '요소', '요소 프로미스 상태', '요소 함수 호출 여부', 'values 칸'])
    const region = screen.getByRole('region', { name: /요소 장부 표/ })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveClass('overflow-x-auto')
    expect(region).toContainElement(table)
  })

  it('요소 행에 자리 번호, 요소, 상태, 호출 여부, values 칸을 텍스트로 보여 준다', () => {
    // input-order 14단계(0-based 13): 자리 2의 요소 함수만 불림
    render(<AllLedgerView state={inputOrder.steps[13].state} />)
    expect(rowOf(0)).toHaveTextContent('0')
    expect(rowOf(0)).toHaveTextContent('fulfilled (이행)')
    expect(rowOf(0)).toHaveTextContent('아직 (false)')
    expect(rowOf(0)).toHaveTextContent('비어 있음 (undefined)')
    expect(rowOf(2)).toHaveTextContent("'c'")
    expect(rowOf(2)).toHaveTextContent('불림 (true)')
    expect(rowOf(2)).toHaveTextContent("'c'")
    expect(screen.getByRole('region', { name: '남은 개수' })).toHaveTextContent('2')
  })

  it('거부된 요소와 결과 프로미스는 상태와 결과를 텍스트로 보여 준다', () => {
    render(<AllLedgerView state={keepsGoing.steps.at(-1)!.state} />)
    expect(rowOf(1)).toHaveTextContent('rejected (거부)')
    expect(rowOf(1)).toHaveTextContent('비어 있음 (undefined)')
    expect(rowOf(0)).toHaveTextContent("'A'")
    const result = screen.getByRole('region', { name: '결과 프로미스' })
    expect(result).toHaveTextContent('rejected (거부)')
    expect(result).toHaveTextContent('결과 Error: b failed')
    expect(screen.getByRole('region', { name: '남은 개수' })).toHaveTextContent('1')
  })

  it('Job은 넣은 순서대로, 맨 앞이 먼저 나온다', () => {
    render(<AllLedgerView state={inputOrder.steps[11].state} />)
    expect(jobItems()).toEqual([
      '요소 함수 Job (자리 2)',
      '요소 함수 Job (자리 1)',
      '요소 함수 Job (자리 0)',
    ])
  })

  it('내용이 달라진 칸에만 "(바뀜)"을 붙인다 (새 요소: 자리 번호 칸, 남은 개수)', () => {
    // 3→4단계(a 등록): 새 행, values 칸 추가, 남은 개수 1→2. 결과·Job·실행 중은 그대로
    render(
      <AllLedgerView state={inputOrder.steps[3].state} prevState={inputOrder.steps[2].state} />,
    )
    expect(within(rowOf(0)).getAllByText('(바뀜)')).toHaveLength(1)
    expect(
      within(screen.getByRole('region', { name: '남은 개수' })).getByText('(바뀜)'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: '결과 프로미스' })).queryByText('(바뀜)'),
    ).toBeNull()
    expect(screen.getAllByText('(바뀜)')).toHaveLength(2)
  })

  it('요소 함수 Job 단계: 호출 여부·values 칸·남은 개수·지금 실행 중·Job 칸에 "(바뀜)"이 붙는다', () => {
    // 13→14단계: 자리 2의 요소 함수가 불림
    render(
      <AllLedgerView state={inputOrder.steps[13].state} prevState={inputOrder.steps[12].state} />,
    )
    expect(within(rowOf(2)).getAllByText('(바뀜)')).toHaveLength(2)
    expect(within(rowOf(0)).queryByText('(바뀜)')).toBeNull()
    expect(
      within(screen.getByRole('region', { name: '남은 개수' })).getByText('(바뀜)'),
    ).toBeInTheDocument()
    // 지금 실행 중, 남은 개수, 두 행 칸, Job 칸
    expect(screen.getAllByText('(바뀜)')).toHaveLength(5)
  })

  it('출력만 달라진 단계에는 "(바뀜)"이 없다', () => {
    // input-order 9→10단계(console.log): 출력만 늘고 상태는 그대로다
    render(
      <AllLedgerView state={inputOrder.steps[9].state} prevState={inputOrder.steps[8].state} />,
    )
    expect(screen.queryByText('(바뀜)')).toBeNull()
  })

  it('결과가 이행되는 단계: 결과 프로미스 칸에 "(바뀜)"과 이행 결과가 나온다', () => {
    render(
      <AllLedgerView state={inputOrder.steps[15].state} prevState={inputOrder.steps[14].state} />,
    )
    const result = screen.getByRole('region', { name: '결과 프로미스' })
    expect(within(result).getByText('(바뀜)')).toBeInTheDocument()
    expect(result).toHaveTextContent('fulfilled (이행)')
    expect(result).toHaveTextContent(`[ 'A', 'B', 'c' ]`)
  })
})
