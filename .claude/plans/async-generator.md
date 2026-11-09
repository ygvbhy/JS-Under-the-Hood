# 추가 게시글 'async 제너레이터' 구현 계획

- 상태: 완료
- 작성일: 2026-11-06
- 기준: `main` @ `9b5c424`

## 0. 요약

- 목적: `/concepts/async-generator`를 추가해 요청 큐, `yield`의 await, `for await...of`, break 정리를 예제 13개와 시뮬레이터로 설명하고 '작성 예정' 4곳을 링크로 바꾼다
- 범위: 새 개념 폴더 1개(category `async`, order 475), 순위가 밀리는 테스트 기대값, 빌드·e2e 추가, `generator`·`async-await` 문구와 `related` / 공통 코드는 바꾸지 않음
- 위험: 큐에 요청이 남아 있으면 `yield`에서 멈추지 않는 것처럼 일반 제너레이터 지식과 다른 분기를 놓치는 것 — 명세 원문과 프로미스 상태 실측으로 시나리오를 대조한다
- 복잡도: 중간 · Consensus: 생략 (`async-await`·`generator`의 시뮬레이터 패턴을 그대로 따르고 공통 코드 변경이 없음. 구현 뒤 Opus 명세 대조를 수행)
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-06)

- 새 개념 페이지를 추가한다. 기본 범위는 `next`가 프로미스를 돌려주는 것, `yield`의 await, 요청 큐, `for await...of`, break 정리다.
- 추가 범위: 동기 이터러블과 `for await`, `Symbol.asyncIterator` 직접 구현, async 안의 `yield*`.
- 시각화: 상태, 요청 큐, 프로미스를 보여 주는 시뮬레이터. 시나리오는 `next` 연속 호출과 `for await`의 break 정리 2개.
- 학습 순서: order 475. `error-handling`(470) 뒤, `es-modules`(480) 앞.
- `generator`와 `async-await`의 '작성 예정' 4곳을 링크로 바꾼다.

### 유지해야 하는 기존 동작

- 기존 개념 52개는 문구와 순위 기대값 외에 바뀌지 않는다. 마지막 개념은 `es-modules`이고 위치만 52 → 53.
- 홈 `객체` 검색 결과 수 유지. title·summary·tags에 '객체'를 쓰지 않는다.
- `generator`·`async-await`의 `reviewedAt`은 바꾸지 않는다(문구 교체뿐. 선례 `53d8454`).

### 제외 범위

- `AsyncGeneratorFunction` 생성자, `await using`, Iterator helpers, `Array.fromAsync`, 스트림·`fetch` 응답 순회.
- 최상위 `await`로 쓰는 `for await`. 이 페이지의 실행기는 script라 쓸 수 없고 모듈은 `es-modules`가 뒤에 나온다.
- 프로미스 배열에서 앞 요소를 기다리는 동안 뒤 요소가 거부될 때의 거부 추적. 호스트 동작이라 `simplifications`에 '다루지 않음'으로 적는다.
- 동시 소비(병렬 pull) 패턴과 백프레셔 설계 조언.

## 2. 사실과 추정

### 사실 (명세 — Draft 2026-11-05, ES2026판과 대조)

