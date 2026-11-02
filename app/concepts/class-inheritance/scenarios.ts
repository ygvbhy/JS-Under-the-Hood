import type { LineRange, Scenario, Step } from '~/simulator/types'
import constructDerivedCode from './examples/construct-derived.js?raw'
import fieldOrderCode from './examples/field-order.js?raw'
import superMethodCode from './examples/super-method.js?raw'
import thisBeforeSuperCode from './examples/this-before-super.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - ClassBox: 평가가 끝난 클래스만 담는다. ctorParent는 생성자 쪽 [[Prototype]], protoParent는 prototype 쪽 [[Prototype]]이다.
//   hasOwnConstructor가 false면 기본 생성자가 쓰인다. `created: true`는 그 클래스가 평가된 단계에만 붙인다.
// - Frame: 진행 중인 생성자 호출 스택이다(아래가 먼저). kind는 'base'(기본 클래스), 'derived'(생성자를 직접 쓴 파생 클래스),
//   'default-derived'(생성자를 생략한 파생 클래스의 기본 생성자)다.
//   thisStatus는 'uninitialized'(this 바인딩이 초기화 전), 'none'(this 바인딩 자체가 없음), 객체 참조 중 하나다.
//   - base: 객체가 만들어지는 순간부터 그 객체를 가리킨다.
//   - derived: super()가 돌아와 BindThisValue가 끝난 단계부터 객체를 가리키고, 그 전에는 'uninitialized'다.
//   - default-derived: 기본 생성자는 ECMAScript 함수 환경이 없는 내장 함수라 'none'이다.
// - ObjectBox: 객체는 기본 클래스(base) 생성자의 [[Construct]]가 시작될 때만 만들어지고, proto는 newTarget의 prototype이다.
//   파생 클래스 필드(예: label)는 부모 생성자가 돌아온 뒤에 props에 나타난다.
//   `created: true`(ObjectBox)와 `changed: true`(Binding·Prop)는 "그 단계에서" 새로 생기거나 값이 바뀐 항목에만 붙인다.
// - Binding: 선언문이 실행된 const만 담는다(new-operator와 같은 관례).
// - Lookup: 메서드 찾기다. super 프로퍼티는 현재 메서드의 [[HomeObject]]의 [[Prototype]]에서 찾기 시작하고,
//   호출할 때의 this(thisValue)는 언제나 인스턴스다.
// - error: 던져진 예외.
//   단계는 명세 [[Construct]]와 SuperCall이 정한 순서(부모 생성자 호출 → BindThisValue → 필드 초기화)를 묶어 그린 교육용 단위다(엔진 내부 구현이 아니다).

export type Val = { type: 'string' | 'undefined'; display: string } // string은 따옴표 없이

export type ObjectRef = { kind: 'object'; id: string }

export type Binding = {
  name: string
  declaredWith: 'const'
  value: Val | ObjectRef
  changed?: true
}

export type Prop = { key: string; value: Val; changed?: true }

export type ObjectBox = {
  id: string
  label: string // '객체 A'
  proto: string // 'Dog.prototype'
  props: Prop[]
  created?: true
}

export type ClassBox = {
  name: string
  kind: 'base' | 'derived'
  ctorParent: string // 'Function.prototype' 또는 부모 클래스 이름
  protoParent: string // 'Object.prototype' 또는 '부모.prototype'
  methods: string[]
  fields: string[]
  hasOwnConstructor: boolean
  created?: true
}

export type Frame = {
  fn: string // 'Dog'
  kind: 'base' | 'derived' | 'default-derived'
  newTarget: string
  args: Val[]
  thisStatus: 'uninitialized' | 'none' | ObjectRef
}

export type Lookup = {
  expr: string // 'pet.speak()' | 'super.speak()' | 'this.describe()'
  startAt: string // 찾기 시작한 곳
  via?: string // 시작점을 정한 근거 (super일 때)
  foundIn: string
  thisValue: ObjectRef
}

export type InheritState = {
  classes: ClassBox[]
  frames: Frame[]
  objects: ObjectBox[]
  bindings: Binding[]
  lookup: Lookup | null
  error: { name: 'ReferenceError'; reason: string } | null
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string): Val => ({ type: 'string', display: s })

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

