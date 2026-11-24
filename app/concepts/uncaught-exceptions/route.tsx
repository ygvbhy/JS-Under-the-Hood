import { ConceptLayout } from '~/components/concept/ConceptLayout'
import { mdxComponents } from '~/components/concept/mdx-components'
import { buildConceptMeta } from '~/lib/seo'
import Content from './content.mdx'
import { concept } from './meta'

export function meta() {
  return buildConceptMeta(concept)
}

export default function ConceptRoute() {
  return (
    <ConceptLayout concept={concept}>
      <Content components={mdxComponents} />
    </ConceptLayout>
  )
}
