# async/await 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-05
- 기준: `main` @ `217db1e`

## 0. 요약

- 목적: 43~48장 로드맵 5번. async 함수가 첫 `await`까지 동기로 실행되고 항상 프로미스를 돌려주며, `await` 뒤의 코드는 프로미스 Job으로 이어진다는 것을 ECMAScript 원문과 실행 결과로 설명하는 48번째 개념 `async-await`를 추가한다.
- 범위: 새 개념 폴더 1개(예제 9개, 2시나리오 상태 시뮬레이터 — 개념 전용 뷰), 고정 테스트·e2e·빌드 테스트·content-guide·로드맵, async/await를 '작성 예정'으로 가리키는 다른 개념 4곳의 문구.
- 위험: 명세 판 차이(ES2026판 Await의 push/resume 서술 vs 초안 RunSuspendedContext, 매개변수 이름 value/arg)를 섞어 인용하거나, "await 상태"처럼 명세에 없는 상태를 명세 슬롯처럼 쓰는 것.
- 복잡도: 중간 · Consensus: 생략 (새 개념 추가 패턴 그대로, 공통 코드 변경 없음. 명세 정확성은 구현 뒤 리뷰 + Opus 교차 검토로 확인)
- 미확정: 1건(시나리오 단계 수는 구현 후 고정)

## 1. 요구사항

### 요구사항 (2026-11-05 사용자 결정)

- 로드맵 5번 개념. slug `async-await`, 제목 'async/await: await에서 멈췄는데 호출한 쪽은 왜 먼저 실행될까', category `async`, order 460(48번째·마지막), `reviewedAt: null`.
- 다룰 주제(기본 + 추가 4개 모두):
  - 기본: ① async 함수를 부르면 첫 `await`까지는 동기로 실행되고, 호출은 항상 새 프로미스를 돌려준다 ② `await`는 함수를 멈추고 호출한 쪽으로 돌아가며, 뒤의 코드는 프로미스 Job(마이크로태스크)으로 이어진다 ③ `return` 값은 이행, `throw`는 거부(호출한 쪽에 동기 예외가 나지 않음)
  - 추가: ④ `await` 뒤 코드와 다른 `then` 콜백이 끼어드는 순서, 프로미스가 아닌 값을 `await`해도 멈춤 ⑤ 프로미스를 `return`하면 값을 `return`할 때보다 늦게 이행됨 ⑥ `forEach`는 async 콜백을 기다리지 않음(`for...of` 안의 `await`와 비교) ⑦ `await`한 거부를 `try...catch`로 잡기, async 함수는 생성자가 아님, thenable도 `await`할 수 있음.
- 시각화: 상태 시뮬레이터 — 실행 컨텍스트 스택, async 함수 호출의 상태(실행 중 · await에서 멈춤 · 끝남), 변수에 담긴 프로미스의 상태와 등록된 반응, 프로미스 Job 큐.

### 유지해야 하는 기존 동작

- 공통 셸·실행기·레이아웃은 그대로. 기존 e2e·빌드 테스트는 개수·마지막 개념 값만 바꾸고 새 케이스는 추가만 한다. 다른 개념 파일은 '작성 예정' 문구 4곳만 바꾼다(작업 5).

### 제외 범위

