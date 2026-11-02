import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'string-utf16',
  title: '문자열 길이와 UTF-16: 😀의 length는 왜 2일까',
  summary:
    '자바스크립트 문자열은 글자가 아니라 16비트 코드 유닛의 나열이라 length, 인덱스, slice, split은 코드 유닛 단위로 동작합니다. 서로게이트 쌍, 결합 문자, 이모지 조합이 만드는 결과를 명세로 확인합니다.',
  category: 'fundamentals',
  order: 290,
  tags: [
    '문자열',
    'string',
    'length',
    'UTF-16',
    '코드 유닛',
    'code unit',
    '코드 포인트',
    '서로게이트 쌍',
    'codePointAt',
    'normalize',
    '이모지',
    'isWellFormed',
  ],
  goals: [
    '문자열이 16비트 코드 유닛의 나열이고 length가 그 개수라는 것, U+FFFF를 넘는 코드 포인트가 상위·하위 서로게이트 두 유닛으로 나타나 😀의 length가 2인 이유를 설명할 수 있다.',
    '인덱스 접근, charAt, slice, split과 indexOf가 코드 유닛 단위라 서로게이트 쌍을 쪼개 짝 없는 서로게이트를 만들 수 있다는 것과 charCodeAt, codePointAt의 차이를 예측할 수 있다.',
    '문자열의 인덱스 프로퍼티가 쓰기 불가라 대입이 sloppy mode에서는 무시되고 strict mode에서는 TypeError가 나며 메서드가 새 문자열을 돌려주는 것을, 같아 보이는 문자열이 ===로 다를 수 있는 이유(결합 문자와 normalize)와 함께 설명할 수 있다.',
    '이모지 조합(ZWJ)의 length, 대소문자 변환이 길이를 바꾸는 경우, isWellFormed와 toWellFormed의 동작을 예측하고 코드 유닛, 코드 포인트, 사람이 보는 글자를 구분해 말할 수 있다.',
  ],
  prerequisites: [
    { label: '원시 값의 메서드', slug: 'primitive-methods' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: [
    'primitive-methods',
    'primitives-and-objects',
    'property-attributes',
    'type-coercion',
    'regexp-lastindex',
  ],
  examples: [
    {
      id: 'length-units',
      file: 'length-units.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 4 2', 'd83d de00', '1f600 de00', 'true true'],
    },
    {
      id: 'split-pair',
      file: 'split-pair.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '"\\ud83d" "\\ude00"',
        '"a\\ud83d" 3',
        '["a","\\ud83d","\\ude00","b"]',
        '"b\\ude00\\ud83da"',
      ],
    },
    {
      id: 'immutable',
      file: 'immutable.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'cat c',
        '{"value":"c","writable":false,"enumerable":true,"configurable":false}',
        'cat CAT',
      ],
    },
    {
      id: 'normalize',
      file: 'normalize.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 2 false', 'true 2', '1 3'],
    },
    {
      id: 'zwj-emoji',
      file: 'zwj-emoji.js',
      runtime: 'ecmascript',
      expectedOutput: ['8', '200d', '"👨" 3'],
    },
    {
      id: 'case-length',
      file: 'case-length.js',
      runtime: 'ecmascript',
      expectedOutput: ['6 STRASSE 7', 'strasse false'],
    },
    {
      id: 'well-formed',
      file: 'well-formed.js',
      runtime: 'ecmascript',
      expectedOutput: ['true false', '"�" 1', 'fffd'],
    },
  ],
  simplifications: [
    '엔진이 문자열을 내부에서 어떻게 저장하는지는 명세가 정하지 않습니다. 명세는 문자열을 16비트 값의 나열로 정의하고, 내용을 해석하는 연산이 각 값을 UTF-16 코드 유닛으로 본다고 정합니다.',
    'for...of와 스프레드가 문자열을 코드 포인트 단위로 도는 것(34·35장)은 별도 개념이라 한 줄 언급만 합니다.',
    '자소 클러스터 분할(Intl.Segmenter)은 국제화 API 명세(ECMA-402)의 기능이라 다루지 않습니다. localeCompare와 toLocaleUpperCase 같은 로캘 의존 메서드도 결과가 로캘과 구현에 따라 달라질 수 있어 다루지 않습니다.',
    'normalize의 NFC를 "합칠 수 있는 것을 합친다"로 줄여 설명합니다. 실제로는 정준 분해한 뒤 다시 합성하며, 합성에서 제외되는 문자는 합치지 않습니다.',
    '대소문자 변환과 normalize 결과는 호스트가 따르는 유니코드 데이터 판에 따릅니다(Node 24 기준으로 확인).',
    'isWellFormed와 toWellFormed는 『모던 자바스크립트 Deep Dive』 출간 이후에 추가된 메서드(ES2024)이며, 학습 편의를 위해 함께 다룹니다.',
    '짝 없는 서로게이트는 호스트마다 출력이 다르므로 JSON.stringify의 이스케이프와 16진수로만 보입니다.',
    '코드 유닛 보기는 미리 정한 문자열 5개만 다루며 자유 입력은 지원하지 않습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The String Type',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type',
    },
    {
      label: 'ECMAScript 명세 — String Exotic Objects',
      url: 'https://tc39.es/ecma262/#sec-string-exotic-objects',
    },
    {
      label: 'ECMAScript 명세 — StringGetOwnProperty',
      url: 'https://tc39.es/ecma262/#sec-stringgetownproperty',
    },
    {
      label: 'ECMAScript 명세 — CodePointAt',
      url: 'https://tc39.es/ecma262/#sec-codepointat',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.codePointAt',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.codepointat',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.charCodeAt',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.charcodeat',
    },
    {
      label: 'ECMAScript 명세 — String.fromCodePoint',
      url: 'https://tc39.es/ecma262/#sec-string.fromcodepoint',
    },
    {
      label: 'ECMAScript 명세 — UTF16SurrogatePairToCodePoint',
      url: 'https://tc39.es/ecma262/#sec-utf16decodesurrogatepair',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.split',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.split',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.slice',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.slice',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.normalize',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.normalize',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.toUpperCase',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.touppercase',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.toLowerCase',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.tolowercase',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.isWellFormed',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.iswellformed',
    },
    {
      label: 'ECMAScript 명세 — String.prototype.toWellFormed',
      url: 'https://tc39.es/ecma262/#sec-string.prototype.towellformed',
    },
    {
      label: 'ECMAScript 명세 — QuoteJSONString',
      url: 'https://tc39.es/ecma262/#sec-quotejsonstring',
    },
    {
      label: 'MDN — String: length',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/length',
    },
    {
      label: 'MDN — String.prototype.codePointAt()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt',
    },
    {
      label: 'MDN — String.prototype.normalize()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/normalize',
    },
    {
      label: 'MDN — String.prototype.isWellFormed()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
