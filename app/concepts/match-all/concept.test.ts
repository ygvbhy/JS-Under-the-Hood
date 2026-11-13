import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { createContext, runInContext, runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type MatchCall } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

// --- 호출 기록 헬퍼 ------------------------------------------------------------------------------

type ExecRecord = {
  kind: 'exec'
  isOriginal: boolean // this가 코드의 최상위 var re인가
  input: string
  before: number
  text: string | null
  start: number | null
  end: number | null
  after: number
  reLastIndex: number | null // 그 시점의 re.lastIndex (re가 없으면 null)
}
type TraceRecord =
  | ExecRecord
  | { kind: 'next-start' }
  | { kind: 'next-end'; done: boolean; cloneLastIndex: number | null }

// 새 컨텍스트에서 RegExp.prototype.exec와 %RegExpStringIteratorPrototype%.next를
// 원래 함수를 부르는 기록용 함수로 감싼 뒤 예제를 실행한다.
// RegExpExec가 exec 프로퍼티를 찾아 부르므로 next 안의 검색이 기록된다.
// `re`는 예제 최상위의 var(전역 프로퍼티)이고, 감싼 함수는 전역에서 그 이름을 찾아 this와 비교한다.
// 복제본은 코드에서 닿을 수 없으므로 마지막 exec의 this를 복제본으로 보고 next가 끝날 때의 lastIndex를 기록한다.
function runWithTrace(source: string): { trace: TraceRecord[]; output: string[] } {
  const trace: TraceRecord[] = []
  const output: string[] = []
  const context = createContext({
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  })
  const install = runInContext(
    `(function (rec) {
  var origExec = RegExp.prototype.exec;
  var lastClone = null;
  RegExp.prototype.exec = function (s) {
    var before = this.lastIndex;
    var r = origExec.call(this, s);
    lastClone = this;
    var hasRe = typeof re !== 'undefined' && re !== undefined;
    rec({
      kind: 'exec',
      isOriginal: hasRe && this === re,
      input: s,
      before: before,
      text: r ? r[0] : null,
      start: r ? r.index : null,
      end: r ? r.index + r[0].length : null,
      after: this.lastIndex,
      reLastIndex: hasRe ? re.lastIndex : null,
    });
    return r;
  };
  var proto = Object.getPrototypeOf(''.matchAll(/a/g));
  var origNext = proto.next;
  proto.next = function () {
    rec({ kind: 'next-start' });
    var r = origNext.call(this);
    rec({ kind: 'next-end', done: r.done, cloneLastIndex: lastClone ? lastClone.lastIndex : null });
    return r;
  };
})`,
    context,
  ) as (rec: (r: TraceRecord) => void) => void
  install((r) => trace.push(r))
  runInContext(source, context, { timeout: 2000 })
  return { trace, output }
}

type NextGroup = { exec: ExecRecord | null; done: boolean; cloneLastIndex: number | null }

// 기록을 next 호출 단위로 묶는다. 한 next 안에서 exec는 최대 한 번이다.
function groupTrace(trace: TraceRecord[]): NextGroup[] {
  const groups: NextGroup[] = []
  let current: NextGroup | null = null
  for (const r of trace) {
    if (r.kind === 'next-start') {
      current = { exec: null, done: false, cloneLastIndex: null }
    } else if (r.kind === 'exec') {
      expect(current, 'exec는 next 안에서만 불립니다').not.toBeNull()
      expect(current!.exec, '한 next 안의 exec는 최대 한 번입니다').toBeNull()
      current!.exec = r
    } else {
      current!.done = r.done
      current!.cloneLastIndex = r.cloneLastIndex
      groups.push(current!)
      current = null
    }
  }
  return groups
}

type ScenarioGroup = {
  branch: 'done' | 'miss' | 'hit'
  exec: Extract<MatchCall, { kind: 'exec' }> | null
  advance: Extract<MatchCall, { kind: 'advance' }> | null
}

function groupCalls(calls: MatchCall[]): ScenarioGroup[] {
  const groups: ScenarioGroup[] = []
  for (const c of calls) {
    if (c.kind === 'next') groups.push({ branch: c.branch, exec: null, advance: null })
    else if (c.kind === 'exec') groups[groups.length - 1].exec = c
    else if (c.kind === 'advance') groups[groups.length - 1].advance = c
  }
  return groups
}

const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

