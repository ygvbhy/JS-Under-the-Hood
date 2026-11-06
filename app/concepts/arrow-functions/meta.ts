import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'arrow-functions',
  title: '화살표 함수와 메서드 축약: function과 무엇이 다를까',
  summary:
    '화살표 함수와 메서드 축약도 typeof는 function이지만 new로 부를 수 없고 prototype이 없습니다. 화살표 함수는 자기 this와 arguments가 없어 바깥에서 찾고, rest 파라미터는 나머지 인수를 배열로 받습니다.',
  category: 'execution',
  order: 250,
  tags: [
    '화살표 함수',
    'arrow function',
    '메서드 축약',
    'method shorthand',
    'arguments',
    'rest 파라미터',
    '나머지 매개변수',
    'lexical this',
    'new.target',
    'super',
    '[[HomeObject]]',
    '생성자',
  ],
  goals: [
    '화살표 함수와 메서드 축약이 typeof는 function이지만 new로 부르면 TypeError이고 prototype 프로퍼티가 없는 이유를 설명할 수 있다.',
    '일반 함수의 arguments가 무엇이고 배열과 어떻게 다른지 설명할 수 있다.',
    '화살표 함수 안의 this, arguments, new.target, super가 자기 바인딩이 아니라 바깥 환경의 것을 쓰는 과정을 설명할 수 있다.',
    '객체 리터럴에서 m: function () {} 형태가 아니라 메서드 축약으로 써야 super를 쓸 수 있는 이유와, rest 파라미터가 arguments와 어떻게 다른지 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '함수 호출', slug: 'function-calls' },
    { label: 'this', slug: 'this-binding' },
    { label: 'new 연산자', slug: 'new-operator' },
    { label: '클래스 상속과 super', slug: 'class-inheritance' },
    { label: '스코프 체인', slug: 'scope-chain' },
  ],
  related: [
    'this-binding',
    'function-calls',
    'class-basics',
    'class-inheritance',
    'closure',
    'default-parameters',
  ],
  examples: [
    {
      id: 'arrow-syntax',
      file: 'arrow-syntax.js',
      runtime: 'ecmascript',
      expectedOutput: ['8 5 undefined 5', 'undefined {"value":1}'],
    },
    {
      id: 'not-constructor',
      file: 'not-constructor.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'function function function',
        'object object',
        'TypeError',
        'TypeError',
        'true false false',
      ],
    },
    {
      id: 'arguments-object',
      file: 'arguments-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 0', 'x y', 'false undefined'],
    },
    {
      id: 'arrow-outer-bindings',
      file: 'arrow-outer-bindings.js',
      runtime: 'ecmascript',
      expectedOutput: ['A 2 true', 'A 2 true', 'B 3 false', 'undefined'],
    },
    {
      id: 'method-super',
      file: 'method-super.js',
      runtime: 'ecmascript',
      expectedOutput: ['base+child base', 'base+child'],
    },
    {
      id: 'rest-params',
      file: 'rest-params.js',
      runtime: 'ecmascript',
      expectedOutput: ['6 0', 'a:2:true b:0:true', '0 1'],
    },
  ],
  simplifications: [
    '매개변수 기본값은 매개변수 기본값 개념에서 다룹니다.',
    'sloppy mode에서 arguments[0]과 매개변수가 연동되는 것(mapped arguments)과 arguments.callee는 다루지 않습니다. 예제 3·4의 arguments는 sloppy mode의 단순한 매개변수 목록이라 명세상 mapped 객체(CreateMappedArgumentsObject)이지만, 배열이 아니고 [[Prototype]]이 Object.prototype인 점은 unmapped 객체와 같습니다.',
    'arguments를 진짜 배열로 바꾸는 방법(배열 메서드를 빌려 쓰기, 이터러블과 스프레드)은 이 사이트에서 아직 다루지 않은 별도 개념으로만 언급합니다.',
    '제너레이터와 async 화살표 함수, getter와 setter 축약은 다루지 않습니다.',
    '비교표의 "일반 함수" 칸은 sloppy 스크립트의 function 식 기준입니다.',
    'this의 세부(call, apply, bind로 정하는 값 등)는 this 페이지에서 다루고 여기서는 요약만 합니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    "이 페이지의 예제는 스크립트로 실행한 결과를 기준으로 합니다. Node의 CommonJS 파일로 실행하면 호스트가 파일을 함수로 감싸 실행하므로, 예제 4의 12번 줄이 'undefined' 대신 'object'를 출력합니다.",
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 별도 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Arrow Function Definitions',
      url: 'https://tc39.es/ecma262/#sec-arrow-function-definitions',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: InstantiateArrowFunctionExpression',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-instantiatearrowfunctionexpression',
    },
    {
      label: 'ECMAScript 명세 — Method Definitions',
      url: 'https://tc39.es/ecma262/#sec-method-definitions',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: DefineMethod',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-definemethod',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryFunctionCreate',
      url: 'https://tc39.es/ecma262/#sec-ordinaryfunctioncreate',
    },
    {
      label: 'ECMAScript 명세 — EvaluateNew',
      url: 'https://tc39.es/ecma262/#sec-evaluatenew',
    },
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — GetThisEnvironment',
      url: 'https://tc39.es/ecma262/#sec-getthisenvironment',
    },
    {
      label: 'ECMAScript 명세 — CreateUnmappedArgumentsObject',
      url: 'https://tc39.es/ecma262/#sec-createunmappedargumentsobject',
    },
    {
      label: 'ECMAScript 명세 — CreateMappedArgumentsObject',
      url: 'https://tc39.es/ecma262/#sec-createmappedargumentsobject',
    },
    {
      label: 'ECMAScript 명세 — Parameter Lists',
      url: 'https://tc39.es/ecma262/#sec-parameter-lists',
    },
    {
      label: 'MDN — 화살표 함수',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Arrow_functions',
    },
    {
      label: 'MDN — 메서드 정의',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Method_definitions',
    },
    {
      label: 'MDN — arguments',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/arguments',
    },
    {
      label: 'MDN — 나머지 매개변수',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/rest_parameters',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
