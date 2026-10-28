import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlockView } from './BlockView'
import { scenarios } from './scenarios'

function renderStep(id: string, title: string) {
  const steps = scenarios.find((s) => s.id === id)!.steps
  const step = steps.find((s) => s.title === title)
  if (!step) throw new Error(`단계를 찾지 못함: ${id} / ${title}`)
  return render(<BlockView state={step.state} />)
}

const lookupRegion = () => screen.getByRole('region', { name: '이름 찾기' })
const scopesRegion = () => screen.getByRole('region', { name: '스코프' })
const card = (label: string) => within(scopesRegion()).getByText(label).closest('li')!
const row = (text: string) => within(scopesRegion()).getByText(text).closest('li')!
const pathLabels = () =>
  within(within(lookupRegion()).getByRole('list'))
    .getAllByRole('listitem')
    .map((li) => li.textContent)

describe('BlockView', () => {
  it('실행 전: 빈 상태 문구 2개를 보여 준다', () => {
    renderStep('block-var-let', '실행 전')
    expect(within(lookupRegion()).getByText('아직 코드를 실행하지 않았습니다.')).toBeInTheDocument()
    expect(within(scopesRegion()).getByText('아직 만들어진 스코프가 없습니다.')).toBeInTheDocument()
  })

  it('블록 진입: 블록 스코프 카드와 초기화 전 let, 전역 var를 구분해 보여 준다', () => {
    renderStep('block-var-let', '블록 진입')
    const block = card('if 블록 스코프')
    expect(within(block).getByText('블록')).toBeInTheDocument()
    expect(within(block).getByText('바깥 스코프: 전역 스코프')).toBeInTheDocument()
    expect(within(block).getByText('지금 실행 중')).toBeInTheDocument()
    const drink = row('drink')
    expect(within(drink).getByText('let')).toBeInTheDocument()
    expect(within(drink).getByText('초기화 전')).toBeInTheDocument()
    expect(within(drink).getByText('새로 생김')).toBeInTheDocument()
    const fruit = row('fruit = undefined')
    expect(within(fruit).getByText('var')).toBeInTheDocument()
    expect(within(fruit).getByText('전역 객체 프로퍼티')).toBeInTheDocument()
    expect(within(card('전역 스코프')).getByText('전역')).toBeInTheDocument()
  })

  it("drink에 '물'이 들어감: 값이 들어감 배지를 보여 준다", () => {
    renderStep('block-var-let', "drink에 '물'이 들어감")
    const drink = row("drink = '물'")
    expect(within(drink).getByText('값이 들어감')).toBeInTheDocument()
    expect(within(drink).getByText('문자열')).toBeInTheDocument()
  })

  it('암묵적 전역: 경로가 끝까지 실패하고 전역에 암묵적 전역 이름이 생긴다', () => {
    renderStep('implicit-global', '암묵적 전역: score에 100 대입')
    expect(pathLabels()).toEqual(['setScore 함수 스코프없음', '전역 스코프없음'])
    expect(within(lookupRegion()).getByText('끝까지 찾지 못했습니다.')).toBeInTheDocument()
    const score = row('score = 100')
    expect(within(score).getByText('암묵적 전역')).toBeInTheDocument()
    expect(within(score).getByText('전역 객체 프로퍼티')).toBeInTheDocument()
    expect(within(score).getByText('새로 생김')).toBeInTheDocument()
  })

  it('함수 안의 블록 진입: 빈 블록 카드는 이름이 없다고 하고 바깥은 함수 스코프다', () => {
    renderStep('function-block', '블록 진입')
    const block = card('if 블록 스코프')
    expect(within(block).getByText('이름이 없습니다.')).toBeInTheDocument()
    expect(within(block).getByText('바깥 스코프: pick 함수 스코프')).toBeInTheDocument()
  })

  it('찾는 이름이 없는 단계: 안내 문구를 보여 준다', () => {
    renderStep('block-var-let', '블록 진입')
    expect(
      within(lookupRegion()).getByText('이 단계에서는 이름을 찾지 않습니다.'),
    ).toBeInTheDocument()
    expect(within(lookupRegion()).queryByRole('list')).toBeNull()
  })
})
