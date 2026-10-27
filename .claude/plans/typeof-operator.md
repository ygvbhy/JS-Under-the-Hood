# `typeof` 연산자 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `8cf8e95`

## 0. 요약
- 목적: 로드맵 3번 개념 `/concepts/typeof-operator`를 추가한다. `typeof`가 값의 타입을 문자열로 돌려주며, 명세 표대로 `null`은 `'object'`, 함수는 `'function'`, 선언하지 않은 식별자는 오류 없이 `'undefined'`가 된다는 것을 예제·표·퀴즈로 설명한다.
- 범위: 새 개념 폴더 1개(시뮬레이터 없음) + `typeof` 결과 표 데이터 파일 + e2e·빌드 테스트 케이스 추가 + content-guide 목록 문구. 공통 코드와 기존 다섯 개념은 바꾸지 않는다.
- 위험: `typeof null`의 이유를 확인하지 않은 역사 이야기로 단정하거나, 선언하지 않은 식별자와 TDZ(미학습)를 섞어 쓰는 것 → 명세의 typeof 평가 단계만 근거로 쓰고 TDZ는 단순화로 제외한다.
- 복잡도: 낮음~중간 · Consensus: 생략 (2번 `number-type`과 같은 "표 데이터 + 테스트 대조, 시뮬레이터 없음" 패턴. 사실은 명세 원문과 vm 실행으로 미리 확인했다)
- 미확정: 없음

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 3번. 『모던 자바스크립트 Deep Dive』 6·7장(데이터 타입, `typeof` 연산자) 범위, 사용자 진도 1~12장.
- 다룰 내용: ① `typeof`의 결과는 문자열이고 원시 타입마다 정해진 이름(`'undefined'`·`'boolean'`·`'number'`·`'string'`·`'symbol'`·`'bigint'`) ② `null`은 `'object'`(명세 표) → `null` 확인은 `=== null` ③ 함수는 `'function'`, 그 밖의 객체는 `'object'` ④ 선언하지 않은 식별자에 `typeof`를 쓰면 `ReferenceError` 없이 `'undefined'` ⑤ `typeof`는 단항 연산자라 `typeof 1 + 2`는 `'number2'`.
- 시각화는 로드맵 결정대로 표 + 퀴즈(시뮬레이터 없음).
- content-guide 절차, 개념 폴더만 추가(테스트 확장 제외).

### 유지해야 하는 기존 동작
- 기존 다섯 개념의 페이지·테스트는 그대로 통과하고 수정하지 않는다.
- e2e `객체` 검색 1건(`tests/e2e/navigation.spec.ts:17`) → 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙, `loader` 없음.
- 이 저장소의 커밋 규칙: 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`(`AGENTS.md:24`), 작성자 `sk <ygvbhy@naver.com>`(로컬 git 설정).

### 제외 범위
- TDZ(`let`·`const` 선언 전 `typeof`는 `ReferenceError`, 15장)·실행 컨텍스트. 예제의 `let declared`는 선언 뒤에만 `typeof`한다.
- 배열(27장, `typeof []`는 `'object'`), 래퍼 객체(`new String`), 클래스, 화살표 함수(26장), `instanceof`·`Array.isArray`·`Object.prototype.toString` 같은 다른 타입 확인 방법.
- `typeof null`이 `'object'`가 된 역사적 배경(명세가 정하지 않는 내용) → 명세 표가 그렇게 정한다는 사실만 쓰고, 배경은 MDN 참고 링크로만 둔다.
- 브라우저 `document.all`(`[[IsHTMLDDA]]`)의 `'undefined'` 예외 → 단순화에만 적는다.
- 기존 개념 `related` 역방향 연결(9절 후보).

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차·공통 테스트는 앞 개념과 같다. 직전 선례 `app/concepts/number-type/`(시뮬레이터 없음, `stored-values.ts` 표 데이터 + `concept.test.ts` vm 대조, e2e 페이지 단위 axe·가로 스크롤, 빌드 프리렌더 블록).
- 명세(tc39.es/ecma262, 2026-10-27 확인) `typeof` Runtime Semantics: Evaluation(`#sec-typeof-operator-runtime-semantics-evaluation`):
  1. 피연산자를 평가한 값이 Reference Record이고 IsUnresolvableReference이면 `"undefined"`를 돌려준다(선언하지 않은 식별자에서 GetValue를 하지 않으므로 ReferenceError가 나지 않는다).
  2. 그 밖에는 GetValue 후: undefined → `"undefined"`, null → `"object"`, String → `"string"`, Symbol → `"symbol"`, Boolean → `"boolean"`, Number → `"number"`, BigInt → `"bigint"`, (Normative Optional) `[[IsHTMLDDA]]` → `"undefined"`, `[[Call]]`이 있으면 `"function"`, 나머지 Object → `"object"`.
  - 앵커 존재 확인: `sec-typeof-operator`, `sec-typeof-operator-runtime-semantics-evaluation`, `sec-unary-operators`, `sec-ecmascript-language-types`, `sec-isunresolvablereference`, `sec-function-definitions`, `sec-ecmascript-function-objects`.