- `try...catch...finally` 문 자체의 의미와 처리되지 않은 거부(로드맵 6번, '작성 예정'), 최상위 `await`(모듈 전용, 로드맵 7번 '작성 예정'), async 제너레이터·`for await...of`, `Promise.all` 등으로 병렬 실행하기, async 화살표 함수·메서드의 차이(같은 규칙이라는 한 문장만), 타이머가 섞인 순서(브라우저 런타임 불필요 — 모든 예제는 `ecmascript`).

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 개념 폴더 패턴은 `app/concepts/generator/`와 같다: `meta.ts`·`content.mdx`·`route.tsx`·`examples/`·`scenarios.ts`·개념 전용 뷰(`GenView.tsx`)·`Simulator.tsx`(공통 `SimulatorShell`에 `label`과 `renderState`만 넘김, `app/concepts/generator/Simulator.tsx`)·`concept.test.ts`·뷰/시뮬레이터 테스트.
- 프로미스 상태를 실제 실행에서 읽는 선례: `app/concepts/promise/concept.test.ts:45-60`(`util.inspect`로 'Promise { <pending> }' 등을 파싱). 다만 그 페이지의 추적은 `Promise.prototype.then`을 감싸는데, `await`는 `then`을 부르지 않고 PerformPromiseThen을 직접 하므로(아래 Await) 이 방식으로 `await` 재개를 잡을 수 없다 → 이 페이지는 `console.log`를 감싸 출력 시점마다 상태를 읽는다(작업 2).
- 예제 실행기: `tests/helpers/run-example.ts:6-17` — 예제마다 새 컨텍스트, `microtaskMode: 'afterEvaluate'`로 평가 직후 프로미스 Job까지 실행해 출력 수집.
- `'async'` 카테고리 존재(`app/lib/concepts.ts:2`), 마지막 개념은 `generator`(order 450).
- async/await를 '작성 예정'으로 가리키는 곳: `app/concepts/generator/content.mdx:104`, `app/concepts/generator/meta.ts:125`, `app/concepts/promise/meta.ts:104`, `app/concepts/microtask-queue/meta.ts:113`. 이 문구를 고정한 테스트는 없다(`grep '작성 예정' tests app/lib app/components` 결과 없음). 선례: 021bf38에서 event-loop·promise의 '작성 예정'을 링크/개념 이름으로 바꿈.
- 홈 '객체' 검색 개수를 고정한 e2e가 있다(`tests/e2e/navigation.spec.ts:14` 등). 새 meta의 summary·tags에 '객체'를 넣지 않으면 개수는 그대로다(작업 1 완료 조건에서 확인).
- 명세(ES2026판 사본과 현재 초안 사본 둘 다에 글자 그대로 있음, 공백 정규화 후 대조):
  - EvaluateAsyncFunctionBody: "Let promiseCapability be ! NewPromiseCapability(%Promise%)." / FunctionDeclarationInstantiation이 abrupt이면 `[[Reject]]` 호출, 아니면 "Perform AsyncFunctionStart(promiseCapability, FunctionBody)." / "Return ReturnCompletion(promiseCapability.[[Promise]])." (초안은 매개변수 이름만 funcObj·argList로 다름 — 위 세 문장은 같음)
  - AsyncBlockStart: "Assert: If we return here, the async function either threw an exception or performed an implicit or explicit return; all awaiting is done." / return completion이면 "Perform ! Call(promiseCapability.[[Resolve]], undefined, « result.[[Value]] »)." / throw completion이면 `[[Reject]]`. 그 뒤 서술(ES2026판 push/resume vs 초안 RunSuspendedContext·"Resume callerContext")은 판마다 다르므로 인용하지 않는다.
  - Await: "Let asyncContext be the running execution context." / PromiseResolve 줄은 매개변수 이름이 판마다 다름(value/arg) → 인용 금지 / "Perform PerformPromiseThen(promise, onFulfilled, onRejected)." (두 판 같음). 멈추고 호출자로 돌아가는 서술은 판마다 다름 → 인용 금지, 풀어서 설명.
  - PromiseResolve: 인수가 프로미스이고 그 `constructor`가 같으면 그 프로미스를 그대로 돌려주고, 아니면 새 프로미스를 만들어 resolve한다(두 판 같은 흐름, 매개변수 이름 x/resolution 다름 → 인용 금지).
  - CreateResolvingFunctions의 resolve: 객체이고 `then`이 호출 가능하면 "Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]])."로 NewPromiseResolveThenableJob을 넣는다(두 판 같음). NewPromiseResolveThenableJob Note: "This process must take place as a Job to ensure that the evaluation of the then method occurs after evaluation of any surrounding code has completed." (두 판 같음)
  - AsyncFunction 인스턴스: "AsyncFunction instances are not constructors and do not have a [[Construct]] internal method." / "AsyncFunction instances do not have a prototype property as they are not constructable." (두 판 같음, 초안은 'internal method' 뒤 공백만 다름 — 정규화 후 같음)
  - `forEach`의 콜백 호출 줄은 판마다 변수 이름이 달라(O/obj) 인용하지 않는다. 반환값을 쓰지 않는다는 것만 풀어 쓴다.
- 실행 결과(2026-11-05, 부록 예제 9개를 `runInNewContext` + `afterEvaluate`와 일반 `node` 양쪽으로 실행, 출력 동일):

  | 예제 | 출력 |
  | - | - |
  | sync-until-await | a1, after call, a2, then done |
  | always-promise | true, false, sync end, value 1 |
  | interleave | sync, task after await, then 1, then 2 |
  | return-throw | 호출은 모두 끝남, a 이행: ok, b 거부: boom, c 거부: ReferenceError |
  | return-promise | returnsValue: value, tick 1, tick 2, returnsPromise: promise, tick 3 |
  | foreach | forEach 직후: [], for...of: [1,2,3], forEach 나중: [1,2,3] |
  | catch-rejection | 잡음: 실패, 결과: 계속 |
  | not-constructor | false, new: TypeError |
  | thenable | sync end, then 호출됨, v = 7 |

- return-promise 순서의 명세 근거(Job 큐 추적): `returnsPromise()`의 return이 `[[Resolve]]`에 이행된 프로미스를 넘김 → thenable이므로 NewPromiseResolveThenableJob(J1) / `returnsValue()`는 곧바로 이행, `.then` 등록 시 반응 Job(J2) / `tick 1` Job(J3). J1이 안쪽 프로미스의 `then`을 불러 반응 Job(J4), J2 `returnsValue: value`, J3 `tick 1`(→ tick 2 Job J5), J4가 바깥 프로미스를 이행(→ 콜백 Job J6), J5 `tick 2`, J6 `returnsPromise: promise`, … 실행 결과와 일치.

### 추정

- 없음

## 3. 구현 전략

