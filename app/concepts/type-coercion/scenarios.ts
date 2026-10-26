import type { Scenario, Step } from '~/simulator/types'
import compareCode from './examples/compare.js?raw'
import numericMixCode from './examples/numeric-mix.js?raw'
import plusOrderCode from './examples/plus-order.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// 연산 하나는 두 단계로 보여 준다: A(피연산자·규칙·변환 표시, result 없음) → B(result 표시).
// 한 줄의 마지막 연산이면 B 단계에서 바인딩이 함께 초기화되고, 그 바인딩에만 `changed: true`가 붙는다.
// 이 예제들에는 재할당이 없으므로 바인딩은 생길 때 한 번만 changed다.

export type Val = {
  type: 'number' | 'string' | 'boolean'
  // 화면에 보일 값. number: String(n), string: 따옴표 없는 내용(ConversionView가 큰따옴표를 붙인다),
  // boolean: 'true' | 'false'
  display: string
}

export type Conversion = { via: 'ToString' | 'ToNumber'; to: Val }

export type Operand = {
  code: string // 소스 조각: "'3'", "4", 앞 연산이면 그 소스 "'3' + 4"
  value: Val // 연산 전 값(앞 연산의 결과 포함)
  converted?: Conversion // 타입이 바뀔 때만
}

// concat: 한쪽이 문자열인 + → 문자열 연결 / add: 문자열 없는 + → 숫자 덧셈
// numeric: - * / % → 숫자 연산 / string-compare: 둘 다 문자열인 > / numeric-compare: 그 밖의 >
export type Rule = 'concat' | 'add' | 'numeric' | 'string-compare' | 'numeric-compare'

export type Operation = {
  code: string // 지금 계산하는 연산의 소스 전체: "'3' + 4" → 다음 연산은 "'3' + 4 + 5"
  operator: '+' | '-' | '>'
  left: Operand
  right: Operand
  rule: Rule
  result?: Val // 결과 단계(B)에서만
}

export type Binding = {
  name: string
  declaredWith: 'const'
  value: Val
  changed?: boolean
}

export type ConvState = { bindings: Binding[]; operation?: Operation }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------
// 값 표기 규칙(숫자는 String(n), 문자열은 따옴표 없는 내용, 불리언은 'true'|'false')을 헬퍼로 강제한다.
// concept.test.ts가 소스를 직접 실행한 값과 이 표기를 대조한다.

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const bool = (b: boolean): Val => ({ type: 'boolean', display: String(b) })

const toStr = (to: Val): Conversion => ({ via: 'ToString', to })
const toNum = (to: Val): Conversion => ({ via: 'ToNumber', to })

const operand = (code: string, value: Val, converted?: Conversion): Operand => ({
  code,
  value,
  ...(converted && { converted }),
})

// Operation.code는 항상 `${left.code} ${operator} ${right.code}`다.
const operation = (
  left: Operand,
  operator: Operation['operator'],
  right: Operand,
  rule: Rule,
  result?: Val,
): Operation => ({
  code: `${left.code} ${operator} ${right.code}`,
  operator,
  left,
  right,
  rule,
  ...(result && { result }),
})

const bind = (name: string, value: Val): Binding => ({ name, declaredWith: 'const', value })
const changed = (b: Binding): Binding => ({ ...b, changed: true })

const state = (bindings: Binding[], op?: Operation): ConvState => ({
  bindings,
  ...(op && { operation: op }),
})

const intro: Step<ConvState> = {
  title: '실행 전',
  explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
  state: { bindings: [] },
  output: [],
}

const at = (n: number) => ({ from: n, to: n })

// --- 시나리오 1: + 의 순서 (plus-order) ---------------------------------------------------------
// const a = '3' + 4 + 5;   → ('3' + 4) + 5
// const b = 3 + 4 + '5';   → (3 + 4) + '5'

const plusOrderA = bind('a', str('345'))
const plusOrderB = bind('b', str('75'))

