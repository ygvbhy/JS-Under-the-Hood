export type ConceptCategory = 'fundamentals' | 'execution' | 'objects' | 'async' | 'memory'

export type ConceptMeta = {
  slug: string // 폴더명과 동일 (테스트)
  title: string
  summary: string // 카드·meta description, ≤160자 (테스트)
  category: ConceptCategory
  tags: string[]
  goals: string[] // ≥1
  prerequisites: { label: string; slug?: string }[] // slug 있으면 존재 검사, 자기 자신 금지
  related: string[] // 존재하는 slug만
  examples: {
    id: string
    file: string // examples/ 하위 파일명
    runtime: 'ecmascript' // MVP: Node vm, sloppy script 기준
    expectedOutput: string[] // console.log 줄 단위
  }[]
  simplifications: string[] // ≥1 (단순화가 없으면 그 사유를 1줄로)
  references: { label: string; url: string }[] // ≥1
  reviewedAt: string | null // YYYY-MM-DD, null이면 "검토 중" 배지
}

export const CATEGORY_LABELS: Record<ConceptCategory, string> = {
  fundamentals: '언어 기초',
  execution: '실행 모델',
  objects: '객체와 프로토타입',
  async: '비동기',
  memory: '메모리',
}

// 개념 폴더의 meta.ts는 순수 데이터라 홈 청크에 본문·시뮬레이터가 딸려오지 않는다.
const modules = import.meta.glob<{ concept: ConceptMeta }>('../concepts/*/meta.ts', {
  eager: true,
})

const registry: ConceptMeta[] = Object.values(modules).map((m) => m.concept)

export function listConcepts(): ConceptMeta[] {
  return [...registry].sort((a, b) => a.title.localeCompare(b.title, 'ko'))
}

export function getConcept(slug: string): ConceptMeta {
  const found = registry.find((c) => c.slug === slug)
  if (!found) throw new Error(`개념을 찾을 수 없습니다: ${slug}`)
  return found
}

export function filterConcepts(concepts: ConceptMeta[], query: string): ConceptMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return concepts
  return concepts.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)),
  )
}
