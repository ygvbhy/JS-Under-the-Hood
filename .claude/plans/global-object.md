# 추가 게시글 '전역 객체' 구현 계획

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `38da435`

## 0. 요약

- 목적: 추가 게시글(21장 후반) `/concepts/global-object`를 추가한다. 전역 객체가 코드보다 먼저 호스트에 의해 만들어지고 명세가 정한 프로퍼티(값·함수·생성자·기타)와 호스트가 더한 프로퍼티를 가진다는 것, `globalThis`와 global this value의 관계, `Math` 같은 이름이 전역 환경 레코드에서 찾히는 경로와 가리기, 읽기 전용 `undefined`·`NaN`·`Infinity`, 빌트인 전역 함수, `eval`의 직접·간접 호출을 예제 12개, 퀴즈, 표로 보인다(사용자 결정 2026-10-30: 주제 4개 모두, 시각화는 표 + 퀴즈).
- 범위: 새 개념 폴더 1개(category `objects`, order 205 — 실행 컨텍스트 뒤·클로저 앞, 시뮬레이터 없음), 학습 순서·'객체' 검색 고정값 테스트 갱신, e2e·빌드 테스트 추가, content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 22개 파일은 바꾸지 않는다.
- 위험: ① 호스트 동작(브라우저 WindowProxy, `window`, `console`)을 ECMAScript 동작처럼 쓰는 것 ② 예제 실행기(vm 새 컨텍스트)가 전역 `var` 프로퍼티의 디스크립터를 명세와 다르게(configurable true) 보고하는 것 → 호스트 의존 결과는 예제로 만들지 않고 본문에만 호스트라고 밝히며, 전역 `var` 디스크립터는 vm 예제로 출력하지 않고 `node -e`(일반 스크립트) 자식 프로세스로 검증한다.
- 복잡도: 중간 · Consensus: 생략. primitive-methods(표 + 퀴즈, 표 데이터 파일을 본문과 테스트가 공유)와 같은 기존 패턴이고 공통 코드 변경이 없다. 명세 원문과 vm·Chromium·일반 Node 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵 추가 게시글 후보 "전역 객체: globalThis와 빌트인 전역 프로퍼티·함수"(21장 후반)를 새 개념 페이지로 만든다(사용자 선택 2026-10-30).
- 기본 주제: ① 전역 객체란 무엇인가 — 실행 전에 만들어지고(호스트가 정한 객체이거나 `Object.prototype`을 프로토타입으로 하는 보통 객체), 명세가 정한 프로퍼티와 호스트가 더한 프로퍼티, 코드가 만든 프로퍼티를 구분 ② `globalThis`와 global this value — `globalThis` 프로퍼티의 초기값은 `[[GlobalThisValue]]`이고 호스트가 전역 객체와 다른 객체로 정할 수 있다.
- 추가 주제(사용자 결정 2026-10-30, 모두 포함):
  - ③ `Math`가 찾히는 경로와 가리기: 전역 환경 레코드는 선언적 칸을 먼저, 객체 칸(전역 객체의 프로퍼티)을 나중에 본다. 전역 `let Math`는 `Math`를 가리고(선언문 전 참조는 ReferenceError), 전역 `var Math`는 프로퍼티 자체를 바꾼다. `globalThis.x = …`로 만든 프로퍼티도 식별자로 찾힌다.
  - ④ 읽기 전용 `undefined`·`NaN`·`Infinity`: 쓰기·삭제 불가. sloppy 대입은 무시, strict 대입은 TypeError, 전역 `let`·`const`·`class`로 같은 이름 선언은 SyntaxError(어떤 줄도 실행 전), 함수 안에서는 선언할 수 있다.
  - ⑤ 빌트인 전역 함수: `isNaN`·`isFinite`(ToNumber 변환) vs `Number.isNaN`·`Number.isFinite`(변환 없음), `parseInt`·`parseFloat`(ToString 후 앞부분만, 기수, `0x`, `parseInt(0.0000005)`가 5), `encodeURI` vs `encodeURIComponent`, 잘못된 입력의 `decodeURIComponent`는 URIError.
  - ⑥ `eval`: 직접 호출(식별자 `eval`로 부르고 값이 %eval%)은 그 자리의 환경에서, 간접 호출(`(0, eval)(…)`, `globalThis.eval(…)`)은 전역 환경에서 평가. 직접 호출의 non-strict `var`는 부른 함수의 변수 환경에 생기고 `let`·`const`는 eval 안에만 있다. strict eval은 `var`도 eval 안에 둔다.
- 이미 다룬 내용은 요약 + 링크: 전역 `var`·함수 선언·암묵적 전역은 전역 객체의 프로퍼티, `let`·`const`는 아님([블록 스코프](/concepts/block-scope)), 전역 환경 레코드 두 칸([실행 컨텍스트](/concepts/execution-context)), sloppy 함수의 `this`([this](/concepts/this-binding)), 모듈·CommonJS 차이(hoisting·block-scope 표기 따름).
- 시각화: 표 + 퀴즈(사용자 결정). 표 "전역 객체 프로퍼티의 출처"는 데이터 파일로 두고 본문과 테스트가 공유한다(primitive-methods `wrapper-table.ts` 패턴).

### 유지해야 하는 기존 동작

- 기존 개념 22개의 페이지·테스트 결과는 그대로, 파일은 수정하지 않는다(역방향 연결은 사용자 결정으로 나중에 일괄).
- 홈 '객체' 검색 첫 카드 '원시 값과 객체'(`tests/e2e/navigation.spec.ts:18`) 유지 — `primitives-and-objects`가 `fundamentals` 분류라 학습 순서·제목 정렬 모두에서 앞이다(`app/concepts/primitives-and-objects/meta.ts:8`, `localeCompare(…, 'ko')`로 '원시' < '전역' 확인).
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위

- `window`·`document`·`setTimeout`·`process` 등 호스트 API의 동작(표에 "호스트가 더한 것"으로 이름만)
- 여러 realm(iframe 등), 전역 객체의 프로토타입 체인으로 찾히는 이름
- `eval`의 `new.target`·`super` 제약, HostEnsureCanCompileStrings(CSP 등으로 막히는 경우는 한 줄), `Function` 생성자, eval 안의 함수 선언
- `eval` 사용 권장 여부·성능 같은 평가(명세가 정하지 않는 내용)
- 모듈의 최상위 `this`(`undefined`) 상세 — 한 줄 언급
- 기존 페이지의 "별도 개념" 문구를 이 페이지 링크로 바꾸는 것

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안, 2026-10-30 내려받아 확인)

