# 호이스팅: var와 함수 선언 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `66915ea`

## 0. 요약
- 목적: 로드맵 8번 개념 `/concepts/hoisting`을 추가한다. 스크립트는 실행 전에 선언을 먼저 처리해(함수 선언 → 함수 값, `var` → `undefined`) 선언문보다 앞에서 `var`는 `undefined`, 함수 선언은 호출 가능, `var`에 담은 함수 표현식은 호출 시 TypeError라는 것을 예제 5개·퀴즈·"선언 처리 → 실행" 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개(category `execution` → 홈에 '실행 모델' 그룹이 처음 생김) + e2e·빌드 테스트 케이스 추가 + `docs/content-guide.md` 9단계 목록 문구 + 로드맵 상태. 공통 코드와 기존 개념 10개는 바꾸지 않는다.
- 위험: 선언 처리 순서(함수 → `var`)와 단계별 값을 손으로 잘못 적는 것 → 예제에 스냅샷 코드를 끼워 실행한 실제 값과 단계 상태를 대조하고, 선언 처리 순서는 소스에서 계산해 대조한다.
- 복잡도: 중간 · Consensus: 생략 (function-calls와 같은 구조, 공통 코드·새 공통 패턴 없음. 명세 원문과 vm 실행으로 사실을 미리 확인했고 위험 지점은 실제 실행 대조 테스트로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 8번. 『모던 자바스크립트 Deep Dive』 4·12장 범위.
- 핵심 3가지: ① 선언 전 `var` 참조는 `undefined` ② 함수 선언은 선언문보다 먼저 호출 가능 ③ `var`에 담은 함수 표현식을 미리 호출하면 TypeError.
- 사용자 결정(2026-10-27) 추가 항목 4개 모두 포함: ① 같은 이름의 `var`와 함수 선언(예제 + 퀴즈 + 시뮬레이터) ② 실행되지 않는 줄의 `var`(`if (false)` 안; 예제 + 퀴즈, 블록 스코프는 설명하지 않음) ③ 선언하지 않은 이름과의 차이(ReferenceError; 오류라 본문 + 테스트 검증만) ④ 같은 이름의 함수 선언 두 번(예제 + 퀴즈).
- 사용자 결정(2026-10-27): category는 `execution`(실행 모델).
- 로드맵 결정: 실행 컨텍스트와 `let`·`const`의 TDZ는 설명하지 않고 `simplifications`에 "별도 개념"으로 적는다.

### 유지해야 하는 기존 동작
- 기존 개념 10개의 페이지·시뮬레이터·테스트는 그대로 통과하고 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 2개(`tests/e2e/navigation.spec.ts:17`, `:32`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다("함수 객체" 대신 "함수"·"함수 값").
- 홈 첫 카드는 여전히 '언어 기초' 그룹 첫 카드(`navigation.spec.ts:18`)다. `groupByCategory`가 `CATEGORY_LABELS` 순서(fundamentals → execution)로 그리므로 새 그룹은 그 뒤에 온다(`app/lib/concept-groups.ts:10-17`).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위
- 실행 컨텍스트(스택), 스코프·스코프 체인(13장), `let`·`const`·`class`의 TDZ(15장), 전역 객체(21장), 함수 안의 호이스팅(FunctionDeclarationInstantiation), 블록 안의 함수 선언(명세 부록 B web-compat), 모듈, 화살표 함수, `eval`.
- 위 항목은 필요한 곳에서 `simplifications`로만 밝힌다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 참고 구현은 `app/concepts/function-calls/`(가장 최근: `scenarios.ts` 상태 타입·헬퍼, `CallView.tsx` 섹션·배지·클래스 문자열, `Simulator.tsx` 래퍼, `concept.test.ts`의 `errorNameOf`·실제 실행 대조). 공통 타입 `app/simulator/types.ts`, 불변식 `tests/helpers/scenario-invariants.ts`, 예제 실행 `tests/helpers/run-example.ts`.
- e2e 개념별 상수 `tests/e2e/helpers.ts:19-20`, a11y(`tests/e2e/a11y.spec.ts:231-` function-calls 케이스)·responsive(`tests/e2e/responsive.spec.ts:243-`)가 가장 최근 본보기. 빌드 프리렌더 블록은 `tests/build/build-output.test.ts:424-` function-calls 블록.
- 오류 동작은 예제로 쓰지 않는다: 기존 예제에 `try`/`catch` 없음(grep). 오류 주장은 본문 서술 + `concept.test.ts` 검증(`function-calls/concept.test.ts:12-26`, `typeof-operator/content.mdx:54`).
- 기존 개념의 관련 서술: `typeof-operator`가 선언하지 않은 식별자의 ReferenceError와 `typeof` → `'undefined'`를 다룬다(`typeof-operator/content.mdx:52-54`, `:293`). `function-calls/meta.ts:72`가 "호이스팅은 다음 개념"이라 적었다. 여러 개념의 simplifications가 "호이스팅·TDZ는 별도 개념"(`equality-operators/meta.ts:91` 등).
- 명세(tc39.es/ecma262, 2026-10-27 원문 확인):
  - ScriptEvaluation(16.1.6): `GlobalDeclarationInstantiation(scriptNode, globalEnv)`가 정상 완료되면 그다음에 `Evaluation of scriptNode`.
  - GlobalDeclarationInstantiation(16.1.7): VarScopedDeclarations를 **뒤에서부터** 훑어 함수 선언을 모으고("If there are multiple function declarations for the same name, the last declaration is used"), 함수 선언 이름이 아닌 `var` 이름만 `declaredVariableNames`에 모은다. 그 뒤 `funcsToInitialize`마다 `InstantiateFunctionObject` + `CreateGlobalFunctionBinding`, 이어서 `declaredVariableNames`마다 `CreateGlobalVarBinding`. lexical(`let`·`const`) 이름은 binding만 만들고 초기화하지 않는다(NOTE).
  - CreateGlobalVarBinding(9.1.1.4.16): 전역 객체에 그 이름이 없을 때만 binding을 만들고 `undefined`로 초기화한다. 이미 있으면 그대로 쓴다.
  - Variable Statement Evaluation(14.3.2.1): `var x;`는 아무것도 하지 않고, `var x = 식`은 식을 평가해 `PutValue`(대입).
  - FunctionDeclaration Evaluation(15.2.6): `Return empty`(실행 단계에서 아무것도 하지 않음). FunctionExpression은 그 자리에서 InstantiateOrdinaryFunctionExpression.
  - 명세는 "hoisting"을 정의하지 않는다. 본문 노트 몇 곳에서만 쓰인다(grep `hoist` 5건, 용어 정의 없음).
  - 앵커 존재 확인: `sec-runtime-semantics-scriptevaluation`, `sec-globaldeclarationinstantiation`, `sec-createglobalvarbinding`, `sec-createglobalfunctionbinding`, `sec-variable-statement`, `sec-variable-statement-runtime-semantics-evaluation`, `sec-function-definitions`, `sec-function-definitions-runtime-semantics-evaluation`, `sec-runtime-semantics-instantiateordinaryfunctionexpression`.
- MDN 200 확인: `ko/…/Reference/Statements/var`, `ko/…/Reference/Statements/function`, `ko/…/Reference/Operators/function`, `en-US/docs/Glossary/Hoisting`(ko Glossary는 404).
- 예제 초안 실제 출력(Node 24.22.1 `vm` + `util.format`, 8절 1단계 원문 그대로):

  | 예제 | 출력 (`console.log` 줄마다) |
  | - | - |
  | `var-before.js` | `undefined` / `10` |
  | `decl-vs-expr.js` | `8` / `undefined` / `9` |
  | `same-name.js` | `function` / `number` |
  | `unexecuted-var.js` | `undefined` / `undefined` |
  | `duplicate-function.js` | `나중` / `나중` |

- 본문·단순화 서술 근거(vm, 오류는 `e.name`): `triple(3); var triple = function (n) { return n * 3; };` → TypeError. `triple(3); const triple = function …` → ReferenceError. `console.log(a); let a = 1;` → ReferenceError. `console.log(nope);` → ReferenceError, `typeof nope` → `'undefined'`. `var a = 1; var a; console.log(a)` → `1`. 순서를 바꾼 `function item() {} var item;` → `function` / `function`(대입 없는 `var`는 값을 바꾸지 않음). 함수 안 `function f() { console.log(x); var x = 2; console.log(x); } f();` → `undefined` / `2`.
- 스냅샷 시제품(scratchpad, 실행 확인): 예제 원문의 지정한 줄 뒤에 `__snap(줄, [['score', Object.prototype.hasOwnProperty.call(globalThis, 'score') ? typeof score : 'absent', … ? String(score) : '']])`를 **컨텍스트 안 코드로** 끼우면 그 시점 값을 얻는다. 맨 앞(줄 0)에 끼운 스냅샷 = 선언 처리가 끝난 상태(예: `decl-vs-expr`은 `double` function + `triple` undefined, `same-name`은 `item` function, `duplicate-function`은 `pick` = 두 번째 함수 원문). 주의: 바깥(호스트)에서 sandbox 객체를 `hasOwnProperty`로 읽으면 대입 전 `var`가 `absent`로 보여 틀린다 → 반드시 컨텍스트 안에서 읽는다.
- 홈: summary 초안 137자, `객체` 없음(실행 확인). execution 그룹은 이 개념 하나.

### 추정
- 없음

## 3. 구현 전략
- function-calls와 같은 구조(예제 → meta → 시나리오·실제 실행 대조 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다. slug `hoisting`, category `execution`.
- 시뮬레이터 상태는 "진행 단계"(실행 전 / ① 선언 처리(코드 실행 전) / ② 실행) + "선언으로 만들어진 이름" 목록(이름, 만든 선언 `var 선언`/`함수 선언`, 값, 변화 배지)이다. 핵심 대비(같은 시점에 `double`은 함수, `triple`은 `undefined`)가 한 목록에 나란히 보이게 하려고 이 모양을 골랐다.
- 선언 처리는 선언 하나당 한 단계로 나눠 보여 준다. 명세는 한 번에 처리하므로 순서만 맨 바깥 코드의 명세대로(함수 선언 먼저 소스 순서로, 그다음 함수 선언과 이름이 다른 `var` 이름; 함수 선언과 같은 이름의 `var`는 처리 목록에서 빠지므로 단계를 두지 않음) 맞추고 단계로 나눈 것은 `simplifications`에 밝힌다.
- 실행 단계는 맨 바깥 문장 하나당 한 단계다. 함수 선언문도 실행 단계에서 한 단계로 지나가며 "아무것도 하지 않음"을 보여 준다(15.2.6). 함수 호출 내부(`double(4)`)는 한 단계로 묶는다.
- 시나리오 3개(`var-before` 5단계, `decl-vs-expr` 8단계, `same-name` 6단계, 합계 19). `unexecuted-var`·`duplicate-function`과 선언하지 않은 이름은 예제·퀴즈·본문으로 다룬다.
- 정확성 검증: (a) 선언 처리 단계의 순서·줄을 소스에서 계산한 명세 순서와 대조 (b) 선언 처리 마지막 상태 = 줄 0 스냅샷 (c) 실행 단계마다 상태·출력 = 그 단계 `line.to` 뒤 스냅샷 (d) 함수 값은 표시 문자열과 원문 범위를 실제 `String(fn)`과 대조.
- 버린 대안: ① 선언 처리를 한 단계로 묶기 — 같은 이름 시나리오에서 "함수 먼저, var는 건너뜀"이 안 보인다. ② 코드를 위로 옮긴 모습을 그리기 — "코드가 이동한다"는 오해를 그대로 그린다. ③ `try`/`catch`로 TypeError를 예제 출력에 넣기 — 미학습 문법이고 기존 개념도 오류는 본문 + 테스트로 다뤘다. ④ 함수 안 호이스팅 시나리오 — 함수 스코프(13장)를 앞서 보이게 된다. ⑤ function-calls `CallView` 재사용 — 개념 간 공유 부품은 `app/simulator/`뿐(AGENTS). 클래스 문자열만 같게 쓴다.

## 4. 변경 파일
- 추가 `app/concepts/hoisting/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 5개: `var-before.js`, `decl-vs-expr.js`, `same-name.js`, `unexecuted-var.js`, `duplicate-function.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `HoistView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `HOISTING_PATH`, `HOISTING_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(function-calls 케이스 뒤)
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행(파일 끝)
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록(파일 끝)
  - `docs/content-guide.md` 9단계: e2e 대상 개념 목록에 `hoisting` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch1-12.md`: 8번 계획 문서·상태 갱신, 진행 기록 한 줄
- 변경하지 않음: `app/routes.ts`, `app/lib/*`(`CATEGORY_LABELS`에 `execution`이 이미 있음, `app/lib/concepts.ts:1`, `:24-30`), `app/components/*`, `app/simulator/*`, `tests/helpers/*`, `tests/e2e/navigation.spec.ts`, 기존 개념 폴더 10개, `package.json`, `AGENTS.md`.

## 5. 위험 요소
- 선언 처리 순서·단계별 값·출력을 잘못 적음 → 틀린 그림 → 2단계 대조 테스트 + 음성 확인 4가지.
- "코드를 맨 위로 끌어올린다", "변수가 메모리에 미리 올라간다" 같은 서술 → 본문은 "실행 전에 선언을 먼저 처리한다"로 통일하고, 오해 Callout ①로 "코드는 움직이지 않는다"를 직접 다룬다. 메모리·엔진 구현은 쓰지 않는다.
- `var` 선언 전 `undefined`를 "아직 값이 없어서 오류 대신"처럼 막연히 설명 → "선언 처리 단계에서 이름을 만들고 `undefined`로 초기화했고, `= 10` 대입은 실행 단계에서 그 줄에 도달해야 일어난다"(14.3.2.1).
- 미학습 개념 서술(실행 컨텍스트·스코프·TDZ·전역 객체) → 본문은 "선언 처리 → 실행" 두 단계만, 나머지는 `simplifications`.
- 전역 객체에 이미 있는 이름(브라우저 `window.name` 등)은 `var` 선언 처리 때 `undefined`가 되지 않는다(9.1.1.4.16) → 예제 이름 `score`·`double`·`triple`·`item`·`flag`·`pick`은 브라우저 `window` 고유 프로퍼티가 아니다. 이 사실은 `simplifications`에 밝힌다.
- 블록 안 함수 선언(부록 B)과 혼동 → `unexecuted-var` 예제는 블록 안에 `var`만 두고 함수 선언은 넣지 않는다.
- `객체` 검색 2건 가정 → meta 세 필드에 `객체` 없음을 1단계 완료 조건으로.
- 홈에 '실행 모델' 그룹이 새로 생김 → `navigation.spec.ts`는 첫 카드만 확인(언어 기초 그룹이 먼저)이라 영향 없음. 브라우저에서 그룹 제목·순서를 확인한다.
- 375px에서 함수 값 표시(`function double(n) { … }`)가 넘침 → `break-words [overflow-wrap:anywhere]`, e2e 가로 스크롤 검사.
- 함수 값 표시와 원문이 어긋남(예: `duplicate-function`의 첫 번째·두 번째 함수 혼동) → 테스트가 `String(fn)`으로 원문 범위를 대조.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 5개 실제 출력 = `expectedOutput`, 본문 주장 검증(8절 1단계 목록), 시나리오 선언 순서·스냅샷 대조, 음성 확인(2단계 4가지).
- 브라우저(빌드 결과 `serve` 4175, 사용자 dev 서버 5173은 건드리지 않음):
  1. 첫 화면: "검토 중" 배지, 분류 표시 '실행 모델', 선행 개념 `function-calls`·`typeof-operator` 링크, 퀴즈가 라디오 UI.
  2. `var 선언 전 참조`: 2단계 진행 단계 `선언 처리`에 `지금`, `score = undefined`·`var 선언으로 생김`·`새로 생김`, 3단계 출력 `undefined`, 4단계 `score = 10`·`값이 바뀜`, 콘솔 `undefined`/`10`.
  3. `함수 선언과 함수 표현식`: 3단계 `double = function double(n) { … }`(함수 선언)과 `triple = undefined`(var 선언)가 함께 보임, 6단계 함수 선언문에서 값 변화 없음, 7단계 `triple`이 함수로 바뀜, 콘솔 `8`/`undefined`/`9`.
  4. `같은 이름의 var와 함수`: 2단계 `item` = 함수(함수 선언으로 생김, `var item` 선언 처리 단계 없음), 4단계 `item = 1`(함수 선언으로 생김·숫자), 5단계 함수 선언문에서 `item`이 1 그대로, 콘솔 `function`/`number`.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: '언어 기초' 그룹 다음에 '실행 모델' 그룹(카드 1개), 카드 11개, `객체` 검색 2건, `호이스팅` 검색 1건.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제·meta·route·본문 주장 검증
- 대상: `examples/*.js` 5개, `meta.ts`, `route.tsx`, `content.mdx`(필수 h2 자리표시만), `concept.test.ts`(본문 주장 검증 부분)
- 현재: 없음
- 변경:
  - 예제 원문(이 그대로, 파일 끝 줄바꿈 하나, 들여쓰기 2칸, 작은따옴표):
    - `var-before.js`
      ```js
      console.log(score);
      var score = 10;
      console.log(score);
      ```
    - `decl-vs-expr.js`(3·7·11줄은 빈 줄)
      ```js
      console.log(double(4));
      console.log(typeof triple);

      function double(n) {
        return n * 2;
      }

      var triple = function (n) {
        return n * 3;
      };

      console.log(triple(3));
      ```
    - `same-name.js`
      ```js
      console.log(typeof item);
      var item = 1;
      function item() {}
      console.log(typeof item);
      ```
    - `unexecuted-var.js`(2·6줄은 빈 줄)
      ```js
      console.log(flag);

      if (false) {
        var flag = true;
      }

      console.log(flag);
      ```
    - `duplicate-function.js`(2·6·10줄은 빈 줄)
      ```js
      console.log(pick());

      function pick() {
        return '처음';
      }

      function pick() {
        return '나중';
      }

      console.log(pick());
      ```
  - `meta.ts`:
    - `slug: 'hoisting'`, `category: 'execution'`
    - `title: '호이스팅: 선언문보다 먼저 쓰면 어떻게 되나'`
    - `summary`(137자): `'자바스크립트는 코드를 실행하기 전에 선언을 먼저 처리합니다. 그래서 var 변수는 선언문보다 앞에서 읽으면 undefined이고, 함수 선언은 선언문보다 먼저 호출할 수 있지만, var에 담은 함수 표현식을 미리 호출하면 TypeError입니다.'`
    - `tags`: `['호이스팅', 'hoisting', 'var', '함수 선언', '함수 표현식', '선언', 'undefined', 'TypeError', 'ReferenceError']`
    - `goals`: ① 코드를 실행하기 전 선언 처리 단계에서 `var` 변수와 함수 선언에 무엇이 만들어지는지 설명할 수 있다. ② `var` 변수를 선언문보다 앞에서 읽은 결과(`undefined`)와 선언하지 않은 이름을 읽은 결과(ReferenceError)를 구분할 수 있다. ③ 함수 선언은 미리 호출할 수 있지만 `var`에 담은 함수 표현식은 TypeError가 나는 이유를 설명할 수 있다. ④ 같은 이름의 `var`와 함수 선언, 같은 이름의 함수 선언 두 개, 실행되지 않는 줄의 `var`가 있을 때 결과를 예측할 수 있다.
    - `prerequisites`: `[{ label: 'var로 변수 선언하기' }, { label: '함수 호출', slug: 'function-calls' }, { label: 'typeof 연산자', slug: 'typeof-operator' }]`
    - `related`: `[]`
    - `examples`: 2절 표의 출력을 `expectedOutput`으로(처음에는 `[]`로 두고 `npm test` 실제 출력을 확인한 뒤 채움). id = 파일명에서 `.js`를 뺀 것.
    - `simplifications`:
      1. '선언 처리 단계를 선언 하나씩 나눠 보여 줍니다. 명세(GlobalDeclarationInstantiation)는 코드를 실행하기 전에 선언을 한 번에 처리하며, 이 페이지는 그 순서(함수 선언을 먼저, 그다음 var)만 따릅니다.'
      2. "'선언으로 만들어진 이름' 목록은 명세의 전역 환경 레코드(Global Environment Record)를 단순화한 것입니다. 실행 컨텍스트는 별도 개념에서 다룹니다."
      3. (변경 이력 L2로 갱신: var는 기존 값 유지, 함수 선언은 함수로 바꿈) 실제 문구는 `meta.ts` 참고
      4. 'let·const 선언도 코드를 실행하기 전에 처리되지만 초기화되지 않은 상태로 남아, 선언문보다 앞에서 읽으면 ReferenceError가 납니다(TDZ). const에 담은 함수 표현식을 미리 호출해도 TypeError가 아니라 ReferenceError입니다. 이 동작은 별도 개념에서 다룹니다.'
      5. '함수 안의 var·함수 선언도 그 함수를 호출할 때 본문을 실행하기 전에 같은 방식으로 처리됩니다. 이 페이지는 맨 바깥 코드만 다루며, 스코프는 별도 개념에서 다룹니다.'
      6. '블록({ }) 안의 함수 선언은 strict mode 여부와 호스트에 따라 동작이 달라 다루지 않습니다. 실행되지 않는 줄의 예제는 블록 안에 var만 둡니다. 블록과 var의 관계(스코프)도 별도 개념에서 다룹니다.'
      7. "함수 호출(double(4), triple(3))의 내부 과정은 한 단계로 묶어 표시합니다. 호출 과정은 '함수 호출' 개념에서 다룹니다."
      8. "'호이스팅'은 명세가 정의한 용어가 아닙니다. 명세는 이 동작을 선언 인스턴스화(declaration instantiation) 과정으로 정의합니다."
    - `references`: 명세 ScriptEvaluation(`sec-runtime-semantics-scriptevaluation`), GlobalDeclarationInstantiation(`sec-globaldeclarationinstantiation`), CreateGlobalVarBinding(`sec-createglobalvarbinding`), Variable Statement(`sec-variable-statement`), Function Definitions(`sec-function-definitions`), MDN 'Hoisting'(en-US Glossary — 한국어 문서 없음), MDN `var`, MDN 함수 선언(`Statements/function`), MDN 함수 표현식(`Operators/function`). 라벨 형식은 `function-calls/meta.ts` 따름.
    - `reviewedAt: null`
  - `route.tsx`: content-guide 6단계 템플릿.
  - `concept.test.ts` 본문 주장 검증(`errorNameOf`는 function-calls와 같은 모양으로 이 파일 안에 둔다):
    - `triple(3); var triple = function (n) { return n * 3; };` → `'TypeError'`
    - `console.log(nope);`(console 없는 컨텍스트면 `nope;`) → `'ReferenceError'`, `typeof nope` → `'undefined'`
    - `triple(3); const triple = function (n) { return n * 3; };` → `'ReferenceError'`, `a; let a = 1;` → `'ReferenceError'`
    - `var a = 1; var a; a` → `1`
    - `function item() {} var item; typeof item` → `'function'`
    - `function f() { var r = typeof x; var x = 2; return r + ' ' + x; } f()` → `'undefined 2'`
- 이유: 예제 출력과 본문의 오류·단순화 주장을 실제 실행으로 고정한다(정확성 원칙).
- 주의사항: 예제 폴더는 Prettier·ESLint 제외라 원문이 그대로 유지된다. 예제 이름은 브라우저 전역과 겹치지 않는 것만 쓴다(5절).
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/hoisting` 통과, 예제 5개 실제 출력 = 2절 표, summary ≤160자, title·summary·tags에 `객체` 없음(`grep`), lint·typecheck 0.

### 2. 상태 모델·시나리오·실제 실행 대조 테스트
- 대상: `scenarios.ts`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태 타입:
    ```ts
    export type Val =
      | { type: 'undefined' | 'number'; display: string }
      | { type: 'function'; display: string; source: LineRange } // display: 원문 첫 줄 + ' … }'(한 줄 함수는 원문 그대로), source: 함수 원문이 있는 줄 범위
    export type Binding = {
      name: string
      declaredBy: 'var' | 'function' // 이 이름을 만든 선언
      value: Val
      changed?: 'created' | 'updated' // 그 단계에서 새로 생김 / 값이 바뀜(다음 단계에서 해제)
    }
    export type HoistState = { phase: 'before' | 'declare' | 'run'; bindings: Binding[] }
    ```
  - 시나리오 3개(라벨 / 단계, 줄 번호는 1단계 예제 원문 기준):
    - `var-before` "var 선언 전 참조" — 5단계: 실행 전(`before`, 목록 비어 있음; 설명: 코드를 실행하기 전에 선언을 먼저 찾아 처리한다) / `declare` 2줄 `var score` → `score = undefined`(var, created) / `run` 1줄 출력 `undefined` / `run` 2줄 `score = 10`(updated; 설명: 대입은 실행 단계에서 이 줄에 도달해야 일어난다) / `run` 3줄 출력 `10`.
    - `decl-vs-expr` "함수 선언과 함수 표현식" — 8단계: 실행 전 / `declare` 4~6줄 `double` = `function double(n) { … }`(function, created) / `declare` 8~10줄 `triple = undefined`(var, created; 설명: 함수 표현식은 아직 평가하지 않는다) / `run` 1줄 `double(4)` 호출 → 출력 `8` / `run` 2줄 출력 `undefined` / `run` 4~6줄 함수 선언문 — 값 변화 없음(설명: 실행 단계에서 함수 선언문은 아무 일도 하지 않는다) / `run` 8~10줄 함수 표현식을 평가해 `triple` = `function (n) { … }`(updated) / `run` 12줄 출력 `9`.
    - `same-name` "같은 이름의 var와 함수" — 6단계: 실행 전 / `declare` 3줄 `item` = `function item() {}`(function, created; 설명: 명세는 함수 선언과 같은 이름의 `var item`을 바인딩을 만들 목록에서 빼므로 undefined로 초기화되지 않음) / `run` 1줄 출력 `function` / `run` 2줄 `item = 1`(updated; 대입은 같은 이름의 item 바인딩에 일어남) / `run` 3줄 맨 바깥 함수 선언문 — `item`은 1 그대로 / `run` 4줄 출력 `number`.
    - 바인딩 순서는 생긴 순서. 단계 설명은 "선언 처리", "실행", "이름을 만들고 undefined로 초기화", "대입", "아무 일도 하지 않는다"로 쓰고 실행 컨텍스트·스코프·TDZ·전역 객체를 설명하지 않는다.
  - `concept.test.ts`:
    - 시나리오마다 `assertScenarioInvariants`.
    - **단계 구조**: 첫 단계만 `before`(목록 비어 있음, `line` 없음), 그 뒤 `declare` 단계들, 그 뒤 `run` 단계들(되돌아가지 않음). `run` 단계의 `line`은 겹치지 않고 증가한다.
    - **선언 처리 순서**: 소스의 맨 바깥 줄에서 `^function (\w+)\(`(줄 번호와 이름)를 위에서부터, 그다음 `^var (\w+)`를 위에서부터 모은 목록 = `declare` 단계들의 (`line.from`, 이름) 순서. 이름은 그 단계 강조 줄 원문에 들어 있다. 같은 이름 함수 선언이 여러 개면 마지막 것만 남긴다(시나리오에는 없지만 규칙으로 구현).
    - **스냅샷 대조**: 예제 원문 맨 앞(줄 0)과 각 `run` 단계 `line.to` 줄 뒤에 컨텍스트 안 스냅샷 코드(2절 시제품 방식)를 끼워 `runInNewContext`로 실행한다. 스냅샷은 마지막 단계의 바인딩 이름 전부에 대해 `[이름, typeof 또는 'absent', String(값)]`과 그때까지의 출력 줄 수를 기록한다. ① 마지막 `declare` 단계의 목록 = 줄 0 스냅샷 ② 각 `run` 단계의 목록과 `output` = 그 단계 스냅샷(`absent`인 이름은 목록에 없어야 함). 값 비교: `undefined`·`number`는 `display === String(값)`, `function`은 `display`가 `String(fn)`의 첫 줄 + `' … }'`(한 줄이면 `String(fn)` 그대로)이고, `source` 줄 범위 원문이 `String(fn)`을 포함한다.
    - **declaredBy**: 각 이름의 `declaredBy`는 그 이름이 처음 생긴 `declare` 단계의 강조 줄이 `function`으로 시작하면 `'function'`, `var`면 `'var'`.
    - **changed 계산**: 이전 단계와 비교해 새로 생긴 이름은 `created`, 값(type·display)이 바뀐 이름은 `updated`, 나머지는 없음.
    - **음성 확인(구현 중 한 번씩, 커밋하지 않음)**: ① `var-before` 2단계 `score`를 `number 10`으로 → 스냅샷 대조 실패 ② `same-name`의 두 `declare` 단계 순서를 바꿈 → 선언 순서 실패 ③ `decl-vs-expr` 3단계 `triple`을 함수로 → 스냅샷 실패 ④ `same-name` 6단계 `item`을 함수로 되돌림 → 스냅샷 실패. 각각 실패 확인 후 원복(`cmp`).
- 이유: 단계 상태를 손으로 쓰되 근거는 실제 실행과 명세 순서로 고정한다(정확성 원칙).
- 주의사항: 스냅샷 코드는 테스트 안에서만 만들고 예제 파일은 바꾸지 않는다. 바깥에서 sandbox 객체를 읽지 말고 컨텍스트 안에서 `typeof`로 읽는다(2절 주의). 정규식은 줄 맨 앞(들여쓰기 없음)만 맨 바깥 선언으로 본다(시나리오 예제 3개는 모두 이 모양).
- 완료 조건: `npx vitest run app/concepts/hoisting` 통과, 단계 수 5/8/6, 음성 확인 ①~④ 각각 실패 확인 후 원복, lint·typecheck 0.

### 3. 시각화 컴포넌트 HoistView
- 대상: `HoistView.tsx`, `HoistView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `HoistState`를 그린다(`prevState`는 쓰지 않음 — 변화는 `changed`로 표시).
  - "진행 단계" 영역(`section` + `useId` `aria-labelledby`): 순서 목록 2개 `선언 처리 (코드 실행 전)`, `실행`. 현재 단계 항목에 텍스트 배지 `지금`. `before`면 배지 없이 "아직 코드를 실행하지 않았습니다."
  - "선언으로 만들어진 이름" 영역: 행마다 `이름 = 값`(`font-mono`) + 배지 `var 선언으로 생김`/`함수 선언으로 생김` + 타입 배지(`undefined`/`숫자`/`함수`) + 변화 배지 `새로 생김`/`값이 바뀜`. 비어 있으면 "아직 만들어진 이름이 없습니다."
  - 클래스 문자열·섹션 제목(`<p id>`)·줄바꿈은 `function-calls/CallView.tsx`와 같게 쓴다(import하지 않음). 넓은 화면에서 두 영역을 `sm:grid-cols-2`로 나란히(375px는 1열).
- 이유: 상태 모양이 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더 첫 단계가 JS 없이 의미 있게 보여야 한다(빈 상태 문구 2개). 색만으로 구분하지 않는다(배지 텍스트). 375px에서 함수 값이 넘치지 않게 `break-words [overflow-wrap:anywhere]`. 애니메이션은 `motion-safe:`만.
- 완료 조건: `HoistView.test.tsx` 통과(실제 `scenarios` 단계 state로) — 0단계 빈 상태 문구 2개, `var-before` 2단계 `선언 처리`에 `지금`·`score`·`undefined`·`var 선언으로 생김`·`새로 생김`, 4단계 `값이 바뀜`, `decl-vs-expr` 3단계 `function double(n) { … }`·`함수 선언으로 생김`과 `triple`·`undefined` 함께, 4단계 `실행`에 `지금`, `same-name` 4단계 `item`·`1`·`함수 선언으로 생김`·`숫자`(만든 선언은 그대로).

### 4. Simulator 래퍼
- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: function-calls `Simulator.tsx`와 같은 모양. `label="호이스팅 시뮬레이터"`, `renderState={(state) => <HoistView state={state} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `var 선언 전 참조` "실행 전", 다음 클릭 시 2번 줄 강조(`aria-current="step"`), 시나리오 전환 시 0단계로 돌아감.

### 5. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `Simulator`, `scenarios` import)
- 변경:
  - `## 동작 원리`
    - 두 단계: 스크립트를 실행하면 ① 선언 처리(코드 실행 전) ② 실행이 차례로 일어난다(ScriptEvaluation). 이 동작을 흔히 호이스팅(hoisting)이라 부르지만 명세 용어는 아니고, 코드가 실제로 위로 옮겨지지 않는다.
    - 선언 처리에서 하는 일: 바인딩(binding)을 한 번 정의한다. 함수 선언은 함수 객체를 만들어 그 바인딩을 초기화한다. `var`는 바인딩을 만들고 `undefined`로 초기화한다. `= 10` 같은 대입과 함수 표현식은 이때 평가하지 않는다.
    - 실행 단계: `var x = 식`은 그 줄에 도달했을 때 대입만 한다. 맨 바깥의 함수 선언문은 아무 일도 하지 않고 지나간다(블록 안 함수 선언 제외).
    - 같은 이름의 선언: 순서와 무관한 규칙(선언 처리가 끝나면 값은 함수, `var` 선언은 그 값을 undefined로 바꾸지 않음)으로 쓰고, 맨 바깥 명세는 "함수 선언과 같은 이름의 `var`는 처리 목록에서 빠진다", 함수 안은 순서가 다르지만 결과가 같다고 밝힌다. 같은 이름의 함수 선언이 여러 개면 마지막 것이 쓰인다.
    - 실행 여부와 무관: 실행되지 않는 줄(`if (false)` 안)의 `var`도 선언 처리 단계에서 찾는다(블록·스코프 설명 없이 "별도 개념" 한 줄).
    - 찾을 수 없는 이름과의 차이: 선언하지 않았고 호스트가 제공하지도 않는 이름을 읽으면 ReferenceError, `var`로 선언했지만 대입 전이면 `undefined`. `typeof`는 둘 다 `'undefined'`라 구별하지 못한다([typeof 연산자](/concepts/typeof-operator) 링크).
    - 함수 표현식: `var triple = function …`은 선언 처리에서 `triple`이 `undefined`일 뿐이라, 대입 전에 `triple(3)`을 호출하면 `undefined`를 호출하려는 것이 되어 TypeError([함수 호출](/concepts/function-calls)의 "함수가 아닌 값에 `()`를 붙이면 TypeError"와 연결). `const`·`let`이면 다른 오류(ReferenceError)이고 별도 개념이라는 한 줄.
  - `## 예제`: 예제 5개를 `file=` 코드 펜스로(순서: var-before, decl-vs-expr, same-name, 그 뒤 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`, 이어서 unexecuted-var, duplicate-function). `PredictQuiz` 5개(예제마다, 선택지 3~4개, 여러 줄 출력이면 ' / ' 구분 안내, `decl-vs-expr` 퀴즈에는 'TypeError로 멈춤' 선택지 포함, 정답은 실제 출력). `console`은 호스트 API라는 한 줄.
  - `## 결과와 이유`: JSX `<table>`(예제 / 출력 / 이유), 예제별 이유 문단, `Callout type="misconception"` 5개: ① "호이스팅은 선언을 코드 맨 위로 옮기는 것이다" ② "선언문보다 앞에서 변수를 읽으면 항상 오류가 난다"(`var-before` vs 선언하지 않은 이름) ③ "함수 표현식도 함수이므로 선언문보다 먼저 호출할 수 있다"(`decl-vs-expr`) ④ "실행되지 않는 줄의 `var`는 선언되지 않는다"(`unexecuted-var`) ⑤ "같은 이름을 다시 선언하면 값이 `undefined`로 돌아간다"(`same-name`, `var a = 1; var a;` → 1).
- 주의사항: 미학습 개념(실행 컨텍스트, 스코프, TDZ, 전역 객체)을 설명하지 않는다. 같은 대상은 같은 이름("선언 처리", "실행", "대입", "함수 선언", "함수 표현식"). "호이스팅(hoisting)", "함수 선언(function declaration)", "함수 표현식(function expression)"은 처음 나올 때 영어 병기. "메모리에 올린다", "끌어올린다(실제로)" 같은 표현 금지. 스타일 권고(예: "var 대신 let을 써라") 금지. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/hoisting/index.html`에 `<details` 5개 이상, 시뮬레이터 0단계 텍스트, 라디오 3개 이상, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 남은 `**` 0건.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch1-12.md`
- 변경: function-calls 케이스를 본떠 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y 시뮬레이터 케이스는 시나리오 라벨 3개(`var 선언 전 참조`, `함수 선언과 함수 표현식`, `같은 이름의 var와 함수`)의 모든 단계(합계 19단계, 반복 상한은 최대 단계 수보다 크게). 빌드 블록(주석 "열한 번째 개념(hoisting)"): `단계 1: 실행 전`, `아직 코드를 실행하지 않았습니다.`, `아직 만들어진 이름이 없습니다.`, region `aria-label="호이스팅 시뮬레이터"`, 시나리오 라벨 3개, `<details` 5개 이상. content-guide 9단계 목록에 `hoisting` 추가. 로드맵 8번 행의 계획 문서(`` `hoisting.md` ``)·상태(`완료(콘텐츠 검토 대기)`)를 갱신하고 진행 기록 한 줄을 추가한다.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~6을 확인하고 스크린샷 1장 이상.

## 9. 추가 개선 후보
- 기존 개념의 "호이스팅은 별도 개념/다음 개념" 단순화 문구(`function-calls/meta.ts:72`, `equality-operators/meta.ts:91`, `increment-decrement/meta.ts:77`, `property-keys/meta.ts:91`, `primitives-and-objects/meta.ts:31`, `short-circuit-evaluation/meta.ts:75`)에 이 페이지 연결, `function-calls`의 `related`에 `hoisting` 추가(기존 개념 파일 수정이라 사용자 확인 필요).
- function-calls 계획 9절의 선행 라벨 slug 연결과 함께 처리할 수 있다.

## 변경 이력
- 2026-10-27 (사용자 요청 — 감수 검토 반영, "공부용 문서라 오류가 있으면 안 된다"): 명세와 다른 설명·오개념 위험 수정 — 영향 단계 2·3·5·6, meta.
  - H1: "함수 선언을 먼저 처리해서 이긴다", "이미 만든 이름이라 var를 건너뛴다"는 시간 순서 인과를 없앤다. 명세(16.1.7)는 바인딩을 만들기 전에 함수 선언과 같은 이름의 var를 처리 목록에서 빼고, 함수 안(10.2.11)은 var를 먼저 만든 뒤 함수로 덮는다(순서 반대, 결과 같음). 본문은 순서와 무관한 규칙("선언 처리가 끝나면 값은 함수, var 선언은 그 값을 undefined로 바꾸지 않음")으로 쓰고, 맨 바깥 명세 처리는 "처리 목록에서 빠진다"로 서술. 시뮬레이터 `same-name`의 `var item` 선언 처리 단계를 **삭제**(사용자 결정) → 단계 수 5/8/**6**, 합계 19. 선언 처리 순서 테스트 규칙: 함수 선언(같은 이름은 마지막) 소스 순서 → 함수 선언 이름과 겹치지 않는 var 이름 소스 순서(이름 중복 제거).
  - H2: 단순화 5 "함수 안도 같은 방식"을 "처리 순서·매개변수와 같은 이름일 때 규칙이 다름, 별도 개념"으로. 근거 vm: `function f(x){ var x; return x } f(1)` → 1.
  - M1: ReferenceError는 "선언하지 않았고 호스트가 제공하지도 않는, 어디에서도 찾을 수 없는 이름". 오해 상자 2는 범위 한정.
  - M2: "맨 바깥의 함수 선언문은 실행 단계에서 아무 일도 하지 않는다"로 범위 한정(부록 B.3.2 블록 함수 제외).
  - M3: 바인딩(binding)을 한 번 정의하고 "바인딩을 만들고 undefined로 초기화"로 용어 통일. "이름이 undefined로 만들어진다" 제거.
  - M4: 배지 `var 선언`/`함수 선언` → `var 선언으로 생김`/`함수 선언으로 생김`.
  - L1: 함수 선언은 "함수 객체를 만들어 그 바인딩을 초기화". L2: 단순화 3을 var(기존 값 유지)와 함수 선언(함수로 바꿈)으로 나눔(vm: sandbox `existing: 'host'`에서 `var existing` → 'host', `function existing(){}` → function). L3: "명세는 호이스팅을 정의하지 않는다(문법 이름 HoistableDeclaration과 일부 노트에만 등장)". L4: 요약에 "같은 이름의 함수 선언이 없다면" 조건. L5: 선언 처리가 스크립트 하나 단위라는 단순화 추가(vm: 같은 컨텍스트의 두 스크립트), 오해 상자 1 제목 "파일 맨 위로" → "코드 맨 위로".
  - 새 주장은 `concept.test.ts` 본문 주장 검증에 추가한다.
- 2026-10-27 (사용자 요청 — 감수 검토 [중] "클래식 스크립트 전제 미명시"): 동작 원리 첫 문단에 클래식 스크립트 기준임을 밝히고, "ES 모듈과 Node.js 파일에서는" 절 추가. 확인 결과 지적보다 차이가 커서 함께 반영: ES 모듈은 InitializeEnvironment(16.2.1.7.3.1)로 선언을 처리하고 바인딩이 전역 객체 프로퍼티가 아니며 strict mode, 그리고 모듈 Early Errors(16.2.1.1) 때문에 예제 3(same-name)·5(duplicate-function)는 모듈에서 SyntaxError. Node CommonJS 파일은 예제 출력은 같지만 module wrapper 때문에 전역 프로퍼티가 생기지 않음(`node -e`는 클래식처럼 동작해 검증에 못 씀 → 임시 `.cjs` 파일). 단순화 3·9에 "클래식 스크립트" 한정, 참고 자료에 명세 2개·Node 문서 2개 추가. `concept.test.ts`에 실행 방식 검증 5건(별도 node 프로세스) 추가 — 영향 단계 1·5.

## 구현 진행

- baseline (2026-10-27, `66915ea`): lint·format:check·typecheck 오류 0, `npm test` 946 통과(43 파일), `test:build` 84 통과, e2e 151 통과·3 건너뜀(기존 의도된 3건). 사용자 dev 서버가 5173에서 실행 중(건드리지 않고 빌드 결과 `serve`로 확인)
- [x] 1. 예제·meta·route·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 182 통과, lint·typecheck 0. 예제 5개가 scratchpad 초안과 `cmp` 동일, 실제 출력 = 2절 표. summary 137자, `객체`는 simplifications 3번(전역 객체)에만. 본문 주장 6건 검증(`concept.test.ts`)
- [x] 2. 상태 모델·시나리오·실제 실행 대조 테스트 — 메인 재실행: vitest(개념·examples·content-integrity) 205 통과, lint·typecheck·prettier 0. 단계 수 5/8/7. 음성 확인 ①~④는 서브에이전트 보고(각 2건 실패, `cmp`로 원복 확인). 메인이 단계 설명을 검토해 1곳 수정: `same-name`의 `var item` 선언 처리 설명을 "이름이 이미 있다"에서 "같은 이름의 함수 선언이 item을 이미 만들었다"로(명세는 함수 선언 이름과 겹치는 var 이름을 declaredVariableNames에 넣지 않음). 선언 처리 순서 테스트는 겹치는 var도 단계로 두는 계획 규칙(소스 순서·이름 중복 제거)대로 구현
- [x] 3. HoistView — 메인 재실행: vitest(개념) 38 통과, lint·typecheck·prettier 0. 코드 확인: `useId`만 사용(창 크기·localStorage 없음), 섹션 제목 `<p id>`, 클래스 문자열이 CallView와 같음(import 없음), 함수 값 `wrap`. 계획과 다른 점(수용): 현재 단계 항목에 `지금` 배지와 함께 `bg-highlight` 배경(배지 텍스트가 있어 색만으로 구분하지 않음)
- [x] 4. Simulator 래퍼 — function-calls 래퍼와의 diff가 import·타입·주석·label·View뿐. Simulator.test 3개 통과(다음 클릭 시 2번 줄 `var score = 10;` 강조)
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 2절 명세·vm 근거와 대조(결론 수정 없음). 본문의 "`const`나 `let`으로 선언하면 같은 호출이 ReferenceError"를 검증하려고 `concept.test.ts`에 `let` 호출 케이스 1줄 추가(계획 1단계 목록 보강). 메인 재실행: `npm test` 999 통과(46 파일), prettier 0, 서브에이전트 빌드 결과 HTML `<details` 5·라디오 3(시나리오 선택)·빈 상태 문구 2·region aria-label 있음·공백 깨진 code 0·`**` 0
- [x] 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인 — 테스트 4개 파일은 추가만(서브에이전트), content-guide 9단계 목록·로드맵 8번 행/진행 기록은 메인이 수정. 메인 재실행 전체 검증(변경 이력 반영 후): lint·format:check·typecheck 0, `npm test` 1004(baseline 946), `test:build` 91(baseline 84), e2e 163 통과·3 건너뜀(baseline 151·3). 브라우저(빌드 결과 `serve` 4175, Playwright, 사용자 dev 서버 5173은 건드리지 않음): 1280px 다크·375px 라이트에서 단계 수 5/8/6, 전 단계 가로 넘침 0, `var-before` 2단계 `score = undefined`·`var 선언으로 생김`·`새로 생김`, 4단계 `값이 바뀜`, `decl-vs-expr` 3단계 double(함수)·triple(undefined) 함께, 7단계 triple 함수, `same-name` 2단계 item 함수(var item 단계 없음), 4단계 `item = 1`·`함수 선언으로 생김`·`숫자`, 콘솔 3종 일치, 키보드 →×3/←/Home = 단계 4/3/1, 콘솔 에러 0, "검토 중" 배지·분류 '실행 모델'. 홈 그룹 '언어 기초 | 실행 모델', 카드 11, `객체` 2건, `호이스팅` 1건. 스크린샷 2장(scratchpad)
- 감수 검토 반영(변경 이력 2026-10-27): 메인이 본문·시나리오 설명·meta를 직접 수정(H1·H2·M1~M3·L1~L5), 서브에이전트가 배지 문구(M4)·테스트(단계 수 5/8/6, 선언 처리 순서 규칙에서 함수 이름과 같은 var 제외, 본문 주장 a~e 추가) 수정. 음성 확인: `same-name`에 `var item` 선언 단계를 다시 넣으면 선언 순서·단계 수·declaredBy·changed 테스트 실패(서브에이전트 보고, `cmp` 원복)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff가 개념 폴더 1개 + 테스트 추가 + 문서 2줄이라 sub agent 생략): Critical/High 0. 계획 문서 본문에 변경 이력 이전 값(단계 수 7·합계 20, `var item` 단계, 옛 배지 문구, 오해 상자 1 제목)이 남아 있던 것을 메인이 갱신(문서만). Low 1(보고만): `HoistView.tsx` 진행 단계 목록의 현재 항목에 `aria-current`가 없음(텍스트 배지 `지금`이 있어 정보는 전달됨, axe 위반 0)
- 클래식 스크립트 전제 반영 후 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 1016(number-type 7건·hoisting 5건 추가 포함), `test:build` 91, e2e 163 통과·3 건너뜀

## 구현 결과

### 계획 대비 실제 구현
- 작업 순서 1~6을 계획대로 구현했다. 사용자 감수 검토 반영 2건으로 계획을 바꿨다(`## 변경 이력`): ① 명세와 다른 설명·오개념 위험 수정(H1·H2·M1~M4·L1~L5) — 시뮬레이터 `same-name`의 `var item` 선언 처리 단계 삭제(단계 수 5/8/7 → 5/8/6, 사용자 결정), 선언 처리 순서 테스트 규칙을 GlobalDeclarationInstantiation대로(함수 선언과 같은 이름의 var 제외), 배지 `var 선언으로 생김`/`함수 선언으로 생김`, 본문 용어(바인딩·함수 객체)와 범위 한정 ② 클래식 스크립트 전제 명시 — "ES 모듈과 Node.js 파일에서는" 절 추가, 예제 3·5가 모듈에서 SyntaxError임을 밝힘.
- 본문 주장 검증은 계획 6건에서 17건(+ 실행 방식 5건)으로 늘었다.
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. 계획 문서 본문의 옛 값(변경 이력 이전)을 갱신했다. Low 1건(`HoistView.tsx` 진행 단계 현재 항목에 `aria-current` 없음, `지금` 배지로 정보 전달·axe 위반 0)은 보고만 했다.

### 후속 작업
- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록(6번 `property-keys`, 7번 `function-calls`도 대기 중)
- [ ] 리뷰 Low 1건 정리 여부(선택)
- [ ] 9절 추가 개선 후보(기존 개념의 "호이스팅은 별도 개념" 문구에 이 페이지 연결)
- [ ] 로드맵(1~12장) 8개 개념 완료 — 다음 학습 진도(13장 이후) 확인

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 시뮬레이터 상태를 손으로 쓰되, 예제 원문 맨 앞과 각 실행 단계 줄 뒤에 컨텍스트 안에서 `typeof`로 읽는 스냅샷 코드를 끼워 실제 값과 대조했다 — 호스트에서 sandbox 객체를 읽으면 대입 전 `var`가 없는 것처럼 보여(V8 vm 동작) 틀린 근거가 된다(`concept.test.ts` `runWithSnapshots`, 계획 2절).
- [Claude 판단] ES 모듈·CommonJS 주장은 vm 스크립트로 재현할 수 없어 테스트가 별도 node 프로세스(`--input-type=module`, 임시 `.cjs` 파일)를 띄운다. `node -e`는 클래식 스크립트처럼 동작해 CommonJS 검증에 쓰지 않았다(변경 이력 2번째).
- [Claude 판단] 감수 의견 4건 중 "예제 3 제거"와 "console.log 문장 삭제"는 따르지 않았다 — 예제 3의 동작은 명세가 결정적으로 정하고 틀린 것은 설명이었으며, console 문장은 프로젝트 규칙(언어/호스트 구분)이다.
- [무검토 승인] 오류 동작(TypeError·ReferenceError·SyntaxError)은 예제 파일로 만들지 않고 본문 서술 + `concept.test.ts` 검증으로 다뤘다 — 예제는 실행이 멈추면 출력 검증이 안 되고, `try`/`catch`는 미학습 문법이다(계획 3절).
- 같은 이름의 var와 함수 선언은 "순서와 무관한 규칙"으로 가르치고, 시뮬레이터의 `var item` 단계는 뺐다(사용자 결정) — 맨 바깥(16.1.7)과 함수 안(10.2.11)의 처리 순서가 반대라 시간 순서 설명은 오개념이 된다.
- 분류는 `execution`(실행 모델), 추가 항목 4개(같은 이름 var/함수, 실행되지 않는 줄의 var, 찾을 수 없는 이름, 같은 이름 함수 두 번)는 사용자가 골랐다.

#### 배경지식
- 클래식 스크립트는 ScriptEvaluation이 GlobalDeclarationInstantiation(선언 처리)을 마친 뒤 본문을 평가(실행)한다. 함수 선언은 InstantiateFunctionObject로 함수 객체를 만들어 바인딩을 초기화하고, var는 바인딩을 만들어 undefined로 초기화한다. 함수 선언과 같은 이름의 var는 처리 목록에서 빠진다.
- 함수 안(FunctionDeclarationInstantiation)은 var 이름(함수 이름 포함)을 먼저 undefined로 만든 뒤 함수를 넣고, 매개변수와 같은 이름의 var는 인수 값으로 시작한다.
- ES 모듈은 InitializeEnvironment가 모듈 환경 레코드에 바인딩을 만들고(전역 객체 프로퍼티 아님, strict), 함수 선언이 lexical 선언이라 같은 이름의 var나 함수 선언과 겹치면 Early Error(SyntaxError)다.

#### 확인 질문
1. `same-name` 예제에서 1번 줄이 `function`인 이유를 "함수가 먼저 처리돼서"라고 설명하면 왜 부족한가?
   <details><summary>답</summary>맨 바깥 코드에서 명세는 바인딩을 만들기 전에 함수 선언과 같은 이름의 var를 처리 목록에서 뺀다(16.1.7). 함수 안에서는 오히려 var 바인딩을 먼저 undefined로 만든 뒤 함수로 덮는다(10.2.11). 순서가 반대여도 결과는 같으므로 "선언 처리가 끝나면 값은 함수, var 선언은 그 값을 undefined로 바꾸지 않는다"가 맞는 규칙이다(본문 "같은 이름의 선언", 변경 이력 H1).</details>
2. 스냅샷 테스트에서 sandbox 객체를 호스트 쪽에서 `hasOwnProperty`로 읽지 않고 컨텍스트 안 코드로 읽는 이유는?
   <details><summary>답</summary>vm 컨텍스트에서 대입 전 var 바인딩은 호스트 쪽 sandbox 객체에 아직 보이지 않아 `absent`로 나온다. 컨텍스트 안에서 `typeof`로 읽어야 undefined로 초기화된 바인딩을 정확히 얻는다(계획 2절 스냅샷 시제품, `concept.test.ts` `runWithSnapshots`).</details>
3. 같은 예제 5개를 Vite 프로젝트(ES 모듈)에 넣으면 무엇이 달라지나?
   <details><summary>답</summary>var-before·decl-vs-expr·unexecuted-var 출력은 같지만, same-name과 duplicate-function은 모듈 Early Errors(16.2.1.1)로 SyntaxError라 실행되지 않는다. 또 바인딩이 전역 객체 프로퍼티가 아니라 `window.score`는 undefined다(본문 "ES 모듈과 Node.js 파일에서는", `concept.test.ts` 실행 방식 테스트).</details>
4. 본문의 "맨 바깥의 함수 선언문은 실행 단계에서 아무 일도 하지 않는다"에서 "맨 바깥의"를 빼면 어떤 경우에 틀리나?
   <details><summary>답</summary>sloppy mode의 블록 안 함수 선언은 명세 부록 B.3.2에 따라 실행 단계에서 그 함수를 바깥 var 바인딩에 넣는 일을 한다. 그래서 범위를 맨 바깥으로 한정하고 블록 함수는 단순화 6에서 제외했다(변경 이력 M2).</details>
