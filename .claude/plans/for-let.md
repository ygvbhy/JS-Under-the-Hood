# 추가 게시글 'for 문의 let' 구현 계획

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `e00aa93`

## 0. 요약

- 목적: 추가 게시글(15장 + 24장 클로저 이후) `/concepts/for-let`을 추가한다. `for (let …)`은 반복마다 새 선언적 환경 레코드를 만들고 그 바인딩을 직전 반복의 값으로 초기화(CreatePerIterationEnvironment)하기 때문에, 본문에서 만든 함수가 반복마다 다른 `i`를 가리킨다는 것을 예제 8개, 퀴즈, 환경 레코드 시뮬레이터(시나리오 3개)로 보인다. 사용자 결정: 새 바인딩을 만드는 시점, var 해결(본문 안 let), for 머리의 const, 초기화식 안 클로저, for…in만 짧게, 시뮬레이터.
- 범위: 새 개념 폴더 1개(category `execution`, order 220), e2e(helpers·a11y·responsive 추가, navigation 개수·마지막 개념 갱신), 빌드 테스트 추가, content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 21개 파일은 바꾸지 않는다.
- 위험: "값을 복사해 캡처한다"로 설명하는 것 → 명세 동작(새 바인딩을 만들고 직전 값으로 초기화, 함수는 바인딩이 있는 레코드를 가리킴)으로만 쓰고, 예제 3·4(새 바인딩 이후 변경)로 반례를 보인다. 시뮬레이터 상태는 구조 테스트(바깥 연결·도달 가능성·탐색 재계산)와 실제 실행 탐침으로 막는다.
- 복잡도: 중간 · Consensus: 생략. closure의 상태 모델·화면을 개념 폴더에 복사해 줄이는 기존 패턴이고 공통 코드 변경이 없다. 명세 원문과 vm 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 추가 게시글 "for 문의 let: 반복마다 새 바인딩"을 새 개념 페이지로 만든다(로드맵 `concept-roadmap-ch13-24.md` 추가 게시글 후보, 사용자 선택 2026-10-30).
- 다룰 내용(사용자 결정 2026-10-30):
  - ① 기본: `for (var …)`에서 만든 함수들은 모두 `3`, `for (let …)`이면 `0 1 2`. 반복마다 새 선언적 환경 레코드가 생긴다.
  - ② 새 바인딩을 만드는 시점: 본문을 실행한 뒤, 증가식을 평가하기 전. 본문에서 `i`를 바꾸면 그 반복의 함수는 바뀐 값을 보고(예제 3), 함수가 자기 반복의 `i`를 바꿔도 다른 반복의 바인딩에는 영향이 없다(예제 4).
  - ③ var 해결: `for (var …)` 본문 안의 `let`(본문 블록이 반복마다 새 레코드를 만든다). `while` 본문도 같다는 한 줄.
  - ④ for 머리의 `const`: 반복마다 새로 만드는 목록에 들어가지 않아 첫 반복 뒤 증가식에서 TypeError.
  - ⑤ 초기화식 안의 클로저: 머리 레코드를 가리켜 계속 `0`(본문 한 줄 + 예제).
  - ⑥ for…in만 짧게: 반복마다 새 레코드에 머리의 `let`·`const`를 만든다(그래서 `const`도 된다). for…of는 별도 개념으로만 언급.
- 시각화: 환경 레코드 시뮬레이터(closure 그림을 줄여 전역 코드만, LexicalEnvironment 표시 + 머리·반복·본문 블록 레코드 + 함수 객체의 [[Environment]]).

### 유지해야 하는 기존 동작

- 기존 개념 21개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일은 수정하지 않는다(역방향 연결은 사용자 결정으로 나중에 일괄).
- 홈 `객체` 검색 6건·순위 `['1','9','16','17','18','19']`(`tests/e2e/navigation.spec.ts:17,91,97`) 유지 — title·summary·tags에 '객체'(예: '함수 객체')를 쓰지 않는다. 검색 필드는 title·summary·tags다(`app/lib/concepts.ts:72-78`).
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위

- for…of·for await…of(34장 이후), 구조 분해 머리, `using` 선언
- 즉시 실행 함수로 var 문제를 푸는 방법 — 추가 게시글 후보 "즉시 실행 함수·모듈 패턴"
- 배열(27장) — 함수 모음은 숫자 키 객체(`fns[i]`)로 만든다
- `continue`·`break`·레이블과 반복별 레코드의 관계
- 엔진의 실제 메모리 구조·최적화
- 기존 페이지(block-scope·tdz·closure)의 "별도 개념" 문구를 이 페이지 링크로 바꾸는 것

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안, 2026-10-30 내려받아 확인)

