import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { methods } from './methods'
import { concept } from './meta'

describe('본문 주장 검증', () => {
  it('기본 sort 뒤에도 요소는 숫자다', () => {
    expect(
      runInNewContext('var a = [10, 9, 1]; a.sort(); typeof a[0] + " " + JSON.stringify(a)'),
    ).toBe('number [1,10,9]')
  })

  it('구멍만 있는 배열에 초기값 없이 reduce를 부르면 TypeError다', () => {
    let name = ''
    try {
      runInNewContext('[, ,].reduce((t, n) => t + n)')
    } catch (e) {
      // 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
      name = (e as Error).name
    }
    expect(name).toBe('TypeError')
  })

  it('sort는 구멍을 끝으로 보내고 구멍으로 남긴다', () => {
    expect(
      runInNewContext(
        'var a = [3, , 1]; a.sort(); a.length + " " + (2 in a) + " " + JSON.stringify(a)',
      ),
    ).toBe('3 false [1,3,null]')
  })

  it('비교 함수가 내림차순이어도 undefined는 끝으로 가고 비교 함수에 넘어가지 않는다', () => {
    expect(
      runInNewContext(
        'var calls = 0; var a = [undefined, 1, 3, 2]; a.sort((x, y) => { if (x === undefined || y === undefined) calls++; return y - x; }); calls + " " + JSON.stringify(a) + " " + (a[3] === undefined && 3 in a)',
      ),
    ).toBe('0 [3,2,1,null] true')
  })

  it('lastIndexOf도 NaN을 찾지 못한다', () => {
    expect(runInNewContext('String([NaN].lastIndexOf(NaN))')).toBe('-1')
  })

  it('비교 함수가 NaN을 돌려주면 같다고 보아 문자열 배열이 원래 순서로 남는다', () => {
    expect(runInNewContext('JSON.stringify(["b", "a"].sort((a, b) => a - b))')).toBe('["b","a"]')
  })

  it('초기값 없는 reduce는 앞쪽 구멍을 건너뛰고 프로퍼티가 있는 첫 요소에서 시작한다', () => {
    expect(runInNewContext('String([ , 5, 6].reduce((t, n) => t + n))')).toBe('11')
  })

  it('reduce는 중간의 구멍에서도 콜백을 부르지 않는다', () => {
    expect(
      runInNewContext(
        'var calls = 0; var total = [1, , 2, , 3].reduce((t, n) => { calls++; return t + n; }); total + " " + calls',
      ),
    ).toBe('6 2')
  })

  it('빼기 비교 함수는 숫자로 바뀌는 문자열을 숫자 크기순으로 정렬한다', () => {
    expect(runInNewContext('JSON.stringify(["10", "9", "1"].sort((a, b) => a - b))')).toBe(
      '["1","9","10"]',
    )
  })
})

describe('메서드 표 근거', () => {
  const exampleIds = concept.examples.map((example) => example.id)

  it('표의 예제 id는 모두 meta.examples에 있다', () => {
    for (const row of methods) {
      if (row.exampleId !== null) expect(exampleIds).toContain(row.exampleId)
    }
  })

  // 칸마다 새 컨텍스트에서 실행해 다른 칸의 상태에 의존하지 않는다.
  for (const row of methods) {
    for (const [kind, cell] of [
      ['원본 변경', row.mutates],
      ['반환값', row.returns],
    ] as const) {
      it(`${row.method} / ${kind}: probe 결과가 표와 같다`, () => {
        let actual: string
        try {
          actual = String(runInNewContext(cell.probe))
        } catch (e) {
          actual = (e as Error).name
        }
        expect(actual).toBe(cell.expected)
      })
    }
  }
})
