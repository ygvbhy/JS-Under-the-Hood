# 표 대조 후속 정리 구현 계획

- 상태: 완료
- 작성일: 2026-11-12
- 기준: `main` @ `d22fc8c`

## 0. 요약

- 목적: 두 표 대조 작업(`result-table-verification.md`, `expression-table-verification.md`)에서 남긴 후속 3건을 정리한다. 형식을 어긴 예제 출력 표가 아무 경고 없이 검사에서 빠지지 않게 하고, Low 2건을 고친다.
- 범위: `tests/helpers/result-tables.ts`에 형식 위반 판정 2가지 추가, 단위 테스트, block-scope 표 1개를 형식에 맞춤, type-coercion 테스트 대체 코드 1줄, content-guide 2문장. 앱 공통 코드·다른 개념 콘텐츠·예제는 바꾸지 않는다.
- 위험: 새 판정이 지금 정상인 표를 위반으로 잡는 경우(오탐). 판정을 좁게 정의하고, 표 29개 모두에 적용해 block-scope:40 하나만 걸리는 것을 미리 확인했다.
- 복잡도: 중간 · Consensus: 생략. 바뀌는 것은 테스트 판정 2개와 표 1개뿐이고, 모든 표에 판정을 미리 돌려 결과(걸리는 표 1개)를 확인했다.
- 미확정: 없음(사용자 결정 2건 반영: block-scope 표는 형식에 맞춤, 겹치는 근거 테스트는 그대로 둠)

## 1. 요구사항

- 예제 출력 표로 보이는데 형식을 어겨 대조되지 않는 표를 `npm test`가 형식 위반으로 실패하게 한다.
- 지금 그 판정에 걸리는 block-scope '실행 방식에 따라 달라지는 것' 표를 형식에 맞춰 클래식 스크립트 칸 3개가 자동 대조되게 한다(사용자 결정).
- Low: content-guide의 식 → 결과 표 문장을 실제 다섯 표의 방식에 맞게 한정한다.
- Low: type-coercion 표 대조의 대체 코드가 예제 변수 `text` 대신 표에 적힌 `'0'`을 평가하게 한다.
- 표와 겹치는 `본문 서술의 근거` 테스트는 지우지 않는다(사용자 결정). 이유를 기록하고 후속 항목을 닫는다.
- 유지할 동작: 지금 대조되는 칸 100개와 식 표 62칸의 검사, 기존 형식 위반 판정(예제 행과 아닌 행이 섞인 표), `{rows.map(` 데이터 표 제외, 하한 검사.
- 제외: 줄여 쓴 출력(prototype-chain:69의 "예제 8의 4~6번 줄이 모두 true"), 마지막 열에 예제 번호만 적은 표(execution-context:96), 들여쓴 코드 펜스 인식(이전 Low, 의도한 범위).

## 2. 사실과 추정

### 사실 (코드에서 확인)

- 행 형식 판정은 머리에 `결과`·`출력`으로 시작하는 열이 있을 때만 하고, 첫 칸이 `EXAMPLE_ROW`(`예제 N` 뒤에 `:`·공백·끝, 또는 `N:`)에 맞는 행이 하나도 없으면 그 표를 아무 말 없이 건너뛴다 — `tests/helpers/result-tables.ts:85`, `:98-104`.
- 열 형식은 머리가 정확히 `예제 N의 출력`일 때만 잡는다. 다른 표기는 아무 말 없이 빠진다 — `tests/helpers/result-tables.ts:122-133`.
- 손으로 쓴 표 29개를 스크래치 스크립트로 분류한 결과(같은 정규식):
  - `block-scope/content.mdx:40`: 머리 `예제 | 클래식 스크립트 | ES 모듈 | Node.js CommonJS`, 첫 칸 `4`·`5`·`6`. 결과·출력 열이 없어 대조되지 않는다. 클래식 스크립트 칸 `100 / 100`, `false / true / number / undefined`, `서울 / undefined / undefined`는 예제 4·5·6(`implicit-global.js`, `implicit-vs-var.js`, `global-object.js`)의 `expectedOutput`을 ` / `로 이은 것과 같다 — `block-scope/meta.ts:57-71`, 예제 제목 `content.mdx:123,136,154`.
  - 머리 첫 칸이 `예제`인 다른 표(function-calls:154, hoisting:132, property-keys:172, switch-break-continue:151)는 모든 행이 이미 대조된다.
  - `예제` 열이 첫 열이 아닌 표(execution-context:96 마지막 열 `3, 4`, prototype-chain:69 마지막 열 `예제 8의 …`)는 출력 주장이 아니거나 줄여 쓴 것이다.
  - 열 머리에 `예제 N`과 `출력`이 함께 있는 것은 new-operator:65의 `예제 9의 출력`뿐이다(정상 형식). `결과(예제 출력)` 머리 5개에는 숫자가 없다.
  - 식 → 결과 표(number-type:142 등)의 첫 칸은 식이라 `예제`로 시작하지 않고 `N:` 꼴도 아니다.
