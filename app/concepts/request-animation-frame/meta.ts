import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'request-animation-frame',
  title: 'requestAnimationFrame: 콜백 안에서 다시 부르면 왜 다음 프레임에 실행될까',
  summary:
    'requestAnimationFrame 콜백이 실행되는 때와 순서, 같은 프레임의 타임스탬프, 콜백 사이의 마이크로태스크, cancelAnimationFrame, 예외를 HTML 표준과 Chromium 실행으로 확인합니다.',
  category: 'async',
  order: 441,
  tags: [
    'requestAnimationFrame',
    'cancelAnimationFrame',
    '애니메이션 프레임',
    '렌더링 갱신',
    '프레임',
    '타임스탬프',
    'handle',
    '애니메이션 루프',
    '호스트 API',
  ],
  goals: [
    'requestAnimationFrame이 콜백을 부르지 않고 콜백 맵에 넣고 handle 번호를 돌려주며, 콜백은 렌더링 갱신 태스크 안에서 실행된다는 점을 설명하고, 이것이 ECMAScript가 아니라 HTML 표준이 정하는 호스트의 동작임을 구분해서 말할 수 있다.',
    '한 번의 실행(run)은 시작할 때 맵의 handle 목록을 먼저 얻고 그 목록의 콜백만 처리하므로, 콜백 안에서 다시 부른 requestAnimationFrame의 콜백이 같은 프레임이 아니라 다음 프레임에 실행되는 이유를 설명할 수 있다.',
    '같은 프레임의 콜백이 모두 같은 타임스탬프를 받고, 콜백이 오래 걸려도 그 값이 바뀌지 않는 이유를 설명하며, 다음 프레임의 타임스탬프가 엄격히 커지는 것은 표준이 보장하는 것이 아니라 Chromium에서 관찰한 결과임을 구분해서 말할 수 있다.',
    '콜백 하나가 끝날 때마다 스택이 비어 마이크로태스크 체크포인트가 일어나므로, 앞 콜백이 넣은 마이크로태스크가 다음 콜백보다 먼저 실행되는 이유를 설명할 수 있다.',
    '실행 중인 콜백의 handle은 맵에서 이미 지워진 상태라는 점과 함께, cancelAnimationFrame이 프레임 시작 전과 프레임 중(앞 콜백이 뒤 콜백을 취소)에 모두 효력이 있는 이유, 없는 handle을 취소해도 오류가 아닌 이유, handle이 1부터 시작하는 점을 설명할 수 있다.',
    '콜백 안의 예외는 보고되지만 같은 프레임의 다음 콜백은 계속 실행되는 점과, 콜백이 스스로 다시 등록해야 애니메이션 루프가 이어지는 점을 실행 결과로 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '이벤트 루프와 태스크 큐', slug: 'event-loop' },
    { label: '마이크로태스크 큐', slug: 'microtask-queue' },
    { label: '타이머', slug: 'timers' },
  ],
  related: ['event-loop', 'microtask-queue', 'timers', 'error-handling'],
  examples: [
    {
      id: 'same-timestamp',
      file: 'same-timestamp.html',
      runtime: 'browser',
      expectedOutput: ['2 true'],
    },
    {
      id: 'next-frame',
      file: 'next-frame.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 끝', 'raf1', 'raf2', 'raf3 true'],
    },
    {
      id: 'microtask-between',
      file: 'microtask-between.html',
      runtime: 'browser',
      expectedOutput: ['스크립트 끝', 'raf1', 'then', 'raf2'],
    },
    {
      id: 'cancel',
      file: 'cancel.html',
      runtime: 'browser',
      expectedOutput: ['B', 'D'],
    },
    {
      id: 'handles',
      file: 'handles.html',
      runtime: 'browser',
      expectedOutput: ['1 2', '취소 끝'],
    },
    {
      id: 'callback-error',
      file: 'callback-error.html',
      runtime: 'browser',
      expectedOutput: ['error 이벤트 boom', 'raf2 true'],
    },
    {
      id: 'animation-loop',
      file: 'animation-loop.html',
      runtime: 'browser',
      settleMs: 1000,
      expectedOutput: ['5 true'],
    },
  ],
  simplifications: [
    '예제 결과는 Chromium(헤드리스)에서 실행한 값이며, 다른 브라우저는 이 페이지에서 확인하지 않았습니다. requestAnimationFrame, cancelAnimationFrame, performance, console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
    '렌더링 기회(rendering opportunity)가 오는 때는 표준이 특정 모델을 정하지 않아 미리 알 수 없고 간격도 보장되지 않습니다(지나간 렌더링 기회의 시각은 콜백이 받는 타임스탬프로 전달됩니다). 시뮬레이터에서 렌더링 갱신 태스크가 시작되는 순간은 그림을 위해 고른 것이고, 보장되는 것은 그림에 나온 콜백의 실행 순서입니다.',
    '뒤 프레임에서 받는 타임스탬프가 앞 프레임보다 엄격히 크다는 결과(예제 2의 raf3 true, 예제 7의 5 true)는 Chromium에서 관찰한 값입니다. 표준이 정하는 것은 다시 등록한 콜백이 다음 실행에서 실행된다는 것까지이고, 그 타임스탬프가 앞 프레임보다 크다는 것은 정하지 않습니다. 같은 프레임의 콜백이 같은 타임스탬프를 받는다는 것(예제 1, 예제 6의 raf2 true)은 표준의 서술입니다.',
    '예제 6에서 같은 프레임의 다음 콜백(raf2)이 실행되는 것은 표준이 서술하는 동작입니다. Web IDL 서술로는 정리 단계(스택이 비면 마이크로태스크 체크포인트)가 먼저이고 예외 보고가 그다음입니다. 이 페이지는 이 순서를 실행으로 확인하지 않았습니다.',
    '예제 6의 throw, 전역 error 이벤트, preventDefault는 try/catch/finally 개념에서 다룹니다.',
    '렌더링 갱신(update the rendering)의 다른 단계(resize·scroll 이벤트 전달, 스타일 계산, 레이아웃, 그리기, ResizeObserver 등)는 다루지 않고 그림에서 생략했습니다. 워커의 requestAnimationFrame(OffscreenCanvas 등)도 다루지 않습니다.',
    '스크립트 실행을 "스크립트 태스크" 하나로 그립니다. 표준은 HTML 파서가 바이트를 처리하는 일을 대개(typically) 태스크라고 서술하며, 이 페이지는 그 서술을 단순화했습니다.',
    '시뮬레이터는 태스크 큐를 그리지 않고, 콜 스택은 실행 컨텍스트를 이름으로만 그리며 호스트 함수(requestAnimationFrame, console.log 등)의 스택 프레임은 그리지 않습니다. 프레임을 렌더링 갱신 태스크 한 번(그 안의 애니메이션 프레임 콜백 실행 한 번)으로 그립니다.',
    '표준은 가시성 상태가 hidden인 문서를 렌더링 갱신 대상에서 뺀다고 서술하지만, 이 페이지는 그 동작을 실행으로 확인하지 않았고 다루지 않습니다. 예제는 모두 보이는 문서에서 실행됩니다.',
    'requestAnimationFrame 콜백과 setTimeout(fn, 0) 콜백 중 무엇이 먼저 실행되는지는 표준이 정하지 않으며(렌더링 기회 모델이 지정되지 않고 어느 태스크 큐를 고를지는 구현이 정합니다), 이 페이지는 주장하지 않고 예제 출력에도 넣지 않았습니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — Animation frames',
      url: 'https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames',
    },
    {
      label: 'WHATWG HTML — Event loop processing model (update the rendering)',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering',
    },
    {
      label: 'WHATWG HTML — Rendering opportunity',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#rendering-opportunity',
    },
    {
      label: 'WHATWG HTML — Clean up after running script',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#clean-up-after-running-script',
    },
    {
      label: 'WHATWG Web IDL — invoke a callback function',
      url: 'https://webidl.spec.whatwg.org/#invoke-a-callback-function',
    },
    {
      label: 'MDN — Window: requestAnimationFrame() 메서드',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/requestAnimationFrame',
    },
    {
      label: 'MDN — Window: cancelAnimationFrame() 메서드',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Window/cancelAnimationFrame',
    },
  ],
  reviewedAt: '2026-11-19',
} satisfies ConceptMeta
