# 표현식과 문 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-13
- 기준: `main` @ `a0e522f`

## 0. 요약
- 목적: 기초 보강 로드맵 2번. Deep Dive 5장을 "var x = 1은 왜 값이 될 수 없을까"라는 질문으로 설명하는 `expressions-statements` 페이지를 추가한다(order 5, 학습 순서 2번째). 다루는 것은 표현식과 문의 구분, 문 맨 앞의 `{`, 완료 값(설명만)이다.
- 범위
  - 새 개념 폴더: 표 2개, 예제·퀴즈 2개, 시뮬레이터 없음. 독자용 예제에는 eval을 쓰지 않는다.
  - increment-decrement·switch-break-continue의 선행 개념 링크.
  - 순위가 한 칸씩 밀리며 바뀌는 테스트.
  - 기존 페이지 본문은 바꾸지 않는다.
- 위험: 완료 값 규칙을 명세와 다르게 일반화하는 것, 그리고 '표현식 자리에 쓸 수 있는가'를 문 분류 기준처럼 쓰는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect PASS·Critic REVISE → 반영)
- 미확정: 2건

## 1. 요구사항

- 요구사항
  - `app/concepts/expressions-statements/` 추가. category `fundamentals`, order 5, `reviewedAt: null`.
  - 제목: "표현식과 문: var x = 1은 왜 값이 될 수 없을까".
  - 다룰 것(5장 범위, 클래식 스크립트 맨 바깥 코드 기준):
    1. 값과 리터럴
       - 값은 표현식을 평가해 얻는 결과다.
       - 리터럴은 값을 코드에 직접 적는 표기다. 명세의 리터럴(Literal)은 `null`·불리언·숫자·문자열 네 가지다.
       - 배열·객체 리터럴은 별도 문법이고, 평가할 때마다 새 배열·객체를 만든다.
       - `undefined`는 리터럴이 아니라 식별자다([전역 객체](/concepts/global-object)).
    2. 표현식(expression)은 평가해서 값을 얻을 수 있는 코드다. 리터럴·식별자·연산자 식·함수 호출·할당 식이 모두 해당한다. 할당 식의 값은 [증감 연산자](/concepts/increment-decrement)로 넘긴다. 일부 식의 평가 결과가 참조(Reference)라는 점은 단순화에 밝힌다.
    3. 문(statement)은 실행의 단위다(선언문, 식 문, 블록, 조건문, 반복문 등).
       - 값이 필요한 자리(변수 초기값, 함수 인수, 연산자 피연산자)에는 표현식만 올 수 있다.
       - `var` 선언문이나 `if` 문은 표현식 문법이 아니라서 그 자리에 쓸 수 없다. 파싱 표로 보인다.
       - 어떤 문이 '표현식인 문'인지를 "그 자리에 넣어 보기"로 분류하지 않는다. 같은 글자라도 위치에 따라 다르게 읽히기 때문이다. 예: 초기값 자리의 `function f() {}`는 함수 표현식이고, 문 맨 앞의 `{ a: 1 }`은 블록이다.
       - 식 문(ExpressionStatement)은 표현식 뒤에 `;`를 붙인 문이다. 그 식의 값은 버려지고 부수 효과만 남는다(예제 1).
    4. 문 맨 앞의 `{`
       - 명세는 식 문이 `{`, `function`, `async function`, `class`, `let [`로 시작할 수 없게 정한다. NOTE는 `{`에 대해 "블록과 모호해질 수 있어서"라고 설명한다.
       - 그래서 문 맨 앞의 `{ … }`는 [블록](/concepts/block-scope)이고, `{ a: 1 }`의 `a:`는 레이블([switch와 break·continue](/concepts/switch-break-continue)), `1`은 식 문이다. 괄호로 감싼 `({ a: 1 })`나 초기값 자리의 `{ a: 1 }`은 객체 리터럴이다(예제 2).
       - `function` 제한만 [즉시 실행 함수와 모듈 패턴](/concepts/iife-module-pattern)으로 넘긴다. 그 페이지는 function만 설명한다.
    5. 완료 값(설명만, 독자용 예제 없음)
       - 명세는 문을 평가한 결과를 완료(Completion Record)로 설명한다. 용어와 단서 문장은 error-handling `content.mdx:10`에 맞춘다: "명세가 동작을 설명하려고 쓰는 장치이고, 엔진이 이런 레코드를 실제로 만든다는 뜻이 아닙니다".
       - 정상 완료에는 값이 있을 수도 있고(완료 값), 없을 수도 있다(empty).
       - 이 페이지가 다루는 문의 규칙은 다음과 같다.
         - 식 문은 식의 값을 남긴다.
         - `var` 선언문·빈 블록·빈 문은 값을 남기지 않는다. 함수 선언, `let`·`const`·`class` 선언도 같다.
         - 문 목록과 블록은 마지막으로 값을 남긴 문의 값을 남긴다(명세 StatementList NOTE 2).
         - `if` 문은 실행한 쪽이 값을 남기지 않았거나, 조건이 거짓이고 else가 없어 아무 쪽도 실행하지 않았으면 `undefined`를 남긴다.
         - 반복문과 다른 문의 규칙은 다루지 않는다(단순화).
       - 완료 값은 일반 코드에서 꺼내 쓸 수 없다. 문자열 코드를 실행하는 `eval`이 그 코드의 완료 값을 돌려줄 때 드러난다.
       - eval은 실제 코드에서 쓰지 않는 기능이라 이 페이지 예제에서 쓰지 않는다(사용자 결정 2026-11-13). [전역 객체](/concepts/global-object)로 링크한다.
       - 제목의 "값이 될 수 없다"는 문법(값 자리에 쓸 수 없음)을 말하고, 완료 값은 실행 결과라는 점을 구분해 쓴다.
  - 선행 개념 링크(변수 선언 작업과 같은 관례): increment-decrement·switch-break-continue의 `{ label: '표현식과 문' }`에 `slug: 'expressions-statements'`를 단다.
