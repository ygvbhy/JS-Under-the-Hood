import type { Scenario, Step } from '~/simulator/types'
import argCountCode from './examples/arg-count.js?raw'
import evalOrderCode from './examples/eval-order.js?raw'
import noReturnCode from './examples/no-return.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// call은 지금 진행 중인 함수 호출 하나(호출 영역), pending은 아직 인수 목록을 채우는 중인 바깥 호출이다.
// `changed: true`는 "그 단계에서" 새로 생기거나 값이 바뀐 변수에만 붙이고, 다음 단계에서는 해제한다.

export type Val = { type: 'number' | 'string' | 'undefined'; display: string } // string은 따옴표 없이
export type Binding = { name: string; declaredWith: 'const'; value: Val; changed?: boolean }
export type Param = { name: string; value: Val; from: 'argument' | 'missing' }
export type CallResult = { value: Val; how: 'return' | 'return-empty' | 'end' }
export type Call = {
  id: string // 호출마다 다른 id(예: 'add-1')
  callee: string // 'add'
  code: string // 호출 식 원문 그대로(예: 'add(1)', 'square(2)'); eval-order의 add는 'add(square(2), square(3))'
  args: Val[] // 평가된 인수 목록
  params: Param[]
  ignored: Val[] // 매개변수에 들어가지 않은 인수
  result: CallResult | null // 반환하는 단계에서만 채움
}
export type Pending = { callee: string; code: string; args: (Val | null)[] } // null = 아직 평가 전
export type CallState = { bindings: Binding[]; pending: Pending | null; call: Call | null }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const undef: Val = { type: 'undefined', display: 'undefined' }

const bind = (name: string, value: Val, changed = false): Binding => ({
  name,
  declaredWith: 'const',
  value,
  ...(changed && { changed }),
})

const given = (name: string, value: Val): Param => ({ name, value, from: 'argument' })
const missing = (name: string): Param => ({ name, value: undef, from: 'missing' })

const makeCall = (
  id: string,
  callee: string,
  code: string,
  args: Val[],
  params: Param[],
  ignored: Val[] = [],
  result: CallResult | null = null,
): Call => ({ id, callee, code, args, params, ignored, result })

const withResult = (call: Call, result: CallResult): Call => ({ ...call, result })

const at = (n: number) => ({ from: n, to: n })

type CallStep = Step<CallState>

const empty: CallState = { bindings: [], pending: null, call: null }

const intro =
  '코드를 실행하기 전입니다. 함수 선언만으로는 본문이 실행되지 않고, 함수를 호출할 때 본문이 실행됩니다. 이 시각화는 진행 중인 함수 호출과, 선언문이 실행된 변수만 보여 줍니다.'

// --- 시나리오 1: 인수 개수가 다를 때 -----------------------------------------------------------

const add12 = makeCall(
  'add-1',
  'add',
  'add(1, 2)',
  [num(1), num(2)],
  [given('a', num(1)), given('b', num(2))],
)
const add1 = makeCall('add-2', 'add', 'add(1)', [num(1)], [given('a', num(1)), missing('b')])
const add123 = makeCall(
  'add-3',
  'add',
  'add(1, 2, 3)',
  [num(1), num(2), num(3)],
  [given('a', num(1)), given('b', num(2))],
  [num(3)],
)

