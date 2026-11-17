# DOM 조작 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-17
- 기준: `main` @ `7ac81dd`

## 0. 요약

- 목적: 추가 게시글 로드맵 2의 1번. "innerHTML에 +=를 했는데 먼저 잡아 둔 요소는 왜 문서에서 빠질까"를 질문으로, 문자열을 파싱해 넣는 API와 노드를 넣는 API가 트리를 어떻게 바꾸는지 설명하는 66번째 개념 페이지 `dom-manipulation`을 추가한다(order 377, 학습 순서 52번째).
- 범위: 새 개념 폴더(브라우저 예제 7개, 퀴즈 7개, 메서드 비교표, 시뮬레이터 1개·시나리오 2개), dom-tree-nodes·script-async-defer·live-html-collection의 "다루지 않는다" 문구, 순서·등록 테스트. 공통 코드 소스는 바꾸지 않는다.
- 위험: HTML 표준의 `innerHTML` 절이 최근 판에서 바뀌었다(Trusted Types, sanitizer, `runScripts` 옵션). 옛 문장("fragment parsing algorithm → replace all")을 그대로 인용하면 현재 원문과 어긋난다.
- 복잡도: 중간 · Consensus: 수행(Architect·Critic 1회, HIGH 1건과 MEDIUM 7건을 코드·표준·실행으로 확인해 반영)
- 미확정: 3건

## 1. 요구사항

- 요구사항(2026-11-17 사용자 결정)
  - 한 페이지. slug `dom-manipulation`, category `browser`, order 377(`classlist-style` 375 뒤, `event-propagation-delegation` 380 앞).
  - 제목: "DOM 조작: innerHTML에 +=를 했는데 먼저 잡아 둔 요소는 왜 문서에서 빠질까"
  - 기본 범위: `innerHTML` 대입은 자식 전체를 새 노드로 교체(`insertAdjacentHTML`은 기존 자식을 그대로 둠), 이미 문서에 있는 노드를 넣으면 복사가 아니라 이동.
  - 추가 주제 4개 모두: DocumentFragment / 문맥 파싱과 `innerHTML` 읽기 / `cloneNode`와 `remove` / `innerHTML`과 코드 실행.
  - 시각화: 노드 트리 시뮬레이터 1개(시나리오 2개: `innerHTML +=`, 노드 이동).
- 유지해야 하는 기존 동작: 기존 페이지의 예제·출력·퀴즈·`reviewedAt`, 공통 코드, 브라우저 예제 실행기.
- 제외 범위: `outerHTML`, `createContextualFragment`, `setHTML`·`setHTMLUnsafe`·Sanitizer, Trusted Types, Shadow DOM과 `<template>`, `replaceWith`·`before`·`after`·`replaceChildren`의 개별 설명, `importNode`·`adoptNode`(다른 문서), `moveBefore`(표준의 move), `removeChild`·`replaceChild`, MutationObserver, live range, 커스텀 엘리먼트 반응, 성능(리플로우) 주장.

## 2. 사실과 추정

### 사실 (코드·표준·실행에서 확인)

- 기존 서술
  - `dom-tree-nodes`가 `textContent` 대입을 다룬다: 절 `### textContent 대입은 HTML이 아니다`(`app/concepts/dom-tree-nodes/content.mdx:87`), 예제 6 `examples/text-content.html`. 단순화 항목에 "innerHTML, insertAdjacentHTML, createElement 같은 DOM 조작과 Shadow DOM, DocumentFragment는 다루지 않습니다."가 있다(`meta.ts`).
  - `script-async-defer`가 "innerHTML로 넣은 script는 실행되지 않는다"를 절(`content.mdx:57`)과 예제 9, 흔한 오해(`:419`)로 다룬다. Trusted Types 예외는 단순화 항목에 적혀 있다.
  - `live-html-collection`의 예제 3이 `list.append(document.createElement('li'))`를 쓴다(`examples/live-grow.html:15`). `event-propagation-delegation`의 예제가 `li.innerHTML = …`을 쓴다(`examples/delegation.html:25`).
- 순서: 현재 65개. order 375 `classlist-style`(51번째), 380 `event-propagation-delegation`(52번째). 새 페이지는 52번째 / 66. 홈 '객체' 검색 결과는 18개(`tests/e2e/navigation.spec.ts:24,39,100,137`).
- 브라우저 예제 규칙(`docs/content-guide.md:59-107`): `.html`은 `<!doctype html>`로 시작, 문서는 `http://example.test/`, 등록되지 않은 요청이 있으면 실패, 출력은 `settleMs`(기본 300) 안에 끝나야 한다.
- 표준 원문(2026-11-17 내려받은 사본, scratchpad `dm/dmi.txt`·`cl/dom.txt`)
  - HTML: `Element`의 `innerHTML` setter는 trusted type 검사 뒤 "Filter and set HTML given target, compliantString, compliantOptions, and Legacy"를 하고, filter and set HTML은 "parsing HTML for insertion"의 결과 fragment가 null이 아니면 "replace all with fragment within target"을 한다. 도입 설명은 "Replaces the contents of the element with nodes parsed from the given string."
  - HTML: `innerHTML` getter는 "fragment serializing algorithm steps"의 결과를 돌려준다.
  - HTML: fragment parsing algorithm steps는 `runScripts`(기본 false)를 넘기고 "Scripts in the returned fragment will only execute once they are inserted into a document, and only if runScripts is true."라고 적는다.
  - HTML: `insertAdjacentHTML`은 위치에 따라 context를 정하고(beforebegin·afterend는 부모, 부모가 null이거나 Document면 `NoModificationAllowedError`), fragment를 파싱한 뒤 위치에 맞게 insert·append한다. 위치 문자열이 넷 중 하나가 아니면 `SyntaxError` DOMException.
  - DOM: replace all은 "Remove all parent's children, in tree order" 뒤 node를 insert한다.
  - DOM: insert는 node가 DocumentFragment면 nodes를 그 자식들로 두고 "Remove its children"으로 프래그먼트에서 뺀 뒤, 각 node를 "Adopt node into parent's node document" 한다. adopt는 "If node's parent is non-null, then remove node."를 한다(이동의 근거).
  - DOM: `cloneNode(subtree)`는 subtree가 true일 때만 자식을 복제한다(매개변수 이름이 현재 판에서 `subtree`).
