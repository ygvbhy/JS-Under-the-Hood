# 개념 'HTMLCollection은 살아 있다' 구현 계획

- 상태: 완료
- 작성일: 2026-11-03
- 기준: `main` @ `f16f473`

## 0. 요약

- 목적: 38~42장 로드맵 3번 `/concepts/live-html-collection`을 추가한다. 39장 요소 노드 취득에서 `getElementsByClassName`의 살아 있는 HTMLCollection을 돌며 클래스를 바꾸면 절반만 바뀌는 이유를, Chromium 출력과 단계마다 대조되는 반복 시뮬레이터, 예제 8개, 퀴즈로 WHATWG DOM 표준 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `browser`, order 360으로 학습 순서 38번째·마지막, 시뮬레이터는 공통 `SimulatorShell` + 개념 전용 `CollectionView`). 고정 테스트, e2e(시뮬레이터 진행 포함)·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 37개는 바꾸지 않는다. dom-tree-nodes의 "별도 개념" 문구 링크화는 역방향 링크 일괄 작업으로 미룬다.
- 위험: ① 시뮬레이터 단계가 실제 동작과 어긋남 ② 『모던 자바스크립트 Deep Dive』의 같은 주제 예제를 닮음 ③ 표준이 정하지 않은 동작(같은 인수 호출이 같은 객체를 돌려주는지)을 사실로 씀 → 시나리오 단계마다 Chromium 출력 줄·컬렉션 규칙과 대조하는 테스트, 할 일 목록(`todo`→`done`)과 `show` 함수로 예제를 직접 작성, "may" 동작은 쓰지 않는다.
- 복잡도: 중간 · Consensus: 생략. 시뮬레이터는 기존 공통 셸·불변식·개념 전용 View 패턴(regexp-lastindex 등)을 그대로 쓰고 공통 코드를 바꾸지 않는다. 예제 8개 출력은 실행기로 5회씩 확인했고 핵심 주장은 표준 원문과 대조했다.
- 미확정: 없음(추가 주제 4개·시뮬레이터·제목은 2026-11-03 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 3번 "HTMLCollection은 살아 있다"(39장)를 새 개념 페이지로 만든다.
- 사용자 결정(2026-11-03)
  - 기본 범위: ① `getElementsByClassName`을 돌며 클래스를 바꾸면 절반만 바뀜(살아 있는 컬렉션) ② `querySelectorAll`은 정적이라 4개 모두 바뀜 ③ 요소를 붙이면 살아 있는 컬렉션만 늘어남 ④ HTMLCollection과 NodeList의 차이(`forEach` 유무, 둘 다 배열 아님).
  - 추가 주제 4개 모두: **해결 방법 3가지**(역순 `for`, `Array.from`, `while`로 첫 요소), **`childNodes`도 살아 있다**, **id 중복과 전역 변수**(`getElementById`는 첫 요소, window의 named access), **요소에서 찾기**(요소의 `getElementsByClassName`·`querySelectorAll`은 그 요소의 후손만).
  - 시각화: **반복 단계 시뮬레이터** — 두 시나리오(살아 있는 HTMLCollection, 정적 NodeList). 단계마다 `i`, 컬렉션에 든 항목(`todos[0]`…), `todos.length`, li 4개의 클래스, 이번에 바꾸는 항목, 반복 조건을 보인다.
  - 제목 "HTMLCollection은 살아 있다: 클래스를 바꾸는 for 문은 왜 절반만 바꿀까", slug `live-html-collection`.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 컬렉션은 기본이 살아 있다(예제 1 `live-loop.html`, 시뮬레이터 시나리오 1): DOM 표준 "A collection can be either live or static. Unless otherwise stated, a collection must be live. If a collection is live, then the attributes and methods on that object must operate on the actual underlying data, not a snapshot of the data." `getElementsByClassName`은 "the list of elements with class names" — "an HTMLCollection rooted at root, whose filter matches descendant elements that have all their classes in classes". 그래서 `todos[0]`의 클래스를 `done`으로 바꾸면 그 순간 필터에서 빠져 `length`가 3이 되고 인덱스가 당겨진다. `i=1`의 `todos[1]`은 셋째 항목(`설거지`), `i=2`에서 `2 < 2`가 거짓이라 반복이 끝나 `빨래`·`장보기`가 `todo`로 남는다.
  - ② `querySelectorAll`은 정적이다(예제 2 `static-loop.html`, 시나리오 2): "The querySelectorAll(selectors) method steps are to return the static result of running scope-match a selectors string selectors against this." 반환 시점의 목록이라 4번 모두 돈다.
  - ③ 붙이면 살아 있는 컬렉션만 늘어난다(예제 3 `live-grow.html`): `getElementsByTagName` 결과는 `append` 뒤 3, 미리 받은 `querySelectorAll` 결과는 2, 다시 부르면 3.
  - ④ HTMLCollection과 NodeList(예제 4 `collection-types.html`): IDL — `interface NodeList { getter Node? item(unsigned long index); readonly attribute unsigned long length; iterable<Node>; }`, `interface HTMLCollection { readonly attribute unsigned long length; getter Element? item(unsigned long index); getter Element? namedItem(DOMString name); }`. NodeList의 `iterable<Node>` 선언이 `forEach`를 주고 HTMLCollection에는 없다(`typeof` undefined). 둘 다 배열이 아니고(`Array.isArray` false) `Array.from`·스프레드로 배열을 만들 수 있다(인덱스 getter와 `length`가 있어 이터러블 — [이터러블과 for...of](/concepts/iterable-for-of)). 표준 노트 "HTMLCollection is a historical artifact we cannot rid the web of."
  - ⑤ 해결 방법 3가지(예제 5 `fixes.html`): 역순 `for`(뒤에서부터 바꾸면 빠지는 항목이 아직 볼 인덱스에 영향 없음), `Array.from`(정적 배열 스냅숏을 돈다, 원래 컬렉션 `dones.length`는 0으로 줄어듦), `while (todos.length > 0)`로 항상 `todos[0]`을 바꾸기. 셋 다 4개.
  - ⑥ `childNodes`도 살아 있다(예제 6 `child-nodes-live.html`): `childNodes`는 "a NodeList rooted at this matching only children"이고 정적이라는 표시가 없으므로 살아 있다. NodeList라고 모두 정적인 것이 아니다(`querySelectorAll`만 "static"). 순회하며 지우면 4개 중 2개만 지워진다(`2 2 4`). 공백 텍스트 노드가 섞이지 않게 `<li>`를 한 줄에 붙여 썼다([DOM 트리와 노드 종류](/concepts/dom-tree-nodes)).
  - ⑦ id 중복과 전역 변수(예제 7 `duplicate-id.html`): get an element by ID "return the first element, in tree order, within node's descendants, whose ID is elementId; otherwise, if there is no such element, null." 그래서 같은 id 둘이면 첫째, 없으면 `null`. `querySelectorAll('#note')`는 둘 다 찾는다. HTML 표준 named access on the Window object: 문서의 id가 `Window`의 named property가 되어 `box`가 요소를 가리킨다([전역 객체](/concepts/global-object)). 표준 스스로 "As a general rule, relying on this will lead to brittle code. … Instead of this, use document.getElementById() or document.querySelector()." 중복 id는 HTML 작성 규칙 위반이라는 점은 한 줄(근거: HTML 표준 id 속성 "must be unique" — 단계 3에서 원문 확인 후 인용, 확인 못 하면 쓰지 않음).
  - ⑧ 요소에서 찾기(예제 8 `element-scope.html`): `Element`의 `getElementsByClassName`도 "the list of elements with class names classNames for this"라 루트가 그 요소이고 필터는 "descendant elements" → 후손만(2). `querySelectorAll`·`querySelector`도 그 요소 기준.
  - ⑨ 시뮬레이터(① 아래 또는 예제 절): 3절.

### 유지해야 하는 기존 동작

- 기존 개념 37개는 수정하지 않는다. 하이드레이션 규칙, JS 없이 첫 단계가 보이는 시뮬레이터 규칙(AGENTS.md 시뮬레이터 규칙).
- title·summary·tags에 '객체'를 쓰지 않는다.

### 제외 범위

- 같은 인수로 `getElementsByClassName`을 다시 부르면 같은 객체인지(표준은 "may" — Chromium은 `true`, 쓰지 않음)
- `namedItem`, `item()`의 상세, `getElementsByName`, `matches`·`closest`, 선택자 문법, 잘못된 선택자의 `SyntaxError`(47장 `try...catch` 필요)
- `removeChild`·`append`·`createElement` 자체(39장 DOM 조작, 도구로만)

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-03 내려받음: scratchpad `live/domstd.html`(dom.spec.whatwg.org), `live/window.html`(html.spec.whatwg.org nav-history-apis))