- ForLoopEvaluation(`#sec-runtime-semantics-forloopevaluation`), `for ( LexicalDeclaration …)`: 지금 LexicalEnvironment(oldEnv)를 바깥으로 하는 loopEnv를 NewDeclarativeEnvironment로 만들고, 머리의 이름마다 `const`면 CreateImmutableBinding(strict true), 아니면 CreateMutableBinding을 만든 뒤 LexicalEnvironment를 loopEnv로 바꾸고 LexicalDeclaration을 평가한다. `isConst`가 false면 perIterationLets = 머리의 이름들, true면 빈 목록. ForBodyEvaluation이 끝나면 LexicalEnvironment를 oldEnv로 되돌린다.
- `for ( var …)`와 `for ( Expression ; …)`은 ForBodyEvaluation에 빈 목록 `« »`을 넘긴다(반복별 레코드 없음).
- ForBodyEvaluation(`#sec-forbodyevaluation`): 첫 반복 전에 CreatePerIterationEnvironment를 한 번 수행. 그다음 반복: test 평가(거짓이면 끝) → stmt 평가 → CreatePerIterationEnvironment → increment 평가.
- CreatePerIterationEnvironment(`#sec-createperiterationenvironment`): 목록이 비어 있지 않으면 lastIterationEnv = 지금 LexicalEnvironment, outer = lastIterationEnv.[[OuterEnv]]로 thisIterationEnv를 만들고, 이름마다 CreateMutableBinding 후 lastIterationEnv의 값으로 InitializeBinding, LexicalEnvironment를 thisIterationEnv로 바꾼다. → 첫 반복 레코드의 바깥은 loopEnv가 아니라 loopEnv의 바깥(for 문 바깥)이고, 이후 반복 레코드도 같다. 첫 test부터 반복 레코드 안에서 평가된다.
- Block 평가(`#sec-block-runtime-semantics-evaluation`): `{ }`(빈 블록)은 아무것도 안 함. 문장이 있는 블록은 실행할 때마다 NewDeclarativeEnvironment(oldEnv)를 만들고 블록이 끝나면 oldEnv로 되돌린다. → `for` 본문 `{ … }`도 반복마다 새 레코드(선언이 없으면 빈 레코드)를 만들고, 본문의 함수 식은 이 블록 레코드를 [[Environment]]로 갖는다.
- ForIn/OfBodyEvaluation(`#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset`), lexical-binding: 반복마다 iterationEnv = NewDeclarativeEnvironment(oldEnv)를 만들고 ForDeclarationBindingInstantiation(`#sec-runtime-semantics-fordeclarationbindinginstantiation`)으로 `const`면 불변, `let`이면 가변 바인딩을 만든 뒤 그 반복의 키로 초기화한다.
- const 재할당 TypeError: 선언적 환경 레코드 SetMutableBinding(`#sec-declarative-environment-records-setmutablebinding-n-v-s`) — block-scope가 이미 이 링크로 설명(`app/concepts/block-scope/meta.ts:130`).
- MDN ko 200 확인: `Statements/for`, `Statements/let`, `Statements/for...in`. closure 페이지의 MDN 클로저 가이드(`app/concepts/closure/meta.ts`)에 반복문 클로저 절이 있다(구현 단계 1에서 내용 재확인).

### 사실 (vm 실행 — Node v24.22.1, `runInNewContext`, 스크래치패드에서 실행)

| 예제(가칭) | 출력 |
| - | - |
| var-loop: `for (var i…) fns[i] = function () { return i; }` → `fns[0](), fns[1](), fns[2]()` | `3 3 3` |
| let-loop: 같은 코드, `let` | `0 1 2` |
| copy-timing: `i < 4`, 본문에 함수 만든 뒤 `i++` → `fns[0](), fns[2]()` | `1 3` |
| own-binding: `add[i]`(i += 10)·`get[i]`, `i < 2`, `add[0]()` 뒤 `get[0](), get[1]()` | `10 1` |
| inner-let: `for (var i…) { let n = i; fns[i] = function () { return n; }; }` + `i` | `0 1 2 3` |
| const-head: `for (const i = 0; i < 3; i++) { count++; }` try/catch → `e.name, count` | `TypeError 1` |
| init-closure: `for (let i = 0, first = function () { return i; }; i < 3; i++) { read = first; }` → `read()` | `0` |
| for-in: `for (const key in user)` → `byLet.name(), byLet.city()` / `for (var k in user)` → `byVar.name() === byVar.city()` | `name city` / `true` |
| 본문 주장 근거: `'use strict'` 버전 var/let | `3 3 3` / `0 1 2`(차이 없음) |
| 본문 주장 근거: `while` 본문 `let n = k` | `0 1 2` |
| 본문 주장 근거: 첫 test에서 만든 함수(`(first = first \|\| function () { return i; }, i < 3)`) | `0` |
| 본문 주장 근거: `for (let i…)` 뒤 `typeof i` | `undefined` |
| 본문 주장 근거: `for (const i = 0; i < 1; ) { …; break; }` (증가식 없음) | 오류 없음 |

- for-in의 var 쪽은 키 열거 순서에 기대지 않도록 `===`로 비교한다(두 함수가 같은 바인딩 `k`를 가리켜 같은 값).

### 사실 (코드에서 확인)

- 개념 추가 절차·meta 필드·e2e 등록 규칙: `docs/content-guide.md`.
- 가장 가까운 참고 구현: `app/concepts/closure/` — 상태 모델 `scenarios.ts:6-91`(stack·envs·functions·lookup, 도달 가능성으로 레코드 제거, `retained`), 화면 `ClosureView.tsx`(EnvItem·BindingRow·LookupBox·holders), 래퍼 `Simulator.tsx`, 테스트 `concept.test.ts`(시나리오 표·구조 재계산·탐침 `:672-921`), `Simulator.test.tsx`, `ClosureView.test.tsx`.
- 개념 간 공유 부품은 `app/simulator/`뿐(AGENTS.md 시뮬레이터 규칙) → ClosureView를 import하지 않고 복사해 줄인다.
- e2e 등록: `tests/e2e/helpers.ts:40-41`(CLOSURE_PATH·SIMULATOR_NAME), `a11y.spec.ts:639-684`(페이지·전 단계 axe·특정 단계), `responsive.spec.ts:575-603`(가로 스크롤 2개). a11y 전 단계 루프 상한은 시나리오 단계 수 이상이어야 한다(`a11y.spec.ts:658`).
- `tests/e2e/navigation.spec.ts`: 학습 순서 개수 21(`:78`, `:122`), 마지막 카드 '21번째'·클로저 제목(`:83-87`), 마지막 개념 pager `closure` '21 / 21'·링크 1개(`:155-160`). 새 개념(order 220)이 마지막이 되므로 이 기대값은 반드시 바뀐다.
- 빌드 테스트: `tests/build/build-output.test.ts:701-726`(closure 시뮬레이터 프리렌더). pager 테스트(`:728-`)는 레지스트리에서 자동 계산.
- block-scope `for-loop.js`는 for 문 밖에서 `i`·`j`가 보이는지만 다룸(`app/concepts/block-scope/meta.ts:90` 단순화에 "반복마다 새로 만들어지지만 … 별도 개념").

### 추정

- 없음

## 3. 구현 전략

