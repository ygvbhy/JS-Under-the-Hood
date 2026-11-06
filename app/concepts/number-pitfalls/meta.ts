import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'
const MDN = 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/'

export const concept = {
  slug: 'number-pitfalls',
  title: '숫자의 함정: (1.005).toFixed(2)는 왜 1.01이 아닐까',
  summary:
    'toFixed는 소스의 십진수가 아니라 저장된 값을 기준으로 반올림합니다. 안전한 정수의 경계, EPSILON 비교의 한계, BigInt를 명세와 실행 결과로 확인합니다.',
  category: 'fundamentals',
  order: 275,
  tags: [
    'toFixed',
    'toPrecision',
    'toExponential',
    'Math.round',
    'MAX_SAFE_INTEGER',
    'isSafeInteger',
    'isInteger',
    'EPSILON',
    'BigInt',
    '반올림',
    '안전한 정수',
  ],
  goals: [
    'toFixed가 소스의 십진 표기가 아니라 저장된 Number 값을 기준으로 가까운 쪽을 고르고, 저장 값이 정확히 가운데일 때는 부호를 뗀 값이 큰 쪽을 고른다는 것을 설명할 수 있다.',
    '곱해서 Math.round로 맞추는 방법이 어긋날 수 있는 이유와, 가운데일 때 Math.round는 +∞ 쪽이라 -2.5가 -2이고 toFixed는 -3인 이유를 설명할 수 있다.',
    'toFixed·toPrecision·toExponential의 자릿수 범위(RangeError)와, NaN·Infinity에서 메서드마다 검사 순서가 다른 것, toFixed가 부호를 뗀 값이 10^21 이상일 때 ToString 결과를 쓰는 것을 예측할 수 있다.',
    'MAX_SAFE_INTEGER 위에서 max + 1과 max + 2가 같은 이유를 roundTiesToEven으로 설명하고, 2 ** 53이 isInteger는 true이지만 isSafeInteger는 false인 것을 예측할 수 있다.',
    'Number.EPSILON이 1 이상 2 미만 구간의 간격이라 값의 크기에 따라 고정 허용 오차 비교가 어긋나는 이유와, BigInt가 Number와 섞이지 않고 정확한 정수 산술을 하는 조건을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '숫자 타입', slug: 'number-type' },
    { label: '원시 값의 메서드', slug: 'primitive-methods' },
  ],
  related: ['number-type', 'equality-operators', 'type-coercion', 'global-object'],
  examples: [
    {
      id: 'stored-value',
      file: 'stored-value.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '1.00',
        '1.00499999999999989342',
        '1.01 1.01499999999999990230',
        '8.35 8.34500000000000063949',
      ],
    },
    {
      id: 'exact-tie',
      file: 'exact-tie.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 1 2', '-3 0.13 -0.13', 'string'],
    },
    {
      id: 'multiply-round',
      file: 'multiply-round.js',
      runtime: 'ecmascript',
      expectedOutput: ['100.49999999999999', '1', '3 4 -2', '-3 0 1', '0.02 0.01'],
    },
    {
      id: 'safe-boundary',
      file: 'safe-boundary.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '9007199254740991 true',
        '9007199254740992 9007199254740992 9007199254740994 9007199254740996',
        'true',
        'true',
      ],
    },
    {
      id: 'safe-check',
      file: 'safe-check.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false', 'true false', 'true false false', 'true'],
    },
    {
      id: 'epsilon-limit',
      file: 'epsilon-limit.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false true', 'true', 'false', '2.2737367544323206e-13', 'true'],
    },
    {
      id: 'precision-exponential',
      file: 'precision-exponential.js',
      runtime: 'ecmascript',
      expectedOutput: ['123.46 1.2e+2', '0.0000012 1.2e-7', '1.23e+3 1.00', 'string'],
    },
    {
      id: 'range-limits',
      file: 'range-limits.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '102 RangeError RangeError',
        '1e+21 150000000000000000000.00',
        'NaN Infinity',
        'RangeError',
        'NaN',
      ],
    },
    {
      id: 'bigint-exact',
      file: 'bigint-exact.js',
      runtime: 'ecmascript',
      expectedOutput: ['bigint 9007199254740993', 'false true', 'true false', 'TypeError', '3 -3'],
    },
  ],
  simplifications: [
    '(1.005).toFixed(20)처럼 자릿수를 많이 준 출력도 저장 값을 그 자리까지 반올림한 표시입니다. 저장 값 전체는 반올림 판정 보기에서 정확한 십진 값으로 보여 줍니다.',
    'console.log는 호스트 API입니다. 그대로 넘긴 Number 값의 표기는 명세의 Number::toString을 따르고, toFixed·toPrecision·toExponential의 결과는 각 메서드가 만든 문자열이며, BigInt는 String()으로 바꿔 출력합니다.',
    '더하기와 곱하기 결과의 반올림은 숫자 타입 개념에서 설명한 roundTiesToEven을 따릅니다. 이 페이지는 그 알고리즘을 다시 설명하지 않고 max + 2와 1 + EPSILON / 2에 적용해 보입니다.',
    'toPrecision과 toExponential은 후보를 고르는 규칙과 지수 표기 조건만 다루고, 결과 문자열을 조립하는 단계는 생략합니다.',
    '예제 8과 9의 try…catch는 오류를 보이려는 용도입니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
    '자릿수 인수가 undefined이거나 정수가 아닌 경우는 다루지 않습니다.',
    'Number.MAX_VALUE와 MIN_VALUE, toString(radix), Intl과 toLocaleString, BigInt의 비트 연산과 asIntN, 단항 연산자는 다루지 않습니다. 비정규 수도 다루지 않습니다.',
    '금액처럼 정확한 십진 계산이 필요한 경우의 방법(정수 단위로 계산하기, Intl.NumberFormat, 십진 라이브러리)은 이 페이지의 범위 밖입니다.',
    '반올림 판정 보기는 프리셋 6개(1.005, 1.015, 8.345, 2.5, 0.125, -2.5)만 다룹니다. 음수는 부호를 뗀 값으로 판정하고 결과에 부호를 붙입니다.',
    '안전한 정수 표는 9007199254740990부터 9007199254740996까지만 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Number.prototype.toFixed',
      url: `${SPEC}sec-number.prototype.tofixed`,
    },
    {
      label: 'ECMAScript 명세 — Number.prototype.toPrecision',
      url: `${SPEC}sec-number.prototype.toprecision`,
    },
    {
      label: 'ECMAScript 명세 — Number.prototype.toExponential',
      url: `${SPEC}sec-number.prototype.toexponential`,
    },
    { label: 'ECMAScript 명세 — Math.round', url: `${SPEC}sec-math.round` },
    {
      label: 'ECMAScript 명세 — Number.MAX_SAFE_INTEGER',
      url: `${SPEC}sec-number.max_safe_integer`,
    },
    { label: 'ECMAScript 명세 — Number.isSafeInteger', url: `${SPEC}sec-number.issafeinteger` },
    { label: 'ECMAScript 명세 — Number.isInteger', url: `${SPEC}sec-number.isinteger` },
    { label: 'ECMAScript 명세 — Number.EPSILON', url: `${SPEC}sec-number.epsilon` },
    {
      label: 'ECMAScript 명세 — The BigInt Type',
      url: `${SPEC}sec-ecmascript-language-types-bigint-type`,
    },
    {
      label: 'ECMAScript 명세 — ApplyStringOrNumericBinaryOperator',
      url: `${SPEC}sec-applystringornumericbinaryoperator`,
    },
    {
      label: 'MDN — Number.prototype.toFixed()',
      url: `${MDN}Global_Objects/Number/toFixed`,
    },
    {
      label: 'MDN — Number.prototype.toPrecision()',
      url: `${MDN}Global_Objects/Number/toPrecision`,
    },
    {
      label: 'MDN — Number.isSafeInteger()',
      url: `${MDN}Global_Objects/Number/isSafeInteger`,
    },
    { label: 'MDN — Number.EPSILON', url: `${MDN}Global_Objects/Number/EPSILON` },
    { label: 'MDN — Math.round()', url: `${MDN}Global_Objects/Math/round` },
    { label: 'MDN — BigInt', url: `${MDN}Global_Objects/BigInt` },
  ],
  reviewedAt: '2026-11-06',
} satisfies ConceptMeta
