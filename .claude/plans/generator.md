# 제너레이터 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-05
- 기준: `main` @ `021bf38`

## 0. 요약

- 목적: 43~48장 로드맵 4번. 제너레이터 함수를 불러도 본문이 실행되지 않고 `next`로 멈췄다 다시 시작하는 동작을 ECMAScript 원문과 실행 결과로 설명하는 47번째 개념 `generator`를 추가한다.
- 범위: 새 개념 폴더 1개(예제 10개, 2시나리오 상태 시뮬레이터 — 개념 전용 뷰), 고정 테스트·e2e·빌드 테스트·content-guide·로드맵. 공통 코드와 다른 개념 파일은 바꾸지 않는다('작성 예정'으로 제너레이터를 가리키는 곳 없음).
- 위험: 명세 판 차이(ES2026판 GeneratorResume vs 초안 RunSuspendedContext)를 섞어 인용하거나, 47장 try…catch…finally를 앞서 설명하는 것.
- 복잡도: 중간 · Consensus: 생략 (새 개념 추가 패턴 그대로, 공통 코드 변경 없음. 명세 정확성은 구현 뒤 리뷰 + Opus 교차 검토로 확인)
- 미확정: 1건(시나리오 단계 수는 구현 후 고정)

## 1. 요구사항

### 요구사항 (2026-11-05 사용자 결정)

- 로드맵 4번 개념. slug `generator`, 제목 '제너레이터: 함수를 불렀는데 본문은 왜 실행되지 않을까', category `execution`, order 450(47번째·마지막), `reviewedAt: null`.
- 다룰 주제(기본 + 추가 4개 모두):
  - 기본: ① 불러도 본문 미실행(객체만 받음, `next`에서 시작, 끝까지 `next`하지 않으면 뒷부분은 실행되지 않음) ② `yield`↔`next` 왕복과 `next` 인수(첫 `next`의 인수는 쓰이지 않고, 다음 `next(x)`의 인수가 멈춰 있던 `yield` 식의 값) ③ `return` 값은 `done: true` 결과로 나오고 `for...of`·스프레드는 버림, completed 뒤 `next`는 `undefined true` ④ 제너레이터로 이터러블 만들기, 제너레이터 객체는 자기 자신을 돌려주는 이터레이터라 한 번 쓰면 끝(로드맵 보류 목록의 "4번에서 한 절로")
  - 추가: ⑤ `return()`·`throw()`와 `finally`(시작 전 `return()`은 본문 없이 바로 완료), `break`로 나가도 `finally` ⑥ `yield*` 위임(안쪽 `return` 값이 `yield*` 식의 값) ⑦ 생성자 아님(`new` → TypeError), 실행 중인 제너레이터의 `next` → TypeError ⑧ 매개변수 기본값은 호출 때 평가.
- 시각화: 상태 시뮬레이터 — 제너레이터 상태(suspended-start · suspended-yield · executing · completed), 실행 컨텍스트 스택에 제너레이터 컨텍스트가 오르내림, 지금 처리 중인 호출(메서드와 인수), 돌려준 결과 객체.

### 유지해야 하는 기존 동작

- 다른 개념 파일, 공통 셸·실행기·레이아웃은 그대로. 기존 e2e·빌드 테스트는 개수·마지막 개념 값만 바꾸고 새 케이스는 추가만 한다.

### 제외 범위

- async 제너레이터·`for await...of`, 제너레이터로 비동기 흐름 다루기(co 패턴)·async/await(로드맵 5번, '작성 예정'으로만), `try...catch...finally` 문 자체의 의미(로드맵 6번, '작성 예정' — 예제에서 최소한으로 쓰고 본문은 제너레이터 쪽 동작만 설명), `GeneratorFunction` 생성자, Iterator helpers(`Iterator.prototype.map` 등), 다른 개념 파일의 '별도 개념' 문구 링크화(사용자 결정: 나중에 일괄).

## 2. 사실과 추정

### 사실 (명세 원문 — 현재 초안 `scratchpad/std/ecma.html`과 발행판 ES2026 `scratchpad/std/es2026.html`, 2026-11-05 받음)

