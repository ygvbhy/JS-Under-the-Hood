import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
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
const fileOf = (id: string) => concept.examples.find((e) => e.id === id)!.file

// 새 컨텍스트에서 스크립트로 실행한 마지막 식의 값(문자열) 또는 던져진 값의 이름.
// vm 오류는 다른 realm이라 instanceof가 통하지 않으므로 e.name으로 비교한다. 오류 객체가 아닌 값은 'threw 값'이다.
function show(code: string): string {
  try {
    return String(runInNewContext(code))
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'name' in e) return String(e.name)
    return `threw ${String(e)}`
  }
}

// 출력(console.log, util.format)과 던져진 오류의 이름을 함께 돌려준다.
function runCollect(code: string): { out: string[]; error: string | null } {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) } }
  try {
    runInNewContext(code, sandbox)
    return { out, error: null }
  } catch (e) {
    return { out, error: (e as Error).name }
  }
}

// 소스에서 from이 정확히 count번 있는지 확인한 뒤 모두 to로 바꾼다($ 패턴 해석을 피하려고 split/join을 쓴다).
function swap(src: string, from: string, to: string, count = 1): string {
  const parts = src.split(from)
  expect(parts.length - 1, from).toBe(count)
  return parts.join(to)
}

// --- 'use strict'; 접두 ---------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each(concept.examples.map((e) => [e.id, e.file, e.expectedOutput] as const))(
    '예제 %s',
    (_id, file, expectedOutput) => {
      const code = readExample(file)
      expect(code.startsWith(STRICT)).toBe(false)
      expect(runExample(code)).toEqual(expectedOutput)
      expect(runExample(STRICT + code)).toEqual(expectedOutput)
    },
  )
})

// --- 틀린 모델 -------------------------------------------------------------------------------
// 모델 이름: 줄 끝마다(모든 줄 끝에 세미콜론), 규칙 1만(맞지 않는 토큰 앞에만 넣고 제한된 생성 규칙은 없음), ASI 없음(직접 쓴 세미콜론만).
// 치환이 실제로 일어났는지 swap이 단언한다. 모델 출력은 정답과 달라야 한다.
// 퀴즈의 오답은 아래 모델을 실제로 실행한 결과에서 만든다(MODEL_RESULTS). 모델이 없는 오답은 NON_MODEL_WRONG에 따로 적는다.

type Collected = { out: string[]; error: string | null }
const L2 = 'var copy = box\n'
const L5 = 'var discount = price\n'
const src = (id: string) => readExample(fileOf(id))

const MODELS: Record<number, Record<string, () => Collected>> = {
  1: {
    규칙1만: () => runCollect(swap(src('return-newline'), 'return\n    a + b;', 'return a + b;')),
  },
  2: {
    줄끝마다: () =>
      runCollect(
        swap(
          swap(src('next-line-continues'), L2, 'var copy = box;\n'),
          L5,
          'var discount = price;\n',
        ),
      ),
    대괄호줄만이어짐: () =>
      runCollect(swap(src('next-line-continues'), L5, 'var discount = price;\n')),
    빼기줄만이어짐: () => runCollect(swap(src('next-line-continues'), L2, 'var copy = box;\n')),
  },
  3: {
    // 규칙 1만과 ASI 없음은 이 코드에서 같은 소스(a = b ++c)가 되어 같은 결과(SyntaxError)다.
    규칙1만: () => runCollect(swap(src('postfix-newline'), 'a = b\n++c', 'a = b ++c')),
    // 줄바꿈을 ++ 뒤로 옮긴 다른 코드다. 예제 원본에서는 이렇게 읽힐 수 없다.
    '++가 b에 붙고 c가 따로 남는다는 직관': () =>
      runCollect(swap(src('postfix-newline'), 'a = b\n++c', 'a = b++\nc')),
  },
  4: {
    규칙1만: () => runCollect(swap(src('break-label'), 'break\n    outer', 'break outer')),
    'outer가 break보다 먼저 평가된다는 오해': () =>
      runCollect(swap(src('break-label'), 'break\n    outer', 'outer\n    break')),
  },
}

// 모델 실행 결과를 퀴즈 선택지 문장으로 옮긴다. 오류로 멈춘 모델은 출력이 없어야 한다.
function toChoice(r: Collected): string {
  if (r.error !== null) {
    expect(r.out).toEqual([])
    return `아무것도 출력되지 않고 ${r.error}로 실행이 멈춥니다`
  }
  return r.out.join(' / ')
}

