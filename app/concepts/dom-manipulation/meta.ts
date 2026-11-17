import type { ConceptMeta } from '~/lib/concepts'

export const concept = {
  slug: 'dom-manipulation',
  title: 'DOM 조작: innerHTML에 +=를 했는데 먼저 잡아 둔 요소는 왜 문서에서 빠질까',
  summary:
    'innerHTML 대입은 자식을 모두 제거하고 새로 파싱한 노드를 넣습니다. 이미 트리에 있는 노드를 넣으면 이전 자리에서 빠집니다. 파싱하는 API와 노드를 넣는 API의 차이를 확인합니다.',
  category: 'browser',
  order: 377,
  tags: [
    'DOM 조작',
    'innerHTML',
    'insertAdjacentHTML',
    'appendChild',
    'append',
    'insertBefore',
    'DocumentFragment',
    'createDocumentFragment',
    'createElement',
    'cloneNode',
    'remove',
    'HTML 파싱',
    'isConnected',
  ],
  goals: [
    'innerHTML 대입이 요소의 자식을 모두 제거하고 문자열을 파싱해 만든 새 노드를 넣는 동작이라는 것을 설명하고, += 뒤에 먼저 얻어 둔 노드가 문서에서 빠지는 것을 예측할 수 있다.',
    'insertAdjacentHTML이 기존 자식을 그대로 두고 위치 넷 중 하나에 파싱한 노드를 넣는 것, beforebegin·afterend가 부모가 없거나 부모가 Document인 요소에서 NoModificationAllowedError를 내는 것을 구분할 수 있다.',
    '이미 트리에 있는 노드를 appendChild나 insertBefore로 넣으면 이전 부모에서 제거된 뒤 새 자리에 들어가므로 노드가 트리의 한 자리에만 있다는 것, DocumentFragment는 자식만 넣고 비워진다는 것을 예제 출력으로 예측할 수 있다.',
    'innerHTML이 대입할 때는 대상 요소에 따라 다르게 파싱하고 읽을 때는 직렬화한 문자열을 돌려준다는 것, cloneNode와 remove의 결과, 문자열로 넣은 마크업의 이벤트 핸들러 어트리뷰트가 동작하는 것을 설명할 수 있다.',
  ],
  prerequisites: [
    { label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' },
    { label: 'HTMLCollection은 살아 있다', slug: 'live-html-collection' },
  ],
  related: [
    'dom-tree-nodes',
    'live-html-collection',
    'script-async-defer',
    'html-attribute-dom-property',
    'classlist-style',
    'event-propagation-delegation',
    'error-handling',
  ],
  examples: [
    {
      id: 'inner-html-replace',
      file: 'inner-html-replace.html',
      runtime: 'browser',
      expectedOutput: ['true true', '2 false false', 'A true', 'first false'],
    },
    {
      id: 'insert-adjacent',
      file: 'insert-adjacent.html',
      runtime: 'browser',
      expectedOutput: [
        '2 true true',
        '<li>0</li><li id="first"><b>x</b>A</li><li>A2</li><li>B</li>',
        '1 false',
        'NoModificationAllowedError',
      ],
    },
    {
      id: 'move',
      file: 'move.html',
      runtime: 'browser',
      expectedOutput: ['1 1 done true', '1', 'false true', 'true true', '2 true'],
    },
    {
      id: 'fragment',
      file: 'fragment.html',
      runtime: 'browser',
      expectedOutput: ['2 true false', '0 3 true true', '3 false'],
    },
    {
      id: 'parse-context',
      file: 'parse-context.html',
      runtime: 'browser',
      expectedOutput: [
        '"1" 0',
        '<tbody><tr><td>1</td></tr></tbody> TBODY',
        '<b class="on">x<br><i>y</i></b>',
        '&lt;b&gt;1 &amp; 2&lt;/b&gt; 0',
      ],
    },
    {
      id: 'clone-remove',
      file: 'clone-remove.html',
      runtime: 'browser',
      expectedOutput: [
        '0 2 item false',
        'false true 1',
        '1',
        '1',
        'false true A B 0',
        '2',
        'true true',
      ],
    },
    {
      id: 'code-in-html',
      file: 'code-in-html.html',
      runtime: 'browser',
      expectedOutput: ['2', '10', '0 true', '20'],
    },
  ],
  simplifications: [
    '예제의 실행 결과는 Chromium에서 실행한 값이고, 다른 브라우저는 확인하지 않았습니다. 표준 문장은 2026-11-17에 내려받은 WHATWG HTML·DOM 표준의 판에서 인용했습니다. 두 표준은 계속 바뀌는 문서이고, HTML 표준의 innerHTML 절은 최근 판에서 바뀌었으므로 예전 판이나 번역 문서의 설명과 다를 수 있습니다.',
    'innerHTML setter의 첫 단계인 Trusted Types 검사, Sanitizer API(setHTML, setHTMLUnsafe)와 runScripts 옵션, outerHTML, createContextualFragment는 다루지 않습니다. 본문은 setter가 trusted type 검사를 마친 뒤 부르는 "filter and set HTML" 단계부터 설명합니다.',
    'template 요소에서는 innerHTML 대입이 자식이 아니라 template contents를 바꾼다고 표준이 정하며, insertAdjacentHTML에는 이런 특별 처리가 없다고 표준이 적습니다. template과 Shadow DOM, XML 문서는 다루지 않고 예제는 HTML 문서의 일반 요소만 씁니다.',
    '표준에는 이름이 move인 다른 연산(moveBefore와 "To move a node")이 있습니다. appendChild, append, insertBefore는 그 move가 아니라 adopt의 remove 단계 뒤에 insert를 하는 것입니다. 본문의 "옮겨진다"는 결과를 가리키는 말입니다. removeChild, replaceChild, replaceWith, before, after, replaceChildren, moveBefore, importNode와 adoptNode(다른 문서)는 다루지 않습니다.',
    'append의 인수가 문자열이면 텍스트 노드가 되고 인수가 둘 이상이면 DocumentFragment를 거쳐 넣는다는 것(표준의 convert nodes into a node)은 표준 문장으로만 서술하며 예제로 실행하지 않았습니다. 예제 4의 frag.append(b, c)는 프래그먼트에 노드를 모으는 도구로만 씁니다.',
    '파서가 요소에 따라 다르게 동작하는 규칙은 예제 5의 입력에 한정합니다. div 문맥에서 tr·td 시작 태그가 무시되는 것, table 문맥에서 tbody가 만들어지는 것, 대문자 태그와 닫히지 않은 태그입니다. 삽입 모드 전체와 다른 입력은 다루지 않습니다. 직렬화 규칙도 예제에 나온 것(큰따옴표 어트리뷰트, 끝 태그가 없는 요소, 텍스트의 이스케이프)만 다루고, U+00A0의 이스케이프와 script·style 같은 요소의 자식 텍스트를 이스케이프하지 않는 규칙은 표준 문장으로만 적습니다. 또 표준이 적은 대로 직렬화한 문자열을 다시 파싱해도 원래 트리가 나온다는 보장은 없다는 점만 언급합니다.',
    '예제 2는 예외 이름을 출력하려고 try…catch와 e.name을 씁니다. 던져지는 것은 DOMException이며 DOMException 자체와 오류 처리는 try/catch/finally 개념에서 다룹니다. 위치 문자열이 넷 중 하나가 아닐 때의 SyntaxError와 XML 문서의 예외는 표준 문장으로만 서술하며 예제로 실행하지 않았습니다. insertAdjacentHTML에서 문맥으로 고른 노드가 Element가 아니거나 HTML 문서의 html 요소이면 새로 만든 body 요소가 문맥이 되는 단계는 다루지 않습니다.',
    '예제 6과 7은 addEventListener, click(), 어트리뷰트 핸들러(onclick, onerror)를 결과를 보이는 도구로만 씁니다. 이벤트 API는 이벤트 전파와 위임 개념에서 다룹니다. click()으로 만든 이벤트는 isTrusted가 false입니다. cloneNode는 어트리뷰트를 복제한다고 표준이 정하지만, 어트리뷰트 핸들러가 복제본에서 동작하는지는 예제로 실행하지 않았습니다. addEventListener로 등록한 리스너가 복제본에서 실행되지 않는 것은 Chromium에서 실행한 결과입니다.',
    'img의 error 이벤트는 스크립트가 끝난 뒤에 발생한다는 것까지만 예제로 보입니다. 표준의 update the image data는 src가 빈 문자열이면 요소 태스크로 error 이벤트를 발생시킨다고 정합니다. 예제 7의 src=""는 네트워크 요청 없이 이 이벤트가 나게 하려는 장치입니다. 이미지 로딩 알고리즘 전체, 문서에 연결되지 않은 img나 template 안의 img에서의 동작은 다루지 않습니다.',
    'innerHTML로 넣은 script 요소가 기본 설정에서 실행되지 않는 것은 script의 async와 defer 개념에서 예제로 보입니다. Trusted Types 기본 정책(default policy)의 createParserOptions 콜백에서 runScripts를 켜면 실행된다고 표준의 보안 고려 절이 적은 예외와 보안 공격 시나리오(XSS)는 다루지 않고, 믿을 수 없는 문자열에는 textContent를 쓴다는 지침만 MDN 링크와 함께 한 문장으로 적습니다. 성능(리플로우) 비교도 다루지 않습니다.',
    '시뮬레이터는 ul과 li의 부모·자식 목록만 그립니다. document, html, body와 텍스트 노드는 그리지 않습니다. n1, n2 같은 이름은 노드를 구분하려고 붙인 표시이고 DOM에 있는 값이 아닙니다. 어느 부모의 자식 목록에도 없는 노드를 "문서에서 떨어진 노드"로 그리는 것은 두 시나리오의 부모(ul)가 모두 문서에 연결된 요소라는 전제에서 isConnected와 같은 결과입니다. 표준은 innerHTML 대입에서 문자열을 먼저 파싱한 뒤 replace all로 자식을 제거하지만, 그림은 새 노드를 삽입 단계에서 처음 보입니다.',
    '예제의 console.log와 이 페이지의 DOM API는 모두 ECMAScript 언어가 아니라 호스트(브라우저)가 제공하는 것입니다.',
  ],
  references: [
    {
      label: 'WHATWG HTML — The innerHTML property',
      url: 'https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#the-innerhtml-property',
    },
    {
      label: 'WHATWG HTML — Element.innerHTML',
      url: 'https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-innerhtml',
    },
    {
      label: 'WHATWG HTML — The insertAdjacentHTML() method',
      url: 'https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#the-insertadjacenthtml',
    },
    {
      label: 'WHATWG HTML — HTML fragment parsing algorithm',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#html-fragment-parsing-algorithm',
    },
    {
      label: 'WHATWG HTML — HTML fragment serialisation algorithm',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#html-fragment-serialisation-algorithm',
    },
    {
      label: 'WHATWG HTML — "in body" 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody',
    },
    {
      label: 'WHATWG HTML — "in table" 삽입 모드',
      url: 'https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable',
    },
    {
      label: 'WHATWG HTML — update the image data',
      url: 'https://html.spec.whatwg.org/multipage/images.html#update-the-image-data',
    },
    {
      label: 'WHATWG DOM — insert',
      url: 'https://dom.spec.whatwg.org/#concept-node-insert',
    },
    {
      label: 'WHATWG DOM — adopt',
      url: 'https://dom.spec.whatwg.org/#concept-node-adopt',
    },
    {
      label: 'WHATWG DOM — remove',
      url: 'https://dom.spec.whatwg.org/#concept-node-remove',
    },
    {
      label: 'WHATWG DOM — replace all',
      url: 'https://dom.spec.whatwg.org/#concept-node-replace-all',
    },
    {
      label: 'WHATWG DOM — Node.appendChild()',
      url: 'https://dom.spec.whatwg.org/#dom-node-appendchild',
    },
    {
      label: 'WHATWG DOM — ParentNode.append()',
      url: 'https://dom.spec.whatwg.org/#dom-parentnode-append',
    },
    {
      label: 'WHATWG DOM — DocumentFragment',
      url: 'https://dom.spec.whatwg.org/#interface-documentfragment',
    },
    {
      label: 'WHATWG DOM — Node.cloneNode()',
      url: 'https://dom.spec.whatwg.org/#dom-node-clonenode',
    },
    {
      label: 'MDN — Element.innerHTML',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Element/innerHTML',
    },
    {
      label: 'MDN — Element.insertAdjacentHTML()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Element/insertAdjacentHTML',
    },
    {
      label: 'MDN — Node.appendChild()',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/Node/appendChild',
    },
    {
      label: 'MDN — Node.cloneNode()',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/Node/cloneNode',
    },
    {
      label: 'MDN — DocumentFragment',
      url: 'https://developer.mozilla.org/ko/docs/Web/API/DocumentFragment',
    },
  ],
  reviewedAt: '2026-11-17',
} satisfies ConceptMeta