const plusOrderOp1 = (result?: Val) =>
  operation(operand("'3'", str('3')), '+', operand('4', num(4), toStr(str('4'))), 'concat', result)
const plusOrderOp2 = (result?: Val) =>
  operation(
    operand("'3' + 4", str('34')),
    '+',
    operand('5', num(5), toStr(str('5'))),
    'concat',
    result,
  )
const plusOrderOp3 = (result?: Val) =>
  operation(operand('3', num(3)), '+', operand('4', num(4)), 'add', result)
const plusOrderOp4 = (result?: Val) =>
  operation(
    operand('3 + 4', num(7), toStr(str('7'))),
    '+',
    operand("'5'", str('5')),
    'concat',
    result,
  )

const plusOrderSteps: Step<ConvState>[] = [
  intro,
  {
    title: "'3' + 4: 피연산자 확인",
    explanation:
      "1번 줄의 '3' + 4를 계산합니다. 왼쪽 '3'이 문자열이므로 +는 문자열 연결을 하고, 문자열이 아닌 오른쪽 4를 문자열 \"4\"로 바꿉니다.",
    line: at(1),
    state: state([], plusOrderOp1()),
    output: [],
  },
  {
    title: "'3' + 4의 결과",
    explanation:
      '문자열 "3"과 "4"를 문자열 연결하면 "34"입니다. +는 왼쪽부터 묶이므로 이 결과가 다음 +의 왼쪽 피연산자가 됩니다.',
    line: at(1),
    state: state([], plusOrderOp1(str('34'))),
    output: [],
  },
  {
    title: "'3' + 4 + 5: 피연산자 확인",
    explanation:
      '앞의 결과 "34"가 왼쪽 피연산자입니다. 왼쪽이 문자열이므로 이번에도 문자열 연결이고, 숫자 5를 문자열 "5"로 바꿉니다.',
    line: at(1),
    state: state([], plusOrderOp2()),
    output: [],
  },
  {
    title: 'a를 "345"로 초기화',
    explanation:
      '문자열 연결의 결과 "345"는 문자열입니다. 선언문의 초기화 식이 모두 계산되었으므로 a가 이 값으로 초기화됩니다.',
    line: at(1),
    state: state([changed(plusOrderA)], plusOrderOp2(str('345'))),
    output: [],
  },
  {
    title: '3 + 4: 피연산자 확인',
    explanation:
      '2번 줄의 3 + 4를 계산합니다. 두 피연산자가 모두 숫자이고 문자열이 없으므로 +는 숫자 덧셈을 하며, 바꿀 값이 없습니다.',
    line: at(2),
    state: state([plusOrderA], plusOrderOp3()),
    output: [],
  },
  {
    title: '3 + 4의 결과',
    explanation: '숫자 덧셈의 결과는 숫자 7입니다. 이 7이 다음 +의 왼쪽 피연산자가 됩니다.',
    line: at(2),
    state: state([plusOrderA], plusOrderOp3(num(7))),
    output: [],
  },
  {
    title: "3 + 4 + '5': 피연산자 확인",
    explanation:
      '앞의 결과 7은 숫자이지만 오른쪽 \'5\'가 문자열이므로 +는 문자열 연결을 합니다. 문자열이 아닌 왼쪽 7을 문자열 "7"로 바꿉니다.',
    line: at(2),
    state: state([plusOrderA], plusOrderOp4()),
    output: [],
  },
  {
    title: 'b를 "75"로 초기화',
    explanation:
      '문자열 연결의 결과 "75"로 b가 초기화됩니다. 3 + 4가 먼저 숫자 덧셈으로 계산되었기 때문에 a와 달리 "345"가 아닙니다.',
    line: at(2),
    state: state([plusOrderA, changed(plusOrderB)], plusOrderOp4(str('75'))),
    output: [],
  },
  {
    title: '3번 줄 출력',
    explanation:
      'console.log가 a와 b를 출력합니다. console.log는 문자열을 따옴표 없이 출력하지만 a와 b는 모두 문자열입니다. 출력만으로는 숫자와 구분되지 않으므로 변수 영역의 타입을 확인하세요.',
    line: at(3),
    state: state([plusOrderA, plusOrderB]),
    output: ['345 75'],
  },
]

