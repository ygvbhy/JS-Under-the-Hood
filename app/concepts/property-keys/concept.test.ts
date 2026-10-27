import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext, Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type ObjectBox, type PropertyState, type Val } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string): string => readFileSync(join(examplesDir, file), 'utf8')

// vm 컨텍스트에서 던진 오류는 다른 realm의 객체라 instanceof 대신 name으로 검사한다.
const errorNameOf = (source: string): string | null => {
  try {
    runInNewContext(source)
    return null
  } catch (e) {
    return (e as Error).name
  }
}

describe('본문 주장 검증', () => {
  it('`o.1`은 파싱 단계에서 SyntaxError', () => {
    expect(() => new Script('const o = {}; o.1;')).toThrow(SyntaxError)
  })

  describe('undefined·null의 프로퍼티 접근은 TypeError, 없는 프로퍼티 읽기는 오류가 아니다', () => {
    it('`o.missing`은 오류 없이 undefined', () => {
      expect(errorNameOf('const o = {}; o.missing;')).toBeNull()
      expect(runInNewContext('const o = {}; o.missing')).toBeUndefined()
    })

    it('`o.missing.x`는 TypeError', () => {
      expect(errorNameOf('const o = {}; o.missing.x;')).toBe('TypeError')
    })

    it('`o.v.x`(v: null)는 TypeError', () => {
      expect(errorNameOf('const o = { v: null }; o.v.x;')).toBe('TypeError')
    })
  })

  it('예제에서 없는 키로 읽는 키는 Object.prototype에도 없다', () => {
    const missingKeys = ['b', 'c', 'a', '01', '1.0']
    for (const k of missingKeys) {
      expect(k in Object.prototype, k).toBe(false)
    }
    // 예제 원문에 실제로 쓰이는 키인지 확인한다.
    expect(readExample('add-delete.js')).toContain('box.b')
    expect(readExample('add-delete.js')).toContain('box.c')
    expect(readExample('add-delete.js')).toContain('box.a')
    expect(readExample('number-key.js')).toContain("t['01']")
    expect(readExample('number-key.js')).toContain("t['1.0']")
  })
})

// --- L2: 시나리오 검사 --------------------------------------------------------------------------
// 공통 불변식 + 예제를 단계의 줄까지 실제로 실행한 결과와 상태 대조 + 키 재평가 + 결과 종류 + changed 계산

function fail(message: string): never {
  expect.fail(message)
  throw new Error(message)
}

const isRef = (v: Binding['value']): v is { kind: 'object'; id: string } => 'kind' in v
const sameVal = (a: Val, b: Val): boolean => a.type === b.type && a.display === b.display
const sameValue = (a: Binding['value'], b: Binding['value']): boolean =>
  isRef(a) || isRef(b) ? isRef(a) && isRef(b) && a.id === b.id : sameVal(a, b)
const duplicates = (items: string[]): string[] =>
  items.filter((item, i) => items.indexOf(item) !== i)

type Snap = {
  name: string
  v:
    | { kind: 'primitive'; t: string; s: string }
    | { kind: 'object'; identity: number; props: [string, string, string][] }
}

// 예제의 1..to 줄 + 스냅샷 코드를 실행한다. 스냅샷은 `__snap = …` sloppy 전역 대입으로 sandbox에서 읽는다.
function runUntil(
  source: string,
  to: number,
): { snap: Snap[]; output: string[]; declared: string[] } {
  const code = source.split('\n').slice(0, to).join('\n')
  const declared = [...code.matchAll(/^(?:const|let|var) (\w+)/gm)].map((m) => m[1])
  const output: string[] = []
  const sandbox: Record<string, unknown> = {
    console: { log: (...args: unknown[]) => output.push(format(...args)) },
  }
  const pairs = declared.map((n) => `[${JSON.stringify(n)}, ${n}]`).join(', ')
  const snapshot = `
__snap = JSON.stringify((function (pairs) {
  var seen = [];
  return pairs.map(function (p) {
    var v = p[1];
    if (typeof v === 'object' && v !== null) {
      var idx = seen.indexOf(v);
      if (idx < 0) { seen.push(v); idx = seen.length - 1; }
      return { name: p[0], v: { kind: 'object', identity: idx, props: Object.keys(v).map(function (k) { return [k, typeof v[k], String(v[k])]; }) } };
    }
    return { name: p[0], v: { kind: 'primitive', t: typeof v, s: String(v) } };
  });
})([${pairs}]));`
  runInNewContext(`${code}\n${snapshot}`, sandbox, { timeout: 2000 })
  return { snap: JSON.parse(sandbox.__snap as string) as Snap[], output, declared }
}