- 19 The Global Object(`#sec-global-object`): 전역 객체는 어떤 실행 컨텍스트에 들어가기 전에 만들어지고, `[[Construct]]`·`[[Call]]`이 없어 `new`나 함수 호출로 쓸 수 없으며, `[[Prototype]]`은 호스트가 정하고, 명세가 정한 것 외에 호스트가 정한 프로퍼티(자기 자신을 값으로 하는 프로퍼티 포함)를 가질 수 있다.
- InitializeHostDefinedRealm(`#sec-initializehostdefinedrealm`): 호스트가 특정 객체를 전역 객체로 요구하면 그 객체, 아니면 `OrdinaryObjectCreate(%Object.prototype%)`. 호스트가 전역 스코프의 this를 전역 객체가 아닌 다른 객체로 요구하면 그 객체가 thisValue, 아니면 전역 객체. `NewGlobalEnvironment(global, thisValue)` → SetDefaultGlobalBindings(`#sec-setdefaultglobalbindings`, 19장의 프로퍼티 정의) → 호스트 정의 전역 프로퍼티 생성.
- 19.1 Value Properties(`#sec-value-properties-of-the-global-object`): `globalThis`(`#sec-globalthis`) 초기값 = `realm.[[GlobalEnv]].[[GlobalThisValue]]`, 속성 { writable: true, enumerable: false, configurable: true }. `Infinity`·`NaN`·`undefined` 속성 { writable: false, enumerable: false, configurable: false }.
- 19.2 Function Properties(`#sec-function-properties-of-the-global-object`): `eval`, `isFinite`, `isNaN`, `parseFloat`, `parseInt`, URI 함수 4개(`decodeURI`, `decodeURIComponent`, `encodeURI`, `encodeURIComponent`). 19.3 Constructor Properties(`#sec-constructor-properties-of-the-global-object`, `Object`·`Array`·`Number`·`String`·`Promise` 등), 19.4 Other Properties(`#sec-other-properties-of-the-global-object`: `Atomics`, `JSON`, `Math`, `Reflect`).
- isNaN(`#sec-isnan-number`): `ToNumber(value)` 후 NaN이면 true. 명세 NOTE: NaN인지 확실히 확인하는 식은 `X !== X`.
- parseInt(`#sec-parseint-string-radix`): ToString → 앞 공백 제거 → 부호 → 기수 0 또는 16이면 `0x`/`0X` 제거·16진 → 기수 0이면 10 → 첫 비숫자 앞까지만 → 비면 NaN. 기수가 0이 아니고 2~36 밖이면 NaN. parseFloat(`#sec-parsefloat-string`): ToString → 앞 공백 제거 → StrDecimalLiteral을 만족하는 가장 긴 앞부분.
- URI 함수(`#sec-uri-handling-functions`, `#sec-encodeuri-uri`, `#sec-encodeuricomponent-uricomponent`, `#sec-decodeuricomponent-encodeduricomponent`).
- 전역 환경 레코드(`#sec-global-environment-records`): HasBinding·GetBindingValue는 `[[DeclarativeRecord]]`를 먼저, 없으면 `[[ObjectRecord]]`(binding object = 전역 객체)를 본다(`#sec-global-environment-records-hasbinding-n`, `#sec-global-environment-records-getbindingvalue-n-s`). GetThisBinding은 `[[GlobalThisValue]]`(`#sec-global-environment-records-getthisbinding`).
- GlobalDeclarationInstantiation(`#sec-globaldeclarationinstantiation`): 렉시컬 선언 이름마다 HasLexicalDeclaration이면 SyntaxError, HasRestrictedGlobalProperty(`#sec-hasrestrictedglobalproperty`, 전역 객체의 자기 프로퍼티가 configurable false이면 true)이면 SyntaxError. 명세 NOTE: "전역 var·함수 바인딩(non-strict direct eval이 만든 것 제외)은 configurable false라 제한된 전역 프로퍼티다."
- 직접 eval(`#sec-function-calls-runtime-semantics-evaluation`): 호출의 참조가 프로퍼티 참조가 아니고 이름이 `"eval"`이며 값이 %eval%와 SameValue이면 `PerformEval(arg, strictCaller, true)` — 이것이 direct eval. 그 밖의 호출(`(0, eval)(…)`, `globalThis.eval(…)`)은 %eval% 함수 호출 → `PerformEval(source, false, false)`(`#sec-eval-x`).
- PerformEval(`#sec-performeval`): 문자열이 아니면 그대로 반환. direct면 lexicalEnv = NewDeclarativeEnvironment(호출 컨텍스트의 LexicalEnvironment), variableEnv = 호출 컨텍스트의 VariableEnvironment. indirect면 둘 다 전역 환경 기준. strictEval이면 variableEnv = lexicalEnv. strictEval = strictCaller이거나 eval 문자열이 strict. 이어서 EvalDeclarationInstantiation(`#sec-evaldeclarationinstantiation`).
- 선언적 환경 레코드의 SetMutableBinding 등 const·읽기 전용 규칙은 block-scope·property-attributes가 이미 링크한 절과 같다.
- 호스트(HTML Standard, 구현 중 확인 2026-10-30): §7.3.2.1 Creating browsing contexts(`https://html.spec.whatwg.org/multipage/document-sequences.html#creating-browsing-contexts`) — "For the global object, create a new Window object." / "For the global this binding, use browsingContext's WindowProxy object." §7.2.3: WindowProxy는 Window 보통 객체를 감싸 대부분의 연산을 그 객체로 넘기는 exotic object. → 브라우저의 global this value(= `globalThis` 값)는 Window 자체가 아니라 WindowProxy. 이 차이는 `===`로 관찰되지 않으므로(Chromium에서 `this === globalThis`, `globalThis === window` 모두 true) 본문 설명만 하고 예제로 만들지 않는다.
- MDN ko: `Glossary/Global_object`, `Global_Objects/globalThis`, `Global_Objects/eval`, `Global_Objects/isNaN`, `Global_Objects/parseInt`, `Global_Objects/encodeURIComponent` — 구현 단계 1에서 200·내용 확인.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, 같은 Node의 `vm.runInThisContext`, Playwright Chromium)

