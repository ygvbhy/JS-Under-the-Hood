import type { Scenario, Step } from '~/simulator/types'
import operandOrderCode from './examples/operand-order.js?raw'
import postfixPrefixCode from './examples/postfix-prefix.js?raw'
import selfAssignCode from './examples/self-assign.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// 식 하나를 평가하는 동안 일어나는 일을 사건(읽기 / 쓰기 / 식의 값)으로 한 단계에 하나씩 쌓아 보여 준다.
// 쓰기 단계에서 변수의 값이 바로 바뀌고(`updated`), 선언문은 마지막 "식의 값" 단계에서 변수가 생긴다(`created`).
// 같은 식을 평가하는 동안 `events`는 단계마다 하나씩 늘어난다. 이 예제들의 값은 모두 숫자다.

export type Val = { type: 'number'; display: string }

export type Binding = {
  name: string
  declaredWith: 'let' | 'const'
  value: Val
  changed?: 'created' | 'updated' // 그 단계에서 새로 생김 / 값이 바뀜. 다음 단계에서 해제
}

export type EvalEvent =
  | { kind: 'read'; name: string; value: Val } // 변수의 값을 읽음 (GetValue)
  | { kind: 'write'; name: string; value: Val } // 변수에 새 값을 넣음 (PutValue)
  | { kind: 'result'; code: string; value: Val } // 식 code의 값이 정해짐

export type Evaluation = { code: string; events: EvalEvent[] } // code: 그 줄에서 평가하는 식 전체

export type IncState = { bindings: Binding[]; evaluation?: Evaluation }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })

const bind = (
  name: string,
  declaredWith: Binding['declaredWith'],
  n: number,
  changed?: Binding['changed'],
): Binding => ({
  name,
  declaredWith,
  value: num(n),
  ...(changed && { changed }),
})

const read = (name: string, n: number): EvalEvent => ({ kind: 'read', name, value: num(n) })
const write = (name: string, n: number): EvalEvent => ({ kind: 'write', name, value: num(n) })
const result = (code: string, n: number): EvalEvent => ({ kind: 'result', code, value: num(n) })

// 사건 목록의 앞 count개까지 보여 주는 evaluation
const evaluation = (code: string, events: EvalEvent[], count: number): Evaluation => ({
  code,
  events: events.slice(0, count),
})

const state = (bindings: Binding[], evaluation?: Evaluation): IncState => ({
  bindings,
  ...(evaluation && { evaluation }),
})

const at = (n: number) => ({ from: n, to: n })

const intro: Step<IncState> = {
  title: '실행 전',
  explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
  state: { bindings: [] },
  output: [],
}

// --- 시나리오 1: 후위와 전위 (postfix-prefix) ---------------------------------------------------
// let a = 1;
// const b = a++;   → a는 2가 되고 식의 값(옛 값)은 1
// let c = 1;
// const d = ++c;   → c는 2가 되고 식의 값(새 값)도 2

const aEvents = [read('a', 1), write('a', 2), result('a++', 1)]
const cEvents = [read('c', 1), write('c', 2), result('++c', 2)]

