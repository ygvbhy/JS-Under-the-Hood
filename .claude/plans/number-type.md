# 숫자 타입(`0.1 + 0.2`, 큰 정수, `Infinity`·`NaN`) 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `dfc5c1f`

## 0. 요약
- 목적: 로드맵 2번 개념 `/concepts/number-type`을 추가한다. 숫자는 모두 64비트 부동소수점(IEEE 754 binary64) 하나의 타입이라 `0.1 + 0.2 !== 0.3`, 2의 53제곱을 넘는 정수의 오차, `Infinity`·`NaN`이 생긴다는 것을 예제·표·퀴즈로 설명한다.
- 범위: 새 개념 폴더 1개(시뮬레이터 없음) + 저장 값 표 데이터 파일 + e2e·빌드 테스트 케이스 추가 + content-guide 목록 문구. 공통 코드와 기존 네 개념은 바꾸지 않는다.
- 위험: 부동소수점 설명이 부정확해지는 것(예: "0.1을 저장할 수 없어 오류") → 표의 "실제로 저장되는 값"을 테스트가 vm에서 직접 계산해 대조하고, 설명은 명세 문장(가장 가까운 값으로 반올림)에 맞춘다.
- 복잡도: 낮음~중간 · Consensus: 생략 (시뮬레이터가 없는 기존 패턴 조합이고, type-coercion의 "표 데이터 = 테스트 대조" 패턴을 그대로 쓴다. 사실은 명세 원문과 vm 실행으로 미리 확인했다)
- 미확정: 1건

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 2번. 『모던 자바스크립트 Deep Dive』 6장(숫자 타입) 범위, 사용자 진도 1~12장.
- 다룰 내용: ① 정수와 실수가 같은 숫자 타입(2진수·8진수·16진수 리터럴 포함) ② `0.1 + 0.2 !== 0.3`과 그 이유(십진 소수를 2진 부동소수점의 가장 가까운 값으로 반올림해 저장) ③ 2의 53제곱을 넘으면 연속된 정수를 모두 표현하지 못함 ④ `Infinity`·`-Infinity`·`NaN`(0으로 나누기, 범위 초과, `typeof`).
- 시각화는 로드맵 결정대로 표 + 퀴즈(시뮬레이터 없음).
- `docs/content-guide.md` 절차를 따르고 개념 폴더만 추가한다(테스트 확장 제외).

### 유지해야 하는 기존 동작
- 기존 네 개념의 페이지·테스트는 그대로 통과하고 수정하지 않는다.
- e2e `객체` 검색 1건(`tests/e2e/navigation.spec.ts:17`) → 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위
- 12장 이후에 배우는 내장 API: `Number.EPSILON`·`Number.MAX_SAFE_INTEGER`·`Number.isSafeInteger`·`Math.*`·`toFixed` 같은 숫자 메서드, `parseInt`·`parseFloat`. 예제와 본문 설명에 쓰지 않는다(참고 자료 링크로만 둔다).
- BigInt 자세한 설명(type-coercion이 한 줄 소개함). `-0`의 성질과 `NaN` 비교는 `equality-operators`에 링크만 한다.
- 문자열→숫자 변환(type-coercion이 다룸), 비트 단위 메모리 배치(부호·지수·가수 비트 그림).
- 기존 개념 `related` 역방향 연결(9절 후보).

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차와 공통 테스트 자동 대상은 1번 개념과 같다(`docs/content-guide.md`, `tests/content-integrity.test.ts`, `tests/examples.test.ts`, `tests/build/build-output.test.ts`).
- 표 데이터를 본문과 테스트가 함께 쓰는 선례: `app/concepts/type-coercion/conversion-table.ts`(순수 데이터) → `content.mdx`가 import해 `<table>`을 `map`으로 그림, `concept.test.ts`가 vm 결과와 대조.
- 시뮬레이터 없는 개념의 e2e: content-guide 9단계는 "시뮬레이터가 있으면" a11y·responsive에 추가하라고 한다. 페이지 단위 axe·가로 스크롤 케이스는 type-coercion 선례(`tests/e2e/a11y.spec.ts`의 '개념 페이지: 암묵적 타입 변환', `tests/e2e/responsive.spec.ts`의 `${TYPE_COERCION_PATH}: 가로 스크롤이 없다`)를 본뜬다.
- 명세(tc39.es/ecma262, 2026-10-27 확인):
  - The Number Type(`#sec-ecmascript-language-types-number-type`): Number 타입의 값은 IEEE 754-2019 binary64(배정밀도 64비트 부동소수점) 값이며 `NaN`은 하나의 특별한 값, 양·음의 무한대가 따로 있다.
  - 숫자 리터럴의 값: RoundMVResult(`#sec-roundmvresult`) — 유효숫자 20자리 이하이면 𝔽(n), 즉 그 수학적 값에 가장 가까운 Number 값.
  - Number::add(`#sec-numeric-types-number-add`): 정확한 합을 구해 가장 가까운 표현 가능한 값으로 반올림(roundTiesToEven).
  - Number.MAX_SAFE_INTEGER(`#sec-number.max_safe_integer`) Note: 그보다 큰 정수는 다른 정수와 같은 Number 값을 공유할 수 있어 "안전하지 않다".
  - 앵커 존재 확인: `sec-ecmascript-language-types-number-type`, `sec-literals-numeric-literals`, `sec-roundmvresult`, `sec-numeric-types-number-add`, `sec-numeric-types-number-divide`, `sec-numeric-types-number-exponentiate`, `sec-numeric-types-number-tostring`, `sec-number.max_safe_integer`, `sec-exp-operator`, `sec-typeof-operator`, `sec-number.prototype.tofixed`.
