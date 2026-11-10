import type { BrowserExample, ConceptExample } from '~/lib/concepts'
import { DEFAULT_SETTLE_MS, type RunnerInput, type RunnerResource } from './run-browser-example'

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
    // 타입이 막는 필드도 런타임 값으로 검사한다.
    const loose = resource as {
      path?: unknown
      file?: unknown
      status?: unknown
      delayMs?: unknown
      networkError?: unknown
    }
    const path = typeof loose.path === 'string' ? loose.path : ''
    const isNetworkError = 'networkError' in resource

    if (isNetworkError) {
      if (loose.networkError !== true)
        errors.push(`${at}: resource ${path}의 networkError는 true여야 합니다`)
      for (const key of ['file', 'status', 'delayMs'] as const) {
        if (key in resource)
          errors.push(`${at}: 네트워크 오류 resource ${path}에는 ${key}를 쓸 수 없습니다`)
      }
      if (!path.startsWith('/') || !(path.endsWith('.js') || path.endsWith('.json')))
        errors.push(
          `${at}: 네트워크 오류 resource path ${path}는 /로 시작하는 .js 또는 .json 경로여야 합니다`,
        )
      else if (RESERVED_PATHS.includes(path))
        errors.push(`${at}: resource path ${path}는 예약된 경로입니다`)
    } else if (typeof loose.file !== 'string') {
      errors.push(`${at}: resource ${path}에는 file 또는 networkError: true가 필요합니다`)
    } else {
      const file = loose.file
      const ext = file.endsWith('.js') ? '.js' : file.endsWith('.json') ? '.json' : null
      if (ext === null) errors.push(`${at}: resource 파일 ${file}은 .js 또는 .json이어야 합니다`)
      if (!fs.exists(file)) errors.push(`${at}: resource 파일 ${file}이 없습니다`)
      if (!path.startsWith('/') || ext === null || !path.endsWith(ext))
        errors.push(
          `${at}: resource path ${path}는 /로 시작하고 파일 ${file}과 같은 확장자로 끝나야 합니다`,
        )
      else if (RESERVED_PATHS.includes(path))
        errors.push(`${at}: resource path ${path}는 예약된 경로입니다`)
      if (loose.status !== undefined) {
        const s = loose.status
        const valid =
          typeof s === 'number' &&
          Number.isInteger(s) &&
          ((s >= 200 && s <= 299) || (s >= 400 && s <= 599)) &&
          s !== 204 &&
          s !== 205
        if (!valid)
          errors.push(
            `${at}: status는 200~299 또는 400~599의 정수여야 합니다(204·205 제외): ${String(s)}`,
          )
      }
      if (loose.delayMs !== undefined && !isIntInRange(loose.delayMs, MAX_DELAY_MS))
        errors.push(`${at}: delayMs는 0 이상 ${MAX_DELAY_MS} 이하의 정수여야 합니다`)
    }
    if (seen.has(path)) errors.push(`${at}: resource path ${path}가 중복됩니다`)
    seen.add(path)
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
    resources: (example.resources ?? []).map((r): RunnerResource => {
      if ('networkError' in r) return { path: r.path, networkError: true }
      return {
        path: r.path,
        body: read(r.file),
        delayMs: r.delayMs ?? 0,
        status: r.status ?? 200,
        contentType: r.file.endsWith('.json')
          ? 'application/json'
          : 'text/javascript; charset=utf-8',
      }
    }),
    settleMs: example.settleMs ?? DEFAULT_SETTLE_MS,
  }
}
