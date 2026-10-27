import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { storedValues } from './stored-values'

describe('본문 주장 검증', () => {
  describe('저장 값 표', () => {
    it('7행이고 source가 중복되지 않는다', () => {
      expect(storedValues).toHaveLength(7)
      expect(new Set(storedValues.map((r) => r.source)).size).toBe(storedValues.length)
    })

    it.each(storedValues.map((r) => [r.source, r.stored]))(
      '`%s`가 실제로 저장하는 값은 %s',
      (source, stored) => {
        const fixed = runInNewContext(`(${source}).toFixed(100)`) as string
        expect(fixed.replace(/0+$/, '').replace(/\.$/, '')).toBe(stored)
      },
    )
  })

  describe('본문 서술의 근거', () => {
    it.each([
      ['0.1 * 3', 0.30000000000000004],
      ['0.3 - 0.1', 0.19999999999999998],
      ['2 ** 53 - 1', 9007199254740991],
      ['2 ** 1023 * 2', Infinity],
      ['1 / -0', -Infinity],
      ['0.1 + 0.2 === 0.3', false],
      ['(1 + 2) / 10 === 0.3', true],
      ['2 ** 53 + 1 === 2 ** 53', true],
      ['2 ** 53 - 1 + 1 === 2 ** 53', true],
      // 정확히 가운데면 작은 쪽이 아니라 2진 표현의 마지막 자리가 0인 쪽으로 반올림한다(roundTiesToEven)
      ['2 ** 53 + 3 === 2 ** 53 + 4', true],
      ['9007199254740993 === 2 ** 53', true],
      ["typeof NaN === 'number'", true],
    ])('`%s` → %j', (source, expected) => {
      expect(runInNewContext(source)).toBe(expected)
    })
  })
})