// 모델이 없는 오답. 예제 1의 SyntaxError 선택지는 "return 다음 줄의 식은 문법 오류다"라는 오해이고,
// 실행 모델이 아니다(원본은 오류 없이 실행된다는 단언으로 반박한다).
const NON_MODEL_WRONG: Record<number, string[]> = {
  1: ['아무것도 출력되지 않고 SyntaxError로 실행이 멈춥니다'],
}

const MODEL_RESULTS = (n: number) =>
  Object.entries(MODELS[n]).map(([name, run]) => [name, run()] as const)

describe('예제 1: return-newline', () => {
  const answer = concept.examples[0].expectedOutput

  it('규칙 1만(return 뒤 줄바꿈을 없앤 것과 같음)은 3 3이다', () => {
    const out = MODELS[1].규칙1만()
    expect(out).toEqual({ out: ['3 3'], error: null })
    expect(out.out).not.toEqual(answer)
  })

  it('return 다음 줄의 식은 문법 오류라는 오해는 틀리다: 원본은 오류 없이 실행된다', () => {
    expect(runCollect(src('return-newline'))).toEqual({ out: ['undefined 3'], error: null })
  })
})

describe('예제 2: next-line-continues', () => {
  const answer = concept.examples[1].expectedOutput

  it('줄 끝마다(2번·5번 줄 끝에 세미콜론)는 object 10이다', () => {
    const out = MODELS[2].줄끝마다()
    expect(out).toEqual({ out: ['object 10'], error: null })
    expect(out.out).not.toEqual(answer)
  })

  it('[ 줄만 이어진다(5번 줄 끝에만 세미콜론)는 number 10이다', () => {
    const out = MODELS[2].대괄호줄만이어짐()
    expect(out).toEqual({ out: ['number 10'], error: null })
    expect(out.out).not.toEqual(answer)
  })

  it('- 줄만 이어진다(2번 줄 끝에만 세미콜론)는 object 7이다', () => {
    const out = MODELS[2].빼기줄만이어짐()
    expect(out).toEqual({ out: ['object 7'], error: null })
    expect(out.out).not.toEqual(answer)
  })
})

describe('예제 3: postfix-newline', () => {
  const original = src('postfix-newline')

  it('규칙 1만(제한된 생성 규칙 없음, 이 코드에서는 ASI 없음과 같은 소스)은 SyntaxError로 아무것도 출력하지 않는다', () => {
    const out = MODELS[3].규칙1만()
    expect(out).toEqual({ out: [], error: 'SyntaxError' })
    // ASI 없음(직접 쓴 세미콜론만)도 원본을 그대로 실행하면 줄바꿈 뒤에 ++가 와서 같은 소스 모양이 된다.
    expect(swap(original, 'a = b\n++c', 'a = b ++c')).toContain('a = b ++c')
  })

  it('++가 b에 붙고 c가 따로 남는다는 직관은 줄바꿈을 ++ 뒤로 옮긴 다른 코드이고 1 2 1이다', () => {
    const moved = swap(original, 'a = b\n++c', 'a = b++\nc')
    expect(moved).not.toBe(original)
    expect(original).toContain('a = b\n++c')
    expect(original).not.toContain('a = b++\nc')
    expect(moved).toContain('a = b++\nc')
    expect(MODELS[3]['++가 b에 붙고 c가 따로 남는다는 직관']()).toEqual({
      out: ['1 2 1'],
      error: null,
    })
  })

  it('두 모델 모두 정답과 다르다', () => {
    for (const [, r] of MODEL_RESULTS(3)) {
      expect(r.out).not.toEqual(concept.examples[2].expectedOutput)
    }
  })
})

describe('예제 4: break-label', () => {
  const answer = concept.examples[3].expectedOutput

  it('규칙 1만(break outer)은 [00]이다', () => {
    const out = MODELS[4].규칙1만()
    expect(out).toEqual({ out: ['[00]'], error: null })
    expect(out.out).not.toEqual(answer)
  })

  it('6번 줄 outer가 평가된다고 보는 오해(outer가 break보다 먼저)는 ReferenceError로 출력이 없다', () => {
    const out = MODELS[4]['outer가 break보다 먼저 평가된다는 오해']()
    expect(out).toEqual({ out: [], error: 'ReferenceError' })
  })
})

