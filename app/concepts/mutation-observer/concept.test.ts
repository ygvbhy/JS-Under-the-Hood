import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { concept } from './meta'

// 브라우저 예제의 실행과 expectedOutput 대조는 tests/examples.test.ts(Chromium)가 맡는다.
// 여기서는 퀴즈 정답·오답, 비교표, 메타 조건만 검사한다.
const dir = import.meta.dirname
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const out = (n: number) => concept.examples[n - 1].expectedOutput

// --- 퀴즈 -------------------------------------------------------------------------------------

// 브라우저 동작이라 소스를 치환해 실행하지 않고, 오해 모델의 출력을 손으로 계산해 하드코딩한다.
// 예제 1: (a) 변경마다 콜백을 동기로 부른다, (b) 변경마다 마이크로태스크가 들어가 콜백이 세 번 불린다, (d) 알림을 큐에 넣을 때의 레코드 하나로 고정된다.
// 예제 2: (b) 우선순위 모델: 콜백이 항상 then보다 먼저다, (c) 마지막 변경 때 알림을 큐에 넣는다(또는 프로미스가 항상 먼저다), (d) 변경마다 마이크로태스크가 들어간다.
// 예제 3: (a) 꺼내도 복사일 뿐이라 콜백이 레코드 3개를 받는다, (b) 꺼내면 콜백이 취소된다, (c) 레코드는 알림 때 비로소 만들어진다.
// 예제 4: (a) takeRecords로 비워도 빈 배열로 first 콜백을 부른다(disconnect한 second는 부르지 않는다), (c) disconnect는 콜백만 멈추고 레코드는 남긴다, (d) 알림 마이크로태스크를 큐에 넣을 때의 레코드가 고정되어 takeRecords로 꺼낸 first의 레코드도 콜백에 간다.
// 예제 5: (a) childList가 자손의 변경도 본다, (b) subtree는 자손의 변경만 본다, (d) 텍스트 노드 추가는 childList 레코드가 아니다.
// 예제 6: (b) 빈 옵션을 허용한다, (c) attributeOldValue만으로는 attributes가 켜지지 않아 셋째 observe가 TypeError로 스크립트를 멈춘다, (d) 같은 값 setAttribute는 기록하지 않는다.
// 예제 7: (a) 관찰자마다 자기 첫 레코드 때 마이크로태스크를 넣는다, (c) 알림은 하나지만 레코드가 생긴 순서(또는 observe 순서)로 부른다, (d) 콜백의 예외가 다음 관찰자를 막는다.
// 예제 8: (a) 같은 마이크로태스크에서 곧바로 다시 알린다, (b) 콜백 안의 변경은 무시한다, (c) 콜백이 끝난 뒤에 알림을 큐에 넣는다.
const WRONG: Record<number, string[]> = {
  1: [
    '콜백 1 레코드 1 / 콜백 2 레코드 1 / 콜백 3 레코드 1 / 동기 코드 끝 4',
    '동기 코드 끝 4 / 콜백 1 레코드 1 / 콜백 2 레코드 1 / 콜백 3 레코드 1',
    '동기 코드 끝 4 / 콜백 1 레코드 1',
  ],
  2: [
    '스크립트 1 끝 / 콜백 레코드 2 / then 1 / 스크립트 2 끝 / 콜백 레코드 2 / then 2',
    '스크립트 1 끝 / then 1 / 콜백 레코드 2 / 스크립트 2 끝 / then 2 / 콜백 레코드 2',
    '스크립트 1 끝 / 콜백 레코드 1 / then 1 / 콜백 레코드 1 / 스크립트 2 끝 / then 2 / 콜백 레코드 1 / 콜백 레코드 1',
  ],
  3: [
    '꺼낸 레코드 2 / 동기 코드 끝 / 콜백 레코드 3 data-a',
    '꺼낸 레코드 2 / 동기 코드 끝',
    '꺼낸 레코드 0 / 동기 코드 끝 / 콜백 레코드 3 data-a',
  ],
  4: [
    'first에서 꺼낸 레코드 1 / second에 남은 레코드 0 / 동기 코드 끝 / first 콜백 0 / then',
    'first에서 꺼낸 레코드 1 / second에 남은 레코드 1 / 동기 코드 끝 / then',
    'first에서 꺼낸 레코드 1 / second에 남은 레코드 0 / 동기 코드 끝 / first 콜백 1 / then',
  ],
  5: [
    'childList만 2 childList:item childList:list / subtree까지 4 attributes:list attributes:item childList:item childList:list',
    'childList만 1 childList:list / subtree까지 2 attributes:item childList:item',
    'childList만 1 childList:list / subtree까지 3 attributes:list attributes:item childList:list',
  ],
  6: [
    'attributes false와 attributeOldValue TypeError / 레코드 3 [null,"1","2"]',
    '빈 옵션 TypeError / attributes false와 attributeOldValue TypeError',
    '빈 옵션 TypeError / attributes false와 attributeOldValue TypeError / 레코드 2 [null,"1"]',
  ],
  7: [
    '동기 코드 끝 / B 콜백 1 / then / A 콜백 1 / error 이벤트 TypeError',
    '동기 코드 끝 / B 콜백 1 / A 콜백 1 / error 이벤트 TypeError / then',
    '동기 코드 끝 / A 콜백 1 / error 이벤트 TypeError / then',
  ],
  8: [
    '콜백 1 레코드 1 / 콜백 2 레코드 1 / then / 콜백이 넣은 then',
    '콜백 1 레코드 1 / then / 콜백이 넣은 then',
    '콜백 1 레코드 1 / then / 콜백이 넣은 then / 콜백 2 레코드 1',
  ],
}

