import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { filterConcepts, getConcept } from '~/lib/concepts'
import { tableBody } from '../../../tests/helpers/expression-tables'
import { exampleFilesByNumber } from '../../../tests/helpers/result-tables'
import { runExample } from '../../../tests/helpers/run-example'
import { concept } from './meta'

const STRICT = "'use strict';\n"
const dir = import.meta.dirname
const readExample = (file: string) => readFileSync(join(dir, 'examples', file), 'utf8')
const mdx = readFileSync(join(dir, 'content.mdx'), 'utf8')
const EXAMPLE_IDS = [
  'species-basic',
  'constructor-property',
  'species-override',
  'old-vs-class',
  'constructor-signature',
  'receiver-and-this',
]
const src = (n: number) => readExample(concept.examples[n - 1].file)
const expectedOf = (n: number) => concept.examples[n - 1].expectedOutput

// vm은 다른 realm이라 instanceof가 통하지 않으므로 오류 종류는 e.name으로 비교한다.
function errorNameOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (e) {
    return (e as Error).name
  }
  return undefined
}

// --- 예제 파일 조건 -------------------------------------------------------------------------------

describe('예제 파일 조건', () => {
  it('예제 6개가 계획의 순서와 파일 이름으로 등록되어 있다', () => {
    expect(concept.examples.map((e) => e.id)).toEqual(EXAMPLE_IDS)
    expect(concept.examples.map((e) => e.file)).toEqual(EXAMPLE_IDS.map((id) => `${id}.js`))
    expect([...exampleFilesByNumber(mdx).values()]).toEqual(concept.examples.map((e) => e.file))
  })

  it('예제 파일에 eval·스프레드(...)·지시어가 없다', () => {
    for (const e of concept.examples) {
      const code = readExample(e.file)
      expect(code, e.file).not.toMatch(/\beval\b/)
      expect(code, e.file).not.toContain('...')
      expect(code.startsWith(STRICT), e.file).toBe(false)
    }
  })
})

// --- 'use strict'; 접두 ----------------------------------------------------------------------------

describe("'use strict'; 접두 검사", () => {
  it.each([1, 2, 3, 4, 5, 6])('예제 %i: 붙여도 출력이 같다', (n) => {
    expect(runExample(src(n))).toEqual(expectedOf(n))
    expect(runExample(STRICT + src(n))).toEqual(expectedOf(n))
  })
})

// --- 틀린 모델 -------------------------------------------------------------------------------------
// 예제 파일 원문을 명시 치환(치환 횟수를 단언)한 코드를 같은 실행기 방식으로 실행한다.
// 출력은 하드코딩해 단언한다. 퀴즈의 오답은 이 모델 출력에서 만든다.

function runModel(code: string): string {
  const out: string[] = []
  const sandbox = { console: { log: (...a: unknown[]) => out.push(format(...a)) } }
  runInNewContext(code, sandbox, { timeout: 2000 })
  return out.join(' / ')
}

// from이 정확히 count번 있는지 확인한 뒤 모두 to로 바꾼다($ 패턴 해석을 피하려고 split/join을 쓴다).
function rep(code: string, from: string, to: string, count = 1): string {
  const parts = code.split(from)
  expect(parts.length - 1, from).toBe(count)
  return parts.join(to)
}

type Model = {
  name: string
  apply: (code: string) => string
  // runModel이 돌려주는 값(하드코딩)
  output: string
  // 퀴즈 선택지에 오르는지(예제 2의 D 모델은 퀴즈에 쓰지 않는다)
  inQuiz?: boolean
}

// 예제 2·3의 species 재정의 클래스 치환
const speciesClass = (ret: string) =>
  `class MyArr extends Array {\n  static get [Symbol.species]() {\n    return ${ret};\n  }\n}`

// 예제 5: 결과 생성자를 만드는 species(인수 처리만 다름)
const todoSpecies = (ctorBody: string) =>
  '    this.name = name;\n  }\n  static get [Symbol.species]() {\n    const Base = this;\n    return class extends Base {\n      constructor() {\n        ' +
  ctorBody +
  '\n      }\n    };\n  }\n'