- MDN(ko) 200 확인: `Reference/Operators/typeof`, `Data_structures`, `Glossary/Primitive`, `Reference/Global_Objects/Symbol`, `Reference/Global_Objects/BigInt`, `Reference/Errors/Not_defined`, `Reference/Operators/Operator_precedence`.
- 예제 초안 실제 출력(Node 24.22.1 `vm`, 8절 1단계 원문 그대로):

  | 예제 | 출력 |
  | - | - |
  | `typeof-primitives.js` | `undefined boolean number string` / `symbol bigint` |
  | `typeof-null.js` | `object object` / `true false` |
  | `typeof-function.js` | `function function number` |
  | `typeof-undeclared.js` | `undefined` / `undefined` |
  | `typeof-result.js` | `string` / `number2 number` |

- `typeof (값)` 표 실행 결과(vm): `undefined`→`undefined`, `null`→`object`, `true`→`boolean`, `42`→`number`, `NaN`→`number`, `'hi'`→`string`, `Symbol('id')`→`symbol`, `10n`→`bigint`, `{ x: 1 }`→`object`, `function () {}`→`function`.
- 본문 서술 근거(vm): 선언하지 않은 식별자를 그냥 참조하면(`notDeclared`) `ReferenceError`.
- 홈 정렬(`localeCompare(…, 'ko')`): 한글 제목 다섯 개 뒤에 `typeof…`가 온다(마지막 카드, 실행 확인).
- summary 초안 121자, `객체` 없음(실행 확인).

### 추정
- 없음. (`Symbol`은 6장, BigInt는 type-coercion·number-type 페이지가 이미 한 줄 소개했으므로 표에서 이름과 결과만 보여 준다.)

## 3. 구현 전략
- `number-type`과 같은 패턴: `typeof-table.ts`(순수 데이터)를 `content.mdx`가 표로 그리고, `concept.test.ts`가 각 행의 소스를 vm에서 `typeof (소스)`로 실행해 표의 결과 문자열과 대조한다. 표 열은 "값(소스)", "명세의 타입", "`typeof` 결과".
- 이 개념의 핵심은 "명세의 타입 이름"과 "`typeof` 결과 문자열"이 대부분 같고 두 곳(null, 함수)만 다르다는 대비라 표가 맞다. 시뮬레이터는 만들지 않는다(로드맵 결정).
- 선언하지 않은 식별자는 명세의 IsUnresolvableReference 단계로 설명하되, "Reference Record"라는 용어는 쓰지 않고 "이름을 찾지 못하면 값을 꺼내지 않고 `'undefined'`를 돌려준다"로 풀어 쓴다(단순화에 명세 용어 공개).
- 버린 대안: ① `typeof null`의 역사적 배경 설명 — 명세가 정하지 않는 내용이라 사실처럼 쓰지 않는다. ② 배열·클래스 예제 — 미학습.

