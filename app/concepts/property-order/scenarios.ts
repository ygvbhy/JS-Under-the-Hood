import type { Scenario, Step } from '~/simulator/types'
import basicOrderCode from './examples/basic-order.js?raw'
import notIndexCode from './examples/not-index.js?raw'
import reassignDeleteCode from './examples/reassign-delete.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// 객체 카드는 키를 두 칸으로 나눠 담는다. 이 두 칸은 명세의 나열 규칙(배열 인덱스 형태의 키는 작은 수부터,
// 그다음 나머지 문자열 키는 만든 순서)을 보이기 위한 그림이며 엔진의 저장 방식이 아니다.
// - indexKeys: 배열 인덱스 형태의 키(작은 수부터). Object.keys 결과의 앞부분
// - stringKeys: 그 밖의 문자열 키(만든 순서). Object.keys 결과의 뒷부분
// `change`·`removed`는 "그 단계에서" 생기거나 바뀐 것에만 붙이고, 다음 단계에서는 해제한다.
// - change 'new': 그 단계에서 새로 만들어진 키
// - change 'value': 이미 있던 키의 값만 바뀜
// - removed: 이전 단계 카드에는 있었지만 지금은 없는 키(없으면 생략)
// 객체가 처음 나타나는 단계에서는 모든 키가 'new'다.

export type Val = {
  type: 'string' | 'number'
  display: string // string은 따옴표 없는 내용만 담고, 화면에서 큰따옴표를 붙인다
}

export type Prop = { key: string; value: Val; change?: 'new' | 'value' }

export type ObjCard = {
  name: string
  indexKeys: Prop[]
  stringKeys: Prop[]
  removed?: string[]
}

export type KeyOrderState = { objects: ObjCard[] }

// 배열 인덱스 형태의 키: 명세의 array index(0 이상 2^32 - 2 이하 정수의 표준 문자열).
// 숫자로 바꿨다 다시 문자열로 바꾼 값이 원래 키와 같아야 하므로 '01'·'-0'은 아니다.
export function isArrayIndex(key: string): boolean {
  const n = Number(key)
  return String(n) === key && Number.isInteger(n) && n >= 0 && n <= 2 ** 32 - 2
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string): Val => ({ type: 'string', display: s })
const num = (n: number): Val => ({ type: 'number', display: String(n) })

const prop = (key: string, value: Val, change?: 'new' | 'value'): Prop => ({
  key,
  value,
  ...(change && { change }),
})

const fresh = (p: Prop): Prop => ({ ...p, change: 'new' })

const card = (
  name: string,
  indexKeys: Prop[],
  stringKeys: Prop[],
  removed?: string[],
): ObjCard => ({
  name,
  indexKeys,
  stringKeys,
  ...(removed && { removed }),
})

const at = (n: number) => ({ from: n, to: n })

type KeyStep = Step<KeyOrderState>

const before: KeyStep = {
  title: '실행 전',
  explanation: '아직 코드가 실행되지 않았습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
  state: { objects: [] },
  output: [],
}

// --- 시나리오 1: 키를 하나씩 추가 (basic-order.js) -----------------------------------------------

const bookKeysLine = '["1","2","title","author"]'

const bTitle = prop('title', str('JS'))
const bAuthor = prop('author', str('Kim'))
const b1 = prop('1', str('one'))
const b2 = prop('2', str('two'))

