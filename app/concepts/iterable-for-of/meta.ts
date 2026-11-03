import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'iterable-for-of',
  title: '이터러블과 for...of: 일반 객체는 왜 for...of로 돌 수 없을까',
  summary:
    'for...of는 값에서 Symbol.iterator 메서드로 이터레이터를 얻고 done이 true일 때까지 next를 부릅니다. 이 메서드가 없는 일반 객체가 TypeError인 이유와 break·return, 문자열·유사 배열·스프레드의 순회를 명세로 확인합니다.',
  category: 'execution',
  order: 310,
  tags: [
    '이터러블',
    'iterable',
    '이터레이터',
    'iterator',
    'for...of',
    'Symbol.iterator',
    'next',
    '이터레이션 프로토콜',
    'IteratorResult',
    'return',
    '유사 배열',
    'Array.from',
  ],
  goals: [
    'for...of가 값의 Symbol.iterator 메서드를 불러 이터레이터를 얻고, 반복마다 next를 불러 done이 true가 될 때까지 value를 루프 변수에 넣는 과정을 설명할 수 있다.',
    'Symbol.iterator 메서드가 없는 일반 객체와 유사 배열 객체에 for...of를 쓰면 TypeError인 이유와, 배열·문자열·arguments가 이터러블인 이유를 설명할 수 있다.',
    '직접 만든 이터러블에서 next가 본문보다 먼저 불리는 것, break로 빠져나가면 return이 불리고 끝까지 돌면 불리지 않는 것, 한 번 끝난 이터레이터가 다시 돌지 않는 것을 예측할 수 있다.',
    'for...in과 for...of의 차이, 순회 중 push한 요소와 구멍의 처리, 문자열이 코드 포인트 단위로 도는 것, 스프레드와 배열 디스트럭처링이 같은 프로토콜을 쓴다는 점을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '심벌', slug: 'symbol' },
    { label: '배열은 객체다', slug: 'array-index-length' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
  ],
  related: [
    'symbol',
    'string-utf16',
    'array-index-length',
    'array-method-pitfalls',
    'prototype-chain',
    'for-let',
  ],
  examples: [
    {
      id: 'array-loop',
      file: 'array-loop.js',
      runtime: 'ecmascript',
      expectedOutput: ['a', 'b', 'end b'],
    },
    {
      id: 'manual-next',
      file: 'manual-next.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'a false b false',
        'undefined true true {"done":true}',
        'function value,done',
      ],
    },
    {
      id: 'iterable-check',
      file: 'iterable-check.js',
      runtime: 'ecmascript',
      expectedOutput: ['function function undefined', 'undefined function', '["a","b"] true'],
    },
    {
      id: 'custom-iterable',
      file: 'custom-iterable.js',
      runtime: 'ecmascript',
      expectedOutput: ['next', '3', 'next', '2', 'return'],
    },
    {
      id: 'one-shot',
      file: 'one-shot.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', '3 0', '3'],
    },
    {
      id: 'for-in-vs-of',
      file: 'for-in-vs-of.js',
      runtime: 'ecmascript',
      expectedOutput: ['["0","1","extra"] ["x","y"]'],
    },
    {
      id: 'mutate-holes',
      file: 'mutate-holes.js',
      runtime: 'ecmascript',
      expectedOutput: ['[1,2,3,4] 4', '1,undefined,3'],
    },
    {
      id: 'string-code-points',
      file: 'string-code-points.js',
      runtime: 'ecmascript',
      expectedOutput: ['4 3 [1,2,1]'],
    },
    {
      id: 'spread-destructure',
      file: 'spread-destructure.js',
      runtime: 'ecmascript',
      expectedOutput: ['[0,1] next,next,next', '0 next,return'],
    },
  ],
  simplifications: [
    '제너레이터(46장)와 yield, 비동기 이터레이션(for await...of, Symbol.asyncIterator)은 별도 개념이라 다루지 않습니다.',
    '스프레드 문법(35장)과 배열 디스트럭처링(36장)은 별도 개념입니다. 같은 이터레이션 프로토콜을 쓴다는 점만 예제 하나로 확인하고, 기본값·rest·객체 디스트럭처링은 다루지 않습니다.',
    '이터레이터 헬퍼(Iterator.prototype.map 등)와 전역 Iterator는 ES2025에 추가되어 책 범위 밖이라 다루지 않습니다. Iterator.prototype은 배열 이터레이터의 프로토타입 체인에 있는 객체라는 이름만 언급합니다.',
    'Map·Set(37장)과 TypedArray의 이터레이터, 배열의 entries·keys가 돌려주는 이터레이터는 다루지 않습니다. 배열 이터레이터는 Array.prototype[Symbol.iterator]가 돌려주는 값을 기준으로 설명합니다.',
    '이터레이터의 throw 메서드와 이터레이터를 쓰는 다른 내장 함수(Promise.all 등), using 선언은 다루지 않습니다.',
    '배열 이터레이터의 상태는 현재 명세 초안과 ES2026판의 내부 슬롯 [[IteratedArrayLike]]·[[ArrayLikeNextIndex]]로 설명합니다. ES2020판도 같은 이름을 썼고, ES2021판부터 발행된 ES2025판 문서까지는 같은 동작을 제너레이터와 같은 방식의 닫힌 절차(46장)로 적었습니다.',
    '시뮬레이터는 명세의 Iterator Record와 completion 같은 내부 값을 한 단계로 묶어 보이며, 루프 변수 바인딩 생성 같은 세부 단계는 줄였습니다.',
    'for...in의 열거 순서는 명세가 일부만 정합니다. 예제 6처럼 프록시 같은 특수한 객체가 체인에 없고 열거하는 동안 프로퍼티와 체인이 바뀌지 않는 경우만 다루며, 이때 자기 프로퍼티는 [[OwnPropertyKeys]] 순서로 나옵니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The Iterable Interface',
      url: 'https://tc39.es/ecma262/#sec-iterable-interface',
    },
    {
      label: 'ECMAScript 명세 — The Iterator Interface',
      url: 'https://tc39.es/ecma262/#sec-iterator-interface',
    },
    {
      label: 'ECMAScript 명세 — The IteratorResult Interface',
      url: 'https://tc39.es/ecma262/#sec-iteratorresult-interface',
    },
    {
      label: 'ECMAScript 명세 — ForIn/OfHeadEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofheadevaluation-tdznames-expr-iterationkind',
    },
    {
      label: 'ECMAScript 명세 — ForIn/OfBodyEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset',
    },
    {
      label: 'ECMAScript 명세 — GetIterator',
      url: 'https://tc39.es/ecma262/#sec-getiterator',
    },
    {
      label: 'ECMAScript 명세 — GetIteratorFromMethod',
      url: 'https://tc39.es/ecma262/#sec-getiteratorfrommethod',
    },
    {
      label: 'ECMAScript 명세 — IteratorComplete',
      url: 'https://tc39.es/ecma262/#sec-iteratorcomplete',
    },
    {
      label: 'ECMAScript 명세 — IteratorClose',
      url: 'https://tc39.es/ecma262/#sec-iteratorclose',
    },
    {
      label: 'ECMAScript 명세 — CreateArrayIterator',
      url: 'https://tc39.es/ecma262/#sec-createarrayiterator',
    },
    {
      label: 'ECMAScript 명세 — %ArrayIteratorPrototype%.next',
      url: 'https://tc39.es/ecma262/#sec-%25arrayiteratorprototype%25.next',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype [ %Symbol.iterator% ]',
      url: 'https://tc39.es/ecma262/#sec-array.prototype-%25symbol.iterator%25',
    },
    {
      label: 'ECMAScript 명세 — String.prototype [ %Symbol.iterator% ]',
      url: 'https://tc39.es/ecma262/#sec-string.prototype-%25symbol.iterator%25',
    },
    {
      label: 'ECMAScript 명세 — %Iterator.prototype% [ %Symbol.iterator% ]',
      url: 'https://tc39.es/ecma262/#sec-%25iteratorprototype%25-%25symbol.iterator%25',
    },
    {
      label: 'ECMAScript 명세 — Array.from',
      url: 'https://tc39.es/ecma262/#sec-array.from',
    },
    {
      label: 'ECMAScript 명세 — EnumerateObjectProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerate-object-properties',
    },
    {
      label: 'ECMAScript 명세 — ArrayAccumulation (스프레드)',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-arrayaccumulation',
    },
    {
      label: 'ECMAScript 명세 — IteratorBindingInitialization (배열 디스트럭처링)',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-iteratorbindinginitialization',
    },
    {
      label: 'MDN — 반복 프로토콜',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Iteration_protocols',
    },
    {
      label: 'MDN — for...of',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/for...of',
    },
    {
      label: 'MDN — Symbol.iterator',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator',
    },
    {
      label: 'MDN — Array.from()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/from',
    },
    {
      label: 'MDN — Array.prototype.values()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/values',
    },
  ],
  reviewedAt: '2026-11-03',
} satisfies ConceptMeta
