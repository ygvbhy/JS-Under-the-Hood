# 동등 비교(`==`와 `===`) 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `87457c1`

## 0. 요약
- 목적: 로드맵 1번 개념 `/concepts/equality-operators`를 추가한다. `===`는 타입이 다르면 바로 `false`이고 `==`는 타입이 다르면 규칙에 따라 값을 바꾼 뒤 다시 비교한다는 것을 예제, 퀴즈, 비교 과정 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개 + e2e·빌드 테스트에 케이스 추가 + `docs/content-guide.md` 9단계 목록 문구. 공통 코드와 기존 세 개념은 바꾸지 않는다.
- 위험: 시뮬레이터 각 단계의 규칙·변환이 명세(IsLooselyEqual)와 어긋나는 것 → 테스트가 규칙을 직접 계산하고 소스를 vm으로 실행해 대조한다.
- 복잡도: 중간 · Consensus: 생략 (type-coercion과 같은 구조라 새 패턴이 없다. 명세 원문과 vm 실행 결과로 사실을 미리 확인했고, 그 당시 Critic이 지적한 소스 대조 검사를 처음부터 넣었다)
- 미확정: 1건

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 1번. 『모던 자바스크립트 Deep Dive』 7·9장 범위, 사용자 진도는 1~12장(2026-10-27 사용자 확인).
- 다룰 내용: `===`·`!==`(IsStrictlyEqual), `==`·`!=`(IsLooselyEqual)의 변환 규칙(null/undefined, 숫자와 문자열, 불리언, 원시 값과 객체), `NaN`과 `+0`/`-0`, `Number.isNaN`·`Object.is`, 객체 비교는 동일성(identity), `x == null` 관용구.
- `type-coercion`을 선행 개념으로 쓰고 같은 설명(ToNumber 표 등)을 반복하지 않는다. 그 페이지가 제외한 `==`를 이 페이지가 맡는다.
- 단계별 시뮬레이터를 넣는다(로드맵 결정).
- `docs/content-guide.md` 절차를 따르고 개념 폴더만 추가한다(테스트 확장 제외).

