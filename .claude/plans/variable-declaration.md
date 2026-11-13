# 변수 선언과 할당 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-13
- 기준: `main` @ `66a058b`

## 0. 요약
- 목적: 기초 보강 로드맵 1번. Deep Dive 4장 '변수'를 "선언만 한 변수는 왜 undefined일까"라는 질문으로 설명하는 `variable-declaration` 페이지(order 3, 학습 순서 맨 앞)를 추가한다.
- 범위: 새 개념 폴더(표 2개 + 퀴즈 3개, 시뮬레이터 없음), 기존 두 페이지의 선행 개념 링크, 학습 순서가 한 칸씩 밀리며 바뀌는 테스트 / 기존 두 페이지 본문은 바꾸지 않는다.
- 위험: 한정어 누락(전역 객체에 이미 있는 이름, 클래식 스크립트 맨 바깥) 때문에 hoisting·global-object와 어긋나는 일반화, 그리고 navigation e2e의 순위·첫 카드 수정 누락.
- 복잡도: 중간 · Consensus: 수행 (공통 테스트 여러 곳 + 명세 정확성 위험, 1회 검토 후 방향 변경은 사용자 확인)
- 미확정: 1건

## 1. 요구사항

- 요구사항
  - `app/concepts/variable-declaration/` 추가. category `fundamentals`, order 3, `reviewedAt: null`.
  - 제목: "변수 선언과 할당: 선언만 한 변수는 왜 undefined일까".
  - 다룰 것(4장 범위, `var`만, 클래식 스크립트 맨 바깥 코드 기준):
    1. 변수는 이름(식별자)과 값의 연결이며, 명세 용어로 바인딩(binding)이다.
    2. `var` 선언은 바인딩을 만들고 `undefined`로 초기화한다. 바인딩은 그 줄을 실행하기 전에 이미 있다. 언제·어떻게 만들어지는지는 [호이스팅](/concepts/hoisting)에 넘긴다. 한정어: 같은 이름이 전역 객체에 이미 있으면 기존 값을 그대로 쓴다([전역 객체](/concepts/global-object)).
    3. `var x = 1;`은 선언과 할당 두 가지다. 할당은 그 줄에 도달했을 때 초기값을 평가해 넣는다. 초기값이 없는 `var x;` 줄은 실행해도 아무것도 하지 않는다(명세 "Return empty"). 그래서 값을 넣기 전까지는 `undefined`다.
    4. 한 문장에 여러 변수를 선언하면(`var first, second = 2;`) 초기값은 그 변수에만 적용된다.
    5. 할당과 재할당. 이 페이지의 용어는 이렇게 고정한다.
       - "할당": `=`로 변수에 값을 넣는 것.
       - "재할당": 이미 할당한 변수에 다시 할당하는 것.
       - 명세에서는 둘이 같은 동작(PutValue)이라고 밝힌다.
    6. 어디에서도 찾을 수 없는 이름을 읽으면 ReferenceError다. "어디에서도 찾을 수 없는 이름"은 선언하지 않았고 전역 객체나 호스트가 제공하지도 않는 이름을 말한다. `Math`처럼 미리 있는 이름은 선언하지 않아도 읽힌다. typeof는 [typeof 연산자](/concepts/typeof-operator)에 넘긴다.
    7. 식별자 규칙은 다음과 같다.
       - 첫 글자는 글자·`$`·`_`이고, 둘째 글자부터는 숫자도 쓸 수 있다.
       - 예약어는 쓸 수 없다.
       - 대소문자를 구분한다.
       - strict mode에서만 막히는 이름이 있다. "예를 들어 `let`"이라고만 쓰고 strict mode는 별도 개념으로 둔다.
    8. 중복 선언, 선언 없는 대입, `let`·`const`는 본문에서 링크로만 넘긴다([블록 스코프](/concepts/block-scope), [TDZ](/concepts/tdz)).
  - 사용자 결정(2026-11-13)
    - 기존 페이지의 선행 개념 링크도 같은 작업에서 바꾼다.
      - `primitives-and-objects`: `{ label: '변수와 선언' }` → `{ label: '변수와 선언', slug: 'variable-declaration' }`
      - `hoisting`: `{ label: 'var로 변수 선언하기' }` → `{ label: 'var로 변수 선언하기', slug: 'variable-declaration' }`
    - 핵심 질문을 4장 범위로 바꾼다. 처음 계획했던 질문인 'var 재선언'은 15장(var의 문제점) 내용이라는 지적이 있었고, 이미 block-scope가 다룬다. 이 장 구분은 메인 에이전트와 Critic의 기억에 근거한 것이고, 책으로 확인하지는 않았다.
- 유지해야 하는 기존 동작
  - 기존 59개 개념의 본문과 예제.
  - 두 페이지는 `meta.ts`의 prerequisites 한 항목만 바뀌고 `reviewedAt`은 유지한다. 링크만 바꾼 66a058b와 같은 관례다.
  - 홈 '객체' 검색 결과 17개와 그 순서. 새 페이지의 title·summary·tags에는 '객체'를 넣지 않는다. simplifications는 검색 대상이 아니라서 괜찮다.
  - 마지막 개념 `es-modules`.
