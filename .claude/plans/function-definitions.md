# 함수를 정의하는 방법 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-19
- 기준: `main` @ `bf9c568`

## 0. 요약
- 목적: "같은 function인데 왜 어떤 이름은 밖에서 보이지 않을까"를 질문으로 하는 `function-definitions` 페이지를 추가한다(order 95, 학습 순서 13번째/71). 같은 `function` 코드가 자리에 따라 함수 선언 또는 함수 표현식이 되고, 형태마다 이름 바인딩이 생기는 곳과 함수가 보는 바깥 스코프가 다르다는 것을 명세와 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 6개, 비교표 1개, 퀴즈 6개, 시뮬레이터 없음), 기존 4개 페이지 문구(iife-module-pattern·expressions-statements·closure·function-calls 선행 개념), 13번째 이후 순위 +1 테스트와 e2e·빌드 테스트 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: iife-module-pattern과 중복되거나, 13장(스코프) 메커니즘을 95 위치에서 앞서 설명하거나, "이름 없는 함수 선언은 SyntaxError"·"익명 함수는 이름이 없다"처럼 조건을 빼고 일반화하는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → HIGH 1(모듈의 이름 없는 함수 선언)·MEDIUM 14 반영, 사용자 결정 2건(order 95, Function 생성자는 결과 + 스코프 체인 링크), 메인이 명세·실행으로 재확인)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-19)
  - 추가 게시글 로드맵 3의 1번. 계획 조사에서 iife-module-pattern(order 215)이 "문 맨 앞의 function은 선언"과 "이름 있는 함수 식의 이름은 함수 안에서만, 대입은 sloppy 무시·strict TypeError"를 이미 다룬다는 것을 확인했고, 사용자가 "기초 페이지로 좁혀 유지"를 골랐다. iife-module-pattern의 같은 문단은 새 페이지를 가리키도록 줄인다.
  - 핵심 3개: ① 같은 `function` 코드가 문 맨 앞이면 함수 선언, 식 자리면 함수 표현식 ② 형태별 이름 바인딩 비교 ③ Function 생성자로 만든 함수는 둘러싼 함수가 아니라 전역 환경을 본다.
  - 추가 4개(모두 선택): 재할당 대비, 매개변수·var가 이름을 가림, 담은 변수와 함수 이름 구분, 이름 없는 함수 선언 SyntaxError.
  - 시각화: 비교표 + 퀴즈(시뮬레이터 없음). slug `function-definitions`, 제목 "함수를 정의하는 방법: 같은 function인데 왜 어떤 이름은 밖에서 보이지 않을까".
  - order: 로드맵의 105 대신 **95**(property-keys 90과 function-calls 100 사이). 책 순서(함수 정의 → 함수 호출)와 맞고, function-calls의 선행 개념 `{ label: '함수 선언' }`(slug 없음, `function-calls/meta.ts:27`)을 새 페이지로 연결할 수 있다(선행 개념은 order가 더 작아야 한다 — `tests/content-integrity.test.ts`).
  - Function 생성자: 로드맵 "계획 때 확인할 것"의 결정 — 예제로 결과(둘러싼 함수의 변수를 보지 못하고 전역 환경을 봄)를 보이고, 스코프가 정해지는 방식은 [스코프 체인](/concepts/scope-chain) 링크로 넘긴다. 책도 12장에서 Function 생성자와 이 차이를 소개한다.
