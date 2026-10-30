import { describe, expect, it } from 'vitest'
import {
  filterConcepts,
  getAdjacentConcepts,
  getConcept,
  listConcepts,
  sortByOrder,
  type ConceptMeta,
} from './concepts'

function stub(overrides: Partial<ConceptMeta>): ConceptMeta {
  return {
    slug: 'stub',
    title: '제목',
    summary: '요약',
    category: 'fundamentals',
    order: 10,
    tags: [],
    goals: ['목표'],
    prerequisites: [],
    related: [],
    examples: [],
    simplifications: ['단순화'],
    references: [{ label: '참고', url: 'https://example.com' }],
    reviewedAt: null,
    ...overrides,
  }
}

const closure = stub({
  slug: 'closure',
  title: 'Closure',
  summary: '함수가 만들어진 환경을 기억합니다.',
  tags: ['Scope', '렉시컬 환경'],
})
const objects = stub({ slug: 'objects', title: '객체', summary: '프로퍼티의 모음', tags: ['변경'] })
const all = [closure, objects]

describe('filterConcepts', () => {
  it('빈 문자열이나 공백만 있는 검색어는 전체를 돌려준다', () => {
    expect(filterConcepts(all, '')).toBe(all)
    expect(filterConcepts(all, '   ')).toBe(all)
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(filterConcepts(all, 'closure')).toEqual([closure])
    expect(filterConcepts(all, 'CLOSURE')).toEqual([closure])
  })

  it('검색어 앞뒤 공백을 무시한다', () => {
    expect(filterConcepts(all, '  closure  ')).toEqual([closure])
  })

  it('제목, 요약, 태그의 일부와 일치하면 찾는다', () => {
    expect(filterConcepts(all, 'clos')).toEqual([closure]) // 제목
    expect(filterConcepts(all, '기억')).toEqual([closure]) // 요약
    expect(filterConcepts(all, 'scop')).toEqual([closure]) // 태그(대소문자 무관)
    expect(filterConcepts(all, '렉시컬')).toEqual([closure]) // 태그
    expect(filterConcepts(all, '프로퍼티')).toEqual([objects])
    expect(filterConcepts(all, '변경')).toEqual([objects])
  })

  it('일치하는 개념이 없으면 빈 배열이다', () => {
    expect(filterConcepts(all, '존재하지 않는 검색어')).toEqual([])
  })
})

describe('listConcepts / getConcept', () => {
  it('제목의 한국어 정렬 순서로 정렬해 돌려준다', () => {
    const titles = listConcepts().map((c) => c.title)
    expect(titles.length).toBeGreaterThan(0)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'ko')))
  })

  it('슬러그로 개념을 찾는다', () => {
    const first = listConcepts()[0]
    expect(getConcept(first.slug)).toBe(first)
  })

  it('없는 슬러그는 오류를 던진다', () => {
    expect(() => getConcept('no-such-concept')).toThrow('개념을 찾을 수 없습니다: no-such-concept')
  })
})

describe('sortByOrder', () => {
  it('order 오름차순으로 정렬한 새 배열을 돌려주고 입력 배열은 바꾸지 않는다', () => {
    const a = stub({ slug: 'a', order: 30 })
    const b = stub({ slug: 'b', order: 10 })
    const c = stub({ slug: 'c', order: 20 })
    const input = [a, b, c]
    const sorted = sortByOrder(input)
    expect(sorted.map((x) => x.slug)).toEqual(['b', 'c', 'a'])
    expect(sorted).not.toBe(input)
    expect(input.map((x) => x.slug)).toEqual(['a', 'b', 'c'])
  })
})

describe('getAdjacentConcepts', () => {
  it('첫 개념은 이전이 없고 position은 1이다', () => {
    const adj = getAdjacentConcepts('primitives-and-objects')
    expect(adj.prev).toBeNull()
    expect(adj.next?.slug).toBe('short-circuit-evaluation')
    expect(adj.position).toBe(1)
    expect(adj.total).toBe(23)
  })

  it('마지막 개념은 다음이 없다', () => {
    const adj = getAdjacentConcepts('for-let')
    expect(adj.prev?.slug).toBe('closure')
    expect(adj.next).toBeNull()
    expect(adj.position).toBe(23)
    expect(adj.total).toBe(23)
  })

  it('중간 개념은 앞뒤 개념을 돌려준다', () => {
    const adj = getAdjacentConcepts('hoisting')
    expect(adj.prev?.slug).toBe('function-calls')
    expect(adj.next?.slug).toBe('scope-chain')
    expect(adj.position).toBe(11)
  })

  it('없는 슬러그는 오류를 던진다', () => {
    expect(() => getAdjacentConcepts('no-such-concept')).toThrow(
      '개념을 찾을 수 없습니다: no-such-concept',
    )
  })
})
