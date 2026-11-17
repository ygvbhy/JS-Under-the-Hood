import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'classlist-style',
  title: 'classList와 style: 스타일시트로 준 색인데 el.style.color는 왜 빈 문자열일까',
  summary:
    'el.style은 style 어트리뷰트의 선언만 보여 줍니다. classList와 class 어트리뷰트, style과 style 어트리뷰트가 서로 어떻게 바뀌는지, 적용된 값은 어디서 읽는지 확인합니다.',
  category: 'browser',
  order: 375,
  tags: [
    'classList',
    'style',
    'class',
    'className',
    'DOMTokenList',
    'getComputedStyle',
    'cssText',
    'inline style',
    'CSSOM',
  ],
  goals: [
    '스타일시트 규칙으로 적용된 값이 el.style에서 빈 문자열로 읽히는 이유를, el.style이 style 어트리뷰트의 선언만 나타내기 때문이라고 설명하고, 적용된 값은 getComputedStyle로 읽는다는 것을 말할 수 있다.',
    'style 어트리뷰트를 바꾸면 선언을 다시 파싱하고, 선언을 바꾸면 어트리뷰트를 직렬화한 문자열로 다시 쓴다는 것을 예제의 출력으로 예측할 수 있다.',
    'classList가 class 어트리뷰트를 토큰 집합으로 다루고, add·remove가 토큰을 넣거나 뺀 뒤 어트리뷰트를 다시 쓰는 동작(중복 정리, 예외가 나면 아무 토큰도 추가되지 않음)을 예측할 수 있다.',
    '클래스를 바꾸면 계산된 스타일은 바뀌지만 el.style은 그대로이고, el.style에 값이 있으면 계산된 값이 그 값이 되는 경우를 구분할 수 있다.',
  ],
  prerequisites: [
    { label: 'HTML 어트리뷰트와 DOM 프로퍼티', slug: 'html-attribute-dom-property' },
    { label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' },
  ],
  related: [
    'html-attribute-dom-property',
    'live-html-collection',
    'dom-tree-nodes',
    'error-handling',
  ],
  examples: [
    {
      id: 'inline-only',
      file: 'inline-only.html',
      runtime: 'browser',
      expectedOutput: ['"" 20px', 'rgb(255, 0, 0) 20px'],
    },
    {
      id: 'style-attribute',
      file: 'style-attribute.html',
      runtime: 'browser',
      expectedOutput: ['font-size:20px 1', 'font-size: 20px; color: blue; 2', '"" 4px 1', '"" 0'],
    },
    {
      id: 'style-values',
      file: 'style-values.html',
      runtime: 'browser',
      expectedOutput: [
        'yellow yellow',
        '10px',
        '10px',
        '0.5 string',
        '"" background-color: yellow; opacity: 0.5;',
      ],
    },
    {
      id: 'class-list',
      file: 'class-list.html',
      runtime: 'browser',
      expectedOutput: ['note on note on', '3 a false', 'true'],
    },
    {
      id: 'token-set',
      file: 'token-set.html',
      runtime: 'browser',
      expectedOutput: [
        '2 a b a',
        '2 a b',
        'false a',
        'true a b',
        'InvalidCharacterError false a b',
        'true ""',
      ],
    },
    {
      id: 'class-and-style',
      file: 'class-and-style.html',
      runtime: 'browser',
      expectedOutput: [
        '"" rgb(0, 0, 0)',
        '"" rgb(0, 128, 0)',
        'blue rgb(0, 0, 255)',
        'on blue rgb(0, 0, 255)',
      ],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값이고, 다른 브라우저는 확인하지 않았습니다. CSSOM은 선언을 이름: 값; 형태로 쓰고 선언 사이를 공백 하나로 잇는다고 정하지만, 값 부분의 직렬화 규칙(rgb(…), 0px 같은 형식)은 속성마다 달라 다루지 않습니다. 본문의 rgb(…)와 0px 같은 형식은 Chromium에서 실행한 값입니다.',
    '캐스케이드와 명시도의 규칙 자체, 사용자 정의 속성(--x), !important는 다루지 않습니다. 요소에 직접 붙은 선언은 중요도가 같은 선언끼리 비교할 때 선택자로 연결된 선언보다 우선한다는 CSS Cascade 5의 기준 하나만 인용합니다. 정렬 기준의 나머지(출처, 컨텍스트, 레이어, 명시도, 등장 순서)는 다루지 않습니다. 스타일시트의 !important 선언은 !important가 없는 style 어트리뷰트의 선언을 이깁니다.',
    'getComputedStyle은 스타일시트로 적용된 값을 읽는 대비로만 씁니다. 이 메서드가 돌려주는 값은 CSSOM 용어로 resolved value인데(color는 used value, 그 밖의 대부분 속성은 computed value), 이 페이지는 구분하지 않고 계산된 값이라고 부릅니다. 값의 형식(색이 rgb(…)로 나오는 이유), 의사 요소, 읽기 전용이라는 성질은 다루지 않습니다.',
    '축약 속성(margin 같은)이 여러 선언으로 나뉘는 규칙은 다루지 않습니다.',
    '현재 CSSOM 초안은 el.style의 타입을 CSSStyleProperties로 적지만, Chromium에서 Object.prototype.toString으로 확인한 이름은 CSSStyleDeclaration입니다. 본문은 타입 이름 대신 CSS 선언 블록을 나타내는 객체라고 씁니다. cssText와 el.style에 문자열을 대입하는 동작(PutForwards)은 다루지 않습니다.',
    "className 설명은 HTML 요소 기준입니다. SVG 요소의 className은 Chromium에서 문자열이 아니라 SVGAnimatedString 객체이고 문자열을 대입해도 class 어트리뷰트가 바뀌지 않으므로, SVG 요소에서는 classList나 getAttribute('class')를 씁니다.",
    'replace, supports, relList 같은 다른 DOMTokenList, toggle의 둘째 인수(force)와 집합이 바뀌지 않는 toggle의 동작은 다루지 않습니다. class 어트리뷰트가 없고 집합도 비어 있으면 어트리뷰트를 쓰지 않는다는 규칙은 표준 문장으로만 서술하며 예제로 실행하지 않았습니다.',
    'style 쓰기가 무시되는 경우는 값을 그 속성의 값으로 파싱하지 못하는 경우만 예제로 보입니다. 지원하지 않는 속성 이름 같은 다른 경우는 다루지 않습니다. 단위 없는 10이 width에서 무시되는 것은 <!doctype html>로 시작하는 문서에서 실행한 결과이고, doctype이 없는 문서(quirks 모드)에서는 Chromium이 10px로 받아들입니다. quirks 모드는 다루지 않습니다.',
    '예제 5는 예외 이름을 출력하려고 try…catch와 e.name을 씁니다. 던져지는 것은 DOMException이며 DOMException 자체는 다루지 않습니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.',
    '시뮬레이터는 요소의 어트리뷰트와 classList·style이 각각 나타내는 토큰 집합·선언 목록만 그립니다. 스타일시트 규칙과 계산된 스타일은 그리지 않고, 첫 단계의 토큰 집합과 선언 목록은 어트리뷰트를 파싱한 결과로 미리 그립니다(표준이 이 객체를 만드는 시점과 내부 구조는 그리지 않습니다).',
    '예제의 console.log와 이 페이지의 DOM·CSSOM API는 모두 ECMAScript 언어가 아니라 호스트(브라우저)가 제공하는 것입니다.',
  ],
  references: [
    {
      label: 'WHATWG DOM — DOMTokenList',
      url: 'https://dom.spec.whatwg.org/#interface-domtokenlist',
    },
    {
      label: 'WHATWG DOM — Element.classList',
      url: 'https://dom.spec.whatwg.org/#dom-element-classlist',
    },
    {
      label: 'CSSOM — ElementCSSInlineStyle 믹스인(style)',
      url: 'https://drafts.csswg.org/cssom/#the-elementcssinlinestyle-mixin',
    },
    {
      label: 'CSSOM — CSS declaration block',
      url: 'https://drafts.csswg.org/cssom/#css-declaration-block',
    },
    {
      label: 'CSSOM — getComputedStyle()',
      url: 'https://drafts.csswg.org/cssom/#dom-window-getcomputedstyle',
    },
    {
      label: 'CSS Cascading and Inheritance Level 5 — Cascade Sorting Order',
      url: 'https://drafts.csswg.org/css-cascade-5/#cascade-sort',
    },
    {
      label: 'CSS Style Attributes(W3C 권고안) — style 어트리뷰트의 해석',
      url: 'https://www.w3.org/TR/css-style-attr/#interpret',
    },
    {
      label: 'MDN — Element.classList',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Element/classList',
    },
    {
      label: 'MDN — HTMLElement.style',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/HTMLElement/style',
    },
  ],
  reviewedAt: '2026-11-17',
} satisfies ConceptMeta
