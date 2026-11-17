import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

// class 어트리뷰트 값을 ASCII 공백으로 나눠 중복을 뺀 순서 있는 집합으로 만든다(DOM 표준의 ordered set parser).
function parseTokens(value: string | null): string[] {
  if (value === null) return []
  return [...new Set(value.split(/[\t\n\f\r ]+/).filter((t) => t !== ''))]
}

// 이 페이지의 style 어트리뷰트 값은 이름: 값; 형태뿐이라 단순하게 나눈다.
function parseDeclarations(value: string | null): { property: string; value: string }[] {
  if (value === null) return []
  return value
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d !== '')
    .map((d) => {
      const [property, ...rest] = d.split(':')
      return { property: property.trim(), value: rest.join(':').trim() }
    })
}

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['style-attribute', 'token-set'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '예제 2: style과 style 어트리뷰트',
      '예제 5: classList와 class 어트리뷰트',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['style-attribute', 'token-set'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 style-attribute 9, token-set 12이다', () => {
    expect(scenarios[0].steps).toHaveLength(9)
    expect(scenarios[1].steps).toHaveLength(12)
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)!
  const source = () => readExample(example.file)
  const steps = scenario.steps

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('첫 단계는 line이 없는 "실행 전"·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    expect(steps[0].title).toBe('실행 전')
    expect(steps[0].line).toBeUndefined()
    expect(steps[0].output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
    })
  })

  it('출력은 한 단계에 한 줄까지 늘고, 늘어난 줄 수가 expectedOutput의 줄 수와 같다', () => {
    let previous: string[] = []
    let grown = 0
    steps.forEach((step, k) => {
      const added = step.output!.length - previous.length
      expect(added, `단계 ${k + 1}`).toBeLessThanOrEqual(1)
      grown += added
      previous = step.output!
    })
    expect(grown).toBe(example.expectedOutput.length)
  })

  it('출력 줄이 늘어나는 단계의 line은 console.log가 있는 줄이다', () => {
    const lines = source().split('\n')
    let previous = 0
    steps.forEach((step, k) => {
      const length = step.output!.length
      if (length > previous) {
        expect(lines[step.line!.from - 1], `단계 ${k + 1}`).toContain('console.log')
      }
      previous = length
    })
  })
})

describe('상태 불변식', () => {
  const [style, token] = scenarios

  it('style-attribute 시나리오: tokens는 항상 null이고 선언 목록은 style 어트리뷰트를 파싱한 결과다', () => {
    style.steps.forEach((step, k) => {
      expect(step.state.tokens, `단계 ${k + 1}`).toBeNull()
      expect(step.state.attributes.class, `단계 ${k + 1}`).toBeNull()
      expect(step.state.declarations, `단계 ${k + 1}`).toEqual(
        parseDeclarations(step.state.attributes.style),
      )
    })
  })

  it('token-set 시나리오: declarations는 항상 null이고 토큰 집합은 class 어트리뷰트를 파싱한 결과이며 중복이 없다', () => {
    token.steps.forEach((step, k) => {
      expect(step.state.declarations, `단계 ${k + 1}`).toBeNull()
      expect(step.state.attributes.style, `단계 ${k + 1}`).toBeNull()
      expect(step.state.tokens, `단계 ${k + 1}`).toEqual(parseTokens(step.state.attributes.class))
      expect(new Set(step.state.tokens).size, `단계 ${k + 1}`).toBe(step.state.tokens!.length)
    })
  })

  it('token-set 시나리오: 첫 변경(add) 뒤에는 class 어트리뷰트가 토큰을 공백 하나로 이은 문자열이다', () => {
    const first = token.steps.findIndex((s) => s.line?.from === 12)
    expect(first).toBeGreaterThan(0)
    token.steps.slice(first).forEach((step, k) => {
      expect(step.state.attributes.class, `단계 ${first + k + 1}`).toBe(
        step.state.tokens!.join(' '),
      )
    })
    // 변경 전에는 어트리뷰트가 HTML에 적은 원문(중복 포함)이라 집합의 직렬화와 다르다
    expect(token.steps[0].state.attributes.class).toBe('a b a')
    expect(token.steps[0].state.tokens!.join(' ')).toBe('a b')
  })

  it('token-set 시나리오: 마지막 단계에서 집합이 비어도 class 어트리뷰트는 빈 문자열로 남는다', () => {
    const last = token.steps.at(-1)!.state
    expect(last.tokens).toEqual([])
    expect(last.attributes.class).toBe('')
  })

  it('style-attribute 시나리오: removeAttribute 뒤 style 어트리뷰트는 null이고 선언이 없다', () => {
    const last = style.steps.at(-1)!.state
    expect(last.attributes.style).toBeNull()
    expect(last.declarations).toEqual([])
  })
})

describe('메타 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })
})
