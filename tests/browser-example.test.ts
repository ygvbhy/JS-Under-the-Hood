import { describe, expect, it } from 'vitest'
import type { BrowserExample, ConceptExample, EcmascriptExample } from '~/lib/concepts'
import { checkExampleSpec, toRunnerInput } from './helpers/browser-example'

// 메모리 가짜 파일 시스템 (실제 파일을 읽지 않는다)
function makeFs(files: Record<string, string>) {
  return {
    exists: (file: string) => file in files,
    read: (file: string) => {
      if (!(file in files)) throw new Error(`없는 파일: ${file}`)
      return files[file]
    },
  }
}

const fs = makeFs({
  'a.js': 'console.log(1)',
  'page.html': '<!doctype html>\n<p>hi</p>',
  'upper.html': '<!DOCTYPE HTML>\n<p>hi</p>',
  'indented.html': '  <!doctype html>\n<p>hi</p>',
  'nodoctype.html': '<p>hi</p>',
  'dep.js': 'console.log("dep")',
  'dep2.js': 'console.log("dep2")',
  'x.txt': 'x',
  'data.json': '{"a":1}',
})

const es = (extra: Partial<EcmascriptExample> = {}): ConceptExample => ({
  id: 'e',
  file: 'a.js',
  runtime: 'ecmascript',
  expectedOutput: ['1'],
  ...extra,
})

const br = (extra: Partial<BrowserExample> = {}): ConceptExample => ({
  id: 'b',
  file: 'page.html',
  runtime: 'browser',
  expectedOutput: [],
  ...extra,
})

describe('checkExampleSpec 정상', () => {
  it('ecmascript .js 예제는 위반이 없다', () => {
    expect(checkExampleSpec(es(), fs)).toEqual([])
  })

  it('browser .html 예제는 위반이 없다 (doctype 대소문자 무시)', () => {
    expect(checkExampleSpec(br(), fs)).toEqual([])
    expect(checkExampleSpec(br({ file: 'upper.html' }), fs)).toEqual([])
  })

  it('browser .js + resources + settleMs는 위반이 없다', () => {
    const example = br({
      file: 'a.js',
      resources: [
        { path: '/dep.js', file: 'dep.js', delayMs: 200 },
        { path: '/lib/dep2.js', file: 'dep2.js' },
      ],
      settleMs: 500,
    })
    expect(checkExampleSpec(example, fs)).toEqual([])
  })
})

