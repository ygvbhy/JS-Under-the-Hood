import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'typeof-operator',
  title: 'typeof 연산자: 값의 타입을 어떤 문자열로 알려 주나',
  summary:
    "typeof는 값의 타입을 문자열로 돌려줍니다. 대부분 명세의 타입 이름과 같지만 null은 'object', 함수는 'function'이 되고, 선언하지 않은 식별자에는 오류 대신 'undefined'를 돌려줍니다.",
  category: 'fundamentals',
  tags: [
    'typeof',
    '타입 확인',
    '데이터 타입',
    '원시 타입',
    'typeof null',
    'function',
    'undefined',
    '선언하지 않은 식별자',
    'ReferenceError',
    '연산자 우선순위',
    'Symbol',
    'BigInt',
  ],
  goals: [
    'typeof가 각 원시 값에 돌려주는 문자열을 예측할 수 있다.',
    "typeof null이 'object'라는 것과 null을 === null로 확인해야 하는 이유를 설명할 수 있다.",
    "함수에는 'function', 그 밖의 객체에는 'object'가 나오는 기준을 설명할 수 있다.",
    '선언하지 않은 식별자에 typeof를 써도 오류가 나지 않는 이유를 설명할 수 있다.',
    "typeof가 단항 연산자라서 typeof 1 + 2의 결과가 'number2'인 것을 설명할 수 있다.",
  ],
  prerequisites: [
    { label: '데이터 타입' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
    { label: '숫자 타입', slug: 'number-type' },
    { label: '함수 선언과 함수 표현식' },
  ],
  related: ['number-type', 'primitives-and-objects', 'equality-operators'],
  examples: [
    {
      id: 'primitives',
      file: 'typeof-primitives.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined boolean number string', 'symbol bigint'],
    },
    {
      id: 'null',
      file: 'typeof-null.js',
      runtime: 'ecmascript',
      expectedOutput: ['object object', 'true false'],
    },
    {
      id: 'function',
      file: 'typeof-function.js',
      runtime: 'ecmascript',
      expectedOutput: ['function function number'],
    },
    {
      id: 'undeclared',
      file: 'typeof-undeclared.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', 'undefined'],
    },
    {
      id: 'result',
      file: 'typeof-result.js',
      runtime: 'ecmascript',
      expectedOutput: ['string', 'number2 number'],
    },
  ],
  simplifications: [
    '명세는 typeof의 피연산자가 이름을 찾지 못한 참조(Reference Record의 IsUnresolvableReference)일 때 값을 꺼내지 않고 "undefined"를 돌려줍니다. 이 페이지는 이를 "선언하지 않은 식별자"로 줄여 말합니다.',
    '선언은 있지만 그 선언보다 앞에서 let·const 변수에 typeof를 쓰면 ReferenceError가 납니다. 이 동작(TDZ)은 별도 개념에서 다루며, 이 페이지의 예제는 선언 뒤에만 typeof를 씁니다.',
    "함수가 'function'인 기준은 명세의 [[Call]] 내부 메서드(호출할 수 있는지)입니다. 이 페이지는 함수 선언과 함수 표현식만 예로 들며, 화살표 함수·클래스·메서드는 다루지 않습니다.",
    "typeof null이 'object'인 것은 명세의 typeof 결과 규칙이 그렇게 정하기 때문입니다. 그렇게 정해진 역사적 배경은 다루지 않습니다(MDN 참고).",
    '배열·래퍼 객체 등 다른 객체의 typeof 결과와 instanceof 같은 다른 타입 확인 방법은 다루지 않습니다.',
    "브라우저 호스트의 document.all(명세 부록 B [[IsHTMLDDA]])은 typeof가 'undefined'를 돌려주는 예외인데 다루지 않습니다.",
    'console.log는 호스트 API이며 문자열을 따옴표 없이 출력합니다. 예제 출력의 object, number2 등은 모두 문자열입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The typeof Operator',
      url: 'https://tc39.es/ecma262/#sec-typeof-operator',
    },
    {
      label: 'ECMAScript 명세 — typeof: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-typeof-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — IsUnresolvableReference',
      url: 'https://tc39.es/ecma262/#sec-isunresolvablereference',
    },
    {
      label: 'ECMAScript 명세 — ECMAScript Language Types',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-language-types',
    },
    {
      label: 'ECMAScript 명세 — ECMAScript Function Objects',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-function-objects',
    },
    {
      label: 'MDN — typeof',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/typeof',
    },
    {
      label: 'MDN — JavaScript의 타입과 자료구조',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Data_structures',
    },
    { label: 'MDN — 원시 값', url: 'https://developer.mozilla.org/ko/docs/Glossary/Primitive' },
    {
      label: 'MDN — ReferenceError: "x" is not defined',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Errors/Not_defined',
    },
    {
      label: 'MDN — 연산자 우선순위',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Operator_precedence',
    },
    {
      label: 'MDN — Symbol',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Symbol',
    },
    {
      label: 'MDN — BigInt',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/BigInt',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
