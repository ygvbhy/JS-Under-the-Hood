import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { columns, rows } from './mode-table'

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

describe('모드 비교표 구조', () => {
  it('모든 행의 칸 수가 열 수와 같다', () => {
    for (const row of rows) expect(row.cells.length).toBe(columns.length)
  })

  it('모든 행의 evidence.example이 meta.examples의 id다', () => {
    const ids = concept.examples.map((e) => e.id)
    for (const row of rows) expect(ids).toContain(row.evidence.example)
  })

  it('모든 예제 id가 한 행 이상의 근거로 쓰인다', () => {
    const used = new Set(rows.map((r) => r.evidence.example))
    for (const example of concept.examples) expect(used).toContain(example.id)
  })

  it('행의 mode와 note 조합이 겹치지 않는다(본문 표의 key)', () => {
    const keys = rows.map((r) => `${r.mode}${r.note ?? ''}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('innerHTML 행', () => {
  it('innerHTML로 넣은 script의 코드는 출력되지 않는다', () => {
    expect(expectedOutputOf('inner-html')).not.toContain('innerHTML')
  })
})

describe('모드 비교표 근거 출력', () => {
  for (const row of rows) {
    it(`${row.mode}${row.note ? ` (${row.note})` : ''}: evidence 줄이 expectedOutput에 순서대로 있다`, () => {
      const output = expectedOutputOf(row.evidence.example)
      expect(isSubsequence(row.evidence.lines, output)).toBe(true)
    })
  }
})

describe('DOMContentLoaded 칸', () => {
  it('defer: DOMContentLoaded가 두 defer 스크립트 뒤에 나온다', () => {
    const out = expectedOutputOf('defer-order')
    const dcl = out.indexOf('DOMContentLoaded')
    expect(dcl).toBeGreaterThan(out.indexOf('first.js interactive 1'))
    expect(dcl).toBeGreaterThan(out.indexOf('second.js interactive'))
    expect(out.indexOf('first.js interactive 1')).toBeGreaterThanOrEqual(0)
    expect(out.indexOf('second.js interactive')).toBeGreaterThanOrEqual(0)
  })

  it('async: DOMContentLoaded가 두 async 스크립트 앞에 나온다', () => {
    const out = expectedOutputOf('async-order')
    const dcl = out.indexOf('DOMContentLoaded')
    expect(dcl).toBeGreaterThanOrEqual(0)
    expect(dcl).toBeLessThan(out.indexOf('fast.js'))
    expect(dcl).toBeLessThan(out.indexOf('slow.js'))
  })
})
