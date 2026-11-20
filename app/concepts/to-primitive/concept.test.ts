import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'
import { scenarios, type ToPrimitiveState } from './scenarios'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열) 또는 던져진 오류의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    return (e as Error).name
  }
}

// 호출 기록 probe: 대상에 메서드를 기록한 뒤 원래 메서드를 위임 호출하는 자기 프로퍼티를 정의한다.
// 원래 메서드는 대상이 상속한 것이므로(Object.prototype.valueOf, Array.prototype.toString,
// Date.prototype.toString 등) 동작은 그대로이고 호출 순서와 반환 종류만 드러난다.
const PRELUDE = `
var calls = [];
function kindOf(r) { return r !== null && (typeof r === 'object' || typeof r === 'function') ? 'object' : typeof r + ':' + String(r); }
function wrap(t, k, label) {
  var orig = t[k];
  Object.defineProperty(t, k, {
    value: function () { var r = orig.apply(this, arguments); calls.push([label, kindOf(r)]); return r; },
    configurable: true,
    writable: true,
  });
}
function show(v) { return typeof v === 'string' ? "'" + v + "'" : String(v); }
`

const run = (code: string): unknown => JSON.parse(runInNewContext(code) as string)

// --- 'use strict'; 접두 ---------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s: 지시어가 없어도 있어도 출력이 같다',
    (_id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      expect(runExample(STRICT + code)).toEqual(expectedOutput)
    },
  )
})

// --- 퀴즈 -------------------------------------------------------------------------------------

