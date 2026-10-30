import { execFileSync } from 'node:child_process'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { globalProps } from './global-props'

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체라 instanceof 대신 name으로 검사한다.
const errorNameOf = (source: string, sandbox: object = {}): string | null => {
  try {
    runInNewContext(source, sandbox)
    return null
  } catch (e) {
    return (e as Error).name
  }
}

type Descriptor = {
  own: boolean
  type: string
  writable: boolean
  enumerable: boolean
  configurable: boolean
}

// 새 컨텍스트 안에서 계산해 JSON 문자열로 돌려주고 호스트에서 파싱한다.
const describeGlobal = (name: string): Descriptor =>
  JSON.parse(
    runInNewContext(`(function (n) {
      var d = Object.getOwnPropertyDescriptor(globalThis, n);
      return JSON.stringify({
        own: Object.prototype.hasOwnProperty.call(globalThis, n),
        type: typeof globalThis[n],
        writable: d.writable,
        enumerable: d.enumerable,
        configurable: d.configurable
      });
    })(${JSON.stringify(name)})`) as string,
  ) as Descriptor

const checkableRows = globalProps.filter((row) => row.checkable !== null)

describe('전역 객체 프로퍼티 표', () => {
  it('검증하지 않는 행은 호스트가 더한 것과 코드가 만든 것 둘뿐이다', () => {
    const unchecked = globalProps.filter((row) => row.checkable === null)
    expect(unchecked.map((row) => row.source)).toEqual(['호스트가 더한 것(예)', '코드가 만든 것'])
  })

  for (const row of checkableRows) {
    describe(row.source, () => {
      for (const name of row.names) {
        it(`${name}은 전역 객체의 자기 프로퍼티이고 종류·속성이 표와 같다`, () => {
          const d = describeGlobal(name)
          expect(d.own).toBe(true)
          expect(d.enumerable).toBe(false)

          if (row.checkable === 'function') expect(d.type).toBe('function')
          if (row.checkable === 'object') expect(d.type).toBe('object')

          if (row.checkable === 'value') {
            if (name === 'globalThis') {
              expect([d.writable, d.configurable]).toEqual([true, true])
            } else {
              expect([d.writable, d.configurable]).toEqual([false, false])
            }
          } else {
            // attributes 문구 '쓰기 가능, 열거 불가, 재정의 가능'
            expect([d.writable, d.configurable]).toEqual([true, true])
          }
        })
      }
    })
  }
})

