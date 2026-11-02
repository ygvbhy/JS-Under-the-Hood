# 개념 '화살표 함수와 메서드 축약' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `bde328b`

## 0. 요약

- 목적: 25~37장 로드맵 3번 `/concepts/arrow-functions`를 추가한다. 26장의 함수 구분(일반 함수 / 메서드 축약 / 화살표 함수)이 무엇을 바꾸는지(생성자 여부, `prototype`, 자기 `this`·`arguments`·`new.target`·`super`, 중복 매개변수)를 예제 6개와 비교표·퀴즈로 보이고, `arguments`의 대안인 rest 파라미터까지 다룬다(사용자 결정 2026-11-02).
- 범위: 새 개념 폴더 1개(category `execution`, order 250으로 학습 순서 마지막, 시뮬레이터 없음). 마지막 개념이 바뀌므로 개수·마지막 개념을 고정한 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 26개는 바꾸지 않는다.
- 위험: ① "화살표 함수는 바깥 this를 복사/캡처한다"처럼 명세와 다른 원인 설명(명세는 바인딩을 만들지 않고 바깥 환경에서 찾는다) ② this-binding 페이지와 중복 → `this`는 요약 + 링크, 비교표 칸은 실행 probe로 테스트가 대조.
- 복잡도: 중간 · Consensus: 생략. class-basics와 같은 "비교표 데이터 + probe 근거 테스트" 패턴이고 공통 코드를 바꾸지 않는다. 예제 출력과 핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 없음(slug·제목은 2026-11-02 사용자가 추천안으로 확정)

## 1. 요구사항

### 요구사항

- 로드맵 3번 "화살표 함수와 메서드 축약"(26장)을 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-02)
  - 범위: 화살표 함수·메서드 축약 + **rest 파라미터**. 매개변수 기본값은 다루지 않고 추가 게시글 후보로 둔다.
  - `arguments`: 다룬 페이지가 없으므로(function-calls가 "별도 개념"으로 미룸, `app/concepts/function-calls/content.mdx:21`) 이 페이지에서 일반 함수의 `arguments`를 짧게 설명한 뒤 화살표 함수와 비교한다.
  - 시각화: 함수 종류별 비교표 + 퀴즈(시뮬레이터 없음).
- 주제
  - ① 화살표 함수 문법: 매개변수 하나면 괄호 생략, 식 본문은 그 값을 반환, 블록 본문은 `return`이 필요, 객체 리터럴을 반환하려면 괄호로 감싼다(`() => { value: 1 }`의 중괄호는 블록, `value:`는 레이블).
  - ② 생성자가 아니다: 화살표 함수와 메서드 축약은 `new`하면 TypeError이고 `prototype` 프로퍼티가 없다. `function` 식을 값으로 쓴 프로퍼티(`old: function () {}`)는 생성자가 될 수 있다. `typeof`는 셋 다 `'function'`.
  - ③ `arguments` 객체(짧게): 일반 함수 안에서 넘긴 인수 전부를 담는다. 매개변수보다 많이 넘긴 인수도 읽을 수 있다. 배열이 아니다(`Array.isArray`가 false, `join`이 없음).
  - ④ 화살표 함수는 `this`·`arguments`·`new.target`·`super`를 자기 것으로 만들지 않고 바깥 환경에서 찾는다. 다른 객체로 옮겨 불러도 바뀌지 않는다. 바깥에 함수가 없는 전역 코드에서는 `arguments` 바인딩이 없다. `this`의 세부(call·bind 무시 등)는 [this](/concepts/this-binding)로 링크한다.
  - ⑤ 메서드 축약: `[[HomeObject]]`가 있어 객체 리터럴 안에서 `super`를 쓸 수 있다(`function` 식 프로퍼티는 SyntaxError). 메서드 안의 화살표 함수는 바깥 메서드의 `super`를 쓴다. 다른 객체로 옮겨도 `super`가 원래 자리에서 찾는 것은 [클래스 상속과 super](/concepts/class-inheritance)에서 본 것과 같다.
  - ⑥ 중복 매개변수: sloppy mode의 `function`은 `(a, a)`가 허용되지만 화살표 함수와 메서드 축약은 항상 SyntaxError(UniqueFormalParameters). 실행 전 오류라 예제로 못 보이므로 테스트가 확인한다.
  - ⑦ rest 파라미터: 남은 인수를 진짜 배열로 받는다. 화살표 함수에서도 쓸 수 있다. 마지막 매개변수여야 한다(아니면 SyntaxError, 테스트). 함수의 `length`에 세지 않는다.
- 이미 다룬 내용은 요약하고 링크한다: 호출과 매개변수는 [함수 호출](/concepts/function-calls), `this`는 [this](/concepts/this-binding), `new`는 [new 연산자](/concepts/new-operator), 클래스 메서드가 생성자가 아닌 것은 [클래스는 함수다](/concepts/class-basics), `super`·`[[HomeObject]]`는 [클래스 상속과 super](/concepts/class-inheritance), 바깥 환경에서 이름을 찾는 것은 [스코프 체인](/concepts/scope-chain)·[실행 컨텍스트](/concepts/execution-context).

### 유지해야 하는 기존 동작

- 기존 개념 26개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다. this-binding·class-basics·function-calls의 "별도 개념" 문구도 그대로 둔다(역방향 연결은 나중에 일괄 처리 — 사용자 결정).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다.

### 제외 범위

- 매개변수 기본값(추가 게시글 후보), mapped arguments(sloppy에서 `arguments[0]`과 매개변수가 연동되는 것), `arguments.callee`
- 제너레이터·async 화살표 함수, getter·setter 축약, 계산된 메서드 이름
- 화살표 앞 줄바꿈 금지 같은 문법 세부, `Function.prototype.toString`, 함수의 `name`
- 스프레드(35장), 배열 고차 함수(27장) — 예제에 쓰지 않는다
- "화살표 함수를 써야 한다/쓰지 말아야 한다" 같은 권고(동작 차이만 쓴다)

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안 ES2027, 2026-11-02 내려받아 확인)