const MODELS: Record<number, Model[]> = {
  1: [
    {
      name: '배열 메서드는 늘 Array',
      apply: (c) => rep(c, 'class MyArr extends Array {}', speciesClass('Array')),
      output: 'true / false / Array / false / false',
    },
    {
      name: '콜백을 받는 메서드만',
      apply: (c) =>
        rep(
          rep(c, 'nums.slice(1)', 'Array.from(nums.slice(1))'),
          'nums.concat([4])',
          'Array.from(nums.concat([4]))',
        ),
      output: 'true / true / MyArr / false / false',
    },
    {
      name: 'of는 Array의 메서드라 늘 Array',
      apply: (c) => rep(c, 'MyArr.of(', 'Array.of('),
      output: 'false / false / Array / false / false',
    },
  ],
  2: [
    {
      name: '원본 프로토타입으로',
      apply: (c) =>
        rep(
          rep(
            c,
            'plain.map((x) => x)',
            'Object.setPrototypeOf(plain.map((x) => x), Object.getPrototypeOf(plain))',
          ),
          'mine.map((x) => x)',
          'Object.setPrototypeOf(mine.map((x) => x), Object.getPrototypeOf(mine))',
        ),
      output: 'false / true / true / false true',
    },
    {
      name: '늘 Array',
      apply: (c) =>
        rep(
          rep(c, 'plain.map((x) => x)', 'Array.from(plain.map((x) => x))'),
          'mine.map((x) => x)',
          'Array.from(mine.map((x) => x))',
        ),
      output: 'false / false / true / false true',
    },
    {
      name: '하위 클래스마다 자기 species',
      apply: (c) =>
        rep(
          c,
          'class MyArr extends Array {}',
          'class MyArr extends Array {}\nObject.defineProperty(MyArr, Symbol.species, { value: MyArr });',
        ),
      output: 'true / false / true / true true',
    },
    {
      name: 'species는 직접 정의해야',
      apply: (c) => rep(c, 'class MyArr extends Array {}', speciesClass('undefined')),
      output: 'false / false / false / true true',
      inQuiz: false,
    },
  ],
  3: [
    {
      name: 'species가 모든 생성을 바꾼다',
      apply: (c) =>
        rep(
          rep(rep(c, 'Plain.of(', 'Array.of('), 'Plain.from(', 'Array.from('),
          'new Plain()',
          'new Array()',
        ),
      output: 'false / false / false / false / false',
    },
    {
      name: 'species 무시',
      apply: (c) => rep(c, '  static get [Symbol.species]() {\n    return Array;\n  }\n', ''),
      output: 'true / true / true / true / true',
    },
    {
      name: 'species가 from·of까지',
      apply: (c) => rep(rep(c, 'Plain.of(', 'Array.of('), 'Plain.from(', 'Array.from('),
      output: 'false / false / false / false / true',
    },
  ],
  4: [
    {
      name: 'class도 옛 방식과 같다',
      apply: (c) =>
        rep(
          c,
          'class NewArr extends Array {}',
          'function NewArr() {\n  Array.call(this);\n}\nNewArr.prototype = Object.create(Array.prototype);\nNewArr.prototype.constructor = NewArr;',
        ),
      output: 'old true false 2 / class true false 2',
    },
    {
      name: '부모 생성자를 불렀으니 배열',
      apply: (c) =>
        rep(c, 'const old = new OldArr();', 'const old = Reflect.construct(Array, [], OldArr);'),
      output: 'old true true 6 / class true true 6',
    },
    {
      name: 'instanceof Array는 진짜 배열만',
      apply: (c) =>
        rep(c, "console.log('old', old instanceof Array", "console.log('old', Array.isArray(old)"),
      output: 'old false false 2 / class true true 6',
    },
  ],
  5: [
    {
      name: '원본 생성자 인수를 다시 넘긴다',
      apply: (c) => rep(c, '    this.name = name;\n  }\n', todoSpecies("super('work');")),
      output: 'work / work / work / ["a","c"] 2 / work',
    },
    {
      name: '인수 없이 부른다',
      apply: (c) => rep(c, '    this.name = name;\n  }\n', todoSpecies('super();')),
      output: 'work / undefined / undefined / ["a","c"] 2 / undefined',
    },
    {
      name: '결과 길이를 넘긴다',
      apply: (c) =>
        rep(
          rep(
            rep(
              c,
              'todos.map((x) => x.toUpperCase()).name',
              'new TodoList(todos.map((x) => x.toUpperCase()).length).name',
            ),
            'console.log(rest.name);',
            'console.log(new TodoList(rest.length).name);',
          ),
          'todos.slice(1).name',
          'new TodoList(todos.slice(1).length).name',
        ),
      output: 'work / 3 / 2 / ["a","c"] 2 / 2',
    },
  ],
  6: [
    {
      name: '인수에 하위 클래스가 있으면 결과도',
      apply: (c) =>
        rep(
          rep(c, '[0].concat(mine)', 'MyArr.from([0].concat(mine))'),
          'Array.from(mine)',
          'MyArr.from(mine)',
        ),
      output: 'true / true / true / true',
    },
    {
      name: 'concat은 species를 안 쓴다',
      apply: (c) => rep(c, 'mine.concat([0])', 'Array.from(mine.concat([0]))'),
      output: 'false / false / false / true',
    },
    {
      name: 'Array.from이 원본 클래스를 유지',
      apply: (c) => rep(c, 'Array.from(mine)', 'MyArr.from(mine)'),
      output: 'true / false / true / true',
    },
  ],
}

