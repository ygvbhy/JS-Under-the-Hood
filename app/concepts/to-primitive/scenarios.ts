import type { LineRange, Scenario, Step } from '~/simulator/types'
import arrayAndObjectCode from './examples/array-and-object.js?raw'
import hintOrderCode from './examples/hint-order.js?raw'
import typeErrorCode from './examples/type-error.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - call: 지금 평가 중인 식(예 `o + ''`). 요약·시작 단계는 null이다.
// - target: 지금 원시 값으로 바꾸는 피연산자(예 'o', '[]', '{}'). 없으면 null이다.
// - hint: ToPrimitive가 받은 값. 'none'은 힌트를 주지 않은 호출이다. 없으면 null이다.
// - exotic: Symbol.toPrimitive 메서드를 확인한 상태. 명세는 이것을 먼저 확인하고,
//   없을 때만 OrdinaryToPrimitive로 간다.
// - ordinaryHint: exotic이 없다고 확인한 뒤 OrdinaryToPrimitive에 넘긴 값. 힌트 'none'이 number가 되는 것은
//   이 단계다(확인 전에는 null이다).
// - attempts: OrdinaryToPrimitive가 메서드를 부르는 순서. 원시 값을 얻으면 남은 메서드는 'not-called'다.
//   value는 그 메서드가 돌려준 값을 코드 표기로 쓴 글자다(문자열은 작은따옴표로 감싼다).
// - outcome: ToPrimitive의 결과. 값과 타입을 함께 담아 숫자 1과 문자열 '1'을 구분한다.
// - after: ToPrimitive가 끝난 뒤 연산이 그 원시 값으로 하는 일.

export type Method = 'valueOf' | 'toString'
export type Hint = 'none' | 'string' | 'number'
export type ExoticStatus = 'unchecked' | 'absent' | 'present'
export type AttemptStatus =
  'pending' | 'not-callable' | 'returned-object' | 'returned-primitive' | 'not-called'
export type PrimitiveType = 'number' | 'string' | 'boolean'

export type Attempt = { method: Method; status: AttemptStatus; value?: string }
export type Outcome =
  { kind: 'primitive'; value: string; type: PrimitiveType } | { kind: 'TypeError' } | null

export type ToPrimitiveState = {
  call: string | null
  target: string | null
  hint: Hint | null
  exotic: ExoticStatus
  ordinaryHint: 'string' | 'number' | null
  attempts: Attempt[]
  outcome: Outcome
  after: string | null
}

const idle: ToPrimitiveState = {
  call: null,
  target: null,
  hint: null,
  exotic: 'unchecked',
  ordinaryHint: null,
  attempts: [],
  outcome: null,
  after: null,
}

const at = (n: number): LineRange => ({ from: n, to: n })

type S = Step<ToPrimitiveState>

// --- 한 번의 ToPrimitive(대상 하나)를 단계로 풀어 쓴다 ---------------------------------------

type Tried = {
  method: Method
  result: 'not-callable' | { object: string } | { primitive: string; type: PrimitiveType }
  text: string
}

type Conversion = {
  line: number
  call: string
  target: string
  hint: Hint
  startText: string
  exoticText: string
  ordinaryText: string
  tried: Tried[] // 부른 순서. 원시 값을 얻으면 거기서 멈춘다.
  failText?: string // 모두 실패했을 때(TypeError) 설명
  after?: { state: string; text: string }
}

const ORDER: Record<'string' | 'number', Method[]> = {
  string: ['toString', 'valueOf'],
  number: ['valueOf', 'toString'],
}

