# 추가 게시글 'Date' 구현 계획

- 상태: 완료
- 작성일: 2026-11-10
- 기준: `main` @ `b4dad2a`

## 0. 요약

- 목적: `/concepts/date`를 추가해 1월 31일에 `setMonth(1)`을 하면 3월 3일이 되는 이유(월이 0부터 시작하는 것, MakeDay의 필드 넘침)를 중심으로 Date의 시각 값, 문자열 해석, 연산자 변환을 예제 12개와 시뮬레이터로 설명한다
- 범위: 새 개념 폴더 1개(category `objects`, order 277), 순위가 밀리는 테스트 기대값, 빌드·e2e 등록, 25~37장 로드맵 문서 / 공통 코드와 기존 개념 본문은 바꾸지 않음
- 위험: 시간대에 따라 결과가 달라지는 것 — 예제는 시간대와 무관한 값만 출력하고, `concept.test.ts`가 16개 시간대에서 예제를 다시 실행해 같은지 확인한다
- 복잡도: 중간 · Consensus: 생략 (`default-parameters`·`async-generator`의 시뮬레이터 패턴을 따르고 공통 코드 변경이 없음. 구현 뒤 Opus 명세 대조를 수행)
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-10)

- 25~37장 로드맵에서 보류했던 30장 Date를 추가 게시글로 쓴다(보류 사유: "결과가 호스트의 시간대에 따라 달라 실제 실행으로 검증하기 어렵다", `concept-roadmap-ch25-37.md:47`).
- 시간대 검증 방식: **시간대 무관 예제**. 예제는 시간대와 무관한 값(UTC 메서드, 같은지 비교, 로컬 필드 계산)만 출력하고, 이 개념의 `concept.test.ts`가 같은 예제를 여러 TZ로 다시 실행해 결과가 같은지 확인한다. 공통 코드(`tests/helpers`)는 바꾸지 않는다.
- 핵심 질문(제목): **월 넘침** — '1월 31일에 `setMonth(1)`을 하면 왜 3월 3일일까'. 날짜 문자열 해석(날짜만 쓰면 UTC)은 본문에서 다룬다.

### 유지해야 하는 기존 동작

- 공통 코드(`app/simulator/`, `app/components/`, `app/lib/concepts.ts`, `tests/helpers/`)와 기존 개념 본문은 그대로 둔다.
- 기존 개념의 순위는 order 277 뒤쪽이 하나씩 밀린다(`regexp-lastindex` 32 → 33 … `es-modules` 53 → 54). 테스트 기대값만 바꾼다.

### 제외 범위

- `toLocaleString`·`toLocaleDateString` 등 ECMA-402(Intl)가 정하는 결과, 날짜 표시 형식
- `Date.parse`의 비표준 형식(구현 정의 휴리스틱). `new Date('2026-02-30')`이 V8에서 3월 2일이 되는 것(2절)도 쓰지 않는다.
- 서머타임 전환 시각 자체의 처리(UTC(t)의 건너뛴/반복 시각 규칙). 하루 더하기의 차이만 본문 문장 + 근거 테스트로 다룬다.
- 타이머로 시계 만들기(41장, [타이머](/concepts/timers)), `Symbol.toPrimitive`의 일반 규칙(33장), try...catch(47장), Temporal
- `json`·`new-operator` 같은 기존 페이지에 역방향 링크를 넣는 것(9절 후보)

## 2. 사실과 추정

### 사실 (명세 — 현재 초안 ES2027과 ES2026판 사본 대조)

두 판은 아래 절에서 변수 이름만 다르고(`date` → `day`, `t` → `tv`, `dateObject` → `dateObj`) 단계는 같다. 본문은 변수 이름이 아니라 연산 이름과 단계 내용을 쓴다. 사본: 스크래치패드 `spec.html`(초안), `spec2026.html`(2026판). 구현 때 다시 받아 확인한다.

- 시각 값(`#sec-time-values-and-time-range`): 1970-01-01 00:00 UTC부터의 밀리초(정수 Number) 또는 NaN. 하루는 정확히 86,400초로 센다. TimeClip(`#sec-timeclip`)은 절댓값이 8.64 × 10^15를 넘으면 NaN.
- Date 인스턴스(`#sec-properties-of-date-instances`)는 시각 값을 `[[DateValue]]` 내부 슬롯에 담은 일반 객체다.
- LocalTime(`#sec-localtime`): SystemTimeZoneIdentifier()로 정한 시간대의 오프셋을 더해 UTC 시각 값을 로컬 시각으로 바꾼다. 시간대는 호스트가 정한다(시간대 정보가 없으면 "UTC"). Note 2: 시간대를 지원하는 구현은 IANA 시간대 데이터베이스를 써야 한다.
- MakeDay(`#sec-makeday`): 연·월·일이 유한하지 않으면 NaN. 정수로 바꾼 뒤 연에 `floor(월 / 12)`를 더하고 월은 `월 modulo 12`로 맞춘다. 그 연·월의 1일인 시각 값을 찾아 `Day(tv) + 일 - 1`을 돌려준다. 그래서 일이 그 달의 날수를 넘거나 0·음수여도 앞뒤 달로 넘어간다.
- MakeFullYear(`#sec-makefullyear`): 0~99는 1900을 더한다. 생성자(`#sec-date-constructor-date`, 인수 2개 이상)와 `Date.UTC`(`#sec-date.utc`)는 이 연산을 쓴다. `setFullYear`(`#sec-date.prototype.setfullyear`)는 쓰지 않고 연을 그대로 MakeDay에 넘긴다.
- `setMonth`(`#sec-date.prototype.setmonth`): 시각 값이 NaN이면 NaN을 돌려준다. 아니면 LocalTime으로 바꾼 뒤 일을 주지 않았으면 현재 일(DateFromTime)을 쓰고, `MakeDate(MakeDay(현재 연, 새 월, 일), 하루 안의 시각)`을 UTC로 되돌려 TimeClip한 값을 `[[DateValue]]`에 넣고 **그 값을 돌려준다**. Note: 일을 주지 않으면 `getDate()` 값을 준 것처럼 동작한다. `setDate`도 같은 모양이다.
- `setFullYear`: 시각 값이 NaN이면 +0으로 바꿔 계산한다(다른 setter는 NaN을 돌려준다).
- Date 생성자(`#sec-date-constructor-date`): NewTarget이 undefined이면(`new` 없이 호출) 인수와 상관없이 현재 시각의 ToDateString 결과(문자열)를 돌려준다. 인수 1개가 `[[DateValue]]`를 가진 객체면 그 시각 값을 쓴다(복사본 생성). 문자열이면 `Date.parse`와 같은 방식으로 해석한다.
- Date Time String Format(`#sec-date-time-string-format`)과 `Date.parse`(`#sec-date.parse`): "When the UTC offset representation is absent, date-only forms are interpreted as a UTC time and date-time forms are interpreted as a local time." 형식에 맞지 않으면 구현 정의 휴리스틱으로 넘어갈 수 있다. "Strings that are unrecognizable or contain out-of-bounds format element values shall cause this function to return NaN." 두 판 공통.
- `Date.prototype[%Symbol.toPrimitive%]`(`#sec-date.prototype-%symbol.toprimitive%`): "Dates are unique among built-in ECMAScript object in that they treat "default" as being equivalent to "string"". 두 판 공통.
- ToDateString(`#sec-todatestring`): 시각 값이 NaN이면 `"Invalid Date"`. `toISOString`(`#sec-date.prototype.toisostring`): NaN이면 RangeError.