- 제외 범위
  - 선언문보다 앞에서 읽는 예제(호이스팅).
  - `var` 중복 선언(block-scope '중복 선언' 절).
  - `let`·`const`, 암묵적 전역, 함수 안·블록·`with`·`catch` 안의 `var`, ES 모듈 차이.
  - 유니코드 이스케이프 식별자, 이름 짓기 관례(camelCase), 대입 식의 값(increment-decrement), 시뮬레이터.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 순서와 선행 개념 조건
  - 현재 맨 앞 order는 `primitives-and-objects`의 10이다(`app/concepts/primitives-and-objects/meta.ts`).
  - order 규칙: 양의 정수이고, 중복되면 안 되며, slug가 있는 선수 개념보다 커야 한다(`tests/content-integrity.test.ts:40,87,92`). 3은 이 조건을 만족하고, 두 기존 페이지(10·110)의 선수 개념이 될 수도 있다.
  - 빈 `prerequisites`는 렌더하지 않는다(`app/components/concept/PrerequisiteList.tsx:11`).
- 검색은 title·summary·tags를 부분 문자열로 찾는다(`filterConcepts`, `app/lib/concepts.ts:91-99`).
- content-integrity는 폴더마다 meta.ts·content.mdx·route.tsx가 있어야 통과한다(`tests/content-integrity.test.ts:48-53`). 필수 h2는 146-152행이 검사한다.
- 겹치는 기존 페이지
  - hoisting: 선언 처리 시점, `var score;` 줄은 아무 일도 하지 않음, 찾을 수 없는 이름의 한정어("선언하지 않았고 호스트가 미리 제공하지도 않는 이름", `content.mdx:38`), 전역 객체에 이미 있는 이름(`meta.ts:68`, `concept.test.ts:70-79`).
  - block-scope: '중복 선언' 절, 예제 7 `redeclare.js`(`var level`), 암묵적 전역, `const`.
  - global-object: `Math` 같은 이름은 선언 없이 읽힘(`content.mdx:5`), 이미 있는 이름에 `var`를 선언해도 값 유지(`content.mdx:76-80`).
  - primitives-and-objects: 재할당과 변경.
  - typeof-operator: 선언하지 않은 이름에 typeof.
- 명세(ES2027 초안 사본과 ES2020 사본을 대조)
  - Variable Statement NOTE(비규범): var 변수는 환경 레코드가 인스턴스화될 때 만들어져 `undefined`로 초기화되고, Initializer가 있으면 만들어질 때가 아니라 그 VariableDeclaration을 실행할 때 대입된다. ES2020판은 "Lexical Environment", 초안은 "Environment Record"로 용어만 다르다.
  - 규범 근거는 GlobalDeclarationInstantiation → CreateGlobalVarBinding이다(이미 있는 이름은 건너뜀). 구현 때 원문을 확인해 본문 근거로 쓴다.
  - 14.3.2.1 Evaluation
    - `VariableDeclaration : BindingIdentifier`는 "Return empty."다.
    - `BindingIdentifier Initializer`는 ResolveBinding → 초기값 평가 → PutValue 순서다.
    - `VariableDeclarationList`는 앞에서부터 차례로 평가한다.
    - NOTE: `with` 안에서는 값이 with 객체의 프로퍼티로 간다.
  - GetValue(초안): "If IsUnresolvableReference(refRecord) is true, throw a ReferenceError exception."
  - 12.7 Names and Keywords
    - Identifier는 ReservedWord가 아닌 IdentifierName이다.
    - 초안의 IdentifierStartChar는 UnicodeIDStart·`$`·`_`이고, IdentifierPartChar는 UnicodeIDContinue·`$`다. ES2020판에는 ZWNJ·ZWJ가 더 있다. 본문에는 쓰지 않는다.
  - 12.7.2: 식별자 이름은 다섯 범주로 나뉜다. `let`·`static` 등 8개는 strict mode에서만 금지된다. 13.1.1에 따르면 strict mode에서는 `yield`·`eval`·`arguments`도 안 된다.
- Node `vm` 실행 확인(2026-11-13)
  - `var c;` → `undefined`, 이후 할당하면 3이다.
  - `var first, second = 2;` → `undefined 2`
  - 선언하지 않은 이름을 읽으면 ReferenceError다(sloppy·strict 모두).
  - `var Math; typeof Math` → `'object'`
  - `runInNewContext('var name; name', { name: 'host' })` → `'host'`
  - `score`/`Score` → `1 2`
- 파싱 확인(`new vm.Script`)
  - 파싱됨: `var 이름 = 1;`, `var $el = 1, _x = 2;`, `var café = 1;`, `var let = 1;`
  - SyntaxError: `var 1st = 1;`, `var my-name = 1;`, `var if = 1;`, `'use strict'; var let = 1;`
- 테스트 선례
  - SyntaxError·ReferenceError 주장은 `concept.test.ts`에서 `new Script`와 `e.name`으로 검증한다(`app/concepts/increment-decrement/concept.test.ts:15`, `app/concepts/typeof-operator/concept.test.ts:34`, `app/concepts/hoisting/concept.test.ts:29,70-79`).
  - `tableBody(mdx, header)`는 머리 행이 정확히 같은 표가 하나일 때만 쓸 수 있다(`tests/helpers/expression-tables.ts:9-21`).
  - JSX 표 칸은 `<code>{"…"}</code>`로 쓴다(`normalizeCell`, `tests/helpers/result-tables.ts:17-25`).
