import type { ConceptMeta } from '~/lib/concepts'

export function References({ references }: { references: ConceptMeta['references'] }) {
  return (
    <section aria-labelledby="concept-references">
      <h2 id="concept-references" className="mt-10 mb-3 text-xl font-bold">
        참고 자료
      </h2>
      <ul className="list-disc space-y-2 pl-6">
        {references.map((r) => (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-4"
            >
              {r.label}
              <span className="sr-only"> (새 창)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
