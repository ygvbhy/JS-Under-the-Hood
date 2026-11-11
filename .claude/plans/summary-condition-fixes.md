# 요약·제목의 빠진 조건 보완 구현 계획

- 상태: 완료
- 작성일: 2026-11-11
- 기준: `main` @ `0901ba0`

## 0. 요약
- 목적: 외부 검토가 지적한 개념 7개의 요약·제목·goals(와 같은 일반화를 담은 본문 몇 문장)에 빠진 조건을 넣어, 명세·실행 결과와 어긋나게 읽히지 않게 한다.
- 범위: 7개 개념 폴더의 `meta.ts`, `content.mdx` 3곳, `arrow-functions/concept.test.ts`에 테스트 1개 추가 / 공통 코드·예제·시뮬레이터는 바꾸지 않는다.
- 위험: 요약 160자 제한(html 요약이 정확히 160자)과 Prettier 줄바꿈, Date 제목이 길어진 뒤의 모바일 가로 스크롤.
- 복잡도: 중간 · Consensus: 생략 (문구만 바꾸고 동작·구조 변경이 없으며, 지적마다 본문의 바른 서술을 그대로 옮긴다)
- 미확정: 1건 (number-type의 "아주 큰 정수" 표현 유지)

## 1. 요구사항
- 요구사항: 검토 결과 1~6번과 "본문 확인 권고"의 화살표 함수 건을 고친다. Set과 Map 건은 본문 17행이 이미 ES2024/ES2025 판 차이를 설명하므로 고치지 않는다.
- 유지할 동작: 예제 파일과 `expectedOutput`, 시뮬레이터 시나리오, `reviewedAt`, slug·order·라우트는 그대로 둔다.
- 제외 범위: 지적되지 않은 다른 개념의 문구, 본문 h2/h3 제목, 새 예제 추가. 뒷장 개념(심벌 33장, 제너레이터 46장)은 "별도 개념"으로만 언급한다(AGENTS.md "한 페이지는 그 개념이 나오는 장까지의 내용만 전제").

## 2. 사실과 추정
### 사실 (코드·실행에서 확인)
- 요약은 카드와 meta description에 쓰이고 160자 이하여야 한다 — `app/lib/concepts.ts:34`, `tests/content-integrity.test.ts:61-64`.
- 제목은 빌드 테스트가 `meta.ts` 값을 그대로 읽어 비교하므로(`tests/build/build-output.test.ts:62,248,311`) 고정 문자열을 고칠 테스트가 없다. e2e는 Date를 경로(`DATE_PATH`)로만 찾는다(`tests/e2e/helpers.ts:93`, `navigation.spec.ts:295-320`).
- **HTML**: 본문은 이유를 바르게 쓴다("어트리뷰트는 건드리지 않으므로 `getAttribute('value')`와 `defaultValue`는 `"손님"`" — `html-attribute-dom-property/content.mdx:34`). 요약 `meta.ts:7`과 goals[0] `meta.ts:22`만 이유를 dirty value flag로 쓴다.
- **Date**: 예제는 2026년으로 고정했고(`date/content.mdx:6,34,293`), 시뮬레이터도 2026이다(`date/scenarios.ts:111`). 연도가 빠진 곳은 제목 `meta.ts:8`, goals[0] `meta.ts:28`. Node 실행: `new Date(2024,0,31)`에 `setMonth(1)`을 하면 일이 2(3월 2일)이다.
- **프로퍼티 키**: 본문 도입과 단순화에서 문자열 키만 다룬다고 범위를 정했다(`property-keys/content.mdx:6`, `meta.ts:93`). 일반화된 문장은 요약 `meta.ts:7`, goals[0] `meta.ts:21`, ToPropertyKey를 직접 인용한 본문 `content.mdx:18`.
- **숫자 타입**: 본문은 `0 / 0`이 `NaN`이라고 쓰고(`number-type/content.mdx:56`), 예제 4 출력이 `Infinity -Infinity NaN`이다(`meta.ts:61`). 요약 `meta.ts:7`만 "Infinity가 됩니다"이다.
- **이벤트 전파**: 본문은 경로를 항상 두 번 순회하고, `bubbles`가 false면 버블 순회에서 타깃이 아닌 항목을 건너뛴다고 쓴다(`event-propagation-delegation/content.mdx:20,68,369`). 따라서 "두 번 지난다"는 명세대로이고, 요약 `meta.ts:7`의 "다시 올라오며"만 조상까지 올라간다고 읽힌다.
- **동등 비교**: 본문은 `null`·`undefined`를 바꾸지 않는다고 쓴다(`equality-operators/content.mdx:96,383`). 일반화된 문장은 요약 `meta.ts:7`과 개요 목록 `content.mdx:10`.
- **화살표 함수**: Node 실행 결과 `{ m(){}, async a(){} }`는 `prototype`이 없고, `*g(){}`와 `async *ag(){}`는 `prototype`이 있으며, 넷 다 `new`로 부르면 TypeError다. 일반화된 문장은 요약 `meta.ts:7`, goals[0] `meta.ts:25`, 본문 `content.mdx:15`(끝 문장), 퀴즈 해설 `content.mdx:128`, 정리 `content.mdx:239`. 비교표 `comparison.ts:32-49`의 "메서드 축약" 칸 probe는 일반 메서드 `{ f() {} }`이다. 같은 예외를 이미 쓴 문장이 있다: `prototype-chain/content.mdx:37` "(제너레이터 메서드는 예외이며 별도 개념입니다)".
- 단순화 `arrow-functions/meta.ts:96`은 "제너레이터와 async 화살표 함수, getter와 setter 축약은 다루지 않습니다", `meta.ts:97`은 비교표 "일반 함수" 칸의 기준을 밝힌다.
- 테스트 패턴: `arrow-functions/concept.test.ts`의 `describe('본문 주장 검증')`가 `runInNewContext`로 본문 주장을 실행해 확인한다(`concept.test.ts:16-60`).

