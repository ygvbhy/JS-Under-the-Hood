import type { LineRange, Scenario, Step } from '~/simulator/types'
import basicCode from './examples/basic.js?raw'
import returnObjectCode from './examples/return-object.js?raw'
import returnPrimitiveCode from './examples/return-primitive.js?raw'
import withoutNewSloppyCode from './examples/without-new-sloppy.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - Binding: 선언문이 실행된 변수만 담는다(function-calls와 같은 관례). 함수 선언 Book은 보이지 않는다.
// - `changed: true`(Binding·Prop)와 `created: true`(ObjectBox)는 "그 단계에서" 새로 생기거나 값이 바뀐 항목에만 붙이고 다음 단계에서는 해제한다.
// - ObjectBox.role은 진행 중인 호출에서 그 객체가 맡은 역할이다. 'this'(this로 연결된 객체), 'result'(new 식의 결과), 'unused'(결과로 쓰이지 않음), 'global'(전역 객체).
//   호출이 끝난 뒤(invocation이 null인 단계)에는 'global'을 뺀 role을 해제한다.
// - 전역 객체('global')는 코드 실행 전부터 있으므로 created를 붙이지 않고, 예제가 만든 프로퍼티만 보여 준다.
// - Invocation은 지금 진행 중인 호출 하나다. mode 'new'는 5단계, 'call'(new 없는 호출)은 새 객체 생성 단계가 없는 4단계다.
//   이 단계는 명세 [[Construct]]·[[Call]]의 순서를 묶어 그린 교육용 단위다(엔진 내부 구현이 아니다).
// - Invocation.thisValue: 아직 정해지기 전은 null, 정해진 뒤는 객체 참조('undefined'는 this가 undefined로 정해진 경우).
// - Invocation.returned: 본문이 끝나는 방식('return' = return문을 만남, 'end' = return 없이 끝남)과 그 값. 아직이면 null.
// - Invocation.result: 호출 식 전체의 결과. 결과를 정하는 'result' 단계부터 채운다.

export type Val = { type: 'number' | 'string' | 'undefined' | 'null'; display: string } // string은 따옴표 없이

export type ObjectRef = { kind: 'object'; id: string }

export type Binding = {
  name: string
  declaredWith: 'const'
  value: Val | ObjectRef
  changed?: true
}

export type Param = { name: string; value: Val; from: 'argument' | 'missing' }

export type Prop = { key: string; value: Val; changed?: true }

export type ObjectBox = {
  id: string
  label: string // '객체 A', '전역 객체'
  props: Prop[]
  role?: 'this' | 'result' | 'unused' | 'global'
  created?: true
}

export const newStages = ['check', 'create', 'bind', 'body', 'result'] as const
export const callStages = ['check', 'bind', 'body', 'result'] as const
export type Stage = (typeof newStages)[number]

export type Invocation = {
  mode: 'new' | 'call'
  code: string // 호출 식 원문(예: "new Book('JS', 30)")
  callee: string
  args: Val[]
  params: Param[]
  stage: Stage
  thisValue: ObjectRef | 'undefined' | null
  returned: { value: Val | ObjectRef; how: 'return' | 'end' } | null
  result: Val | ObjectRef | null
}

