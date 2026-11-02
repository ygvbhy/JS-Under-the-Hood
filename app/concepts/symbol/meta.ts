import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'symbol',
  title: "심벌: Symbol('id')끼리는 왜 같지 않을까",
  summary:
    'Symbol()은 설명이 같아도 호출할 때마다 다른 값을 만들어, 프로퍼티 키로 쓰면 다른 키와 충돌하지 않습니다. Symbol.for, 심벌 키를 건너뛰는 연산과 보여 주는 연산, well-known 심벌을 명세로 확인합니다.',
  category: 'objects',
  order: 300,
  tags: [
    '심벌',
    'symbol',
    'Symbol.for',
    'Symbol.keyFor',
    'description',
    '프로퍼티 키',
    'getOwnPropertySymbols',
    'Object.assign',
    'Reflect.ownKeys',
    'well-known symbol',
    'Symbol.toStringTag',
    'Symbol.toPrimitive',
  ],
  goals: [
    "Symbol('id')를 호출할 때마다 새 심벌이 만들어지고 description은 이름표일 뿐이라 ===가 동일성으로 비교해 false가 되는 이유를 설명할 수 있다.",
    'Symbol.for가 전역 심벌 레지스트리에서 같은 키의 심벌을 찾거나 등록하는 방식과, Symbol.keyFor가 일반 심벌과 well-known 심벌에 undefined를 돌려주는 이유를 설명할 수 있다.',
    '심벌을 대괄호 표기로 프로퍼티 키에 써서 같은 설명의 심벌끼리 충돌하지 않게 하는 방법과, for...in·Object.keys·JSON.stringify·Object.assign·getOwnPropertySymbols가 심벌 키를 다루는 방식을 예측하고 심벌 키가 비공개가 아니라는 것을 말할 수 있다.',
    'Reflect.ownKeys가 보여 주는 키 나열 순서(배열 인덱스 형태의 키, 그 밖의 문자열 키, 심벌 키)를 예측하고, Symbol.toStringTag와 Symbol.toPrimitive로 내장 연산의 동작을 바꾸는 방법을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '원시 값의 메서드', slug: 'primitive-methods' },
  ],
  related: [
    'property-keys',
    'property-attributes',
    'primitive-methods',
    'type-coercion',
    'typeof-operator',
    'prototype-chain',
    'class-basics',
  ],
  examples: [
    {
      id: 'unique',
      file: 'unique.js',
      runtime: 'ecmascript',
      expectedOutput: ['false true', 'symbol id Symbol(id)', 'undefined Symbol()'],
    },
    {
      id: 'registry',
      file: 'registry.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false', 'app.id app.id', 'undefined undefined'],
    },
    {
      id: 'symbol-key',
      file: 'symbol-key.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 2 2', 'true true', 'undefined true'],
    },
    {
      id: 'no-collision',
      file: 'no-collision.js',
      runtime: 'ecmascript',
      expectedOutput: ['lib-b', 'lib-a lib-b 2', '["name","tag"]'],
    },
    {
      id: 'not-private',
      file: 'not-private.js',
      runtime: 'ecmascript',
      expectedOutput: ['["label"] ["label"]', '{"label":"box"} ["label"]', '1 true 42', 'true'],
    },
    {
      id: 'assign-json',
      file: 'assign-json.js',
      runtime: 'ecmascript',
      expectedOutput: ['T 2 1', '{"a":1}', '{"n":1} [null,1]'],
    },
    {
      id: 'key-order',
      file: 'key-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['["1","2","b","a"]', '1, 2, b, a, Symbol(s)'],
    },
    {
      id: 'well-known',
      file: 'well-known.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '[object Point] [object Point]',
        '100 price:string price:default',
        'symbol Symbol.iterator',
      ],
    },
  ],
  simplifications: [
    '이터러블과 Symbol.iterator, for...of(34장), 스프레드 문법(35장)은 별도 개념이라 한 줄 언급만 합니다.',
    'Symbol.hasInstance, Symbol.species, Symbol.match 같은 다른 well-known 심벌은 이름만 언급하고 다루지 않습니다.',
    '참고 링크가 가리키는 현재 명세 초안(ES2027 draft)은 전역 심벌 레지스트리를 에이전트(agent)마다 하나인 목록으로 정의합니다. 발행된 ES2026판까지는 모든 렐름이 공유하는 하나의 목록으로 적었습니다. 렐름 사이의 공유와 WeakMap의 심벌 키는 다루지 않습니다.',
    '키 순서는 일반 객체의 OrdinaryOwnPropertyKeys 기준이며 프록시 같은 다른 객체는 다룰 범위 밖입니다. for...in의 순서는 명세가 일부만 정하므로 예제로 쓰지 않습니다.',
    'JSON.stringify는 43장에서 다루는 주제이며, 이 페이지에서는 심벌을 처리하는 방식만 살펴봅니다.',
    'JSON.stringify가 객체의 키를 EnumerableOwnProperties로 모은다는 설명은 두 번째 인수(replacer)로 배열을 넘기지 않은 경우 기준입니다. 배열을 넘기면 그 배열에 든 문자열·숫자로 키 목록이 정해지고, replacer 함수는 각 값을 바꿀 수 있습니다.',
    'Reflect는 키 목록을 그대로 보여 주는 Reflect.ownKeys를 확인하는 용도로만 씁니다.',
    '내장 프로토타입에 심벌 메서드를 붙이는 확장은 권장하지 않는 관행이라 다루지 않습니다.',
    'private 필드는 프로퍼티 키가 아니며 클래스는 함수다 페이지에서 다룹니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The Symbol Type',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type',
    },
    {
      label: 'ECMAScript 명세 — Well-Known Symbols',
      url: 'https://tc39.es/ecma262/#sec-well-known-symbols',
    },
    {
      label: 'ECMAScript 명세 — Symbol ( [ description ] )',
      url: 'https://tc39.es/ecma262/#sec-symbol-description',
    },
    {
      label: 'ECMAScript 명세 — Symbol.for',
      url: 'https://tc39.es/ecma262/#sec-symbol.for',
    },
    {
      label: 'ECMAScript 명세 — Symbol.keyFor',
      url: 'https://tc39.es/ecma262/#sec-symbol.keyfor',
    },
    {
      label: 'ECMAScript 명세 — get Symbol.prototype.description',
      url: 'https://tc39.es/ecma262/#sec-symbol.prototype.description',
    },
    {
      label: 'ECMAScript 명세 — SymbolDescriptiveString',
      url: 'https://tc39.es/ecma262/#sec-symboldescriptivestring',
    },
    {
      label: 'ECMAScript 명세 — SameValueNonNumber',
      url: 'https://tc39.es/ecma262/#sec-samevaluenonnumber',
    },
    {
      label: 'ECMAScript 명세 — ToPropertyKey',
      url: 'https://tc39.es/ecma262/#sec-topropertykey',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryOwnPropertyKeys',
      url: 'https://tc39.es/ecma262/#sec-ordinaryownpropertykeys',
    },
    {
      label: 'ECMAScript 명세 — EnumerableOwnProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerableownproperties',
    },
    {
      label: 'ECMAScript 명세 — GetOwnPropertyKeys',
      url: 'https://tc39.es/ecma262/#sec-getownpropertykeys',
    },
    {
      label: 'ECMAScript 명세 — EnumerateObjectProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerate-object-properties',
    },
    {
      label: 'ECMAScript 명세 — Object.assign',
      url: 'https://tc39.es/ecma262/#sec-object.assign',
    },
    {
      label: 'ECMAScript 명세 — SerializeJSONProperty',
      url: 'https://tc39.es/ecma262/#sec-serializejsonproperty',
    },
    {
      label: 'ECMAScript 명세 — Reflect.ownKeys',
      url: 'https://tc39.es/ecma262/#sec-reflect.ownkeys',
    },
    {
      label: 'ECMAScript 명세 — Object.prototype.toString',
      url: 'https://tc39.es/ecma262/#sec-object.prototype.tostring',
    },
    {
      label: 'ECMAScript 명세 — ToPrimitive',
      url: 'https://tc39.es/ecma262/#sec-toprimitive',
    },
    {
      label: 'ECMAScript 명세 — Symbol.toStringTag',
      url: 'https://tc39.es/ecma262/#sec-symbol.tostringtag',
    },
    {
      label: 'ECMAScript 명세 — Symbol.toPrimitive',
      url: 'https://tc39.es/ecma262/#sec-symbol.toprimitive',
    },
    {
      label: 'MDN — Symbol',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol',
    },
    {
      label: 'MDN — Symbol.for()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol/for',
    },
    {
      label: 'MDN — Symbol.keyFor()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol/keyFor',
    },
    {
      label: 'MDN — Symbol.prototype.description',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol/description',
    },
    {
      label: 'MDN — Object.getOwnPropertySymbols()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols',
    },
    {
      label: 'MDN — Object.assign()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/assign',
    },
    {
      label: 'MDN — Reflect.ownKeys()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Reflect/ownKeys',
    },
    {
      label: 'MDN — Symbol.toStringTag',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag',
    },
    {
      label: 'MDN — Symbol.toPrimitive',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
