import { ConceptLayout } from '~/components/concept/ConceptLayout'
import { mdxComponents } from '~/components/concept/mdx-components'
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
    <ConceptLayout concept={concept}>
      <Content components={mdxComponents} />
    </ConceptLayout>
  )
}
