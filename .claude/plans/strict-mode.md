# strict mode 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-16
- 기준: `main` @ `3f5c2f9`

## 0. 요약
- 목적: Deep Dive 20장을 "'use strict'는 왜 맨 앞에 써야만 효과가 있을까"라는 질문으로 설명하는 `strict-mode` 페이지를 추가한다(order 177, 학습 순서 22번째). 중심은 적용 범위다(지시어 프롤로그, 코드 단위 전체의 성질, 쓰인 곳 기준). strict mode가 바꾸는 동작은 변화 표로 모으고, 이미 다룬 페이지로 링크한다.
- 범위: 새 개념 폴더(ecmascript 예제 3개, 리터럴 JSX 변화 표를 concept.test가 실행 대조, 퀴즈 3개, 시뮬레이터 없음), variable-declaration의 'strict mode는 별도 개념' 2곳 링크화, 22번째 이후 순위 +1 테스트. 다른 페이지 본문은 바꾸지 않는다.
- 위험: 적용 단위를 "지시어 이후만", "호출한 쪽 기준", "파일 어디에 써도"로 오해하게 쓰는 것. sloppy 결과에 기대는 예제가 실행 환경(모듈)에 따라 달라지는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → 모두 반영, HIGH 1건 해소)
- 미확정: 없음 (2건 모두 2026-11-16 사용자 승인으로 기본안 확정)

## 1. 요구사항

- 요구사항
  - `app/concepts/strict-mode/` 추가. category `execution`(block-scope·execution-context와 같은 그룹, 코드를 어떤 규칙으로 처리하는지의 문제), order 177(property-order 175와 primitive-methods 180 사이), `reviewedAt: null`.
  - 제목(제안): "strict mode: 'use strict'는 왜 맨 앞에 써야만 효과가 있을까"
  - 사용자 결정(2026-11-16)
    - 핵심 질문은 적용 범위 중심이다. 암묵적 전역은 block-scope가 이미 다룬다.
    - strict mode에서 SyntaxError가 되는 문법은 `new Function` + try/catch 예제로 독자에게 보인다(default-parameters `examples/use-strict-body.js` 선례). `new Function`은 코드를 문자열로 받아 함수를 만드는 기능이고 이 페이지에서는 문법 검사 도구로만 쓴다고 본문에 밝힌다.
  - 첫 문단의 답(고정 문장, 명세 근거만. 구형 엔진 호환 같은 설계 이유는 명세에 없으므로 쓰지 않는다)
    - strict mode는 코드 단위(Script, 함수 코드, 모듈, 클래스)마다 정해지는 성질이다(4.3.2 "at the level of individual ECMAScript source text units").
    - 명세는 그 단위가 `'use strict'`가 든 지시어 프롤로그로 시작하는지로 판정한다(11.2.2 "begins with a Directive Prologue").
    - 그래서 맨 앞(프롤로그 안)에 써야 한다. 프롤로그 밖의 `'use strict'`는 평범한 문자열 식 문이라 평가만 되고 아무 효과가 없다(11.2.1 NOTE "evaluated normally").
    - 판정된 단위는 통째로 strict다. 지시어보다 앞에 쓰인 매개변수와 함수 이름도 strict 규칙을 따른다(11.2 함수 코드의 정의: [[FormalParameters]] 포함).
  - 다룰 것
    1. strict mode란
       - 명세가 정한 strict variant다(4.3.2, 비규범 개요라고 밝힌다).
       - 일부 문법·의미를 빼고, 일부 의미(this, arguments 등)를 바꾸고, 오류 조건을 더한다. "제한"만이 아니라는 점을 쓴다.
       - "sloppy mode"는 명세 용어가 아닌 통칭이다(명세에 0회). 명세는 non-strict code라고 부른다.
    2. 지시어 프롤로그(11.2.1)
       - Script·함수 본문·모듈 본문 맨 앞에서, 문자열 리터럴 하나와 세미콜론으로만 된 식 문이 이어지는 가장 긴 구간이 지시어 프롤로그다. 그 안의 `'use strict'` 또는 `"use strict"`가 Use Strict Directive다.
       - 다른 문 뒤에 쓴 `'use strict'`는 효과가 없다(예제 1).
       - `'note'; 'use strict';`처럼 앞에 문자열 식 문만 있으면 둘 다 프롤로그 안이라 효과가 있다(예제 1). `'note'` 같은 다른 지시어에 구현이 고유 의미를 주거나 경고할 수 있다는 11.2.1 NOTE를 simplifications에 쓴다.
       - 주석은 문이 아니므로 앞에 있어도 된다. 이스케이프 시퀀스나 줄 잇기가 든 지시어(`'use strict'`)와 괄호로 감싼 `('use strict');`는 지시어가 아니다. 본문에 한 문장씩 쓰고 concept.test로 확인한다.
       - 세미콜론 자동 삽입 세부는 다루지 않는다(simplifications).
    3. 적용 단위(11.2.2, 4.3.2)
       - 전역 코드: 프롤로그에 지시어가 있으면 strict.
       - 함수 코드: strict 코드 안에 들어 있거나(contained) 자기 본문 프롤로그에 지시어가 있으면 strict.
       - 기준은 코드가 쓰인 위치다(4.3.2 "code that is defined within a strict mode source text unit"). strict 함수 안에 쓴 함수는 strict다. strict 함수가 호출한 바깥의 sloppy 함수는 sloppy다(예제 2).
       - 함수 안의 지시어는 그 함수 코드에만 적용된다. 바깥 Script로 퍼지지 않는다(예제 1의 지시어 없는 함수, 예제 2의 helper).
       - 모듈 코드는 항상 strict다. 본문에서 [ES 모듈](/concepts/es-modules) 예제 7로 링크한다(48장).
       - 클래스의 모든 부분은 strict다. [클래스](/concepts/class-basics)로 링크한다(25장). 예제 코드에는 클래스와 모듈 문법을 쓰지 않는다.
       - `Function` 생성자로 만든 함수
         - 11.2.2 마지막 항목은 본문(마지막 인수)이 지시어로 시작하면 strict라고 정한다. 이 문서가 strict인 경우를 빠짐없이 나열하고 나머지를 non-strict로 정의한다.
         - CreateDynamicFunction은 문자열을 따로 파싱한다. 그래서 만든 함수는 호출한 쪽 코드 안에 들어 있지(contained) 않다.
         - 따라서 strict 코드에서 부른 `new Function`도 본문에 지시어가 없으면 sloppy다.
         - 이 성질 덕분에 예제 3의 결과는 예제 파일이 strict인지와 무관하다(concept.test로 확인).
         - Function 생성자에 한정해 쓴다. 직접 eval은 반대로 strict 코드 안에서 부르면 strict라는 대비를 simplifications에 쓰고 "전역 객체 개념에서 다룹니다"로 가리킨다(global-object `content.mdx:96-100`, 예제 12).
       - 매개변수 목록이 단순하지 않은 함수의 본문 지시어가 SyntaxError라는 점은 default-parameters로 링크만 한다.
    4. strict mode가 바꾸는 동작
       - 실행 결과가 바뀌는 것: 변화 표(리터럴 JSX `<table>`)
         - 머리: `바뀌는 것 | 코드 | sloppy mode 결과 | strict mode 결과 | 자세히`
         - 표 위 문장: "결과는 코드를 스크립트로 실행했을 때 마지막 식의 값(문자열은 따옴표로 표시) 또는 던져진 오류의 이름"
         - 행(5개, 모두 vm에서 확인)
           1. 선언 없는 대입: `missing = 1; missing` → `1` / `ReferenceError` → `[블록 스코프](/concepts/block-scope)`
           2. 일반 함수 호출의 this: `typeof (function () { return this; })()` → `'object'` / `'undefined'` → this-binding
           3. 쓰기 불가 프로퍼티에 대입: `var o = Object.freeze({ a: 1 }); o.a = 2; o.a` → `1` / `TypeError` → property-attributes
           4. 지울 수 없는 프로퍼티 delete: `var o = Object.freeze({ a: 1 }); delete o.a` → `false` / `TypeError` → property-attributes
           5. 매개변수 재할당과 arguments: `(function (a) { a = 2; return arguments[0]; })(1)` → `2` / `1` → default-parameters
         - 코드 칸은 `<code>{"…"}</code>`로 쓴다(Prettier 재줄바꿈과 `{` 파싱을 막는다). 코드에 큰따옴표를 쓰지 않는다. 결과 칸은 `<code>{"'object'"}</code>` 형태로 쓴다.
         - 자세히 칸은 마크다운 링크로 쓴다. Architect가 MDX 컴파일로 확인한 결과 `_components.a`(Anchor)로 바뀐다.
       - SyntaxError가 되는 문법: 예제 3
         - 8항목: 식별자 delete, `with` 문, 매개변수 이름 중복, 옛 8진수 리터럴 `010`, `eval`에 대입, `arguments`에 대입, `let`을 변수 이름으로, `implements`를 변수 이름으로.
         - 출력은 항목마다 `<이름> ok SyntaxError`(sloppy 컴파일 결과, strict 컴파일 결과).
         - 매개변수 중복 행이 "단위 전체가 strict"의 증거라고 결과 설명에 쓴다. 본문 지시어가 그보다 앞에 쓰인 매개변수 목록을 막는다. "지시어 이후만 strict"라는 틀린 모델을 배제한다.
       - strict mode 예약어: 12.7.2(규범)가 strict mode 코드에서 식별자로 쓸 수 없게 정한 이름(implements, interface, let, package, private, protected, public, static, yield)을 본문에 적는다. variable-declaration 역방향 링크의 근거가 된다.
       - 부록 C(informative)가 이 목록을 모아 둔 출처이고 이 페이지는 일부만 다룬다고 밝힌다.
