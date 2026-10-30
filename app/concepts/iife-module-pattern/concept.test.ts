import { readFileSync } from 'node:fs'
import { format } from 'node:util'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { approaches } from './approaches'
import { concept } from './meta'

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체라 instanceof 대신 name으로 검사한다.
const errorNameOf = (source: string, sandbox: object = {}): string | null => {
  try {
    runInNewContext(source, sandbox)
    return null
  } catch (e) {
    return (e as Error).name
  }
}

describe('본문 주장 검증', () => {
  it.each(['function () {}()', 'function f() {}()'])(
    '스크립트 최상위 `%s`는 SyntaxError다',
    (source) => {
      expect(errorNameOf(source)).toBe('SyntaxError')
    },
  )

  it('두 스크립트를 차례로 실행하면 앞 스크립트가 실행되는 동안에는 앞의 함수가 쓰인다', () => {
    const out: string[] = []
    const ctx = createContext({
      console: { log: (...args: unknown[]) => out.push(format(...args)) },
    })
    runInContext(
      `var version = 'A';
       function init() { return 'A 준비'; }
       console.log(init());`,
      ctx,
    )
    runInContext(
      `var version = 'B';
       function init() { return 'B 준비'; }
       console.log(init(), version);`,
      ctx,
    )
    runInContext('console.log(init());', ctx)
    expect(out).toEqual(['A 준비', 'B 준비 B', 'B 준비'])
  })

  it('IIFE 안의 암묵적 전역은 sloppy에서 전역 프로퍼티가 되고 strict에서는 ReferenceError다', () => {
    const ctx = createContext({})
    runInContext('(function () { leaked = 1 })()', ctx)
    expect(runInContext('typeof leaked', ctx)).toBe('number')
    expect(runInContext("'leaked' in globalThis", ctx)).toBe(true)
    expect(errorNameOf("'use strict'; (function () { leaked = 1 })()")).toBe('ReferenceError')
  })

  it('최상위 let을 다른 스크립트에서 같은 이름으로 다시 선언하면 SyntaxError다', () => {
    for (const redeclare of [
      'let shared = 2',
      'const shared = 2',
      'class shared {}',
      'var shared = 2',
      'function shared() {}',
    ]) {
      const ctx = createContext({})
      runInContext('let shared = 1', ctx)
      let name: string | null = null
      try {
        runInContext(redeclare, ctx)
      } catch (e) {
        name = (e as Error).name
      }
      expect(name).toBe('SyntaxError')
      expect(runInContext("'shared' in globalThis", ctx)).toBe(false)
    }
  })

  it('이름 있는 함수 식의 이름에 대입하면 sloppy에서는 무시되고 strict에서는 TypeError다', () => {
    expect(runInNewContext('(function f() { f = 1; return typeof f })()')).toBe('function')
    expect(errorNameOf("(function f() { 'use strict'; f = 1 })()")).toBe('TypeError')
  })

  it('Object.freeze는 추가·삭제·쓰기를 막고 한 단계만 고정한다', () => {
    expect(
      runInNewContext(`var o = Object.freeze({ a: 1, inner: { n: 1 } });
        o.a = 2; o.b = 1; delete o.a; o.inner.n = 2;
        [o.a, typeof o.b, o.inner.n].join(' ')`),
    ).toBe('1 undefined 2')
  })

  it('Object.freeze한 객체의 접근자 프로퍼티는 지울 수 없지만 대입하면 setter가 호출된다', () => {
    expect(
      runInNewContext(`var log = [];
        var o = Object.freeze({ set x(v) { log.push(v) } });
        o.x = 5; delete o.x;
        [log.join(), 'x' in o].join(' ')`),
    ).toBe('5 true')
  })
})

describe('비교표 근거', () => {
  const exampleIds = concept.examples.map((example) => example.id)

  it('표의 예제 id는 모두 meta.examples에 있다', () => {
    for (const row of approaches) {
      if (row.exampleId !== null) expect(exampleIds).toContain(row.exampleId)
    }
  })

  // 이 비교는 예제가 최상위 let·const·class를 쓰지 않아서 성립한다.
  // 전역 let·const·class는 전역 객체의 프로퍼티가 아니라 전역 객체의 프로퍼티 비교에 나타나지 않는다.
  for (const row of approaches.filter((r) => r.exampleId !== null)) {
    it(`${row.method}: 예제 ${row.exampleId}가 전역 객체에 남기는 이름이 표와 같다`, () => {
      const example = concept.examples.find((e) => e.id === row.exampleId)
      if (!example) throw new Error(`예제 ${row.exampleId}가 없다`)
      const code = readFileSync(new URL(`./examples/${example.file}`, import.meta.url), 'utf8')
      const ctx = createContext({ console: { log: () => undefined } })
      const names = () => Object.getOwnPropertyNames(runInContext('globalThis', ctx) as object)
      const before = names()
      runInContext(code, ctx)
      const added = names()
        .filter((name) => !before.includes(name) && name !== 'console')
        .sort()
      expect(added).toEqual([...row.globals].sort())
    })
  }
})
