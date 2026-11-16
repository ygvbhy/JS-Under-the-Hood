import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'strict-mode',
  title: "strict mode: 'use strict'는 왜 맨 앞에 써야만 효과가 있을까",
  summary:
    'strict mode는 코드마다 정해지는 성질입니다. 지시어 프롤로그, 쓰인 위치로 정해지는 적용 범위, strict mode에서만 SyntaxError가 되는 문법을 예제로 확인합니다.',
  category: 'execution',
  order: 177,
  tags: [
    'strict mode',
    'use strict',
    '엄격 모드',
    'sloppy mode',
    '지시어',
    '지시어 프롤로그',
    'ReferenceError',
    'SyntaxError',
  ],
  goals: [
    "'use strict'가 지시어 프롤로그 안에 있을 때만 효과가 있고, 문자열 리터럴 식 문이 아닌 문 뒤에 쓴 것은 평범한 문자열 식 문이라는 것을 설명할 수 있다.",
    '함수의 strict 여부가 지시어 이후가 아니라 함수 코드 전체의 성질이며, 쓰인 위치로 정해지고 함수를 호출한 쪽과는 무관하다는 것을 설명할 수 있다.',
    '함수 안의 지시어는 바깥 코드로 퍼지지 않고 그 함수와 그 안에 쓴 함수를 strict로 만들며, 지시어보다 앞에 쓰인 매개변수 목록도 strict 규칙을 따른다는 것을 예제로 설명할 수 있다.',
    'strict mode에서만 SyntaxError가 되는 문법과 strict mode에서 식별자로 쓸 수 없는 이름을 말하고, 예제의 출력을 예측할 수 있다.',
  ],
  prerequisites: [
    { label: '블록 스코프', slug: 'block-scope' },
    { label: '함수 호출', slug: 'function-calls' },
    { label: '프로퍼티 어트리뷰트와 접근자', slug: 'property-attributes' },
  ],
  related: [
    'block-scope',
    'this-binding',
    'property-attributes',
    'default-parameters',
    'arrow-functions',
    'variable-declaration',
    'es-modules',
    'class-basics',
    'global-object',
    'function-calls',
    'error-handling',
    'execution-context',
    'expressions-statements',
  ],
  examples: [
    {
      id: 'directive-position',
      file: 'directive-position.js',
      runtime: 'ecmascript',
      expectedOutput: ['first ReferenceError', 'second no error', 'third ReferenceError'],
    },
    {
      id: 'lexical-unit',
      file: 'lexical-unit.js',
      runtime: 'ecmascript',
      expectedOutput: ['inner ReferenceError', 'helper no error'],
    },
    {
      id: 'syntax-errors',
      file: 'syntax-errors.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'delete-identifier ok SyntaxError',
        'with ok SyntaxError',
        'duplicate-params ok SyntaxError',
        'legacy-octal ok SyntaxError',
        'assign-eval ok SyntaxError',
        'assign-arguments ok SyntaxError',
        'let-name ok SyntaxError',
        'implements-name ok SyntaxError',
      ],
    },
  ],
  simplifications: [
    '모듈은 항상 strict이고 클래스의 모든 부분도 strict입니다. 모듈은 ES 모듈 개념에서, 클래스는 클래스 개념에서 다루며 이 페이지의 예제에는 쓰지 않습니다. 일반 함수 호출의 this가 strict mode에서 바뀌는 것은 this 개념에서 다룹니다.',
    '이 페이지의 예제는 모듈이 아닌 스크립트(Script)로 실행한 결과입니다(Node의 vm 모듈로 실행). 브라우저라면 type 속성이 없거나 빈 문자열이거나 JavaScript MIME 타입인 script 요소로 실행되는 클래식 스크립트에 해당합니다. 지시어가 없는 코드의 결과(오류 없이 끝나는 대입 등)는 모듈(type="module"인 script 요소, Node의 .mjs 파일 등)로 실행하면 달라집니다.',
    'eval 코드는 다루지 않습니다. 직접 eval은 strict 코드 안에서 부르면 strict이고(Function 생성자로 만든 함수와 반대), 이 내용은 전역 객체 개념에서 다룹니다. eval 코드의 변수 환경도 다루지 않습니다.',
    '명세 부록 C가 모아 둔 strict mode의 차이 전체를 다루지 않습니다. arguments.callee, 8진수 이스케이프 시퀀스, 08과 09 같은 리터럴, 블록 안의 함수 선언(부록 B)은 제외합니다. strict 함수의 환경 레코드 구성은 실행 컨텍스트 개념에서, 매개변수 목록이 단순하지 않은 함수의 지시어가 SyntaxError인 것과 strict 함수의 arguments가 매개변수와 연결되지 않는 것은 매개변수 기본값 개념에서 다룹니다.',
    '화살표 함수, 메서드, 제너레이터는 strict 코드 안에 쓰이면 strict이고 자기 본문의 지시어로도 strict가 되는 같은 규칙을 따르므로 따로 다루지 않습니다. 식 하나만 쓰는 화살표 함수 본문은 문이 아니라 식이어서 프롤로그를 가질 수 없습니다. 화살표 함수, 메서드, 매개변수 목록이 단순하지 않은 함수에서 매개변수 이름 중복이 sloppy mode에서도 SyntaxError인 것은 화살표 함수와 메서드 축약 개념에서 다룹니다.',
    "지시어 프롤로그 안의 'use strict'가 아닌 문자열 식 문(예: 'note';)에 구현이 고유한 의미를 줄 수 있고, 의미가 없으면 경고를 내도록 명세가 권합니다. 이 페이지는 그런 문을 평범한 식 문으로만 다룹니다.",
    '지시어 뒤에 세미콜론을 생략해도 되는 세미콜론 자동 삽입의 세부 규칙은 다루지 않습니다.',
    'new Function은 코드를 문자열로 받아 함수를 만드는 기능입니다. 이 페이지에서는 문법 오류를 검사하는 도구로만 쓰며, 함수를 문자열로 만드는 용도는 다루지 않습니다.',
    'sloppy mode는 명세 용어가 아닌 통칭입니다. 명세는 strict가 아닌 코드를 non-strict code라고 부르며, 이 페이지는 다른 페이지와 같이 sloppy mode라고 씁니다.',
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
    '예제의 console.log는 값을 출력하는 호스트 API이며 ECMAScript 언어의 일부가 아닙니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — The Strict Variant of ECMAScript',
      url: 'https://tc39.es/ecma262/#sec-strict-variant-of-ecmascript',
    },
    {
      label: 'ECMAScript 명세 — Types of Source Code',
      url: 'https://tc39.es/ecma262/#sec-types-of-source-code',
    },
    {
      label: 'ECMAScript 명세 — Directive Prologues and the Use Strict Directive',
      url: 'https://tc39.es/ecma262/#sec-directive-prologues-and-the-use-strict-directive',
    },
    {
      label: 'ECMAScript 명세 — Strict Mode Code',
      url: 'https://tc39.es/ecma262/#sec-strict-mode-code',
    },
    {
      label: 'ECMAScript 명세 — Keywords and Reserved Words',
      url: 'https://tc39.es/ecma262/#sec-keywords-and-reserved-words',
    },
    {
      label: 'ECMAScript 명세 — CreateDynamicFunction',
      url: 'https://tc39.es/ecma262/#sec-createdynamicfunction',
    },
    {
      label: 'ECMAScript 명세 — The Strict Mode of ECMAScript',
      url: 'https://tc39.es/ecma262/#sec-strict-mode-of-ecmascript',
    },
    {
      label: 'MDN — Strict mode',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Strict_mode',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