### 사실 (vm 실행 — Node v24.22.1, `runInNewContext`, 스크래치패드 `ex/`·`run.js`)

- 아래 예제 12개를 16개 TZ에서 실행했고 출력이 모두 같았다(출력 해시 동일): UTC, Asia/Seoul, America/New_York, America/Los_Angeles, America/Santiago, America/Sao_Paulo, America/Havana, Asia/Beirut, Pacific/Kiritimati, Pacific/Pago_Pago, Australia/Lord_Howe, Asia/Kathmandu, America/St_Johns, Europe/London, Africa/Casablanca, Pacific/Chatham.
- `process.env.TZ`를 한 프로세스 안에서 바꾸면 그 뒤의 `runInNewContext` 결과에 반영된다(뉴욕 300 → 서울 -540 확인).
- V8에서 `new Date('2026-02-30').getTime()`은 NaN이 아니라 `1772409600000`(2026-03-02 UTC)이다. 명세의 out-of-bounds 문장과 다르므로 페이지에 쓰지 않는다.
- 근거 테스트로 쓸 결과: TZ=America/New_York에서 `new Date(2026, 2, 7, 12)`에 86400000ms를 더하면 `getHours()`가 13, `setDate(+1)`로 더하면 12, 차이는 82800000ms. NaN Date의 `toISOString()`은 RangeError. NaN Date에 `setFullYear(2026)`을 하면 로컬 1월 1일 0시(`0 1 0`). 날짜만 쓴 문자열의 로컬 일: 뉴욕에서 `new Date('2026-11-10').getDate()`는 9, 서울에서는 10(구현 때 테스트로 확인).

| 예제 | 출력 |
| - | - |
| `month-overflow.js` | `0 31` / `2 3` |
| `month-index.js` | `1 1` / `true` |
| `field-overflow.js` | `1 28` / `2027 0` / `2025 11 30` |
| `setter-return.js` | `number true` / `15` |
| `shared-date.js` | `8 true` / `8 1` |
| `iso-date-only.js` | `true` / `true` / `true` / `10 10` |
| `to-primitive.js` | `string number` / `true` / `-1 0` |
| `compare-dates.js` | `false false` / `true true` / `true` |
| `call-without-new.js` | `string object` / `string number` |
| `invalid-date.js` | `NaN Invalid Date` / `NaN NaN` / `true` |
| `two-digit-year.js` | `1999` / `100` / `99` |
| `time-value.js` | `1970-01-01T00:00:00.000Z` / `1970-01-02T00:00:00.000Z` / `28` |

예제 원문(스크래치패드 `ex/`에 그대로 있음, 구현 때 옮겨 쓴다):

- `month-overflow.js`: `const d = new Date(2026, 0, 31);` / `console.log(d.getMonth(), d.getDate());` / `d.setMonth(1);` / `console.log(d.getMonth(), d.getDate());`
- `month-index.js`: `new Date(2026, 1, 10)`과 `new Date('2026-02-10T09:00')`의 `getMonth()`, `getDate()` 비교
- `field-overflow.js`: `new Date(2026, 2, 0)`(월·일), `new Date(2026, 12, 1)`(연·월), `new Date(2026, 0, -1)`(연·월·일)
- `setter-return.js`: `setDate(15)`의 반환값 `typeof`, `=== d.getTime()`, 바뀐 `getDate()`
- `shared-date.js`: `const end = start`로 같은 객체를 가리킨 뒤 `end.setDate(end.getDate() + 7)`, `new Date(start)`로 만든 객체는 따로 바뀜
- `iso-date-only.js`: `new Date('2026-11-10')`이 `Date.UTC(2026, 10, 10)`와 같음, `new Date('2026-11-10T00:00')`이 `new Date(2026, 10, 10)`과 같음, 둘의 차이가 `getTimezoneOffset() * 60000`, `getUTCDate()`와 `getDate()`가 둘 다 10
- `to-primitive.js`: `new Date(0)`에 `+ 1`(문자열), `- 1`(숫자), `d + 1 === String(d) + '1'`, `d - 1`, `d * 1`
- `compare-dates.js`: 같은 시각의 두 Date에 `===`·`==`는 false, `getTime()`·단항 `+`는 true, `<=`와 `>=`는 true
- `call-without-new.js`: `typeof Date()`, `typeof new Date()`, `typeof Date(2000, 0, 1)`, `typeof Date.now()`
- `invalid-date.js`: `new Date('not a date')`의 `getTime()`·`String()`, `setDate(1)`의 반환값과 그 뒤 `getMonth()`, `new Date(2026, 0, NaN)`
- `two-digit-year.js`: `new Date(99, 0, 1)`, `new Date(100, 0, 1)`, `setFullYear(99)`
- `time-value.js`: `new Date(0)`, `new Date(24 * 60 * 60 * 1000)`의 `toISOString()`, 두 UTC 날짜를 뺀 값 / 86400000

