# 함수의 name 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-19
- 기준: `main` @ `c0f2325`

## 0. 요약
- 목적: "`o.p = () => {}`의 name은 왜 빈 문자열일까"를 질문으로 하는 `function-name` 페이지를 추가한다(order 257, 학습 순서 37번째/72). 익명 함수 정의가 바인딩 초기화식·식별자 대입·리터럴 키 자리에 **바로** 있을 때만 그 이름을 받고(명세 NamedEvaluation → SetFunctionName), name은 만들 때 한 번 정해지며 대입으로는 바꿀 수 없다는 것을 명세와 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 5개, 비교표 1개, 퀴즈 5개, 시뮬레이터 없음), function-definitions의 name 문장 두 곳을 조건을 넣어 고치고 연결, 37번째 이후 순위 +1 테스트와 e2e·빌드 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: "name은 담은 변수 이름"처럼 틀린 모델을 배제하지 못하는 예제와 조건 없는 문장(괄호는 오른쪽만 통과, `키: 값`은 값이 익명 함수 정의일 때만), this-binding(bind)·default-parameters(length)와 중복, 뒷장(심벌·디스트럭처링·모듈) 선행.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → HIGH 2(function-definitions 원문이 배제 대상 모델, export default 링크 규칙 위반·요약 문장)·MEDIUM 다수 반영, 메인이 명세·실행으로 재확인)
- 미확정: 없음 (this-binding 문구는 9절 후보로 분리)

## 1. 요구사항

- 사용자 결정(2026-11-19)
  - 추가 게시글 로드맵 3의 2번(`.claude/plans/concept-roadmap-extras-3.md`). order 257(`default-parameters` 255 뒤, `array-index-length` 260 앞).
  - bind 범위: this-binding(`content.mdx:62`)이 bound function의 name·length·prototype을 이미 쓰므로 **겹치지 않는 것만** 예제로 보인다 — bind는 bind하는 순간의 `name`을 읽는다(`defineProperty`로 바꾼 뒤 bind하면 `'bound z'`). 나머지는 this-binding 링크, `length`는 default-parameters(`content.mdx:20-22`, 예제 6) 링크만.
  - 시각화: 비교표 + 퀴즈(시뮬레이터 없음).
- 새 페이지 메타
  - `app/concepts/function-name/`, slug `function-name`, category `fundamentals`(function-definitions·function-calls와 같은 함수 주제), order 257, `reviewedAt: null`.
  - 제목(안): "함수의 name: o.p = () => {}의 name은 왜 빈 문자열일까".
  - summary(156자, "객체" 없음, 2026-11-20 사용자 검토로 수정): "익명 함수 정의는 변수 초기화식, 식별자 대입의 오른쪽, 리터럴의 키: 값처럼 명세가 정한 자리에 바로 있을 때만 이름을 받고, 프로퍼티에 대입하거나 인수로 넘기면 빈 문자열입니다. 메서드·getter·setter는 키로 이름이 정해집니다. 그 이유를 명세와 실행으로 확인합니다."
  - tags: `name`, `이름 추론`, `NamedEvaluation`, `SetFunctionName`, `익명 함수`, `getter`, `bind`, `Function 생성자`. 제목·요약·태그에 "객체"를 쓰지 않는다(`navigation.spec.ts`의 "객체" 검색 결과 수·순위 고정, `app/lib/concepts.ts`가 title·summary·tags 검색).
  - goals(4)
    1. 익명 함수 정의가 변수 초기화식·매개변수 기본값·식별자 대입의 오른쪽, 리터럴의 `키: 값`에 바로 있으면 그 이름을 받고, 메서드·getter·setter는 키(getter·setter는 `get `·`set ` 접두)를 받는다는 것을 예측할 수 있다.
    2. `o.p = () => {}`, 인수로 넘긴 함수, 쉼표·`||`로 감싼 함수의 name이 빈 문자열인 이유를 "왼쪽이 식별자인가", "오른쪽 식이 함수 정의 그 자체인가"라는 두 조건으로 설명할 수 있다.
    3. 이미 만든 함수를 다른 변수에 담아도 name이 바뀌지 않고, Function 생성자로 만든 함수는 `anonymous`라는 것을 예측할 수 있다.
    4. name 프로퍼티의 어트리뷰트로 대입(sloppy 무시·strict TypeError), `defineProperty`, `delete`, `bind`의 결과를 예측할 수 있다.
  - prerequisites: 함수를 정의하는 방법(`function-definitions`, 95), 프로퍼티 어트리뷰트와 접근자(`property-attributes`, 150), 화살표 함수와 메서드 축약(`arrow-functions`, 250). 모두 order < 257.
  - related: `function-definitions`, `property-attributes`, `arrow-functions`, `default-parameters`, `this-binding`, `prototype-chain`, `strict-mode`, `short-circuit-evaluation`, `class-basics`, `symbol`, `spread-destructuring`, `es-modules`, `error-handling`.
- 첫 문단의 답
  - 함수의 `name`은 함수를 만들 때 SetFunctionName이 자기 프로퍼티로 정한다(어트리뷰트 `writable: false`, `enumerable: false`, `configurable: true`). 이름을 받지 못한 익명 함수도 빈 문자열인 자기 프로퍼티가 생긴다.
  - 익명 함수 정의(이름 없는 `function` 식, 화살표 함수)가 바인딩의 초기화식(`var`·`let`·`const`, 매개변수 기본값)이나 왼쪽이 식별자인 대입의 오른쪽에 바로 있으면 명세는 그 이름을 넘겨 함수를 만든다(NamedEvaluation). 리터럴의 `키: 값`은 값이 익명 함수 정의일 때 키를 넘기고, 메서드·getter·setter는 항상 키로 정한다.
  - `o.p = () => {}`는 대입식의 왼쪽이 식별자가 아니라서(IsIdentifierRef가 false) 이름을 넘기지 않고, 화살표 함수는 빈 문자열을 이름으로 만들어진다. 명세가 이 경우를 왜 이렇게 정했는지(설계 의도)는 추측해 쓰지 않는다.
