import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'prevent-default-stop-propagation',
  title: '기본 동작과 전파 막기: preventDefault를 했는데 부모 리스너는 왜 불릴까',
  summary:
    'preventDefault는 기본 동작만 취소하고 전파는 막지 않습니다. stopPropagation과 stopImmediatePropagation, passive와 once, 같은 함수의 중복 등록을 DOM·HTML 표준과 Chromium 실행 결과로 확인합니다.',
  category: 'browser',
  order: 390,
  tags: [
    '기본 동작',
    'preventDefault',
    'stopPropagation',
    'stopImmediatePropagation',
    'defaultPrevented',
    'cancelable',
    'dispatchEvent',
    'passive',
    'once',
    'removeEventListener',
    '이벤트 취소',
    'DOM',
  ],
  goals: [
    'preventDefault가 canceled flag만 세워 기본 동작(체크박스 토글, 링크 이동, 폼 제출)을 취소하고 전파는 막지 않는 이유를 DOM 표준의 디스패치 규칙으로 설명하며, 체크박스 click 리스너 안의 checked가 이미 바뀐 값인 이유와 cancelable이 false인 이벤트를 취소할 수 없는 이유를 설명할 수 있다.',
    'stopPropagation과 stopImmediatePropagation이 서로 대신하지 못하는 이유를 설명하고, 둘 다 기본 동작은 막지 않으며 디스패치가 끝나면 전파 플래그만 지워지고 defaultPrevented는 남는 것을 예측할 수 있다.',
    '같은 함수를 같은 capture로 두 번 등록하면 한 번만 등록되는 이유, removeEventListener가 capture까지 맞아야 제거되는 이유, passive 리스너 안의 preventDefault가 무시되는 이유와 once의 동작을 설명할 수 있다.',
    'dispatchEvent의 반환값이 취소 여부를 알려 주는 이유와 onclick의 return false가 취소는 하지만 전파는 막지 않는 이유, addEventListener 리스너의 return false가 아무 효과 없는 이유를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: '이벤트 전파와 위임', slug: 'event-propagation-delegation' },
    { label: 'HTML 어트리뷰트와 DOM 프로퍼티', slug: 'html-attribute-dom-property' },
  ],
  related: ['event-propagation-delegation', 'html-attribute-dom-property'],
  examples: [
    {
      id: 'checkbox-prevent',
      file: 'checkbox-prevent.html',
      runtime: 'browser',
      expectedOutput: [
        'agree 리스너 true',
        'preventDefault 뒤 true',
        'row agree true',
        'agree 클릭 뒤 false',
        'news 리스너 true',
        'row news false',
        'news 클릭 뒤 true',
        'loose 클릭 뒤 true',
        '["news"]',
      ],
    },
    {
      id: 'link-submit',
      file: 'link-submit.html',
      runtime: 'browser',
      expectedOutput: ['click next true', 'click send false', 'submit true true'],
    },
    {
      id: 'not-cancelable',
      file: 'not-cancelable.html',
      runtime: 'browser',
      expectedOutput: [
        'ping false false',
        'true',
        'ping true true',
        'false',
        'change false false',
        'pin true',
      ],
    },
    {
      id: 'dispatch-return',
      file: 'dispatch-return.html',
      runtime: 'browser',
      expectedOutput: ['닫기 false hidden false', '닫기 true hidden true'],
    },
    {
      id: 'stop-propagation',
      file: 'stop-propagation.html',
      runtime: 'browser',
      expectedOutput: ['["save 1","save 2"]', '["card 캡처"]', '["save 캡처"]', 'true []'],
    },
    {
      id: 'stop-immediate',
      file: 'stop-immediate.html',
      runtime: 'browser',
      expectedOutput: ['["save 1"]', 'true []', '리스너 안 true true', '디스패치 뒤 false true'],
    },
    {
      id: 'duplicate-listener',
      file: 'duplicate-listener.html',
      runtime: 'browser',
      expectedOutput: [
        '같은 함수 두 번 1',
        'capture만 다름 2',
        'capture 없이 제거 1',
        'capture: true로 제거 0',
        '함수 표현식 두 번 2',
        'once를 나중에 줌 2',
      ],
    },
    {
      id: 'passive-once',
      file: 'passive-once.html',
      runtime: 'browser',
      expectedOutput: [
        'passive 리스너 false',
        'pin true',
        '다음 리스너 false',
        '직접 호출 뒤 true',
        'star false',
        'once 1',
      ],
    },
    {
      id: 'return-false',
      file: 'return-false.html',
      runtime: 'browser',
      expectedOutput: ['a true', 'b true', 'c false', 'false false true'],
    },
    {
      id: 'actions',
      file: 'actions.html',
      runtime: 'browser',
      expectedOutput: [
        '아무것도 안 함 체크 true 남은 true 부모 true defaultPrevented false',
        'preventDefault 체크 false 남은 true 부모 true defaultPrevented true',
        'stopPropagation 체크 true 남은 true 부모 false defaultPrevented false',
        'stopImmediatePropagation 체크 true 남은 false 부모 false defaultPrevented false',
        'passive에서 preventDefault 체크 true 남은 true 부모 true defaultPrevented false',
        'onclick의 return false 체크 false 남은 true 부모 true defaultPrevented true',
        'addEventListener의 return false 체크 true 남은 true 부모 true defaultPrevented false',
      ],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 기본 동작 취소와 전파 규칙은 WHATWG DOM 표준, 체크박스·링크·폼 제출·이벤트 핸들러의 반환값 처리는 WHATWG HTML 표준을 근거로 하며, 다른 브라우저에서는 확인하지 않았습니다.',
    '사용자의 실제 클릭 대신 click()과 dispatchEvent로 이벤트를 만듭니다. 이렇게 만든 이벤트는 isTrusted가 false이며, 포커스 이동이나 텍스트 선택처럼 실제 사용자 입력에만 따르는 기본 동작은 다루지 않습니다.',
    '취소하지 않았을 때 링크 이동과 폼 제출이 계속되는 동작은 예제 실행기가 페이지 이동을 실패로 처리하기 때문에 예제로 보이지 않고, 표준의 근거 문장으로만 설명합니다.',
    '체크박스의 click 동작만 다루고 라디오 버튼의 legacy 동작은 다루지 않습니다.',
    'touchstart, touchmove, wheel 같은 이벤트를 window, document, html, body에 등록할 때 passive 기본값이 true가 되는 규칙은 한 줄만 언급하고 따로 확인하지 않았습니다.',
    'signal 옵션, handleEvent 메서드를 가진 객체 리스너, returnValue와 cancelBubble의 setter는 다루지 않습니다.',
    'beforeunload와 error 이벤트 핸들러의 반환값 예외, 이벤트 핸들러 어트리뷰트의 스코프는 다루지 않습니다.',
    'Shadow DOM과 composed는 다루지 않습니다.',
    'dispatchEvent의 반환값으로 흉내 낸 기본 동작(예: 메모 패널 닫기)은 브라우저의 기본 동작이 아니라 코드가 반환값을 보고 정한 동작입니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG DOM — Event.preventDefault()',
      url: 'https://dom.spec.whatwg.org/#dom-event-preventdefault',
    },
    {
      label: 'WHATWG DOM — Event.stopPropagation()',
      url: 'https://dom.spec.whatwg.org/#dom-event-stoppropagation',
    },
    {
      label: 'WHATWG DOM — Event.stopImmediatePropagation()',
      url: 'https://dom.spec.whatwg.org/#dom-event-stopimmediatepropagation',
    },
    {
      label: 'WHATWG DOM — canceled flag 세우기',
      url: 'https://dom.spec.whatwg.org/#set-the-canceled-flag',
    },
    {
      label: 'WHATWG DOM — Event.defaultPrevented',
      url: 'https://dom.spec.whatwg.org/#dom-event-defaultprevented',
    },
    {
      label: 'WHATWG DOM — Event.cancelBubble',
      url: 'https://dom.spec.whatwg.org/#dom-event-cancelbubble',
    },
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
      label: 'WHATWG DOM — 이벤트 리스너 추가',
      url: 'https://dom.spec.whatwg.org/#add-an-event-listener',
    },
    {
      label: 'WHATWG DOM — EventTarget.addEventListener()',
      url: 'https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener',
    },
    {
      label: 'WHATWG DOM — EventTarget.removeEventListener()',
      url: 'https://dom.spec.whatwg.org/#dom-eventtarget-removeeventlistener',
    },
    {
      label: 'WHATWG DOM — EventTarget.dispatchEvent()',
      url: 'https://dom.spec.whatwg.org/#dom-eventtarget-dispatchevent',
    },
    {
      label: 'WHATWG DOM — legacy-pre-activation behavior',
      url: 'https://dom.spec.whatwg.org/#eventtarget-legacy-pre-activation-behavior',
    },
    {
      label: 'WHATWG DOM — legacy-canceled-activation behavior',
      url: 'https://dom.spec.whatwg.org/#eventtarget-legacy-canceled-activation-behavior',
    },
    {
      label: 'WHATWG HTML — 체크박스 상태',
      url: 'https://html.spec.whatwg.org/multipage/input.html#checkbox-state-(type=checkbox)',
    },
    {
      label: 'WHATWG HTML — input 요소의 legacy-pre-activation behavior',
      url: 'https://html.spec.whatwg.org/multipage/input.html#the-input-element:legacy-pre-activation-behavior',
    },
    {
      label: 'WHATWG HTML — a와 area가 만드는 링크',
      url: 'https://html.spec.whatwg.org/multipage/links.html#links-created-by-a-and-area-elements',
    },
    {
      label: 'WHATWG HTML — button 요소의 활성화 동작',
      url: 'https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element:activation-behaviour',
    },
    {
      label: 'WHATWG HTML — 폼 제출 알고리즘',
      url: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-submit',
    },
    {
      label: 'WHATWG HTML — 이벤트 핸들러 처리 알고리즘',
      url: 'https://html.spec.whatwg.org/multipage/webappapis.html#the-event-handler-processing-algorithm',
    },
    {
      label: 'W3C UI Events — default action(용어집)',
      url: 'https://www.w3.org/TR/uievents/#default-action',
    },
    {
      label: 'MDN — Event.preventDefault()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Event/preventDefault',
    },
    {
      label: 'MDN — Event.stopPropagation()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Event/stopPropagation',
    },
    {
      label: 'MDN — Event.stopImmediatePropagation()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Event/stopImmediatePropagation',
    },
    {
      label: 'MDN — EventTarget.addEventListener()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/EventTarget/addEventListener',
    },
    {
      label: 'MDN — EventTarget.removeEventListener()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/EventTarget/removeEventListener',
    },
    {
      label: 'MDN — EventTarget.dispatchEvent()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/EventTarget/dispatchEvent',
    },
  ],
  reviewedAt: '2026-11-04',
} satisfies ConceptMeta
