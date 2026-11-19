# requestAnimationFrame 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-18
- 기준: `main` @ `d42d769`

## 0. 요약

- 목적: 추가 게시글 로드맵 2의 4번. requestAnimationFrame 콜백이 언제·어떤 순서로 실행되는지를 HTML 표준(애니메이션 프레임 콜백 실행 절차)과 Chromium 실행으로 설명하는 개념 페이지를 추가한다.
- 범위: 새 폴더 `app/concepts/request-animation-frame/`(browser 예제 7개·시뮬레이터 3시나리오·퀴즈), event-loop·microtask-queue·timers의 "다루지 않는다" 문구 5곳을 정해 둔 문장으로 교체, 순서 고정 테스트 68→69 / 공통 코드(`app/components`·`app/simulator`·`app/lib` 소스)는 바꾸지 않는다.
- 위험: 표준이 보장하지 않는 것(다음 프레임 타임스탬프가 엄격히 큼, rAF와 setTimeout 순서, 예외 보고와 체크포인트의 순서)을 사실처럼 쓰는 것, 병렬 테스트 부하에서 프레임 예제가 흔들리는 것.
- 복잡도: 중간 · Consensus: 수행 (새 시각화 상태 모델, 프레임 타이밍 의존 예제, 기존 3개 페이지 문구 변경)
- 미확정: 2건(기존 페이지 reviewedAt 유지 기본안, 제목 문구)

## 1. 요구사항

- 사용자 결정(2026-11-18): 로드맵 핵심 4개 + 추가 4개 모두, 형식은 시뮬레이터 + 퀴즈, slug `request-animation-frame`.
  - 핵심: (1) 같은 프레임의 콜백은 같은 타임스탬프 (2) 콜백 안에서 다시 등록한 콜백은 다음 프레임 (3) 콜백 하나가 끝날 때마다 마이크로태스크 체크포인트 (4) cancelAnimationFrame한 콜백은 실행되지 않음
  - 추가: (5) 프레임 중 취소(앞 콜백이 뒤 콜백을 취소) (6) 콜백 안 예외는 보고되고 같은 프레임의 다음 콜백은 실행 (7) 타임스탬프와 애니메이션 루프 (8) handle 번호
- order 441(microtask-queue 440 뒤, promise-static-methods 442 앞), category `async`, 예제는 모두 runtime browser.
- 유지: 기존 개념의 본문 의미, 홈 '객체' 검색 결과 18개(새 개념 title·summary·tags에 '객체'를 넣지 않음), 공통 코드.
- 제외: 렌더링 갱신의 나머지 단계(resize·scroll·스타일·레이아웃·ResizeObserver 등), 워커의 rAF(OffscreenCanvas), 숨겨진 문서가 렌더링 갱신 대상에서 빠지는 동작의 실측, requestIdleCallback, MutationObserver, Web Animations, 예외 보고와 마이크로태스크 체크포인트의 상대 순서.

## 2. 사실과 추정

### 사실 (코드·표준·실행에서 확인)