- 동작 원리 절(h3 4개)
  1. **name은 만들 때 정해진다**: SetFunctionName(명세 10.2.9)이 자기 프로퍼티를 만든다. "이름 추론"은 관용 표현이고 명세는 NamedEvaluation과 SetFunctionName으로 정의한다고 밝힌다.
  2. **이름을 넘겨받는 자리**(예제 1·2): 1절 둘째 항목. `||=`·`&&=`·`??=`도 왼쪽이 식별자이면 이름을 넘긴다는 한 문장(링크·개념 이름 없음 — 어느 페이지도 논리 대입을 다루지 않는다, `increment-decrement/meta.ts:77`). getter는 프로퍼티를 읽으면 실행되어 반환값이 나오므로 `Object.getOwnPropertyDescriptor`로 함수를 꺼낸다는 한 문장(예제 2의 `o.size`가 `1`).
  3. **이름을 넘겨받지 못하는 자리**(예제 3·4): 왼쪽이 식별자가 아닌 대입, 인수·`return` 같은 바인딩 아닌 자리, 오른쪽 식이 함수 정의가 아닌 경우(쉼표 식, `||` 식, 삼항, 대입식, `new` 식). 괄호는 **오른쪽 식에서만** 함수 정의를 그대로 통과시킨다(IsFunctionDefinition·NamedEvaluation이 괄호를 통과). 함수 정의인지는 실행 중 값이 아니라 코드 모양으로 정해진다(정적 판정). 이미 이름이 있는 함수 정의(`function inner() {}`)는 이름을 넘겨받지 않는다. Function 생성자는 CreateDynamicFunction이 `anonymous`로 정한다.
  4. **name을 바꾸는 방법**(예제 5): 대입은 막힌 대입이라 sloppy 무시·strict TypeError([프로퍼티 어트리뷰트와 접근자](/concepts/property-attributes)의 막힌 대입 절 링크). configurable이라 `Object.defineProperty`로 재정의·`delete` 가능. 삭제하면 [프로토타입 체인](/concepts/prototype-chain)에서 `Function.prototype.name`(빈 문자열)을 읽는다. bind는 bind하는 순간 `name`을 읽어 앞에 `bound `를 붙인다(명세 Function.prototype.bind의 `Get(target, "name")`; bound function 전반은 [this](/concepts/this-binding) 링크). 이 페이지에서는 bound function 이름을 "원래 이름"이라고 쓰지 않는다(9절).
- 예제(모두 sloppy 스크립트, 첫 줄 `const show = (f) => JSON.stringify(f.name);`, 출력은 `show` 결과·원시 값·불리언·오류 이름만). 파일 원문은 구현 때 그대로 옮긴다(아래 출력은 Node v24.22.3 vm 실행 결과).
  1. `binding-names.js`: `function decl() {}`, `var v = function () {};`, `let arrow = () => {};`, `let later;` + `later = function () {};`, `function withDefault(cb = function () {}) { return show(cb); }` → `"decl" "v" "arrow" "later" "cb"`.
  2. `property-key-names.js`: 리터럴 `o = { prop: () => {}, method() {}, get size() { return 1; }, set size(v) {}, ['item' + 1]: function () {}, 1.50: () => {} }` → `"prop" "method"` / `"get size" "set size" 1`(디스크립터의 get·set, 그리고 `o.size`) / `"item1" "1.5"`(이름은 ToPropertyKey한 키 문자열 — `1.50`으로 "소스 글자 그대로" 모델 배제).
  3. `no-name.js`: `o.p = () => {};`, `o['q'] = function () {};` → `"" ""` / `take(() => {})`(매개변수 `fn`) → `""` / `const paren = (function () {});`, `const comma = (0, function () {});`, `const either = null || function () {};` → `"paren" "" ""`.
  4. `fixed-at-creation.js`: `const copy = original;` → `"original"` / `const named = function inner() {};` → `"inner"` / `let a, b;` + `a = b = function () {};` → `"b" "b"` / `const made = new Function('return 1');` → `"anonymous"`.
  5. `name-attributes.js`: 디스크립터 → `false false true` / 5번 줄 `f.name = 'z';` 뒤 → `"f"` / 본문 첫 줄 `'use strict';`인 `setInStrict()`의 같은 대입 → `TypeError` / `Object.defineProperty(f, 'name', { value: 'z' })` 뒤 `show(f), show(f.bind(null))` → `"z" "bound z"` / `delete f.name` 뒤 `show(f), Object.hasOwn(f, 'name')` → `"" false` / `const anon = (0, () => {});` → `"" true`.
  - 파일 첫 줄에 `'use strict';`를 붙이면 예제 5만 5번 줄에서 TypeError로 멈추고 나머지는 출력이 같다(메인 실행 확인). 예제 5의 sloppy 전제를 본문 예제 머리말과 simplifications에 밝힌다.
