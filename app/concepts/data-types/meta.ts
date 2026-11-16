import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'data-types',
  title: '데이터 타입: 숫자를 넣은 변수에 왜 문자열도 넣을 수 있을까',
  summary:
    '타입은 변수가 아니라 값에 있습니다. 명세의 언어 타입 8개, 동적 타이핑, 따옴표 세 종류와 템플릿 리터럴, undefined와 null의 정의를 정리합니다.',
  category: 'fundamentals',
  order: 7,
  tags: [
    '데이터 타입',
    '타입',
    '동적 타이핑',
    '원시 값',
    '문자열',
    '템플릿 리터럴',
    'undefined',
    'null',
    'BigInt',
  ],
  goals: [
    '명세가 정한 언어 타입 8개를 말하고, 타입이 변수가 아니라 값에 있다는 것을 설명할 수 있다.',
    '같은 변수에 다른 타입의 값을 차례로 할당할 수 있는 이유를 명세의 문법과 바인딩 연산으로 설명하고, 예제의 출력을 예측할 수 있다.',
    '작은따옴표·큰따옴표·백틱이 모두 문자열 값을 만든다는 것과, 따옴표 문자열과 템플릿 리터럴이 줄바꿈을 다루는 방식을 설명할 수 있다.',
    'undefined와 null이 타입이 다른 서로 다른 값이라는 것을 설명하고, 선언만 한 변수와 null을 넣은 변수의 비교 결과를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '변수 선언과 할당', slug: 'variable-declaration' },
    { label: '표현식과 문', slug: 'expressions-statements' },
  ],
  related: [
    'typeof-operator',
    'number-type',
    'number-pitfalls',
    'string-utf16',
    'symbol',
    'primitives-and-objects',
    'equality-operators',
    'type-coercion',
    'spread-destructuring',
    'tdz',
    'variable-declaration',
    'global-object',
    'function-calls',
  ],
  examples: [
    {
      id: 'dynamic-typing',
      file: 'dynamic-typing.js',
      runtime: 'ecmascript',
      expectedOutput: ['number', 'string', 'boolean'],
    },
    {
      id: 'quotes',
      file: 'quotes.js',
      runtime: 'ecmascript',
      expectedOutput: ['true true', 'string', 'true', '2 + 1 = 3'],
    },
    {
      id: 'undefined-null',
      file: 'undefined-null.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false', 'true false'],
    },
    {
      id: 'global-name',
      file: 'global-name.html',
      runtime: 'browser',
      expectedOutput: ['string true'],
    },
  ],
  simplifications: [
    '현재 명세의 언어 타입 8개를 기준으로 합니다. 참고 도서는 판에 따라 BigInt를 빼고 7개로 설명할 수 있습니다. BigInt는 숫자의 함정 개념에서 다룹니다.',
    '명세는 값이 메모리에 어떻게 놓이는지 정하지 않으므로, 타입을 메모리 크기나 해석 방법으로 설명하지 않습니다.',
    'typeof는 typeof 연산자 개념에서, ===와 ==는 동등 비교 개념에서 다룹니다. 예제에서는 값을 확인하는 도구로만 씁니다.',
    "각 타입의 세부는 숫자 타입, 문자열 길이와 UTF-16, 심벌, 원시 값과 객체 개념에서 다룹니다. 표의 {}(객체 리터럴)와 Symbol('id')(함수 호출)는 값의 예로만 씁니다. 객체는 원시 값과 객체 개념에서, 함수 호출은 함수 호출 개념에서 다룹니다.",
    '따옴표 문자열 안에 그대로 쓸 수 없는 줄바꿈은 LF와 CR입니다. 백슬래시 바로 뒤의 줄바꿈(줄 잇기)은 허용되고 값에 아무것도 넣지 않습니다. U+2028과 U+2029는 따옴표 문자열에 쓸 수 있고, 템플릿 리터럴 안에서도 LF로 바뀌지 않습니다. 이스케이프 시퀀스는 \\n만 쓰고, 그 밖의 이스케이프 규칙(따옴표와 템플릿의 차이 포함)은 다루지 않습니다.',
    '태그드 템플릿과 String.raw는 다루지 않습니다. ${} 안의 값을 문자열로 바꾸는 규칙은 암묵적 타입 변환 개념에서 다룹니다.',
    'let x;처럼 초기값 없이 선언한 let 변수는 선언문이 실행된 뒤 undefined이고, let·const 변수를 선언문이 실행되기 전에 읽으면 undefined가 아니라 ReferenceError입니다(TDZ 개념에서 다룹니다). const는 초기값 없는 선언이 SyntaxError입니다. var로 선언한 변수가 값을 할당하기 전에 undefined인 이유는 변수 선언과 할당 개념에서, undefined가 식별자라는 점은 전역 객체 개념에서 다룹니다.',
    '동적 타입 언어와 정적 타입 언어는 명세 용어가 아닌 일반 용어입니다. 다른 언어의 타입 검사 방식은 다루지 않습니다.',
    '명세의 SetMutableBinding은 환경 레코드의 종류(선언적·객체·전역)마다 따로 정의되어 있고, 셋 모두 값 인수를 언어 값으로 받으며 값의 타입을 검사하지 않습니다. 맨 바깥 var 변수는 전역 환경 레코드의 연산을 거칩니다. 환경 레코드 자체는 다루지 않습니다.',
    '브라우저 전역 객체의 접근자 프로퍼티와 이름이 같은 맨 바깥 var는 name 한 가지 예만 보입니다. 세터가 없는 프로퍼티(예: top)를 포함한 다른 프로퍼티, 세터가 값을 바꾸는 규칙(WebIDL 변환), 다른 호스트의 전역 객체는 다루지 않습니다.',
    '예제의 console.log는 값을 출력하는 호스트 API이며 ECMAScript 언어의 일부가 아닙니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — ECMAScript Overview',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-overview',
    },
    {
      label: 'ECMAScript 명세 — ECMAScript Language Types',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types',
    },
    {
      label: 'ECMAScript 명세 — The Undefined Type',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type',
    },
    {
      label: 'ECMAScript 명세 — The Null Type',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type',
    },
    {
      label: 'ECMAScript 명세 — String Literals',
      url: 'https://tc39.es/ecma262/#sec-literals-string-literals',
    },
    {
      label: 'ECMAScript 명세 — Template Literal Lexical Components',
      url: 'https://tc39.es/ecma262/#sec-template-literal-lexical-components',
    },
    {
      label: 'ECMAScript 명세 — Static Semantics: TV',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-tv',
    },
    {
      label: 'ECMAScript 명세 — SetMutableBinding (Global Environment Record)',
      url: 'https://tc39.es/ecma262/#sec-global-environment-records-setmutablebinding-n-v-s',
    },
    {
      label: 'MDN — JavaScript의 타입과 자료구조',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Data_structures',
    },
    {
      label: 'MDN — 템플릿 리터럴',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Template_literals',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
