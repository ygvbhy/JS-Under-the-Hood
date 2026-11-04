# 개념 '이벤트 전파와 위임' 구현 계획

- 상태: 완료
- 작성일: 2026-11-04
- 기준: `main` @ `143c043`

## 0. 요약

- 목적: 38~42장 로드맵 5번 `/concepts/event-propagation-delegation`을 추가한다. 40장 이벤트 전파(캡처 → 타깃 → 버블, `eventPhase`), `target`과 `currentTarget`, 이벤트 위임을 Chromium 출력과 단계마다 대조되는 전파 시뮬레이터, 예제 8개, 퀴즈로 WHATWG DOM·HTML·UI Events 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `browser`, order 380, 학습 순서 40번째·마지막, 공통 `SimulatorShell` + 개념 전용 `PathView`). 고정 테스트·e2e(시뮬레이터 진행 포함)·빌드 테스트·content-guide·로드맵을 고친다. 공통 코드와 기존 개념 39개는 바꾸지 않는다.
- 위험: 시뮬레이터 단계가 실제 디스패치와 어긋남(특히 타깃에서 캡처 리스너가 먼저 불리는 순서, 타깃은 두 번 순회) → 단계 상태를 Chromium 출력 줄·`composedPath` 출력·DOM 디스패치 규칙과 대조하는 테스트.
- 복잡도: 중간 · Consensus: 생략. live-html-collection과 같은 공통 셸·불변식·개념 전용 View 패턴이고 공통 코드를 바꾸지 않는다. 예제 8개 출력은 실행기로 3회씩 확인했고 핵심 주장은 표준 원문과 대조했다.
- 미확정: 없음(추가 주제 4개·시각화·제목은 2026-11-04 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 5번 "이벤트 전파와 위임"(40장)을 새 개념 페이지로 만든다.
- 사용자 결정(2026-11-04)
  - 기본 범위: ① 캡처 → 타깃 → 버블 순서와 `eventPhase` ② `target`과 `currentTarget` ③ 이벤트 위임과 `closest`, 나중에 추가한 요소.
  - 추가 주제 4개 모두: **버블링하지 않는 이벤트**(`focus`·`focusin`, `new Event`의 `bubbles` 기본값, 캡처 리스너는 받음), **핸들러 안의 `this`**(일반 함수는 `currentTarget`, 화살표 함수는 바깥 `this`), **핸들러 등록 방식**(`onclick` 어트리뷰트·프로퍼티는 하나, `addEventListener`는 여러 개), **디스패치가 끝난 이벤트 객체**(`currentTarget` `null`, `eventPhase` 0, `composedPath()` 빈 배열).
  - 시각화: **전파 단계 시뮬레이터** — 경로(window → … → 타깃) 그림에서 단계마다 지금 방문하는 노드, 순회(캡처/버블), `eventPhase`, `target`, `currentTarget`, 실행된 리스너를 보인다. 두 시나리오(아이콘 클릭, 버튼 직접 클릭).
  - 제목 "이벤트 전파와 위임: 버튼을 눌렀는데 event.target은 왜 버튼이 아닐까", slug `event-propagation-delegation`.
- 로드맵 6번(기본 동작과 전파 막기: `preventDefault`·`stopPropagation`·같은 함수 중복 등록)은 별도 페이지라 이 페이지에서는 "별도 개념"으로만 언급한다.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 이벤트는 경로를 두 번 지나간다(예제 1 `path-icon.html`, 시뮬레이터 시나리오 1): DOM dispatch — 경로를 만든 뒤 "For each item of event's path, in reverse order: If item's shadow-adjusted target is non-null, then set event's eventPhase attribute to AT_TARGET. Otherwise, set event's eventPhase attribute to CAPTURING_PHASE. Invoke with item, event, "capturing" …", 이어 "For each item of event's path: If item's shadow-adjusted target is non-null, then set event's eventPhase attribute to AT_TARGET. Otherwise: If event's bubbles attribute is false, then continue. Set event's eventPhase attribute to BUBBLING_PHASE. Invoke with item, event, "bubbling" …". `eventPhase` 값 정의 "NONE (numeric value 0) … CAPTURING_PHASE (numeric value 1) … AT_TARGET (numeric value 2) … BUBBLING_PHASE (numeric value 3)". 경로는 `composedPath()`로 보인다(`["icon","save","card","body","html","document","window"]`). 리스너가 없는 노드도 경로에 있다.
  - ② `target`과 `currentTarget`(예제 1·3 `target-pitfall.html`): invoke "Initialize event's currentTarget attribute to pathItem's invocation target." `target`은 이벤트가 일어난 가장 안쪽 노드(아이콘 span), `currentTarget`은 지금 리스너가 달린 노드. 아이콘을 누르면 버튼 리스너도 `eventPhase`가 1·3이다(타깃이 아니라서). 버튼에 단 리스너에서 `e.target.dataset.id`를 쓰면 아이콘을 눌렀을 때 `undefined`, `e.currentTarget.dataset.id`는 `42`.
  - ③ 타깃에서는 캡처 리스너가 먼저(예제 2 `path-button.html`, 시나리오 2): inner invoke "If phase is "capturing" and listener's capture is false, then continue. If phase is "bubbling" and listener's capture is true, then continue." → 타깃은 캡처 순회와 버블 순회에서 한 번씩 방문하고, 캡처 순회에서는 capture 리스너만, 버블 순회에서는 나머지만 부른다. 그래서 버블 리스너를 먼저 등록해도 `save 캡처 2`가 `save 버블 2`보다 먼저다. (예전 브라우저는 타깃에서 등록 순서였다는 이력은 근거를 확보하지 않았으므로 쓰지 않는다.)
  - ④ 이벤트 위임(예제 4 `delegation.html`): 목록 `ul` 하나에 리스너를 달고 `e.target.closest('button')`으로 버튼을 찾는다. DOM `closest` "Let elements be this's inclusive ancestors that are elements, in reverse tree order. For each element of elements: if match a selector against an element … return element." → `<b>`를 눌러도 버튼을 찾고, 버튼 밖(`구분선`)이면 `null`. 나중에 `append`한 버튼도 같은 리스너로 처리된다(리스너는 `ul`에 있고 클릭은 버블링으로 `ul`까지 오므로).
  - ⑤ 버블링하지 않는 이벤트(예제 5 `non-bubbling.html`): `EventInit` "boolean bubbles = false" → `new Event('ping')`은 바깥에서 버블 리스너로 받지 못하고 `bubbles: true`만 받는다(`["true:3"]`). UI Events 표 `focus` "Bubbles No", `focusin` "Bubbles Yes", "The focus event MUST fire before the dispatch of this event type." → `form`의 `focus` 버블 리스너는 불리지 않고, `focus` 캡처 리스너와 `focusin` 버블 리스너는 불린다(`["focus 캡처","focusin 버블"]`). 버블링하지 않아도 캡처 순회는 한다(위 dispatch 단계의 continue는 버블 순회에만 있음). `click()`은 HTML "Initialize event's bubbles and cancelable attributes to true."
  - ⑥ 핸들러 안의 `this`(예제 6 `this-in-handler.html`): DOM inner invoke "Call a user object's operation with listener's callback, "handleEvent", « event », and event's currentTarget attribute value." → 일반 함수의 `this`는 `currentTarget`(`true box go`), 화살표 함수는 자기 `this`가 없어 바깥(스크립트 최상위) `this`인 `window`(`true false`). [this 바인딩](/concepts/this-binding)이 미뤄 둔 "호스트가 this를 정하는 경우"와 [화살표 함수](/concepts/arrow-functions) 연결.
  - ⑦ 핸들러 등록 방식(예제 7 `handler-registration.html`): HTML "These act as non-capture event listeners for the object on which they are specified." 이벤트 핸들러는 값 하나를 갖는 구조(`onclick` 어트리뷰트와 `onclick` 프로퍼티가 같은 핸들러) — IDL setter "Set eventHandler's value to the given value. Activate an event handler given eventTarget and name.", activate "If eventHandler's listener is not null, then return." → 어트리뷰트로 처음 활성화될 때 리스너 목록의 첫 자리를 차지하고, 프로퍼티를 다시 대입해도 값만 바뀌어 자리는 그대로(`["프로퍼티B","리스너1","리스너2"]`). 어트리뷰트 문자열은 그대로 남는다(`getAttribute('onclick')`, [HTML 어트리뷰트와 DOM 프로퍼티](/concepts/html-attribute-dom-property)와 연결 — 이벤트 핸들러 IDL 어트리뷰트는 반영이 아님). `onclick = null`은 deactivate "remove an event listener" → `["리스너1","리스너2"]`.
  - ⑧ 디스패치가 끝난 이벤트 객체(예제 8 `after-dispatch.html`, 예제 1 마지막 줄): dispatch 끝 "Set event's eventPhase attribute to NONE. Set event's currentTarget attribute to null. Set event's path to the empty list." → 저장해 둔 이벤트는 `0 null save 0`(`target`은 그림자 트리가 아니면 지우지 않음 — clearTargets 조건), `composedPath()`는 "If path is empty, then return composedPath."로 빈 배열.
  - ⑨ 시뮬레이터: 3절.

### 유지해야 하는 기존 동작

- 기존 개념 39개는 수정하지 않는다(역방향 링크는 사용자 결정으로 나중에 일괄). 하이드레이션 규칙, JS 없이 첫 단계가 보이는 시뮬레이터 규칙.
- title·summary·tags에 '객체'를 쓰지 않는다(홈 '객체' 검색 고정 테스트).

### 제외 범위

- `preventDefault`·`stopPropagation`·`stopImmediatePropagation`·같은 함수 중복 등록·`once`·`passive`·`signal`(로드맵 6번 별도 개념)
- `removeEventListener` 상세, 커스텀 이벤트의 `detail`(`CustomEvent`), Shadow DOM과 `composed`·리타기팅, `mouseenter`·`mouseleave`, 실제 사용자 입력(`isTrusted` true)
- 이벤트 핸들러 콘텐츠 어트리뷰트의 스코프·`return false` 처리, `handleEvent` 객체 리스너
- 타이머(41장)·이벤트 루프(42장)

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-04 내려받음: scratchpad `evt/std/` dom.html·webappapis.html·interaction.html·uievents.html)

