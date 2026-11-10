# 추가 게시글 'Promise 정적 메서드' 구현 계획

- 상태: 완료
- 작성일: 2026-11-10
- 기준: `main` @ `521dd0e`

## 0. 요약

- 목적: `/concepts/promise-static-methods`를 추가해 `Promise.all`의 결과가 끝난 순서가 아니라 넣은 순서인 이유(요소마다 index를 기억하는 함수, 남은 개수)를 중심으로 all·allSettled·race·any의 명세 장부를 예제 7개와 시뮬레이터로 설명한다
- 범위: 새 개념 폴더 1개(category `async`, order 442), `promise`·`fetch`의 `related` 한 항목씩, 순위 테스트·빌드·e2e 등록, 43~48장 로드맵 문서 / 공통 코드와 기존 개념 본문은 바꾸지 않음
- 위험: '먼저 정해진 것을 따른다' 같은 비공식 설명을 메커니즘처럼 쓰는 것 — 반응 Job 순서로 설명하고, 이미 정해진 프로미스끼리는 넣은 순서가 이긴다는 예제로 틀린 모델을 배제한다
- 복잡도: 중간 · Consensus: 생략 (`promise`의 시뮬레이터·`then` 감싸기 대조 패턴을 그대로 따르고 공통 코드 변경이 없음. 구현 뒤 Opus 명세 대조를 수행)
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-10)

- 다음 개념은 45장 Promise 정적 메서드(추가 게시글). `concept-roadmap-ch43-48.md:44`의 후보 "45장 `Promise.all`·`race`·`allSettled`·`any`: 2번에 짧게 넣거나 추가 게시글 후보".
- 각도: **명세 장부 중심.** 기본 결과는 `promise` 페이지가 이미 다뤘으므로(`app/concepts/promise/content.mdx:69-76`, 예제 8 `static-methods.js`), 새 페이지는 index·남은 개수·AlreadyCalled로 '왜'를 설명한다. 다룰 질문: ① 결과는 넣은 순서 ② `Promise.all`이 거부된 뒤에도 다른 프로미스는 계속 진행된다 ③ 빈 이터러블이면 race만 영원히 pending ④ 이미 정해진 프로미스끼리의 race는 넣은 순서로 결정 ⑤ any의 `errors`도 넣은 순서 ⑥ 이터러블이 아닌 값은 throw가 아니라 거부.
- 시각화: **Promise.all 장부 시뮬레이터** 2시나리오(역순으로 끝나는 경우 / 하나가 거부되는 경우) + 퀴즈. 단계는 실제 실행과 대조하는 테스트로 묶는다.
- 메서드 범위: **조합 메서드 4개만.** `Promise.resolve`는 '요소를 프로미스로 바꾸는 단계'로만 다룬다. `Promise.reject`·`withResolvers`·`try`는 `simplifications`에 '다루지 않음'으로 적는다.

### 유지해야 하는 기존 동작

- `promise` 페이지의 본문·예제·`reviewedAt`(`2026-11-05`)은 그대로다. `related`에 새 slug 한 항목만 더한다.
- `fetch` 페이지의 본문·`reviewedAt`은 그대로다. `related`에 새 slug 한 항목만 더한다.
- 홈 '객체' 검색 결과 16개(`tests/e2e/navigation.spec.ts:91`) — 새 meta의 title·summary·tags에 '객체'를 쓰지 않는다.
- 기존 개념의 순서·선수 개념 조건(`tests/content-integrity.test.ts`).

### 제외 범위

- `Promise.reject`, `Promise.withResolvers`(ES2024), `Promise.try`(ES2025), Promise 서브클래싱과 사용자 정의 `resolve`(GetPromiseResolve가 `this.resolve`를 읽는 것은 한 문장 + simplifications).
- 요소 함수의 AlreadyCalled와 1에서 시작하는 남은 개수가 실제로 결과를 바꾸는 '규칙을 어기는 then'의 예제 — thenable은 `Promise.resolve`가 새 프로미스로 감싸 그 resolve 함수가 먼저 막지만, 프로미스 인스턴스의 `then`을 덮어쓰면 서브클래스 없이도 관찰된다(명세 대조에서 확인, 변경 이력). 범위 선택으로 다루지 않고 본문에서는 NOTE와 두 장치의 동작만 설명한다.
- 처리되지 않은 거부 추적(호스트), 타이머로 만든 지연, 취소(AbortController). async/await로 다시 쓰기(46장).

## 2. 사실과 추정

### 사실 (명세 — 현재 초안 ES2027 `tc39.es/ecma262/multipage/control-abstraction-objects.html`과 ES2026판 사본 대조)

사본: 스크래치패드 `draft-control.html`(2026-11-10 내려받음), `spec2026.html`(이전 세션 사본, 제목 'ECMAScript® 2026 Language Specification'). 두 판의 Promise 절 id는 같다(`sec-promise.all`, `sec-performpromiseall`, `sec-promise.allsettled`, `sec-performpromiseallsettled`, `sec-promise.any`, `sec-performpromiseany`, `sec-promise.race`, `sec-performpromiserace`, `sec-getpromiseresolve`). 알고리즘 차이는 변수 이름뿐이다(ES2026 `constructor`·`C`·`F` ↔ 초안 `ctor`·`activeFunc`). 본문에 변수 이름을 쓰지 않는다.

- 네 메서드 공통: `NewPromiseCapability(ctor)` → `GetPromiseResolve(ctor)`(`Get(ctor, "resolve")`, 함수가 아니면 TypeError) → `GetIterator(iterable, sync)` → `PerformPromiseX`. 각 단계의 abrupt completion은 `IfAbruptRejectPromise`로 **결과 프로미스를 거부하고 그 프로미스를 반환**한다. 반복 중 오류면 `iteratorRecord.[[Done]]`이 false일 때 `IteratorClose`.
- PerformPromiseAll: `values` 빈 List, `remainingElementsCount` = `{ [[Value]]: 1 }`, `index` 0. 반복마다 `values`에 undefined 추가 → `nextPromise = Call(promiseResolve, ctor, « next »)` → 요소 함수(onFulfilled, 슬롯 `[[AlreadyCalled]]` false, `[[Index]]` index) 생성 → index + 1 → 남은 개수 + 1 → `Invoke(nextPromise, "then", « onFulfilled, resultCapability.[[Reject]] »)`. 반복이 끝나면 남은 개수 − 1, 0이면 `CreateArrayFromList(values)`로 resolve.
  - 요소 함수: `[[AlreadyCalled]]`가 true면 아무것도 안 함 → true로 → `values[[[Index]]]`에 값 → 남은 개수 − 1 → 0이면 배열로 resolve.
  - NOTE 원문(두 판 공통): "remainingElementsCount starts at 1 instead of 0 to ensure resultCapability.[[Resolve]] is only called once, even in the presence of a misbehaving "then" which calls the passed callback before the input iterator is exhausted."
  - 거부 쪽은 요소 함수가 아니라 `resultCapability.[[Reject]]`를 그대로 넘긴다 → 첫 거부가 결과를 거부하고, 이후 호출은 resolve 함수의 이미 resolve됨 검사로 무시된다(CreateResolvingFunctions, `promise` 페이지 simplifications 2번이 판별 차이를 이미 적음).
