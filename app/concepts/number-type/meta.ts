import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'number-type',
  title: '숫자 타입: 0.1 + 0.2는 왜 0.3이 아닌가',
  summary:
    '자바스크립트의 숫자는 정수와 실수를 가리지 않고 모두 64비트 부동소수점 값입니다. 십진 소수와 아주 큰 정수는 가장 가까운 값으로 반올림되어 저장되므로 0.1 + 0.2가 0.3과 다르고, 0으로 나누면 오류 대신 Infinity가 됩니다.',
  category: 'fundamentals',
  tags: [
    '숫자 타입',
    'number',
    '부동소수점',
    'IEEE 754',
    '배정밀도',
    '0.1 + 0.2',
    '반올림 오차',
    '안전한 정수',
    '2의 53제곱',
    'Infinity',
    'NaN',
    '0으로 나누기',
    '2진수 리터럴',
    '16진수 리터럴',
  ],
  goals: [
    '정수와 실수가 같은 숫자 타입이고 5 / 2가 2.5인 이유를 설명할 수 있다.',
    '0.1 + 0.2가 0.3과 다른 이유를 "가장 가까운 값으로 반올림해 저장한다"는 규칙으로 설명할 수 있다.',
    '2의 53제곱보다 큰 정수에서 + 1이 값을 바꾸지 못하는 경우를 예측할 수 있다.',
    'Infinity, -Infinity, NaN이 생기는 연산을 알고 이들도 숫자 타입이라는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '데이터 타입' },
    { label: '산술 연산자' },
    { label: '동등 비교', slug: 'equality-operators' },
  ],
  related: ['equality-operators', 'type-coercion'],
  examples: [
    {
      id: 'one-type',
      file: 'one-type.js',
      runtime: 'ecmascript',
      expectedOutput: ['number number true', '2.5 5 15 255'],
    },
    {
      id: 'decimal-sum',
      file: 'decimal-sum.js',
      runtime: 'ecmascript',
      expectedOutput: ['0.30000000000000004 false', '0.75 true', 'true'],
    },
    {
      id: 'safe-integer',
      file: 'safe-integer.js',
      runtime: 'ecmascript',
      expectedOutput: ['9007199254740992 9007199254740992 9007199254740994', 'true true'],
    },
    {
      id: 'special-values',
      file: 'special-values.js',
      runtime: 'ecmascript',
      expectedOutput: ['Infinity -Infinity NaN', 'number number', 'Infinity NaN NaN'],
    },
  ],
  simplifications: [
    '숫자가 메모리에 비트로 어떻게 배치되는지(부호·지수·가수)는 다루지 않습니다. 명세는 Number 값을 IEEE 754-2019 binary64 값으로 정의하지만, 엔진이 내부에서 그 비트를 그대로 저장한다고 보장하지는 않습니다.',
    '"가장 가까운 값으로 반올림"은 명세의 roundTiesToEven 반올림을 줄여 말한 것입니다. 이 규칙은 정확히 가운데인 경우 2진 표현의 마지막 자리가 0인 쪽을 고릅니다(예제 3의 2 ** 53 + 1). 숫자 리터럴은 유효숫자가 20자리를 넘으면 반올림 방식이 구현에 따라 다를 수 있는데, 이 페이지의 리터럴은 모두 20자리 이하입니다.',
    '저장 값 표는 각 Number 값을 십진수로 정확히 풀어 쓴 것입니다. 이 값은 테스트에서 명세의 Number.prototype.toFixed로 계산해 확인했으며, 이 페이지는 그 메서드를 다루지 않습니다.',
    'console.log가 숫자를 출력하는 형식(예: 0.30000000000000004)은 호스트의 출력 형식입니다. 이 페이지 예제의 출력은 명세의 Number::toString이 만드는 문자열(그 값을 다른 값과 구별할 수 있는 가장 짧은 십진 표기)과 같으며, 그 표기 규칙은 다루지 않습니다.',
    '"안전한 정수"의 경계는 명세의 Number.MAX_SAFE_INTEGER(2의 53제곱 − 1)로 정의됩니다. 이 페이지는 그 상수와 Number.EPSILON, Math 같은 내장 API를 쓰지 않고 2의 53제곱 주변의 계산 결과만 보여 줍니다.',
    'NaN의 비교와 +0/-0은 동등 비교 페이지에서 다룹니다. 명세의 IEEE 754에는 NaN이 여러 비트 패턴으로 있지만 ECMAScript에서는 하나의 NaN 값으로 다룹니다.',
    'BigInt와 문자열을 숫자로 바꾸는 규칙은 다루지 않습니다(암묵적 타입 변환 페이지 참고).',
    'console.log는 호스트 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The Number Type',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type',
    },
    {
      label: 'ECMAScript 명세 — Numeric Literals',
      url: 'https://tc39.es/ecma262/#sec-literals-numeric-literals',
    },
    { label: 'ECMAScript 명세 — RoundMVResult', url: 'https://tc39.es/ecma262/#sec-roundmvresult' },
    {
      label: 'ECMAScript 명세 — Number::add',
      url: 'https://tc39.es/ecma262/#sec-numeric-types-number-add',
    },
    {
      label: 'ECMAScript 명세 — Number::divide',
      url: 'https://tc39.es/ecma262/#sec-numeric-types-number-divide',
    },
    {
      label: 'ECMAScript 명세 — Number::exponentiate',
      url: 'https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate',
    },
    {
      label: 'ECMAScript 명세 — Number.MAX_SAFE_INTEGER',
      url: 'https://tc39.es/ecma262/#sec-number.max_safe_integer',
    },
    {
      label: 'MDN — JavaScript의 타입과 자료구조',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Data_structures',
    },
    {
      label: 'MDN — Number',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Number',
    },
    {
      label: 'MDN — Infinity',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Infinity',
    },
    {
      label: 'MDN — NaN',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/NaN',
    },
    {
      label: 'MDN — Number.MAX_SAFE_INTEGER',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER',
    },
    {
      label: 'MDN — 거듭제곱 (**)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Exponentiation',
    },
    {
      label: 'MDN — 나눗셈 (/)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Division',
    },
  ],
  reviewedAt: '2026-10-27',
} satisfies ConceptMeta
