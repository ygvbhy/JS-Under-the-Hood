import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'html-attribute-dom-property',
  title: 'HTML 어트리뷰트와 DOM 프로퍼티: value를 바꿨는데 getAttribute는 왜 그대로일까',
  summary:
    'input의 value를 바꿔도 getAttribute("value")가 그대로인 이유는 dirty value flag이고, 어트리뷰트와 짝인 프로퍼티는 대부분 어트리뷰트를 반영합니다. 폼 컨트롤, 반영, 타입 변환, dataset을 Chromium과 표준으로 확인합니다.',
  category: 'browser',
  order: 370,
  tags: [
    'DOM',
    '어트리뷰트',
    '프로퍼티',
    'value',
    'defaultValue',
    'checked',
    'dataset',
    'getAttribute',
    'setAttribute',
  ],
  goals: [
    'input의 value를 바꾼 뒤 getAttribute("value")가 그대로인 이유를 dirty value flag로 설명하고, 입력 전에는 어트리뷰트가 value를 바꾸는 이유를 예측할 수 있다.',
    'checked와 defaultChecked, form.reset()이 어트리뷰트 기준으로 되돌리는 동작을 같은 구조로 설명할 수 있다.',
    'id, className, htmlFor처럼 어트리뷰트를 반영하는 프로퍼티와, 반영하면서 불리언·숫자·절대 URL로 타입이 바뀌는 경우를 구분할 수 있다.',
    '없는 어트리뷰트의 값, 이름의 대소문자, dataset의 이름 변환, 비표준 어트리뷰트가 프로퍼티가 되지 않는 이유를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' },
    { label: '프로퍼티 어트리뷰트', slug: 'property-attributes' },
  ],
  related: ['dom-tree-nodes', 'live-html-collection', 'property-attributes', 'prototype-chain'],
  examples: [
    {
      id: 'value-dirty',
      file: 'value-dirty.html',
      runtime: 'browser',
      expectedOutput: [
        '처음 ["손님","손님","손님"]',
        'value 대입 ["철수","손님","손님"]',
        'setAttribute ["철수","영희","영희"]',
      ],
    },
    {
      id: 'value-clean',
      file: 'value-clean.html',
      runtime: 'browser',
      expectedOutput: [
        'setAttribute ["영희","영희","영희"]',
        'defaultValue 대입 ["민수","민수","민수"]',
        'removeAttribute ["",null,""]',
      ],
    },
    {
      id: 'checked',
      file: 'checked.html',
      runtime: 'browser',
      expectedOutput: [
        '처음 true true true',
        'checked 대입 false true true',
        '어트리뷰트 다시 추가 false true true',
        'on null',
        '동의 동의',
      ],
    },
    {
      id: 'reset',
      file: 'reset.html',
      runtime: 'browser',
      expectedOutput: ['철수 true', '손님 false', '영희'],
    },
    {
      id: 'reflect',
      file: 'reflect.html',
      runtime: 'browser',
      expectedOutput: ['tag hint nick', 'hint error email', 'nick-label', 'undefined undefined'],
    },
    {
      id: 'types',
      file: 'types.html',
      runtime: 'browser',
      expectedOutput: [
        'true "false"',
        'false',
        '""',
        'number 4 string',
        '-1',
        'help.html http://example.test/help.html',
      ],
    },
    {
      id: 'missing',
      file: 'missing.html',
      runtime: 'browser',
      expectedOutput: ['null false ""', 'null false', 'null -1', 'null ""'],
    },
    {
      id: 'attributes',
      file: 'attributes.html',
      runtime: 'browser',
      expectedOutput: [
        '4 ["id=nick","type=text","value=손님","required="]',
        '손님 true',
        '5 ["id","type","value","required","placeholder"]',
        '4 false',
      ],
    },
    {
      id: 'dataset',
      file: 'dataset.html',
      runtime: 'browser',
      expectedOutput: [
        '42 string',
        'false true',
        '오늘',
        '["itemId","inStock","lastSeen"]',
        'false undefined',
      ],
    },
    {
      id: 'accessor',
      file: 'accessor.html',
      runtime: 'browser',
      expectedOutput: ['function function false', 'false true', 'function true true'],
    },
    {
      id: 'custom',
      file: 'custom.html',
      runtime: 'browser',
      expectedOutput: ['red undefined', 'big false null', '안내'],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 동작의 근거는 WHATWG HTML·DOM·Web IDL 표준이며, 어트리뷰트 이름의 소문자 처리는 HTML 문서 안의 HTML 요소에만 해당합니다.',
    '사용자가 직접 입력하는 대신 스크립트로 value와 checked를 대입합니다. 표준상 둘 다 dirty 플래그를 true로 만들며, 이 페이지는 스크립트 대입 경로만 확인합니다.',
    'value와 defaultValue가 갈라지는 동작은 value 모드인 텍스트 입력에만 해당합니다. 체크박스처럼 value 모드가 아닌 type은 value 프로퍼티가 value 어트리뷰트를 그대로 읽고 씁니다.',
    'option의 selected 어트리뷰트와 selected 프로퍼티(dirtiness)는 checked와 같은 구조이고, textarea도 dirty value flag를 갖지만 기본값이 어트리뷰트가 아니라 자식 텍스트에서 옵니다. 둘 다 이 페이지에서는 다루지 않습니다. type을 바꿀 때의 value 처리와 값 정제(sanitization)의 세부 규칙도 다루지 않습니다.',
    'disabled="false"는 표준이 허용하지 않는 값이며, 불리언 어트리뷰트는 값과 상관없이 있으면 true라는 동작을 보이려고 일부러 썼습니다.',
    'classList와 style은 별도 개념이며 이 페이지에서 다루지 않습니다. form.reset()이 일으키는 reset 이벤트는 40장의 별도 개념입니다.',
    '접근자 프로퍼티의 enumerable 등 세부 속성과 DOM 프로퍼티의 Web IDL 변환 규칙 전체는 다루지 않고, 프로토타입에 접근자로 놓인다는 점만 확인합니다.',
    '예제에서 href가 http://example.test/ 로 시작하는 것은 예제를 연 주소가 기준이기 때문입니다. URL로 해석할 수 없는 href는 href 프로퍼티가 어트리뷰트 값을 그대로 돌려주며, 이 경우는 예제로 실행하지 않았습니다.',
    'form 요소에서 컨트롤의 name으로 그 컨트롤에 닿는 form.이름, 문서의 id로 요소에 닿는 window의 이름 프로퍼티처럼 named getter로 요소에 닿는 경로는 다루지 않습니다(window의 경우는 HTMLCollection은 살아 있다 페이지에서 다룹니다).',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — input 요소의 value 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-value',
    },
    {
      label: 'WHATWG HTML — input 요소의 checked 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-checked',
    },
    {
      label: 'WHATWG HTML — dirty checkedness flag',
      url: 'https://html.spec.whatwg.org/multipage/input.html#concept-input-checked-dirty',
    },
    {
      label: 'WHATWG HTML — maxlength 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-maxlength',
    },
    {
      label: 'WHATWG HTML — input.value IDL 어트리뷰트(value 모드)',
      url: 'https://html.spec.whatwg.org/multipage/input.html#dom-input-value-value',
    },
    {
      label: 'WHATWG HTML — input.value IDL 어트리뷰트(default/on 모드)',
      url: 'https://html.spec.whatwg.org/multipage/input.html#dom-input-value-default-on',
    },
    {
      label: 'WHATWG HTML — input.checked IDL 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/input.html#dom-input-checked',
    },
    {
      label: 'WHATWG HTML — dirty value flag',
      url: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-fe-dirty',
    },
    {
      label: 'WHATWG HTML — 폼 리셋 알고리즘',
      url: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-reset',
    },
    {
      label: 'WHATWG HTML — form.reset()',
      url: 'https://html.spec.whatwg.org/multipage/forms.html#dom-form-reset',
    },
    {
      label: 'WHATWG HTML — label의 for 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/forms.html#attr-label-for',
    },
    {
      label: 'WHATWG HTML — 콘텐츠 어트리뷰트를 IDL 어트리뷰트로 반영하기',
      url: 'https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes',
    },
    {
      label: 'WHATWG HTML — IDL 확장 어트리뷰트로 반영 쓰기([Reflect] 등)',
      url: 'https://html.spec.whatwg.org/multipage/common-dom-interfaces.html#using-reflect-via-idl-extended-attributes',
    },
    {
      label: 'WHATWG HTML — option의 dirtiness',
      url: 'https://html.spec.whatwg.org/multipage/form-elements.html#concept-option-dirtiness',
    },
    {
      label: 'WHATWG HTML — textarea.defaultValue',
      url: 'https://html.spec.whatwg.org/multipage/form-elements.html#dom-textarea-defaultvalue',
    },
    {
      label: 'WHATWG HTML — 불리언 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes',
    },
    {
      label: 'WHATWG HTML — HTMLHyperlinkElementUtils.href',
      url: 'https://html.spec.whatwg.org/multipage/links.html#dom-hyperlink-href',
    },
    {
      label: 'WHATWG HTML — HTMLElement.dataset',
      url: 'https://html.spec.whatwg.org/multipage/dom.html#dom-dataset',
    },
    {
      label: 'WHATWG HTML — DOMStringMap의 이름 변환',
      url: 'https://html.spec.whatwg.org/multipage/dom.html#dom-domstringmap-setitem',
    },
    {
      label: 'WHATWG DOM — Element.id와 className',
      url: 'https://dom.spec.whatwg.org/#dom-element-id',
    },
    {
      label: 'WHATWG DOM — Element.getAttribute()',
      url: 'https://dom.spec.whatwg.org/#dom-element-getattribute',
    },
    {
      label: 'WHATWG DOM — Element.setAttribute()',
      url: 'https://dom.spec.whatwg.org/#dom-element-setattribute',
    },
    {
      label: 'WHATWG DOM — Element.hasAttribute()',
      url: 'https://dom.spec.whatwg.org/#dom-element-hasattribute',
    },
    {
      label: 'WHATWG DOM — Element.removeAttribute()',
      url: 'https://dom.spec.whatwg.org/#dom-element-removeattribute',
    },
    {
      label: 'WHATWG DOM — 이름으로 어트리뷰트 찾기',
      url: 'https://dom.spec.whatwg.org/#concept-element-attributes-get-by-name',
    },
    {
      label: 'WHATWG DOM — Element.attributes',
      url: 'https://dom.spec.whatwg.org/#dom-element-attributes',
    },
    {
      label: 'WHATWG DOM — NamedNodeMap의 어트리뷰트 목록',
      url: 'https://dom.spec.whatwg.org/#concept-namednodemap-element',
    },
    {
      label: 'Web IDL — ECMAScript로 나타내는 일반 어트리뷰트',
      url: 'https://webidl.spec.whatwg.org/#es-attributes',
    },
    {
      label: 'MDN — HTMLInputElement (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement',
    },
    {
      label: 'MDN — Element.getAttribute()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Element/getAttribute',
    },
    {
      label: 'MDN — HTMLElement.dataset',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/HTMLElement/dataset',
    },
  ],
  reviewedAt: '2026-11-04',
} satisfies ConceptMeta
