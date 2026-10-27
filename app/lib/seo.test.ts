import { describe, expect, it } from 'vitest'
import type { ConceptMeta } from './concepts'
import {
  buildConceptMeta,
  buildMeta,
  conceptJsonLd,
  OG_IMAGE_ALT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  siteJsonLd,
} from './seo'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'

describe('buildMeta', () => {
  it('제목이 있으면 "제목 | 사이트명" 형식을 쓴다', () => {
    const meta = buildMeta({ title: '소개', description: '설명', path: '/about' })
    expect(meta).toContainEqual({ title: `소개 | ${SITE_NAME}` })
    expect(meta).toContainEqual({ property: 'og:title', content: `소개 | ${SITE_NAME}` })
  })

  it('제목이 없으면 사이트명만 쓴다', () => {
    const meta = buildMeta({ description: '설명', path: '/' })
    expect(meta).toContainEqual({ title: SITE_NAME })
  })

  it('description, canonical, og, twitter 태그를 포함한다', () => {
    const meta = buildMeta({ title: '소개', description: '설명', path: '/about' })
    expect(meta).toContainEqual({ name: 'description', content: '설명' })
    expect(meta).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: `${SITE_URL}/about`,
    })
    expect(meta).toContainEqual({ property: 'og:type', content: 'website' })
    expect(meta).toContainEqual({ property: 'og:site_name', content: SITE_NAME })
    expect(meta).toContainEqual({ property: 'og:description', content: '설명' })
    expect(meta).toContainEqual({ property: 'og:url', content: `${SITE_URL}/about` })
    expect(meta).toContainEqual({ property: 'og:locale', content: 'ko_KR' })
    expect(meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' })
  })

  it('og:image는 절대 URL이고 크기·대체 텍스트를 함께 둔다', () => {
    const meta = buildMeta({ description: '설명', path: '/' })
    expect(OG_IMAGE_URL).toBe(`${SITE_URL}/og-default.png`)
    expect(OG_IMAGE_URL).toMatch(/^https?:\/\//)
    expect(meta).toContainEqual({ property: 'og:image', content: OG_IMAGE_URL })
    expect(meta).toContainEqual({ property: 'og:image:width', content: String(OG_IMAGE_WIDTH) })
    expect(meta).toContainEqual({ property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) })
    expect(meta).toContainEqual({ property: 'og:image:alt', content: OG_IMAGE_ALT })
  })

  it('SITE_URL 끝에 슬래시가 없다', () => {
    expect(SITE_URL).toMatch(/^https?:\/\/.+[^/]$/)
  })

  it('noindex일 때만 robots 메타를 넣는다', () => {
    const base = { description: '설명', path: '/404' }
    expect(buildMeta(base).some((m) => 'name' in m && m.name === 'robots')).toBe(false)
    expect(buildMeta({ ...base, noindex: true })).toContainEqual({
      name: 'robots',
      content: 'noindex',
    })
  })
})

const sample: ConceptMeta = {
  slug: 'sample',
  title: '예시 && 개념',
  summary: '예시 요약',
  category: 'fundamentals',
  tags: [],
  goals: ['목표'],
  prerequisites: [],
  related: [],
  examples: [],
  simplifications: ['단순화'],
  references: [{ label: '참고', url: 'https://example.com' }],
  reviewedAt: '2026-10-27',
}

const hasLdJson = (m: object) => 'script:ld+json' in m

describe('conceptJsonLd', () => {
  it('TechArticle 필드를 채운다', () => {
    expect(conceptJsonLd(sample)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: '예시 && 개념',
      description: '예시 요약',
      url: `${SITE_URL}/concepts/sample`,
      inLanguage: 'ko',
      image: OG_IMAGE_URL,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
      dateModified: '2026-10-27',
    })
  })

  it('reviewedAt이 null이면 dateModified 키가 없다', () => {
    const result = conceptJsonLd({ ...sample, reviewedAt: null }) as Record<string, unknown>
    expect('dateModified' in result).toBe(false)
  })
})

describe('siteJsonLd', () => {
  it('WebSite 필드를 채운다', () => {
    expect(siteJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      inLanguage: 'ko',
    })
  })
})

describe('buildConceptMeta', () => {
  it('buildMeta 결과를 모두 포함하고 JSON-LD 디스크립터가 정확히 1개다', () => {
    const base = buildMeta({
      title: sample.title,
      description: sample.summary,
      path: '/concepts/sample',
    })
    const meta = buildConceptMeta(sample)
    for (const item of base) expect(meta).toContainEqual(item)
    expect(meta.filter(hasLdJson)).toEqual([{ 'script:ld+json': conceptJsonLd(sample) }])
    expect(meta).toHaveLength(base.length + 1)
  })

  it('buildMeta 출력에는 script:ld+json이 없다', () => {
    expect(buildMeta({ description: '설명', path: '/' }).some(hasLdJson)).toBe(false)
  })
})
