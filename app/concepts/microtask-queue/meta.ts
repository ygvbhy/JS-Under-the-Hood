import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'microtask-queue',
  title: '마이크로태스크 큐: 먼저 등록한 setTimeout(fn, 0)보다 then 콜백이 왜 먼저 실행될까',
  summary:
    '마이크로태스크 큐와 체크포인트(스택이 비면 큐가 빌 때까지 실행), then과 queueMicrotask가 같은 큐를 쓰는 점, 스크립트·타이머·리스너 사이의 실행 순서를 HTML 표준과 Chromium 실행으로 확인합니다.',
  category: 'async',
  order: 440,
  tags: [
    '마이크로태스크',
    '마이크로태스크 큐',
    '마이크로태스크 체크포인트',
    'queueMicrotask',
    'Promise',
    'then',
    '이벤트 루프',
    '태스크 큐',
    'Job',
    '호스트 API',
  ],
  goals: [
    '동기 코드가 끝나 스택이 비면 마이크로태스크 큐가 비워지고 그 뒤에야 타이머 태스크가 실행되므로, 먼저 등록한 setTimeout(fn, 0)보다 then 콜백과 queueMicrotask 콜백이 먼저 실행되는 이유와, then과 queueMicrotask가 같은 마이크로태스크 큐에 넣은 순서대로 실행되는 이유를 설명할 수 있다.',
    '마이크로태스크 체크포인트는 큐가 빌 때까지 계속되므로 마이크로태스크 안에서 넣은 마이크로태스크도 같은 체크포인트에서 실행되고, 마이크로태스크를 계속 넣으면 타이머 태스크가 그만큼 밀리는 이유를 설명할 수 있다.',
    '두 프로미스 체인의 then 콜백이 a1, b1, a2, b2, a3 순으로 끼어드는 순서가 then의 절차(콜백이 프로미스가 아닌 값을 반환하면 그 콜백의 Job이 끝날 때 곧바로 다음 Job이 들어감)와 HostEnqueuePromiseJob으로 넣은 프로미스 Job을 넣은 순서대로 실행하라는 ECMAScript의 요구에서 나오고, then 콜백이 동기 코드 뒤에 실행되는 것은 실행 컨텍스트 스택이 비었을 때만 Job을 시작하라는 ECMAScript의 요구에서 나온다는 점을, 스택이 빈 뒤의 구체적 시점(체크포인트)을 정하는 HTML(호스트)의 몫과 나누어 말할 수 있다.',
    '스크립트 요소 사이와 타이머 콜백 사이에서도 콜백이 끝나 스택이 비면 체크포인트가 일어나므로, 앞 스크립트나 앞 타이머 콜백이 만든 마이크로태스크가 다음 스크립트나 다음 타이머 콜백보다 먼저 실행되는 이유를 설명할 수 있다.',
    '스크립트가 부른 click()은 리스너가 모두 끝나도 전역 코드가 스택에 남아 있어 스크립트가 끝나야 체크포인트가 일어나지만, 브라우저가 태스크에서 부른 message 리스너는 리스너마다 스택이 비어 체크포인트가 일어나는 차이를 설명하고, 실제 사용자 클릭에 대해서는 실행으로 확인한 것과 표준 서술에서 이끌어 낸 것을 구분해 말할 수 있다.',
  ],
  prerequisites: [
    { label: '이벤트 루프와 태스크 큐', slug: 'event-loop' },
    { label: '프로미스', slug: 'promise' },
  ],
  related: ['event-loop', 'promise', 'timers'],
  examples: [
    {
      id: 'basic',
      file: 'basic.html',
      runtime: 'browser',
      expectedOutput: [
        '스크립트 시작',
        '스크립트 끝',
        'then 1',
        'queueMicrotask',
        'then 2',
        '타이머 0ms',
      ],
    },
    {
      id: 'nested',
      file: 'nested.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 끝', 'm1', 'm2', 'm3', '타이머 0ms'],
    },
    {
      id: 'many-microtasks',
      file: 'many-microtasks.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 끝', '마이크로태스크 1000개 끝', '타이머 0ms'],
    },
    {
      id: 'two-chains',
      file: 'two-chains.js',
      runtime: 'ecmascript',
      expectedOutput: ['동기 코드 끝', 'a1', 'b1', 'a2', 'b2', 'a3'],
    },
    {
      id: 'two-scripts',
      file: 'two-scripts.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 1 끝', '스크립트 1의 마이크로태스크', '스크립트 2'],
    },
    {
      id: 'timer-callbacks',
      file: 'timer-callbacks.html',
      runtime: 'browser',
      expectedOutput: ['a', 'a의 마이크로태스크', 'b'],
    },
    {
      id: 'click-listeners',
      file: 'click-listeners.html',
      runtime: 'browser',
      expectedOutput: [
        '리스너 1',
        '리스너 2',
        'click() 뒤',
        '마이크로태스크 1',
        '마이크로태스크 2',
      ],
    },
    {
      id: 'message-listeners',
      file: 'message-listeners.html',
      runtime: 'browser',
      expectedOutput: [
        '스크립트 끝',
        '리스너 1',
        '마이크로태스크 1',
        '리스너 2',
        '마이크로태스크 2',
      ],
    },
  ],
  simplifications: [
    '콜 스택은 실행 컨텍스트를 이름으로만 그리고, 호스트 함수(setTimeout, queueMicrotask, console.log 등)의 프레임은 그리지 않습니다.',
    '시뮬레이터에서 타이머가 대기 칸에서 태스크 큐로 옮겨 가는 순간은 그림을 위해 고른 것이며, 실제 시각은 관찰할 수 없습니다. 보장되는 것은 실행 순서뿐입니다.',
    '태스크 큐를 한 줄로 그립니다. 실제 브라우저는 여러 태스크 큐를 가지고 어느 큐에서 태스크를 고를지는 구현이 정하며, 표준은 고른 큐에서 실행할 수 있는(runnable) 첫 태스크를 꺼낸다고 씁니다.',
    '표준은 마이크로태스크를 실행하는 동안 이벤트 루프의 현재 실행 중인 태스크(currently running task)를 그 마이크로태스크로 바꿉니다. 마이크로태스크 하나를 실행한 뒤에는 그 값을 null로 되돌립니다. 그림의 지금 태스크는 어느 태스크의 단계를 실행하는 중인지를 보여 주므로, 체크포인트 동안과 그 뒤에도 감싼 태스크를 그대로 보여 줍니다.',
    '처리 모델이 태스크의 단계를 실행한 뒤에 하는 마이크로태스크 체크포인트는, 그 전에 스택이 비면서 이미 큐를 비웠다면 실행할 마이크로태스크가 없으므로 따로 그리지 않습니다. 큐가 빈 채로 하는 체크포인트도 그리지 않습니다.',
    '스크립트 실행을 "스크립트 태스크" 하나로 그립니다. 표준은 HTML 파서가 바이트를 처리하는 일을 대개(typically) 태스크라고 서술하며, 이 페이지는 그 서술을 단순화했습니다.',
    'HTML 파서가 script 종료 태그를 처리할 때처럼, 표준에는 이 페이지가 설명한 두 곳(스크립트·콜백 뒤 정리 단계, 처리 모델) 말고도 마이크로태스크 체크포인트를 하는 곳이 있습니다. 이 페이지의 예제는 두 곳으로 설명할 수 있어 나머지는 다루지 않습니다.',
    '체크포인트 안에서 일어나는 처리되지 않은 거부 알림, IndexedDB 트랜잭션 정리, ClearKeptObjects 단계와, 이벤트 루프를 돌려 마이크로태스크가 태스크 큐로 옮겨지는 경우는 다루지 않습니다.',
    '렌더링 갱신과 requestAnimationFrame, MutationObserver는 다루지 않습니다.',
    'async/await, try...catch와 전역 에러 이벤트는 별도 개념(작성 예정)에서 다룹니다.',
    '이 페이지의 테스트는 브라우저의 입력 경로를 거치는 사용자 입력(클릭 등)을 만들지 않습니다. 사용자 입력 이벤트에서 리스너마다 체크포인트가 일어난다는 것은 표준 서술을 근거로 설명하며, 이 페이지의 테스트로 확인하지 않았습니다.',
    '예제 4의 설명(앞 콜백의 Job이 끝날 때 곧바로 다음 then의 Job이 들어감)은 콜백이 프로미스(thenable)가 아닌 값을 반환하는 경우입니다. 콜백이 프로미스를 반환하면 프로미스의 채택 절차 때문에 다음 Job이 들어가는 때가 달라지며, 이 페이지는 그 경우의 순서를 다루지 않습니다.',
    '마이크로태스크 콜백이 끝나 스택이 빌 때도 정리 단계가 체크포인트를 부르지만, 이미 체크포인트를 하는 중이면 바로 돌아갑니다(재진입 방지). 그림은 이를 하나의 체크포인트로 그립니다.',
    '예제 3은 정확한 시간을 주장하지 않고 실행 순서만 확인합니다.',
    '예제 4(two-chains)를 뺀 예제의 실행 결과는 Chromium에서 실행한 값이며, 다른 브라우저는 이 페이지에서 확인하지 않았습니다. 예제 4는 타이머·DOM 같은 호스트의 스케줄링 API 없이(출력용 console.log만 사용) Node의 vm에서 ECMAScript 코드로 실행한 값이고, 그 순서는 ECMAScript가 정하는 부분입니다. 그 밖에 Node.js의 이벤트 루프와 큐는 다루지 않습니다. setTimeout, queueMicrotask, console, postMessage, DOM은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — Event loop processing model',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model',
    },
    {
      label: 'WHATWG HTML — microtask queue',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#microtask-queue',
    },
    {
      label: 'WHATWG HTML — Clean up after running script',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#clean-up-after-running-script',
    },
    {
      label: 'WHATWG HTML — HostEnqueuePromiseJob',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#hostenqueuepromisejob',
    },
    {
      label: 'WHATWG HTML — queue a microtask',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#queue-a-microtask',
    },
    {
      label: 'WHATWG HTML — Microtask queuing',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#microtask-queuing',
    },
    {
      label: 'WHATWG HTML — queueMicrotask()',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-queuemicrotask',
    },
    {
      label: 'WHATWG HTML — posted message task source',
      url: 'https://html.spec.whatwg.org/multipage/web-messaging.html#posted-message-task-source',
    },
    {
      label: 'WHATWG Web IDL — invoke a callback function',
      url: 'https://webidl.spec.whatwg.org/#invoke-a-callback-function',
    },
    {
      label: 'WHATWG Web IDL — call a user object’s operation',
      url: 'https://webidl.spec.whatwg.org/#call-a-user-objects-operation',
    },
    {
      label: 'ECMAScript — HostEnqueuePromiseJob',
      url: 'https://tc39.es/ecma262/#sec-hostenqueuepromisejob',
    },
    {
      label: 'ECMAScript — PerformPromiseThen',
      url: 'https://tc39.es/ecma262/#sec-performpromisethen',
    },
    {
      label: 'ECMAScript — TriggerPromiseReactions',
      url: 'https://tc39.es/ecma262/#sec-triggerpromisereactions',
    },
    {
      label: 'ECMAScript — NewPromiseReactionJob',
      url: 'https://tc39.es/ecma262/#sec-newpromisereactionjob',
    },
    {
      label: 'ECMAScript — Jobs and Host Operations to Enqueue Jobs',
      url: 'https://tc39.es/ecma262/#sec-jobs',
    },
    {
      label: 'MDN — 마이크로태스크 가이드',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/HTML_DOM_API/Microtask_guide',
    },
    {
      label: 'MDN — queueMicrotask()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/queueMicrotask',
    },
  ],
  reviewedAt: '2026-11-05',
} satisfies ConceptMeta
