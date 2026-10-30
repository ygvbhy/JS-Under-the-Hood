# 추가 게시글 '즉시 실행 함수와 모듈 패턴' 구현 계획

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `21137db`

## 0. 요약

- 목적: 추가 게시글(14장 후반) `/concepts/iife-module-pattern`을 추가한다. 이 페이지는 전역 변수가 이름 충돌을 일으키는 이유, 즉시 실행 함수(IIFE)의 문법과 효과, 네임스페이스 객체, 모듈 패턴과 그 공개 객체의 변경, ES6 이후의 대안(블록 + `let`·`const`, 부록 B 블록 함수 선언)을 예제 11개와 비교표, 퀴즈로 보인다(사용자 결정 2026-10-30: 추가 주제 4개 모두, 시각화는 표 + 퀴즈).
- 범위: 새 개념 폴더 1개를 만든다(category `execution`, order 215는 클로저 뒤·for-let 앞, 시뮬레이터 없음). 개수·순위·'객체' 검색을 고정한 테스트를 갱신하고 e2e·빌드 테스트를 추가하며, content-guide와 로드맵도 고친다. 공통 코드와 기존 개념 23개 파일은 바꾸지 않는다.
- 위험: ① 부록 B(블록 안 함수 선언)는 웹 브라우저 호스트에서만 필수인데, 이것을 모든 호스트의 언어 동작처럼 쓸 위험 ② 한 파일 안의 이름 충돌 예제가 실제 여러 `<script>`에서도 결과가 같다고 오해하게 만들 위험 → 본문에 출처와 차이를 밝히고, 두 스크립트 차이는 근거 테스트로 확인한다.
- 복잡도: 중간 · Consensus: 생략. global-object(표 데이터 파일 + 퀴즈, `concept.test.ts`의 근거 검사)와 같은 기존 패턴이고 공통 코드를 바꾸지 않는다. 핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 1건(제목 문구, 구현 중 확정 가능)

## 1. 요구사항

### 요구사항

- 로드맵 추가 게시글 후보 "전역 변수를 줄이는 방법: 즉시 실행 함수·모듈 패턴"(14장 후반)을 새 개념 페이지로 만든다(사용자 선택 2026-10-30). 클로저(order 210)가 있어야 모듈 패턴을 설명할 수 있어 클로저 뒤에 둔다.
- 기본 주제
  - ① 전역 변수의 문제: 모든 스크립트가 전역 이름 공간 하나를 함께 쓴다. 같은 이름의 `var`는 값이 덮어쓰이고, 같은 이름의 함수 선언은 마지막 선언이 쓰인다.
  - ② IIFE의 기본: 함수 식을 만들자마자 호출한다. 안의 `var`·`let`과 함수 선언은 그 호출의 환경에 생기고 전역 환경 레코드나 전역 객체에는 생기지 않는다. 반환값은 식의 값이다.
  - ③ 모듈 패턴: IIFE가 반환한 객체 하나만 전역 이름으로 남기고, 상태는 클로저로 숨긴다. IIFE는 한 번만 실행되므로 인스턴스도 하나다. 이 점이 클로저 페이지 예제 6(`createAccount`, 부를 때마다 새 계정)과 다르다.
- 추가 주제(사용자 결정 2026-10-30, 모두 포함)
  - ④ IIFE 문법 상세: 문 위치에서 `function`으로 시작하면 식 문(ExpressionStatement)이 될 수 없어 함수 선언으로 읽힌다. 그래서 `function () {}()`와 `function f() {}()`는 SyntaxError다. 괄호 두 형태와 `!`·`void` 형태가 있다(반환값을 버리거나 바꾼다). 이름 있는 IIFE의 이름은 함수 안에서만 보인다. 앞 줄에 세미콜론이 없으면 두 줄이 호출식으로 이어져 TypeError가 난다(ASI).
  - ⑤ 네임스페이스 객체: 전역 이름 하나에 프로퍼티를 모은다. 이름 충돌은 줄지만 프로퍼티는 바깥에서 얼마든지 바꿀 수 있다.
  - ⑥ ES6 이후 대안: 블록 + `let`·`const`는 블록 밖에서 보이지 않는다. 하지만 sloppy mode의 블록 안 함수 선언은 부록 B 규칙에 따라 블록 밖(전역)에도 바인딩이 생긴다(strict mode에서는 생기지 않는다). ES 모듈(48장)은 "별도 개념"으로 언급만 한다.
  - ⑦ 모듈 공개 객체의 변경: 반환한 객체의 메서드는 바깥에서 바꿀 수 있지만, 숨긴 변수는 바꿀 수 없다(원래 메서드는 계속 같은 상태를 쓴다). `Object.freeze`로 공개 객체를 고정할 수 있다(sloppy에서는 대입이 무시되고, strict에서는 TypeError — property-attributes 페이지 링크).
- 이미 다룬 내용은 요약하고 링크한다: 암묵적 전역은 IIFE 안에서도 전역에 생긴다([블록 스코프](/concepts/block-scope)). 전역 `var`·함수 선언이 전역 객체의 프로퍼티가 된다는 것과 전역 `let`이 전역 객체 프로퍼티가 아니라는 것은 [전역 객체](/concepts/global-object)에서 다뤘다. 상태 은닉은 [클로저](/concepts/closure), 함수 선언의 호이스팅은 [호이스팅](/concepts/hoisting)에서 다뤘다.
- 시각화: 표 + 퀴즈(사용자 결정). 비교표 "전역 이름을 줄이는 방법"은 데이터 파일로 두고 본문과 테스트가 함께 쓴다(global-object `global-props.ts` 패턴).