// --- 탐침: 본문 주장마다 하나 ------------------------------------------------------------------

describe('탐침', () => {
  it('returnObj: return 다음 줄의 중괄호는 객체가 아니다(undefined 반환, 키: 값이 둘이면 둘째 :에서 SyntaxError, 단축 프로퍼티는 쉼표 식이라 오류 없음)', () => {
    expect(show('(function () { return\n{ a: 1 } })()')).toBe('undefined')
    expect(show('(function () { return\n{ a: 1, b: 2 } })()')).toBe('SyntaxError')
    expect(show('(function () { return\n{ a: 1, b } })()')).toBe('undefined')
    expect(show('(function () { return\n{ a, b } })()')).toBe('undefined')
    expect(show('(function () { return { a: 1, b: 2 } })().b')).toBe('2')
  })

  it('labelRef: 레이블 이름만 쓴 식은 변수 조회라 ReferenceError다', () => {
    expect(show('outer')).toBe('ReferenceError')
  })

  it('throwNl: throw 뒤 줄바꿈은 SyntaxError이고 같은 줄의 throw 1은 문법 오류가 아니다', () => {
    expect(show('throw\n1')).toBe('SyntaxError')
    expect(show('throw 1')).toBe('threw 1')
  })

  it('paren: 앞 줄이 n으로 끝나고 다음 줄이 (1)이면 n(1) 호출이라 TypeError다', () => {
    expect(show('var n = 2\n(1)')).toBe('TypeError')
    expect(show('var n = 2;\n(1)')).toBe('1')

    // n이 함수이면 오류 없이 호출 결과가 s에 들어간다(TypeError는 n이 함수가 아닐 때만).
    expect(show('var n = function (x) { return x + 1 }\nvar s = n\n(1)\n;s')).toBe('2')
  })

  it('tpl: 백틱으로 시작하는 줄은 앞 줄 끝의 식을 태그로 호출한다', () => {
    expect(show('var keep = function (s) { return typeof s }\nvar r = keep\n`x`\nr')).toBe('object')
  })

  it('ifElse: if 다음 줄에 바로 else가 오면 세미콜론이 들어가지 않아 SyntaxError다', () => {
    expect(show('var a = 1, b = 2, c\nif (a > b)\nelse c = 3')).toBe('SyntaxError')
  })

  it('forHead: for 머리를 줄로 나누면 SyntaxError다', () => {
    expect(show('for (var i = 0\ni < 2\ni++) {}')).toBe('SyntaxError')
    expect(show('for (var i = 0; i < 2; i++) {}\ni')).toBe('2')
  })

  it('oneLine: 같은 줄의 var m = 1 var n = 2는 SyntaxError이고 줄을 나누면 실행된다', () => {
    expect(show('var m = 1 var n = 2')).toBe('SyntaxError')
    expect(show('var m = 1\nvar n = 2\nn')).toBe('2')
  })

  it('braceRule: } 앞에는 같은 줄이어도 세미콜론이 들어간다', () => {
    expect(show('var x = 1;\n{ x = 2 }\nx')).toBe('2')
  })

  it('doWhile: do-while의 ) 바로 뒤에는 같은 줄의 토큰이 이어져도 끝 세미콜론이 들어간다', () => {
    expect(show('var n = 0\ndo n++; while (n < 3) n')).toBe('3')
  })

  it('contLabel: continue 다음 줄의 레이블은 continue의 레이블이 되지 않는다', () => {
    const body = (c: string) =>
      "var s = ''\nouter: for (var i = 0; i < 2; i++) {\n  for (var j = 0; j < 3; j++) {\n" +
      `    if (j === 1) {\n      ${c}\n    }\n    s = s + i + j + ','\n  }\n}\ns`
    expect(show(body('continue\n      outer'))).toBe('00,02,10,12,')
    expect(show(body('continue outer'))).toBe('00,10,')
  })

  it('fnDecl: 함수 선언의 } 다음 줄의 [는 앞 줄에 이어지지 않는다', () => {
    expect(show('function f() { return 1 }\n[1, 2].length')).toBe('2')
  })

  it('returnMinus: return 뒤의 -3도 이어지지 않아 undefined다', () => {
    expect(show('(function () { return\n-3 })()')).toBe('undefined')
    expect(show('(function () { return -3 })()')).toBe('-3')
  })

  it('afterReturn: return 다음 줄의 식은 평가되지 않는다', () => {
    expect(show("var hit = 'no'; function t(){ return\n hit = 'yes' } t(); hit")).toBe('no')
  })

  it('postfixBracket·postfixParen: 후위 ++로 끝난 줄 다음 줄의 [나 (는 이어지지 않고 세미콜론이 들어간다', () => {
    expect(show('var i = 0; var arr = [9]\nvar r = i++\n[0]\nr')).toBe('0')
    expect(show('var i = 0\nvar r = i++\n(1)\nr')).toBe('0')

    // [0]은 별개의 배열 리터럴 식 문이다: 스크립트의 완료 값이 그 배열이고, i는 한 번만 증가했다.
    expect(runInNewContext('var i = 0\nvar r = i++\n[0]')).toEqual([0])
    expect(show('var i = 0\nvar r = i++\n[0]\n;[r, i].join()')).toBe('0,1')
  })

  it('noBacktrack: 같은 줄의 뒤쪽 토큰이 맞지 않아도 앞 줄 끝으로 되돌아가 세미콜론을 넣지 않는다', () => {
    expect(show('var n = function () { return 1 }\nvar s = n\n(1) 2')).toBe('SyntaxError')
  })

  it('labelShadow: 같은 이름의 변수가 있으면 레이블 이름만 쓴 식도 ReferenceError가 아니다', () => {
    expect(show('var outer = 5\nouter')).toBe('5')
  })

  it('eofNoSemi: 입력 끝에 세미콜론이 없어도 실행된다', () => {
    expect(runCollect('console.log(1)')).toEqual({ out: ['1'], error: null })
  })
})