- 선행·링크
  - prerequisites: 블록 스코프(block-scope), 함수 호출(function-calls), 프로퍼티 어트리뷰트(property-attributes). 모두 order < 177이다.
  - related: block-scope, this-binding, property-attributes, default-parameters, arrow-functions, variable-declaration, es-modules, class-basics, global-object, function-calls.
- 역방향 링크(AGENTS.md: 대상이 하위 주제를 실제로 다룰 때만)
  - variable-declaration `content.mdx:40`의 "strict mode는 별도 개념으로 다룹니다"를 "[strict mode](/concepts/strict-mode)에서 다룹니다"로 바꾼다. 새 페이지의 예약어 목록과 예제 3의 `let` 행이 근거다.
  - variable-declaration `meta.ts:68`의 "strict mode는 별도 개념으로 다룹니다"를 "strict mode 개념에서 다룹니다"로 바꾸고 related에 'strict-mode'를 더한다. reviewedAt은 그대로 둔다(역방향 링크 일괄 정리 선례).
  - 다른 페이지의 strict mode 언급은 '별도 개념' 문구가 아니므로 바꾸지 않는다(§9).
- 유지할 기존 동작
  - 62개 페이지 본문(variable-declaration 2문장 제외).
  - 첫 개념 variable-declaration, 마지막 es-modules.
  - 홈 '객체' 검색 17개. 새 페이지 title·summary·tags에 '객체'(예: '전역 객체')를 넣지 않는다.
- 제외: 직접 eval의 변수 환경, arguments.callee, 8진수 이스케이프 시퀀스, `08`·`09`, 함수 환경 레코드 구조, 블록 안 함수 선언(부록 B), 화살표 함수·메서드·제너레이터의 개별 판정, "전역에 쓰지 말라" 같은 사용 권고.

## 2. 사실과 추정