describe('본문 주장 검증', () => {
  it.each(['let undefined = 1;', 'let NaN = 1;', 'const Infinity = 1;'])(
    '스크립트 최상위 `%s`는 SyntaxError이고 앞선 문장도 실행되지 않는다',
    (decl) => {
      const sandbox: { ran?: boolean } = {}
      expect(errorNameOf(`globalThis.ran = true; ${decl}`, sandbox)).toBe('SyntaxError')
      expect('ran' in sandbox).toBe(false)
    },
  )

  it('앞선 스크립트의 전역 var 이름을 let으로 선언하면 SyntaxError, 대입으로 만든 프로퍼티 이름은 허용된다', () => {
    const ctx = createContext({})
    runInContext('var x = 1; globalThis.y = 1;', ctx)
    let xError: string | null = null
    try {
      runInContext('let x = 2;', ctx)
    } catch (e) {
      xError = (e as Error).name
    }
    expect(xError).toBe('SyntaxError')
    expect(runInContext('let y = 2; y', ctx)).toBe(2)
  })

  it('(eval)(…)은 직접 호출, eval?.(…)은 간접 호출이다', () => {
    expect(
      runInNewContext(
        `var w = 'global';
         function f() { var w = 'local'; return [(eval)('w'), eval?.('w')].join(' '); }
         f()`,
      ),
    ).toBe('local global')
  })

  it('함수 안에서는 let NaN = 1이 가능하다', () => {
    expect(runInNewContext('(function () { let NaN = 1; return NaN; })()')).toBe(1)
  })

  it('delete globalThis.Math는 true이고 이후 typeof Math는 undefined다', () => {
    expect(
      runInNewContext(`var r = delete globalThis.Math; JSON.stringify([r, typeof Math])`),
    ).toBe('[true,"undefined"]')
  })

  it('globalThis.eval은 간접 호출이라 전역 스코프에서 평가한다', () => {
    expect(
      runInNewContext(
        `var where = 'global';
         function f() { var where = 'local'; return globalThis.eval('where'); }
         f()`,
      ),
    ).toBe('global')
  })

  it('eval은 문자열이 아닌 인수를 그대로 돌려준다', () => {
    expect(runInNewContext('eval(42) === 42')).toBe(true)
    expect(runInNewContext("typeof eval({}) === 'object'")).toBe(true)
  })

  it("eval 코드 문자열의 'use strict'는 eval 안의 var를 바깥으로 내보내지 않는다", () => {
    expect(
      runInNewContext(
        `function f() { eval("'use strict'; var s2 = 1"); return typeof s2; }
         f()`,
      ),
    ).toBe('undefined')
  })

  it('globalThis를 new로 부르든 그냥 부르든 TypeError다', () => {
    expect(errorNameOf('new globalThis()')).toBe('TypeError')
    expect(errorNameOf('globalThis()')).toBe('TypeError')
  })

  it("decodeURIComponent('%E0%A4%A')는 URIError다", () => {
    expect(errorNameOf("decodeURIComponent('%E0%A4%A')")).toBe('URIError')
  })

  it('isFinite(null)은 true이고 Number.isFinite(null)은 false다', () => {
    expect(runInNewContext('isFinite(null)')).toBe(true)
    expect(runInNewContext('Number.isFinite(null)')).toBe(false)
  })

  it("String(0.0000005)는 '5e-7'이다", () => {
    expect(runInNewContext('String(0.0000005)')).toBe('5e-7')
  })

  it("parseInt('10', 1)은 NaN이고 parseInt('  42  ')는 42다", () => {
    expect(runInNewContext("Number.isNaN(parseInt('10', 1))")).toBe(true)
    expect(runInNewContext("parseInt('  42  ')")).toBe(42)
  })

  it('간접 eval로 만든 var는 함수 안에서 호출해도 전역 프로퍼티가 된다', () => {
    expect(
      runInNewContext(
        `function f() { (0, eval)('var made2 = 1'); }
         f();
         'made2' in globalThis`,
      ),
    ).toBe(true)
  })
})

describe('일반 스크립트 전역의 프로퍼티 속성(node -e)', () => {
  // 예제 러너의 vm 새 컨텍스트에서는 전역 var 바인딩의 configurable이 true로 보여
  // (GlobalDeclarationInstantiation의 NOTE가 말하는 false와 다르다) 새 컨텍스트로는 검증하지 않고,
  // 일반 스크립트의 전역에서 자식 Node 프로세스로 확인한다.
  it('var·함수 선언은 configurable false, 암묵적 전역은 true이고 delete 결과도 그에 따른다', () => {
    const code = `
      var a = 1; function g() {} b = 2;
      var conf = function (n) { return Object.getOwnPropertyDescriptor(globalThis, n).configurable; };
      console.log(JSON.stringify([conf('a'), conf('g'), conf('b'), delete a, delete b]));
    `
    const out = execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' })
    expect(JSON.parse(out)).toEqual([false, false, true, false, true])
  })

  it('eval 코드가 전역에 만든 var는 configurable true라 지워지고, 전역 선언 var는 지워지지 않는다', () => {
    const code = `
      (0, eval)('var fromEval = 1'); var normal = 1;
      var conf = Object.getOwnPropertyDescriptor(globalThis, 'fromEval').configurable;
      console.log(JSON.stringify([conf, delete fromEval, delete normal]));
    `
    const out = execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' })
    expect(JSON.parse(out)).toEqual([true, true, false])
  })

  it('이미 있던 프로퍼티(Math)에 var를 쓰면 새로 만들지 않아 configurable이 true로 남는다', () => {
    const code = `
      var Math = 1;
      console.log(JSON.stringify(Object.getOwnPropertyDescriptor(globalThis, 'Math').configurable));
    `
    const out = execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' })
    expect(JSON.parse(out)).toBe(true)
  })

  it('이미 있던 configurable 프로퍼티(Math)에 함수 선언을 쓰면 writable·enumerable true, configurable false로 다시 정의된다', () => {
    const code = `
      function Math() {}
      var d = Object.getOwnPropertyDescriptor(globalThis, 'Math');
      console.log(JSON.stringify([d.writable, d.enumerable, d.configurable]));
    `
    const out = execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' })
    expect(JSON.parse(out)).toEqual([true, true, false])
  })
})