// --- 규칙 표 ------------------------------------------------------------------------------------

describe('규칙 표', () => {
  const rows = tableBody(mdx, ['앞 줄', '다음 줄', '세미콜론', '이렇게 읽힌다', '근거'])

  it('행 수와 칸 텍스트가 하드코딩 목록과 같다', () => {
    expect(rows).toEqual([
      ['return', 'a + b', '넣는다', 'return; a + b;', '줄바꿈을 금지한 자리의 줄바꿈'],
      ['a = b', '++c', '넣는다', 'a = b; ++c;', '줄바꿈을 금지한 자리의 줄바꿈'],
      ['break', 'outer', '넣는다', 'break; outer;', '줄바꿈을 금지한 자리의 줄바꿈'],
      ['throw', '1', '넣는다', 'throw; 1; (SyntaxError)', '줄바꿈을 금지한 자리의 줄바꿈'],
      ['var m = 1', 'var n = 2', '넣는다', 'var m = 1; var n = 2;', '맞지 않는 토큰 앞 줄바꿈'],
      [
        'var copy = box',
        "['size']",
        '넣지 않는다',
        "var copy = box['size'];",
        '이어 읽어도 문법에 맞음',
      ],
      [
        'var discount = price',
        '-3',
        '넣지 않는다',
        'var discount = price - 3;',
        '이어 읽어도 문법에 맞음',
      ],
      [
        'var s = n',
        '(1)',
        '넣지 않는다',
        'var s = n(1); (n이 함수가 아니면 TypeError)',
        '이어 읽어도 문법에 맞음',
      ],
    ])
  })

  // 행마다: 래퍼(함수 본문), 반대 해석(다른 결과가 나와야 함), 두 쪽의 결과.
  // 두 줄 코드 바로 뒤에는 새 줄의 명시적 세미콜론을 두고, 결과는 앞 줄에 이어 읽힐 수 없는 return [...]에서 읽는다.
  const fn = (setup: string, read: string) => (c: string) =>
    `(function (a, b) {\n${setup}\n${c}\n${read}\n})(1, 2)`
  const cases: {
    wrap: (c: string) => string
    other: string
    result: string
    otherResult: string
  }[] = [
    {
      wrap: fn('', ''),
      other: 'return a + b;',
      result: 'undefined',
      otherResult: '3',
    },
    {
      wrap: fn('var a = 1, b = 1, c = 1;', 'return [a, b, c].join();'),
      other: 'a = b ++c',
      result: '1,1,2',
      otherResult: 'SyntaxError',
    },
    {
      wrap: (c) =>
        "(function () {\nvar log = '';\nouter: for (var i = 0; i < 2; i++) {\n" +
        `for (var j = 0; j < 2; j++) {\nlog = log + i + j + ',';\n${c}\n}\n}\nreturn log;\n})()`,
      other: 'break outer;',
      result: '00,10,',
      otherResult: '00,',
    },
    {
      wrap: (c) => c,
      other: 'throw 1;',
      result: 'SyntaxError',
      otherResult: 'threw 1',
    },
    {
      wrap: fn('', 'return [m, n].join();'),
      other: 'var m = 1 var n = 2',
      result: '1,2',
      otherResult: 'SyntaxError',
    },
    {
      wrap: fn('var box = { size: 3 };', 'return [copy].join();'),
      other: "var copy = box; ['size'];",
      result: '3',
      otherResult: '[object Object]',
    },
    {
      wrap: fn('var price = 10;', 'return [discount].join();'),
      other: 'var discount = price; -3;',
      result: '7',
      otherResult: '10',
    },
    {
      wrap: fn('var n = 2;', 'return [s].join();'),
      other: 'var s = n;\n(1);',
      result: 'TypeError',
      otherResult: '2',
    },
  ]

  it('행과 케이스의 수가 같다', () => {
    expect(cases).toHaveLength(rows.length)
  })

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    '행 %i: 두 줄 코드와 이렇게 읽힌다 칸의 코드는 같은 결과이고 반대 해석은 다르다',
    (i) => {
      const row = rows[i]
      const c = cases[i]
      const two = `${row[0]}\n${row[1]}\n;`
      const reads = row[3].replace(/ \((?:n이 함수가 아니면 )?(SyntaxError|TypeError)\)$/, '')
      const resultTwo = show(c.wrap(two))
      const resultReads = show(c.wrap(reads))
      const resultOther = show(c.wrap(c.other))
      expect(resultTwo).toBe(c.result)
      expect(resultReads).toBe(resultTwo)
      expect(resultOther).toBe(c.otherResult)
      expect(resultOther).not.toBe(resultTwo)
    },
  )

  it('throw 행은 두 쪽 모두 SyntaxError이고 같은 줄의 throw 1은 SyntaxError가 아니다', () => {
    expect(show('throw\n1\n;')).toBe('SyntaxError')
    expect(show('throw; 1;')).toBe('SyntaxError')
    expect(show('throw 1;')).not.toBe('SyntaxError')
  })

  it('괄호 행은 두 쪽 모두 TypeError이고 var s = n;과 (1)을 나누면 오류가 없다', () => {
    const wrap = cases[7].wrap
    expect(show(wrap('var s = n\n(1)\n;'))).toBe('TypeError')
    expect(show(wrap('var s = n(1);'))).toBe('TypeError')
    expect(show(wrap('var s = n;\n(1);'))).not.toBe('TypeError')
  })
})

