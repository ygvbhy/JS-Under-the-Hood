import { Link } from 'react-router'
import type { ConceptMeta } from '~/lib/concepts'

export function ConceptCard({ concept }: { concept: ConceptMeta }) {
  return (
    <article className="border-border bg-surface rounded-lg border p-4">
      <h4 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg leading-snug font-semibold">
        <Link to={`/concepts/${concept.slug}`} className="text-accent underline underline-offset-4">
          {concept.title}
        </Link>
        {concept.reviewedAt === null && (
          <span className="bg-highlight text-fg border-border rounded-full border px-2 py-0.5 text-xs font-medium">
            검토 중
          </span>
        )}
      </h4>
      <p className="text-fg mt-2">{concept.summary}</p>
      {concept.tags.length > 0 && (
        <ul aria-label="태그" className="mt-3 flex flex-wrap gap-2">
          {concept.tags.map((tag) => (
            <li key={tag} className="text-muted border-border rounded-md border px-2 text-sm">
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
