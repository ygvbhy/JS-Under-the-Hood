import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { filterConcepts } from '~/lib/concepts'
import { concept as errorHandling } from '../error-handling/meta'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { concept } from './meta'

// 브라우저 예제의 실행과 expectedOutput 대조는 tests/examples.test.ts(Chromium)가 맡는다.
// 여기서는 퀴즈 정답·오답, 비교표, 메타 조건만 검사한다.
const dir = import.meta.dirname
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const errorHandlingMdx = readFileSync(join(dir, '..', 'error-handling', 'content.mdx'), 'utf8')
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const out = (n: number) => concept.examples[n - 1].expectedOutput

// --- 퀴즈 -------------------------------------------------------------------------------------

// 브라우저 동작이라 소스를 치환해 실행하지 않고, 오해 모델의 출력을 손으로 계산해 하드코딩한다.
// 예제 1: (a) 예외가 나면 뒤 스크립트도 실행되지 않는다, (b) error 이벤트는 나중 태스크로 발화된다, (c) 예외 뒤에도 그 스크립트가 끝까지 실행된다.
// 예제 2: (a) 오류 줄 앞까지는 실행된다, (b) 오류가 있어도 함수 선언은 만들어진다.
// 예제 3: (a) 예외가 난 줄 뒤의 선언은 생기지 않는다(셋째 스크립트가 after를 읽다 ReferenceError로 멈춘다), (b) let도 var처럼 undefined로 남는다, (c) 다시 선언하면 덮어쓴다.
// 예제 4: (a) 예외가 click()을 부른 코드로 전파된다, (b) 리스너는 모두 실행되고 예외가 전파된다, (c) error 이벤트는 디스패치가 끝난 뒤 발화된다.
// 예제 5: (a) false가 취소한다, (b) onerror의 반환값은 취소와 관계없다.
// 예제 6: (a) then 콜백의 예외도 error 이벤트가 된다, (b) 예외가 나면 남은 마이크로태스크가 실행되지 않는다.
const WRONG: Record<number, string[]> = {
  1: [
    '1 시작 / error 이벤트 TypeError / then',
    '1 시작 / then / 2 실행 / error 이벤트 TypeError',
    '1 시작 / error 이벤트 TypeError / 1 끝 / then / 2 실행',
  ],
  2: [
    '1 시작 / error 이벤트 SyntaxError / 2 실행 function',
    'error 이벤트 SyntaxError / 2 실행 function',
  ],
  3: [
    'error 이벤트 TypeError / error 이벤트 ReferenceError / 다시 선언함 / 다음 스크립트 number',
    'error 이벤트 TypeError / 1 undefined function / error 이벤트 SyntaxError / 다음 스크립트 undefined',
    'error 이벤트 TypeError / 1 undefined function / late: ReferenceError / 다시 선언함 / 다음 스크립트 number',
  ],
  4: [
    '리스너 1 / error 이벤트 TypeError',
    '리스너 1 / 리스너 2 / error 이벤트 TypeError',
    '리스너 1 / 리스너 2 / error 이벤트 TypeError / click 뒤',
  ],
  5: [
    'onerror 5 TypeError / 취소됨 false / onerror false 반환 / 취소됨 true',
    'onerror 5 TypeError / 취소됨 false / onerror false 반환 / 취소됨 false',
  ],
  6: ['끝 / then 1 / error 이벤트 / then 2', '끝 / then 1 / unhandledrejection TypeError'],
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
  const numbers = [1, 2, 3, 4, 5, 6]
  const choiceCounts = [4, 3, 4, 4, 3, 3]

  it('퀴즈가 예제 1~6마다 하나씩 6개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(6)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.choices).toHaveLength(choiceCounts[n - 1])
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(out(n).join(' / '))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)('예제 %i 퀴즈: 오답은 계획의 오해 모델 출력 목록과 같다', (n) => {
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
  const rows = tableBody(mdx, [
    '예외가 나는 곳',
    '멈추는 것',
    '이어지는 것',
    '보고되는 방식',
    '근거',
  ])

  it('행 수와 칸 텍스트가 하드코딩 목록과 같다', () => {
    expect(rows).toEqual([
      [
        '파서가 실행하는 스크립트',
        '그 스크립트의 나머지',
        '마이크로태스크 체크포인트, 다음 스크립트',
        '전역 error 이벤트',
        '예제 1',
      ],
      [
        '스크립트의 문법 오류',
        '그 스크립트 전체(선언도 없음)',
        '다음 스크립트',
        '전역 error 이벤트',
        '예제 2',
      ],
      [
        '앞 스크립트가 선언한 let을 다시 선언',
        '그 스크립트 전체(선언도 없음)',
        '다음 스크립트',
        '전역 error 이벤트',
        '예제 3',
      ],
      [
        '리스너 안',
        '그 리스너의 나머지',
        '다음 리스너, 디스패치를 부른 코드',
        '전역 error 이벤트',
        '예제 4',
      ],
      [
        '타이머 콜백 안',
        '그 콜백의 나머지',
        '다음 태스크(예제 10에서는 다음 타이머)',
        '전역 error 이벤트',
        'try/catch/finally 예제 10',
      ],
      [
        'then 콜백 안',
        '그 콜백의 나머지',
        '같은 체크포인트의 다음 마이크로태스크',
        'then이 돌려준 프로미스의 거부(처리되지 않으면 unhandledrejection)',
        '예제 6',
      ],
    ])
  })

  it('예제 파일에 예외 뒤 출력 줄이 있어서, 출력에 없다는 것이 의미를 가진다', () => {
    expect(readExample(concept.examples[0].file)).toContain("console.log('1 끝')")
    expect(readExample(concept.examples[3].file)).toContain("console.log('리스너 1 끝')")
    expect(readExample(concept.examples[5].file)).toContain("console.log('then 1 끝')")
    expect(readExample(concept.examples[2].file)).toContain("console.log('다시 선언함')")
    expect(readExample(concept.examples[1].file)).toContain("console.log('1 시작')")
    // 예제 3: after는 typeof 없이 직접 읽어야 바인딩 존재의 증거가 된다.
    const declarations = readExample(concept.examples[2].file)
    expect(declarations).toContain('console.log(before, after, typeof later);')
    expect(declarations).not.toContain('typeof after')
  })

  it('행 1(예제 1): 예외 뒤의 코드는 멈추고, then이 다음 스크립트 앞에서 실행되며, error 이벤트가 있다', () => {
    const o = out(1)
    expect(o).not.toContain('1 끝')
    expect(o.indexOf('then')).toBeGreaterThan(-1)
    expect(o.indexOf('then')).toBeLessThan(o.indexOf('2 실행'))
    expect(o.some((l) => l.startsWith('error 이벤트'))).toBe(true)
  })

  it('행 2(예제 2): 문법 오류 스크립트는 실행되지 않고 다음 스크립트는 실행된다', () => {
    const o = out(2)
    expect(o).not.toContain('1 시작')
    expect(o).toContain('2 실행 undefined')
    expect(o).toContain('error 이벤트 SyntaxError')
  })

  it('행 3(예제 3): 다시 선언한 스크립트는 실행되지 않고 선언도 없으며 다음 스크립트는 실행된다', () => {
    const o = out(3)
    expect(o).not.toContain('다시 선언함')
    expect(o).toContain('다음 스크립트 undefined')
    expect(o).toContain('error 이벤트 SyntaxError')
  })

  it('행 4(예제 4): 예외 뒤 줄은 멈추고 다음 리스너와 디스패치 뒤 코드는 이어진다', () => {
    const o = out(4)
    expect(o).not.toContain('리스너 1 끝')
    expect(o).toContain('리스너 2')
    expect(o).toContain('click 뒤')
    expect(o).toContain('error 이벤트 TypeError')
    expect(o.indexOf('error 이벤트 TypeError')).toBeGreaterThan(o.indexOf('리스너 1'))
    expect(o.indexOf('error 이벤트 TypeError')).toBeLessThan(o.indexOf('리스너 2'))
  })

  it('행 5(타이머): error-handling 예제 10은 timer-error.js이고 error 이벤트와 다음 타이머가 있다', () => {
    const files = exampleFilesByNumber(errorHandlingMdx)
    expect(files.get(10)).toBe('timer-error.js')
    const example = errorHandling.examples.find((e) => e.file === files.get(10))!
    expect(example.expectedOutput.some((l) => l.includes('error 이벤트'))).toBe(true)
    expect(example.expectedOutput).toContain('다음 타이머')
  })

  it('행 6(예제 6): then 1 뒤 줄은 멈추고 error 이벤트는 없으며 then 2와 unhandledrejection이 있다', () => {
    const o = out(6)
    expect(o).not.toContain('then 1 끝')
    expect(o.some((l) => l.includes('error 이벤트'))).toBe(false)
    expect(o).toContain('then 2')
    expect(o.some((l) => l.startsWith('unhandledrejection'))).toBe(true)
  })
})

// --- 메타와 본문 조건 --------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 472이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(472)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('title·summary·goals·tags에 백틱이 없다', () => {
    const text = [concept.title, concept.summary, ...concept.goals, ...concept.tags].join('\n')
    expect(text).not.toContain('`')
  })

  it('예제는 모두 browser 런타임의 .html이다', () => {
    for (const e of concept.examples) {
      expect(e.runtime).toBe('browser')
      expect(e.file.endsWith('.html')).toBe(true)
    }
  })
})