- order 10 이하 개념의 예제는 `try`를 쓰지 않는다(grep 0건).
- 학습 순서 맨 앞 삽입으로 고칠 테스트
  - `app/lib/concepts.test.ts:99-121`: 첫 개념, 다음 개념, total 59, 마지막 position 59, hoisting position 11.
  - `app/components/concept/ConceptPager.test.tsx:17-28`: 첫 개념 '1 / 59', 마지막 '59 / 59'.
  - `tests/e2e/navigation.spec.ts`
    - `/ 59` 37곳, `toHaveCount(59)` 2곳(78·140행), '59번째'(84행).
    - 학습 순서 첫 카드 제목(82행 `'원시 값과 객체: 재할당과 변경'`).
    - '객체' 검색 순위 배열(98-116행).
    - 첫 개념 pager 테스트(163-171행, CONCEPT_PATH가 첫 번째라고 가정).
  - `tests/e2e/responsive.spec.ts:1508`: 카드 59.
  - `tests/e2e/concept.spec.ts:36-40`: '변수와 선언'이 링크가 아님을 검사.
  - build-output의 pager·레지스트리 검사는 동적으로 계산하므로 고칠 필요가 없다.
- 새 개념 등록 관례(66a058b): `tests/e2e/helpers.ts` 경로 상수, `a11y.spec.ts` 페이지 케이스, `responsive.spec.ts` 경로 목록과 가로 스크롤 케이스, `tests/build/build-output.test.ts` 프리렌더 describe, `docs/content-guide.md:225` 목록.

### 추정
- 4장/15장 구분(재선언이 15장): 책으로 확인하지 않았다. 사용자 결정으로 재선언은 이 페이지에서 링크로만 둔다. 같은 이유로 4장의 식별자 규칙이 strict 전용 예약어까지 다루는지도 확인하지 않았다. 그래서 그 부분은 한 문장과 표 한 행으로만 쓰고, strict mode는 별도 개념으로 밝힌다.

## 3. 구현 전략

- 표 + 퀴즈 구성이고 시뮬레이터는 없다. 바인딩을 그리는 시뮬레이터는 hoisting에 이미 있고, 이 페이지는 "어떤 줄이 값을 넣고 어떤 줄은 아무것도 하지 않나"를 예제 출력으로 보이면 충분하다.
- 예제는 틀린 모델을 배제하는 출력으로 고른다.
  - 예제 1의 첫 출력 `undefined`: "선언만 한 변수는 읽으면 오류" 모델과 "값이 없으니 null" 모델을 배제한다. 마지막 `7`: "처음 넣은 값이 남는다" 모델을 배제한다.
  - 예제 2의 `undefined 2`: "`var a, b = 2`는 둘 다 2" 모델(`2 2`)을 배제한다.
  - 예제 3의 `1 2`: "대소문자 무시" 모델(`2 2`)을 배제한다.
- 선언 처리 시점은 설명하지 않는다. 다만 "바인딩은 그 줄을 실행하기 전에 이미 있다"는 한 문장으로 단정하고 호이스팅으로 링크한다. 그래야 "`var x;` 줄에 도달하면 그때 만든다"는 틀린 모델이 생기지 않는다. 예제는 모두 선언문 뒤에서만 읽는다.
- 식별자 표는 실행 출력이 아니라 파싱 결과다. 그래서 `concept.test.ts`가 `tableBody`로 표를 읽고, 코드 칸을 `new Script`로 파싱해 결과 칸과 대조한다.
- ReferenceError와 이미 있는 이름의 한정어는 예제가 아니라 concept.test로 검증한다(hoisting 선례). 본문에서는 문장으로만 쓰고 퀴즈는 만들지 않는다(퀴즈에는 예제 파일이 있어야 한다는 관례).
- 버린 대안
  - var 재선언을 핵심 질문으로 두기: 15장 내용이고 block-scope와 중복된다(사용자 결정).
  - ReferenceError를 `try…catch` 예제로 보이기: order 3 페이지에 47장 개념을 끌어들이게 된다.
  - `var b = a + 1; a = 10` 같은 할당 시점 예제: primitives-and-objects의 재할당 예제와 겹친다.
  - let/const까지 다루기: 15장 범위다.

## 4. 변경 파일

- 추가
  - `app/concepts/variable-declaration/meta.ts`, `content.mdx`, `route.tsx`(primitives-and-objects 템플릿)
  - `examples/declare-assign.js`, `examples/multiple-declare.js`, `examples/case-sensitive.js`
  - `concept.test.ts`
- 수정
  - `app/concepts/primitives-and-objects/meta.ts`, `app/concepts/hoisting/meta.ts`: prerequisites 한 항목에 slug를 단다.
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: 첫 개념·총수·position.
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `concept.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `tests/build/build-output.test.ts`.
  - `docs/content-guide.md:225`: e2e 대상 목록에 `variable-declaration`을 추가한다.
  - `.claude/plans/concept-roadmap-foundations.md`: 1번 가제·계획 문서 이름·상태·진행 기록.
- 변경하지 않음
  - 공통 컴포넌트, `app/lib/concepts.ts`, 라우트: 폴더 자동 스캔으로 충분하다.
  - hoisting·primitives-and-objects의 본문과 `reviewedAt`, block-scope.

## 5. 위험 요소

- "`var` 선언은 `undefined`로 초기화", "선언하지 않은 이름은 ReferenceError"를 한정어 없이 쓰는 것 → hoisting·global-object와 모순된다(`Math`, 브라우저 `name`). 막는 곳: 작업 2의 본문 규칙, 작업 3의 대조 테스트(`var existing;` 값 유지, 호스트 이름 읽기), simplifications.
- "`var x;`는 아무것도 하지 않는다"가 선언까지 없는 것으로 읽히는 것 → "그 **줄의 실행**은 아무것도 하지 않고, 바인딩은 이미 있다"로 구분한다(작업 2).
- 4장 범위 초과(선언 시점의 세부, 재선언, let/const) → 링크와 simplifications로만 넘긴다(작업 1·2).
- 변수를 "메모리 공간/상자"로 서술하는 것 → 정확성 원칙 위반이다. 바인딩으로 설명하고, 메모리 배치는 명세가 정하지 않는다는 점을 simplifications에 적는다.
- 할당/재할당 용어를 섞어 쓰는 것 → 1절 5번의 정의대로 쓴다. 예제 1의 `count = 5`는 할당, `count = 7`은 재할당이다.
- `var let = 1;`이 "가능"인 것은 strict mode·모듈이 아닌 코드에서만이다 → 결과 칸 옆 이유 칸과 본문 첫머리에 클래식 스크립트 기준임을 밝히고, simplifications에 모듈을 적는다.
- 식별자 표 이유 칸의 인과
  - `var first-name = 1;`은 "식별자에 `-`가 들어가서"가 아니다. `-`는 식별자에 쓸 수 있는 글자가 아니라서 식별자가 `first`에서 끝나고, 뒤의 `- name = 1`이 선언문 문법에 맞지 않기 때문이다. 이렇게 쓴다.
  - `var 2nd`는 숫자로 시작할 수 없어서다. `var if`는 `if`가 예약어라서다.
- 예제 변수 이름이 브라우저 전역 객체의 이름(name, status, length 등)과 겹치는 것 → count·first·second·score를 쓴다(브라우저 전역에 없음).
- 표 형식 충돌
  - 식별자 표 머리 `코드 | 결과 | 이유`와 결과 표 머리가 같으면 `tableBody`가 던진다. 결과 표 머리는 `예제 | 결과`로 한다.
  - 식별자 표 첫 칸은 `예제 N`/`N:`으로 시작하지 않는다.
  - 예제 3개는 각각 `### 예제 N` 제목 아래 첫 `file=` 펜스로 둔다.