### 유지해야 하는 기존 동작
- 기존 세 개념의 페이지·시뮬레이터·테스트는 그대로 통과하고, 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 1개다(`tests/e2e/navigation.spec.ts:17`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위
- BigInt와 Symbol이 끼는 `==` 규칙(StringToBigInt, BigInt와 숫자 비교), 래퍼 객체(`new String`), `document.all`(`[[IsHTMLDDA]]`).
- `<=`·`>=` 같은 비교 연산자의 null 처리(`null >= 0`이 `true`인 것). 9절 후보로 둔다.
- SameValueZero(배열 `includes`, Map 등 미학습 범위), `switch`의 `case` 비교(로드맵 5번).
- 객체가 원시 값으로 바뀌는 내부 과정(`valueOf`·`toString`). type-coercion과 같은 수준(결과만)으로 다룬다.
- 기존 개념 `related`에 새 개념을 역방향으로 연결하는 일(9절 후보).

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 라우트는 폴더 스캔(`app/routes.ts`), 레지스트리는 `app/lib/concepts.ts`의 glob, 홈 정렬은 제목 `localeCompare(…, 'ko')`(`app/lib/concepts.ts:39`).
- 가장 가까운 참고 구현: `app/concepts/type-coercion/`(`scenarios.ts`의 `Val`·헬퍼 패턴 1~93행, `ConversionView.tsx`의 배지·`formatVal`·빈 상태 문구, `Simulator.tsx` 19줄 래퍼, `concept.test.ts`의 `errorNameOf`·"본문 주장 검증"·소스 대조 검사).
- 공통 테스트 자동 대상: `tests/examples.test.ts`(L1), `tests/content-integrity.test.ts`(L3), `tests/build/build-output.test.ts`(개념 레지스트리·HTML·sitemap). 개념별 프리렌더 블록은 `build-output.test.ts:139-161`처럼 수동 추가.
- e2e 개념별 상수 `tests/e2e/helpers.ts:3-8`, a11y 케이스 `tests/e2e/a11y.spec.ts:97-119`, responsive 케이스 `tests/e2e/responsive.spec.ts:68-95`.
- 예제 실행 환경: `tests/helpers/run-example.ts`(`runInNewContext`, sandbox는 `console`만, `util.format`).
- 명세(tc39.es/ecma262, 2026-10-27 확인):
  - `==` Evaluation은 `IsLooselyEqual(rightValue, leftValue)`, `===`는 `IsStrictlyEqual(rightValue, leftValue)`로 **오른쪽 값을 먼저 인수로** 넘긴다. `!=`·`!==`는 그 결과를 뒤집는다. Note 1: `A == B`는 평가 순서를 빼면 `B == A`와 같다. Note 2: `==`는 항상 전이적이지는 않다.
  - IsLooselyEqual 순서: ① 같은 타입이면 IsStrictlyEqual ② null·undefined 쌍이면 true ③ (Normative Optional) IsHTMLDDA ④ 숫자·문자열이면 문자열을 ToNumber 후 다시 비교 ⑤ BigInt·문자열 ⑥ 한쪽이 불리언이면 그쪽을 ToNumber 후 다시 비교 ⑦ 원시 값(문자열·숫자·BigInt·Symbol)과 객체면 객체를 ToPrimitive 후 다시 비교 ⑧ BigInt·유한 Number ⑨ 그 밖은 false.
  - IsStrictlyEqual: 타입이 다르면 false, 숫자면 Number::equal(NaN이면 false, `+0`과 `-0`은 true), 그 밖은 SameValueNonNumber(문자열은 길이와 코드 유닛이 같아야 true). SameValue(`Object.is`)는 숫자만 Number::sameValue로 다르게 비교한다.
  - 앵커 존재 확인: `sec-equality-operators`, `sec-equality-operators-runtime-semantics-evaluation`, `sec-islooselyequal`, `sec-isstrictlyequal`, `sec-numeric-types-number-equal`, `sec-samevalue`, `sec-samevaluenonnumber`, `sec-object.is`, `sec-number.isnan`, `sec-toprimitive`, `sec-tonumber`.
- MDN(ko) 200 확인: `Reference/Operators/Equality`, `Strict_equality`, `Inequality`, `Strict_inequality`, `Equality_comparisons_and_sameness`, `Reference/Global_Objects/Object/is`, `Reference/Global_Objects/Number/isNaN`.
- 예제 초안 실제 출력(Node 24.22.1 `vm`, `run-example.ts`와 같은 방식, 8절 1단계 원문 그대로):

  | 예제 | 출력 (`console.log` 줄마다) |
  | - | - |
  | `strict.js` | `true false true` / `true false true` |
  | `number-string.js` | `true false false` |
  | `boolean.js` | `true false` |
  | `null-undefined.js` | `true false false` |
  | `nan-and-zero.js` | `false false` / `true true` / `true false` |
  | `objects.js` | `false false true` / `true` |
  | `null-check.js` | `true false` / `true false` / `false` |

- 본문 서술 근거(vm): `0 == '0'` true, `false == ''` true, `false == 'false'` false, `true == '1'` true, `true == 2` false, `null == false` false, `undefined == 0` false, `undefined == ''` false, `' 1 ' == 1` true, `'0' ? 'truthy' : 'falsy'` → `'truthy'`.
- 홈 정렬(실행 확인): `단축 평가…` → `동등 비교…` → `암묵적 타입 변환…` → `원시 값과 객체…`. 새 개념은 두 번째 카드다.
- summary 초안 143자, `객체` 없음(실행 확인).

### 추정
- `Object.is`와 `Number.isNaN`은 도서 7장 비교 연산자 절에서 소개되는 범위라고 보고 포함한다. 근거: 일치 비교의 `NaN`·`±0` 예외를 다루는 맥락. 확인 시점: 사용자 검토 게이트(`reviewedAt`).

## 3. 구현 전략
- type-coercion과 같은 구조(예제 → meta → 시나리오·불변식 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다.
- 시뮬레이터는 명세 IsLooselyEqual이 **변환한 뒤 자기 자신을 다시 호출**하는 구조를 "비교 라운드" 목록으로 보여 준다. 라운드마다 두 값·타입, 적용된 규칙, 변환(있으면)을 표시하고, 마지막 라운드 다음 단계에서 결과와 변수를 보여 준다. `false == '0'` → `0 == '0'` → `0 == 0` → true처럼 변환이 쌓이는 과정이 이 개념의 핵심이라 이 모양을 골랐다.
- 버린 대안: ① 시뮬레이터 없이 표만 쓰기. 규칙이 여러 번 연쇄되는 경우(`true == 'true'`가 두 번 바뀐 뒤 `NaN` 비교)를 표로는 보여 주기 어렵다. ② type-coercion의 `ConversionView`를 import해 재사용하기. AGENTS 시뮬레이터 규칙상 개념 간 공유 부품은 `app/simulator/`뿐이고, 상태 모양(라운드 목록)도 다르다. 스타일 클래스 문자열만 같게 쓴다.
- 명세의 인수 순서 뒤바꿈(`IsLooselyEqual(right, left)`)은 Note 1의 대칭성 때문에 이 페이지 예제의 변환·결과와 무관하다. 시뮬레이터는 소스의 왼쪽·오른쪽 그대로 보여 주고 `simplifications`에 밝힌다(type-coercion의 `>` 단순화와 같은 처리).

## 4. 변경 파일
- 추가 `app/concepts/equality-operators/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 7개: `strict.js`, `number-string.js`, `boolean.js`, `null-undefined.js`, `nan-and-zero.js`, `objects.js`, `null-check.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `ComparisonView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `EQUALITY_PATH`, `EQUALITY_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(라이트·다크 describe 안)
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록
  - `docs/content-guide.md` 9단계: e2e 대상 개념 목록에 `equality-operators` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch1-12.md`: 1번 상태 갱신
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, 기존 세 개념 폴더, `package.json`(의존성 없음), `AGENTS.md`.

## 5. 위험 요소
- 시나리오 라운드의 규칙·변환을 손으로 잘못 적음 → 학습자에게 틀린 절차를 보여 줌 → 2단계 의미 검사(테스트가 타입 쌍에서 규칙을 계산)와 소스 대조 검사, 음성 확인.
- "==는 불리언으로 바꿔 비교한다"는 오해를 오히려 강화하는 문구 → 본문에서 불리언은 **숫자로** 바뀐다고 명시하고 `'0'`이 truthy인데 `'0' == false`가 true인 예를 함께 둔다(5단계 체크).
- `-0` 표시: `console.log(-0)`은 호스트 형식이 다를 수 있다 → 예제는 `-0`을 직접 출력하지 않고 불리언 결과만 출력한다(`nan-and-zero.js`).
- 객체 예제의 `'[object Object]'` 비교가 type-coercion 페이지의 설명과 어긋남 → 같은 문구("데이터만 담은 객체 리터럴")와 같은 단순화 범위를 쓴다.
- `객체` 검색 1건 가정 → meta 세 필드 검사(1단계 완료 조건).
- 홈 카드 순서 변화(새 개념이 두 번째) → 정렬 규칙대로의 결과. `navigation.spec.ts`는 검색 후 1건만 확인하므로 영향 없음.
- 공통 셸 미수정이므로 기존 시뮬레이터 회귀는 없어야 한다 → 전체 검증 순서로 확인.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 7개 실제 출력 = `expectedOutput`, "본문 주장 검증", 시나리오 의미·소스 대조·바인딩 값 검사, 음성 확인(2단계 5가지).
- 브라우저(dev 서버 재시작 후 `/concepts/equality-operators`):
  1. 첫 화면: "검토 중" 배지, 학습 목표, 선행 개념 중 `type-coercion`·`primitives-and-objects` 링크, 퀴즈가 라디오 UI.
  2. 시나리오 `불리언과 비교`: 2단계에 라운드 1 `false == "0"`, 규칙 "한쪽이 불리언이므로 불리언을 숫자로", 변환 `false → 0`. 3단계에 라운드 2 `0 == "0"`과 `"0" → 0`. 4단계 라운드 3 "타입이 같으므로 ===처럼 비교". 5단계 `결과: true`, `d = true`.
  3. 시나리오 `null과 undefined`: `null == 0` 라운드에서 규칙 "해당하는 변환 규칙이 없으므로 false", 변환 줄 없음.
  4. 시나리오 `숫자와 문자열`: `0 === ""` 라운드 규칙 "===: 타입이 다르므로 false", 마지막 단계 콘솔 `true false false`.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: 카드 4개(새 개념 두 번째), `객체` 검색 1건, `동등` 검색 1건.

## 7. 미확정 사항
- [미확정] `Object.is`·`Number.isNaN`을 학습 범위로 볼지(2절 추정). 범위 밖이면 `nan-and-zero.js` 둘째 줄과 관련 문단·퀴즈 선택지만 빼면 되므로 계획 구조는 같다. 사용자 검토 게이트에서 확인한다.

## 8. 작업 순서

### 1. 예제·meta·본문 주장 검증
- 대상: `examples/*.js` 7개, `meta.ts`, `concept.test.ts`("본문 주장 검증" describe만), `route.tsx`, h2 3개만 있는 `content.mdx` 골격
- 현재: 폴더 없음
- 변경:
  - 예제를 아래 원문 그대로 만든다(파일 끝 줄바꿈 1개, 줄 번호를 시뮬레이터가 쓴다).

    `strict.js`
    ```js
    console.log(1 === 1, 1 === '1', 'a' === 'a');
    console.log(1 == '1', 1 != '1', 1 !== '1');
    ```
    `number-string.js` (시나리오)
    ```js
    const a = 0 == '';
    const b = '0' == '';
    const c = 0 === '';
    console.log(a, b, c);
    ```
    `boolean.js` (시나리오)
    ```js
    const d = false == '0';
    const e = true == 'true';
    console.log(d, e);
    ```
    `null-undefined.js` (시나리오)
    ```js
    const f = null == undefined;
    const g = null == 0;
    const h = null === undefined;
    console.log(f, g, h);
    ```
    `nan-and-zero.js`
    ```js
    const x = NaN;
    console.log(x === x, x == x);
    console.log(Number.isNaN(x), Object.is(x, NaN));
    console.log(0 === -0, Object.is(0, -0));
    ```
    `objects.js`
    ```js
    const p = { n: 1 };
    const q = { n: 1 };
    const r = p;
    console.log(p == q, p === q, p === r);
    console.log(p == '[object Object]');
    ```
    `null-check.js`
    ```js
    let value;
    console.log(value == null, value === null);
    value = null;
    console.log(value == null, value === undefined);
    value = 0;
    console.log(value == null);
    ```
  - `meta.ts`:
    - `slug: 'equality-operators'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: ['type-coercion', 'primitives-and-objects']`
    - `title: '동등 비교: ==와 ===는 무엇이 다른가'`
    - `summary`(143자): `===는 타입이 다르면 바로 false이고, ==는 타입이 다르면 정해진 규칙에 따라 값을 바꾼 뒤 다시 비교합니다. 규칙을 알면 0 == ''가 true인데 '0' == ''는 false이고 NaN === NaN이 false인 이유를 설명할 수 있습니다.`
    - `tags`(`객체` 금지): `동등 비교`, `일치 비교`, `느슨한 동등 비교`, `엄격한 동등 비교`, `==`, `===`, `!=`, `!==`, `loose equality`, `strict equality`, `IsLooselyEqual`, `IsStrictlyEqual`, `NaN`, `Object.is`, `Number.isNaN`, `null`, `undefined`
    - `goals`: ① `===`가 타입이 다르면 값을 바꾸지 않고 `false`를 돌려준다는 것을 설명할 수 있다 ② `==`가 타입이 다를 때 적용하는 규칙(null/undefined, 문자열을 숫자로, 불리언을 숫자로)을 순서대로 적용해 결과를 예측할 수 있다 ③ `==`가 불리언으로 바꿔 비교하지 않는다는 것을 truthy/falsy와 구분해 설명할 수 있다 ④ `NaN`과 `+0`/`-0`에서 `===`의 예외를 알고 `Number.isNaN`·`Object.is`로 확인할 수 있다 ⑤ 두 객체의 비교가 내용이 아니라 같은 객체인지로 결정된다는 것을 설명할 수 있다
    - `prerequisites`: `{ label: '데이터 타입' }`, `{ label: '연산자' }`, `{ label: '암묵적 타입 변환', slug: 'type-coercion' }`, `{ label: '원시 값과 객체', slug: 'primitives-and-objects' }`
    - `examples`: 위 7개. `expectedOutput`은 `[]`로 두고 `npm test` 실제 출력을 2절 표와 대조한 뒤 채운다(다르면 멈추고 원인 확인).
    - `simplifications`:
      1. 시뮬레이터는 IsLooselyEqual이 값을 바꾼 뒤 자기 자신을 다시 호출하는 과정을 "라운드"로 나눠 보여 준다. 평가 단계(GetValue)와 완료 처리 표기(`!`, `?`)는 묶어서 표시하지 않는다.
      2. 명세는 `a == b`·`a === b`를 오른쪽 값을 첫 인수로 넘겨(`IsLooselyEqual(b, a)`) 계산한다. 명세 Note대로 `a == b`는 평가 순서를 빼면 `b == a`와 같으므로, 시뮬레이터와 본문은 왼쪽·오른쪽을 소스 그대로 보여 준다.
      3. "문자열을 숫자로", "불리언을 숫자로", "해당하는 규칙이 없음" 같은 규칙 이름과 "라운드"는 교육용 이름이며 명세 용어가 아니다.
      4. BigInt·Symbol이 끼는 `==` 규칙(문자열을 BigInt로 바꾸는 규칙, BigInt와 숫자 비교)은 다루지 않는다.
      5. 객체를 원시 값으로 바꾸는 과정(ToPrimitive)은 결과만 보여 준다. 데이터만 담은 객체 리터럴은 문자열 `"[object Object]"`가 되며, `valueOf`·`toString`을 직접 정의한 객체는 결과가 달라지는데 이 경우는 다루지 않는다(암묵적 타입 변환 페이지와 같은 범위).
      6. 브라우저 호스트의 `document.all`(명세 부록 B의 `[[IsHTMLDDA]]`)이 `null`·`undefined`와 `==`로 같다고 판정되는 예외는 다루지 않는다.
      7. 문자열의 일치 비교는 명세상 길이와 같은 위치의 UTF-16 코드 유닛이 모두 같은지로 판정한다. 이 페이지는 "같은 문자열인지"로 줄여 말한다.
      8. 같은 값인지 판정하는 명세 알고리즘은 IsStrictlyEqual·IsLooselyEqual·SameValue 외에 SameValueZero도 있지만 다루지 않는다. `Object.is`는 SameValue이며 이 페이지는 `NaN`·`+0`/`-0`에서의 차이만 다룬다.
      9. `<=`, `>=` 같은 비교 연산자는 `==`와 다른 규칙을 쓰며 다루지 않는다.
      10. 변수는 선언문이 실행된 뒤에만 표시한다(호이스팅·TDZ는 별도 개념에서 다룬다). 이 코드가 선언한 변수만 표시한다.
      11. `console.log`는 호스트 API이며, 문자열을 따옴표 없이 출력하는 것은 호스트의 출력 형식이다. 시각화는 문자열에 큰따옴표를 붙이고 타입을 함께 적는다.
    - `references`(라벨 형식은 type-coercion과 같게 `ECMAScript 명세 — …`, `MDN — …`): 명세 Equality Operators(`#sec-equality-operators`), Equality Operators: Runtime Semantics: Evaluation, IsLooselyEqual, IsStrictlyEqual, Number::equal, SameValue, Object.is, Number.isNaN / MDN(ko) 동등 연산자(==), 일치 연산자(===), 부등 연산자(!=), 불일치 연산자(!==), 동등 비교 및 동일성, Object.is(), Number.isNaN(). URL은 2절에서 확인한 것만 쓴다.
  - `concept.test.ts` "본문 주장 검증"(`runInNewContext`):
    - 2절 "본문 서술 근거" 목록 10개를 `it.each([source, expected])`로.
    - 명세 Note 2(전이적이지 않음): `0 == ''`·`0 == '0'`이 true인데 `'' == '0'`이 false.
    - 대칭성: 시나리오에 쓰는 6개 `==` 식에 대해 `a == b`와 `b == a`의 결과가 같다(단순화 2의 근거).
- 이유: 페이지의 사실 근거를 먼저 고정한다(가장 큰 위험은 내용 정확성).
- 주의사항: `meta.ts`는 `ConceptMeta` 타입 외 import 금지.
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/equality-operators` 통과. 실제 출력 = 2절 표. `node -e`로 meta의 `title`·`summary`·`tags`에 `객체`가 없음을 확인한다.

### 2. 상태 모델·시나리오·의미 불변식 테스트
- 대상: `scenarios.ts`, `concept.test.ts`
- 변경:
  - 상태 타입(전체 스냅샷):
    ```ts
    export type Val = {
      type: 'undefined' | 'null' | 'boolean' | 'number' | 'string'
      display: string // number: String(n), string: 따옴표 없는 내용, 나머지: 소스 표기
    }
    // same-type: 같은 타입 → ===와 같은 방법으로 값 비교 / null-undefined: null과 undefined → true
    // string-to-number: 숫자와 문자열 → 문자열을 숫자로 / boolean-to-number: 한쪽이 불리언 → 불리언을 숫자로
    // no-rule: 해당하는 규칙 없음 → false / strict-type-differs: ===에서 타입이 다름 → false
    export type Rule =
      | 'same-type' | 'null-undefined' | 'string-to-number' | 'boolean-to-number' | 'no-rule' | 'strict-type-differs'
    export type Conversion = { side: 'left' | 'right'; via: 'ToNumber'; to: Val }
    export type Round = { left: Val; right: Val; rule: Rule; converted?: Conversion }
    export type Comparison = {
      code: string // 소스의 비교 식 전체: "false == '0'"
      operator: '==' | '==='
      rounds: Round[] // 지금까지 보여 준 라운드
      result?: Val // 결과 단계에서만 (boolean)
    }
    export type Binding = { name: string; declaredWith: 'const'; value: Val; changed?: boolean }
    export type EqState = { bindings: Binding[]; comparison?: Comparison }
    ```
    `Val` 생성은 헬퍼(`num`, `str`, `bool`, `nul`, `undef`)로만 한다.
  - 시나리오 3개(id·label·exampleId): `number-string`·`숫자와 문자열`·`number-string`, `boolean`·`불리언과 비교`·`boolean`, `null-undefined`·`null과 undefined`·`null-undefined`.
  - 단계 구성: 첫 단계 "실행 전"(`line` 없음, `{ bindings: [] }`, `output: []`). 비교 식마다 라운드 하나당 한 단계(라운드를 하나씩 추가, `result` 없음) → 결과 단계(`result` + 바인딩 초기화, 새 바인딩만 `changed`). 마지막 `console.log` 단계는 `comparison` 없음, 바인딩 유지.
    - `number-string`(9단계): 실행 전 → `0 == ''` R1 `0`·`""` string-to-number(right → 0) → R2 `0`·`0` same-type → 결과 true, `a` → `'0' == ''` R1 same-type → 결과 false, `b` → `0 === ''` R1 strict-type-differs → 결과 false, `c` → 출력 `true false false`
    - `boolean`(10단계): 실행 전 → `false == '0'` R1 boolean-to-number(left → 0) → R2 `0`·`"0"` string-to-number(right → 0) → R3 same-type → 결과 true, `d` → `true == 'true'` R1 boolean-to-number(left → 1) → R2 `1`·`"true"` string-to-number(right → NaN) → R3 `1`·`NaN` same-type → 결과 false(설명: NaN은 어떤 값과도 같지 않음), `e` → 출력 `true false`
    - `null-undefined`(8단계): 실행 전 → `null == undefined` R1 null-undefined → 결과 true, `f` → `null == 0` R1 no-rule(설명: null은 숫자로 바뀌지 않고 이 쌍에 맞는 규칙이 없음) → 결과 false, `g` → `null === undefined` R1 strict-type-differs → 결과 false, `h` → 출력 `true false false`
  - `concept.test.ts`에 추가:
    - 시나리오마다 `assertScenarioInvariants`, id 순서 고정, 첫 단계 빈 상태·`line` 없음.
    - 구조: 바인딩 이름 중복 없음, `changed`는 그 단계에 새로 생긴 바인딩에만. 한 비교 안에서 단계마다 `rounds`는 이전 단계 `rounds`에 하나를 더한 것(앞부분 동일). 결과 단계의 `rounds`는 직전 단계와 같다. 출력 단계는 `comparison`이 없다. `comparison.code`가 그 단계 `line` 소스 줄의 초기화 식(`const a = ` 뒤 `;` 앞)과 같다.
    - 라운드 연결: `converted`가 있는 라운드 다음 라운드는 변환한 쪽만 `converted.to`로 바뀐 값이다. 마지막 라운드에는 `converted`가 없고, 변환이 없는 라운드는 마지막이다.
    - 소스 대조: `comparison.code`를 `operator`로 나눈 왼쪽·오른쪽 소스를 vm으로 실행한 값이 R1의 `left`·`right`와 같다. `comparison.code`를 vm으로 실행한 값이 `result`와 같다.
    - 의미 검사(테스트가 두 값의 타입에서 규칙을 계산): `===`이면 같은 타입 → `same-type`, 아니면 `strict-type-differs`. `==`이면 같은 타입 → `same-type`, null·undefined 쌍 → `null-undefined`, 숫자·문자열 → `string-to-number`(문자열 쪽), 한쪽이 불리언 → `boolean-to-number`(불리언 쪽), 그 밖 → `no-rule`. `converted.to`는 vm에서 `Number(lit(v))`를 계산한 값과 같다. 결과는 마지막 라운드가 `same-type`이면 vm `lit(left) === lit(right)`, `null-undefined`면 true, 나머지 false와 같다(`lit`: 문자열 `JSON.stringify`, 숫자 `NaN`은 `NaN`, 나머지 display).
    - 바인딩 값: 예제 원문 끝에 `console.log(JSON.stringify([typeof a, a, ...]))`를 붙여 `runExample`로 실행하고 마지막 단계 바인딩과 대조.
- 이유: 단계 내용이 명세 절차와 같음을 자동으로 보장한다.
- 주의사항: 테스트의 규칙 분류 순서는 2절 명세 순서(숫자·문자열 규칙이 불리언 규칙보다 먼저)를 따른다. 이 페이지 시나리오에는 둘이 동시에 맞는 쌍이 없지만 순서를 바꾸지 않는다.
- 완료 조건: `npm test -- app/concepts/equality-operators/concept.test.ts` 통과. 음성 확인 5가지를 일부러 넣어 실패를 확인하고 되돌린다: ① `boolean` R1 규칙을 `string-to-number`로(의미 검사) ② `boolean` `true == 'true'` R2 변환 결과를 `num(0)`으로(변환 값 검사) ③ `null-undefined` `null == 0` R1을 `boolean-to-number` + 변환 추가로(의미 검사) ④ `number-string` `'0' == ''` 결과를 true로(소스 대조) ⑤ `number-string` R1의 `left`를 `str('0')`으로(소스 대조).

### 3. 시각화 컴포넌트 ComparisonView
- 대상: `ComparisonView.tsx`, `ComparisonView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `EqState`를 그린다.
  - "비교 중인 식" 영역(`section` + `useId` `aria-labelledby`): 없으면 "아직 비교 중인 식이 없습니다." 있으면 식 소스(`font-mono`), 연산자 배지(`==` 느슨한 비교 / `===` 일치 비교), 라운드 순서 목록(`<ol>`): 라운드마다 `라운드 N`, `왼쪽값 연산자 오른쪽값`과 각 타입 배지, 규칙 문구, 변환이 있으면 `→ 왼쪽(또는 오른쪽) 값을 숫자로: "0" → 0 (ToNumber)` 줄. 결과가 있으면 "결과: true (불리언)".
  - 규칙 문구: `same-type` "타입이 같으므로 ===와 같은 방법으로 값을 비교", `null-undefined` "null과 undefined이므로 true", `string-to-number` "숫자와 문자열이므로 문자열을 숫자로 바꿔 다시 비교", `boolean-to-number` "한쪽이 불리언이므로 불리언을 숫자로 바꿔 다시 비교", `no-rule` "해당하는 변환 규칙이 없으므로 false", `strict-type-differs` "===는 타입이 다르면 값을 바꾸지 않고 false".
  - "변수" 영역: ConversionView와 같은 모양(`const` 배지, `이름 = 값`, 타입 배지, `새로 생김`).
  - 스타일 토큰·배지·줄바꿈 클래스 문자열은 `type-coercion/ConversionView.tsx`와 같게 쓴다(import하지 않음). 타입 배지 라벨에 `undefined`·`null` 추가.
- 이유: 상태 모양이 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더되는 첫 단계(빈 상태)가 JS 없이 의미 있게 보여야 한다. 애니메이션은 `motion-safe:`만. 375px에서 라운드 줄이 넘치지 않게 `flex-wrap`·`break-words [overflow-wrap:anywhere]`.
- 완료 조건: `ComparisonView.test.tsx` 통과 — 빈 상태 문구 2개, 라운드 2개 상태에서 `라운드 1`·`라운드 2`와 규칙 문구, 변환 줄(`"0" → 0`, `ToNumber`), 결과 미표시, 결과 단계에서 `결과:`·`새로 생김`, 문자열 큰따옴표, `NaN` 표시.

### 4. Simulator 래퍼
- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `type-coercion/Simulator.tsx`와 같은 모양. `label="동등 비교 시뮬레이터"`, `renderState={(state) => <ComparisonView state={state} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `숫자와 문자열` "실행 전", 다음 클릭 시 1번 줄 강조(`aria-current="step"`)와 `라운드 1`, 시나리오 전환 시 0단계로 돌아감(type-coercion `Simulator.test.tsx`와 같은 범위).

### 5. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `Simulator`, `scenarios` import)
- 변경:
  - `## 동작 원리`
    - 동등 연산자 네 개: `===`(일치), `!==`(불일치), `==`(동등), `!=`(부동등). `!=`·`!==`는 각각 `==`·`===`의 결과를 뒤집은 것이다.
    - `===`: 타입이 다르면 값을 바꾸지 않고 `false`. 타입이 같으면 값을 비교한다. 예외 두 가지: `NaN`은 자기 자신과도 같지 않다, `+0`과 `-0`은 같다. 객체는 같은 객체일 때만 같다([원시 값과 객체](/concepts/primitives-and-objects) 링크).
    - `==`: 타입이 같으면 `===`와 같은 결과. 타입이 다르면 아래 규칙을 위에서부터 확인하고, 값을 바꿨으면 처음부터 다시 비교한다(JSX `<table>` 또는 순서 목록: null·undefined / 숫자와 문자열 / 불리언 / 원시 값과 객체 / 그 밖은 false). ToNumber 결과는 [암묵적 타입 변환](/concepts/type-coercion) 페이지의 표를 링크하고 반복하지 않는다.
    - `==`는 불리언으로 바꿔 비교하지 않는다: 불리언은 숫자(1, 0)로 바뀐다. 그래서 truthy인 `'0'`도 `'0' == false`는 true이고, `'true' == true`는 false다.
    - `NaN` 확인은 `Number.isNaN`, `+0`/`-0`까지 구분하려면 `Object.is`.
    - `x == null`은 `x`가 `null`이거나 `undefined`일 때만 true다(null은 다른 값으로 바뀌지 않으므로 `0`, `''`, `false`와는 같지 않다).
  - `## 예제`: 예제 7개를 `file=` 코드 펜스로. `PredictQuiz` 6개(strict, number-string, boolean, null-undefined, nan-and-zero, objects; 선택지 3~4개, 여러 줄이면 질문에 ' / ' 안내, 정답은 실제 출력). 시나리오 예제 3개 뒤에 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`.
  - `## 결과와 이유`: JSX `<table>`(식 / 적용된 규칙 / 결과), 예제별 이유 문단, `Callout type="misconception"` 5개: ① "`==`는 양쪽을 불리언으로 바꿔 비교한다" ② "`==`로 같은 값끼리는 서로도 같다"(`0 == ''`, `0 == '0'`인데 `'' == '0'`은 false — 명세 Note 2) ③ "`null`은 `0`이나 `false`와 `==`로 같다" ④ "`NaN`은 `=== NaN`으로 찾을 수 있다" ⑤ "내용이 같은 두 객체는 `==`로 같다".
- 주의사항: 미학습 개념(실행 컨텍스트, 프로토타입, 배열, `try...catch`)을 설명하지 않는다. 같은 대상은 같은 이름으로 부른다("문자열을 숫자로 바꾼다"). CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다. 특정 스타일을 강요하는 권고("항상 ===를 써야 한다")는 쓰지 않고, `===`는 변환 규칙 없이 결과를 예측할 수 있다는 사실만 쓴다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/equality-operators/index.html`에 `<details` 6개 이상, 시뮬레이터 0단계 텍스트, 라디오 3개 이상, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 남은 `**` 0건.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch1-12.md`
- 변경: type-coercion 케이스를 본떠 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y 시뮬레이터 케이스는 `test.slow()`. 빌드 블록은 `단계 1: 실행 전`, `아직 비교 중인 식이 없습니다.`, `아직 표시할 변수가 없습니다.`, region `aria-label`, 시나리오 라벨 3개, `<details` 5개 이상.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~6을 dev 서버 재시작 후 확인하고 스크린샷 1장 이상.

## 9. 추가 개선 후보
- 기존 개념 `related`에 `equality-operators` 역방향 연결(특히 `type-coercion`의 단순화 9 "==는 다루지 않는다"에서 이 페이지 링크).
- `null >= 0`이 `true`인데 `null == 0`은 `false`인 대비(비교 연산자와 동등 연산자의 규칙 차이).

## 구현 진행

- baseline (2026-10-27, `87457c1`): lint·format:check·typecheck 오류 0, `npm test` 479 통과, `test:build` 27 통과, e2e 79 통과·3 건너뜀(기존 의도된 3건)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 79 통과, lint·typecheck 0. 예제 7개가 계획 단계 실행본과 바이트 동일(`cmp`), 실제 출력 = 2절 표. title·summary·tags에 `객체` 없음. meta 문구는 type-coercion 형식에 맞춰 백틱 없이 작성
- [x] 2. 상태 모델·시나리오·의미 검사 — 메인 재실행: vitest(개념) 70 통과, lint·typecheck·prettier 0. 단계 수 9/10/8. 음성 확인 ①~⑤는 서브에이전트 보고(각 2~4건 실패), 메인이 추가로 `false == '0'` R2 변환 결과를 `num(1)`로 바꿔 2건 실패 재현 후 원복. 단계 설명 26개를 메인이 명세와 대조해 4곳 수정: `null == 0`의 "null은 숫자로 바뀌지 않으므로" → "==는 null을 숫자로 바꾸지 않으므로"(+null이 0인 type-coercion 설명과 충돌 방지, 라운드·결과 단계 2곳), "숫자 모양이 아닌" → "숫자로 읽을 수 없는"(type-coercion 용어 통일), NaN 문장을 "===로 비교하면"으로 한정(Object.is와 구분)
- [x] 3. ComparisonView — 메인 재실행: vitest(개념) 80 통과, lint·typecheck 0. 코드 확인: 규칙·타입·변환이 텍스트로 전달, 문자열 큰따옴표, 클래스 문자열이 ConversionView와 같음(import 없음), `flex-wrap`·`overflow-wrap:anywhere`, 하이드레이션 영향 값 없음(useId만). 계획 외 추가: 값마다 타입 배지(ValueWithType) — 텍스트 보강이라 수용. 대비·375px는 6단계에서 확인
- [x] 4. Simulator 래퍼 — type-coercion 래퍼와의 diff가 import·타입·주석·label·View 호출뿐. Simulator.test 3개 포함 통과
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·vm 근거와 대조해 수정: "같은 객체를 가리키는" 4곳 → "같은 객체를 값으로 가진"(primitives-and-objects 용어 통일, AGENTS 원인 설명 규칙), `null == false`가 규칙 ③을 거쳐 ⑤에 이른다는 괄호 보강, `===` 정의 문장("두 값이 같으면" → "타입이 같고 값도 같으면"), 예제 7 이유 문장 재작성, Callout 2·5를 Prettier 줄바꿈에도 조사 앞 공백이 생기지 않게 재구성(`{ n: 1 }`을 JSX code로), 소제목·퀴즈 설명의 `== 는`·`=== 의` 공백 제거. 본문의 실행 결과 주장은 모두 2절 목록·예제 출력·concept.test.ts 근거 안에 있음. 빌드 HTML: `<details` 6, 라디오 3, 0단계 문구 있음, 공백 깨진 code 0, `**` 0
- [x] 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인 — 테스트 추가만(기존 파일의 삭제 줄은 content-guide 9단계 목록 문구 1줄뿐). 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 575, `test:build` 32(baseline 27 + 새 프리렌더 블록 등), e2e 91 통과·3 건너뜀(기존 3건), axe 위반 0. 브라우저(빌드 결과를 `serve`로 띄워 Playwright로 확인, dev 서버 대신): 1280px 다크 `불리언과 비교` 2~5단계(라운드 1~3, `false → 0`, `"0" → 0`, `결과: true`, `d = true`, `새로 생김`), `null == 0` 라운드 규칙 문구·변환 줄 없음, `0 === ''` 라운드 "===는 타입이 다르면…"·`=== 일치 비교` 배지, 마지막 출력 `true false false`. 375px 라이트에서 키보드 →×3/←/Home 동작, 가로 넘침 0. 콘솔 에러 0. 홈 카드 4개(새 개념 두 번째), `객체` 검색 1건, `동등` 검색 1건. 스크린샷 2장(scratchpad)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff 규모가 개념 폴더 1개 + 테스트 추가라 sub agent 생략): Critical/High 0. Low 2(보고만): ① `ComparisonView.tsx` `RoundItem`의 `operator` prop이 `Comparison['operator']`가 아니라 `string` ② meta 단순화 1의 "묶어서 표시하지 않습니다" 문구가 모호(→ "따로 표시하지 않습니다"가 명확). 확인 필요 1: `Object.is`·`Number.isNaN` 학습 범위(7절 미확정, 사용자 검토 게이트)

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 브라우저 확인을 dev 서버 대신 빌드 결과(`serve`) + Playwright로 했다(같은 프리렌더·하이드레이션 경로) ② ComparisonView가 라운드의 값마다 타입 배지를 붙인다(텍스트 보강) ③ 메인 검토에서 시나리오 설명 4곳·본문 여러 곳의 문구를 명세·기존 페이지 용어와 맞게 고쳤다(구현 진행 2·5 참고).
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다(content-guide 10단계).

### 코드 리뷰
- Critical/High 0. Low 2건(`RoundItem` `operator` prop 타입이 `string`, meta 단순화 1의 "묶어서 표시하지 않습니다" 문구)은 보고만 하고 남겼다.

### 후속 작업
- [x] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록 — 2026-10-27 사용자 승인, `'2026-10-27'`
- [x] `Object.is`·`Number.isNaN` 학습 범위 확인 — 사용자가 페이지를 그대로 승인(2026-10-27), 유지
- [ ] 리뷰 Low 2건 반영 여부 결정
- [ ] 9절 추가 개선 후보(역방향 `related`, `null >= 0` 대비)
- [ ] 로드맵 2번 "숫자 타입의 함정" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] `null == 0` 설명을 "null은 숫자로 바뀌지 않는다"가 아니라 "`==`는 null을 숫자로 바꾸지 않는다"로 썼다 — `+null`은 0(ToNumber)이므로 앞 문장은 type-coercion 페이지와 모순된다. 바뀌지 않는 이유는 IsLooselyEqual에 null을 변환하는 단계가 없기 때문이다.
- [Claude 판단] "같은 객체를 가리킨다"를 "같은 객체를 값으로 가진다"로 통일했다 — primitives-and-objects 페이지의 명세 기반 용어이며, AGENTS 정확성 원칙(참조·주소 비유를 원인처럼 쓰지 않기)을 따른다.
- [무검토 승인] 시뮬레이터를 IsLooselyEqual의 재귀 호출 하나를 "라운드" 하나로 보여 주는 모양으로 설계했다 — 표만으로는 `true == 'true'`처럼 두 번 바뀐 뒤 NaN 비교로 끝나는 연쇄를 보여 주기 어렵다. type-coercion의 ConversionView를 재사용하지 않은 것은 AGENTS의 "개념 간 공유는 `app/simulator/`뿐" 규칙과 상태 모양 차이 때문이다.
- [무검토 승인] 명세는 `a == b`를 `IsLooselyEqual(b, a)`로 계산하지만 시뮬레이터는 소스 순서대로 보여 준다 — 명세 Note 1(평가 순서를 빼면 `a == b`는 `b == a`와 같다)이 근거이고, 대칭성은 `concept.test.ts`가 시나리오 식마다 검사한다. 단순화 2에 공개했다.
- [무검토 승인] 테스트가 시나리오에 적힌 규칙을 믿지 않고 값의 타입에서 규칙을 직접 계산해 대조한다(명세 순서: 숫자·문자열 규칙이 불리언 규칙보다 먼저) — 손으로 쓴 중간 단계의 오류를 잡는 장치다. 음성 확인 6건으로 실제로 실패하는 것을 확인했다.
- [무검토 승인] `Object.is`·`Number.isNaN`을 범위에 포함했다 — 7장 비교 연산자 범위로 추정했고, 사용자 확인이 남아 있다.
- 로드맵(1~12장, 8개 개념, 개념 하나씩 진행)과 이 개념을 1번으로 둔 것은 사용자가 정했다.

#### 배경지식
- IsLooselyEqual 순서: 같은 타입 → IsStrictlyEqual / null·undefined 쌍 → true / 숫자·문자열 → 문자열을 ToNumber 후 재비교 / 불리언 → 불리언을 ToNumber 후 재비교 / 원시 값·객체 → 객체를 ToPrimitive 후 재비교 / 그 밖 → false(BigInt·Symbol·IsHTMLDDA 단계는 페이지에서 제외).
- IsStrictlyEqual: 타입이 다르면 false. 숫자는 Number::equal(NaN은 항상 false, +0과 -0은 true). `Object.is`는 SameValue라 이 둘을 반대로 판정한다.
- 명세 Note 2: `==`는 전이적이지 않다(`0 == ''`, `0 == '0'`인데 `'' == '0'`은 false).
- 이 사이트의 시뮬레이터는 단계마다 전체 상태 스냅샷을 담고, `assertScenarioInvariants`가 코드 원문·마지막 출력·line 범위를 공통 검사한다.

#### 확인 질문
1. `'0'`은 truthy인데 `'0' == false`가 `true`인 이유는 무엇이고, 시뮬레이터에서는 몇 라운드로 보이는가?
   <details><summary>답</summary>`==`는 불리언으로 바꾸지 않고 불리언을 숫자로 바꾼다. false → 0(규칙 ③), 이어서 `'0'` → 0(규칙 ②), 0 == 0이 같은 타입 비교로 true. 시나리오 `boolean`의 `false == '0'`처럼 라운드 3개다(`scenarios.ts`, 계획 8절 2단계).</details>
2. `null == 0`이 false인 이유를 "null은 숫자로 바뀌지 않는다"로 설명하면 왜 틀린가?
   <details><summary>답</summary>`+null`은 0이다(ToNumber(null) = 0, type-coercion 페이지). `null == 0`이 false인 이유는 IsLooselyEqual의 어느 단계도 null을 변환하지 않아 마지막 단계에서 false가 되기 때문이다(계획 2절 명세 정리, 구현 진행 2).</details>
3. 시나리오의 규칙 분류에서 "숫자·문자열 → 문자열을 숫자로"를 "불리언 → 숫자로"보다 먼저 확인하는 순서를 바꾸면 이 페이지 시나리오의 결과가 달라지는가? 그래도 순서를 지키는 이유는?
   <details><summary>답</summary>이 페이지 시나리오에는 두 규칙이 동시에 맞는 타입 쌍(숫자·문자열이면서 불리언)이 없으므로 결과는 같다. 그래도 명세 순서를 그대로 따라야 이후 예제가 늘어도 테스트가 명세와 같은 판정을 한다(계획 8절 2단계 주의사항).</details>
4. 명세는 `a == b`를 `IsLooselyEqual(b, a)`로 계산하는데, 시뮬레이터가 왼쪽·오른쪽을 소스 순서로 보여 줘도 되는 근거와, 그 근거를 테스트로 어떻게 확인했는가?
   <details><summary>답</summary>명세 Note 1: 평가 순서를 빼면 `a == b`는 `b == a`와 같다. `concept.test.ts`의 "좌우를 바꿔도 결과가 같다" 테스트가 시나리오 식 6개를 양쪽 순서로 실행해 비교한다. meta 단순화 2에 공개했다.</details>
