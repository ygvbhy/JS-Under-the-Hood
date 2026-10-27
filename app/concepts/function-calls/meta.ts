import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'function-calls',
  title: '함수 호출: 인수가 모자라거나 남으면 어떻게 되나',
  summary:
    '함수를 호출하면 인수를 왼쪽부터 모두 평가한 뒤 매개변수에 차례로 넣고 본문을 실행합니다. 모자란 매개변수는 undefined(기본값이 있으면 기본값)가 되고 남는 인수는 매개변수에 들어가지 않으며, return이 없으면 호출 결과는 undefined입니다.',
  category: 'fundamentals',
  tags: [
    '함수',
    '함수 호출',
    '매개변수',
    '인수',
    'return',
    '반환값',
    '매개변수 기본값',
    'undefined',
  ],
  goals: [
    '인수가 모자라거나 남을 때 매개변수의 값을 예측할 수 있다.',
    '매개변수 기본값이 쓰이는 경우(인수 없음·undefined)와 쓰이지 않는 경우(null·0)를 구분할 수 있다.',
    '인수가 본문 실행 전에 왼쪽부터 평가된다는 것으로 출력 순서를 예측할 수 있다.',
    'return이 없거나 값 없는 return;이면 결과가 undefined이고, 반복문·switch 안의 return도 함수 전체를 끝낸다는 것과 f와 f()의 차이를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '함수 선언' },
    { label: '암묵적 타입 변환', slug: 'type-coercion' },
    { label: 'switch와 break·continue', slug: 'switch-break-continue' },
  ],
  related: ['primitives-and-objects', 'short-circuit-evaluation', 'typeof-operator'],
  examples: [
    {
      id: 'arg-count',
      file: 'arg-count.js',
      runtime: 'ecmascript',
      expectedOutput: ['3', 'NaN', '3'],
    },
    {
      id: 'no-return',
      file: 'no-return.js',
      runtime: 'ecmascript',
      expectedOutput: ['안녕, 민지', '계산', 'undefined undefined 5'],
    },
    {
      id: 'eval-order',
      file: 'eval-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['square 2', 'square 3', 'add 시작', '13'],
    },
    {
      id: 'default-param',
      file: 'default-param.js',
      runtime: 'ecmascript',
      expectedOutput: ['사과 3개', '사과 1개', '사과 1개', '사과 null개', '사과 0개'],
    },
    {
      id: 'return-in-loop',
      file: 'return-in-loop.js',
      runtime: 'ecmascript',
      expectedOutput: ['5 아님', '6 아님', '7 아님', '8', '둘 모름'],
    },
    {
      id: 'call-vs-reference',
      file: 'call-vs-reference.js',
      runtime: 'ecmascript',
      expectedOutput: ['function string', 'true 민지'],
    },
  ],
  simplifications: [
    "함수 호출 중의 매개변수는 'add(1, 2) 호출' 영역으로 묶어 표시합니다. 명세의 실행 컨텍스트와 환경 레코드를 단순화한 것이며, 이 페이지의 시나리오는 한 번에 호출 하나만 진행되도록 짰습니다(함수 안에서 다른 함수를 부르는 경우는 별도 개념).",
    '남는 인수는 매개변수에 들어가지 않을 뿐, 함수 안에서 arguments 객체로 읽을 수 있습니다. arguments는 별도 개념이며 시각화에 표시하지 않습니다.',
    '함수 선언으로 만들어지는 변수(add 등)와 함수 객체는 표시하지 않습니다. 함수 선언이 코드 실행 전에 처리되는 과정(호이스팅)은 다음 개념에서 다룹니다.',
    "'인수 평가 중' 패널은 바깥 호출의 인수 목록을 왼쪽부터 채우는 과정을 보여 주는 교육용 표현입니다. console.log도 함수 호출이지만 호스트가 제공하는 함수라 호출 영역으로 그리지 않고, 그 인수를 평가하는 과정도 '인수 평가 중' 패널에 그리지 않습니다(console.log(add(1, 2))에서는 add(1, 2) 호출만 보입니다).",
    '매개변수 기본값이 있는 함수에서 매개변수가 만들어지는 세부 과정(기본값 식이 평가되는 환경 등)은 다루지 않습니다. 기본값 식은 기본값이 필요한 호출마다 평가됩니다.',
    'this, 메서드 호출, 화살표 함수처럼 호출 방식에 따른 차이는 다루지 않습니다.',
    '변수는 선언문이 실행된 뒤에만 표시합니다(TDZ는 별도 개념).',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Function Calls',
      url: 'https://tc39.es/ecma262/#sec-function-calls',
    },
    {
      label: 'ECMAScript 명세 — EvaluateCall',
      url: 'https://tc39.es/ecma262/#sec-evaluatecall',
    },
    {
      label: 'ECMAScript 명세 — ArgumentListEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-argumentlistevaluation',
    },
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — IteratorBindingInitialization',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-iteratorbindinginitialization',
    },
    {
      label: 'ECMAScript 명세 — EvaluateFunctionBody',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-evaluatefunctionbody',
    },
    {
      label: 'ECMAScript 명세 — The return Statement',
      url: 'https://tc39.es/ecma262/#sec-return-statement',
    },
    {
      label: 'MDN — 함수',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions',
    },
    {
      label: 'MDN — 함수 사용하기',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Functions',
    },
    {
      label: 'MDN — return',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/return',
    },
    {
      label: 'MDN — 기본 매개변수',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Default_parameters',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