const quizzes = [...mdx.matchAll(/<PredictQuiz\b([\s\S]*?)\n\/>/g)].map((m) => {
  const body = m[1]
  const question = body.match(/question="([^"]*)"/)![1]
  const choicesSource = body.match(/choices=\{\[([\s\S]*?)\]\}/)![1]
  const choices = [...choicesSource.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((c) => c[1])
  const answer = Number(body.match(/answer=\{(\d+)\}/)![1])
  const example = Number(question.match(/예제 (\d+)/)![1])
  return { block: body, choices, answer, example }
})

describe('퀴즈', () => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8]
  const answers = [2, 0, 3, 1, 2, 0, 1, 3]

  it('퀴즈가 예제 1~8마다 하나씩 8개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(8)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.choices).toHaveLength(4)
    expect(quiz.answer).toBe(answers[n - 1])
    expect(quiz.choices[quiz.answer]).toBe(out(n).join(' / '))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)('예제 %i 퀴즈: 오답은 오해 모델 출력 목록과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    expect(wrong).toEqual(WRONG[n])
    expect(wrong).not.toContain(out(n).join(' / '))
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })

  it('explanation 속성에는 큰따옴표와 백슬래시가 없다', () => {
    for (const q of quizzes) {
      expect(q.block, `예제 ${q.example}`).toMatch(/explanation="[^"\\]*"\s*$/)
    }
  })
})

// --- 비교표 -----------------------------------------------------------------------------------