- MDN(ko) 200 확인: `Data_structures`, `Reference/Global_Objects/Number`, `Reference/Global_Objects/Infinity`, `Reference/Global_Objects/NaN`, `Reference/Global_Objects/Number/MAX_SAFE_INTEGER`, `Reference/Operators/Exponentiation`, `Reference/Operators/Division`. (`Reference/Lexical_grammar`는 ko 404 → 쓰지 않는다.)
- 예제 초안 실제 출력(Node 24.22.1 `vm`, 8절 1단계 원문 그대로):

  | 예제 | 출력 |
  | - | - |
  | `one-type.js` | `number number true` / `2.5 5 15 255` |
  | `decimal-sum.js` | `0.30000000000000004 false` / `0.75 true` / `true` |
  | `safe-integer.js` | `9007199254740992 9007199254740992 9007199254740994` / `true true` |
  | `special-values.js` | `Infinity -Infinity NaN` / `number number` / `Infinity NaN NaN` |

- 실제로 저장되는 값(vm에서 `(식).toFixed(60)` 후 끝의 0 제거, 0.1의 정확한 값은 소수점 아래 55자리라 60자리면 충분):

  | 식 | 저장되는 값(십진수로 정확히) |
  | - | - |
  | `0.1` | `0.1000000000000000055511151231257827021181583404541015625` |
  | `0.2` | `0.200000000000000011102230246251565404236316680908203125` |
  | `0.3` | `0.299999999999999988897769753748434595763683319091796875` |
  | `0.1 + 0.2` | `0.3000000000000000444089209850062616169452667236328125` |
  | `0.5` | `0.5` |
  | `0.25` | `0.25` |
  | `0.5 + 0.25` | `0.75` |

- 본문 서술 근거(vm): `0.1 * 3` → `0.30000000000000004`, `0.3 - 0.1` → `0.19999999999999998`, `2 ** 53 - 1` → `9007199254740991`, `2 ** 1023 * 2` → `Infinity`, `1 / -0` → `-Infinity`.
- 홈 정렬(제목 `localeCompare(…, 'ko')`): `단축 평가…` → `동등 비교…` → `숫자 타입…` → `암묵적…` → `원시 값과 객체…`. 새 개념은 세 번째 카드.

### 추정
- 지수 연산자 `**`는 도서 7장 범위로 보고 예제에 쓴다. 근거: 연산자 장에서 산술 연산자와 함께 소개됨. 확인 시점: 사용자 검토 게이트.

