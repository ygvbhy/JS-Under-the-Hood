# try/catch/finally 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-06
- 기준: `main` @ `5b4b044`

## 0. 요약

- 목적: 43~48장 로드맵 6번. `finally`가 앞선 `return`을 덮거나 그대로 두는 규칙을 완료(Completion)로 설명하고, 타이머·거부처럼 `try` 밖에서 난 에러가 전역 이벤트로 가는 흐름을 ECMAScript·HTML 원문과 실행 결과로 보이는 49번째 개념 `error-handling`을 추가한다.
- 범위: 새 개념 폴더 1개(예제 12개: ecmascript 8·browser 4, 2시나리오 완료 시뮬레이터), 고정 테스트·e2e·빌드 테스트·content-guide·로드맵, try...catch를 '작성 예정'으로 가리키는 4개 개념 12곳. 공통 코드·실행기는 바꾸지 않는다.
- 위험: 브라우저 실행기는 `pageerror`면 실패하므로 전역 에러 예제는 항상 `preventDefault()`가 필요하고, 그래서 "보고되지 않는" 경우만 실행으로 보인다는 점을 밝혀야 한다. TryStatement 단계 문장은 판마다 변수 이름이 달라 인용할 수 없다.
- 복잡도: 중간 · Consensus: 생략 (새 개념 추가 패턴 그대로, 공통 코드 변경 없음. 명세 정확성은 구현 뒤 리뷰 + Opus 교차 검토로 확인)
- 미확정: 1건(시나리오 단계 수는 구현 후 고정)

## 1. 요구사항

### 요구사항 (2026-11-06 사용자 결정)

- 로드맵 6번 개념. slug `error-handling`, 제목 'try/catch/finally: finally의 return은 왜 try의 return을 덮어쓸까', category `execution`, order 470(49번째·마지막), `reviewedAt: null`.
- 다룰 주제(기본 + 추가 4개 모두):
  - 기본: ① `finally`의 `return`이 `try`의 `return`을 덮는다 ② `return x` 뒤 `finally`에서 `x`를 재할당해도 반환값은 그대로다(같은 객체를 변경하면 보임) ③ 타이머 콜백의 `throw`는 바깥 `try`에 잡히지 않고 `window`의 `error` 이벤트로 간다 ④ 처리되지 않은 거부는 `unhandledrejection`으로 간다
  - 추가: ⑤ 에러 전파와 `throw`(호출 스택을 따라 전파, `catch` 없는 `try...finally`는 예외를 그대로 내보냄, Error가 아닌 값도 던질 수 있음, 내장 에러 타입과 `instanceof`, 바인딩 없는 `catch`) ⑥ `finally`가 예외를 삼킴(`return`·`break`가 앞선 완료를 버림, `finally`의 `throw`가 앞선 예외를 바꿈) ⑦ async 함수의 `try`에서 `return p`와 `return await p`의 차이 ⑧ 거부 알림 세부(마이크로태스크 안에서 잡으면 이벤트가 없음, 뒤늦게 잡으면 `rejectionhandled`, 예외가 난 타이머가 다음 타이머를 막지 않음).
- 시각화: 완료 시뮬레이터 — `try` 블록·`finally` 블록이 끝날 때의 완료와 `try` 문 전체의 결과가 단계별로 정해지는 것을 보인다. 시나리오 2개(return 덮기, 값 바꾸기).

### 유지해야 하는 기존 동작

- 공통 셸·실행기·레이아웃은 그대로. 기존 e2e·빌드 테스트는 개수·마지막 개념 값만 바꾸고 새 케이스는 추가만 한다. 다른 개념 파일은 try...catch의 '작성 예정' 문구 12곳만 바꾼다(작업 5).

### 제외 범위

