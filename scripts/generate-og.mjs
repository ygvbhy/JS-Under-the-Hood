// 기본 OG 이미지(public/og-default.png, 1200×630) 생성 스크립트. 일회성으로 실행하고 결과 PNG를 커밋한다.
//   npm run og:generate
// 사이트 이름·설명은 app/lib/site.ts에서 읽고, 색은 app/app.css의 라이트 테마 토큰과 맞춘다.
// 한글 글꼴은 실행한 컴퓨터의 시스템 글꼴을 쓰므로(app.css의 font-sans와 같은 목록), 글꼴이 있는 환경에서 실행한다.
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const WIDTH = 1200
const HEIGHT = 630
const OUT = new URL('../public/og-default.png', import.meta.url)

const siteSource = readFileSync(new URL('../app/lib/site.ts', import.meta.url), 'utf8')
function readConstant(name) {
  const match = siteSource.match(new RegExp(`export const ${name} =\\s*'([^']+)'`))
  if (!match) throw new Error(`app/lib/site.ts에서 ${name}을 찾지 못했습니다`)
  return match[1]
}
const siteName = readConstant('SITE_NAME')
const tagline = readConstant('SITE_DESCRIPTION')

const cssSource = readFileSync(new URL('../app/app.css', import.meta.url), 'utf8')
const lightTokens = cssSource.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ''
function token(name) {
  const match = lightTokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`app.css의 라이트 토큰 --${name}을 찾지 못했습니다`)
  return match[1]
}
const c = Object.fromEntries(['bg', 'fg', 'muted', 'accent'].map((n) => [n, token(n)]))

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    background: ${c.bg}; color: ${c.fg};
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
    word-break: keep-all;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 96px; position: relative;
  }
  .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 24px; background: ${c.accent}; }
  h1 { font-size: 96px; line-height: 1.1; font-weight: 800; letter-spacing: -0.02em; }
  p.tagline { margin-top: 32px; font-size: 40px; line-height: 1.5; color: ${c.muted}; max-width: 900px; }
</style>
</head>
<body>
  <div class="bar"></div>
  <h1>${siteName}</h1>
  <p class="tagline">${tagline}</p>
</body>
</html>`

const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })
  await page.setContent(html)
  const png = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  })
  writeFileSync(OUT, png)
} finally {
  await browser.close()
}
console.log(`og:generate: public/og-default.png (${WIDTH}×${HEIGHT}, ${statSync(OUT).size} bytes)`)
