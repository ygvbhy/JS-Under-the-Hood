import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'
const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/'

export const concept = {
  slug: 'array-subclass',
  title: '내장 생성자 상속: Array를 상속한 클래스의 map은 왜 하위 클래스를 돌려줄까',
  summary:
    'Array를 상속한 클래스에서 map·filter·slice·concat은 호출한 배열의 constructor에서 Symbol.species로 얻은 생성자로 결과를 만들므로, species를 바꾸지 않으면 하위 클래스를 돌려줍니다. Array.from·of는 this를 생성자로 씁니다.',
  category: 'objects',
  order: 273,
  tags: [
    'Array',
    'extends',
    '하위 클래스',
    '서브클래싱',
    'Symbol.species',
    'ArraySpeciesCreate',
    'map',
    'filter',
    'slice',
    'concat',
    'Array.from',
    'Array.of',
    'Array.isArray',
    'constructor',
    'super',
    '내장 생성자',
    '배열 이그조틱',
    'Object.create',
  ],
  goals: [
    'Array를 상속한 클래스의 인스턴스에서 map·filter·slice·concat이 하위 클래스 인스턴스를 돌려준다는 것과 그 이유인 ArraySpeciesCreate의 단계를 설명할 수 있다.',
    '결과 배열의 생성자가 호출한 배열의 constructor 프로퍼티와 그 Symbol.species에서 정해지며, Array의 Symbol.species 접근자가 상속되어 this를 돌려준다는 것을 예측할 수 있다.',
    'static get [Symbol.species]로 배열 메서드의 결과만 바꿀 수 있고 Array.from·Array.of·new는 그대로라는 것을 구분할 수 있다.',
    '배열 메서드가 생성자에 길이 인수 하나만 넘기므로 생성자의 매개변수를 바꾼 하위 클래스에서 어떤 값이 들어가는지 예측할 수 있다.',
    'class extends Array로 만든 인스턴스는 Array.isArray가 true인 진짜 배열이고, Object.create(Array.prototype)로 이은 옛 방식은 그렇지 않다는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로토타입 체인', slug: 'prototype-chain' },
    { label: '클래스 상속과 super', slug: 'class-inheritance' },
    { label: '클래스의 getter와 setter', slug: 'class-accessors' },
    { label: '화살표 함수와 메서드 축약', slug: 'arrow-functions' },
    { label: '배열은 객체다', slug: 'array-index-length' },
    { label: '배열 고차 함수', slug: 'array-higher-order-functions' },
  ],
  related: [
    'symbol',
    'iterable-for-of',
    'spread-destructuring',
    'class-basics',
    'new-operator',
    'array-method-pitfalls',
    'error-objects',
  ],
  examples: [
    {
      id: 'species-basic',
      file: 'species-basic.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'true', 'MyArr', 'true', 'true'],
    },
    {
      id: 'constructor-property',
      file: 'constructor-property.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'true', 'false true'],
    },
    {
      id: 'species-override',
      file: 'species-override.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'false', 'true', 'true'],
    },
    {
      id: 'old-vs-class',
      file: 'old-vs-class.js',
      runtime: 'ecmascript',
      expectedOutput: ['old true false 2', 'class true true 6'],
    },
    {
      id: 'constructor-signature',
      file: 'constructor-signature.js',
      runtime: 'ecmascript',
      expectedOutput: ['work', '3', '0', '["a","c"] 2', '2'],
    },
    {
      id: 'receiver-and-this',
      file: 'receiver-and-this.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'false', 'true'],
    },
  ],
  simplifications: [
    "예제는 Node vm에서 strict mode가 아닌 스크립트로 실행했고 console은 ECMAScript가 아니라 호스트가 제공하는 API입니다. 모든 예제는 파일 첫 줄에 'use strict';를 붙여도 출력이 같습니다.",
    'Symbol.species는 well-known 심벌이고 심벌 자체는 심벌 개념에서 다룹니다. 여기서는 static get [Symbol.species]()가 계산된 이름으로 클래스에 정적 접근자를 정의한다는 것만 씁니다.',
    'Array.from이 인수를 순회할 수 있으면 생성자를 인수 없이 부르고 그렇지 않으면 길이로 부르는 구분은 이터러블과 for...of 개념에서 다루는 이터러블에 따른 것입니다. 스프레드 문법([...a])으로 만든 배열은 species를 쓰지 않고 늘 Array이며 스프레드와 디스트럭처링 개념에서 다룹니다.',
    'ArraySpeciesCreate의 다른 realm 단계, species 생성자가 배열이 아닌 것을 돌려주는 경우, 배열 메서드를 배열이 아닌 값에 빌려 쓰는 경우(IsArray가 false이면 늘 Array)는 다루지 않습니다.',
    'ES2023의 toSorted·toReversed·toSpliced·with는 species를 쓰지 않고 늘 Array를 만들며 다루지 않습니다.',
    'MDN은 Symbol.species가 임의 코드 실행과 보안 취약점의 여지를 만들고 최적화를 어렵게 해 엔진 구현자들이 제거를 검토하고 있다며 되도록 의존하지 말라고 경고합니다. 이 페이지는 동작 원리를 보이려고 재정의를 씁니다.',
    'Error 상속은 에러 객체 개념에서 다루고, Map·Set·Promise·RegExp 같은 다른 내장 생성자의 상속과 species, Reflect.construct는 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — ArraySpeciesCreate',
      url: `${SPEC}sec-arrayspeciescreate`,
    },
    {
      label: 'ECMAScript 명세 — get Array [ %Symbol.species% ]',
      url: `${SPEC}sec-get-array-%25symbol.species%25`,
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.map',
      url: `${SPEC}sec-array.prototype.map`,
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.concat',
      url: `${SPEC}sec-array.prototype.concat`,
    },
    { label: 'ECMAScript 명세 — Array.from', url: `${SPEC}sec-array.from` },
    { label: 'ECMAScript 명세 — Array.of', url: `${SPEC}sec-array.of` },
    { label: 'ECMAScript 명세 — Array ( ...values )', url: `${SPEC}sec-array` },
    {
      label: 'ECMAScript 명세 — Array Exotic Objects',
      url: `${SPEC}sec-array-exotic-objects`,
    },
    {
      label: 'MDN — Symbol.species',
      url: `${MDN}Global_Objects/Symbol/species`,
    },
    { label: 'MDN — extends', url: `${MDN}Classes/extends` },
  ],
  reviewedAt: '2026-11-26',
} satisfies ConceptMeta
