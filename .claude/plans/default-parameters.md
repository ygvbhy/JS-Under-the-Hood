# 추가 게시글 '매개변수 기본값' 구현 계획

- 상태: 완료
- 작성일: 2026-11-06
- 기준: `main` @ `53d8454`

## 0. 요약

- 목적: 추가 게시글(26장) `/concepts/default-parameters`를 추가해, 기본값 식의 평가 시점·`length`·매개변수 스코프와 arguments·`'use strict'` 제약을 예제 12개, 퀴즈, 환경 레코드 시뮬레이터(시나리오 2개)로 보인다.
- 범위: 새 개념 폴더 1개(category `execution`, order 255), 학습 순서가 밀리는 테스트 기대값 갱신, 빌드·e2e 추가, 기존 4개 페이지의 '별도 개념' 문구와 `related`, `promise/scenarios.ts`의 낡은 문구, content-guide e2e 목록, 로드맵. 공통 코드는 바꾸지 않는다.
- 위험: '기본값이 있으면'으로 뭉뚱그려 명세의 두 조건(ContainsExpression, IsSimpleParameterList)을 섞는 것 → 조건별로 나눠 쓰고 경계 사례를 `concept.test.ts`에서 실행으로 고정한다.
- 복잡도: 중간 · Consensus: 생략. `for-let`의 상태 모델·화면을 줄여 복사하는 기존 패턴이고 공통 코드 변경이 없다. 명세 원문과 vm 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-06)

- 새 개념 페이지 '매개변수 기본값'을 추가한다. 다룰 내용:
  - ① 기본값 식은 함수를 만들 때가 아니라 호출할 때, 기본값이 필요한 호출마다 평가된다.
  - ② 함수의 `length`에서 빠진다(첫 기본값 또는 rest 왼쪽까지만 센다).
  - ③ 매개변수 스코프: 기본값 안의 함수는 본문의 `var`를 보지 못한다. 같은 이름의 `var`는 별도 바인딩이고 매개변수 값으로 시작한다.
  - ④ 왼쪽부터 평가와 TDZ: 앞 매개변수는 참조되고 뒤 매개변수나 자기 자신은 ReferenceError.
  - ⑤ arguments와의 관계: sloppy mode에서 기본값이 있으면 매개변수 재할당이 `arguments[0]`에 반영되지 않는다. `arguments.length`는 넘긴 인수 개수다.
  - ⑥ 함수 안 `'use strict'` 금지: 매개변수 목록이 단순하지 않으면 SyntaxError.
  - ⑦ 필수 인수 패턴: 기본값 식에서 `throw`.
- 시각화: 환경 레코드 시뮬레이터.
- 학습 순서: 화살표 함수 뒤, order 255.
- 역방향 링크: 이번 작업에 함께 처리한다(function-calls, tdz, arrow-functions, spread-destructuring).
- `app/concepts/promise/scenarios.ts:65`의 낡은 '작성 예정' 문구를 고친다.

### 유지해야 하는 기존 동작

- 기존 개념 50개의 페이지·시뮬레이터·테스트는 문구와 순위 기대값 외에 바뀌지 않는다.
- 마지막 개념은 `es-modules` 그대로다. 위치만 50 → 51.
- 홈 `객체` 검색 결과 16건 유지. title·summary·tags에 '객체'를 쓰지 않는다(`함수 객체`, `arguments 객체` 금지. 태그는 `arguments`).
- 수정하는 기존 페이지의 `reviewedAt`은 바꾸지 않는다(문구 교체뿐. 선례 `53d8454`).

### 제외 범위

- `undefined`일 때만 쓰인다는 규칙의 재설명 — `function-calls`로 링크하고 한 줄만 쓴다.
- 디스트럭처링 매개변수의 기본값(order 320 `spread-destructuring`). 계산된 키가 조건에 영향을 준다는 사실만 단순화에 적는다.
- 직접 `eval`이 매개변수 안에서 만드는 바인딩, 본문의 같은 이름 함수 선언, 부록 B의 블록 함수.
- 제너레이터·async 함수의 기본값(`generator` 예제 10이 다룸).
- 배열(27장)을 전제로 한 예제. `[]` 기본값 대신 객체 리터럴을 쓴다.

## 2. 사실과 추정

### 사실 (명세 — tc39.es/ecma262 Draft 2026-11-05, 내려받아 확인)