// content.mdx의 PredictQuiz를 읽어 정답 선택지가 예제의 expectedOutput을 ' / '로 이은 문자열과 같은지 검사한다.
describe('퀴즈 정답', () => {
  const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
    const body = m[1]
    const question = body.match(/question="([^"]*)"/)![1]
    const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
    const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
    const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
    const example = Number(question.match(/예제 (\d+)/)![1])
    return { choices, answer, example }
  })
  const numbers = [1, 2, 3, 4, 5, 6]

  it('퀴즈가 예제 1~6마다 하나씩 6개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(6)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const expected = concept.examples[n - 1].expectedOutput.join(' / ')
    expect(quiz.choices).toHaveLength(4)
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

// --- 비교표 -----------------------------------------------------------------------------------

type Row = {
  op: string // 연산 칸
  code: string // 예제 파일에 그대로 있어야 하는 코드
  hint: string // ToPrimitive 힌트 칸
  hintArg: 'default' | 'string' | 'number' // Symbol.toPrimitive 메서드가 받는 힌트
  hintExpr: string // Symbol.toPrimitive가 있는 twin(tw)으로 같은 연산을 하는 식
  method: string // 먼저 부르는 메서드 칸
  calls: string[] // 호출 기록 probe가 기대하는 순서
  result: string // 결과 칸
  example: number
  probe: string // 호출 기록 probe: 마지막 식이 결과 칸의 문구
}

const HINT_NONE = '없음 → number(Symbol.toPrimitive 없음)'
const O = `var o = { valueOf() { return 1; }, toString() { return 'two'; } }; wrap(o, 'valueOf', 'valueOf'); wrap(o, 'toString', 'toString');`

const table: Row[] = [
  {
    op: "o + ''",
    code: "o + ''",
    hint: HINT_NONE,
    hintArg: 'default',
    hintExpr: "tw + ''",
    method: 'valueOf',
    calls: ['valueOf'],
    result: "'1'",
    example: 1,
    probe: `${O} show(o + '')`,
  },
  {
    op: '`${o}`',
    code: '`${o}`',
    hint: 'string',
    hintArg: 'string',
    hintExpr: '`${tw}`',
    method: 'toString',
    calls: ['toString'],
    result: "'two'",
    example: 1,
    probe: `${O} show(\`\${o}\`)`,
  },
  {
    op: '+o',
    code: '+o',
    hint: 'number',
    hintArg: 'number',
    hintExpr: '+tw',
    method: 'valueOf',
    calls: ['valueOf'],
    result: '1',
    example: 2,
    probe: `${O} show(+o)`,
  },
  {
    op: 'o > 0',
    code: 'o > 0',
    hint: 'number',
    hintArg: 'number',
    hintExpr: 'tw > 0',
    method: 'valueOf',
    calls: ['valueOf'],
    result: 'true',
    example: 2,
    probe: `${O} show(o > 0)`,
  },
  {
    op: 'o == 1',
    code: 'o == 1',
    hint: HINT_NONE,
    hintArg: 'default',
    hintExpr: 'tw == 1',
    method: 'valueOf',
    calls: ['valueOf'],
    result: 'true',
    example: 2,
    probe: `${O} show(o == 1)`,
  },
  {
    op: 'String(o)',
    code: 'String(o)',
    hint: 'string',
    hintArg: 'string',
    hintExpr: 'String(tw)',
    method: 'toString',
    calls: ['toString'],
    result: "'two'",
    example: 2,
    probe: `${O} show(String(o))`,
  },
  {
    op: 'box[o] = true',
    code: 'box[o] = true;',
    hint: 'string',
    hintArg: 'string',
    hintExpr: 'var b = {}; b[tw] = true',
    method: 'toString',
    calls: ['toString'],
    result: "키 'two'",
    example: 2,
    probe: `${O} var box = {}; box[o] = true; '키 ' + show(Object.keys(box)[0])`,
  },
  {
    op: '[] + {}',
    code: '[] + {}',
    hint: HINT_NONE,
    hintArg: 'default',
    hintExpr: 'tw + {}',
    method: 'valueOf(객체라 건너뜀) → toString',
    calls: ['l.valueOf', 'l.toString', 'r.valueOf', 'r.toString'],
    result: "'[object Object]'",
    example: 3,
    probe: `var l = []; var r = {};
      wrap(l, 'valueOf', 'l.valueOf'); wrap(l, 'toString', 'l.toString');
      wrap(r, 'valueOf', 'r.valueOf'); wrap(r, 'toString', 'r.toString');
      show(l + r)`,
  },
  {
    op: 'd + 1',
    code: 'd + 1',
    hint: '없음 → default(Date의 Symbol.toPrimitive가 string처럼)',
    hintArg: 'default',
    hintExpr: '',
    method: '[Symbol.toPrimitive] → toString',
    calls: ['[Symbol.toPrimitive]', 'toString'],
    result: '문자열',
    example: 6,
    probe: `var d = new Date(0);
      var orig = Date.prototype[Symbol.toPrimitive];
      Object.defineProperty(d, Symbol.toPrimitive, {
        value: function (h) { calls.push(['[Symbol.toPrimitive]', 'hint:' + h]); return orig.call(this, h); },
      });
      wrap(d, 'toString', 'toString');
      typeof (d + 1) === 'string' ? '문자열' : typeof (d + 1)`,
  },
]

describe('비교표', () => {
  const rows = tableBody(mdx, ['연산', 'ToPrimitive 힌트', '먼저 부르는 메서드', '결과', '예제'])

  it('행이 9개이고 연산 칸이 정의와 같다', () => {
    expect(rows).toHaveLength(table.length)
    expect(rows.map((r) => r[0])).toEqual(table.map((t) => t.op))
  })

  it.each(table.map((t, i) => [i + 1, t] as const))('행 %i', (i, t) => {
    const row = rows[i - 1]
    // 칸 전체 문구를 정확히 비교한다(부분 문자열이 아니다).
    expect(row).toEqual([t.op, t.hint, t.method, t.result, String(t.example)])

    // 호출 기록 probe: 결과 칸과 먼저 부른 메서드 순서
    const out = run(`${PRELUDE}
      var value = eval(${JSON.stringify(t.probe)});
      JSON.stringify({ value: value, calls: calls.map(function (c) { return c[0]; }) });`) as {
      value: string
      calls: string[]
    }
    expect(out.value, `결과 칸: ${t.op}`).toBe(t.result)
    expect(out.calls, `호출 순서: ${t.op}`).toEqual(t.calls)

    // 힌트 칸: Symbol.toPrimitive가 있는 객체(twin)는 같은 연산에서 받은 힌트를 기록한다.
    if (t.hintExpr !== '') {
      const hints = run(`
        var hints = [];
        var tw = { [Symbol.toPrimitive](h) { hints.push(h); return 0; } };
        ${t.hintExpr};
        JSON.stringify(hints);`)
      expect(hints, `힌트: ${t.op}`).toEqual([t.hintArg])
    } else {
      // Date: 내장 [Symbol.toPrimitive]가 받은 힌트를 기록 probe가 남긴다.
      const hint = run(`${PRELUDE}
        var d = new Date(0);
        var orig = Date.prototype[Symbol.toPrimitive];
        var seen = [];
        Object.defineProperty(d, Symbol.toPrimitive, { value: function (h) { seen.push(h); return orig.call(this, h); } });
        d + 1;
        JSON.stringify(seen);`)
      expect(hint).toEqual([t.hintArg])
    }

    // 예제 칸 번호의 예제 파일에 코드가 그대로 있다.
    const file = exampleFilesByNumber(mdx).get(t.example)
    expect(file, `예제 ${t.example}`).toBeDefined()
    expect(readExample(file!)).toContain(t.code)
  })

  // 정규화된 칸이 아니라 원문 표 블록에서 검사한다. 정규화(태그 제거)는 칸 안의 <...>를 지우므로 놓친다.
  it('표 칸 원문에서 <code> 태그를 뺀 문구에 `<`가 없다', () => {
    const start = mdx.indexOf('<th className="border-border border px-3 py-2">연산</th>')
    expect(start).toBeGreaterThan(0)
    const block = mdx.slice(start, mdx.indexOf('</table>', start))
    const cells = [...block.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    expect(cells).toHaveLength(table.length * 5)
    for (const cell of cells) {
      expect(cell.replace(/<\/?code>/g, ''), cell).not.toMatch(/</)
    }
  })
})

// --- 시나리오 ---------------------------------------------------------------------------------

type Probe = { setup: string; vars: Record<string, string>; expr: string }

const hintOrderLines = readExample('hint-order.js').split('\n')
const typeErrorLines = readExample('type-error.js').split('\n')
const arrayLine1 = readExample('array-and-object.js').split('\n')[0]

// 시나리오 호출(call)마다: 식의 대상 이름(시뮬레이터 target → 변수), 설정 코드, 평가할 식.
const PROBES: Record<string, Record<string, Probe>> = {
  'hint-order': {
    "o + ''": { setup: hintOrderLines.slice(0, 11).join('\n'), vars: { o: 'o' }, expr: "o + ''" },
    '`${o}`': { setup: hintOrderLines.slice(0, 11).join('\n'), vars: { o: 'o' }, expr: '`${o}`' },
  },
  'array-and-object': {
    'a + 1': { setup: arrayLine1, vars: { a: 'a' }, expr: 'a + 1' },
    '[] + {}': { setup: 'var l = []; var r = {};', vars: { '[]': 'l', '{}': 'r' }, expr: 'l + r' },
  },
  'type-error': {
    'String(bare)': { setup: typeErrorLines[0], vars: { bare: 'bare' }, expr: 'String(bare)' },
    "stubborn + ''": {
      setup: typeErrorLines.slice(6, 14).join('\n'),
      vars: { stubborn: 'stubborn' },
      expr: "stubborn + ''",
    },
  },
}

// 시뮬레이터 상태에서 호출(call)별로 대상마다의 마지막 단계(attempts가 확정된 단계)를 모은다.
function terminalStates(id: string, call: string): { target: string; state: ToPrimitiveState }[] {
  const steps = scenarios.find((s) => s.id === id)!.steps.filter((s) => s.state.call === call)
  const targets: string[] = []
  for (const s of steps) if (!targets.includes(s.state.target!)) targets.push(s.state.target!)
  return targets.map((target) => ({
    target,
    state: steps.filter((s) => s.state.target === target).at(-1)!.state,
  }))
}

// 코드 표기 글자('two', 1)를 타입이 붙은 비교용 글자로 바꾼다(문자열 '1'과 숫자 1을 구분).
function typed(literal: string): string {
  return literal.startsWith("'") ? `string:${literal.slice(1, -1)}` : `number:${literal}`
}

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)
  const source = readExample(example.file)

  it('공통 불변식(코드 원문, 출력, 줄 범위)', () => {
    assertScenarioInvariants(scenario, example, source)
  })

  it('첫 단계: 프리렌더에서 읽히는 실행 전 상태', () => {
    const first = scenario.steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.output).toEqual([])
    expect(first.state.call).toBeNull()
    expect(first.state.attempts).toEqual([])
    expect(first.state.outcome).toBeNull()
  })

  it('명세 순서 불변식: 힌트 → Symbol.toPrimitive 확인 → ordinaryHint → 메서드 시도', () => {
    for (const { title, state } of scenario.steps) {
      const where = `${scenario.id} / ${title}`
      if (state.call === null) {
        expect(state, where).toMatchObject({
          target: null,
          hint: null,
          exotic: 'unchecked',
          ordinaryHint: null,
          attempts: [],
          outcome: null,
          after: null,
        })
        continue
      }
      expect(state.hint, where).not.toBeNull()
      // OrdinaryToPrimitive에 넘긴 값은 Symbol.toPrimitive가 없다고 확인한 뒤에만 있다.
      if (state.ordinaryHint !== null) expect(state.exotic, where).toBe('absent')
      if (state.exotic !== 'absent') {
        expect(state.ordinaryHint, where).toBeNull()
        expect(state.attempts, where).toEqual([])
      }
      if (state.ordinaryHint !== null) {
        // 힌트 string만 string이고, 힌트 없음과 number는 number다.
        expect(state.ordinaryHint, where).toBe(state.hint === 'string' ? 'string' : 'number')
        const order =
          state.ordinaryHint === 'string' ? ['toString', 'valueOf'] : ['valueOf', 'toString']
        expect(
          state.attempts.map((a) => a.method),
          where,
        ).toEqual(order)
      }
      const statuses = state.attempts.map((a) => a.status)
      const primitiveAt = statuses.indexOf('returned-primitive')
      if (primitiveAt >= 0) {
        // 원시 값을 얻으면 앞은 객체나 호출 불가였고, 남은 메서드는 부르지 않았다.
        expect(
          statuses.slice(0, primitiveAt).every((s) => s !== 'pending' && s !== 'not-called'),
          where,
        ).toBe(true)
        expect(
          statuses.slice(primitiveAt + 1).every((s) => s === 'not-called'),
          where,
        ).toBe(true)
        const a = state.attempts[primitiveAt]
        expect(state.outcome, where).toEqual({
          kind: 'primitive',
          value: a.value,
          type: typed(a.value!).split(':')[0],
        })
      } else {
        expect(state.outcome?.kind === 'primitive', where).toBe(false)
        expect(statuses.includes('not-called'), where).toBe(false)
      }
      if (state.outcome?.kind === 'TypeError') {
        expect(state.attempts.length, where).toBe(2)
        expect(
          statuses.every((s) => s === 'not-callable' || s === 'returned-object'),
          where,
        ).toBe(true)
      }
      if (state.after !== null) expect(state.outcome?.kind, where).toBe('primitive')
    }
  })

  const probes = PROBES[scenario.id]
  it.each(Object.entries(probes))(
    '호출 %s: 호출 기록 probe가 시뮬레이터 단계와 같다',
    (call, probe) => {
      const terminals = terminalStates(scenario.id, call)
      expect(terminals.map((t) => t.target)).toEqual(Object.keys(probe.vars))

      const expectedCalls: [string, string][] = []
      const expectedMissing: string[] = []
      for (const { target, state } of terminals) {
        const v = probe.vars[target]
        for (const a of state.attempts) {
          if (a.status === 'not-callable') expectedMissing.push(`${v}.${a.method}`)
          if (a.status === 'returned-object') expectedCalls.push([`${v}.${a.method}`, 'object'])
          if (a.status === 'returned-primitive')
            expectedCalls.push([`${v}.${a.method}`, typed(a.value!)])
        }
      }

      const wraps = Object.values(probe.vars)
        .flatMap((v) =>
          ['valueOf', 'toString'].map(
            (k) =>
              `if (typeof ${v}.${k} === 'function') wrap(${v}, '${k}', '${v}.${k}'); else missing.push('${v}.${k}');`,
          ),
        )
        .join('\n')
      const exotics = Object.values(probe.vars)
        .map((v) => `typeof ${v}[Symbol.toPrimitive]`)
        .join(', ')
      const result = run(`${PRELUDE}
      var missing = [];
      ${probe.setup}
      ${wraps}
      var error = null, value = null;
      try { value = ${probe.expr}; } catch (e) { error = e.name; }
      JSON.stringify({ calls: calls, missing: missing, error: error, value: value, exotics: [${exotics}] });`) as {
        calls: [string, string][]
        missing: string[]
        error: string | null
        value: unknown
        exotics: string[]
      }

      // Symbol.toPrimitive가 없다는 확인, 호출 순서·반환 종류, 호출할 수 없는 메서드
      expect(result.exotics.every((t) => t === 'undefined')).toBe(true)
      expect(result.calls).toEqual(expectedCalls)
      expect([...result.missing].sort()).toEqual([...expectedMissing].sort())

      // 마지막 결과: TypeError이거나, after가 연산 결과로 끝난다.
      const last = terminals.at(-1)!.state
      if (last.outcome?.kind === 'TypeError') {
        expect(result.error).toBe('TypeError')
      } else {
        expect(result.error).toBeNull()
        expect(last.after!.endsWith(`→ ${JSON.stringify(result.value)}`)).toBe(true)
      }
    },
  )
})