- 콘텐츠 축: "for 문의 평가 순서"를 명세 순서대로 한 문단씩 — ① 머리 레코드 ② 첫 반복 전 새 레코드 ③ 반복: 조건 → 본문(본문 블록 레코드) → 새 반복 레코드(직전 값으로 초기화) → 증가식. 결과는 "함수가 어느 레코드를 [[Environment]]로 가리키는가"로 설명한다(closure 페이지와 같은 설명 틀).
- 용어: 원인 설명에 "복사"를 쓰지 않는다. "새 레코드에 같은 이름의 바인딩을 만들고 직전 반복 레코드의 값으로 초기화한다"로 쓴다. 이 시점 이후 두 바인딩은 따로 바뀐다(예제 3·4).
- 함수 모음은 배열 대신 숫자 키 객체 `const fns = {}; fns[i] = …`(property-keys에서 다룬 키 변환, 배열은 27장).
- 시뮬레이터: closure 모델에서 함수 실행 컨텍스트 스택을 빼고 전역 실행 컨텍스트 하나의 LexicalEnvironment 표시만 남긴다. 레코드 종류에 `loop`(머리)·`iteration`(n번째 반복)·`block`(n번째 본문 블록)을 둔다. 함수 호출 단계는 컨텍스트·함수 환경 레코드(바인딩 없음)를 그리지 않고 이름 탐색을 그 함수 객체의 [[Environment]]부터 보여 준다(단순화 ①).
- 버린 대안
  - ① 표 + 퀴즈만: 사용자 결정(시뮬레이터).
  - ② 본문 블록 레코드 생략: 명세상 문장이 있는 블록은 반복마다 레코드를 만들고 함수의 [[Environment]]는 그 블록 레코드다. 생략하면 그림이 명세와 달라지고, var 해결(본문 안 let)과도 이어지지 않는다 → 그린다(바인딩 없음 표시).
  - ③ closure의 `ClosureView` import 재사용: 시뮬레이터 규칙 위반 → 복사해 줄인다.
  - ④ 시나리오에 inner-let·const·init-closure 추가: 단계 수와 e2e 비용이 커진다 → 예제·퀴즈·본문으로 다루고 시뮬레이터는 핵심 3개.

## 4. 변경 파일

- 추가 `app/concepts/for-let/`
  - `meta.ts`, `content.mdx`, `route.tsx`(closure 템플릿 그대로)
  - `examples/`: `var-loop.js`, `let-loop.js`, `copy-timing.js`, `own-binding.js`, `inner-let.js`, `const-head.js`, `init-closure.js`, `for-in.js`
  - `scenarios.ts`, `ForLetView.tsx`, `Simulator.tsx`
  - `concept.test.ts`, `Simulator.test.tsx`, `ForLetView.test.tsx`