- FunctionDeclarationInstantiation(`#sec-functiondeclarationinstantiation`):
  - `hasParamExprs`는 ContainsExpression of formals, `simpleParamList`는 IsSimpleParameterList of formals다. **두 조건은 다르다.** rest만 있는 `(...r)`은 단순하지 않지만 식이 없다.
  - strict이거나 `hasParamExprs`가 false면 envRecord는 호출의 LexicalEnvironment(함수 환경 레코드). 그 밖(sloppy + 식 있음)에는 NewDeclarativeEnvironment로 새 레코드를 만든다. 이유 NOTE: 매개변수 목록의 직접 eval이 만드는 바인딩을 매개변수 레코드 바깥에 두기 위함.
  - 매개변수마다 CreateMutableBinding. `hasDuplicates`일 때만 undefined로 미리 초기화한다. 중복은 식이 있는 목록에서 조기 오류이므로 기본값이 있으면 매개변수는 초기화 전 상태로 시작한다(TDZ의 근거).
  - `argumentsObjNeeded`이고 strict이거나 `simpleParamList`가 false면 CreateUnmappedArgumentsObject, 아니면 CreateMappedArgumentsObject.
  - 그다음 IteratorBindingInitialization으로 매개변수를 왼쪽부터 초기화한다. 이 단계가 본문 실행보다 먼저다.
  - `hasParamExprs`가 false면 variableEnv = envRecord(같은 레코드)이고 이미 있는 이름은 새로 만들지 않는다.
  - `hasParamExprs`가 true면 variableEnv = NewDeclarativeEnvironment(envRecord). NOTE: "closures created by expressions in the formal parameter list do not have visibility of declarations in the function body". var 이름마다 바인딩을 만들고, 매개변수 이름(`arguments` 포함)이고 함수 선언 이름이 아니면 그 값으로, 아니면 undefined로 초기화한다. NOTE: 같은 이름의 var는 대응하는 매개변수의 값으로 시작한다.
  - strict이면 lexicalEnv = variableEnv, 아니면 NewDeclarativeEnvironment(variableEnv). 따라서 sloppy + 식 있음이면 함수 환경 레코드 → 매개변수 레코드 → var 레코드 → 렉시컬 레코드의 네 개다.
  - 맨 앞 NOTE는 "default value initializers"로 설명하지만 알고리즘 조건은 ContainsExpression이다. 본문은 알고리즘을 따른다.
- ContainsExpression(`#sec-static-semantics-containsexpression`): 초기화식이 있거나 패턴의 계산된 키가 있으면 true.
- IsSimpleParameterList(`#sec-static-semantics-issimpleparameterlist`): 패턴, 초기화식, rest가 있으면 false.
- ExpectedArgumentCount(`#sec-static-semantics-expectedargumentcount`): rest 또는 초기화식이 있는 첫 매개변수 왼쪽의 매개변수 개수. 그 뒤의 초기화식 없는 매개변수도 세지 않는다.
- 조기 오류(`#sec-function-definitions-static-semantics-early-errors`): FunctionBodyContainsUseStrict이고 IsSimpleParameterList가 false면 Syntax Error. BoundNames가 LexicallyDeclaredNames에도 있으면 Syntax Error(`function f(a = 1) { let a; }`).
- `sec-destructuring-binding-patterns` SingleNameBinding: 초기화식이 있고 값이 undefined일 때만 Evaluation of Initializer.

### 사실 (vm 실행 — Node v24.22.1, `runInNewContext`, 스크래치패드에서 실행)

| 예제 파일 | 핵심 코드 | 출력 |
| - | - | - |
| `fresh-each-call.js` | `makeBox(box = { count: 0 })`를 두 번 호출, 같은 객체를 넘겨 두 번 호출 | `1 1 false` / `2` |
| `only-when-needed.js` | `tag(id = nextId())`: `tag(), tag(), tag(100), tag(null), tag()` | `1 2 100 null 3` / `3` |
| `eval-order.js` | 인수·기본값 2개·본문에서 출력 | `인수 a` / `b 기본값` / `c 기본값` / `본문 시작` |
| `left-to-right.js` | `box(width, height = width, area = width * height)` | `3 3 9` / `3 4 12` / `3 3 0` |
| `parameter-tdz.js` | `late(a = b, b = 1)`, `self(a = a)` | `ReferenceError` / `ReferenceError` / `5 6` |
| `function-length.js` | `(a,b)`, `(a,b=1)`, `(a=1,b)`, `(a,b=1,c)`, `(a,...others)` | `2 1 0` / `1 1` |
| `param-scope.js` | 시나리오 1. `var x='outer'`, `get` 기본값 함수, 본문 `var x='body'` | `outer body` |
| `same-name-var.js` | 시나리오 2. `demo(x, get = …)`, 본문 `var x`, `x='body'` | `arg` / `body arg` |
| `no-body-var.js` | 같은 코드에서 `var x` 없음 | `body body` |
| `arguments-link.js` | `plain(0)`, `withDefault(0)`, `count(...)` | `2 0` / `0 1 2` |
| `use-strict-body.js` | `new Function`으로 세 조합을 컴파일 | `ok` / `SyntaxError` / `ok` |
| `required-argument.js` | `greet(name = required('name'))` | `TypeError name 인수가 필요합니다` / `hi kim` / `hi null` |

