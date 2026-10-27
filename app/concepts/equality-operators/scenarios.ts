import type { Scenario, Step } from '~/simulator/types'
import booleanCode from './examples/boolean.js?raw'
import nullUndefinedCode from './examples/null-undefined.js?raw'
import numberStringCode from './examples/number-string.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// 비교 식 하나는 "라운드"마다 한 단계씩 보여 준다: 값을 바꾸면 바꾼 값으로 다시 비교하는 것이 다음 라운드다.
// 라운드를 모두 보여 준 뒤 결과 단계에서 result가 생기고, 그 줄의 바인딩이 초기화되며 새 바인딩에만 `changed: true`가 붙는다.
// 이 예제들에는 재할당이 없으므로 바인딩은 생길 때 한 번만 changed다.

export type Val = {
  type: 'undefined' | 'null' | 'boolean' | 'number' | 'string'
  // 화면에 보일 값. number: String(n)(NaN은 'NaN'), string: 따옴표 없는 내용,
  // 나머지: 소스 표기('true' | 'false' | 'null' | 'undefined')
  display: string
}

// same-type: 같은 타입 → ===와 같은 방법으로 값 비교 / null-undefined: null과 undefined → true
// string-to-number: 숫자와 문자열 → 문자열을 숫자로 / boolean-to-number: 한쪽이 불리언 → 불리언을 숫자로
// no-rule: 해당하는 규칙 없음 → false / strict-type-differs: ===에서 타입이 다름 → false
export type Rule =
  | 'same-type'
  | 'null-undefined'
  | 'string-to-number'
  | 'boolean-to-number'
  | 'no-rule'
  | 'strict-type-differs'

export type Conversion = { side: 'left' | 'right'; via: 'ToNumber'; to: Val }

export type Round = { left: Val; right: Val; rule: Rule; converted?: Conversion }

export type Comparison = {
  code: string // 소스의 비교 식 전체: "false == '0'"
  operator: '==' | '==='
  rounds: Round[] // 지금까지 보여 준 라운드
  result?: Val // 결과 단계에서만 (boolean)
}

export type Binding = {
  name: string
  declaredWith: 'const'
  value: Val
  changed?: boolean
}

export type EqState = { bindings: Binding[]; comparison?: Comparison }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------
// 값 표기 규칙을 헬퍼로 강제한다. concept.test.ts가 소스를 직접 실행한 값과 이 표기를 대조한다.

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const bool = (b: boolean): Val => ({ type: 'boolean', display: String(b) })
const nul = (): Val => ({ type: 'null', display: 'null' })
const undef = (): Val => ({ type: 'undefined', display: 'undefined' })

const toNum = (side: 'left' | 'right', to: Val): Conversion => ({ side, via: 'ToNumber', to })

const round = (left: Val, right: Val, rule: Rule, converted?: Conversion): Round => ({
  left,
  right,
  rule,
  ...(converted && { converted }),
})

const comparison = (
  code: string,
  operator: Comparison['operator'],
  rounds: Round[],
  result?: Val,
): Comparison => ({
  code,
  operator,
  rounds,
  ...(result && { result }),
})

const bind = (name: string, value: Val): Binding => ({ name, declaredWith: 'const', value })
const changed = (b: Binding): Binding => ({ ...b, changed: true })

const state = (bindings: Binding[], cmp?: Comparison): EqState => ({
  bindings,
  ...(cmp && { comparison: cmp }),
})

const intro: Step<EqState> = {
  title: '실행 전',
  explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
  state: { bindings: [] },
  output: [],
}

const at = (n: number) => ({ from: n, to: n })

// --- 시나리오 1: 숫자와 문자열 (number-string) --------------------------------------------------
// const a = 0 == '';     → 문자열 ''을 숫자 0으로 바꾼 뒤 다시 비교
// const b = '0' == '';   → 둘 다 문자열이므로 바꾸지 않음
// const c = 0 === '';    → 타입이 달라 바로 false

const nsA = bind('a', bool(true))
const nsB = bind('b', bool(false))
const nsC = bind('c', bool(false))