const argCountSteps: CallStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: 'add(1, 2) 호출: a는 1, b는 2',
    explanation:
      '인수 1과 2를 왼쪽부터 평가해 인수 목록을 만들고, 매개변수 a와 b에 차례로 넣은 뒤 본문을 실행합니다. 인수와 매개변수의 개수가 같으므로 a는 1, b는 2입니다.',
    line: at(4),
    state: { bindings: [], pending: null, call: add12 },
    output: [],
  },
  {
    title: 'return a + b: 호출 결과는 3',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. a + b는 1 + 2이므로 호출 결과는 숫자 3입니다.',
    line: at(2),
    state: {
      bindings: [],
      pending: null,
      call: withResult(add12, { value: num(3), how: 'return' }),
    },
    output: [],
  },
  {
    title: '호출 결과 3을 출력',
    explanation:
      'add(1, 2) 호출이 끝났고, 그 결과 3이 console.log에 인수로 전달되어 콘솔에 3이 출력됩니다.',
    line: at(4),
    state: { bindings: [], pending: null, call: null },
    output: ['3'],
  },
  {
    title: 'add(1) 호출: b는 undefined',
    explanation:
      '인수가 1개뿐이므로 a에는 1이 들어갑니다. b에 넣을 인수가 없으므로 그 매개변수는 undefined가 됩니다. 오류는 나지 않고 본문을 실행합니다.',
    line: at(5),
    state: { bindings: [], pending: null, call: add1 },
    output: ['3'],
  },
  {
    title: 'return a + b: 호출 결과는 NaN',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. b가 undefined이므로 a + b는 1 + undefined입니다. undefined를 숫자로 바꾸면 NaN이므로 호출 결과는 NaN입니다.',
    line: at(2),
    state: {
      bindings: [],
      pending: null,
      call: withResult(add1, { value: { type: 'number', display: 'NaN' }, how: 'return' }),
    },
    output: ['3'],
  },
  {
    title: '호출 결과 NaN을 출력',
    explanation:
      'add(1) 호출이 끝났고, 그 결과 NaN이 console.log에 전달되어 콘솔에 NaN이 출력됩니다.',
    line: at(5),
    state: { bindings: [], pending: null, call: null },
    output: ['3', 'NaN'],
  },
  {
    title: 'add(1, 2, 3) 호출: 3은 매개변수에 들어가지 않음',
    explanation:
      '인수는 3개인데 매개변수는 a와 b 두 개뿐입니다. 앞의 두 인수 1과 2가 a와 b에 들어가고, 세 번째 인수 3은 매개변수에 들어가지 않습니다. 오류는 나지 않고 본문은 그대로 실행됩니다.',
    line: at(6),
    state: { bindings: [], pending: null, call: add123 },
    output: ['3', 'NaN'],
  },
  {
    title: 'return a + b: 호출 결과는 3',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. 세 번째 인수 3은 매개변수에 들어가지 않았으므로 a + b는 1 + 2이고, 호출 결과는 숫자 3입니다.',
    line: at(2),
    state: {
      bindings: [],
      pending: null,
      call: withResult(add123, { value: num(3), how: 'return' }),
    },
    output: ['3', 'NaN'],
  },
  {
    title: '호출 결과 3을 출력',
    explanation:
      'add(1, 2, 3) 호출이 끝났고, 그 결과 3이 console.log에 전달되어 콘솔에 3이 출력됩니다.',
    line: at(6),
    state: { bindings: [], pending: null, call: null },
    output: ['3', 'NaN', '3'],
  },
]

// --- 시나리오 2: return이 없을 때 --------------------------------------------------------------

const greetCall = makeCall(
  'greet-1',
  'greet',
  "greet('민지')",
  [str('민지')],
  [given('name', str('민지'))],
)
const halfNeg = makeCall('half-1', 'half', 'half(-4)', [num(-4)], [given('n', num(-4))])
const halfPos = makeCall('half-2', 'half', 'half(10)', [num(10)], [given('n', num(10))])
const aBinding = (changed = false) => bind('a', undef, changed)
const bBinding = (changed = false) => bind('b', undef, changed)
const cBinding = (changed = false) => bind('c', num(5), changed)

