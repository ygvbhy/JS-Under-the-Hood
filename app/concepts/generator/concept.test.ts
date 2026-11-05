import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'
import type { GenStatus } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['next', 'return'])
    expect(scenarios.map((s) => s.label)).toEqual(['next와 yield의 왕복', 'return()과 finally'])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['next-arg', 'return-finally'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 next 17, return 16이다', () => {
    expect(scenarioOf('next').steps).toHaveLength(17)
    expect(scenarioOf('return').steps).toHaveLength(16)
  })
})

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  next: {
    1: 'function* talk() {',
    2: "  var a = yield 'first';",
    3: "  console.log('a = ' + a);",
    4: "  var b = yield 'second';",
    5: "  console.log('b = ' + b);",
    6: "  return 'end';",
    7: '}',
    8: 'var it = talk();',
    9: "var r1 = it.next('ignored');",
    10: "console.log(r1.value + ' ' + r1.done);",
    11: "var r2 = it.next('hi');",
    12: "console.log(r2.value + ' ' + r2.done);",
    13: "var r3 = it.next('bye');",
    14: "console.log(r3.value + ' ' + r3.done);",
    15: "var r4 = it.next('again');",
    16: "console.log(r4.value + ' ' + r4.done);",
  },
  return: {
    1: 'function* task() {',
    2: '  try {',
    3: "    yield 'step 1';",
    4: "    yield 'step 2';",
    5: '  } finally {',
    6: "    console.log('정리');",
    7: '  }',
    8: '}',
    9: 'var it = task();',
    10: 'var r1 = it.next();',
    11: "console.log(r1.value + ' ' + r1.done);",
    12: "var r2 = it.return('중단');",
    13: "console.log(r2.value + ' ' + r2.done);",
    14: 'var r3 = it.next();',
    15: "console.log(r3.value + ' ' + r3.done);",
    16: 'var early = task();',
    17: "var r4 = early.return('시작 전');",
    18: "console.log(r4.value + ' ' + r4.done);",
    19: "var r5 = it.return('또');",
    20: "console.log(r5.value + ' ' + r5.done);",
  },
}

// 제너레이터 변수 이름 → 그 본문 프레임 이름
const BODY_FRAME: Record<string, Record<string, string>> = {
  next: { it: 'talk 본문' },
  return: { it: 'task 본문', early: 'task 본문' },
}

// 허용하는 상태 전이(같은 상태로 머무는 것은 따로 허용)
const TRANSITIONS: Record<GenStatus, GenStatus[]> = {
  'suspended-start': ['executing', 'completed'],
  executing: ['suspended-yield', 'completed'],
  'suspended-yield': ['executing', 'completed'],
  completed: [],
}

