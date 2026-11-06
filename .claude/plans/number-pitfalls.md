# 추가 게시글 '숫자의 함정' 구현 계획

- 상태: 완료
- 작성일: 2026-11-06
- 기준: `main` @ `87df263`

## 0. 요약

- 목적: 추가 게시글(28장) `/concepts/number-pitfalls`를 추가해, `toFixed`가 저장된 값을 기준으로 반올림한다는 것과 안전한 정수·`EPSILON`·`BigInt`를 예제 9개, 퀴즈, 반올림 판정 보기, 정수 표로 보인다.
- 범위: 새 개념 폴더 1개(category `fundamentals`, order 275), 학습 순서가 밀리는 테스트 기대값, 빌드·e2e 추가, `number-type`의 단순화 문구 3곳과 `related`, content-guide e2e 목록, 로드맵. 공통 코드는 바꾸지 않는다.
- 위험: 명세 Note의 일반 서술을 그대로 옮기는 것 → `9007199254740994`처럼 다른 정수가 같은 값으로 반올림되지 않는 정수가 있어, 안전 판정은 `isSafeInteger` 알고리즘(절댓값 범위)으로만 설명하고 표로 고정한다.
- 복잡도: 중간 · Consensus: 생략. `string-utf16`의 프리셋 보기를 그대로 따르고 공통 코드 변경이 없다. 명세 원문과 vm 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-06)

- 새 개념 페이지를 추가한다. 다룰 내용:
  - ① `toFixed` 반올림: 저장된 값 기준이라 `(1.005).toFixed(2)`는 `'1.00'`. 정확히 가운데면 큰 쪽(절댓값 기준).
  - ② 안전한 정수: `MAX_SAFE_INTEGER`, `+ 1`과 `+ 2`의 결과, `Number.isInteger`와 `Number.isSafeInteger`.
  - ③ `Number.EPSILON` 비교의 한계.
  - ④ 곱해서 반올림하는 우회의 실패와 `Math.round`의 가운데 규칙.
  - ⑤ `toPrecision`·`toExponential`과 범위(RangeError, `1e21`, NaN).
  - ⑥ BigInt로 넘어가기.
- 시각화: 프리셋 값을 고르면 저장 값, 두 후보, 거리, 결과를 보여 주는 '반올림 판정 보기' + `2 ** 53` 근처 정수 표.
- 학습 순서: 배열 메서드 뒤, order 275.

### 유지해야 하는 기존 동작

- 기존 개념 51개의 페이지·테스트는 문구와 순위 기대값 외에 바뀌지 않는다. 마지막 개념은 `es-modules`, 위치만 51 → 52.
- 홈 `객체` 검색 16건 유지. title·summary·tags에 '객체'를 쓰지 않는다.
- `number-type`의 `reviewedAt`은 바꾸지 않는다(문구 교체뿐. 선례 `53d8454`).

### 제외 범위

- 부동소수점의 비트 배치, `0.1 + 0.2` 재설명 — `number-type`으로 링크한다.
- `isNaN`·`parseInt` 등 전역 함수(`global-object`), 문자열을 숫자로 바꾸는 규칙(`type-coercion`).
- `Number.MAX_VALUE`·`MIN_VALUE`, `toString(radix)`, `Intl`·`toLocaleString`, BigInt의 비트 연산과 `asIntN`.
- 금액 계산 라이브러리 추천. 언어 동작만 쓴다.

## 2. 사실과 추정

### 사실 (명세 — tc39.es/ecma262 Draft 2026-11-05, 내려받아 확인)

