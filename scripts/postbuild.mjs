import { copyFileSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, posix, sep } from 'node:path'

const clientDir = join(process.cwd(), 'build', 'client')

// SITE_URL은 앱 코드(app/lib/site.ts)와 같은 규칙: VITE_SITE_URL, 없으면 기본값, 끝의 슬래시 제거
const rawSiteUrl = process.env.VITE_SITE_URL ?? 'https://js-under-the-hood.vercel.app'
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

const urls = routeDirs.map((dir) => (dir === '' ? `${siteUrl}/` : `${siteUrl}/${dir}`))
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n')}
</urlset>
`
writeFileSync(join(clientDir, 'sitemap.xml'), sitemap)

writeFileSync(
  join(clientDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
)

console.log(`postbuild: sitemap.xml(${urls.length}개 URL), robots.txt 생성 (${siteUrl})`)
