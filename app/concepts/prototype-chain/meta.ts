import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'prototype-chain',
  title: '프로토타입 체인: 없는 프로퍼티는 어디서 찾을까',
  summary:
    '객체에 없는 프로퍼티는 [[Prototype]]이 가리키는 객체에서 이어 찾고 null에서 끝납니다. prototype 프로퍼티와 [[Prototype]]은 다릅니다. 대입은 보통 그 객체에 자기 프로퍼티를 만들지만, 상속된 읽기 전용 프로퍼티나 setter가 있으면 달라집니다.',
  category: 'objects',
  tags: [
    '프로토타입',
    'prototype',
    '[[Prototype]]',
    '프로토타입 체인',
    '상속',
    '섀도잉',
    'Object.create',
    'Object.getPrototypeOf',
    'Object.hasOwn',
    'in',
    'for...in',
    'instanceof',
    'constructor',
    '__proto__',
  ],
  goals: [
    '프로퍼티를 읽을 때 자기 프로퍼티가 없으면 [[Prototype]]을 따라 찾는 순서와, null에 닿으면 undefined로 끝나는 것을 설명할 수 있다.',
    '함수의 prototype 프로퍼티와 객체의 [[Prototype]]을 구분하고, new와 Object.create가 새 객체의 [[Prototype]]을 정하는 방식을 설명할 수 있다.',
    '프로퍼티 대입이 프로토타입을 바꾸지 않고 대입한 객체에 자기 프로퍼티를 만드는 것(섀도잉)과, 상속된 읽기 전용 프로퍼티·setter가 있을 때의 결과를 예측할 수 있다.',
    'in, Object.hasOwn, for...in, instanceof가 프로토타입 체인을 어떻게 보는지 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: 'new 연산자', slug: 'new-operator' },
  ],
  related: ['scope-chain'],
  examples: [
    {
      id: 'literal',
      file: 'literal.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'function', 'false', 'null', 'undefined'],
    },
    {
      id: 'chain',
      file: 'chain.js',
      runtime: 'ecmascript',
      expectedOutput: ['JS', 'ko', 'book', 'undefined'],
    },
    {
      id: 'prototype-property',
      file: 'prototype-property.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'true', 'book', 'undefined', 'true'],
    },
    {
      id: 'shared',
      file: 'shared.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', 'book', 'book', '{"title":"JS"}'],
    },
    {
      id: 'shadowing',
      file: 'shadowing.js',
      runtime: 'ecmascript',
      expectedOutput: ['red', 'blue', 'red', 'true', 'red'],
    },
    {
      id: 'inherited-readonly',
      file: 'inherited-readonly.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', 'false', '2', '1'],
    },
    {
      id: 'inherited-setter',
      file: 'inherited-setter.js',
      runtime: 'ecmascript',
      expectedOutput: ['JS', 'false', 'undefined'],
    },
    {
      id: 'in-hasown',
      file: 'in-hasown.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true', 'true', 'true', 'false'],
    },
    {
      id: 'for-in',
      file: 'for-in.js',
      runtime: 'ecmascript',
      expectedOutput: ['title', 'kind', 'lang'],
    },
    {
      id: 'null-prototype',
      file: 'null-prototype.js',
      runtime: 'ecmascript',
      expectedOutput: ['null', 'false', 'undefined', 'true', 'true'],
    },
    {
      id: 'instanceof',
      file: 'instanceof.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true', 'false', 'true', 'true', '{}'],
    },
  ],
  simplifications: [
    '[[Prototype]]·[[Get]]·[[Set]]은 명세의 내부 슬롯·내부 메서드 이름이며 코드에서 직접 접근할 수 없습니다. 이 페이지는 Object.getPrototypeOf로 읽습니다. 이 페이지의 설명은 명세의 일반 객체(ordinary object) 기준이며, Proxy처럼 이 동작을 바꿀 수 있는 특수 객체는 별도 개념입니다. 시뮬레이터의 카드와 화살표는 교육용 그림이며 엔진이 객체를 저장하는 방식이 아닙니다.',
    '__proto__는 Object.prototype의 접근자 프로퍼티이며 명세에서 "Normative Optional, Legacy"로 분류됩니다. [[Prototype]] 슬롯 자체가 아니고, null 프로토타입 객체에는 없습니다. 객체 리터럴의 __proto__: 문법과 Object.setPrototypeOf는 다루지 않습니다.',
    '상속된 메서드를 호출할 때의 this는 별도 개념입니다. 예제는 this를 쓰지 않습니다. 상속된 getter·setter는 명세상 읽거나 대입한 객체(receiver)를 this로 호출되지만 예제는 바깥 변수만 씁니다.',
    'instanceof는 명세상 오른쪽 값의 Symbol.hasInstance 메서드를 먼저 확인하고, 일반 함수는 Function.prototype의 그 메서드가 이 페이지의 체인 비교(OrdinaryHasInstance)를 합니다. Symbol.hasInstance를 직접 정의한 경우와 bind로 만든 함수는 다루지 않습니다.',
    'for...in의 순서는 명세가 일부만 정합니다. 이 페이지의 예제처럼 일반 객체이고 열거하는 동안 체인과 프로퍼티가 바뀌지 않으면 자기 프로퍼티 다음 프로토타입 순서입니다. Symbol 키는 열거하지 않습니다. 배열을 돌려주는 Object.keys 등은 별도 개념입니다.',
    '시뮬레이터의 Object.prototype·Function.prototype 카드는 이 페이지에 필요한 프로퍼티만 보이고 나머지는 생략합니다. instanceof 시나리오는 Book의 [[Prototype]](Function.prototype)을 카드 없이 이름으로만 표시합니다.',
    'new Book(...)의 내부 단계(새 객체 생성, this 연결, 본문 실행)는 new 연산자 개념에서 다루고, 시뮬레이터는 한 단계로 그립니다. 함수 선언은 선언 처리로 실행 전에 만들어지므로(호이스팅 개념) 0단계부터 보입니다.',
    '클래스와 extends로 만드는 체인, 원시 값의 프로퍼티 접근(래퍼 객체)은 별도 개념에서 다룹니다.',
    '예제 6을 파일로 실행할 때 .mjs 파일이거나 package.json에 "type": "module"이 있으면 모듈이라 항상 strict mode여서 4번 줄에서 TypeError가 납니다. 클래식 스크립트나 CommonJS(.cjs)로 실행하면 이 페이지의 결과와 같습니다.',
    '시뮬레이터는 선언문이 실행된 변수만 보이며 console·JSON·Object.getPrototypeOf 호출 과정과 Object·Function 바인딩을 생략합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — OrdinaryGet',
      url: 'https://tc39.es/ecma262/#sec-ordinaryget',
    },
    {
      label: 'ECMAScript 명세 — OrdinarySetWithOwnDescriptor',
      url: 'https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryHasProperty',
      url: 'https://tc39.es/ecma262/#sec-ordinaryhasproperty',
    },
    {
      label: 'ECMAScript 명세 — Object.hasOwn ( O, P )',
      url: 'https://tc39.es/ecma262/#sec-object.hasown',
    },
    {
      label: 'ECMAScript 명세 — EnumerateObjectProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerate-object-properties',
    },
    {
      label: 'ECMAScript 명세 — Object.create ( O [ , Properties ] )',
      url: 'https://tc39.es/ecma262/#sec-object.create',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryObjectCreate',
      url: 'https://tc39.es/ecma262/#sec-ordinaryobjectcreate',
    },
    {
      label: 'ECMAScript 명세 — Object.getPrototypeOf ( O )',
      url: 'https://tc39.es/ecma262/#sec-object.getprototypeof',
    },
    {
      label: 'ECMAScript 명세 — MakeConstructor',
      url: 'https://tc39.es/ecma262/#sec-makeconstructor',
    },
    {
      label: 'ECMAScript 명세 — InstanceofOperator',
      url: 'https://tc39.es/ecma262/#sec-instanceofoperator',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryHasInstance',
      url: 'https://tc39.es/ecma262/#sec-ordinaryhasinstance',
    },
    {
      label: 'ECMAScript 명세 — Object.prototype.__proto__',
      url: 'https://tc39.es/ecma262/#sec-object.prototype.__proto__',
    },
    {
      label: 'MDN — 상속과 프로토타입 체인',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Inheritance_and_the_prototype_chain',
    },
    {
      label: 'MDN — Object.getPrototypeOf()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/getPrototypeOf',
    },
    {
      label: 'MDN — Object.create()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/create',
    },
    {
      label: 'MDN — Object.hasOwn()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn',
    },
    {
      label: 'MDN — in 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/in',
    },
    {
      label: 'MDN — instanceof 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/instanceof',
    },
    {
      label: 'MDN — for...in',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/for...in',
    },
    {
      label: 'MDN — Object.prototype.__proto__',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/proto',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
