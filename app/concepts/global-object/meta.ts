import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'global-object',
  title: '전역 객체: Math와 parseInt는 어디서 찾을까',
  summary:
    '전역 객체는 코드보다 먼저 만들어지고, Math·parseInt 같은 이름은 전역 환경 레코드에서 찾힙니다. 전역 let은 이름을 가리고, undefined는 읽기 전용이며, eval은 호출 방식에 따라 평가 환경이 달라집니다.',
  category: 'objects',
  order: 205,
  tags: [
    '전역 객체',
    'globalThis',
    'global this value',
    '빌트인 전역 함수',
    'isNaN',
    'parseInt',
    'encodeURIComponent',
    'eval',
    'undefined',
    'NaN',
    'Infinity',
    '전역 환경 레코드',
  ],
  goals: [
    '전역 객체의 프로퍼티를 명세가 정한 것, 호스트가 더한 것, 코드가 만든 것으로 구분할 수 있다.',
    'Math 같은 이름이 전역 환경 레코드에서 찾히는 순서를 설명하고, let과 var로 같은 이름을 선언했을 때의 결과를 예측할 수 있다.',
    '읽기 전용인 undefined·NaN·Infinity의 동작을 설명하고, 빌트인 전역 함수 isNaN과 Number.isNaN의 차이로 결과를 예측할 수 있다.',
    'eval의 직접 호출과 간접 호출이 어느 환경에서 평가되는지 구분할 수 있다.',
  ],
  prerequisites: [
    { label: '실행 컨텍스트', slug: 'execution-context' },
    { label: '블록 스코프', slug: 'block-scope' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
  ],
  related: ['block-scope', 'execution-context', 'this-binding', 'hoisting'],
  examples: [
    {
      id: 'builtin-lookup',
      file: 'builtin-lookup.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true', 'true', '42'],
    },
    {
      id: 'shadow-math',
      file: 'shadow-math.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', 'mine', '2'],
    },
    {
      id: 'var-math',
      file: 'var-math.js',
      runtime: 'ecmascript',
      expectedOutput: ['mine', 'mine'],
    },
    {
      id: 'readonly-sloppy',
      file: 'readonly-sloppy.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined NaN Infinity', 'false'],
    },
    {
      id: 'readonly-strict',
      file: 'readonly-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError'],
    },
    {
      id: 'local-undefined',
      file: 'local-undefined.js',
      runtime: 'ecmascript',
      expectedOutput: ['local', 'undefined'],
    },
    {
      id: 'is-nan',
      file: 'is-nan.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false', 'true false'],
    },
    {
      id: 'parse',
      file: 'parse.js',
      runtime: 'ecmascript',
      expectedOutput: ['12 3.14', '255 26', '5'],
    },
    {
      id: 'uri',
      file: 'uri.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '%EC%84%9C%EC%9A%B8%20&%20%EB%B6%80%EC%82%B0',
        '%EC%84%9C%EC%9A%B8%20%26%20%EB%B6%80%EC%82%B0',
      ],
    },
    {
      id: 'eval-direct',
      file: 'eval-direct.js',
      runtime: 'ecmascript',
      expectedOutput: ['local', 'global'],
    },
    {
      id: 'eval-var',
      file: 'eval-var.js',
      runtime: 'ecmascript',
      expectedOutput: ['number undefined', 'undefined'],
    },
    {
      id: 'eval-strict',
      file: 'eval-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined'],
    },
  ],
  simplifications: [
    '이 페이지의 예제 중 전역 객체와 global this value가 같은 객체인지에 따라 결과가 달라지는 것은 없습니다. 브라우저처럼 둘이 다른 호스트는 본문에서만 설명합니다.',
    '생성자 프로퍼티와 기타 프로퍼티는 일부 이름만 표에 적었습니다.',
    '호스트가 더한 프로퍼티는 이름만 소개하고 동작은 다루지 않습니다. 예제의 console도 호스트 API입니다.',
    '전역 객체의 [[Prototype]](호스트가 정함)과 그 프로토타입 체인으로 찾히는 이름, 여러 realm은 다루지 않습니다.',
    'eval은 직접·간접 호출이 평가되는 환경과 var·let이 놓이는 위치만 다룹니다. new.target·super 제약, 문자열 컴파일을 막는 호스트 정책(HostEnsureCanCompileStrings), eval 안의 함수 선언은 다루지 않습니다.',
    '모듈과 CommonJS에서는 최상위 코드가 전역 코드가 아니어서 결과가 달라지는 예제가 있습니다. 이 페이지의 예제는 스크립트로 실행한 결과를 기준으로 합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The Global Object',
      url: 'https://tc39.es/ecma262/#sec-global-object',
    },
    {
      label: 'ECMAScript 명세 — Value Properties of the Global Object',
      url: 'https://tc39.es/ecma262/#sec-value-properties-of-the-global-object',
    },
    {
      label: 'ECMAScript 명세 — globalThis',
      url: 'https://tc39.es/ecma262/#sec-globalthis',
    },
    {
      label: 'ECMAScript 명세 — Function Properties of the Global Object',
      url: 'https://tc39.es/ecma262/#sec-function-properties-of-the-global-object',
    },
    {
      label: 'ECMAScript 명세 — eval ( x )',
      url: 'https://tc39.es/ecma262/#sec-eval-x',
    },
    {
      label: 'ECMAScript 명세 — PerformEval ( x, strictCaller, direct )',
      url: 'https://tc39.es/ecma262/#sec-performeval',
    },
    {
      label: 'ECMAScript 명세 — isNaN ( number )',
      url: 'https://tc39.es/ecma262/#sec-isnan-number',
    },
    {
      label: 'ECMAScript 명세 — parseInt ( string, radix )',
      url: 'https://tc39.es/ecma262/#sec-parseint-string-radix',
    },
    {
      label: 'ECMAScript 명세 — encodeURIComponent ( uriComponent )',
      url: 'https://tc39.es/ecma262/#sec-encodeuricomponent-uricomponent',
    },
    {
      label: 'ECMAScript 명세 — Global Environment Records',
      url: 'https://tc39.es/ecma262/#sec-global-environment-records',
    },
    {
      label: 'ECMAScript 명세 — HasRestrictedGlobalProperty ( N )',
      url: 'https://tc39.es/ecma262/#sec-hasrestrictedglobalproperty',
    },
    {
      label: 'ECMAScript 명세 — GlobalDeclarationInstantiation ( script, env )',
      url: 'https://tc39.es/ecma262/#sec-globaldeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — CreateGlobalVarBinding ( envRecord, name, deletable )',
      url: 'https://tc39.es/ecma262/#sec-createglobalvarbinding',
    },
    {
      label: 'ECMAScript 명세 — CreateGlobalFunctionBinding ( envRecord, name, value, deletable )',
      url: 'https://tc39.es/ecma262/#sec-createglobalfunctionbinding',
    },
    {
      label: 'ECMAScript 명세 — EvalDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-evaldeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — InitializeHostDefinedRealm ( )',
      url: 'https://tc39.es/ecma262/#sec-initializehostdefinedrealm',
    },
    {
      label: 'ECMAScript 명세 — Function Calls — Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-function-calls-runtime-semantics-evaluation',
    },
    {
      label: 'HTML Standard — Creating browsing contexts',
      url: 'https://html.spec.whatwg.org/multipage/document-sequences.html#creating-browsing-contexts',
    },
    {
      label: 'MDN — 전역 객체',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Global_object',
    },
    {
      label: 'MDN — globalThis',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/globalThis',
    },
    {
      label: 'MDN — eval()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/eval',
    },
    {
      label: 'MDN — isNaN()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/isNaN',
    },
    {
      label: 'MDN — parseInt()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/parseInt',
    },
    {
      label: 'MDN — encodeURIComponent()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent',
    },
  ],
  reviewedAt: '2026-10-30',
} satisfies ConceptMeta
