import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'promise-static-methods',
  title: 'Promise 정적 메서드: Promise.all의 결과는 왜 끝난 순서가 아닐까',
  summary:
    'Promise.all은 요소마다 자기 자리 번호를 기억하는 함수를 붙이고 남은 개수를 세어, 끝난 순서와 상관없이 넣은 순서로 결과를 모읍니다. 거부 뒤의 동작, 빈 배열, race와 any의 결정 방식을 명세와 시뮬레이터로 확인합니다.',
  category: 'async',
  order: 442,
  tags: [
    'Promise.all',
    'Promise.allSettled',
    'Promise.race',
    'Promise.any',
    'AggregateError',
    '프로미스',
    '이터러블',
  ],
  goals: [
    '요소마다 자리 번호(index)를 기억하는 함수와 남은 개수로 Promise.all의 결과가 넣은 순서가 되는 이유를 설명할 수 있다.',
    'Promise.all이 첫 거부로 결과 프로미스를 거부한 뒤에도 다른 프로미스와 그 반응이 계속 진행됨을 설명할 수 있다.',
    '빈 이터러블을 넘겼을 때 all·allSettled는 이행되고 any는 거부되며 race는 영원히 pending인 이유와, 남은 개수가 1에서 시작하는 이유를 설명할 수 있다.',
    'race가 반응 Job 순서로 결과를 정하는 방식, any의 errors가 넣은 순서인 이유, 이터러블이 아닌 값이 throw가 아니라 거부가 되는 이유를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '프로미스', slug: 'promise' },
    { label: '이터러블과 for...of', slug: 'iterable-for-of' },
    { label: '마이크로태스크 큐', slug: 'microtask-queue' },
  ],
  related: [
    'promise',
    'microtask-queue',
    'fetch',
    'iterable-for-of',
    'async-await',
    'error-handling',
  ],
  examples: [
    {
      id: 'input-order',
      file: 'input-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['B resolved', 'A resolved', 'all ["A","B","c"]'],
    },
    {
      id: 'keeps-going',
      file: 'keeps-going.js',
      runtime: 'ecmascript',
      expectedOutput: ['sync end', 'all rejected b failed', 'a still fulfilled A'],
    },
    {
      id: 'empty',
      file: 'empty.js',
      runtime: 'ecmascript',
      expectedOutput: ['all []', 'allSettled []', 'any AggregateError 0'],
    },
    {
      id: 'race-settled',
      file: 'race-settled.js',
      runtime: 'ecmascript',
      expectedOutput: ['race 1 late', 'race 2 now'],
    },
    {
      id: 'any-errors',
      file: 'any-errors.js',
      runtime: 'ecmascript',
      expectedOutput: ['AggregateError ["one","two"]'],
    },
    {
      id: 'settled-order',
      file: 'settled-order.js',
      runtime: 'ecmascript',
      expectedOutput: ['fulfilled A', 'rejected b failed'],
    },
    {
      id: 'iterable-input',
      file: 'iterable-input.js',
      runtime: 'ecmascript',
      expectedOutput: ['no throw true', 'rejected TypeError', '["h","i"]'],
    },
  ],
  simplifications: [
    '시뮬레이터는 Promise.all만 그립니다. allSettled와 any는 같은 장부를 쓰는 변형이라 본문에서 설명합니다.',
    '시뮬레이터는 then이 내부적으로 만드는 새 프로미스를 그리지 않습니다.',
    '요소 함수의 AlreadyCalled 검사와 남은 개수를 1에서 시작하는 장치가 실제로 결과를 바꾸는 경우(프로미스 인스턴스의 then을 덮어써 콜백을 두 번 부르거나 반복이 끝나기 전에 부르는 경우)는 예제로 다루지 않고, 남은 개수에 대한 명세 NOTE와 두 장치의 동작만 설명합니다.',
    '생성자의 resolve를 바꾼 경우와 Promise 서브클래싱은 다루지 않고, this가 생성자가 아닐 때 TypeError가 던져진다는 것은 한 문장으로만 언급합니다.',
    'Promise.reject, Promise.withResolvers, Promise.try는 다루지 않습니다.',
    '처리되지 않은 거부 추적은 호스트 동작이라 다루지 않으며, 예제는 모든 거부를 처리합니다.',
    'async/await와 try...catch는 각각 async/await 개념과 try/catch/finally 개념에서 다룹니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    { label: 'ECMAScript 명세 — Promise.all', url: 'https://tc39.es/ecma262/#sec-promise.all' },
    {
      label: 'ECMAScript 명세 — PerformPromiseAll',
      url: 'https://tc39.es/ecma262/#sec-performpromiseall',
    },
    {
      label: 'ECMAScript 명세 — Promise.allSettled',
      url: 'https://tc39.es/ecma262/#sec-promise.allsettled',
    },
    {
      label: 'ECMAScript 명세 — PerformPromiseAllSettled',
      url: 'https://tc39.es/ecma262/#sec-performpromiseallsettled',
    },
    { label: 'ECMAScript 명세 — Promise.any', url: 'https://tc39.es/ecma262/#sec-promise.any' },
    {
      label: 'ECMAScript 명세 — PerformPromiseAny',
      url: 'https://tc39.es/ecma262/#sec-performpromiseany',
    },
    { label: 'ECMAScript 명세 — Promise.race', url: 'https://tc39.es/ecma262/#sec-promise.race' },
    {
      label: 'ECMAScript 명세 — PerformPromiseRace',
      url: 'https://tc39.es/ecma262/#sec-performpromiserace',
    },
    {
      label: 'ECMAScript 명세 — GetPromiseResolve',
      url: 'https://tc39.es/ecma262/#sec-getpromiseresolve',
    },
    {
      label: 'MDN — Promise.all()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/all',
    },
    {
      label: 'MDN — Promise.allSettled()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled',
    },
    {
      label: 'MDN — Promise.race()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/race',
    },
    {
      label: 'MDN — Promise.any()',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/any',
    },
    {
      label: 'MDN — AggregateError',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/AggregateError',
    },
  ],
  reviewedAt: '2026-11-10',
} satisfies ConceptMeta