- 학습 순서 +1 누락 → navigation e2e가 실패한다. 첫 카드 제목과 순위 배열은 grep으로 잡히지 않으므로 작업 4 완료 조건에 navigation.spec 실행을 넣는다.
- Prettier가 Callout 안의 인라인 코드를 끊는 문제 → 빌드 후 content-guide의 grep으로 확인한다.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e: 공통 코드는 안 바꾸지만 기존 e2e 파일을 고치므로 아래 둘을 실행한다.
  - `npx playwright test tests/e2e/navigation.spec.ts tests/e2e/concept.spec.ts tests/e2e/a11y.spec.ts`: a11y 전체를 넣어, 선행 칩이 링크로 바뀌는 primitives-and-objects·hoisting의 axe 케이스(`a11y.spec.ts:150,342`)와 새 페이지 케이스를 함께 돌린다.
  - `npx playwright test -g "variable-declaration|홈 학습 순서 보기"`: responsive의 새 경로 케이스와 홈 카드 수.
- 브라우저(dev 서버를 재시작한 뒤 `/concepts/variable-declaration`)
  1. 홈 학습 순서 보기의 첫 카드가 '1번째' 변수 선언과 할당이고, 두 번째가 원시 값과 객체다.
  2. 새 페이지의 pager가 '학습 순서 1 / 60'이고, 다음 링크(primitives-and-objects)만 있다.
  3. primitives-and-objects·hoisting의 선행 개념 칩이 새 페이지로 가는 링크다.
  4. 375px·다크 모드에서 표 2개에 페이지 가로 스크롤이 없다. 표는 `overflow-x-auto`·`tabIndex={0}`·`role="region"`·`aria-label`을 갖는다. 퀴즈 3개를 키보드로 조작할 수 있다.

## 7. 미확정 사항

- [미확정] 제목 문구. 사용자 콘텐츠 검토 때 바뀔 수 있다(slug는 유지). 바뀌면 navigation.spec.ts 82행도 같이 고친다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: `meta.ts` → `content.mdx`(필수 h2 3개만 있는 뼈대) → `route.tsx` 순서(dev 서버가 `./meta` 실패를 캐시하지 않게), `examples/*.js` 3개
- 변경
  - `declare-assign.js`: `var count;` / `console.log(count);` / `count = 5;` / `console.log(count);` / `count = 7;` / `console.log(count);` → 기대 출력 `undefined`, `5`, `7`.
  - `multiple-declare.js`: `var first, second = 2;` / `console.log(first, second);` → 기대 출력 `undefined 2`.
  - `case-sensitive.js`: `var score = 1;` / `var Score = 2;` / `console.log(score, Score);` → 기대 출력 `1 2`.
  - expectedOutput은 처음에 `[]`로 두고, `npm test`가 보여 주는 실제 출력으로 채운다.
  - meta
    - slug, title, summary(160자 이하, '객체' 없음), category fundamentals, order 3.
    - tags: 변수, 선언, 할당, 재할당, var, 식별자, 예약어, 바인딩, undefined, ReferenceError.
    - goals 3~4개, `prerequisites: []`.
    - related: hoisting, block-scope, tdz, primitives-and-objects, typeof-operator, global-object(본문 링크·simplifications가 가리키는 개념).
    - references: 명세 Variable Statement·GlobalDeclarationInstantiation·GetValue·Names and Keywords·Keywords and Reserved Words, MDN var·문법과 자료형(변수 선언·식별자). 링크는 실제로 열어 확인한다.
    - reviewedAt null.
  - simplifications(빠짐없이)
    1. 클래식 스크립트 맨 바깥 코드 기준이다. 함수 안·블록·`with`·`catch` 안의 `var`와 ES 모듈(모듈에서는 `let`도 예약어이고 맨 바깥 var가 전역 객체 프로퍼티가 되지 않음)은 다루지 않는다.
    2. 바인딩은 명세의 환경 레코드를 단순화한 것이고, 명세는 메모리 배치를 정하지 않아 "메모리 공간"으로 설명하지 않는다. 실행 컨텍스트는 실행 컨텍스트 개념에서 다룬다.
    3. 선언이 처리되는 시점은 호이스팅 개념에서 다룬다.
    4. 전역 객체에 이미 있는 이름에 `var`를 선언하면 `undefined`로 시작하지 않고 기존 값을 쓴다. 미리 있는 이름은 선언 없이 읽힌다. 둘 다 전역 객체 개념에서 다룬다.
    5. 중복 선언, 선언 없는 대입, `let`·`const`는 블록 스코프 개념과 TDZ 개념에서 다룬다.
    6. "재할당"은 명세 용어가 아니다. 명세에서는 할당과 같은 대입이다.
    7. 식별자의 첫 글자 "글자"는 유니코드 ID_Start 속성을 단순화한 말이다. 유니코드 이스케이프로 쓴 식별자는 다루지 않는다.
    8. strict mode에서만 막히는 이름은 일부만 예로 든다. strict mode는 별도 개념이다.
    9. console.log는 호스트 API다.