- InstantiateArrowFunctionExpression(`#sec-runtime-semantics-instantiatearrowfunctionexpression`): `OrdinaryFunctionCreate(%Function.prototype%, …, lexical-this, envRecord, privateEnv)` 후 SetFunctionName만 한다(MakeConstructor 없음). Note: "An ArrowFunction does not define local bindings for arguments, super, this, or new.target. Any reference to arguments, super, this, or new.target within an ArrowFunction must resolve to a binding in a lexically enclosing environment."
- OrdinaryFunctionCreate(`#sec-ordinaryfunctioncreate`): "a new function with a default [[Call]] internal method and no [[Construct]] internal method (although one may be subsequently added by an operation such as MakeConstructor)". thisMode가 lexical-this면 `[[ThisMode]]`가 lexical.
- DefineMethod(`#sec-runtime-semantics-definemethod`): `OrdinaryFunctionCreate(…, non-lexical-this, …)` 후 `MakeMethod(closure, obj)`만 한다(MakeConstructor 없음). MakeMethod(`#sec-makemethod`): `func.[[HomeObject]]`를 obj로 설정.
- EvaluateNew(`#sec-evaluatenew`): "If IsConstructor(ctor) is false, throw a TypeError exception."
- FunctionDeclarationInstantiation(`#sec-functiondeclarationinstantiation`): "If func.[[ThisMode]] is lexical, then NOTE: Arrow functions never have an arguments object. Set argumentsObjNeeded to false."
- Function Environment Record HasThisBinding(`#sec-function-environment-records-hasthisbinding`): `[[ThisBindingStatus]]`가 lexical이면 false. HasSuperBinding(`#sec-function-environment-records-hassuperbinding`): lexical이거나 `[[HomeObject]]`가 undefined면 false. GetThisEnvironment(`#sec-getthisenvironment`)는 HasThisBinding이 true인 환경을 바깥으로 올라가며 찾는다. GetNewTarget(`#sec-getnewtarget`)도 GetThisEnvironment의 `[[NewTarget]]`.
- 함수 정의 Early Errors(`#sec-function-definitions-static-semantics-early-errors`): FunctionDeclaration·FunctionExpression의 FormalParameters·FunctionBody가 SuperProperty를 포함하면 SyntaxError. strict일 때만 UniqueFormalParameters 규칙을 적용(그래서 sloppy `function f(a, a)`는 허용).
- 화살표 문법(`#sec-arrow-function-definitions`): `ArrowFormalParameters : ( UniqueFormalParameters )`, `ConciseBody : [lookahead ≠ {] ExpressionBody | { FunctionBody }`. ExpressionBody 평가는 값을 ReturnCompletion으로 돌려준다(`#sec-arrow-function-definitions-runtime-semantics-evaluation`).
- 메서드 문법(`#sec-method-definitions`): `ClassElementName ( UniqueFormalParameters ) { FunctionBody }`.
- ExpectedArgumentCount(`#sec-static-semantics-expectedargumentcount`): `FormalParameters : FunctionRestParameter`는 0, `FormalParameterList , FunctionRestParameter`는 FormalParameterList의 개수(rest를 세지 않음). OrdinaryFunctionCreate가 이 값으로 `length`를 정한다.
- CreateUnmappedArgumentsObject(`#sec-createunmappedargumentsobject`): `OrdinaryObjectCreate(%Object.prototype%, …)`에 `length`와 인덱스 프로퍼티를 정의 → 배열이 아니라 일반 객체(`[[Prototype]]`이 Object.prototype). mapped도 arguments exotic object이고 배열이 아니다(`#sec-arguments-exotic-objects`).
- 구현 단계 1에서 rest 파라미터가 배열을 만드는 절(BindingRestElement의 IteratorBindingInitialization → ArrayCreate/CreateArrayFromList)과 FunctionRestParameter 문법 위치(마지막만 허용)를 원문으로 재확인한다.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, 예제마다 새 컨텍스트, 초안 파일 실행)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7ddacc7b-b220-47e4-ac13-18c879539011/scratchpad/arrow/`(구현 때 옮기고 다시 실행한다. 초안 전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| `arrow-syntax.js`(괄호 생략, 식 본문, 블록 본문 return 유무, `{ value: 1 }` 레이블 vs `({ value: 1 })`) | `8 5 undefined 5` / `undefined {"value":1}` |
| `not-constructor.js`(typeof 3종, `new` 일반 함수·function 식 프로퍼티, `new` 메서드 축약·화살표, `prototype` 유무) | `function function function` / `object object` / `TypeError` / `TypeError` / `true false false` |
| `arguments-object.js`(개수, 매개변수보다 많은 인수, 배열 아님) | `3 0` / `x y` / `false undefined` |
| `arrow-outer-bindings.js`(생성자 안 화살표의 this·arguments·new.target, 다른 객체로 옮겨 호출, 일반 함수 비교, 전역 화살표의 `typeof arguments`) | `A 2 true` / `A 2 true` / `B 3 false` / `undefined` |
| `method-super.js`(메서드 축약의 super, 메서드 안 화살표의 super, 다른 객체로 옮겨 호출) | `base+child base` / `base+child` |
| `rest-params.js`(화살표 rest 합계, 앞 매개변수 + rest, `length`) | `6 0` / `a:2:true b:0:true` / `0 1` |

- 예제로 보일 수 없는 주장(실행 전 SyntaxError) — vm 확인: `({ m(a, a) {} })`, `(x, x) => 1`, `{ m: function () { return super.x } }`, `function f() { return super.x }`, `(...a, b) => 1`, `(...a = []) => 1`, `function f(...a,) {}` 모두 SyntaxError. sloppy `function f(a, a) { return a } f(1, 2)`는 `2`.
- 전역 화살표에서 `arguments`를 `typeof` 없이 읽으면 ReferenceError(vm). `typeof arguments`는 vm 스크립트·Node ESM(`.mjs`)에서 `'undefined'`, Node CommonJS 파일(`.cjs`)에서 `'object'`(호스트가 파일을 함수로 감싸 실행하기 때문으로 보이며, 페이지에는 "CommonJS 파일로 실행하면 결과가 다르다"는 관찰만 쓴다).
- 피한 것: `Object.getOwnPropertyNames(function(){})`는 V8에서 `arguments,caller`가 자기 프로퍼티로 나온다(명세가 아닌 구현 확장). 예제는 `hasOwnProperty('prototype')`만 쓴다. 변수 이름 `top`은 브라우저 전역 `window.top`과 겹쳐 `topLevel`로 바꿨다.

### 사실 (코드에서 확인)

- 비교표 + probe 근거 테스트 패턴: `app/concepts/class-basics/comparison.ts:1-114`(칸 `{ text, probe, expected }`), `app/concepts/class-basics/concept.test.ts:115-195`(SyntaxError 테스트, 칸마다 새 컨텍스트 probe), 표 마크업 `app/concepts/class-basics/content.mdx`(스크롤 region div + `<table>`).
- 현재 마지막 개념은 class-inheritance(order 240, 26번째, `app/concepts/class-inheritance/meta.ts:9`). order 250이면 27번째이자 마지막.
- 고정값(현재)
  - `tests/e2e/navigation.spec.ts`: 카드 26(`:78`, `:122`), 마지막 '26번째'와 class-inheritance 제목(`:84-87`), '객체' 검색 10건(`:91`, `:109`)과 순위 `['1','9','16','17','18','19','21','23','25','26']`(`:98`), pager '1 / 26'(`:148`), '22 / 26'(`:158`), '24 / 26'(`:172`), class-basics '25 / 26'(`:186`), class-inheritance '26 / 26'·링크 1개(`:200-202`)
  - `tests/e2e/responsive.spec.ts:741` 홈 학습 순서 카드 26
  - `app/lib/concepts.test.ts:104`, `:108-112`: total 26, 마지막 class-inheritance(prev class-basics, position 26)
  - `app/components/concept/ConceptPager.test.tsx:18`, `:27-32`: '1 / 26', 마지막 class-inheritance '26 / 26'과 이전 링크 class-basics
- 검색은 title·summary·tags 포함 여부(`app/lib/concepts.ts:70-78`). 새 meta에 '객체'가 들어가면 '객체' 검색이 11건, 순위에 '27' 추가.
- e2e 등록: `tests/e2e/helpers.ts:46-48` 경로 상수, `tests/e2e/a11y.spec.ts:556-561`(class-basics 페이지 axe 케이스), `tests/e2e/responsive.spec.ts:677-685`(가로 스크롤 케이스). 빌드 테스트: `tests/build/build-output.test.ts:678-692`(class-basics 프리렌더 describe).
- 다룬 적 없는 것: `arguments` 객체(function-calls가 별도 개념으로 미룸, `app/concepts/function-calls/content.mdx:21`). 화살표 `this`는 this-binding이 상세히 다룸(`app/concepts/this-binding/content.mdx:72-76`, 예제 10 `arrow-this.js`), simplifications에 "화살표 함수의 구조와 문법 전반은 별도 개념"(`app/concepts/this-binding/meta.ts:108`).
- `[[HomeObject]]`·super는 class-inheritance가 클래스 기준으로 다룸(`app/concepts/class-inheritance/content.mdx:32-38`). 메서드 정의 문법이 생성자가 아닌 것은 class-basics가 클래스 메서드 기준으로 다룸(`app/concepts/class-basics/content.mdx` "메서드는 생성자가 아니다").

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "`typeof`는 셋 다 `'function'`이지만, 어떤 문법으로 만들었느냐에 따라 함수가 갖는 것(생성자 능력, `prototype`, 자기 `this`·`arguments`·`new.target`, `[[HomeObject]]`)이 다르다". 동작 원리 h3는 화살표 함수 문법 → 생성자가 아니다 → arguments 객체 → 화살표 함수가 바깥에서 찾는 것 → 메서드 축약과 super → 중복 매개변수 → rest 파라미터 → 비교표.
- 원인 서술은 명세 용어로 쓴다. "바깥 this를 캡처/복사/고정한다"가 아니라 "화살표 함수는 this 바인딩을 만들지 않으므로(함수 환경 레코드의 `[[ThisBindingStatus]]`가 lexical), `this`를 만나면 바깥 환경으로 올라가 this 바인딩이 있는 환경의 값을 쓴다"로 쓴다. `arguments`·`new.target`도 같다. 생성자가 아닌 이유는 "만들 때 `[[Construct]]`를 붙이지 않는다(MakeConstructor를 부르지 않음)"로, `prototype`이 없는 이유도 같은 곳에서 설명한다.
- 비교표 `comparison.ts`: 열은 일반 함수(`function` 식, sloppy 스크립트) / 메서드 축약(객체 리터럴) / 화살표 함수. 칸은 `{ text, probe, expected }`, 행에 `exampleId`. 행(7개):
  1. typeof — `'function'` ×3 (`not-constructor`)
  2. `new` — 객체 생성 / TypeError / TypeError (`not-constructor`)
  3. `prototype` 프로퍼티 — 있음 / 없음 / 없음 (`not-constructor`)
  4. `o.f()`로 부를 때 this — `o` / `o` / `o`가 아님(바깥 this) (`arrow-outer-bindings`)
  5. 자기 `arguments` — 있음 / 있음 / 없음(바깥 함수의 것) (`arrow-outer-bindings`)
  6. `super` — SyntaxError / 쓸 수 있음 / 바깥 메서드의 것 (`method-super`)
  7. 중복 매개변수(sloppy) — 허용 / SyntaxError / SyntaxError (`null`)
  - probe 초안: 4행 `var o = { f: function () { return this } }; String(o.f() === o)` → `true`, 메서드는 `{ f() { return this } }` → `true`, 화살표 `{ f: () => this }` → `false`. 5행 `var f = function () { return arguments.length }; f(1, 2)` → `2`, `var o = { f() { return arguments.length } }; o.f(1, 2)` → `2`, `function outer() { var f = () => arguments.length; return f(1, 2) } outer()` → `0`. 6행 `var o = { f: function () { return super.x } }` → `SyntaxError`, `var o = { f() { return super.toString === Object.prototype.toString } }; String(o.f())` → `true`, `var o = { f() { var a = () => super.toString === Object.prototype.toString; return a() } }; String(o.f())` → `true`. 구현 단계 2에서 전부 실행해 확정한다.
- `concept.test.ts`: (a) 비교표 모든 칸 probe = expected (b) 표의 exampleId가 meta에 있음 (c) 본문 주장 근거 — SyntaxError: `({ m(a, a) {} })`, `(x, x) => 1`, `(...a, b) => 1`, `function f() { return super.x }` / ReferenceError: 전역 화살표에서 `arguments` 읽기 / sloppy `function f(a, a)`가 뒤 인수를 씀(`2`).
- 장 범위: 26장까지 전제. 예제에 스프레드·배열 고차 함수·기본값을 쓰지 않는다. `Object.setPrototypeOf`는 `[[Prototype]]`을 바꾸는 함수라고 한 줄로 설명한다(prototype-chain에서 `Object.create`로 다룬 개념).
- category `execution`: 핵심이 "자기 바인딩을 만들지 않고 바깥 환경에서 찾는다"이므로 scope-chain·closure·execution-context와 같은 그룹. order 250. prerequisites: function-calls, this-binding, new-operator, class-inheritance(super), scope-chain. related: this-binding, function-calls, class-basics, class-inheritance, closure.
- 버린 대안
  - ① 시뮬레이터: 사용자 결정(비교표 + 퀴즈).
  - ② category `objects`/`fundamentals`: 생성자 여부는 objects 성격이지만 페이지의 절반 이상이 바깥 환경 해석이라 `execution`.
  - ③ 표를 본문 JSX에 직접 쓰기: 칸과 실제 동작이 어긋나도 테스트가 잡지 못한다.
  - ④ `Object.getOwnPropertyNames`로 함수 프로퍼티 비교: V8 구현 확장(`arguments`, `caller`)이 섞인다.

## 4. 변경 파일

- 추가 `app/concepts/arrow-functions/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `comparison.ts`(표 데이터), `concept.test.ts`
  - `examples/`(6개): `arrow-syntax.js`, `not-constructor.js`, `arguments-object.js`, `arrow-outer-bindings.js`, `method-super.js`, `rest-params.js`
