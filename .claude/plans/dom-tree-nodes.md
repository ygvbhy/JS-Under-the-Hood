# 개념 'DOM 트리와 노드 종류' 구현 계획

- 상태: 완료
- 작성일: 2026-11-03
- 기준: `main` @ `467d06c`

## 0. 요약

- 목적: 38~42장 로드맵 2번 `/concepts/dom-tree-nodes`를 추가한다. 39장의 노드 종류·노드 탐색·노드 정보·텍스트 조작을 브라우저 예제 7개, 실제 DOM에서 그린 노드 트리 그림, 퀴즈로 WHATWG DOM·HTML 표준 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `browser`, order 350으로 학습 순서 37번째·마지막, 개념 전용 트리 그림 컴포넌트 `NodeTreeView`). 개수·마지막 개념 고정 테스트, e2e·빌드 테스트, content-guide e2e 목록, 로드맵을 고친다. 공통 코드와 기존 개념 36개는 바꾸지 않는다.
- 위험: ① 트리 그림이 실제 DOM과 어긋남 ② Chromium 구현 차이(예: `document`의 `HTMLDocument`)를 표준처럼 씀 ③ 뒷장(39장 뒤쪽 HTMLCollection·어트리뷰트·innerHTML, 40장 이벤트)을 전제 → 그림은 트리 예제의 검증된 `expectedOutput`을 그대로 파싱해 그리고, 표준과 다른 구현 값은 예제에서 뺐으며, 도구로만 쓰는 API는 단순화에 밝힌다.
- 복잡도: 중간 · Consensus: 생략. 직전 개념과 같은 "브라우저 예제 + 시각화 + 퀴즈" 패턴이고 공통 코드를 바꾸지 않는다. 개념 전용 View 컴포넌트+테스트는 기존 개념들의 `*View.tsx`·`*View.test.tsx` 패턴이다. 예제 7개 출력은 실행기로 5회씩 확인했고 핵심 주장은 표준 원문과 대조했다.
- 미확정: 없음(추가 주제 4개·시각화·제목은 2026-11-03 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 2번 "DOM 트리와 노드 종류"(39장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch38-42.md`).
- 사용자 결정(2026-11-03)
  - 기본 범위: ① 노드 종류와 `nodeType`·`nodeName`(문서 9, 문서 유형 10, 요소 1, 텍스트 3, 주석 8, 어트리뷰트 노드 2는 트리에 들지 않음) ② 공백 텍스트 노드 때문에 `childNodes`/`children`, `firstChild`/`firstElementChild`, `nextSibling`/`nextElementSibling`, `parentNode`/`parentElement`가 달라짐 ③ `nodeValue`와 `textContent`(요소의 `nodeValue`는 `null`).
  - 추가 주제 4개 모두: **파서가 고친 트리**(`<table><tr>`에 `tbody`, `<p>` 안 `<div>` → 빈 `p`가 하나 더), **head·body 밖의 공백**(`</head>`와 `<body>` 사이는 `html`의 자식 텍스트, `</body>` 뒤는 `body` 안), **노드의 상속 구조**(`HTMLLIElement → HTMLElement → Element → Node → EventTarget`, `Text → CharacterData → Node`), **`textContent` 대입**(HTML로 해석하지 않고 텍스트 노드 하나).
  - 시각화: **실행 검증 트리 그림 + 퀴즈** — 트리 예제 문서의 모든 노드(공백 텍스트 노드 포함)를 중첩 목록으로 그린다. 그림 데이터는 그 문서를 Chromium에서 순회해 찍은 예제 출력(`expectedOutput`)을 그대로 파싱한 것이라 실제 DOM과 어긋날 수 없다. JS 없이도 보인다(정적 마크업).
  - 제목 "DOM 트리와 노드 종류: li 하나만 있는 ul의 childNodes는 왜 3개일까", slug `dom-tree-nodes`.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① HTML 문서는 노드 트리가 된다, 트리 그림(예제 1 `tree.html` + `walk.js`): 파서가 만든 노드를 `defer` 스크립트([script의 async와 defer](/concepts/script-async-defer))가 파싱이 끝난 뒤 깊이 우선으로 찍는다. 문서 노드가 뿌리, 그 자식이 문서 유형(`html`)과 `HTML` 요소. 줄바꿈·들여쓰기도 텍스트 노드.
  - ② 노드 종류와 `nodeType`·`nodeName`(예제 2 `node-types.html`): DOM 표준 `Node` 상수(`ELEMENT_NODE = 1`, `ATTRIBUTE_NODE = 2`, `TEXT_NODE = 3`, `COMMENT_NODE = 8`, `DOCUMENT_NODE = 9`, `DOCUMENT_TYPE_NODE = 10`)와 `nodeName` 규칙(요소는 대문자 이름, 텍스트 `#text`, 주석 `#comment`, 문서 `#document`, 문서 유형은 그 이름). 어트리뷰트 노드: "Attr nodes participate in a tree for historical reasons; they never have a (non-null) parent or any children and are therefore alone in a tree" → `parentNode`가 `null`, 요소의 `childNodes`에 없다(`p.childNodes.length` 1).
  - ③ 공백 텍스트 노드와 탐색 프로퍼티 쌍(예제 3 `whitespace.html`): `childNodes`는 "a NodeList rooted at this matching only children", `children`은 "an HTMLCollection collection rooted at this matching only element children". `firstChild`/`firstElementChild`, `nextSibling`/`nextElementSibling`(형제 요소가 없으면 `null`), `parentNode`/`parentElement`(`html`의 부모는 문서 노드라 `parentElement`는 `null`). NodeList·HTMLCollection의 차이(살아 있음)는 다음 개념(3번)으로 미룸.
  - ④ head·body 밖의 공백(예제 1의 트리에서 확인): HTML 파서의 삽입 모드 규칙 — "before head"에서 공백은 "Ignore the token"(그래서 `HTML`의 첫 자식은 `HEAD`), "after head"에서는 "Insert the character"(그래서 `HEAD`와 `BODY` 사이 `#text`가 `HTML`의 자식), "after body"·"after after body"에서는 "Process the token using the rules for the "in body" insertion mode"(그래서 `</body>`·`</html>` 뒤 줄바꿈이 `BODY` 안). 인접한 문자는 "insert a character"가 앞 텍스트 노드에 이어 붙이므로("If previousSibling is a Text node, then append data to previousSibling's data") `BODY`의 마지막 자식은 `"\n\n\n"` 하나.
  - ⑤ 파서가 고친 트리(예제 5 `parser-fix.html`): "in table" 삽입 모드의 `tr` 시작 태그 → "Insert an HTML element for a "tbody" start tag token with no attributes". "in body"의 `div` 시작 태그 → "If the stack of open elements has a p element in button scope, then close a p element", 그 뒤 `</p>` → "If the stack of open elements does not have a p element in button scope, then this is a parse error; insert an HTML element for a "p" start tag token with no attributes". 그래서 `p#note`는 비고(`childNodes` 0), 다음 형제가 `DIV`, 문서의 `p`는 2개. 소스와 DOM이 다를 수 있다.
  - ⑥ `nodeValue`와 `textContent`(예제 4 `node-value.html`): `nodeValue`는 "Attr this's value. CharacterData this's data. Otherwise Null." → 요소는 `null`. `textContent` 읽기는 "get text content" — 요소는 "The descendant text content of node". 텍스트 노드의 `nodeValue`를 바꾸면 `textContent`도 바뀌고 노드 수는 그대로.
  - ⑦ `textContent` 대입(예제 6 `text-content.html`): 요소에 대입하면 "string replace all" — 빈 문자열이 아니면 텍스트 노드 하나를 만들어 모든 자식을 바꾼다. 그래서 `'<i>새 글</i>'`은 요소가 아니라 글자 그대로의 텍스트 노드 하나(`children` 0), 빈 문자열이면 자식이 없다(`hasChildNodes()` false). `innerHTML`과의 대비는 별도 개념(39장 DOM 조작)으로 한 줄.
  - ⑧ 노드의 상속 구조(예제 7 `inheritance.html`): 프로토타입 체인([프로토타입 체인](/concepts/prototype-chain))을 따라가면 `li`는 `HTMLLIElement → HTMLElement → Element → Node → EventTarget → Object`, 텍스트 노드는 `Text → CharacterData → Node → EventTarget → Object`. `children`은 Element(ParentNode 믹스인)에 있어 텍스트 노드에는 없다(`typeof` undefined), 반면 `childNodes`는 Node에 있다. 인터페이스 정의는 DOM 표준 IDL(`interface Text : CharacterData`, `interface CharacterData : Node`, `interface Element : Node`, `interface Node : EventTarget`)과 HTML 표준(`HTMLLIElement : HTMLElement`). `document`의 체인은 Chromium이 표준과 달리 `HTMLDocument`를 따로 두므로(HTML 표준: "a writable, configurable, non-enumerable property named HTMLDocument whose value is the Document interface object") 예제에서 뺐다.

### 유지해야 하는 기존 동작

- 기존 개념 36개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 트리 그림은 정적 마크업이라 JS 없이 보인다.
- 홈 '객체' 검색 결과(14개)를 바꾸지 않도록 title·summary·tags에 '객체'를 쓰지 않는다.

### 제외 범위

- 요소 취득 메서드의 차이(`getElementsBy*`의 HTMLCollection, `querySelectorAll`의 NodeList, 살아 있음) — 3번 개념
- 어트리뷰트와 프로퍼티 — 4번 개념(이 페이지는 `getAttributeNode`로 Attr 노드를 꺼내는 데만 씀)
- `innerHTML`·`insertAdjacentHTML`·`createElement`·노드 삽입/삭제(39장 DOM 조작), `innerText`(레이아웃 의존), Shadow DOM, `DocumentFragment`, CDATA·ProcessingInstruction
- 렌더 트리, CSS

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-03 내려받음: scratchpad `dom/domstd.html`(dom.spec.whatwg.org), `dom/parsing.html`·`dom/window.html`(html.spec.whatwg.org multipage))

- DOM `#concept-node-tree`: 노드 종류별 허용 자식 표, "Attr nodes participate in a tree for historical reasons; they never have a (non-null) parent or any children and are therefore alone in a tree."
- `#interface-node` IDL: `const unsigned short ELEMENT_NODE = 1; ATTRIBUTE_NODE = 2; TEXT_NODE = 3; … COMMENT_NODE = 8; DOCUMENT_NODE = 9; DOCUMENT_TYPE_NODE = 10; DOCUMENT_FRAGMENT_NODE = 11`.
- `#dom-node-nodename`: Element "Its HTML-uppercased qualified name", Attr "Its qualified name", Text "#text", Comment "#comment", Document "#document", DocumentType "Its name".
- `#dom-node-childnodes`: "return a NodeList rooted at this matching only children". `#dom-parentnode-children`: "return an HTMLCollection collection rooted at this matching only element children". `firstElementChild`: "the first child that is an element; otherwise null".
- `#dom-node-nodevalue`: "Attr this's value. CharacterData this's data. Otherwise Null." `#get-text-content`: Element "The descendant text content of node", Attr value, CharacterData data, Otherwise Null. `#dom-node-textcontent` setter → "string replace all": "If string is not the empty string, then set node to the result of creating a text node … Replace all with node within parent."
- HTML 파서(`parsing.html`): "before head" 공백 "Ignore the token." / "in head"·"after head" 공백 "Insert the character." / "after body" 공백 "Process the token using the rules for the "in body" insertion mode." / "after after body" 공백도 in body 규칙 / "in table"의 `td`·`th`·`tr` 시작 태그 "Clear the stack back to a table context. … Insert an HTML element for a "tbody" start tag token with no attributes" / "in body"의 `div` 등 시작 태그 "If the stack of open elements has a p element in button scope, then close a p element." / `</p>` "If the stack of open elements does not have a p element in button scope, then this is a parse error; insert an HTML element for a "p" start tag token with no attributes. Close a p element." / insert a character: "If previousSibling is a Text node, then append data to previousSibling's data. Otherwise, … creating a text node".
- HTML(`window.html`): "For historical reasons, Window objects must also have a writable, configurable, non-enumerable property named HTMLDocument whose value is the Document interface object." → 표준에서 `HTMLDocument`는 `Document`와 같은 객체. Chromium은 체인에 `HTMLDocument`를 따로 보고(`["HTMLDocument","Document",…]`) → 예제에서 제외.

### 사실 (실행 확인 — Playwright 1.64.1 Chromium, `runBrowserExample` settleMs 300, 예제마다 5회 연속 같은 출력)

초안: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/dom/ex/`(부록).

| # | 예제 | resources | 실제 출력 |
| - | - | - | - |
| 1 | `tree.html` | `/walk.js`(0) | 23줄: `#document` / `  html` / `  HTML` / `    HEAD` / `      #text "\n"` / `      META` / `      #text "\n"` / `      SCRIPT` / `      #text "\n"` / `    #text "\n"` / `    BODY` / `      #text "\n"` / `      #comment " 과일 "` / `      #text "\n"` / `      UL` / `        #text "\n  "` / `        LI` / `          #text "사과"` / `        #text "\n  "` / `        LI` / `          #text "배"` / `        #text "\n"` / `      #text "\n\n\n"` |
| 2 | `node-types.html` | 없음 | `9 #document` / `10 html` / `1 HTML` / `8 #comment` / `3 #text` / `2 class null 1` |
| 3 | `whitespace.html` | 없음 | `3 1` / `#text "\n  "` / `LI #text` / `#text null` / `#text SCRIPT` / `#document null` |
| 4 | `node-value.html` | 없음 | `null 3` / `"안녕 " "안녕 세상!"` / `"잘 가 세상!" 3` |
| 5 | `parser-fix.html` | 없음 | `TBODY TR` / `0 DIV` / `2` |
| 6 | `text-content.html` | 없음 | `1 #text 0` / `"<i>새 글</i>"` / `0 false` |
| 7 | `inheritance.html` | 없음 | `["HTMLLIElement","HTMLElement","Element","Node","EventTarget","Object"]` / `["Text","CharacterData","Node","EventTarget","Object"]` / `true false undefined` |

- 예제 7의 `chain(document)` 줄은 Chromium 구현 차이라 초안에서 지웠다(지운 뒤 줄 수 3).
- 예제 1의 들여쓰기는 깊이마다 공백 2칸이고 실행기 출력 규칙(문자열은 그대로)에 따라 앞 공백이 보존된다. 지연에 의존하는 줄은 없다(모든 예제의 순서는 파서·DOM 표준이 정한다).

### 사실 (코드에서 확인)

- 개념 전용 View 컴포넌트와 jsdom 테스트 패턴: `app/concepts/closure/ClosureView.tsx`·`ClosureView.test.tsx` 등(`*.test.tsx`는 jsdom 프로젝트, `vitest.config.ts`).
- 고정 테스트(36개·마지막 script-async-defer): `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`(홈 학습 순서 36), `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx` — 직전 커밋 `467d06c`가 고친 위치와 같다.
- 브라우저 예제 인프라·`<Wide>`·Shiki html 펜스는 직전 개념에서 쓴 그대로(`467d06c`).

### 추정

- 없음

## 3. 구현 전략

- 구성: `meta.ts` + `content.mdx` + `route.tsx`(그대로 복사) + `node-tree.ts`(트리 예제 출력 줄 → 트리 데이터 파서) + `NodeTreeView.tsx`(정적 중첩 목록 렌더) + `NodeTreeView.test.tsx` + `concept.test.ts` + `examples/`.
- 트리 그림의 근거: `content.mdx`가 `concept.examples`에서 `tree` 예제의 `expectedOutput`을 꺼내 `parseNodeLines`로 트리를 만들고 `NodeTreeView`로 그린다. 별도 데이터가 없으므로 그림 = 검증된 출력이다. `parseNodeLines(lines)`: 각 줄의 앞 공백 수 / 2 = 깊이, 나머지에서 `nodeName`과(있으면) JSON 문자열 값을 분리, 깊이가 1씩만 늘어나는지 검사하고 어기면 throw(출력 형식이 바뀌면 테스트·빌드가 실패). 노드 종류는 `nodeName`으로 분류: `#document` 문서, `#text` 텍스트, `#comment` 주석, 대문자 이름 요소, 첫 줄 바로 아래의 소문자 이름은 문서 유형.
- `NodeTreeView`: `role="region"`·`aria-label`이 있는 영역 안에 중첩 `<ul>`. 노드마다 종류 배지(글자: 문서·문서 유형·요소·텍스트·주석 — 색만으로 구분하지 않음), `nodeName`, 텍스트·주석은 JSON 문자열 값을 `<code>`로, 공백만 있는 텍스트는 "공백" 배지를 더한다. 범례 한 줄. 색은 기존 테마 토큰만. 좁은 화면은 `overflow-x-auto` 영역(가로 스크롤), 넓으면 `<Wide>` 필요 여부는 화면 확인 후 결정.
- 퀴즈 7개(`PredictQuiz`): 예제 1(`BODY`의 마지막 자식, `HTML`의 자식 수), 2(Attr 줄), 3(`childNodes`·`children` 수), 4(`p.nodeValue`), 5(`p` 개수), 6(`children` 수), 7(`typeof li.firstChild.children`).
- 뒷장 API: `getElementById`·`querySelectorAll`·`getAttributeNode`(39장 뒤쪽·어트리뷰트 개념)는 도구로만, `defer`는 직전 개념 링크.
- 버린 대안: 그림 데이터를 따로 손으로 쓰고 테스트로 대조(같은 정보를 두 번 쓰게 됨), 공백 노드 토글(사용자 미선택), 비교표(사용자 미선택), `document` 상속 체인 예제(Chromium 구현이 표준과 다름).

## 4. 변경 파일

- 추가 `app/concepts/dom-tree-nodes/`
  - `meta.ts`(category `browser`, order 350, prerequisites `[{ label: 'script의 async와 defer', slug: 'script-async-defer' }, { label: '프로토타입 체인', slug: 'prototype-chain' }]`, related `['script-async-defer', 'prototype-chain']`, examples 7개 runtime `browser`, reviewedAt은 사용자 콘텐츠 승인 날짜), `content.mdx`, `route.tsx`, `node-tree.ts`, `NodeTreeView.tsx`, `NodeTreeView.test.tsx`, `concept.test.ts`
  - `examples/`(8개): 부록의 `tree.html`, `walk.js`, `node-types.html`, `whitespace.html`, `node-value.html`, `text-content.html`, `parser-fix.html`, `inheritance.html`
- 수정
  - `tests/e2e/helpers.ts`: `DOM_TREE_NODES_PATH = '/concepts/dom-tree-nodes'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe(라이트·다크, '정답 확인' 버튼 보인 뒤), 이름 '개념 페이지: DOM 트리와 노드 종류'
  - `tests/e2e/responsive.spec.ts`: `${DOM_TREE_NODES_PATH}: 가로 스크롤이 없다`, 홈 학습 순서 36→37
  - `tests/e2e/navigation.spec.ts`: 카드 36→37(두 곳), 마지막 '37번째'와 새 제목, pager 분모 36→37 전부, script-async-defer '36 / 37'·링크 2개(이전 set-map, 다음 dom-tree-nodes), 새 개념 '37 / 37'·이전 링크 script-async-defer. '객체' 검색 그대로
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 37, 마지막 dom-tree-nodes(prev script-async-defer, position 37)
  - `tests/build/build-output.test.ts`: `프리렌더 (dom-tree-nodes)` describe — 트리 region aria-label, 트리 목록 항목(노드) 23개, `<details` 7개 이상
  - `docs/content-guide.md`: e2e 대상 목록에 `dom-tree-nodes`
  - `.claude/plans/concept-roadmap-ch38-42.md`: 2번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes/`, `tests/helpers/`, 기존 개념 폴더 36개

## 5. 위험 요소

- 트리 그림과 실제 DOM 불일치 → 그림은 `expectedOutput`을 직접 파싱(별도 데이터 없음), 파서는 형식 위반에서 throw, `concept.test.ts`가 노드 23개·종류별 개수·특정 경로(`HTML`의 자식이 `HEAD`·`#text`·`BODY`)를 검사(단계 2)
- 들여쓰기 공백이 렌더에서 사라짐(HTML 공백 접힘) → 깊이는 중첩 목록 구조로 표현하고 값은 JSON 문자열(`"\n  "`)로 보여 공백이 글자로 드러나게(단계 2)
- 표준과 다른 구현 값 → 예제 7에서 `document` 체인 제외, 단순화에 "결과는 Chromium" 명시(단계 1·3)
- 뒷장 API 전제 → 단순화(단계 3)
- 트리 그림 접근성(색 의존, 긴 목록) → 종류 글자 배지, region·aria-label, axe e2e(단계 2·4)
- 375px에서 깊은 들여쓰기로 넘침 → region 안 가로 스크롤, 문서 가로 스크롤 없음 e2e(단계 4)

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "dom-tree-nodes|DOM 트리와 노드 종류|홈"`
- 화면(빌드 결과 serve, 메인 직접): 트리 그림 라이트·다크, 375px·1280px, 공백 텍스트 노드가 `"\n  "`로 보이는지, 종류 배지, 퀴즈 7개 정답 확인
- 콘텐츠: 표준 인용을 내려받은 원문과 글자 대조, 참고 링크 anchor 존재 확인

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/` 8개(부록 초안 `cp`), `meta.ts`, 임시 `content.mdx`(필수 h2 3개), `route.tsx`(이 순서)
- 완료 조건: `tests/examples.test.ts`·`tests/content-integrity.test.ts` 3회 연속 통과, 예제 1 기대값 한 줄을 바꾸면 실패하는 음성 확인 후 원복

### 2. 트리 파서·그림 컴포넌트와 테스트

- 대상: `node-tree.ts`, `NodeTreeView.tsx`, `NodeTreeView.test.tsx`, `concept.test.ts`
- 완료 조건: `parseNodeLines`가 예제 1 출력을 노드 23개(문서 1·문서 유형 1·요소 8·텍스트 12·주석 1)로 만들고, 깊이가 2 이상 건너뛰는 줄·홀수 들여쓰기에서 throw(단위 테스트), `NodeTreeView` 렌더 결과에 `listitem` 23개·종류 배지 글자·"공백" 배지(공백만 있는 텍스트 10개), 음성 확인

### 3. 본문 작성

- 대상: `content.mdx`, `meta.ts`(summary·goals·simplifications·references 확정)
- 완료 조건: lint·format:check·typecheck·관련 vitest 통과, 표준 인용 글자 대조, 빌드 결과 화면 6절 확인

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 완료 조건: 전체 `npm test` 3회 연속 통과, `npm run test:build`, 6절 e2e 통과

## 부록: 예제 초안

### `tree.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script defer src="/walk.js"></script>
</head>
<body>
<!-- 과일 -->
<ul>
  <li>사과</li>
  <li>배</li>
</ul>
</body>
</html>
```

### `walk.js`

```js
function walk(node, depth) {
  var label = node.nodeName;
  if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
    label += ' ' + JSON.stringify(node.nodeValue);
  }
  console.log('  '.repeat(depth) + label);
  for (var i = 0; i < node.childNodes.length; i++) {
    walk(node.childNodes[i], depth + 1);
  }
}
walk(document, 0);
```

### `node-types.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<!-- 주석 -->
<p id="intro" class="lead">안녕</p>
<script>
var p = document.getElementById('intro');
console.log(document.nodeType, document.nodeName);
console.log(document.firstChild.nodeType, document.firstChild.nodeName);
console.log(document.documentElement.nodeType, document.documentElement.nodeName);
console.log(document.body.childNodes[1].nodeType, document.body.childNodes[1].nodeName);
console.log(p.firstChild.nodeType, p.firstChild.nodeName);
var attr = p.getAttributeNode('class');
console.log(attr.nodeType, attr.nodeName, attr.parentNode, p.childNodes.length);
</script>
</body>
</html>
```

### `whitespace.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul id="fruits">
  <li>사과</li>
