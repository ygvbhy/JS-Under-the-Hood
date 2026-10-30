import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'iife-module-pattern',
  title: '즉시 실행 함수와 모듈 패턴: 전역 이름을 줄이는 방법',
  summary:
    '전역 이름 공간은 하나뿐이라 이름이 충돌합니다. 네임스페이스 객체, 즉시 실행 함수(IIFE), 모듈 패턴, 블록과 let·const가 전역에 남기는 이름과 숨기는 것을 예제로 비교합니다.',
  category: 'execution',
  order: 215,
  tags: [
    '즉시 실행 함수',
    'IIFE',
    '모듈 패턴',
    '네임스페이스 객체',
    '전역 변수',
    '이름 충돌',
    '자동 세미콜론 삽입',
    'ASI',
    '함수 식',
    '캡슐화',
    'Object.freeze',
    '블록 함수 선언',
  ],
  goals: [
    '전역 var와 함수 선언이 이름 충돌을 일으키는 이유를 설명하고, 같은 이름을 두 번 선언했을 때의 결과를 예측할 수 있다.',
    '즉시 실행 함수가 괄호나 ! 같은 연산자를 필요로 하는 이유를 문법으로 설명하고, 앞 줄에 세미콜론이 없을 때의 결과를 예측할 수 있다.',
    '네임스페이스 객체와 모듈 패턴이 전역에 남기는 이름과 바깥에서 바꿀 수 있는 것을 구분할 수 있다.',
    '블록과 let·const가 숨기는 것과 sloppy mode의 블록 안 함수 선언이 숨기지 못하는 것을 구분할 수 있다.',
  ],
  prerequisites: [
    { label: '클로저', slug: 'closure' },
    { label: '전역 객체', slug: 'global-object' },
    { label: '블록 스코프', slug: 'block-scope' },
    { label: '호이스팅', slug: 'hoisting' },
  ],
  related: ['closure', 'global-object', 'block-scope', 'for-let'],
  examples: [
    {
      id: 'name-collision',
      file: 'name-collision.js',
      runtime: 'ecmascript',
      expectedOutput: ['B 준비', 'B 준비 B'],
    },
    {
      id: 'namespace',
      file: 'namespace.js',
      runtime: 'ecmascript',
      expectedOutput: ['2', '100'],
    },
    {
      id: 'iife-basic',
      file: 'iife-basic.js',
      runtime: 'ecmascript',
      expectedOutput: ['20', 'undefined false'],
    },
    {
      id: 'iife-forms',
      file: 'iife-forms.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 2 false undefined 5'],
    },
    {
      id: 'named-iife',
      file: 'named-iife.js',
      runtime: 'ecmascript',
      expectedOutput: ['2', '1', 'undefined'],
    },
    {
      id: 'iife-asi',
      file: 'iife-asi.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'undefined', '실행'],
    },
    {
      id: 'module-pattern',
      file: 'module-pattern.js',
      runtime: 'ecmascript',
      expectedOutput: ['2', 'undefined undefined', '3'],
    },
    {
      id: 'module-replace',
      file: 'module-replace.js',
      runtime: 'ecmascript',
      expectedOutput: ['999 1', '1'],
    },
    {
      id: 'block-let',
      file: 'block-let.js',
      runtime: 'ecmascript',
      expectedOutput: ['hidden 1', 'undefined undefined'],
    },
    {
      id: 'block-function',
      file: 'block-function.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined true', 'function'],
    },
    {
      id: 'block-function-strict',
      file: 'block-function-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined false', 'undefined'],
    },
  ],
  simplifications: [
    '이름 충돌 예제는 한 파일 안에 두 라이브러리 구간을 이어 붙여 여러 script를 흉내 낸 것입니다. 실제로 script가 둘로 나뉘면 앞 script가 실행되는 동안에는 앞의 함수가 쓰이고, 이 차이는 본문에서 설명합니다.',
    '블록 안 함수 선언(부록 B)은 웹 브라우저 호스트에서 필수이고 다른 호스트에서는 선택입니다. 같은 이름의 let이 있을 때나 switch의 case 안 같은 세부 조건은 다루지 않습니다.',
    'ES 모듈, CommonJS, AMD, 번들러 같은 모듈 체계는 다루지 않고 ES 모듈은 별도 개념으로만 언급합니다.',
    '비교표의 "전역에 남는 이름"은 이 페이지의 예제 기준입니다. 같은 방법이라도 코드에 따라 전역에 남는 이름은 달라질 수 있습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '이 페이지의 예제는 스크립트로 실행한 결과를 기준으로 합니다. 모듈은 strict mode이고 최상위 선언이 전역이 아니라 모듈 환경에 생기며, CommonJS는 파일을 함수로 감싸 실행하므로 결과가 달라지는 예제가 있습니다.',
    '화살표 함수 IIFE, 클래스 private 필드, 반복문 안에서 IIFE로 var의 문제를 푸는 방법은 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Expression Statement',
      url: 'https://tc39.es/ecma262/#sec-expression-statement',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: InstantiateOrdinaryFunctionExpression',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionexpression',
    },
    {
      label: 'ECMAScript 명세 — Rules of Automatic Semicolon Insertion',
      url: 'https://tc39.es/ecma262/#sec-rules-of-automatic-semicolon-insertion',
    },
    {
      label:
        'ECMAScript 명세 — Interesting Cases of Automatic Semicolon Insertion in Statement Lists',
      url: 'https://tc39.es/ecma262/#sec-asi-interesting-cases-in-statement-lists',
    },
    {
      label: 'ECMAScript 명세 — GlobalDeclarationInstantiation ( script, envRecord )',
      url: 'https://tc39.es/ecma262/#sec-globaldeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — Logical NOT Operator ( ! )',
      url: 'https://tc39.es/ecma262/#sec-logical-not-operator',
    },
    {
      label: 'ECMAScript 명세 — The void Operator',
      url: 'https://tc39.es/ecma262/#sec-void-operator',
    },
    {
      label: 'ECMAScript 명세 — Object.freeze ( obj )',
      url: 'https://tc39.es/ecma262/#sec-object.freeze',
    },
    {
      label: 'ECMAScript 명세 — Additional ECMAScript Features for Web Browsers',
      url: 'https://tc39.es/ecma262/#sec-additional-ecmascript-features-for-web-browsers',
    },
    {
      label:
        'ECMAScript 명세 — Block-Level Function Declarations Web Legacy Compatibility Semantics',
      url: 'https://tc39.es/ecma262/#sec-block-level-function-declarations-web-legacy-compatibility-semantics',
    },
    {
      label: 'ECMAScript 명세 — Modules',
      url: 'https://tc39.es/ecma262/#sec-modules',
    },
    {
      label: 'MDN — IIFE',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/IIFE',
    },
    {
      label: 'MDN — 클로저',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Closures',
    },
    {
      label: 'MDN — Lexical grammar (자동 세미콜론 삽입)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar',
    },
    {
      label: 'MDN — function 문',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/function',
    },
    {
      label: 'MDN — Object.freeze()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
