# 개념 '프로미스' 구현 계획

- 상태: 완료
- 작성일: 2026-11-05
- 기준: `main` @ `6aafb6b`

## 0. 요약

- 목적: 43~48장 로드맵 2번 `/concepts/promise`("프로미스: 이미 이행됐는데 then 콜백은 왜 나중에 불릴까")를 추가한다. executor는 동기로 실행되고 resolve/reject는 한 번만 효과가 있다는 것, then 콜백은 이미 이행된 프로미스에서도 Job으로 나중에 불린다는 것, then이 새 프로미스를 돌려주고 콜백의 반환값·throw가 그 프로미스를 정한다는 것, catch·통과·finally·프로미스 채택·분기와 체인·정적 메서드를 예제 8개와 체인 상태 시뮬레이터(시나리오 2개)로 보인다.
- 범위: 새 개념 폴더 1개(category `async`, order 430, 학습 순서 45번째·마지막, 시뮬레이터 + 퀴즈). 고정 테스트·e2e(시뮬레이터 진행 케이스 포함)·빌드 테스트·content-guide·로드맵을 고친다. 공통 코드(`app/simulator/` 등)와 기존 개념 44개는 바꾸지 않는다.
- 위험: ① 시뮬레이터 상태(프로미스 상태·결과·반응·Job 목록)를 손으로 쓰면 실제 실행과 어긋날 수 있음 → 테스트가 예제를 실제로 돌리며 단계마다 프로미스 상태를 읽어 대조 ② Job 실행 시점(호스트의 마이크로태스크)을 이 페이지에서 단정함 → ECMAScript의 Job과 순서 규칙("Jobs must run in the same order…")까지만 쓰고 호스트 처리는 3번 개념으로 ③ 처리되지 않은 rejection은 Node 실행기를 죽임 → 모든 예제가 rejection을 처리.
- 복잡도: 중간 · Consensus: 생략. event-loop·iterable-for-of와 같은 "개념 전용 시뮬레이터 + 공통 셸" 패턴이고 공통 코드를 바꾸지 않는다. 예제 출력 8개와 시뮬레이터 대조 방식(실행 중 프로미스 상태 읽기)은 미리 실행해 확인했다.
- 미확정: 없음(추가 주제 4개·시각화·slug·제목은 2026-11-05 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 2번 "프로미스와 then 체이닝"(45장)을 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch43-48.md`).
- 사용자 결정(2026-11-05)
  - 기본 범위: ① executor는 `new Promise` 안에서 동기로 실행되고 resolve/reject는 처음 한 번만 효과 ② 이미 이행된 프로미스여도 then 콜백은 동기 코드가 끝난 뒤 불림 ③ then은 항상 새 프로미스를 돌려주고, 콜백의 반환값이나 throw가 그 프로미스를 정함 ④ catch는 `then(undefined, f)`라 catch 뒤 then은 `undefined`로 이어지고, 함수가 아닌 인수는 값을 그대로 통과시킴.
  - 추가 주제 4개 모두: **finally**, **프로미스를 반환하는 콜백**(채택·thenable·`Promise.resolve(p) === p`·자기 자신으로 resolve하면 TypeError), **분기 vs 체인**, **정적 메서드**(all·allSettled·race·any).
  - 시각화: **체인 상태 시뮬레이터**(프로미스별 상태·결과·등록된 반응, 실행을 기다리는 Job 목록).
  - slug `promise`, 제목 "프로미스: 이미 이행됐는데 then 콜백은 왜 나중에 불릴까", category `async`.
  - 여러 체인이 끼어드는 실행 순서는 3번 마이크로태스크 개념으로 넘긴다.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 프로미스의 세 상태와 executor(예제 1 `executor-sync.js`): 명세 Promise Objects의 정의 — pending·fulfilled·rejected, settled, resolved(다른 프로미스에 "locked in"된 것 포함), "Attempting to resolve or reject a resolved promise has no effect." Promise 생성자는 executor를 바로 부르고(`Call(executor, …)`), executor가 throw하면 reject한다. resolve 함수·reject 함수는 CreateResolvingFunctions가 만든 한 쌍이며 둘 중 먼저 불린 것만 효과가 있다(현재 판은 `promiseOrEmpty`를 empty로 바꾸는 방식, ES2025판까지는 `[[AlreadyResolved]]` 레코드 — 단순화에 판 차이 한 줄). 예제 1: `order`가 동기 끝에 `executor, after resolve, sync end`, then 콜백은 그 뒤 `then first`(두 번째 resolve·reject 무시).
  - ② then은 반응을 등록하거나 Job을 넣는다(예제 2 `chain.js`, 시뮬레이터 시나리오 1): PerformPromiseThen은 프로미스가 pending이면 fulfill/reject 반응(PromiseReaction)을 목록에 넣고, 이미 fulfilled/rejected면 NewPromiseReactionJob을 HostEnqueuePromiseJob으로 바로 넣는다. 어느 쪽이든 콜백은 then 호출 안에서 불리지 않는다. 명세 정의 "A promise p is fulfilled if p.then(f, r) will immediately enqueue a Job to call the function f" 인용. Job은 "no other ECMAScript computation is currently in progress"일 때 시작되고(Jobs 절), 같은 방식으로 넣은 Job은 넣은 순서대로 실행된다("Jobs must run in the same order as the HostEnqueuePromiseJob invocations that scheduled them"). 호스트가 언제 Job을 처리하는지(마이크로태스크)는 별도 개념(작성 예정)으로.
  - ③ then이 돌려주는 새 프로미스(예제 2): then은 NewPromiseCapability로 새 프로미스를 만들어 돌려준다(`p1 === p2` false). 반응 Job은 콜백을 부른 결과가 정상이면 새 프로미스를 그 값으로 resolve, throw면 reject(NewPromiseReactionJob). 프로미스가 이행되거나 거부되면 TriggerPromiseReactions가 그때까지 쌓인 반응마다 Job을 넣는다.
  - ④ catch와 통과(예제 3 `catch-skip.js`): `catch(f)`는 `Invoke(promise, "then", « undefined, f »)`. 콜백이 함수가 아니면 핸들러가 empty가 되어, fulfill 반응은 값을 그대로, reject 반응은 거부 사유를 그대로 넘긴다 — 그래서 거부는 then을 건너뛰어 catch까지 가고, catch 콜백이 정상 반환하면 다음 프로미스는 그 반환값(`undefined`)으로 이행된다. `then('not a function')`도 통과.
  - ⑤ 분기 vs 체인(예제 4 `branch-vs-chain.js`): 같은 프로미스에 then을 두 번 부르면 반응이 두 개 등록되고 둘 다 같은 값(1)을 받는다(서로 다른 새 프로미스 두 개). 체인은 앞 then이 돌려준 새 프로미스에 then을 부르므로 앞 콜백의 반환값을 받는다. 결과 `[11,21,31]`(세 결과를 모으는 데 `Promise.all`을 쓰며 정적 메서드는 ⑧에서).
  - ⑥ 프로미스를 반환하는 콜백(예제 5 `return-promise.js`, 시뮬레이터 시나리오 2 / 예제 6 `thenable.js`): resolve 함수는 받은 값이 객체이고 `then`이 함수면 바로 이행하지 않고 NewPromiseResolveThenableJob을 넣는다. 그 Job이 `then`을 불러 결과를 따라가므로 `outer`는 그동안 resolved이지만 pending("locked in")이고, `inner`의 값으로 이행된다. `outer === inner`는 false. `Promise.resolve(inner)`는 PromiseResolve가 같은 생성자의 프로미스를 그대로 돌려줘 `=== inner` true. thenable(then 메서드가 있는 일반 객체)도 같은 경로로, `Promise.resolve(thenable)`의 `then` 호출은 동기 코드가 끝난 뒤 Job에서(명세 Note: "This process must take place as a Job…") — 예제 6 `sync end false` 뒤 `thenable.then called`. 자기 자신으로 resolve하면 TypeError(근거 테스트).
  - ⑦ finally(예제 7 `finally.js`): finally 콜백은 인수 없이 불리고(`arguments.length` 0), 정상 반환하면 반환값과 상관없이 원래 값이나 거부 사유를 그대로 넘긴다(thenFinally·catchFinally가 `valueThunk`·`thrower`로 원래 결과를 돌려줌). finally 콜백이 throw하거나 거부된 프로미스를 반환하면 그 결과로 바뀐다.
  - ⑧ 정적 메서드(예제 8 `static-methods.js`): `Promise.all`은 모두 이행되면 넣은 순서대로 값 배열, 하나라도 거부되면 그 사유로 거부(남은 것이 영영 pending이어도). `allSettled`는 모두 정해질 때까지 기다려 `{status, value|reason}` 배열로 이행. `race`는 먼저 정해진 것을 따른다(예제는 영영 pending인 것과 이미 이행된 것). `any`는 하나라도 이행되면 그 값, 모두 거부되면 AggregateError(`errors`에 사유들). 이터러블을 받고 프로미스가 아닌 값은 `Promise.resolve`로 감싼다.
  - ⑨ 처리되지 않은 거부: HostPromiseRejectionTracker는 호스트가 정하는 연산이라 이 페이지는 다루지 않고, 예제는 모든 거부를 처리한다고 한 줄(47장 에러 처리·호스트 동작은 별도 개념).

### 유지해야 하는 기존 동작

- 기존 개념 44개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만). event-loop·timers의 "Promise·마이크로태스크는 별도 개념" 문구의 역방향 링크는 사용자 결정대로 나중에 일괄 처리한다.
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 시뮬레이터는 JS 없이도 첫 단계를 그린다.

### 제외 범위

- 여러 체인이 끼어드는 실행 순서, `queueMicrotask`, 마이크로태스크 체크포인트와 타이머의 관계(3번 개념)
- async/await(46장), try...catch와 처리되지 않은 거부의 호스트 동작(47장·호스트)
- Promise 서브클래싱·`Symbol.species`, `Promise.withResolvers`·`Promise.try`(책 범위 밖, 단순화에 이름만), 프로미스 취소
- 정확한 Job 개수 비교(예: 프로미스를 반환하면 Job이 몇 개 더 드는지)를 다른 체인과의 순서로 보이는 것(3번 개념 소관). 이 페이지의 시나리오 2는 한 체인 안에서 Job이 차례로 진행하는 것만 보인다.

## 2. 사실과 추정

### 사실 (명세 원문 — 현재 초안 ES2027 사본 `scratchpad/js/spec.html`(2026-11-03 받음), 판 비교 `spec2020·2025·2026.html`. 단계 1에서 현재 판과 링크를 다시 확인)

- Promise Objects(`#sec-promise-objects`): 세 상태 정의 — "A promise p is fulfilled if p.then(f, r) will immediately enqueue a Job to call the function f." / rejected 같음 / pending은 둘 다 아님. settled, resolved("locked in" 포함), "Attempting to resolve or reject a resolved promise has no effect." thenable 정의.
- Promise 생성자(`#sec-promise-executor`): 상태 pending, 반응 목록 둘, `[[PromiseIsHandled]]` false, CreateResolvingFunctions, `Call(executor, undefined, « resolve, reject »)`, abrupt면 reject 호출, promise 반환. Note: executor가 반환해도 지연된 작업이 끝났다는 뜻이 아님.
- CreateResolvingFunctions(`#sec-createresolvingfunctions`): 현재 판·ES2026판은 `promiseOrEmpty` 레코드를 empty로 바꿔 두 번째 호출부터 무시. resolve: 자기 자신이면 TypeError로 reject, 객체가 아니면 FulfillPromise, `then`을 Get(abrupt면 reject), 호출 불가면 FulfillPromise, 호출 가능하면 NewPromiseResolveThenableJob을 HostEnqueuePromiseJob. ES2025판까지는 `[[AlreadyResolved]]` 레코드(사본 grep: 2020·2025판 AlreadyResolved 있음, 2026판·초안 없음).
- `Promise.prototype.then`(`#sec-promise.prototype.then`): NewPromiseCapability → PerformPromiseThen(`#sec-performpromisethen`): 콜백이 호출 불가면 핸들러 empty, pending이면 반응 둘을 목록에 Append, fulfilled면 NewPromiseReactionJob(값)을 enqueue, rejected면 (PromiseIsHandled false면 HostPromiseRejectionTracker "handle") reject Job enqueue, PromiseIsHandled true, 새 프로미스 반환.
- NewPromiseReactionJob(`#sec-newpromisereactionjob`): 핸들러 empty면 fulfill은 값을 그대로(NormalCompletion), reject는 ThrowCompletion으로; 아니면 핸들러 호출. 결과가 abrupt면 capability의 reject, 아니면 resolve 호출.
- NewPromiseResolveThenableJob(`#sec-newpromiseresolvethenablejob`): 새 resolve/reject 쌍으로 `then`을 thenable을 this로 호출. Note: "This process must take place as a Job to ensure that the evaluation of the then method occurs after evaluation of any surrounding code has completed."
- TriggerPromiseReactions(`#sec-triggerpromisereactions`): 반응마다 NewPromiseReactionJob을 enqueue.
- `catch`(`#sec-promise.prototype.catch`): `Invoke(promise, "then", « undefined, onRejected »)`. `finally`(`#sec-promise.prototype.finally`): onFinally를 인수 없이 Call, PromiseResolve 후 `then(valueThunk)` 또는 `then(thrower)`.
- `Promise.resolve`(`#sec-promise.resolve`)·PromiseResolve(`#sec-promise-resolve`): IsPromise이고 `constructor`가 같으면 그대로 반환.
- Jobs(`#sec-jobs`): "A Job is an Abstract Closure with no parameters that initiates an ECMAScript computation when no other ECMAScript computation is currently in progress." 실행 컨텍스트 스택이 비었을 때 시작, 한 번에 하나, 끝까지 실행. Note 1: 브라우저와 Node.js는 Promise Job을 다른 일보다 높은 우선순위로 처리 — 호스트 차이(3번 개념). HostEnqueuePromiseJob(`#sec-hostenqueuepromisejob`): "Jobs must run in the same order as the HostEnqueuePromiseJob invocations that scheduled them."
- HostPromiseRejectionTracker(`#sec-host-promise-rejection-tracker`): host-defined, 기본 구현은 아무것도 안 함.
- 정적 메서드 anchor(`#sec-promise.all`, `#sec-promise.allsettled`, `#sec-promise.race`, `#sec-promise.any`)는 단계 1에서 현재 판으로 확인하고 본문 서술(넣은 순서, 하나라도 거부되면 거부, AggregateError의 `errors`)을 원문과 대조한다.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `microtaskMode: 'afterEvaluate'`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/3d862c42-a841-44a9-88c8-d28c01005883/scratchpad/js/prex/`(전문은 부록).

| 예제 | 실제 출력 |
| - | - |
| 1 `executor-sync.js` | `["executor","after resolve","sync end"]` / `["executor","after resolve","sync end","then first"]` |
| 2 `chain.js` | `executor` / `sync end false` / `then 1` / `catch bad 2` |
| 3 `catch-skip.js` | `caught no data` / `after catch undefined` / `passed through 7` |
| 4 `branch-vs-chain.js` | `false false` / `[11,21,31]` |
| 5 `return-promise.js` | `false true` / `outer got inner value` |
| 6 `thenable.js` | `sync end false` / `thenable.then called` / `got from thenable` |
| 7 `finally.js` | `cleanup 1 0` / `after finally data` / `cleanup 2` / `still rejected failed` / `replaced by cleanup failed` |
| 8 `static-methods.js` | `fulfilled [1,2,"three"]` / `rejected Error` / `fulfilled "race ok"` / `fulfilled "any ok"` / `rejected AggregateError` / `["fulfilled","rejected"]` |

- 모든 예제는 체인 하나이거나, 출력이 한 콜백 안에서만 나와 여러 체인이 끼어드는 순서에 기대지 않는다(예제 4·8은 `Promise.all`·`allSettled`로 한 번에 출력). 처리되지 않은 거부가 있으면 Node가 프로세스를 끝내는 것을 확인했다(`Promise.reject(new Error('nobody'))` → 종료 코드 1) — 모든 예제가 거부를 처리한다.
- 시뮬레이터 대조 방식(실행 확인): 새 vm 컨텍스트에서 `Promise.prototype.then`을 감싸 핸들러 호출 전후에 기록 함수를 부르게 하고, 기록 시점마다 전역 `var` 프로미스들을 `util.inspect`로 읽으면 `Promise { 1 }`, `Promise { <pending> }`, `Promise { <rejected> Error: bad 2 … }`, `Promise { undefined }`가 나온다. `catch`도 `then`을 Invoke하므로 감싼 함수를 지난다. 예제 2 기록: 동기 끝 p1=1·p2·p3·p4 pending → 핸들러 1 후 p2=2 → 핸들러 2 후 p3 rejected → 핸들러 3 후 p4=undefined. 예제 5 기록: 동기 끝 inner·start 이행, outer·last pending → 핸들러 1(start의 콜백, inner 반환) 뒤에도 outer pending → 핸들러 2(ResolveThenableJob이 `inner.then`에 넘긴 resolve 함수) 뒤 outer='inner value' → 핸들러 3(last의 콜백) 뒤 last=undefined. ResolveThenableJob 자체는 핸들러가 아니라 감싼 `then`의 호출로만 보인다.
- 근거 테스트로 쓸 것(실행 확인): TypeError — `new Promise()`(executor 없음), `Promise(function(){})`(new 없이), 자기 자신으로 resolve(`var p = Promise.resolve().then(function () { return p; })`의 거부 사유 이름 TypeError). 그 밖 — executor의 throw는 거부(`TypeError in executor`), `then(null).then(undefined, null)` 통과 `5`, finally 콜백이 거부된 프로미스를 반환하면 그 사유로 바뀜, `Promise.any`의 AggregateError `errors` 메시지 `["boom","boom 2"]`, `Promise.all`이 영영 pending인 것이 있어도 다른 하나의 거부로 거부.

### 사실 (코드에서 확인)

- 시뮬레이터 패턴: 공통 셸 `app/simulator/`(`types.ts` — `Step { title, explanation, line?, state, output? }`, `Scenario { id, label, exampleId, code, steps }`), 개념 전용 `scenarios.ts`·`*View.tsx`·`Simulator.tsx`(얇은 래퍼)·`Simulator.test.tsx`·`*View.test.tsx`·`concept.test.ts` — 참고 `app/concepts/event-loop/`(LoopView 섹션·"(바뀜)" 표시), `app/concepts/iterable-for-of/`(실행 기록으로 시나리오 대조, `concept.test.ts:16-50`). 공통 불변식 `tests/helpers/scenario-invariants.ts`(코드 원문, 마지막 output = expectedOutput, output 누적, line 범위, 단계 ≥ 2).
- 현재 마지막 개념 json(order 420, 44번째). order 430이면 45번째·마지막. category `async` 라벨 '비동기'(`app/lib/concepts.ts:38-45`).
- 고정값(현재 44·마지막 json): `tests/e2e/navigation.spec.ts`(카드 44 `:78,:136`, 마지막 '44번째'·제목 `:84-85`, pager 분모 `/ 44` 전부, json '44 / 44' 블록), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 44), `app/lib/concepts.test.ts:104,108-112`, `app/components/concept/ConceptPager.test.tsx:18,27-33`. 직전 커밋 `6aafb6b`의 같은 파일 변경을 본뜬다. 새 summary·title·tags에 '객체'를 넣지 않아 '객체' 검색 고정값(15)은 그대로 둔다.
- e2e·빌드 등록 위치: `tests/e2e/helpers.ts:73`(JSON_PATH 뒤에 `PROMISE_PATH`, `PROMISE_SIMULATOR_NAME = '프로미스 시뮬레이터'`), `tests/e2e/a11y.spec.ts:894-910`(event-loop 시뮬레이터 진행 케이스와 JSON 케이스 형태 — 새 케이스 둘: '개념 페이지: 프로미스', '개념 페이지: 프로미스 시뮬레이터를 진행한 뒤'), `tests/e2e/responsive.spec.ts:1037-1063`(event-loop 진행 케이스·JSON 가로 스크롤 형태 — 새 케이스 둘), `tests/build/build-output.test.ts:1131-1148`(event-loop 시뮬레이터 프리렌더 describe 형태, json describe 뒤), `docs/content-guide.md:214` e2e 목록.
- e2e 이름: 기존 e2e에 '프로미스'·'/concepts/promise'가 없다(grep 0건) → `-g "/concepts/promise|개념 페이지: 프로미스|프로미스 개념 페이지|홈 학습 순서 보기"`(단계 5에서 `--list` 확인).

### 추정

- 없음. (명세 사본은 2026-11-03 판이라 단계 1에서 현재 판을 다시 받아 대조한다. 네트워크가 막히면 그 사실을 기록한다.)

## 3. 구현 전략

- 페이지 축: "then은 콜백을 지금 부르지 않는다. 프로미스가 아직 pending이면 반응을 등록하고, 이미 정해졌으면 Job을 넣는다. 콜백은 지금 실행 중인 코드가 끝난 뒤 Job으로 불리고, 그 결과가 then이 미리 돌려준 새 프로미스를 정한다." 원인은 명세 이름(PerformPromiseThen, PromiseReaction, NewPromiseReactionJob, TriggerPromiseReactions, CreateResolvingFunctions, NewPromiseResolveThenableJob, HostEnqueuePromiseJob)으로 설명하고 절 번호는 라벨에 쓰지 않는다. "마이크로태스크"는 호스트 용어라 이 페이지에서는 "Job"으로 쓰고 3번 개념(작성 예정)을 가리킨다.
- 시뮬레이터(`scenarios.ts`, `PromiseView.tsx`, `Simulator.tsx`)
  - 상태: `type PromiseInfo = { name: string; state: 'pending' | 'fulfilled' | 'rejected'; result: string | null; lockedTo?: string; reactions: string[] }`(`result`는 표시 문자열 — 문자열은 따옴표, 에러는 `Error: bad 2`, pending이면 null. `lockedTo`는 resolved이지만 pending일 때 따라가는 대상. `reactions`는 등록된 반응 표시 예 `then 콜백 → p2`), `type PromiseSimState = { running: string; promises: PromiseInfo[]; jobs: string[] }`(`running`: `동기 코드` / Job 이름 / `없음`, `jobs`: 실행을 기다리는 Job을 넣은 순서대로).
  - 시나리오 1 `chain`(예제 2, 약 13단계): 실행 전 → 1~4줄 executor(출력 `executor`, resolve로 p1 fulfilled 1) → 5~8줄 then(p1이 이미 fulfilled라 반응 Job을 바로 넣음, p2 pending) → 9~11줄(p2 pending이라 반응 등록) → 12~14줄(catch = then(undefined, f), p3에 등록) → 15줄 출력 → 동기 코드 끝, Job 1(6~7줄 출력·return 2 → p2 fulfilled → p2의 반응 Job을 넣음) → Job 2(10줄 throw → p3 rejected → p3의 reject 반응 Job) → Job 3(13줄 출력 → p4 fulfilled undefined) → 끝.
  - 시나리오 2 `adopt`(예제 5, 약 12단계): inner·start 이행 → 5~7줄 then(Job 넣음) → 8~10줄(outer pending에 반응 등록) → 11줄 출력 → Job 1(6줄 return inner → resolve가 inner의 then이 함수임을 보고 ResolveThenableJob을 넣음, outer는 resolved이지만 pending, `lockedTo: 'inner'`) → Job 2(ResolveThenableJob: `inner.then(resolve, reject)` 호출 — inner가 이미 이행돼 반응 Job을 넣음) → Job 3(resolve 함수 → outer fulfilled 'inner value' → outer의 반응 Job) → Job 4(9줄 출력, last fulfilled undefined) → 끝.
  - 뷰: event-loop `LoopView`처럼 섹션(실행 중 / 프로미스 카드 목록 / 기다리는 Job)으로 나누고 바뀐 칸에 "(바뀜)". 상태는 색과 함께 텍스트(`pending`·`fulfilled`·`rejected`, 한국어 병기 대기·이행·거부)로. 375px에서 카드가 세로로 쌓임.
- 테스트(`concept.test.ts`)
  - ① 공통 불변식(`assertScenarioInvariants`), 첫 단계 빈 상태·line 없음, 나머지 line 있음, 단계 수(각 20 이하 — a11y e2e 전제), 시나리오 id·exampleId.
  - ② 실행 대조: 2절 방식으로 예제를 돌려 체크포인트(동기 끝, 각 핸들러 끝)마다 전역 프로미스 변수의 상태·결과를 읽고, 시나리오에서 대응하는 단계(테스트 안에 `단계 번호 → 체크포인트` 표를 둔다)의 `promises`에서 같은 이름의 상태·결과가 같은지 확인. 체크포인트의 출력 줄 수도 그 단계 `output` 길이와 같아야 한다.
  - ③ 상태 일관성: `lockedTo`가 있으면 state는 pending, 반응이 있는 프로미스는 pending(정해지면 반응은 Job으로 옮겨지고 목록이 비어야 함 — 명세 TriggerPromiseReactions 뒤 반응 목록을 undefined로), 이름 중복 없음, Job이 실행되는 단계에서는 직전 단계 `jobs`의 첫 항목이 그 단계 `running`이다(넣은 순서대로 실행).
  - ④ 본문 주장 근거: 2절 "근거 테스트로 쓸 것" 전부.
- 장 범위: 45장까지. 예제는 함수 표현식·`var`(화살표 함수는 26장이라 써도 되지만 기존 예제 문체에 맞춰 function), `arguments`(18장), `JSON.stringify`(43장, 출력용). try...catch(47장)·async/await(46장)는 쓰지 않는다.
- meta
  - slug `promise`, title "프로미스: 이미 이행됐는데 then 콜백은 왜 나중에 불릴까", category `async`, order 430, `reviewedAt: null`
  - summary(안, 160자 이하·'객체' 없음): "new Promise의 executor는 바로 실행되지만 then 콜백은 이미 이행된 프로미스에서도 나중에 불립니다. then이 새 프로미스를 돌려주는 이유와 catch·finally·채택·Promise.all까지 시뮬레이터와 명세로 확인합니다."
  - tags: Promise, 프로미스, then, catch, finally, 체이닝, Promise.all, thenable, Job
  - goals 4개: ① executor가 동기로 실행되고 resolve/reject가 한 번만 효과가 있음을 설명 ② then이 반응을 등록하거나 Job을 넣어 콜백이 나중에 불리는 이유를 PerformPromiseThen으로 설명 ③ 콜백의 반환값·throw·함수가 아닌 인수·catch·finally가 다음 프로미스를 정하는 규칙으로 체인 결과를 예측 ④ 콜백이 프로미스나 thenable을 반환할 때의 채택, 분기와 체인의 차이, all·allSettled·race·any의 결과를 구분
  - prerequisites: 이벤트 루프와 태스크 큐(`event-loop`), 실행 컨텍스트(`execution-context`)
  - related: `event-loop`, `timers`, `execution-context`, `closure`, `iterable-for-of`, `json`
  - simplifications: Job 실행 시점(호스트의 마이크로태스크 처리, 여러 체인이 끼어드는 순서, 타이머와의 관계)은 별도 개념(작성 예정) / CreateResolvingFunctions의 판 차이(ES2025판까지 `[[AlreadyResolved]]`, ES2026판부터 promiseOrEmpty) — 결과는 같음 / 시뮬레이터의 Job 목록·"실행 중"은 명세의 Job을 그림으로 나타낸 것이며 엔진 구현(큐 자료구조)이 아님, 반응 표시는 PromiseReaction 레코드를 요약한 것 / `[[PromiseIsHandled]]`와 처리되지 않은 거부(HostPromiseRejectionTracker)는 호스트 동작이라 다루지 않으며 예제는 모든 거부를 처리 / 서브클래싱·`Symbol.species`, `Promise.withResolvers`·`Promise.try`는 다루지 않음 / try...catch(47장)·async/await(46장)는 별도 개념 / 예제의 `console`은 호스트 API
  - references: 2절 anchor + MDN ko(Promise, then, catch, finally, Promise.all) — 단계 1에서 200 확인
- 버린 대안
  - ① 결과표 + 퀴즈: 사용자 결정(시뮬레이터).
  - ② 시뮬레이터 상태를 실행 기록에서 자동 생성: 설명 문장·줄 범위는 사람이 써야 하고, 자동 생성하면 테스트가 같은 데이터를 다시 확인하는 순환이 된다(event-loop 교훈). 손으로 쓰고 실행 기록과 대조한다.
  - ③ 시나리오에 체인 두 개를 넣어 끼어드는 순서 보이기: 3번 개념 소관(사용자 결정).

## 4. 변경 파일

- 추가 `app/concepts/promise/`
  - `meta.ts`, `content.mdx`, `route.tsx`(json 템플릿), `scenarios.ts`, `PromiseView.tsx`, `PromiseView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`
  - `examples/`(8개): `executor-sync.js`, `chain.js`, `catch-skip.js`, `branch-vs-chain.js`, `return-promise.js`, `thenable.js`, `finally.js`, `static-methods.js`
- 수정
  - `tests/e2e/helpers.ts`: `PROMISE_PATH = '/concepts/promise'`, `PROMISE_SIMULATOR_NAME = '프로미스 시뮬레이터'`
  - `tests/e2e/a11y.spec.ts`: '개념 페이지: 프로미스'(라이트·다크, '정답 확인' 버튼 보인 뒤), '개념 페이지: 프로미스 시뮬레이터를 진행한 뒤'(event-loop 형태, 중간 단계까지 진행)
  - `tests/e2e/responsive.spec.ts`: `${PROMISE_PATH}: 가로 스크롤이 없다`, '프로미스 개념 페이지: 첫 시나리오를 끝까지 진행해도 가로 스크롤이 없다', 홈 학습 순서 카드 44→45
  - `tests/e2e/navigation.spec.ts`: 카드 44→45(두 곳), 마지막 '45번째'와 새 제목, pager 분모 44→45 전부, json '44 / 45'·링크 2개(이전 event-loop, 다음 promise), 새 개념 '45 / 45'·이전 링크 json. '객체' 검색 고정값은 그대로
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 45, 마지막 promise(prev json, position 45)
  - `tests/build/build-output.test.ts`: json describe 뒤에 `시뮬레이터 프리렌더 (promise)` describe(region `aria-label="프로미스 시뮬레이터"`, 첫 단계 제목 텍스트, `<details` 8개 이상)
  - `docs/content-guide.md:214`: e2e 목록에 `promise`
  - `.claude/plans/concept-roadmap-ch43-48.md`: 2번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes.ts`, 기존 개념 폴더 44개

## 5. 위험 요소

- 시뮬레이터 상태가 실제와 어긋남(특히 시나리오 2의 locked-in·Job 수) → 3절 테스트 ②·③, 단계 2 완료 조건.
- "마이크로태스크 큐"·"이벤트 루프가 곧바로 처리" 같은 호스트 서술이 섞임 → 본문은 Job과 명세 순서 규칙까지만. 단계 3에서 '마이크로' grep 결과가 별도 개념 안내와 단순화 문맥뿐인지 확인.
- 판 차이 단정(CreateResolvingFunctions) → 판 링크와 단순화.
- 처리되지 않은 거부로 예제 실행기 종료 → 모든 예제가 거부를 처리(예제 8의 `fail`은 all·allSettled·any가 처리), 단계 1에서 `npm test` 통과로 확인.
- 여러 체인 순서에 기대는 출력 → 2절 원칙(한 체인 또는 한 콜백 출력). 예제를 바꾸면 메인이 재확인.
- 이미 이행된 프로미스의 then을 "바로 실행된다"로 오해할 수 있는 설명 → ②의 명세 인용과 오해 Callout.
- 시뮬레이터 단계 20 초과 → 단계 수 테스트.
- 375px에서 프로미스 카드·Job 목록이 넘침 → responsive e2e(끝까지 진행), 줄바꿈 클래스.
- dev 서버의 `./meta` 실패 캐시 → 생성 순서 meta → content → route.
- 첫 문단에 `**` 금지(빌드 테스트), PredictQuiz 문자열 prop 안의 작은따옴표(MDX 빌드 실패 — `npm test`는 못 잡음, test:build로 확인).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "/concepts/promise|개념 페이지: 프로미스|프로미스 개념 페이지|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스(a11y 라이트·다크 ×2, 가로 스크롤 ×2 데스크톱·모바일, 홈 학습 순서 보기)가 모두 잡히는지 확인.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`(처음엔 `[]`, 실행 결과로 채움, 2절 표와 같아야 함), concept.test 통과·음성 확인(시나리오 단계 하나의 프로미스 상태를 바꾸면 ② 실패), 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제와 대조, 참고 링크 전부 200.
- 브라우저(dev 서버 375px·다크)
  1. `/concepts/promise` → 페이지 가로 스크롤 없음, 시뮬레이터 첫 단계가 JS 없이도(프리렌더) 보임.
  2. 시나리오 1을 '다음'으로 끝까지 → 5~8줄 단계에서 Job 목록에 항목이 생기고 p1은 fulfilled, 마지막 단계 p4 fulfilled `undefined`, 출력 4줄.
  3. 시나리오 2로 바꿔 Job 1 단계에서 outer가 pending이면서 inner를 따라간다는 표시가 보임.
  4. 퀴즈 하나 '정답 확인' → 정답·해설. 프리렌더 HTML에 `<details>`.
  5. 하단 학습 순서 '45 / 45', 이전 json. json 하단 '44 / 45', 다음 promise.

## 7. 미확정 사항

- 없음. 제목·시뮬레이터 단계 문구·퀴즈 문구·summary는 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(8개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경: 부록 초안 8개를 그대로 옮긴다. `meta.ts`는 3절 meta대로(examples는 처음엔 `expectedOutput: []`, 실행 결과로 채움). `route.tsx`는 json 템플릿 복사.
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. 예제 파일은 부록 그대로, 주석 없이, 파일 끝 줄바꿈 하나. 명세 현재 판·정적 메서드 절을 받아 2절 인용과 대조(네트워크가 막히면 기록).
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표, 참고 링크 전부 200·anchor 존재, 2절 인용 문장이 현재 판 원문과 같음.

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절의 상태 타입, 시나리오 2개, 테스트 ①~④.
- 주의사항: 시나리오 code는 `examples/<file>?raw` import. 단계마다 전체 스냅샷. 대조 테스트는 새 컨텍스트마다 `then`을 감싸 기록하고(iterable-for-of `runWithTrace` 형태), `util.inspect` 결과에서 상태·결과를 뽑는다(에러는 첫 줄 `Error: 메시지`만). 다른 realm 오류는 name으로 비교.
- 완료 조건: `npx vitest run app/concepts/promise/concept.test.ts` 통과, 음성 확인(시나리오 1의 Job 2 단계에서 p3 state를 'fulfilled'로 바꾸면 ② 실패, 시나리오 2 Job 1 단계에서 `lockedTo`를 지우면 ③ 또는 ② 실패) 후 원복, 각 시나리오 단계 20 이하.

### 3. 뷰·시뮬레이터 컴포넌트

- 대상: `PromiseView.tsx`, `PromiseView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`
- 변경: event-loop `LoopView`·`Simulator` 형태. 영역 라벨 '프로미스 시뮬레이터'.
- 주의사항: 색만으로 상태를 구분하지 않음(텍스트 병기), "(바뀜)"은 prevState와 다를 때만, 375px 세로 배치, 공통 셸은 수정하지 않음.
- 완료 조건: `npx vitest run app/concepts/promise` 통과(뷰 테스트: 상태 텍스트·바뀜 표시·빈 Job 목록 '비어 있음', 시뮬레이터 테스트: region 라벨·다음 버튼으로 단계 이동), lint·typecheck 통과.

### 4. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 도입 문단(질문: "이미 resolve한 프로미스에 then을 붙였는데 왜 콜백이 `sync end`보다 늦게 불릴까" + 페이지 구성 + 전제 개념 링크 + 별도 개념). 동작 원리 h3: 1절 주제 ①~⑨ 순서, 시뮬레이터는 ②·⑥ 근처에 독립된 줄로. 예제 8개마다 PredictQuiz. 결과와 이유는 예제별 h3(줄 번호를 예제 파일과 맞춤). 오해 Callout 4개: "이미 이행된 프로미스의 then 콜백은 바로 실행된다", "then은 같은 프로미스를 돌려준다", "catch 뒤의 then은 실행되지 않는다", "finally의 반환값이 다음 then으로 넘어간다". 예제 절 첫 문단은 json과 같은 형식.
- 주의사항: '찾히다' 금지, '마이크로태스크'는 별도 개념 안내에만, 판 차이 문장은 2절 원문대로, 뒷장 내용은 "별도 개념(작성 예정)"으로, 첫 문단에 `**` 금지, PredictQuiz 문자열 prop 안에 작은따옴표를 쓰지 않음(큰따옴표 사용), 공백 든 인라인 코드 Prettier 깨짐 확인.
- 완료 조건: `npm test` 통과(개수 고정 테스트는 단계 5 대상이라 이 시점 실패 허용 — 실패 목록이 그것뿐인지 확인), `npm run test:build`로 MDX 빌드 확인은 단계 5에서, 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0.

### 5. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만. 시뮬레이터 진행 e2e의 단계 수는 실제 시나리오 1의 단계 수에 맞춘다.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- event-loop·timers의 "Promise·마이크로태스크는 별도 개념" 문구 역방향 링크(사용자 결정대로 나중에 일괄).
- `Promise.withResolvers`·`Promise.try` — 책 범위 밖, 추가 게시글 후보.

## 변경 이력

- 2026-11-05 (사용자 콘텐츠 검토 1회, 8건 — vm 실행·명세 원문으로 확인 후 반영): ① finally 콜백이 프로미스·thenable을 반환하면 정해질 때까지 기다림(실행: 안쪽 프로미스 콜백 뒤 `after wait orig`, 영영 pending이면 다음도 pending, 거부하는 thenable이면 그 사유로 바뀜) — "반환값과 상관없이"·"반환값은 버려지고" 서술과 오해 Callout을 고침 ② thenable Job의 새 resolve 함수는 값이 또 thenable이면 다시 따라감(실행 `nested deep`) ③ finally 명세 요약을 "이행이면 `p.then(valueThunk)`, 거부면 `p.then(thrower)`"로(둘 다 이행 핸들러 자리) ④ CreateResolvingFunctions 용어: `promiseOrEmpty` 레코드의 `[[Value]]`, ES2025판은 두 함수가 `[[AlreadyResolved]]` 슬롯으로 공유하는 `alreadyResolved` 레코드(2025판 원문 확인) — 본문·simplifications ⑤ 예제 3 제목 "거부는 핸들러 없는 then을 그대로 지나 catch까지" ⑥ "실행 중인 스크립트" → "실행 중인 코드" ⑦ 예제 8의 race 값 `'settled'` → `'race ok'`(변수 settled·용어 settled와 겹침) — 예제 파일·expectedOutput·퀴즈·결과와 이유 ⑧ simplifications의 "(47장)·(46장)" 삭제(사이트는 학습 순서 번호를 씀) — 영향 단계 1·4
- 2026-11-05 (사용자 콘텐츠 검토 2회, 2건): ① finally 명세 요약의 주어 — `finally`는 `then(thenFinally, catchFinally)`의 결과를 돌려주고, `p.then(valueThunk)`/`p.then(thrower)`를 반환하는 것은 두 핸들러(호출 시점에는 콜백이 아직 불리지 않아 `p`가 없음). 핸들러가 프로미스를 반환하므로 앞 절의 채택 규칙으로 "기다림"이 설명됨(명세 원문 `Invoke(promise, "then", « thenFinally, catchFinally »)` 확인) ② 예제 3 제목 "거부 핸들러 없는 then"(2번 줄 then에는 이행 핸들러가 있음) — 영향 단계 4

## 부록: 예제 초안

`/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/3d862c42-a841-44a9-88c8-d28c01005883/scratchpad/js/prex/`의 파일과 같다(2026-11-05 실행 확인).

#### `executor-sync.js`

```js
var order = [];
var done = new Promise(function (resolve, reject) {
  order.push('executor');
  resolve('first');
  resolve('second');
  reject(new Error('ignored'));
  order.push('after resolve');
});
done.then(function (value) {
  order.push('then ' + value);
  console.log(JSON.stringify(order));
});
order.push('sync end');
console.log(JSON.stringify(order));
```

#### `chain.js`

```js
var p1 = new Promise(function (resolve) {
  console.log('executor');
  resolve(1);
});
var p2 = p1.then(function (v) {
  console.log('then', v);
  return v + 1;
});
var p3 = p2.then(function (v) {
  throw new Error('bad ' + v);
});
var p4 = p3.catch(function (e) {
  console.log('catch', e.message);
});
console.log('sync end', p1 === p2);
```

#### `catch-skip.js`

```js
Promise.reject(new Error('no data'))
  .then(function (v) {
    console.log('skipped', v);
    return 'never';
  })
  .then(null, undefined)
  .catch(function (e) {
    console.log('caught', e.message);
  })
  .then(function (v) {
    console.log('after catch', v);
    return Promise.resolve(7).then('not a function');
  })
  .then(function (v) {
    console.log('passed through', v);
  });
```

#### `branch-vs-chain.js`

```js
var base = Promise.resolve(1);
var branchA = base.then(function (v) { return v + 10; });
var branchB = base.then(function (v) { return v + 20; });
var chained = base
  .then(function (v) { return v + 10; })
  .then(function (v) { return v + 20; });
console.log(branchA === branchB, branchA === base);
Promise.all([branchA, branchB, chained]).then(function (values) {
  console.log(JSON.stringify(values));
});
```

#### `return-promise.js`

```js
var inner = new Promise(function (resolve) {
  resolve('inner value');
});
var start = Promise.resolve('start');
var outer = start.then(function () {
  return inner;
});
var last = outer.then(function (v) {
  console.log('outer got', v);
});
console.log(outer === inner, Promise.resolve(inner) === inner);
```

#### `thenable.js`

```js
var thenable = {
  then: function (onFulfilled) {
    console.log('thenable.then called');
    onFulfilled('from thenable');
  }
};
var p = Promise.resolve(thenable);
console.log('sync end', p === thenable);
p.then(function (v) {
  console.log('got', v);
});
```

#### `finally.js`

```js
Promise.resolve('data')
  .finally(function () {
    console.log('cleanup 1', arguments.length);
    return 'ignored';
  })
  .then(function (v) {
    console.log('after finally', v);
    return Promise.reject(new Error('failed'));
  })
  .finally(function () {
    console.log('cleanup 2');
  })
  .catch(function (e) {
    console.log('still rejected', e.message);
    return Promise.resolve('ok').finally(function () {
      throw new Error('cleanup failed');
    });
  })
  .catch(function (e) {
    console.log('replaced by', e.message);
  });
```

#### `static-methods.js`

```js
var never = new Promise(function () {});
var fail = Promise.reject(new Error('boom'));
var all = Promise.all([1, Promise.resolve(2), 'three']);
var allFail = Promise.all([Promise.resolve(1), fail, never]);
var settled = Promise.allSettled([Promise.resolve(1), fail]);
var race = Promise.race([never, Promise.resolve('race ok')]);
var any = Promise.any([fail, Promise.resolve('any ok')]);
var anyFail = Promise.any([fail, Promise.reject(new Error('boom 2'))]);
Promise.allSettled([all, allFail, race, any, anyFail]).then(function (results) {
  results.forEach(function (r) {
    var shown = r.status === 'fulfilled' ? JSON.stringify(r.value) : r.reason.name;
    console.log(r.status, shown);
  });
  return settled;
}).then(function (list) {
  console.log(JSON.stringify(list.map(function (x) { return x.status; })));
});
```


## 구현 진행

- baseline (2026-11-05, `6aafb6b`): lint·typecheck 통과 / `npm test` 119 files·3773 tests 통과. format:check·test:build·e2e는 직전 커밋 작업에서 통과.
- 위임: 단계 1~3(예제·meta·route·시나리오·대조 테스트·뷰)을 Sonnet 서브에이전트 1개에, 그 결과(시나리오 1 단계 수)를 받아 단계 4(본문)와 단계 5(고정 테스트)를 병렬 위임.
- [x] 1. 예제·meta·route — 예제 8개가 scratchpad 초안과 같음(cmp), `expectedOutput` = 2절 표, 참고 링크 22개 200·현재 판 anchor·인용 문장 확인(서브에이전트, 네트워크 열림). 메인이 `npx vitest run app/concepts/promise tests/examples.test.ts tests/content-integrity.test.ts` 992 통과 확인
- [x] 2. 시나리오와 대조 테스트 — chain 11단계, adopt 12단계. ② 실행 대조는 동기 단계를 "예제 앞 N줄만 새 vm에서 실행"(N = 단계 line.to)으로, Job 단계는 `then`을 감싼 기록의 체크포인트 표(`CHECKPOINTS`)로 비교(출력 배열 전체 비교). 체크포인트는 "다음 콜백 시작 = 앞 Job 끝"(앞 핸들러가 끝난 순간에는 다음 프로미스가 아직 pending — Job이 끝나야 resolve가 불림). 앞 N줄 실행 때 생기는 미처리 거부는 그 컨텍스트에서만 빈 거부 처리기를 달아 막음. 음성 확인: chain Job 2의 p3를 fulfilled로 → ②·③ 실패. adopt Job 1의 `lockedTo` 삭제는 inspect로 관측되지 않아 처음엔 통과 → "thenable Job이 있으면 잠긴 프로미스가 있다" 일관성 테스트 추가 후 실패 확인, 원복. 메인이 adopt Job 1~3 설명을 명세(NewPromiseReactionJob → resolve 함수의 then 조회 → NewPromiseResolveThenableJob → CreateResolvingFunctions(outer) 새 쌍)와 대조
- [x] 3. 뷰·시뮬레이터 — 상태 텍스트 `pending (대기)` 등, "(바뀜)" prevState 비교, '비어 있음'/'아직 없음', 375px 세로·`sm` 이상 2열. 브라우저 확인은 단계 5 뒤
- 단계 5(고정 테스트·e2e·빌드 테스트·문서) 위임 결과 메인 diff 확인: 개수 45, 마지막 promise·이전 json, `/ 44` 0건, json '44 / 45' 다음 promise, '객체' 검색 고정값 그대로, a11y 새 케이스 2(시뮬레이터 '단계 6 / 11'), responsive 새 케이스 2('단계 11 / 11'), build describe(region·'단계 1: 실행 시작'·'동기 코드'·details ≥ 8), content-guide 목록. 실행 확인은 본문 완성 뒤 전체 검증에서
- [x] 4. 본문 — 메인이 결과·원인 문장과 줄 번호를 예제 8개(`cat -n`)·2절과 대조. 메인 수정 2곳: resolved 정의("resolve를 이미 불러서" → settled 또는 locked in, reject로 정해진 경우 포함), 정적 메서드는 "프로미스가 아닌 요소만"이 아니라 각 요소에 `Promise.resolve`를 적용(명세 PerformPromiseAll 등이 모든 요소에 promiseResolve 호출). `grep -c '찾히'` 0, '마이크로'는 별도 개념 안내 1곳뿐
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서 — 위 diff 확인
- 전체 검증(2026-11-05): lint·format:check·typecheck 통과, `npm test` 122 files·3847 tests, `test:build` 363 tests, 빌드 HTML 공백 든 `<code>` 0건, e2e navigation 16 + 새 개념 14(`-g "/concepts/promise|개념 페이지: 프로미스|프로미스 개념 페이지|홈 학습 순서 보기"`) 통과. 브라우저(dev 서버 5173, 375px·다크): 페이지·시뮬레이터 overflow 0, 시나리오 1 단계 3에서 p1 fulfilled·p2 pending(바뀜), 단계 8 '반응 Job 1 (p1 → p2)', 단계 11 '없음'. 시나리오 2 단계 8에서 outer pending + "inner의 결과를 따라가는 중" 표시, 기다리는 Job 'thenable Job 2 (outer ← inner)', (바뀜) 강조는 outer 카드와 Job 칸에만
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 0 · Low 2(보고만) — ① 실행 대조 테스트가 `util.inspect`의 프로미스 표기(`Promise { <pending> }` 등)를 파싱해 Node 버전이 표기를 바꾸면 테스트가 깨질 수 있음(제품 동작과 무관, 깨지면 바로 드러남) ② `PromiseView`의 반응 목록 key가 반응 문자열이라 한 프로미스에 같은 문구의 반응이 둘 생기면 key가 겹침(현재 시나리오에는 없음 — 반응 문구가 대상 프로미스 이름을 포함)
- 사용자 콘텐츠 검토 1회 반영(2026-11-05, 변경 이력 참고). 근거 테스트 4개 추가(finally가 반환한 프로미스를 기다림, 영영 pending이면 다음도 pending, 거부하는 thenable이면 그 사유, thenable 안의 thenable을 다시 따라감). 재검증: lint·format:check·typecheck 통과, `npm test` 3851, `test:build` 363, 빌드 HTML 공백 든 `<code>` 0건·고친 문구 5종 존재, e2e navigation 16 + 새 개념 14 통과
- 검토 2회 반영 후 재검증: format:check·lint 통과, promise·content-integrity 테스트 통과, test:build 363 통과·고친 문구 존재, 새 개념 e2e 통과
- 마무리(2026-11-05): 사용자 최종 승인(콘텐츠 검토 2회 반영 후) → `reviewedAt` 2026-11-05 기록, 로드맵 2번 완료 처리

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현. 달라진 점: ① 시나리오 단계 수는 chain 11·adopt 12(계획 추정 13·12) ② 실행 대조 테스트는 동기 단계를 "예제 앞 N줄만 실행"으로, Job 단계를 `then`을 감싼 기록의 체크포인트(다음 콜백 시작 = 앞 Job 끝)로 비교 — 앞 핸들러가 끝난 순간에는 다음 프로미스가 아직 pending이라 계획의 "각 핸들러 끝" 체크포인트를 바꿈 ③ `lockedTo`는 실행 중 관측할 수 없어 "thenable Job이 있으면 잠긴 프로미스가 있다" 일관성 테스트를 추가 ④ 사용자 콘텐츠 검토 2회 반영(finally가 반환한 프로미스·thenable을 기다림 — 명세 thenFinally/catchFinally가 `p.then(...)`을 반환해 채택 규칙으로 설명, thenable 안의 thenable 재추적, CreateResolvingFunctions 판별 용어, 예제 8 race 값 `'race ok'`, 장 번호 삭제), 근거 테스트 4개 추가 ⑤ 메인이 본문 2곳 수정(resolved 정의, 정적 메서드는 모든 요소에 `Promise.resolve`)

### 코드 리뷰

- critical-code-review(메인 직접): Critical/High/Medium 0, Low 2는 보고만 하고 유지 — 실행 대조 테스트의 `util.inspect` 표기 의존(Node가 표기를 바꾸면 테스트가 깨져 바로 드러남), 반응 목록 key가 문구라 같은 문구 둘이면 겹침(현재 없음)

### 후속 작업

- [ ] 43~48장 로드맵 3번 마이크로태스크 큐 — event-loop의 '작성 예정' 문구와 이 페이지의 "별도 개념(작성 예정)" 링크화
- [ ] `Promise.withResolvers`·`Promise.try` — 책 범위 밖, 추가 게시글 후보
- [ ] event-loop·timers의 "Promise는 별도 개념" 문구 역방향 링크(사용자 결정대로 나중에 일괄)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터 상태는 손으로 쓰고, 테스트가 예제를 실제로 실행하며 `Promise.prototype.then`을 감싸 체크포인트마다 전역 프로미스 변수의 상태를 `util.inspect`로 읽어 대조했다 — 상태를 실행 기록에서 자동 생성하면 테스트가 같은 데이터를 다시 확인하는 순환이 되고(event-loop 교훈), JS로는 프로미스 상태를 직접 읽을 수 없어 Node의 inspect 표기를 썼다(Low ①의 대가).
- [Claude 판단] 체크포인트를 "핸들러 끝"이 아니라 "다음 콜백 시작"으로 잡았다 — 핸들러가 반환한 순간에는 NewPromiseReactionJob이 아직 capability의 resolve를 부르기 전이라 다음 프로미스가 pending이고, Job은 하나씩 끝까지 실행되므로 다음 콜백 시작 시점이 앞 Job이 끝난 상태와 같다.
- [Claude 판단] 실행 중 관측되지 않는 `lockedTo`(resolved이지만 pending)는 실행 대조로 잡을 수 없어, 시나리오 내부 일관성 테스트("thenable Job이 있으면 잠긴 프로미스가 있다", "lockedTo는 pending에만")로 보완했다 — 음성 확인에서 처음엔 지워도 통과해 발견.
- [Claude 판단] 이 페이지에서는 호스트 용어 "마이크로태스크" 대신 명세의 "Job"과 순서 규칙("Jobs must run in the same order…")까지만 쓰고, 여러 체인이 끼어드는 순서는 3번 개념으로 넘겼다. 그래서 예제는 체인 하나이거나 한 콜백에서만 출력하게 짰다.
- [Claude 판단] 모든 예제가 거부를 처리하게 했다 — Node 실행기에서 처리되지 않은 거부는 프로세스를 끝낸다(실행 확인). 처리되지 않은 거부는 HostPromiseRejectionTracker(호스트)라 한 문장만.
- 추가 주제 4개, 체인 상태 시뮬레이터, slug·제목은 사용자 결정. 콘텐츠 검토 2회는 사용자 요청.

#### 배경지식

- `then`은 PerformPromiseThen으로 새 프로미스를 돌려주며, 원래 프로미스가 pending이면 PromiseReaction 두 개를 목록에 넣고, 이미 정해졌으면 NewPromiseReactionJob을 HostEnqueuePromiseJob으로 바로 넣는다. 콜백은 어느 쪽이든 `then` 호출 안에서 불리지 않는다.
- Job은 실행 중인 ECMAScript 계산이 없을 때 시작하고 하나씩 끝까지 실행된다. HostEnqueuePromiseJob으로 넣은 Job은 넣은 순서대로 실행된다.
- NewPromiseReactionJob은 핸들러 결과로 새 프로미스를 resolve/reject한다. 핸들러가 empty(함수가 아닌 인수)면 값이나 사유를 그대로 넘긴다 — catch 뒤 then이 이어지고 거부가 then을 지나가는 이유.
- resolve 함수는 값이 thenable이면 NewPromiseResolveThenableJob을 넣어 그 `then`을 Job에서 부르고, 그동안 프로미스는 resolved이지만 pending("locked in")이다.
- `finally`는 `then(thenFinally, catchFinally)`이고, 두 핸들러가 콜백 반환값을 PromiseResolve로 감싼 `p`의 `p.then(valueThunk)`/`p.then(thrower)`를 반환하므로 채택 규칙에 따라 그 프로미스를 기다린다.

#### 확인 질문

1. 이미 이행된 `p1`에 `p1.then(f)`를 불렀는데 `f`가 바로 실행되지 않는 이유를 명세 연산 두 개로 설명하면?
   <details><summary>답</summary>PerformPromiseThen은 `p1`이 fulfilled이면 NewPromiseReactionJob을 HostEnqueuePromiseJob으로 넣을 뿐 콜백을 부르지 않고, Job은 실행 중인 ECMAScript 계산이 없을 때(지금 코드가 끝난 뒤) 시작된다(본문 "then은 반응을 등록하거나 Job을 넣는다", 시뮬레이터 시나리오 1 단계 3).</details>
2. 실행 대조 테스트의 체크포인트를 "핸들러가 끝난 순간"으로 잡으면 왜 틀리나?
   <details><summary>답</summary>핸들러가 반환한 순간에는 NewPromiseReactionJob이 아직 새 프로미스의 resolve를 부르기 전이라 다음 프로미스가 pending이다. Job은 하나씩 끝까지 실행되므로 "다음 콜백 시작" 시점이 앞 Job이 끝난 상태와 같다(구현 진행 단계 2, `concept.test.ts`의 `runWithTrace`).</details>
3. 시나리오 2에서 `lockedTo` 표시를 지워도 처음엔 실행 대조 테스트가 통과한 이유와, 무엇으로 막았나?
   <details><summary>답</summary>`util.inspect`는 resolved-but-pending과 그냥 pending을 구별해 보여 주지 않아 실행 기록으로 관측할 수 없다. "thenable Job이 있으면 잠긴 프로미스가 있다"·"lockedTo는 pending에만" 같은 시나리오 내부 일관성 테스트를 추가했다(구현 진행 단계 2).</details>
4. `finally(function () { return closeAsync(); })`가 `closeAsync()`의 프로미스를 기다리는 이유를 "finally의 특별 규칙" 없이 설명하면?
   <details><summary>답</summary>`finally`는 `then(thenFinally, catchFinally)`이고, 두 핸들러가 콜백 반환값을 PromiseResolve로 감싼 `p`에 대해 `p.then(valueThunk)` 또는 `p.then(thrower)`를 반환한다. 핸들러가 프로미스를 반환했으므로 finally가 돌려준 프로미스는 채택 규칙(NewPromiseResolveThenableJob)대로 그것을 따라간다(본문 "finally", 변경 이력 2회차 ①).</details>
5. 예제들이 여러 체인을 동시에 출력하지 않도록 짠 이유는? 그 순서는 명세가 정하지 않나?
   <details><summary>답</summary>Job 순서 자체는 명세가 정하지만("Jobs must run in the same order…"), 여러 체인이 끼어드는 순서를 설명하려면 체인마다 필요한 Job 수와 호스트의 처리 시점을 다뤄야 해서 3번 마이크로태스크 개념으로 넘겼다(사용자 결정, 계획 1절 제외 범위).</details>
