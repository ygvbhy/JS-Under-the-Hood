import type { LineRange, Scenario, Step } from '~/simulator/types'
import chainCode from './examples/chain.js?raw'
import instanceofCode from './examples/instanceof.js?raw'
import prototypePropertyCode from './examples/prototype-property.js?raw'
import shadowingCode from './examples/shadowing.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - objects는 지금 화면에 있는 객체 카드다. 카드의 proto가 그 객체의 [[Prototype]](내부 슬롯)이고,
//   함수의 `prototype`은 props에 있는 평범한 프로퍼티다. 두 가지는 서로 다른 칸에 그린다.
// - Binding은 이름이 이미 만들어진 변수만 담는다. const 변수는 선언문이 실행된 뒤부터, 함수 선언은 0단계부터 있다
//   (함수 선언은 코드를 실행하기 전에 함수 객체와 그 prototype 객체가 만들어진다).
// - `changed`(Binding·Prop), `created`·`protoChanged`(ObjectCard)는 "그 단계에서" 새로 생기거나 바뀐 항목에만 붙이고 다음 단계에서는 해제한다.
//   `protoChanged`는 새로 만든 카드이거나 [[Prototype]]이 바뀐 카드에 붙는다. 0단계에는 어떤 표시도 없다.
// - 내장 객체(Object.prototype, Function.prototype)는 builtin이고 예제에 필요한 프로퍼티만 보여 준다(omittedNote).
//   instanceof 시나리오의 Book 함수는 [[Prototype]]인 Function.prototype 카드를 그리지 않고 omitted로 표시한다.
// - lookup은 그 단계의 프로퍼티 탐색(get·set)이나 instanceof 비교 경로다. 탐색이 없는 단계는 null이다.
//   set은 "대입 직전" 체인에서의 탐색 경로를 보여 준다(대입 뒤에는 시작 객체에 자기 프로퍼티가 생기므로).
// - 이 그림은 명세가 정한 동작(OrdinaryGet·OrdinarySet·OrdinaryHasInstance)을 따라가는 교육용 표현이다. 엔진 내부 메모리 구조가 아니다.

export type Val = {
  type: 'string' | 'number' | 'boolean' | 'undefined' | 'null'
  display: string // 문자열은 작은따옴표 포함: "'book'"
}

export type Ref = { kind: 'ref'; id: string } // 카드 객체를 가리킨다

export type Prop = {
  key: string
  value: Val | Ref
  note?: 'readonly' | 'setter' | 'hidden' // 쓰기 불가 / setter / 열거 불가
  changed?: 'created' | 'updated'
}

export type Proto =
  { kind: 'ref'; id: string } | { kind: 'null' } | { kind: 'omitted'; label: 'Function.prototype' } // 카드를 그리지 않고 이름만 표시

export type ObjectCard = {
  id: string
  label: string
  props: Prop[]
  proto: Proto
  builtin?: true
  omittedNote?: string // 화면에 두지 않은 다른 프로퍼티가 있다는 안내
  created?: true
  protoChanged?: true
}

export type Binding = {
  name: string
  declaredWith: 'const' | 'function'
  value: Ref | Val
  changed?: true
}

export type Lookup =
  | {
      kind: 'get' | 'set'
      key: string
      startId: string
      path: { id: string; found: boolean }[] // 시작 객체부터 처음 찾은 곳까지(못 찾으면 [[Prototype]]이 null인 끝까지)
      end: 'found' | 'null'
      outcome: string
    }
  | {
      kind: 'instanceof'
      startId: string
      targetId: string // 비교 대상(생성자의 prototype 값) 카드
      path: { id: string; match: boolean }[] // 시작 객체의 [[Prototype]]부터
      end: 'match' | 'null'
      outcome: 'true' | 'false'
    }

export type ProtoState = {
  bindings: Binding[]
  objects: ObjectCard[]
  lookup: Lookup | null
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string): Val => ({ type: 'string', display: `'${s}'` })

const ref = (id: string): Ref => ({ kind: 'ref', id })
const toRef = (id: string): Proto => ({ kind: 'ref', id })
const NULL: Proto = { kind: 'null' }
const OMITTED_FUNCTION_PROTO: Proto = { kind: 'omitted', label: 'Function.prototype' }

const prop = (
  key: string,
  value: Val | Ref,
  opts: { note?: Prop['note']; changed?: Prop['changed'] } = {},
): Prop => ({
  key,
  value,
  ...(opts.note && { note: opts.note }),
  ...(opts.changed && { changed: opts.changed }),
})