describe('checkExampleSpec 위반', () => {
  it('ecmascript 예제의 .js 아닌 확장자', () => {
    expect(checkExampleSpec(es({ file: 'x.txt' }), fs).join('\n')).toMatch(/ecmascript.*\.js/)
  })

  it('ecmascript 예제에 resources', () => {
    const example = { ...es(), resources: [] } as ConceptExample
    expect(checkExampleSpec(example, fs).join('\n')).toContain('resources를 쓸 수 없습니다')
  })

  it('ecmascript 예제에 settleMs', () => {
    const example = { ...es(), settleMs: 100 } as ConceptExample
    expect(checkExampleSpec(example, fs).join('\n')).toContain('settleMs를 쓸 수 없습니다')
  })

  it('browser 예제의 허용되지 않는 확장자', () => {
    expect(checkExampleSpec(br({ file: 'x.txt' }), fs).join('\n')).toContain(
      '.html 또는 .js여야 합니다',
    )
  })

  it('.html이 doctype으로 시작하지 않음', () => {
    expect(checkExampleSpec(br({ file: 'nodoctype.html' }), fs).join('\n')).toContain(
      '<!doctype html>로 시작',
    )
  })

  it('.html 앞에 공백이 있으면 위반', () => {
    expect(checkExampleSpec(br({ file: 'indented.html' }), fs).join('\n')).toContain(
      '<!doctype html>로 시작',
    )
  })

  it('resource 파일이 없음', () => {
    const example = br({ resources: [{ path: '/gone.js', file: 'gone.js' }] })
    expect(checkExampleSpec(example, fs).join('\n')).toContain('gone.js이 없습니다')
  })

  it('resource 파일이 .js가 아님', () => {
    const example = br({ resources: [{ path: '/x.js', file: 'x.txt' }] })
    expect(checkExampleSpec(example, fs).join('\n')).toContain(
      'x.txt은 .js 또는 .json이어야 합니다',
    )
  })

  it('resource path가 /로 시작하지 않음', () => {
    const example = br({ resources: [{ path: 'dep.js', file: 'dep.js' }] })
    expect(checkExampleSpec(example, fs).join('\n')).toContain(
      '/로 시작하고 파일 dep.js과 같은 확장자로 끝나야 합니다',
    )
  })

  it('resource path가 .js로 끝나지 않음', () => {
    const example = br({ resources: [{ path: '/dep.css', file: 'dep.js' }] })
    expect(checkExampleSpec(example, fs).join('\n')).toContain(
      '/로 시작하고 파일 dep.js과 같은 확장자로 끝나야 합니다',
    )
  })

  it('resource path가 /example.js 예약 경로', () => {
    const example = br({ resources: [{ path: '/example.js', file: 'dep.js' }] })
    expect(checkExampleSpec(example, fs).join('\n')).toContain('예약된 경로')
  })

  it('resource path가 / 예약 경로', () => {
    const example = br({ resources: [{ path: '/', file: 'dep.js' }] })
    expect(checkExampleSpec(example, fs).join('\n')).toMatch(/\//)
    expect(checkExampleSpec(example, fs).length).toBeGreaterThan(0)
  })

  it('resource path 중복', () => {
    const example = br({
      resources: [
        { path: '/dep.js', file: 'dep.js' },
        { path: '/dep.js', file: 'dep2.js' },
      ],
    })
    expect(checkExampleSpec(example, fs).join('\n')).toContain('/dep.js가 중복됩니다')
  })

  it.each([-1, 1001, 1.5, Number.NaN])('delayMs %s는 범위·정수 위반', (delayMs) => {
    const example = br({ resources: [{ path: '/dep.js', file: 'dep.js', delayMs }] })
    expect(checkExampleSpec(example, fs).join('\n')).toContain('delayMs는 0 이상 1000 이하')
  })

  it.each([-1, 2001, 0.5, Number.NaN])('settleMs %s는 범위·정수 위반', (settleMs) => {
    expect(checkExampleSpec(br({ settleMs }), fs).join('\n')).toContain(
      'settleMs는 0 이상 2000 이하',
    )
  })

  it('경계값 delayMs 0·1000, settleMs 0·2000은 허용', () => {
    const example = br({
      resources: [
        { path: '/a.js', file: 'dep.js', delayMs: 0 },
        { path: '/b.js', file: 'dep2.js', delayMs: 1000 },
      ],
      settleMs: 2000,
    })
    expect(checkExampleSpec(example, fs)).toEqual([])
    expect(checkExampleSpec(br({ settleMs: 0 }), fs)).toEqual([])
  })
})

describe('checkExampleSpec: json·status·네트워크 오류 resource', () => {
  const check = (resources: unknown[]) =>
    checkExampleSpec(br({ resources: resources as BrowserExample['resources'] }), fs)

  it('정상: .json + status 404, 네트워크 오류 resource', () => {
    expect(
      check([
        { path: '/data.json', file: 'data.json', status: 404 },
        { path: '/fail.json', networkError: true },
        { path: '/fail.js', networkError: true },
      ]),
    ).toEqual([])
  })

  it('.json 파일에 .js 경로', () => {
    expect(check([{ path: '/data.js', file: 'data.json' }]).join('\n')).toContain(
      '같은 확장자로 끝나야 합니다',
    )
  })

  it('.js 파일에 .json 경로', () => {
    expect(check([{ path: '/dep.json', file: 'dep.js' }]).join('\n')).toContain(
      '같은 확장자로 끝나야 합니다',
    )
  })

  it('.txt 파일', () => {
    expect(check([{ path: '/x.txt', file: 'x.txt' }]).join('\n')).toContain(
      '.js 또는 .json이어야 합니다',
    )
  })

  it.each([302, 199, 600, 204, 205, 200.5])('status %s은 위반', (status) => {
    expect(check([{ path: '/data.json', file: 'data.json', status }]).join('\n')).toContain(
      'status는',
    )
  })

  it.each(['file', 'status', 'delayMs'])('네트워크 오류 resource에 %s', (key) => {
    const value = key === 'file' ? 'dep.js' : 100
    expect(check([{ path: '/f.js', networkError: true, [key]: value }]).join('\n')).toContain(
      `에는 ${key}를 쓸 수 없습니다`,
    )
  })

  it('networkError: false', () => {
    expect(check([{ path: '/f.js', networkError: false }]).join('\n')).toContain(
      'networkError는 true여야 합니다',
    )
  })

  it('네트워크 오류 resource path가 .txt', () => {
    expect(check([{ path: '/f.txt', networkError: true }]).join('\n')).toContain(
      '.js 또는 .json 경로여야 합니다',
    )
  })

  it('네트워크 오류 resource path가 예약 경로이거나 중복', () => {
    expect(check([{ path: '/example.js', networkError: true }]).join('\n')).toContain('예약된')
    expect(
      check([
        { path: '/f.js', networkError: true },
        { path: '/f.js', file: 'dep.js' },
      ]).join('\n'),
    ).toContain('중복')
  })

  it('file도 networkError도 없음(크래시하지 않는다)', () => {
    expect(check([{ path: '/f.js' }]).join('\n')).toContain('file 또는 networkError: true가 필요')
  })
})

describe('toRunnerInput', () => {
  it('기본값: settleMs 300, delayMs 0, resources 본문 읽기', () => {
    const input = toRunnerInput(
      br({ file: 'a.js', resources: [{ path: '/dep.js', file: 'dep.js' }] }) as BrowserExample,
      fs.read,
    )
    expect(input).toEqual({
      kind: 'js',
      source: 'console.log(1)',
      resources: [
        {
          path: '/dep.js',
          body: 'console.log("dep")',
          delayMs: 0,
          status: 200,
          contentType: 'text/javascript; charset=utf-8',
        },
      ],
      settleMs: 300,
    })
  })

  it('.html은 kind html, 지정한 settleMs·delayMs를 그대로 쓴다', () => {
    const input = toRunnerInput(
      br({
        settleMs: 0,
        resources: [{ path: '/dep.js', file: 'dep.js', delayMs: 200 }],
      }) as BrowserExample,
      fs.read,
    )
    expect(input.kind).toBe('html')
    expect(input.settleMs).toBe(0)
    expect(input.resources[0]).toMatchObject({ delayMs: 200 })
  })

  it('resources가 없으면 빈 배열', () => {
    expect(toRunnerInput(br() as BrowserExample, fs.read).resources).toEqual([])
  })

  it('.json은 application/json, status 기본 200과 지정값', () => {
    const input = toRunnerInput(
      br({
        file: 'a.js',
        resources: [
          { path: '/data.json', file: 'data.json' },
          { path: '/missing.json', file: 'data.json', status: 404 },
        ],
      }) as BrowserExample,
      fs.read,
    )
    expect(input.resources).toEqual([
      {
        path: '/data.json',
        body: '{"a":1}',
        delayMs: 0,
        status: 200,
        contentType: 'application/json',
      },
      {
        path: '/missing.json',
        body: '{"a":1}',
        delayMs: 0,
        status: 404,
        contentType: 'application/json',
      },
    ])
  })

  it('네트워크 오류 resource는 { path, networkError: true }로 바뀐다', () => {
    const input = toRunnerInput(
      br({ file: 'a.js', resources: [{ path: '/f.json', networkError: true }] }) as BrowserExample,
      fs.read,
    )
    expect(input.resources).toEqual([{ path: '/f.json', networkError: true }])
  })
})