## 4. 변경 파일
- 추가 `app/concepts/typeof-operator/`: `meta.ts`, `content.mdx`, `route.tsx`, `typeof-table.ts`, `concept.test.ts`, `examples/` 5개(`typeof-primitives.js`, `typeof-null.js`, `typeof-function.js`, `typeof-undeclared.js`, `typeof-result.js`)
- 수정(추가만): `tests/e2e/helpers.ts`(`TYPEOF_PATH`), `tests/e2e/a11y.spec.ts`(페이지 axe), `tests/e2e/responsive.spec.ts`(가로 스크롤), `tests/build/build-output.test.ts`(프리렌더 블록: `<details>` 수, 표의 `function` 행), `docs/content-guide.md` 9단계 목록 문구, 로드맵 문서 상태
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, 기존 다섯 개념 폴더, `package.json`, `AGENTS.md`

## 5. 위험 요소
- "함수는 객체가 아니다"로 읽히는 서술 → "함수도 객체이며, 호출할 수 있는 객체에만 `typeof`가 `'function'`을 돌려준다"로 쓴다(명세 `[[Call]]` 단계, 2단계 주의사항).
- 선언하지 않은 식별자 설명이 `let` 선언 전 참조(TDZ)까지 일반화됨 → 본문에서 "선언하지 않은 식별자"로만 한정하고, 단순화에 "선언은 있지만 그 줄보다 앞에서 `typeof`하는 경우는 별도 개념"이라고 적는다. 예제는 선언 뒤에만 `typeof`한다.
- `typeof 1 + 2` 설명에서 우선순위를 잘못 말함 → "단항 연산자인 `typeof`가 `+`보다 먼저 피연산자 하나에 적용된다"(실행 결과 `number2`, 근거 테스트).
- `객체` 검색 1건 → meta 세 필드 검사(1단계).
- 홈 카드 순서 변화(새 개념이 마지막) → 정렬 규칙대로의 결과.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 5개 실제 출력 = `expectedOutput`, 표 대조(10행), 본문 주장 검증(`ReferenceError`, `typeof 1 + 2`), 음성 확인(표의 `null` 행 결과를 `'null'`로 바꾸면 실패).
- 브라우저(빌드 결과 서빙 + Playwright): 375px 라이트·1280px 다크에서 표 10행, 퀴즈 5개 라디오 UI, "검토 중" 배지, 가로 넘침 0, 콘솔 에러 0. 홈 카드 6개(새 개념 마지막), `객체` 검색 1건, `typeof` 검색에 새 개념 포함.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제·meta·표 데이터·본문 주장 검증
- 대상: `examples/*.js` 5개, `meta.ts`, `typeof-table.ts`, `concept.test.ts`, `route.tsx`, h2 3개 골격 `content.mdx`
- 현재: 폴더 없음
- 변경:
  - 예제 원문(파일 끝 줄바꿈 1개):

    `typeof-primitives.js`
    ```js
    console.log(typeof undefined, typeof true, typeof 42, typeof 'hi');
    console.log(typeof Symbol('id'), typeof 10n);
    ```
    `typeof-null.js`
    ```js
    const empty = null;
    const point = { x: 1 };
    console.log(typeof empty, typeof point);
    console.log(empty === null, point === null);
    ```
    `typeof-function.js`
    ```js
    function add(a, b) {
      return a + b;
    }
    const sub = function (a, b) {
      return a - b;
    };
    console.log(typeof add, typeof sub, typeof add(1, 2));
    ```
    `typeof-undeclared.js`
    ```js
    console.log(typeof notDeclared);
    let declared;
    console.log(typeof declared);
    ```
    `typeof-result.js`
    ```js
    console.log(typeof typeof 42);
    console.log(typeof 1 + 2, typeof (1 + 2));
    ```
  - `typeof-table.ts`: `export const typeofTable: { source: string; specType: string; result: string }[]` — 10행: `undefined`/Undefined/`undefined`, `null`/Null/`object`, `true`/Boolean/`boolean`, `42`/Number/`number`, `NaN`/Number/`number`, `'hi'`/String/`string`, `Symbol('id')`/Symbol/`symbol`, `10n`/BigInt/`bigint`, `{ x: 1 }`/Object/`object`, `function () {}`/Object(호출 가능)/`function`. import 없음.
  - `meta.ts`:
    - `slug: 'typeof-operator'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: ['number-type', 'primitives-and-objects', 'equality-operators']`
    - `title: 'typeof 연산자: 값의 타입을 어떤 문자열로 알려 주나'`
    - `summary`(121자): `typeof는 값의 타입을 문자열로 돌려줍니다. 대부분 명세의 타입 이름과 같지만 null은 'object', 함수는 'function'이 되고, 선언하지 않은 식별자에는 오류 대신 'undefined'를 돌려줍니다.`
    - `tags`(`객체` 금지): `typeof`, `타입 확인`, `데이터 타입`, `원시 타입`, `typeof null`, `function`, `undefined`, `선언하지 않은 식별자`, `ReferenceError`, `연산자 우선순위`, `Symbol`, `BigInt`
    - `goals`: ① `typeof`가 각 원시 값에 돌려주는 문자열을 예측할 수 있다 ② `typeof null`이 `'object'`라는 것과 `null`을 `=== null`로 확인해야 하는 이유를 설명할 수 있다 ③ 함수에는 `'function'`, 그 밖의 객체에는 `'object'`가 나오는 기준을 설명할 수 있다 ④ 선언하지 않은 식별자에 `typeof`를 써도 오류가 나지 않는 이유를 설명할 수 있다 ⑤ `typeof`가 단항 연산자라서 `typeof 1 + 2`의 결과가 `'number2'`인 것을 설명할 수 있다
    - `prerequisites`: `{ label: '데이터 타입' }`, `{ label: '원시 값과 객체', slug: 'primitives-and-objects' }`, `{ label: '숫자 타입', slug: 'number-type' }`, `{ label: '함수 선언과 함수 표현식' }`
    - `examples`: 5개, `expectedOutput: []`로 시작해 2절 표와 대조 후 채운다.
    - `simplifications`:
      1. 명세는 `typeof`의 피연산자가 이름을 찾지 못한 참조(Reference Record의 IsUnresolvableReference)일 때 값을 꺼내지 않고 `"undefined"`를 돌려준다. 이 페이지는 이를 "선언하지 않은 식별자"로 줄여 말한다.
      2. 선언은 있지만 그 선언보다 앞에서 `let`·`const` 변수에 `typeof`를 쓰면 `ReferenceError`가 난다. 이 동작(TDZ)은 별도 개념에서 다루며, 이 페이지의 예제는 선언 뒤에만 `typeof`를 쓴다.
      3. 함수가 `'function'`인 기준은 명세의 `[[Call]]` 내부 메서드(호출할 수 있는지)다. 이 페이지는 함수 선언과 함수 표현식만 예로 들며, 화살표 함수·클래스·메서드는 다루지 않는다.
      4. `typeof null`이 `'object'`인 것은 명세의 `typeof` 결과 규칙이 그렇게 정하기 때문이다. 그렇게 정해진 역사적 배경은 다루지 않는다(MDN 참고).
      5. 배열·래퍼 객체 등 다른 객체의 `typeof` 결과와 `instanceof` 같은 다른 타입 확인 방법은 다루지 않는다.
      6. 브라우저 호스트의 `document.all`(명세 부록 B `[[IsHTMLDDA]]`)은 `typeof`가 `'undefined'`를 돌려주는 예외인데 다루지 않는다.
      7. `console.log`는 호스트 API이며 문자열을 따옴표 없이 출력한다. 예제 출력의 `object`, `number2` 등은 모두 문자열이다.
    - `references`: 명세 The typeof Operator(`#sec-typeof-operator`), typeof: Runtime Semantics: Evaluation, IsUnresolvableReference, ECMAScript Language Types, ECMAScript Function Objects / MDN(ko) typeof, JavaScript의 타입과 자료구조, 원시 값(Glossary/Primitive), ReferenceError: "x" is not defined(Errors/Not_defined), 연산자 우선순위, Symbol, BigInt.
  - `concept.test.ts`:
    - 표: 10행, `source` 중복 없음, 각 행 vm `typeof (${source})` = `result`.
    - 본문 서술 근거: `notDeclared`만 평가하면 `ReferenceError`(e.name 비교, `errorNameOf` 패턴), `typeof 1 + 2` → `'number2'`, `typeof (1 + 2)` → `'number'`, `typeof typeof 42` → `'string'`, `typeof null === 'object'`, `null === null`.
