import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { conversionTable } from './conversion-table'
import { concept } from './meta'
import {
  scenarios,
  type ConvState,
  type Operand,
  type Operation,
  type Rule,
  type Val,
} from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')

// 본문에서 주장하지만 예제로 출력할 수 없는 오류 동작을 node:vm으로 검증한다.
// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function errorNameOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (e) {
    return (e as Error).name
  }
  return undefined
}

describe('본문 주장 검증', () => {
  describe('변환할 수 없는 값은 TypeError다', () => {
    it.each([
      "Symbol('id') + ''",
      "`${Symbol('id')}`",
      "+Symbol('id')",
      "Number(Symbol('id'))",
      '1n + 1',
      "'10' - 1n",
      '+10n',
    ])('`%s`', (source) => {
      expect(errorNameOf(() => runInNewContext(source))).toBe('TypeError')
    })
  })

  describe('오류 없이 값을 돌려주는 경우', () => {
    it.each([
      ["10n + ''", '10'],
      ["String(Symbol('id'))", 'Symbol(id)'],
      ['Number(10n)', 10],
      ["!Symbol('id')", false],
      ['1n > 0', true],
    ])('`%s` → %j', (source, expected) => {
      expect(errorNameOf(() => runInNewContext(source))).toBeUndefined()
      expect(runInNewContext(source)).toBe(expected)
    })
  })

  describe('본문 서술의 근거', () => {
    it("`'1' + 2 * 3`은 우선순위가 높은 *가 먼저 계산되어 '16'이다", () => {
      expect(runInNewContext("'1' + 2 * 3")).toBe('16')
    })

    it("공백만 있는 문자열은 숫자로 바꾸면 0이다: `'  ' - 0`", () => {
      expect(runInNewContext("'  ' - 0")).toBe(0)
    })

    it('객체는 원시 값으로 바꾸지 않고 항상 truthy다: `!{}`는 false', () => {
      expect(runInNewContext('!{}')).toBe(false)
    })

    it('템플릿 리터럴은 +와 다른 변환을 쓴다: valueOf 객체에서 `p + ""`와 `${p}`가 다르다', () => {
      const source = 'const p = { valueOf() { return 1 } }; [p + "", `${p}`, String(p)]'
      const [plus, template, explicit] = runInNewContext(source) as [string, string, string]
      expect(plus).toBe('1')
      expect(template).toBe('[object Object]')
      expect(explicit).toBe('[object Object]')
    })

    it('원시 값으로 바뀌는 방법을 직접 정한 객체는 "[object Object]"가 되지 않는다', () => {
      expect(runInNewContext("({ toString() { return '5' } }) - 1")).toBe(4)
    })

    it('>에서 BigInt와 문자열을 비교하면 문자열을 숫자가 아니라 BigInt로 바꾼다', () => {
      // 2^53 + 1은 숫자로 바꾸면 2^53으로 반올림되어 false, BigInt로 바꾸면 true
      expect(runInNewContext("'9007199254740993' > 9007199254740992n")).toBe(true)
      expect(runInNewContext("Number('9007199254740993') > 9007199254740992")).toBe(false)
    })
  })

  describe('변환 표(conversion-table.ts)는 암묵적·명시적 변환의 실제 결과와 같다', () => {
    it('표에 중복된 행이 없다', () => {
      const sources = conversionTable.map((row) => row.source)
      expect(sources.filter((s, i) => sources.indexOf(s) !== i)).toEqual([])
    })

    // 문자열 결과는 JSON.stringify 표기, 숫자·불리언은 String(...)
    function evalString(source: string): string {
      return JSON.stringify(runInNewContext(source))
    }
    function evalPlain(source: string): string {
      return String(runInNewContext(source))
    }

    describe.each(conversionTable)('$source', (row) => {
      it('암묵적 변환: 문자열로 (`(x) + ""`)', () => {
        expect(evalString(`(${row.source}) + ''`)).toBe(row.toString)
      })
      it('암묵적 변환: 숫자로 (`+(x)`)', () => {
        expect(evalPlain(`+(${row.source})`)).toBe(row.toNumber)
      })
      it('암묵적 변환: 불리언으로 (`!!(x)`)', () => {
        expect(evalPlain(`!!(${row.source})`)).toBe(row.toBoolean)
      })
      it('명시적 변환: String(x)', () => {
        expect(evalString(`String(${row.source})`)).toBe(row.toString)
      })
      it('명시적 변환: Number(x)', () => {
        expect(evalPlain(`Number(${row.source})`)).toBe(row.toNumber)
      })
      it('명시적 변환: Boolean(x)', () => {
        expect(evalPlain(`Boolean(${row.source})`)).toBe(row.toBoolean)
      })
    })
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 ①~⑤(assertScenarioInvariants) + ⑥ 상태 무결성 + 소스 대조 검사 + 의미 검사 + 바인딩 값 검사

function duplicates(items: string[]): string[] {
  return items.filter((item, i) => items.indexOf(item) !== i)
}

// 실제 값(vm이 돌려준 값)을 Val 표기로 바꾼다. Val ↔ 실제 값 비교는 항상 이 헬퍼를 거친다.
// typeof와 String(값)만 쓰므로 문자열은 내용 그대로 비교된다.
function toVal(actual: unknown): Val {
  return { type: typeof actual as Val['type'], display: String(actual) }
}

// 소스를 vm으로 실행한 값을 Val로 얻는다.
function evalVal(source: string): Val {
  return toVal(runInNewContext(source))
}

// 소스 표기: 문자열은 JSON.stringify, 나머지는 display
function lit(val: Val): string {
  return val.type === 'string' ? JSON.stringify(val.display) : val.display
}

const stringifyVal = (v: Val): string => `${v.type} ${JSON.stringify(v.display)}`

function expectSameVal(actual: Val | undefined, expected: Val, message: string): void {
  expect(actual === undefined ? undefined : stringifyVal(actual), message).toBe(
    stringifyVal(expected),
  )
}

function expectedRule(op: Operation): Rule {
  const { operator, left, right } = op
  if (operator === '+') {
    return left.value.type === 'string' || right.value.type === 'string' ? 'concat' : 'add'
  }
  if (operator === '-') return 'numeric'
  return left.value.type === 'string' && right.value.type === 'string'
    ? 'string-compare'
    : 'numeric-compare'
}

function expectedVia(rule: Rule, val: Val): 'ToString' | 'ToNumber' | undefined {
  switch (rule) {
    case 'concat':
      return val.type === 'string' ? undefined : 'ToString'
    case 'add':
    case 'numeric':
    case 'numeric-compare':
      return val.type === 'number' ? undefined : 'ToNumber'
    case 'string-compare':
      return undefined
  }
}

function sourceLines(source: string, line: { from: number; to: number }): string {
  return source
    .split('\n')
    .slice(line.from - 1, line.to)
    .join('\n')
}

// `const a = <식>;` 한 줄에서 변수 이름과 초기화 식을 꺼낸다.
function parseDeclaration(lineText: string): { name: string; init: string } | undefined {
  const m = /^const (\w+) = (.+);$/.exec(lineText.trim())
  return m ? { name: m[1], init: m[2] } : undefined
}

// 바인딩 값 검사용: 예제 원문 끝에 probe를 덧붙여 실제 값을 얻는다.
function actualBindings(source: string, names: string[]): Record<string, Val> {
  const probe = `${source}\nconsole.log(JSON.stringify([${names
    .map((n) => `[typeof ${n}, ${n}]`)
    .join(', ')}]))`
  const lines = runExample(probe)
  const pairs = JSON.parse(lines[lines.length - 1]) as [string, unknown][]
  const result: Record<string, Val> = {}
  names.forEach((n, i) => {
    const [t, v] = pairs[i]
    result[n] = { type: t as Val['type'], display: String(v) }
  })
  return result
}

const declaredNames: Record<string, string[]> = {
  'plus-order': ['a', 'b'],
  'numeric-mix': ['c', 'd'],
  compare: ['e', 'f'],
}

// 한 단계의 피연산자 검사: 소스 대조(code → value), 기대 변환
function assertOperand(op: Operation, side: 'left' | 'right', rule: Rule): void {
  const operand: Operand = op[side]
  const name = `연산 "${op.code}"의 ${side} 피연산자 "${operand.code}"`

  // 소스 대조: 피연산자 소스를 직접 실행한 값 = value
  expectSameVal(operand.value, evalVal(operand.code), `${name}: value가 소스 실행 값과 다릅니다`)

  // 기대 변환: converted 유무·via·to
  const via = expectedVia(rule, operand.value)
  expect(operand.converted?.via, `${name}: 변환 종류(via)가 기대와 다릅니다 (rule=${rule})`).toBe(
    via,
  )
  if (via && operand.converted) {
    const fn = via === 'ToString' ? 'String' : 'Number'
    expectSameVal(
      operand.converted.to,
      evalVal(`${fn}(${lit(operand.value)})`),
      `${name}: converted.to가 ${fn}(값)의 실제 결과와 다릅니다`,
    )
  }
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않는다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
  })

  it('시나리오는 plus-order, numeric-mix, compare 순서다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['plus-order', 'numeric-mix', 'compare'])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const steps = scenario.steps

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('첫 단계는 line이 없는 빈 상태이고 output은 모두 문자열 배열이다', () => {
    const first = steps[0]
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ bindings: [] })
    expect(first.output).toEqual([])
    for (const step of steps) expect(Array.isArray(step.output)).toBe(true)
  })

  const stepCases = steps.map((step, i) => [i + 1, step.title, step.state] as const)

  it.each(stepCases)('단계 %i "%s": 상태 무결성 (⑥)', (_n, _title, state: ConvState) => {
    expect(duplicates(state.bindings.map((b) => b.name)), '바인딩 이름이 중복됩니다').toEqual([])
    const op = state.operation
    if (!op) return
    // Operation.code 구조식
    expect(op.code, '연산 code가 `${left.code} ${operator} ${right.code}`와 다릅니다').toBe(
      `${op.left.code} ${op.operator} ${op.right.code}`,
    )
  })

  it('연산이 있는 단계는 line이 있고, 연산 code가 그 줄의 소스에 부분 문자열로 존재한다', () => {
    const src = source()
    steps.forEach((step, i) => {
      const op = step.state.operation
      if (!op) return
      expect(step.line, `단계 ${i + 1}: 연산이 있는데 line이 없습니다`).toBeDefined()
      expect(
        sourceLines(src, step.line!),
        `단계 ${i + 1}: 연산 "${op.code}"가 line의 소스 줄에 없습니다`,
      ).toContain(op.code)
    })
  })

  it('출력이 늘어난 단계에는 operation이 없다', () => {
    let previous = 0
    steps.forEach((step, i) => {
      const length = step.output?.length ?? 0
      if (length > previous) {
        expect(
          step.state.operation,
          `단계 ${i + 1}: 출력 단계에 operation이 있습니다`,
        ).toBeUndefined()
      }
      previous = length
    })
  })

  it('연산은 A 단계(result 없음) 다음에 같은 연산의 B 단계(result 있음)가 온다', () => {
    steps.forEach((step, i) => {
      const op = step.state.operation
      if (!op) return
      if (op.result === undefined) {
        const next = steps[i + 1]?.state.operation
        expect(next, `단계 ${i + 1}(A) 다음 단계에 연산이 없습니다`).toBeDefined()
        expect(next!.result, `단계 ${i + 2}는 B 단계라 result가 있어야 합니다`).toBeDefined()
        expect(
          { ...next!, result: undefined },
          `단계 ${i + 2}(B)의 연산이 단계 ${i + 1}(A)와 result 외에 다릅니다`,
        ).toEqual({ ...op, result: undefined })
      } else {
        const prev = steps[i - 1]?.state.operation
        expect(prev, `단계 ${i + 1}(B) 앞 단계에 연산이 없습니다`).toBeDefined()
        expect(prev!.result, `단계 ${i}는 A 단계라 result가 없어야 합니다`).toBeUndefined()
      }
    })
  })

  it('changed는 그 단계에 새로 생긴 바인딩에만 붙는다', () => {
    let previous = new Set<string>()
    steps.forEach((step, i) => {
      const names = new Set(step.state.bindings.map((b) => b.name))
      for (const b of step.state.bindings) {
        expect(
          Boolean(b.changed),
          `단계 ${i + 1}: ${b.name}의 changed가 새로 생김 여부와 다릅니다`,
        ).toBe(!previous.has(b.name))
      }
      previous = names
    })
  })

  it('바인딩은 한 줄의 마지막 연산 B 단계에서만 생기고, 그 값은 연산 result와 같다', () => {
    const src = source()
    let previous = new Set<string>()
    const declared = new Set<string>()
    steps.forEach((step, i) => {
      const created = step.state.bindings.filter((b) => !previous.has(b.name))
      previous = new Set(step.state.bindings.map((b) => b.name))
      const op = step.state.operation
      const decl = step.line ? parseDeclaration(sourceLines(src, step.line)) : undefined
      const isLast = Boolean(op && op.result !== undefined && decl && op.code === decl.init)
      if (!isLast) {
        expect(
          created.map((b) => b.name),
          `단계 ${i + 1}: 줄의 마지막 연산 결과 단계가 아닌데 바인딩이 생겼습니다`,
        ).toEqual([])
        return
      }
      expect(
        created.map((b) => b.name),
        `단계 ${i + 1}: 마지막 연산 결과 단계에서 "${decl!.name}"가 생겨야 합니다`,
      ).toEqual([decl!.name])
      expectSameVal(
        created[0].value,
        op!.result!,
        `단계 ${i + 1}: ${decl!.name}의 값이 연산 result와 다릅니다`,
      )
      declared.add(decl!.name)
    })
    // 소스의 모든 const 선언이 시나리오에서 한 번씩 초기화된다.
    const sourceNames = src
      .split('\n')
      .map((l) => parseDeclaration(l)?.name)
      .filter((n): n is string => n !== undefined)
    expect([...declared]).toEqual(sourceNames)
  })

  describe('소스 대조 검사 (시나리오가 적은 값을 믿지 않고 소스를 직접 실행)', () => {
    it('모든 Operand.code를 실행한 값이 operand.value와 같다', () => {
      steps.forEach((step) => {
        const op = step.state.operation
        if (!op) return
        for (const side of ['left', 'right'] as const) {
          expectSameVal(
            op[side].value,
            evalVal(op[side].code),
            `연산 "${op.code}"의 ${side} "${op[side].code}": value가 소스 실행 값과 다릅니다`,
          )
        }
      })
    })

    it('result가 있는 모든 Operation.code를 실행한 값이 result와 같다', () => {
      steps.forEach((step) => {
        const op = step.state.operation
        if (!op || op.result === undefined) return
        expectSameVal(
          op.result,
          evalVal(op.code),
          `연산 "${op.code}": result가 소스 실행 값과 다릅니다`,
        )
      })
    })

    it('연속성: left.code가 직전 연산의 code와 같으면 left.value는 직전 result와 같다', () => {
      let last: Operation | undefined
      steps.forEach((step) => {
        const op = step.state.operation
        if (!op) return
        if (last && op.left.code === last.code) {
          expectSameVal(
            op.left.value,
            last.result!,
            `연산 "${op.code}": left.value가 직전 연산 "${last.code}"의 result와 다릅니다`,
          )
        }
        if (op.result !== undefined) last = op
      })
    })

    it('한 줄의 마지막 연산 code는 그 줄 선언의 초기화 식 전체와 같다', () => {
      const src = source()
      const lastOpByLine = new Map<number, string>()
      steps.forEach((step) => {
        const op = step.state.operation
        if (step.line && op?.result !== undefined) lastOpByLine.set(step.line.from, op.code)
      })
      src.split('\n').forEach((text, i) => {
        const decl = parseDeclaration(text)
        if (!decl) return
        expect(
          lastOpByLine.get(i + 1),
          `${i + 1}번 줄: 마지막 연산 code가 초기화 식 "${decl.init}"와 다릅니다`,
        ).toBe(decl.init)
      })
    })
  })

  describe('의미 검사 (규칙·변환·결과)', () => {
    it('rule이 피연산자 타입에서 계산한 기대 규칙과 같다', () => {
      steps.forEach((step) => {
        const op = step.state.operation
        if (!op) return
        expect(op.rule, `연산 "${op.code}": rule이 기대와 다릅니다`).toBe(expectedRule(op))
      })
    })

    it('변환(converted)의 유무·via·to가 기대 변환 및 String(v)/Number(v)의 실제 결과와 같다', () => {
      steps.forEach((step) => {
        const op = step.state.operation
        if (!op) return
        assertOperand(op, 'left', op.rule)
        assertOperand(op, 'right', op.rule)
      })
    })

    it('result가 `left.value operator right.value`를 실제로 실행한 값과 같다', () => {
      steps.forEach((step) => {
        const op = step.state.operation
        if (!op || op.result === undefined) return
        expectSameVal(
          op.result,
          evalVal(`${lit(op.left.value)} ${op.operator} ${lit(op.right.value)}`),
          `연산 "${op.code}": result가 피연산자 값으로 실행한 결과와 다릅니다`,
        )
      })
    })
  })

  it('마지막 단계의 바인딩 값이 예제 실제 실행 결과와 같다', () => {
    const src = source()
    const names = declaredNames[scenario.id]
    const actual = actualBindings(src, names)
    const last = steps[steps.length - 1].state

    expect(
      last.bindings.map((b) => b.name),
      '마지막 단계의 바인딩 이름이 예제가 선언한 변수와 다릅니다',
    ).toEqual(names)
    for (const b of last.bindings) {
      expectSameVal(b.value, actual[b.name], `${b.name}의 값이 실제 실행 결과와 다릅니다`)
      expect(src, `${b.name}의 선언 키워드가 예제와 다릅니다`).toMatch(
        new RegExp(`^${b.declaredWith} ${b.name}\\b`, 'm'),
      )
    }
  })
})
