import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'class-accessors',
  title: '클래스의 getter와 setter: 대입했는데 왜 자기 프로퍼티가 생기지 않을까',
  summary:
    '클래스의 get·set은 인스턴스가 아니라 프로토타입에 접근자를 만듭니다. 서브클래스의 getter, 필드, super, static, private 접근자에서 대입이 어디로 가는지 예제로 확인합니다.',
  category: 'objects',
  order: 245,
  tags: [
    'getter',
    'setter',
    '접근자 프로퍼티',
    '클래스',
    '오버라이드',
    '클래스 필드',
    'super',
    'static',
    'private 접근자',
  ],
  goals: [
    '클래스의 get·set이 어디에 정의되고, 대입이 setter를 어떤 this로 부르는지 설명할 수 있다.',
    '서브클래스가 getter만 정의했을 때 대입이 실패하는 이유와 super로 부모의 접근자를 부르는 방법을 설명할 수 있다.',
    '클래스 필드(정의)와 대입의 차이를 setter가 불리는지로 구분하고, 부모 생성자의 대입이 자식 setter로 가는 이유를 설명할 수 있다.',
    'static 접근자는 클래스(생성자 함수) 쪽 프로토타입 체인에서, private 접근자는 체인 없이 객체 자신의 private 요소에서 찾는다는 것과, private 접근자를 읽을 때 일반 접근자와 어떻게 다른지 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '클래스 상속과 super', slug: 'class-inheritance' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: 'this 바인딩', slug: 'this-binding' },
  ],
  related: [
    'class-basics',
    'class-inheritance',
    'property-attributes',
    'prototype-chain',
    'this-binding',
    'strict-mode',
    'error-handling',
  ],
  examples: [
    {
      id: 'prototype-accessor',
      file: 'prototype-accessor.js',
      runtime: 'ecmascript',
      expectedOutput: ['212', '0 20', 'false true ["_c"]', 'true function function false'],
    },
    {
      id: 'getter-only-override',
      file: 'getter-only-override.js',
      runtime: 'ecmascript',
      expectedOutput: ['10 1 false', 'undefined', 'TypeError'],
    },
    {
      id: 'super-accessor',
      file: 'super-accessor.js',
      runtime: 'ecmascript',
      expectedOutput: ['50 5 false'],
    },
    {
      id: 'derived-field',
      file: 'derived-field.js',
      runtime: 'ecmascript',
      expectedOutput: ['0 true 2 1', '0 3 1'],
    },
    {
      id: 'field-vs-setter',
      file: 'field-vs-setter.js',
      runtime: 'ecmascript',
      expectedOutput: ['0 true 1', '1 false undefined'],
    },
    {
      id: 'base-constructor-setter',
      file: 'base-constructor-setter.js',
      runtime: 'ecmascript',
      expectedOutput: ['setter 1 undefined', 'false d'],
    },
    {
      id: 'static-accessor',
      file: 'static-accessor.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false undefined', '0 7 true'],
    },
    {
      id: 'private-accessor',
      file: 'private-accessor.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'private TypeError TypeError',
        'public public public',
        'undefined TypeError',
      ],
    },
    {
      id: 'setter-recursion',
      file: 'setter-recursion.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 false'],
    },
  ],
  simplifications: [
    '객체 리터럴의 get·set과 Object.defineProperty로 만드는 접근자는 프로퍼티 어트리뷰트와 접근자 개념에서, 객체 리터럴 쪽의 상속된 setter는 프로토타입 체인 개념에서 다룹니다. 이 페이지는 클래스 문법에서만 생기는 점에 집중합니다.',
    '`super.v = x`는 부모 쪽에서 setter가 있는 접근자를 찾는 경우만 다룹니다. 부모 쪽에서 그런 접근자를 찾지 못할 때는 결과가 경우마다 달라서 다루지 않습니다.',
    '계산된 이름의 접근자(`get [key]()`), 심벌 키 접근자, static 블록, static private 요소(필드·접근자) 전반(서브클래스를 this로 읽으면 TypeError가 되는 경우 포함), `#v in obj` 검사는 다루지 않습니다.',
    '명세는 private 메서드와 접근자를 인스턴스의 private 요소 목록에 더하는 것으로 설명하지만, 명세의 NOTE가 밝히듯 이는 명세를 쉽게 쓰기 위한 방식이고 구현은 메서드와 접근자를 하나씩 추적하지 않는 방식을 택할 수 있으며, 함수는 인스턴스끼리 공유되고 새로 복사되지 않습니다. 이 페이지는 "인스턴스마다 접근자 함수가 생긴다"는 뜻으로 쓰지 않고, 확인할 수 있는 동작(다른 객체에서 읽으면 TypeError)만 보입니다.',
    '같은 이름의 메서드와 접근자를 한 클래스에 함께 정의해, 프로토타입의 한 프로퍼티가 메서드(데이터 프로퍼티)와 접근자 사이에서 바뀌는 경우(메서드 `v()`와 `get v` 등)는 다루지 않습니다.',
    '데코레이터와 `accessor` 키워드(제안 단계)는 다루지 않습니다.',
    '클래스의 접근자는 프로토타입에 있는 열거 불가 프로퍼티라서 `JSON.stringify`와 전개 결과에 나타나지 않는다는 점은 다루지 않습니다. 접근자가 인스턴스의 자기 프로퍼티가 아니라는 것은 `Object.keys`로만 보입니다.',
    '예제 2의 26번 줄 `b.v = 5`는 클래스 바깥의 sloppy mode 코드라서 실패가 조용히 무시됩니다. 같은 줄이 strict mode나 모듈에 있으면 TypeError이고 스크립트가 그 줄에서 멈춥니다. 나머지 예제는 맨 앞에 지시어를 붙여도 출력이 같습니다.',
    '멈춤 조건이 없는 setter 재귀는 명세에 호출 깊이 한계에 대한 규정이 없어 알고리즘으로는 끝없이 이어지고, Node(V8)에서는 RangeError로 끝납니다. 이는 엔진 동작이며 다른 엔진은 확인하지 않았고, 예제의 출력에는 넣지 않았습니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '이 페이지의 예제는 Node의 vm 모듈에서 스크립트로 실행한 결과를 기준으로 합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ClassElementEvaluation',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-classelementevaluation',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: MethodDefinitionEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-methoddefinitionevaluation',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: ClassDefinitionEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation',
    },
    {
      label: 'ECMAScript 명세 — ValidateAndApplyPropertyDescriptor',
      url: 'https://tc39.es/ecma262/#sec-validateandapplypropertydescriptor',
    },
    {
      label: 'ECMAScript 명세 — OrdinarySetWithOwnDescriptor',
      url: 'https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor',
    },
    {
      label: 'ECMAScript 명세 — MakeSuperPropertyReference',
      url: 'https://tc39.es/ecma262/#sec-makesuperpropertyreference',
    },
    {
      label: 'ECMAScript 명세 — DefineField',
      url: 'https://tc39.es/ecma262/#sec-definefield',
    },
    {
      label: 'ECMAScript 명세 — CreateDataPropertyOrThrow',
      url: 'https://tc39.es/ecma262/#sec-createdatapropertyorthrow',
    },
    {
      label: 'ECMAScript 명세 — PrivateMethodOrAccessorAdd',
      url: 'https://tc39.es/ecma262/#sec-privatemethodoraccessoradd',
    },
    {
      label: 'ECMAScript 명세 — PrivateGet',
      url: 'https://tc39.es/ecma262/#sec-privateget',
    },
    {
      label: 'ECMAScript 명세 — PrivateSet',
      url: 'https://tc39.es/ecma262/#sec-privateset',
    },
    {
      label: 'MDN — getter',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/get',
    },
    {
      label: 'MDN — setter',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/set',
    },
    {
      label: 'MDN — static',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes/static',
    },
    {
      label: 'MDN — 비공개 요소(private 요소)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Classes/Private_elements',
    },
    {
      label: 'MDN — super',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/super',
    },
    {
      label: 'MDN — Public class fields',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields',
    },
  ],
  reviewedAt: '2026-11-18',
} satisfies ConceptMeta