- `Number.prototype.toFixed`(`#sec-number.prototype.tofixed`): ThisNumberValue → ToIntegerOrInfinity. 0 미만이나 100 초과면 RangeError. 유한하지 않으면 `Number::toString`. `number`를 ℝ로 바꾸고 음수면 부호를 떼어 양수로 만든다. 10^21 이상이면 ToString 결과를 쓴다. 그 밖에는 "intValue / 10^f − number가 0에 가장 가까운 정수 intValue, 둘이면 큰 쪽"을 고른다. → 입력은 소스의 십진 표기가 아니라 저장된 수학적 값이고, 가운데 규칙은 부호를 뗀 뒤라 절댓값 기준이다.
- `toPrecision`(`#sec-number.prototype.toprecision`): 범위 1~100, 같은 '가까운 쪽, 둘이면 큰 쪽' 규칙. 지수가 -6 미만이거나 precision 이상이면 지수 표기.
- `toExponential`(`#sec-number.prototype.toexponential`): 범위 0~100.
- `Math.round`(`#sec-math.round`): 가장 가까운 정수, 가운데면 +∞에 가까운 쪽. Note: `Math.round(-3.5)`는 -3. `0 < n < 0.5`는 +0, `-0.5 ≤ n < 0`은 -0.
- `Number.MAX_SAFE_INTEGER`(`#sec-number.max_safe_integer`): 2^53 − 1. Note는 "그보다 큰 모든 정수의 Number 값은 적어도 하나의 다른 정수와 공유된다"고 쓴다.
- `Number.isSafeInteger`(`#sec-number.issafeinteger`): integral Number이고 abs ≤ 2^53 − 1이면 true. Note: 안전한 정수는 그 Number 값이 다른 정수의 Number 값이 아닌 정수.
- `Number.isInteger`(`#sec-number.isinteger`): integral Number이면 true. ToNumber를 하지 않는다.
- `Number.EPSILON`(`#sec-number.epsilon`): 1과 1보다 큰 가장 작은 표현 가능 값의 차이.
- ApplyStringOrNumericBinaryOperator(`#sec-applystringornumericbinaryoperator`): 두 피연산자의 타입이 다르면 TypeError(`1n + 1`). BigInt 나눗셈은 0 쪽으로 버림(`#sec-numeric-types-bigint-divide`).

### 명세 Note와 실제 반올림의 차이 (문서 대조로 발견)

- 위 `MAX_SAFE_INTEGER` Note와 달리 `9007199254740994`는 다른 정수가 같은 Number 값으로 반올림되지 않는다. `…993`은 `…992`로, `…995`는 `…996`으로 간다(roundTiesToEven). `2 ** 53`부터 1000개 정수를 세면 Number 값 501개 중 251개가 정수 하나에만 대응한다(Node 실행). `Number.isSafeInteger`는 범위만 보므로 `…994`도 false다.
- 처리: Note의 '모든 정수가 공유' 문장은 인용하지 않는다. 안전 판정은 알고리즘(범위)으로 설명하고, 표에 `…994`를 넣어 '혼자 대응해도 안전하지 않다'를 보인다. Note 자체를 틀렸다고 단정하지 않고 Note의 일반 서술과 표가 다르다는 사실만 적는다.

### 사실 (vm 실행 — Node v24.22.1, `runInNewContext`, 스크래치패드에서 실행)

| 예제 파일 | 핵심 코드 | 출력 |
| - | - | - |
| `stored-value.js` | `(1.005).toFixed(2)`, `toFixed(20)`, 1.015, 8.345 | `1.00` / `1.00499999999999989342` / `1.01 1.01499999999999990230` / `8.35 8.34500000000000063949` |
| `exact-tie.js` | 2.5, 0.5, 1.5, -2.5, 0.125, -0.125 | `3 1 2` / `-3 0.13 -0.13` / `string` |
| `multiply-round.js` | `1.005 * 100`, `Math.round` | `100.49999999999999` / `1` / `3 4 -2` / `-3 0` |
| `safe-boundary.js` | `max`, `max + 1`, `+ 2`, `+ 3` | `9007199254740991 true` / `9007199254740992 9007199254740992 9007199254740994` / `true` / `true` |
| `safe-check.js` | `isInteger`, `isSafeInteger` | `true false` / `true false` / `true false false` / `true` |
| `epsilon-limit.js` | `close(a, b)` | `true` / `false true` / `true` / `false` / `2.2737367544323206e-13` |
| `precision-exponential.js` | `toPrecision`, `toExponential` | `123.46 1.2e+2` / `0.0000012 1.2e-7` / `1.23e+3 1.00` / `string` |
| `range-limits.js` | `toFixed(101)`, `1e21`, NaN | `102 RangeError RangeError` / `1e+21 150000000000000000000.00` / `NaN Infinity` |
| `bigint-exact.js` | `2n ** 53n`, 혼합, 나눗셈 | `bigint 9007199254740993` / `false true` / `true false` / `TypeError` / `3` |

