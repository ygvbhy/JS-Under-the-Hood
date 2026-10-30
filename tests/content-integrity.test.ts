import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listConcepts, type ConceptMeta } from '~/lib/concepts'

// L3: 메타데이터·콘텐츠 무결성. 레지스트리와 같은 glob을 쓰되 폴더명을 키에서 직접 뽑는다.
const modules = import.meta.glob<{ concept: ConceptMeta }>('../app/concepts/*/meta.ts', {
  eager: true,
})
const entries = Object.entries(modules).map(([key, mod]) => ({
  folder: key.match(/concepts\/([^/]+)\/meta\.ts$/)![1],
  concept: mod.concept,
}))
const concepts = entries.map((e) => e.concept)
const slugs = new Set(concepts.map((c) => c.slug))

const conceptsDir = join(process.cwd(), 'app', 'concepts')
const folders = readdirSync(conceptsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

const REQUIRED_H2 = ['동작 원리', '예제', '결과와 이유']

describe('개념 폴더', () => {
  it('개념이 하나 이상 있다', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  // 레지스트리(import.meta.glob)가 옛 파일 목록에 얼어붙으면 새 개념이 조용히 검사에서 빠진다
  it('레지스트리의 개념 수가 app/concepts의 폴더 수와 같다', () => {
    expect(listConcepts()).toHaveLength(folders.length)
    expect(entries).toHaveLength(folders.length)
  })

  it('슬러그에 중복이 없다', () => {
    expect(concepts.map((c) => c.slug).sort()).toEqual([...slugs].sort())
  })

  it('order에 중복이 없다', () => {
    const owners = new Map<number, string>()
    for (const { folder, concept } of entries) {
      const other = owners.get(concept.order)
      expect(other, `order ${concept.order}가 ${other}와 ${folder}에서 중복됩니다`).toBeUndefined()
      owners.set(concept.order, folder)
    }
  })

  it.each(folders)('%s 폴더에 meta.ts, content.mdx, route.tsx가 있다', (folder) => {
    for (const file of ['meta.ts', 'content.mdx', 'route.tsx']) {
      expect(existsSync(join(conceptsDir, folder, file)), `${folder}/${file} 누락`).toBe(true)
    }
  })
})

describe.each(entries)('$folder', ({ folder, concept }) => {
  it('slug가 폴더명과 같다', () => {
    expect(concept.slug).toBe(folder)
  })

  it('title과 summary가 있고 summary는 160자 이하다', () => {
    expect(concept.title.trim()).not.toBe('')
    expect(concept.summary.trim()).not.toBe('')
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('goals, simplifications, references가 1개 이상이다', () => {
    expect(concept.goals.length).toBeGreaterThanOrEqual(1)
    expect(concept.simplifications.length).toBeGreaterThanOrEqual(1)
    expect(concept.references.length).toBeGreaterThanOrEqual(1)
  })

  it('참고 자료 URL은 https://로 시작한다', () => {
    for (const ref of concept.references) {
      expect(ref.url, `${ref.label}`).toMatch(/^https:\/\//)
    }
  })

  it('선행 개념 slug가 존재하고 자기 자신이 아니다', () => {
    for (const p of concept.prerequisites) {
      if (p.slug === undefined) continue
      expect(p.slug, `선행 개념 "${p.label}"은 자기 자신일 수 없습니다`).not.toBe(concept.slug)
      expect(slugs.has(p.slug), `선행 개념 slug "${p.slug}"가 존재하지 않습니다`).toBe(true)
    }
  })

  it('order가 양의 정수다', () => {
    expect(Number.isInteger(concept.order), `order는 정수여야 합니다: ${concept.order}`).toBe(true)
    expect(concept.order, `order는 양수여야 합니다: ${concept.order}`).toBeGreaterThan(0)
  })

  it('order가 slug 있는 선수 개념의 order보다 크다', () => {
    for (const p of concept.prerequisites) {
      if (p.slug === undefined) continue
      const pre = concepts.find((c) => c.slug === p.slug)
      if (!pre) continue // 존재 검사는 선행 개념 테스트가 맡는다
      expect(
        concept.order,
        `선수 개념 "${p.slug}"(order ${pre.order})보다 order(${concept.order})가 커야 합니다`,
      ).toBeGreaterThan(pre.order)
    }
  })

  it('관련 개념 slug가 존재하고 자기 자신이 아니다', () => {
    for (const slug of concept.related) {
      expect(slug, '관련 개념에 자기 자신이 있습니다').not.toBe(concept.slug)
      expect(slugs.has(slug), `관련 개념 slug "${slug}"가 존재하지 않습니다`).toBe(true)
    }
  })

  it('예제 id가 중복되지 않고 파일이 존재한다', () => {
    const ids = concept.examples.map((e) => e.id)
    expect(new Set(ids).size, '예제 id 중복').toBe(ids.length)
    for (const ex of concept.examples) {
      const path = join(conceptsDir, folder, 'examples', ex.file)
      expect(existsSync(path), `예제 파일 없음: examples/${ex.file}`).toBe(true)
    }
  })

  // reviewedAt은 구조화 데이터 dateModified와 sitemap lastmod로도 쓰인다
  it('reviewedAt은 null이거나 실제 달력 날짜(YYYY-MM-DD)다', () => {
    const v = concept.reviewedAt
    if (v === null) return
    expect(v, `reviewedAt 형식: ${v}`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const date = new Date(v + 'T00:00:00Z')
    expect(Number.isNaN(date.getTime()), `존재하지 않는 날짜: ${v}`).toBe(false)
    expect(date.toISOString().slice(0, 10), `존재하지 않는 날짜: ${v}`).toBe(v)
  })

  it('content.mdx에 필수 h2 3개가 있다', () => {
    const mdx = readFileSync(join(conceptsDir, folder, 'content.mdx'), 'utf8')
    for (const heading of REQUIRED_H2) {
      expect(mdx, `content.mdx에 "## ${heading}" 제목이 없습니다`).toMatch(
        new RegExp(`^## ${heading}\\s*$`, 'm'),
      )
    }
  })
})
