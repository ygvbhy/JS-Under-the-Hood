import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'promise',
  title: '프로미스: 이미 이행됐는데 then 콜백은 왜 나중에 불릴까',
  summary:
    'new Promise의 executor는 바로 실행되지만 then 콜백은 이미 이행된 프로미스에서도 나중에 불립니다. then이 새 프로미스를 돌려주는 이유와 catch·finally·채택·Promise.all까지 시뮬레이터와 명세로 확인합니다.',
  category: 'async',
  order: 430,
  tags: [
    'Promise',
    '프로미스',
    'then',
    'catch',
    'finally',
    '체이닝',
    'Promise.all',
    'thenable',
    'Job',
  ],
  goals: [
    'executor가 new Promise 안에서 동기로 실행되고 resolve와 reject가 처음 한 번만 효과가 있음을 설명할 수 있다.',
    'then이 반응을 등록하거나 Job을 넣어 콜백이 나중에 불리는 이유를 PerformPromiseThen으로 설명할 수 있다.',
    '콜백의 반환값·throw·함수가 아닌 인수·catch·finally가 다음 프로미스를 정하는 규칙으로 체인 결과를 예측할 수 있다.',
    '콜백이 프로미스나 thenable을 반환할 때의 채택, 분기와 체인의 차이, all·allSettled·race·any의 결과를 구분할 수 있다.',
  ],
  prerequisites: [
    { label: '이벤트 루프와 태스크 큐', slug: 'event-loop' },
    { label: '실행 컨텍스트', slug: 'execution-context' },
  ],
  related: ['event-loop', 'timers', 'execution-context', 'closure', 'iterable-for-of', 'json'],
  examples: [
    {
      id: 'executor-sync',
      file: 'executor-sync.js',
      runtime: 'ecmascript',
      expectedOutput: [
        '["executor","after resolve","sync end"]',
        '["executor","after resolve","sync end","then first"]',
      ],
    },
    {
      id: 'chain',
      file: 'chain.js',
      runtime: 'ecmascript',
      expectedOutput: ['executor', 'sync end false', 'then 1', 'catch bad 2'],
    },
    {
      id: 'catch-skip',
      file: 'catch-skip.js',
      runtime: 'ecmascript',
      expectedOutput: ['caught no data', 'after catch undefined', 'passed through 7'],
    },
    {
      id: 'branch-vs-chain',
      file: 'branch-vs-chain.js',
      runtime: 'ecmascript',
      expectedOutput: ['false false', '[11,21,31]'],
    },
    {
      id: 'return-promise',
      file: 'return-promise.js',
      runtime: 'ecmascript',
      expectedOutput: ['false true', 'outer got inner value'],
    },
    {
      id: 'thenable',
      file: 'thenable.js',
      runtime: 'ecmascript',
      expectedOutput: ['sync end false', 'thenable.then called', 'got from thenable'],
    },
    {
      id: 'finally',
      file: 'finally.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'cleanup 1 0',
        'after finally data',
        'cleanup 2',
        'still rejected failed',
        'replaced by cleanup failed',
      ],
    },
    {
      id: 'static-methods',
      file: 'static-methods.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'fulfilled [1,2,"three"]',
        'rejected Error',
        'fulfilled "race ok"',
        'fulfilled "any ok"',
        'rejected AggregateError',
        '["fulfilled","rejected"]',
      ],
    },
  ],
  simplifications: [
    'Job을 호스트가 언제 처리하는지(마이크로태스크), 여러 체인이 끼어드는 순서, 타이머와의 관계는 별도 개념(작성 예정)에서 다룹니다.',
    'CreateResolvingFunctions는 ES2025판까지 두 함수가 [[AlreadyResolved]] 슬롯으로 공유하는 alreadyResolved 레코드로, ES2026판부터 promiseOrEmpty 레코드의 [[Value]]를 empty로 바꾸는 방식으로 쓰여 있습니다. 두 번째 호출부터 무시되는 결과는 같습니다.',
    '시뮬레이터의 Job 목록과 "실행 중" 칸은 명세의 Job을 그림으로 나타낸 것이며 엔진이 쓰는 큐 자료구조가 아닙니다. 반응 표시는 PromiseReaction 레코드를 요약한 것입니다.',
    '[[PromiseIsHandled]]와 처리되지 않은 거부(HostPromiseRejectionTracker)는 호스트 동작이라 다루지 않으며, 예제는 모든 거부를 처리합니다.',
    'Promise 서브클래싱과 Symbol.species, Promise.withResolvers, Promise.try는 다루지 않습니다.',
    'try...catch와 async/await는 별도 개념(작성 예정)입니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'ECMAScript 명세 — Promise Objects',
      url: 'https://tc39.es/ecma262/#sec-promise-objects',
    },
    {
      label: 'ECMAScript 명세 — Promise 생성자',
      url: 'https://tc39.es/ecma262/#sec-promise-executor',
    },
    {
      label: 'ECMAScript 명세 — CreateResolvingFunctions',
      url: 'https://tc39.es/ecma262/#sec-createresolvingfunctions',
    },
    {
      label: 'ECMAScript 명세 — Promise.prototype.then',
      url: 'https://tc39.es/ecma262/#sec-promise.prototype.then',
    },
    {
      label: 'ECMAScript 명세 — PerformPromiseThen',
      url: 'https://tc39.es/ecma262/#sec-performpromisethen',
    },
    {
      label: 'ECMAScript 명세 — NewPromiseReactionJob',
      url: 'https://tc39.es/ecma262/#sec-newpromisereactionjob',
    },
    {
      label: 'ECMAScript 명세 — NewPromiseResolveThenableJob',
      url: 'https://tc39.es/ecma262/#sec-newpromiseresolvethenablejob',
    },
    {
      label: 'ECMAScript 명세 — TriggerPromiseReactions',
      url: 'https://tc39.es/ecma262/#sec-triggerpromisereactions',
    },
    {
      label: 'ECMAScript 명세 — Promise.prototype.catch',
      url: 'https://tc39.es/ecma262/#sec-promise.prototype.catch',
    },
    {
      label: 'ECMAScript 명세 — Promise.prototype.finally',
      url: 'https://tc39.es/ecma262/#sec-promise.prototype.finally',
    },
    {
      label: 'ECMAScript 명세 — Promise.resolve',
      url: 'https://tc39.es/ecma262/#sec-promise.resolve',
    },
    { label: 'ECMAScript 명세 — Promise.all', url: 'https://tc39.es/ecma262/#sec-promise.all' },
    {
      label: 'ECMAScript 명세 — Promise.allSettled',
      url: 'https://tc39.es/ecma262/#sec-promise.allsettled',
    },
    { label: 'ECMAScript 명세 — Promise.race', url: 'https://tc39.es/ecma262/#sec-promise.race' },
    { label: 'ECMAScript 명세 — Promise.any', url: 'https://tc39.es/ecma262/#sec-promise.any' },
    { label: 'ECMAScript 명세 — Jobs', url: 'https://tc39.es/ecma262/#sec-jobs' },
    {
      label: 'ECMAScript 명세 — HostEnqueuePromiseJob',
      url: 'https://tc39.es/ecma262/#sec-hostenqueuepromisejob',
    },
    {
      label: 'MDN — Promise',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise',
    },
    {
      label: 'MDN — Promise.prototype.then()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/then',
    },
    {
      label: 'MDN — Promise.prototype.catch()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch',
    },
    {
      label: 'MDN — Promise.prototype.finally()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally',
    },
    {
      label: 'MDN — Promise.all()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/all',
    },
  ],
  reviewedAt: '2026-11-05',
} satisfies ConceptMeta