- 새 페이지
  - `app/concepts/function-definitions/`, category `fundamentals`(property-keys·function-calls와 같음), order 95, `reviewedAt: null`.
  - 용어: 선행 페이지(expressions-statements·hoisting)와 같이 "함수 선언", "함수 표현식", "이름 있는 함수 표현식", "익명 함수 표현식"으로 쓴다(iife-module-pattern의 "함수 식"과 섞지 않는다).
  - summary(160자 이하, "객체" 금지): 예) "같은 function 코드도 문 맨 앞이면 함수 선언, 식 자리면 함수 표현식입니다. 형태마다 이름 바인딩이 생기는 곳과 함수가 보는 바깥 스코프가 어떻게 다른지 명세와 실행 결과로 확인합니다."
  - tags(예): `함수 선언`, `함수 표현식`, `이름 있는 함수 표현식`, `Function 생성자`, `이름 바인딩`, `SyntaxError`, `재귀`. 제목·요약·태그에 "객체"를 쓰지 않는다(`tests/e2e/navigation.spec.ts:24,39,100,137`이 "객체" 검색 결과 18개를 고정, `app/lib/concepts.ts:96-98`이 title·summary·tags를 검색).
  - prerequisites: 변수 선언과 할당(`variable-declaration`), 표현식과 문(`expressions-statements`).
  - related: `function-calls`, `expressions-statements`, `hoisting`, `scope-chain`, `iife-module-pattern`, `closure`, `strict-mode`, `es-modules`, `arrow-functions`, `class-basics`, `generator`, `async-await`, `new-operator`, `default-parameters`, `error-handling` (본문 링크·simplifications에서 개념 이름으로 가리키는 페이지를 모두 넣는다 — AGENTS 링크 규칙).
  - 첫 문단의 답
    - 스크립트나 함수 본문에서 문의 맨 앞에 쓴 `function 이름() {}`는 함수 선언이고 둘러싼 스코프에 그 이름의 변수를 만든다. 식이 올 자리(초기화식, 인수, 괄호 안, 연산자의 피연산자, `return` 뒤)에 쓴 같은 글자는 함수 표현식이다.
    - 이름 있는 함수 표현식의 이름은 그 함수만을 위한 별도의 자리에 바꿀 수 없게 만들어져(명세 InstantiateOrdinaryFunctionExpression: 새 선언적 환경 + CreateImmutableBinding) 함수 안에서만 보인다. 명세 NOTE도 "함수 선언과 달리 함수 표현식의 이름은 둘러싼 스코프에서 참조할 수 없고 영향을 주지 않는다"고 적는다. 스코프가 바깥으로 이어지는 방식은 스코프 체인 링크로 넘긴다.
    - Function 생성자로 만든 함수는 명세 CreateDynamicFunction이 현재 realm의 전역 환경(`[[GlobalEnv]]`)을 함수의 환경으로 쓰므로, 둘러싼 함수의 지역 변수를 보지 못한다.
  - 동작 원리 절(h3 4개)과 예제
    1. **자리에 따라 함수 선언 또는 함수 표현식**(예제 1, `position.js`): `function d() {}`(문 맨 앞), `var a = function b() {}`(초기화식), `(function c() {})`(괄호로 시작하는 식 문)를 쓴 뒤 `typeof a, b, c, d`가 `function undefined undefined function`. `typeof`는 없는 이름에도 `undefined`를 돌려주므로(값이 `undefined`인 바인딩과 구별되지 않음), 바깥에서 `b`를 읽으면 `ReferenceError`인 출력을 함께 둔다. `typeof function e() {}`는 `function`이고 그 뒤 `typeof e`는 `undefined`. 괄호 안이 식이라는 것까지만 쓰고 즉시 호출은 iife-module-pattern 링크로 넘긴다. "스크립트·함수 본문의 문 맨 앞"으로 한정한다(블록·if 절·레이블 붙은 함수 선언은 부록 B라 제외).
    2. **이름 바인딩이 생기는 곳**(예제 2~4)
       - 재할당 대비(예제 2, `rebind.js`): 함수 선언의 이름은 보통 변수라 `d = 1` 뒤 `typeof d`가 `number`. 이름 있는 함수 표현식 안의 `g = 1`은 sloppy mode에서 무시되어 함수 안의 `typeof g`가 여전히 `function`이고, 호출 뒤 바깥의 `typeof g`는 `undefined`(대입이 암묵적 전역을 만들지 않았다). 함수 본문 첫 줄에 `'use strict';`를 둔 같은 함수는 `TypeError`. 이유: 함수 표현식의 이름은 `CreateImmutableBinding(name, false)`로 만들어지고, SetMutableBinding은 바꿀 수 없는 바인딩에 대입할 때 대입하는 코드가 strict일 때만 TypeError를 던지고 아니면 아무것도 하지 않는다. `const`(strict 바인딩이라 sloppy에서도 TypeError)와 다르다는 한 문장을 둔다. 이 예제는 sloppy mode 결과가 핵심이므로 그 전제를 본문에 밝힌다.
       - 매개변수·var가 이름을 가림(예제 3, `shadow.js`): `var f = function g(g) { return typeof g; }`에 `f(5)`는 `number`, 본문에 `var g = 3`을 둔 경우도 `number`. 함수가 호출될 때 만드는 매개변수·지역 변수의 자리가 이름의 자리보다 안쪽이기 때문이라고 쓰고(명세 NewFunctionEnvironment의 바깥이 그 함수의 [[Environment]]), "가까운 이름이 먼저"라는 일반 규칙은 스코프 체인 링크로 넘긴다. 매개변수 기본값 안의 함수는 본문 `var`에 가려지지 않는 경우가 있으므로 일반화하지 않고 simplifications에 매개변수 기본값 개념으로 밝힌다.
       - 담은 변수와 함수 이름(예제 4, `variable-vs-name.js`): `var add = function sum(x) { return x <= 0 ? 0 : x + sum(x - 1); }`에서 `add(3)`은 `6`, 바깥의 `sum`은 `ReferenceError`. `var keep = add; add = null;` 뒤 `keep(3)`도 `6`(재귀가 바깥 변수 `add`가 아니라 함수 안의 이름 `sum`으로 자기를 부름). 같은 일을 익명 함수 표현식(`var fact = function (x) { … fact(x - 1) … }`)으로 하면 `fact = null` 뒤 `keepFact(3)`이 `TypeError`. "담은 변수 이름이 곧 함수 이름" 모델을 배제한다. 본문은 "이름 바인딩"으로만 말하고 함수의 `name` 프로퍼티(익명 함수 표현식도 `fact.name`이 `'fact'`)는 별도 개념으로 밝힌다.
    3. **Function 생성자는 전역 환경을 본다**(예제 5, `function-constructor.js`): `var x = 'global'; function outer() { var x = 'local'; const viaExpr = function () { return x; }; const viaCtor = new Function('return x'); console.log(viaExpr()); console.log(viaCtor()); }` → `local`, `global`(배열 리터럴은 쓰지 않는다). 둘러싼 함수의 `let y`도 보지 못해 `typeof y`가 `undefined`. 전역 객체가 아니라 전역 환경이라 맨 바깥 `let`은 본다(본문 한 문장 + concept.test 탐침 `toplet`). 문자열로 받은 코드로 함수를 만드는 기능이라는 것까지만 쓰고 쓰기를 권하지 않는다. 만든 함수 안에는 이름 바인딩이 없다(`typeof anonymous` → `undefined`, 탐침).
    4. **이름 없는 함수 선언**(예제 6, `anonymous-declaration.js`): 같은 글자 `function () {}`가 함수 본문의 문 맨 앞이면 이름 없는 함수 선언이라 SyntaxError, `return` 뒤(식 자리)면 함수 표현식. 문법 오류는 스크립트 전체를 막으므로 예제 5에서 본 `new Function(본문)`을 컴파일 검사 도구로 쓴다(strict-mode의 `tryCompile`과 같은 방식): `new Function('function () {}')` → `SyntaxError`, `typeof new Function('return function () {};')()` → `function`(바깥 함수가 아니라 안쪽 함수 표현식의 값을 확인하도록 호출한다). 범위는 "스크립트와 함수 본문의 문 맨 앞"으로 한정하고, 모듈의 `export default function () {}`는 이름 없는 함수 선언이 허용된다는 것을 simplifications에 ES 모듈 개념으로 밝힌다.
  - 비교표(결과와 이유 절)
    - 머리 `형태 | 이름 바인딩이 생기는 곳 | 그 이름에 대입하면 | 함수가 보는 바깥 스코프 | 예제`. 행 4개: 함수 선언, 익명 함수 표현식, 이름 있는 함수 표현식, Function 생성자. 이름 바인딩이 없는 행의 대입 칸은 "해당 없음(이름 바인딩 없음)".
    - `<th>` 한 줄, 스크롤 영역(`tabIndex={0} role="region" aria-label`).
    - concept.test 검증 설계(새 방식): 행·열마다 `{ probe, token }`을 정의한다. `tableBody(mdx, 머리)`로 읽은 칸 문자열에 `token`이 들어 있는지, `show(probe)`가 기대값과 같은지 둘 다 검사한다. 예) 함수 선언·바인딩 칸 token "둘러싼 스코프", probe `function d() {} typeof d` → `function`; 대입 칸 token "다시 대입", probe `function d() {} d = 1; typeof d` → `number`; 이름 있는 함수 표현식·대입 칸 token "sloppy", probe 두 개(sloppy `function`, strict `TypeError`); Function 생성자·바깥 스코프 칸 token "전역", probe `local`/`global`; "해당 없음" 칸 token "해당 없음", probe 이름이 없는지(`typeof anonymous`). 예제 칸 번호가 실제 예제 번호인지 `exampleFilesByNumber`로 검사한다.
  - 흔한 오해 Callout 2개: "함수 표현식에 붙인 이름도 바깥에서 쓸 수 있다", "Function 생성자로 만든 함수도 만든 곳의 변수를 본다".
  - 다루지 않고 밝힐 것(simplifications)
    - 화살표 함수와 메서드 축약은 화살표 함수와 메서드 축약 개념, 클래스는 클래스 개념, 제너레이터 함수는 제너레이터 개념, async 함수는 async/await 개념에서 다룬다.
    - 블록·if 절·레이블 붙은 함수 선언(명세 부록 B)은 다루지 않는다.
    - 모듈의 `export default function () {}`는 이름 없는 함수 선언이며 ES 모듈 개념에서 다룬다.
    - 함수 선언이 코드 실행 전에 처리되는 것은 호이스팅 개념에서 다룬다.
    - "스코프", "자리"는 명세의 환경 레코드를 줄여 쓴 교육용 표현이며 엔진이 실제로 이런 구조를 만든다는 뜻이 아니다. 스코프가 정해지고 이어지는 방식은 스코프 체인 개념에서 다룬다.
    - 매개변수 기본값 안의 함수가 함수 표현식의 이름을 보는 경우는 매개변수 기본값 개념의 범위다.
    - 함수의 `name` 프로퍼티(이름 추론)는 별도 개념이다. Function 생성자로 만든 함수의 strict 여부는 strict mode 개념에서 다루고, 매개변수 문자열의 세부 문법은 다루지 않는다. 호스트는 문자열로 함수를 만드는 것을 막을 수 있다(명세 HostEnsureCanCompileStrings). 예제는 Node vm에서 실행했다.
    - `new`는 new 연산자 개념에서 다룬다. 예제 5·6은 `new Function`의 결과만 쓴다.
    - 예제의 `try…catch`는 오류 이름을 보이는 용도이며 try/catch/finally 개념에서 다룬다. `console.log`는 호스트 API.
