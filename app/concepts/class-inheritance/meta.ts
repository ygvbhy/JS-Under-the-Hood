import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'class-inheritance',
  title: '클래스 상속과 super: 파생 클래스의 this는 언제 생길까',
  summary:
    '파생 클래스의 생성자는 객체를 만들지 않고, this는 super()가 끝나야 초기화됩니다. extends가 만드는 두 체인, super.method(), 필드 초기화 순서, new.target을 예제로 확인합니다.',
  category: 'objects',
  order: 240,
  tags: [
    '상속',
    'extends',
    'super',
    '파생 클래스',
    '오버라이드',
    'static 상속',
    'new.target',
    'HomeObject',
    '필드 초기화 순서',
  ],
  goals: [
    'extends가 만드는 두 가지 [[Prototype]] 체인(인스턴스 쪽과 생성자 쪽)을 설명할 수 있다.',
    '파생 클래스의 생성자가 객체를 만들지 않는 이유와 super() 전에 this를 쓰면 ReferenceError가 나는 이유를 설명할 수 있다.',
    'super.method()가 어디에서 메서드를 찾기 시작하는지, 그때 this가 무엇인지 설명할 수 있다.',
    '파생 클래스의 필드가 super()가 돌아온 뒤에 초기화되어 부모 생성자에서는 보이지 않는다는 점을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '클래스는 함수다', slug: 'class-basics' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: 'new 연산자', slug: 'new-operator' },
    { label: '실행 컨텍스트', slug: 'execution-context' },
  ],
  related: ['class-basics', 'prototype-chain', 'new-operator', 'this-binding', 'error-handling'],
  examples: [
    {
      id: 'construct-derived',
      file: 'construct-derived.js',
      runtime: 'ecmascript',
      expectedOutput: ['Rex dog', 'true', 'true'],
    },
    {
      id: 'two-chains',
      file: 'two-chains.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true Nabi', 'true'],
    },
    {
      id: 'this-before-super',
      file: 'this-before-super.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError'],
    },
    {
      id: 'super-rules',
      file: 'super-rules.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', 'ReferenceError'],
    },
    {
      id: 'super-method',
      file: 'super-method.js',
      runtime: 'ecmascript',
      expectedOutput: ['Rex makes a sound (woof)', 'false true'],
    },
    {
      id: 'home-object',
      file: 'home-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['Parent>Child'],
    },
    {
      id: 'field-order',
      file: 'field-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['label=undefined', 'derived'],
    },
    {
      id: 'derived-return',
      file: 'derived-return.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"custom":true} false', 'TypeError'],
    },
    {
      id: 'new-target',
      file: 'new-target.js',
      runtime: 'ecmascript',
      expectedOutput: ['Base', 'Derived'],
    },
    {
      id: 'extends-targets',
      file: 'extends-targets.js',
      runtime: 'ecmascript',
      expectedOutput: ['hi Kim', 'TypeError', 'TypeError', 'true'],
    },
  ],
  simplifications: [
    '시뮬레이터의 단계는 명세의 [[Construct]]와 SuperCall이 정한 순서를 묶어 그린 교육용 단위입니다. 엔진 내부 구현이 아닙니다.',
    '`extends null`은 클래스의 prototype 체인만 보이고, 그 클래스로 인스턴스를 만들 때의 동작(TypeError)은 다루지 않습니다.',
    '`Array`·`Error` 같은 내장 객체 상속, `Symbol.species`, mixin, `Reflect.construct`는 다루지 않습니다.',
    '객체 리터럴 메서드의 `super`(`__proto__`와 함께 쓰는 경우), `super.x = 1` 같은 프로퍼티 대입, 화살표 함수 안의 `super`와 `this`, private 필드의 상속, 접근자 오버라이드는 다루지 않습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '이 페이지의 예제는 스크립트로 실행한 결과를 기준으로 합니다.',
    'extends의 조건 중 "prototype 프로퍼티가 객체나 null"은 본문에서 설명만 하고 예제로 보이지 않습니다. 예를 들어 생성자 함수를 bind로 묶은 함수는 여전히 생성자이지만 prototype 프로퍼티가 없어서 extends하면 TypeError입니다.',
    '현행 명세 기준으로 기본 생성자는 constructor(...args) { super(...args) }와 비슷하게 동작하지만, 인수를 넘길 때 배열의 반복자(Symbol.iterator)를 호출하지 않는다는 차이가 있습니다. 반복자는 이터러블(34장)의 내용이라 이 페이지에서는 다루지 않습니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ClassDefinitionEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation',
    },
    {
      label: 'ECMAScript 명세 — [[Construct]] ( argList, newTarget )',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-function-objects-construct-argumentslist-newtarget',
    },
    {
      label: 'ECMAScript 명세 — The super Keyword',
      url: 'https://tc39.es/ecma262/#sec-super-keyword',
    },
    {
      label: 'ECMAScript 명세 — The super Keyword: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — GetSuperConstructor ( )',
      url: 'https://tc39.es/ecma262/#sec-getsuperconstructor',
    },
    {
      label: 'ECMAScript 명세 — BindThisValue ( envRecord, value )',
      url: 'https://tc39.es/ecma262/#sec-bindthisvalue',
    },
    {
      label: 'ECMAScript 명세 — GetThisBinding ( )',
      url: 'https://tc39.es/ecma262/#sec-function-environment-records-getthisbinding',
    },
    {
      label: 'ECMAScript 명세 — InitializeInstanceElements ( obj, ctor )',
      url: 'https://tc39.es/ecma262/#sec-initializeinstanceelements',
    },
    {
      label: 'ECMAScript 명세 — MakeMethod ( func, homeObj )',
      url: 'https://tc39.es/ecma262/#sec-makemethod',
    },
    {
      label: 'ECMAScript 명세 — GetSuperBase ( envRecord )',
      url: 'https://tc39.es/ecma262/#sec-getsuperbase',
    },
    {
      label: 'ECMAScript 명세 — MakeSuperPropertyReference ( actualThis, propertyKey, strict )',
      url: 'https://tc39.es/ecma262/#sec-makesuperpropertyreference',
    },
    {
      label: 'MDN — extends',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes/extends',
    },
    {
      label: 'MDN — super',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/super',
    },
    {
      label: 'MDN — 클래스',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
