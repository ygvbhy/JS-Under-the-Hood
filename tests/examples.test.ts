import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listConcepts } from '~/lib/concepts'
import { runExample } from './helpers/run-example'

// L1: 모든 예제를 실제로 실행해 expectedOutput과 대조한다.
describe.each(listConcepts())('$slug 예제 실행', (concept) => {
  it.each(concept.examples)('$id ($file)', (example) => {
    const source = readFileSync(
      join(process.cwd(), 'app', 'concepts', concept.slug, 'examples', example.file),
      'utf8',
    )
    expect(runExample(source)).toEqual(example.expectedOutput)
  })
})