const objA = (proto: string, props: Prop[], created = false): ObjectBox => ({
  id: 'a',
  label: '객체 A',
  proto,
  props,
  ...(created && { created: true as const }),
})

const cls = (
  name: string,
  kind: ClassBox['kind'],
  parent: string | null,
  opts: { methods?: string[]; fields?: string[]; hasOwnConstructor?: boolean } = {},
): ((created?: boolean) => ClassBox) => {
  const box: ClassBox = {
    name,
    kind,
    ctorParent: parent ?? 'Function.prototype',
    protoParent: parent ? `${parent}.prototype` : 'Object.prototype',
    methods: opts.methods ?? [],
    fields: opts.fields ?? [],
    hasOwnConstructor: opts.hasOwnConstructor ?? true,
  }
  return (created = false) => ({ ...box, ...(created && { created: true as const }) })
}

const frame = (
  fn: string,
  kind: Frame['kind'],
  newTarget: string,
  args: Val[],
  thisStatus: Frame['thisStatus'],
): Frame => ({ fn, kind, newTarget, args, thisStatus })

const at = (n: number): LineRange => ({ from: n, to: n })
const span = (from: number, to: number): LineRange => ({ from, to })

type InheritStep = Step<InheritState>

const state = (s: Partial<InheritState>): InheritState => ({
  classes: [],
  frames: [],
  objects: [],
  bindings: [],
  lookup: null,
  error: null,
  ...s,
})

const empty = state({})

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 평가가 끝난 클래스, 진행 중인 생성자 호출, 만들어진 객체를 보여 줍니다. 단계는 명세의 [[Construct]]와 SuperCall이 정한 순서를 묶어 그린 것입니다.'

const baseClassNote =
  '확장하는 클래스가 없는 기본 클래스(base)라서 생성자 쪽 [[Prototype]]은 Function.prototype, prototype 쪽 [[Prototype]]은 Object.prototype입니다.'

const derivedClassNote = (child: string, parent: string) =>
  `extends ${parent}가 있어 ${child}는 파생 클래스(derived)입니다. ${parent}가 생성자이므로 ${child}의 [[Prototype]]은 ${parent}이고, ${child}.prototype의 [[Prototype]]은 ${parent}.prototype입니다. 이 두 체인이 extends가 만드는 것입니다.`

// --- 시나리오 1: 파생 클래스 객체 만들기 ----------------------------------------------------------

const cdAnimal = cls('Animal', 'base', null)
const cdDog = cls('Dog', 'derived', 'Animal')

const cdFrameDog = (thisStatus: Frame['thisStatus']) =>
  frame('Dog', 'derived', 'Dog', [str('Rex')], thisStatus)
const cdFrameAnimal = frame('Animal', 'base', 'Dog', [str('Rex')], ref('a'))

const cdName = prop('name', str('Rex'))
const cdKind = prop('kind', str('dog'))

const cdPet = (changed = false) => [bind('pet', ref('a'), changed)]

