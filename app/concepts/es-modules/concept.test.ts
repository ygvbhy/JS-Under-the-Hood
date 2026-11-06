import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios } from './scenarios'
import type { ModuleState, Phase } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!
const scenarioOf = (id: string) => scenarios.find((s) => s.id === id)!

// 시나리오가 코드 패널에 보이는 파일. cycle은 메인 문서(cycle-tdz.html)가 아니라 cycle-b.js다.
// 인라인 메인 모듈은 URL이 없고 cycle-a.js는 코드 패널에 없으므로, 이 시나리오의 불변식 ①(code = 예제 원문)은
// 코드 패널의 파일인 cycle-b.js 원문을 exampleSource로 넘겨 맞춘다. 기대 출력은 cycle-tdz 예제의 것이다.
const PANEL_FILE: Record<string, string> = { live: 'live-binding.html', cycle: 'cycle-b.js' }

// running.file 이름 → 그 코드가 들어 있어야 하는 파일(인라인 메인은 그 예제의 html)
const FILE_SOURCE: Record<string, Record<string, string>> = {
  live: { 'counter.js': 'counter.js', 'main(인라인)': 'live-binding.html' },
  cycle: {
    'cycle-a.js': 'cycle-a.js',
    'cycle-b.js': 'cycle-b.js',
    'main(인라인)': 'cycle-tdz.html',
  },
}

// 시나리오가 의존하는 고정 줄 번호(1-based)와 그 줄의 원문
const FIXED_LINES: Record<string, Record<number, string>> = {
  live: {
    5: '<script type="module">',
    6: "import { count, inc } from './counter.js';",
    7: 'console.log(count);',
    8: 'inc();',
    9: 'console.log(count);',
  },
  cycle: {
    1: "import { value, hello } from './cycle-a.js';",
    2: "console.log('b 본문', hello());",
    3: 'try {',
    4: '  console.log(value);',
    5: '} catch (e) {',
    6: '  console.log(e.name);',
    7: '}',
    8: "export const fromB = 'b의 값';",
  },
}

const PHASE_ORDER: Phase[] = ['로드', '링크', '평가']
const stripQuotes = (v: string) => v.replace(/^'(.*)'$/, '$1')

// import 바인딩을 따라가 대상 local 바인딩의 값을 구한다. 대상이 없으면 오류, 초기화 전이면 null
function resolveValue(state: ModuleState, file: string, name: string): string | null {
  const mod = state.modules.find((m) => m.file === file)
  expect(mod, `모듈 ${file} 없음`).toBeDefined()
  const binding = mod!.bindings.find((b) => b.name === name)
  expect(binding, `${file}의 ${name} 바인딩 없음`).toBeDefined()
  if (binding!.kind === 'local') return binding!.value
  return resolveValue(state, binding!.from, binding!.target)
}