| 확인한 것 | 결과 |
| - | - |
| `Math === globalThis.Math`, `parseInt === globalThis.parseInt`, 최상위 `this === globalThis` | 모두 true |
| `globalThis.answer = 42; answer` | 42 |
| `let Math = 'mine'` 뒤 `Math`, `globalThis.Math.max(1, 2)` | `mine`, `2` (Chromium도 같음) |
| `let Math` 선언문 앞에서 `Math.max(1, 2)` | ReferenceError |
| `var Math = 'mine'` 뒤 `Math`, `globalThis.Math` | `mine`, `mine` |
| `undefined = 'changed'; NaN = 0; Infinity = 0` 뒤 값 | `undefined NaN Infinity` |
| `delete globalThis.undefined` / `delete globalThis.Math` | false / true |
| strict에서 `undefined = 1`, `NaN = 0` | TypeError |
| 전역 `let undefined = 1`, `let NaN = 1` | SyntaxError(vm·Chromium 모두, 스크립트 전체가 실행되지 않음) |
| 함수 안 `let undefined = 'local'` | `local`, 바깥 `typeof undefined`는 `undefined` |
| `isNaN('hello')`, `Number.isNaN('hello')` / `isFinite('10')`, `Number.isFinite('10')` / `isFinite(null)` | true false / true false / true |
| `parseInt('12px')`, `parseFloat('3.14abc')`, `parseInt('ff', 16)`, `parseInt('0x1A')`, `parseInt(0.0000005)`, `String(0.0000005)` | 12, 3.14, 255, 26, 5, `5e-7` |
| `encodeURI('서울 & 부산')` / `encodeURIComponent(…)` | `%EC%84%9C%EC%9A%B8%20&%20%EB%B6%80%EC%82%B0` / `…%20%26%20…`, `decodeURIComponent('%E0%A4%A')`는 URIError |
| 함수 안 `eval('where')` / `(0, eval)('where')` / `globalThis.eval('where')` | local / global / global |
| 함수 안 `eval('var made = 1')` 뒤 함수 안 `typeof made` / 바깥 / `eval('let kept = 2')` 뒤 `typeof kept` | number / undefined / undefined |
| strict 함수 안 `eval('var s = 1')`, 비strict 함수에서 `eval("'use strict'; var s2 = 1")` 뒤 typeof | undefined, undefined |
| `eval(42)` | 42 |
| `new globalThis()`, `globalThis()` | TypeError, TypeError |
| **전역 `var a`·함수 선언 `g`의 디스크립터 configurable** | **Chromium·`vm.runInThisContext`: false(명세대로) / vm `runInNewContext`: true(명세와 다름)**. 같은 vm에서도 `delete a`는 false |

- 결론: 예제 실행기(`tests/helpers/run-example.ts:15`, `runInNewContext`)에서는 전역 `var`·함수 선언 프로퍼티의 디스크립터를 출력하는 예제를 쓰지 않는다. 본문의 "전역 var·함수 선언 프로퍼티는 configurable false" 주장은 `concept.test.ts`에서 `node -e`(일반 스크립트, `vm.runInThisContext`와 같은 전역) 자식 프로세스로 검증한다(closure의 `execFileSync` 패턴, `app/concepts/closure/concept.test.ts:1`).

### 사실 (코드에서 확인)

- 표 + 퀴즈 개념 참고 구현: `app/concepts/primitive-methods/`(`wrapper-table.ts`를 `content.mdx:1`과 `concept.test.ts:9`가 함께 import, 빌드 테스트 `tests/build/build-output.test.ts:632-645`, e2e는 페이지 axe `tests/e2e/a11y.spec.ts:531`·가로 스크롤 `tests/e2e/responsive.spec.ts:642`).
- 학습 순서: `sortByOrder`(`app/lib/concepts.ts:43`), 이전/다음(`:53-60`). 현재 order: execution-context 200, closure 210, for-let 220(`app/concepts/*/meta.ts`). order 205면 순위 21번째, closure 22번째, for-let 23번째(마지막 유지).
- 순위·개수를 고정한 테스트(for-let 작업에서 확인한 목록):
  - `tests/e2e/navigation.spec.ts`: 학습 순서 카드 22(`:78`, `:122`), 마지막 '22번째'(`:84`), '객체' 검색 6건(`:17`, `:32`, `:91`, `:109`)과 순위 `['1','9','16','17','18','19']`(`:98`), pager '1 / 22'(`:148`)·closure '21 / 22'와 이전 execution-context(`:158-166`)·for-let '22 / 22'(`:172`)
  - `tests/e2e/responsive.spec.ts:672` 홈 학습 순서 보기 카드 22
  - `app/lib/concepts.test.ts:104`, `:111-112` total·position 22
  - `app/components/concept/ConceptPager.test.tsx:18`, `:28` '1 / 22', '22 / 22'
