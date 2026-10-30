import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listConcepts, sortByOrder } from '~/lib/concepts'
import { OG_IMAGE_HEIGHT, OG_IMAGE_URL, OG_IMAGE_WIDTH } from '~/lib/seo'
import { SITE_NAME, SITE_URL } from '~/lib/site'

// L5: 프리렌더·SEO 빌드 결과. `npm run build` 이후의 build/client를 검사한다.
const clientDir = join(process.cwd(), 'build', 'client')
const read = (path: string) => readFileSync(join(clientDir, path), 'utf8')

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

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

// 레지스트리(import.meta.glob)가 옛 파일 목록에 얼어붙으면 새 개념이 조용히 검사에서 빠진다
describe('개념 레지스트리', () => {
  it('개념 수가 app/concepts의 폴더 수와 같다', () => {
    const folders = readdirSync(join(process.cwd(), 'app', 'concepts'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    expect(concepts).toHaveLength(folders.length)
  })
})

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
    // ConceptLayout이 메타데이터로 그리는 섹션 (선행 개념은 prerequisites가 있는 개념만)
    const sections = ['학습 목표', '이 시각화에서 단순화한 부분', '참고 자료']
    if (concept.prerequisites.length > 0) sections.push('선행 개념')
    for (const heading of sections) {
      expect(html).toMatch(new RegExp(`<h2[^>]*>${heading}</h2>`))
    }
    // PredictQuiz를 쓰는 개념은 하이드레이션 전 마크업(JS 없이 정답 열람 가능)이 있어야 한다
    const mdx = readFileSync(join(process.cwd(), 'app', 'concepts', slug, 'content.mdx'), 'utf8')
    if (mdx.includes('<PredictQuiz')) expect(html).toContain('<details')
  })
})

// 첫 개념의 시뮬레이터는 프리렌더 HTML에 단계 0 상태가 정적으로 들어 있어야 하고,
// 본문보다 넓은 블록으로 배치되도록 .concept-body의 직계 자식이어야 한다(app.css의 [data-wide] 규칙).
describe('시뮬레이터 프리렌더 (primitives-and-objects)', () => {
  const html = read('concepts/primitives-and-objects/index.html')
  const text = htmlToText(html)

  it('단계 0 설명과 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('코드를 실행하기 전입니다')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
    expect(text).toContain('(아직 출력 없음)')
  })

  it('시뮬레이터 루트가 data-wide 영역이고 .concept-body의 직계 자식이다', () => {
    const region = html.match(
      /<div[^>]*role="region"[^>]*aria-label="원시 값과 객체 시뮬레이터"[^>]*>/,
    )
    expect(region, '시뮬레이터 region이 없습니다').not.toBeNull()
    expect(region![0]).toContain('data-wide')
    // .concept-body 안에서 div 깊이가 0인 위치(직계 자식)여야 하고, <p>로 감싸이면 안 된다
    const bodyOpen = '<div class="concept-body">'
    const bodyStart = html.indexOf(bodyOpen)
    expect(bodyStart).toBeGreaterThan(-1)
    const between = html.slice(bodyStart + bodyOpen.length, region!.index)
    const opens = between.match(/<div[\s>]/g)?.length ?? 0
    const closes = between.match(/<\/div>/g)?.length ?? 0
    expect(opens - closes, '시뮬레이터가 .concept-body의 직계 자식이 아닙니다').toBe(0)
    expect(between.trimEnd().endsWith('<p>')).toBe(false)
  })

  it('세 시나리오 선택 라디오가 있다', () => {
    for (const label of ['재할당', '변경', '함수에 전달']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })
})

// 두 번째 개념의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
// React가 텍스트 노드 사이에 넣는 주석(<!-- -->)은 htmlToText가 태그와 함께 제거한다.
describe('시뮬레이터 프리렌더 (short-circuit-evaluation)', () => {
  const html = read('concepts/short-circuit-evaluation/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 평가 중인 식이 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="단축 평가 시뮬레이터"/)
    for (const label of ['값을 돌려줌', '오른쪽 건너뛰기', '?? 와 ||', '?. 체인']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 5개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(5)
  })
})