### 추정
- 없음

## 3. 구현 전략
- 각 지적마다 본문에 이미 있는 바른 서술을 요약·goals로 옮긴다. 본문은 같은 일반화를 독자에게 사실처럼 단정하는 문장만 고친다(개요·정의·정리 문장). 페이지 앞에서 범위를 정한 뒤의 예제 해설(예: `property-keys/content.mdx:30,229,240,269,291`)은 고치지 않는다.
- 화살표 함수는 본문에 실행 근거가 없는 새 주장("제너레이터 메서드에는 prototype이 있다")이 생기므로 `concept.test.ts`에 실행 검증을 하나 추가한다(AGENTS.md 정확성 원칙). 예제·비교표는 바꾸지 않고, 비교표 "메서드 축약" 칸이 일반 메서드 기준이라는 것을 단순화에 밝힌다.
- 버린 대안: 검토의 수정안을 그대로 쓰기 → html·eq 수정안은 160자를 넘는다. Date 본문에 윤년 결과(3월 2일)를 추가하기 → 예제로 검증하지 않는 새 출력 주장이 되므로 넣지 않는다. 비교표에 제너레이터 메서드 열 추가 → 46장 개념이라 범위 밖이다.

## 4. 변경 파일
- 수정: `app/concepts/{html-attribute-dom-property,date,property-keys,number-type,event-propagation-delegation,equality-operators,arrow-functions}/meta.ts`
- 수정: `app/concepts/property-keys/content.mdx`, `app/concepts/equality-operators/content.mdx`, `app/concepts/arrow-functions/content.mdx`
- 수정: `app/concepts/arrow-functions/concept.test.ts` (테스트 1개 추가)
- 변경하지 않음: `set-map/*`(본문이 이미 정확), 예제 파일 전부, `date/scenarios.ts:125`(시뮬레이터가 2026년 Date를 따라가는 맥락이라 연도가 분명함), `comparison.ts`(probe가 일반 메서드 기준이며 단순화로 밝힘), `number-type/content.mdx:13`(바로 뒤에서 0.5 등 정확한 값을 설명함), 공통 코드.

