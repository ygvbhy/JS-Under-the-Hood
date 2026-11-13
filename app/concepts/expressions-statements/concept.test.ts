import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { concept } from './meta'

// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function errorNameOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (e) {
    return (e as Error).name
  }
  return undefined
}

// 문자열 코드의 완료 값을 eval로 얻는다. 본문의 완료 값 주장을 검증하는 테스트에서만 쓴다(독자용 예제에는 eval을 쓰지 않는다).
function completionValue(code: string): unknown {
  return runInNewContext('eval(' + JSON.stringify(code) + ')')
}

describe('표현식 자리 파싱 표', () => {
  const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')
  const rows = tableBody(mdx, ['코드', '결과', '이유'])

  it('행이 5개이고 코드 칸이 중복되지 않는다', () => {
    expect(rows).toHaveLength(5)
    expect(new Set(rows.map((r) => r[0])).size).toBe(rows.length)
  })

  it.each(rows.map((r) => [r[0], r[1]]))('`%s` → %s (파싱 결과)', (code, result) => {
    expect(['가능', 'SyntaxError']).toContain(result)
    // new Script는 파싱만 하고 실행하지 않는다. 파싱 오류는 SyntaxError다.
    const name = errorNameOf(() => new Script(code))
    expect(name).toBe(result === '가능' ? undefined : 'SyntaxError')
  })
})

describe('완료 값 주장 검증', () => {
  it('식 문은 식의 값을 남긴다', () => {
    expect(completionValue('1 + 2')).toBe(3)
  })

  it('var 선언문은 값을 남기지 않는다: 단독이면 eval이 empty를 undefined로 바꾸고, 앞에 값이 있으면 그 값이 남는다', () => {
    expect(completionValue('var x = 1')).toBeUndefined()
    expect(completionValue('1; var z = 2;')).toBe(1)
  })

  it('if 문이 남기는 undefined는 empty가 아니라 값이라 앞 문의 값을 덮어쓴다', () => {
    expect(completionValue('1; var x;')).toBe(1)
    expect(completionValue('1; if (false) {}')).toBeUndefined()
  })

  it('명세 StatementList NOTE의 세 예는 모두 1이다', () => {
    expect(completionValue('1;;;;;')).toBe(1)
    expect(completionValue('1;{}')).toBe(1)
    expect(completionValue('1;var a;')).toBe(1)
  })

  it('블록은 마지막으로 값을 남긴 문의 값을 남긴다', () => {
    expect(completionValue('3; { 4 }')).toBe(4)
    expect(completionValue('3; { var t; }')).toBe(3)
    expect(completionValue('7; {}')).toBe(7)
    expect(completionValue('4; { 5; var t; }')).toBe(5)
  })

  it('if 문: 실행한 쪽의 값, 거짓이고 else가 없으면 undefined, 실행한 쪽이 값을 남기지 않아도 undefined', () => {
    expect(completionValue('if (true) { 5 }')).toBe(5)
    expect(completionValue('7; if (false) { 6 }')).toBeUndefined()
    expect(completionValue('7; if (true) { var u; }')).toBeUndefined()
    expect(completionValue('3; if (true) {} else {}')).toBeUndefined()
  })

  it('let·const·class 선언과 함수 선언은 값을 남기지 않아 앞의 값이 유지된다', () => {
    expect(completionValue('1; let q = 2;')).toBe(1)
    expect(completionValue('1; const w = 2;')).toBe(1)
    expect(completionValue('1; class C {}')).toBe(1)
    expect(completionValue('2; function g() {}')).toBe(2)
  })
})

describe('본문 주장 검증', () => {
  it('초기값 자리의 function f() {}는 함수 표현식이라 파싱된다', () => {
    expect(errorNameOf(() => new Script('var g = function f() {};'))).toBeUndefined()
  })

  it('괄호로 감싼 ({ a: 1 })은 객체 리터럴이고 문 맨 앞의 { a: 1 }은 블록 안의 식 문 1이다', () => {
    expect(runInNewContext('JSON.stringify(({ a: 1 }))')).toBe('{"a":1}')
    expect(completionValue('{ a: 1 }')).toBe(1)
  })

  it('초기값 자리의 { a: 1 }은 객체 리터럴이다', () => {
    expect(runInNewContext('var o = { a: 1 }; JSON.stringify(o)')).toBe('{"a":1}')
  })

  it('undefined는 리터럴이 아니라 식별자라서 함수 안에서 var로 선언할 수 있다', () => {
    expect(runInNewContext('(function () { var undefined = 3; return undefined; })()')).toBe(3)
  })

  it('null은 리터럴이라 식별자로 선언하면 SyntaxError다', () => {
    expect(errorNameOf(() => new Script('var null = 3;'))).toBe('SyntaxError')
  })

  it('배열·객체 리터럴은 평가할 때마다 새 값을 만든다', () => {
    expect(runInNewContext('function f() { return [1]; } f() === f()')).toBe(false)
    expect(runInNewContext('function f() { return { a: 1 }; } f() === f()')).toBe(false)
  })
})

describe('예제 2의 근거', () => {
  it('문 맨 앞의 중괄호가 객체 리터럴로 읽혔다면 안의 할당 때문에 SyntaxError다', () => {
    expect(errorNameOf(() => new Script("var a = 'outer'; ({ a = 'block'; });"))).toBe(
      'SyntaxError',
    )
    expect(errorNameOf(() => new Script("var a = 'outer'; { a = 'block'; }"))).toBeUndefined()
  })

  it('첫 출력은 블록인지 가리지 못한다: 괄호로 감싼 객체 리터럴이어도 a는 그대로다', () => {
    expect(runInNewContext("var a = 'outer'; ({ a: 1 }); a")).toBe('outer')
  })
})

describe('메타', () => {
  it("title·summary·tags에 '객체'가 없어 홈 '객체' 검색에 걸리지 않는다", () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })
})