export type NewState = {
  bindings: Binding[]
  objects: ObjectBox[]
  invocation: Invocation | null
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const undef: Val = { type: 'undefined', display: 'undefined' }

const ref = (id: string): ObjectRef => ({ kind: 'object', id })

const bind = (name: string, value: Val | ObjectRef, changed = false): Binding => ({
  name,
  declaredWith: 'const',
  value,
  ...(changed && { changed: true as const }),
})

const prop = (key: string, value: Val, changed = false): Prop => ({
  key,
  value,
  ...(changed && { changed: true as const }),
})

const box = (
  id: string,
  label: string,
  props: Prop[],
  opts: { role?: ObjectBox['role']; created?: boolean } = {},
): ObjectBox => ({
  id,
  label,
  props,
  ...(opts.role && { role: opts.role }),
  ...(opts.created && { created: true as const }),
})

const given = (name: string, value: Val): Param => ({ name, value, from: 'argument' })

const invoke = (
  mode: Invocation['mode'],
  code: string,
  args: Val[],
  params: Param[],
  stage: Stage,
  extra: Partial<Pick<Invocation, 'thisValue' | 'returned' | 'result'>> = {},
): Invocation => ({
  mode,
  code,
  callee: 'Book',
  args,
  params,
  stage,
  thisValue: null,
  returned: null,
  result: null,
  ...extra,
})

const at = (n: number): LineRange => ({ from: n, to: n })

type NewStep = Step<NewState>

const empty: NewState = { bindings: [], objects: [], invocation: null }

const intro =
  '코드를 실행하기 전입니다. 함수 선언만으로는 본문이 실행되지 않고, 호출할 때 본문이 실행됩니다. 이 시각화는 진행 중인 호출의 단계와, 선언문이 실행된 변수, 만들어진 객체를 보여 줍니다. 단계는 명세가 정한 순서를 묶어 그린 것입니다.'

const createNote = '새 객체의 프로토타입도 이때 정해지지만 별도 개념으로 다룹니다.'

// --- 시나리오 1: 같은 생성자로 객체 두 개 만들기 ------------------------------------------------

const basicA = (props: Prop[], opts: Parameters<typeof box>[3] = {}) =>
  box('a', '객체 A', props, opts)
const basicB = (props: Prop[], opts: Parameters<typeof box>[3] = {}) =>
  box('b', '객체 B', props, opts)

const titleJS = prop('title', str('JS'))
const price30 = prop('price', num(30))
const titleCSS = prop('title', str('CSS'))
const price20 = prop('price', num(20))

const newA = (stage: Stage, extra = {}) =>
  invoke(
    'new',
    "new Book('JS', 30)",
    [str('JS'), num(30)],
    stage === 'check' || stage === 'create'
      ? []
      : [given('title', str('JS')), given('price', num(30))],
    stage,
    extra,
  )
const newB = (stage: Stage, extra = {}) =>
  invoke(
    'new',
    "new Book('CSS', 20)",
    [str('CSS'), num(20)],
    stage === 'check' || stage === 'create'
      ? []
      : [given('title', str('CSS')), given('price', num(20))],
    stage,
    extra,
  )

const basicSteps: NewStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: "new Book('JS', 30): 인수 평가와 생성자 확인",
    explanation:
      "new 식은 먼저 Book을 평가하고, 인수 'JS'와 30을 왼쪽부터 평가해 인수 목록을 만듭니다. 그다음 Book이 생성자(constructor)인지 확인합니다. 함수 선언으로 만든 Book은 생성자라 통과합니다. 인수 평가가 이 확인보다 먼저입니다.",
    line: at(5),
    state: { bindings: [], objects: [], invocation: newA('check') },
    output: [],
  },
  {
    title: '새 객체 A를 만듦',
    explanation: `Book의 [[Construct]]가 실행되어 새 일반 객체가 만들어집니다. 이 객체를 객체 A라고 부르겠습니다. 본문이 실행되기 전이므로 A에는 아직 프로퍼티가 없습니다. ${createNote}`,
    line: at(5),
    state: { bindings: [], objects: [basicA([], { created: true })], invocation: newA('create') },
    output: [],
  },
  {
    title: 'this는 객체 A, 매개변수에 인수를 넣음',
    explanation:
      "본문을 실행하기 전에 this가 객체 A로 정해지고, 인수가 매개변수에 차례로 들어가 title은 'JS', price는 30이 됩니다.",
    line: at(1),
    state: {
      bindings: [],
      objects: [basicA([], { role: 'this' })],
      invocation: newA('bind', { thisValue: ref('a') }),
    },
    output: [],
  },
  {
    title: 'this.title = title: A에 title 추가',
    explanation:
      "this는 객체 A이므로 A에 title 프로퍼티가 생기고 값은 매개변수 title의 값 'JS'입니다.",
    line: at(2),
    state: {
      bindings: [],
      objects: [basicA([prop('title', str('JS'), true)], { role: 'this' })],
      invocation: newA('body', { thisValue: ref('a') }),
    },
    output: [],
  },
  {
    title: 'this.price = price: A에 price 추가',
    explanation: 'A에 price 프로퍼티가 생기고 값은 매개변수 price의 값 30입니다.',
    line: at(3),
    state: {
      bindings: [],
      objects: [basicA([titleJS, prop('price', num(30), true)], { role: 'this' })],
      invocation: newA('body', { thisValue: ref('a') }),
    },
    output: [],
  },
  {
    title: '본문이 끝남: 결과는 this 객체 A',
    explanation:
      '본문이 return 없이 끝났습니다. 본문이 객체를 return하지 않았으므로 new 식의 결과는 this로 연결했던 객체 A입니다.',
    line: at(4),
    state: {
      bindings: [],
      objects: [basicA([titleJS, price30], { role: 'result' })],
      invocation: newA('result', {
        thisValue: ref('a'),
        returned: { value: undef, how: 'end' },
        result: ref('a'),
      }),
    },
    output: [],
  },
  {
    title: 'const a = …: 변수 a에 객체 A',
    explanation: 'new 식의 결과인 객체 A가 변수 a의 값이 됩니다.',
    line: at(5),
    state: {
      bindings: [bind('a', ref('a'), true)],
      objects: [basicA([titleJS, price30])],
      invocation: null,
    },
    output: [],
  },
  {
    title: "new Book('CSS', 20): 인수 평가와 생성자 확인",
    explanation:
      "두 번째 new 식도 같은 순서로 시작합니다. 인수 'CSS'와 20을 평가한 뒤 Book이 생성자인지 확인하고, 통과합니다.",
    line: at(6),
    state: {
      bindings: [bind('a', ref('a'))],
      objects: [basicA([titleJS, price30])],
      invocation: newB('check'),
    },
    output: [],
  },
  {
    title: '새 객체 B를 만듦',
    explanation: `이번에도 [[Construct]]가 새 일반 객체를 만듭니다. 이 객체를 객체 B라고 부르겠습니다. 객체 A는 그대로이고 B에는 아직 프로퍼티가 없습니다. ${createNote}`,
    line: at(6),
    state: {
      bindings: [bind('a', ref('a'))],
      objects: [basicA([titleJS, price30]), basicB([], { created: true })],
      invocation: newB('create'),
    },
    output: [],
  },
  {
    title: 'this는 객체 B, 매개변수에 인수를 넣음',
    explanation:
      "이번에는 this가 객체 B로 정해지고, title은 'CSS', price는 20이 됩니다. 같은 함수를 호출했지만 this가 가리키는 객체가 다릅니다.",
    line: at(1),
    state: {
      bindings: [bind('a', ref('a'))],
      objects: [basicA([titleJS, price30]), basicB([], { role: 'this' })],
      invocation: newB('bind', { thisValue: ref('b') }),
    },
    output: [],
  },
  {
    title: 'this.title = title: B에 title 추가',
    explanation:
      "this는 객체 B이므로 B에 title 프로퍼티가 생기고 값은 'CSS'입니다. 객체 A는 바뀌지 않습니다.",
    line: at(2),
    state: {
      bindings: [bind('a', ref('a'))],
      objects: [
        basicA([titleJS, price30]),
        basicB([prop('title', str('CSS'), true)], { role: 'this' }),
      ],
      invocation: newB('body', { thisValue: ref('b') }),
    },
    output: [],
  },
  {
    title: 'this.price = price: B에 price 추가',
    explanation: 'B에 price 프로퍼티가 생기고 값은 20입니다.',
    line: at(3),
    state: {
      bindings: [bind('a', ref('a'))],
      objects: [
        basicA([titleJS, price30]),
        basicB([titleCSS, prop('price', num(20), true)], { role: 'this' }),
      ],
      invocation: newB('body', { thisValue: ref('b') }),
    },
    output: [],
  },
  {
    title: '본문이 끝남: 결과는 this 객체 B',
    explanation: '이번에도 return 없이 끝났으므로 new 식의 결과는 this로 연결했던 객체 B입니다.',
    line: at(4),
    state: {
      bindings: [bind('a', ref('a'))],
      objects: [basicA([titleJS, price30]), basicB([titleCSS, price20], { role: 'result' })],
      invocation: newB('result', {
        thisValue: ref('b'),
        returned: { value: undef, how: 'end' },
        result: ref('b'),
      }),
    },
    output: [],
  },
  {
    title: 'const b = …: 변수 b에 객체 B',
    explanation:
      'new 식의 결과인 객체 B가 변수 b의 값이 됩니다. 이제 a와 b의 값은 서로 다른 객체입니다.',
    line: at(6),
    state: {
      bindings: [bind('a', ref('a')), bind('b', ref('b'), true)],
      objects: [basicA([titleJS, price30]), basicB([titleCSS, price20])],
      invocation: null,
    },
    output: [],
  },
  {
    title: 'JSON.stringify(a) 출력',
    explanation: '객체 A를 JSON 문자열로 바꾸어 출력합니다. A에는 title과 price가 있습니다.',
    line: at(7),
    state: {
      bindings: [bind('a', ref('a')), bind('b', ref('b'))],
      objects: [basicA([titleJS, price30]), basicB([titleCSS, price20])],
      invocation: null,
    },
    output: ['{"title":"JS","price":30}'],
  },
  {
    title: 'JSON.stringify(b) 출력',
    explanation: '객체 B를 JSON 문자열로 바꾸어 출력합니다.',
    line: at(8),
    state: {
      bindings: [bind('a', ref('a')), bind('b', ref('b'))],
      objects: [basicA([titleJS, price30]), basicB([titleCSS, price20])],
      invocation: null,
    },
    output: ['{"title":"JS","price":30}', '{"title":"CSS","price":20}'],
  },
  {
    title: 'a === b: false',
    explanation:
      '=== 는 객체끼리 비교할 때 같은 객체인지를 봅니다. a의 값은 객체 A, b의 값은 객체 B로 서로 다른 객체이므로 false입니다.',
    line: at(9),
    state: {
      bindings: [bind('a', ref('a')), bind('b', ref('b'))],
      objects: [basicA([titleJS, price30]), basicB([titleCSS, price20])],
      invocation: null,
    },
    output: ['{"title":"JS","price":30}', '{"title":"CSS","price":20}', 'false'],
  },
]