const NUMBERS = [1, 2, 3, 4, 5, 6]

describe('틀린 모델', () => {
  it('치환 없이 같은 실행기로 돌리면 expectedOutput과 같다(실행기 대조)', () => {
    for (const n of NUMBERS) expect(runModel(src(n)), `예제 ${n}`).toBe(expectedOf(n).join(' / '))
  })

  it('예제 4에서 옛 방식 생성자의 Array.call(this)를 지워도 출력이 같다', () => {
    const code = rep(src(4), '  Array.call(this);\n', '')
    expect(runModel(code)).toBe('old true false 2 / class true true 6')
    expect(runModel(code)).toBe(expectedOf(4).join(' / '))
  })

  for (const n of NUMBERS) {
    describe(`예제 ${n}`, () => {
      it.each(MODELS[n].map((m) => [m.name, m] as const))(
        '%s: 출력이 하드코딩 값과 같고 정답과 다르다',
        (_name, m) => {
          const output = runModel(m.apply(src(n)))
          expect(output).toBe(m.output)
          expect(output).not.toBe(expectedOf(n).join(' / '))
        },
      )
    })
  }
})

// --- 퀴즈 ------------------------------------------------------------------------------------------

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
  it('퀴즈가 예제 1~6마다 하나씩 6개 있고 예제 번호가 본문 예제와 같다', () => {
    expect(quizzes.map((q) => q.example)).toEqual(NUMBERS)
    expect([...exampleFilesByNumber(mdx).keys()]).toEqual(NUMBERS)
  })

  it('선택지와 정답 위치가 계획과 같다', () => {
    expect(quizzes.map((q) => q.choices)).toEqual([
      [
        'true / false / Array / false / false',
        'true / true / MyArr / false / false',
        'false / false / Array / false / false',
        'true / true / MyArr / true / true',
      ],
      [
        'true / false / true / false true',
        'false / true / true / false true',
        'false / false / true / false true',
        'true / false / true / true true',
      ],
      [
        'false / false / false / false / false',
        'true / false / false / true / true',
        'true / true / true / true / true',
        'false / false / false / false / true',
      ],
      [
        'old true false 2 / class true false 2',
        'old true true 6 / class true true 6',
        'old true false 2 / class true true 6',
        'old false false 2 / class true true 6',
      ],
      [
        'work / work / work / ["a","c"] 2 / work',
        'work / undefined / undefined / ["a","c"] 2 / undefined',
        'work / 3 / 2 / ["a","c"] 2 / 2',
        'work / 3 / 0 / ["a","c"] 2 / 2',
      ],
      [
        'true / true / true / true',
        'true / false / false / true',
        'false / false / false / true',
        'true / false / true / true',
      ],
    ])
    expect(quizzes.map((q) => q.answer)).toEqual([3, 0, 1, 2, 3, 1])
  })

  it.each(NUMBERS)('예제 %i 퀴즈: 정답 선택지는 실제 출력이고 선택지에 중복이 없다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    expect(quiz.answer).toBeLessThan(quiz.choices.length)
    expect(quiz.choices[quiz.answer]).toBe(expectedOf(n).join(' / '))
    expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
  })

  it.each(NUMBERS)('예제 %i 퀴즈: 오답 선택지 집합은 퀴즈에 쓴 모델 출력 집합과 같다', (n) => {
    const quiz = quizzes.find((q) => q.example === n)!
    const wrong = quiz.choices.filter((_, i) => i !== quiz.answer)
    const fromModels = MODELS[n]
      .filter((m) => m.inQuiz !== false)
      .map((m) => runModel(m.apply(src(n))))
    expect(new Set(fromModels)).toEqual(new Set(wrong))
  })

  it('정답 위치(answer)가 예제마다 모두 같지는 않다', () => {
    expect(new Set(quizzes.map((q) => q.answer)).size).toBeGreaterThan(1)
  })

  it('explanation 속성에는 큰따옴표와 백슬래시가 없고 오답 모델을 짚는다', () => {
    for (const q of quizzes) {
      expect(q.block, `예제 ${q.example}`).toMatch(/explanation="[^"\\]*"\s*$/)
      expect(q.block, `예제 ${q.example}`).toContain('모델')
    }
  })
})

