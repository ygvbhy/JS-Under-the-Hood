import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'closure',
  title: '클로저: 함수가 끝나도 바깥 변수가 남는 이유',
  summary:
    '함수는 만들어질 때의 환경 레코드를 [[Environment]]로 가리켜, 바깥 함수가 끝나도 그 변수를 읽고 바꿉니다. 호출마다 새 환경이 생기고 같은 호출의 함수들은 환경을 공유합니다.',
  category: 'execution',
  tags: [
    '클로저',
    'closure',
    '[[Environment]]',
    '환경 레코드',
    '실행 컨텍스트',
    '렉시컬 스코프',
    '상태 은닉',
    '캡슐화',
    '카운터',
    '고차 함수',
  ],
  goals: [
    '바깥 함수가 끝난 뒤에도 안쪽 함수가 바깥 변수를 쓸 수 있는 이유를 [[Environment]]와 환경 레코드로 설명할 수 있다.',
    '바깥 함수를 호출할 때마다 새 환경이 만들어져 서로 독립이고, 같은 호출에서 만든 함수들은 환경을 공유한다는 것으로 결과를 예측할 수 있다.',
    '안쪽 함수가 만들 때의 값이 아니라 바인딩이 있는 환경 레코드를 가리킨다는 것으로 바깥 변수를 바꾼 뒤의 결과를 예측할 수 있다.',
    '클로저로 상태를 숨기는 방법과, 메모리에 대해 명세가 말하는 것과 말하지 않는 것을 구분할 수 있다.',
  ],
  prerequisites: [
    { label: '실행 컨텍스트', slug: 'execution-context' },
    { label: '스코프 체인', slug: 'scope-chain' },
    { label: '함수 호출', slug: 'function-calls' },
    { label: '원시 값과 객체', slug: 'primitives-and-objects' },
  ],
  related: ['execution-context', 'scope-chain'],
  examples: [
    {
      id: 'counter',
      file: 'counter.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '2', 'undefined'],
    },
    {
      id: 'independent',
      file: 'independent.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '2', '1'],
    },
    {
      id: 'shared-env',
      file: 'shared-env.js',
      runtime: 'ecmascript',
      expectedOutput: ['2'],
    },
    {
      id: 'binding-not-value',
      file: 'binding-not-value.js',
      runtime: 'ecmascript',
      expectedOutput: ['Hi, Lee'],
    },
    {
      id: 'make-adder',
      file: 'make-adder.js',
      runtime: 'ecmascript',
      expectedOutput: ['3', '11', '7'],
    },
    {
      id: 'private-state',
      file: 'private-state.js',
      runtime: 'ecmascript',
      expectedOutput: ['150', 'undefined', '150'],
    },
    {
      id: 'nested',
      file: 'nested.js',
      runtime: 'ecmascript',
      expectedOutput: ['ab'],
    },
  ],
  simplifications: [
    '시뮬레이터는 실행 컨텍스트에서도, 남아 있는 함수가 가리키는 레코드에서도 이어지지 않는 환경 레코드를 그림에서 뺍니다. 명세는 메모리가 언제 회수되는지 보장하지 않고, 환경 레코드는 엔진 안의 특정 구조와 대응할 필요가 없는 명세의 장치입니다. 안쪽 함수가 읽거나 쓰는 바인딩은 어느 구현에서든 명세대로 동작해야 하고, 함수가 쓰지 않는 바인딩까지 남기는지와 언제 회수하는지는 구현마다 다를 수 있습니다.',
    '실행 컨텍스트 그림의 단순화(구성 요소 일부만, sloppy 함수의 레코드 둘, 컨텍스트 push와 선언 처리를 한 단계로)를 그대로 따릅니다. this 바인딩은 이 페이지에서 그리지 않습니다.',
    '함수가 남는 기준은 변수·남아 있는 레코드의 바인딩·변수가 가리키는 객체의 메서드에서 이어지는지로 단순화했습니다. 객체 자체와 그 다른 프로퍼티는 그리지 않습니다.',
    '반복문 안에서 만든 클로저(var와 let의 차이)는 별도 개념입니다.',
    '이름 있는 함수 식은 자기 이름을 바꿀 수 없는 바인딩으로 담은 선언적 환경 레코드를 하나 더 만들고, 그 레코드를 [[Environment]]로 삼습니다. 이 페이지의 예제는 이름 없는 함수 식만 쓰며 이 레코드는 다루지 않습니다.',
    '즉시 실행 함수와 모듈 패턴, 클래스의 private 필드는 다루지 않습니다.',
    'console.log를 부를 때 만들어지는 실행 컨텍스트는 생략합니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Conformance',
      url: 'https://tc39.es/ecma262/#sec-conformance',
    },
    {
      label: 'ECMAScript 명세 — ECMAScript Function Objects',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-function-objects',
    },
    {
      label:
        'ECMAScript 명세 — OrdinaryFunctionCreate ( proto, sourceText, paramList, body, thisMode, envRecord, privateEnv )',
      url: 'https://tc39.es/ecma262/#sec-ordinaryfunctioncreate',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: InstantiateOrdinaryFunctionExpression',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionexpression',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: InstantiateArrowFunctionExpression',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-instantiatearrowfunctionexpression',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: DefineMethod',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-definemethod',
    },
    {
      label: 'ECMAScript 명세 — Runtime Semantics: InstantiateOrdinaryFunctionObject',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionobject',
    },
    {
      label: 'ECMAScript 명세 — NewFunctionEnvironment ( func, newTarget )',
      url: 'https://tc39.es/ecma262/#sec-newfunctionenvironment',
    },
    {
      label: 'ECMAScript 명세 — GetIdentifierReference ( envRecord, name, strict )',
      url: 'https://tc39.es/ecma262/#sec-getidentifierreference',
    },
    {
      label: 'ECMAScript 명세 — ECMAScript Specification Types',
      url: 'https://tc39.es/ecma262/#sec-ecmascript-specification-types',
    },
    {
      label: 'ECMAScript 명세 — Processing Model of WeakRef and FinalizationRegistry Targets',
      url: 'https://tc39.es/ecma262/#sec-weakref-processing-model',
    },
    {
      label: 'MDN — 클로저 (JavaScript 가이드)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Closures',
    },
    {
      label: 'MDN — 클로저(Closure)',
      url: 'https://developer.mozilla.org/ko/docs/Glossary/Closure',
    },
    {
      label: 'MDN — 함수 (JavaScript 참조)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Functions',
    },
    {
      label: 'MDN — 함수 (JavaScript 가이드)',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Functions',
    },
  ],
  reviewedAt: null,
} satisfies ConceptMeta
