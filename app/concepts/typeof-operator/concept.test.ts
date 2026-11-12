import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { exampleContext, tableBody } from '../../../tests/helpers/expression-tables'
import { typeofTable } from './typeof-table'

// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function errorNameOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (e) {
    return (e as Error).name
  }
  return undefined
}

describe('본문 주장 검증', () => {
  describe('typeof 결과 표', () => {
    it('10행이고 source가 중복되지 않는다', () => {
      expect(typeofTable).toHaveLength(10)
      expect(new Set(typeofTable.map((r) => r.source)).size).toBe(typeofTable.length)
    })

    it.each(typeofTable.map((r) => [r.source, r.result]))(
      '`typeof (%s)` → %s',
      (source, result) => {
        expect(runInNewContext(`typeof (${source})`)).toBe(result)
      },
    )
  })

  describe('본문 서술의 근거', () => {
    it('선언하지 않은 식별자를 그냥 참조하면 ReferenceError', () => {
      expect(errorNameOf(() => runInNewContext('notDeclared'))).toBe('ReferenceError')
    })

    it.each([
      ['typeof 1 + 2', 'number2'],
      ['typeof (1 + 2)', 'number'],
      ['typeof typeof 42', 'string'],
      ["typeof null === 'object'", true],
      ['null === null', true],
    ])('`%s` → %j', (source, expected) => {
      expect(runInNewContext(source)).toBe(expected)
    })
  })
})

// 표 글자는 content.mdx에서 읽고, 식 칸을 그대로 평가해 결과 칸과 대조한다.
// 식에 쓰는 add, empty, declared는 페이지의 예제 파일에서 가져온다(notDeclared는 선언하지 않은 채로 둔다).
describe('결과와 이유 표', () => {
  const dir = import.meta.dirname
  const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
  const rows = tableBody(mdx, ['식', '결과', '이유'])
  const ctx = exampleContext(join(dir, 'examples'), [
    'typeof-function.js',
    'typeof-null.js',
    'typeof-undeclared.js',
  ])
  const format = (v: unknown) => (typeof v === 'string' ? `'${v}'` : String(v))

  it('표 행이 11개 이상이다', () => {
    expect(rows.length).toBeGreaterThanOrEqual(11)
  })

  it.each(rows.map((r) => [r[0], r[1]]))('`%s` → 결과 칸', (key, result) => {
    expect(format(runInContext(key, ctx))).toBe(result)
  })
})
