# 식 → 결과 표 실행 대조 구현 계획

- 상태: 완료
- 작성일: 2026-11-12
- 기준: `main` @ `05b6f34`

## 0. 요약

- 목적: 손으로 쓴 식 → 결과 표 5개(칸 62개)를 각 개념의 `concept.test.ts`에서 실제로 평가해 대조한다. 지금은 `result-tables.test.ts`도 예제 실행도 이 칸들을 검사하지 않는다.
- 범위: `tests/helpers/`에 작은 helper 1개를 추가하고, 개념 5개의 `concept.test.ts`와 문서 2개(content-guide, AGENTS.md)를 고친다. `content.mdx`·예제·앱 코드는 바꾸지 않는다.
- 위험: 테스트가 표와 다른 식을 평가해 통과하는 경우. 그래서 표의 식 칸 원문을 그대로 평가하고, 식이 아닌 행만 행마다 대체 코드를 둔다. 표의 행과 검사 목록이 어긋나면 실패하게 한다.
- 복잡도: 중간 · Consensus: 생략. 테스트와 문서만 바뀌고, 기존 `concept.test.ts`의 vm 평가 패턴을 그대로 쓰며, 프로토타입에서 62칸이 모두 일치했다.
- 미확정: 없음

## 1. 요구사항

- 식 → 결과 표 5개의 결과 칸을 식 평가 결과와 대조해, 칸이 실제 동작과 다르면 `npm test`가 실패하게 한다.
  - 대상 표: equality-operators:218, number-type:142, typeof-operator:159, type-coercion:219, increment-decrement:123
- 유지해야 하는 기존 동작:
  - 다섯 페이지의 렌더링 결과(프리렌더 HTML)
  - 기존 `concept.test.ts` 검사 전부
  - `tests/result-tables.test.ts`의 결과(이 표들은 예제 행 형식이 아니라서 지금처럼 그 테스트의 검사 대상이 아니다)
- 제외 범위:
  - 표의 "적용된 규칙"·"이유" 같은 설명 칸(실행 결과가 아니다)
  - 기존 `본문 서술의 근거` 목록에서 표와 겹치는 항목 정리(예: number-type의 `0.1 + 0.2 === 0.3`). 고장 난 것이 아니므로 그대로 둔다.
  - 형식을 어긴 예제 행 표를 잡는 검사(이전 작업의 별도 후속 후보)

## 2. 사실과 추정

### 사실 (코드에서 확인)

- 다섯 표는 모두 손으로 쓴 JSX `<table>`이다. `{xxx.map(` 식이 없어서 `extractTables`(`tests/helpers/result-tables.ts:65`)가 읽는다.
- 표의 머리 행(`normalizeCell`을 거친 값)과 크기:
  - equality-operators:218 `식 | 적용된 규칙 | 결과`, 14행
  - number-type:142 `식 | 결과 | 이유`, 10행
  - typeof-operator:159 `식 | 결과 | 이유`, 11행
  - type-coercion:219 `연산 | 피연산자를 바꾸는 타입 | 예 | 결과`, 9행
  - increment-decrement:123 `식 | 변수에 남는 값 | 식의 값`, 9행
  - 같은 개념 안에서 머리 행이 같은 손으로 쓴 표는 각각 하나뿐이다(프로토타입에서 확인).
- 표의 식이 쓰는 이름은 같은 페이지 예제 파일이 정의한다.
  - equality: `p`, `q` → `examples/objects.js`
  - typeof: `add` → `typeof-function.js`, `empty` → `typeof-null.js`, `declared` → `typeof-undeclared.js`
  - type-coercion: `point` → `object.js`, `n` → `to-string.js`, `count`·`text` → `to-boolean.js`
  - 함께 실행할 예제끼리는 최상위 선언 이름이 겹치지 않는다.