- 이유: 페이지 사실 근거를 먼저 고정한다.
- 주의사항: `meta.ts`·`typeof-table.ts`는 순수 데이터. `typeof-function.js`는 여러 줄이지만 예제 폴더는 포맷 대상이 아니므로 원문 그대로 둔다.
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/typeof-operator` 통과, 실제 출력 = 2절 표, `객체` 없음(`node -e`). 음성 확인: 표의 `null` 행 `result`를 `'null'`로 바꾸면 실패하고, 되돌리면 통과.

### 2. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `typeofTable` import)
- 변경:
  - `## 동작 원리`
    - `typeof`는 피연산자 하나를 받는 단항 연산자이고, 결과는 항상 문자열이다.
    - 결과 표(JSX `<table>`, `typeofTable.map`, 열: 값 / 명세의 타입 / `typeof` 결과). 대부분 타입 이름과 같고, 다른 곳은 두 군데: `null` → `'object'`, 함수 → `'function'`.
    - `null` 확인은 `=== null`(`typeof`로는 객체와 구별 못 함). 이유는 "명세의 결과 규칙이 그렇게 정한다"로만 쓴다.
    - 함수도 객체이지만 호출할 수 있어서 `'function'`이 나온다. `typeof add(1, 2)`는 호출 결과(숫자)의 타입이다.
    - 선언하지 않은 식별자: 그냥 참조하면 `ReferenceError`지만, `typeof` 뒤에서는 이름을 찾지 못하면 값을 꺼내지 않고 `'undefined'`를 돌려준다. 선언했지만 값을 넣지 않은 변수도 값이 `undefined`라 `'undefined'` — 결과만으로는 둘을 구별할 수 없다.
    - 우선순위: 단항 연산자 `typeof`가 `+`보다 먼저 적용 → `typeof 1 + 2`는 `'number' + 2` → `'number2'`(문자열 연결은 [암묵적 타입 변환](/concepts/type-coercion) 링크). 괄호로 묶으면 `typeof (1 + 2)`.
  - `## 예제`: 예제 5개 `file=` 펜스 + 각각 `PredictQuiz`(3~4개 선택지, 정답은 실제 출력, 여러 줄은 ' / ' 안내).
  - `## 결과와 이유`: JSX `<table>`(식 / 결과 / 이유) + 예제별 이유 문단(문장형, "예제 N의 …"로 시작 — 기존 개념과 같은 형식) + `Callout type="misconception"` 4개: ① "`typeof null`은 `'null'`이다" ② "함수는 객체가 아니라서 `'function'`이 나온다" ③ "선언하지 않은 변수에 `typeof`를 쓰면 오류가 난다" ④ "`typeof 1 + 2`는 `'number'`다".
