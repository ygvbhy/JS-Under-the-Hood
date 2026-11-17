import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'arguments-object',
  title: 'arguments 객체: 매개변수를 바꿨는데 arguments[0]은 왜 같이 바뀔까',
  summary:
    'sloppy mode 함수에서는 매개변수를 바꾸면 arguments[0]에서도 바뀐 값이 읽힙니다. 연결이 생기는 조건과 범위, 끊기는 경우, strict mode와의 차이를 예제로 확인합니다.',
  category: 'execution',
  order: 165,
  tags: [
    'arguments',
    'arguments 객체',
    '매개변수',
    'mapped arguments',
    'callee',
    'sloppy mode',
    '유사 배열',
  ],
  goals: [
    'sloppy mode 함수에서 매개변수를 바꾸면 arguments[0]에서 바뀐 값이 읽히고 반대도 성립하는 원인을 arguments 이그조틱 객체의 [[Get]]·[[Set]] 동작으로 설명할 수 있다.',
    '연결되는 인덱스의 범위(호출 때 넘긴 인수의 개수와 매개변수의 개수보다 작은 인덱스)를 말하고, 넘기지 않은 인수나 매개변수보다 많이 넘긴 인수는 연결되지 않는다는 것을 예제의 출력으로 예측할 수 있다.',
    'strict mode 함수나 매개변수 목록이 단순하지 않은 함수에는 연결이 없고, delete나 Object.defineProperty로 연결이 끊기는 경우를 구분해 출력을 예측할 수 있다.',
    '매핑된 arguments의 callee는 함수 자신을 값으로 갖는 데이터 프로퍼티이고, 매핑되지 않은 arguments의 callee는 읽으면 TypeError를 던지는 접근자 프로퍼티라는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '함수 호출', slug: 'function-calls' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: [
    'function-calls',
    'property-attributes',
    'strict-mode',
    'arrow-functions',
    'default-parameters',
    'spread-destructuring',
    'error-handling',
  ],
  examples: [
    { id: 'two-way', file: 'two-way.js', runtime: 'ecmascript', expectedOutput: ['2 9'] },
    {
      id: 'not-passed',
      file: 'not-passed.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 3 undefined false', '5'],
    },
    { id: 'unlink', file: 'unlink.js', runtime: 'ecmascript', expectedOutput: ['2 2 9', '3 2'] },
    { id: 'unmapped', file: 'unmapped.js', runtime: 'ecmascript', expectedOutput: ['2 9', '1 2'] },
    {
      id: 'callee',
      file: 'callee.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'TypeError'],
    },
    {
      id: 'no-arguments-object',
      file: 'no-arguments-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['number', 'function'],
    },
  ],
  simplifications: [
    '이 페이지의 예제는 모듈이 아닌 스크립트(Script)로 실행한 결과이고(Node의 vm 모듈로 실행) 지시어가 없어 sloppy mode입니다. 여섯 예제 모두 파일 첫 줄에 지시어를 붙여 strict mode로 실행하면 출력이 달라지거나 오류가 납니다. 모듈은 항상 strict이므로 같은 함수를 모듈에서 실행하면 매개변수와 arguments가 연결되지 않습니다. 모듈은 ES 모듈 개념에서 다루며 이 페이지의 예제에는 쓰지 않습니다.',
    'arguments의 기본 성질(배열이 아니라는 것, length, 화살표 함수에는 arguments가 없다는 것)은 화살표 함수와 메서드 축약 개념에서 다룹니다. arguments를 배열로 바꾸는 방법은 다루지 않습니다.',
    '시뮬레이터는 매개변수 바인딩과 arguments의 인덱스 프로퍼티만 그립니다. length·callee·Symbol.iterator 프로퍼티, 함수 안의 다른 변수(before, fromParam 등), 환경 레코드의 다른 바인딩은 그리지 않습니다.',
    '시뮬레이터에서 연결된 프로퍼티 칸의 값은 그 프로퍼티를 읽었을 때 나오는 값입니다. 값을 두 곳에 저장해 두고 맞춘다는 뜻이 아닙니다.',
    '이 페이지는 sloppy mode와 strict mode, 매개변수 기본값과 rest 파라미터, 디스트럭처링 패턴을 조건으로만 언급합니다. strict mode 개념, 매개변수 기본값 개념, 화살표 함수와 메서드 축약 개념(rest 파라미터), 스프레드와 디스트럭처링 개념에서 각각 다룹니다. 조건 표의 코드는 이 문법을 쓰지만 예제와 퀴즈에는 쓰지 않습니다.',
    '매개변수 목록에 식이 없을 때, 본문 맨 바깥의 함수 선언과 let·const 선언의 이름이 arguments이면 arguments 객체가 만들어지지 않는 규칙만 다룹니다. 예제가 보이는 것은 그 이름이 arguments 객체를 가리키지 않는다는 것이고, 만들지 않는다는 것은 명세 알고리즘(FunctionDeclarationInstantiation)이 정한 내용입니다. 매개변수 목록에 식이 있는 경우의 세부와 본문의 var arguments는 다루지 않습니다. 클래스 선언은 이름이 arguments이면 SyntaxError입니다(클래스 코드는 항상 strict).',
    '이름이 중복된 매개변수(function f(a, a))의 매핑, 함수 밖의 arguments, arguments.length 대입, arguments의 Symbol.iterator 프로퍼티, arguments.caller, arguments 바인딩 자체를 재할당하는 경우는 다루지 않습니다.',
    '매핑되지 않은 arguments의 callee에 값을 쓰는 동작은 다루지 않습니다. 이 페이지는 읽으면 TypeError인 것까지만 주장합니다.',
    'Object.freeze로 얼리면 연결이 끊기고 Object.seal로 봉인하면 연결이 유지되는 동작, 상속받은 다른 객체가 인덱스 프로퍼티에 값을 대입하는 경우([[Set]]의 receiver 조건)는 다루지 않습니다.',
    '제너레이터, async 함수, 메서드의 arguments도 같은 규칙을 따르지만 따로 다루지 않습니다. 클래스의 모든 부분은 항상 strict이므로 클래스 안의 함수에는 연결이 없습니다. 클래스 필드 초기화, static 블록, eval 코드의 arguments는 다루지 않습니다.',
    '명세는 매개변수와의 대응을 ParameterMap이라는 장치로 설명하지만, 이는 설명을 위한 서술 장치이고 엔진이 실제로 이런 객체를 만들어야 하는 것은 아닙니다. 이 페이지는 읽을 때 매개변수 바인딩의 값을 돌려주고 쓸 때 매개변수 바인딩에도 쓰는 관찰 가능한 동작으로만 설명합니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
    '예제의 console.log는 값을 출력하는 호스트 API이며 ECMAScript 언어의 일부가 아닙니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Arguments Exotic Objects',
      url: 'https://tc39.es/ecma262/#sec-arguments-exotic-objects',
    },
    {
      label: 'ECMAScript 명세 — CreateMappedArgumentsObject',
      url: 'https://tc39.es/ecma262/#sec-createmappedargumentsobject',
    },
    {
      label: 'ECMAScript 명세 — CreateUnmappedArgumentsObject',
      url: 'https://tc39.es/ecma262/#sec-createunmappedargumentsobject',
    },
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — IsSimpleParameterList',
      url: 'https://tc39.es/ecma262/#sec-static-semantics-issimpleparameterlist',
    },
    {
      label: 'MDN — arguments',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions/arguments',
    },
  ],
  reviewedAt: '2026-11-17',
} satisfies ConceptMeta