- 로드맵 4번 행: `.claude/plans/concept-roadmap-extras-2.md:40`, 탐침 메모(rAF·setTimeout 순서 비보장) `:53`.
- 기존 "다루지 않는다" 문구 5곳: `app/concepts/event-loop/content.mdx:106`(rAF 언급 없이 "창의 이벤트 루프에는 렌더링 갱신 기회도 있지만 이 페이지에서는 다루지 않습니다"), `app/concepts/event-loop/meta.ts:83`("렌더링 갱신과 requestAnimationFrame은 다루지 않습니다."), `app/concepts/microtask-queue/content.mdx:124`("렌더링 갱신과 `requestAnimationFrame`, `MutationObserver`도 다루지 않습니다."), `app/concepts/microtask-queue/meta.ts:112`("렌더링 갱신과 requestAnimationFrame, MutationObserver는 다루지 않습니다."), `app/concepts/timers/meta.ts:113`("워커의 타이머와 requestAnimationFrame, queueMicrotask는 다루지 않습니다.").
- 예외 처리 하위 주제: `app/concepts/error-handling/content.mdx:57`·`:65`(try 밖 에러, 전역 error 이벤트, report, preventDefault). error-handling의 order는 470(> 441, 뒷장).
- 학습 순서: 현재 68개, order 441 앞에 61개 → 새 개념은 62번째. order 442~480의 7개(promise-static-methods~es-modules)는 분자가 1씩 밀린다. 이웃: 이전 microtask-queue(61) · 다음 promise-static-methods(63).
- 순서·등록 테스트(d42d769가 바꾼 묶음과 같음): `app/lib/concepts.test.ts:104`·`:111-112`(total 68), `app/components/concept/ConceptPager.test.tsx:18`·`:28`(`/ 68`), `tests/e2e/navigation.spec.ts`(`/ 68` 42곳, microtask-queue 블록 `:642-653`, promise-static-methods 블록 `:655-667`, 그 뒤 블록 `:673`·`:687`·`:701`·`:715`·`:729`·`:743`의 분자, 홈 '객체' 검색 순위 배열 마지막 `'64'`(generator)→`'65'`), `tests/e2e/responsive.spec.ts:1668`(article 68), `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md:225` 목록.
- 시뮬레이터 패턴: `app/concepts/microtask-queue/`의 `scenarios.ts`(전체 스냅샷, `examples/*.html?raw`), `MicroView.tsx`(`sameList`로 바뀐 칸 판정 `:12`, `key={name}`), `Simulator.tsx`(SimulatorShell에 label·renderState만), `concept.test.ts`(시나리오 id·단계 수·FIXED_LINES·상태 불변식 `:154`·`assertScenarioInvariants` `tests/helpers/scenario-invariants.ts:5`), e2e(`a11y.spec.ts:1143` 시뮬레이터 진행 뒤 axe, `responsive.spec.ts:1423` 끝까지 진행 뒤 가로 스크롤).
- 브라우저 예제 실행기: load 뒤 `settleMs`(기본 300, 최대 2000) 대기 후 수집, 200ms 뒤 재수집해 같아야 함(`tests/helpers/run-browser-example.ts:177-199`), pageerror면 실패(전역 error 리스너에서 preventDefault하면 통과, `docs/content-guide.md` 브라우저 예제 절).
- HTML 표준(현행, 2026-11-18 받은 사본 — 세션 scratchpad `ia.txt`·`wa.txt`, 절 이름으로 인용):
  - Animation frames 절(`ia.txt:465-487`): `requestAnimationFrame(callback)`은 target(Window면 연관 Document)의 animation frame callback identifier(처음 0)를 1 늘려 handle로 쓰고 map에 넣어 반환 → 새 문서의 첫 handle은 1. `cancelAnimationFrame(handle)`은 map에서 그 handle을 Remove(없으면 아무 일 없음). run the animation frame callbacks(target, now): callbackHandles = map의 키 목록을 먼저 얻고, 각 handle이 아직 map에 있으면 `Let callback be callbacks[handle]. Remove callbacks[handle]. Invoke callback with « now » and "report"` — 실행되는 동안 그 handle은 이미 map에 없다.
  - Event loop processing model(`wa.txt:2768-2836`): 렌더링 기회가 있으면 last render opportunity time을 정하고 rendering task source에 update the rendering 태스크를 넣는다(중복 큐잉 가능, `:2772`). 그 태스크는 frameTimestamp = last render opportunity time을 읽고, docs마다 resize·scroll·… 뒤 animation frame callbacks를 frameTimestamp로 실행(`:2835`)하고 그 뒤 스타일·레이아웃. visibility state가 hidden인 문서는 docs에서 빠진다(`:2793`). "skip updating the rendering for other reasons" 단계(`:2803`)의 NOTE(`:2808`)는 타이머 콜백을 렌더링 없이 이어서 실행하는 예를 든다.
  - Rendering opportunity(`wa.txt:2886-2901`): "This specification does not mandate any particular model for selecting rendering opportunities"(60Hz는 예).
  - event-loop 본문 `content.mdx:14`·`:16`·`:26`: 반복마다 태스크 하나, 큐 선택은 구현 정의 → 렌더링 갱신도 태스크 하나라 충돌하지 않는다.
  - WebIDL invoke a callback function: "Clean up after running a callback" → "Clean up after running script"(HTML `wa.txt:1291-1296`: 실행 컨텍스트 스택이 비면 마이크로태스크 체크포인트) → completion이 abrupt이고 "report"면 "Report an exception". 즉 표준 순서는 체크포인트 → 예외 보고.
- Chromium 탐침(실행기와 같은 조건, 아래 예제 원문 각 20회 같은 출력). 별도 탐침:
  - `setTimeout(0)`과 rAF를 함께 등록하면 이 조건에서 `timeout → raf`(로드맵 메모의 다른 조건에서는 반대).
  - 예외를 던지는 rAF 콜백이 마이크로태스크를 넣으면 Chromium에서는 `error 이벤트 → then` 순서였다(표준 순서와 반대). → 예제에 넣지 않고 simplifications에 밝힌다.

### 추정

- 병렬 `npm test` 부하에서도 예제가 settleMs 안에 끝난다 — 근거: 60Hz면 5프레임에 약 83ms, 단독 실행 20회 안정. animation-loop는 settleMs 1000. 작업 순서 6에서 전체 `npm test` 3회로 확인.

## 3. 구현 전략

- microtask-queue 시뮬레이터 패턴을 따른다(개념 폴더 안의 scenarios/View/Simulator, 공통 셸). 공통 코드는 건드리지 않는다. 태스크 큐는 그리지 않는다(이 주제에 필요 없음, 단계 설명과 simplifications에 생략을 밝힘).
- 상태 모델(전체 스냅샷):
  ```ts
  type RafState = {
    stack: string[] // 콜 스택(아래 → 위), 호스트 함수 프레임은 그리지 않음
    callbacks: { handle: number; name: string }[] // 애니메이션 프레임 콜백 맵(handle 순서)
    frameHandles: number[] | null // 이번 run에서 처리할 handle 목록(callbackHandles), 렌더링 갱신 중에만
    current: number | null // 지금 검사하거나 실행 중인 handle
    microtasks: string[]
    task: string | null // '스크립트' | '렌더링 갱신 (프레임 1)' | '렌더링 갱신 (프레임 2)'
    frameTime: string | null // 'T1' | 'T2' 같은 기호(실제 ms는 쓰지 않음)
    checkpoint: boolean
  }
  ```
  핵심은 `frameHandles`(run 시작 때 얻은 키 목록)와 `callbacks`(맵)를 나눠 그리는 것이다. 콜백을 실행하는 단계에서는 그 handle을 맵에서 이미 지운 상태로 그린다(Remove 뒤 Invoke). 다시 등록한 콜백은 맵에만 생기고 목록에 없어서 다음 run, 프레임 중 취소된 handle은 목록에 있어도 맵에 없어서 건너뛴다(`current`가 그 handle이고 스택이 빈 "건너뜀" 단계).