- block-scope의 ES 모듈·CommonJS 열 동작은 `block-scope/concept.test.ts:114-183`이 `.mjs`·`.cjs`로 실제 실행해 확인한다(칸 글자는 대조하지 않음). 빌드·e2e 테스트는 이 표의 글자를 쓰지 않는다(`tests/build/build-output.test.ts:496-`, `tests/e2e/a11y.spec.ts:389`는 페이지·시뮬레이터 단위).
- 기존 단위 테스트 '예제 행이 없는 표는 주장도 위반도 없다'는 머리 `['예제', '결과']`, 본문 `['식', '값']`을 쓴다 — `tests/result-tables.test.ts`. 머리 첫 칸이 `예제`라는 것만으로 위반을 내면 이 테스트가 깨진다.
- type-coercion 대체 코드: `"'0' ? … : …, !count": "[text ? '참으로 판단' : '거짓으로 판단', String(!count)].join(', ')"` — `app/concepts/type-coercion/concept.test.ts:507-509`. `count`는 `exampleContext`로 실행한 예제에서 온다.
- content-guide 문장 "같은 페이지 예제를 준비 코드로 실행한 뒤 식을 평가해 대조합니다" — `docs/content-guide.md:147`. 실제로 예제를 준비 코드로 쓰는 것은 equality-operators·typeof-operator·type-coercion이고, number-type은 행마다 새 컨텍스트에서 식만 평가하며(`number-type/concept.test.ts` '결과와 이유 표'), increment-decrement는 행마다 테스트에 적은 코드를 실행한다(`increment-decrement/concept.test.ts:395`).
- 겹치는 근거 테스트 6개는 모두 표 밖 본문 문장에도 같은 주장이 있다: typeof `typeof 1 + 2`·`typeof (1 + 2)`·`typeof typeof 42`(`typeof-operator/content.mdx:60,295,314-317`), number-type `0.1 + 0.2 === 0.3`(`:42`), `(1 + 2) / 10`(`:44`), `NaN + 1`(`:59`). equality-operators·type-coercion의 근거 테스트는 표와 겹치는 식이 없다.

### 추정

- 없음

## 3. 구현 전략

- `extractOutputClaims`에서 표마다 두 판정을 더해 기존 `violations`에 넣는다. 공통 테스트 '형식 위반이 없다'가 이미 `violations`를 모아 실패시키므로 새 테스트 블록은 필요 없다.
  - 판정 A(행 형식 근접): 그 표의 행 형식이 주장을 하나도 만들지 않았는데(결과·출력 열이 없거나, 예제 행으로 인식된 행이 없음), 본문 첫 칸 중 하나가 다음 중 하나에 맞으면 위반.
    - `/^예제\s*\d/`(예: `예제 4.`, `예제4-`)
    - `EXAMPLE_ROW`(결과·출력 열이 없는데 `예제 1: …`이나 `1: …`으로 쓴 경우)
    - 머리 첫 칸이 `예제`로 시작하고 칸이 숫자뿐(`/^\d+$/`, block-scope 꼴)
  - 판정 B(열 형식 근접): 머리 칸이 `/예제\s*\d+/`와 `/출력/`을 함께 포함하지만 `^예제\s*(\d+)의 출력$`이 아니면 위반(예: `예제 9 출력`).