// --- 시나리오 2·3: 생성자가 return할 때 (객체 / 원시 값) -----------------------------------------

const bookCall = (stage: Stage, extra = {}) =>
  invoke(
    'new',
    "new Book('JS')",
    [str('JS')],
    stage === 'check' || stage === 'create' ? [] : [given('title', str('JS'))],
    stage,
    extra,
  )

const objA = (props: Prop[], opts: Parameters<typeof box>[3] = {}) =>
  box('a', '객체 A', props, opts)
const objB = (props: Prop[], opts: Parameters<typeof box>[3] = {}) =>
  box('b', '객체 B', props, opts)

// 두 시나리오가 같은 앞부분(검사·생성·this 연결·this.title 대입)을 쓴다.
const returnHead = (): NewStep[] => [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: "new Book('JS'): 인수 평가와 생성자 확인",
    explanation:
      "new 식은 Book과 인수 'JS'를 평가한 뒤, Book이 생성자인지 확인합니다. 함수 선언으로 만든 Book은 생성자라 통과합니다.",
    line: at(5),
    state: { bindings: [], objects: [], invocation: bookCall('check') },
    output: [],
  },
  {
    title: '새 객체 A를 만듦',
    explanation: `본문을 실행하기 전에 [[Construct]]가 새 일반 객체를 만듭니다. 이 객체를 객체 A라고 부르겠습니다. ${createNote}`,
    line: at(5),
    state: { bindings: [], objects: [objA([], { created: true })], invocation: bookCall('create') },
    output: [],
  },
  {
    title: 'this는 객체 A, 매개변수 title은 JS',
    explanation: "this가 객체 A로 정해지고, 매개변수 title에 인수 'JS'가 들어갑니다.",
    line: at(1),
    state: {
      bindings: [],
      objects: [objA([], { role: 'this' })],
      invocation: bookCall('bind', { thisValue: ref('a') }),
    },
    output: [],
  },
  {
    title: 'this.title = title: A에 title 추가',
    explanation: "this는 객체 A이므로 A에 title 프로퍼티가 생기고 값은 'JS'입니다.",
    line: at(2),
    state: {
      bindings: [],
      objects: [objA([prop('title', str('JS'), true)], { role: 'this' })],
      invocation: bookCall('body', { thisValue: ref('a') }),
    },
    output: [],
  },
]