- increment-decrement 표의 식 칸은 문장(`const b = a++`, `n++; ++n; n--;`)이다. 초깃값은 예제 파일에 있다(`postfix-prefix.js` a=1·c=1, `statement.js` n=5, `assignment-value.js` m=10, `string-operand.js` s='5', `self-assign.js` x=1, `operand-order.js` i=1). `p = 3`과 `p = q = 7`은 `assignment-value.js`의 한 파일 안에서 차례로 일어나서, 파일 끝의 값으로는 앞 행(p는 3)을 확인할 수 없다.
- 식으로 바로 평가할 수 없는 칸:
  - equality `value == null` → `true, true, false`: undefined·null·0 세 값의 결과다.
  - type-coercion `'10' - '4' + 2의 마지막 +`: 식은 `'10' - '4' + 2`다.
  - type-coercion `'0' ? … : …, !count` → `참으로 판단, true`: 첫 결과는 `to-boolean.js`의 삼항식 문자열이다.
  - increment-decrement의 `(옛 값)`·`(숫자)`·`쓰지 않음` 같은 덧붙인 말
- 결과 칸의 표기:
  - equality·number-type은 `String(v)`
  - typeof는 문자열이면 `'v'`, 아니면 `String(v)`(`empty === null` → `true`)
  - type-coercion은 문자열이면 `JSON.stringify(v)`(`"345"`), 아니면 `String(v)`. 여러 식은 `, `로 잇는다.
- 기존 `concept.test.ts`는 `node:vm`의 `runInNewContext`로 식을 평가하고(`app/concepts/typeof-operator/concept.test.ts:25`), `../../../tests/helpers/*`를 import한다(`app/concepts/equality-operators/concept.test.ts:5-6`).
- vitest node 프로젝트는 `app/**/*.test.ts`와 `tests/*.test.ts`를 잡는다(`vitest.config.ts:17`).
- 프로토타입(임시 스크립트, 실행 후 삭제): 아래 전략대로 62칸(행 44 + increment 두 칸 × 9행)을 대조해 모두 일치했다. increment 표의 행 키와 검사 목록도 같았다.

### 추정

- 없음

## 3. 구현 전략

- 표를 데이터로 옮기지 않고, 테스트가 `content.mdx`의 표를 직접 읽어 대조한다.
  - 각 `concept.test.ts`가 helper로 머리 행이 정확히 같은 표 하나를 찾는다. 0개나 2개 이상이면 throw해서 머리 행을 바꾸면 테스트가 크게 실패한다.
  - 식 칸 원문을 vm에서 평가하고, 개념별 표기 함수로 문자열을 만들어 결과 칸과 `toBe`로 비교한다.
- 준비 코드는 손으로 다시 쓰지 않는다. 같은 페이지 예제 파일을 한 vm 컨텍스트에서 차례로 실행해 만든다(`console.log`는 아무것도 하지 않는 함수로 둔다). 그래서 표의 `p`·`empty`·`point`가 페이지 예제의 값과 항상 같다.
- 식이 아닌 칸만 행 키(식 칸 원문) → 대체 코드 표로 다룬다.
  - 대체 코드 키가 표에 없으면 실패한다(오래된 대체 코드를 남기지 않게).
  - increment-decrement는 모든 행이 대체 코드다. 표의 행 키 집합과 검사 목록 키 집합이 같아야 한다. 각 코드는 초깃값을 예제와 같게 두고, 칸 문자열을 템플릿으로 만든다. 값과 타입(`(숫자)`)은 평가해서 넣고, 계산할 수 없는 덧붙인 말(`(옛 값)`, `쓰지 않음`)만 그대로 적는다.
