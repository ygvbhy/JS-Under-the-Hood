import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'type-coercion',
  title: '암묵적 타입 변환: 연산자는 값을 어떤 타입으로 바꾸나',
  summary:
    "+, -, > 같은 연산자와 조건식은 기대하는 타입이 아닌 값을 만나면 문자열·숫자·불리언으로 바꿔 계산합니다. 연산자마다 어떤 규칙으로 바꾸는지 알면 '3' + 4가 '34'이고 '10' > '9'가 false인 이유를 설명할 수 있습니다.",
  category: 'fundamentals',
  tags: [
    '타입 변환',
    '암묵적 타입 변환',
    '타입 강제 변환',
    'type coercion',
    '명시적 타입 변환',
    '문자열 연결',
    'ToString',
    'ToNumber',
    'ToBoolean',
    'ToPrimitive',
    'NaN',
    '템플릿 리터럴',
  ],
  goals: [
    '+가 문자열 연결과 덧셈 중 무엇을 할지 피연산자 타입으로 예측할 수 있다.',
    '-, *, /, %, 단항 +가 피연산자를 숫자로 바꾼다는 것과 숫자로 바꿀 수 없는 문자열이 NaN이 된다는 것을 설명할 수 있다.',
    '>가 두 피연산자가 모두 문자열일 때와 아닐 때 다르게 비교하는 이유를 설명할 수 있다.',
    '조건식이 값을 불리언으로 바꾸는 규칙(truthy/falsy)을 적용할 수 있다.',
    '객체가 연산에서 먼저 원시 값으로 바뀐다는 것과 명시적 변환 함수와의 차이(Symbol·BigInt)를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '데이터 타입' },
    { label: '연산자' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '단축 평가와 truthy/falsy', slug: 'short-circuit-evaluation' },
  ],
  related: ['short-circuit-evaluation', 'primitives-and-objects'],
  examples: [
    {
      id: 'to-string',
      file: 'to-string.js',
      runtime: 'ecmascript',
      expectedOutput: ['"7" "true" "null" "undefined"', '"합계: 10" "false"', 'number'],
    },
    {
      id: 'to-number',
      file: 'to-number.js',
      runtime: 'ecmascript',
      expectedOutput: ['7 8 3 1', '42 0 12 NaN', '1 0 0 NaN'],
    },
    { id: 'plus-order', file: 'plus-order.js', runtime: 'ecmascript', expectedOutput: ['345 75'] },
    { id: 'numeric-mix', file: 'numeric-mix.js', runtime: 'ecmascript', expectedOutput: ['8 101'] },
    { id: 'compare', file: 'compare.js', runtime: 'ecmascript', expectedOutput: ['true false'] },
    {
      id: 'to-boolean',
      file: 'to-boolean.js',
      runtime: 'ecmascript',
      expectedOutput: ['참으로 판단', '거짓으로 판단', 'false true'],
    },
    {
      id: 'object',
      file: 'object.js',
      runtime: 'ecmascript',
      expectedOutput: ['"[object Object]" "[object Object]"', 'NaN NaN'],
    },
    {
      id: 'explicit',
      file: 'explicit.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '"5" "null" "true"',
        '42 0 NaN 1 0 NaN',
        'true false false true',
        '"Symbol(id)" 10',
      ],
    },
  ],
  simplifications: [
    '시뮬레이터는 연산 하나를 "피연산자 확인·변환"과 "결과" 두 단계로 보여 줍니다. 명세의 세부 단계(GetValue, 원시 값에 대한 ToPrimitive 호출 등)는 묶어서 표시합니다. 원시 값에 ToPrimitive를 적용하면 같은 값이 그대로 나오므로 표시하지 않습니다.',
    '명세는 +의 문자열 연결에서 두 피연산자 모두에 ToString을, 숫자 연산에서 두 피연산자 모두에 ToNumeric을 적용합니다. 시각화는 타입이 실제로 바뀌는 피연산자의 변환만 표시합니다(같은 타입이면 같은 값이 나옵니다).',
    '"문자열 연결", "숫자 덧셈", "문자열로 비교", "숫자로 바꿔 비교" 같은 규칙 이름과 "암묵적/명시적 타입 변환"이라는 구분은 교육용 이름이며 명세 용어가 아닙니다.',
    '명세에서 a > b는 피연산자 순서를 바꿔 IsLessThan(b, a)로 계산하지만, 시뮬레이터와 본문은 왼쪽과 오른쪽을 그대로 비교하는 것으로 설명합니다(이 페이지 예제의 결과는 같습니다).',
    "문자열끼리의 비교는 앞에서부터 한 글자씩 UTF-16 코드 유닛 값을 비교하고, 한쪽이 다른 쪽의 앞부분이면 짧은 쪽이 작습니다('1' < '10'). 이 페이지는 숫자 문자('0'~'9')끼리의 비교만 다룹니다. 숫자로 바꾼 결과가 NaN이면 >, <는 모두 false가 되는데, 이 경우는 다루지 않습니다.",
    '객체가 원시 값으로 바뀌는 과정(ToPrimitive가 객체의 valueOf·toString 메서드를 호출)은 프로토타입 개념이 필요해 다루지 않고 결과만 보여 줍니다. 연산마다 원시 값으로 바꾸는 방식이 조금씩 다르지만(+와 템플릿 리터럴·String()의 차이 등), 데이터만 담은 객체 리터럴은 어느 쪽이든 문자열 "[object Object]"가 됩니다. 객체에 valueOf·toString 메서드를 직접 정의하거나 Symbol.toPrimitive를 쓰면 결과가 달라지는데, 이 경우는 다루지 않습니다.',
    '숫자로 바꾸는 연산은 정확히는 ToNumeric(BigInt면 BigInt를 그대로 사용)입니다. >·< 비교에서 한쪽이 BigInt이고 다른 쪽이 문자열이면 문자열을 숫자가 아니라 BigInt로 바꿔 비교합니다. Symbol과 BigInt 자체는 다루지 않고 "변환이 안 되는 경우"에서 오류가 나는지만 다룹니다. 문자열을 숫자로 바꾸는 세부 규칙(0x10, Infinity, 지수 표기 등)과 숫자를 문자열로 바꾸는 세부 규칙(지수 표기, -0)은 다루지 않습니다.',
    'ToBoolean에는 브라우저 호스트의 document.all(명세 부록 B의 [[IsHTMLDDA]])만 falsy로 다루는 예외가 있지만 이 페이지에서는 다루지 않습니다.',
    '==(느슨한 동등 비교)의 변환과 <=, >=, 비트 연산자 등 다른 연산자는 다루지 않습니다.',
    '변수는 선언문이 실행된 뒤에만 표시합니다(호이스팅·TDZ는 별도 개념에서 다룹니다). 변수 열에는 이 코드가 선언한 변수만 표시하며 console, JSON 같은 내장 값은 표시하지 않습니다.',
    'console.log는 호스트 API이며, 문자열을 따옴표 없이 출력하는 것은 호스트의 출력 형식입니다. 시각화의 값 표시에서는 문자열에 큰따옴표를 붙이고 타입을 함께 적습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Type Conversion',
      url: 'https://tc39.es/ecma262/#sec-type-conversion',
    },
    {
      label: 'ECMAScript 명세 — ToPrimitive',
      url: 'https://tc39.es/ecma262/#sec-toprimitive',
    },
    {
      label: 'ECMAScript 명세 — ToBoolean',
      url: 'https://tc39.es/ecma262/#sec-toboolean',
    },
    {
      label: 'ECMAScript 명세 — ToNumber',
      url: 'https://tc39.es/ecma262/#sec-tonumber',
    },
    {
      label: 'ECMAScript 명세 — StringToNumber',
      url: 'https://tc39.es/ecma262/#sec-stringtonumber',
    },
    {
      label: 'ECMAScript 명세 — ToString',
      url: 'https://tc39.es/ecma262/#sec-tostring',
    },
    {
      label: 'ECMAScript 명세 — ApplyStringOrNumericBinaryOperator',
      url: 'https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator',
    },
    {
      label: 'ECMAScript 명세 — IsLessThan',
      url: 'https://tc39.es/ecma262/#sec-islessthan',
    },
    {
      label: 'ECMAScript 명세 — String(value)',
      url: 'https://tc39.es/ecma262/#sec-string-constructor-string-value',
    },
    {
      label: 'ECMAScript 명세 — Number(value)',
      url: 'https://tc39.es/ecma262/#sec-number-constructor-number-value',
    },
    {
      label: 'MDN — 타입 강제 변환 (Type coercion)',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Type_coercion',
    },
    {
      label: 'MDN — 타입 변환 (Type Conversion)',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Type_Conversion',
    },
    {
      label: 'MDN — 덧셈 (+)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Addition',
    },
    {
      label: 'MDN — 단항 더하기 (+)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Unary_plus',
    },
    {
      label: 'MDN — Number 강제 변환',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Number#number_coercion',
    },
    {
      label: 'MDN — String 강제 변환',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String#string_coercion',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