const constructDerivedSteps: InheritStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: 'class Animal 평가',
    explanation: `Animal 클래스가 만들어집니다. ${baseClassNote}`,
    line: span(1, 5),
    state: state({ classes: [cdAnimal(true)] }),
    output: [],
  },
  {
    title: 'class Dog extends Animal 평가',
    explanation: derivedClassNote('Dog', 'Animal'),
    line: span(6, 11),
    state: state({ classes: [cdAnimal(), cdDog(true)] }),
    output: [],
  },
  {
    title: "new Dog('Rex'): Dog 생성자 호출, this는 초기화 전",
    explanation:
      '파생 클래스의 [[Construct]]는 this 객체를 만들지 않습니다. Dog 생성자 본문이 시작되지만 this 바인딩은 아직 초기화되지 않았고, 만들어진 객체도 아직 없습니다. new.target은 Dog입니다.',
    line: at(12),
    state: state({ classes: [cdAnimal(), cdDog()], frames: [cdFrameDog('uninitialized')] }),
    output: [],
  },
  {
    title: 'super(name): 부모 Animal을 newTarget Dog로 호출, 객체 A 생성',
    explanation:
      'super(name)은 Dog의 [[Prototype]]인 Animal을 부모 생성자로 얻고, new.target인 Dog를 그대로 넘겨 Animal을 생성자로 호출합니다. 기본 클래스 Animal의 [[Construct]]가 이때 새 객체 A를 만들고, A의 [[Prototype]]은 newTarget인 Dog의 prototype(Dog.prototype)입니다.',
    line: at(8),
    state: state({
      classes: [cdAnimal(), cdDog()],
      frames: [cdFrameDog('uninitialized'), cdFrameAnimal],
      objects: [objA('Dog.prototype', [], true)],
    }),
    output: [],
  },
  {
    title: 'this.name = name: A에 name 추가',
    explanation:
      'Animal 생성자 본문의 this는 객체 A이므로 A에 name 프로퍼티가 생깁니다. 이때 Dog 생성자의 this는 아직 초기화 전입니다.',
    line: at(3),
    state: state({
      classes: [cdAnimal(), cdDog()],
      frames: [cdFrameDog('uninitialized'), cdFrameAnimal],
      objects: [objA('Dog.prototype', [prop('name', str('Rex'), true)])],
    }),
    output: [],
  },
  {
    title: 'Animal 반환: Dog의 this가 객체 A로 초기화',
    explanation:
      'super(name)이 돌아오면 Animal이 돌려준 객체 A가 Dog 생성자의 this 바인딩이 됩니다(BindThisValue). 이제부터 Dog 생성자 안에서 this를 쓸 수 있습니다.',
    line: at(8),
    state: state({
      classes: [cdAnimal(), cdDog()],
      frames: [cdFrameDog(ref('a'))],
      objects: [objA('Dog.prototype', [cdName])],
    }),
    output: [],
  },
  {
    title: "this.kind = 'dog': A에 kind 추가",
    explanation: 'Dog 생성자의 this는 이제 객체 A이므로 A에 kind 프로퍼티가 생깁니다.',
    line: at(9),
    state: state({
      classes: [cdAnimal(), cdDog()],
      frames: [cdFrameDog(ref('a'))],
      objects: [objA('Dog.prototype', [cdName, prop('kind', str('dog'), true)])],
    }),
    output: [],
  },
  {
    title: 'Dog 반환: new 식의 결과가 pet에 들어감',
    explanation:
      'Dog 생성자가 return 없이 끝나면 this 바인딩의 값, 즉 객체 A가 new 식의 결과가 되어 변수 pet에 들어갑니다.',
    line: at(12),
    state: state({
      classes: [cdAnimal(), cdDog()],
      objects: [objA('Dog.prototype', [cdName, cdKind])],
      bindings: cdPet(true),
    }),
    output: [],
  },
  {
    title: 'console.log(pet.name, pet.kind): Rex dog 출력',
    explanation: "pet은 객체 A를 가리키므로 name은 'Rex', kind는 'dog'입니다.",
    line: at(13),
    state: state({
      classes: [cdAnimal(), cdDog()],
      objects: [objA('Dog.prototype', [cdName, cdKind])],
      bindings: cdPet(),
    }),
    output: ['Rex dog'],
  },
  {
    title: 'getPrototypeOf(pet) === Dog.prototype: true 출력',
    explanation:
      'pet의 [[Prototype]]은 객체가 만들어질 때 정해진 Dog.prototype이라 true입니다. 객체를 Animal 생성자가 만들었어도 프로토타입은 new.target인 Dog의 prototype입니다.',
    line: at(14),
    state: state({
      classes: [cdAnimal(), cdDog()],
      objects: [objA('Dog.prototype', [cdName, cdKind])],
      bindings: cdPet(),
    }),
    output: ['Rex dog', 'true'],
  },
  {
    title: 'getPrototypeOf(Dog.prototype) === Animal.prototype: true 출력',
    explanation:
      'extends가 정한 인스턴스 쪽 체인입니다. 클래스를 평가할 때 Dog.prototype의 [[Prototype]]이 Animal.prototype으로 정해졌으므로 true입니다.',
    line: at(15),
    state: state({
      classes: [cdAnimal(), cdDog()],
      objects: [objA('Dog.prototype', [cdName, cdKind])],
      bindings: cdPet(),
    }),
    output: ['Rex dog', 'true', 'true'],
  },
]

// --- 시나리오 2: super() 전에 this --------------------------------------------------------------