- DOM `#concept-event-dispatch`: 캡처 순회·버블 순회 단계(1절 ①), 끝 단계(1절 ⑧), `EventInit` "boolean bubbles = false", `eventPhase` 상수 정의, `currentTarget` "When an event is created the attribute must be initialized to null.", `composedPath()` "If path is empty, then return composedPath."
- DOM `#concept-event-listener-invoke`: "Initialize event's currentTarget attribute to pathItem's invocation target. Let listeners be a clone of event's currentTarget attribute value's event listener list." `#concept-event-listener-inner-invoke`: capture/bubbling 걸러내기(1절 ③), 콜백 호출(1절 ⑥).
- DOM `closest(selectors)`(1절 ④).
- HTML `#event-handler-attributes`: "These act as non-capture event listeners for the object on which they are specified." `#event-handler-idl-attributes` setter, `#activate-an-event-handler` "If eventHandler's listener is not null, then return.", `#deactivate-an-event-handler` "Set eventHandler's value to null. … remove an event listener with eventTarget and listener."
- HTML `#dom-click` "Fire a synthetic pointer event named click at this element, with the not trusted flag set.", `#fire-a-synthetic-pointer-event` "Initialize event's bubbles and cancelable attributes to true."
- HTML `#fire-a-focus-event`: FocusEvent로 발생(bubbles 지정 없음 → 기본 false).
- UI Events(W3C): focus "Bubbles No", focusin "Bubbles Yes", "The focus event MUST fire before the dispatch of this event type. This event type is similar to focus, but does bubble."

