import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'

export const concept = {
  slug: 'function-name',
  title: '함수의 name: o.p = () => {}의 name은 왜 빈 문자열일까',
  summary:
    '익명 함수 정의는 변수 초기화식, 식별자 대입의 오른쪽, 리터럴의 키: 값처럼 명세가 정한 자리에 바로 있을 때만 이름을 받고, 프로퍼티에 대입하거나 인수로 넘기면 빈 문자열입니다. 메서드·getter·setter는 키로 이름이 정해집니다. 그 이유를 명세와 실행으로 확인합니다.',
  category: 'fundamentals',
  order: 257,
  tags: [
    'name',
    '이름 추론',
    'NamedEvaluation',
    'SetFunctionName',
    '익명 함수',
    'getter',
    'bind',
    'Function 생성자',
  ],
  goals: [
    '익명 함수 정의가 변수 초기화식·매개변수 기본값·식별자 대입의 오른쪽, 리터럴의 키: 값에 바로 있으면 그 이름을 받고, 메서드·getter·setter는 키(getter·setter는 get·set 접두)를 받는다는 것을 예측할 수 있다.',
    'o.p = () => {}, 인수로 넘긴 함수, 쉼표·||로 감싼 함수의 name이 빈 문자열인 이유를 "왼쪽이 식별자인가", "오른쪽 식이 함수 정의 그 자체인가"라는 두 조건으로 설명할 수 있다.',
    '이미 만든 함수를 다른 변수에 담아도 name이 바뀌지 않고, Function 생성자로 만든 함수는 anonymous라는 것을 예측할 수 있다.',
    'name 프로퍼티의 어트리뷰트로 대입(sloppy 무시·strict TypeError), defineProperty, delete, bind의 결과를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '함수를 정의하는 방법', slug: 'function-definitions' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
  ],
  related: [
    'function-definitions',
    'property-attributes',
    'arrow-functions',
    'default-parameters',
    'this-binding',
    'prototype-chain',
    'strict-mode',
    'short-circuit-evaluation',
    'class-basics',
    'symbol',
    'spread-destructuring',
    'es-modules',
    'generator',
    'async-await',
    'error-handling',
  ],
  examples: [
    {
      id: 'binding-names',
      file: 'binding-names.js',
      runtime: 'ecmascript',
      expectedOutput: ['"decl" "v" "arrow" "later" "cb"'],
    },
    {
      id: 'property-key-names',
      file: 'property-key-names.js',
      runtime: 'ecmascript',
      expectedOutput: ['"prop" "method"', '"get size" "set size" 1', '"item1" "1.5"'],
    },
    {
      id: 'no-name',
      file: 'no-name.js',
      runtime: 'ecmascript',
      expectedOutput: ['"" ""', '""', '"paren" "" ""'],
    },
    {
      id: 'fixed-at-creation',
      file: 'fixed-at-creation.js',
      runtime: 'ecmascript',
      expectedOutput: ['"original"', '"inner"', '"b" "b"', '"anonymous"'],
    },
    {
      id: 'name-attributes',
      file: 'name-attributes.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'false false true',
        '"f"',
        'TypeError',
        '"z" "bound z"',
        '"" false',
        '"" true',
      ],
    },
  ],
  simplifications: [
    '"이름 추론"은 널리 쓰는 표현이지만 명세의 용어가 아닙니다. 명세는 이를 NamedEvaluation과 SetFunctionName으로 정의합니다.',
    '함수 length의 기본 규칙은 매개변수 기본값 개념에서, bound function의 length·prototype·this는 this 개념에서 다룹니다.',
    '심벌을 키로 쓴 메서드의 name은 [설명] 꼴(설명이 없으면 빈 문자열)이 되지만 예제로 다루지 않습니다. 심벌은 심벌 개념에서 다룹니다.',
    '디스트럭처링 기본값(const { a = () => {} } = {})도 바인딩 이름을 넘기지만 다루지 않습니다. 디스트럭처링은 스프레드와 디스트럭처링 개념에서 다룹니다. 모듈의 export default에 쓴 익명 함수의 name도 다루지 않습니다.',
    "이름 없는 제너레이터 함수 식·async 함수 식·async 화살표 함수와 클래스 식도 익명 함수 정의라 같은 규칙으로 name이 정해지지만(const B = class {}의 B.name은 'B') 예제로 보이지 않습니다. 클래스 필드의 초기화식도 필드 이름을 넘깁니다(h = () => {}의 name은 'h'). 클래스는 클래스는 함수다 개념, 제너레이터 함수는 제너레이터 개념, async 함수는 async/await 개념에서 다룹니다. static name 메서드와 겹치는 경우, 다른 클래스를 상속한 클래스에서 name을 지운 경우(프로토타입 체인에서 부모 클래스의 name을 읽습니다), private 메서드, Function.prototype.toString이 쓰는 [[InitialName]]은 다루지 않습니다.",
    '리터럴의 __proto__: function () {}는 프로퍼티를 만들지 않고 프로토타입을 정하는 형태라 이름을 넘기지 않습니다(빈 문자열). 왼쪽을 괄호로 감싼 (x) = function () {}도 왼쪽이 식별자로 취급되지 않아 빈 문자열입니다.',
    '오류 스택이나 디버거에 보이는 함수 표시 이름은 엔진(V8 등)이 따로 정하는 비표준 표시이며 name 프로퍼티와 별개입니다(Node에서 o.p에 담은 화살표 함수가 던진 오류의 스택은 at o.p로 표시됩니다).',
    "예제 5는 sloppy mode에 기댑니다. 파일 첫 줄에 'use strict';를 붙이면 5번 줄의 대입이 TypeError가 되어 실행이 멈춥니다. 나머지 예제는 지시어를 붙여도 출력이 같습니다.",
    '예제의 try…catch는 오류 이름을 보이려는 용도이며 try/catch/finally 개념에서 다룹니다. console은 ECMAScript가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    { label: 'ECMAScript 명세 — SetFunctionName', url: `${SPEC}sec-setfunctionname` },
    {
      label: 'ECMAScript 명세 — IsAnonymousFunctionDefinition',
      url: `${SPEC}sec-isanonymousfunctiondefinition`,
    },
    {
      label: 'ECMAScript 명세 — NamedEvaluation',
      url: `${SPEC}sec-runtime-semantics-namedevaluation`,
    },
    {
      label: 'ECMAScript 명세 — IsIdentifierRef',
      url: `${SPEC}sec-static-semantics-isidentifierref`,
    },
    {
      label: 'ECMAScript 명세 — Assignment Operators의 런타임 의미',
      url: `${SPEC}sec-assignment-operators-runtime-semantics-evaluation`,
    },
    {
      label: 'ECMAScript 명세 — PropertyDefinitionEvaluation',
      url: `${SPEC}sec-runtime-semantics-propertydefinitionevaluation`,
    },
    {
      label: 'ECMAScript 명세 — Function.prototype.bind',
      url: `${SPEC}sec-function.prototype.bind`,
    },
    { label: 'ECMAScript 명세 — CreateDynamicFunction', url: `${SPEC}sec-createdynamicfunction` },
    {
      label: 'MDN — Function.prototype.name',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function/name',
    },
  ],
  reviewedAt: '2026-11-20',
} satisfies ConceptMeta