## 5. 위험 요소
- html 요약이 정확히 160자 → 작업 중 한 글자만 늘어도 `content-integrity` 실패 → 작업 순서 1 완료 조건에서 길이를 출력해 확인.
- `\uXXXX` 이스케이프가 도구 입력에서 실제 문자로 풀리는 함정(메모리) → 새 문구에는 이스케이프를 쓰지 않는다.
- 문장 길이가 바뀌어 Prettier 줄바꿈이 달라짐 → 수정 후 `npx prettier --write`로 해당 파일만 포맷하고 `format:check`.
- Date 제목이 7자 길어져 모바일 헤더에서 넘칠 수 있음 → `responsive.spec.ts`의 `DATE_PATH` 가로 스크롤 테스트(전체 e2e에 포함).
- 문장을 옮기며 지시어("이", "그") 대상이 바뀜(메모리 promise-static-methods 교훈) → 각 문단을 앞뒤 문장과 함께 다시 읽는다.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- e2e는 7개 페이지의 카드·제목·본문이 바뀌므로 범위를 좁히지 않고 전체를 실행한다. 시간 초과 실패는 재실행해 구분한다(메모리).
- 문구 잔존 확인: `grep -rn "dirty value flag이고\|3월 3일일까\|문자열로 바뀌어 프로퍼티 키\|오류 대신 Infinity가\|내려갔다가 다시 올라오며 경로를\|정해진 규칙에 따라 값을 바꾼 뒤 다시" app/concepts` 결과가 없다.
- 빌드 결과: `build/client/concepts/date/index.html`의 `<title>`에 "2026년 1월 31일"이 있다(`test:build`가 확인).

## 7. 미확정 사항
- [미확정] number-type 요약의 "아주 큰 정수"는 2^60처럼 정확히 담기는 큰 정수도 있어 같은 종류의 일반화이다. 이 계획은 "0.1 같은"으로 소수만 한정하고, 정수 쪽은 본문 48행이 "2의 53제곱보다 커지면"으로 설명하므로 그대로 둔다. 바꾸길 원하면 "2의 53제곱을 넘는 정수 일부"로 고친다(160자 안에 들어가는지 확인 필요).

## 8. 작업 순서
### 1. 요약 6개 교체
- 대상: html·property-keys·number-type·event-propagation-delegation·equality-operators·arrow-functions의 `meta.ts` summary
- 현재: 조건이 빠진 일반화(2절 사실).
- 변경: 아래 문장으로 교체한다.
  - html: `input의 value 프로퍼티는 어트리뷰트가 아닌 요소의 값을 바꿔 getAttribute("value")는 그대로이고, 그 뒤엔 dirty value flag 때문에 어트리뷰트를 바꿔도 값이 따르지 않습니다. 반영, 타입 변환, dataset도 Chromium과 표준으로 확인합니다.` (160자)
  - property-keys: `대괄호 안의 값은 심벌이 아니면 문자열로 바뀌어 프로퍼티 키가 되므로 obj[1]과 obj['1']은 같은 프로퍼티입니다. 점 표기와 대괄호 표기의 차이, 없는 프로퍼티를 읽을 때의 결과, 객체에 프로퍼티를 추가·삭제하는 과정을 단계별로 따라갑니다.` (139자)
  - number-type: `자바스크립트의 숫자는 정수와 실수를 가리지 않고 모두 64비트 부동소수점 값입니다. 0.1 같은 십진 소수와 아주 큰 정수는 가장 가까운 값으로 반올림되어 저장되므로 0.1 + 0.2가 0.3과 다르고, 0으로 나누면 오류 대신 Infinity, -Infinity, NaN이 됩니다.` (158자)
  - event: `이벤트는 window에서 타깃까지 내려갔다가 다시 올라오며 경로를 두 번 지나고, 버블링하지 않는 이벤트는 올라올 때 타깃이 아닌 노드를 건너뜁니다. eventPhase, target과 currentTarget, 이벤트 위임을 DOM 표준과 Chromium 실행 결과로 확인합니다.` (157자)
  - equality: `===는 타입이 다르면 바로 false이고, ==는 타입이 다르면 대개 값을 바꾼 뒤 비교합니다(null·undefined는 바꾸지 않고 서로만 같습니다). 0 == ''가 true인데 '0' == ''는 false이고 NaN === NaN이 false인 이유를 설명할 수 있습니다.` (158자)
  - arrow: `화살표 함수와 메서드 축약도 typeof는 function이지만 new로 부를 수 없고, 제너레이터 메서드가 아니면 prototype이 없습니다. 화살표 함수는 자기 this와 arguments가 없어 바깥에서 찾고, rest 파라미터는 나머지 인수를 배열로 받습니다.` (150자)
