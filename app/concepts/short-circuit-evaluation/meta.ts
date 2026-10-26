import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'short-circuit-evaluation',
  title: '단축 평가: &&, ||, ??, ?.는 어디서 평가를 멈추나',
  summary:
    '&&, ||, ??는 왼쪽 값을 보고 오른쪽을 평가할지 정하고 피연산자의 값을 그대로 돌려줍니다. ?.는 왼쪽이 null이나 undefined면 나머지를 평가하지 않고 undefined를 돌려줍니다.',
  category: 'fundamentals',
  tags: [
    '단축 평가',
    'short-circuit',
    '논리 연산자',
    '&&',
    '||',
    'null 병합 연산자',
    '??',
    '옵셔널 체이닝',
    '?.',
    'truthy',
    'falsy',
    '기본값',
  ],
  goals: [
    'falsy 값 8가지를 말하고 truthy/falsy로 조건을 판단할 수 있다.',
    '&&와 ||의 결과가 어느 피연산자의 값인지 예측할 수 있다.',
    '오른쪽 피연산자가 평가되지 않는 경우를 찾을 수 있다.',
    '||와 ??가 0과 빈 문자열에서 다르게 동작하는 이유를 설명할 수 있다.',
    '?.가 null이나 undefined를 만나면 체인의 나머지를 평가하지 않고 undefined를 돌려준다는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '데이터 타입' },
    { label: '논리 연산자' },
    { label: '함수 호출' },
    { label: '객체 리터럴과 프로퍼티 접근' },
  ],
  related: [],
  examples: [
    {
      id: 'truthy-falsy',
      file: 'truthy-falsy.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'false false false false false false false false',
        'true true true true true',
      ],
    },
    {
      id: 'logical-result',
      file: 'logical-result.js',
      runtime: 'ecmascript',
      expectedOutput: ['hello hi 0 hello'],
    },
    {
      id: 'skip-right',
      file: 'skip-right.js',
      runtime: 'ecmascript',
      expectedOutput: ['평가: A', '0', '평가: C', 'ok', '평가: E', '평가: F', '2'],
    },
    {
      id: 'nullish',
      file: 'nullish.js',
      runtime: 'ecmascript',
      expectedOutput: ['10 0', '"제목 없음" ""', '메모 없음'],
    },
    {
      id: 'optional-chaining',
      file: 'optional-chaining.js',
      runtime: 'ecmascript',
      expectedOutput: ['30', 'undefined', '나이 정보 없음'],
    },
  ],
  simplifications: [
    '시각화는 식을 ‘조각’(피연산자, ?. 체인의 각 접근) 단위로 보여 줍니다. 명세의 평가 단계(참조 평가, GetValue 등)는 묶어서 표시합니다.',
    '시뮬레이터의 ‘평가함’, ‘평가 안 함’, ‘아직 평가 전’ 표시는 교육용 이름이며 명세 용어가 아닙니다.',
    '변수는 선언문이 실행된 뒤에만 표시합니다. 함수 선언으로 만들어지는 check와 함수 객체, 함수 호출 내부(매개변수, 본문 실행)는 표시하지 않고 호출 하나를 한 단계로 묶습니다. 호이스팅과 실행 컨텍스트는 별도 개념에서 다룹니다.',
    '이 페이지의 값 표시({ profile: {…} } 등)는 내용을 줄여 쓴 것입니다.',
    'ToBoolean에는 브라우저 호스트의 document.all(명세 부록 B의 [[IsHTMLDDA]])만 falsy로 다루는 예외가 있지만 이 페이지에서는 다루지 않습니다.',
    'console.log는 호스트 API이며, 문자열을 따옴표 없이 출력하는 것은 호스트의 출력 형식입니다. 시각화의 값 표시에서는 문자열에 큰따옴표를 붙입니다.',
    '변수 열에는 이 코드가 선언한 변수만 표시합니다. console, JSON 같은 내장 값은 표시하지 않습니다.',
    '명세는 ?.를 연산자가 아니라 OptionalChain 문법으로 정의하지만, 이 페이지는 편의상 네 가지를 함께 ‘연산자’라고 부릅니다. ?.[]와 ?.(), 괄호로 체인이 끊기는 경우((a?.b).c)는 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Binary Logical Operators: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — ToBoolean',
      url: 'https://tc39.es/ecma262/#sec-toboolean',
    },
    {
      label: 'ECMAScript 명세 — Optional Chains',
      url: 'https://tc39.es/ecma262/#sec-optional-chains',
    },
    {
      label: 'ECMAScript 명세 — Optional Chaining: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-optional-chaining-evaluation',
    },
    {
      label: 'ECMAScript 명세 — ChainEvaluation',
      url: 'https://tc39.es/ecma262/#sec-optional-chaining-chain-evaluation',
    },
    {
      label: 'MDN — 논리 AND (&&)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Logical_AND',
    },
    {
      label: 'MDN — 논리 OR (||)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Logical_OR',
    },
    {
      label: 'MDN — 널 병합 연산자 (??)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing',
    },
    {
      label: 'MDN — 옵셔널 체이닝 (?.)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Optional_chaining',
    },
    {
      label: 'MDN — Falsy',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Falsy',
    },
    {
      label: 'MDN — Truthy',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Truthy',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