// 대괄호 안 식을 직전 줄까지 실행한 컨텍스트에서 다시 평가한다.
function evalKeyExpr(
  source: string,
  beforeLine: number,
  keyExpr: string,
): { t: string; s: string } {
  const code = source.split('\n').slice(0, beforeLine).join('\n')
  const sandbox: Record<string, unknown> = { console: { log: () => undefined } }
  runInNewContext(`${code}\n__k = (${keyExpr});\n__t = typeof __k; __s = String(__k);`, sandbox, {
    timeout: 2000,
  })
  return { t: sandbox.__t as string, s: sandbox.__s as string }
}

describe('시나리오 id', () => {
  it('시나리오 id가 중복되지 않고 순서는 same-key, dot-vs-bracket, add-delete다', () => {
    expect(duplicates(scenarios.map((s) => s.id))).toEqual([])
    expect(scenarios.map((s) => s.id)).toEqual(['same-key', 'dot-vs-bracket', 'add-delete'])
  })

  it('단계 수는 9 / 7 / 10이다', () => {
    expect(scenarios.map((s) => s.steps.length)).toEqual([9, 7, 10])
  })
})

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = concept.examples.find((e) => e.id === scenario.exampleId)
  const source = () => readFileSync(join(examplesDir, example!.file), 'utf8')
  const steps = scenario.steps
  const lines = () => source().split('\n')
  const lineTextOf = (i: number): string => {
    const line = steps[i].line
    expect(line, `단계 ${i + 1}: line이 필요합니다`).toBeDefined()
    expect(line!.from, `단계 ${i + 1}: line은 한 줄이어야 합니다`).toBe(line!.to)
    return lines()[line!.from - 1]
  }
  // 접근 식이 없는 줄: 선언문, JSON.stringify 출력
  const hasAccess = (text: string) => !/^const /.test(text.trim()) && !/JSON\.stringify/.test(text)
  // 접근 식의 대상 객체(박스)를 현재 단계 상태에서 찾는다.
  const targetOf = (state: PropertyState, code: string): ObjectBox => {
    const name = /^(\w+)[.[]/.exec(code)?.[1]
    const binding = state.bindings.find((b) => b.name === name)
    if (!binding || !isRef(binding.value)) return fail(`접근 대상 "${name}"이 객체 변수가 아닙니다`)
    const id = binding.value.id
    return state.objects.find((o) => o.id === id) ?? fail(`객체 ${id}가 objects에 없습니다`)
  }

  it('exampleId가 meta.examples에 있다', () => {
    expect(example, `meta.examples에 "${scenario.exampleId}"가 없습니다`).toBeDefined()
  })

  it('공통 불변식(코드 원문, 출력, line 범위, 단계 수)을 만족한다', () => {
    assertScenarioInvariants(scenario, example!, source())
  })

  it('첫 단계는 line이 없는 빈 상태·빈 출력이고, 나머지 단계는 모두 한 줄 line이 있다', () => {
    const first = steps[0]
    expect(first.title).toBe('실행 전')
    expect(first.line).toBeUndefined()
    expect(first.state).toEqual({ bindings: [], objects: [], access: null })
    expect(first.output).toEqual([])
    steps.slice(1).forEach((step, k) => {
      expect(step.line, `단계 ${k + 2}`).toBeDefined()
      expect(step.line!.from).toBe(step.line!.to)
      expect(step.line!.from, `단계 ${k + 2}: 줄은 단계마다 1씩 늘어납니다`).toBe(k + 1)
    })
  })

  describe('상태 참조 무결성', () => {
    it('바인딩 이름·객체 id·프로퍼티 키가 중복되지 않고, 모든 ObjectRef가 objects의 객체를 가리킨다', () => {
      steps.forEach((step, i) => {
        const where = `단계 ${i + 1}`
        const { bindings, objects } = step.state
        expect(duplicates(bindings.map((b) => b.name)), `${where}: 바인딩 이름 중복`).toEqual([])
        expect(duplicates(objects.map((o) => o.id)), `${where}: 객체 id 중복`).toEqual([])
        for (const o of objects) {
          expect(duplicates(o.props.map((p) => p.key)), `${where}: ${o.id}의 키 중복`).toEqual([])
        }
        const ids = new Set(objects.map((o) => o.id))
        for (const b of bindings) {
          if (isRef(b.value)) {
            expect(
              ids.has(b.value.id),
              `${where}: ${b.name}가 없는 객체 ${b.value.id}를 가리킵니다`,
            ).toBe(true)
          }
          expect(
            new RegExp(`\\b${b.declaredWith} ${b.name}\\b`).test(source()),
            `${where}: ${b.name}`,
          ).toBe(true)
        }
        // 모든 객체는 바인딩이 가리킨다(이 페이지의 시나리오에는 이름 없는 객체가 없다)
        for (const o of objects) {
          expect(
            bindings.some((b) => isRef(b.value) && b.value.id === o.id),
            `${where}: 객체 ${o.id}를 가리키는 변수가 없습니다`,
          ).toBe(true)
        }
        if (step.state.access) {
          expect(() => targetOf(step.state, step.state.access!.code), where).not.toThrow()
        }
      })
    })
  })

  describe('실행 대조: 예제를 단계의 줄까지 실제로 실행한 결과 = 상태', () => {
    it('바인딩 이름·순서·값, 객체 카드의 키 순서·값·타입, 같은 객체 = 같은 id, 출력이 같다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return
        const where = `단계 ${i + 1}`
        const real = runUntil(source(), step.line!.to)
        const { bindings, objects } = step.state

        // ① 바인딩 이름·순서·값
        expect(
          bindings.map((b) => b.name),
          `${where}: 바인딩 이름·순서가 실제와 다릅니다`,
        ).toEqual(real.declared)
        const idByIdentity = new Map<number, string>()
        const identityById = new Map<string, number>()
        bindings.forEach((b, k) => {
          const actual = real.snap[k].v
          if (isRef(b.value)) {
            if (actual.kind !== 'object')
              return fail(`${where}: ${b.name}은 실제로 객체가 아닙니다`)
            // 같은 객체 = 같은 id (양방향)
            const prevId = idByIdentity.get(actual.identity)
            expect(
              prevId === undefined || prevId === b.value.id,
              `${where}: 같은 객체가 다른 id입니다`,
            ).toBe(true)
            const prevIdentity = identityById.get(b.value.id)
            expect(
              prevIdentity === undefined || prevIdentity === actual.identity,
              `${where}: 다른 객체가 같은 id입니다`,
            ).toBe(true)
            idByIdentity.set(actual.identity, b.value.id)
            identityById.set(b.value.id, actual.identity)
          } else {
            if (actual.kind !== 'primitive')
              return fail(`${where}: ${b.name}은 실제로 원시 값이 아닙니다`)
            expect(actual.t, `${where}: ${b.name}의 타입`).toBe(b.value.type)
            expect(actual.s, `${where}: ${b.name}의 값`).toBe(b.value.display)
          }
        })

        // ② 객체 카드의 키 순서·값·타입
        expect(objects.length, `${where}: 객체 수`).toBe(idByIdentity.size)
        for (const o of objects) {
          const identity = identityById.get(o.id)
          if (identity === undefined)
            return fail(`${where}: 객체 ${o.id}에 대응하는 실제 객체가 없습니다`)
          const actual = real.snap
            .map((s) => s.v)
            .find((v) => v.kind === 'object' && v.identity === identity)
          if (!actual || actual.kind !== 'object')
            return fail(`${where}: 실제 객체를 찾지 못했습니다`)
          expect(
            o.props.map((p) => p.key),
            `${where}: ${o.id}의 키 순서가 Object.keys와 다릅니다`,
          ).toEqual(actual.props.map(([k]) => k))
          expect(
            o.props.map((p) => [p.value.type, p.value.display]),
            `${where}: ${o.id}의 값·타입이 실제와 다릅니다`,
          ).toEqual(actual.props.map(([, t, s]) => [t, s]))
        }

        // ③ 누적 출력
        expect(step.output, `${where}: output이 실제 출력과 다릅니다`).toEqual(real.output)
      })
    })
  })

  describe('프로퍼티 접근', () => {
    it('접근이 있는 줄에만 access가 있고, code는 강조한 줄 원문에 들어 있다', () => {
      steps.forEach((step, i) => {
        if (i === 0) return expect(step.state.access).toBeNull()
        const text = lineTextOf(i)
        const access = step.state.access
        if (!hasAccess(text)) {
          expect(access, `단계 ${i + 1}: 접근 식이 없는 줄인데 access가 있습니다`).toBeNull()
          return
        }
        if (!access) return fail(`단계 ${i + 1}: 접근 식이 있는 줄인데 access가 null입니다`)
        expect(
          text.includes(access.code),
          `단계 ${i + 1}: code "${access.code}"가 줄에 없습니다`,
        ).toBe(true)
        // op는 줄 모양과 맞아야 한다
        const expectedOp = text.includes(`delete ${access.code}`)
          ? 'delete'
          : text.includes(`${access.code} = `)
            ? 'set'
            : 'get'
        expect(access.op, `단계 ${i + 1}: op가 줄 모양과 다릅니다`).toBe(expectedOp)
      })
    })

    it('키 재평가: dot은 이름이 그대로 키, bracket은 식의 값을 문자열로 바꾼 것이 키', () => {
      steps.forEach((step, i) => {
        const access = step.state.access
        if (!access) return
        const where = `단계 ${i + 1}`
        if (access.notation === 'dot') {
          expect(
            access.code.endsWith(`.${access.keyExpr}`),
            `${where}: code가 .keyExpr로 끝나야 합니다`,
          ).toBe(true)
          expect(access.key, `${where}: 점 표기의 키는 이름 그대로입니다`).toBe(access.keyExpr)
          expect(access.keyValue, `${where}: 점 표기에는 keyValue가 없습니다`).toBeUndefined()
        } else {
          expect(
            access.code.endsWith(`[${access.keyExpr}]`),
            `${where}: code가 [keyExpr]로 끝나야 합니다`,
          ).toBe(true)
          if (!access.keyValue) return fail(`${where}: 대괄호 표기에는 keyValue가 필요합니다`)
          const real = evalKeyExpr(source(), step.line!.from - 1, access.keyExpr)
          expect(access.keyValue.type, `${where}: keyValue의 타입이 실제와 다릅니다`).toBe(real.t)
          expect(access.keyValue.display, `${where}: keyValue의 값이 실제와 다릅니다`).toBe(real.s)
          expect(access.key, `${where}: key는 String(식의 값)이어야 합니다`).toBe(real.s)
        }
      })
    })

    it('결과 종류: op와 짝이 맞고, 이전·현재 객체의 키 존재 여부와 값으로 결정된다', () => {
      const pairs = {
        get: ['found', 'missing'],
        set: ['created', 'updated'],
        delete: ['deleted', 'delete-missing'],
      } as const
      steps.forEach((step, i) => {
        const access = step.state.access
        if (!access) return
        const where = `단계 ${i + 1}`
        expect(
          (pairs[access.op] as readonly string[]).includes(access.result),
          `${where}: op ${access.op}에 result ${access.result}는 맞지 않습니다`,
        ).toBe(true)
        const before = targetOf(steps[i - 1].state, access.code).props.find(
          (p) => p.key === access.key,
        )
        const after = targetOf(step.state, access.code).props.find((p) => p.key === access.key)
        const had = before !== undefined
        const has = after !== undefined
        const expected = {
          get: had && has ? 'found' : 'missing',
          set: had ? 'updated' : 'created',
          delete: had ? 'deleted' : 'delete-missing',
        }[access.op]
        expect(access.result, `${where}: 이전/현재 객체로 계산한 결과와 다릅니다`).toBe(expected)
        switch (access.result) {
          case 'found':
            expect(
              had && has && sameVal(before.value, after.value),
              `${where}: found는 값이 그대로`,
            ).toBe(true)
            expect(sameVal(access.value, after!.value), `${where}: value = 읽은 값`).toBe(true)
            break
          case 'missing':
            expect(!had && !has, `${where}: missing은 이전·현재 모두 키가 없어야 합니다`).toBe(true)
            expect(access.value).toEqual({ type: 'undefined', display: 'undefined' })
            break
          case 'created':
            expect(!had && has, `${where}: created는 없던 키가 생겨야 합니다`).toBe(true)
            break
          case 'updated':
            expect(
              had && has && !sameVal(before.value, after.value),
              `${where}: updated는 값이 바뀌어야 합니다`,
            ).toBe(true)
            break
          case 'deleted':
            expect(had && !has, `${where}: deleted는 있던 키가 사라져야 합니다`).toBe(true)
            expect(access.value).toEqual({ type: 'boolean', display: 'true' })
            break
          case 'delete-missing':
            expect(
              !had && !has,
              `${where}: delete-missing은 이전·현재 모두 키가 없어야 합니다`,
            ).toBe(true)
            expect(access.value).toEqual({ type: 'boolean', display: 'true' })
            break
        }
        // set이면 현재 프로퍼티 값 = access.value
        if (access.op === 'set') {
          expect(
            after && sameVal(after.value, access.value),
            `${where}: set의 value가 현재 프로퍼티 값과 다릅니다`,
          ).toBe(true)
        }
      })
    })
  })

  it('changed는 이전 단계와 비교해 새로 생기거나 값이 바뀐 항목에만 붙는다', () => {
    steps.forEach((step, i) => {
      const where = `단계 ${i + 1}`
      const prev: PropertyState =
        i === 0 ? { bindings: [], objects: [], access: null } : steps[i - 1].state
      for (const b of step.state.bindings) {
        const before = prev.bindings.find((p) => p.name === b.name)
        const expected = !before || !sameValue(before.value, b.value) ? true : undefined
        expect(b.changed, `${where}: 변수 ${b.name}의 changed가 계산값과 다릅니다`).toBe(expected)
      }
      for (const o of step.state.objects) {
        const beforeObj = prev.objects.find((p) => p.id === o.id)
        expect(o.changed, `${where}: 객체 ${o.id}의 changed가 계산값과 다릅니다`).toBe(
          beforeObj ? undefined : true,
        )
        for (const p of o.props) {
          const before = beforeObj?.props.find((q) => q.key === p.key)
          const expected = !before || !sameVal(before.value, p.value) ? true : undefined
          expect(p.changed, `${where}: ${o.id}.${p.key}의 changed가 계산값과 다릅니다`).toBe(
            expected,
          )
        }
      }
    })
  })
})