- 버린 대안:
  - 표를 데이터 파일로 옮기기(`typeof-table.ts` 방식, 이전 계획의 후속 메모): 페이지 5개의 표 마크업과 프리렌더 HTML이 바뀐다. "이유" 칸의 인라인 `<code>`를 데이터로 옮기려면 JSX나 마크업 문자열이 필요하다. 지금 보이는 표를 그대로 읽는 쪽이 변경이 작고 검증 대상도 화면과 같다.
  - 준비 코드를 테스트에 손으로 다시 쓰기: 예제와 달라져도 아무도 알아채지 못한다.
  - `tests/` 아래 공통 테스트 하나에 다섯 표를 모으기: 개념별 이름·표기가 달라 결국 개념별 분기가 된다. AGENTS.md의 "개념은 폴더 단위" 원칙과도 맞지 않는다.

## 4. 변경 파일

- 추가 `tests/helpers/expression-tables.ts`:
  - `tableBody(mdx, header)`: `extractTables` 결과 중 머리 행이 `header`와 정확히 같은 표 하나의 본문 행. 0개나 2개 이상이면 throw.
  - `exampleContext(examplesDir, files)`: 새 vm 컨텍스트(`console.log`는 아무것도 하지 않음)에서 예제 파일을 차례로 실행하고 컨텍스트를 돌려준다.
- 추가 `tests/expression-tables.test.ts`: helper 단위 테스트(고정 문자열)
- 수정(검사 추가만):
  - `app/concepts/equality-operators/concept.test.ts`
  - `app/concepts/number-type/concept.test.ts`
  - `app/concepts/typeof-operator/concept.test.ts`
  - `app/concepts/type-coercion/concept.test.ts`
  - `app/concepts/increment-decrement/concept.test.ts`
- 수정 `docs/content-guide.md:147`: 표 규칙 셋째 항목에, 식과 결과를 적는 표는 그 개념의 `concept.test.ts`가 `tableBody`로 표를 읽고 식을 평가해 대조한다는 문장을 더한다.
- 수정 `AGENTS.md:45`: helpers 목록에 `expression-tables.ts`
- 변경하지 않음:
  - `content.mdx`·`examples/`·앱 코드: 이번 작업은 검사만 더한다
  - `tests/helpers/result-tables.ts`: `extractTables`를 import해서 쓰기만 한다

## 5. 위험 요소

- 표와 다른 식을 평가해 거짓 통과 → 식 칸 원문을 그대로 평가하고, 대체 코드는 표에 키가 있는 행에만 둔다. increment는 키 집합이 같은지 검사한다(작업 순서 2·3).
- 준비 예제가 컨텍스트에 남긴 값 때문에 식의 의미가 바뀜(예: `typeof notDeclared`) → 준비 예제는 표에 필요한 파일만 쓴다. `notDeclared`를 정의하는 예제가 없다는 것을 확인했다. 행을 평가해도 상태가 바뀌지 않는다(대입이 있는 increment는 행마다 새 컨텍스트).
- 머리 행이 바뀌거나 같은 머리 행의 표가 늘어나 엉뚱한 표를 읽음 → `tableBody`가 정확히 하나가 아니면 throw한다(작업 순서 1, 단위 테스트).
- 표기 함수가 너그러워 틀린 칸도 통과(예: 따옴표 무시) → 정규화는 `normalizeCell`까지만 하고, 표기 함수의 결과 문자열 전체를 `toBe`로 비교한다. 일부러 칸을 바꿔 실패하는지 확인한다(검증 방법).
- vm은 다른 realm → 배열 판별은 `Array.isArray`(realm을 넘어 동작)를 쓰고 `instanceof`는 쓰지 않는다.

## 6. 검증 방법

- 정적: `npm run lint`, `npm run format:check`, `npm run typecheck`
- 테스트: `npm test`. 새 검사 62칸과 helper 단위 테스트가 통과하고, 기존 테스트가 하나도 깨지지 않아야 한다.
- 실패 확인(확인 후 `git checkout`으로 되돌림):
  - number-type:142 `5 / 2` 행의 결과 칸을 `2`로 바꾸면 그 행만 실패한다.
  - increment-decrement:123 `x = x++` 행의 변수 칸을 `x는 2`로 바꾸면 그 행만 실패한다.
  - type-coercion 표에서 행 하나의 "예" 칸을 바꾸면, 대체 코드 키가 표에 없다는 검사가 실패한다.