const tbAnimal = cls('Animal', 'base', null)
const tbDog = cls('Dog', 'derived', 'Animal')
const tbFrameDog = frame('Dog', 'derived', 'Dog', [str('Rex')], 'uninitialized')

const thisBeforeSuperSteps: InheritStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: 'class Animal 평가',
    explanation: `Animal 클래스가 만들어집니다. ${baseClassNote}`,
    line: span(1, 5),
    state: state({ classes: [tbAnimal(true)] }),
    output: [],
  },
  {
    title: 'class Dog extends Animal 평가',
    explanation: derivedClassNote('Dog', 'Animal'),
    line: span(6, 11),
    state: state({ classes: [tbAnimal(), tbDog(true)] }),
    output: [],
  },
  {
    title: "new Dog('Rex'): Dog 생성자 호출, this는 초기화 전",
    explanation:
      '파생 클래스의 [[Construct]]는 this 객체를 만들지 않으므로, Dog 생성자 본문이 시작될 때 this 바인딩은 초기화 전이고 만들어진 객체도 없습니다.',
    line: at(13),
    state: state({ classes: [tbAnimal(), tbDog()], frames: [tbFrameDog] }),
    output: [],
  },
  {
    title: 'this.kind: this가 초기화 전이라 ReferenceError',
    explanation:
      '8번 줄에서 this 값을 읽으려 하면 this 바인딩이 초기화 전이어서 ReferenceError가 던져집니다. super(name)이 아직 실행되지 않았으므로 Animal 생성자는 호출되지 않았고, 객체도 만들어지지 않았습니다.',
    line: at(8),
    state: state({
      classes: [tbAnimal(), tbDog()],
      frames: [tbFrameDog],
      error: { name: 'ReferenceError', reason: 'this 바인딩이 초기화 전입니다' },
    }),
    output: [],
  },
  {
    title: 'Dog 생성자가 예외로 끝나고 catch로 이동',
    explanation:
      'ReferenceError가 Dog 생성자 밖으로 전달되어 new 식도 같은 예외를 던지고, 제어는 try 블록을 벗어나 catch로 이동합니다. 9번 줄의 super(name)은 끝내 실행되지 않았습니다.',
    line: at(14),
    state: state({
      classes: [tbAnimal(), tbDog()],
      error: { name: 'ReferenceError', reason: 'this 바인딩이 초기화 전입니다' },
    }),
    output: [],
  },
  {
    title: 'console.log(e.name): ReferenceError 출력',
    explanation: 'catch가 받은 예외 e의 name은 ReferenceError입니다.',
    line: at(15),
    state: state({
      classes: [tbAnimal(), tbDog()],
      error: { name: 'ReferenceError', reason: 'this 바인딩이 초기화 전입니다' },
    }),
    output: ['ReferenceError'],
  },
]

// --- 시나리오 3: super.method() 호출 ------------------------------------------------------------

const smAnimal = cls('Animal', 'base', null, { methods: ['speak'] })
const smDog = cls('Dog', 'derived', 'Animal', { methods: ['speak'], hasOwnConstructor: false })

const smFrameDog = frame('Dog', 'default-derived', 'Dog', [str('Rex')], 'none')
const smFrameAnimal = frame('Animal', 'base', 'Dog', [str('Rex')], ref('a'))

const smName = prop('name', str('Rex'))
const smClasses = () => [smAnimal(), smDog()]
const smObjects = () => [objA('Dog.prototype', [smName])]

const smPetLookup: Lookup = {
  expr: 'pet.speak()',
  startAt: '객체 A',
  foundIn: 'Dog.prototype',
  thisValue: ref('a'),
}
const smSuperLookup: Lookup = {
  expr: 'super.speak()',
  startAt: 'Animal.prototype',
  via: 'HomeObject인 Dog.prototype의 [[Prototype]]',
  foundIn: 'Animal.prototype',
  thisValue: ref('a'),
}

