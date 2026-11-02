// 본문 "연산 표로 정리" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 setup 뒤에 probe(짧은 스크립트)를 붙여 새 vm 컨텍스트에서 실행하고, 완료 값을 문자열로 바꾼 결과가 expected와 같은지 확인한다.
// exampleId는 같은 내용을 보이는 예제 id이고, meta.examples에 있어야 한다.
export type Cell = { text: '나옴' | '빠짐' | 'true'; probe: string; expected: 'true' | 'false' }

export const setup =
  "var secret = Symbol('secret'); var box = { label: 'box', [secret]: 1 }; Object.defineProperty(box, 'code', { value: 2 });"

export const columns = [
  { key: 'label', label: '문자열 키 label' },
  { key: 'code', label: '열거 불가 문자열 키 code' },
  { key: 'secret', label: '심벌 키 secret' },
]

export const operations: {
  operation: string
  exampleId: string
  cells: [Cell, Cell, Cell]
}[] = [
  {
    operation: 'for...in',
    exampleId: 'not-private',
    cells: [
      {
        text: '나옴',
        probe: "var ks = []; for (var k in box) ks.push(k); String(ks.indexOf('label') >= 0)",
        expected: 'true',
      },
      {
        text: '빠짐',
        probe: "var ks = []; for (var k in box) ks.push(k); String(ks.indexOf('code') >= 0)",
        expected: 'false',
      },
      {
        text: '빠짐',
        probe: 'var ks = []; for (var k in box) ks.push(k); String(ks.indexOf(secret) >= 0)',
        expected: 'false',
      },
    ],
  },
  {
    operation: 'Object.keys',
    exampleId: 'not-private',
    cells: [
      {
        text: '나옴',
        probe: "String(Object.keys(box).indexOf('label') >= 0)",
        expected: 'true',
      },
      {
        text: '빠짐',
        probe: "String(Object.keys(box).indexOf('code') >= 0)",
        expected: 'false',
      },
      {
        text: '빠짐',
        probe: 'String(Object.keys(box).indexOf(secret) >= 0)',
        expected: 'false',
      },
    ],
  },
  {
    operation: 'JSON.stringify',
    exampleId: 'not-private',
    cells: [
      {
        text: '나옴',
        probe: 'String(JSON.stringify(box).indexOf(\'"label"\') >= 0)',
        expected: 'true',
      },
      {
        text: '빠짐',
        probe: 'String(JSON.stringify(box).indexOf(\'"code"\') >= 0)',
        expected: 'false',
      },
      {
        text: '빠짐',
        probe: "String(JSON.stringify(box).indexOf('1') >= 0)",
        expected: 'false',
      },
    ],
  },
  {
    operation: 'Object.assign({}, box)',
    exampleId: 'assign-json',
    cells: [
      {
        text: '나옴',
        probe:
          "var copy = Object.assign({}, box); String(Object.prototype.hasOwnProperty.call(copy, 'label'))",
        expected: 'true',
      },
      {
        text: '빠짐',
        probe:
          "var copy = Object.assign({}, box); String(Object.prototype.hasOwnProperty.call(copy, 'code'))",
        expected: 'false',
      },
      {
        text: '나옴',
        probe:
          'var copy = Object.assign({}, box); String(Object.prototype.hasOwnProperty.call(copy, secret))',
        expected: 'true',
      },
    ],
  },
  {
    operation: 'Object.getOwnPropertyNames',
    exampleId: 'not-private',
    cells: [
      {
        text: '나옴',
        probe: "String(Object.getOwnPropertyNames(box).indexOf('label') >= 0)",
        expected: 'true',
      },
      {
        text: '나옴',
        probe: "String(Object.getOwnPropertyNames(box).indexOf('code') >= 0)",
        expected: 'true',
      },
      {
        text: '빠짐',
        probe: 'String(Object.getOwnPropertyNames(box).indexOf(secret) >= 0)',
        expected: 'false',
      },
    ],
  },
  {
    operation: 'Object.getOwnPropertySymbols',
    exampleId: 'not-private',
    cells: [
      {
        text: '빠짐',
        probe: "String(Object.getOwnPropertySymbols(box).indexOf('label') >= 0)",
        expected: 'false',
      },
      {
        text: '빠짐',
        probe: "String(Object.getOwnPropertySymbols(box).indexOf('code') >= 0)",
        expected: 'false',
      },
      {
        text: '나옴',
        probe: 'String(Object.getOwnPropertySymbols(box).indexOf(secret) >= 0)',
        expected: 'true',
      },
    ],
  },
  {
    operation: 'Reflect.ownKeys',
    exampleId: 'key-order',
    cells: [
      {
        text: '나옴',
        probe: "String(Reflect.ownKeys(box).indexOf('label') >= 0)",
        expected: 'true',
      },
      {
        text: '나옴',
        probe: "String(Reflect.ownKeys(box).indexOf('code') >= 0)",
        expected: 'true',
      },
      {
        text: '나옴',
        probe: 'String(Reflect.ownKeys(box).indexOf(secret) >= 0)',
        expected: 'true',
      },
    ],
  },
  {
    operation: '키 in box',
    exampleId: 'symbol-key',
    cells: [
      {
        text: 'true',
        probe: "String('label' in box)",
        expected: 'true',
      },
      {
        text: 'true',
        probe: "String('code' in box)",
        expected: 'true',
      },
      {
        text: 'true',
        probe: 'String(secret in box)',
        expected: 'true',
      },
    ],
  },
]
