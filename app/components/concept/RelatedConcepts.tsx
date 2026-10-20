import { Link } from 'react-router'
import { getConcept } from '~/lib/concepts'

export function RelatedConcepts({ slugs }: { slugs: string[] }) {
  if (slugs.length === 0) return null
  return (
    <section aria-labelledby="concept-related">
      <h2 id="concept-related" className="mt-10 mb-3 text-xl font-bold">
        관련 개념
      </h2>
      <ul className="list-disc space-y-2 pl-6">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link to={`/concepts/${slug}`} className="text-accent underline underline-offset-4">
              {getConcept(slug).title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