const card = (
  id: string,
  label: string,
  props: Prop[],
  proto: Proto,
  opts: {
    builtin?: boolean
    omittedNote?: string
    created?: boolean
    protoChanged?: boolean
  } = {},
): ObjectCard => ({
  id,
  label,
  props,
  proto,
  ...(opts.builtin && { builtin: true as const }),
  ...(opts.omittedNote && { omittedNote: opts.omittedNote }),
  ...(opts.created && { created: true as const }),
  ...(opts.protoChanged && { protoChanged: true as const }),
})

const bind = (
  name: string,
  value: Ref | Val,
  opts: { declaredWith?: Binding['declaredWith']; changed?: boolean } = {},
): Binding => ({
  name,
  declaredWith: opts.declaredWith ?? 'const',
  value,
  ...(opts.changed && { changed: true as const }),
})

// 새로 만든 객체 카드: created와 protoChanged를 함께 붙인다.
const fresh = { created: true, protoChanged: true }

const OBJ_PROTO_NOTE = 'toString·hasOwnProperty 등 다른 프로퍼티 생략'
const FUNC_PROTO_NOTE = 'call·apply·bind 등 다른 프로퍼티 생략'
const FUNC_NOTE = 'length·name 등 다른 프로퍼티 생략'

const OBJ = 'Object.prototype'
const FUNC = 'Function.prototype'

const objectPrototype = (): ObjectCard =>
  card(OBJ, 'Object.prototype', [], NULL, { builtin: true, omittedNote: OBJ_PROTO_NOTE })

const functionPrototype = (): ObjectCard =>
  card(FUNC, 'Function.prototype', [], toRef(OBJ), { builtin: true, omittedNote: FUNC_PROTO_NOTE })

const at = (n: number): LineRange => ({ from: n, to: n })

const getLook = (
  key: string,
  startId: string,
  ids: string[],
  end: 'found' | 'null',
  outcome: string,
): Lookup => ({
  kind: 'get',
  key,
  startId,
  path: ids.map((id, i) => ({ id, found: end === 'found' && i === ids.length - 1 })),
  end,
  outcome,
})

type ProtoStep = Step<ProtoState>

const chainIntro =
  '코드를 실행하기 전입니다. 이 시각화는 변수, 객체, 객체의 [[Prototype]](내부 슬롯), 프로퍼티를 읽을 때 따라가는 탐색 경로를 보여 줍니다. Object.prototype은 객체 리터럴로 만든 객체의 [[Prototype]]이 되는 내장 객체이고, 이 예제에 필요 없는 프로퍼티는 생략했습니다. Object.prototype의 [[Prototype]]은 null이라 체인은 거기서 끝납니다.'

// --- 시나리오 1: 프로토타입 체인 -----------------------------------------------------------------

const baseKind = (isNew = false) => prop('kind', str('book'), isNew ? { changed: 'created' } : {})
const chainBase = (isNew = false) =>
  card('base', '객체 base', [baseKind(isNew)], toRef(OBJ), isNew ? fresh : {})
const chainMid = (lang: boolean, langNew = false, isNew = false) =>
  card(
    'mid',
    '객체 mid',
    lang ? [prop('lang', str('ko'), langNew ? { changed: 'created' } : {})] : [],
    toRef('base'),
    isNew ? fresh : {},
  )
const chainItem = (title: boolean, titleNew = false, isNew = false) =>
  card(
    'item',
    '객체 item',
    title ? [prop('title', str('JS'), titleNew ? { changed: 'created' } : {})] : [],
    toRef('mid'),
    isNew ? fresh : {},
  )

const cs = (
  bindings: Binding[],
  objects: ObjectCard[],
  lookup: Lookup | null = null,
): ProtoState => ({ bindings, objects, lookup })

const chainBaseB = (changed = false) => bind('base', ref('base'), { changed })
const chainMidB = (changed = false) => bind('mid', ref('mid'), { changed })
const chainItemB = (changed = false) => bind('item', ref('item'), { changed })

