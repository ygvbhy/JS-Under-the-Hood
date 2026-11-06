import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'default-parameters',
  title: '매개변수 기본값: 기본값 안의 함수는 왜 본문의 var를 보지 못할까',
  summary:
    '기본값 식은 함수를 만들 때가 아니라 호출할 때, 값이 undefined인 매개변수에서만 왼쪽부터 평가됩니다. 매개변수 목록에 식이 있으면 본문 var는 따로 놓입니다.',
  category: 'execution',
  order: 255,
  tags: [
    '기본 매개변수',
    'default parameter',
    'default parameters',
    'FunctionDeclarationInstantiation',
    'arguments',
    '클로저',
    'length',
    'TDZ',
    'use strict',
  ],
  goals: [
    '기본값 식이 함수를 만들 때가 아니라 호출할 때, 값이 undefined인 매개변수에서만 왼쪽부터 평가된다는 것을 설명할 수 있다.',
    '앞 매개변수는 읽을 수 있고, 평가 시점에 아직 초기화되지 않은 뒤 매개변수나 자기 자신을 읽으면 ReferenceError라는 것을 예측할 수 있다.',
    '매개변수 목록에 식이 있을 때 본문 var 레코드가 따로 만들어지는 것을 근거로, 기본값 안의 함수가 본문의 var를 보지 못하는 까닭을 설명할 수 있다.',
    '매개변수 목록에 식이 있을 때, 매개변수와 같은 이름의 var가 매개변수 값으로 시작하는 별도 바인딩이라는 것을 설명하고, 재할당 뒤의 결과를 예측할 수 있다.',
    '매개변수 목록이 단순하지 않을 때 arguments 연결이 끊기고 함수 안의 use strict가 SyntaxError라는 것을, 식이 있는 경우와 구분해 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '함수 호출', slug: 'function-calls' },
    { label: 'TDZ', slug: 'tdz' },
    { label: '클로저', slug: 'closure' },
    { label: '화살표 함수', slug: 'arrow-functions' },
  ],
  related: ['spread-destructuring', 'generator', 'for-let'],
  examples: [
    {
      id: 'fresh-each-call',
      file: 'fresh-each-call.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 1 false', '2'],
    },
    {
      id: 'only-when-needed',
      file: 'only-when-needed.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 2 100 null 3', '3'],
    },
    {
      id: 'eval-order',
      file: 'eval-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['인수 a', 'b 기본값', 'c 기본값', '본문 시작'],
    },
    {
      id: 'left-to-right',
      file: 'left-to-right.js',
      runtime: 'ecmascript',
      expectedOutput: ['3 3 9', '3 4 12', '3 3 0'],
    },
    {
      id: 'parameter-tdz',
      file: 'parameter-tdz.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', 'ReferenceError', '5 6'],
    },
    {
      id: 'function-length',
      file: 'function-length.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 1 0', '1 1'],
    },
    {
      id: 'param-scope',
      file: 'param-scope.js',
      runtime: 'ecmascript',
      expectedOutput: ['outer body'],
    },
    {
      id: 'same-name-var',
      file: 'same-name-var.js',
      runtime: 'ecmascript',
      expectedOutput: ['arg', 'body arg'],
    },
    {
      id: 'no-body-var',
      file: 'no-body-var.js',
      runtime: 'ecmascript',
      expectedOutput: ['body body'],
    },
    {
      id: 'arguments-link',
      file: 'arguments-link.js',
      runtime: 'ecmascript',
      expectedOutput: ['2 0', '0 1 2'],
    },
    {
      id: 'use-strict-body',
      file: 'use-strict-body.js',
      runtime: 'ecmascript',
      expectedOutput: ['ok', 'SyntaxError', 'ok'],
    },
    {
      id: 'required-argument',
      file: 'required-argument.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError name 인수가 필요합니다', 'hi kim', 'hi null'],
    },
  ],
  simplifications: [
    '시뮬레이터는 전역 레코드, 매개변수 레코드, 본문 var 레코드만 그립니다. 명세는 sloppy mode 함수에서 매개변수 목록에 식이 있으면 이름 바인딩이 없는 함수 환경 레코드, 매개변수 레코드, 본문 var 레코드, let·const용 렉시컬 레코드의 네 개를 만들고 strict mode 함수는 두 개를 만듭니다. 함수 환경 레코드와 렉시컬 레코드는 그리지 않고, 본문을 실행하는 동안의 LexicalEnvironment도 렉시컬 레코드 대신 본문 var 레코드로 표시합니다.',
    '시뮬레이터의 매개변수 레코드는 arguments 바인딩을 그리지 않습니다. 명세는 매개변수를 초기화하기 전에 이 레코드에 arguments를 만듭니다.',
    '시뮬레이터는 get() 호출이 만드는 환경 레코드와 호출마다 만들어지는 실행 컨텍스트 스택을 그리지 않습니다.',
    '예제의 try…catch와 throw, new Function은 오류를 보이려는 용도입니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
    '매개변수 목록의 계산된 키 패턴과 디스트럭처링 매개변수는 다루지 않습니다. 계산된 키는 초기화식이 없어도 식이 있는 것으로 치지만 패턴은 스프레드와 디스트럭처링 개념에서 다룹니다.',
    '직접 eval이 매개변수 목록에서 만드는 바인딩과, 이름이 중복된 매개변수 목록의 arguments 매핑은 다루지 않습니다.',
    '본문에 매개변수와 같은 이름의 함수 선언이 있는 경우는 다루지 않습니다. 이때 var 레코드의 초기화 규칙이 다릅니다. 본문의 var arguments도 다루지 않습니다(arguments 값으로 시작합니다).',
    '시뮬레이터의 바인딩 값은 문자열 표시입니다. 값의 타입을 구분해 그리지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — Static Semantics: ContainsExpression',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-containsexpression',
    },
    {
      label: 'ECMAScript 명세 — Static Semantics: IsSimpleParameterList',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-issimpleparameterlist',
    },
    {
      label: 'ECMAScript 명세 — Static Semantics: ExpectedArgumentCount',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-expectedargumentcount',
    },
    {
      label: 'ECMAScript 명세 — Function Definitions Static Semantics: Early Errors',
      url: 'https://tc39.es/ecma262/#sec-function-definitions-static-semantics-early-errors',
    },
    {
      label: 'MDN — 기본 매개변수',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/Default_parameters',
    },
  ],
  reviewedAt: '2026-11-06',
} satisfies ConceptMeta