### 코드

- 개념 폴더 구성과 시뮬레이터 패턴: `app/concepts/default-parameters/`(`scenarios.ts`, `DefaultParametersView.tsx`, `Simulator.tsx`, `concept.test.ts`, 각 `.test.tsx`).
- 예제 실행기: `tests/helpers/run-example.ts:6-17` — 예제마다 새 vm 컨텍스트, `console.log`를 `util.format`으로 수집. 같은 함수로 TZ별 재실행을 한다.
- Vitest 설정: `vitest.config.ts` — node 프로젝트(`app/**/*.test.ts`). 풀 기본값(forks)에서 테스트 파일은 워커 프로세스에서 하나씩 실행된다.
- order: `number-pitfalls` 275(`app/concepts/number-pitfalls/meta.ts:12`), `regexp-lastindex` 280. 277이 31번째 다음, 즉 32번째가 된다.
- 순위·개수 고정 테스트: `app/lib/concepts.test.ts:104-112`(total 53), `app/components/concept/ConceptPager.test.tsx:18,28`(`/ 53`), `tests/e2e/navigation.spec.ts:78,84,139` 등(53개, 순위 32~53 블록, `number-pitfalls` 다음 링크 `:291`, `regexp-lastindex` 이전 링크 `:303`).
- 빌드 검사 패턴: `tests/build/build-output.test.ts:946`(`number-pitfalls` 프리렌더), `:1308`(`async-generator` 시뮬레이터 프리렌더).
- e2e 등록: `tests/e2e/helpers.ts:59-60`(경로·영역 이름 상수), `a11y.spec.ts:772-781`, `responsive.spec.ts`, `docs/content-guide.md`의 e2e 대상 목록.
- 전제 개념 페이지: `primitives-and-objects`(재할당과 변경), `type-coercion`(ToPrimitive를 한 문장으로 소개하고 "직접 정한 경우는 다루지 않는다"고 적음, `type-coercion/content.mdx:75`), `equality-operators`, `new-operator`(`new-operator/content.mdx:341`에 Date를 `new` 없이 부르면 문자열이라는 언급).

### 추정

- Vitest forks 워커에서도 `process.env.TZ` 변경이 같은 프로세스의 vm 실행에 반영될 것이다 — 근거: 일반 Node 프로세스에서 확인. 작업 순서 2의 완료 조건에서 확인한다(`America/New_York`에서 `getTimezoneOffset()`이 300이 되는지 단언).

## 3. 구현 전략

- `default-parameters` 구성을 따른다. 상태 타입, 시나리오, 시각화 `DateFieldsView`, 얇은 `Simulator.tsx`, `concept.test.ts`.
- **시각화는 시각 값 숫자가 아니라 로컬 필드(연·월·일)만 그린다.** 시각 값은 시간대마다 다른 숫자라 페이지에 고정된 값으로 쓸 수 없다. 시나리오는 정적 데이터이고, 뷰는 렌더 중에 `Date`를 부르지 않는다. 브라우저에서 `Date`를 쓰면 프리렌더한 빌드 기계의 시간대와 독자의 시간대가 달라 하이드레이션이 어긋난다.
- 시뮬레이터 시나리오 2개: `month-overflow`(제목 질문, `setMonth`가 LocalTime으로 필드를 읽어 MakeDay로 다시 계산), `field-overflow`(생성자 인수 3가지 넘침). 단계마다 MakeDay 계산 칸(입력 연·월·일 → 맞춘 연 `연 + floor(월/12)`·월 `월 modulo 12` → 그 달 1일 → `+ (일 - 1)`일 → 결과)을 보인다.
- 시간대 검증: `concept.test.ts`가 2절의 16개 TZ마다 `process.env.TZ`를 바꾸고 `meta.examples`의 모든 예제를 `runExample`로 실행해 `expectedOutput`과 비교한다. `finally`에서 원래 값으로 되돌린다(원래 없었으면 `delete`).
- 시간대에 따라 결과가 갈리는 주장(날짜만 쓴 문자열의 로컬 일, 서머타임에서 하루 더하기)은 예제가 아니라 본문 문장 + 특정 TZ를 고정한 근거 테스트로 둔다. 본문에는 어느 시간대에서 확인했는지 밝힌다.
- 버린 대안: 테스트 TZ를 하나로 고정(공통 코드 변경, 독자 환경과 결과가 다를 수 있음 — 사용자 결정). 브라우저 런타임 예제(순수 ECMAScript 동작이라 필요 없음). 입력을 받아 계산하는 보기(`number-pitfalls`의 판정 보기 형식): 브라우저에서 계산하면 위 하이드레이션 문제가 생기고, 예제 줄과 묶이는 시뮬레이터가 이 주제에 맞다.

## 4. 변경 파일