### 사실
- 명세(scratchpad spec.html = ES2027 초안, spec2025.html에도 같은 id·문구)
  - 4.3.2 `sec-strict-variant-of-ecmascript`
    - strict variant는 일부 기능을 빼고("excludes"), 일부 의미를 바꾸고("modifies the detailed semantics"), 오류 조건을 더한다.
    - 선택은 "at the level of individual ECMAScript source text units"다.
    - "strict mode only applies when actually executing code that is defined within a strict mode source text unit."
  - 11.2 `sec-types-of-source-code`: 함수 코드는 [[ECMAScriptCode]]와 [[FormalParameters]]를 만드는 소스 텍스트다(매개변수 포함).
  - 11.2.1 `sec-directive-prologues-and-the-use-strict-directive`
    - 가장 긴 StringLiteral 식 문 구간, "exact code point sequences".
    - "may not contain an EscapeSequence or LineContinuation".
    - 자동 세미콜론 삽입 허용, 여러 개 허용.
    - NOTE: 프롤로그의 식 문은 "evaluated normally"이고, 구현은 다른 지시어에 고유 의미·경고를 줄 수 있다.
  - 11.2.2 `sec-strict-mode-code`: 전역 코드(begins with), 모듈 항상, 클래스 모든 부분, eval(지시어 또는 strict 코드 안의 직접 eval), 함수 코드(contained 또는 자기 프롤로그), Function 등 생성자의 마지막 인수. 나머지는 non-strict code다.
  - 12.7.2 `sec-keywords-and-reserved-words`(규범): strict mode에서 식별자로 쓸 수 없는 이름.
  - 부록 C `sec-strict-mode-of-ecmascript`(informative): 이 페이지가 쓰는 항목이 모두 있다.
  - CreateDynamicFunction `sec-createdynamicfunction`: 문자열을 따로 파싱하고, 환경은 [[GlobalEnv]]다(Architect 확인).
  - 명세 전체에 "sloppy"는 0회 나온다.
- vm 실행(scratchpad/probe.mjs와 두 검토자의 추가 탐침)
  - 지시어 위치
    - 첫 문 지시어: ReferenceError
    - 둘째 문 지시어: 오류 없음
    - `'hello'; 'use strict';`: ReferenceError
    - 이스케이프·괄호 지시어: 오류 없음
    - 주석 뒤 지시어, ASI 지시어: strict
    - `'use strict' + ''`, 블록 안, concise 화살표 본문의 문자열: 지시어 아님
  - 적용 단위
    - strict 함수 안의 함수: ReferenceError
    - strict 함수가 부른 sloppy 함수: 오류 없음
    - 객체 리터럴 메서드: sloppy
    - strict 파일의 지시어 없는 `new Function` 본문: sloppy
    - 직접 eval: strict / 간접 eval: sloppy
  - new Function(sloppy / strict 본문)
    - delete 식별자, with, `a, a`, `010`, `08`, `eval =`, `arguments =`, `var let`, `var implements`: 모두 ok / SyntaxError
    - 예제 파일을 strict로 만들어도 결과가 같다.
  - 변화 표 5행
    - sloppy: `1`, `'object'`, `1`, `false`, `2`
    - strict(`'use strict';\n` 접두): `ReferenceError`, `'undefined'`, `TypeError`, `TypeError`, `1`
  - 함정
    - 같은 이름으로 sloppy 탐침 뒤에 strict 탐침을 하면, 앞서 생긴 전역 때문에 strict 대입이 오류 없이 끝난다(`ReferenceError no error no error`).
    - vm 오류는 다른 realm이라 `instanceof Error`가 false다. `e.name`으로 비교한다.
- 겹치는 기존 내용
  - block-scope `content.mdx:28-30`(암묵적 전역), 예제 4·5
  - this-binding `content.mdx:26-40`
  - property-attributes `content.mdx:32-38, 112`
  - default-parameters `content.mdx:42-46`, 예제 11
  - arrow-functions `content.mdx:39`
  - execution-context `content.mdx:56-58`
  - class-basics `content.mdx:23-27`
  - es-modules 예제 7 `module-this-strict.html`(`meta.ts:103-106`, 모듈의 선언 없는 대입 ReferenceError)
  - global-object `content.mdx:96-100`(eval, 예제 12 `eval-strict.js`)
  - variable-declaration `content.mdx:40`, `meta.ts:68`
- 실행기와 도우미
  - `tests/helpers/run-example.ts:15` `runInNewContext`는 지시어를 따로 해석하지 않는다. V8이 명세대로 판정한다.
  - `tableBody`(`tests/helpers/expression-tables.ts:9`)와 `normalizeCell`(`result-tables.ts:17-25`)은 `{"…"}`를 푼다. 칸 안에 큰따옴표가 있으면 풀지 못한다.
  - 리터럴 표 머리 `바뀌는 것`은 result-tables의 `예제 N`·`결과`·`출력` 형식에 해당하지 않는다. 결과 열 머리가 `sloppy mode 결과`라서 `결과`로 시작하지 않는다. 형식 위반으로 오탐되지 않는지 작업 2에서 npm test로 확인한다.
- 순위: order < 177인 개념은 21개다. 새 페이지는 22번째이고 총 63개다.
  - `concepts.test.ts:104·111·112`: 62 → 63, hoisting position 14는 그대로.
  - `ConceptPager.test.tsx:18·28`
  - `navigation.spec.ts`
    - 85·149: toHaveCount(62)
    - 93: '62번째'
    - 107~124: '객체' 순위 배열 → `[4,12,19,20,21,23,24,26,28,30,31,34,42,44,45,54,59]`
    - 175(1)·182(4): 순위는 그대로, 분모만 63
    - 196~686: N+1 / 63
  - `responsive.spec.ts:1541`
  - `concept.spec.ts`는 수정할 필요가 없다(다른 페이지 선행 칩을 바꾸지 않음).

### 추정
- 참고 도서 20장은 암묵적 전역, 변수·함수·매개변수 delete, 매개변수 이름 중복, with, 일반 함수 this, arguments 재할당을 다룬다. 기억이 근거이고 책은 확인하지 못했다. 범위 판단에만 쓴다.

