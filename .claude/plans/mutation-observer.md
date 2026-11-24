# MutationObserver 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-24
- 기준: `main` @ `2e2e9f7`

## 0. 요약
- 목적: "세 번 바꿨는데 콜백은 왜 한 번만 불릴까"를 묻는 `mutation-observer` 페이지를 추가한다(order 444, 학습 순서 71번째/78, browser). DOM 표준의 queue a mutation record·queue a mutation observer microtask·notify mutation observers로, 레코드는 관찰자마다 쌓이고 알림 마이크로태스크는 페이지(agent) 전체에서 직전 알림 뒤 첫 레코드 때 한 번 들어간다는 것, takeRecords·disconnect, 관찰 옵션, 여러 관찰자와 콜백 안의 변경을 Chromium 실행으로 보인다.
- 범위: 새 개념 폴더(browser 예제 8개, 비교표 7행, 퀴즈 8개, 시뮬레이터 없음)를 추가한다. microtask-queue의 "MutationObserver는 다루지 않음" 문장(본문·simplifications)을 연결한다. 71번째 이후 순위 +1 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: "MutationObserver가 프로미스보다 우선순위가 높다", "변경마다 콜백" 같은 틀린 모델을 본문이 오히려 심을 수 있다. 표준이 정하지 않은 렌더링 시점이나 성능을 주장할 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: HIGH 1·MEDIUM 2·LOW 2, Critic REVISE: HIGH 2·MEDIUM 6·LOW 4. 메인이 탐침 재실행과 표준 사본으로 재확인해 모두 반영했다. 예제 1·4·6·7을 고쳐 다시 실행했다)
- 미확정: 없음

## 1. 요구사항
- 사용자 결정(2026-11-24)
  - 범위 네 가지 모두: 묶음 호출과 순서(필수), takeRecords와 disconnect, 관찰 옵션, 여러 관찰자와 콜백 안 변경
  - 시각화: 표 + 퀴즈(시뮬레이터 없음)
- 메타(제안)
  - slug `mutation-observer`, title "MutationObserver: 세 번 바꿨는데 콜백은 왜 한 번만 불릴까"
  - category `async`(microtask-queue·request-animation-frame·promise-static-methods·fetch와 같은 묶음. 핵심이 콜백 시점이라 browser보다 async), order 444(promise-static-methods 442와 fetch 445 사이)
  - summary(141자): "DOM을 세 번 바꿔도 MutationObserver 콜백은 레코드 3개를 담아 한 번 불립니다. 알림 마이크로태스크가 큐에 들어가는 때가 정하는 순서, takeRecords·disconnect, 관찰 옵션, 여러 관찰자와 콜백 안의 변경을 확인합니다."
  - tags: `MutationObserver`, `MutationRecord`, `takeRecords`, `disconnect`, `마이크로태스크`, `DOM 변경 감지`
  - goals
    1. 동기 코드에서 여러 번 바꾼 변경이 레코드 여러 개를 담은 콜백 한 번으로 전달되는 이유를 DOM 표준의 레코드 큐와 mutation observer microtask queued 플래그로 설명할 수 있다.
    2. 콜백이 then보다 먼저인지 나중인지는 우선순위가 아니라, 직전 알림 뒤 어느 관찰자에게든 첫 레코드가 생겨 알림 마이크로태스크가 큐에 들어간 때로 정해진다는 것을 예제로 설명할 수 있다.
    3. takeRecords와 disconnect가 레코드 큐를 비우고, 알릴 레코드가 없는 관찰자의 콜백은 불리지 않는다는 것을 설명할 수 있다.
    4. childList·attributes·subtree 옵션에 따라 어떤 변경이 레코드가 되는지와 옵션 규칙(childList·attributes·characterData 중 true가 하나도 없으면 TypeError, attributes가 없을 때 attributeOldValue가 있으면 attributes를 켬)을 예측할 수 있다.
    5. 관찰자 여럿이 알림 마이크로태스크 하나에서 생성 순서대로 불리고 콜백 예외는 보고된 뒤 다음 관찰자가 불린다는 것, 관찰자가 하나일 때 콜백 안의 변경은 새 알림 마이크로태스크로 큐 뒤에 들어간다는 것을 설명할 수 있다.
  - prerequisites: microtask-queue, dom-manipulation, html-attribute-dom-property, event-loop
  - related: promise, timers, uncaught-exceptions, dom-tree-nodes
  - references: DOM 표준 §4.3(`#mutation-observers`), `#queue-a-mutation-observer-compound-microtask`, `#notify-mutation-observers`, `#queue-a-mutation-record`, `#dom-mutationobserver-observe`, `#dom-mutationobserver-takerecords`, `#dom-mutationobserver-disconnect`, `#concept-element-attributes-change`(구현 1단계에서 앵커 존재를 사본으로 확인, 없으면 빼고 기록), HTML perform a microtask checkpoint, Web IDL invoke(report), MDN MutationObserver·MutationRecord(URL 200 확인)
  - simplifications(초안, 구현 때 문장 다듬기)
    1. 예제 출력은 Chromium 실행값이며 다른 브라우저는 확인하지 않았다. MutationObserver와 console.log는 ECMAScript가 아니라 호스트(DOM 표준·브라우저) API다.
    2. 표준의 similar-origin window agent(알림 플래그와 대기 관찰자 목록을 하나씩 가짐)를 이 페이지에서는 "페이지"로 단순화한다.
    3. 레코드 없이 알림 마이크로태스크를 넣는 경로(subtree로 관찰하던 노드를 제거·이동할 때의 임시 등록 관찰자, slot 변경 신호)와 slotchange 이벤트는 다루지 않는다.
    4. characterData·characterDataOldValue·attributeFilter·attributeNamespace는 다루지 않는다.
    5. 예제 4에서 알림 마이크로태스크 자체는 실행되지만 레코드가 비어 콜백을 부르지 않는다는 것은 표준 서술이며 출력으로는 관찰할 수 없다.
    6. 관찰자가 여럿일 때 앞 관찰자의 콜백이 만든 레코드는, 이번 알림에서 아직 차례가 오지 않은 관찰자라면 같은 알림에서 받는다(표준 서술). 이 페이지의 예제는 관찰자가 하나인 경우만 보인다.
    7. 예제 7의 전역 error 이벤트와 preventDefault는 잡히지 않은 예외 개념에서 다룬다. 이 사이트의 실행기가 취소되지 않은 예외를 실패로 처리하므로 예제가 preventDefault를 부른다.
    8. 알림 단계는 현재 판 DOM 표준(대기 관찰자 목록을 생성 번호로 정렬)으로 설명한다.
    9. 렌더링과의 시점, 성능, 폐기된 Mutation Events는 다루지 않는다.
  - title·summary·tags·goals에 백틱과 "객체"를 쓰지 않는다("객체" 검색 결과 19개 유지).