- 유지해야 하는 기존 동작
  - 기존 60개 개념의 본문. 두 기존 페이지의 reviewedAt.
  - 첫 개념은 `variable-declaration`, 마지막 개념은 `es-modules`.
  - 홈 '객체' 검색 결과 17개. 새 페이지의 title·summary·tags에는 '객체'를 넣지 않는다.
- 제외 범위
  - 독자용 예제의 eval, 개발자 도구 콘솔·REPL 출력(호스트 동작).
  - ASI(즉시 실행 함수 페이지의 `(` 사례로 링크. 예제 2의 `}` 앞 자동 세미콜론만 단순화에 밝힌다).
  - abrupt completion·try·반복문·switch·with의 완료 값, 쉼표 연산자, 연산자 우선순위, 템플릿·정규식 리터럴.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 겹치는 기존 페이지
  - increment-decrement: 식의 값과 부수 효과, 대입 식의 값(`content.mdx:14-22`). 예제 `console.log(m += 5, m)`이 이미 할당 식을 인수로 쓰므로 그 내용은 예제로 반복하지 않는다.
  - iife-module-pattern: ExpressionStatement 제한 목록과 function 제한 설명(`content.mdx:27`), ASI `(` 사례(`:37`).
  - switch-break-continue: `### 레이블`(`content.mdx:29`), "break 완료"(`:27`).
  - arrow-functions: `() => { value: 1 }`의 레이블(`content.mdx:11`).
  - global-object: `undefined`는 예약어가 아니라 전역 객체 프로퍼티(`content.mdx:86`), `### eval`(`:96`).
  - error-handling: 완료(Completion Record) 정의와 단서 문장(`content.mdx:10`).
  - this-binding: "평가 결과는 값이 아니라 참조(Reference)일 수 있습니다"(`content.mdx:16`).
  - block-scope: 블록 정의(`content.mdx:6`).
- 명세(ES2027 초안 사본, ES2020 동일 규칙)
  - 14.5 ExpressionStatement: lookahead `∉ { {, function, async [no LineTerminator here] function, class, let [ }`. NOTE는 "cannot start with a U+007B (LEFT CURLY BRACKET) because that might make it ambiguous with a Block", Evaluation은 `Return ? GetValue(exprRef)`다.
  - 14.2.2 Block: `{ }`는 "Return empty"다. StatementList는 `UpdateEmpty(s, sl)`이고, NOTE 2는 "The value of a StatementList is the value of the last value-producing item"이라고 쓰며 eval 예 3개를 든다.
  - 14.6.2 IfStatement: else가 있으면 `Return ? UpdateEmpty(stmtCompletion, undefined)`, else가 없고 거짓이면 "return undefined"다.
  - VariableStatement·EmptyStatement·FunctionDeclaration은 "Return empty"다.
  - 13.2.3 Literal은 NullLiteral·BooleanLiteral·NumericLiteral·StringLiteral뿐이다.
  - PerformEval: 결과가 empty면 undefined로 바꾼다.