const postfixPrefixSteps: Step<IncState>[] = [
  intro,
  {
    title: 'a를 1로 초기화',
    explanation: '1번 줄의 let 선언이 실행되어 a가 1로 초기화됩니다.',
    line: at(1),
    state: state([bind('a', 'let', 1, 'created')]),
    output: [],
  },
  {
    title: 'a++: a를 읽음',
    explanation:
      '2번 줄의 a++를 평가합니다. 후위 증가는 먼저 a의 값을 읽습니다. 읽은 값 1이 옛 값입니다.',
    line: at(2),
    state: state([bind('a', 'let', 1)], evaluation('a++', aEvents, 1)),
    output: [],
  },
  {
    title: 'a++: a에 2를 넣음',
    explanation:
      '옛 값에 1을 더한 새 값 2를 a에 넣습니다. a의 값은 a++를 평가하는 바로 이 순간 바뀝니다.',
    line: at(2),
    state: state([bind('a', 'let', 2, 'updated')], evaluation('a++', aEvents, 2)),
    output: [],
  },
  {
    title: 'a++의 값은 옛 값 1',
    explanation:
      '후위 증가 식의 값은 옛 값 1입니다. 이 값으로 b가 초기화되고, a는 이미 2로 바뀌어 있습니다.',
    line: at(2),
    state: state(
      [bind('a', 'let', 2), bind('b', 'const', 1, 'created')],
      evaluation('a++', aEvents, 3),
    ),
    output: [],
  },
  {
    title: 'c를 1로 초기화',
    explanation: '3번 줄의 let 선언이 실행되어 c가 1로 초기화됩니다.',
    line: at(3),
    state: state([bind('a', 'let', 2), bind('b', 'const', 1), bind('c', 'let', 1, 'created')]),
    output: [],
  },
  {
    title: '++c: c를 읽음',
    explanation: '4번 줄의 ++c를 평가합니다. 전위 증가도 먼저 c의 값 1을 읽습니다.',
    line: at(4),
    state: state(
      [bind('a', 'let', 2), bind('b', 'const', 1), bind('c', 'let', 1)],
      evaluation('++c', cEvents, 1),
    ),
    output: [],
  },
  {
    title: '++c: c에 2를 넣음',
    explanation: '읽은 값에 1을 더한 새 값 2를 c에 넣습니다. 여기까지는 후위 증가와 같습니다.',
    line: at(4),
    state: state(
      [bind('a', 'let', 2), bind('b', 'const', 1), bind('c', 'let', 2, 'updated')],
      evaluation('++c', cEvents, 2),
    ),
    output: [],
  },
  {
    title: '++c의 값은 새 값 2',
    explanation:
      '전위 증가 식의 값은 새 값 2입니다. 이 값으로 d가 초기화됩니다. 후위와 전위는 변수에 남기는 값은 같고 식의 값만 다릅니다.',
    line: at(4),
    state: state(
      [
        bind('a', 'let', 2),
        bind('b', 'const', 1),
        bind('c', 'let', 2),
        bind('d', 'const', 2, 'created'),
      ],
      evaluation('++c', cEvents, 3),
    ),
    output: [],
  },
  {
    title: '5번 줄 출력',
    explanation: 'console.log가 a, b, c, d를 출력합니다.',
    line: at(5),
    state: state([
      bind('a', 'let', 2),
      bind('b', 'const', 1),
      bind('c', 'let', 2),
      bind('d', 'const', 2),
    ]),
    output: ['2 1 2 2'],
  },
]

// --- 시나리오 2: 자기 자신에 대입 (self-assign) -------------------------------------------------
// let x = 1;
// x = x++;   → x++가 x를 2로 만들지만, 대입이 식의 값 1을 x에 넣어 덮어씀

const selfEvents = [
  read('x', 1),
  write('x', 2),
  result('x++', 1),
  write('x', 1),
  result('x = x++', 1),
]
const selfCode = 'x = x++'

const selfAssignSteps: Step<IncState>[] = [
  intro,
  {
    title: 'x를 1로 초기화',
    explanation: '1번 줄의 let 선언이 실행되어 x가 1로 초기화됩니다.',
    line: at(1),
    state: state([bind('x', 'let', 1, 'created')]),
    output: [],
  },
  {
    title: 'x = x++: 오른쪽의 x를 읽음',
    explanation:
      '2번 줄의 x = x++를 평가합니다. 대입할 대상 x를 먼저 정해 두고 오른쪽 x++를 평가합니다. x++는 먼저 x의 값 1을 읽습니다.',
    line: at(2),
    state: state([bind('x', 'let', 1)], evaluation(selfCode, selfEvents, 1)),
    output: [],
  },
  {
    title: 'x++: x에 2를 넣음',
    explanation: 'x++가 새 값 2를 x에 넣습니다. 이 순간 x는 2입니다.',
    line: at(2),
    state: state([bind('x', 'let', 2, 'updated')], evaluation(selfCode, selfEvents, 2)),
    output: [],
  },
  {
    title: 'x++의 값은 옛 값 1',
    explanation: 'x++의 식의 값은 옛 값 1입니다. x는 아직 2입니다.',
    line: at(2),
    state: state([bind('x', 'let', 2)], evaluation(selfCode, selfEvents, 3)),
    output: [],
  },
  {
    title: '대입: x에 1을 넣음',
    explanation:
      '이제 대입이 오른쪽 식의 값 1을 x에 넣어 앞서 넣은 2를 덮어씁니다. x++가 늘린 값은 이렇게 사라집니다.',
    line: at(2),
    state: state([bind('x', 'let', 1, 'updated')], evaluation(selfCode, selfEvents, 4)),
    output: [],
  },
  {
    title: '대입 식의 값은 1',
    explanation: '대입 식의 값은 오른쪽 식의 값 1입니다. 이 식의 값은 문 안에서 쓰이지 않습니다.',
    line: at(2),
    state: state([bind('x', 'let', 1)], evaluation(selfCode, selfEvents, 5)),
    output: [],
  },
  {
    title: '3번 줄 출력',
    explanation: 'console.log가 x를 출력합니다. x는 2가 아니라 1입니다.',
    line: at(3),
    state: state([bind('x', 'let', 1)]),
    output: ['1'],
  },
]

