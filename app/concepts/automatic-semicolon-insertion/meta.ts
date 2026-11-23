import type { ConceptMeta } from '~/lib/concepts'

const SPEC = 'https://tc39.es/ecma262/#'

export const concept = {
  slug: 'automatic-semicolon-insertion',
  title: '세미콜론 자동 삽입: return 다음 줄의 값은 왜 반환되지 않을까',
  summary:
    '세미콜론은 줄바꿈마다 들어가지 않습니다. 줄바꿈 뒤 토큰이나 }가 문법에 맞지 않을 때, return·후위 ++처럼 줄바꿈을 금지한 자리에 줄바꿈이 있을 때 들어갑니다. 그래서 return 다음 줄 값은 반환되지 않고, 다음 줄 [나 -가 앞 줄 식에 이어 붙을 수 있으면 이어집니다.',
  category: 'fundamentals',
  order: 105,
  tags: [
    '세미콜론 자동 삽입',
    '자동 세미콜론 삽입',
    'ASI',
    'automatic semicolon insertion',
    '세미콜론',
    '줄바꿈',
    '제한된 생성 규칙',
    'restricted production',
  ],
  goals: [
    '세미콜론은 줄바꿈마다 들어가지 않고, 다음 토큰이 어떤 문법 규칙에도 맞지 않을 때 그 토큰 앞에 줄바꿈이 있거나, 그 토큰이 닫는 중괄호이거나, do-while 문 끝의 닫는 괄호 바로 뒤이면 들어가며, 입력이 끝났는데 전체를 하나로 읽을 수 없을 때도 들어간다는 것을 명세의 규칙으로 설명할 수 있다.',
    'return·break·continue 바로 뒤와 후위 ++·-- 바로 앞처럼 줄바꿈을 금지한 자리가 있는 문법 규칙(제한된 생성 규칙)에서는, 줄바꿈 뒤의 토큰이 문법에 맞아도 세미콜론이 들어간다는 것으로 결과를 예측할 수 있다.',
    '식으로 끝난 줄 다음 줄이 대괄호, 여는 괄호, 빼기 기호로 시작하고 그 토큰이 앞 줄 끝의 식에 이어 붙을 수 있으면, 앞 줄에 이어 읽혀 프로퍼티 접근, 호출, 이항 연산이 된다는 것을 예측할 수 있다.',
    '빈 문이 되거나 for 문 머리의 세미콜론이 되는 자리에는 세미콜론이 들어가지 않는다는 예외를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '표현식과 문', slug: 'expressions-statements' },
    { label: '증감 연산자', slug: 'increment-decrement' },
    { label: 'switch와 break·continue', slug: 'switch-break-continue' },
    { label: '프로퍼티 키', slug: 'property-keys' },
    { label: '함수 호출', slug: 'function-calls' },
  ],
  related: [
    'expressions-statements',
    'iife-module-pattern',
    'tagged-templates',
    'increment-decrement',
    'switch-break-continue',
    'function-calls',
    'property-keys',
    'error-handling',
    'array-higher-order-functions',
    'spread-destructuring',
  ],
  examples: [
    {
      id: 'return-newline',
      file: 'return-newline.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined 3'],
    },
    {
      id: 'next-line-continues',
      file: 'next-line-continues.js',
      runtime: 'ecmascript',
      expectedOutput: ['number 7'],
    },
    {
      id: 'postfix-newline',
      file: 'postfix-newline.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 1 2'],
    },
    {
      id: 'break-label',
      file: 'break-label.js',
      runtime: 'ecmascript',
      expectedOutput: ['[00][10]'],
    },
  ],
  simplifications: [
    "예제는 sloppy mode 스크립트이고 첫 줄에 'use strict';를 붙여도 출력이 같습니다. console은 ECMAScript가 아니라 호스트가 제공하는 API입니다.",
    '명세는 이 동작을 토큰 흐름에 세미콜론이 삽입된다고 말하는 방식으로 기술합니다. 이 페이지의 "세미콜론이 들어간다"는 그 표현을 옮긴 것입니다. 명세는 소스 텍스트 자체를 바꾸는 절차를 정의하지 않습니다.',
    '제한된 생성 규칙 중 이 페이지가 예로 드는 것은 return·break·continue와 후위 ++·--이고, throw는 결과(SyntaxError)만 보입니다. yield, 화살표 함수의 =>, async 함수·메서드·화살표 함수, 현재 명세 초안의 using 선언에도 줄바꿈을 허용하지 않는 자리가 있지만 다루지 않습니다. 다음 줄이 정규식 리터럴로 시작하는 경우도 다루지 않습니다.',
    '예제 2의 대괄호 사례는 결과를 보이려고 객체의 프로퍼티를 읽습니다. 다음 줄이 배열 리터럴로 시작하는 실제 코드(배열 메서드 호출, 디스트럭처링)는 배열 고차 함수 개념과 스프레드와 디스트럭처링 개념의 문법이라 예로 쓰지 않습니다.',
    'throw는 try/catch/finally 개념에서, 다음 줄이 템플릿 리터럴로 시작하는 사례는 태그드 템플릿 개념에서, 여는 괄호로 시작하는 사례는 즉시 실행 함수와 모듈 패턴 개념에서 다룹니다.',
    '레이블은 switch와 break·continue 개념에서 다룹니다. 레이블은 변수 바인딩을 만들지 않으므로, 예제 4의 6번 줄처럼 레이블 이름만 쓴 식 문은 같은 이름의 변수가 없으면 평가될 때 ReferenceError입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Automatic Semicolon Insertion',
      url: `${SPEC}sec-automatic-semicolon-insertion`,
    },
    {
      label: 'ECMAScript 명세 — Rules of Automatic Semicolon Insertion',
      url: `${SPEC}sec-rules-of-automatic-semicolon-insertion`,
    },
    {
      label: 'ECMAScript 명세 — Examples of Automatic Semicolon Insertion',
      url: `${SPEC}sec-examples-of-automatic-semicolon-insertion`,
    },
    {
      label: 'ECMAScript 명세 — Interesting Cases in Statement Lists',
      url: `${SPEC}sec-asi-interesting-cases-in-statement-lists`,
    },
    { label: 'ECMAScript 명세 — The return Statement', url: `${SPEC}sec-return-statement` },
    {
      label: 'MDN — Lexical grammar의 자동 세미콜론 삽입',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#automatic_semicolon_insertion',
    },
  ],
  reviewedAt: '2026-11-23',
} satisfies ConceptMeta