예제 초안은 `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/c110381f-a407-4b23-a9ab-62d4f86a45d2/scratchpad/nx/`에 있고 위 표는 그 실행 결과다.

본문 주장 근거(같은 실행에서 확인): 음수 `(-1.005).toFixed(2)`는 `-1.00`, `(2.5).toPrecision(1)`은 `3`, `(-2.5).toPrecision(1)`은 `-3`, `(1.5).toPrecision(0)`·`(1.5).toExponential(101)`은 RangeError, `BigInt(9007199254740993)`은 `9007199254740992`, `BigInt('9007199254740993')`은 `9007199254740993`, `Number.isSafeInteger(-(2 ** 53))`은 false, `Number.isSafeInteger(Number.MIN_SAFE_INTEGER)`는 true, `(1.5).toFixed()`는 `2`.

### 사실 (코드에서 확인)

- 참고 구현: `app/concepts/string-utf16/`. `CodeUnitView.tsx`(106줄, `role="region"` + 라디오 프리셋, `useState`, 프리렌더는 첫 프리셋), `units.ts`, `concept.test.ts`, `CodeUnitView.test.tsx`. `content.mdx:1`에서 import하고 `:95`에 독립된 줄로 둔다.
- e2e 등록 선례: `tests/e2e/helpers.ts:57-58`, `a11y.spec.ts:736-764`, `responsive.spec.ts:884-905`. 빌드 선례: `tests/build/build-output.test.ts:926-943`.
- `tests/helpers/run-example.ts:12`는 `util.format`을 쓴다. BigInt를 그대로 넘기면 `1n`처럼 나오므로 예제는 `String()`을 거친다(호스트 형식에 기대지 않는다).
- 학습 순서 고정 지점: `tests/e2e/navigation.spec.ts`(개수, 마지막 '51번째', 검색 순위, pager, `array-method-pitfalls`의 다음, `regexp-lastindex`의 이전), `tests/e2e/responsive.spec.ts`(개수), `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`.
- 새 개념은 31번째다(`array-method-pitfalls`가 30번째, order 270). 검색 순위 `34,35,36,45,48` → `35,36,37,46,49`, 앞쪽은 유지. pager는 31 이상 +1, 전체 52.
- `number-type/meta.ts:67,69,71`이 `toFixed`, `MAX_SAFE_INTEGER`·`EPSILON`, BigInt를 '다루지 않는다'고 적고 있다.

### 추정

- 없음

## 3. 구현 전략

- 프리셋 데이터는 정적 ts 파일로 두고 `concept.test.ts`가 실제 값으로 검증한다. 계산 코드를 번들에 넣지 않는 `number-type/stored-values.ts`와 같은 방식이다. 검증은 `DataView`로 double의 비트를 읽어 BigInt로 정확한 십진 값을 만드는 독립 계산이라, `toFixed` 결과를 그대로 베끼는 순환을 피한다.
- 정수 표는 상호작용 없는 컴포넌트로 데이터를 그려 테스트가 같은 데이터를 대조한다. 대상은 `9007199254740990`~`…996`이다.
- 조건을 나눠 쓴다. 입력은 저장 값, 가운데 규칙은 `toFixed`(절댓값 기준 큰 쪽)와 `Math.round`(+∞ 쪽)가 다르다.

버린 대안:

- 시나리오 시뮬레이터: 단계가 짧고 값 비교가 핵심이라 프리셋 전환이 낫다.
- 런타임 BigInt 계산으로 프리셋 생성: 데이터가 고정이라 불필요하다.
- 반올림 대안 함수 제공: 페이지의 목적은 동작 설명이고 올바른 반올림은 요구마다 다르다.

## 4. 변경 파일

### 추가 (`app/concepts/number-pitfalls/`)

