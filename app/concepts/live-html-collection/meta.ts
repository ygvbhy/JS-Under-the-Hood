import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'live-html-collection',
  title: 'HTMLCollection은 살아 있다: 클래스를 바꾸는 for 문은 왜 절반만 바꿀까',
  summary:
    'getElementsByClassName이 돌려주는 HTMLCollection은 살아 있어 반복 중에 클래스를 바꾸면 항목이 빠지고 인덱스가 당겨집니다. 정적인 querySelectorAll, 살아 있는 childNodes와 비교하고 해결 방법을 DOM 표준으로 확인합니다.',
  category: 'browser',
  order: 360,
  tags: [
    'HTMLCollection',
    'NodeList',
    'getElementsByClassName',
    'querySelectorAll',
    'childNodes',
    '살아 있는 컬렉션',
    'getElementById',
    'DOM',
  ],
  goals: [
    'getElementsByClassName이 돌려주는 HTMLCollection이 살아 있어, 반복 중에 클래스를 바꾸면 항목이 컬렉션에서 빠지고 인덱스가 당겨져 절반만 바뀌는 이유를 DOM 표준의 컬렉션 규칙으로 설명할 수 있다.',
    'querySelectorAll이 정적인 NodeList를 돌려주는 것과 childNodes가 살아 있는 NodeList인 것을 구분하고, 요소를 붙였을 때 각 컬렉션의 length가 어떻게 달라지는지 예측할 수 있다.',
    'HTMLCollection과 NodeList의 차이(forEach 유무, 둘 다 배열이 아님)와, for...of나 forEach로 바꿔도 같은 함정에 걸리는 이유, 역순 for·Array.from·while로 살아 있는 컬렉션을 안전하게 바꾸는 방법을 설명할 수 있다.',
    '중복 id에서 getElementById가 첫 요소를 돌려주는 규칙과, 요소의 getElementsByClassName·querySelectorAll이 그 요소의 후손만 찾는 범위를 설명할 수 있다.',
  ],
  prerequisites: [
    { label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' },
    { label: '이터러블과 for...of', slug: 'iterable-for-of' },
  ],
  related: ['dom-tree-nodes', 'iterable-for-of', 'global-object'],
  examples: [
    {
      id: 'live-loop',
      file: 'live-loop.html',
      runtime: 'browser',
      expectedOutput: [
        '시작 4 ["todo","todo","todo","todo"]',
        'i=0 3 ["done","todo","todo","todo"]',
        'i=1 2 ["done","todo","done","todo"]',
        '끝 2 ["done","todo","done","todo"]',
      ],
    },
    {
      id: 'static-loop',
      file: 'static-loop.html',
      runtime: 'browser',
      expectedOutput: [
        '시작 4 ["todo","todo","todo","todo"]',
        'i=0 4 ["done","todo","todo","todo"]',
        'i=1 4 ["done","done","todo","todo"]',
        'i=2 4 ["done","done","done","todo"]',
        'i=3 4 ["done","done","done","done"]',
        '끝 4 ["done","done","done","done"]',
      ],
    },
    {
      id: 'live-grow',
      file: 'live-grow.html',
      runtime: 'browser',
      expectedOutput: ['3 2', '3'],
    },
    {
      id: 'collection-types',
      file: 'collection-types.html',
      runtime: 'browser',
      expectedOutput: ['HTMLCollection NodeList', 'false false', 'undefined function', 'true 4'],
    },
    {
      id: 'fixes',
      file: 'fixes.html',
      runtime: 'browser',
      expectedOutput: ['4', '4 0', '4 0'],
    },
    {
      id: 'iteration-traps',
      file: 'iteration-traps.html',
      runtime: 'browser',
      expectedOutput: ['2', '2 [0,1]', '4 "todo done"', '2 true'],
    },
    {
      id: 'child-nodes-live',
      file: 'child-nodes-live.html',
      runtime: 'browser',
      expectedOutput: ['NodeList 4', '2 2 4'],
    },
    {
      id: 'duplicate-id',
      file: 'duplicate-id.html',
      runtime: 'browser',
      expectedOutput: [
        '첫째',
        '2 null',
        '상자 true',
        'false true',
        'HTMLCollection 2',
        '"" true 이름',
        'function [object WindowProperties]',
        '1 false 상자',
      ],
    },
    {
      id: 'element-scope',
      file: 'element-scope.html',
      runtime: 'browser',
      expectedOutput: ['3', '2 2', '뉴스 1', '2'],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 컬렉션의 live·static 규칙과 각 API가 돌려주는 값은 WHATWG DOM 표준, id의 Window 이름 있는 프로퍼티 노출은 WHATWG HTML 표준을 근거로 합니다.',
    'append, createElement, removeChild, className 대입은 DOM 조작 API이며, 이 페이지에서는 설명하지 않고 컬렉션이 변하는 모습을 보이는 도구로만 씁니다. Array.from과 화살표 함수도 설명 없이 씁니다.',
    '같은 인수로 getElementsByClassName을 다시 부르면 같은 HTMLCollection이 돌아오는지는 표준이 "may"로 열어 둔 동작이라 다루지 않습니다.',
    'namedItem, getElementsByName, matches와 closest, 선택자 문법, 잘못된 선택자가 던지는 SyntaxError는 다루지 않습니다.',
    '섀도 트리는 다루지 않습니다. id의 유일성은 같은 트리 안에서의 규칙으로만 설명합니다.',
    ':scope와 선택자 매칭의 상세는 다루지 않습니다. 요소의 querySelectorAll이 선택자를 문서 전체 기준으로 맞춘다는 점만 확인합니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG DOM — 컬렉션',
      url: 'https://dom.spec.whatwg.org/#concept-collection',
    },
    {
      label: 'WHATWG DOM — 살아 있는 컬렉션',
      url: 'https://dom.spec.whatwg.org/#concept-collection-live',
    },
    {
      label: 'WHATWG DOM — HTMLCollection 인터페이스',
      url: 'https://dom.spec.whatwg.org/#interface-htmlcollection',
    },
    {
      label: 'WHATWG DOM — NodeList 인터페이스',
      url: 'https://dom.spec.whatwg.org/#interface-nodelist',
    },
    {
      label: 'WHATWG DOM — 클래스 이름으로 요소 목록 만들기',
      url: 'https://dom.spec.whatwg.org/#concept-getelementsbyclassname',
    },
    {
      label: 'WHATWG DOM — Document.getElementsByClassName',
      url: 'https://dom.spec.whatwg.org/#dom-document-getelementsbyclassname',
    },
    {
      label: 'WHATWG DOM — Element.getElementsByClassName',
      url: 'https://dom.spec.whatwg.org/#dom-element-getelementsbyclassname',
    },
    {
      label: 'WHATWG DOM — Document.getElementsByTagName',
      url: 'https://dom.spec.whatwg.org/#dom-document-getelementsbytagname',
    },
    {
      label: 'WHATWG DOM — ParentNode.querySelectorAll',
      url: 'https://dom.spec.whatwg.org/#dom-parentnode-queryselectorall',
    },
    {
      label: 'WHATWG DOM — Node.childNodes',
      url: 'https://dom.spec.whatwg.org/#dom-node-childnodes',
    },
    {
      label: 'WHATWG DOM — get an element by ID',
      url: 'https://dom.spec.whatwg.org/#get-an-element-by-id',
    },
    {
      label: 'WHATWG HTML — Window 객체의 이름 접근',
      url: 'https://html.spec.whatwg.org/multipage/nav-history-apis.html#named-access-on-the-window-object',
    },
    {
      label: 'WHATWG HTML — id 어트리뷰트',
      url: 'https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute',
    },
    {
      label: 'ECMAScript 명세 — Array.prototype.forEach',
      url: 'https://tc39.es/ecma262/#sec-array.prototype.foreach',
    },
    {
      label: 'Web IDL — 반복 메서드 정의',
      url: 'https://webidl.spec.whatwg.org/#define-the-iteration-methods',
    },
    {
      label: 'Web IDL — named properties object',
      url: 'https://webidl.spec.whatwg.org/#named-properties-object',
    },
    {
      label: 'Web IDL — named property visibility',
      url: 'https://webidl.spec.whatwg.org/#dfn-named-property-visibility',
    },
    {
      label: 'WHATWG DOM — scope-match a selectors string',
      url: 'https://dom.spec.whatwg.org/#scope-match-a-selectors-string',
    },
    {
      label: 'MDN — HTMLCollection',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/HTMLCollection',
    },
    {
      label: 'MDN — NodeList',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/NodeList',
    },
    {
      label: 'MDN — Document.getElementsByClassName (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName',
    },
    {
      label: 'MDN — Document.querySelectorAll',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Document/querySelectorAll',
    },
  ],
  reviewedAt: '2026-11-03',
} satisfies ConceptMeta
