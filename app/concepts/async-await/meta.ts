import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'async-await',
  title: 'async/await: await에서 멈췄는데 호출한 쪽은 왜 먼저 실행될까',
  summary:
    'async 함수가 첫 await까지 동기로 실행되고 항상 프로미스를 돌려주며, await 뒤의 코드가 프로미스 Job으로 이어지는 순서를 ECMAScript 명세와 실행 결과로 확인합니다.',
  category: 'async',
  order: 460,
  tags: [
    'async',
    'await',
    'async 함수',
    '프로미스',
    '프로미스 Job',
    '마이크로태스크',
    '실행 컨텍스트',
    'thenable',
    'forEach',
    'for...of',
    'AsyncFunctionStart',
  ],
  goals: [
    'async 함수를 부르면 본문이 첫 await까지는(await의 피연산자 평가까지) 호출이 값을 돌려주기 전에 동기로 실행되고, 호출은 항상 새 프로미스를 돌려준다는 것을 실행 결과로 설명할 수 있다.',
    'await가 async 함수의 실행 컨텍스트를 멈추고 스택에서 바로 아래의 컨텍스트(첫 await에서는 함수를 부른 코드, Job으로 재개된 뒤에는 그 Job)로 돌아가며, 멈춘 지점 뒤의 코드는 프로미스 Job으로 이어져 동기 코드가 끝난 뒤에 실행되는 이유를 설명할 수 있다.',
    '프로미스가 아닌 값을 await해도 함수가 멈추고, await 뒤의 코드와 다른 then 콜백이 Job 큐에 들어간 순서대로 끼어드는 것을 설명할 수 있다.',
    'async 함수의 return은 돌려준 프로미스를 return한 값으로 resolve하고(프로미스도 thenable도 아닌 값이면 이행) throw와 매개변수 처리 중의 오류는 거부시키며, 호출한 쪽에는 동기 예외가 나지 않는 이유를 설명할 수 있다.',
    '이행된 프로미스를 return하면 값을 return할 때보다 늦게 이행되는 이유를 CreateResolvingFunctions와 NewPromiseResolveThenableJob의 단계로 설명하고, 이 예제의 실행 결과와 대조할 수 있다.',
    'forEach는 콜백이 돌려준 프로미스를 기다리지 않는다는 점, await한 거부를 try...catch로 잡을 수 있다는 점, async 함수는 생성자가 아니라는 점, thenable도 await할 수 있다는 점을 실행 결과로 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로미스', slug: 'promise' },
    { label: '마이크로태스크 큐', slug: 'microtask-queue' },
    { label: '제너레이터', slug: 'generator' },
  ],
  related: ['promise', 'microtask-queue', 'generator', 'event-loop', 'execution-context'],
  examples: [
    {
      id: 'sync-until-await',
      file: 'sync-until-await.js',
      runtime: 'ecmascript',
      expectedOutput: ['a1', 'after call', 'a2', 'then done'],
    },
    {
      id: 'always-promise',
      file: 'always-promise.js',
      runtime: 'ecmascript',
      expectedOutput: ['true', 'false', 'sync end', 'value 1'],
    },
    {
      id: 'interleave',
      file: 'interleave.js',
      runtime: 'ecmascript',
      expectedOutput: ['sync', 'task after await', 'then 1', 'then 2'],
    },
    {
      id: 'return-throw',
      file: 'return-throw.js',
      runtime: 'ecmascript',
      expectedOutput: ['호출은 모두 끝남', 'a 이행: ok', 'b 거부: boom', 'c 거부: ReferenceError'],
    },
    {
      id: 'return-promise',
      file: 'return-promise.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'returnsValue: value',
        'tick 1',
        'tick 2',
        'returnsPromise: promise',
        'tick 3',
      ],
    },
    {
      id: 'foreach',
      file: 'foreach.js',
      runtime: 'ecmascript',
      expectedOutput: ['forEach 직후: []', 'for...of: [1,2,3]', 'forEach 나중: [1,2,3]'],
    },
    {
      id: 'catch-rejection',
      file: 'catch-rejection.js',
      runtime: 'ecmascript',
      expectedOutput: ['잡음: 실패', '결과: 계속'],
    },
    {
      id: 'not-constructor',
      file: 'not-constructor.js',
      runtime: 'ecmascript',
      expectedOutput: ['false', 'new: TypeError'],
    },
    {
      id: 'thenable',
      file: 'thenable.js',
      runtime: 'ecmascript',
      expectedOutput: ['sync end', 'then 호출됨', 'v = 7'],
    },
  ],
  simplifications: [
    '시뮬레이터의 async 함수 호출 칸은 상태를 실행 중 · await에서 멈춤 · 끝남으로 보입니다. 이 표시는 명세의 슬롯이 아니라, await에서 멈춘 실행 컨텍스트에 이름을 붙여 보인 것입니다. 제너레이터 객체의 [[GeneratorState]]와 달리 async 함수에는 이런 상태 슬롯이 없습니다.',
    '시뮬레이터는 내장 함수(then, console.log, Await가 만드는 내장 함수)의 실행 컨텍스트를 그리지 않고, 프로미스 칸에는 변수에 담긴 프로미스만 그립니다.',
    '명세의 AsyncFunctionStart는 실행 중인 함수 컨텍스트의 복사본을 만들어 그 복사본으로 본문을 실행합니다. 시뮬레이터는 원래 함수 컨텍스트와 복사본을 하나의 본문 칸(예: work 본문)으로 그리고, await에서 멈춘 뒤 원래 함수 컨텍스트를 거쳐 호출한 쪽으로 돌아가는 과정도 한 단계로 줄여 보입니다.',
    'try...catch...finally 문 자체와 처리되지 않은 거부는 try/catch/finally 개념에서 다룹니다. 이 페이지는 await한 거부를 try...catch로 잡을 수 있다는 결과만 다룹니다.',
    '최상위 await(모듈에서만 쓸 수 있음)는 ES 모듈 개념에서 다룹니다. async 제너레이터와 for await...of는 다루지 않으며 별도 개념(작성 예정)입니다.',
    'Promise.all 등으로 여러 async 호출을 병렬로 실행하는 방법과 async 화살표 함수·메서드는 다루지 않습니다. 화살표 함수와 메서드의 async 함수도 같은 규칙을 따릅니다.',
    '명세 링크는 현재 초안을 가리키고, 인용은 ES2026판과 현재 초안에 똑같이 있는 문장만 씁니다. Await와 AsyncBlockStart에서 함수를 멈추고 호출한 쪽으로 돌아가는 서술은 판마다 다르므로 인용하지 않고 풀어서 설명합니다.',
    '예제 결과는 Node.js의 vm에서 실행한 값이며, console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    'return-promise 예제의 출력 순서는 이 예제에 대한 명세 단계(NewPromiseResolveThenableJob이 만드는 추가 Job)와 실행 결과로 설명한 것이며, 모든 경우에 적용되는 일반 규칙으로 쓰지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript — Async Function Definitions',
      url: 'https://tc39.es/ecma262/#sec-async-function-definitions',
    },
    {
      label: 'ECMAScript — EvaluateAsyncFunctionBody',
      url: 'https://tc39.es/ecma262/#sec-runtime-semantics-evaluateasyncfunctionbody',
    },
    {
      label: 'ECMAScript — AsyncFunctionStart',
      url: 'https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start',
    },
    {
      label: 'ECMAScript — AsyncBlockStart',
      url: 'https://tc39.es/ecma262/#sec-asyncblockstart',
    },
    {
      label: 'ECMAScript — Await',
      url: 'https://tc39.es/ecma262/#await',
    },
    {
      label: 'ECMAScript — PromiseResolve',
      url: 'https://tc39.es/ecma262/#sec-promise-resolve',
    },
    {
      label: 'ECMAScript — CreateResolvingFunctions',
      url: 'https://tc39.es/ecma262/#sec-createresolvingfunctions',
    },
    {
      label: 'ECMAScript — NewPromiseResolveThenableJob',
      url: 'https://tc39.es/ecma262/#sec-newpromiseresolvethenablejob',
    },
    {
      label: 'ECMAScript — AsyncFunction Instances',
      url: 'https://tc39.es/ecma262/#sec-async-function-instances',
    },
    {
      label: 'MDN — async function',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/async_function',
    },
    {
      label: 'MDN — await',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/await',
    },
  ],
  reviewedAt: '2026-11-06',
} satisfies ConceptMeta