- **새 개념 폴더 + 개념 전용 상태 시뮬레이터.** 상태 모델(`scenarios.ts`):

  ```ts
  export type CallStatus = 'running' | 'awaiting' | 'completed' // 표시: 실행 중 / await에서 멈춤 / 끝남
  export type AsyncState = {
    stack: string[] // 실행 컨텍스트 스택. 아래 → 위. '전역 코드', '<함수 이름> 본문', '<콜백 이름>'. 전역 코드가 끝나면 []
    calls: { name: string; status: CallStatus }[] // async 함수 호출(그 실행 컨텍스트)
    promises: { name: string; state: 'pending' | 'fulfilled' | 'rejected'; result: string | null; reactions: string[] }[] // 변수에 담긴 프로미스
    jobs: string[] // 프로미스 Job 큐. 넣은 순서대로, 앞이 먼저. 실행 중인 Job은 stack에 있고 jobs에는 없다
  }
  ```

  - `status`는 명세의 슬롯이 아니다(제너레이터의 [[GeneratorState]]와 달리 async 함수에는 상태 슬롯이 없음). "멈춘 실행 컨텍스트"를 이름 붙여 보인 것 → `simplifications`.
  - 시나리오 1 `basic` ← `sync-until-await.js`: 호출(본문 컨텍스트 push, NewPromiseCapability로 `p`가 될 프로미스 pending) → `a1` → `await null`(PromiseResolve가 이행된 새 프로미스를 만들고 PerformPromiseThen → 이미 이행돼 있어 'work 재개' Job이 곧바로 큐에, work는 멈추고 스택에서 빠짐) → `p`에 대입 → `after call` → `p.then`(pending `p`에 반응 등록) → 동기 코드 끝(stack []) → Job 'work 재개' → `a2` → `return 'done'`(`[[Resolve]]`로 `p` 이행 → 반응이 'then 콜백' Job으로) → Job 'then 콜백' → `then done` → 끝.
  - 시나리오 2 `interleave` ← `interleave.js`: `task()` 호출 → `await 'not a promise'`(PromiseResolve가 새 프로미스로 감쌈 → 'task 재개' Job) → `Promise.resolve().then(...)`('then 1 콜백' Job) → `.then(...)`(아직 pending인 파생 프로미스에 등록 — 그 프로미스는 그리지 않음) → `sync` → Job 순서대로 'task 재개'(`task after await`) → 'then 1 콜백'(끝나면 'then 2 콜백' Job) → 'then 2 콜백'. 변수에 담긴 프로미스가 없으므로 `promises`는 비어 있다.
  - 내장 함수(`then`, `console.log`, Await가 만든 onFulfilled 내장 함수)의 실행 컨텍스트는 그리지 않는다(제너레이터·프로미스 페이지와 같은 단순화) → `simplifications`.
- **실제 실행 대조.** `concept.test.ts`에서 `console.log`를 감싸 예제를 vm으로 실행하고, 출력 줄마다 그 시점의 `p` 상태(`util.inspect`)를 기록해 시나리오에서 그 출력이 처음 나오는 단계의 `p` 상태와 비교한다. 동기 코드 끝 시점(평가 직후, Job 실행 전)의 출력·`p` 상태도 시나리오의 '동기 코드 끝' 단계와 비교한다.
- **본문 구성** (`동작 원리` h3): ① 부르면 첫 await까지는 동기로 실행된다(EvaluateAsyncFunctionBody·AsyncBlockStart, 예제 1·2) ② await는 함수를 멈추고 호출한 쪽으로 돌아간다(Await의 PerformPromiseThen, 재개는 프로미스 Job — [마이크로태스크 큐](/concepts/microtask-queue) 링크, 프로미스가 아닌 값도 PromiseResolve가 감쌈, 멈췄다 이어지는 실행 컨텍스트는 [제너레이터](/concepts/generator)와 비교, 예제 3) ③ return은 이행, throw는 거부(AsyncBlockStart, 매개변수 처리 오류도 거부, 예제 4) ④ 프로미스를 return하면 늦어진다(CreateResolvingFunctions → NewPromiseResolveThenableJob, [프로미스](/concepts/promise)의 채택 설명과 연결, `await p`는 PromiseResolve가 `p`를 그대로 쓴다는 대비, 예제 5) ⑤ forEach는 기다리지 않는다(예제 6) ⑥ 거부 잡기·생성자 아님·thenable(예제 7·8·9, `try...catch`는 '작성 예정') ⑦ 다루지 않는 것. `예제`(9개, 각 뒤 퀴즈 1~2개, 시뮬레이터는 예제 3 뒤) → `결과와 이유`(예제별 결과 표 `<Wide>` + 오해 Callout: "await는 프로그램 전체를 멈춘다", "async 함수 안의 throw는 호출하는 순간 예외가 된다", "프로미스가 아닌 값을 await하면 멈추지 않는다", "forEach에 async 콜백을 넘기면 하나씩 기다린다").
- **명세 판 처리.** 링크는 현재 초안(`https://tc39.es/ecma262/#…`), 인용은 2절의 두 판 공통 문장만. 단계 설명에 `RunSuspendedContext`·`RunCallerContext`·매개변수 이름을 쓰지 않는다.
- **버린 대안.** (a) 시나리오 3개(return-promise 포함): Job이 6개 넘게 쌓여 화면이 길고, 같은 메커니즘(thenable Job)은 프로미스 페이지 시뮬레이터가 이미 보여 줌 — 예제·Job 추적 문단·퀴즈로 충분. (b) microtask-queue 시뮬레이터 재사용: 상태 모델이 태스크·체크포인트 중심이라 async 함수 상태를 담지 못함. (c) 브라우저 런타임: 타이머가 필요 없고 언어 동작이라 `ecmascript`로 충분.

## 4. 변경 파일