- DOM `#concept-collection`: "A collection is an object that represents a list of nodes. A collection can be either live or static. Unless otherwise stated, a collection must be live. If a collection is live, then the attributes and methods on that object must operate on the actual underlying data, not a snapshot of the data."
- `#interface-nodelist` IDL(`iterable<Node>`), `#interface-htmlcollection` IDL과 노트 "HTMLCollection is a historical artifact we cannot rid the web of."
- `#concept-getelementsbyclassname`: "Return an HTMLCollection rooted at root, whose filter matches descendant elements that have all their classes in classes." `#dom-document-getelementsbyclassname`·`#dom-element-getelementsbyclassname`: "return the list of elements with class names classNames for this".
- `getElementsByTagName` 근처: "When invoked with the same argument, … the same HTMLCollection object may be returned as returned by an earlier call." → may, 제외.
- `#dom-parentnode-queryselectorall`: "return the static result of running scope-match a selectors string selectors against this." `#scope-match-a-selectors-string`: 잘못된 선택자는 "SyntaxError" DOMException(제외 범위).
- `#dom-node-childnodes`: "return a NodeList rooted at this matching only children."
- `#get-an-element-by-id`: "return the first element, in tree order, within node's descendants, whose ID is elementId; otherwise, if there is no such element, null."
- HTML `#named-access-on-the-window-object`: "The Window object supports named properties. The supported property names … the ID of all elements that have an ID and are in a document tree with window's associated Document as their root." 노트 "As a general rule, relying on this will lead to brittle code. Which IDs end up mapping to this API can vary over time, as new features are added to the web platform, for example. Instead of this, use document.getElementById() or document.querySelector()."

- (2026-11-03 구현 중 확인) HTML `dom.html#the-id-attribute`: "When specified on HTML elements, the id attribute value must be unique amongst all the IDs in the element's tree and must contain at least one character." → 중복 id는 작성 규칙 위반(본문에 인용 가능).
- (2026-11-03 구현 중 확인) Web IDL `#define-the-iteration-methods`: "If definition has an indexed property getter, then: Perform DefineMethodProperty(target, %Symbol.iterator%, %Array.prototype.values%, false). If definition has a value iterator, then: … "entries" … "keys" … "values" … "forEach", %Array.prototype.forEach%" → HTMLCollection(인덱스 getter만)은 `Symbol.iterator`만 있어 스프레드·`Array.from`이 되고, NodeList(`iterable<Node>` 값 이터레이터)는 `forEach`·`entries`·`keys`·`values`도 가진다.