- Node vm 실행(2026-11-13)
  - 예제 후보
    - `var count = 0; count + 1; console.log(count); count = count + 1; console.log(count);` → `0`, `1`
    - `var a = 'outer'; { a: 1 } console.log(a); { a = 'block'; } console.log(a);` → `outer`, `block`
  - 완료 값(eval로 확인)
    - `1 + 2` → 3, `var x = 1` → undefined, `1; var z = 2;` → 1, `7; {}` → 7
    - `3; { 4 }` → 4, `3; { var t; }` → 3
    - `if (true) { 5 }` → 5, `7; if (false) { 6 }` → undefined, `7; if (true) { var u; }` → undefined, `3; if (true) {} else {}` → undefined
    - `1; let q = 2;` → 1, `1; class C {}` → 1, `2; function g() {}` → 2
    - NOTE 2의 세 예는 모두 1
    - 직접·간접·strict eval이 모두 같다(Critic 확인).
  - 파싱
    - SyntaxError: `var a = var b = 1;`, `console.log(var q = 1);`, `var r = if (true) { 1 };`
    - ok: `var b; var a = b = 1;`, `var g = function f() {};`, `({ a: 1 })`
  - 기타: 함수 안 `var undefined = 3`이 3, `var null = 3;` → SyntaxError.
- 테스트·등록
  - `tests/helpers/run-example.ts`는 `runInNewContext`라 직접 eval이 동작한다(Architect 확인, concept.test에서만 쓴다).
  - 순서 의존 테스트
    - `app/lib/concepts.test.ts:100-119`: 첫 개념의 next, total 60, 마지막 position 60, hoisting position 12.
    - `ConceptPager.test.tsx:18,23,28`.
    - `tests/e2e/navigation.spec.ts`
      - `/ 60'` 38곳: '1 / 60'(173행)만 그대로이고 나머지는 +1.
      - 175행의 다음 링크, 180~189행의 CONCEPT_PATH pager.
      - `toHaveCount(60)` 83·147행, '60번째' 91행.
      - '객체' 순위 배열 105~123행(전부 2 이상).
    - `tests/e2e/responsive.spec.ts:1519`.
  - build-output의 pager·레지스트리 검사는 동적으로 계산해 고칠 필요가 없다. concept.spec은 영향이 없다(`grep "표현식과 문" tests/` 0건).
  - 등록 관례(a0e522f): helpers, a11y, responsive, build-output, content-guide.

### 추정
- Deep Dive 5장이 값·리터럴·표현식·문·세미콜론과 ASI·표현식인 문과 아닌 문(완료 값 언급 포함)을 다룬다는 것은 기억에 근거한다(책 미확인).

## 3. 구현 전략

- 표 + 퀴즈로 구성하고 시뮬레이터는 두지 않는다.
- 예제 2개(사용자 결정)는 틀린 모델을 배제하는 출력으로 고른다.
  - 예제 1 `expression-statement.js` → `0 / 1`.
    - "`count + 1;`이 count를 바꾼다" 모델은 `1 / 2`를 낸다.
    - "식 문은 아무것도 하지 않는다" 모델은 `0 / 0`을 낸다.
  - 예제 2 `statement-brace.js` → `outer / block`.
    - "`a: 1`이 a에 1을 넣는다" 모델은 `1 / block`을 낸다.
    - "문 맨 앞의 `{ }`도 객체라서 안의 코드가 실행되지 않는다" 모델은 `outer / outer`를 낸다.
- 표현식만 오는 자리는 파싱 표로 보이고, `concept.test.ts`가 `tableBody` + `new Script`로 대조한다(변수 선언 페이지 방식).
- 완료 값은 본문 설명만 두고, 규칙은 concept.test에서 eval로 검증한다. 테스트 코드는 독자에게 보이지 않는다.
- 버린 대안
  - 독자용 eval 예제: 실제 코드에서 쓰지 않는 기능을 입문 페이지에 보이게 된다(사용자 결정).
  - 할당 식을 인수로 쓰는 예제: increment-decrement 예제와 같다.
  - "값 자리에 넣어 보기"로 문을 분류하기: `function f() {}`·`{ a: 1 }`처럼 위치에 따라 읽힘이 달라 틀린 기준이 된다.
  - 반복문·switch의 완료 값까지 설명하기: 뒷장 문법이고, 규칙이 문마다 달라 단순화가 커진다.

## 4. 변경 파일