- 검색 필드는 title·summary·tags(`app/lib/concepts.ts:72-78`). 새 제목에 '객체'가 들어가므로 '객체' 검색은 7건, 새 개념 순위 21이 추가된다.

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "전역 객체 프로퍼티의 출처" 표를 중심에 두고(명세 값·함수·생성자·기타 / 호스트 / 코드), 그 프로퍼티가 식별자로 찾히는 경로(전역 환경 레코드의 두 칸)와 읽기 전용 프로퍼티, 빌트인 전역 함수, eval 순으로 설명한다. 이미 다룬 var·let·암묵적 전역은 요약 + 링크.
- 표 데이터 `global-props.ts`: 행마다 출처(명세 값 프로퍼티 / 명세 함수 프로퍼티 / 명세 생성자 프로퍼티(일부) / 명세 기타 프로퍼티 / 호스트가 더한 것 / 코드가 만든 것), 이름 목록, 속성 설명. 명세 행은 테스트가 vm에서 이름 존재·typeof·값 프로퍼티 속성을 검사한다. 호스트·코드 행은 검사 대상이 아님을 데이터에 표시한다.
- 호스트 의존 결과(`typeof window`, 브라우저 `globalThis`가 WindowProxy)는 예제로 만들지 않고 본문에 "호스트가 정한다"로만 쓴다(AGENTS.md 예제 규칙).
- 전역 `let undefined`의 SyntaxError는 스크립트 전체가 실행되지 않아 예제 파일로 출력할 수 없다 → 본문 + 근거 테스트(`runInNewContext`가 SyntaxError를 던짐)로만. 함수 안 선언은 예제로.
- order 205, category `objects`(21장 빌트인 객체, primitive-methods와 같은 분류). prerequisites: execution-context, block-scope, property-attributes, type-coercion.
- 버린 대안
  - ① 시뮬레이터: 사용자 결정(표 + 퀴즈).
  - ② order 230(for-let 뒤): 21장 내용이 24장 클로저·for-let 뒤로 밀린다. 선수 개념(execution-context 200)보다 크면 되므로 205로 실행 컨텍스트 바로 뒤에 둔다(로드맵의 "9번 실행 컨텍스트 뒤 제안"과 일치).
  - ③ category `execution`: 전역 환경 레코드와 이어지지만 주제가 빌트인 전역 객체(21장)라 primitive-methods와 같은 `objects`.
  - ④ 전역 var 디스크립터를 vm 예제로: vm 새 컨텍스트가 명세와 다른 값을 보고해 예제 출력이 틀린 주장이 된다(2절).

## 4. 변경 파일