## 3. 구현 전략
- 직전 기초 개념과 같은 구조로 만든다. 예제와 PredictQuiz, 리터럴 JSX 표 두 개(변화 표, 결과 표), 시뮬레이터 없음.
- 핵심 주장의 근거는 명세 정의(4.3.2, 11.2, 11.2.1, 11.2.2)다. 예제는 틀린 모델을 배제한다.
  - 예제 1: "어디에 써도 그 뒤가 strict"를 배제한다.
  - 예제 2: "호출한 쪽 기준"을 배제한다. helper를 strict 함수가 부르는데도 sloppy다.
  - 예제 3의 매개변수 중복 행: "지시어 이후만 strict"를 배제한다.
- 탐침은 선언 없는 대입의 ReferenceError로 통일한다(block-scope에서 배운 동작). 탐침마다 다른 식별자를 쓴다.
- 변화 표는 리터럴 JSX `<table>`로 쓰고, concept.test가 `tableBody`로 읽는다. 행마다 새 vm 컨텍스트에서 코드 칸을 sloppy로, `'use strict';\n`를 앞에 붙여 strict로 실행한다. 결과(문자열은 `'…'`, 그 밖은 `String(v)`, 오류는 `e.name`)를 결과 칸과 대조한다. 표시 코드와 실행 코드가 같다.
- 버린 대안
  - 데이터 파일 + map: map 안의 `<a>`는 Anchor를 거치지 않는다(Architect의 MDX 컴파일 확인). 리터럴 표가 링크와 검증 모두 단순하다.
  - 모듈 브라우저 예제: es-modules 예제 7과 중복이고 48장 범위다. 링크로 대신한다.
  - 클래스 메서드 탐침: 25장 범위다. "메서드면 strict"로 오해될 수도 있다(객체 리터럴 메서드는 sloppy). 링크로 대신한다.
  - 시뮬레이터: 상태 변화가 아니라 판정 규칙이다.

## 4. 변경 파일
- 추가
  - `app/concepts/strict-mode/meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`
  - `examples/directive-position.js`, `examples/lexical-unit.js`, `examples/syntax-errors.js`
- 수정
  - `app/concepts/variable-declaration/content.mdx:40`, `meta.ts:68`(+related)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
  - `.claude/plans/strict-mode.md`(구현 진행 기록)
- 변경하지 않음: 공통 코드 소스, 다른 페이지 본문, concept.spec.ts.

## 5. 위험 요소
- 적용 단위 서술
  - 단위는 명세의 source text unit(Script, 함수 코드, 모듈, 클래스)이다.
  - 피할 오해는 셋이다: "파일 어디에 써도 효과", "함수 안 지시어가 바깥으로 퍼진다", "지시어 이후만 strict". 첫 문단 고정 문장과 예제 1~3이 막는다.
  - 다루지 않는 eval 코드는 simplifications에 쓴다.
- 탐침 이름 충돌: 예제마다, 함수마다 다른 식별자를 쓴다. concept.test는 실행마다 새 컨텍스트를 만든다. expectedOutput을 채울 때 1절의 기대 출력과 같은지 확인한다.
- sloppy 결과에 기대는 예제(예제 1의 지시어 없는 함수, 예제 2의 helper, 변화 표 sloppy 칸): 클래식 스크립트 전제를 본문과 simplifications에 밝힌다. AGENTS.md 규칙과의 관계는 미확정 1에서 정한다.
- 장 순서: 뒷장은 this(22장), 클래스(25장), 모듈(48장), eval(global-object)이다. 본문은 링크, simplifications는 개념 이름으로 처리한다. Object.freeze(16장), arguments(18장), new Function(12장 함수 생성 방식)은 앞장이라 그대로 쓴다.
- 백슬래시: 이스케이프 지시어는 본문 인라인 코드와 concept.test에만 쓴다(예제 파일에는 넣지 않는다). concept.test는 `String.fromCharCode(92)`로 만든다. meta.ts에서는 `'\\u0020'`으로 쓴다. 파일 바이트를 확인한다.
- MDX
  - `choices={['…']}`의 작은따옴표 JS 문자열 안에 `'use strict'`를 쓰면 빌드가 깨진다. 큰따옴표 문자열이나 `{"…"}`를 쓴다.
  - 큰따옴표 prop 안의 작은따옴표는 괜찮다(array-index-length:137).
  - 첫 문단에 `**`·코드·장 번호를 쓰지 않는다. 맨 `{`를 쓰지 않는다. 이 오류는 test:build만 잡는다.
- 변화 표 `<th>`는 한 줄로 쓴다. 표는 `overflow-x-auto`와 `[&_code]:whitespace-nowrap`(필요하면 `<Wide>`)로 감싼다.
- 순위 +1 누락: HEAD의 `N / 62` 목록을 변환한 것과 새 목록을 스크립트로 대조한다.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e
  - `npx playwright test tests/e2e/navigation.spec.ts`
  - `npx playwright test -g "strict-mode|strict mode|변수 선언과 할당|홈 학습 순서 보기"`(a11y 케이스 이름에 맞춰 조정)
- 브라우저(dev 서버 재시작 후)
  1. 홈 학습 순서 21~23번째가 property-order, strict-mode, primitive-methods다.
  2. 새 페이지 pager가 '22 / 63'이고, 이전 링크는 property-order, 다음 링크는 primitive-methods다.
  3. 변화 표 자세히 칸 링크가 accent 밑줄로 보이고, 클릭하면 클라이언트 내비게이션으로 이동한다.
  4. variable-declaration 본문과 단순화 문구가 바뀌었다.
  5. 375px·다크 모드에서 변화 표가 넘치지 않고 가로 스크롤로 처리된다.

