import type { MDXComponents } from 'mdx/types'
import { Callout } from './Callout'
import { Anchor, Heading, Wide } from './MdxElements'
import { PredictQuiz } from './PredictQuiz'

// `pre`(Shiki가 class="shiki …"를 붙임)와 인라인 `code`는 override하지 않고 app.css로 스타일한다:
// `pre.shiki`는 블록 스타일, `.concept-article :not(pre) > code`는 인라인 코드 스타일.
export const mdxComponents: MDXComponents = {
  h2: (props) => <Heading as="h2" {...props} />,
  h3: (props) => <Heading as="h3" {...props} />,
  p: (props) => <p {...props} className="my-4" />,
  ul: (props) => <ul {...props} className="my-4 list-disc space-y-1 pl-6" />,
  ol: (props) => <ol {...props} className="my-4 list-decimal space-y-1 pl-6" />,
  a: Anchor,
  blockquote: (props) => (
    <blockquote {...props} className="border-border text-muted my-4 border-l-4 pl-4" />
  ),
  Callout,
  PredictQuiz,
  Wide,
}
