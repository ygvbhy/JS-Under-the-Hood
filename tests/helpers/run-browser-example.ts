import { chromium, type Browser } from '@playwright/test'

// 브라우저(Chromium)에서 예제를 실행하고 console.log 출력을 줄 단위로 수집한다.
// 주의: 저장소에 포함된 신뢰된 예제만 실행한다.

export const ORIGIN = 'http://example.test'
export const JS_DOCUMENT =
  '<!doctype html>\n<html lang="ko">\n<head><meta charset="utf-8"></head>\n<body>\n<script src="/example.js"></script>\n</body>\n</html>\n'
export const QUIET_MS = 200
export const GOTO_TIMEOUT_MS = 5000
export const EVALUATE_TIMEOUT_MS = 2000
export const DEFAULT_SETTLE_MS = 300

export type RunnerResource =
  | { path: string; networkError: true }
  | { path: string; delayMs: number; status: number; contentType: string; body: string }
export type RunnerInput = {
  kind: 'html' | 'js'
  source: string
  resources: RunnerResource[]
  settleMs: number
}

export async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `${message}\nChromium이 없으면 \`npx playwright install chromium\`을 실행하세요.`,
      { cause: error },
    )
  }
}

// 페이지 안(모든 스크립트보다 먼저)에서 실행된다. 직렬화되므로 바깥 스코프를 참조하지 않는다.
function installConsoleCollector() {
  const logs: string[] = []
  Object.defineProperty(window, Symbol.for('jsuth.logs'), { value: logs, enumerable: false })

  const formatValue = (v: unknown): string => {
    if (typeof v === 'string') return v
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v)
    if (typeof v === 'bigint') return String(v) + 'n'
    if (v === null || typeof v === 'undefined' || typeof v === 'boolean' || typeof v === 'symbol') {
      return String(v)
    }
    return '[unsupported: object]'
  }

  console.log = (...args: unknown[]) => {
    const first = args[0]
    if (typeof first === 'string' && /%[sdifjoOc%]/.test(first)) {
      logs.push('[unsupported: format]')
      return
    }
    logs.push(args.map(formatValue).join(' '))
  }
  for (const name of ['info', 'warn', 'error', 'debug'] as const) {
    console[name] = () => {
      logs.push(`[unsupported: console.${name}]`)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runBrowserExample(browser: Browser, input: RunnerInput): Promise<string[]> {
  type Entry =
    { networkError: true } | { body: string; type: string; delayMs: number; status: number }
  const bodies = new Map<string, Entry>()
  if (input.kind === 'html') {
    bodies.set('/', {
      body: input.source,
      type: 'text/html; charset=utf-8',
      delayMs: 0,
      status: 200,
    })
  } else {
    bodies.set('/', {
      body: JS_DOCUMENT,
      type: 'text/html; charset=utf-8',
      delayMs: 0,
      status: 200,
    })
    bodies.set('/example.js', {
      body: input.source,
      type: 'text/javascript; charset=utf-8',
      delayMs: 0,
      status: 200,
    })
  }
  for (const r of input.resources) {
    if ('networkError' in r) {
      bodies.set(r.path, { networkError: true })
      continue
    }
    bodies.set(r.path, {
      body: r.body,
      type: r.contentType,
      delayMs: r.delayMs,
      status: r.status,
    })
  }

  const requestedPaths = new Set<string>()
  const unregistered: string[] = []
  const errors: string[] = []
  let mainNavigations = 0

  const context = await browser.newContext()
  try {
    await context.addInitScript(installConsoleCollector)
    await context.route('**/*', async (route) => {
      const url = route.request().url()
      const clean = url.split('#')[0]
      const path = clean.startsWith(ORIGIN + '/') ? clean.slice(ORIGIN.length) : null
      const entry = path === null ? undefined : bodies.get(path)
      if (path === null || entry === undefined) {
        unregistered.push(url)
        await route.abort().catch(() => {})
        return
      }
      requestedPaths.add(path)
      if ('networkError' in entry) {
        await route.abort('failed').catch(() => {})
        return
      }
      await sleep(entry.delayMs)
      await route
        .fulfill({ status: entry.status, contentType: entry.type, body: entry.body })
        .catch(() => {})
    })

    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) mainNavigations += 1
    })

    const collect = async (): Promise<string[]> => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`evaluate 타임아웃(${EVALUATE_TIMEOUT_MS}ms): 페이지가 응답하지 않습니다`),
            ),
          EVALUATE_TIMEOUT_MS,
        )
      })
      try {
        return await Promise.race([
          page.evaluate(() =>
            (window as unknown as Record<symbol, string[]>)[Symbol.for('jsuth.logs')].slice(),
          ),
          timeout,
        ])
      } finally {
        clearTimeout(timer)
      }
    }

    const fail = (message: string): never => {
      throw new Error([message, ...errors].join('\n'))
    }

    try {
      await page.goto(ORIGIN + '/', { waitUntil: 'load', timeout: GOTO_TIMEOUT_MS })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      fail(`goto 실패(타임아웃 ${GOTO_TIMEOUT_MS}ms): ${message}`)
    }

    await page.waitForTimeout(input.settleMs)
    const first = await collect()
    await page.waitForTimeout(QUIET_MS)
    const second = await collect()

    const problems: string[] = [...errors]
    if (mainNavigations > 1) {
      problems.push(`첫 문서 뒤에 페이지가 다시 이동했습니다(main frame 이동 ${mainNavigations}회)`)
    }
    if (unregistered.length > 0) {
      problems.push(`등록되지 않은 요청: ${unregistered.join(', ')}`)
    }
    const unrequested = input.resources
      .filter((r) => !requestedPaths.has(r.path))
      .map((r) => r.path)
    if (unrequested.length > 0) {
      problems.push(`요청되지 않은 resource: ${unrequested.join(', ')}`)
    }
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      problems.push(
        `출력이 안정되지 않았습니다(settleMs ${input.settleMs}ms 뒤 ${JSON.stringify(first)}, ${QUIET_MS}ms 더 기다린 뒤 ${JSON.stringify(second)})`,
      )
    }
    if (problems.length > 0) throw new Error(problems.join('\n'))
    return second
  } finally {
    await context.close()
  }
}