const basicOrderSteps: KeyStep[] = [
  before,
  {
    title: 'book에 빈 객체를 연결',
    explanation:
      '빈 객체를 만들어 book에 연결합니다. 아직 키가 없어서 Object.keys 결과도 빈 배열입니다.',
    line: at(1),
    state: { objects: [card('book', [], [])] },
    output: [],
  },
  {
    title: "book.title에 대입: 그 밖의 문자열 키 'title'",
    explanation:
      "'title'은 배열 인덱스 형태의 키가 아닙니다. 그 밖의 문자열 키 쪽에 만든 순서대로 놓입니다.",
    line: at(2),
    state: { objects: [card('book', [], [fresh(bTitle)])] },
    output: [],
  },
  {
    title: "book[2]에 대입: 키 '2'는 title보다 앞",
    explanation:
      "숫자 2는 프로퍼티 키로 쓰일 때 문자열 '2'가 됩니다. '2'는 배열 인덱스 형태의 키라서 title보다 나중에 만들었어도 Object.keys에서는 그 밖의 문자열 키보다 앞에 옵니다.",
    line: at(3),
    state: { objects: [card('book', [fresh(b2)], [bTitle])] },
    output: [],
  },
  {
    title: 'book.author에 대입: 그 밖의 문자열 키는 만든 순서',
    explanation: "'author'도 그 밖의 문자열 키이므로 만든 순서대로 title 뒤에 놓입니다.",
    line: at(4),
    state: { objects: [card('book', [b2], [bTitle, fresh(bAuthor)])] },
    output: [],
  },
  {
    title: "book[1]에 대입: 키 '1'은 '2'보다 앞",
    explanation:
      "'1'도 배열 인덱스 형태의 키입니다. 배열 인덱스 형태의 키끼리는 만든 순서가 아니라 작은 수부터이므로 나중에 만든 '1'이 '2' 앞에 옵니다.",
    line: at(5),
    state: { objects: [card('book', [fresh(b1), b2], [bTitle, bAuthor])] },
    output: [],
  },
  {
    title: 'Object.keys(book) 출력',
    explanation:
      "배열 인덱스 형태의 키('1', '2')가 작은 수부터 먼저 나오고, 그다음 그 밖의 문자열 키가 만든 순서(title, author)로 이어집니다. console은 호스트 API입니다.",
    line: at(6),
    state: { objects: [card('book', [b1, b2], [bTitle, bAuthor])] },
    output: [bookKeysLine],
  },
  {
    title: '객체 리터럴: 적힌 순서대로 키를 만듦',
    explanation:
      '객체 리터럴의 프로퍼티는 적힌 순서(title, 2, author, 1)대로 만들어집니다. 만드는 방법이 달라도 키를 나열하는 규칙은 같아서 book과 같은 순서가 됩니다.',
    line: at(7),
    state: {
      objects: [
        card('book', [b1, b2], [bTitle, bAuthor]),
        card('literal', [fresh(b1), fresh(b2)], [fresh(bTitle), fresh(bAuthor)]),
      ],
    },
    output: [bookKeysLine],
  },
  {
    title: 'Object.keys(literal) 출력',
    explanation: '리터럴로 만든 객체도 같은 결과를 냅니다. 배열 인덱스 형태의 키가 먼저입니다.',
    line: at(8),
    state: {
      objects: [
        card('book', [b1, b2], [bTitle, bAuthor]),
        card('literal', [b1, b2], [bTitle, bAuthor]),
      ],
    },
    output: [bookKeysLine, bookKeysLine],
  },
]

// --- 시나리오 2: 다시 대입과 delete (reassign-delete.js) ------------------------------------------

const uName = (v: string) => prop('name', str(v))
const uAge = prop('age', num(20))
const uCity = prop('city', str('Seoul'))

const reassignDeleteSteps: KeyStep[] = [
  before,
  {
    title: 'user를 만듦: name, age, city 순서',
    explanation:
      '객체 리터럴이 name, age, city 순서로 키를 만듭니다. 모두 그 밖의 문자열 키라 만든 순서가 그대로 나열 순서입니다.',
    line: at(1),
    state: {
      objects: [card('user', [], [fresh(uName('Lee')), fresh(uAge), fresh(uCity)])],
    },
    output: [],
  },
  {
    title: "user.name에 다시 대입: 값만 'Park'로",
    explanation:
      '이미 있는 name에 대입하면 프로퍼티를 새로 만들지 않고 값만 바꿉니다. 키를 만든 순서는 달라지지 않아서 자리가 그대로입니다.',
    line: at(2),
    state: {
      objects: [card('user', [], [prop('name', str('Park'), 'value'), uAge, uCity])],
    },
    output: [],
  },
  {
    title: 'Object.keys(user) 출력: 순서 그대로',
    explanation: '값이 바뀌었어도 name은 여전히 첫 번째 키입니다.',
    line: at(3),
    state: { objects: [card('user', [], [uName('Park'), uAge, uCity])] },
    output: ['["name","age","city"]'],
  },
  {
    title: 'delete user.name: 프로퍼티가 지워짐',
    explanation: 'delete는 name 프로퍼티를 객체에서 지웁니다. age와 city만 남습니다.',
    line: at(4),
    state: { objects: [card('user', [], [uAge, uCity], ['name'])] },
    output: ['["name","age","city"]'],
  },
  {
    title: "user.name에 'Choi' 대입: 새로 만든 키라 맨 뒤",
    explanation:
      '지금은 name 프로퍼티가 없으므로 이 대입은 키를 새로 만듭니다. 새로 만든 그 밖의 문자열 키는 만든 순서대로 맨 뒤에 놓입니다.',
    line: at(5),
    state: {
      objects: [card('user', [], [uAge, uCity, fresh(uName('Choi'))])],
    },
    output: ['["name","age","city"]'],
  },
  {
    title: 'Object.keys(user) 출력: name이 맨 뒤',
    explanation: '다시 만든 name은 age와 city 뒤에 나옵니다.',
    line: at(6),
    state: { objects: [card('user', [], [uAge, uCity, uName('Choi')])] },
    output: ['["name","age","city"]', '["age","city","name"]'],
  },
]

// --- 시나리오 3: 배열 인덱스가 아닌 숫자 키 (not-index.js) ----------------------------------------

const k = (key: string, v: string) => prop(key, str(v))
const k10 = k('10', 'a')
const k9 = k('9', 'b')
const k01 = k('01', 'c')
const k15 = k('1.5', 'd')
const kNeg = k('-1', 'e')
const kMax = k('4294967295', 'f')
const kLimit = k('4294967294', 'g')

