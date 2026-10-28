import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScopeView } from './ScopeView'
import { scenarios } from './scenarios'

function renderStep(id: string, title: string) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  const step = steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계를 찾지 못함: ${id} / ${title}`)
  return render(<ScopeView state={step.state} />)
}

const lookupRegion = () => screen.getByRole('region', { name: '이름 찾기' })
const scopesRegion = () => screen.getByRole('region', { name: '스코프' })
const card = (label: string) => within(scopesRegion()).getByText(label).closest('li')!
const pathLabels = () =>
  within(within(lookupRegion()).getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.textContent)

describe('ScopeView', () => {
  it('실행 전: 빈 상태 문구 2개를 보여 준다', () => {
    renderStep('scope-chain', '실행 전')
    expect(within(lookupRegion()).getByText('아직 코드를 실행하지 않았습니다.')).toBeInTheDocument()
    expect(within(scopesRegion()).getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('지금 실행 중')).toBeNull()
  })

  it('scope-chain city 읽기: 경로가 inner → outer → 전역 순서이고 전역에서 찾는다', () => {
    renderStep('scope-chain', 'city 읽기')
    const region = lookupRegion()
    expect(within(region).getByText('city')).toBeInTheDocument()
    expect(region).toHaveTextContent('읽기')
    expect(pathLabels()).toEqual([
      'inner 함수 스코프없음',
      'outer 함수 스코프없음',
      "전역 스코프있음: '서울'",
    ])
    const inner = card('inner 함수 스코프')
    expect(within(inner).getByText('바깥 스코프: outer 함수 스코프')).toBeInTheDocument()
    expect(within(inner).getByText('지금 실행 중')).toBeInTheDocument()
    expect(within(scopesRegion()).getAllByText('지금 실행 중')).toHaveLength(1)
    const global = card('전역 스코프')
    expect(within(global).getByText('바깥 스코프: 없음 (가장 바깥)')).toBeInTheDocument()
    expect(within(lookupRegion()).queryByText('끝까지 찾지 못했습니다.')).toBeNull()
  })

  it('lexical-scope level 읽기: 경로는 show → 전역뿐이고 run 스코프는 경로에 없다', () => {
    renderStep('lexical-scope', 'level 읽기')
    expect(pathLabels()).toHaveLength(2)
    expect(pathLabels()).toEqual(['show 함수 스코프없음', "전역 스코프있음: '전역'"])
    const show = card('show 함수 스코프')
    expect(within(show).getByText('바깥 스코프: 전역 스코프')).toBeInTheDocument()
    const run = card('run 함수 스코프')
    expect(run).toBeInTheDocument()
    expect(within(lookupRegion()).queryByText('run 함수 스코프')).toBeNull()
    expect(show.className).toContain('bg-highlight')
    expect(run.className).not.toContain('bg-highlight')
  })

  it('changed 배지: 대입 단계는 "값이 바뀜", 호출 시작 단계는 "새로 생김"', () => {
    const { unmount } = renderStep('scope-chain', "area에 '마포' 대입")
    const row = within(scopesRegion()).getByText("area = '마포'").closest('li')!
    expect(within(row).getByText('값이 바뀜')).toBeInTheDocument()
    expect(within(row).getByText('문자열')).toBeInTheDocument()
    expect(lookupRegion()).toHaveTextContent('대입')
    unmount()
    renderStep('scope-chain', '호출 시작: outer')
    const created = within(scopesRegion()).getByText('area = undefined').closest('li')!
    expect(within(created).getByText('새로 생김')).toBeInTheDocument()
    expect(within(created).getByText('undefined')).toBeInTheDocument()
  })

  it('scope-chain 마지막 단계: 끝까지 찾지 못했다고 알려 준다', () => {
    const steps = scenarios.find((s) => s.id === 'scope-chain')!.steps
    render(<ScopeView state={steps[steps.length - 1].state} />)
    expect(pathLabels()).toEqual(['전역 스코프없음'])
    expect(within(lookupRegion()).getByText('끝까지 찾지 못했습니다.')).toBeInTheDocument()
  })

  it('찾는 이름이 없는 단계: 안내 문구를 보여 준다', () => {
    renderStep('scope-chain', '호출 시작: outer')
    expect(
      within(lookupRegion()).getByText('이 단계에서는 이름을 찾지 않습니다.'),
    ).toBeInTheDocument()
    expect(within(lookupRegion()).queryByRole('list')).toBeNull()
  })
})
