import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Browser } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { listConcepts, type BrowserExample } from '~/lib/concepts'
import { toRunnerInput } from './helpers/browser-example'
import { launchBrowser, runBrowserExample } from './helpers/run-browser-example'
import { runExample } from './helpers/run-example'

const concepts = listConcepts()
const hasBrowserExample = concepts.some((c) => c.examples.some((e) => e.runtime === 'browser'))

// browser 예제가 하나라도 있을 때만 Chromium을 띄운다.
let browser: Browser | undefined
beforeAll(async () => {
  if (hasBrowserExample) browser = await launchBrowser()
}, 30_000)
afterAll(async () => {
  await browser?.close()
})

// L1: 모든 예제를 실제로 실행해 expectedOutput과 대조한다.
describe.each(concepts)('$slug 예제 실행', (concept) => {
  const read = (file: string) =>
    readFileSync(join(process.cwd(), 'app', 'concepts', concept.slug, 'examples', file), 'utf8')

  it.each(concept.examples.filter((e) => e.runtime === 'ecmascript'))('$id ($file)', (example) => {
    expect(runExample(read(example.file))).toEqual(example.expectedOutput)
  })

  it.each(concept.examples.filter((e): e is BrowserExample => e.runtime === 'browser'))(
    '$id ($file) [browser]',
    async (example) => {
      const actual = await runBrowserExample(browser!, toRunnerInput(example, read))
      expect(actual).toEqual(example.expectedOutput)
    },
    15_000,
  )
})
