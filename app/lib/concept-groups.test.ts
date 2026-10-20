import { describe, expect, it } from 'vitest'
import { groupByCategory } from './concept-groups'
import type { ConceptCategory, ConceptMeta } from './concepts'

function fake(slug: string, category: ConceptCategory): ConceptMeta {
  return {
    slug,
    title: slug,
    summary: '',
    category,
    tags: [],
    goals: [],
    prerequisites: [],
    related: [],
    examples: [],
    simplifications: [],
    references: [],
    reviewedAt: null,
  }
}

describe('groupByCategory', () => {
  it('카테고리 선언 순서대로 묶고 빈 카테고리를 숨긴다', () => {
    const groups = groupByCategory([
      fake('m', 'memory'),
      fake('f1', 'fundamentals'),
      fake('f2', 'fundamentals'),
      fake('a', 'async'),
    ])
    expect(groups.map((g) => g.category)).toEqual(['fundamentals', 'async', 'memory'])
    expect(groups[0].label).toBe('언어 기초')
    expect(groups[0].concepts.map((c) => c.slug)).toEqual(['f1', 'f2'])
  })

  it('개념이 없으면 빈 배열이다', () => {
    expect(groupByCategory([])).toEqual([])
  })
})
