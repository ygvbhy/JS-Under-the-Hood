import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import {
  scenarios,
  type Comparison,
  type EqState,
  type Round,
  type Rule,
  type Val,
} from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')

describe('본문 주장 검증', () => {
  describe('본문 서술의 근거', () => {
    it.each([
      ["0 == '0'", true],
      ["false == ''", true],
      ["false == 'false'", false],
      ["true == '1'", true],
      ['true == 2', false],
      ['null == false', false],
      ['undefined == 0', false],
      ["undefined == ''", false],
      ["' 1 ' == 1", true],
      ["'0' ? 'truthy' : 'falsy'", 'truthy'],
    ])('`%s` → %j', (source, expected) => {
      expect(runInNewContext(source)).toBe(expected)
    })
  })

  it("`==`는 전이적이지 않다(명세 Note 2): `0 == ''`, `0 == '0'`은 true인데 `'' == '0'`은 false", () => {
    expect(runInNewContext("0 == ''")).toBe(true)
    expect(runInNewContext("0 == '0'")).toBe(true)
    expect(runInNewContext("'' == '0'")).toBe(false)
  })

  describe('시나리오에 쓰는 `==` 식은 좌우를 바꿔도 결과가 같다(명세 Note 1)', () => {
    it.each([
      ['0', "''"],
      ["'0'", "''"],
      ['false', "'0'"],
      ['true', "'true'"],
      ['null', 'undefined'],
      ['null', '0'],
    ])('`%s == %s`', (a, b) => {
      expect(runInNewContext(`${a} == ${b}`)).toBe(runInNewContext(`${b} == ${a}`))
    })
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 ①~⑤(assertScenarioInvariants) + 상태 구조 + 라운드 연결 + 소스 대조 + 의미 검사 + 바인딩 값 검사

function duplicates(items: string[]): string[] {
  return items.filter((item, i) => items.indexOf(item) !== i)
}

// 실제 값(vm이 돌려준 값)을 Val 표기로 바꾼다. typeof null은 'object'라 따로 처리한다.
function toVal(actual: unknown): Val {
  if (actual === null) return { type: 'null', display: 'null' }
  return { type: typeof actual as Val['type'], display: String(actual) }
}

function evalVal(source: string): Val {
  return toVal(runInNewContext(source))
}

// 소스 표기: 문자열은 JSON.stringify, 나머지는 display(NaN 포함)
function lit(val: Val): string {
  return val.type === 'string' ? JSON.stringify(val.display) : val.display
}

const stringifyVal = (v: Val): string => `${v.type} ${JSON.stringify(v.display)}`

function expectSameVal(actual: Val | undefined, expected: Val, message: string): void {
  expect(actual === undefined ? undefined : stringifyVal(actual), message).toBe(
    stringifyVal(expected),
  )
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

// 두 값의 타입에서 명세 순서대로 기대 규칙을 계산한다(숫자·문자열 규칙이 불리언 규칙보다 먼저).
function expectedRule(operator: Comparison['operator'], left: Val, right: Val): Rule {
  if (operator === '===') return left.type === right.type ? 'same-type' : 'strict-type-differs'
  if (left.type === right.type) return 'same-type'
  const types = [left.type, right.type]
  if (types.includes('null') && types.includes('undefined')) return 'null-undefined'
  if (types.includes('number') && types.includes('string')) return 'string-to-number'
  if (types.includes('boolean')) return 'boolean-to-number'
  return 'no-rule'
}

// 규칙에 따라 변환되어야 하는 쪽
function expectedSide(rule: Rule, round: Round): 'left' | 'right' | undefined {
  if (rule === 'string-to-number') return round.left.type === 'string' ? 'left' : 'right'
  if (rule === 'boolean-to-number') return round.left.type === 'boolean' ? 'left' : 'right'
  return undefined
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

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않는다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
  })

  it('시나리오는 number-string, boolean, null-undefined 순서다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['number-string', 'boolean', 'null-undefined'])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const steps = scenario.steps

  // 비교가 있는 단계와 그 인덱스
  const cmpSteps = () =>
    steps.flatMap((step, i) =>
      step.state.comparison ? [{ step, i, cmp: step.state.comparison }] : [],
    )

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

  describe('상태 구조', () => {
    it('바인딩 이름이 단계마다 중복되지 않는다', () => {
      steps.forEach((step, i) => {
        expect(
          duplicates(step.state.bindings.map((b) => b.name)),
          `단계 ${i + 1}: 바인딩 이름이 중복됩니다`,
        ).toEqual([])
      })
    })

    it('changed는 그 단계에 새로 생긴 바인딩에만 붙는다', () => {
      let previous = new Set<string>()
      steps.forEach((step, i) => {
        for (const b of step.state.bindings) {
          expect(
            Boolean(b.changed),
            `단계 ${i + 1}: ${b.name}의 changed가 새로 생김 여부와 다릅니다`,
          ).toBe(!previous.has(b.name))
        }
        previous = new Set(step.state.bindings.map((b) => b.name))
      })
    })

    it('한 비교 안에서 rounds는 단계마다 하나씩 늘고 앞부분은 그대로이며, 결과 단계의 rounds는 직전 단계와 같다', () => {
      let prev: Comparison | undefined
      steps.forEach((step, i) => {
        const cmp = step.state.comparison
        if (cmp && prev && prev.code === cmp.code && prev.result === undefined) {
          if (cmp.result === undefined) {
            expect(cmp.rounds.length, `단계 ${i + 1}: 라운드가 하나 늘어야 합니다`).toBe(
              prev.rounds.length + 1,
            )
            expect(
              cmp.rounds.slice(0, prev.rounds.length),
              `단계 ${i + 1}: 앞 라운드가 달라졌습니다`,
            ).toEqual(prev.rounds)
          } else {
            expect(cmp.rounds, `단계 ${i + 1}: 결과 단계의 rounds가 직전 단계와 다릅니다`).toEqual(
              prev.rounds,
            )
          }
        } else if (cmp) {
          // 새 비교의 첫 단계: 라운드 1개, 결과 없음
          expect(cmp.rounds.length, `단계 ${i + 1}: 새 비교는 라운드 1개로 시작합니다`).toBe(1)
          expect(cmp.result, `단계 ${i + 1}: 새 비교의 첫 단계에 result가 있습니다`).toBeUndefined()
        }
        prev = cmp
      })
    })

    it('출력이 늘어난 단계에는 comparison이 없다', () => {
      let previous = 0
      steps.forEach((step, i) => {
        const length = step.output?.length ?? 0
        if (length > previous) {
          expect(
            step.state.comparison,
            `단계 ${i + 1}: 출력 단계에 comparison이 있습니다`,
          ).toBeUndefined()
        }
        previous = length
      })
    })

    it('comparison이 있는 단계는 line이 있고, comparison.code는 그 줄 선언의 초기화 식과 같다', () => {
      const src = source()
      for (const { step, i, cmp } of cmpSteps()) {
        expect(step.line, `단계 ${i + 1}: comparison이 있는데 line이 없습니다`).toBeDefined()
        const decl = parseDeclaration(sourceLines(src, step.line!))
        expect(cmp.code, `단계 ${i + 1}: code가 줄의 초기화 식과 다릅니다`).toBe(decl?.init)
      }
    })

    it('바인딩은 결과 단계에서만 생기고, 그 이름은 줄 선언과 같으며 값은 result와 같다', () => {
      const src = source()
      let previous = new Set<string>()
      const declared: string[] = []
      steps.forEach((step, i) => {
        const created = step.state.bindings.filter((b) => !previous.has(b.name))
        previous = new Set(step.state.bindings.map((b) => b.name))
        const cmp = step.state.comparison
        if (!cmp || cmp.result === undefined) {
          expect(
            created.map((b) => b.name),
            `단계 ${i + 1}: 결과 단계가 아닌데 바인딩이 생겼습니다`,
          ).toEqual([])
          return
        }
        const decl = parseDeclaration(sourceLines(src, step.line!))!
        expect(
          created.map((b) => b.name),
          `단계 ${i + 1}: 결과 단계에서 "${decl.name}"가 생겨야 합니다`,
        ).toEqual([decl.name])
        expectSameVal(
          created[0].value,
          cmp.result,
          `단계 ${i + 1}: ${decl.name}의 값이 result와 다릅니다`,
        )
        declared.push(decl.name)
      })
      const sourceNames = src
        .split('\n')
        .map((l) => parseDeclaration(l)?.name)
        .filter((n): n is string => n !== undefined)
      expect(declared).toEqual(sourceNames)
    })
  })

  describe('라운드 연결', () => {
    it('converted가 있는 라운드 다음 라운드는 변환한 쪽만 converted.to로 바뀐 값이고, 마지막 라운드에는 converted가 없다', () => {
      for (const { cmp } of cmpSteps()) {
        const { rounds } = cmp
        rounds.forEach((r, k) => {
          const name = `비교 "${cmp.code}" 라운드 ${k + 1}`
          const next = rounds[k + 1]
          if (r.converted) {
            // 비교의 마지막 단계(결과 단계) 기준으로 전체 라운드를 검사하므로 next가 없으면 건너뛴다.
            if (!next) return
            const c = r.converted
            expectSameVal(
              next[c.side],
              c.to,
              `${name}: 다음 라운드의 ${c.side}가 converted.to와 다릅니다`,
            )
            const other = c.side === 'left' ? 'right' : 'left'
            expectSameVal(next[other], r[other], `${name}: 변환하지 않은 ${other}가 바뀌었습니다`)
          } else {
            expect(next, `${name}: 변환이 없는 라운드는 마지막이어야 합니다`).toBeUndefined()
          }
        })
      }
    })

    it('결과가 있는 단계에서 마지막 라운드에는 converted가 없다', () => {
      for (const { cmp } of cmpSteps()) {
        if (cmp.result === undefined) continue
        const last = cmp.rounds[cmp.rounds.length - 1]
        expect(
          last.converted,
          `비교 "${cmp.code}": 마지막 라운드에 converted가 있습니다`,
        ).toBeUndefined()
      }
    })
  })

  describe('소스 대조 검사 (시나리오가 적은 값을 믿지 않고 소스를 직접 실행)', () => {
    it('comparison.code를 operator로 나눈 왼쪽·오른쪽 소스를 실행한 값이 라운드 1의 left·right와 같다', () => {
      for (const { cmp } of cmpSteps()) {
        const parts = cmp.code.split(` ${cmp.operator} `)
        expect(parts.length, `비교 "${cmp.code}": operator로 두 조각으로 나뉘어야 합니다`).toBe(2)
        const r1 = cmp.rounds[0]
        expectSameVal(
          r1.left,
          evalVal(parts[0]),
          `비교 "${cmp.code}": R1 left가 소스 실행 값과 다릅니다`,
        )
        expectSameVal(
          r1.right,
          evalVal(parts[1]),
          `비교 "${cmp.code}": R1 right가 소스 실행 값과 다릅니다`,
        )
      }
    })

    it('result가 있는 모든 comparison.code를 실행한 값이 result와 같다', () => {
      for (const { cmp } of cmpSteps()) {
        if (cmp.result === undefined) continue
        expectSameVal(
          cmp.result,
          evalVal(cmp.code),
          `비교 "${cmp.code}": result가 소스 실행 값과 다릅니다`,
        )
      }
    })
  })

  describe('의미 검사 (규칙·변환·결과)', () => {
    it('각 라운드의 rule이 두 값의 타입에서 계산한 기대 규칙과 같다', () => {
      for (const { cmp } of cmpSteps()) {
        cmp.rounds.forEach((r, k) => {
          expect(r.rule, `비교 "${cmp.code}" 라운드 ${k + 1}: rule이 기대와 다릅니다`).toBe(
            expectedRule(cmp.operator, r.left, r.right),
          )
        })
      }
    })

    it('converted의 유무·side·via와 to가 기대 변환 및 Number(v)의 실제 결과와 같다', () => {
      for (const { cmp } of cmpSteps()) {
        cmp.rounds.forEach((r, k) => {
          const name = `비교 "${cmp.code}" 라운드 ${k + 1}`
          const side = expectedSide(r.rule, r)
          expect(r.converted?.side, `${name}: 변환하는 쪽이 기대와 다릅니다 (rule=${r.rule})`).toBe(
            side,
          )
          if (!side || !r.converted) return
          expect(r.converted.via).toBe('ToNumber')
          expectSameVal(
            r.converted.to,
            evalVal(`Number(${lit(r[side])})`),
            `${name}: converted.to가 Number(값)의 실제 결과와 다릅니다`,
          )
        })
      }
    })

    it('result가 마지막 라운드의 규칙에서 계산한 값과 같다', () => {
      for (const { cmp } of cmpSteps()) {
        if (cmp.result === undefined) continue
        const last = cmp.rounds[cmp.rounds.length - 1]
        const expected =
          last.rule === 'same-type'
            ? evalVal(`${lit(last.left)} === ${lit(last.right)}`)
            : toVal(last.rule === 'null-undefined')
        expectSameVal(
          cmp.result,
          expected,
          `비교 "${cmp.code}": result가 규칙에서 계산한 값과 다릅니다`,
        )
      }
    })
  })

  it('마지막 단계의 바인딩 값이 예제 실제 실행 결과와 같다', () => {
    const src = source()
    const names = src
      .split('\n')
      .map((l) => parseDeclaration(l)?.name)
      .filter((n): n is string => n !== undefined)
    const actual = actualBindings(src, names)
    const last: EqState = steps[steps.length - 1].state

    expect(
      last.bindings.map((b) => b.name),
      '마지막 단계의 바인딩 이름이 예제가 선언한 변수와 다릅니다',
    ).toEqual(names)
    for (const b of last.bindings) {
      expectSameVal(b.value, actual[b.name], `${b.name}의 값이 실제 실행 결과와 다릅니다`)
    }
  })
})
