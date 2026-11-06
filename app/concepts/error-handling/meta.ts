import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'error-handling',
  title: 'try/catch/finally: finally의 return은 왜 try의 return을 덮어쓸까',
  summary:
    'finally가 앞선 return과 throw를 덮거나 그대로 두는 규칙을 완료로 설명하고, try 밖에서 난 에러와 거부가 error·unhandledrejection 이벤트로 가는 흐름을 확인합니다.',
  category: 'execution',
  order: 470,
  tags: [
    'try',
    'catch',
    'finally',
    'throw',
    '예외',
    '에러',
    '완료',
    'Completion Record',
    'return await',
    'error 이벤트',
    'unhandledrejection',
    'rejectionhandled',
  ],
  goals: [
    'try 블록에서 return해도 finally 블록은 실행되고, finally가 정상 완료하면 try의 return이 그대로 try 문의 결과가 된다는 것을 실행 결과로 설명할 수 있다.',
    'finally 안의 return, break, continue, throw는 앞선 return이나 throw를 버리고 자신이 try 문의 결과가 되는 이유를, 명세의 설명 장치인 완료(정상·return·throw·break 등)로 설명할 수 있다.',
    'return x 뒤 finally에서 x를 재할당해도 반환값이 바뀌지 않고, 같은 객체를 변경하면 반환된 객체에서 보이는 이유를, return이 식을 평가한 값이 완료에 담긴다는 규칙으로 설명할 수 있다.',
    '에러가 호출 스택을 따라 바깥으로 전파되며 catch가 없는 try...finally는 예외를 그대로 내보낸다는 점, 에러가 아닌 값도 던질 수 있다는 점, 내장 에러 타입을 instanceof로 구분하는 방법, 바인딩 없는 catch를 실행 결과로 설명할 수 있다.',
    'async 함수의 try에서 return p는 p의 거부를 잡지 못하고 return await p는 잡으며 finally가 p를 기다리지 않거나 기다린 뒤에 실행되는 이유를, async 함수의 return이 프로미스를 기다리지 않는다는 규칙으로 설명할 수 있다.',
    '타이머 콜백의 throw는 바깥 try에 잡히지 않고 전역 error 이벤트로 가며, 처리되지 않은 거부는 unhandledrejection으로 가고, 마이크로태스크 안에서 잡으면 이벤트가 없으며 뒤늦게 잡으면 rejectionhandled가 일어나는 흐름을 HTML 표준과 실행 결과로 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '실행 컨텍스트', slug: 'execution-context' },
    { label: '프로미스', slug: 'promise' },
    { label: '마이크로태스크 큐', slug: 'microtask-queue' },
    { label: '타이머', slug: 'timers' },
    { label: 'async/await', slug: 'async-await' },
  ],
  related: [
    'execution-context',
    'promise',
    'microtask-queue',
    'timers',
    'async-await',
    'event-loop',
  ],
  examples: [
    {
      id: 'finally-runs',
      file: 'finally-runs.js',
      runtime: 'ecmascript',
      expectedOutput: ['try', 'finally', 'return 값'],
    },
    {
      id: 'finally-return',
      file: 'finally-return.js',
      runtime: 'ecmascript',
      expectedOutput: ['finally'],
    },
    {
      id: 'value-fixed',
      file: 'value-fixed.js',
      runtime: 'ecmascript',
      expectedOutput: ['finally x = 2', '1'],
    },
    {
      id: 'same-object',
      file: 'same-object.js',
      runtime: 'ecmascript',
      expectedOutput: ['1', '2'],
    },
    {
      id: 'swallow',
      file: 'swallow.js',
      runtime: 'ecmascript',
      expectedOutput: ['삼킴', '루프 뒤', 'finally의 예외'],
    },
    {
      id: 'propagate',
      file: 'propagate.js',
      runtime: 'ecmascript',
      expectedOutput: ['middle finally', '잡음: 전파', '이어서 실행'],
    },
    {
      id: 'throw-values',
      file: 'throw-values.js',
      runtime: 'ecmascript',
      expectedOutput: ['string', 'TypeError', 'true', 'true', '바인딩 없는 catch'],
    },
    {
      id: 'return-await',
      file: 'return-await.js',
      runtime: 'ecmascript',
      expectedOutput: ['withAwait 이행: catch가 잡음', 'noAwait 거부: 거부'],
    },
    {
      id: 'return-finally-order',
      file: 'return-finally-order.js',
      runtime: 'ecmascript',
      expectedOutput: [
        'noAwait finally',
        'noAwait 결과 정해짐',
        'withAwait 결과 정해짐',
        'withAwait finally',
      ],
    },
    {
      id: 'timer-error',
      file: 'timer-error.js',
      runtime: 'browser',
      expectedOutput: ['try 끝', '스크립트 끝', 'error 이벤트: 타이머 안', '다음 타이머'],
    },
    {
      id: 'unhandled-rejection',
      file: 'unhandled-rejection.js',
      runtime: 'browser',
      expectedOutput: ['try 끝', '스크립트 끝', 'unhandledrejection: 거부'],
    },
    {
      id: 'handled-in-microtask',
      file: 'handled-in-microtask.js',
      runtime: 'browser',
      expectedOutput: ['마이크로태스크에서 잡음'],
    },
    {
      id: 'late-handler',
      file: 'late-handler.js',
      runtime: 'browser',
      expectedOutput: ['unhandledrejection', '뒤늦게 잡음', 'rejectionhandled'],
    },
  ],
  simplifications: [
    '완료(Completion Record)는 명세가 동작을 설명하려고 쓰는 장치이며, 엔진이 이런 레코드를 실제로 만든다는 뜻이 아닙니다. 시뮬레이터의 블록의 완료 칸은 이 설명 장치를 보여 줍니다.',
    '시뮬레이터는 catch 블록이 없는 try...finally만 단계별로 보입니다. catch를 거치는 경우(catch의 완료가 try 문의 결과 후보가 되는 단계)는 본문과 예제로 설명하며 시뮬레이터에는 없습니다.',
    '시뮬레이터의 실행 컨텍스트 스택은 사용자 함수와 전역 코드만 그립니다. 내장 함수(console.log 등)의 프레임은 그리지 않습니다.',
    '전역 error·unhandledrejection 예제는 리스너에서 항상 preventDefault()를 부릅니다. 이 페이지의 실행 환경은 보고된 에러를 실패로 처리하기 때문입니다. 따라서 취소하지 않으면 사용자 에이전트가 콘솔에 보고할 수 있다는 부분은 HTML 표준의 서술로만 설명하며, 예제로 실행해 보이지 않습니다.',
    'Error의 cause, AggregateError, stack(ECMAScript 표준이 아닌 비표준 속성), 사용자 정의 에러 클래스는 다루지 않습니다.',
    'instanceof는 같은 realm의 내장 에러와 기본 동작(프로토타입 체인 확인)만 다룹니다. 다른 realm에서 만든 에러나 Symbol.hasInstance를 정의한 경우는 결과가 다를 수 있습니다.',
    'catch 매개변수의 구조 분해가 던지는 경우(catch 블록이 평가되지 않음)는 다루지 않습니다.',
    '스크립트 최상위에서 잡히지 않은 예외와 onerror 핸들러 속성, 다른 출처 스크립트의 Script error., 워커의 에러, Node.js의 process 이벤트, 최상위 await는 다루지 않습니다.',
    '명세 링크는 현재 초안을 가리키고, 인용은 ES2026판과 현재 초안에 똑같이 있는 문장만 씁니다. TryStatement와 throw 문의 평가 단계는 판마다 변수 이름과 문장이 다르므로 인용하지 않고 풀어서 설명합니다. HTML 표준은 현재 판에서 인용합니다.',
    'try, catch, finally, throw와 Error는 ECMAScript 언어의 동작이고, error·unhandledrejection·rejectionhandled 이벤트, 타이머, console은 호스트가 제공하는 API입니다. 언어 예제 9개는 Node.js의 vm에서, 브라우저 예제 4개는 Chromium에서 실행한 값이며 다른 브라우저는 확인하지 않았습니다.',
    '브라우저 예제의 출력 순서는 각 예제에서 순서가 표준으로 정해지는 근거(같은 지연의 타이머는 등록 순서, 이벤트 리스너 안에서 예약한 타이머 등)로 구성한 것이며, 다른 태스크 소스 사이의 순서를 일반 규칙으로 주장하지 않습니다.',
  ],
  references: [
    {
      label: 'ECMAScript — The try Statement',
      url: 'https://tc39.es/ecma262/#sec-try-statement',
    },
    {
      label: 'ECMAScript — Runtime Semantics: Evaluation (try 문)',
      url: 'https://tc39.es/ecma262/#sec-try-statement-runtime-semantics-evaluation',
    },
    {
      label: 'ECMAScript — The throw Statement',
      url: 'https://tc39.es/ecma262/#sec-throw-statement',
    },
    {
      label: 'ECMAScript — The return Statement',
      url: 'https://tc39.es/ecma262/#sec-return-statement',
    },
    {
      label: 'ECMAScript — The Completion Record Specification Type',
      url: 'https://tc39.es/ecma262/#sec-completion-record-specification-type',
    },
    {
      label: 'ECMAScript — Error Objects',
      url: 'https://tc39.es/ecma262/#sec-error-objects',
    },
    {
      label: 'ECMAScript — Native Error Types Used in This Standard',
      url: 'https://tc39.es/ecma262/#sec-native-error-types-used-in-this-standard',
    },
    {
      label: 'ECMAScript — HostPromiseRejectionTracker',
      url: 'https://tc39.es/ecma262/#sec-host-promise-rejection-tracker',
    },
    {
      label: 'ECMAScript — Await',
      url: 'https://tc39.es/ecma262/#await',
    },
    {
      label: 'ECMAScript — AsyncBlockStart',
      url: 'https://tc39.es/ecma262/#sec-asyncblockstart',
    },
    {
      label: 'Web IDL — Invoke a callback function',
      url: 'https://webidl.spec.whatwg.org/#invoke-a-callback-function',
    },
    {
      label: 'WHATWG HTML — Report an exception',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#report-an-exception',
    },
    {
      label: 'WHATWG HTML — Unhandled promise rejections',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#unhandled-promise-rejections',
    },
    {
      label: 'WHATWG HTML — HostPromiseRejectionTracker',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#the-hostpromiserejectiontracker-implementation',
    },
    {
      label: 'WHATWG HTML — Notify about rejected promises',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#notify-about-rejected-promises',
    },
    {
      label: 'WHATWG HTML — The PromiseRejectionEvent interface',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#the-promiserejectionevent-interface',
    },
    {
      label: 'WHATWG HTML — Timer initialization steps',
      url: 'https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps',
    },
    {
      label: 'MDN — try...catch',
      url: 'https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Statements/try...catch',
    },
    {
      label: 'MDN — Window: error 이벤트',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event',
    },
    {
      label: 'MDN — Window: unhandledrejection 이벤트',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event',
    },
  ],
  reviewedAt: '2026-11-06',
} satisfies ConceptMeta