const chainSteps: ProtoStep[] = [
  {
    title: '실행 전',
    explanation: chainIntro,
    state: cs([], [objectPrototype()]),
    output: [],
  },
  {
    title: "const base = { kind: 'book' }",
    explanation:
      "객체 리터럴이 새 객체를 만듭니다. 이 객체의 [[Prototype]]은 Object.prototype이고, 자기 프로퍼티 kind의 값은 'book'입니다. 변수 base가 이 객체를 가리킵니다.",
    line: at(1),
    state: cs([chainBaseB(true)], [chainBase(true), objectPrototype()]),
    output: [],
  },
  {
    title: 'const mid = Object.create(base)',
    explanation:
      'Object.create(base)는 [[Prototype]]이 base인 새 객체를 만듭니다. mid에는 자기 프로퍼티가 아직 없습니다.',
    line: at(2),
    state: cs(
      [chainBaseB(), chainMidB(true)],
      [chainBase(), chainMid(false, false, true), objectPrototype()],
    ),
    output: [],
  },
  {
    title: "mid.lang = 'ko'",
    explanation:
      'mid에 자기 프로퍼티 lang이 생깁니다. 프로퍼티를 대입할 때 체인을 확인하는 규칙은 "대입과 섀도잉" 시나리오에서 자세히 봅니다. 여기서는 mid의 자기 프로퍼티가 생겼다는 것만 확인합니다.',
    line: at(3),
    state: cs([chainBaseB(), chainMidB()], [chainBase(), chainMid(true, true), objectPrototype()]),
    output: [],
  },
  {
    title: 'const item = Object.create(mid)',
    explanation:
      'item은 [[Prototype]]이 mid인 새 객체입니다. 이제 item → mid → base → Object.prototype → null로 이어지는 체인이 만들어졌습니다.',
    line: at(4),
    state: cs(
      [chainBaseB(), chainMidB(), chainItemB(true)],
      [chainBase(), chainMid(true), chainItem(false, false, true), objectPrototype()],
    ),
    output: [],
  },
  {
    title: "item.title = 'JS'",
    explanation: 'item에 자기 프로퍼티 title이 생깁니다. mid와 base는 바뀌지 않습니다.',
    line: at(5),
    state: cs(
      [chainBaseB(), chainMidB(), chainItemB()],
      [chainBase(), chainMid(true), chainItem(true, true), objectPrototype()],
    ),
    output: [],
  },
]

const chainFull = (
  lookup: Lookup | null,
): Pick<ProtoState, 'bindings' | 'objects'> & {
  lookup: Lookup | null
} => ({
  bindings: [chainBaseB(), chainMidB(), chainItemB()],
  objects: [chainBase(), chainMid(true), chainItem(true), objectPrototype()],
  lookup,
})

chainSteps.push(
  {
    title: 'item.title 읽기',
    explanation:
      "프로퍼티를 읽으면 먼저 item의 자기 프로퍼티에서 title을 찾습니다. item에 있으므로 [[Prototype]]을 따라가지 않고 'JS'를 읽습니다.",
    line: at(6),
    state: chainFull(getLook('title', 'item', ['item'], 'found', "'JS'를 읽음")),
    output: ['JS'],
  },
  {
    title: 'item.lang 읽기',
    explanation:
      "item에는 자기 프로퍼티 lang이 없습니다. 그러면 item의 [[Prototype]]이 가리키는 mid에서 이어서 찾습니다. mid에 있으므로 거기서 멈추고 'ko'를 읽습니다.",
    line: at(7),
    state: chainFull(getLook('lang', 'item', ['item', 'mid'], 'found', "'ko'를 읽음")),
    output: ['JS', 'ko'],
  },
  {
    title: 'item.kind 읽기',
    explanation:
      "item과 mid에는 kind가 없어서 [[Prototype]]을 두 번 따라가 base에서 찾습니다. 값은 'book'입니다.",
    line: at(8),
    state: chainFull(getLook('kind', 'item', ['item', 'mid', 'base'], 'found', "'book'을 읽음")),
    output: ['JS', 'ko', 'book'],
  },
  {
    title: 'item.price 읽기',
    explanation:
      'item, mid, base, Object.prototype 어디에도 price가 없습니다. Object.prototype의 [[Prototype]]은 null이라 더 따라갈 곳이 없으므로 결과는 undefined입니다. 오류가 아니라 undefined를 돌려줍니다.',
    line: at(9),
    state: chainFull(getLook('price', 'item', ['item', 'mid', 'base', OBJ], 'null', 'undefined')),
    output: ['JS', 'ko', 'book', 'undefined'],
  },
)

// --- 시나리오 2: 함수의 prototype 프로퍼티와 객체의 [[Prototype]] --------------------------------

const BOOK = 'Book'
const BOOK_PROTO = 'bookProto'