- 주의사항: 예제 파일 끝에 줄바꿈 하나를 둔다. 예제는 포맷 대상이 아니다.
- 완료 조건
  - `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts`가 통과한다(새 예제 3개, 메타, 뼈대 h2).
  - `filterConcepts([concept], '객체')`가 빈 배열인지 확인하는 한 줄 검사를 작업 3의 concept.test에 넣는다.

### 2. content.mdx 본문
- 대상: `content.mdx`
- 변경
  - 첫머리: 클래식 스크립트 맨 바깥 코드 기준임을 밝힌다.
  - `## 동작 원리`
    - 바인딩.
    - 선언(그 줄 실행 전에 이미 있음 → 호이스팅 링크, 이미 있는 이름 한정 → 전역 객체 링크).
    - 할당(초기값은 그 줄에서 평가·PutValue), 초기값 없는 줄의 실행("Return empty").
    - 한 문장 여러 선언(VariableDeclarationList를 앞에서부터 하나씩, 초기값은 그 선언에만).
    - 할당과 재할당(1절 5번 정의).
    - 찾을 수 없는 이름(한정어 포함, GetValue ReferenceError, `Math` 예시, typeof 링크).
    - 링크만 두는 주제: 중복 선언·선언 없는 대입·let/const → block-scope·tdz, 재할당과 변경 → primitives-and-objects.
  - `### 식별자 규칙` + JSX 표
    - 머리: `코드 | 결과 | 이유`. 결과 칸은 `가능` 또는 `SyntaxError`. 코드 칸은 `<code>{"…"}</code>`로 쓴다.
    - 행 7개: `var 점수 = 1;`, `var $total = 1, _count = 2;`, `var 2nd = 1;`, `var first-name = 1;`, `var if = 1;`, `var let = 1;`, `'use strict'; var let = 1;`.
    - 이유 칸은 5절의 인과대로 쓴다. 대소문자 구분은 예제 3으로 보인다.
  - `## 예제`: 예제 1~3을 각각 `### 예제 N: …` + `file=` 코드 + PredictQuiz로 쓴다. 오답 보기는 3절의 틀린 모델이 내는 출력이다.
  - `## 결과와 이유`
    - 결과 표: 머리 `예제 | 결과`, 행은 `예제 N: …`, 출력이 여러 줄이면 ` / `로 잇는다.
    - 예제별 설명.
    - 흔한 오해 Callout 2개: "선언만 한 변수를 읽으면 오류가 난다", "`var a, b = 2`는 두 변수 모두 2가 된다".
- 주의사항
  - 첫 문단에 `**`와 코드를 쓰지 않는다(빌드 테스트 firstProseLine). 문단을 `import`/`export` 단어로 시작하지 않는다. 장 번호를 쓰지 않는다.
  - 명세 NOTE를 인용할 때는 비규범이라는 점을 고려해, 규범 근거(GlobalDeclarationInstantiation·Evaluation)를 앞에 둔다.
- 완료 조건: `npm test`(result-tables 대조 포함)와 `npm run test:build`가 통과한다.

### 3. concept.test.ts
- 대상: `app/concepts/variable-declaration/concept.test.ts`
- 변경
  - 식별자 표: `tableBody(mdx, ['코드', '결과', '이유'])`의 각 행에서 코드 칸을 `new Script`로 파싱한다. 결과 칸이 `가능`이면 throw가 없어야 하고, `SyntaxError`면 SyntaxError가 나야 한다. 행 수는 7이다.
  - 본문 주장
    - 찾을 수 없는 이름을 읽으면 ReferenceError다(sloppy·`'use strict'` 둘 다, `e.name` 비교).
    - 호스트가 준 이름(`runInNewContext('existing', { existing: 'host' })`)은 오류가 아니다.
    - `var existing;`은 기존 값 `'host'`를 유지한다.
    - 초기값 없는 `var x;` 줄은 앞서 할당한 값을 바꾸지 않는다(`var x; x = 1; var x; x` → 1. 본문은 이 사실을 "줄 실행은 아무것도 안 함"의 근거로만 쓰고, 재선언 주제는 링크한다).
  - `filterConcepts([concept], '객체')`가 `[]`다.
- 완료 조건
  - `npx vitest run app/concepts/variable-declaration`이 통과한다.
  - 표 결과 칸 하나를 일부러 `가능`↔`SyntaxError`로 바꾸면 실패하는 것을 확인하고 되돌린다.

