# 개념 '이벤트 루프와 태스크 큐' 구현 계획

- 상태: 완료
- 작성일: 2026-11-04
- 기준: `main` @ `05af92f`

## 0. 요약

- 목적: 38~42장 로드맵 8번 `/concepts/event-loop`를 추가한다. 42장 이벤트 루프(동기 코드가 끝나야 콜백 실행, 블로킹)와 추가 주제 4개(한 번에 태스크 하나, 콜백 안의 예약과 작업 쪼개기, `click()`은 태스크가 아님, 태스크 소스가 다르면 순서 보장 없음)를 큐 시뮬레이터 + 예제 6개 + 퀴즈로 WHATWG HTML 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `async`, order 410, 학습 순서 43번째·마지막, 시뮬레이터 3시나리오 — 공통 셸 `SimulatorShell` 사용, 개념 전용 `LoopView`). `timers` 페이지의 '작성 예정' 표현 두 곳을 이 페이지 링크로 바꾼다. 고정 테스트·e2e·빌드 테스트·content-guide·로드맵을 고친다. 공통 코드는 바꾸지 않는다.
- 위험: 시뮬레이터가 "타이머가 큐에 들어가는 시점"처럼 관찰할 수 없는 순간을 실제 동작처럼 보이게 하는 것, 그리고 서로 다른 태스크 소스의 순서를 표준 보장처럼 쓰는 것 → 시뮬레이터 설명과 단순화에 "큐에 들어가는 순간은 그림을 위해 고른 것이고 보장되는 것은 순서뿐"을 밝히고, 순서는 표준이 보장하는 것과 Chromium 관찰을 문장마다 나눈다.
- 복잡도: 중간 · Consensus: 생략. event-propagation-delegation과 같은 시뮬레이터 패턴(시나리오 데이터 + 개념 전용 View + 공통 셸)이고 공통 코드를 바꾸지 않는다. 예제 6개 출력은 실제 실행기로 3회씩 확인했고 인용 15개는 원문과 대조했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵 8번 "이벤트 루프와 태스크 큐"(42장)를 새 개념 페이지로 만든다.
- 사용자 결정(2026-11-04)
  - 기본 범위(로드맵): 동기 코드가 끝나야 타이머 콜백이 실행된다, 블로킹. 마이크로태스크(Promise)는 45장 별도 개념.
  - 추가 주제 4개 모두: **한 번에 태스크 하나**(run-to-completion), **콜백 안의 예약과 작업 쪼개기**, **`click()`은 태스크가 아님**(실제 사용자 클릭은 표준 근거로만), **태스크 소스가 다르면 순서 보장 없음**(Chromium 결과 + 표준 보장 아님).
  - 시각화: **큐 시뮬레이터**(콜 스택·대기 중인 타이머·태스크 큐·출력, 마지막 단계 출력은 예제 실행 결과와 테스트로 대조).
  - `timers` 페이지의 "이벤트 루프를 다루는 별도 개념(작성 예정)" 두 곳을 **이 페이지 링크로 바꾼다**(timers의 `reviewedAt`은 유지).
  - 제목 "이벤트 루프와 태스크 큐: 준비된 콜백은 왜 지금 코드가 끝날 때까지 기다릴까", slug `event-loop`, category `async`.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 이벤트 루프는 태스크를 하나씩 꺼내 끝까지 실행한다: HTML "An event loop has one or more task queues." 처리 모델 "Let taskQueue be one such task queue, chosen in an implementation-defined manner." → "Set oldestTask to the first runnable task in taskQueue, and remove it from taskQueue." → "Perform oldestTask's steps." 스크립트 실행도 태스크 안에서 일어난다("The HTML parser tokenizing one or more bytes, and then processing any resulting tokens, is typically a task."), 콜백 호출도 태스크다("Calling a callback is often done by a dedicated task."). 콜 스택은 [실행 컨텍스트](/concepts/execution-context)의 실행 컨텍스트 스택(ECMAScript "The execution context stack is used to track execution contexts.")이다. 이벤트 루프는 ECMAScript가 아니라 HTML 표준이 정한다.
  - ② 동기 코드가 끝나야 콜백이 실행된다(예제 1 `sync-and-timers.html`, 시뮬레이터 1): 타이머는 지연이 끝나면 콜백 태스크를 타이머 태스크 소스에 넣는다([타이머](/concepts/timers)의 "Let completionStep be an algorithm step which queues a global task on the timer task source given global to run task."). 스크립트 태스크가 50ms 동안 `while`로 붙잡으면 0ms·10ms 타이머 모두 그 뒤에야 실행(`스크립트 끝` → `a 0ms` → `b 10ms`).
  - ③ 한 번에 태스크 하나(예제 2 `long-task.html`): 콜백 태스크 `a`가 50ms 붙잡는 동안 이미 준비된 `b`도 기다린다(`b, a가 50ms 이상 붙잡음 true`). 처리 모델은 태스크 하나의 단계를 다 실행한 뒤에야 다음 반복에서 다음 태스크를 고른다.
  - ④ 콜백 안의 예약과 작업 쪼개기(예제 3 `nested.html`, 시뮬레이터 2 / 예제 4 `chunks.html`): 콜백 `a` 안에서 등록한 0ms 타이머 `c`는 이미 기다리던 `b` 뒤(`a 시작`, `a 끝`, `b`, `c`). 이 순서는 타이머의 순서 규칙(먼저 등록했고 지연이 같거나 짧으면 먼저)으로 보장된다. 긴 작업을 `setTimeout`으로 쪼개면 그 사이에 다른 타이머가 실행된다(`조각 1` → `다른 타이머` → `조각 2` → `조각 3`). 표준 timers 절에도 이 방식의 예시가 있다는 사실만 언급(코드 인용 안 함).
  - ⑤ `click()`은 태스크가 아니다(예제 5 `click-sync.html`, 시뮬레이터 3): HTML `click()` "Fire a synthetic pointer event named click at this element, with the not trusted flag set." — 큐를 거치지 않고 그 자리에서 디스패치하므로 리스너가 `click() 뒤`보다 먼저, 0ms 타이머보다도 먼저(`click() 전` → `click 리스너` → `click() 뒤` → `타이머 0ms`). HTML "Not all events are dispatched using the task queue; many are dispatched during other tasks." 실제 사용자 입력은 "Events sent in response to user input (e.g., click events) must be fired using tasks queued with the user interaction task source." — 이 페이지는 실제 입력을 만들지 않으므로 표준 근거로만 쓴다.
  - ⑥ 태스크 소스가 다르면 순서 보장 없음(예제 6 `task-sources.html`): `window.postMessage`는 "Queue a global task on the posted message task source given targetWindow to run the following steps:"로 다른 태스크 소스를 쓴다. 표준은 "For each event loop, every task source must be associated with a specific task queue."이고 큐 선택은 구현이 정한다(① 인용) — 다만 같은 소스 안의 순서는 지킨다("Note that in this setup, the processing model still enforces that the user agent would never process events from any one task source out of order."). 그래서 `타이머 1` → `타이머 2`는 보장, 그 사이의 `message m` 위치는 Chromium 결과.
  - ⑦ 이 페이지가 다루지 않는 것: 처리 모델은 태스크 하나 뒤에 "Perform a microtask checkpoint."를 하고 창이면 렌더링 갱신 기회도 있다 — 마이크로태스크는 45장 별도 개념(작성 예정, 링크 없음), 렌더링은 다루지 않음.
  - 결과와 이유: 흔한 오해 6개("0ms 콜백은 동기 코드 중간에라도 끼어든다", "콜백이 오래 걸려도 다른 준비된 콜백은 병렬로 실행된다", "콜백 안에서 등록한 0ms 타이머는 바로 다음에 실행된다", "click()도 이벤트 루프를 거친다", "모든 비동기 콜백은 하나의 큐에서 등록 순서대로 실행된다", "이벤트 루프는 자바스크립트 언어의 일부다").