const bookFn = (protoRef: string, protoChanged?: Prop['changed']): ObjectCard =>
  card(
    BOOK,
    'Book 함수',
    [prop('prototype', ref(protoRef), { note: 'hidden', changed: protoChanged })],
    toRef(FUNC),
    { omittedNote: FUNC_NOTE },
  )

const bookProto = (kind: boolean, kindNew = false): ObjectCard =>
  card(
    BOOK_PROTO,
    'Book.prototype',
    [
      prop('constructor', ref(BOOK), { note: 'hidden' }),
      ...(kind ? [prop('kind', str('book'), kindNew ? { changed: 'created' as const } : {})] : []),
    ],
    toRef(OBJ),
  )

const objA = (isNew = false): ObjectCard =>
  card(
    'a',
    '객체 a',
    [prop('title', str('JS'), isNew ? { changed: 'created' } : {})],
    toRef(BOOK_PROTO),
    isNew ? fresh : {},
  )

const bookB = (changed = false) => bind(BOOK, ref(BOOK), { declaredWith: 'function', changed })
const bindA = (changed = false) => bind('a', ref('a'), { changed })

const ppBaseObjects = (kind: boolean, kindNew = false): ObjectCard[] => [
  bookFn(BOOK_PROTO),
  bookProto(kind, kindNew),
  functionPrototype(),
  objectPrototype(),
]

const ppAfterNew = (lookup: Lookup | null): ProtoState => ({
  bindings: [bookB(), bindA()],
  objects: [bookFn(BOOK_PROTO), bookProto(true), objA(), functionPrototype(), objectPrototype()],
  lookup,
})

const ppSteps: ProtoStep[] = [
  {
    title: '실행 전',
    explanation:
      '코드를 실행하기 전입니다. 함수 선언은 실행 전에 처리되어 Book 함수 객체가 이미 있습니다. 함수 객체에는 prototype이라는 자기 프로퍼티가 있고, 그 값은 constructor 프로퍼티가 Book을 가리키는 객체(Book.prototype)입니다. 함수 객체 자신의 [[Prototype]]은 Function.prototype이고, Book.prototype의 [[Prototype]]은 Object.prototype입니다. 이 둘은 서로 다른 것입니다.',
    state: {
      bindings: [bookB()],
      objects: ppBaseObjects(false),
      lookup: null,
    },
    output: [],
  },
  {
    title: "Book.prototype.kind = 'book'",
    explanation:
      "Book.prototype은 Book의 자기 프로퍼티 prototype을 읽은 값, 즉 Book.prototype 객체입니다. 이 객체에 자기 프로퍼티 kind가 생기고 값은 'book'입니다.",
    line: at(4),
    state: {
      bindings: [bookB()],
      objects: ppBaseObjects(true, true),
      lookup: null,
    },
    output: [],
  },
  {
    title: "const a = new Book('JS')",
    explanation:
      'new 식이 새 객체를 만들고, 그 객체의 [[Prototype]]을 Book의 prototype 프로퍼티 값(Book.prototype 객체)으로 정한 뒤 본문을 실행해 title을 추가합니다. 변수 a가 이 객체를 가리킵니다. 이 줄의 단계는 한 번에 묶어 그렸고, 세부 순서는 new 연산자 개념에서 다룹니다.',
    line: at(5),
    state: {
      bindings: [bookB(), bindA(true)],
      objects: [
        bookFn(BOOK_PROTO),
        bookProto(true),
        objA(true),
        functionPrototype(),
        objectPrototype(),
      ],
      lookup: null,
    },
    output: [],
  },
  {
    title: 'a의 [[Prototype]]과 Book.prototype 비교',
    explanation:
      'Object.getPrototypeOf(a)는 a의 [[Prototype]]을 읽습니다. 그 값은 new가 정해 준 Book.prototype 객체이므로 === 비교 결과는 true입니다.',
    line: at(6),
    state: ppAfterNew(null),
    output: ['true'],
  },
  {
    title: 'Book의 [[Prototype]]과 Book.prototype 비교',
    explanation:
      'Book 함수 객체 자신의 [[Prototype]]은 Function.prototype입니다. Book의 prototype 프로퍼티가 가리키는 Book.prototype과는 다른 객체이므로 결과는 false입니다.',
    line: at(7),
    state: ppAfterNew(null),
    output: ['true', 'false'],
  },
  {
    title: 'Book의 [[Prototype]]과 Function.prototype 비교',
    explanation:
      'Book의 [[Prototype]]은 Function.prototype 객체이므로 결과는 true입니다. 함수의 prototype 프로퍼티는 "이 함수로 만들 객체의 [[Prototype]]이 될 값"이고, 함수 자신의 [[Prototype]]과는 별개입니다.',
    line: at(8),
    state: ppAfterNew(null),
    output: ['true', 'false', 'true'],
  },
  {
    title: 'a.kind 읽기',
    explanation:
      "a에는 자기 프로퍼티 kind가 없으므로 a의 [[Prototype]]인 Book.prototype에서 이어서 찾습니다. 거기에 있으므로 'book'을 읽습니다.",
    line: at(9),
    state: ppAfterNew(getLook('kind', 'a', ['a', BOOK_PROTO], 'found', "'book'을 읽음")),
    output: ['true', 'false', 'true', 'book'],
  },
  {
    title: 'a.prototype 읽기',
    explanation:
      'prototype은 함수 객체 Book의 자기 프로퍼티입니다. a, Book.prototype, Object.prototype 어디에도 prototype이라는 프로퍼티가 없고 체인이 null에서 끝나므로 결과는 undefined입니다. prototype 프로퍼티는 Book 함수 객체의 자기 프로퍼티일 뿐, a에는 없습니다.',
    line: at(10),
    state: ppAfterNew(getLook('prototype', 'a', ['a', BOOK_PROTO, OBJ], 'null', 'undefined')),
    output: ['true', 'false', 'true', 'book', 'undefined'],
  },
  {
    title: 'Book.prototype.constructor와 Book 비교',
    explanation:
      'Book.prototype 객체의 constructor 프로퍼티는 Book 함수를 가리킵니다. 그래서 === 비교 결과는 true이고, 함수와 prototype 객체가 서로를 가리키는 모양이 됩니다.',
    line: at(11),
    state: ppAfterNew(null),
    output: ['true', 'false', 'true', 'book', 'undefined', 'true'],
  },
]

