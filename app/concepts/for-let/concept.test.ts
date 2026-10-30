import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { runExample } from '../../../tests/helpers/run-example'
import { assertScenarioInvariants } from '../../../tests/helpers/scenario-invariants'
import { concept } from './meta'
import { scenarios, type Binding, type EnvRecord, type ForLetState } from './scenarios'

const examplesDir = join(import.meta.dirname, 'examples')
const readExample = (file: string) => readFileSync(join(examplesDir, file), 'utf8')
const exampleOf = (id: string) => concept.examples.find((e) => e.id === id)!

describe('본문 주장 검증', () => {
  it("'use strict'를 붙여도 var는 3 3 3, let은 0 1 2다", () => {
    expect(runExample("'use strict';\n" + readExample('var-loop.js'))).toEqual(['3 3 3'])
    expect(runExample("'use strict';\n" + readExample('let-loop.js'))).toEqual(['0 1 2'])
  })

  it('while 본문의 let n = k도 반복마다 다른 값을 가리킨다(0 1 2)', () => {
    expect(
      runInNewContext(
        `const fns = {}; let k = 0;
         while (k < 3) { let n = k; fns[k] = function () { return n; }; k++; }
         [fns[0](), fns[1](), fns[2]()].join(' ')`,
      ),
    ).toBe('0 1 2')
  })

  it('본문이 블록이 아닌 한 문장이어도 let은 0 1 2, var는 3 3 3이다', () => {
    const run = (decl: string) =>
      runInNewContext(
        `const fns = {};
         for (${decl} i = 0; i < 3; i++) fns[i] = function () { return i; };
         [fns[0](), fns[1](), fns[2]()].join(' ')`,
      )
    expect(run('let')).toBe('0 1 2')
    expect(run('var')).toBe('3 3 3')
  })

  it('머리의 const도 대입이 없으면(조건식·증가식 없이 break) 오류 없이 끝난다', () => {
    expect(runInNewContext('let n = 0; for (const x = 0; ; ) { n++; break; } n')).toBe(1)
  })

  it('첫 조건식은 머리 레코드가 아니라 1번째 반복 레코드에서 평가된다(거기서 만든 함수가 i를 바꾸면 반복이 1번으로 끝난다)', () => {
    expect(
      runInNewContext(
        `let first;
         for (let i = 0; (first = first || function () { return i; }, i < 3); i++) {}
         first()`,
      ),
    ).toBe(0)
    // 첫 조건식에서 만든 함수는 1번째 반복 레코드의 i를 바꾼다 → 다음 반복 레코드가 10에서 시작해 1번만 돈다
    expect(
      runInNewContext(
        `let bump; let count = 0;
         for (let i = 0; (bump = bump || function () { i += 10; }, i < 3); i++) { count++; if (count === 1) bump(); }
         count`,
      ),
    ).toBe(1)
    // 초기화식에서 만든 함수는 머리 레코드의 i를 바꾸므로 반복 레코드에 영향이 없어 3번 돈다
    expect(
      runInNewContext(
        `let bump; let count = 0;
         for (let i = 0, h = function () { i += 10; }; i < 3; i++) { bump = h; count++; if (count === 1) bump(); }
         count`,
      ),
    ).toBe(3)
  })

  it('for (let i …) 뒤에는 i가 보이지 않는다(typeof i === "undefined")', () => {
    expect(runInNewContext(`for (let i = 0; i < 1; i++) {} typeof i`)).toBe('undefined')
  })

  it('머리의 const는 증가식이 없고 break하면 오류 없이 끝난다', () => {
    expect(() =>
      runInNewContext(`let n = 0; for (const i = 0; i < 1; ) { n++; break; } n`),
    ).not.toThrow()
  })

  it('for...in의 const key는 반복마다 다른 키를 가진다', () => {
    expect(
      runInNewContext(
        `const o = { a: 1, b: 2 }; const fns = [];
         for (const key in o) { fns.push(function () { return key; }); }
         fns.map((f) => f()).join(' ')`,
      ),
    ).toBe('a b')
  })
})

// --- 시나리오 검사 ----------------------------------------------------------------------------

const byId = (s: ForLetState) => new Map(s.envs.map((e) => [e.id, e]))

// 레코드 id에서 outerId를 따라 닿는 id들(자기 자신 포함)
function chain(s: ForLetState, start: string | null): string[] {
  const m = byId(s)
  const out: string[] = []
  let cur: string | null = start
  while (cur !== null) {
    const rec = m.get(cur)
    expect(rec, `레코드 ${cur}가 envs에 없습니다`).toBeDefined()
    out.push(cur)
    cur = rec!.outerId
  }
  return out
}

