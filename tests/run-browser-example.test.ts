import type { Browser } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runExample } from './helpers/run-example'
import {
  DEFAULT_SETTLE_MS,
  launchBrowser,
  runBrowserExample,
  type RunnerInput,
} from './helpers/run-browser-example'

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
}, 30_000)

afterAll(async () => {
  await browser?.close()
})

function run(partial: Partial<RunnerInput> & Pick<RunnerInput, 'kind' | 'source'>) {
  return runBrowserExample(browser, { resources: [], settleMs: DEFAULT_SETTLE_MS, ...partial })
}

const T = 15_000

describe('runBrowserExample', () => {
  it('html 문서의 DOM 출력을 수집한다(줄바꿈 ul의 childNodes는 3)', { timeout: T }, async () => {
    const source = `<!doctype html>
<ul id="list">
  <li>a</li>
</ul>
<script>
  console.log(document.getElementById('list').childNodes.length)
</script>
`
    expect(await run({ kind: 'html', source })).toEqual(['3'])
  })

  it('js 최소 문서에서 setTimeout 콜백 출력까지 수집한다', { timeout: T }, async () => {
    const source = "console.log('sync'); setTimeout(() => console.log('timer'), 20)"
    expect(await run({ kind: 'js', source })).toEqual(['sync', 'timer'])
  })

  it('defer 스크립트는 도착 순서와 무관하게 문서 순서대로 실행한다', { timeout: T }, async () => {
    const source = `<!doctype html>
<script defer src="/a.js"></script>
<script defer src="/b.js"></script>
`
    const out = await run({
      kind: 'html',
      source,
      resources: [
        {
          path: '/a.js',
          body: "console.log('a')",
          delayMs: 200,
          status: 200,
          contentType: 'text/javascript; charset=utf-8',
        },
        {
          path: '/b.js',
          body: "console.log('b')",
          delayMs: 10,
          status: 200,
          contentType: 'text/javascript; charset=utf-8',
        },
      ],
    })
    expect(out).toEqual(['a', 'b'])
  })

  it('async 스크립트는 도착 순서대로 실행한다', { timeout: T }, async () => {
    const source = `<!doctype html>
<script async src="/a.js"></script>
<script async src="/b.js"></script>
`
    const out = await run({
      kind: 'html',
      source,
      resources: [
        {
          path: '/a.js',
          body: "console.log('a')",
          delayMs: 200,
          status: 200,
          contentType: 'text/javascript; charset=utf-8',
        },
        {
          path: '/b.js',
          body: "console.log('b')",
          delayMs: 10,
          status: 200,
          contentType: 'text/javascript; charset=utf-8',
        },
      ],
    })
    expect(out).toEqual(['b', 'a'])
  })

  it('-0, 빈 문자열, undefined, bigint 포맷이 runExample과 같다', { timeout: T }, async () => {
    const source = [
      "console.log(3, 'a', true, undefined, null, NaN, -0, '')",
      'console.log(10n)',
      "console.log('')",
      'console.log(-0)',
      'console.log(1.5, -2)',
      "console.log(Symbol('s').toString())",
    ].join('\n')
    expect(await run({ kind: 'js', source })).toEqual(runExample(source))
  })

  it('객체 인수, % 서식, console.warn은 [unsupported: …]로 기록한다', { timeout: T }, async () => {
    const source = [
      'console.log({})',
      "console.log('%d개', 3)",
      "console.warn('w')",
      "console.info('i')",
    ].join('\n')
    expect(await run({ kind: 'js', source })).toEqual([
      '[unsupported: object]',
      '[unsupported: format]',
      '[unsupported: console.warn]',
      '[unsupported: console.info]',
    ])
  })

  it('잡히지 않은 예외는 reject한다', { timeout: T }, async () => {
    await expect(run({ kind: 'js', source: "throw new Error('boom')" })).rejects.toThrow(/boom/)
  })

  it('다른 호스트 요청과 미등록 경로는 reject한다', { timeout: T }, async () => {
    const img = '<!doctype html>\n<img src="https://example.com/x.png">\n'
    await expect(run({ kind: 'html', source: img })).rejects.toThrow(
      /등록되지 않은 요청.*example\.com\/x\.png/,
    )
    const missing =
      '<!doctype html>\n<script src="/missing.js"></script>\n<script>console.log("after")</script>\n'
    await expect(run({ kind: 'html', source: missing })).rejects.toThrow(
      /등록되지 않은 요청.*\/missing\.js/,
    )
  })

  it('요청되지 않은 resource는 reject한다', { timeout: T }, async () => {
    await expect(
      run({
        kind: 'html',
        source: '<!doctype html>\n<p>x</p>\n',
        resources: [
          {
            path: '/unused.js',
            body: '',
            delayMs: 0,
            status: 200,
            contentType: 'text/javascript; charset=utf-8',
          },
        ],
      }),
    ).rejects.toThrow(/요청되지 않은 resource.*\/unused\.js/)
  })

  it('링크 이동으로 페이지가 다시 이동하면 reject한다', { timeout: T }, async () => {
    const source = `<!doctype html>
<a id="a" href="/">go</a>
<script>
  console.log('before')
  if (window.name !== 'moved') {
    window.name = 'moved'
    setTimeout(() => document.getElementById('a').click(), 20)
  }
</script>
`
    await expect(run({ kind: 'html', source })).rejects.toThrow(/다시 이동/)
  })

  it('끝나지 않는 setInterval은 출력 불안정으로 reject한다', { timeout: T }, async () => {
    const source = "setInterval(() => console.log('t'), 30)"
    await expect(run({ kind: 'js', source, settleMs: 100 })).rejects.toThrow(
      /출력이 안정되지 않았습니다/,
    )
  })

  it('수집 배열은 Object.keys(window)와 for...in에 나오지 않는다', { timeout: T }, async () => {
    const source = [
      "var inKeys = Object.keys(window).some((k) => k.includes('jsuth'))",
      'var inLoop = false',
      "for (var k in window) { if (String(k).includes('jsuth')) inLoop = true }",
      "var d = Object.getOwnPropertyDescriptor(window, Symbol.for('jsuth.logs'))",
      'console.log(inKeys, inLoop, d.enumerable)',
    ].join('\n')
    expect(await run({ kind: 'js', source })).toEqual(['false false false'])
  })

  it('.json 404 응답은 상태·본문을 그대로 전달한다', { timeout: T }, async () => {
    const source = [
      "fetch('/missing.json')",
      "  .then((res) => { console.log('then', res.status, res.ok); return res.json() })",
      "  .then((data) => console.log('body', data.error))",
    ].join('\n')
    const out = await run({
      kind: 'js',
      source,
      resources: [
        {
          path: '/missing.json',
          body: '{"error":"not found"}',
          delayMs: 0,
          status: 404,
          contentType: 'application/json',
        },
      ],
    })
    expect(out).toEqual(['then 404 false', 'body not found'])
  })

  it(
    '네트워크 오류 resource는 fetch를 거부시키되 실행은 실패하지 않는다',
    { timeout: T },
    async () => {
      const source =
        "fetch('/down.json').then(() => console.log('then'), (e) => console.log('catch', e.name, e instanceof TypeError))"
      const out = await run({
        kind: 'js',
        source,
        resources: [{ path: '/down.json', networkError: true }],
      })
      expect(out).toEqual(['catch TypeError true'])
    },
  )

  it('요청되지 않은 네트워크 오류 resource는 reject한다', { timeout: T }, async () => {
    await expect(
      run({
        kind: 'html',
        source: '<!doctype html>\n<p>x</p>\n',
        resources: [{ path: '/down.json', networkError: true }],
      }),
    ).rejects.toThrow(/요청되지 않은 resource.*\/down\.json/)
  })
})
