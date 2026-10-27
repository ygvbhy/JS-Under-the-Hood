import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type Block, type FlowEvent, type FlowState, type Val } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

describe('본문 주장 검증', () => {
  describe('break·continue를 쓸 수 없는 위치는 파싱 단계에서 SyntaxError', () => {
    it.each([
      'break;',
      'continue;',
      'if (true) { break; }',
      'switch (1) { case 1: continue; }',
      'for (;;) { function f() { break; } }',
    ])('`%s`', (source) => {
      expect(() => new Script(source)).toThrow(SyntaxError)
    })

    it('`switch (1) { default: break; }`는 파싱에 성공한다', () => {
      expect(() => new Script('switch (1) { default: break; }')).not.toThrow()
    })
  })

  it("`'1' == 1`은 true, `'1' === 1`은 false", () => {
    expect(runInNewContext("'1' == 1")).toBe(true)
    expect(runInNewContext("'1' === 1")).toBe(false)
  })

  it('label.js에서 `break outer`를 `break`로 바꾸면 8줄이 출력된다', () => {
    const source = readExample('label.js')
    expect(source).toContain('break outer')
    expect(runExample(source.replace('break outer', 'break'))).toEqual([
      '1 1',
      '1 2',
      '1 3',
      '2 1',
      '3 1',
      '3 2',
      '3 3',
      '끝',
    ])
  })

  it("default-middle.js의 값을 'S'로 바꾸면 작음, 'L'로 바꾸면 큼", () => {
    const source = readExample('default-middle.js')
    expect(source).toContain("'XL'")
    expect(runExample(source.replace("'XL'", "'S'"))).toEqual(['작음'])
    expect(runExample(source.replace("'XL'", "'L'"))).toEqual(['큼'])
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 상태 구조 + 명세(CaseBlockEvaluation) 계산 + vm 재평가 + 계측한 예제의 실제 줄 순서 대조

type Kind<K extends FlowEvent['kind']> = Extract<FlowEvent, { kind: K }>
const ofKind = <K extends FlowEvent['kind']>(events: FlowEvent[], kind: K): Kind<K>[] =>
  events.filter((e): e is Kind<K> => e.kind === kind)

function fail(message: string): never {
  expect.fail(message)
  throw new Error(message)
}

const sameVal = (a: Val, b: Val): boolean => a.type === b.type && a.display === b.display
const jsonEq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
const sameInstance = (a: Block, b: Block): boolean =>
  a.kind === b.kind && a.code === b.code && a.iteration === b.iteration

function duplicates(items: string[]): string[] {
  return items.filter((item, i) => items.indexOf(item) !== i)
}

const toVal = (x: unknown): Val => {
  if (typeof x === 'number') return { type: 'number', display: String(x) }
  if (typeof x === 'string') return { type: 'string', display: x }
  return fail(`숫자나 문자열이 아닌 값입니다: ${String(x)}`)
}
const varsOf = (s: FlowState): Record<string, number | string> =>
  Object.fromEntries(
    s.bindings.map((b) => [
      b.name,
      b.value.type === 'number' ? Number(b.value.display) : b.value.display,
    ]),
  )
const evalIn = (code: string, s: FlowState): unknown => runInNewContext(code, varsOf(s))

// 직전 단계와 비교한 블록 차이
function diffBlocks(prev: FlowState, cur: FlowState) {
  const added: Block[] = []
  const newEvents: { block: Block; event: FlowEvent }[] = []
  for (const block of cur.blocks) {
    const before = prev.blocks.find((b) => sameInstance(b, block))
    if (!before) {
      added.push(block)
      for (const event of block.events) newEvents.push({ block, event })
    } else {
      for (const event of block.events.slice(before.events.length)) newEvents.push({ block, event })
    }
  }
  const removed = prev.blocks.filter((b) => !cur.blocks.some((c) => sameInstance(b, c)))
  return { added, removed, newEvents }
}

type Clause = { label: string; expr?: string } // label: 'case 3' / 'default'

// 소스에서 header(예: `switch (level)`)로 시작하는 switch의 case·default를 소스 순서대로 뽑는다.
function parseSwitch(source: string, header: string): Clause[] {
  const lines = source.split('\n')
  const start = lines.findIndex((l) => l.trim() === `${header} {`)
  if (start < 0) return fail(`소스에서 "${header} {"를 찾을 수 없습니다`)
  const indent = (l: string) => l.length - l.trimStart().length
  const base = indent(lines[start])
  const clauses: Clause[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i]
    const t = l.trim()
    if (t === '}' && indent(l) === base) return clauses
    if (indent(l) !== base + 2) continue
    const c = /^case (.+):$/.exec(t)
    if (c) clauses.push({ label: `case ${c[1]}`, expr: c[1] })
    else if (t === 'default:') clauses.push({ label: 'default' })
    else return fail(`해석할 수 없는 switch 절: ${l}`)
  }
  return fail(`"${header}"의 끝을 찾을 수 없습니다`)
}

// CaseBlockEvaluation(14.12.2): default 앞의 case → (일치 없으면) default 뒤의 case → 그래도 없으면 default부터
function selectClause(
  clauses: Clause[],
  input: Val,
  vars: Record<string, number | string>,
): { compares: { caseCode: string; right: Val; result: boolean }[]; start: number | 'none' } {
  const compares: { caseCode: string; right: Val; result: boolean }[] = []
  const defaultIndex = clauses.findIndex((c) => c.label === 'default')
  const test = (i: number): boolean => {
    const right = toVal(runInNewContext(clauses[i].expr!, { ...vars }))
    const result = sameVal(input, right)
    compares.push({ caseCode: clauses[i].label, right, result })
    return result
  }
  const beforeEnd = defaultIndex === -1 ? clauses.length : defaultIndex
  for (let i = 0; i < beforeEnd; i++) if (test(i)) return { compares, start: i }
  if (defaultIndex === -1) return { compares, start: 'none' }
  for (let i = defaultIndex + 1; i < clauses.length; i++) if (test(i)) return { compares, start: i }
  return { compares, start: defaultIndex }
}

// 예제에 줄 기록 호출을 끼운 계측본. 이 페이지 예제 3개의 모양만 처리하고, 모르는 모양이면 실패한다.
function instrument(source: string) {
  const hitLines = new Set<number>()
  const forHeaderLines = new Set<number>()
  const code = source
    .split('\n')
    .map((text, idx) => {
      const n = idx + 1
      const t = text.trim()
      const indent = text.slice(0, text.length - text.trimStart().length)
      const forMatch = /^for \((.+?); (.+?); (.+?)\) \{$/.exec(t)
      if (forMatch) {
        hitLines.add(n)
        forHeaderLines.add(n)
        return `${indent}for (${forMatch[1]}; (__hit(${n}), ${forMatch[2]}); ${forMatch[3]}) {`
      }
      if (/^for\b/.test(t)) return fail(`계측할 수 없는 for 머리: ${t}`)
      if (/^(console\.log|if|break|continue|switch)\b/.test(t)) {
        hitLines.add(n)
        return `${indent}__hit(${n}); ${t}`
      }
      return text
    })
    .join('\n')
  return { code, hitLines, forHeaderLines }
}

const collapse = (items: number[]): number[] =>
  items.filter((x, i) => i === 0 || x !== items[i - 1])

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않는다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
  })

  it('시나리오는 fall-through, loop-break-continue, switch-in-loop 순서다', () => {
    expect(scenarios.map((s) => s.id)).toEqual([
      'fall-through',
      'loop-break-continue',
      'switch-in-loop',
    ])
  })

  it('단계 수는 9 / 17 / 21이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([9, 17, 21])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const steps = scenario.steps
  const prevOf = (i: number): FlowState => steps[i - 1].state
  const lineText = (i: number): string => {
    const line = steps[i].line
    expect(line, `단계 ${i + 1}: line이 필요합니다`).toBeDefined()
    expect(line!.from, `단계 ${i + 1}: line은 한 줄이어야 합니다`).toBe(line!.to)
    return source().split('\n')[line!.from - 1]
  }
  const outputOf = (i: number) => steps[i].output ?? []
  const addedOutput = (i: number) => outputOf(i).length > outputOf(i - 1).length
  // for 머리: 변수 이름, 초기값, 조건식 (증감식은 `이름++`만 처리)
  const parseFor = (code: string) => {
    const m = /^for \(let (\w+) = (\d+); (.+); (\w+)\+\+\)$/.exec(code)
    if (!m || m[4] !== m[1]) return fail(`해석할 수 없는 for 머리: ${code}`)
    return { name: m[1], init: Number(m[2]), cond: m[3] }
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
    expect(first.state).toEqual({ bindings: [], blocks: [] })
    expect(first.output).toEqual([])
    for (const step of steps) expect(Array.isArray(step.output)).toBe(true)
  })

  it('line이 없는 단계는 첫 단계와(switch-in-loop는) 마지막 "실행 끝" 단계뿐이다', () => {
    const without = steps.flatMap((s, i) => (s.line ? [] : [i]))
    expect(without).toEqual(scenario.id === 'switch-in-loop' ? [0, steps.length - 1] : [0])
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
            new RegExp(`\\b${b.declaredWith} ${b.name}\\b`).test(source()),
            `단계 ${i + 1}: ${b.name}의 declaredWith가 소스와 다릅니다`,
          ).toBe(true)
        }
      })
    })

    it('changed는 직전 단계와 비교해 계산한 값과 같고, 변수는 블록이 모두 끝날 때만 사라진다', () => {
      steps.forEach((step, i) => {
        const previous = i === 0 ? [] : prevOf(i).bindings
        for (const p of previous) {
          if (step.state.bindings.some((b) => b.name === p.name)) continue
          expect(
            step.state.blocks,
            `단계 ${i + 1}: 바인딩 ${p.name}이 블록이 남아 있는데 사라졌습니다`,
          ).toEqual([])
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
      })
    })

    it('blocks는 for 다음 switch 순서만 허용하고, 블록 머리 code는 소스의 줄과 같다', () => {
      steps.forEach((step, i) => {
        const kinds = step.state.blocks.map((b) => b.kind)
        expect(
          [[], ['for'], ['switch'], ['for', 'switch']].some((ok) => jsonEq(ok, kinds)),
          `단계 ${i + 1}: 허용하지 않는 블록 구성 ${kinds.join(',')}`,
        ).toBe(true)
        for (const b of step.state.blocks) {
          expect(
            source()
              .split('\n')
              .some((l) => l.trim() === `${b.code} {`),
            `단계 ${i + 1}: "${b.code}"가 소스의 줄과 다릅니다`,
          ).toBe(true)
          expect(b.iteration !== undefined, `단계 ${i + 1}: iteration은 for에만 있습니다`).toBe(
            b.kind === 'for',
          )
        }
      })
    })

    it('같은 블록이 이어지는 동안 events는 직전 그대로이거나 하나를 더한 것이고, 새 블록은 맨 처음 사건 하나로 시작한다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        const { added } = diffBlocks(prevOf(i), step.state)
        for (const block of step.state.blocks) {
          const before = prevOf(i).blocks.find((b) => sameInstance(b, block))
          if (!before) continue
          expect(
            block.events.slice(0, before.events.length),
            `단계 ${i + 1}: ${block.code}의 events가 직전 단계의 확장이 아닙니다`,
          ).toEqual(before.events)
          expect(
            block.events.length - before.events.length,
            `단계 ${i + 1}: ${block.code}에 사건이 둘 이상 늘었습니다`,
          ).toBeLessThanOrEqual(1)
        }
        for (const block of added) {
          expect(
            block.events,
            `단계 ${i + 1}: 새 ${block.code}는 사건 하나로 시작해야 합니다`,
          ).toHaveLength(1)
          expect(block.events[0].kind).toBe(block.kind === 'switch' ? 'value' : 'condition')
        }
      })
    })

    it('한 단계는 사건 하나를 더하거나, 출력을 하나 더하거나, 블록이 끝나거나, 변수가 생기는 것 중 하나다. 출력 단계는 사건을 더하지 않는다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        const { added, removed, newEvents } = diffBlocks(prevOf(i), step.state)
        const hasOutput = addedOutput(i)
        if (hasOutput) {
          expect(newEvents, `단계 ${i + 1}: 출력 단계에 사건이 있습니다`).toEqual([])
          expect(added, `단계 ${i + 1}: 출력 단계에 새 블록이 있습니다`).toEqual([])
          for (const b of step.state.bindings) {
            expect(b.changed, `단계 ${i + 1}: 출력 단계에서 변수가 바뀌었습니다`).toBeUndefined()
          }
        } else {
          expect(newEvents.length, `단계 ${i + 1}: 사건이 둘 이상 늘었습니다`).toBeLessThanOrEqual(
            1,
          )
          expect(
            newEvents.length === 1 ||
              removed.length > 0 ||
              step.state.bindings.some((b) => b.changed),
            `단계 ${i + 1}: 사건도 출력도 블록 종료도 변수 생성도 없는 단계입니다`,
          ).toBe(true)
        }
      })
    })

    it('블록이 사라지는 것은 break·continue 뒤, switch의 exit 뒤, for 조건이 false가 된 뒤뿐이다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        for (const gone of diffBlocks(prevOf(i), step.state).removed) {
          // 같은 for의 다음 회차로 바뀐 것은 '회차' 검사가 맡는다
          if (
            gone.kind === 'for' &&
            step.state.blocks.some((c) => c.kind === 'for' && c.code === gone.code)
          )
            continue
          const last = gone.events.at(-1)
          const ok =
            last !== undefined &&
            (last.kind === 'jump' ||
              last.kind === 'exit' ||
              (gone.kind === 'for' && last.kind === 'condition' && !last.result))
          expect(ok, `단계 ${i + 1}: ${gone.code}가 끝날 이유가 없는데 사라졌습니다`).toBe(true)
        }
      })
    })

    it('jump 다음 단계: break의 대상은 blocks에 없고, continue면 switch는 없고 for는 회차가 1 늘어 있다', () => {
      let seen = 0
      steps.forEach((step, i) => {
        if (i === 0) return
        const { newEvents } = diffBlocks(prevOf(i), step.state)
        const added = newEvents.find((x) => x.event.kind === 'jump')
        if (!added) return
        seen++
        const jmp = added.event as Kind<'jump'>
        const blocks = step.state.blocks
        const innermost = blocks.at(-1)
        expect(innermost, `단계 ${i + 1}: jump 단계에 블록이 없습니다`).toBeDefined()
        expect(added.block, `단계 ${i + 1}: jump는 가장 안쪽 블록의 사건이어야 합니다`).toBe(
          innermost,
        )
        if (jmp.statement === 'continue') {
          expect(jmp.target, `단계 ${i + 1}: continue의 대상은 for입니다`).toBe('for')
        } else {
          expect(innermost!.kind, `단계 ${i + 1}: break의 대상은 가장 가까운 블록입니다`).toBe(
            jmp.target,
          )
        }
        const next = steps[i + 1]
        expect(next, `단계 ${i + 1}: jump가 마지막 단계입니다`).toBeDefined()
        const nextBlocks = next.state.blocks
        if (jmp.statement === 'break') {
          expect(
            nextBlocks.some((b) => b.kind === jmp.target),
            `단계 ${i + 2}: break의 대상 ${jmp.target} 블록이 남아 있습니다`,
          ).toBe(false)
        } else {
          expect(
            nextBlocks.some((b) => b.kind === 'switch'),
            `단계 ${i + 2}: continue 뒤에 switch 블록이 남아 있습니다`,
          ).toBe(false)
          const forBefore = blocks.find((b) => b.kind === 'for')!
          const forAfter = nextBlocks.find((b) => b.kind === 'for')
          expect(
            forAfter?.iteration,
            `단계 ${i + 2}: continue 뒤 for의 회차가 1 늘어야 합니다`,
          ).toBe(forBefore.iteration! + 1)
        }
      })
      expect(seen, 'jump 사건이 있는 단계를 하나도 찾지 못했습니다').toBe(
        scenario.id === 'fall-through' ? 0 : 2,
      )
    })

    it('for 블록: 첫 단계는 변수 생성 + 조건 사건 하나, 회차가 바뀌는 단계는 변수가 정확히 1 늘고 조건 사건 하나다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        for (const block of step.state.blocks.filter((b) => b.kind === 'for')) {
          const header = parseFor(block.code)
          const before = prevOf(i).blocks.find((b) => b.kind === 'for' && b.code === block.code)
          const binding = step.state.bindings.find((b) => b.name === header.name)
          expect(binding, `단계 ${i + 1}: 변수 ${header.name}이 없습니다`).toBeDefined()
          const current = Number(binding!.value.display)
          if (!before) {
            expect(block.iteration, `단계 ${i + 1}: 첫 회차는 1입니다`).toBe(1)
            expect(current).toBe(header.init)
            expect(binding!.changed).toBe('created')
          } else if (before.iteration !== block.iteration) {
            expect(block.iteration, `단계 ${i + 1}: 회차는 1씩 늘어납니다`).toBe(
              before.iteration! + 1,
            )
            const prevBinding = prevOf(i).bindings.find((b) => b.name === header.name)!
            expect(current, `단계 ${i + 1}: 변수는 정확히 1 늘어야 합니다`).toBe(
              Number(prevBinding.value.display) + 1,
            )
            expect(binding!.changed).toBe('updated')
          } else {
            continue
          }
          expect(
            block.events,
            `단계 ${i + 1}: 새 회차의 events는 for 조건 사건 하나입니다`,
          ).toHaveLength(1)
          expect(block.events[0].kind).toBe('condition')
          expect((block.events[0] as Kind<'condition'>).code).toBe(header.cond)
          expect(
            step.state.blocks.some((b) => b.kind === 'switch'),
            `단계 ${i + 1}: 새 회차 시작에 switch 블록이 있습니다`,
          ).toBe(false)
          expect(block.iteration).toBe(current - header.init + 1)
        }
      })
    })

    it('새로 늘어난 사건은 그 단계 line의 소스와 맞는다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        for (const { block, event } of diffBlocks(prevOf(i), step.state).newEvents) {
          const t = lineText(i).trim()
          const where = `단계 ${i + 1}: ${event.kind} 사건과 line "${t}"`
          switch (event.kind) {
            case 'value':
              expect(t.startsWith(block.code), where).toBe(true)
              break
            case 'compare':
            case 'fall-through':
              expect(t, where).toBe(`${event.caseCode}:`)
              break
            case 'default':
              expect(t, where).toBe('default:')
              break
            case 'condition':
              expect(t.includes(`(${event.code})`) || t.includes(`; ${event.code};`), where).toBe(
                true,
              )
              break
            case 'jump':
              expect(t.includes(event.statement), where).toBe(true)
              break
            case 'exit':
              expect(t, where).toBe('}')
              break
            default:
              fail(`알 수 없는 사건 모양: ${JSON.stringify(event)}`)
          }
        }
      })
    })
  })

  describe('case 비교 순서(CaseBlockEvaluation 계산)', () => {
    it('compare 사건은 소스의 case·default 순서로 계산한 비교와 같고, 일치 뒤에는 compare가 없다', () => {
      let checked = 0
      steps.forEach((step, i) => {
        for (const block of step.state.blocks.filter((b) => b.kind === 'switch')) {
          checked++
          const where = `단계 ${i + 1} ${block.code}`
          const [first, ...rest] = block.events
          if (first?.kind !== 'value') fail(`${where}: 첫 사건은 value여야 합니다`)
          const clauses = parseSwitch(source(), block.code)
          const { compares, start } = selectClause(clauses, first.value, varsOf(step.state))
          const expected = compares.map((c) => ({ kind: 'compare', left: first.value, ...c }))

          let k = 0
          while (k < rest.length && rest[k].kind === 'compare') k++
          const leading = rest.slice(0, k)
          const after = rest.slice(k)
          expect(leading, `${where}: compare 사건이 계산한 비교와 다릅니다`).toEqual(
            expected.slice(0, leading.length),
          )
          expect(
            ofKind(after, 'compare'),
            `${where}: 비교가 끝난 뒤(일치 뒤)에 compare가 있습니다`,
          ).toEqual([])
          if (leading.length < expected.length) {
            expect(after, `${where}: 비교가 끝나기 전에 다른 사건이 있습니다`).toEqual([])
            continue
          }

          // 비교가 모두 끝난 뒤
          const startIndex = start === 'none' ? -1 : start
          const isDefaultStart = start !== 'none' && clauses[start].label === 'default'
          if (start === 'none') {
            expect(
              after.every((e) => e.kind === 'exit' && e.reason === 'no-match'),
              `${where}`,
            ).toBe(true)
          } else if (isDefaultStart) {
            if (after.length > 0)
              expect(after[0].kind, `${where}: default부터 실행해야 합니다`).toBe('default')
            expect(ofKind(after, 'default').length).toBeLessThanOrEqual(1)
          } else {
            expect(
              ofKind(after, 'default'),
              `${where}: 일치했는데 default 사건이 있습니다`,
            ).toEqual([])
          }
          const fallThroughs = ofKind(after, 'fall-through')
          fallThroughs.forEach((ft, m) => {
            const target = clauses[startIndex + 1 + m]
            expect(target, `${where}: 이어서 실행할 다음 절이 없습니다`).toBeDefined()
            expect(ft.caseCode, `${where}: fall-through가 소스상 다음 절이 아닙니다`).toBe(
              target.label,
            )
          })
          const exits = ofKind(after, 'exit')
          expect(exits.length).toBeLessThanOrEqual(1)
          if (exits.length === 1) {
            expect(after.at(-1), `${where}: exit는 마지막 사건이어야 합니다`).toBe(exits[0])
            expect(
              exits[0].reason === 'no-match',
              `${where}: no-match는 일치 없음일 때만 쓴다`,
            ).toBe(start === 'none')
            if (exits[0].reason === 'end') {
              expect(
                ofKind(after, 'jump'),
                `${where}: break·continue 뒤에는 끝까지 실행하지 않습니다`,
              ).toEqual([])
              expect(
                fallThroughs.length,
                `${where}: 끝까지 실행하려면 마지막 절까지 이어져야 합니다`,
              ).toBe(clauses.length - 1 - startIndex)
            }
          }
          const jumps = ofKind(after, 'jump')
          if (jumps.length > 0) expect(after.at(-1)).toBe(jumps[0])
          expect(jumps.length).toBeLessThanOrEqual(1)
        }
      })
      if (source().includes('switch (') && checked === 0) fail('switch 블록이 없습니다')
    })
  })

  describe('vm 재평가', () => {
    it('value 사건 = switch 식을 그 단계 변수로 평가한 값', () => {
      steps.forEach((step, i) => {
        for (const block of step.state.blocks.filter((b) => b.kind === 'switch')) {
          const m = /^switch \((.+)\)$/.exec(block.code)
          if (!m) fail(`해석할 수 없는 switch 머리: ${block.code}`)
          const ev = block.events[0]
          if (ev.kind !== 'value') fail(`단계 ${i + 1}: 첫 사건은 value여야 합니다`)
          expect(ev.code).toBe(m[1])
          expect(ev.value, `단계 ${i + 1}: ${m[1]}의 값이 다릅니다`).toEqual(
            toVal(evalIn(m[1], step.state)),
          )
        }
      })
    })

    it('condition 결과 = 조건식을 그 단계 변수로 평가한 값', () => {
      let count = 0
      steps.forEach((step, i) => {
        for (const block of step.state.blocks) {
          for (const ev of ofKind(block.events, 'condition')) {
            count++
            expect(ev.result, `단계 ${i + 1}: ${ev.code}의 결과가 다릅니다`).toBe(
              evalIn(ev.code, step.state),
            )
          }
        }
      })
      if (scenario.id !== 'fall-through') expect(count).toBeGreaterThan(0)
    })

    it('출력이 늘어난 단계의 새 줄 = 그 단계 line의 console.log를 그 단계 변수로 실행한 출력', () => {
      let count = 0
      steps.forEach((step, i) => {
        if (i === 0 || !addedOutput(i)) return
        count++
        expect(
          outputOf(i).length - outputOf(i - 1).length,
          `단계 ${i + 1}: 한 단계에 한 줄만 출력합니다`,
        ).toBe(1)
        const m = /^(console\.log\(.*\);)$/.exec(lineText(i).trim())
        if (!m) fail(`단계 ${i + 1}: line이 console.log 문이 아닙니다: ${lineText(i)}`)
        const collected: string[] = []
        runInNewContext(m[1], {
          ...varsOf(step.state),
          console: { log: (...args: unknown[]) => collected.push(format(...args)) },
        })
        expect(outputOf(i).slice(outputOf(i - 1).length), `단계 ${i + 1}: 출력이 다릅니다`).toEqual(
          collected,
        )
      })
      expect(count).toBe(scenario.id === 'fall-through' ? 2 : example!.expectedOutput.length)
    })
  })

  describe('실제 줄 순서', () => {
    it('계측한 예제를 실행해 얻은 줄 순서 = 시나리오 단계의 줄 순서', () => {
      const { code, hitLines, forHeaderLines } = instrument(source())
      const real: number[] = []
      runInNewContext(
        code,
        { __hit: (n: number) => real.push(n), console: { log: () => undefined } },
        { timeout: 2000 },
      )
      const listed: number[] = []
      steps.forEach((step, i) => {
        if (!step.line || !hitLines.has(step.line.from)) return
        if (forHeaderLines.has(step.line.from)) {
          const addsCondition = diffBlocks(prevOf(i), step.state).newEvents.some(
            (x) => x.block.kind === 'for' && x.event.kind === 'condition',
          )
          if (!addsCondition) fail(`단계 ${i + 1}: for 머리 줄인데 조건 사건을 더하지 않습니다`)
        }
        listed.push(step.line.from)
      })
      expect(real.length).toBeGreaterThan(0)
      expect(collapse(listed), '시나리오의 줄 순서가 실제 실행 순서와 다릅니다').toEqual(
        collapse(real),
      )
    })
  })
})
