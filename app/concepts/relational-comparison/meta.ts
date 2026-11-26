import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'
const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/'

export const concept = {
  slug: 'relational-comparison',
  title: '관계 비교: null >= 0은 true인데 null == 0은 왜 false일까',
  summary:
    'null >= 0은 true이고 null > 0, null == 0은 false입니다. 문자열끼리가 아니면(BigInt 제외) 값을 숫자로 바꿔 비교하고, NaN이 끼면 IsLessThan이 undefined를 돌려줘 <=와 >=도 false입니다. 범위 검사와 변환 순서도 봅니다.',
  category: 'fundamentals',
  order: 45,
  tags: [
    '관계 연산자',
    '비교 연산자',
    'IsLessThan',
    '크기 비교',
    '범위 검사',
    'null',
    'undefined',
    'NaN',
    '>=',
    '<=',
    '>',
    '<',
    'relational operators',
  ],
  goals: [
    'null·undefined·NaN을 관계 연산자로 비교한 결과를, 두 값을 숫자로 바꾸는 규칙(null은 0, undefined는 NaN)과 NaN이면 결과가 없다는 규칙으로 설명하고 예측할 수 있다.',
    '<=와 >=가 명세에서 IsLessThan의 결과가 true나 undefined이면 false로 정의된다는 것을 알고, "<이거나 ==" 또는 "반대 연산자의 부정"이라는 설명이 틀리는 경우를 들 수 있다.',
    'v >= 0 && v <= 10 같은 범위 검사가 null, 빈 문자열, 공백 문자열, false를 통과시키고 undefined와 숫자로 읽을 수 없는 문자열은 걸러 내는 이유를 설명할 수 있다.',
    '피연산자를 모두 평가한 뒤 왼쪽 값부터 원시 값으로 바꾼다는 순서를 valueOf가 불리는 순서로 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
    { label: '동등 비교', slug: 'equality-operators' },
    { label: '단축 평가와 truthy/falsy', slug: 'short-circuit-evaluation' },
    { label: '함수 선언과 호출' },
  ],
  related: [
    'to-primitive',
    'function-definitions',
    'function-calls',
    'number-type',
    'bigint',
    'array-method-pitfalls',
    'typeof-operator',
  ],
  examples: [
    {
      id: 'null-vs-zero',
      file: 'null-vs-zero.js',
      runtime: 'ecmascript',
      expectedOutput: ['false false true', 'true true false'],
    },
    {
      id: 'undefined-and-nan',
      file: 'undefined-and-nan.js',
      runtime: 'ecmascript',
      expectedOutput: ['false false false false', 'false false false false'],
    },
    {
      id: 'le-ge-definition',
      file: 'le-ge-definition.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false true', 'false false true'],
    },
    {
      id: 'range-check',
      file: 'range-check.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false true true', 'true false true false'],
    },
    {
      id: 'conversion-order',
      file: 'conversion-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['false abAB', 'true abAB'],
    },
  ],
  simplifications: [
    "예제는 sloppy mode 스크립트이고 첫 줄에 'use strict';를 붙여도 출력이 같습니다. console은 ECMAScript가 아니라 호스트가 제공하는 API입니다.",
    '명세의 GetValue와 오류 처리(?)는 생략하고, ToPrimitive(number 힌트) 뒤의 ToNumeric을 "숫자로 바꾼다"로 줄여 말합니다. 객체 피연산자를 원시 값으로 바꾼 결과가 둘 다 문자열이면 문자열로 비교하며, 이 과정은 객체를 원시 값으로 개념에서 다룹니다. 값이 BigInt이거나 두 값이 모두 문자열인 경우 IsLessThan이 다르게 비교하는 부분은 BigInt 개념과 암묵적 타입 변환 개념에서 다룹니다.',
    '예제 4·5의 함수 선언과 호출은 값을 여러 번 검사하려는 용도입니다. 함수를 정의하는 방법은 함수를 정의하는 방법 개념에서, 호출은 함수 호출 개념에서 다룹니다.',
    '예제 5의 valueOf는 객체가 원시 값으로 바뀔 때 불린다는 것만 전제하고 기록하려는 용도입니다. 변환 메서드를 고르는 과정(힌트, OrdinaryToPrimitive)은 객체를 원시 값으로 개념에서 다룹니다.',
    '>와 <=가 명세에서 피연산자를 뒤집어 IsLessThan을 부른다는 것은 정의를 적는 방식이라 실행 결과로는 구별되지 않습니다. 예제 5는 두 피연산자를 모두 평가한 뒤 왼쪽 값부터 원시 값으로 바뀐다는 결과만 보입니다.',
    '예제 4 결과에서 언급한 typeof 검사는 typeof 연산자 개념에서 다룹니다.',
    'Symbol은 숫자로 바꿀 수 없어 관계 비교에서 TypeError를 던집니다. 범위 검사의 통과와 걸러짐은 예외가 나지 않는 값에 한한 이야기입니다.',
    'instanceof와 in도 명세에서 같은 관계 연산자 문법 규칙에 속하지만 다루지 않습니다.',
    '-0과 +0의 비교, document.all, 배열 같은 객체 피연산자의 변환 결과는 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Relational Operators: Runtime Semantics: Evaluation',
      url: `${SPEC}sec-relational-operators-runtime-semantics-evaluation`,
    },
    { label: 'ECMAScript 명세 — IsLessThan', url: `${SPEC}sec-islessthan` },
    {
      label: 'ECMAScript 명세 — Number::lessThan',
      url: `${SPEC}sec-numeric-types-number-lessThan`,
    },
    { label: 'ECMAScript 명세 — IsLooselyEqual', url: `${SPEC}sec-islooselyequal` },
    { label: 'MDN — 미만 연산자 (<)', url: `${MDN}Less_than` },
    { label: 'MDN — 이상 연산자 (>=)', url: `${MDN}Greater_than_or_equal` },
    { label: 'MDN — 이하 연산자 (<=)', url: `${MDN}Less_than_or_equal` },
  ],
  reviewedAt: '2026-11-26',
} satisfies ConceptMeta