- 기존 페이지 문구(4곳, 모두 reviewedAt은 바꾸지 않는다 — bf9c568 선례)
  - iife-module-pattern `content.mdx:33`: 명세 설명과 "sloppy 무시·strict TypeError" 문장을 "이름 있는 함수 식의 이름은 그 함수 식만을 위한 환경에 있는 바꿀 수 없는 바인딩이라 함수 안에서만 보입니다([함수를 정의하는 방법](/concepts/function-definitions))."로 줄이고 예제 5의 줄별 설명은 유지한다. 퀴즈(189행)·결과와 이유(315행)의 "그 함수 식만을 위한 환경" 표현과 이어지는지 확인한다. 같은 주장을 검증하던 `iife-module-pattern/concept.test.ts:76-79` 탐침은 새 페이지 예제 2로 옮겨졌으므로 지운다. related에 `function-definitions`.
  - expressions-statements `content.mdx:95` → "식 문이 `function`으로 시작할 수 없어 문 맨 앞의 `function`이 함수 선언으로 읽힌다는 것은 [함수를 정의하는 방법](/concepts/function-definitions)에서, 즉시 실행 함수에서 생기는 문제는 [즉시 실행 함수와 모듈 패턴](/concepts/iife-module-pattern)에서 다룹니다." `meta.ts:50`의 "function으로 시작하는 식 문의 제한은 즉시 실행 함수와 모듈 패턴 개념에서" → "함수를 정의하는 방법 개념과 즉시 실행 함수와 모듈 패턴 개념에서". related에 `function-definitions`.
  - closure `meta.ts:84` "…이 페이지의 예제는 이름 없는 함수 식만 쓰며 이 레코드는 다루지 않습니다." → "…이 레코드는 함수를 정의하는 방법 개념에서 다룹니다." related에 `function-definitions`.
  - function-calls `meta.ts:27` `{ label: '함수 선언' }` → `{ label: '함수를 정의하는 방법', slug: 'function-definitions' }`.