function conversionSteps(c: Conversion, output: string[]): S[] {
  const ordinaryHint = c.hint === 'string' ? 'string' : 'number'
  const order = ORDER[ordinaryHint]
  const base: ToPrimitiveState = { ...idle, call: c.call, target: c.target, hint: c.hint }
  const label = (what: string) => `${c.call}: ${what}`
  const step = (title: string, explanation: string, state: ToPrimitiveState): S => ({
    title,
    explanation,
    line: at(c.line),
    state,
    output,
  })

  const steps: S[] = [
    step(label(`ToPrimitive(${c.target}) 시작`), c.startText, base),
    step(label('Symbol.toPrimitive 확인'), c.exoticText, { ...base, exotic: 'absent' }),
  ]
  const absent: ToPrimitiveState = { ...base, exotic: 'absent', ordinaryHint }
  steps.push(
    step(label(`OrdinaryToPrimitive(${ordinaryHint})`), c.ordinaryText, {
      ...absent,
      attempts: order.map((method) => ({ method, status: 'pending' })),
    }),
  )

  const attempts: Attempt[] = order.map((method) => ({ method, status: 'pending' }))
  let primitive: Tried | null = null
  for (const t of c.tried) {
    const i = order.indexOf(t.method)
    if (t.result === 'not-callable') {
      attempts[i] = { method: t.method, status: 'not-callable' }
    } else if ('object' in t.result) {
      attempts[i] = { method: t.method, status: 'returned-object', value: t.result.object }
    } else {
      attempts[i] = { method: t.method, status: 'returned-primitive', value: t.result.primitive }
      primitive = t
    }
    const snapshot = attempts.map((a) => ({
      ...a,
      status: primitive && a.status === 'pending' ? ('not-called' as const) : a.status,
    }))
    const title =
      t.result === 'not-callable'
        ? label(`${c.target}.${t.method} 호출할 수 없음`)
        : label(`${c.target}.${t.method} 호출`)
    const outcome: Outcome =
      primitive && t.result !== 'not-callable' && 'primitive' in t.result
        ? { kind: 'primitive', value: t.result.primitive, type: t.result.type }
        : null
    steps.push(step(title, t.text, { ...absent, attempts: snapshot, outcome }))
  }

  const finalAttempts = steps[steps.length - 1].state.attempts
  if (primitive) {
    if (c.after) {
      steps.push(
        step(label('연산이 원시 값으로 계속'), c.after.text, {
          ...absent,
          attempts: finalAttempts,
          outcome: steps[steps.length - 1].state.outcome,
          after: c.after.state,
        }),
      )
    }
  } else {
    steps.push(
      step(label('TypeError'), c.failText ?? '', {
        ...absent,
        attempts: finalAttempts,
        outcome: { kind: 'TypeError' },
      }),
    )
  }
  return steps
}

const intro: S = {
  title: '실행 전',
  explanation:
    "코드를 실행하기 전입니다. 이 시각화는 객체를 원시 값으로 바꿔야 하는 연산 하나가 명세의 ToPrimitive를 거치는 과정을 보여 줍니다. ToPrimitive는 연산이 정한 힌트를 받고, Symbol.toPrimitive 메서드가 있는지 먼저 확인하고, 없으면 OrdinaryToPrimitive가 valueOf와 toString을 정해진 순서로 불러 처음 나온 원시 값을 씁니다. 숫자 1과 문자열 '1'을 구분하려고 결과를 값과 타입으로 함께 적습니다.",
  state: idle,
  output: [],
}

const consoleNote =
  '(console.log는 호스트가 제공하는 출력 API이고, 호출이 만드는 컨텍스트는 그리지 않습니다.)'

// --- 시나리오 A: 힌트에 따라 순서가 바뀐다 ----------------------------------------------------

const addEmpty = (title: string, explanation: string, line: LineRange, output: string[]): S => ({
  title,
  explanation,
  line,
  state: idle,
  output,
})

const A_LOG1 = ['"1" valueOf']
const A_LOG2 = [...A_LOG1, '"two" toString']