const superMethodSteps: InheritStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: 'class Animal 평가',
    explanation: `Animal 클래스가 만들어집니다. speak 메서드는 Animal.prototype에 놓입니다. ${baseClassNote}`,
    line: span(1, 8),
    state: state({ classes: [smAnimal(true)] }),
    output: [],
  },
  {
    title: 'class Dog extends Animal 평가',
    explanation: `${derivedClassNote('Dog', 'Animal')} Dog는 생성자를 쓰지 않았으므로 기본 생성자가 쓰이고, speak 메서드는 Dog.prototype에 놓입니다.`,
    line: span(9, 13),
    state: state({ classes: [smAnimal(), smDog(true)] }),
    output: [],
  },
  {
    title: "new Dog('Rex'): 기본 생성자 호출, this 바인딩은 없음",
    explanation:
      '생성자를 생략한 파생 클래스에서는 기본 생성자가 쓰입니다. 이 기본 생성자는 constructor(...args) { super(...args) }와 비슷하게 동작하는 내장 함수라서 this 바인딩이 없습니다. 만들어진 객체도 아직 없고, new.target은 Dog입니다.',
    line: at(14),
    state: state({ classes: smClasses(), frames: [smFrameDog] }),
    output: [],
  },
  {
    title: '기본 생성자가 Animal을 호출: 객체 A 생성',
    explanation:
      "기본 생성자는 받은 인수 'Rex'와 new.target(Dog)을 그대로 넘겨 부모 Animal을 생성자로 호출합니다. 기본 클래스 Animal의 [[Construct]]가 새 객체 A를 만들고, A의 [[Prototype]]은 newTarget인 Dog의 prototype(Dog.prototype)입니다.",
    line: at(14),
    state: state({
      classes: smClasses(),
      frames: [smFrameDog, smFrameAnimal],
      objects: [objA('Dog.prototype', [], true)],
    }),
    output: [],
  },
  {
    title: 'this.name = name: A에 name 추가',
    explanation: "Animal 생성자 본문의 this는 객체 A이므로 A에 name 프로퍼티('Rex')가 생깁니다.",
    line: at(3),
    state: state({
      classes: smClasses(),
      frames: [smFrameDog, smFrameAnimal],
      objects: [objA('Dog.prototype', [prop('name', str('Rex'), true)])],
    }),
    output: [],
  },
  {
    title: 'Animal 반환: 기본 생성자가 객체 A를 돌려줌, pet에 들어감',
    explanation:
      '기본 생성자는 Animal이 돌려준 객체에 Dog의 필드를 초기화한 뒤(Dog에는 필드가 없습니다) 그 객체를 돌려줍니다. new 식의 결과인 객체 A가 변수 pet에 들어갑니다.',
    line: at(14),
    state: state({
      classes: smClasses(),
      objects: smObjects(),
      bindings: [bind('pet', ref('a'), true)],
    }),
    output: [],
  },
  {
    title: 'pet.speak(): A에는 없고 Dog.prototype에서 찾음',
    explanation:
      'pet은 객체 A를 가리킵니다. A에는 speak라는 자기 프로퍼티가 없어서 [[Prototype]]인 Dog.prototype에서 찾습니다. 메서드 안의 this는 호출에 쓴 pet, 즉 객체 A입니다.',
    line: at(15),
    state: state({
      classes: smClasses(),
      objects: smObjects(),
      bindings: [bind('pet', ref('a'))],
      lookup: smPetLookup,
    }),
    output: [],
  },
  {
    title: 'super.speak(): Animal.prototype에서 찾음, this는 그대로 A',
    explanation:
      'super.speak는 현재 메서드의 HomeObject(Dog.prototype)의 [[Prototype]]에서 찾기 시작하므로 Animal.prototype의 speak를 얻습니다. 이 메서드를 부를 때의 this는 현재 this인 객체 A 그대로입니다.',
    line: at(11),
    state: state({
      classes: smClasses(),
      objects: smObjects(),
      bindings: [bind('pet', ref('a'))],
      lookup: smSuperLookup,
    }),
    output: [],
  },
  {
    title: 'Animal.prototype.speak 본문: this.name은 A의 name',
    explanation:
      "이 메서드의 this는 객체 A이므로 this.name은 'Rex'이고, 'Rex makes a sound'를 만들어 돌려줍니다.",
    line: at(6),
    state: state({
      classes: smClasses(),
      objects: smObjects(),
      bindings: [bind('pet', ref('a'))],
      lookup: smSuperLookup,
    }),
    output: [],
  },
  {
    title: 'speak()가 돌아와 Rex makes a sound (woof) 출력',
    explanation:
      "Dog.prototype의 speak가 super.speak()의 결과 'Rex makes a sound'에 ' (woof)'를 붙여 돌려주고, console.log가 그 값을 출력합니다.",
    line: at(15),
    state: state({
      classes: smClasses(),
      objects: smObjects(),
      bindings: [bind('pet', ref('a'))],
    }),
    output: ['Rex makes a sound (woof)'],
  },
  {
    title: 'hasOwnProperty: speak는 Dog.prototype의 프로퍼티, false true 출력',
    explanation:
      'speak 메서드는 Dog.prototype에 정의되어 있고 pet(객체 A)의 자기 프로퍼티가 아닙니다. 그래서 pet.hasOwnProperty는 false, Dog.prototype.hasOwnProperty는 true입니다.',
    line: at(16),
    state: state({
      classes: smClasses(),
      objects: smObjects(),
      bindings: [bind('pet', ref('a'))],
    }),
    output: ['Rex makes a sound (woof)', 'false true'],
  },
]