// 다른 realm의 오류라 instanceof 대신 name으로 검사한다.
function errorName(code: string): string {
  try {
    runInNewContext(code, { console: { log: () => {} } })
  } catch (e) {
    return (e as Error).name
  }
  return 'no error'
}

const run = (code: string): unknown => runInNewContext(code)

// --- 본문 주장 검증 ------------------------------------------------------------------------------

describe('본문 주장 검증', () => {
  it('Symbol.matchAll을 직접 부르면 g 검사를 거치지 않아 g가 없는 정규식도 매치 하나를 내고 끝난다', () => {
    expect(
      run(
        "var a = []; for (var m of /a/[Symbol.matchAll]('aa')) a.push(m.index); JSON.stringify(a)",
      ),
    ).toBe('[0]')
    expect(errorName("'aa'.matchAll(/a/)")).toBe('TypeError')
  })

  it('Array.from과 스프레드와 for...of가 같은 이터레이터를 끝까지 꺼내며, 끝난 뒤에는 어느 방법으로도 비어 있다', () => {
    expect(
      run(`
var it = 'a1b2'.matchAll(/[0-9]/g);
var viaFrom = Array.from(it).length;
var viaSpread = [...it].length;
var n = 0;
for (var m of it) n++;
var it2 = 'a1b2'.matchAll(/[0-9]/g);
var viaSpread2 = [...it2].length;
[viaFrom, viaSpread, n, viaSpread2].join(',')
`),
    ).toBe('2,0,0,2')
  })

  it('이터레이터에는 return 메서드가 없다(%RegExpStringIteratorPrototype%와 %Iterator.prototype% 포함)', () => {
    expect(
      run(`
var it = 'a'.matchAll(/a/g);
var proto = Object.getPrototypeOf(it);
var iterProto = Object.getPrototypeOf(proto);
[
  typeof it.return,
  'return' in it,
  Object.prototype.hasOwnProperty.call(proto, 'return'),
  Object.prototype.hasOwnProperty.call(iterProto, 'return'),
].join(',')
`),
    ).toBe('undefined,false,false,false')
  })

  it('이터레이터의 프로토타입 체인은 %Iterator.prototype%을 거치고 toStringTag는 RegExp String Iterator다', () => {
    expect(
      run(`
var it = 'a'.matchAll(/a/g);
var proto = Object.getPrototypeOf(it);
var iterProto = Object.getPrototypeOf(proto);
var arrayIterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
[
  iterProto === arrayIterProto,
  proto[Symbol.toStringTag],
  Object.prototype.hasOwnProperty.call(it, Symbol.iterator),
  Object.prototype.hasOwnProperty.call(iterProto, Symbol.iterator),
].join(',')
`),
    ).toBe('true,RegExp String Iterator,false,true')
  })

  it('%Iterator.prototype%을 상속하므로 이터레이터 헬퍼를 쓸 수 있다', () => {
    expect(run("var it = '1a2'.matchAll(/[0-9]/g); typeof it.map + ',' + typeof it.toArray")).toBe(
      'function,function',
    )
  })

  it('원래 lastIndex 3은 복제본이 이어받아 4번 칸부터 찾고, 끝까지 꺼낸 뒤에도 원래 값은 3이다', () => {
    expect(
      run(`
var re = /[0-9]/g;
re.lastIndex = 3;
var a = [];
for (var m of '1a2b3'.matchAll(re)) a.push(m.index);
JSON.stringify(a) + ' ' + re.lastIndex
`),
    ).toBe('[4] 3')
  })

  it('복제본은 원래 정규식의 다른 자기 프로퍼티를 옮기지 않는다', () => {
    expect(
      run(`
var re = /a/g;
re.foo = 1;
var seen;
var orig = RegExp.prototype.exec;
RegExp.prototype.exec = function (s) { seen = String(this.foo) + ',' + String(this === re); return orig.call(this, s); };
'a'.matchAll(re).next();
RegExp.prototype.exec = orig;
seen
`),
    ).toBe('undefined,false')
  })

  it('빈 매치에서 exec는 lastIndex를 매치 시작 위치로 옮긴다: (?=b)는 0에서 시작해 2에서 매치하고 lastIndex가 2가 된다', () => {
    const { trace } = runWithTrace(`
var re = /(?=b)/g;
var it = 'aab'.matchAll(re);
it.next();
`)
    const exec = trace.find((r): r is ExecRecord => r.kind === 'exec')!
    expect([exec.before, exec.start, exec.end, exec.after]).toEqual([0, 2, 2, 2])
  })

  it('빈 매치 뒤 next가 lastIndex를 한 칸 더 옮긴다: 첫 next가 끝났을 때 복제본 lastIndex는 3이다', () => {
    const { trace } = runWithTrace(`
var re = /(?=b)/g;
var it = 'aab'.matchAll(re);
it.next();
`)
    const end = trace.find((r) => r.kind === 'next-end') as { cloneLastIndex: number }
    expect(end.cloneLastIndex).toBe(3)
  })

  it('x*처럼 빈 문자열에 매치하는 정규식은 문자열 끝 위치(index 3)에서도 빈 매치를 낸다', () => {
    expect(
      run("var a = []; for (var m of 'abc'.matchAll(/x*/g)) a.push(m.index); JSON.stringify(a)"),
    ).toBe('[0,1,2,3]')
  })

  it('단순화한 인수 경로: Symbol.matchAll 메서드를 가진 값, null, toString을 가진 값, Symbol.match가 false인 정규식', () => {
    expect(
      run("JSON.stringify([...'x'.matchAll({ [Symbol.matchAll]() { return ['custom']; } })])"),
    ).toBe('["custom"]')
    expect(
      run(
        "var a = []; for (var m of 'nullnull'.matchAll(null)) a.push(m.index); JSON.stringify(a)",
      ),
    ).toBe('[0,4]')
    expect(
      run(
        "var a = []; for (var m of 'abc'.matchAll({ toString() { return 'b'; } })) a.push(m.index); JSON.stringify(a)",
      ),
    ).toBe('[1]')
    expect(
      run(
        "var r = /a/; r[Symbol.match] = false; var a = []; for (var m of 'aa'.matchAll(r)) a.push(m.index); JSON.stringify(a)",
      ),
    ).toBe('[0]')
  })

  it('Symbol.match가 undefined이면 정규식으로 판정되어 g 검사로 TypeError이고, false·null·0이면 g 검사를 건너뛴다', () => {
    const errorOf = (code: string) => run(`try { ${code}; 'ok' } catch (e) { e.name }`) as string
    expect(errorOf("var r = /a/; r[Symbol.match] = undefined; 'aa'.matchAll(r)")).toBe('TypeError')
    for (const v of ['false', 'null', '0']) {
      expect(
        run(
          `var r = /a/; r[Symbol.match] = ${v}; var a = []; for (var m of 'aa'.matchAll(r)) a.push(m.index); JSON.stringify(a)`,
        ),
      ).toBe('[0]')
    }
  })

  it('문자열 인수의 정규식 특수 문자: 점은 아무 글자에 매치하고, 패턴으로 읽을 수 없으면 SyntaxError, RegExp.escape로 글자 그대로 찾는다', () => {
    expect(run("JSON.stringify([...'1.5'.matchAll('.')].map(function (m) { return m[0]; }))")).toBe(
      '["1",".","5"]',
    )
    // 점은 줄바꿈 같은 줄 끝 문자에는 매치하지 않는다(문자열 인수의 flags는 g뿐이라 s 플래그도 없다)
    expect(
      run("JSON.stringify([...'a\\nb'.matchAll('.')].map(function (m) { return m.index; }))"),
    ).toBe('[0,2]')
    expect(run("try { 'a(b'.matchAll('('); 'ok' } catch (e) { e.name }")).toBe('SyntaxError')
    expect(
      run(
        "JSON.stringify([...'1.5'.matchAll(RegExp.escape('.'))].map(function (m) { return m.index; }))",
      ),
    ).toBe('[1]')
  })

  it('제너레이터 객체는 return 메서드가 있어 break하면 끝나고 남은 값을 꺼낼 수 없다', () => {
    expect(
      run(
        'function* g() { yield 1; yield 2; yield 3; } var it = g(); for (var x of it) break; JSON.stringify([typeof it.return, [...it]])',
      ),
    ).toBe('["function",[]]')
  })
})