const noReturnSteps: CallStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: "greet('민지') 호출: name은 '민지'",
    explanation:
      "인수 '민지'를 평가해 매개변수 name에 넣고 본문을 실행합니다. 이 호출의 결과가 정해지면 const a에 들어갑니다.",
    line: at(11),
    state: { bindings: [], pending: null, call: greetCall },
    output: [],
  },
  {
    title: "console.log('안녕, ' + name)을 실행: 출력",
    explanation:
      "'안녕, ' + name은 '안녕, 민지'이므로 콘솔에 안녕, 민지가 출력됩니다. 출력은 콘솔에 남을 뿐 greet의 호출 결과가 되지는 않습니다.",
    line: at(2),
    state: { bindings: [], pending: null, call: greetCall },
    output: ['안녕, 민지'],
  },
  {
    title: '본문 끝: 호출 결과는 undefined',
    explanation: 'return 없이 본문 끝까지 실행했으므로 호출 결과는 undefined입니다.',
    line: at(3),
    state: {
      bindings: [],
      pending: null,
      call: withResult(greetCall, { value: undef, how: 'end' }),
    },
    output: ['안녕, 민지'],
  },
  {
    title: 'a에 호출 결과 undefined를 넣음',
    explanation: "greet('민지') 호출이 끝났고 그 결과 undefined가 const a의 값이 됩니다.",
    line: at(11),
    state: { bindings: [aBinding(true)], pending: null, call: null },
    output: ['안녕, 민지'],
  },
  {
    title: 'half(-4) 호출: n은 -4',
    explanation: '인수 -4를 평가해 매개변수 n에 넣고 본문을 실행합니다.',
    line: at(12),
    state: { bindings: [aBinding()], pending: null, call: halfNeg },
    output: ['안녕, 민지'],
  },
  {
    title: '조건 n < 0: true',
    explanation: 'n이 -4이므로 n < 0은 true입니다. 조건이 참이므로 if 블록 안의 문장을 실행합니다.',
    line: at(5),
    state: { bindings: [aBinding()], pending: null, call: halfNeg },
    output: ['안녕, 민지'],
  },
  {
    title: 'return;: 호출 결과는 undefined',
    explanation:
      "return을 만나 그 자리에서 함수가 끝납니다. 값이 없는 return;이므로 호출 결과는 undefined이고, 아래의 console.log('계산')과 return n / 2는 실행되지 않습니다.",
    line: at(6),
    state: {
      bindings: [aBinding()],
      pending: null,
      call: withResult(halfNeg, { value: undef, how: 'return-empty' }),
    },
    output: ['안녕, 민지'],
  },
  {
    title: 'b에 호출 결과 undefined를 넣음',
    explanation: 'half(-4) 호출이 끝났고 그 결과 undefined가 const b의 값이 됩니다.',
    line: at(12),
    state: { bindings: [aBinding(), bBinding(true)], pending: null, call: null },
    output: ['안녕, 민지'],
  },
  {
    title: 'half(10) 호출: n은 10',
    explanation: '인수 10을 평가해 매개변수 n에 넣고 본문을 실행합니다.',
    line: at(13),
    state: { bindings: [aBinding(), bBinding()], pending: null, call: halfPos },
    output: ['안녕, 민지'],
  },
  {
    title: '조건 n < 0: false',
    explanation:
      'n이 10이므로 n < 0은 false입니다. 조건이 거짓이므로 if 블록 안을 건너뛰고 블록 다음 줄부터 실행합니다.',
    line: at(5),
    state: { bindings: [aBinding(), bBinding()], pending: null, call: halfPos },
    output: ['안녕, 민지'],
  },
  {
    title: "console.log('계산')을 실행: 출력",
    explanation: 'if 블록을 건너뛴 뒤 이 줄이 실행되어 콘솔에 계산이 출력됩니다.',
    line: at(8),
    state: { bindings: [aBinding(), bBinding()], pending: null, call: halfPos },
    output: ['안녕, 민지', '계산'],
  },
  {
    title: 'return n / 2: 호출 결과는 5',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. n / 2는 10 / 2이므로 호출 결과는 숫자 5입니다.',
    line: at(9),
    state: {
      bindings: [aBinding(), bBinding()],
      pending: null,
      call: withResult(halfPos, { value: num(5), how: 'return' }),
    },
    output: ['안녕, 민지', '계산'],
  },
  {
    title: 'c에 호출 결과 5를 넣음',
    explanation: 'half(10) 호출이 끝났고 그 결과 5가 const c의 값이 됩니다.',
    line: at(13),
    state: { bindings: [aBinding(), bBinding(), cBinding(true)], pending: null, call: null },
    output: ['안녕, 민지', '계산'],
  },
  {
    title: 'console.log(a, b, c)를 출력',
    explanation:
      'a와 b는 호출 결과 undefined, c는 5이므로 콘솔에 undefined undefined 5가 출력됩니다.',
    line: at(14),
    state: { bindings: [aBinding(), bBinding(), cBinding()], pending: null, call: null },
    output: ['안녕, 민지', '계산', 'undefined undefined 5'],
  },
]

// --- 시나리오 3: 인수 평가 순서 ----------------------------------------------------------------

const addCode = 'add(square(2), square(3))'
const square2 = makeCall('square-1', 'square', 'square(2)', [num(2)], [given('n', num(2))])
const square3 = makeCall('square-2', 'square', 'square(3)', [num(3)], [given('n', num(3))])
const addCall = makeCall(
  'add-1',
  'add',
  addCode,
  [num(4), num(9)],
  [given('a', num(4)), given('b', num(9))],
)
const pending = (args: (Val | null)[]): Pending => ({ callee: 'add', code: addCode, args })

