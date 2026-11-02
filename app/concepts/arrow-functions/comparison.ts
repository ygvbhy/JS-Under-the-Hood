// 본문 "일반 함수, 메서드 축약, 화살표 함수" 비교표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 probe(짧은 스크립트)를 새 vm 컨텍스트에서 실행해, 완료 값을 문자열로 바꾼 결과(오류가 나면 오류의 name)가 expected와 같은지 확인한다.
// exampleId가 null이 아닌 행은 같은 내용을 보이는 예제 id이고, meta.examples에 있어야 한다.
export type Cell = { text: string; probe: string; expected: string }

export const comparison: {
  aspect: string
  exampleId: string | null
  normal: Cell
  method: Cell
  arrow: Cell
}[] = [
  {
    aspect: 'typeof',
    exampleId: 'not-constructor',
    normal: { text: "'function'", probe: 'var f = function () {}; typeof f', expected: 'function' },
    method: { text: "'function'", probe: 'var o = { f() {} }; typeof o.f', expected: 'function' },
    arrow: { text: "'function'", probe: 'var f = () => {}; typeof f', expected: 'function' },
  },
  {
    aspect: 'new로 호출',
    exampleId: 'not-constructor',
    normal: {
      text: '됨(새 객체를 만듦)',
      probe: 'var f = function () {}; typeof new f()',
      expected: 'object',
    },
    method: { text: 'TypeError', probe: 'var o = { f() {} }; new o.f()', expected: 'TypeError' },
    arrow: { text: 'TypeError', probe: 'var f = () => {}; new f()', expected: 'TypeError' },
  },
  {
    aspect: 'prototype 프로퍼티',
    exampleId: 'not-constructor',
    normal: {
      text: '있음',
      probe: 'var f = function () {}; String(f.hasOwnProperty("prototype"))',
      expected: 'true',
    },
    method: {
      text: '없음',
      probe: 'var o = { f() {} }; String(o.f.hasOwnProperty("prototype"))',
      expected: 'false',
    },
    arrow: {
      text: '없음',
      probe: 'var f = () => {}; String(f.hasOwnProperty("prototype"))',
      expected: 'false',
    },
  },
  {
    aspect: 'o.f()로 부를 때 this',
    exampleId: 'arrow-outer-bindings',
    normal: {
      text: 'o',
      probe: 'var o = { f: function () { return this } }; String(o.f() === o)',
      expected: 'true',
    },
    method: {
      text: 'o',
      probe: 'var o = { f() { return this } }; String(o.f() === o)',
      expected: 'true',
    },
    arrow: {
      text: 'o가 아님(바깥 this)',
      probe: 'var o = { f: () => this }; String(o.f() === o)',
      expected: 'false',
    },
  },
  {
    aspect: '자기 arguments',
    exampleId: 'arrow-outer-bindings',
    normal: {
      text: '있음',
      probe: 'var f = function () { return arguments.length }; f(1, 2)',
      expected: '2',
    },
    method: {
      text: '있음',
      probe: 'var o = { f() { return arguments.length } }; o.f(1, 2)',
      expected: '2',
    },
    arrow: {
      text: '없음(바깥 함수의 것)',
      probe: 'function outer() { var f = () => arguments.length; return f(1, 2) } outer()',
      expected: '0',
    },
  },
  {
    aspect: 'super',
    exampleId: 'method-super',
    normal: {
      text: 'SyntaxError(쓸 수 없음)',
      probe: 'var o = { f: function () { return super.x } }',
      expected: 'SyntaxError',
    },
    method: {
      text: '쓸 수 있음',
      probe:
        'var o = { f() { return super.toString === Object.prototype.toString } }; String(o.f())',
      expected: 'true',
    },
    arrow: {
      text: '바깥 메서드의 것',
      probe:
        'var o = { f() { var a = () => super.toString === Object.prototype.toString; return a() } }; String(o.f())',
      expected: 'true',
    },
  },
  {
    aspect: '중복 매개변수(sloppy)',
    exampleId: null,
    normal: {
      text: '허용(단순 매개변수 목록일 때, 뒤 인수를 씀)',
      probe: 'function f(a, a) { return a }; f(1, 2)',
      expected: '2',
    },
    method: {
      text: 'SyntaxError',
      probe: 'var o = { m(a, a) {} }',
      expected: 'SyntaxError',
    },
    arrow: {
      text: 'SyntaxError',
      probe: 'var f = (a, a) => 1',
      expected: 'SyntaxError',
    },
  },
]
