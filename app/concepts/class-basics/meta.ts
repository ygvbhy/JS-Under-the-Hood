import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'class-basics',
  title: '클래스는 함수다: 생성자 함수와 무엇이 다를까',
  summary:
    '클래스는 typeof가 function인 함수 객체입니다. 그런데 new 없이 부르면 TypeError, 항상 strict mode, 메서드는 열거되지 않는 점이 생성자 함수와 다릅니다. 필드·static·private 필드까지 예제로 확인합니다.',
  category: 'objects',
  order: 230,
  tags: [
    '클래스',
    'class',
    '생성자 함수',
    '클래스 필드',
    'static',
    'private 필드',
    'TDZ',
    'strict mode',
    '열거 불가',
    '[[IsClassConstructor]]',
  ],
  goals: [
    '클래스가 함수 객체라는 것을 typeof, prototype, constructor, 인스턴스의 [[Prototype]]으로 설명할 수 있다.',
    '클래스를 선언 전에 쓰거나 new 없이 호출했을 때의 오류와 그 원인을 설명할 수 있다.',
    '클래스 안의 코드가 항상 strict mode이고 메서드가 열거되지 않는다는 점이 생성자 함수와 어떻게 다른지 설명할 수 있다.',
    '인스턴스 필드, static, private 필드가 각각 어디에 생기고 무엇으로 보이거나 보이지 않는지 구분할 수 있다.',
  ],
  prerequisites: [
    { label: 'new 연산자', slug: 'new-operator' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: 'TDZ', slug: 'tdz' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: ['new-operator', 'prototype-chain', 'this-binding', 'closure', 'iife-module-pattern'],
  examples: [
    {
      id: 'class-is-function',
      file: 'class-is-function.js',
      runtime: 'ecmascript',
      expectedOutput: ['function', 'true', 'true 3'],
    },
    {
      id: 'class-tdz',
      file: 'class-tdz.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', 'object', 'ReferenceError'],
    },
    {
      id: 'call-without-new',
      file: 'call-without-new.js',
      runtime: 'ecmascript',
      expectedOutput: ['called', 'TypeError', 'TypeError'],
    },
    {
      id: 'class-strict',
      file: 'class-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['true undefined', 'ReferenceError undefined'],
    },
    {
      id: 'method-enumerable',
      file: 'method-enumerable.js',
      runtime: 'ecmascript',
      expectedOutput: ['["own","hello"] ["own"]', 'false'],
    },
    {
      id: 'class-name-binding',
      file: 'class-name-binding.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'replaced', 'function undefined'],
    },
    {
      id: 'fields-static',
      file: 'fields-static.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 1 3', '["count"] false undefined'],
    },
    {
      id: 'private-field',
      file: 'private-field.js',
      runtime: 'ecmascript',
      expectedOutput: ['70', '[] {} undefined', '60 0'],
    },
    {
      id: 'method-not-constructor',
      file: 'method-not-constructor.js',
      runtime: 'ecmascript',
      expectedOutput: ['object', 'TypeError', 'false true'],
    },
  ],
  simplifications: [
    '상속(extends, super, 파생 클래스 생성자)은 다루지 않고 별도 개념으로만 언급합니다.',
    '메서드 축약 표현과 화살표 함수의 차이는 다루지 않고 별도 개념으로만 언급합니다. 메서드는 클래스 메서드만 다룹니다.',
    'private 메서드, static 블록, `#x in obj` 검사, 필드 초기화 순서의 세부, 계산된 메서드 이름, getter와 setter는 다루지 않습니다.',
    '비교표의 "생성자 함수" 칸은 function 선언으로 만든 생성자 함수 기준이고, "클래스" 칸은 class 선언 기준입니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '이 페이지의 예제는 스크립트로 실행한 결과를 기준으로 합니다. 모듈은 항상 strict mode라서 예제 4의 6번 줄에서 생성자 함수 메서드의 this도 undefined가 되어 a() === globalThis가 false입니다. 나머지 예제는 모듈에서도 결과가 같습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Class Definitions',
      url: 'https://tc39.es/ecma262/#sec-class-definitions',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ClassDefinitionEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ClassElementEvaluation',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-classelementevaluation',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: BindingClassDeclarationEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-bindingclassdeclarationevaluation',
    },
    {
      label: 'ECMAScript 명세 — [[Call]] ( thisArg, argList )',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-function-objects-call-thisargument-argumentslist',
    },
    {
      label: 'ECMAScript 명세 — Strict Mode Code',
      url: 'https://tc39.es/ecma262/#sec-strict-mode-code',
    },
    {
      label: 'ECMAScript 명세 — DefineMethodProperty ( homeObj, name, closure, enumerable )',
      url: 'https://tc39.es/ecma262/#sec-definemethodproperty',
    },
    {
      label: 'ECMAScript 명세 — MakeConstructor ( func [ , writableProto [ , proto ] ] )',
      url: 'https://tc39.es/ecma262/#sec-makeconstructor',
    },
    {
      label: 'ECMAScript 명세 — The typeof Operator: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-typeof-operator-runtime-semantics-evaluation',
    },
    {
      label: 'MDN — 클래스',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes',
    },
    {
      label: 'MDN — class 선언',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/class',
    },
    {
      label: 'MDN — 비공개 요소(private 필드)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes/Private_elements',
    },
    {
      label: 'MDN — static',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes/static',
    },
    {
      label: 'MDN — Public class fields',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields',
    },
  ],
  reviewedAt: '2026-10-30',
} satisfies ConceptMeta