- `Error`의 `cause`·`AggregateError`·`stack`(ECMAScript 표준이 아님)·사용자 정의 에러 클래스, 스크립트 최상위의 잡히지 않은 예외와 `onerror` 핸들러 속성, 다른 출처 스크립트의 'Script error.', 워커의 에러, Node의 `process` 이벤트, 최상위 `await`(로드맵 7번 '작성 예정').

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 브라우저 실행기는 `pageerror`가 나면 실패한다(`tests/helpers/run-browser-example.ts`의 `page.on('pageerror', …)`, `docs/content-guide.md` "실패하는 경우"). 실행 확인(2026-11-06): 리스너에서 `event.preventDefault()`를 부르면 `error`·`unhandledrejection` 모두 `pageerror`가 나지 않아 통과하고, 부르지 않으면 `pageerror: 막지 않음`으로 실패한다. 공통 코드를 바꿀 필요가 없다.
- `docs/content-guide.md`는 `.js` 브라우저 예제를 최소 문서의 `<script src="/example.js">`로 실행한다. `meta.examples`의 `runtime: 'browser'` 형식은 microtask-queue와 같다.
- 시뮬레이터 패턴은 `app/concepts/generator/`·`app/concepts/async-await/`와 같다(`scenarios.ts`, 개념 전용 뷰, `Simulator.tsx`, `concept.test.ts`).
- 홈 '객체' 검색 개수를 고정한 e2e가 있다(`tests/e2e/navigation.spec.ts`). 검색은 title·summary·tags를 본다 → summary·tags에 '객체'를 넣지 않는다.
- try...catch를 '작성 예정'으로 가리키는 곳 12곳(메인 grep): `async-await/content.mdx:4,96,302`, `async-await/meta.ts:103`, `generator/content.mdx:104,278`, `generator/meta.ts:124`, `microtask-queue/content.mdx:4,124`, `microtask-queue/meta.ts:113`, `promise/content.mdx:6`, `promise/meta.ts:104`. 이 문구를 고정한 테스트는 없다.
- ECMAScript(ES2026판 사본·현재 초안 사본):
  - TryStatement 평가: 블록의 완료를 얻고, throw 완료면 catch를 평가하며, finally를 평가한 뒤 **finally의 완료가 normal이면 앞선 완료를 결과로 쓰고, 아니면 finally의 완료를 결과로 쓴다**. 두 판의 흐름은 같지만 변수 이름이 다르다(B/C/F vs blockResult/catchResult/finallyResult) → **인용 금지, 풀어 쓴다.**
  - ReturnStatement: "Let exprValue be ? GetValue(exprRef)." / "Return ReturnCompletion(exprValue)." (두 판 같음). `If GetGeneratorKind() is async`는 async 제너레이터만의 줄이라 async 함수의 `return p`는 기다리지 않는다.
  - ThrowStatement: ES2026판 "Return ThrowCompletion(exprValue)." vs 초안 "Throw exprValue." → **인용 금지.**
  - 완료 기록(Completion Record)은 명세의 설명 장치다(엔진 구현이 아님).
- HTML 표준(현재 판 사본 `webappapis.html`, `timers-and-user-prompts.html`):
  - 타이머: "invoke handler given arguments and "report", and with callback this value set to thisArg." — 콜백의 예외는 "report an exception"으로 간다.
  - report an exception: `error` 이벤트를 전역에 발화하고 "with the cancelable attribute initialized to true". 취소되지 않으면 콘솔 보고.
  - HostPromiseRejectionTracker: "reject"면 about-to-be-notified 목록에 넣고, "handle"이면 그 목록에서 빼거나(있으면 끝) outstanding 집합에 있으면 빼고 `rejectionhandled`를 전역 태스크로 발화.
  - notify about rejected promises: 체크포인트 끝에 호출되어 "Queue a global task on the DOM manipulation task source given global to run the following step:" / "If p.[[PromiseIsHandled]] is true, then continue." / `unhandledrejection` 발화(cancelable) / "If p.[[PromiseIsHandled]] is false, then append p to global's outstanding rejected promises weak set."
- 실행 결과(2026-11-06, 부록 예제를 프로젝트 실행기로 실행: 언어 8개는 `runInNewContext` + `afterEvaluate`, 브라우저 4개는 `runBrowserExample`):

  | 예제 | 런타임 | 출력 |
  | - | - | - |
  | finally-runs | ecmascript | try, finally, return 값 |
  | finally-return | ecmascript | finally |
  | value-fixed | ecmascript | finally x = 2, 1 |
  | same-object | ecmascript | 1, 2 |
  | swallow | ecmascript | 삼킴, 루프 뒤, finally의 예외 |
  | propagate | ecmascript | middle finally, 잡음: 전파, 이어서 실행 |
  | throw-values | ecmascript | string, TypeError, true, true, 바인딩 없는 catch |
  | return-await | ecmascript | withAwait 이행: catch가 잡음, noAwait 거부: 거부 |
  | timer-error | browser | try 끝, 스크립트 끝, error 이벤트: 타이머 안, 다음 타이머 |
  | unhandled-rejection | browser | try 끝, 스크립트 끝, unhandledrejection: 거부 |
  | handled-in-microtask | browser | 마이크로태스크에서 잡음 |
  | late-handler | browser | unhandledrejection, 뒤늦게 잡음, rejectionhandled |

- 순서가 표준으로 보장되는 근거: timer-error는 같은 지연의 타이머라 등록 순서대로 실행된다. late-handler는 뒤늦은 `p.catch`를 `unhandledrejection` 리스너 안의 타이머로 예약해, 이벤트 → 타이머 → `catch` 콜백(마이크로태스크) → `rejectionhandled`(그 뒤의 전역 태스크) 순서가 된다. handled-in-microtask는 Job 안에서 `then`을 불러 "handle"이 체크포인트 끝의 알림보다 먼저 일어나 목록에서 빠진다.

### 추정

- 없음

## 3. 구현 전략

