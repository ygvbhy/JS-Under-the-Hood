import type { LineRange, Scenario, Step } from '~/simulator/types'
import bindRulesCode from './examples/bind-rules.js?raw'
import callbackCode from './examples/callback.js?raw'
import extractSloppyCode from './examples/extract-sloppy.js?raw'
import parensCommaCode from './examples/parens-comma.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - Binding: 선언문이 실행된 변수만 담는다(new-operator와 같은 관례). 함수 선언(run, whoAmI)은 변수로 보이지 않고 함수 카드로만 보인다.
//   value는 값의 표시 문자열('객체 book', '함수 whoAmI')이며 카드의 label과 같다. 바깥·안쪽 함수의 변수를 한 목록에 함께 담는다.
// - ObjectCard·FnCard: 이 예제에 필요한 객체와 함수 객체만 보인다. 객체 id는 예제의 변수 이름과 같다(탐침 대조가 이 이름으로 객체를 찾는다).
//   함수 선언은 처음부터 있고, 객체 리터럴·메서드·화살표 함수·bind의 결과는 평가되는 단계에서 나타난다.
// - `changed: true`(Binding)와 `created: true`(ObjectCard·FnCard)는 "그 단계에서" 새로 생기거나 값이 바뀐 항목에만 붙이고 다음 단계에서는 해제한다.
// - FnCard.mode: 'sloppy'·'strict'는 함수 본문의 mode, 'arrow'는 자기 this가 없는 화살표 함수(lexicalThis = 바깥 this), 'bound'는 bind가 만든 함수(boundThis, targetId = 원본).
// - Determination은 지금 결정 중인 호출 하나다. 명세가 this를 정하는 순서(함수 자리 식의 참조 → thisArg → 불리는 함수의 this 모드 규칙 → this)를 네 칸으로 나눈 교육용 단위다(엔진 내부 구현이 아니다).
//   - ref: 함수 자리 식의 평가 결과. 'property' 프로퍼티 참조(base = 기준 값), 'name' 변수 이름, 'value' 참조가 아닌 값(쉼표·호출 결과),
//     'function-property' call·apply 호출의 함수 자리 식(`bound.call`의 기준 값은 함수 bound)이다.
//   - via·firstArg: call·apply로 부른 경우 via가 'call'·'apply'이고 thisArg는 첫 인수(firstArg)다. 아니면 둘 다 null이다.
//   - callee: 실제로 불리는 함수 카드의 id(call·apply·bind 자체는 그리지 않는다).
//   - thisValue: 실제로 실행되는 코드가 받는 this(bound 함수는 마지막 원본이 받는 this).
// - history: 이 시나리오에서 지금까지 결정한 호출과 this의 비교표. 호출이 결정되는 단계에서 그 호출이 추가된다.
// - 콜백 시나리오에서 run(...) 호출 자체의 this는 쓰이지 않아 그리지 않고, run 안의 callback() 호출만 결정한다.

export type ThisVal = { kind: 'object'; id: string } | { kind: 'global' } | { kind: 'undefined' }

export type ObjectCard = {
  id: string
  label: string // 'book', 'kim'
  name?: string // name 프로퍼티의 값(있는 객체만)
  created?: true
}

export type FnMode = 'sloppy' | 'strict' | 'arrow' | 'bound'

export type FnCard = {
  id: string
  label: string
  mode: FnMode
  lexicalThis?: ThisVal // arrow: 바깥 this
  boundThis?: ThisVal // bound: 묶인 this
  targetId?: string // bound: 원본 함수 카드 id
  created?: true
}

export type Binding = { name: string; value: string; changed?: true }

export type Ref =
  | { kind: 'property'; base: ThisVal; key: string }
  | { kind: 'name'; name: string }
  | { kind: 'value'; why: string }
  | { kind: 'function-property'; fnId: string; key: 'call' | 'apply' }