## 7. 미확정 사항
- [미확정 1] 문서와 코드의 충돌
  - AGENTS.md 예제 규칙: "이 지시어 없이 strict/sloppy에 따라 결과가 달라지는 예제는 쓰지 않는다".
  - 기존 예제 다수가 지시어 없이 sloppy 결과에 기대고 전제를 단순화 목록에 밝혔다: block-scope 예제 4·5(`meta.ts:92`), this-binding 예제 2·4·5(`meta.ts:119`), property-attributes 예제 2·7·8(`content.mdx:38`), class-basics 예제 4(`meta.ts:106`), global-object.
  - 추정 원인: 규칙은 "strict 동작을 보일 땐 첫 줄 지시어"를 정하려던 것인데, 문장이 sloppy 의존 예제 전체를 금지하는 것처럼 읽힌다.
  - 이 페이지는 주제상 sloppy 쪽 결과가 필요하다.
  - 기본안: 선례대로 클래식 스크립트 전제를 밝히고 쓴다. AGENTS.md 문장은 이번에 고치지 않는다(§9).
  - 대안: sloppy 쪽도 모두 `new Function` 본문으로 실행해 환경과 무관하게 만든다. 코드가 문자열이 되어 읽기 어렵다.
- [미확정 2] 제목 문구(질문형 제안안).

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: meta.ts → content.mdx(필수 h2 뼈대) → route.tsx(data-types를 복사해 slug만 바꾼다) 순서, 예제 3개.
- 예제(expectedOutput은 `[]`로 시작해 실제 출력으로 채우고, 아래 기대와 같은지 확인한다)
  - directive-position.js
    - `first()`(본문 첫 문이 지시어), `second()`(`var` 문 뒤에 지시어), `third()`(`'note';` 뒤에 지시어).
    - 각자 서로 다른 이름(`firstName`·`secondName`·`thirdName` 등)에 선언 없이 대입하고, try/catch로 `e.name` 또는 `'no error'`를 돌려준다.
    - 출력: `first ReferenceError` / `second no error` / `third ReferenceError`.
  - lexical-unit.js
    - 바깥 sloppy 함수 `helper`(이름 `helperName`), strict 함수 `outer` 안에 쓴 `inner`(이름 `innerName`).
    - `outer`가 `inner()`와 `helper()`를 둘 다 부른다.
    - 출력: `inner ReferenceError` / `helper no error`.
  - syntax-errors.js
    - `tryCompile(params, body)`(default-parameters와 같은 모양).
    - 8항목 × (sloppy 본문, `'use strict'; ` 접두 본문). 출력 8줄 `<이름> ok SyntaxError`.
    - 매개변수 중복은 `tryCompile('a, a', 'return a;')`와 `tryCompile('a, a', "'use strict'; return a;")`로 쓴다.
- meta
  - summary는 160자 이하이고 '객체'를 쓰지 않는다.
  - tags: strict mode, use strict, 엄격 모드, sloppy mode, 지시어, 지시어 프롤로그, ReferenceError, SyntaxError.
  - goals는 3~4개.
  - references(명세는 현재 id로 링크하고 절 번호는 라벨에 쓰지 않는다)
    - The Strict Variant of ECMAScript, Types of Source Code, Directive Prologues and the Use Strict Directive, Strict Mode Code, Keywords and Reserved Words, CreateDynamicFunction, The Strict Mode of ECMAScript(부록 C)
    - MDN Strict mode(ko URL을 열어 확인)
  - simplifications(빠짐없이)
    1. 장 순서: 모듈·클래스는 ES 모듈·클래스 개념, this는 this 개념에서 다룬다.
    2. 클래식 스크립트 전제: sloppy 결과는 모듈에서 달라진다.
    3. 직접 eval은 strict 코드 안에서 부르면 strict다(Function 생성자와 반대). 전역 객체 개념에서 다룬다. eval 코드의 변수 환경은 다루지 않는다.
    4. 부록 C 전체를 다루지 않는다. arguments.callee, 8진수 이스케이프, `08`·`09`, 블록 안 함수 선언(부록 B), 함수 환경 레코드 구조는 제외한다.
    5. 화살표 함수·메서드·제너레이터는 "strict 코드 안이면 strict"인 같은 규칙을 따르며 개별로 다루지 않는다. concise 화살표 본문은 프롤로그를 가질 수 없다.
    6. 'use strict'가 아닌 지시어(`'note'`)에 구현이 의미를 주거나 경고할 수 있다.
    7. 세미콜론 자동 삽입 세부는 다루지 않는다.
    8. `new Function`은 문법 검사 도구로만 쓴다.
    9. "sloppy mode"는 명세 용어가 아니다.
    10. console.log는 호스트 API다.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과. 세 예제 출력이 위 기대와 같다. 예제 파일에 백슬래시 이스케이프나 숨은 문자가 없다(`od -c` 확인).

### 2. content.mdx 본문
- 첫 문단: 질문과 고정 답(1절). `**`·코드·장 번호를 쓰지 않는다.
- `## 동작 원리`: `### strict mode란`, `### 지시어 프롤로그`, `### 적용 단위`, `### strict mode가 바꾸는 동작`(변화 표 + 예약어 목록 + 부록 C 언급).
- `## 예제`: 예제 1~3. 각각 `### 예제 N: …`, `file=`, PredictQuiz. 오답은 틀린 모델의 출력으로 만든다.
- `## 결과와 이유`
  - 결과 표 `예제 | 결과`(result-tables 형식)와 예제별 설명. 예제 3 설명에 매개변수 중복 = 단위 전체를 넣는다.
  - 흔한 오해 Callout 3개: "'use strict'는 파일 어디에 써도 그 뒤가 strict다", "strict 함수가 부르는 함수도 strict가 된다", "strict mode는 기능을 빼기만 한다(this·arguments 의미 변화)".
- 완료 조건: npm test(result-tables 포함, 변화 표 형식 위반 오탐 없음)와 test:build 통과.

### 3. concept.test.ts
- 변화 표
  - `tableBody(mdx, ['바뀌는 것','코드','sloppy mode 결과','strict mode 결과','자세히'])`가 5행이다.
  - 행마다 새 컨텍스트에서 두 모드로 실행해 결과 칸과 대조한다.
  - 자세히 칸의 링크 slug가 실제 개념이다.