- PerformPromiseAllSettled: 같은 장부. 요소마다 onFulfilled와 onRejected가 **하나의** `alreadyCalled` 레코드를 공유하고, `{ status: "fulfilled", value }` / `{ status: "rejected", reason }` 객체를 `values[index]`에 넣는다. 결과 프로미스는 거부되지 않는다(Reject를 넘기지 않음).
- PerformPromiseAny: `errors` List로 같은 장부를 거부 쪽에 둔다. `Invoke(nextPromise, "then", « resultCapability.[[Resolve]], onRejected »)`. 남은 개수가 0이 되면 새 AggregateError에 `errors` 프로퍼티(`CreateArrayFromList(errors)`, enumerable false)를 정의해 reject. 빈 이터러블이면 반복 끝에서 바로 0 → AggregateError로 거부.
- PerformPromiseRace: 장부 없음. 요소마다 `Invoke(nextPromise, "then", « resultCapability.[[Resolve]], resultCapability.[[Reject]] »)`. Promise.race NOTE 1 원문(두 판 공통): "If the iterable argument yields no values or if none of the promises yielded by iterable ever settle, then the pending promise returned by this method will never be settled."
- Promise.race 설명 문장(두 판 공통): "returns a new promise which is settled in the same way as the first passed promise to settle." — 비공식 요약. 메커니즘은 '결과 프로미스의 resolve/reject를 처음 부른 반응 Job'이다. 이미 정해진 프로미스에 `then`을 부르면 PerformPromiseThen이 그 자리에서 Job을 넣으므로(`promise` 페이지 `content.mdx:20-35`), 이미 정해진 요소끼리는 **넣은(반복) 순서**대로 Job이 들어간다.
- `Promise.resolve`(PromiseResolve): 값이 같은 생성자의 프로미스면 그대로 반환, 아니면 새 프로미스를 만들어 그 값으로 resolve — `promise` 페이지가 이미 설명(`content.mdx:63,71`).
- 프로미스 Job은 넣은 순서대로 실행된다(HostEnqueuePromiseJob 요구) — `promise/content.mdx:35`, `microtask-queue/content.mdx:96`.

### 사실 (vm 실행 — Node v24.22.1, `runInNewContext` + `microtaskMode: 'afterEvaluate'`, 스크래치패드 `ex/`·`run.mjs`)

예제 7개(모두 `runtime: 'ecmascript'`, 파일 끝 줄바꿈 하나, `var`·함수 표현식 — `promise` 예제 문체):

| 파일 | 실제 출력 |
| --- | --- |
| `input-order.js` | `B resolved` / `A resolved` / `all ["A","B","c"]` |
| `keeps-going.js` | `sync end` / `all rejected b failed` / `a still fulfilled A` |
| `empty.js` | `all []` / `allSettled []` / `any AggregateError 0` (race 줄 출력 없음) |
| `race-settled.js` | `race 1 late` / `race 2 now` |
| `any-errors.js` | `AggregateError ["one","two"]` |
| `settled-order.js` | `fulfilled A` / `rejected b failed` |
| `iterable-input.js` | `no throw true` / `rejected TypeError` / `["h","i"]` |

`input-order.js`
```js
var resolveA, resolveB;
var a = new Promise(function (resolve) { resolveA = resolve; });
var b = new Promise(function (resolve) { resolveB = resolve; });
var all = Promise.all([a, b, 'c']);
all.then(function (values) { console.log('all', JSON.stringify(values)); });
resolveB('B');
console.log('B resolved');
resolveA('A');
console.log('A resolved');
```

`keeps-going.js`
```js
var resolveA, rejectB;
var a = new Promise(function (resolve) { resolveA = resolve; });
var b = new Promise(function (resolve, reject) { rejectB = reject; });
var all = Promise.all([a, b]);
all.catch(function (e) {
  console.log('all rejected', e.message);
  resolveA('A');
});
a.then(function (v) { console.log('a still fulfilled', v); });
rejectB(new Error('b failed'));
console.log('sync end');
```

`empty.js`
```js
Promise.all([]).then(function (v) { console.log('all', JSON.stringify(v)); });
Promise.allSettled([]).then(function (v) { console.log('allSettled', JSON.stringify(v)); });
Promise.any([]).catch(function (e) { console.log('any', e.name, e.errors.length); });
Promise.race([]).then(function () { console.log('race settled'); });
```

`race-settled.js`
```js
var early = Promise.resolve('early');
var late = Promise.resolve('late');
Promise.race([late, early]).then(function (v) { console.log('race 1', v); });
var resolveSlow;
var slow = new Promise(function (resolve) { resolveSlow = resolve; });
Promise.race([slow, 'now']).then(function (v) { console.log('race 2', v); });
resolveSlow('slow');
```

`any-errors.js`
```js
var rejectOne, rejectTwo;
var one = new Promise(function (resolve, reject) { rejectOne = reject; });
var two = new Promise(function (resolve, reject) { rejectTwo = reject; });
Promise.any([one, two]).catch(function (e) {
  console.log(e.name, JSON.stringify(e.errors.map(function (x) { return x.message; })));
});
rejectTwo(new Error('two'));
rejectOne(new Error('one'));
```

`settled-order.js`
```js
var resolveA, rejectB;
var a = new Promise(function (resolve) { resolveA = resolve; });
var b = new Promise(function (resolve, reject) { rejectB = reject; });
Promise.allSettled([a, b]).then(function (results) {
  results.forEach(function (r) {
    console.log(r.status, r.status === 'fulfilled' ? r.value : r.reason.message);
  });
});
rejectB(new Error('b failed'));
resolveA('A');
```

`iterable-input.js`
```js
var p = Promise.all(42);
console.log('no throw', p instanceof Promise);
p.catch(function (e) {
  console.log('rejected', e.name);
  return Promise.all('hi');
}).then(function (v) { console.log(JSON.stringify(v)); });
```

- `then` 감싸기 실험(스크래치패드 `trace.mjs`): `Promise.all` 호출 중에 불린 `then`의 첫 인수(요소 함수)를 감싸 호출을 기록하면 `input-order.js`는 `element 2 "c"` → `element 1 "B"` → `element 0 "A"`, `keeps-going.js`는 결과 거부 **뒤에** `element 0 "A"`가 불린다. 모든 Job 뒤 `all`은 `input-order`에서 `Promise { [ 'A', 'B', 'c' ] }`, `keeps-going`에서 rejected `Error: b failed`.
- 동기 직후 상태(`util.inspect`): `Promise.all([])`·`Promise.allSettled([])`는 `Promise { [] }`(이미 이행), `Promise.race([])`는 `Promise { <pending> }`, `Promise.any([])`는 rejected.
- 틀린 모델 배제: `race-settled.js` 1행은 '먼저 정해진 것(early)이 이긴다'를 배제한다(둘 다 race 전에 정해졌고 결과는 `late`). `input-order.js`는 '끝난 순서로 모은다'(`["c","B","A"]`)를 배제한다. `keeps-going.js`는 'Promise.all이 거부되면 나머지를 멈춘다'를 배제한다. `any-errors.js`는 '거부된 순서로 모은다'(`["two","one"]`)를 배제한다. `iterable-input.js`는 '이터러블이 아니면 예외를 던진다'를 배제한다(`no throw true`).

### 코드

