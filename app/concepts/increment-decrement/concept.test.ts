import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type Binding, type EvalEvent, type IncState, type Val } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')

describe('본문 주장 검증', () => {
  describe('증감 연산자의 피연산자는 값을 넣을 수 있는 대상이어야 한다(Early Errors)', () => {
    it.each(['5++', '++5', '(a + b)++'])('`%s`는 파싱 단계에서 SyntaxError', (source) => {
      expect(() => new Script(source)).toThrow(SyntaxError)
    })

    it('`(a)++`는 파싱에 성공한다', () => {
      expect(() => new Script('let a = 1; (a)++')).not.toThrow()
    })
  })

  it('const 변수에 `++`를 쓰면 TypeError이고 값은 그대로다', () => {
    let name: string | undefined
    try {
      runInNewContext('const k = 1; k++')
    } catch (e) {
      name = (e as Error).name
    }
    expect(name).toBe('TypeError')
    expect(runInNewContext('const k = 1; try { k++ } catch (e) {} k')).toBe(1)
  })

  it('`let n = 5; [n--, n, --n, n]` → [5, 4, 3, 3]', () => {
    const result = runInNewContext('let n = 5; [n--, n, --n, n]')
    expect(JSON.stringify(result)).toBe('[5,4,3,3]')
  })

  it('대입 식은 값을 가진다: `let p; typeof (p = 3)` → "number"', () => {
    expect(runInNewContext('let p; typeof (p = 3)')).toBe('number')
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 상태 구조 + 사건/변수 일관성 + 의미 검사(명세 규칙) + 소스 대조 + 바인딩 값 검사

const n = (v: Val): number => Number(v.display)
const sameVal = (a: Val, b: Val): boolean => a.type === b.type && a.display === b.display
const sameEvent = (a: EvalEvent, b: EvalEvent): boolean => JSON.stringify(a) === JSON.stringify(b)

function duplicates(items: string[]): string[] {
  return items.filter((item, i) => items.indexOf(item) !== i)
}

// 소스 한 줄에서 evaluation.code를 꺼낸다: 선언이면 `= ` 뒤 `;` 앞, 식 문이면 `;` 앞 전체.
function parseLine(lineText: string): { declared?: { kw: string; name: string }; code: string } {
  const t = lineText.trim()
  const decl = /^(let|const) (\w+) = (.+);$/.exec(t)
  if (decl) return { declared: { kw: decl[1], name: decl[2] }, code: decl[3] }
  const stmt = /^(.+);$/.exec(t)
  if (!stmt) throw new Error(`해석할 수 없는 줄: ${lineText}`)
  return { code: stmt[1] }
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않는다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
  })

  it('시나리오는 postfix-prefix, self-assign, operand-order 순서다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['postfix-prefix', 'self-assign', 'operand-order'])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const steps = scenario.steps
  const lineText = (i: number) => {
    const line = steps[i].line
    expect(line, `단계 ${i + 1}: line이 필요합니다`).toBeDefined()
    expect(line!.from, `단계 ${i + 1}: line은 한 줄이어야 합니다`).toBe(line!.to)
    return source().split('\n')[line!.from - 1]
  }
  const topCode = (state: IncState) => state.evaluation?.code
  const lastEvent = (state: IncState) => state.evaluation!.events.at(-1)!
  // 식의 평가가 끝난 단계: 마지막 사건이 그 식 전체의 result
  const isEnd = (state: IncState) => {
    const e = state.evaluation && lastEvent(state)
    return e !== undefined && e.kind === 'result' && e.code === topCode(state)
  }

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('첫 단계는 line이 없는 빈 상태이고 output은 모두 문자열 배열이다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ bindings: [] })
    expect(first.output).toEqual([])
    for (const step of steps) expect(Array.isArray(step.output)).toBe(true)
  })

  describe('상태 구조', () => {
    it('바인딩 이름이 단계마다 중복되지 않고, 선언 키워드가 소스와 같다', () => {
      steps.forEach((step, i) => {
        expect(
          duplicates(step.state.bindings.map((b) => b.name)),
          `단계 ${i + 1}: 바인딩 이름이 중복됩니다`,
        ).toEqual([])
        for (const b of step.state.bindings) {
          expect(
            new RegExp(`^${b.declaredWith} ${b.name}\\b`, 'm').test(source()),
            `단계 ${i + 1}: ${b.name}의 declaredWith가 소스와 다릅니다`,
          ).toBe(true)
        }
      })
    })

    it('changed는 직전 단계와 비교해 계산한 값과 같다(새 이름 created, 값이 다르면 updated, 그대로면 없음)', () => {
      let previous: Binding[] = []
      steps.forEach((step, i) => {
        for (const name of previous.map((b) => b.name)) {
          expect(
            step.state.bindings.some((b) => b.name === name),
            `단계 ${i + 1}: 바인딩 ${name}이 사라졌습니다`,
          ).toBe(true)
        }
        for (const b of step.state.bindings) {
          const before = previous.find((p) => p.name === b.name)
          const expected = !before
            ? 'created'
            : sameVal(before.value, b.value)
              ? undefined
              : 'updated'
          expect(b.changed, `단계 ${i + 1}: ${b.name}의 changed가 계산값과 다릅니다`).toBe(expected)
        }
        previous = step.state.bindings
      })
    })

    it('evaluation.code는 그 단계 줄에서 꺼낸 식과 같고, 출력 단계에는 evaluation이 없다', () => {
      let prevOutput = 0
      steps.forEach((step, i) => {
        const outputLen = (step.output ?? []).length
        if (outputLen > prevOutput) {
          expect(
            step.state.evaluation,
            `단계 ${i + 1}: 출력 단계에 evaluation이 있습니다`,
          ).toBeUndefined()
        }
        prevOutput = outputLen
        if (i === 0) return
        const text = lineText(i)
        if (/^\s*console\./.test(text)) {
          expect(
            step.state.evaluation,
            `단계 ${i + 1}: console 줄에 evaluation이 있습니다`,
          ).toBeUndefined()
        }
        if (step.state.evaluation) {
          expect(step.state.evaluation.code, `단계 ${i + 1}`).toBe(parseLine(text).code)
        }
      })
    })

    it('같은 식을 평가하는 동안 events는 단계마다 하나씩 늘고 앞부분은 그대로이며, 식 전체의 result는 마지막 사건으로만 나온다', () => {
      steps.forEach((step, i) => {
        const ev = step.state.evaluation
        if (!ev) return
        const prev = steps[i - 1].state
        const continues = prev.evaluation !== undefined && !isEnd(prev) && topCode(prev) === ev.code
        if (continues) {
          const before = prev.evaluation!.events
          expect(ev.events.length, `단계 ${i + 1}: 사건이 하나 늘어야 합니다`).toBe(
            before.length + 1,
          )
          before.forEach((e, k) => {
            expect(sameEvent(e, ev.events[k]), `단계 ${i + 1}: 사건 ${k + 1}이 바뀌었습니다`).toBe(
              true,
            )
          })
        } else {
          expect(ev.events.length, `단계 ${i + 1}: 새 식은 사건 하나로 시작합니다`).toBe(1)
        }
        // 식 전체의 result는 마지막 사건으로만
        ev.events.slice(0, -1).forEach((e) => {
          expect(
            e.kind === 'result' && e.code === ev.code,
            `단계 ${i + 1}: 식 전체 result가 끝이 아닙니다`,
          ).toBe(false)
        })
        // 끝나지 않았다면 다음 단계가 이어져야 한다
        if (!isEnd(step.state)) {
          const next = steps[i + 1]?.state
          expect(next?.evaluation?.code, `단계 ${i + 1}: 식의 평가가 끝나지 않고 끊겼습니다`).toBe(
            ev.code,
          )
        }
      })
    })
  })

  describe('사건과 변수의 일관성', () => {
    it('read는 그 시점 변수 값, write는 쓴 값(updated)이고, 변수 값은 write 단계에서만 바뀐다', () => {
      steps.forEach((step, i) => {
        const prevBindings = i > 0 ? steps[i - 1].state.bindings : []
        const ev = step.state.evaluation
        const last = ev?.events.at(-1)
        const find = (name: string) => step.state.bindings.find((b) => b.name === name)
        if (last?.kind === 'read') {
          const b = find(last.name)
          expect(b, `단계 ${i + 1}: 읽은 변수 ${last.name}이 없습니다`).toBeDefined()
          expect(sameVal(b!.value, last.value), `단계 ${i + 1}: 읽은 값이 변수 값과 다릅니다`).toBe(
            true,
          )
        }
        if (last?.kind === 'write') {
          const b = find(last.name)
          expect(b, `단계 ${i + 1}: 쓴 변수 ${last.name}이 없습니다`).toBeDefined()
          expect(sameVal(b!.value, last.value), `단계 ${i + 1}: 쓴 값이 변수 값과 다릅니다`).toBe(
            true,
          )
          expect(b!.changed, `단계 ${i + 1}: write 단계는 updated여야 합니다`).toBe('updated')
        }
        for (const b of step.state.bindings) {
          const before = prevBindings.find((p) => p.name === b.name)
          if (before && !sameVal(before.value, b.value)) {
            expect(
              last?.kind === 'write' && last.name === b.name,
              `단계 ${i + 1}: ${b.name}의 값이 write 단계가 아닌데 바뀌었습니다`,
            ).toBe(true)
          }
        }
      })
    })

    it('새 변수는 evaluation이 없는 선언 단계나 선언문의 마지막 result 단계에서만 생기고, 값은 그 result 값과 같다', () => {
      steps.forEach((step, i) => {
        const prevNames = new Set((i > 0 ? steps[i - 1].state.bindings : []).map((b) => b.name))
        const created = step.state.bindings.filter((b) => !prevNames.has(b.name))
        if (created.length === 0) return
        expect(created.length, `단계 ${i + 1}: 한 단계에 변수 하나만 생깁니다`).toBe(1)
        const text = lineText(i)
        const { declared } = parseLine(text)
        expect(declared?.name, `단계 ${i + 1}: 선언문이 아닌 줄에서 변수가 생겼습니다`).toBe(
          created[0].name,
        )
        if (step.state.evaluation) {
          expect(
            isEnd(step.state),
            `단계 ${i + 1}: 식의 평가가 끝나기 전에 변수가 생겼습니다`,
          ).toBe(true)
          const last = lastEvent(step.state)
          expect(last.kind === 'result' && sameVal(last.value, created[0].value)).toBe(true)
        }
      })
    })
  })

  describe('의미 검사(명세 규칙으로 계산)', () => {
    // 각 평가가 끝난 단계의 events 전체에서 result 사건마다 code 모양별 규칙을 검사한다.
    // 처리하지 못하는 모양은 건너뛰지 않고 실패한다.
    it('result 사건은 증감·대입·덧셈의 규칙과 일치한다', () => {
      const ended = steps.filter((s) => s.state.evaluation && isEnd(s.state))
      expect(ended.length).toBeGreaterThan(0)
      for (const step of ended) {
        const events = step.state.evaluation!.events
        events.forEach((e, k) => {
          if (e.kind !== 'result') return
          const code = e.code
          const where = `\`${code}\``
          const update = /^(\w+)(\+\+|--)$/.exec(code) ?? /^(\+\+|--)(\w+)$/.exec(code)
          const assign = /^(\w+) = (.+)$/.exec(code)
          if (update) {
            const postfix = /^\w/.test(code)
            const name = postfix ? update[1] : update[2]
            const op = postfix ? update[2] : update[1]
            const r = events[k - 2]
            const w = events[k - 1]
            expect(
              r?.kind === 'read' && r.name === name,
              `${where}: 앞의 두 번째 사건은 ${name}의 read`,
            ).toBe(true)
            expect(
              w?.kind === 'write' && w.name === name,
              `${where}: 바로 앞 사건은 ${name}의 write`,
            ).toBe(true)
            if (r?.kind !== 'read' || w?.kind !== 'write') return
            expect(n(w.value), `${where}: 쓴 값 = 읽은 값 ${op === '++' ? '+' : '-'} 1`).toBe(
              op === '++' ? n(r.value) + 1 : n(r.value) - 1,
            )
            expect(
              sameVal(e.value, postfix ? r.value : w.value),
              `${where}: 후위는 옛 값, 전위는 새 값이 식의 값`,
            ).toBe(true)
          } else if (assign) {
            const [, name, rhs] = assign
            const w = events[k - 1]
            const rr = events[k - 2]
            expect(
              w?.kind === 'write' && w.name === name,
              `${where}: 바로 앞 사건은 ${name}의 write`,
            ).toBe(true)
            expect(
              rr?.kind === 'result' && rr.code === rhs,
              `${where}: 그 앞 사건은 ${rhs}의 result`,
            ).toBe(true)
            if (w?.kind !== 'write' || rr?.kind !== 'result') return
            expect(sameVal(w.value, rr.value), `${where}: 오른쪽 식의 값을 넣어야 합니다`).toBe(
              true,
            )
            expect(sameVal(e.value, rr.value), `${where}: 대입 식의 값 = 오른쪽 식의 값`).toBe(true)
          } else if (code.split(' + ').length === 2) {
            const [left, right] = code.split(' + ')
            const j = events.findIndex((x) => x.kind === 'result' && x.code === left)
            expect(j, `${where}: 왼쪽 ${left}의 result가 있어야 합니다`).toBeGreaterThanOrEqual(0)
            expect(j, `${where}: 왼쪽 평가가 오른쪽보다 먼저`).toBeLessThan(k - 1)
            const lv = events[j] as Extract<EvalEvent, { kind: 'result' }>
            const re = events[k - 1]
            const rightOk =
              (re.kind === 'read' && re.name === right) ||
              (re.kind === 'result' && re.code === right)
            expect(rightOk, `${where}: 바로 앞 사건은 오른쪽 ${right}의 평가`).toBe(true)
            expect(n(e.value), `${where}: 두 값의 합`).toBe(n(lv.value) + n(re.value))
          } else {
            expect.fail(`처리하지 못하는 식 모양입니다: ${code}`)
          }
        })
      }
    })
  })

  describe('소스 대조(vm)', () => {
    it('평가가 끝난 단계의 식의 값과 변수 값이 소스를 실제로 실행한 결과와 같다', () => {
      const src = source().split('\n')
      let checked = 0
      steps.forEach((step, i) => {
        const prevNames = new Set((i > 0 ? steps[i - 1].state.bindings : []).map((b) => b.name))
        const ev = step.state.evaluation
        const prefix = i > 0 ? src.slice(0, step.line!.from - 1).join('\n') : ''
        if (!ev) {
          // 리터럴 초기화 선언 단계: 새 변수의 값 = 초기화 식의 실제 값
          const created = step.state.bindings.filter((b) => !prevNames.has(b.name))
          if (created.length === 0) return
          const { code } = parseLine(lineText(i))
          expect(String(runInNewContext(code)), `단계 ${i + 1}`).toBe(created[0].value.display)
          checked++
          return
        }
        if (!isEnd(step.state)) return
        const created = step.state.bindings.filter((b) => !prevNames.has(b.name))
        const others = step.state.bindings.filter((b) => prevNames.has(b.name))
        const script = `${prefix}\nconst __r = (${ev.code});\nJSON.stringify([__r, ${others.map((b) => b.name).join(', ')}])`
        const actual = JSON.parse(runInNewContext(script) as string) as number[]
        const last = lastEvent(step.state)
        const expected = [
          n((last as Extract<EvalEvent, { kind: 'result' }>).value),
          ...others.map((b) => n(b.value)),
        ]
        expect(actual, `단계 ${i + 1}: ${ev.code}`).toEqual(expected)
        for (const b of created)
          expect(n(b.value), `단계 ${i + 1}: 새 변수 ${b.name}`).toBe(actual[0])
        checked++
      })
      expect(checked).toBeGreaterThan(0)
    })
  })

  it('마지막 단계의 바인딩 값은 예제를 끝까지 실행한 실제 값과 같다', () => {
    const names = steps.at(-1)!.state.bindings.map((b) => b.name)
    const lines = runExample(`${source()}\nconsole.log(JSON.stringify([${names.join(', ')}]))`)
    const actual = JSON.parse(lines.at(-1)!) as number[]
    expect(actual).toEqual(steps.at(-1)!.state.bindings.map((b) => n(b.value)))
  })
})
