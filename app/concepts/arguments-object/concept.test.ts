import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios } from './scenarios'

const STRICT = "'use strict';\n"
const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const mdx = readFileSync(join(import.meta.dirname, 'content.mdx'), 'utf8')

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체이므로 name으로 비교한다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    return (e as Error).name
  }
}

describe('시나리오 불변식', () => {
  for (const scenario of scenarios) {
    const example = exampleOf(scenario.exampleId)

    it(`시나리오 "${scenario.id}"의 공통 불변식(코드, 출력, 줄 번호)을 만족한다`, () => {
      assertScenarioInvariants(scenario, example, readExample(example.file))
    })

    it(`시나리오 "${scenario.id}"는 모든 단계에서 연결된 프로퍼티의 값이 매개변수 값과 같다`, () => {
      scenario.steps.forEach((step, i) => {
        for (const prop of step.state.args ?? []) {
          if (prop.mappedTo === null) continue
          const param = step.state.params.find((p) => p.name === prop.mappedTo)
          expect(param, `단계 ${i + 1}: 매개변수 ${prop.mappedTo}가 없습니다`).toBeDefined()
          expect(prop.value, `단계 ${i + 1}: arguments[${prop.key}]의 값`).toBe(param!.value)
        }
      })
    })

    it(`시나리오 "${scenario.id}"는 호출 중이 아닐 때 매개변수와 arguments가 함께 비어 있다`, () => {
      scenario.steps.forEach((step, i) => {
        expect(step.state.args === null, `단계 ${i + 1}`).toBe(step.state.params.length === 0)
      })
    })
  }
})

describe('arguments 종류별 연결 표', () => {
  const rows = tableBody(mdx, [
    '매개변수 목록',
    '코드',
    '매개변수를 바꾼 뒤 arguments[0]',
    'arguments[0]을 바꾼 뒤 매개변수',
  ])

  it('행이 5개다', () => {
    expect(rows).toHaveLength(5)
  })

  it.each(rows.map((r) => [r[0], r[1], r[2], r[3]]))(
    '%s: `%s`의 결과는 %s와 %s이다',
    (_name, code, afterParam, afterArg) => {
      expect(show(code)).toBe(`${afterParam},${afterArg}`)
    },
  )
})

describe('본문 주장 검증', () => {
  it('value만 다시 정의하면 연결이 유지되어 매개변수도 바뀐다', () => {
    expect(
      show(
        "(function (a) { Object.defineProperty(arguments, '0', { value: 5 }); return a + ' ' + arguments[0]; })(1)",
      ),
    ).toBe('5 5')
  })

  it('접근자 프로퍼티로 바꾸면 연결이 끊긴다', () => {
    expect(
      show(
        "(function (a) { Object.defineProperty(arguments, '0', { get: function () { return 7; } }); a = 2; return a + ' ' + arguments[0]; })(1)",
      ),
    ).toBe('2 7')
  })

  it('매개변수보다 많이 넘긴 인수의 인덱스는 연결되지 않는다', () => {
    expect(
      show(
        '(function (a) { arguments[1] = 7; return a + " " + arguments[1] + " " + arguments.length; })(1, 5)',
      ),
    ).toBe('1 7 2')
  })

  it('arguments.length를 키워도 넘기지 않은 인수는 연결되지 않는다', () => {
    expect(show('(function (a, b) { arguments.length = 2; arguments[1] = 7; return b; })(1)')).toBe(
      'undefined',
    )
    expect(show('(function (a, b) { arguments.length = 2; b = 5; return arguments[1]; })(1)')).toBe(
      'undefined',
    )
  })

  it('이름이 중복되면 뒤쪽 인덱스만 연결된다', () => {
    expect(
      show('function f(a, a) { a = 9; return arguments[0] + " " + arguments[1]; } f(1, 2)'),
    ).toBe('1 9')
  })

  it('rest가 있거나 기본값이 있는 sloppy 함수의 arguments.callee를 읽으면 TypeError다', () => {
    expect(show('(function (...r) { return arguments.callee; })(1)')).toBe('TypeError')
    expect(show('(function (a = 1) { return arguments.callee; })()')).toBe('TypeError')
  })

  it('본문 맨 바깥의 let·const 선언 이름이 arguments이면 arguments 객체가 아니다', () => {
    expect(show('function f() { let arguments = 1; return typeof arguments; } f()')).toBe('number')
    expect(show('function f() { const arguments = "s"; return typeof arguments; } f()')).toBe(
      'string',
    )
  })

  it('매개변수 목록에 식이 있으면 본문에 함수 선언 arguments가 있어도 arguments 객체가 만들어진다', () => {
    expect(
      show(
        '(function (a = arguments.length) { function arguments() {} return [a, typeof arguments]; })(undefined, 2)',
      ),
    ).toBe('2,function')
  })

  it('패턴만 있는 목록은 단순하지 않지만 식이 없어 let arguments가 있으면 arguments 객체가 아니다', () => {
    expect(
      show('(function ({ a }) { let arguments = 1; return typeof arguments; })({ a: 1 })'),
    ).toBe('number')
  })

  it('클래스 선언은 이름이 arguments이면 SyntaxError다', () => {
    expect(show('function f() { class arguments {} return typeof arguments; } f()')).toBe(
      'SyntaxError',
    )
  })

  it('매개변수 이름이 arguments이면 매개변수 목록에 식이 있어도 넘긴 값의 타입이다', () => {
    expect(show('function f(arguments, b = 1) { return typeof arguments; } f(1)')).toBe('number')
  })

  it('Object.freeze로 얼리면 연결이 끊기고 Object.seal로 봉인하면 연결이 유지된다', () => {
    expect(
      show('(function (a) { Object.freeze(arguments); a = 3; return a + " " + arguments[0]; })(1)'),
    ).toBe('3 1')
    expect(
      show('(function (a) { Object.seal(arguments); a = 3; return a + " " + arguments[0]; })(1)'),
    ).toBe('3 3')
  })

  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    "예제 %s는 맨 앞에 'use strict';를 붙여 실행하면 출력이 달라지거나 오류가 난다",
    (_id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      let strictOutput: string[] | null
      try {
        strictOutput = runExample(STRICT + code)
      } catch {
        strictOutput = null
      }
      expect(strictOutput).not.toEqual(expectedOutput)
    },
  )
})
