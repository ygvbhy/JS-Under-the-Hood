import { describe, expect, it } from 'vitest'
import { buildMeta } from './seo'
import { SITE_NAME, SITE_URL } from './site'

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
    expect(meta).toContainEqual({ name: 'twitter:card', content: 'summary' })
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