- AGENTS.md 검증 순서: `npm run test:build`와 전체 `npm run e2e`도 실행한다. 앱·콘텐츠는 바뀌지 않으니 둘 다 기존 결과와 같아야 한다.
- 브라우저: 해당 없음(화면 변경 없음)

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. helper와 단위 테스트

- 대상: `tests/helpers/expression-tables.ts`, `tests/expression-tables.test.ts`
- 현재: 없음
- 변경: `tableBody(mdx: string, header: string[]): string[][]`와 `exampleContext(examplesDir: string, files: string[]): vm.Context`를 만든다(4절). 단위 테스트:
  - 머리 행이 같은 표가 하나면 본문 행을 돌려준다.
  - 0개면 throw한다.
  - 2개면 throw한다.
  - `{rows.map(` 데이터 표는 세지 않는다(`extractTables` 동작).
  - `exampleContext`가 예제를 실행한 뒤 최상위 `const`가 남아 있고 `console.log` 호출로 실패하지 않는다. 저장소의 기존 예제 `app/concepts/equality-operators/examples/objects.js`로 확인한다(`runInContext('p.n', ctx)`가 `1`).
- 이유: 다섯 테스트가 같은 방식으로 표를 찾고 준비 컨텍스트를 만들게 한다.
- 주의사항: `extractTables`는 import만 하고 고치지 않는다. 머리 행 비교는 `normalizeCell`이 만든 문자열 배열 전체가 같아야 한다.
- 완료 조건: `npx vitest run tests/expression-tables.test.ts` 통과. `npm run typecheck`와 `npm run lint`에 새 오류 없음.

### 2. 식 칸을 그대로 평가하는 표 3개

- 대상: equality-operators, number-type, typeof-operator의 `concept.test.ts`
- 현재: 표 칸을 검사하지 않는다(일부 식만 `본문 서술의 근거`에 따로 적혀 있다).
- 변경: 각 파일에 `describe('결과와 이유 표', …)`를 추가한다.
  - `readFileSync`로 같은 폴더 `content.mdx`를 읽고 `tableBody`로 표를 얻는다.
  - `it.each(rows)`로 행마다 식 칸을 평가하고 표기해 결과 칸과 `toBe`로 비교한다.
  - equality: 준비 `objects.js`, 결과는 셋째 열, 표기 `String`(배열이면 `, `로 이음). 대체 코드 `value == null` → `[undefined, null, 0].map((value) => value == null)`.
  - number-type: 준비 없음(행마다 새 컨텍스트), 결과는 둘째 열, 표기 `String`.
  - typeof: 준비 `typeof-function.js`·`typeof-null.js`·`typeof-undeclared.js`, 결과는 둘째 열, 표기는 문자열이면 `'v'`, 아니면 `String`.
  - 대체 코드 키가 모두 표에 있는지 검사하는 `it`을 둔다(equality만 해당).
  - 행 수 하한(14·10·11)을 검사해서 표를 읽지 못하면 실패하게 한다.
- 이유: 식 칸이 그대로 실행 가능한 표라서 표 원문을 평가하는 것이 가장 직접적인 대조다.
- 주의사항: 기존 `describe`·`it`은 건드리지 않는다. 테스트 이름에 식 칸을 넣는다(예: `` `%s` → 결과 칸 ``).
- 완료 조건: 세 파일의 새 검사 35개가 통과한다(14 + 10 + 11). number-type `5 / 2` 행 결과를 `2`로 바꾸면 그 행 하나만 실패하고, 되돌리면 통과한다.

### 3. 대체 코드가 필요한 표 2개