- 용어: 본문에서 "프레임"은 렌더링 갱신 태스크 한 번(그 안의 run the animation frame callbacks 한 번)을 말한다고 정의한다.
- 시나리오 3개: `next-frame`(핵심 2, 예제 2), `microtask-between`(핵심 3, 예제 3), `cancel`(핵심 4·추가 5, 예제 4, 맵에 handle 1~4가 보임 → 추가 8과 연결). 렌더링 기회가 오는 순간은 관찰할 수 없으므로 "그림을 위해 고른 순간"이라고 단계 설명에 밝힌다(microtask-queue `QUEUE_MOMENT` 방식). 단계 수는 구현에서 정하고 concept.test에 고정한다.
- FrameView: MicroView를 참고하되 callbacks는 `{handle,name}[]`이라 바뀐 칸 판정과 React key를 handle 기준으로 새로 짠다.
- 예제(모두 `.html`, 줄 번호 고정). 각 파일은 아래 머리 5줄 + 본문 + 꼬리 3줄이다:

  ```html
  <!doctype html>
  <html lang="ko">
  <head><meta charset="utf-8"></head>
  <body>
  <script>
  ```

  ```html
  </script>
  </body>
  </html>
  ```

  | 예제 | 파일 | expectedOutput | 틀린 모델과 갈리는 점 |
  | --- | --- | --- | --- |
  | 1 | same-timestamp.html | `2 true` | "콜백마다 실행 시작 시각을 받는다" — 첫 콜백이 5ms를 바쁘게 기다리므로 그 모델이면 `false`(표준: 같은 run의 콜백은 같은 now) |
  | 2 | next-frame.html | `스크립트 끝`, `raf1`, `raf2`, `raf3 true` | 순서는 "같은 run 끝에 실행" 모델과 같다. 갈리는 것은 `t3 > t1`뿐이고 엄격한 증가는 Chromium 관찰(표준이 보장하는 것은 다음 run에서 실행된다는 것과 t3 ≥ t1) |
  | 3 | microtask-between.html | `스크립트 끝`, `raf1`, `then`, `raf2` | "마이크로태스크는 run의 콜백이 모두 끝난 뒤" — 그 모델이면 `raf2`가 `then` 앞(표준: 콜백마다 체크포인트) |
  | 4 | cancel.html | `B`, `D` | "run이 시작되면 취소가 안 듣는다/콜백을 복사해 둔다" — 그 모델이면 `C`도 출력. `A`가 없는 것은 run 전 취소 |
  | 5 | handles.html | `1 2`, `취소 끝` | handle이 0부터라는 추측. 없는 handle 취소가 오류라는 추측(오류면 `취소 끝` 전에 pageerror로 실패) |
  | 6 | callback-error.html | `error 이벤트 boom`, `raf2 true` | "던지면 그 run이 멈추고 남은 콜백은 다음 프레임" — 그 모델이면 타임스탬프가 달라 `false`(같은 run이면 같다는 것은 표준 보장, 다음 프레임에서 달라지는 것은 Chromium 관찰) |
  | 7 | animation-loop.html (settleMs 1000) | `5 true` | "한 번 등록하면 매 프레임 반복(setInterval처럼)" — 그 모델이면 `6 true`…가 더 찍혀 안정 검사 실패. 5번째 시각이 첫 시각보다 크다는 것만 보이며 엄격한 증가는 Chromium 관찰 |

  본문(머리·꼬리 사이, 6행부터):

  same-timestamp.html
  ```js
  var times = [];
  requestAnimationFrame(function (t) {
    times.push(t);
    var end = performance.now() + 5;
    while (performance.now() < end) {}
  });
  requestAnimationFrame(function (t) {
    times.push(t);
    console.log(times.length, times[0] === times[1]);
  });
  ```
  next-frame.html
  ```js
  requestAnimationFrame(function (t1) {
    console.log('raf1');
    requestAnimationFrame(function (t3) {
      console.log('raf3', t3 > t1);
    });
  });
  requestAnimationFrame(function () {
    console.log('raf2');
  });
  console.log('스크립트 끝');
  ```
  microtask-between.html
  ```js
  requestAnimationFrame(function () {
    console.log('raf1');
    Promise.resolve().then(function () {
      console.log('then');
    });
  });
  requestAnimationFrame(function () {
    console.log('raf2');
  });
  console.log('스크립트 끝');
  ```
  cancel.html
  ```js
  var a = requestAnimationFrame(function () {
    console.log('A');
  });
  cancelAnimationFrame(a);
  var c;
  requestAnimationFrame(function () {
    console.log('B');
    cancelAnimationFrame(c);
  });
  c = requestAnimationFrame(function () {
    console.log('C');
  });
  requestAnimationFrame(function () {
    console.log('D');
  });
  ```
  handles.html
  ```js
  var h1 = requestAnimationFrame(function () {});
  var h2 = requestAnimationFrame(function () {});
  console.log(h1, h2);
  cancelAnimationFrame(999);
  console.log('취소 끝');
  ```
  callback-error.html
  ```js
  var times = [];
  window.addEventListener('error', function (event) {
    event.preventDefault();
    console.log('error 이벤트', event.error.message);
  });
  requestAnimationFrame(function (t) {
    times.push(t);
    throw new Error('boom');
  });
  requestAnimationFrame(function (t) {
    times.push(t);
    console.log('raf2', times[0] === times[1]);
  });
  ```
  animation-loop.html
  ```js
  var start = null;
  var frames = 0;
  function step(t) {
    if (start === null) start = t;
    frames += 1;
    if (frames < 5) {
      requestAnimationFrame(step);
      return;
    }
    console.log(frames, t > start);
  }
  requestAnimationFrame(step);
  ```

