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

describe('식별자 규칙 표', () => {
  const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')
  const rows = tableBody(mdx, ['코드', '결과', '이유'])

  it('행이 7개이고 코드 칸이 중복되지 않는다', () => {
    expect(rows).toHaveLength(7)
    expect(new Set(rows.map((r) => r[0])).size).toBe(rows.length)
  })

  it.each(rows.map((r) => [r[0], r[1]]))('`%s` → %s (파싱 결과)', (code, result) => {
    expect(['가능', 'SyntaxError']).toContain(result)
    // new Script는 파싱만 하고 실행하지 않는다. 파싱 오류는 SyntaxError다.
    const name = errorNameOf(() => new Script(code))
    expect(name).toBe(result === '가능' ? undefined : 'SyntaxError')
  })
})

describe('본문 주장 검증', () => {
  it('어디에서도 찾을 수 없는 이름을 읽으면 sloppy·strict 모두 ReferenceError', () => {
    expect(errorNameOf(() => runInNewContext('notDeclared'))).toBe('ReferenceError')
    expect(errorNameOf(() => runInNewContext("'use strict'; notDeclared"))).toBe('ReferenceError')
  })

  it('Math처럼 미리 있는 이름은 선언하지 않아도 읽힌다', () => {
    expect(errorNameOf(() => runInNewContext('Math'))).toBeUndefined()
    expect(runInNewContext('Math.max(1, 2)')).toBe(2)
  })

  it('호스트가 미리 제공한 전역 이름은 선언하지 않아도 ReferenceError가 아니다', () => {
    expect(runInNewContext('existing', { existing: 'host' })).toBe('host')
  })

  it('전역 객체에 이미 있는 이름: var 선언은 undefined로 초기화하지 않고 기존 값을 유지한다', () => {
    expect(runInNewContext('var existing; existing', { existing: 'host' })).toBe('host')
  })

  it('초기값 없는 `var x;` 줄은 앞서 할당한 값을 바꾸지 않는다', () => {
    expect(runInNewContext('var x; x = 1; var x; x')).toBe(1)
  })

  it('같은 이름의 함수 선언이 있으면 var 선언의 값은 undefined가 아니라 함수다', () => {
    expect(runInNewContext('function f() {} var f; typeof f')).toBe('function')
  })

  it('한 문장의 선언 목록은 앞에서부터 하나씩 평가된다', () => {
    expect(runInNewContext("var o = [], a = o.push('a'), b = o.push('b'); o.join()")).toBe('a,b')
  })

  it('let은 strict mode가 아니어도 let 선언의 이름으로는 쓸 수 없다', () => {
    expect(errorNameOf(() => new Script('let let = 1;'))).toBe('SyntaxError')
  })

  it('예약어 목록의 await·yield는 strict mode가 아닌 스크립트에서 var 이름으로 쓸 수 있다', () => {
    expect(errorNameOf(() => new Script('var await = 1; var yield = 2;'))).toBeUndefined()
  })

  it('선언만 한 변수는 읽으면 undefined다', () => {
    expect(runInNewContext('var x; x')).toBeUndefined()
  })
})

describe('메타', () => {
  it("title·summary·tags에 '객체'가 없어 홈 '객체' 검색에 걸리지 않는다", () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })
})
