import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열) 또는 던져진 오류의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    return (e as Error).name
  }
}

// 표의 결과 칸 표기: BigInt는 2n, 문자열은 '11', 그 밖은 String(), 던지면 오류 이름.
function formatResult(expression: string): string {
  try {
    const v: unknown = runInNewContext(expression)
    if (typeof v === 'bigint') return `${v}n`
    if (typeof v === 'string') return `'${v}'`
    return String(v)
  } catch (e) {
    return (e as Error).name
  }
}

describe('연산 결과 표', () => {
  const rows = tableBody(mdx, ['식', '결과', '규칙'])

  it('행이 24개 이상이다', () => {
    expect(rows.length).toBeGreaterThanOrEqual(24)
  })

  it.each(rows.map((r) => [r[0], r[1]] as const))('%s → %s', (expression, expected) => {
    expect(formatResult(expression)).toBe(expected)
  })

  it('1n == true 행과 나눗셈 버림 행이 있다', () => {
    const expressions = rows.map((r) => r[0])
    expect(expressions).toContain('1n == true')
    expect(expressions).toContain('7n / 2n')
  })

  // 정규화된 칸이 아니라 원문 표 블록에서 검사한다. 정규화(태그 제거)는 식 안의 <...>를 지우므로 놓친다.
  it('식 칸 원문에 금지 글자(< \\ { } 백틱 큰따옴표 안의 큰따옴표)가 없다', () => {
    const start = mdx.indexOf('<th className="border-border border px-3 py-2">식</th>')
    expect(start).toBeGreaterThan(0)
    const block = mdx.slice(start, mdx.indexOf('</table>', start))
    const firstCells = [...block.matchAll(/<tr>\s*<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    expect(firstCells).toHaveLength(rows.length)
    for (const cell of firstCells) {
      const code = cell.match(/^\s*<code>([\s\S]*?)<\/code>\s*$/)
      expect(code, cell).not.toBeNull()
      const literal = code![1].match(/^\{(?:"([^"]*)"|'([^']*)')\}$/)
      expect(literal, code![1]).not.toBeNull()
      const inner = literal![1] ?? literal![2]
      expect(inner, code![1]).not.toMatch(/[<\\{}`"]/)
    }
  })
})

describe('예제가 없는 주장의 탐침', () => {
  it('본문: 10진 문자열은 부호를 허용하고 n 접미사는 SyntaxError다', () => {
    expect(show("BigInt('-12')")).toBe('-12')
    expect(show("BigInt('12n')")).toBe('SyntaxError')
  })

  it('본문: 0x 접두사 문자열은 부호를 허용하지 않는다', () => {
    expect(show("BigInt('0x10')")).toBe('16')
    expect(show("BigInt('+0x10')")).toBe('SyntaxError')
  })
})

describe('본문 주장의 탐침 (증감)', () => {
  it('본문: 전위 ++와 후위·전위 --도 BigInt에서 던지지 않고 bigint를 남긴다', () => {
    expect(
      show(
        'let p = 1n; ++p; let q = 1n; q--; let r = 1n; --r; [typeof p, String(p), typeof q, String(q), typeof r, String(r)].join(" ")',
      ),
    ).toBe('bigint 2 bigint 0 bigint 0')
  })

  it('본문: 정수 부분이 21자리를 넘는 Number는 지수 표기로 출력된다', () => {
    expect(show('String(Number(10n ** 25n))')).toBe('1e+25')
  })
})

describe('본문 주장의 탐침 (사용자 검토 반영)', () => {
  it('본문: 요소가 1개면 비교 함수가 불리지 않아 x - y 비교 함수도 던지지 않는다', () => {
    expect(show('[1n].sort((x, y) => x - y).map(String).join()')).toBe('1')
  })

  it("본문: 2n * '3'도 TypeError다(문자열을 먼저 보는 것은 +뿐)", () => {
    expect(show("2n * '3'")).toBe('TypeError')
  })

  it('본문: parseInt(9007199254740993n)은 Number 9007199254740992다', () => {
    expect(show('typeof parseInt(9007199254740993n) + " " + parseInt(9007199254740993n)')).toBe(
      'number 9007199254740992',
    )
  })

  it("본문: BigInt('012')는 12n이고 소스의 012n은 SyntaxError다", () => {
    expect(show("String(BigInt('012'))")).toBe('12')
    expect(show('012n')).toBe('SyntaxError')
  })

  it('본문: BigInt(9007199254740993)은 이미 반올림된 Number를 옮겨 9007199254740992n이다', () => {
    expect(show('String(BigInt(9007199254740993))')).toBe('9007199254740992')
  })

  it('meta: 관계 비교에 Symbol을 넘기면 BigInt와 비교해도 TypeError다', () => {
    expect(show('1n < Symbol()')).toBe('TypeError')
  })
})

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s',
    (_id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      expect(runExample(STRICT + code)).toEqual(expectedOutput)
    },
  )
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
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('퀴즈가 예제 1~10마다 하나씩 10개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(10)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const expected = concept.examples[n - 1].expectedOutput.join(' / ')
    expect(quiz.choices).toHaveLength(4)
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 276이다', () => {
    expect(concept.order).toBe(276)
  })

  it('본문은 뒷장 개념(json, error-handling)으로 링크하지 않는다', () => {
    expect(mdx).not.toContain('/concepts/json')
    expect(mdx).not.toContain('/concepts/error-handling')
  })

  it('예제와 표에 Symbol을 쓰지 않는다', () => {
    for (const e of concept.examples) expect(readExample(e.file)).not.toContain('Symbol')
    expect(mdx).not.toContain('Symbol')
  })

  it('설계 이유를 사실처럼 쓰는 표현이 없다', () => {
    expect(mdx).not.toMatch(/정밀도|잃지 않|때문에 설계/)
  })
})