- 본문 구성(microtask-queue를 따름): `## 동작 원리`(h3: 콜백 맵과 handle / run 시작 때 목록을 먼저 얻는다 / 같은 run의 콜백은 같은 타임스탬프 / 콜백마다 체크포인트 / 예외는 보고하고 다음 콜백으로 / 렌더링 기회는 브라우저가 정한다 / 이 페이지가 다루지 않는 것) → `## 예제`(예제 1~7, 예제마다 PredictQuiz, `### 한 단계씩 따라가기`에 Simulator) → `## 결과와 이유`(결과 표 + 흔한 오해 3개: "rAF는 setTimeout(fn, 0)보다 먼저/16.7ms마다 실행된다" — 표준이 정하지 않음, 근거는 렌더링 기회 모델 미지정·큐 선택 구현 정의·타이머 합치기 NOTE, 예제 출력에 넣지 않음 / "콜백 안에서 다시 부르면 이번 프레임에 실행된다" — 다음 프레임 / "cancel은 프레임 시작 전에만 듣는다" — 프레임 중에도).
- 표준과 Chromium 구분: 엄격한 타임스탬프 증가(예제 2·6·7)는 본문·simplifications에 Chromium 관찰로 쓴다. 예외 보고와 체크포인트 순서는 본문에서 주장하지 않고 simplifications에 "WebIDL은 체크포인트 뒤 보고, Chromium에서는 error 이벤트가 먼저였음, 다루지 않음"으로 밝힌다.
- 예제 6의 throw·전역 error 이벤트·preventDefault는 뒷장 개념이라 본문은 `[try/catch/finally](/concepts/error-handling)에서 다룹니다`로 링크하고 simplifications에 "try/catch/finally 개념에서 다룹니다", related에 `error-handling`.
- 제목 안: "requestAnimationFrame: 콜백 안에서 다시 부르면 왜 다음 프레임에 실행될까". summary 160자 이하, '객체' 없음.
- 버린 대안: (a) event-loop 시뮬레이터에 렌더링 단계 추가 — 다른 개념 폴더와 그 테스트·e2e를 흔든다. (b) 비교표만 — 사용자가 시뮬레이터 선택. (c) performance.now()와 타임스탬프 비교 예제 — 시간 해상도 거칠게 만들기까지 따져야 해 보장 근거가 약하다. (d) 예제 6에 마이크로태스크를 넣어 보고·체크포인트 순서 보이기 — Chromium이 표준 순서와 반대라 이 페이지 범위를 넘는다.

## 4. 변경 파일