const notIndexSteps: KeyStep[] = [
  before,
  {
    title: 'keys에 빈 객체를 연결',
    explanation:
      '빈 객체를 만들어 keys에 연결합니다. 이어지는 줄에서 숫자처럼 생긴 키를 넣어 봅니다.',
    line: at(1),
    state: { objects: [card('keys', [], [])] },
    output: [],
  },
  {
    title: "keys['10']에 대입: 배열 인덱스 형태의 키",
    explanation:
      "Number('10')은 10이고 String(10)은 다시 '10'입니다. 0 이상 2^32 − 2 이하의 정수이므로 '10'은 배열 인덱스 형태의 키입니다.",
    line: at(2),
    state: { objects: [card('keys', [fresh(k10)], [])] },
    output: [],
  },
  {
    title: "keys['9']에 대입: 수로 비교해 '10'보다 앞",
    explanation:
      "'9'도 배열 인덱스 형태의 키입니다. 배열 인덱스 형태의 키는 문자열이 아니라 수로 비교해 작은 수부터 나오므로 나중에 만든 '9'가 '10' 앞에 옵니다.",
    line: at(3),
    state: { objects: [card('keys', [fresh(k9), k10], [])] },
    output: [],
  },
  {
    title: "keys['01']에 대입: 그 밖의 문자열 키",
    explanation:
      "Number('01')은 1이고 String(1)은 '1'이라 원래 키 '01'과 다릅니다. 숫자로 바꿨다 다시 문자열로 바꾼 표준 형태와 달라서 배열 인덱스 형태의 키가 아니며, 그 밖의 문자열 키 쪽에 만든 순서대로 놓입니다.",
    line: at(4),
    state: { objects: [card('keys', [k9, k10], [fresh(k01)])] },
    output: [],
  },
  {
    title: "keys['1.5']에 대입: 정수가 아니라 그 밖의 문자열 키",
    explanation:
      "Number('1.5')는 1.5로 정수가 아닙니다. 배열 인덱스 형태의 키는 정수여야 하므로 '1.5'는 그 밖의 문자열 키 쪽에 만든 순서대로 놓입니다.",
    line: at(5),
    state: { objects: [card('keys', [k9, k10], [k01, fresh(k15)])] },
    output: [],
  },
  {
    title: "keys['-1']에 대입: 음수라 그 밖의 문자열 키",
    explanation:
      "-1은 0 이상이 아니므로 '-1'은 배열 인덱스 형태의 키가 아닙니다. 그 밖의 문자열 키 쪽에 만든 순서대로 놓입니다.",
    line: at(6),
    state: { objects: [card('keys', [k9, k10], [k01, k15, fresh(kNeg)])] },
    output: [],
  },
  {
    title: "keys['4294967295']에 대입: 상한을 넘어 그 밖의 문자열 키",
    explanation:
      '4294967295는 2^32 − 1입니다. 배열 인덱스 형태의 키의 상한은 2^32 − 2이므로 이 키는 상한을 넘어 그 밖의 문자열 키 쪽에 만든 순서대로 놓입니다.',
    line: at(7),
    state: { objects: [card('keys', [k9, k10], [k01, k15, kNeg, fresh(kMax)])] },
    output: [],
  },
  {
    title: "keys['4294967294']에 대입: 상한과 같아 배열 인덱스 형태의 키",
    explanation:
      '4294967294는 2^32 − 2로 상한과 같아 배열 인덱스 형태의 키입니다. 가장 나중에 만들었지만 배열 인덱스 형태의 키 중 가장 큰 수라서 인덱스 칸의 맨 뒤에 놓이고, 그 밖의 문자열 키보다는 앞에 옵니다.',
    line: at(8),
    state: {
      objects: [card('keys', [k9, k10, fresh(kLimit)], [k01, k15, kNeg, kMax])],
    },
    output: [],
  },
  {
    title: 'Object.keys(keys) 출력',
    explanation:
      "배열 인덱스 형태의 키 '9', '10', '4294967294'가 작은 수부터 먼저 나오고, '01', '1.5', '-1', '4294967295'는 만든 순서대로 뒤에 나옵니다.",
    line: at(9),
    state: {
      objects: [card('keys', [k9, k10, kLimit], [k01, k15, kNeg, kMax])],
    },
    output: ['["9","10","4294967294","01","1.5","-1","4294967295"]'],
  },
]

export const scenarios: Scenario<KeyOrderState>[] = [
  {
    id: 'basic-order',
    label: '키를 하나씩 추가',
    exampleId: 'basic-order',
    code: basicOrderCode,
    steps: basicOrderSteps,
  },
  {
    id: 'reassign-delete',
    label: '다시 대입과 delete',
    exampleId: 'reassign-delete',
    code: reassignDeleteCode,
    steps: reassignDeleteSteps,
  },
  {
    id: 'not-index',
    label: '배열 인덱스가 아닌 숫자 키',
    exampleId: 'not-index',
    code: notIndexCode,
    steps: notIndexSteps,
  },
]