- 머리 첫 칸이 `예제`라는 것만으로는 위반으로 보지 않는다. 기존 단위 테스트(머리 `예제`, 본문 `식`)가 의도한 "예제 행이 없는 표"를 오탐하지 않기 위해서다.
- block-scope 표는 첫 칸을 `예제 4`·`예제 5`·`예제 6`으로, 둘째 열 머리를 `결과(클래식 스크립트)`로 바꾼다. 첫 열 머리 `예제`와 나머지 열·칸은 그대로 둔다. 머리가 `결과`로 시작해야 행 형식으로 인식되기 때문이다(`result-tables.ts:85`).
- 버린 대안:
  - block-scope를 예외 목록에 넣기: 사용자가 형식에 맞추기로 결정했다. 예외 목록은 새 장치가 하나 더 생긴다.
  - 머리에 `결과`·`출력`이 없는 표 전부를 경고: 식 표·설명 표 20여 개가 걸려 판정이 무의미해진다.
  - 겹치는 근거 테스트 삭제: 본문 문장의 근거라서 표 행이 바뀌면 본문 문장이 검증 없이 남는다(사용자 결정으로 유지).

## 4. 변경 파일

- 수정 `tests/helpers/result-tables.ts`: `extractOutputClaims`에 판정 A·B. 다른 함수는 그대로.
- 수정 `tests/result-tables.test.ts`: 판정 A·B 단위 테스트(위반 4개, 위반 아님 2개), 하한 주석과 값 갱신(행 102 + 열 1 = 103).
- 수정 `app/concepts/block-scope/content.mdx`: 40행 표의 첫 칸 3개와 둘째 열 머리. `reviewedAt`은 그대로 둔다(형식에 맞춘 표기 변경, 이전 문구 정리 작업의 관례).
- 수정 `app/concepts/type-coercion/concept.test.ts`: 507행 대체 코드의 `text`를 `'0'`으로.
- 수정 `docs/content-guide.md`: 145~147행 규칙 목록에 위반 판정 문장 추가, 147행 식 표 문장 한정.
- 수정 `.claude/plans/result-table-verification.md`, `.claude/plans/expression-table-verification.md`: 후속 작업 체크박스를 이 계획으로 처리했다고 표시(마무리 단계).
- 변경하지 않음: `tests/helpers/expression-tables.ts`, 다른 개념의 `content.mdx`·`concept.test.ts`(겹치는 근거 테스트 포함), `AGENTS.md`(파일 목록 변화 없음), 앱 코드.

## 5. 위험 요소

- 판정 A·B가 정상 표를 잡음 → 공통 테스트 '형식 위반이 없다' 실패 → 작업 순서 1 완료 조건에서 위반 목록이 block-scope:40 하나뿐인지 확인, 순서 2 뒤에는 0개.
- 판정이 너무 좁아 실제 근접 사례를 못 잡음 → 단위 테스트에 근접 사례 4가지를 넣어 각각 위반이 나는지 확인(작업 순서 1).
- block-scope 칸 글자를 바꾸다 출력 칸이 어긋남 → 행 형식 대조가 그 칸 3개를 검사(작업 순서 2 완료 조건).
- Prettier가 block-scope 표를 다시 감쌈 → `npm run format:check`(검증).
- `'0'`으로 바꾼 대체 코드가 표 칸과 다르게 평가됨 → 그 행 테스트(`'0' ? … : …, !count → 결과 칸`) 통과 확인. 대체 코드 키 검사(`override 키가 모두 표의 "예" 칸에 있다`)는 키를 바꾸지 않으므로 그대로 통과해야 한다.

## 6. 검증 방법

