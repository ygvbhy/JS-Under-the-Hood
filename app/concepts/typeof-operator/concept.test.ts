import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
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