- 프롤로그: 주석 뒤 지시어와 큰따옴표 지시어는 strict, 이스케이프 지시어(`String.fromCharCode(92)`)와 괄호 지시어는 sloppy.
- 동적 함수: strict 스크립트 안의 지시어 없는 `new Function` 본문은 sloppy다. 예제 3을 `'use strict';\n` 접두로 실행해도 출력이 같다.
- `filterConcepts([concept], '객체')` → `[]`.
- 완료 조건: `npx vitest run app/concepts/strict-mode` 통과. 결과 칸 하나를 변조하면 실패하는 것을 확인하고 되돌린다.

### 4. 역방향 링크·순서 테스트
- variable-declaration 2곳 + related.
- 2절의 순서 테스트 목록.
- 완료 조건
  - `grep -rn "/ 62\|62번째\|toHaveCount(62)\|toBe(62)" tests/e2e app/lib app/components`가 0건.
  - HEAD의 `N / 62` 목록을 변환한 것과 새 `/ 63` 목록이 같다(대조 스크립트).
  - `npx vitest run app/lib app/components` 통과.

### 5. 새 페이지 등록
- helpers.ts 경로 상수, a11y 케이스, responsive 가로 스크롤 케이스, build-output describe(`<details` 3개 이상, `<table` 2개 이상, 변화 표 머리), content-guide 목록.
- 완료 조건: test:build와 6절 e2e 통과.

### 6. 전체 검증
- 6절 정적 검증, e2e, 브라우저 확인 1~5.

## 9. 추가 개선 후보
- 다른 페이지(block-scope:38, new-operator:42, es-modules:18 등)의 "모듈은 항상 strict mode" 같은 언급을 새 페이지로 링크한다.
- AGENTS.md 예제 규칙 문장 정리(미확정 1 결정에 따라).
- property-attributes `content.mdx:34`의 "non-strict mode code"를 명세 용어 "non-strict code"로 고친다(두 검토자 공통 발견).
- arguments 객체 개념(18장)을 만들면 변화 표 5행의 링크를 재검토한다.

## 변경 이력
- 2026-11-16 (Consensus 검토)
  - 첫 문단 답을 고정했다(단위 전체의 성질, begins with, 프롤로그 밖은 평범한 식 문, 매개변수 소급).
  - 탐침마다 다른 이름을 쓰고 실행마다 새 컨텍스트를 쓴다.
  - 클래스·모듈 예제를 빼고 링크로 대신했다.
  - Function 생성자 근거를 바로잡고 직접 eval 대비를 더했다.
  - 4.3.2·12.7.2를 근거에 더했다.
  - 변화 표를 리터럴 JSX로 바꾸고(링크 Anchor), 4행을 freeze delete로 바꿨다.
  - 예제 3에 `let`·`arguments`를 더해 8항목으로 만들고 예약어 목록을 넣었다.
  - simplifications를 보강하고, MDX 위험 서술과 순위 서술을 바로잡았다.

- 2026-11-16 (사용자 승인): 계획 승인. 미확정 기본안 확정 — 1 기존 선례대로 클래식 스크립트 전제를 밝히고 sloppy 결과 예제를 쓴다(AGENTS.md 문장은 고치지 않음, §9), 2 제목은 질문형 제안안.

## 구현 진행

- baseline (2026-11-16, `3f5c2f9`): lint 0 / format:check 통과 / typecheck 통과 / npm test 164 files·5156 tests 통과 / test:build 495 tests 통과
- [x] 1. 폴더 뼈대·예제·meta — examples·content-integrity 1326 통과, 세 예제 출력이 계획 기대와 같음, 예제 파일에 백슬래시·탭·CR 없음(od -c), MDN ko URL 200. 메인 문구 수정: summary '함수 단위'→'쓰인 위치로 정해지는', goal 3 '그 함수 코드에만'→'바깥으로 퍼지지 않고 그 함수와 그 안에 쓴 함수'(안쪽 함수도 strict라 오해 방지), 단순화의 실행 환경(Node vm Script로 실행, 브라우저라면 클래식 스크립트에 해당), '클래스 개념', '문이 아니라 식', 'sloppy mode라고 씀'.
  - 구현 중 결정: 계획 §1-3의 "함수 안의 지시어는 그 함수 코드에만 적용"은 안쪽 함수가 strict가 아니라고 읽힐 수 있어, 본문에서는 "바깥 코드로 퍼지지 않는다"로 쓴다(11.2.2 contained 규칙과 일치).