### 유지해야 하는 기존 동작

- 기존 개념 42개는 timers 문구 두 곳 외에 수정하지 않는다. 하이드레이션 규칙. 시뮬레이터는 프리렌더 상태에서 첫 단계를 그린다.
- title·summary·tags에 '객체'를 쓰지 않는다. 첫 문단에 `**` 등 빌드 테스트 `firstProseLine`이 지우는 기호를 쓰지 않는다(timers에서 확인한 함정).

### 제외 범위

- 마이크로태스크·Promise·`queueMicrotask`(45장), `requestAnimationFrame`과 렌더링 갱신, `requestIdleCallback`, long task API
- 워커의 이벤트 루프, 여러 창·iframe의 이벤트 루프 공유, 이벤트 루프 중첩(spin the event loop)
- 실제 사용자 입력 이벤트(실행 확인 불가, 표준 근거로만), 네트워크 태스크
- 타이머 규칙 자체의 상세(timers 개념에서 다룸 — 링크)

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-04 내려받음: scratchpad `pd/std/webappapis.txt`, `el/std/` interaction·web-messaging·ecma, `tm/std/timers.txt`)

- 1절의 영어 인용 15개는 모두 사본에서 확인했다(공백 무시 대조 스크립트, 누락 0). 처리 모델은 `webappapis.txt:3164–3187`, 태스크 큐·소스 정의 `:3008–3066`, 일반 태스크 소스 `:3565–3575`, `click()` `interaction.txt:622–629`, `postMessage` `web-messaging.txt:144`.
- ECMAScript는 이벤트 루프를 정하지 않는다. 9.5 Jobs("Once evaluation of a Job starts, it must run to completion before evaluation of any other Job starts in an agent.")는 Job에 대한 규칙이고 HTML 타이머는 Job이 아니라 HTML 태스크이므로 본문 근거로 쓰지 않는다(`ecma.txt:9867–9876`).
- 참고 링크 anchor(사본에서 존재 확인): HTML `webappapis.html#event-loops`, `#event-loop-processing-model`, `#concept-task`, `#task-queue`, `#concept-task-source`, `#generic-task-sources`, `#user-interaction-task-source`, `#queue-a-global-task`; `timers-and-user-prompts.html#timer-task-source`; `interaction.html#dom-click`; `web-messaging.html#posted-message-task-source`; ECMAScript `#execution-context-stack`. MDN ko `Web/JavaScript/Reference/Execution_model`(옛 Event_loop 주소가 여기로 이동), `Web/API/HTMLElement/click`, `Web/API/Window/postMessage`(모두 200).