// --- 시나리오 검사 -------------------------------------------------------------------------------

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 next-one-by-one, inherit-empty이다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['next-one-by-one', 'inherit-empty'])
  })

  it('라벨과 exampleId가 meta.examples에 있다', () => {
    expect(scenarios.map((s) => s.label)).toEqual([
      '다음 매치를 하나씩',
      'lastIndex 이어받기와 빈 매치',
    ])
    expect(scenarios.map((s) => s.exampleId)).toEqual(['next-one-by-one', 'inherit-empty'])
    for (const s of scenarios) {
      expect(
        concept.examples.some((e) => e.id === s.exampleId),
        s.exampleId,
      ).toBe(true)
    }
  })

  it('⑥ 단계 수는 각각 11, 12이고 20 이하다(a11y e2e의 20단계 이하 전제)', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([11, 12])
    for (const s of scenarios) expect(s.steps.length).toBeLessThanOrEqual(20)
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)!
  const source = () => readExample(example.file)
  const lines = () => source().split('\n')
  const steps = scenario.steps
  const cloneOf = (i: number) => steps[i].state.regexes.find((r) => r.kind === 'clone')
  const originalOf = (i: number) => steps[i].state.regexes.find((r) => r.kind === 'original')

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example, source())
  })

  it('첫 단계는 line이 없는 빈 상태·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({
      regexes: [],
      iterator: null,
      input: null,
      calls: [],
      results: [],
    })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
    })
  })

  it('(1)(2) next 호출 기록 대조: 순서·갈래, 각 next 안의 exec(before·match·after), advance의 to = next가 끝난 시점의 복제본 lastIndex', () => {
    const { trace, output } = runWithTrace(source())
    // 메서드를 감싸도 결과가 바뀌지 않는다
    expect(output).toEqual(example.expectedOutput)

    const actual = groupTrace(trace)
    const expected = groupCalls(steps.flatMap((s) => s.state.calls))
    expect(expected.length, 'next 호출 횟수').toBe(actual.length)
    expected.forEach((g, i) => {
      const t = actual[i]
      const where = `next ${i + 1}`
      if (g.branch === 'done') {
        expect(t.exec, `${where}: [[Done]]이면 exec 없음`).toBeNull()
        expect(t.done, `${where}: done`).toBe(true)
        expect(g.exec, `${where}: 시나리오도 exec 없음`).toBeNull()
        expect(g.advance, `${where}: advance 없음`).toBeNull()
        return
      }
      expect(t.exec, `${where}: exec 있음`).not.toBeNull()
      expect(g.exec, `${where}: 시나리오 exec`).not.toBeNull()
      expect(g.exec!.before, `${where}: before`).toBe(t.exec!.before)
      expect(g.exec!.after, `${where}: after`).toBe(t.exec!.after)
      expect(g.exec!.match, `${where}: match`).toEqual(
        t.exec!.start === null ? null : { start: t.exec!.start, end: t.exec!.end },
      )
      if (g.branch === 'miss') {
        expect(t.exec!.start, `${where}: miss는 null`).toBeNull()
        expect(t.done, `${where}: done`).toBe(true)
        expect(g.advance, `${where}: advance 없음`).toBeNull()
      } else {
        expect(t.done, `${where}: hit은 done false`).toBe(false)
        const empty = t.exec!.text === ''
        expect(g.advance !== null, `${where}: advance는 빈 매치에서만`).toBe(empty)
        if (g.advance) {
          expect(g.advance.from, `${where}: advance.from = exec 뒤 lastIndex`).toBe(t.exec!.after)
          expect(g.advance.to, `${where}: advance.to = next가 끝난 시점의 lastIndex`).toBe(
            t.cloneLastIndex,
          )
        } else {
          expect(t.cloneLastIndex, `${where}: 빈 매치가 아니면 exec 뒤 값 그대로`).toBe(
            t.exec!.after,
          )
        }
      }
    })
  })

  it('(3) exec의 this는 항상 원래 re가 아니다', () => {
    const { trace } = runWithTrace(source())
    const execs = trace.filter((r): r is ExecRecord => r.kind === 'exec')
    expect(execs.length).toBeGreaterThan(0)
    for (const e of execs) expect(e.isOriginal).toBe(false)
  })

  it('(4) 호출이 있는 단계의 줄은 .next( 또는 for (를 포함하고, 그 밖의 단계(matchAll 줄 포함)는 calls가 비며, matchAll 줄까지 exec가 0번이다', () => {
    const src = lines()
    steps.slice(1).forEach((step, i) => {
      const text = src[step.line!.from - 1]
      const searchLine = text.includes('.next(') || text.includes('for (')
      if (step.state.calls.length > 0) {
        expect(searchLine, `단계 ${i + 2}: ${text}`).toBe(true)
      } else {
        expect(text.includes('.next('), `단계 ${i + 2}: next 줄인데 calls가 빔`).toBe(false)
      }
      for (const c of step.state.calls) {
        if (c.kind === 'get-iterator') expect(text, `단계 ${i + 2}`).toContain('for (')
        if (c.kind === 'next') expect(searchLine, `단계 ${i + 2}`).toBe(true)
      }
      if (text.includes('.matchAll(')) {
        expect(step.state.calls, `단계 ${i + 2}: matchAll 줄`).toEqual([])
      }
    })
    const { trace } = runWithTrace(source())
    const firstNext = trace.findIndex((r) => r.kind === 'next-start')
    expect(trace.slice(0, firstNext).filter((r) => r.kind === 'exec')).toEqual([])
  })

  it('(5) 첫 exec의 before = matchAll 단계의 복제본 lastIndex, 각 exec 시점의 re.lastIndex = 그 단계 re 카드 값', () => {
    const { trace } = runWithTrace(source())
    const execs = trace.filter((r): r is ExecRecord => r.kind === 'exec')
    const matchAllStep = steps.findIndex((s) => s.state.regexes.some((r) => r.kind === 'clone'))
    expect(matchAllStep).toBeGreaterThan(0)
    expect(execs[0].before).toBe(cloneOf(matchAllStep)!.lastIndex)
    expect(cloneOf(matchAllStep)!.literal).toBe(originalOf(matchAllStep)!.literal)

    let consumed = 0
    steps.forEach((step, i) => {
      for (const c of step.state.calls) {
        if (c.kind !== 'exec') continue
        const t = execs[consumed++]
        expect(t.reLastIndex, `단계 ${i + 1}: re.lastIndex`).toBe(originalOf(i)!.lastIndex)
        expect(t.input, `단계 ${i + 1}: input`).toBe(step.state.input!.text)
        expect(step.state.input!.match, `단계 ${i + 1}: 매치 범위`).toEqual(
          t.start === null ? null : { start: t.start, end: t.end },
        )
      }
    })
    expect(consumed).toBe(execs.length)
  })

  it('복제본 카드의 lastIndex = next가 끝난 시점의 값, 카드·슬롯·결과 목록이 기록과 맞고 lastIndexChanged는 값이 바뀐 단계에서만 true다', () => {
    const { trace } = runWithTrace(source())
    const groups = groupTrace(trace)
    let consumedGroups = 0
    let done = false
    const results: { text: string; index: number }[] = []
    steps.forEach((step, i) => {
      for (let k = 0; k < groupCalls(step.state.calls).length; k++) {
        const t = groups[consumedGroups++]
        if (t.done) done = true
        if (t.exec && t.exec.text !== null && !t.done) {
          results.push({ text: t.exec.text, index: t.exec.start! })
        }
        expect(cloneOf(i)!.lastIndex, `단계 ${i + 1}: 복제본 lastIndex`).toBe(
          t.cloneLastIndex ?? cloneOf(i)!.lastIndex,
        )
      }
      expect(step.state.results, `단계 ${i + 1}: results`).toEqual(results)
      if (step.state.iterator) {
        expect(step.state.iterator.done, `단계 ${i + 1}: [[Done]]`).toBe(done)
        expect(step.state.iterator.global, `단계 ${i + 1}: [[Global]]`).toBe(true)
        expect(step.state.iterator.unicode, `단계 ${i + 1}: [[Unicode]]`).toBe(false)
      }
      const names = step.state.regexes.map((r) => r.name)
      expect(duplicates(names), `단계 ${i + 1}: 카드 이름`).toEqual([])
      const prev = i === 0 ? [] : steps[i - 1].state.regexes
      for (const card of step.state.regexes) {
        const old = prev.find((p) => p.name === card.name)
        const changed = old !== undefined && old.lastIndex !== card.lastIndex
        expect(card.lastIndexChanged === true, `단계 ${i + 1}: ${card.name}.lastIndexChanged`).toBe(
          changed,
        )
      }
    })
    expect(consumedGroups).toBe(groups.length)
  })

  it('input은 matchAll 단계부터 있고 복제본 카드·이터레이터 슬롯과 함께 나타난다', () => {
    const src = lines()
    let appeared = false
    steps.slice(1).forEach((step, k) => {
      const i = k + 1
      const hasClone = step.state.regexes.some((r) => r.kind === 'clone')
      if (src[step.line!.from - 1].includes('.matchAll(')) appeared = true
      expect(hasClone, `단계 ${i + 1}: 복제본`).toBe(appeared)
      expect(step.state.iterator !== null, `단계 ${i + 1}: 슬롯`).toBe(appeared)
      expect(step.state.input !== null, `단계 ${i + 1}: input`).toBe(appeared)
    })
  })
})