// 세 번째 개념(type-coercion)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (type-coercion)', () => {
  const html = read('concepts/type-coercion/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 계산 중인 연산이 없습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="암묵적 타입 변환 시뮬레이터"/)
    for (const label of ['+ 의 순서', '- 와 + 섞기', '> 비교']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 5개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(5)
  })
})

// 네 번째 개념(equality-operators)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (equality-operators)', () => {
  const html = read('concepts/equality-operators/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 비교 중인 식이 없습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="동등 비교 시뮬레이터"/)
    for (const label of ['숫자와 문자열', '불리언과 비교', 'null과 undefined']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 5개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(5)
  })
})

// 일곱 번째 개념(increment-decrement)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (increment-decrement)', () => {
  const html = read('concepts/increment-decrement/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 평가 중인 식이 없습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="증감 연산자 시뮬레이터"/)
    for (const label of ['후위와 전위', '자기 자신에 대입', '피연산자 평가 순서']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 6개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(6)
  })
})

// 다섯 번째 개념(number-type)은 시뮬레이터 없이 표와 퀴즈로 구성된다. 둘 다 프리렌더 HTML에 있어야 한다.
describe('프리렌더 (number-type)', () => {
  const html = read('concepts/number-type/index.html')
  const text = htmlToText(html)

  it('퀴즈 정답이 <details>로 4개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('0.1이 실제로 저장되는 값이 표에 있다', () => {
    expect(text).toContain('0.1000000000000000055511151231257827021181583404541015625')
  })
})

