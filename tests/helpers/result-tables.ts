// 본문 JSX <table>의 "예제 출력" 칸을 meta의 expectedOutput과 대조하기 위한 순수 파싱 함수.
// content.mdx 원문 문자열만 받는다. 파일 읽기·메타 조회는 호출하는 테스트가 맡는다.

export type Table = { line: number; rows: string[][] }

export type OutputClaim = {
  line: number
  exampleNumber: number
  kind: 'row' | 'column'
  // row: 한 칸의 텍스트, column: 열의 칸을 위에서부터 모은 배열
  text: string | string[]
}

export type ClaimFailure = { claim: OutputClaim; reason: string }

// 칸 텍스트 정규화: 태그 제거, JSX 문자열 표현식 풀기, 공백 접기. 그 밖의 변환은 하지 않는다.
export function normalizeCell(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\{\s*'([^']*)'\s*\}/g, '$1')
    .replace(/\{\s*"([^"]*)"\s*\}/g, '$1')
    .replace(/\{\s*`([^`]*)`\s*\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// `### 예제 N` 제목마다("결과와 이유" 절처럼 file= 없이 같은 제목이 반복되는 것은 허용하고, 같은 번호에 file=이 둘 대응되면 던진다), 다음 #·##·### 제목 전까지의 첫 `file=./examples/<file>` 펜스를 대응시킨다.
export function exampleFilesByNumber(mdx: string): Map<number, string> {
  const result = new Map<number, string>()
  let current: number | null = null
  let found = false
  let inFence = false
  for (const line of mdx.split('\n')) {
    if (line.startsWith('```')) {
      if (!inFence && current !== null && !found) {
        const m = line.match(/^```\S*\s+file=\.\/examples\/(\S+)/)
        if (m) {
          if (result.has(current)) throw new Error(`예제 ${current}에 file=이 두 번 대응됩니다`)
          result.set(current, m[1])
          found = true
        }
      }
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (/^#{1,3}\s/.test(line)) {
      const m = line.match(/^###\s+예제\s*(\d+)/)
      if (m) {
        current = Number(m[1])
        found = false
      } else {
        current = null
      }
    }
  }
  return result
}

// `{rows.map(` 같은 JSX 식으로 그리는 표는 뺀다(데이터 파일로 그리는 표는 각 concept.test.ts가 검증한다).
// 코드 칸에 적힌 `arr.map(f)` 같은 텍스트로는 빠지지 않게 중괄호 바로 뒤의 식만 본다.
const DATA_TABLE = /\{\s*[\w.]+\.map\(/
// 본문 문장 속 인라인 코드 `<table>`(예: dom-tree-nodes)을 표로 잡지 않게 줄 맨 앞(들여쓰기 허용)의 <table만 본다.

export function extractTables(mdx: string): Table[] {
  const tables: Table[] = []
  for (const m of mdx.matchAll(/^[ \t]*<table\b[\s\S]*?<\/table>/gm)) {
    const block = m[0]
    if (DATA_TABLE.test(block)) continue
    const line = mdx.slice(0, m.index).split('\n').length
    const rows: string[][] = []
    for (const tr of block.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...tr[1].matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((c) =>
        normalizeCell(c[2]),
      )
      rows.push(cells)
    }
    tables.push({ line, rows })
  }
  return tables
}

const EXAMPLE_ROW = /^(?:예제\s*(\d+)(?::|\s|$)|(\d+):)/

// 예제 출력 주장(행 형식·열 형식)과 형식 위반(예제 행과 아닌 행이 섞인 표)을 뽑는다.
export function extractOutputClaims(mdx: string): {
  claims: OutputClaim[]
  violations: string[]
} {
  const claims: OutputClaim[] = []
  const violations: string[] = []
  for (const { line, rows } of extractTables(mdx)) {
    if (rows.length === 0) continue
    const [header, ...body] = rows

    // 행 형식
    const resultCol = header.findIndex((h) => h.startsWith('결과') || h.startsWith('출력'))
    if (resultCol >= 0) {
      const exampleRows = body.map((r) => {
        const m = (r[0] ?? '').match(EXAMPLE_ROW)
        return m ? Number(m[1] ?? m[2]) : null
      })
      if (exampleRows.some((n) => n !== null)) {
        body.forEach((r, i) => {
          const n = exampleRows[i]
          if (n === null) {
            violations.push(`표 ${line}행: 예제 행과 아닌 행이 섞여 있습니다("${r[0] ?? ''}")`)
          } else {
            claims.push({
              line,
              exampleNumber: n,
              kind: 'row',
              text: r[resultCol] ?? '',
            })
          }
        })
      }
    }

    // 열 형식
    header.forEach((h, col) => {
      const m = h.match(/^예제\s*(\d+)의 출력$/)
      if (m) {
        claims.push({
          line,
          exampleNumber: Number(m[1]),
          kind: 'column',
          text: body.map((r) => r[col] ?? ''),
        })
      }
    })
  }
  return { claims, violations }
}

// 주장 하나를 expectedOutput과 대조한다. 어긋나면 이유를, 맞으면 null을 돌려준다.
export function compareClaim(claim: OutputClaim, expectedOutput: string[]): string | null {
  if (claim.kind === 'column') {
    const actual = claim.text as string[]
    return JSON.stringify(actual) === JSON.stringify(expectedOutput)
      ? null
      : `열 ${JSON.stringify(actual)} !== 출력 ${JSON.stringify(expectedOutput)}`
  }
  const text = claim.text as string
  const candidates = [expectedOutput.join(', '), expectedOutput.join(' / ')]
  return candidates.includes(text)
    ? null
    : `칸 "${text}" !== ${candidates.map((c) => `"${c}"`).join(' 또는 ')}`
}

// mdx 하나의 모든 주장을 대조한다. examplesByFile은 meta.examples의 file → expectedOutput.
export function checkClaims(
  mdx: string,
  examplesByFile: Map<string, string[]>,
): { claims: OutputClaim[]; failures: ClaimFailure[]; violations: string[] } {
  const files = exampleFilesByNumber(mdx)
  const { claims, violations } = extractOutputClaims(mdx)
  const failures: ClaimFailure[] = []
  for (const claim of claims) {
    const file = files.get(claim.exampleNumber)
    if (file === undefined) {
      failures.push({ claim, reason: `예제 ${claim.exampleNumber}에 대응하는 file=이 없습니다` })
      continue
    }
    const expected = examplesByFile.get(file)
    if (expected === undefined) {
      failures.push({ claim, reason: `${file}이 meta.examples에 없습니다` })
      continue
    }
    const reason = compareClaim(claim, expected)
    if (reason !== null) failures.push({ claim, reason })
  }
  return { claims, failures, violations }
}