- 이유: 요약은 홈 카드와 검색 결과에 본문 없이 단독으로 보인다.
- 주의사항: 따옴표 종류는 각 파일의 기존 문자열 따옴표를 유지한다(property-keys·equality는 큰따옴표 문자열).
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, 6개 요약 길이가 모두 160 이하(node로 `concept.summary.length` 출력).

### 2. 제목·goals 교체
- 대상: `date/meta.ts` title·goals[0], `html-attribute-dom-property/meta.ts` goals[0], `property-keys/meta.ts` goals[0], `arrow-functions/meta.ts` goals[0]
- 변경:
  - date title: `Date: 2026년 1월 31일에 setMonth(1)을 하면 왜 3월 3일일까`
  - date goals[0]: 앞부분을 `2026년 1월 31일에 setMonth(1)을 하면 왜 3월 3일이 되는지,`로 바꾸고 나머지는 유지.
  - html goals[0]: `input의 value를 바꾼 뒤 getAttribute("value")가 그대로인 이유를 value setter가 어트리뷰트를 쓰지 않는 것으로, 그 뒤 어트리뷰트를 바꿔도 값이 따르지 않는 이유를 dirty value flag로 설명하고, 입력 전에는 어트리뷰트가 value를 바꾸는 이유를 예측할 수 있다.`
  - property-keys goals[0]: `심벌이 아닌 대괄호 안의 값은 문자열로 바뀌어 키가 된다는 것으로 숫자·불리언·null·객체를 키로 쓴 결과를 예측할 수 있다.`
  - arrow goals[0]: `화살표 함수와 메서드 축약이 typeof는 function이지만 new로 부르면 TypeError이고, 화살표 함수와 제너레이터가 아닌 메서드 축약에 prototype 프로퍼티가 없는 이유를 설명할 수 있다.`
- 이유: goals는 페이지 상단 학습 목표로 본문보다 먼저 읽힌다.
- 완료 조건: `grep -n "3월 3일일까" app/concepts/date/meta.ts`가 `2026년`이 들어간 한 줄만 나온다. `npx vitest run tests/content-integrity.test.ts` 통과.

### 3. 본문 문장 수정
- 대상과 변경:
  - `property-keys/content.mdx:18`: `` `obj[식]`은 대괄호 안의 식을 평가한 값을 프로퍼티 키로 바꿔 씁니다(명세의 ToPropertyKey). 원시 값으로 바꾼 결과가 심벌이면 그대로 키가 되고, 그 밖의 값은 문자열로 바뀝니다. 이 페이지는 문자열이 되는 경우만 다룹니다. 문자열로 바꾸는 규칙은 [암묵적 타입 변환](/concepts/type-coercion) 페이지에서 다룬 것과 같습니다. ``
  - `equality-operators/content.mdx:10`: `` - `==`(동등): 타입이 다르면 대개 규칙에 따라 값을 바꾼 뒤 비교합니다(`null`과 `undefined`는 바꾸지 않습니다). ``
  - `arrow-functions/content.mdx:15` 끝에 덧붙임: `` 메서드 축약 중 제너레이터 메서드(`*m() {}`)는 `new`로 부를 수 없는 것은 같지만 `prototype` 프로퍼티를 가지며, 이 페이지에서 다루지 않는 별도 개념입니다. ``
  - `arrow-functions/content.mdx:128` 해설: `메서드 축약과 화살표 함수는` → `obj.short와 arrow는`
  - `arrow-functions/content.mdx:239`: `메서드 축약은 생성자가 아니고 \`prototype\`이 없으며(예제 2)` → `메서드 축약은 생성자가 아니고 제너레이터 메서드가 아니면 \`prototype\`도 없으며(예제 2)`
- 이유: 개요·정의·정리 문장은 요약과 같은 일반화를 독자에게 사실로 단정한다.
- 주의사항: `content.mdx:18`은 앞 문단(6행) 범위 선언과 중복되지 않는지, `content.mdx:30`의 "대괄호 표기와 같은 규칙"이 여전히 18행을 가리키는지 확인한다. 퀴즈 해설은 JSX 속성 문자열이므로 큰따옴표를 넣지 않는다.
- 완료 조건: 6절의 잔존 grep 결과 없음, `npx prettier --check` 대상 3개 파일 통과.