### 사실 (실행 확인 — 실제 실행기 `runBrowserExample`, settleMs 300, 초안 scratchpad `el/ex/`, 3회 연속 같은 출력)

| 예제 | 출력 |
| - | - |
| 1 `sync-and-timers.html` | `스크립트 시작`, `스크립트 끝`, `a 0ms`, `b 10ms` |
| 2 `long-task.html` | `a 끝`, `b, a가 50ms 이상 붙잡음 true` |
| 3 `nested.html` | `스크립트 끝`, `a 시작`, `a 끝`, `b`, `c` |
| 4 `chunks.html` | `조각 1`, `다른 타이머`, `조각 2`, `조각 3` |
| 5 `click-sync.html` | `click() 전`, `click 리스너`, `click() 뒤`, `타이머 0ms` |
| 6 `task-sources.html` | `타이머 1`, `message m`, `타이머 2` |

- 예제는 모두 `<!doctype html>` 문서 + 인라인 `<script>` 하나(예제 5만 `<button id="save">` 포함). 초안을 그대로 복사한다. 시간 측정은 `performance.now()`.
- 순서 보장 근거(타이머 순서 규칙 "먼저 등록했고 지연이 같거나 짧으면 먼저" — timers 개념): 예제 1의 `a`(0) → `b`(10), 예제 2의 `a` → `b`(같은 0ms, 등록 순서), 예제 3의 `b` → `c`(`c`는 `b`보다 나중에 등록, 같은 0ms), 예제 4의 `다른 타이머` → `조각 2`(조각 2의 타이머가 나중에 등록, 같은 0ms), 예제 5의 `타이머 0ms`가 스크립트 뒤. 예제 6은 `타이머 1` → `타이머 2`만 보장, `message m`의 위치는 Chromium 관찰.
- 시뮬레이터 대상 예제의 줄 번호(1-based): 예제 1 — 8 `console.log('스크립트 시작');`, 9–11 `a` 등록, 10 `console.log('a 0ms');`, 12–14 `b` 등록, 13 `console.log('b 10ms');`, 15–16 `while`, 17 `console.log('스크립트 끝');`. 예제 3 — 8–14 `a` 등록, 9 `a 시작`, 10–12 `c` 등록, 11 `console.log('c');`, 13 `a 끝`, 15–17 `b` 등록, 16 `console.log('b');`, 18 `스크립트 끝`. 예제 5 — 9 `var save`, 10–12 리스너 등록, 11 `click 리스너`, 13–15 타이머 등록, 14 `타이머 0ms`, 16 `click() 전`, 17 `save.click();`, 18 `click() 뒤`.
- 시뮬레이터 패턴: `app/concepts/event-propagation-delegation/`(`scenarios.ts` 상태 모델 주석 + 시나리오, `PathView.tsx`, `Simulator.tsx` 얇은 래퍼, `Simulator.test.tsx`, `concept.test.ts`의 `assertScenarioInvariants`와 개념별 불변식). 공통 셸 props는 `scenarios`·`label`·`renderState(state, prevState)`(`app/simulator/SimulatorShell.tsx:7–10`). 본문은 `import { Simulator } from './Simulator'`·`import { scenarios } from './scenarios'` 후 `<Simulator scenarios={scenarios} />`.
- timers 페이지의 바꿀 곳: `app/concepts/timers/content.mdx:13`("이벤트 루프를 다루는 별도 개념(작성 예정)으로 남겨 둡니다"), `:29`("큐에서 태스크를 고르는 규칙은 이벤트 루프 개념의 몫입니다"), `app/concepts/timers/meta.ts` 단순화 첫 항목("…별도 개념(작성 예정)의 몫입니다").
- 고정 테스트(직전 커밋 `05af92f` 패턴): concepts.test·ConceptPager.test(43, 마지막 `event-loop`), navigation.spec(카드 43, '43번째', 분모 /43, timers 42/43 링크 2개, event-loop 43/43), responsive.spec(홈 article 43 + 새 페이지 가로 스크롤 + 시뮬레이터 끝까지 진행 뒤 가로 스크롤), a11y.spec(새 페이지 axe + 시뮬레이터 진행 뒤 axe), helpers.ts(경로·시뮬레이터 이름 상수), build-output.test(시뮬레이터 region·첫 단계 텍스트·`<details` ≥10), content-guide e2e 목록.

### 추정

- 없음

## 3. 구현 전략

