import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'
import type { Completion } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['override', 'fixed'])
    expect(scenarios.map((s) => s.label)).toEqual([
      'finally의 return이 덮는다',
      'return 값은 이미 정해져 있다',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['finally-return', 'value-fixed'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 override 8, fixed 10이고 각각 20 이하다', () => {
    expect(scenarioOf('override').steps).toHaveLength(8)
    expect(scenarioOf('fixed').steps).toHaveLength(10)
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  override: {
    1: 'function pick() {',
    2: '  try {',
    3: "    return 'try';",
    4: '  } finally {',
    5: "    return 'finally';",
    6: '  }',
    7: '}',
    8: 'console.log(pick());',
  },
  fixed: {
    1: 'function keep() {',
    2: '  var x = 1;',
    3: '  try {',
    4: '    return x;',
    5: '  } finally {',
    6: '    x = 2;',
    7: "    console.log('finally x = ' + x);",
    8: '  }',
    9: '}',
    10: 'console.log(keep());',
  },
}

const stripQuotes = (v: string) => v.replace(/^'(.*)'$/, '$1')
const sameCompletion = (a: Completion | null, b: Completion | null) =>
  JSON.stringify(a) === JSON.stringify(b)

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('첫 단계는 실행 시작이고 전역 코드만 스택에 있으며 나머지는 비어 있다', () => {
    expect(steps[0].title).toBe('실행 시작')
    expect(steps[0].state).toEqual({
      stack: ['전역 코드'],
      vars: [],
      tryResult: null,
      finallyResult: null,
      result: null,
    })
    expect(steps[0].output).toEqual([])
  })

  it('마지막 단계는 스택에 전역 코드만 있고 출력이 expectedOutput이다', () => {
    const last = steps.at(-1)!
    expect(last.state.stack).toEqual(['전역 코드'])
    expect(last.output).toEqual(example.expectedOutput)
  })

  it('전역 코드는 스택 맨 아래에 항상 있고, 함수가 없을 때는 지역 변수와 완료가 비어 있다', () => {
    steps.forEach((step, k) => {
      const where = `단계 ${k + 1}`
      expect(step.state.stack[0], where).toBe('전역 코드')
      expect(step.state.stack.length, where).toBeLessThanOrEqual(2)
      if (step.state.stack.length === 1) {
        expect(step.state.vars, where).toEqual([])
        expect(step.state.tryResult, where).toBeNull()
        expect(step.state.finallyResult, where).toBeNull()
        expect(step.state.result, where).toBeNull()
      }
    })
  })

  it('규칙: try 문의 결과는 finally가 정상 완료이면 try 블록의 완료, 아니면 finally 블록의 완료다', () => {
    const decided = steps.filter((s) => s.state.result !== null)
    expect(decided.length).toBeGreaterThan(0)
    for (const step of decided) {
      const { tryResult, finallyResult, result } = step.state
      expect(
        finallyResult,
        `${step.title}: 결과가 정해질 때 finally의 완료가 있어야 함`,
      ).not.toBeNull()
      expect(tryResult).not.toBeNull()
      if (finallyResult!.kind === 'normal') {
        expect(sameCompletion(result, tryResult), step.title).toBe(true)
      } else {
        expect(sameCompletion(result, finallyResult), step.title).toBe(true)
      }
    }
  })

  it('finally 블록이 시작한 뒤 함수가 돌아올 때까지 tryResult는 바뀌지 않는다', () => {
    const start = steps.findIndex((s) => s.title === 'finally 블록 시작')
    expect(start).toBeGreaterThan(0)
    const fixedTry = steps[start].state.tryResult
    expect(fixedTry).not.toBeNull()
    for (let k = start; k < steps.length && steps[k].state.stack.length === 2; k++) {
      expect(sameCompletion(steps[k].state.tryResult, fixedTry), `단계 ${k + 1}`).toBe(true)
    }
  })

  it('결과가 정해지는 단계는 하나뿐이고, 그 값이 예제 출력의 마지막 줄이다', () => {
    const decidedAt = steps
      .map((s, k) =>
        s.state.result !== null && (k === 0 || steps[k - 1].state.result === null) ? k : -1,
      )
      .filter((k) => k >= 0)
    expect(decidedAt).toHaveLength(1)
    const result = steps[decidedAt[0]].state.result!
    expect(result.kind).toBe('return')
    expect(stripQuotes(result.value!)).toBe(example.expectedOutput.at(-1))
  })

  it('한 단계에 출력은 많아야 한 줄 늘고, 늘어난 단계의 line 범위에 console.log가 있다', () => {
    const lines = source().split('\n')
    let previous: string[] = []
    steps.forEach((step, k) => {
      const added = step.output!.slice(previous.length)
      previous = step.output!
      expect(added.length, `단계 ${k + 1}`).toBeLessThanOrEqual(1)
      if (added.length === 0) return
      const { from, to } = step.line!
      const hasLog = lines.slice(from - 1, to).some((l) => l.includes('console.log('))
      expect(hasLog, `단계 ${k + 1}: line 범위에 console.log가 없음`).toBe(true)
    })
  })

  it('설명과 제목에 복사라는 말이 없다', () => {
    for (const step of steps) {
      expect(step.explanation).not.toContain('복사')
      expect(step.title).not.toContain('복사')
    }
  })
})

describe('시나리오별 개념 불변식', () => {
  it('override: try 블록이 return이어도 finally가 return하면 결과는 finally의 완료다', () => {
    const { steps } = scenarioOf('override')
    const decided = steps.find((s) => s.state.result !== null)!
    expect(decided.state.tryResult).toEqual({ kind: 'return', value: "'try'" })
    expect(decided.state.finallyResult).toEqual({ kind: 'return', value: "'finally'" })
    expect(decided.state.result).toEqual({ kind: 'return', value: "'finally'" })
  })

  it('fixed: x가 2로 바뀐 뒤에도 tryResult의 값은 1이고, finally가 정상 완료하므로 결과는 return 1이다', () => {
    const { steps } = scenarioOf('fixed')
    const changed = steps.filter((s) => s.state.vars.some((v) => v.name === 'x' && v.value === '2'))
    expect(changed.length).toBeGreaterThan(0)
    for (const s of changed)
      expect(s.state.tryResult, s.title).toEqual({ kind: 'return', value: '1' })
    const decided = steps.find((s) => s.state.result !== null)!
    expect(decided.state.finallyResult).toEqual({ kind: 'normal', value: null })
    expect(decided.state.result).toEqual({ kind: 'return', value: '1' })
  })
})
