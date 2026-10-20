import { buildMeta } from '~/lib/seo'
import Content from './content.mdx'
import { concept } from './meta'

export function meta() {
  return buildMeta({
    title: concept.title,
    description: concept.summary,
    path: `/concepts/${concept.slug}`,
  })
}

export default function ConceptRoute() {
  return (
    <article>
      <h1>{concept.title}</h1>
      <Content />
    </article>
  )
}
