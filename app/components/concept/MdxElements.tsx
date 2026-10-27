import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router'
import { slugify } from '~/lib/slugify'

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return Children.toArray(node).map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

const headingClass = {
  h2: 'mt-10 mb-3 text-xl font-bold',
  h3: 'mt-8 mb-2 text-lg font-bold',
}

// 제목에 id 앵커를 붙인다. 같은 텍스트의 제목이 있으면 id가 겹치므로 한 문서 안에서 제목을 중복하지 않는다.
export function Heading({
  as: Tag,
  children,
  ...props
}: ComponentProps<'h2'> & { as: 'h2' | 'h3' }) {
  const id = slugify(textOf(children))
  return (
    <Tag {...props} id={id} className={`scroll-mt-4 ${headingClass[Tag]}`}>
      {children}
      <a
        href={`#${id}`}
        aria-label="이 제목으로 연결"
        className="text-muted ml-2 text-base font-normal no-underline hover:underline"
      >
        #
      </a>
    </Tag>
  )
}

export function Anchor({ href = '', children, ...props }: ComponentProps<'a'>) {
  const cls = 'text-accent underline underline-offset-4'
  if (href.startsWith('/')) {
    return (
      <Link {...props} to={href} className={cls}>
        {children}
      </Link>
    )
  }
  if (/^https?:\/\//.test(href)) {
    return (
      <a {...props} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
        <span className="sr-only"> (새 창)</span>
      </a>
    )
  }
  return (
    <a {...props} href={href} className={cls}>
      {children}
    </a>
  )
}

// 시뮬레이터처럼 prose 폭(70ch)보다 넓어야 하는 블록용. 스타일은 app.css의 `[data-wide]` 규칙.
export function Wide(props: ComponentProps<'div'>) {
  return <div {...props} data-wide="" />
}
