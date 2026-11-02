import type { Scenario, Step } from '~/simulator/types'
import holesCode from './examples/holes.js?raw'
import indexKeysCode from './examples/index-keys.js?raw'
import shrinkLengthCode from './examples/shrink-length.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// props는 length를 뺀 자기 프로퍼티이며 Object.keys 순서(인덱스 오름차순, 그다음 나머지 키)다.
// `changed`·`lengthChanged`·`removed`는 "그 단계에서" 생기거나 바뀐 것에만 붙이고, 다음 단계에서는 해제한다.
// - changed: 그 단계에서 생긴 프로퍼티이거나 값(타입·표시)이 바뀐 프로퍼티
// - lengthChanged: 그 단계에서 length가 바뀜
// - removed: 이전 단계 카드에는 있었지만 지금은 없는 키(없으면 생략)
// 배열이 처음 나타나는 단계(var 줄)는 새로 생긴 것으로 보아 모든 프로퍼티에 changed,
// length > 0이면 lengthChanged를 붙인다.

export type Val = {
  type: 'number' | 'string' | 'undefined'
  display: string // string은 따옴표 없는 내용만 담고, 화면에서 큰따옴표를 붙인다
}

export type Prop = { key: string; value: Val; changed?: boolean }

export type ArrayCard = {
  name: string
  length: number
  lengthChanged?: boolean
  props: Prop[]
  removed?: string[]
}

export type ArrayState = { arrays: ArrayCard[] }