const hintOrderSteps: S[] = [
  intro,
  addEmpty(
    '객체 o 만들기',
    "2~11번 줄에서 만든 o는 valueOf와 toString을 자기 프로퍼티로 가집니다. valueOf는 log에 'valueOf'를 기록하고 숫자 1을, toString은 'toString'을 기록하고 문자열 'two'를 돌려줍니다. 두 메서드 가운데 무엇이 불렸는지는 log에 남습니다.",
    { from: 2, to: 11 },
    [],
  ),
  ...conversionSteps(
    {
      line: 12,
      call: "o + ''",
      target: 'o',
      hint: 'none',
      startText:
        '12번 줄의 이항 +는 두 피연산자를 원시 값으로 바꿀 때 힌트를 주지 않고 ToPrimitive를 부릅니다. 먼저 왼쪽 피연산자 o가 대상입니다. 힌트가 없다는 사실은 아직 number나 string이 아닙니다.',
      exoticText:
        'ToPrimitive는 먼저 o에 Symbol.toPrimitive 메서드가 있는지 확인합니다. o는 이 메서드를 가지지 않고 프로토타입에서도 찾지 못하므로 없습니다.',
      ordinaryText:
        '메서드가 없을 때만 OrdinaryToPrimitive로 가고, 이때 힌트가 없었다면 number를 넘깁니다. number는 valueOf를 먼저, toString을 그다음에 부르는 순서입니다.',
      tried: [
        {
          method: 'valueOf',
          result: { primitive: '1', type: 'number' },
          text: "o.valueOf()를 부르면 숫자 1을 돌려줍니다. 객체가 아니라 원시 값이므로 바로 ToPrimitive의 결과가 되고, toString은 부르지 않습니다. 결과는 문자열 '1'이 아니라 숫자 1입니다.",
        },
      ],
      after: {
        state: '1 + \'\' → ToString(1) → "1"',
        text: 'ToPrimitive가 끝나도 연산은 끝나지 않습니다. 오른쪽 \'\'은 이미 원시 값입니다. 한쪽이 문자열이므로 +는 두 값을 ToString으로 바꿔 이어 붙이고, 숫자 1은 "1"이 됩니다. 이 변환은 ToPrimitive가 아니라 + 연산의 몫입니다.',
      },
    },
    [],
  ),
  addEmpty(
    '출력: "1" valueOf',
    `12번 줄은 JSON.stringify(o + '')로 "1"을, log.join(',')로 valueOf만 불렸음을 출력합니다. ${consoleNote}`,
    at(12),
    A_LOG1,
  ),
  addEmpty(
    'log 비우기',
    '13번 줄에서 log를 새 빈 배열로 바꿔 다음 호출을 따로 기록합니다.',
    at(13),
    A_LOG1,
  ),
  ...conversionSteps(
    {
      line: 14,
      call: '`${o}`',
      target: 'o',
      hint: 'string',
      startText:
        '14번 줄의 템플릿 리터럴은 ${} 안의 값을 ToString으로 바꾸고, 객체의 ToString은 string 힌트로 ToPrimitive를 부릅니다. 같은 o인데 이번에는 힌트가 string입니다.',
      exoticText: 'Symbol.toPrimitive 메서드를 먼저 확인하지만 o에는 없습니다.',
      ordinaryText:
        "힌트가 string이므로 OrdinaryToPrimitive에도 string을 넘기고, 이 순서는 toString을 먼저, valueOf를 그다음에 부릅니다. 앞의 o + ''와 순서가 반대입니다.",
      tried: [
        {
          method: 'toString',
          result: { primitive: "'two'", type: 'string' },
          text: "o.toString()을 부르면 문자열 'two'를 돌려줍니다. 원시 값이므로 ToPrimitive의 결과가 되고 valueOf는 부르지 않습니다.",
        },
      ],
      after: {
        state: 'ToString(\'two\') → "two"',
        text: 'ToPrimitive의 결과가 이미 문자열이므로 ToString은 그 문자열을 그대로 돌려주고, 템플릿 리터럴의 값은 "two"입니다.',
      },
    },
    A_LOG1,
  ),
  addEmpty(
    '출력: "two" toString',
    `14번 줄은 "two"와 log의 toString만 불렸음을 출력합니다. 같은 객체여도 연산이 정한 힌트에 따라 먼저 부르는 메서드가 다릅니다. ${consoleNote}`,
    at(14),
    A_LOG2,
  ),
]

// --- 시나리오 B: 객체를 돌려주면 다음 메서드 ---------------------------------------------------