- 추가: `app/concepts/async-await/` — `meta.ts`, `content.mdx`, `route.tsx`, `examples/*.js`(9개, 부록), `scenarios.ts`, `AsyncView.tsx`, `AsyncView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`.
- 수정(고정 테스트): `app/lib/concepts.test.ts`(총 48, 마지막 async-await, 그 앞 generator), `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(48개·'48번째'·'/ 48', generator 47/48 링크, async-await 48/48), `tests/e2e/responsive.spec.ts`(홈 48 + 새 페이지 2 케이스), `tests/e2e/a11y.spec.ts`(2 케이스), `tests/e2e/helpers.ts`(경로·시뮬레이터 이름 상수), `tests/build/build-output.test.ts`(`시뮬레이터 프리렌더 (async-await)`).
- 수정(문서): `docs/content-guide.md`(e2e 목록에 async-await), `.claude/plans/concept-roadmap-ch43-48.md`(5번 진행 기록).
- 수정('작성 예정' 문구): `app/concepts/generator/content.mdx:104`(async/await 부분만 링크), `app/concepts/generator/meta.ts:125`, `app/concepts/promise/meta.ts:104`, `app/concepts/microtask-queue/meta.ts:113` — async/await 부분만 "async/await 개념에서 다룹니다"로, 나머지(try...catch, async 제너레이터 등)는 '작성 예정' 유지.
- 변경하지 않음: `app/simulator/`·`app/components/`·`app/lib/`(공통 코드), 실행기.

## 5. 위험 요소

- 명세 판 혼용 → 인용이 어느 판에도 없는 문장이 됨 → 인용 대조 스크립트를 두 사본에 돌려 모두 있음을 확인(작업 4).
- "awaiting" 같은 표시 상태를 명세 슬롯처럼 서술 → 본문·단계 설명에서 "멈춘 실행 컨텍스트"로 쓰고 simplifications에 밝힘, 테스트로 설명에 '[[AsyncState' 같은 가짜 슬롯 이름이 없음을 검사(작업 2·4).
- 시나리오 Job 순서가 실제와 다름 → 실제 실행 대조 테스트(출력 시점 `p` 상태, 동기 끝 스냅샷)와 FIFO 불변식(작업 2).
- `return-promise`의 "두 Job 더"를 일반 규칙처럼 씀(엔진 최적화·판 차이) → 명세 단계로만 설명하고, 결과는 이 예제의 실행 결과로 한정(작업 4).
- `forEach 나중: [1,2,3]`이 우연한 순서처럼 보임 → forEach 콜백 셋의 재개 Job이 for...of의 첫 재개 Job보다 먼저 들어간다는 Job 순서로 설명(작업 4).
- 홈 '객체' 검색 개수 변화 → summary·tags에 '객체' 미포함 확인, 바뀌면 navigation.spec 갱신(작업 1·5).
- 다른 개념 문구 수정이 그 페이지 테스트를 깨뜨림 → 해당 개념 테스트·빌드 테스트 실행(작업 5·6).
- 시뮬레이터 칸이 좁은 화면에서 넘침 → responsive e2e(375) 두 시나리오 끝까지(작업 5·6).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "async-await|async/await|홈 학습 순서 보기|generator|제너레이터"`.
- 브라우저(빌드 serve): 1280 라이트·375 다크에서 두 시나리오를 끝까지 넘기며 `scrollWidth`=창 너비, 단계마다 바뀐 칸에만 "(바뀜)", JS를 끈 상태에서 `<details>` 수 = 퀴즈 수와 시뮬레이터 첫 단계, generator 페이지 '다음' 링크가 /concepts/async-await.

## 7. 미확정 사항

- [미확정] 시나리오 단계 수(basic 약 14, interleave 약 15)는 구현 후 고정한다(작업 2).

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `app/concepts/async-await/examples/*.js`, `meta.ts`, `route.tsx`
- 변경: 부록 예제 9개를 그대로 만든다(Prettier·ESLint 제외 경로, 줄 번호 고정). meta: slug·제목·category `async`·order 460·`reviewedAt: null`, summary(160자 이하, '객체' 없이), tags, goals 6개 안팎, prerequisites(프로미스·마이크로태스크 큐·제너레이터), related, examples 9개(모두 `ecmascript`, expectedOutput은 2절 표), references(ECMAScript 절들 + MDN), simplifications(표시 상태, 내장 함수 프레임 생략, try...catch·처리되지 않은 거부·최상위 await·async 제너레이터는 작성 예정, Promise.all 병렬 제외, 판 인용 방침, 예제는 vm 실행값, return-promise의 순서는 이 예제의 명세 단계와 실행 결과). route는 generator와 같은 얇은 모듈.
- 주의사항: meta.ts → content.mdx → route.tsx 순으로 만든다(실행 중 dev 서버가 ./meta 실패를 캐시하지 않게). references 라벨에 절 번호 없음.
- 완료 조건: `npx vitest run tests/examples.test.ts -t async-await`에서 예제 9개 통과, content-integrity·app/lib 테스트 통과, summary·tags에 '객체' 없음(grep).

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절 상태 모델로 두 시나리오. `code`는 `examples/<file>?raw`. 테스트: `assertScenarioInvariants`, 고정 줄 번호, 첫 단계('실행 시작', stack ['전역 코드'], 나머지 비어 있음), 마지막 단계(stack [], jobs [], 출력 = expectedOutput), 상태 전이(running ↔ awaiting → completed, completed는 그대로), running 호출이 있으면 스택 맨 위가 그 본문, Job은 앞에서만 꺼내고 뒤에만 넣음(FIFO), 출력은 한 단계 한 줄까지이고 그 단계 line 범위에 그 console.log가 있음, 실제 실행 대조(출력 줄마다 `p` 상태, 동기 끝 스냅샷), 설명에 판마다 다른 이름(RunSuspendedContext 등)과 가짜 슬롯 이름이 없음.
- 주의사항: Step은 전체 스냅샷. 첫 단계는 JS 없이도 보이는 상태.
- 완료 조건: `npx vitest run app/concepts/async-await/concept.test.ts` 통과, 음성 확인(시나리오의 Job 순서 하나를 바꾸면 실패 후 원복).

