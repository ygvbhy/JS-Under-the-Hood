import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'execution-context',
  title: '실행 컨텍스트: 코드는 어떤 구조 위에서 실행될까',
  summary:
    '함수를 호출하면 실행 컨텍스트가 스택에 쌓이고 끝나면 빠집니다. 환경 레코드가 이름을 담고 바깥 레코드를 가리켜 스코프 체인이 되며, 선언 처리 뒤 실행하고 this·블록도 이 구조로 처리합니다.',
  category: 'execution',
  tags: [
    '실행 컨텍스트',
    '실행 컨텍스트 스택',
    '콜 스택',
    '환경 레코드',
    'LexicalEnvironment',
    'VariableEnvironment',
    '전역 환경 레코드',
    '함수 환경 레코드',
    'OuterEnv',
    '스코프 체인',
    '호이스팅',
    'TDZ',
    'this',
  ],
  goals: [
    '실행 컨텍스트 스택의 push·pop으로 함수의 호출 순서와 지금 실행 중인 코드를 설명할 수 있다.',
    '코드가 선언 처리 → 실행의 두 단계로 평가되고 let·const 바인딩이 초기화 전 상태로 남는다는 것으로 호이스팅과 TDZ를 설명할 수 있다.',
    '환경 레코드와 [[OuterEnv]]·[[Environment]]로 식별자를 찾는 과정을 설명하고, 바깥이 호출한 곳이 아니라 정의한 곳으로 정해진다는 것을 보일 수 있다.',
    '블록이 LexicalEnvironment를 교체했다가 복원하는 과정과 this 바인딩이 놓이는 위치를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '스코프 체인', slug: 'scope-chain' },
    { label: '블록 스코프', slug: 'block-scope' },
    { label: 'TDZ', slug: 'tdz' },
    { label: '호이스팅', slug: 'hoisting' },
    { label: '함수 호출', slug: 'function-calls' },
    { label: 'this', slug: 'this-binding' },
  ],
  related: ['scope-chain', 'this-binding'],
  examples: [
    {
      id: 'call-stack',
      file: 'call-stack.js',
      runtime: 'ecmascript',
      expectedOutput: ['first start', 'second start', 'second end', 'first end', 'global end'],
    },
    {
      id: 'two-phases',
      file: 'two-phases.js',
      runtime: 'ecmascript',
      expectedOutput: ['function', 'undefined', 'ReferenceError'],
    },
    {
      id: 'global-records',
      file: 'global-records.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'function', '2'],
    },
    {
      id: 'lookup-defined',
      file: 'lookup-defined.js',
      runtime: 'ecmascript',
      expectedOutput: ['global'],
    },
    {
      id: 'function-records',
      file: 'function-records.js',
      runtime: 'ecmascript',
      expectedOutput: ['pvl'],
    },
    {
      id: 'tdz-env',
      file: 'tdz-env.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', 'inner'],
    },
    {
      id: 'block-env',
      file: 'block-env.js',
      runtime: 'ecmascript',
      expectedOutput: ['block', 'function', 'var', 'global'],
    },
    {
      id: 'this-env',
      file: 'this-env.js',
      runtime: 'ecmascript',
      expectedOutput: ['obj'],
    },
    {
      id: 'recursion',
      file: 'recursion.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '2', '3', 'done'],
    },
  ],
  simplifications: [
    '실행 컨텍스트의 구성 요소 중 LexicalEnvironment와 VariableEnvironment만 그립니다. code evaluation state, Function, Realm, ScriptOrModule, PrivateEnvironment는 생략합니다.',
    '환경 레코드 카드는 명세의 Environment Record를 단순화한 것입니다. 바인딩의 변경 가능 여부(const), 함수 환경 레코드의 [[FunctionObject]]·[[NewTarget]] 등은 생략하고 this만 보입니다.',
    'strict mode 함수는 LexicalEnvironment와 VariableEnvironment가 같은 레코드 하나를 가리킵니다. 이 페이지의 예제는 sloppy mode라 둘로 그립니다. 매개변수에 기본값이 있으면 레코드가 하나 더 생기지만 다루지 않습니다.',
    '함수가 끝나 어떤 실행 컨텍스트도 가리키지 않는 환경 레코드는 그림에서 지웁니다. 함수 객체가 그 레코드를 계속 가리키면 남는데, 이것은 클로저 개념에서 다룹니다.',
    '전역 객체 자체(globalThis와 빌트인 프로퍼티)는 별도 개념입니다. 객체 환경 레코드 칸에는 예제가 선언한 이름만 보입니다.',
    '예제 3은 클래식 스크립트 결과입니다. .mjs·"type": "module"(모듈)로 실행하면 최상위가 모듈 코드이고, CommonJS(.cjs)는 Node가 파일을 함수로 감싸 최상위가 함수 코드라서, 어느 쪽이든 var·함수 선언이 전역 객체의 프로퍼티가 되지 않습니다.',
    'eval 코드와 모듈 코드의 실행 컨텍스트는 언급만 합니다. 제너레이터·async 함수처럼 실행 컨텍스트가 중단됐다가 다시 이어지는 경우와 클래스는 다루지 않습니다.',
    'Math.max 같은 빌트인 함수나 console.log 같은 호스트 제공 함수를 부를 때도 실행 컨텍스트가 만들어지지만 시뮬레이터에서는 생략합니다. 스택 크기 제한은 명세가 아니라 구현이 정하므로 다루지 않습니다.',
    '화살표 함수가 아닌 함수의 함수 환경 레코드에는 보통 arguments 바인딩도 만들어지지만, 시뮬레이터는 코드에 선언한 이름만 보입니다.',
    '블록 안 함수 선언은 sloppy mode에서 Annex B 규칙으로 함수 환경 레코드에도 var처럼 바인딩이 생기지만, 이 페이지의 예제에는 블록 안 함수 선언이 없어 다루지 않습니다.',
    '시뮬레이터는 선언 처리를 한 단계로 묶어 보이고, 바인딩 생성·초기화의 세부 순서(매개변수 → var → 함수 등)는 생략합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Execution Contexts',
      url: 'https://tc39.es/ecma262/#sec-execution-contexts',
    },
    {
      label: 'ECMAScript 명세 — Environment Records',
      url: 'https://tc39.es/ecma262/#sec-environment-records',
    },
    {
      label: 'ECMAScript 명세 — GetIdentifierReference ( envRecord, name, strict )',
      url: 'https://tc39.es/ecma262/#sec-getidentifierreference',
    },
    {
      label: 'ECMAScript 명세 — 전역 환경 레코드의 HasBinding ( name )',
      url: 'https://tc39.es/ecma262/#sec-global-environment-records-hasbinding-n',
    },
    {
      label: 'ECMAScript 명세 — ResolveBinding ( name [ , envRecord ] )',
      url: 'https://tc39.es/ecma262/#sec-resolvebinding',
    },
    {
      label: 'ECMAScript 명세 — NewFunctionEnvironment ( func, newTarget )',
      url: 'https://tc39.es/ecma262/#sec-newfunctionenvironment',
    },
    {
      label: 'ECMAScript 명세 — PrepareForOrdinaryCall ( func, newTarget )',
      url: 'https://tc39.es/ecma262/#sec-prepareforordinarycall',
    },
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation ( func, argList )',
      url: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — GlobalDeclarationInstantiation ( script, envRecord )',
      url: 'https://tc39.es/ecma262/#sec-globaldeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — 블록(Block)의 평가(Runtime Semantics: Evaluation)',
      url: 'https://tc39.es/ecma262/#sec-block-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — GetThisEnvironment ( )',
      url: 'https://tc39.es/ecma262/#sec-getthisenvironment',
    },
    {
      label: 'ECMAScript 명세 — Types of Source Code',
      url: 'https://tc39.es/ecma262/#sec-types-of-source-code',
    },
    {
      label: 'MDN — 호출 스택(Call stack)',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Call_stack',
    },
    {
      label: 'MDN — 스코프(Scope)',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Scope',
    },
    {
      label: 'MDN — 블록 문',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/block',
    },
    {
      label: 'MDN — let',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/let',
    },
    {
      label: 'MDN — var',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/var',
    },
    {
      label: 'MDN — this',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/this',
    },
    {
      label: 'MDN — 함수 (JavaScript 가이드)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Functions',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
