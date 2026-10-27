import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'equality-operators',
  title: '동등 비교: ==와 ===는 무엇이 다른가',
  summary:
    "===는 타입이 다르면 바로 false이고, ==는 타입이 다르면 정해진 규칙에 따라 값을 바꾼 뒤 다시 비교합니다. 규칙을 알면 0 == ''가 true인데 '0' == ''는 false이고 NaN === NaN이 false인 이유를 설명할 수 있습니다.",
  category: 'fundamentals',
  tags: [
    '동등 비교',
    '일치 비교',
    '느슨한 동등 비교',
    '엄격한 동등 비교',
    '==',
    '===',
    '!=',
    '!==',
    'loose equality',
    'strict equality',
    'IsLooselyEqual',
    'IsStrictlyEqual',
    'NaN',
    'Object.is',
    'Number.isNaN',
    'null',
    'undefined',
  ],
  goals: [
    '===가 타입이 다르면 값을 바꾸지 않고 false를 돌려준다는 것을 설명할 수 있다.',
    '==가 타입이 다를 때 적용하는 규칙(null/undefined, 문자열을 숫자로, 불리언을 숫자로)을 순서대로 적용해 결과를 예측할 수 있다.',
    '==가 불리언으로 바꿔 비교하지 않는다는 것을 truthy/falsy와 구분해 설명할 수 있다.',
    'NaN과 +0/-0에서 ===의 예외를 알고 Number.isNaN·Object.is로 확인할 수 있다.',
    '두 객체의 비교가 내용이 아니라 같은 객체인지로 결정된다는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '데이터 타입' },
    { label: '연산자' },
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
  ],
  related: ['type-coercion', 'primitives-and-objects'],
  examples: [
    {
      id: 'strict',
      file: 'strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false true', 'true false true'],
    },
    {
      id: 'number-string',
      file: 'number-string.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false false'],
    },
    { id: 'boolean', file: 'boolean.js', runtime: 'ecmascript', expectedOutput: ['true false'] },
    {
      id: 'null-undefined',
      file: 'null-undefined.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false false'],
    },
    {
      id: 'nan-and-zero',
      file: 'nan-and-zero.js',
      runtime: 'ecmascript',
      expectedOutput: ['false false', 'true true', 'true false'],
    },
    {
      id: 'objects',
      file: 'objects.js',
      runtime: 'ecmascript',
      expectedOutput: ['false false true', 'true'],
    },
    {
      id: 'null-check',
      file: 'null-check.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false', 'true false', 'false'],
    },
  ],
  simplifications: [
    '시뮬레이터는 IsLooselyEqual이 값을 바꾼 뒤 자기 자신을 다시 호출하는 과정을 "라운드"로 나눠 보여 줍니다. 평가 단계(GetValue)와 완료 처리 표기(!, ?)는 묶어서 표시하지 않습니다.',
    '명세는 a == b, a === b를 오른쪽 값을 첫 인수로 넘겨(IsLooselyEqual(b, a)) 계산합니다. 명세 Note대로 a == b는 평가 순서를 빼면 b == a와 같으므로, 시뮬레이터와 본문은 왼쪽과 오른쪽을 소스 그대로 보여 줍니다.',
    '"문자열을 숫자로", "불리언을 숫자로", "해당하는 규칙이 없음" 같은 규칙 이름과 "라운드"는 교육용 이름이며 명세 용어가 아닙니다.',
    'BigInt와 Symbol이 끼는 ==의 규칙(문자열을 BigInt로 바꾸는 규칙, BigInt와 숫자 비교)은 다루지 않습니다.',
    '객체를 원시 값으로 바꾸는 과정(ToPrimitive)은 결과만 보여 줍니다. 데이터만 담은 객체 리터럴은 문자열 "[object Object]"가 되며, valueOf·toString을 직접 정의한 객체는 결과가 달라지는데 이 경우는 다루지 않습니다(암묵적 타입 변환 페이지와 같은 범위입니다).',
    '브라우저 호스트의 document.all(명세 부록 B의 [[IsHTMLDDA]])이 null·undefined와 ==로 같다고 판정되는 예외는 다루지 않습니다.',
    '문자열의 일치 비교는 명세상 길이와 같은 위치의 UTF-16 코드 유닛이 모두 같은지로 판정합니다. 이 페이지는 "같은 문자열인지"로 줄여 말합니다.',
    '같은 값인지 판정하는 명세 알고리즘에는 IsStrictlyEqual, IsLooselyEqual, SameValue 외에 SameValueZero도 있지만 다루지 않습니다. Object.is는 SameValue이며 이 페이지는 NaN과 +0/-0에서의 차이만 다룹니다.',
    '<=, >= 같은 비교 연산자는 ==와 다른 규칙을 쓰며 다루지 않습니다.',
    '변수는 선언문이 실행된 뒤에만 표시합니다(호이스팅·TDZ는 별도 개념에서 다룹니다). 변수 열에는 이 코드가 선언한 변수만 표시합니다.',
    'console.log는 호스트 API이며, 문자열을 따옴표 없이 출력하는 것은 호스트의 출력 형식입니다. 시각화는 문자열에 큰따옴표를 붙이고 타입을 함께 적습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Equality Operators',
      url: 'https://tc39.es/ecma262/#sec-equality-operators',
    },
    {
      label: 'ECMAScript 명세 — Equality Operators: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-equality-operators-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — IsLooselyEqual',
      url: 'https://tc39.es/ecma262/#sec-islooselyequal',
    },
    {
      label: 'ECMAScript 명세 — IsStrictlyEqual',
      url: 'https://tc39.es/ecma262/#sec-isstrictlyequal',
    },
    {
      label: 'ECMAScript 명세 — Number::equal',
      url: 'https://tc39.es/ecma262/#sec-numeric-types-number-equal',
    },
    {
      label: 'ECMAScript 명세 — SameValue',
      url: 'https://tc39.es/ecma262/#sec-samevalue',
    },
    {
      label: 'ECMAScript 명세 — Object.is',
      url: 'https://tc39.es/ecma262/#sec-object.is',
    },
    {
      label: 'ECMAScript 명세 — Number.isNaN',
      url: 'https://tc39.es/ecma262/#sec-number.isnan',
    },
    {
      label: 'MDN — 동등 연산자 (==)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Equality',
    },
    {
      label: 'MDN — 일치 연산자 (===)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Strict_equality',
    },
    {
      label: 'MDN — 부등 연산자 (!=)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Inequality',
    },
    {
      label: 'MDN — 불일치 연산자 (!==)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Strict_inequality',
    },
    {
      label: 'MDN — 동등 비교 및 동일성',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Equality_comparisons_and_sameness',
    },
    {
      label: 'MDN — Object.is()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/is',
    },
    {
      label: 'MDN — Number.isNaN()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