- 상태 모델(`scenarios.ts`, 단계마다 전체 스냅샷):

  ```ts
  type LoopState = {
    stack: string[]   // 콜 스택. 아래(먼저 쌓인 것)→위. 표시용 이름: '전역 코드', 'a 콜백', 'click 리스너' 등
    waiting: string[] // 지연이 끝나기를 기다리는 타이머의 콜백 이름(등록 순서)
    queue: string[]   // 타이머 태스크 큐. 앞이 먼저 꺼내진다
    task: string | null // 지금 실행 중인 태스크('스크립트' 또는 콜백 이름). 태스크 사이에는 null
  }
  ```

  호스트 함수(`setTimeout`, `console.log`) 프레임은 그리지 않는다(단순화). 시나리오 3개를 손으로 쓰되 작은 헬퍼로 중복을 줄인다(빌더로 일반화하지 않는다 — 시나리오마다 흐름이 다르다).
  - 1 `동기 코드와 타이머`(예제 1, 10단계 안팎): 스크립트 시작 → a 등록 → b 등록 → `while`(그 사이 a·b의 지연이 끝나 큐로, 스택은 아직 전역 코드) → 스크립트 끝 → 스크립트 태스크 끝 → a 꺼내 실행 → a 끝 → b 꺼내 실행 → b 끝(모두 빔).
  - 2 `콜백 안에서 예약`(예제 3, 12단계 안팎): a·b 등록 → 스크립트 끝(큐 a·b) → 태스크 끝 → a 시작 → a 안에서 c 등록(waiting c) → a 끝 → a 태스크 끝(c가 큐에서 b 뒤로) → b → c → 끝.
  - 3 `click()은 그 자리에서`(예제 5, 9단계 안팎): 리스너 등록 → 타이머 등록 → `click() 전` → `click()`(스택 전역 코드 위에 click 리스너, 큐를 거치지 않음, 출력 `click 리스너`) → `click() 뒤` → 스크립트 끝(큐에 타이머) → 타이머 실행 → 끝.
- `LoopView.tsx`: 세 칸(콜 스택 — 위가 지금 실행 중 / 대기 중인 타이머 / 태스크 큐 — 앞이 먼저)과 "지금 태스크" 한 줄. prevState와 달라진 칸에 "(바뀜)". event-propagation `PathView`의 클래스·`wrap`·`fade` 규칙을 따른다. 리스트는 `aria-label`을 단 `<ol>`, 빈 칸은 '비어 있음' 텍스트.
- 테스트(`concept.test.ts`): `assertScenarioInvariants`(코드 원문·마지막 출력 = expectedOutput·출력 prefix·line 범위) + 개념 불변식 — ① 이름은 stack/waiting/queue 중 동시에 두 곳에 없다(단, 실행 중인 태스크의 콜백은 stack에만) ② `task`가 null→X로 바뀌면 직전 단계 `queue[0]`이 X이고 이번 단계 queue에서 빠졌다(스크립트 첫 단계 제외) ③ `task !== null`이면 `stack[0]`이 그 태스크의 프레임이고, `task === null`이면 stack이 비었다 ④ queue에 들어가는 이름은 직전에 waiting에 있었다 ⑤ 새 출력 줄이 생긴 단계의 `line` 범위 안에 그 출력 문자열을 찍는 `console.log` 줄이 있다 ⑥ 마지막 단계는 stack·waiting·queue가 비고 task가 null ⑦ 고정 줄 번호의 원문(2절 줄 번호) 대조 ⑧ 단계 수 고정. 예제 출력 불변식: 예제 6에서 `타이머 1`이 `타이머 2`보다 앞(보장되는 부분만 단언), 예제 4에서 `다른 타이머`가 `조각 2`보다 앞.
- 버린 대안: 표 + 퀴즈(사용자 결정으로 시뮬레이터). 단계를 예제 출력에서 자동 생성하는 빌더(흐름이 시나리오마다 달라 손 작성 + 불변식 대조가 단순). 호스트 함수 프레임 표시(스택이 복잡해지고 교육 목적과 무관).

## 4. 변경 파일

