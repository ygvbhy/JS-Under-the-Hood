import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'dom-tree-nodes',
  title: 'DOM 트리와 노드 종류: li 하나만 있는 ul의 childNodes는 왜 3개일까',
  summary:
    'HTML 문서는 문서·요소·텍스트·주석 노드의 트리가 되고, 줄바꿈과 들여쓰기도 텍스트 노드가 됩니다. childNodes와 children, nodeValue와 textContent의 차이와 파서가 고친 트리를 Chromium과 DOM 표준으로 확인합니다.',
  category: 'browser',
  order: 350,
  tags: [
    'DOM',
    '노드',
    'nodeType',
    'childNodes',
    'children',
    '텍스트 노드',
    'textContent',
    'HTML 파서',
  ],
  goals: [
    'HTML 문서가 문서·문서 유형·요소·텍스트·주석 노드로 이루어진 트리가 되고, 줄바꿈과 들여쓰기도 텍스트 노드가 되는 이유를 설명할 수 있다.',
    'nodeType과 nodeName으로 노드 종류를 구분하고, 어트리뷰트 노드가 트리의 자식에 들지 않는 이유를 설명할 수 있다.',
    'childNodes와 children, firstChild와 firstElementChild, nextSibling과 nextElementSibling이 공백 텍스트 노드 때문에 달라지는 이유를 설명할 수 있다.',
    'nodeValue와 textContent의 차이, textContent 대입이 HTML로 해석되지 않는 이유, 파서가 소스와 다른 트리를 만드는 경우를 예측할 수 있다.',
  ],
  prerequisites: [
    { label: 'script의 async와 defer', slug: 'script-async-defer' },
    { label: '프로토타입 체인', slug: 'prototype-chain' },
  ],
  related: [
    'script-async-defer',
    'prototype-chain',
    'live-html-collection',
    'html-attribute-dom-property',
  ],
  examples: [
    {
      id: 'tree',
      file: 'tree.html',
      runtime: 'browser',
      resources: [{ path: '/walk.js', file: 'walk.js' }],
      expectedOutput: [
        '#document',
        '  html',
        '  HTML',
        '    HEAD',
        '      #text "\\n"',
        '      META',
        '      #text "\\n"',
        '      SCRIPT',
        '      #text "\\n"',
        '    #text "\\n"',
        '    BODY',
        '      #text "\\n"',
        '      #comment " 과일 "',
        '      #text "\\n"',
        '      UL',
        '        #text "\\n  "',
        '        LI',
        '          #text "사과"',
        '        #text "\\n  "',
        '        LI',
        '          #text "배"',
        '        #text "\\n"',
        '      #text "\\n\\n\\n"',
      ],
    },
    {
      id: 'node-types',
      file: 'node-types.html',
      runtime: 'browser',
      expectedOutput: [
        '9 #document',
        '10 html',
        '1 HTML',
        '8 #comment',
        '3 #text',
        '2 class null 1',
      ],
    },
    {
      id: 'whitespace',
      file: 'whitespace.html',
      runtime: 'browser',
      expectedOutput: [
        '3 1',
        '#text "\\n  "',
        'LI #text',
        '#text null',
        '#text SCRIPT',
        '#document null',
      ],
    },
    {
      id: 'node-value',
      file: 'node-value.html',
      runtime: 'browser',
      expectedOutput: ['null 3', '"안녕 " "안녕 세상!"', '"잘 가 세상!" 3'],
    },
    {
      id: 'parser-fix',
      file: 'parser-fix.html',
      runtime: 'browser',
      expectedOutput: ['TBODY TR', '0 DIV', '2'],
    },
    {
      id: 'text-content',
      file: 'text-content.html',
      runtime: 'browser',
      expectedOutput: ['1 #text 0', '"<i>새 글</i>"', '0 false'],
    },
    {
      id: 'inheritance',
      file: 'inheritance.html',
      runtime: 'browser',
      expectedOutput: [
        '["HTMLLIElement","HTMLElement","Element","Node","EventTarget","Object"]',
        '["Text","CharacterData","Node","EventTarget","Object"]',
        'true false undefined',
      ],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값입니다. 노드 종류·트리 규칙은 DOM 표준, 파서가 트리를 고치는 규칙은 HTML 표준의 파싱 단계를 근거로 합니다.',
    'getElementById, querySelectorAll, getAttributeNode는 요소 취득과 어트리뷰트를 다루는 API이며, 이 페이지에서는 설명하지 않고 결과를 보이는 도구로만 씁니다.',
    "childNodes가 돌려주는 NodeList와 children이 돌려주는 HTMLCollection이 살아 있는 컬렉션이라는 점은 'HTMLCollection은 살아 있다' 개념에서 다루며, 이 페이지는 개수와 내용만 비교합니다.",
    '어트리뷰트와 프로퍼티의 관계는 HTML 어트리뷰트와 DOM 프로퍼티 개념에서 다룹니다. 이 페이지에서 어트리뷰트 노드는 트리의 자식이 아님을 보이는 데만 씁니다.',
    'innerHTML, insertAdjacentHTML, createElement 같은 DOM 조작과 Shadow DOM, DocumentFragment는 다루지 않습니다.',
    'document의 프로토타입 체인은 Chromium이 표준과 달리 HTMLDocument를 따로 두므로 상속 구조 예제에서 뺐습니다.',
    '예제의 console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.',
  ],
  references: [
    {
      label: 'WHATWG DOM — 노드 트리',
      url: 'https://dom.spec.whatwg.org/#concept-node-tree',
    },
    {
      label: 'WHATWG DOM — Node 인터페이스',
      url: 'https://dom.spec.whatwg.org/#interface-node',
    },
    {
      label: 'WHATWG DOM — Node.nodeType',
      url: 'https://dom.spec.whatwg.org/#dom-node-nodetype',
    },
    {
      label: 'WHATWG DOM — Node.nodeName',
      url: 'https://dom.spec.whatwg.org/#dom-node-nodename',
    },
    {
      label: 'WHATWG DOM — Node.childNodes',
      url: 'https://dom.spec.whatwg.org/#dom-node-childnodes',
    },
    {
      label: 'WHATWG DOM — ParentNode.children',
      url: 'https://dom.spec.whatwg.org/#dom-parentnode-children',
    },
    {
      label: 'WHATWG DOM — Node.nodeValue',
      url: 'https://dom.spec.whatwg.org/#dom-node-nodevalue',
    },
    {
      label: 'WHATWG DOM — Node.textContent',
      url: 'https://dom.spec.whatwg.org/#dom-node-textcontent',
    },
    {
      label: 'WHATWG DOM — Text 인터페이스',
      url: 'https://dom.spec.whatwg.org/#interface-text',
    },
    {
      label: 'WHATWG DOM — CharacterData 인터페이스',
      url: 'https://dom.spec.whatwg.org/#interface-characterdata',
    },
    {
      label: 'WHATWG DOM — Attr 인터페이스',
      url: 'https://dom.spec.whatwg.org/#interface-attr',
    },
    {
      label: 'WHATWG HTML — before html 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#the-before-html-insertion-mode',
    },
    {
      label: 'WHATWG HTML — before head 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#the-before-head-insertion-mode',
    },
    {
      label: 'WHATWG HTML — after head 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#the-after-head-insertion-mode',
    },
    {
      label: 'WHATWG HTML — after body 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-afterbody',
    },
    {
      label: 'WHATWG HTML — in table 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable',
    },
    {
      label: 'WHATWG HTML — in body 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody',
    },
    {
      label: 'WHATWG HTML — insert a character',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#insert-a-character',
    },
    {
      label: 'MDN — Node (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Node',
    },
    {
      label: 'MDN — Node.nodeType (영문)',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType',
    },
    {
      label: 'MDN — Node.childNodes',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Node/childNodes',
    },
    {
      label: 'MDN — Element.children',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Element/children',
    },
    {
      label: 'MDN — Node.textContent',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Node/textContent',
    },
  ],
  reviewedAt: '2026-11-03',
} satisfies ConceptMeta
