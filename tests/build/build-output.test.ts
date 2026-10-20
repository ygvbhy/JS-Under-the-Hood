import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listConcepts } from '~/lib/concepts'
import { SITE_NAME, SITE_URL } from '~/lib/site'

// L5: 프리렌더·SEO 빌드 결과. `npm run build` 이후의 build/client를 검사한다.
const clientDir = join(process.cwd(), 'build', 'client')
const read = (path: string) => readFileSync(join(clientDir, path), 'utf8')

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const htmlToText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

// content.mdx에서 첫 번째 평문 문장(마크다운 기호 제외)을 뽑아 본문 렌더 여부를 확인한다.
function firstProseLine(slug: string): string {
  const mdx = readFileSync(join(process.cwd(), 'app', 'concepts', slug, 'content.mdx'), 'utf8')
  let inFence = false
  for (const raw of mdx.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('```')) inFence = !inFence
    if (inFence || !line || /^(#|import |export |<|```|[-*>|]|\d+\.)/.test(line)) continue
    return line
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '')
      .trim()
  }
  throw new Error(`${slug}/content.mdx에서 본문 문장을 찾지 못했습니다`)
}

const concepts = listConcepts()

describe('개념 상세 HTML', () => {
  it.each(concepts.map((c) => [c.slug, c] as const))('%s', (slug, concept) => {
    const html = read(`concepts/${slug}/index.html`)
    const text = htmlToText(html)
    expect(html).toContain(`<title>${escapeHtml(`${concept.title} | ${SITE_NAME}`)}</title>`)
    expect(text).toContain(firstProseLine(slug))
    expect(html).toContain('class="shiki')
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/concepts/${slug}"`)
    expect(html).toContain('property="og:title"')
    expect(html).toContain('lang="ko"')
    for (const heading of ['동작 원리', '예제', '결과와 이유']) {
      expect(text).toContain(heading)
    }
  })
})

describe('홈·소개 HTML', () => {
  it('홈에 모든 개념 제목과 링크가 있다', () => {
    const html = read('index.html')
    for (const c of concepts) {
      expect(html).toContain(escapeHtml(c.title))
      expect(html).toContain(`href="/concepts/${c.slug}"`)
    }
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/"`)
  })

  it('소개 페이지에 정확성 정책 앵커가 있다', () => {
    const html = read('about/index.html')
    expect(html).toContain('id="accuracy"')
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/about"`)
  })
})

describe('404', () => {
  it('404.html이 있고 noindex다', () => {
    expect(existsSync(join(clientDir, '404.html'))).toBe(true)
    expect(read('404.html')).toContain('noindex')
  })

  it('__spa-fallback.html은 없다', () => {
    expect(existsSync(join(clientDir, '__spa-fallback.html'))).toBe(false)
  })
})

describe('sitemap.xml·robots.txt', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

  it('홈, 소개, 모든 개념 URL을 포함한다', () => {
    expect(locs).toContain(`${SITE_URL}/`)
    expect(locs).toContain(`${SITE_URL}/about`)
    for (const c of concepts) expect(locs).toContain(`${SITE_URL}/concepts/${c.slug}`)
  })

  it('404는 포함하지 않는다', () => {
    expect(locs.some((u) => u.includes('/404'))).toBe(false)
  })

  it('robots.txt에 Sitemap 줄이 있다', () => {
    const robots = read('robots.txt')
    expect(robots).toContain('User-agent: *')
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })
})