- 추가 `app/concepts/event-loop/`: `meta.ts`, `content.mdx`, `route.tsx`(기존과 같은 얇은 모듈), `scenarios.ts`, `LoopView.tsx`, `LoopView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/` 6개.
- 수정(기존 개념 문구): `app/concepts/timers/content.mdx`(13행 링크, 29행 개념 이름), `app/concepts/timers/meta.ts`(단순화 첫 항목 문구). timers `reviewedAt` 유지.
- 수정(고정 테스트·문서): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch38-42.md`(마무리 때).
- 변경하지 않음: 공통 코드(`app/simulator/`, `app/components/`, `app/lib/` 본문, `app/routes/`).

### meta 안

- slug `event-loop`, title '이벤트 루프와 태스크 큐: 준비된 콜백은 왜 지금 코드가 끝날 때까지 기다릴까', category `async`, order 410, reviewedAt null.
- summary(160자 이하): "브라우저의 이벤트 루프는 태스크 큐에서 태스크를 하나씩 꺼내 끝까지 실행합니다. 동기 코드와 타이머 콜백의 순서, 블로킹, 콜백 안의 예약, click()이 태스크가 아닌 이유, 태스크 소스별 순서를 HTML 표준과 Chromium 실행으로 확인합니다."
- tags: 이벤트 루프, 태스크 큐, 태스크, 콜 스택, 블로킹, run-to-completion, 태스크 소스, 호스트 API
- prerequisites: 실행 컨텍스트(execution-context), 타이머(timers). related: timers, execution-context, event-propagation-delegation.
- simplifications(안): ① 콜 스택은 실행 컨텍스트를 이름으로만 그리고 호스트 함수(`setTimeout`·`console.log`) 프레임은 그리지 않는다 ② 시뮬레이터에서 타이머가 대기 칸에서 큐로 옮겨 가는 순간은 그림을 위해 고른 것이며 실제 시각은 관찰할 수 없다. 보장되는 것은 순서다 ③ 태스크 큐는 타이머 태스크 소스 하나로 그린다. 실제 브라우저는 여러 큐를 가지고 어느 큐를 고를지 구현이 정한다 ④ 스크립트 실행을 "스크립트 태스크" 하나로 그린다(파서 태스크 안에서 실행된다는 표준 서술을 단순화) ⑤ 마이크로태스크 체크포인트와 Promise는 별도 개념 ⑥ 렌더링 갱신, `requestAnimationFrame`은 다루지 않는다 ⑦ 실제 사용자 입력은 만들지 않으며, 입력 이벤트가 태스크로 들어온다는 것은 표준 근거로만 쓴다 ⑧ 예제 6의 `message m` 위치는 Chromium 결과 ⑨ 정확한 ms는 주장하지 않고 하한과 순서만 ⑩ 워커·여러 창의 이벤트 루프는 다루지 않는다 ⑪ 결과는 Chromium, `setTimeout`·`console`·`performance`·`postMessage`는 호스트 API.
- references(안): HTML 11개(2절 anchor), ECMAScript 1개, MDN ko 3개.

## 5. 위험 요소

- 시뮬레이터의 "큐로 옮김" 시점을 사실처럼 읽힘 → 해당 단계 설명에 "이 순간은 그림을 위해 고른 것"을 쓰고 단순화 ②(작업 순서 2·3, 리뷰에서 문장 확인).
- 상태 손 작성 오류(같은 이름이 두 칸에, 큐 순서와 실행 순서 불일치) → 3절 불변식 ①~⑥이 잡는다. 음성 확인: 한 단계 queue 순서를 바꾸면 실패(작업 순서 2).
- 태스크 소스 순서를 보장처럼 씀 → 예제 6 본문·퀴즈·오해에 "Chromium 결과"를 명시, 테스트는 보장되는 순서만 단언(작업 순서 2·3).
- 실행 시간 의존 출력이 흔들림 → 하한(50ms 이상)과 순서만, 3회 실행 확인(작업 순서 1).
- 시뮬레이터 가로 스크롤(375px) → 칸을 세로로 쌓고 `wrap` 적용, responsive e2e로 끝까지 진행 뒤 확인(작업 순서 4).
- timers 문구 변경이 timers 빌드·e2e를 깨뜨림 → timers 관련 테스트 포함 전체 `npm test`·test:build(작업 순서 4).
- MDX `{`·`<` → 코드 안에 두고, 영어 인용은 스크립트로 원문 대조.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "event-loop|이벤트 루프|홈 학습 순서 보기|timers|타이머"`
- 인용 대조: 본문 `>` 인용을 원문 사본과 공백 무시 비교, 누락 0.
- 브라우저(빌드 serve): ① 새 페이지 1280 라이트·375 다크에서 시뮬레이터 세 시나리오를 끝까지 진행해도 문서 `scrollWidth` = 창 너비 ② 단계마다 콜 스택·대기·큐 칸이 설명과 맞고 "(바뀜)" 표시가 바뀐 칸에만 ③ JS 끔에서 시뮬레이터 첫 단계와 퀴즈 정답 `<details>` 수 = 퀴즈 수 ④ timers 페이지의 새 링크가 `/concepts/event-loop`로 이동.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `examples/` 6개(초안 `cp`), `meta.ts`, 임시 `content.mdx`(필수 h2 3개), `route.tsx`
- 변경: 4절 meta 안, expectedOutput은 2절 표 그대로
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 3회 연속 통과, expectedOutput 한 줄 변경 시 실패(음성 확인 후 되돌림), 예제 파일 초안과 `diff -r` 동일

### 2. 시나리오·View·Simulator와 테스트

- 대상: `scenarios.ts`, `LoopView.tsx`, `LoopView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 변경: 3절 상태 모델·시나리오 3개·불변식. Simulator는 `label="이벤트 루프 시뮬레이터"`
- 주의사항: 단계 설명은 2~3문장, 큐로 옮기는 단계는 "그림을 위해 고른 순간"을 밝힘. 시나리오 code는 `examples/<file>?raw`
- 완료 조건: `npx vitest run app/concepts/event-loop` 통과, 음성 확인 2건(queue 순서 바꿈, 출력 줄 바꿈 → 실패 후 되돌림), lint·typecheck 통과

### 3. 본문

- 대상: `content.mdx`(1절 ①~⑦ h3, 예제 6개 `file=` 블록, 시뮬레이터 배치, 퀴즈 12개 이상, 결과와 이유에 흔한 오해 6개)
- 주의사항: 42장까지만 전제(마이크로태스크는 45장 별도 개념, 링크 없음). 첫 문단 산문, `**` 금지. 표준 보장과 Chromium 관찰을 문장마다 구분
- 완료 조건: `npm test`·lint·format:check·typecheck 통과, 영어 인용 전부 원문 일치

### 4. timers 링크·고정 테스트·e2e·빌드 테스트·문서

- 대상: timers 문구 3곳, 4절 고정 테스트 목록
- 완료 조건: 6절 명령 모두 통과, 6절 브라우저 확인 항목 확인

## 변경 이력

- 2026-11-04 (사용자 콘텐츠 검토 8건): ①[중] "콜백을 부르는 일도 태스크입니다" 단정 → 원문대로 "흔히 별도의 태스크", 예제 5의 `click()` 리스너처럼 지금 태스크 안에서 호출되는 콜백도 있음 ②절 제목 "click()은 태스크가 아니다" → "click()은 큐를 거치지 않는다", meta summary도 ③본문 "첫 태스크" → "실행할 수 있는(runnable) 첫 태스크", 단순화에 'Task queues are sets'와 FIFO 그림 이유 추가 ④표준 타이머 절 예시는 일을 하기 전에 다음 타이머를 등록하고 끝나면 `clearTimeout`하는 형태라 예제 4와 순서가 다름을 밝히고, 중첩 단계 4ms 규칙은 timers 해당 절(`#setinterval과-clear는-같은-맵을-쓴다`)로 링크, 예제 4는 세 단계라 걸리지 않음 ⑤콜백 안의 타이머 순서 조건을 "같거나 더 짧은 지연"으로 넓히고 먼저 등록한 더 긴 지연 타이머보다는 앞설 수 있음을 추가(본문 ④·결과와 이유·오해 3) ⑥첫 문단에 Node.js 같은 다른 호스트는 자기 이벤트 루프를 가지며 이 페이지 규칙이 그대로 적용된다고 볼 수 없음(이 페이지는 Node.js를 다루지 않음) ⑦"45장에서 다룰" → "마이크로태스크를 다루는 별도 개념(작성 예정)" ⑧'매크로태스크'는 표준 용어가 아니고 표준은 task라고 부름(웹앱 API 사본에 macrotask 없음 확인) — 단계 1·3
- 2026-11-04 (사용자 콘텐츠 검토 2차 1건): 흔한 오해 2의 "콜백도 태스크이므로" → "타이머 콜백도 태스크로 실행되므로"(본문 ①의 '흔히 별도 태스크'와 맞춤), 예제 3 제목을 "먼저 기다리던 같은 지연의 콜백 뒤에"로 좁힘 — 단계 3

## 구현 진행

- baseline (2026-11-04, `05af92f`): lint·format:check·typecheck 통과, `npm test` 115파일 3610개 통과. test:build·e2e는 `05af92f` 커밋 직전 통과 기록(미재실행). 예제 초안 scratchpad `el/ex/`, 실행 스크립트 `tm/run.mts`
- [x] 1. 예제·meta·route — 예제 6개 초안과 동일(`diff -r`), references 15개(HTML 11·ECMAScript 1·MDN ko 3), summary 141자, reviewedAt null. 음성 확인(서브에이전트, expectedOutput 변경 → 실패 후 원복)
- [x] 2. 시나리오·View·Simulator와 테스트 — 시나리오 sync 12·nested 15·click 12단계(nested는 'c가 b 뒤로', 'a 끝', 'a 태스크 끝'을 나눠 계획보다 많음), `LoopView`(지금 태스크 + 콜 스택·대기 중인 타이머·태스크 큐, 모바일 세로 쌓기, 바뀐 칸 "(바뀜)"), 테스트 48개(불변식 ①~⑥ + ⑦ 큐 이동 단계 설명 문구 + ⑧ nested·click + sync 보조, 고정 줄 원문, 예제 출력 불변식은 보장되는 순서만). 음성 확인 2건(서브에이전트: nested 큐 순서 뒤집기·출력 변경 → 실패 후 원복). 메인 수정: 콜백 실행 단계 설명 "꺼내져 태스크가 되고" → "큐 맨 앞의 a 콜백 태스크를 꺼내 실행", click 시나리오 큐 이동 설명의 "어느 쪽이든" 표현. 재검증(메인): vitest 3회 945개, lint·format:check·typecheck 통과
- [x] 3. 본문 — 서브에이전트 작성(h3 동작 원리 7·예제 6 + 시뮬레이터 절·흔한 오해 6, 퀴즈 13개, 영어 인용 15개 원문 일치). 메인 검토 후 직접 수정: "콜백 안에서 등록한 타이머는 큐의 맨 뒤에 들어간다" 서술 3곳(본문 ④·결과와 이유·오해 3) → "그 순간에 등록되므로 먼저 등록된 같은 지연의 타이머 뒤"(큐에 들어가는 시각은 관찰 불가, 순서는 타이머 순서 규칙이 보장). 재검증: lint·format:check·typecheck 통과, 인용 누락 0. `npm test`는 고정 테스트 4건만 실패(개수 42→43, 단계 4에서 수정)
- [x] 4. timers 링크·고정 테스트·e2e·빌드 테스트·문서 — diff 확인(timers 본문 2곳 링크·meta 단순화 평문, 개수 43·'43번째'·분모 /43, timers 42/43 링크 2개, event-loop 43/43, a11y 페이지·시뮬레이터 진행 뒤, responsive 페이지·첫 시나리오 끝까지, 빌드 describe `시뮬레이터 프리렌더 (event-loop)`, content-guide 목록). 재검증(메인): lint·format:check·typecheck 통과, `npm test` 118파일 3677개, `test:build` 348개, navigation 16개, 새 페이지·timers e2e 20개 통과
- 화면(빌드 serve): 1280 라이트·375 다크에서 세 시나리오를 끝까지 넘기는 동안 문서 scrollWidth 최대값 = 창 너비(1280·375), 375에서 칸이 세로로 쌓이고 바뀐 칸만 "(바뀜)"(nested 8단계 확인), JS 끔 `<details>` 13개(= 퀴즈 수)와 첫 단계 '단계 1: 스크립트 태스크 시작' 프리렌더, timers 페이지에 `/concepts/event-loop` 링크(본문 2 + 학습 순서 다음 1)
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 없음. Low 2(보고만) — ① 본문 ①의 "그 큐의 첫 태스크"는 원문의 'first runnable task'(실행 가능한 첫 태스크)를 줄인 표현 ② `click()` 시나리오는 디스패치를 하는 호스트 쪽 프레임 없이 리스너가 전역 코드 위에 바로 쌓이는 그림(단순화 ①에 호스트 함수 프레임을 그리지 않는다고 밝힘). 계획 대비 차이: nested 15단계(계획 12 안팎), 불변식 ⑦을 '큐 이동 단계 설명 문구'로 쓰고 줄 원문 대조는 별도 테스트
- 사용자 콘텐츠 검토 1차(8건) 반영(`변경 이력`). 재검증: lint·format:check·typecheck 통과, `npm test` 3677개, `test:build` 348개, navigation 16개, 새 페이지·timers e2e 20개 통과, 영어 인용 15개 원문 일치, timers 절 링크 앵커가 빌드 HTML의 h3 id와 일치
- 사용자 최종 승인(2026-11-04) → `reviewedAt` '2026-11-04'

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(새 개념 폴더 1개, 브라우저 예제 6개, 이벤트 루프 시뮬레이터 3시나리오, timers 문구 3곳, 고정 테스트·e2e·빌드 테스트·content-guide·로드맵). 공통 코드는 바꾸지 않았다.
- 달라진 점: 시뮬레이터 nested 15단계(계획 12 안팎), 개념 불변식 ⑦을 '큐 이동 단계의 설명 문구'로 쓰고 줄 원문 대조는 별도 테스트로. 퀴즈 13개, 영어 인용 15개. 사용자 검토로 첫 문단에 Node.js 범위 문장, 단순화에 태스크 큐가 set이라는 항목, timers 4ms 절 링크를 더했다.

### 코드 리뷰
- critical-code-review: Critical/High/Medium 없음, Low 2(본문의 runnable 생략 — 사용자 검토 ③으로 고침, click 시나리오에 호스트 디스패치 프레임 없음 — 단순화로 남김). 사용자 콘텐츠 검토 9건 모두 원문으로 확인해 반영.

### 후속 작업
- [ ] 다음 로드맵(43장 이후 또는 45장 프로미스·마이크로태스크) 범위 결정 — 이 페이지의 "마이크로태스크를 다루는 별도 개념(작성 예정)"을 그때 링크로
- [ ] 기존 개념의 역방향 링크 일괄 처리(event-propagation-delegation의 '다음 개념' 문구, this-binding의 타이머 this 등)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 시뮬레이터 상태를 `stack`·`waiting`·`queue`·`task` 네 칸의 전체 스냅샷으로 두고 시나리오를 손으로 썼다 — 단계 생성 빌더 대신, 테스트가 불변식(같은 이름이 두 칸에 없음, 태스크는 스택이 빌 때 큐 맨 앞에서만, 큐 순서 유지, 새 출력 줄의 line에 그 console.log, 마지막 출력 = 실제 실행 결과)으로 손 작성 오류를 잡는다.
- [Claude 판단] 타이머가 대기 칸에서 큐로 옮겨 가는 순간을 그림을 위해 고르고, 그 단계 설명마다 "보장되는 것은 실행 순서뿐"을 넣어 테스트로 강제했다 — 실제로 지연이 끝나는 시각은 관찰할 수 없다.
- [Claude 판단] ECMAScript 9.5 Jobs의 run-to-completion 문장을 근거로 쓰지 않았다 — HTML 타이머는 Job이 아니라 HTML 태스크이고, 근거는 HTML 처리 모델("Perform oldestTask's steps.")이다.
- [Claude 판단] 예제 6에서 테스트는 같은 소스 안의 `타이머 1` → `타이머 2`만 단언하고 `message m`의 위치는 단언하지 않았다(본문에서 Chromium 관찰로 표시).
- 콜백 호출을 "흔히 별도 태스크"로 고치고 `click()` 리스너처럼 지금 태스크 안에서 불리는 콜백을 구분했다(사용자 검토 반영).

#### 배경지식
- HTML 이벤트 루프: 반복마다 태스크 큐 하나를 구현이 고르고, 그 안에서 실행할 수 있는 첫 태스크를 꺼내 단계를 모두 실행한 뒤 마이크로태스크 체크포인트를 거친다. 그래서 태스크 하나가 끝나기 전에는 다른 태스크가 끼어들지 않는다.
- 스크립트 실행(파서 태스크 안)과 타이머 콜백은 각각 태스크다. 타이머는 지연이 끝나면 타이머 태스크 소스에 태스크를 넣는다.
- 태스크 소스마다 큐가 정해지고 큐 선택은 구현 몫이라 소스가 다르면 순서 보장이 없다. 같은 소스 안의 순서는 지켜진다.
- `click()`은 이벤트를 그 자리에서 디스패치해 리스너가 지금 태스크 안에서 실행된다. 실제 사용자 입력은 사용자 상호작용 태스크 소스의 태스크로 온다(표준 근거만).
- 콜 스택은 ECMAScript의 실행 컨텍스트 스택이지만, 이벤트 루프는 ECMAScript가 아니라 HTML(호스트)이 정한다. '매크로태스크'는 표준 용어가 아니다.

#### 확인 질문
1. 예제 1에서 10ms 타이머 `b`의 지연이 스크립트 실행 중에 이미 끝났는데도 `스크립트 끝` 뒤에 실행되는 이유를 처리 모델로 설명하면?
   <details><summary>답</summary>스크립트 실행도 태스크 하나이고, 처리 모델은 꺼낸 태스크의 단계를 모두 실행("Perform oldestTask's steps.")한 뒤에야 다음 반복에서 다음 태스크를 고른다. 큐에 들어간 b 태스크는 스크립트 태스크가 끝날 때까지 꺼내질 수 없다(본문 ①②, 예제 1, 시뮬레이터 sync).</details>
2. 시뮬레이터가 타이머를 큐로 옮기는 단계를 특정 시점에 두었는데, 이 시점이 바뀌면 출력이 달라지는가? 왜 테스트가 설명 문구까지 검사하는가?
   <details><summary>답</summary>출력은 달라지지 않는다. 스크립트 태스크가 끝나기 전에는 어떤 콜백도 실행되지 않고 순서는 타이머 순서 규칙이 정하기 때문이다. 다만 그 시점은 관찰할 수 없는 그림용 선택이라 독자가 사실로 읽지 않도록 단계 설명에 문구를 넣고 테스트(불변식 ⑦)로 강제했다(scenarios.ts `QUEUE_MOMENT`, concept.test.ts).</details>
3. `click()` 리스너와 0ms 타이머 중 리스너가 먼저인 이유는? 실제 사용자 클릭이었다면 무엇이 달라지는가?
   <details><summary>답</summary>`click()`은 "Fire a synthetic pointer event named click at this element..."로 그 자리에서 디스패치해 리스너가 스크립트 태스크 안에서 실행되고, 타이머 콜백은 스크립트 태스크가 끝난 뒤 별도 태스크다. 실제 클릭은 사용자 상호작용 태스크 소스의 태스크로 들어오므로 지금 스크립트 중간에 실행되지 않는다(표준 근거, 실행 확인 안 함)(본문 ⑤, 예제 5).</details>
4. 예제 6에서 테스트가 `message m`의 위치를 단언하지 않은 이유는? 무엇은 단언했나?
   <details><summary>답</summary>`postMessage`는 posted message 태스크 소스, 타이머는 타이머 태스크 소스이고 큐 선택은 "chosen in an implementation-defined manner"라 소스 사이 순서는 보장되지 않는다. 같은 소스 안의 순서는 지켜지므로 `타이머 1`이 `타이머 2`보다 앞이라는 것만 단언했다(본문 ⑥, concept.test.ts 예제 출력 불변식).</details>
5. 콜백 안에서 등록한 0ms 타이머가 먼저 등록된 다른 타이머보다 먼저 실행될 수 있는 경우는?
   <details><summary>답</summary>먼저 등록된 타이머의 지연이 더 길 때(예: 먼저 등록한 100ms 타이머)다. 순서 규칙은 "먼저 등록했고 지연이 같거나 짧은" 타이머만 앞에 둔다(본문 ④, 변경 이력 1차 ⑤).</details>
