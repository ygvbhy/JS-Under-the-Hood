# new 연산자 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-28
- 기준: `main` @ `9118905` (작업 트리에 `property-keys`·`function-calls` `reviewedAt` 기록이 커밋되지 않은 채 있음 — 이 작업과 별개)

## 0. 요약

- 목적: 로드맵(13~24장) 5번 `/concepts/new-operator`를 추가한다. `new`의 단계(인수 평가·생성자 확인 → 새 객체 생성 → this 연결 → 본문 실행 → 결과 결정)와 return 규칙(객체면 그 객체, 원시 값·`null`이면 무시하고 this)을 예제 9개, 퀴즈, "new 단계" 시뮬레이터로 보인다. new 없이 호출, `new.target`, 생성자가 아닌 함수, Object·String 내장 생성자도 포함한다(사용자 결정).
- 범위: 새 개념 폴더 1개(category `objects`), e2e·빌드 테스트 추가, `navigation.spec.ts` `객체` 검색 기대값 2→3(사용자 결정), content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 15개는 바꾸지 않는다.
- 위험: `this`(22장)·프로토타입(19장)·클래스를 앞서 설명하거나, 시각화의 5단계를 엔진 구현처럼 쓰는 것 → 명세 [[Construct]] 원문 대조, 단순화 명시, 스냅샷 대조 테스트로 막는다.
- 복잡도: 중간 · Consensus: 생략. 기존 개념 패턴(property-attributes·function-calls)의 조합이고 공통 코드 변경이 없다. 명세 원문과 vm·ESM·CJS 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md`) 5번, 『모던 자바스크립트 Deep Dive』 17장 범위. 17장까지만 전제한다.
- 핵심
  - ① 함수 객체는 [[Call]]을 가지고, 생성자(constructor)인 함수는 [[Construct]]도 가진다. `new F(...)`는 F의 [[Construct]]를, `F(...)`는 [[Call]]을 부른다. 내부 메서드는 명세의 이름이고 코드에서 직접 접근할 수 없다.
  - ② `new F(args)`의 순서: F와 인수를 평가 → F가 생성자가 아니면 TypeError → 새 객체 생성 → this를 그 객체로 연결 → 본문 실행 → 결과 결정.
  - ③ 결과 결정: 본문이 객체를 return하면 그 객체가 결과이고 this 객체는 결과로 쓰이지 않는다. return이 없거나 원시 값(`null`·`undefined` 포함)을 return하면 this 객체가 결과다.
  - ④ new 없이 호출하면 [[Call]]이라 새 객체가 생기지 않는다. sloppy mode에서는 this가 전역 객체라 전역 프로퍼티가 생기고 결과는 return 값(없으면 `undefined`), strict mode에서는 this가 `undefined`라 `this.x = …`에서 TypeError.
  - ⑤ `new.target`은 new로 호출되면 그 함수, 일반 호출이면 `undefined`. 이를 이용해 new 없이 호출해도 new로 다시 호출하는 패턴.
  - ⑥ 생성자가 아닌 함수(non-constructor): 메서드 축약 문법으로 만든 메서드, `Math.max` 같은 내장 함수에 new를 쓰면 TypeError. `typeof`는 둘 다 `'function'`. 함수 선언·함수 표현식은 생성자다. 화살표 함수는 이름만 언급(26장).
  - ⑦ 내장 생성자: `Object`는 new 유무와 관계없이 빈 객체, `String`은 new면 객체(`typeof` `'object'`), 없으면 문자열. 내장 생성자는 각자 명세가 정한 대로 동작하며 일반화하지 않는다. 래퍼 객체 자체는 7번 개념(21장)으로 미룬다.
- 사용자 결정(2026-10-28): ④~⑦ 모두 포함. `navigation.spec.ts`의 `객체` 검색 기대값을 3으로 바꾼다.

### 유지해야 하는 기존 동작

- 기존 개념 15개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일은 수정하지 않는다.
- `navigation.spec.ts`는 기대값(2→3)만 바꾸고, 첫 카드가 '원시 값과 객체'라는 검사는 그대로 통과해야 한다. 제목을 `new`로 시작하면 `localeCompare('ko')`에서 한글 제목 뒤로 정렬된다(아래 사실).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위

- 프로토타입(새 객체의 [[Prototype]] 연결, `prototype` 프로퍼티, 메서드 공유) — 6번
- `this`의 다른 결정 방식(메서드 호출, `call`·`apply`·`bind`, 화살표 함수) — 8번
- 클래스·파생 생성자(`extends`·`super`), 실행 컨텍스트·환경 레코드 — 별도 개념
- 래퍼 객체의 동작, `Function` 생성자, `instanceof`
- 화살표 함수 예제(이름만 언급)

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현
  - `app/concepts/function-calls/scenarios.ts:6-24`: `Val`·`Binding`·`Param`·`Call` 상태 모델, "선언문이 실행된 변수만 보인다"는 시각화 관례(`intro`, `:59-60`)
  - `app/concepts/property-attributes/`: 객체 카드(`AttrView.tsx`), try…catch 예제, vm 탐침 대조·`.mjs`/`.cjs` 비교(`concept.test.ts`), 얇은 래퍼(`Simulator.tsx`)
  - e2e 경로 상수 `tests/e2e/helpers.ts:29-30`
- 검색과 정렬
  - `filterConcepts`는 title·summary·tags만 검색한다(`app/lib/concepts.ts:48-57`). `listConcepts`는 `title.localeCompare(b.title, 'ko')`로 정렬한다(`:39-41`).
  - `객체` 검색 기대값 2: `tests/e2e/navigation.spec.ts:17`, `:32`. 첫 카드 '원시 값과 객체' 검사: `:18`, `:22`. `a11y.spec.ts:64`는 개수를 검사하지 않는다.
  - 정렬 확인(node): `'new 연산자: …'`는 `'원시 값과 객체: …'`·`'프로퍼티 키'` 뒤, `'생성자 함수와 new: …'`는 앞이다.
- 기존 페이지가 이 페이지로 미룬 부분
  - `function-calls/meta.ts:75`: this·메서드 호출·화살표 함수
  - `property-attributes/meta.ts:93-94`: this, 프로토타입
  - `typeof-operator/meta.ts:72`: 함수 판정 기준 [[Call]]
- 명세 원문(tc39.es/ecma262, ES2027 초안, 2026-10-28 내려받아 확인)
  - 13.3.5.1.1 EvaluateNew(`sec-evaluatenew`): constructExpr 평가 → GetValue → 인수 목록 평가(ArgumentListEvaluation) → IsConstructor가 false면 TypeError → Construct.
  - 10.2.2 [[Construct]](`sec-ecmascript-function-objects-construct-argumentslist-newtarget`): kind가 base면 thisArg = OrdinaryCreateFromConstructor(newTarget, "%Object.prototype%") → PrepareForOrdinaryCall → OrdinaryCallBindThis → 본문 평가 → throw면 그대로 전파 → return 값이 Object면 그 값 → kind가 base면 thisArg → (derived) undefined가 아니면 TypeError.
  - 10.1.13 OrdinaryCreateFromConstructor: [[Prototype]]을 생성자의 `"prototype"` 프로퍼티에서 가져온다(없으면 기본 내장 객체).
  - 10.2.1 [[Call]]: PrepareForOrdinaryCall(func, undefined) — NewTarget이 undefined. 10.2.1.2 OrdinaryCallBindThis: strict면 thisArg 그대로, 아니면 undefined·null을 전역 this 값으로 바꾼다.
  - 13.3.6.2 EvaluateCall: 프로퍼티 참조가 아닌 호출(`Book('JS')`)은 thisValue가 undefined(환경 레코드의 WithBaseObject).
  - 9.4.5 GetNewTarget, 13.3.12.1 `new.target` 평가(`sec-meta-properties-runtime-semantics-evaluation`).
  - 7.2.4 IsConstructor: 객체이고 [[Construct]]가 있으면 true.
  - 10.2.5 MakeConstructor: [[Construct]] 설정과 `prototype` 프로퍼티 생성. 15.2.4 InstantiateOrdinaryFunctionObject: 함수 선언은 MakeConstructor를 한다. 15.4.4 DefineMethod: 메서드는 MakeMethod만 하고 MakeConstructor를 하지 않는다.
  - 10.3 Built-in Function Objects: 내장 함수는 "constructor"로 기술된 경우에만 [[Construct]]를 가진다(`Math.max`는 아님).
  - 20.1.1.1 `Object(value)`: NewTarget이 undefined도 active function도 아니면 새 객체, value가 undefined·null이면 새 빈 객체. 22.1.1.1 `String(value)`: NewTarget이 undefined면 문자열을, 아니면 String 객체를 돌려준다.
  - 앵커 확인: `sec-new-operator`, `sec-evaluatenew`, `sec-ecmascript-function-objects-construct-argumentslist-newtarget`, `sec-ecmascript-function-objects-call-thisargument-argumentslist`, `sec-ordinarycreatefromconstructor`, `sec-ordinarycallbindthis`, `sec-evaluatecall`, `sec-isconstructor`, `sec-makeconstructor`, `sec-runtime-semantics-instantiateordinaryfunctionobject`, `sec-runtime-semantics-definemethod`, `sec-built-in-function-objects`, `sec-getnewtarget`, `sec-meta-properties-runtime-semantics-evaluation`, `sec-object-value`, `sec-string-constructor-string-value`
- 예제 초안 실제 출력(vm은 `util.format`, `runExample`과 같은 방식. `.mjs`·`.cjs`는 파일로 직접 실행)

  | # | 파일 | vm 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `basic.js` | `{"title":"JS","price":30}` / `{"title":"CSS","price":20}` / `false` | 같음 | 같음 |
  | 2 | `return-object.js` | `{"title":"other"}` | 같음 | 같음 |
  | 3 | `return-primitive.js` | `{"title":"JS"}` | 같음 | 같음 |
  | 4 | `return-null.js` | `{"title":"JS"}` / `object` | 같음 | 같음 |
  | 5 | `without-new-sloppy.js` | `undefined` / `JS` | TypeError(모듈은 strict) | 같음 |
  | 6 | `without-new-strict.js` | `TypeError` / `undefined` | 같음 | 같음 |
  | 7 | `new-target.js` | `{"title":"JS"}` / `{"title":"CSS"}` | 같음 | 같음 |
  | 8 | `non-constructor.js` | `TypeError` / `TypeError` / `function` / `function` | 같음 | 같음 |
  | 9 | `built-in.js` | `{}` / `{}` / `object` / `string` | 같음 | 같음 |

  - 3번은 초안에 있던 `console.log(Book('CSS'))`(new 없는 호출이라 sloppy 전역 프로퍼티가 생기고 모듈에서 TypeError)를 뺀 원문이다. 뺀 원문의 vm 출력도 `{"title":"JS"}`로 확인했다.
- 본문 근거로 쓸 vm 실행 결과
  - `new Book`(괄호 없음)도 new 호출이다: `new.target === Book`이 true, 인수가 없어 title은 undefined → `{}`
  - 일반 호출의 `new.target`은 undefined
  - 화살표 함수에 new → TypeError, 숫자 `1`에 new → TypeError
  - return 값별 결과: 함수 → 그 함수(`typeof` `'function'`), 배열 → 그 배열, `return;`·`return undefined`·`return 'x'` → this 객체
  - 함수 표현식도 new로 호출된다
  - 인수가 본문보다 먼저 평가된다(`arg` → `body` 순서 출력)
  - 생성자 본문이 throw하면 new 식이 그 오류를 던진다(RangeError)
  - `Book.prototype`은 객체이고 `Object.getPrototypeOf(new Book()) === Book.prototype`(단순화 근거)
  - `Object(null)`·`new Object(undefined)` → `{}`, `typeof Object('a')`·`typeof new Object('a')` → `object`, `typeof Number(5)` → `number`, `typeof new Number(5)` → `object`
- MDN ko `Operators/new`, `Operators/new.target`, `Global_Objects/Object/Object`, `Global_Objects/String/String`, `Functions/Method_definitions`는 200을 돌려준다.

### 추정

- 예제 이름 `Book`·`title`·`price`·`shop`·`book`·`a`·`b`·`s1`·`s2`가 Chromium에서 `in window`가 아니다 — property-attributes와 같은 방식으로 6단계 브라우저 확인에서 검사한다.

## 3. 구현 전략

- property-attributes(객체 카드·try…catch·탐침 대조)와 function-calls(호출 영역·매개변수)를 조합한다.
  - slug `new-operator`, category `objects`
  - 제목 `'new 연산자: 생성자 함수는 어떤 객체를 돌려주나'` (`new`로 시작해 정렬상 '원시 값과 객체' 뒤)
  - 시뮬레이터 label `'new 연산자 시뮬레이터'`
- 상태(`NewState`). 개념 간 공유 금지라 기존 타입을 복사해 고친다.
  - `Val`: `number`·`string`·`undefined`·`null`(display)
  - `ObjectRef`: `{ kind: 'object'; id }`
  - `Binding`: `{ name; declaredWith: 'const'; value: Val | ObjectRef; changed?: true }` — 선언문이 실행된 변수만(function-calls 관례). `Book` 함수 바인딩은 보이지 않는다.
  - `Prop`: `{ key; value: Val; changed?: true }`
  - `ObjectBox`: `{ id; label; props: Prop[]; role?: 'this' | 'result' | 'unused' | 'global'; created?: true }`
    - `label` 예: `객체 A`, `객체 B`, `전역 객체`(sloppy 일반 호출 시나리오만, 예제가 만든 프로퍼티만 보인다)
    - `role` 표시 글자: `this` → "this", `result` → "new 식의 결과", `unused` → "결과로 쓰이지 않음", `global` → "전역 객체"
  - `Invocation`: `{ mode: 'new' | 'call'; code; callee; args: Val[]; params: Param[]; stage; thisValue: ObjectRef | 'undefined' | null; returned: { value: Val | ObjectRef; how: 'return' | 'end' } | null; result: Val | ObjectRef | null }`
    - `mode: 'new'`의 `stage`: `'check'`(인수 평가·생성자 확인) → `'create'`(새 객체 생성) → `'bind'`(this 연결·매개변수) → `'body'`(본문 실행) → `'result'`(결과 결정)
    - `mode: 'call'`의 `stage`: `'check'`(인수 평가) → `'bind'`(this 결정) → `'body'` → `'result'` — 새 객체 생성 단계가 없다는 것을 단계 목록으로 보인다.
    - `Param`: function-calls와 같은 `{ name; value; from: 'argument' | 'missing' }`
  - `NewState`: `{ bindings; objects; invocation: Invocation | null }`
- 화면(`NewView`): 3영역
  - 단계 목록: mode별 단계를 순서 목록(`<ol>`)으로 보이고 현재 단계에 `aria-current="step"`과 "현재" 글자, 지난 단계는 "완료" 글자. 색만으로 구분하지 않는다.
  - 호출 영역: 호출 식, 인수, 매개변수, `this` 값(객체 라벨 또는 `undefined`), return 값과 결과
  - 변수와 객체 카드: 바뀐 칸 강조(`bg-highlight` + `data-changed`), 역할 배지 글자
  - 375px에서 `flex-wrap`과 줄바꿈
- 시나리오 4개
  - `basic`(예제 1): 두 번의 `new Book(...)` 각각 5단계 + 대입 + 출력. A와 B가 서로 다른 객체임을 마지막 비교 단계에서 보인다.
  - `return-object`(예제 2): this(A)에 title 추가 → `return { title: 'other' }`로 B 생성 → 결과 결정에서 B가 결과, A는 `unused` → `book`이 B
  - `return-primitive`(예제 3): `return 100` → 100은 객체가 아니므로 무시, A가 결과
  - `without-new-sloppy`(예제 5): `mode: 'call'`, 새 객체 없음, this가 전역 객체 → 전역 객체에 title 추가 → 결과 `undefined` → `book`은 undefined, 마지막에 `title` 출력
  - 나머지 예제(4·6·7·8·9)는 예제·퀴즈·본문으로 다룬다.
- 정확성 검증
  - (a) 공통 불변식(`assertScenarioInvariants`)
  - (b) 구조: ObjectRef가 존재하는 객체를 가리킨다, `stage`가 mode의 순서대로만 진행한다, `changed`·`created` 표시가 이전 단계와의 실제 차이와 같다, `role: 'result'`인 객체는 `invocation.result`가 가리키는 객체와 같다
  - (c) 스냅샷 대조: 예제의 해당 줄 뒤에 탐침을 끼워 vm 안에서 실제 값을 읽어 화면 상태와 비교한다. 생성자 본문 줄 뒤 탐침은 `this`의 자기 프로퍼티(JSON)를, 바깥 줄 뒤 탐침은 선언된 변수 값을 읽는다. 같은 줄이 여러 번 실행되면(basic의 본문) 실행 순서대로 대응시킨다. sloppy 시나리오는 전역 객체의 `title`을 읽는다.
  - (d) 결과 검증: 실행 중 `this`를 탐침 배열에 담아 두고, new 식의 결과가 그 `this`와 같은지(`===`, vm 안에서 판정)를 시나리오의 `role`(`result`/`unused`)과 대조한다.
  - (e) 음성 확인: `return-primitive`의 결과를 100으로 그리면 실패해야 하고, `return-object`의 결과를 A로 그리면 실패해야 한다.
- 버린 대안
  - ① 프로토타입 연결을 카드에 표시: 19장 내용이다. 단계 설명에 "새 객체의 프로토타입도 이때 정해지지만 별도 개념"이라고 한 줄 쓰고 단순화에 적는다.
  - ② 실행 컨텍스트·환경 레코드로 this를 그리기: 23장이다. "호출 영역의 this"로 단순화한다.
  - ③ strict 일반 호출도 시나리오로: 예제 6과 퀴즈로 충분하고, sloppy 시나리오의 단계 목록(새 객체 생성 단계 없음)이 핵심 비교를 이미 보인다.
  - ④ `new.target`·내장 생성자를 시나리오로: 단계 흐름이 basic과 같거나 내장 함수 내부를 그려야 해 시각화 이득이 적다.

## 4. 변경 파일

- 추가 `app/concepts/new-operator/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 9개(2절 표)
  - `scenarios.ts`, `NewView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정
  - `tests/e2e/navigation.spec.ts:17`, `:32`: `toHaveCount(2)` → `toHaveCount(3)`(사용자 결정, 다른 줄은 그대로)
  - `tests/e2e/helpers.ts`: `NEW_OPERATOR_PATH`, `NEW_OPERATOR_SIMULATOR_NAME` 추가
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: property-attributes 케이스를 본떠 추가만
  - `docs/content-guide.md:164`: e2e 목록에 `new-operator`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 5번 행·진행 기록
- 변경하지 않음
  - 공통 코드(`app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`), `package.json`, `AGENTS.md`
  - 기존 개념 폴더 15개. 역방향 연결은 9절 후보.

## 5. 위험 요소

- 결과 원인을 잘못 설명("new는 this를 돌려준다"만 쓰기) → return 규칙 ③을 명세 [[Construct]] 단계 순서대로 쓰고, 예제 2·3·4와 (d) 검증으로 막는다.
- `return null`을 "객체를 return"으로 오해 → 예제 4에서 `typeof null`이 `'object'`여도 null은 객체가 아님(typeof-operator 링크), 퀴즈로 다룬다.
- this를 22장 수준으로 일반화 → 이 페이지는 "new 호출의 this"와 "일반 호출의 this(sloppy 전역 객체·strict undefined)"만 쓰고 나머지는 "별도 개념"으로만 언급한다(단순화 ②).
- 5단계를 엔진 구현처럼 서술 → "명세가 [[Construct]]로 정의한 순서를 다섯 묶음으로 나눈 것"이라고 쓰고 단순화 ③에 적는다.
- "쓰이지 않은 객체는 즉시 사라진다" 같은 GC 서술 → 쓰지 않는다. "결과로 쓰이지 않음"만 표시한다(단순화 ⑨).
- 클래스·파생 생성자에서 원시 값 return이 TypeError인 것과 혼동 → 단순화 ④에 "base 생성자(함수 선언·표현식)만 다룬다"고 쓴다.
- 내장 생성자를 "new를 빼면 원시 값" 식으로 일반화 → Object와 String이 다르다는 것을 예제 9로 보이고 "각자 명세가 정한다"고 쓴다.
- sloppy 예제가 모듈에서 TypeError → 단순화와 `.mjs` 테스트로 밝힌다(property-attributes와 같은 방식).
- 탐침이 생성자 본문 실행 흐름을 바꾸는 것 → 탐침은 읽기만 하고 JSON으로 넘긴다. 탐침 삽입 후 원래 출력과 같은지도 검사한다.
- `navigation.spec.ts` 첫 카드 검사 → 제목을 `new`로 시작한다(2절 정렬 확인). 6단계 e2e로 확인한다.
- 375px에서 단계 목록·카드 넘침 → `flex-wrap`, e2e 가로 스크롤 검사

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 9개의 실제 출력이 `expectedOutput`과 같다.
  - 본문 주장 근거 테스트(2절 vm 목록), `.mjs`·`.cjs` 출력이 2절 표와 같다, 각 sloppy 예제에 첫 줄 `'use strict';`를 붙이면 모듈 결과와 같다.
  - 시나리오 대조(3절 a~e)
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. 첫 화면: "검토 중" 배지, 분류 '객체와 프로토타입', 선행 개념 링크, 퀴즈 라디오 UI
  2. `basic`: 첫 new의 '새 객체 생성' 단계에서 빈 객체 A 카드와 단계 목록 "현재" 표시, 'this 연결' 단계에서 this = 객체 A, 마지막 콘솔 `{"title":"JS","price":30}` / `{"title":"CSS","price":20}` / `false`
  3. `return-object`: 결과 결정 단계에서 객체 B "new 식의 결과", 객체 A "결과로 쓰이지 않음", 콘솔 `{"title":"other"}`
  4. `return-primitive`: 결과 결정 단계에서 return 값 100과 결과 객체 A, 콘솔 `{"title":"JS"}`
  5. `without-new-sloppy`: 단계 목록에 '새 객체 생성'이 없음, this = 전역 객체, 전역 객체에 title, 결과 undefined, 콘솔 `undefined` / `JS`
  6. 375px·다크에서 2~5 반복: 가로 넘침 0, 키보드 ←/→/Home, 콘솔 에러 0
  7. 홈: '객체와 프로토타입' 그룹 카드 2개, 전체 카드 16개, `객체` 검색 3건(첫 카드 '원시 값과 객체'), `new` 검색 1건 이상
  8. 예제 이름이 `in window`가 아님(2절 추정)

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `app/concepts/new-operator/examples/*.js`(9개), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장 부분), 필수 h2 자리표시용 `content.mdx`
- 변경
  - 예제 9개는 아래 원문 그대로 둔다(` / `는 줄 구분, 들여쓰기 2칸, 끝 줄바꿈 1개).
    - `basic.js`: `function Book(title, price) {` / `  this.title = title;` / `  this.price = price;` / `}` / `const a = new Book('JS', 30);` / `const b = new Book('CSS', 20);` / `console.log(JSON.stringify(a));` / `console.log(JSON.stringify(b));` / `console.log(a === b);`
    - `return-object.js`: `function Book(title) {` / `  this.title = title;` / `  return { title: 'other' };` / `}` / `const book = new Book('JS');` / `console.log(JSON.stringify(book));`
    - `return-primitive.js`: `function Book(title) {` / `  this.title = title;` / `  return 100;` / `}` / `const book = new Book('JS');` / `console.log(JSON.stringify(book));`
    - `return-null.js`: `function Book(title) {` / `  this.title = title;` / `  return null;` / `}` / `const book = new Book('JS');` / `console.log(JSON.stringify(book));` / `console.log(typeof null);`
    - `without-new-sloppy.js`: `function Book(title) {` / `  this.title = title;` / `}` / `const book = Book('JS');` / `console.log(book);` / `console.log(title);`
    - `without-new-strict.js`: `'use strict';` / `function Book(title) {` / `  this.title = title;` / `}` / `try {` / `  Book('JS');` / `} catch (e) {` / `  console.log(e.name);` / `}` / `console.log(typeof title);`
    - `new-target.js`: `function Book(title) {` / `  if (new.target === undefined) {` / `    return new Book(title);` / `  }` / `  this.title = title;` / `}` / `const a = new Book('JS');` / `const b = Book('CSS');` / `console.log(JSON.stringify(a));` / `console.log(JSON.stringify(b));`
    - `non-constructor.js`: `const shop = {` / `  order() {},` / `};` / `try {` / `  new shop.order();` / `} catch (e) {` / `  console.log(e.name);` / `}` / `try {` / `  new Math.max();` / `} catch (e) {` / `  console.log(e.name);` / `}` / `console.log(typeof shop.order);` / `console.log(typeof Math.max);`
    - `built-in.js`: `const a = new Object();` / `const b = Object();` / `console.log(JSON.stringify(a));` / `console.log(JSON.stringify(b));` / `const s1 = new String('hi');` / `const s2 = String('hi');` / `console.log(typeof s1);` / `console.log(typeof s2);`
  - `meta.ts`
    - slug, title, category는 3절대로 한다.
    - summary(160자 이하): new는 새 객체를 만들어 this로 연결하고 본문을 실행한 뒤 그 객체를 돌려준다, 생성자가 객체를 return하면 그 객체가 결과이고 원시 값 return은 무시된다, new 없이 호출하면 새 객체가 생기지 않는다.
    - tags: `new`, `생성자 함수`, `constructor`, `this`, `return`, `new.target`, `[[Construct]]`, `[[Call]]`, `non-constructor`, `인스턴스`, `내장 생성자`, `strict mode`, `TypeError`
    - goals 4개: new의 단계 순서 / return 값에 따른 결과 예측 / new 없이 호출했을 때 sloppy·strict 결과 예측 / 생성자가 아닌 함수와 new.target 설명
    - prerequisites: `function-calls`, `property-keys`, `typeof-operator`, `property-attributes`(strict mode의 TypeError와 try…catch 예제 형식)
    - related: `[]`
    - examples 9개(2절 출력)
    - `reviewedAt: null`
  - 단순화
    - ① 새 객체의 프로토타입은 생성자의 `prototype` 프로퍼티로 정해진다(OrdinaryCreateFromConstructor). 프로토타입은 별도 개념이며 시각화에 표시하지 않는다.
    - ② this는 함수를 호출하는 방식에 따라 정해진다. 이 페이지는 new 호출과 일반 함수 호출(sloppy·strict)만 다루고 메서드 호출·call·apply·bind·화살표 함수는 별도 개념에서 다룬다.
    - ③ [[Call]]·[[Construct]]는 명세의 내부 메서드 이름이며 코드에서 접근할 수 없다. 시뮬레이터의 단계는 명세 [[Construct]]의 단계를 다섯 묶음으로 나눈 것이고, this가 실제로 저장되는 실행 컨텍스트·환경 레코드는 별도 개념이라 "호출 영역의 this"로 그린다.
    - ④ 클래스와 파생 생성자(`extends`)의 [[Construct]]는 다르게 동작한다(예: 원시 값을 return하면 TypeError). 이 페이지는 함수 선언·함수 표현식으로 만든 생성자만 다룬다.
    - ⑤ 화살표 함수도 생성자가 아니지만 문법을 아직 다루지 않아 예제에 쓰지 않는다.
    - ⑥ 내장 생성자는 new 유무에 따른 동작을 각자 명세가 정한다(Object는 같고 String은 다름). `new String`이 만드는 객체(래퍼 객체)는 별도 개념에서 다룬다.
    - ⑦ 예제는 오류를 try…catch와 `e.name`으로 보인다(오류 처리는 별도 개념).
    - ⑧ `without-new-sloppy.js`는 ES 모듈(항상 strict)에서 TypeError다. CommonJS는 같다.
    - ⑨ 결과로 쓰이지 않은 객체를 언제 메모리에서 정리하는지는 명세가 정하지 않는다. 시뮬레이터는 "결과로 쓰이지 않음"만 표시한다.
    - ⑩ 시뮬레이터는 선언문이 실행된 변수만 보이며 `Book` 함수 바인딩, 전역 객체의 다른 프로퍼티, `title`을 전역에서 찾는 과정, `console`·`JSON` 호출 과정을 생략한다.
  - references: 2절 앵커 중 EvaluateNew(`sec-new-operator`), [[Construct]], [[Call]], OrdinaryCreateFromConstructor, OrdinaryCallBindThis, IsConstructor, MakeConstructor, DefineMethod, `new.target`(`sec-meta-properties-runtime-semantics-evaluation`), `Object(value)`, `String(value)`와 MDN ko 5개(2절)
  - `concept.test.ts` 본문 주장 `describe`
    - 2절 vm 목록 전부
    - `.mjs`·`.cjs` 출력이 2절 표와 같다
    - sloppy 예제(5)는 첫 줄에 `'use strict';`를 붙이면 TypeError다(모듈 결과와 일치), 예제 6은 지시어를 빼면 오류 없이 전역 title이 생겨 출력이 `string` 하나가 된다(초안 실행으로 확인)
- 주의사항
  - `console.log`에는 원시 값과 `JSON.stringify` 결과만 넘긴다(예제 5의 `console.log(book)`은 `undefined` 원시 값).
  - 예제는 Prettier·ESLint 제외 경로다.
  - vm 테스트에서 객체를 꺼내 호스트에서 검사할 때는 realm이 다르므로 `instanceof`를 쓰지 않는다.
- 완료 조건
  - `npm test`에서 L1 9개와 본문 주장 테스트가 통과한다.
  - lint·format:check·typecheck가 통과한다.
  - summary 160자 이하(content-integrity 테스트)

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오 부분)
- 변경
  - 3절 상태 모델과 시나리오 4개를 만든다.
  - 단계는 3절 stage 단위로 나누고, 본문의 각 문장(`this.title = title;` 등)은 1단계씩 둔다. 대입·출력도 각 1단계.
  - 테스트: 3절 (a)~(d)와 단계 수 고정
- 주의사항
  - 단계 설명은 2절 명세 순서와 맞춘다(인수 평가가 생성자 확인보다 먼저, 새 객체 생성이 본문보다 먼저).
  - 탐침은 vm 안에서 실행하고 결과를 JSON으로 넘긴다. 탐침을 끼운 코드의 콘솔 출력이 원본과 같은지 검사한다.
- 완료 조건
  - 이 개념 테스트가 전부 통과한다.
  - 음성 확인 2건(3절 (e))은 서브에이전트가 실행해 실패를 확인하고 되돌린다. 메인이 테스트 코드를 확인한다.

### 3. 시각화 `NewView`

- 대상: `NewView.tsx`, `NewView.test.tsx`
- 변경: 3절 화면. property-attributes `AttrView`의 카드 클래스와 function-calls `CallView`의 호출 영역을 기반으로 한다.
- 주의사항: effect와 window 접근을 쓰지 않는다. 단계·역할을 색만으로 구분하지 않는다. 375px에서 줄바꿈된다.
- 완료 조건
  - `NewView.test.tsx`가 통과한다. 검사 항목: 빈 상태, new 모드 단계 목록 5개와 "현재"(`aria-current`), call 모드 단계 목록 4개(새 객체 생성 없음), this 표시(객체 라벨·전역 객체), 역할 배지 3종 글자, return 값과 결과 표시, 바뀐 칸 표시
  - typecheck가 통과한다.

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="new 연산자 시뮬레이터"`, property-attributes 래퍼와 같은 형태
- 완료 조건: 테스트 4개(첫 화면, 결과 결정 단계 문구, 시나리오 전환, 마지막 콘솔)가 통과한다.

### 5. 본문 content.mdx

- `## 동작 원리`의 h3
  - 함수는 [[Call]]을, 생성자는 [[Construct]]도 가진다
  - new가 하는 일: 다섯 단계(명세 순서)
  - 결과는 return 값이 정한다(객체 / 원시 값·null·없음)
  - new 없이 호출하면: sloppy·strict
  - `new.target`
  - 생성자가 아닌 함수(메서드 축약, 내장 함수, 화살표 함수는 이름만)
  - 내장 생성자: Object와 String(JSX `<table>`로 new 유무 비교)
- `## 예제`: 예제 1~9에 `file=` 코드 블록과 PredictQuiz를 둔다. 끝에 `### 시뮬레이터로 확인하기`.
- `## 결과와 이유`
  - 예제별 설명
  - 오해 Callout: ① new는 항상 this를 돌려준다 ② `typeof null`이 `'object'`이니 `return null`은 객체를 돌려준다 ③ new를 빼도 결과만 다를 뿐 부작용은 없다 ④ 함수라면 모두 new로 호출할 수 있다 ⑤ 내장 생성자는 new를 빼면 항상 원시 값을 돌려준다
- 링크: function-calls, property-keys, typeof-operator, property-attributes(strict TypeError), primitives-and-objects(`===`가 객체 동일성 비교)
- 주의사항
  - 2절의 확인된 사실만 쓴다. 오류 메시지 문구를 인용하지 않는다.
  - 프로토타입·this의 다른 방식·클래스·실행 컨텍스트는 "별도 개념"으로만 쓴다.
  - `**`와 깨진 인라인 code가 없어야 한다(content-guide 4단계 주의).
- 완료 조건
  - 메인이 전문을 2절과 대조한다.
  - `npm test`와 build가 성공한다.
  - HTML `<details` 수가 퀴즈 수와 같고, `**`가 0개다.

### 6. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: property-attributes 케이스를 본떠 추가만(결과 결정 단계 문구 확인 e2e 1개 포함). `navigation.spec.ts`는 두 줄의 기대값만 3으로. content-guide 목록과 로드맵 5번 행·진행 기록.
- 완료 조건: 전체 검증 명령이 통과하고, 6절 브라우저 시나리오 1~8을 확인한다.

## 9. 추가 개선 후보

- 추가 게시글 후보: 없음. 17장 내용(Object 생성자, 생성자 함수, this, [[Call]]·[[Construct]], constructor·non-constructor, new, new.target)은 이 페이지에 담았다. 내장 생성자의 new 유무 차이는 7번(원시 값의 메서드 호출)에서 이어 다룰 수 있다.
- 기존 개념 역방향 연결: `function-calls/meta.ts:75`·`property-attributes/meta.ts:93`의 "별도 개념(this)" 문구와 `related`에 이 페이지를 거는 일(기존 개념 수정, 사용자 확인)

## 변경 이력

- 2026-10-28 (사용자 요청 — 외부 콘텐츠 검토 7건 반영): 모두 vm 실행·명세로 검증 후 반영. ① "함수 선언·표현식은 생성자" → function 키워드 일반 함수로 한정, 제너레이터·async function은 생성자 아님(InstantiateGenerator/AsyncFunctionObject에 MakeConstructor 없음, new → TypeError)을 본문 「생성자가 아닌 함수」와 단순화에 추가 ② 예제 7 설명 3곳(new.target 절·퀴즈 해설·결과와 이유)이 [[Construct]]의 "객체면 결과" 규칙을 일반 호출에 적용한 것처럼 읽힘 → "일반 호출의 결과는 return 값 그대로" ③ 단순화의 클래스 문장: 기본 클래스는 원시 값 return을 무시(함수와 같음), 클래스는 new 없이 호출하면 TypeError, 파생 클래스는 undefined가 아닌 원시 값 return만 TypeError로 정정 ④ 메서드 축약 항목에 `order: function () {}`은 생성자(만든 방식의 차이) 추가 ⑤ 단순화에 newTarget 기준 서술 추가(이 페이지의 new F에서는 newTarget = F, Reflect.construct·클래스 상속은 별도 개념) ⑥ 예제 5 퀴즈 오답 보기 `{"title":"JS"} / JS` → `title이 JS인 객체 / JS`(console.log(book)은 JSON을 찍지 않음) ⑦ 내장 생성자 오해 Callout에 Map(new 없이 TypeError)·Date(new 없이 문자열) 한 줄. 근거 테스트 7개 추가. 범위·접근 방식 변화 없음 — 영향 단계 1(meta), 5(본문).
- 2026-10-29 (사용자 요청 — 외부 검토 2차 2건): ① 예제 5 퀴즈 4번 보기 `{"title":"JS"} / undefined` → `title이 JS인 객체 / undefined`(1번 보기와 형식 통일) ② 단순화의 프로토타입 항목 두 개(생성자의 prototype / newTarget 기준)를 하나로 합침 — 명세상 newTarget의 prototype, 이 페이지에서는 newTarget = F. 단순화 12 → 11개. 영향 단계 1(meta), 5(본문).

## 구현 진행
- baseline (2026-10-28, `9118905` + 미커밋 reviewedAt 2건): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 58파일 1441 통과(메인 실행). `test:build` 120·`e2e` 219 통과(3 skipped)는 같은 커밋의 직전 검증 결과(property-attributes 구현 진행 7·6). dev 서버 5173 실행 중, serve 4175 미실행.
- [x] 1. 예제·meta·route·본문 주장 테스트 — 서브에이전트 작성, 메인 재실행: lint·format:check·typecheck 통과, 이 개념+L1+L3 3파일 312 통과. 예제 9개 = 계획 초안 실행본(diff 없음). 본문 주장 테스트 20개(2절 vm 목록 전부 + sloppy/strict 예제 지시어 확인) + ESM/CJS 비교. meta 메인 검토: summary·goals·단순화 ①~⑩·references 17개 계획과 일치.
- [x] 2. 시나리오와 대조 테스트 — 메인 재실행: lint·format·typecheck 통과, 이 개념 104 통과. 단계 수 18/9/9/8. (a) 공통 불변식 (b) 참조·stage 순서·changed/created·role 일치 (c) 탐침 스냅샷(생성자 본문은 this 자기 프로퍼티, 바깥은 변수, sloppy는 `this === globalThis`·전역 title, 탐침 코드 출력 = 원본) (d) vm 안 `===`로 결과가 this인지 판정. 음성 확인(서브에이전트 실행·원복): return-primitive 결과를 100으로 → 1 실패, return-object 결과를 A로 → 1 실패, role 뒤바꿈 → 2 실패. 메인 검토 수정 1건: sloppy 시나리오에서 전역 객체에 `created`(새로 생김)가 붙어 있었음 → 전역 객체는 실행 전부터 있으므로 0단계부터 카드를 두고 `created` 금지(테스트 추가). 단계 설명을 명세 순서(EvaluateNew 인수 평가 → IsConstructor, [[Construct]] 객체 생성 → OrdinaryCallBindThis → 본문 → 결과)와 대조 — 수정 없음.
- [x] 3. 시각화 `NewView` — 서브에이전트 작성. 메인 재실행: lint·format·typecheck 통과, 이 개념 3파일 116 통과. effect·window·document 없음(grep). 단계 목록 `<ol>` + `aria-current="step"`·"현재"/"완료" 글자, 역할 배지 글자, `data-changed`. 참고(Low): 전역 객체 카드는 라벨과 역할 배지가 둘 다 "전역 객체"로 겹침(계획의 배지 설계대로, 보고만).
- [x] 4. 래퍼 `Simulator` — `label="new 연산자 시뮬레이터"`, property-attributes 래퍼와 같은 형태. `Simulator.test.tsx` 4개 통과.
- [x] 5. 본문 content.mdx — 서브에이전트 작성(퀴즈 9, h3 7, misconception 5, `<table>` 1). 메인이 전문을 명세·실행 결과와 대조해 수정: ① "3단계에서 만든 객체" → "2단계"(새 객체는 2단계에서 만들어짐) ② "예제 6과 8, 9는 try…catch" → "6과 8"(예제 9에는 없음) ③ sloppy/strict 분기 기준을 "코드" → "호출된 함수의 코드"(OrdinaryCallBindThis는 함수의 thisMode로 판단) ④ "예제 5와 6의 차이는 함수가 아니라 모드" → "Book 본문은 같고 strict mode인지만 다름" ⑤ 도입 문장을 동작 기준으로 ⑥ 시뮬레이터 안내의 시나리오 이름을 실제 label로. 근거 테스트 1개 추가(생성자가 아닌 함수에 new를 써도 인수가 TypeError보다 먼저 평가됨). 메인 재실행: lint·format·typecheck 통과, `npm test` 61파일 1577 통과, build 성공, HTML `<details` 9·`**` 0·`<table` 1·깨진 code 0.
- [x] 6. e2e·빌드 테스트·문서 — 서브에이전트가 테스트 4파일에 추가만(property-attributes 케이스 본뜸 + 결과 결정 단계 '결과로 쓰이지 않음' e2e), `navigation.spec.ts` `toHaveCount(2)` 두 곳만 3으로, content-guide 목록·로드맵 5번 행·진행 기록. 메인이 diff 확인 후 전체 재실행: lint·format·typecheck 통과, `npm test` 61파일 1577, `test:build` 127, `e2e` 235 통과·3 skipped(기존). 브라우저(빌드 serve 4175, Playwright, 데스크톱 라이트·375px 다크): 4개 시나리오 단계 수 18/9/9/8, 단계 목록 '현재'/'완료'와 this 표시(→ 객체 A/B, → 전역 객체), 결과 결정 단계 role 배지(결과로 쓰이지 않음·new 식의 결과), call 시나리오 목록에 '새 객체 생성' 없음, 마지막 콘솔 4개 모두 계획과 일치, '검토 중' 1·'객체와 프로토타입' 1·라디오 40(퀴즈 36 + 시나리오 4), 키보드 →→ 후 단계 3·Home 후 단계 1, 가로 넘침 0(진행 후 포함), 콘솔 에러 0, 예제 이름 `in window` 없음([]), 홈 카드 16·`객체` 3(첫 카드 '원시 값과 객체')·`new` 1. 375px 다크 결과 결정 단계 스크린샷 육안 확인.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가 + 기대값 2줄 + 문서): 새 Critical/High 0. 명세 불일치·사실 오류는 2·5단계 메인 대조에서 수정 완료(전역 객체 `created`, 단계 번호, try…catch 언급, strict 판단 기준). 확인한 것: 단계 설명·본문이 EvaluateNew(인수 평가 → IsConstructor)·[[Construct]](객체 생성 → this 연결 → 본문 → Object면 그 값, 아니면 thisArg)·[[Call]]·OrdinaryCallBindThis(함수의 thisMode)·EvaluateCall(WithBaseObject → undefined)·DefineMethod·MakeConstructor·Object/String(value)와 일치, 모든 실행 결과 주장에 테스트 존재(`.mjs`·`.cjs`·지시어 재실행 포함), 탐침은 vm 안에서 읽기만, NewView에 effect·window 없음(하이드레이션), 오류 메시지 인용 없음, GC 서술 없음, e2e 추가 케이스는 기존 케이스 수정 없음. Low 2: ① 전역 객체 카드의 라벨과 역할 배지가 둘 다 "전역 객체"(중복 표시, 정보 손실 없음) ② 본문 "함수와 배열도 객체"에서 배열은 27장 개념(실행 근거 테스트는 있음). 둘 다 보고만.
- [x] 7. 외부 콘텐츠 검토 반영(변경 이력 2026-10-28) — 메인 직접(본문·meta 문장과 근거 테스트 7개). 재실행: lint·format·typecheck 통과, `npm test` 61파일 1584, `test:build` 127, `e2e` 235 통과·3 skipped, HTML `<details` 9·`**` 0·깨진 code 0. 재리뷰(수정 diff와 예제 7·클래스·생성자 판정 흐름): 새 Critical/High 0.
- [x] 8. 외부 검토 2차 반영(변경 이력 2026-10-29) — 메인 직접(문장 2곳, 새 주장 없음: 근거 테스트는 기존 Reflect.construct·Book.prototype 테스트). 재실행: lint·format·typecheck 통과, `npm test` 61파일 1584, `test:build` 127, `e2e` 235 통과·3 skipped. 빌드 HTML에 새 보기·합친 문장 반영, 옛 문장 0.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 예제 9개, 시나리오 4개(18/9/9/8단계), 퀴즈 9, misconception 5, `<table>` 1. 공통 코드와 기존 개념 파일은 바꾸지 않았고 `navigation.spec.ts`는 기대값 두 곳만 3으로 바꿨다.
- 계획과 달라진 점: 시나리오의 전역 객체 카드를 0단계부터 두고 `created`를 붙이지 않았다(2단계 메인 검토). 외부 콘텐츠 검토 두 차례(7건, 2건)로 본문·단순화 문장을 고치고 근거 테스트 7개를 더했다(`변경 이력`). 단순화는 계획의 10개에서 11개가 되었다. 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- 새 Critical/High 0. 명세 불일치(전역 객체 `created`, 단계 번호, try…catch 언급, strict 판단 기준)는 구현 단계에서 수정했다. Low 2건(전역 객체 카드의 라벨·배지 중복, 본문 "함수와 배열도 객체"의 배열은 27장 개념)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록
- [ ] (선택) 리뷰 Low 2건: 전역 객체 카드 배지 중복, "배열도 객체" 표현

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] sloppy 일반 호출 시나리오에서 전역 객체 카드를 0단계부터 두고 "새로 생김"(`created`)을 붙이지 않았다 — 전역 객체는 코드 실행 전부터 있고, `Book('JS')`가 바꾸는 것은 전역 객체에 `title` 프로퍼티가 생기는 것뿐이다. 새로 생긴 것처럼 그리면 "new 없이 불러도 객체가 하나 만들어진다"는 오개념이 된다.
- [Claude 판단] sloppy/strict 분기 기준을 "코드"가 아니라 "호출된 함수의 코드"로 썼다 — OrdinaryCallBindThis는 호출된 함수의 thisMode(그 함수 코드가 strict인지)로 this를 정하고, 호출하는 쪽의 모드는 보지 않는다.
- [무검토 승인] 시뮬레이터 대조 테스트에서 "결과가 this 객체인가"를 JSON 비교가 아니라 vm 안의 `===`로 판정했다 — 같은 내용의 다른 객체를 JSON으로는 구분할 수 없어서, `return-object`에서 결과를 A로 잘못 그려도 통과할 수 있다.
- [무검토 승인] 시나리오는 4개(기본, 객체 return, 원시 값 return, new 없이 호출)만 두고 예제 4·6·7·8·9는 예제·퀴즈·본문으로 다뤘다 — 단계 그림이 새로 보여 주는 것이 있는 경우만 시나리오로 만들었다.
- [무검토 승인] 제목을 `new 연산자: …`로 시작했다 — `localeCompare('ko')` 정렬에서 '원시 값과 객체' 뒤로 가서 `객체` 검색의 첫 카드 검사가 그대로 통과한다.
- 범위(new 없이 호출, new.target, 생성자가 아닌 함수, Object·String 내장 생성자)와 `객체` 검색 기대값 3은 사용자 결정. 외부 검토 9건 반영은 사용자 요청.

#### 배경지식

- `new F(...)`는 F의 [[Construct]], `F(...)`는 [[Call]]을 부른다. [[Construct]](base)는 새 객체를 thisArg로 만들고 본문 결과가 Object 타입이면 그 값을, 아니면 thisArg를 돌려준다. [[Call]]에는 이 규칙이 없어 return 값이 그대로 결과다.
- `null`은 `typeof`가 `'object'`지만 Object 타입이 아니라서 return해도 무시된다.
- 생성자 여부는 함수를 만든 방식이 정한다. function 키워드로 만든 일반 함수는 MakeConstructor를 거쳐 생성자이고, 메서드 축약·제너레이터·async function·화살표 함수와 "constructor"로 기술되지 않은 내장 함수(`Math.max`)는 생성자가 아니다.
- ES 모듈 코드는 항상 strict mode라서 같은 코드도 sloppy 스크립트와 결과가 다를 수 있다.

#### 확인 질문

1. `typeof null`은 `'object'`인데, 생성자가 `return null`을 하면 왜 `null`이 아니라 this 객체가 결과일까?
   <details><summary>답</summary>[[Construct]]는 return 값이 Object 타입인지로 판단하고, null은 Null 타입이다. `typeof`의 결과와는 관계없다. 예제 `return-null.js`, 2절 명세 [[Construct]].</details>
2. 예제 7에서 `Book('CSS')`가 안에서 `return new Book(title)`을 하면 결과가 그 객체가 된다. 이것은 [[Construct]]의 "객체면 그 객체" 규칙 때문일까?
   <details><summary>답</summary>아니다. 일반 호출([[Call]])은 return 값을 그대로 돌려줄 뿐이고, 원시 값을 return해도 그대로 결과다. "객체면 결과, 아니면 this"는 new 호출에만 있는 규칙이다. 변경 이력 2026-10-28 ②, `concept.test.ts`의 일반 호출 근거 테스트.</details>
3. sloppy 시나리오에서 전역 객체 카드에 "새로 생김"을 붙이면 무엇이 틀린가?
   <details><summary>답</summary>new 없이 호출하면 새 객체가 생기지 않는다. 전역 객체는 실행 전부터 있었고 `title` 프로퍼티만 생긴다. 구현 진행 2단계, `concept.test.ts`의 전역 객체 `created` 금지 테스트.</details>
4. 결과가 this 객체인지 검사할 때 화면 상태와 실제 값을 JSON으로만 비교하면 어떤 잘못을 놓칠까?
   <details><summary>답</summary>내용이 같은 다른 객체를 구분하지 못한다. 그래서 vm 안에서 탐침으로 담아 둔 `this`와 결과를 `===`로 비교해 role(`result`/`unused`)과 대조한다. 3절 정확성 검증 (d), 구현 진행 2단계 음성 확인.</details>
5. `without-new-sloppy.js`를 `.mjs`로 실행하면 왜 결과가 달라질까?
   <details><summary>답</summary>모듈 코드는 항상 strict라서 일반 호출의 this가 undefined이고, `this.title = …`에서 TypeError가 난다. 단순화 목록, `concept.test.ts`의 ESM/CJS 비교.</details>