- 수정
  - `tests/e2e/helpers.ts`: `ARROW_FUNCTIONS_PATH`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe 1개(class-basics 케이스와 같은 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 1개 추가, 홈 학습 순서 카드 26→27
  - `tests/e2e/navigation.spec.ts`: 카드 26→27(두 곳), 마지막 '27번째'와 새 제목, pager '1 / 27'·'22 / 27'·'24 / 27'·class-basics '25 / 27', class-inheritance는 '26 / 27'·링크 2개(이전 class-basics, 다음 arrow-functions), 새 개념 '27 / 27'·이전 링크 class-inheritance(1개). '객체' 검색 수·순위는 단계 4 판정
  - `app/lib/concepts.test.ts`: total 27, 마지막 개념 arrow-functions(prev class-inheritance, position 27)
  - `app/components/concept/ConceptPager.test.tsx`: '1 / 27', 마지막 arrow-functions '27 / 27'과 이전 링크 `/concepts/class-inheritance`
  - `tests/build/build-output.test.ts`: arrow-functions 프리렌더 describe(퀴즈 `<details` 6개 이상, 표 텍스트)
  - `docs/content-guide.md`: 9단계 e2e 목록에 `arrow-functions`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 3번 상태·진행 기록, 보류에 "매개변수 기본값" 추가 게시글 후보
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 26개(this-binding·class-basics·function-calls의 "별도 개념" 문구 포함)

## 5. 위험 요소

- "바깥 this를 캡처/복사/고정" 같은 원인 서술 → 3절의 명세 용어(바인딩을 만들지 않음, 바깥 환경에서 찾음)로 쓰고, 단계 3 완료 조건에서 grep으로 '캡처'·'복사'·'고정'을 확인한다. 쓸 경우 비유로 밝히고 simplifications에 적는다.
- this-binding과 중복·불일치 → `this` 세부(call·bind 무시, 객체 리터럴의 화살표)는 링크로 넘기고, 이 페이지는 `this`·`arguments`·`new.target`이 같은 규칙이라는 점만 보인다. 문장을 this-binding 본문과 대조한다(단계 3).
- `arguments` 설명이 18장 범위를 넘음(mapped arguments, callee) → 개수·인덱스·배열 아님만 쓰고 나머지는 simplifications.
- 메서드 축약을 "`m: function () {}`의 줄임"으로만 보이게 쓰는 것 → 비교표 2·3·6·7행과 오해 Callout로 다른 점을 보인다.
- `typeof arguments`가 호스트에 따라 다름(CommonJS) → 예제는 스크립트 기준임을 simplifications에 밝힌다.
- 비교표 칸 오류 → probe 대조 테스트 + 음성 확인(칸 하나를 바꾸면 실패)(단계 2).
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 4에서 고치고 `npm test`·e2e로 확인.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx 순(실행 중 dev 서버가 `./meta` 실패를 캐시하지 않게).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 6개의 실제 출력 = `expectedOutput`(처음엔 `[]`로 두고 실행 결과를 확인한 뒤 채움). 2절 표와 다르면 멈춘다.
  - `concept.test.ts` (a)~(c) 통과, 음성 확인.
  - 명세 재확인(단계 1): rest가 배열을 만드는 절, FunctionRestParameter 위치.
  - 메인 에이전트가 본문의 결과·원인 문장을 2절과 대조하고, 줄 번호 언급을 예제 파일과 대조한다.
  - 참고 링크(명세 anchor, MDN ko — 없으면 en-US)를 실제로 열어 200과 내용을 확인한다.
- 브라우저(dev 서버 재시작 후 또는 `npm run build && npm run start`)
  1. `/concepts/arrow-functions`를 375px로 연다 → 비교표(4열)가 표 영역 안에서만 가로 스크롤되고 페이지에는 가로 스크롤이 없다.
  2. 다크 모드 → 표·코드·Callout 대비가 읽힌다.
  3. 키보드로 첫 퀴즈를 선택하고 '정답 확인'을 누른다 → 정답과 설명이 보인다.
  4. 하단 학습 순서 → '27 / 27', 이전 class-inheritance, 다음 없음.
  5. class-inheritance 하단 → '26 / 27', 다음이 arrow-functions.

## 7. 미확정 사항

- [확정 2026-11-02] slug: `arrow-functions`(사용자 승인).
- [확정 2026-11-02] 제목: '화살표 함수와 메서드 축약: function과 무엇이 다를까'(사용자 승인, 검토 때 조정 가능).

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인, 명세 재확인

- 대상: `app/concepts/arrow-functions/examples/*.js`(6개), `meta.ts`, 임시 `content.mdx`(필수 h2 3개만), `route.tsx`
- 현재: 폴더 없음
- 변경
  - 2절 초안 예제 6개를 그대로 옮긴다(scratchpad `arrow/`).
  - `meta.ts`: slug `arrow-functions`, title(7절 초안), summary(160자 이하), category `execution`, order 250, tags(화살표 함수, arrow function, 메서드 축약, method shorthand, arguments, rest 파라미터, 나머지 매개변수, lexical this, new.target, super, `[[HomeObject]]`, 생성자), goals 4개 내외, prerequisites·related(3절), examples는 처음엔 `[]`, references(2절 명세 anchor + MDN 화살표 함수·메서드 정의·arguments·나머지 매개변수), `reviewedAt: null`
  - simplifications: 매개변수 기본값은 다루지 않음(별도 개념) / mapped arguments·`arguments.callee`는 다루지 않음 / 제너레이터·async·getter·setter는 다루지 않음 / 비교표 "일반 함수" 칸은 sloppy 스크립트의 `function` 식 기준 / `this`의 세부는 this-binding에서 다룸 / `console`은 호스트 API / 예제는 스크립트 기준이고, Node CommonJS 파일로 실행하면 예제 4의 마지막 줄이 `'object'`가 됨
  - `route.tsx`: class-basics 템플릿 복사
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. `console.log`에는 원시 값·`JSON.stringify`만. 파일 끝 줄바꿈 하나. 예제에 스프레드·배열 고차 함수·기본값을 쓰지 않는다.
- 완료 조건
  - `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력이 2절 표와 같다.
  - rest 배열 생성 절과 FunctionRestParameter 위치를 원문으로 확인해 구현 진행에 기록한다.
  - 참고 링크 전부 200.

### 2. 비교표 데이터와 근거 테스트

- 대상: `comparison.ts`, `concept.test.ts`
- 변경: 3절의 7행과 근거 테스트 (a)~(c)를 쓴다. class-basics의 `Cell` 모양과 probe 실행 방식을 따르되, 열이 셋이므로 행 타입은 `{ aspect, exampleId, normal, method, arrow }`.
- 주의사항: vm 오류는 `name`으로 비교한다. 칸마다 새 컨텍스트.
- 완료 조건: `npx vitest run app/concepts/arrow-functions` 통과. 칸 하나의 `expected`를 바꾸면 실패하는지 본 뒤 되돌린다.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경
  - 필수 h2 3개. 동작 원리 h3: 화살표 함수 문법 / 생성자가 아니다 / arguments 객체 / 화살표 함수가 바깥에서 찾는 것 / 메서드 축약과 super / 중복 매개변수 / rest 파라미터 / 비교표
  - 예제마다 PredictQuiz(6개), 결과와 이유는 예제별 h3
  - 오해 Callout: "화살표 함수는 function을 짧게 쓰는 문법일 뿐이다", "메서드 축약은 `m: function () {}`의 줄임일 뿐이다", "arguments는 배열이다 / rest와 같다"
- 주의사항: 표는 comparison.ts에서 그린다(class-basics 표 마크업, region `aria-label`). 이미 다룬 내용은 링크. '찾히다' 금지. 공백 든 인라인 코드가 Prettier 줄바꿈에 걸리면 `<code>{"…"}</code>`.
- 완료 조건
  - `npm test` 통과.
  - 본문 결과·원인 문장을 2절과 하나씩, 줄 번호 언급을 예제 파일과 대조했다.
  - `grep -c '찾히' content.mdx`가 0, `grep -nE '캡처|복사|고정' content.mdx`의 결과가 없거나 비유임을 밝힌 문장뿐이다.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로 고친다. '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 들어가는지로 판정해, 들어가면 11건·순위에 '27' 추가, 아니면 그대로 둔다.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만 한다.
- 완료 조건: 6절 전체 검증 명령 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- 매개변수 기본값(26장) 추가 게시글: `undefined`일 때만 적용, 기본값 식은 호출할 때마다 평가, 기본값이 있으면 `length`에서 빠짐, 매개변수 스코프. 로드맵 보류 목록에 후보로 적는다.
- this-binding·class-basics·function-calls의 "별도 개념" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결을 일괄로 처리할 때 함께 한다.

## 부록: 예제 초안

본문 예제 순서(예제 1~6)대로 적는다. 구현 단계 1에서 이 내용 그대로 `examples/`에 옮긴다.

### 예제 1: `arrow-syntax.js`

```js
var double = n => n * 2;
var add = (a, b) => a + b;
var noReturn = (a, b) => { a + b; };
var withReturn = (a, b) => { return a + b; };
console.log(double(4), add(2, 3), noReturn(2, 3), withReturn(2, 3));
var label = () => { value: 1 };
var object = () => ({ value: 1 });
console.log(label(), JSON.stringify(object()));
```

### 예제 2: `not-constructor.js`

```js
function normal() {}
var obj = { short() {}, old: function () {} };
var arrow = () => {};
console.log(typeof normal, typeof obj.short, typeof arrow);
console.log(typeof new normal(), typeof new obj.old());
try { new obj.short(); } catch (e) { console.log(e.name); }
try { new arrow(); } catch (e) { console.log(e.name); }
console.log(normal.hasOwnProperty('prototype'), obj.short.hasOwnProperty('prototype'), arrow.hasOwnProperty('prototype'));
```

### 예제 3: `arguments-object.js`

```js
function count() {
  return arguments.length;
}
function second(a) {
  return a + ' ' + arguments[1];
}
function kind() {
  return Array.isArray(arguments) + ' ' + typeof arguments.join;
}
console.log(count(1, 2, 3), count());
console.log(second('x', 'y'));
console.log(kind());
```

### 예제 4: `arrow-outer-bindings.js`

```js
function Box(label) {
  this.label = label;
  this.read = () => this.label + ' ' + arguments.length + ' ' + (new.target === Box);
  this.plain = function () { return this.label + ' ' + arguments.length + ' ' + (new.target === Box); };
}
var box = new Box('A', 'extra');
var other = { label: 'B', read: box.read, plain: box.plain };
console.log(box.read(1, 2, 3));
console.log(other.read());
console.log(other.plain(1, 2, 3));
var topLevel = () => typeof arguments;
console.log(topLevel(1, 2));
```

### 예제 5: `method-super.js`

```js
var base = { greet() { return 'base'; } };
var child = {
  greet() { return super.greet() + '+child'; },
  later() { var inner = () => super.greet(); return inner(); }
};
Object.setPrototypeOf(child, base);
console.log(child.greet(), child.later());
var borrowed = { greet: child.greet };
console.log(borrowed.greet());
```

### 예제 6: `rest-params.js`

```js
var sum = (...nums) => {
  var total = 0;
  for (var i = 0; i < nums.length; i++) total += nums[i];
  return total;
};
function tag(label, ...rest) {
  return label + ':' + rest.length + ':' + Array.isArray(rest);
}
console.log(sum(1, 2, 3), sum());
console.log(tag('a', 1, 2), tag('b'));
console.log(sum.length, tag.length);
```

## 변경 이력

- 2026-11-02 (외부 콘텐츠 검수 8건, 모두 명세 원문·vm 실행으로 사실 확인 후 반영): ① 중복 매개변수는 sloppy이고 단순 매개변수 목록일 때만 허용(`#sec-parameter-lists-static-semantics-early-errors`: IsSimpleParameterList false + 중복 → SyntaxError, `function f(a, a, ...r) {}`·`function f(a, a = 1) {}` 확인) — 본문·비교표 칸·근거 테스트 ② 괄호 생략은 매개변수가 식별자 하나일 때만(`{a} => a`·`...a => a` SyntaxError) — 본문·근거 테스트 ③ 학습 목표의 super 문장을 "객체 리터럴에서 메서드 축약으로 써야 하는 이유"로 범위 한정(getter·클래스에서도 super 사용 가능) ④ 화살표 함수 절의 super 출발점을 "[[HomeObject]]의 [[Prototype]]"으로 통일(GetSuperBase) ⑤ 예제 5 설명에 "super로 찾은 base.greet의 this는 호출 시점의 this(borrowed)" 추가 — 근거 테스트 ⑥ arguments는 배열 메서드가 없을 뿐 배열로 바꾸는 방법(이터러블·스프레드)이 있다고 한 문장 추가 — 단, 34·35장 내용이라 코드는 보이지 않고 "별도 개념"으로만 언급하고 simplifications에 밝힘(AGENTS.md 장 범위 규칙) ⑦ 참고 자료에 CreateMappedArgumentsObject 추가, mapped simplification에 "예제 3·4는 mapped 객체지만 배열 아님·[[Prototype]]은 같다" 명시 ⑧ 화살표 함수 안 arguments 문장을 "바인딩을 만들지 않으므로 식별자 해석이 바깥 함수의 arguments 바인딩에 닿는다"로 — 영향 단계 1(meta)·2(comparison·test)·3(본문)
- 2026-11-02 (외부 콘텐츠 재검수 3건): ① arguments를 배열로 바꾸는 방법 문장 — "이터러블이 전제"로 읽히지 않게 `length`·인덱스가 있어 방법이 있고(배열 메서드 빌려 쓰기, 이터러블·스프레드) 둘 다 아직 다루지 않은 별도 개념이라고 수정, 학습 순서 마지막 페이지라 "뒷장" 표현 제거(본문 2곳·simplification). 제안의 `Array.from(arguments)`가 "length와 인덱스만으로 동작"한다는 부분은 명세(Array.from은 `Symbol.iterator`가 있으면 반복자 경로)와 vm(반복자 호출 1회)으로 틀림을 확인해 반영하지 않음. `slice.call`·`Array.from` 코드는 27장 이후라 넣지 않음 ② 문장 호응 3곳 ③ arguments 절 연결 문장을 "this·new.target·super와 달리 GetThisEnvironment를 거치지 않는다"로 — 영향 단계 1·3

## 구현 진행

- baseline (2026-11-02, `bde328b`): lint·format:check·typecheck 통과 / `npm test` 85 files 2677 통과. test:build·e2e는 직전 커밋 기록(e2e 377 passed, 3 skipped)을 baseline으로 쓰고 마지막 전체 검증에서 실행. dev 서버 5173 실행 중(새 폴더 추가 뒤 재시작 필요)
- 명세 재확인(단계 1, 메인): Parameter Lists(`#sec-parameter-lists`) 문법 `FormalParameters : [empty] | FunctionRestParameter | FormalParameterList | FormalParameterList , | FormalParameterList , FunctionRestParameter` → rest는 마지막에만 오고 뒤에 쉼표도 올 수 없다. BindingRestElement의 IteratorBindingInitialization "Let array be ! ArrayCreate(0)" → rest 파라미터 값은 배열
- [x] 1. 예제·meta·route — 예제 6개가 계획 부록과 바이트 단위로 같음(`cmp`), 실제 출력 = 2절 표(`tests/examples.test.ts` 통과), 명세 anchor 10개 spec.html에 존재, MDN ko 4개 200. title·summary·tags에 '객체' 없음(검색 테스트 영향 없음). 생성 순서 meta → content → route
- [x] 2. 비교표·근거 테스트 — `npx vitest run app/concepts/arrow-functions` 28 통과, 음성 확인(5행 화살표 expected '0'→'9'이면 해당 1건 실패, 원복 후 28 통과). prettier·eslint·typecheck 통과
- [x] 3. 본문 작성 — 서브에이전트 초안을 메인이 명세·예제와 한 줄씩 대조. 결과 값·줄 번호는 모두 맞았고, 메인이 9곳 수정: ① `Array.isArray`가 false인 원인을 `[[Prototype]]`이 아니라 "배열 객체가 아님"으로(본문·Callout) ② `arguments`를 만드는 것은 "일반 함수"가 아니라 화살표 함수가 아닌 함수(메서드 축약 포함), 이름이 `arguments`인 예외는 다루지 않는다고 명시 ③ "메서드 축약만 super를 쓸 수 있다" → "객체 리터럴에서 super를 쓰려면 메서드 축약"(안의 화살표 함수 포함) ④ 메서드 축약 Callout의 모호한 "어느 것도 하지 않는다"를 구체적 차이로 ⑤ this 저장 오해 Callout의 논증을 "부르는 시점의 바깥 this 바인딩 상태를 따른다"로 ⑥ 문구 3곳(블록 본문, 같은 식을 돌려주는, 화살표 Callout에 중복 매개변수). 근거 테스트 1개 추가(파생 클래스 생성자에서 super() 앞에 만든 `() => this`가 super() 뒤에는 동작, 앞에서는 ReferenceError). '찾히' 0건, 캡처·복사·고정 0건, 빌드 HTML에서 공백 든 인라인 코드 깨짐 0건
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 검토(카드 27, '객체' 검색 그대로 10건 — title·summary·tags에 '객체' 없음, class-inheritance 26/27 링크 2개, arrow-functions 27/27, build-output describe, content-guide 목록, 로드맵 3번 '진행 중'·매개변수 기본값 후보·진행 기록)
- 전체 검증 (2026-11-02): lint·format:check·typecheck 통과 / `npm test` 86 files 2724 통과 / `npm run test:build` 226 통과 / e2e 아래 기록
- e2e (2026-11-02): 383 passed, 3 skipped(baseline 377 + 새 케이스 6: axe light/dark × desktop/mobile, 가로 스크롤 × 2)
- 리뷰 1차(critical-code-review, 메인 직접): 계획 대조 차이 없음. High 1(명세 불일치, 수정): 화살표 함수 안 `super`의 원인을 "`HasSuperBinding()`이 false라서"로 썼으나 명세의 SuperProperty 평가·MakeSuperPropertyReference는 GetThisEnvironment로 환경을 찾고 HasSuperBinding은 Assert에만 쓰임 → "GetThisEnvironment로 찾은 바깥 메서드 환경의 `[[HomeObject]]`"로 수정. 수정 뒤 format·lint·`npm test` 2724·`test:build` 226 통과(본문 문장 1곳만 바뀌어 e2e는 재실행하지 않음)
- 브라우저 확인(dev 5173, Playwright 375px·다크): 페이지 가로 스크롤 없음(scrollWidth 375 = innerWidth), 비교표는 region 안에서 가로 스크롤(화살표 함수 열은 스크롤해야 보임 — class-basics와 같은 방식), 첫 퀴즈를 키보드(화살표 키 → Tab → Enter)로 풀면 "정답입니다."와 설명 표시. dev 서버는 재시작 없이 새 경로 200
- 외부 검수 반영(2026-11-02, 변경 이력 ①~⑧): 본문 8곳, 비교표 칸 1개, meta(goal 1·simplifications 2·reference 1), 근거 테스트 5개 추가(sloppy 비단순 목록 중복 2, 괄호 없는 rest·구조 분해 화살표 2, super로 찾은 메서드의 this). 검증: lint·format:check·typecheck 통과 / `npm test` 2729 / `test:build` 226 / e2e 아래 기록
- e2e (외부 검수 반영 후, 전체): 383 passed, 3 skipped, 실패 0 (10.0m)
- 외부 재검수 반영(2026-11-02, 변경 이력 마지막 항목): 본문 6곳·simplification 1개. 검증: lint·format:check·typecheck 통과 / `npm test` 2729 / `test:build` 226 / e2e 새 페이지 범위(AGENTS.md 새 규칙): navigation 16 passed + 새 페이지·홈 학습 순서 8 passed
- 사용자 최종 승인(2026-11-02): 콘텐츠 검토 승인 → `reviewedAt` 2026-11-02 기록. 이후 `npm test`·`test:build` 재실행(아래 구현 결과)

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 6개, 비교표 7행, 퀴즈 6개, 오해 Callout 4개, 고정 테스트·e2e·빌드 테스트·문서). 계획보다 늘어난 것은 근거 테스트다. 본문 주장을 뒷받침하는 테스트 6개(this는 쓸 때 찾는다, super로 찾은 메서드의 this, 비단순 목록 중복 2, 괄호 없는 rest·구조 분해 화살표 2)를 더했다.
- 외부 검수 2회로 범위 안에서 문장을 바로잡았다(변경 이력). 재검수의 `Array.from(arguments)` 제안은 명세와 달라 반영하지 않았다.
- 작업 중 사용자 요청으로 e2e 범위 규칙(새 개념만 추가하면 새 페이지 관련 e2e만)을 AGENTS.md·content-guide에 추가했다(별도 커밋).

