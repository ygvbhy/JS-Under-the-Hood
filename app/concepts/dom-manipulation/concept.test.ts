import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'

const dir = import.meta.dirname
const readExample = (file: string): string => readFileSync(join(dir, 'examples', file), 'utf8')

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['inner-html-replace', 'move'])
    expect(scenarios.map((s) => s.label)).toEqual([
      '예제 1: innerHTML +=',
      '예제 3: 이미 있는 노드 넣기',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['inner-html-replace', 'move'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 inner-html-replace 10, move 15이다', () => {
    expect(scenarios[0].steps).toHaveLength(10)
    expect(scenarios[1].steps).toHaveLength(15)
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

  it('상태 참조 무결성: 부모·자식·변수의 id가 nodes에 있고, 노드는 많아야 한 부모의 한 자리에만 있다', () => {
    steps.forEach((step, k) => {
      const { nodes, parents, variables } = step.state
      const where = `단계 ${k + 1}`
      const parentIds = parents.map((p) => p.id)
      expect(new Set(parentIds).size, `${where}: 부모 id 중복`).toBe(parentIds.length)
      const seen = new Set<string>()
      for (const parent of parents) {
        expect(nodes[parent.id], `${where}: 부모 ${parent.id}가 nodes에 없음`).toBeDefined()
        for (const child of parent.children) {
          expect(nodes[child], `${where}: 자식 ${child}가 nodes에 없음`).toBeDefined()
          expect(parentIds, `${where}: 부모 ${child}가 다른 부모의 자식임`).not.toContain(child)
          expect(seen.has(child), `${where}: ${child}가 두 자리에 있음`).toBe(false)
          seen.add(child)
        }
      }
      for (const v of variables) {
        expect(
          nodes[v.nodeId],
          `${where}: 변수 ${v.name}의 노드 ${v.nodeId}가 nodes에 없음`,
        ).toBeDefined()
      }
      expect(new Set(variables.map((v) => v.name)).size, `${where}: 변수 이름 중복`).toBe(
        variables.length,
      )
    })
  })
})

describe('상태 불변식', () => {
  const [replace, move] = scenarios
  const childrenOf = (state: (typeof replace.steps)[number]['state'], id: string) =>
    state.parents.find((p) => p.id === id)!.children

  it('inner-html-replace: first 변수는 끝까지 같은 노드(n1)를 가리키고, 제거 뒤에는 어느 자식 목록에도 없다', () => {
    const afterFirst = replace.steps.findIndex((s) => s.title === 'first를 얻음')
    replace.steps.slice(afterFirst).forEach((step) => {
      expect(step.state.variables.find((v) => v.name === 'first')!.nodeId).toBe('n1')
    })
    const removed = replace.steps.findIndex((s) => s.title.includes('② 자식을 모두 제거한다'))
    replace.steps.slice(removed).forEach((step, k) => {
      expect(childrenOf(step.state, 'list'), `제거 이후 ${k}`).not.toContain('n1')
      expect(step.state.nodes.n1.label).toBe('li#first "A"')
    })
  })

  it('inner-html-replace: 마지막 단계의 새 첫 자식은 n1과 id 표시가 같지만 다른 노드다', () => {
    const last = replace.steps.at(-1)!.state
    expect(childrenOf(last, 'list')).toEqual(['n2', 'n3'])
    expect(last.nodes.n2.label).toBe(last.nodes.n1.label)
    expect('n2').not.toBe('n1')
  })

  it('move: 노드 수는 a, b와 c(만든 뒤)뿐이고, a는 한 번 넣은 뒤 done에서 벗어나지 않는다', () => {
    const appended = move.steps.findIndex((s) => s.title === 'done.appendChild(a)')
    move.steps.slice(appended).forEach((step) => {
      expect(childrenOf(step.state, 'done')).toEqual(['a'])
      expect(childrenOf(step.state, 'todo')).not.toContain('a')
    })
    const created = move.steps.findIndex((s) => s.title.startsWith('c = document.createElement'))
    move.steps.slice(0, created).forEach((step) => expect(step.state.nodes.c).toBeUndefined())
    move.steps.slice(created).forEach((step) => expect(step.state.nodes.c).toBeDefined())
  })

  it('move: 만든 직후 c는 어느 자식 목록에도 없고, 마지막 todo는 c, b 순서다', () => {
    const created = move.steps.findIndex((s) => s.title.startsWith('c = document.createElement'))
    const state = move.steps[created].state
    expect(state.parents.flatMap((p) => p.children)).not.toContain('c')
    expect(childrenOf(move.steps.at(-1)!.state, 'todo')).toEqual(['c', 'b'])
  })
})

// content.mdx의 PredictQuiz를 읽어 정답 선택지가 예제의 expectedOutput을 ' / '로 이은 문자열과 같은지 검사한다.
// 마크업이 든 출력은 결과 표 검사(tests/result-tables.test.ts)가 대조하지 못해서 퀴즈로 대신한다.
describe('퀴즈 정답', () => {
  const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
  const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
    const body = m[1]
    const question = body.match(/question="([^"]*)"/)![1]
    const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
    const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
    const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
    const example = Number(question.match(/예제 (\d+)/)![1])
    return { question, choices, answer, example }
  })

  it('퀴즈가 예제 1~7마다 하나씩 7개 있다', () => {
    expect(quizzes.map((q) => q.example)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(concept.examples).toHaveLength(7)
  })

  it.each([1, 2, 3, 4, 5, 6, 7])(
    '예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다',
    (n) => {
      const quiz = quizzes.find((q) => q.example === n)!
      const expected = concept.examples[n - 1].expectedOutput.join(' / ')
      expect(quiz.choices[quiz.answer]).toBe(expected)
      // 오답은 정답과 다르고 서로 겹치지 않는다
      expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
      expect(quiz.choices.filter((c) => c === expected)).toHaveLength(1)
    },
  )

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

describe('메타 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 377이다', () => {
    expect(concept.order).toBe(377)
  })
})