- 결과 표 검사는 마크업 출력을 대조하지 못한다: `normalizeCell`이 `{'…'}`를 풀기 전에 `/<[^>]*>/g`로 태그를 지운다(`tests/helpers/result-tables.ts:17-25`). 예제 2·5의 출력에는 `<li>…` 같은 마크업이 있다. 마크업 출력이 있는 기존 브라우저 페이지(`dom-tree-nodes`, `live-html-collection`, `script-async-defer`)는 결과 표 없이 `## 결과와 이유` 아래 `### 예제 N` 소제목으로 설명한다.
- `live-html-collection/meta.ts:110`의 단순화 항목에 "append, createElement, removeChild, className 대입은 DOM 조작 API이며, 이 페이지에서는 설명하지 않고 …"가 있다.
- order 375 이하의 예제에는 `click()`·click 리스너·`onclick` 사용이 없다(첫 사용은 380 `event-propagation-delegation`). 선례: `script-async-defer/meta.ts:123` "addEventListener는 이벤트 API이며, 이 페이지에서는 설명하지 않고 결과를 보이는 도구로만 씁니다."
- DOM 표준에는 이름이 move인 다른 연산이 있다: "To move a node"(`cl/dom.txt:1864`)와 `moveBefore(node, child)`(`:2147`). `appendChild`·`append`·`insertBefore`는 이 move가 아니라 adopt의 remove 뒤 insert다.
- 인자가 둘 이상인 `append(a, b)`는 "convert nodes into a node"로 DocumentFragment를 만들어 넣는다(`cl/dom.txt:2063`). 그래서 예제 3은 `appendChild`만 쓴다.
- 예제 초안을 검토 지적에 맞게 고쳐 실행기와 같은 조건(`http://example.test/`, 다른 요청 차단)으로 Chromium에서 실행했다(scratchpad `dm/ex2/*.html`, `dm/run.mjs`). 출력은 §8 단계 1에 적는다. 등록되지 않은 요청과 `pageerror`는 없었다.
  - `<img src="" onerror="…">`를 `innerHTML`로 넣으면 네트워크 요청 없이 `onerror`가 스크립트가 끝난 뒤 실행됐다.
  - `cloneNode(true)`로 만든 노드에 `click()`을 해도 원본에 `addEventListener`로 붙인 리스너는 실행되지 않았다(호출 횟수가 `1`에서 그대로).

### 추정

- 빈 `src`의 `error` 이벤트 경로: HTML 표준 "update the image data"에서 selected가 null이면 "Queue an element task on the DOM manipulation task source … fire an event named error at element"(메인이 `dm/images.html`에서 확인). 빈 `src`가 selected null로 이어지는 조건과 그 앞의 마이크로태스크 단계, 그리고 이 경로가 트리 연결을 조건으로 하지 않는다는 점은 Critic 보고다 — 단계 2에서 원문 단계를 읽어 확인한 뒤 쓴다. 확인하지 못한 부분은 "Chromium에서 실행한 결과"로만 쓴다.
- 문서에 넣은 적 없는 `div`의 `innerHTML`로 넣은 `<img src="" onerror>`도 `onerror`가 실행되고 `template.innerHTML`에서는 실행되지 않는다(Critic 탐침 `dm/critic/p2.html`) — 메인은 재현하지 않았다. 본문은 이 사실을 주장하지 않고, "삽입이 실행의 원인"이라는 표현만 피한다.
- `cloneNode`는 어트리뷰트 목록을 복제하므로 `onclick="…"` 어트리뷰트 핸들러는 복제본에도 있다(Critic: `cl/dom.txt:3063-3080`, 탐침 `dm/critic/p1.html`) — 단계 2에서 원문을 읽고, 본문에 쓰려면 탐침을 다시 실행한다.
- `div` 문맥에서 `tr`·`td` 시작 태그가 무시되는 근거는 HTML 파싱 장 "in body" 삽입 모드의 "Parse error. Ignore the token."이고, `table` 문맥의 `tbody`는 "in table" 규칙이라는 것(Critic: `dm/parsing.html`) — 단계 2에서 원문을 읽어 확인한 문장만 인용한다.
- 참고 링크의 앵커 id는 아직 확인하지 않았다 — 단계 1에서 사본 grep으로 확인한다.

## 3. 구현 전략

- 접근: `classlist-style`(직전 브라우저 개념, 시뮬레이터 포함)의 폴더 구조와 테스트 구성을 그대로 본뜬다. 본문의 축은 "문자열을 파싱해 새 노드를 만드는 API"(`innerHTML`, `insertAdjacentHTML`)와 "이미 있는 노드를 넣는 API"(`appendChild`, `append`, `insertBefore`)의 구분이다. 원인은 "복사한다/옮긴다"는 비유가 아니라 표준의 단계(replace all, insert, adopt의 remove)로 설명한다.
- 고른 이유: 제목 질문의 답(자식 전체를 remove하고 새로 파싱한 노드를 insert)과 두 번째 축(같은 노드는 트리의 한 자리에만 있다)이 모두 DOM 표준의 insert·remove로 설명된다.
- 버린 대안
  - 메서드 카탈로그(모든 삽입 메서드 나열): 오해 포인트가 흐려진다. 비교표 한 개로 대신한다.
  - `script` 미실행을 이 페이지에서 다시 예제로: `script-async-defer` 예제 9와 중복. 이 페이지는 링크하고, 이벤트 핸들러 어트리뷰트 쪽만 예제로 보인다.
  - XSS 공격 시나리오 서술: 실행으로 보일 수 있는 것은 "문자열 안의 이벤트 핸들러 어트리뷰트가 실행된다"까지다. 보안 지침은 한 문장과 MDN 링크로 한정한다.
