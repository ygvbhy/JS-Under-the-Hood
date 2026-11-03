import type { Scenario, Step } from '~/simulator/types'
import arrayLoopCode from './examples/array-loop.js?raw'
import customIterableCode from './examples/custom-iterable.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - iterable: for...of에 넘기는 값(이터러블). 선언된 줄의 단계부터 나타난다.
// - iterator: GetIterator가 돌려준 이터레이터. 배열 이터레이터는 명세의 내부 슬롯
//   [[IteratedArrayLike]]·[[ArrayLikeNextIndex]]를, 직접 만든 이터레이터는 클로저 변수 left를 필드로 보인다.
//   Field.changed는 이전 단계와 값이 달라진 단계에서만 true다(필드가 처음 나타나는 단계는 아님).
// - binding: 루프 변수(예제는 var). 값은 마지막으로 받은 IteratorValue이며 루프가 끝나도 남는다.
// - calls: 이 단계에서 끝난 프로토콜 호출만 담는다. 결과가 정해지는 줄의 단계에 기록하며, 선언·출력 줄은 빈 배열이다.
// - 화면에 보이는 값(IterResult.value, Field.value, binding.value)은 모두 표시용 문자열이다.
//   문자열 값은 따옴표를 붙이고('a'), 숫자는 그대로(3), undefined는 undefined로 쓴다.

export type IterResult = { value: string; done: boolean }

export type ProtocolCall =
  | { kind: 'get-iterator'; target: string } // target[Symbol.iterator]() 호출
  | { kind: 'next'; result: IterResult }
  | { kind: 'return' }

export type Field = { name: string; value: string; changed?: boolean }

export type IterState = {
  iterable: { name: string; summary: string } | null
  iterator: { label: string; fields: Field[] } | null
  binding: { name: string; value: string } | null
  calls: ProtocolCall[]
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const fld = (name: string, value: string, changed = false): Field => ({
  name,
  value,
  ...(changed && { changed: true }),
})

const getIter = (target: string): ProtocolCall => ({ kind: 'get-iterator', target })

const nextCall = (value: string, done: boolean): ProtocolCall => ({
  kind: 'next',
  result: { value, done },
})

const returnCall: ProtocolCall = { kind: 'return' }

const at = (n: number) => ({ from: n, to: n })

type ItStep = Step<IterState>

const before: ItStep = {
  title: '실행 전',
  explanation: '아직 코드가 실행되지 않았습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
  state: { iterable: null, iterator: null, binding: null, calls: [] },
  output: [],
}

// --- 시나리오 1: 배열을 for...of로 (array-loop.js) -------------------------------------------

const LETTERS = { name: 'letters', summary: "배열 ['a', 'b']" }
const ARRAY_ITERATOR = '배열 이터레이터'

const arrayLoopSteps: ItStep[] = [
  before,
  {
    title: "letters에 ['a', 'b']를 담음",
    explanation:
      '배열 리터럴을 평가해 배열 객체를 만들고 변수 letters에 담습니다. 아직 이터레이터는 없습니다.',
    line: at(1),
    state: { iterable: LETTERS, iterator: null, binding: null, calls: [] },
    output: [],
  },
  {
    title: 'for...of 시작: letters[Symbol.iterator]()로 이터레이터를 얻음',
    explanation:
      'for...of는 먼저 GetIterator로 letters의 Symbol.iterator 메서드를 꺼내 letters를 this로 부릅니다. 배열의 이 메서드(Array.prototype.values와 같은 함수)가 배열 이터레이터를 만들어 돌려줍니다. 명세가 정한 배열 이터레이터의 상태는 [[IteratedArrayLike]](순회할 배열)와 [[ArrayLikeNextIndex]](다음에 읽을 위치, 처음 0)입니다.',
    line: at(2),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [fld('[[IteratedArrayLike]]', 'letters'), fld('[[ArrayLikeNextIndex]]', '0')],
      },
      binding: null,
      calls: [getIter('letters')],
    },
    output: [],
  },
  {
    title: "next() → { value: 'a', done: false }",
    explanation:
      "매 반복 시작에 for...of는 이터레이터의 next를 부릅니다. 배열 이터레이터의 next는 [[ArrayLikeNextIndex]]가 배열의 length보다 작으면 이 값을 1 늘리고, 읽은 요소 'a'와 done: false를 담은 결과 객체를 돌려줍니다. IteratorComplete(done을 ToBoolean으로 변환)가 false라서 value를 루프 변수 ch에 넣고 본문을 실행합니다.",
    line: at(2),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [fld('[[IteratedArrayLike]]', 'letters'), fld('[[ArrayLikeNextIndex]]', '1', true)],
      },
      binding: { name: 'ch', value: "'a'" },
      calls: [nextCall("'a'", false)],
    },
    output: [],
  },
  {
    title: '본문: console.log(ch)로 a를 출력',
    explanation: "루프 변수 ch에 담긴 'a'를 출력합니다. 이 줄은 이터레이터를 건드리지 않습니다.",
    line: at(3),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [fld('[[IteratedArrayLike]]', 'letters'), fld('[[ArrayLikeNextIndex]]', '1')],
      },
      binding: { name: 'ch', value: "'a'" },
      calls: [],
    },
    output: ['a'],
  },
  {
    title: "next() → { value: 'b', done: false }",
    explanation:
      "본문이 끝나면 for...of는 다시 next를 부릅니다. [[ArrayLikeNextIndex]]는 1이고 length는 2라서 'b'를 읽고 값을 2로 늘립니다. done이 false이므로 value 'b'가 ch에 들어갑니다.",
    line: at(2),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [fld('[[IteratedArrayLike]]', 'letters'), fld('[[ArrayLikeNextIndex]]', '2', true)],
      },
      binding: { name: 'ch', value: "'b'" },
      calls: [nextCall("'b'", false)],
    },
    output: ['a'],
  },
  {
    title: '본문: console.log(ch)로 b를 출력',
    explanation: "ch에 담긴 'b'를 출력합니다.",
    line: at(3),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [fld('[[IteratedArrayLike]]', 'letters'), fld('[[ArrayLikeNextIndex]]', '2')],
      },
      binding: { name: 'ch', value: "'b'" },
      calls: [],
    },
    output: ['a', 'b'],
  },
  {
    title: 'next() → { value: undefined, done: true }: 루프 끝',
    explanation:
      "다시 next를 부르면 [[ArrayLikeNextIndex]] 2가 length 2 이상이라 배열 이터레이터는 [[IteratedArrayLike]]를 undefined로 바꾸고 value가 undefined, done이 true인 결과를 돌려줍니다. IteratorComplete가 true라서 for...of가 끝납니다. 본문은 실행되지 않으므로 ch는 마지막으로 받은 값 'b'를 그대로 가집니다.",
    line: at(2),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [
          fld('[[IteratedArrayLike]]', 'undefined', true),
          fld('[[ArrayLikeNextIndex]]', '2'),
        ],
      },
      binding: { name: 'ch', value: "'b'" },
      calls: [nextCall('undefined', true)],
    },
    output: ['a', 'b'],
  },
  {
    title: "console.log('end', ch)로 end b를 출력",
    explanation:
      "var로 선언한 ch는 for...of 문 밖에서도 보이므로 루프가 끝난 뒤에도 마지막으로 받은 'b'를 가집니다. let이었다면 반복마다 새 바인딩이 만들어지고 밖에서는 보이지 않습니다.",
    line: at(5),
    state: {
      iterable: LETTERS,
      iterator: {
        label: ARRAY_ITERATOR,
        fields: [fld('[[IteratedArrayLike]]', 'undefined'), fld('[[ArrayLikeNextIndex]]', '2')],
      },
      binding: { name: 'ch', value: "'b'" },
      calls: [],
    },
    output: ['a', 'b', 'end b'],
  },
]