// --- 표 ----------------------------------------------------------------------------------------------

describe('결과 표', () => {
  const rows = tableBody(mdx, ['예제', '결과'])

  it('행이 6개이고 첫 칸이 예제 N으로 시작하며 결과 칸이 expectedOutput과 같다', () => {
    expect(rows).toHaveLength(6)
    rows.forEach((r, i) => {
      expect(r[0]).toMatch(new RegExp(`^예제 ${i + 1}: `))
      expect(r[1]).toBe(expectedOf(i + 1).join(' / '))
    })
  })
})

describe('생성 경로 표', () => {
  const rows = tableBody(mdx, [
    '호출',
    '생성자를 얻는 곳',
    '생성자에 넘기는 인수',
    '결과가 MyArr인가',
  ])

  // 행마다 새 컨텍스트에서 생성자 인수를 기록하는 하위 클래스로 호출 칸을 실행한다.
  function probe(call: string): { calls: unknown[][]; isMyArr: boolean } {
    const code = `
      const calls = [];
      class MyArr extends Array {
        constructor(...args) {
          calls.push(args);
          super(...args);
        }
      }
      const a = MyArr.of(1, 2, 3);
      calls.length = 0;
      const r = ${call};
      JSON.stringify({ calls, isMyArr: r instanceof MyArr });
    `
    return JSON.parse(runInNewContext(code) as string)
  }

  it('행이 11개이고 호출 칸이 계획과 같다', () => {
    expect(rows).toHaveLength(11)
    expect(rows.map((r) => r[0])).toEqual([
      'a.map((x) => x)',
      'a.filter((x) => x > 1)',
      'a.slice(1)',
      'a.concat([4])',
      'a.flat()',
      'a.flatMap((x) => [x])',
      'a.splice(0, 2)',
      'MyArr.of(7, 8)',
      'MyArr.from({ length: 2 })',
      'MyArr.from([1, 2])',
      'Array.from(a)',
    ])
  })

  it.each([...Array(11).keys()])('%i번째 행: 생성자 얻는 곳·인수·결과가 실행과 같다', (i) => {
    const [call, source, args, isMy] = rows[i]
    const result = probe(call)

    if (call.startsWith('a.')) expect(source).toBe('a.constructor[Symbol.species]')
    else if (call.startsWith('MyArr.')) expect(source).toBe('this(MyArr)')
    else if (call.startsWith('Array.from')) expect(source).toBe('this(Array)')
    else throw new Error(`알 수 없는 호출 칸: ${call}`)

    if (args === 'MyArr를 부르지 않음') expect(result.calls).toEqual([])
    else if (args === '인수 없음') expect(result.calls).toEqual([[]])
    else {
      expect(args).toMatch(/^\d+$/)
      expect(result.calls).toEqual([[Number(args)]])
    }

    expect(isMy).toBe(result.isMyArr ? '예' : '아니요')
  })
})