- 대상: type-coercion, increment-decrement의 `concept.test.ts`
- 현재: 표 칸을 검사하지 않는다.
- 변경:
  - type-coercion:
    - 준비 `object.js`·`to-string.js`·`to-boolean.js`. 키는 셋째 열("예"), 결과는 넷째 열.
    - "예" 칸을 `, `로 나눠 식마다 평가하고, 문자열이면 `JSON.stringify`, 아니면 `String`으로 표기해 `, `로 잇는다.
    - 대체 코드는 두 가지다.
      - `'10' - '4' + 2의 마지막 +` → 식 `'10' - '4' + 2`
      - `'0' ? … : …, !count` → 칸 문자열 전체 `[text ? '참으로 판단' : '거짓으로 판단', String(!count)].join(', ')`
    - 대체 코드 키가 모두 표에 있는지 검사한다.
  - increment-decrement:
    - 행 키 → 코드 표를 둔다. 코드는 행마다 새 컨텍스트에서 평가하고, `[변수 칸, 식의 값 칸]`을 돌려준다.
    - 초깃값은 예제와 같게 둔다(2절 사실). 덧붙인 말 중 타입(`(숫자)`)은 `typeof`로 계산한다.
    - 표의 행 키 집합과 코드 표 키 집합이 같아야 한다.
- 이유: 이 두 표는 칸에 식 아닌 말이 섞여 있다. 식 부분은 평가하고, 말은 행마다 명시해야 거짓 통과 없이 대조할 수 있다.
- 주의사항:
  - increment-decrement의 기존 `소스 대조(vm)` 등 시나리오 검사는 건드리지 않는다.
  - `Script`·`runInNewContext` import가 이미 있으니 중복 import를 만들지 않는다.
- 완료 조건: 새 검사 27칸이 통과한다(type-coercion 9 + increment 9행 × 2칸). 실패 확인 두 가지(6절의 increment `x는 2`, type-coercion "예" 칸 변경)가 각각 해당 검사만 실패시키고, 되돌리면 통과한다.

### 4. 문서

- 대상: `docs/content-guide.md:147`, `AGENTS.md:45`
- 변경:
  - content-guide 표 규칙 셋째 항목 끝에 이 문장을 더한다. "식과 결과를 적는 표는 그 개념의 `concept.test.ts`가 `tableBody`(`tests/helpers/expression-tables.ts`)로 표를 읽고 같은 페이지 예제를 준비 코드로 실행한 뒤 식을 평가해 대조합니다(예: `typeof-operator`)."
  - AGENTS.md helpers 목록에 `expression-tables.ts`를 더한다.
- 완료 조건: `npm run format:check` 통과. 문서의 함수 이름·경로가 코드와 같다.

## 9. 추가 개선 후보

- 표와 겹치는 `본문 서술의 근거` 항목 정리(number-type `0.1 + 0.2 === 0.3`, `(1 + 2) / 10 === 0.3`, `NaN + 1`, typeof `typeof typeof 42` 등). 검사가 두 번 될 뿐 틀리지 않는다.
- 예제 행으로 쓰려던 표가 첫 칸 형식을 어겨 조용히 빠지는 경우를 잡는 검사(이전 계획 `result-table-verification.md` 후속)

## 구현 진행