// --- 시나리오 3: 섀도잉 --------------------------------------------------------------------------

const shBase = (isNew = false): ObjectCard =>
  card(
    'base',
    '객체 base',
    [prop('color', str('red'), isNew ? { changed: 'created' } : {})],
    toRef(OBJ),
    isNew ? fresh : {},
  )
const shItem = (color: 'none' | 'created' | 'kept', isNew = false): ObjectCard =>
  card(
    'item',
    '객체 item',
    color === 'none'
      ? []
      : [prop('color', str('blue'), color === 'created' ? { changed: 'created' } : {})],
    toRef('base'),
    isNew ? fresh : {},
  )

const shState = (
  withItem: 'no' | 'new' | 'yes',
  color: 'none' | 'created' | 'kept',
  lookup: Lookup | null,
): ProtoState => ({
  bindings: [
    bind('base', ref('base')),
    ...(withItem === 'no' ? [] : [bind('item', ref('item'), { changed: withItem === 'new' })]),
  ],
  objects: [
    shBase(),
    ...(withItem === 'no' ? [] : [shItem(color, withItem === 'new')]),
    objectPrototype(),
  ],
  lookup,
})

const shSteps: ProtoStep[] = [
  {
    title: '실행 전',
    explanation:
      '코드를 실행하기 전입니다. 이 시각화는 변수, 객체, [[Prototype]], 프로퍼티를 읽거나 대입할 때 따라가는 탐색 경로를 보여 줍니다. Object.prototype의 다른 프로퍼티는 이 예제에 필요 없어 생략했습니다.',
    state: { bindings: [], objects: [objectPrototype()], lookup: null },
    output: [],
  },
  {
    title: "const base = { color: 'red' }",
    explanation:
      "객체 리터럴이 새 객체를 만듭니다. [[Prototype]]은 Object.prototype이고 자기 프로퍼티 color의 값은 'red'입니다.",
    line: at(1),
    state: {
      bindings: [bind('base', ref('base'), { changed: true })],
      objects: [shBase(true), objectPrototype()],
      lookup: null,
    },
    output: [],
  },
  {
    title: 'const item = Object.create(base)',
    explanation: 'item은 [[Prototype]]이 base인 새 객체입니다. item에는 자기 프로퍼티가 없습니다.',
    line: at(2),
    state: {
      bindings: [bind('base', ref('base')), bind('item', ref('item'), { changed: true })],
      objects: [shBase(), shItem('none', true), objectPrototype()],
      lookup: null,
    },
    output: [],
  },
  {
    title: 'item.color 읽기',
    explanation:
      "item에는 자기 프로퍼티 color가 없어서 [[Prototype]]인 base에서 이어 찾습니다. base에 있으므로 'red'를 읽습니다.",
    line: at(3),
    state: shState(
      'yes',
      'none',
      getLook('color', 'item', ['item', 'base'], 'found', "'red'를 읽음"),
    ),
    output: ['red'],
  },
  {
    title: "item.color = 'blue' 대입",
    explanation:
      "대입도 먼저 item에서 color를 찾습니다. item에는 없어서 체인의 base까지 올라가 확인하니, base의 color는 쓰기 가능한 데이터 프로퍼티입니다. 이 경우 값을 바꾸는 대상은 base가 아니라 대입한 객체(item)이고, item에 자기 프로퍼티 color를 새로 만들어 'blue'를 넣습니다. base의 color는 그대로 'red'입니다. 그림의 탐색 경로는 대입 직전의 확인 경로입니다.",
    line: at(4),
    state: shState('yes', 'created', {
      kind: 'set',
      key: 'color',
      startId: 'item',
      path: [
        { id: 'item', found: false },
        { id: 'base', found: true },
      ],
      end: 'found',
      outcome: 'item에 자기 프로퍼티 color를 만듦',
    }),
    output: ['red'],
  },
  {
    title: 'item.color 읽기',
    explanation:
      "이번에는 item에 자기 프로퍼티 color가 있습니다. 자기 프로퍼티를 먼저 확인하므로 [[Prototype]]을 따라가지 않고 'blue'를 읽습니다. base의 color는 가려져(섀도잉) 읽히지 않을 뿐 없어진 것이 아닙니다.",
    line: at(5),
    state: shState('yes', 'kept', getLook('color', 'item', ['item'], 'found', "'blue'를 읽음")),
    output: ['red', 'blue'],
  },
  {
    title: 'base.color 읽기',
    explanation:
      "base의 자기 프로퍼티 color는 대입 뒤에도 'red'입니다. 대입은 base를 바꾸지 않고 item에 프로퍼티를 만들었기 때문입니다.",
    line: at(6),
    state: shState('yes', 'kept', getLook('color', 'base', ['base'], 'found', "'red'를 읽음")),
    output: ['red', 'blue', 'red'],
  },
  {
    title: "Object.hasOwn(item, 'color')",
    explanation:
      'Object.hasOwn은 체인을 따라가지 않고 객체의 자기 프로퍼티만 확인합니다. item에 자기 프로퍼티 color가 있으므로 true입니다. 이 단계에는 [[Prototype]]을 따라가는 탐색이 없습니다.',
    line: at(7),
    state: shState('yes', 'kept', null),
    output: ['red', 'blue', 'red', 'true'],
  },
  {
    title: 'delete item.color',
    explanation:
      'delete는 item의 자기 프로퍼티 color만 지웁니다. base의 color는 건드리지 않습니다.',
    line: at(8),
    state: shState('yes', 'none', null),
    output: ['red', 'blue', 'red', 'true'],
  },
  {
    title: 'item.color 읽기',
    explanation:
      "item의 자기 프로퍼티가 없어졌으므로 다시 [[Prototype]]인 base에서 찾아 'red'를 읽습니다.",
    line: at(9),
    state: shState(
      'yes',
      'none',
      getLook('color', 'item', ['item', 'base'], 'found', "'red'를 읽음"),
    ),
    output: ['red', 'blue', 'red', 'true', 'red'],
  },
]