// 배열 인덱스: 명세의 array index(0 이상 2^32 - 2 이하 정수의 표준 문자열). View가 키 배지에 쓴다.
export function isArrayIndex(key: string): boolean {
  const n = Number(key)
  return String(n) === key && Number.isInteger(n) && n >= 0 && n <= 2 ** 32 - 2
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const undef: Val = { type: 'undefined', display: 'undefined' }

const prop = (key: string, value: Val, changed = false): Prop => ({
  key,
  value,
  ...(changed && { changed }),
})

const card = (
  name: string,
  length: number,
  props: Prop[],
  opts: { lengthChanged?: boolean; removed?: string[] } = {},
): ArrayCard => ({
  name,
  length,
  ...(opts.lengthChanged && { lengthChanged: true }),
  props,
  ...(opts.removed && { removed: opts.removed }),
})

const at = (n: number) => ({ from: n, to: n })

type ArrStep = Step<ArrayState>

const before: ArrStep = {
  title: '실행 전',
  explanation: '아직 코드가 실행되지 않았습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
  state: { arrays: [] },
  output: [],
}

// --- 시나리오 1: 인덱스와 length (index-keys.js) -------------------------------------------------

const fruits2 = [prop('0', str('apple')), prop('1', str('banana'))]
const fruits5 = [...fruits2, prop('4', str('kiwi'))]
const fruitsColor = [...fruits5, prop('color', str('red'))]

const indexKeysSteps: ArrStep[] = [
  before,
  {
    title: "fruits에 ['apple', 'banana']를 담은 배열을 만듦",
    explanation:
      "배열 리터럴은 배열 객체를 만들고, 요소마다 '0', '1' 같은 문자열 키의 프로퍼티를 정의합니다. length는 2입니다.",
    line: at(1),
    state: {
      arrays: [
        card(
          'fruits',
          2,
          fruits2.map((p) => ({ ...p, changed: true })),
          { lengthChanged: true },
        ),
      ],
    },
    output: [],
  },
  {
    title: 'typeof와 Array.isArray 출력',
    explanation:
      "배열도 객체라서 typeof는 'object'입니다. 배열인지는 Array.isArray로 구분합니다. console은 호스트 API입니다.",
    line: at(2),
    state: { arrays: [card('fruits', 2, fruits2)] },
    output: ['object true'],
  },
  {
    title: '인덱스는 문자열 키',
    explanation:
      "Object.keys는 ['0', '1']을 돌려줍니다. fruits['1']은 fruits[1]과 같은 프로퍼티를 읽습니다. 숫자 1이 키로 쓰일 때 문자열 '1'로 바뀌기 때문입니다.",
    line: at(3),
    state: { arrays: [card('fruits', 2, fruits2)] },
    output: ['object true', '["0","1"] banana'],
  },
  {
    title: 'fruits[4]에 대입: length가 5로',
    explanation:
      "'4'는 length(2) 이상인 배열 인덱스입니다. 배열의 [[DefineOwnProperty]]가 프로퍼티를 정의한 뒤 length를 인덱스 + 1인 5로 올립니다. '2'와 '3' 프로퍼티는 만들어지지 않습니다.",
    line: at(4),
    state: {
      arrays: [
        card('fruits', 5, [...fruits2, prop('4', str('kiwi'), true)], { lengthChanged: true }),
      ],
    },
    output: ['object true', '["0","1"] banana'],
  },
  {
    title: 'length 5, 2 in fruits는 false',
    explanation:
      "length는 5지만 '2' 프로퍼티는 없어서 2 in fruits는 false입니다. fruits[2]는 자기 프로퍼티가 없고 프로토타입 체인에도 '2'가 없어 undefined입니다.",
    line: at(5),
    state: { arrays: [card('fruits', 5, fruits5)] },
    output: ['object true', '["0","1"] banana', '5 false undefined'],
  },
  {
    title: 'fruits.color에 대입: length는 그대로',
    explanation:
      "'color'는 배열 인덱스가 아니라서 일반 프로퍼티로 추가될 뿐 length를 바꾸지 않습니다.",
    line: at(6),
    state: { arrays: [card('fruits', 5, [...fruits5, prop('color', str('red'), true)])] },
    output: ['object true', '["0","1"] banana', '5 false undefined'],
  },
  {
    title: 'Object.keys: 인덱스 먼저, 나머지 키는 그다음',
    explanation:
      'Object.keys는 인덱스 키를 숫자 오름차순으로 먼저, 나머지 문자열 키를 만든 순서대로 내놓습니다. length는 열거되지 않는 프로퍼티라 나오지 않습니다.',
    line: at(7),
    state: { arrays: [card('fruits', 5, fruitsColor)] },
    output: ['object true', '["0","1"] banana', '5 false undefined', '5 ["0","1","4","color"]'],
  },
]

// --- 시나리오 2: length 줄이고 늘리기 (shrink-length.js) -----------------------------------------

const nums4 = [prop('0', num(10)), prop('1', num(20)), prop('2', num(30)), prop('3', num(40))]
const nums2 = nums4.slice(0, 2)
const nums013 = [...nums2, prop('3', num(40))]

const shrinkLengthSteps: ArrStep[] = [
  before,
  {
    title: 'nums에 숫자 네 개를 담은 배열을 만듦',
    explanation: "인덱스 '0'부터 '3'까지 프로퍼티가 네 개 생기고 length는 4입니다.",
    line: at(1),
    state: {
      arrays: [
        card(
          'nums',
          4,
          nums4.map((p) => ({ ...p, changed: true })),
          { lengthChanged: true },
        ),
      ],
    },
    output: [],
  },
  {
    title: 'nums.length = 2: 인덱스 2 이상 프로퍼티가 지워짐',
    explanation:
      "length에 대입하면 ArraySetLength가 실행됩니다. 새 길이보다 작아지면 인덱스가 2 이상인 프로퍼티('2', '3')를 큰 인덱스부터 지웁니다.",
    line: at(2),
    state: { arrays: [card('nums', 2, nums2, { lengthChanged: true, removed: ['2', '3'] })] },
    output: [],
  },
  {
    title: 'JSON.stringify(nums)와 2 in nums',
    explanation: "남은 프로퍼티는 '0', '1'뿐이라 [10,20]이고, 2 in nums는 false입니다.",
    line: at(3),
    state: { arrays: [card('nums', 2, nums2)] },
    output: ['[10,20] false'],
  },
  {
    title: 'nums.length = 4: 길이만 늘어남',
    explanation:
      "새 길이가 지금보다 크면 ArraySetLength는 length만 바꿉니다. 지워진 요소는 돌아오지 않고, '2'와 '3' 프로퍼티도 만들어지지 않습니다.",
    line: at(4),
    state: { arrays: [card('nums', 4, nums2, { lengthChanged: true })] },
    output: ['[10,20] false'],
  },
  {
    title: 'length 4, 2 in nums는 false',
    explanation:
      "length는 4지만 '2' 프로퍼티는 없습니다. nums[2]는 프로토타입 체인에도 '2'가 없어 undefined입니다.",
    line: at(5),
    state: { arrays: [card('nums', 4, nums2)] },
    output: ['[10,20] false', '4 false undefined'],
  },
  {
    title: 'nums[3] = 40: 프로퍼티만 생김',
    explanation: '인덱스 3은 length(4)보다 작으므로 프로퍼티만 정의되고 length는 그대로입니다.',
    line: at(6),
    state: { arrays: [card('nums', 4, [...nums2, prop('3', num(40), true)])] },
    output: ['[10,20] false', '4 false undefined'],
  },
  {
    title: 'Object.keys: 구멍은 키 목록에 없음',
    explanation: "자기 프로퍼티는 '0', '1', '3'뿐이라 Object.keys도 이 셋만 돌려줍니다.",
    line: at(7),
    state: { arrays: [card('nums', 4, nums013)] },
    output: ['[10,20] false', '4 false undefined', '["0","1","3"]'],
  },
]

// --- 시나리오 3: 구멍과 undefined (holes.js) ---------------------------------------------------

const aProps = [prop('0', num(1)), prop('2', num(3))]
const bProps = [prop('0', num(1)), prop('1', undef), prop('2', num(3))]
const bAfterDelete = bProps.slice(0, 2)
const markNew = (props: Prop[]): Prop[] => props.map((p) => ({ ...p, changed: true }))

const holesSteps: ArrStep[] = [
  before,
  {
    title: 'a: 빠진 요소(구멍)가 있는 배열 리터럴',
    explanation:
      "[1, , 3]에서 쉼표 사이가 빈 곳은 인덱스만 건너뛰고 length에 셉니다. '0'과 '2' 프로퍼티만 있고 '1' 프로퍼티는 없습니다. length는 3입니다.",
    line: at(1),
    state: { arrays: [card('a', 3, markNew(aProps), { lengthChanged: true })] },
    output: [],
  },
  {
    title: 'b: undefined를 요소로 가진 배열',
    explanation:
      "[1, undefined, 3]은 '1' 프로퍼티가 있고 그 값이 undefined입니다. a와 달리 구멍이 아닙니다.",
    line: at(2),
    state: {
      arrays: [card('a', 3, aProps), card('b', 3, markNew(bProps), { lengthChanged: true })],
    },
    output: [],
  },
  {
    title: 'a의 length, 1 in a, a[1]',
    explanation:
      "자기 프로퍼티 '1'이 없고 프로토타입 체인에도 '1'이 없어서 1 in a는 false입니다. a[1]은 자기 프로퍼티가 없고 프로토타입 체인에도 '1'이 없어 undefined입니다.",
    line: at(3),
    state: { arrays: [card('a', 3, aProps), card('b', 3, bProps)] },
    output: ['3 false undefined'],
  },
  {
    title: 'b의 length, 1 in b, b[1]',
    explanation:
      "b에는 '1' 프로퍼티가 있어 1 in b는 true입니다. 읽은 값은 둘 다 undefined라 a[1]과 구분되지 않지만, 자기 프로퍼티가 있는지는 다릅니다. in은 프로토타입 체인까지 보므로 기준을 정확히 묻는 것은 Object.hasOwn입니다.",
    line: at(4),
    state: { arrays: [card('a', 3, aProps), card('b', 3, bProps)] },
    output: ['3 false undefined', '3 true undefined'],
  },
  {
    title: 'delete b[2]: 프로퍼티만 지워짐',
    explanation:
      "delete는 '2' 프로퍼티를 지울 뿐 length를 줄이지 않습니다. b[2] 자리가 구멍이 되고 length는 3 그대로입니다.",
    line: at(5),
    state: { arrays: [card('a', 3, aProps), card('b', 3, bAfterDelete, { removed: ['2'] })] },
    output: ['3 false undefined', '3 true undefined'],
  },
  {
    title: 'b의 length, 2 in b, Object.keys',
    explanation: "length는 3이지만 자기 프로퍼티는 '0', '1'뿐이라 2 in b는 false입니다.",
    line: at(6),
    state: { arrays: [card('a', 3, aProps), card('b', 3, bAfterDelete)] },
    output: ['3 false undefined', '3 true undefined', '3 false ["0","1"]'],
  },
]

export const scenarios: Scenario<ArrayState>[] = [
  {
    id: 'index-keys',
    label: '인덱스와 length',
    exampleId: 'index-keys',
    code: indexKeysCode,
    steps: indexKeysSteps,
  },
  {
    id: 'shrink-length',
    label: 'length 줄이고 늘리기',
    exampleId: 'shrink-length',
    code: shrinkLengthCode,
    steps: shrinkLengthSteps,
  },
  {
    id: 'holes',
    label: '구멍과 undefined',
    exampleId: 'holes',
    code: holesCode,
    steps: holesSteps,
  },
]
