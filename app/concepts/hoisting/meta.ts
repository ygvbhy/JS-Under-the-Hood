import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'hoisting',
  title: '호이스팅: 선언문보다 먼저 쓰면 어떻게 되나',
  summary:
    '자바스크립트는 코드를 실행하기 전에 선언을 먼저 처리합니다. 그래서 var 변수는 대입 전에 읽으면 undefined이고(같은 이름의 함수 선언이 없다면), 함수 선언은 선언문보다 먼저 호출할 수 있지만, var에 담은 함수 표현식을 미리 호출하면 TypeError입니다.',
  category: 'execution',
  tags: [
    '호이스팅',
    'hoisting',
    'var',
    '함수 선언',
    '함수 표현식',
    '선언',
    'undefined',
    'TypeError',
    'ReferenceError',
  ],
  goals: [
    '코드를 실행하기 전 선언 처리 단계에서 var 변수와 함수 선언에 무엇이 만들어지는지 설명할 수 있다.',
    'var 변수를 선언문보다 앞에서 읽은 결과(undefined)와 선언하지 않은 이름을 읽은 결과(ReferenceError)를 구분할 수 있다.',
    '함수 선언은 미리 호출할 수 있지만 var에 담은 함수 표현식은 TypeError가 나는 이유를 설명할 수 있다.',
    '같은 이름의 var와 함수 선언, 같은 이름의 함수 선언 두 개, 실행되지 않는 줄의 var가 있을 때 결과를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: 'var로 변수 선언하기' },
    { label: '함수 호출', slug: 'function-calls' },
    { label: 'typeof 연산자', slug: 'typeof-operator' },
  ],
  related: [],
  examples: [
    {
      id: 'var-before',
      file: 'var-before.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', '10'],
    },
    {
      id: 'decl-vs-expr',
      file: 'decl-vs-expr.js',
      runtime: 'ecmascript',
      expectedOutput: ['8', 'undefined', '9'],
    },
    {
      id: 'same-name',
      file: 'same-name.js',
      runtime: 'ecmascript',
      expectedOutput: ['function', 'number'],
    },
    {
      id: 'unexecuted-var',
      file: 'unexecuted-var.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', 'undefined'],
    },
    {
      id: 'duplicate-function',
      file: 'duplicate-function.js',
      runtime: 'ecmascript',
      expectedOutput: ['나중', '나중'],
    },
  ],
  simplifications: [
    '선언 처리 단계를 선언 하나씩 나눠 보여 줍니다. 명세(GlobalDeclarationInstantiation)는 바인딩을 만들기 전에 처리할 선언을 먼저 모으고(이때 함수 선언과 이름이 같은 var 선언은 목록에서 빠집니다), 함수 선언의 바인딩을 만든 뒤 var 선언의 바인딩을 만듭니다. 시뮬레이터는 맨 바깥 코드에 대한 이 순서를 따릅니다.',
    "'선언으로 만들어진 이름' 목록은 명세의 바인딩(binding)을 보여 주며, 명세의 전역 환경 레코드(Global Environment Record)를 단순화한 것입니다. 실행 컨텍스트는 별도 개념에서 다룹니다.",
    '클래식 스크립트의 맨 바깥 var·함수 선언은 전역 객체의 프로퍼티가 됩니다(ES 모듈과 Node.js CommonJS 파일에서는 되지 않습니다). var로 선언한 이름이 전역 객체에 이미 있으면(예: 브라우저의 window.name) 선언 처리 때 undefined로 초기화되지 않고 기존 값을 그대로 씁니다. 함수 선언은 기존 값을 그 함수로 바꿉니다(undefined처럼 바꿀 수 없게 정해진 일부 이름은 예외). 이 페이지의 예제는 그런 이름을 쓰지 않으며, 전역 객체는 별도 개념에서 다룹니다.',
    'let·const 선언도 코드를 실행하기 전에 처리되지만 초기화되지 않은 상태로 남아, 선언문보다 앞에서 읽으면 ReferenceError가 납니다(TDZ). const에 담은 함수 표현식을 미리 호출해도 TypeError가 아니라 ReferenceError입니다. 이 동작은 별도 개념에서 다룹니다.',
    '함수 안의 var·함수 선언도 그 함수를 호출할 때 본문을 실행하기 전에 처리됩니다(FunctionDeclarationInstantiation). 다만 규칙이 맨 바깥 코드와 다릅니다. 함수 선언의 이름까지 포함해 바인딩을 먼저 undefined로 만든 뒤 함수 선언의 함수를 넣고, 매개변수와 이름이 같은 var는 undefined가 아니라 인수 값으로 시작합니다. 이 페이지는 맨 바깥 코드만 다루며, 함수 안의 선언 처리와 스코프는 별도 개념에서 다룹니다.',
    '블록({ }) 안의 함수 선언은 strict mode 여부와 호스트에 따라 동작이 달라 다루지 않습니다(명세 부록 B). 본문의 "함수 선언문은 실행 단계에서 아무 일도 하지 않는다"는 맨 바깥 함수 선언에 대한 설명입니다. 실행되지 않는 줄의 예제는 블록 안에 var만 둡니다. 블록과 var의 관계(스코프)도 별도 개념에서 다룹니다.',
    "함수 호출(double(4), triple(3))의 내부 과정은 한 단계로 묶어 표시합니다. 호출 과정은 '함수 호출' 개념에서 다룹니다.",
    "'호이스팅'은 명세가 정의한 용어가 아닙니다. 명세에는 이 단어를 정의한 절이 없고, 문법 이름 HoistableDeclaration(함수 선언 등)과 일부 설명 노트에만 나옵니다. 명세는 이 동작을 선언 인스턴스화(declaration instantiation) 과정으로 정의합니다.",
    '클래식 스크립트에서 선언 처리와 실행은 스크립트 하나 단위로 일어납니다. 브라우저에서 클래식 <script>가 여러 개면, 앞 스크립트가 실행되는 동안 뒤 스크립트의 선언은 아직 처리되지 않았습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — ScriptEvaluation',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-scriptevaluation',
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
      label: 'ECMAScript 명세 — Variable Statement',
      url: 'https://tc39.es/ecma262/#sec-variable-statement',
    },
    {
      label: 'ECMAScript 명세 — Function Definitions',
      url: 'https://tc39.es/ecma262/#sec-function-definitions',
    },
    {
      label: 'ECMAScript 명세 — InitializeEnvironment (모듈)',
      url: 'https://tc39.es/ecma262/#sec-source-text-module-record-initialize-environment',
    },
    {
      label: 'ECMAScript 명세 — Module Early Errors',
      url: 'https://tc39.es/ecma262/#sec-module-semantics-static-semantics-early-errors',
    },
    {
      label: 'Node.js 문서 — The module wrapper (영문)',
      url: 'https://nodejs.org/api/modules.html#the-module-wrapper',
    },
    {
      label: 'Node.js 문서 — Determining module system (영문)',
      url: 'https://nodejs.org/api/packages.html#determining-module-system',
    },
    {
      label: 'MDN — Hoisting (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Glossary/Hoisting',
    },
    {
      label: 'MDN — var',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/var',
    },
    {
      label: 'MDN — 함수 선언',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/function',
    },
    {
      label: 'MDN — 함수 표현식',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/function',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