const B_OUT2 = ['true']
const B_OUT3 = [...B_OUT2, '"1,21" "" "[object Object]"']
const B_OUT4 = [...B_OUT3, '10 true true']
const B_OUT5 = [...B_OUT4, '6 true']

const arrayAndObjectSteps: S[] = [
  intro,
  addEmpty(
    '배열 a 만들기',
    '1번 줄에서 배열 a를 만듭니다. 배열은 valueOf를 자기 프로퍼티로 가지지 않고, 프로토타입 체인을 따라 Object.prototype.valueOf를 씁니다. toString은 Array.prototype.toString입니다.',
    at(1),
    [],
  ),
  addEmpty(
    'a.valueOf() === a',
    `2번 줄은 ToPrimitive를 거치지 않고 a.valueOf()를 직접 부릅니다. Object.prototype.valueOf는 this를 객체로 바꿔 돌려주므로 a 자신이고, ===가 true입니다. 이 반환값은 객체이므로 ToPrimitive 안에서 valueOf를 불렀을 때도 원시 값으로 쓰이지 않습니다. ${consoleNote}`,
    at(2),
    B_OUT2,
  ),
  ...conversionSteps(
    {
      line: 3,
      call: 'a + 1',
      target: 'a',
      hint: 'none',
      startText:
        '3번 줄의 첫 식 a + 1에서 이항 +는 힌트 없이 왼쪽 피연산자 a를 ToPrimitive로 바꿉니다. 오른쪽 1은 이미 원시 값입니다.',
      exoticText: 'a에는 Symbol.toPrimitive 메서드가 없습니다.',
      ordinaryText:
        '힌트가 없었으므로 OrdinaryToPrimitive에 number를 넘겨 valueOf를 먼저 부릅니다.',
      tried: [
        {
          method: 'valueOf',
          result: { object: '[1, 2]' },
          text: 'a.valueOf()는 Object.prototype.valueOf이므로 a 자신인 배열을 돌려줍니다. 객체는 원시 값이 아니므로 이 결과는 버리고 다음 메서드로 넘어갑니다.',
        },
        {
          method: 'toString',
          result: { primitive: "'1,2'", type: 'string' },
          text: "a.toString()은 Array.prototype.toString이고 요소를 쉼표로 이은 문자열 '1,2'를 돌려줍니다. 원시 값이므로 이것이 ToPrimitive의 결과입니다.",
        },
      ],
      after: {
        state: '\'1,2\' + 1 → ToString(1) → "1,21"',
        text: '왼쪽이 문자열이므로 +는 오른쪽 1을 ToString으로 "1"로 바꿔 이어 붙여 "1,21"을 만듭니다.',
      },
    },
    B_OUT2,
  ),
  addEmpty(
    '[] + []',
    '같은 줄의 두 번째 식 [] + []는 두 빈 배열 모두 위와 같은 순서로 바뀝니다. valueOf는 배열 자신을 돌려주어 건너뛰고, toString이 요소가 없는 배열의 빈 문자열을 돌려주므로 빈 문자열끼리 이어 붙여 빈 문자열이 됩니다. 단계를 줄이려고 요약해서 그립니다.',
    at(3),
    B_OUT2,
  ),
  ...conversionSteps(
    {
      line: 3,
      call: '[] + {}',
      target: '[]',
      hint: 'none',
      startText:
        '세 번째 식 [] + {}에서 이항 +는 왼쪽부터 오른쪽 순서로 두 피연산자를 ToPrimitive로 바꿉니다. 먼저 [](빈 배열)입니다.',
      exoticText: '[]에는 Symbol.toPrimitive 메서드가 없습니다.',
      ordinaryText:
        '힌트가 없었으므로 OrdinaryToPrimitive에 number를 넘겨 valueOf를 먼저 부릅니다.',
      tried: [
        {
          method: 'valueOf',
          result: { object: '[]' },
          text: '[].valueOf()는 Object.prototype.valueOf이므로 배열 자신을 돌려줍니다. 객체이므로 다음 메서드로 넘어갑니다.',
        },
        {
          method: 'toString',
          result: { primitive: "''", type: 'string' },
          text: "[].toString()은 Array.prototype.toString이고 요소가 없으므로 빈 문자열 ''을 돌려줍니다. 원시 값이므로 왼쪽 피연산자의 결과가 됩니다.",
        },
      ],
    },
    B_OUT2,
  ),
  ...conversionSteps(
    {
      line: 3,
      call: '[] + {}',
      target: '{}',
      hint: 'none',
      startText:
        "이제 오른쪽 피연산자 {}를 ToPrimitive로 바꿉니다(식 안의 {}는 객체 리터럴입니다). 왼쪽 [] 쪽 결과는 빈 문자열 ''이었습니다.",
      exoticText: '{}에도 Symbol.toPrimitive 메서드가 없습니다.',
      ordinaryText: '이번에도 힌트가 없었으므로 number를 넘겨 valueOf를 먼저 부릅니다.',
      tried: [
        {
          method: 'valueOf',
          result: { object: '{}' },
          text: '{}.valueOf()도 Object.prototype.valueOf이므로 객체 자신을 돌려줍니다. 객체이므로 다음 메서드로 넘어갑니다.',
        },
        {
          method: 'toString',
          result: { primitive: "'[object Object]'", type: 'string' },
          text: "{}.toString()은 Object.prototype.toString입니다. Symbol.toStringTag가 없는 일반 객체이므로 문자열 '[object Object]'를 돌려줍니다.",
        },
      ],
      after: {
        state: "'' + '[object Object]' → \"[object Object]\"",
        text: "두 피연산자가 모두 문자열 ''과 '[object Object]'이므로 +는 이어 붙여 \"[object Object]\"를 만듭니다.",
      },
    },
    B_OUT2,
  ),
  addEmpty(
    '출력: "1,21" "" "[object Object]"',
    `3번 줄은 세 식의 결과를 JSON.stringify로 출력합니다. 빈 문자열은 따옴표 두 개로 보입니다. ${consoleNote}`,
    at(3),
    B_OUT3,
  ),
  addEmpty(
    '4번 줄: 숫자와 ==',
    `[5] * 2는 숫자가 필요해 number 힌트의 ToPrimitive를 부르고, valueOf는 배열 자신이라 건너뛰고 toString의 '5'를 ToNumber가 5로 바꿔 10입니다. [1] == 1은 객체와 숫자의 비교라 힌트 없이 ToPrimitive를 부르고 '1'이 되어 true입니다. [] == ![]에서 ![]는 ToBoolean이 객체를 항상 true로 보므로 ToPrimitive 없이 false이고, ==가 불리언을 먼저 숫자 0으로 바꾼 뒤 []를 ToPrimitive해 ''를 얻고 0과 같다고 판단해 true입니다. 단계를 줄이려고 요약해서 그립니다. ${consoleNote}`,
    at(4),
    B_OUT4,
  ),
  addEmpty(
    '5번 줄: 래퍼 객체',
    `new Number(5)와 new String('hi') 같은 래퍼 객체는 상속한 valueOf가 감싼 원시 값을 돌려줍니다. 그래서 new Number(5) + 1에서는 valueOf가 곧바로 원시 값 5를 주어 6이고, new String('hi') == 'hi'에서는 'hi'를 얻어 true입니다. 단계를 줄이려고 요약해서 그립니다. ${consoleNote}`,
    at(5),
    B_OUT5,
  ),
]