- 추가: `app/concepts/request-animation-frame/` — `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `FrameView.tsx`, `FrameView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/*.html` 7개. 계획 문서 `.claude/plans/request-animation-frame.md`.
- 수정(문구, 바꾼 뒤 문장을 그대로 쓴다):
  - `app/concepts/event-loop/content.mdx:106`: "창의 이벤트 루프에는 렌더링 갱신 기회도 있지만 이 페이지에서는 다루지 않습니다." → "창의 이벤트 루프에는 렌더링 갱신 기회도 있지만 이 페이지에서는 다루지 않습니다. 렌더링 갱신에서 애니메이션 프레임 콜백을 실행하는 단계는 [requestAnimationFrame](/concepts/request-animation-frame)에서 다룹니다."
  - `app/concepts/event-loop/meta.ts:83`: → "렌더링 갱신은 다루지 않습니다. requestAnimationFrame은 requestAnimationFrame 개념에서 다룹니다." + related에 `request-animation-frame`.
  - `app/concepts/microtask-queue/content.mdx:124`: "렌더링 갱신과 `requestAnimationFrame`, `MutationObserver`도 다루지 않습니다." → "렌더링 갱신과 `MutationObserver`도 다루지 않습니다. `requestAnimationFrame` 콜백 사이의 체크포인트는 [requestAnimationFrame](/concepts/request-animation-frame)에서 다룹니다."
  - `app/concepts/microtask-queue/meta.ts:112`: → "렌더링 갱신과 MutationObserver는 다루지 않습니다. requestAnimationFrame은 requestAnimationFrame 개념에서 다룹니다." + related.
  - `app/concepts/timers/meta.ts:113`: → "워커의 타이머와 queueMicrotask는 다루지 않습니다. requestAnimationFrame은 requestAnimationFrame 개념에서 다룹니다." + related.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(`/ 68`→`/ 69`, 62번째 이후 분자 +1, 새 개념 블록 추가, microtask-queue의 다음·promise-static-methods의 이전을 request-animation-frame으로, `'64'`→`'65'`), `responsive.spec.ts`(article 69, 가로 스크롤·시뮬레이터 끝까지 진행 케이스), `a11y.spec.ts`(개념 페이지·시뮬레이터 진행 뒤 케이스), `helpers.ts`(`REQUEST_ANIMATION_FRAME_PATH`, `REQUEST_ANIMATION_FRAME_SIMULATOR_NAME`), `tests/build/build-output.test.ts`(프리렌더 블록), `docs/content-guide.md:225` 목록, `.claude/plans/concept-roadmap-extras-2.md:40` 상태(finalize 때).
- 변경하지 않음: `app/simulator/*`, `app/components/*`, `app/lib/*` 소스, 실행기, error-handling 페이지.

## 5. 위험 요소

- 프레임 타이밍 예제가 병렬 부하에서 흔들림 → animation-loop settleMs 1000, 작업 순서 6에서 전체 `npm test` 3회.
- 표준 보장과 Chromium 관찰 혼동(엄격한 타임스탬프 증가, rAF/setTimeout 순서, 보고·체크포인트 순서) → 3절 구분 규칙, 리뷰에서 본문 대조.
- 시뮬레이터 상태가 표준과 다름 → concept.test 불변식: (a) rAF 콜백이 스택에 있는 단계에서 `current`는 frameHandles에 있고 callbacks에는 없다 (b) 건너뜀 단계는 스택이 비어 있고 `current`가 frameHandles에 있고 callbacks에 없다 (c) 렌더링 갱신 중 새로 등록한 handle은 frameHandles에 없다 (d) 다음 rAF 콜백이 시작될 때 microtasks가 비어 있다 (e) frameTime은 렌더링 갱신 중에만 있고 같은 프레임 안에서 바뀌지 않는다.
- 순서 테스트 누락 → `grep -rn "/ 68\|toBe(68)\|toHaveCount(68)" app tests` 0건 + navigation.spec 통과(분자 이동은 grep으로 못 잡으므로 e2e가 완료 조건).
- 홈 '객체' 검색 개수 변화 → concept.test에 `filterConcepts([concept], '객체')` 빈 배열.
- 기존 문구가 새 페이지가 다루지 않는 렌더링 갱신 전반까지 보증 → 4절의 정해진 문장만 사용.
- 뒷장 개념(error-handling) 전제 → 링크·simplifications·related.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`, 전체 `npm test`는 3회.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "request-animation-frame|requestAnimationFrame|홈 학습 순서 보기|event-loop|이벤트 루프|microtask-queue|마이크로태스크 큐|timers|타이머"`.
- 브라우저(dev 재시작): 375px·다크에서 pager '62 / 69', 이전 microtask-queue·다음 promise-static-methods, 시뮬레이터 3시나리오를 끝까지 진행해도 가로 스크롤 없음, 정답 확인 버튼 7개, 키보드로 시뮬레이터 조작.

## 7. 미확정 사항

- [미확정] 기존 3개 페이지 문구를 고쳐도 그 페이지들의 `reviewedAt`은 유지(기본안, 이전 개념들과 같음).
- [미확정] 제목 문구(3절 안). 승인 때 바꿀 수 있음.

## 8. 작업 순서

### 1. 예제와 meta

- 대상: `examples/*.html` 7개, `meta.ts`, `route.tsx`
- 현재: 없음
- 변경: 3절 원문 그대로 예제 작성. meta(title·summary·category async·order 441·tags·goals·prerequisites event-loop·microtask-queue·timers·related(event-loop, microtask-queue, timers, error-handling)·examples(animation-loop만 settleMs 1000)·simplifications·references(HTML 표준 Animation frames·update the rendering·MDN requestAnimationFrame/cancelAnimationFrame, 링크를 열어 확인)·reviewedAt null).
- 이유: 예제 출력이 이후 모든 단계의 근거다.
- 주의사항: meta → content → route 순(dev 서버 캐시). simplifications: Chromium 기준·헤드리스, 렌더링 기회 시점 관찰 불가, 엄격한 타임스탬프 증가는 Chromium 관찰, 보고·체크포인트 순서, 렌더링 갱신의 다른 단계 생략, 태스크 큐 생략, 숨겨진 문서, rAF/setTimeout 순서 비보장, 호스트 API, try/catch/finally 개념.
- 완료 조건: `npx vitest run tests/examples.test.ts -t request-animation-frame` 통과, `tests/content-integrity.test.ts` 통과.

### 2. 시뮬레이터

- 대상: `scenarios.ts`, `FrameView.tsx`(+test), `Simulator.tsx`(+test)
- 변경: 3절 상태 모델, 시나리오 3개, 마지막 단계 output = expectedOutput.
- 주의사항: 프리렌더 첫 단계가 JS 없이 보여야 함. 실행 단계에서 handle을 맵에서 지운 상태로 그린다. 바뀐 칸 판정·key는 handle 기준.
- 완료 조건: `npx vitest run app/concepts/request-animation-frame` 통과, typecheck 0.

### 3. 본문

- 대상: `content.mdx`
- 변경: 3절 구성, 예제 7개마다 PredictQuiz, 결과 표, 흔한 오해 3개. "복사해서·공유해서" 0건.
- 완료 조건: `npm test`(result-tables 포함)와 `npm run test:build` 통과, 본문에 "엄격"·"보장" 문장이 3절 구분 규칙과 맞는지 메인이 grep으로 확인.

### 4. concept.test

- 변경: 시나리오 id·단계 수·FIXED_LINES·5절 불변식 (a)~(e), 퀴즈 정답 = expectedOutput을 ' / '로 이은 문자열, 메타 조건('객체' 없음, order 441, async, 예제 모두 browser).
- 완료 조건: 시나리오 한 단계의 callbacks(실행 중 handle을 맵에 남김)나 output을 일부러 바꾸면 실패함을 확인한 뒤 되돌림.

### 5. 기존 페이지 문구와 순서·등록

- 대상: 4절 수정 목록.
- 완료 조건: 5곳 문장이 4절 목표 문장과 같다(grep), `grep -rn "/ 68\|toBe(68)\|toHaveCount(68)" app tests` 0건, 3개 페이지 related에 `request-animation-frame`.

### 6. 전체 검증

- 6절 전부. 전체 `npm test` 3회 연속 통과, navigation.spec 통과, `-g` 패턴 e2e 통과, 브라우저 시나리오.

## 9. 추가 개선 후보

- timers meta의 queueMicrotask 문구가 microtask-queue 링크/이름 없이 남아 있음(이번 범위 밖).
- 애니메이션 루프에서 처음 받은 handle을 취소해도 루프가 멈추지 않는 오해(다시 등록할 때마다 새 handle) 예제.
- handle 카운터가 setTimeout id와 별개임을 보이는 예제.
- MutationObserver 개념(로드맵 메모의 후보).

## 변경 이력

- 2026-11-18 (Consensus 검토): Architect High 1(실행 중 handle은 맵에 없음 — Remove 뒤 Invoke)·Medium 1(`current` 필드), Critic Medium 6(예제 2·7의 엄격한 증가는 Chromium 관찰, 예제 6에 같은 run 타임스탬프 증거 추가, 보고·체크포인트 순서 — Chromium은 표준과 반대라 다루지 않음, 타이머 합치기 NOTE의 단계 이름과 근거 보강, 기존 문구 5곳의 목표 문장 확정, error-handling 링크) 반영. Low: frameTime 기호, navigation 분자 이동·새 블록, handles.html의 효과 없는 줄 삭제, 예제 7의 틀린 모델, "숨겨진 문서" 표현, 근거 줄 번호, 완료 조건(전체 npm test 3회, e2e 패턴).
- 2026-11-18 (사용자 승인): 계획 승인. 미확정 2건 기본안 확정 — 기존 3개 페이지 reviewedAt 유지, 제목은 3절 안.
- 2026-11-18 (리뷰 지적): 예외 보고·체크포인트 순서의 Chromium 탐침 결과를 simplifications에 쓰기로 한 3절 결정을 철회 — 예제로 검증하지 않은 실행 결과 주장이라 AGENTS.md 정확성 원칙과 충돌. "Web IDL 순서는 이렇다, Chromium 순서는 예제로 확인하지 않았다"로 줄임. 영향 단계 1(meta).
- 2026-11-18 (사용자 검토): 5건 반영 — "렌더링 기회는 관찰할 수 없다"를 "언제 올지 미리 알 수 없고 간격도 보장되지 않지만, 지나간 렌더링 기회의 시각은 타임스탬프로 전달된다"로(본문·안내문·시뮬레이터·meta), 예외 보고·체크포인트 순서를 세 곳에서 "Web IDL 서술로는 체크포인트 먼저, 실행으로 확인하지 않음"으로 통일, 맵이 ordered map이라 등록 순서대로라는 근거 추가, 콜백 인수는 타임스탬프(표준 알고리즘이 now라 부름), "듣는다"→"효력이 있다/적용된다"·"호스트 함수의 프레임"→"스택 프레임". 문장 수정만이라 재승인 없음 — 영향 단계 1·2·3.

## 구현 진행

- baseline (2026-11-18, `d42d769`): lint 0 / format:check 통과 / typecheck 0 / test 176파일 5496개 / test:build 542개 — 같은 세션에서 d42d769 커밋 직전·직후에 실행한 결과(이후 코드 변경 없음).
- [x] 1. 예제와 meta — 예제 7개 계획 원문 그대로, `tests/examples.test.ts -t request-animation-frame` 7개 통과. references에 Rendering opportunity·Clean up after running script·Web IDL invoke 3개를 더함(본문이 설명하는 개념).
- [x] 2. 시뮬레이터 — next-frame 18·microtask-between 16·cancel 17단계, 실행 중 handle은 맵에 없음, cancel의 handle 3 건너뜀 단계, `npx vitest run app/concepts/request-animation-frame` 통과.
- [x] 3. 본문 — 동작 원리 h3 7개, 예제 7개·퀴즈 7개, 결과 표, 흔한 오해 3개. 메인이 고친 것: "표준이 타임스탬프가 앞 값보다 작지 않음을 보장" 문장 3곳(본문·meta·시나리오)을 삭제 — HR-Time의 coarsen time이 "potentially jitter"를 허용해 근거가 없음. "실행이 끝난 뒤 새로 들어온 handle" → "목록을 얻은 뒤 새로 들어온 handle".
- [x] 4. concept.test — 불변식 (a)~(e)·퀴즈·메타 조건. 실행 중 handle을 맵에 남기는 변조로 (a)(b)(c) 실패 확인 뒤 원복.
- [x] 5. 기존 문구와 순서·등록 — 5곳 문장이 계획 4절과 같음(diff 확인), `/ 68` 0건, navigation 분자 62→63 … 68→69와 새 블록, '64'→'65'. 메인이 e2e 단계 수를 고정(a11y `단계 4 / 18`, responsive 17번 클릭 `단계 18 / 18`).
- [x] 6. 전체 검증 (2026-11-18) — lint 0 / format:check 통과 / typecheck 0 / npm test 3회 연속 179파일 5595개 / test:build 549개 / e2e navigation 16개 + `-g "request-animation-frame|requestAnimationFrame|홈 학습 순서 보기|event-loop|이벤트 루프|microtask-queue|마이크로태스크 큐|timers|타이머"` 44개 통과. 브라우저(dev 재시작, 375px·다크): pager '62 / 69'·이전 microtask-queue·다음 promise-static-methods, 정답 확인 버튼 7개, 문서 폭 375, cancel 시나리오 13단계(handle 3 건너뜀)에서 맵 [4]·목록 [2,3,4] 표시.
- 리뷰 1차 (critical-code-review, Opus 교차 검토): High 1 · Medium 2 · Low 9 → 모두 수정
  - High: 예제 2는 출력 순서만으로 "같은 실행 끝에 붙는" 모델을 배제하지 못하는데 본문·퀴즈·흔한 오해가 순서로 증명된 것처럼 씀 → 본문에 "같은 실행이면 같은 타임스탬프(표준) → true(Chromium)가 다른 실행의 증거" 추론을 명시, 퀴즈 선택지에 `… / raf3 false`, 흔한 오해의 "raf2 다음이 아니라" 수정.
  - Medium: meta의 검증되지 않은 Chromium 순서 주장 삭제(변경 이력), "스크립트 태스크" 단순화를 simplifications에 추가하고 첫 단계 설명 수정.
  - Low: "한 번만"→"많아야 한 번", 예제 7은 "뒤 프레임", "보이지 않는 문서"→"가시성 상태가 hidden인 문서", 예제 5 표 칸, 정리 단계 괄호, "보장되는 것은 그림에 나온 콜백의 실행 순서", FrameView 목록 hint, "rAF" 약어, concept.test에 목록=맵 스냅숏·마지막 handle 처리 불변식 추가.
  - 재리뷰: 메인이 수정 diff(본문 22·30·77-84·309행, meta simplifications, scenarios 첫 단계·FRAME_MOMENT, FrameView hint, concept.test (f)(g))를 다시 읽음 → High·Medium 해소. (f)(g)는 데이터 변조로 실패 확인. 재검증 lint 0 / format:check 통과 / typecheck 0 / test 179파일 5601개 / test:build 549개 / e2e navigation 16개 + 관련 44개 통과.
- 사용자 검토 (2026-11-18): 중간 1·낮음 4건 → 모두 수정. 메인이 표준 사본으로 확인(ia.txt `ordered map`·`FrameRequestCallback = undefined (DOMHighResTimeStamp time)`, wa.txt frameTimestamp = last render opportunity time, WebIDL Return 단계 순서). 재검증 lint 0 / format:check 통과 / typecheck 0 / test 179파일 5601개 / test:build 549개 / e2e `-g "request-animation-frame|requestAnimationFrame"` 12개 통과.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(order 441, async, 62번째 / 69, browser 예제 7개, 퀴즈 7개, 시뮬레이터 3시나리오 next-frame 18·microtask-between 16·cancel 17단계, 결과 표, 흔한 오해 3개, `reviewedAt` 2026-11-19). 달라진 점: references에 Rendering opportunity·Clean up after running script·Web IDL invoke 3개 추가, 예외 보고·체크포인트 순서의 Chromium 탐침 결과를 쓰기로 한 결정 철회(변경 이력), concept.test에 불변식 (f)(g) 추가.

### 코드 리뷰
- Opus 교차 리뷰 High 1(예제 2의 증거 추론)·Medium 2(검증 안 된 Chromium 순서 주장, 스크립트 태스크 단순화 미표시)·Low 9 모두 수정. 사용자 검토 5건(렌더링 기회 "관찰 불가" 서술, 예외 보고 순서 세 곳 통일, ordered map 근거, 인수 이름 now, "듣는다"·"프레임" 용어)을 표준 원문으로 확인해 반영. 남긴 지적 없음.

### 후속 작업
- [ ] 로드맵 2의 5번 BigInt와 Number(다음 개념, 시작 전에 사용자 확인).
- [ ] (선택) 9절 추가 개선 후보 — timers meta의 queueMicrotask 문구, 루프에서 처음 받은 handle을 취소해도 멈추지 않는 예제, handle 카운터와 setTimeout id가 별개임을 보이는 예제.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 2(`raf3 true`)의 증거는 출력 순서가 아니라 "같은 실행이면 같은 타임스탬프(표준) → 다른 값이면 다른 실행(Chromium 관찰)"이라는 추론으로 세웠고, 퀴즈에 `… / raf3 false` 선택지를 넣었다 — 순서 `raf1 → raf2 → raf3`만으로는 "다시 등록한 콜백이 같은 실행 끝에 붙는다"는 틀린 모델과 구별되지 않는다(리뷰 High).
- [Claude 판단] "표준은 다음 프레임 타임스탬프가 앞 값보다 작지 않음을 보장한다"는 문장 3곳을 지우고, 엄격한 증가를 Chromium 관찰로만 적었다 — HR-Time의 coarsen time이 jitter를 허용해 표준 근거가 없다.
- [Claude 판단] 예외 보고와 마이크로태스크 체크포인트의 순서는 Web IDL 서술(체크포인트 먼저)만 적고 "실행으로 확인하지 않았다"고 밝혔다 — Chromium 탐침은 반대 순서였지만 예제로 고정하지 않은 실행 결과라 주장하지 않는다(리뷰 Medium, 계획 결정 철회).
- [무검토 승인] 시뮬레이터 상태를 콜백 맵(callbacks)과 이번 실행의 handle 목록(frameHandles)으로 나누고, 실행 중인 콜백의 handle은 맵에 없게 그렸다 — 표준이 목록을 먼저 얻고, 맵에 있을 때만 Remove한 뒤 Invoke하기 때문이다(Consensus Architect High).
- [무검토 승인] 기존 3개 페이지(event-loop·microtask-queue·timers)의 "다루지 않는다" 문구 5곳을 새 페이지 링크로 바꾸되 렌더링 갱신 전반은 계속 다루지 않는다고 남기고, 그 페이지들의 `reviewedAt`은 유지했다.
- 추가 주제 4개(프레임 중 취소, 콜백 안 예외, 타임스탬프와 애니메이션 루프, handle 번호), 시뮬레이터 + 퀴즈 형식, slug `request-animation-frame`, 사용자 검토 5건 반영, `reviewedAt` 기록은 사용자가 정했다.

#### 배경지식
- requestAnimationFrame은 ECMAScript가 아니라 HTML 표준(Animation frames)의 호스트 API다. 콜백을 바로 부르지 않고 문서의 ordered map에 넣으며, identifier를 먼저 1 늘린 값을 handle로 돌려주므로 첫 handle은 1이다.
- run the animation frame callbacks는 시작할 때 맵의 handle 목록을 얻고, 목록의 handle마다 맵에 아직 있으면 지운 뒤 같은 now(마지막 렌더링 기회의 시각)로 호출한다. 그래서 같은 실행의 콜백은 같은 타임스탬프를 받고, 앞 콜백이 뒤 콜백을 cancel하면 그 콜백은 건너뛴다.
- 콜백 호출은 Web IDL invoke를 거치며, 끝날 때 clean up after running script가 스택이 비면 마이크로태스크 체크포인트를 수행한다. 그래서 앞 콜백이 넣은 then이 다음 콜백보다 먼저 실행된다.
- 렌더링 기회가 언제 오는지는 표준이 모델을 정하지 않아 미리 알 수 없고 간격도 보장되지 않는다. rAF와 setTimeout(fn, 0)의 순서도 표준이 정하지 않는다.

#### 확인 질문
1. 예제 2에서 `raf3 true` 대신 출력 순서만 보였다면 어떤 틀린 모델을 배제하지 못하나?
   <details><summary>답</summary>"콜백 안에서 다시 등록한 콜백이 같은 실행의 목록 끝에 붙는다"는 모델도 `raf1 → raf2 → raf3` 순서를 낸다. 같은 실행이면 같은 타임스탬프라는 표준 서술과, 값이 달라진 Chromium 관찰을 함께 봐야 다른 실행의 증거가 된다. content.mdx 동작 원리, 구현 진행 리뷰 1차 High.</details>
2. 다음 프레임 타임스탬프가 앞 프레임보다 크다는 것을 "표준이 보장한다"고 쓰면 왜 틀리나?
   <details><summary>답</summary>HR-Time의 coarsen time이 jitter를 허용해 단조 증가도 표준이 보장하지 않는다. 표준이 정하는 것은 다시 등록한 콜백이 다음 실행에서 실행된다는 것까지다. meta simplifications, 구현 진행 3단계.</details>
3. cancel 시나리오에서 handle 3은 왜 건너뛰고, 실행 중인 콜백(handle 2)을 스스로 취소하면 왜 아무 일도 없나?
   <details><summary>답</summary>목록은 실행 시작 때 얻은 [2,3,4]이지만 앞 콜백이 3을 cancel해 맵에서 지웠으므로 "맵에 있을 때만 호출" 조건에 걸린다. 실행 중인 handle 2는 Invoke 전에 이미 Remove되어 맵에 없으므로 cancel이 지울 것이 없다. scenarios.ts cancelSteps, 3. 구현 전략.</details>
4. 콜백 하나가 throw해도 같은 프레임의 다음 콜백이 실행되는 이유는? 이 페이지가 주장하지 않는 것은?
   <details><summary>답</summary>invoke가 "report" 모드로 호출되어 예외를 보고하고 다음 handle로 넘어간다(예제 6 `raf2 true`). 예외 보고(error 이벤트)와 마이크로태스크 체크포인트 중 무엇이 먼저인지는 Web IDL 서술만 적고 실행으로 확인하지 않았다. meta simplifications, 변경 이력 리뷰 지적.</details>