### 3. 뷰·시뮬레이터

- 대상: `AsyncView.tsx`, `AsyncView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`
- 변경: 칸 4개(실행 컨텍스트 스택 / async 함수 호출 / 프로미스 / 프로미스 Job 큐), `grid-cols-1 sm:grid-cols-2`, 이전 단계와 달라진 칸에 "(바뀜)"(GenView·MicroView 패턴). label 'async/await 시뮬레이터'.
- 완료 조건: `npx vitest run app/concepts/async-await` 통과, typecheck·eslint·prettier 통과.

### 4. 본문

- 대상: `content.mdx`
- 변경: 3절 본문 구성. 첫 문단은 산문(`*`·`**` 금지 — 빌드 firstProseLine 검사). 영어 인용은 2절의 두 판 공통 문장만. 퀴즈는 PredictQuiz(문자열 prop 안 작은따옴표 금지). 결과 표 결과 열 = expectedOutput.
- 주의사항: try...catch·최상위 await·처리되지 않은 거부는 '작성 예정'. 엔진 최적화·구현 이야기를 쓰지 않는다.
- 완료 조건: 인용 대조 스크립트로 영어 인용 전부가 ES2026판·초안 사본 양쪽에 있음, `npm run test:build` 통과(MDX 컴파일 포함).

### 5. 고정 테스트·e2e·빌드 테스트·문서·'작성 예정' 문구

- 대상: 4절 수정 파일들
- 변경: 개수 48·마지막 async-await·이전 generator, a11y 2·responsive 2 케이스(시나리오 진행 후 axe, 가로 스크롤), 빌드 테스트(`<details` ≥ 퀴즈 수, 시뮬레이터 첫 단계 프리렌더), content-guide e2e 목록, '작성 예정' 4곳.
- 완료 조건: `npm test` 통과, `npx playwright test tests/e2e/navigation.spec.ts` 통과, `-g "async-await|async/await|홈 학습 순서 보기|generator|제너레이터"` 통과.

### 6. 전체 검증

- 완료 조건: 6절 정적 명령 전체 통과, e2e 통과, 브라우저 확인 항목 기록.

## 부록: 예제 초안 (2026-11-05 실행 확인)

### sync-until-await.js

```js
async function work() {
  console.log('a1');
  await null;
  console.log('a2');
  return 'done';
}
var p = work();
console.log('after call');
p.then(function (v) {
  console.log('then ' + v);
});
```

### always-promise.js

```js
async function one() {
  return 1;
}
var p = one();
console.log(p instanceof Promise);
console.log(p === one());
p.then(function (v) {
  console.log('value ' + v);
});
console.log('sync end');
```

### interleave.js

```js
async function task() {
  await 'not a promise';
  console.log('task after await');
}
task();
Promise.resolve()
  .then(function () {
    console.log('then 1');
  })
  .then(function () {
    console.log('then 2');
  });
console.log('sync');
```

### return-throw.js

```js
async function ok() {
  return 'ok';
}
async function fail() {
  throw new Error('boom');
}
async function badParam(x = missing) {
  return x;
}
var a = ok();
var b = fail();
var c = badParam();
console.log('호출은 모두 끝남');
a.then(function (v) {
  console.log('a 이행: ' + v);
});
b.catch(function (e) {
  console.log('b 거부: ' + e.message);
});
c.catch(function (e) {
  console.log('c 거부: ' + e.name);
});
```

### return-promise.js

```js
async function returnsPromise() {
  return Promise.resolve('promise');
}
async function returnsValue() {
  return 'value';
}
returnsPromise().then(function (v) {
  console.log('returnsPromise: ' + v);
});
returnsValue().then(function (v) {
  console.log('returnsValue: ' + v);
});
Promise.resolve()
  .then(function () {
    console.log('tick 1');
  })
  .then(function () {
    console.log('tick 2');
  })
  .then(function () {
    console.log('tick 3');
  });
```

### foreach.js

```js
var viaForEach = [];
[1, 2, 3].forEach(async function (x) {
  await null;
  viaForEach.push(x);
});
console.log('forEach 직후: ' + JSON.stringify(viaForEach));
async function viaForOf() {
  var done = [];
  for (var x of [1, 2, 3]) {
    await null;
    done.push(x);
  }
  return done;
}
viaForOf().then(function (done) {
  console.log('for...of: ' + JSON.stringify(done));
  console.log('forEach 나중: ' + JSON.stringify(viaForEach));
});
```

### catch-rejection.js

```js
async function load() {
  try {
    await Promise.reject(new Error('실패'));
    console.log('여기는 실행되지 않음');
  } catch (e) {
    console.log('잡음: ' + e.message);
  }
  return '계속';
}
load().then(function (v) {
  console.log('결과: ' + v);
});
```

