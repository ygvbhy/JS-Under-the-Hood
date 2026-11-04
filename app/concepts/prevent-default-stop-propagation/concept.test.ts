import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTION_EXAMPLE_ID, evidenceLine, rows } from './action-table'
import { concept } from './meta'

const examplesDir = join(import.meta.dirname, 'examples')

function exampleOf(id: string) {
  const example = concept.examples.find((e) => e.id === id)
  if (!example) throw new Error(`예제 없음: ${id}`)
  return example
}

describe('meta 예제', () => {
  it('모든 예제 id에 해당하는 파일이 examples/에 있다', () => {
    for (const e of concept.examples) {
      expect(existsSync(join(examplesDir, e.file))).toBe(true)
    }
  })
})

describe('호출별 비교표', () => {
  it('행의 출력 줄이 actions 예제의 expectedOutput과 순서·개수까지 정확히 같다', () => {
    expect(rows.map(evidenceLine)).toEqual(exampleOf(ACTION_EXAMPLE_ID).expectedOutput)
  })

  it('행 name이 겹치지 않는다', () => {
    const names = rows.map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('actions.html에 trial(name)이 행 순서대로 있다', () => {
    const source = readFileSync(join(examplesDir, exampleOf(ACTION_EXAMPLE_ID).file), 'utf8')
    const names = [...source.matchAll(/^trial\('([^']+)'/gm)].map((m) => m[1])
    expect(names).toEqual(rows.map((r) => r.name))
  })

  it('체크박스 click은 cancelable이므로 기본 동작이 일어났는지는 defaultPrevented의 반대다', () => {
    for (const r of rows) expect(r.checked).toBe(!r.defaultPrevented)
  })

  it('같은 방문의 남은 리스너가 불리지 않았다면 부모 리스너도 불리지 않았다', () => {
    for (const r of rows) {
      if (!r.rest) expect(r.parent).toBe(false)
    }
  })
})