### 코드 리뷰

- critical-code-review 1차(메인 직접): High 1(화살표 함수 안 super의 원인을 HasSuperBinding으로 쓴 명세 불일치) 수정. 그 밖에 Critical·High 없음.

### 후속 작업

- [ ] 매개변수 기본값(26장) 추가 게시글 — 로드맵 보류 목록에 후보로 기록
- [ ] this-binding·class-basics·function-calls의 "별도 개념" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결 일괄 처리 때

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 원인 서술을 "바깥 this를 저장/캡처한다"가 아니라 "바인딩을 만들지 않아 쓸 때 바깥 환경에서 찾는다"로 정함 — 근거로 파생 클래스 생성자에서 `super()` 앞에 만든 `() => this`가 `super()` 뒤에는 동작하고 앞에서는 ReferenceError인 테스트를 둠. 저장 모델이라면 이 차이가 설명되지 않는다.
- [Claude 판단] category를 `execution`으로 정함 — 생성자 여부는 objects 성격이지만 페이지 절반 이상이 바깥 환경 해석(this·arguments·new.target·super)이라 scope-chain·closure와 같은 그룹. 버린 대안: objects, fundamentals.
- [Claude 판단] 화살표 함수 안 super의 원인을 GetThisEnvironment로 정정(리뷰 High) — 명세의 SuperProperty 평가와 MakeSuperPropertyReference는 GetThisEnvironment로 환경을 찾고 HasSuperBinding은 Assert에만 쓴다.
- [Claude 판단] 외부 검수의 "arguments를 배열로 바꾸는 코드(`[...arguments]`, `Array.from`, `slice.call`)"를 본문 코드로 넣지 않음 — 27·34·35장 내용이라 장 범위 규칙상 "별도 개념"으로만 언급. 또 `Array.from(arguments)`는 `Symbol.iterator`가 있어 반복자 경로를 쓰므로 "length와 인덱스만으로 동작"한다는 제안 문장은 틀림(vm으로 반복자 호출 확인).
- [Claude 판단] 비교표 "일반 함수" 칸을 sloppy 스크립트의 function 식 기준으로 하고 칸마다 probe 실행 — 중복 매개변수처럼 strict·매개변수 목록 형태에 따라 결과가 갈리는 칸이 있어 기준을 고정하고 테스트로 대조한다.
- 범위: rest 파라미터 포함, 매개변수 기본값은 추가 게시글 후보, arguments는 이 페이지에서 짧게, 비교표 + 퀴즈, slug·제목 추천안(사용자 결정).

