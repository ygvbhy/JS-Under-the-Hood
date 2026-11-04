import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'event-loop',
  title: '이벤트 루프와 태스크 큐: 준비된 콜백은 왜 지금 코드가 끝날 때까지 기다릴까',
  summary:
    '브라우저의 이벤트 루프는 태스크 큐에서 태스크를 하나씩 꺼내 끝까지 실행합니다. 동기 코드와 타이머 콜백의 순서, 블로킹, 콜백 안의 예약, click()이 큐를 거치지 않는 이유, 태스크 소스별 순서를 HTML 표준과 Chromium 실행으로 확인합니다.',
  category: 'async',
  order: 410,
  tags: [
    '이벤트 루프',
    '태스크 큐',
    '태스크',
    '콜 스택',
    '블로킹',
    'run-to-completion',
    '태스크 소스',
    '호스트 API',
  ],
  goals: [
    '브라우저의 이벤트 루프가 태스크 큐에서 태스크를 하나 꺼내 그 단계를 모두 실행한 뒤에야 다음 태스크를 고른다는 HTML 표준의 처리 모델을 설명하고, 이벤트 루프가 ECMAScript가 아니라 HTML 표준이 정하는 호스트의 동작임을 구분해서 말할 수 있다.',
    '스크립트 실행도 태스크 안에서 일어나고 타이머 콜백은 지연이 끝난 뒤 별도의 태스크가 되므로, 0ms 타이머도 동기 코드가 모두 끝난 뒤에 실행되고 동기 코드가 오래 걸리면 그만큼 늦어지는 이유를 설명할 수 있다.',
    '콜백 하나가 오래 걸리면 이미 준비된 다른 콜백도 기다리는 이유와, 콜백 안에서 등록한 0ms 타이머가 이미 큐에 있던 콜백 뒤에 실행되는 이유, 긴 작업을 setTimeout으로 쪼개면 그 사이에 다른 태스크가 실행되는 이유를 설명할 수 있다.',
    'click()이 큐를 거치지 않고 그 자리에서 이벤트를 디스패치하므로 리스너가 click() 다음 줄보다 먼저, 0ms 타이머보다도 먼저 실행되는 이유를 설명하고, 실제 사용자 입력은 사용자 상호작용 태스크 소스의 태스크로 들어온다는 표준 서술과 구분할 수 있다.',
    '태스크 소스마다 태스크 큐가 다를 수 있고 어느 큐를 고를지는 구현이 정하므로, 같은 소스 안의 순서(타이머 1 다음에 타이머 2)는 보장되지만 서로 다른 소스(타이머와 postMessage)의 순서는 표준이 보장하지 않는다는 점을 표준이 보장하는 것과 Chromium에서 관찰한 결과로 나누어 말할 수 있다.',
  ],
  prerequisites: [
    { label: '실행 컨텍스트', slug: 'execution-context' },
    { label: '타이머', slug: 'timers' },
  ],
  related: ['timers', 'execution-context', 'event-propagation-delegation'],
  examples: [
    {
      id: 'sync-and-timers',
      file: 'sync-and-timers.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 시작', '스크립트 끝', 'a 0ms', 'b 10ms'],
    },
    {
      id: 'long-task',
      file: 'long-task.html',
      runtime: 'browser',
      expectedOutput: ['a 끝', 'b, a가 50ms 이상 붙잡음 true'],
    },
    {
      id: 'nested',
      file: 'nested.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 끝', 'a 시작', 'a 끝', 'b', 'c'],
    },
    {
      id: 'chunks',
      file: 'chunks.html',
      runtime: 'browser',
      expectedOutput: ['조각 1', '다른 타이머', '조각 2', '조각 3'],
    },
    {
      id: 'click-sync',
      file: 'click-sync.html',
      runtime: 'browser',
      expectedOutput: ['click() 전', 'click 리스너', 'click() 뒤', '타이머 0ms'],
    },
    {
      id: 'task-sources',
      file: 'task-sources.html',
      runtime: 'browser',
      expectedOutput: ['타이머 1', 'message m', '타이머 2'],
    },
  ],
  simplifications: [
    '콜 스택은 실행 컨텍스트를 이름으로만 그리고, 호스트 함수(setTimeout, console.log)의 프레임은 그리지 않습니다.',
    '시뮬레이터에서 타이머가 대기 칸에서 태스크 큐로 옮겨 가는 순간은 그림을 위해 고른 것이며, 실제 시각은 관찰할 수 없습니다. 보장되는 것은 실행 순서뿐입니다.',
    '태스크 큐는 타이머 태스크 소스 하나로 그립니다. 실제 브라우저는 여러 태스크 큐를 가지고, 어느 큐에서 태스크를 고를지는 구현이 정합니다.',
    '스크립트 실행을 "스크립트 태스크" 하나로 그립니다. 표준은 HTML 파서가 바이트를 처리하는 태스크 안에서 스크립트가 실행된다고 서술하며, 이 페이지는 그 서술을 단순화했습니다.',
    '마이크로태스크 체크포인트와 Promise는 별도 개념이며 이 페이지에서 다루지 않습니다.',
    '표준은 고른 큐에서 실행할 수 있는(runnable) 첫 태스크를 꺼낸다고 쓰고, 그래서 태스크 큐를 큐가 아니라 집합(set)이라고 부릅니다. 이 페이지는 활성 창 하나만 다루므로 태스크 큐를 앞에서부터 꺼내는 줄로 그립니다.',
    '렌더링 갱신과 requestAnimationFrame은 다루지 않습니다.',
    '실제 사용자 입력은 만들지 않습니다. 입력 이벤트가 사용자 상호작용 태스크 소스의 태스크로 들어온다는 것은 표준 서술을 근거로만 설명하며 실행으로 확인하지 않았습니다.',
    '예제 6에서 message m이 타이머 1과 타이머 2 사이에 실행되는 것은 Chromium에서 관찰한 결과입니다. 표준이 보장하는 것은 같은 태스크 소스 안의 순서(타이머 1이 타이머 2보다 먼저)뿐입니다.',
    '정확한 밀리초 값은 주장하지 않고, "50ms 이상 붙잡았다" 같은 하한과 실행 순서만 확인합니다.',
    '워커와 여러 창이 이벤트 루프를 공유하는 경우는 다루지 않습니다.',
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 다른 브라우저는 이 페이지에서 확인하지 않았습니다. 예제의 setTimeout, console, performance, postMessage는 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — Event loops',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loops',
    },
    {
      label: 'WHATWG HTML — Event loop processing model',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model',
    },
    {
      label: 'WHATWG HTML — task',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#concept-task',
    },
    {
      label: 'WHATWG HTML — task queue',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#task-queue',
    },
    {
      label: 'WHATWG HTML — task source',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#concept-task-source',
    },
    {
      label: 'WHATWG HTML — Generic task sources',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#generic-task-sources',
    },
    {
      label: 'WHATWG HTML — user interaction task source',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#user-interaction-task-source',
    },
    {
      label: 'WHATWG HTML — queue a global task',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#queue-a-global-task',
    },
    {
      label: 'WHATWG HTML — timer task source',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-task-source',
    },
    {
      label: 'WHATWG HTML — click()',
      url: 'https://html.spec.whatwg.org/multipage/interaction.html#dom-click',
    },
    {
      label: 'WHATWG HTML — posted message task source',
      url: 'https://html.spec.whatwg.org/multipage/web-messaging.html#posted-message-task-source',
    },
    {
      label: 'ECMAScript — The Execution Context Stack',
      url: 'https://tc39.es/ecma262/#execution-context-stack',
    },
    {
      label: 'MDN — 자바스크립트 실행 모델',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Execution_model',
    },
    {
      label: 'MDN — HTMLElement.click()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/HTMLElement/click',
    },
    {
      label: 'MDN — Window.postMessage()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/postMessage',
    },
  ],
  reviewedAt: '2026-11-04',
} satisfies ConceptMeta
