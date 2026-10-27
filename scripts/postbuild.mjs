import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, posix, sep } from 'node:path'

const clientDir = join(process.cwd(), 'build', 'client')

// SITE_URL은 앱 코드(app/lib/site.ts)와 같은 규칙: VITE_SITE_URL, 없으면 기본값, 끝의 슬래시 제거
const rawSiteUrl = process.env.VITE_SITE_URL ?? 'https://js-under-the-hood-kappa.vercel.app'
if (!/^https?:\/\/[^\s/?#]+/.test(rawSiteUrl) || !URL.canParse(rawSiteUrl)) {
  throw new Error(`VITE_SITE_URL이 올바른 http(s) URL이 아닙니다: ${JSON.stringify(rawSiteUrl)}`)
}
const siteUrl = rawSiteUrl.replace(/\/$/, '')

// 404 프리렌더 결과를 정적 호스트가 미지 경로에 사용하는 404.html로 복사
const notFoundSrc = join(clientDir, '404', 'index.html')
if (!existsSync(notFoundSrc)) {
  throw new Error(`프리렌더된 404 페이지가 없습니다: ${notFoundSrc}`)
}
copyFileSync(notFoundSrc, join(clientDir, '404.html'))

// 모든 경로가 프리렌더되므로 SPA fallback은 불필요 (200 응답 쓰레기 페이지 방지)
rmSync(join(clientDir, '__spa-fallback.html'), { force: true })

// sitemap.xml: build/client/**/index.html (404 제외)
const routeDirs = readdirSync(clientDir, { recursive: true })
  .map((p) => String(p).split(sep).join(posix.sep))
  .filter((p) => p === 'index.html' || p.endsWith('/index.html'))
  .map((p) => p.slice(0, -'index.html'.length).replace(/\/$/, ''))
  .filter((dir) => dir !== '404')
  .sort()

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 개념 페이지의 lastmod: 프리렌더된 HTML의 JSON-LD dateModified (HTML과 sitemap이 같은 값을 쓴다)
// JSON-LD가 없거나 TechArticle이 아니면 빌드 실패, dateModified가 없으면 lastmod만 생략
function readLastmod(dir) {
  const file = join(clientDir, ...dir.split('/'), 'index.html')
  const html = readFileSync(file, 'utf8')
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!match) throw new Error(`개념 페이지에 JSON-LD(application/ld+json)가 없습니다: ${file}`)
  let data
  try {
    data = JSON.parse(match[1])
  } catch (e) {
    throw new Error(`JSON-LD를 JSON.parse할 수 없습니다: ${file} (${e.message})`, { cause: e })
  }
  if (data === null || typeof data !== 'object' || data['@type'] !== 'TechArticle') {
    throw new Error(`JSON-LD가 TechArticle 객체가 아닙니다: ${file}`)
  }
  if (!('dateModified' in data)) return undefined
  const v = data.dateModified
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new Error(`dateModified가 YYYY-MM-DD 형식이 아닙니다: ${file} (${JSON.stringify(v)})`)
  }
  return v
}

const entries = routeDirs.map((dir) => ({
  url: dir === '' ? `${siteUrl}/` : `${siteUrl}/${dir}`,
  lastmod: /^concepts\/[^/]+$/.test(dir) ? readLastmod(dir) : undefined,
}))
const lastmodCount = entries.filter((e) => e.lastmod).length
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${escapeXml(e.url)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>
`
writeFileSync(join(clientDir, 'sitemap.xml'), sitemap)

writeFileSync(
  join(clientDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
)

console.log(
  `postbuild: sitemap.xml(${entries.length}개 URL, lastmod ${lastmodCount}개), robots.txt 생성 (${siteUrl})`,
)
