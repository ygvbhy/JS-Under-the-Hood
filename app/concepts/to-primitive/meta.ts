import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'
const MDN = 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/'

export const concept = {
  slug: 'to-primitive',
  title: "객체를 원시 값으로: [] + {}는 왜 '[object Object]'일까",
  summary:
    '객체를 문자열이나 숫자로 바꿔야 할 때 명세의 ToPrimitive는 Symbol.toPrimitive를 먼저 보고, 없으면 연산이 정한 힌트에 따라 valueOf와 toString을 정해진 순서로 불러 처음 나온 원시 값을 씁니다. [] + {}의 결과를 이 순서로 확인합니다.',
  category: 'objects',
  order: 305,
  tags: [
    'ToPrimitive',
    'OrdinaryToPrimitive',
    'valueOf',
    'toString',
    'Symbol.toPrimitive',
    '힌트',
    '암묵적 변환',
    '[object Object]',
  ],
  goals: [
    '연산이 ToPrimitive에 주는 힌트(없음·string·number)에 따라 valueOf와 toString 중 무엇을 먼저 부르는지 예측할 수 있다.',
    'valueOf·toString 중 하나가 객체를 돌려주면 다음 메서드로 넘어가고, 둘 다 원시 값을 주지 못하면 TypeError라는 것으로 [] + {}, [] + [], Object.create(null)의 결과를 설명할 수 있다.',
    'ToPrimitive가 돌려준 원시 값에 연산이 다시 자기 변환(ToString·ToNumber 등)을 한다는 것을 구분할 수 있다.',
    'Symbol.toPrimitive가 있으면 valueOf·toString보다 먼저 쓰이고, Date는 힌트가 없을 때 문자열 쪽을 먼저 쓴다는 것을 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: '심벌', slug: 'symbol' },
  ],
  related: [
    'type-coercion',
    'prototype-chain',
    'symbol',
    'date',
    'equality-operators',
    'property-keys',
    'primitive-methods',
    'bigint',
    'expressions-statements',
    'json',
    'error-handling',
  ],
  examples: [
    {
      id: 'hint-order',
      file: 'hint-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['"1" valueOf', '"two" toString'],
    },
    {
      id: 'operation-hints',
      file: 'operation-hints.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 1 true', 'true false', 'two two'],
    },
    {
      id: 'array-and-object',
      file: 'array-and-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', '"1,21" "" "[object Object]"', '10 true true', '6 true'],
    },
    {
      id: 'primitive-result',
      file: 'primitive-result.js',
      runtime: 'ecmascript',
      expectedOutput: ['4 "51"'],
    },
    {
      id: 'type-error',
      file: 'type-error.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'TypeError'],
    },
    {
      id: 'symbol-and-date',
      file: 'symbol-and-date.js',
      runtime: 'ecmascript',
      expectedOutput: ['default 0', 'string -1'],
    },
  ],
  simplifications: [
    '힌트 문자열로 분기하는 `Symbol.toPrimitive` 메서드를 작성하는 방법과 well-known 심벌은 심벌 개념에서 다룹니다.',
    'Date의 다른 변환(시각 값, toString 형식)은 Date 개념에서 다룹니다. 명세가 정의한 객체 중 기본 동작을 바꾸는 것은 Date와 Symbol 객체뿐이며 Symbol 객체는 다루지 않습니다.',
    '원시 값끼리의 변환 규칙은 암묵적 타입 변환 개념에서, ToPrimitive가 BigInt를 돌려준 뒤의 연산은 BigInt 개념에서 다룹니다.',
    '`==`의 나머지 단계(null·undefined, 객체끼리, 불리언의 숫자 변환)는 동등 비교 개념에서 다룹니다.',
    '`a > b`는 IsLessThan이 두 피연산자의 순서를 바꿔 계산하며, 이 페이지는 그 결과의 힌트(number)만 씁니다.',
    'Array.prototype.toString은 join을 부르며 join의 세부(null·undefined 요소, 중첩 배열)는 다루지 않습니다. `Symbol.toStringTag`로 태그를 바꾼 객체는 심벌 개념에서 다룹니다.',
    '`{} + []`처럼 `{}`가 문 맨 앞에 오면 블록으로 읽혀 결과가 달라지므로, 이 페이지는 `{}`가 앞에 오는 형태를 다루지 않습니다(표현식과 문 개념).',
    '예제의 메서드는 객체 리터럴에 직접 정의한 자기 프로퍼티입니다. `Object.prototype`의 메서드를 바꾸는 방법은 다루지 않습니다. `JSON.stringify`는 빈 문자열을 보이려는 출력 용도이며 JSON 개념에서 다룹니다.',
    '예제의 try…catch는 try/catch/finally 개념에서 다룹니다. console은 호스트 API입니다.',
  ],
  references: [
    { label: 'ECMAScript 명세 — ToPrimitive', url: `${SPEC}sec-toprimitive` },
    {
      label: 'ECMAScript 명세 — OrdinaryToPrimitive',
      url: `${SPEC}sec-ordinarytoprimitive`,
    },
    {
      label: 'ECMAScript 명세 — ApplyStringOrNumericBinaryOperator',
      url: `${SPEC}sec-applystringornumericbinaryoperator`,
    },
    { label: 'ECMAScript 명세 — IsLooselyEqual', url: `${SPEC}sec-islooselyequal` },
    { label: 'ECMAScript 명세 — IsLessThan', url: `${SPEC}sec-islessthan` },
    { label: 'ECMAScript 명세 — ToPropertyKey', url: `${SPEC}sec-topropertykey` },
    {
      label: 'ECMAScript 명세 — Object.prototype.valueOf',
      url: `${SPEC}sec-object.prototype.valueof`,
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.toString',
      url: `${SPEC}sec-array.prototype.tostring`,
    },
    {
      label: 'ECMAScript 명세 — Date.prototype[%Symbol.toPrimitive%]',
      url: `${SPEC}sec-date.prototype-%symbol.toprimitive%`,
    },
    { label: 'MDN — Symbol.toPrimitive', url: `${MDN}Symbol/toPrimitive` },
    { label: 'MDN — Object.prototype.valueOf()', url: `${MDN}Object/valueOf` },
  ],
  reviewedAt: '2026-11-20',
} satisfies ConceptMeta