- baseline (2026-11-12, `05b6f34`): lint·format:check·typecheck 통과 / `npm test` 153개 파일, 4756개 테스트 통과
- [x] 1. helper와 단위 테스트 — 단위 6개 통과(계획 5 + 칸 수 다른 머리 행 1), lint·typecheck 새 실패 없음
- [x] 2. 식 칸을 그대로 평가하는 표 3개 — 결과 칸 35개(14+10+11)와 행 수·대체 코드 키 검사 통과. number-type `5 / 2` 결과를 `2`로 바꾸면 그 행만 실패, 되돌림. typeof의 `join(import.meta.dirname)`을 `import.meta.dirname`으로 직접 정리
- [x] 3. 대체 코드가 필요한 표 2개 — type-coercion 9칸 + increment 18칸(9행 × 2) 통과. increment `x는 2`면 그 행만, type-coercion "예" 칸 변경이면 대체 코드 키 검사와 그 행이 실패, 되돌림
- [x] 4. 문서 — content-guide 표 규칙 셋째 항목, AGENTS.md helpers 목록. format:check 통과
- 리뷰 1차: Critical·High·Medium 없음. Low 2건(보고만):
  - Low: `docs/content-guide.md:147` "같은 페이지 예제를 준비 코드로 실행"은 이름을 쓰는 표(equality·typeof·type-coercion)에만 맞음. number-type은 준비가 없고 increment는 행마다 코드를 적음
  - Low: `app/concepts/type-coercion/concept.test.ts` 대체 코드가 표의 `'0'` 대신 예제 변수 `text`(값 `'0'`)를 씀. 예제의 `text`가 바뀌면 표와 어긋나도 알아채기 어렵다(지금은 같다)
- 전체 검증(2026-11-12): lint·format:check·typecheck 통과 / `npm test` 154개 파일, 4822개 테스트 통과(+66: 단위 6, 결과 칸 62 중 행 단위 it 53, 행 수·키 검사 7) / `npm run test:build` 451개 통과 / `npm run e2e` 689개 통과, 3개 skipped(원래 있던 skip)

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 완료 조건 변경과 `변경 이력`은 없다.
- 계획보다 더한 것: helper 단위 테스트 1개(머리 행의 칸 수가 다르면 같은 표로 보지 않음). 결과는 단위 6개, 행 단위 검사 53개, 행 수·키 검사 7개로 테스트 66개가 늘었고, 결과 칸 62개를 대조한다.

### 코드 리뷰

- Critical·High·Medium 없음. Low 2건(content-guide 문장이 이름을 쓰는 표 3개에만 맞음, type-coercion 대체 코드가 `'0'` 대신 예제 변수 `text`를 씀)은 보고 후 사용자 승인으로 그대로 둠.

### 후속 작업

- [x] 표와 겹치는 `본문 서술의 근거` 항목 정리(number-type `0.1 + 0.2 === 0.3` 등) — 2026-11-12 정리하지 않기로 결정(사용자). 겹치는 6개 모두 표 밖 본문 문장의 근거라서, 지우면 표 행이 바뀔 때 본문 문장이 검증 없이 남는다(`table-verification-followups.md`)
- [x] 예제 행으로 쓰려던 표가 첫 칸 형식을 어겨 조용히 빠지는 경우를 잡는 검사(`result-table-verification.md` 후속) — 2026-11-12 `table-verification-followups.md`에서 처리
- [x] Low 2건: content-guide 문장 한정, type-coercion 대체 코드를 표의 `'0'`로 — 2026-11-12 `table-verification-followups.md`에서 처리

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [무검토 승인] 표를 데이터 파일로 옮기지 않고, 테스트가 `content.mdx`의 표를 직접 읽음. 데이터 파일 방식(`typeof-table.ts`)은 페이지 5개의 표 마크업과 프리렌더 HTML이 바뀌고, "이유" 칸의 인라인 `<code>`를 데이터로 옮겨야 한다. 직접 읽으면 검사 대상이 화면에 보이는 글자와 같다.
- [무검토 승인] 준비 값(`p`, `empty`, `point` 등)을 테스트에 다시 쓰지 않고, 같은 페이지 예제 파일을 한 vm 컨텍스트에서 실행해 만든다(`exampleContext`). 손으로 다시 쓰면 예제와 달라져도 알아채지 못한다.
- [무검토 승인] 식이 아닌 칸에만 행 키 → 대체 코드를 두고, 대체 코드 키가 표에 없거나(equality, type-coercion) 키 집합이 다르면(increment) 실패하게 함. 표가 바뀌었는데 오래된 대체 코드가 남아 통과하는 것을 막는다.
- [무검토 승인] increment 표는 값과 타입(`(숫자)`)만 평가하고, `(옛 값)`·`쓰지 않음` 같은 말은 테스트에 문자열로 적음. 계산할 수 없는 말이라서다. 대가는 표와 테스트가 똑같이 틀리면 잡지 못한다는 것이다.
- [무검토 승인] `tableBody`는 머리 행이 정확히 같은 표가 하나가 아니면 throw. 머리 행을 바꾸거나 같은 머리 행 표가 늘면 엉뚱한 표를 읽지 않고 크게 실패한다.

