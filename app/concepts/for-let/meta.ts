import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'for-let',
  title: 'for 문의 let: 반복마다 새 바인딩이 생기는 이유',
  summary:
    'for (let …) 문은 반복마다 새 선언적 환경 레코드를 만들고 그 i 바인딩을 직전 반복(첫 반복은 머리 레코드)의 값으로 초기화합니다. 그래서 본문에서 만든 함수는 반복마다 다른 i를 가리키고, var는 모든 함수가 같은 i를 가리킵니다.',
  category: 'execution',
  order: 220,
  tags: [
    'for 문',
    'for 루프',
    'let',
    '반복문',
    '클로저',
    'CreatePerIterationEnvironment',
    '환경 레코드',
    'for...in',
    'var',
    '반복마다 새 바인딩',
  ],
  goals: [
    'for 문에서 var와 let의 결과가 다른 이유를 반복별 환경 레코드와 [[Environment]]로 설명할 수 있다.',
    '새 바인딩이 본문을 실행한 뒤, 증가식을 평가하기 전에 만들어진다는 것으로 본문에서 i를 바꾼 뒤의 결과를 예측할 수 있다.',
    '머리의 const가 증가식에서 대입하는 일반 for 문에서는 TypeError가 되고 for...in에서는 되지 않는 이유를 구분할 수 있다.',
    'var 반복문에서 본문 안의 let으로 반복마다 다른 값을 쓰는 방법을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '클로저', slug: 'closure' },
    { label: '블록 스코프', slug: 'block-scope' },
    { label: '실행 컨텍스트', slug: 'execution-context' },
  ],
  related: ['closure', 'block-scope', 'execution-context'],
  examples: [
    { id: 'var-loop', file: 'var-loop.js', runtime: 'ecmascript', expectedOutput: ['3 3 3'] },
    { id: 'let-loop', file: 'let-loop.js', runtime: 'ecmascript', expectedOutput: ['0 1 2'] },
    { id: 'copy-timing', file: 'copy-timing.js', runtime: 'ecmascript', expectedOutput: ['1 3'] },
    { id: 'own-binding', file: 'own-binding.js', runtime: 'ecmascript', expectedOutput: ['10 1'] },
    { id: 'inner-let', file: 'inner-let.js', runtime: 'ecmascript', expectedOutput: ['0 1 2 3'] },
    {
      id: 'const-head',
      file: 'const-head.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError 1'],
    },
    { id: 'init-closure', file: 'init-closure.js', runtime: 'ecmascript', expectedOutput: ['0'] },
    {
      id: 'for-in',
      file: 'for-in.js',
      runtime: 'ecmascript',
      expectedOutput: ['name city', 'true'],
    },
  ],
  simplifications: [
    '함수를 호출할 때 만들어지는 실행 컨텍스트와 그 함수 환경 레코드(바인딩이 없음)는 시뮬레이터에서 그리지 않고, 이름 탐색을 함수의 [[Environment]]부터 보여 줍니다.',
    '실행 컨텍스트는 전역 실행 컨텍스트 하나의 LexicalEnvironment만 표시합니다. VariableEnvironment 등 나머지 구성 요소는 실행 컨텍스트 페이지의 단순화를 따라 생략합니다.',
    '어떤 곳에서도 닿지 않는 환경 레코드는 그림에서 뺍니다. 명세는 메모리가 언제 회수되는지 정하지 않고, 엔진이 반복마다 실제로 무엇을 만드는지는 결과가 명세와 같다면 구현에 맡겨져 있습니다.',
    'for...of와 for await...of, 구조 분해를 쓴 머리, using 선언, continue·break·레이블은 다루지 않습니다. for...of는 별도 개념입니다.',
    'for...in은 머리의 식을 평가할 때 쓰는 별도 환경 레코드를 그림에서 생략합니다.',
    '즉시 실행 함수로 var 반복문의 문제를 푸는 방법은 별도 개념입니다.',
    'console.log를 부를 때 만들어지는 실행 컨텍스트는 생략합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Conformance',
      url: 'https://tc39.es/ecma262/#sec-conformance',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ForLoopEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-forloopevaluation',
    },
    {
      label:
        'ECMAScript 명세 — ForBodyEvaluation ( test, increment, stmt, perIterationBindings, labelSet )',
      url: 'https://tc39.es/ecma262/#sec-forbodyevaluation',
    },
    {
      label: 'ECMAScript 명세 — CreatePerIterationEnvironment ( perIterationBindings )',
      url: 'https://tc39.es/ecma262/#sec-createperiterationenvironment',
    },
    {
      label: 'ECMAScript 명세 — Block Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-block-runtime-semantics-evaluation',
    },
    {
      label:
        'ECMAScript 명세 — ForIn/OfBodyEvaluation ( lhs, stmt, iteratorRecord, iterationKind, lhsKind, labelSet [ , iteratorKind ] )',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ForDeclarationBindingInstantiation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-fordeclarationbindinginstantiation',
    },
    {
      label: 'ECMAScript 명세 — Declarative Environment Records: SetMutableBinding',
      url: 'https://tc39.es/ecma262/#sec-declarative-environment-records-setmutablebinding-n-v-s',
    },
    {
      label: 'MDN — for',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/for',
    },
    {
      label: 'MDN — let',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/let',
    },
    {
      label: 'MDN — for...in',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/for...in',
    },
    {
      label: 'MDN — 클로저 (JavaScript 가이드)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Closures',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