const evalOrderSteps: CallStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: 'add의 인수 평가 시작: square(2) 호출',
    explanation:
      '호출 add(square(2), square(3))은 add의 본문을 실행하기 전에 인수 식을 왼쪽부터 모두 평가합니다. 첫 번째 인수 square(2)를 평가하려고 square를 호출하며, n은 2입니다. add는 아직 시작하지 않았습니다.',
    line: at(9),
    state: { bindings: [], pending: pending([null, null]), call: square2 },
    output: [],
  },
  {
    title: "console.log('square ' + n)을 실행: 출력",
    explanation: "'square ' + n은 'square 2'이므로 콘솔에 square 2가 출력됩니다.",
    line: at(2),
    state: { bindings: [], pending: pending([null, null]), call: square2 },
    output: ['square 2'],
  },
  {
    title: 'return n * n: 호출 결과는 4',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. n * n은 2 * 2이므로 호출 결과는 숫자 4이고, 이 값이 add의 첫 번째 인수가 됩니다.',
    line: at(3),
    state: {
      bindings: [],
      pending: pending([null, null]),
      call: withResult(square2, { value: num(4), how: 'return' }),
    },
    output: ['square 2'],
  },
  {
    title: '두 번째 인수 square(3) 호출',
    explanation:
      '첫 번째 인수는 4로 정해졌습니다. 이어서 두 번째 인수 square(3)을 평가하려고 square를 호출하며, n은 3입니다. add는 여전히 시작하지 않았습니다.',
    line: at(9),
    state: { bindings: [], pending: pending([num(4), null]), call: square3 },
    output: ['square 2'],
  },
  {
    title: "console.log('square ' + n)을 실행: 출력",
    explanation: "'square ' + n은 'square 3'이므로 콘솔에 square 3이 출력됩니다.",
    line: at(2),
    state: { bindings: [], pending: pending([num(4), null]), call: square3 },
    output: ['square 2', 'square 3'],
  },
  {
    title: 'return n * n: 호출 결과는 9',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. n * n은 3 * 3이므로 호출 결과는 숫자 9이고, 이 값이 add의 두 번째 인수가 됩니다.',
    line: at(3),
    state: {
      bindings: [],
      pending: pending([num(4), null]),
      call: withResult(square3, { value: num(9), how: 'return' }),
    },
    output: ['square 2', 'square 3'],
  },
  {
    title: 'add(4, 9) 호출: a는 4, b는 9',
    explanation:
      '인수 목록이 4와 9로 모두 정해졌으므로, 이제 매개변수 a와 b에 차례로 넣고 add의 본문을 실행합니다.',
    line: at(9),
    state: { bindings: [], pending: null, call: addCall },
    output: ['square 2', 'square 3'],
  },
  {
    title: "console.log('add 시작')을 실행: 출력",
    explanation:
      'add의 본문이 시작되었습니다. 콘솔에는 square 2, square 3이 먼저 출력되어 있고 add 시작이 그 뒤에 출력됩니다.',
    line: at(6),
    state: { bindings: [], pending: null, call: addCall },
    output: ['square 2', 'square 3', 'add 시작'],
  },
  {
    title: 'return a + b: 호출 결과는 13',
    explanation:
      'return을 만나 그 자리에서 함수가 끝납니다. a + b는 4 + 9이므로 호출 결과는 숫자 13입니다.',
    line: at(7),
    state: {
      bindings: [],
      pending: null,
      call: withResult(addCall, { value: num(13), how: 'return' }),
    },
    output: ['square 2', 'square 3', 'add 시작'],
  },
  {
    title: 'total에 호출 결과 13을 넣음',
    explanation: 'add 호출이 끝났고 그 결과 13이 const total의 값이 됩니다.',
    line: at(9),
    state: { bindings: [bind('total', num(13), true)], pending: null, call: null },
    output: ['square 2', 'square 3', 'add 시작'],
  },
  {
    title: 'console.log(total)을 출력',
    explanation: 'total은 13이므로 콘솔에 13이 출력됩니다.',
    line: at(10),
    state: { bindings: [bind('total', num(13))], pending: null, call: null },
    output: ['square 2', 'square 3', 'add 시작', '13'],
  },
]

export const scenarios: Scenario<CallState>[] = [
  {
    id: 'arg-count',
    label: '인수 개수가 다를 때',
    exampleId: 'arg-count',
    code: argCountCode,
    steps: argCountSteps,
  },
  {
    id: 'no-return',
    label: 'return이 없을 때',
    exampleId: 'no-return',
    code: noReturnCode,
    steps: noReturnSteps,
  },
  {
    id: 'eval-order',
    label: '인수 평가 순서',
    exampleId: 'eval-order',
    code: evalOrderCode,
    steps: evalOrderSteps,
  },
]