표에 12개 파일이 있고 `no-body-var`는 `same-name-var`의 대조 예제다. 페이지의 예제 번호는 12까지다.

본문 주장 근거(같은 실행에서 확인): 기본값 없는 `function f(x) { var x; return x; }`는 `arg`, 파일 첫 줄 `'use strict'`와 기본값 함수는 허용, 화살표 함수·메서드 축약도 `outer`, 계산된 키가 있고 초기화식이 없는 패턴도 호출 가능, `function f(a = 1) { let a; }`는 SyntaxError, `function f(a, a = 1)`은 SyntaxError.

### 사실 (코드에서 확인)

- 개념 추가 절차·meta 필드·e2e 등록: `docs/content-guide.md`.
- 참고 구현: `app/concepts/for-let/`. 상태 모델 `scenarios.ts:1-70`, 화면 `ForLetView.tsx`(255줄), 래퍼 `Simulator.tsx`(19줄), `concept.test.ts`(구조·탐색 재계산·created/changed 검사), `Simulator.test.tsx`, `ForLetView.test.tsx`.
- 개념 간 공유 부품은 `app/simulator/`뿐이다(AGENTS.md). 화면은 import하지 않고 복사해 줄인다.
- 학습 순서 고정 지점:
  - `tests/e2e/navigation.spec.ts`: 개수 `:78,:139`, 마지막 '50번째' `:84`, 검색 순위 `:98-115`(28 이상 +1), pager '학습 순서 N / 50' `:165` 이후 전부, `arrow-functions`의 다음 `:239`, `array-index-length`의 이전 `:249`.
  - `tests/e2e/responsive.spec.ts:1248`, `app/lib/concepts.test.ts:104,111,112`, `app/components/concept/ConceptPager.test.tsx:18,28`.
- e2e 등록 선례: `tests/e2e/helpers.ts:42-43`, `a11y.spec.ts:1201-1232`, `responsive.spec.ts:651-666`. 빌드 선례: `tests/build/build-output.test.ts:840`.
- '별도 개념' 문구: `function-calls/meta.ts:75`, `tdz/meta.ts:77`, `arrow-functions/meta.ts:83`, `spread-destructuring/meta.ts:110`. `tdz/concept.test.ts:79`는 동작 검사라 바꾸지 않는다.
- `promise/scenarios.ts:65` `HOST_NOTE`가 `:136,:277` 단계 설명에 들어간다. `promise/concept.test.ts`에 이 문구를 고정한 검사는 없다.
- 시뮬레이터 설명 문자열은 링크가 아니라 글자로 보인다. 그래서 개념 이름으로 적는다.

### 추정

- 없음

## 3. 구현 전략

- `for-let`의 상태 모델을 줄여 개념 폴더에 복사한다. 반복·블록 레코드 대신 `params`, `vars` 레코드를 둔다. 상태 모양이 개념마다 다르다는 규칙에 맞고 공통 코드를 건드리지 않는다.
- 그림의 레코드는 전역, 매개변수, 본문 var 세 종류다. sloppy 함수의 빈 함수 환경 레코드와 렉시컬 레코드는 그리지 않고 `simplifications`와 본문에 밝힌다.
- 본문은 조건을 두 줄기로 나눠 쓴다. 레코드 분리는 '매개변수 목록에 식이 있을 때', arguments 연결 끊김과 `'use strict'` 금지는 '매개변수 목록이 단순하지 않을 때'다. 끝에 두 조건 비교표를 둔다.
- '매개변수 스코프'는 명세 용어가 아니라 관용 표현이라고 밝힌다. 설계 이유는 명세 NOTE가 적은 범위까지만 쓴다.

버린 대안:

- 예제 첫 줄 `'use strict';`로 그림을 레코드 두 개에 정확히 맞추기: 단순화는 없어지지만 같은 페이지의 '함수 안 `'use strict'` 금지'와 혼동된다.
- 네 레코드 모두 그리기: 빈 레코드 두 개가 375px 화면과 학습 초점을 해친다.
- 시나리오 3개(`no-body-var` 포함): 차이가 한 줄이라 예제와 퀴즈로 충분하다.

## 4. 변경 파일

### 추가 (`app/concepts/default-parameters/`)