- 정적·테스트(AGENTS.md 검증 순서): `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 공통 앱 코드를 바꾸지 않고 block-scope 콘텐츠만 바꾸므로 관련 e2e만 실행한다. `npx playwright test -g "block-scope|블록 스코프"`
- 거꾸로 확인(되돌림 필수): block-scope 표 하나의 칸 `100 / 100`을 `100 / 99`로 바꾸면 `block-scope:40 예제 4` 행만 실패하는지, 첫 칸 `예제 4`를 `4`로 되돌리면 형식 위반이 나는지 확인하고 `git checkout`으로 되돌린다.
- 브라우저: 화면 동작 변화가 없고 표 글자만 바뀐다. 빌드 결과에서 `grep -o '결과(클래식 스크립트)' build/client/concepts/block-scope/index.html`로 새 머리가 들어갔는지 확인한다.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 형식 위반 판정 추가

- 대상: `tests/helpers/result-tables.ts`, `tests/result-tables.test.ts`
- 현재: 행 형식은 결과·출력 열이 있고 예제 행이 하나 이상일 때만 판정하고, 아니면 아무 말 없이 건너뛴다. 열 형식은 정확한 머리만 잡는다.
- 변경: 3절의 판정 A·B를 `extractOutputClaims`에 넣어 `violations`에 `표 ${line}행: …` 메시지를 추가한다. 메시지에는 어떤 칸(첫 칸 값이나 머리 값) 때문인지 넣는다. 단위 테스트:
  - 위반: (a) 머리 `['예제', '클래식 스크립트']`, 본문 첫 칸 `4` (b) 머리 `['예제', '결과']`, 첫 칸 `예제 4.` (c) 머리 `['예제', '값']`, 첫 칸 `예제 1: 설명` (d) 머리 `['호출', '예제 9 출력']`
  - 위반 아님: (e) 마지막 열 머리가 `예제`이고 칸이 `3, 4`인 표 (f) 기존 '예제 행이 없는 표는 주장도 위반도 없다'(머리 `예제`, 본문 `식`)가 그대로 통과
- 이유: 형식을 어긴 출력 표가 대조에서 아무 경고 없이 빠지는 것을 막는다.
- 주의사항: 기존 '섞인 표' 위반과 같은 표에서 중복 보고하지 않는다(판정 A는 행 형식이 주장을 하나도 만들지 않은 표에만). 하한 검사는 이 단계에서 바꾸지 않는다.
- 완료 조건: `npx vitest run tests/result-tables.test.ts`에서 새 단위 테스트 6개 통과, '형식 위반이 없다'는 `block-scope: 표 40행: …` 위반 하나만으로 실패(다른 개념 위반 0개).

### 2. block-scope 표를 형식에 맞춤

- 대상: `app/concepts/block-scope/content.mdx` 40행 표
- 현재: 첫 칸 `4`·`5`·`6`, 둘째 열 머리 `클래식 스크립트`.
- 변경: 첫 칸을 `예제 4`·`예제 5`·`예제 6`으로, 둘째 열 머리를 `결과(클래식 스크립트)`로. 다른 열·칸·표 아래 문단은 그대로.
- 이유: 사용자 결정. 클래식 스크립트 칸 3개가 `expectedOutput`과 자동 대조된다.
- 주의사항: 표 아래 문단 "예제 4는 모듈이 strict mode라 …"와 `meta.simplifications`는 열 이름을 직접 가리키지 않으므로 바꾸지 않는다. `reviewedAt` 유지.
- 완료 조건: `npx vitest run tests/result-tables.test.ts` 전체 통과, 테스트 이름에 `block-scope:40 예제 4`·`예제 5`·`예제 6`이 보임.

### 3. 하한 갱신

- 대상: `tests/result-tables.test.ts` 하한 검사
- 현재: 주석 "현재 행 99 + 열 1", 하한 100.
- 변경: 주석을 "현재 행 102 + 열 1"로, 하한을 103으로.
- 이유: block-scope 3칸이 늘었다. 하한을 실제 수에 맞춰야 이후 칸이 빠지는 것을 잡는다.
- 완료 조건: 하한 테스트 통과, 실제 대조 칸 수(`it.each` 행 수)가 103.

### 4. type-coercion 대체 코드

- 대상: `app/concepts/type-coercion/concept.test.ts:507-509`
- 변경: `text ? '참으로 판단' : '거짓으로 판단'`을 `'0' ? '참으로 판단' : '거짓으로 판단'`으로. 키와 `count`는 그대로.
- 완료 조건: `npx vitest run app/concepts/type-coercion/concept.test.ts -t "결과와 이유 표"` 통과.

### 5. 문서 갱신

- 대상: `docs/content-guide.md:145-147`
- 변경:
  - 규칙 목록에 한 항목 추가: 첫 칸이 `예제 N`처럼 보이거나(첫 열 머리가 `예제`이고 칸이 숫자뿐인 경우 포함) 열 머리에 `예제 N`과 `출력`이 함께 있는데 위 형식에 맞지 않으면 `npm test`가 형식 위반으로 실패한다. 출력을 대조하지 않을 표는 이런 표기를 쓰지 않는다.
  - 147행 식 표 문장을 "… `tableBody`로 표를 읽고 식 칸을 평가해 대조합니다. 식에 같은 페이지 예제의 이름이 쓰이면 `exampleContext`로 예제를 먼저 실행합니다(예: `typeof-operator`)."처럼 한정한다.
- 완료 조건: `npm run format:check` 통과, 문장이 3절 판정 A·B와 일치.

### 6. 전체 검증과 계획 문서 정리

- 6절 명령과 거꾸로 확인을 실행한다.
- 이전 계획 두 문서의 해당 후속 체크박스에 이 계획에서 처리했다고 적는다(겹치는 근거 테스트는 "본문 문장의 근거라 유지, 사용자 결정"으로 닫음).
- 완료 조건: 모든 명령 통과, 거꾸로 확인 2건이 예상대로 실패한 뒤 되돌려 `git diff`에 남지 않음.

## 구현 진행

- baseline (2026-11-12, `d22fc8c`): lint·format:check·typecheck 통과 / `npm test` 154개 파일 4822개 통과
- [x] 1. 형식 위반 판정 추가 — `tests/helpers/result-tables.ts` 판정 A(`claims.length === claimsBefore`일 때만, 표당 하나)·B, 단위 테스트 6개 통과. block-scope 표를 고치기 전 '형식 위반이 없다'는 `block-scope: 표 40행: 예제 행처럼 보이는 칸("4")…` 하나로만 실패(다른 개념 0개)
- [x] 2. block-scope 표를 형식에 맞춤 — `block-scope:40 예제 4·5·6` 행 3개 대조 통과
- [x] 3. 하한 갱신 — 대조 칸 103개(verbose 출력에서 셈), 하한 103
- [x] 4. type-coercion 대체 코드 `'0'` — `-t "결과와 이유 표"` 11개 통과
- [x] 5. 문서 갱신 — `docs/content-guide.md:147` 위반 판정 항목 추가, 148행 식 표 문장 한정, format:check 통과
- [x] 6. 전체 검증 — lint·format:check·typecheck 통과 / `npm test` 4831개 통과(+9: 단위 6, block-scope 행 3) / `npm run test:build` 451개 통과, 빌드 HTML에 `결과(클래식 스크립트)`·`<td>예제 4</td>` 확인 / `npx playwright test -g "block-scope|블록 스코프"` 12개 통과
  - 거꾸로 확인: `100 / 100`→`100 / 99`면 `block-scope:40 예제 4`만 실패. 첫 칸 `예제 4`→`4`면 '형식 위반이 없다'(섞인 표 위반)와 하한(102 < 103) 실패. 둘 다 백업 파일로 원복, diff에 남지 않음
  - 이전 계획 문서 후속 체크박스 정리는 `finalize-work`에서 한다
- 리뷰 1차: Critical·High·Medium 없음 · Low 2 (보고)
  - Low: `tests/helpers/result-tables.ts:135` 판정 A 메시지가 "결과·출력 열 형식이 아니어서"라 결과 열은 있고 첫 칸 표기만 어긋난 경우(`예제 4.`)에는 원인 설명이 조금 부정확
  - Low: `tests/helpers/result-tables.ts:124` 변수 이름 `numericFirstHeader`는 "머리 첫 칸이 `예제`로 시작" 뜻이라 이름과 의미가 어긋남(`header[0]`은 머리 행이 빈 표에서 undefined지만 그런 표는 없음)

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 1단계(판정·단위 테스트)는 Sonnet 서브에이전트가, 2~6단계는 메인 에이전트가 직접 했다.
- 거꾸로 확인에서 첫 칸 `예제 4`만 `4`로 되돌리면 판정 A가 아니라 기존 '섞인 표' 위반으로 잡혔다(`예제 5`·`6`이 행 형식 주장을 만들기 때문). 둘 중 하나로 반드시 잡히므로 계획 변경은 없다.

### 코드 리뷰

- Critical·High·Medium 없음. Low 2건(판정 A 메시지 문구, 변수 이름 `numericFirstHeader`)은 보고 후 사용자 승인으로 그대로 둠.

### 후속 작업

- [ ] (선택) Low 2건: `tests/helpers/result-tables.ts` 판정 A 메시지를 원인별로 정확히, `numericFirstHeader` 이름을 뜻에 맞게

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [무검토 승인] 판정 A는 그 표의 행 형식이 주장을 하나도 만들지 않았을 때만 본다(`claims.length === claimsBefore`) — 모든 표에 걸면 '예제 행과 아닌 행이 섞인 표' 위반과 같은 표에서 두 번 보고된다.
- [무검토 승인] 머리 첫 칸이 `예제`라는 것만으로는 위반으로 보지 않고, 칸이 숫자뿐일 때만 본다 — 기존 단위 테스트(머리 `예제`, 본문 `식`)가 "예제 행이 없는 표"를 위반 0으로 기대하고, 실제로 걸려야 할 block-scope 표는 칸이 `4`·`5`·`6`이었다.
- [무검토 승인] 판정 B는 머리에 `예제 N`과 `출력`이 함께 있을 때만 본다 — `결과(예제 출력)` 머리 5개에는 숫자가 없어 걸리지 않고, `예제 3과 비교` 같은 머리도 오탐하지 않는다.
- [무검토 승인] 하한을 실제 대조 칸 수(103)로 올렸다 — 하한이 실제보다 낮으면 그만큼 칸이 빠져도 잡지 못한다(거꾸로 확인에서 102 < 103 실패 확인).
- block-scope 표는 예외 목록 대신 형식에 맞춰 바꿨다(사용자 결정) — 예외 장치를 새로 만들지 않고, 클래식 스크립트 칸 3개가 자동 대조된다.
- 표와 겹치는 `본문 서술의 근거` 테스트는 지우지 않았다(사용자 결정) — 표 검사는 표 칸을, 근거 테스트는 표 밖 본문 문장을 뒷받침한다.

#### 배경지식

- 행 형식 인식 조건: 머리에 `결과`·`출력`으로 시작하는 열이 있고, 첫 칸이 `EXAMPLE_ROW`(`예제 N` 뒤 `:`·공백·끝, 또는 `N:`)에 맞아야 한다(`tests/helpers/result-tables.ts:83`, `:99`). 그래서 block-scope는 머리 `결과(클래식 스크립트)`, 첫 칸 `예제 4`가 되었다.
- 공통 테스트 '형식 위반이 없다'는 모든 개념의 `violations`를 모아 빈 배열인지 본다. 판정을 `violations`에 넣기만 하면 새 테스트 블록 없이 모든 개념에 적용된다.
- block-scope의 ES 모듈·CommonJS 열은 칸 글자가 아니라 동작을 `concept.test.ts`가 `.mjs`·`.cjs` 실제 실행으로 확인한다.

#### 확인 질문

1. 판정 A를 "행 형식 주장이 없는 표"로 한정하지 않고 모든 표에 걸면 어떤 일이 생기나?
   <details><summary>답</summary>예제 행과 아닌 행이 섞인 표(예: 첫 칸 `예제 4` → `4`로 바뀐 block-scope)에서 기존 '섞인 표' 위반과 판정 A 위반이 같은 표에 두 번 보고된다. 그래서 `claimsBefore`를 기록해 그 표에서 주장이 생기지 않았을 때만 본다(`tests/helpers/result-tables.ts:98`, `:123`).</details>
2. 머리 첫 칸이 `예제`인 표를 모두 위반으로 보면 무엇이 깨지나?
   <details><summary>답</summary>기존 단위 테스트 '예제 행이 없는 표는 주장도 위반도 없다'(머리 `['예제', '결과']`, 본문 `['식', '값']`)가 실패한다. 그래서 칸이 숫자뿐일 때만 위반으로 본다(계획 3절, `tests/result-tables.test.ts`).</details>
3. block-scope 표의 둘째 열 머리를 `클래식 스크립트 결과`로 썼다면 대조되나?
   <details><summary>답</summary>되지 않는다. 행 형식은 머리가 `결과`나 `출력`으로 **시작**해야 결과 열로 인식한다(`tests/helpers/result-tables.ts`의 `startsWith`). 그 경우 판정 A가 "예제 행처럼 보이는 칸"으로 실패시킨다.</details>
4. 하한을 100으로 두었다면 어떤 회귀를 놓치나?
   <details><summary>답</summary>판정 A·B가 잡지 못하는 모양(예: 첫 칸을 `ex 4`로)으로 표 하나(3칸)가 대조에서 빠지면, 103 → 100이라 하한도 통과해 아무 테스트도 실패하지 않는다. 하한을 실제 수로 두면 이 경우도 잡힌다(구현 진행 6단계 거꾸로 확인에서 102 < 103 실패).</details>