</ul>
<script>
var ul = document.getElementById('fruits');
console.log(ul.childNodes.length, ul.children.length);
console.log(ul.firstChild.nodeName, JSON.stringify(ul.firstChild.nodeValue));
console.log(ul.firstElementChild.nodeName, ul.firstElementChild.firstChild.nodeName);
var li = ul.firstElementChild;
console.log(li.nextSibling.nodeName, li.nextElementSibling);
console.log(ul.nextSibling.nodeName, ul.nextElementSibling.nodeName);
var html = document.documentElement;
console.log(html.parentNode.nodeName, html.parentElement);
</script>
</body>
</html>
```

### `node-value.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<p id="greet">안녕 <b>세상</b>!</p>
<script>
var p = document.getElementById('greet');
console.log(p.nodeValue, p.childNodes.length);
console.log(JSON.stringify(p.firstChild.nodeValue), JSON.stringify(p.textContent));
p.firstChild.nodeValue = '잘 가 ';
console.log(JSON.stringify(p.textContent), p.childNodes.length);
</script>
</body>
</html>
```

### `text-content.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<p id="greet">안녕 <b>세상</b>!</p>
<script>
var p = document.getElementById('greet');
p.textContent = '<i>새 글</i>';
console.log(p.childNodes.length, p.firstChild.nodeName, p.children.length);
console.log(JSON.stringify(p.textContent));
p.textContent = '';
console.log(p.childNodes.length, p.hasChildNodes());
</script>
</body>
</html>
```

### `parser-fix.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<table id="scores"><tr><td>90</td></tr></table>
<p id="note"><div>블록</div></p>
<script>
var table = document.getElementById('scores');
console.log(table.firstElementChild.nodeName, table.firstElementChild.firstElementChild.nodeName);
var p = document.getElementById('note');
console.log(p.childNodes.length, p.nextElementSibling.nodeName);
console.log(document.querySelectorAll('p').length);
</script>
</body>
</html>
```

### `inheritance.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul><li id="item">사과</li></ul>
<script>
function chain(obj) {
  var names = [];
  for (var o = Object.getPrototypeOf(obj); o !== null; o = Object.getPrototypeOf(o)) {
    names.push(o.constructor.name);
  }
  return JSON.stringify(names);
}
var li = document.getElementById('item');
console.log(chain(li));
console.log(chain(li.firstChild));
console.log(li instanceof Node, li.firstChild instanceof Element, typeof li.firstChild.children);
</script>
</body>
</html>
```


## 변경 이력

- 2026-11-03 (사용자 전달 외부 검토 6건, 표준 원문·Chromium으로 확인 후 반영): ① `</body>`·`</html>` 뒤 공백이 BODY에 들어가는 원인을 "in body 규칙이 body에 넣어서"가 아니라 "두 종료 태그가 모드만 바꾸고 열린 요소 스택에서 body를 빼지 않아 현재 노드가 body"로 고침(표준 in body의 `body` 종료 태그는 "Switch the insertion mode to "after body"", after body의 `html` 종료 태그는 "switch the insertion mode to "after after body"") ② "before html"에서 doctype 뒤 공백이 버려지고 insert a character가 문서 노드에는 넣지 않는다("If targetParent is a Document node, then return.")는 설명 추가, 흔한 오해에 `<html>` 앞 공백과 `<pre>`·`<textarea>` 바로 뒤 첫 줄바꿈 추가(표준 in body 규칙, Chromium 확인: `pre`·`textarea`의 첫 줄바꿈 없음) ③ `nodeName` 대문자화는 HTML 네임스페이스 요소만(표준 HTML-uppercased qualified name 정의, Chromium 확인: `svg`·`foreignObject` 소문자) ④ Attr 인용 풀이를 "부모는 항상 null"로 ⑤ HTMLDocument 문장을 "이 페이지가 실행하는 Chromium은 … (다른 브라우저는 확인하지 않았습니다)"로 — 다른 엔진 동작은 실행 확인할 수 없어 주장하지 않음 ⑥ 아직 없는 "다음 개념" 참조를 "별도 개념"으로(본문·simplifications). 참고 자료에 before html 삽입 모드 추가 — 영향 단계 3
- 2026-11-03 (사용자 전달 추가 검토 1건): SVG 요소 `nodeName`을 "소문자 그대로"에서 "대문자로 바꾸지 않고 이름 그대로(`svg`, `foreignObject`)"로 두 곳 수정 — HTML 파서가 외래 콘텐츠의 태그 이름을 표("This fixes the case of SVG elements that are not all lowercase.")로 바로잡음, Chromium 확인 `foreignObject` — 영향 단계 3

## 구현 진행

- baseline (2026-11-03, `467d06c`): lint·format:check·typecheck 통과 / `npm test` 104 files·3348 tests 통과. test:build·e2e는 직전 커밋 검증에서 통과(294 / navigation 16·관련 31).
- [x] 1. 예제·meta·route — 메인 확인: `examples/` 8개가 초안과 `diff -r` 동일, meta 7개 예제의 expectedOutput이 2절 표와 같음(tree 23줄, `'      #text "\\n"'` 형태), summary 144자·'객체' 없음, MDN 한국어판 404인 Node·Node.nodeType은 영문판으로(서브에이전트 curl 확인). `tests/examples.test.ts`+`content-integrity.test.ts` 3회 연속 767 통과. 서브에이전트 음성 확인: tree 기대값 `'  html'`→`'  htm'`이면 실패
- [x] 2. 트리 파서·그림 컴포넌트 — 메인 확인: `node-tree.ts`·`NodeTreeView.tsx`(정적, 훅 없음, 글자 배지·공백 배지·JSON 값), 테스트 17개 통과. 메인 수정: 서브에이전트 음성 확인에서 `META`를 텍스트 노드 아래로 옮긴 출력이 단위 테스트를 통과해, 텍스트·주석 노드가 자식을 가지면 throw하는 규칙과 테스트 추가 → 같은 변조가 4개 실패로 잡힘, 원복 후 17 통과
- [x] 3. 본문 — 메인이 `content.mdx` 전문을 읽고 대조: 표준 인용이 2절 원문과 같음, 예제 7개 파일의 줄 번호 참조를 직접 셈, 퀴즈 10개(예제 1·3·7은 2개씩) 정답이 `expectedOutput`과 같음. 메인 수정 3건: ① 예제 1 결과 설명이 `</ul>` 뒤 줄바꿈까지 "after body"에서 처리된다고 묶어 써서 "in body"로 바로잡음 ② 트리 그림의 `"\n  "`가 렌더에서 공백 하나로 접혀 값 `<code>`를 `whitespace-pre`로 ③ 여러 줄 `export const treeRoot = …`의 둘째 줄을 공통 빌드 테스트(`firstProseLine`)가 본문 첫 문장으로 읽어 실패 → 계산을 `tree-root.ts`로 옮기고 본문은 import만(공통 테스트는 변경하지 않음). 화면(빌드 serve): 트리 1280·375 라이트·다크, 두 칸 공백 보임, 문서 가로 스크롤 없음
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — 메인이 diff 확인(37개·마지막 dom-tree-nodes, script-async-defer pager 36/37·다음 링크, '객체' 검색 그대로, a11y·responsive 추가, 빌드 테스트는 트리 region의 `<li` 23개·`<details` ≥ 7, content-guide·로드맵 '구현 중')
- 전체 검증(2026-11-03): lint·format:check·typecheck 통과, `npm test` 3회 연속 3385 통과(20.55s·21.54s·20.76s, 마지막 수정 뒤 1회 더 통과 20.30s), `test:build` 302 통과, navigation 16 passed, `-g "dom-tree-nodes|DOM 트리와 노드 종류|홈"` 31 passed·1 skipped(기존 조건부)
- 리뷰 1차(critical-code-review, 메인 직접 — 본문 전문·파서·View·테스트·고정 테스트 diff): Critical/High/Medium 0 · Low 1(보고만) — `npm test`가 baseline 16.05s에서 약 20~21s로 늘었다(브라우저 예제 16개가 순차 실행되는 `examples.test.ts`가 가장 긴 파일이 됨). 인프라 계획의 추가 개선 후보(브라우저 분기 병렬화) 대상
- 외부 검토 반영 뒤 검증: lint·format:check·typecheck 통과, `npm test` 3회 연속 3385 통과(20.99s·20.86s·20.54s), `test:build` 302 통과, navigation 16 passed, `-g` 31 passed·1 skipped
- 추가 검토 반영 뒤 검증: lint·format:check·typecheck 통과, `npm test` 3385 통과(20.81s), `test:build` 302 통과, 새 페이지 e2e 6 passed

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 예제 7개(+`walk.js`), 실행 출력에서 그린 노드 트리 그림, 퀴즈로 구현. 퀴즈는 계획 7개보다 많은 10개(예제 1·3·7은 출력이 길거나 공백이 중요해 줄 일부를 2개씩 물음).
- 계획에 없던 추가: 텍스트·주석 노드 아래 자식을 막는 파서 규칙, 트리 계산 전용 `tree-root.ts`(여러 줄 `export`를 공통 빌드 테스트가 본문 첫 문장으로 읽어 분리), 값 `<code>`의 `whitespace-pre`.
- 사용자가 전달한 외부 검토 두 차례(7건)를 표준 원문·Chromium으로 확인한 뒤 반영(변경 이력).

### 코드 리뷰

- Critical/High/Medium 0. Low 1건 유지: `npm test`가 baseline 16.05s에서 약 20~21s로 늘었다(순차 실행되는 브라우저 예제 16개). 인프라 계획의 추가 개선 후보(브라우저 분기 병렬화) 대상.

### 후속 작업

- [ ] `examples.test.ts` 브라우저 예제 병렬화 검토(인프라 계획 9절) — 38~42장 개념이 늘수록 `npm test` 시간이 늘어남
- [ ] 3번 개념(HTMLCollection은 살아 있다)이 생기면 이 페이지의 "별도 개념" 문구를 링크로(역방향 링크 일괄 처리 목록)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] `parseNodeLines`에 "텍스트·주석 노드 아래에 자식이 오면 throw" 규칙 추가 — 계기: 서브에이전트 음성 확인에서 `META`를 텍스트 노드 아래로 옮긴 출력이 노드 수·종류 수가 같아 단위 테스트를 통과. DOM 표준 노드 트리 표상 텍스트·주석은 자식이 없으므로 구조 자체로 막는다.
- [Claude 판단] 트리 계산을 `tree-root.ts`로 분리 — 대안: 공통 빌드 테스트(`firstProseLine`)가 여러 줄 `export`를 건너뛰게 고치기. 이유: 공통 테스트를 바꾸면 모든 개념에 영향이 가고, 본문에 계산 코드를 두지 않는 편이 기존 개념들의 import 패턴과도 같다.
- [Claude 판단] 텍스트 값 `<code>`에 `whitespace-pre` — HTML 공백 접힘 때문에 `"\n  "`의 두 칸이 한 칸으로 보였다. 이 페이지의 핵심이 공백 노드라 값이 글자 그대로 보여야 한다.
- [Claude 판단] 외부 검토의 "Firefox·WebKit도 HTMLDocument를 따로 노출" 제안은 반영하지 않고 "이 페이지가 실행하는 Chromium은 … (다른 브라우저는 확인하지 않았습니다)"로 범위만 밝힘 — 이 저장소는 Chromium만 실행하므로 다른 엔진 동작은 검증할 수 없다.
- [무검토 승인] 트리 그림을 별도 데이터 없이 예제 1의 `expectedOutput`에서 직접 파싱 — 대안: 그림 데이터를 따로 쓰고 테스트로 대조. 이유: 같은 정보를 두 번 쓰지 않고, 출력은 L1이 Chromium으로 대조하므로 그림이 곧 검증된 실제 DOM이다.
- [무검토 승인] 상속 구조 예제에서 `document`의 체인을 뺌 — Chromium은 `HTMLDocument`를 별도 단계로 보고하지만 HTML 표준에서 `HTMLDocument`는 `Document`와 같은 객체다.
- 추가 주제 4개·실행 검증 트리 그림·제목은 사용자가 정했고, 외부 검토 7건은 사용자가 전달했다.

#### 배경지식

- HTML 파서는 삽입 모드마다 공백 문자를 다르게 처리한다: initial·before html·before head는 버리고, in head·after head는 그 자리에 넣고, after body·after after body는 in body 규칙으로 처리한다. `</body>`·`</html>` 종료 태그는 모드만 바꾸고 열린 요소 스택에서 `body`를 빼지 않으므로 그 뒤 공백도 현재 노드인 `body`에 들어간다.
- insert a character는 바로 앞 형제가 텍스트 노드면 데이터를 이어 붙이고, 넣을 곳이 문서 노드면 아무것도 하지 않는다. 그래서 `</ul>`·`</body>`·`</html>` 뒤 줄바꿈이 `"\n\n\n"` 하나가 되고, 문서 노드에는 텍스트 자식이 없다.
- `childNodes`(Node, 모든 자식)와 `children`(ParentNode 믹스인, 요소 자식만)은 정의된 인터페이스가 달라 텍스트 노드에는 `children`이 없다. `nodeName`의 대문자화는 HTML 문서의 HTML 네임스페이스 요소에만 적용되고, SVG 요소는 파서가 바로잡은 이름(`foreignObject`) 그대로다.
- 파서는 규칙에 어긋난 소스를 고친다: `<tr>` 앞에 `tbody`를 만들고, `div` 시작 태그가 열린 `p`를 닫으며, 짝 없는 `</p>`는 빈 `p`를 만든다.

#### 확인 질문

1. 트리 그림을 손으로 쓴 데이터가 아니라 예제 1의 출력에서 그리면 무엇이 보장되고, 그 보장은 어떤 테스트 사슬로 이어지는가?
   <details><summary>답</summary>그림 데이터가 따로 없으므로 그림 = 예제 1의 `expectedOutput`이다. `tests/examples.test.ts`가 그 출력을 실제 Chromium에서 `walk.js`로 순회한 결과와 대조하고, `parseNodeLines`는 형식이 어긋나면 throw해 테스트와 빌드를 실패시키며, 빌드 테스트가 프리렌더 HTML에 노드 23개가 있는지 본다. (`tree-root.ts`, `node-tree.ts`, 3절)</details>
2. `</body>` 뒤 줄바꿈이 `html`이 아니라 `BODY` 안에 들어가는 이유를 "in body 규칙이 body에 넣어서"라고 설명하면 무엇이 틀리는가?
   <details><summary>답</summary>in body 규칙은 현재 노드(열린 요소 스택의 가장 안쪽)에 문자를 넣는 규칙이라, `<div>` 안의 글자는 `div`에 들어간다. 실제 이유는 `</body>`·`</html>`이 삽입 모드만 after body·after after body로 바꾸고 스택에서 `body`를 빼지 않아 현재 노드가 여전히 `body`이기 때문이다. (변경 이력 첫 항목 ①)</details>
3. 예제 1에서 문서 노드의 자식이 문서 유형과 `HTML` 둘뿐이고 텍스트 노드가 없는 이유는?
   <details><summary>답</summary>`<!doctype html>` 뒤 공백은 "before html" 삽입 모드에서 "Ignore the token."으로 버려지고, insert a character도 넣을 곳이 문서 노드면 "If targetParent is a Document node, then return."으로 아무것도 하지 않는다. (본문 "head와 body 밖의 공백은 어디로 갈까")</details>
4. `parseNodeLines`에 "텍스트·주석 노드는 자식이 없다" 규칙이 없을 때 어떤 잘못된 출력이 단위 테스트를 통과했고, 그 규칙이 없어도 그 잘못을 잡는 테스트는 무엇인가?
   <details><summary>답</summary>`'      META'`를 `'        META'`로 바꿔 META가 텍스트 노드의 자식이 된 출력은 노드 수·종류별 개수가 그대로라 통과했다. 이 변조는 실제 DOM과 대조하는 `tests/examples.test.ts`가 잡는다. 규칙을 넣은 뒤에는 단위 테스트(`concept.test.ts`·`NodeTreeView.test.tsx`)도 실패한다. (구현 진행 단계 2)</details>
5. 공통 빌드 테스트가 이 개념에서만 실패했을 때 테스트가 아니라 개념 쪽을 고친 이유는?
   <details><summary>답</summary>`firstProseLine`은 모든 개념의 본문 첫 문장을 찾는 공통 검사라 고치면 37개 개념 전체에 영향이 간다. 실패 원인은 본문에 둔 여러 줄 `export` 계산식이었고, 이를 `tree-root.ts`로 옮겨 본문에는 import만 남기면 기존 개념들과 같은 모양이 된다. (구현 진행 단계 3 ③)</details>

