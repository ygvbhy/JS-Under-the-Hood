import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'
const MDN = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/'

export const concept = {
  slug: 'switch-let',
  title: 'switch와 let: case마다 let x를 쓰면 왜 SyntaxError일까',
  summary:
    'switch의 case들은 블록 하나를 함께 쓰므로 두 case에서 같은 이름을 let으로 선언하면 SyntaxError이고, 선언한 case를 건너뛰고 다른 case에서 그 이름을 쓰면 ReferenceError입니다. 같은 이름 선언은 case마다 중괄호로 블록을 나눠 피합니다.',
  category: 'execution',
  order: 145,
  tags: [
    'switch',
    'case',
    'default',
    'let',
    'const',
    'class',
    'var',
    '함수 선언',
    'SyntaxError',
    'ReferenceError',
    'TDZ',
    '블록 스코프',
    'CaseBlock',
    'BlockDeclarationInstantiation',
    'early error',
    '중괄호',
    'fall-through',
    'lexical declaration in case block',
  ],
  goals: [
    'switch의 모든 case(default 포함)가 블록 하나를 함께 쓰므로, 두 case에서 같은 이름을 let·const·class로 선언하면 코드를 실행하기 전에 SyntaxError가 난다는 것을 설명할 수 있다.',
    '선언한 case를 건너뛰고 다른 case에서 그 이름을 읽거나 대입하면 ReferenceError이고, fall-through로 선언문을 지나왔다면 읽을 수 있다는 것을 예측할 수 있다.',
    'case마다 중괄호로 블록을 나누면 같은 이름을 선언할 수 있지만 다른 case에서는 그 이름이 보이지 않고 fall-through는 그대로라는 것을 설명할 수 있다.',
    'var끼리는 허용되고 let과 같은 이름의 var는 SyntaxError이며, 함수 선언은 블록에 들어갈 때 바로 함수가 되고 같은 이름 중복은 웹 호환 규칙에서 sloppy mode일 때만 허용된다는 것을 구분할 수 있다.',
    'switch 머리의 식은 블록 밖에서, case의 식은 블록 안에서 평가된다는 것을 예측할 수 있다.',
  ],
  prerequisites: [
    { label: 'switch와 break·continue', slug: 'switch-break-continue' },
    { label: '블록 스코프', slug: 'block-scope' },
    { label: 'TDZ', slug: 'tdz' },
    { label: '호이스팅', slug: 'hoisting' },
    { label: 'typeof 연산자', slug: 'typeof-operator' },
    { label: '함수를 정의하는 방법', slug: 'function-definitions' },
    { label: '함수 호출', slug: 'function-calls' },
  ],
  related: [
    'strict-mode',
    'iife-module-pattern',
    'error-handling',
    'new-operator',
    'class-basics',
    'execution-context',
    'es-modules',
  ],
  examples: [
    {
      id: 'same-name',
      file: 'same-name.js',
      runtime: 'ecmascript',
      expectedOutput: ['SyntaxError', 'ok', 'ok', 'SyntaxError'],
    },
    {
      id: 'skipped-case',
      file: 'skipped-case.js',
      runtime: 'ecmascript',
      expectedOutput: ['low', 'ReferenceError', 'none'],
    },
    {
      id: 'fall-through',
      file: 'fall-through.js',
      runtime: 'ecmascript',
      expectedOutput: ['A', 'ReferenceError'],
    },
    {
      id: 'braces',
      file: 'braces.js',
      runtime: 'ecmascript',
      expectedOutput: ['zero', 'one', 'one', 'outer'],
    },
    {
      id: 'declaration-kinds',
      file: 'declaration-kinds.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'class SyntaxError',
        'let-class SyntaxError',
        'let-var SyntaxError',
        'var-var ok',
        'function ok',
        'strict-function SyntaxError',
      ],
    },
    {
      id: 'function-in-case',
      file: 'function-in-case.js',
      runtime: 'ecmascript',
      expectedOutput: ['function', 'true', 'false'],
    },
    {
      id: 'head-and-case',
      file: 'head-and-case.js',
      runtime: 'ecmascript',
      expectedOutput: ['v', 'ReferenceError'],
    },
  ],
  simplifications: [
    "예제는 Node vm에서 strict mode가 아닌 스크립트로 실행했고 console은 ECMAScript가 아니라 호스트가 제공하는 API입니다. 예제 6의 출력과 예제 5의 function 줄은 웹 호환 규칙을 지원하는 호스트(Node 포함)에서만 이렇게 나오고, 그 규칙을 지원하지 않는 호스트에서는 예제 6의 둘째·셋째 줄이 ReferenceError, 예제 5의 function 줄이 SyntaxError입니다. 파일이 sloppy mode인지에 기대는 것은 예제 6뿐이며, strict mode와 ES 모듈(항상 strict이고 ES 모듈 개념에서 다룹니다)에서도 예제 6의 둘째·셋째 줄이 ReferenceError입니다. 나머지 예제는 파일 첫 줄에 'use strict';를 붙여도 출력이 같습니다. 예제 1과 5의 코드 문자열은 Function 생성자 본문의 지시어로만 strict 여부가 정해지므로 파일과 무관하게 예제 5의 strict-function 줄만 strict입니다(strict mode 개념에서 다룹니다).",
    '예제 1과 5는 함수를 정의하는 방법 개념에서 다룬 Function 생성자를 문법 검사 도구로만 씁니다. new는 new 연산자 개념에서 다룹니다. 문자열은 스크립트가 아니라 함수 본문으로 파싱되지만 switch 문의 문법 규칙은 같고, 본문의 n은 컴파일만 하므로 선언하지 않았습니다. 실제 스크립트에서는 이 SyntaxError 때문에 스크립트의 어떤 줄도 실행되지 않습니다(블록 스코프 개념에서 다룹니다).',
    'try…catch와 e.name은 오류 종류를 보이려는 용도로만 씁니다(try/catch/finally 개념에서 다룹니다). 오류 메시지 문구는 엔진마다 달라 인용하지 않습니다.',
    '명세의 BlockDeclarationInstantiation과 선언적 환경 레코드를 "switch에 들어갈 때 블록 하나에 이름을 만든다"로 줄여 말합니다(환경 레코드는 실행 컨텍스트 개념에서 다룹니다).',
    '함수 선언의 sloppy mode 중복 허용과 감싼 함수의 바깥 바인딩은 명세의 웹 호환 규칙(부록 B, Normative Optional)으로, 웹 브라우저 호스트에서는 필수이고 다른 호스트에서는 선택입니다. 예제는 Node 결과입니다. 바깥 바인딩은 선언이 하나인 경우만 보이며, 같은 이름 함수 선언이 중복될 때와 같은 이름의 매개변수·let·var가 있을 때(var가 있으면 새 바인딩을 만들지 않습니다), 이름이 arguments일 때, 전역 코드의 switch는 다루지 않습니다. 블록 안 함수 선언 일반은 즉시 실행 함수와 모듈 패턴 개념에서 다룹니다.',
    'class 선언은 클래스 개념에서 다루고 여기서는 이름이 같은 블록에 만들어진다는 점만 씁니다. 제너레이터·async 함수 선언은 다루지 않습니다. using·await using 선언도 다루지 않는데, 이 둘은 이름 중복과 무관하게 case·default 절에 바로 쓰는 것 자체가 SyntaxError여서 중괄호 블록 안에 써야 합니다.',
    'switch 문의 완료 값은 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Switch Statement Static Semantics: Early Errors',
      url: `${SPEC}sec-switch-statement-static-semantics-early-errors`,
    },
    {
      label: 'ECMAScript 명세 — Switch Statement Runtime Semantics: Evaluation',
      url: `${SPEC}sec-switch-statement-runtime-semantics-evaluation`,
    },
    {
      label: 'ECMAScript 명세 — BlockDeclarationInstantiation',
      url: `${SPEC}sec-blockdeclarationinstantiation`,
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: CaseBlockEvaluation',
      url: `${SPEC}sec-runtime-semantics-caseblockevaluation`,
    },
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation',
      url: `${SPEC}sec-functiondeclarationinstantiation`,
    },
    {
      label:
        'ECMAScript 명세 — Block-Level Function Declarations Web Legacy Compatibility Semantics',
      url: `${SPEC}sec-block-level-function-declarations-web-legacy-compatibility-semantics`,
    },
    { label: 'MDN — switch', url: `${MDN}switch` },
    { label: 'MDN — let', url: `${MDN}let` },
  ],
  reviewedAt: '2026-11-26',
} satisfies ConceptMeta
