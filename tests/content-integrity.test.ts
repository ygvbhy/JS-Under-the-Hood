import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ConceptMeta } from '~/lib/concepts'

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

  it('슬러그에 중복이 없다', () => {
    expect(concepts.map((c) => c.slug).sort()).toEqual([...slugs].sort())
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

  it('content.mdx에 필수 h2 3개가 있다', () => {
    const mdx = readFileSync(join(conceptsDir, folder, 'content.mdx'), 'utf8')
    for (const heading of REQUIRED_H2) {
      expect(mdx, `content.mdx에 "## ${heading}" 제목이 없습니다`).toMatch(
        new RegExp(`^## ${heading}\\s*$`, 'm'),
      )
    }
  })
})
