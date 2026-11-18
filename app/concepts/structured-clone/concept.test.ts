import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { concept } from './meta'

const dir = import.meta.dirname
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const compareSource = readFileSync(join(dir, 'examples', 'compare-table.js'), 'utf8')
const compareExample = concept.examples.find((e) => e.file === 'compare-table.js')!

// 이 테스트는 Node에서 structuredClone을 실행하지 않는다. 결과의 근거는 Chromium 실행 출력(expectedOutput)이다.
describe('값별 비교표', () => {
  const rows = tableBody(mdx, [
    '값',
    '확인 식',
    'JSON.parse(JSON.stringify(x))',
    'structuredClone(x)',
  ])

  it('행 수가 compare-table 예제의 출력 줄 수와 같다', () => {
    expect(rows).toHaveLength(compareExample.expectedOutput.length)
  })

  it('행마다 값 칸·결과 칸이 예제의 출력 줄([라벨, JSON 결과, clone 결과])과 같다', () => {
    rows.forEach((row, i) => {
      const [label, json, clone] = JSON.parse(compareExample.expectedOutput[i]) as unknown[]
      expect([row[0], row[2], row[3]], `행 ${i + 1}: ${row[0]}`).toEqual([
        String(label),
        String(json),
        String(clone),
      ])
    })
  })

  it('확인 식 칸의 문자열이 compare-table.js 원문에 표 순서대로 나온다', () => {
    let from = 0
    for (const row of rows) {
      const at = compareSource.indexOf(row[1], from)
      expect(at, `확인 식 "${row[1]}"이 순서대로 나오지 않습니다`).toBeGreaterThanOrEqual(0)
      from = at + row[1].length
    }
  })
})

// content.mdx의 PredictQuiz를 읽어 정답 선택지가 예제의 expectedOutput을 ' / '로 이은 문자열과 같은지 검사한다.
describe('퀴즈 정답', () => {
  const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
    const body = m[1]
    const question = body.match(/question="([^"]*)"/)![1]
    const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
    const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
    const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
    const example = Number(question.match(/예제 (\d+)/)![1])
    return { choices, answer, example }
  })
  const files = exampleFilesByNumber(mdx)

  it('예제 번호가 1~8이고 meta.examples는 compare-table을 더해 9개다', () => {
    expect([...files.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(quizzes.map((q) => q.example)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(concept.examples).toHaveLength(9)
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    '예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다',
    (n) => {
      const file = files.get(n)!
      const example = concept.examples.find((e) => e.file === file)
      expect(example, `${file}이 meta.examples에 없습니다`).toBeDefined()
      const quiz = quizzes.find((q) => q.example === n)!
      const expected = example!.expectedOutput.join(' / ')
      expect(quiz.choices[quiz.answer]).toBe(expected)
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

  it('order는 425이고 category는 objects다', () => {
    expect(concept.order).toBe(425)
    expect(concept.category).toBe('objects')
  })

  it('예제는 모두 browser 런타임이다', () => {
    expect(concept.examples.every((e) => e.runtime === 'browser')).toBe(true)
  })
})
