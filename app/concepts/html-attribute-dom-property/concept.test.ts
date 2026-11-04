import { describe, expect, it } from 'vitest'
import { columns, rows } from './attribute-table'
import { concept } from './meta'

// 표에 근거로 쓰이지 않는 예제. 본문에서 따로 다루며, 목록이 조용히 어긋나지 않게 아래 테스트가 정확히 일치하는지 검사한다.
const UNUSED_EXAMPLES = ['attributes', 'accessor']

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

describe('대응 표 구조', () => {
  it('모든 행의 칸 수가 열 수와 같다', () => {
    for (const row of rows) expect(row.cells.length).toBe(columns.length)
  })

  it('모든 행의 evidence.example이 meta.examples의 id다', () => {
    const ids = concept.examples.map((e) => e.id)
    for (const row of rows) {
      for (const ev of row.evidence) expect(ids).toContain(ev.example)
    }
  })

  it('모든 행에 근거가 한 개 이상 있다', () => {
    for (const row of rows) expect(row.evidence.length).toBeGreaterThan(0)
  })

  it('어트리뷰트·요소·프로퍼티 조합이 겹치지 않는다(본문 표의 key)', () => {
    const keys = rows.map((r) => `${r.attribute}|${r.element}|${r.property}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('표 근거로 쓰이지 않는 예제는 명시한 목록과 정확히 같다', () => {
    const used = new Set(rows.flatMap((r) => r.evidence.map((ev) => ev.example)))
    const unused = concept.examples.map((e) => e.id).filter((id) => !used.has(id))
    expect(unused.sort()).toEqual([...UNUSED_EXAMPLES].sort())
  })
})

describe('대응 표 근거 출력', () => {
  for (const row of rows) {
    for (const ev of row.evidence) {
      it(`${row.attribute} / ${row.element} / ${row.property} (${ev.example}): evidence 줄이 expectedOutput에 순서대로 있다`, () => {
        expect(isSubsequence(ev.lines, expectedOutputOf(ev.example))).toBe(true)
      })
    }
  }
})