## 2. 사실과 추정

### 사실 (코드·실행에서 확인)
- order 90 property-keys, 100 function-calls 사이에 95가 비어 있고 둘 다 category `fundamentals`. order < 95인 개념은 12개라 새 페이지는 13번째, 총 71개.
- iife-module-pattern이 문 맨 앞 `function` 제한(`content.mdx:27-29`, "스크립트 최상위에"로 한정)과 이름 있는 함수 식(`content.mdx:33`, 예제 5 countdown, 퀴즈 189행, 결과와 이유 315행, 탐침 `concept.test.ts:76-79`)을 다룬다.
- expressions-statements가 function 제한을 iife로 넘긴다(`content.mdx:95`, `meta.ts:50`). closure가 이름 있는 함수 식의 환경을 다루지 않는다고 밝힌다(`meta.ts:84`). function-calls 선행 개념 `{ label: '함수 선언' }`(`meta.ts:27`).
- hoisting이 함수 선언 호이스팅과 var에 담은 함수 표현식을 다룬다(`content.mdx:16,22,40`). strict-mode가 Function 생성자의 strict 여부와 `tryCompile`을 다룬다(`content.mdx:33,39,205,268`). es-modules가 `export default function () {}`를 선언으로 다룬다(`content.mdx:63`). scope-chain이 렉시컬 스코프를 다룬다(`content.mdx:18`).
- 명세(2026-11-19 tc39.es multipage): InstantiateOrdinaryFunctionExpression(15.2.5, NOTE 포함), SetMutableBinding(불변 바인딩·strict 분기), NewFunctionEnvironment, CreateDynamicFunction(`Let envRecord be currentRealm.[[GlobalEnv]]`, `SetFunctionName(func, "anonymous")`), FunctionDeclaration의 `[+Default]` 생성 규칙, ExpressionStatement lookahead, typeof의 IsUnresolvableReference.
- Node v24.22.3 vm 실행(메인·검토자 모두 확인): 예제 1 `function undefined undefined function`·`ReferenceError`·`function`·`undefined`, 예제 2 `number`·`function`·`undefined`·`TypeError`(const도 sloppy에서 `TypeError`), 예제 3 `number`·`number`, 예제 4 `6`·`ReferenceError`·`6`·`TypeError`, 예제 5 `local`·`global`·`undefined`(맨 바깥 let은 `toplet`), 예제 6 `SyntaxError`·`function`, Function 생성자 함수 안 `typeof anonymous` → `undefined`.
- 순서 고정 테스트에서 이번에 바뀌는 곳: `app/lib/concepts.test.ts:119`(hoisting position 14 → 15, prev는 function-calls 그대로), `ConceptPager.test.tsx`(총수 70 → 71, hoisting hrefs는 그대로), `navigation.spec.ts`(총수, 순위 13 이상 +1, pager: property-keys의 다음 → function-definitions, 새 블록 13/71, function-calls의 이전 → function-definitions, "객체" 검색 순위 배열 13 이상 +1), `responsive.spec.ts`(홈 article 수), `a11y.spec.ts`·`helpers.ts`·`build-output.test.ts`·`content-guide.md`(등록).

### 추정
- 없음

## 3. 구현 전략

- bigint·class-accessors와 같은 구조(ecmascript, 표 + 퀴즈, 시뮬레이터 없음). 비교표는 문장 칸이라 행·열별 `{ probe, token }` 검증을 새로 만든다(1절).
- 예제마다 틀린 모델을 배제하는 출력: 함수 표현식도 바깥에 이름을 만든다 / 이름은 있는데 값이 undefined(예제 1의 `ReferenceError`), 함수 이름도 보통 변수 / 대입이 암묵적 전역을 만든다 / const 같은 바인딩(예제 2), 함수 표현식 이름이 매개변수보다 안쪽(예제 3), 담은 변수 이름이 곧 함수 이름(예제 4의 `keep(3)` 대 `keepFact(3)`), Function 생성자도 둘러싼 변수를 본다(예제 5), `function () {}`는 어디서나 함수 표현식(예제 6).
- 결과가 함수인지가 주장인 줄은 `typeof`를 출력한다(함수를 직접 출력하지 않는다). 배열 리터럴·`[ ]` 출력은 쓰지 않는다(27장).
- 버린 대안: 시뮬레이터(사용자 결정), iife에 내용 추가(215라 12장 기초로 쓸 수 없음), Function 생성자 제외(사용자 결정으로 결과 + 링크), order 105(사용자 결정으로 95).