// --- 시나리오 4: instanceof ----------------------------------------------------------------------

const P1 = 'proto1'
const P2 = 'proto2'

const ioBook = (protoId: string, changed?: Prop['changed']): ObjectCard =>
  card(
    BOOK,
    'Book 함수',
    [prop('prototype', ref(protoId), { note: 'hidden', changed })],
    OMITTED_FUNCTION_PROTO,
    { omittedNote: FUNC_NOTE },
  )

const ioProto1 = (label: string): ObjectCard =>
  card(P1, label, [prop('constructor', ref(BOOK), { note: 'hidden' })], toRef(OBJ))

const ioProto2 = (isNew = false): ObjectCard =>
  card(
    P2,
    '새 Book.prototype',
    [prop('kind', str('book'), isNew ? { changed: 'created' } : {})],
    toRef(OBJ),
    isNew ? fresh : {},
  )

const ioA = (isNew = false): ObjectCard =>
  card(
    'a',
    '객체 a',
    [prop('title', str('JS'), isNew ? { changed: 'created' } : {})],
    toRef(P1),
    isNew ? fresh : {},
  )
const ioB = (isNew = false): ObjectCard =>
  card(
    'b',
    '객체 b',
    [prop('title', str('CSS'), isNew ? { changed: 'created' } : {})],
    toRef(P2),
    isNew ? fresh : {},
  )
