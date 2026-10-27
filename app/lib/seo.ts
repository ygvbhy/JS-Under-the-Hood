import type { MetaDescriptor } from 'react-router'
import type { ConceptMeta } from './concepts'
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

// 프레임워크의 `script:ld+json` 디스크립터 값 타입(Record<string, unknown>은 이 제약을 받지 않는다)
type LdJson = Extract<MetaDescriptor, { 'script:ld+json': unknown }>['script:ld+json']

// 개념 페이지의 구조화 데이터. dateModified는 reviewedAt이 있을 때만 넣는다(sitemap lastmod의 출처이기도 하다).
export function conceptJsonLd(concept: ConceptMeta): LdJson {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: concept.title,
    description: concept.summary,
    url: `${SITE_URL}/concepts/${concept.slug}`,
    inLanguage: 'ko',
    image: OG_IMAGE_URL,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
    ...(concept.reviewedAt ? { dateModified: concept.reviewedAt } : {}),
  }
}

// 홈의 구조화 데이터
export function siteJsonLd(): LdJson {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: 'ko',
  }
}

// 개념 route의 meta(): 기본 메타 태그 + 구조화 데이터
export function buildConceptMeta(concept: ConceptMeta): MetaDescriptor[] {
  return [
    ...buildMeta({
      title: concept.title,
      description: concept.summary,
      path: `/concepts/${concept.slug}`,
    }),
    { 'script:ld+json': conceptJsonLd(concept) },
  ]
}
