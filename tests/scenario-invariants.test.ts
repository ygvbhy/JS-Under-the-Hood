import { describe, expect, it } from 'vitest'
import type { Scenario } from '~/simulator/types'
import { assertScenarioInvariants } from './helpers/scenario-invariants'

const source = ['let a = 1', '', '// 주석', 'a = 2', 'console.log(a)', ''].join('\n')
const example = { expectedOutput: ['2'] }

function valid(): Scenario<{ a: number }> {
  return {
    id: 'demo',
    label: '데모',
    exampleId: 'demo',
    code: source,
    steps: [
      { title: '시작', explanation: '시작', state: { a: 0 }, output: [] },
      { title: '선언', explanation: '선언', line: { from: 1, to: 1 }, state: { a: 1 }, output: [] },
      {
        title: '재할당',
        explanation: '재할당',
        line: { from: 3, to: 4 },
        state: { a: 2 },
        output: [],
      },
      {
        title: '출력',
        explanation: '출력',
        line: { from: 5, to: 5 },
        state: { a: 2 },
        output: ['2'],
      },
    ],
  }
}

describe('assertScenarioInvariants', () => {
  it('유효한 시나리오는 통과한다', () => {
    expect(() => assertScenarioInvariants(valid(), example, source)).not.toThrow()
  })

  it('출력을 쓰지 않는 시나리오도 통과한다', () => {
    const s = valid()
    s.steps.forEach((step) => delete step.output)
    expect(() => assertScenarioInvariants(s, example, source)).not.toThrow()
  })

  it('code가 예제 원문과 다르면 실패한다', () => {
    const s = { ...valid(), code: source + 'x' }
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/원문과 다릅니다/)
  })

  it('빈 줄만 강조하면 실패한다', () => {
    const s = valid()
    s.steps[1].line = { from: 2, to: 2 }
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/공백 또는 주석/)
  })

  it('주석 줄만 강조하면 실패한다', () => {
    const s = valid()
    s.steps[1].line = { from: 3, to: 3 }
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/공백 또는 주석/)
  })

  it('코드 줄 범위를 벗어난 line이면 실패한다', () => {
    const s = valid()
    s.steps[1].line = { from: 5, to: 6 }
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/범위/)
  })

  it('from이 to보다 크면 실패한다', () => {
    const s = valid()
    s.steps[1].line = { from: 4, to: 1 }
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/from <= to/)
  })

  it('output이 이전 단계의 확장이 아니면 실패한다', () => {
    const s = valid()
    s.steps[2].output = ['1']
    s.steps[3].output = ['2']
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/확장이 아닙니다/)
  })

  it('마지막 output이 expectedOutput과 다르면 실패한다', () => {
    const s = valid()
    s.steps[3].output = ['3']
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/expectedOutput/)
  })

  it('단계가 1개뿐이면 실패한다', () => {
    const s = valid()
    s.steps = s.steps.slice(-1)
    expect(() => assertScenarioInvariants(s, example, source)).toThrow(/2개 이상/)
  })
})