- **새 개념 폴더 + 개념 전용 완료 시뮬레이터.** 상태 모델(`scenarios.ts`):

  ```ts
  export type Completion = { kind: 'normal' | 'return' | 'throw'; value: string | null } // 표시: 정상 완료 / return 완료(값) / throw 완료(값)
  export type TryState = {
    stack: string[] // 실행 컨텍스트 스택. '전역 코드', '<함수 이름>'
    vars: { name: string; value: string }[] // 지금 함수의 지역 변수
    tryResult: Completion | null // try 블록이 끝난 완료
    finallyResult: Completion | null // finally 블록이 끝난 완료
    result: Completion | null // try 문 전체의 완료
  }
  ```

  - 시나리오 1 `override` ← `finally-return.js`: `pick()` 호출 → `return 'try'`(try 블록의 완료가 return 완료 'try') → finally 블록 시작 → `return 'finally'`(finally의 완료가 return 완료) → finally의 완료가 normal이 아니므로 그것이 try 문의 결과 → `pick`이 'finally'를 돌려줌 → 출력.
  - 시나리오 2 `fixed` ← `value-fixed.js`: `keep()` 호출 → `var x = 1` → `return x`(식을 평가한 값 1이 완료에 담김) → `x = 2`(변수만 바뀜, 완료의 값은 1) → `finally x = 2` 출력 → finally가 정상 완료이므로 앞선 완료가 try 문의 결과 → 1 반환 → 출력.
  - "복사"로 설명하지 않는다(AGENTS.md). `return`이 식을 평가한 값이 완료에 담기고, 재할당은 변수만 바꾼다고 쓴다. `same-object`는 같은 객체를 변경한 것이 반환된 객체에서 보이는 것으로 설명한다.
  - 완료는 명세의 설명 장치라고 밝힌다 → `simplifications`. catch가 있는 경우의 단계(`catch`의 완료)는 시뮬레이터에 없고 본문으로 설명한다 → `simplifications`.
- **전역 에러 예제는 항상 `preventDefault()`를 부른다.** 실행기가 `pageerror`로 실패하기 때문이다. "취소하지 않으면 콘솔에 보고된다"는 표준 서술로만 쓰고 예제로 실행해 보이지 않는다고 밝힌다 → `simplifications`.
- **언어와 호스트를 나눈다.** `try`·`finally`·`throw`는 ECMAScript, 전역 이벤트는 HTML. 페이지의 절도 이 경계로 나눈다.
- **본문 구성** (`동작 원리` h3): ① finally는 앞선 완료를 잠시 두고 실행된다(완료, return·throw가 만드는 완료, 예제 1) ② finally가 결과를 정하는 규칙(normal이면 앞선 완료, 아니면 finally의 완료 — 예제 2·4) ③ return 값은 이미 정해져 있다(예제 3·3의 객체 예제) ④ 에러는 호출 스택을 따라 전파된다(예제 5·6) ⑤ async 함수의 try와 return await(예제 7, [async/await](/concepts/async-await) 연결) ⑥ try 밖에서 난 에러: 타이머와 error 이벤트(HTML, [타이머](/concepts/timers)·[이벤트 루프](/concepts/event-loop) 연결, 예제 8) ⑦ 처리되지 않은 거부: unhandledrejection과 rejectionhandled([마이크로태스크 큐](/concepts/microtask-queue) 연결, 예제 9·10·11) ⑧ 다루지 않는 것. `예제`(12개, 시뮬레이터는 예제 3 뒤) → `결과와 이유`(결과 표 + 오해 Callout: "finally는 return이 끝난 뒤에 실행되므로 결과를 못 바꾼다", "return x 뒤 x를 바꾸면 반환값도 바뀐다", "try로 감싸면 안에서 예약한 콜백의 에러도 잡힌다", "async 함수의 try는 return한 프로미스의 거부도 잡는다").
- **명세 판 처리.** ECMAScript 링크는 현재 초안, 인용은 ES2026판과 초안 공통 문장만(TryStatement·ThrowStatement 단계는 풀어 씀). HTML은 현재 판 인용.
- **버린 대안.** (a) 실행기에 `pageerror` 허용 옵션 추가: 공통 코드 변경이고 `preventDefault()`로 해결된다. (b) catch까지 있는 세 번째 시나리오: 사용자가 2시나리오로 결정. (c) 메인 스크립트 최상위 예외로 `error` 보이기: 그 스크립트의 뒤 코드가 끊겨 예제가 복잡해지고 타이머 예제로 충분하다.

## 4. 변경 파일