- `meta.ts`, `content.mdx`, `route.tsx`, `rounding-presets.ts`, `RoundingView.tsx`(+`.test.tsx`), `safe-integers.ts`, `SafeIntegerTable.tsx`(+`.test.tsx`), `concept.test.ts`, `examples/*.js` 9개

### 수정

- 순위 기대값: `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
- e2e·빌드 추가: `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`
- 문구·`related`: `app/concepts/number-type/meta.ts`
- 문서: `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch25-37.md`

### 변경하지 않음

- `app/simulator/`, `app/components/`, `app/lib/` 소스, `app/routes.ts`, 설정.

## 5. 위험 요소

- '`toFixed`가 틀렸다', '버그'로 쓰면 → 명세대로 저장 값을 가까운 쪽으로 고른 결과라고 쓴다(작업 순서 2).
- 가운데 규칙 혼동 → `toFixed`는 부호를 뗀 뒤 큰 쪽이라 `-2.5`가 `-3`, `Math.round`는 +∞ 쪽이라 `-2`. 예제 2·3과 판정 보기의 `-2.5` 프리셋으로 고정한다.
- 판정 보기의 '가운데'는 저장 값이 정확히 가운데일 때만이다. `1.005`는 십진 표기로 가운데처럼 보여도 저장 값은 아니다 → 프리셋 판정을 테스트가 BigInt로 다시 계산한다(작업 순서 3).
- `toFixed(20)` 출력을 '저장 값 전체'라고 쓰면 틀린다. 그 자체도 20자리로 반올림한 결과다 → 정확한 값은 판정 보기에 전체 자리로 보인다.
- 안전 판정을 '값을 공유해서'로만 쓰면 `…994`에서 틀린다 → 2절 처리 방식.
- `2 ** 53` 자체는 정확히 표현되지만 안전하지 않다는 구분을 놓치면 → 예제 5와 표로 보인다.
- EPSILON을 일반 허용 오차처럼 쓰면 → 작은 값에서도 틀린다(`close(1e-20, 2e-20)`은 true). 간격의 정의로 설명하고 `concept.test.ts`로 고정한다.
- 호스트 형식: BigInt는 `String()`을 거친다. 숫자 출력은 `Number::toString`이 만드는 문자열이라고 밝힌다.
- 뒷장 개념: `try...catch`(47장)는 단순화에 적는다. `JSON`은 언급하지 않는다.
- MDX 함정: `PredictQuiz` 문자열 prop의 작은따옴표, 첫 문단의 `**`, 문단 첫 단어 `import`/`export`, 표는 JSX. `2 ** 53`은 인라인 코드로 쓰되 첫 문단에는 쓰지 않는다. 퀴즈 정답 위치는 섞는다.
- 새 폴더는 `meta.ts → content.mdx → route.tsx` 순서로 만들고 dev 서버를 재시작한다.

## 6. 검증 방법

- 정적·단위·빌드:

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build
```

- e2e(공통 코드 변경 없음):

```bash
npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "number-pitfalls|숫자의 함정|홈 학습 순서 보기"
```

- 브라우저(`/concepts/number-pitfalls`):
  1. 375px에서 프리셋 6개를 차례로 고른다 → 저장 값 전체 자리가 줄바꿈되고 가로 스크롤이 없다.
  2. `1.005` → 아래 후보가 더 가깝다고 나오고 결과가 `1.00`.
  3. `2.5`, `-2.5` → '정확히 가운데'로 표시되고 결과가 `3`, `-3`.
  4. 정수 표에서 `…993`이 `…992`로, `…994`는 혼자 대응하지만 안전하지 않게 표시된다.
  5. 다크 모드와 키보드로 라디오 전환. JS를 끄면 첫 프리셋과 퀴즈 정답이 보인다.
  6. `/concepts/array-method-pitfalls`의 다음과 `/concepts/regexp-lastindex`의 이전이 새 페이지다.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제와 메타데이터