describe('시나리오 id', () => {
  it('시나리오 id·라벨·exampleId가 정해진 순서이고 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['live', 'cycle'])
    expect(scenarios.map((s) => s.label)).toEqual(['라이브 바인딩', '순환 import와 초기화 전'])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['live-binding', 'cycle-tdz'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('단계 수는 live 8, cycle 12이고 각각 20 이하다', () => {
    expect(scenarioOf('live').steps).toHaveLength(8)
    expect(scenarioOf('cycle').steps).toHaveLength(12)
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const panelSource = () => readExample(PANEL_FILE[scenario.id])
  const steps = scenario.steps

  it('공통 불변식(코드 원문, 출력, line 범위)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, panelSource())
  })

  it('고정한 줄 번호의 소스가 기대한 코드다', () => {
    const lines = panelSource().split('\n')
    for (const [no, text] of Object.entries(FIXED_LINES[scenario.id])) {
      expect(lines[Number(no) - 1], `${no}번 줄`).toBe(text)
    }
  })

  it('첫 단계는 실행 시작이고 로드 단계이며 바인딩이 없고 출력이 비어 있다', () => {
    expect(steps[0].title).toBe('실행 시작')
    expect(steps[0].state.phase).toBe('로드')
    expect(steps[0].state.running).toBeNull()
    for (const m of steps[0].state.modules) expect(m.bindings, m.file).toEqual([])
    expect(steps[0].output).toEqual([])
  })

  it('마지막 단계는 모든 모듈이 평가 완료이고 출력이 expectedOutput이다', () => {
    const last = steps.at(-1)!
    expect(last.state.phase).toBe('평가')
    for (const m of last.state.modules) expect(m.status, m.file).toBe('평가 완료')
    expect(last.state.running).toBeNull()
    expect(last.output).toEqual(example.expectedOutput)
  })

  it('단계 phase는 로드, 링크, 평가 순서로만 진행한다', () => {
    let rank = 0
    steps.forEach((step, k) => {
      const r = PHASE_ORDER.indexOf(step.state.phase)
      expect(r, `단계 ${k + 1}: 알 수 없는 phase`).toBeGreaterThanOrEqual(0)
      expect(r, `단계 ${k + 1}: phase가 거꾸로 감`).toBeGreaterThanOrEqual(rank)
      rank = r
    })
    expect(new Set(steps.map((s) => s.state.phase))).toEqual(new Set(PHASE_ORDER))
  })

  it('링크 전(로드 단계)에는 어느 모듈에도 바인딩이 없다', () => {
    for (const [k, step] of steps.entries()) {
      if (step.state.phase !== '로드') continue
      for (const m of step.state.modules) expect(m.bindings, `단계 ${k + 1} ${m.file}`).toEqual([])
    }
  })

  it('모든 import 바인딩의 from·target이 존재하는 local 바인딩을 가리킨다', () => {
    steps.forEach((step, k) => {
      for (const m of step.state.modules) {
        for (const b of m.bindings) {
          if (b.kind !== 'import') continue
          const where = `단계 ${k + 1} ${m.file}의 ${b.name}`
          const from = step.state.modules.find((x) => x.file === b.from)
          expect(from, `${where}: from 모듈 ${b.from} 없음`).toBeDefined()
          const target = from!.bindings.find((x) => x.name === b.target)
          expect(target, `${where}: target ${b.target} 없음`).toBeDefined()
          expect(target!.kind, `${where}: target은 local이어야 함`).toBe('local')
          // 값 필드를 두지 않는 모델
          expect(Object.keys(b).sort(), where).toEqual(['from', 'kind', 'name', 'target'])
        }
      }
    })
  })

  it('running.code가 running.file의 원문에 있고 running 파일이 모듈 카드에 있다', () => {
    steps.forEach((step, k) => {
      const { running } = step.state
      if (!running) return
      const file = FILE_SOURCE[scenario.id][running.file]
      expect(file, `단계 ${k + 1}: ${running.file}의 원문 파일을 모름`).toBeDefined()
      expect(readExample(file), `단계 ${k + 1}: running.code가 ${running.file}에 없음`).toContain(
        running.code,
      )
      expect(step.state.modules.some((m) => m.file === running.file)).toBe(true)
    })
  })

  it('순환 시나리오에서 패널에 없는 파일을 실행하는 단계는 line을 생략하고, 패널 파일을 실행하는 단계는 running이 없다', () => {
    const panelName = scenario.id === 'live' ? 'main(인라인)' : 'cycle-b.js'
    steps.forEach((step, k) => {
      const { running } = step.state
      // live의 inc() 호출 단계는 line이 호출한 줄, running이 호출된 함수 안의 코드다
      if (scenario.id === 'cycle' && running && running.file !== panelName) {
        expect(step.line, `단계 ${k + 1}: 패널에 없는 파일인데 line이 있음`).toBeUndefined()
      }
      if (running) expect(running.file, `단계 ${k + 1}`).not.toBe(panelName)
    })
  })

  it('한 단계에 출력은 많아야 한 줄 늘고, 늘어난 단계는 console.log를 실행한다', () => {
    const lines = panelSource().split('\n')
    let previous: string[] = []
    steps.forEach((step, k) => {
      const added = step.output!.slice(previous.length)
      previous = step.output!
      expect(added.length, `단계 ${k + 1}`).toBeLessThanOrEqual(1)
      if (added.length === 0) return
      if (step.state.running) {
        expect(step.state.running.code, `단계 ${k + 1}`).toContain('console.log(')
      } else {
        const { from, to } = step.line!
        const has = lines.slice(from - 1, to).some((l) => l.includes('console.log('))
        expect(has, `단계 ${k + 1}: line 범위에 console.log가 없음`).toBe(true)
      }
    })
  })

  it('설명과 제목에 복사라는 말이 없다', () => {
    for (const step of steps) {
      expect(step.explanation).not.toContain('복사')
      expect(step.title).not.toContain('복사')
    }
  })
})

describe('시나리오별 개념 불변식', () => {
  it('live: 값이 바뀌는 local 바인딩은 counter.js의 것뿐이고, main에는 local 바인딩이 없다', () => {
    const { steps } = scenarioOf('live')
    const values = (s: (typeof steps)[number]) =>
      s.state.modules.flatMap((m) =>
        m.bindings.flatMap((b) => (b.kind === 'local' ? [[m.file, b.name, b.value]] : [])),
      )
    const changed = new Set<string>()
    for (let k = 1; k < steps.length; k++) {
      const prev = new Map(values(steps[k - 1]).map(([f, n, v]) => [`${f}/${n}`, v]))
      for (const [f, n, v] of values(steps[k])) {
        const key = `${f}/${n}`
        if (prev.has(key) && prev.get(key) !== v) changed.add(f as string)
      }
    }
    expect([...changed]).toEqual(['counter.js'])
    for (const s of steps) {
      const main = s.state.modules.find((m) => m.file === 'main(인라인)')!
      expect(main.bindings.every((b) => b.kind === 'import')).toBe(true)
    }
  })

  it('live: 출력 단계에서 찍힌 값은 그 시점 main의 count가 가리키는 대상 값과 같다', () => {
    const { steps } = scenarioOf('live')
    const printSteps = steps.filter((s) => s.title.startsWith('console.log(count)'))
    expect(printSteps).toHaveLength(2)
    for (const s of printSteps) {
      const printed = s.output!.at(-1)!
      expect(stripQuotes(resolveValue(s.state, 'main(인라인)', 'count')!)).toBe(printed)
    }
  })

  it('live: count는 링크 단계에서 초기화 전이고 평가의 선언 줄에서 0이 된다', () => {
    const { steps } = scenarioOf('live')
    const link = steps.find((s) => s.state.phase === '링크')!
    expect(resolveValue(link.state, 'main(인라인)', 'count')).toBeNull()
    expect(resolveValue(link.state, 'main(인라인)', 'inc')).toBe('함수 inc')
    const evaluated = steps.find((s) => s.title.startsWith('counter.js 평가'))!
    expect(evaluated.state.running).toEqual({ file: 'counter.js', code: 'export let count = 0;' })
    expect(resolveValue(evaluated.state, 'main(인라인)', 'count')).toBe('0')
  })

  it('cycle: 평가 순서는 b → a → main이고 출력은 예제 순서와 같다', () => {
    const { steps } = scenarioOf('cycle')
    const done = (s: (typeof steps)[number]) =>
      s.state.modules.filter((m) => m.status === '평가 완료').map((m) => m.file)
    const order: string[] = []
    for (const s of steps) for (const f of done(s)) if (!order.includes(f)) order.push(f)
    expect(order).toEqual(['cycle-b.js', 'cycle-a.js', 'main(인라인)'])
  })

  it('cycle: 함수 hello는 링크 단계부터 초기화되어 있고 value·fromB는 평가 전까지 초기화 전이다', () => {
    const { steps } = scenarioOf('cycle')
    const link = steps.find((s) => s.state.phase === '링크')!
    expect(resolveValue(link.state, 'cycle-b.js', 'hello')).toBe('함수 hello')
    expect(resolveValue(link.state, 'cycle-b.js', 'value')).toBeNull()
    expect(resolveValue(link.state, 'cycle-a.js', 'fromB')).toBeNull()
  })

  it('cycle: 출력 단계에서 찍힌 값은 그 시점 대상 바인딩의 값과 같다(ReferenceError 단계는 대상이 null)', () => {
    const { steps } = scenarioOf('cycle')
    const byTitle = (prefix: string) => steps.find((s) => s.title.startsWith(prefix))!

    const hello = byTitle("console.log('b 본문'")
    expect(resolveValue(hello.state, 'cycle-b.js', 'hello')).not.toBeNull()
    expect(hello.output!.at(-1)).toBe('b 본문 hello')

    const read = byTitle('console.log(value)')
    expect(resolveValue(read.state, 'cycle-b.js', 'value')).toBeNull()
    const caught = byTitle('catch')
    expect(resolveValue(caught.state, 'cycle-b.js', 'value')).toBeNull()
    expect(caught.output!.at(-1)).toBe('ReferenceError')

    const aBody = byTitle("cycle-a.js: console.log('a 본문'")
    expect(`a 본문 ${stripQuotes(resolveValue(aBody.state, 'cycle-a.js', 'fromB')!)}`).toBe(
      aBody.output!.at(-1),
    )
  })

  it('cycle: 값이 정해지는 순서는 fromB(b 평가), value(a 평가)이고 평가 전에는 value가 계속 초기화 전이다', () => {
    const steps = scenarioOf('cycle').steps.filter((s) => s.state.phase !== '로드')
    const valueAt = steps.map((s) => resolveValue(s.state, 'cycle-b.js', 'value'))
    const firstSet = valueAt.findIndex((v) => v !== null && v !== undefined)
    const fromBSet = steps.findIndex((s) => resolveValue(s.state, 'cycle-a.js', 'fromB') !== null)
    expect(fromBSet).toBeGreaterThan(0)
    expect(firstSet).toBeGreaterThan(fromBSet)
    // 한 번 정해진 값은 다시 초기화 전으로 돌아가지 않는다
    for (let k = firstSet; k < valueAt.length; k++) expect(valueAt[k]).not.toBeNull()
  })
})