- 추가: `app/concepts/expressions-statements/meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `examples/expression-statement.js`, `examples/statement-brace.js`
- 수정
  - `app/concepts/increment-decrement/meta.ts`, `app/concepts/switch-break-continue/meta.ts`: '표현식과 문'에 slug.
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
  - `.claude/plans/concept-roadmap-foundations.md`
- 변경하지 않음: 공통 코드, 기존 페이지 본문, `tests/e2e/concept.spec.ts`.

## 5. 위험 요소

- 완료 값 일반화
  - "값이 없는 문은 undefined를 남긴다"는 틀린다. 명세는 empty이고, if 같은 일부 문만 undefined로 정한다.
  - "마지막 문의 값"이 아니라 "마지막으로 값을 남긴 문의 값"이다.
  - if 규칙은 '조건이 거짓'뿐 아니라 '실행한 쪽이 값을 남기지 않음'도 포함한다.
  - 반복문·switch·try·with는 다루지 않는다고 단순화에 적는다.
  - 막는 곳: 작업 2 규칙, 작업 3 테스트(아래 목록 전부).
- 구분 기준: "값 자리에 넣어 보기"를 문 분류 기준으로 쓰지 않는다. 같은 글자가 위치에 따라 다르게 읽힌다는 문장을 넣는다(작업 2).
- 표현식 정의: "값으로 평가된다"고 단정하지 않는다. 참조는 this 바인딩 개념의 단순화로 넘긴다.
- 리터럴: 명세의 Literal은 네 가지라고 쓰고, 배열·객체 리터럴은 별도 문법으로 구분한다.
- 링크가 실제로 다루는 범위: iife는 function만, switch는 레이블, error-handling은 완료와 abrupt completion, this-binding은 참조, block-scope는 블록, global-object는 eval과 `undefined`를 다룬다.
- 장 순서: if·반복문·레이블·함수 선언·`let`/`const`/`class`는 문법 예로만 쓰고, 단순화에 별도 개념으로 밝힌다.
- 예제 2의 `{ a: 1 }`은 `}` 앞의 자동 세미콜론 삽입에 기댄다 → 단순화에 밝힌다.
- 예제 2의 레이블 `a`와 변수 `a`가 같은 이름이다. 의도한 대비지만, 레이블은 변수와 다른 이름 공간이라는 점을 본문에 한 문장으로 쓴다(switch 페이지 링크).
- 순위 +1 누락: 1은 그대로, 2 이상만 +1이다. 작업 4의 대조 스크립트로 막는다.
- 표 형식
  - 머리 칸은 한 줄로 쓴다(`<th><p>` 함정).
  - 코드 칸이 줄바꿈되지 않게 `[&_code]:whitespace-nowrap`.
  - 결과 표 머리는 `예제 | 결과`, 파싱 표 머리는 `코드 | 결과 | 이유`로 다르게 둔다.
  - 파싱 표 행은 모두 독립 Script로 파싱되므로 필요한 선언을 행 안에 넣는다.
- '객체' 검색: title·summary·tags에 '객체'를 넣지 않는다(filterConcepts 테스트).
- 용어: 이 페이지는 '할당'을 쓰고, 처음 나올 때 "할당(대입)"이라고 밝힌다(increment-decrement는 '대입').

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e
  - `npx playwright test tests/e2e/navigation.spec.ts tests/e2e/a11y.spec.ts`: 선행 칩이 바뀌는 두 페이지의 axe 케이스와 새 페이지 케이스를 포함한다.
  - `npx playwright test -g "expressions-statements|표현식과 문|홈 학습 순서 보기"`.
- 브라우저(dev 서버 재시작 후)
  1. 홈 학습 순서 1·2·3번째가 변수 선언, 표현식과 문, 원시 값과 객체다.
  2. 새 페이지 pager가 '2 / 61'이고, 이전 variable-declaration, 다음 primitives-and-objects다.
  3. 두 페이지의 선행 칩이 새 페이지 링크다.
  4. 375px·다크 모드에서 페이지 가로 스크롤이 없고, 퀴즈 2개를 키보드로 조작할 수 있다.

## 7. 미확정 사항

- [미확정] 제목 문구(콘텐츠 검토 때 바뀔 수 있다. 첫 카드가 아니라서 e2e 영향은 없다).
- [미확정] 완료 값이 5장에 나오는지(기억 근거). 사용자 확인을 권한다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: `meta.ts` → `content.mdx`(필수 h2 뼈대) → `route.tsx`, 예제 2개
- 예제
  - `expression-statement.js`: `var count = 0;` / `count + 1;` / `console.log(count);` / `count = count + 1;` / `console.log(count);`
  - `statement-brace.js`: `var a = 'outer';` / `{ a: 1 }` / `console.log(a);` / `{ a = 'block'; }` / `console.log(a);`
  - expectedOutput은 처음에 `[]`로 두고, 실제 출력(`0`,`1` / `outer`,`block` 예상)으로 채운다.
- meta
  - summary는 160자 이하, '객체' 금지.
  - tags: 표현식, 식, 문, 리터럴, 값, 식 문, 블록, 레이블, 완료 값.
  - goals 3~4개.
  - prerequisites `[{ label: '변수 선언과 할당', slug: 'variable-declaration' }]`.
  - related: increment-decrement, iife-module-pattern, switch-break-continue, global-object, block-scope, error-handling, this-binding.
  - references: 명세 Expression Statement, Block, if Statement, Literals, UpdateEmpty, MDN 표현식과 연산자·문. 링크는 실제로 열어 확인한다.
- simplifications(빠짐없이)
  1. 클래식 스크립트 맨 바깥 기준이다. 모듈은 ES 모듈 개념에서 다룬다.
  2. 완료는 명세의 장치이고 엔진이 실제로 만든다는 뜻이 아니다. abrupt completion은 try/catch/finally 개념에서 다룬다.
  3. 완료 값 규칙은 이 페이지가 든 문만 다루고, 반복문·switch·try·with 등의 규칙은 다루지 않는다.
  4. eval은 완료 값이 드러나는 곳으로만 언급한다(전역 객체 개념). 개발자 도구 콘솔·REPL 출력은 호스트 동작이라 다루지 않는다.
  5. 일부 표현식의 평가 결과는 참조(Reference)이고, 값은 그 참조에서 읽는다(this 개념).
  6. 명세의 리터럴은 네 가지다. 템플릿·정규식 리터럴은 다루지 않는다.
  7. 예제 2의 `{ a: 1 }`은 `}` 앞에서 세미콜론이 자동으로 들어가 `{ a: 1; }`처럼 처리된다. ASI는 즉시 실행 함수와 모듈 패턴 개념의 `(` 사례만 다루고, 나머지는 별도 개념이다.
  8. if 문·반복문·레이블·함수 선언·`let`/`const`/`class` 선언은 문법 예로만 쓴다. 제어문은 별도 개념이고, 레이블은 switch와 break·continue 개념, function 제한은 즉시 실행 함수와 모듈 패턴 개념에서 다룬다. 할당 식의 값은 증감 연산자 개념, `undefined`는 전역 객체 개념, 블록은 블록 스코프 개념에서 다룬다.
  9. console.log는 호스트 API다.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과.

### 2. content.mdx 본문
- `## 동작 원리`
  - 첫머리: 클래식 스크립트 기준.
  - `### 값과 리터럴`, `### 표현식`.
  - `### 표현식이 와야 하는 자리`
    - 파싱 표(머리 `코드 | 결과 | 이유`, 한 줄 머리, nowrap).
    - 행: `var b; var a = b = 1;` 가능, `var a = var b = 1;`·`console.log(var q = 1);`·`var r = if (true) { 1 };` SyntaxError, `var b; var s = (b = 2) + 1;` 가능.
    - 위치에 따라 같은 글자가 다르게 읽힌다는 문장.
  - `### 식 문`: 값은 버려지고 부수 효과만 남는다.
  - `### 문 맨 앞의 {`: lookahead와 NOTE, 블록·레이블·식 문, 괄호와 초기값 자리, 레이블은 변수와 다른 이름, 링크.
  - `### 완료 값`: 1절 요구사항 5대로 쓴다. 문법과 실행 결과를 구분하는 문장, eval 언급과 링크를 넣는다.
- `## 예제`: 예제 1·2, 각각 `### 예제 N: …` + `file=` + PredictQuiz. 오답은 3절의 틀린 모델 출력이다.
- `## 결과와 이유`
  - 결과 표: `예제 | 결과`, `0 / 1`, `outer / block`.
  - 예제별 설명.
  - 흔한 오해 Callout 2개: "식 문 `count + 1;`도 변수를 바꾼다", "문 맨 앞의 `{ a: 1 }`도 객체 리터럴이다".
- 주의사항
  - 첫 문단에 `**`·코드를 쓰지 않는다. 장 번호를 쓰지 않는다.
  - PredictQuiz 문자열 prop에 작은따옴표를 쓰지 않는다.
  - 용어: 표현식 / 식 문(ExpressionStatement) / 문 / 할당(대입) / 완료 / 완료 값.
- 완료 조건: `npm test`(result-tables 포함)와 `npm run test:build` 통과.

### 3. concept.test.ts
- 파싱 표: `tableBody(mdx, ['코드','결과','이유'])` 5행을 `new Script`로 대조한다.
- 본문 주장(eval은 테스트에서만 쓴다)
  - `var x = 1` → undefined
  - NOTE 2의 세 예 → 1
  - `3; { 4 }` → 4, `3; { var t; }` → 3
  - `if (true) { 5 }` → 5, `7; if (false) { 6 }` → undefined, `7; if (true) { var u; }` → undefined
  - `1; let q = 2;`·`1; class C {}`·`2; function g() {}` → 앞의 값
  - `var g = function f() {};` 파싱 ok
  - `({ a: 1 })`는 객체, `{ a: 1 }`은 1
  - 함수 안 `var undefined = 3`이 3, `var null = 3;` SyntaxError
- `filterConcepts([concept], '객체')` → `[]`.
- 완료 조건: `npx vitest run app/concepts/expressions-statements` 통과. 표 한 칸을 변조하면 실패하는 것을 확인하고 되돌린다.

### 4. 선행 링크·순서 테스트
- helpers에 `EXPRESSIONS_STATEMENTS_PATH`를 추가하고 navigation.spec에서 import한다(작업 5보다 먼저).
- 두 meta.ts에 slug를 단다(label 유지).
- concepts.test: 첫 개념 next `expressions-statements`, total 61, 마지막 position 61, hoisting position 13.
- ConceptPager.test: 첫 개념 다음 링크 `/concepts/expressions-statements`, '1 / 61', '61 / 61'.
- navigation.spec
  - `학습 순서 N / 60` → N=1이면 `1 / 61`, N≥2면 `N+1 / 61`.
  - `toHaveCount(60)` → 61, '60번째' → '61번째'.
  - 순위 배열 +1.
  - 첫 개념 pager의 다음 링크를 새 경로로, CONCEPT_PATH '3 / 61'·이전 링크를 새 경로로.
- responsive.spec 카드 61.
- 완료 조건
  - `grep -rn "학습 순서 [0-9]* / 60\|60번째\|toHaveCount(60)\|toBe(60)" tests/e2e app/lib app/components` 0건.
  - 대조 스크립트: HEAD의 `학습 순서 N / 60` 목록을 (N=1 → 1, N≥2 → N+1)로 바꾼 것이 새 파일의 `/ 61` 목록에서 추가된 항목(새 경로 1/61 확인)을 뺀 것과 같다.
  - `npx vitest run app/lib app/components` 통과.

### 5. 새 페이지 등록
- a11y '개념 페이지: 표현식과 문', responsive 경로·가로 스크롤 케이스, build-output describe(`<details` 2개 이상, `<table` 2개 이상, 머리 코드·결과·이유), content-guide 목록.
- 완료 조건: `npm run test:build`와 6절 e2e 통과.

### 6. 로드맵 문서·전체 검증
- 로드맵 2번 행(가제·문서·상태)과 진행 기록을 갱신한다. 6절 전체와 브라우저 확인 1~4를 마친다.

## 9. 추가 개선 후보
- increment-decrement·iife-module-pattern 본문에서 새 페이지로 가는 역방향 링크(본문 수정이라 범위 밖).

## 변경 이력
- 2026-11-13 (사용자 결정): 독자용 예제에서 eval 제거, 예제 3개 → 2개(할당 식 인수 예제는 increment-decrement와 중복). 완료 값은 설명만 두고 테스트로 검증 — 작업 1·2·3.
- 2026-11-13 (Consensus 검토)
  - 구분 기준을 문법 기준으로 바꿨다("값 자리에 넣어 보기"로 분류하지 않음).
  - 완료 값 한정어: if 규칙의 두 경로, 블록, 다룬 문만.
  - 표현식 정의와 참조, 명세 리터럴 네 가지, error-handling 용어와 단서.
  - 링크 범위: iife는 function만.
  - 뒷장 문법과 ASI 단순화, related에 error-handling·this-binding 추가.
  - grep 패턴, helpers 상수 순서, `-g` 패턴.
- 2026-11-13 (사용자 콘텐츠 검토 1차): if의 undefined가 앞 값을 덮어씀 대비 문장, 표현식=식 동의·"표현식 자리" 통일, 부수 효과 정의, 인수 자리 전개 문법 단순화, 값의 독립 정의, 정상이 아닌 완료에 break·continue — 작업 1·2·3
- 2026-11-13 (사용자 콘텐츠 검토 2차): 학습 목표 2 동어 반복 정리, 식 문 절 "남는 것" → "프로그램이 확인할 수 있는 것" — 작업 1·2

## 구현 진행

- baseline (2026-11-13, `a0e522f`): a0e522f 커밋 직전 같은 트리에서 실행한 결과 — lint·format:check·typecheck 통과, npm test 162파일·5072 통과, test:build 481 통과(커밋 후 코드 변경 없음, 계획 문서만 추가)
- [x] 1. 폴더 뼈대·예제·meta — 예제 출력 실제 실행값 `0`/`1`, `outer`/`block`
- [x] 2. content.mdx 본문 — 메인 검토로 저자 메모성 문장 3곳 정리(첫 소개 문단, "vm에서 실행한 값", "eval로 확인한 결과만 근거") + MDN eval 참고 추가. 제목 `### 문 맨 앞의 {`의 맨 `{`가 MDX 식으로 파싱돼 dev 서버 500 → 제목을 `` `{` ``로(npm test는 MDX를 컴파일하지 않아 못 잡음)
- [x] 3. concept.test.ts — 파싱 표 5행 대조(변조 시 실패 확인), 완료 값 주장(eval은 테스트에서만)
- [x] 4. 선행 링크·순서 테스트 — navigation `/ 60` 38곳 규칙(1 그대로, 2 이상 +1) 스크립트 대조 일치
- [x] 5. e2e·빌드·문서 등록
- [x] 6. 로드맵 갱신, 브라우저(dev): 홈 학습 순서 1·2·3번째, pager '2 / 61'(이전 variable-declaration·다음 primitives-and-objects), 두 페이지 선행 칩 링크, 375px·다크 모드 페이지 가로 스크롤 없음
- 리뷰 1차(메인 + Opus 명세 교차 검토): 명세 정확성 지적을 프로젝트 기준으로 High 재판정해 모두 수정
  - 식 문 "값을 버린다/사라진다"가 "식 문은 완료 값을 남긴다"와 충돌 → "변수에 저장하지 않아 다시 꺼내 쓸 수 없다(명세에서는 완료 값)", 인과는 "덧셈이 count에 넣지 않음"
  - 예제 2 첫 출력은 블록 증거가 아님(괄호 객체 리터럴이어도 outer) → 해설·결과를 "첫 출력은 a:가 할당하지 않음, 블록이라는 것은 명세 시작 글자 제한, 둘째 중괄호가 객체였다면 SyntaxError"로(+테스트 2개)
  - 값 정의 "얻을 수 있는", 명세 Literal과 ArrayLiteral·ObjectLiteral 이름 구분, 자리마다 허용하는 표현식 종류, 표 5행 이유(괄호·우선순위), "값 자리에 넣어 보기" 범위 한정, 레이블은 변수 바인딩을 만들지 않음(링크 위치 이동), if 규칙에 "실행한 쪽의 값", 값 없는 블록, 완료 값은 이 페이지의 이름(`[[Value]]`), eval이 empty를 undefined로, "쓰지 않는 것이 좋고"
  - simplifications: Statement/Declaration 구분, 연산자 우선순위·쉼표, if/반복문 개념 지시 분리, related `es-modules`
- 최종 검증: lint·format·typecheck 통과, npm test 163파일·5110 통과, test:build 488 통과, e2e navigation·a11y 전체 500 통과(리뷰 수정 전), 리뷰 수정 후 관련 e2e 30 통과(새 페이지·홈 학습 순서·증감 연산자·switch)
- 남긴 Low: `async function` 제한의 줄바꿈 한정(iife 페이지와 같은 표현이라 유지), 다른 페이지의 '문장'·'식문장' 용어 차이(본문 미수정 범위)
- 사용자 검토 1차 반영(6건) — lint·format·typecheck 통과, npm test 5111, test:build 488, 새 페이지 e2e 통과
- 사용자 검토 2차 반영(문장 2곳) — 아래 검증 참조

## 구현 결과

### 계획 대비 실제 구현
- 계획(작업 1~6)대로 구현했다. 달라진 점은 다음과 같다.
  - 제목 `### 문 맨 앞의 {`의 맨 `{`를 MDX가 JSX 식으로 파싱해 페이지가 500이 났다 → 제목을 `` `{` ``로 바꿨다.
  - 저자 메모성 문장 3곳을 정리했고, MDN eval 참고 자료를 추가했다.
  - 리뷰 반영으로 related에 `es-modules`, 단순화 항목 2개(Statement/Declaration, 우선순위·쉼표·전개 문법)를 더했다.
  - concept.test에 예제 2의 근거, 블록 완료 값, if의 undefined 덮어쓰기 테스트를 더했다.
- 사용자 콘텐츠 검토 2회(6건 + 2건)를 반영하고, 승인에 따라 `reviewedAt: '2026-11-13'`을 기록했다.

### 코드 리뷰
- 메인 + Opus 명세 교차 검토 결과, 명세 정확성 지적은 프로젝트 기준으로 High로 재판정해 모두 수정했다.
  - 식 문의 값이 '버려진다'는 표현이 완료 값과 충돌함
  - 예제 2 첫 출력의 증거력
  - 리터럴·레이블·if 규칙·용어
- 남긴 Low: `async function` 제한의 줄바꿈 한정, 다른 페이지의 '문장'·'식문장' 표기 차이.

### 후속 작업
- [ ] increment-decrement·iife-module-pattern 본문에서 새 페이지로 가는 역방향 링크(본문 수정이라 범위 밖)
- [ ] 로드맵 3번 데이터 타입(order 7). 추가하면 concept.spec의 '데이터 타입' 텍스트 칩 검사와 순서 테스트(총수 62, 3번째 이후 +1)가 바뀐다
- [ ] content-guide에 "MDX 제목·본문 맨 앞의 `{`는 JSX 식으로 파싱된다(npm test는 못 잡음)" 함정 추가 여부(사용자 확인)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 2의 해설을 "첫 출력은 `a:`가 할당하지 않음을 보일 뿐이고, 블록이라는 근거는 명세의 시작 글자 제한이며, 둘째 중괄호가 객체였다면 SyntaxError"로 바꿨다(Opus 지적). 판별되는 줄을 예제에 더하는 대안은 ASI 설명을 늘려서 택하지 않았다.
- [Claude 판단] 식 문의 값을 "버린다"가 아니라 "변수에 저장하지 않아 다시 꺼내 쓸 수 없다(명세에서는 완료 값)"로 썼다. 같은 페이지의 "식 문은 완료 값을 남긴다"와 모순되지 않게 하려는 것이다.
- [Claude 판단] 명세 문법의 Literal(null·불리언·숫자·문자열)과 배열·객체 리터럴(ArrayLiteral·ObjectLiteral)을 이름으로 구분했다.
- [무검토 승인] 표현식만 오는 자리는 파싱 표로 보이고, 테스트가 `tableBody` + `new Script`로 결과 칸을 대조한다(변수 선언 페이지와 같은 방식).
- 독자용 예제에서 eval을 뺐다(사용자 결정). 완료 값은 본문 설명만 두고, 규칙은 테스트 안에서만 eval로 검증한다. 할당 식 인수 예제는 증감 연산자 페이지와 겹쳐 빼고, 예제를 2개로 했다.
- 핵심 질문은 '표현식/문 구분 + 완료 값'으로 정했다(사용자 결정). 표현식=식 동의 표기, "표현식 자리" 통일, 부수 효과 정의, if가 남기는 undefined가 앞 값을 덮어쓴다는 대비는 사용자 검토로 고쳤다.

#### 배경지식
- ExpressionStatement는 lookahead로 `{`·`function`·`async function`·`class`·`let [`로 시작할 수 없다. 그래서 문 맨 앞의 `{`는 블록이고, `{ a: 1 }`은 블록 안의 레이블 `a:`와 식 문 `1`이다.
- 명세는 문을 평가한 결과를 Completion Record로 설명한다. 값이 없는 것은 empty다. StatementList는 `UpdateEmpty(s, sl)`로 마지막으로 값을 남긴 문의 값을 유지한다. if는 else가 있으면 `UpdateEmpty(…, undefined)`이고, 거짓이며 else가 없으면 undefined다. eval은 empty를 undefined로 바꿔 돌려준다.
- 레이블은 변수 바인딩을 만들지 않는다(label set에만 들어간다).
- MDX는 본문의 `{`를 JSX 식의 시작으로 읽는다. 제목에 `{`를 쓰려면 인라인 코드로 감싼다.

#### 확인 질문
1. 예제 2의 첫 출력 `outer`만으로 `{ a: 1 }`이 블록이라고 할 수 없는 이유는? 그렇다면 블록이라는 근거는 무엇인가?
   <details><summary>답</summary>`({ a: 1 });`처럼 객체 리터럴 식 문이어도 변수 a는 바뀌지 않아 출력이 같다. 블록이라는 근거는 명세의 ExpressionStatement 시작 글자 제한이다. 둘째 줄 `{ a = 'block'; }`가 실행되는 것도 증거가 된다(객체였다면 SyntaxError). content.mdx 예제 2 해설, concept.test '예제 2의 근거'.</details>
2. 식 문의 값을 "버려진다"고 쓰면 같은 페이지의 어느 문장과 충돌하는가?
   <details><summary>답</summary>완료 값 절의 "식 문은 식의 값을 완료 값으로 남깁니다"와 충돌한다. 명세에서 식 문의 평가는 GetValue 결과를 돌려준다. 그래서 '변수에 저장하지 않아 다시 꺼내 쓸 수 없다'로 썼다. content.mdx `### 식 문`.</details>
3. `1; var x;`와 `1; if (false) {}`의 완료 값이 다른 이유는?
   <details><summary>답</summary>var 선언문은 empty를 남겨 UpdateEmpty가 앞의 1을 유지한다. if 문은 거짓이고 else가 없으면 undefined라는 '값'을 남기므로 앞 값을 덮어쓴다. content.mdx 완료 값 절, concept.test.</details>
4. 독자용 예제에서 eval을 빼면서 완료 값 주장은 무엇으로 뒷받침했나?
   <details><summary>답</summary>명세 원문(StatementList NOTE 2, if, PerformEval)을 근거로 본문을 쓰고, concept.test 안에서만 eval로 각 규칙을 실행해 확인했다. 테스트 코드는 독자에게 보이지 않는다. 계획 3절·변경 이력.</details>
5. 학습 순서 2번째에 끼웠을 때 navigation e2e에서 순위를 어떻게 바꿨고, 왜 1은 그대로인가?
   <details><summary>답</summary>1번째(variable-declaration)는 앞에 끼지 않아 그대로이고, 2 이상은 모두 +1, 총수는 61이 된다. 첫 개념의 다음 링크와 원시 값과 객체의 '3 / 61'·이전 링크도 바꿨다. 계획 작업 4, 대조 스크립트.</details>