- 대상: `examples/*.js`, `meta.ts`, 임시 `content.mdx`·`route.tsx`, `concept.test.ts`의 '본문 주장 검증' 절
- 변경:
  - 예제 9개를 스크래치패드 초안에서 복사해 `meta.examples`에 등록한다(`runtime: 'ecmascript'`). `expectedOutput`은 실제 출력으로 채운다.
  - `meta.ts`: slug `number-pitfalls`, title `숫자의 함정: (1.005).toFixed(2)는 왜 1.01이 아닐까`, category `fundamentals`, order 275, prerequisites `number-type`·`primitive-methods`, related `number-type`·`equality-operators`·`type-coercion`·`global-object`, `reviewedAt: null`.
  - references: 명세 절 링크(toFixed, toPrecision, toExponential, Math.round, MAX_SAFE_INTEGER, isSafeInteger, isInteger, EPSILON, BigInt 타입, ApplyStringOrNumericBinaryOperator)와 MDN ko(`Number/toFixed`, `Number/toPrecision`, `Number/isSafeInteger`, `Number/EPSILON`, `Math/round`, `BigInt`). MDN 6개는 200 확인됨.
  - 본문 주장 테스트: 2절 '본문 주장 근거' 전체, `close(1e-20, 2e-20)` true, `Math.abs(1000.1 + 1000.2 - 2000.3) === 2 ** -42`, `Math.abs(a - b) <= Number.EPSILON * Math.max(Math.abs(a), Math.abs(b))`가 `1000.1 + 1000.2`와 `2000.3`에서 true.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/number-pitfalls` 통과, 2절 표와 출력이 같다.

### 2. 본문

- 대상: `content.mdx`, `meta.ts`의 `summary`·`tags`·`goals`·`simplifications`
- 변경:
  - `## 동작 원리`: toFixed는 저장 값을 기준으로 한다 → 정확히 가운데일 때 → 곱해서 반올림하면 → toPrecision과 toExponential → 범위와 예외적인 값 → 안전한 정수 → isInteger와 isSafeInteger → EPSILON → BigInt.
  - `## 예제`: 예제 9개 + `PredictQuiz` + `<RoundingView />`(예제 2 뒤) + `<SafeIntegerTable />`(예제 5 뒤).
  - `## 결과와 이유`: 예제별 설명과 흔한 오해 Callout(`toFixed`는 십진수 반올림이다 / 큰 수는 모두 부정확하다 / EPSILON보다 작으면 같다 / `Math.round`와 `toFixed`는 같은 규칙이다).
  - `simplifications`: `toFixed(20)`도 반올림한 표시라는 점, 숫자 출력 형식, `try...catch`, 다루지 않는 메서드, `Number::add`의 반올림은 `number-type` 설명을 따른다는 점.
- 주의사항: 5절의 표현 규칙. summary 160자 이하, '객체' 금지. 퀴즈 정답 위치를 섞는다. '테스트가 확인합니다'류 문구를 쓰지 않는다.
- 완료 조건: `npm test`와 `npm run test:build` 통과, title·summary·tags에 '객체' 0건.

### 3. 판정 보기와 정수 표

- 대상: `rounding-presets.ts`, `RoundingView.tsx`(+테스트), `safe-integers.ts`, `SafeIntegerTable.tsx`(+테스트), `concept.test.ts`
- 변경:
  - 프리셋 타입: `{ id, label, value: number, digits, stored: string, lower: string, upper: string, lowerDistance: string, upperDistance: string, verdict: 'lower' | 'upper' | 'tie', result: string }`. 프리셋은 `1.005`(2), `1.015`(2), `8.345`(2), `2.5`(0), `0.125`(2), `-2.5`(0). 음수는 부호를 뗀 값으로 판정하고 결과에 부호를 붙인다고 표시한다. 모든 문자열은 정확한 십진 값이다.
  - `RoundingView`: `CodeUnitView`를 따라 `role="region"`, `aria-label="반올림 판정 보기"`, 라디오 프리셋. 저장 값은 `break-all`로 줄바꿈한다. 색만으로 구분하지 않고 '더 가까움', '정확히 가운데' 배지를 쓴다.
  - 정수 표 행: `{ integer: string, numberValue: string, shared: boolean, safe: boolean }`. `SafeIntegerTable`은 좁은 화면에서 넘치지 않게 `overflow-x-auto`로 감싼다.
  - `concept.test.ts`: `DataView`와 BigInt로 double의 정확한 십진 값을 만드는 헬퍼로 `stored`·거리·판정을 다시 계산해 데이터와 대조하고, `result`는 실제 `toFixed`와 대조한다. 정수 표는 BigInt로 범위를 돌며 `Number(String(n))`로 대응을 계산해 `numberValue`·`shared`(표 범위를 넓혀 앞뒤 정수까지 비교)·`Number.isSafeInteger`와 대조한다.