- 결과 표를 두지 않는다. `## 결과와 이유`는 `### 예제 N` 소제목으로 쓴다(`dom-tree-nodes`와 같은 구성). 마크업 출력이 표 검사에서 대조되지 않기 때문이다(§2). 공통 테스트 헬퍼는 고치지 않는다.
- 시뮬레이터 상태 모양: `{ parents: { id; label; children: nodeId[] }[]; nodes: Record<nodeId, { label }>; variables: { name; nodeId }[] }`. 각 단계가 전체 스냅샷. 어느 부모의 `children`에도 없는 노드가 "문서에서 떨어진 노드"이고, 시각화가 이를 계산해 따로 그린다(상태에 `connected`·`detached`를 따로 두지 않는다). 두 시나리오의 부모는 모두 문서에 연결된 요소이므로 이 계산이 `isConnected`와 같다는 전제를 `scenarios.ts` 주석에 적는다.

## 4. 변경 파일

- 추가: `app/concepts/dom-manipulation/`
  - `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`
  - `scenarios.ts`, `Simulator.tsx`, `NodeMoveView.tsx`, `NodeMoveView.test.tsx`, `Simulator.test.tsx`
  - `examples/inner-html-replace.html`, `insert-adjacent.html`, `move.html`, `fragment.html`, `parse-context.html`, `clone-remove.html`, `code-in-html.html`
- 수정
  - `app/concepts/dom-tree-nodes/meta.ts`(단순화 문구 + related), `content.mdx`(87행 절 끝에 링크 한 문장)
  - `app/concepts/script-async-defer/meta.ts`(related), `content.mdx`(57행 절에 링크 한 문장)
  - `app/concepts/live-html-collection/meta.ts:110`(단순화 문구 + related)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
- 변경하지 않음: 공통 코드 소스, 다른 페이지의 예제·퀴즈·`reviewedAt`, `tests/helpers/`.

## 5. 위험 요소