- 주의사항: TDZ·실행 컨텍스트·배열·클래스·화살표 함수를 설명하지 않는다. "Reference Record" 같은 명세 내부 용어는 본문에 쓰지 않는다(단순화에만). 같은 대상은 같은 이름("선언하지 않은 식별자"). CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/typeof-operator/index.html`에 `<details` 5개, 표의 `function` 결과 셀 존재, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 태그 제거 텍스트의 굵게 미처리 `**` 0건.

### 3. e2e·빌드 테스트, 문서, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, 로드맵 문서
- 변경: `number-type` 케이스를 본떠 추가(페이지 axe 라이트·다크, 가로 스크롤). 빌드 블록 `프리렌더 (typeof-operator)`: `<details` 5개 이상, 표 텍스트에 `function () {}` 존재. content-guide 9단계 목록에 `typeof-operator` 추가. 기존 케이스 수정 없음.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 확인, 스크린샷 1장 이상.

## 9. 추가 개선 후보
- 기존 개념 `related`에 `typeof-operator` 역방향 연결(`number-type`의 `typeof NaN`, `type-coercion`의 `typeof n`).
- 로드맵 8번(호이스팅)에서 이 페이지의 "선언하지 않은 식별자"와 TDZ를 대비하는 연결.

## 구현 진행

- baseline (2026-10-27, `8cf8e95`): lint·format:check·typecheck 오류 0, `npm test` 608 통과(재실행). `test:build` 36·e2e 97 통과·3 건너뜀은 코드가 같은 `ea6e0b5`(이후 AGENTS.md 한 줄만 변경)에서 실행한 결과
- [x] 1. 예제·meta·표 데이터·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 106 통과. 예제 5개가 계획 단계 실행본과 바이트 동일(`cmp`), 실제 출력 = 2절 표, 표 10행 = 2절 실행 결과. 음성 확인(`null` 행 → `'null'`로 1건 실패)은 서브에이전트 보고
- 3단계 중 테스트·문서 추가분은 1단계와 병렬로 먼저 작성. diff는 추가만(content-guide 목록 1줄 수정). 실행 검증은 본문 작성 후 3단계에서
- [x] 2. 본문 content.mdx — 메인 검토 수정 2곳: "typeof는 그 타입에 대응하는 소문자 문자열을 돌려준다"(바로 뒤 null 예외와 모순되는 일반화) → "그 타입에 따라 정해진 문자열", Callout의 "비교하세요"(권고) → "비교합니다". 나머지 서술(null은 명세 규칙만, 함수도 객체·[[Call]], 선언하지 않은 식별자, 우선순위)은 2절 근거와 일치. 빌드 HTML: `<details` 5, 공백 깨진 code 0, `**` 0, `</code>` 뒤 공백+조사 0
- [x] 3. e2e·빌드 테스트, 문서, 브라우저 확인 — 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 639, `test:build` 40, e2e 103 통과·3 건너뜀(기존 3건), axe 위반 0. 브라우저(빌드 결과 `serve` + Playwright): 375px 라이트·1280px 다크 표 10행, 퀴즈 5개, "검토 중" 배지, 페이지 가로 넘침 0, 콘솔 에러 0. 홈 카드 6개(새 개념 마지막), `객체` 1건, `typeof` 1건. 375px에서 표 코드 값이 단어 중간에서 끊기는 것을 보고 두 가지를 시도했다: `whitespace-nowrap`(결과 열이 표 스크롤 뒤로 56px 숨음), `[overflow-wrap:normal]!`(375px에서 38px 숨음). 둘 다 핵심 열이 가려져 더 나빠서 되돌리고(사이트 공통 `overflow-wrap: anywhere` 유지) 리뷰 Low로 남긴다. 되돌린 뒤 `test:build` 40 재통과
- 리뷰 1차 (critical-code-review: 메인 직접 — 개념 폴더 1개 + 테스트 추가, 본문 정확성은 2단계에서 명세 대조): Critical/High 0. Low 1(보고만): 375px에서 표의 코드 값(`'undefined'`, `'function'` 등)이 단어 중간에서 줄바꿈됨. `number-type` 표도 같은 공통 규칙을 쓰므로, 고치려면 개념 표 공통 스타일(좁은 화면 글자 크기·여백)을 정하는 별도 작업이 맞다

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 3단계 테스트·문서 추가를 1단계와 병렬로 먼저 작성 ② 브라우저 확인은 빌드 결과(`serve`) + Playwright ③ 메인 검토에서 본문 문장 2곳 수정(구현 진행 2) ④ 표 줄바꿈 개선을 두 가지 시도했으나 결과 열이 가려져 되돌림(구현 진행 3).
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. Low 1건(375px 표 코드 값의 단어 중간 줄바꿈)은 개념 표 공통 스타일 문제로 보고만 했다.

### 후속 작업
- [x] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록 — 2026-10-27 사용자 승인, `'2026-10-27'`
- [x] 개념 표 공통 스타일 정리 여부 결정 — 사용자 결정(2026-10-27): 표 줄바꿈은 그대로 둔다
- [ ] 9절 추가 개선 후보(역방향 `related`, 8번 호이스팅에서 TDZ 대비)
- [ ] 로드맵 4번 "증감 연산자와 부수 효과" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] "`typeof`는 타입에 대응하는 소문자 문자열을 돌려준다"를 "타입에 따라 정해진 문자열"로 고쳤다 — 명세 결과 규칙에서 Null은 `"object"`, 호출 가능한 Object는 `"function"`이라 "대응하는 소문자 이름"이 성립하지 않는다.
- [Claude 판단] 375px 표의 단어 중간 줄바꿈을 이 표에서만 고치지 않고 되돌렸다 — `whitespace-nowrap`·`overflow-wrap: normal` 모두 결과 열이 표 스크롤 뒤로 숨었고, 표 하나만 글자 크기를 줄이면 다른 개념 표와 스타일이 어긋난다.
- [무검토 승인] `typeof null`의 이유를 명세 규칙으로만 설명하고 역사적 배경은 쓰지 않았다 — 명세가 정하지 않는 내용을 사실처럼 쓰지 않는 정확성 원칙.
- [무검토 승인] 선언하지 않은 식별자만 다루고 TDZ(`let` 선언 전 `typeof`는 ReferenceError)는 단순화로 제외했다 — 15장 미학습. 예제는 선언 뒤에서만 `typeof`한다.
- [무검토 승인] 함수 설명을 "함수도 객체이고 호출할 수 있어서(`[[Call]]`) `'function'`"으로 고정했다.
- 로드맵 3번이라는 범위와 "표 + 퀴즈" 형식은 사용자가 정했다.

#### 배경지식
- 명세 `typeof` 평가: 피연산자가 이름을 찾지 못한 참조(IsUnresolvableReference)면 GetValue 없이 `"undefined"`. 그 밖에는 값의 타입별로 정해진 문자열이며 null → `"object"`, `[[Call]]`이 있는 객체 → `"function"`.
- 선언하지 않은 식별자를 `typeof` 없이 읽으면 GetValue가 ReferenceError를 던진다.
- `typeof`는 단항 연산자로 `+`보다 먼저 피연산자 하나에 적용된다.

#### 확인 질문
1. 선언하지 않은 식별자를 그냥 쓰면 ReferenceError인데 `typeof` 뒤에서는 `'undefined'`인 이유는?
   <details><summary>답</summary>명세의 `typeof` 평가는 피연산자가 이름을 찾지 못한 참조이면 값을 꺼내는 단계(GetValue)를 거치지 않고 바로 `"undefined"`를 돌려준다. 오류는 값을 꺼낼 때 나므로 `typeof` 뒤에서는 나지 않는다(계획 2절, `concept.test.ts`).</details>
2. `typeof x === 'undefined'`가 true일 때 알 수 있는 것과 알 수 없는 것은?
   <details><summary>답</summary>x가 선언되지 않았거나, 선언됐지만 값이 `undefined`라는 것까지는 알 수 있다. 둘 중 어느 쪽인지는 결과만으로 구별할 수 없다(예제 4).</details>
3. "함수는 객체가 아니라서 `'function'`이 나온다"가 틀린 이유는?
   <details><summary>답</summary>함수도 객체다. 명세는 객체 중 `[[Call]]` 내부 메서드가 있는(호출할 수 있는) 것에 `"function"`, 나머지에 `"object"`를 돌려준다. `'function'`은 명세의 타입 이름이 아니다(단순화 3).</details>
4. 표의 단어 중간 줄바꿈을 이 페이지에서만 고치지 않은 이유는?
   <details><summary>답</summary>줄바꿈을 막거나 단어 단위로만 끊으면 375px에서 결과 열이 표 스크롤 뒤로 숨어 핵심 정보가 가려졌다. 글자 크기·여백을 이 표만 줄이면 다른 개념 표와 달라지므로 공통 스타일 작업으로 미뤘다(구현 진행 3).</details>