// --- 시나리오 2: - 와 + 섞기 (numeric-mix) ------------------------------------------------------
// const c = '10' - '4' + 2;   → ('10' - '4') + 2
// const d = '10' + 2 - 1;     → ('10' + 2) - 1

const numericMixC = bind('c', num(8))
const numericMixD = bind('d', num(101))

const numericMixOp1 = (result?: Val) =>
  operation(
    operand("'10'", str('10'), toNum(num(10))),
    '-',
    operand("'4'", str('4'), toNum(num(4))),
    'numeric',
    result,
  )
const numericMixOp2 = (result?: Val) =>
  operation(operand("'10' - '4'", num(6)), '+', operand('2', num(2)), 'add', result)
const numericMixOp3 = (result?: Val) =>
  operation(
    operand("'10'", str('10')),
    '+',
    operand('2', num(2), toStr(str('2'))),
    'concat',
    result,
  )
const numericMixOp4 = (result?: Val) =>
  operation(
    operand("'10' + 2", str('102'), toNum(num(102))),
    '-',
    operand('1', num(1)),
    'numeric',
    result,
  )

const numericMixSteps: Step<ConvState>[] = [
  intro,
  {
    title: "'10' - '4': 피연산자 확인",
    explanation:
      "1번 줄의 '10' - '4'를 계산합니다. -는 피연산자를 숫자로 바꿔 계산하므로, 문자열 '10'과 '4'를 각각 숫자 10과 4로 바꿉니다.",
    line: at(1),
    state: state([], numericMixOp1()),
    output: [],
  },
  {
    title: "'10' - '4'의 결과",
    explanation: '숫자 10에서 4를 빼면 숫자 6입니다. 이 6이 다음 +의 왼쪽 피연산자가 됩니다.',
    line: at(1),
    state: state([], numericMixOp1(num(6))),
    output: [],
  },
  {
    title: "'10' - '4' + 2: 피연산자 확인",
    explanation:
      '왼쪽 6과 오른쪽 2가 모두 숫자이고 문자열이 없으므로 +는 숫자 덧셈을 하며, 바꿀 값이 없습니다.',
    line: at(1),
    state: state([], numericMixOp2()),
    output: [],
  },
  {
    title: 'c를 8로 초기화',
    explanation:
      '숫자 덧셈의 결과는 숫자 8입니다. 선언문의 초기화 식이 모두 계산되었으므로 c가 이 값으로 초기화됩니다.',
    line: at(1),
    state: state([changed(numericMixC)], numericMixOp2(num(8))),
    output: [],
  },
  {
    title: "'10' + 2: 피연산자 확인",
    explanation:
      "2번 줄의 '10' + 2를 계산합니다. 왼쪽 '10'이 문자열이므로 +는 문자열 연결을 하고, 숫자 2를 문자열 \"2\"로 바꿉니다.",
    line: at(2),
    state: state([numericMixC], numericMixOp3()),
    output: [],
  },
  {
    title: "'10' + 2의 결과",
    explanation:
      '문자열 "10"과 "2"를 문자열 연결하면 문자열 "102"입니다. 이 결과가 다음 -의 왼쪽 피연산자가 됩니다.',
    line: at(2),
    state: state([numericMixC], numericMixOp3(str('102'))),
    output: [],
  },
  {
    title: "'10' + 2 - 1: 피연산자 확인",
    explanation:
      '-는 피연산자를 숫자로 바꿔 계산합니다. 앞의 결과 문자열 "102"를 숫자 102로 바꾸고, 오른쪽 1은 이미 숫자입니다.',
    line: at(2),
    state: state([numericMixC], numericMixOp4()),
    output: [],
  },
  {
    title: 'd를 101로 초기화',
    explanation:
      '숫자 102에서 1을 빼면 숫자 101이고, d가 이 값으로 초기화됩니다. 앞의 +는 문자열 연결이었지만 -는 숫자 연산이어서 결과가 다시 숫자가 되었습니다.',
    line: at(2),
    state: state([numericMixC, changed(numericMixD)], numericMixOp4(num(101))),
    output: [],
  },
  {
    title: '3번 줄 출력',
    explanation:
      'console.log가 c와 d를 출력합니다. 이번에는 c와 d가 모두 숫자입니다. 출력 8 101만 보면 문자열과 구분되지 않으므로 변수 영역의 타입을 확인하세요.',
    line: at(3),
    state: state([numericMixC, numericMixD]),
    output: ['8 101'],
  },
]

