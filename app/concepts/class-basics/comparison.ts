// 본문 "생성자 함수와 클래스" 비교표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 probe(짧은 스크립트)를 새 vm 컨텍스트에서 실행해, 완료 값을 문자열로 바꾼 결과(오류가 나면 오류의 name)가 expected와 같은지 확인한다.
// exampleId가 null이 아닌 행은 같은 내용을 보이는 예제 id이고, meta.examples에 있어야 한다.
export type Cell = { text: string; probe: string; expected: string }

export const comparison: {
  aspect: string
  exampleId: string | null
  fn: Cell
  cls: Cell
}[] = [
  {
    aspect: 'typeof',
    exampleId: 'class-is-function',
    fn: { text: "'function'", probe: 'function F() {}; typeof F', expected: 'function' },
    cls: { text: "'function'", probe: 'class C {}; typeof C', expected: 'function' },
  },
  {
    aspect: '선언 전에 new',
    exampleId: 'class-tdz',
    fn: {
      text: '됨(함수 선언은 호이스팅되어 초기화까지 끝남)',
      probe: 'var o = new F(); function F() {}; typeof o',
      expected: 'object',
    },
    cls: {
      text: 'ReferenceError(TDZ)',
      probe: 'new C(); class C {}',
      expected: 'ReferenceError',
    },
  },
  {
    aspect: 'new 없이 호출',
    exampleId: 'call-without-new',
    fn: {
      text: '함수로 호출됨',
      probe: 'function F() { return "called" }; F()',
      expected: 'called',
    },
    cls: { text: 'TypeError', probe: 'class C {}; C()', expected: 'TypeError' },
  },
  {
    aspect: '꺼낸 메서드의 this(sloppy 스크립트 기준)',
    exampleId: 'class-strict',
    fn: {
      text: 'globalThis의 값',
      probe:
        'function F() {}; F.prototype.m = function () { return this === globalThis }; var m = new F().m; String(m())',
      expected: 'true',
    },
    cls: {
      text: 'undefined(클래스 본문은 항상 strict)',
      probe: 'class C { m() { return this } }; var m = new C().m; String(m())',
      expected: 'undefined',
    },
  },
  {
    aspect: '메서드가 for...in에 나오는가',
    exampleId: 'method-enumerable',
    fn: {
      text: '나옴(대입한 프로퍼티는 열거 가능)',
      probe:
        'function F() {}; F.prototype.hello = function () {}; var k = []; for (var key in new F()) k.push(key); k.join()',
      expected: 'hello',
    },
    cls: {
      text: '나오지 않음(열거 불가)',
      probe: 'class C { hello() {} }; var k = []; for (var key in new C()) k.push(key); k.join()',
      expected: '',
    },
  },
  {
    aspect: '메서드를 new(prototype에 대입한 function 식 / 클래스 메서드)',
    exampleId: 'method-not-constructor',
    fn: {
      text: '됨(function 식은 생성자가 될 수 있음)',
      probe: 'function F() {}; F.prototype.m = function () {}; typeof new (new F().m)()',
      expected: 'object',
    },
    cls: {
      text: 'TypeError(메서드 정의 문법으로 만든 함수는 생성자가 아님)',
      probe: 'class C { m() {} }; new (new C().m)()',
      expected: 'TypeError',
    },
  },
  {
    aspect: 'prototype 프로퍼티의 writable',
    exampleId: 'method-not-constructor',
    fn: {
      text: 'true',
      probe: 'function F() {}; String(Object.getOwnPropertyDescriptor(F, "prototype").writable)',
      expected: 'true',
    },
    cls: {
      text: 'false',
      probe: 'class C {}; String(Object.getOwnPropertyDescriptor(C, "prototype").writable)',
      expected: 'false',
    },
  },
  {
    aspect: '#private 필드',
    exampleId: 'private-field',
    fn: {
      text: '쓸 수 없음(클래스 본문 밖이라 SyntaxError)',
      probe: 'function F() { this.#secret = 1 }',
      expected: 'SyntaxError',
    },
    cls: {
      text: '쓸 수 있음(키·JSON에 나타나지 않음)',
      probe: 'class C { #secret = 1 }; Object.keys(new C()).length + " " + JSON.stringify(new C())',
      expected: '0 {}',
    },
  },
]