- 추가 `app/concepts/global-object/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `global-props.ts`(표 데이터), `concept.test.ts`
  - `examples/`: `builtin-lookup.js`, `shadow-math.js`, `var-math.js`, `readonly-sloppy.js`, `readonly-strict.js`, `local-undefined.js`, `is-nan.js`, `parse.js`, `uri.js`, `eval-direct.js`, `eval-var.js`, `eval-strict.js`
- 수정
  - `tests/e2e/helpers.ts`: `GLOBAL_OBJECT_PATH`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe 1개(primitive-methods 케이스 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 1개 추가, 홈 학습 순서 카드 22→23
  - `tests/e2e/navigation.spec.ts`: 학습 순서 카드 22→23(두 곳), 마지막 '23번째'(제목은 for-let 그대로), '객체' 검색 6→7(네 곳)과 순위에 '21' 추가, pager '1 / 23', closure '22 / 23'·이전 `global-object`·다음 for-let, for-let '23 / 23'
  - `app/lib/concepts.test.ts`: total 23, 마지막 for-let position 23
  - `app/components/concept/ConceptPager.test.tsx`: '1 / 23', '23 / 23'
  - `tests/build/build-output.test.ts`: global-object 프리렌더 describe(퀴즈 `<details` 개수, 표 행)
  - `docs/content-guide.md`: 9단계 e2e 목록에 `global-object`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 추가 게시글 후보 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 22개

## 5. 위험 요소

- 호스트 동작을 언어 동작처럼 씀(예: "globalThis는 window") → 본문은 "호스트가 정한다", 브라우저 예는 "브라우저에서는 …"으로 출처를 붙인다. `console`은 호스트 API임을 표에 명시. 메인이 본문 대조(단계 3).
- vm의 전역 var 디스크립터 차이로 틀린 예제 → 디스크립터 예제 금지, `node -e` 근거 테스트(단계 2).
- "undefined는 예약어"·"globalThis는 항상 전역 객체 자체" 같은 오개념 → 오해 Callout과 근거(19.1.4 속성, IHDR thisValue).
- eval 설명이 명세보다 넓게 일반화(예: "eval은 항상 지역 스코프") → 직접/간접 정의(호출 형태 + 값)를 명세 그대로, 예제 3개로 경계를 보인다.
- 예제가 빌트인을 바꿈(`var Math`, `undefined =`) → 예제마다 새 vm 컨텍스트라 다른 예제에 영향 없음(`tests/helpers/run-example.ts:15`). 본문에 "실제 코드에서 빌트인 이름을 덮어쓰지 말라" 같은 권고는 쓰지 않고 결과만 설명.
- 학습 순서 중간 삽입으로 고정값 테스트 다수 변경 → 4절 목록대로 갱신, 저장소 전체 `grep`으로 '22 /'·'toHaveCount(22)'·'22번째' 잔여 확인.
- '객체' 검색 결과 변화(7건) → navigation 기대값 갱신, 첫 카드 '원시 값과 객체' 유지 확인.
- `parseInt(0.0000005)`의 이유를 "부동소수점 오차"로 잘못 설명 → ToString 결과 `'5e-7'`의 앞부분 `5`라는 명세 단계로 설명.
- URI 예제 출력이 긴 문자열이라 375px에서 넘침 → 코드 블록·출력은 가로 스크롤 영역 안, e2e 가로 스크롤 검사.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성: 예제 12개 출력(L1), 표 데이터 검사(명세 행 이름·typeof·값 프로퍼티 속성), 본문 주장 근거 테스트(2절 실행 표 중 예제에 없는 것: 전역 `let undefined`·`let NaN`·`const Infinity` SyntaxError, `globalThis.eval` 간접, `eval(42)`, `new globalThis()` TypeError, `decodeURIComponent` URIError, `isFinite(null)`, `node -e` 전역 var·함수 선언 configurable false, `delete globalThis.Math` true), 퀴즈 정답 = expectedOutput·정답 위치 분산.
- 브라우저(`npm run dev` 재시작 후 `/concepts/global-object`): 375px에서 표·URI 출력 줄이 넘치지 않음, 다크 모드 표 가독성, JS 끔에서 퀴즈 `<details>` 정답, 홈 학습 순서 보기 21번째에 새 개념·closure 페이지 이전 링크가 global-object, '객체' 검색 7건.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route·표 데이터

- 대상: `app/concepts/global-object/meta.ts`, `route.tsx`, `global-props.ts`, `examples/*.js` 12개
- 현재: 폴더 없음
- 변경:
  - 예제(출력은 2절 실행 표에서 확인한 값, 처음엔 `expectedOutput: []`로 두고 `npm test`로 확인 후 채움):
    1. `builtin-lookup.js`: `Math === globalThis.Math`, `parseInt === globalThis.parseInt`, 최상위 `this === globalThis`, `globalThis.answer = 42;` 뒤 `answer`
    2. `shadow-math.js`: `try { console.log(Math.max(1, 2)); } catch (e) { console.log(e.name); }` → `let Math = 'mine';` → `Math`, `globalThis.Math.max(1, 2)` (ReferenceError / mine / 2)
    3. `var-math.js`: `var Math = 'mine';` → `Math`, `globalThis.Math` (mine / mine)
    4. `readonly-sloppy.js`: `undefined = 'changed'; NaN = 0; Infinity = 0;` → 세 값, `delete globalThis.undefined`
    5. `readonly-strict.js`: 첫 줄 `'use strict';`, `try { undefined = 'changed'; } catch (e) { console.log(e.name); }`
    6. `local-undefined.js`: 함수 안 `let undefined = 'local'` 반환값, 바깥 `typeof undefined`
    7. `is-nan.js`: `isNaN('hello')`/`Number.isNaN('hello')`, `isFinite('10')`/`Number.isFinite('10')`
    8. `parse.js`: `parseInt('12px')`, `parseFloat('3.14abc')` / `parseInt('ff', 16)`, `parseInt('0x1A')` / `parseInt(0.0000005)`
    9. `uri.js`: `const query = '서울 & 부산';` → `encodeURI(query)`, `encodeURIComponent(query)`
    10. `eval-direct.js`: 전역 `var where = 'global';`, 함수 안 `var where = 'local';` → `eval('where')`, `(0, eval)('where')`
    11. `eval-var.js`: 함수 안 `eval('var made = 1'); eval('let kept = 2');` → 함수 안 `typeof made, typeof kept`, 바깥 `typeof made`
    12. `eval-strict.js`: strict 함수(본문 첫 줄 `'use strict';`) 안 `eval('var inside = 1')` → `typeof inside`
  - meta: slug `global-object`, title `'전역 객체: Math와 parseInt는 어디서 찾을까'`, category `objects`, order 205, tags(`전역 객체`, `globalThis`, `global this value`, `빌트인 전역 함수`, `isNaN`, `parseInt`, `encodeURIComponent`, `eval`, `undefined`, `NaN`, `Infinity`, `전역 환경 레코드`), goals 4개(① 전역 객체 프로퍼티를 명세·호스트·코드 출처로 구분 ② `Math` 같은 이름이 전역 환경 레코드에서 찾히는 순서로 `let`·`var` 가리기 결과 예측 ③ 읽기 전용 전역 프로퍼티와 `isNaN`·`Number.isNaN` 같은 빌트인 전역 함수의 결과 예측 ④ `eval` 직접·간접 호출이 어느 환경에서 평가되는지 구분), prerequisites(execution-context, block-scope, property-attributes, type-coercion — slug 포함), related `['block-scope', 'execution-context', 'this-binding', 'hoisting']`, summary 160자 이하, reviewedAt null.
  - simplifications: ① 예제 결과는 전역 객체와 global this value가 같은 환경(Node vm) 기준이며, 브라우저처럼 둘이 다른 환경은 본문에서만 설명 ② 생성자·기타 프로퍼티는 일부 이름만 표에 적음 ③ 호스트가 더한 프로퍼티는 이름만, 동작은 다루지 않음(예제의 `console`도 호스트 API) ④ 전역 객체의 `[[Prototype]]`(호스트 정의)과 그 체인으로 찾히는 이름, 여러 realm은 다루지 않음 ⑤ eval은 직접·간접 호출의 환경과 `var`·`let`의 위치만 다루고, `new.target`·`super` 제약, 문자열 컴파일을 막는 호스트 정책(HostEnsureCanCompileStrings), eval 안의 함수 선언은 다루지 않음 ⑥ 모듈·CommonJS에서는 최상위가 전역 코드가 아니어서 결과가 다른 예제가 있음(this 등, 기존 페이지 표기 따름).
  - references(절 번호 라벨 금지): 2절 앵커 — The Global Object, Value Properties of the Global Object, globalThis, Function Properties of the Global Object, eval ( x ), PerformEval, isNaN, parseInt, encodeURIComponent, Global Environment Records, HasRestrictedGlobalProperty, GlobalDeclarationInstantiation, InitializeHostDefinedRealm, Function Calls(Runtime Semantics: Evaluation) — 와 MDN ko 6개.
  - `global-props.ts`: `{ source, names, attributes, note, checkable }[]` — 행: 명세 값 프로퍼티(`globalThis`, `Infinity`, `NaN`, `undefined`, 속성 설명), 명세 함수 프로퍼티(9개), 명세 생성자 프로퍼티(일부: `Object`, `Array`, `Number`, `String`, `Boolean`, `Symbol`, `Promise`, `Error`), 명세 기타 프로퍼티(`Atomics`, `JSON`, `Math`, `Reflect`), 호스트가 더한 것(브라우저 `window`·`document`·`setTimeout`, Node `global`·`process`·`setTimeout`, 둘 다 `console` — checkable false), 코드가 만든 것(전역 `var`·함수 선언, 암묵적 전역, `globalThis.x = …` 대입 — checkable false).
- 주의사항: 예제는 호스트 의존 출력 금지(`typeof window` 등), `console.log`에는 원시 값만, 전역 var 디스크립터 출력 금지.
- 완료 조건: `npm test` L1 12개 통과(출력 = 2절 표), content-integrity 통과, summary ≤160자, `grep -c '복사'` 0, MDN 링크 200.

### 2. 근거 테스트

- 대상: `concept.test.ts`
- 변경: ① `global-props.ts`의 checkable 행 — vm 새 컨텍스트에서 각 이름이 전역 객체의 자기 프로퍼티이고, 함수·생성자 행은 typeof function, 값 프로퍼티 행은 속성이 표와 같음(`globalThis`는 writable·configurable true, enumerable false, 나머지 셋은 모두 false) ② 2절 "본문 주장 근거" 목록을 vm으로 검사 ③ `execFileSync(process.execPath, ['-e', …])`로 일반 스크립트 전역에서 `var`·함수 선언 프로퍼티 configurable false, 암묵적 전역 true.
- 완료 조건: `npx vitest run app/concepts/global-object` 통과. 표 데이터의 한 속성을 일부러 틀리게 바꾸면 실패함을 한 번 확인 후 되돌림.

### 3. 본문 `content.mdx`

- 변경:
  - `## 동작 원리`: h3 — 전역 객체는 코드보다 먼저 있다(IHDR, `new`·호출 불가, 호스트가 더한 프로퍼티) / 전역 객체 프로퍼티의 출처(표, `global-props.ts`를 JSX `<table>`로 렌더, `<div className="my-6 overflow-x-auto">`) / globalThis와 global this value(최상위 `this`와 같은 값, 호스트가 다르게 정할 수 있음, 브라우저 예는 출처 표시) / 이름은 어디서 찾나(선언적 칸 → 객체 칸, `let`·`var` 가리기, 선언 전 참조 ReferenceError는 [TDZ](/concepts/tdz) 링크, var·함수 선언·암묵적 전역 요약 + block-scope 링크, 전역 var·함수 선언 프로퍼티는 configurable false라 `delete`가 실패) / 읽기 전용 undefined·NaN·Infinity(속성, sloppy·strict, 전역 렉시컬 선언 SyntaxError, 함수 안 선언 가능) / 빌트인 전역 함수(ToNumber·ToString 단계, `Number.isNaN` 등과 차이는 [암묵적 타입 변환](/concepts/type-coercion) 링크, URI 함수) / eval(직접 호출 정의, 환경, var·let 위치, strict, 간접 호출, 호스트가 막을 수 있음 한 줄)
  - `## 예제`: 예제 1~12, PredictQuiz 6개 이상(2 shadow-math, 3 var-math, 4 readonly-sloppy, 7 is-nan, 8 parse, 10 eval-direct 등, 정답 위치 분산)
  - `## 결과와 이유`: 예제별 설명, 오해 Callout ① globalThis는 언제나 전역 객체 자체다 ② undefined는 예약어라 선언할 수 없다 ③ isNaN과 Number.isNaN은 같다 ④ eval은 언제나 부른 자리의 변수를 본다 ⑤ console·setTimeout도 ECMAScript가 정한 전역 함수다
- 주의사항: 2절 사실만, '복사' 금지, 오류 메시지 인용 금지, 호스트 출처 표기, JSX 안 공백 든 인라인 code 주의, sloppy mode 첫 등장 표기("strict mode가 아닌 코드(흔히 sloppy mode라 부르며, 명세 용어는 non-strict code입니다)").
- 완료 조건: 메인이 본문을 2절과 문장 단위로 대조, `npm run build` 성공, HTML `<details` ≥ 6·`**` 0·공백 깨진 `<code>` 0, 퀴즈 정답 = expectedOutput.

### 4. 고정값 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로. a11y·responsive는 primitive-methods 케이스 모양으로 추가. 빌드 테스트는 `<details` 개수 ≥ 6과 표 행 텍스트(예: `encodeURIComponent`, `호스트`).
- 완료 조건: 저장소 전체 `grep`으로 '/ 22'·'toHaveCount(22)'·'22번째'·`'1', '9', '16', '17', '18', '19']` 잔여 없음, AGENTS.md 검증 순서 전체 통과, 6절 브라우저 확인.

## 변경 이력

- 2026-10-30 (사용자 요청 — 외부 콘텐츠 검토 10건, 명세·vm·Chromium·`node -e`로 확인 후 9건 반영): ① 예제 1 해설 "이 실행 환경에서는 전역 객체와 같아서" → `globalThis` 초기값과 최상위 `this`가 모두 `[[GlobalThisValue]]`라 어느 호스트든 true, simplifications ①도 "전역 객체와 global this value의 구별에 따라 결과가 달라지는 예제는 없다"로 ② "Node vm에서는 둘이 같은 객체"·"`===`로 비교해도 구별되지 않음" 삭제 → 스크립트는 전역 객체 자체를 참조할 수 없어 코드로 구별할 방법이 없음(본문·Callout ①) ③ 전역 `let undefined` SyntaxError의 기준은 configurable `false`(HasRestrictedGlobalProperty)이지 쓰기 불가가 아님을 명시, `let Math` 허용과 대비, 앞선 스크립트의 전역 `var` 이름을 `let`으로 선언하면 SyntaxError(vm `createContext` 두 스크립트·Chromium 확인, 대입으로 만든 프로퍼티는 허용) 추가, Callout ②도 configurable로 ④ goals ③ "isNaN·Number.isNaN 같은 빌트인 전역 함수" → "빌트인 전역 함수 isNaN과 Number.isNaN의 차이" ⑤ "console은 … 전역 객체가 아니라" → "전역 객체의 프로퍼티가 아니라" ⑥ "명세의 NOTE" → GlobalDeclarationInstantiation이 CreateGlobalVarBinding·CreateGlobalFunctionBinding을 deletable false로, EvalDeclarationInstantiation은 true로 부름(명세 원문 확인). 검토 제안의 "non-strict 직접 eval"은 너무 좁아(간접 eval도 EvalDeclarationInstantiation, `node -e`로 `(0, eval)` var 삭제 true 확인) "strict가 아닌 eval 코드가 전역에 var를 만들 때"로 씀, references에 세 절 추가 ⑦ 전역 객체 `[[Prototype]]` 두 문장 연결(호스트가 요구하지 않으면 Object.prototype) ⑧ `(eval)(…)`은 직접, `eval?.(…)`은 간접(vm·Chromium 확인) 한 문장 ⑨ 예제 2 퀴즈 보기 '3 / mine / 2' → 'TypeError / mine / 2'. 미반영 ⑩ '찾히다' 표기는 6개 파일 30곳(기존 개념 포함)이라 사용자 확인 대기. 근거 테스트 4개 추가(다른 스크립트 var→let, `(eval)`·`eval?.`, eval로 만든 전역 var 삭제). 범위·접근 방식 변화 없음 — 영향 단계 1·2·3.
- 2026-10-30 (사용자 요청 — 외부 콘텐츠 2차 검토 4건, 3건 반영): ① eval 첫 문단에서 `(eval)`·`eval?.` 문장 뒤의 "이 경우"가 간접 호출을 가리키게 됨 → "직접 호출이면"으로 바꾸고 경계 사례 문장을 문단 끝으로 ② 함수 선언은 var와 달리 기존 configurable 프로퍼티를 writable·enumerable true, configurable false로 다시 정의(CreateGlobalFunctionBinding, `node -e`로 `function Math() {}` 뒤 [true, true, false] 확인) → var와 구분한 문단 분리, 근거 테스트 추가 ③ configurable 문단 순서: "configurable false → 그래서 delete 실패" 다음에 "다만 eval …". ④ '찾히다' 표기는 1차와 같이 사용자 확인 대기. 영향 단계 2·3.

## 9. 추가 개선 후보

- 기존 개념 역방향 연결(사용자 결정: 나중에 일괄): execution-context·primitive-methods·this-binding·block-scope·scope-chain 단순화의 "전역 객체 … 별도 개념" 문구.
- 남은 추가 게시글 후보: "즉시 실행 함수·모듈 패턴".

## 구현 진행

- baseline (2026-10-30, `38da435`): 직전 커밋의 최종 검증 결과를 사용(그 뒤 변경은 계획 문서뿐) — lint 0 / format:check 통과 / typecheck 통과 / `npm test` 79파일 2365 통과 / `test:build` 190 통과 / e2e 343 통과·3 skipped. dev 서버 5173 실행 중(빌드 산출물과 무관).
- [x] 1. 예제·meta·route·표 데이터 — 예제 12개 실제 출력 = 2절 실행 표, summary 127자, MDN ko 6개 200(위임 보고), 예제 파일 끝 `\n`(메인 확인), `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/lib app/components` 493 통과(메인 재실행). `content.mdx`는 임시본(단계 3에서 교체).
- [x] 2. 근거 테스트 — `concept.test.ts` 41개: 표의 검증 행(이름·종류·속성), 본문 주장 12건(전역 렉시컬 SyntaxError와 어떤 줄도 실행되지 않음 포함), `node -e` 전역 var·함수 선언 configurable false. `npx vitest run app/concepts/global-object` 41 통과(메인 재실행). 변이 검사(표에 없는 이름 추가 → 실패) 후 원복(위임 보고).
- 호스트 근거 추가(메인): HTML Standard로 브라우저 global this value = WindowProxy 확인(2절).
- [x] 3. 본문 `content.mdx` — 동작 원리 h3 7개(표는 `globalProps`를 JSX `<table>`로, 가로 스크롤 region), 예제 12개, 퀴즈 7개(예제 2·3·4·7·8·10·11, 정답 인덱스 1·3·0·2·1·0·3, 정답 = expectedOutput), Callout 5개. 메인이 문장 단위로 2절과 대조해 4곳 수정: `globalThis`와 최상위 `this`가 같다는 문장에 "프로퍼티를 바꾸지 않았다면", WindowProxy 문장에 HTML 표준 근거와 `===`로 구별되지 않음, "전역 var·함수 선언은 configurable false"를 "새로 생긴 프로퍼티는"으로 좁히고 이미 있던 프로퍼티(`var Math`)는 속성이 그대로라는 문장 추가(`node -e`로 configurable true 확인, 근거 테스트 추가), URI 권고형 문장을 결과 설명으로. meta references에 HTML Standard 링크 추가. `npm run build` 성공, HTML `<details` 7·`**` 0·깨진 `<code>` 0·'복사' 0, `npx vitest run app/concepts/global-object tests/content-integrity.test.ts` 322 통과.
- [x] 4. 고정값 테스트·e2e·빌드 테스트·문서 — 1단계와 병렬로 위임해 변경 완료. 저장소 전체 `grep`으로 22 고정값 잔여 없음(메인). 전체 검증(메인 재실행, 2026-10-30): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 80파일 2431 통과 / `test:build` 197 통과 / e2e 349 통과·3 skipped(8.9m). dev 서버 재시작(제가 띄운 작업만 중지 후 재실행), `/concepts/global-object` 200.
- 리뷰 1차(critical-code-review, 메인 직접): High 1(수정) — 결과와 이유의 예제 11 설명이 `eval('var made = 1')`을 "3번 줄"로 가리킴(실제 2번 줄, 3번은 `let kept`) → "2번 줄"로 수정, 나머지 줄 번호 12개 예제 전부 파일과 대조, `test:build` 197 통과·빌드 HTML 반영 확인. Medium·Low 0. 계획 대비 차이: 퀴즈 7개(계획 ≥6), meta references에 HTML Standard 추가, 근거 테스트 1개 추가(`var Math` 속성 유지). 메인이 diff 확인(학습 순서 23, '객체' 7건·순위 '21' 추가, closure '22 / 23' 이전 global-object, for-let '23 / 23', concepts·ConceptPager 단위 테스트 통과). build·e2e 결과는 전체 검증에서 확인.
- 최종 검증(외부 검토 1·2차 반영 후, 2026-10-30): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 80파일 2435 통과 / `test:build` 197 통과 / 빌드 HTML `<details` 7·`**` 0·깨진 `<code>` 0 / e2e 349 통과·3 skipped(10.2m).

## 구현 결과

### 계획 대비 실제 구현

- 계획 8절 1~4단계대로 구현했다(1·4단계, 2·3단계는 각각 병렬로 위임). 달라진 점: 퀴즈 7개(계획 ≥6), 근거 테스트 46개(계획보다 늘어남 — 외부 검토 반영 주장 포함), meta references에 HTML Standard·CreateGlobalVarBinding·CreateGlobalFunctionBinding·EvalDeclarationInstantiation 추가.
- 구현 중 메인이 2절에 호스트 근거(HTML Standard: 브라우저 global this value = WindowProxy)를 추가했다.
- 승인 뒤 사용자 요청으로 외부 콘텐츠 검토 1차 10건 중 9건, 2차 4건 중 3건 반영(변경 이력). '찾히다' 표기는 미반영(사용자 결정 대기).

### 코드 리뷰

- critical-code-review 1차 High 1(예제 11 설명의 줄 번호 3→2) 수정, Medium·Low 0. 본문 지나친 일반화 4곳은 구현 중 메인이 명세 대조로 수정.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `reviewedAt` 기록
- [ ] '찾히다'(찾힙니다·찾혀 등) 표기: 기존 개념 포함 6개 파일 30곳 — 유지할지 사이트 전체 교체할지 사용자 결정(외부 검토 지적)
- [ ] 기존 개념 역방향 연결(execution-context·primitive-methods·this-binding·block-scope·scope-chain의 "전역 객체 … 별도 개념" 문구) — 사용자 결정으로 나중에 일괄
- [ ] 남은 추가 게시글 후보: "즉시 실행 함수·모듈 패턴"

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 전역 `var` 프로퍼티의 configurable은 예제(vm 새 컨텍스트)로 출력하지 않고 `node -e` 자식 프로세스로 검증했다 — vm 새 컨텍스트는 이 값을 true로 보고해 명세(false)·Chromium·일반 Node와 다르다. 예제로 쓰면 틀린 주장이 실행 검증을 통과해 버린다(2절 실행 표, `concept.test.ts` 'node -e' describe).
- [Claude 판단] 전역 `let undefined`의 SyntaxError는 예제 파일로 만들지 않고 본문 + 근거 테스트로만 다뤘다 — 실행 전 오류라 스크립트의 어떤 줄도 실행되지 않아 출력이 없다. 테스트는 앞에 둔 `globalThis.ran = true`가 실행되지 않았는지까지 확인한다.
- [Claude 판단] 구현 중 본문 일반화 수정: "전역 var는 configurable false"를 "새로 생긴 프로퍼티는"으로 좁히고 이미 있던 `Math`에 `var`를 쓰면 속성이 그대로라는 점을 `node -e`로 확인해 추가했다.
- [무검토 승인] order 205(실행 컨텍스트 뒤·클로저 앞)와 category `objects` — 21장 내용이지만 전역 환경 레코드(23장)를 전제하므로 선수 개념보다 큰 번호, 빌트인 객체라 primitive-methods와 같은 분류. 그 결과 학습 순서 고정값 테스트 5개 파일을 갱신했다.
- [무검토 승인] 호스트 의존 결과(`typeof window`, 브라우저 `globalThis` = WindowProxy)는 예제로 만들지 않고 본문에 출처를 붙여 설명.
- 다룰 주제 4개(가리기·읽기 전용·빌트인 전역 함수·eval), 표 + 퀴즈, 외부 검토 반영 — 사용자 결정.

#### 배경지식

- InitializeHostDefinedRealm: 호스트가 전역 객체와 전역 this 값을 따로 정할 수 있다(브라우저는 Window와 WindowProxy). `globalThis` 프로퍼티 초기값과 최상위 `this`는 둘 다 `[[GlobalThisValue]]`.
- 전역 환경 레코드는 선언적 칸을 먼저, 객체 칸(전역 객체 프로퍼티)을 나중에 본다 → 전역 `let Math`가 `Math` 프로퍼티를 가린다.
- HasRestrictedGlobalProperty는 configurable false인 전역 객체 프로퍼티 이름의 전역 렉시컬 선언을 SyntaxError로 막는다(쓰기 가능 여부가 아님).
- GlobalDeclarationInstantiation은 CreateGlobalVarBinding·CreateGlobalFunctionBinding을 deletable false로, EvalDeclarationInstantiation은 true로 부른다. var는 기존 프로퍼티를 그대로 두고, 함수 선언은 configurable인 기존 프로퍼티를 다시 정의한다.
- 직접 eval은 호출 형태(식별자 `eval`, 프로퍼티 참조 아님) + 값(%eval%)으로 정해진다.

#### 확인 질문

1. 전역 `let Math`는 되는데 전역 `let undefined`는 왜 SyntaxError인가? 둘 다 전역 객체 프로퍼티인데 무엇이 다른가?
   <details><summary>답</summary>HasRestrictedGlobalProperty는 그 이름의 전역 객체 프로퍼티가 configurable false인지를 본다. `undefined`는 configurable false, `Math`는 true다. 쓰기 가능 여부는 상관없다. 그래서 앞선 스크립트의 전역 `var` 이름(configurable false)을 `let`으로 선언해도 SyntaxError다. 근거: 2절 HasRestrictedGlobalProperty, 변경 이력 1차 ③, `concept.test.ts` 본문 주장 검증.</details>
2. [Claude 판단] 전역 `var a`의 configurable을 출력하는 예제를 왜 만들지 않았나? 만들었다면 무엇이 깨지나?
   <details><summary>답</summary>예제 실행기(vm 새 컨텍스트)는 이 값을 true로 보고해 명세의 false와 다르다. 예제로 만들면 expectedOutput이 true로 고정되어 틀린 주장이 실행 검증을 통과한다. 대신 `node -e`(일반 스크립트 전역)로 false를 검증했다. 근거: 2절 실행 표, `concept.test.ts` 'node -e' describe.</details>
3. 예제 1의 `this === globalThis`는 브라우저에서도 true인가? 전역 객체와 global this value가 다른 호스트에서도 그런 이유는?
   <details><summary>답</summary>true다. `globalThis` 프로퍼티의 초기값과 최상위 `this`(GetThisBinding)가 둘 다 `[[GlobalThisValue]]`이므로, 그 값이 전역 객체 자신(Window)이 아니라 WindowProxy여도 같다. 근거: 변경 이력 1차 ①, 2절 globalThis·GetThisBinding.</details>
4. 이미 있던 `Math` 프로퍼티에 전역 `var Math`와 전역 `function Math() {}`를 쓰면 프로퍼티 속성은 각각 어떻게 되나?
   <details><summary>답</summary>`var`는 CreateGlobalVarBinding이 기존 프로퍼티를 재사용해 속성이 그대로(configurable true)이고 값만 대입된다. 함수 선언은 CreateGlobalFunctionBinding이 configurable인 기존 프로퍼티를 writable·enumerable true, configurable false로 다시 정의한다. 근거: 변경 이력 2차 ②, `concept.test.ts` 'node -e' describe.</details>
5. `(eval)('x')`와 `eval?.('x')`, `globalThis.eval('x')` 중 직접 호출은 무엇이고 판정 기준은?
   <details><summary>답</summary>`(eval)('x')`만 직접 호출이다. 호출의 참조가 프로퍼티 참조가 아니고 이름이 `eval`이며 값이 %eval%일 때 직접 호출이다. 괄호는 참조를 유지하고, 옵셔널 호출은 이 CallExpression 규칙이 아니며, `globalThis.eval`은 프로퍼티 참조다. 근거: 2절 직접 eval, 변경 이력 1차 ⑧.</details>