// --- 시나리오 2: 직접 만든 이터러블과 break (custom-iterable.js) ------------------------------

const COUNTDOWN = { name: 'countdown', summary: 'Symbol.iterator 메서드가 있는 객체' }
const CUSTOM_ITERATOR = 'countdown[Symbol.iterator]()가 돌려준 객체'

const customBreakSteps: ItStep[] = [
  before,
  {
    title: 'countdown 객체를 만듦',
    explanation:
      '[Symbol.iterator]() 메서드 하나를 가진 객체를 만들어 countdown에 담습니다. 이 메서드를 부르면 next와 return을 가진 이터레이터가 만들어집니다. 아직 아무 메서드도 불리지 않았습니다.',
    line: { from: 1, to: 15 },
    state: { iterable: COUNTDOWN, iterator: null, binding: null, calls: [] },
    output: [],
  },
  {
    title: 'for...of 시작: countdown[Symbol.iterator]()로 이터레이터를 얻음',
    explanation:
      'GetIterator가 countdown의 Symbol.iterator 메서드를 부릅니다. 메서드 안에서 left가 3으로 만들어지고 next와 return을 가진 객체가 돌려지며, 그 결과가 객체이므로 이터레이터로 쓰입니다. 이 단계에서는 for...of 줄을 강조하지만 실제로는 3~13번 줄의 메서드 본문이 실행됩니다. next는 이때 한 번 꺼내 두고 반복마다 부릅니다.',
    line: at(16),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '3')] },
      binding: null,
      calls: [getIter('countdown')],
    },
    output: [],
  },
  {
    title: "next 메서드 안: console.log('next')",
    explanation:
      'for...of가 첫 반복을 위해 이터레이터의 next를 부르면 6번 줄이 먼저 실행되어 next를 출력합니다. 본문(17번 줄)보다 next가 먼저 불리는 것입니다. 강조된 줄은 for...of가 부른 next 메서드 안입니다.',
    line: at(6),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '3')] },
      binding: null,
      calls: [],
    },
    output: ['next'],
  },
  {
    title: 'next 메서드 안: { value: 3, done: false }을 돌려줌',
    explanation:
      'left가 0보다 크므로 left--가 평가되어 값 3을 쓰고 left는 2가 되며, { value: 3, done: false } 객체를 돌려줍니다. IteratorComplete가 false라서 value 3이 루프 변수 n에 들어갑니다.',
    line: at(7),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '2', true)] },
      binding: { name: 'n', value: '3' },
      calls: [nextCall('3', false)],
    },
    output: ['next'],
  },
  {
    title: '본문: console.log(n)으로 3을 출력',
    explanation: 'n의 값 3을 출력합니다. next는 본문이 끝난 뒤 다음 반복에서 다시 불립니다.',
    line: at(17),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '2')] },
      binding: { name: 'n', value: '3' },
      calls: [],
    },
    output: ['next', '3'],
  },
  {
    title: 'n === 2는 거짓이라 break하지 않음',
    explanation:
      'n은 3이므로 조건이 거짓이고 break가 실행되지 않습니다. 본문이 정상적으로 끝나 for...of는 다음 반복으로 넘어갑니다.',
    line: at(18),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '2')] },
      binding: { name: 'n', value: '3' },
      calls: [],
    },
    output: ['next', '3'],
  },
  {
    title: "next 메서드 안: console.log('next')",
    explanation:
      '두 번째 반복도 본문보다 next가 먼저 불립니다. for...of가 next를 부르자 6번 줄이 실행되어 next를 출력합니다.',
    line: at(6),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '2')] },
      binding: { name: 'n', value: '3' },
      calls: [],
    },
    output: ['next', '3', 'next'],
  },
  {
    title: 'next 메서드 안: { value: 2, done: false }을 돌려줌',
    explanation:
      'left--가 값 2를 쓰고 left는 1이 됩니다. done이 false라서 value 2가 n에 들어갑니다.',
    line: at(7),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '1', true)] },
      binding: { name: 'n', value: '2' },
      calls: [nextCall('2', false)],
    },
    output: ['next', '3', 'next'],
  },
  {
    title: '본문: console.log(n)으로 2를 출력',
    explanation: 'n의 값 2를 출력합니다.',
    line: at(17),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '1')] },
      binding: { name: 'n', value: '2' },
      calls: [],
    },
    output: ['next', '3', 'next', '2'],
  },
  {
    title: 'n === 2가 참이라 break 실행',
    explanation:
      'break로 본문이 정상 종료가 아닌 completion으로 끝나면, ForIn/OfBodyEvaluation은 루프가 계속되지 않는다고 보고 IteratorClose를 부릅니다. 이터레이터가 done: true를 돌려주지 않았기 때문에 아직 닫히지 않은 이터레이터를 닫는 것입니다. 다음 next는 부르지 않습니다.',
    line: at(18),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '1')] },
      binding: { name: 'n', value: '2' },
      calls: [],
    },
    output: ['next', '3', 'next', '2'],
  },
  {
    title: "return 메서드 안: console.log('return')",
    explanation:
      'IteratorClose는 이터레이터에서 return 메서드를 찾아 부릅니다(없으면 아무것도 하지 않습니다). 강조된 줄은 for...of가 부른 return 메서드 안이며, return을 출력합니다.',
    line: at(10),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '1')] },
      binding: { name: 'n', value: '2' },
      calls: [],
    },
    output: ['next', '3', 'next', '2', 'return'],
  },
  {
    title: 'return 메서드 안: { done: true }를 돌려주고 루프 끝',
    explanation:
      'return이 객체를 돌려주었으므로 IteratorClose는 break의 completion을 그대로 이어 받고 for...of가 끝납니다. return의 결과가 객체가 아니면 TypeError입니다. left는 1로 남아 있어 이터레이터를 끝까지 돌지 않았다는 것을 보여 줍니다.',
    line: at(11),
    state: {
      iterable: COUNTDOWN,
      iterator: { label: CUSTOM_ITERATOR, fields: [fld('left', '1')] },
      binding: { name: 'n', value: '2' },
      calls: [returnCall],
    },
    output: ['next', '3', 'next', '2', 'return'],
  },
]

export const scenarios: Scenario<IterState>[] = [
  {
    id: 'array-loop',
    label: '배열을 for...of로',
    exampleId: 'array-loop',
    code: arrayLoopCode,
    steps: arrayLoopSteps,
  },
  {
    id: 'custom-break',
    label: '직접 만든 이터러블과 break',
    exampleId: 'custom-iterable',
    code: customIterableCode,
    steps: customBreakSteps,
  },
]
