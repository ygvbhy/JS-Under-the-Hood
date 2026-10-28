# TDZ: let·const를 선언문보다 먼저 쓰면 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-28
- 기준: `main` @ `14abfcb`

## 0. 요약

- 목적: 로드맵(13~24장) 3번 `/concepts/tdz`를 추가한다. "`let`·`const`는 호이스팅되지 않는다"는 오해를 바로잡는다. 이름은 선언 처리(스코프에 들어갈 때) 때 초기화 전 상태로 이미 만들어지고, 선언문을 실행하기 전에 읽거나 대입하면 ReferenceError가 난다(TDZ). 이를 예제 6개(try…catch로 `e.name` 출력), 퀴즈, "TDZ" 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개(category `execution`)와 e2e·빌드 테스트 케이스 추가, `docs/content-guide.md` e2e 목록 1곳, 로드맵. 공통 코드와 기존 개념 13개는 바꾸지 않는다.
- 위험: 가림(shadowing) 예제에서 안쪽 블록의 초기화 전 이름 때문에 바깥 값을 찾지 않고 ReferenceError가 나는 경로를 잘못 그릴 수 있다. 또 try…catch(47장)를 앞서 쓰는 점이 위험이다. 앞의 것은 실제 실행 대조 테스트로, 뒤의 것은 본문 한 문단과 단순화로 막는다.
- 복잡도: 중간 · Consensus: 생략 (block-scope와 같은 구조이고, 공통 코드나 새 공통 패턴이 없다. 사실은 명세 원문과 vm·ESM·CJS 실행으로 미리 확인했다.)
- 미확정: 없음 (오류 표시 방식은 사용자 결정: try…catch)

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md`) 3번, 『모던 자바스크립트 Deep Dive』 15장 범위. 15장까지만 전제한다.
- 핵심:
  - ① `let`·`const` 이름도 코드를 실행하기 전(스코프에 들어갈 때)에 만들어지지만 초기화 전 상태다. 선언문이 실행될 때 값이 들어간다(초기값이 없는 `let`은 `undefined`).
  - ② 초기화 전인 이름을 읽거나 대입하면 ReferenceError다. `typeof`도 예외가 아니고, strict mode 여부와도 관계없다.
  - ③ 증거는 가림이다. 안쪽 블록의 `let`이 선언문보다 앞에서도 바깥 같은 이름을 가린다.
  - ④ TDZ는 코드의 위치가 아니라 실행 시점의 문제다. 선언문보다 위에 정의한 함수라도 선언문이 실행된 뒤에 호출하면 읽을 수 있다.
  - ⑤ `var`에 담은 함수 표현식을 미리 호출하면 TypeError, `const`면 ReferenceError다(hoisting 단순화 4와 본문 42행이 미룬 내용).
- 사용자 결정(2026-10-28): ReferenceError는 예제에서 `try { … } catch (e) { console.log(e.name); }`로 보여 주고, 시뮬레이터에도 오류 단계를 그린다. try…catch는 47장 내용이므로 본문에 짧은 설명을 두고 단순화에 "별도 개념"으로 밝힌다.

### 유지해야 하는 기존 동작

- 기존 개념 13개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일을 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 2개다(`tests/e2e/navigation.spec.ts:17`, `:32`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙(첫 렌더 = 프리렌더)을 지키고 `loader`를 두지 않는다.

### 제외 범위

- `class` 선언의 TDZ(25장)
- 기본값 매개변수의 TDZ(`function f(a = b, b)`)
- `for (let …)`의 반복마다 새 바인딩(추가 게시글 후보로 이미 대기 중)
- `using` 선언
- try…catch·오류 객체 자체(47장)
- 실행 컨텍스트·환경 레코드(9번)
- 스크립트가 여러 개일 때의 전역 `let`
- 모듈

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현은 `app/concepts/block-scope/`다.
  - `scenarios.ts:12-35`: `Val`(`uninitialized` 포함), `Binding`(`declaredBy`, `changed: created | initialized | updated`), `Scope`, `Lookup`, `BlockState`
  - `BlockView.tsx:48-70`: 초기화 전은 이름 + `초기화 전` 배지로 그린다.
  - `concept.test.ts`: `errorNameOf:15`, `probeAt:229`, `functionRanges:195`, ESM·CJS 비교 `:115-140`
  - 전역 선언 처리 단계는 `line`을 생략한다(`scenarios.ts:121-125`).
- 공통 코드:
  - `Step.line`은 범위 하나(`app/simulator/types.ts:6`)다.
  - `assertScenarioInvariants`는 코드 원문, 마지막 출력, 출력 누적, line 범위, 단계 수를 검사한다(`tests/helpers/scenario-invariants.ts`).
  - 예제 실행기는 잡히지 않은 예외가 나면 실패한다(`tests/helpers/run-example.ts:15`). 그래서 오류는 try…catch로만 보일 수 있다.
  - 기존 예제에는 try…catch가 없다(`grep catch app/concepts/*/examples` 결과 없음).
- 기존 개념이 TDZ를 미룬 곳(이 페이지가 이어받는다):
  - `hoisting/meta.ts` 단순화 4: TDZ, `const` 함수 표현식은 ReferenceError
  - `hoisting/content.mdx:42`
  - `block-scope/meta.ts` 단순화 3
  - `block-scope/content.mdx:10`("다음 개념에서 다루며")
  - `scope-chain/meta.ts:73`(예제 5를 `let`으로 바꾸면 ReferenceError)
- 필수 h2: `동작 원리`, `예제`, `결과와 이유`(`docs/content-guide.md:60`). e2e 목록은 `docs/content-guide.md:164`다.
- 명세(로컬에 저장한 tc39.es/ecma262 원문, 2026-10-28 확인):
  - 14.3.1 Let and Const Declarations NOTE: 변수는 담는 Environment Record가 인스턴스화될 때 만들어지지만, LexicalBinding이 평가되기 전에는 어떤 방식으로도 접근할 수 없다. 초기값이 없는 `let`은 LexicalBinding 평가 때 `undefined`가 된다.
  - 9.1.1.1.6 GetBindingValue: 바인딩이 초기화 전이면 strict와 관계없이 ReferenceError다.
  - 9.1.1.1.5 SetMutableBinding: 바인딩이 아직 초기화되지 않았으면 ReferenceError다. 이 검사는 immutable(TypeError) 검사보다 먼저 온다. 그래서 선언 전 `const`에 대입해도 ReferenceError다.
  - 13.5.3.1 typeof: IsUnresolvableReference일 때만 `"undefined"`를 돌려주고, 나머지는 GetValue를 거친다. 그래서 초기화 전 이름의 `typeof`는 ReferenceError다.
  - 14.15.3 TryStatement Evaluation: Block 결과가 throw completion이면 CatchClauseEvaluation을 한다. 14.15.2 CatchClauseEvaluation은 새 선언적 환경에 catch 매개변수를 만든다.
  - "TDZ"·"temporal dead zone"은 명세 본문에 정의된 용어가 아니다. 이 문자열은 ForIn/OfHeadEvaluation의 옛 앵커 id(`…-tdznames-…`)와 문법 생성 id에만 남아 있다.
  - 앵커 존재 확인: `sec-let-and-const-declarations`, `sec-let-and-const-declarations-runtime-semantics-evaluation`, `sec-declarative-environment-records-getbindingvalue-n-s`, `sec-declarative-environment-records-setmutablebinding-n-v-s`, `sec-declarative-environment-records-initializebinding-n-v`, `sec-typeof-operator-runtime-semantics-evaluation`, `sec-try-statement`, `sec-try-statement-runtime-semantics-evaluation`, `sec-runtime-semantics-catchclauseevaluation`, `sec-globaldeclarationinstantiation`, `sec-blockdeclarationinstantiation`, `sec-functiondeclarationinstantiation`
- 예제 초안 실제 출력(Node `vm` + `util.format`은 `runExample`과 같은 방식, `.mjs`·`.cjs`는 직접 실행):

  | # | 파일 | 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `let-before.js` | `ReferenceError` / `10` | 같음 | 같음 |
  | 2 | `typeof-tdz.js` | `undefined` / `ReferenceError` / `number` | 같음 | 같음 |
  | 3 | `shadow.js` | `ReferenceError` / `파랑` / `빨강` | 같음 | 같음 |
  | 4 | `time-not-place.js` | `ReferenceError` / `3` | 같음 | 같음 |
  | 5 | `assign-before.js` | `ReferenceError` / `undefined` / `5` | 같음 | 같음 |
  | 6 | `var-vs-const-fn.js` | `TypeError` / `ReferenceError` / `17` | 같음 | 같음 |

- 본문 근거로 쓸 vm 실행 결과(오류는 `e.name`):
  - `console.log(a); let a=1;` → ReferenceError
  - `typeof zz` → `'undefined'`
  - `a=2; let a=1;` → ReferenceError(sloppy, 암묵적 전역이 생기지 않음)
  - `let x=1; { console.log(x); let x=2; }` → ReferenceError
  - `let x=1; { console.log(x); }` → `1`
  - `function f(){return x} console.log(f()); let x=1;` → ReferenceError
  - `let x = x;` → ReferenceError
  - `function h(){ console.log(v); let v=1;} h();` → ReferenceError
  - `console.log(1); console.log(a); console.log(2); let a;` → `1` 출력 뒤 ReferenceError(실행 중 오류라 앞줄은 실행됨, early error와 다름)
  - `new C(); class C{}` → ReferenceError(범위 밖, 단순화에만)
- Chromium(Playwright)에서 예제 이름 `score`·`later`·`missing`·`color`·`show`·`count`·`total`·`cube`·`square`·`e`는 모두 `in window`가 아니다(`[]`).
- MDN ko `Statements/let`, `Statements/try...catch`는 200이다.

### 추정

- 없음

## 3. 구현 전략

- block-scope와 같은 구조로 개념 폴더를 만든다. 순서는 예제 → meta → 시나리오·실제 실행 대조 테스트 → 시각화 → 래퍼 → 본문 → e2e. slug는 `tdz`, category는 `execution`, 제목은 `'TDZ: let·const를 선언문보다 먼저 쓰면 어떻게 될까'`(hoisting 제목 '선언문보다 먼저 쓰면 어떻게 되나'와 짝), 시뮬레이터 label은 `'TDZ 시뮬레이터'`다.
- 상태(`TdzState`)는 block-scope 모양을 이 개념에 맞게 줄이고 넓힌다. 개념 간 공유는 금지라 복사해서 고친다.
  - `Val`: `string`·`number`·`function`·`uninitialized`. `undefined`는 예제 5가 시나리오가 아니므로 필요할 때만 넣는다.
  - `Binding`: `name`, `declaredBy: 'let' | 'const' | 'function'`, `value`, `changed?: 'created' | 'initialized'`. `var`·암묵적 전역·`onGlobalObject`는 이 시나리오에 없으므로 넣지 않는다.
  - `Scope`: block-scope와 같다(`global` | `function` | `block`).
  - `Lookup`: `name`, `purpose: 'read'`, `path`(지금 스코프부터 처음 찾은 곳까지), `error?: 'ReferenceError'`. 처음 찾은 이름이 초기화 전이면 `error`를 붙이고 경로는 거기서 멈춘다(바깥으로 계속 찾지 않는다).
  - `TdzState`: `{ scopes, currentId, lookup }`.
- 화면(`TdzView`): `BlockView`와 같은 2열(이름 찾기 / 스코프)이다. 찾기 패널은 `error`가 있으면 "찾음: <스코프> — 초기화 전 → ReferenceError"로 오류를 글자로 보인다(색만으로 구분하지 않는다). 이름 행은 선언 배지(`let`·`const`·`함수 선언`)와 `초기화 전` 배지를 단다. 변경 배지는 `새로 생김`·`값이 들어감`이다.
- 단계 구성:
  - 실행 전 → 전역 선언 처리(`line` 없음) → 실행
  - 블록은 "블록 진입"(블록 스코프 생성, 안의 `let` 초기화 전)과 "블록 끝"으로 그린다.
  - 함수 호출은 "이름 찾기"와 "호출 시작" 두 단계로 나눈다(scope-chain·block-scope와 같음).
  - 오류는 두 단계로 나눈다: ① 찾기 단계(`lookup.error`, 출력 없음) ② "catch 블록: `e.name` 출력" 단계(출력 추가, lookup 없음). 함수 안에서 오류가 났으면 ②에서 그 함수 스코프를 표시에서 뺀다.
  - try·catch 블록이 만드는 스코프와 `e`, `console` 찾기는 그리지 않는다(단순화).
- 시나리오 3개:
  - `let-before`(예제 1, 6단계): 전역 `score` 초기화 전 → 읽기 ReferenceError → catch → 값이 들어감 → `10`
  - `shadow`(예제 3, 10단계): 전역 `color`가 `'빨강'`이 된 뒤 블록 진입 → 블록의 `color` 초기화 전 → 4번 줄 읽기가 블록에서 멈춰 ReferenceError(전역 `'빨강'`까지 가지 않음) → catch → `'파랑'` → 블록 끝 → 전역 `'빨강'`
  - `time-not-place`(예제 4, 11단계): 첫 `show()` 호출 안에서 `count`가 전역에 초기화 전 → ReferenceError → catch(함수 스코프 빠짐) → `count = 3` → 두 번째 `show()`는 `3`
  - 예제 2·5·6은 예제·퀴즈·본문으로 다룬다.
- 정확성 검증:
  - (a) 공통 불변식
  - (b) 구조: 경로는 `currentId`에서 시작해 `outerId`를 따르고 처음 찾은 곳에서 끝난다. `error`는 그 이름이 초기화 전일 때만 있다. 함수 스코프의 `outerId`는 정의 위치(전역)다.
  - (c) 스냅샷 대조: 단계마다 화면의 각 이름을 그 위치에서 실제로 읽은 결과와 비교한다(예제 해당 줄에 try/catch 탐침을 끼워 vm 컨텍스트 안에서 실행). `초기화 전` ↔ ReferenceError, 값 ↔ 그 값이다.
  - (d) 오류 단계의 줄을 실제로 실행하면 ReferenceError이고, 그 직전 단계까지의 출력이 실제 출력의 앞부분과 같다.
  - (e) 음성 확인:
    - `shadow`의 4번 줄 경로를 전역까지 이어 `'빨강'`을 찾게 바꾸면 실패해야 한다.
    - `let-before`의 선언 처리에서 `score`를 `undefined`로 그리면(var처럼) 실패해야 한다.
- 버린 대안:
  - ① 공통 실행기·셸을 확장해 잡히지 않은 오류 예제를 지원 — 사용자가 try…catch를 골랐다(공통 코드 회귀 위험, AGENTS "폴더만 추가").
  - ② 오류를 본문·테스트로만 다룸 — 핵심 동작을 실행 예제로 보일 수 없다(사용자 결정).
  - ③ hoisting의 phase + bindings 목록 모델 — 가림(스코프 두 겹)을 그릴 수 없다.
  - ④ try·catch 블록 스코프와 `e`까지 그리기 — 이 페이지의 주제와 무관한 카드가 늘어 핵심 경로가 묻힌다. 단순화로 밝힌다.
  - ⑤ 함수 안의 `let` 시나리오 — 예제 4가 함수 호출을 이미 보여 주고, 함수 안 `let`의 TDZ는 본문 한 줄 + 테스트로 충분하다.

## 4. 변경 파일

- 추가 `app/concepts/tdz/`:
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 6개(2절 표)
  - `scenarios.ts`, `TdzView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `TDZ_PATH`, `TDZ_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: block-scope 케이스를 본떠 뒤에 추가
  - `docs/content-guide.md:164`: e2e 목록에 `tdz`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 3번 계획 문서·상태, 진행 기록
- 변경하지 않음:
  - `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, `tests/e2e/navigation.spec.ts`, `package.json`, `AGENTS.md`
  - 기존 개념 폴더 13개. `hoisting`·`block-scope`의 `related`에 `tdz`를 거는 역방향 연결은 9절 후보로 둔다.

## 5. 위험 요소

- 가림 경로를 잘못 그림(초기화 전을 건너뛰고 바깥을 찾음) → 3절 (b) "처음 찾은 곳에서 멈춤" + (c) 스냅샷 + (e) 음성 확인(작업 순서 2).
- "`let`은 호이스팅되지 않는다"를 반박하면서 "`let`도 `var`처럼 호이스팅된다"로 과하게 쓰는 것 → 본문은 "이름은 미리 만들어지지만 `var`와 달리 초기화하지 않는다"로 쓴다. '호이스팅'이 명세 용어가 아님은 hoisting 페이지 단순화를 잇는다(작업 순서 5).
- TDZ를 "선언문 위쪽 코드 영역"으로 서술 → 예제 4와 Callout로 "실행 시점"을 명시한다. "영역"이라는 이름의 유래도 단정하지 않는다.
- 오류를 early error(SyntaxError)처럼 "스크립트가 실행되지 않는다"로 쓰는 것 → 실행 중 오류라 앞줄은 실행된다는 테스트(`console.log(1)` 뒤 ReferenceError)를 둔다.
- try…catch 설명이 47장 내용을 앞서 가르침 → 본문은 "try 블록에서 오류가 나면 그 블록의 나머지를 건너뛰고 catch 블록을 실행한다, `e.name`은 오류 종류의 이름" 한 문단만 쓰고 단순화에 "별도 개념"으로 밝힌다.
- 브라우저 콘솔 메시지 문구(예: V8 "Cannot access … before initialization")를 사실처럼 인용 → 호스트 문구라 쓰지 않거나 "엔진마다 다르다"로만 쓴다. 예제는 `e.name`만 출력한다.
- `typeof`가 ReferenceError를 낸다는 서술을 "선언하지 않은 이름"과 섞는 것 → 예제 2가 두 경우를 나란히 보인다.
- `객체` 검색 2건 → meta 세 필드에 `객체`가 없어야 한다(작업 순서 1 완료 조건).
- 375px에서 찾기 패널의 오류 문구 넘침 → `break-words [overflow-wrap:anywhere]`, e2e 가로 스크롤 검사.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성:
  - 예제 6개의 실제 출력이 `expectedOutput`과 같다.
  - 본문 주장 검증(2절 목록, `.mjs`·`.cjs` 결과 같음)
  - 시나리오 대조(3절 a~e)
- 브라우저(빌드 결과를 `serve` 4175로 띄운다. 사용자 dev 서버 5173은 건드리지 않는다):
  1. 첫 화면: "검토 중" 배지, 분류 '실행 모델', 선행 개념 `hoisting`·`block-scope` 링크, 퀴즈 라디오 UI
  2. `선언 전에 읽기`:
     - 전역 선언 처리 단계에 `score` `초기화 전`(`let`)
     - 2번 줄 단계: 찾기 패널 "전역 스코프에서 찾음 — 초기화 전 → ReferenceError"
     - catch 단계 콘솔 `ReferenceError`
     - 마지막 콘솔 `ReferenceError`/`10`
  3. `안쪽 블록의 가림`:
     - 블록 진입 단계에 `if 블록 스코프`의 `color` 초기화 전, 전역 `color = '빨강'`
     - 4번 줄 단계의 경로는 블록 한 곳에서 멈추고 ReferenceError
     - 마지막 콘솔 `ReferenceError`/`파랑`/`빨강`
  4. `시점이 정한다`:
     - 첫 호출의 `show 함수 스코프` → 전역 `count` 초기화 전 → ReferenceError
     - catch 단계에서 함수 스코프가 빠짐
     - 두 번째 호출에서 `count = 3`을 찾음
     - 콘솔 `ReferenceError`/`3`
  5. 375px·다크 모드에서 2~4를 반복하고 다음을 확인한다: 가로 스크롤 없음, 키보드 ←/→/Home, 콘솔 에러 0
  6. 홈: '실행 모델' 그룹 카드 4개, 카드 14개, `객체` 검색 2건, `TDZ` 검색 1건

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `app/concepts/tdz/examples/*.js`(6개, 2절 표의 원문 그대로), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장 부분)
- 현재: 없음
- 변경:
  - 예제 6개는 아래 원문 그대로 둔다(줄 번호를 시뮬레이터가 쓴다. 끝 줄바꿈 1개).
    - `let-before.js`: `try {` / `  console.log(score);` / `} catch (e) {` / `  console.log(e.name);` / `}` / `let score = 10;` / `console.log(score);`
    - `typeof-tdz.js`: `console.log(typeof missing);` / `try {` / `  console.log(typeof later);` / `} catch (e) {` / `  console.log(e.name);` / `}` / `let later = 1;` / `console.log(typeof later);`
    - `shadow.js`: `let color = '빨강';` / `if (true) {` / `  try {` / `    console.log(color);` / `  } catch (e) {` / `    console.log(e.name);` / `  }` / `  let color = '파랑';` / `  console.log(color);` / `}` / `console.log(color);`
    - `time-not-place.js`: `function show() {` / `  return count;` / `}` / `try {` / `  console.log(show());` / `} catch (e) {` / `  console.log(e.name);` / `}` / `let count = 3;` / `console.log(show());`
    - `assign-before.js`: `try {` / `  total = 5;` / `} catch (e) {` / `  console.log(e.name);` / `}` / `let total;` / `console.log(total);` / `total = 5;` / `console.log(total);`
    - `var-vs-const-fn.js`: `try {` / `  cube(2);` / `} catch (e) {` / `  console.log(e.name);` / `}` / `try {` / `  square(3);` / `} catch (e) {` / `  console.log(e.name);` / `}` / `var cube = function (n) {` / `  return n * n * n;` / `};` / `const square = function (n) {` / `  return n * n;` / `};` / `console.log(cube(2) + square(3));`
  - `meta.ts`:
    - slug `tdz`, title는 3절, category `execution`
    - summary(150자 안팎): "let·const 이름은 스코프에 들어갈 때 미리 만들어지지만 선언문이 실행되기 전까지는 초기화 전이라, 그 사이에 읽거나 대입하면 ReferenceError" + typeof·var와의 차이. `객체` 없음.
    - tags: `TDZ`, `temporal dead zone`, `let`, `const`, `호이스팅`, `초기화`, `ReferenceError`, `typeof`, `가림`, `shadowing`. `객체` 없음.
    - goals 4개
    - prerequisites: `hoisting`, `block-scope`, `scope-chain`
    - related: `[]`
    - examples 6개(2절 출력)
    - simplifications(아래 7개)
    - references: 명세 앵커 2절 + MDN ko `let`·`const`·`try...catch`·`typeof`
    - `reviewedAt: null`
  - 단순화:
    - ① 'TDZ'는 명세가 정의한 용어가 아니다. 명세는 초기화되지 않은 바인딩(uninitialized binding)으로 설명한다.
    - ② 예제는 오류를 보이려고 try…catch와 `e.name`을 쓴다. try·catch 블록이 만드는 스코프와 `e`는 시뮬레이터에 그리지 않고, 오류 처리는 별도 개념에서 다룬다.
    - ③ 스코프 카드는 환경 레코드를 단순화한 것이다(별도 개념).
    - ④ 끝난 함수·블록 스코프는 표시에서 뺀다(클로저 개념).
    - ⑤ `class` 선언과 기본값 매개변수에도 같은 오류가 있지만 별도 개념에서 다룬다.
    - ⑥ 브라우저 콘솔의 오류 메시지 문구는 엔진마다 다르고, 이 페이지는 오류 종류(`e.name`)만 보인다.
    - ⑦ `for (let …)` 반복의 새 바인딩은 별도 개념에서 다룬다.
  - `concept.test.ts` 본문 주장 `describe`(vm, `errorNameOf`·출력 수집 헬퍼는 block-scope의 것을 복사):
    - 2절 vm 목록 전부
    - 선언 전 `const`에 대입하면 ReferenceError(TypeError 아님)
    - `let x;` 뒤 `x`는 `undefined`
    - 예제 6개를 첫 줄에 `'use strict';`를 붙여 실행해도 출력이 같다
    - `.mjs`·`.cjs` 출력이 2절 표와 같다(block-scope `runAs` 방식)
    - 잡지 않으면 앞줄 출력 뒤 멈춘다
- 이유: 위험이 가장 큰 사실(출력, 오류 종류)을 먼저 고정한다.
- 주의사항:
  - 예제는 Prettier·ESLint 제외 경로다.
  - `console.log`에는 원시 값만 넘긴다(`e.name`은 문자열).
  - 예제에 `var`·`let` 이름 충돌이나 early error가 없어야 한다.
- 완료 조건:
  - `npm test`에서 예제 L1 6개 통과, 본문 주장 테스트 통과
  - lint·format:check·typecheck 통과
  - meta 세 필드에 `객체` 없음(grep)

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오 부분)
- 현재: 없음
- 변경:
  - 3절 상태 모델과 시나리오 3개(6/10/11단계)를 만든다.
  - 단계 제목·설명은 block-scope 문체를 따른다. 오류 단계 설명은 "처음 찾은 곳의 이름이 초기화 전이므로 ReferenceError가 나고, 바깥 스코프는 찾지 않는다"를 담는다.
  - 테스트:
    - 3절 (a)~(d)
    - 단계 수 고정
    - 오류 단계 다음 단계의 출력 끝이 `'ReferenceError'`
    - 오류 단계에서 그 줄 실행 시 ReferenceError
    - 함수 스코프의 `outerId`가 소스에서 계산한 정의 위치와 같음
- 이유: 시각화의 정확성은 상태 데이터가 정한다.
- 주의사항:
  - 탐침은 vm 컨텍스트 안에서만 값을 읽는다(호스트에서 sandbox를 읽지 않는다).
  - 탐침 코드도 `try { … } catch` 안에서 이름을 읽어 `'ReferenceError'`를 기록한다.
  - `time-not-place`의 첫 호출 안 탐침은 함수 본문 2번 줄 앞에 넣는다.
- 완료 조건:
  - 이 개념 테스트 전부 통과
  - 음성 확인 2건(3절 (e))을 서브에이전트가 실행해 실패를 확인하고 되돌린다. 메인이 테스트 코드를 확인한다.

### 3. 시각화 `TdzView`

- 대상: `TdzView.tsx`, `TdzView.test.tsx`
- 현재: 없음
- 변경:
  - `BlockView`를 복사해 3절 화면으로 고친다(`onGlobalObject`·`var`·`implicit` 표시 제거).
  - 찾기 패널에 `error`가 있으면 오류 문구를 둔다. 문구는 텍스트로, 스크린 리더도 읽는다.
  - 클래스 문자열은 `BlockView`와 같게 둔다.
- 이유: 오류 단계를 글자로 보여야 한다.
- 주의사항:
  - effect·window 접근 없음(하이드레이션)
  - 오류 강조에 색만 쓰지 않는다
- 완료 조건: `TdzView.test.tsx`(빈 상태, 초기화 전 배지, 값이 들어감, 오류 경로 문구, 함수 스코프 바깥 표시, lookup 없음) 통과, typecheck 통과

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="TDZ 시뮬레이터"`, scenarios 연결
- 완료 조건: 테스트 4개(첫 화면, 오류 단계의 찾기 패널 문구, 시나리오 전환, 마지막 단계 콘솔) 통과

### 5. 본문 content.mdx

- 대상: `content.mdx`
- 변경:
  - `## 동작 원리`(h3: 이름은 미리 만들어진다 / 선언문이 실행되면 값이 들어간다 / 초기화 전에 쓰면 ReferenceError / typeof도 예외가 아니다 / 위치가 아니라 시점 / var와 무엇이 다른가 / 예제가 try…catch를 쓰는 이유)
  - `## 예제`(예제 1~6, 각 `file=` 코드 블록 + PredictQuiz, 마지막 `### 시뮬레이터로 확인하기`)
  - `## 결과와 이유`(예제별 설명 + 오해 Callout 5개: 호이스팅되지 않는다 / 선언문 위쪽 영역이다 / typeof는 안전하다 / 선언 전 대입은 암묵적 전역 / `let x;`는 초기화 전으로 남는다)
  - 기존 개념 링크: hoisting, block-scope, scope-chain, typeof-operator, function-calls
- 이유: 핵심 오해를 명세 용어로 바로잡는다.
- 주의사항:
  - 2절의 확인된 사실만 쓴다. 엔진 내부 구현처럼 쓰지 않는다.
  - try…catch는 한 문단만 쓴다.
  - 15장 이후 개념은 "별도 개념"으로만 언급한다.
  - `**` 굵게 쓰기, 공백이 깨진 인라인 code가 없어야 한다(기존 HTML 검사).
- 완료 조건:
  - 메인이 전문을 2절 명세·실행 결과와 대조한다.
  - `npm test`, build 성공
  - 빌드 HTML의 `<details` 개수 = 퀴즈 수, `**` 0

### 6. e2e·빌드 테스트·문서

- 대상: 4절 "수정(추가만)" 파일, 로드맵
- 변경: block-scope 케이스를 본떠 추가한다. content-guide 목록에 `tdz`를 넣는다. 로드맵 3번 행(`tdz.md`, 상태)과 진행 기록을 고친다.
- 주의사항: 기존 케이스는 고치지 않는다.
- 완료 조건:
  - 전체 검증 명령 통과(e2e는 기존 skipped 외 통과)
  - 6절 브라우저 시나리오 1~6을 확인한다.

## 9. 추가 개선 후보

- 추가 게시글 후보: 없음. 15장의 나머지(`for` 문의 `let`)는 이미 후보로 대기 중이다. try…catch·오류 처리는 47장이라 13~24장 로드맵 밖이다.
- `hoisting/meta.ts`·`block-scope/meta.ts`의 `related`에 `tdz` 역방향 연결(기존 개념 수정, 사용자 확인). `hoisting` 단순화 4와 `block-scope` 단순화 3의 "별도 개념"을 이 페이지 링크로 바꾸는 것도 같은 범주다.

## 구현 진행

- baseline (2026-10-28, `14abfcb`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 52파일 1196 통과(메인 재실행). `test:build` 105·`e2e` 이 개념 외 통과는 같은 커밋의 직전 검증 결과(block-scope 구현 진행 6~8). dev 서버 5173 실행 중(빌드 산출물과 무관), serve 4175 미실행.
- [x] 1. 예제·meta·route·본문 주장 테스트 — 서브에이전트 작성, 메인 재실행: lint·format:check·typecheck 통과, `npm test` 53파일 1243 통과. 예제 6개 = 계획 초안 원문(diff 없음, 끝 줄바꿈 1개), meta `title`·`summary`·`tags`에 `객체` 없음. 메인 확인: vm 새 컨텍스트에도 `console`이 있어 본문 주장 테스트의 ReferenceError가 실제로 TDZ에서 난다(메시지 `Cannot access 'x' before initialization`). 메인 수정 2건: ① goals 3 "let·const가 호이스팅된다" → "이름이 선언문 실행 전에 이미 만들어진다"('호이스팅'은 명세 용어가 아니고 var와 같은 동작으로 읽힐 수 있음) ② 단순화 ⑤의 기본값 매개변수 근거 테스트 추가. `content.mdx`는 필수 h2용 자리표시(5단계에서 다시 씀).
- [x] 2. 시나리오와 대조 테스트 — 메인 재실행: lint·format·typecheck 통과, `npm test` 53파일 1290 통과. 단계 수 6/10/11. 계획 대비: `Lookup.purpose`에 `'assign'`을 둠(선언문 단계는 이름을 찾아 초기화 — block-scope와 같음, 3절 "read만"보다 명세에 가까움). 스냅샷 대조 16지점(블록 진입 직후·함수 본문 첫 줄 포함, 같은 위치 두 번째 실행은 `nth`), 오류 단계는 그 줄 직전에서 실제 ReferenceError + 출력 앞부분 대조, 오류 없는 읽기 단계도 실제 대조. 음성 확인(서브에이전트 실행·되돌림, 메인이 테스트 코드 확인): shadow 4단계 경로를 전역까지 이으면 3개 실패, let-before 선언 처리의 score를 값으로 그리면 3개 실패. 메인 수정 1건: 설명 문구 "찾힙니다" → "찾아집니다".
- [x] 3. 시각화 `TdzView` — 메인 재실행: lint·format·typecheck 통과, `npm test` 55파일 1301 통과. `BlockView`와 diff 확인: `onGlobalObject`·`var`·`implicit`·`undefined`·`updated` 제거, 오류일 때 경로 아래 텍스트 `<스코프>에서 찾음 — 초기화 전이라 ReferenceError` 추가(색 의존 없음, `wrap` 적용), 나머지 클래스 문자열 동일, effect·window 없음. `TdzView.test.tsx` 7개.
- [x] 4. 래퍼 `Simulator` — `label="TDZ 시뮬레이터"`, block-scope 래퍼와 같은 형태. `Simulator.test.tsx` 4개(첫 화면, 오류 단계 문구, 시나리오 전환, 마지막 콘솔) 통과.
- [x] 5. 본문 content.mdx — 서브에이전트 작성 후 메인이 전문을 2절 명세·실행 결과와 대조해 4곳 수정: ① 바인딩 정의 "값을 담는 칸"(비유) → "이름과 값의 연결"(hoisting과 같은 표현) ② "`const`는 초기값이 반드시 있다" → `for…in`·`for…of` 머리 예외 명시(block-scope와 일치) ③ `let x = x` 이유를 "선언문이 끝나기 전" → "초기값을 먼저 평가한 뒤 초기화하므로 그 시점에 초기화 전"(LexicalBinding 평가 순서) ④ Callout "예제 5의 2번 줄에서 전역 객체에 프로퍼티가 만들어지지 않았다"(예제가 보이지 않는 관찰) → 일반 서술 + 근거 테스트. 근거 테스트 3개 추가(선언문 아래 함수 선언을 먼저 호출 → ReferenceError, `let x = x`와 대조, `for…of`의 `const`). 메인 재실행: lint·format·typecheck 통과, `npm test` 55파일 1304 통과. 서브에이전트 build 확인: HTML `<details` 6·`**` 0·깨진 인라인 code 0(메인이 6단계에서 다시 확인).
- [x] 6. e2e·빌드 테스트·문서 — 서브에이전트가 테스트 4파일에 추가만(block-scope 케이스 본뜸 + 오류 단계 문구 e2e 1개). 메인: content-guide `:164` 목록에 `tdz`, 로드맵 3번 행·진행 기록. 메인 전체 재실행: lint·format·typecheck 통과, `npm test` 55파일 1304, `test:build` 112, `e2e` 203 통과·3 skipped(기존 프로젝트 전용). 빌드 HTML `<details` 6·`**` 0·깨진 인라인 code 0. 브라우저(빌드 serve 4175, Playwright, 데스크톱 라이트·375px 다크): 시나리오 1~3 기대 텍스트 일치(전역/블록 오류 문구, 가림 경로 1칸에서 멈춤, catch 단계에서 함수 스코프 빠짐, `count = 3`), '검토 중'·'실행 모델'·선행 링크 3개·라디오 27(퀴즈 24 + 시나리오 3), 키보드 Home/→, 가로 넘침 0, 콘솔 에러 0, 홈 카드 14·`객체` 2·`TDZ` 1. 375px 다크 스크린샷 육안 확인. 이후 메인 수정 1건: summary 문장 다듬기("typeof도 예외 없이 ReferenceError" 어순 → "ReferenceError입니다. typeof도 예외가 아니며", 136자) → lint·format·typecheck·`npm test` 1304 재통과.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가 + 문서 2줄): 새 Critical/High 0(본문의 명세 불일치 4건과 goals 1건은 1·5단계 메인 대조에서 이미 수정). 확인한 것: 본문·단순화·시나리오 설명이 명세 절(14.3.1 NOTE, GetBindingValue, SetMutableBinding 검사 순서, typeof의 IsUnresolvableReference, TryStatement·CatchClauseEvaluation)과 일치, 모든 실행 결과 주장에 테스트 존재(`.mjs`·`.cjs`·strict 포함), 본문 주장 테스트의 ReferenceError가 `console` 부재가 아니라 TDZ에서 남(메시지 확인), 스냅샷은 vm 컨텍스트 안에서 읽음, 하이드레이션(TdzView 효과·window 없음), 엔진 오류 메시지 인용 없음. Low 1: `TdzView.tsx`의 "끝까지 찾지 못했습니다" 분기는 BlockView에서 복사된 것으로 이 개념 시나리오에서는 나오지 않음(동작 영향 없음, 보고만).

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 달라진 점: ① `Lookup.purpose`에 `'assign'`을 두어 선언문 단계(이름을 찾아 초기화)를 block-scope와 같은 방식으로 그렸다(구현 진행 2) ② 메인 대조에서 goals 1건과 본문 4곳을 명세에 맞게 고치고 근거 테스트 4개를 더했다(구현 진행 1·5) ③ 오류 단계 문구를 확인하는 e2e 1개를 더했다(구현 진행 6).
- 완료 조건 변경 없음.

### 코드 리뷰

- 리뷰 1차 새 Critical/High 0(명세 불일치는 구현 중 메인 대조에서 수정). Low 1건(`TdzView.tsx`의 "끝까지 찾지 못했습니다" 분기는 이 개념에서 쓰이지 않음)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `reviewedAt` 기록
- [ ] `hoisting`·`block-scope`의 `related`에 `tdz` 역방향 연결과, 두 페이지의 "별도 개념"(hoisting 단순화 4·본문 42행, block-scope 단순화 3·본문 10행)을 이 페이지 링크로 바꾸기(기존 개념 수정, 사용자 확인)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 선언문 단계에 `purpose: 'assign'` 찾기를 그렸다 — 계획은 읽기만 두었지만, 선언문 평가는 이름을 찾은 뒤(ResolveBinding) 그 바인딩을 초기화하므로 찾기 경로를 보이는 편이 명세에 가깝고 block-scope와도 같다.
- [Claude 판단] 학습 목표의 "let·const가 호이스팅된다"를 "이름이 선언문 실행 전에 이미 만들어진다"로 고쳤다 — '호이스팅'은 명세 용어가 아니고, "호이스팅된다"고 쓰면 var처럼 undefined로 시작한다는 오해를 부를 수 있다.
- [Claude 판단] 본문의 "`let x = x`는 선언문이 끝나기 전이라 오류"를 "초기값을 먼저 평가한 뒤 초기화하므로 초기값의 x를 읽을 때 초기화 전"으로 고쳤다 — 오류의 원인을 명세의 평가 순서(LexicalBinding: Initializer 평가 → InitializeReferencedBinding)로 설명하기 위해서다.
- [무검토 승인] 시각화를 hoisting의 "단계 + 이름 목록"이 아니라 block-scope의 "스코프 카드 + 이름 찾기 경로"로 만들었다 — 가림 예제(스코프 두 겹)에서 찾기가 블록에서 멈추는 것을 보여야 하기 때문이다.
- [무검토 승인] try·catch 블록이 만드는 스코프와 `e`는 그리지 않고 단순화에 밝혔다 — 그리면 주제와 무관한 카드가 늘어 핵심 경로가 묻힌다.
- 오류는 예제에서 try…catch로 잡아 `e.name`을 출력한다(사용자 결정) — 실행기는 잡히지 않은 오류에서 실패하고, 공통 코드를 확장하면 기존 개념 회귀 위험이 있다. try…catch는 47장이라 본문 한 문단 + 단순화로 처리했다.

#### 배경지식

- 14.3.1 NOTE: let·const 변수는 담는 환경이 만들어질 때(스코프 진입) 생기지만 LexicalBinding이 평가되기 전에는 접근할 수 없다. 초기값 없는 let은 그때 undefined가 된다.
- GetBindingValue·SetMutableBinding: 초기화 전 바인딩을 읽거나 쓰면 strict와 관계없이 ReferenceError. SetMutableBinding은 초기화 여부를 immutable 검사보다 먼저 하므로 선언 전 const 대입도 ReferenceError다.
- typeof: IsUnresolvableReference(어디서도 못 찾음)일 때만 "undefined"를 돌려주고, 찾은 이름은 GetValue를 거치므로 초기화 전이면 ReferenceError다.
- 이름 찾기(GetIdentifierReference)는 이름이 있는 첫 환경에서 멈춘다. 그 이름이 초기화 전이어도 바깥으로 계속 찾지 않는다 → 가림.
- 선언 중복 같은 early error(SyntaxError)는 실행 전에 스크립트 전체를 거부하지만, TDZ 오류는 실행 중 오류라 앞줄은 실행된다.

#### 확인 질문

1. 예제 3에서 4번 줄이 '빨강'이 아니라 ReferenceError인 것이 왜 "let 이름이 미리 만들어진다"의 증거인가?
   <details><summary>답</summary>이름 찾기는 이름이 있는 첫 스코프에서 멈춘다. 4번 줄 시점에 if 블록 스코프에 color가 없었다면 전역으로 올라가 '빨강'을 읽었을 것이다. ReferenceError가 났다는 것은 8번 줄 선언문이 실행되기 전에 이미 블록 스코프에 color가 (초기화 전으로) 있었다는 뜻이다(BlockDeclarationInstantiation). 근거: 예제 shadow.js, 시나리오 shadow 4단계, concept.test.ts 스냅샷 대조.</details>
2. `typeof missing`은 'undefined'인데 `typeof later`(선언문 전)는 왜 ReferenceError인가?
   <details><summary>답</summary>typeof는 참조가 unresolvable(어디서도 못 찾음)일 때만 "undefined"를 돌려준다. later는 스코프에 이미 있어 찾아지므로 GetValue → GetBindingValue를 거치고, 초기화 전이라 ReferenceError다. 근거: 계획 2절 13.5.3.1, 예제 typeof-tdz.js.</details>
3. 선언 전의 const에 대입하면 왜 TypeError(재할당)가 아니라 ReferenceError인가? 선언 전의 let에 sloppy mode로 대입하면 왜 암묵적 전역이 생기지 않는가?
   <details><summary>답</summary>SetMutableBinding은 "아직 초기화되지 않았으면 ReferenceError"를 immutable 검사보다 먼저 한다. 암묵적 전역은 이름을 어디서도 못 찾을 때(PutValue의 unresolvable 경로)만 생기는데, let 이름은 스코프에 이미 있어 찾아지므로 그 경로로 가지 않는다. 근거: 계획 2절, concept.test.ts 본문 주장 검증.</details>
4. 시나리오의 선언문 단계에 '대입' 찾기를 그린 이유는? 그리지 않으면 무엇이 덜 정확해지나?
   <details><summary>답</summary>선언문 평가는 이름을 찾은 뒤 그 바인딩을 초기화한다. 찾기를 생략하면 가림 예제 8번 줄에서 어느 스코프의 color가 초기화되는지(블록, 전역 아님)가 화면에서 드러나지 않는다. 근거: 구현 진행 2, scenarios.ts shadow 7단계.</details>
5. 예제가 오류 메시지가 아니라 `e.name`만 출력하는 이유와, 잡지 않았다면 출력이 어떻게 달라지는가?
   <details><summary>답</summary>메시지 문구는 엔진(호스트)마다 다르고 오류 종류 이름은 명세가 정한다. 잡지 않으면 오류가 난 줄에서 스크립트가 멈춰 그 뒤 출력이 없다(앞줄 출력은 남는다 — early error와 다름). 근거: meta 단순화 ⑥, concept.test.ts "잡지 않은 오류는 앞줄 출력 뒤에 멈춘다".</details>