- 호출: EvaluateGeneratorBody는 `FunctionDeclarationInstantiation(funcObj, argList)` 뒤 제너레이터 객체를 만들고 상태를 suspended-start로 한 뒤 GeneratorStart를 하고 그 객체를 반환한다(두 판 같음, `#sec-runtime-semantics-evaluategeneratorbody`). 매개변수 기본값은 FunctionDeclarationInstantiation에서 평가된다 → 예제 10.
- GeneratorStart: "Set the code evaluation state of genContext such that when evaluation is resumed for that execution context, closure will be called with no arguments." (두 판 같음 — 첫 `next` 인수가 쓰이지 않는 근거). 본문이 끝나면 completed: "NOTE: Once a generator enters the completed state it never leaves it and its associated execution context is never resumed." (두 판 같음, 변수명 acGen/acGenerator만 다르므로 NOTE 앞부분까지만 인용).
- GeneratorValidate: "If state is executing, throw a TypeError exception." (두 판 같음, `#sec-generatorvalidate`).
- GeneratorResume: "If state is completed, return CreateIteratorResultObject(undefined, true)." (두 판 같음). 이후 ES2026판은 "Push genContext onto the execution context stack; genContext is now the running execution context." "Resume the suspended evaluation of genContext using NormalCompletion(value) as the result of the operation that suspended it."이고, 초안은 `RunSuspendedContext(genContext, NormalCompletion(value))`로 바뀌었고 매개변수 이름도 generator→gen. **판마다 다른 문장은 인용하지 않는다.**
- GeneratorResumeAbrupt: suspended-start이면 completed로 바꾸고, return completion이면 `CreateIteratorResultObject(abruptCompletion.[[Value]], true)` (두 판 같은 흐름 — 시작 전 `return()`이 `finally` 없이 끝나는 근거).
- 참고 링크 앵커(초안 사본에서 확인): `#sec-generator-function-definitions`, `#sec-runtime-semantics-evaluategeneratorbody`, `#sec-generator-objects`, `#sec-properties-of-generator-instances`(상태 표), `#sec-generatorstart`, `#sec-generatorvalidate`, `#sec-generatorresume`, `#sec-generatorresumeabrupt`, `#sec-generatoryield`, `#sec-generator.prototype.next`, `#sec-generator.prototype.return`, `#sec-generator.prototype.throw`, `#sec-generator-function-definitions-runtime-semantics-evaluation`(yield·yield*), `#sec-iteratorclose`, `#sec-iterator.prototype-%symbol.iterator%`. MDN ko `Global_Objects/Generator`, `Statements/function*`, `Operators/yield`, `Operators/yield*`(모두 200).

### 사실 (실행 확인 — 2026-11-05, Node v24.22.1 vm `runInNewContext`, `microtaskMode: 'afterEvaluate'`, 프로젝트 실행기와 같은 옵션)

| 예제 | 출력 |
| - | - |
| `lazy.js` | 제너레이터 객체를 받음, 본문 시작, 1 false ('본문 끝'은 찍히지 않음) |
| `next-arg.js` | first false, a = hi, second false, b = bye, end true, undefined true |
| `return-value.js` | [1,2], [1,2], 3 true |
| `iterable.js` | [1,2,3], [1,2,3], true, [1,2,3], [] |
| `return-finally.js` | step 1 false, 정리, 중단 true, undefined true, 시작 전 true |
| `throw-catch.js` | ready false, 잡음: boom, recovered false, done true |
| `break-finally.js` | 1, 2, 3, finally, 루프 뒤 |
| `delegate.js` | yield* 식의 값: inner의 반환값, ["o1","i1","i2","o2"] |
| `not-constructor.js` | new: TypeError, 실행 중 next: TypeError |
| `default-param.js` | 기본값 평가, 제너레이터 객체를 받음, 본문 시작, 1 false |

- 결과 객체를 `JSON.stringify`로 찍으면 `value: undefined`가 사라진다(`{"done":true}`) → 예제는 `r.value + ' ' + r.done`으로 출력한다.

### 사실 (코드에서 확인)