const nsRoundsA = [
  round(num(0), str(''), 'string-to-number', toNum('right', num(0))),
  round(num(0), num(0), 'same-type'),
]
const nsRoundsB = [round(str('0'), str(''), 'same-type')]
const nsRoundsC = [round(num(0), str(''), 'strict-type-differs')]

const numberStringSteps: Step<EqState>[] = [
  intro,
  {
    title: "0 == '': 라운드 1",
    explanation:
      "1번 줄의 0 == ''를 비교합니다. 숫자와 문자열을 비교하므로 문자열 ''을 숫자로 바꿉니다. 빈 문자열은 숫자 0이 됩니다.",
    line: at(1),
    state: state([], comparison("0 == ''", '==', nsRoundsA.slice(0, 1))),
    output: [],
  },
  {
    title: "0 == '': 라운드 2",
    explanation:
      '바꾼 값으로 다시 비교합니다. 이제 0과 0이고 타입이 같으므로 ===와 같은 방법으로 값을 비교합니다.',
    line: at(1),
    state: state([], comparison("0 == ''", '==', nsRoundsA)),
    output: [],
  },
  {
    title: 'a를 true로 초기화',
    explanation:
      "숫자 0과 0은 같은 값이므로 결과는 true입니다. a가 불리언 true로 초기화됩니다. 0과 ''가 같다고 판정된 것은 ''이 숫자 0으로 바뀌었기 때문입니다.",
    line: at(1),
    state: state([changed(nsA)], comparison("0 == ''", '==', nsRoundsA, bool(true))),
    output: [],
  },
  {
    title: "'0' == '': 라운드 1",
    explanation:
      "2번 줄의 '0' == ''를 비교합니다. 둘 다 문자열이라 타입이 같으므로 값을 바꾸지 않고 ===와 같은 방법으로 값을 비교합니다.",
    line: at(2),
    state: state([nsA], comparison("'0' == ''", '==', nsRoundsB)),
    output: [],
  },
  {
    title: 'b를 false로 초기화',
    explanation:
      '문자열 "0"과 ""는 서로 다른 문자열이므로 결과는 false입니다. b가 불리언 false로 초기화됩니다. 앞의 0 == \'\'와 달리 이번에는 숫자로 바꾸는 규칙이 적용되지 않았습니다.',
    line: at(2),
    state: state([nsA, changed(nsB)], comparison("'0' == ''", '==', nsRoundsB, bool(false))),
    output: [],
  },
  {
    title: "0 === '': 라운드 1",
    explanation:
      "3번 줄의 0 === ''를 비교합니다. ===는 타입이 다르면 값을 바꾸지 않고 false를 돌려줍니다.",
    line: at(3),
    state: state([nsA, nsB], comparison("0 === ''", '===', nsRoundsC)),
    output: [],
  },
  {
    title: 'c를 false로 초기화',
    explanation:
      "숫자 0과 문자열 ''은 타입이 다르므로 결과는 false입니다. c가 불리언 false로 초기화됩니다. 같은 두 값이라도 ==는 true, ===는 false였습니다.",
    line: at(3),
    state: state([nsA, nsB, changed(nsC)], comparison("0 === ''", '===', nsRoundsC, bool(false))),
    output: [],
  },
  {
    title: '4번 줄 출력',
    explanation:
      'console.log가 a, b, c를 출력합니다. 결과가 true, false, false로 갈린 이유는 각 줄에서 적용된 규칙이 달랐기 때문입니다.',
    line: at(4),
    state: state([nsA, nsB, nsC]),
    output: ['true false false'],
  },
]

// --- 시나리오 2: 불리언과 비교 (boolean) --------------------------------------------------------
// const d = false == '0';     → false→0, '0'→0, 0 == 0
// const e = true == 'true';   → true→1, 'true'→NaN, 1 == NaN

const boolD = bind('d', bool(true))
const boolE = bind('e', bool(false))