export type Determination = {
  expr: string // 호출식 원문
  callee: string // FnCard id
  ref: Ref
  via: 'call' | 'apply' | null
  firstArg: ThisVal | null // via가 있을 때 call·apply의 첫 인수
  thisArg: ThisVal
  rule: string
  thisValue: ThisVal
}

export type HistoryRow = { expr: string; thisValue: ThisVal }

export type ThisState = {
  objects: ObjectCard[]
  functions: FnCard[]
  bindings: Binding[]
  current: Determination | null
  history: HistoryRow[]
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const obj = (id: string): ThisVal => ({ kind: 'object', id })
const GLOBAL: ThisVal = { kind: 'global' }
const UNDEF: ThisVal = { kind: 'undefined' }

const card = (id: string, opts: { name?: string; created?: boolean } = {}): ObjectCard => ({
  id,
  label: id,
  ...(opts.name && { name: opts.name }),
  ...(opts.created && { created: true as const }),
})

const fn = (
  id: string,
  mode: FnMode,
  opts: {
    label?: string
    lexicalThis?: ThisVal
    boundThis?: ThisVal
    targetId?: string
    created?: boolean
  } = {},
): FnCard => ({
  id,
  label: opts.label ?? id,
  mode,
  ...(opts.lexicalThis && { lexicalThis: opts.lexicalThis }),
  ...(opts.boundThis && { boundThis: opts.boundThis }),
  ...(opts.targetId && { targetId: opts.targetId }),
  ...(opts.created && { created: true as const }),
})

const bindObj = (name: string, id: string, changed = false): Binding => ({
  name,
  value: `객체 ${id}`,
  ...(changed && { changed: true as const }),
})

const bindFn = (name: string, label: string, changed = false): Binding => ({
  name,
  value: `함수 ${label}`,
  ...(changed && { changed: true as const }),
})

// 함수 모드별 규칙 문장. 모드 이름(sloppy·strict·화살표·bound)을 반드시 포함한다.
const ruleFor = (mode: FnMode, thisArg: ThisVal): string => {
  if (mode === 'sloppy')
    return thisArg.kind === 'undefined'
      ? 'sloppy 함수: undefined인 thisArg는 전역 객체로 바꿔 받음'
      : 'sloppy 함수: 객체인 thisArg는 그대로 받음'
  if (mode === 'strict') return 'strict 함수: thisArg를 그대로 받음'
  if (mode === 'arrow') return '화살표 함수: 자기 this가 없어 바깥의 this를 씀'
  return 'bound 함수: 받은 thisArg를 쓰지 않고 묶인 this로 원본 함수를 부름'
}

// thisValue는 일부러 인자로 받는다(규칙에서 계산하지 않는다). 테스트가 규칙으로 따로 계산해 대조한다.
const decide = (
  expr: string,
  callee: string,
  mode: FnMode,
  ref: Ref,
  thisArg: ThisVal,
  thisValue: ThisVal,
  via: { kind: 'call' | 'apply'; firstArg: ThisVal } | null = null,
): Determination => ({
  expr,
  callee,
  ref,
  via: via ? via.kind : null,
  firstArg: via ? via.firstArg : null,
  thisArg,
  rule: ruleFor(mode, thisArg),
  thisValue,
})

const at = (n: number): LineRange => ({ from: n, to: n })
const range = (from: number, to: number): LineRange => ({ from, to })

type ThisStep = Step<ThisState>

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 호출식이 실행될 때 this가 정해지는 과정을 함수 자리의 식, thisArg, 불리는 함수의 규칙, this의 네 칸으로 나누어 보여 줍니다. 호출마다 결과가 아래 표에 쌓입니다. 이 칸 나눔은 명세가 정한 순서를 그린 교육용 단위입니다.'

// --- 시나리오 1: 메서드를 꺼내 호출하기 (sloppy) -------------------------------------------------

const exWhoAmI = (created = false) => fn('whoAmI', 'sloppy', { created })
const exBook = (created = false) => card('book', { created })

const exBookCall = decide(
  'book.whoAmI()',
  'whoAmI',
  'sloppy',
  { kind: 'property', base: obj('book'), key: 'whoAmI' },
  obj('book'),
  obj('book'),
)
const exPlainCall = decide(
  'whoAmI()',
  'whoAmI',
  'sloppy',
  { kind: 'name', name: 'whoAmI' },
  UNDEF,
  GLOBAL,
)

const exHistory1: HistoryRow[] = [{ expr: 'book.whoAmI()', thisValue: obj('book') }]
const exHistory2: HistoryRow[] = [...exHistory1, { expr: 'whoAmI()', thisValue: GLOBAL }]

const extractSteps: ThisStep[] = [
  {
    title: '실행 전',
    explanation: intro,
    state: { objects: [], functions: [], bindings: [], current: null, history: [] },
    output: [],
  },
  {
    title: 'const book = { whoAmI() {…} }: 객체 book과 메서드 whoAmI',
    explanation:
      '객체 리터럴이 평가되어 객체 book이 만들어지고, 메서드 whoAmI는 함수 객체로 만들어져 book의 프로퍼티가 됩니다. 이 코드는 strict mode가 아니라서 whoAmI는 sloppy 함수입니다. 변수 book의 값은 이 객체입니다.',
    line: range(1, 5),
    state: {
      objects: [exBook(true)],
      functions: [exWhoAmI(true)],
      bindings: [bindObj('book', 'book', true)],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'const whoAmI = book.whoAmI: 함수를 변수에 담기',
    explanation:
      'book.whoAmI는 book의 프로퍼티 whoAmI를 읽어 함수 객체를 꺼내는 식이고, 이 값이 변수 whoAmI의 값이 됩니다. 함수 객체는 그대로이고 변수 whoAmI도 같은 함수 객체를 값으로 가질 뿐입니다.',
    line: at(6),
    state: {
      objects: [exBook()],
      functions: [exWhoAmI()],
      bindings: [bindObj('book', 'book'), bindFn('whoAmI', 'whoAmI', true)],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'book.whoAmI(): this는 book',
    explanation:
      '함수 자리의 식 book.whoAmI는 프로퍼티 참조이고 기준 값은 book이라 thisArg는 book입니다. 불리는 whoAmI는 sloppy 함수이고 객체인 thisArg는 그대로 받아 this는 book입니다. 그래서 this === book이 참이고 book이 출력됩니다.',
    line: at(7),
    state: {
      objects: [exBook()],
      functions: [exWhoAmI()],
      bindings: [bindObj('book', 'book'), bindFn('whoAmI', 'whoAmI')],
      current: exBookCall,
      history: exHistory1,
    },
    output: ['book'],
  },
  {
    title: 'whoAmI(): this는 전역 객체',
    explanation:
      '함수 자리의 식 whoAmI는 변수 이름이라 프로퍼티 참조가 아니고, thisArg는 undefined입니다. 불리는 함수는 같은 whoAmI이지만 sloppy 함수라 undefined인 thisArg를 전역 객체로 바꿔 받아 this는 전역 객체입니다. 같은 함수여도 호출 방식이 달라 this가 달라지고, globalThis가 출력됩니다.',
    line: at(8),
    state: {
      objects: [exBook()],
      functions: [exWhoAmI()],
      bindings: [bindObj('book', 'book'), bindFn('whoAmI', 'whoAmI')],
      current: exPlainCall,
      history: exHistory2,
    },
    output: ['book', 'globalThis'],
  },
]

// --- 시나리오 2: 콜백으로 넘긴 함수의 this ------------------------------------------------------

const cbBook = (created = false) => card('book', { created })
const cbRun = () => fn('run', 'sloppy')
const cbReport = (created = false) => fn('report', 'sloppy', { created })
const cbPlain = (created = false) => fn('plain', 'sloppy', { created })
const cbViaThat = (created = false) => fn('viaThat', 'sloppy', { created })
const cbViaArrow = (created = false) =>
  fn('viaArrow', 'arrow', { lexicalThis: obj('book'), created })
const cbBound = (created = false) =>
  fn('boundPlain', 'bound', {
    label: 'plain.bind(this)',
    boundThis: obj('book'),
    targetId: 'plain',
    created,
  })

const callbackExpr = (run: string) => `callback() ← run(${run})`

const cbReportCall = decide(
  'book.report()',
  'report',
  'sloppy',
  { kind: 'property', base: obj('book'), key: 'report' },
  obj('book'),
  obj('book'),
)
const cbPlainCall = decide(
  callbackExpr('plain'),
  'plain',
  'sloppy',
  { kind: 'name', name: 'callback' },
  UNDEF,
  GLOBAL,
)
const cbBoundCall = decide(
  callbackExpr('plain.bind(this)'),
  'boundPlain',
  'bound',
  { kind: 'name', name: 'callback' },
  UNDEF,
  obj('book'),
)
const cbViaThatCall = decide(
  callbackExpr('viaThat'),
  'viaThat',
  'sloppy',
  { kind: 'name', name: 'callback' },
  UNDEF,
  GLOBAL,
)
const cbViaArrowCall = decide(
  callbackExpr('viaArrow'),
  'viaArrow',
  'arrow',
  { kind: 'name', name: 'callback' },
  UNDEF,
  obj('book'),
)

const cbH1: HistoryRow[] = [{ expr: 'book.report()', thisValue: obj('book') }]
const cbH2: HistoryRow[] = [...cbH1, { expr: callbackExpr('plain'), thisValue: GLOBAL }]
const cbH3: HistoryRow[] = [
  ...cbH2,
  { expr: callbackExpr('plain.bind(this)'), thisValue: obj('book') },
]
const cbH4: HistoryRow[] = [...cbH3, { expr: callbackExpr('viaThat'), thisValue: GLOBAL }]
const cbH5: HistoryRow[] = [...cbH4, { expr: callbackExpr('viaArrow'), thisValue: obj('book') }]

// report 본문 안의 변수(that, viaArrow)까지 담은 변수 목록
const cbBindings = (changed = false): Binding[] => [
  bindObj('book', 'book'),
  bindObj('that', 'book', changed),
  bindFn('viaArrow', 'viaArrow', changed),
]

const callbackSteps: ThisStep[] = [
  {
    title: '실행 전',
    explanation: `${intro} 함수 선언 run은 처음부터 있는 함수로 보입니다.`,
    state: { objects: [], functions: [cbRun()], bindings: [], current: null, history: [] },
    output: [],
  },
  {
    title: 'const book = { report() {…} }: 객체 book과 메서드 report',
    explanation:
      '객체 리터럴이 평가되어 객체 book이 만들어지고, 메서드 report는 함수 객체로 만들어져 book의 프로퍼티가 됩니다. report 본문은 아직 실행되지 않습니다. 이 코드는 strict mode가 아니라서 report와 안쪽 함수들은 sloppy 함수입니다.',
    line: range(4, 19),
    state: {
      objects: [cbBook(true)],
      functions: [cbRun(), cbReport(true)],
      bindings: [bindObj('book', 'book', true)],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'book.report(): this는 book',
    explanation:
      '함수 자리의 식 book.report는 프로퍼티 참조이고 기준 값은 book이라 thisArg는 book입니다. report는 sloppy 함수이고 객체인 thisArg는 그대로 받아 this는 book입니다. 이제 report 본문이 실행됩니다.',
    line: at(20),
    state: {
      objects: [cbBook()],
      functions: [cbRun(), cbReport()],
      bindings: [bindObj('book', 'book')],
      current: cbReportCall,
      history: cbH1,
    },
    output: [],
  },
  {
    title: 'report 본문: 안쪽 함수, that, viaArrow 준비',
    explanation:
      'report 본문이 안쪽 함수 plain과 viaThat을 만들고, 변수 that에는 report의 this인 book을 담습니다. 화살표 함수 viaArrow는 자기 this를 갖지 않고 바깥의 this를 쓰며, 이 시각화는 그 값(book)을 카드에 함께 보여 줍니다.',
    line: range(6, 13),
    state: {
      objects: [cbBook()],
      functions: [cbRun(), cbReport(), cbPlain(true), cbViaThat(true), cbViaArrow(true)],
      bindings: cbBindings(true),
      current: null,
      history: cbH1,
    },
    output: [],
  },
  {
    title: 'run(plain)의 callback(): this는 전역 객체',
    explanation:
      '14번째 줄 run(plain)이 실행하는 run 본문의 callback()입니다. 함수 자리의 식 callback은 변수 이름이라 thisArg는 undefined이고, 불리는 plain은 sloppy 함수라 undefined를 전역 객체로 바꿔 받아 this는 전역 객체입니다. 그래서 this === book은 false입니다.',
    line: at(2),
    state: {
      objects: [cbBook()],
      functions: [cbRun(), cbReport(), cbPlain(), cbViaThat(), cbViaArrow()],
      bindings: cbBindings(),
      current: cbPlainCall,
      history: cbH2,
    },
    output: ['false'],
  },
  {
    title: 'run(plain.bind(this))의 callback(): 묶인 this는 book',
    explanation:
      '15번째 줄에서 plain.bind(this)가 먼저 평가되어 this(book)를 묶은 새 함수가 만들어지고, run 본문의 callback()이 그 함수를 부릅니다. 함수 자리의 식 callback은 변수 이름이라 thisArg는 undefined이지만, bound 함수는 받은 thisArg를 쓰지 않고 묶인 this인 book으로 plain을 부릅니다. 그래서 plain의 this는 book이고 true가 출력됩니다.',
    line: at(2),
    state: {
      objects: [cbBook()],
      functions: [cbRun(), cbReport(), cbPlain(), cbViaThat(), cbViaArrow(), cbBound(true)],
      bindings: cbBindings(),
      current: cbBoundCall,
      history: cbH3,
    },
    output: ['false', 'true'],
  },
  {
    title: 'run(viaThat)의 callback(): this는 전역 객체, that은 book',
    explanation:
      '16번째 줄 run(viaThat)이 실행하는 callback()입니다. 함수 자리의 식이 변수 이름이라 thisArg는 undefined이고, viaThat은 sloppy 함수라 this는 전역 객체입니다. 하지만 viaThat 본문은 this가 아니라 바깥 변수 that을 읽고, that의 값은 book이라 that === book은 true입니다.',
    line: at(2),
    state: {
      objects: [cbBook()],
      functions: [cbRun(), cbReport(), cbPlain(), cbViaThat(), cbViaArrow(), cbBound()],
      bindings: cbBindings(),
      current: cbViaThatCall,
      history: cbH4,
    },
    output: ['false', 'true', 'true'],
  },
  {
    title: 'run(viaArrow)의 callback(): 화살표 함수의 this는 바깥 this',
    explanation:
      '17번째 줄 run(viaArrow)이 실행하는 callback()입니다. 함수 자리의 식이 변수 이름이라 thisArg는 undefined이지만, 불리는 viaArrow는 화살표 함수라 자기 this가 없어 thisArg를 쓰지 않고 바깥의 this를 씁니다. 그 값은 book이라 this === book이 true입니다.',
    line: at(2),
    state: {
      objects: [cbBook()],
      functions: [cbRun(), cbReport(), cbPlain(), cbViaThat(), cbViaArrow(), cbBound()],
      bindings: cbBindings(),
      current: cbViaArrowCall,
      history: cbH5,
    },
    output: ['false', 'true', 'true', 'true'],
  },
]

// --- 시나리오 3: bind 규칙 ----------------------------------------------------------------------

const bdWhoAmI = () => fn('whoAmI', 'sloppy')
const bdBound = (created = false) =>
  fn('bound', 'bound', {
    label: 'whoAmI.bind(kim)',
    boundThis: obj('kim'),
    targetId: 'whoAmI',
    created,
  })
const bdBound2 = (created = false) =>
  fn('bound2', 'bound', {
    label: 'bound.bind(lee)',
    boundThis: obj('lee'),
    targetId: 'bound',
    created,
  })
const bdKim = (created = false) => card('kim', { name: 'Kim', created })
const bdLee = (created = false) => card('lee', { name: 'Lee', created })
const bdObj = (created = false) => card('obj', { name: 'obj', created })

const bdCall = decide(
  'bound()',
  'bound',
  'bound',
  { kind: 'name', name: 'bound' },
  UNDEF,
  obj('kim'),
)
const bdCallLee = decide(
  'bound.call(lee)',
  'bound',
  'bound',
  { kind: 'function-property', fnId: 'bound', key: 'call' },
  obj('lee'),
  obj('kim'),
  { kind: 'call', firstArg: obj('lee') },
)
const bdRebind = decide(
  'bound.bind(lee)()',
  'bound2',
  'bound',
  { kind: 'value', why: 'bound.bind(lee)()에서 함수 자리 식은 호출의 결과라 참조가 아닌 값' },
  UNDEF,
  obj('kim'),
)
const bdMethod = decide(
  'obj.bound()',
  'bound',
  'bound',
  { kind: 'property', base: obj('obj'), key: 'bound' },
  obj('obj'),
  obj('kim'),
)

const bdH1: HistoryRow[] = [{ expr: 'bound()', thisValue: obj('kim') }]
const bdH2: HistoryRow[] = [...bdH1, { expr: 'bound.call(lee)', thisValue: obj('kim') }]
const bdH3: HistoryRow[] = [...bdH2, { expr: 'bound.bind(lee)()', thisValue: obj('kim') }]
const bdH4: HistoryRow[] = [...bdH3, { expr: 'obj.bound()', thisValue: obj('kim') }]

const bdBase = (): Binding[] => [bindObj('kim', 'kim'), bindObj('lee', 'lee')]
const bdWithBound = (): Binding[] => [...bdBase(), bindFn('bound', 'whoAmI.bind(kim)')]

const bindSteps: ThisStep[] = [
  {
    title: '실행 전',
    explanation: `${intro} 함수 선언 whoAmI는 처음부터 있는 함수로 보입니다.`,
    state: {
      objects: [],
      functions: [bdWhoAmI()],
      bindings: [],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'const kim, const lee: 객체 두 개',
    explanation:
      '객체 kim과 lee가 만들어집니다. 둘 다 name 프로퍼티가 있고 값은 각각 Kim과 Lee입니다.',
    line: range(4, 5),
    state: {
      objects: [bdKim(true), bdLee(true)],
      functions: [bdWhoAmI()],
      bindings: [bindObj('kim', 'kim', true), bindObj('lee', 'lee', true)],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'const bound = whoAmI.bind(kim): this를 묶은 함수',
    explanation:
      'whoAmI.bind(kim)은 this를 kim으로 묶은 새 함수(bound function)를 만들고, 그 함수가 변수 bound의 값이 됩니다. 새 함수는 묶인 this(kim)와 원본 함수(whoAmI)를 가지고, 원본 whoAmI는 그대로입니다.',
    line: at(6),
    state: {
      objects: [bdKim(), bdLee()],
      functions: [bdWhoAmI(), bdBound(true)],
      bindings: [...bdBase(), bindFn('bound', 'whoAmI.bind(kim)', true)],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'bound(): this는 묶인 kim',
    explanation:
      '함수 자리의 식 bound는 변수 이름이라 thisArg는 undefined입니다. 불리는 함수가 bound function이라 받은 thisArg를 쓰지 않고, 묶인 this인 kim으로 원본 whoAmI를 부릅니다. whoAmI의 this는 kim이라 this.name인 Kim이 출력됩니다.',
    line: at(7),
    state: {
      objects: [bdKim(), bdLee()],
      functions: [bdWhoAmI(), bdBound()],
      bindings: bdWithBound(),
      current: bdCall,
      history: bdH1,
    },
    output: ['Kim'],
  },
  {
    title: 'bound.call(lee): thisArg는 lee지만 this는 kim',
    explanation:
      '함수 자리의 식 bound.call은 프로퍼티 참조이고 기준 값은 함수 bound라 call의 this는 bound입니다. call은 자기 this인 bound를 부르면서 첫 인수 lee를 thisArg로 넘깁니다. 하지만 bound function은 받은 thisArg를 쓰지 않고 묶인 this인 kim으로 whoAmI를 부르므로 this는 kim이고 Kim이 출력됩니다.',
    line: at(8),
    state: {
      objects: [bdKim(), bdLee()],
      functions: [bdWhoAmI(), bdBound()],
      bindings: bdWithBound(),
      current: bdCallLee,
      history: bdH2,
    },
    output: ['Kim', 'Kim'],
  },
  {
    title: 'bound.bind(lee)(): 다시 묶어도 this는 kim',
    explanation:
      '먼저 bound.bind(lee)가 평가되어 lee를 묶은 새 bound function이 만들어집니다. 이 호출의 함수 자리 식은 호출의 결과라 참조가 아닌 값이어서 thisArg는 undefined입니다. 새 함수는 lee로 bound를 부르지만, bound는 받은 thisArg를 쓰지 않고 자신이 묶은 kim으로 whoAmI를 부르므로 this는 kim이고 Kim이 출력됩니다.',
    line: at(9),
    state: {
      objects: [bdKim(), bdLee()],
      functions: [bdWhoAmI(), bdBound(), bdBound2(true)],
      bindings: bdWithBound(),
      current: bdRebind,
      history: bdH3,
    },
    output: ['Kim', 'Kim', 'Kim'],
  },
  {
    title: 'const obj = { name, bound }: 객체 obj',
    explanation:
      "객체 obj가 만들어집니다. name 프로퍼티의 값은 'obj'이고, bound 프로퍼티의 값은 변수 bound의 함수입니다.",
    line: at(10),
    state: {
      objects: [bdKim(), bdLee(), bdObj(true)],
      functions: [bdWhoAmI(), bdBound(), bdBound2()],
      bindings: [...bdWithBound(), bindObj('obj', 'obj', true)],
      current: null,
      history: bdH3,
    },
    output: ['Kim', 'Kim', 'Kim'],
  },
  {
    title: 'obj.bound(): thisArg는 obj지만 this는 kim',
    explanation:
      '함수 자리의 식 obj.bound는 프로퍼티 참조이고 기준 값은 obj라 thisArg는 obj입니다. 하지만 bound function은 받은 thisArg를 쓰지 않고 묶인 this인 kim으로 whoAmI를 부르므로 this는 kim입니다. 그래서 obj의 name인 obj가 아니라 kim의 name인 Kim이 출력됩니다.',
    line: at(11),
    state: {
      objects: [bdKim(), bdLee(), bdObj()],
      functions: [bdWhoAmI(), bdBound(), bdBound2()],
      bindings: [...bdWithBound(), bindObj('obj', 'obj')],
      current: bdMethod,
      history: bdH4,
    },
    output: ['Kim', 'Kim', 'Kim', 'Kim'],
  },
]

// --- 시나리오 4: 괄호와 쉼표 (strict) ------------------------------------------------------------

const pcBook = (created = false) => card('book', { created })
const pcWhoAmI = (created = false) => fn('whoAmI', 'strict', { created })

const pcPlain = decide(
  'book.whoAmI()',
  'whoAmI',
  'strict',
  { kind: 'property', base: obj('book'), key: 'whoAmI' },
  obj('book'),
  obj('book'),
)
const pcParens = decide(
  '(book.whoAmI)()',
  'whoAmI',
  'strict',
  { kind: 'property', base: obj('book'), key: 'whoAmI' },
  obj('book'),
  obj('book'),
)
const pcComma = decide(
  '(0, book.whoAmI)()',
  'whoAmI',
  'strict',
  { kind: 'value', why: '쉼표 연산자는 오른쪽 식의 값을 꺼내 돌려주므로 참조가 아닌 값' },
  UNDEF,
  UNDEF,
)

const pcH1: HistoryRow[] = [{ expr: 'book.whoAmI()', thisValue: obj('book') }]
const pcH2: HistoryRow[] = [...pcH1, { expr: '(book.whoAmI)()', thisValue: obj('book') }]
const pcH3: HistoryRow[] = [...pcH2, { expr: '(0, book.whoAmI)()', thisValue: UNDEF }]

const parensSteps: ThisStep[] = [
  {
    title: '실행 전',
    explanation: `${intro} 1번째 줄의 'use strict' 지시어 때문에 이 스크립트의 함수는 모두 strict 함수입니다.`,
    state: { objects: [], functions: [], bindings: [], current: null, history: [] },
    output: [],
  },
  {
    title: 'const book = { whoAmI() {…} }: 객체 book과 strict 메서드',
    explanation:
      '객체 리터럴이 평가되어 객체 book이 만들어지고, 메서드 whoAmI는 함수 객체로 만들어져 book의 프로퍼티가 됩니다. 지시어 덕분에 whoAmI는 strict 함수입니다.',
    line: range(2, 6),
    state: {
      objects: [pcBook(true)],
      functions: [pcWhoAmI(true)],
      bindings: [bindObj('book', 'book', true)],
      current: null,
      history: [],
    },
    output: [],
  },
  {
    title: 'book.whoAmI(): this는 book',
    explanation:
      '함수 자리의 식 book.whoAmI는 프로퍼티 참조이고 기준 값은 book이라 thisArg는 book입니다. whoAmI는 strict 함수라 thisArg를 그대로 받아 this는 book이고 book이 출력됩니다.',
    line: at(7),
    state: {
      objects: [pcBook()],
      functions: [pcWhoAmI()],
      bindings: [bindObj('book', 'book')],
      current: pcPlain,
      history: pcH1,
    },
    output: ['book'],
  },
  {
    title: '(book.whoAmI)(): 괄호는 참조를 그대로 둠',
    explanation:
      '함수 자리의 식은 괄호로 감싼 book.whoAmI입니다. 괄호 식은 안쪽 식의 평가 결과인 프로퍼티 참조를 그대로 돌려주므로 기준 값은 여전히 book이고 thisArg는 book입니다. strict 함수라 그대로 받아 this는 book입니다.',
    line: at(8),
    state: {
      objects: [pcBook()],
      functions: [pcWhoAmI()],
      bindings: [bindObj('book', 'book')],
      current: pcParens,
      history: pcH2,
    },
    output: ['book', 'book'],
  },
  {
    title: '(0, book.whoAmI)(): 쉼표가 값을 꺼냄',
    explanation:
      '함수 자리의 식은 쉼표 식입니다. 쉼표 연산자는 오른쪽 식 book.whoAmI의 값(함수 객체)을 돌려주므로 프로퍼티 참조가 아닌 값이 되고 기준 값이 없어 thisArg는 undefined입니다. strict 함수는 undefined를 그대로 받아 this가 undefined이고, String(this)인 undefined가 출력됩니다.',
    line: at(9),
    state: {
      objects: [pcBook()],
      functions: [pcWhoAmI()],
      bindings: [bindObj('book', 'book')],
      current: pcComma,
      history: pcH3,
    },
    output: ['book', 'book', 'undefined'],
  },
]

export const scenarios: Scenario<ThisState>[] = [
  {
    id: 'extract',
    label: '메서드를 꺼내 호출하면',
    exampleId: 'extract-sloppy',
    code: extractSloppyCode,
    steps: extractSteps,
  },
  {
    id: 'callback',
    label: '콜백으로 넘기면',
    exampleId: 'callback',
    code: callbackCode,
    steps: callbackSteps,
  },
  {
    id: 'bind',
    label: 'bind한 함수를 다시 부르면',
    exampleId: 'bind-rules',
    code: bindRulesCode,
    steps: bindSteps,
  },
  {
    id: 'parens',
    label: '괄호와 쉼표',
    exampleId: 'parens-comma',
    code: parensCommaCode,
    steps: parensSteps,
  },
]
