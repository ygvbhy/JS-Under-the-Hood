import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'
const MDN = 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/'

export const concept = {
  slug: 'date',
  title: 'Date: 2026년 1월 31일에 setMonth(1)을 하면 왜 3월 3일일까',
  summary:
    'Date는 시각 값 하나를 담고, setMonth는 연·월·일을 다시 계산해 넘친 날을 다음 달로 보냅니다. 날짜 문자열이 UTC로 읽히는 경우와 Date가 연산자에서 바뀌는 방식을 명세와 실행 결과로 확인합니다.',
  category: 'objects',
  order: 277,
  tags: [
    'Date',
    'setMonth',
    'getMonth',
    'MakeDay',
    '시각 값',
    '시간대',
    'UTC',
    'Date.parse',
    'Invalid Date',
    'toISOString',
    'getTime',
    '월 넘침',
  ],
  goals: [
    '2026년 1월 31일에 setMonth(1)을 하면 왜 3월 3일이 되는지, 월이 0부터 세어지는 것과 MakeDay가 넘친 일을 다음 달로 보내는 규칙으로 설명할 수 있다.',
    'Date가 시각 값 하나를 담고, 연·월·일 같은 필드는 그 시각 값을 시간대로 풀어 읽은 값이라는 것을 getX와 getUTCX의 차이로 설명할 수 있다.',
    '명세 형식의 날짜 문자열에 오프셋이 없을 때, 날짜만 쓰면 UTC로, 시각까지 쓰면 로컬 시각으로 해석된다는 규칙을 설명하고 결과를 예측할 수 있다.',
    'Date가 +와 -에서 다르게 변환되는 이유와, 같은 시각의 두 Date를 ===로 비교하면 false인 이유를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
    { label: '동등 비교', slug: 'equality-operators' },
    { label: 'new 연산자', slug: 'new-operator' },
  ],
  related: [
    'json',
    'type-coercion',
    'number-pitfalls',
    'new-operator',
    'symbol',
    'error-handling',
    'timers',
  ],
  examples: [
    {
      id: 'month-overflow',
      file: 'month-overflow.js',
      runtime: 'ecmascript',
      expectedOutput: ['0 31', '2 3'],
    },
    {
      id: 'month-index',
      file: 'month-index.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 1', 'true'],
    },
    {
      id: 'field-overflow',
      file: 'field-overflow.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 28', '2027 0', '2025 11 30'],
    },
    {
      id: 'setter-return',
      file: 'setter-return.js',
      runtime: 'ecmascript',
      expectedOutput: ['number true', '15'],
    },
    {
      id: 'shared-date',
      file: 'shared-date.js',
      runtime: 'ecmascript',
      expectedOutput: ['8 true', '8 1'],
    },
    {
      id: 'iso-date-only',
      file: 'iso-date-only.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true', 'true', '10 10'],
    },
    {
      id: 'to-primitive',
      file: 'to-primitive.js',
      runtime: 'ecmascript',
      expectedOutput: ['string number', 'true', '-1 0'],
    },
    {
      id: 'compare-dates',
      file: 'compare-dates.js',
      runtime: 'ecmascript',
      expectedOutput: ['false false', 'true true', 'true'],
    },
    {
      id: 'call-without-new',
      file: 'call-without-new.js',
      runtime: 'ecmascript',
      expectedOutput: ['string object', 'string number'],
    },
    {
      id: 'invalid-date',
      file: 'invalid-date.js',
      runtime: 'ecmascript',
      expectedOutput: ['NaN Invalid Date', 'NaN NaN', 'true'],
    },
    {
      id: 'two-digit-year',
      file: 'two-digit-year.js',
      runtime: 'ecmascript',
      expectedOutput: ['1999', '100', '99'],
    },
    {
      id: 'time-value',
      file: 'time-value.js',
      runtime: 'ecmascript',
      expectedOutput: ['1970-01-01T00:00:00.000Z', '1970-01-02T00:00:00.000Z', '28'],
    },
  ],
  simplifications: [
    '시뮬레이터는 시각 값(밀리초 숫자) 대신 로컬 시간대로 풀어 읽은 연·월·일만 그립니다. new Date(2026, 0, 31)처럼 로컬 자정을 가리키는 코드는 실행 시간대마다 다른 시각 값을 만들므로 고정된 숫자로 쓸 수 없고, 필드 계산은 시간대와 상관없이 같은 모양이기 때문입니다.',
    '시뮬레이터는 로컬 필드와 UTC 시각 값을 오가는 변환(LocalTime과 그 역변환)을 한 칸으로 줄여 그리고, 시·분·초·밀리초는 그리지 않습니다. setMonth는 하루 안의 시각을 그대로 두고 연·월·일만 다시 계산합니다.',
    '서머타임 전환 시각 자체를 처리하는 규칙(건너뛴 시각과 반복된 시각)은 다루지 않습니다. 하루를 더하는 두 방법의 차이만 문장으로 다룹니다.',
    'Date가 연산자에서 바뀌는 방식은 명세가 Date에만 "default"를 문자열로 다루게 정했다는 데까지만 설명합니다. Symbol.toPrimitive의 일반 규칙은 심벌 개념에서 다룹니다.',
    'toLocaleString 같은 지역화 출력은 ECMA-402(Intl)가 정하는 결과라 다루지 않습니다.',
    'Date.parse가 명세의 날짜 시간 문자열 형식에 맞지 않고 toString·toUTCString이 만들 수도 없는 문자열을 어떻게 읽는지는 구현이 정하므로 다루지 않습니다. 이 페이지의 문자열 예제는 명세 형식만 씁니다.',
    '예제의 console.log는 ECMAScript가 아니라 호스트가 제공하는 출력 API입니다. 어떤 시간대를 쓸지는 명세가 호스트 환경의 현재 시간대로 정하고, 그 시간대의 오프셋 규칙은 구현이 정합니다(implementation-defined).',
    'JSON의 toJSON(43장), 타이머(41장), try...catch(47장)는 각각 JSON 개념, 타이머 개념, try/catch/finally 개념에서 다루고, Temporal과 부록 B의 setYear·getYear는 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Time Values and Time Range',
      url: `${SPEC}sec-time-values-and-time-range`,
    },
    { label: 'ECMAScript 명세 — TimeClip', url: `${SPEC}sec-timeclip` },
    {
      label: 'ECMAScript 명세 — Properties of Date Instances',
      url: `${SPEC}sec-properties-of-date-instances`,
    },
    { label: 'ECMAScript 명세 — LocalTime', url: `${SPEC}sec-localtime` },
    { label: 'ECMAScript 명세 — MakeDay', url: `${SPEC}sec-makeday` },
    { label: 'ECMAScript 명세 — MakeFullYear', url: `${SPEC}sec-makefullyear` },
    {
      label: 'ECMAScript 명세 — Date.prototype.setMonth',
      url: `${SPEC}sec-date.prototype.setmonth`,
    },
    {
      label: 'ECMAScript 명세 — Date.prototype.setFullYear',
      url: `${SPEC}sec-date.prototype.setfullyear`,
    },
    {
      label: 'ECMAScript 명세 — Date(...values)',
      url: `${SPEC}sec-date-constructor-date`,
    },
    {
      label: 'ECMAScript 명세 — Date Time String Format',
      url: `${SPEC}sec-date-time-string-format`,
    },
    { label: 'ECMAScript 명세 — Date.parse', url: `${SPEC}sec-date.parse` },
    {
      label: 'ECMAScript 명세 — Date.prototype[%Symbol.toPrimitive%]',
      url: `${SPEC}sec-date.prototype-%symbol.toprimitive%`,
    },
    { label: 'ECMAScript 명세 — ToDateString', url: `${SPEC}sec-todatestring` },
    {
      label: 'ECMAScript 명세 — Date.prototype.toISOString',
      url: `${SPEC}sec-date.prototype.toisostring`,
    },
    { label: 'ECMAScript 명세 — Date.UTC', url: `${SPEC}sec-date.utc` },
    { label: 'MDN — Date', url: `${MDN}Date` },
    { label: 'MDN — Date.prototype.setMonth()', url: `${MDN}Date/setMonth` },
    { label: 'MDN — Date.parse()', url: `${MDN}Date/parse` },
  ],
  reviewedAt: '2026-11-10',
} satisfies ConceptMeta