const ioC = (isNew = false): ObjectCard => card('c', '객체 c', [], toRef(P2), isNew ? fresh : {})

const ioBindings = (names: ('a' | 'b' | 'c')[], changedName?: string): Binding[] => [
  bookB(),
  ...names.map((n) => bind(n, ref(n), { changed: n === changedName })),
]

const instLook = (
  startId: string,
  targetId: string,
  ids: string[],
  end: 'match' | 'null',
): Lookup => ({
  kind: 'instanceof',
  startId,
  targetId,
  path: ids.map((id, i) => ({ id, match: end === 'match' && i === ids.length - 1 })),
  end,
  outcome: end === 'match' ? 'true' : 'false',
})

const origLabel = '처음 Book.prototype'
const oldLabel = '이전 Book.prototype'

const ioBeforeReplace = (lookup: Lookup | null): ProtoState => ({
  bindings: ioBindings(['a']),
  objects: [ioBook(P1), ioProto1(origLabel), ioA(), objectPrototype()],
  lookup,
})

const ioAfterReplace = (
  names: ('a' | 'b' | 'c')[],
  changedName: string | undefined,
  objects: ObjectCard[],
  lookup: Lookup | null,
): ProtoState => ({
  bindings: ioBindings(names, changedName),
  objects,
  lookup,
})

