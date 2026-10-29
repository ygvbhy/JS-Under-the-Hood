import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'primitive-methods',
  title: '원시 값의 메서드 호출: 객체가 아닌데 메서드를 쓸 수 있는 이유',
  summary:
    '원시 값은 객체가 아니지만 프로퍼티를 읽으면 명세가 래퍼 객체를 거쳐 프로토타입의 메서드를 찾습니다. 원시 값에 대입한 프로퍼티는 생기지 않고, null·undefined는 래퍼가 없어 TypeError입니다.',
  category: 'objects',
  tags: [
    '원시 값',
    '래퍼 객체',
    'wrapper object',
    'ToObject',
    'String',
    'Number',
    'Boolean',
    'String.prototype',
    'length',
    'toUpperCase',
    '옵셔널 체이닝',
    '?.',
    'strict mode',
    'TypeError',
  ],
  goals: [
    '원시 값의 프로퍼티 읽기가 ToObject와 프로토타입으로 처리되는 순서를 설명할 수 있다.',
    '원시 값에 프로퍼티를 대입했을 때 sloppy mode와 strict mode의 결과와 그 이유를 예측할 수 있다.',
    'null과 undefined의 프로퍼티 접근과 옵셔널 체이닝(?.)의 결과를 예측할 수 있다.',
    'new String과 원시 문자열, String() 호출의 차이(typeof, 비교, truthy)를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: 'typeof 연산자', slug: 'typeof-operator' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: ['new-operator', 'equality-operators'],
  examples: [
    {
      id: 'string-property',
      file: 'string-property.js',
      runtime: 'ecmascript',
      expectedOutput: ['5', 'h', 'HELLO', 'hello', 'string'],
    },
    {
      id: 'number-boolean',
      file: 'number-boolean.js',
      runtime: 'ecmascript',
      expectedOutput: ['3.14', 'string', 'ff', 'true'],
    },
    {
      id: 'method-source',
      file: 'method-source.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true', 'true', 'false'],
    },
    {
      id: 'assign-sloppy',
      file: 'assign-sloppy.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', '5', 'hello'],
    },
    {
      id: 'assign-strict',
      file: 'assign-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'undefined'],
    },
    {
      id: 'null-undefined',
      file: 'null-undefined.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'TypeError', 'undefined', 'undefined'],
    },
    {
      id: 'wrapper-object',
      file: 'wrapper-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['object', 'string', 'false', 'true', '1'],
    },
    {
      id: 'boolean-wrapper',
      file: 'boolean-wrapper.js',
      runtime: 'ecmascript',
      expectedOutput: ['object', 'truthy', 'true', 'false'],
    },
    {
      id: 'conversion',
      file: 'conversion.js',
      runtime: 'ecmascript',
      expectedOutput: ['string', 'number', 'boolean', 'object', 'false'],
    },
  ],
  simplifications: [
    '래퍼 객체는 명세가 프로퍼티 접근을 정의하려고 쓰는 객체(ToObject의 결과)입니다. 명세는 이 객체가 그 연산 밖에서 접근할 수 없고 구현이 실제로 만들지 않아도 된다고 적습니다. 이 페이지의 "래퍼 객체를 만들어 찾는다"는 명세의 동작 설명이며 엔진이 매번 객체를 만든다는 뜻이 아닙니다.',
    '원시 값의 메서드를 호출하거나 getter를 읽을 때, 메서드와 getter 안의 this는 명세상 원시 값 그대로 전달되고 sloppy mode 함수라면 객체로 바꿔 받습니다. this는 별도 개념에서 다룹니다.',
    '문자열의 인덱스 접근(str[0])은 String 객체의 특별한 [[GetOwnProperty]]가 감싼 문자열에서 만들고, length는 String 객체가 만들어질 때 쓰기 불가 데이터 프로퍼티로 정의됩니다. 이 세부 동작과 각 내장 메서드의 목록은 다루지 않습니다.',
    '대입할 이름이 체인에서 setter를 만나면(예: Object.prototype의 __proto__) setter가 호출되어 이 페이지의 규칙과 다르게 동작합니다. 예제는 체인에 없는 이름과 length만 씁니다.',
    '==가 래퍼 객체를 원시 값으로 바꾸는 과정(ToPrimitive)은 결과만 보여 줍니다.',
    '옵셔널 체이닝은 기준 값이 null·undefined일 때 undefined를 돌려준다는 것만 다룹니다. ?.() 호출 형태와 나머지 식을 평가하지 않는 동작은 다루지 않습니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 별도 개념입니다.',
    '예제 4를 파일로 실행할 때 .mjs 파일이거나 package.json에 "type": "module"이 있으면 모듈이라 항상 strict mode여서 2번 줄에서 TypeError가 납니다. 클래식 스크립트나 CommonJS(.cjs)로 실행하면 이 페이지의 결과와 같습니다.',
    '전역 객체(globalThis, 빌트인 전역 프로퍼티와 함수)는 별도 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — GetValue ( V )',
      url: 'https://tc39.es/ecma262/#sec-getvalue',
    },
    {
      label: 'ECMAScript 명세 — PutValue ( V, W )',
      url: 'https://tc39.es/ecma262/#sec-putvalue',
    },
    {
      label: 'ECMAScript 명세 — OrdinarySetWithOwnDescriptor',
      url: 'https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor',
    },
    {
      label: 'ECMAScript 명세 — ToObject ( argument )',
      url: 'https://tc39.es/ecma262/#sec-toobject',
    },
    {
      label: 'ECMAScript 명세 — Optional Chains',
      url: 'https://tc39.es/ecma262/#sec-optional-chains',
    },
    {
      label: 'ECMAScript 명세 — String 인스턴스의 length',
      url: 'https://tc39.es/ecma262/#sec-properties-of-string-instances-length',
    },
    {
      label: 'ECMAScript 명세 — Boolean ( value )',
      url: 'https://tc39.es/ecma262/#sec-boolean-constructor-boolean-value',
    },
    {
      label: 'ECMAScript 명세 — Number ( value )',
      url: 'https://tc39.es/ecma262/#sec-number-constructor-number-value',
    },
    {
      label: 'ECMAScript 명세 — String ( value )',
      url: 'https://tc39.es/ecma262/#sec-string-constructor-string-value',
    },
    {
      label: 'ECMAScript 명세 — Symbol ( [ description ] )',
      url: 'https://tc39.es/ecma262/#sec-symbol-description',
    },
    {
      label: 'ECMAScript 명세 — BigInt ( value )',
      url: 'https://tc39.es/ecma262/#sec-bigint-constructor-number-value',
    },
    {
      label: 'ECMAScript 명세 — ToBoolean ( argument )',
      url: 'https://tc39.es/ecma262/#sec-toboolean',
    },
    {
      label: 'ECMAScript 명세 — IsStrictlyEqual ( x, y )',
      url: 'https://tc39.es/ecma262/#sec-isstrictlyequal',
    },
    {
      label: 'ECMAScript 명세 — IsLooselyEqual ( x, y )',
      url: 'https://tc39.es/ecma262/#sec-islooselyequal',
    },
    {
      label: 'MDN — 원시 값(Primitive)',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Primitive',
    },
    {
      label: 'MDN — String',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String',
    },
    {
      label: 'MDN — Number',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Number',
    },
    {
      label: 'MDN — Boolean',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Boolean',
    },
    {
      label: 'MDN — Object() 생성자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/Object',
    },
    {
      label: 'MDN — 옵셔널 체이닝(?.)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