// --- 시나리오 3: 피연산자 평가 순서 (operand-order) ---------------------------------------------
// let i = 1;
// const sum = i++ + i;   → 왼쪽 i++가 i를 2로 바꾼 뒤 오른쪽 i를 읽음: 1 + 2

const orderEvents = [
  read('i', 1),
  write('i', 2),
  result('i++', 1),
  read('i', 2),
  result('i++ + i', 3),
]
const orderCode = 'i++ + i'

const operandOrderSteps: Step<IncState>[] = [
  intro,
  {
    title: 'i를 1로 초기화',
    explanation: '1번 줄의 let 선언이 실행되어 i가 1로 초기화됩니다.',
    line: at(1),
    state: state([bind('i', 'let', 1, 'created')]),
    output: [],
  },
  {
    title: 'i++: i를 읽음',
    explanation:
      '2번 줄의 i++ + i를 평가합니다. + 연산자는 왼쪽 피연산자 i++를 먼저 평가합니다. i++는 i의 값 1을 읽습니다.',
    line: at(2),
    state: state([bind('i', 'let', 1)], evaluation(orderCode, orderEvents, 1)),
    output: [],
  },
  {
    title: 'i++: i에 2를 넣음',
    explanation: '새 값 2를 i에 넣습니다. 이 순간 i는 2가 됩니다.',
    line: at(2),
    state: state([bind('i', 'let', 2, 'updated')], evaluation(orderCode, orderEvents, 2)),
    output: [],
  },
  {
    title: 'i++의 값은 옛 값 1',
    explanation: '왼쪽 피연산자 i++의 식의 값은 옛 값 1입니다.',
    line: at(2),
    state: state([bind('i', 'let', 2)], evaluation(orderCode, orderEvents, 3)),
    output: [],
  },
  {
    title: '오른쪽 i를 읽음',
    explanation:
      '왼쪽 피연산자 평가가 끝난 뒤 오른쪽을 평가하므로, 오른쪽 i는 이미 바뀐 값 2를 읽습니다.',
    line: at(2),
    state: state([bind('i', 'let', 2)], evaluation(orderCode, orderEvents, 4)),
    output: [],
  },
  {
    title: 'i++ + i의 값은 3',
    explanation:
      '왼쪽 식의 값 1과 오른쪽에서 읽은 값 2를 더한 3이 식의 값입니다. 이 값으로 sum이 초기화됩니다.',
    line: at(2),
    state: state(
      [bind('i', 'let', 2), bind('sum', 'const', 3, 'created')],
      evaluation(orderCode, orderEvents, 5),
    ),
    output: [],
  },
  {
    title: '3번 줄 출력',
    explanation: 'console.log가 sum과 i를 출력합니다.',
    line: at(3),
    state: state([bind('i', 'let', 2), bind('sum', 'const', 3)]),
    output: ['3 2'],
  },
]

export const scenarios: Scenario<IncState>[] = [
  {
    id: 'postfix-prefix',
    label: '후위와 전위',
    exampleId: 'postfix-prefix',
    code: postfixPrefixCode,
    steps: postfixPrefixSteps,
  },
  {
    id: 'self-assign',
    label: '자기 자신에 대입',
    exampleId: 'self-assign',
    code: selfAssignCode,
    steps: selfAssignSteps,
  },
  {
    id: 'operand-order',
    label: '피연산자 평가 순서',
    exampleId: 'operand-order',
    code: operandOrderCode,
    steps: operandOrderSteps,
  },
]