### 4. 선행 개념 링크와 순서 테스트
- 대상: 두 meta.ts, `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `concept.spec.ts`
- 변경
  - prerequisites 두 항목에 `slug: 'variable-declaration'`을 단다(label은 그대로).
  - concepts.test: 첫 개념 `variable-declaration`(next `primitives-and-objects`, position 1, total 60), 마지막 `es-modules` position 60, hoisting position 12.
  - ConceptPager.test: 첫 개념 `variable-declaration` '1 / 60', 다음 링크 `/concepts/primitives-and-objects`, 마지막 '60 / 60'.
  - navigation.spec
    - 모든 `N / 59` → `N+1 / 60`, `toHaveCount(59)` → 60, '59번째' → '60번째'.
    - 82행 첫 카드 제목 → 새 제목.
    - '객체' 순위 배열은 모두 +1(새 페이지는 '객체' 검색에 걸리지 않으므로 개수 17과 첫 카드는 그대로).
    - 첫 개념 pager 테스트: 새 경로가 '1 / 60'이고 링크 1개(다음 primitives-and-objects)인지 확인한다. CONCEPT_PATH는 '2 / 60', 이전 variable-declaration, 다음 short-circuit-evaluation을 확인한다.
  - responsive.spec 1508행: 59 → 60.
  - concept.spec 36-40행: 텍스트 칩 반복에서 '변수와 선언'을 뺀다('데이터 타입', '함수 호출'은 유지). '변수와 선언'이 `/concepts/variable-declaration` 링크인지 확인하는 검사를 더한다.
- 완료 조건
  - `grep -rn "/ 59\|59번째\|toHaveCount(59)" tests app`이 0건이다.
  - `npx vitest run app/lib app/components`가 통과한다.
  - 빌드 후 `npx playwright test tests/e2e/navigation.spec.ts tests/e2e/concept.spec.ts`가 통과한다.

### 5. 새 페이지 등록(e2e·빌드·문서)
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`
- 변경
  - 66a058b의 string-replace-split 케이스를 본뜬다.
  - 경로 상수 `VARIABLE_DECLARATION_PATH`, axe 케이스 '개념 페이지: 변수 선언과 할당'.
  - responsive 경로 목록과 가로 스크롤 케이스.
  - 프리렌더 describe: `<details` 3개 이상, `<table` 2개 이상, 식별자 표 머리 `코드`·`결과`·`이유`.
  - content-guide 목록에 slug를 추가한다.
- 완료 조건: `npm run test:build`와 6절의 e2e 명령이 통과한다.

### 6. 로드맵 문서와 전체 검증
- 대상: `.claude/plans/concept-roadmap-foundations.md`
- 변경: 1번 가제(새 제목)·계획 문서 `variable-declaration.md`·상태, 진행 기록(핵심 질문 변경 결정 포함).
- 완료 조건: 6절의 명령이 모두 통과하고, 브라우저 확인 1~4를 마친다.

## 9. 추가 개선 후보
- hoisting의 "`var score;`처럼 대입이 없는 줄은 아무 일도 하지 않습니다"와 block-scope의 '중복 선언' 절에서 새 페이지로 가는 역방향 링크. 본문 수정이라 이번 범위 밖이다.
- `tests/build/build-output.test.ts:83` 주석 "첫 개념의 시뮬레이터"(primitives-and-objects)가 부정확해진다.
- `docs/content-guide.md:225` 목록에서 기존 개념 몇 개(promise-static-methods, fetch 등)가 빠진 것으로 보인다.

## 변경 이력
- 2026-11-13 (Consensus 검토 + 사용자 결정): 핵심 질문을 'var 재선언'에서 '선언만 한 변수는 왜 undefined'로 바꾸고, 예제 `redeclare.js`를 `multiple-declare.js`로 교체했다. 한정어(전역 객체에 이미 있는 이름, 클래식 스크립트 맨 바깥)·용어 정의·표 형식을 명시하고, navigation 82행·related global-object·작업 1 뼈대를 추가했다.
- 2026-11-13 (사용자 콘텐츠 검토): "선언"이 문장 전체(VariableStatement)·목록 항목(VariableDeclaration)·실행 전 바인딩 생성을 함께 가리켜 "`var x;` 줄은 아무것도 안 함"과 충돌해 보인다는 지적 → 용어를 선언문/선언으로 나누고, 바인딩 생성은 "코드에 선언이 있으면 스크립트 첫 줄을 실행하기 전에"로, "지워도 되는 줄은 아님" 한 문장 추가 — 작업 2
- 2026-11-13 (사용자 콘텐츠 검토 2차): simplifications 3의 시점 문장을 본문("스크립트의 첫 줄을 실행하기 전")에 맞춤 — 작업 1

## 구현 진행

