import { Link } from 'react-router'
import { getAdjacentConcepts } from '~/lib/concepts'

export function ConceptPager({ slug }: { slug: string }) {
  const { prev, next, position, total } = getAdjacentConcepts(slug)
  return (
    <nav aria-label="학습 순서" className="border-border mt-10 border-t pt-6">
      <p className="text-muted mb-3 text-sm">
        학습 순서 {position} / {total}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        {prev && (
          <Link
            to={`/concepts/${prev.slug}`}
            className="text-accent break-words underline underline-offset-4 sm:max-w-[48%]"
          >
            <span className="text-muted block text-sm no-underline">이전 개념</span>
            {prev.title}
          </Link>
        )}
        {next && (
          <Link
            to={`/concepts/${next.slug}`}
            className="text-accent break-words underline underline-offset-4 sm:ml-auto sm:max-w-[48%] sm:text-right"
          >
            <span className="text-muted block text-sm no-underline">다음 개념</span>
            {next.title}
          </Link>
        )}
      </div>
    </nav>
  )
}
