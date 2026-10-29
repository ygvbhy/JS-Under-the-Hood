import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { wrapperTable } from './wrapper-table'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체라 instanceof 대신 name으로 검사한다.
const errorNameOf = (source: string): string | null => {
  try {
    runInNewContext(source)
    return null
  } catch (e) {
    return (e as Error).name
  }
}

// 컨텍스트 안에서 JSON 문자열로 만들어 돌려주고 호스트에서 파싱한다(realm이 달라 instanceof를 쓰지 않는다).
const jsonOf = (source: string): unknown => JSON.parse(runInNewContext(source) as string)

const STRICT = "'use strict';\n"

describe('본문 주장 검증', () => {
  it("'length' in 'abc'는 TypeError다(in의 오른쪽은 객체여야 하며 ToObject를 하지 않는다)", () => {
    expect(errorNameOf("'length' in 'abc'")).toBe('TypeError')
  })

  it('null에 대입하면 sloppy mode에서도 TypeError다', () => {
    expect(errorNameOf('var x = null; x.a = 1;')).toBe('TypeError')
  })

  it('undefined에 대입하면 sloppy mode에서도 TypeError다', () => {
    expect(errorNameOf('var x; x.a = 1;')).toBe('TypeError')
  })

  it('strict mode에서 문자열의 length에 대입하면 TypeError다', () => {
    expect(errorNameOf(`${STRICT}var s = 'abc'; s.length = 1;`)).toBe('TypeError')
  })

  it('sloppy mode에서 문자열의 length에 대입하면 무시된다', () => {
    expect(runInNewContext(`var s = 'abc'; s.length = 1; String(s.length)`)).toBe('3')
  })

  it("Symbol('id').description은 'id'이고 new Symbol('id')는 TypeError다", () => {
    expect(runInNewContext("Symbol('id').description")).toBe('id')
    expect(errorNameOf("new Symbol('id')")).toBe('TypeError')
  })

  it("(10n).toString()은 '10'이고 new BigInt(10)은 TypeError다", () => {
    expect(runInNewContext('(10n).toString()')).toBe('10')
    expect(errorNameOf('new BigInt(10)')).toBe('TypeError')
  })

  it('Object(Symbol)과 Object(BigInt)는 typeof가 object인 래퍼 객체다', () => {
    expect(jsonOf(`JSON.stringify([typeof Object(Symbol('x')), typeof Object(1n)])`)).toEqual([
      'object',
      'object',
    ])
  })

  it("Object('abc')의 '0'과 length 서술자", () => {
    expect(
      jsonOf(
        `const o = Object('abc');
         JSON.stringify([Object.getOwnPropertyDescriptor(o, '0'), Object.getOwnPropertyDescriptor(o, 'length')])`,
      ),
    ).toEqual([
      { value: 'a', writable: false, enumerable: true, configurable: false },
      { value: 3, writable: false, enumerable: false, configurable: false },
    ])
  })

  it('new Number(1)은 1과 ===는 false, ==는 true이고 new Number(1) === new Number(1)은 false다', () => {
    expect(
      jsonOf(
        `JSON.stringify([new Number(1) === 1, new Number(1) == 1, new Number(1) === new Number(1)])`,
      ),
    ).toEqual([false, true, false])
  })

  it('래퍼 객체의 valueOf()는 원시 값을 돌려준다', () => {
    expect(runInNewContext(`typeof new String('a').valueOf()`)).toBe('string')
  })

  it('new Object(원시 값)도 래퍼 객체다', () => {
    expect(runInNewContext(`typeof new Object('hi')`)).toBe('object')
  })

  it('255.toString(16)은 SyntaxError이고 (255).toString(16)·(1).toString()은 동작한다', () => {
    expect(errorNameOf('255.toString(16)')).toBe('SyntaxError')
    expect(runInNewContext('(255).toString(16)')).toBe('ff')
    expect(runInNewContext('(1).toString()')).toBe('1')
  })

  it("strict mode에서 'a'.__proto__ = {}는 오류 없이 지나간다(setter는 this가 객체가 아니면 아무것도 하지 않는다)", () => {
    expect(runInNewContext(`${STRICT}'a'.__proto__ = {}; 'ok'`)).toBe('ok')
  })

  it('String.prototype의 getter·setter가 받는 this(receiver)는 원시 값 그대로다(typeof가 string)', () => {
    const define = `Object.defineProperty(String.prototype, 'probe', {
      configurable: true,
      get() { 'use strict'; return typeof this; },
      set(v) { 'use strict'; recorded = typeof this; },
    });`
    expect(runInNewContext(`${define} 'a'.probe`)).toBe('string')
    expect(runInNewContext(`var recorded; ${define} 'a'.probe = 1; recorded`)).toBe('string')
  })

  it('sloppy mode getter는 넘겨받은 원시 값 this를 객체로 바꿔 받는다(typeof가 object)', () => {
    expect(
      runInNewContext(
        `Object.defineProperty(String.prototype, 'probe', { configurable: true, get() { return typeof this; } }); 'a'.probe`,
      ),
    ).toBe('object')
  })

  it('?.는 기준 값이 null이면 나머지를 평가하지 않는다(c가 0으로 남는다)', () => {
    expect(
      jsonOf(`let o = null; let c = 0; const r = o?.[c++]; JSON.stringify({ r: String(r), c })`),
    ).toEqual({ r: 'undefined', c: 0 })
  })

  it('Object(null)과 Object(undefined)는 빈 객체를 돌려주지만 null의 프로퍼티 접근은 TypeError다', () => {
    expect(
      jsonOf(
        `JSON.stringify([typeof Object(null), JSON.stringify(Object(null)), typeof Object(undefined), JSON.stringify(Object(undefined))])`,
      ),
    ).toEqual(['object', '{}', 'object', '{}'])
    expect(errorNameOf('null.x')).toBe('TypeError')
    expect(errorNameOf('Object(null).x; null.x')).toBe('TypeError')
  })

  it('Object.getPrototypeOf와 Object.hasOwn은 인수에 ToObject를 적용한다: 원시 값은 래퍼로, null은 TypeError', () => {
    expect(
      jsonOf(
        `JSON.stringify([Object.getPrototypeOf('a') === String.prototype, Object.hasOwn('abc', 'length')])`,
      ),
    ).toEqual([true, true])
    expect(errorNameOf('Object.getPrototypeOf(null)')).toBe('TypeError')
    expect(errorNameOf("Object.hasOwn(null, 'x')")).toBe('TypeError')
  })

  it('프로토타입에 이미 있는 쓰기 가능한 이름(toUpperCase)에 대입해도 sloppy는 무시, strict는 TypeError다', () => {
    expect(runInNewContext("const s = 'ab'; s.toUpperCase = 1; typeof s.toUpperCase")).toBe(
      'function',
    )
    expect(errorNameOf("'use strict'; const s = 'ab'; s.toUpperCase = 1;")).toBe('TypeError')
  })

  it('String 객체의 length는 보통의 쓰기 불가 데이터 프로퍼티이고 인덱스 프로퍼티와 어트리뷰트가 다르다', () => {
    expect(
      jsonOf(
        `const o = new String('ab'); JSON.stringify([Object.getOwnPropertyDescriptor(o, 'length'), Object.getOwnPropertyDescriptor(o, '0')])`,
      ),
    ).toEqual([
      { value: 2, writable: false, enumerable: false, configurable: false },
      { value: 'a', writable: false, enumerable: true, configurable: false },
    ])
  })
})