const boolRoundsD = [
  round(bool(false), str('0'), 'boolean-to-number', toNum('left', num(0))),
  round(num(0), str('0'), 'string-to-number', toNum('right', num(0))),
  round(num(0), num(0), 'same-type'),
]
const boolRoundsE = [
  round(bool(true), str('true'), 'boolean-to-number', toNum('left', num(1))),
  round(num(1), str('true'), 'string-to-number', toNum('right', num(NaN))),
  round(num(1), num(NaN), 'same-type'),
]

const booleanSteps: Step<EqState>[] = [
  intro,
  {
    title: "false == '0': 라운드 1",
    explanation:
      "1번 줄의 false == '0'을 비교합니다. 한쪽이 불리언이므로 불리언을 숫자로 바꿉니다. false는 숫자 0이 됩니다.",
    line: at(1),
    state: state([], comparison("false == '0'", '==', boolRoundsD.slice(0, 1))),
    output: [],
  },
  {
    title: "false == '0': 라운드 2",
    explanation:
      "바꾼 값으로 다시 비교합니다. 이제 숫자 0과 문자열 '0'을 비교하므로 문자열 '0'을 숫자로 바꿉니다. 문자열 \"0\"은 숫자 0이 됩니다.",
    line: at(1),
    state: state([], comparison("false == '0'", '==', boolRoundsD.slice(0, 2))),
    output: [],
  },
  {
    title: "false == '0': 라운드 3",
    explanation: '다시 비교하면 0과 0이고 타입이 같으므로 ===와 같은 방법으로 값을 비교합니다.',
    line: at(1),
    state: state([], comparison("false == '0'", '==', boolRoundsD)),
    output: [],
  },
  {
    title: 'd를 true로 초기화',
    explanation:
      '숫자 0과 0은 같은 값이므로 결과는 true입니다. d가 불리언 true로 초기화됩니다. ==는 양쪽을 불리언으로 바꾸지 않고, 불리언을 숫자로 바꿨습니다.',
    line: at(1),
    state: state([changed(boolD)], comparison("false == '0'", '==', boolRoundsD, bool(true))),
    output: [],
  },
  {
    title: "true == 'true': 라운드 1",
    explanation:
      "2번 줄의 true == 'true'를 비교합니다. 한쪽이 불리언이므로 불리언을 숫자로 바꿉니다. true는 숫자 1이 됩니다.",
    line: at(2),
    state: state([boolD], comparison("true == 'true'", '==', boolRoundsE.slice(0, 1))),
    output: [],
  },
  {
    title: "true == 'true': 라운드 2",
    explanation:
      "바꾼 값으로 다시 비교합니다. 숫자 1과 문자열 'true'를 비교하므로 문자열 'true'를 숫자로 바꿉니다. 숫자로 읽을 수 없는 문자열은 NaN이 됩니다.",
    line: at(2),
    state: state([boolD], comparison("true == 'true'", '==', boolRoundsE.slice(0, 2))),
    output: [],
  },
  {
    title: "true == 'true': 라운드 3",
    explanation:
      '다시 비교하면 1과 NaN이고 타입이 같으므로 ===와 같은 방법으로 값을 비교합니다. ===로 비교하면 NaN은 어떤 값과도, 자기 자신과도 같지 않습니다.',
    line: at(2),
    state: state([boolD], comparison("true == 'true'", '==', boolRoundsE)),
    output: [],
  },
  {
    title: 'e를 false로 초기화',
    explanation:
      "숫자 1과 NaN은 같지 않으므로 결과는 false입니다. e가 불리언 false로 초기화됩니다. 문자열 'true'가 truthy인 것과는 관계없이, 불리언 true는 숫자 1로 바뀌어 비교되었습니다.",
    line: at(2),
    state: state(
      [boolD, changed(boolE)],
      comparison("true == 'true'", '==', boolRoundsE, bool(false)),
    ),
    output: [],
  },
  {
    title: '3번 줄 출력',
    explanation:
      'console.log가 d와 e를 출력합니다. 두 식 모두 한쪽이 불리언이었지만, 문자열을 숫자로 바꾼 값이 0이냐 NaN이냐에 따라 결과가 갈렸습니다.',
    line: at(3),
    state: state([boolD, boolE]),
    output: ['true false'],
  },
]