- 개념 폴더끼리 import 없음(공유는 `app/simulator/`뿐, AGENTS.md "시뮬레이터 규칙"). 참고 구현: `app/concepts/microtask-queue/{scenarios.ts, MicroView.tsx, concept.test.ts}`, `app/concepts/iterable-for-of/{scenarios.ts, IterView.tsx}`(이터레이터 프로토콜 시뮬레이터).
- 다른 개념에서 제너레이터를 '작성 예정'으로 가리키는 곳 없음(`grep 제너레이터` — iterable-for-of meta 단순화·new-operator 본문·execution-context meta·arrow-functions meta는 '별도 개념' 평문). 링크화 대상 없음.
- 고정 테스트(직전 커밋 `021bf38` 패턴): `app/lib/concepts.test.ts`(total 46 → 47, 마지막 `generator`, prev `microtask-queue`), `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(카드 47·'47번째'·새 제목, '/ 46' → '/ 47', microtask-queue 46/47 링크 2개, generator 47/47), `tests/e2e/responsive.spec.ts`(홈 article 47 + 새 페이지 케이스), `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts:76-77` 뒤(`GENERATOR_PATH`, `GENERATOR_SIMULATOR_NAME = '제너레이터 시뮬레이터'`), `tests/build/build-output.test.ts:1185` 뒤, `docs/content-guide.md` e2e 목록.
- prerequisites 후보 order: execution-context 200, iterable-for-of 310 (< 450).

### 추정

- 없음.

## 3. 구현 전략

- **새 개념 폴더 + 개념 전용 상태 시뮬레이터.** 상태 모델(`scenarios.ts`):

  ```ts
  export type GenStatus = 'suspended-start' | 'suspended-yield' | 'executing' | 'completed'
  export type GenState = {
    stack: string[] // 실행 컨텍스트 스택. 아래 → 위(지금 실행 중). '전역 코드', '<함수 이름> 본문'
    gens: { name: string; status: GenStatus; vars: { name: string; value: string }[] }[] // 제너레이터 객체(변수 이름 it, early)와 그 컨텍스트가 기억하는 변수
    call: { target: string; method: 'next' | 'return'; arg: string } | null // 지금 처리 중인 메서드 호출
    result: { value: string; done: boolean } | null // 직전 호출이 돌려준 결과 객체(표시용 문자열)
  }
  ```

  - 시나리오 1 `next` ← `next-arg.js`: `var it = talk()`(suspended-start, `a`·`b`는 undefined — FunctionDeclarationInstantiation에서 만들어짐) → `next('ignored')`(executing, 스택에 `talk 본문`, 인수 표시 + "시작 지점은 인수를 받지 않음") → `yield 'first'`(suspended-yield, 스택에서 내려감, 결과 `first false`) → 출력 → `next('hi')`(멈춘 yield 식의 값이 'hi', `a = 'hi'`) → … → `return 'end'`(completed, `end true`) → `next('again')`(completed라 스택에 오르지 않고 바로 `undefined true`).
  - 시나리오 2 `return` ← `return-finally.js`: `next()` → `yield 'step 1'` → `return('중단')`(멈춘 yield에서 return 완료로 재개 → `finally` 실행 → completed, `중단 true`) → `next()`(`undefined true`) → `early = task()`(suspended-start) → `early.return('시작 전')`(스택에 오르지 않고 바로 completed, `finally` 없음, `시작 전 true`).
  - 내장 `next`/`return` 메서드 자체의 실행 컨텍스트는 그리지 않는다(이벤트 루프 페이지가 호스트 함수 프레임을 그리지 않은 것과 같은 단순화) → `simplifications`.
- **본문 구성** (`동작 원리` h3): ① 불러도 본문은 실행되지 않는다(EvaluateGeneratorBody, 예제 1·10 — 매개변수 기본값은 호출 때) ② next와 yield는 값을 주고받는다(GeneratorStart의 "called with no arguments", 예제 2) ③ return 값과 completed(completed NOTE, GeneratorResume의 completed 처리, 예제 3) ④ 제너레이터로 이터러블 만들기(이터러블과 for...of 링크, `%Iterator.prototype%[Symbol.iterator]`가 this를 반환 → 한 번 쓰면 끝, 예제 4) ⑤ return()·throw()와 finally, break(GeneratorResumeAbrupt, IteratorClose, 예제 5·6·7 — try…catch…finally는 '작성 예정', 이 페이지는 "빠져나갈 때 finally 블록이 실행된다"는 결과만 씀) ⑥ yield* 위임(예제 8) ⑦ 생성자 아님·실행 중 next(GeneratorValidate, 예제 9) ⑧ 다루지 않는 것. `예제`(10개, 각 뒤 퀴즈, 시뮬레이터) → `결과와 이유`(호출별 결과 표 + 오해 Callout: "제너레이터를 부르면 첫 yield까지 실행된다", "첫 next의 인수가 첫 yield의 값이 된다", "for...of도 return 값을 준다", "제너레이터 객체는 몇 번이든 다시 돌 수 있다").
- **명세 판 처리.** 링크는 현재 초안(`https://tc39.es/ecma262/#…`), 인용은 ES2026판과 초안에 똑같이 있는 문장만. 상태 이름(suspended-start 등)은 두 판 같음. 단계 설명에 `RunSuspendedContext`·매개변수 이름을 쓰지 않는다.
- **버린 대안.** (a) iterable-for-of 시뮬레이터에 시나리오 추가: 그 페이지 범위·테스트를 바꾸고 상태 모델이 다름. (b) 시나리오 3개 이상(throw·yield*·break): 화면이 길어지고 상태가 늘어 테스트가 복잡 — 예제·퀴즈·표로 충분. (c) `try...catch` 없이 TypeError 보이기: 처리되지 않은 예외는 실행기를 실패시켜 불가.

## 4. 변경 파일