const ioSteps: ProtoStep[] = [
  {
    title: '실행 전',
    explanation:
      '코드를 실행하기 전입니다. 함수 선언은 실행 전에 처리되어 Book 함수 객체와 그 prototype 객체(여기서는 "처음 Book.prototype"이라 부릅니다)가 이미 있습니다. Book의 [[Prototype]]인 Function.prototype은 이 시나리오에서 카드로 그리지 않고 이름만 표시했습니다.',
    state: {
      bindings: [bookB()],
      objects: [ioBook(P1), ioProto1(origLabel), objectPrototype()],
      lookup: null,
    },
    output: [],
  },
  {
    title: "const a = new Book('JS')",
    explanation:
      'new 식이 새 객체를 만들고 [[Prototype]]을 Book의 prototype 프로퍼티 값(처음 Book.prototype)으로 정한 뒤 title을 추가합니다. 세부 순서는 new 연산자 개념에서 다룹니다.',
    line: at(4),
    state: {
      bindings: ioBindings(['a'], 'a'),
      objects: [ioBook(P1), ioProto1(origLabel), ioA(true), objectPrototype()],
      lookup: null,
    },
    output: [],
  },
  {
    title: 'a instanceof Book',
    explanation:
      'instanceof는 오른쪽 함수(Book)의 prototype 프로퍼티 값을 읽어 두고, 왼쪽 객체 a의 [[Prototype]]부터 체인을 따라가며 그 객체와 같은지 비교합니다. a의 [[Prototype]]이 처음 Book.prototype이므로 첫 비교에서 일치하고 결과는 true입니다.',
    line: at(5),
    state: ioBeforeReplace(instLook('a', P1, [P1], 'match')),
    output: ['true'],
  },
  {
    title: 'a instanceof Object',
    explanation:
      '이번에는 Object의 prototype 프로퍼티 값인 Object.prototype과 비교합니다. a의 [[Prototype]]인 처음 Book.prototype은 Object.prototype이 아니므로 한 번 더 따라가고, 그 [[Prototype]]인 Object.prototype과 일치해 true입니다.',
    line: at(6),
    state: ioBeforeReplace(instLook('a', OBJ, [P1, OBJ], 'match')),
    output: ['true', 'true'],
  },
  {
    title: "Book.prototype = { kind: 'book' }",
    explanation:
      'Book의 prototype 프로퍼티에 새 객체를 대입합니다. Book의 prototype 값만 새 객체로 바뀌고, 이미 만들어진 a의 [[Prototype]]은 그대로 이전 Book.prototype입니다. 새 객체는 객체 리터럴이라 constructor 프로퍼티가 없습니다.',
    line: at(7),
    state: ioAfterReplace(
      ['a'],
      undefined,
      [ioBook(P2, 'updated'), ioProto1(oldLabel), ioProto2(true), ioA(), objectPrototype()],
      null,
    ),
    output: ['true', 'true'],
  },
  {
    title: 'a instanceof Book',
    explanation:
      'Book의 prototype 값은 이제 새 Book.prototype입니다. a의 [[Prototype]]을 따라가며 비교하면 이전 Book.prototype, Object.prototype 모두 새 객체가 아니고 그 뒤는 null이므로 결과는 false입니다.',
    line: at(8),
    state: ioAfterReplace(
      ['a'],
      undefined,
      [ioBook(P2), ioProto1(oldLabel), ioProto2(), ioA(), objectPrototype()],
      instLook('a', P2, [P1, OBJ], 'null'),
    ),
    output: ['true', 'true', 'false'],
  },
  {
    title: "const b = new Book('CSS')",
    explanation:
      'new는 Book의 현재 prototype 값을 새 객체의 [[Prototype]]으로 씁니다. 그래서 b의 [[Prototype]]은 새 Book.prototype입니다.',
    line: at(9),
    state: ioAfterReplace(
      ['a', 'b'],
      'b',
      [ioBook(P2), ioProto1(oldLabel), ioProto2(), ioA(), ioB(true), objectPrototype()],
      null,
    ),
    output: ['true', 'true', 'false'],
  },
  {
    title: 'b instanceof Book',
    explanation:
      'b의 [[Prototype]]이 Book의 현재 prototype 값(새 Book.prototype)이므로 첫 비교에서 일치하고 true입니다.',
    line: at(10),
    state: ioAfterReplace(
      ['a', 'b'],
      undefined,
      [ioBook(P2), ioProto1(oldLabel), ioProto2(), ioA(), ioB(), objectPrototype()],
      instLook('b', P2, [P2], 'match'),
    ),
    output: ['true', 'true', 'false', 'true'],
  },
  {
    title: 'const c = Object.create(Book.prototype)',
    explanation:
      'Object.create는 Book을 호출하지 않고 [[Prototype]]만 Book.prototype(새 객체)으로 정한 객체를 만듭니다. c에는 자기 프로퍼티가 없습니다.',
    line: at(11),
    state: ioAfterReplace(
      ['a', 'b', 'c'],
      'c',
      [ioBook(P2), ioProto1(oldLabel), ioProto2(), ioA(), ioB(), ioC(true), objectPrototype()],
      null,
    ),
    output: ['true', 'true', 'false', 'true'],
  },
  {
    title: 'c instanceof Book',
    explanation:
      'instanceof는 생성자 함수가 호출되었는지를 보지 않고 [[Prototype]] 체인에 Book.prototype이 있는지만 봅니다. c의 [[Prototype]]이 새 Book.prototype이라 true입니다.',
    line: at(12),
    state: ioAfterReplace(
      ['a', 'b', 'c'],
      undefined,
      [ioBook(P2), ioProto1(oldLabel), ioProto2(), ioA(), ioB(), ioC(), objectPrototype()],
      instLook('c', P2, [P2], 'match'),
    ),
    output: ['true', 'true', 'false', 'true', 'true'],
  },
  {
    title: 'JSON.stringify(c)',
    explanation:
      'JSON.stringify는 자기 프로퍼티 중 열거 가능한 것만 직렬화합니다. c에는 자기 프로퍼티가 없고 상속된 kind는 포함되지 않아 "{}"가 출력됩니다.',
    line: at(13),
    state: ioAfterReplace(
      ['a', 'b', 'c'],
      undefined,
      [ioBook(P2), ioProto1(oldLabel), ioProto2(), ioA(), ioB(), ioC(), objectPrototype()],
      null,
    ),
    output: ['true', 'true', 'false', 'true', 'true', '{}'],
  },
]

export const scenarios: Scenario<ProtoState>[] = [
  {
    id: 'chain',
    label: '프로토타입 체인',
    exampleId: 'chain',
    code: chainCode,
    steps: chainSteps,
  },
  {
    id: 'prototype-property',
    label: 'prototype 프로퍼티와 [[Prototype]]',
    exampleId: 'prototype-property',
    code: prototypePropertyCode,
    steps: ppSteps,
  },
  {
    id: 'shadowing',
    label: '대입과 섀도잉',
    exampleId: 'shadowing',
    code: shadowingCode,
    steps: shSteps,
  },
  {
    id: 'instanceof',
    label: 'instanceof',
    exampleId: 'instanceof',
    code: instanceofCode,
    steps: ioSteps,
  },
]
