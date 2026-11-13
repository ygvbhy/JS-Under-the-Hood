import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'json',
  title: 'JSON: undefined는 왜 사라질까',
  summary:
    'JSON.stringify는 undefined·함수·심벌을 객체에서는 빼고 배열에서는 null로 씁니다. NaN과 Date가 어떻게 바뀌는지, toJSON·replacer·reviver와 깊은 복사로 쓸 때 잃는 것까지 명세로 확인합니다.',
  category: 'objects',
  order: 420,
  tags: [
    'JSON',
    'JSON.stringify',
    'JSON.parse',
    '직렬화',
    'toJSON',
    'replacer',
    'reviver',
    '깊은 복사',
    '역직렬화',
  ],
  goals: [
    'undefined·함수·심벌이 객체·배열·최상위에서 다르게 쓰이는 이유를 SerializeJSONProperty와 그 호출자로 설명할 수 있다.',
    '숫자·래퍼 객체·Date가 바뀌는 결과와 자기 열거 가능 문자열 키만 직렬화되는 이유를 설명할 수 있다.',
    'toJSON·replacer·space·reviver가 끼어드는 순서와 인수(key, this)로 결과를 예측할 수 있다.',
    'JSON.parse(JSON.stringify(x))가 잃는 것(프로토타입, Map, Date, undefined, 같은 객체를 가리키던 참조)과 순환 참조가 TypeError인 이유를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로퍼티 어트리뷰트', slug: 'property-attributes' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: '심벌', slug: 'symbol' },
  ],
  related: [
    'symbol',
    'set-map',
    'property-attributes',
    'prototype-chain',
    'property-keys',
    'primitive-methods',
    'number-type',
    'primitives-and-objects',
    'error-handling',
    'property-order',
  ],
  examples: [
    {
      id: 'omitted-values',
      file: 'omitted-values.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"name":"kim"}',
        '["kim",null,null,null]',
        'undefined undefined undefined',
        'null {"empty":null}',
      ],
    },
    {
      id: 'numbers',
      file: 'numbers.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"avg":null,"max":null,"min":null,"zero":0}',
        '[null,null,0,1e+21]',
        '[7,"7",false]',
        '[1,null,3] 3',
      ],
    },
    {
      id: 'date-tojson',
      file: 'date-tojson.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"title":"standup","at":"2026-11-05T09:30:00.000Z"}',
        'string false',
        'function {"at":null}',
      ],
    },
    {
      id: 'own-enumerable',
      file: 'own-enumerable.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"name":"lee"} proto secret', '[90,80] math', '{"1":"a","2":"b","z":"z"}'],
    },
    {
      id: 'custom-tojson',
      file: 'custom-tojson.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"total":"1200 KRW (total)"}',
        '["1200 KRW (0)"]',
        '"1200 KRW ()"',
        '{"a":1}',
      ],
    },
    {
      id: 'replacer-space',
      file: 'replacer-space.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"id":14,"item":"pen","qty":4,"buyer":{"id":6,"name":"park"}}',
        '["","id","item","qty","buyer","id","name"]',
        '{"id":7,"buyer":{"id":3}}',
        '["{","--\\"a\\": 1,","--\\"b\\": [","----2","--]","}"]',
      ],
    },
    {
      id: 'parse-reviver',
      file: 'parse-reviver.js',
      runtime: 'ecmascript',
      expectedOutput: ['true 9 false', '["title","at","draft","0","tags",""]', '42 true true'],
    },
    {
      id: 'deep-copy',
      file: 'deep-copy.js',
      runtime: 'ecmascript',
      expectedOutput: ['false {"x":1}', '{} string false', 'true false', '1 1'],
    },
  ],
  simplifications: [
    'ECMA-404 문법 세부와 문자열 이스케이프(QuoteJSONString, 짝 없는 서로게이트)는 다루지 않습니다.',
    'JSON.rawJSON·JSON.isRawJSON과 reviver의 세 번째 인수(context)는 ES2026판에 추가된 기능이라 다루지 않으며, 본문의 알고리즘 설명은 그 단계를 뺀 것입니다.',
    'BigInt·순환 참조의 TypeError와 JSON.parse의 SyntaxError는 try...catch 대신 이 페이지의 테스트로 확인합니다.',
    '깊은 복사의 대안인 structuredClone은 HTML 표준이 정한 호스트 API라 다루지 않습니다.',
    'replacer 배열의 숫자·래퍼 객체 항목, JSON.parse의 __proto__ 키 같은 세부는 다루지 않습니다.',
    '"복사"·"사본"은 결과를 부르는 말이며 엔진이 값을 복사한다는 뜻이 아닙니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    { label: 'ECMAScript 명세 — The JSON Object', url: 'https://tc39.es/ecma262/#sec-json-object' },
    {
      label: 'ECMAScript 명세 — JSON.stringify',
      url: 'https://tc39.es/ecma262/#sec-json.stringify',
    },
    {
      label: 'ECMAScript 명세 — SerializeJSONProperty',
      url: 'https://tc39.es/ecma262/#sec-serializejsonproperty',
    },
    {
      label: 'ECMAScript 명세 — SerializeJSONObject',
      url: 'https://tc39.es/ecma262/#sec-serializejsonobject',
    },
    {
      label: 'ECMAScript 명세 — SerializeJSONArray',
      url: 'https://tc39.es/ecma262/#sec-serializejsonarray',
    },
    {
      label: 'ECMAScript 명세 — EnumerableOwnProperties',
      url: 'https://tc39.es/ecma262/#sec-enumerableownproperties',
    },
    { label: 'ECMAScript 명세 — JSON.parse', url: 'https://tc39.es/ecma262/#sec-json.parse' },
    {
      label: 'ECMAScript 명세 — InternalizeJSONProperty',
      url: 'https://tc39.es/ecma262/#sec-internalizejsonproperty',
    },
    {
      label: 'ECMAScript 명세 — Date.prototype.toJSON',
      url: 'https://tc39.es/ecma262/#sec-date.prototype.tojson',
    },
    {
      label: 'ECMAScript 2026 명세 — JSON.rawJSON (ES2026판에 추가)',
      url: 'https://tc39.es/ecma262/2026/#sec-json.rawjson',
    },
    {
      label: 'MDN — JSON.stringify()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify',
    },
    {
      label: 'MDN — JSON.parse()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse',
    },
    {
      label: 'MDN — Date.prototype.toJSON()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON',
    },
  ],
  reviewedAt: '2026-11-05',
} satisfies ConceptMeta