- 수정
  - `tests/e2e/helpers.ts`: `FOR_LET_PATH`, `FOR_LET_SIMULATOR_NAME` 추가
  - `tests/e2e/a11y.spec.ts`: 페이지 axe, 시뮬레이터 전 단계 axe, 특정 단계(반복 레코드 "남아 있음") 케이스 추가
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 2개 케이스 추가
  - `tests/e2e/navigation.spec.ts`: 개수 21→22, 마지막 카드 '22번째'·새 제목, pager 마지막 개념 검사를 `for-let`('22 / 22', 이전 = closure)으로 바꾸고 closure는 링크 2개(이전 execution-context, 다음 for-let)로 — 개념 추가로 기대값 자체가 바뀌는 기존 케이스
  - `tests/build/build-output.test.ts`: for-let 시뮬레이터 프리렌더 describe 추가
  - `docs/content-guide.md`: 9단계 e2e 대상 목록에 `for-let` 추가
  - `.claude/plans/concept-roadmap-ch13-24.md`: 추가 게시글 후보 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/`, `app/routes.ts`, 기존 개념 폴더 21개(역방향 연결은 나중에 일괄)

## 5. 위험 요소

- "값 복사·캡처" 오개념 → 3절 용어 규칙, 오해 Callout, 예제 3·4. 메인이 본문 대조(단계 5).
- 반복 레코드의 바깥을 머리 레코드로 그리는 실수(명세는 머리 레코드의 바깥) → `concept.test.ts`에서 `iteration` 레코드의 `outerId`가 `global`인지 검사, 머리 레코드는 첫 반복 레코드 생성 단계에서 그림에서 빠짐(도달 불가) 검사.
- 첫 test가 머리 레코드에서 평가된다고 쓰는 실수 → 첫 test 단계의 탐색 경로가 `iter1`에서 시작하는지 검사, 본문 주장 근거 테스트(첫 test에서 만든 함수 → 0).
- 새 반복 레코드 생성과 증가식을 한 단계로 합쳐 시점이 흐려짐 → 시나리오에서 별도 단계(단계 2 표).
- 시나리오 값이 실제와 다름 → 탐침(test 시점의 `i` 값 순서)과 마지막 출력 대조.
- 단계 수 초과로 a11y 루프가 마지막 단계에 닿지 않음 → 루프 상한을 최대 단계 수 + 여유로 두고 `toBeDisabled()`로 끝 확인.
- navigation.spec 기존 기대값 변경 누락 → 단계 6에서 수정, e2e로 확인.
- '객체' 검색 결과 변화 → title·summary·tags 금지어 검사(완료 조건).
- 15장 주제를 24장 개념(클로저)으로 설명 → order 220, prerequisites에 closure, 장 순서 규칙상 문제 없음(뒷장인 배열·for…of는 쓰지 않음).
- 375px에서 레코드 카드가 많아 넘침(let 시나리오 끝에 반복 레코드 3 + 블록 레코드 3 + 전역) → 한 열 배치, e2e 가로 스크롤, 브라우저 확인.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성: 예제 8개 출력(L1), 2절 vm 목록의 본문 주장 근거 테스트, 시나리오 불변식·구조 재계산·탐침, 퀴즈 정답 = expectedOutput, 정답 위치 분산.
- 브라우저(`npm run dev` 재시작 후 `/concepts/for-let`):
  1. 375px: 세 시나리오를 끝까지 넘겨 가로 스크롤 없음, 레코드 카드·함수 목록·탐색 상자가 읽힘.
  2. 다크 모드: "지금 실행 중"·"남아 있음"·"새로 생김" 배지와 강조가 텍스트로도 구분됨.
  3. 키보드: 시나리오 라디오 → 다음/이전 버튼 조작, 스크린 리더 안내(셸) 변경.
  4. let 시나리오 "새 반복 레코드" 단계: 새 `iter2`의 `i`가 직전 값, LexicalEnvironment 표시가 `iter2`, `iter1`은 남아 있음.
  5. JS 끔: 시뮬레이터 1단계와 퀴즈 `<details>` 정답이 보임.
  6. 홈 학습 순서 보기 22번째에 새 개념, closure 페이지 하단 '다음 개념' → for-let.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `app/concepts/for-let/meta.ts`, `route.tsx`, `examples/*.js` 8개
- 현재: 폴더 없음
- 변경:
  - 예제 8개를 2절 vm 표의 코드로 작성(파일 끝 줄바꿈 하나, `console.log`에는 원시 값만). 시나리오용 3개(var-loop, let-loop, copy-timing)는 첫 줄 `const fns = {};`, 2줄 `for (…) {`, 본문, 닫는 줄, 마지막 줄 `console.log(…)` 모양을 지킨다.
  - meta:
    - slug `for-let`, title `'for 문의 let: 반복마다 새 바인딩이 생기는 이유'`, category `execution`, order `220`
    - summary(160자 이하, '객체' 금지): for (let …)은 반복마다 새 환경 레코드를 만들고 직전 값으로 초기화해서, 본문에서 만든 함수가 반복마다 다른 i를 가리킨다는 내용
    - tags('객체' 금지): `for 문`, `for 루프`, `let`, `반복문`, `클로저`, `CreatePerIterationEnvironment`, `환경 레코드`, `for...in`, `var`, `반복마다 새 바인딩`
    - goals 4개: ① var와 let의 결과 차이를 반복별 환경 레코드와 [[Environment]]로 설명 ② 새 바인딩이 만들어지는 시점(본문 뒤·증가식 앞)으로 본문에서 바꾼 값의 결과 예측 ③ 머리의 const가 일반 for 문에서 TypeError가 되는 이유와 for…in에서는 되는 이유 구분 ④ var 반복문에서 본문 안 let으로 반복마다 다른 값을 쓰는 방법
    - prerequisites: closure, block-scope, execution-context(slug 포함)
    - related: `['closure', 'block-scope', 'execution-context']`
    - examples: 2절 표 출력 그대로(처음엔 `[]`로 두고 `npm test`로 확인 후 채움 — content-guide 3단계)
    - simplifications: ① 함수 호출이 만드는 실행 컨텍스트와 그 함수 환경 레코드(바인딩 없음)는 그리지 않고, 이름 탐색을 함수 객체의 [[Environment]]부터 보여 준다 ② 실행 컨텍스트는 전역 하나의 LexicalEnvironment만 표시(VariableEnvironment 등 생략, execution-context 단순화를 따름) ③ 어떤 곳에서도 닿지 않는 레코드는 그림에서 뺀다 — 명세는 메모리 회수 시점을 정하지 않고, 엔진이 반복마다 실제로 무엇을 만드는지는 결과가 같으면 구현의 몫이다(Conformance) ④ for…of·for await…of, 구조 분해 머리, using 선언, continue·break·레이블은 다루지 않는다(for…of는 별도 개념) ⑤ for…in 머리 식을 평가할 때 쓰는 별도 레코드는 생략 ⑥ 즉시 실행 함수로 var 문제를 푸는 방법은 별도 개념 ⑦ console.log 호출이 만드는 실행 컨텍스트는 생략
    - references(절 번호는 라벨에 쓰지 않음): Conformance, ForLoopEvaluation, ForBodyEvaluation, CreatePerIterationEnvironment, Block Evaluation, ForIn/OfBodyEvaluation, ForDeclarationBindingInstantiation, SetMutableBinding(선언적 환경 레코드) — 2절 앵커 / MDN ko `Statements/for`, `Statements/let`, `Statements/for...in`, `Guide/Closures`
    - reviewedAt `null`
- 이유: 모든 결과 주장의 근거를 먼저 고정한다.
- 주의사항: 예제 폴더는 포맷 제외. 링크는 실제로 열어 확인(MDN 클로저 가이드의 반복문 절 존재).
- 완료 조건: `npm test`에서 L1 8개 통과, content-integrity 통과(order 220 > prerequisites order, related slug 존재), summary 160자 이하, title·summary·tags에 '객체' 없음(`grep`).

### 2. 시나리오 상태 모델과 시나리오 3개

- 대상: `scenarios.ts`
- 현재: 없음
- 변경:
  - 상태 타입(파일 머리 주석에 규칙을 closure처럼 쓴다):
    - `ForLetState = { lexicalEnv: string | null; envs: EnvRecord[]; functions: FnObject[]; lookup: Lookup | null }` — `lexicalEnv`는 전역 실행 컨텍스트의 LexicalEnvironment(실행 전 null)
    - `EnvRecord = { id; kind: 'global' | 'loop' | 'iteration' | 'block'; label; outerId; bindings; objectBindings?; created?; retained? }` — id 규칙 `global`, `loop`, `iter{n}`, `block{n}`. global은 closure처럼 객체 칸(var)·선언적 칸(let·const) 두 칸. `retained`는 LexicalEnvironment의 바깥 연결에는 없고 함수 객체의 [[Environment]]에서만 닿는 레코드
    - `Binding`은 closure와 같음(`value` 표시 문자열, 초기화 전 null, `changed`)
    - `FnObject = { id; label; environmentId; heldBy }` — label `익명 함수(fns[0])`, heldBy `fns의 0 프로퍼티`
    - `Lookup = { name; start: 'context' | 함수 id; path; foundIn; part?; result }` — `start`가 함수 id면 경로는 그 함수의 environmentId부터
  - 그림에서 빼는 기준: 뿌리 = LexicalEnvironment에서 바깥 연결로 닿는 레코드 + 전역 바인딩이 가리키는 함수(전역 `fns`가 가리키는 값의 프로퍼티 포함). 그 함수의 environmentId에서 바깥 연결로 닿는 레코드는 남는다(`retained`). 닿지 않게 된 단계에서 뺀다.
  - 시나리오(label은 build·e2e 테스트에서 그대로 쓴다):
    1. `var: 함수들이 같은 i를 가리킴`(var-loop): 실행 전 → 전역 선언 처리(var i = undefined 객체 칸, fns 초기화 전) → fns 초기화 → 머리 `i = 0`(전역) → 반복마다 [test + 본문: block{n} 생성, 함수가 block{n}을 가리킴] → [증가식: 블록 끝남, block{n} 남아 있음, 전역 i 갱신] ×3 → test 거짓으로 끝 → 호출 3단계(탐색 block{n} → global 객체 칸, 결과 3). 마지막 단계 출력 `3 3 3`.
    2. `let: 반복마다 새 레코드`(let-loop): 실행 전 → 전역 선언 처리 → fns 초기화 → 머리(loop 레코드 생성, i = 0, LexicalEnvironment = loop) → 첫 반복 레코드(iter1, outer global, i = 0, loop은 그림에서 빠짐) → 1번째 test·본문(따로 둘 수도 합칠 수도 있으나 첫 반복은 test 단계를 따로 두어 탐색이 iter1에서 시작함을 보인다) → [새 반복 레코드: block 끝, iter{n+1} 생성·직전 값으로 초기화, LexicalEnvironment 교체, iter{n} 남아 있음] → [증가식: iter{n+1}의 i 갱신] → 2·3번째 반복은 test + 본문 한 단계 → test 거짓: 마지막 iter4는 그림에서 빠지고 LexicalEnvironment = global → 호출 3단계(block{n} → iter{n}, 결과 0·1·2). 20단계 이하.
    3. `새 바인딩은 본문 뒤, 증가식 앞`(copy-timing): let-loop 흐름 + 본문 안 `i++` 단계. 새 반복 레코드는 본문에서 바뀐 값으로 초기화됨을 보인다. 호출 2단계(결과 1·3). 20단계 이하.
  - 각 단계 `line`은 실제 평가 위치(머리·test·증가식은 2줄, 본문은 해당 줄, 호출은 마지막 줄). `created`·`changed`는 그 단계에서 생기거나 바뀐 것만.
- 이유: 페이지의 핵심 시각화이자 가장 틀리기 쉬운 부분.
- 주의사항: 설명 문구에 "복사" 금지(3절 용어). 레코드 바깥 연결은 명세대로(iteration → global, block → 그 시점 LexicalEnvironment). 함수 호출 단계에서 함수 레코드를 그리지 않는다는 점을 첫 호출 단계 설명에 한 번 밝힌다.
- 완료 조건: 단계 3의 `concept.test.ts`가 모두 통과, 각 시나리오 단계 수 ≤ 20.

### 3. 시나리오 테스트

- 대상: `concept.test.ts`
- 현재: 없음
- 변경(closure `concept.test.ts`를 본떠 이 모델에 맞게):
  - 시나리오마다 `assertScenarioInvariants(scenario, example, source)`
  - 구조: id 유일, outerId·environmentId·lexicalEnv가 envs에 있음, `iteration` 레코드 outerId = `global`, `block` 레코드 outerId는 직전 단계 LexicalEnvironment, `loop` 레코드는 첫 `iteration` 레코드가 생긴 단계부터 없음
  - 도달 가능성 재계산: 그림의 레코드 집합 = 뿌리에서 닿는 집합, `retained` 표시 = 함수로만 닿는 레코드
  - 탐색 재계산: `start`에서 outerId를 따라 처음 찾은 레코드·결과가 손으로 쓴 path·foundIn·result와 같음(전역은 선언적 칸 → 객체 칸 순)
  - 새 반복 레코드 단계: 새 레코드의 바인딩 값 = 직전 단계 LexicalEnvironment 레코드의 같은 이름 값, 그다음 단계(증가식)에서만 값이 바뀜
  - 탐침: 예제 원문의 test 식을 `(__probe(i), i < N)`으로 바꾼 소스를 vm으로 실행해 test 시점 `i` 값 순서를 얻고, 시나리오의 test 단계 탐색 결과 순서와 같은지 대조(탐침 소스의 출력 = 원본 출력)
  - 본문 주장 근거: 2절 vm 표의 "본문 주장 근거" 행 전부를 vm으로 실행해 검사
- 완료 조건: `npm test` 통과, 일부러 iter2의 outerId를 `loop`으로 바꾸면 실패함을 한 번 확인 후 되돌림.

### 4. 시각화 컴포넌트와 래퍼

- 대상: `ForLetView.tsx`, `Simulator.tsx`, `ForLetView.test.tsx`, `Simulator.test.tsx`
- 현재: 없음
- 변경:
  - `ClosureView.tsx`를 복사해 줄인다: 스택 목록 대신 "전역 실행 컨텍스트 — LexicalEnvironment: <레코드 이름>" 한 줄(실행 전이면 "실행 컨텍스트 없음 (실행 전)"), 레코드 카드(종류 라벨: 전역 / 반복 머리 / n번째 반복 / n번째 본문 블록, 바깥 레코드 이름, 바인딩, 배지 "지금 실행 중"·"남아 있음"·"새로 생김", 이 레코드를 [[Environment]]로 가리키는 함수), 바인딩이 없으면 "바인딩 없음", 탐색 상자(시작점이 함수면 "<함수 label>의 [[Environment]]부터"). 한 열 배치, `break-words`.
  - `Simulator.tsx`: `SimulatorShell`에 `label="for 문의 let 시뮬레이터"`와 `renderState={(state) => <ForLetView state={state} />}`.
  - 테스트: 첫 단계 텍스트, let 시나리오 새 반복 레코드 단계에서 "남아 있음"·LexicalEnvironment 표시, 바인딩 없음 표시, 함수 시작 탐색 표시.
- 주의사항: 색만으로 구분하지 않는다. closure의 클래스 토큰(`bg-highlight` 등) 그대로.
- 완료 조건: 두 컴포넌트 테스트 통과, typecheck·lint 통과.

### 5. 본문 `content.mdx`

- 대상: `content.mdx`
- 변경:
  - `## 동작 원리`: 문제 상황(var는 모두 3) → for (let …) 평가 순서 ①~③(2절 명세 사실 그대로, 반복 레코드의 바깥은 for 문 바깥) → 본문 블록도 반복마다 새 레코드 → 머리의 const는 반복마다 새로 만드는 목록에 없음 → for…in은 반복마다 새 레코드에 머리의 let·const를 만든다(for…of는 별도 개념 한 줄) → while 본문의 let도 블록 규칙으로 같다(한 줄) → 명세 모델과 엔진 구현 구분 한 줄
  - `## 예제`: 예제 1~8(`file=` 문법), PredictQuiz 3개 이상(예제 2 let-loop, 예제 3 copy-timing, 예제 6 const-head; 정답 위치 분산), `### 시뮬레이터로 확인하기` + `<Simulator scenarios={scenarios} />`(독립된 줄)
  - `## 결과와 이유`: 예제별 설명, 오해 Callout ① let은 반복마다 i의 값을 함수에 저장한다(→ 함수는 바인딩이 있는 레코드를 가리킴, 예제 4) ② for 문 전체에 let i가 하나만 있다(→ 머리 레코드 + 반복마다 새 레코드) ③ 증가식이 이전 반복의 i를 바꾼다(→ 새 레코드를 만든 뒤 평가) ④ const도 일반 for 문에서 반복마다 새로 만들어진다(→ for…in·for…of만) ⑤ 반복마다 레코드를 만드니 let 반복문은 항상 느리다/메모리를 쓴다(→ 명세는 결과만 정하고 구현은 엔진 몫, 단정하지 않음)
  - 본문에서 배열 대신 숫자 키 객체를 쓰는 이유 한 줄(property-keys 링크)
  - 링크: closure, block-scope, execution-context, property-keys
- 주의사항: 2절 사실만 쓴다. "복사" 금지. 오류 메시지 문자열 인용 없음. JSX 안 인라인 code 줄바꿈 주의(content-guide 4단계).
- 완료 조건: 메인이 본문을 2절과 문장 단위로 대조, `npm test`·`npm run build` 성공, 빌드 HTML에서 `<details` ≥ 3, 깨진 `**` 0, 공백 깨진 `<code>` 0(content-guide grep), 퀴즈 정답 = expectedOutput.

### 6. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경:
  - helpers 상수 2개, a11y 3케이스(closure 케이스 모양 그대로, 전 단계 루프 상한 22, 특정 단계는 let 시나리오의 첫 "새 반복 레코드" 단계에서 "남아 있음" 표시), responsive 2케이스, build-output describe(단계 1 텍스트, region aria-label, 시나리오 라벨 3개, radio ≥ 3, `<details` ≥ 1)
  - navigation.spec: 4절 내용대로 기대값 갱신
  - content-guide 9단계 목록에 `for-let`
  - 로드맵: 추가 게시글 후보의 "for 문의 let"을 진행 중으로, 진행 기록에 계획 승인·구현 한 줄
- 완료 조건: AGENTS.md 검증 순서 전체 통과(`lint && format:check && typecheck && test && test:build && e2e`), 6절 브라우저 1~6 확인.

## 변경 이력

- 2026-10-30 (구현 중 발견): 계획 4절 수정 목록에 없던 단위 테스트 2개가 "마지막 개념 = closure, 전체 21"을 고정하고 있어 `npm test` 4건 실패 → `app/lib/concepts.test.ts`(getAdjacentConcepts 첫·마지막 개념)와 `app/components/concept/ConceptPager.test.tsx`(첫·마지막 개념 pager)의 기대값을 전체 22·마지막 `for-let`(이전 closure)로 갱신. e2e에서도 `tests/e2e/responsive.spec.ts` '홈 학습 순서 보기: 가로 스크롤이 없다'가 카드 수 21을 고정해 desktop·mobile 2건 실패(가로 스크롤 문제 아님) → 22로 갱신. 저장소 전체 `grep`으로 남은 21 고정값 없음 확인.
- 2026-10-30 (사용자 요청 — 리뷰 Low 2건 + 외부 콘텐츠 검토 6건, 명세·vm으로 확인 후 반영): ① summary "직전 반복(첫 반복은 머리 레코드)의 값으로 i 바인딩 초기화"(137자) ② goals ③ "증가식에서 대입하는 일반 for 문에서는 TypeError" ③ 평가 순서 1번 "초기화식 `i = 0`을 평가" → 머리 선언 평가로 `i`를 0으로 초기화(InitializeBinding), 대입 아님 ④ 본문이 블록이 아닌 한 문장이면 본문 블록 레코드가 없고 함수의 [[Environment]]는 반복 레코드(let)·for 문 바깥(var), 결과 동일(vm: 0 1 2 / 3 3 3) 한 문장 ⑤ 명세 변수명 병기: loopEnv·thisIterationEnv·lastIterationEnv·blockEnv ⑥ sloppy mode 첫 등장에 "strict mode가 아닌 코드(흔히 sloppy mode, 명세 용어 non-strict code)" — new-operator·property-attributes 표기와 맞춤. 근거 테스트 2개 추가(블록 아닌 본문, const 머리 + break). 범위·접근 방식 변화 없음 — 영향 단계 1·3·5. navigation.spec과 같은 성격(개념 추가로 기대값 자체가 바뀜), 범위·접근 방식 변화 없음 — 영향 단계 6.

## 9. 추가 개선 후보

- 기존 개념 역방향 연결(사용자 결정: 나중에 일괄): block-scope 단순화(`meta.ts:90`), tdz 단순화(`meta.ts:79`), closure 단순화 ④·본문 50줄, block-scope·tdz 본문의 "for…in·for…of 머리의 const … 별도 개념" 문구.
- 남은 추가 게시글 후보: "전역 객체", "즉시 실행 함수·모듈 패턴".

## 구현 진행

- baseline (2026-10-30, `e00aa93`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 76파일 2293 통과 / `test:build` 182 통과 / e2e 327 통과·3 skipped(9.4m)
- [x] 1. 예제·meta·route — 예제 8개 실제 출력 = 2절 vm 표(`npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 422 통과), lint·typecheck·prettier 통과, summary 114자, `grep '객체\|복사' meta.ts` 0건, 예제 파일 끝 `\n` 하나(메인 `tail -c 2` 확인), MDN ko for·let·for...in·Guide/Closures 200(클로저 가이드에 '루프에서 클로저 생성하기' 절 있음, 메인 확인). `content.mdx`는 필수 h2만 있는 임시본(단계 5에서 교체).
- 단계 2 시나리오 세부(메인 결정, 위임 지시): 첫 반복은 조건·본문을 따로, 2번째 반복부터 '조건 … · 본문 실행' 한 단계(line 2–3). 조건 거짓 단계는 마지막 반복 레코드를 아직 LexicalEnvironment로 두고, 첫 호출 단계에서 전역으로 돌아가며 그 레코드가 빠진다. 갱신 단계(`i++`)의 탐색 결과는 갱신 뒤 값. 조건 단계 제목은 '조건'으로 시작(탐침 테스트가 사용). 단계 수: var 16·let 19·timing 17 예정.
- [x] 2. 시나리오 상태 모델과 시나리오 3개 — 단계 수 var 15·let 19·timing 17. 메인이 설명 문장 전부를 2절 명세와 대조(바깥 연결, 첫 조건식 위치, 새 레코드 시점, '복사' 미사용 `grep` 0건).
- [x] 3. 시나리오 테스트 — `npx vitest run app/concepts/for-let` 30 통과(메인 재실행). 변이 검사(iter2 outerId → 'loop') 6개 실패 확인 후 복원(위임 보고). 메인 수정: 본문 주장 테스트 하나의 이름이 모순("머리 레코드가 아니라 반복 레코드가 아닌 머리의 i")이고 검사가 머리·반복 레코드를 구분하지 못해(둘 다 0) — 첫 조건식에서 만든 함수가 `i += 10` 하면 반복 1번(반복 레코드), 초기화식 함수는 3번(머리 레코드)인 vm 검사로 교체.
- [x] 4. 시각화 컴포넌트와 래퍼 — `ForLetView.tsx`(ClosureView 복사·축소, closure import 없음), `Simulator.tsx`(label 'for 문의 let 시뮬레이터'), 컴포넌트 테스트 20개. `npx vitest run app/concepts/for-let` 50 통과·typecheck·lint 통과(메인 재실행). 탐색 경로 항목은 카드의 `data-env-id`와 섞이지 않게 `data-lookup-id`.
- [x] 5. 본문 `content.mdx` — 동작 원리 h3 7개, 예제 8개, 퀴즈 4개(예제 2·3·4·6, 정답 인덱스 1·3·2·0, 정답 = expectedOutput), Callout 5개. 메인이 문장 단위로 2절과 대조해 4곳 수정: 어색한 문장 1, `for (var …)`는 머리 레코드도 만들지 않는다는 점 추가, 4번째 반복 레코드가 2로 초기화된 뒤 증가식에서 3이 된다고 정확히, 예제 5의 마지막 인수 설명. `npm run build` 성공, HTML `<details` 4·`**` 0·공백 깨진 `<code>` 0·'복사' 0, 시뮬레이터 region 프리렌더 확인.
- [x] 6. e2e·빌드 테스트·문서 — helpers·a11y 3·responsive 2·build-output describe·navigation 기대값·content-guide·로드맵. 추가로 고정값 3곳 갱신(변경 이력). 전체 검증(메인 재실행, 2026-10-30): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 79파일 2363 통과 / `test:build` 190 통과 / e2e 343 통과·3 skipped(10.5m). 중간 e2e 1회는 실행 도중 4173 정적 서버가 내려가 모바일 약 68건이 `ERR_CONNECTION_REFUSED`(어서션 실패 아님) → e2e만 다시 실행해 전부 통과.
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0 · Low 2(보고만: meta summary "레코드를 … 초기화"는 엄밀히 바인딩 초기화, goals ③ "머리의 const는 TypeError"는 증가식 등 대입이 있을 때 — 본문은 정확히 씀). 계획 대비 차이: 퀴즈 4개(계획 ≥3), 고정값 테스트 3곳 추가 수정(변경 이력).
- 최종 검증(승인 뒤 수정 반영 후, 2026-10-30): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 79파일 2365 통과 / `test:build` 190 통과 / 빌드 HTML `<details` 4·`**` 0·깨진 `<code>` 0 / e2e 343 통과·3 skipped(9.4m).
- 브라우저 육안 확인(6절 1~6)은 e2e(375px 가로 스크롤·axe 다크·키보드 셸 테스트·프리렌더 `<details`)가 자동으로 덮는 부분 외에, 읽기 쉬움은 사용자 확인 항목(dev 서버 5173 실행 중).

## 구현 결과

### 계획 대비 실제 구현

- 계획 8절 1~6단계대로 구현했다. 달라진 점: 퀴즈 4개(계획 ≥3), 시나리오 단계 수 var 15·let 19·timing 17, 단계 구성 세부(첫 반복만 조건·본문 분리, 조건 거짓 단계에서 마지막 반복 레코드를 LexicalEnvironment로 유지)는 구현 중 메인이 정함.
- 계획에 없던 수정: 학습 순서 고정값 테스트 3곳(`app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `responsive.spec.ts` 홈 학습 순서 보기)을 전체 22·마지막 `for-let`으로 갱신(변경 이력).
- 승인 뒤 사용자 요청으로 리뷰 Low 2건 + 외부 콘텐츠 검토 6건 반영(변경 이력), 근거 테스트 2개 추가.

### 코드 리뷰

- critical-code-review 1차 Critical·High 0, Low 2건은 사용자 요청으로 수정. 위임 결과 중 본문 주장 테스트 1개(이름 모순, 머리·반복 레코드 구분 못 함)는 메인이 vm 검사로 교체, 본문 문장 4곳 메인이 명세 대조로 수정.

### 후속 작업

- [x] 사용자 콘텐츠 검토 후 `reviewedAt` 기록(2026-10-30 사용자 승인, `reviewedAt: '2026-10-30'`)
- [ ] 기존 개념 역방향 연결(block-scope·tdz·closure의 "별도 개념" 문구 → `for-let` 링크) — 사용자 결정으로 나중에 일괄
- [ ] 남은 추가 게시글 후보: "전역 객체", "즉시 실행 함수·모듈 패턴"

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터 단계 구성: 첫 반복은 조건과 본문을 따로 두고(첫 조건식이 이미 1번째 반복 레코드에서 평가됨을 보이려고), 2번째 반복부터 '조건 · 본문 실행'으로 합쳐 let 시나리오를 19단계(a11y 루프 상한 22 안)로 맞췄다. 조건이 거짓인 단계는 마지막 반복 레코드를 아직 LexicalEnvironment로 두고, 다음(첫 호출) 단계에서 전역으로 돌아가며 그 레코드를 뺀다 — 탐색 경로의 레코드가 그 단계 그림에 있어야 한다는 테스트 불변식 때문.
- [Claude 판단] 시나리오 검증 방식: 손으로 쓴 경로·retained·outerId를 상태에서 다시 계산해 대조하고, 예제의 조건식을 `(__probe(i), i < N)`로 바꿔 실제 실행의 조건 시점 i 값 순서를 '조건' 단계의 탐색 결과와 대조한다(`concept.test.ts`).
- [Claude 판단] 머리 레코드와 1번째 반복 레코드를 구분하는 근거 테스트: 둘 다 i가 0이라 값만으로는 구분되지 않으므로, 첫 조건식에서 만든 함수가 `i += 10` 하면 반복이 1번(반복 레코드), 초기화식에서 만든 함수면 3번(머리 레코드)인 것으로 검사한다.
- [무검토 승인] 본문 블록 레코드를 그린다: 문장이 있는 Block은 실행마다 NewDeclarativeEnvironment를 만들고 본문의 함수 식은 그 레코드를 [[Environment]]로 가진다. 생략하면 명세와 달라지고 var 해결(본문 안 let)과도 이어지지 않는다(3절 버린 대안 ②).
- [무검토 승인] 함수 호출의 실행 컨텍스트와 (바인딩 없는) 함수 환경 레코드는 그리지 않고 탐색을 [[Environment]]부터 보여 준다(단순화 ①), 배열 대신 숫자 키 객체 `fns[i]`(27장 전).
- 다룰 주제(새 바인딩 시점·var 해결·머리의 const·초기화식 안 함수), for…in만 짧게, 환경 레코드 시뮬레이터, 외부 검토 6건 반영 — 사용자 결정.

#### 배경지식

- ForLoopEvaluation: `for (let …)`는 loopEnv(머리 레코드)를 만들고 선언을 평가(InitializeBinding)한다. `const`면 perIterationLets가 빈 목록이다. `for (var …)`·머리가 식인 for 문은 ForBodyEvaluation에 빈 목록을 넘긴다.
- ForBodyEvaluation: 첫 반복 전에 CreatePerIterationEnvironment, 그 뒤 조건 → 본문 → CreatePerIterationEnvironment → 증가식을 반복한다.
- CreatePerIterationEnvironment: 새 레코드의 바깥은 lastIterationEnv.[[OuterEnv]](for 문 바깥)이고, 이름마다 새 바인딩을 만들어 직전 값으로 InitializeBinding한다.
- const 바인딩은 strict 플래그가 true로 만들어져 SetMutableBinding이 모드와 관계없이 TypeError를 던진다. for…in은 반복마다 새 레코드에 ForDeclarationBindingInstantiation으로 바인딩을 만들고 키로 초기화(대입 아님)해서 const가 된다.

#### 확인 질문

1. 1번째 반복 레코드의 바깥은 왜 머리 레코드가 아닌가? 그 결과 머리 레코드는 언제 그림에서 빠지는가?
   <details><summary>답</summary>CreatePerIterationEnvironment가 outer를 lastIterationEnv.[[OuterEnv]]로 잡기 때문이다. 첫 호출 때 lastIterationEnv는 머리 레코드이므로 새 레코드의 바깥은 머리 레코드의 바깥(for 문 바깥)이다. LexicalEnvironment가 1번째 반복 레코드로 바뀌는 순간 머리 레코드는 어디서도 닿지 않아 빠진다(초기화식에서 만든 함수가 있으면 그 함수를 통해 남는다). 근거: 2절, `scenarios.ts` '첫 반복 레코드' 단계, `concept.test.ts` loop 레코드 검사.</details>
2. 예제 3에서 본문의 `i++`는 `fns[0]`의 결과를 바꾸는데, 증가식 `i++`는 왜 바꾸지 않는가?
   <details><summary>답</summary>본문의 `i++`는 새 반복 레코드를 만들기 전에 실행되어 1번째 반복 레코드의 i를 바꾼다. 증가식은 CreatePerIterationEnvironment 뒤에 평가되어 새 레코드의 i를 바꾼다. 근거: ForBodyEvaluation 순서(2절), `copy-timing.js`, 시나리오 timing.</details>
3. [Claude 판단] 첫 조건식에서 만든 함수가 `i += 10`을 하면 반복이 1번으로 끝나고, 초기화식에서 만든 함수면 3번 도는 이유는?
   <details><summary>답</summary>첫 조건식은 이미 1번째 반복 레코드에서 평가되므로 거기서 만든 함수는 그 레코드의 i를 바꾸고, 다음 반복 레코드가 그 값(10)으로 초기화되어 조건이 거짓이 된다. 초기화식의 함수는 머리 레코드를 가리키므로 반복 레코드의 i에 영향이 없다. 근거: `concept.test.ts` 본문 주장 검증, 구현 진행 단계 3.</details>
4. 머리가 `const`인 일반 for 문은 언제 TypeError가 나고 언제 나지 않는가? for…in에서는 왜 const가 되는가?
   <details><summary>답</summary>perIterationLets가 비어 머리 레코드의 불변 바인딩 하나를 계속 쓰므로, 증가식(또는 본문)이 대입할 때 SetMutableBinding이 TypeError를 던진다. 대입이 없으면(증가식 없이 break) 오류가 없다. for…in은 반복마다 새 레코드에 새 바인딩을 만들어 초기화만 하므로 대입이 없다. 근거: 2절, `const-head.js`, 본문 '머리의 const'·'for…in' 절.</details>
5. [Claude 판단] 조건이 거짓인 단계에서 LexicalEnvironment를 왜 전역이 아니라 마지막 반복 레코드로 두었는가?
   <details><summary>답</summary>조건식은 마지막 반복 레코드에서 i를 찾으므로, 그 단계의 탐색 경로(['iter4'])가 그림에 있어야 한다(테스트가 경로의 레코드가 envs에 있는지 검사). for 문이 끝나 LexicalEnvironment가 돌아가는 것은 다음 단계에 반영한다. 근거: 구현 진행의 단계 2 세부, `scenarios.ts` '조건 i < 3: 거짓, for 문 끝'.</details>