#### 배경지식

- 함수 객체가 생성자가 되는지는 만드는 경로가 정한다. OrdinaryFunctionCreate는 `[[Call]]`만 있는 함수를 만들고, MakeConstructor가 `[[Construct]]`와 `prototype`을 함께 붙인다. function 식·선언은 MakeConstructor를 부르고, 화살표 함수(InstantiateArrowFunctionExpression)와 메서드 정의(DefineMethod)는 부르지 않는다. EvaluateNew는 IsConstructor가 false면 TypeError.
- 화살표 함수의 함수 환경은 `[[ThisBindingStatus]]`가 lexical이라 HasThisBinding이 false이고, GetThisEnvironment가 바깥으로 올라가 this·new.target·super를 찾는다. arguments는 FunctionDeclarationInstantiation이 lexical 함수에는 바인딩을 만들지 않아 식별자 해석이 바깥 함수의 바인딩에 닿는다.
- 메서드 정의는 MakeMethod로 `[[HomeObject]]`를 받는다. `super.x`는 `[[HomeObject]].[[Prototype]]`에서 찾기 시작하고, 찾은 메서드의 this는 호출 시점의 this다.
- 중복 매개변수: UniqueFormalParameters(화살표·메서드는 항상, function은 strict일 때)와 별도로, IsSimpleParameterList가 false인 목록의 중복도 SyntaxError다.
- rest 파라미터는 ArrayCreate로 만든 진짜 배열이고, ExpectedArgumentCount가 세지 않아 `length`에서 빠진다. arguments는 mapped든 unmapped든 `[[Prototype]]`이 Object.prototype인 배열 아닌 객체다.

