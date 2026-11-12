import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ConceptMeta } from '~/lib/concepts'
import {
  checkClaims,
  exampleFilesByNumber,
  extractOutputClaims,
  extractTables,
  normalizeCell,
} from './helpers/result-tables'

// 표의 "예제 출력" 칸 대조. expectedOutput의 출처는 meta.examples뿐이고, 예제 실행 대조는 examples.test.ts가 맡는다.

const table = (head: string[], rows: string[][]) =>
  [
    '<table>',
    `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`,
    '<tbody>',
    ...rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table>',
  ].join('\n')

const section = (n: number, file: string) =>
  `### 예제 ${n}: 제목\n\n\`\`\`js file=./examples/${file}\n\`\`\`\n`

const examples = new Map([
  ['a.js', ['x', 'y']],
  ['b.js', ['p', 'q', 'r']],
])

describe('normalizeCell', () => {
  it('태그를 지우고 공백을 접는다', () => {
    expect(normalizeCell('  <code>a</code>\n   b  ')).toBe('a b')
  })

  it('JSX 문자열 표현식을 풀고, 중괄호 안의 공백·줄바꿈을 허용한다', () => {
    expect(normalizeCell(`<code>{'{}'}</code>`)).toBe('{}')
    expect(normalizeCell(`{"a, b"} {\`c\`}`)).toBe('a, b c')
    expect(normalizeCell(`<code>\n  {\n    'x / y'\n  }\n</code>`)).toBe('x / y')
  })
})

describe('exampleFilesByNumber', () => {
  it('예제 제목마다 아래 첫 file=을 대응시킨다', () => {
    const mdx = `${section(1, 'a.js')}\n${section(2, 'b.js')}`
    expect([...exampleFilesByNumber(mdx)]).toEqual([
      [1, 'a.js'],
      [2, 'b.js'],
    ])
  })

  it('다음 제목 뒤의 file=은 잡지 않는다', () => {
    const mdx = `### 예제 1: 제목\n\n설명만 있음\n\n## 다음 절\n\n\`\`\`js file=./examples/a.js\n\`\`\`\n`
    expect(exampleFilesByNumber(mdx).size).toBe(0)
  })

  it('같은 번호에 file=이 두 번 대응되면 던진다', () => {
    expect(() => exampleFilesByNumber(`${section(1, 'a.js')}\n${section(1, 'b.js')}`)).toThrow()
  })

  it('"결과와 이유" 절처럼 file= 없이 같은 번호 제목이 다시 나오는 것은 허용한다', () => {
    const mdx = `${section(1, 'a.js')}\n## 결과와 이유\n\n### 예제 1: 다시\n\n설명\n`
    expect([...exampleFilesByNumber(mdx)]).toEqual([[1, 'a.js']])
  })
})

describe('extractTables', () => {
  it('.map( 표는 건너뛰고, 줄 번호는 <table의 1부터 센 줄이다', () => {
    const mdx = `앞\n${table(['h'], [['1']])}\n<table>\n{rows.map((r) => <tr key={r}><td>{r}</td></tr>)}\n</table>`
    const tables = extractTables(mdx)
    expect(tables).toHaveLength(1)
    expect(tables[0].line).toBe(2)
    expect(tables[0].rows).toEqual([['h'], ['1']])
  })

  it('문장 속 인라인 코드 `<table>`은 표로 잡지 않는다', () => {
    const mdx = `설명: \`<table>\` 바로 아래의 \`<tr>\`\n\n${table(['h'], [['1']])}`
    const tables = extractTables(mdx)
    expect(tables).toHaveLength(1)
    expect(tables[0].line).toBe(3)
    expect(tables[0].rows).toEqual([['h'], ['1']])
  })
})