### 유지해야 하는 기존 동작

- 기존 개념 23개의 페이지와 테스트 결과는 그대로 두고, 파일도 수정하지 않는다. "별도 개념" 문구를 이 페이지 링크로 바꾸는 역방향 연결은 사용자 결정에 따라 나중에 일괄로 처리한다. closure·for-let의 simplifications에 있는 "즉시 실행 함수…별도 개념" 문구도 그대로 둔다.
- 홈 '객체' 검색의 첫 카드는 '원시 값과 객체'로 유지한다(`tests/e2e/navigation.spec.ts:18`).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다.

### 제외 범위

- 반복문 안에서 IIFE로 `var`의 문제를 푸는 방법. for-let(order 220) 페이지 주제와 겹치고 사용자가 고르지 않았다. 9절 후보로 남긴다.
- ES 모듈(`import`/`export`, `<script type="module">`)의 동작. 48장 내용이고 예제 실행기가 지원하지 않는다.
- CommonJS·AMD·번들러 같은 호스트·도구별 모듈 체계
- 화살표 함수 IIFE(26장). 비교표에도 넣지 않는다.
- 클래스 private 필드(25장)
- 부록 B 블록 함수 선언의 세부 조건(같은 이름의 `let`이 있을 때, `switch`의 `case` 안 등)
- IIFE 안의 `this`. [this](/concepts/this-binding)에서 다룬 일반 함수 호출 규칙과 같으므로 언급하지 않는다.

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안 ES2027, 2026-10-30 내려받아 확인)

- 14.5 Expression Statement(`#sec-expression-statement`): `ExpressionStatement : [lookahead ∉ { {, function, async [no LineTerminator here] function, class, let [ }] Expression ;`. NOTE: function·class 키워드로 시작하면 FunctionDeclaration·ClassDeclaration과 모호해지므로 식 문이 될 수 없다. → 문 위치의 `function`은 선언으로만 읽힌다. 이름 없는 선언은 문법 오류이고, `function f() {}()`는 선언 뒤의 `()`가 빈 괄호 식이라서 문법 오류다.
- 15.2.5 InstantiateOrdinaryFunctionExpression(`#sec-runtime-semantics-instantiateordinaryfunctionexpression`): 이름 있는 함수 식은 `funcEnv = NewDeclarativeEnvironment(outerEnv)`를 만들고 `funcEnv.CreateImmutableBinding(name)`을 수행한 뒤, `funcEnv`를 환경으로 함수를 만든다. → 이름은 함수 안에서만 보이고 바깥 환경에는 바인딩이 생기지 않는다.
- 12.10.3.1 Interesting Cases of ASI in Statement Lists(`#sec-asi-interesting-cases-in-statement-lists`): 식으로 끝나는 줄 다음 줄이 `(`로 시작하면 세미콜론이 필요하다. 세미콜론이 없으면 두 줄이 함께 CallExpression으로 처리된다. 규칙 본문은 `#sec-rules-of-automatic-semicolon-insertion`이다.
- 16.1.7 GlobalDeclarationInstantiation(`#sec-globaldeclarationinstantiation`): `variableDecls`를 역순으로 돌며 함수 선언을 모은다. NOTE: "If there are multiple function declarations for the same name, the last declaration is used." → 같은 스크립트 안에서는 첫 호출부터 마지막 선언이 쓰인다. 스크립트마다 따로 실행되므로, 두 스크립트로 나뉘면 앞 스크립트가 실행되는 동안에는 앞의 함수가 쓰인다.
- 부록 B(`#sec-additional-ecmascript-features-for-web-browsers`): "required when the ECMAScript host is a web browser … normative but optional if the ECMAScript host is not a web browser." B.3.2 Block-Level Function Declarations Web Legacy Compatibility Semantics(`#sec-block-level-function-declarations-web-legacy-compatibility-semantics`)와 Changes to GlobalDeclarationInstantiation(`#sec-web-compat-globaldeclarationinstantiation`): strict가 아닌 코드에서 블록 안 함수 선언의 이름은 바깥(전역)에 var처럼 바인딩된다(블록을 평가하기 전에는 `undefined`). 블록의 함수 선언이 평가될 때 그 값이 바깥 바인딩에 들어간다.
- `!`(`#sec-logical-not-operator`)는 ToBoolean 결과를 뒤집는다. `void`(`#sec-void-operator`)는 피연산자를 평가한 뒤 `undefined`를 돌려준다.
- `Object.freeze`(`#sec-object.freeze`): SetIntegrityLevel(frozen). 쓰기 불가 프로퍼티에 대입하면 sloppy에서는 무시되고 strict에서는 TypeError다(property-attributes 페이지가 이미 다룬 규칙).
- ES 모듈(`#sec-modules`)은 언급하는 링크로만 쓴다.

### 사실 (실행 확인 — Node v24.22.1 vm `createContext` + `runInContext`, 예제마다 새 컨텍스트)