// --- 예제가 없는 주장의 탐침 ------------------------------------------------------------------

describe('예제가 없는 주장의 탐침', () => {
  it('본문: Symbol.toPrimitive가 객체를 돌려주면 valueOf가 있어도 넘어가지 않고 TypeError다', () => {
    expect(show('({ [Symbol.toPrimitive]() { return {}; } }) + ""')).toBe('TypeError')
    expect(
      show(
        'var called = false; try { ({ [Symbol.toPrimitive]() { return {}; }, valueOf() { called = true; return 1; } }) + ""; } catch (e) { e.name + " " + called; }',
      ),
    ).toBe('TypeError false')
  })

  it('본문: Symbol.toPrimitive 값이 undefined·null이면 없는 것으로 보고, 함수가 아닌 다른 값이면 TypeError다', () => {
    expect(show('({ [Symbol.toPrimitive]: undefined, valueOf() { return 1; } }) + ""')).toBe('1')
    expect(show('({ [Symbol.toPrimitive]: null, valueOf() { return 1; } }) + ""')).toBe('1')
    expect(show('({ [Symbol.toPrimitive]: 1, valueOf() { return 1; } }) + ""')).toBe('TypeError')
  })

  it('본문: number 힌트여도 원시 값이 둘 다 문자열이면 >는 문자열로 비교한다', () => {
    expect(show('[[10] > [9], [2] > [10]].join(" ")')).toBe('false true')
  })

  it('본문: new Date(Date 객체)는 ToPrimitive 없이 시각 값을 바로 읽는다(Symbol.toPrimitive를 부르지 않음)', () => {
    expect(
      show(
        'var d = new Date(123); var called = false; d[Symbol.toPrimitive] = function () { called = true; return 0; }; new Date(d).getTime() + " " + called',
      ),
    ).toBe('123 false')
  })

  it('본문: 인수 하나로 부르는 new Date(값)도 힌트 없이 ToPrimitive를 불러 valueOf가 먼저다', () => {
    expect(
      show(
        'var log = []; new Date({ valueOf() { log.push("v"); return 0; }, toString() { log.push("t"); return "2020-01-01"; } }).getTime() + " " + log.join(",")',
      ),
    ).toBe('0 v')
  })

  it('본문: Object.create(null) + ""도 TypeError이고 valueOf·toString이 없다', () => {
    expect(show("Object.create(null) + ''")).toBe('TypeError')
    expect(
      show('var b = Object.create(null); b.valueOf === undefined && b.toString === undefined'),
    ).toBe('true')
  })

  it('본문: 양쪽이 모두 객체인 ==와 obj == null은 valueOf·toString을 부르지 않는다', () => {
    const code = `${PRELUDE}
      var o = { valueOf() { return 1; }, toString() { return 'two'; } };
      var p = { valueOf() { return 1; }, toString() { return 'two'; } };
      wrap(o, 'valueOf', 'valueOf'); wrap(o, 'toString', 'toString');
      wrap(p, 'valueOf', 'valueOf'); wrap(p, 'toString', 'toString');
      var r = [o == o, o == p, o == null, o == undefined];
      JSON.stringify({ r: r, calls: calls });`
    expect(run(code)).toEqual({ r: [true, false, false, false], calls: [] })
  })

  it('본문: 배열과 일반 객체는 valueOf를 상속하고 valueOf가 자기 자신을 돌려준다', () => {
    expect(
      show(
        'var a = [1, 2]; Object.hasOwn(a, "valueOf") + " " + (a.valueOf === Object.prototype.valueOf)',
      ),
    ).toBe('false true')
    expect(show('var o = {}; Object.hasOwn(o, "valueOf") + " " + (o.valueOf() === o)')).toBe(
      'false true',
    )
    expect(show('[].toString === Array.prototype.toString && [1, 2].toString()')).toBe('1,2')
  })

  it('본문: Symbol.toStringTag가 없는 일반 객체의 toString은 [object Object]이고 태그를 바꾸면 달라진다', () => {
    expect(show('({}).toString()')).toBe('[object Object]')
    expect(show("({ [Symbol.toStringTag]: 'X' }).toString()")).toBe('[object X]')
  })

  it('본문: ![]는 ToPrimitive 없이 false이고 [] == ![]는 true다', () => {
    const code = `${PRELUDE}
      var a = []; wrap(a, 'valueOf', 'valueOf'); wrap(a, 'toString', 'toString');
      var neg = !a;
      var before = calls.length;
      var eq = a == neg;
      JSON.stringify({ neg: neg, before: before, eq: eq, calls: calls.map(function (c) { return c[0]; }) });`
    expect(run(code)).toEqual({ neg: false, before: 0, eq: true, calls: ['valueOf', 'toString'] })
  })

  it("본문: o > 0은 valueOf의 1이라 true이고, toString이 먼저였다면 'two' > 0이라 false다", () => {
    expect(show("({ valueOf() { return 1; }, toString() { return 'two'; } }) > 0")).toBe('true')
    expect(show("'two' > 0")).toBe('false')
  })

  it('본문: 래퍼 객체(String·Number·Boolean·BigInt)의 valueOf는 감싼 원시 값을 돌려준다', () => {
    expect(
      show(
        "[new String('hi').valueOf() === 'hi', new Number(5).valueOf() === 5, new Boolean(false).valueOf() === false, Object(1n).valueOf() === 1n].join(' ')",
      ),
    ).toBe('true true true true')
  })

  it('본문: [5] * 2, [1] == 1', () => {
    expect(show('[5] * 2')).toBe('10')
    expect(show('[1] == 1')).toBe('true')
  })

  it('본문: Date는 힌트 없음에서 문자열이고 -에서는 시각 값을 쓴다', () => {
    expect(show('var d = new Date(0); typeof (d + 1) + " " + (d - 1)')).toBe('string -1')
  })

  it('본문: Symbol.toPrimitive가 있으면 valueOf보다 먼저 쓰이고 valueOf는 불리지 않는다', () => {
    const code = `
      var log = [];
      var priced = { [Symbol.toPrimitive](h) { return h; }, valueOf() { log.push('v'); return 1; } };
      JSON.stringify([priced + '', \`\${priced}\`, +priced, log.length]);`
    expect(run(code)).toEqual(['default', 'string', null, 0])
  })

  it('본문: five - 1은 4, five + 1은 "51"이고 두 식 모두 toString을 부르지 않는다', () => {
    const code = `${PRELUDE}
      var five = { valueOf() { return '5'; }, toString() { return 'x'; } };
      wrap(five, 'toString', 'toString');
      JSON.stringify([five - 1, five + 1, calls.length]);`
    expect(run(code)).toEqual([4, '51', 0])
  })
})

// --- 메타와 본문 조건 -------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary에 "객체"가 있어 홈의 "객체" 검색에 걸린다', () => {
    expect(filterConcepts([concept], '객체').map((c) => c.slug)).toEqual(['to-primitive'])
  })

  it('order는 305이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(305)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('한정 문구: toStringTag·원시 값 ==·Symbol.toPrimitive 없음 조건이 본문에 있다', () => {
    expect(mdx).toContain('`Symbol.toStringTag`가 없는 일반 객체')
    expect(mdx).toContain('다른 쪽이 원시 값(null·undefined 제외)인 `==`')
    expect(mdx).toContain('없을 때만 OrdinaryToPrimitive에 number를')
  })

  it('Date의 "All other built-in" 문장은 인용하지 않는다', () => {
    expect(mdx).not.toMatch(/All other/)
  })
})
