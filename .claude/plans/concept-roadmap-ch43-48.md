# 개념 로드맵 (Deep Dive 43~48장 범위)

- 상태: 확정 (진행 중)
- 작성일: 2026-11-05
- 기준: `main` @ `1be09da`

## 결정 (2026-11-05, 사용자)

- 범위: 『모던 자바스크립트 Deep Dive』 43~48장(Ajax ~ 모듈)을 책 순서대로 진행한다. 38~42장 로드맵(`concept-roadmap-ch38-42.md`)은 2026-11-04 완료.
- 진행 방식은 이전 로드맵과 같다(개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`, 개념마다 계획 문서). 한 페이지는 그 장까지만 전제로 쓰고, 뒷장 개념은 "별도 개념" + `simplifications`.

## 검증 방식 (안)

- 언어 동작(JSON, 프로미스 체이닝, 제너레이터, async 함수, try/finally)은 기존 `runtime: 'ecmascript'`(Node vm, Promise 콜백은 평가 직후 수집)로 검증한다. 타이머가 섞이는 순서(마이크로태스크 vs 타이머)와 전역 에러 이벤트는 `runtime: 'browser'`(Chromium)로 검증한다.
- 48장 모듈은 지금의 브라우저 실행기로 가능하다: `.html` 예제의 `<script type="module">`이 `resources`(가짜 서버가 `text/javascript`로 내주는 `.js`)를 `import`한다. 공통 코드 변경이 필요 없을 것으로 보이지만, 각 계획에서 실제 실행기로 다시 확인한다.
- 43장 Ajax(XMLHttpRequest)·45장 `fetch`는 JSON 응답을 내주는 가짜 서버 경로가 필요하다. 지금 실행기의 `resources`는 `.js` 경로·`text/javascript`만 허용한다(`tests/helpers/browser-example.ts`). 다루려면 공통 코드(실행기) 변경 계획이 따로 필요하다 → 아래 "결정 필요".
- 카테고리: 43장 JSON은 `fundamentals` 또는 `objects`, 45~46장은 `async`, 47장 에러 처리는 `execution`, 48장 모듈은 `execution`(각 계획에서 확정).

## 개념 목록 (안)

| # | 개념 (가제) | 장 | 핵심 오해 포인트 (실행으로 확인한 결과) | 런타임 | 시각화 (안) | 상태 |
| - | - | - | - | - | - | - |
| 1 | JSON.stringify가 빼는 값 | 43 | `{a: undefined, f(){}, s: Symbol()}`의 세 프로퍼티는 빠지고, 배열 안의 같은 값은 `null`. `NaN`·`Infinity`는 `null`, `Date`는 `toJSON`으로 문자열 → `JSON.parse`로 되돌리면 `typeof`가 `string`. `JSON.stringify(undefined)`는 문자열이 아니라 `undefined`. BigInt·순환 참조는 TypeError | ecmascript | 값별 결과표 + 퀴즈 | 완료 |
| 2 | 프로미스와 then 체이닝 | 45 | executor는 `new Promise` 안에서 동기로 실행(`executor → sync end → then 1`). `then`은 항상 새 프로미스(`p.then(x => x) === p`는 `false`). 콜백의 반환값·throw가 다음 프로미스를 정함, `catch` 뒤 `then`은 `undefined`로 이어짐 | ecmascript | 체인 상태 시뮬레이터 후보 | 완료 |
| 3 | 마이크로태스크 큐 | 45 | `setTimeout(…, 0)`을 먼저 등록해도 프로미스 콜백이 먼저 실행: `sync → micro1 → queueMicrotask → micro2 → timeout`. 이벤트 루프 페이지가 '작성 예정'으로 남긴 내용 | browser | 이벤트 루프 시뮬레이터 확장 후보 | 완료 |
| 4 | 제너레이터는 멈췄다 다시 시작한다 | 46 | 제너레이터 함수를 불러도 본문이 실행되지 않음(`created` 뒤 첫 `next`에서 `body start`). 첫 `next`의 인자는 버려지고, 두 번째 `next('hi')`의 인자가 `yield` 식의 값 | ecmascript | 단계 시뮬레이터 후보 | 대기 |
| 5 | async/await는 어디서 멈출까 | 46 | async 함수는 첫 `await`까지 동기로 실행(`a1 → after call → a2`)하고 항상 프로미스를 반환. `await` 뒤 코드는 마이크로태스크로 이어짐 | ecmascript (+browser 필요 시) | 시뮬레이터 또는 표 | 대기 |
| 6 | try/catch/finally와 비동기 에러 | 47 | `finally`의 `return`이 `try`의 `return`을 덮음(`'finally'`). `try`에서 `return x` 뒤 `finally`가 `x`를 바꿔도 반환값은 그대로(`1`). `setTimeout` 콜백의 throw는 바깥 `try`에 안 잡히고 `window`의 `error` 이벤트로, 처리 안 된 rejection은 `unhandledrejection`으로 | ecmascript + browser | 표 + 퀴즈 | 대기 |
| 7 | ES 모듈: 라이브 바인딩과 모듈 스코프 | 48 | `import { count, inc }` 뒤 `inc()`를 부르면 `count`가 `0 → 1`(값을 받은 게 아니라 바인딩을 봄). `count = 5`는 TypeError. 같은 모듈을 두 번 import해도 평가는 한 번. 모듈 최상위 `this`는 `undefined`, 모듈 코드는 항상 strict | browser | 표 + 퀴즈 | 대기 |

- 위 결과는 2026-11-05 Node(로컬)와 Playwright Chromium 156.0.8078.4(`page.route`로 모듈 파일 제공)로 확인했다. 페이지에 쓸 때는 각 계획에서 프로젝트 실행기로 다시 실행하고 명세·표준 원문과 대조한다.
- 시각화는 각 계획에서 사용자와 다시 정한다. 위 칸은 출발점이다.
- order: 마지막 개념 `event-loop`(410) 뒤로 420부터 10 간격. 새 개념이 마지막이 되면 개수·마지막 개념 고정 테스트를 갱신한다.

## 결정 (2026-11-05, 사용자가 초안 목록 그대로 확정)

- 43장 Ajax(XMLHttpRequest)·44장 REST API: 제외. 실행기 인프라 변경 없이 43장은 JSON만 다룬다.
- 3번 마이크로태스크와 5번 async/await는 따로 둔다.
- 6번은 `try/finally` 언어 동작과 브라우저 전역 에러 이벤트(`error`·`unhandledrejection`)를 함께 다룬다.

## 보류·제외

- 44장 REST API: HTTP 메서드·서버 규약이라 언어·브라우저 실행으로 보일 동작이 거의 없다. 제외.
- 45장 `Promise.all`·`race`·`allSettled`·`any`: 2번에 짧게 넣거나 추가 게시글 후보.
- 46장 제너레이터로 이터러블 만들기: `iterable-for-of`와 이어지는 내용이라 4번에서 한 절로.
- 49장 Babel·Webpack: 도구 사용법이라 범위 밖.

## 진행 기록

- 2026-11-05: 범위(43~48장, 책 순서) 사용자 결정. 개념 목록 초안 작성.
- 2026-11-05: 개념 7개 목록 사용자 확정(초안 그대로). 1번 JSON부터 계획.
- 2026-11-05: 1번 계획 작성(`json.md`, 사용자 결정: 추가 주제 4개 모두 — parse·reviver, replacer·space, 직접 만든 toJSON, 깊은 복사로 잃는 것 / slug `json`, 제목 "JSON: undefined는 왜 사라질까", category `objects`).
- 2026-11-05: 1번 `json`(order 420, objects, 44번째·마지막, 값별 결과표 13행 × 3열(칸마다 vm 실행 대조) + 퀴즈 8개, 예제 8개) 완료. 사용자 콘텐츠 검토 두 차례(8건+선택 1건·3건) 반영 — 예제 6 space를 `'--'`로(인라인 code 공백 합쳐짐), 래퍼 객체는 ToNumber·ToString(Boolean만 슬롯 값), 배열 replacer는 목록 순서로 Get(상속·열거 불가도 나옴), BigInt TypeError는 명세가 정한 예외(설계 이유는 명세에 없어 쓰지 않음), GetV는 원시 값에서도 래퍼로 조회. 다음은 2번 프로미스와 then 체이닝.
- 2026-11-05: 2번 계획 작성(`promise.md`, 사용자 결정: 추가 주제 4개 모두 — finally, 프로미스를 반환하는 콜백, 분기 vs 체인, 정적 메서드 / 체인 상태 시뮬레이터 / slug `promise`, 제목 "프로미스: 이미 이행됐는데 then 콜백은 왜 나중에 불릴까").
- 2026-11-05: 2번 `promise`(order 430, async, 45번째·마지막, 체인 상태 시뮬레이터 chain 11·adopt 12단계(단계마다 실제 실행의 프로미스 상태와 테스트로 대조) + 퀴즈 8개, 예제 8개) 완료. 사용자 콘텐츠 검토 두 차례(8건·2건) 반영 — finally가 반환한 프로미스·thenable을 기다림(채택 규칙으로 설명), thenable 안의 thenable을 다시 따라감, CreateResolvingFunctions 용어(promiseOrEmpty의 [[Value]], ES2025판 alreadyResolved 레코드·[[AlreadyResolved]] 슬롯), 예제 8 race 값을 race ok로(settled와 겹침). 다음은 3번 마이크로태스크 큐.
- 2026-11-05: 3번 계획 작성(`microtask-queue.md`, 사용자 결정: 추가 주제 4개 모두 — 체크포인트는 큐가 빌 때까지, 두 체인이 끼어드는 순서, 스크립트·타이머 콜백 사이, 리스너 사이(click() vs message) / 이벤트 루프 시뮬레이터에 마이크로태스크 큐를 더한 개념 전용 시뮬레이터 / slug `microtask-queue`, 제목 "마이크로태스크 큐: 먼저 등록한 setTimeout(fn, 0)보다 then 콜백이 왜 먼저 실행될까", category `async`).
- 2026-11-05: 3번 `microtask-queue`(order 440, async, 46번째·마지막, 마이크로태스크 큐 시뮬레이터 basic 16·nested 15·click 14·message 16단계 + 퀴즈 14개, 예제 8개) 완료. Opus 명세 정확성 교차 검토와 사용자 콘텐츠 검토 두 차례(7건+메인 발견 1건, 2건) 반영 — 예제 5의 타이머 제거(파서 태스크 경계에 따라 순서가 바뀜), ECMAScript Jobs 절의 실행 조건(스택이 빈 뒤 하나씩)·Note 1의 우선순위 주석, 체크포인트 재진입 방지, thenable 반환 시 한정, '이 페이지의 테스트는 입력 이벤트를 만들지 않는다'. event-loop·promise의 '작성 예정' 3곳 링크화. 다음은 4번 제너레이터.