#### 배경지식

- 같은 vm 컨텍스트에서 `runInContext`로 스크립트를 차례로 실행하면, 앞 스크립트의 최상위 `let`·`const`(전역 선언적 환경 레코드)가 뒤 스크립트에서 보인다. 그래서 예제를 먼저 실행하고 표의 식을 평가할 수 있다.
- vm 컨텍스트는 다른 realm이라 그 안에서 만든 배열은 `instanceof Array`가 false다. 배열 판별은 `Array.isArray`를 쓴다.
- `normalizeCell`은 태그를 지우고 `{'…'}` JSX 문자열을 풀어 공백을 접는다. 그래서 `<code>{"typeof Symbol('id')"}</code>`가 평가할 수 있는 식 문자열이 된다.

#### 확인 질문

1. 표를 데이터 파일로 옮겨 `{rows.map(...)}`으로 그리는 방식 대신 `content.mdx`를 직접 읽은 이유는?
   <details><summary>답</summary>데이터 파일 방식은 페이지 5개의 표 마크업·프리렌더 HTML을 바꾸고 "이유" 칸의 인라인 코드를 데이터로 옮겨야 한다. 직접 읽으면 콘텐츠는 그대로 두고, 화면에 보이는 글자를 그대로 검사한다(계획 3절 버린 대안).</details>
2. type-coercion 표의 "예" 칸 `'10' - '4' + 2의 마지막 +`를 누군가 `…의 끝 +`로 고치면 어떤 테스트가 실패하나? 왜 실패해야 하나?
   <details><summary>답</summary>"대체 코드 키가 모두 표의 예 칸에 있다" 검사와 그 행이 실패한다(행은 문장을 식으로 평가해 SyntaxError). 대체 코드가 조용히 쓰이지 않게 되는 것을 막기 위해서다(구현 진행 3단계 실패 확인, `type-coercion/concept.test.ts` `expected`).</details>
3. increment 표의 `1 (옛 값)` 칸에서 테스트가 실제로 검증하는 부분과 검증하지 못하는 부분은?
   <details><summary>답</summary>`1`은 `let a = 1; const b = a++`를 평가한 `b`라 검증한다. `(옛 값)`은 테스트에 문자열로 적혀 있어 표와 테스트가 함께 틀리면 잡지 못한다(`increment-decrement/concept.test.ts` `codeByKey`, 검수 가이드 5절 잠재 위험).</details>
4. typeof 표의 `typeof notDeclared` 행이 맞게 검증되려면 준비 예제에 어떤 조건이 필요한가?
   <details><summary>답</summary>준비로 실행하는 예제(typeof-function.js, typeof-null.js, typeof-undeclared.js) 중 어느 것도 `notDeclared`를 선언하면 안 된다. 선언하면 같은 컨텍스트라 결과가 바뀐다(계획 5절 위험 요소).</details>
5. 같은 개념 `content.mdx`에 머리 행이 `식 | 결과 | 이유`인 표가 하나 더 생기면 어떻게 되나?
   <details><summary>답</summary>`tableBody`가 "2개입니다"로 throw해서 그 개념의 테스트 파일 전체가 실패한다. 머리 행을 구별되게 바꾸거나 테스트의 머리 행 상수를 고쳐야 한다(`tests/helpers/expression-tables.ts` `tableBody`).</details>
