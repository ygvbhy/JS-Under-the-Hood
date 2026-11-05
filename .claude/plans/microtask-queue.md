# 마이크로태스크 큐 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-05
- 기준: `main` @ `d58c08a`

## 0. 요약

- 목적: 43~48장 로드맵 3번. 마이크로태스크 큐와 체크포인트(스택이 비면, 큐가 빌 때까지)를 HTML·ECMAScript 원문과 Chromium 실행으로 설명하는 46번째 개념 `microtask-queue`를 추가한다.
- 범위: 새 개념 폴더 1개(예제 8개, 4시나리오 시뮬레이터 — 개념 전용 뷰), event-loop·promise 본문의 '작성 예정' 3곳을 링크로, 고정 테스트·e2e·빌드 테스트·content-guide·로드맵. 공통 코드(`app/simulator/` 등)와 event-loop 시뮬레이터는 바꾸지 않는다.
- 위험: 체크포인트 시점(스택이 비었을 때 정리 단계 vs 태스크 뒤 처리 모델)을 섞어 쓰거나, 실행으로 확인하지 않은 실제 사용자 클릭을 사실처럼 쓰는 것.
- 복잡도: 중간 · Consensus: 생략 (45개 개념에서 반복한 새 개념 추가 패턴 그대로, 공통 코드 변경 없음. 명세 정확성은 구현 뒤 critical-code-review와 사용자 콘텐츠 검토로 확인)
- 미확정: 1건(시나리오 단계 수는 구현 후 고정)

## 1. 요구사항

### 요구사항 (2026-11-05 사용자 결정)

- 로드맵 3번 개념. slug `microtask-queue`, 제목 '마이크로태스크 큐: 먼저 등록한 setTimeout(fn, 0)보다 then 콜백이 왜 먼저 실행될까', category `async`, order 440(46번째·마지막), `reviewedAt: null`.
- 다룰 주제(사용자 선택: 기본 + 추가 4개 모두):
  1. 기본: 동기 코드 → 마이크로태스크(then·`queueMicrotask`가 한 큐에서 넣은 순서대로) → 타이머 태스크.
  2. 체크포인트는 큐가 빌 때까지: 마이크로태스크 안에서 넣은 마이크로태스크도 같은 체크포인트에서 실행, 계속 넣으면 타이머가 밀린다.
  3. 두 체인이 끼어드는 순서(`a1 → b1 → a2 → b2 → a3`) — promise 페이지가 이 페이지로 미룬 내용.
  4. 스크립트 요소 사이·타이머 콜백 사이에도 체크포인트.
  5. 리스너 사이의 체크포인트: 스크립트가 부른 `click()`은 리스너를 다 부른 뒤(스크립트가 끝나야) 체크포인트, 브라우저가 태스크로 디스패치한 `message` 이벤트는 리스너마다 체크포인트. 실제 사용자 클릭은 표준 근거로만 쓴다(실행 확인 안 함).
- 시각화: 이벤트 루프 시뮬레이터(콜 스택·대기 중인 타이머·태스크 큐)에 마이크로태스크 큐 칸과 체크포인트 표시를 더한 **개념 전용** 시뮬레이터를 새 폴더에 만든다.
- 기존 페이지 '작성 예정' 링크화(event-loop 계획의 timers 링크화 선례대로, 해당 페이지 `reviewedAt` 유지).

### 유지해야 하는 기존 동작

- event-loop의 시뮬레이터·시나리오·테스트, promise의 시뮬레이터·테스트는 그대로(본문 문구 3곳과 promise meta 단순화 1항목만 수정).
- 공통 셸 `SimulatorShell`, `app/simulator/`, `app/lib/`, 실행기(`tests/helpers/`)는 바꾸지 않는다.
- 기존 e2e·빌드 테스트 케이스는 개수·마지막 개념 값만 바꾸고, 새 케이스는 추가만 한다.

### 제외 범위

- async/await(로드맵 5번, '작성 예정'으로만 언급), 렌더링 갱신·`requestAnimationFrame`, MutationObserver 마이크로태스크, 처리되지 않은 거부 알림(체크포인트 안의 단계지만 로드맵 6번), 이벤트 루프 회전(spin)으로 마이크로태스크가 태스크 큐로 옮겨지는 경우, Node.js의 `process.nextTick`·이벤트 루프, 워커.
- event-loop meta의 '마이크로태스크 체크포인트와 Promise는 별도 개념이며…'(작성 예정 표현 없음)와 timers meta의 'Promise와 마이크로태스크는 별도 개념…'은 고치지 않는다(meta 단순화는 평문 — 링크 불가, '작성 예정' 문구 없음).

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-05 받은 사본 `scratchpad/std/`: HTML `webappapis.html`·`timers-and-user-prompts.html`·`web-messaging.html`, WebIDL `webidl.html`, ECMAScript 현재 초안 `ecma.html`)

