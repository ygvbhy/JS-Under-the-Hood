import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'property-attributes',
  title: '프로퍼티 어트리뷰트와 접근자: 대입했는데 값이 그대로인 이유',
  summary:
    '프로퍼티에는 값 말고도 쓰기·나열·재정의 가능 여부를 정하는 어트리뷰트가 있습니다. writable이 false면 대입이 sloppy mode에서는 무시되고 strict mode에서는 TypeError입니다. getter는 읽을 때마다 호출되고, freeze는 얕게 적용됩니다.',
  category: 'objects',
  order: 150,
  tags: [
    '프로퍼티 어트리뷰트',
    '디스크립터',
    'defineProperty',
    'writable',
    'enumerable',
    'configurable',
    '접근자 프로퍼티',
    'getter',
    'setter',
    'freeze',
    'seal',
    'strict mode',
    'TypeError',
  ],
  goals: [
    '프로퍼티가 값 말고도 writable·enumerable·configurable 어트리뷰트를 가지며, 리터럴·대입으로 만들면 모두 true이고 defineProperty로 새로 만들 때 생략하면 false라는 것을 설명할 수 있다.',
    'writable이 false인 프로퍼티에 대입하거나 configurable이 false인 프로퍼티를 delete했을 때 sloppy mode에서는 무시되고 strict mode에서는 TypeError가 나는 것을 예측할 수 있다.',
    '접근자 프로퍼티의 getter가 읽을 때마다, setter가 대입할 때마다 호출되며 값을 저장하지 않는다는 것을 설명할 수 있다.',
    'preventExtensions·seal·freeze가 막는 범위를 구분하고, 이 함수들이 그 객체의 프로퍼티에만 적용되는 얕은 변경 방지임을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: 'TDZ', slug: 'tdz' },
  ],
  related: [],
  examples: [
    {
      id: 'descriptor',
      file: 'descriptor.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '{"value":100,"writable":true,"enumerable":true,"configurable":true}',
        '{"value":"A1","writable":false,"enumerable":false,"configurable":false}',
        '{"price":100}',
      ],
    },
    {
      id: 'writable-sloppy',
      file: 'writable-sloppy.js',
      runtime: 'ecmascript',
      expectedOutput: ['A1', 'false', 'A1'],
    },
    {
      id: 'writable-strict',
      file: 'writable-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'TypeError', 'A1'],
    },
    {
      id: 'redefine',
      file: 'redefine.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'A1'],
    },
    {
      id: 'getter',
      file: 'getter.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '2', 'function', '{"next":3}'],
    },
    {
      id: 'setter',
      file: 'setter.js',
      runtime: 'ecmascript',
      expectedOutput: ['100', '212', '["get","set","enumerable","configurable"]'],
    },
    {
      id: 'three-levels',
      file: 'three-levels.js',
      runtime: 'ecmascript',
      expectedOutput: ['[{},{"x":3},{"x":1}]'],
    },
    {
      id: 'freeze-shallow',
      file: 'freeze-shallow.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '20', 'true', 'false'],
    },
  ],
  simplifications: [
    '명세는 프로퍼티 어트리뷰트, 내부 슬롯, 내부 메서드를 [[ ]] 표기로 쓰는데, 이 이름들은 코드에서 직접 접근할 수 없습니다. 이 페이지의 화면에 나오는 어트리뷰트 칩은 디스크립터의 필드 이름(value·writable·get·set·enumerable·configurable)을 그대로 보입니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 별도 개념에서 다룹니다.',
    'getter와 setter는 보통 this로 자기 프로퍼티를 읽고 쓰지만 this는 별도 개념에서 다루므로, 예제의 getter와 setter는 바깥 변수를 읽고 씁니다.',
    '상속된 프로퍼티(프로토타입)의 writable이나 setter도 대입 결과에 영향을 주지만 별도 개념에서 다룹니다. 예제는 객체 자기 프로퍼티만 씁니다.',
    '심벌 키와 for…in은 이 페이지에서 다루지 않습니다.',
    '대입과 delete가 오류 없이 무시되는 sloppy 예제(2, 7, 8번)는 ES 모듈에서는 TypeError로 끝납니다. 모듈은 항상 strict mode이기 때문입니다. 직접 작성한 CommonJS 파일은 이 페이지의 실행 결과와 같지만, TypeScript나 Babel이 변환한 CommonJS 출력에는 보통 use strict 지시어가 붙어 strict mode로 실행됩니다.',
    '시뮬레이터는 바깥 변수를 찾는 과정과 console·JSON 호출 과정을 보이지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Property Attributes',
      url: 'https://tc39.es/ecma262/#sec-property-attributes',
    },
    {
      label:
        'ECMAScript 2025 명세 — Property Attributes (접근자 어트리뷰트를 [[Get]]·[[Set]]으로 표기)',
      url: 'https://tc39.es/ecma262/2025/#sec-property-attributes',
    },
    {
      label: 'ECMAScript 명세 — Object Internal Methods and Internal Slots',
      url: 'https://tc39.es/ecma262/#sec-object-internal-methods-and-internal-slots',
    },
    {
      label: 'ECMAScript 명세 — OrdinarySetWithOwnDescriptor',
      url: 'https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor',
    },
    {
      label: 'ECMAScript 명세 — PutValue',
      url: 'https://tc39.es/ecma262/#sec-putvalue',
    },
    {
      label: 'ECMAScript 명세 — The delete Operator: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-delete-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — Object.defineProperty',
      url: 'https://tc39.es/ecma262/#sec-object.defineproperty',
    },
    {
      label: 'ECMAScript 명세 — Object.getOwnPropertyDescriptor',
      url: 'https://tc39.es/ecma262/#sec-object.getownpropertydescriptor',
    },
    {
      label: 'ECMAScript 명세 — Object.preventExtensions',
      url: 'https://tc39.es/ecma262/#sec-object.preventextensions',
    },
    {
      label: 'ECMAScript 명세 — Object.seal',
      url: 'https://tc39.es/ecma262/#sec-object.seal',
    },
    {
      label: 'ECMAScript 명세 — Object.freeze',
      url: 'https://tc39.es/ecma262/#sec-object.freeze',
    },
    {
      label: 'ECMAScript 명세 — SetIntegrityLevel',
      url: 'https://tc39.es/ecma262/#sec-setintegritylevel',
    },
    {
      label: 'ECMAScript 명세 — SerializeJSONObject',
      url: 'https://tc39.es/ecma262/#sec-serializejsonobject',
    },
    {
      label: 'MDN — Object.defineProperty()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty',
    },
    {
      label: 'MDN — Object.getOwnPropertyDescriptor()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor',
    },
    {
      label: 'MDN — Object.freeze()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze',
    },
    {
      label: 'MDN — Object.seal()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/seal',
    },
    {
      label: 'MDN — Object.preventExtensions()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/preventExtensions',
    },
    {
      label: 'MDN — getter',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/get',
    },
    {
      label: 'MDN — setter',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/set',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