## 3. 구현 전략
- type-coercion처럼 "본문 표 데이터 파일 + 테스트 대조" 패턴을 쓴다. `stored-values.ts`(순수 데이터)의 각 행을 `content.mdx`가 표로 그리고, `concept.test.ts`가 vm에서 `toFixed`로 정확한 십진 값을 계산해 같은지 확인한다. 페이지는 `toFixed`를 쓰지 않는다(12장 이후 API). 표는 "0.1이 정확히 0.1이 아니라 그와 가장 가까운 2진 부동소수점 값으로 저장된다"는 핵심 근거를 숫자로 보여 준다.
- 시뮬레이터는 만들지 않는다(로드맵 결정). 단계별 상태 변화가 있는 개념이 아니라, 저장된 값을 보는 것이 핵심이라 표가 맞다.
- 12장 이후 내장 API(`Number.EPSILON` 등)를 쓰지 않고도 현상을 보여 준다: 안전한 정수는 `2 ** 53`과 `+ 1`의 비교로, 비교 우회 방법은 "정수로 계산한 뒤 한 번 나누기"(`(1 + 2) / 10 === 0.3`) 사실만 보여 준다. 이 방법을 일반 규칙처럼 권하지 않고 "두 값이 같은 십진수 0.3에 가장 가까운 값으로 반올림되기 때문"이라는 이유만 쓴다.
- 버린 대안: ① 비트 그림(부호·지수·가수) 시각화 — 명세는 내부 비트 배치를 관찰 가능한 동작으로 정하지 않고(명세 Note: ArrayBuffer에 보이는 비트도 내부 표현과 같다는 보장 없음), 학습 범위 밖이다. ② `Number.EPSILON` 비교 예제 — 12장 이후 API.

## 4. 변경 파일
- 추가 `app/concepts/number-type/`: `meta.ts`, `content.mdx`, `route.tsx`, `stored-values.ts`, `concept.test.ts`, `examples/` 4개(`one-type.js`, `decimal-sum.js`, `safe-integer.js`, `special-values.js`)
- 수정(추가만): `tests/e2e/helpers.ts`(`NUMBER_TYPE_PATH`), `tests/e2e/a11y.spec.ts`(페이지 axe, 라이트·다크 describe 안), `tests/e2e/responsive.spec.ts`(가로 스크롤), `tests/build/build-output.test.ts`(프리렌더 블록: 퀴즈 `<details>` 수, 표의 0.1 저장 값 문자열), `docs/content-guide.md` 9단계 e2e 대상 목록 문구, 로드맵 문서 상태
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, 기존 네 개념 폴더, `package.json`, `AGENTS.md`

## 5. 위험 요소
- "0.1을 저장할 수 없다/부정확하게 저장된다" 같은 모호하거나 틀린 서술 → 표현을 "십진수 0.1에 가장 가까운 Number 값으로 반올림해 저장한다"로 고정하고, 덧셈 결과도 "정확한 합을 다시 가장 가까운 값으로 반올림"으로 쓴다(5단계 주의사항, 메인 검토).
- 다른 언어·하드웨어에 대한 일반화("모든 언어에서 같다") → 확인하지 않은 주장이므로 쓰지 않는다. 명세가 IEEE 754 binary64를 쓴다는 사실만 쓴다.
- 375px에서 55자리 숫자가 넘침 → 표 셀의 `<code>`에 `break-all`, 표 전체는 `overflow-x-auto` 래퍼. e2e 가로 스크롤 검사로 확인(6단계).
- `console.log`의 숫자 출력 형식은 호스트 형식 → 예제 출력은 Number::toString과 같은 결과(실행 확인)이지만 본문에서 "출력은 숫자를 문자열로 바꾼 형식"이라는 정도만 쓰고, 출력 형식 규칙(Number::toString의 최단 표기)은 단순화로 공개.
- `객체` 검색 1건 → meta 세 필드 검사(1단계).
- 홈 카드 순서 변화(새 개념 세 번째) → 정렬 규칙대로의 결과, `navigation.spec.ts` 영향 없음.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 4개 실제 출력 = `expectedOutput`, 저장 값 표 대조, 본문 주장 검증, 음성 확인(표의 `0.3` 값을 다른 값으로 바꾸면 실패).
- 브라우저(빌드 결과 서빙 또는 dev 서버 재시작 후 `/concepts/number-type`):
  1. 첫 화면: "검토 중" 배지, 학습 목표, 선행 개념 링크, 퀴즈 4개가 라디오 UI.
  2. 저장 값 표: 7행, `0.1` 행에 55자리 값, `0.5` 행은 `0.5`.
  3. 375px 라이트·1280px 다크에서 표가 페이지 가로 스크롤을 만들지 않음, 콘솔 에러 0.
  4. 홈: 카드 5개(새 개념 세 번째), `객체` 검색 1건, `숫자` 검색에 새 개념 포함.