### 4. 화살표 함수 단순화와 실행 검증 추가
- 대상: `arrow-functions/meta.ts:96-97`, `arrow-functions/concept.test.ts`
- 변경:
  - `meta.ts:96` 뒤에 문장 추가(같은 항목 안): `제너레이터 메서드(*m() {})와 async 제너레이터 메서드는 메서드 축약이지만 prototype 프로퍼티가 있으므로, 이 페이지에서 메서드 축약에 prototype이 없다고 한 것은 그 둘을 뺀 메서드에 대한 설명입니다.`
  - `meta.ts:97`: `비교표의 "일반 함수" 칸은 sloppy 스크립트의 function 식 기준이고, "메서드 축약" 칸은 제너레이터가 아닌 메서드 기준입니다.`
  - `concept.test.ts`의 `describe('본문 주장 검증')`에 `it('제너레이터 메서드와 async 제너레이터 메서드는 new로 부를 수 없지만 prototype 프로퍼티가 있다', ...)` 추가: `runInNewContext`로 `var o = { *g() {}, async *ag() {} }; JSON.stringify([o.g.hasOwnProperty("prototype"), o.ag.hasOwnProperty("prototype")])`가 `[true,true]`, `errorNameOf('var o = { *g() {} }; new o.g()')`와 async 제너레이터 메서드가 `'TypeError'`.
- 이유: 새 주장을 실제 실행으로 검증한다(AGENTS.md 정확성 원칙).
- 완료 조건: `npx vitest run app/concepts/arrow-functions` 통과, 추가한 테스트 이름이 출력에 보인다.

### 5. 전체 검증
- 대상: 저장소 전체
- 변경: 없음(포맷 차이가 있으면 해당 파일만 `npx prettier --write`)
- 완료 조건: 6절 정적 명령 한 줄이 모두 통과한다.

## 변경 이력

- 2026-11-11 (구현 중 확인): 계획 작성 뒤 커밋 `13fc299`가 "뒷장 개념의 페이지가 있으면 링크·개념 이름으로 가리킨다(그 하위 주제를 실제로 다룰 때만)" 규칙을 더했다. `generator/content.mdx`는 제너레이터 메서드의 `prototype` 프로퍼티를 다루지 않으므로 화살표 함수의 제너레이터 메서드 언급은 계획대로 "별도 개념"으로 둔다. 프로퍼티 키의 심벌 언급은 `content.mdx:6`이 이미 [심벌] 링크로 가리킨다 — 영향 단계 3·4, 계획 변경 없음.
- 2026-11-11 (완료 조건 정정): 6절 잔존 grep의 `문자열로 바뀌어 프로퍼티 키`는 계획 3절에서 고치지 않기로 한 `property-keys/content.mdx:269`(문자열 키 범위 안의 Callout)까지 잡는다. 이 패턴은 요약의 `"대괄호 안의 값은 문자열로 바뀌어`(meta.ts)만 없음을 확인하는 것으로 좁힌다 — 영향 단계 3.
- 2026-11-11 (문장 다듬기): 단계 3의 `arrow-functions/content.mdx:15` 덧붙임 문장을 "메서드 축약으로 쓴 제너레이터 메서드(`*m() {}`)도 `new`로 부를 수 없지만 `prototype` 프로퍼티는 가지며, 이 페이지에서 다루지 않는 별도 개념입니다."로 다듬었다(뜻은 같고 '~는 ~는' 중복만 없앰).

## 구현 진행

