import { expect } from 'vitest'
import type { Scenario } from '~/simulator/types'

// L2 시나리오 불변식 ①~⑤ (⑥ 상태 참조 무결성은 개념별 테스트에서 검사한다)
export function assertScenarioInvariants<S>(
  scenario: Scenario<S>,
  example: { expectedOutput: string[] },
  exampleSource: string,
): void {
  const name = `시나리오 "${scenario.id}"`

  // ① 시뮬레이터가 보여주는 코드 = 예제 파일 원문
  expect(scenario.code, `${name}: code가 예제 파일 원문과 다릅니다`).toBe(exampleSource)

  // ⑤ 단계 ≥ 2
  expect(scenario.steps.length, `${name}: 단계는 2개 이상이어야 합니다`).toBeGreaterThanOrEqual(2)

  // ② 출력을 쓰는 시나리오라면 마지막 단계 output = expectedOutput
  const usesOutput = scenario.steps.some((s) => s.output !== undefined)
  if (usesOutput) {
    const last = scenario.steps[scenario.steps.length - 1]
    expect(last.output, `${name}: 마지막 단계의 output이 expectedOutput과 다릅니다`).toEqual(
      example.expectedOutput,
    )
  }

  // ③ 단계별 output은 이전 output의 확장(prefix)
  let previous: string[] = []
  scenario.steps.forEach((step, i) => {
    if (step.output === undefined) return
    expect(
      step.output.length,
      `${name}: 단계 ${i + 1}의 output이 이전 단계보다 짧습니다`,
    ).toBeGreaterThanOrEqual(previous.length)
    expect(
      step.output.slice(0, previous.length),
      `${name}: 단계 ${i + 1}의 output이 이전 단계 output의 확장이 아닙니다`,
    ).toEqual(previous)
    previous = step.output
  })

  // ④ line이 코드 줄 범위 안이며 강조 범위에 실제 코드 줄이 있다
  const lines = exampleSource.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  const lineCount = lines.length
  scenario.steps.forEach((step, i) => {
    if (!step.line) return
    const { from, to } = step.line
    const where = `${name}: 단계 ${i + 1}의 line {from: ${from}, to: ${to}}`
    expect(Number.isInteger(from) && Number.isInteger(to), `${where}는 정수여야 합니다`).toBe(true)
    expect(
      from >= 1 && to <= lineCount,
      `${where}가 코드 줄 범위 1..${lineCount}를 벗어났습니다`,
    ).toBe(true)
    expect(from <= to, `${where}는 from <= to여야 합니다`).toBe(true)
    const hasCode = lines.slice(from - 1, to).some((l) => {
      const t = l.trim()
      return t !== '' && !t.startsWith('//')
    })
    expect(hasCode, `${where}가 공백 또는 주석 줄만 강조합니다`).toBe(true)
  })
}