- 상태는 `suspended-start`, `suspended-yield`, `executing`, `draining-queue`, `completed` 다섯 가지다(`#sec-properties-of-asyncgenerator-intances`). `[[AsyncGeneratorQueue]]` 설명: "Except during state transitions, it is non-empty if and only if [[AsyncGeneratorState]] is either executing or draining-queue." 두 판 공통.
- `next`(`#sec-asyncgenerator-prototype-next`): 새 프로미스를 만들고, 검증 실패는 throw가 아니라 거부다. `completed`면 `{undefined, done true}`로 바로 resolve. 아니면 요청을 큐에 넣고, `suspended-start`나 `suspended-yield`일 때만 재개한다. `executing`이나 `draining-queue`이면 넣기만 한다.
- `return`(`#sec-asyncgenerator-prototype-return`): 요청을 넣고 `suspended-start`나 `completed`면 `draining-queue`로 바꿔 AsyncGeneratorAwaitReturn. `suspended-yield`면 재개.
- `throw`(`#sec-asyncgenerator-prototype-throw`): `suspended-start`면 `completed`로 바꾸고, `completed`면 큐에 넣지 않고 바로 거부한다.
- Yield(`#sec-yield`): async면 `AsyncGeneratorYield(? Await(arg))`. 두 판의 매개변수 이름이 다르므로(`value`/`arg`) 문장 인용 없이 설명한다.
- AsyncGeneratorYield(`#sec-asyncgeneratoryield`): 먼저 AsyncGeneratorCompleteStep으로 큐의 첫 요청을 끝낸다. 큐가 비어 있지 않으면 NOTE "Execution continues without suspending the generator."대로 멈추지 않고 다음 요청의 완료로 이어 간다. 비어 있으면 `suspended-yield`로 멈춘다. 재개 값이 return 완료면 AsyncGeneratorUnwrapYieldResumption이 그 값을 await한다.
- `return` 문(`#sec-return-statement-runtime-semantics-evaluation`): "If GetGeneratorKind() is async, set exprValue to ? Await(exprValue)." 두 판 공통.
- 본문이 끝나면 `draining-queue`로 바뀌고 CompleteStep(done true) 뒤 AsyncGeneratorDrainQueue가 남은 요청을 처리한다(`#sec-asyncgeneratorstart`, `#sec-asyncgeneratordrainqueue`). 끝나면 `completed`.
- `for await`(`#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset`): `next`를 부른 뒤 async면 결과를 Await하고, 객체가 아니면 TypeError. 조기 종료는 AsyncIteratorClose.
- AsyncIteratorClose(`#sec-asynciteratorclose`): `return`을 부르고 결과를 Await한다. 원래 완료가 throw면 그 완료를 돌려준다.
- GetIterator(`#sec-getiterator`): async면 `Symbol.asyncIterator`를 먼저 찾고, 없으면 `Symbol.iterator`로 CreateAsyncFromSyncIterator, 둘 다 없으면 TypeError.
- AsyncFromSyncIteratorContinuation(`#sec-asyncfromsynciteratorcontinuation`): 값을 PromiseResolve로 감싸 기다리고, 거부되면 `closeOnRejection`이 true일 때 동기 이터레이터를 닫는다. 두 판 모두 `closeOnRejection`이 있다.
- 두 판의 차이: 초안은 `RunCallerContext`, `RunSuspendedContext`를 쓰고 ES2026판은 쓰지 않는다. 이 이름은 본문에 쓰지 않는다.

### 사실 (vm 실행 — Node v24.22.1, `runInNewContext`, `microtaskMode: 'afterEvaluate'`, 스크래치패드 실행)

| 예제 | 핵심 | 출력 |
| - | - | - |
| `kind.js` | 객체 종류, `new`, `for...of` | `[object AsyncGenerator]` / `true` / `function undefined` / `object` / `new: TypeError` / `for...of: TypeError` |
| `next-promise.js` | 호출과 첫 `next` | `호출 뒤` / `본문 시작` / `true` / `동기 코드 끝` / `{"value":1,"done":false}` |
| `yield-awaits.js` | 동기와 비교 | `true` / `{"value":"값","done":false}` |
| `yield-reject.js` | 거부된 프로미스를 `yield` | `본문에서 잡음: 실패` / `{"value":"복구","done":false}` |
| `queue.js` | `next` 3회 연속 | `본문 시작` / `동기 코드 끝` / `a 뒤` / `1번: …a…` / `b 뒤` / `2번: …b…` / `3번: {"done":true}` |
| `settle.js` | `return`의 await, 시작 전 `return()`·`throw()` | `거부` / `{"done":true}` / `{"value":"끝","done":true}` / `{"value":"취소","done":true}` |
| `body-throw.js` | 본문 예외 뒤 요청 | `{"value":1,"done":false}` / `거부: 본문 오류` / `{"done":true}` |
| `for-await.js` | 두 반복 교차 | `동기 코드 끝` / `a1` / `b1` / `a2` / `b2` / `a 끝` / `b 끝` |
| `for-await-break.js` | break와 `finally`의 await | `1` / `정리` / `반복문 뒤` |
| `sync-iterable.js` | `for...of`와 비교 | `true` / `false` / `true` / `1` / `2` / `3` |
| `sync-close.js` | 거부 시 닫힘 | `1` / `동기 제너레이터 정리` / `잡음: 실패` |
| `custom-iterator.js` | 직접 구현과 우선순위, 오류 | `asyncIterator` / `1` / `2` / `TypeError` / `TypeError` |
| `yield-star.js` | async `yield*` | `i1` / `안쪽 반환값` / `s1` / `s2` |