- 예제별로 배제하는 틀린 모델과 퀴즈 선택지(정답은 expectedOutput을 ' / '로 이은 것, 오답은 각 틀린 모델이 낼 출력)
  1. 정답 `"decl" "v" "arrow" "later" "cb"` / 오답 "함수 선언만 이름이 있다" `"decl" "" "" "" ""`, "선언의 초기화식만 이름을 준다(대입은 아님)" `"decl" "v" "arrow" "" "cb"`, "매개변수 기본값은 이름을 주지 않는다" `"decl" "v" "arrow" "later" ""`.
  2. 정답 `"prop" "method" / "get size" "set size" 1 / "item1" "1.5"` / 오답 "getter·setter도 키 그대로" `"prop" "method" / "size" "size" 1 / "item1" "1.5"`, "소스에 쓴 글자 그대로" `"prop" "method" / "get size" "set size" 1 / "item1" "1.50"`, "리터럴은 이름을 주지 않는다" `"" "" / "" "" 1 / "" ""`.
  3. 정답 `"" "" / "" / "paren" "" ""` / 오답 "담긴 프로퍼티·바인딩 이름" `"p" "q" / "fn" / "paren" "comma" "either"`, "값이 들어간 바인딩 이름(매개변수 포함)" `"" "" / "fn" / "paren" "comma" "either"`, "실행 중 값이 흘러간 바인딩 이름" `"" "" / "" / "paren" "comma" "either"`.
  4. 정답 `"original" / "inner" / "b" "b" / "anonymous"` / 오답 "담은 변수 이름" `"copy" / "named" / "a" "b" / "made"`, "바인딩 이름이 함수 이름을 덮는다" `"original" / "named" / "b" "b" / "anonymous"`, "대입마다 이름이 다시 정해진다" `"original" / "inner" / "a" "b" / "anonymous"`.
  5. 정답 `false false true / "f" / TypeError / "z" "bound z" / "" false / "" true` / 오답 "sloppy 대입은 바뀐다" 5번째 줄 `"z"`인 것, "bind는 만들 때 정해진 이름을 쓴다" `"z" "bound f"`인 것, "삭제하면 undefined, 익명 함수는 자기 name이 없다" `undefined false / "" false`인 것.
- 비교표(결과와 이유 절, 머리 `코드 | name | 이유 | 예제`, 행 10개, 코드 칸은 그 예제 파일에 그대로 있는 문자열, 이유 칸은 아래 문구 그대로)
  1. `function decl() {}` | `'decl'` | 함수 선언에 쓴 이름 | 1
  2. `var v = function () {};` | `'v'` | 초기화식이 익명 함수 정의라 바인딩 이름을 받음 | 1
  3. `later = function () {};` | `'later'` | 왼쪽이 식별자이고 오른쪽이 익명 함수 정의라 그 이름을 받음 | 1
  4. `prop: () => {}` | `'prop'` | 값이 익명 함수 정의라 프로퍼티 키를 받음 | 2
  5. `get size()` | `'get size'` | getter는 프로퍼티 키 앞에 get을 붙임 | 2
  6. `o.p = () => {};` | `''` | 왼쪽이 식별자가 아니라 이름을 받지 못함 | 3
  7. `const comma = (0, function () {});` | `''` | 오른쪽 식이 쉼표 식이라 함수 정의가 아님 | 3
  8. `const copy = original;` | `'original'` | 새 함수를 만들지 않고 이미 있는 함수로 초기화 | 4
  9. `new Function('return 1')` | `'anonymous'` | Function 생성자가 정한 이름 | 4
  10. `f.bind(null)` | `'bound z'` | defineProperty로 name을 z로 바꾼 뒤라 bind할 때의 name 앞에 bound를 붙임 | 5
  - 표기: 코드·name 칸은 `<code>`로 쓴다. `{}`가 든 칸은 `<code>{'…'}</code>`, 작은따옴표가 든 칸(`new Function('return 1')`, name 칸)은 `<code>{"…"}</code>` 또는 평문 `<code>'decl'</code>`(`normalizeCell`이 푸는 형식인지 `tests/helpers/result-tables.ts`로 확인). `<` 문자는 쓰지 않는다. `<th>` 한 줄, 스크롤 영역(`tabIndex={0} role="region" aria-label`).
- 흔한 오해 Callout 2개: "name은 함수를 담은 변수의 이름이다"(예제 4 `copy`, 예제 3 `o.p`·`comma`), "f.name = '새 이름'으로 이름을 바꿀 수 있다"(예제 5).
- simplifications(개념 이름은 실제 제목의 앞부분 관례: "심벌 개념", "스프레드와 디스트럭처링 개념", "클래스는 함수다 개념", "try/catch/finally 개념")
  - "이름 추론"은 명세 용어가 아니며 명세는 NamedEvaluation과 SetFunctionName으로 정의한다.
  - 함수 `length`의 기본 규칙은 매개변수 기본값 개념에서, bound function의 `length`·`prototype`·this는 this 개념에서 다룬다.
  - 심벌을 키로 쓴 메서드의 name은 `[설명]` 꼴(설명이 없으면 빈 문자열)이 되지만 예제로 다루지 않는다(심벌은 심벌 개념에서 다룬다).
  - 디스트럭처링 기본값(`const { a = () => {} } = {}`)도 바인딩 이름을 넘기지만 다루지 않는다(디스트럭처링은 스프레드와 디스트럭처링 개념에서 다룬다). 모듈의 `export default`에 쓴 익명 함수의 name도 다루지 않는다(값을 적지 않는다).
  - 클래스도 같은 규칙으로 name이 정해지고(`const B = class {}`의 `B.name`은 `'B'`), 클래스 필드의 초기화식도 필드 이름을 넘긴다(`h = () => {}`의 name은 `'h'`). 클래스는 클래스는 함수다 개념에서 다루며, `static name` 메서드와 겹치는 경우·제너레이터·async 함수·private 메서드·`Function.prototype.toString`이 쓰는 [[InitialName]]은 다루지 않는다.
  - 리터럴의 `__proto__: function () {}`는 프로퍼티를 만들지 않고 프로토타입을 정하는 형태라 이름을 넘기지 않는다(빈 문자열). 왼쪽을 괄호로 감싼 `(x) = function () {}`도 왼쪽이 식별자로 취급되지 않아 빈 문자열이다.
  - Node 오류 스택 같은 호스트의 함수 표시 이름은 `name` 프로퍼티와 별개다(Node에서 `o.p`에 담은 화살표 함수가 던진 오류의 스택은 `at o.p`로 표시된다).
  - 예제 5는 sloppy mode에 기댄다. 파일 첫 줄에 `'use strict';`를 붙이면 5번 줄 대입이 TypeError가 되어 실행이 멈춘다. 나머지 예제는 지시어를 붙여도 출력이 같다.
  - 예제의 try…catch는 오류 이름을 보이는 용도이며 try/catch/finally 개념에서 다룬다. `console`은 호스트 API다.
