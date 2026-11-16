# 데이터 타입 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-16
- 기준: `main` @ `0e7a7df`

## 0. 요약
- 목적: 기초 보강 로드맵 3번. Deep Dive 6장을 "숫자를 넣은 변수에 왜 문자열도 넣을 수 있을까"라는 질문으로 설명하는 `data-types` 페이지를 추가한다(order 7, 학습 순서 3번째). 다룰 내용은 언어 타입 8개, 동적 타이핑, 따옴표 세 종류와 템플릿 리터럴, undefined와 null의 명세 정의다.
- 범위: 새 개념 폴더(타입 표, 결과 표, 예제·퀴즈 3개, 시뮬레이터 없음), 6개 페이지의 선행 칩 링크, 순위가 한 칸씩 밀리는 테스트. 기존 페이지 본문은 바꾸지 않는다.
- 위험: 명세 문장을 판이나 한정어와 어긋나게 쓰는 것(undefined 정의를 let·const로 일반화, 줄 잇기를 빠뜨린 "따옴표 문자열에 줄바꿈 불가").
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → 모두 반영, HIGH 1건 해소)
- 미확정: 없음 (3건 모두 2026-11-16 사용자 승인으로 기본안 확정)

## 1. 요구사항

- 요구사항
  - `app/concepts/data-types/` 추가. category `fundamentals`, order 7, `reviewedAt: null`.
  - 제목(제안): "데이터 타입: 숫자를 넣은 변수에 왜 문자열도 넣을 수 있을까". 로드맵 가제 "변수에는 타입이 없고 값에 타입이 있다"는 첫 문단의 답으로 쓴다.
  - 사용자 결정(2026-11-16)
    - 예제의 증거 도구로 typeof(7장)와 ===(7장)를 쓴다. 본문에서 typeof-operator·equality-operators로 링크하고 simplifications에 밝힌다.
    - 타입 수는 현재 명세의 8개다. 참고 도서 판에 따라 BigInt를 빼고 7개로 설명할 수 있다는 점을 simplifications에 밝힌다. 책은 확인하지 못했고 기억이 근거라서 "판에 따라"로만 쓴다.
    - "데이터 타입이 필요한 이유(메모리 확보·해석)"는 다루지 않는다. simplifications에 "명세는 값이 메모리에 어떻게 놓이는지 정하지 않는다"고 밝힌다.
    - 6개 페이지의 '데이터 타입' 선행 칩에 slug를 단다.
  - 다룰 것(6장 범위)
    1. 값에는 타입이 있다
       - 명세는 언어 값(ECMAScript language value)마다 타입을 정한다. 타입은 Undefined, Null, Boolean, String, Symbol, Number, BigInt, Object의 8개이고, 순서는 명세를 따른다.
       - Object가 아닌 값을 원시 값(primitive value)이라고 부른다. 현재 초안 6.1의 문장이 근거다. ES2025판은 4.4.5에서 원시 값을 Object를 뺀 7개 타입의 값으로 정의하는데, 뜻은 같다.
       - 타입 표
         - 머리는 `타입 | 값의 예 | 분류`다.
         - 분류 칸 값은 `원시 값` 또는 `객체`다. 본문에 '객체'를 써도 검색에는 영향이 없다(filterConcepts는 title·summary·tags만 본다, `app/lib/concepts.ts:91-99`).
         - 값의 예는 `undefined`, `null`, `true`, `'JS'`, `Symbol('id')`, `10`, `10n`, `{}`다. `{}`만 `<code>{'{}'}</code>`로 쓰고 나머지는 `<code>` 안 평문 JSX 텍스트로 쓴다. normalizeCell이 이스케이프한 작은따옴표를 풀지 못하기 때문이다.
       - 표 아래 링크
         - Number → number-type, String → string-utf16, Symbol → symbol, BigInt → number-pitfalls(`content.mdx:50` `### BigInt`), 원시 값과 Object의 차이 → primitives-and-objects.
         - Boolean은 링크가 없다.
       - typeof 결과는 표에 넣지 않는다(typeof-operator 표와 중복). typeof 결과가 타입 이름과 다른 경우(null, 함수)는 typeof-operator로 링크한다.
       - 표의 `undefined`는 리터럴이 아니라 전역 객체의 `undefined` 프로퍼티를 가리키는 식별자다(명세 sec-undefined). 본문에 한 문장 쓰고 global-object로 링크한다. expressions-statements `content.mdx` 1절과 같은 처리다.
    2. 변수에는 타입이 없다(동적 타이핑)
       - 명세 근거
         - `var` 선언 문법(VariableStatement)에는 타입을 적는 자리가 없다.
         - 바인딩에 값을 넣는 연산(InitializeBinding·SetMutableBinding)은 값 인수로 "an ECMAScript language value"를 받고, 값의 타입을 검사하는 단계가 없다.
         - 그래서 같은 변수에 다른 타입의 값을 차례로 할당할 수 있다(예제 1).
       - 본문은 명세의 정의로 서술한다. 예제 1은 "변수의 타입이 값에 따라 바뀐다"는 해석으로도 같은 출력이 나오므로 정의의 증거로 쓰지 않는다. 예제 1이 배제하는 것은 "처음 넣은 값의 타입으로 고정된다"는 모델뿐이라고 쓴다.
       - "변수의 타입"이라고 말하면 그 시점에 변수가 가진 값의 타입을 뜻한다.
       - 동적 타입 언어
         - 명세 용어가 아닌 일반 용어라고 밝힌다(명세에 "dynamically typed"라는 말이 없다).
         - 정의는 "변수에 타입을 정해 두고 실행 전에 검사하는 방식(정적 타입)을 쓰지 않는 언어" 정도로 한정한다.
         - 다른 언어의 세부 동작은 쓰지 않는다.
    3. 따옴표 세 종류
       - `'…'`, `"…"`, `` `…` ``는 모두 String 타입의 값을 만든다. 같은 코드 유닛 나열이면 같은 문자열 값이다(예제 2). 눈에 같아 보여도 다른 문자열이 있다는 점은 string-utf16으로 링크한다.
       - 템플릿 리터럴은 별도 타입이 아니라 문자열을 만드는 다른 문법이다. 만들어지는 값의 타입이 같다고 쓰고, "차이는 문법뿐"이라고는 쓰지 않는다.
       - 줄바꿈
         - 작은따옴표·큰따옴표 문자열에는 줄바꿈 문자(LF·CR)를 문자열 내용으로 그대로 쓸 수 없고, 쓰면 SyntaxError다.
         - 다만 `\` 바로 뒤의 줄바꿈은 줄 잇기(LineContinuation)로 허용된다. 이 줄바꿈은 값에 아무것도 넣지 않는다. 근거는 명세 12.9.4 Note 2이고, vm에서 `'a\⏎b'`의 값이 `"ab"`인 것을 확인했다.
         - 템플릿 리터럴에는 줄바꿈을 그대로 쓸 수 있다. 소스의 LF·CR·CRLF 줄바꿈은 값에서 LF(`\n`) 하나가 된다. 근거는 TV 규칙("The TV of TemplateCharacter :: LineTerminatorSequence is the TRV of LineTerminatorSequence")과 TRV Note(CR·CRLF는 TV·TRV 모두에서 LF로 정규화)다.
       - `${식}`으로 식의 값을 끼워 넣는다. 값을 문자열로 바꾸는 규칙은 type-coercion으로 링크한다.
    4. undefined와 null
       - 인용은 현재 초안의 6.1.1·6.1.2 문장으로 하고, 링크도 같은 판의 현재 id로 건다(아래 references).
         - Undefined 타입의 값은 undefined 하나다. "값을 할당하지 않은 변수는 값 undefined를 가진다."
         - Null 타입의 값은 null 하나다. 객체 값이 의도적으로 없음을 나타낸다("intentional absence of any object value").
       - 명세 문장은 "할당하지 않음 ⇒ undefined" 한 방향이다. `var x = undefined;`처럼 직접 할당할 수도 있으므로, 값이 undefined라고 해서 할당하지 않았다는 뜻은 아니라고 쓴다.
       - let·const를 선언문보다 먼저 읽으면 undefined가 아니라 ReferenceError다(tdz 링크). var의 초기값 예외는 variable-declaration으로 링크만 한다.
       - null은 "객체 값이 없음"을 나타내려고 쓰는 값이라고 쓴다. "코드에 직접 쓴다"처럼 쓰는 주체를 한정하지 않는다.
       - 둘은 타입이 다른 서로 다른 값이라 `===`로 비교하면 false다(예제 3). 함께 걸 링크:
         - `==`가 둘을 같다고 보는 것 → equality-operators
         - `typeof null` → typeof-operator
         - 기본값이 undefined에만 쓰이는 것 → spread-destructuring
       - 예제 3이 배제하는 틀린 모델: "선언만 한 변수는 null이다", "null과 undefined는 같은 값이다".
- 선행 링크: equality-operators, number-type, primitives-and-objects, short-circuit-evaluation, type-coercion, typeof-operator의 `{ label: '데이터 타입' }`에 `slug: 'data-types'`를 단다. label과 reviewedAt은 그대로 둔다.
- 유지해야 하는 기존 동작
  - 기존 61개 페이지의 본문과 6개 페이지의 reviewedAt.
  - 첫 개념 variable-declaration, 두 번째 expressions-statements, 마지막 es-modules.
  - 홈 '객체' 검색 결과 17개(미확정 2에 따라 바뀔 수 있음).
- 제외 범위
  - 메모리 설명.
  - 각 타입의 세부(숫자 표현, 코드 유닛, 심벌 레지스트리, 객체 변경).
  - 태그드 템플릿·String.raw, 이스케이프 시퀀스 목록, 타입 변환.
  - 기존 페이지 본문의 역방향 링크.
  - spread-destructuring 인용 수정(§9 후속).

## 2. 사실과 추정

### 사실
- 8개 타입 목록과 순서는 현재 초안(ES2027)·ES2025·ES2020판 6.1에서 모두 같다. "An ECMAScript language value that is not an Object is a primitive value." 문장은 현재 초안 6.1에만 있다. 근거: scratchpad의 spec.html·spec2025.html·spec2020.html.
- undefined·null 정의는 판마다 위치와 문장이 다르다.
  - 현재 초안
    - 4.4 용어 정의가 없다.
    - 6.1.1: "Any variable that has not been assigned a value has the value undefined."
    - 6.1.2: "representing the intentional absence of any object value".
    - 현재 id는 `sec-ecmascript-language-types-undefined-type`·`sec-ecmascript-language-types-null-type`이고, `sec-undefined-value`·`sec-null-value`는 oldids다.
  - ES2025판: 4.4.13 "primitive value used when a variable has not been assigned a value", 4.4.15 "primitive value that represents the intentional absence of any object value".
- spread-destructuring은 인용과 링크의 판이 다르다. `content.mdx:47`은 4.4 용어 정의를 번역해 인용하는데, `meta.ts:175,179`의 링크(`#sec-undefined-value`·`#sec-null-value`)는 현재 초안의 6.1.1·6.1.2로 간다(미확정 3).
- 바인딩 연산
  - SetMutableBinding(9.1.1.1.5)·InitializeBinding(9.1.1.1.4)은 값 인수로 "an ECMAScript language value"를 받는다.
  - 값의 타입을 검사하는 단계는 없다. 불변 바인딩이면 TypeError를 던지는데, 이것은 타입이 아니라 const와 관련된 검사다.