## 4. 변경 파일

- 추가: `app/concepts/function-definitions/{meta.ts, content.mdx, route.tsx, concept.test.ts}`, `examples/` 6개.
- 수정(문구·related·선행 개념·탐침): `iife-module-pattern/{content.mdx, meta.ts, concept.test.ts}`, `expressions-statements/{content.mdx, meta.ts}`, `closure/meta.ts`, `function-calls/meta.ts`.
- 수정(순서·등록): 2절의 8개 파일.
- 변경하지 않음: 공통 코드, hoisting·typeof-operator·strict-mode·es-modules·scope-chain.

## 5. 위험 요소

- 조건 없는 일반화("이름 없는 함수 선언은 SyntaxError", "문 맨 앞의 function은 선언", "익명 함수는 이름이 없다", "var가 이름을 가린다") → 1절의 한정 문장과 simplifications, 2단계 완료 조건 grep.
- 95 위치에서 13장 메커니즘을 앞서 설명 → 결과 + 스코프 체인 링크, "자리"·"스코프"는 단순화로 밝힘. 스코프 체인 링크는 일반 스코프 규칙 문장에만 건다(scope-chain은 이름 있는 함수 표현식의 환경을 다루지 않는다).
- iife 문단 축소로 그 페이지의 퀴즈·결과와 이유 근거 문장이 사라짐 → 대체 문장에 "그 함수 식만을 위한 환경" 유지, 4단계 대조.
- iife 탐침 삭제 → 같은 주장을 새 페이지 예제 2·concept.test가 검증.
- "객체" 검색 결과 수 변화 → concept.test에 `filterConcepts([concept], '객체')` 빈 결과 검사.
- 순서 삽입(13번째)으로 대부분 순위가 밀림 → 5단계 완료 조건에 파일·줄을 이름으로 적음.
- Function 생성자 권장으로 읽힘 → 평가 없이 동작만, 호스트가 막을 수 있음을 단순화에.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "function-definitions|함수를 정의하는 방법|홈 학습 순서 보기|iife-module-pattern|즉시 실행 함수|expressions-statements|표현식과 문|function-calls|함수 호출|closure|클로저"`
- 브라우저(dev 재시작 뒤 375px·다크): `/concepts/function-definitions` 학습 순서 `13 / 71`, 이전 property-keys·다음 function-calls, 정답 확인 6개, 비교표 스크롤 영역·문서 폭 375, function-calls의 선행 개념 링크, iife·expressions-statements의 새 링크 이동.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta
- 대상: `app/concepts/function-definitions/{meta.ts, route.tsx, examples/*}`
- 변경: 1절 예제 1~6, meta(expectedOutput은 실제 실행으로, summary·tags·prerequisites·related·simplifications, references: 명세 InstantiateOrdinaryFunctionExpression·SetMutableBinding·CreateDynamicFunction·ExpressionStatement·FunctionDeclaration, MDN 함수 표현식·Function 생성자).
- 주의사항: 출력은 원시 값·`typeof` 결과·오류 이름만. strict는 예제 2의 함수 본문 첫 줄 지시어로만. 배열 리터럴 출력 금지. Symbol·클래스 등 뒷장 문법 금지.
- 완료 조건: `npx vitest run tests/examples.test.ts -t function-definitions` 통과, 예제별 "배제하는 틀린 모델 → 출력 줄" 대조표를 구현 진행에 기록, 파일 첫 줄 `'use strict';` 실행 비교 기록(예제 2만 달라짐 → 본문에 밝힘), summary 160자 이하.

### 2. content.mdx
- 변경: 첫 문단 → 동작 원리(h3 4개) → 예제 6개(퀴즈 각 1개) → 결과와 이유(예제별, 비교표, 흔한 오해 2개).
- 주의사항: 용어 "함수 표현식". 한정 문장(스크립트·함수 본문의 문 맨 앞, 이름 바인딩). 링크는 대상이 그 하위 주제를 실제로 다루는 문장에만.
- 완료 조건: `npx vitest run app/concepts/function-definitions tests/content-integrity.test.ts tests/result-tables.test.ts` 통과, 퀴즈 6개, `grep -n "이름이 없" content.mdx`의 각 줄이 "이름 바인딩"으로 한정됨, `grep -n "SyntaxError" content.mdx`의 이름 없는 선언 문장이 "스크립트·함수 본문"으로 한정됨.

### 3. concept.test.ts
- 변경: (a) 퀴즈 정답 = expectedOutput(' / '), (b) 비교표 `{ probe, token }` 검증과 예제 칸 번호, (c) 탐침: 맨 바깥 `let`을 Function 생성자 함수가 봄(`toplet`), `typeof anonymous` → `undefined`, `const` 대입은 sloppy에서도 `TypeError`, (d) `filterConcepts([concept], '객체')`가 빈 배열, (e) 예제 2의 strict 결과.
- 완료 조건: `npx vitest run app/concepts/function-definitions` 통과, 비교표 칸 token 하나를 지우면 실패(변조 실험 후 원복).

### 4. 기존 페이지 문구
- 대상: 1절 4곳.
- 완료 조건: 문장이 1절 목표대로(grep), iife 189·315행과 줄인 문단의 대조 기록, iife 탐침 76-79 삭제 후 iife 테스트 통과, 4개 meta related·선행 개념 반영, `npx vitest run app/concepts/{iife-module-pattern,expressions-statements,closure,function-calls} tests/content-integrity.test.ts` 통과.

### 5. 순서·등록
- 완료 조건: `grep -rn "/ 70\|toBe(70)\|toHaveCount(70)\|70번째" app tests` 0건, `app/lib/concepts.test.ts`의 hoisting position 15, navigation pager에서 property-keys → function-definitions → function-calls, "객체" 검색 순위 배열 13 이상 +1, a11y·build-output·responsive·helpers·content-guide 등록.

### 6. 전체 검증
- 6절 전부와 브라우저 확인 기록.

## 9. 추가 개선 후보
- hoisting 본문의 "함수 표현식" 첫 언급, typeof-operator의 함수 예에 새 페이지 링크.
- iife·expressions-statements 등 본문을 바꾼 페이지의 reviewedAt 재검토(이번에는 선례대로 유지).

## 변경 이력

- 2026-11-19 (사용자 검토 지적): 예제 5가 전역 스크립트 전제에 기댄다는 것을 예제 머리말·본문("스크립트의 맨 바깥")·simplifications에 밝히고 concept.test에 CommonJS식 함수 감싸기 탐침 추가 / "매개변수와 지역 변수" → "매개변수와 `var`로 선언한 지역 변수", sloppy 함수의 let·const 환경은 simplifications로 / goals 4 문구 / 함수 객체의 `[[Environment]]`를 "함수가 기억한 환경"으로 정의해 호출 때 만드는 환경과 구분 / 예제 3에 매개변수와 같은 환경의 `var n;` 대조(출력 `number`) 추가 — 예제 3 expectedOutput·퀴즈 변경 / 예제 2·4·5 줄 번호와 표기 정정 — 영향 단계 1·2·3

## 구현 진행

- baseline (2026-11-19, `bf9c568`): bigint 커밋 직전 같은 트리에서 실행한 결과를 쓴다(이후 코드 변경 없음) — lint 오류 0 / format:check 통과 / typecheck 오류 0 / test 180파일 5692개 통과 / test:build 556개 통과
- [x] 1. 예제·meta — 예제 6개(`position`·`rebind`·`shadow`·`variable-vs-name`·`function-constructor`·`anonymous-declaration`). 대조: 1 "함수 표현식도 바깥에 이름" → 1줄, "이름은 있고 값만 undefined" → 2줄 `ReferenceError` / 2 "선언 이름은 대입 불가" → 1줄 `number`, "이름 있는 함수 표현식 이름도 변수처럼 바뀜" → 2줄 `function`, "대입이 암묵적 전역" → 3줄 `undefined`, "strict도 무시" → 4줄 `TypeError` / 3 "함수 표현식 이름이 매개변수·var보다 안쪽" → 두 줄 `number` / 4 "담은 변수 이름이 곧 함수 이름" → 3줄 `6` 대 4줄 `TypeError`, "바깥에서도 보임" → 2줄 / 5 "Function 생성자도 만든 곳의 변수" → 2줄 `global`, 3줄 `undefined` / 6 "function 코드는 어디서나 오류" → 1줄 `compiled`, "function () {}는 어디서나 정상" → 2줄 `SyntaxError`, "식 자리도 오류" → 3줄 `function`. `'use strict';` 접두는 예제 2만 출력이 달라짐(본문·simplifications에 밝힘, concept.test 검사). summary 108자, "객체" 없음.
- [x] 2. content.mdx — 동작 원리 h3 4개, 예제·퀴즈 6개, 결과와 이유(예제별, 비교표 4행, 흔한 오해 2개). 메인 수정: "함수가 만든 자리" → "함수가 만들어진 자리", Function 생성자 소개 문장, 흔한 오해의 "바깥에 이름이 생기는 것은 함수 선언뿐"을 "네 형태 중 함수의 이름이"로 한정.
- [x] 3. concept.test.ts — 비교표 칸별 `{ token, probes[] }`(칸당 probe 여러 개로 확장 — 대입 칸 sloppy·strict, 바깥 스코프 칸 전역 객체 변수·전역 let), 예제 칸 번호, 탐침(toplet, `typeof anonymous`, const 대입, `fact.name`, 함수 본문 안 `function () {}`), 퀴즈, "객체" 검색, strict 접두. 변조 실험(Function 생성자 칸 "전역 환경" → "전역 스코프" → 실패 → 원복) 서브에이전트 수행.
- [x] 4. 기존 페이지 문구 — iife `content.mdx:33` 축소("그 함수 식만을 위한 환경에 있는 바꿀 수 없는 바인딩" 유지, 퀴즈 189·결과 315와 모순 없음 확인), iife 탐침 삭제, expressions-statements `content.mdx:95`·`meta.ts:50`, closure `meta.ts:84`, function-calls 선행 개념 slug, 각 related.
- [x] 5. 순서·등록 — `/ 70` 등 0건, hoisting position 15, navigation 새 블록(13/71, prev property-keys, next function-calls), "객체" 검색 순위 13 이상 +1. 계획의 "property-keys·function-calls pager 블록 수정"은 navigation.spec에 두 개념의 블록이 원래 없어 해당 없음(새 블록만 추가).
- [x] 6. 전체 검증 — lint 0, format:check 통과, typecheck 0, test 181파일 5752개, test:build 563개, e2e navigation 16개 + `-g` 관련 50개 통과. 브라우저(dev 재시작, 375px·다크): pager `13 / 71`·이전 property-keys·다음 function-calls, 정답 확인 6개, 문서 폭 375, 비교표 영역 tabIndex 0·4행, function-calls·iife·expressions-statements·closure HTML에 `/concepts/function-definitions` 링크.
- 리뷰 1차(메인 + Opus 교차): High 1·Medium 5·Low 8. High — class-basics `content.mdx:35`가 이름 있는 함수 식의 sloppy 대입 무시를 근거로 iife를 링크하는데 iife에서 그 문장을 지웠음(계획의 기존 페이지 목록 누락) → 링크를 function-definitions로, related 추가. Medium(명세 정확성·증거력 기준으로 모두 수정) — 퀴즈 오답 4개가 어떤 모델로도 나올 수 없는 출력 → 모델별 실제 출력으로 교체 / 매개변수·var를 만드는 주체를 NewFunctionEnvironment로 적음 → FunctionDeclarationInstantiation으로 분리 / 환경 용어 단순화 문구가 본문과 불일치·실행 컨텍스트 누락 → 문구 수정·related에 execution-context / 예제 3의 `var n = 3`이 "같은 환경에서 덮어씀" 모델을 배제 못함 → `f()`·`var n;`(출력 `undefined / undefined`, 같은 환경 재선언 모델이면 `function`) / 비교표 테스트 token이 부분 문자열이라 부정 칸도 통과 → 칸 전체 문구 정확 비교, Function 생성자 행 예제 칸 "5". Low도 모두 수정 — SetMutableBinding 문장 한정, 원인(별도 환경)과 성질(변경 불가) 분리(새 페이지·iife), 매개변수 기본값 단순화 문구, strict mode·즉시 실행 함수 단순화 추가, 부록 B 문구, `function e` → `function w`, closure 근거 문장 복원, 예제 2 strict 접두 검사를 `['number']` + TypeError로 강화. 변조 실험(함수 선언 대입 칸을 "없음"으로 → 실패 → 원복). 재검증: lint 0, format 통과, typecheck 0, test 181파일 5752개, test:build 563개, e2e 관련 36개 통과.
- 사용자 검토 1차(Medium 1·Low 4·표기 3, 모두 수정 — `변경 이력` 참고): 확인 — 예제 5를 `.cjs`·`.mjs`로 실행하면 `local` 뒤 `ReferenceError`, 대조 `(function (n) { var n; return typeof n; })(1)`은 sloppy·strict 모두 `number`. 예제 3에 12~16번 줄 추가(expectedOutput `undefined / undefined / number`, 퀴즈 오답은 "이름 바인딩이 가장 안쪽"·"var가 이름과 같은 환경"·"var 재선언이 undefined로 초기화" 모델의 출력). concept.test에 예제 5를 함수로 감싸면 `['local']` + ReferenceError 탐침 추가. 재검증: lint 0, format 통과, typecheck 0, test 181파일 5753개, test:build 563개, e2e function-definitions 6개 통과. dev 화면에서 새 문구·예제 3의 16번 줄·퀴즈 3 정답 동작 확인.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 새 개념 `function-definitions`(order 95, 학습 순서 13번째/71, 예제 6개·퀴즈 6개·비교표 4행·흔한 오해 2개)와 기존 페이지 문구를 구현했다. reviewedAt `2026-11-19`(finalize 때 사용자 승인, concept.test의 null 단언 제거).
- 계획과 달라진 점: 기존 페이지는 4곳이 아니라 5곳(리뷰 High로 class-basics 추가). 예제 3은 `f(5)`·`var g = 3`(출력 `number / number`)에서 `f()`·`var n;`·매개변수와 같은 환경의 대조 줄(출력 `undefined / undefined / number`)로 바뀌었다(리뷰·사용자 검토). 비교표 검증은 부분 문자열 token이 아니라 칸 전체 문구 정확 비교 + 칸별 탐침. navigation.spec에 property-keys·function-calls pager 블록이 원래 없어 새 블록만 추가.

### 코드 리뷰
- Opus 교차 리뷰 High 1·Medium 5·Low 8, 사용자 검토 Medium 1·Low 4·표기 3을 모두 수정했다. 남긴 지적 없음.

### 후속 작업
- [ ] hoisting 본문의 "함수 표현식" 첫 언급, typeof-operator의 함수 예에 새 페이지 링크(선택).
- [ ] 본문을 바꾼 iife-module-pattern·expressions-statements·class-basics의 reviewedAt 재검토(선택, 이번에는 선례대로 유지).

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 비교표 테스트를 칸 전체 문구 정확 비교 + 칸마다 실행 탐침으로 바꿨다 — 계획의 부분 문자열 token은 칸을 반대 뜻으로 바꿔도 통과했다(리뷰 Medium). 정확 비교는 문구를 고칠 때 테스트도 고쳐야 하는 비용이 있지만, 표가 주장하는 동작과 문구가 함께 묶인다. 변조 실험으로 실패를 확인했다.
- [Claude 판단] 예제 3을 `var n = 3`에서 초기화식 없는 `var n;`과 인수 없는 `f()`로 바꿨다 — `var n = 3`은 "같은 환경에서 값을 덮어쓴다"는 틀린 모델로도 같은 출력이 나와 증거가 되지 못했다. 사용자 검토로 매개변수와 같은 환경의 `var n;`이 값을 지우지 않는다는 대조 줄(`number`)을 더해 추론을 닫았다.
- [Claude 판단] class-basics 35행의 링크를 새 페이지로 바꿨다 — iife 문단을 줄이면서 class-basics가 근거로 가리키던 문장이 사라졌다(리뷰 High, 역방향 링크 영향).
- [무검토 승인] 이름 없는 함수 선언의 SyntaxError를 `new Function(본문)` 컴파일로 보였다 — 문법 오류는 스크립트 전체를 실행 전에 막으므로 예제 파일에 직접 쓸 수 없다. strict-mode 페이지와 같은 방식이고, 범위는 "스크립트와 함수 본문의 문 맨 앞"으로 한정하고 모듈 `export default`는 예외로 밝혔다.
- [무검토 승인] iife-module-pattern의 이름 있는 함수 식 문단을 줄이고 그 주장을 검증하던 iife 탐침을 지웠다 — 같은 주장이 새 페이지 예제 2와 concept.test로 옮겨져 중복 검증을 두지 않았다.
- order 95와 "기초 페이지로 좁혀 유지", Function 생성자는 결과 + 스코프 체인 링크에서 멈추기 — 사용자 결정. 예제 5가 전역 스크립트에서만 재현된다는 단서도 사용자 검토로 추가했다.

#### 배경지식
- 식 문(ExpressionStatement)은 `function`으로 시작할 수 없어, 스크립트·함수 본문의 문 맨 앞 `function`은 함수 선언으로 읽힌다. 식 자리의 같은 글자는 함수 표현식이다.
- InstantiateOrdinaryFunctionExpression은 이름 있는 함수 표현식을 위해 새 선언적 환경을 만들고 이름을 CreateImmutableBinding(name, false)로 만든 뒤 그 환경을 함수 객체의 `[[Environment]]`로 쓴다. 그래서 이름은 함수 안에서만 보인다.
- SetMutableBinding: strict 바인딩이 아닌 변경 불가 바인딩에 대입하면 대입하는 코드가 strict일 때만 TypeError, 아니면 무시. `const`는 strict 바인딩이라 sloppy에서도 TypeError.
- 호출 때 NewFunctionEnvironment가 바깥이 `[[Environment]]`인 새 환경을 만들고, FunctionDeclarationInstantiation이 매개변수와 `var`를 거기에 만든다(sloppy 함수의 let·const는 한 겹 안쪽). 매개변수와 같은 이름의 `var`는 새로 만들지 않아 값이 남는다.
- CreateDynamicFunction은 Function 생성자로 만든 함수의 환경을 현재 realm의 전역 환경으로 정한다. Node의 CommonJS·ES 모듈에서는 파일 맨 바깥이 전역 환경이 아니다.

#### 확인 질문
1. 예제 3에서 `var n = 3`을 쓰면 왜 "이름 바인딩은 바깥 환경에 있다"의 증거가 되지 못하는가?
   <details><summary>답</summary>이름 바인딩과 같은 환경에서 값을 덮어쓴다는 틀린 모델로도 `number`가 나오기 때문이다. 초기화식 없는 `var n;`은 같은 환경의 값을 지우지 않으므로(대조 줄 `p(1)` → `number`), 같은 환경이었다면 `function`이 남았어야 한다. 실제 출력 `undefined`가 그 모델을 배제한다(`content.mdx` 이름 바인딩 절, `구현 진행` 리뷰 1차).</details>
2. 이름 있는 함수 표현식 안의 `g = 1`이 sloppy에서는 무시되는데 `const`는 sloppy에서도 TypeError인 이유는?
   <details><summary>답</summary>둘 다 변경 불가 바인딩이지만 함수 표현식의 이름은 strict 바인딩이 아니고(CreateImmutableBinding(name, false)) `const`는 strict 바인딩이다. SetMutableBinding은 strict 바인딩이 아니면 대입하는 코드가 strict일 때만 TypeError를 던진다(예제 2, concept.test const 탐침).</details>
3. 비교표 테스트를 부분 문자열 비교로 되돌리면 무엇이 깨질 수 있는가?
   <details><summary>답</summary>칸 문구를 반대 뜻으로 바꿔도 token이 그대로 들어 있으면 통과한다(예: "다시 대입할 수 있음"을 "다시 대입할 수 없음"으로). 칸 전체 정확 비교가 문구와 탐침이 확인한 동작을 묶는다(`concept.test.ts` 비교표, 리뷰 Medium).</details>
4. 예제 5를 `node ex5.js`(CommonJS)로 실행하면 결과가 어떻게 달라지고, 왜 페이지에 단서를 달았는가?
   <details><summary>답</summary>`local` 뒤 11번 줄 호출에서 `ReferenceError`가 난다. Node가 CommonJS 파일을 함수로 감싸 맨 바깥 `var x`가 전역 환경에 생기지 않기 때문이다. 독자가 흔한 방식으로 재현하지 못하면 "전역 환경을 본다"는 핵심 주장을 오해할 수 있어 머리말·simplifications에 밝히고 탐침을 넣었다(사용자 검토 1차).</details>
5. 왜 이름 없는 함수 선언의 SyntaxError를 예제 파일에 직접 쓰지 않고 `new Function`으로 보였는가?
   <details><summary>답</summary>문법 오류는 실행 전에 걸러져 그 스크립트가 한 줄도 실행되지 않으므로 출력을 비교할 수 없다. `new Function(본문)`으로 컴파일해 던진 오류의 이름을 출력하면 같은 파일에서 성공·실패를 함께 보일 수 있다(예제 6).</details>