- baseline (2026-11-11, `13fc299`): lint 통과 / format:check 통과 / typecheck 통과 / npm test 152 파일·4636 테스트 통과 / test:build·e2e 미실행(문구만 바뀌는 작업이라 최종 검증에서 실행)
- 구현 방식: 문구와 테스트 1개뿐이라 서브에이전트 없이 메인 에이전트가 정확 일치 치환(일치 1회 확인)으로 직접 수정했다.
- [x] 1. 요약 6개 교체 — 길이 html 160 / property-keys 139 / number-type 158 / event 157 / equality 158 / arrow 150, `tests/content-integrity.test.ts` 732개 통과
- [x] 2. 제목·goals 교체 — `date/meta.ts:8` 제목에 2026년, content-integrity 통과
- [x] 3. 본문 문장 수정 — 5곳 교체, 정정한 잔존 grep 결과 없음, 대상 3개 파일 Prettier 통과
- [x] 4. 화살표 함수 단순화와 실행 검증 추가 — `npx vitest run app/concepts/arrow-functions` 35개 통과, 새 테스트 이름 출력 확인
- 리뷰 1차: High 1 — html 요약·goals[0]의 "input의 value 프로퍼티는 어트리뷰트가 아닌 요소의 값을 바꿔"가 모든 input으로 읽혀, 같은 페이지 예제 3(체크박스 value는 default/on 모드라 대입하면 어트리뷰트가 바뀜, `content.mdx:50,452`)과 모순. 본문 용어대로 "텍스트 입력류"로 한정하고 끝맺음을 "봅니다"로 줄여 160자 유지(단계 1·2 재수정). Medium 0 · Low 2(보고만): number-type 요약 "Infinity, -Infinity, NaN이 됩니다"는 셋 중 하나라는 뜻이 약함(160자 제한), equality 요약 둘째 문장이 "규칙을 알면"을 빼서 주어가 흐려짐.
- [x] 5. 전체 검증 (리뷰 수정 후 재실행) — lint·format:check·typecheck 통과 / npm test 152 파일·4637 테스트 통과(baseline 4636 + 새 테스트 1) / test:build 451 통과, `build/client/concepts/date/index.html` `<title>`에 "2026년 1월 31일" / 전체 e2e 689 통과·3 skipped·실패 0 (14.3분, 모바일 Date 가로 스크롤 포함)
- 재리뷰: High 수정 diff(`html-attribute-dom-property/meta.ts` summary·goals[0]) 확인, 새 지적 없음

## 구현 결과

### 계획 대비 실제 구현
- 5단계 모두 계획대로 구현했다. 달라진 점: 화살표 함수 15행 덧붙임 문장을 다듬었고(뜻 동일), 잔존 grep 완료 조건을 고치지 않기로 한 `property-keys/content.mdx:269`를 빼도록 좁혔으며, 리뷰 High로 html 요약·goals를 "텍스트 입력류"로 한정했다(`변경 이력`, `구현 진행`).
- 계획 이후 커밋 `13fc299`의 링크 규칙은 제너레이터 페이지가 해당 하위 주제를 다루지 않아 적용 대상이 아니었다.

### 코드 리뷰
- High 1건(html 요약이 모든 input으로 읽혀 예제 3의 체크박스와 모순) 수정 후 재리뷰 통과. Low 2건(number-type "셋 중 하나" 뉘앙스, equality 둘째 문장 주어)은 160자 제한 때문에 보고만 하고 남겼다.

### 후속 작업
- [ ] number-type 요약의 "아주 큰 정수" 표현(미확정 사항) 유지 여부
- [ ] Low 2건 문구를 160자 안에서 다듬을지 여부

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] html 요약을 "input"이 아니라 "텍스트 입력류"로 한정 — 검토 수정안의 "input의 value 프로퍼티"는 체크박스(default/on 모드)처럼 value 대입이 어트리뷰트를 바꾸는 타입까지 덮어 같은 페이지 예제 3과 모순되므로, 본문 용어(`html-attribute-dom-property/content.mdx:50`)를 따랐다.
- [Claude 판단] 이벤트 요약에서 검토 수정안("버블링하는 이벤트는 …")을 쓰지 않음 — DOM 디스패치는 bubbles와 상관없이 경로를 두 번 순회하고 버블 순회에서 타깃이 아닌 항목만 건너뛰므로(`event-propagation-delegation/content.mdx:20,68`), "두 번 지난다"는 유지하고 건너뛰는 조건을 덧붙였다.
- [무검토 승인] Date는 제목·goals에 "2026년"만 넣고 윤년 결과(3월 2일)는 본문에 쓰지 않음 — 예제로 검증하지 않는 새 출력 주장이 되기 때문(계획 3절).
- [무검토 승인] 화살표 함수에 "제너레이터 메서드에는 prototype이 있다"를 넣으며 `concept.test.ts`에 실행 검증 추가 — 본문의 새 결과 주장은 실제 실행으로 확인한다는 정확성 원칙. 비교표는 그대로 두고 "메서드 축약" 칸이 일반 메서드 기준임을 단순화에 밝혔다.
- [무검토 승인] Set과 Map은 고치지 않음 — 본문 17행이 이미 ES2024/ES2025 판의 알고리즘 차이를 설명한다.
- [무검토 승인] 예제 해설·Callout처럼 페이지가 범위를 정한 뒤의 문장(`property-keys/content.mdx:269` 등)은 고치지 않고, 요약·goals·정의·개요 문장만 고침 — 요약·goals는 본문 맥락 없이 단독으로 보이기 때문.