- 추가: `app/concepts/date/`의 `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `DateFieldsView.tsx`, `DateFieldsView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`, `examples/*.js` 12개
- 수정: `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `tests/e2e/navigation.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `docs/content-guide.md`(e2e 대상 목록) — 개수·순위·새 페이지 등록
- 수정: `.claude/plans/concept-roadmap-ch25-37.md` — 보류 목록의 30장 항목과 진행 기록
- 변경하지 않음: `app/simulator/`, `app/components/`(테스트 제외), `app/lib/concepts.ts`, `tests/helpers/`, 기존 개념 폴더(`json`, `new-operator`, `type-coercion`의 문장은 그대로 사실이다)

## 5. 위험 요소

- 시간대에 따라 출력이 달라지는 예제를 쓴다 → 예제 12개를 16개 TZ로 재실행하는 테스트(작업 순서 2). 예제를 고치면 이 테스트가 바로 잡는다.
- TZ를 바꾸는 테스트가 다른 테스트에 새어 나간다 → `try/finally`로 복원하고, TZ 테스트는 이 파일 안에서만 한다. 다른 테스트 파일은 별도 워커 프로세스다.
- 하이드레이션 불일치: 뷰나 시나리오가 렌더 중에 `Date`의 로컬 메서드를 부르면 빌드 기계와 독자의 시간대가 달라 마크업이 달라진다 → 시나리오는 숫자·문자열 리터럴만 담고, `DateFieldsView`는 `Date`를 쓰지 않는다(작업 순서 2 주의사항, 리뷰 때 `grep -n "new Date\|Date\." app/concepts/date/*.tsx app/concepts/date/scenarios.ts` 결과 0건).
- 일반화의 예외: 두 자리 연도는 생성자와 `Date.UTC`에서만 1900년대이고 `setFullYear`는 그대로다. 다른 setter는 Invalid Date에서 NaN이지만 `setFullYear`는 +0에서 계산한다. 형식에 맞지 않는 문자열은 구현 정의다 → '두 자리 연도는 항상 1900년대', 'Invalid Date의 setter는 모두 NaN', '이상한 문자열은 NaN'처럼 쓰지 않는다(작업 순서 3).
- 틀린 모델을 통과시키는 예제: `month-overflow.js`는 '다음 달로 옮긴다'와 '말일로 맞춘다' 두 틀린 모델을 모두 배제해야 한다 → 출력 `2 3`이 2월 말일(`1 28`)도 3월 1일도 아님을 본문에 쓴다. `shared-date.js`는 `const`라서 안 바뀐다는 모델을 배제한다. `iso-date-only.js`는 '항상 로컬 자정' 모델을 배제한다(첫 줄 true).
- 원인 설명: Date 결과를 "복사해서/공유해서"로 설명하지 않는다(AGENTS.md). `shared-date.js`는 '같은 객체를 변경했다', `new Date(start)`는 '생성자가 그 객체의 시각 값을 읽어 새 객체를 만들었다'로 쓴다.
- 언어와 호스트 구분: 시간대는 호스트가 정한다(SystemTimeZoneIdentifier). `console.log`, IANA 데이터는 명세 밖의 호스트 자원으로 표현한다.
- 장 범위: `Symbol.toPrimitive`(33장)는 '명세가 Date에만 default를 문자열로 다루게 정했다'까지만 쓰고 `simplifications`에 적는다. try...catch를 예제에 쓰지 않는다(RangeError는 본문 문장 + 근거 테스트).
- 줄 번호 → 시나리오 작성 뒤 예제를 고치면 `line`이 어긋난다 → `assertScenarioInvariants`(작업 순서 2).
- PredictQuiz 문자열의 작은따옴표, Callout 안 인라인 코드 줄바꿈 → `test:build`와 가이드의 `grep` 확인(작업 순서 5).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 새 개념 추가 범위(`AGENTS.md`)대로 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "date|Date|홈 학습 순서 보기"`. `-g` 패턴은 추가한 테스트 이름에 맞춰 구현 때 확정한다. 공통 코드를 건드리지 않았는지 `git diff --stat`으로 확인한다.
- 시간대: `TZ=America/New_York npm test -- app/concepts/date`와 `TZ=Asia/Seoul npm test -- app/concepts/date`가 모두 통과(테스트 프로세스 자체의 TZ와 무관함을 확인).
- 브라우저: dev 서버를 재시작한 뒤 `/concepts/date`에서 ① JS 없이 프리렌더 HTML에 시뮬레이터 첫 단계가 있다 ② '1월 31일에 setMonth(1)' 시나리오를 끝까지 넘기면 MakeDay 칸이 `2026, 1, 31` → `2026-02-01` → `+30일` → `2026-03-03`을 보이고 마지막 출력이 `0 31`, `2 3`이다 ③ '생성자 인수 넘침' 시나리오의 마지막 출력이 `1 28`, `2027 0`, `2025 11 30`이다 ④ 375px에서 페이지 가로 스크롤이 없다 ⑤ 다크 모드에서 칸 글자가 읽힌다
- 명세: Opus 서브에이전트에 명세 사본(현재 초안, ES2026판) 경로를 주고 본문·시나리오와 대조한다.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 메타와 예제

- 대상: `date/meta.ts`, `examples/*.js` 12개, `route.tsx`
- 현재: 폴더 없음
- 변경: 2절의 예제 12개를 스크래치패드 원문 그대로 만든다(파일 끝 줄바꿈 하나). `meta.ts`는 slug `date`, title `Date: 1월 31일에 setMonth(1)을 하면 왜 3월 3일일까`, category `objects`, order 277, prerequisites `primitives-and-objects`, `type-coercion`, `equality-operators`, `new-operator`, related `json`, `type-coercion`, `number-pitfalls`, `new-operator`, `reviewedAt: null`. summary(160자 이하, 안): "Date는 시각 값 하나를 담고, setMonth는 연·월·일을 다시 계산해 넘친 날을 다음 달로 보냅니다. 날짜 문자열이 UTC로 읽히는 경우와 Date가 연산자에서 바뀌는 방식을 명세와 실행 결과로 확인합니다." goals 4개(월 넘침과 MakeDay / 시각 값과 로컬·UTC 필드 / 문자열 해석 규칙 / 연산자 변환과 비교). simplifications: 시각 값 대신 로컬 필드만 그림, UTC 변환 단계를 한 칸으로 줄임, 시·분·초 생략, 서머타임 전환 규칙 생략, `Symbol.toPrimitive`는 33장 별도 개념, Intl 결과 제외, 비표준 문자열 형식 제외, 예제 `console.log`는 호스트 API. references: 2절 앵커 중 본문에 쓴 것 + MDN ko Date·`setMonth`·`Date.parse`(링크는 실제로 열어 확인, 안 되면 en-US).
- 이유: 실제 출력이 이후 모든 서술의 근거다.
- 주의사항: `console.log`에는 원시 값만 넘긴다. 타이머·try...catch를 쓰지 않는다. title·summary·tags에 '객체'를 쓰지 않는다(홈 검색 e2e가 '객체' 검색 결과 16개를 고정한다, `navigation.spec.ts:17,32,91,126`). `meta.ts` → `content.mdx`(필수 h2만) → `route.tsx` 순으로 만든다.
- 완료 조건: `npx vitest run tests/examples.test.ts -t date`에서 `date` 예제 12개가 2절 표의 출력과 일치.

### 2. 시나리오, 시각화, 시간대 테스트

- 대상: `scenarios.ts`, `DateFieldsView.tsx`, `DateFieldsView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태: `{ dates: { name: string; fields: { year: number; month: number; day: number } }[]; calc: null | { label: string; input: Fields; balancedYear: number; balancedMonth: number; firstOfMonth: Fields; addDays: number; result: Fields } }`. `month`는 Date의 0부터 세는 월이고, 뷰는 `1월`처럼 사람이 읽는 월을 함께 쓴다(예: `1 (2월)`).
  - 시나리오 `month-overflow`(`month-overflow.js`): 시작 → 1행 생성자 MakeDay(2026, 0, 31) → 2행 출력 `0 31` → 3행 LocalTime으로 필드 읽기(연 2026, 일 31) → MakeDay(2026, 1, 31): 맞춘 연·월 2026·1, 그 달 1일 2026-02-01, +30일 → 2026-03-03 → `[[DateValue]]`에 저장 → 4행 출력 `2 3`.
  - 시나리오 `field-overflow`(`field-overflow.js`): 세 생성자마다 MakeDay 계산 단계와 출력 단계. `new Date(2026, 0, -1)`은 2026-01-01에서 `-2`일 → 2025-12-30.
  - `concept.test.ts`: ① `assertScenarioInvariants` ② 단계마다 `calc`가 MakeDay 규칙과 맞는지(`balancedYear = year + Math.floor(month / 12)`, `balancedMonth = ((month % 12) + 12) % 12`, `result`가 `Date.UTC(balancedYear, balancedMonth, 1) + addDays * 86400000`의 UTC 필드와 같은지 — UTC 계산이라 TZ 무관) ③ 마지막 단계의 `dates`가 예제를 실제로 실행한 로컬 필드와 같은지 ④ 16개 TZ에서 `meta.examples` 전체 재실행 결과가 `expectedOutput`과 같음, 그리고 `America/New_York`에서 `new Date(2026, 10, 10).getTimezoneOffset()`이 300이고 `Asia/Seoul`에서 -540임(TZ 전환이 실제로 일어났다는 확인) ⑤ 본문 근거 테스트: 뉴욕·서울에서 `new Date('2026-11-10').getDate()`가 9·10, 뉴욕에서 서머타임 하루 더하기 13·12, NaN Date의 `toISOString` RangeError(vm 오류는 `name`으로 비교 — `default-parameters/concept.test.ts:15-22` 패턴), NaN Date의 `setFullYear(2026)` 결과 `0 1 0`, `Date.UTC(99, 0, 1)`의 UTC 연 1999. TZ를 바꾸는 테스트는 모두 `try/finally`로 복원한다.
  - `DateFieldsView`: `calc`가 있으면 계산 칸을 순서대로 보이고 이전 단계와 바뀐 칸에 "(바뀜)" 텍스트를 단다. 색만으로 구분하지 않는다.
- 이유: MakeDay의 넘침은 코드 한 줄에 숨어 있어 단계로 펼쳐야 보이고, 불변식 테스트가 시각화 내용을 명세 규칙에 묶는다.
- 주의사항: 시나리오·뷰에서 `Date`를 쓰지 않는다(5절 하이드레이션). 375px에서 넘치지 않게 계산 칸은 세로로 쌓는다. 단계 설명에 'UTC로 되돌리는 단계는 한 칸으로 줄였다'를 밝힌다.
- 완료 조건: `npx vitest run app/concepts/date` 통과, ④의 TZ 전환 단언이 통과(2절 추정 해소), `grep -n "new Date\|Date\." app/concepts/date/scenarios.ts app/concepts/date/*.tsx` 0건.

### 3. 본문

- 대상: `content.mdx`
- 현재: 필수 h2만
- 변경: 도입(질문, 페이지 구성, 전제 개념 링크, 다루지 않는 것). `## 동작 원리` h3: ① Date는 시각 값 하나를 담는다(`time-value.js`) ② 연·월·일은 시각 값을 시간대로 풀어 읽은 값이다(LocalTime, getX/getUTCX, 시간대는 호스트가 정함) ③ 월은 0부터 센다(`month-index.js`, 문자열의 `MM`은 01부터) ④ 범위를 넘은 필드는 다음 단위로 넘어간다(MakeDay, `field-overflow.js` + 시뮬레이터) ⑤ setter는 나머지 필드를 그대로 두고 다시 계산한다(`month-overflow.js` + 시뮬레이터, `setter-return.js`, 피하는 방법: `setMonth(1, 1)`처럼 일을 함께 주기) ⑥ Date는 변경할 수 있는 객체다(`shared-date.js`) ⑦ 날짜 문자열: 날짜만 쓰면 UTC, 시각까지 쓰면 로컬(`iso-date-only.js`, 뉴욕·서울 근거 문장) ⑧ 연산자 안의 Date(`to-primitive.js`, `compare-dates.js`) ⑨ `new` 없이 부르면 문자열(`call-without-new.js`) ⑩ Invalid Date(`invalid-date.js`, `setFullYear` 예외, `toISOString` RangeError 문장) ⑪ 두 자리 연도(`two-digit-year.js`) ⑫ 하루 더하기: 86400000ms와 `setDate`(뉴욕 서머타임 근거 문장, 예제 없음) ⑬ 이 페이지가 다루지 않는 것. `## 예제`: 예제마다 PredictQuiz, 시뮬레이터 2회. `## 결과와 이유`: 예제별 h3(줄 번호를 예제 파일과 맞춤) + 흔한 오해 Callout(`setMonth(m)`은 m월 같은 날로 옮긴다 / 날짜만 쓴 문자열은 로컬 자정이다 / `const`면 날짜가 안 바뀐다 / 같은 시각이면 `===`가 true다).
- 이유: 페이지 구조 규칙(필수 h2)과 사용자가 정한 핵심 질문을 따른다.
- 주의사항: 인용은 2절에서 두 판 공통으로 확인한 문장만 쓴다. '테스트가 확인합니다'류 저자 메모를 쓰지 않는다(검증 범위를 밝히는 사실 문장은 '뉴욕 시간대에서 실행하면'처럼 실행 조건으로 쓴다). '복사해서'로 설명하지 않는다. 퀴즈 정답 위치를 섞고 `expectedOutput`과 스크립트로 대조한다. `overflow-x-auto` 표는 `tabIndex`, `role="region"`, `aria-label`을 처음부터 넣는다. 첫 문단에 `**`가 들어가는 코드를 쓰지 않는다.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, 퀴즈 정답 대조 스크립트 불일치 0건, 퀴즈 정답 위치가 한 곳에 몰리지 않음, `grep -n "복사\|테스트가" app/concepts/date/content.mdx` 결과가 설명을 위한 문장뿐(저자 메모 0건).

### 4. 순위 테스트, 빌드·e2e 등록

- 대상: `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `navigation.spec.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch25-37.md`
- 현재: 53개 기준, 새 페이지 미등록
- 변경: 개수 53 → 54. `navigation.spec.ts:98-115`의 '객체' 검색 순위 목록은 32번째 이후 항목(`35`, `36`, `37`, `46`, `49`)을 하나씩 올린다(`36`, `37`, `38`, `47`, `50`). 검색 결과 개수 16은 그대로다(새 meta의 title·summary·tags에 '객체'가 없으므로 — 검색 대상 필드 `app/lib/concepts.ts:90-92`). `navigation.spec.ts`는 `number-pitfalls`의 다음 링크를 `/concepts/date`로, `date` 블록(32 / 54, 이전 `number-pitfalls`, 다음 `regexp-lastindex`)을 추가하고, `regexp-lastindex`의 이전 링크를 `/concepts/date`로, 그 뒤 순위를 하나씩 올린다. 빌드 검사는 `async-generator` 항목을 본떠 시뮬레이터 첫 단계와 퀴즈 `<details`를 확인한다. e2e는 a11y(시뮬레이터 진행 후 포함), 가로 스크롤을 등록한다. 로드맵 문서 30장 항목에 추가 게시글로 구현했다고 기록한다.
- 이유: 새 페이지는 경로를 직접 등록해야 검사되고, 순위 고정 테스트가 깨진다.
- 주의사항: 기존 케이스는 고치지 않고 개수·순위·링크만 바꾼다. dev 서버를 재시작한다.
- 완료 조건: `npm test` 통과, `npm run test:build` 통과, 6절 e2e 명령 통과.

### 5. 전체 검증

- 대상: 전체
- 변경: 6절의 정적·시간대·e2e·브라우저 검증을 모두 실행한다.
- 주의사항: e2e는 부하에 따라 90초 시간 초과가 날 수 있다. 재실행해 구분하고 보고에 적는다.
- 완료 조건: 6절 명령 모두 통과, 브라우저 시나리오 ①~⑤ 확인(스크린샷).

### 6. 명세 대조

- 대상: `content.mdx`, `meta.ts`, `scenarios.ts`
- 현재: 구현자 자체 점검만 끝난 상태
- 변경: Opus 서브에이전트에 현재 초안과 명세 사본 두 판의 경로를 주고, 서술의 조건·분기 누락, 틀린 모델을 통과시키는 예제, 언어와 호스트 구분의 오류를 찾게 한 뒤 메인이 원문과 실행으로 재확인해 반영한다.
- 이유: 이전 개념들에서 예제 출력이 아니라 서술의 범위와 인과에서 지적이 나왔다.
- 주의사항: 제안 문장을 그대로 쓰지 않는다.
- 완료 조건: 지적마다 수용·기각과 근거를 `구현 진행`에 기록.

## 9. 추가 개선 후보

- 역방향 링크: `json`(Date의 `toJSON`)과 `new-operator`(`content.mdx:341`, Date를 `new` 없이 부르면 문자열)의 `related`에 `date`를 넣는다. 기존 페이지라 이번 범위에서 뺐다.

## 변경 이력

- 2026-11-10 (사용자 검토 7건): 명세(두 판)·vm 실행으로 확인 후 반영 — 작업 순서 2·3. ① '시각 값은 시간대마다 다른 숫자' → 로컬 자정을 가리키는 코드라 만드는 시각 값이 실행 시간대마다 다르다(시나리오 안내·simplifications·주석) ② Date와 원시 값의 `==`는 기본 힌트로 문자열이 된다(`d == d.getTime()` false, `d == String(d)` true) ③ IANA Note는 "required for time zone aware implementations (and recommended for all others)"라 '써야 한다'는 맞음 — 권장 부분만 덧붙임 ④ `getTimezoneOffset()`은 UTC − 로컬 분 값(서울 −540)임을 예제 7에 ⑤ '31일 더하기' 반증 단락을 `setMonth(3)` → 4월 31일 → 5월 1일(`4 1`) 대조로 교체 ⑥ 구현 정의 범위를 명세 형식이 아니면서 그 구현의 `toString`·`toUTCString`이 만들 수 없는 문자열로 좁힘(Date.parse 원문) ⑦ TimeClip이 소수부를 버린다(0 쪽으로, `new Date(1.9)` → 1)
- 2026-11-10 (사용자 재검토 2건): '연산자 안의 Date' 둘째 문단의 문장 순서를 바꿔 '그래서'가 '같은 객체인지만 본다'에 걸리게 함. `toString`·`toUTCString` 되읽기에 '밀리초가 0인 Date' 조건 추가(Date.parse 원문 "If x is any Date whose milliseconds amount is zero", 두 판 공통) — 작업 순서 3

## 구현 진행

- baseline (2026-11-10, `b4dad2a`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 146 파일 4448 테스트 통과. test:build·e2e는 작업 순서 4·5에서 실행
- [x] 1. 메타와 예제 — 예제 12개 스크래치패드 원본과 `cmp` 동일, `tests/examples.test.ts`·`content-integrity` 통과(메인 재실행), meta 확인
- [x] 2. 시나리오, 시각화, 시간대 테스트 — `npx vitest run app/concepts/date` 통과(메인 재실행, 5파일 1214 테스트에 포함), 뉴욕 300·서울 -540 TZ 전환 단언 통과(2절 추정 해소), `grep "new Date\|Date\."` 0건. 단계를 계획보다 잘게 나눔(`d 초기화`, `setMonth: 로컬 필드 읽기`), 시나리오 설명 문자열의 `new Date(...)` 표기를 '생성자(…)'로 씀
- [x] 3. 본문 — 퀴즈 12개 정답 대조 불일치 0건, 정답 위치 0·1·2·3 각 3개, 저자 메모 문구 grep 0건. 메인 검토로 2곳 수정: Invalid Date setter 예외를 `setFullYear`만으로 쓴 일반화(`setUTCFullYear`·`setTime`도 NaN을 돌려주지 않음 — 실행 확인 후 근거 테스트 추가), 하루 더하기 조건을 '서머타임 전환이 없으면' → '그 하루 사이에 오프셋이 바뀌지 않으면'
- [x] 4. 순위 테스트, 빌드·e2e 등록 — `git diff --stat` 9개 파일(의도한 대상만), concepts·ConceptPager 테스트 통과. `responsive.spec.ts`의 홈 카드 개수 53도 54로 갱신
- [x] 5. 전체 검증 — lint·format:check·typecheck 통과, `npm test` 149 파일 4525 테스트 통과, `test:build` 436 통과, navigation e2e 16 통과, `-g "date|Date|홈 학습 순서 보기"` 16 통과(재실행). 1차 e2e에서 8건 실패: 본문이 시뮬레이터를 두 번(시나리오 하나씩) 넣어 같은 이름의 region이 2개 → 다른 개념처럼 `<Simulator scenarios={scenarios} />` 하나로 합침(계획의 '시뮬레이터 2회'는 '시나리오 2개를 한 시뮬레이터에서'로 해석). 빌드 검사 퀴즈 개수 하한 1 → 12. 브라우저(dev): 첫 시나리오 8단계 끝 출력 `0 31`·`2 3`, MakeDay 칸 확인, 375px·라이트 모드에서 둘째 시나리오 10단계 끝 출력 `1 28`·`2027 0`·`2025 11 30`, 페이지 가로 스크롤 없음(375=375, 1024=1024), 콘솔 오류 0
- [x] 6. 명세 대조 — Opus: REVISE(MEDIUM 3, LOW 9). 메인이 명세 원문·실행으로 재확인 후 모두 수용:
  - (M) goals와 h3 제목에 '명세 형식·오프셋이 없을 때' 조건 추가, 본문에 `Z`·`+09:00` 오프셋 문자열은 그 오프셋을 따른다는 문장 + 근거 테스트
  - (M) '비교도 같은 변환을 거친다' → 변환은 크기 비교만, `===`와 두 객체의 `==`는 변환 없음
  - (M) '호스트' 표현: 명세상 SystemTimeZoneIdentifier는 implementation-defined이며 "host environment's current time zone"을 돌려줌 → 시간대 설정은 실행 환경, 오프셋·서머타임 규칙은 구현이 정한다로 구분(본문·simplifications). 근거 없는 '시계는 호스트가 제공' 문장 삭제
  - (L) 인용문 출처를 Date.parse로, setFullYear의 NaN 처리를 'LocalTime 없이 +0에서 출발'로, 부록 B `setYear` 언급 + 근거 테스트, 월 0~11을 인수 제한처럼 쓴 문장 수정, 예제 4가 '31일 더하기' 모델은 못 가린다는 점과 `setMonth(2)` → `2 31` 근거(테스트 추가), 예제 7의 구분력은 UTC가 아닌 시간대에서만, `Date(2000, 0, 1)`이 인수를 쓰지 않는다는 근거 테스트, 뒷장 개념(JSON·타이머·try...catch·Temporal·setYear)을 simplifications에, MakeDay의 범위 밖 NaN 분기와 생성자의 MakeFullYear 단계를 본문·시나리오에, 시나리오 '2월 31일이 없어' 인과 표현 수정
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0. Low 1건 보고 — `concept.test.ts:14` 주석 '시간대는 호스트가 정한다'가 본문의 용어 구분(실행 환경/구현)과 다름(동작 영향 없음)
- 최종 검증(명세 대조 반영 뒤): lint·format:check·typecheck 통과, `npm test` 149 파일 4529 테스트, `test:build` 436, navigation e2e 16, date 관련 e2e 16 모두 통과
- 사용자 검토 1회(7건) 반영: 변경 이력 참고. 근거 테스트 5개 추가(`setMonth(3)` → `4 1`, Date와 원시 값의 `==`, TimeClip 소수부, 서울 `getTimezoneOffset()` −540과 차이 부호, `toString`·`toUTCString` 되읽기 3개 시간대). 검증: lint·format:check·typecheck 통과, `npm test` 4533, `test:build` 436, navigation e2e 16, date 관련 e2e 16 통과

## 구현 결과

### 계획 대비 실제 구현
- 계획한 범위(예제 12개, 시나리오 2개 시뮬레이터, 퀴즈 12개, 16개 시간대 재실행 테스트, 순위·빌드·e2e 등록)를 모두 구현했다. 계획의 '시뮬레이터 2회'는 e2e에서 같은 이름 region 2개로 실패해, 다른 개념처럼 시뮬레이터 하나에 시나리오 2개를 두는 방식으로 바꿨다.
- Opus 명세 대조 12건과 사용자 검토 2회(7건·2건)를 반영하며 근거 테스트를 계획보다 늘렸다(`setMonth(1, 1)`·`setMonth(3)`, `Z` 오프셋, `Date()` 인수 무시, `setYear`·`setUTCFullYear`·`setTime`, `==` 변환, TimeClip 소수부, `getTimezoneOffset()` 부호, `toString`·`toUTCString` 되읽기). `reviewedAt` 2026-11-10.

### 코드 리뷰
- critical-code-review: Critical·High 0. Low 1건(`concept.test.ts:14` 주석의 '호스트' 표현)은 동작 영향이 없어 남겼다.

### 후속 작업
- [ ] `json`·`new-operator`의 `related`에 `date` 역방향 링크 추가 여부 결정(9절 후보)
- [ ] `concept.test.ts:14` 주석을 본문의 용어 구분(시간대 설정은 실행 환경, 오프셋 규칙은 구현)에 맞출지 결정

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 본문이 시뮬레이터를 두 번(시나리오 하나씩) 넣던 것을 `<Simulator scenarios={scenarios} />` 하나로 합쳤다 — 대안은 region 이름을 둘로 나누는 것. 다른 모든 개념이 시뮬레이터 하나에 시나리오 선택을 쓰고, 같은 이름의 region 2개는 e2e 셀렉터 충돌과 접근성 문제를 만든다.
- [Claude 판단] 시간대 설명에서 '호스트'를 둘로 나눴다 — 명세는 SystemTimeZoneIdentifier를 implementation-defined로 두고 "host environment's current time zone"을 돌려준다고 적는다. 그래서 어느 시간대인지는 실행 환경이, 오프셋·서머타임 규칙은 구현(IANA 데이터)이 정한다고 썼다. 근거 없는 '시계는 호스트가 제공' 문장은 뺐다.
- [Claude 판단] Invalid Date에서 NaN을 돌려주지 않는 setter를 `setFullYear`만으로 쓰지 않고 `setUTCFullYear`·`setTime`(그리고 부록 B `setYear`)까지 밝혔다 — 일반화의 예외를 실행으로 찾은 뒤 근거 테스트로 묶었다.
- [무검토 승인] 시뮬레이터는 시각 값 숫자 대신 로컬 연·월·일만 그리고, 시나리오·뷰에서 `Date`를 부르지 않는다 — 로컬 시각을 가리키는 코드는 시간대마다 다른 시각 값을 만들고, 렌더 중에 `Date`를 쓰면 빌드 기계와 독자의 시간대가 달라 하이드레이션이 어긋난다.
- [무검토 승인] 시간대에 따라 갈리는 주장(뉴욕 9·서울 10, 서머타임 하루 더하기 13·12)은 예제가 아니라 본문 문장 + 시간대를 고정한 근거 테스트로 둔다. V8이 `'2026-02-30'`을 받아들이는 비표준 동작은 쓰지 않는다.
- 예제는 시간대와 무관한 값만 출력하고 16개 시간대에서 재실행해 확인하는 방식, 제목 질문은 월 넘침 — 사용자가 직접 골랐다. 사용자 검토로 `==` 변환, `getTimezoneOffset()` 부호, `toString`·`toUTCString` 되읽기 조건, TimeClip 정수화 등을 고쳤다.

#### 배경지식
- MakeDay는 연에 `floor(월 / 12)`를 더하고 월을 `월 modulo 12`로 맞춘 뒤, 그 달 1일에 `일 - 1`일을 더한다. 날짜가 존재하는지 검사하지 않으므로 2월 31일은 3월 3일, 4월 31일은 5월 1일이 된다.
- setter는 LocalTime으로 현재 필드를 읽고, 바꾸지 않는 필드는 그대로 둔 채 MakeDay로 다시 계산해 `[[DateValue]]`를 바꾸고 새 시각 값을 돌려준다.
- 오프셋 없는 명세 형식 문자열은 날짜만이면 UTC, 시각까지면 로컬로 읽는다. `getTimezoneOffset()`은 `(UTC − 로컬) / 분`이라 LocalTime이 더하는 오프셋과 부호가 반대다(서울 −540).
- Date의 `[Symbol.toPrimitive]`는 default 힌트를 string으로 다룬다. 그래서 `+`와, 원시 값과의 `==`에서는 문자열이 되고, `-`·크기 비교(숫자 힌트)에서는 시각 값이 된다.
- Node는 한 프로세스 안에서 `process.env.TZ`를 바꾸면 이후 Date 계산에 반영한다. 그래서 공통 실행기를 고치지 않고 `concept.test.ts`의 `withTZ`로 여러 시간대를 검증할 수 있다.

#### 확인 질문
1. 시뮬레이터가 시각 값(밀리초 숫자)을 그리지 않는 이유 두 가지는?
   <details><summary>답</summary>`new Date(2026, 0, 31)`처럼 로컬 자정을 가리키는 코드는 실행 시간대마다 다른 시각 값을 만들어 고정된 숫자로 쓸 수 없고, 렌더 중에 `Date`를 쓰면 프리렌더한 빌드 기계와 독자의 시간대가 달라 하이드레이션이 어긋난다. 근거: 3절 구현 전략, `meta.ts` simplifications 첫 항목.</details>
2. 예제 4의 출력 `2 3`이 배제하는 모델과 배제하지 못하는 모델은? 이를 보완한 근거는?
   <details><summary>답</summary>'말일로 맞춘다'(`1 28`)와 '다음 달 1일로 옮긴다'(`2 1`)는 배제한다. '현재 일 31일을 더한다'는 같은 3월 3일을 내서 배제하지 못한다. 본문은 `setMonth(3)` → 4월 31일 → 5월 1일(`4 1`)로 일 31이 그대로 들어가는 것을 보이고, 근거 테스트가 있다. 근거: 변경 이력, `concept.test.ts`.</details>
3. `d == d.getTime()`이 `false`인데 `d <= e && d >= e`는 시각 값으로 비교되는 이유는?
   <details><summary>답</summary>원시 값과의 `==`는 ToPrimitive를 힌트 없이 부르고 Date는 default를 string으로 다뤄 문자열과 숫자를 비교하게 된다. 크기 비교는 IsLessThan이 숫자 힌트로 ToPrimitive해 시각 값을 비교한다. 근거: `content.mdx` '연산자 안의 Date', Date.prototype[%Symbol.toPrimitive%].</details>
4. Invalid Date에 `setDate(1)`과 `setFullYear(2026)`을 하면 결과가 왜 다른가?
   <details><summary>답</summary>`setDate`는 시각 값이 NaN이면 NaN을 돌려주고 값을 바꾸지 않는다. `setFullYear`는 NaN이면 LocalTime을 거치지 않고 +0을 출발점으로 써서 로컬 2026년 1월 1일 0시가 된다(`setUTCFullYear`, 부록 B `setYear`도 같은 처리). 근거: 2절 명세 사실, `concept.test.ts` 근거 테스트.</details>
5. 공통 예제 실행기를 고치지 않고 16개 시간대를 검증할 수 있는 이유와, 그 테스트가 다른 테스트에 새지 않게 막는 장치는?
   <details><summary>답</summary>Node가 같은 프로세스 안의 `process.env.TZ` 변경을 이후 Date 계산에 반영하므로 `runExample`을 그대로 쓰면 된다. `withTZ`가 `try/finally`로 원래 값(없었으면 delete)을 되돌리고, 다른 테스트 파일은 별도 워커 프로세스에서 돈다. 근거: `concept.test.ts`의 `withTZ`와 '시간대 전환' 테스트.</details>