- [x] 4. 역방향 링크·순서 테스트 — variable-declaration 2곳 + related, grep 0건, HEAD `/ 62` 38개 변환 = 새 `/ 63` 38개(True), `npx vitest run app/lib app/components` 11 files·47 통과.
- [x] 2. content.mdx 본문 — result-tables·content-integrity 통과(변화 표 형식 위반 오탐 없음), 서브에이전트 test:build 500 통과(빌드 HTML의 이스케이프 백슬래시·Anchor 링크 확인 보고, 최종 검증에서 재확인). 메인 문구 수정: 본문 명세 절 번호 제거(판마다 달라 선례 없음 → 개요/절 이름), '평가되고 값은 버려질 뿐' → '평가될 뿐'(expressions-statements의 완료 값 서술과 충돌 방지, 2곳), '단위는 파일이 아니라' 삭제(Script 맨 앞 지시어는 실제로 그 파일 전체에 적용되므로 거꾸로 읽힘), helper 조건에 '자기 본문에 지시어도 없는', Function 생성자 '마지막 인수 문자열' → '인수로 받은 문자열'(매개변수 문자열도 함께 파싱).
- [x] 3. concept.test.ts — 18개 통과(변화 표 5행 두 모드 대조·링크 slug, 프롤로그 8개, Function 생성자 2개, '객체' 필터). 서브에이전트가 4행 결과 칸 변조 시 실패 확인 후 원복 보고.
- [x] 5. 새 페이지 등록 — helpers 경로 상수, a11y '개념 페이지: strict mode'(light·dark × desktop·mobile), responsive 가로 스크롤, build-output describe 3개(details·table·변화 표 머리·자세히 링크·이스케이프 백슬래시), content-guide 목록.
- 전체 정적 검증(2026-11-16, 메인 실행): lint 0 / format:check 통과 / typecheck 통과 / npm test 165 files·5193 tests / test:build 503 — baseline 대비 새 실패 없음. 빌드 HTML에 `use strict` 백슬래시 그대로 1건, `<code>` 안 연속 공백 0건.
- e2e(메인 실행): navigation.spec 16 passed, `-g "strict-mode|strict mode|변수 선언과 할당|홈 학습 순서 보기"` 12 passed.
- 리뷰 1차(critical-code-review, 메인 + Opus 명세 교차 검토): High 3 수정, Medium 4(프로젝트 심각도 기준으로 High에 준해 함께 수정), Low 7 중 6 수정 → 재검증 통과(lint 0·format·typecheck·npm test 165/5193·test:build 503·navigation e2e 16·새 페이지 e2e 12, 빌드 HTML `<code>` 연속 공백 0)
  - High: 첫 문단이 판정 규칙을 프롤로그 하나로 일반화(모듈·클래스는 항상 strict, 함수는 contained 경로) → 스크립트·함수와 모듈·클래스를 나눔 / Function 생성자 "지시어로 시작할 때만" → "프롤로그에 지시어가 있을 때만"(반례 `'note'; 'use strict';`, 테스트 추가) / goal·Callout "다른 문 뒤의 'use strict'는 효과 없음" → "문자열 리터럴 식 문이 아닌 문 뒤"(예제 1 third와 모순 해소).
  - Medium: '코드 단위'에 클래스 포함·eval 누락 → 명세 네 코드 종류 + 클래스 별도 규칙 / "호출한 쪽과 무관" 주어를 함수로 한정(직접 eval 예외) / "바깥으로 퍼지지 않음" 증거를 예제 2 helper(소스상 앞)에서 예제 1 second로 / try…catch 단순화·related error-handling, 26장 항목(비단순 매개변수·arguments)과 환경 레코드(execution-context) 단순화 문구.
  - Low 수정: 예약어 출처를 부록 C로(yield는 12.7.2 strict 범주가 아님), eval·arguments 바인딩 이름 금지 문장, '마지막 식의 값' → 완료 값(expressions-statements 링크), 'note' 지시어 용어·'권함', 클래식 스크립트 type 빈 문자열, variable-declaration 단순화의 await 범위 오해, 테스트 대조군(function eval(){})·'note' new Function 추가. Callout 인라인 코드 줄바꿈(`'use   strict'`)을 JSX `<code>`로.
  - Low(보고만): concept.test는 strict 예약어 9개 중 예제 3의 let·implements만 검증 / 제목 "맨 앞에 써야만"은 '프롤로그 = 맨 앞' 축약(첫 문단에서 풀어 씀).
- [x] 6. 전체 검증 — 위 재검증 결과, dev 서버 화면 확인(pager 22 / 63, 이전 property-order·다음 primitive-methods, 자세히 링크 Anchor 클래스, 375px·다크에서 문서 가로 넘침 0·표 영역만 스크롤, 콘솔 오류 없음).
- 사용자 검토(2026-11-16, 외부 검토 4건 + 편집 의견 1건, 모두 실행으로 확인 후 수정):
  - 변화 표 2·5행 기준이 호출되는 함수임을 표 아래 문단으로 명시(strict 함수가 부른 sloppy 함수는 `this` 'object'·arguments 연결, 반대는 strict 결과) / 매개변수 이름 중복의 sloppy 허용 조건(단순한 목록의 `function` 함수만)을 본문에 쓰고 arrow-functions 링크·단순화 문장 추가 / 이스케이프·줄 잇기 문자열 뒤에도 프롤로그가 이어짐(`'use\u0020strict'; 'use strict';`는 strict)과 '지시어' 약칭 정의 / 예약어 9개를 "변수·함수·매개변수 이름이나 레이블"로 한정하고 프로퍼티 이름은 허용됨을 명시.
  - 퀴즈 정답 위치를 3·3·3 → 1·0·2로 분산.
  - concept.test에 네 주장 검증 추가(예약어 9개 전부 바인딩·레이블·프로퍼티 검사 → 이전 Low "let·implements만 검증" 해소).

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(order 177, 학습 순서 22 / 63, category execution, ecmascript 예제 3개, 퀴즈 3개, 시뮬레이터 없음). 달라진 점:
  - "함수 안 지시어는 바깥으로 퍼지지 않는다"의 증거를 예제 2의 `helper`에서 예제 1의 `second`로 옮겼다. `helper`는 소스상 `outer`보다 앞에 있어 "지시어가 그 뒤 소스로 퍼진다"는 모델을 배제하지 못하기 때문이다.
  - related에 error-handling·execution-context·expressions-statements를 더했다. 본문과 단순화에서 가리키기 때문이다.
  - variable-declaration 단순화의 await 범위 문구를 고쳤다(리뷰 Low).
  - 사용자 검토로 표 2·5행 기준, 중복 매개변수 조건, 이스케이프 뒤 프롤로그 계속, 예약어 범위 문장과 concept.test 검증을 더하고 퀴즈 정답 위치를 분산했다.

### 코드 리뷰
- 1차 리뷰(메인 + Opus 명세 교차 검토)에서 High 3·Medium 4를 수정하고 Low 7 중 6을 수정했다. 이후 사용자 검토 4건과 편집 의견 1건을 모두 실행으로 확인해 반영했다.
- 남긴 Low: 제목 "맨 앞에 써야만"은 '프롤로그 안 = 맨 앞'의 축약이다(첫 문단에서 풀어 씀).