## 7. 미확정 사항
- [미확정] 지수 연산자 `**`가 학습 범위인지(2절 추정). 범위 밖이면 `safe-integer.js`를 `9007199254740992` 리터럴로, `special-values.js`의 `2 ** 1024`를 큰 리터럴(`1e309`)로 바꾸면 되므로 구조는 같다. 사용자 검토 게이트에서 확인한다.

## 8. 작업 순서

### 1. 예제·meta·표 데이터·본문 주장 검증
- 대상: `examples/*.js` 4개, `meta.ts`, `stored-values.ts`, `concept.test.ts`, `route.tsx`, h2 3개만 있는 `content.mdx` 골격
- 현재: 폴더 없음
- 변경:
  - 예제 원문(파일 끝 줄바꿈 1개):

    `one-type.js`
    ```js
    console.log(typeof 1, typeof 1.5, 1 === 1.0);
    console.log(5 / 2, 0b101, 0o17, 0xff);
    ```
    `decimal-sum.js`
    ```js
    const sum = 0.1 + 0.2;
    console.log(sum, sum === 0.3);
    console.log(0.5 + 0.25, 0.5 + 0.25 === 0.75);
    console.log((1 + 2) / 10 === 0.3);
    ```
    `safe-integer.js`
    ```js
    const big = 2 ** 53;
    console.log(big, big + 1, big + 2);
    console.log(big + 1 === big, 9007199254740993 === big);
    ```
    `special-values.js`
    ```js
    console.log(1 / 0, -1 / 0, 0 / 0);
    console.log(typeof Infinity, typeof NaN);
    console.log(2 ** 1024, Infinity - Infinity, NaN + 1);
    ```
  - `stored-values.ts`: `export const storedValues: { source: string; stored: string }[]` — 2절 표 7행 그대로(`source`는 소스 표기 `'0.1 + 0.2'`, `stored`는 십진 문자열). import 없음.
  - `meta.ts`:
    - `slug: 'number-type'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: ['equality-operators', 'type-coercion']`
    - `title: '숫자 타입: 0.1 + 0.2는 왜 0.3이 아닌가'`
    - `summary`(160자 이하, `객체` 없음): `자바스크립트의 숫자는 정수와 실수를 가리지 않고 모두 64비트 부동소수점 값입니다. 십진 소수와 아주 큰 정수는 가장 가까운 값으로 반올림되어 저장되므로 0.1 + 0.2가 0.3과 다르고, 0으로 나누면 오류 대신 Infinity가 됩니다.` (1단계에서 길이 확인)
    - `tags`: `숫자 타입`, `number`, `부동소수점`, `IEEE 754`, `배정밀도`, `0.1 + 0.2`, `반올림 오차`, `안전한 정수`, `2의 53제곱`, `Infinity`, `NaN`, `0으로 나누기`, `2진수 리터럴`, `16진수 리터럴`
    - `goals`: ① 정수와 실수가 같은 숫자 타입이고 `5 / 2`가 2.5인 이유를 설명할 수 있다 ② `0.1 + 0.2`가 `0.3`과 다른 이유를 "가장 가까운 값으로 반올림해 저장한다"는 규칙으로 설명할 수 있다 ③ 2의 53제곱보다 큰 정수에서 `+ 1`이 값을 바꾸지 못하는 경우를 예측할 수 있다 ④ `Infinity`·`-Infinity`·`NaN`이 생기는 연산을 알고 이들도 숫자 타입이라는 것을 설명할 수 있다
    - `prerequisites`: `{ label: '데이터 타입' }`, `{ label: '산술 연산자' }`, `{ label: '동등 비교', slug: 'equality-operators' }`
    - `examples`: 4개, `expectedOutput: []`로 시작해 실제 출력을 2절 표와 대조한 뒤 채운다.
    - `simplifications`:
      1. 숫자가 메모리에 비트로 어떻게 배치되는지(부호·지수·가수)는 다루지 않는다. 명세는 Number 값을 IEEE 754-2019 binary64 값으로 정의하지만, 엔진이 내부에서 그 비트를 그대로 저장한다고 보장하지는 않는다.
      2. "가장 가까운 값으로 반올림"은 명세의 roundTiesToEven(가운데면 짝수 쪽) 반올림을 줄여 말한 것이다. 숫자 리터럴은 유효숫자가 20자리를 넘으면 반올림 방식이 구현에 따라 다를 수 있는데, 이 페이지의 리터럴은 모두 20자리 이하다.
      3. 저장 값 표는 각 Number 값을 십진수로 정확히 풀어 쓴 것이다. 이 값은 테스트에서 명세의 `Number.prototype.toFixed`로 계산해 확인했으며, 이 페이지는 그 메서드를 다루지 않는다.
      4. `console.log`가 숫자를 출력하는 형식(예: `0.30000000000000004`)은 호스트 출력이며, 그 숫자를 구별할 수 있는 가장 짧은 십진 표기로 보여 준다. 표기 규칙(명세 Number::toString)은 다루지 않는다.
      5. "안전한 정수"의 경계는 명세의 `Number.MAX_SAFE_INTEGER`(2의 53제곱 − 1)로 정의된다. 이 페이지는 그 상수와 `Number.EPSILON`, `Math` 같은 내장 API를 쓰지 않고 2의 53제곱 주변의 계산 결과만 보여 준다.
      6. `NaN`의 비교와 `+0`/`-0`은 동등 비교 페이지에서 다룬다. 명세의 IEEE 754에는 NaN이 여러 비트 패턴으로 있지만 ECMAScript에서는 하나의 `NaN` 값으로 다룬다.
      7. BigInt와 문자열을 숫자로 바꾸는 규칙은 다루지 않는다(암묵적 타입 변환 페이지 참고).
      8. `console.log`는 호스트 API다.
    - `references`: 명세 The Number Type, Numeric Literals, RoundMVResult, Number::add, Number::divide, Number::exponentiate, Number.MAX_SAFE_INTEGER / MDN(ko) JavaScript의 타입과 자료구조(Number 타입), Number, Infinity, NaN, Number.MAX_SAFE_INTEGER, 거듭제곱(**), 나눗셈(/). 라벨 형식은 기존 개념과 같게.
  - `concept.test.ts`(`runInNewContext`):
    - 저장 값 표: 각 행의 `source`를 vm에서 `(source).toFixed(100)`로 계산해 끝의 0과 소수점 정리 후 `stored`와 같다. 행 수 7, `source` 중복 없음.
    - 본문 서술 근거: 2절 "본문 서술 근거" 5개 + `0.1 + 0.2 === 0.3`은 false, `(1 + 2) / 10 === 0.3`은 true, `2 ** 53 + 1 === 2 ** 53`은 true, `2 ** 53 - 1 + 1 === 2 ** 53`은 true(안전한 범위 안은 정확), `typeof NaN === 'number'`.