- `settle.js`의 줄 순서는 Job 수에 기대므로 본문에서 줄 사이 순서를 설명하지 않는다. 시작 전 `throw()`의 거부가 먼저인 것만 '큐에 넣지 않고 바로 거부'로 설명한다.
- `for await`를 async 밖에 쓰면 SyntaxError이고, async 함수·async 제너레이터 안에서는 된다(실행 확인). 이것은 예제로 보이지 못해 `concept.test.ts`로 확인한다.
- `.next.call({})`은 프로미스를 돌려주고 TypeError로 거부된다(실행 확인).

### 코드

- 시뮬레이터 패턴: `app/concepts/async-await/scenarios.ts:1-60`, `AsyncView.tsx`, `Simulator.tsx`, `concept.test.ts:225-290`(util.inspect로 전역 프로미스 대조, 기본 vm 모드).
- 고정 테스트: `app/lib/concepts.test.ts:104-112`, `app/components/concept/ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts`의 개수와 '학습 순서 N / 52', `tests/e2e/responsive.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`. 새 개념 추가 시 바뀐 파일 목록은 `87ed1a0`이 참고가 된다.
- 필수 h2: `tests/content-integrity.test.ts:23`(`동작 원리`, `예제`, `결과와 이유`).
- '작성 예정' 4곳: `async-await/content.mdx:96`, `async-await/meta.ts:104`, `generator/content.mdx:104`, `generator/meta.ts:125`.

### 추정

- 없음

## 3. 구현 전략

- `async-await`의 구성을 따른다. 상태 타입, 시나리오, `AsyncGenView`, 얇은 `Simulator.tsx`, `concept.test.ts`.
- 시나리오는 프로미스를 변수에 담는 예제를 쓴다(`var p1 = it.next()`). 그래야 `console.log`가 불릴 때마다 `util.inspect`로 실제 프로미스 상태를 읽어 시나리오와 대조할 수 있다. 내부 상태와 큐는 JS로 읽을 수 없으므로 명세 불변식 테스트로 보완한다.
- 설명의 축은 '일반 제너레이터와 다른 점'이다. 같은 점은 `generator`로 링크하고 다시 설명하지 않는다.
- 버린 대안: `settle.js`의 줄 순서로 Job 개수를 설명하는 것. 페이지 주제가 아니고 명세가 바뀌면 깨지기 쉽다.
- 버린 대안: 프로미스 배열 거부 추적 예제(브라우저). 호스트 동작이 끼어 검토 범위가 커진다.

## 4. 변경 파일