// --- 퀴즈 -------------------------------------------------------------------------------------

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
  const numbers = [1, 2, 3, 4]
  const choiceCounts = [3, 4, 3, 3]

  it('퀴즈가 예제 1~4마다 하나씩 4개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(numbers)
    expect(concept.examples).toHaveLength(4)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(numbers)
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it.each(numbers)('예제 %i 퀴즈: 정답은 expectedOutput을 " / "로 이은 문자열이다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const expected = concept.examples[n - 1].expectedOutput.join(' / ')
    expect(quiz.choices).toHaveLength(choiceCounts[n - 1])
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expected)
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(numbers)('예제 %i 퀴즈: 오답은 틀린 모델의 출력과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const fromModels = MODEL_RESULTS(n).map(([, r]) => toChoice(r))
    expect(new Set(wrong)).toEqual(new Set([...fromModels, ...(NON_MODEL_WRONG[n] ?? [])]))
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

// --- 메타와 본문 조건 --------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
  })

  it('order는 105이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(105)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('title·summary·goals에 백틱이 없다', () => {
    const text = [concept.title, concept.summary, ...concept.goals].join('\n')
    expect(text).not.toContain('`')
  })

  it('본문에 throw를 조기 오류라 쓰거나 소스를 고쳐 쓴다고 쓴 문장이 없다', () => {
    expect(mdx).not.toContain('조기 오류')
    expect(mdx).not.toMatch(/소스(를|가) (고쳐|바꿔)|코드를 (고쳐|바꿔) 쓴/)
  })
})
