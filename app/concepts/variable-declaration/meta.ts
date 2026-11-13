import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'variable-declaration',
  title: '변수 선언과 할당: 선언만 한 변수는 왜 undefined일까',
  summary:
    '변수는 이름과 값의 연결(바인딩)입니다. var 선언이 만드는 바인딩의 초기값, 선언과 할당의 차이, 식별자 규칙, 찾을 수 없는 이름을 읽을 때의 ReferenceError를 정리합니다.',
  category: 'fundamentals',
  order: 3,
  tags: [
    '변수',
    '선언',
    '할당',
    '재할당',
    'var',
    '식별자',
    '예약어',
    '바인딩',
    'undefined',
    'ReferenceError',
  ],
  goals: [
    '변수를 이름과 값의 연결인 바인딩으로 설명할 수 있다.',
    'var x;와 var x = 1;에서 어떤 줄의 실행이 값을 넣고 어떤 줄은 아무것도 하지 않는지 구분할 수 있다.',
    '한 문장에 여러 변수를 선언했을 때 초기값이 어느 변수에 적용되는지 예측할 수 있다.',
    '식별자로 쓸 수 있는 이름과 쓸 수 없는 이름을 구분하고, 대소문자를 구분한다는 점을 설명할 수 있다.',
  ],
  prerequisites: [],
  related: [
    'hoisting',
    'block-scope',
    'tdz',
    'primitives-and-objects',
    'typeof-operator',
    'global-object',
    'es-modules',
  ],
  examples: [
    {
      id: 'declare-assign',
      file: 'declare-assign.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', '5', '7'],
    },
    {
      id: 'multiple-declare',
      file: 'multiple-declare.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined 2'],
    },
    {
      id: 'case-sensitive',
      file: 'case-sensitive.js',
      runtime: 'ecmascript',
      expectedOutput: ['1 2'],
    },
  ],
  simplifications: [
    '클래식 스크립트의 맨 바깥 코드를 기준으로 설명합니다. 함수 안, 블록 안, with 안, catch 안의 var와 ES 모듈은 다루지 않습니다. 클래식 스크립트의 맨 바깥 var는 전역 객체의 프로퍼티가 되지만, ES 모듈 코드는 항상 strict mode라서 let을 식별자로 쓸 수 없고 맨 바깥의 var도 전역 객체의 프로퍼티가 되지 않습니다. 모듈은 ES 모듈 개념에서 다룹니다.',
    '바인딩이 들어 있는 명세의 환경 레코드(Environment Record), 즉 전역 환경 레코드의 객체 레코드와 선언적 레코드는 다루지 않습니다. 명세는 값이 메모리 어디에 어떻게 놓이는지 정하지 않으므로 변수를 메모리 공간으로 설명하지 않습니다.',
    '선언이 처리되는 시점과 방식은 호이스팅 개념에서 다룹니다. 이 페이지는 바인딩이 스크립트의 첫 줄을 실행하기 전에 만들어진다는 점만 밝히고, 그 과정은 설명하지 않습니다.',
    '전역 객체 자신의 프로퍼티로 이미 있는 이름을 var로 선언하면 undefined로 시작하지 않고 기존 값을 그대로 씁니다. 상속받은 프로퍼티(예: 브라우저의 toString)는 여기에 해당하지 않으며 이 페이지에서 다루지 않습니다. Math처럼 미리 있는 이름은 선언하지 않아도 읽힙니다. 전역 객체 개념에서 다룹니다.',
    '같은 이름의 함수 선언이 있으면 var 선언의 값은 undefined가 아니라 함수입니다. 함수 선언과 var 선언의 관계는 호이스팅 개념에서 다룹니다.',
    '중복 선언, 선언 없는 할당, let과 const는 블록 스코프 개념과 TDZ 개념에서 다룹니다.',
    'typeof는 typeof 연산자 개념에서, 재할당과 객체 변경의 차이는 원시 값과 객체 개념에서 다룹니다.',
    '재할당은 명세 용어가 아닙니다. 명세에서는 할당과 재할당이 같은 PutValue 동작입니다. 이 페이지는 이미 할당한 변수에 다시 할당하는 경우를 재할당이라고 부릅니다.',
    '식별자에 쓸 수 있는 글자는 유니코드 ID_Start(첫 글자)·ID_Continue(둘째 글자부터) 속성을 단순화한 말입니다. 둘째 글자부터는 숫자 말고도 결합 문자 같은 글자를 쓸 수 있습니다. 유니코드 이스케이프로 쓴 식별자는 다루지 않습니다.',
    'strict mode에서만 막히는 이름은 let만 예로 듭니다. let은 let·const 선언의 이름으로는 strict mode가 아니어도 쓸 수 없습니다. 예약어 목록의 await와 yield는 문맥에 따라 식별자로 쓸 수 있으며 다루지 않습니다. strict mode는 별도 개념으로 다룹니다.',
    '예제의 console.log는 값을 출력하는 호스트 API이며 ECMAScript 언어의 일부가 아닙니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Variable Statement',
      url: 'https://tc39.es/ecma262/#sec-variable-statement',
    },
    {
      label: 'ECMAScript 명세 — GlobalDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-globaldeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — CreateGlobalVarBinding',
      url: 'https://tc39.es/ecma262/#sec-createglobalvarbinding',
    },
    {
      label: 'ECMAScript 명세 — GetValue',
      url: 'https://tc39.es/ecma262/#sec-getvalue',
    },
    {
      label: 'ECMAScript 명세 — PutValue',
      url: 'https://tc39.es/ecma262/#sec-putvalue',
    },
    {
      label: 'ECMAScript 명세 — Names and Keywords',
      url: 'https://tc39.es/ecma262/#sec-names-and-keywords',
    },
    {
      label: 'ECMAScript 명세 — Keywords and Reserved Words',
      url: 'https://tc39.es/ecma262/#sec-keywords-and-reserved-words',
    },
    {
      label: 'MDN — var',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/var',
    },
    {
      label: 'MDN — 문법과 자료형',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Grammar_and_types',
    },
    {
      label: 'MDN — ReferenceError: "x" is not defined',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Errors/Not_defined',
    },
  ],
  reviewedAt: '2026-11-13',
} satisfies ConceptMeta