- 이유: 페이지의 사실 근거를 먼저 고정한다.
- 주의사항: `meta.ts`·`stored-values.ts`는 import 없는 순수 데이터(ConceptMeta 타입 import만 예외).
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/number-type` 통과, 실제 출력 = 2절 표, `객체` 없음(`node -e`). 음성 확인: `stored-values.ts`의 `0.3` 행 값을 `0.3`으로 바꾸면 표 테스트가 실패하는 것을 확인하고 되돌린다.

### 2. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `storedValues` import)
- 변경:
  - `## 동작 원리`
    - 숫자 타입은 하나: 정수·실수 구분 없이 모두 64비트 부동소수점 값(IEEE 754 binary64). 그래서 `1 === 1.0`, `5 / 2`는 2.5. 2진수(`0b`)·8진수(`0o`)·16진수(`0x`) 리터럴도 같은 숫자 값을 쓰는 다른 표기일 뿐이다.
    - 십진 소수는 가장 가까운 값으로 저장된다: 2진 부동소수점은 분모가 2의 거듭제곱인 값(0.5, 0.25, 0.75)만 정확히 담는다. 0.1·0.2·0.3은 가장 가까운 값으로 반올림되어 저장된다(저장 값 표 — JSX `<table>`, `storedValues.map`, 값 셀 `<code className="break-all">`). 덧셈도 정확한 합을 다시 가장 가까운 값으로 반올림한다. 0.1과 0.2의 저장 값을 더해 반올림한 결과가 0.3의 저장 값과 다른 값이라 `===`가 false다. 반대로 `(1 + 2) / 10`은 정확한 3/10을 한 번 반올림한 값이라 리터럴 `0.3`과 같은 값이다.
    - 큰 정수: 2의 53제곱까지는 모든 정수를 정확히 표현한다. 그보다 크면 표현할 수 있는 정수 사이가 2 이상 벌어져, `2 ** 53 + 1`은 가장 가까운 `2 ** 53`으로 반올림된다. 이 경계를 명세는 "안전한 정수"라고 부른다(상수 이름은 단순화에 둔다).
    - 특별한 값: `Infinity`, `-Infinity`, `NaN`도 숫자 타입이다. 0으로 나누면 오류 대신 `±Infinity`(0을 0으로 나누면 `NaN`), 표현 범위를 넘으면 `Infinity`, 계산할 수 없는 연산(`Infinity - Infinity`)은 `NaN`, `NaN`이 들어간 산술 결과는 `NaN`. `NaN` 비교는 [동등 비교](/concepts/equality-operators) 링크.
  - `## 예제`: 예제 4개 `file=` 펜스 + 각각 `PredictQuiz`(선택지 3~4개, 정답은 실제 출력, 여러 줄은 ' / ' 안내). 시뮬레이터 없음.
  - `## 결과와 이유`: JSX `<table>`(식 / 결과 / 이유) + 예제별 이유 문단 + `Callout type="misconception"` 4개: ① "정수와 실수는 다른 타입이다" ② "0.1 + 0.2가 0.3이 아닌 것은 계산 실수(버그)다"(명세가 정한 반올림 결과) ③ "0으로 나누면 오류가 난다" ④ "정수 계산은 크기와 관계없이 정확하다".