describe('checkClaims', () => {
  const head = ['예제', '결과']

  it('행 형식: ", "와 " / "로 이은 출력과 같으면 통과한다', () => {
    const mdx = [
      section(1, 'a.js'),
      section(2, 'b.js'),
      table(head, [
        ['예제 1: 설명', 'x, y'],
        ['2: 설명', 'p / q / r'],
      ]),
    ].join('\n')
    const r = checkClaims(mdx, examples)
    expect(r.claims).toHaveLength(2)
    expect(r.failures).toEqual([])
    expect(r.violations).toEqual([])
  })

  it('행 형식: 한 줄만 달라도 불일치로 보고한다', () => {
    const mdx = [section(2, 'b.js'), table(head, [['예제 2: 설명', 'p, q, z']])].join('\n')
    const r = checkClaims(mdx, examples)
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0].claim.exampleNumber).toBe(2)
    expect(r.failures[0].reason).toContain('p, q, z')
  })

  it('열 형식: 열의 칸을 위에서부터 모은 배열이 expectedOutput과 같아야 한다', () => {
    const col = (cells: string[]) =>
      [
        section(1, 'a.js'),
        table(
          ['호출', '예제 1의 출력'],
          cells.map((c) => ['식', c]),
        ),
      ].join('\n')
    const ok = checkClaims(col(['x', 'y']), examples)
    expect(ok.claims.map((c) => c.kind)).toEqual(['column'])
    expect(ok.failures).toEqual([])
    expect(checkClaims(col(['x', 'z']), examples).failures).toHaveLength(1)
  })

  it('예제 제목 범위 밖의 file=로는 대응시키지 않아 실패한다', () => {
    const mdx = [
      '### 예제 1: 제목\n\n## 다음 절\n\n```js file=./examples/a.js\n```\n',
      table(head, [['예제 1: 설명', 'x, y']]),
    ].join('\n')
    const r = checkClaims(mdx, examples)
    expect(r.failures).toHaveLength(1)
    expect(r.failures[0].reason).toContain('file=')
  })

  it('대응한 파일이 meta.examples에 없으면 실패한다', () => {
    const mdx = [section(1, 'zzz.js'), table(head, [['예제 1: 설명', 'x, y']])].join('\n')
    expect(checkClaims(mdx, examples).failures).toHaveLength(1)
  })

  it('예제 행과 아닌 행이 섞인 표는 형식 위반이다', () => {
    const mdx = table(head, [
      ['예제 1: 설명', 'x, y'],
      ['기타', '아무 값'],
    ])
    const { claims, violations } = extractOutputClaims(mdx)
    expect(claims).toHaveLength(1)
    expect(violations).toHaveLength(1)
  })

  it('예제 행이 없는 표는 주장도 위반도 없다', () => {
    const { claims, violations } = extractOutputClaims(table(head, [['식', '값']]))
    expect(claims).toEqual([])
    expect(violations).toEqual([])
  })

  it.each([
    ['결과 열이 없고 첫 칸이 숫자뿐', ['예제', '클래식 스크립트'], [['4', '100 / 100']]],
    ['"예제 4." 같은 형식 어긋남', ['예제', '결과'], [['예제 4.', 'x']]],
    ['결과·출력 열이 없는데 예제 행 형식', ['예제', '값'], [['예제 1: 설명', 'x']]],
    ['"예제 9 출력" 머리', ['호출', '예제 9 출력'], [['식', 'x']]],
  ])('형식 근접 위반 1개: %s', (_name, h, body) => {
    const { claims, violations } = extractOutputClaims(table(h, body))
    expect(claims).toEqual([])
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('표 1행')
  })

  it.each([
    [
      '마지막 열 머리가 예제',
      ['대상', '저장되는 곳', '예제'],
      [['전역 var', '객체 환경 레코드', '3, 4']],
    ],
    ['식 표 꼴', ['식', '결과', '이유'], [['5 / 2', '2.5', '나눗셈']]],
  ])('형식 근접 위반 없음: %s', (_name, h, body) => {
    expect(extractOutputClaims(table(h, body)).violations).toEqual([])
  })

  it('.map( 표는 주장을 만들지 않는다', () => {
    const mdx =
      '<table><thead><tr><th>예제</th><th>결과</th></tr></thead><tbody>{rows.map((r) => <tr><td>예제 1</td><td>x</td></tr>)}</tbody></table>'
    expect(extractOutputClaims(mdx).claims).toEqual([])
  })

  it('코드 칸에 .map(이 적힌 손으로 쓴 표는 건너뛰지 않는다', () => {
    const mdx = [
      section(1, 'a.js'),
      table(head, [['예제 1: <code>arr.map(f)</code>', 'x, y']]),
    ].join('\n')
    expect(checkClaims(mdx, examples).claims).toHaveLength(1)
  })
})

// 모든 개념: 개념 목록을 적지 않고 glob으로 모은다.
const modules = import.meta.glob<{ concept: ConceptMeta }>('../app/concepts/*/meta.ts', {
  eager: true,
})
const conceptsDir = join(process.cwd(), 'app', 'concepts')

const all = Object.entries(modules).map(([key, mod]) => {
  const folder = key.match(/concepts\/([^/]+)\/meta\.ts$/)![1]
  const mdx = readFileSync(join(conceptsDir, folder, 'content.mdx'), 'utf8')
  const byFile = new Map(mod.concept.examples.map((e) => [e.file, e.expectedOutput]))
  const result = checkClaims(mdx, byFile)
  return { slug: mod.concept.slug, ...result }
})

const rows = all.flatMap((c) =>
  c.claims.map((claim) => {
    const failure = c.failures.find((f) => f.claim === claim)
    return {
      name: `${c.slug}:${claim.line} 예제 ${claim.exampleNumber}`,
      reason: failure?.reason ?? null,
    }
  }),
)

describe('모든 개념의 표 출력 칸', () => {
  it.each(rows)('$name', ({ reason }) => {
    expect(reason).toBeNull()
  })

  it('형식 위반이 없다', () => {
    expect(all.flatMap((c) => c.violations.map((v) => `${c.slug}: ${v}`))).toEqual([])
  })

  // 파서가 행을 못 알아보면 조용히 검사에서 빠지므로, 대조한 칸 수에 하한을 둔다(현재 행 102 + 열 1).
  it('대조한 칸이 103개 이상이다', () => {
    expect(rows.length).toBeGreaterThanOrEqual(103)
  })
})