### not-constructor.js

```js
async function f() {}
console.log('prototype' in f);
try {
  new f();
} catch (e) {
  console.log('new: ' + e.name);
}
```

### thenable.js

```js
var thenable = {
  then: function (resolve) {
    console.log('then 호출됨');
    resolve(7);
  }
};
async function read() {
  var v = await thenable;
  console.log('v = ' + v);
}
read();
console.log('sync end');
```

## 변경 이력

- 2026-11-05 (리뷰 지적 — Opus 명세 정확성 교차 검토, 원문·node 실행으로 재확인 후 반영): ① [High] "return은 이행"을 일반 규칙처럼 씀 → AsyncBlockStart는 [[Resolve]]를 부를 뿐이고 프로미스·thenable이면 그 결과를 따름(거부된 프로미스를 return하면 거부 — node 확인). h3·예제 4 제목 "return은 resolve, throw는 거부", 본문·결과 요약·표·goal 4, 예제 5·절 제목과 goal 5는 "이행된 프로미스를 return하면"으로 한정(요구사항 ③⑤의 표현도 같은 뜻으로 읽음) ② [Medium] 프로미스가 아닌 값의 await 설명을 "프로미스도 thenable도 아닌 값"으로 한정 ③ [Medium] 오해 3의 "값이 무엇이든" 제거(네이티브 프로미스는 그대로 씀, PromiseResolve 중 예외면 멈추지 않음 — node 확인) ④ [Medium] 예제 6 원인 "await 세 번 거치는 사이" → 세 콜백이 viaForOf 첫 재개 전에 모두 끝남(node 추적 확인), 퀴즈 정답·해설 ⑤ [Medium] AsyncFunctionStart의 컨텍스트 복사와 원래 함수 컨텍스트를 거쳐 돌아가는 과정을 한 칸으로 줄인 것을 simplifications에 추가 ⑥ Low: 이미 거부된 경우, return 없이 끝나면 별도 단계 undefined, 재개 지점("await 식이 결과 값으로 평가되는 지점"), forOf 방법 단정 완화, 조사, [[Construct]] 표기 — 영향 단계 1·4
- 2026-11-05 (사용자 검토, node 실행·두 판 사본으로 확인 후 반영): ① await는 스택에서 바로 아래 컨텍스트로 돌아감 — 첫 await는 함수를 부른 코드, Job으로 재개된 뒤의 await는 그 Job(viaForOf 두 번째 반복부터), goal 2·결과 요약 ② await 피연산자도 멈추기 전에 동기로 평가(`await operand()` → g1, operand 평가, after g(), g2 확인), goal 1 ③ "반응도 Job" → "반응도 프로미스 Job으로 실행" ④ 네이티브 프로미스를 그대로 쓰는 조건(constructor가 %Promise%), 서브클래스·다른 realm은 thenable 경로(MyP 재개가 늦음 확인) ⑤ "호출한 쪽의 스택" → "스택에서 호출한 쪽의 컨텍스트 위", "호출한 쪽의 코드 안에서" → "호출이 값을 돌려주기 전에"(본문·퀴즈·시나리오 설명) ⑥ 참고 링크 #sec-promise-resolve-functions(oldids) → #sec-createresolvingfunctions — 영향 단계 1·2·4
- 2026-11-06 (사용자 검토 2차): 앞 수정에서 문장을 끼워 넣으며 생긴 흐름 문제 2건 — ① "이 컨텍스트는"의 지시 대상이 바뀜 → "멈춘 async 함수의 컨텍스트는" ② "그래서 예제 1에서…"의 근거가 피연산자 설명이 됨 → 피연산자 두 문장을 예제 1 설명 뒤로 이동 — 영향 단계 4

## 구현 진행

