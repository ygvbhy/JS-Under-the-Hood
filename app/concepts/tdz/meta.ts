import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'tdz',
  title: 'TDZ: let·const를 선언문보다 먼저 쓰면 어떻게 될까',
  summary:
    'let·const 이름은 스코프에 들어갈 때 미리 만들어지지만 선언문을 실행하기 전까지는 초기화 전이라, 그 사이에 읽거나 대입하면 ReferenceError입니다. typeof도 예외가 아니며, var처럼 undefined가 나오지 않습니다.',
  category: 'execution',
  order: 140,
  tags: [
    'TDZ',
    'temporal dead zone',
    'let',
    'const',
    '호이스팅',
    '초기화',
    'ReferenceError',
    'typeof',
    '가림',
    'shadowing',
  ],
  goals: [
    'let·const 이름이 선언문을 실행하기 전에 이미 만들어지지만 초기화 전 상태라는 것을 설명할 수 있다.',
    '초기화 전인 이름을 읽거나 대입하거나 typeof에 쓰면 ReferenceError가 나는 것을 예측할 수 있다.',
    '안쪽 블록의 let이 선언문보다 앞에서도 바깥 같은 이름을 가리는 것을 근거로, let·const 이름이 선언문을 실행하기 전에 이미 만들어진다는 것을 설명할 수 있다.',
    'TDZ가 코드의 위치가 아니라 실행 시점의 문제임을 설명하고, var에 담은 함수 표현식(TypeError)과 const에 담은 함수 표현식(ReferenceError)의 차이를 구분할 수 있다.',
  ],
  prerequisites: [
    { label: '호이스팅', slug: 'hoisting' },
    { label: '블록 스코프', slug: 'block-scope' },
    { label: '스코프 체인', slug: 'scope-chain' },
  ],
  related: [],
  examples: [
    {
      id: 'let-before',
      file: 'let-before.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', '10'],
    },
    {
      id: 'typeof-tdz',
      file: 'typeof-tdz.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', 'ReferenceError', 'number'],
    },
    {
      id: 'shadow',
      file: 'shadow.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', '파랑', '빨강'],
    },
    {
      id: 'time-not-place',
      file: 'time-not-place.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', '3'],
    },
    {
      id: 'assign-before',
      file: 'assign-before.js',
      runtime: 'ecmascript',
      expectedOutput: ['ReferenceError', 'undefined', '5'],
    },
    {
      id: 'var-vs-const-fn',
      file: 'var-vs-const-fn.js',
      runtime: 'ecmascript',
      expectedOutput: ['TypeError', 'ReferenceError', '17'],
    },
  ],
  simplifications: [
    "'TDZ'(temporal dead zone)는 ECMAScript 명세가 정의한 용어가 아닙니다. 명세는 이를 초기화되지 않은 바인딩(uninitialized binding)을 읽거나 쓰려 할 때의 ReferenceError로 설명하며, 이 페이지는 널리 쓰이는 이름인 TDZ로 부릅니다.",
    '예제는 오류를 보이려고 try…catch와 e.name을 씁니다. try·catch 블록이 만드는 스코프와 오류를 받는 변수 e는 시뮬레이터에 그리지 않으며, 오류 처리는 별도 개념에서 다룹니다.',
    "'스코프' 카드는 명세의 환경 레코드(Environment Record)를 단순화한 것입니다. 환경 레코드는 별도 개념에서 다룹니다.",
    '블록 실행이 끝나면 그 블록의 스코프를, 함수가 끝나면 그 함수의 스코프를 표시에서 뺍니다. 끝난 스코프가 어떻게 되는지는 클로저 개념에서 다룹니다.',
    'class 선언과 기본값 매개변수에도 같은 오류가 있지만, 이 페이지는 let·const만 다루고 나머지는 별도 개념에서 다룹니다.',
    '브라우저 콘솔의 오류 메시지 문구는 엔진마다 다릅니다. 이 페이지는 오류의 종류(e.name)만 보입니다.',
    'for (let …) 반복마다 새로 만들어지는 바인딩은 별도 개념에서 다룹니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Let and Const Declarations',
      url: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
    },
    {
      label: 'ECMAScript 명세 — Let and Const Declarations: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — GetBindingValue (선언적 환경 레코드)',
      url: 'https://tc39.es/ecma262/#sec-declarative-environment-records-getbindingvalue-n-s',
    },
    {
      label: 'ECMAScript 명세 — SetMutableBinding (선언적 환경 레코드)',
      url: 'https://tc39.es/ecma262/#sec-declarative-environment-records-setmutablebinding-n-v-s',
    },
    {
      label: 'ECMAScript 명세 — The typeof Operator: Runtime Semantics: Evaluation',
      url: 'https://tc39.es/ecma262/#sec-typeof-operator-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript 명세 — The try Statement',
      url: 'https://tc39.es/ecma262/#sec-try-statement',
    },
    {
      label: 'ECMAScript 명세 — BlockDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-blockdeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — GlobalDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-globaldeclarationinstantiation',
    },
    {
      label: 'MDN — let',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/let',
    },
    {
      label: 'MDN — const',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/const',
    },
    {
      label: 'MDN — try...catch',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/try...catch',
    },
    {
      label: 'MDN — typeof',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/typeof',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
