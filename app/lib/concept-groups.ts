import { CATEGORY_LABELS, type ConceptCategory, type ConceptMeta } from './concepts'

export type ConceptGroup = {
  category: ConceptCategory
  label: string
  concepts: ConceptMeta[]
}

// CATEGORY_LABELS 선언 순서대로 묶고, 개념이 없는 카테고리는 뺀다. 그룹 안 순서는 입력 순서를 유지한다.
export function groupByCategory(concepts: ConceptMeta[]): ConceptGroup[] {
  return (Object.keys(CATEGORY_LABELS) as ConceptCategory[])
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      concepts: concepts.filter((c) => c.category === category),
    }))
    .filter((group) => group.concepts.length > 0)
}