- baseline (2026-11-05, `217db1e`): 커밋 직전 같은 코드로 실행한 결과 재사용 — lint·format:check·typecheck 통과, `npm test` 128파일 4005개, `test:build` 379개 통과(이후 변경은 계획 문서뿐)
- [x] 1. 예제·meta·route — 예제 9개가 부록과 바이트 단위 일치(메인 스크립트 대조), 메인 재실행: `examples.test -t async-await` 9개, `vitest app/concepts/async-await` 43개, lint·typecheck 통과. summary·tags에 '객체' 없음. references ECMAScript 9·MDN 2(id는 초안 사본에서 확인). content.mdx는 임시(필수 h2만)
- [x] 2. 시나리오와 대조 테스트 — 단계 수 basic 14·interleave 16(고정, 미확정 사항 해소). 실제 실행 대조는 기본 vm 모드(afterEvaluate는 평가 직후 Job까지 돌아 동기 끝 시점을 못 읽음)에서 console.log를 감싸 출력마다 `p`를 inspect, runInContext 직후 스냅샷을 '동기 코드 끝'과 비교. 대입 전 프로미스는 'work()의 프로미스'(그 시점 `p`는 undefined라 대조가 맞음). 음성 확인(서브에이전트: interleave Job 순서 교환 → FIFO·개념 불변식 실패 후 원복). 메인 수정: return·task 끝 단계를 명세 순서(AsyncBlockStart가 컨텍스트를 뺀 뒤 [[Resolve]])로, '동기 코드 끝'에 Job 시작 조건(스택이 빔) 명시
- [x] 3. 뷰·시뮬레이터 — `AsyncView`(스택·호출·프로미스·Job 큐 4칸), label 'async/await 시뮬레이터', 테스트 포함 43개 통과
- (작업 5 일부 선행, 메인) '작성 예정' 4곳: generator content(링크)·generator meta·promise meta·microtask-queue meta, prettier 통과
- [x] 4. 본문 — 퀴즈 18개, 영어 인용 11개(메인이 ES2026판·초안 사본 양쪽 포함을 공백 정규화로 대조). 메인 검토 수정: PerformPromiseThen 설명 뒤에 TriggerPromiseReactions·CreateResolvingFunctions의 문장("Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).")을 인용한 것을 제거(PerformPromiseThen은 fulfillJob 이름), throw가 동기 예외가 안 되는 이유를 "이미 프로미스가 돌아가 있어서"→"AsyncBlockStart가 거부로 바꾸고 호출은 프로미스를 정상 반환", `await p`의 PromiseResolve 조건 표현, 표의 'Promise Resolve Functions'→CreateResolvingFunctions(meta 참고 라벨도), 오해 2의 "catch나 await가 필요" 표현
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서 — 서브에이전트, diff 확인(generator 때와 같은 패턴). 홈 '객체' 검색은 meta title·summary·tags에 '객체'가 없어 16 그대로
- [x] 6. 전체 검증(메인): lint·format:check·typecheck 통과, `npm test` 131파일 4070개, `test:build` 387개(본문 수정 후 재실행), navigation 16개, `-g "async-await|async/await|홈 학습 순서 보기|generator|제너레이터"` 26개 통과. 화면(빌드 serve): 1280 라이트·375 다크에서 두 시나리오(14·16단계)를 끝까지 넘기는 동안 scrollWidth 최대값 = 창 너비, JS 끔 `<details>` 18개 = 퀴즈 수, 첫 단계 프리렌더, generator '다음' 링크가 /concepts/async-await
- [x] 7. 리뷰(critical-code-review, 메인 + Opus 명세 정확성 교차 검토): 코드(AsyncView·대조 테스트·e2e·빌드 테스트) 지적 없음. 명세 정확성 High 1·Medium 4·Low 6 — 메모리 기준(명세와 다른 설명·오개념 위험은 High)으로 판정해 `변경 이력`대로 모두 수정. 재검증: lint·format:check·typecheck 통과, `npm test` 4070개, `test:build` 387개, `-g "async-await|async/await|홈 학습 순서 보기"` 14개 통과, 영어 인용 11개 두 판 모두 일치
- [x] 8. 사용자 검토 반영(`변경 이력` 사용자 검토): lint·format:check·typecheck 통과, content-integrity·개념 테스트 671개, `test:build` 387개, `-g "async-await|async/await"` e2e 12개 통과. 새 영어 인용 없음
- [x] 9. 사용자 검토 2차 반영: format:check 통과, content-integrity 628개, `test:build` 387개 통과(본문 문장만 변경, 코드·시나리오·예제 변경 없음)

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 새 개념 `async-await`(order 460, async, 48번째·마지막)를 추가했다. 예제 9개(모두 ecmascript), 상태 시뮬레이터 2시나리오(basic 14단계·interleave 16단계), 퀴즈 18개, 영어 인용 11개(ES2026판·현재 초안 공통 문장). '작성 예정' 문구 4곳을 새 개념으로 연결했다.
- 달라진 점: ① 미확정이던 단계 수를 14·16으로 고정했다. ② 리뷰로 요구사항의 표현 "return은 이행"을 "return은 resolve(값이면 이행, 프로미스면 그 결과를 따름)"로, "프로미스를 return하면 늦어짐"을 "이행된 프로미스를 return하면"으로 좁혔다. ③ 실제 실행 대조는 계획의 방식대로 하되 `afterEvaluate`가 아니라 기본 vm 모드로 실행했다(동기 코드 끝 시점을 읽기 위해). ④ `reviewedAt`은 계획상 `null`이었으나 사용자 최종 승인(2026-11-06)으로 그날짜를 기록했다.

### 코드 리뷰

- critical-code-review(메인 + Opus 명세 정확성 교차 검토): 코드 지적 없음, 명세 정확성 High 1·Medium 4·Low 6 모두 수정. 메인 검토에서 인용 위치(PerformPromiseThen 뒤의 다른 연산 문장)와 throw의 원인 서술도 수정. 사용자 콘텐츠 검토 두 차례(6건, 2건)를 실행·원문 확인 후 반영. 남긴 항목 없음.

### 후속 작업