// --- 시나리오 3: > 비교 (compare) ---------------------------------------------------------------
// const e = '10' > 9;     → 숫자로 바꿔 비교
// const f = '10' > '9';   → 둘 다 문자열이므로 문자열로 비교

const compareE = bind('e', bool(true))
const compareF = bind('f', bool(false))

const compareOp1 = (result?: Val) =>
  operation(
    operand("'10'", str('10'), toNum(num(10))),
    '>',
    operand('9', num(9)),
    'numeric-compare',
    result,
  )
const compareOp2 = (result?: Val) =>
  operation(operand("'10'", str('10')), '>', operand("'9'", str('9')), 'string-compare', result)

const compareSteps: Step<ConvState>[] = [
  intro,
  {
    title: "'10' > 9: 피연산자 확인",
    explanation:
      "1번 줄의 '10' > 9를 계산합니다. 두 피연산자가 모두 문자열은 아니므로 >는 숫자로 바꿔 비교하고, 문자열 '10'을 숫자 10으로 바꿉니다.",
    line: at(1),
    state: state([], compareOp1()),
    output: [],
  },
  {
    title: 'e를 true로 초기화',
    explanation:
      '숫자 10과 9를 비교하면 10이 더 크므로 결과는 true입니다. e가 불리언 true로 초기화됩니다.',
    line: at(1),
    state: state([changed(compareE)], compareOp1(bool(true))),
    output: [],
  },
  {
    title: "'10' > '9': 피연산자 확인",
    explanation:
      "2번 줄의 '10' > '9'를 계산합니다. 두 피연산자가 모두 문자열이므로 >는 숫자로 바꾸지 않고 문자열로 비교하며, 앞 글자부터 비교하므로 첫 글자 '1'과 '9'를 비교합니다.",
    line: at(2),
    state: state([compareE], compareOp2()),
    output: [],
  },
  {
    title: 'f를 false로 초기화',
    explanation:
      "첫 글자 '1'의 코드 유닛 값이 '9'보다 작으므로 문자열 '10'은 '9'보다 작고, 결과는 false입니다. 문자열 비교에서는 숫자로서의 크기를 따지지 않습니다. f가 불리언 false로 초기화됩니다.",
    line: at(2),
    state: state([compareE, changed(compareF)], compareOp2(bool(false))),
    output: [],
  },
  {
    title: '3번 줄 출력',
    explanation:
      "console.log가 e와 f를 출력합니다. 같은 문자열 '10'인데도 오른쪽이 숫자 9인지 문자열 '9'인지에 따라 결과가 true와 false로 갈렸습니다.",
    line: at(3),
    state: state([compareE, compareF]),
    output: ['true false'],
  },
]

export const scenarios: Scenario<ConvState>[] = [
  {
    id: 'plus-order',
    label: '+ 의 순서',
    exampleId: 'plus-order',
    code: plusOrderCode,
    steps: plusOrderSteps,
  },
  {
    id: 'numeric-mix',
    label: '- 와 + 섞기',
    exampleId: 'numeric-mix',
    code: numericMixCode,
    steps: numericMixSteps,
  },
  {
    id: 'compare',
    label: '> 비교',
    exampleId: 'compare',
    code: compareCode,
    steps: compareSteps,
  },
]
