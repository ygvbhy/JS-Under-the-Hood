import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열) 또는 던져진 오류의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    return (e as Error).name
  }
}

describe('정리 표', () => {
  // 행마다 근거: 숫자는 본문 예제 번호, '—'는 예제 없이 아래 탐침으로 검증하는 행
  const evidence = ['1', '2', '—', '3', '4', '5', '6', '7', '8', '8', '—', '9']
  const rows = tableBody(mdx, ['상황', '일어나는 일', '예제'])

  it('행이 12개이고 예제 칸이 대응표와 같다', () => {
    expect(rows).toHaveLength(12)
    expect(rows.map((r) => r[2])).toEqual(evidence)
  })

  it('예제 칸의 번호는 본문의 실제 예제 번호다', () => {
    const files = exampleFilesByNumber(mdx)
    for (const cell of evidence.filter((e) => e !== '—')) {
      expect(files.has(Number(cell)), `예제 ${cell}`).toBe(true)
    }
    expect([...files.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('예제가 없는 주장의 탐침', () => {
  it('행 3: 서브클래스가 set만 다시 정의하면 읽기가 undefined이고 값은 새 setter가 저장한다', () => {
    expect(
      show(`
        class A { get v() { return this._v; } set v(x) { this._v = x; } }
        class B extends A { set v(x) { this._v = x * 10; } }
        const b = new B();
        b.v = 1;
        String(b.v) + ' ' + b._v;
      `),
    ).toBe('undefined 10')
  })

  it('행 6: 같은 클래스에 필드가 있으면 생성자의 대입은 setter를 부르지 않고 필드가 만든 프로퍼티를 바꾼다', () => {
    expect(
      show(`
        let calls = 0;
        class G { v = 1; constructor() { this.v = 2; } set v(x) { calls++; } get v() { return 'g'; } }
        const g = new G();
        calls + ' ' + Object.hasOwn(g, 'v') + ' ' + g.v;
      `),
    ).toBe('0 true 2')
  })

  it('행 5: 필드로 만든 프로퍼티는 열거·쓰기·설정이 모두 가능한 데이터 프로퍼티다', () => {
    expect(
      show(`
        class A { get v() { return 1; } set v(x) {} }
        class D extends A { v = 2; }
        JSON.stringify(Object.getOwnPropertyDescriptor(new D(), 'v'));
      `),
    ).toBe('{"value":2,"writable":true,"enumerable":true,"configurable":true}')
  })

  it('행 11: getter만 있는 private 접근자에 쓰면 TypeError다', () => {
    expect(
      show(`
        class P {
          get #v() { return 1; }
          write() { try { this.#v = 2; } catch (e) { return e.name; } return 'no error'; }
        }
        new P().write();
      `),
    ).toBe('TypeError')
  })

  it('행 12: 멈춤 조건이 없는 setter 재귀는 Node에서 RangeError다(V8 동작, 명세에 규정 없음)', () => {
    expect(
      show(`
        class R { set v(x) { this.v = x; } }
        const r = new R();
        try { r.v = 1; } catch (e) { e.name; }
      `),
    ).toBe('RangeError')
  })

  it('본문: set을 먼저, get을 나중에 정의해도 한 프로퍼티에 두 함수가 모두 있다', () => {
    expect(
      show(`
        class A { set v(x) {} get v() { return 1; } }
        const d = Object.getOwnPropertyDescriptor(A.prototype, 'v');
        [typeof d.get, typeof d.set].join(' ');
      `),
    ).toBe('function function')
  })

  it('본문: 클래스 접근자는 열거할 수 없고 설정 가능하다', () => {
    expect(
      show(`
        class A { get v() { return 1; } set v(x) {} }
        const d = Object.getOwnPropertyDescriptor(A.prototype, 'v');
        [d.enumerable, d.configurable, 'value' in d].join(' ');
      `),
    ).toBe('false true false')
  })
})

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s',
    (id, file, expectedOutput) => {
      const code = readExample(file)
      expect(runExample(code)).toEqual(expectedOutput)
      let strictOutput: string[] | null
      try {
        strictOutput = runExample(STRICT + code)
      } catch {
        strictOutput = null
      }
      // 클래스 바깥의 sloppy 대입 실패에 기대는 예제 2만 지시어를 붙이면 달라진다.
      if (id === 'getter-only-override') {
        expect(strictOutput).not.toEqual(expectedOutput)
      } else {
        expect(strictOutput).toEqual(expectedOutput)
      }
    },
  )
})

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

  it('퀴즈가 예제 1~9마다 하나씩 9개 있다', () => {
    expect(quizzes.map((q) => q.example)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(concept.examples).toHaveLength(9)
  })

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    '예제 %i 퀴즈: 정답 선택지가 expectedOutput을 " / "로 이은 문자열이다',
    (n) => {
      const quiz = quizzes.find((q) => q.example === n)!
      const expected = concept.examples[n - 1].expectedOutput.join(' / ')
      expect(quiz.choices[quiz.answer]).toBe(expected)
      expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
      expect(quiz.choices.filter((c) => c === expected)).toHaveLength(1)
    },
  )

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })
})

describe('메타 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 245이다', () => {
    expect(concept.order).toBe(245)
  })

  it('RangeError가 나오는 본문 문장에는 V8과 "규정이 없"이 함께 있고 Chromium은 없다', () => {
    const sentences = [...mdx.split(/(?<=[.다])\s+/), ...concept.simplifications].filter((s) =>
      s.includes('RangeError'),
    )
    expect(sentences.length).toBeGreaterThan(0)
    for (const s of sentences) {
      expect(s, s).toContain('V8')
      expect(s, s).toContain('규정이 없')
    }
    expect(mdx).not.toContain('Chromium')
  })
})