- [ ] 로드맵 6번 try/catch/finally와 비동기 에러(이 페이지의 '작성 예정' 문구 링크화 포함)
- [ ] 로드맵 7번 ES 모듈(최상위 await '작성 예정' 문구 링크화 포함)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] "return은 이행"을 "return은 resolve"로 바꾸고 예제 5의 범위를 "이행된 프로미스를 return하면"으로 좁혔다 — AsyncBlockStart는 `[[Resolve]]`를 부를 뿐이고, 프로미스·thenable이면 그 결과를 따른다. 출력은 그대로 맞아도 "return = 이행"이라는 오개념이 남아서 Opus 리뷰 High로 고쳤다.
- [Claude 판단] 시나리오 대조 테스트는 `microtaskMode: 'afterEvaluate'` 대신 기본 vm 모드로 실행한다 — `afterEvaluate`는 평가가 끝나면서 Job까지 돌아 '동기 코드 끝' 시점의 `p`를 읽을 수 없다. 기본 모드는 `runInContext` 직후가 그 시점이다.
- [Claude 판단] `var p = work()`에서 대입 전의 프로미스를 'work()의 프로미스'로 부르고 대입 단계에서 `p`로 바꿨다 — 그 시점에 실제 `p`는 undefined라서, 대조 테스트가 실제 실행과 맞으려면 이름을 나눠야 한다.
- [무검토 승인] 시뮬레이터의 실행 중 · await에서 멈춤 · 끝남은 명세 슬롯이 아닌 표시이고, 시나리오는 2개로 하며 프로미스를 return하는 경우는 Job 추적 문단으로 설명한다 — 계획 3절.
- [무검토 승인] `await`는 `then`을 부르지 않으므로 프로미스 페이지처럼 `then`을 감싸지 않고 `console.log`를 감싸 상태를 읽는다 — 계획 3절.
- `await`는 스택에서 바로 아래 컨텍스트로 돌아간다(첫 await는 함수를 부른 코드, Job으로 재개된 뒤에는 그 Job). 피연산자는 멈추기 전에 평가되고, 프로미스를 그대로 쓰는 조건은 `constructor`가 `%Promise%`일 때다(사용자 검토).

#### 배경지식

- EvaluateAsyncFunctionBody: 새 프로미스 → FunctionDeclarationInstantiation → 오류면 `[[Reject]]`, 아니면 AsyncFunctionStart로 본문 시작 → 프로미스 반환. 그래서 제너레이터와 달리 본문이 호출 안에서 시작하고, 매개변수 오류도 거부가 된다.
- Await: PromiseResolve로 프로미스를 얻고 PerformPromiseThen으로 재개 함수를 반응으로 등록한 뒤 컨텍스트를 멈춘다. 이미 처리된 프로미스면 그 자리에서 Job이 큐에 들어간다.
- AsyncBlockStart: 본문이 끝나면 컨텍스트를 스택에서 뺀 뒤 `[[Resolve]]`나 `[[Reject]]`를 부른다.
- resolve 함수: 인수가 호출 가능한 `then`을 가진 객체이면 NewPromiseResolveThenableJob을 큐에 넣는다. 이 Job과 그 `then`이 만든 반응 Job 때문에 프로미스를 return하면 Job 둘이 더 걸린다.
- ECMAScript는 실행 컨텍스트 스택이 비었을 때만 Job을 시작한다. 프로미스 Job은 HostEnqueuePromiseJob을 부른 순서대로 실행된다.

#### 확인 질문

1. "async 함수의 return은 프로미스를 이행시킨다"가 왜 틀린 일반화이고, 어떤 입력에서 드러나는가?
   <details><summary>답</summary>AsyncBlockStart는 `[[Resolve]]`를 부를 뿐이다. 값이 프로미스나 thenable이면 그 결과를 따라가므로 `return Promise.reject(e)`면 호출의 프로미스는 거부된다(변경 이력 리뷰 ①, content.mdx "return은 resolve, throw는 거부").</details>
2. 시나리오의 대조 테스트가 `afterEvaluate` 모드를 쓰면 무엇을 검증할 수 없게 되는가?
   <details><summary>답</summary>평가가 끝나면서 Job까지 실행되어, 동기 코드가 끝난 직후의 출력과 `p`가 pending인 상태를 읽을 수 없다. 그래서 기본 vm 모드로 실행하고 `runInContext` 직후에 읽는다(구현 진행 2, concept.test.ts `runAndRecord`).</details>
3. 프로미스 페이지처럼 `Promise.prototype.then`을 감싸서 `await`의 재개를 추적할 수 없는 이유는 무엇인가?
   <details><summary>답</summary>Await는 `then` 메서드를 부르지 않고 PerformPromiseThen을 직접 수행한다. 그래서 `console.log`를 감싸 출력 시점의 상태를 읽는다(계획 2절, 3절).</details>
4. 예제 6의 `viaForOf`에서 두 번째 반복의 `await`는 어디로 돌아가는가? 첫 `await`와 무엇이 다른가?
   <details><summary>답</summary>첫 `await`는 스택 바로 아래의 함수를 부른 코드로 돌아가지만, 두 번째부터는 함수를 재개시킨 Job으로 돌아가고 그 Job이 끝난다(사용자 검토 ①, content.mdx "await는 함수를 멈추고 호출한 쪽으로 돌아간다").</details>
5. `await p`와 `return p`(`p`는 이행된 네이티브 프로미스)가 걸리는 Job 수가 다른 이유는 무엇이고, `p`가 `Promise`의 서브클래스면 `await` 쪽은 어떻게 달라지는가?
   <details><summary>답</summary>`await p`는 PromiseResolve가 `p`를 그대로 돌려줘 반응만 등록한다. `return p`는 `[[Resolve]]`가 thenable로 보고 NewPromiseResolveThenableJob을 거친다. 서브클래스는 `constructor`가 `%Promise%`가 아니라 새 프로미스로 감싸져 thenable 경로를 타므로 늦어진다(사용자 검토 ④, content.mdx "이행된 프로미스를 return하면 늦어진다").</details>