- 표준 판 차이 → `innerHTML` setter를 옛 문장으로 인용하면 틀린다 → 단계 2에서 사본(`dm/dmi.txt`)의 현재 문장만 인용하고, Trusted Types·sanitizer·`runScripts`는 단순화 항목에 "다루지 않는다"로 밝힌다.
- "innerHTML로 넣은 코드는 실행되지 않는다"는 과잉 일반화 → `<img onerror>`·`onclick`이 반례 → 문장을 `script` 요소로 한정하고 예제 7이 반례를 보인다(단계 1·2).
- 예제 7에서 `img`를 넣은 직후 같은 요소의 내용을 바꾸면 떨어진 `img`에서 `onerror`가 실행된다(초안 실행에서 관찰) → `textContent` 대비는 다른 요소(`#plain`)에서 한다(반영함, `dm/ex2/code-in-html.html`).
- `onerror` 출력 시점 → 스크립트가 끝난 뒤 태스크로 실행되므로 다른 출력보다 뒤에 온다. 순서 주장은 "동기 출력 뒤"까지만 하고, 예제에 타이머를 섞지 않는다. `settleMs` 기본값 안에 끝나는지 `npm test`로 확인(단계 1).
- 예제가 틀린 모델을 배제하지 못함 → 예제 1은 "`+=`는 뒤에 덧붙일 뿐" 모델(둘째 줄 `true true`였을 것)과 "먼저 잡은 노드는 사라진다" 모델(셋째 줄에서 `first.textContent`가 그대로 `A`)을 모두 배제해야 한다. 예제 3은 "appendChild는 복사" 모델(원래 부모의 자식 수가 그대로였을 것)을 배제한다(단계 1 완료 조건).
- 결과 표 검사가 마크업 출력을 대조하지 못함 → 결과 표를 두지 않는다(§3). 출력 주장은 `expectedOutput`(예제 실행)과 퀴즈 정답으로만 하고, `concept.test.ts`가 퀴즈 정답 선택지가 `expectedOutput`을 ` / `로 이은 문자열과 같은지 검사한다(단계 3).
- MDX에서 `<`, `{` → 본문·퀴즈·표 칸의 마크업 문자열은 백틱 코드나 `<code>{'…'}</code>`로 쓴다. PredictQuiz 문자열 prop 안의 작은따옴표는 빌드를 깬다(`npm run test:build`로 확인, 단계 2).
- "복사한다/옮긴다" 비유와 표준의 move → 원인 설명은 표준 단계(remove 뒤 insert)로 쓴다. "옮겨진다"는 결과를 부르는 말로만 쓰고, 표준의 move(`moveBefore`)와 다른 것이라고 `simplifications`에 밝힌다. `cloneNode`는 "복제"로만 쓴다(단계 2).
- 순서 삽입으로 테스트 수치가 어긋남 → 단계 5.
- 제목·요약·태그에 '객체'가 들어가면 '객체' 검색 개수가 바뀐다 → 쓰지 않는다. 쓰게 되면 단계 5에서 `toHaveCount(18)` 네 곳과 순위 배열을 고친다.
- 뒷순서 개념(이벤트) → 예제 6·7이 `addEventListener`·`click()`·`onclick`·`onerror`를 쓴다. 설명하지 않고 결과를 보이는 도구로만 쓴다고 `simplifications`에 밝히고 본문에서 [이벤트 전파와 위임](/concepts/event-propagation-delegation)을 링크한다. `click()`으로 만든 이벤트는 `isTrusted`가 `false`라는 점도 단순화에 적는다. 리스너 안에서 `this`를 쓰지 않는다(반영함)(단계 1·2).
- `cloneNode`와 리스너의 과잉 일반화 → "리스너를 복제하지 않는다"는 `addEventListener`로 등록한 리스너에 한정한다. 예제 7이 `onclick` 어트리뷰트를 다루므로, 어트리뷰트는 복제된다는 점과 충돌하지 않게 쓴다(단계 2).
- 예제 6의 "실행되지 않았다"가 줄이 없는 것으로만 보임 → 호출 횟수 `calls`를 `click()`마다 출력해 `1` → `1`로 보인다(반영함).
- `insertAdjacentHTML`의 예외 조건 축약 → `beforebegin`·`afterend`에서 부모가 없거나 Document일 때만이다. 예제 2가 같은 떨어진 요소에서 `beforeend`는 성공하는 줄을 먼저 보인다(반영함).
- 회귀: `dom-tree-nodes`·`script-async-defer`의 본문에 문장을 더하면 빌드 테스트의 첫 문단 검사와 결과 표에 영향이 없어야 한다 → 첫 문단과 표는 건드리지 않는다(단계 4).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(공통 코드 미변경): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "dom-manipulation|DOM 조작|홈 학습 순서 보기"`. 수정한 두 페이지(dom-tree-nodes, script-async-defer)의 a11y·responsive 케이스도 `-g`에 더한다.
- 브라우저(dev 서버, 재시작 필요)
  1. `/concepts/dom-manipulation`을 연다 → pager가 `52 / 66`, 이전이 'classList와 style', 다음이 '이벤트 전파와 위임'.
  2. 시뮬레이터 첫 시나리오에서 '다음'을 끝까지 누른다 → 마지막 단계의 출력이 예제 1의 `expectedOutput`과 같고, `innerHTML +=` 단계에서 `first`가 문서에서 떨어진 노드 영역으로 간다.
  3. 시나리오를 둘째로 바꾼다 → 첫 단계로 돌아가고 두 목록이 보인다.
  4. 콘솔 오류가 없다.
  5. `/concepts/dom-tree-nodes`의 단순화 목록에서 새 페이지 이름이 보인다.

## 7. 미확정 사항

- [미확정 1] 기존 두 페이지(dom-tree-nodes, script-async-defer)의 `reviewedAt`: 기본안은 유지(직전 작업과 같은 처리). 문구 한두 문장과 related만 바뀐다.
- [미확정 2] `script-async-defer` 본문에 링크 문장을 더할지: 기본안은 더한다(57행 절 끝에 "문자열로 넣은 마크업의 이벤트 핸들러 어트리뷰트는 [DOM 조작](/concepts/dom-manipulation)에서 다룹니다" 취지의 한 문장). 더하지 않으면 related만 고친다.

- [미확정 3] `live-html-collection`의 단순화 문장: 기본안은 문장 끝에 "append와 createElement는 DOM 조작 개념에서 다룹니다."를 더하고 related에 slug를 추가한다(직전 작업이 같은 문장에 classList 안내를 더한 것과 같은 처리, `reviewedAt` 유지). `removeChild`는 새 페이지가 다루지 않으므로 언급하지 않는다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta

- 대상: `app/concepts/dom-manipulation/meta.ts`, `route.tsx`, `examples/*.html` 7개, `content.mdx`(필수 h2만 있는 뼈대)
- 현재: 없음
- 변경
  - 예제는 scratchpad `dm/ex2/*.html`을 그대로 옮긴다(작은따옴표·`var` 스타일로 이미 맞췄다). 2026-11-17 Chromium 출력:
    - inner-html-replace: `true true` / `2 false false` / `A true` / `first false`
    - insert-adjacent: `2 true true` / `<li>0</li><li id="first"><b>x</b>A</li><li>A2</li><li>B</li>` / `1 false` / `NoModificationAllowedError`
    - move: `1 1 done true` / `1` / `false true` / `true true` / `2 true`
    - fragment: `2 true false` / `0 3 true true` / `3 false`
    - parse-context: `"1" 0` / `<tbody><tr><td>1</td></tr></tbody> TBODY` / `<b class="on">x<br><i>y</i></b>` / `&lt;b&gt;1 &amp; 2&lt;/b&gt; 0`
    - clone-remove: `0 2 item false` / `false true 1` / `1` / `1` / `false true A B 0` / `2` / `true true`
    - code-in-html: `2` / `10` / `0 true` / `20`
  - 예제를 고치게 되면 `expectedOutput: []`로 두고 `npm test`의 실제 출력으로 채운다(추측 금지).
  - `meta.ts`: slug, title(요구사항), summary(160자 이하, '객체' 없음), category `browser`, order 377, tags, goals 4개 안팎, prerequisites(`dom-tree-nodes`, `live-html-collection`), related(`dom-tree-nodes`, `live-html-collection`, `script-async-defer`, `html-attribute-dom-property`, `classlist-style`, `event-propagation-delegation`), examples 7개, simplifications, references, `reviewedAt: null`.
  - references: WHATWG HTML(innerHTML, insertAdjacentHTML), WHATWG DOM(insert, adopt, replace all, DocumentFragment, cloneNode), MDN(innerHTML, insertAdjacentHTML, appendChild, cloneNode). 앵커 id는 사본에서 grep으로 확인한 것만 쓴다.
- 이유: 출력 주장은 실행 검증된 예제에서만 온다.
- 주의사항: 폴더는 `meta.ts` → `content.mdx` → `route.tsx` 순으로 만든다(dev 서버 캐시). 예제 출력에 연속 공백 금지. `try…catch`를 쓰는 예제(insert-adjacent)는 `error-handling`보다 앞 순서이므로 "예외 이름을 출력하려는 용도"라고 본문·단순화에 밝히고 related에 `error-handling`을 더한다(classlist-style과 같은 처리). 예제 6·7의 이벤트 API도 같은 방식으로 단순화에 밝힌다(§5).
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts`가 통과하고, 7개 예제의 `expectedOutput`이 위 출력과 같다. code-in-html의 마지막 줄이 `20`이고 등록되지 않은 요청이 없다(`settleMs` 기본값으로 통과).

### 2. content.mdx 본문

- 대상: `app/concepts/dom-manipulation/content.mdx`
- 변경
  - `## 동작 원리`: 첫 문단(제목 질문의 답: `innerHTML` 대입은 요소의 자식을 모두 제거하고 문자열을 파싱해 만든 새 노드를 넣는다. `+=`는 읽기 + 대입이다. 근거 표준과 Chromium 실행, 호스트 API라는 점, 전제 페이지 링크)
    - `### innerHTML 대입은 자식 전체를 바꾼다`: HTML 표준 인용(도입 설명 한 문장 + filter and set HTML의 replace all), DOM의 replace all. `+=`가 `el.innerHTML = el.innerHTML + …`이라는 것. 먼저 얻어 둔 노드는 없어지지 않고 트리에서 빠진다(변수로 계속 닿는다).
    - `### insertAdjacentHTML은 파싱한 노드를 끼워 넣는다`: 위치 넷, 기존 자식은 그대로. `beforebegin`·`afterend`는 부모에 넣으므로 부모가 없거나 Document이면 예외(떨어진 요소에도 `beforeend`는 된다).
    - `### 노드는 트리의 한 자리에만 있다`: insert의 adopt 단계("부모가 있으면 remove"), `appendChild`·`append`·`insertBefore`. 새로 만든 노드는 넣기 전까지 문서에 연결되지 않는다. 표준의 move(`moveBefore`)와 다른 것이라는 한 문장.
    - `### DocumentFragment는 자식만 넣고 비워진다`
    - `### innerHTML은 요소에 따라 다르게 파싱하고, 읽으면 직렬화한 문자열이다`: 문맥 요소(이 예제의 입력에 한정해 서술, 근거는 §2 추정에서 확인한 문장만), 읽기는 원문이 아님. `textContent`와의 대비는 [DOM 트리와 노드 종류](/concepts/dom-tree-nodes) 링크.
    - `### cloneNode와 remove`: 복제본은 문서에 연결되지 않은 새 노드, `addEventListener`로 등록한 리스너는 복제본에서 실행되지 않음(예제 6), 떼어낸 노드는 변수로 계속 쓸 수 있고 리스너도 남아 있음.
    - `### 문자열로 넣은 마크업의 코드`: `script`는 실행되지 않음([script의 async와 defer](/concepts/script-async-defer) 링크), 이벤트 핸들러 어트리뷰트는 동작함(HTML 표준의 "perform no sanitization … script or event handler content attributes" 문장을 사본에서 확인해 인용), `img`의 `error` 이벤트는 스크립트가 끝난 뒤 발생("문서에 넣어서 실행된다"고 쓰지 않는다), 믿을 수 없는 문자열은 `textContent`.
    - 메서드 비교표(JSX `<table>`, `<Wide>` 여부는 폭을 보고): 행은 `innerHTML` 대입, `insertAdjacentHTML`, `textContent` 대입, `appendChild`/`append`, `insertBefore`, `cloneNode`, `remove`. 열은 "문자열을 HTML로 파싱하나", "기존 자식", "넣는 것". 이 표는 예제 출력 표 형식(`예제 N`)을 쓰지 않는다.
  - `## 예제`: 예제 1~7 + PredictQuiz 7개(오답은 틀린 모델에서 나오는 출력) + 예제 3 퀴즈 뒤 `<Simulator scenarios={scenarios} />`(독립된 줄).
  - `## 결과와 이유`: `### 예제 1`~`### 예제 7` 소제목으로 예제별 설명(결과 표 없음), `### 흔한 오해` 아래 Callout 3개(innerHTML `+=`는 뒤에 덧붙이기만 한다 / appendChild는 노드를 복사해 넣는다 / innerHTML로 넣은 문자열의 코드는 실행되지 않는다).
- 이유: 필수 h2, 예측 → 확인 흐름.
- 주의사항: 표준 인용은 사본의 현재 문장만. 인용문을 문장 중간에서 자르지 않는다. "항상", "모든" 같은 일반화는 예제나 표준 문장이 받치는 범위로 한정한다. `onerror`의 실행 시점은 "스크립트가 끝난 뒤"까지만. 본문에서 마크업 출력은 백틱 코드로 쓴다. 비교표 칸에 마크업을 쓰지 않는다. 뒷순서 개념(error-handling, event-propagation-delegation)은 링크로만. template 요소에서는 대상이 template contents라는 예외를 `simplifications`에 적는다.
- 완료 조건: `npm test`와 `npm run test:build`가 통과한다. `grep -n "복사" content.mdx`의 결과가 흔한 오해 제목·퀴즈 해설처럼 틀린 모델을 가리키는 문장뿐이고 `cloneNode` 설명은 "복제"만 쓴다. §2 추정 항목마다 원문을 확인했는지와 본문에 어떻게 썼는지를 `## 구현 진행`에 한 줄씩 남긴다.

### 3. 시뮬레이터와 concept.test

- 대상: `scenarios.ts`, `Simulator.tsx`, `NodeMoveView.tsx`, `NodeMoveView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 변경: 시나리오 2개 — `inner-html-replace`(label '예제 1: innerHTML +=')와 `move`(label '예제 3: 이미 있는 노드 넣기'). 단계는 선례대로 실행 전 1단계 + 실행 줄마다 1단계로 하되, `list.innerHTML += …` 줄만 세 단계로 나눈다(① 현재 내용을 읽어 문자열을 만든다 ② 자식을 모두 제거한다 — `first`가 떨어진 노드가 된다 ③ 파싱한 새 노드 두 개를 넣는다). 제목 질문의 답이 이 분해다. 단계 수는 구현 뒤 `concept.test.ts`에 고정한다. 코드는 `examples/*.html?raw`. 상태는 §3의 모양. `concept.test.ts`는 `assertScenarioInvariants`와 상태 무결성(자식 목록과 변수의 nodeId가 nodes에 있음, 한 노드는 많아야 한 부모의 자식), 퀴즈 정답 선택지 = `expectedOutput`을 ` / `로 이은 문자열(7개 모두), '객체' 검색에 새 slug 없음을 검사한다.
- 이유: AGENTS.md 시뮬레이터 규칙.
- 주의사항: `classlist-style`의 `Simulator.tsx`·테스트 구조를 본뜬다. 색만으로 구분하지 않는다(연결됨/떨어짐을 글자로도 표시). 375px에서 가로로 넘치지 않게. 첫 단계는 JS 없이도 보인다. `innerHTML +=` 단계에서 새 `li`는 이전과 다른 nodeId로 그린다(같은 id 어트리뷰트를 가진 다른 노드라는 것이 보이게).
- 완료 조건: 폴더 테스트가 통과하고, 시나리오의 한 단계에서 같은 노드를 두 부모의 `children`에 넣으면, 그리고 퀴즈 정답 선택지의 글자 하나를 바꾸면 `concept.test.ts`가 실패한다(확인 뒤 원복).

### 4. 기존 페이지 문구

- 대상: `dom-tree-nodes/meta.ts`·`content.mdx`, `script-async-defer/meta.ts`·`content.mdx`, `live-html-collection/meta.ts`
- 변경: `dom-tree-nodes`의 단순화 문장을 "innerHTML, insertAdjacentHTML, createElement, DocumentFragment 같은 DOM 조작은 DOM 조작 개념에서 다룹니다. Shadow DOM은 다루지 않습니다."로 바꾸고 related에 slug 추가. 87행 절 끝에 `innerHTML`은 [DOM 조작](/concepts/dom-manipulation)에서 다룬다는 한 문장. `script-async-defer`는 related 추가와 미확정 2의 한 문장. `live-html-collection`은 미확정 3의 문장과 related.
- 주의사항: `reviewedAt` 유지(미확정 1 기본안). 첫 문단·표·예제는 건드리지 않는다. 새 페이지가 그 주제를 실제로 다루는지 단계 2 결과와 대조한 뒤 쓴다.
- 완료 조건: `grep -rn "DOM 조작과 Shadow DOM, DocumentFragment는 다루지" app/concepts`가 0건, `npm test` 통과.

### 5. 순서 테스트와 새 페이지 등록

- 대상: `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md:225`
- 변경: 총수 65 → 66, 52번째 이후 순위 +1, classlist-style의 다음과 event-propagation-delegation의 이전을 새 페이지로, '객체' 순위 배열에서 52 이상인 값 +1, `'65번째'` 표기, 새 페이지 자신의 pager 블록(`52 / 66`), helpers에 `DOM_MANIPULATION_PATH`·`DOM_MANIPULATION_SIMULATOR_NAME`, a11y·responsive에 새 케이스(classlist-style 케이스를 본뜸), build-output에 새 describe.
- 주의사항: 순위 변경은 HEAD의 `N / 65` 목록을 스크립트로 변환한 결과와 대조한다. `ConceptPager.test.tsx`의 마지막 순위는 `66 / 66`이다(직전 작업에서 `64 / 65`로 잘못 바뀐 적이 있다).
- 완료 조건: `npm test`, `npm run test:build`, §6의 e2e 명령이 통과한다.

### 6. 전체 검증

- §6 전부. 브라우저 확인은 dev 서버를 재시작한 뒤 한다.

## 9. 추가 개선 후보

- `event-propagation-delegation`·`live-html-collection`의 예제가 쓰는 `innerHTML`·`append`에 새 페이지 링크.
- `setHTML`과 Sanitizer API 페이지.

## 변경 이력

- 2026-11-17 (사용자 승인): 계획 승인. 미확정 1·2·3 모두 기본안으로 확정.
- 2026-11-17 (Consensus 검토)
  - Architect HIGH: 결과 표 검사가 태그를 먼저 지워 마크업 출력(예제 2·5)을 대조하지 못한다 → 결과 표를 두지 않고 `### 예제 N` 소제목 구성으로 바꿈, 퀴즈 정답과 `expectedOutput`의 일치를 `concept.test.ts`에서 검사.
  - Architect·Critic MEDIUM: 예제 6·7의 이벤트 API(뒷순서 개념) 처리, `live-html-collection` 단순화 문구 누락, "cloneNode는 리스너를 복제하지 않는다"의 한정(어트리뷰트 핸들러는 복제), 예제 6의 증거를 호출 횟수 출력으로, `img`의 `onerror`를 "삽입이 원인"으로 쓰지 않기, 표준의 move(`moveBefore`)와의 용어 충돌 → 모두 반영하고 예제를 고쳐 재실행(`dm/ex2`).
  - LOW: `append(a, a)`를 `appendChild` 두 번으로, `insertAdjacentHTML` 예외 조건과 성공 줄, 문맥 파싱의 근거 문장 확인, `grep "복사"` 조건, template 예외, '객체' 개수 위치 네 곳, 시뮬레이터 상태 중복 제거와 `innerHTML +=` 단계 분해 → 반영.
- 2026-11-17 (사용자 콘텐츠 검토 1차): `isConnected` 문장을 "문서에 연결된 부모에 넣어야"로 한정, adopt의 "첫 단계" 표현 수정, 소문자 문장이 직렬화의 비규범 주석이고 소문자화는 파싱 때라는 점, 이스케이프 규칙의 빠진 경우(U+00A0, script·style의 자식 텍스트), `insertAdjacentHTML` 문맥이 body가 되는 단계(단순화), DocumentFragment 정의 문장, 학습 목표 2 표기, script 미실행을 "기본 설정에서는"으로 한정, fragment null 설명과 `innerHTML +=`의 리스너 문장 추가 — 영향 단계 2.

## 구현 진행

- baseline (2026-11-17, `7ac81dd`): lint 0 / format:check 통과 / typecheck 통과 / npm test 171 files·5324 tests 통과 / test:build 520 tests 통과(커밋 직전 같은 트리에서 실행한 결과)
- [x] 1. 폴더 뼈대·예제·meta — 예제 7개는 scratchpad `dm/ex2`와 `cmp` 일치, `expectedOutput`이 Chromium 실제 출력·계획 값과 일치. 앵커 id는 사본 grep으로 확인(서브에이전트). 메인 수정: MDN 한국어판 `Node/cloneNode`가 404라 영어판 URL로 교체(나머지 4개는 200 확인).
- [x] 2. content.mdx 본문 — 결과 표 없이 `### 예제 N` 구성. 메인이 인용문을 사본과 대조(직렬화 "tagname will be lowercase", in table의 tbody 삽입, in body의 "Ignore the token", `remove()` 단계, connected 정의, 직렬화 재파싱 문장). 메인 수정 4곳: `insertBefore` 문장을 "그 부모의 자식을 다시 넣을 때"로 한정, MDN 안내 문장을 원문에 맞춤, "복제본에 리스너가 없다" 2곳과 퀴즈 6 해설을 "실행되지 않는다"로.
  - §2 추정 처리: 빈 src의 error 경로 확인(images 장, 본문은 "요소 태스크로 발생해 스크립트가 끝난 뒤"까지만) / 떨어진 요소·template의 onerror는 쓰지 않음 / cloneNode의 어트리뷰트 복제 확인(본문은 id까지만, 어트리뷰트 핸들러 복제는 "실행하지 않았다"고 단순화에 밝힘) / in body·in table 문장 확인 후 인용.
- [x] 3. 시뮬레이터와 concept.test — 폴더 테스트 43개 통과. 시나리오 1은 10단계, 2는 15단계. 변조 2종(같은 노드를 두 부모에, 퀴즈 정답 글자 변경)에서 실패 확인 후 원복(서브에이전트). 계획과 다른 점: 상태의 `parents`에서 label을 빼고 부모도 `nodes`에 둠(라벨 중복 제거).
- [x] 4. 기존 페이지 문구 — dom-tree-nodes·script-async-defer·live-html-collection, `reviewedAt` 유지. `grep "DOM 조작과 Shadow DOM, DocumentFragment는 다루지"` 0건.
- [x] 5. 순서 테스트와 등록 — HEAD `N / 65` 39건 변환 = 새 `/ 66` 40건에서 새 블록 `52 / 66`을 뺀 목록(메인이 스크립트로 재대조). `ConceptPager.test.tsx` 마지막 순위 `66 / 66`.
- [x] 6. 전체 검증(2026-11-17, 메인 실행) — lint 0 / format:check / typecheck / npm test 174 files·5387 / test:build 528 — baseline 대비 새 실패 없음. e2e: navigation 16, 새 페이지와 수정한 세 페이지 관련 34 통과. 브라우저(dev 서버 재시작): pager `52 / 66`, 이전·다음, 시뮬레이터 6단계에서 `first`가 "문서에서 떨어진 노드"로 표시, 콘솔 오류 없음. 전체 e2e는 공통 코드 미변경이라 미실행.
- 리뷰 1차(critical-code-review, 메인): Critical / High 없음(위 메인 수정은 검증·리뷰 중 고침).
  - Low: `content.mdx` 첫 문단이 길다 / `content.mdx` "runScripts 옵션을 켜지 않으므로 script가 실행되지 않는다"는 setter가 새 옵션 사전을 넘긴다는 단계에서 이끈 문장(직접 인용 아님) / 퀴즈 해설이 틀린 모델을 "~였다면"으로 짚지 않음 / move 시나리오 15단계 / MDN 링크 5개는 응답 코드만 확인(innerHTML 영어판만 내용 확인).
- 사용자 콘텐츠 검토 1차 반영(2026-11-17): 8건과 선택 보강 2건을 표준 사본으로 확인 후 반영(메인 직접 수정, `content.mdx`·`meta.ts`). 확인: adopt의 단계 순서(`cl/dom.txt:3754`), 소문자 문장이 `<p class=note>`, "Escaping a string"의 U+00A0와 literal로 쓰는 요소 목록, 문맥을 body로 바꾸는 단계, runScripts와 createParserOptions(`dm/dmi.txt:2736`), Safe 모드의 null. 선택 보강 중 "입력한 값 같은 상태도 사라진다"는 실행 근거가 없어 넣지 않았고, 리스너 문장은 예제 1·6이 보인 사실(새 노드는 다른 노드, 리스너는 떼어낸 노드에 남음)로만 썼다. lint·format·typecheck·npm test·test:build·새 페이지 e2e 통과.
- 사용자 콘텐츠 검토 2차 반영(2026-11-17): 단순화 항목의 runScripts 예외를 "Trusted Types 기본 정책(default policy)의 createParserOptions 콜백 … 표준의 보안 고려 절이 적은"으로 고침(`dm/dmi.txt:2725-2736`, 비규범 절 확인), 직렬화 규칙 목록에서 "소문자 이름"을 뺌. 메인이 같은 어긋남을 퀴즈 5 해설과 예제 5 설명에서도 찾아 "파싱할 때 소문자가 되었고"로 고침. 전체 검증 재통과.
- 마무리(2026-11-17): 사용자 최종 승인. 사용자 결정으로 새 페이지 `reviewedAt`을 `'2026-11-17'`로 기록(같은 커밋). 서브에이전트가 `concept.test.ts`에 넣어 둔 `reviewedAt`이 null이라는 단언은 이 결정과 충돌해 뺐다(다른 개념의 테스트에는 없는 단언).

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 7개, 퀴즈 7개, 메서드 비교표, 시뮬레이터 1개·시나리오 2개, 기존 세 페이지 문구, 순서·등록 테스트).
- 달라진 점: 시뮬레이터 상태의 `parents`에서 label을 빼고 부모도 `nodes`에 두었다. MDN `cloneNode` 링크는 한국어판이 404라 영어판을 썼다. 사용자 검토로 `isConnected` 문장 한정, 직렬화 주석과 소문자화 시점, 이스케이프 규칙, script 미실행의 "기본 설정" 한정 등을 고쳤다.
- 새 페이지 `reviewedAt`은 계획에서는 `null`이었고, 사용자 검토 두 차례 뒤 결정으로 기록했다.

### 코드 리뷰

- Critical / High 없음. 검증·리뷰 중 메인이 6곳을 고쳤고, 사용자 콘텐츠 검토 1차 8건+선택 2건, 2차 2건을 반영했다.
- 남긴 것: Low(첫 문단 길이, `runScripts` 문장이 추론, 퀴즈 해설이 틀린 모델을 "~였다면"으로 짚지 않음, 둘째 시나리오 15단계, MDN 링크 내용 미확인).

### 후속 작업

- [ ] (선택) `innerHTML +=`로 입력 값 같은 상태가 사라지는 것을 예제로 보이기.
- [ ] (선택) `event-propagation-delegation`·`live-html-collection` 예제의 `innerHTML`·`append`에 본문 링크, `setHTML`과 Sanitizer API 페이지.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 결과 표를 두지 않고 `### 예제 N` 소제목으로 구성 — 결과 표 검사(`normalizeCell`)가 태그를 먼저 지워 `<li>…` 같은 출력을 대조하지 못한다. 공통 헬퍼를 고치는 대신 퀴즈 정답과 `expectedOutput`의 일치를 `concept.test.ts`에서 검사했다.
- [Claude 판단] 예제 7의 `textContent` 대비를 다른 요소(`#plain`)에서 실행 — 같은 요소의 내용을 바꾸면 문서에서 떨어진 `img`에서 `onerror`가 실행되는 것이 관찰됐고, 그 동작은 설명 범위 밖이다.
- [Claude 판단] 예제 6의 "복제본에서 리스너가 실행되지 않는다"를 호출 횟수 출력(`1` → `1`)으로 보이고, 주장을 `addEventListener`로 등록한 리스너에 한정 — 어트리뷰트는 복제되므로 `onclick` 어트리뷰트와 충돌한다.
- [Claude 판단] 시뮬레이터에서 `innerHTML +=` 한 줄을 읽기, 자식 제거, 새 노드 삽입의 세 단계로 분해하고, 표준은 파싱을 제거보다 먼저 한다는 점을 단계 설명과 단순화에 밝힘.
- [무검토 승인] 기존 세 페이지의 `reviewedAt` 유지, `script-async-defer`·`live-html-collection`에 더한 문장(미확정 기본안).
- 제목, 추가 주제 4개, 노드 트리 시뮬레이터 — 사용자가 선택.
- `isConnected` 문장 한정, 소문자화는 파싱 때라는 구분, script 미실행의 "기본 설정" 한정 — 사용자 검토 지적.

#### 배경지식

- HTML 표준: `innerHTML` setter는 "filter and set HTML"로 문자열을 파싱한 fragment를 만들고 DOM의 replace all을 한다. getter는 자식을 직렬화한 문자열을 돌려준다. 프래그먼트 파싱은 문맥 요소에 따라 삽입 모드가 달라진다.
- DOM 표준: replace all(자식 전부 remove 뒤 insert), insert(노드마다 adopt, DocumentFragment면 그 자식들을 넣고 프래그먼트에서 뺌), adopt(부모가 있으면 remove), connected의 정의, 표준의 move(`moveBefore`)는 다른 연산.
- `insertAdjacentHTML`의 위치 넷과 문맥(`beforebegin`·`afterend`는 부모).
- 이벤트 핸들러 어트리뷰트는 `innerHTML`로 넣어도 동작하고, 빈 `src`의 `img`는 요소 태스크로 `error` 이벤트를 낸다.
- 결과 표 검사의 `normalizeCell`이 태그를 지운다.

#### 확인 질문

1. `list.innerHTML += '<li>B</li>'` 뒤에 먼저 얻어 둔 `first`의 `isConnected`는 `false`인데 `first.textContent`는 왜 그대로 `A`인가? 이 두 출력이 각각 어떤 틀린 모델을 배제하는가?
   <details><summary>답</summary>대입이 자식을 모두 remove하고 새로 파싱한 노드를 넣기 때문에 `first`는 트리에서 빠졌을 뿐 없어지지 않는다. `false`는 "뒤에 덧붙일 뿐" 모델을, `A`는 "먼저 잡은 노드는 사라진다" 모델을 배제한다(content.mdx 'innerHTML 대입은 자식 전체를 바꾼다', 예제 1, 계획 §5).</details>
2. `appendChild`의 결과를 "노드를 옮긴다"가 아니라 "remove 뒤 insert"로 설명한 이유는?
   <details><summary>답</summary>원인은 표준의 adopt 단계("부모가 있으면 remove")이고, DOM 표준에는 이름이 move인 다른 연산(`moveBefore`)이 있어 용어가 충돌한다(content.mdx '노드는 트리의 한 자리에만 있다', meta.ts simplifications).</details>
3. 이 페이지에 결과 표가 없는 이유는 무엇이고, 대신 무엇이 출력 주장을 검증하는가?
   <details><summary>답</summary>결과 표 검사가 태그를 먼저 지워 마크업이 든 출력을 대조하지 못한다. 예제 실행(`expectedOutput`)과, 퀴즈 정답 선택지가 그 출력과 같은지 보는 `concept.test.ts`가 검증한다(계획 §2 사실, §3, 변경 이력의 Consensus 검토).</details>
4. "새로 만든 노드는 부모에 넣어야 연결된다"가 틀린 이유를 이 페이지의 예제로 설명하면?
   <details><summary>답</summary>부모가 문서에 연결되어 있어야 한다. 예제 2의 `loose`에 넣은 `li`와 예제 4에서 프래그먼트에 넣은 `b`는 부모가 있지만 `isConnected`가 `false`다(content.mdx '노드는 트리의 한 자리에만 있다', 변경 이력의 사용자 검토 1차).</details>
5. "innerHTML로 넣은 script는 실행되지 않는다"에 "기본 설정에서는"을 붙인 이유와, 그렇다고 문자열 안의 코드가 안전하지 않은 이유는?
   <details><summary>답</summary>표준의 보안 고려 절은 Trusted Types 기본 정책의 createParserOptions에서 runScripts를 켜면 실행된다고 적는다. 또 `onclick`·`onerror` 같은 이벤트 핸들러 어트리뷰트는 걸러지지 않고 동작한다(예제 7, content.mdx '문자열로 넣은 마크업의 코드', meta.ts simplifications).</details>
