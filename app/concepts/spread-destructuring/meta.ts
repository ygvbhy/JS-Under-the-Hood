import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'spread-destructuring',
  title: '스프레드와 디스트럭처링: 기본값은 왜 null일 때 쓰이지 않을까',
  summary:
    '배열·객체 스프레드는 새 배열·객체를 만들어 원본에서 읽은 값을 프로퍼티로 정의하므로 중첩 객체는 원본과 같은 객체입니다. 디스트럭처링의 기본값은 읽은 값이 undefined일 때만 쓰입니다.',
  category: 'objects',
  order: 320,
  tags: [
    '스프레드',
    'spread',
    '디스트럭처링',
    '구조 분해 할당',
    'destructuring',
    '얕은 복사',
    '기본값',
    'rest',
    'Object.assign',
    '나머지 요소',
  ],
  goals: [
    '배열·인수 스프레드는 이터레이터로, 객체 스프레드는 자기 열거 가능 프로퍼티로 새 배열·객체를 만들고, 값이 객체이면 두 프로퍼티가 같은 객체라서 그 객체를 변경하면 양쪽에서 보인다는 것(얕은 복사)을 재할당과 변경의 구분으로 설명할 수 있다.',
    '객체 스프레드와 Object.assign의 차이(새 객체에 정의하는 것과 기존 대상에 대입하는 것, setter 호출 여부)와 스프레드로 펼쳐지지 않는 프로퍼티를 설명할 수 있다.',
    '디스트럭처링 기본값이 읽은 값이 undefined일 때만, 필요할 때 왼쪽부터 평가된다는 것을 예측하고 ??·||와 구분할 수 있다.',
    'rest 요소·rest 프로퍼티, null·원시 값 디스트럭처링, 매개변수·스왑·할당 디스트럭처링의 결과를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '이터러블과 for...of', slug: 'iterable-for-of' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: [
    'iterable-for-of',
    'primitives-and-objects',
    'property-attributes',
    'short-circuit-evaluation',
    'primitive-methods',
    'arrow-functions',
    'symbol',
    'prototype-chain',
    'type-coercion',
    'string-utf16',
    'default-parameters',
    'error-handling',
    'json',
  ],
  examples: [
    {
      id: 'spread-basics',
      file: 'spread-basics.js',
      runtime: 'ecmascript',
      expectedOutput: ['[0,3,1,2,4] 5', '3 NaN', '{"a":1,"b":20} {"b":2,"a":1}'],
    },
    {
      id: 'shallow',
      file: 'shallow.js',
      runtime: 'ecmascript',
      expectedOutput: ['Kim Lee', '["a","b"] true', '2 false true'],
    },
    {
      id: 'spread-vs-assign',
      file: 'spread-vs-assign.js',
      runtime: 'ecmascript',
      expectedOutput: ['get,set 1 function', 'get 1 undefined'],
    },
    {
      id: 'what-is-copied',
      file: 'what-is-copied.js',
      runtime: 'ecmascript',
      expectedOutput: ['["own"] undefined false', '{} {}', '{"0":"h","1":"i"} ["h","i"]'],
    },
    {
      id: 'destructuring-basics',
      file: 'destructuring-basics.js',
      runtime: 'ecmascript',
      expectedOutput: ['10 30', 'Kim 30 undefined', 'Seoul'],
    },
    {
      id: 'default-undefined',
      file: 'default-undefined.js',
      runtime: 'ecmascript',
      expectedOutput: ['D null 0 D', 'D null', '"" "D" "D"'],
    },
    {
      id: 'default-lazy',
      file: 'default-lazy.js',
      runtime: 'ecmascript',
      expectedOutput: ['given 1 1', '1 10'],
    },
    {
      id: 'rest',
      file: 'rest.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 [2,3] true', 'P 1 {"box":{"n":1}} undefined', '2 true'],
    },
    {
      id: 'primitive-source',
      file: 'primitive-source.js',
      runtime: 'ecmascript',
      expectedOutput: ['5 h i', 'function'],
    },
    {
      id: 'params-swap',
      file: 'params-swap.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 0 1', '2 1', 'X Y'],
    },
  ],
  simplifications: [
    '"얕은 복사"는 관용 용어입니다. 객체 스프레드가 부르는 CopyDataProperties도 이름과 달리 원본에서 값을 읽어 새 객체의 프로퍼티로 정의할 뿐이고, 배열 스프레드도 이터레이터에서 꺼낸 값을 요소로 정의할 뿐입니다. 읽은 값이 객체여도 그 객체를 새로 만드는 단계는 없습니다.',
    '이터레이터 호출 횟수와 IteratorClose는 이터러블과 for...of 페이지에서 다루며 여기서는 링크로만 다룹니다.',
    '매개변수 기본값은 값이 undefined일 때 쓰인다는 것까지만 다룹니다. 호출마다 평가되는 시점, length에서 빠지는 것, 매개변수 스코프는 매개변수 기본값 개념에서 다룹니다.',
    '깊은 복사와 structuredClone(호스트 API)은 다루지 않습니다.',
    'for...of 머리와 catch 매개변수의 디스트럭처링, 계산된 키 패턴, 프로퍼티를 대상으로 하는 할당 디스트럭처링은 다루지 않습니다.',
    'TypeError와 SyntaxError는 try...catch를 쓰지 않고 본문 문장과 테스트로 확인합니다.',
    'JSON.stringify는 JSON 개념에서 다루는 주제이며 이 페이지에서는 결과를 출력하는 도구로만 씁니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — ArrayAccumulation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-arrayaccumulation',
    },
    {
      label: 'ECMAScript 명세 — ArgumentListEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-argumentlistevaluation',
    },
    {
      label: 'ECMAScript 명세 — PropertyDefinitionEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-propertydefinitionevaluation',
    },
    {
      label: 'ECMAScript 명세 — CopyDataProperties',
      url: 'https://tc39.es/ecma262/#sec-copydataproperties',
    },
    {
      label: 'ECMAScript 명세 — Object.assign',
      url: 'https://tc39.es/ecma262/#sec-object.assign',
    },
    {
      label: 'ECMAScript 명세 — BindingInitialization',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-bindinginitialization',
    },
    {
      label: 'ECMAScript 명세 — KeyedBindingInitialization',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-keyedbindinginitialization',
    },
    {
      label: 'ECMAScript 명세 — IteratorBindingInitialization',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-iteratorbindinginitialization',
    },
    {
      label: 'ECMAScript 명세 — RestBindingInitialization',
      url: 'https://tc39.es/ecma262/#sec-destructuring-binding-patterns-runtime-semantics-restbindinginitialization',
    },
    {
      label: 'ECMAScript 명세 — RequireObjectCoercible',
      url: 'https://tc39.es/ecma262/#sec-requireobjectcoercible',
    },
    {
      label: 'ECMAScript 명세 — Destructuring Assignment',
      url: 'https://tc39.es/ecma262/#sec-destructuring-assignment',
    },
    {
      label: 'ECMAScript 명세 — Assignment Operators의 Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-assignment-operators-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — Expression Statement',
      url: 'https://tc39.es/ecma262/#sec-expression-statement',
    },
    {
      label: 'ECMAScript 명세 — undefined value',
      url: 'https://tc39.es/ecma262/#sec-undefined-value',
    },
    {
      label: 'ECMAScript 명세 — null value',
      url: 'https://tc39.es/ecma262/#sec-null-value',
    },
    {
      label: 'MDN — 전개 구문',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Spread_syntax',
    },
    {
      label: 'MDN — 구조 분해 할당',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Destructuring',
    },
    {
      label: 'MDN — Object.assign()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/assign',
    },
  ],
  reviewedAt: '2026-11-03',
} satisfies ConceptMeta
