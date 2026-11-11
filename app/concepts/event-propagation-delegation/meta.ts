import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'event-propagation-delegation',
  title: '이벤트 전파와 위임: 버튼을 눌렀는데 event.target은 왜 버튼이 아닐까',
  summary:
    '이벤트는 window에서 타깃까지 내려갔다가 다시 올라오며 경로를 두 번 지나고, 버블링하지 않는 이벤트는 올라올 때 타깃이 아닌 노드를 건너뜁니다. eventPhase, target과 currentTarget, 이벤트 위임을 DOM 표준과 Chromium 실행 결과로 확인합니다.',
  category: 'browser',
  order: 380,
  tags: [
    '이벤트 전파',
    '이벤트 위임',
    '버블링',
    '캡처링',
    'eventPhase',
    'target',
    'currentTarget',
    'addEventListener',
    'closest',
    'DOM',
  ],
  goals: [
    '이벤트가 경로를 캡처 순회와 버블 순회로 두 번 지나가며 eventPhase가 1, 2, 3으로 바뀌는 과정을 DOM 표준의 디스패치 규칙으로 설명하고, 타깃에서는 캡처 리스너가 먼저 불리는 이유를 설명할 수 있다.',
    'target과 currentTarget의 차이를 구분하고, 버튼 안의 아이콘을 눌렀을 때 버튼 리스너에서 e.target이 아이콘이 되는 이유와 currentTarget으로 해결하는 방법을 설명할 수 있다.',
    '이벤트 위임에서 상위 요소 하나의 리스너와 closest로 클릭한 버튼을 찾는 방법, 나중에 추가한 요소도 처리되는 이유, 버블링하지 않는 이벤트(focus, bubbles 기본값 false)가 위임에서 어떻게 달라지는지 설명할 수 있다.',
    '리스너 안의 this가 일반 함수에서는 currentTarget이고 화살표 함수에서는 바깥 this인 이유, onclick 어트리뷰트와 프로퍼티가 하나의 핸들러라는 점, 디스패치가 끝난 이벤트 객체의 값을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' },
    { label: 'this 바인딩', slug: 'this-binding' },
  ],
  related: [
    'dom-tree-nodes',
    'this-binding',
    'arrow-functions',
    'html-attribute-dom-property',
    'prevent-default-stop-propagation',
  ],
  examples: [
    {
      id: 'path-icon',
      file: 'path-icon.html',
      runtime: 'browser',
      expectedOutput: [
        '["icon","save","card","body","html","document","window"]',
        'card 캡처 1 icon card',
        'save 캡처 1 icon save',
        'save 버블 3 icon save',
        'card 버블 3 icon card',
        'document 버블 3 icon document',
        '끝 0 null',
      ],
    },
    {
      id: 'path-button',
      file: 'path-button.html',
      runtime: 'browser',
      expectedOutput: [
        '["save","card","body","html","document","window"]',
        'card 캡처 1 save card',
        'save 캡처 2 save save',
        'save 버블 2 save save',
        'card 버블 3 save card',
      ],
    },
    {
      id: 'target-pitfall',
      file: 'target-pitfall.html',
      runtime: 'browser',
      expectedOutput: ['heart undefined 42', 'like 42 42'],
    },
    {
      id: 'delegation',
      file: 'delegation.html',
      runtime: 'browser',
      expectedOutput: ['B copy', 'note 버튼 아님', 'BUTTON cut'],
    },
    {
      id: 'non-bubbling',
      file: 'non-bubbling.html',
      runtime: 'browser',
      expectedOutput: ['["focus 캡처","focusin 버블"]', 'false true', '["true:3"]'],
    },
    {
      id: 'this-in-handler',
      file: 'this-in-handler.html',
      runtime: 'browser',
      expectedOutput: ['true box go', 'true false'],
    },
    {
      id: 'handler-registration',
      file: 'handler-registration.html',
      runtime: 'browser',
      expectedOutput: [
        'function',
        '["프로퍼티B","리스너1","리스너2"]',
        "log.push('어트리뷰트')",
        '["리스너1","리스너2"]',
        '["리스너1","리스너2","프로퍼티C"]',
      ],
    },
    {
      id: 'after-dispatch',
      file: 'after-dispatch.html',
      runtime: 'browser',
      expectedOutput: ['3 card 6', '0 null save 0'],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 이벤트 전파 규칙은 WHATWG DOM 표준, 이벤트 핸들러는 WHATWG HTML 표준, focus와 focusin의 버블링 여부는 UI Events(W3C) 명세를 근거로 합니다.',
    '사용자의 실제 클릭 대신 click()과 dispatchEvent로 이벤트를 만듭니다. 이렇게 만든 이벤트는 isTrusted가 false이지만, 이 페이지에서 다루는 경로와 두 번의 순회 규칙은 isTrusted 값에 따라 달라지지 않습니다.',
    'preventDefault와 stopPropagation, stopImmediatePropagation, 같은 함수의 중복 등록은 이 페이지에서 다루지 않고 기본 동작과 전파 막기 개념으로 미룹니다.',
    'Shadow DOM, 리타기팅, composed는 다루지 않습니다. 이벤트 경로는 그림자 트리가 없는 문서를 기준으로 설명합니다.',
    'focus와 focusin은 UI Events(W3C) 명세를 근거로 하며 focusout과 blur는 다루지 않습니다.',
    '예제 5의 focus() 결과는 테스트가 문서에 포커스가 있는 상태로 실행한 값입니다. 창이나 문서가 포커스를 갖지 않은 상태(예: DevTools 콘솔에 입력 포커스가 있을 때)에서는 focus 관련 이벤트가 바로 발생하지 않아 결과가 다를 수 있으며, 이 페이지는 그 경우를 확인하지 않았습니다.',
    '리스너는 함수 대신 handleEvent 메서드를 가진 객체일 수도 있고, 그때 this는 currentTarget이 아니라 그 객체입니다. 이 페이지는 함수 리스너만 다룹니다.',
    '타깃에서 캡처 리스너가 먼저 불리는 규칙은 2019년 DOM 표준 변경으로 정해졌습니다. 각 브라우저가 이 변경을 따르기 시작한 시점은 이 페이지에서 확인하지 않았습니다.',
    '이벤트 핸들러 어트리뷰트의 스코프와 반환값 처리는 다루지 않습니다.',
    'once, passive, signal 같은 리스너 등록 옵션은 다루지 않습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG DOM — 이벤트 디스패치',
      url: 'https://dom.spec.whatwg.org/#concept-event-dispatch',
    },
    {
      label: 'WHATWG DOM — 이벤트 리스너 호출',
      url: 'https://dom.spec.whatwg.org/#concept-event-listener-invoke',
    },
    {
      label: 'WHATWG DOM — 이벤트 리스너 내부 호출',
      url: 'https://dom.spec.whatwg.org/#concept-event-listener-inner-invoke',
    },
    {
      label: 'WHATWG DOM — Event.eventPhase',
      url: 'https://dom.spec.whatwg.org/#dom-event-eventphase',
    },
    {
      label: 'WHATWG DOM — Event.target',
      url: 'https://dom.spec.whatwg.org/#dom-event-target',
    },
    {
      label: 'WHATWG DOM — Event.currentTarget',
      url: 'https://dom.spec.whatwg.org/#dom-event-currenttarget',
    },
    {
      label: 'WHATWG DOM — Event.composedPath()',
      url: 'https://dom.spec.whatwg.org/#dom-event-composedpath',
    },
    {
      label: 'WHATWG DOM — EventInit의 bubbles',
      url: 'https://dom.spec.whatwg.org/#dom-eventinit-bubbles',
    },
    {
      label: 'WHATWG DOM — Element.closest()',
      url: 'https://dom.spec.whatwg.org/#dom-element-closest',
    },
    {
      label: 'WHATWG DOM — EventTarget.addEventListener()',
      url: 'https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener',
    },
    {
      label: 'WHATWG HTML — 이벤트 핸들러 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-attributes',
    },
    {
      label: 'WHATWG HTML — 이벤트 핸들러 IDL 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-idl-attributes',
    },
    {
      label: 'WHATWG HTML — 이벤트 핸들러 활성화',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#activate-an-event-handler',
    },
    {
      label: 'WHATWG HTML — 이벤트 핸들러 비활성화',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#deactivate-an-event-handler',
    },
    {
      label: 'WHATWG HTML — HTMLElement.click()',
      url: 'https://html.spec.whatwg.org/multipage/interaction.html#dom-click',
    },
    {
      label: 'WHATWG HTML — 합성 포인터 이벤트 발생시키기',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#fire-a-synthetic-pointer-event',
    },
    {
      label: 'UI Events — focus 이벤트',
      url: 'https://w3c.github.io/uievents/#event-type-focus',
    },
    {
      label: 'UI Events — focusin 이벤트',
      url: 'https://w3c.github.io/uievents/#event-type-focusin',
    },
    {
      label: 'MDN — Event.eventPhase',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Event/eventPhase',
    },
    {
      label: 'MDN — Event.target',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Event/target',
    },
    {
      label: 'MDN — Event.currentTarget (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget',
    },
    {
      label: 'MDN — Event.composedPath() (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath',
    },
    {
      label: 'MDN — Element.closest()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Element/closest',
    },
    {
      label: 'MDN — EventTarget.addEventListener()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/EventTarget/addEventListener',
    },
    {
      label: 'MDN — 이벤트 버블링',
      url: 'https://developer.mozilla.org/ko/docs/Learn_web_development/Core/Scripting/Event_bubbling',
    },
    {
      label: 'whatwg/dom 커밋 — Fix event path iteration (캡처·버블 순회 분리)',
      url: 'https://github.com/whatwg/dom/commit/994380177ef7e388de51f58ba7a4d91fc221c87d',
    },
  ],
  reviewedAt: '2026-11-04',
} satisfies ConceptMeta