#### 배경지식
- HTML의 input `value` IDL 속성은 타입에 따라 모드가 다르다. 텍스트 입력류는 value 모드라 setter가 요소의 값만 바꾸고 dirty value flag를 true로 하며, 체크박스는 default/on 모드라 대입하면 `value` 어트리뷰트가 바뀐다.
- ToPropertyKey는 값을 원시 값(힌트 string)으로 바꾼 뒤 심벌이면 그대로, 아니면 ToString한다.
- IsLooselyEqual(==)에는 null·undefined를 다른 타입으로 바꾸는 단계가 없어, 둘끼리만 true이고 나머지는 마지막 "false 반환"에 이른다.
- 일반·async 메서드 정의는 OrdinaryFunctionCreate만 부르고, 제너레이터·async 제너레이터 메서드는 생성자는 아니지만 제너레이터 객체의 프로토타입이 될 `prototype` 프로퍼티를 따로 정의한다.
- 요약(summary)은 홈 카드와 meta description에 쓰이고 160자 이하가 테스트로 강제된다(`tests/content-integrity.test.ts:61-64`).

#### 확인 질문
1. 검토가 제안한 "input의 value 프로퍼티는 어트리뷰트가 아니라 요소 내부의 값을 바꾸므로…"를 그대로 쓰면 무엇이 틀리나?
   <details><summary>답</summary>체크박스처럼 value가 default/on 모드인 input은 value에 대입하면 어트리뷰트가 바뀐다. 같은 페이지 예제 3의 마지막 줄 "동의 동의"가 그 결과라 요약과 본문이 모순된다(`content.mdx:50,452`). 그래서 "텍스트 입력류"로 한정했다.</details>
2. 버블링하지 않는 focus 이벤트도 "경로를 두 번 지난다"고 써도 되는 이유는?
   <details><summary>답</summary>DOM 디스패치는 bubbles와 상관없이 캡처 순회와 버블 순회를 모두 돈다. bubbles가 false면 버블 순회에서 타깃이 아닌 항목만 continue로 건너뛰고, 타깃은 두 순회에서 다 방문된다(`event-propagation-delegation/content.mdx:20,68`).</details>
3. Date 제목에 연도를 넣는 대신 "윤년이면 3월 2일"을 본문에 덧붙이지 않은 이유는?
   <details><summary>답</summary>출력 결과 주장은 examples/로 실행 검증해야 하는데 윤년 예제가 없다. 새 예제를 만드는 것은 범위 밖이라 제목의 조건(2026년)만 맞췄다(계획 3절, AGENTS.md 정확성 원칙).</details>
4. 화살표 함수 페이지에서 제너레이터 메서드를 제너레이터 페이지 링크로 가리키지 않고 "별도 개념"으로 둔 근거는?
   <details><summary>답</summary>13fc299 규칙은 대상 페이지가 그 하위 주제를 실제로 다룰 때만 링크로 가리키게 한다. generator 페이지는 제너레이터 메서드의 prototype 프로퍼티를 다루지 않는다(계획 `변경 이력`).</details>
5. html 요약에 한 글자를 더 넣으면 무엇이 깨지나?
   <details><summary>답</summary>요약이 정확히 160자라 content-integrity 테스트의 160자 이하 검사가 실패한다(`tests/content-integrity.test.ts:64`).</details>