- 문자열 리터럴
  - SingleStringCharacter/DoubleStringCharacter는 LineTerminator를 제외하고, `<LS>`·`<PS>`와 LineContinuation은 허용한다.
  - 12.9.4 Note 1은 문자열 리터럴에 그대로 쓸 수 없는 코드 포인트를 닫는 따옴표, `\`, CR, LF로 든다. Note 2는 "<LF> and <CR> cannot appear in a string literal, except as part of a LineContinuation".
- 템플릿 리터럴
  - TV of TemplateCharacter :: LineTerminatorSequence = TRV of LineTerminatorSequence이고, CR·CRLF는 LF로 정규화된다.
  - LS·PS는 그대로 남는다. 템플릿 안의 `\⏎`(LineContinuation)는 TV가 빈 문자열이다.
- vm 실행 결과(scratchpad/ex, 두 검토자가 다시 실행해 같은 결과를 얻음)
  - 예제 출력
    - dynamic-typing: `["number","string","boolean"]`
    - quotes: `["true true","string","true","2 + 1 = 3"]`
    - undefined-null: `["true false","true false"]`
  - 파싱
    - `'a⏎b'`·`"a⏎b"`·`'a\rb'`: SyntaxError
    - `` `a⏎b` ``: 성공
    - LS가 든 작은따옴표 문자열: 성공
    - `'a\⏎b'`: 성공, 값 `"ab"`
    - 템플릿 `\r\n`·`\r`: 값 `"a\nb"`
  - 함수 안 `var undefined = 1`은 1이고, `var null`은 SyntaxError다.
- 겹치는 기존 내용
  - typeof-operator `content.mdx:7`: 타입 목록과 표
  - primitives-and-objects `content.mdx:6`: 원시 값 7가지(8개 타입 = 원시 값 7 + Object라 모순 없음)
  - number-type `content.mdx:5`: 숫자 타입은 하나
  - number-pitfalls `content.mdx:50`: BigInt
  - spread-destructuring `content.mdx:47`: undefined·null 정의
  - type-coercion `content.mdx:71`: 템플릿 `${}` ToString
  - equality-operators `:94`: null·undefined `==`
- 선행 칩 '데이터 타입'(링크 없음)
  - equality-operators/meta.ts:37, number-type/meta.ts:33, primitives-and-objects/meta.ts:19, short-circuit-evaluation/meta.ts:32, type-coercion/meta.ts:32, typeof-operator/meta.ts:32.
  - 6개 모두 order가 7보다 크다.
  - typeof-operator는 tags에도 '데이터 타입'이 있다(meta.ts:13).
- 순서 테스트
  - concepts.test.ts:104·111·112(total·마지막 position 61), 117행 부근(hoisting position 13)
  - ConceptPager.test.tsx:18·28(23행의 첫 개념 다음 링크는 그대로)
  - navigation.spec.ts: 84·148 toHaveCount(61), 92 '61번째', 99 '객체' 17개와 순위 배열, 174 '1 / 61', 181 CONCEPT_PATH '3 / 61'와 185 이전 링크, `학습 순서 N / 61` 다수
  - responsive.spec.ts:1530
  - concept.spec.ts:41~45: '데이터 타입'·'함수 호출'이 링크가 아님을 검사, 42행 주석
  - 경로 상수·등록 패턴: helpers.ts:129, a11y.spec.ts:859, build-output.test.ts:1023-1037, content-guide.md:225
  - navigation.spec에는 expressions-statements pager 검사가 없다(Architect 확인).
- 표 도우미: `tableBody`(tests/helpers/expression-tables.ts:9)와 `normalizeCell`(result-tables.ts:17-25)은 태그를 지우고 `{'…'}`를 푼다. `[^']*` 정규식이라 이스케이프한 작은따옴표는 풀지 못한다. 8개 값을 `runInNewContext('(' + code + ')')`로 평가하는 방식은 Architect가 실행해 확인했다.

### 추정
- 참고 도서 판은 7개 타입(BigInt 제외)으로 설명한다. 기억이 근거이고, 사용자 결정대로 본문에는 "판에 따라"로만 쓴다.

## 3. 구현 전략
- 직전 두 기초 개념과 같은 구조로 만든다. JSX `<table>` 두 개, 예제 3개와 PredictQuiz, 시뮬레이터 없음, concept.test로 표를 대조한다.
- concept.test가 타입 표 행을 vm에서 평가해 타입과 분류를 대조한다. 명세 타입 판정은 null → Null, typeof가 object·function이면 Object, 나머지는 typeof 결과를 명세 이름으로 바꾼다.
- 핵심 주장("변수에는 타입이 없다")의 근거는 명세 정의이고, 예제는 틀린 모델 하나를 배제하는 보조로만 쓴다.
- 검토했지만 버린 대안
  - typeof 결과 칸을 넣은 표: typeof-operator와 중복이다.
  - 시뮬레이터: 상태 변화가 단순해서 표와 예제로 충분하다.
  - 별도 data .ts 파일: 8행짜리 정적 표라 MDX JSX로 충분하고, tableBody로 검증할 수 있다.

## 4. 변경 파일
- 추가: `app/concepts/data-types/meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `examples/dynamic-typing.js`, `examples/quotes.js`, `examples/undefined-null.js`
- 수정
  - 6개 meta.ts(slug)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `concept.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
  - `.claude/plans/concept-roadmap-foundations.md`
- 변경하지 않음: 공통 코드(app/components·simulator·lib 소스), 기존 페이지 본문, spread-destructuring.

## 5. 위험 요소
- 명세 판
  - 새 페이지는 현재 초안 문장만 인용하고, 현재 id로 링크한다. 절 번호는 라벨에 쓰지 않는다.
  - ES2025 4.4 문장과 섞지 않는다.
  - spread-destructuring과 문장이 다르게 보이는 것은 미확정 3으로 보고한다.
- undefined
  - let·const로 일반화하지 않는다.
  - 역방향("undefined면 할당 안 함")으로 읽히지 않게 쓴다.
  - 식별자라는 점을 밝힌다.
- 줄바꿈 주장
  - LF·CR 한정, 줄 잇기는 예외, LS·PS는 허용이다.
  - 템플릿은 LF·CR·CRLF가 LF가 된다.
  - 이 주장들을 모두 concept.test로 받친다(작업 3).
- 백슬래시 표기
  - 예제 파일의 `\n`: 도구 입력에서 실제 줄바꿈으로 풀릴 수 있다 → python chr(92)로 쓰고 `od -c`로 확인한다.
  - meta.ts 문자열: `'\\n'`로 쓴다. 빌드 HTML에 `\n` 두 글자가 보이는지 grep으로 확인한다(작업 6).
  - content.mdx: 마크다운 인라인 코드 `` `\n` ``는 그대로 보인다. `<code>{'\n'}</code>`는 실제 줄바꿈이 되므로 쓰지 않는다.
  - U+2028 같은 보이지 않는 문자는 문서에 직접 넣지 않고 "U+2028"이라는 텍스트로 쓴다. 테스트에서는 `String.fromCharCode(0x2028)`을 쓴다.
- MDX 따옴표·중괄호
  - 큰따옴표 속성(`explanation="…"`) 안의 `"`, `choices={['…']}` 작은따옴표 문자열 안의 `'`가 빌드를 깬다. 예제 2 퀴즈는 세 종류 따옴표를 모두 설명하므로 `explanation={"…"}`나 `{'…'}`와 이스케이프로 쓴다(json `content.mdx:145` 형태).
  - 백틱이 든 인라인 코드는 이중 백틱(``` `` `…` `` ```)으로 쓴다.
  - 코드 밖 맨 `{`, 제목의 `{`, JSX `<code>` 칸 안의 `{`는 JSX 식으로 읽힌다. `<code>{'${}'}</code>`처럼 문자열 식으로 감싼다. 마크다운 인라인 코드 안의 `${}`는 안전하다(type-coercion:71).
  - 이 오류는 `npm test`가 아니라 `npm run test:build`만 잡는다.
  - 첫 문단에 `**`·코드·장 번호를 쓰지 않는다.
- 장 순서: typeof·===·==(7장), 객체 리터럴 `{}`(10장), 함수 호출 `Symbol('id')`(12장), let·const(15장)는 링크와 simplifications로 처리한다.
- '객체' 검색: title·summary·tags에 '객체'를 넣지 않는다(미확정 2, 유지하면 navigation 17개 유지).
- 순위 +1 누락: N=1·2는 그대로, N≥3만 +1, 분모 62. 대조 스크립트로 막는다(작업 4).
- concept.spec.ts:41: '데이터 타입'이 링크가 되므로 링크 검사로 옮기고, 루프에는 '함수 호출'만 남긴다. 42행 주석도 "slug가 없는 선행 개념은 텍스트 칩"으로 고친다(function-calls 페이지는 있지만 order가 더 커서 slug를 달 수 없다).
- 표 형식: `<th>`는 한 줄, `[&_code]:whitespace-nowrap`, 결과 표 머리는 `예제 | 결과`, 여러 줄 결과 칸은 result-tables 규칙을 따른다(예제 2는 4줄).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e: 선행 칩이 바뀌는 6페이지의 axe 케이스를 포함한다.
  - `npx playwright test tests/e2e/navigation.spec.ts tests/e2e/a11y.spec.ts tests/e2e/concept.spec.ts`
  - `npx playwright test -g "data-types|데이터 타입|홈 학습 순서 보기"`
- 브라우저(dev 서버 재시작 후)
  1. 홈 학습 순서 1~4번째가 변수 선언, 표현식과 문, 데이터 타입, 원시 값과 객체다.
  2. 새 페이지 pager가 '3 / 62'이고, 이전 링크는 expressions-statements, 다음 링크는 primitives-and-objects다.
  3. 6개 페이지의 선행 칩 '데이터 타입'이 /concepts/data-types 링크다.
  4. 375px·다크 모드에서 가로 스크롤이 없고, 퀴즈 3개를 키보드로 조작할 수 있다.
  5. 단순화 목록과 본문에서 `\n`이 백슬래시와 n 두 글자로 보인다.

## 7. 미확정 사항
- [미확정 1] 제목 문구: 질문형 제안안과 로드맵의 서술형 가제 중 무엇을 쓸지. 계획 승인 때 확인한다.
- [미확정 2] '객체' 검색 노출: 기존 관례(테스트 안정성)대로 title·summary·tags에 '객체'를 넣지 않으면, Object 타입을 다루는 이 페이지가 홈 '객체' 검색에 나오지 않는다. 계획은 관례를 유지한다. 노출하려면 tags에 '객체'를 넣고 navigation '객체' 개수와 순위 배열도 고쳐야 한다.
- [미확정 3] spread-destructuring 인용 판 불일치(기존 페이지와 명세 판의 충돌): ES2025 4.4 정의를 인용하면서 현재 초안 6.1.1·6.1.2로 가는 옛 id를 링크한다.
  - 추정 원인: 그 페이지를 작성할 때 4.4 정의가 있는 판을 보았고, 이후 초안에서 4.4가 빠지면서 id만 6.1로 옮겨졌다.
  - 해결안: (a) 링크를 ES2025판 URL(`tc39.es/ecma262/2025/#sec-undefined-value`)로 고정한다. (b) 인용을 현재 초안 문장으로 바꾼다. (c) 그대로 둔다.
  - 이번 범위에서는 고치지 않고, 결정에 따라 §9 후속으로 처리한다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: `meta.ts` → `content.mdx`(필수 h2 뼈대) → `route.tsx`(variable-declaration을 복사해 slug만 바꾼다), 예제 3개.
- 예제(scratchpad/ex 초안 그대로, python chr(92)로 작성)
  - dynamic-typing.js: `var value = 10;` / `console.log(typeof value);` / `value = 'ten';` / `console.log(typeof value);` / `value = true;` / `console.log(typeof value);` → number, string, boolean
  - quotes.js
    - `var single = 'JS'; var double = "JS"; var backtick = `JS`;`(줄마다) / `console.log(single === double, double === backtick);` → `true true`
    - `console.log(typeof backtick);` → string
    - 두 줄 템플릿 `lines`와 `console.log(lines === 'a\nb');` → true
    - `var n = 2;` / `` console.log(`${n} + 1 = ${n + 1}`); `` → `2 + 1 = 3`
  - undefined-null.js: `var empty;` / `console.log(empty === undefined, empty === null);` → `true false` / `var nothing = null;` / `console.log(nothing === null, null === undefined);` → `true false`
  - expectedOutput은 처음에 `[]`로 두고 실제 출력으로 채운다.
- meta
  - summary는 160자 이하이고 '객체'를 쓰지 않는다.
  - tags: 데이터 타입, 타입, 동적 타이핑, 원시 값, 문자열, 템플릿 리터럴, undefined, null, BigInt.
  - goals는 3~4개.
  - prerequisites: 변수 선언과 할당(variable-declaration), 표현식과 문(expressions-statements).
  - related: typeof-operator, number-type, number-pitfalls, string-utf16, symbol, primitives-and-objects, equality-operators, type-coercion, spread-destructuring, tdz, variable-declaration, global-object.
  - references(id는 spec.html에서 확인한 현재 id)
    - 명세: ECMAScript Language Types(`#sec-ecmascript-language-types`), The Undefined Type(`#sec-ecmascript-language-types-undefined-type`), The Null Type(`#sec-ecmascript-language-types-null-type`), String Literals(`#sec-literals-string-literals`), Template Literal Lexical Components(`#sec-template-literal-lexical-components`), Static Semantics: TV(`#sec-static-semantics-tv`), SetMutableBinding(`#sec-declarative-environment-records-setmutablebinding-n-v-s`)
    - MDN: JavaScript의 타입과 자료구조, 템플릿 리터럴(ko URL을 열어 확인)
- simplifications(빠짐없이)
  1. 현재 명세의 8개 타입을 기준으로 한다. 참고 도서는 판에 따라 BigInt를 빼고 7개로 설명할 수 있다. BigInt는 숫자의 함정 개념에서 다룬다.
  2. 명세는 값이 메모리에 어떻게 놓이는지 정하지 않으므로, 타입을 메모리 크기나 해석 방법으로 설명하지 않는다.
  3. typeof는 typeof 연산자 개념, ===와 ==는 동등 비교 개념에서 다룬다. 예제에서는 도구로만 쓴다.
  4. 각 타입의 세부는 숫자 타입, 문자열 길이와 UTF-16, 심벌, 원시 값과 객체 개념에서 다룬다. `{}`(객체 리터럴)와 `Symbol('id')`(함수 호출)는 값의 예로만 쓴다. 객체는 원시 값과 객체 개념, 함수 호출은 별도 개념이다.
  5. 따옴표 문자열 안에 그대로 쓸 수 없는 줄바꿈은 LF·CR이다. `\` 바로 뒤의 줄바꿈(줄 잇기)은 허용되고 값에 아무것도 넣지 않는다. U+2028·U+2029는 따옴표 문자열에 쓸 수 있고, 템플릿 리터럴 안에서도 LF로 바뀌지 않는다. 이스케이프 시퀀스는 `\n`만 쓰고, 그 밖의 이스케이프 규칙(따옴표와 템플릿의 차이 포함)은 다루지 않는다.
  6. 태그드 템플릿과 String.raw는 다루지 않는다. `${}` 안 값을 문자열로 바꾸는 규칙은 암묵적 타입 변환 개념에서 다룬다.
  7. let·const를 선언문보다 먼저 읽으면 undefined가 아니라 ReferenceError다(TDZ 개념). var 선언의 초기값 예외는 변수 선언과 할당 개념에서 다룬다. undefined 식별자는 전역 객체 개념에서 다룬다.
  8. 동적 타입 언어·정적 타입 언어는 명세 용어가 아닌 일반 용어다. 다른 언어의 타입 검사 방식은 다루지 않는다.
  9. console.log는 호스트 API다.
- 완료 조건
  - `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과.
  - 예제 파일을 `od -c`로 확인해 `'a\nb'`가 `\`와 `n` 두 바이트이고, 템플릿 안은 실제 LF다.

### 2. content.mdx 본문
- 첫 문단: 질문과 답(변수에는 타입이 없고 값에 타입이 있다). `**`·코드·장 번호를 쓰지 않는다.
- `## 동작 원리`
  - `### 값에는 타입이 있다`: 타입 표(8행), 링크 문단, undefined 식별자 문장.
  - `### 변수에는 타입이 없다`: 명세 정의, 동적 타입 언어(일반 용어).
  - `### 문자열을 만드는 세 가지 따옴표`
  - `### undefined와 null`: 1절 요구사항 4대로 쓴다.
- `## 예제`: 예제 1~3. 각각 `### 예제 N: …`, `file=`, PredictQuiz를 둔다. 오답은 틀린 모델의 출력이다.
- `## 결과와 이유`
  - 결과 표 `예제 | 결과`와 예제별 설명.
  - 흔한 오해 Callout 3개: "변수는 처음 넣은 값의 타입으로 정해진다", "백틱 문자열은 다른 타입이다", "null과 undefined는 같은 값이다".
- 완료 조건: `npm test`(result-tables 포함)와 `npm run test:build` 통과.

### 3. concept.test.ts
- 타입 표
  - `tableBody(mdx, ['타입','값의 예','분류'])`가 8행이다.
  - 타입 집합이 명세의 8개와 같다.
  - 각 값의 예를 `runInNewContext('(' + code + ')')`로 평가한 결과가 명세 타입 판정과 일치한다.
  - 분류가 '원시 값'인 것은 타입이 Object가 아닐 때와 정확히 같다.
- 줄바꿈 파싱과 값(코드 문자열은 `String.fromCharCode`로 만든다)
  - `'a⏎b'`, `"a⏎b"`, `'a\rb'`는 SyntaxError다.
  - LS·PS가 든 따옴표 문자열은 파싱된다.
  - `'a\⏎b'`는 파싱되고 값은 `'ab'`다.
  - 템플릿의 `⏎`·`\r\n`·`\r`은 모두 `'a\nb'`가 된다.
  - 템플릿의 LS는 바뀌지 않는다.
- undefined는 식별자다: 함수 안 `var undefined = 1`이 1이고, `var null = 1`은 SyntaxError다.
- `filterConcepts([concept], '객체')` → `[]`(미확정 2에서 관례를 유지하는 경우).
- 완료 조건: `npx vitest run app/concepts/data-types` 통과. 표의 분류 칸 하나를 변조하면 실패하는 것을 확인하고 되돌린다.

### 4. 선행 링크·순서 테스트
- helpers.ts에 `DATA_TYPES_PATH`를 추가한다(작업 5보다 먼저).
- 6개 meta.ts에 slug를 단다.
- concepts.test: total 62, 마지막 position 62, hoisting 14.
- ConceptPager.test: '1 / 62', '62 / 62'.
- navigation.spec
  - `/ 61` → N≤2는 그대로, N≥3은 +1, 분모 62.
  - toHaveCount 62, '62번째'.
  - CONCEPT_PATH는 '4 / 62', 이전 링크는 DATA_TYPES_PATH.
  - '객체' 검색 순위 배열은 3 이상만 +1.
- responsive 카드 62.
- concept.spec.ts:41~45: '데이터 타입'은 href 검사로 옮기고, '함수 호출'은 칩 검사를 유지하고, 주석을 고친다.
- 완료 조건
  - `grep -rn "/ 61\|61번째\|toHaveCount(61)\|toBe(61)" tests/e2e app/lib app/components`가 0건.
  - 대조 스크립트: HEAD의 `N / 61` 목록을 변환한 것이 새 `/ 62` 목록과 같다.
  - `npx vitest run app/lib app/components` 통과.

### 5. 새 페이지 등록
- a11y '개념 페이지: 데이터 타입', responsive 가로 스크롤 케이스, build-output describe(`<details` 3개 이상, `<table` 2개 이상, 타입 표 머리), content-guide 목록.
- 완료 조건: `npm run test:build`와 6절 e2e 통과.

### 6. 로드맵 문서·전체 검증
- 로드맵 3번 행과 진행 기록을 갱신한다.
- 6절 전체와 브라우저 확인 1~5를 마친다.
- `grep -c '\\n' build/client/concepts/data-types/index.html`로 백슬래시+n이 HTML에 있는지 확인한다.

## 9. 추가 개선 후보
- typeof-operator·spread-destructuring 본문에서 새 페이지로 가는 역방향 링크.
- expressions-statements simplifications의 "템플릿 리터럴은 다루지 않습니다"에 새 페이지 언급.
- spread-destructuring 인용 판 정리(미확정 3 결정에 따름).

## 변경 이력
- 2026-11-16 (Consensus 검토)
  - 따옴표 문자열 줄바꿈에 줄 잇기 예외와 LS·PS를 더하고, 테스트로 받친다.
  - BigInt를 number-pitfalls로 링크한다.
  - 인용·링크를 현재 초안 문장과 현재 id로 정하고, spread-destructuring 불일치를 미확정으로 남긴다.
  - undefined가 식별자라는 점과 한 방향 서술을 넣는다.
  - 동적 타이핑의 근거를 명세 바인딩 연산으로 잡고, 일반 용어라고 밝힌다.
  - meta의 `\\n`, MDX 따옴표·백틱 대비, concept.spec 주석, 장 범위 simplifications(`{}`·함수 호출)를 더하고, 표 분류 값을 확정한다.

- 2026-11-16 (사용자 승인): 계획 승인. 미확정 기본안 확정 — 1 제목은 질문형 제안안, 2 '객체'는 title·summary·tags에 넣지 않는 관례 유지, 3 spread-destructuring 인용 판은 이번 범위 밖(§9 후속).

- 2026-11-16 (사용자 콘텐츠 검토 1차): let 서술 한정(선언문 실행 뒤 `let x;`는 undefined, 실행 전 읽기는 ReferenceError, const 초기값 없음은 SyntaxError), 명세 비규범 개요 4.3 인용·참고 자료 추가, 동적 타입 문장 수식 정리, 브라우저 전역 `name` 사례를 브라우저 예제(`examples/global-name.html`, runtime browser)로 본문에 싣고 단순화 문구 정리, typeof '대표적으로'(document.all), 도입부 undefined·null 구분, 예제 해설 '줄'→'출력', 클래식 스크립트 정의(type 없음 또는 JavaScript MIME 타입) — 작업 1·2·3

- 2026-11-16 (사용자 콘텐츠 검토 2차): 브라우저 전역 접근자 문장을 '새 프로퍼티를 만들지 않음 + name처럼 세터가 있으면 세터를 거침'으로 한정(top·document는 세터 없는 접근자, Chromium 디스크립터로 확인), 단순화의 'var 선언의 초기값 예외'를 본문 표현으로, 단순화 범위에 세터 없는 프로퍼티(예: top) 명시 — 작업 1·2
## 구현 진행

- baseline (2026-11-16, `0e7a7df`): lint 0 / format:check 통과 / typecheck 통과 / npm test 163 files·5111 tests 통과 / test:build 488 tests 통과
- [x] 1. 폴더 뼈대·예제·meta — examples.test·content-integrity 통과, quotes.js `od -c`로 `\`+`n` 두 바이트·템플릿 실제 LF 확인, 숨은 문자(U+2028·U+2029·CR 등) 없음. 참고 링크 id 7개 모두 spec.html에 존재.
  - 구현 중 결정: 맨 바깥 var는 전역 환경 레코드의 SetMutableBinding을 거친다(명세 9.1.1.4.5 → 객체 레코드 9.1.1.2.5). 세 레코드 모두 값 인수가 "an ECMAScript language value"라 본문 주장은 그대로 두고, simplifications와 참고 링크를 전역 환경 레코드 기준으로 고침(메인 에이전트 직접 수정).
- [x] 2. content.mdx 본문 — result-tables·test:build 통과. 메인 에이전트 문구 수정 2곳: '반대로 typeof null' 접속어 → '또 … 'null'이 아니라', 예제 1 퀴즈 해설에 'number가 세 번 출력' 갈래 추가.
- [x] 3. concept.test.ts — 22개 통과(표 8행·타입 판정·분류, 줄바꿈 LF·CR·LS·PS·줄 잇기·템플릿 정규화, undefined 식별자 등). 분류 칸 변조 시 실패 확인(서브에이전트 보고, 이후 전체 npm test로 원복 상태 통과 확인).
- [x] 4. 선행 링크·순서 테스트 — grep 0건, HEAD `N / 61` 38개 변환 = 새 `/ 62` 38개(메인 대조 스크립트 True), '객체' 순위 17개 변환 일치. app/lib·app/components는 전체 npm test에서 통과.
- [x] 5. 새 페이지 등록 — test:build 495 통과(data-types describe 포함). 빌드 HTML에 `\n` 두 글자 표시 확인.
- 전체 정적 검증(2026-11-16): lint 0 / format:check 통과 / typecheck 통과 / npm test 164 files·5152 tests / test:build 495 — baseline 대비 새 실패 없음.
- e2e(2026-11-16): navigation·a11y·concept.spec 515 passed·1 skipped(기존 모바일 전용 테스트, concept.spec.ts:181), `-g "data-types|데이터 타입|홈 학습 순서 보기"` 8 passed.
- 리뷰 1차(critical-code-review, 메인 + Opus 명세 교차 검토): High 7(프로젝트 심각도 기준: 명세·실행과 어긋나는 서술) 수정 → 재검증 통과(lint·format·typecheck·test 5152·test:build 495·새 페이지 e2e 8)
  - 수정: 예제 실행 조건 문장(Node vm Script로 정정), '타입이 값에 있다면 변수는…' 함의 제거, 브라우저 전역 접근자(name) 예외 simplifications 추가, 예제 2가 CR·CRLF 정규화를 보인다는 과한 주장 분리 + 템플릿 줄 잇기 예외, `${}` 변환 불가 값 TypeError 한정, typeof 문장을 '대부분 같고 두 경우 다름'으로, 예제 1 결과 설명 '오류 없이 string 출력', function-calls 링크 규칙(본문 링크·simplifications·related).
  - Low(보고만): `meta.ts` 판 표기 "판에 따라"는 사용자 결정 유지 / `content.mdx` null 문장 "객체 값이 없음을 나타내려고 쓰는 값"이 명세 설명을 규범처럼 읽힘 / Boolean 문장 "두 값뿐이라 따로 다루는 페이지가 없음" 인과 어색(short-circuit-evaluation 링크 검토) / "안의 코드 유닛 나열"을 "만들어진 값의"로 / var 문법 설명에 바인딩 패턴 생략 / `concept.test.ts:115` 증거력 약한 테스트·`:111` 본문에 없는 'null은 리터럴' 주장, 전역 undefined 프로퍼티·타입 표기 SyntaxError 검증 추가 여지
  - 범위 밖 발견: variable-declaration `content.mdx`에도 "예제의 출력도 이 조건(<script>)으로 실행해 확인" 같은 문구가 있음(실제는 Node vm) — 후속 후보.
- 사용자 콘텐츠 검토 1차 반영(2026-11-16): 6건 모두 반영(메인 에이전트 직접 수정, 텍스트·예제·테스트). 브라우저 예제 `global-name.html`(Chromium 출력 `string true`) 추가, concept.test 3개 추가(let 선언 뒤 undefined·실행 시점 기준·const SyntaxError). 명세 4장 개요는 "non-normative overview"라서 본문에 비규범 설명으로 밝힘. 검증: lint·format·typecheck 통과, npm test 5156, test:build 495, 새 페이지 e2e 재실행.
- 사용자 콘텐츠 검토 2차 반영(2026-11-16): 2건 반영(메인 직접 수정). 검증 재실행 통과.
- [x] 6. 로드맵 문서·전체 검증 — 로드맵 3번 행·진행 기록 갱신(상태 완료, finalize 단계). 전체 정적 검증·navigation/a11y/concept e2e·새 페이지 e2e 통과, dev 서버 화면 확인(pager 3 / 62, 새 문단·예제 표시, 콘솔 오류 없음). 375px·키보드 수동 확인은 하지 않았고 e2e(모바일·다크 axe·가로 스크롤)로 대신함.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 달라진 점:
  - 동적 타이핑 근거의 SetMutableBinding 참고 링크를 선언적 레코드에서 전역 환경 레코드로 바꿨다(맨 바깥 var가 거치는 연산).
  - 브라우저 예제 `examples/global-name.html`(runtime browser)을 추가했다. 사용자 검토가 브라우저 `name` 사례의 구체 출력을 요청했고, 출력 주장은 실행 검증이 필요하기 때문이다.
  - 명세 비규범 개요(4.3) 인용과 참고 자료를 추가했다(사용자 검토).
  - concept.test에 let·const 주장 테스트 3개를 추가했다.

### 코드 리뷰
- 1차 리뷰(메인 + Opus 명세 교차 검토)에서 High 7을 수정했다. Low 6은 보고만 했고, 이후 사용자 검토 2회(8건)를 모두 반영했다.
- 남긴 Low: null 문장의 규범적 어감, Boolean 문장 인과, 코드 유닛 나열 표현, var 바인딩 패턴 생략, concept.test 일부 증거력.

### 후속 작업
- [ ] spread-destructuring: ES2025 4.4 정의를 인용하면서 현재 초안 6.1로 가는 옛 id를 링크한다(인용 판 불일치).
- [ ] variable-declaration: "예제 출력도 `<script>` 조건으로 실행해 확인"(실제는 Node vm) 문구와 느슨한 클래식 스크립트 정의("type=module이 아닌 script").
- [ ] 위 Low 지적 정리(선택), typeof-operator·spread-destructuring 본문의 역방향 링크, expressions-statements 단순화의 템플릿 리터럴 언급.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] "변수에는 타입이 없다"의 근거를 예제가 아니라 명세 정의로 잡았다. 선언 문법에 타입 자리가 없고, SetMutableBinding이 값 인수를 언어 값으로 받으며 타입 검사 단계가 없다. 예제 1은 "처음 넣은 타입으로 고정" 모델만 배제한다. "변수 타입이 값에 따라 바뀐다"는 해석으로도 같은 출력이 나오기 때문이다(Critic 지적).
- [Claude 판단] 브라우저 `name` 출력을 단순화 문장에만 쓰지 않고, 브라우저 예제로 만들어 Chromium에서 대조하게 했다. 출력 주장은 모두 실행 검증한다는 AGENTS.md 원칙 때문이다.
- [Claude 판단] undefined·null은 현재 초안 6.1.1·6.1.2 문장만 인용하고, 링크도 같은 판의 현재 id로 걸었다. ES2025 4.4 정의와 섞지 않았다. spread-destructuring의 불일치는 고치지 않고 후속으로 보고했다.
- [Claude 판단] 리뷰에서 High로 올린 7건(실행 조건 문장, 함의 문장, CR·CRLF 증거 범위, `${}` TypeError 한정 등)은 결과가 맞아도 명세와 다른 설명이면 심각도를 높게 보는 프로젝트 기준에 따라 고쳤다.
- [무검토 승인] 홈 '객체' 검색 노출: 관례대로 title·summary·tags에 '객체'를 넣지 않아, Object 타입을 다루는데도 '객체' 검색에 나오지 않는다.
- 예제 증거 도구로 typeof·===를 쓰고 링크·단순화로 밝힘, 타입 8개 + 도서 판 차이, 메모리 설명 제외, 6개 선행 칩 링크(사용자 결정).
- let·const 서술 한정, 세터 없는 접근자(top·document) 구분 등 사용자 검토 8건.

#### 배경지식
- 명세 6.1은 언어 타입을 Undefined, Null, Boolean, String, Symbol, Number, BigInt, Object 순서로 정하고, Object가 아닌 값을 원시 값이라 부른다(초안 문장).
- 따옴표 문자열은 LF·CR을 그대로 담을 수 없다(LineContinuation `\⏎`는 예외로 값에 아무것도 넣지 않는다). 템플릿 리터럴의 TV는 LF·CR·CRLF를 LF로 정규화한다.
- 클래식 스크립트의 맨 바깥 var는 전역 객체에 이미 자기 프로퍼티가 있으면 새 프로퍼티를 만들지 않는다(CreateGlobalVarBinding). 할당은 전역 객체의 [[Set]]을 거치므로, 브라우저의 WebIDL 접근자 세터가 값을 바꿀 수 있다(`name`은 DOMString 세터, `top`은 세터 없음).
- `let x;`는 선언문이 실행될 때 undefined로 초기화되고, 그 전에 읽으면 TDZ로 ReferenceError다. 기준은 실행 시점이다.

#### 확인 질문
1. 예제 1(`number / string / boolean`)만으로 "변수에는 타입이 없다"를 증명할 수 없는 이유는?
   <details><summary>답</summary>"변수에 타입이 있고 할당할 때마다 바뀐다"는 모델로도 같은 출력이 나온다. 그래서 근거는 명세(선언 문법, SetMutableBinding)이고, 예제는 "처음 타입으로 고정" 모델만 배제한다(content.mdx `### 변수에는 타입이 없다`, 계획 §1-2).</details>
2. 브라우저에서 `var name = 10;` 뒤 `typeof name`이 'string'인데, 이것이 "변수에 타입이 있다"는 반례가 아닌 이유는?
   <details><summary>답</summary>`name`은 전역 객체의 자기 접근자 프로퍼티라 var가 새 프로퍼티를 만들지 않는다. 할당은 세터를 거치고, 세터가 값을 문자열로 바꾼다. 바인딩이 아니라 호스트 세터의 동작이다. 세터 없는 `top`은 할당이 무시된다(examples/global-name.html, 변경 이력 검토 1·2차).</details>
3. 예제 2의 템플릿 비교가 true라는 것이 CR·CRLF 정규화의 증거가 아닌 이유는?
   <details><summary>답</summary>예제 파일의 줄바꿈이 LF뿐이라서, "줄바꿈을 그대로 넣는다"는 모델로도 true가 나온다. CR·CRLF 규칙은 명세 TV/TRV가 근거이고 concept.test가 검사한다(리뷰 High, concept.test 줄바꿈 describe).</details>
4. "할당하지 않은 변수는 undefined"라는 명세 문장을 let·const에 그대로 적용하면 어디서 틀리는가?
   <details><summary>답</summary>`let x;`는 선언문 실행 뒤에는 undefined지만, 실행 전에 읽으면 ReferenceError(TDZ)다. `const`는 초기값 없는 선언이 SyntaxError라서 할당하지 않은 const가 없다(사용자 검토 1차, concept.test).</details>
5. 새 페이지 title·summary·tags에 '객체'를 넣으면 무엇이 깨지는가?
   <details><summary>답</summary>홈 '객체' 검색 결과 수(17)와 순위 배열을 고정한 navigation.spec, 새 페이지 concept.test의 filterConcepts 검사가 실패한다(계획 §7 미확정 2).</details>