- 시뮬레이터 패턴: `app/concepts/promise/`의 `Simulator.tsx`(19줄, `SimulatorShell`에 `label`·`renderState`만 넘김), `scenarios.ts`(상태 타입 주석·작성 헬퍼·시나리오), `PromiseView.tsx`, `concept.test.ts`(`then` 감싸기 + `util.inspect`로 단계 대조, `runPrefix`로 동기 직후 상태) — `app/concepts/promise/concept.test.ts:1-120`.
- 공통 타입 `Step<S>`·`Scenario<S>` — `app/simulator/types.ts:1-17`. 불변식 `assertScenarioInvariants` — `tests/helpers/scenario-invariants.ts`.
- 라우트 모듈 — `app/concepts/promise/route.tsx`(import가 모두 `./content.mdx`·`./meta` 상대 경로라 그대로 복제하면 된다).
- 필수 h2 `동작 원리`·`예제`·`결과와 이유` — `tests/content-integrity.test.ts:23`.
- 순서: `promise` 430(48번째), `microtask-queue` 440(49번째), `fetch` 445(50번째) — 각 `meta.ts`의 `order`. 개수 55를 고정한 곳: `app/lib/concepts.test.ts:104,111,112`, `app/components/concept/ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts:78,84,139` 및 `/ 55` 34곳, `tests/e2e/responsive.spec.ts:1412`. '객체' 검색 순위 목록 — `tests/e2e/navigation.spec.ts:98-115`(마지막 `'51'`).
- 새 페이지 등록 지점(최근 `fetch` 선례): `tests/e2e/helpers.ts:82`(경로 상수), `tests/e2e/a11y.spec.ts:966`, `tests/build/build-output.test.ts:1212-`, `responsive.spec.ts`(시뮬레이터 마지막 단계 가로 스크롤 — `es-modules` 선례 `responsive.spec.ts:1395-1406`).
- `fetch/meta.ts:33` related, `promise/meta.ts:30` related.

### 추정

- 없음

## 3. 구현 전략

- **순서 order 442** [Claude 판단]: 책 절 순서로는 정적 메서드가 마이크로태스크 큐보다 앞일 수 있지만, 이 페이지의 핵심 설명(요소 함수가 불리는 순서, race의 승자, 출력이 여러 체인 사이에 끼어드는 순서)이 '프로미스 Job은 넣은 순서대로, 체인이 번갈아 실행된다'에 기댄다. `promise` 페이지는 여러 체인이 끼어드는 순서를 마이크로태스크 큐 개념으로 미뤘다(`promise/meta.ts` simplifications 1번). 그래서 `microtask-queue`(440)를 선수 개념으로 두고 그 뒤, `fetch`(445) 앞에 둔다. `fetch`가 `Promise.all`을 쓰므로 뒤에 오는 것이 자연스럽다.
- prerequisites: `promise`, `iterable-for-of`, `microtask-queue`. related: `promise`, `microtask-queue`, `fetch`, `iterable-for-of`.
- **시뮬레이터 = Promise.all 장부.** 상태는 결과 프로미스, 남은 개수, `values` 칸, 요소 표(index·요소·요소 상태·요소 함수 호출 여부), Job 목록, 실행 중. 장부가 index와 개수만으로 순서를 맞추는 것이 이 페이지의 핵심이라 이것을 그린다. allSettled·any는 같은 장부의 변형으로 본문 표와 예제로 설명한다(시뮬레이터 2개면 충분).
- **대조 테스트**: `promise/concept.test.ts`처럼 새 컨텍스트에서 `Promise.prototype.then`을 감싸되, `Promise.all` 호출 중에 넘어온 첫 인수를 요소 함수로 보고 호출(index·값)을 기록한다. 시나리오의 요소 함수 Job 순서·`values`·남은 개수·결과 상태를 이 기록과 `util.inspect`에 묶는다. 남은 개수는 `1 + 등록한 요소 수 − (반복 끝? 1 : 0) − 요소 함수 첫 호출 수`로 계산해 시나리오와 비교한다(명세 규칙에 묶음).
- **본문 근거 테스트**: 동기 직후 `Promise.all([])`·`allSettled([])` 이행, `race([])` pending, `any([])` 거부 상태를 `util.inspect`로 확인하는 테스트를 `concept.test.ts`에 둔다(본문의 '호출 안에서 바로 이행된다' 주장의 근거).
- 기존 개념은 `related`만 바꾼다. 본문의 역방향 링크는 사용자 결정(나중에 일괄)을 따른다.
- 버린 대안
  - order 435(`promise` 바로 뒤): 끼어드는 순서를 아직 배우지 않은 위치라 설명에 '마이크로태스크 큐에서 다룬다'가 반복된다.
  - 브라우저 런타임 + `setTimeout` 지연으로 '끝난 순서' 만들기: 타이머 순서는 표준이 '먼저 등록했고 지연이 같거나 짧으면 먼저'만 보장하고(메모리 timers 교훈), resolve 함수를 밖으로 꺼내 직접 부르는 편이 순서가 명시적이다.
  - allSettled·any 시나리오 추가: 장부가 같아 반복이다. 표·예제로 충분.

## 4. 변경 파일