#### 확인 질문

1. 화살표 함수와 메서드 축약을 `new`하면 TypeError이고 `prototype`도 없는 것은 원인이 같은가?
   <details><summary>답</summary>같다. 둘 다 OrdinaryFunctionCreate만 거치고 MakeConstructor를 부르지 않는다. MakeConstructor가 `[[Construct]]`와 `prototype` 프로퍼티를 함께 만들기 때문에 둘 다 없다(2절 사실, 본문 "생성자가 아니다").</details>
2. "화살표 함수는 만들 때의 this 값을 저장한다"가 틀렸다는 것을 어떤 실행으로 보일 수 있나?
   <details><summary>답</summary>파생 클래스 생성자에서 `super()` 앞에 `var f = () => this`를 만들고 `super()` 뒤에 `f()`를 부르면 초기화된 this가 나오고, `super()` 앞에서 부르면 ReferenceError다. 결과가 부르는 시점의 바깥 this 바인딩 상태를 따른다(`concept.test.ts` 근거 테스트, 오해 Callout).</details>
3. 예제 4의 `box.read(1, 2, 3)`에서 `arguments.length`가 3이 아니라 2인 이유는?
   <details><summary>답</summary>화살표 함수에는 arguments 바인딩이 없어(FunctionDeclarationInstantiation) 식별자 해석이 바깥 `Box`의 arguments에 닿는다. `Box`는 `new Box('A', 'extra')`로 인수 2개를 받았다(예제 4 6·8번 줄).</details>
4. sloppy mode인데도 `function f(a, a, ...rest) {}`가 SyntaxError인 이유는?
   <details><summary>답</summary>Parameter Lists Early Errors에 "IsSimpleParameterList가 false이고 중복이 있으면 SyntaxError" 규칙이 strict 여부와 별도로 있다. rest 파라미터가 있으면 단순한 목록이 아니다(변경 이력 외부 검수 ①, 근거 테스트).</details>
5. `Array.from(arguments)`를 "length와 인덱스만으로 배열을 만든다"고 설명하면 무엇이 틀리나?
   <details><summary>답</summary>Array.from은 `Symbol.iterator` 메서드가 있으면 반복자 경로를 먼저 쓴다. arguments에는 그 메서드가 있으므로 반복자로 만든다. length와 인덱스만 쓰는 것은 `Array.prototype.slice.call`이다(변경 이력 재검수 ①).</details>
