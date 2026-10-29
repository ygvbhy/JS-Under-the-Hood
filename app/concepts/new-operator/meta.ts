import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'new-operator',
  title: 'new 연산자: 생성자 함수는 어떤 객체를 돌려주나',
  summary:
    'new는 새 객체를 만들어 this로 연결하고 본문을 실행한 뒤 그 객체를 돌려줍니다. 생성자가 객체를 return하면 그 객체가 결과이고 원시 값 return은 무시됩니다. new 없이 호출하면 새 객체가 생기지 않습니다.',
  category: 'objects',
  tags: [
    'new',
    '생성자 함수',
    'constructor',
    'this',
    'return',
    'new.target',
    '[[Construct]]',
    '[[Call]]',
    'non-constructor',
    '인스턴스',
    '내장 생성자',
    'strict mode',
    'TypeError',
  ],
  goals: [
    'new F(...)가 인수를 평가하고 생성자인지 확인한 뒤 새 객체를 만들어 this로 연결하고 본문을 실행해 결과를 정하는 순서를 설명할 수 있다.',
    '생성자 본문이 객체를 return하는지, 원시 값(null 포함)을 return하는지, return하지 않는지에 따라 new 식의 결과가 무엇인지 예측할 수 있다.',
    'new 없이 생성자 함수를 호출했을 때 새 객체가 생기지 않고, sloppy mode에서는 전역 프로퍼티가 생기며 strict mode에서는 TypeError가 나는 것을 예측할 수 있다.',
    '메서드 축약 문법으로 만든 메서드나 Math.max 같은 내장 함수처럼 생성자가 아닌 함수에 new를 쓰면 TypeError가 나는 것과, new.target으로 new 호출 여부를 알아내는 방법을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '함수 호출', slug: 'function-calls' },
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: 'typeof 연산자', slug: 'typeof-operator' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: [],
  examples: [
    {
      id: 'basic',
      file: 'basic.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"title":"JS","price":30}', '{"title":"CSS","price":20}', 'false'],
    },
    {
      id: 'return-object',
      file: 'return-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"title":"other"}'],
    },
    {
      id: 'return-primitive',
      file: 'return-primitive.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"title":"JS"}'],
    },
    {
      id: 'return-null',
      file: 'return-null.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"title":"JS"}', 'object'],
    },
    {
      id: 'without-new-sloppy',
      file: 'without-new-sloppy.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', 'JS'],
    },
    {
      id: 'without-new-strict',
      file: 'without-new-strict.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'undefined'],
    },
    {
      id: 'new-target',
      file: 'new-target.js',
      runtime: 'ecmascript',
      expectedOutput: ['{"title":"JS"}', '{"title":"CSS"}'],
    },
    {
      id: 'non-constructor',
      file: 'non-constructor.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'TypeError', 'function', 'function'],
    },
    {
      id: 'built-in',
      file: 'built-in.js',
      runtime: 'ecmascript',
      expectedOutput: ['{}', '{}', 'object', 'string'],
    },
  ],
  simplifications: [
    '새 객체의 프로토타입은 명세상 newTarget의 prototype 프로퍼티로 정해집니다(OrdinaryCreateFromConstructor). 이 페이지의 new F(...)에서는 newTarget이 F 자신이라 F의 prototype이 쓰이고 new.target도 F입니다. newTarget이 F와 다른 경우(Reflect.construct, 클래스 상속)와 프로토타입 자체는 별도 개념에서 다루며, 시각화에는 프로토타입을 표시하지 않습니다.',
    'this는 함수를 호출하는 방식에 따라 정해집니다. 이 페이지는 new 호출과 일반 함수 호출(sloppy·strict)만 다루고, 메서드 호출·call·apply·bind·화살표 함수는 별도 개념에서 다룹니다.',
    '[[Call]]과 [[Construct]]는 명세의 내부 메서드 이름이며 코드에서 접근할 수 없습니다. 시뮬레이터의 단계는 명세 [[Construct]]의 단계를 다섯 묶음으로 나눈 것이고, this가 실제로 저장되는 실행 컨텍스트와 환경 레코드는 별도 개념이라 "호출 영역의 this"로 그립니다.',
    '클래스 생성자는 new 없이 호출하면 TypeError입니다. 파생 클래스(extends)의 생성자는 undefined가 아닌 원시 값을 return하면 TypeError입니다. 이 페이지는 함수 선언·함수 표현식으로 만든 생성자만 다룹니다.',
    '제너레이터(function*)와 async function은 function 키워드로 만들지만 생성자가 아니어서 new를 쓰면 TypeError입니다. 두 함수는 별도 개념에서 다룹니다.',
    '화살표 함수도 생성자가 아니지만 문법을 아직 다루지 않아 예제에 쓰지 않습니다.',
    '내장 생성자는 new 유무에 따른 동작을 각자 명세가 정합니다(Object는 같고 String은 다릅니다). new String이 만드는 객체(래퍼 객체)는 별도 개념에서 다룹니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 별도 개념에서 다룹니다.',
    'without-new-sloppy.js는 ES 모듈(항상 strict mode)에서는 TypeError로 끝납니다. 직접 작성한 CommonJS 파일은 이 페이지의 실행 결과와 같습니다.',
    '결과로 쓰이지 않은 객체를 언제 메모리에서 정리하는지는 명세가 정하지 않습니다. 시뮬레이터는 "결과로 쓰이지 않음"만 표시합니다.',
    '시뮬레이터는 선언문이 실행된 변수만 보이며, Book 함수 바인딩, 전역 객체의 다른 프로퍼티, title을 전역에서 찾는 과정, console·JSON 호출 과정을 생략합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The new Operator',
      url: 'https://tc39.es/ecma262/#sec-new-operator',
    },
    {
      label: 'ECMAScript 명세 — EvaluateNew',
      url: 'https://tc39.es/ecma262/#sec-evaluatenew',
    },
    {
      label: 'ECMAScript 명세 — [[Construct]] (ECMAScript Function Objects)',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-function-objects-construct-argumentslist-newtarget',
    },
    {
      label: 'ECMAScript 명세 — [[Call]] (ECMAScript Function Objects)',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-function-objects-call-thisargument-argumentslist',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryCreateFromConstructor',
      url: 'https://tc39.es/ecma262/#sec-ordinarycreatefromconstructor',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryCallBindThis',
      url: 'https://tc39.es/ecma262/#sec-ordinarycallbindthis',
    },
    {
      label: 'ECMAScript 명세 — IsConstructor',
      url: 'https://tc39.es/ecma262/#sec-isconstructor',
    },
    {
      label: 'ECMAScript 명세 — MakeConstructor',
      url: 'https://tc39.es/ecma262/#sec-makeconstructor',
    },
    {
      label: 'ECMAScript 명세 — DefineMethod',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-definemethod',
    },
    {
      label: 'ECMAScript 명세 — Meta Properties: Runtime Semantics: Evaluation (new.target)',
      url: 'https://tc39.es/ecma262/#sec-meta-properties-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — Object ( value )',
      url: 'https://tc39.es/ecma262/#sec-object-value',
    },
    {
      label: 'ECMAScript 명세 — String ( value )',
      url: 'https://tc39.es/ecma262/#sec-string-constructor-string-value',
    },
    {
      label: 'MDN — new 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/new',
    },
    {
      label: 'MDN — new.target',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/new.target',
    },
    {
      label: 'MDN — Object() 생성자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/Object',
    },
    {
      label: 'MDN — String() 생성자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/String',
    },
    {
      label: 'MDN — 메서드 정의',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Method_definitions',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