const aJS = [prop('title', str('JS'))]
const bOther = [prop('title', str('other'), false)]

const returnObjectSteps: NewStep[] = [
  ...returnHead(),
  {
    title: "return { title: 'other' }: 새 객체 B를 return",
    explanation:
      "객체 리터럴 { title: 'other' }가 평가되어 새 객체 B가 만들어지고, return이 이 객체 B를 돌려주며 본문이 끝납니다. 객체 A는 아직 this로 연결된 채 그대로 있습니다.",
    line: at(3),
    state: {
      bindings: [],
      objects: [
        objA(aJS, { role: 'this' }),
        objB([prop('title', str('other'), true)], { created: true }),
      ],
      invocation: bookCall('body', {
        thisValue: ref('a'),
        returned: { value: ref('b'), how: 'return' },
      }),
    },
    output: [],
  },
  {
    title: '결과 결정: return한 객체 B가 결과',
    explanation:
      '본문이 객체를 return했으므로 new 식의 결과는 return한 객체 B입니다. this로 연결했던 객체 A는 new 식의 결과로 쓰이지 않습니다.',
    line: at(3),
    state: {
      bindings: [],
      objects: [objA(aJS, { role: 'unused' }), objB(bOther, { role: 'result' })],
      invocation: bookCall('result', {
        thisValue: ref('a'),
        returned: { value: ref('b'), how: 'return' },
        result: ref('b'),
      }),
    },
    output: [],
  },
  {
    title: 'const book = …: 변수 book에 객체 B',
    explanation:
      'new 식의 결과인 객체 B가 변수 book의 값이 됩니다. 객체 A는 이 변수의 값이 아니며 이 코드에서 더 쓰이지 않습니다.',
    line: at(5),
    state: {
      bindings: [bind('book', ref('b'), true)],
      objects: [objA(aJS), objB(bOther)],
      invocation: null,
    },
    output: [],
  },
  {
    title: 'JSON.stringify(book) 출력',
    explanation:
      "book의 값은 객체 B이므로 B의 title인 'other'가 출력됩니다. this.title에 'JS'를 넣었지만 그것은 객체 A의 프로퍼티입니다.",
    line: at(6),
    state: {
      bindings: [bind('book', ref('b'))],
      objects: [objA(aJS), objB(bOther)],
      invocation: null,
    },
    output: ['{"title":"other"}'],
  },
]