const hasBinding = (
  e: EnvRecord,
  name: string,
): { b: Binding; part?: 'declarative' | 'object' } | null => {
  const d = e.bindings.find((b) => b.name === name)
  if (d) return { b: d, ...(e.kind === 'global' && { part: 'declarative' as const }) }
  const o = e.objectBindings?.find((b) => b.name === name)
  return o ? { b: o, part: 'object' } : null
}

const iValue = (s: ForLetState | undefined, id: string) =>
  s?.envs.find((e) => e.id === id)?.bindings.find((b) => b.name === 'i')?.value

const sameBinding = (a: Binding, b: Binding) => a.value === b.value && a.state === b.state

describe.each(scenarios)('시나리오 $id', (scenario) => {
  const example = exampleOf(scenario.exampleId)

  it('공통 불변식(코드 원문, 출력, 줄 범위)', () => {
    assertScenarioInvariants(scenario, example, readExample(example.file))
  })

  it('단계 구조: 바깥 연결, 함수 객체, 반복·머리 레코드의 바깥, 블록 레코드의 바깥', () => {
    scenario.steps.forEach((step, n) => {
      const s = step.state
      const prev = n > 0 ? scenario.steps[n - 1].state : undefined
      const where = `단계 ${n + 1}(${step.title})`
      const ids = s.envs.map((e) => e.id)
      expect(new Set(ids).size, `${where}: env id 중복`).toBe(ids.length)
      for (const e of s.envs) {
        if (e.outerId === null) expect(e.id, `${where}: outerId null은 전역뿐`).toBe('global')
        else expect(ids, `${where}: ${e.id}의 바깥 ${e.outerId}가 없음`).toContain(e.outerId)
        if (e.kind === 'iteration' || e.kind === 'loop')
          expect(e.outerId, `${where}: ${e.id}의 바깥은 전역`).toBe('global')
      }
      if (s.lexicalEnv === null) expect(n, `${where}: lexicalEnv null은 실행 전뿐`).toBe(0)
      else expect(ids, `${where}: lexicalEnv가 envs에 없음`).toContain(s.lexicalEnv)
      for (const f of s.functions) {
        expect(ids, `${where}: ${f.id}의 environmentId`).toContain(f.environmentId)
        const k = f.id.replace('fn', '')
        expect(f.label).toBe(`익명 함수(fns[${k}])`)
        expect(f.heldBy).toBe(`fns의 ${k} 프로퍼티`)
        const before = prev?.functions.find((p) => p.id === f.id)
        if (before)
          expect(before.environmentId, `${where}: ${f.id} 환경이 바뀜`).toBe(f.environmentId)
      }
      if (prev) {
        for (const p of prev.functions)
          expect(
            s.functions.map((f) => f.id),
            `${where}: 함수 객체가 사라짐`,
          ).toContain(p.id)
        // 새 블록 레코드의 바깥 = 직전 단계의 LexicalEnvironment
        const prevIds = new Set(prev.envs.map((e) => e.id))
        for (const e of s.envs.filter((r) => r.kind === 'block' && !prevIds.has(r.id)))
          expect(e.outerId, `${where}: ${e.id}의 바깥은 직전 LexicalEnvironment`).toBe(
            prev.lexicalEnv,
          )
      }
    })
  })

  it('loop 레코드는 iter1이 처음 나타난 단계부터 그림에 없다', () => {
    const first = scenario.steps.findIndex((st) => st.state.envs.some((e) => e.id === 'iter1'))
    if (first < 0) return // var 시나리오
    scenario.steps.slice(first).forEach((st, n) => {
      expect(
        st.state.envs.some((e) => e.id === 'loop'),
        `단계 ${first + n + 1}에 loop 레코드가 남아 있음`,
      ).toBe(false)
    })
  })

  it('도달 가능성: 그림의 레코드 = 전역 ∪ lexicalEnv 사슬 ∪ 함수 환경 사슬, retained = 그 외', () => {
    scenario.steps.forEach((step, n) => {
      const s = step.state
      const where = `단계 ${n + 1}(${step.title})`
      if (s.lexicalEnv === null) {
        expect(s.envs, where).toEqual([])
        return
      }
      const onContext = new Set(chain(s, s.lexicalEnv))
      const reachable = new Set<string>(['global', ...onContext])
      for (const f of s.functions) for (const id of chain(s, f.environmentId)) reachable.add(id)
      expect(new Set(s.envs.map((e) => e.id)), `${where}: 그림의 레코드 집합`).toEqual(reachable)
      for (const e of s.envs) {
        const expectedRetained = !onContext.has(e.id) && e.id !== 'global'
        expect(e.retained === true, `${where}: ${e.id}의 retained`).toBe(expectedRetained)
      }
    })
  })

  it('탐색 재계산: 경로·foundIn·part·result가 상태와 같다', () => {
    scenario.steps.forEach((step, n) => {
      const s = step.state
      const lk = s.lookup
      if (!lk) return
      const where = `단계 ${n + 1}(${step.title})`
      let start: string | null
      if (lk.start === 'context') start = s.lexicalEnv
      else {
        const f = s.functions.find((x) => x.id === lk.start)
        expect(f, `${where}: start 함수 ${lk.start}`).toBeDefined()
        start = f!.environmentId
      }
      const m = byId(s)
      const walked: string[] = []
      let found: { id: string; b: Binding; part?: 'declarative' | 'object' } | null = null
      for (const id of chain(s, start)) {
        walked.push(id)
        const hit = hasBinding(m.get(id)!, lk.name)
        if (hit) {
          found = { id, ...hit }
          break
        }
      }
      expect(found, `${where}: ${lk.name}을 찾지 못함`).not.toBeNull()
      expect(lk.foundIn, `${where}: foundIn`).toBe(found!.id)
      expect(lk.path, `${where}: path`).toEqual(walked)
      expect(found!.b.state, `${where}: 초기화된 바인딩`).toBe('initialized')
      expect(lk.result, `${where}: result`).toBe(found!.b.value)
      expect(lk.part, `${where}: part`).toBe(found!.part)
    })
  })

  it('새 반복 레코드는 직전 반복 레코드의 i 값으로 초기화되고 다른 i는 그 단계에서 바뀌지 않는다', () => {
    scenario.steps.forEach((step, n) => {
      if (n === 0) return
      const prev = scenario.steps[n - 1].state
      const s = step.state
      const prevIds = new Set(prev.envs.map((e) => e.id))
      const fresh = s.envs.filter((e) => e.kind === 'iteration' && !prevIds.has(e.id))
      for (const e of fresh) {
        const num = Number(e.id.replace('iter', ''))
        const where = `단계 ${n + 1}(${step.title}): ${e.id}`
        if (num >= 2)
          expect(iValue(s, e.id), `${where}의 초기값`).toBe(iValue(prev, `iter${num - 1}`))
        for (const other of s.envs) {
          if (other.id === e.id || !prevIds.has(other.id)) continue
          const before = iValue(prev, other.id)
          if (before !== undefined)
            expect(iValue(s, other.id), `${where}: ${other.id}의 i가 같은 단계에서 바뀜`).toBe(
              before,
            )
        }
      }
    })
  })

  it('created·changed 표시가 직전 단계와의 차이와 맞는다', () => {
    scenario.steps.forEach((step, n) => {
      const prev = n > 0 ? scenario.steps[n - 1].state : undefined
      const prevMap = new Map((prev?.envs ?? []).map((e) => [e.id, e]))
      for (const e of step.state.envs) {
        const where = `단계 ${n + 1}(${step.title}): ${e.id}`
        const old = prevMap.get(e.id)
        expect(e.created === true, `${where}의 created`).toBe(!old)
        const all = [...e.bindings, ...(e.objectBindings ?? [])]
        const oldAll = old ? [...old.bindings, ...(old.objectBindings ?? [])] : []
        for (const b of all) {
          const ob = oldAll.find((x) => x.name === b.name)
          const expected = !ob || !sameBinding(ob, b)
          expect(b.changed === true, `${where}.${b.name}의 changed`).toBe(expected)
        }
      }
    })
  })

  it('탐침: 조건식 시점의 i 값 순서 = 조건 단계의 lookup.result 순서, 출력도 같다', () => {
    const lines = readExample(example.file).split('\n')
    lines[1] = lines[1].replace(/i < (\d+)/, '(__probe(i), i < $1)')
    expect(lines[1]).toContain('__probe')
    const probed: string[] = []
    const out: string[] = []
    runInNewContext(
      lines.join('\n'),
      {
        __probe: (v: unknown) => probed.push(String(v)),
        console: { log: (...a: unknown[]) => out.push(a.join(' ')) },
      },
      { timeout: 2000 },
    )
    const results = scenario.steps
      .filter((st) => st.title.startsWith('조건'))
      .map((st) => st.state.lookup!.result)
    expect(results).toEqual(probed)
    expect(out).toEqual(example.expectedOutput)
  })
})