### 사실 (실행 확인 — Playwright Chromium, `runBrowserExample` settleMs 300, 3회 연속 같은 출력)

초안: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/48daa705-1d4a-4069-aedf-5b13655d519c/scratchpad/evt/ex/`. 모두 `.html`, resources 없음, 동기(지연 의존 없음). ` / `는 줄 구분.

| # | 예제 | 실제 출력 |
| - | - | - |
| 1 | `path-icon.html` | `["icon","save","card","body","html","document","window"]` / `card 캡처 1 icon card` / `save 캡처 1 icon save` / `save 버블 3 icon save` / `card 버블 3 icon card` / `document 버블 3 icon document` / `끝 0 null` |
| 2 | `path-button.html` | `["save","card","body","html","document","window"]` / `card 캡처 1 save card` / `save 캡처 2 save save` / `save 버블 2 save save` / `card 버블 3 save card` |
| 3 | `target-pitfall.html` | `heart undefined 42` / `like 42 42` |
| 4 | `delegation.html` | `B copy` / `note 버튼 아님` / `BUTTON cut` |
| 5 | `non-bubbling.html` | `["focus 캡처","focusin 버블"]` / `false true` / `["true:3"]` |
| 6 | `this-in-handler.html` | `true box go` / `true false` |
| 7 | `handler-registration.html` | `function` / `["프로퍼티B","리스너1","리스너2"]` / `log.push('어트리뷰트')` / `["리스너1","리스너2"]` |
| 8 | `after-dispatch.html` | `3 card 6` / `0 null save 0` |

- 예제 1 줄 번호(시나리오용): 9–13 `name`, 14–18 `show`, 22–25 window 캡처 리스너(경로 출력), 26 card 캡처, 27 save 캡처, 28 save 버블, 29 card 버블, 30 document 버블, 31 `icon.click()`, 32 `끝` 출력. 예제 2: 21–23 window 캡처 리스너, 24 save 버블, 25 save 캡처, 26 card 버블, 27 card 캡처, 28 `save.click()`.
- `click()`으로 만든 이벤트는 `isTrusted`가 `false`(content-guide 브라우저 예제 규칙). `focus()`는 headless Chromium에서 3회 모두 같은 결과.
- 책 대비: 책 40.6·40.7은 과일 목록(`#fruits`, `#apple`)과 내비게이션 예제를 쓴다. 이 페이지는 카드·저장 버튼·아이콘, 복사/붙여넣기 메뉴, 좋아요 버튼으로 직접 작성했다.

### 사실 (코드에서 확인)

