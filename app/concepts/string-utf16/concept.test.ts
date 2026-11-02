import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { formatCodePoint, formatUnit, samples, toCodePoints, toUnits } from './units'

// 손으로 계산한 기대값. 서로게이트 쌍은 명세 공식
// (high - 0xD800) × 0x400 + (low - 0xDC00) + 0x10000 으로 코드 포인트를 구했다.
// 예: 😀 = (0xD83D - 0xD800) × 0x400 + (0xDE00 - 0xDC00) + 0x10000 = 0xF400 + 0x200 + 0x10000 = 0x1F600
type Expected = {
  units: string[]
  kinds: string[]
  codePoints: [string, number, number][] // [표기, start, size]
}

const expected: Record<string, Expected> = {
  emoji: {
    units: ['0061', 'd83d', 'de00', '0062'],
    kinds: ['single', 'high', 'low', 'single'],
    codePoints: [
      ['U+0061', 0, 1],
      ['U+1F600', 1, 2],
      ['U+0062', 3, 1],
    ],
  },
  hangul: {
    units: ['ac00', 'b098'],
    kinds: ['single', 'single'],
    codePoints: [
      ['U+AC00', 0, 1],
      ['U+B098', 1, 1],
    ],
  },
  composed: {
    units: ['00e9'],
    kinds: ['single'],
    codePoints: [['U+00E9', 0, 1]],
  },
  decomposed: {
    units: ['0065', '0301'],
    kinds: ['single', 'single'],
    codePoints: [
      ['U+0065', 0, 1],
      ['U+0301', 1, 1],
    ],
  },
  family: {
    // 👨 U+1F468 → d83d dc68, 👩 U+1F469 → d83d dc69, 👧 U+1F467 → d83d dc67
    units: ['d83d', 'dc68', '200d', 'd83d', 'dc69', '200d', 'd83d', 'dc67'],
    kinds: ['high', 'low', 'single', 'high', 'low', 'single', 'high', 'low'],
    codePoints: [
      ['U+1F468', 0, 2],
      ['U+200D', 2, 1],
      ['U+1F469', 3, 2],
      ['U+200D', 5, 1],
      ['U+1F467', 6, 2],
    ],
  },
}

describe('string-utf16 units', () => {
  it('① 프리셋마다 손으로 적은 기대값과 toUnits·toCodePoints 결과가 같다', () => {
    expect(Object.keys(expected).sort()).toEqual(samples.map((s) => s.id).sort())
    for (const s of samples) {
      const want = expected[s.id]
      const units = toUnits(s.value)
      expect(
        units.map((u) => formatUnit(u.unit)),
        s.id,
      ).toEqual(want.units)
      expect(
        units.map((u) => u.kind),
        s.id,
      ).toEqual(want.kinds)
      expect(
        units.map((u) => u.index),
        s.id,
      ).toEqual(want.units.map((_, i) => i))
      expect(
        toCodePoints(s.value).map((p) => [formatCodePoint(p.codePoint), p.start, p.size]),
        s.id,
      ).toEqual(want.codePoints)
    }
  })

  it('② 새 vm 컨텍스트의 length·charCodeAt·codePointAt 실행 결과와 같다', () => {
    for (const s of samples) {
      const run = (code: string): unknown => runInNewContext(code, { v: s.value })
      expect(run('v.length'), s.id).toBe(toUnits(s.value).length)
      const charCodes = run('Array.from({ length: v.length }, (_, i) => v.charCodeAt(i))')
      expect(charCodes, s.id).toEqual(toUnits(s.value).map((u) => u.unit))
      for (const p of toCodePoints(s.value)) {
        expect(run(`v.codePointAt(${p.start})`), s.id).toBe(p.codePoint)
      }
    }
  })

  it('③ 쪼개진 쌍은 짝 없는 서로게이트로 분류된다', () => {
    const cut = toUnits('a😀b'.slice(0, 2))
    expect(cut.map((u) => u.kind)).toEqual(['single', 'lone-high'])
    expect(toUnits('\ude00').map((u) => u.kind)).toEqual(['lone-low'])
    expect(toUnits('\ud83d😀').map((u) => u.kind)).toEqual(['lone-high', 'high', 'low'])
    expect(toCodePoints('\ude00')).toEqual([{ start: 0, size: 1, codePoint: 0xde00 }])
  })

  it('④ 본문 근거: strict mode 인덱스 대입은 TypeError', () => {
    const name = runInNewContext(
      `'use strict'; var w = 'cat'; var n; try { w[0] = 'b' } catch (e) { n = e.name } n`,
    )
    expect(name).toBe('TypeError')
    expect(runInNewContext(`var w = 'cat'; w[0] = 'b'; w`)).toBe('cat')
  })

  it('④ 본문 근거: for...of는 a😀b에서 3번 돈다(별도 개념 언급 근거)', () => {
    const count = runInNewContext(`var n = 0; for (var ch of 'a😀b') n++; n`)
    expect(count).toBe(3)
  })

  it('④ 본문 근거: 소스의 é 리터럴은 U+00E9 한 코드 포인트다', () => {
    const literal: string = 'é' // 소스에 문자 그대로 쓴 é
    expect(literal === '\u00e9').toBe(true)
    expect(literal.length).toBe(1)
    expect(literal === 'e\u0301').toBe(false)
  })

  it('프리셋 id가 중복되지 않고 코드 유닛이 8개 이하다', () => {
    const ids = samples.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(samples).toHaveLength(5)
    for (const s of samples) expect(s.value.length, s.id).toBeLessThanOrEqual(8)
  })
})

describe('예제 소스', () => {
  // 보이지 않거나 정규화로 바뀔 수 있는 문자는 예제 소스에 \u 이스케이프로만 쓴다.
  // ZWJ(U+200D), 결합 양음 부호(U+0301), 미리 합친 é(U+00E9)가 실제 문자로 들어가면 코드가 화면에서 달라 보이거나 정규화로 결과가 바뀐다.
  it('예제 파일에 ZWJ·결합 부호·é가 실제 문자로 들어 있지 않다', () => {
    const forbidden = [0x200d, 0x0301, 0x00e9]
    for (const example of concept.examples) {
      const source = readFileSync(join(import.meta.dirname, 'examples', example.file), 'utf8')
      const found = [...source].filter((ch) => forbidden.includes(ch.codePointAt(0) as number))
      expect(found, example.file).toEqual([])
    }
  })
})