- 추가 `app/concepts/generator/`: `meta.ts`(prerequisites `execution-context`·`iterable-for-of`, related `iterable-for-of`·`execution-context`·`spread-destructuring`·`new-operator`, references 2절 앵커 + MDN 4개, simplifications), `examples/*.js` 10개(부록), `scenarios.ts`, `GenView.tsx`, `Simulator.tsx`(label '제너레이터 시뮬레이터'), `GenView.test.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `content.mdx`, `route.tsx`.
- 수정(고정 테스트·문서): 2절 "고정 테스트" 목록 전부, `.claude/plans/concept-roadmap-ch43-48.md`(4번 상태·진행 기록).
- 변경하지 않음: 다른 개념 폴더, `app/simulator/`, `app/components/`, `app/lib/concepts.ts`, `tests/helpers/`.

## 5. 위험 요소

- 명세 판 혼용 → 인용이 어느 판에도 없는 문장이 됨 → 인용 대조 스크립트를 두 사본 모두에 돌려 "두 판 모두에 있음"을 확인(작업 4).
- try…catch…finally(47장) 앞서 설명 → 장 범위 규칙 위반 → 본문은 "빠져나갈 때 finally가 실행된다"는 결과만, '작성 예정'과 simplifications(작업 1·4).
- `JSON.stringify(결과 객체)`가 `undefined`를 지움 → 예제는 `value + ' ' + done`(작업 1, 부록대로).
- 시작 전 `return()`이 `finally`를 실행하지 않는 이유를 "try에 들어가지 않아서"로만 쓰면 부정확 → GeneratorResumeAbrupt가 suspended-start를 completed로 바꾸고 본문을 재개하지 않는다고 설명(작업 4).
- `for...of`에서 `break` 시 `return`이 불리는 것은 IteratorClose(ECMAScript) — iterable-for-of 페이지와 용어 일치(작업 4).
- 시뮬레이터 상태가 표준과 다름(내장 메서드 프레임 생략) → simplifications, 불변식(작업 2).
- 새 개념이 마지막 → 고정 테스트 갱신(작업 5). navigation '/ 46' 모두 바꿈.
- MDX: PredictQuiz 문자열 prop 안 작은따옴표 금지(test:build로 확인), 첫 문단 `**`·`function*`의 `*` 연속 주의(코드는 백틱 안).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`, 그 뒤 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "generator|제너레이터|홈 학습 순서 보기|microtask-queue|마이크로태스크 큐"`.
- 예제: L1이 10개 예제를 vm에서 실행해 대조. 음성 확인 1회.
- 브라우저(빌드 serve): ① 1280 라이트·375 다크에서 두 시나리오를 끝까지 넘기는 동안 `scrollWidth` = 창 너비 ② 단계마다 상태 배지·스택·호출·결과 칸이 설명과 맞고 "(바뀜)"이 바뀐 칸에만 ③ JS 끔에서 첫 단계와 퀴즈 `<details>` 수 = 퀴즈 수 ④ microtask-queue 페이지 학습 순서 '다음'이 새 페이지.
- 인용: 본문 영어 인용이 초안 사본과 ES2026 사본 **모두**에 글자 단위로 있음(스크립트).

## 7. 미확정 사항

- [미확정] 시나리오별 단계 수 — 3절 흐름대로 쓴 뒤 `concept.test.ts`에 고정.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `app/concepts/generator/{meta.ts, content.mdx(필수 h2 3개 임시), route.tsx, examples/*}`
- 변경: 부록 예제 10개를 바이트 그대로 복사. meta를 1·2·3절대로(`expectedOutput`은 2절 표). 폴더는 meta.ts → content.mdx → route.tsx 순.
- 주의사항: summary 160자 이하, `reviewedAt: null`, references 라벨에 절 번호 없음. simplifications: 내장 메서드 프레임 생략, 상태 표시는 [[GeneratorState]] 요약, try…catch…finally·async/await는 별도 개념(작성 예정), 명세 판(링크는 초안, 인용은 두 판 공통), 예제는 Node vm 실행값.
- 완료 조건: `npx vitest run tests/examples.test.ts -t generator`(10개)·`tests/content-integrity.test.ts` 통과, 음성 확인 1회(개수 고정 테스트 실패는 작업 5에서 해소).

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절 상태 모델과 시나리오 2개. 테스트: `assertScenarioInvariants`, 고정 줄 원문, 첫 단계(`stack: ['전역 코드']`, `gens: []`, 출력 없음) / ① 상태 전이는 suspended-start→executing|completed, executing→suspended-yield|completed, suspended-yield→executing|completed, completed→completed만 ② 상태가 executing인 제너레이터가 있으면 스택 맨 위가 그 본문이고, 없으면 스택에 '본문' 프레임이 없다(동시에 executing은 하나) ③ completed가 된 뒤 결과는 항상 done true ④ suspended-start에서 completed로 가는 단계는 스택에 본문이 오르지 않는다(시작 전 return) ⑤ 새 출력 한 줄·line 범위 ⑥ 결과를 출력하는 단계의 출력 줄이 직전 결과의 `value + ' ' + done`과 같다 ⑦ 마지막 단계 출력 = expectedOutput, 스택은 `['전역 코드']`로 끝나거나 비어 있음(구현 때 하나로 정해 고정). 개념 불변식: next 시나리오에서 'ignored'는 어떤 vars에도 나타나지 않고 `a`가 'hi'가 되는 단계의 call.arg가 'hi', return 시나리오에서 '정리' 출력 단계에 `task 본문`이 스택에 있음, `early`는 한 번도 executing이 아님.
- 완료 조건: `npx vitest run app/concepts/generator/concept.test.ts` 통과 + 음성 확인 1회.

### 3. 뷰·시뮬레이터 컴포넌트

- 대상: `GenView.tsx`, `Simulator.tsx`, `GenView.test.tsx`, `Simulator.test.tsx` (참고 `MicroView.tsx`)
- 변경: 칸: 실행 컨텍스트 스택(맨 위 강조) / 제너레이터 객체 카드(이름, 상태 텍스트, 기억하는 변수) / 지금 호출(`it.next('hi')` 형식 또는 '없음') / 돌려준 결과(`{ value: 'first', done: false }` 텍스트 또는 '없음'). `grid-cols-1 sm:grid-cols-2`, 375px에서 세로. "(바뀜)" 표시, 색만으로 구분 금지.
- 완료 조건: `npx vitest run app/concepts/generator` 통과, typecheck·eslint·prettier 통과.

### 4. 본문 작성

- 대상: `content.mdx`
- 변경: 3절 본문 구성. 첫 문단 산문(`**` 없음, 46장까지 전제, 실행 컨텍스트·이터러블과 for...of·클로저 링크). 예제 10개 + PredictQuiz 최소 10개, 시뮬레이터 독립 줄, 결과와 이유 표(`<Wide>`)와 오해 Callout.
- 주의사항: 인용은 두 판 공통 문장만. try…catch…finally·async/await는 '작성 예정'. "제너레이터는 실행 컨텍스트를 멈춘다"를 엔진 구현처럼 쓰지 않고 명세의 실행 컨텍스트 서술로.
- 완료 조건: `npm test`·`npm run test:build` 통과, 인용 대조 스크립트(두 사본) 결과 0건 불일치.

### 5. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록.
- 완료 조건: 6절 정적·테스트 전부와 새 페이지 범위 e2e 통과, 6절 브라우저 ①~④ 확인.

## 9. 추가 개선 후보

- execution-context·iterable-for-of·new-operator의 "제너레이터는 별도 개념" 문구를 새 페이지 링크로(사용자 결정대로 나중에 일괄).

## 변경 이력

- 2026-11-05 (리뷰 지적 — Opus 명세 정확성 교차 검토, 원문·실행으로 재확인 후 반영): ① [High] 예제 8 설명이 안쪽 done:true 결과를 for...of가 버리는 것으로 설명 → `yield*`가 받아 식의 값으로 쓰므로 바깥 next 결과로 나가지 않음("Else, set received to Completion(GeneratorYield(innerResult))." 인용, vm 확인), 표·퀴즈 해설도 ② [High] "이터러블 객체는 몇 번이든 돈다" → Symbol.iterator가 부를 때마다 새 이터레이터를 만드는 이터러블로 한정(본문·Callout) ③ 호출 동안 제너레이터 함수의 실행 컨텍스트가 스택에 올랐다 빠지고 [[GeneratorContext]]로 남는 흐름 추가([[Call]] Note "…must not be destroyed if it is suspended and retained for later resumption by an accessible Generator." 두 판 공통 인용), 시나리오 설명·simplifications ④ "기본값만 호출 때" → 매개변수 처리 전체 ⑤ finally는 멈춘 yield가 finally 있는 try 안에 있을 때로 한정, throw()+finally는 명세 서술로만(simplifications) ⑥ completed 뒤 변수 표시는 마지막 값일 뿐(simplifications) ⑦ 예제 2 퀴즈 오답 하나가 결과상 사실이라 교체 ⑧ 그 밖에 goal·결과와 이유의 "매개변수 처리까지만" → "FunctionDeclarationInstantiation까지만", `yield*`는 안쪽 결과 객체를 그대로 넘김, NOTE를 원인처럼 쓴 문장, 조사(GeneratorResume이), 호출한 쪽 = next 메서드 컨텍스트, 판 차이 "GeneratorResume 등", 시나리오의 'return 완료' 표현(47장 의미 서술) 제거 — 영향 단계 1·2·4
- 2026-11-05 (사용자 검토, Node 실행·ES2026판 GeneratorResumeAbrupt 원문으로 확인 후 반영): ① completed 상태의 return()/throw() 누락 → "세 갈래"로 고치고 suspended-start는 completed로 바꾼 뒤 그 갈래로 합류한다고 서술. 예제 5 끝에 `it.return('또')`(→ `또 true`), 예제 6 끝에 completed 제너레이터의 `throw(new Error('또'))`(→ `바깥에서 잡음: 또`) 추가, return 시나리오 14→16단계(완료된 it의 return은 스택에 본문이 오르지 않음, 개념 불변식 테스트 추가) ② finally 안에서 yield·return하면 return() 결과가 v·true가 아니고 completed가 안 될 수 있다는 단서(본문·표 예제 5·7 행·goal 4·simplifications) ③ 함수/객체 용어: 예제 2·3 리드, 오해 제목, goal 6, 예제 4·10 해설 ④ executing 검사는 return()·throw()도 거침(본문 괄호·표·goal 6, 예제로는 실행하지 않음을 simplifications에) ⑤ `yield*`가 next 인수·return()·throw()도 안쪽에 전달한다는 문장과 simplifications ⑥(선택) 예제 6을 `new Error('boom')`·`e.message`로 — 영향 단계 1·2·4
- 2026-11-05 (사용자 2차 검토, `yield* [1, 2]` Node 실행으로 확인 후 반영): ① goal 4의 괄호를 finally 실행이 아니라 결과(인수와 true)에 붙임 ② `yield*` 전달을 "안쪽에 그 메서드가 있으면"으로 한정(배열 위임에서 throw()는 TypeError, return()은 호출 없이 {v, true} 확인), simplifications도 같게 ③(선택) 예제 5·6 제목에 끝난 뒤의 return()/throw() 반영, goal 6 괄호 문체 — 영향 단계 1·4

## 부록: 예제 초안

`/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7bea0997-8470-4896-a372-d3ad7c080f48/scratchpad/gen/`의 파일과 같다(2026-11-05 실행 확인). 모두 `runtime: 'ecmascript'`, 파일 끝 줄바꿈 하나.

#### `lazy.js`

```js
function* count() {
  console.log('본문 시작');
  yield 1;
  console.log('본문 끝');
}
var it = count();
console.log('제너레이터 객체를 받음');
var r = it.next();
console.log(r.value + ' ' + r.done);
```

#### `next-arg.js`

```js
function* talk() {
  var a = yield 'first';
  console.log('a = ' + a);
  var b = yield 'second';
  console.log('b = ' + b);
  return 'end';
}
var it = talk();
var r1 = it.next('ignored');
console.log(r1.value + ' ' + r1.done);
var r2 = it.next('hi');
console.log(r2.value + ' ' + r2.done);
var r3 = it.next('bye');
console.log(r3.value + ' ' + r3.done);
var r4 = it.next('again');
console.log(r4.value + ' ' + r4.done);
```

#### `return-value.js`

```js
function* steps() {
  yield 1;
  yield 2;
  return 3;
}
var looped = [];
for (var x of steps()) {
  looped.push(x);
}
console.log(JSON.stringify(looped));
console.log(JSON.stringify([...steps()]));
var it = steps();
it.next();
it.next();
var last = it.next();
console.log(last.value + ' ' + last.done);
```

#### `iterable.js`

```js
var range = {
  from: 1,
  to: 3,
  *[Symbol.iterator]() {
    for (var i = this.from; i <= this.to; i++) {
      yield i;
    }
  }
};
console.log(JSON.stringify([...range]));
console.log(JSON.stringify([...range]));
var it = range[Symbol.iterator]();
console.log(it[Symbol.iterator]() === it);
console.log(JSON.stringify([...it]));
console.log(JSON.stringify([...it]));
```

#### `return-finally.js`

```js
function* task() {
  try {
    yield 'step 1';
    yield 'step 2';
  } finally {
    console.log('정리');
  }
}
var it = task();
var r1 = it.next();
console.log(r1.value + ' ' + r1.done);
var r2 = it.return('중단');
console.log(r2.value + ' ' + r2.done);
var r3 = it.next();
console.log(r3.value + ' ' + r3.done);
var early = task();
var r4 = early.return('시작 전');
console.log(r4.value + ' ' + r4.done);
```

#### `throw-catch.js`

```js
function* guard() {
  try {
    yield 'ready';
  } catch (e) {
    console.log('잡음: ' + e);
    yield 'recovered';
  }
  return 'done';
}
var it = guard();
var r1 = it.next();
console.log(r1.value + ' ' + r1.done);
var r2 = it.throw('boom');
console.log(r2.value + ' ' + r2.done);
var r3 = it.next();
console.log(r3.value + ' ' + r3.done);
```

#### `break-finally.js`

```js
function* naturals() {
  var n = 1;
  try {
    while (true) {
      yield n++;
    }
  } finally {
    console.log('finally');
  }
}
for (var x of naturals()) {
  console.log(x);
  if (x === 3) {
    break;
  }
}
console.log('루프 뒤');
```

#### `delegate.js`

```js
function* inner() {
  yield 'i1';
  yield 'i2';
  return 'inner의 반환값';
}
function* outer() {
  yield 'o1';
  var r = yield* inner();
  console.log('yield* 식의 값: ' + r);
  yield 'o2';
}
var values = [];
for (var v of outer()) {
  values.push(v);
}
console.log(JSON.stringify(values));
```

#### `not-constructor.js`

```js
function* gen() {
  yield 1;
}
try {
  new gen();
} catch (e) {
  console.log('new: ' + e.name);
}
function* selfCall() {
  var me = yield;
  try {
    me.next();
  } catch (e) {
    console.log('실행 중 next: ' + e.name);
  }
}
var it = selfCall();
it.next();
it.next(it);
```

#### `default-param.js`

```js
function note() {
  console.log('기본값 평가');
  return 1;
}
function* start(x = note()) {
  console.log('본문 시작');
  yield x;
}
var it = start();
console.log('제너레이터 객체를 받음');
var r = it.next();
console.log(r.value + ' ' + r.done);
```

## 구현 진행

- baseline (2026-11-05, `021bf38`): 커밋 직전 같은 코드로 실행한 결과 재사용 — lint·format:check·typecheck 통과, `npm test` 125파일 3939개, `test:build` 371개 통과(이후 변경은 계획 문서뿐)
- [x] 1. 예제·meta·route — 예제 10개가 초안과 `cmp` 일치, 메인 재실행: `examples.test -t generator` 10개, content-integrity·app/lib·ConceptPager 649개 통과. 음성 확인(서브에이전트: next-arg 출력 한 줄 변경 → 실패 후 원복). references 19개(ECMAScript 15·MDN 4), simplifications 7개, goals 6개
- (작업 5 일부 선행) 개수 고정 테스트(concepts.test·ConceptPager.test·navigation.spec·responsive 홈 47)·helpers 상수·content-guide 목록 — 서브에이전트, diff 확인
- [x] 2. 시나리오와 대조 테스트 — 단계 수 next 17·return 14(고정, 미확정 사항 해소), 불변식 ①~⑦·개념 불변식. 표기: call은 호출 시작~결과 확정 단계까지 유지 후 출력 단계에서 null, result.value는 출력과 같은 표기. 음성 확인(서브에이전트: completed 뒤 result.done을 false로 → ③ 실패 후 원복). 메인 검토: 단계별 설명·상태를 명세 흐름(EvaluateGeneratorBody·GeneratorResume·GeneratorResumeAbrupt)과 대조, early.return 설명 문장 다듬음(테스트의 고정 문구도 맞춤)
- [x] 3. 뷰·시뮬레이터 — `GenView`(실행 컨텍스트 스택·제너레이터 객체 카드·지금 호출·돌려준 결과, `grid-cols-1 sm:grid-cols-2`), label '제너레이터 시뮬레이터'. 메인 재실행: `vitest app/concepts/generator` 42개, typecheck·eslint·prettier 통과
- [x] 4. 본문 — 퀴즈 16개, 영어 인용 7개(ES2026판·현재 초안 사본 둘 다에 글자 단위로 있음, 메인 엄격 대조). 메인 검토 수정: 결과 객체를 만드는 주체를 Yield 연산으로(GeneratorYield는 상태 변경), 계산된 프로퍼티 이름 링크를 property-keys로, 시작 전 throw()·잡지 못한 예외는 "명세상… 예제로 실행해 보이지 않음"으로 한정하고 simplifications에 추가
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서 — a11y 2·responsive 2 케이스, 빌드 describe `시뮬레이터 프리렌더 (generator)`(`<details` ≥16). **계획에 없던 갱신**: 홈 검색 '객체' 결과가 15→16(새 summary·tags의 '제너레이터 객체' — meta를 직접 세어 확인, 6aafb6b와 같은 패턴)이라 navigation.spec 4곳과 순위 목록에 '47' 추가
- [x] 6. 전체 검증(메인): lint·format:check·typecheck 통과, `npm test` 128파일 4004개, `test:build` 379개, navigation 16개, `-g "generator|제너레이터|홈 학습 순서 보기|microtask-queue|마이크로태스크 큐"` 26개 통과. 화면(빌드 serve): 1280 라이트·375 다크에서 두 시나리오(17·14단계)를 끝까지 넘기는 동안 scrollWidth 최대값 = 창 너비, 375에서 칸이 세로로 쌓임, 7단계 스크린숏에서 바뀐 칸(제너레이터 객체)만 "(바뀜)". JS 끔 `<details>` 16개 = 퀴즈 수, 첫 단계 프리렌더, microtask-queue 학습 순서 '다음' 링크가 /concepts/generator
- [x] 7. 리뷰(critical-code-review, 메인 + Opus 명세 정확성 교차 검토): 코드(GenView·불변식 테스트·e2e·빌드 테스트) 지적 없음. 명세 정확성 지적 High 2·Medium 4·Low 8 — 메모리 기준(명세와 다른 설명·오개념 위험은 High)으로 판정해 `변경 이력`대로 수정. 남긴 Low: 정리 단계에 이르는 연결 인용 미추가, prepare 단계의 realm 실행 컨텍스트 미언급. 재검증: lint·format:check·typecheck 통과, `npm test` 4004개, `test:build` 379개, navigation 16개, 관련 e2e 26개 통과, 영어 인용 9개 두 판 모두 일치
- [x] 8. 사용자 검토 반영(`변경 이력` 2026-11-05 사용자 검토): 지적 5건 + 선택 1건을 Node 실행(completed 뒤 return/throw, finally 안 yield·return, 실행 중 return/throw TypeError, yield* 전달)과 GeneratorResumeAbrupt 원문으로 확인 후 반영. 재검증: lint·format:check·typecheck 통과, `npm test` 128파일 4005개, `test:build` 379개, navigation 16개, `-g "generator|제너레이터|홈 학습 순서 보기"` 14개 통과. 새 영어 인용 없음
- [x] 9. 사용자 2차 검토 반영(`변경 이력` 2차): lint·format:check·typecheck 통과, `npm test` 4005개, `test:build` 379개, `-g "generator|제너레이터"` e2e 12개 통과

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 새 개념 `generator`(order 450, execution, 47번째·마지막)를 추가했다. 예제 10개(모두 ecmascript), 상태 시뮬레이터 2시나리오(next 17단계·return 16단계), 퀴즈 16개, 영어 인용 9개(ES2026판·현재 초안 공통 문장).
- 달라진 점: ① 미확정이던 시나리오 단계 수를 next 17·return 14로 고정했다가, 사용자 검토 1차에서 예제 5에 완료된 제너레이터의 `return('또')`가 추가돼 return 시나리오가 16단계가 됐다. ② 사용자 검토 1차로 예제 6이 `new Error('boom')`·`e.message`를 쓰고 끝난 제너레이터의 `throw()`를 실행한다. ③ 홈 '객체' 검색 결과가 15→16개가 되어 navigation.spec을 갱신했다(계획에 없던 고정 테스트). ④ `reviewedAt`은 계획상 `null`이었으나 사용자 최종 승인(2026-11-05)으로 그날짜를 기록했다(지금까지 개념들과 같은 방식).

### 코드 리뷰

- critical-code-review(메인 + Opus 명세 정확성 교차 검토): 코드 지적 없음, 명세 정확성 High 2·Medium 4 수정(`yield*`의 done:true 처리, 이터러블 재사용 일반화 등). 사용자 콘텐츠 검토 두 차례(5건+선택 1건, 2건+선택 2건)를 실행·원문 확인 후 반영.
- 남긴 Low(보고만): 정리 단계에 이르는 연결 인용 미추가, 준비 단계에서 스택에 오르는 realm 실행 컨텍스트 미언급.

### 후속 작업

- [ ] execution-context·iterable-for-of·new-operator 등에서 제너레이터를 "별도 개념"으로 가리키는 문구를 이 페이지 링크로 바꾸기(사용자 결정: 나중에 일괄)
- [ ] 로드맵 5번 async/await

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터는 제너레이터 함수를 부르는 동안 그 실행 컨텍스트가 스택에 올랐다 빠지는 과정을 한 단계로 합쳐 그린다 — 대안은 push·pop 단계를 따로 두는 것이었으나 단계가 늘고 핵심(본문 미실행)이 흐려져, Opus 리뷰 지적을 단계 설명과 `simplifications`로 밝히는 쪽으로 반영했다.
- [Claude 판단] 실행으로 보이지 않은 동작(시작 전 `throw()`, 본문이 잡지 못한 예외, `throw()`+`finally`, 실행 중 `return()`·`throw()`의 TypeError, `yield*`의 전달)은 "명세상… 예제로 실행해 보이지 않음"으로 한정하고 `simplifications`에 적었다 — 사실처럼 단정하지 않기 위한 AGENTS.md 정확성 원칙 적용.
- [Claude 판단] 예제 8의 `inner` 반환값이 바깥 배열에 없는 이유를 "`for...of`가 버려서"가 아니라 "`yield*`가 안쪽 done:true 결과를 받아 식의 값으로 써서 바깥 next 결과로 나가지 않아서"로 고쳤다 — Opus 리뷰 High, 명세의 "Else, set received to Completion(GeneratorYield(innerResult))."와 vm 실행으로 확인.
- [무검토 승인] 상태 모델(stack·gens·call·result 전체 스냅샷)과 내장 `next`·`return` 메서드 프레임을 그리지 않는 단순화 — 계획 3절.
- [무검토 승인] 명세 판 처리: 링크는 현재 초안, 인용은 ES2026판과 초안에 글자 그대로 있는 문장만(GeneratorResume이 판마다 `RunSuspendedContext` 등으로 달라서) — 계획 3절.
- 완료된 제너레이터의 `return(v)`/`throw(e)`를 GeneratorResumeAbrupt의 completed 갈래로 설명하고 예제 5·6으로 실행해 보임(사용자 검토 1차). `finally` 안 `yield`·`return` 단서, `yield*` 전달은 "그 메서드가 있으면"으로 한정(사용자 검토 1·2차).

#### 배경지식

- 제너레이터 함수 호출(EvaluateGeneratorBody)은 FunctionDeclarationInstantiation(매개변수·기본값·var)까지만 하고 suspended-start 객체를 돌려준다. 본문은 GeneratorStart가 준비한 클로저로 첫 `next`에서 인수 없이 시작한다.
- 상태 네 가지: suspended-start → executing ↔ suspended-yield → completed. completed는 되돌아가지 않는다(NOTE).
- `next`는 GeneratorResume(completed면 `{undefined, true}`), `return`/`throw`는 GeneratorResumeAbrupt(suspended-start면 completed로 바꾸고 completed 갈래로 합류: return은 `{v, true}`, throw는 e를 던짐; suspended-yield면 그 yield 지점을 return·throw completion으로 재개). 둘 다 먼저 GeneratorValidate가 executing이면 TypeError.
- 제너레이터 객체의 `Symbol.iterator`는 `this`를 돌려주므로 한 번 소비하면 끝이고, 매번 새 이터레이터를 만드는 이터러블(`*[Symbol.iterator]()`)만 몇 번이든 돈다.
- `for...of`의 `break`는 IteratorClose로 `return()`을 불러 멈춘 yield를 둘러싼 `finally`를 실행한다.

#### 확인 질문

1. 예제 2에서 첫 `next('ignored')`의 인수가 어디에도 쓰이지 않는 이유는 무엇이고, 두 번째 `next('hi')`의 인수는 왜 `a`가 되는가?
   <details><summary>답</summary>GeneratorStart가 본문을 "closure will be called with no arguments"로 시작하도록 정해, 첫 next에는 인수를 받아 줄 멈춘 yield 식이 없다. 두 번째 next는 suspended-yield를 재개하며 그 값이 멈춰 있던 `yield 'first'` 식의 값이 된다(계획 2절, content.mdx "next와 yield").</details>
2. 시뮬레이터가 제너레이터 함수 호출을 한 단계로 그린 것은 명세의 어떤 과정을 합친 것이고, 왜 그렇게 해도 오해가 생기지 않게 했는가?
   <details><summary>답</summary>호출 동안 그 함수의 실행 컨텍스트가 스택에 올랐다가 빠지고, 빠진 컨텍스트는 [[GeneratorContext]]로 남아 next에서 다시 오른다([[Call]] Note). 단계 설명에 이 과정을 적고 simplifications에 "한 단계로 합쳐 그림"을 밝혔다(scenarios.ts 두 번째 단계, meta.ts).</details>
3. 같은 completed 제너레이터에 `next()`와 `return('또')`를 부르면 결과가 왜 다른가?
   <details><summary>답</summary>next는 GeneratorResume의 completed 처리로 CreateIteratorResultObject(undefined, true)를, return은 GeneratorResumeAbrupt의 completed 갈래에서 인수를 value로 한 {또, true}를 돌려준다. 둘 다 본문을 재개하지 않아 finally도 실행되지 않는다(예제 5, return 시나리오 마지막 두 단계).</details>
4. 예제 8에서 `inner의 반환값`이 `values`에 없는 것을 "for...of가 done:true 결과의 value를 버려서"라고 설명하면 왜 틀린가?
   <details><summary>답</summary>안쪽의 done:true 결과는 yield*가 받아 식의 값으로 쓰고 바깥 next의 결과로 내보내지 않는다(명세 "Else, set received to Completion(GeneratorYield(innerResult))."는 끝나지 않은 결과만 넘김). 바깥 for...of는 그 결과를 본 적이 없다(변경 이력 Opus 리뷰 ①).</details>
5. `yield*`로 배열에 위임하는 중 바깥에 `throw(new Error('x'))`를 부르면 무엇이 일어나고, 그래서 본문 서술을 어떻게 한정했는가?
   <details><summary>답</summary>배열 이터레이터에는 throw 메서드가 없어 안쪽을 닫은 뒤 원래 예외가 아니라 TypeError가 던져진다(Node 확인). 그래서 "return()과 throw()는 안쪽 이터레이터에 그 메서드가 있으면 전달"로 한정했다(변경 이력 2차 검토 ②).</details>