- 추가: `app/concepts/error-handling/` — `meta.ts`, `content.mdx`, `route.tsx`, `examples/*.js`(12개, 부록), `scenarios.ts`, `TryView.tsx`, `TryView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`.
- 수정(고정 테스트): `app/lib/concepts.test.ts`(총 49, 마지막 error-handling, 그 앞 async-await), `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`(홈 49 + 새 페이지 2 케이스), `tests/e2e/a11y.spec.ts`(2 케이스), `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`(`시뮬레이터 프리렌더 (error-handling)`).
- 수정(문서): `docs/content-guide.md`(e2e 목록), `.claude/plans/concept-roadmap-ch43-48.md`(진행 기록).
- 수정('작성 예정' 문구): 2절의 12곳과 구현 중 찾은 3곳(`async-await/content.mdx:78`, `generator/content.mdx:4,76`) — try...catch 부분만 [try/catch/finally](/concepts/error-handling) 링크(본문) 또는 "try/catch/finally 개념에서 다룹니다"(meta)로, 나머지(최상위 await 등)는 유지.
- 변경하지 않음: `app/simulator/`·`app/components/`·`app/lib/`, `tests/helpers/`(실행기).

## 5. 위험 요소

- 전역 에러 예제가 `preventDefault()`를 빠뜨림 → 실행기가 `pageerror`로 실패해 드러남(작업 1).
- 표준이 보장하지 않는 순서(다른 태스크 소스 사이)에 기대는 출력 → 2절의 근거대로 예제를 구성했고, 본문은 그 근거로만 설명(작업 4).
- 판마다 다른 문장 인용 → 인용 대조 스크립트로 ES 인용은 두 사본 모두, HTML 인용은 현재 판 사본에 있음을 확인(작업 4). 문장이 설명하는 연산에 실제로 있는지도 확인.
- 완료를 엔진 구현처럼 서술 → 명세의 설명 장치라고 본문·simplifications에 밝힘(작업 1·4).
- "복사" 비유로 ② 설명 → AGENTS.md 금지, 리뷰에서 확인(작업 4).
- 다른 개념 문구 수정 → 해당 개념 테스트·빌드 테스트(작업 5·6).
- 시뮬레이터 칸이 좁은 화면에서 넘침 → responsive e2e(375) 시나리오 끝까지(작업 5·6).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "error-handling|try/catch/finally|홈 학습 순서 보기|async-await|async/await"`.
- 브라우저(빌드 serve): 1280 라이트·375 다크에서 두 시나리오를 끝까지 넘기며 `scrollWidth`=창 너비, JS를 끈 상태에서 `<details>` 수 = 퀴즈 수와 시뮬레이터 첫 단계, async-await 페이지 '다음' 링크가 /concepts/error-handling.

## 7. 미확정 사항

- [미확정] 시나리오 단계 수는 구현 후 고정한다(작업 2).

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `app/concepts/error-handling/examples/*.js`, `meta.ts`, `route.tsx`
- 변경: 부록 예제 12개를 그대로 만든다. meta: slug·제목·category `execution`·order 470·`reviewedAt: null`, summary(160자 이하, '객체' 없이), tags('객체' 없이), goals 6개 안팎, prerequisites(실행 컨텍스트·프로미스·마이크로태스크 큐·타이머·async/await), related, examples 12개(런타임은 2절 표, 브라우저 예제는 `.js`), references(ECMAScript 절, WHATWG HTML 절 + MDN — 링크 id는 사본에서 확인), simplifications(완료는 명세의 설명 장치, catch 단계는 시뮬레이터 없음, 전역 에러 예제는 항상 preventDefault라 보고되는 경우는 표준 서술로만, `stack`·`cause`·사용자 정의 에러 제외, 판 인용 방침, 런타임 구분).
- 주의사항: meta.ts → content.mdx → route.tsx 순. references 라벨에 절 번호 없음.
- 완료 조건: `npx vitest run tests/examples.test.ts -t error-handling` 12개 통과, content-integrity 통과, summary·tags에 '객체' 없음.

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절 상태 모델로 두 시나리오. 테스트: `assertScenarioInvariants`, 고정 줄 번호, 첫 단계('실행 시작', stack ['전역 코드'], 나머지 비어 있음), 마지막 단계(stack ['전역 코드'], 출력 = expectedOutput), 규칙 불변식(result가 정해지는 단계에서 finallyResult가 normal이면 result = tryResult, 아니면 result = finallyResult), `tryResult`는 finally 시작 뒤 바뀌지 않음, fixed에서 x가 바뀌어도 tryResult 값은 그대로, 출력은 한 단계 한 줄까지이고 line 범위에 그 console.log가 있음, 예제 출력의 마지막 줄 = result 값, 설명에 '복사' 없음.
- 완료 조건: `npx vitest run app/concepts/error-handling/concept.test.ts` 통과, 음성 확인(override의 result를 tryResult로 바꾸면 실패 후 원복).

### 3. 뷰·시뮬레이터

- 대상: `TryView.tsx`, `TryView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`
- 변경: 칸 4개(실행 컨텍스트 스택 / 지역 변수 / 블록의 완료(try 블록·finally 블록) / try 문의 결과), `grid-cols-1 sm:grid-cols-2`, "(바뀜)". label 'try/catch/finally 시뮬레이터'.
- 완료 조건: `npx vitest run app/concepts/error-handling` 통과, typecheck·eslint·prettier 통과.

### 4. 본문

- 대상: `content.mdx`
- 변경: 3절 본문 구성. 첫 문단은 산문(`*`·`**` 금지). 퀴즈 20개(예제 1·4 객체·10·11은 1개, 나머지 2개), PredictQuiz 문자열 prop 안 작은따옴표 금지, 결과 표 결과 열 = expectedOutput.
- 완료 조건: 인용 대조 통과(ES 인용은 두 사본, HTML 인용은 현재 판 사본), `npm run test:build` 통과.

### 5. 고정 테스트·e2e·빌드 테스트·문서·'작성 예정' 문구

- 대상: 4절 수정 파일들
- 변경: 개수 49·마지막 error-handling·이전 async-await, a11y 2·responsive 2 케이스, 빌드 테스트(`<details` ≥ 20, 첫 단계 프리렌더), content-guide 목록, '작성 예정' 12곳.
- 완료 조건: `npm test` 통과, navigation e2e 통과, 관련 e2e 통과.

### 6. 전체 검증

- 완료 조건: 6절 정적 명령 전체 통과, e2e 통과, 브라우저 확인 항목 기록.

## 부록: 예제 초안 (2026-11-06 실행 확인)

### finally-runs.js

```js
function work() {
  try {
    console.log('try');
    return 'return 값';
  } finally {
    console.log('finally');
  }
}
console.log(work());
```

### finally-return.js

```js
function pick() {
  try {
    return 'try';
  } finally {
    return 'finally';
  }
}
console.log(pick());
```

### value-fixed.js

```js
function keep() {
  var x = 1;
  try {
    return x;
  } finally {
    x = 2;
    console.log('finally x = ' + x);
  }
}
console.log(keep());
```

### same-object.js

```js
function reassign() {
  var o = { v: 1 };
  try {
    return o;
  } finally {
    o = { v: 2 };
  }
}
function mutate() {
  var o = { v: 1 };
  try {
    return o;
  } finally {
    o.v = 2;
  }
}
console.log(reassign().v);
console.log(mutate().v);
```

### swallow.js

```js
function hide() {
  try {
    throw new Error('사라짐');
  } finally {
    return '삼킴';
  }
}
console.log(hide());
function leave() {
  while (true) {
    try {
      return 'return 값';
    } finally {
      break;
    }
  }
  return '루프 뒤';
}
console.log(leave());
function replace() {
  try {
    throw new Error('try의 예외');
  } finally {
    throw new Error('finally의 예외');
  }
}
try {
  replace();
} catch (e) {
  console.log(e.message);
}
```

### propagate.js

```js
function inner() {
  throw new Error('전파');
}
function middle() {
  try {
    inner();
    console.log('실행되지 않음');
  } finally {
    console.log('middle finally');
  }
}
function outer() {
  middle();
  console.log('실행되지 않음');
}
try {
  outer();
} catch (e) {
  console.log('잡음: ' + e.message);
}
console.log('이어서 실행');
```

### throw-values.js

```js
try {
  throw 'error가 아닌 문자열';
} catch (e) {
  console.log(typeof e);
}
try {
  null.x;
} catch (e) {
  console.log(e.name);
  console.log(e instanceof TypeError);
  console.log(e instanceof Error);
}
try {
  throw new RangeError('범위');
} catch {
  console.log('바인딩 없는 catch');
}
```

### return-await.js

```js
async function noAwait() {
  try {
    return Promise.reject(new Error('거부'));
  } catch (e) {
    return 'catch가 잡음';
  }
}
async function withAwait() {
  try {
    return await Promise.reject(new Error('거부'));
  } catch (e) {
    return 'catch가 잡음';
  }
}
noAwait().then(
  function (v) {
    console.log('noAwait 이행: ' + v);
  },
  function (e) {
    console.log('noAwait 거부: ' + e.message);
  }
);
withAwait().then(function (v) {
  console.log('withAwait 이행: ' + v);
});
```

### timer-error.js

```js
window.addEventListener('error', function (event) {
  console.log('error 이벤트: ' + event.error.message);
  event.preventDefault();
});
try {
  setTimeout(function () {
    throw new Error('타이머 안');
  }, 0);
  console.log('try 끝');
} catch (e) {
  console.log('catch: ' + e.message);
}
setTimeout(function () {
  console.log('다음 타이머');
}, 0);
console.log('스크립트 끝');
```

### unhandled-rejection.js

```js
window.addEventListener('unhandledrejection', function (event) {
  console.log('unhandledrejection: ' + event.reason.message);
  event.preventDefault();
});
try {
  Promise.reject(new Error('거부'));
  console.log('try 끝');
} catch (e) {
  console.log('catch: ' + e.message);
}
console.log('스크립트 끝');
```

### handled-in-microtask.js

```js
window.addEventListener('unhandledrejection', function (event) {
  console.log('unhandledrejection');
  event.preventDefault();
});
var p = Promise.reject(new Error('거부'));
Promise.resolve().then(function () {
  p.catch(function () {
    console.log('마이크로태스크에서 잡음');
  });
});
```

### late-handler.js

```js
var p = Promise.reject(new Error('거부'));
window.addEventListener('unhandledrejection', function (event) {
  console.log('unhandledrejection');
  event.preventDefault();
  setTimeout(function () {
    p.catch(function () {
      console.log('뒤늦게 잡음');
    });
  }, 0);
});
window.addEventListener('rejectionhandled', function () {
  console.log('rejectionhandled');
});
```

## 변경 이력

- 2026-11-06 (구현 중 발견): 12곳 외에 try...catch를 '작성 예정'으로 쓴 3곳(`async-await/content.mdx:78`, `generator/content.mdx:4,76`)도 함께 고침. `microtask-queue/content.mdx:4,124`, `promise/content.mdx:6`, `generator/content.mdx:4`에 `async`/`await`가 '작성 예정'으로 남아 있었음(async-await 작업의 grep이 출력 잘림으로 놓침) — 같은 문장이라 이번에 링크로 고침 — 영향 단계 5
- 2026-11-06 (리뷰 지적 — Opus 명세 정확성 교차 검토 + 메인 검토, 원문·node·curl로 재확인 후 반영): ① [High] 상속 방향이 거꾸로 읽히는 문장 ② [High] 예제 8 퀴즈 정답의 'p의 거부가 try 뒤' → p는 try 안에서 이미 거부, try 뒤에 거부되는 것은 호출의 프로미스(표·결과 요약도) ③ [High] '호스트 쪽 규칙'이 처리되면 알리지 않는 예제 11과 어긋남 → 예외·거부·뒤늦은 처리로 나눠 씀, 첫 문단도 ④ Medium: console은 HTML 소관 아님, "report"는 Web IDL invoke가 정의(참고 추가), [[PromiseIsHandled]] 조건·PerformPromiseThen 표현, instanceof 기본 동작·같은 realm(simplifications), '이 절의 규칙', MDN ko 링크 404 → en-US ⑤ 메인: 콘솔 보고는 may로, return의 await 설명, 알림은 체크포인트 끝 ⑥ Low: 완료 나열, continue, 복제한 목록, finally가 실행되지 않는 경우, finally가 완료를 바꾸는 경우, 표 대조 문구, 라벨, catch 매개변수 구조 분해(simplifications), Await·AsyncBlockStart 참고 — 영향 단계 1·2·4
- 2026-11-06 (사용자 검토, Chromium·vm 실행과 HTML 원문으로 확인 후 반영): ① 거부 추적 조건은 메서드 호출이 아니라 `[[PromiseIsHandled]]` — `await`도 PerformPromiseThen을 거치고, `p.then(f)`만 부르면 이벤트 대상은 파생 프로미스(event.promise 확인) ② 알림은 체크포인트에서 큐를 비운 직후 ③ goal 2에 continue ④ abrupt completion 병기 ⑤ 보강 제안 `return p`/`return await p`와 finally 순서: 실행 결과 주장이라 문장만 넣지 않고 예제 9 `return-finally-order`(ecmascript)를 추가해 검증, 뒤 예제 번호 하나씩 밀림(총 13개, 퀴즈 21개, 빌드 테스트 `<details` ≥ 21) — 영향 단계 1·4·5
- 2026-11-06 (사용자 검토 2차): "finally가 p의 결과보다 먼저"는 p가 대기 중일 때만 참(예제 8의 이미 거부된 프로미스가 반례) → "finally가 p를 기다리지 않는다"로 본문·예제 9 제목·표·goal 5 수정. 예제 9의 출력 설명은 decide가 대기 중인 이 예제에 한정되므로 유지 — 영향 단계 1·4

## 구현 진행

- baseline (2026-11-06, `5b4b044`): 커밋 직전 같은 코드로 실행한 결과 재사용 — lint·format:check·typecheck 통과, `npm test` 131파일 4070개, `test:build` 387개 통과(이후 변경은 계획 문서뿐)
- (작업 5 일부 선행, 메인) '작성 예정' 문구: try...catch 15곳 + 놓쳤던 async/await 4곳 링크화, prettier 통과
- [x] 1. 예제·meta·route — 예제 12개가 부록과 바이트 단위 일치(메인 스크립트 대조), 메인 재실행: `examples.test -t error-handling` 12개, `vitest app/concepts/error-handling` 36개, lint·typecheck 통과. title·summary·tags에 '객체' 없음. references ECMAScript 8·HTML 6·MDN 3(ECMAScript·HTML id는 사본에서 확인). content.mdx는 임시
- [x] 2. 시나리오와 대조 테스트 — 단계 수 override 8·fixed 10(고정, 미확정 사항 해소). 규칙 불변식(finally가 normal이면 result=tryResult, 아니면 finallyResult), 음성 확인(서브에이전트: override의 result를 tryResult로 → 3개 실패 후 원복). 메인이 단계 설명을 읽어 명세 규칙과 대조, '복사' 없음
- [x] 3. 뷰·시뮬레이터 — `TryView`(스택·지역 변수·블록의 완료·try 문의 결과), label 'try/catch/finally 시뮬레이터'
- [x] 4. 본문 — 퀴즈 20개, 인용 5개(ES 2개는 ES2026판·초안 양쪽, HTML 3개는 현재 판 사본, 메인 대조)
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서 — 서브에이전트, 패턴은 5b4b044와 같음. 홈 '객체' 검색 16 그대로
- [x] 6. 전체 검증(메인, 리뷰 반영 후 재실행): lint·format:check·typecheck 통과, `npm test` 134파일 4131개, `test:build` 395개, navigation 16개, `-g "error-handling|try/catch/finally|홈 학습 순서 보기|async-await|async/await"` 26개 통과. 화면(빌드 serve): 1280 라이트·375 다크에서 두 시나리오(8·10단계)를 끝까지 넘기는 동안 scrollWidth 최대값 = 창 너비, JS 끔 `<details>` 20개 = 퀴즈 수, 첫 단계 프리렌더, async-await의 다음 링크가 /concepts/error-handling
- [x] 7. 리뷰(critical-code-review, 메인 + Opus 명세 정확성 교차 검토): 코드 지적 없음. 명세 정확성 High 3·Medium 7·Low 11 + 메인 3건 — `변경 이력`대로 모두 수정(메모리 기준: 명세와 다른 설명·오개념 위험은 High). 재검증은 6의 값
- [x] 8. 사용자 검토 반영(`변경 이력` 사용자 검토): lint·format:check·typecheck 통과, `npm test` 134파일 4132개, `test:build` 395개, `-g "error-handling|try/catch/finally|async-await|async/await"` e2e 24개 통과. 번호 밀기에서 범위 표기가 함께 바뀐 것을 잡아 수정 후 무결성·빌드 테스트 재통과
- [x] 9. 사용자 검토 2차 반영: 본문·meta 문구만 변경, 아래 재검증

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 새 개념 `error-handling`(order 470, execution, 49번째·마지막)을 추가했다. 완료 시뮬레이터 2시나리오(override 8단계·fixed 10단계), 인용 5개. 공통 코드·실행기는 바꾸지 않았다.
- 달라진 점: ① 사용자 검토의 보강 제안(`return p`와 `finally`)을 문장만 넣지 않고 예제 9 `return-finally-order`로 추가해 예제 13개(ecmascript 9·browser 4), 퀴즈 21개가 됐다. ② '작성 예정' 문구는 계획의 12곳에 구현 중 찾은 3곳을 더해 15곳을 고쳤고, async-await 작업에서 놓친 `async`/`await` 문구 4곳도 함께 고쳤다. ③ `docs/content-guide.md`의 실패 조건에 `preventDefault()`로 취소하면 `pageerror`가 나지 않는다는 점을 추가했다. ④ `reviewedAt`은 계획상 `null`이었으나 사용자 최종 승인(2026-11-06)으로 그날짜를 기록했다.

### 코드 리뷰

- critical-code-review(메인 + Opus 명세 정확성 교차 검토): 코드 지적 없음, 명세 정확성 High 3·Medium 7·Low 11과 메인 발견 3건 모두 수정. 사용자 콘텐츠 검토 두 차례(4건+보강 제안 1건, 1건)를 실행·원문 확인 후 반영. 남긴 항목 없음.
- 보고만 한 항목: "결과 열은 테스트가 대조합니다" 문구는 표 셀을 직접 대조하는 테스트가 없어 이 페이지만 고쳤고, 다른 페이지 3곳에 같은 문구가 남아 있다.

### 후속 작업

- [ ] 로드맵 7번 ES 모듈(최상위 await '작성 예정' 문구 링크화 포함)
- [ ] 다른 페이지의 "결과 열은 … 테스트가 대조합니다" 문구 정리(표 셀 대조 테스트를 만들거나 문구를 고침)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 보강 제안을 문장 한 줄이 아니라 예제 9로 만들었다 — 출력 순서에 대한 주장은 예제로 실행 검증한다는 AGENTS.md 원칙 때문이다. 대가로 뒤 예제 번호가 하나씩 밀렸다.
- [Claude 판단] 예제 8 퀴즈 정답을 "p의 거부가 try 뒤"에서 "호출이 돌려준 프로미스가 try 뒤에 거부"로 고쳤다 — p는 try 안에서 이미 거부되어 있고, catch가 안 도는 이유는 try 안에 throw 완료가 없기 때문이다. Opus 리뷰 High.
- [Claude 판단] 취소되지 않은 예외는 콘솔에 "보고됩니다"가 아니라 "보고할 수 있다(may)"로 고쳤다 — HTML이 "the user agent may report"라고만 정한다. 메인 검토.
- [Claude 판단] 놓친 `async`/`await` '작성 예정' 문구 4곳을 같은 문장을 고치는 김에 함께 고쳤다 — 이전 커밋의 페이지 문구가 바뀌므로 보고했다.
- [무검토 승인] 전역 에러 예제는 항상 `preventDefault()`를 부른다 — 실행기의 `pageerror` 실패를 공통 코드 변경 없이 피한다. 대신 취소하지 않는 경우는 표준 서술로만 쓴다(계획 3절).
- [무검토 승인] `late-handler`는 뒤늦은 `catch`를 `unhandledrejection` 리스너 안의 타이머로 예약한다 — 고정 지연으로 만들면 서로 다른 태스크 소스 사이의 순서에 기대게 된다(계획 2절).
- 거부 추적 조건은 `[[PromiseIsHandled]]`이고, `finally`는 `p`를 "기다리지 않는다"까지만 보장된다(사용자 검토).

#### 배경지식

- TryStatement: 앞선 완료를 얻고 finally를 평가한 뒤, finally의 완료가 정상이면 앞선 완료가, 아니면 finally의 완료가 결과다. 완료는 명세의 설명 장치다. break·continue도 abrupt completion이다.
- ReturnStatement는 식을 평가한 값을 return 완료에 담는다. 그래서 재할당은 변수만 바꾸고, 같은 객체를 변경하면 반환된 객체에서 보인다.
- 타이머는 Web IDL invoke를 "report"로 호출하고, 예외는 report an exception을 거쳐 전역 `error`(cancelable)로 간다.
- `[[PromiseIsHandled]]`가 false인 프로미스가 거부되면 HostPromiseRejectionTracker "reject"로 목록에 들어가고, 체크포인트에서 큐를 비운 뒤 알림 단계가 전역 태스크로 `unhandledrejection`을 발화한다. PerformPromiseThen은 "handle"로 목록에서 빼거나, 이미 알린 뒤면 `rejectionhandled`를 예약한다.
- 다른 태스크 소스 사이의 순서는 표준이 보장하지 않는다.

#### 확인 질문

1. 예제 8의 `noAwait`에서 `catch`가 돌지 않는 이유를 "거부가 try 뒤에 일어나서"라고 하면 왜 틀리는가?
   <details><summary>답</summary>`p`는 `try` 블록 안에서 `Promise.reject`로 이미 거부되어 있다. `catch`는 throw 완료가 있어야 도는데 `try` 블록은 거부된 프로미스를 값으로 담은 return 완료로 끝난다. `try` 뒤에 거부되는 것은 호출이 돌려준 프로미스다(변경 이력 리뷰 ②, content.mdx "async 함수의 try와 return await").</details>
2. "`return p`면 `finally`가 `p`의 결과보다 먼저 실행된다"가 틀린 일반화인 이유는 무엇이고, 어떻게 써야 하는가?
   <details><summary>답</summary>`p`가 대기 중일 때만 참이다. 예제 8처럼 이미 거부된 프로미스면 결과가 먼저다. 보장되는 것은 "`finally`가 `p`를 기다리지 않는다"까지다(변경 이력 사용자 검토 2차).</details>
3. 전역 에러 예제에서 `preventDefault()`를 빼면 무엇이 깨지고, 그 때문에 이 페이지가 실행으로 보이지 못하는 것은 무엇인가?
   <details><summary>답</summary>실행기가 `pageerror`로 실패한다. 그래서 취소되지 않아 콘솔에 보고될 수 있는 경우는 표준 서술로만 쓴다(계획 2절, simplifications).</details>
4. 거부 핸들러 없이 `p.then(f)`만 부르면 `unhandledrejection`은 어느 프로미스에 대해 발화하는가? 왜 그런가?
   <details><summary>답</summary>`then`이 돌려준 프로미스다. PerformPromiseThen이 `p`의 `[[PromiseIsHandled]]`를 true로 바꾸고, 파생 프로미스가 거부되어 알림 대상이 된다. event.promise로 확인했다(변경 이력 사용자 검토 ①).</details>
5. `late-handler`를 "50ms 뒤에 `catch`"로 만들면 어떤 표준 보장이 사라지는가?
   <details><summary>답</summary>`unhandledrejection` 태스크(DOM manipulation 태스크 소스)와 타이머 태스크 사이의 순서는 표준이 보장하지 않는다. 리스너 안에서 예약하면 이벤트 → 타이머 → `catch` 콜백 → `rejectionhandled` 순서가 보장된다(계획 2절).</details>
