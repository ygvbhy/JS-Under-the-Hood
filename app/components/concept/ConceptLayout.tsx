import type { ReactNode } from 'react'
import { CATEGORY_LABELS, type ConceptMeta } from '~/lib/concepts'
import { ConceptPager } from './ConceptPager'
import { PrerequisiteList } from './PrerequisiteList'
import { References } from './References'
import { RelatedConcepts } from './RelatedConcepts'
import { ReviewBadge } from './ReviewBadge'
import { SimplificationNote } from './SimplificationNote'

// 개념 상세 페이지 템플릿 (섹션 순서: 계획 4.3).
//
// 폭 규칙 (app.css의 `.concept-article`): 텍스트 블록은 최대 70ch, 본문(MDX)의 직계 자식 중
// `data-wide` 속성이 붙은 블록(예: 시뮬레이터, MDX의 <Wide>)은 최대 1100px까지 넓어지며
// 좁은 prose 열의 가운데를 기준으로 좌우로 확장된다.
export function ConceptLayout({
  concept,
  children,
}: {
  concept: ConceptMeta
  children: ReactNode
}) {
  return (
    <article className="concept-article">
      <header>
        <p className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>{CATEGORY_LABELS[concept.category]}</span>
          <ReviewBadge reviewedAt={concept.reviewedAt} />
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-bold">{concept.title}</h1>
        <p className="text-muted mt-3 text-lg">{concept.summary}</p>
        {concept.tags.length > 0 && (
          <ul aria-label="태그" className="mt-3 flex flex-wrap gap-2">
            {concept.tags.map((tag) => (
              <li key={tag} className="text-muted border-border rounded-md border px-2 text-sm">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      <section aria-labelledby="concept-goals">
        <h2 id="concept-goals" className="mt-10 mb-3 text-xl font-bold">
          학습 목표
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          {concept.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <PrerequisiteList prerequisites={concept.prerequisites} />

      <div className="concept-body">{children}</div>

      <SimplificationNote simplifications={concept.simplifications} />
      <RelatedConcepts slugs={concept.related} />
      <References references={concept.references} />
      <ConceptPager slug={concept.slug} />
    </article>
  )
}