- 시뮬레이터 공통: `app/simulator/types.ts`(`Step<S>`·`Scenario<S>`), `SimulatorShell`(label, renderState). 불변식 `tests/helpers/scenario-invariants.ts`. 패턴: `app/concepts/live-html-collection/`(`scenarios.ts`가 `examples/*.html?raw` import, `Simulator.tsx` 19줄 래퍼, `CollectionView.tsx`+테스트, `Simulator.test.tsx`, `concept.test.ts`가 불변식+출력 줄 대조).
- e2e·빌드: `tests/e2e/helpers.ts` PATH·SIMULATOR_NAME, `a11y.spec.ts` 페이지 axe + 시뮬레이터 진행 후 axe, `responsive.spec.ts` 가로 스크롤(시뮬레이터 마지막 단계까지 진행 후 포함), `tests/build/build-output.test.ts` `시뮬레이터 프리렌더 (live-html-collection)` describe(`14f9a36` 참고).
- 고정 테스트(39개·마지막 html-attribute-dom-property): `navigation.spec.ts`, `responsive.spec.ts`(홈 학습 순서), `app/lib/concepts.test.ts`, `ConceptPager.test.tsx` — `143c043`이 고친 위치.

### 추정

- 없음

## 3. 구현 전략

- 구성: `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `Simulator.tsx`, `PathView.tsx`, `PathView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/`(8개, 초안 `cp`).
- 상태 모델(`scenarios.ts`):
  ```ts
  type Listener = { node: string; capture: boolean; label: string; line: number }
  type PropagationState = {
    path: string[] | null      // composedPath 순서(타깃 → window). 첫 출력 전에는 null
    listeners: Listener[]      // 시나리오에 등록된 리스너(코드 순서, 시나리오마다 고정)
    pass: 'capture' | 'bubble' | null  // 지금 순회
    node: string | null        // 지금 방문하는 노드(= currentTarget)
    eventPhase: 0 | 1 | 2 | 3
    target: string | null
    fired: string | null       // 이 단계에서 실행된 리스너 label(없으면 null)
  }
  ```
  window 캡처 리스너의 label은 `window 캡처`(경로를 출력하는 리스너).
- 단계: 시나리오 1(아이콘) — 실행 전(31번 줄) → 캡처 순회 7노드(window…icon, 역순) → 버블 순회 7노드(icon…window) → 끝(32번 줄, `eventPhase` 0·`node` null) = 16단계. 시나리오 2(버튼) — 실행 전(28번 줄) → 캡처 6노드 → 버블 6노드 = 13단계. 리스너가 실행되는 단계의 `line`은 그 리스너를 등록한 줄(window는 범위 22–25/21–23), 리스너가 없는 노드는 `click()` 줄.
- 대조 테스트(`concept.test.ts`):
  - `assertScenarioInvariants`(두 시나리오), 시나리오 id·라벨·exampleId·단계 수(16·13), 고정 줄 번호의 원문 확인.
  - `path`가 null이 아닌 모든 단계의 `path`는 그 예제 expectedOutput 첫 줄(`JSON.parse`)과 같다.
  - 캡처 순회 단계의 `node` 순서 = `path` 역순, 버블 순회 = `path` 순서(시나리오의 단계 순서로 확인).
  - `eventPhase` 규칙: `node === target`이면 2, 아니면 캡처 1·버블 3, 실행 전·끝은 0. 끝 단계는 `node` null.
  - `fired`가 있으면 그 리스너가 `listeners`에 `node`와 같은 노드로 있고, 캡처 순회면 `capture: true`, 버블 순회면 `capture: false`(inner invoke 규칙). 모든 리스너가 정확히 한 번 실행된다.
  - 출력이 한 줄 늘어난 단계는 `fired`가 있는 단계뿐이고, 새 줄이 `window 캡처`면 `JSON.stringify(path)`, 아니면 `${label} ${eventPhase} ${target} ${node}`와 같다. 끝 단계 줄은 `끝 0 null`. 출력은 Chromium 실측이므로 단계 상태가 실제 디스패치에 묶인다.
- `PathView`: 경로를 세로 목록으로(window 위, 타깃 아래), 노드마다 등록된 리스너 칩(`캡처`/`버블` 글자 표시 — 색만으로 구분하지 않음), 지금 노드 강조와 순회 방향 글자(`↓ 캡처 순회`/`↑ 버블 순회`), 패널에 `eventPhase`(숫자 + 이름 NONE/CAPTURING_PHASE/AT_TARGET/BUBBLING_PHASE), `target`, `currentTarget`, 이번 단계에 실행된 리스너. 이전 단계와 달라진 값 표시(prevState). 정적 마크업, 첫 단계는 JS 없이 보인다(실행 전 단계는 `path` null이므로 "click() 호출 전 — 경로는 디스패치가 시작될 때 정해집니다" 안내와 등록된 리스너만 표시).
- 퀴즈 10개 이상(예제마다 1개 이상).
- 버린 대안: 표 + 퀴즈(사용자 미선택), 페이지 안 실제 클릭 데모(새 패턴·하이드레이션 설계 필요, 사용자 미선택), 실행 기록 래핑(브라우저 예제에는 출력 줄이 같은 역할).

## 4. 변경 파일

- 추가 `app/concepts/event-propagation-delegation/` — 3절 구성. `meta.ts`: category `browser`, order 380, prerequisites `[{ label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' }, { label: 'this 바인딩', slug: 'this-binding' }]`, related `['dom-tree-nodes', 'this-binding', 'arrow-functions', 'html-attribute-dom-property']`, examples 8개 browser, references(2절 표준 절 + MDN), reviewedAt은 사용자 콘텐츠 승인 날짜.
  - simplifications(안): Chromium 실행·표준 근거 / 사용자 클릭 대신 `click()`·`dispatchEvent`(`isTrusted` false) / `preventDefault`·`stopPropagation`은 다음 개념 / Shadow DOM·리타기팅·`composed` 제외(경로는 그림자 트리 없는 문서 기준) / `focus`·`focusin`은 UI Events(W3C) 근거, `focusout`·`blur` 제외 / 이벤트 핸들러 어트리뷰트의 스코프·반환값 처리 제외 / 리스너 등록 옵션(`once`·`passive`·`signal`) 제외 / console은 호스트 API.
- 수정
  - `tests/e2e/helpers.ts`: `EVENT_PROPAGATION_DELEGATION_PATH`, `EVENT_PROPAGATION_DELEGATION_SIMULATOR_NAME = '이벤트 전파 시뮬레이터'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe('정답 확인' 보인 뒤) + 시나리오 1을 7단계까지 진행한 뒤 axe(live-html-collection 패턴)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 없음(페이지, 시나리오 1 마지막 단계까지 진행 후), 홈 학습 순서 39→40
  - `tests/e2e/navigation.spec.ts`: 39→40, 마지막 '40번째'·새 제목, 분모 전부, html-attribute-dom-property '39 / 40'·링크 2개, 새 개념 '40 / 40'
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 40, 마지막 event-propagation-delegation(이전 html-attribute-dom-property)
  - `tests/build/build-output.test.ts`: `시뮬레이터 프리렌더 (event-propagation-delegation)` — 시뮬레이터 region, 첫 단계 제목, 등록된 리스너 글자(`card 캡처` 등), `<details` 10개 이상
  - `docs/content-guide.md`: e2e 대상 목록
  - `.claude/plans/concept-roadmap-ch38-42.md`: 5번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/`, `tests/helpers/`, 기존 개념 39개

## 5. 위험 요소

- 시나리오 단계와 실제 디스패치 불일치(타깃 이중 방문, 타깃의 캡처 우선, 리스너 없는 노드) → 3절 대조 테스트 + 음성 확인(단계 2)
- 줄 번호 어긋남 → 불변식 + 고정 줄 원문 확인(단계 2)
- "타깃에서 등록 순서대로"였던 옛 동작 같은 근거 없는 역사 서술 → 쓰지 않음(1절 ③)
- `focus()` 결과가 실행 환경(창 포커스)에 따라 달라질 가능성 → 예제 테스트 3회 연속 통과로 확인(단계 1), 실패하면 사용자에게 보고하고 예제 5에서 focus 부분 제외 검토
- 이벤트 핸들러 IDL 어트리뷰트를 "반영"이라고 잘못 부르는 것 → 1절 ⑦에서 반영이 아니라 이벤트 핸들러 값이라고 씀(직전 개념의 교훈)
- 시뮬레이터 접근성(색 의존, 상태 안내) → 글자 칩, 공통 셸 안내, axe e2e(단계 2·4)
- 375px 넘침(긴 경로·리스너 칩) → region 안 배치, responsive e2e(단계 4)

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "event-propagation-delegation|이벤트 전파와 위임|이벤트 전파 시뮬레이터|홈 학습 순서 보기"`
- 화면(빌드 serve, 메인 직접): 두 시나리오를 끝까지 진행(라이트·다크, 375·1280), JS 없이 첫 단계와 퀴즈 정답
- 콘텐츠: 영어 인용을 내려받은 표준 사본과 공백 무시 대조, 참고 링크 anchor 확인

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `examples/` 8개(초안 `cp`), `meta.ts`, 임시 `content.mdx`, `route.tsx` — meta.ts → content.mdx → route.tsx 순
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 3회 연속 통과, expectedOutput 한 줄을 바꾸면 실패(음성 확인 후 되돌림)

### 2. 시나리오·시뮬레이터·View와 테스트

- 대상: `scenarios.ts`, `Simulator.tsx`, `PathView.tsx`, `PathView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 완료 조건: `npx vitest run app/concepts/event-propagation-delegation` 통과, 시나리오 단계 하나의 `eventPhase`나 `fired`를 바꾸면 실패(음성 확인)

### 3. 본문

- 대상: `content.mdx`(1절 ①~⑧ h3, 예제 `file=` 블록, 시뮬레이터 배치, 퀴즈 10개 이상, 결과와 이유, 흔한 오해)
- 주의사항: 40장까지만 전제(타이머 41장·이벤트 루프 42장·Promise 45장은 별도 개념). 6번 개념 내용은 "별도 개념"으로만
- 완료 조건: `npm test`·lint·format:check·typecheck 통과, 영어 인용 전부 표준 사본과 일치

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 완료 조건: 6절 명령 통과, 화면 확인 항목 확인

## 변경 이력

- 2026-11-04 (사용자 요청 — 외부 콘텐츠 검토 8건): 확인 후 7건 반영·1건 미반영 — 단계 1·3. ① `closest`가 `ul` 밖 조상까지 올라감(Chromium: `closest('[data-action]')`가 바깥 `SECTION`, `menu.contains` false), scoping root는 `:scope` 기준일 뿐 범위 제한 아님 → 위임 절에 `menu.contains(button)`·`'#menu button'` 안내 추가 ② `onclick = null` 뒤 재대입은 목록 끝에 들어감(Chromium `["리스너1","프로퍼티C","리스너2"]` 순서 확인) → 예제 7에 재대입·클릭 3줄 추가, 기대 출력 마지막 줄 `["리스너1","리스너2","프로퍼티C"]`(3회 동일), 본문·결과·퀴즈·흔한 오해 갱신 ③ 타깃 캡처 우선은 whatwg/dom 커밋 `9943801`(작성 2018-09-06, 반영 2019-03-01, 'Fix event path iteration', #685)부터 — 그 전 표준은 캡처 순회에서 타깃을 건너뛰고 버블 순회에서 타깃 리스너를 한꺼번에(등록 순서) 불렀음. 본문·단순화에 표준 변경만 쓰고 "Chrome 89" 같은 브라우저 시점은 근거 미확보라 쓰지 않음, 참고 링크에 커밋 추가 (계획 1절 ③의 "역사 서술은 쓰지 않는다"는 근거를 확보해 바꿈) ④ [미반영] 인용 어휘가 "struct"라는 지적 — 현재 표준은 커밋 `9b3a066`(2026-07-09, 'Editorial: name event path items and clarify target selection')에서 `item`·`pathItem`으로 바꿨고 본문 인용은 현재 원문과 일치 ⑤ focus()는 문서 포커스가 없으면 결과가 다를 수 있음 → 예제 5 설명과 단순화에 "확인하지 않았다"는 단서 추가 ⑥ `handleEvent` 설명과 객체 리스너의 this(Web IDL "Set thisArg to O") 한 줄·단순화 추가 ⑦ "card 캡처가 가장 먼저" → `window` 리스너 다음으로(예제 1 원리·예제 2 결과) ⑧ "캡처 단계 → 타깃 단계 → 버블링 단계" 3단계 설명과의 연결 문장 추가. 인용문 19개 표준 사본 대조 일치
- 2026-11-04 (사용자 요청 — 추가 외부 검토 4건): 3건 반영·1건 미반영 — 단계 3. ① [미반영, 두 번째] 인용 어휘 "struct" — 현재 dom.bs(최신 `3c53f93`, 2026-10-19)는 `Invoke with item`·`pathItem's invocation target`, 커밋 `9b3a066` 메시지가 struct에서 바꾼 이유를 설명 ② 핸들러/리스너 용어: 절 제목·예제 6 제목·흔한 오해·goals를 '리스너 안의 this'로 바꾸고, HTML 이벤트 핸들러 처리 단계 "with callback this value set to event's currentTarget" 인용으로 핸들러에도 같은 규칙임을 추가 ③ `window`가 경로에 드는 이유: DOM "A document's get the parent algorithm … returns null if event's type attribute value is "load" or document does not have a browsing context; otherwise the document's relevant global object." 인용 추가 ④ 예제 5 포커스 조건 문장을 결과 설명 뒤로 옮기고 한 문장으로 줄임. 인용문 21개 표준 사본 대조 일치

## 구현 진행

- baseline (2026-11-04, `143c043`): lint·format:check·typecheck 통과, `npm test` 110파일 3483개 통과. test:build·e2e는 `143c043` 커밋 직전 통과 기록(미재실행)
- [x] 1. 예제·meta·route — 예제 8개 초안과 동일(`diff -r`), references anchor 18개 표준 사본에서 확인(`fire-a-synthetic-pointer-event`는 webappapis.html). `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/event-propagation-delegation` 3회 연속 868개 통과. 음성 확인: `path-button` expectedOutput `save 캡처 2`→`3`이면 예제 실행 1건·시나리오 대조 3건 실패, 되돌림 확인
- [x] 2. 시나리오·시뮬레이터·View와 테스트 — `scenarios.ts`는 경로·리스너 설정에서 단계를 만드는 `buildSteps`(icon 16·button 13단계), `concept.test.ts`가 출력 줄 공식·composedPath·순회 순서·phase 규칙·capture 일치·리스너 1회 실행을 독립 검사. 서브에이전트 음성 확인(phase 규칙 뒤바꿈 9건, card fired 제거 6건 실패). lint·typecheck·prettier 통과
- [x] 3. 본문 — 서브에이전트 작성(퀴즈 12개, 흔한 오해 6개). MDX가 `{`를 표현식으로 읽어 `EventInit` 딕셔너리 인용을 `boolean bubbles = false;`로 줄임. 메인 검토 후 직접 수정: UI Events 표 행을 이어 붙인 인용 2개를 산문 + 원문 문장 인용("The focus event MUST fire before the dispatch of this event type. This event type is similar to focus, but does bubble.")으로 교체, 비활성화 인용 문장 사이 공백, "' / '로 이어 적었습니다" 삭제(해당 퀴즈 없음), `isTrusted` 문장을 "경로와 두 번의 순회 규칙은 isTrusted 값에 따라 달라지지 않습니다"로 좁힘, 예제 7의 "문서를 파싱할 때 활성화"를 HTML 어트리뷰트 변경 단계("Set eventHandler's value to the internal raw uncompiled handler … Activate an event handler")와 출력 순서로 설명하도록 변경. 인용문 19개 표준 사본 대조 일치
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 확인(개수 40·마지막 개념·html-attribute-dom-property 39/40 링크 2개·새 개념 40/40·a11y 페이지+시뮬레이터 7단계·responsive 페이지+16단계·빌드 describe·content-guide·로드맵 '진행 중'). 빌드 테스트의 `단계 1: 실행 전` 텍스트 검사 통과
- 화면(빌드 serve): 1280 라이트 아이콘 시나리오 8단계(타깃 도착, AT_TARGET), 375 다크 버튼 시나리오 7단계(타깃 캡처 리스너), JS 끔 첫 단계·`<details>` 12개, 문서 scrollWidth = 창 너비. 리스너 칩에 라벨과 '캡처'/'버블'·노드 이름이 겹쳐 보여(`캡처 window 캡처`) 칩을 라벨만 보이게 수정
- 리뷰 1차(critical-code-review, 메인 직접): Medium 1 — '디스패치 끝' 단계가 지나온 경로를 그대로 그려 이벤트가 경로를 아직 가진 것처럼 보임 → PathView에 "디스패치가 끝나 이벤트의 경로는 비워졌습니다(composedPath()는 빈 배열). 아래는 지나온 경로입니다." 문구 추가. Low 1 — "target은 디스패치 동안 바뀌지 않는다"에 그림자 트리 없는 경우라는 범위 추가. Critical/High 없음. 재검증: lint·format:check·typecheck 통과, `npm test` 113파일 3538개, `test:build` 326개, navigation 16개, 새 페이지 e2e 14개 통과
- 남은 항목: `reviewedAt: '2026-11-04'`은 사용자 콘텐츠 승인 전 값
- 외부 검토 반영 뒤 재검증: lint·format:check·typecheck 통과, `npm test` 3538개, `test:build` 326개, navigation 16개, 새 페이지 e2e 14개 통과
- 추가 외부 검토 반영 뒤 재검증: lint·format:check·typecheck 통과, `npm test` 3538개, `test:build` 326개, navigation 16개, 새 페이지 e2e 14개 통과

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(새 개념 폴더 1개, 예제 8개, 전파 시뮬레이터 아이콘 16단계·버튼 13단계, 고정 테스트·e2e·빌드 테스트·content-guide·로드맵). 공통 코드와 기존 개념 39개는 바꾸지 않았다.
- 달라진 점: 퀴즈 12개. 예제 7에 `onclick = null` 뒤 재대입·클릭을 더해 기대 출력이 5줄이 됐다(외부 검토 ②). 계획 1절 ③의 "타깃 캡처 우선의 역사는 쓰지 않는다"는 whatwg/dom 커밋 `9943801` 근거를 확보해 표준 변경 사실만 쓰는 것으로 바꿨다(브라우저별 시점은 쓰지 않음). 시뮬레이터 '디스패치 끝' 단계에 경로가 비워졌다는 문구를 더했다.
- 외부 검토 두 차례(8건·4건)를 Chromium·표준 원문·whatwg/dom 이력으로 확인해 반영했고, 인용 어휘 "struct" 지적은 현재 표준(`9b3a066` 이후 `item`·`pathItem`)과 맞지 않아 두 번 모두 반영하지 않았다(`변경 이력`).

### 코드 리뷰
- Medium 1('디스패치 끝' 단계의 경로 표시)·Low 1(target 불변 서술의 범위) 수정, 화면 확인에서 리스너 칩 중복 글자 수정. Critical/High 없음, 남긴 항목 없음.

### 후속 작업
- [ ] 38~42장 로드맵 6번 기본 동작과 전파 막기 — 이 페이지의 "다음 개념 '기본 동작과 전파 막기'" 문구를 그때 링크로 바꿀지 결정
- [ ] 기존 개념의 "별도 개념" 문구 역방향 링크(this-binding의 "이벤트 핸들러·타이머처럼 호스트가 this를 정하는 경우", html-attribute-dom-property의 reset 이벤트 등) — 사용자 결정대로 나중에 일괄 처리

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 시뮬레이터 단계를 손으로 나열하지 않고 경로·리스너 설정에서 만드는 `buildSteps`로 만들고, 테스트는 단계 상태를 Chromium 출력 줄(`${label} ${eventPhase} ${target} ${node}`)·`composedPath` 출력·순회 순서·capture 일치 규칙과 따로 대조한다 — 단계를 만드는 규칙과 검사가 같아 순환이 되지 않게, 리스너가 실행되는 단계는 실측 출력에 묶었다.
- [Claude 판단] 리스너가 없는 노드(body·html 등)도 시뮬레이터 단계로 보였다 — 표준의 경로는 리스너 유무와 상관없이 모든 조상을 담고, 타깃이 두 순회에서 모두 방문된다는 점을 보이려면 빈 방문도 필요하다.
- [Claude 판단] 외부 검토의 "struct" 인용 지적을 두 번 모두 반영하지 않았다 — 현재 dom.bs 원문과 커밋 `9b3a066` 메시지로 검토자의 기억이 옛 판임을 확인했다.
- [무검토 승인] 예제 7(`onclick` 어트리뷰트·프로퍼티·`addEventListener`)로 이벤트 핸들러가 활성화된 시점의 자리를 지킨다는 것을 보이고, 직전 개념(어트리뷰트와 프로퍼티)과 연결해 `onclick` IDL 어트리뷰트가 반영이 아니라고 설명했다.
- 타깃에서 캡처 리스너가 먼저인 이유를 등록 순서가 아니라 "캡처 순회가 버블 순회보다 먼저이고, 각 순회는 capture 값으로 리스너를 거른다"로 설명하고, 2019년 표준 변경 전에는 타깃에서 등록 순서였다는 사실을 커밋 근거로 덧붙였다(외부 검토 반영).

#### 배경지식
- DOM 디스패치: 경로(타깃 → … → document → window, get the parent로 만듦)를 만든 뒤 역순으로 캡처 순회, 순서대로 버블 순회. 타깃은 두 순회에서 모두 `AT_TARGET`(2), 나머지는 1·3. `bubbles`가 false면 버블 순회에서 타깃이 아닌 항목만 건너뜀.
- `currentTarget`은 방문 항목(invocation target), 리스너 콜백은 `currentTarget`을 this로 받음(Web IDL: 객체 리스너면 그 객체). 화살표 함수는 자기 this가 없음.
- 디스패치가 끝나면 `eventPhase` NONE·`currentTarget` null·경로 비움, `target`은 그림자 트리가 없으면 남음.
- HTML 이벤트 핸들러: 이름마다 값 하나, 활성화될 때 non-capture 리스너 하나를 목록에 넣고 그 뒤 대입은 값만 바꿈, null이면 리스너 제거.

#### 확인 질문
1. 버튼에 캡처 리스너와 버블 리스너를 둘 다 달면, 버튼을 직접 눌렀을 때와 버튼 안의 아이콘을 눌렀을 때 두 리스너의 `eventPhase`는 각각 무엇이고 왜 다른가?
   <details><summary>답</summary>직접 누르면 버튼이 타깃이라 두 방문 모두 2(AT_TARGET), 아이콘을 누르면 버튼은 타깃이 아니라 캡처 1·버블 3이다. 표준은 항목의 shadow-adjusted target이 non-null(타깃)인지로 AT_TARGET을 정한다(1절 ①③, 예제 1·2).</details>
2. 버블 리스너를 먼저 등록해도 타깃에서 캡처 리스너가 먼저 불리는 이유는? 2019년 이전 표준이었다면 결과는 어땠을까?
   <details><summary>답</summary>캡처 순회가 버블 순회보다 먼저이고, 캡처 순회에서는 capture가 true인 리스너만 부르기 때문이다. 옛 표준은 캡처 순회에서 타깃을 건너뛰고 버블 순회에서 타깃 리스너를 한꺼번에 불러 등록 순서(save 버블 → save 캡처)였다(변경 이력 ③, 커밋 9943801).</details>
3. 시뮬레이터 테스트가 `buildSteps`와 같은 규칙으로 단계를 다시 계산하기만 한다면 무엇을 놓치는가? 이 구현은 그것을 어떻게 막았나?
   <details><summary>답</summary>규칙 자체가 틀려도 테스트가 통과한다. 리스너가 실행되는 단계의 새 출력 줄을 Chromium 실측 expectedOutput과 대조하고, path를 예제 첫 출력(composedPath)과 대조해 실제 동작에 묶었다(구현 진행 단계 2, `concept.test.ts`).</details>
4. 위임 리스너에서 `e.target.closest('[data-action]')`를 쓰면 어떤 경우에 틀리는가? 어떻게 막는가?
   <details><summary>답</summary>closest는 문서의 가장 바깥 요소까지 올라가므로 목록 밖 조상에 data-action이 있으면 그 요소를 돌려준다. `menu.contains(found)`로 확인하거나 `'#menu [data-action]'`처럼 범위를 넣는다(변경 이력 ①, Chromium SECTION false).</details>
5. `onclick = f1` 뒤 `addEventListener(g)`, 다시 `onclick = f2`를 하면 실행 순서는? 중간에 `onclick = null`을 넣으면?
   <details><summary>답</summary>f2, g — 핸들러는 처음 활성화된 자리(g보다 앞)를 지키고 값만 f2로 바뀐다. null로 비활성화한 뒤 f2를 대입하면 새로 활성화되어 목록 끝에 들어가 g, f2(예제 7 마지막 줄, 1절 ⑦).</details>
