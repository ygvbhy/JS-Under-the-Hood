import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EvaluationView } from './EvaluationView'
import { scenarios } from './scenarios'
import type { EvalState } from './scenarios'

function stateOf(scenarioId: string, index: number): EvalState {
  const scenario = scenarios.find((s) => s.id === scenarioId)!
  return scenario.steps[index].state
}

describe('EvaluationView', () => {
  it('빈 상태에서는 두 영역의 빈 상태 문구를 보여 준다', () => {
    render(<EvaluationView state={{ bindings: [] }} />)
    expect(screen.getByText('평가 중인 식')).toBeInTheDocument()
    expect(screen.getByText('변수')).toBeInTheDocument()
    expect(screen.getByText('아직 평가 중인 식이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('아직 표시할 변수가 없습니다.')).toBeInTheDocument()
  })

  it('두 영역은 제목으로 이름 붙은 region이다', () => {
    render(<EvaluationView state={{ bindings: [] }} />)
    expect(screen.getByRole('region', { name: '평가 중인 식' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '변수' })).toBeInTheDocument()
  })

  it('평가 중 단계: 식 전체와 조각별 배지, 큰따옴표가 붙은 값, 판정 문구를 보여 준다', () => {
    // logical-result 2단계: 0 || 'hello' — 왼쪽 평가(falsy), 오른쪽은 아직 평가 전
    render(<EvaluationView state={stateOf('logical-result', 1)} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    expect(within(region).getByText("0 || 'hello'")).toBeInTheDocument()
    const items = within(region).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    // 조각 코드 0과 평가한 값 0
    expect(within(items[0]).getAllByText('0')).toHaveLength(2)
    expect(within(items[0]).getByText('평가함')).toBeInTheDocument()
    expect(within(items[0]).getByText('판정: falsy')).toBeInTheDocument()
    expect(within(items[1]).getByText("'hello'")).toBeInTheDocument()
    expect(within(items[1]).getByText('아직 평가 전')).toBeInTheDocument()
    expect(within(region).queryByText(/^결과:/)).not.toBeInTheDocument()
  })

  it('결과가 정해진 단계: 문자열 값은 큰따옴표, 결과를 "결과: 값"으로 보여 준다', () => {
    // logical-result 3단계: 0 || 'hello' → 'hello'
    render(<EvaluationView state={stateOf('logical-result', 2)} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    const items = within(region).getAllByRole('listitem')
    expect(within(items[1]).getByText('평가함')).toBeInTheDocument()
    expect(within(items[1]).getByText('"hello"')).toBeInTheDocument()
    const result = within(region).getByText('결과:').closest('p')!
    expect(result).toHaveTextContent('결과: "hello"')
  })

  it('평가 안 함 조각은 배지 텍스트와 취소선, 값이 없다', () => {
    // logical-result 4단계: 'hi' || 'hello' → 오른쪽은 평가하지 않음
    render(<EvaluationView state={stateOf('logical-result', 4)} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    const item = within(region).getByText('평가 안 함').closest('li')!
    const code = within(item).getByText("'hello'")
    expect(code).toHaveClass('line-through')
    expect(code).toHaveClass('text-muted')
    expect(within(item).queryByText('값')).not.toBeInTheDocument()
    expect(within(item).queryByText('평가함')).not.toBeInTheDocument()
    // 평가한 조각은 취소선이 없다
    const first = within(region).getAllByRole('listitem')[0]
    expect(within(first).getByText("'hi'")).not.toHaveClass('line-through')
  })

  it('빈 문자열은 ""로 보인다', () => {
    // nullish 7단계: title ?? '제목 없음' — title은 빈 문자열
    const state = stateOf('nullish', 6)
    render(<EvaluationView state={state} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    const items = within(region).getAllByRole('listitem')
    expect(within(items[0]).getByText('""')).toBeInTheDocument()
    expect(within(items[0]).getByText('판정: null·undefined 아님')).toBeInTheDocument()
    expect(within(region).getByText('결과:').closest('p')).toHaveTextContent('결과: ""')
  })

  it('판정 문구 매핑: nullish → "null 또는 undefined"', () => {
    // nullish 9단계: memo ?? '메모 없음' — memo는 undefined
    render(<EvaluationView state={stateOf('nullish', 8)} />)
    expect(screen.getByText('판정: null 또는 undefined')).toBeInTheDocument()
  })

  it('판정 문구 매핑: truthy, falsy, not-nullish', () => {
    const base = { code: 'x', status: 'evaluated' as const }
    const val = { type: 'number' as const, display: '1' }
    render(
      <EvaluationView
        state={{
          bindings: [],
          evaluation: {
            code: 'x',
            operator: '&&',
            parts: [
              { ...base, value: val, check: 'truthy' },
              { ...base, value: val, check: 'falsy' },
              { ...base, value: val, check: 'not-nullish' },
            ],
          },
        }}
      />,
    )
    expect(screen.getByText('판정: truthy')).toBeInTheDocument()
    expect(screen.getByText('판정: falsy')).toBeInTheDocument()
    expect(screen.getByText('판정: null·undefined 아님')).toBeInTheDocument()
  })

  it('?. 체인: 건너뛴 조각이 모두 평가 안 함이고 결과는 undefined다', () => {
    // optional-chaining 6단계: guest?.profile.age
    render(<EvaluationView state={stateOf('optional-chaining', 5)} />)
    const region = screen.getByRole('region', { name: '평가 중인 식' })
    expect(within(region).getAllByText('평가 안 함')).toHaveLength(2)
    expect(within(region).getByText('?.profile')).toHaveClass('line-through')
    expect(within(region).getByText('.age')).toHaveClass('line-through')
    expect(within(region).getByText('판정: null 또는 undefined')).toBeInTheDocument()
    expect(within(region).getByText('결과:').closest('p')).toHaveTextContent('결과: undefined')
  })

  it('changed 변수는 const/let 배지와 "새로 생김" 배지와 강조 배경을 가진다', () => {
    // nullish 2단계: 변수 세 개를 선언
    render(<EvaluationView state={stateOf('nullish', 1)} />)
    const region = screen.getByRole('region', { name: '변수' })
    const items = within(region).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('const')).toBeInTheDocument()
    expect(within(items[0]).getByText('count')).toBeInTheDocument()
    expect(within(items[0]).getByText('0')).toBeInTheDocument()
    expect(within(items[0]).getByText('새로 생김')).toBeInTheDocument()
    expect(items[0]).toHaveClass('bg-highlight')
    expect(within(items[1]).getByText('""')).toBeInTheDocument()
    expect(within(items[2]).getByText('let')).toBeInTheDocument()
    expect(within(items[2]).getByText('undefined')).toBeInTheDocument()
  })

  it('changed가 없으면 "새로 생김" 배지와 강조 배경이 없다', () => {
    render(<EvaluationView state={stateOf('nullish', 2)} />)
    expect(screen.queryByText('새로 생김')).not.toBeInTheDocument()
    const items = within(screen.getByRole('region', { name: '변수' })).getAllByRole('listitem')
    for (const item of items) expect(item).not.toHaveClass('bg-highlight')
  })
})