- 추가: `app/concepts/async-generator/`의 `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `AsyncGenView.tsx`, `AsyncGenView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/*.js` 13개
- 수정: `async-await/content.mdx:96`, `async-await/meta.ts`(104행, `related`), `generator/content.mdx:104`, `generator/meta.ts`(125행, `related`) — '작성 예정' 교체와 역방향 연결
- 수정: `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `docs/content-guide.md`(e2e 대상 목록) — 개수·순위·새 페이지 등록
- 수정: `.claude/plans/concept-roadmap-ch43-48.md` — 진행 기록
- 변경하지 않음: `app/simulator/`, `app/components/`, `app/lib/concepts.ts`, `iterable-for-of`, `for-let`, `error-handling`(뒷장을 '별도 개념'으로 적은 문장은 그대로 사실이다)

## 5. 위험 요소

- `yield`마다 멈춘다고 쓰기 쉽다 → 큐가 비어 있지 않으면 멈추지 않는다. 시나리오에 그 단계를 넣고 실측 프로미스 상태로 대조한다(작업 순서 2).
- '`for await`가 병렬로 기다린다'는 오해 → 예제 `sync-iterable.js`와 흔한 오해에서 하나씩 기다린다고 쓴다(작업 순서 3).
- 끝났다는 표현 혼동: `return()`이 부르는 것은 정리이지 즉시 종료가 아니다 → `for-await-break.js`에서 `정리` 뒤 `반복문 뒤`가 나오는 것으로 보인다. 틀린 모델(기다리지 않음)을 배제하도록 `finally`에 `await`를 둔다.
- 일반화의 예외: 시작 전 `return()`은 본문을 실행하지 않고 값만 await한다. 완료 뒤의 `next`는 큐를 거치지 않는다. `throw()`도 시작 전에는 큐에 넣지 않는다 → '요청은 모두 큐에 들어간다'고 쓰지 않는다(작업 순서 3).
- 소스 범위 밖 호출: `yield*`와 동기 이터러블의 `return`은 판별 없이 쓰지 않는다 → 본문은 `next` 경로만 주장하고 나머지는 `simplifications`에 적는다.
- 예제의 처리되지 않은 거부가 실행기를 죽인다 → 모든 거부를 처리한다(`catch`나 `try`).
- 줄 번호 → 시나리오 작성 후 예제를 고치면 `line`이 어긋난다 → `assertScenarioInvariants`와 시나리오 줄 대조(작업 순서 2).
- 도구 입력의 `\uXXXX`가 실제 문자로 풀리는 함정 → 이 페이지는 보이지 않는 문자를 쓰지 않는다.
- PredictQuiz 문자열의 작은따옴표는 `npm test`가 못 잡는다 → `test:build`로 확인한다(작업 순서 5).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 새 개념 추가 범위(`AGENTS.md`)대로 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "async-generator|async 제너레이터|홈 학습 순서 보기"`. 공통 코드를 건드리지 않는 조건을 확인한다.
- 브라우저: dev 서버를 재시작한 뒤 `/concepts/async-generator`에서 ① 첫 단계가 프리렌더로 보인다 ② 'next 연속 호출' 시나리오를 끝까지 넘기며 요청 큐 칸이 3개에서 0개로 줄어든다 ③ 'break 정리' 시나리오로 바꿔 마지막 단계의 출력이 `1`, `정리`, `반복문 뒤`다 ④ 375px에서 가로 스크롤이 없다 ⑤ 다크 모드에서 칸이 읽힌다
- 명세: Opus 서브에이전트에 명세 사본(현재 초안, ES2026판) 경로를 주고 본문과 시나리오를 대조한다.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 메타와 예제

- 대상: `async-generator/meta.ts`, `examples/*.js`, `route.tsx`
- 현재: 폴더 없음
- 변경: 2절 표의 예제 13개를 만든다(`settle.js`와 `body-throw.js`는 분리 유지, `queue.js`는 `var p1 = it.next()` 형태로 바꾸고 `for-await-break.js`는 프로미스를 변수에 담는다). `meta.ts`는 slug `async-generator`, title `async 제너레이터: next를 연달아 불러도 결과가 섞이지 않는 이유`, category `async`, order 475, prerequisites는 `generator`, `async-await`, `iterable-for-of`, `error-handling`, `microtask-queue`, related는 `generator`, `async-await`, `iterable-for-of`, `promise`, `reviewedAt: null`. `meta.ts` → `content.mdx` → `route.tsx` 순으로 만든다.
- 이유: 실제 출력이 이후 모든 서술의 근거다.
- 주의사항: `console.log`에는 원시 값과 `JSON.stringify` 결과만 넘긴다. 타이머를 쓰지 않는다. summary 160자 이하, title·summary·tags에 '객체'를 쓰지 않는다.
- 완료 조건: `npx vitest run tests/examples.test.ts`에서 `async-generator` 예제 13개가 `expectedOutput`과 일치.

### 2. 시나리오와 시각화

- 대상: `scenarios.ts`, `AsyncGenView.tsx`, `AsyncGenView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태: `{ genState, queue: string[], promises: { name, state, result }[], jobs: string[], running: string }`. `genState`는 명세의 다섯 값이다.
  - 시나리오 `queue`(`queue.js`): `next` 3회로 요청이 3개 쌓이고, 첫 `yield`에서 p1이 이행되며 큐가 비지 않아 멈추지 않고 이어 가고, 본문이 끝나 `draining-queue`를 거쳐 `completed`.
  - 시나리오 `break`(`for-await-break.js`): `for await`가 `next`를 부르고 Await, 본문이 `yield`에서 멈춤, break가 `return`을 불러 `finally`가 실행되고 `await`, `completed`, 그 뒤 반복문 다음 줄.
  - `concept.test.ts`: `assertScenarioInvariants`, `console.log`마다 실제 프로미스 상태 대조(async-await 패턴), 단계마다 `queue`가 비어 있지 않은 것과 `genState`가 `executing`/`draining-queue`인 것이 같음(명세 문장. 상태 전이 중간 단계를 그리지 않는다), `for await`의 SyntaxError, `.next.call({})`의 거부.
- 이유: 큐는 JS로 읽을 수 없어 시각화가 유일한 설명 수단이고, 불변식 테스트가 그 내용을 묶는다.
- 주의사항: 단계 설명에 관찰할 수 없는 순간임을 밝힌다. 내장 프레임은 그리지 않는다. 색만으로 구분하지 않고 "(바뀜)" 표시를 쓴다. `await` 재개는 `then` 감싸기로 잡히지 않으므로 기본 vm 모드에서 `console.log` 시점만 대조한다.
- 완료 조건: `npx vitest run app/concepts/async-generator` 통과. 불변식 테스트가 `queue` 시나리오에서 `genState`가 `executing`인 단계와 `queue` 길이 3인 단계를 모두 지나는 것을 단언한다.

### 3. 본문

- 대상: `content.mdx`
- 현재: 없음
- 변경: 도입(질문), `## 동작 원리`(부르면 객체만 돌려준다 / `next`와 요청 큐 / `yield`는 값을 기다린다 / `return`·`throw`·끝난 뒤 / `for await`는 결과를 기다린다 / break와 정리 / 동기 이터러블 / `Symbol.asyncIterator` 직접 구현 / async 안의 `yield*` / 이 페이지가 다루지 않는 것), `## 예제`(예제마다 PredictQuiz, 시뮬레이터 2회), `## 결과와 이유`(일반 제너레이터·async 함수·async 제너레이터 비교표, 예제별 표, 흔한 오해).
- 이유: 페이지 구조 규칙(필수 h2)을 따른다.
- 주의사항: 인용은 2절에서 두 판 공통으로 확인한 문장만 쓴다. '테스트가 확인합니다'류 문구, '병렬', '즉시 종료', '요청은 모두 큐에 들어간다'를 쓰지 않는다. resolve와 이행을 섞지 않는다. 퀴즈 정답은 위치를 섞고 `expectedOutput`과 스크립트로 대조한다. `overflow-x-auto` 표는 `tabIndex`, `role="region"`, `aria-label`을 처음부터 넣는다. 첫 문단에 `**`가 들어가는 코드를 쓰지 않는다.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, 퀴즈 정답 대조 스크립트 불일치 0건, 퀴즈 정답 위치가 한 곳에 몰리지 않음.

### 4. 기존 페이지 연결

- 대상: `async-await/content.mdx:96`, `async-await/meta.ts`, `generator/content.mdx:104`, `generator/meta.ts`
- 현재: '별도 개념(작성 예정)' 4곳
- 변경: 본문 2곳은 `[async 제너레이터](/concepts/async-generator)` 링크로, meta 2곳은 'async 제너레이터 개념에서 다룹니다'로 바꾼다. 두 `related`에 `async-generator`를 넣는다. 고정 테스트의 개수와 순위를 갱신한다(52 → 53, `es-modules` 52 → 53, 새 개념 52번째).
- 이유: 사용자가 요청했다.
- 주의사항: `reviewedAt`은 바꾸지 않는다. `generator/content.mdx:104`의 '제너레이터로 비동기 흐름을 다루는 방식'은 이 페이지가 다루지 않으므로 문장을 나눠 사실이 되게 쓴다.
- 완료 조건: `grep -n "작성 예정" app/concepts/generator app/concepts/async-await` 결과에서 async 제너레이터 관련 문장 0건, `npm test` 통과.

### 5. 빌드·e2e 등록과 전체 검증

- 대상: `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `navigation.spec.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `docs/content-guide.md`
- 현재: 새 페이지 미등록
- 변경: `async-await` 항목을 본떠 프리렌더, axe(시뮬레이터 진행 후 포함), 가로 스크롤, 내비게이션을 등록한다.
- 이유: 새 페이지는 경로를 직접 등록해야 검사된다.
- 주의사항: e2e `-g` 패턴은 실제 테스트 이름에 맞춘다. dev 서버는 재시작한다.
- 완료 조건: 6절의 명령 모두 통과, 브라우저 시나리오 5개 확인.

### 6. 명세 대조

- 대상: `content.mdx`, `meta.ts`, `scenarios.ts`
- 현재: 구현자 자체 점검만 끝난 상태
- 변경: Opus 서브에이전트에 현재 초안과 ES2026판 사본 경로를 주고, 서술의 조건·분기 누락과 틀린 모델을 통과시키는 예제를 찾게 한 뒤 메인이 원문으로 재확인해 반영한다.
- 이유: 이전 개념들에서 예제 출력이 아니라 서술의 범위에서 지적이 나왔다.
- 주의사항: 제안 문장을 그대로 쓰지 않고 원문과 실행으로 확인한다.
- 완료 조건: 지적마다 수용·기각과 근거를 `구현 진행`에 기록.

## 변경 이력

- 2026-11-06 (Opus 명세 대조, HIGH 7·MEDIUM 11·LOW 9): 예제를 13개에서 16개로 늘리고(`queued-return`, `return-in-try`, `close-paths`) `queue.js`는 `then`을 다음 `next` 앞으로, `for-await.js`는 순차를 보이는 단일 반복으로, `yield-star.js`는 `value`가 프로미스인 이터레이터를 더한다. 예제 5와 8이 틀린 모델(앞 프로미스에 then으로 재개, 병렬 pull)도 통과시켰기 때문이다. `draining-queue` 정의, 큐에 남은 `return`·`throw`, AsyncGeneratorDrainQueue 세 분기, `for await`가 닫지 않는 예외, `await` 멈춤과 `suspended-yield` 구분을 본문에 반영한다 — 영향 단계 1, 2, 3.

## 구현 진행

- baseline (2026-11-06, `9b5c424`): lint·format:check·typecheck 통과 / test 143파일 4365건 통과 / test:build 420건 통과 / 전체 e2e 645건 통과(직전 커밋 준비 때 실행)
- [x] 1. 메타와 예제 — `tests/examples.test.ts` 통과(13개, 출력이 계획 2절 표와 같음), tsc·prettier·eslint 통과
- [x] 2. 시나리오와 시각화 — `queue` 20단계, `break` 15단계, `app/concepts/async-generator` 테스트 통과(프로미스 실측 대조, 큐·상태 불변식 포함)
- [x] 3. 본문 — content-integrity 통과, 퀴즈 17개 정답 위치 0:5·1:4·2:4·3:4, 출력 퀴즈 11개 정답이 `expectedOutput`과 스크립트로 일치
- [x] 4. 기존 페이지 연결 — `async-await`·`generator`의 '작성 예정' 4곳 교체, `related` 추가, `reviewedAt` 변경 없음, test 146파일 4438건 통과
- [x] 5. 빌드·e2e 등록과 전체 검증 — 마지막 수정 뒤 lint·format:check·typecheck·test·test:build·navigation·관련 e2e 통과. 브라우저: 프리렌더 첫 단계, `queue` 10단계에서 큐 3개, `break` 끝까지 진행해 출력 `1`, `정리`, `반복문 뒤`, 375px 가로 스크롤 없음, 다크 화면 확인, 콘솔 오류 없음
- [x] 6. 명세 대조 — Opus 지적 HIGH 7·MEDIUM 11·LOW 9. 메인이 명세 원문과 실행으로 확인해 모두 반영(예제 16개로 증가, 근거 테스트 7건 추가). 기각 없음
- 리뷰 1차: Critical·High 없음(Opus 대조의 High는 위에서 수정). 재대조는 하지 않음. 메인이 수정 본문과 Callout을 다시 읽어 `next`의 `프로미스(또는 값)` 표현 1곳을 규약 기준으로 고침
- 사용자 최종 승인(2026-11-10): `reviewedAt`을 2026-11-10으로 기록

## 구현 결과

### 계획 대비 실제 구현
- 계획한 범위를 모두 구현했다. 예제는 13개가 아니라 16개다(`변경 이력`). Opus 명세 대조에서 예제 5와 8이 틀린 모델도 통과시킨다는 지적을 받아 `queue.js`와 `for-await.js`를 고쳤고, 경로 근거로 `queued-return`, `return-in-try`, `close-paths`를 더했다. 퀴즈는 20개, 근거 테스트 7건을 `concept.test.ts`에 추가했다.
- '작성 예정'은 계획 조사대로 4곳이었다(`async-await`·`generator`의 content와 meta).

### 코드 리뷰
- Opus 명세 대조의 HIGH 7·MEDIUM 11·LOW 9를 메인이 원문과 실행으로 확인해 모두 반영했다. 반영 뒤 재대조는 하지 않았고 메인이 다시 읽어 표현 1곳을 고쳤다.

### 후속 작업
- [ ] MDN 참고 링크 3개가 열리는지 확인(명세 앵커는 사본에서 확인)
- [ ] 프로미스 배열에서 앞 요소를 기다리는 동안 뒤 요소가 거부될 때의 거부 추적(호스트 동작)을 별도로 다룰지 결정

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 5의 `then`을 다음 `next` 바로 뒤에 건다 — 대안은 `then`을 맨 뒤에 몰아 거는 처음 초안이다. 몰아 걸면 'yield에서 항상 멈추고 다음 요청은 앞 프로미스의 then으로 재개된다'는 틀린 모델도 같은 출력을 내서 '멈추지 않고 이어 간다'의 증거가 되지 못했다. 앞에 걸면 그 모델은 `1번`을 `a 뒤`보다 먼저 찍는다.
- [Claude 판단] 예제 10을 두 반복의 교차가 아니라 한 반복의 순차로 바꾼다 — 교차 출력은 next를 미리 여러 번 부르는 병렬 모델로도 나왔다. `gen 2`가 `본문 끝 1` 뒤에 찍히는 출력만 '본문이 끝나야 다음 next를 부른다'를 가른다.
- [Claude 판단] 예제로 보이지 않는 경로(큐에 남은 throw·return, 본문이 끝난 뒤 큐 처리 세 분기, done true와 함께 온 거부 등)는 `concept.test.ts`의 인라인 근거 테스트로 확인하고 본문에는 테스트를 언급하지 않는다 — 대안은 경로마다 예제를 만드는 것인데 페이지가 지나치게 길어진다.
- [Claude 판단] 프로미스 배열의 거부 추적은 다루지 않는다 — 대안은 브라우저 예제로 `unhandledrejection`을 보이는 것. 호스트 동작이 끼어 검토 범위가 커진다.
- 시뮬레이터는 요청 큐 시뮬레이터, 범위는 동기 이터러블·`Symbol.asyncIterator`·`yield*` 포함, 학습 순서는 order 475 — 사용자가 직접 골랐다.

#### 배경지식
- async 제너레이터의 `next`는 상태가 `completed`가 아니면 요청을 큐에 넣고, `suspended-start`나 `suspended-yield`일 때만 본문을 재개한다. `await`에서 멈춘 동안 상태는 `executing`이라 그 사이의 `next`는 큐에 쌓인다.
- `yield`는 값을 await한 뒤 큐의 첫 요청을 끝낸다. 큐에 요청이 남아 있으면 NOTE "Execution continues without suspending the generator."대로 `suspended-yield`가 되지 않고 다음 요청으로 이어 간다.
- `for await`는 `next`의 결과만 await하고 `value`는 await하지 않는다. 동기 이터러블의 값이 풀리는 것은 감싼 이터레이터(AsyncFromSyncIterator) 덕분이다.
- AsyncIteratorClose는 break·return·반복문 본문의 예외로 나갈 때만 `return`을 부른다. `next`의 거부나 결과 검사 실패는 닫지 않는다.

#### 확인 질문
1. 예제 5에서 `then`을 맨 뒤에 몰아 걸면 무엇을 증명하지 못하게 되는가?
   <details><summary>답</summary>'yield에서 항상 멈추고 다음 요청은 앞 프로미스의 then으로 재개된다'는 틀린 모델도 `a 뒤`가 `1번`보다 먼저인 출력을 낸다. 두 번째 next가 첫 프로미스에 반응을 먼저 등록하기 때문이다. 근거: 변경 이력, `examples/queue.js`.</details>
2. 본문이 `await`에서 멈춰 있는 동안 부른 `next`가 본문을 재개하지 않는 이유는?
   <details><summary>답</summary>그동안 상태가 `executing`이고, `next`는 `suspended-start`나 `suspended-yield`일 때만 재개한다. 근거: 2절 `%AsyncGeneratorPrototype%.next`.</details>
3. 큐에 남은 다음 요청이 `return`이면 `yield`가 요청을 끝낸 뒤 무슨 일이 일어나는가?
   <details><summary>답</summary>`suspended-yield`가 되지 않고 그 `yield` 자리에서 return한 것처럼 이어 가 `finally`가 실행된다. 예제 6에서 `실행되지 않음`은 찍히지 않고 `정리`가 찍힌다. 근거: AsyncGeneratorYield의 큐 분기, `examples/queued-return.js`.</details>
4. 예제 12에서 `next`가 거부될 때 `return 호출`이 찍히지 않는 이유는?
   <details><summary>답</summary>`for await`는 `next`의 호출·Await·결과 검사 실패를 `?`로 곧바로 던지고 AsyncIteratorClose를 거치지 않는다. 닫는 것은 break·return·본문 예외로 나갈 때뿐이다. 근거: ForIn/OfBodyEvaluation, `examples/close-paths.js`.</details>
5. 동기 이터러블을 `for await`에 쓸 때 값이 풀리는 것은 누구 덕분이고, async 이터레이터에 `yield*`로 위임하면 왜 프로미스가 그대로 나오는가?
   <details><summary>답</summary>감싼 이터레이터(AsyncFromSyncIteratorContinuation)가 값을 PromiseResolve해 기다리기 때문이다. `yield*`와 `for await` 자신은 `value`를 await하지 않으므로 async 이터레이터의 프로미스 `value`는 그대로 나간다. 근거: 예제 16, `yield*` 평가 절.</details>