- 본문 링크(대상이 그 하위 주제를 실제로 다루는 문장에만): function-definitions(이름 있는 함수 표현식의 이름 바인딩), property-attributes(막힌 대입·configurable 재정의), prototype-chain(함수의 [[Prototype]]이 Function.prototype), this-binding(bound function), default-parameters(함수의 length), short-circuit-evaluation(`null || function () {}`에서 `||`가 오른쪽 피연산자를 돌려준다는 문장), arrow-functions(메서드 축약).
- 기존 페이지 문구(function-definitions, reviewedAt은 지금 바꾸지 않고 finalize 때 사용자에게 묻는다)
  - `content.mdx:19` 마지막 문장 → "변수 선언의 초기화식에 바로 쓴 익명 함수의 `name` 프로퍼티가 변수 이름으로 정해지는 것은 이름 바인딩과 다른 동작이며 [함수의 name](/concepts/function-name)에서 다룹니다. 이 페이지는 "이름 바인딩"만 다룹니다."
  - `meta.ts:101` "함수의 name 프로퍼티와 이름 추론(익명 함수 표현식을 변수에 담으면 name이 정해지는 것)은 별도 개념입니다." → "함수의 name 프로퍼티와 이름 추론(변수 선언의 초기화식에 바로 쓴 익명 함수 표현식의 name이 정해지는 것)은 함수의 name 개념에서 다룹니다." related에 `function-name`.
  - `concept.test.ts:196` it 제목 "변수에 담은 익명 함수 표현식의…" → "변수 선언의 초기화식에 바로 쓴 익명 함수 표현식의…"(probe는 그대로).

## 2. 사실과 추정

### 사실 (코드·실행에서 확인)
- order 255 default-parameters, 260 array-index-length 사이 257이 비어 있다. order < 257인 개념 36개라 새 페이지는 37번째, 총 72개(Architect도 확인).
- 기존 서술: this-binding `content.mdx:62`(bound function의 name·length·prototype), default-parameters `content.mdx:20-22`(length, 예제 6), function-definitions `content.mdx:19`·`meta.ts:101`(name은 "변수에 담으면" 정해지는 별도 동작/개념 — 조건이 빠진 표현), property-attributes `content.mdx:16-20,32-34`(writable·configurable, 막힌 대입 sloppy 무시·strict TypeError), prototype-chain `content.mdx:35`(함수의 [[Prototype]]). 함수 name 추론을 다룬 페이지는 없고(`grep -rnE 'name 프로퍼티|이름 추론|SetFunctionName|NamedEvaluation' app/concepts`), 논리 대입을 다룬 페이지도 없다(`increment-decrement/meta.ts:77`). es-modules는 `export default`의 name을 다루지 않는다(`content.mdx:63`, `meta.ts:209`). class-basics는 필드를 다루지만 name은 다루지 않는다(`content.mdx:39-41`).
- 개념 이름 관례: "심벌 개념" 5곳, "스프레드와 디스트럭처링 개념" 8곳, "클래스는 함수다 개념" 1곳(`app/concepts/*/meta.ts`).
- 명세(2026-11-19 tc39.es 현재 초안, ES2027): SetFunctionName 10.2.9, IsFunctionDefinition 8.4.2(괄호 통과, 쉼표·`||`·`??`·삼항·대입식·`new`는 false), IsAnonymousFunctionDefinition 8.4.3, IsIdentifierRef 8.4.4(괄호로 감싼 왼쪽은 false), NamedEvaluation 8.4.5(괄호 통과), 대입 평가 13.15.2(`=`와 `&&=`·`||=`·`??=`만, 복합 대입 아님), PropertyDefinitionEvaluation 13.2.5.6(값이 익명 함수 정의이고 `__proto__` 세터가 아닐 때만), InstantiateOrdinaryFunctionExpression 15.2.5·화살표 15.3.4(이름 없으면 빈 문자열), Function.prototype.bind 20.2.3.2(`Get(target, "name")`, 문자열 아니면 빈 문자열), CreateDynamicFunction(`SetFunctionName(func, "anonymous")`), Function.prototype의 name은 빈 문자열.
- Node v24.22.3 vm 실행(메인·검토자): 예제 1~5 출력이 1절과 같고 `'use strict';` 접두는 예제 5만 바꾼다. 단순화·본문 근거: `const B = class {}` → `B`, 필드 `h`·`static s` → `h`·`s`, `const { a = () => {} } = {}` → `a`, Symbol 키 → `[d]`·빈 문자열, `__proto__: function(){}` → 빈 문자열, `(x) = function(){}` → 빈 문자열, `x ??= …`·`||=`·`&&=` → 이름 넘김, `({ p: function q(){} }).p.name` → `q`, `function g(){}; ({ p: g }).p.name` → `g`, 삼항·`||` 오른쪽 → 빈 문자열, `Object.hasOwn(Function.prototype, 'name')` → `true`, getter를 프로퍼티로 읽으면 반환값, Node 스택 `at o.p`.
- 순서 고정 테스트에서 바뀌는 곳(Architect 확인): `app/lib/concepts.test.ts:104,111,112`(총수 71→72), `ConceptPager.test.tsx:18,28`(총수), `navigation.spec.ts:86,151`(카드·article 수), `:94`('71번째' → '72번째'), `N / 71` 전부 → `/ 72`(순위 37 이상 +1), pager(default-parameters 다음 → function-name, 새 블록 37/72, array-index-length 이전 → function-name), "객체" 검색 순위 배열에서 37 이상 +1, `responsive.spec.ts:1718`(홈 article 수), 등록: `a11y.spec.ts`·`helpers.ts`·`responsive.spec.ts`(가로 스크롤)·`build-output.test.ts`·`docs/content-guide.md`. `build-output.test.ts`의 pager 검사는 동적 계산이라 그대로.