- 마이크로태스크 큐: "Each event loop has a microtask queue, which is a queue of microtasks, initially empty." / "A microtask is a colloquial way of referring to a task that was created via the queue a microtask algorithm." / "The microtask queue is not a task queue." (HTML `#microtask-queue`, `#microtask`)
- 처리 모델: 태스크의 단계를 실행한 뒤 "Perform a microtask checkpoint." (`#event-loop-processing-model`). 처리 모델 주석: "Remember that the microtask queue is not a task queue, so it will not be chosen in this step."
- 체크포인트: "While the event loop's microtask queue is not empty:" → "Let oldestMicrotask be the result of dequeuing from the event loop's microtask queue." → "Run oldestMicrotask." 재진입 방지 플래그 "performing a microtask checkpoint". 같은 알고리즘 안에 거부 알림(notify about rejected promises)·IndexedDB 정리·ClearKeptObjects 단계가 있다(이 페이지는 다루지 않음). (`#perform-a-microtask-checkpoint`)
- 스크립트 뒤 정리: "If the JavaScript execution context stack is now empty, perform a microtask checkpoint." 주석: "These algorithms are not invoked by one script directly calling another, but they can be invoked reentrantly in an indirect manner, e.g. if a script dispatches an event which has event listeners registered." (`#clean-up-after-running-script`)
- WebIDL 콜백 호출(invoke a callback function, call a user object's operation) 끝에 "Clean up after running a callback with stored settings." 다음 "Clean up after running script with relevant settings." — 리스너·타이머 콜백이 끝날 때 스택이 비어 있으면 그 자리에서 체크포인트가 일어나는 근거. (`webidl #invoke-a-callback-function`, `#call-a-user-objects-operation`)
- HTML의 HostEnqueuePromiseJob: "HTML schedules these operations in the microtask queue." 구현은 "Queue a microtask to perform the following steps:" (`#hostenqueuepromisejob`). 마이크로태스크 정의: "Set microtask's source to the microtask task source." … "Enqueue microtask on eventLoop's microtask queue." (`#queue-a-microtask`)
- ECMAScript HostEnqueuePromiseJob(호스트 정의): "Jobs must run in the same order as the HostEnqueuePromiseJob invocations that scheduled them." (`#sec-hostenqueuepromisejob`) — 두 체인 순서는 이 요구와 PerformPromiseThen·TriggerPromiseReactions(promise 페이지에서 다룸)로 설명된다.
- `queueMicrotask`: "The queueMicrotask(callback) method must queue a microtask to invoke callback with « » and "report"." 비규범 설명에 "This allows their code to run once the JavaScript execution context stack is next empty" 와 "scheduling a lot of microtasks has the same performance downsides as running a lot of synchronous code." (`timers-and-user-prompts.html#microtask-queuing`, `#dom-queuemicrotask`)
- `postMessage`는 posted message 태스크 소스의 글로벌 태스크를 넣는다(event-loop 페이지가 이미 인용, `web-messaging.html#posted-message-task-source`).
- 참고 링크 앵커 존재 확인: HTML `#microtask-queue` `#microtask` `#perform-a-microtask-checkpoint` `#performing-a-microtask-checkpoint` `#clean-up-after-running-script` `#hostenqueuepromisejob` `#queue-a-microtask` `#event-loop-processing-model`, `timers-and-user-prompts.html#microtask-queuing` `#dom-queuemicrotask`, `web-messaging.html#posted-message-task-source`, WebIDL `#invoke-a-callback-function` `#call-a-user-objects-operation`, ECMAScript `#sec-hostenqueuepromisejob` `#sec-performpromisethen` `#sec-triggerpromisereactions` `#sec-newpromisereactionjob` `#sec-jobs`. MDN ko `Web/API/HTML_DOM_API/Microtask_guide`, `Web/API/Window/queueMicrotask`(둘 다 200).

### 사실 (실행 확인 — 2026-11-05, 프로젝트 실행기 `runBrowserExample`로 Chromium 156.0.8078.4에서 5회씩, `two-chains.js`는 Node v24.22.1 vm `microtaskMode: 'afterEvaluate'`로도)

예제 초안(부록)이 5회 모두 같은 출력:

| 예제 | 출력 |
| - | - |
| `basic.html` | 스크립트 시작, 스크립트 끝, then 1, queueMicrotask, then 2, 타이머 0ms |
| `nested.html` | 스크립트 끝, m1, m2, m3, 타이머 0ms |
| `many-microtasks.html` | 스크립트 끝, 마이크로태스크 1000개 끝, 타이머 0ms |
| `two-chains.js` | 동기 코드 끝, a1, b1, a2, b2, a3 (vm·Chromium 같음) |
| `two-scripts.html` | 스크립트 1 끝, 스크립트 1의 마이크로태스크, 스크립트 2 (타이머 제거 후, 변경 이력) |
| `timer-callbacks.html` | a, a의 마이크로태스크, b |
| `click-listeners.html` | 리스너 1, 리스너 2, click() 뒤, 마이크로태스크 1, 마이크로태스크 2 |
| `message-listeners.html` | 스크립트 끝, 리스너 1, 마이크로태스크 1, 리스너 2, 마이크로태스크 2 |

- 같은 조건에서 `dispatchEvent(new Event('ping'))`도 `click()`과 같은 순서(리스너 둘 → 다음 줄 → 마이크로태스크 둘)였다(본문에서 `click()`만 쓴다).

### 사실 (코드에서 확인)

- 개념 폴더끼리 import하지 않는다(`grep` 결과 `app/concepts/*`의 상대 import는 `tests/helpers`뿐). 새 시뮬레이터 뷰는 event-loop의 `LoopView`(`app/concepts/event-loop/LoopView.tsx:1-101`)를 본떠 새 폴더에 따로 만든다.
- event-loop 시나리오 상태 `{ stack, waiting, queue, task }`와 불변식 ①~⑧(`app/concepts/event-loop/scenarios.ts:14-19`, `concept.test.ts:79-200`), `QUEUE_MOMENT` 문구(`scenarios.ts:31-32`).
- '작성 예정' 위치: `app/concepts/event-loop/content.mdx:106`("마이크로태스크를 다루는 별도 개념(작성 예정)"), `app/concepts/promise/content.mdx:6`("Job을 호스트가 언제 처리하는지(마이크로태스크)와 여러 체인이 끼어드는 순서는 별도 개념(작성 예정)이고"), `:35`("별도 개념(작성 예정)에서 다룹니다"), `app/concepts/promise/meta.ts:99`(단순화, "별도 개념(작성 예정)에서 다룹니다").
- 고정 테스트: `app/lib/concepts.test.ts:104,108-112`(total 45, 마지막 promise), `app/components/concept/ConceptPager.test.tsx:18,27-28`, `tests/e2e/navigation.spec.ts:78,84-86,138,164~482`('/ 45', 마지막 promise), `tests/e2e/responsive.spec.ts:1093`(article 45), `tests/e2e/helpers.ts:71-74`(경로 상수), `tests/e2e/a11y.spec.ts:890-905`(event-loop 패턴), `tests/build/build-output.test.ts:1165-1182`(promise 시뮬레이터 프리렌더 패턴), `docs/content-guide.md:214`(e2e 대상 목록).
- 시뮬레이터 이름 '이벤트 루프 시뮬레이터'가 이미 있으므로(`tests/e2e/helpers.ts:72`) 새 이름은 '마이크로태스크 큐 시뮬레이터'.

### 추정

- 없음.

## 3. 구현 전략

- **새 개념 폴더 + 개념 전용 시뮬레이터.** event-loop의 상태 모양에 마이크로태스크 큐와 체크포인트 표시를 더한 상태 `MicroState`를 쓴다. 개념 폴더끼리 import하지 않는 규칙에 따라 `LoopView`를 복사해 칸 하나를 더한 `MicroView`를 만든다(공통 부품으로 빼지 않음 — 공유는 `app/simulator/`만이라는 AGENTS.md 규칙).
- **상태 모델** (`scenarios.ts`):

  ```ts
  export type MicroState = {
    stack: string[] // 콜 스택. 아래 → 위(지금 실행 중). 호스트 함수 프레임은 그리지 않는다
    waiting: string[] // 지연이 끝나기를 기다리는 타이머 콜백(등록 순서)
    tasks: string[] // 태스크 큐. 앞이 먼저 꺼내진다(타이머 태스크, message 이벤트 태스크)
    microtasks: string[] // 마이크로태스크 큐. 앞이 먼저 실행된다
    task: string | null // 지금 실행 중인 태스크('스크립트', '타이머 콜백', 'message 이벤트'). 태스크 사이 null
    checkpoint: boolean // 마이크로태스크 체크포인트 진행 중
  }
  ```

  - 체크포인트는 스택이 빈 순간에 시작한다(스크립트·콜백 뒤 정리 단계). 콜백이 태스크 안에서 불렸으면 체크포인트도 그 태스크 안에서 일어나므로 `task`는 그대로 두고 `checkpoint: true`로 그린다. 표준은 마이크로태스크를 실행하는 동안 이벤트 루프의 '현재 실행 중인 태스크'를 그 마이크로태스크로 바꾸지만, 그림은 감싼 태스크를 보여 준다 → `simplifications`에 적는다.
  - 처리 모델이 태스크 뒤에 다시 하는 체크포인트는 큐가 이미 비어 있어 아무것도 하지 않는 경우만 나오므로 별도 단계로 그리지 않는다 → 본문·`simplifications`에 적는다.
- **시나리오 4개** (예제 원문을 `?raw`로 import):
  1. `basic` ← `basic.html`: 등록 → 스크립트 끝 → 스택이 비어 체크포인트(then 1, queueMicrotask, then 2) → 체크포인트 끝 → 타이머 태스크.
  2. `nested` ← `nested.html`: 체크포인트 중 m1이 m2를 넣고, m2가 m3를 넣어도 같은 체크포인트에서 실행 → 그 뒤 타이머.
  3. `click` ← `click-listeners.html`: `click()` 안에서 리스너가 전역 코드 위에 쌓이고, 리스너가 끝나도 스택에 전역 코드가 남아 체크포인트가 없음 → 'click() 뒤' → 스크립트 끝에서 체크포인트.
  4. `message` ← `message-listeners.html`: `postMessage`가 태스크 큐에 'message 이벤트'를 넣음 → 스크립트 끝(마이크로태스크 없음) → message 태스크에서 리스너 1이 스택에 단독으로 → 끝나면 스택이 비어 체크포인트(마이크로태스크 1) → 리스너 2 → 체크포인트(마이크로태스크 2).
  - 타이머가 대기에서 태스크 큐로 옮겨 가는 단계 설명에는 event-loop와 같은 "그림을 위해 고른 것 … 보장되는 것은 실행 순서뿐" 문구를 넣는다.
- **본문 구성** (`동작 원리` h3): ① 마이크로태스크 큐는 태스크 큐가 아니다 ② 프로미스 Job과 `queueMicrotask`는 같은 큐로(HTML HostEnqueuePromiseJob, `queueMicrotask` 단계) ③ 체크포인트는 스택이 빌 때(clean up after running script, WebIDL 콜백 정리, 처리 모델) ④ 체크포인트는 큐가 빌 때까지(그래서 계속 넣으면 타이머가 밀림, HTML의 성능 주의 문장) ⑤ 두 체인이 끼어드는 순서(ECMAScript의 Job 순서 요구 — 언어가 정하는 부분과 호스트가 정하는 부분 구분) ⑥ 스크립트 요소 사이·타이머 콜백 사이 ⑦ 리스너 사이(`click()`은 스크립트 안의 호출이라 스택이 비지 않음, 브라우저가 태스크에서 부른 리스너는 매번 스택이 빔 — 실제 사용자 클릭은 표준 서술 근거만, 실행 확인 안 함) ⑧ 이 페이지가 다루지 않는 것. `예제`(8개, 각 예제 뒤 퀴즈, 시뮬레이터) → `결과와 이유`(요약 표 + 흔한 오해 Callout: "마이크로태스크는 태스크 사이에만 실행된다", "Promise가 setTimeout보다 '우선순위'가 높다"(우선순위가 아니라 체크포인트 시점), "click()과 실제 클릭은 같다", "then 콜백은 등록 순서대로 다 끝나고 다음 체인으로").
- **경계 표시.** 이벤트 루프·마이크로태스크 큐·체크포인트는 HTML(호스트), Job 순서 요구와 then의 반응 등록은 ECMAScript로 문장마다 구분. 첫 문단에 Node.js는 다루지 않음(event-loop 선례). 장 범위: 45장까지 — async/await는 '작성 예정', try…catch·전역 에러 이벤트도 '작성 예정'.
- **버린 대안.** (a) event-loop 시뮬레이터에 시나리오를 추가: event-loop 페이지의 범위와 테스트를 바꾸고 마이크로태스크 칸이 없는 상태 모양을 깨므로 버림. (b) 시뮬레이터 없이 표와 퀴즈만: 사용자가 확장 시뮬레이터를 선택. (c) 리스너 예제를 `dispatchEvent`로: event-loop 페이지가 `click()`을 썼으므로 이어서 `click()`.

## 4. 변경 파일

- 추가 `app/concepts/microtask-queue/`
  - `meta.ts` — 1절의 slug·제목·category·order, `reviewedAt: null`. examples 8개(부록, `two-chains`만 `runtime: 'ecmascript'`), prerequisites `event-loop`·`promise`, related `event-loop`·`promise`·`timers`, references(2절의 앵커 + MDN 2개), simplifications(아래 5절·3절의 단순화 전부).
  - `examples/*.html`, `examples/two-chains.js` — 부록 원문 그대로.
  - `scenarios.ts`, `MicroView.tsx`, `Simulator.tsx`(label '마이크로태스크 큐 시뮬레이터'), `MicroView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `content.mdx`, `route.tsx`.
- 수정(기존 개념 문구, `reviewedAt` 유지)
  - `app/concepts/event-loop/content.mdx:106` — "마이크로태스크를 다루는 별도 개념(작성 예정)" → `[마이크로태스크 큐](/concepts/microtask-queue)` 링크 문장.
  - `app/concepts/promise/content.mdx:6`, `:35` — 해당 '별도 개념(작성 예정)'을 같은 링크로(6행의 async/await·try…catch '작성 예정'은 그대로).
  - `app/concepts/promise/meta.ts:99` — "별도 개념(작성 예정)에서 다룹니다" → "마이크로태스크 큐 개념에서 다룹니다"(평문).
- 수정(고정 테스트·문서): `app/lib/concepts.test.ts`(total 46, 마지막 `microtask-queue`, prev `promise`), `app/components/concept/ConceptPager.test.tsx`(46, 마지막 microtask-queue), `tests/e2e/navigation.spec.ts`(카드 46, '46번째'·새 제목, 모든 '/ 45' → '/ 46', promise 45/46 링크 2개, microtask-queue 46/46 링크 1개), `tests/e2e/responsive.spec.ts`(홈 article 46 + 새 페이지 가로 스크롤 + 시뮬레이터 첫 시나리오 끝까지 진행 뒤 가로 스크롤), `tests/e2e/a11y.spec.ts`(새 페이지 axe + 시뮬레이터 진행 뒤 axe), `tests/e2e/helpers.ts`(`MICROTASK_QUEUE_PATH`, `MICROTASK_QUEUE_SIMULATOR_NAME`), `tests/build/build-output.test.ts`(`시뮬레이터 프리렌더 (microtask-queue)` describe: region·첫 단계 텍스트·`<details` ≥ 퀴즈 수), `docs/content-guide.md:214`(목록에 `microtask-queue`), `.claude/plans/concept-roadmap-ch43-48.md`(3번 상태·진행 기록).
- 변경하지 않음: `app/simulator/`, `app/components/`, `app/lib/concepts.ts`, `tests/helpers/`, event-loop·promise의 시뮬레이터와 테스트, timers.

## 5. 위험 요소

- 체크포인트 시점 혼동 → "태스크가 끝나야 마이크로태스크가 실행된다"로 쓰면 예제 5·7(스크립트 요소 사이, message 리스너 사이)와 모순 → 본문 ③에서 '스택이 비었을 때 정리 단계'를 주된 근거로, 처리 모델의 태스크 뒤 체크포인트를 함께 인용(작업 4), 시나리오 불변식 ⑤(작업 2).
- 실제 사용자 클릭 주장 → 실행으로 확인 못함 → "표준 서술에 따르면 … 이 페이지는 실행으로 확인하지 않았다" 문장과 `simplifications`(작업 4).
- '우선순위' 표현 → 표준은 마이크로태스크에 우선순위를 정하지 않음, 순서는 체크포인트 시점에서 나옴 → 오해 Callout로 다루고 본문에서 '우선순위' 용어를 쓰지 않음(작업 4, 리뷰).
- 예제 3(1000개)의 시간 → 정확한 ms·'멈춘다' 주장 금지, 순서만. 1000개는 실행기 2초·settle 안에 끝남(실측) → 무한 루프 금지(작업 1).
- 두 체인 순서를 HTML 동작으로 오해 → ECMAScript의 Job 순서 요구로 설명하고 ecmascript 런타임으로 검증(작업 1·4).
- 시뮬레이터 그림이 표준의 '현재 실행 중인 태스크'와 다름 → 3절 단순화 문구(작업 1 meta, 작업 2 설명).
- 새 개념이 마지막이 되며 고정 테스트 실패 → 4절 목록 갱신(작업 5). navigation.spec의 '/ 45'는 여러 줄이므로 전부 바꾼다.
- 링크화한 promise·event-loop 본문 문장이 어색해짐 → 문장 단위로 바꾸고 빌드 HTML에서 링크 확인(작업 5).
- MDX: PredictQuiz 문자열 prop 안의 작은따옴표는 MDX 빌드를 깨뜨리고 `npm test`가 못 잡음(메모리 교훈) → `test:build`로 확인. 첫 문단에 `**`·`2 ** n` 금지.
- 빈 마이크로태스크 체크포인트 단계(스크립트 끝에 큐가 비어 있음, `message` 시나리오) → 그리지 않는다고 정하고 불변식은 "체크포인트가 true인 단계는 스택이 비었을 때 시작"만 검사.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`, 그 뒤 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "microtask-queue|마이크로태스크 큐 시뮬레이터|홈 학습 순서 보기"` (공통 코드 변경 없음 — 새 페이지 범위 e2e. `-g` 패턴은 실제 테스트 이름에 맞춰 조정).
- 예제: `npm test`의 L1이 8개 예제를 실제 실행해 `expectedOutput`과 대조. 음성 확인 1회(한 예제의 expectedOutput 순서를 바꿔 실패 확인 후 원복).
- 브라우저(빌드 후 `npm run start`):
  1. 1280 라이트·375 다크에서 시뮬레이터 네 시나리오를 끝까지 넘기는 동안 문서 `scrollWidth` = 창 너비.
  2. 단계마다 콜 스택·대기·태스크 큐·마이크로태스크 큐 칸과 체크포인트 표시가 설명과 맞고, "(바뀜)"이 바뀐 칸에만 붙는다(message 시나리오의 리스너 1 → 체크포인트 → 리스너 2 구간 확인).
  3. JS 끔에서 시뮬레이터 첫 단계와 퀴즈 정답 `<details>` 수 = 퀴즈 수.
  4. event-loop·promise 페이지의 새 링크가 `/concepts/microtask-queue`로 이동하고, promise 페이지 학습 순서 '다음'이 새 페이지.
  5. 키보드로 시뮬레이터 조작(공통 셸 단축키) 가능.
- 표준 인용: 본문의 영어 인용이 2절 사본 원문과 글자 단위로 일치(스크립트로 대조).

## 7. 미확정 사항

- [미확정] 시나리오별 단계 수 — 3절 흐름대로 쓴 뒤 `concept.test.ts`에 고정(event-loop 선례: 계획 대비 달라질 수 있음).

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `app/concepts/microtask-queue/{meta.ts, content.mdx(필수 h2 3개만 둔 임시 본문), route.tsx, examples/*}`
- 현재: 폴더 없음.
- 변경: 부록 예제 8개를 그대로 복사(파일 끝 줄바꿈 하나). meta를 2·3·4절대로 쓰고 `expectedOutput`은 2절 실행 표 값. 폴더는 meta.ts → content.mdx → route.tsx 순으로 만든다(dev 서버가 `./meta` 실패를 캐시하지 않게).
- 이유: 모든 결과 주장의 근거.
- 주의사항: `console.log`에는 문자열만. 참고 링크는 2절 앵커만 쓰고 절 번호를 라벨에 넣지 않는다. summary 160자 이하. `reviewedAt: null`.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/lib`에서 새 예제 8개 통과(`concepts.test.ts`의 개수 고정 실패는 작업 5에서 해소 — 이 단계에선 그 실패만 허용). 음성 확인 1회.

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 현재: 없음.
- 변경: 3절의 `MicroState`와 시나리오 4개. 테스트(event-loop 불변식을 확장):
  - 공통: `assertScenarioInvariants`, 고정 줄 번호 원문 대조, 첫 단계 `스크립트 태스크 시작`·출력 없음.
  - ① 이름은 스택·대기·태스크 큐·마이크로태스크 큐 중 두 곳에 동시에 없다('전역 코드' 제외).
  - ② `task`가 null→X이면 직전 `tasks[0]`이 X이고 빠지며, 그 직전 단계의 `microtasks`는 비어 있다(마이크로태스크가 남아 있으면 다음 태스크를 꺼내지 않는다).
  - ③ `task`가 있으면 스택이 비었거나(체크포인트·태스크 끝) `stack[0]`이 그 태스크의 첫 프레임(스크립트 → '전역 코드', 타이머 → 콜백 이름, message 이벤트 → 리스너)이다. `task`가 null이면 스택이 비었다.
  - ④ `checkpoint`가 false→true인 단계의 스택은 비어 있다. `checkpoint`가 true인 동안 스택에 쌓인 프레임은 마이크로태스크 콜백뿐이고, 그것이 시작될 때 직전 `microtasks[0]`이었고 빠진다.
  - ⑤ 마이크로태스크 큐와 태스크 큐는 앞에서만 빠지고 새 이름은 뒤에 붙는다(FIFO). 태스크 큐에 새로 들어간 타이머는 직전 단계에서 대기 중이었다('message 이벤트'는 postMessage 줄 단계에서만 들어간다).
  - ⑥ 새 출력 줄은 한 단계에 하나까지, 그 단계 `line` 범위에 그 `console.log`가 있다.
  - ⑦ 마지막 단계는 모든 칸이 비고 `task` null·`checkpoint` false, 출력 = expectedOutput. 큐로 옮기는 단계 설명에 "그림을 위해 고른 것"·"보장되는 것은 실행 순서뿐".
  - 개념 불변식: basic — 'then 1' 출력 전에 '스크립트 끝'이 있고 타이머 태스크는 체크포인트가 끝난 뒤. nested — m2·m3가 들어간 단계가 모두 같은 체크포인트(true 구간) 안. click — '리스너 1'·'리스너 2' 단계의 스택이 `['전역 코드', 리스너]`이고 그동안 `checkpoint` false, '마이크로태스크 1' 출력은 'click() 뒤' 뒤. message — '리스너 1' 단계의 스택이 `['리스너 1']`(전역 코드 없음), '마이크로태스크 1' 출력이 '리스너 2' 출력보다 앞.
- 이유: 그림이 실행 결과·표준 규칙과 어긋나지 않게 강제.
- 주의사항: 각 Step은 전체 스냅샷. 시나리오 단계 수는 완성 후 테스트에 고정.
- 완료 조건: `npx vitest run app/concepts/microtask-queue/concept.test.ts` 통과, 그리고 어느 한 불변식에 대해 시나리오를 일부러 틀리게 바꿔 실패하는지 1회 확인 후 원복.

### 3. 뷰·시뮬레이터 컴포넌트

- 대상: `MicroView.tsx`, `Simulator.tsx`, `MicroView.test.tsx`, `Simulator.test.tsx`
- 현재: 없음(참고: `app/concepts/event-loop/LoopView.tsx`, `Simulator.tsx`, `*.test.tsx`).
- 변경: `LoopView` 구조를 따라 상단에 '지금 태스크' + '마이크로태스크 체크포인트: 진행 중/아님' 텍스트, 칸 4개(콜 스택·대기 중인 타이머·태스크 큐·마이크로태스크 큐, `sm:grid-cols-2 lg:grid-cols-4` 등 375px에서 세로로 쌓이게), "(바뀜)" 표시. 색만으로 구분하지 않는다.
- 이유: 공통 셸에 넘길 시각화.
- 주의사항: 하이드레이션 규칙(첫 렌더는 첫 단계). 각 칸 `<ol aria-label>`. 긴 이름 줄바꿈(`overflow-wrap:anywhere`).
- 완료 조건: `npx vitest run app/concepts/microtask-queue` 통과(뷰 테스트: 빈 칸 '비어 있음', 바뀐 칸에만 '(바뀜)', 체크포인트 텍스트, 시뮬레이터 테스트: region 이름과 첫 단계 제목, 다음 버튼으로 진행).

### 4. 본문 작성

- 대상: `content.mdx`
- 현재: 작업 1의 임시 본문.
- 변경: 3절 본문 구성. 첫 문단(산문, `**` 없음)에 질문·다루는 범위·Node.js 제외·전제 개념 링크(이벤트 루프, 프로미스, 타이머). 예제 8개마다 `file=` 코드 블록 + PredictQuiz(최소 8개), 시뮬레이터는 독립된 줄. 결과와 이유에 요약 표(JSX `<table>`, `<Wide>` 필요 시)와 오해 Callout.
- 이유: 페이지 본체.
- 주의사항: 영어 인용은 2절 원문 그대로. 표준 보장과 Chromium 관찰을 문장마다 구분. '우선순위'·'매크로태스크'를 표준 용어처럼 쓰지 않는다. 45장까지만 전제(async/await·에러 처리는 '작성 예정'). 한정어("often", "If … now empty")를 떨어뜨리지 않는다.
- 완료 조건: `npm test`(content-integrity의 필수 h2 포함)와 `npm run test:build` 통과(작업 5 전이면 고정 개수 테스트 실패만 허용), 영어 인용 대조 스크립트로 모든 인용이 사본 원문에 있음.

### 5. 기존 페이지 링크·고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절의 수정 목록.
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만. 시뮬레이터 진행 e2e의 단계 수는 실제 첫 시나리오 단계 수에 맞춘다. event-loop·promise `reviewedAt` 유지.
- 완료 조건: 6절 정적·테스트 전부와 새 페이지 범위 e2e 통과, 6절 브라우저 1~5 확인, `grep -rn "작성 예정" app/concepts/event-loop app/concepts/promise`에 마이크로태스크 관련 줄이 남지 않음(async/await·try…catch 언급만 남음).

## 9. 추가 개선 후보

- event-loop·timers meta의 "마이크로태스크…별도 개념" 평문을 개념 이름으로 다듬기(링크 불가 영역, 사용자 결정 시).
- 체크포인트 안의 거부 알림(unhandledrejection)은 로드맵 6번에서 이 페이지로 역링크.

## 변경 이력

- 2026-11-05 (리뷰 지적 — 명세 정확성 교차 검토, 원문으로 재확인 후 반영): ① 오해 Callout "태스크가 끝나는 때가 아니라 스택이 비는 때" → 처리 모델의 태스크 뒤 체크포인트도 있으므로 "태스크가 끝난 뒤에만이 아니라 태스크 안에서도" ② "체크포인트는 표준의 두 곳에서" → HTML 파서의 script 종료 태그 단계에도 체크포인트가 있어(parsing.html 원문 확인) "예제와 관련된 곳은 두 곳"으로 한정, 다루지 않는 것·simplifications에 추가 ③ "Job은 요청된 순서대로" 일반화 → "HostEnqueuePromiseJob으로 넣은 프로미스 Job은 넣은 순서대로", 두 체인 순서는 then의 절차 + 순서 요구로(goal·본문·퀴즈·표·Callout) ④ "아무 일도 하지 않는다/할 일이 없다" → "실행할 마이크로태스크가 없다"(체크포인트의 거부 알림 등 단계는 큐가 비어도 실행) ⑤ 예제 4 실행 환경: simplification이 Chromium 값이라 쓴 것을 Node vm 값으로, 표의 체크포인트 칸 "해당 없음" ⑥ 마이크로태스크도 정의상 태스크("A microtask is a colloquial way…") 인용, "not a task queue"는 주석(비규범, `class=note` 확인)이라 밝히고 처리 모델 주석("Remember that…") 인용 ⑦ `queueMicrotask()` 절의 두 문단은 `class=note`가 아닌 일반 문단이라 '비규범' 표기 삭제, 출처를 "queueMicrotask() 절"로 ⑧ 시나리오 then 1 설명의 인과("이행돼서 바로 부르지 않음") 수정 ⑨ 그 밖에 currently running task가 마이크로태스크 뒤 null이 되는 점(simplifications), "typically" 한정어, posted message 태스크 소스 표현 통일, click()은 "스크립트 실행 도중 그 자리에서 디스패치"로, 오해 Callout 제목 "click()으로 확인한 순서가 실제 클릭에도 그대로 적용된다", goal의 실제 클릭 문구, 예제 6 지시어 — 영향 단계 1·2·4
- 2026-11-05 (사용자 콘텐츠 검토 1회, 7건 — 실행·원문으로 확인 후 반영): ① 예제 5의 타이머 위치는 표준 보장이 아님(둘째 스크립트를 외부 파일로 바꾸면 Chromium에서 `… 마이크로태스크, 타이머 0ms, 스크립트 2`) → 수정안 A: 예제 5에서 타이머 제거(expectedOutput `스크립트 1 끝, 스크립트 1의 마이크로태스크, 스크립트 2`, 5회 동일), 오해 1의 근거는 예제 8 중심으로 ② ECMAScript Jobs 절의 실행 조건("At some future point in time, when there is no running context … execution context stack is empty", "Once evaluation of a Job starts, it must run to completion…") 추가 — then 콜백이 동기 코드 뒤에 실행되는 것 자체는 ECMAScript가 보장, HTML은 스택이 빈 뒤의 구체적 시점(체크포인트)과 다른 일과의 상대 순서를 정함(본문·첫 문단·goal 3·표) ③ "앞 콜백이 끝나야 다음 Job"은 thenable이 아닌 값을 반환할 때만(vm: a1이 프로미스 반환 시 a1, b1, b2, b3, a2, b4) → 본문 한정 문장·예제 4 제목·simplifications(구체 출력은 예제가 아니므로 주장하지 않음) ④ "실제 클릭을 만들 수 없어" → "이 페이지의 테스트는 입력 이벤트를 만들지 않아"(테스트 밖 page.click()은 isTrusted true에서 추론과 같은 순서였으나 실행기 변경은 공통 코드라 범위 밖) ⑤ 예제 4 "호스트 API 없이" → "타이머·DOM 같은 호스트의 스케줄링 API 없이(출력용 console.log만 사용)" ⑥ "체크포인트 단계는 이렇게 시작" → "반복 부분은", 재진입 가드 인용과 simplifications ⑦ 오해 1 제목 "마이크로태스크는 지금 태스크가 끝나야만 실행된다". 추가(메인 발견): ECMAScript Jobs 절 Note 1(비규범)이 브라우저·Node.js가 프로미스 Job을 "higher priority"로 다룬다고 적으므로 우선순위 오해 Callout을 "언제든 먼저 실행된다"로 바꾸고 그 주석을 인용, HTML에서는 체크포인트 시점으로 나타남(예제 7) — 영향 단계 1·4
- 2026-11-05 (사용자 콘텐츠 검토 2회, 2건): ① 재진입 방지 문단이 반복 인용과 그 설명 사이에 끼어 주어가 어긋남 → 반복 인용 두 개 → 반복 설명(예제 2·3, queueMicrotask 절 인용) → 절 끝에 "마이크로태스크 콜백이 끝날 때도 스택이 비는데 왜 겹치지 않나"로 재진입 방지 문단 ② goal 3 괄호와 단순화 항목의 "앞 콜백이 끝나야 다음 Job"(프로미스를 반환해도 참) → "그 콜백의 Job이 끝날 때 곧바로 다음 Job이 들어감" — 영향 단계 1·4

## 부록: 예제 초안

`/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7bea0997-8470-4896-a372-d3ad7c080f48/scratchpad/ex/`의 파일과 같다(2026-11-05 실행 확인). `.html` 파일은 모두 아래 머리·꼬리로 감싼다(`<body>` 다음 줄부터 본문, 파일 끝 줄바꿈 하나).

```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
…본문…
</body>
</html>
```

#### `basic.html` 본문

```html
<script>
console.log('스크립트 시작');
setTimeout(function () {
  console.log('타이머 0ms');
}, 0);
Promise.resolve().then(function () {
  console.log('then 1');
});
queueMicrotask(function () {
  console.log('queueMicrotask');
});
Promise.resolve().then(function () {
  console.log('then 2');
});
console.log('스크립트 끝');
</script>
```

#### `nested.html` 본문

```html
<script>
setTimeout(function () {
  console.log('타이머 0ms');
}, 0);
queueMicrotask(function () {
  console.log('m1');
  queueMicrotask(function () {
    console.log('m2');
    queueMicrotask(function () {
      console.log('m3');
    });
  });
});
console.log('스크립트 끝');
</script>
```

#### `many-microtasks.html` 본문

```html
<script>
setTimeout(function () {
  console.log('타이머 0ms');
}, 0);
var count = 0;
function next() {
  count++;
  if (count < 1000) {
    queueMicrotask(next);
  } else {
    console.log('마이크로태스크 ' + count + '개 끝');
  }
}
queueMicrotask(next);
console.log('스크립트 끝');
</script>
```

#### `two-chains.js` (runtime `ecmascript`)

```js
Promise.resolve()
  .then(function () { console.log('a1'); })
  .then(function () { console.log('a2'); })
  .then(function () { console.log('a3'); });
Promise.resolve()
  .then(function () { console.log('b1'); })
  .then(function () { console.log('b2'); });
console.log('동기 코드 끝');
```

#### `two-scripts.html` 본문

```html
<script>
queueMicrotask(function () {
  console.log('스크립트 1의 마이크로태스크');
});
console.log('스크립트 1 끝');
</script>
<script>
console.log('스크립트 2');
</script>
```

(2026-11-05 사용자 검토로 타이머 제거 — 변경 이력 참고)

#### `timer-callbacks.html` 본문

```html
<script>
setTimeout(function () {
  console.log('a');
  queueMicrotask(function () {
    console.log('a의 마이크로태스크');
  });
}, 0);
setTimeout(function () {
  console.log('b');
}, 0);
</script>
```

#### `click-listeners.html` 본문

```html
<button id="save">저장</button>
<script>
var save = document.getElementById('save');
save.addEventListener('click', function () {
  console.log('리스너 1');
  queueMicrotask(function () {
    console.log('마이크로태스크 1');
  });
});
save.addEventListener('click', function () {
  console.log('리스너 2');
  queueMicrotask(function () {
    console.log('마이크로태스크 2');
  });
});
save.click();
console.log('click() 뒤');
</script>
```

#### `message-listeners.html` 본문

```html
<script>
window.addEventListener('message', function () {
  console.log('리스너 1');
  queueMicrotask(function () {
    console.log('마이크로태스크 1');
  });
});
window.addEventListener('message', function () {
  console.log('리스너 2');
  queueMicrotask(function () {
    console.log('마이크로태스크 2');
  });
});
window.postMessage('m', '*');
console.log('스크립트 끝');
</script>
```

## 구현 진행

- baseline (2026-11-05, `d58c08a`): lint 통과 / format:check 통과 / typecheck 통과 / `npm test` 122파일 3851개 통과
- [x] 1. 예제·meta·route — 예제 8개가 초안과 `cmp` 일치, `examples.test -t microtask-queue` 8개·content-integrity 통과(메인 재실행), 음성 확인(서브에이전트: basic 순서 바꿈 → 실패 후 원복). `app/lib/concepts.test.ts` 고정값 2개 실패는 작업 5에서 해소 예정. references 17개(HTML 8·Web IDL 2·ECMAScript 5·MDN 2), simplifications 12개
- [x] 2. 시나리오와 대조 테스트 — 단계 수 basic 16·nested 15·click 14·message 16(고정), 불변식 ①~⑦·개념 불변식 4개·'우선순위'/'매크로태스크' 금지 테스트. 음성 확인(서브에이전트: basic 8단계 스택을 비우지 않음 → ③·④·개념 불변식 실패 후 원복). 메인이 단계별 제목·설명·상태를 읽어 표준 서술(정리 단계·처리 모델·postMessage 태스크)과 대조
- [x] 3. 뷰·시뮬레이터 — `MicroView`(지금 태스크·체크포인트 상태 + 칸 4개, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), label '마이크로태스크 큐 시뮬레이터'. 메인 재실행: `vitest app/concepts/microtask-queue app/lib app/components/concept` 13파일 112개, typecheck·eslint·prettier 통과
- (작업 5 일부 선행) event-loop·promise 본문 '작성 예정' 3곳 링크화와 promise meta 단순화 평문(메인 직접), 개수 고정 테스트(concepts.test·ConceptPager.test·navigation.spec·responsive 홈 46)·helpers 상수·content-guide 목록(서브에이전트, diff 확인)
- [x] 4. 본문 — 퀴즈 14개, 영어 인용 15개(표준 사본 원문과 글자 단위 일치, 메인 대조). 메인 검토 수정: 체크포인트 dequeue 문장 인용 추가(Q15 "Let oldestMicrotask be the result of dequeuing…"), 예제 6의 "이미 큐에 있던 b"(관찰 불가 시점) → "별도의 태스크인 b", 재진입 주석의 주어를 '정리 단계(와 준비 단계)'로, 예제 3 퀴즈 정답 문구를 "새 마이크로태스크를 넣는 동안 큐가 비지 않아", 우선순위 오해 Callout의 "표준은 순위를 매기지 않습니다"(부재 주장) → "두 큐 사이의 순위 규칙에서 나오는 것이 아니라"
- [x] 5. 링크·고정 테스트·e2e·빌드 테스트·문서 — event-loop 1곳·promise 2곳 링크(빌드 HTML: event-loop 1개, promise 3개 = 본문 2 + 다음 1), a11y 2·responsive 2 케이스, 빌드 describe `시뮬레이터 프리렌더 (microtask-queue)`
- [x] 6. 전체 검증(메인 재실행): lint·format:check·typecheck 통과, `npm test` 125파일 3939개, `test:build` 371개, navigation 16개, `-g "microtask-queue|마이크로태스크 큐|홈 학습 순서 보기|event-loop|이벤트 루프|promise|프로미스"` 38개 통과. 화면(빌드 serve): 1280 라이트·375 다크에서 네 시나리오(16·15·14·16단계)를 끝까지 넘기는 동안 scrollWidth 최대값 = 창 너비, 375에서 칸이 세로로 쌓임, message 8단계 스크린숏에서 체크포인트 '진행 중 (바뀜)'·콜 스택 '(바뀜)'만 강조. JS 끔 `<details>` 14개 = 퀴즈 수, 첫 단계 프리렌더. 시나리오 message 8단계 설명 문장 다듬음(테스트 재실행 통과)
- [x] 7. 리뷰(critical-code-review, 메인 + Opus 명세 정확성 교차 검토): 코드(불변식 테스트·뷰·e2e·빌드 테스트) 지적 없음. 명세 정확성 지적은 메모리 기준(명세와 다른 설명·오개념 위험은 High)으로 판정해 `변경 이력`대로 수정. 재검증: lint·format:check·typecheck 통과, `npm test` 3939개, `test:build` 371개, `-g "microtask-queue|마이크로태스크 큐"` e2e 12개 통과, 영어 인용 17개 원문 일치. 남긴 Low: 정리 단계에 이르는 연결 인용(타이머 invoke·DOM inner invoke) 미추가, prepare to run script가 올리는 realm 실행 컨텍스트를 그리지 않음(단순화 미기재), ECMAScript도 "스택이 빈 뒤 Job 실행"을 요구한다는 점 미언급, 첫 문단은 타이머를 전제한다고 하지만 prerequisites에 timers 없음(related에만)
- 사용자 콘텐츠 검토 1차(7건 + 메인 발견 1건) 반영(`변경 이력`). 확인: Chromium에서 둘째 스크립트를 외부 파일로 하면 지연 0에서도 `… 마이크로태스크, 타이머 0ms, 스크립트 2`, 타이머 없앤 예제 5는 5회 동일, vm에서 a1이 프로미스 반환 시 `a1, b1, b2, b3, a2, b4`, 테스트 밖 Playwright `page.click()`(isTrusted true)은 `리스너 1, 마이크로태스크 1, 리스너 2, 마이크로태스크 2`(페이지에는 테스트로 확인하지 않았다고만 씀), ECMAScript Jobs 절 두 문장·재진입 가드·Note 1 원문 확인. 재검증: lint·format:check·typecheck 통과, `npm test` 3939개, `test:build` 371개, 새 페이지 e2e 12개 통과, 영어 인용 21개 원문 일치, Callout 안 인용이 빌드 HTML에서 `<blockquote>`로 렌더링
- 사용자 콘텐츠 검토 2차(2건) 반영(`변경 이력`). 재검증: lint·format:check·typecheck 통과, `npm test` 3939개, `test:build` 371개, 새 페이지 e2e 12개 통과, 영어 인용 21개 원문 일치
- 사용자 최종 승인(2026-11-05) → `reviewedAt` '2026-11-05'

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 새 개념 폴더(예제 8개, 4시나리오 시뮬레이터, 퀴즈 14개)와 event-loop·promise 링크화, 고정 테스트·e2e·빌드 테스트·문서 갱신을 구현했다. 공통 코드는 바꾸지 않았다.
- 달라진 점: 시나리오 단계 수는 basic 16·nested 15·click 14·message 16으로 고정(미확정 사항 해소). 사용자 검토로 예제 5에서 타이머를 뺐다(표준이 보장하지 않는 순서라서, `변경 이력`). 본문에 ECMAScript Jobs 절의 실행 조건, 마이크로태스크의 정의, 재진입 방지 단계, 우선순위 주석(ECMAScript Note 1)을 더해 영어 인용이 15개에서 21개가 됐다.

### 코드 리뷰

- 코드(불변식 테스트·뷰·e2e·빌드 테스트)는 지적 없음. Opus 명세 정확성 교차 검토 지적(태스크 뒤 체크포인트 누락, Job 순서 일반화, '아무 일도 하지 않음', 예제 4 실행 환경, 마이크로태스크 정의, 근거 없는 '비규범' 표기 등)은 High로 보고 모두 수정했다.
- 남긴 Low: 정리 단계에 이르는 연결 인용(타이머 invoke·DOM inner invoke) 미추가, realm 실행 컨텍스트를 그리지 않음(단순화 미기재), 첫 문단은 타이머를 전제하지만 prerequisites에 timers 없음(related에만).

### 후속 작업

- [ ] 실제 사용자 입력(Playwright `page.click()`, isTrusted true) 예제를 테스트로 확인하려면 브라우저 실행기(`tests/helpers/`)에 입력 이벤트 지원이 필요하다 — 공통 코드 변경이라 별도 계획. 테스트 밖 실행에서는 `리스너 1, 마이크로태스크 1, 리스너 2, 마이크로태스크 2`였다.
- [ ] 위 Low 3건(연결 인용, realm 실행 컨텍스트 단순화, prerequisites의 timers) 사용자 결정 시 반영.
- [ ] 로드맵 4번 제너레이터 계획.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 체크포인트 시점의 주 근거를 처리 모델(태스크 뒤)이 아니라 스크립트·콜백 뒤 정리 단계("If the JavaScript execution context stack is now empty…")로 잡았다 — 처리 모델만으로는 예제 8(같은 message 태스크 안 리스너 사이)과 예제 7(click() 리스너 사이에는 없음)을 설명할 수 없다. 처리 모델의 체크포인트는 "이미 큐가 비어 실행할 마이크로태스크가 없다"로 함께 적었다.
- [Claude 판단] 시뮬레이터에서 체크포인트를 감싼 태스크 안에 그리고(지금 태스크 유지), 표준의 currently running task 변화(마이크로태스크로 바뀌었다가 null)는 simplifications로 밝혔다 — 독자가 "어느 태스크 안에서 일어나는가"를 보는 것이 목적이라서. 버린 대안: 표준 값을 그대로 그리기(태스크 칸이 null로 깜박여 리스너 2가 어느 태스크인지 흐려짐).
- [Claude 판단] 명세 정확성 리뷰 지적을 메모리 기준('명세와 다른 설명·오개념 위험은 High')으로 판정해 Medium·Low 다수도 수정했다 — 예: "Job은 요청된 순서대로"를 HostEnqueuePromiseJob으로 넣은 프로미스 Job으로 한정(HostEnqueueGenericJob은 순서 제약 없음).
- [Claude 판단] ECMAScript Note 1("…treat Promise-handling Jobs as a higher priority than other work")을 발견해 우선순위 오해 Callout을 "언제든 먼저 실행된다"로 바꿨다 — 우선순위라는 말 자체를 오해로 단정하면 명세 주석과 어긋난다.
- 예제 5에서 타이머를 뺐다(사용자 검토, 수정안 A) — 타이머와 둘째 스크립트의 순서는 두 스크립트가 같은 파서 태스크에서 처리될 때의 관찰일 뿐이다(외부 스크립트면 Chromium에서 바뀜).
- 실제 클릭은 "이 페이지의 테스트는 입력 이벤트를 만들지 않는다"로 쓰고 테스트로 올리지 않았다(사용자 검토 수정안 중 문구 쪽) — 테스트로 올리려면 공통 실행기 변경이 필요하다.

#### 배경지식

- HTML 정리 단계(clean up after running script)는 스크립트 실행과 Web IDL 콜백 호출(invoke a callback function, call a user object's operation) 끝에 불리고, 실행 컨텍스트 스택이 비었을 때만 체크포인트를 한다. click()은 스크립트 실행 도중 동기 디스패치라 리스너가 끝나도 전역 코드가 스택에 남는다.
- 체크포인트는 큐가 빌 때까지 반복하고(While…), 재진입 방지 플래그로 겹치지 않는다. 큐가 비어도 거부 알림 등 뒤 단계는 실행된다.
- ECMAScript는 Job을 스택이 빈 뒤 하나씩 끝까지 실행하라고, HostEnqueuePromiseJob으로 넣은 Job은 넣은 순서대로 실행하라고 요구한다. HTML은 그 Job을 마이크로태스크 큐에 넣어 체크포인트에서 실행한다.
- then 콜백이 프로미스가 아닌 값을 반환하면 그 Job 안의 resolve가 곧바로 다음 then의 Job을 큐 맨 뒤에 넣는다 — 그래서 두 체인이 번갈아 실행된다.

#### 확인 질문

1. 예제 7(click())과 예제 8(postMessage의 message)에서 마이크로태스크가 끼어드는 위치가 다른 이유는 무엇이고, 처리 모델의 "태스크 뒤 체크포인트"만으로 설명하면 왜 안 되는가?
   <details><summary>답</summary>두 경우 모두 리스너가 끝나면 정리 단계가 불리지만, click()은 스크립트 실행 도중 동기 디스패치라 스택에 전역 코드가 남아 체크포인트를 하지 않고, message는 브라우저 태스크에서 디스패치되어 스택이 비므로 리스너마다 체크포인트를 한다. 예제 8의 리스너 사이 체크포인트는 같은 태스크 안이라 처리 모델의 태스크 뒤 체크포인트로는 나올 수 없다(본문 '리스너 사이', `scenarios.ts` message 시나리오, 2절 사실).</details>
2. 예제 5에 처음 있던 0ms 타이머를 왜 뺐는가? 남겨 두면 독자가 어떤 잘못된 일반화를 할 수 있는가?
   <details><summary>답</summary>표준이 보장하는 것은 "첫 스크립트의 마이크로태스크가 둘째 스크립트보다 먼저"뿐이고, 타이머가 둘째 스크립트 뒤인 것은 두 스크립트가 같은 파서 태스크에서 처리될 때의 관찰이다. 둘째 스크립트가 외부 파일이면 Chromium에서 타이머가 먼저 나왔다. 남기면 "타이머는 모든 스크립트 요소가 끝난 뒤"로 일반화하기 쉽다(`변경 이력` 사용자 검토 1회 ①).</details>
3. 시뮬레이터의 "지금 태스크"는 체크포인트 동안 감싼 태스크를 그대로 보여 준다. 표준의 currently running task와 어떻게 다르며, 왜 이렇게 그렸는가?
   <details><summary>답</summary>표준은 마이크로태스크를 실행하는 동안 currently running task를 그 마이크로태스크로 바꾸고, 하나를 실행한 뒤 null로 되돌린다. 그림은 "어느 태스크의 단계를 실행하는 중인가"를 보이려고 감싼 태스크를 유지하고, 이 차이를 simplifications에 적었다(meta.ts simplifications, 3절 상태 모델).</details>
4. "Promise 콜백은 우선순위가 높다"는 말은 틀렸는가? 이 페이지는 이 말을 어떻게 다루는가?
   <details><summary>답</summary>ECMAScript Jobs 절의 주석(비규범)은 브라우저와 Node.js가 프로미스 Job을 다른 일보다 높은 우선순위로 다룬다고 적으므로 말 자체를 틀렸다고 단정하지 않는다. 오해는 "언제든 먼저"이고, HTML에서는 스택이 빌 때의 체크포인트라는 시점으로 나타난다 — 예제 7에서 마이크로태스크가 큐에 있어도 전역 코드가 남은 동안에는 실행되지 않는다(본문 오해 Callout 2).</details>
5. 예제 4의 콜백 a1이 `Promise.resolve()`를 반환하도록 바꾸면 무엇이 깨지는가?
   <details><summary>답</summary>"그 콜백의 Job이 끝날 때 곧바로 다음 Job이 들어감"이 성립하지 않는다. 프로미스 채택 절차 때문에 a2의 Job이 더 늦게 들어가 번갈아 실행되지 않는다(vm 확인: a1, b1, b2, b3, a2, b4). 페이지는 이 경우를 다루지 않는다고 한정했다(본문 두 체인 절, simplifications).</details>