### 사실 (실행 확인 — Playwright 1.64.1 Chromium, `runBrowserExample` settleMs 300, 예제마다 5회 연속 같은 출력)

초안: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/live/ex/`(부록). 모두 `.html`, resources 없음.

| # | 예제 | 실제 출력 |
| - | - | - |
| 1 | `live-loop.html` | `시작 4 ["todo","todo","todo","todo"]` / `i=0 3 ["done","todo","todo","todo"]` / `i=1 2 ["done","todo","done","todo"]` / `끝 2 ["done","todo","done","todo"]` |
| 2 | `static-loop.html` | `시작 4 ["todo","todo","todo","todo"]` / `i=0 4 ["done","todo","todo","todo"]` / `i=1 4 ["done","done","todo","todo"]` / `i=2 4 ["done","done","done","todo"]` / `i=3 4 ["done","done","done","done"]` / `끝 4 ["done","done","done","done"]` |
| 3 | `live-grow.html` | `3 2` / `3` |
| 4 | `collection-types.html` | `HTMLCollection NodeList` / `false false` / `undefined function` / `true 4` |
| 5 | `fixes.html` | `4` / `4 0` / `4 0` |
| 6 | `child-nodes-live.html` | `NodeList 4` / `2 2 4` |
| 7 | `duplicate-id.html` | `첫째` / `2 null` / `상자 true` |
| 8 | `element-scope.html` | `3` / `2 2` / `뉴스 1` |

- 지연에 의존하는 줄은 없다(모두 동기 스크립트).
- 책 대비: 같은 주제를 책도 다루므로 예제는 할 일 목록 `todo`→`done`, 반복마다 상태를 찍는 `show` 함수로 직접 작성했다(책 본문·예제 복사 금지 규칙).

### 사실 (코드에서 확인)

- 시뮬레이터 공통: `app/simulator/types.ts`(`Step<S>`: title·explanation·line·state·output, `Scenario<S>`: id·label·exampleId·code·steps), `SimulatorShell`(label, renderState(state, prevState)). 불변식 `tests/helpers/scenario-invariants.ts`(code = 예제 원문, 단계 ≥ 2, 마지막 output = expectedOutput, output prefix 확장, line이 코드 줄 범위·실제 코드 줄).
- 패턴: `app/concepts/regexp-lastindex/`(`scenarios.ts`가 `examples/*.js?raw` import, `Simulator.tsx` 얇은 래퍼, `RegexView.tsx`+테스트, `Simulator.test.tsx`, `concept.test.ts`가 불변식+실행 기록 대조). `CodeView`는 코드를 일반 텍스트 줄로 그리므로 `.html` 원문도 그대로 쓸 수 있다(`app/simulator/CodeView.tsx`). `?raw`는 Vite가 파일 종류와 무관하게 지원.
- e2e·빌드: 시뮬레이터 개념은 `tests/e2e/helpers.ts`에 PATH와 SIMULATOR_NAME, `a11y.spec.ts`에 페이지 axe와 시뮬레이터 진행 후 axe, `tests/build/build-output.test.ts`에 시뮬레이터 프리렌더 describe(regexp-lastindex 예: `tests/build/build-output.test.ts:881`).
- 고정 테스트(37개·마지막 dom-tree-nodes): `navigation.spec.ts`, `responsive.spec.ts`, `concepts.test.ts`, `ConceptPager.test.tsx` — `f16f473`이 고친 위치.

### 추정

- 없음

## 3. 구현 전략

- 구성: `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `Simulator.tsx`, `CollectionView.tsx`, `CollectionView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/`(8개).
- 상태 모델(`scenarios.ts`): `type CollectionState = { kind: 'live' | 'static'; classes: ('todo' | 'done')[]  /* li 4개, 문서 순서 */; collection: number[] | null  /* todos에 든 li 번호(0부터), 선언 전 null */; i: number | null; target: number | null  /* 이번 단계에서 바꾸는 li 번호 */; check: { i: number; length: number; result: boolean } | null  /* 반복 조건 평가 단계 */ }`.
- 단계(두 예제의 줄 번호: 14 `items`, 15 `todos`, 20 `show('시작')`, 21 `for` 조건, 22 대입, 23 `show('i=' + i)`, 25 `show('끝')`): 실행 전 → 14 → 15 → 20(출력 1줄) → [21 조건 참 → 22 대입 → 23 출력]×반복 → 21 조건 거짓 → 25(출력). live 12단계(실행 전·14·15·20, 반복 2번×3, 21 거짓, 25), static 18단계(반복 4번×3).
- 대조 테스트(`concept.test.ts`, 단계 2):
  - `assertScenarioInvariants`(두 시나리오).
  - live: `collection !== null`인 모든 단계에서 `collection`이 `classes`가 `todo`인 li 번호 목록과 같다(필터 정의). static: 15번 줄 이후 항상 `[0,1,2,3]`.
  - 22번 줄 단계의 `target`은 바로 앞 단계 `collection[i]`이고, 그 단계에서 `classes[target]`만 `todo`→`done`으로 바뀐다.
  - 21번 줄 단계의 `check.result === (check.i < check.length)`이고 `check.length`는 그 단계 `collection.length`.
  - 출력이 한 줄 늘어난 단계마다 새 줄이 `${label} ${collection.length} ${JSON.stringify(classes)}`와 같다(label은 `시작`·`i=N`·`끝` — 23번 줄은 그 단계의 `i`). 출력은 Chromium 실측이므로 단계 상태가 실제 동작에 묶인다.
- `CollectionView`: li 4개 카드(텍스트 `청소`·`빨래`·`설거지`·`장보기`, 클래스를 글자 배지 `todo`/`done`로 — 색만으로 구분하지 않음), 컬렉션 줄(`todos[0]`… 각 칸이 가리키는 li, live는 빠진 항목이 사라지고 인덱스가 당겨짐), `i`·`todos.length`·조건 결과, 이번 대상 강조. 이전 단계와 달라진 값 표시(prevState). 정적 마크업, 첫 단계는 JS 없이 보인다.
- 퀴즈: 예제 1(남는 todo), 2, 3, 4, 5, 6, 7, 8 — 8개 이상.
- 버린 대안: 비교표(사용자 미선택), 실행 기록 래핑(vm 방식은 브라우저 예제에 쓸 수 없고, 반복마다 찍은 출력이 같은 역할을 한다), `red`/`blue`(책 예제와 닮음).

## 4. 변경 파일

- 추가 `app/concepts/live-html-collection/` — 3절 구성, `meta.ts`(category `browser`, order 360, prerequisites `[{ label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' }, { label: '이터러블과 for...of', slug: 'iterable-for-of' }]`, related `['dom-tree-nodes', 'iterable-for-of', 'global-object']`, examples 8개 browser, reviewedAt은 사용자 콘텐츠 승인 날짜)
- 수정
  - `tests/e2e/helpers.ts`: `LIVE_HTML_COLLECTION_PATH`, `LIVE_HTML_COLLECTION_SIMULATOR_NAME = '컬렉션 시뮬레이터'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe('정답 확인' 보인 뒤) + 시뮬레이터 live 시나리오 7단계까지 진행한 뒤 axe(regexp-lastindex 패턴)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 없음(시뮬레이터 마지막 단계까지 진행 후도), 홈 학습 순서 37→38
  - `tests/e2e/navigation.spec.ts`: 37→38, 마지막 '38번째'·새 제목, 분모, dom-tree-nodes '37 / 38'·링크 2개, 새 개념 '38 / 38'
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 38, 마지막 live-html-collection
  - `tests/build/build-output.test.ts`: `시뮬레이터 프리렌더 (live-html-collection)` — 시뮬레이터 region, 첫 단계 제목, li 4개 카드 글자, `<details` 8개 이상
  - `docs/content-guide.md`: e2e 대상 목록
  - `.claude/plans/concept-roadmap-ch38-42.md`: 3번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/`, `tests/helpers/`, 기존 개념 37개

## 5. 위험 요소

- 시나리오 단계와 실제 동작 불일치 → 3절 대조 테스트(출력 줄·필터 규칙·대상·조건), 음성 확인(단계 2)
- 줄 번호 어긋남 → 불변식 ④ + 22번 줄 등 고정 번호를 테스트에서 원문 줄 내용으로 확인(`lines[21]`이 `todos[i].className = 'done';`)(단계 2)
- 표준 "may" 동작 → 제외(본문·단순화)
- 중복 id "must be unique" 인용 → 단계 3에서 HTML 표준 원문 확인 후에만 사용
- 시뮬레이터 접근성(색 의존, 상태 변화 안내) → 글자 배지, 공통 셸의 스크린 리더 안내, axe e2e(단계 2·4)
- 375px 넘침 → region 안 배치, responsive e2e(단계 4)

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "live-html-collection|HTMLCollection은 살아 있다|컬렉션 시뮬레이터|홈"`
- 화면(빌드 serve, 메인 직접): 시뮬레이터 두 시나리오를 끝까지 진행(라이트·다크, 375·1280), JS 없이 첫 단계, 퀴즈 정답
- 콘텐츠: 표준 인용 글자 대조, 참고 링크 anchor 확인

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `examples/` 8개(부록 `cp`), `meta.ts`, 임시 `content.mdx`, `route.tsx`
- 완료 조건: `tests/examples.test.ts`·`content-integrity.test.ts` 3회 연속 통과, 음성 확인

### 2. 시나리오·시뮬레이터·View와 테스트

- 대상: `scenarios.ts`, `Simulator.tsx`, `CollectionView.tsx`, `CollectionView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 완료 조건: 3절 대조 테스트 통과, live 12단계·static 18단계, 시나리오 한 단계의 `classes`나 `collection`을 바꾸면 실패(음성 확인), View 테스트(첫 단계 렌더, 글자 배지, 컬렉션 칸 수)

### 3. 본문

- 대상: `content.mdx`, `meta.ts` 문구
- 완료 조건: lint·format·typecheck·관련 vitest 통과, 표준 인용 대조, 빌드 화면 확인

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 완료 조건: 전체 `npm test` 3회 연속, `test:build`, 6절 e2e 통과

## 부록: 예제 초안

### `live-loop.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul>
  <li class="todo">청소</li>
  <li class="todo">빨래</li>
  <li class="todo">설거지</li>
  <li class="todo">장보기</li>
</ul>
<script>
var items = document.querySelectorAll('li');
var todos = document.getElementsByClassName('todo');
function show(label) {
  var classes = Array.from(items, (li) => li.className);
  console.log(label, todos.length, JSON.stringify(classes));
}
show('시작');
for (var i = 0; i < todos.length; i++) {
  todos[i].className = 'done';
  show('i=' + i);
}
show('끝');
</script>
</body>
</html>
```

### `static-loop.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul>
  <li class="todo">청소</li>
  <li class="todo">빨래</li>
  <li class="todo">설거지</li>
  <li class="todo">장보기</li>
</ul>
<script>
var items = document.querySelectorAll('li');
var todos = document.querySelectorAll('.todo');
function show(label) {
  var classes = Array.from(items, (li) => li.className);
  console.log(label, todos.length, JSON.stringify(classes));
}
show('시작');
for (var i = 0; i < todos.length; i++) {
  todos[i].className = 'done';
  show('i=' + i);
}
show('끝');
</script>
</body>
</html>
```

### `live-grow.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul id="list">
  <li>1</li>
  <li>2</li>
</ul>
<script>
var list = document.getElementById('list');
var byTag = document.getElementsByTagName('li');
var byQuery = document.querySelectorAll('li');
list.append(document.createElement('li'));
console.log(byTag.length, byQuery.length);
console.log(document.querySelectorAll('li').length);
</script>
</body>
</html>
```

### `collection-types.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul>
  <li class="todo">청소</li>
  <li class="todo">빨래</li>
  <li class="todo">설거지</li>
  <li class="todo">장보기</li>
</ul>
<script>
var byClass = document.getElementsByClassName('todo');
var byQuery = document.querySelectorAll('.todo');
console.log(byClass.constructor.name, byQuery.constructor.name);
console.log(Array.isArray(byClass), Array.isArray(byQuery));
console.log(typeof byClass.forEach, typeof byQuery.forEach);
console.log(Array.isArray(Array.from(byClass)), [...byClass].length);
</script>
</body>
</html>
```

### `fixes.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul>
  <li class="todo">청소</li>
  <li class="todo">빨래</li>
  <li class="todo">설거지</li>
  <li class="todo">장보기</li>
</ul>
<script>
var todos = document.getElementsByClassName('todo');
for (var i = todos.length - 1; i >= 0; i--) {
  todos[i].className = 'done';
}
console.log(document.getElementsByClassName('done').length);
var dones = document.getElementsByClassName('done');
Array.from(dones).forEach((li) => {
  li.className = 'todo';
});
console.log(document.getElementsByClassName('todo').length, dones.length);
while (todos.length > 0) {
  todos[0].className = 'done';
}
console.log(document.getElementsByClassName('done').length, todos.length);
</script>
</body>
</html>
```

### `child-nodes-live.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<ul id="list"><li>1</li><li>2</li><li>3</li><li>4</li></ul>
<script>
var list = document.getElementById('list');
var kids = list.childNodes;
console.log(kids.constructor.name, kids.length);
for (var i = 0; i < kids.length; i++) {
  list.removeChild(kids[i]);
}
console.log(kids.length, list.firstChild.textContent, list.lastChild.textContent);
</script>
</body>
</html>
```

### `duplicate-id.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<p id="note">첫째</p>
<p id="note">둘째</p>
<div id="box">상자</div>
<script>
console.log(document.getElementById('note').textContent);
console.log(document.querySelectorAll('#note').length, document.getElementById('none'));
console.log(box.textContent, box === document.getElementById('box'));
</script>
</body>
</html>
```

### `element-scope.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<section id="news">
  <p class="item">뉴스 1</p>
  <p class="item">뉴스 2</p>
</section>
<p class="item">광고</p>
<script>
var news = document.getElementById('news');
console.log(document.getElementsByClassName('item').length);
console.log(news.getElementsByClassName('item').length, news.querySelectorAll('.item').length);
console.log(news.querySelector('.item').textContent);
</script>
</body>
</html>
```


## 변경 이력

- 2026-11-03 (사용자 전달 외부 검토 7건, Chromium·표준 원문으로 확인 후 반영): ① `for...of`·`Array.prototype.forEach.call`·`childNodes.forEach`도 반복마다 살아 있는 컬렉션을 다시 읽어 절반만 처리 → **예제 9 `iteration-traps.html` 추가**(출력 `2` / `2` / `4 "todo done"` / `2`, 5회), 근거: Web IDL "The JavaScript forEach method that is generated for a value iterator invokes its callback like Array.prototype.forEach does", 배열 이터레이터의 `next`가 부를 때마다 `length`를 다시 읽음([이터러블과 for...of](/concepts/iterable-for-of)에서 다룸). 해결법의 핵심은 "인덱스를 버리는 것"이 아니라 "반복 중 구성 변화에 영향받지 않게 하는 것"이라고 명시 ② `while` 패턴은 처리한 항목이 필터에서 빠질 때만 끝남 — `classList.add('done')`은 `todo`가 남아 `length` 4 그대로(예제 9 셋째 줄), 그런 처리로 `while`을 쓰면 무한 루프 ③ "전역 변수"를 "Window의 이름 있는 프로퍼티"로(예제 7 제목·흔한 오해·도입), `Object.hasOwn(window, 'box')` false·`'box' in window` true와 `[object WindowProperties]`가 `Window.prototype`의 프로토타입(Web IDL: named properties object는 프로토타입 체인에 있음 — "the named properties object, which exposes the named properties, is in the prototype chain") → 예제 7에 줄 추가 ④ Window가 이미 가진 이름은 요소로 매핑되지 않음(Web IDL named property visibility: "prototype has an own property named P, then return false") — `id="name"`이어도 `name`은 `""`, 같은 id 둘이면 `note`는 `HTMLCollection` 길이 2 → 예제 7에 줄 추가(출력 `false true` / `HTMLCollection 2` / `"" 이름`) ⑤ "DOM 표준이 Web IDL로 선언", IDL 인용에서 `[Exposed=Window]`·`[Exposed=Window, LegacyUnenumerableNamedProperties]` 확장 속성은 생략했다고 밝힘 ⑥ id 유일성은 "같은 트리 안에서"(인용 원문 "in the element's tree"), 단순화에 섀도 트리 제외 ⑦ 요소의 `querySelectorAll`도 선택자는 문서 전체(node's root) 기준으로 맞추고 결과만 후손 — 예제 8에 `news.querySelectorAll('body section .item').length` 2 추가(검토의 "1개"는 실제 2개), 근거 scope-match "match a selector against a tree with selector and node's root using scoping root node", `:scope`는 단순화 — 영향 단계 1·3·4
- 2026-11-04 (사용자 전달 외부 검토 2차 6건, 원문·Chromium으로 확인 후 반영): ① `forEach`의 건너뜀 원리를 `for...of`와 분리 — ECMAScript `Array.prototype.forEach`는 `LengthOfArrayLike`로 길이를 한 번만 읽고 `HasProperty`가 `true`인 인덱스만 방문(명세 노트 "elements that are deleted after the call to forEach begins and before being visited are not visited" 인용), Web IDL 반복 메서드 정의 "Perform ! CreateDataPropertyOrThrow(target, "forEach", %Array.prototype.forEach%)."로 인용 교체 → 예제 6 둘째 줄 `2 [0,1]`(방문 인덱스)·넷째 줄 `2 true`(`NodeList.prototype.forEach === Array.prototype.forEach`) ② `[object WindowProperties]`를 Chromium 보고가 아니라 Web IDL class string 규칙("interface’s identifier and the string "Properties"")으로 설명 → 예제 8 일곱째 줄 ③ visibility 두 단계에 실례를 짝지음 — `name`은 own 단계(`[Global]` 인터페이스 어트리뷰트는 그 객체 자신에 놓임, `Object.hasOwn(window, 'name')` true → 여섯째 줄 `"" true 이름`), 프로토타입 단계는 `id="toString"`이어도 `typeof toString`이 `function`(일곱째 줄) ④ scope-match 인용은 현재 DOM 표준 원문("with selector and node’s root")과 같아 유지(검토의 "with s"는 원문과 다름, 사이트 관례대로 곧은 아포스트로피) ⑤ 흔한 오해 첫 항목·학습 목표 3에 `for...of`·`forEach`(예제 6) 추가, `HTMLCollection` forEach 오해의 `for` 문에 "구성을 바꾸지 않는 작업이라면" 조건 ⑥ 전역 `let`·`const`도 선언적 칸이 먼저라 가림([전역 객체](/concepts/global-object) 링크) → 예제 8 둘째 스크립트 `let box = 1`, 여덟째 줄 `1 false 상자`. 참고 자료에 ECMAScript `Array.prototype.forEach` 추가 — 영향 단계 1·3

## 구현 진행

- baseline (2026-11-03, `f16f473`): lint·format:check·typecheck 통과 / `npm test` 106 files·3385 tests 통과(22.22s). test:build·e2e는 직전 커밋 검증에서 통과(302 / navigation 16·관련 31).
- [x] 1. 예제·meta·route — 메인 확인: `examples/` 8개 초안과 `diff -r` 동일, 서브에이전트가 예제·무결성·개념 테스트 3회 연속 815 통과, MDN Document.getElementsByClassName 한국어판 404 → 영문판
- [x] 2. 시나리오·시뮬레이터·View — 메인이 `scenarios.ts` live 단계 전부와 `CollectionView.tsx`를 읽고 대조(줄 번호 14·15·20·21·22·23·25, 상태·설명이 필터 규칙·출력과 일치, 글자 배지·"(바뀜)"·"이번에 바꾸는 항목" 표시, 훅 없음). 서브에이전트 음성 확인 3건(단계 classes·collection·expectedOutput 변조 → 모두 실패, 원복 cmp 확인)
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — 38개·마지막 live-html-collection, a11y 시뮬레이터 '단계 7 / 12' 진행 후 axe, responsive 정적 시나리오 '단계 18 / 18' 뒤 가로 스크롤, 빌드 시뮬레이터 프리렌더. 메인 실행: lint·format·typecheck 통과, 전체 `npm test` 3433 통과(25.83s)
- [x] 3. 본문 — 메인이 `content.mdx` 전문을 읽고 대조: 표준 인용 12곳이 원문과 같음(2절·구현 중 확인 사실 포함), 해결법·childNodes 설명이 출력과 맞음, 퀴즈 9개 정답이 `expectedOutput`과 같음. 메인 수정: 퀴즈 해설 두 곳이 출력 모양을 따옴표 없이 인용해 class 나열로 바꿈, 흔한 오해 제목의 '찾히고' 표기 제거, 예제 1 결과의 "놓친 것이 아니라" 문장 다듬기. 화면(빌드 serve): 시뮬레이터 9단계 1280 라이트·375 다크, 첫 단계 375 라이트, 문서 가로 스크롤 없음
- 전체 검증(2026-11-03): lint·format:check·typecheck 통과, `npm test` 3회 연속 3433 통과(24.90s·25.04s·25.55s), `test:build` 311 통과, navigation 16 passed, `-g "live-html-collection|HTMLCollection은 살아 있다|컬렉션 시뮬레이터|홈"` 37 passed·1 skipped(기존 조건부)
- 리뷰 1차(critical-code-review, 메인 직접 — 본문·시나리오·View·테스트·고정 테스트 diff): Critical/High/Medium 0 · Low 1(보고만) — `npm test` 22.22s → 약 25s(브라우저 예제 24개 순차). 브라우저 분기 병렬화 후속 작업 대상
- 외부 검토 반영(변경 이력 마지막 항목): 서브에이전트가 예제 9개(`iteration-traps.html` 추가, 예제 7·8·9 번호 재배치)·예제 8·9 출력 줄 추가·본문 ①~⑦·참고 자료 3개(Web IDL 앵커 `#named-properties-object`·`#dfn-named-property-visibility`, DOM `#scope-match-a-selectors-string` 존재 확인)를 반영. 메인 확인: 새 예제 3개가 scratchpad 초안과 `cmp` 동일, 바뀐 절 전문 대조. 메인 수정 2건: 이름 접근 첫 문장에 "Window가 이미 가진 이름은 예외"를 넣어 과장 제거, 역순 `for` 문장의 "마찬가지로"(while의 무한 루프와 같은 위험처럼 읽힘)를 "이와 달리"로. 검증: lint·format:check·typecheck 통과, `npm test` 3회 연속 3434 통과(26.32s·25.79s·27.04s), `test:build` 311 통과, navigation 16 passed, `-g` 37 passed·1 skipped
- 외부 검토 2차 반영(2026-11-04, 변경 이력 마지막 항목): 메인이 직접 수정(예제 2개·meta·본문 — 표준 인용 정밀도가 핵심이라 위임하지 않음). 원문 확인: ECMA-262 23.1.3.15 단계와 노트, Web IDL define the iteration methods·class string·named property visibility·named properties object [[GetOwnProperty]](object = 전역 객체)·[Global] 어트리뷰트 위치, DOM scope-match. Chromium 프로브로 `2 [0,1]`·`true`·`[object WindowProperties]`·`true function false`·`1 false 상자` 확인 후 예제에 반영. 검증: lint·format:check·typecheck 통과, `npm test` 3회 연속 3434 통과(28.60s·26.37s·25.91s), `test:build` 311 통과, navigation 16 passed, `-g "live-html-collection|HTMLCollection은 살아 있다|컬렉션 시뮬레이터|홈"` 37 passed·1 skipped
- 외부 검토 3차(2026-11-04, scope-match 인용 "with s" 지적): 변경 없음. 현재 DOM 표준(dom.spec.whatwg.org, last-modified 2026-10-19)과 whatwg/dom `dom.bs` main 모두 "Let selector be … / with selector and node's root". `s`→`selector`는 whatwg/dom 9b0f03a(2025-11-28, "Editorial: modernize Ranges and CharacterData")에서 바뀜 — 검토가 그 이전 판을 본 것으로 판단

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 반복 단계 시뮬레이터(live 12단계·static 18단계, 단계 상태를 필터 규칙·Chromium 출력 줄과 대조), 추가 주제 4개(해결 방법 3가지, childNodes도 살아 있다, id 중복과 Window 이름 접근, 요소에서 찾기)로 구현.
- 계획과 달라진 점: 예제 8개 → 9개(외부 검토 1차로 `iteration-traps.html` 추가, 기존 6~8은 7~9로), 퀴즈 9개 → 10개. 외부 검토에서 나온 문장 주장(for...of·forEach 함정, own 프로퍼티 여부, 이미 가진 이름, class string, 전역 `let`, 선택자 매칭 범위)은 모두 예제 출력 줄로 만들어 L1이 Chromium으로 대조하게 했다.
- 사용자가 전달한 외부 검토 세 차례(7건·6건·1건)를 표준 원문·Chromium으로 확인한 뒤 반영(변경 이력). 3차 1건(scope-match "with s")은 현재 DOM 표준이 `selector`라 변경하지 않음.

### 코드 리뷰

- Critical/High/Medium 0. Low 1건 유지: `npm test`가 baseline 22.22s에서 약 26~29s로 늘었다(순차 실행되는 브라우저 예제 25개). 인프라 계획의 추가 개선 후보(브라우저 분기 병렬화) 대상.

### 후속 작업

- [ ] `examples.test.ts` 브라우저 예제 병렬화 검토(인프라 계획 9절) — `npm test`가 약 26~29초
- [ ] dom-tree-nodes의 "childNodes가 돌려주는 NodeList와 children이 돌려주는 HTMLCollection의 차이(살아 있음)는 별도 개념" 문구를 이 페이지 링크로(역방향 링크 일괄 처리 목록)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 외부 검토가 제안한 문장 주장을 본문 문장만으로 넣지 않고 예제 출력 줄로 만듦(예제 6 신설, 예제 8·9 줄 추가) — 대안: 표준 인용만 붙여 문장으로 서술. 이유: AGENTS.md의 "모든 실행 결과 주장은 실제 실행으로 검증" 원칙. 그 결과 검토 1차의 "`body section .item`은 1개"가 실제로는 2개임을 잡았다.
- [Claude 판단] `forEach`와 `for...of`의 건너뜀 원리를 구분해 방문 인덱스 `[0,1]`과 `NodeList.prototype.forEach === Array.prototype.forEach`를 출력에 넣음 — 검토 2차 지적을 ECMA-262 23.1.3.15 단계와 Web IDL "define the iteration methods" 원문으로 확인한 뒤, 결과가 같아도 원리를 출력으로 구분해 보이게 했다.
- [Claude 판단] 검토 3차의 scope-match 인용 수정 요청을 반영하지 않음 — 현재 dom.spec.whatwg.org와 whatwg/dom `dom.bs`가 "with selector and node's root"이고, `s`→`selector`는 whatwg/dom 9b0f03a(2025-11-28)에서 바뀌었다. 바꾸면 오히려 현재 원문과 달라진다.
- [Claude 판단] 시뮬레이터 단계 상태를 손으로 쓰되, 테스트가 단계마다 필터 정의(`collection` = `todo`인 li 번호)·대상·조건식·출력 줄과 대조 — 대안: 실행 기록 래핑. 브라우저 예제는 vm 래핑을 쓸 수 없고, 반복마다 찍은 Chromium 출력이 같은 역할을 한다.
- [무검토 승인] 예제를 책의 `red`/`blue`가 아닌 할 일 목록(`todo`→`done`)으로 직접 작성 — 책 예제와 닮지 않게.
- 반복 단계 시뮬레이터·추가 주제 4개·"절반만 바꿀까" 질문형 제목은 사용자가 정했고, 외부 검토 세 차례는 사용자가 전달했다.

#### 배경지식

- DOM 표준의 컬렉션은 달리 정하지 않으면 살아 있다. `getElementsByClassName`의 `HTMLCollection`은 항목을 저장한 목록이 아니라 루트와 필터("주어진 클래스를 모두 가진 후손 요소")이고, `querySelectorAll`만 "static result"를 돌려준다. `childNodes`의 `NodeList`도 살아 있다.
- `for...of`의 배열 이터레이터는 `next`마다 `LengthOfArrayLike`로 길이를 다시 읽는다. `Array.prototype.forEach`는 길이를 한 번만 읽고 `HasProperty`가 `true`인 인덱스만 방문한다. Web IDL은 값 이터레이터 인터페이스의 `forEach`를 `%Array.prototype.forEach%` 그 함수로 정한다.
- `Window`의 이름 있는 프로퍼티는 `window` 자신이 아니라 프로토타입 체인 위 named properties object(class string `WindowProperties`)에 있다. named property visibility는 `window`의 own 프로퍼티(`[Global]` 어트리뷰트 `name` 등)와 체인 위 일반 객체의 own 프로퍼티(`Object.prototype.toString`)가 있으면 이름을 숨긴다. 전역 `var`는 own 프로퍼티로, 전역 `let`·`const`는 선언적 칸이 먼저 조회되어 가린다.
- 요소의 `querySelectorAll`은 선택자를 그 요소의 root(문서) 기준으로 맞추고 결과만 후손으로 좁힌다(scope-match).

#### 확인 질문

1. `Array.prototype.forEach.call(todos, …)`와 `for...of`는 둘 다 2개를 남기는데, 둘을 "반복마다 length를 다시 읽어서"로 묶어 설명하면 무엇이 틀리고, 예제 6의 어떤 출력이 그 차이를 보여 주는가?
   <details><summary>답</summary>`forEach`는 시작할 때 길이(4)를 한 번만 읽어 고정한다. k=0·1에서 컬렉션이 둘로 줄고 k=2·3에서는 인덱스 2·3이 없어 `HasProperty`가 false라 콜백이 불리지 않는다. 둘째 줄 `2 [0,1]`이 콜백이 받은 인덱스를 보여 준다. (본문 "해결 방법" 절, 변경 이력 2026-11-04 ①)</details>
2. 외부 검토가 제안한 문장을 본문에만 넣지 않고 예제 출력 줄로 만든 이유는? 그렇게 해서 실제로 잡아낸 오류는?
   <details><summary>답</summary>이 저장소는 실행 결과 주장을 L1(`tests/examples.test.ts`)이 Chromium에서 실행해 대조하는 것으로만 인정한다. 검토 1차의 "`news.querySelectorAll('body section .item')`은 1개"가 실행하니 2개였다. (변경 이력 2026-11-03 ⑦, 예제 9 넷째 줄)</details>
3. `id="name"`과 `id="toString"`은 둘 다 요소로 매핑되지 않는데, named property visibility의 어느 단계에서 각각 걸리는가?
   <details><summary>답</summary>`name`은 `[Global]` 인터페이스의 어트리뷰트라 `window` 자신의 own 프로퍼티여서 "If O has an own property named P" 단계에서 걸린다(`Object.hasOwn(window, 'name')` true). `toString`은 `window`의 own이 아니지만 체인 위 `Object.prototype`에 있어 "prototype has an own property named P" 단계에서 걸린다(`typeof toString`이 function). (예제 8 여섯째·일곱째 줄)</details>
4. 검토가 인용문을 "원문과 다르다"고 했을 때 고치지 않은 근거는 무엇이고, 비슷한 지적을 다시 받으면 무엇부터 확인해야 하는가?
   <details><summary>답</summary>현재 dom.spec.whatwg.org와 whatwg/dom main의 `dom.bs`가 "with selector"이고, `s`에서 `selector`로 바뀐 커밋(9b0f03a, 2025-11-28)을 찾았다. 표준은 계속 고쳐지는 living standard이므로 지금 판의 원문과 바뀐 이력을 먼저 확인한다. (구현 진행 "외부 검토 3차")</details>
5. 시뮬레이터 단계 상태를 손으로 썼는데도 "실제 동작과 같다"고 말할 수 있는 근거는? 어떤 변조가 어떤 테스트에서 실패하는가?
   <details><summary>답</summary>`concept.test.ts`가 단계마다 `collection`을 `classes`가 `todo`인 li 번호와 대조하고(필터 정의), 22번 줄의 대상이 직전 `collection[i]`인지, 21번 줄 조건이 `i < length`인지, 새 출력 줄이 상태로 만든 문자열과 같은지 본다. 출력은 Chromium 실측이라 상태가 실제 동작에 묶인다. 단계 `classes`·`collection`·`expectedOutput`을 바꾼 음성 확인 3건이 모두 실패했다. (구현 진행 단계 2)</details>
