import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'this-binding',
  title: 'this: 호출 방식이 정하는 값',
  summary:
    'this는 함수를 정의한 곳이 아니라 호출 방식이 정합니다. 메서드로 부르면 점(대괄호) 앞의 객체, 꺼내 부르면 sloppy는 전역 객체·strict는 undefined입니다. call·apply·bind로 정하고 화살표 함수는 바깥 this를 씁니다.',
  category: 'objects',
  tags: [
    'this',
    '메서드 호출',
    '함수 호출',
    'call',
    'apply',
    'bind',
    'bound function',
    '화살표 함수',
    '콜백',
    'strict mode',
    'globalThis',
    '참조',
    '쉼표 연산자',
  ],
  goals: [
    '호출식에서 this가 정해지는 순서(참조의 기준 값 → 함수의 this 모드)를 설명할 수 있다.',
    '메서드를 변수에 꺼내거나 콜백으로 넘겼을 때의 this를 예측하고, 해결 방법(bind, 바깥 this를 변수에 담기, 화살표 함수)을 설명할 수 있다.',
    'call·apply·bind와 bound function 규칙(다시 bind, call, new)의 결과를 예측할 수 있다.',
    '화살표 함수와 중첩 함수의 this, 괄호와 쉼표 연산자의 차이를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '함수 호출', slug: 'function-calls' },
    { label: 'new 연산자', slug: 'new-operator' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '스코프 체인', slug: 'scope-chain' },
  ],
  related: ['new-operator', 'function-calls'],
  examples: [
    {
      id: 'method-call',
      file: 'method-call.js',
      runtime: 'ecmascript',
      expectedOutput: ['JS', 'CSS', 'true'],
    },
    {
      id: 'extract-sloppy',
      file: 'extract-sloppy.js',
      runtime: 'ecmascript',
      expectedOutput: ['book', 'globalThis'],
    },
    {
      id: 'extract-strict',
      file: 'extract-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['book', 'undefined'],
    },
    {
      id: 'plain-call',
      file: 'plain-call.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'undefined'],
    },
    {
      id: 'nested-function',
      file: 'nested-function.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'true'],
    },
    {
      id: 'callback',
      file: 'callback.js',
      runtime: 'ecmascript',
      expectedOutput: ['false', 'true', 'true', 'true'],
    },
    {
      id: 'call-apply',
      file: 'call-apply.js',
      runtime: 'ecmascript',
      expectedOutput: ['Hi, Kim!', 'Hello, Kim?'],
    },
    {
      id: 'bind-rules',
      file: 'bind-rules.js',
      runtime: 'ecmascript',
      expectedOutput: ['Kim', 'Kim', 'Kim', 'Kim'],
    },
    {
      id: 'bind-new',
      file: 'bind-new.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"title":"JS"}', '{"name":"Kim"}', 'true'],
    },
    {
      id: 'arrow-this',
      file: 'arrow-this.js',
      runtime: 'ecmascript',
      expectedOutput: ['Kim', 'Kim', 'Kim', 'Kim'],
    },
    {
      id: 'parens-comma',
      file: 'parens-comma.js',
      runtime: 'ecmascript',
      expectedOutput: ['book', 'book', 'undefined'],
    },
  ],
  simplifications: [
    'this가 저장되는 구조(실행 컨텍스트와 환경 레코드)는 별도 개념입니다. 시뮬레이터는 명세의 EvaluateCall과 OrdinaryCallBindThis가 this를 정하는 과정을 네 칸으로 나눠 그린 것입니다.',
    '화살표 함수는 this를 어떻게 정하는지만 다룹니다. 화살표 함수가 바깥 this를 쓰는 구조와 문법 전반은 별도 개념입니다.',
    '전역 객체(globalThis)가 무엇인지는 별도 개념에서 다룹니다. 이 페이지는 sloppy 함수의 this가 그 객체와 같은지만 비교합니다. sloppy 함수가 받는 값은 명세 용어로 전역 환경의 global this value(globalThis의 값)이고, 브라우저처럼 이 값이 전역 객체와 구분되는 환경도 있습니다.',
    '예제 2·4·5는 sloppy mode 결과입니다. 파일로 실행할 때 .mjs 파일이거나 package.json에 "type": "module"이 있으면 모듈이라 항상 strict mode여서 함수의 this가 전역 객체 대신 undefined가 되고 결과가 달라집니다. 브라우저에서도 <script type="module">로 실행하면 모듈입니다. 클래식 스크립트나 CommonJS(.cjs)로 실행하면 이 페이지의 결과와 같습니다.',
    '클래스 메서드(항상 strict mode), 이벤트 핸들러·타이머처럼 호스트가 this를 정하는 경우, with 문은 다루지 않습니다.',
    'apply의 두 번째 인수는 인수 목록을 배열로 넘기는 것까지만 다룹니다. 배열은 별도 개념입니다.',
    '함수 자리 식이 변수 이름일 때 thisArg가 undefined인 것은 일반적인 경우이고, with 문 안에서는 다를 수 있습니다(명세의 WithBaseObject).',
    'super.m()처럼 super로 부르는 호출의 this는 참조의 기준 값이 아니라 현재 this입니다(명세의 GetThisValue). super는 클래스 개념에서 다룹니다.',
    'new 호출의 this는 new 연산자 개념에서 다루고, 이 페이지는 bind와 함께 쓸 때만 다룹니다.',
    '시뮬레이터는 선언문이 실행된 변수와 이 예제에 필요한 객체·함수만 보이며, console·JSON 호출 과정과 객체의 다른 프로퍼티를 생략합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — 함수 호출의 평가(Function Calls Runtime Semantics: Evaluation)',
      url: 'https://tc39.es/ecma262/#sec-function-calls-runtime-semantics-evaluation',
    },
    {
      label:
        'ECMAScript 명세 — EvaluateCall ( func, thisValueRef, argumentListNode, tailPosition )',
      url: 'https://tc39.es/ecma262/#sec-evaluatecall',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryCallBindThis ( func, calleeContext, thisArg )',
      url: 'https://tc39.es/ecma262/#sec-ordinarycallbindthis',
    },
    {
      label: 'ECMAScript 명세 — GetThisEnvironment ( )',
      url: 'https://tc39.es/ecma262/#sec-getthisenvironment',
    },
    {
      label: 'ECMAScript 명세 — GetThisValue ( refRecord )',
      url: 'https://tc39.es/ecma262/#sec-getthisvalue',
    },
    {
      label: 'ECMAScript 명세 — Function.prototype.call ( thisArg, ...args )',
      url: 'https://tc39.es/ecma262/#sec-function.prototype.call',
    },
    {
      label: 'ECMAScript 명세 — Function.prototype.apply ( thisArg, argArray )',
      url: 'https://tc39.es/ecma262/#sec-function.prototype.apply',
    },
    {
      label: 'ECMAScript 명세 — Function.prototype.bind ( thisArg, ...args )',
      url: 'https://tc39.es/ecma262/#sec-function.prototype.bind',
    },
    {
      label: 'ECMAScript 명세 — bound function의 [[Call]]',
      url: 'https://tc39.es/ecma262/#sec-bound-function-exotic-objects-call-thisargument-argumentslist',
    },
    {
      label: 'ECMAScript 명세 — bound function의 [[Construct]]',
      url: 'https://tc39.es/ecma262/#sec-bound-function-exotic-objects-construct-argumentslist-newtarget',
    },
    {
      label: 'ECMAScript 명세 — 괄호 식(The Grouping Operator)의 평가',
      url: 'https://tc39.es/ecma262/#sec-grouping-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — 쉼표 연산자(Comma Operator)의 평가',
      url: 'https://tc39.es/ecma262/#sec-comma-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — this 키워드의 평가',
      url: 'https://tc39.es/ecma262/#sec-this-keyword-runtime-semantics-evaluation',
    },
    {
      label: 'MDN — this',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/this',
    },
    {
      label: 'MDN — Function.prototype.call()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function/call',
    },
    {
      label: 'MDN — Function.prototype.apply()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function/apply',
    },
    {
      label: 'MDN — Function.prototype.bind()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function/bind',
    },
    {
      label: 'MDN — 화살표 함수',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Arrow_functions',
    },
    {
      label: 'MDN — 쉼표 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Comma_operator',
    },
    {
      label: 'MDN — 그룹 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Grouping',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
