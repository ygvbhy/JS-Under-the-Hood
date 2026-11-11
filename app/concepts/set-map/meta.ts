import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'set-map',
  title: 'Set과 Map: NaN은 왜 한 번만 들어갈까',
  summary:
    'Set과 Map은 키를 문자열로 바꾸지 않고 SameValueZero로 비교해 NaN은 하나, 0과 -0은 같은 키로 봅니다. 키를 문자열로 바꾸는 일반 객체와 무엇이 다른지, 삽입 순서와 WeakMap까지 명세로 확인합니다.',
  category: 'objects',
  order: 330,
  tags: [
    'Set',
    'Map',
    'WeakMap',
    'WeakSet',
    'SameValueZero',
    'NaN',
    '키 비교',
    '삽입 순서',
    '컬렉션',
  ],
  goals: [
    'Set과 Map이 SameValueZero로 키를 구분해 NaN이 하나, 0과 -0이 같은 키가 되는 이유와 ===·Object.is와의 차이를 설명할 수 있다.',
    '객체 키는 동일성으로 구분해 모양이 같은 새 객체로는 찾지 못하는 이유와, 일반 객체는 ToPropertyKey로 키를 문자열로 바꿔 서로 다른 객체 키가 하나로 합쳐지는 이유를 설명할 수 있다.',
    '삽입 순서와 순회 중 add·delete의 결과를 예측할 수 있다.',
    'Map의 엔트리와 프로퍼티의 차이(JSON.stringify, 객체와의 변환), WeakMap·WeakSet의 키 조건과 나열할 수 없는 이유를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '동등 비교', slug: 'equality-operators' },
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '이터러블과 for...of', slug: 'iterable-for-of' },
  ],
  related: [
    'equality-operators',
    'property-keys',
    'iterable-for-of',
    'array-method-pitfalls',
    'symbol',
    'spread-destructuring',
    'primitives-and-objects',
    'error-handling',
    'json',
  ],
  examples: [
    {
      id: 'basics',
      file: 'basics.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '3 true true 2',
        '2 31 undefined true',
        '["js","html"] [["kim",31],["lee",25]]',
      ],
    },
    {
      id: 'same-value-zero',
      file: 'same-value-zero.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 true false', 'true false', 'not a number 4'],
    },
    {
      id: 'object-keys',
      file: 'object-keys.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 true false', 'first undefined false'],
    },
    {
      id: 'plain-object-keys',
      file: 'plain-object-keys.js',
      runtime: 'ecmascript',
      expectedOutput: ['["[object Object]"] B', '1 string', '4 A number'],
    },
    {
      id: 'insertion-order',
      file: 'insertion-order.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '["2","10","b","a"]',
        '["b","a",10,2]',
        '[["b",100],[10,3],[2,4],["a",200]]',
      ],
    },
    {
      id: 'mutate-while-iterating',
      file: 'mutate-while-iterating.js',
      runtime: 'ecmascript',
      expectedOutput: ['[1,2,3] 3', '["a","c"] 2'],
    },
    {
      id: 'not-a-plain-object',
      file: 'not-a-plain-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 false undefined 2', '{"b":2} ["b"]', '1 {"x":1,"y":2}', '[["a",1]]'],
    },
    {
      id: 'weak',
      file: 'weak.js',
      runtime: 'ecmascript',
      expectedOutput: ['data true false', 'undefined undefined undefined', 'true undefined'],
    },
  ],
  simplifications: [
    'ES2025판의 Set 메서드(union 등), ES2024판의 Map.groupBy, ES2026판의 getOrInsert는 책 범위 밖이라 다루지 않습니다.',
    '명세의 [[MapData]]·[[SetData]] 목록과 empty 표시는 명세가 관찰할 수 있는 동작을 설명하려고 쓰는 표기이며, 명세는 해시 테이블 같은 다른 방식으로 구현해도 된다고 밝힙니다(sublinear 접근 요구). 성능은 다루지 않습니다.',
    'ES2024판까지의 Set.prototype.add·Map.prototype.set은 SameValueZero로 비교한 뒤 -0을 +0으로 바꿔 넣었고(has·get·delete도 SameValueZero로 찾음), ES2025판부터는 이 메서드들이 모두 CanonicalizeKeyedCollectionKey로 먼저 -0을 +0으로 바꾼 뒤 SameValue로 비교합니다. 두 방식의 관찰 결과는 같습니다.',
    'WeakMap·WeakSet의 키 조건과 엔트리 제거 서술은 판마다 다릅니다. 심벌 키는 ES2023판부터 허용되었고(ES2022판까지 객체만), 닿을 수 없게 된(inaccessible) 키의 엔트리를 ES2020판은 "반드시 찾아 제거한다"고, ES2021판부터는 살아 있지 않은(live가 아닌) 키의 엔트리를 구현이 "제거할 수 있다"고 적습니다. 본문은 현재 초안 기준입니다.',
    'WeakMap·WeakSet에서 닿을 수 없게 된 키의 엔트리가 언제 제거되는지는 명세가 정하지 않고 관찰할 수도 없어 예제로 보이지 않습니다. WeakRef와 FinalizationRegistry는 다루지 않습니다.',
    'Map·Set 서브클래싱, Symbol.species, forEach의 thisArg는 다루지 않습니다.',
    'JSON.stringify는 JSON 개념에서 다루는 주제이며 이 페이지에서는 결과를 출력하는 도구로만 씁니다.',
    'TypeError는 try...catch(47장)를 쓰지 않고 본문 문장과 테스트로 확인합니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Set Objects',
      url: 'https://tc39.es/ecma262/#sec-set-objects',
    },
    {
      label: 'ECMAScript 명세 — Map Objects',
      url: 'https://tc39.es/ecma262/#sec-map-objects',
    },
    {
      label: 'ECMAScript 명세 — SameValueZero',
      url: 'https://tc39.es/ecma262/#sec-samevaluezero',
    },
    {
      label: 'ECMAScript 명세 — Set.prototype.add',
      url: 'https://tc39.es/ecma262/#sec-set.prototype.add',
    },
    {
      label: 'ECMAScript 2024판 명세 — Set.prototype.add',
      url: 'https://tc39.es/ecma262/2024/#sec-set.prototype.add',
    },
    {
      label: 'ECMAScript 명세 — Map.prototype.set',
      url: 'https://tc39.es/ecma262/#sec-map.prototype.set',
    },
    {
      label: 'ECMAScript 명세 — CanonicalizeKeyedCollectionKey',
      url: 'https://tc39.es/ecma262/#sec-canonicalizekeyedcollectionkey',
    },
    {
      label: 'ECMAScript 명세 — Map.prototype.get',
      url: 'https://tc39.es/ecma262/#sec-map.prototype.get',
    },
    {
      label: 'ECMAScript 명세 — Set.prototype.delete',
      url: 'https://tc39.es/ecma262/#sec-set.prototype.delete',
    },
    {
      label: 'ECMAScript 명세 — CreateSetIterator',
      url: 'https://tc39.es/ecma262/#sec-createsetiterator',
    },
    {
      label: 'ECMAScript 명세 — CreateMapIterator',
      url: 'https://tc39.es/ecma262/#sec-createmapiterator',
    },
    {
      label: 'ECMAScript 명세 — Set.prototype.forEach',
      url: 'https://tc39.es/ecma262/#sec-set.prototype.foreach',
    },
    {
      label: 'ECMAScript 명세 — get Map.prototype.size',
      url: 'https://tc39.es/ecma262/#sec-get-map.prototype.size',
    },
    {
      label: 'ECMAScript 명세 — AddEntriesFromIterable',
      url: 'https://tc39.es/ecma262/#sec-add-entries-from-iterable',
    },
    {
      label: 'ECMAScript 명세 — WeakMap Objects',
      url: 'https://tc39.es/ecma262/#sec-weakmap-objects',
    },
    {
      label: 'ECMAScript 명세 — WeakSet Objects',
      url: 'https://tc39.es/ecma262/#sec-weakset-objects',
    },
    {
      label: 'ECMAScript 명세 — Execution (살아 있지 않은 값의 WeakMap 엔트리 제거)',
      url: 'https://tc39.es/ecma262/#sec-weakref-execution',
    },
    {
      label: 'ECMAScript 2020 명세 — WeakMap Objects (must detect and remove)',
      url: 'https://tc39.es/ecma262/2020/#sec-weakmap-objects',
    },
    {
      label: 'ECMAScript 2022 명세 — WeakMap.prototype.set (객체만 키)',
      url: 'https://tc39.es/ecma262/2022/#sec-weakmap.prototype.set',
    },
    {
      label: 'ECMAScript 명세 — CanBeHeldWeakly',
      url: 'https://tc39.es/ecma262/#sec-canbeheldweakly',
    },
    {
      label: 'ECMAScript 명세 — ToPropertyKey',
      url: 'https://tc39.es/ecma262/#sec-topropertykey',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryOwnPropertyKeys',
      url: 'https://tc39.es/ecma262/#sec-ordinaryownpropertykeys',
    },
    {
      label: 'MDN — Set',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Set',
    },
    {
      label: 'MDN — Map',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Map',
    },
    {
      label: 'MDN — WeakMap',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/WeakMap',
    },
    {
      label: 'MDN — WeakSet',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/WeakSet',
    },
    {
      label: 'MDN — Object.fromEntries()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries',
    },
    {
      label: 'MDN — 동등 비교 및 동일성',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Equality_comparisons_and_sameness',
    },
  ],
  reviewedAt: '2026-11-03',
} satisfies ConceptMeta