describe('표 마크업', () => {
  it('표가 region 래퍼 안에 있고 칸에 <가 없다', () => {
    expect(mdx.match(/role="region"/g)).toHaveLength(2)
    expect(mdx.match(/좁은 화면에서는 가로로 스크롤할 수 있습니다/g)).toHaveLength(2)
    for (const m of mdx.matchAll(/^[ \t]*<table\b[\s\S]*?<\/table>/gm)) {
      expect(m[0]).not.toMatch(/\{\s*['"`][^'"`]*</)
    }
  })
})

// --- 본문 ② 단계 주장 -----------------------------------------------------------------------------

describe('ArraySpeciesCreate의 단계', () => {
  const mapResultName = (setup: string) =>
    runInNewContext(`${setup}\nMyArr.of(1, 2).map((x) => x).constructor.name`) as string
  const speciesReturning = (value: string) =>
    `class MyArr extends Array { static get [Symbol.species]() { return ${value}; } }`

  it('species가 undefined를 돌려주면 map 결과는 Array다', () => {
    expect(mapResultName(speciesReturning('undefined'))).toBe('Array')
  })

  it('species가 null을 돌려주면 map 결과는 Array다', () => {
    expect(mapResultName(speciesReturning('null'))).toBe('Array')
  })

  it('species가 생성자가 아닌 1을 돌려주면 TypeError다', () => {
    expect(errorNameOf(() => mapResultName(speciesReturning('1')))).toBe('TypeError')
  })

  it('인스턴스의 constructor 프로퍼티가 undefined이면 map 결과는 Array다', () => {
    expect(
      runInNewContext(
        'class MyArr extends Array {}\nconst a = MyArr.of(1, 2);\na.constructor = undefined;\na.map((x) => x).constructor.name',
      ),
    ).toBe('Array')
  })

  it('Array.from·Array.of의 this가 생성자가 아니면 보통의 Array를 만든다(⑤)', () => {
    const plainArray = (expr: string) =>
      runInNewContext(
        `const r = ${expr};\nArray.isArray(r) && Object.getPrototypeOf(r) === Array.prototype`,
      )
    expect(plainArray('Array.of.call({}, 1)')).toBe(true)
    expect(plainArray('Array.from.call(undefined, [1])')).toBe(true)
  })
})

// --- 본문 ② constructor 상속과 ④ 생성자 시그니처 대안 -------------------------------------------

describe('constructor 상속과 생성자 시그니처', () => {
  it('② 인스턴스에는 자기 constructor가 없고 MyArr.prototype에 있다', () => {
    expect(
      runInNewContext(
        "class MyArr extends Array {}\nconst mine = MyArr.of(1, 2);\n[mine.hasOwnProperty('constructor'), MyArr.prototype.hasOwnProperty('constructor')].join(' ')",
      ),
    ).toBe('false true')
  })

  it('예제 2 이유: [[Prototype]]만 바꿔도 constructor를 거쳐 결과가 MyArr다', () => {
    expect(
      runInNewContext(
        'class MyArr extends Array {}\nObject.setPrototypeOf([1, 2], MyArr.prototype).map((x) => x) instanceof MyArr',
      ),
    ).toBe(true)
  })

  it('④ species를 Array로 돌려줘도 of·from은 바뀐 생성자를 길이나 인수 없이 부른다', () => {
    const out = runInNewContext(`
      class TodoList extends Array {
        constructor(name) {
          super();
          this.name = name;
        }
        static get [Symbol.species]() {
          return Array;
        }
      }
      const todos = new TodoList('work');
      todos.push('a', 'b', 'c');
      [todos.map((x) => x) instanceof TodoList, TodoList.of('a', 'b').name, TodoList.from(['a']).name].join(' ')
    `)
    expect(out).toBe('false 2 ')
  })

  it('④ 생성자를 생략하고 이름을 정적 메서드에서 정하면 넘기는 수가 이름 자리에 들어가지 않는다', () => {
    const out = runInNewContext(`
      class TodoList extends Array {
        static named(name, ...items) {
          const list = this.of(...items);
          list.name = name;
          return list;
        }
      }
      const todos = TodoList.named('work', 'a', 'b', 'c');
      JSON.stringify([
        todos.name,
        todos.map((x) => x).name,
        todos.filter((x) => x !== 'b').name,
        TodoList.of('a', 'b').name,
        TodoList.from(['a']).name,
        todos.map((x) => x.toUpperCase()),
      ])
    `)
    expect(out).toBe('["work",null,null,null,null,["A","B","C"]]')
  })

  it('④ 본문이 species 재정의의 한계와 MDN 경고를 밝힌다', () => {
    expect(mdx).toContain('species와 무관하게 이 생성자를 부르므로 같은 문제가 남습니다')
    expect(mdx).toContain('`Symbol.species`에 의존하는 것은 MDN도 권하지 않습니다')
    expect(concept.simplifications.join('\n')).toContain('되도록 의존하지 말라고 경고합니다')
  })
})

// --- simplifications 근거 -------------------------------------------------------------------------

describe('species를 쓰지 않는 경로(simplifications 근거)', () => {
  const isMyArr = (expr: string) =>
    runInNewContext(
      `class MyArr extends Array {}\nconst a = MyArr.of(3, 1, 2);\n(${expr}) instanceof MyArr`,
    ) as boolean
  const supports = (method: string) =>
    runInNewContext(`typeof Array.prototype.${method}`) === 'function'

  it.each([
    ['toSorted', 'a.toSorted()'],
    ['toReversed', 'a.toReversed()'],
    ['toSpliced', 'a.toSpliced(0, 1)'],
    ['with', 'a.with(0, 9)'],
  ])('%s 결과는 MyArr 인스턴스가 아니다', (method, expr) => {
    if (!supports(method)) return // 이 런타임이 지원하지 않는 메서드는 건너뛴다.
    expect(isMyArr(expr)).toBe(false)
  })

  it('스프레드로 만든 배열은 MyArr 인스턴스가 아니다', () => {
    expect(isMyArr('[...a]')).toBe(false)
  })
})

// --- 메타와 본문 조건 ----------------------------------------------------------------------------

describe('메타와 본문 조건', () => {
  it('title·summary·tags·goals에 "객체"가 없어 홈의 "객체" 검색에 걸리지 않는다', () => {
    expect(filterConcepts([concept], '객체')).toEqual([])
    expect(
      [concept.title, concept.summary, ...concept.tags, ...concept.goals].join('\n'),
    ).not.toContain('객체')
  })

  it('order는 273이고 summary는 160자 이하다', () => {
    expect(concept.order).toBe(273)
    expect(concept.summary.length).toBeLessThanOrEqual(160)
  })

  it('slug가 있는 선수 개념의 order는 모두 273보다 작다', () => {
    for (const p of concept.prerequisites) {
      if ('slug' in p && p.slug) expect(getConcept(p.slug).order, p.slug).toBeLessThan(273)
    }
  })

  it('독자용 본문에 "테스트"와 eval이 없고 문단이 import·export로 시작하지 않는다', () => {
    expect(mdx).not.toContain('테스트')
    expect(mdx).not.toMatch(/\beval\b/)
    expect(mdx).not.toMatch(/^(import|export)\b/m)
  })

  it('① 옛 방식의 length는 push가 자기 프로퍼티로 써 넣은 결과라고 밝힌다', () => {
    expect(mdx).toContain('객체에 자기 프로퍼티 `length`를 써 넣은 결과입니다')
  })

  it('② this 값이 배열이 아니면 생성자 없이 보통 배열을 만든다는 단계를 쓴다', () => {
    expect(mdx).toContain(
      '`this` 값이 배열이 아니면 생성자를 부르지 않고 보통 배열을 바로 만듭니다',
    )
  })

  it('⑤ [0].concat(mine)은 Array라는 문장이 있다', () => {
    expect(mdx).toContain('`[0].concat(mine)`은 `Array`입니다')
  })
})