describe('원시 타입별 표', () => {
  // 표기 규칙은 wrapper-table.ts의 주석과 같다. 평가는 매번 새 컨텍스트 안에서 하고 문자열만 꺼낸다.
  const readOf = (source: string): string =>
    runInNewContext(
      `(() => { try { const v = (${source}); return typeof v === 'string' ? "'" + v + "'" : String(v); } catch (e) { return e.name; } })()`,
    ) as string

  const newOf = (source: string): string =>
    runInNewContext(
      `(() => { try { const v = (${source}); return 'typeof: ' + typeof v; } catch (e) { return e.name; } })()`,
    ) as string

  it('표는 7행이다', () => {
    expect(wrapperTable.map((r) => r.type)).toEqual([
      'String',
      'Number',
      'Boolean',
      'Symbol',
      'BigInt',
      'Null',
      'Undefined',
    ])
  })

  it.each(wrapperTable)('$type: readSource를 평가한 결과가 표와 같다', (row) => {
    expect(readOf(row.readSource)).toBe(row.readResult)
  })

  it.each(wrapperTable)('$type: newSource를 평가한 결과가 표와 같다(없으면 둘 다 null)', (row) => {
    if (row.newSource === null) {
      expect(row.newResult).toBeNull()
      return
    }
    expect(newOf(row.newSource)).toBe(row.newResult)
  })
})

