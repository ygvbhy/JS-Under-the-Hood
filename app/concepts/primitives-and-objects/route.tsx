import Content from './content.mdx'
import { concept } from './meta'

export function meta() {
  return [{ title: `${concept.title} | JS Under the Hood` }]
}

export default function ConceptRoute() {
  return (
    <main>
      <h1>{concept.title}</h1>
      <Content />
    </main>
  )
}