// 여섯 번째 개념(typeof-operator)은 시뮬레이터 없이 표와 퀴즈로 구성된다. 둘 다 프리렌더 HTML에 있어야 한다.
describe('프리렌더 (typeof-operator)', () => {
  const html = read('concepts/typeof-operator/index.html')
  const text = htmlToText(html)

  it('퀴즈 정답이 <details>로 5개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it('함수 표현식 행이 표에 있다', () => {
    expect(text).toContain('function () {}')
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

describe('OG 이미지', () => {
  const pages = [
    'index.html',
    'about/index.html',
    '404.html',
    ...concepts.map((c) => `concepts/${c.slug}/index.html`),
  ]

  it.each(pages)('%s에 og:image·twitter:card 메타가 있다', (page) => {
    const html = read(page)
    expect(html).toContain(`<meta property="og:image" content="${OG_IMAGE_URL}"`)
    expect(html).toContain(`<meta property="og:image:width" content="${OG_IMAGE_WIDTH}"`)
    expect(html).toContain(`<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}"`)
    expect(html).toContain('property="og:image:alt"')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"')
  })

  it('og-default.png가 1200×630 PNG이고 200KB 미만이다', () => {
    expect(existsSync(join(clientDir, 'og-default.png'))).toBe(true)
    const png = readFileSync(join(clientDir, 'og-default.png'))
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
    // IHDR: 바이트 16~23에 너비·높이(big-endian)
    expect(png.readUInt32BE(16)).toBe(OG_IMAGE_WIDTH)
    expect(png.readUInt32BE(20)).toBe(OG_IMAGE_HEIGHT)
    expect(png.length).toBeLessThan(200 * 1024)
  })
})

const LD_JSON_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
const ldJsonBodies = (html: string) => [...html.matchAll(LD_JSON_RE)].map((m) => m[1])

describe('구조화 데이터(JSON-LD)', () => {
  it.each(concepts.map((c) => [c.slug, c] as const))(
    '%s는 TechArticle JSON-LD 1개를 가진다',
    (slug, concept) => {
      const bodies = ldJsonBodies(read(`concepts/${slug}/index.html`))
      expect(bodies).toHaveLength(1)
      const data = JSON.parse(bodies[0])
      expect(data['@type']).toBe('TechArticle')
      expect(data.headline).toBe(concept.title)
      expect(data.url).toBe(`${SITE_URL}/concepts/${slug}`)
      expect(data.inLanguage).toBe('ko')
      if (concept.reviewedAt === null) {
        expect('dateModified' in data).toBe(false)
      } else {
        expect(data.dateModified).toBe(concept.reviewedAt)
      }
    },
  )

  it('홈은 WebSite JSON-LD 1개를 가진다', () => {
    const bodies = ldJsonBodies(read('index.html'))
    expect(bodies).toHaveLength(1)
    const data = JSON.parse(bodies[0])
    expect(data['@type']).toBe('WebSite')
    expect(data.url).toBe(`${SITE_URL}/`)
  })

  it.each(['about/index.html', '404.html'])('%s에는 JSON-LD가 없다', (page) => {
    expect(ldJsonBodies(read(page))).toHaveLength(0)
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

  const sitemap = read('sitemap.xml')
  const urlElement = (loc: string) => {
    const el = sitemap.match(new RegExp(`<url><loc>${loc}</loc>[\\s\\S]*?</url>`))
    expect(el, `${loc} 항목이 sitemap에 없습니다`).not.toBeNull()
    return el![0]
  }

  it.each(concepts.map((c) => [c.slug, c] as const))(
    '%s의 lastmod는 reviewedAt과 같다',
    (slug, concept) => {
      const el = urlElement(`${SITE_URL}/concepts/${slug}`)
      if (concept.reviewedAt === null) expect(el).not.toContain('<lastmod>')
      else expect(el).toContain(`<lastmod>${concept.reviewedAt}</lastmod>`)
    },
  )

  it('홈과 소개 항목에는 lastmod가 없다', () => {
    expect(urlElement(`${SITE_URL}/`)).not.toContain('<lastmod>')
    expect(urlElement(`${SITE_URL}/about`)).not.toContain('<lastmod>')
  })
})

// 여덟 번째 개념(switch-break-continue)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (switch-break-continue)', () => {
  const html = read('concepts/switch-break-continue/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 실행 중인 switch나 반복문이 없습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="switch와 break·continue 시뮬레이터"/)
    for (const label of ['break가 없을 때', '반복문의 break와 continue', '반복문 안의 switch']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 7개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(7)
  })
})

// 아홉 번째 개념(property-keys)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (property-keys)', () => {
  const html = read('concepts/property-keys/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('이 단계에는 프로퍼티 접근이 없습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="프로퍼티 키 시뮬레이터"/)
    for (const label of ['숫자 키와 문자열 키', '점 표기와 대괄호 표기', '추가·갱신·삭제']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 7개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(7)
  })
})

// 열 번째 개념(function-calls)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (function-calls)', () => {
  const html = read('concepts/function-calls/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('실행 중인 함수 호출이 없습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="함수 호출 시뮬레이터"/)
    for (const label of ['인수 개수가 다를 때', 'return이 없을 때', '인수 평가 순서']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 6개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(6)
  })
})

// 열한 번째 개념(hoisting)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (hoisting)', () => {
  const html = read('concepts/hoisting/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 코드를 실행하지 않았습니다.')
    expect(text).toContain('아직 만들어진 이름이 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="호이스팅 시뮬레이터"/)
    for (const label of ['var 선언 전 참조', '함수 선언과 함수 표현식', '같은 이름의 var와 함수']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 5개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(5)
  })
})

// 열두 번째 개념(scope-chain)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (scope-chain)', () => {
  const html = read('concepts/scope-chain/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 코드를 실행하지 않았습니다.')
    expect(text).toContain('아직 만들어진 스코프가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="스코프 체인 시뮬레이터"/)
    for (const label of ['스코프 체인', '렉시컬 스코프', '가려진 이름과 선언 처리']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 5개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(5)
  })
})

// 열세 번째 개념(block-scope)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (block-scope)', () => {
  const html = read('concepts/block-scope/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 코드를 실행하지 않았습니다.')
    expect(text).toContain('아직 만들어진 스코프가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="블록 스코프 시뮬레이터"/)
    for (const label of ['블록 안의 var와 let', '함수 안의 블록', '암묵적 전역']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 8개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(8)
  })
})