- 추가: `app/concepts/promise-static-methods/`의 `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `AllLedgerView.tsx`, `AllLedgerView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/*.js` 7개
- 수정: `app/concepts/promise/meta.ts`, `app/concepts/fetch/meta.ts` — `related`에 `'promise-static-methods'` 한 항목(`reviewedAt` 유지)
- 수정: `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts` — 개수·순위·새 페이지 등록
- 수정: `.claude/plans/concept-roadmap-ch43-48.md` — 44행 후보와 진행 기록
- 변경하지 않음: `app/simulator/`, `app/components/`(테스트 제외), `app/lib/concepts.ts`, `tests/helpers/`, 기존 개념 본문·예제

## 5. 위험 요소

- 비공식 요약을 메커니즘으로 쓰기: race의 '먼저 정해진 것' → '결과 프로미스의 resolve/reject를 처음 부른 반응 Job'으로 쓰고 `race-settled.js` 1행으로 배제(작업 순서 3). all의 '하나라도 거부되면' → '첫 거부가 넘겨받은 Reject를 부른다'로 쓴다.
- 일반화의 예외: '결과는 넣은 순서'는 all·allSettled의 `values`, any의 `errors`에만 해당한다(race는 배열이 없다). '빈 이터러블은 바로 끝난다'는 race 제외. '거부되면 무시'는 all의 결과 프로미스에 대한 것이지 요소 프로미스나 그 반응이 아니다(`keeps-going.js`). '이터러블이 아니면 거부'는 GetPromiseResolve·GetIterator·반복 중 오류 모두 같은 경로(IfAbruptRejectPromise)이고, `this`가 생성자가 아니면 NewPromiseCapability의 `?`로 **throw**한다 — '절대 throw하지 않는다'고 쓰지 않는다(본문 한 문장, simplifications에 서브클래싱).
- 동기 이행 주장: `Promise.all([])`가 '호출 안에서 이행된다'는 근거 테스트(작업 순서 2)로 묶는다. `then` 콜백은 그래도 나중에 불린다는 것을 함께 쓴다(`promise` 페이지 핵심과 모순되지 않게).
- AlreadyCalled 서술: 표준 프로미스만 쓰는 예제에서는 AlreadyCalled가 결과를 바꾸지 않는다. '두 번째 이행을 AlreadyCalled가 막는다'를 예제 결과의 원인처럼 쓰지 않고, NOTE가 말하는 규칙을 어기는 then 대비라고 쓴다.
- 결과 원인을 '복사해서/공유해서'로 쓰지 않는다(AGENTS.md). allSettled의 공유 `alreadyCalled`는 명세 용어로 '두 함수가 같은 레코드를 본다'로 쓴다.
- 시뮬레이터 대조의 순환: 시나리오 단계를 규칙으로 생성하지 말고 손으로 쓰고, 테스트는 실제 실행 기록(`then` 감싸기)에 묶는다(메모리 event-propagation 교훈).
- `then` 감싸기가 동작을 바꿀 위험: 감싼 함수는 원래 요소 함수를 같은 인수로 부르고 반환값을 그대로 돌려준다. 감싸지 않은 실행의 출력과 감싼 실행의 출력이 같은지 테스트로 확인한다.
- '객체' 검색 개수: title·summary·tags에 '객체'를 쓰지 않는다(allSettled 결과는 summary에서 '결과 기록' 등으로 표현).
- 장 범위: async/await(46장)·try...catch(47장)를 예제에 쓰지 않는다. `e.errors`의 `map`은 27장(배열 메서드)이라 전제 범위 안이다.
- PredictQuiz 문자열의 작은따옴표 → `test:build`가 잡는다(작업 순서 5). 첫 문단에 `**`를 쓰지 않는다.
- 줄 번호: 시나리오 작성 뒤 예제를 고치면 `line`이 어긋난다 → `assertScenarioInvariants`.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 새 개념 범위(AGENTS.md)대로 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "promise-static-methods|Promise 정적 메서드|홈 학습 순서 보기"`. `-g` 패턴은 추가한 테스트 이름에 맞춰 구현 때 확정한다. `git diff --stat`으로 공통 코드(`app/components/`·`app/simulator/`·`app/lib/concepts.ts` 등 비테스트 파일) 변경이 없는지 확인한다.
- 브라우저: dev 서버 재시작 뒤 `/concepts/promise-static-methods`에서 ① JS 없이 프리렌더 HTML에 시뮬레이터 첫 단계와 퀴즈 `<details>` 정답이 있다 ② '넣은 순서로 모으기' 시나리오를 끝까지 넘기면 `values` 칸이 `[·,·,'c']` → `[·,'B','c']` → `['A','B','c']`, 남은 개수가 `3 → 2 → 1 → 0`이고 마지막 출력이 `B resolved`, `A resolved`, `all ["A","B","c"]`다 ③ '하나가 거부될 때' 시나리오의 마지막 단계에서 결과가 rejected인데 `values[0]`이 `'A'`, 남은 개수가 1이고 출력이 `sync end`, `all rejected b failed`, `a still fulfilled A`다 ④ 375px에서 두 시나리오 마지막 단계까지 가로 스크롤이 없다 ⑤ `promise`·`fetch` 페이지의 관련 개념에 새 페이지 링크가 있고, `microtask-queue`의 다음·`fetch`의 이전이 새 페이지다.
- 명세: Opus 서브에이전트에 명세 사본 두 판의 경로를 주고 본문·시나리오와 대조한다(작업 순서 6).

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 메타와 예제

- 대상: `promise-static-methods/meta.ts`, `examples/*.js` 7개, `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경: 2절의 예제 7개를 원문 그대로 만든다(파일 끝 줄바꿈 하나). `meta.ts`: slug `promise-static-methods`, title `Promise 정적 메서드: Promise.all의 결과는 왜 끝난 순서가 아닐까`, category `async`, order 442, tags(안) `Promise.all`·`Promise.allSettled`·`Promise.race`·`Promise.any`·`AggregateError`·`프로미스`·`이터러블`, prerequisites `promise`·`iterable-for-of`·`microtask-queue`, related `promise`·`microtask-queue`·`fetch`·`iterable-for-of`, `reviewedAt: null`(사용자 최종 승인 때 승인일로 — 최근 관례). summary(안, 160자 이하): "Promise.all은 요소마다 자기 자리 번호를 기억하는 함수를 붙이고 남은 개수를 세어, 끝난 순서와 상관없이 넣은 순서로 결과를 모읍니다. 거부 뒤의 동작, 빈 배열, race와 any의 결정 방식을 명세와 시뮬레이터로 확인합니다." goals 4개(index와 남은 개수로 넣은 순서 / 첫 거부와 계속 진행되는 요소 / 빈 이터러블과 1에서 시작하는 개수 / race의 반응 Job 순서·any의 errors·이터러블이 아닌 값의 거부). simplifications: 시뮬레이터는 Promise.all만 그리고 allSettled·any는 같은 장부의 변형으로 본문에서 설명 / `then`이 내부적으로 만드는 프로미스는 그리지 않음 / 요소 함수의 AlreadyCalled가 실제로 막는 규칙을 어기는 then은 예제로 보이지 않음 / GetPromiseResolve가 `this.resolve`를 읽는 것과 서브클래싱·`this`가 생성자가 아닐 때의 TypeError는 다루지 않음 / `Promise.reject`·`withResolvers`·`try`는 다루지 않음 / 처리되지 않은 거부는 호스트 동작이라 다루지 않으며 예제는 모든 거부를 처리 / async/await·try...catch는 별도 개념 / `console`은 호스트 API. references: 2절 절 id의 현재 초안 링크(`https://tc39.es/ecma262/#sec-…`) + MDN ko `Promise.all()`·`Promise.allSettled()`·`Promise.race()`·`Promise.any()`·`AggregateError`(열어서 확인, 없으면 en-US).
- 이유: 실제 출력이 이후 모든 서술의 근거다.
- 주의사항: `console.log`에는 원시 값·`JSON.stringify` 결과만. 타이머·try...catch·async를 쓰지 않는다. title·summary·tags에 '객체' 금지. `meta.ts` → `content.mdx`(필수 h2만) → `route.tsx` 순으로 만든다(dev 서버의 `./meta` 실패 캐시 방지).
- 완료 조건: `npx vitest run tests/examples.test.ts -t promise-static-methods`에서 예제 7개가 2절 표와 일치, `npx vitest run tests/content-integrity.test.ts` 통과(order·선수 개념·related 존재).

### 2. 시나리오, 시각화, 대조 테스트

- 대상: `scenarios.ts`, `AllLedgerView.tsx`, `AllLedgerView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태(안): `{ running: string; result: { state: 'none' | 'pending' | 'fulfilled' | 'rejected'; value: string | null }; remaining: number | null; values: (string | null)[]; elements: { index: number; label: string; state: 'pending' | 'fulfilled' | 'rejected'; called: boolean }[]; jobs: string[] }`. `remaining`이 null이면 `Promise.all` 호출 전, `values`의 null은 아직 비어 있는 칸(명세의 undefined). 상태 타입 주석은 `promise/scenarios.ts:5-14` 형식.
  - 시나리오 `input-order`('넣은 순서로 모으기', `input-order.js`, 14단계 안팎): 시작 → 1~3행 a·b pending → 4행 Promise.all 시작(남은 개수 1) → 요소 a 등록(칸 1개, 개수 2, a에 반응 등록) → b 등록(개수 3) → `'c'`는 `Promise.resolve`로 이미 이행된 프로미스 → `then`이 바로 Job을 넣음(개수 4) → 반복 끝(개수 3) → 5행 all에 반응 등록 → 6행 resolveB(b의 요소 함수 Job) → 7행 출력 → 8행 resolveA → 9행 출력 → Job c: `values[2]`, 개수 2 → Job B: `values[1]`, 개수 1 → Job A: `values[0]`, 개수 0 → 결과 이행, all의 반응 Job → 출력 `all ["A","B","c"]`. 반복 끝의 단계 설명에 NOTE(1에서 시작하는 이유)를 쓴다.
  - 시나리오 `keeps-going`('하나가 거부될 때', `keeps-going.js`, 12단계 안팎): a·b 등록(개수 2) → 5~8행 catch 등록 → 9행 a.then 등록 → 10행 rejectB(Reject Job) → 11행 출력 → Job: 결과 거부(값 칸·개수는 그대로) → catch Job: 출력, resolveA(요소 함수 Job, a.then Job) → 요소 함수 Job: `values[0]` = 'A', 개수 1, 0이 아니라 아무 일 없음 → a.then Job 출력 → 끝(결과 rejected, 개수 1).
  - `AllLedgerView`: 결과 프로미스 상태·남은 개수·요소 표(`<table>`, `<caption>`)·Job 목록. 이전 단계와 바뀐 칸에 "(바뀜)" 텍스트. 색만으로 구분하지 않는다. 375px에서 표는 `overflow-x-auto` region(`tabIndex`, `role="region"`, `aria-label`)으로 감싼다.
  - `concept.test.ts`: ① `assertScenarioInvariants` ② 시나리오 id·라벨·exampleId·단계 수(각 20 이하) ③ `then` 감싸기 실행 기록의 요소 함수 호출 순서(index·값)가 시나리오에서 요소 함수 Job이 실행되는 단계 순서·`values` 변화와 같음 ④ 모든 단계에서 `remaining`이 `1 + 등록한 요소 수 − (반복 끝? 1 : 0) − called인 요소 수`와 같음 ⑤ 마지막 단계의 `result`가 모든 Job 뒤 `util.inspect(all)`과 같음 ⑥ 감싼 실행과 감싸지 않은 실행의 출력이 `expectedOutput`과 같음 ⑦ 본문 근거: 동기 직후 `Promise.all([])`·`Promise.allSettled([])` 이행, `Promise.race([])` pending, `Promise.any([])` 거부(거부는 빈 처리기를 달아 프로세스 보고 방지).
  - `Simulator.tsx`: `label="Promise.all 장부 시뮬레이터"`, `renderState={(state, prevState) => <AllLedgerView … />}`.
- 이유: 장부의 index·개수는 코드 한 줄(`Promise.all([...])`) 안에 숨어 있어 단계로 펼쳐야 보이고, 대조 테스트가 그림을 실제 실행에 묶는다.
- 주의사항: 시나리오는 손으로 쓴다(규칙으로 생성 금지). JS 없이도 첫 단계가 보여야 한다. `promise/concept.test.ts`의 헬퍼를 import하지 말고(개념 폴더 간 의존 금지) 필요한 부분을 이 파일에 쓴다.
- 완료 조건: `npx vitest run app/concepts/promise-static-methods` 통과, ③~⑦이 각각 별도 `it`으로 존재.

### 3. 본문

- 대상: `content.mdx`
- 현재: 필수 h2만
- 변경: 도입(질문 `input-order.js`의 결과가 왜 `["A","B","c"]`인지, 페이지 구성, 전제 개념 링크 — [프로미스](/concepts/promise)의 정적 메서드 절에서 본 기본 결과를 다시 쓰지 않고 '왜'를 본다고 밝힘, 다루지 않는 것). `## 동작 원리` h3(안): ① 네 메서드의 공통 뼈대(결과 프로미스를 먼저 만들고, 요소마다 `Promise.resolve` → `then`, 준비 단계의 오류는 결과 프로미스의 거부 — `iterable-input.js`) ② 자리 번호를 기억하는 요소 함수와 남은 개수(Promise.all, NOTE 인용, 시뮬레이터) ③ 거부는 Reject를 그대로 넘긴다 — 첫 거부만 결과를 정하고 다른 요소와 그 반응은 계속 진행(`keeps-going.js`, 시뮬레이터) ④ allSettled: 두 함수가 같은 호출 기록을 보고 결과를 `{ status, value }`/`{ status, reason }`으로 넣는다, 거부되지 않는다(`settled-order.js`) ⑤ any: 같은 장부를 거부 쪽에, 모두 거부되면 AggregateError의 `errors`(`any-errors.js`) ⑥ 빈 이터러블(`empty.js`, 근거 테스트로 '호출 안에서 이행', race NOTE 1 인용) ⑦ race: 장부가 없고 처음 불린 resolve/reject가 결과를 정한다, 이미 정해진 요소끼리는 넣은 순서(`race-settled.js`). 네 메서드 비교 표(장부 / 결과 프로미스를 정하는 조건 / 빈 이터러블 / 결과 배열) — JSX `<table>`. `## 예제` 예제 7개 코드(`file=`)와 퀴즈(예제마다 1개 이상, 총 8개 이상), 시뮬레이터는 예제 1·2 아래. `## 결과와 이유` 예제별 줄 단위 설명 + 흔한 오해 Callout(안: '결과 배열은 끝난 순서다', 'Promise.all이 거부되면 나머지 작업이 취소된다', 'race는 가장 먼저 끝난 프로미스를 따른다', 'Promise.all([])은 영영 끝나지 않는다').
- 이유: 페이지 구조 규칙(필수 h2)과 사용자가 정한 각도를 따른다.
- 주의사항: 인용은 2절에서 두 판 공통으로 확인한 문장만. '테스트가 확인합니다'류 저자 메모 금지. 표준의 한정어(예: race 설명은 비공식 요약)를 떨어뜨리지 않는다. '복사해서/공유해서'로 원인을 설명하지 않는다. 퀴즈 정답 위치를 섞고 `expectedOutput`과 스크립트로 대조한다. 첫 문단에 `**`가 들어가는 코드 금지. 문단 첫 글자가 `import`/`export`가 되지 않게 한다.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, 퀴즈 정답 대조 스크립트 불일치 0건, 정답 위치가 한 곳에 몰리지 않음, `grep -n "복사\|테스트가" app/concepts/promise-static-methods/content.mdx` 결과에 저자 메모 0건.

### 4. 기존 개념 related, 순위 테스트, 빌드·e2e 등록

- 대상: `promise/meta.ts`, `fetch/meta.ts`, `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `navigation.spec.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `.claude/plans/concept-roadmap-ch43-48.md`
- 현재: 55개 기준, 새 페이지 미등록
- 변경: `promise`·`fetch`의 `related` 끝에 `'promise-static-methods'`. 개수 55 → 56(`concepts.test.ts:104,111,112`, `ConceptPager.test.tsx:18,28`, `navigation.spec.ts:78,84('56번째'),139`와 `/ 55` 34곳, `responsive.spec.ts:1412`). `navigation.spec.ts`: '객체' 검색 순위 `'51'` → `'52'`(개수 16 그대로), `microtask-queue` 다음 링크 → `/concepts/promise-static-methods`, 새 블록(50 / 56, 이전 `microtask-queue`, 다음 `fetch`), `fetch` 이전 링크 → 새 페이지, `fetch`~`es-modules` 순위 +1. 빌드 검사는 `async-generator`·`promise` 항목을 본떠 시뮬레이터 첫 단계·비교 표 region·퀴즈 `<details` 8개 이상. e2e는 경로 상수, a11y(시뮬레이터 진행 후 포함), 가로 스크롤(두 시나리오 마지막 단계) 등록. 로드맵 문서 44행에 추가 게시글로 구현했다고 기록하고 진행 기록 한 줄.
- 이유: 새 페이지는 경로를 직접 등록해야 검사되고, 순위 고정 테스트가 깨진다.
- 주의사항: 기존 케이스는 개수·순위·링크만 바꾼다. `promise`·`fetch`의 `reviewedAt`은 바꾸지 않는다. dev 서버를 재시작한다.
- 완료 조건: `npm test` 통과, `npm run test:build` 통과, 6절 e2e 명령 통과.

### 5. 전체 검증

- 대상: 전체
- 변경: 6절의 정적·e2e·브라우저 검증을 모두 실행한다.
- 주의사항: e2e는 부하에 따라 시간 초과가 날 수 있다. 재실행해 구분하고 보고에 적는다.
- 완료 조건: 6절 명령 모두 통과, 브라우저 시나리오 ①~⑤ 확인(스크린샷).

### 6. 명세 대조

- 대상: `content.mdx`, `meta.ts`, `scenarios.ts`
- 현재: 구현자 자체 점검만 끝난 상태
- 변경: Opus 서브에이전트에 현재 초안과 명세 사본 두 판의 경로(스크래치패드 `draft-control.html`, `spec2026.html`)를 주고, 서술의 조건·분기 누락(예: 준비 단계 오류의 경로, `IteratorClose` 조건), 틀린 모델을 통과시키는 예제, 비공식 요약을 메커니즘처럼 쓴 곳, 언어와 호스트 구분 오류를 찾게 한 뒤 메인이 원문과 실행으로 재확인해 반영한다.
- 이유: 이전 개념들에서 예제 출력이 아니라 서술의 범위와 인과에서 지적이 나왔다.
- 주의사항: 제안 문장을 그대로 쓰지 않는다.
- 완료 조건: 지적마다 수용·기각과 근거를 `구현 진행`에 기록.

## 9. 추가 개선 후보

- `promise` 페이지 '정적 메서드' 절과 `fetch` 본문의 `Promise.all` 설명에서 새 페이지로 가는 본문 링크(역방향 링크 일괄 처리 때).
- `Promise.withResolvers`·`Promise.try`(책 범위 밖) 추가 게시글.

## 변경 이력

- 2026-11-10 (명세 대조): 1절 제외 범위의 '관찰하려면 서브클래스가 필요하다'는 틀림 — `var p = Promise.resolve('x'); p.then = function (f) { f('first'); f('second'); }; Promise.all([p])`가 `["first"]`(Node 실행 확인). `meta.ts` simplifications를 '관찰할 수 없다'에서 '다루지 않는다'로 바꿈 — 영향 단계 1·3
- 2026-11-10 (사용자 검토): ① race 절의 '예제 4의 첫 race가 이 경우입니다'가 thenable 문장 뒤에 붙어 반대 사례로 읽힘(중간) → '반복에서 먼저 나온 요소가 이깁니다' 바로 뒤로 옮기고 thenable 문장에 '(이 경우는 예제로 다루지 않습니다)' ② 흔한 오해 'race는 가장 먼저 끝난 프로미스를 따른다'가 과한 일반화(낮음~중간) → 제목 'race는 언제나 가장 먼저 정해진 프로미스를 따른다', 본문에 '호출 시점에 모두 pending인 표준 프로미스라면 정해진 순서대로 Job이 실행되어 개요 문장과 결과가 같고, 차이는 이미 정해진 요소나 thenable이 섞일 때' 추가 ③ allSettled의 `{ status, value }`를 명세 Record 번역어인 '기록'으로 부름(낮음) → '결과 객체'(본문·비교 표·예제 6 제목·퀴즈·결과와 이유·흔한 오해 1). '같은 호출 기록'(공유 `alreadyCalled` Record)은 유지 ④ 요소 함수 호출 순서 표기가 요소와 값을 섞음(낮음) → 요소 기준 `'c'`, `b`, `a`로 통일(본문 시뮬레이터 설명, 퀴즈 선택지·설명, 흔한 오해 1, `scenarios.ts` 13·17단계). 퀴즈 대조 스크립트의 개념형 퀴즈 제외 패턴을 새 선택지에 맞춤 — 영향 단계 2·3
- 2026-11-10 (사용자 검토 2차, 사소): 결과와 이유 예제 1의 '`c`의 Job'을 '`'c'`의 Job'으로(④ 통일에서 빠진 곳, 본문에 따옴표 없는 `c` 0건), 예제 4 제목 '이미 정해진 프로미스끼리의 race' → '이미 정해진 요소가 있는 race'(둘째 race에 pending인 `slow`가 있음) — 영향 단계 3

## 구현 진행

- baseline (2026-11-10, `521dd0e`): lint 통과 / format:check 통과 / typecheck 통과 / `npm test` 149 파일 4576개 통과 / test:build·e2e 미실행(직전 커밋 `cdcb507` 작업에서 통과 기록, 4단계 뒤 실행)
- [x] 1. 메타와 예제 — 메인 재실행: `tests/examples.test.ts -t promise-static-methods` 7개 통과(2절 표와 일치), content-integrity 732개 통과, 예제 7개 스크래치패드 원본과 `cmp` 일치, `route.tsx`는 `promise/route.tsx`와 `diff` 동일. MDN ko 5개는 서브에이전트가 200 확인, 명세 id 9개는 초안 사본(`draft-control.html`)에 있음(2절)
- [x] 2. 시나리오, 시각화, 대조 테스트 — 메인 재실행: `npx vitest run app/concepts/promise-static-methods` 3 파일 40개 통과. 시나리오 input-order 18단계·keeps-going 15단계, 단계 설명 전문을 메인이 명세와 대조(요소 함수가 결과 상태를 확인하지 않음, 배열 resolve는 then이 없어 바로 이행, Reject를 그대로 넘김 — 2절과 일치). ①~⑦ 별도 `it` 확인(`concept.test.ts:121-319`). 상태에 `iterationDone` 필드를 더함(④ 검산용, 계획 안의 확장이며 범위 변경 아님). 375px 표시는 4단계 e2e에서 확인
- [x] 3. 본문 — 메인 재실행: content-integrity 732개 통과, prettier 통과, 퀴즈 대조(`quiz.mjs`) 출력형 7개 불일치 0·개념형 2개, 정답 위치 2·0·1·3·1·0·2·3·1, `복사|공유|테스트가` 0건. 서브에이전트 `npm run build` 성공(`<details` 9개). 시뮬레이터는 두 시나리오를 한 컴포넌트가 담아 예제 1 아래 한 번만 둠(`promise` 페이지도 1개 — 계획의 '예제 1·2 아래'는 배치 중복 없이 충족). 메인 수정 3곳: ① 공통 뼈대의 오류 경로 — 이터레이터 자신이 던진 오류는 `[[Done]]`이 true가 되어 IteratorClose하지 않고, 닫는 것은 `Promise.resolve`·`then` 호출 오류일 때(초안 IteratorNext·IteratorStep·IteratorStepValue, ES2026 동일 확인) ② race 문단 '이미 정해진 요소가 하나라도 있으면 그쪽 Job이 먼저'를 'race를 부를 때 … race를 부른 뒤에 정해지는 요소의 Job보다'로 한정 ③ 예제 4 퀴즈 설명의 'now의 Job'을 '문자열 now를 바꾼 이행된 프로미스의 Job'으로
- [x] 4. 기존 개념 related, 순위 테스트, 빌드·e2e 등록 — 메인이 diff 확인(`promise`·`fetch` related 끝 한 항목, `reviewedAt` 불변, 개수 55 단정 잔여 0, 로드맵 44행·진행 기록) 후 재실행: lint·format:check·typecheck 통과, `npm test` 152 파일 4636개, `test:build` 451개, `navigation.spec.ts` 16개, `-g "Promise 정적 메서드|promise-static-methods|홈 학습 순서 보기"` 12개(a11y 라이트·다크 × 초기·진행 후, 375px 두 시나리오 마지막 단계, 홈 학습 순서) 통과
- [x] 5. 전체 검증 (6단계 반영 후 재실행) — lint·format:check·typecheck 통과, `npm test` 152 파일 4636개, 퀴즈 대조 불일치 0, `test:build` 451개, `navigation.spec.ts` 16개, 새 페이지 e2e 12개 통과. 브라우저(dev 서버 재시작, 5174): ① 프리렌더 첫 단계·`<details`는 test:build가 확인 ② '넣은 순서로 모으기' 18/18에서 결과 fulfilled `[ 'A', 'B', 'c' ]`, 남은 개수 0, 출력 `B resolved`/`A resolved`/`all ["A","B","c"]` ③ '하나가 거부될 때' 15/15에서 결과 rejected `Error: b failed`, `values[0]` 'A', 남은 개수 1, 출력 일치 ④ 375px 16단계에서 scrollWidth 375 = innerWidth(스크린샷) ⑤ `promise`·`fetch` 관련 개념에 새 링크, 학습 순서 `microtask-queue` 49 → 새 페이지 50 → `fetch` 51 / 56
- [x] 6. 명세 대조 — Opus 서브에이전트(초안·ES2026 사본 + 실행) 지적 High 1·Medium 7·Low 10. 메인이 반례를 Node로 재실행해 확인(any의 배열 이행값 true, thenable·constructor를 바꾼 프로미스가 앞에 있는 race는 `plain`, 이미 이행된 `[late2, early2]`의 any는 `late2`, 인스턴스 then 덮어쓰기 `["first"]`, 이행된 요소 하나의 all 콜백은 다른 Job보다 늦음) 후 반영: H1 비교 표 any 행 '배열이 아님' → '모으지 않음(한 요소의 값 그대로)' / M1 race '넣은 순서가 이긴다'에 '일반 값이거나 Promise.resolve가 그대로 돌려주는 프로미스' 조건과 thenable·다른 constructor 예외(본문·Callout) / M2 any '처음 이행되는 요소' → 'resolve를 처음 부른 반응 Job' / M3 1에서 시작하는 보장에 AlreadyCalled 조건 / M4 meta simplifications '관찰할 수 없다' → '다루지 않는다'(변경 이력) / M5 반복 끝 resolve 괄호 → 표준 프로미스에서는 빈 이터러블뿐 / M6 `scenarios.ts` '곧바로 reject가 불린다' → 'reject를 부르는 Job이 들어간다' / M7 '모든 예제는' → 'pending 프로미스가 필요한 예제는' / L1 오류 경로(Get 실패, 이터레이터를 얻지 못함, 값 꺼내기 과정 → 닫지 않음) / L2 요소 처리 순서를 명세대로(Promise.resolve가 요소 함수 생성 앞) / L3 '같은 생성자' → 'constructor가 같은'(본문·시나리오) / L4 '비공식 요약' → '알고리즘 앞의 개요, 실제 단계는 PerformPromiseRace'(명세가 비공식이라 표시하지 않음) / L5 'resolve든 reject든' / L6 Callout '(예제 3)' → '영영'의 근거는 NOTE / L7 예제 2의 증거 범위를 출력과 명세 단계로 나눔 / L8 meta 'GetPromiseResolve를 다루지 않음' → '생성자의 resolve를 바꾼 경우' / L9 빈 배열 이행에 '배열에는 then이 없으므로'. 기각: L10(시뮬레이터 결과 표기가 util.inspect 형식) — 출력 주장이 아닌 시각화 라벨이고 대조 테스트의 비교 형식이라 유지
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0. Low 3(보고만): ① `AllLedgerView`·비교 표의 '0이 되면 이행'은 resolve의 줄임(배열에 then이 없어 이행 — 본문은 명시) ② `concept.test.ts`의 then 감싸기는 `Promise.all` 호출 중 then의 첫 인수를 모두 요소 함수로 본다 — 지금 예제(thenable 요소 없음)에서는 맞지만 예제를 바꾸면 자리 번호가 어긋날 수 있음 ③ 시뮬레이터를 예제 1 아래 한 번만 둠(두 시나리오를 한 컴포넌트가 담음, `promise` 페이지와 같은 방식). 공통 코드(비테스트) 변경 0, 하이드레이션에 쓰는 값 없음(시나리오·뷰가 정적 데이터만 씀) 확인
- 사용자 검토 1차 반영(변경 이력 4건) 후 재실행: lint·format:check·typecheck 통과, `npm test` 4636개, 퀴즈 대조 불일치 0, `test:build` 451개, `navigation.spec.ts` 16개, 새 페이지 e2e 12개 통과. 수정 범위 재리뷰: 옮긴 문장이 '반복에서 먼저 나온 요소가 이긴다'의 사례(네이티브 프로미스 `[late, early]`)를 가리키고, Callout의 일반 경우 문장이 본문 race 절의 pending 설명과 모순되지 않음, '같은 호출 기록'(Record)은 그대로 둠

## 구현 결과

### 계획 대비 실제 구현

- 새 개념 폴더, `promise`·`fetch`의 `related`, 순위 테스트·빌드·e2e 등록, 로드맵 기록은 계획대로 구현했다. 사용자 최종 승인(2026-11-10)으로 `reviewedAt`을 `2026-11-10`으로 기록했다.
- 달라진 점: ① 시나리오 상태에 `iterationDone`을 더했다(남은 개수 검산용) ② 시뮬레이터는 두 시나리오를 한 컴포넌트가 담아 예제 1 아래 한 번만 두었다 ③ 퀴즈는 9개(개념형 2개 포함) ④ 1절 제외 범위의 '관찰하려면 서브클래스가 필요하다'는 틀려서 '다루지 않는다'로 바꿨다(`변경 이력`).
- 본문은 명세 대조(Opus)와 사용자 검토 두 차례로 고쳤다. 오류 경로와 IteratorClose 조건, race·any의 결정 규칙(반응 Job 순서, 넣은 순서가 이기는 조건과 thenable·다른 constructor 예외), 1에서 시작하는 개수의 AlreadyCalled 조건, any 이행값, '결과 객체', 요소 기준 호출 순서 표기, 예제 4 제목을 반영했다(`변경 이력`, `구현 진행` 6단계).

### 코드 리뷰

- critical-code-review에서 Critical·High는 0건이었다. Low 3건(시뮬레이터·비교 표의 '0이 되면 이행'은 resolve의 줄임, then 감싸기가 thenable 요소가 없는 예제를 전제, 시뮬레이터 한 번 배치)은 보고만 하고 고치지 않았다.

### 후속 작업

- [ ] `promise` 페이지 '정적 메서드' 절과 `fetch` 본문의 `Promise.all` 설명에서 새 페이지로 가는 본문 링크(역방향 링크 일괄 처리 때)
- [ ] `concept.test.ts`의 then 감싸기는 thenable 요소가 없는 예제를 전제한다 — `input-order.js`·`keeps-going.js`를 바꿀 때 자리 번호 기록 방식을 다시 확인(Low)
- [ ] `Promise.withResolvers`·`Promise.try`(책 범위 밖) 추가 게시글 후보

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] race에서 '넣은 순서가 이긴다'는 요소가 일반 값이거나 `Promise.resolve`가 그대로 돌려주는(constructor가 같은) 이미 정해진 프로미스일 때만 쓴다. thenable이나 constructor가 다른 프로미스는 `Promise.resolve`가 새 프로미스로 감싸 NewPromiseResolveThenableJob을 한 번 더 거치므로 앞에 있어도 진다(Node 실행 `plain`). 명세 대조 지적을 메인이 실행으로 확인하고 고쳤다. 같은 이유로 any도 '처음 이행되는 요소'가 아니라 'resolve를 처음 부른 반응 Job'으로 썼다.
- [Claude 판단] 준비 단계 오류는 IfAbruptRejectPromise로 결과 프로미스의 거부가 되지만, 이터레이터에서 값을 꺼내는 과정의 오류는 IteratorNext·IteratorStep·IteratorStepValue가 `[[Done]]`을 true로 만들어 IteratorClose하지 않고, `Promise.resolve`·`then` 호출 오류일 때만 닫는다. 서브에이전트 초안의 '반복 도중의 오류면 닫는다'를 메인이 명세로 고쳤다.
- [Claude 판단] 시뮬레이터는 두 시나리오를 한 컴포넌트의 시나리오 선택으로 담아 예제 1 아래 한 번만 두었다. 계획의 '예제 1·2 아래'를 문자 그대로 따르면 같은 시뮬레이터가 두 번 나온다.
- [무검토 승인] 학습 순서는 책 절 순서(435, `promise` 바로 뒤) 대신 442(`microtask-queue` 뒤)다. 요소 함수가 불리는 순서와 race의 승자가 '프로미스 Job은 넣은 순서대로, 여러 체인이 번갈아 실행된다'에 기대고, `promise` 페이지는 끼어드는 순서를 마이크로태스크 큐로 미뤘다.
- [무검토 승인] 시뮬레이터 대조는 `Promise.all` 호출 중에 `then`의 첫 인수(요소 함수)를 감싸 실제 호출 순서(자리 2 → 1 → 0)와 값을 기록하고, 시나리오의 요소 함수 Job 단계와 `values` 변화를 그 기록에 묶는다. 남은 개수는 `1 + 등록 수 − 반복 끝 1 − 호출 수`로 계산해 단계마다 비교한다. 시나리오를 규칙으로 생성하지 않고 손으로 써서 순환 검증을 피했다.
- 각도(명세 장부 중심), 시각화(Promise.all 장부 시뮬레이터), 메서드 범위(조합 메서드 4개)는 사용자가 골랐다. race 절 문장 위치, race 흔한 오해의 일반 경우, '결과 객체', 요소 기준 호출 순서, 예제 4 제목은 사용자 검토로 고쳤다.

#### 배경지식

- PerformPromiseAll: `values`에 빈 칸 → `Promise.resolve(요소)` → 자리 번호 `[[Index]]`와 `[[AlreadyCalled]]`를 가진 요소 함수 → 남은 개수 +1 → `then(요소 함수, 결과의 reject)`. 반복 끝에서 −1, 요소 함수가 처음 불릴 때마다 −1, 0이면 배열로 resolve한다. 거부 쪽은 결과의 reject를 그대로 넘기므로 첫 거부만 효과가 있다(CreateResolvingFunctions). allSettled는 두 함수가 하나의 alreadyCalled Record를 공유하고, any는 같은 장부를 거부 쪽(`errors`)에 둔다. race는 장부가 없다.
- PerformPromiseThen은 이미 정해진 프로미스면 그 자리에서 Job을 넣고, pending이면 반응을 등록한다. 프로미스 Job은 HostEnqueuePromiseJob을 부른 순서대로 실행된다.
- PromiseResolve는 값이 프로미스이고 `constructor`가 호출한 생성자와 같을 때만 그대로 돌려준다. 그 밖에는 새 프로미스를 만들어 resolve하고, 값이 thenable이면 NewPromiseResolveThenableJob이 한 번 더 들어간다.
- NewPromiseCapability는 `?`라서 `this`가 생성자가 아니면 throw하고, 그 뒤 단계(GetPromiseResolve·GetIterator·반복)는 IfAbruptRejectPromise로 거부가 된다.

#### 확인 질문

1. `Promise.race([late, early])`는 `late`인데 `Promise.race([{ then(r) { r('thenable'); } }, 'plain'])`는 왜 `plain`인가?
   <details><summary>답</summary>두 경우 모두 반응 Job이 먼저 실행된 쪽이 결과를 정한다. `late`·`early`는 constructor가 같은 이미 이행된 프로미스라 `Promise.resolve`가 그대로 돌려주고, `then`이 반복 순서대로 Job을 바로 넣는다. thenable은 `Promise.resolve`가 새 프로미스로 감싸고 NewPromiseResolveThenableJob을 거친 뒤에야 정해지므로, `'plain'`의 Job이 먼저 실행된다(본문 race 절, `구현 진행` 6단계 M1).</details>
2. 남은 개수가 0이 아니라 1에서 시작하는 것만으로 '반복 중에는 결과가 resolve되지 않는다'가 보장되는가?
   <details><summary>답</summary>아니다. 각 요소 함수가 `[[AlreadyCalled]]` 때문에 개수를 한 번만 줄인다는 조건도 필요하다. 같은 콜백을 두 번 부르는 then이 있으면 1에서 시작해도 첫 요소 뒤에 0이 될 수 있다. 명세 NOTE는 1에서 시작하는 이유만 적고, AlreadyCalled의 목적은 적지 않는다(본문 Promise.all 절, `구현 진행` 6단계 M3).</details>
3. `keeps-going.js`의 출력만으로 '결과가 거부된 뒤에도 요소 함수가 values를 채운다'를 증명할 수 있는가?
   <details><summary>답</summary>없다. 출력은 `a`가 이행되고 `a`에 직접 붙인 반응이 실행된다는 것만 보여 준다. 요소 함수가 실행되지 않아도 출력은 같다. 장부 갱신은 명세 단계(요소 함수는 결과 상태를 확인하지 않음)이고, `concept.test.ts`의 then 감싸기 기록(`[0, "A"]`, 결과가 rejected일 때 호출)과 시뮬레이터가 이를 보인다(본문 거부 절, `concept.test.ts` ③).</details>
4. 이 페이지를 order 435(`promise` 바로 뒤)로 옮기면 무엇을 고쳐야 하나?
   <details><summary>답</summary>선수 개념에서 `microtask-queue`를 빼야 한다(선수 개념 order는 자기보다 작아야 한다는 테스트 조건). 본문의 '여러 체인이 끼어드는 순서는 마이크로태스크 큐에서 본 것을 전제' 문장과 그에 기대는 설명(race 승자, 출력 순서)은 아직 배우지 않은 내용이 된다. 또 순위 테스트(`navigation.spec.ts` 등)의 49~56 순위와 이전/다음 링크도 다시 바꿔야 한다(3절 순서 판단, 4단계).</details>