- 주의사항: "0.1을 저장할 수 없다", "부정확하게 저장된다", "모든 언어에서 같다" 같은 확인하지 않은 표현을 쓰지 않는다. 12장 이후 API를 본문에 쓰지 않는다(이름 언급도 단순화 목록에만). 같은 대상은 같은 이름("가장 가까운 값으로 반올림")으로 부른다. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/number-type/index.html`에 `<details` 4개, 표 값 `0.1000000000000000055511151231257827021181583404541015625` 존재, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 태그 제거 텍스트의 `**` 0건.

### 3. e2e·빌드 테스트, 문서, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, 로드맵 문서
- 변경: type-coercion의 페이지 단위 케이스(axe 라이트·다크, 가로 스크롤)를 본떠 추가. 빌드 블록 `프리렌더 (number-type)`: `<details` 4개 이상, 0.1 저장 값 문자열 포함. content-guide 9단계 목록에 `number-type` 추가. 기존 케이스 수정 없음.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~4 확인, 스크린샷 1장 이상(375px 표).

## 9. 추가 개선 후보
- 기존 개념 `related`에 `number-type` 역방향 연결(`equality-operators`의 NaN 설명, `type-coercion`의 NaN).
- 12장 이후 진도에서 `Number.EPSILON`·`Number.isSafeInteger`·`toFixed`를 다루는 보강.

## 구현 진행

- baseline (2026-10-27, `dfc5c1f`): lint·format:check·typecheck 오류 0, `npm test` 575 통과(이번에 재실행). `test:build` 32·e2e 91 통과·3 건너뜀은 같은 코드(커밋 직전, 이후 문서만 변경)에서 실행한 결과
- [x] 1. 예제·meta·표 데이터·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 93 통과, lint·typecheck·prettier 0. 예제 4개가 계획 단계 실행본과 바이트 동일(`cmp`), 실제 출력 = 2절 표, 저장 값 7행 = 2절 표. 음성 확인(`0.3` 행 → `'0.3'`으로 1건 실패)은 서브에이전트 보고. 메인 수정 1곳: 단순화 4의 "가장 짧은 십진 표기로 보여 줍니다"를 호스트 동작 단정 대신 "예제 출력은 명세 Number::toString 문자열과 같다"로(예제 출력 = `String(n)` 메인 확인)
- 3단계 중 테스트·문서 추가분(helpers·a11y·responsive·build-output·content-guide)은 1단계와 병렬로 먼저 작성. diff는 추가만(content-guide 목록 1줄 수정). 빌드 블록 테스트 이름을 본문 용어("실제로 저장되는 값")로 메인 수정. 실행 검증은 본문 작성 후 3단계에서
- [x] 2. 본문 content.mdx — 메인이 본문을 명세·vm 근거와 대조해 수정: ① `2 ** 53 + 1`은 두 표현 가능 값의 정확히 가운데라 "가장 가까운 값으로 반올림"이 아니라 roundTiesToEven(2진 표현 마지막 자리가 0인 쪽)으로 `2 ** 53`이 된다(본문·퀴즈 설명·결과 표 3곳, 근거 테스트 `2 ** 53 + 3 === 2 ** 53 + 4` 추가) ② "명세는 2의 53제곱까지를 안전한 정수라 부른다" → 명세 MAX_SAFE_INTEGER는 2의 53제곱 − 1이고 절댓값 기준이므로 문단 추가·수정 ③ "분모가 2의 거듭제곱이면 정확히 저장" 일반화 → 0.5·0.25·0.75는 2진수로 끝나는 소수, 0.1·0.2·0.3은 2진수로 끝나지 않는 소수로 한정 ④ "계산할 수 없는 연산" → "수학적으로 값이 정해지지 않는 연산". meta 단순화 2도 roundTiesToEven 설명을 같은 문구로 수정. 빌드 HTML: `<details` 4, 0.1 저장 값 1, 공백 깨진 code 0, 굵게 미처리 `**` 0(남은 `**`는 모두 지수 연산자)
- [x] 3. e2e·빌드 테스트, 문서, 브라우저 확인 — 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 608, `test:build` 36(baseline 32 + 새 블록 2 + 레지스트리 자동 2), e2e 97 통과·3 건너뜀(기존 3건), axe 위반 0. 브라우저(빌드 결과 `serve` + Playwright): 375px 라이트·1280px 다크 모두 표 7행, 퀴즈 4개 라디오 UI, "검토 중" 배지, 페이지 가로 넘침 0·표 래퍼 넘침 0(긴 값은 `break-all`로 줄바꿈), 콘솔 에러 0. 홈 카드 5개(새 개념 세 번째), `객체` 검색 1건, `숫자` 검색 2건(새 개념 포함). 스크린샷 2장(scratchpad)
- 리뷰 1차 (critical-code-review: 메인 직접 — 개념 폴더 1개 + 테스트 추가, 본문 정확성은 2단계에서 명세 대조 완료): Critical/High 0. Low 2(보고만): ① 375px에서 저장 값 표의 식 셀 `0.1 + 0.2`가 두 줄로 나뉨(식 셀 `whitespace-nowrap`이면 개선) ② "결과와 이유"의 예제별 문단이 `**예제 N**:` 굵은 머리말 형식이라 기존 개념("예제 N의 …" 문장형)과 다름. 확인 필요 1: `**` 학습 범위(7절)

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 3단계의 테스트·문서 추가를 1단계와 병렬로 먼저 작성했다 ② 브라우저 확인은 빌드 결과(`serve`) + Playwright로 했다 ③ 메인 검토에서 본문의 반올림·안전한 정수 설명을 명세에 맞게 고치고, 근거 테스트 2개(`2 ** 53 + 3 === 2 ** 53 + 4`, `9007199254740993 === 2 ** 53`)를 더했다(구현 진행 2 참고).
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. Low 2건(375px 식 셀 줄바꿈, 예제별 문단 머리말 형식)은 보고만 하고 남겼다.

### 후속 작업
- [x] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록 — 2026-10-27 사용자 승인, `'2026-10-27'`
- [x] 지수 연산자 `**` 학습 범위 확인 — 사용자가 페이지를 그대로 승인(2026-10-27), 유지
- [ ] 리뷰 Low 2건 반영 여부 결정
- [ ] 9절 추가 개선 후보(역방향 `related`, 12장 이후 API 보강)
- [ ] 로드맵 3번 "`typeof`가 알려 주는 것" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] `2 ** 53 + 1`이 `2 ** 53`이 되는 이유를 "가장 가까운 값"이 아니라 roundTiesToEven(정확히 가운데면 2진 표현 마지막 자리가 0인 쪽)으로 설명했다 — `2 ** 53 + 1`은 `2 ** 53`과 `2 ** 53 + 2`에서 거리가 같다. `2 ** 53 + 3`이 큰 쪽 `2 ** 53 + 4`로 가는 것이 "작은 쪽으로 버린다"가 아님을 보여 주는 근거다(`concept.test.ts`).
- [Claude 판단] "안전한 정수"를 "2의 53제곱까지"가 아니라 "절댓값이 2의 53제곱 − 1 이하"로 고쳤다 — 명세 `Number.MAX_SAFE_INTEGER`가 2의 53제곱 − 1이고, `2 ** 53`은 `2 ** 53 + 1`을 반올림한 결과와 구별되지 않기 때문이다.
- [무검토 승인] 시뮬레이터 없이 "실제로 저장되는 값" 표를 핵심 시각화로 썼고, 그 값을 `stored-values.ts` 한 곳에 두어 본문과 테스트가 함께 쓰게 했다 — type-coercion의 `conversion-table.ts` 패턴. 테스트는 vm에서 `toFixed(100)`으로 정확한 십진 값을 계산해 대조한다.
- [무검토 승인] 12장 이후 API(`Number.EPSILON`·`Number.MAX_SAFE_INTEGER`·`Math`·`toFixed`)를 본문에 쓰지 않고 `2 ** 53` 주변 계산과 `(1 + 2) / 10 === 0.3`으로 현상만 보여 줬다 — 학습 범위 규칙(AGENTS). 이름은 단순화 목록에만 둔다.
- [무검토 승인] `**`를 7장 범위로 보고 예제에 썼다 — 사용자 확인이 남아 있다.
- 로드맵 2번이라는 범위와 "표 + 퀴즈" 형식은 사용자가 정했다.

#### 배경지식
- Number 타입은 IEEE 754-2019 binary64 값이다(The Number Type). 숫자 리터럴은 유효숫자 20자리 이하이면 그 수학적 값에 가장 가까운 Number 값이 된다(RoundMVResult).
- Number::add는 정확한 합을 구한 뒤 roundTiesToEven으로 반올림한다. 그래서 `0.1 + 0.2`의 결과(0.3000000000000000444…)는 리터럴 `0.3`의 값(0.2999999999999999888…)과 다른 Number 값이다.
- 2의 53제곱을 넘으면 표현 가능한 정수 사이 간격이 2 이상이 된다. 1/10처럼 분모에 5가 있는 분수는 2진수로 끝나지 않는다.

#### 확인 질문
1. `0.1 + 0.2 === 0.3`은 false인데 `(1 + 2) / 10 === 0.3`은 true인 이유는?
   <details><summary>답</summary>앞의 식은 0.1과 0.2가 각각 반올림되어 저장된 값을 더한 뒤 다시 반올림해 0.3의 저장 값과 다른 값이 된다. 뒤의 식은 정수 3을 10으로 나눈 정확한 3/10을 한 번만 반올림하므로 리터럴 0.3과 같은 "3/10에 가장 가까운 값"이 된다(본문 동작 원리, `stored-values.ts`).</details>
2. `2 ** 53 + 1`이 `2 ** 53`이 되는 것을 "작은 쪽으로 버린다"고 설명하면 왜 틀리는가?
   <details><summary>답</summary>`2 ** 53 + 1`은 두 표현 가능 값의 정확히 가운데이고, 명세는 이때 2진 표현 마지막 자리가 0인 쪽을 고른다. 같은 규칙으로 `2 ** 53 + 3`은 큰 쪽인 `2 ** 53 + 4`가 된다(`concept.test.ts` 본문 서술 근거).</details>
3. 명세가 "안전한 정수"의 최댓값을 2의 53제곱이 아니라 2의 53제곱 − 1로 두는 이유는?
   <details><summary>답</summary>`2 ** 53`은 표현할 수 있지만 `2 ** 53 + 1`도 반올림되면 같은 값이 되므로, 그 값이 원래 어떤 정수였는지 구별할 수 없다. 명세 Number.MAX_SAFE_INTEGER의 Note가 근거다(계획 2절).</details>
4. 저장 값 표가 테스트와 어긋나지 않게 한 방법과, 페이지에 `toFixed`를 쓰지 않은 이유는?
   <details><summary>답</summary>표 데이터를 `stored-values.ts` 하나로 두고 `content.mdx`와 `concept.test.ts`가 함께 import한다. 테스트만 vm에서 `toFixed(100)`으로 값을 계산해 대조한다. `toFixed`는 12장 이후에 배우는 숫자 메서드라 본문에는 쓰지 않았다(단순화 3).</details>
