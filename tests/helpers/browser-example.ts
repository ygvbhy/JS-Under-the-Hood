import type { BrowserExample, ConceptExample } from '~/lib/concepts'
import { DEFAULT_SETTLE_MS, type RunnerInput } from './run-browser-example'

export { DEFAULT_SETTLE_MS, type RunnerInput }

export type ExampleFs = {
  exists(file: string): boolean
  read(file: string): string
}

const MAX_SETTLE_MS = 2000
const MAX_DELAY_MS = 1000
const RESERVED_PATHS = ['/', '/example.js']

function isIntInRange(value: unknown, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
}

// 예제 명세(meta.examples 원소)의 위반 메시지 목록. 파일 인자는 examples/ 기준 파일명이다.
export function checkExampleSpec(example: ConceptExample, fs: ExampleFs): string[] {
  const errors: string[] = []
  const at = `예제 ${example.id}`
  // 타입이 막는 필드도 런타임 값으로 검사한다.
  const loose = example as { resources?: unknown; settleMs?: unknown }

  if (example.runtime === 'ecmascript') {
    if (!example.file.endsWith('.js')) errors.push(`${at}: ecmascript 예제 파일은 .js여야 합니다`)
    if (loose.resources !== undefined)
      errors.push(`${at}: ecmascript 예제에는 resources를 쓸 수 없습니다`)
    if (loose.settleMs !== undefined)
      errors.push(`${at}: ecmascript 예제에는 settleMs를 쓸 수 없습니다`)
    return errors
  }

  const isHtml = example.file.endsWith('.html')
  if (!isHtml && !example.file.endsWith('.js'))
    errors.push(`${at}: browser 예제 파일은 .html 또는 .js여야 합니다`)
  if (isHtml && fs.exists(example.file) && !/^<!doctype html>/i.test(fs.read(example.file)))
    errors.push(`${at}: .html 예제는 <!doctype html>로 시작해야 합니다`)
  if (loose.settleMs !== undefined && !isIntInRange(loose.settleMs, MAX_SETTLE_MS))
    errors.push(`${at}: settleMs는 0 이상 ${MAX_SETTLE_MS} 이하의 정수여야 합니다`)

  const seen = new Set<string>()
  for (const resource of example.resources ?? []) {
    if (!resource.file.endsWith('.js'))
      errors.push(`${at}: resource 파일 ${resource.file}은 .js여야 합니다`)
    if (!fs.exists(resource.file)) errors.push(`${at}: resource 파일 ${resource.file}이 없습니다`)
    if (!resource.path.startsWith('/') || !resource.path.endsWith('.js'))
      errors.push(`${at}: resource path ${resource.path}는 /로 시작하는 .js 경로여야 합니다`)
    else if (RESERVED_PATHS.includes(resource.path))
      errors.push(`${at}: resource path ${resource.path}는 예약된 경로입니다`)
    if (seen.has(resource.path)) errors.push(`${at}: resource path ${resource.path}가 중복됩니다`)
    seen.add(resource.path)
    if (resource.delayMs !== undefined && !isIntInRange(resource.delayMs, MAX_DELAY_MS))
      errors.push(`${at}: delayMs는 0 이상 ${MAX_DELAY_MS} 이하의 정수여야 합니다`)
  }
  return errors
}

// 파일을 읽어 실행기 인자로 바꾼다. 파일 인자는 examples/ 기준 파일명이다.
export function toRunnerInput(
  example: BrowserExample,
  read: (file: string) => string,
): RunnerInput {
  return {
    kind: example.file.endsWith('.html') ? 'html' : 'js',
    source: read(example.file),
    resources: (example.resources ?? []).map((r) => ({
      path: r.path,
      body: read(r.file),
      delayMs: r.delayMs ?? 0,
    })),
    settleMs: example.settleMs ?? DEFAULT_SETTLE_MS,
  }
}
