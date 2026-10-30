import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'block-scope',
  title: '블록 스코프: var와 let·const는 어디까지 보일까',
  summary:
    '블록 안에서 var로 선언한 변수는 블록 밖에서도 보이지만 let·const는 블록 안에서만 보입니다. strict mode가 아닐 때 선언 없이 대입하면 암묵적 전역이 생기고, let·const의 중복 선언과 const 재할당은 오류입니다.',
  category: 'execution',
  order: 130,
  tags: [
    '블록 스코프',
    'block scope',
    '함수 레벨 스코프',
    'var',
    'let',
    'const',
    '암묵적 전역',
    '중복 선언',
    '재할당',
    'globalThis',
    'SyntaxError',
    'TypeError',
  ],
  goals: [
    '블록 안의 var와 let·const가 어느 스코프에 만들어지는지 설명할 수 있다.',
    'let·const 이름이 블록에 들어갈 때 만들어지고 선언문에서 값이 들어간다는 것을 설명할 수 있다.',
    '선언 없는 대입이 만드는 암묵적 전역과 var 선언의 차이를 구분할 수 있다.',
    '중복 선언, const 재할당, 전역 객체 프로퍼티 여부에서 var와 let·const의 결과를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '스코프 체인', slug: 'scope-chain' },
    { label: '호이스팅', slug: 'hoisting' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
  ],
  related: [],
  examples: [
    {
      id: 'block-var-let',
      file: 'block-var-let.js',
      runtime: 'ecmascript',
      expectedOutput: ['사과 물', '사과', 'undefined'],
    },
    {
      id: 'function-block',
      file: 'function-block.js',
      runtime: 'ecmascript',
      expectedOutput: ['연필', 'undefined'],
    },
    {
      id: 'for-loop',
      file: 'for-loop.js',
      runtime: 'ecmascript',
      expectedOutput: ['3', 'undefined'],
    },
    {
      id: 'implicit-global',
      file: 'implicit-global.js',
      runtime: 'ecmascript',
      expectedOutput: ['100', '100'],
    },
    {
      id: 'implicit-vs-var',
      file: 'implicit-vs-var.js',
      runtime: 'ecmascript',
      expectedOutput: ['false', 'true', 'number', 'undefined'],
    },
    {
      id: 'global-object',
      file: 'global-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['서울', 'undefined', 'undefined'],
    },
    {
      id: 'redeclare',
      file: 'redeclare.js',
      runtime: 'ecmascript',
      expectedOutput: ['2'],
    },
    {
      id: 'const-object',
      file: 'const-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['2'],
    },
  ],
  simplifications: [
    "'스코프' 카드는 명세의 환경 레코드(Environment Record)를 단순화한 것입니다. 전역 스코프는 명세에서 전역 객체 쪽과 선언 쪽 두 부분으로 이루어지지만, 이 페이지는 '전역 객체 프로퍼티' 표시로만 구분합니다. 환경 레코드는 별도 개념에서 다룹니다.",
    '블록 실행이 끝나면 그 블록의 스코프를, 함수가 끝나면 그 함수의 스코프를 표시에서 뺍니다. 끝난 스코프가 어떻게 되는지는 클로저 개념에서 다룹니다.',
    "'초기화 전' 상태의 이름을 선언문보다 앞에서 읽으면 어떻게 되는지(TDZ)는 별도 개념에서 다룹니다. 이 페이지의 예제는 선언문 뒤에서만 읽습니다.",
    'for 문의 let 변수는 반복마다 새로 만들어지지만, 이 차이는 클로저와 함께 별도 개념에서 다룹니다. 이 페이지는 for 문 밖에서 찾을 수 없다는 점만 다룹니다.',
    'if 조건을 평가하는 과정은 블록 진입 단계에 묶었고, console과 globalThis를 찾는 과정은 표시하지 않습니다. globalThis는 전역 객체의 프로퍼티를 읽고 쓸 때 쓸 수 있는 이름이며, 그 값과 전역 객체의 정확한 관계는 별도 개념에서 다룹니다.',
    '이 페이지의 예제는 strict mode가 아닌 클래식 스크립트 기준입니다. ES 모듈(항상 strict mode)에서는 예제 4가 ReferenceError, 예제 5가 SyntaxError이고, ES 모듈과 Node.js CommonJS에서는 예제 6의 세 값이 모두 undefined입니다.',
    '블록 안의 함수 선언은 strict mode 여부와 호스트에 따라 동작이 달라 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Block Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-block-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — BlockDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-blockdeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — Let and Const Declarations',
      url: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
    },
    {
      label: 'ECMAScript 명세 — Variable Statement',
      url: 'https://tc39.es/ecma262/#sec-variable-statement',
    },
    {
      label: 'ECMAScript 명세 — Scripts: Static Semantics: Early Errors',
      url: 'https://tc39.es/ecma262/#sec-scripts-static-semantics-early-errors',
    },
    {
      label: 'ECMAScript 명세 — Block: Static Semantics: Early Errors',
      url: 'https://tc39.es/ecma262/#sec-block-static-semantics-early-errors',
    },
    {
      label: 'ECMAScript 명세 — PutValue',
      url: 'https://tc39.es/ecma262/#sec-putvalue',
    },
    {
      label: 'ECMAScript 명세 — CreateGlobalVarBinding',
      url: 'https://tc39.es/ecma262/#sec-createglobalvarbinding',
    },
    {
      label: 'ECMAScript 명세 — Declarative Environment Records: SetMutableBinding',
      url: 'https://tc39.es/ecma262/#sec-declarative-environment-records-setmutablebinding-n-v-s',
    },
    {
      label: 'MDN — let',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/let',
    },
    {
      label: 'MDN — const',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/const',
    },
    {
      label: 'MDN — var',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/var',
    },
    {
      label: 'MDN — block',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/block',
    },
    {
      label: 'MDN — globalThis',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/globalThis',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