describe('예제 실제 실행', () => {
  it.each(concept.examples)(
    '$file: 실제 실행 결과가 expectedOutput과 같다',
    ({ file, expectedOutput }) => {
      expect(runExample(readExample(file))).toEqual(expectedOutput)
    },
  )
})

describe('실행 방식에 따른 차이 (ES 모듈 / Node CommonJS)', () => {
  const strictOnlyModuleExamples = ['assign-sloppy.js']

  const expected = (file: string) =>
    concept.examples.find((e) => e.file === file)!.expectedOutput.join('\n') + '\n'

  // 오류로 끝난 실행은 execFileSync가 던지므로 stdout·stderr·status를 모아 돌려준다.
  const runNodeFile = (path: string) => {
    try {
      const stdout = execFileSync(process.execPath, [path], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { status: 0, stdout, stderr: '' }
    } catch (e) {
      const err = e as { status: number; stdout: string; stderr: string }
      return { status: err.status, stdout: err.stdout, stderr: err.stderr }
    }
  }

  const runAs = (file: string, ext: '.mjs' | '.cjs') => {
    const dir = mkdtempSync(join(tmpdir(), 'primitive-methods-'))
    try {
      const path = join(dir, file.replace(/\.js$/, ext))
      writeFileSync(path, readExample(file))
      return runNodeFile(path)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  it.each(concept.examples.map((e) => e.file))('%s (.cjs): 클래식 스크립트와 같은 출력', (file) => {
    const result = runAs(file, '.cjs')
    expect(result.status).toBe(0)
    expect(result.stdout).toBe(expected(file))
  })

  it.each(concept.examples.map((e) => e.file).filter((f) => !strictOnlyModuleExamples.includes(f)))(
    '%s (.mjs): 클래식 스크립트와 같은 출력',
    (file) => {
      const result = runAs(file, '.mjs')
      expect(result.status).toBe(0)
      expect(result.stdout).toBe(expected(file))
    },
  )

  it.each(strictOnlyModuleExamples)(
    '%s (.mjs): 모듈은 항상 strict라 잡히지 않은 TypeError로 끝난다',
    (file) => {
      const result = runAs(file, '.mjs')
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('TypeError')
    },
  )

  it('assign-sloppy.js에 첫 줄 use strict를 붙이면 runExample도 TypeError를 던진다', () => {
    expect(() => runExample(STRICT + readExample('assign-sloppy.js'))).toThrow(
      expect.objectContaining({ name: 'TypeError' }),
    )
  })

  it('package.json에 "type": "module"이 있으면 .js 파일도 모듈이라 assign-sloppy.js가 TypeError로 끝난다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'primitive-methods-'))
    try {
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
      writeFileSync(join(dir, 'assign-sloppy.js'), readExample('assign-sloppy.js'))
      const result = runNodeFile(join(dir, 'assign-sloppy.js'))
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('TypeError')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