| 확인한 것 | 결과 |
| - | - |
| `function () {}()` / `function f() {}()` | SyntaxError / SyntaxError (스크립트 전체가 실행되지 않음) |
| `(function () { return 1 })()`, `(function () { return 2 }())`, `!function () { return 3 }()`, `void function () { return 4 }()` | 1, 2, false, undefined |
| `var a = 1⏎(function () { … })()` | TypeError(`1 is not a function`). `;(` 로 시작하면 정상 실행 |
| 초안 `iife-asi.js`(try 안 `var label = 'start'` 다음 줄 `(function…)()`, 뒤에 `;(` 형태) | `TypeError` / `undefined` / `실행` |
| IIFE 안 `var x`, `let y` 뒤 바깥 `typeof x`, `typeof y`, `'x' in globalThis` | undefined undefined false |
| 이름 있는 IIFE `countdown(2)` 재귀 후 바깥 `typeof countdown` | 2 / 1 / undefined |
| 초안 `name-collision.js`(한 파일에 `version`·`init`을 두 번 선언) | `B 준비` / `B 준비 B` |
| 같은 컨텍스트에서 스크립트 두 개를 차례로 실행(A, B) 후 `init()` | `A 준비` / `B 준비 B` / `B 준비` |
| 초안 `module-pattern.js` | `2` / `undefined undefined` / `3` |
| 초안 `module-replace.js`(메서드 교체 후 원래 메서드 호출, freeze한 객체에 sloppy 대입) | `999 1` / `1` |
| 블록 안 `const`·`let` 뒤 바깥 `typeof` | undefined undefined |
| sloppy 초안 `block-function.js`(블록 앞뒤 `typeof helper`) | `undefined` / `function`. 블록 뒤 `'helper' in globalThis`는 true |
| strict 블록 안 함수 선언 뒤 바깥 `typeof helper` | undefined |
| 함수 안 블록 함수 선언(sloppy): 함수 안 `typeof h` / 바깥 | function / undefined |
| IIFE 안 암묵적 전역 `leaked = 1` 뒤 `typeof leaked`, `'leaked' in globalThis` / strict | number true / ReferenceError |
| 네임스페이스 `App.count` 대입 후 값 | 대입한 값 |

- 위 표 중 예제로 쓰지 않는 SyntaxError, 두 스크립트 실행, 암묵적 전역은 본문 서술의 근거다. 이 셋은 `concept.test.ts`에서 다시 검사한다(global-object의 `errorNameOf` 패턴, `app/concepts/global-object/concept.test.ts:6-14`).

### 사실 (코드에서 확인)

- 표 + 퀴즈 개념 참고 구현: `app/concepts/global-object/`. 이 개념은 `global-props.ts`를 `content.mdx`와 `concept.test.ts`가 함께 쓰고, 빌드 테스트는 `tests/build/build-output.test.ts:647-660`, e2e는 페이지 axe(`tests/e2e/a11y.spec.ts:537-542`)와 가로 스크롤(`tests/e2e/responsive.spec.ts:653`)에 있다. 경로 상수는 `tests/e2e/helpers.ts:44`.
- 예제 실행기: `tests/helpers/run-example.ts`(vm 새 컨텍스트, sloppy 기본, 첫 줄 `'use strict';`면 strict).
- 현재 order: global-object 205, closure 210, for-let 220. order 215면 새 개념이 23번째, for-let이 24번째(마지막 유지)가 된다. 전체 개수는 23에서 24로 바뀐다.
- 개수·순위를 고정한 테스트(현재 값):
  - `tests/e2e/navigation.spec.ts`: 학습 순서 카드 23(`:78`, `:122`), 마지막 '23번째'(`:84`), '객체' 검색 7건(`:17`, `:32`, `:91`, `:109`)과 순위 `['1','9','16','17','18','19','21']`(`:98`), pager '1 / 23'(`:148`), closure '22 / 23'과 다음 링크 `/concepts/for-let`(`:158-167`), for-let '23 / 23'과 이전 링크 `/concepts/closure`(`:172-174`)
  - `tests/e2e/responsive.spec.ts:683`: 홈 학습 순서 보기 카드 23
  - `app/lib/concepts.test.ts:104`, `:110-112`: total 23, for-let의 prev가 closure이고 position 23
  - `app/components/concept/ConceptPager.test.tsx:18`, `:28`: '1 / 23', '23 / 23'