- 예제(모두 `runtime: 'browser'`, `.html`, 원본은 scratchpad `mo/*.html`, 실행기로 3회씩 같은 출력 확인)
  1. `batch.html` → `동기 코드 끝 4 / 콜백 1 레코드 3` (타이머는 넣지 않는다: 서로 다른 태스크 소스의 순서를 표준이 정하지 않아 타이머 앞이라는 것이 마이크로태스크의 증거가 되지 않는다. 마이크로태스크의 증거는 예제 2)
  2. `order.html`(script 요소 두 개, 같은 관찰자) → `스크립트 1 끝 / 콜백 레코드 2 / then 1 / 스크립트 2 끝 / then 2 / 콜백 레코드 2`
  3. `take-records.html` → `꺼낸 레코드 2 / 동기 코드 끝 / 콜백 레코드 1 data-c`
  4. `no-callback.html`(first는 takeRecords로 모두 꺼냄, second는 disconnect 뒤 takeRecords로 남은 개수 출력) → `first에서 꺼낸 레코드 1 / second에 남은 레코드 0 / 동기 코드 끝 / then`
  5. `options.html`(childOnly: childList / withSubtree: childList·attributes·subtree) → `childList만 1 childList:list / subtree까지 4 attributes:list attributes:item childList:item childList:list`
  6. `option-rules.html`(빈 옵션, attributes: false와 attributeOldValue, attributeOldValue만, 같은 값 setAttribute) → `빈 옵션 TypeError / attributes false와 attributeOldValue TypeError / 레코드 3 [null,"1","2"]`
  7. `two-observers.html`(ul 두 개. A를 먼저 생성하고 B를 먼저 observe. B의 목록을 먼저 바꾸고, then을 등록한 뒤 A의 목록을 바꿈. A 콜백은 null.x로 던지고 error 리스너가 preventDefault) → `동기 코드 끝 / A 콜백 1 / error 이벤트 TypeError / B 콜백 1 / then`. A의 첫 레코드는 then 등록 뒤에 생겼는데 A가 then보다 먼저이므로 관찰자마다 마이크로태스크를 넣는 모델을 배제하고, B의 레코드·observe가 먼저인데 A가 먼저이므로 레코드 순서·observe 순서 모델을 배제한다(생성 순서). 예제 5도 같은 결과(withSubtree가 먼저 레코드를 받았지만 먼저 생성한 childOnly가 먼저 불림).
  8. `mutate-in-callback.html` → `콜백 1 레코드 1 / then / 콜백 2 레코드 1 / 콜백이 넣은 then`
- 본문 구조
  - 첫 문단(백틱 없음): 질문, 호스트 API(DOM 표준)라는 점, Chromium 실행값, microtask-queue 전제.
  - `## 동작 원리` h3 다섯 개
    1. 변경마다 레코드가 쌓이고 알림 마이크로태스크는 한 번 들어간다 — queue a mutation record(관심 있는 관찰자마다 레코드를 record queue에 넣고 pending mutation observers에 더한 뒤 queue a mutation observer microtask). 알림 플래그는 관찰자마다가 아니라 페이지(agent)에 하나라서, 이미 true면 return. notify가 플래그를 false로 되돌리고, 관찰자 차례가 올 때 그 레코드 큐를 복제해 비운 뒤 콜백을 부른다(그래서 큐에 넣은 뒤 생긴 레코드도 함께 받는다). 예제 1.
    2. 콜백의 순서는 알림 마이크로태스크가 큐에 들어간 때가 정한다 — 예제 2. 같은 스크립트에서 then 1보다 먼저 실행되었으므로 태스크가 아니라 마이크로태스크다. 스크립트 2에서는 then 2가 먼저이므로 우선순위 모델 배제. 두 스크립트 사이 체크포인트는 microtask-queue 예제 5 링크.
    3. takeRecords와 disconnect는 레코드 큐를 비운다 — 예제 3·4(disconnect 뒤 takeRecords가 0). notify는 records가 비어 있으면 콜백을 부르지 않는다(이미 큐에 들어간 마이크로태스크 자체는 실행되지만 관찰되지 않으므로 표준 서술로만 쓴다).
    4. 옵션이 어떤 변경을 레코드로 만들지 정한다 — 예제 5·6. 조상까지 올라가며 subtree가 false면 target만, childList는 자식 목록 변경, 텍스트 노드 추가도 childList. observe 단계: attributeOldValue나 attributeFilter가 "있고" attributes가 "없으면" attributes를 true로 채운다(있는지만 보므로 attributeOldValue: false도 해당, attributes: false와 함께 쓰면 TypeError). childList·attributes·characterData 중 true가 하나도 없으면 TypeError(false로 준 것도 해당). "있으면"과 "true면"을 구분해 쓴다. 같은 값 setAttribute도 레코드(setAttribute → change an attribute → handle attribute changes가 값 비교 없이 queue a mutation record).
    5. 관찰자 여럿은 한 알림 마이크로태스크에서 불린다 — 예제 7(예제 5도 같은 결과). notify가 pending mutation observers를 creation index(생성 순서) 순으로 정렬해 차례로 부른다. 콜백 예외는 Web IDL invoke의 "report"로 보고되어 전역 error 이벤트가 되고 다음 관찰자를 부른다([잡히지 않은 예외](/concepts/uncaught-exceptions) 링크). 같은 마이크로태스크라도 then 콜백의 예외는 거부가 된다는 대비 한 줄. 예제 8(관찰자 하나): notify가 시작할 때 플래그를 false로 되돌렸으므로 콜백 안의 변경은 새 알림 마이크로태스크를 큐 끝에 넣고, 그 앞에 있던 then이 먼저 실행된다. 관찰자가 여럿일 때 아직 차례가 오지 않은 관찰자는 같은 알림에서 받는다는 점은 simplifications 6.
  - `## 예제` 예제 8개와 퀴즈 8개, `## 결과와 이유` 예제별 h3, 비교표(7행), 흔한 오해 2개("콜백은 변경마다 불린다", "MutationObserver 콜백은 프로미스보다 먼저 실행된다").