const isBodyFrame = (frame: string) => frame.endsWith(' 본문')

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = () => readExample(example.file)
  const steps = scenario.steps
  const frameOf = BODY_FRAME[scenario.id]

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = source().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('첫 단계는 실행 시작이고 전역 코드만 스택에 있으며 출력이 비어 있다', () => {
    expect(steps[0].title).toBe('실행 시작')
    expect(steps[0].state).toEqual({ stack: ['전역 코드'], gens: [], call: null, result: null })
    expect(steps[0].output).toEqual([])
  })

  it('① 상태 전이는 허용된 것뿐이고 새 제너레이터는 suspended-start로 생긴다', () => {
    steps.forEach((step, k) => {
      const prev = k > 0 ? steps[k - 1].state.gens : []
      for (const g of step.state.gens) {
        const before = prev.find((p) => p.name === g.name)
        const where = `단계 ${k + 1}: ${g.name}`
        if (!before) {
          expect(g.status, where).toBe('suspended-start')
          continue
        }
        if (before.status === g.status) continue
        expect(TRANSITIONS[before.status], `${where} ${before.status} → ${g.status}`).toContain(
          g.status,
        )
      }
      for (const p of prev) {
        expect(
          step.state.gens.some((g) => g.name === p.name),
          `단계 ${k + 1}: ${p.name}가 사라짐`,
        ).toBe(true)
      }
    })
  })

  it('② executing인 제너레이터는 하나 이하이고 스택 맨 위가 그 본문이며, 없으면 스택에 본문 프레임이 없다', () => {
    steps.forEach((step, k) => {
      const { stack, gens } = step.state
      const where = `단계 ${k + 1}`
      const running = gens.filter((g) => g.status === 'executing')
      expect(running.length, `${where}: 동시에 executing은 하나`).toBeLessThanOrEqual(1)
      const bodies = stack.filter(isBodyFrame)
      expect(stack[0], where).toBe('전역 코드')
      if (running.length === 0) {
        expect(bodies, `${where}: executing이 없는데 본문 프레임이 있음`).toEqual([])
      } else {
        expect(bodies, where).toEqual([frameOf[running[0].name]])
        expect(stack.at(-1), `${where}: 맨 위가 실행 중인 본문`).toBe(frameOf[running[0].name])
      }
    })
  })

  it('③ 결과의 done은 호출 대상 제너레이터의 상태와 맞는다(completed면 done true, done true면 completed, done false면 suspended-yield)', () => {
    let target: string | null = null
    steps.forEach((step, k) => {
      const { call, result, gens } = step.state
      if (call) target = call.target
      if (!result) return
      const where = `단계 ${k + 1}`
      const g = gens.find((x) => x.name === target)
      expect(g, `${where}: 결과의 대상 ${target}`).toBeDefined()
      if (g!.status === 'completed') expect(result.done, `${where}: completed 뒤 결과`).toBe(true)
      if (result.done) expect(g!.status, `${where}: done true`).toBe('completed')
      else expect(g!.status, `${where}: done false`).toBe('suspended-yield')
    })
    // completed가 된 제너레이터의 호출이 결과를 돌려주면 항상 done true
    steps.forEach((step, k) => {
      const { call, result, gens } = step.state
      if (!call || !result) return
      const g = gens.find((x) => x.name === call.target)!
      if (g.status === 'completed') expect(result.done, `단계 ${k + 1}`).toBe(true)
    })
  })

  it('④ suspended-start에서 completed로 가는 단계에서는 본문이 스택에 오르지 않는다', () => {
    let found = false
    steps.forEach((step, k) => {
      if (k === 0) return
      const prev = steps[k - 1].state
      for (const g of step.state.gens) {
        const before = prev.gens.find((p) => p.name === g.name)
        if (before?.status === 'suspended-start' && g.status === 'completed') {
          found = true
          expect(step.state.stack.filter(isBodyFrame), `단계 ${k + 1}`).toEqual([])
          expect(step.state.stack, `단계 ${k + 1}`).toEqual(prev.stack)
        }
      }
    })
    // return 시나리오에는 시작 전 return이 있고, next 시나리오에는 없다
    expect(found).toBe(scenario.id === 'return')
  })

  it('⑤ 새 출력은 한 단계에 한 줄까지이고 그 단계 line 범위에 그 출력을 찍는 console.log가 있다', () => {
    const lines = source().split('\n')
    let previous: string[] = []
    steps.forEach((step, k) => {
      const output = step.output!
      const added = output.slice(previous.length)
      expect(added.length, `단계 ${k + 1}: 한 단계에 한 줄까지`).toBeLessThanOrEqual(1)
      for (const text of added) {
        const { from, to } = step.line!
        const range = lines.slice(from - 1, to)
        const literal = range.some((l) => l.includes(`console.log('${text}')`))
        // console.log('a = ' + a) 꼴
        const prefix = /^(.* = )/.exec(text)?.[1]
        const concat =
          prefix !== undefined && range.some((l) => l.includes(`console.log('${prefix}' + `))
        // console.log(r.value + ' ' + r.done) 꼴
        const resultLine = range.some((l) =>
          /console\.log\(\w+\.value \+ ' ' \+ \w+\.done\)/.test(l),
        )
        expect(literal || concat || resultLine, `단계 ${k + 1}: ${text}`).toBe(true)
      }
      previous = output
    })
  })

  it('⑥ 결과를 출력하는 단계의 새 출력 줄은 그 단계(또는 직전 단계)의 result의 value + " " + done과 같다', () => {
    const lines = source().split('\n')
    let checked = 0
    let previous: string[] = []
    steps.forEach((step, k) => {
      const added = step.output!.slice(previous.length)
      previous = step.output!
      if (added.length === 0) return
      const { from, to } = step.line!
      const printsResult = lines
        .slice(from - 1, to)
        .some((l) => /console\.log\(\w+\.value \+ ' ' \+ \w+\.done\)/.test(l))
      if (!printsResult) return
      const result = step.state.result ?? (k > 0 ? steps[k - 1].state.result : null)
      expect(result, `단계 ${k + 1}: result가 없음`).not.toBeNull()
      expect(added[0], `단계 ${k + 1}`).toBe(`${result!.value} ${result!.done}`)
      checked++
    })
    expect(checked).toBe(example.expectedOutput.filter((l) => / (true|false)$/.test(l)).length)
  })

  it('⑦ 마지막 단계는 스택이 전역 코드뿐이고 call이 null이며 출력이 expectedOutput이다', () => {
    const last = steps.at(-1)!
    expect(last.state.stack).toEqual(['전역 코드'])
    expect(last.state.call).toBeNull()
    expect(last.output).toEqual(example.expectedOutput)
  })

  it('설명에 명세 판마다 다른 이름이 없다', () => {
    for (const step of steps) {
      expect(step.explanation).not.toMatch(/RunSuspendedContext/)
    }
  })
})