- 검색 대상은 title·summary·tags다(`app/lib/concepts.ts:72-78`). 새 개념의 tags에 '네임스페이스 객체'가 들어가므로 '객체' 검색은 8건이 되고 순위에 '23'이 추가된다.
- category `execution` 개념: scope-chain, block-scope, tdz, hoisting, execution-context, closure, for-let(`app/concepts/*/meta.ts:8`).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축은 문제(전역 이름 공간 하나)에서 시작해 방법(네임스페이스 객체 → IIFE → 모듈 패턴 → ES6 블록)을 차례로 보이고, 마지막에 방법별 비교표로 정리한다. 각 방법마다 예제 + 퀴즈를 둔다.
- 표 데이터 `approaches.ts`: 행마다 방법, 전역에 남는 이름(예제 기준), 바깥에서 볼 수 없는 것, 바깥에서 바꿀 수 있는 것, 예제 id(ES 모듈 행은 `null`)를 둔다. `concept.test.ts`는 예제가 있는 행마다 그 예제를 vm 새 컨텍스트에서 실행한다. 그리고 실행 전후 전역 객체의 자기 프로퍼티 이름 차이(`console` 제외)가 행의 "전역에 남는 이름"과 같은지 검사한다(행 데이터와 실제 동작이 어긋나지 않게 하려는 것). 블록 + `let`·`const` 행은 빈 목록이다. 이 페이지의 예제는 전역 `let`·`const`를 쓰지 않으므로 프로퍼티 비교로 충분하다. 이 전제도 테스트 주석에 쓴다.
- 이름 충돌은 한 파일 안의 두 "라이브러리" 구간으로 보인다(예제 실행기가 파일 하나를 스크립트 하나로 실행). 실제 여러 `<script>`에서는 앞 스크립트가 실행되는 동안 앞의 함수가 쓰인다는 차이를 본문에 쓰고, `concept.test.ts`에서 같은 컨텍스트에 스크립트 두 개를 차례로 실행해 근거를 검사한다.
- SyntaxError 형태(`function () {}()`)는 스크립트 전체가 실행되지 않아 예제 출력으로 보일 수 없다. 그래서 본문에 쓰고 근거는 테스트로 남긴다(global-object의 전역 `let undefined`와 같은 방식).
- 부록 B 예제(`block-function.js`)는 "웹 브라우저 호스트에서 필수, 그 밖의 호스트에서는 선택"이라고 본문과 simplifications에 밝힌다. 예제 결과는 부록 B를 구현한 호스트(브라우저, Node)의 결과라고 쓴다. strict 예제(`block-function-strict.js`)로 부록 B와 무관한 경우를 함께 보인다.
- 용어: '찾히다'는 쓰지 않는다. 표기를 유지할지 일괄로 바꿀지는 사용자 결정을 기다리는 중이므로, 새 페이지는 '찾는다'·'찾을 수 있다'로 쓴다.
- 장 범위: 전제는 클로저(24장)·전역 객체(21장)까지다. 화살표 함수(26장)·클래스(25장)는 쓰지 않고, ES 모듈(48장)은 "별도 개념"으로만 쓴다.
- order 215, category `execution`. prerequisites는 closure, global-object, block-scope, hoisting이고, related는 closure, global-object, block-scope, for-let이다.
- 버린 대안
  - ① 시뮬레이터: 사용자 결정(표 + 퀴즈). 환경 레코드 흐름은 클로저 시뮬레이터에 이미 있다.
  - ② order 230(for-let 뒤): 개수만 바뀌면 되는 215와 달리 마지막 개념이 바뀌어 고정 테스트를 더 많이 고쳐야 한다. 14장 주제라 for-let(15장)보다 앞이 자연스럽다.
  - ③ category `objects`: 주제가 스코프·클로저(실행 모델)라 closure와 같은 `execution`으로 둔다.
  - ④ SyntaxError를 `eval`로 잡아 예제로 출력: 본문 핵심이 아닌 `eval`이 끼어들어 예제가 흐려진다. 근거 테스트로 충분하다.

## 4. 변경 파일