- `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `DefaultParametersView.tsx`(+`.test.tsx`), `Simulator.tsx`(+`.test.tsx`), `concept.test.ts`, `examples/*.js` 12개

### 수정

- 순위 기대값: `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
- e2e·빌드 추가: `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`
- 문구·`related`: `app/concepts/function-calls/meta.ts`, `app/concepts/tdz/meta.ts`, `app/concepts/arrow-functions/meta.ts`, `app/concepts/spread-destructuring/meta.ts`
- 낡은 문구: `app/concepts/promise/scenarios.ts`
- 문서: `docs/content-guide.md`(e2e 경로 목록), `.claude/plans/concept-roadmap-ch25-37.md`(보류 항목 완료 표시)

### 변경하지 않음

- `app/simulator/`, `app/components/`, `app/lib/` 소스, `app/routes.ts`, 설정 — 새 폴더는 자동으로 스캔된다.

## 5. 위험 요소

- 조건을 섞어 '기본값이 있으면 모두'로 쓰면 → rest만 있는 함수에서 틀린다 → 작업 순서 2의 조건 비교표와 작업 순서 1의 경계 테스트(`(...r)`는 arguments 연결이 끊기고 `'use strict'`도 금지지만 var는 같은 레코드).
- 그림이 레코드를 생략해 명세와 달라 보이면 → `simplifications`와 본문 한 문단에 네 레코드를 밝힌다(작업 순서 2·3).
- '복사'로 설명하면 → 같은 이름 var는 '매개변수의 값으로 초기화되는 별도 바인딩'으로만 쓴다(AGENTS.md 정확성 원칙).
- 첫 평가 시점을 '정의할 때'와 비교하며 다른 언어를 단정하면 → 다른 언어는 언급하지 않는다.
- `arguments` 예제가 strict에서 돌면 결과가 달라진다 → 예제에 지시어를 넣지 않고, strict에서는 `plain(0)`도 `0`이라는 사실을 본문에 쓰고 `concept.test.ts`에서 확인한다.
- 뒷장 개념 전제: 배열(27장)을 쓰면 규칙 위반 → 예제는 객체만. `try...catch`·`throw`(47장)와 `new Function`은 쓰되 `simplifications`에 적는다(선례 `tdz`).
- MDX: `PredictQuiz` 문자열 prop의 작은따옴표는 `npm test`가 못 잡고 `test:build`만 잡는다. 첫 문단에 `**`를 쓰지 않는다. 문단을 `import`/`export`로 시작하지 않는다. 표는 JSX로 쓴다.
- 순위 갱신 누락 → 작업 순서 4의 grep으로 '/ 50'과 `50` 잔여를 전수 확인한다.
- 이미 검토된 4개 페이지의 문구 변경 → 이름만 바꾸고 내용은 유지. `tdz`는 class 언급을 그대로 둔다.
- 새 폴더를 만들 때 `meta.ts → content.mdx → route.tsx` 순서로 만든다(실행 중 dev 서버가 `./meta` 실패를 캐시한다). dev 서버를 재시작한다.

## 6. 검증 방법

- 정적·단위·빌드:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build
```

- e2e(공통 코드 변경 없음, AGENTS.md 범위):

```bash
npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "default-parameters|매개변수 기본값|홈 학습 순서 보기"
```

- 브라우저(`npm run dev` 재시작 후 `/concepts/default-parameters`):
  1. 375px에서 두 시나리오를 끝까지 진행 → 가로 스크롤 없음, 레코드 세 개와 함수 칸이 읽힘.
  2. 시나리오 1의 `get()` 단계 → 탐색 경로가 매개변수 레코드에서 전역으로 가고 결과가 `outer`.
  3. 시나리오 2의 `x = 'body'` 단계 → var 레코드만 '바뀜'이고 매개변수 레코드의 `x`는 `arg`.
  4. 다크 모드에서 '바뀜' 배지와 강조가 보임. 키보드로 시나리오 전환과 단계 이동.
  5. `/concepts/arrow-functions`의 다음과 `/concepts/array-index-length`의 이전이 새 페이지.
  6. JS를 끈 상태에서 시뮬레이터 첫 단계와 퀴즈 정답(`<details>`)이 보임.
- 사용자 콘텐츠 검토 후 `reviewedAt` 기록(처음에는 `null`).

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제와 메타데이터

- 대상: `app/concepts/default-parameters/examples/*.js`, `meta.ts`, 임시 최소 `content.mdx`·`route.tsx`, `concept.test.ts`의 '본문 주장 검증' 절
- 현재: 폴더 없음. 예제 초안은 2절 표대로 실행 확인됨
- 변경:
  - 예제 12개를 2절 코드로 만들고 `meta.examples`에 등록한다. 등록 시 `expectedOutput`은 `[]`로 두고 `npm test`의 실제 출력으로 채운다. 모두 `runtime: 'ecmascript'`.
  - `meta.ts`: slug `default-parameters`, title `매개변수 기본값: 기본값 안의 함수는 왜 본문의 var를 보지 못할까`, category `execution`, order 255, prerequisites `function-calls`·`tdz`·`closure`·`arrow-functions`, related `spread-destructuring`·`generator`·`for-let`, `reviewedAt: null`.
  - references: 2절의 명세 절 링크 5개와 MDN `Functions/Default_parameters`(ko). 링크는 열어 확인한다.
  - `concept.test.ts` 본문 주장: 기본값 없는 `var x`는 `arg`, `(...r)`의 arguments 연결 끊김과 `'use strict'` SyntaxError와 var 같은 레코드(`function f(x, ...r) { var x; return x; }`는 인수 값), strict에서 `plain(0)`은 `0`, 파일 첫 줄 strict 허용, 화살표·메서드 `outer`, `let a` 재선언 SyntaxError, `function f(a, a = 1)` SyntaxError.
- 이유: 페이지의 모든 주장을 실행 결과에 먼저 묶는다.
- 주의사항: 예제 줄 번호를 시뮬레이터가 쓰므로 `param-scope.js`, `same-name-var.js`는 이후 고치지 않는다. 파일 끝 줄바꿈 하나. `console.log`에 객체를 넘기지 않는다.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/default-parameters` 통과, 2절 표와 출력이 같다.

### 2. 본문

- 대상: `content.mdx`, `meta.ts`의 `summary`·`tags`·`goals`·`simplifications`
- 현재: 1단계의 최소 본문
- 변경:
  - `## 동작 원리`: 호출할 때 평가 → 인수·기본값·본문 순서 → 왼쪽부터와 TDZ → `length` → 매개변수 스코프(시뮬레이터 앞 설명) → 같은 이름의 var → arguments → `'use strict'` → 필수 인수 패턴 → 조건 비교표(JSX, `<Wide>`).
  - `## 예제`: 12개 예제 + `PredictQuiz`(예제마다 1개 이상) + `<Simulator scenarios={scenarios} />`(독립된 줄).
  - `## 결과와 이유`: 예제별 설명과 흔한 오해 Callout(기본값은 한 번만 만들어진다 / `null`도 기본값이 쓰인다 / 매개변수 스코프는 명세 용어다).
  - `simplifications`: 레코드 생략(네 레코드), 호출마다 만드는 실행 컨텍스트 생략, `try...catch`·`throw`·`new Function`은 뒷장·별도 개념, 계산된 키의 ContainsExpression, 직접 eval, 같은 이름 함수 선언, 디스트럭처링 매개변수, 함수 호출 내부 레코드(`get()`)를 그리지 않음.
- 이유: 페이지의 핵심 서술.
- 주의사항: 5절의 표현 규칙. summary 160자 이하, '객체' 금지. 조건을 말할 때 '식이 있는'과 '단순하지 않은'을 구분한다. '이 페이지의 테스트가 확인합니다'류 문구를 쓰지 않는다.
- 완료 조건: `npm test`와 `npm run test:build` 통과, `grep -c '객체' `로 title·summary·tags에 0건, 본문에 '복사' 설명 없음.

### 3. 시뮬레이터

- 대상: `scenarios.ts`, `DefaultParametersView.tsx`(+테스트), `Simulator.tsx`(+테스트), `concept.test.ts`, MDX 연결
- 현재: 없음. 참고 `app/concepts/for-let/`
- 변경:
  - 상태: `{ running: string; lexicalEnv: string | null; envs: EnvRecord[]; functions: FnObject[]; lookup: Lookup | null }`. `EnvRecord.kind`는 `'global' | 'params' | 'vars'`, id는 `'global' | 'params' | 'vars'`, 바깥은 `vars → params → global`. 전역은 `objectBindings`(var·함수 선언)만 쓴다. `Binding`, `Lookup`, `created`, `changed`는 `for-let`과 같다. `running`은 '전역 코드', 'read 호출', 'get 호출' 같은 표시 문자열이다. 함수 호출의 lookup은 `start = 함수 id`로 시작한다.
  - 시나리오 1 `param-scope.js`(약 11단계): 실행 전 → `x = 'outer'` → `read()` 호출, 매개변수 레코드(`get` 초기화 전) → 값이 undefined라 기본값 식 평가, 함수의 `[[Environment]]`는 매개변수 레코드 → `get` 초기화 → var 레코드(`x` undefined, 매개변수 이름이 아님) → `x = 'body'` → `get()` 안 `x` 탐색(params → global, `outer`) → 본문 `x` 탐색(vars, `body`) → 반환과 출력 → 종료.
  - 시나리오 2 `same-name-var.js`(약 10단계): 호출, `x`는 `arg`, `get` 초기화 전 → 기본값 함수와 `get` 초기화 → var 레코드의 `x`가 매개변수 값 `arg`로 시작 → 3번 줄 출력 → `x = 'body'`(vars만 바뀜) → 본문 `x` 탐색 → `get()` 안 `x` 탐색(params, `arg`) → 출력 → 종료.
  - 화면은 `ForLetView`를 복사해 `KIND_LABELS`를 '전역'·'매개변수'·'본문 var'로 바꾸고, `running`을 표시한다.
  - `concept.test.ts`: `assertScenarioInvariants`, 바깥 연결·함수 환경 구조, 탐색 재계산, created/changed가 직전 단계 차이와 일치, 호출이 끝난 단계에 `params`·`vars`가 없음.
- 이유: 매개변수 스코프를 눈으로 보이는 핵심 시각화.
- 주의사항: 각 단계는 전체 스냅샷. 경로·결과는 손으로 쓰고 테스트가 다시 계산한다. 색만으로 구분하지 않는다. 프리렌더 첫 단계가 JS 없이 읽혀야 한다.
- 완료 조건: `npx vitest run app/concepts/default-parameters` 통과, 마지막 단계 출력이 두 시나리오의 `expectedOutput`과 같다.

### 4. 학습 순서 기대값과 e2e·빌드 테스트

- 대상: 4절의 순위·e2e·빌드 파일
- 현재: 전체 50개, `arrow-functions` 다음이 `array-index-length`
- 변경:
  - 개수 50 → 51, 마지막 '51번째', 검색 순위 `28,33,34,35,44,47` → `29,34,35,36,45,48`, pager 위치 28 이상 +1과 전체 51.
  - `arrow-functions`의 다음, `array-index-length`의 이전을 새 slug로 바꾸고 새 페이지 pager 검사를 추가한다(28 / 51).
  - `helpers.ts`에 `DEFAULT_PARAMETERS_PATH`, `DEFAULT_PARAMETERS_SIMULATOR_NAME = '매개변수 기본값 시뮬레이터'`. `a11y.spec.ts`에 페이지·전 단계 axe 2개, `responsive.spec.ts`에 가로 스크롤 2개, `build-output.test.ts`에 프리렌더 블록 추가.
- 이유: order 255로 뒤 개념 23개의 위치가 밀린다.
- 주의사항: 기존 케이스는 값만 고친다. `-g` 패턴에 테스트 이름이 잡히게 이름에 `매개변수 기본값`을 넣는다.
- 완료 조건: `grep -rnE '/ 50\b|toHaveCount\(50\)|50번째|toBe\(50\)' tests app`이 0건. 6절의 e2e 명령 통과.

### 5. 역방향 링크와 낡은 문구

- 대상: 4개 `meta.ts`, `promise/scenarios.ts`
- 현재: '별도 개념' 또는 '다루지 않습니다'
- 변경:
  - `function-calls/meta.ts:75`: 뒤에 '세부 과정은 매개변수 기본값 개념에서 다룹니다' 취지로 바꾼다.
  - `tdz/meta.ts:77`: 기본값 매개변수만 '매개변수 기본값 개념'으로. class는 그대로.
  - `arrow-functions/meta.ts:83`: '매개변수 기본값은 매개변수 기본값 개념에서 다룹니다.'
  - `spread-destructuring/meta.ts:110`: 마지막 절을 '매개변수 기본값 개념에서 다룹니다.'로.
  - 네 페이지 `related`에 `default-parameters`를 추가한다. 단 order 규칙은 `prerequisites`에만 적용되므로 영향 없다.
  - 네 페이지의 `content.mdx`에서 기본값을 별도 개념으로 언급한 문장을 전수 확인해, 있으면 `[매개변수 기본값](/concepts/default-parameters)` 링크로 바꾼다.
  - `promise/scenarios.ts:65`: `'Job을 호스트가 언제 처리하는지는 마이크로태스크 큐 개념에서 다룹니다.'`
- 이유: 사용자 결정. 낡은 문구는 이미 나온 개념을 '작성 예정'이라고 말한다.
- 주의사항: `reviewedAt` 유지. 단순화 목록의 의미는 그대로다.
- 완료 조건: `npm test` 통과, `grep -n '작성 예정' app/concepts/promise/scenarios.ts` 0건, 4개 meta의 `related`에 slug 존재.

### 6. 문서와 전체 검증

- 대상: `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch25-37.md`
- 변경: e2e 경로 목록에 `default-parameters` 추가. 로드맵 보류 목록의 26장 항목에 완료 표시와 진행 기록 한 줄.
- 이유: 문서를 현재 상태와 맞춘다.
- 완료 조건: 6절의 명령과 브라우저 시나리오 모두 통과.

## 변경 이력

- 2026-11-06 (사용자 콘텐츠 검토): 예제 5에 바깥 `a`, `b`를 추가(줄 번호 +2, 출력 동일)해 초기화 전과 '없는 이름'을 구분. 흔한 오해 제목에 조건 추가, 본문 함수 선언·`let`·`const`·클래스도 보이지 않는다는 문장 추가(렉시컬 레코드는 strict에서 var 레코드라 한정), 예제 8의 시점 표현, 이름 중복 조건, 호출식 표현, 익명 함수 한정, `let` 규칙의 범위 수정. 퀴즈 12개의 보기 순서를 섞음 — 영향 단계 1, 2.
- 2026-11-06 (사용자 콘텐츠 검토): 학습 목표 4번에 '매개변수 목록에 식이 있을 때' 조건 추가 — 영향 단계 2.

## 구현 진행

- baseline (2026-11-06, `53d8454`): lint 0, format:check 통과, typecheck 0, `npm test` 137파일 4205개 통과. `test:build`·e2e는 미실행(새 페이지 추가 뒤 실행).
- 참고: 2026-11-06 11:49에 같은 폴더의 다른 세션이 9개 개념 `meta.ts`에 `try…catch` 단순화 문구를 추가하고 있다. 이 작업이 아니므로 건드리지 않고, 커밋할 때 이 작업의 변경만 스테이징한다. `arrow-functions/meta.ts`는 양쪽이 고치는 파일이다.
- [x] 1. 예제와 메타데이터 — 예제 12개가 초안과 바이트 동일, `examples`·`content-integrity`·`concept.test` 1096개 통과, MDN 링크 200.
- [x] 2. 본문 — `test:build` 411개 통과. 메인 검토로 직접 eval NOTE의 대상, LexicalEnvironment 표시 단순화, 넘긴 인수에 한정된 arguments 매핑을 바로잡음. `f()`에서 `arguments[0]`이 undefined인 경계 테스트 추가.
- [x] 3. 시뮬레이터 — 시나리오 1은 11단계, 2는 12단계(`get()` 호출과 `console.log` 출력을 나눔). `get` 호출 중 `lexicalEnv`는 null(화면에 '그리지 않음'). 메인 검토로 설명 세 곳 수정.
- [x] 4. 학습 순서 기대값과 e2e·빌드 테스트 — 잔여 grep 0건, `navigation.spec` 16개, `-g` 범위 14개 통과.
- [x] 5. 역방향 링크와 낡은 문구 — meta 4곳, 본문 3곳(arrow-functions 1, spread-destructuring 2), `related` 4곳, `promise/scenarios.ts`. `reviewedAt` 유지.
- [x] 6. 문서와 전체 검증 — lint·format·typecheck 통과, `npm test` 140파일 4273개, `test:build` 411개. 브라우저(375px, 다크): 두 시나리오 진행, `get()` 탐색 경로, var 레코드만 '바뀜', 가로 스크롤 없음, 콘솔 오류 없음.
- 리뷰 1차(메인 + Opus 명세 대조): 코드·테스트 결함 없음. 명세 대조 11건을 원문으로 재확인해 모두 반영. 주요 내용: 매개변수 레코드의 `arguments` 바인딩 누락, `get` 호출 레코드 생략 이유, 매개변수 레코드를 나누는 이유(직접 eval), 필수 인수 패턴의 조건(값이 `undefined`), 학습 목표의 TDZ 범위. 경계 테스트 3개 추가.
- 재검증: lint·format·typecheck 통과, `npm test` 4276개, `test:build` 411개, `navigation.spec` 16개, `-g` 범위 14개 통과.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 달라진 점: 시나리오 2는 `get()` 호출과 `console.log` 출력을 나눠 12단계, 예제 5는 사용자 검토로 바깥 `a`·`b`를 추가해 줄 번호가 2 밀렸고, 퀴즈 보기 순서를 섞었다(`변경 이력`).
- 사용자 콘텐츠 검토 승인으로 `reviewedAt`을 2026-11-06으로 기록했다. 문구만 바꾼 기존 4개 페이지의 `reviewedAt`은 유지했다.

### 코드 리뷰

- 코드·테스트 결함은 없었다. Opus 명세 대조 11건과 사용자 검토 8건을 실행·원문으로 확인해 모두 반영했다. 남겨 둔 항목은 없다.

### 후속 작업

- [ ] `block-scope`·`scope-chain`·`typeof-operator`의 퀴즈 보기 섞기는 별도 세션이 끝냈고 커밋은 대기 중이다.
- [ ] 다른 세션이 추가한 `try…catch` 단순화 문구 9줄은 이 커밋에 없다. 그 세션에서 커밋한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 명세 대조 지적 11건을 낮음 등급까지 모두 고쳤다. 스킬 기본은 낮음을 보고만 하는 것이지만, 이 프로젝트는 결과가 맞아도 명세와 다른 서술을 심각하게 보므로 문구 수정으로 처리했다.
- [Claude 판단] 시뮬레이터에서 `get` 호출 중 `lexicalEnv`를 null로 두고 화면에 '그리지 않음'으로 적었다. 대안은 호출 레코드를 그리는 것인데, 찾는 이름 `x`가 없는 레코드가 그림만 늘린다.
- [Claude 판단] 사용자 검토 3번의 제안 문장을 그대로 쓰지 않고 렉시컬 레코드에 'strict mode에서는 본문 var 레코드'를 덧붙였다. strict에서는 `lexicalEnv`가 `variableEnv`와 같기 때문이다.
- [무검토 승인] 레코드 분리와 arguments·`'use strict'` 규칙을 두 조건(ContainsExpression, IsSimpleParameterList)으로 나눠 설명했다. '기본값이 있으면'으로 묶으면 `(a, ...r)`에서 틀린다.
- [무검토 승인] 예제를 sloppy mode로 두고 그림은 레코드 두 개만 그렸다. strict로 맞추면 단순화는 없어지지만 '함수 안 `'use strict'` 금지'와 혼동된다.
- [무검토 승인] 배열 대신 객체 리터럴로 호출마다 평가를 보였다. order 255가 27장 배열보다 앞이기 때문이다.
- 다룰 주제 7개, 환경 레코드 시뮬레이터, order 255, 역방향 링크를 이번에 처리하는 것은 사용자가 정했다.

#### 배경지식

- FunctionDeclarationInstantiation은 sloppy이고 식이 있으면 매개변수 레코드, 본문 var 레코드, 렉시컬 레코드를 만들고, 함수 환경 레코드는 그보다 앞서 호출 준비 단계에서 만들어진다.
- 함수의 `[[Environment]]`는 평가 시점의 LexicalEnvironment다. 기본값은 매개변수 초기화 중에 평가되므로 본문 var 레코드를 가리킬 수 없다.
- `arguments` 바인딩은 매개변수 초기화 전에 매개변수 레코드에 만들어진다. 매핑된 arguments는 sloppy이고 목록이 단순할 때만, 넘긴 인수에 대해서만 쓰인다.
- 스크립트의 조기 오류는 실행 전에 나므로, 예제 11은 `new Function`으로 컴파일 오류를 실행 중에 잡았다.

#### 확인 질문

1. `(a, ...r)`와 `(a = 1)`은 본문 `var`와 `arguments`에서 각각 어떻게 다른가?
   <details><summary>답</summary>둘 다 단순하지 않아 arguments 연결이 끊기고 함수 안 'use strict'는 SyntaxError다. 하지만 rest만 있으면 식이 없어 본문 var는 매개변수와 같은 레코드를 쓰고, `(a = 1)`은 식이 있어 본문 var 레코드가 분리된다. 근거: `content.mdx`의 두 조건 비교표, `concept.test.ts` 본문 주장.</details>
2. 예제 5에 바깥 `var a`, `var b`를 넣은 이유는 무엇인가? 넣지 않으면 어떤 틀린 설명을 구분하지 못하는가?
   <details><summary>답</summary>바깥에 이름이 없으면 '선언되지 않아 바깥에서 찾다가 실패했다'는 틀린 모델도 ReferenceError를 낸다. 바깥에 같은 이름이 있어도 오류가 나야 매개변수 바인딩이 먼저 만들어져 가린다는 것이 드러난다. 근거: `examples/parameter-tdz.js`, 계획 변경 이력.</details>
3. 예제 8에서 `var x;`가 있을 때와 없을 때(예제 9) `get()`의 결과가 왜 다른가?
   <details><summary>답</summary>`var x`가 있으면 본문 var 레코드에 별도 바인딩이 생겨 매개변수 값으로 초기화되고 대입은 그 바인딩만 바꾸므로 `get()`은 `arg`다. 없으면 본문의 `x`가 매개변수 바인딩 자체라 대입이 그대로 보여 `body`다. 근거: `examples/same-name-var.js`, `examples/no-body-var.js`.</details>
4. 시뮬레이터가 네 레코드 중 일부만 그려도 되는 근거는 무엇이고, 그 대가로 어디에 무엇을 밝혔는가?
   <details><summary>답</summary>생략한 함수 환경 레코드와 렉시컬 레코드에는 예제에서 찾는 이름이 없어 탐색 결과가 같다. 대신 본문과 `meta.simplifications`에 네 레코드, LexicalEnvironment 표시, 매개변수 레코드의 `arguments` 생략을 밝혔다. 근거: `meta.ts` simplifications.</details>
5. 필수 인수 패턴을 '인수가 빠진 호출을 잡는다'고 쓰면 왜 틀리는가?
   <details><summary>답</summary>조건은 인수 유무가 아니라 값이 undefined인지다. `greet(undefined)`도 기본값 식을 평가해 던진다. 근거: SingleNameBinding, `concept.test.ts`의 필수 인수 테스트.</details>