### 추정
- 없음

## 3. 구현 전략

- function-definitions·bigint와 같은 구조(ecmascript, 비교표 + 퀴즈, 시뮬레이터 없음).
- 예제마다 1절의 "배제하는 틀린 모델" 출력을 둔다. 퀴즈 오답은 그 모델들이 실제로 낼 출력으로 고정했다.
- 비교표 검증은 function-definitions 방식: concept.test가 행마다 `{ code, name, reason, example, probe }`를 정의하고, `tableBody`로 읽은 칸 전체 문구를 정확히 비교하고, probe 실행 결과가 name 칸과 같은지, 예제 칸 번호의 예제 파일(`exampleFilesByNumber`)에 코드 칸 문자열이 그대로 있는지 검사한다. 10행 probe는 `defineProperty`를 포함한다.
- 빈 문자열을 보이려고 모든 이름을 `JSON.stringify`로 출력한다(`show` 도우미). 배열 리터럴(27장, 260)·심벌·디스트럭처링·클래스는 예제에 쓰지 않는다. `Object.hasOwn`·`JSON.stringify`는 앞 순서 페이지(class-accessors 등)에서도 쓰는 관례다.
- 버린 대안: 시뮬레이터(사용자 결정), bind length 예제(사용자 결정), 클래스 name 예제(로드맵 후보, simplifications로), export default 값 서술(vm Script로 실행 검증할 수 없어 "다루지 않음"만).

## 4. 변경 파일

- 추가: `app/concepts/function-name/{meta.ts, content.mdx, route.tsx, concept.test.ts}`, `examples/` 5개.
- 수정(문구·related·it 제목): `app/concepts/function-definitions/{content.mdx, meta.ts, concept.test.ts}`.
- 수정(순서·등록): 2절의 파일들.
- 변경하지 않음: 공통 코드, this-binding·default-parameters·property-attributes·es-modules·class-basics 본문.

## 5. 위험 요소

