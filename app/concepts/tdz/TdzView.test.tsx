import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TdzView } from './TdzView'
import { scenarios } from './scenarios'

function renderStep(id: string, title: string) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  const step = steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계를 찾지 못함: ${id} / ${title}`)
  return render(<TdzView state={step.state} />)
}

const lookupRegion = () => screen.getByRole('region', { name: '이름 찾기' })
const scopesRegion = () => screen.getByRole('region', { name: '스코프' })
const card = (label: string) => within(scopesRegion()).getByText(label).closest('li')!
const row = (text: string) => within(scopesRegion()).getByText(text).closest('li')!
const pathLabels = () =>
  within(within(lookupRegion()).getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.textContent)

describe('TdzView', () => {
  it('실행 전: 빈 상태 문구 2개를 보여 준다', () => {
    renderStep('let-before', '실행 전')
    expect(within(lookupRegion()).getByText('아직 코드를 실행하지 않았습니다.')).toBeInTheDocument()
    expect(within(scopesRegion()).getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
  })

  it('전역 선언 처리: let score는 이름과 초기화 전 배지로 보여 준다', () => {
    renderStep('let-before', '전역 선언 처리')
    const score = row('score')
    expect(within(score).getByText('let')).toBeInTheDocument()
    expect(within(score).getByText('초기화 전')).toBeInTheDocument()
    expect(within(score).getByText('새로 생김')).toBeInTheDocument()
    expect(within(card('전역 스코프')).getByText('전역')).toBeInTheDocument()
  })

  it('초기화 후: 값이 들어감 배지를 보여 준다', () => {
    renderStep('let-before', '6번 줄: score에 10')
    const score = row('score = 10')
    expect(within(score).getByText('값이 들어감')).toBeInTheDocument()
    expect(within(score).getByText('숫자')).toBeInTheDocument()
  })

  it('오류 단계: 블록 스코프에서 멈추고 ReferenceError 문구를 텍스트로 보여 준다', () => {
    renderStep('shadow', '4번 줄: color 읽기')
    expect(pathLabels()).toEqual(['if 블록 스코프있음: 초기화 전'])
    expect(
      within(lookupRegion()).getByText('if 블록 스코프에서 찾음 — 초기화 전이라 ReferenceError'),
    ).toBeInTheDocument()
  })

  it('오류가 없는 단계에는 ReferenceError 문구가 없다', () => {
    renderStep('shadow', '9번 줄: color 읽기')
    expect(within(lookupRegion()).queryByText(/ReferenceError/)).toBeNull()
  })

  it('함수 스코프: 바깥 스코프가 전역 스코프라고 보여 주고 경로가 바깥으로 이어진다', () => {
    renderStep('time-not-place', '2번 줄: count 읽기')
    const fn = card('show 함수 스코프')
    expect(within(fn).getByText('함수')).toBeInTheDocument()
    expect(within(fn).getByText('바깥 스코프: 전역 스코프')).toBeInTheDocument()
    expect(pathLabels()).toEqual(['show 함수 스코프없음', '전역 스코프있음: 초기화 전'])
    expect(
      within(lookupRegion()).getByText('전역 스코프에서 찾음 — 초기화 전이라 ReferenceError'),
    ).toBeInTheDocument()
  })

  it('찾는 이름이 없는 단계: 안내 문구를 보여 준다', () => {
    renderStep('let-before', '전역 선언 처리')
    expect(
      within(lookupRegion()).getByText('이 단계에서는 이름을 찾지 않습니다.'),
    ).toBeInTheDocument()
    expect(within(lookupRegion()).queryByRole('list')).toBeNull()
  })
})