// 열네 번째 개념(tdz)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (tdz)', () => {
  const html = read('concepts/tdz/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('아직 코드를 실행하지 않았습니다.')
    expect(text).toContain('아직 만들어진 스코프가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="TDZ 시뮬레이터"/)
    for (const label of ['선언 전에 읽기', '안쪽 블록의 가림', '시점이 정한다']) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 6개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(6)
  })
})

// 열다섯 번째 개념(property-attributes)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (property-attributes)', () => {
  const html = read('concepts/property-attributes/index.html')
  const text = htmlToText(html)

  it('단계 0(실행 전) 텍스트와 빈 상태 문구가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
    expect(text).toContain('이 단계에서는 프로퍼티를 다루지 않습니다.')
    expect(text).toContain('아직 표시할 변수가 없습니다.')
    expect(text).toContain('아직 이 코드가 만든 객체가 없습니다.')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="프로퍼티 어트리뷰트 시뮬레이터"/)
    for (const label of [
      '쓰기 금지: sloppy mode',
      '쓰기 금지: strict mode',
      'getter는 읽을 때 호출된다',
      'freeze는 얕다',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 8개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(8)
  })

  it('본문의 표가 <table>로 프리렌더된다', () => {
    expect(html).toContain('<table')
  })
})

// 열여섯 번째 개념(new-operator)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (new-operator)', () => {
  const html = read('concepts/new-operator/index.html')
  const text = htmlToText(html)

  it('단계 1(실행 전) 텍스트가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="new 연산자 시뮬레이터"/)
    for (const label of [
      '객체 두 개 만들기',
      '객체를 return하면',
      '원시 값을 return하면',
      'new 없이 호출하면',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

// 열일곱 번째 개념(prototype-chain)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (prototype-chain)', () => {
  const html = read('concepts/prototype-chain/index.html')
  const text = htmlToText(html)

  it('단계 1(실행 전) 텍스트가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="프로토타입 체인 시뮬레이터"/)
    for (const label of [
      '프로토타입 체인',
      'prototype 프로퍼티와 [[Prototype]]',
      '대입과 섀도잉',
      'instanceof',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

// 일곱 번째 개념(primitive-methods)은 시뮬레이터 없이 표와 퀴즈로 구성된다. 둘 다 프리렌더 HTML에 있어야 한다.
describe('프리렌더 (primitive-methods)', () => {
  const html = read('concepts/primitive-methods/index.html')
  const text = htmlToText(html)

  it('퀴즈 정답이 <details>로 9개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(9)
  })

  it('래퍼 객체 표의 행이 있다', () => {
    expect(text).toContain("'hi'.length")
    expect(text).toContain("new Symbol('id')")
  })
})

// 추가 게시글(global-object)은 시뮬레이터 없이 표와 퀴즈로 구성된다. 둘 다 프리렌더 HTML에 있어야 한다.
describe('프리렌더 (global-object)', () => {
  const html = read('concepts/global-object/index.html')
  const text = htmlToText(html)

  it('퀴즈 정답이 <details>로 6개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(6)
  })

  it('표의 행이 있다', () => {
    expect(text).toContain('encodeURIComponent')
    expect(text).toContain('호스트가 더한 것')
  })
})

// 추가 게시글(iife-module-pattern)은 시뮬레이터 없이 표와 퀴즈로 구성된다. 둘 다 프리렌더 HTML에 있어야 한다.
describe('프리렌더 (iife-module-pattern)', () => {
  const html = read('concepts/iife-module-pattern/index.html')
  const text = htmlToText(html)

  it('퀴즈 정답이 <details>로 8개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(8)
  })

  it('표와 본문 용어가 있다', () => {
    expect(text).toContain('네임스페이스 객체')
    expect(text).toContain('모듈 패턴')
    expect(text).toContain('ES 모듈')
  })
})

// 25~37장 로드맵 1번(class-basics)은 시뮬레이터 없이 비교표와 퀴즈로 구성된다. 둘 다 프리렌더 HTML에 있어야 한다.
describe('프리렌더 (class-basics)', () => {
  const html = read('concepts/class-basics/index.html')
  const text = htmlToText(html)

  it('퀴즈 정답이 <details>로 9개 이상 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(9)
  })

  it('비교표와 본문 용어가 있다', () => {
    expect(text).toContain('생성자 함수')
    expect(text).toContain('#private 필드')
    expect(text).toContain('prototype 프로퍼티의 writable')
  })
})

// 여덟 번째 개념(this-binding)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (this-binding)', () => {
  const html = read('concepts/this-binding/index.html')
  const text = htmlToText(html)

  it('단계 1(실행 전) 텍스트가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="this 결정 시뮬레이터"/)
    for (const label of [
      '메서드를 꺼내 호출하면',
      '콜백으로 넘기면',
      'bind한 함수를 다시 부르면',
      '괄호와 쉼표',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

// 아홉 번째 개념(execution-context)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (execution-context)', () => {
  const html = read('concepts/execution-context/index.html')
  const text = htmlToText(html)

  it('단계 1(실행 전) 텍스트가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="실행 컨텍스트 시뮬레이터"/)
    for (const label of [
      '호출 스택',
      '이름 찾기와 정의한 곳',
      '블록의 환경 교체와 복원',
      'this 바인딩의 위치',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

// 열 번째 개념(closure)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (closure)', () => {
  const html = read('concepts/closure/index.html')
  const text = htmlToText(html)

  it('단계 1(실행 전) 텍스트가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 4개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="클로저 시뮬레이터"/)
    for (const label of [
      '바깥 함수가 끝난 뒤에도 남는 환경',
      '호출마다 새 환경',
      '같은 호출의 함수들은 환경을 공유',
      '값이 아니라 바인딩',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('퀴즈 정답이 <details>로 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

// 추가 게시글(for-let)의 시뮬레이터와 퀴즈도 프리렌더 HTML에 정적으로 들어 있어야 한다.
describe('시뮬레이터 프리렌더 (for-let)', () => {
  const html = read('concepts/for-let/index.html')
  const text = htmlToText(html)

  it('단계 1(실행 전) 텍스트가 HTML에 있다', () => {
    expect(text).toContain('단계 1: 실행 전')
  })

  it('시뮬레이터 region과 시나리오 선택 라디오 3개 이상이 있다', () => {
    expect(html).toMatch(/role="region"[^>]*aria-label="for 문의 let 시뮬레이터"/)
    for (const label of [
      'var: 함수들이 같은 i를 가리킴',
      'let: 반복마다 새 레코드',
      '새 바인딩은 본문 뒤, 증가식 앞',
    ]) {
      expect(text).toContain(label)
    }
    expect(html.match(/type="radio"/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('퀴즈 정답이 <details>로 프리렌더된다', () => {
    expect(html.match(/<details/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

// 학습 순서 이전/다음: 관련 개념 링크와 섞이지 않도록 nav 영역만 잘라 검사한다.
describe('학습 순서 pager', () => {
  const ordered = sortByOrder(concepts)
  const navHtml = (slug: string) => {
    const html = read(`concepts/${slug}/index.html`)
    const start = html.indexOf('<nav aria-label="학습 순서"')
    expect(start).toBeGreaterThanOrEqual(0)
    return html.slice(start, html.indexOf('</nav>', start))
  }
  const hrefs = (nav: string) => [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1])

  it.each(ordered.map((c, i) => [c.slug, i] as const))('%s', (slug, i) => {
    const nav = navHtml(slug)
    expect(nav).toContain(`학습 순서 <!-- -->${i + 1}<!-- --> / <!-- -->${ordered.length}`)
    const expected = [ordered[i - 1], ordered[i + 1]]
      .filter((c) => c !== undefined)
      .map((c) => `/concepts/${c.slug}`)
    expect(hrefs(nav)).toEqual(expected)
  })
})