- 주의사항: 프리렌더는 첫 프리셋이다. 데이터에 BigInt 값을 두지 않고 문자열로 둔다.
- 완료 조건: `npx vitest run app/concepts/number-pitfalls` 통과. `…994` 행이 `shared: false, safe: false`.

### 4. 학습 순서 기대값과 e2e·빌드 테스트

- 대상: 4절의 순위·e2e·빌드 파일
- 변경: 개수 51 → 52, 마지막 '52번째', 검색 순위 `34,35,36,45,48` → `35,36,37,46,49`, pager 31 이상 +1과 전체 52, `array-method-pitfalls`의 다음과 `regexp-lastindex`의 이전을 새 slug로, 새 페이지 pager 블록 추가(31 / 52). `helpers.ts`에 `NUMBER_PITFALLS_PATH`, `NUMBER_PITFALLS_VIEW_NAME = '반올림 판정 보기'`. `a11y.spec.ts`에 페이지·모든 프리셋 axe·`1.005` 판정 표시 3개, `responsive.spec.ts`에 가로 스크롤 2개, `build-output.test.ts`에 프리렌더 블록.
- 주의사항: 테스트 이름에 `숫자의 함정`을 넣어 `-g`에 잡히게 한다.
- 완료 조건: `grep -rnE '/ 51\b|toHaveCount\(51\)|51번째|toBe\(51\)' tests app` 0건. 6절의 e2e 명령 통과.

### 5. 역방향 문구

- 대상: `app/concepts/number-type/meta.ts`
- 변경: `:67`의 '이 페이지는 그 메서드를 다루지 않습니다'를 숫자의 함정 개념으로 안내, `:69`의 상수·`EPSILON`도 같은 개념으로 안내, `:71`을 'BigInt는 숫자의 함정 개념에서, 문자열을 숫자로 바꾸는 규칙은 암묵적 타입 변환 페이지에서 다룹니다'로. `related`에 slug 추가. `reviewedAt` 유지.
- 완료 조건: `npm test` 통과, `related`에 `number-pitfalls` 존재.

### 6. 문서와 전체 검증

- 대상: `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch25-37.md`
- 변경: e2e 경로 목록에 `number-pitfalls` 추가. 로드맵 28장 항목에 완료 표시와 진행 기록 한 줄.
- 완료 조건: 6절의 명령과 브라우저 시나리오 모두 통과.

## 변경 이력

- 2026-11-06 (Opus 명세 대조): 예제 3에 `0.015`, 예제 4에 `max + 4`, 예제 8에 `NaN` 검사 순서, 예제 9에 `-7n / 2n`을 추가하고 가운데 규칙을 m의 홀짝으로 고침 — 영향 단계 1, 2.
- 2026-11-06 (사용자 콘텐츠 검토): 예제 3에 `Math.floor(x + 0.5)` 대조, 예제 6에 `close(1e-20, 2e-20)` 추가, 예제 8의 괄호 통일. 가운데 규칙 이름, 이진 유한 소수, 정규 수 한정, BigInt 관계 비교, 금액 계산 범위 안내를 본문·단순화에 반영. 2.5 등은 'Number로 정확히 표현'을 덧붙여 분모 조건만으로 쓰지 않음 — 영향 단계 1, 2.

## 구현 진행