// --- 시나리오 3: null과 undefined (null-undefined) ----------------------------------------------
// const f = null == undefined;   → null과 undefined 쌍이라 true
// const g = null == 0;           → 해당하는 규칙이 없어 false
// const h = null === undefined;  → 타입이 달라 false

const nuF = bind('f', bool(true))
const nuG = bind('g', bool(false))
const nuH = bind('h', bool(false))

const nuRoundsF = [round(nul(), undef(), 'null-undefined')]
const nuRoundsG = [round(nul(), num(0), 'no-rule')]
const nuRoundsH = [round(nul(), undef(), 'strict-type-differs')]

const nullUndefinedSteps: Step<EqState>[] = [
  intro,
  {
    title: 'null == undefined: 라운드 1',
    explanation:
      '1번 줄의 null == undefined를 비교합니다. 한쪽이 null이고 다른 쪽이 undefined인 쌍이므로 값을 바꾸지 않고 같다고 판정합니다.',
    line: at(1),
    state: state([], comparison('null == undefined', '==', nuRoundsF)),
    output: [],
  },
  {
    title: 'f를 true로 초기화',
    explanation: 'null과 undefined 쌍의 결과는 true입니다. f가 불리언 true로 초기화됩니다.',
    line: at(1),
    state: state([changed(nuF)], comparison('null == undefined', '==', nuRoundsF, bool(true))),
    output: [],
  },
  {
    title: 'null == 0: 라운드 1',
    explanation:
      '2번 줄의 null == 0을 비교합니다. null과 0은 타입이 다르고 null과 undefined의 쌍도 아니며, ==의 변환 규칙 중 null을 바꾸는 규칙은 없습니다. 맞는 규칙이 없으므로 결과는 false입니다.',
    line: at(2),
    state: state([nuF], comparison('null == 0', '==', nuRoundsG)),
    output: [],
  },
  {
    title: 'g를 false로 초기화',
    explanation:
      '==는 null을 숫자로 바꾸지 않으므로 null과 0은 같다고 판정되지 않습니다. +null처럼 숫자로 바꾸는 연산에서 null이 0이 되는 것과는 다른 규칙입니다. 결과 false로 g가 초기화됩니다.',
    line: at(2),
    state: state([nuF, changed(nuG)], comparison('null == 0', '==', nuRoundsG, bool(false))),
    output: [],
  },
  {
    title: 'null === undefined: 라운드 1',
    explanation:
      '3번 줄의 null === undefined를 비교합니다. ===는 타입이 다르면 값을 바꾸지 않고 false를 돌려줍니다.',
    line: at(3),
    state: state([nuF, nuG], comparison('null === undefined', '===', nuRoundsH)),
    output: [],
  },
  {
    title: 'h를 false로 초기화',
    explanation:
      'null과 undefined는 타입이 다르므로 결과는 false입니다. h가 불리언 false로 초기화됩니다. 같은 두 값이라도 ==는 true, ===는 false였습니다.',
    line: at(3),
    state: state(
      [nuF, nuG, changed(nuH)],
      comparison('null === undefined', '===', nuRoundsH, bool(false)),
    ),
    output: [],
  },
  {
    title: '4번 줄 출력',
    explanation:
      'console.log가 f, g, h를 출력합니다. null은 undefined와만 ==로 같고, 0과는 같지 않습니다.',
    line: at(4),
    state: state([nuF, nuG, nuH]),
    output: ['true false false'],
  },
]

export const scenarios: Scenario<EqState>[] = [
  {
    id: 'number-string',
    label: '숫자와 문자열',
    exampleId: 'number-string',
    code: numberStringCode,
    steps: numberStringSteps,
  },
  {
    id: 'boolean',
    label: '불리언과 비교',
    exampleId: 'boolean',
    code: booleanCode,
    steps: booleanSteps,
  },
  {
    id: 'null-undefined',
    label: 'null과 undefined',
    exampleId: 'null-undefined',
    code: nullUndefinedCode,
    steps: nullUndefinedSteps,
  },
]