- 비교표(JSX `<table>`, region div, 열: 상황 | 콜백이 불리는 때 | 받는 레코드 | 근거)
  1. 동기 코드에서 세 번 추가 | 동기 코드가 끝난 뒤 한 번 | 3개 | 예제 1
  2. 첫 변경 뒤에 then을 등록 | then보다 먼저 | 알림 때까지 쌓인 2개(then 등록 뒤 변경 포함) | 예제 2
  3. 첫 변경 앞에 then을 등록 | then 다음 | 2개 | 예제 2
  4. takeRecords로 일부를 꺼냄 | 마이크로태스크에서 | 꺼낸 뒤 생긴 1개 | 예제 3
  5. 모두 꺼내거나 disconnect | 불리지 않음 | 없음 | 예제 4
  6. 관찰자 둘 | 한 알림 마이크로태스크에서 생성 순서대로(한 관찰자의 첫 레코드가 then 등록 뒤여도 then보다 먼저) | 관찰자마다 1개 | 예제 7
  7. 관찰자 하나의 콜백 안에서 다시 변경 | 그때 들어간 새 알림 마이크로태스크에서(이미 큐에 있던 then 다음) | 1개 | 예제 8
- 퀴즈(정답 = expectedOutput, 오답은 손 계산하고 concept.test에 오답마다 모델을 주석으로 남김, 정답 위치 2·0·3·1·2·0·1·3)
  1. 선택지 4: (a) 변경마다 동기 호출 `콜백 1 레코드 1 / 콜백 2 레코드 1 / 콜백 3 레코드 1 / 동기 코드 끝 4` (b) 변경마다 마이크로태스크 `동기 코드 끝 4 / 콜백 1 레코드 1 / 콜백 2 레코드 1 / 콜백 3 레코드 1` (c) 정답 (d) 큐에 넣을 때 레코드를 고정 `동기 코드 끝 4 / 콜백 1 레코드 1`
  2. 선택지 4: (a) 정답 (b) 우선순위 모델 `스크립트 1 끝 / 콜백 레코드 2 / then 1 / 스크립트 2 끝 / 콜백 레코드 2 / then 2` (c) 마지막 변경 때 큐에 넣음(또는 프로미스 우선) `스크립트 1 끝 / then 1 / 콜백 레코드 2 / 스크립트 2 끝 / then 2 / 콜백 레코드 2` (d) 변경마다 마이크로태스크 `스크립트 1 끝 / 콜백 레코드 1 / then 1 / 콜백 레코드 1 / 스크립트 2 끝 / then 2 / 콜백 레코드 1 / 콜백 레코드 1`
  3. 선택지 4: (a) 꺼내도 복사만 `꺼낸 레코드 2 / 동기 코드 끝 / 콜백 레코드 3 data-a` (b) 꺼내면 콜백 취소 `꺼낸 레코드 2 / 동기 코드 끝` (c) 레코드는 나중에 만들어짐 `꺼낸 레코드 0 / 동기 코드 끝 / 콜백 레코드 3 data-a` (d) 정답
  4. 선택지 4: (a) takeRecords로 비워도 빈 배열로 부름(disconnect한 관찰자는 부르지 않음) `first에서 꺼낸 레코드 1 / second에 남은 레코드 0 / 동기 코드 끝 / first 콜백 0 / then` (b) 정답 (c) disconnect는 콜백만 멈추고 레코드는 남김 `first에서 꺼낸 레코드 1 / second에 남은 레코드 1 / 동기 코드 끝 / then` (d) disconnect는 앞으로의 관찰만 멈추고 쌓인 레코드는 전달 `first에서 꺼낸 레코드 1 / second에 남은 레코드 1 / 동기 코드 끝 / second 콜백 1 / then`
  5. 선택지 4: (a) childList가 자손도 봄 `childList만 2 childList:item childList:list / subtree까지 4 attributes:list attributes:item childList:item childList:list` (b) subtree는 자손만 봄 `childList만 1 childList:list / subtree까지 2 attributes:item childList:item` (c) 정답 (d) 텍스트 노드 추가는 childList가 아님 `childList만 1 childList:list / subtree까지 3 attributes:list attributes:item childList:list`
  6. 선택지 4: (a) 정답 (b) 빈 옵션 허용 `attributes false와 attributeOldValue TypeError / 레코드 3 [null,"1","2"]` (c) attributeOldValue만으로는 attributes가 켜지지 않음(셋째 observe가 TypeError로 던져 스크립트가 멈춤, 해설에 밝힘) `빈 옵션 TypeError / attributes false와 attributeOldValue TypeError` (d) 같은 값은 기록 안 함 `빈 옵션 TypeError / attributes false와 attributeOldValue TypeError / 레코드 2 [null,"1"]`
  7. 선택지 4: (a) 관찰자마다 자기 첫 레코드 때 마이크로태스크 `동기 코드 끝 / B 콜백 1 / then / A 콜백 1 / error 이벤트 TypeError` (b) 정답 (c) 마이크로태스크는 하나지만 레코드가 생긴 순서(또는 observe 순서)로 부름 `동기 코드 끝 / B 콜백 1 / A 콜백 1 / error 이벤트 TypeError / then` (d) 콜백 예외가 다음 관찰자를 막음 `동기 코드 끝 / A 콜백 1 / error 이벤트 TypeError / then`
  8. 선택지 4: (a) 같은 마이크로태스크에서 곧바로 다시 알림 `콜백 1 레코드 1 / 콜백 2 레코드 1 / then / 콜백이 넣은 then` (b) 콜백 안 변경은 무시 `콜백 1 레코드 1 / then / 콜백이 넣은 then` (c) 콜백이 끝난 뒤 큐에 넣음 `콜백 1 레코드 1 / then / 콜백이 넣은 then / 콜백 2 레코드 1` (d) 정답