- 추가 `app/concepts/iife-module-pattern/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `approaches.ts`(표 데이터), `concept.test.ts`
  - `examples/`(11개): `name-collision.js`, `namespace.js`, `iife-basic.js`, `iife-forms.js`, `iife-asi.js`, `named-iife.js`, `module-pattern.js`, `module-replace.js`, `block-let.js`, `block-function.js`, `block-function-strict.js`(부록 B와 무관한 strict 짝)
- 수정
  - `tests/e2e/helpers.ts`: `IIFE_MODULE_PATTERN_PATH`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe 1개(global-object 케이스와 같은 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 1개 추가, 홈 학습 순서 카드 23→24
  - `tests/e2e/navigation.spec.ts`: 학습 순서 카드 23→24(두 곳), 마지막 '24번째', '객체' 검색 7→8(네 곳)과 순위에 '23' 추가, pager '1 / 24', closure '22 / 24'와 다음 링크 `/concepts/iife-module-pattern`, for-let '24 / 24'와 이전 링크 `/concepts/iife-module-pattern`
  - `app/lib/concepts.test.ts`: total 24, for-let의 prev를 `iife-module-pattern`으로, position 24로
  - `app/components/concept/ConceptPager.test.tsx`: '1 / 24', '24 / 24'
  - `tests/build/build-output.test.ts`: iife-module-pattern 프리렌더 describe(퀴즈 `<details` 개수, 표 행 텍스트)
  - `docs/content-guide.md`: 9단계 e2e 목록에 `iife-module-pattern`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 추가 게시글 후보 상태와 진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 23개

## 5. 위험 요소

- 부록 B를 모든 호스트의 언어 동작처럼 씀 → 본문에 "웹 브라우저 호스트에서는 필수, 다른 호스트에서는 선택(Node도 구현)"을 쓰고, simplifications에 세부 조건 생략을 밝힌다. strict 예제와 짝을 짓는다(단계 3).
- 한 파일 이름 충돌 예제를 여러 `<script>`와 같다고 오해함 → 본문에서 차이를 설명하고 두 스크립트 근거 테스트를 둔다(단계 2).
- "IIFE를 쓰면 전역에 아무것도 생기지 않는다"는 과장 → 모듈 패턴은 결과를 담는 전역 이름 하나를 남긴다. IIFE 안의 암묵적 전역은 전역에 생긴다(본문 + 근거 테스트). 이 내용은 비교표의 "전역에 남는 이름" 열과 테스트가 함께 보증한다.
- "모듈 패턴이면 바깥에서 아무것도 못 바꾼다"는 과장 → module-replace 예제로 공개 객체의 메서드 교체를 보이고, 숨긴 변수만 보호된다고 쓴다.
- "괄호가 함수를 즉시 실행한다" 같은 원인 오설명 → 괄호는 문을 식으로 시작하게 만들 뿐이고(lookahead 제한 회피), 실행은 뒤의 `()` 호출이라고 명세 문법으로 설명한다.
- 클로저 페이지 예제 6과 내용이 겹침 → 모듈 패턴은 "IIFE로 한 번만 실행해 인스턴스가 하나이고 전역 이름이 하나"라는 차이에 초점을 두고, 상태 은닉 원리는 클로저 페이지 링크로 넘긴다.
- 예제 파일 줄 번호: `examples/**`는 Prettier 제외라 바뀌지 않는다. 본문의 "N번 줄" 언급은 파일 확정 후 대조한다(단계 3).
- 개수 고정 테스트 누락 → 2절 목록 전부를 단계 4에서 고치고 `npm test`·e2e로 확인한다.
- 접근성: 표는 `<table>`에 `<caption>` 또는 앞 문단 설명, `<th scope>`를 쓰고 `overflow-x-auto`로 감싼다(global-object 표와 같은 마크업).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 11개의 실제 출력이 `expectedOutput`과 같다(L1). 처음에는 `[]`로 두고 실제 출력을 확인한 뒤 채운다.
  - `concept.test.ts`: (a) `function () {}()`, `function f() {}()` → SyntaxError (b) 같은 컨텍스트 두 스크립트 → `A 준비` / `B 준비 B` (c) IIFE 안 암묵적 전역은 sloppy에서 전역 프로퍼티, strict에서 ReferenceError (d) 비교표 행마다 예제 실행 전후 전역 프로퍼티 차이 = 행 데이터.
  - 메인 에이전트가 본문의 모든 결과·원인 서술을 2절 사실과 대조한다. 줄 번호 언급은 예제 파일과 대조한다.
  - 참고 링크(명세 anchor 11개, MDN)를 실제로 열어 200과 내용을 확인한다.
- 브라우저(e2e 외 직접 확인, `npm run build && npm run start`)
  1. `/concepts/iife-module-pattern`을 375px로 연다 → 비교표가 표 영역 안에서만 가로 스크롤되고 페이지에는 가로 스크롤이 없다.
  2. 다크 모드로 바꾼다 → 표 테두리·코드 블록·Callout 대비가 읽힌다.
  3. 키보드 Tab으로 첫 퀴즈 라디오에 가서 선택하고 '정답 확인'을 누른다 → 정답과 설명이 보인다.
  4. JS를 끈 상태로 연다 → 퀴즈 정답이 `<details>`로 열람된다.
  5. 하단 학습 순서 → '23 / 24', 이전 closure, 다음 for-let.
  6. 홈 `?view=order` → 23번째에 새 개념이 있고 마지막은 24번째 for-let이다.

## 7. 미확정 사항

- [미확정] 제목 문구: 초안은 '즉시 실행 함수와 모듈 패턴: 전역 이름을 줄이는 방법'이다. 다른 페이지처럼 질문형('…은 왜 괄호로 감쌀까')으로 바꿀지는 사용자 검토 때 조정할 수 있다. 계획 구조에는 영향이 없다.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `app/concepts/iife-module-pattern/examples/*.js`(11개), `meta.ts`, `route.tsx`
- 현재: 폴더 없음
- 변경
  - 2절 초안대로 예제를 쓴다. `iife-basic.js`(결과값과 안의 `var`가 전역에 없음: `typeof temp`, `'temp' in globalThis`), `iife-forms.js`(괄호 두 형태, `!`, `void`의 결과값), `namespace.js`(프로퍼티 하나로 모으고 바깥에서 바꾸면 그대로 바뀜), `block-let.js`, `block-function-strict.js`(첫 줄 `'use strict';`)를 새로 쓰고 나머지는 2절 초안을 쓴다.
  - `meta.ts`: slug, title(7절 초안), summary(160자 이하), category `execution`, order 215, tags(즉시 실행 함수, IIFE, 모듈 패턴, 네임스페이스 객체, 전역 변수, 이름 충돌, 자동 세미콜론 삽입, ASI, 함수 식, 캡슐화, Object.freeze, 블록 함수 선언), goals 4개, prerequisites·related(3절), examples(처음엔 `expectedOutput: []`), simplifications, references(2절 명세 anchor + MDN), `reviewedAt: null`.
  - simplifications 후보: 한 파일 안 두 라이브러리 구간은 여러 `<script>`를 흉내 낸 것이다 / 부록 B 세부 조건은 생략한다 / ES 모듈·CommonJS·번들러는 다루지 않는다 / 비교표의 "전역에 남는 이름"은 이 페이지 예제 기준이다 / `console`은 호스트 API다 / 예제는 스크립트로 실행한 결과다.
  - `route.tsx`: global-object 템플릿을 복사한다.
- 이유: 출력을 추측하지 않고 실행 결과로 채운다(AGENTS.md 정확성 원칙).
- 주의사항: 예제에 화살표 함수·클래스·`import`를 쓰지 않는다. `console.log`에는 원시 값만 넘긴다. 파일 끝에 줄바꿈 하나를 둔다.
- 완료 조건: `npx vitest run tests/examples.test.ts`가 통과하고, 각 예제의 실제 출력이 2절 표의 값과 같다(다르면 멈추고 원인을 확인한다). 참고 링크 전부가 200이고 해당 내용이 있다.

### 2. 표 데이터와 근거 테스트

- 대상: `approaches.ts`, `concept.test.ts`
- 현재: 없음
- 변경: 3절 표 데이터를 만든다(행: 전역 `var`·함수 선언 / 네임스페이스 객체 / IIFE / 모듈 패턴 / 블록 + `let`·`const` / ES 모듈(예제 없음, "별도 개념")). `concept.test.ts`에는 6절 정확성 (a)~(d)를 넣는다.
- 이유: 본문의 예제 밖 주장과 표 데이터를 실행으로 보증한다.
- 주의사항: vm에서 던진 오류는 다른 realm이므로 `name`으로 비교한다(global-object `concept.test.ts:6`). (d)의 전역 프로퍼티 비교에서는 sandbox로 넣은 `console`을 제외한다.
- 완료 조건: `npx vitest run app/concepts/iife-module-pattern`이 통과한다. 음성 확인으로 표 데이터에서 이름 하나를 빼면 (d)가 실패하는지 확인한 뒤 되돌린다.

### 3. 본문 작성

- 대상: `content.mdx`
- 현재: 없음
- 변경: 필수 h2 3개(`동작 원리`·`예제`·`결과와 이유`)를 둔다. 동작 원리의 h3는 전역 이름 공간은 하나 / 네임스페이스 객체 / 즉시 실행 함수 / 괄호가 필요한 이유 / 앞 줄의 세미콜론 / 모듈 패턴 / 공개 객체는 바꿀 수 있다 / 블록과 let·const / 블록 안 함수 선언(부록 B) / 비교표다. 예제마다 PredictQuiz를 둔다(8개 이상). 오해 Callout 후보는 "괄호가 함수를 실행한다", "IIFE를 쓰면 전역에 아무것도 생기지 않는다", "모듈 패턴의 공개 객체는 바꿀 수 없다", "블록으로 감싸면 함수 선언도 블록 안에만 있다"이다.
- 이유: 사용자 결정 주제 ①~⑦을 모두 다룬다.
- 주의사항: 표는 JSX `<table>`로 쓰고 `approaches.ts`에서 그린다. 인라인 코드에 공백이 있으면 줄바꿈 위치를 확인한다(content-guide 99줄). '찾히다'는 쓰지 않는다. 호스트 동작(`console`, 브라우저 `<script>`, 부록 B)은 출처를 붙인다. 이미 다룬 내용은 링크로 넘긴다.
- 완료 조건: `npm test`(필수 h2·메타 무결성 포함)가 통과한다. 메인 에이전트가 본문의 결과·원인 문장을 2절과 하나씩 대조하고, "N번 줄" 언급을 예제 파일과 대조한다. `grep -n '찾히' content.mdx`의 결과가 없다.

### 4. 고정 테스트·e2e·빌드 테스트·문서 갱신

- 대상: 4절 수정 목록
- 현재: 개수 23, for-let 이전 closure
- 변경: 4절 수정 목록대로 고친다.
- 이유: 개념이 추가되면 개수·순위·이전/다음이 바뀐다.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만 한다. '객체' 검색 순위 배열은 실제 정렬 결과로 확인한다.
- 완료 조건: 6절 전체 검증 명령이 통과한다. 6절 브라우저 시나리오 1~6을 확인한다.

## 9. 추가 개선 후보

- "반복문의 var 문제를 IIFE로 푸는 방법" — for-let 페이지 보강 또는 짧은 절. 사용자 확인 대기.
- 기존 개념(closure, for-let)의 "즉시 실행 함수…별도 개념" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결을 일괄로 처리할 때 함께 한다.

## 변경 이력

- 2026-10-30 (외부 콘텐츠 검수 8건, 실행·명세로 확인 후 반영): ① 예제 10·11 1번 줄을 `typeof helper, 'helper' in globalThis`로 바꿔 부록 B 바깥 바인딩이 선언 처리 때 생김을 보임(sloppy `undefined true`, strict `undefined false` — typeof는 선언되지 않은 이름에도 `undefined`라 증거가 아님) ② 예제 `iife-asi` 설명: 초기화식 전체가 호출식이라 평가 중 예외, label에는 어떤 값도 대입되지 않음 ③ `Object.freeze`: 추가·삭제·쓰기를 막고 한 단계만 고정(얕음) 문장 추가 + 근거 테스트 ④ 예제 4에 괄호 없는 다섯째 형태 `var e = function () { return 5; }();` 추가 ⑤ 최상위 `let`·`const`·`class`도 스크립트 사이에서 전역 선언적 환경 레코드를 공유하고 다른 스크립트에서 같은 이름을 다시 선언하면 SyntaxError(근거 테스트) ⑥ 예제 5(iife-asi)와 6(named-iife) 순서를 바꿔 본문 참조 순서와 맞춤 ⑦ 이름 있는 함수 식 이름에 대입: sloppy 무시, strict TypeError 보강 ⑧ 테스트는 vm 스크립트 평가(`runInContext`)를 쓰므로 문제없음, 본문 "예제를 실행하는 Node"를 "스크립트로 실행한 Node"로 명확히 — 영향 단계 1·2·3 (사용자 요청 범위, 재승인 불필요)

## 구현 진행

- baseline (2026-10-30, `21137db`): lint 오류 0 / format:check 통과 / typecheck 통과 / `npm test` 80파일 2435개 통과 / test:build·e2e는 baseline 미실행(새 개념 폴더와 빌드가 겹치지 않게 최종 검증에서 실행, 직전 커밋 `21137db`에서 통과 기록)
- [x] 1. 예제·meta·route — 예제 11개 실제 출력이 2절 표와 같음(`tests/examples.test.ts` 통과), MDN 5개 200(ko Lexical_grammar는 404라 en-US로 대체), 명세 anchor 11개 확인. `#sec-web-compat-globaldeclarationinstantiation`은 현재 명세에서 `#sec-globaldeclarationinstantiation`의 oldids(같은 절)라 references에서 뺌(spec.html `oldids=` 확인). 모듈 simplification은 실제 원인(strict mode·모듈 환경·CommonJS 래퍼)으로 고침(모듈로 실행하면 name-collision은 SyntaxError, block-function은 undefined/undefined 확인)
- [x] 2. 표 데이터·근거 테스트 — `npx vitest run app/concepts/iife-module-pattern` 10개 통과, 음성 확인(globals에서 `init` 제거 시 실패) 완료
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 검토, `concepts.test.ts`·`ConceptPager.test.tsx` 통과, lint·typecheck 통과(e2e·test:build는 전체 검증에서)
- [x] 3. 본문 작성 — 메인 검토 후 명세 표현 5곳 수정(식 문 제한 이유는 `function`에 대한 것만, 빈 `()`는 식이 될 수 없음, ASI 규칙 문구, 이름 있는 함수 식의 선언적 환경 레코드, `<script>`는 호스트(HTML)). 본문 밖 주장 `var a = function () { return 1 }()` → 1 vm 확인. 줄 번호 언급 대조 완료, '찾히' 0건, 공백 인라인 코드 깨짐 0건
- 전체 검증 (2026-10-30): lint·format:check·typecheck 통과 / `npm test` 2468개 통과 / `npm run test:build` 204개 통과 / `npm run e2e` 355 passed, 3 skipped(기존과 같은 skip)
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0 · Low 2 보고(goals 2의 "괄호나 ! 같은 연산자를 필요로 하는 이유"는 문 맨 앞일 때만 해당 — 본문은 구분해 설명 / MDN Lexical grammar는 ko 404라 en-US 링크). 계획 대비 차이 1건(web-compat 링크 제외, oldids 근거) 타당
- 외부 검수 반영(2026-10-30, 변경 이력 참고): 예제 3개 수정(`iife-forms` 5번째 형태, `block-function`·`block-function-strict` 1~2번 줄에 `'helper' in globalThis`), 예제 5·6 순서 교체, 본문·퀴즈·결과와 이유 갱신, 근거 테스트 3개 추가(최상위 let 스크립트 간 재선언 SyntaxError, 이름 있는 함수 식 이름 대입 sloppy 무시·strict TypeError, freeze 얕음). 검증: lint·format:check·typecheck 통과 / `npm test` 통과 / `npm run test:build` 통과 / `npm run e2e` 355 passed, 3 skipped
- 외부 검수 2차 반영(2026-10-30, 3건, 실행 확인 후): freeze 설명을 데이터 프로퍼티(쓰기 불가)·모든 프로퍼티(삭제 불가)로 좁히고 접근자는 setter가 호출됨을 명시(근거 테스트 추가) / 예제 4 오답 보기 `1 2 false undefined SyntaxError` → `SyntaxError` / 최상위 let 재선언 목록에 함수 선언 추가(근거 테스트 추가), 전역 환경 레코드 공유는 전역 객체 링크, 스크립트 간 재선언 충돌은 블록 스코프 링크로 나눔

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 달라진 점: ① `#sec-web-compat-globaldeclarationinstantiation`은 현재 명세에서 `#sec-globaldeclarationinstantiation`의 옛 id라 참고 링크에서 뺐다 ② MDN Lexical grammar는 ko 404라 en-US로 연결 ③ 모듈 simplification을 실제 원인(strict mode·모듈 환경·CommonJS 래퍼)으로 고침 ④ 외부 검수 2회(변경 이력·구현 진행)로 예제 3개 수정(`iife-forms` 5번째 형태, `block-function`·`block-function-strict`에 `'helper' in globalThis`), 예제 5·6 순서 교체, 근거 테스트 5개 추가.

### 코드 리뷰
- critical-code-review: Critical·High 0, Low 2(목표 2 문구, MDN en-US 링크)는 보고만. 외부 검수 지적은 모두 실행·명세로 확인 후 반영.

### 후속 작업
- [x] 사용자 콘텐츠 검토 후 `reviewedAt` 기록(2026-10-30 사용자 승인, `reviewedAt: '2026-10-30'`)
- [ ] 반복문의 var 문제를 IIFE로 푸는 방법(9절 후보, 사용자 확인 대기)
- [ ] closure·for-let의 "즉시 실행 함수…별도 개념" 문구를 이 페이지 링크로 바꾸기(역방향 연결 일괄 처리 때)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 학습 순서 order 215(클로저 210과 for-let 220 사이) — 버린 대안: 230(for-let 뒤). 14장 주제라 15장 for-let보다 앞이 자연스럽고, 마지막 개념이 바뀌지 않아 고정 테스트 변경이 줄어든다(3절 ②).
- [Claude 판단] 비교표 "전역에 남는 이름"을 데이터 파일(`approaches.ts`)로 두고 테스트가 예제를 실행해 전역 객체 프로퍼티 차이와 대조 — 표 데이터와 실제 동작이 어긋나지 않게 하려는 것. 전역 `let`은 전역 객체 프로퍼티가 아니므로 예제가 최상위 let을 쓰지 않는다는 전제가 필요하다(`concept.test.ts` 주석).
- [Claude 판단] `function () {}()`의 SyntaxError, 두 스크립트 실행 차이, 암묵적 전역은 예제 파일이 아니라 근거 테스트로 검증 — SyntaxError는 스크립트 전체를 실행하지 못하게 하고, 예제 실행기는 파일 하나를 스크립트 하나로 실행하기 때문(3절).
- [Claude 판단] category `execution`(클로저와 같은 분류) — 버린 대안 `objects`. 주제가 스코프·클로저라서(3절 ③).
- 시각화는 시뮬레이터 대신 표 + 퀴즈, 추가 주제 4개(IIFE 문법 상세·네임스페이스 객체·ES6 이후 대안·공개 객체의 변경)는 사용자가 골랐다.
- 예제 10의 `typeof helper`만으로는 부록 B 바인딩의 증거가 아니라는 외부 검수를 받아 `'helper' in globalThis`를 함께 출력하게 바꿨다.

#### 배경지식
- 식 문(ExpressionStatement)은 `function`으로 시작할 수 없어서, 문 맨 앞의 `function`은 함수 선언으로만 읽힌다. `var` 초기화식처럼 문 맨 앞이 아닌 자리에서는 괄호 없이도 함수 식이다.
- 같은 스크립트 안에서 같은 이름의 함수 선언이 여럿이면 GlobalDeclarationInstantiation이 마지막 선언을 쓴다. `<script>`가 나뉘면 스크립트마다 따로 선언 처리·실행된다.
- 부록 B는 브라우저 호스트에서 필수, 그 밖에는 선택. sloppy 코드의 블록 안 함수 선언은 선언 처리 때 바깥에 `undefined`인 var 같은 바인딩을 만들고, 블록의 선언이 평가될 때 함수가 들어간다.
- `Object.freeze`는 한 단계만 고정하고, 접근자 프로퍼티의 setter는 여전히 호출된다.

#### 확인 질문
1. 예제 4의 다섯째 줄 `var e = function () { return 5; }();`는 괄호가 없는데 왜 SyntaxError가 아닌가?
   <details><summary>답</summary>식 문의 lookahead 제한은 문의 맨 앞에만 적용된다. `var` 초기화식 자리는 문의 맨 앞이 아니라 `function`이 함수 식으로 읽힌다(`content.mdx` "괄호가 필요한 이유", 명세 `#sec-expression-statement`).</details>
2. 예제 1을 두 `<script>`로 나누면 첫 출력은 왜 `A 준비`로 바뀌는가?
   <details><summary>답</summary>스크립트마다 따로 선언 처리·실행되므로 첫 스크립트가 실행되는 동안에는 B의 선언이 아직 처리되지 않았다. 한 파일이면 선언 처리에서 마지막 선언이 쓰여 첫 호출부터 B다(`concept.test.ts` 두 스크립트 테스트).</details>
3. 비교표 테스트가 예제에 최상위 `let`이 없다는 전제를 두는 이유는? 그 전제가 깨지면 무엇이 잘못되는가?
   <details><summary>답</summary>테스트는 전역 객체의 자기 프로퍼티 차이를 본다. 전역 `let`은 전역 환경 레코드의 선언적 칸에 생기고 전역 객체 프로퍼티가 아니라서, 최상위 `let`을 쓰면 전역에 남는 이름이 있어도 테스트가 놓친다(`concept.test.ts` 주석).</details>
4. 예제 10에서 `typeof helper`가 `undefined`인 것만으로 부록 B 바인딩이 있다고 말할 수 없는 이유는?
   <details><summary>답</summary>`typeof`는 선언되지 않은 이름에도 `'undefined'`를 돌려준다. 바인딩이 있음은 `'helper' in globalThis`가 sloppy에서 `true`, strict에서 `false`인 것으로 보인다(변경 이력 ①).</details>
5. 모듈 패턴 예제에서 `Counter.count = 100` 뒤에도 `increase()`가 3인 이유는?
   <details><summary>답</summary>`count`는 IIFE 호출의 환경 레코드의 바인딩이고, 대입은 반환한 객체에 새 프로퍼티를 만들 뿐이다. 둘은 다른 곳이다(`content.mdx` "모듈 패턴").</details>