- baseline (2026-11-13, `66a058b`): lint 0 / format:check 통과 / typecheck 통과 / npm test 161 파일·5034 테스트 통과. test:build·e2e는 baseline 미실행(빌드 산출물 갱신 후 단계 검증에서 실행)
- [x] 1. 폴더 뼈대·예제·meta — 예제 출력 실제 실행값(`undefined`/`5`/`7`, `undefined 2`, `1 2`), content-integrity 통과
- [x] 2. content.mdx 본문 — 메인 검토 후 문구 7곳 수정(한정어·"선언 처리" 용어 제거·"각각" 대상 불일치·Callout 코드 뒤 공백). 표 머리 칸이 여러 줄이면 `<th><p>`로 렌더되어 빌드 테스트 정규식이 실패 → 머리 칸 한 줄(string-replace-split과 같은 형식), 375px에서 식별자 중간이 끊겨 식별자 표에 `[&_code]:whitespace-nowrap`(global-object와 같은 형식)
- [x] 3. concept.test.ts — 식별자 표 7행 파싱 대조(변조 시 실패 확인), `typeof Math`는 아무것도 증명하지 못해 `Math` 읽기 무오류·`Math.max(1, 2)`로 교체
- [x] 4. 선행 개념 링크·순서 테스트 — navigation `N / 59` 37곳 모두 +1 확인(스크립트 대조), 순위 배열 +1, 첫 카드 제목
- [x] 5. e2e·빌드·문서 등록
- [x] 6. 로드맵 문서 갱신, 전체 검증: lint·format·typecheck 통과, npm test 162파일·5068 통과, test:build 481 통과, e2e navigation·concept·a11y 전체 507 통과(1 skipped, 기존), `-g "variable-declaration|변수 선언과 할당|홈 학습 순서 보기"` 8 통과. 브라우저(dev): 홈 학습 순서 1·2번째, pager '1 / 60', 두 페이지 선행 칩 링크, 375px·다크 모드 페이지 가로 스크롤 없음(표 영역만 스크롤)
- 리뷰 1차(메인 + Opus 명세 교차 검토): 명세 정확성 지적을 프로젝트 기준으로 High 재판정해 모두 수정 → 재검증 통과(lint·format·typecheck, npm test 5072, test:build 481, concept.spec 11, 새 페이지 e2e 8)
  - 전역 객체 예외를 '자기 프로퍼티'로 한정(CreateGlobalVarBinding의 HasOwnProperty, 상속 프로퍼티는 simplifications), 같은 이름의 함수 선언 예외 추가(+테스트)
  - simplifications: 환경 레코드 문장을 '다루지 않음'으로, 실행 컨텍스트 문장 삭제, ES 모듈 개념 지시·related `es-modules`, typeof·원시 값과 객체 개념 이름, ID_Continue, await·yield, let 선언 이름 제약
  - 본문: 재할당 정의와 primitives-and-objects 정의 차이 명시, '대입'→'할당(대입이라고도)', 여러 선언 문단 인과(문법상 초기값 소속)와 평가 순서 분리(+순서 테스트), 예약어 범위 '`if`, `class` 같은', 표 let 이유 '에서만' 제거, Callout ReferenceError 범위 한정, '식별자=문자열' 표현 수정
  - 남긴 Low: `concept.test.ts`의 '선언만 한 변수는 읽으면 undefined다'는 예제 1과 중복(무해). 식별자 표 테스트는 결과 칸만 증명하고 이유 칸은 증명하지 않음. 상속 프로퍼티 경우는 vm이 명세와 달라(`runInNewContext('var toString; typeof toString')` → 'function') vm 테스트로 검증 불가 — 본문 서술만(명세 근거 HasOwnProperty, Chromium에서 Opus가 확인)
- 사용자 검토 1차 반영(선언문/선언 용어 분리, 바인딩 생성 시점 문장, "지워도 되는 줄은 아님") — lint·format·typecheck 통과, npm test 5072, test:build 481, 새 페이지 e2e 8 통과
- 사용자 검토 2차 반영(simplifications 3 문장) — 아래 검증 결과 참조

## 구현 결과

### 계획 대비 실제 구현
- 계획(작업 1~6)대로 구현했다. 달라진 점:
  - 표 머리 칸을 여러 줄로 쓰면 MDX가 `<th><p>`로 렌더해 빌드 테스트 정규식이 실패해, 머리 칸을 한 줄로 썼다(string-replace-split 형식).
  - 375px에서 식별자가 중간에 끊겨 식별자 표에 `[&_code]:whitespace-nowrap`을 줬다(global-object 형식).
  - 리뷰 반영으로 related에 `es-modules`를 추가했고, concept.test에 함수 선언 예외·선언 목록 평가 순서·`let let`·`await`/`yield` 테스트를 더했다.
  - 사용자 콘텐츠 검토 2회(선언문/선언 용어 분리, 단순화 3번 문장)를 반영하고, 승인에 따라 `reviewedAt: '2026-11-13'`을 기록했다.

### 코드 리뷰
- 메인 + Opus 명세 교차 검토. 명세 정확성 지적(전역 객체 '자기' 프로퍼티 한정, 같은 이름 함수 선언 예외, 용어·단순화·인과 문장)은 프로젝트 기준으로 High로 재판정해 모두 수정했다.
- 남긴 Low: `concept.test.ts`의 '선언만 한 변수는 읽으면 undefined다'는 예제 1과 중복된다. 식별자 표 이유 칸은 테스트가 증명하지 않는다. 상속 프로퍼티 경우는 vm이 명세와 달라 테스트할 수 없다.