- 유지: 공통 코드, microtask-queue의 다른 문장과 reviewedAt.
- 제외: characterData·characterDataOldValue·attributeFilter·attributeNamespace 예제, 관찰 대상에서 빠진 노드(transient registered observer), slotchange·signal slot, 렌더링 시점·성능, MutationEvent(폐기된 동기 이벤트), Node.js(jsdom), 다른 브라우저.

## 2. 사실과 추정

### 사실 (코드·표준·실행에서 확인)
- 기존 서술: MutationObserver를 언급하는 곳은 `microtask-queue/content.mdx:124`("렌더링 갱신과 `MutationObserver`도 다루지 않습니다.")와 `microtask-queue/meta.ts:112`("렌더링 갱신과 MutationObserver는 다루지 않습니다. requestAnimationFrame은 …")뿐이다(`grep -rn MutationObserver app/concepts`). 이 둘을 테스트가 고정하지 않는다(grep tests 0건).
- 학습 순서: order 444보다 작은 개념은 70개(promise-static-methods 442가 70번째). 새 페이지 71번째, fetch 72, …, uncaught-exceptions 76, async-generator 77, es-modules 78. 총 78.
- 순서 고정 테스트
  - `app/lib/concepts.test.ts:104,111-112`(total 77, 마지막 position 77)
  - `app/components/concept/ConceptPager.test.tsx:18,28`(`/ 77`, `77 / 77`)
  - `tests/e2e/navigation.spec.ts`: 90 카드 수, 98 `77번째`, 156 article 수, `학습 순서 N / 77` 전부 `/ 78`(N≥71이면 +1, 763 fetch 71→72 등), "객체" 순위 배열의 `'72'`→`'73'`(19개 유지), 756 promise-static-methods의 다음 링크(`/concepts/fetch` → 새 slug), 767 fetch의 이전 링크(`/concepts/promise-static-methods` → 새 slug), 새 pager 블록(71 / 78, 이전 promise-static-methods, 다음 fetch).
  - `tests/e2e/responsive.spec.ts:1840`(article 77)
- 등록 선례: `tests/e2e/helpers.ts:70`(UNCAUGHT_EXCEPTIONS_PATH), `a11y.spec.ts:59`·`:916`, `responsive.spec.ts:68`·`:1533`, `tests/build/build-output.test.ts:1495`, `docs/content-guide.md:225`.
- 검색 대상은 title·summary·tags(`app/lib/concepts.ts:94-98`).
- 필수 h2: 동작 원리·예제·결과와 이유(`tests/content-integrity.test.ts:23`).
- DOM 표준(2026-11-24 dom.spec.whatwg.org 현재 판 사본)
  - §4.3: similar-origin window agent는 mutation observer microtask queued(boolean, 처음 false), pending mutation observers(set), mutation observer counter를 가진다.
  - queue a mutation observer microtask: 플래그가 true면 return, true로 바꾸고 "Queue a microtask to notify mutation observers."
  - notify mutation observers: 플래그를 false로, notifyList = pending mutation observers를 creation index 오름차순 정렬, pending을 비움, 각 mo에 대해 records = record queue 복제, record queue 비움, transient 제거, "If records is not empty, then invoke mo's callback with « records, mo » and "report", and with callback this value mo." 그 뒤 slotchange.
  - 생성자: creation index = agent의 counter, counter +1.
  - queue a mutation record: target의 inclusive ancestors를 돌며 옵션 조건(node가 target이 아니고 subtree false, attributes 없음, attributeFilter 불일치, characterData 없음, childList false)이 하나도 참이 아닌 관찰자를 모은다. attributeOldValue면 oldValue. 관찰자마다 레코드를 record queue에 넣고 pending mutation observers에 더한 뒤 queue a mutation observer microtask.
  - observe: attributeOldValue 또는 attributeFilter가 있고 attributes가 없으면 attributes true. characterDataOldValue도 같다. 셋 다 true가 아니면 TypeError.
  - takeRecords: record queue 복제 반환, 비움. disconnect: 등록 관찰자 제거, node list 비움, record queue 비움.
- 실행(저장소 브라우저 실행기, Chromium, 탐침과 예제 초안)
  - 예제 8개 초안: 1절 출력과 같음(각 3회, 예제 1·4·6·7은 리뷰 반영판으로 다시 3회).
  - 리뷰 탐침(메인 재실행): p1(A 목록 변경, then X, B 목록 변경) `sync / A 1 / B 1 / X`, p2(B를 먼저 observe·변경) `A 1 / B 1`, p3(A·B가 같은 목록 관찰, A가 첫 콜백에서 변경) `A 1 1 / B 2 / A 2 1 / then-in-A`, p4(disconnect 직후 takeRecords 0, 변경→disconnect→다시 observe면 콜백 없음) `after disconnect take 0 / sync`, p5 `{childList:false}` TypeError, `{attributes:false, attributeOldValue:true}` TypeError, `{attributeOldValue:false}` ok, `{attributeFilter:['x']}` ok.
  - 탐침: orderBefore(then을 첫 변경 앞에 등록) `sync end / then / mo 2`, queueMicrotask를 앞에 넣어도 `qm / mo 1`, takeAll 뒤 `then / timeout`(콜백 없음), disconnect 뒤 `then`만, 같은 값 setAttribute 3번 `cb 3 [null,"1","2"]`, `observe(body, {})` TypeError, `{ attributeOldValue: true }`만 주면 오류 없음.