### 후속 작업
- [x] 다른 페이지(block-scope, new-operator, es-modules 등)의 "모듈은 항상 strict mode" 언급을 새 페이지로 링크한다(§9). → `strict-links-and-wording-followups.md`에서 처리
- [x] AGENTS.md 예제 규칙 문장 정리(미확정 1 기본안에 따른 후속, §9). → `strict-links-and-wording-followups.md`에서 처리
- [x] property-attributes의 "non-strict mode code"를 명세 용어 "non-strict code"로 고친다(§9). → `strict-links-and-wording-followups.md`에서 처리
- [ ] arguments 객체 개념을 만들면 변화 표 5행의 링크를 재검토한다(§9).

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 첫 문단의 판정 규칙을 둘로 나눴다. 스크립트·함수는 지시어 프롤로그로 판정하고(함수는 strict 코드 안에 쓰여도 strict), 모듈·클래스는 지시어 없이 항상 strict다. 처음에는 "프롤로그로 시작하는지" 하나로 일반화했는데, 명세 11.2.2에서 모듈 코드·클래스·contained 함수 경로가 따로 있어 리뷰 High로 고쳤다.
- [Claude 판단] 예제 탐침은 함수마다 다른 이름에 대입하고 실행마다 새 vm 컨텍스트를 쓴다. 같은 이름이면 앞의 sloppy 대입이 만든 전역 프로퍼티 때문에 뒤의 strict 대입이 오류 없이 끝나 결과가 틀린다(Consensus 검토에서 재현).
- [Claude 판단] 예제 3의 SyntaxError는 `new Function`으로 본문을 따로 컴파일해 관찰한다. Function 생성자로 만든 함수는 본문 프롤로그에 지시어가 있을 때만 strict이므로(CreateDynamicFunction), 예제 파일 맨 앞에 `'use strict';`를 붙여도 출력이 같다. concept.test가 두 경우를 모두 실행한다.
- [Claude 판단] 변화 표는 각 행의 이유를 하위 주제를 실제로 다루는 페이지로 링크하고, 결과 칸 10개를 concept.test가 vm에서 sloppy·strict로 직접 실행해 대조한다.
- [무검토 승인] 미확정 기본안: 클래식 스크립트 전제를 본문과 단순화에 밝히고 지시어 없는 sloppy 결과 예제를 쓴다(AGENTS.md 문장은 그대로), 제목은 질문형.
- 핵심 질문을 "적용 범위"로 잡고 문법 오류를 `new Function` 예제로 보이기로 한 것, 외부 검토 4건(표 2·5행 기준, 중복 매개변수 조건, 이스케이프 뒤 프롤로그, 예약어 범위)과 퀴즈 정답 위치 분산(사용자 결정).

#### 배경지식
- 지시어 프롤로그는 Script·함수 본문·모듈 본문 맨 앞의 "문자열 리터럴 + 세미콜론" 식 문이 이어지는 가장 긴 구간이다. 그 안에서 소스 글자가 정확히 `'use strict'`/`"use strict"`인 문만 use strict 지시어다. 이스케이프가 든 문자열은 지시어가 아니지만 문자열 식 문이라 프롤로그를 끊지 않는다.
- 함수 코드는 본문뿐 아니라 매개변수 목록을 포함한다. 그래서 본문에 지시어가 있으면 그보다 앞의 매개변수 목록(`a, a`)과 함수 이름(`eval`)도 strict 규칙을 따른다.
- 함수의 strict 여부는 쓰인 위치(strict 코드 안에 들어 있는지)와 자기 프롤로그로 정해지고, 호출한 쪽은 기준이 아니다. 일반 호출의 `this`·`arguments` 연결도 호출되는 함수가 strict인지로 정해진다.
- 직접 eval은 strict 코드 안에서 부르면 strict라서 Function 생성자와 반대다.

#### 확인 질문
1. 예제 2의 `helper`가 sloppy라는 결과로 "함수 안의 지시어는 바깥으로 퍼지지 않는다"를 증명할 수 없는 이유는? 그 증거는 대신 어디에 있는가?
   <details><summary>답</summary>`helper`는 소스상 `outer`보다 앞에 있어서, "지시어가 그 뒤의 소스로 퍼진다"는 모델로도 sloppy가 나온다. 증거는 `first`(지시어 있음) 뒤에 쓴 예제 1의 `second`가 sloppy라는 결과다(content.mdx `### 적용 단위`, 구현 결과 계획 대비 실제).</details>
2. 예제 3 파일 맨 앞에 `'use strict';`를 붙여도 출력이 그대로인 이유는? 직접 eval로 바꾸면 어떻게 되는가?
   <details><summary>답</summary>`new Function` 본문은 호출한 쪽과 따로 파싱되고, 본문 프롤로그에 지시어가 있을 때만 strict다. 그래서 sloppy 본문은 여전히 `ok`다. 직접 eval은 strict 코드 안에서 strictness를 물려받으므로 sloppy 칸도 SyntaxError가 되어 비교가 깨진다(concept.test `Function 생성자 주장 검증`, 단순화 eval 항목).</details>
3. 예제 1의 세 함수가 모두 같은 이름(예: `probe`)에 대입하면 무엇이 잘못 나오는가?
   <details><summary>답</summary>sloppy인 `second`의 대입이 전역 프로퍼티를 만든 뒤에는 그 이름이 이미 있어서, 뒤의 strict 대입도 ReferenceError 없이 끝난다. 출력이 strict 판정을 반영하지 못한다(본문 `## 예제` 첫 문단, 변경 이력 Consensus).</details>
4. 변화 표 2행만 보고 "strict 코드에서 함수를 호출하면 `this`가 undefined"라고 이해하면 어디서 틀리는가?
   <details><summary>답</summary>표의 코드는 맨 앞에 지시어를 붙여 호출하는 쪽과 호출되는 함수가 함께 strict다. strict 함수가 sloppy 함수를 부르면 그 함수의 `typeof this`는 'object'이고, sloppy 코드가 strict 함수를 부르면 'undefined'다. 기준은 호출되는 함수다(표 아래 문단, concept.test `본문 보충 주장 검증`).</details>
5. 예제를 모듈(`type="module"`, .mjs)로 실행하면 어떤 결과가 바뀌는가?
   <details><summary>답</summary>모듈 코드는 항상 strict라서 지시어 없는 `second`와 `helper`도 ReferenceError가 된다. 그래서 본문 5행과 단순화에 클래식 스크립트 전제를 밝혔다(미확정 1 기본안).</details>