### 후속 작업
- [ ] hoisting의 "`var score;`처럼 대입이 없는 줄은 아무 일도 하지 않습니다"와 block-scope '중복 선언' 절에서 새 페이지로 가는 역방향 링크(본문 수정이라 이번 범위 밖)
- [ ] `tests/build/build-output.test.ts:83` 주석 "첫 개념의 시뮬레이터"(primitives-and-objects)가 이제 부정확하다
- [ ] `docs/content-guide.md:225` e2e 대상 목록에 기존 개념 몇 개(promise-static-methods, fetch 등)가 빠진 것으로 보인다
- [ ] 단순화 3번 앞 문장 "시점과 방식은 호이스팅 개념에서"가 본문의 시점 서술보다 뒤처진 표현이다(선택)
- [ ] 로드맵 2번(표현식과 문), 3번(데이터 타입). 3번을 추가하면 `tests/e2e/concept.spec.ts`의 '데이터 타입' 텍스트 칩 검사도 다시 바뀐다

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 리뷰 지적을 반영하면서 선언의 예외 두 가지를 본문에 넣었다. 전역 객체 '자기' 프로퍼티면 기존 값을 쓰고, 같은 이름의 함수 선언이 있으면 값이 함수다. 대안은 단순화 목록으로만 돌리는 것이었지만, "선언하면 undefined"라는 핵심 주장의 반례라서 본문 한정어로 두었다.
- [Claude 판단] 상속 프로퍼티 경우(`var toString;`)는 테스트로 검증하지 않고 명세 근거로만 썼다. Node `vm`의 `runInNewContext`가 명세와 다르게 `'function'`을 내기 때문이다. 브라우저 예제로 만드는 대안도 있었지만, order 3 입문 페이지의 범위를 넘는다고 보았다.
- [Claude 판단] 마무리 단계에서 사용자 "승인"을 콘텐츠 승인으로 보고 `reviewedAt`을 2026-11-13으로 기록했다(content-guide 10단계, 66a058b 관례).
- [무검토 승인] ReferenceError와 이미 있는 이름에 대한 주장은 예제가 아니라 `concept.test.ts`로 검증했다. `try…catch` 예제를 쓰면 order 3 페이지에 뒷장(에러 처리) 개념이 들어오기 때문이다.
- [무검토 승인] 예제 3개를 틀린 모델을 배제하는 출력으로 골랐다(`undefined / 5 / 7`, `undefined 2`, `1 2`). 시뮬레이터는 hoisting과 겹쳐 쓰지 않았다.
- 핵심 질문을 'var 재선언'에서 '선언만 한 변수는 왜 undefined'로 바꿨다(사용자 결정). 재선언은 block-scope가 다루는 범위로 보고 링크로만 두었다.
- '선언문'(VariableStatement)과 '선언'(VariableDeclaration)을 나눠, "`var x;` 줄은 아무것도 안 한다"와 "선언이 바인딩을 만든다"가 충돌해 보이지 않게 했다(사용자 검토).

#### 배경지식
- 클래식 스크립트는 GlobalDeclarationInstantiation이 본문 평가 전에 var 이름마다 CreateGlobalVarBinding을 호출한다. 이 연산은 `HasOwnProperty(globalObj, name)`이 false일 때만 새 바인딩을 만들어 undefined로 초기화하고, 이미 있으면 재사용한다. 같은 이름의 함수 선언은 var 이름 목록에서 빠진다.
- `VariableDeclaration : BindingIdentifier`의 평가는 "Return empty"이고, Initializer가 있으면 ResolveBinding → 초기값 평가 → PutValue 순서다. 할당 식도 PutValue를 쓰므로, 명세는 할당과 재할당을 구별하지 않는다.
- 찾을 수 없는 참조를 읽으면 GetValue가 ReferenceError를 던진다. 이것은 strict 여부와 관계없다.
- 이 사이트는 `order`로 학습 순서를 정하고, 선수 개념은 더 작은 order여야 한다. 맨 앞에 끼우면 모든 순위가 밀려 순위·총수를 고정한 테스트가 바뀐다.

#### 확인 질문
1. "선언만 한 변수는 undefined"의 예외로 왜 '전역 객체의 프로퍼티'가 아니라 '자기 프로퍼티'라고 써야 하는가?
   <details><summary>답</summary>CreateGlobalVarBinding이 HasOwnProperty로 확인하므로, 상속받은 `toString` 같은 이름은 새 바인딩(undefined)이 만들어져 가려진다. 본문 `content.mdx:13`, 단순화 4번(`meta.ts`). vm은 이 경우 명세와 달라 테스트하지 않았다(계획 `## 구현 진행` 리뷰 기록).</details>
2. `var x;` 줄이 "실행해도 아무것도 하지 않는다"면 왜 지우면 안 되는가?
   <details><summary>답</summary>바인딩은 그 줄의 실행이 아니라 코드에 선언이 있다는 사실로 스크립트 실행 전에 만들어진다. 줄을 지우면 선언이 없어져, 읽을 때 ReferenceError(이름이 전역에 없다면)가 난다. `content.mdx:13·19`.</details>
3. ReferenceError를 왜 예제·퀴즈가 아니라 `concept.test.ts`로 검증했나? 퀴즈를 만들 수 없었던 이유는?
   <details><summary>답</summary>예제가 오류로 멈추면 실행기가 실패하므로 `try…catch`가 필요한데, 이는 뒷장 개념이라 order 3 페이지에 들이지 않았다. 퀴즈는 예제 파일이 있어야 한다는 관례가 있다. 계획 3절, `concept.test.ts` '본문 주장 검증'.</details>
4. 예제 2 `var first, second = 2;`가 `undefined 2`인 원인은 "목록을 앞에서부터 평가하기 때문"인가?
   <details><summary>답</summary>아니다. 원인은 문법에서 초기값 `= 2`가 `second` 선언 하나에만 속한다는 것이다. 평가 순서는 별개 사실이고, 테스트 '한 문장의 선언 목록은 앞에서부터 하나씩 평가된다'로 따로 검증한다. `content.mdx:23`, 리뷰 기록.</details>
5. 로드맵 3번 '데이터 타입' 페이지를 추가하면 이번에 고친 테스트 중 무엇이 다시 바뀌는가?
   <details><summary>답</summary>`tests/e2e/concept.spec.ts`의 primitives-and-objects 선행 칩 검사(지금은 '데이터 타입'이 링크가 아님을 확인), 순위가 또 밀리면 `navigation.spec.ts`의 `N / 60`·순위 배열, `concepts.test.ts`·`ConceptPager.test.tsx`의 총수. order가 7이면 첫 개념은 그대로다.</details>
