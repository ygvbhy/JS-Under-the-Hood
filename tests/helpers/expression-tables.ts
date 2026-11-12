// 본문 JSX <table>의 "식 → 결과" 표를 각 concept.test.ts에서 식 평가로 대조하기 위한 helper.
// content.mdx 원문과 예제 폴더 경로만 받는다. 어떤 표를 읽고 어떻게 표기할지는 호출하는 테스트가 정한다.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createContext, runInContext, type Context } from 'node:vm'
import { extractTables } from './result-tables'

// 머리 행이 header와 정확히 같은 표 하나의 본문 행(머리 행 제외). 0개나 2개 이상이면 던진다.
export function tableBody(mdx: string, header: string[]): string[][] {
  const matches = extractTables(mdx).filter(
    (t) =>
      t.rows.length > 0 &&
      t.rows[0].length === header.length &&
      t.rows[0].every((c, i) => c === header[i]),
  )
  if (matches.length !== 1) {
    throw new Error(
      `머리 행이 [${header.join(' | ')}]인 표가 ${matches.length}개입니다(정확히 1개여야 합니다)`,
    )
  }
  return matches[0].rows.slice(1)
}

// 새 vm 컨텍스트에서 예제 파일을 차례로 실행해 돌려준다. console.log는 아무것도 하지 않는다.
// 앞 스크립트의 최상위 let/const는 뒤 스크립트에서 보인다.
export function exampleContext(examplesDir: string, files: string[]): Context {
  const ctx = createContext({ console: { log() {} } })
  for (const file of files) {
    runInContext(readFileSync(join(examplesDir, file), 'utf8'), ctx)
  }
  return ctx
}