- baseline (2026-11-06, `87df263`): lint 0, format:check 통과, typecheck 0, `npm test` 140파일 4285개 통과.
- [x] 1. 예제와 메타데이터 — 예제 9개가 초안과 바이트 동일, 관련 테스트 1118개 통과.
- [x] 2. 본문 — 메인 검토로 '0.5 미만이면 내림', EPSILON '용도' 표현 수정. `test:build` 420개 통과.
- [x] 3. 판정 보기와 정수 표 — 데이터는 `DataView`+BigInt 독립 계산으로 대조, `…994` 행 단언 통과.
- [x] 4. 학습 순서 기대값과 e2e·빌드 테스트 — 잔여 grep 0건.
- [x] 5. 역방향 문구 — `number-type/meta.ts` 3곳과 `related`.
- [x] 6. 문서 — content-guide, 로드맵. lint·format·typecheck 통과, `npm test` 143파일 4357개.
- e2e 1차: 모바일 axe `scrollable-region-focusable` 4건 실패 → `SafeIntegerTable`의 스크롤 래퍼에 `tabIndex`·`role="region"`·`aria-label` 추가(프로젝트의 표 패턴). 재실행 18개 통과.
- 브라우저(375px, 다크): 프리셋 6개 전환과 판정·결과, 정수 표 7행, 가로 스크롤 없음, 콘솔 오류 없음을 DOM으로 확인.
- 리뷰 1차(메인 + Opus 명세 대조): 코드·테스트 결함 없음. 명세 대조 15건을 원문·실행으로 재확인해 모두 반영. 주요 내용: 곱셈 어긋남의 원인(저장 값), 가운데 규칙의 기준(m의 홀짝), `…994`가 혼자인 이유와 NOTE와의 차이 공개, BigInt TypeError 조건, 10^21 분기 조건. 틀린 모델도 통과하던 예제 보강(`0.015`, `max + 4`, `NaN.toFixed(101)`, `-7n / 2n`), 경계 테스트 추가.
- 후속 후보: `number-type/content.mdx:48`과 `meta.ts:66`에 같은 '2진 표현의 마지막 자리' 표현이 남아 있다(이번 범위 밖, 사용자 결정 대기).

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 달라진 점: 명세 대조와 사용자 검토로 예제 3·4·6·8·9를 보강했고(`변경 이력`), 좁은 화면에서 정수 표를 키보드로 스크롤할 수 있도록 표 래퍼에 `role="region"`과 `tabIndex`를 넣었다.
- 사용자 콘텐츠 검토 승인으로 `reviewedAt`을 2026-11-06으로 기록했다. 문구만 바꾼 `number-type`의 `reviewedAt`은 유지했다.

### 코드 리뷰

- e2e가 잡은 접근성 문제 1건을 고쳤고 코드·테스트 결함은 더 없었다. Opus 명세 대조 15건과 사용자 콘텐츠 검토 9건을 실행·원문으로 확인해 모두 반영했다. 남겨 둔 항목은 없다.

### 후속 작업

- [ ] `number-type/content.mdx:48`과 `meta.ts:66`의 '2진 표현의 마지막 자리' 표현을 m의 홀짝으로 고칠지 결정한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 명세 대조 지적 15건을 낮음 등급까지 모두 고쳤다. 이 프로젝트는 결과가 맞아도 명세와 다른 서술을 심각하게 보므로 문구와 예제 보강으로 처리했다.
- [Claude 판단] 예제를 틀린 모델과 구별되도록 보강했다. `max + 4`는 가운데에서 늘 내려간다는 모델을, `-7n / 2n`은 내림 모델을, `NaN.toFixed(101)`은 유한성을 먼저 본다는 모델을 배제한다.
- [Claude 판단] 검토 제안의 '이진 유한 소수'에 'Number로 정확히 표현되어'를 덧붙였다. 분모가 2의 거듭제곱이어도 유효 자릿수를 넘으면 정확히 표현되지 않기 때문이다.
- [무검토 승인] 안전 판정을 '값을 공유해서'가 아니라 `isSafeInteger`의 범위 알고리즘으로 설명했다. `…994`는 대응하는 정수가 자기 하나뿐인데도 `false`이기 때문이다. NOTE는 틀렸다고 단정하지 않고 서술과 알고리즘의 차이만 적었다.
- [무검토 승인] 프리셋 데이터를 정적 파일로 두고 `DataView`와 BigInt로 독립 계산해 검증했다. `toFixed` 결과를 베끼면 순환 검증이 되기 때문이다.
- 다룰 주제 4개, 프리셋 값 보기, order 275는 사용자가 정했다. 가운데 규칙 이름, `Math.floor(x + 0.5)` 대조, `close(1e-20, 2e-20)` 예제, 금액 계산 범위 안내는 사용자 검토로 들어갔다.