- 조건 없는 일반화("변수에 담으면", "괄호는 통과", "키: 값이면 키", "name은 바꿀 수 없다", "익명 함수는 name이 없다") → 1절의 한정 문장, 예제 3(`comma`)·5(`defineProperty`·`delete`·`anon`), 2단계 완료 조건 grep.
- function-definitions 원문이 배제 대상 모델을 담은 채 링크됨 → 4단계에서 조건을 넣어 고침, "담은/담으면" grep.
- this-binding·default-parameters와 중복 → bind는 "bind하는 순간의 name"만, length는 링크만.
- 뒷장 개념 → 심벌·디스트럭처링·모듈은 simplifications에서 개념 이름으로만, "다룹니다"는 그 페이지가 실제로 다루는 하위 주제에만.
- "객체" 검색 결과 변화 → concept.test에 `filterConcepts([concept], '객체')` 빈 결과.
- 순서 삽입(37번째)으로 뒤 35개 순위가 밀림 → 5단계 완료 조건.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "function-name|함수의 name|홈 학습 순서 보기|function-definitions|함수를 정의하는 방법"` (a11y 케이스 이름을 "함수의 name"이 들어가게 정한다)
- 브라우저(dev 재시작 뒤 375px·다크): `/concepts/function-name` 학습 순서 `37 / 72`, 이전 default-parameters·다음 array-index-length, 퀴즈 5개 정답 확인, 비교표 스크롤 영역·문서 폭 375, function-definitions 19번 줄 새 링크 이동.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta
- 대상: `app/concepts/function-name/{meta.ts, route.tsx, examples/*}`
- 변경: 1절 예제 1~5(파일 원문은 1절 설명과 같게), meta(expectedOutput은 실제 실행으로, title·summary·tags·goals·prerequisites·related·simplifications, references: 명세 SetFunctionName·IsAnonymousFunctionDefinition·IsIdentifierRef·대입 평가·PropertyDefinitionEvaluation·Function.prototype.bind·CreateDynamicFunction, MDN Function.prototype.name).
- 주의사항: strict는 예제 5의 함수 본문 첫 줄 지시어로만. 예제 5의 5번 줄이 `f.name = 'z';`(simplifications가 줄 번호를 쓴다).
- 완료 조건: `npx vitest run tests/examples.test.ts -t function-name` 통과, 예제별 "틀린 모델 → 출력 줄" 대조를 구현 진행에 기록, `'use strict';` 접두 실행 비교 기록(예제 5만 달라짐), summary 160자 이하·"객체" 없음.

### 2. content.mdx
- 변경: 첫 문단 → 동작 원리(h3 4개) → 예제 5개(퀴즈 각 1개, 1절의 선택지) → 결과와 이유(예제별, 비교표, 흔한 오해 2개).
- 주의사항: 1절의 한정 문장과 본문 링크 목록. bound function 이름을 "원래 이름"으로 쓰지 않는다.
- 완료 조건: `npx vitest run app/concepts/function-name tests/content-integrity.test.ts tests/result-tables.test.ts` 통과, 퀴즈 5개, `grep -nE "담은|담으면|담긴" content.mdx`의 각 줄이 오해로 소개하거나 "바로 쓴" 조건을 가짐, `grep -n "바꿀 수 없" content.mdx`의 각 줄이 "대입으로" 한정, `grep -n "괄호" content.mdx`의 통과 문장이 "오른쪽"으로 한정.

### 3. concept.test.ts
- 변경: (a) 퀴즈 정답 = expectedOutput(' / ')와 오답 4개 중복 없음, (b) 비교표 행 검증(칸 전체 문구 정확 비교, probe = name 칸, 예제 파일에 코드 칸 문자열 포함, 예제 번호), (c) 탐침: 클래스 `B`, 필드 `h`, 디스트럭처링 `a`, 심벌 키 `[d]`·빈 문자열, `__proto__` 빈 문자열, `(x) = …` 빈 문자열, `||=`·`&&=`·`??=` 이름 넘김, 삼항·`||` 빈 문자열, `({ p: function q(){} })` → `q`, `Function.prototype` 자기 name 빈 문자열, (d) `filterConcepts([concept], '객체')` 빈 배열, (e) 모든 예제 `'use strict';` 접두 비교(예제 5만 다름). reviewedAt 단언은 넣지 않는다.
- 완료 조건: `npx vitest run app/concepts/function-name` 통과, 비교표 칸 하나를 바꾸면 실패(변조 실험 후 원복).

### 4. 기존 페이지 문구
- 대상: function-definitions `content.mdx:19`, `meta.ts:101`·related, `concept.test.ts:196` it 제목.
- 완료 조건: `grep -nE "담은|담으면" app/concepts/function-definitions/{content.mdx,meta.ts}` 중 name 문장 0건, 새 링크 확인, `npx vitest run app/concepts/function-definitions tests/content-integrity.test.ts` 통과.

### 5. 순서·등록
- 완료 조건: `grep -rnE "/ 71|toBe\(71\)|toHaveCount\(71\)|71번째" app tests` 0건, navigation pager에서 default-parameters → function-name → array-index-length, "객체" 검색 순위 배열 37 이상 +1, a11y·build-output·responsive·helpers·content-guide 등록.

### 6. 전체 검증
- 6절 전부와 브라우저 확인 기록.

## 9. 추가 개선 후보
- this-binding `content.mdx:62`의 "`'bound '`에 원래 이름을 붙인 것"을 "bind할 때 원래 함수의 name"으로 다듬기(이번 페이지가 bind는 그 순간의 name을 읽는다는 것을 보이므로). 이번 범위 밖, 사용자 결정 필요.
- function-definitions 본문을 고치므로 finalize 때 그 페이지 reviewedAt 갱신 여부를 묻는다.

## 변경 이력

- 2026-11-20 (사용자 검토 지적): summary를 전수 목록으로 읽히지 않게 "명세가 정한 자리에 바로 있을 때만"·"프로퍼티에 대입하거나 인수로 넘기면 빈 문자열"·"메서드·getter·setter는 키"로 고침(156자) / 본문 익명 함수 정의 괄호에 이름 없는 제너레이터·async 함수 식과 클래스 식 추가, simplifications에서 제너레이터·async를 "다루지 않음"에서 "같은 규칙, 예제 없음"으로 바꾸고 제너레이터·async/await 개념 연결(related 추가) / "함수의 [[Prototype]]" → "일반 함수인 `f`의 [[Prototype]]"(상속 클래스는 delete 뒤 부모 name, 제너레이터 함수의 [[Prototype]]은 Function.prototype이 아님 — 실행 확인, simplifications에 상속 클래스 단서) / 스택 표시 이름의 주체를 호스트에서 엔진(V8 등)의 비표준 표시로 / `||` 문장을 "오른쪽 피연산자를 평가해 그 값을 돌려주지만(`||`의 동작은 단축 평가에서 다룹니다)"로 / 참고 자료에 NamedEvaluation 추가. 메인 발견: IsIdentifierRef 참고 링크 앵커 `sec-isidentifierref`가 명세에 없어 `sec-static-semantics-isidentifierref`로 정정. concept.test 탐침 2개 추가 — 영향 단계 1·2·3

## 구현 진행

- baseline (2026-11-19, `c0f2325`): lint 0 / format 통과 / typecheck 0 / test 181 files·5753 tests 통과 / test:build·e2e 미실행(c0f2325에서 통과 기록)
- [x] 1. 예제·meta — 예제 5개는 계획 때 실행한 초안과 byte 단위로 같음, `tests/examples.test.ts -t function-name` 통과, summary 151자·"객체" 없음, `'use strict';` 접두는 예제 5만 5번 줄 TypeError(concept.test가 검사). 틀린 모델 → 출력: 예제 1 "선언만/초기화식만/기본값 제외" → 5칸 모두 이름, 예제 2 "getter도 키 그대로/소스 글자" → `"get size"`·`"1.5"`, 예제 3 "담긴 곳/값이 들어간 바인딩/값의 흐름" → `"" ""`·`""`·`"paren" "" ""`, 예제 4 "담은 변수/바인딩이 덮음/대입마다" → `"original"`·`"inner"`·`"b" "b"`, 예제 5 "sloppy 대입 성공/bind는 처음 이름/삭제 후 undefined·익명은 자기 name 없음" → `"f"`·`"bound z"`·`"" false`·`"" true`.
- [x] 2. content.mdx — h3 4개·퀴즈 5개·비교표 10행·Callout 2개, 본문 줄 번호를 예제 파일과 메인이 대조, 조건 문장("바로", "왼쪽이 식별자", "오른쪽 식", "대입으로는") grep 확인, "원래 이름" 없음(concept.test 검사).
- [x] 3. concept.test.ts — 칸 전체 정확 비교 + 행별 probe + 예제 파일 포함 검사, 탐침 7묶음, 퀴즈 정답·중복 검사, reviewedAt 단언 없음. 서브에이전트 변조 실험(행 2 이유 칸 변경 → 실패, 원복 후 통과).
- [x] 4. 기존 페이지 문구 — function-definitions `content.mdx:19`·`meta.ts:101`·related·`concept.test.ts:196` it 제목, name 문장의 "담은/담으면" 0건.
- [x] 5. 순서·등록 — `/ 71` 등 grep 0건, pager default-parameters → function-name(37/72) → array-index-length, "객체" 순위 37 이상 +1(38·47·49·50·61·68), a11y·responsive·helpers·build-output·content-guide 등록.
- [x] 6. 전체 검증 (2026-11-19) — lint 0, format 통과, typecheck 0, test 182 files·5804 tests(+51), test:build 570, e2e navigation 16 passed, 관련 e2e 14 passed(axe light·dark, 가로 스크롤 포함). dev 재시작 뒤 375px·다크: `37 / 72`, 이전 default-parameters·다음 array-index-length, 퀴즈 5개 정답 확인 모두 "정답입니다.", 비교표 스크롤 영역, 문서 폭 375, function-definitions의 새 링크 이동, 콘솔 오류 없음.
- 리뷰 1차(메인 직접): Critical/High 없음 · Low 2(보고)
  - Low: 375px에서 비교표 코드 칸이 단어 중간에서 줄바꿈 — bigint 등 기존 코드 표와 같은 사이트 공통 표시(이번 변경 범위 밖)
  - Low: `meta.ts` simplifications의 Node 스택 표시(`at o.p`) 주장은 호스트 동작이라 자동 테스트 없음(Node v24.22.3 직접 실행으로만 확인)
- 사용자 검토 1차 반영(2026-11-20, 변경 이력 참고): lint 0, format 통과, typecheck 0, test 182 files·5806 tests(+2 탐침), test:build 570, e2e navigation 16·관련 14 passed. dev 브라우저: meta description 새 요약, 본문 세 문장 변경, 참고 자료 앵커 8개(NamedEvaluation 추가, IsIdentifierRef 앵커 정정), 퀴즈 5개, 콘솔 오류 없음.
- finalize(2026-11-20): 사용자 결정으로 function-name reviewedAt `2026-11-20` 기록, function-definitions reviewedAt은 그대로(2026-11-19).

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(예제 5개·퀴즈 5개·비교표 10행·Callout 2개, function-definitions 문구 3곳, 순서·등록 8개 파일).
- 사용자 검토 1차(2026-11-20, `변경 이력`)로 summary·익명 함수 정의 범위·일반 함수 `f`의 [[Prototype]]·스택 표시 주체·`||` 문장을 고치고 참고 자료에 NamedEvaluation을 더했다. 메인이 IsIdentifierRef 앵커 오류를 발견해 고쳤고 탐침 2개를 더했다.
- 계획에 문구가 없던 퀴즈 해설·예제 머리말·예제별 풀이·Callout 본문은 구현 서브에이전트가 썼고 메인이 줄 번호와 조건 문장을 대조했다.

### 코드 리뷰
- 메인 직접 리뷰: Critical/High 없음. Low 2건을 남겼다(375px 비교표 코드 칸 줄바꿈은 사이트 공통 표시, 스택 표시 주장은 자동 테스트 없음).

### 후속 작업
- [ ] this-binding `content.mdx:62`의 "`'bound '`에 원래 이름을 붙인 것"을 bind하는 순간의 name으로 다듬을지 결정(사용자 결정 필요).
- [ ] (선택) 표 코드 칸의 좁은 화면 줄바꿈(사이트 공통) 개선 여부.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 2의 숫자 키를 `2`에서 `1.50`으로 바꿨다 — `2` → `"2"`는 "name은 숫자가 아니라 문자열"만 보이고 "소스에 쓴 글자 그대로" 모델을 배제하지 못한다. `1.50` → `"1.5"`는 이름이 ToPropertyKey한 키 문자열임을 보인다(Critic 지적을 묻지 않고 반영).
- [Claude 판단] 모든 name을 `show = (f) => JSON.stringify(f.name)`로 출력했다 — 빈 문자열이 출력에서 보이지 않으면 퀴즈 오답(`"decl" "" "" "" ""` 등)과 구분되지 않는다. 배열 리터럴은 260 이후라 쓰지 않았다.
- [Claude 판단] 비교표는 칸 전체 문구 정확 비교 + 행별 probe 실행 + "예제 칸 번호의 예제 파일에 코드 칸 문자열이 있는지"로 검증했다 — 부분 문자열 비교는 부정한 칸도 통과하고, 예제 칸 번호는 파일 대조 없이 틀려도 모른다.
- [Claude 판단] `export default` 익명 함수의 name 값(`'default'`)을 적지 않고 "다루지 않음"만 썼다 — es-modules가 이 하위 주제를 다루지 않아 "ES 모듈 개념에서 다룹니다"는 링크 규칙 위반이고, vm Script 실행기로 검증할 수 없다.
- [Claude 판단] 참고 자료 IsIdentifierRef 앵커를 `sec-static-semantics-isidentifierref`로 고쳤다 — 검토 반영 중 앵커 8개를 명세 사본과 대조하다 발견(`sec-isidentifierref`는 없음).
- [무검토 승인] function-definitions의 "변수에 담으면 name이 정해진다" 두 문장을 "변수 선언의 초기화식에 바로 쓴"으로 좁혔고, this-binding의 "원래 이름" 문구는 새 페이지에서 쓰지 않고 후속 후보로 분리했다 — 원문이 새 페이지가 배제하는 모델(`(0, function () {})`는 변수에 담아도 빈 문자열)이라 링크만 걸면 부정확한 원문을 보증한다.
- 사용자 결정: bind는 this-binding과 겹치지 않는 "bind하는 순간의 name"만, 시각화는 비교표 + 퀴즈, 검토 지적 5건 반영(요약·제너레이터/async/클래스 식·일반 함수 `f`·엔진 표시·`||` 문장), reviewedAt 2026-11-20(function-definitions는 유지).

#### 배경지식
- 대입식 평가(명세 13.15.2)는 IsAnonymousFunctionDefinition(오른쪽)과 IsIdentifierRef(왼쪽)가 둘 다 true일 때만 NamedEvaluation으로 이름을 넘긴다. `=`와 `&&=`·`||=`·`??=`가 해당하고 복합 대입은 아니다.
- IsFunctionDefinition은 괄호(ParenthesizedExpression)를 통과하지만 쉼표 식·`||` 식·삼항·대입식·`new` 식은 false다. IsIdentifierRef는 괄호로 감싼 왼쪽에 false를 돌려준다. 판정은 코드 모양(정적)으로 정해진다.
- 바인딩 초기화식·매개변수 기본값·리터럴 `키: 값`(`__proto__` 세터 제외)도 같은 조건으로 이름을 넘기고, 메서드·getter·setter는 키로(접두 `get `·`set `) 정한다.
- SetFunctionName은 `name`을 `{ writable: false, enumerable: false, configurable: true }` 자기 프로퍼티로 만든다. 그래서 대입은 막힌 대입(sloppy 무시·strict TypeError)이고 `defineProperty`·`delete`는 된다. 일반 함수에서 지우면 `Function.prototype.name`(빈 문자열)을 읽는다.
- Function.prototype.bind는 bind할 때 `Get(target, "name")`으로 그 순간의 name을 읽어 `bound `를 붙인다. CreateDynamicFunction은 `anonymous`로 정한다.

#### 확인 질문
1. `o.p = () => {}`의 name이 빈 문자열인 이유를 명세의 두 조건으로 설명하면? 같은 조건으로 `(x) = function () {}`는?
   <details><summary>답</summary>대입식은 오른쪽이 익명 함수 정의이고(IsAnonymousFunctionDefinition) 왼쪽이 식별자일 때(IsIdentifierRef)만 NamedEvaluation으로 이름을 넘긴다. `o.p`는 프로퍼티 접근이라 IsIdentifierRef가 false여서 화살표 함수는 이름 `''`로 만들어진다. 괄호로 감싼 왼쪽 `(x)`도 IsIdentifierRef가 false라 빈 문자열이다(simplifications, concept.test 탐침). 근거: 계획 2절 명세 13.15.2·8.4.4, `content.mdx` "이름을 넘겨받지 못하는 자리".</details>
2. 같은 함수 정의인데 `const paren = (function () {})`는 `"paren"`, `const comma = (0, function () {})`는 `""`인 이유는? "실행 중 값이 흘러간 바인딩 이름" 모델은 왜 틀렸나?
   <details><summary>답</summary>IsFunctionDefinition은 괄호를 통과하지만 쉼표 식은 함수 정의가 아니다. 판정은 실행 중 값이 아니라 코드 모양으로 한다. 두 경우 모두 같은 종류의 함수가 바인딩에 들어가는데 결과가 다르므로 값 흐름 모델로는 설명할 수 없다(예제 3, 퀴즈 3의 오답 `"paren" "comma" "either"`). 근거: 계획 1절 예제 3, 명세 8.4.2.</details>
3. 예제 2의 숫자 키를 `2`가 아니라 `1.50`으로 쓴 이유는?
   <details><summary>답</summary>`2` → `"2"`는 "소스에 쓴 글자 그대로가 이름" 모델과 "키 문자열이 이름" 모델이 같은 출력을 내 증거가 되지 못한다. `1.50`은 키가 ToPropertyKey로 `"1.5"`가 되므로 두 모델의 출력이 갈린다(퀴즈 2의 오답 `"1.50"`). 근거: 계획 1절 예제 2, Critic LOW 지적.</details>
4. 비교표 테스트에서 "예제 칸 번호의 예제 파일에 코드 칸 문자열이 있다" 검사를 빼면 무엇이 깨질 수 있나?
   <details><summary>답</summary>칸 문구 비교와 probe는 표 자체의 주장만 확인한다. 예제 칸이 엉뚱한 번호를 가리키거나 예제 파일이 바뀌어 그 코드가 사라져도 테스트가 통과해, 독자가 근거 예제를 찾지 못한다. 근거: `concept.test.ts` 비교표 describe, 계획 3절.</details>
5. bind 예제를 `defineProperty`로 name을 `'z'`로 바꾼 뒤에 둔 이유와, 그 결과가 this-binding 문구와 어떤 관계인가?
   <details><summary>답</summary>바꾸지 않고 bind하면 `bound f`가 "bind는 함수를 만들 때 정해진 이름을 쓴다" 모델과 구분되지 않는다. 바꾼 뒤 `bound z`가 나와야 bind가 bind하는 순간의 name을 읽는다(`Get(target, "name")`)는 것이 보인다. this-binding의 "원래 이름"은 이 경우를 가리지 못하는 표현이라 새 페이지에서 쓰지 않고 후속 후보로 남겼다. 근거: 예제 5, 계획 9절·후속 작업.</details>

