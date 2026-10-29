import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'scope-chain',
  title: '스코프 체인: 함수는 어디서 변수를 찾을까',
  summary:
    '변수 이름을 만나면 지금 스코프부터 바깥 스코프로 차례로 찾아 올라갑니다. 함수의 바깥 스코프는 함수를 호출한 곳이 아니라 정의한 곳으로 정해지고, 안쪽 스코프에 같은 이름이 있으면 바깥 변수는 가려집니다.',
  category: 'execution',
  tags: [
    '스코프',
    'scope',
    '스코프 체인',
    'scope chain',
    '렉시컬 스코프',
    'lexical scope',
    '정적 스코프',
    '섀도잉',
    'shadowing',
    '전역 스코프',
    '지역 스코프',
    '함수 스코프',
    'var',
    'ReferenceError',
  ],
  goals: [
    '이름을 찾을 때 지금 스코프에서 바깥 스코프로 차례로 찾고 처음 찾은 곳에서 멈춘다는 것을 설명할 수 있다.',
    '함수의 바깥 스코프가 호출한 위치가 아니라 정의한 위치로 정해진다는 것을 예제로 설명할 수 있다.',
    '안쪽 스코프의 같은 이름이 바깥 변수를 가릴 때, 함수 안에서 var 없이 바깥 변수에 대입할 때의 결과를 예측할 수 있다.',
    '바깥 스코프에서 안쪽 함수의 변수를 찾을 수 없는 이유를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '호이스팅', slug: 'hoisting' },
    { label: '함수 호출', slug: 'function-calls' },
  ],
  related: [],
  examples: [
    {
      id: 'scope-chain',
      file: 'scope-chain.js',
      runtime: 'ecmascript',
      expectedOutput: ['합정 마포 서울', 'undefined'],
    },
    {
      id: 'lexical-scope',
      file: 'lexical-scope.js',
      runtime: 'ecmascript',
      expectedOutput: ['전역'],
    },
    {
      id: 'shadowing',
      file: 'shadowing.js',
      runtime: 'ecmascript',
      expectedOutput: ['빨강', '파랑'],
    },
    {
      id: 'assign-outer',
      file: 'assign-outer.js',
      runtime: 'ecmascript',
      expectedOutput: ['2'],
    },
    {
      id: 'shadow-hoisting',
      file: 'shadow-hoisting.js',
      runtime: 'ecmascript',
      expectedOutput: ['undefined', '20', '10'],
    },
  ],
  simplifications: [
    "'스코프' 카드는 명세의 환경 레코드(Environment Record)를, '바깥 스코프'는 그 [[OuterEnv]] 연결을 단순화한 것입니다. 실행 컨텍스트와 환경 레코드는 별도 개념에서 다룹니다.",
    '함수 실행이 끝나면 그 함수의 스코프를 표시에서 뺍니다. 함수가 끝난 뒤 스코프가 어떻게 되는지는 클로저 개념에서 다룹니다.',
    '코드를 실행하기 전 전역 선언 처리와 함수 호출 시작의 선언 처리는 각각 한 단계로 묶었습니다. 선언 처리 순서는 호이스팅 개념에서 다룹니다.',
    'console을 찾는 과정은 표시하지 않습니다. console은 호스트가 제공하는 이름이며 같은 방식으로 스코프 체인에서 찾습니다.',
    '예제는 var와 함수 선언만 씁니다. let·const로 바꿔도 예제 1~3의 결과는 같지만, 블록({ }) 스코프와 선언 전 참조(TDZ)에서 차이가 나며 별도 개념에서 다룹니다. 예를 들어 예제 5를 let으로 바꾸면 ReferenceError가 납니다.',
    '끝까지 찾지 못한 이름을 읽으면 ReferenceError입니다. 찾지 못한 이름에 대입하면 strict mode가 아닐 때는 오류 없이 전역 객체에 그 이름의 프로퍼티가 만들어지고(암묵적 전역), strict mode에서는 ReferenceError입니다. 이는 별도 개념에서 다룹니다.',
    '전역 스코프는 전역 객체와 연결되어 있지만 이 페이지에서는 다루지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — GetIdentifierReference',
      url: 'https://tc39.es/ecma262/#sec-getidentifierreference',
    },
    {
      label: 'ECMAScript 명세 — ResolveBinding',
      url: 'https://tc39.es/ecma262/#sec-resolvebinding',
    },
    {
      label: 'ECMAScript 명세 — OrdinaryFunctionCreate',
      url: 'https://tc39.es/ecma262/#sec-ordinaryfunctioncreate',
    },
    {
      label: 'ECMAScript 명세 — NewFunctionEnvironment',
      url: 'https://tc39.es/ecma262/#sec-newfunctionenvironment',
    },
    {
      label: 'ECMAScript 명세 — FunctionDeclarationInstantiation',
      url: 'https://tc39.es/ecma262/#sec-functiondeclarationinstantiation',
    },
    {
      label: 'ECMAScript 명세 — Environment Records',
      url: 'https://tc39.es/ecma262/#sec-environment-records',
    },
    {
      label: 'MDN — 스코프',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Scope',
    },
    {
      label: 'MDN — 클로저: 어휘적 범위 지정(Lexical scoping)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Closures#어휘적_범위_지정lexical_scoping',
    },
  ],
  reviewedAt: '2026-10-29',
} satisfies ConceptMeta