describe('시나리오별 개념 불변식', () => {
  it("next: 'ignored'는 어떤 변수 값에도 나타나지 않고, 시작 지점 next 단계의 설명이 인수를 쓰지 않음을 밝힌다", () => {
    const { steps } = scenarioOf('next')
    for (const step of steps) {
      for (const g of step.state.gens) {
        for (const v of g.vars) expect(v.value, `${step.title}: ${v.name}`).not.toContain('ignored')
      }
    }
    const start = steps.find(
      (s) => s.state.call?.arg === "'ignored'" && s.state.stack.length === 2,
    )!
    expect(start.state.gens[0].status).toBe('executing')
    expect(start.explanation).toContain('시작 지점은 인수를 받지 않으므로')
    expect(start.explanation).toContain("'ignored'는 쓰이지 않습니다")
  })

  it("next: 제너레이터를 부른 단계부터 a, b가 undefined로 존재하고, a가 'hi'가 되는 단계의 call.arg는 \"'hi'\"이다", () => {
    const { steps } = scenarioOf('next')
    const created = steps.findIndex((s) => s.state.gens.length > 0)
    expect(created).toBe(1)
    expect(steps[created].state.gens[0].vars).toEqual([
      { name: 'a', value: 'undefined' },
      { name: 'b', value: 'undefined' },
    ])
    const valueOf = (i: number, name: string) =>
      steps[i].state.gens[0]?.vars.find((v) => v.name === name)?.value
    const becameHi = steps.findIndex((s, i) => i > 0 && valueOf(i, 'a') === "'hi'")
    expect(valueOf(becameHi - 1, 'a')).toBe('undefined')
    expect(steps[becameHi].state.call?.arg).toBe("'hi'")
    const becameBye = steps.findIndex((s, i) => i > 0 && valueOf(i, 'b') === "'bye'")
    expect(valueOf(becameBye - 1, 'b')).toBe('undefined')
    expect(steps[becameBye].state.call?.arg).toBe("'bye'")
  })

  it('next: completed 뒤의 next는 스택에 본문이 오르지 않고 곧바로 undefined true이다', () => {
    const { steps } = scenarioOf('next')
    const again = steps.find((s) => s.state.call?.arg === "'again'")!
    expect(again.state.stack).toEqual(['전역 코드'])
    expect(again.state.gens[0].status).toBe('completed')
    expect(again.state.result).toEqual({ value: 'undefined', done: true })
  })

  it('return: 정리 출력 단계에 task 본문이 스택에 있고, return() 호출은 suspended-yield에서 executing으로 재개한다', () => {
    const { steps } = scenarioOf('return')
    const k = steps.findIndex((s) => s.output!.includes('정리'))
    expect(steps[k].state.stack).toContain('task 본문')
    expect(steps[k].state.gens.find((g) => g.name === 'it')!.status).toBe('executing')
    const resumed = steps.findIndex((s) => s.state.call?.method === 'return')
    expect(steps[resumed - 1].state.gens[0].status).toBe('suspended-yield')
    expect(steps[resumed].state.gens[0].status).toBe('executing')
    expect(steps[resumed].state.stack).toEqual(['전역 코드', 'task 본문'])
  })

  it('return: early는 한 번도 executing이 아니고, 그 return() 단계는 finally 출력이 없다', () => {
    const { steps } = scenarioOf('return')
    for (const s of steps) {
      expect(s.state.gens.find((g) => g.name === 'early')?.status).not.toBe('executing')
    }
    const k = steps.findIndex((s) => s.state.call?.target === 'early')
    expect(steps[k].output).toEqual(steps[k - 1].output)
    expect(steps[k].state.result).toEqual({ value: '시작 전', done: true })
    expect(steps[k].explanation).toContain('본문을 재개하지 않고 곧바로 completed')
    expect(steps[k].explanation).toContain('GeneratorResumeAbrupt')
  })

  it("return: completed 뒤의 return('또')는 스택에 본문이 오르지 않고 finally 출력 없이 곧바로 '또' true이다", () => {
    const { steps } = scenarioOf('return')
    const k = steps.findIndex((s) => s.state.call?.arg === "'또'")
    expect(steps[k].state.call).toEqual({ target: 'it', method: 'return', arg: "'또'" })
    expect(steps[k - 1].state.gens.find((g) => g.name === 'it')!.status).toBe('completed')
    expect(steps[k].state.stack).toEqual(['전역 코드'])
    expect(steps[k].output).toEqual(steps[k - 1].output)
    expect(steps[k].state.result).toEqual({ value: '또', done: true })
  })
})