// --- 시나리오 4: 필드 초기화 순서 ---------------------------------------------------------------

const foBase = cls('Base', 'base', null, { methods: ['describe'] })
const foDerived = cls('Derived', 'derived', 'Base', {
  methods: ['describe'],
  fields: ['label'],
  hasOwnConstructor: false,
})

const foFrameDerived = frame('Derived', 'default-derived', 'Derived', [], 'none')
const foFrameBase = frame('Base', 'base', 'Derived', [], ref('a'))

const foText = prop('text', str('label=undefined'))
const foClasses = () => [foBase(), foDerived()]
const foD = (changed = false) => [bind('d', ref('a'), changed)]

const foThisLookup: Lookup = {
  expr: 'this.describe()',
  startAt: '객체 A',
  foundIn: 'Derived.prototype',
  thisValue: ref('a'),
}

const fieldOrderSteps: InheritStep[] = [
  { title: '실행 전', explanation: intro, state: empty, output: [] },
  {
    title: 'class Base 평가',
    explanation: `Base 클래스가 만들어집니다. describe 메서드는 Base.prototype에 놓입니다. ${baseClassNote}`,
    line: span(1, 8),
    state: state({ classes: [foBase(true)] }),
    output: [],
  },
  {
    title: 'class Derived extends Base 평가',
    explanation: `${derivedClassNote('Derived', 'Base')} Derived는 생성자를 쓰지 않아 기본 생성자가 쓰이고, 인스턴스 필드 label과 describe 메서드가 있습니다. 아직 만들어진 객체는 없습니다.`,
    line: span(9, 14),
    state: state({ classes: [foBase(), foDerived(true)] }),
    output: [],
  },
  {
    title: 'new Derived(): 기본 생성자 호출, this 바인딩은 없음',
    explanation:
      '기본 생성자는 constructor(...args) { super(...args) }와 비슷하게 동작하는 내장 함수라서 this 바인딩이 없습니다. 만들어진 객체도 아직 없고, new.target은 Derived입니다.',
    line: at(15),
    state: state({ classes: foClasses(), frames: [foFrameDerived] }),
    output: [],
  },
  {
    title: '기본 생성자가 Base를 호출: 객체 A 생성',
    explanation:
      '기본 생성자가 new.target(Derived)을 그대로 넘겨 부모 Base를 생성자로 호출하고, 기본 클래스 Base의 [[Construct]]가 새 객체 A를 만듭니다. A의 [[Prototype]]은 Derived.prototype이고, 자기 프로퍼티는 아직 없습니다.',
    line: at(15),
    state: state({
      classes: foClasses(),
      frames: [foFrameDerived, foFrameBase],
      objects: [objA('Derived.prototype', [], true)],
    }),
    output: [],
  },
  {
    title: 'this.describe(): Derived.prototype의 describe를 찾음',
    explanation:
      'Base 생성자 안의 this는 객체 A이고, A의 [[Prototype]]이 Derived.prototype이므로 오버라이드된 Derived의 describe가 선택됩니다. 부모 생성자 안에서 부른 것이어도 마찬가지입니다.',
    line: at(3),
    state: state({
      classes: foClasses(),
      frames: [foFrameDerived, foFrameBase],
      objects: [objA('Derived.prototype', [])],
      lookup: foThisLookup,
    }),
    output: [],
  },
  {
    title: 'this.label: A에 label이 아직 없어 undefined',
    explanation:
      'Derived의 필드는 부모 생성자가 끝난 뒤에 초기화되므로, 이 시점의 객체 A에는 label이 없고 프로토타입 체인에도 없습니다. 읽은 값은 undefined이고 describe는 "label=undefined"를 돌려줍니다.',
    line: at(12),
    state: state({
      classes: foClasses(),
      frames: [foFrameDerived, foFrameBase],
      objects: [objA('Derived.prototype', [])],
      lookup: foThisLookup,
    }),
    output: [],
  },
  {
    title: 'this.text = ...: A에 text 추가',
    explanation: "describe가 돌려준 'label=undefined'가 A의 text 프로퍼티로 들어갑니다.",
    line: at(3),
    state: state({
      classes: foClasses(),
      frames: [foFrameDerived, foFrameBase],
      objects: [objA('Derived.prototype', [prop('text', str('label=undefined'), true)])],
    }),
    output: [],
  },
  {
    title: 'Base 반환: 아직 label은 초기화 전',
    explanation:
      'Base 생성자가 끝나 객체 A를 돌려주고 기본 생성자로 돌아왔습니다. Derived의 필드는 아직 초기화되기 전이라 A에는 text만 있습니다.',
    line: at(15),
    state: state({
      classes: foClasses(),
      frames: [foFrameDerived],
      objects: [objA('Derived.prototype', [foText])],
    }),
    output: [],
  },
  {
    title: "label 필드 초기화: A에 label = 'derived' 추가",
    explanation:
      "부모 생성자가 돌아온 뒤에야 Derived의 필드가 객체 A에 초기화됩니다(InitializeInstanceElements). 이때 A에 label 프로퍼티('derived')가 생깁니다.",
    line: at(10),
    state: state({
      classes: foClasses(),
      frames: [foFrameDerived],
      objects: [objA('Derived.prototype', [foText, prop('label', str('derived'), true)])],
    }),
    output: [],
  },
  {
    title: 'Derived 반환: new 식의 결과가 d에 들어감',
    explanation: '기본 생성자가 객체 A를 돌려주고, new 식의 결과인 A가 변수 d에 들어갑니다.',
    line: at(15),
    state: state({
      classes: foClasses(),
      objects: [objA('Derived.prototype', [foText, prop('label', str('derived'))])],
      bindings: foD(true),
    }),
    output: [],
  },
  {
    title: 'console.log(d.text): label=undefined 출력',
    explanation:
      "text는 Base 생성자 안에서, label이 아직 없을 때 만들어진 값이므로 'label=undefined'입니다.",
    line: at(16),
    state: state({
      classes: foClasses(),
      objects: [objA('Derived.prototype', [foText, prop('label', str('derived'))])],
      bindings: foD(),
    }),
    output: ['label=undefined'],
  },
  {
    title: 'console.log(d.label): derived 출력',
    explanation: "생성이 끝난 뒤의 d에는 label이 있고 값은 'derived'입니다.",
    line: at(17),
    state: state({
      classes: foClasses(),
      objects: [objA('Derived.prototype', [foText, prop('label', str('derived'))])],
      bindings: foD(),
    }),
    output: ['label=undefined', 'derived'],
  },
]

export const scenarios: Scenario<InheritState>[] = [
  {
    id: 'construct-derived',
    label: '파생 클래스 객체 만들기',
    exampleId: 'construct-derived',
    code: constructDerivedCode,
    steps: constructDerivedSteps,
  },
  {
    id: 'this-before-super',
    label: 'super() 전에 this',
    exampleId: 'this-before-super',
    code: thisBeforeSuperCode,
    steps: thisBeforeSuperSteps,
  },
  {
    id: 'super-method',
    label: 'super.method() 호출',
    exampleId: 'super-method',
    code: superMethodCode,
    steps: superMethodSteps,
  },
  {
    id: 'field-order',
    label: '필드 초기화 순서',
    exampleId: 'field-order',
    code: fieldOrderCode,
    steps: fieldOrderSteps,
  },
]
