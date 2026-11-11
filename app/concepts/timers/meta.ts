import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'timers',
  title: '타이머: setTimeout(fn, 0)은 왜 바로 실행되지 않을까',
  summary:
    'setTimeout은 콜백을 태스크로 예약해 지금 실행 중인 코드가 끝난 뒤에 부릅니다. 0ms여도 늦게 실행되는 이유, 실행 순서, clearTimeout과 clearInterval, this와 지연 값 변환, 디바운스를 HTML 표준과 Chromium 실행으로 확인합니다.',
  category: 'async',
  order: 400,
  tags: [
    '타이머',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    '태스크',
    '디바운스',
    '호스트 API',
  ],
  goals: [
    'setTimeout(fn, 0)의 콜백이 0ms여도 지금 실행 중인 스크립트가 끝난 뒤에 실행되는 이유를 HTML 표준의 timer initialization steps(콜백을 태스크로 예약)로 설명하고, 동기 코드가 오래 걸리면 타이머가 그만큼 늦어지는 이유와 지연 값이 "최소한 이만큼"이라는 뜻임을 설명할 수 있다.',
    '먼저 등록했고 지연이 같거나 짧은 타이머가 먼저 실행된다는 표준의 순서 규칙과, 나중에 등록한 더 짧은 타이머가 먼저 실행되는 것처럼 표준이 보장하지 않고 Chromium에서 관찰한 결과를 구분해서 말할 수 있다.',
    'setTimeout이 돌려주는 id가 0보다 큰 정수라는 규칙과 그 규칙 때문에 clearTimeout(0)이 안전한 이유, clearTimeout과 clearInterval이 같은 맵에서 항목을 지우므로 서로 바꿔 써도 되는 이유, 이미 지워진 id나 없는 id를 지워도 오류가 없는 이유를 설명할 수 있다.',
    '타이머 콜백에 세 번째 인수부터 전달되는 값과, strict mode 함수도 타이머 콜백으로 불리면 this가 window인 이유, 메서드를 그대로 넘기면 객체를 잃는 이유와 해결 방법을 설명할 수 있다.',
    '지연 값이 Web IDL long 변환을 거쳐 문자열은 숫자로, NaN은 0으로 바뀌고, 32비트 범위를 넘는 2 ** 31은 음수가 된 뒤 음수를 0으로 바꾸는 규칙 때문에 곧바로 실행되는 이유를 설명하고, clearTimeout을 이용한 디바운스가 클로저로 timer 변수를 기억하는 방식을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: 'this', slug: 'this-binding' },
    { label: '클로저', slug: 'closure' },
  ],
  related: ['this-binding', 'closure', 'global-object', 'promise', 'microtask-queue'],
  examples: [
    {
      id: 'sync-first',
      file: 'sync-first.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 시작', 'setTimeout 다음 줄', '스크립트 끝', '타이머 0ms'],
    },
    {
      id: 'blocking',
      file: 'blocking.html',
      runtime: 'browser',
      expectedOutput: ['동기 코드 끝, 50ms 이상 지남 true', '타이머 실행, 50ms 이상 지남 true'],
    },
    {
      id: 'same-delay',
      file: 'same-delay.html',
      runtime: 'browser',
      expectedOutput: ['c 0ms', 'a 50ms', 'b 50ms', 'd 50ms'],
    },
    {
      id: 'clear',
      file: 'clear.html',
      runtime: 'browser',
      expectedOutput: [
        'id number true true',
        '없는 id를 지워도 오류 없음',
        'b 실행',
        'd가 c를 지움',
      ],
    },
    {
      id: 'interval',
      file: 'interval.html',
      runtime: 'browser',
      expectedOutput: ['등록 끝', 'tick 1', 'tick 2', 'tick 3'],
    },
    {
      id: 'args-this',
      file: 'args-this.html',
      runtime: 'browser',
      expectedOutput: [
        'strict 직접 호출 this undefined',
        '인수 x y',
        'strict 콜백 this는 window true',
        'hello undefined',
        'hello kim',
        'hello kim',
      ],
    },
    {
      id: 'delay-convert',
      file: 'delay-convert.html',
      runtime: 'browser',
      expectedOutput: [
        '2 ** 31',
        '-100',
        'NaN',
        'Infinity',
        '문자열 30',
        '2 ** 32 + 30',
        '200ms 타이머',
      ],
    },
    {
      id: 'debounce',
      file: 'debounce.html',
      runtime: 'browser',
      expectedOutput: ['반복 끝', '저장 초안5 1번째', '저장 최종 2번째'],
    },
  ],
  simplifications: [
    '이벤트 루프와 태스크 큐가 태스크를 고르고 처리하는 순서는 이벤트 루프와 태스크 큐 개념에서 다룹니다. 이 페이지는 "타이머 콜백은 태스크로 큐에 들어가 지금 실행 중인 코드가 끝난 뒤에 실행된다" 수준까지만 설명합니다.',
    'Promise와 마이크로태스크는 이 페이지에서 다루지 않고 프로미스 개념과 마이크로태스크 큐 개념에서 다룹니다.',
    '정확한 밀리초 값은 주장하지 않고, "50ms 이상 지났다" 같은 하한과 실행 순서만 확인합니다.',
    '예제 3에서 나중에 등록한 0ms 타이머가 먼저 등록한 50ms 타이머보다 먼저 실행되는 것은 Chromium에서 관찰한 결과입니다. 표준은 먼저 등록했고 지연이 같거나 짧은 타이머가 먼저라는 순서만 정하며, 나중에 등록한 타이머가 지연이 짧다는 이유로 먼저 실행된다고 보장하지 않습니다.',
    '중첩 단계가 5를 넘으면 4ms보다 짧은 지연을 4ms로 올리는 timer initialization steps의 단계는 인용으로만 소개하고 실행으로 확인하지 않았습니다.',
    '현행 표준은 지운 id가 나중에 다시 쓰일 수 있는 경우를 위해 id와 함께 내부 값(uniqueHandle)도 비교하지만, 이 페이지는 id 확인 단계만 설명합니다.',
    'setInterval이 다음 콜백을 실행하기까지의 실제 간격은 다루지 않습니다. 콜백이 끝난 뒤 같은 id로 다시 예약된다는 점만 설명합니다.',
    '문자열 handler(setTimeout("코드", 0))의 컴파일과 Trusted Types, CSP는 다루지 않습니다.',
    '백그라운드 탭이나 절전 상태에서 브라우저가 타이머를 더 늦추는 정책은 다루지 않습니다.',
    'Node의 동작(setTimeout이 Timeout 객체를 돌려주는 것, 2147483647보다 큰 지연을 1로 바꾸는 것)은 Node 공식 문서를 근거로 한 설명이며, 이 사이트의 실행기로 확인하지 않았습니다.',
    '워커의 타이머와 requestAnimationFrame, queueMicrotask는 다루지 않습니다.',
    '스로틀(throttle)은 디바운스와의 차이를 이름으로만 언급하고 예제를 두지 않습니다.',
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 다른 브라우저는 이 페이지에서 확인하지 않았습니다. 예제의 setTimeout, console, performance는 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — setTimeout()',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-settimeout',
    },
    {
      label: 'WHATWG HTML — setInterval()',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-setinterval',
    },
    {
      label: 'WHATWG HTML — clearTimeout()',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-cleartimeout',
    },
    {
      label: 'WHATWG HTML — timer initialization steps',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps',
    },
    {
      label: 'WHATWG HTML — run steps after a timeout',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#run-steps-after-a-timeout',
    },
    {
      label: 'WHATWG HTML — map of setTimeout and setInterval IDs',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#map-of-settimeout-and-setinterval-ids',
    },
    {
      label: 'WHATWG HTML — timer nesting level',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-nesting-level',
    },
    {
      label: 'Web IDL — long 타입 변환',
      url: 'https://webidl.spec.whatwg.org/#js-long',
    },
    {
      label: 'Web IDL — ConvertToInt',
      url: 'https://webidl.spec.whatwg.org/#abstract-opdef-converttoint',
    },
    {
      label: 'Node.js — setTimeout(callback[, delay[, ...args]])',
      url: 'https://nodejs.org/api/timers.html#settimeoutcallback-delay-args',
    },
    {
      label: 'Node.js — Class: Timeout',
      url: 'https://nodejs.org/api/timers.html#class-timeout',
    },
    {
      label: 'Node.js — clearTimeout(timeout)',
      url: 'https://nodejs.org/api/timers.html#cleartimeouttimeout',
    },
    {
      label: 'MDN — setTimeout()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/setTimeout',
    },
    {
      label: 'MDN — setInterval()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/setInterval',
    },
    {
      label: 'MDN — clearTimeout()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/clearTimeout',
    },
    {
      label: 'MDN — clearInterval()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/clearInterval',
    },
  ],
  reviewedAt: '2026-11-04',
} satisfies ConceptMeta
