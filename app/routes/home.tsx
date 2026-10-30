import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ConceptCard } from '~/components/site/ConceptCard'
import { groupByCategory } from '~/lib/concept-groups'
import { filterConcepts, listConcepts, sortByOrder } from '~/lib/concepts'
import { buildMeta, siteJsonLd } from '~/lib/seo'
import { SITE_DESCRIPTION, SITE_NAME } from '~/lib/site'
import { useHydrated } from '~/lib/useHydrated'

export function meta() {
  return [
    ...buildMeta({ description: SITE_DESCRIPTION, path: '/' }),
    { 'script:ld+json': siteJsonLd() },
  ]
}

const allConcepts = listConcepts()
// 전체 학습 순서에서의 1부터의 순위. 검색으로 걸러져도 순위는 그대로다.
const rankBySlug = new Map(sortByOrder(allConcepts).map((c, i) => [c.slug, i + 1]))

export default function Home() {
  const hydrated = useHydrated()
  const [params, setParams] = useSearchParams()
  const paramQuery = params.get('q') ?? ''

  // 하이드레이션 안전: 첫 렌더는 프리렌더 HTML과 같게(빈 입력값 + 전체 목록) 두고,
  // 하이드레이션 이후 URL의 ?q=가 바뀔 때(최초 읽기 포함)에만 입력값을 맞춘다.
  // 입력 중에는 로컬 상태가 기준이라 IME 조합이 URL 갱신에 끊기지 않는다.
  const [query, setQuery] = useState('')
  const [seenParam, setSeenParam] = useState<string | null>(null)
  if (hydrated && seenParam !== paramQuery) {
    setSeenParam(paramQuery)
    setQuery(paramQuery)
  }

  // 보기 방식도 같은 방식: 첫 렌더는 항상 분류별 보기, 하이드레이션 뒤에 ?view=를 읽는다.
  const paramView = params.get('view') === 'order' ? 'order' : 'category'
  const [view, setView] = useState<'category' | 'order'>('category')
  const [seenView, setSeenView] = useState<string | null>(null)
  if (hydrated && seenView !== paramView) {
    setSeenView(paramView)
    setView(paramView)
  }

  function handleViewChange(next: 'category' | 'order') {
    setView(next)
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next === 'order') nextParams.set('view', 'order')
        else nextParams.delete('view')
        return nextParams
      },
      { replace: true, preventScrollReset: true },
    )
  }

  function handleChange(value: string) {
    setQuery(value)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === '') next.delete('q')
        else next.set('q', value)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  const results = filterConcepts(allConcepts, query)
  const groups = groupByCategory(results)
  const trimmed = query.trim()
  const statusText =
    results.length > 0
      ? `개념 ${results.length}개`
      : trimmed
        ? `‘${trimmed}’에 맞는 개념이 없습니다.`
        : '아직 등록된 개념이 없습니다.'

  return (
    <div>
      <section aria-labelledby="hero-title">
        <h1 id="hero-title" className="text-3xl font-bold">
          {SITE_NAME}
        </h1>
        <p className="mt-3 text-lg">{SITE_DESCRIPTION}</p>
        <p className="text-muted mt-4">
          먼저 코드를 읽고 결과를 예측해 보세요. 그다음 시뮬레이션을 한 단계씩 따라가며 실제로
          어떻게 실행되는지 확인하고, 마지막으로 그렇게 동작하는 이유를 설명으로 정리합니다.
        </p>
      </section>

      <section aria-labelledby="concepts-title" className="mt-10">
        <h2 id="concepts-title" className="text-2xl font-bold">
          개념 목록
        </h2>
        <div className="mt-4">
          <label htmlFor="concept-search" className="block font-medium">
            개념 검색
          </label>
          <input
            id="concept-search"
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="제목, 요약, 태그로 검색"
            autoComplete="off"
            className="border-border bg-surface text-fg placeholder:text-muted mt-1 block w-full rounded-md border px-3 py-2"
          />
          {hydrated && (
            <div role="group" aria-label="보기 방식" className="mt-3 flex gap-2">
              {(
                [
                  ['category', '분류별'],
                  ['order', '학습 순서'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => handleViewChange(value)}
                  className={`rounded-md border px-3 py-1 text-sm font-medium ${
                    view === value
                      ? 'border-accent bg-highlight text-accent'
                      : 'border-border bg-surface text-fg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <p aria-live="polite" className="text-muted mt-2 text-sm">
            {statusText}
          </p>
        </div>

        {view === 'order' ? (
          <section aria-labelledby="group-order" className="mt-8">
            <h3 id="group-order" className="text-xl font-semibold">
              학습 순서
            </h3>
            <ol className="mt-3 grid list-none gap-4 p-0">
              {sortByOrder(results).map((concept) => (
                <li key={concept.slug}>
                  <ConceptCard concept={concept} position={rankBySlug.get(concept.slug)} />
                </li>
              ))}
            </ol>
          </section>
        ) : (
          groups.map((group) => (
            <section
              key={group.category}
              aria-labelledby={`group-${group.category}`}
              className="mt-8"
            >
              <h3 id={`group-${group.category}`} className="text-xl font-semibold">
                {group.label}
              </h3>
              <div className="mt-3 grid gap-4">
                {group.concepts.map((concept) => (
                  <ConceptCard key={concept.slug} concept={concept} />
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  )
}