const returnPrimitiveSteps: NewStep[] = [
  ...returnHead(),
  {
    title: 'return 100: 숫자 100을 return',
    explanation:
      '숫자 100을 return하며 본문이 끝납니다. 100은 객체가 아니라 원시 값입니다. 객체 A는 그대로 this로 연결되어 있습니다.',
    line: at(3),
    state: {
      bindings: [],
      objects: [objA(aJS, { role: 'this' })],
      invocation: bookCall('body', {
        thisValue: ref('a'),
        returned: { value: num(100), how: 'return' },
      }),
    },
    output: [],
  },
  {
    title: '결과 결정: 100은 무시하고 this 객체 A가 결과',
    explanation:
      'return한 값이 객체가 아니므로 그 값은 쓰이지 않고, new 식의 결과는 this로 연결했던 객체 A입니다. 원시 값을 return해도 오류는 나지 않습니다.',
    line: at(3),
    state: {
      bindings: [],
      objects: [objA(aJS, { role: 'result' })],
      invocation: bookCall('result', {
        thisValue: ref('a'),
        returned: { value: num(100), how: 'return' },
        result: ref('a'),
      }),
    },
    output: [],
  },
  {
    title: 'const book = …: 변수 book에 객체 A',
    explanation:
      'new 식의 결과인 객체 A가 변수 book의 값이 됩니다. 숫자 100은 book에 들어가지 않습니다.',
    line: at(5),
    state: {
      bindings: [bind('book', ref('a'), true)],
      objects: [objA(aJS)],
      invocation: null,
    },
    output: [],
  },
  {
    title: 'JSON.stringify(book) 출력',
    explanation: "book의 값은 객체 A이므로 A의 title인 'JS'가 출력됩니다.",
    line: at(6),
    state: {
      bindings: [bind('book', ref('a'))],
      objects: [objA(aJS)],
      invocation: null,
    },
    output: ['{"title":"JS"}'],
  },
]

// --- 시나리오 4: new 없이 호출하기 (sloppy mode) ---------------------------------------------------

const plainCall = (stage: Stage, extra = {}) =>
  invoke(
    'call',
    "Book('JS')",
    [str('JS')],
    stage === 'check' ? [] : [given('title', str('JS'))],
    stage,
    extra,
  )

const globalBox = (props: Prop[]) => box('global', '전역 객체', props, { role: 'global' })

const globalTitle = [prop('title', str('JS'))]

const globalIntro = `${intro} 전역 객체는 코드를 실행하기 전부터 있고, 이 시각화는 예제가 추가하는 프로퍼티만 전역 객체 카드에 보여 줍니다.`

