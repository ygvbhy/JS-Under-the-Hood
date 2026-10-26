import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type Check, type EvalState, type Evaluation, type Val } from './scenarios'

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
  it.each(['a ?? b || c', 'a || b ?? c', 'a ?? b && c'])(
    '`%s`는 괄호 없이 섞을 수 없어 SyntaxError다',
    (source) => {
      expect(errorNameOf(() => new Script(source))).toBe('SyntaxError')
    },
  )

  it('`(a ?? b) || c`처럼 괄호로 묶으면 SyntaxError가 아니다', () => {
    expect(errorNameOf(() => new Script('(a ?? b) || c'))).toBeUndefined()
  })

  it('?. 없이 null의 프로퍼티를 읽으면 TypeError다', () => {
    expect(errorNameOf(() => runInNewContext('const guest = null; guest.profile'))).toBe(
      'TypeError',
    )
  })

  it('?.는 바로 왼쪽 값만 검사한다: user?.missing.age는 TypeError다', () => {
    expect(errorNameOf(() => runInNewContext('const user = {}; user?.missing.age'))).toBe(
      'TypeError',
    )
  })

  it('guest?.profile.age는 오류 없이 undefined다', () => {
    expect(errorNameOf(() => runInNewContext('const guest = null; guest?.profile.age'))).toBe(
      undefined,
    )
    expect(runInNewContext('const guest = null; guest?.profile.age')).toBeUndefined()
  })

  it('??는 false를 null·undefined로 보지 않아 왼쪽 false가 결과다', () => {
    expect(runInNewContext("false ?? 'x'")).toBe(false)
  })

  it('?.는 왼쪽이 null이면 뒤의 함수 호출과 그 인수를 평가하지 않는다', () => {
    const source =
      'const g = null; let called = false; const r = g?.f((called = true)); [r, called]'
    const [result, called] = runInNewContext(source) as [unknown, boolean]
    expect(result).toBeUndefined()
    expect(called).toBe(false)
  })

  it('&&는 왼쪽이 null이면 왼쪽 값 null을 그대로 돌려준다(?.와 대비)', () => {
    expect(runInNewContext("null && 'x'")).toBeNull()
  })

  it('null?.x의 결과는 null이 아니라 undefined다', () => {
    const result = runInNewContext('const g = null; g?.x')
    expect(result).toBeUndefined()
    expect(result).not.toBeNull()
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 ①~⑤(assertScenarioInvariants) + ⑥ 상태 무결성 + 의미 검사 + 바인딩 값 검사

function duplicates(items: string[]): string[] {
  return items.filter((item, i) => items.indexOf(item) !== i)
}

// ToBoolean이 false를 돌려주는 값 중 Val 표기로 나타낼 수 있는 것(0n은 시나리오에 없다).
function isTruthy(val: Val): boolean {
  switch (val.type) {
    case 'undefined':
    case 'null':
      return false
    case 'boolean':
      return val.display !== 'false'
    case 'number':
      return !['0', '-0', 'NaN'].includes(val.display)
    case 'string':
      return val.display !== ''
    case 'object':
      return true
  }
}

function isNullish(val: Val): boolean {
  return val.type === 'null' || val.type === 'undefined'
}

function expectedCheck(operator: Evaluation['operator'], val: Val): Check {
  if (operator === '&&' || operator === '||') return isTruthy(val) ? 'truthy' : 'falsy'
  return isNullish(val) ? 'nullish' : 'not-nullish'
}

// 상태 무결성: 바인딩 이름 중복 없음, evaluated <=> value, skipped 뒤에 evaluated 없음,
// result가 있으면 pending 조각 없음
function assertStateIntegrity(state: EvalState): void {
  expect(duplicates(state.bindings.map((b) => b.name)), '바인딩 이름이 중복됩니다').toEqual([])
  const ev = state.evaluation
  if (!ev) return

  ev.parts.forEach((part) => {
    if (part.status === 'evaluated') {
      expect(part.value, `조각 "${part.code}"는 evaluated인데 value가 없습니다`).toBeDefined()
    } else {
      expect(
        part.value,
        `조각 "${part.code}"는 ${part.status}인데 value가 있습니다`,
      ).toBeUndefined()
    }
  })

  const firstSkipped = ev.parts.findIndex((p) => p.status === 'skipped')
  if (firstSkipped !== -1) {
    const after = ev.parts.slice(firstSkipped + 1).filter((p) => p.status === 'evaluated')
    expect(
      after.map((p) => p.code),
      `skipped 조각 뒤에 evaluated 조각이 있습니다`,
    ).toEqual([])
  }

  if (ev.result !== undefined) {
    const stillPending = ev.parts.filter((p) => p.status === 'pending').map((p) => p.code)
    expect(stillPending, 'result가 있는데 pending 조각이 남아 있습니다').toEqual([])
  }
}

// 가장 앞 조각부터 순서대로 평가한다: pending 조각 뒤에 evaluated 조각이 올 수 없다.
function assertLeftToRight(ev: Evaluation): void {
  const firstPending = ev.parts.findIndex((p) => p.status === 'pending')
  if (firstPending === -1) return
  const later = ev.parts.slice(firstPending + 1).filter((p) => p.status === 'evaluated')
  expect(
    later.map((p) => p.code),
    'pending 조각 뒤에 evaluated 조각이 있습니다',
  ).toEqual([])
}

// "나머지 조각" 묶음이 전부 pending(판정만 보여 주는 단계)이거나 전부 skipped인지 검사한다.
function assertRestPendingOrSkipped(
  rest: Evaluation['parts'],
  where: string,
): 'pending' | 'skipped' {
  const statuses = new Set(rest.map((p) => p.status))
  expect(statuses.size, `${where}: 남은 조각이 없습니다`).toBeGreaterThan(0)
  expect(
    statuses.size === 1 && (statuses.has('pending') || statuses.has('skipped')),
    `${where}: 멈춤 이후 조각은 전부 pending이거나 전부 skipped여야 합니다`,
  ).toBe(true)
  return statuses.has('pending') ? 'pending' : 'skipped'
}

// 의미 검사: 시각화가 명세 동작(&&, ||, ??, ?.의 평가 규칙)과 어긋나지 않는지 검사한다.
function assertEvaluationSemantics(ev: Evaluation): void {
  const { operator, parts } = ev
  const name = `${operator} 식 "${ev.code}"`
  assertLeftToRight(ev)

  // 판정 일치: check가 있는 조각은 evaluated이고, check가 연산자별 계산값과 같다.
  for (const part of parts) {
    if (part.check === undefined) continue
    expect(part.status, `${name}: check가 있는 조각 "${part.code}"는 evaluated여야 합니다`).toBe(
      'evaluated',
    )
    expect(part.check, `${name}: 조각 "${part.code}"의 check가 계산값과 다릅니다`).toBe(
      expectedCheck(operator, part.value!),
    )
  }

  if (operator === '?.') {
    parts.forEach((part, k) => {
      if (!part.code.startsWith('?.')) return
      const prev = parts[k - 1]
      expect(prev, `${name}: "${part.code}" 앞에 조각이 없습니다`).toBeDefined()
      if (prev.status === 'evaluated') {
        // 판정에 쓰인 조각(바로 왼쪽)에는 check가 있어야 한다.
        expect(prev.check, `${name}: "${prev.code}"에 check가 없습니다`).toBeDefined()
      }
      if (prev.status !== 'evaluated') return
      const rest = parts.slice(k)
      if (isNullish(prev.value!)) {
        const kind = assertRestPendingOrSkipped(rest, `${name} ("${part.code}"부터)`)
        if (kind === 'skipped') {
          expect(ev.result, `${name}: 건너뛴 ?. 체인의 result는 undefined 값이어야 합니다`).toEqual(
            {
              type: 'undefined',
              display: 'undefined',
            },
          )
        }
      } else {
        expect(
          ['evaluated', 'pending'],
          `${name}: "${prev.code}"가 null·undefined가 아니면 "${part.code}"는 평가되어야 합니다`,
        ).toContain(part.status)
      }
    })
    const anySkipped = parts.some((p) => p.status === 'skipped')
    if (ev.result !== undefined && !anySkipped) {
      expect(ev.result, `${name}: result가 마지막 조각의 값이 아닙니다`).toEqual(
        parts[parts.length - 1].value,
      )
    }
    if (anySkipped) {
      expect(ev.result, `${name}: 건너뛴 조각이 있는데 result가 없습니다`).toBeDefined()
    }
    return
  }

  // &&, ||, ??: 왼쪽부터 평가된 조각 i(마지막 조각 제외)
  const continues = (val: Val): boolean =>
    operator === '&&' ? isTruthy(val) : operator === '||' ? !isTruthy(val) : isNullish(val)

  parts.slice(0, -1).forEach((part, i) => {
    if (part.status !== 'evaluated') return
    expect(part.check, `${name}: 판정에 쓰인 조각 "${part.code}"에 check가 없습니다`).toBeDefined()
    const next = parts[i + 1]
    if (continues(part.value!)) {
      expect(
        ['evaluated', 'pending'],
        `${name}: "${part.code}"는 오른쪽을 평가해야 하는 값인데 "${next.code}"가 ${next.status}입니다`,
      ).toContain(next.status)
    } else {
      const rest = parts.slice(i + 1)
      const kind = assertRestPendingOrSkipped(rest, `${name} ("${part.code}" 이후)`)
      if (kind === 'skipped') {
        expect(
          ev.result,
          `${name}: 멈춤 조건이면 result는 "${part.code}"의 값이어야 합니다`,
        ).toEqual(part.value)
      }
    }
  })

  if (ev.result !== undefined && parts.every((p) => p.status === 'evaluated')) {
    expect(ev.result, `${name}: result가 마지막 조각의 값이 아닙니다`).toEqual(
      parts[parts.length - 1].value,
    )
  }
}

// 바인딩 값 검사용: 예제 원문 끝에 probe를 덧붙여 실제 값을 얻는다.
// undefined가 JSON에서 null로 바뀌는 문제는 typeof로 구분한다.
function actualBindings(source: string, names: string[]): Record<string, Val> {
  const probe = `${source}\nconsole.log(JSON.stringify([${names
    .map((n) => `[typeof ${n}, ${n}]`)
    .join(', ')}]))`
  const lines = runExample(probe)
  const pairs = JSON.parse(lines[lines.length - 1]) as [string, unknown][]
  const result: Record<string, Val> = {}
  names.forEach((n, i) => {
    const [t, v] = pairs[i]
    if (t === 'object') {
      result[n] = v === null ? { type: 'null', display: 'null' } : { type: 'object', display: '' }
    } else if (t === 'undefined') {
      result[n] = { type: 'undefined', display: 'undefined' }
    } else {
      result[n] = { type: t as Val['type'], display: String(v) }
    }
  })
  return result
}

const declaredNames: Record<string, string[]> = {
  'logical-result': ['a', 'b', 'c', 'd'],
  'skip-right': ['x', 'y', 'z'],
  nullish: ['count', 'title', 'memo'],
  'optional-chaining': ['user', 'guest'],
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않는다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
  })

  it('시나리오는 logical-result, skip-right, nullish, optional-chaining 순서다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'logical-result',
      'skip-right',
      'nullish',
      'optional-chaining',
    ])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    const source = readFileSync(join(examplesDir, example!.file), 'utf8')
    assertScenarioInvariants(scenario, example!, source)
  })

  it('첫 단계는 line이 없는 빈 상태이고 output은 모두 문자열 배열이다', () => {
    const first = scenario.steps[0]
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ bindings: [] })
    for (const step of scenario.steps) expect(Array.isArray(step.output)).toBe(true)
  })

  const stepCases = scenario.steps.map((step, i) => [i + 1, step.title, step.state] as const)

  it.each(stepCases)('단계 %i "%s": 상태 무결성 (⑥)', (_n, _title, state) => {
    assertStateIntegrity(state)
  })

  it.each(stepCases)('단계 %i "%s": 명세 동작과 일치한다 (의미 검사)', (_n, _title, state) => {
    if (state.evaluation) assertEvaluationSemantics(state.evaluation)
  })

  it('마지막 단계의 바인딩 값이 예제 실제 실행 결과와 같다', () => {
    const source = readFileSync(join(examplesDir, example!.file), 'utf8')
    const names = declaredNames[scenario.id]
    const actual = actualBindings(source, names)
    const last = scenario.steps[scenario.steps.length - 1].state

    expect(
      last.bindings.map((b) => b.name),
      '마지막 단계의 바인딩 이름이 예제가 선언한 변수와 다릅니다',
    ).toEqual(names)
    for (const b of last.bindings) {
      expect(b.value.type, `${b.name}의 type이 실제 실행 결과와 다릅니다`).toBe(actual[b.name].type)
      // 객체는 줄여 쓴 표기이므로 display를 비교하지 않는다.
      if (b.value.type !== 'object') {
        expect(b.value.display, `${b.name}의 display가 실제 실행 결과와 다릅니다`).toBe(
          actual[b.name].display,
        )
      }
      expect(source, `${b.name}의 선언 키워드가 예제와 다릅니다`).toMatch(
        new RegExp(`^${b.declaredWith} ${b.name}\\b`, 'm'),
      )
    }
  })

  it('changed는 그 단계에 새로 생긴 바인딩에만 붙는다', () => {
    let previous = new Set<string>()
    scenario.steps.forEach((step, i) => {
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
})