#### 배경지식

- `toFixed`는 소스의 십진 표기가 아니라 저장된 Number 값을 ℝ로 바꿔 부호를 뗀 뒤 가장 가까운 `intValue`를 고른다.
- 가운데 규칙은 셋이다. `toFixed`는 0에서 먼 쪽, `Math.round`는 +∞ 쪽, 저장과 산술은 m이 짝수인 쪽이다.
- 2^53 이상 2^54 미만은 간격이 2라서 홀수 정수는 이웃 값으로 반올림되고, m이 짝수인 쪽으로 몰린다.
- `EPSILON`은 1 이상 2 미만 구간의 간격이고, 구간이 올라가면 간격도 커진다.
- BigInt와 Number의 산술 혼합은 ToNumeric 뒤의 타입 비교로 TypeError이고, 관계 비교와 `==`는 수학적 값으로 비교한다.

#### 확인 질문

1. `(1.005).toFixed(2)`는 `'1.00'`인데 `(8.345).toFixed(2)`는 왜 `'8.35'`인가? 둘 다 가운데 규칙이 쓰였는가?
   <details><summary>답</summary>둘 다 가운데 규칙이 아니라 저장 값에 더 가까운 후보가 선택된 것이다. 1.005는 저장 값이 1.005보다 작고 8.345는 8.345보다 크다. 가운데 규칙은 거리가 정확히 같은 2.5 같은 값에만 쓰인다. 근거: `rounding-presets.ts`, 본문 '정확히 가운데일 때'.</details>
2. `0.015`에서 `Math.round(0.015 * 100) / 100`과 `(0.015).toFixed(2)`가 왜 다른가? `1.005`의 어긋남과 원인이 어떻게 다른가?
   <details><summary>답</summary>`0.015 * 100`은 곱셈 반올림으로 정확히 1.5가 되어 0.02이고 toFixed는 저장 값이 0.015보다 작아 0.01이다. `1.005`는 저장 값 때문에 정확한 곱이 이미 100.5보다 작아, 곱셈 반올림이 없어도 결과가 같다. 근거: 예제 3, 본문 '곱해서 반올림하면'.</details>
3. `…994`는 대응하는 정수가 자기 하나뿐인데 왜 `isSafeInteger`가 false인가? `…992`와 `…996`은 왜 혼자가 아닌가?
   <details><summary>답</summary>알고리즘이 대응 관계를 보지 않고 절댓값이 2^53 − 1 이하인지만 보기 때문이다. `…993`과 `…995`가 가운데 규칙으로 m이 짝수인 `…992`와 `…996`으로 가서, 두 값은 공유되고 `…994`는 혼자 남는다. 근거: `safe-integers.ts`, 본문 '안전한 정수'.</details>
4. `max + 4`를 예제에 넣기 전에는 어떤 틀린 설명을 구분하지 못했는가?
   <details><summary>답</summary>'2^53 위에서는 가운데면 내림'이라는 모델이다. `max + 2`, `max + 3`은 내림으로도 같은 출력이 나온다. `max + 4`의 정확한 값 2^53 + 3은 m이 짝수인 위쪽 2^53 + 4로 올라간다. 근거: 예제 4, 계획 변경 이력.</details>
5. `Math.abs(a - b) < Number.EPSILON`이 값이 크거나 작을 때 각각 어떻게 어긋나는가?
   <details><summary>답</summary>값이 크면 서로 다른 값의 차이가 최소 간격 때문에 EPSILON보다 커서 false가 되고, 값이 아주 작으면 두 배 다른 값도 차이가 EPSILON보다 작아 true가 된다. 근거: 예제 6.</details>

