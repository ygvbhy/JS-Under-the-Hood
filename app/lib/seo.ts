import type { MetaDescriptor } from 'react-router'
import { SITE_NAME, SITE_URL } from './site'

type BuildMetaInput = {
  title?: string
  description: string
  path: string // '/'로 시작하는 사이트 내 경로
  noindex?: boolean
}

export function buildMeta({ title, description, path, noindex }: BuildMetaInput): MetaDescriptor[] {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  const url = SITE_URL + path
  return [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:locale', content: 'ko_KR' },
    { name: 'twitter:card', content: 'summary' },
    ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
  ]
}
