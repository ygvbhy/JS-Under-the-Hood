import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'array-index-length',
  title: '배열은 객체다: 인덱스와 length는 어떻게 움직일까',
  summary:
    '배열은 length라는 특별한 프로퍼티를 가진 객체이고 인덱스는 문자열 프로퍼티 키입니다. 인덱스나 length에 대입하면 명세가 둘을 함께 맞추고, 구멍은 프로퍼티가 없는 인덱스입니다.',
  category: 'objects',
  order: 260,
  tags: [
    '배열',
    'array',
    '인덱스',
    'length',
    '희소 배열',
    'sparse array',
    '구멍',
    'Array.isArray',
    'Array.of',
    '유사 배열',
    'array index',
    'ArraySetLength',
  ],
  goals: [
    "배열이 객체이고 인덱스가 문자열 프로퍼티 키라는 것을 Object.keys 결과와 fruits[1]·fruits['1']로 설명할 수 있다.",
    'length 이상인 인덱스에 대입하면 length가 인덱스 + 1이 되고, length에 작은 값을 대입하면 그 이상인 인덱스 프로퍼티가 지워지는 과정을 설명할 수 있다.',
    '구멍(프로퍼티가 없는 인덱스)과 undefined 값의 차이, delete가 length를 줄이지 않는 이유를 설명할 수 있다.',
    "-1·'01'·1.5·4294967295가 배열 인덱스가 아니어서 length를 바꾸지 않는 이유와 new Array(3)·Array.of(3)의 차이를 설명할 수 있다.",
  ],
  prerequisites: [
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
  ],
  related: [
    'property-keys',
    'property-attributes',
    'prototype-chain',
    'arrow-functions',
    'typeof-operator',
  ],
  examples: [
    {
      id: 'index-keys',
      file: 'index-keys.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'object true',
        '["0","1"] banana',
        '5 false undefined',
        '5 ["0","1","4","color"]',
      ],
    },
    {
      id: 'shrink-length',
      file: 'shrink-length.js',
      runtime: 'ecmascript',
      expectedOutput: ['[10,20] false', '4 false undefined', '["0","1","3"]'],
    },
    {
      id: 'holes',
      file: 'holes.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 false undefined', '3 true undefined', '3 false ["0","1"]'],
    },
    {
      id: 'not-index-keys',
      file: 'not-index-keys.js',
      runtime: 'ecmascript',
      expectedOutput: ['0 ["-1","01","1.5","4294967295"]', '4294967295'],
    },
    {
      id: 'length-property',
      file: 'length-property.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"value":3,"writable":true,"enumerable":false,"configurable":false}',
        'RangeError',
        'RangeError',
        '2 false',
      ],
    },
    {
      id: 'array-constructor',
      file: 'array-constructor.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 false []', '[3,4] ["3"]', '[3] 3', 'RangeError'],
    },
    {
      id: 'hole-iteration',
      file: 'hole-iteration.js',
      runtime: 'ecmascript',
      expectedOutput: ['["0","2"] ["0","2"]', '[1,null,3] [1,null,3]'],
    },
  ],
  simplifications: [
    '배열이 엔진 안에서 메모리에 어떻게 놓이는지(연속 메모리인지 해시 테이블인지 등)는 명세가 정하지 않으므로 다루지 않고, 명세가 정의한 프로퍼티 동작만 설명합니다.',
    '배열 메서드(push, map, forEach 등)와 이터러블·스프레드·Array.from은 이 사이트에서 아직 다루지 않은 별도 개념입니다. 예제 7의 push는 키를 모으는 용도로만 쓰며, 배열 끝에 요소를 추가하는 메서드(별도 개념)입니다.',
    'length의 writable이 false인 경우와, configurable이 false인 요소 때문에 length 줄이기가 중간에 멈추는 경로는 다루지 않습니다.',
    '시뮬레이터는 length를 뺀 자기 프로퍼티만 그리고, 프로토타입(Array.prototype)은 그리지 않습니다.',
    '시뮬레이터의 칸 보기(0부터 length - 1까지 늘어놓은 표)는 이해를 돕는 설명용 표현이며, 엔진의 저장 구조가 아닙니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 별도 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Array Exotic Objects',
      url: 'https://tc39.es/ecma262/#sec-array-exotic-objects',
    },
    {
      label: 'ECMAScript 명세 — Array Exotic Objects의 [[DefineOwnProperty]]',
      url: 'https://tc39.es/ecma262/#sec-array-exotic-objects-defineownproperty-p-desc',
    },
    {
      label: 'ECMAScript 명세 — ArraySetLength',
      url: 'https://tc39.es/ecma262/#sec-arraysetlength',
    },
    {
      label: 'ECMAScript 명세 — ArrayCreate',
      url: 'https://tc39.es/ecma262/#sec-arraycreate',
    },
    {
      label: 'ECMAScript 명세 — The Object Type (array index 정의)',
      url: 'https://tc39.es/ecma262/#sec-object-type',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryOwnPropertyKeys',
      url: 'https://tc39.es/ecma262/#sec-ordinaryownpropertykeys',
    },
    {
      label: 'ECMAScript 명세 — Array Initializer',
      url: 'https://tc39.es/ecma262/#sec-array-initializer',
    },
    {
      label: 'ECMAScript 명세 — Array ( ...values )',
      url: 'https://tc39.es/ecma262/#sec-array-len',
    },
    {
      label: 'ECMAScript 명세 — Array.of',
      url: 'https://tc39.es/ecma262/#sec-array.of',
    },
    {
      label: 'MDN — Array',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array',
    },
    {
      label: 'MDN — Array: length',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/length',
    },
    {
      label: 'MDN — Array() 생성자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/Array',
    },
    {
      label: 'MDN — Array.of()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/of',
    },
    {
      label: 'MDN — 인덱스 기반 컬렉션 (희소 배열)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Indexed_collections',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
