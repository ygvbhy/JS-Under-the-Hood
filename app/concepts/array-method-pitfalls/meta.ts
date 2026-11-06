import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'array-method-pitfalls',
  title: '배열 메서드의 함정: 원본은 언제 바뀌고 무엇으로 비교할까',
  summary:
    '기본 sort는 비교 함수가 없으면 요소의 문자열 표현을 비교하고, sort·reverse는 원본을 바꿉니다. indexOf는 NaN을 못 찾고 includes는 찾으며, 구멍과 undefined는 메서드마다 다르게 다룹니다.',
  category: 'objects',
  order: 270,
  tags: [
    '배열 메서드',
    'array methods',
    'sort',
    '정렬',
    'toSorted',
    'indexOf',
    'includes',
    'SameValueZero',
    'reduce',
    '안정 정렬',
    '복사 메서드',
    '원본 변경',
  ],
  goals: [
    '비교 함수 없는 sort가 요소를 문자열 표현으로 비교하는 이유와 [10, 9, 1].sort()가 [1, 10, 9]가 되는 과정을 설명할 수 있다.',
    'sort·reverse·splice처럼 원본을 바꾸는 메서드와 slice·map·toSorted처럼 새 배열을 만드는 메서드를 구분하고, push·pop·splice·forEach의 반환값을 말할 수 있다.',
    'indexOf는 NaN을 못 찾고 includes는 찾는 이유를 IsStrictlyEqual과 SameValueZero의 차이로 설명할 수 있다.',
    'sort가 undefined와 구멍을 다루는 방식, 구멍을 만난 forEach·map·toSorted의 차이, 초기값 없는 reduce의 동작을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '배열은 객체다', slug: 'array-index-length' },
    { label: '동등 비교', slug: 'equality-operators' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
  ],
  related: [
    'array-index-length',
    'equality-operators',
    'primitives-and-objects',
    'type-coercion',
    'arrow-functions',
  ],
  examples: [
    {
      id: 'default-sort',
      file: 'default-sort.js',
      runtime: 'ecmascript',
      expectedOutput: ['[1,10,9]', '[-1,-2,3]', '[1,9,10]', '["B","a","b"]'],
    },
    {
      id: 'mutating-methods',
      file: 'mutating-methods.js',
      runtime: 'ecmascript',
      expectedOutput: ['true [1,2,3]', 'true [3,2,1]', 'false [2,1] [3,2,1]', '[6,4,2] [3,2,1]'],
    },
    {
      id: 'return-values',
      file: 'return-values.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 ["a","b","c"]', 'c ["a","b"]', '["a"] ["x","y","b"]', 'undefined'],
    },
    {
      id: 'copy-methods',
      file: 'copy-methods.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '[10,20,30] [30,10,20]',
        '[20,10,30] [10,20]',
        '[30,10,99] [30,10,20]',
        'RangeError',
        'false lee',
      ],
    },
    {
      id: 'undefined-and-stable',
      file: 'undefined-and-stable.js',
      runtime: 'ecmascript',
      expectedOutput: ['4 [1,3,null,null] true false', '0', 'BDAC'],
    },
    {
      id: 'search-nan',
      file: 'search-nan.js',
      runtime: 'ecmascript',
      expectedOutput: ['-1 true', '2 true', '-1 true'],
    },
    {
      id: 'holes-and-reduce',
      file: 'holes-and-reduce.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 3 false [2,null,6]', '3 true true', '6 16', 'TypeError', '0 5'],
    },
  ],
  simplifications: [
    '정렬 알고리즘과 비교 함수를 부르는 순서·횟수는 명세가 정하지 않는 구현 정의 사항이라 다루지 않습니다. 비교 함수가 일관된 비교자가 아니면(예: 불리언을 반환하면) 결과 순서도 명세가 정하지 않으므로 출력 예제를 두지 않고 문장으로만 설명합니다.',
    'filter·some·every·find·flat·flatMap 같은 고차 함수의 사용법과 thisArg는 다루지 않습니다. 콜백 메서드는 구멍을 만났을 때의 forEach·map과 초기값 없는 reduce만 살펴봅니다.',
    'Symbol.species와 ArraySpeciesCreate에 따른 하위 클래스의 동작, 배열 메서드를 유사 배열에 빌려 쓰는 경우, 콜백 안에서 배열을 바꾸는 경우는 다루지 않습니다.',
    '구멍 설명은 Array.prototype과 Object.prototype에 인덱스 프로퍼티가 없는 보통의 경우를 전제합니다. 명세의 HasProperty와 Get은 프로토타입 체인까지 보므로, 그곳에 같은 인덱스가 있으면 구멍에서도 콜백이 불리고 그 값을 읽습니다.',
    'localeCompare·Intl.Collator에 의한 언어별 정렬과 유니코드 정규화는 다루지 않습니다. 기본 sort의 문자열 비교는 코드 유닛 순서입니다.',
    '스프레드·Array.from·이터러블은 이 사이트에서 아직 다루지 않은 별도 개념이라 예제에 쓰지 않으며, 깊은 복사와 structuredClone도 다루지 않습니다.',
    'toSorted·toReversed·toSpliced·with는 『모던 자바스크립트 Deep Dive』 출간 이후에 추가된 메서드입니다. 예제는 이 메서드를 지원하는 환경(Node 24 기준)에서 실행한 결과입니다.',
    "예제 5의 people.map((p) => p.name).join('')은 이름을 이어 붙여 정렬 결과를 한 줄로 보이는 용도로만 쓰며, 이 페이지의 설명 대상이 아닙니다.",
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 별도 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Array.prototype.sort',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.sort',
    },
    {
      label: 'ECMAScript 명세 — SortIndexedProperties',
      url: 'https://tc39.es/ecma262/#sec-sortindexedproperties',
    },
    {
      label: 'ECMAScript 명세 — CompareArrayElements',
      url: 'https://tc39.es/ecma262/#sec-comparearrayelements',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.indexOf',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.indexof',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.includes',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.includes',
    },
    {
      label: 'ECMAScript 명세 — SameValueZero',
      url: 'https://tc39.es/ecma262/#sec-samevaluezero',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.push',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.push',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.splice',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.splice',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.map',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.map',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.reduce',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.reduce',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.toSorted',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.tosorted',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.with',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.with',
    },
    {
      label: 'MDN — Array.prototype.sort()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/sort',
    },
    {
      label: 'MDN — Array.prototype.toSorted()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted',
    },
    {
      label: 'MDN — Array.prototype.includes()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/includes',
    },
    {
      label: 'MDN — Array.prototype.indexOf()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf',
    },
    {
      label: 'MDN — Array.prototype.splice()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/splice',
    },
    {
      label: 'MDN — Array.prototype.reduce()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce',
    },
    {
      label: 'MDN — Array.prototype.with()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Array/with',
    },
  ],
  reviewedAt: '2026-11-02',
} satisfies ConceptMeta
