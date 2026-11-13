import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'property-order',
  title: '프로퍼티 순서: Object.keys는 어떤 순서로 키를 줄까',
  summary:
    "객체의 키 나열 순서는 명세가 정합니다. '2' 같은 배열 인덱스 키는 작은 수부터, 나머지 문자열 키는 만든 순서입니다. '01'·'-1'은 그 밖의 문자열 키이며, 값을 바꿔도 자리는 그대로이고 delete 뒤 다시 만든 그 밖의 문자열 키는 그 묶음의 맨 뒤로 갑니다.",
  category: 'objects',
  order: 175,
  tags: [
    '키 순서',
    '프로퍼티 순서',
    'Object.keys',
    'Object.values',
    'Object.entries',
    'getOwnPropertyNames',
    'for...in',
    '배열 인덱스',
    'OrdinaryOwnPropertyKeys',
    '열거 순서',
  ],
  goals: [
    '객체에 키를 만든 순서가 주어지면 Object.keys가 돌려주는 키 순서(배열 인덱스 형태의 키는 작은 수부터, 나머지 문자열 키는 만든 순서)를 예측할 수 있다.',
    "'10'·'9'·'01'·'1.5'·'-1'·'4294967294'·'4294967295' 중 어느 것이 배열 인덱스이고 어느 것이 아닌지(경계는 2^32 − 2) 판별할 수 있다.",
    '이미 있는 키에 다시 대입하면 자리가 그대로이고 delete한 뒤 다시 만든 그 밖의 문자열 키는 맨 뒤로 가는 이유를 설명할 수 있다.',
    'Object.values·Object.entries·Object.getOwnPropertyNames와 for...in의 순서를 비교하고, 명세가 for...in 순서를 정하는 조건을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
  ],
  related: ['prototype-chain', 'array-index-length', 'symbol', 'set-map', 'json'],
  examples: [
    {
      id: 'basic-order',
      file: 'basic-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['["1","2","title","author"]', '["1","2","title","author"]'],
    },
    {
      id: 'not-index',
      file: 'not-index.js',
      runtime: 'ecmascript',
      expectedOutput: ['["9","10","4294967294","01","1.5","-1","4294967295"]'],
    },
    {
      id: 'reassign-delete',
      file: 'reassign-delete.js',
      runtime: 'ecmascript',
      expectedOutput: ['["name","age","city"]', '["age","city","name"]'],
    },
    {
      id: 'values-names',
      file: 'values-names.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '["one","B","A","C"]',
        '[["1","one"],["b","B"],["a","A"],["c","C"]]',
        '["1","b","a","hidden","c"]',
      ],
    },
    {
      id: 'for-in-order',
      file: 'for-in-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['3', 'b', 'shared', '7', 'z'],
    },
  ],
  simplifications: [
    'OrdinaryOwnPropertyKeys 같은 명세의 추상 연산은 코드에서 직접 부를 수 없습니다. 이 페이지는 Object.keys 등의 결과로 그 규칙을 확인합니다. 내부 메서드 [[OwnPropertyKeys]]의 결과를 심벌 키까지 그대로 돌려주는 Reflect.ownKeys가 가장 직접 관찰하는 방법이지만, 이 페이지에서는 다루지 않습니다(심벌 개념의 예제가 씁니다).',
    '시뮬레이터의 두 칸 그림은 명세의 나열 규칙을 보이기 위한 설명용 표현이며, 엔진이 키를 두 칸에 나눠 저장한다는 뜻이 아닙니다.',
    '심벌 키는 나열 순서의 마지막 묶음이지만 심벌 개념에서 다룹니다.',
    "배열의 인덱스와 length 동작은 '배열은 객체다' 개념에서, Map과 Set의 삽입 순서는 Set과 Map 개념에서, JSON.stringify의 키 순서는 JSON 개념에서 다룹니다. 예제는 출력에 JSON.stringify를 쓰지만 결과 문자열을 확인하는 용도입니다.",
    'Object.assign과 객체 스프레드도 같은 순서를 쓰지만 이 페이지에서는 다루지 않습니다.',
    'Proxy·TypedArray·String 객체처럼 자기 키 목록을 다르게 정하는 특수 객체는 다루지 않습니다.',
    'for...in에서 명세가 순서를 정하지 않는 경우(대상 객체나 그 프로토타입 체인에 Proxy, TypedArray, 모듈 네임스페이스 객체, 구현이 제공하는 특수 객체가 있을 때, 열거 도중 프로토타입 변경·프로퍼티 제거·체인 객체에 프로퍼티 추가·열거 가능 여부 변경이 일어난 뒤)는 이름만 언급하고 예제로 보이지 않습니다.',
    '이미 있는 키를 defineProperty로 다시 정의해도 위치가 그대로인 경우만 언급하고, 접근자와 데이터 프로퍼티 사이의 전환은 다루지 않습니다.',
    '명세 판에 따른 변화는 2019판과 2020판의 EnumerableOwnPropertyNames 문장만 비교합니다.',
    '시뮬레이터는 바깥 변수 찾기와 console·JSON 호출을 보이지 않고, 키 목록의 변화만 보입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — OrdinaryOwnPropertyKeys',
      url: 'https://tc39.es/ecma262/#sec-ordinaryownpropertykeys',
    },
    {
      label: 'ECMAScript 명세 — array index',
      url: 'https://tc39.es/ecma262/#array-index',
    },
    {
      label: 'ECMAScript 명세 — EnumerableOwnProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerableownproperties',
    },
    {
      label: 'ECMAScript 명세 — EnumerateObjectProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerate-object-properties',
    },
    {
      label: 'ECMAScript 명세 2019판 — EnumerableOwnPropertyNames',
      url: 'https://tc39.es/ecma262/2019/#sec-enumerableownpropertynames',
    },
    {
      label: 'ECMAScript 명세 2020판 — EnumerableOwnPropertyNames',
      url: 'https://tc39.es/ecma262/2020/#sec-enumerableownpropertynames',
    },
    {
      label: 'MDN — Object.keys()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/keys',
    },
    {
      label: 'MDN — for...in',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/for...in',
    },
    {
      label: 'MDN — 프로퍼티의 열거 가능성과 소유권',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Enumerability_and_ownership_of_properties',
    },
  ],
  reviewedAt: '2026-11-13',
} satisfies ConceptMeta
