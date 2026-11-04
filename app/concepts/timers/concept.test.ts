import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { columns, rows } from './case-table'
import { concept } from './meta'

const examplesDir = join(import.meta.dirname, 'examples')

// lines가 output 안에 같은 순서로(연속하지 않아도) 들어 있는지 검사한다.
function isSubsequence(lines: string[], output: string[]): boolean {
  let i = 0
  for (const line of output) {
    if (i < lines.length && line === lines[i]) i++
  }
  return i === lines.length
}

function expectedOutputOf(id: string): string[] {
  const example = concept.examples.find((e) => e.id === id)
  if (!example) throw new Error(`예제 없음: ${id}`)
  return example.expectedOutput
}

describe('meta 예제', () => {
  it('모든 예제 id에 해당하는 파일이 examples/에 있다', () => {
    for (const e of concept.examples) {
      expect(existsSync(join(examplesDir, e.file))).toBe(true)
    }
  })
})

describe('결과표 구조', () => {
  it('열 key가 행의 필드와 맞는다', () => {
    expect(columns.map((c) => c.key)).toEqual(['situation', 'code', 'result', 'rule'])
  })

  it('모든 행의 evidence.example이 meta.examples의 id다', () => {
    const ids = concept.examples.map((e) => e.id)
    for (const row of rows) expect(ids).toContain(row.evidence.example)
  })

  it('모든 예제 id가 한 행 이상의 근거로 쓰인다', () => {
    const used = new Set(rows.map((r) => r.evidence.example))
    for (const example of concept.examples) expect(used).toContain(example.id)
  })

  it('상황 이름이 겹치지 않는다', () => {
    const names = rows.map((r) => r.situation)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('결과표 근거 출력', () => {
  for (const row of rows) {
    it(`${row.situation}: evidence 줄이 expectedOutput에 순서대로 있다`, () => {
      expect(isSubsequence(row.evidence.lines, expectedOutputOf(row.evidence.example))).toBe(true)
    })
  }
})

describe('예제 출력 불변식', () => {
  it('sync-first: 타이머 0ms가 마지막 줄이다', () => {
    const out = expectedOutputOf('sync-first')
    expect(out[out.length - 1]).toBe('타이머 0ms')
  })

  it('same-delay: 같은 지연의 a, b, d가 등록 순서대로 나온다', () => {
    const out = expectedOutputOf('same-delay')
    const [a, b, d] = ['a 50ms', 'b 50ms', 'd 50ms'].map((l) => out.indexOf(l))
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(d)
  })

  it('지워진 타이머의 줄은 출력에 없다', () => {
    expect(expectedOutputOf('clear')).not.toContain('a 실행')
    expect(expectedOutputOf('clear')).not.toContain('c 실행')
    expect(expectedOutputOf('interval')).not.toContain('once 실행')
    expect(expectedOutputOf('delay-convert')).not.toContain('2 ** 31 - 1 실행')
  })
})
