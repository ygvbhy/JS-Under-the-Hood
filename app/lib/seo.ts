import type { MetaDescriptor } from 'react-router'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'

// 기본 OG 이미지(public/og-default.png, scripts/generate-og.mjs로 생성). 크기는 파일과 일치해야 한다.
export const OG_IMAGE_URL = `${SITE_URL}/og-default.png`
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
export const OG_IMAGE_ALT = `${SITE_NAME}: ${SITE_DESCRIPTION}`

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
    { property: 'og:image', content: OG_IMAGE_URL },
    { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
    { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
    { property: 'og:image:alt', content: OG_IMAGE_ALT },
    { name: 'twitter:card', content: 'summary_large_image' },
    ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
  ]
}
