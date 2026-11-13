import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'expressions-statements',
  title: '표현식과 문: var x = 1은 왜 값이 될 수 없을까',
  summary:
    '표현식은 평가해서 값을 얻는 코드이고 문은 실행의 단위입니다. 표현식 자리, 식 문, 문 맨 앞의 중괄호가 블록으로 읽히는 이유, 완료 값을 정리합니다.',
  category: 'fundamentals',
  order: 5,
  tags: ['표현식', '식', '문', '리터럴', '값', '식 문', '블록', '레이블', '완료 값'],
  goals: [
    '표현식과 문을 구분하고, 표현식 자리에 var 선언문이나 if 문이 올 수 없는 이유를 문법으로 설명할 수 있다.',
    '식 문은 식의 값을 변수에 저장하지 않으므로, 할당 같은 부수 효과가 없으면 변수가 바뀌지 않는다는 것을 예제의 출력으로 예측할 수 있다.',
    '문 맨 앞의 중괄호는 블록으로 읽히고, 괄호로 감싸거나 초기값 자리에 쓰면 객체 리터럴로 읽힌다는 것을 설명할 수 있다.',
    '명세가 정한 완료 값의 규칙(값을 남기지 않는 문, 마지막으로 값을 남긴 문의 값)을 설명할 수 있다.',
  ],
  prerequisites: [{ label: '변수 선언과 할당', slug: 'variable-declaration' }],
  related: [
    'increment-decrement',
    'iife-module-pattern',
    'switch-break-continue',
    'global-object',
    'block-scope',
    'error-handling',
    'this-binding',
    'es-modules',
  ],
  examples: [
    {
      id: 'expression-statement',
      file: 'expression-statement.js',
      runtime: 'ecmascript',
      expectedOutput: ['0', '1'],
    },
    {
      id: 'statement-brace',
      file: 'statement-brace.js',
      runtime: 'ecmascript',
      expectedOutput: ['outer', 'block'],
    },
  ],
  simplifications: [
    '클래식 스크립트의 맨 바깥 코드를 기준으로 설명합니다. 모듈은 ES 모듈 개념에서 다룹니다.',
    '완료(Completion Record)는 명세가 동작을 설명하려고 쓰는 장치이고, 엔진이 이런 레코드를 실제로 만든다는 뜻이 아닙니다. 정상이 아닌 완료(abrupt completion)는 에러 처리 개념과 switch와 break·continue 개념에서 다룹니다.',
    '완료 값 규칙은 이 페이지가 든 문(식 문, var 선언문, 블록, 빈 문, if 문, 함수 선언, let·const·class 선언)만 다룹니다. 반복문, switch, try, with 등의 규칙은 다루지 않습니다.',
    'eval은 완료 값이 드러나는 곳으로만 언급하고 예제로 쓰지 않습니다. 전역 객체 개념에서 다룹니다. 개발자 도구 콘솔이나 REPL이 보여 주는 값은 호스트 동작이라 다루지 않습니다.',
    '일부 표현식의 평가 결과는 값이 아니라 참조(Reference)이고, 값은 그 참조에서 읽습니다. this 바인딩 개념에서 다룹니다.',
    '명세의 리터럴은 null, 불리언, 숫자, 문자열 네 가지입니다. 템플릿 리터럴과 정규식 리터럴은 다루지 않습니다.',
    '예제 2의 { a: 1 }은 } 앞에서 세미콜론이 자동으로 들어가 { a: 1; }처럼 처리됩니다. 세미콜론 자동 삽입은 즉시 실행 함수와 모듈 패턴 개념의 ( 사례만 다루고, 나머지는 별도 개념으로 다룹니다.',
    'if 문, 반복문, 레이블, 함수 선언, let·const·class 선언은 문법 예로만 씁니다. if 문은 별도 개념이고, 반복문은 switch와 break·continue 개념에서 다루며, 레이블은 switch와 break·continue 개념, function으로 시작하는 식 문의 제한은 즉시 실행 함수와 모듈 패턴 개념에서 다룹니다. 할당 식의 값은 증감 연산자 개념, undefined는 전역 객체 개념, 블록은 블록 스코프 개념에서 다룹니다.',
    '명세는 함수·let·const·class 선언을 문(Statement)과 구분해 선언(Declaration)이라 부르고, 둘을 묶어 StatementListItem이라 합니다. 이 페이지는 둘을 함께 문이라고 부릅니다.',
    '연산자 우선순위와 쉼표 연산자, 자리마다 허용하는 표현식의 종류(문법 이름)는 다루지 않습니다. 인수 자리의 전개 문법(...)도 다루지 않습니다.',
    '예제의 console.log는 값을 출력하는 호스트 API이며 ECMAScript 언어의 일부가 아닙니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Expression Statement',
      url: 'https://tc39.es/ecma262/#sec-expression-statement',
    },
    {
      label: 'ECMAScript 명세 — Block',
      url: 'https://tc39.es/ecma262/#sec-block',
    },
    {
      label: 'ECMAScript 명세 — The if Statement',
      url: 'https://tc39.es/ecma262/#sec-if-statement',
    },
    {
      label: 'ECMAScript 명세 — Literals (Primary Expression)',
      url: 'https://tc39.es/ecma262/#sec-primary-expression-literals',
    },
    {
      label: 'ECMAScript 명세 — UpdateEmpty',
      url: 'https://tc39.es/ecma262/#sec-updateempty',
    },
    {
      label: 'ECMAScript 명세 — The Completion Record Specification Type',
      url: 'https://tc39.es/ecma262/#sec-completion-record-specification-type',
    },
    {
      label: 'MDN — 표현식과 연산자',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Expressions_and_operators',
    },
    {
      label: 'MDN — eval()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/eval',
    },
    {
      label: 'MDN — 문 (Statements and declarations)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements',
    },
  ],
  reviewedAt: '2026-11-13',
} satisfies ConceptMeta