const withoutNewSteps: NewStep[] = [
  {
    title: '실행 전',
    explanation: globalIntro,
    state: { bindings: [], objects: [globalBox([])], invocation: null },
    output: [],
  },
  {
    title: "Book('JS'): 인수 평가 (new 없는 호출)",
    explanation:
      "new 없이 호출하면 인수 'JS'를 평가해 함수를 호출합니다. 이것은 [[Construct]]가 아니라 [[Call]]입니다. 그래서 새 객체를 만드는 단계가 없습니다. 목록의 단계가 new 호출보다 하나 적은 이유입니다.",
    line: at(4),
    state: { bindings: [], objects: [globalBox([])], invocation: plainCall('check') },
    output: [],
  },
  {
    title: 'this는 전역 객체, 매개변수 title은 JS',
    explanation:
      "프로퍼티 참조가 아닌 호출 Book('JS')은 this 값으로 undefined를 넘깁니다. 그런데 이 예제는 strict mode가 아닌 코드라서, 함수가 undefined인 this를 전역 객체로 바꿉니다. 그래서 this는 전역 객체입니다. 이 시각화는 예제가 만든 프로퍼티만 전역 객체에 보여 줍니다.",
    line: at(1),
    state: {
      bindings: [],
      objects: [globalBox([])],
      invocation: plainCall('bind', { thisValue: ref('global') }),
    },
    output: [],
  },
  {
    title: 'this.title = title: 전역 객체에 title 추가',
    explanation: "this가 전역 객체이므로 전역 객체에 title 프로퍼티가 생기고 값은 'JS'입니다.",
    line: at(2),
    state: {
      bindings: [],
      objects: [globalBox([prop('title', str('JS'), true)])],
      invocation: plainCall('body', { thisValue: ref('global') }),
    },
    output: [],
  },
  {
    title: '본문이 끝남: 결과는 undefined',
    explanation:
      '본문이 return 없이 끝났습니다. new 호출이 아니라서 this를 결과로 돌려주는 규칙이 없고, 호출의 결과는 undefined입니다.',
    line: at(3),
    state: {
      bindings: [],
      objects: [globalBox(globalTitle)],
      invocation: plainCall('result', {
        thisValue: ref('global'),
        returned: { value: undef, how: 'end' },
        result: undef,
      }),
    },
    output: [],
  },
  {
    title: 'const book = …: 변수 book은 undefined',
    explanation: '호출의 결과 undefined가 변수 book의 값이 됩니다. 객체가 아닙니다.',
    line: at(4),
    state: {
      bindings: [bind('book', undef, true)],
      objects: [globalBox(globalTitle)],
      invocation: null,
    },
    output: [],
  },
  {
    title: 'console.log(book): undefined 출력',
    explanation: 'book의 값은 undefined이므로 undefined가 출력됩니다.',
    line: at(5),
    state: {
      bindings: [bind('book', undef)],
      objects: [globalBox(globalTitle)],
      invocation: null,
    },
    output: ['undefined'],
  },
  {
    title: 'console.log(title): JS 출력',
    explanation:
      "title이라는 이름은 선언된 적이 없지만 전역 객체에 title 프로퍼티가 있어 전역 변수처럼 읽힙니다. 값은 'JS'입니다. 이 동작은 전역 객체 프로퍼티와 식별자 해석에 따른 것으로, 이 페이지에서는 결과만 확인합니다.",
    line: at(6),
    state: {
      bindings: [bind('book', undef)],
      objects: [globalBox(globalTitle)],
      invocation: null,
    },
    output: ['undefined', 'JS'],
  },
]

export const scenarios: Scenario<NewState>[] = [
  {
    id: 'basic',
    label: '객체 두 개 만들기',
    exampleId: 'basic',
    code: basicCode,
    steps: basicSteps,
  },
  {
    id: 'return-object',
    label: '객체를 return하면',
    exampleId: 'return-object',
    code: returnObjectCode,
    steps: returnObjectSteps,
  },
  {
    id: 'return-primitive',
    label: '원시 값을 return하면',
    exampleId: 'return-primitive',
    code: returnPrimitiveCode,
    steps: returnPrimitiveSteps,
  },
  {
    id: 'without-new-sloppy',
    label: 'new 없이 호출하면',
    exampleId: 'without-new-sloppy',
    code: withoutNewSloppyCode,
    steps: withoutNewSteps,
  },
]