// --- 시나리오 C: 둘 다 실패하면 TypeError ------------------------------------------------------

const C_OUT1 = ['TypeError']
const C_OUT2 = ['TypeError', 'TypeError']

const typeErrorSteps: S[] = [
  intro,
  addEmpty(
    'bare 만들기',
    '1번 줄의 Object.create(null)은 프로토타입이 null인 객체를 만듭니다. Object.prototype을 상속하지 않으므로 valueOf도 toString도 없어 호출할 수 없습니다.',
    at(1),
    [],
  ),
  ...conversionSteps(
    {
      line: 3,
      call: 'String(bare)',
      target: 'bare',
      hint: 'string',
      startText:
        '3번 줄의 String(bare)는 값을 ToString으로 바꾸고, 객체의 ToString은 string 힌트로 ToPrimitive를 부릅니다.',
      exoticText: 'bare에는 Symbol.toPrimitive 메서드도 없습니다.',
      ordinaryText:
        '힌트가 string이므로 OrdinaryToPrimitive에 string을 넘기고 toString을 먼저, valueOf를 그다음에 시도합니다.',
      tried: [
        {
          method: 'toString',
          result: 'not-callable',
          text: 'bare.toString은 undefined입니다. 호출할 수 있는 값이 아니므로 부르지 않고 건너뜁니다.',
        },
        {
          method: 'valueOf',
          result: 'not-callable',
          text: 'bare.valueOf도 undefined라서 건너뜁니다. 두 메서드를 모두 시도했는데 원시 값을 얻지 못했습니다.',
        },
      ],
      failText:
        '메서드를 모두 시도하고도 원시 값을 얻지 못하면 OrdinaryToPrimitive는 TypeError를 던집니다. 빈 문자열이나 [object Object]로 대신하지 않습니다.',
    },
    [],
  ),
  addEmpty(
    '출력: TypeError',
    `던져진 오류를 4번 줄의 catch가 받고, 5번 줄이 e.name인 TypeError를 출력합니다. ${consoleNote}`,
    at(5),
    C_OUT1,
  ),
  addEmpty(
    'stubborn 만들기',
    '7~14번 줄의 stubborn은 valueOf와 toString이 모두 있지만 둘 다 새 빈 객체를 돌려줍니다.',
    { from: 7, to: 14 },
    C_OUT1,
  ),
  ...conversionSteps(
    {
      line: 16,
      call: "stubborn + ''",
      target: 'stubborn',
      hint: 'none',
      startText:
        "16번 줄의 이항 +는 힌트 없이 왼쪽 피연산자 stubborn을 ToPrimitive로 바꿉니다. 오른쪽 ''은 이미 원시 값이지만, 오류가 먼저 나므로 그 값은 쓰이지 않습니다.",
      exoticText: 'stubborn에는 Symbol.toPrimitive 메서드가 없습니다.',
      ordinaryText:
        '힌트가 없었으므로 OrdinaryToPrimitive에 number를 넘겨 valueOf를 먼저 부릅니다.',
      tried: [
        {
          method: 'valueOf',
          result: { object: '{}' },
          text: 'stubborn.valueOf()는 새 객체를 돌려줍니다. 객체는 원시 값이 아니므로 다음 메서드로 넘어갑니다.',
        },
        {
          method: 'toString',
          result: { object: '{}' },
          text: 'stubborn.toString()도 객체를 돌려줍니다. 두 메서드를 모두 불렀는데 원시 값을 얻지 못했습니다.',
        },
      ],
      failText:
        '두 메서드가 모두 객체를 돌려주면 OrdinaryToPrimitive는 TypeError를 던집니다. 메서드가 있어도 원시 값을 주지 못하면 실패합니다.',
    },
    C_OUT1,
  ),
  addEmpty(
    '출력: TypeError',
    `17번 줄의 catch가 두 번째 오류를 받고, 18번 줄이 그 이름 TypeError를 출력합니다. ${consoleNote}`,
    at(18),
    C_OUT2,
  ),
]

export const scenarios: Scenario<ToPrimitiveState>[] = [
  {
    id: 'hint-order',
    label: '힌트에 따라 순서가 바뀐다',
    exampleId: 'hint-order',
    code: hintOrderCode,
    steps: hintOrderSteps,
  },
  {
    id: 'array-and-object',
    label: '객체를 돌려주면 다음 메서드',
    exampleId: 'array-and-object',
    code: arrayAndObjectCode,
    steps: arrayAndObjectSteps,
  },
  {
    id: 'type-error',
    label: '둘 다 실패하면 TypeError',
    exampleId: 'type-error',
    code: typeErrorCode,
    steps: typeErrorSteps,
  },
]