- 같은 값 setAttribute: setAttribute는 어트리뷰트가 있으면 "change an attribute to verifiedValue", change an attribute는 값을 바꾼 뒤 handle attribute changes, 거기서 값 비교 없이 queue a mutation record(사본 확인).

### 추정
- 없음

## 3. 구현 전략
- uncaught-exceptions·automatic-semicolon-insertion과 같은 표+퀴즈 구조. 예제는 모두 browser 런타임 `.html`. 출력은 원시 값과 문자열만(레코드 객체를 직접 출력하지 않음).
- 비교표는 산문 칸이라 하드코딩 비교 + 행마다 근거 예제 출력 단언(concept.test).
- 퀴즈 오답은 브라우저 동작이라 소스 치환 실행을 하지 않고 오해 모델과 손 계산 출력을 concept.test에 하드코딩한다.
- 버린 대안: 단계 시뮬레이터(사용자가 표+퀴즈 선택), category browser(핵심이 콜백 시점이라 async 묶음이 이웃 개념과 맞음), 예제 9개(takeRecords 모두 꺼냄과 disconnect를 한 예제로 묶음), 예제 1의 타이머 비교(표준이 태스크 소스 사이 순서를 정하지 않아 증거가 되지 않음).

## 4. 변경 파일
- 추가: `app/concepts/mutation-observer/` — `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `examples/*.html` 8개. 계획 문서.
- 수정(로직, reviewedAt 그대로)
  - `microtask-queue/content.mdx:124`: "렌더링 갱신은 다루지 않습니다. `MutationObserver`가 관찰자에게 알리는 마이크로태스크를 언제 큐에 넣는지는 [MutationObserver](/concepts/mutation-observer)에서 다룹니다."처럼 쓴다.
  - `microtask-queue/meta.ts:112`: "렌더링 갱신은 다루지 않습니다. MutationObserver는 MutationObserver 개념에서 다룹니다. requestAnimationFrame은 requestAnimationFrame 개념에서 다룹니다." related에 새 slug.
- 수정(기계적): `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`.
- 변경하지 않음: 공통 코드, uncaught-exceptions(예제 7은 링크만 받음, 그 페이지가 MutationObserver를 미뤄 둔 문장이 없음), dom-manipulation(미뤄 둔 문장 없음).
- finalize 때: 로드맵 문서 4번 행 상태와 진행 기록 갱신.

## 5. 위험 요소
- 우선순위 모델을 심는 문장("MutationObserver는 마이크로태스크라 then보다 먼저"). 막는 곳: 본문 금지 grep(`우선순위가 높`, `먼저 실행된다`의 단정 문맥 검토), 예제 2의 두 번째 스크립트.
- "첫 레코드"를 관찰자별로 읽히게 쓰는 것. 막는 곳: 본문의 "첫 레코드"마다 "어느 관찰자든 직전 알림 뒤" 뜻이 드러나는지 메인이 읽음, 예제 7.
- 콜백 안 변경을 관찰자 수와 무관하게 일반화. 막는 곳: 본문은 "관찰자가 하나일 때"로 한정, simplifications 6.
- 옵션 규칙의 "있으면/true면" 혼동. 막는 곳: grep `셋 다 없` 0건, 4번 h3 문장 검토.
- 렌더링·성능 단정("화면에 그리기 전에", "효율적"). 막는 곳: grep `렌더링|그리기 전|성능|효율` 결과를 메인이 읽어 범위 밖 주장 0건.
- 표준 판 차이: 예전 판은 notify가 agent의 모든 mutation observers를 복제했다. 현재 판은 pending mutation observers를 creation index로 정렬한다. 본문은 현재 판으로 쓰고 관찰 가능한 결과(생성 순서)만 단정한다.
- example 4: 콜백이 불리지 않는 것은 관찰되지만 "마이크로태스크는 실행된다"는 관찰 불가 → 표준 서술로만, simplifications에 밝힘.
- 예제 7의 pageerror: error 리스너에서 preventDefault. 전역 error 이벤트는 뒤 개념(472)이므로 본문 링크·related·simplifications 7.
- 첫 문단 백틱, MDX 함정(`{`, `<`, 속성 큰따옴표, explanation의 `"`), 표 칸 `<`, 퀴즈 선택지의 `"`(예제 6 출력의 `"1"`이 JSX 문자열에 들어감 — 작은따옴표 문자열 안이라 가능한지 확인).
- 순서 삽입 누락. 막는 곳: `grep -rnE "/ 77|toBe\(77\)|toHaveCount\(77\)|77번째" app tests` 0건, promise-static-methods·fetch 이웃 링크, "객체" 순위 `'73'`.

## 6. 검증 방법
- 정적(저장소 루트): `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "mutation-observer|MutationObserver|홈 학습 순서 보기"`(a11y 케이스 이름 "개념 페이지: MutationObserver")
- 브라우저(개발 서버 재시작 후 `/concepts/mutation-observer`): 첫 문단, 표 7행, 퀴즈 8개 렌더와 한 개 정답 피드백, "학습 순서 71 / 78"과 이전(promise-static-methods)·다음(fetch), 375px 가로 스크롤 없음, microtask-queue의 새 링크.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 메타·예제·표준 확인
- 대상: `meta.ts`, `examples/*.html` 8개(scratchpad 원본 복사), `route.tsx`
- 변경: 1절 메타(simplifications 9개, references 앵커는 표준 사본으로 존재 확인)와 예제.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과. title·summary·goals·tags에 백틱·"객체" 없음, summary 160자 이하.
### 2. 본문
- 대상: `content.mdx`
- 완료 조건: `npm test` 통과, 첫 평문 줄 백틱 없음, 5절 grep 검토, explanation에 `"`·`\` 없음.
### 3. concept.test
- 대상: `concept.test.ts`
- 변경: 퀴즈(정답 = expectedOutput, 선택지 수 모두 4, 오답 = 1절 목록과 모델 주석, 정답 위치 2·0·3·1·2·0·1·3), 비교표(행·칸 하드코딩, 행마다 근거 예제 출력 단언: 예제 1 콜백 한 줄·레코드 3, 예제 2 스크립트 1의 콜백이 then 1 앞이고 스크립트 2의 then 2가 콜백 앞, 예제 3 콜백 레코드 1, 예제 4에 `콜백` 없음·`second에 남은 레코드 0`, 예제 7 `A 콜백 1`이 `then` 앞이고 `B 콜백 1`이 `A 콜백 1` 뒤, 예제 8 `then`이 `콜백 2` 앞), 메타 조건("객체" 없음, order 444, summary 160자 이하).
- 완료 조건: 테스트 통과. 표 칸 하나와 퀴즈 정답 하나를 일부러 바꾸면 실패하는 것을 확인한 뒤 되돌린다.
### 4. 연결과 순서 테스트
- 대상: microtask-queue 문구·related, content-guide, 4절의 기계적 수정 파일
- 완료 조건: 77 grep 0건, `npm run typecheck`·`npm test`·`npm run test:build` 통과.
### 5. 전체 검증
- 완료 조건: 6절 명령 통과, 브라우저 시나리오 확인.

## 변경 이력
- 2026-11-24 (리뷰 지적, 메인 리뷰 + Opus 명세 교차 검토): 다음을 고쳤다. 요구사항 범위 안의 리뷰 수정이라 재승인 없이 진행했다. 영향 단계 1·2·3.
  - [HIGH] 관찰자가 여럿일 때 콜백 안 변경: "아직 차례가 오지 않은 관찰자는 같은 알림에서 받는다"를 "알림 시작 때 정해 둔 목록에 든 관찰자만, 목록에 없던 관찰자는 새 알림 마이크로태스크"로 한정(본문 h3 1·5, simplifications 6). 탐침 `A 1 / then / B 1`(A의 콜백이 B만 관찰하는 목록을 바꿈).
  - [HIGH, 프로젝트 기준] 표준 판 이력: 2023-06~2026-06 Review Draft는 notifySet = pending 복제(레코드를 먼저 받은 순서)였다. simplifications 8과 본문 h3 5·예제 7 결과에 밝힘. 퀴즈 7 (c)는 현재 판·Chromium 기준 오답으로 유지.
  - [HIGH, 프로젝트 기준] 예제 6 퀴즈 해설 "모두 true가 아니면"을 "하나도 없으면"으로(메인 리뷰).
  - [MEDIUM] 예제 4 퀴즈 오답 (d)가 자기 모델과 맞지 않아 "큐에 넣을 때 레코드가 고정되어 꺼낸 레코드도 콜백에 간다" 모델(`… / second에 남은 레코드 0 / 동기 코드 끝 / first 콜백 1 / then`)로 교체, 결과 문단 배제 모델 문장 갱신.
  - [MEDIUM] "attributes 옵션이 있어야"를 "attributes가 true여야"로. summary에 "동기 코드에서" 조건(149자).
  - [LOW] 옵션 규칙 개수(세 가지, 나머지 다루지 않음), "직전 알림이 시작된 뒤"(본문·goals 2·오해 박스), 인용 세 문장의 반복 단계 설명, agent를 페이지로 단순화한다고 본문 괄호에 밝힘, setAttribute 경로(handle attribute changes, 첫 설정은 append 경로), 표 5·6행 조건(새 레코드 없음, 한쪽 레코드는 then 앞), 예제 1 결과의 record queue 소유자(관찰자), h3 5의 예제 5 문장 위치.

- 2026-11-24 (사용자 검토): 다음을 고친다. 사용자 요청을 그대로 반영하는 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3.
  - [중간] 예제 6 둘째 시도를 `{ childList: true, attributes: false, attributeOldValue: true }`로 바꿔 셋째 규칙만의 증거로 만든다(이전 옵션은 "true가 하나도 없음" 검사가 먼저 걸림). 출력 문자열은 같다. 본문 h3 4·예제 6 머리말·결과 문단, concept.test에 파일 단언 추가.
  - [중간] h3 1에 "If interestedObservers is empty, then return." 단계를 인용하고, 관찰하지 않는 노드의 변경은 마이크로태스크를 넣지 않는다고 쓴다. simplifications 8에 예전 판(관찰자 없는 변경도 마이크로태스크를 넣음) 차이를 더한다.
  - [낮음] 연혁을 "2023년 6월부터 2026년 6월까지의 Review Draft"로(그 앞 판은 생성된 관찰자 전체를 생성 순서로 돎). 여러 관찰자 분류에 "이미 차례가 지났거나(자신 포함)" 추가. 예제 1 설명에 호출 수와 레코드 수가 다를 수 있다는 문장. "then이 반환한 프로미스가 거부됩니다".

## 구현 진행

- baseline (2026-11-24, `2e2e9f7`): lint 통과, format:check 통과, typecheck 통과, npm test 191파일 6222개 통과, test:build 612개(직전 커밋 검증값)
- [x] 1·2·3. 새 개념 폴더(meta·예제 8개·route·본문·concept.test)와 build-output 등록 — Sonnet 구현. 메인 확인: 예제 8개가 scratchpad 원본과 바이트 동일(cmp), meta(summary 141자, simplifications 9개, references 앵커는 DOM 사본에 존재), 본문 전체 정독 후 두 곳 직접 수정(예제 1 결과의 "`list`의 record queue"를 "관찰자의 record queue"로 — record queue는 관찰자의 것, h3 5에서 예제 5 문장을 예외 문단 뒤에서 생성 순서 문단 끝으로 옮김). Sonnet 보고: 변이 검사(표 칸·퀴즈 answer 변경 시 3개 실패 후 원복), 위험 grep 0건, MDN 2개 200. 계획과 다른 점: 표준 사본의 observe 단계에 "attributeOldValue가 true인데 attributes가 false면 TypeError" 규칙이 따로 있어 본문 h3 4에 넣음(예제 6 둘째 줄이 이 경우).
- [x] 4. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(microtask-queue 본문 124·simplifications·related는 slug 문자열 배열, `/ 78`, "객체" 순위 '73', 새 pager 블록 71 / 78, fetch 이전 링크). 77 grep 0건.
- [x] 5. 전체 검증 (2026-11-24) — lint·format:check·typecheck 통과, npm test 192파일 6279개 통과(baseline 6222), test:build 620개 통과, e2e navigation 16개·관련 8개 통과. 브라우저(dev 5173 재시작): 학습 순서 71 / 78·이전 promise-static-methods·다음 fetch, 표 7행, 퀴즈 8개(정답 확인 버튼 8개), 예제 7 정답 선택 후 "정답입니다.", 콘솔 오류 없음, 375px에서 페이지 가로 스크롤 없음(표 영역 안에서만 343→427), microtask-queue 본문의 새 링크 렌더.
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토, 2026-11-24): 메인 High 1(예제 6 해설)·Low 2, Opus HIGH 1·MEDIUM 4·LOW 6 → 모두 고침(변경 이력). 메인 확인: HIGH 1 탐침 `A 1 / then / B 1` 2회, olddom rd-2023-06~2026-06의 notify 문구 "Let notifySet be a clone of the surrounding agent's pending mutation observers". 수정은 메인이 직접(본문·meta·concept.test 문자열).
  - 재검증: lint·format:check·typecheck 통과, npm test 192파일 6279개, test:build 620개, e2e 새 페이지 관련 6개 통과. dev 서버에서 바뀐 문장 9곳 렌더와 표 7행 확인. 수정 범위 재리뷰: 새 High 없음.
- 사용자 검토(2026-11-24): 중간 2·낮음 4 모두 반영(변경 이력). 메인 탐침(Chromium 실행기): rule3 `{childList:true, attributes:false, attributeOldValue:true}` → `err TypeError`, 관찰하지 않는 변경→then→관찰하는 변경 `then / 콜백 1`, `list.append(a,b,c)` `레코드 1 3`, 관찰 중인 다른 부모에서 옮김 `레코드 2 other:0/1 list:1/0`. 표준 사본: rd-2022-06·2022-12 notify는 "clone of the surrounding agent's mutation observers", rd-2023-06~2026-06은 pending 복제, 현재 판만 "If interestedObservers is empty, then return."이 있음. 수정은 메인이 직접.
  - 재검증: lint·format:check·typecheck 통과, npm test 192파일 6280개, test:build 620개, e2e 새 페이지 관련 6개 통과. dev 서버에서 바뀐 문장 7곳 렌더, 옛 연혁 문구 0건, 콘솔 오류 없음.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(browser 예제 8개·퀴즈 8개·비교표 7행·흔한 오해 2개, 시뮬레이터 없음, order 444·학습 순서 71/78, category async, microtask-queue 본문·simplifications·related 연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것: 표준 사본의 observe 단계에서 셋째 TypeError 규칙(attributeOldValue true인데 attributes false)을 찾아 본문 옵션 절에 넣었다. Opus 리뷰로 관찰자 여럿일 때 콜백 안 변경 조건(알림 시작 때 정한 목록)과 표준 판 이력을 밝혔다. 사용자 검토로 예제 6 둘째 시도를 셋째 규칙만 걸리는 옵션으로 바꿨고(출력 동일), interestedObservers가 비면 끝나는 단계, 연혁 2023-06~2026-06, 이미 차례가 지난 관찰자, 호출 수와 레코드 수, then이 반환한 프로미스를 반영했다. reviewedAt은 사용자 결정으로 2026-11-24를 기록했고, microtask-queue는 그대로 뒀다.

### 코드 리뷰
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토): 메인 High 1·Low 2, Opus HIGH 1·MEDIUM 4·LOW 6을 모두 고쳤다. 사용자 검토(중간 2·낮음 4)도 모두 반영했다.
- 고치지 않고 남긴 항목: 없음.

### 후속 작업
- [ ] 없음. 로드맵 4의 남은 개념(5번 Math)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 7에서 A를 먼저 만들고 B를 먼저 바꾼 뒤 then을 등록하고 A의 대상을 바꾼다 — "관찰자마다 마이크로태스크" 모델이면 B 콜백 → then → A 콜백이 되어야 하는데, 실제는 A·B 콜백이 then보다 먼저이고 생성 순서(A 먼저)다. 처음 설계는 이 모델을 배제하지 못해 계획 검토(Critic·Architect)에서 바꿨다.
- [Claude 판단] 생성 순서 호출을 현재 판 표준과 Chromium 기준으로 쓰고 퀴즈 7 (c)(레코드를 먼저 받은 순서)를 오답으로 뒀다 — 2023년 6월~2026년 6월 Review Draft는 그 순서였으므로 본문·예제 7 결과·simplifications 8에 판 차이를 밝혔다. 버린 대안: 판 차이가 있는 순서를 다루지 않기(예제 7의 핵심인 "한 알림 마이크로태스크"를 보이려면 두 관찰자의 순서가 출력에 드러나야 함).
- [Claude 판단] 콜백 안에서 일으킨 변경은 관찰자가 하나일 때로 한정했다 — 여럿이면 알림 시작 때 정한 목록에 아직 차례가 안 온 관찰자로 있느냐에 따라 같은 알림인지 새 알림인지 갈린다(Opus 탐침 `A 1 / then / B 1`). 그 조건은 문장과 simplifications 6으로만 밝혔다.
- [Claude 판단] 예제 1에서 setTimeout 비교를 뺐다 — 마이크로태스크와 태스크의 순서는 이벤트 루프 개념이 보이고, 콜백이 then보다 먼저인 것만으로 "마이크로태스크 하나"를 보인다(Critic 지적: 타이머만으로는 마이크로태스크라는 증거가 약함).
- [Claude 판단] category를 browser가 아니라 async로 정했다 — 핵심이 콜백이 언제 불리느냐라서 microtask-queue·event-loop 이웃 묶음과 맞다.
- [Claude 판단] 퀴즈 오답은 오해 모델을 손으로 계산해 고정했다 — 브라우저 동작이라 모델대로 소스를 바꿔 실행할 수 없다. 예제 4 (d)는 리뷰에서 자기 모델과 맞지 않는 것이 드러나 바꿨다.
- 다룰 범위 네 가지(묶음 호출과 순서, takeRecords와 disconnect, 관찰 옵션, 여러 관찰자와 콜백 안 변경)와 표+퀴즈 시각화, 예제 6 셋째 규칙 분리, interestedObservers 단계 인용, 연혁 날짜, 이미 차례가 지난 관찰자, 호출 수와 레코드 수 — 사용자가 고르거나 검토로 고쳤다.

#### 배경지식
- DOM queue a mutation record: 관심 있는 관찰자를 모으고, 없으면 끝낸다(현재 판). 관찰자마다 record queue에 레코드를 넣고 pending mutation observers에 더한 뒤, 반복이 끝나면 queue a mutation observer microtask를 한 번 부른다. 레코드는 이 단계가 불린 횟수만큼 생기므로 `append(a, b, c)`는 레코드 1개, 관찰 중인 부모 사이 이동은 2개다.
- queue a mutation observer microtask는 agent의 mutation observer microtask queued 플래그가 true면 아무것도 하지 않는다. notify mutation observers가 플래그를 false로 되돌리므로 "직전 알림이 시작된 뒤" 첫 레코드 때만 새 마이크로태스크가 들어간다.
- notify mutation observers: pending을 생성 번호로 정렬해 목록을 만들고 pending을 비운 뒤, 관찰자마다 record queue를 복제·비우고 비어 있지 않을 때만 콜백을 부른다. takeRecords·disconnect는 record queue를 비우므로 그 레코드는 콜백에 가지 않는다.
- 콜백은 Web IDL invoke의 "report" 모드로 불려 예외가 전역 error 이벤트로 보고되고 다음 관찰자로 넘어간다. then 콜백의 예외는 then이 반환한 프로미스를 거부한다.
- observe 옵션: attributeOldValue나 attributeFilter가 있고 attributes가 없으면 attributes를 true로 채운다. childList·attributes·characterData가 하나도 true가 아니면, 또는 attributeOldValue가 true인데 attributes가 false면 TypeError다.

#### 확인 질문
1. 예제 7이 "관찰자마다 알림 마이크로태스크가 하나씩"이라는 모델을 어떻게 배제하는가? A를 먼저 바꿨다면 왜 증거가 약해지는가?
   <details><summary>답</summary>B의 레코드는 then 등록 앞, A의 레코드는 뒤에 생긴다. 관찰자마다 마이크로태스크라면 B → then → A여야 하지만 실제는 A·B 콜백이 then보다 먼저다. A를 먼저 바꾸면 두 모델 모두 A·B가 then보다 먼저라 출력이 같아진다(content.mdx 여러 관찰자 절, 계획 변경 이력).</details>
2. 관찰하지 않는 노드를 바꾼 뒤 then을 등록하고 관찰하는 노드를 바꾸면 순서는? 2026년 6월 Review Draft대로라면 무엇이 달라지는가?
   <details><summary>답</summary>현재 판과 Chromium은 `then / 콜백 1`이다. 관심 있는 관찰자가 없으면 queue a mutation record가 마이크로태스크를 넣기 전에 끝나기 때문이다. 예전 판은 그 변경에도 마이크로태스크를 넣어서 콜백 쪽 마이크로태스크가 then보다 먼저 큐에 들어간다(content.mdx 첫 절, simplifications 8).</details>
3. 예제 4에서 first에서 takeRecords로 꺼낸 레코드는 왜 콜백에 오지 않는가? "큐에 넣을 때 레코드가 고정된다"는 모델과 무엇이 다른가?
   <details><summary>답</summary>마이크로태스크는 레코드를 담지 않고, notify가 그때 관찰자의 record queue를 복제한다. takeRecords가 이미 비웠으므로 콜백을 부르지 않는다. 고정 모델이면 `first 콜백 1`이 찍혀야 한다(퀴즈 4 오답 (d), 예제 4 결과와 이유).</details>
4. 예제 6의 둘째 시도에 childList: true를 넣은 이유는? 빼면 무엇을 증명하지 못하는가?
   <details><summary>답</summary>childList가 없으면 "true가 하나도 없음" 규칙이 먼저 걸려 TypeError가 나므로 셋째 규칙(attributeOldValue true와 attributes false)의 증거가 되지 않는다(사용자 검토, concept.test 파일 단언).</details>
5. 콜백 안에서 관찰 대상을 다시 바꾸면 왜 then보다 늦게 두 번째 콜백이 불리는가?
   <details><summary>답</summary>notify가 시작될 때 플래그를 false로 되돌리고 pending을 비우므로, 콜백 안의 변경은 새 알림 마이크로태스크를 큐 끝에 넣는다. 그 앞에 이미 있던 then이 먼저 실행된다(예제 8, content.mdx 여러 관찰자 절 마지막 문단).</details>
