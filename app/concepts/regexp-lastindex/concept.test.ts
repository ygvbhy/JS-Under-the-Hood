import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type ExecCall } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

// --- 검색 기록 헬퍼 ------------------------------------------------------------------------------

type SearchRecord = {
  re: string // String(this): 정규 표현식 리터럴 모양
  input: string
  before: number
  start: number | null
  end: number | null
  after: number
}

// 새 컨텍스트에서 RegExp.prototype.exec를 원래 함수를 부르는 기록용 함수로 감싼 뒤 예제를 실행한다.
// RegExpExec가 exec 프로퍼티를 부르므로 test·match 안의 검색도 기록된다.
function runWithTrace(source: string): { trace: SearchRecord[]; output: string[] } {
  const trace: SearchRecord[] = []
  const output: string[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  const install = runInContext(
    `(function (rec) {
  var orig = RegExp.prototype.exec;
  RegExp.prototype.exec = function (s) {
    var before = this.lastIndex;
    var r = orig.call(this, s);
    rec({
      re: String(this),
      input: s,
      before: before,
      start: r ? r.index : null,
      end: r ? r.index + r[0].length : null,
      after: this.lastIndex,
    });
    return r;
  };
})`,
    context,
  ) as (rec: (r: SearchRecord) => void) => void
  install((r) => trace.push(r))
  runInContext(source, context, { timeout: 2000 })
  return { trace, output }
}

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

// --- 본문 주장 검증 ------------------------------------------------------------------------------

describe('본문 주장 검증', () => {
  it('lastIndex 어트리뷰트는 writable만 true', () => {
    expect(
      runInNewContext('JSON.stringify(Object.getOwnPropertyDescriptor(/a/g, "lastIndex"))'),
    ).toBe('{"value":0,"writable":true,"enumerable":false,"configurable":false}')
  })

  it('lastIndex가 문자열 길이보다 크면 test는 false이고 lastIndex는 0이 된다', () => {
    expect(runInNewContext("var r = /a/g; r.lastIndex = 10; r.test('a') + ' ' + r.lastIndex")).toBe(
      'false 0',
    )
  })

  it('g 없는 정규 표현식에 exec를 여러 번 불러도 lastIndex는 바뀌지 않는다', () => {
    expect(
      runInNewContext("var r = /a/; r.exec('aaa'); r.exec('aaa'); r.exec('aaa'); r.lastIndex"),
    ).toBe(0)
  })

  it('u 플래그에서 lastIndex가 서로게이트 쌍 가운데(1)면 빈 매치가 쌍의 처음(0)에서 일어나 lastIndex가 0으로 돌아간다', () => {
    expect(
      runInNewContext(
        "var re = /x*/gu; re.lastIndex = 1; var m = re.exec('\\u{1F600}b'); m.index + ' ' + re.lastIndex",
      ),
    ).toBe('0 0')
  })

  it('matchAll은 빈 문자열 매치를 결과에 넣고 다음 위치로 나아간다', () => {
    expect(
      runInNewContext(
        "var a = []; for (var m of 'abc'.matchAll(/x*/g)) a.push(JSON.stringify(m[0]) + m.index); a.join(',')",
      ),
    ).toBe('""0,""1,""2,""3')
  })

  it('matchAll의 복제본은 원래 lastIndex 값에서 찾기 시작하고, 원래 lastIndex는 그대로이며, g가 없으면 TypeError다', () => {
    expect(
      runInNewContext(
        "var re = /an/g; re.lastIndex = 2; var a = []; for (var m of 'banana'.matchAll(re)) a.push(m.index); a.join(',') + ' ' + re.lastIndex",
      ),
    ).toBe('3 2')
    let name = ''
    try {
      runInNewContext("'abc'.matchAll(/a/)")
    } catch (e) {
      // 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
      name = (e as Error).name
    }
    expect(name).toBe('TypeError')
  })

  it('matchAll은 u 플래그의 빈 매치에서도 끝나고, 원래 정규 표현식의 lastIndex를 바꾸지 않는다', () => {
    expect(
      runInNewContext(
        "var a = []; for (var m of '\\u{1F600}b'.matchAll(/x*/gu)) a.push(m.index); JSON.stringify(a)",
      ),
    ).toBe('[0,2,3]')
    // exec였다면 첫 매치 뒤 lastIndex가 1이 된다
    expect(
      runInNewContext("var r = /a/g; var it = 'aXa'.matchAll(r); it.next(); r.lastIndex"),
    ).toBe(0)
  })

  it('g는 lastIndex 자리에 매치가 없으면 뒤로 옮겨 가며 다시 시도한다', () => {
    expect(runInNewContext("var r = /b/g; r.test('aab') + ' ' + r.lastIndex")).toBe('true 3')
  })

  it('filter 콜백 안에서 lastIndex를 0으로 되돌리면 세 단어가 모두 통과한다', () => {
    expect(
      runInNewContext(`
var startsWithA = /^a/g;
var words = ['apple', 'avocado', 'banana', 'apricot'];
JSON.stringify(words.filter((w) => { startsWithA.lastIndex = 0; return startsWithA.test(w); }))
`),
    ).toBe('["apple","avocado","apricot"]')
  })
})

// --- 시나리오 검사 -------------------------------------------------------------------------------

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 test-alternates, exec-loop, filter-trap이다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['test-alternates', 'exec-loop', 'filter-trap'])
  })

  it('라벨과 exampleId가 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.label)).toEqual([
      'test 결과가 번갈아',
      'exec로 모두 찾기',
      'filter와 test',
    ])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)!
  const source = () => readExample(example.file)
  const steps = scenario.steps

  it('① 공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('첫 단계는 line이 없는 빈 상태·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ regexes: [], calls: [] })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
    })
  })

  it('② 검색 기록 대조: 모든 단계의 calls를 이은 목록 = 예제 실행 중 exec 호출 기록', () => {
    const { trace, output } = runWithTrace(source())
    // exec를 감싸도 결과가 바뀌지 않는다
    expect(output).toEqual(example.expectedOutput)

    const literalOf = (name: string): string => {
      for (const step of steps) {
        const found = step.state.regexes.find((r) => r.name === name)
        if (found) return found.literal
      }
      throw new Error(`카드가 없습니다: ${name}`)
    }
    const calls: ExecCall[] = steps.flatMap((s) => s.state.calls)
    expect(calls.length, '검색 횟수').toBe(trace.length)
    calls.forEach((c, i) => {
      const t = trace[i]
      const where = `검색 ${i + 1}`
      expect(literalOf(c.regex), `${where}: 정규 표현식`).toBe(t.re)
      expect(c.input, `${where}: input`).toBe(t.input)
      expect(c.before, `${where}: before`).toBe(t.before)
      expect(c.match, `${where}: match`).toEqual(
        t.start === null ? null : { start: t.start, end: t.end },
      )
      expect(c.after, `${where}: after`).toBe(t.after)
    })
  })

  it('③ 카드 lastIndex = 그 정규 표현식의 마지막 기록 after, lastIndexChanged는 값이 바뀐 단계에서만', () => {
    const { trace } = runWithTrace(source())
    let consumed = 0
    const lastAfter = new Map<string, number>() // 리터럴 → 마지막 after
    steps.forEach((step, i) => {
      const literalOf = (name: string): string | undefined =>
        step.state.regexes.find((r) => r.name === name)?.literal
      for (const c of step.state.calls) {
        const t = trace[consumed++]
        expect(t.re, `단계 ${i + 1}`).toBe(literalOf(c.regex))
        lastAfter.set(t.re, t.after)
      }
      const prev = i === 0 ? [] : steps[i - 1].state.regexes
      for (const card of step.state.regexes) {
        expect(card.lastIndex, `단계 ${i + 1}: ${card.name}.lastIndex`).toBe(
          lastAfter.get(card.literal) ?? 0,
        )
        const old = prev.find((p) => p.name === card.name)
        const changed = old !== undefined && old.lastIndex !== card.lastIndex
        expect(card.lastIndexChanged === true, `단계 ${i + 1}: ${card.name}.lastIndexChanged`).toBe(
          changed,
        )
      }
    })
    expect(consumed).toBe(trace.length)
  })

  it('④ call.method가 그 단계 줄의 소스에 나타나고, 입력 길이 ≤ 8, 카드 이름이 중복되지 않는다', () => {
    const lines = source().split('\n')
    steps.forEach((step, i) => {
      expect(duplicates(step.state.regexes.map((r) => r.name)), `단계 ${i + 1}`).toEqual([])
      for (const c of step.state.calls) {
        const text = lines[step.line!.from - 1]
        expect(text, `단계 ${i + 1}: ${c.regex}.${c.method}(`).toContain(`${c.regex}.${c.method}(`)
        expect(c.input.length, `단계 ${i + 1}: 입력 길이`).toBeLessThanOrEqual(8)
      }
    })
  })

  it('검색 줄이 아닌 단계(선언·출력)는 calls가 비어 있다', () => {
    const lines = source().split('\n')
    steps.slice(1).forEach((step, i) => {
      const text = lines[step.line!.from - 1]
      if (/\.(test|exec)\(/.test(text)) return
      expect(step.state.calls, `단계 ${i + 2}`).toEqual([])
    })
  })
})