describe('비교표', () => {
  const rows = tableBody(mdx, ['상황', '콜백이 불리는 때', '받는 레코드', '근거'])

  it('행 수와 칸 텍스트가 하드코딩 목록과 같다', () => {
    expect(rows).toEqual([
      ['동기 코드에서 세 번 추가', '동기 코드가 끝난 뒤 한 번', '3개', '예제 1'],
      [
        '첫 변경 뒤에 then을 등록',
        'then보다 먼저',
        '알림 때까지 쌓인 2개(then 등록 뒤 변경 포함)',
        '예제 2',
      ],
      ['첫 변경 앞에 then을 등록', 'then 다음', '2개', '예제 2'],
      ['takeRecords로 일부를 꺼냄', '마이크로태스크에서', '꺼낸 뒤 생긴 1개', '예제 3'],
      ['모두 꺼내거나 disconnect한 뒤 새 레코드 없음', '불리지 않음', '없음', '예제 4'],
      [
        '관찰자 둘, 한쪽 레코드는 then 등록 앞이고 다른 쪽은 뒤',
        '한 알림 마이크로태스크에서 생성 순서대로, 둘 다 then보다 먼저',
        '관찰자마다 1개',
        '예제 7',
      ],
      [
        '관찰자 하나의 콜백 안에서 다시 변경',
        '그때 들어간 새 알림 마이크로태스크에서(이미 큐에 있던 then 다음)',
        '1개',
        '예제 8',
      ],
    ])
  })

  it('표 칸에 부등호가 없다', () => {
    for (const row of rows) for (const cell of row) expect(cell).not.toMatch(/[<>]/)
  })

  it('행 1(예제 1): 콜백은 한 번이고 동기 코드 끝 뒤이며 레코드 3개를 받는다', () => {
    const o = out(1)
    expect(o.filter((l) => l.startsWith('콜백'))).toEqual(['콜백 1 레코드 3'])
    expect(o.indexOf('콜백 1 레코드 3')).toBeGreaterThan(o.indexOf('동기 코드 끝 4'))
  })

  it('행 2·3(예제 2): 스크립트 1의 콜백은 then 1 앞이고 스크립트 2의 then 2는 콜백 앞이며 레코드는 모두 2개다', () => {
    const o = out(2)
    const callbacks = o.filter((l) => l.startsWith('콜백'))
    expect(callbacks).toEqual(['콜백 레코드 2', '콜백 레코드 2'])
    const first = o.indexOf('콜백 레코드 2')
    const second = o.lastIndexOf('콜백 레코드 2')
    expect(first).toBeLessThan(o.indexOf('then 1'))
    expect(o.indexOf('then 2')).toBeLessThan(second)
    // 스크립트 사이의 체크포인트: 첫 스크립트의 마이크로태스크가 둘째 스크립트 끝보다 먼저다.
    expect(o.indexOf('then 1')).toBeLessThan(o.indexOf('스크립트 2 끝'))
  })

  it('행 2(예제 2 파일): then 1은 첫 변경 뒤·둘째 변경 앞에, then 2는 둘째 스크립트의 첫 변경 앞에 등록된다', () => {
    const src = readExample(concept.examples[1].file)
    const append1 = src.indexOf('list.appendChild')
    const then1 = src.indexOf("console.log('then 1')")
    const append2 = src.indexOf('list.appendChild', then1)
    expect(append1).toBeGreaterThan(-1)
    expect(append1).toBeLessThan(then1)
    expect(then1).toBeLessThan(append2)
    const script2 = src.slice(src.indexOf('<script>', src.indexOf('<script>') + 1))
    expect(script2.indexOf("console.log('then 2')")).toBeLessThan(
      script2.indexOf('list.appendChild'),
    )
  })

  it('행 4(예제 3): takeRecords가 2개를 꺼내고 콜백은 꺼낸 뒤 생긴 레코드 1개(data-c)를 받는다', () => {
    const o = out(3)
    expect(o[0]).toBe('꺼낸 레코드 2')
    expect(o[o.length - 1]).toBe('콜백 레코드 1 data-c')
    expect(o.indexOf('콜백 레코드 1 data-c')).toBeGreaterThan(o.indexOf('동기 코드 끝'))
    const src = readExample(concept.examples[2].file)
    expect(src.indexOf('takeRecords')).toBeLessThan(src.indexOf("setAttribute('data-c'"))
  })

  it('행 5(예제 4): 출력에 콜백이 없고 second에 남은 레코드는 0개다', () => {
    const o = out(4)
    expect(o.some((l) => l.includes('콜백'))).toBe(false)
    expect(o).toContain('second에 남은 레코드 0')
    // 콜백 줄은 파일에 있어서 출력에 없다는 것이 의미를 가진다.
    const src = readExample(concept.examples[3].file)
    expect(src).toContain("console.log('first 콜백', records.length)")
    expect(src).toContain("console.log('second 콜백', records.length)")
    expect(src).toContain('second.disconnect()')
  })

  it('행 6(예제 7): A 콜백이 then 앞이고 B 콜백은 A 콜백 뒤다. 파일에서 B의 레코드와 observe가 먼저이고 A를 먼저 만든다', () => {
    const o = out(7)
    expect(o.indexOf('A 콜백 1')).toBeLessThan(o.indexOf('then'))
    expect(o.indexOf('B 콜백 1')).toBeGreaterThan(o.indexOf('A 콜백 1'))
    expect(o.indexOf('error 이벤트 TypeError')).toBeGreaterThan(o.indexOf('A 콜백 1'))
    expect(o.indexOf('error 이벤트 TypeError')).toBeLessThan(o.indexOf('B 콜백 1'))
    const src = readExample(concept.examples[6].file)
    const at = (s: string) => src.indexOf(s)
    // A를 먼저 만들고 B를 먼저 observe한다.
    expect(at('const observerA = new MutationObserver')).toBeLessThan(
      at('const observerB = new MutationObserver'),
    )
    expect(at('observerB.observe')).toBeLessThan(at('observerA.observe'))
    // B의 목록을 먼저 바꾸고, then을 등록한 뒤 A의 목록을 바꾼다.
    expect(at('listB.appendChild')).toBeLessThan(at('Promise.resolve()'))
    expect(at('Promise.resolve()')).toBeLessThan(at('listA.appendChild'))
  })

  it('행 7(예제 8): 콜백 안 변경의 새 알림은 이미 있던 then 다음이고 콜백이 넣은 then보다 앞이다', () => {
    const o = out(8)
    expect(o.indexOf('then')).toBeLessThan(o.indexOf('콜백 2 레코드 1'))
    expect(o.indexOf('콜백 2 레코드 1')).toBeLessThan(o.indexOf('콜백이 넣은 then'))
    const src = readExample(concept.examples[7].file)
    // 콜백 안에서 변경한 다음에 then을 등록한다.
    const inCallback = src.slice(src.indexOf('if (calls === 1)'))
    expect(inCallback.indexOf('list.appendChild')).toBeLessThan(
      inCallback.indexOf('Promise.resolve()'),
    )
  })

  it('예제 5: 먼저 만든 childOnly가 먼저 불리고, withSubtree가 레코드는 먼저 받는다', () => {
    const src = readExample(concept.examples[4].file)
    expect(src.indexOf('const childOnly')).toBeLessThan(src.indexOf('const withSubtree'))
    expect(src.indexOf("list.setAttribute('data-a'")).toBeGreaterThan(
      src.indexOf('withSubtree.observe'),
    )
    expect(out(5)[0].startsWith('childList만')).toBe(true)
    expect(out(5)[1].startsWith('subtree까지 4')).toBe(true)
  })

  it('예제 6: 셋째 관찰자는 attributes 없이 attributeOldValue만 주고, 같은 값 setAttribute가 마지막에 있다', () => {
    const src = readExample(concept.examples[5].file)
    expect(src).toContain('observer.observe(list, { attributeOldValue: true });')
    expect(src).not.toMatch(/observer\.observe\(list, \{[^}]*attributes/)
    const sets = [...src.matchAll(/list\.setAttribute\('data-a', '(\d)'\)/g)].map((m) => m[1])
    expect(sets).toEqual(['1', '2', '2'])
  })

  it('예제 6: 둘째 시도는 childList가 true라서 셋째 규칙(attributes false와 attributeOldValue true)에서만 걸린다', () => {
    const src = readExample(concept.examples[5].file)
    expect(src).toContain('{ childList: true, attributes: false, attributeOldValue: true }')
  })
})

// --- 메타와 본문 조건 --------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 444이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(444)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('title·summary·goals·tags에 백틱과 "객체"가 없다', () => {
    const text = [concept.title, concept.summary, ...concept.goals, ...concept.tags].join('\n')
    expect(text).not.toContain('`')
    expect(text).not.toContain('객체')
  })

  it('본문 첫 문단에 백틱이 없다', () => {
    expect(mdx.split('\n')[0]).not.toContain('`')
  })

  it('예제는 모두 browser 런타임의 .html이다', () => {
    for (const e of concept.examples) {
      expect(e.runtime).toBe('browser')
      expect(e.file.endsWith('.html')).toBe(true)
    }
  })

  it('simplifications가 잡히지 않은 예외 개념을 이름으로 가리킨다', () => {
    expect(
      concept.simplifications.some((s) => s.includes('잡히지 않은 예외 개념에서 다룹니다')),
    ).toBe(true)
  })
})
