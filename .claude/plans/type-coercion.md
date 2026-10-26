# 암묵적 타입 변환 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-26
- 기준: `main` @ `6600d85`

## 1. 목표

세 번째 개념 페이지 `/concepts/type-coercion`을 추가한다. 연산자와 조건식이 기대하는 타입이 아닌 값을 만나면 그 값을 문자열·숫자·불리언으로 바꿔(암묵적 타입 변환) 계산한다는 것을, 실행 검증된 예제, 예측 퀴즈, 연산 하나씩 피연산자의 변환을 보여 주는 단계별 시뮬레이터로 설명한다. 핵심 질문은 "`'3' + 4`는 왜 `'34'`이고, `'10' - '4'`는 왜 `6`이며, `'10' > '9'`는 왜 `false`인가"다.

## 2. 요구사항 정리

### 요구사항

- [확정] 개념: 암묵적 타입 변환(『모던 자바스크립트 Deep Dive』 9장 범위). 사용자 진도 1~12장(2026-10-26 사용자 확인).
- [확정] 범위(사용자 결정 2026-10-26): 핵심(문자열·숫자·불리언으로의 암묵적 변환, `+`의 문자열 연결 vs 산술 규칙, `'10' > '9'` 같은 비교) + ① 객체의 변환(간단히: 먼저 원시 값으로 바뀐다는 것과 결과만) ② 명시적 변환(`String()`·`Number()`·`Boolean()`)과의 비교 ③ 변환이 안 되는 경우(Symbol, BigInt 혼합 → TypeError. 예제가 아니라 본문 설명 + 테스트로 검증).
- [확정] 단계별 시뮬레이터를 넣는다(사용자 결정 2026-10-26).
- [확정] `docs/content-guide.md` 절차를 따르고, 공통 코드(`app/routes.ts`, `app/lib/`, `app/components/`, `app/simulator/`)를 수정하지 않고 개념 폴더만 추가한다(테스트 파일 확장 제외).
- [확정] 정확성 원칙: 모든 실행 결과 주장은 실제 실행으로 검증하고, 단순화는 `meta.simplifications`에 적는다. 도서 예제·문장은 쓰지 않는다.

### 유지해야 하는 기존 동작

- 기존 두 개념(`primitives-and-objects`, `short-circuit-evaluation`)의 페이지·시뮬레이터·테스트는 그대로 통과해야 하며, 그 파일들은 수정하지 않는다.
- e2e `navigation.spec.ts`는 `객체` 검색 결과가 **정확히 1개**라고 가정한다(`toHaveCount(1)`, `filterConcepts`는 title·summary·tags만 검색). 새 개념의 `title`·`summary`·`tags`에 문자열 `객체`를 넣지 않는다(goals·prerequisites·본문은 무관).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위

- `==`/`!=` 느슨한 동등 비교의 변환 규칙(별도 개념 후보), `<=`·`>=`·비트 연산자·단항 `-` 등 다른 연산자, `parseInt`/`parseFloat`, `toString()` 메서드 호출.
- 객체가 원시 값으로 바뀌는 내부 과정(ToPrimitive → OrdinaryToPrimitive가 `valueOf`·`toString`을 호출, `Symbol.toPrimitive`) — 프로토타입(미학습)이 필요하므로 결과만 보여 주고 단순화로 공개한다.
- 배열(미학습, 27장)의 변환. 예제에 배열을 쓰지 않는다.
- `try...catch`(미학습). 오류 동작은 본문 설명 + `concept.test.ts` "본문 주장 검증"으로만 근거화한다(단축 평가 개념과 같은 방식).
- 숫자→문자열 변환 세부(지수 표기, `-0`→`"0"`), 문자열→숫자 세부(`'0x10'`, `'Infinity'`, 지수 표기).

## 3. 현재 구조

- 라우트: `app/routes.ts`가 `app/concepts/*` 폴더를 서버 시작 시 스캔. 레지스트리는 `app/lib/concepts.ts`의 `import.meta.glob('../concepts/*/meta.ts')`.
- 공통 테스트가 새 폴더를 자동 검사: `tests/examples.test.ts`(L1, `tests/helpers/run-example.ts`: `runInNewContext` + `util.format`, sandbox에는 `console`만 주입 — `JSON`·`Symbol`·`String` 등은 새 컨텍스트의 내장으로 존재), `tests/content-integrity.test.ts`(slug, summary ≤160, 필수 h2 3개 등), `tests/build/build-output.test.ts`.
- 시뮬레이터 공통 셸: `app/simulator/SimulatorShell`(직전 커밋 `6600d85`에서 추출). 개념 폴더의 `Simulator.tsx`는 `label`과 `renderState`만 넘기는 얇은 래퍼(`short-circuit-evaluation/Simulator.tsx` 19줄).
- 시나리오 불변식: `tests/helpers/scenario-invariants.ts`의 `assertScenarioInvariants`. 상태 무결성·의미 검사는 개념별 `concept.test.ts`(참고: `short-circuit-evaluation/concept.test.ts`의 "본문 주장 검증" + 의미 검사 + 바인딩 값 검사 구조).
- 시각화 참고: `short-circuit-evaluation/EvaluationView.tsx`(테마 토큰 `border-border`·`bg-surface`·`bg-highlight`·`text-muted`, 배지, `break-words [overflow-wrap:anywhere]`, 문자열 값은 큰따옴표 `formatVal`).
- e2e: `tests/e2e/helpers.ts`에 개념별 경로·시뮬레이터 이름 상수, `a11y.spec.ts`·`responsive.spec.ts`에 개념별 케이스, `build-output.test.ts`에 개념별 시뮬레이터 프리렌더 블록(단축 평가 117행~).

### 실행 확인한 사실 (계획 단계, Node `vm` sloppy script, 예제 초안 원문 그대로)

| 예제 초안          | 실제 출력 (`console.log` 줄마다)                                                           |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `to-string.js`     | `"7" "true" "null" "undefined"` / `"합계: 10" "false"` / `number` (`let n`으로 실행해도 같음) |
| `to-number.js`     | `7 8 3 1` / `42 0 12 NaN` / `1 0 0 NaN`                                                    |
| `plus-order.js`    | `345 75`                                                                                   |
| `numeric-mix.js`   | `8 101`                                                                                    |
| `compare.js`       | `true false`                                                                               |
| `to-boolean.js`    | `참으로 판단` / `거짓으로 판단` / `false true`                                             |
| `object.js`        | `"[object Object]" "[object Object]"` / `NaN NaN`                                          |
| `explicit.js`      | `"5" "null" "true"` / `42 0 NaN 1 0 NaN` / `true false false true` / `"Symbol(id)" 10`     |

오류 동작(vm 실행 확인): `Symbol('id') + ''`, `` `${Symbol('id')}` ``, `+Symbol('id')`, `Number(Symbol('id'))`, `1n + 1`, `'10' - 1n`, `+10n` → 모두 `TypeError`. 반면 `10n + ''` → `'10'`, `String(Symbol('id'))` → `'Symbol(id)'`, `Number(10n)` → `10`, `!Symbol('id')` → `false`, `1n > 0`·`'10' > 9n` → `true`(비교는 BigInt와 Number를 섞어도 오류 아님).

그 밖에 본문 서술 근거로 확인한 사실(vm): `'1' + 2 * 3` → `'16'`(우선순위가 높은 `*`가 먼저), `'1' < '10'` → `true`(앞부분이 같으면 짧은 쪽이 작다), `'abc' > 1`·`'abc' < 1` → 둘 다 `false`(NaN), `'  ' - 0` → `0`, `const p = { valueOf() { return 1 } }`일 때 `p + ''` → `'1'`이지만 `` `${p}` ``·`String(p)` → `'[object Object]'`(명세 템플릿 리터럴 Evaluation의 Note: 치환식의 문자열 변환은 "`+` 연산자가 아니라 String.prototype.concat과 같다" — 템플릿은 ToString, `+`는 hint 없는 ToPrimitive 후 판단).

명세 앵커 존재 확인(2026-10-26, tc39.es/ecma262 단일 페이지 HTML에서 id 확인): `sec-type-conversion`, `sec-toprimitive`, `sec-ordinarytoprimitive`, `sec-toboolean`, `sec-tonumber`, `sec-stringtonumber`, `sec-tostring`, `sec-tonumeric`, `sec-applystringornumericbinaryoperator`, `sec-addition-operator-plus`, `sec-subtraction-operator-minus`, `sec-multiplicative-operators`, `sec-islessthan`, `sec-relational-operators-runtime-semantics-evaluation`, `sec-unary-plus-operator-runtime-semantics-evaluation`, `sec-template-literals-runtime-semantics-evaluation`, `sec-string-constructor-string-value`, `sec-number-constructor-number-value`, `sec-boolean-constructor-boolean-value`. MDN(ko) 200: `Glossary/Type_coercion`, `Glossary/Type_Conversion`, `Operators/Addition`, `Operators/Unary_plus`, `Global_Objects/String/String`, `Global_Objects/Number/Number`, `Global_Objects/Boolean/Boolean`, `Global_Objects/Number#number_coercion`, `Global_Objects/String#string_coercion`.

## 4. 변경 범위

### 추가

- `app/concepts/type-coercion/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `conversion-table.ts`(본문 변환 표 데이터. `content.mdx`가 import해 `<table>`을 그리고 `concept.test.ts`가 같은 데이터를 vm 실행 결과와 대조 — 본문 표와 테스트가 어긋날 수 없게 한다)
  - `examples/` 8개: `to-string.js`, `to-number.js`, `plus-order.js`, `numeric-mix.js`, `compare.js`, `to-boolean.js`, `object.js`, `explicit.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `ConversionView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`

### 수정 (테스트만, 추가만)

- `tests/e2e/helpers.ts`: `TYPE_COERCION_PATH`, `TYPE_COERCION_SIMULATOR_NAME` 상수 추가
- `tests/e2e/a11y.spec.ts`: 새 개념 페이지 axe(라이트·다크, 시뮬레이터 모든 단계)
- `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행
- `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록

### 수정 (문서)

- `docs/content-guide.md`: 9단계의 "e2e 대상 개념" 목록 문구만 갱신(현재 두 개념 나열).

### 변경하지 않음

- `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, 기존 두 개념 폴더, `package.json`(의존성 추가 없음), `AGENTS.md`.

## 5. 구현 계획

### 1. 예제 파일과 meta.ts, 본문 주장 검증 테스트

- 대상: `examples/*.js` 8개, `meta.ts`, `conversion-table.ts`, `concept.test.ts`("본문 주장 검증" describe만), 최소 `route.tsx`·`content.mdx` 골격(필수 h2 3개)
- 현재: 폴더 없음
- 변경:
  - 예제 8개를 아래 원문 그대로 만든다(파일 끝 줄바꿈 1개, 빈 줄 위치 그대로 — 시뮬레이터가 줄 번호를 쓴다).

    `to-string.js`
    ```js
    let n = 7;
    console.log(JSON.stringify(n + ''), JSON.stringify(true + ''), JSON.stringify(null + ''), JSON.stringify(undefined + ''));
    console.log(JSON.stringify(`합계: ${n + 3}`), JSON.stringify(`${false}`));
    console.log(typeof n);
    ```
    `to-number.js`
    ```js
    console.log('10' - 3, '4' * '2', '9' / '3', '7' % 2);
    console.log(+'42', +'', +' 12 ', +'12px');
    console.log(+true, +false, +null, +undefined);
    ```
    `plus-order.js` (시나리오)
    ```js
    const a = '3' + 4 + 5;
    const b = 3 + 4 + '5';
    console.log(a, b);
    ```
    `numeric-mix.js` (시나리오)
    ```js
    const c = '10' - '4' + 2;
    const d = '10' + 2 - 1;
    console.log(c, d);
    ```
    `compare.js` (시나리오)
    ```js
    const e = '10' > 9;
    const f = '10' > '9';
    console.log(e, f);
    ```
    `to-boolean.js`
    ```js
    const text = '0';
    const count = 0;
    console.log(text ? '참으로 판단' : '거짓으로 판단');
    console.log(count ? '참으로 판단' : '거짓으로 판단');
    console.log(!text, !count);
    ```
    `object.js`
    ```js
    const point = { x: 1, y: 2 };
    console.log(JSON.stringify(point + ''), JSON.stringify(`${point}`));
    console.log(+point, point - 1);
    ```
    `explicit.js`
    ```js
    console.log(JSON.stringify(String(5)), JSON.stringify(String(null)), JSON.stringify(String(true)));
    console.log(Number('42'), Number(''), Number('12px'), Number(true), Number(null), Number(undefined));
    console.log(Boolean('0'), Boolean(''), Boolean(0), Boolean({}));
    console.log(JSON.stringify(String(Symbol('id'))), Number(10n));
    ```
    `to-string.js`는 `let n`으로 선언한다(`const`면 "const라서 안 바뀐다"로 오독될 수 있다. `n`이 그대로인 이유는 연산 결과를 `n`에 다시 대입하지 않았기 때문이다).
    `JSON.stringify`는 문자열임을 출력에서 따옴표로 보이게 하려는 출력용이다(빈 문자열·숫자 문자열과 숫자를 구분). 시나리오 예제 3개는 `console.log`의 따옴표 없는 출력 그대로 둔다(`345 75`처럼 문자열과 숫자를 출력만으로 구분할 수 없음 → 본문·시뮬레이터에서 타입을 보여 준다).
  - `meta.ts`:
    - `slug: 'type-coercion'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: ['short-circuit-evaluation', 'primitives-and-objects']`
    - `title: '암묵적 타입 변환: 연산자는 값을 어떤 타입으로 바꾸나'`
    - `summary`(135자, `객체` 없음): `+, -, > 같은 연산자와 조건식은 기대하는 타입이 아닌 값을 만나면 문자열·숫자·불리언으로 바꿔 계산합니다. 연산자마다 어떤 규칙으로 바꾸는지 알면 '3' + 4가 '34'이고 '10' > '9'가 false인 이유를 설명할 수 있습니다.`
    - `tags`(`객체` 금지): `타입 변환`, `암묵적 타입 변환`, `타입 강제 변환`, `type coercion`, `명시적 타입 변환`, `문자열 연결`, `ToString`, `ToNumber`, `ToBoolean`, `ToPrimitive`, `NaN`, `템플릿 리터럴`
    - `goals`: ① `+`가 문자열 연결과 덧셈 중 무엇을 할지 피연산자 타입으로 예측할 수 있다 ② `-`·`*`·`/`·`%`·단항 `+`가 피연산자를 숫자로 바꾼다는 것과 숫자로 바꿀 수 없는 문자열이 `NaN`이 된다는 것을 설명할 수 있다 ③ `>`가 두 피연산자가 모두 문자열일 때와 아닐 때 다르게 비교하는 이유를 설명할 수 있다 ④ 조건식이 값을 불리언으로 바꾸는 규칙(truthy/falsy)을 적용할 수 있다 ⑤ 객체가 연산에서 먼저 원시 값으로 바뀐다는 것과 명시적 변환 함수와의 차이(Symbol·BigInt)를 설명할 수 있다
    - `prerequisites`: `{ label: '데이터 타입' }`, `{ label: '연산자' }`, `{ label: '원시 값과 객체', slug: 'primitives-and-objects' }`, `{ label: '단축 평가와 truthy/falsy', slug: 'short-circuit-evaluation' }`
    - `examples`: 위 8개. `expectedOutput`은 content-guide대로 `[]`로 두고 `npm test`의 실제 출력을 3절 표와 대조한 뒤 채운다(다르면 멈추고 원인 확인).
    - `simplifications`:
      1. 시뮬레이터는 연산 하나를 "피연산자 확인·변환"과 "결과" 두 단계로 보여 준다. 명세의 세부 단계(GetValue, 원시 값에 대한 ToPrimitive 호출 등)는 묶어서 표시한다. 원시 값에 ToPrimitive를 적용하면 같은 값이 그대로 나오므로 표시하지 않는다.
      2. 명세는 `+`의 문자열 연결에서 두 피연산자 모두에 ToString을, 숫자 연산에서 두 피연산자 모두에 ToNumeric을 적용한다. 시각화는 타입이 실제로 바뀌는 피연산자의 변환만 표시한다(같은 타입이면 같은 값이 나온다).
      3. "문자열 연결", "숫자 덧셈", "문자열로 비교", "숫자로 바꿔 비교" 같은 규칙 이름과 "암묵적/명시적 타입 변환"이라는 구분은 교육용 이름이며 명세 용어가 아니다.
      4. 명세에서 `a > b`는 피연산자 순서를 바꿔 IsLessThan(b, a)로 계산하지만, 시뮬레이터와 본문은 왼쪽과 오른쪽을 그대로 비교하는 것으로 설명한다(이 페이지 예제의 결과는 같다).
      5. 문자열끼리의 비교는 앞에서부터 한 글자씩 UTF-16 코드 유닛 값을 비교하고, 한쪽이 다른 쪽의 앞부분이면 짧은 쪽이 작다(`'1' < '10'`). 이 페이지는 숫자 문자(`'0'`~`'9'`)끼리의 비교만 다룬다. 숫자로 바꾼 결과가 `NaN`이면 `>`·`<`는 모두 `false`가 되는데, 이 경우는 다루지 않는다.
      6. 객체가 원시 값으로 바뀌는 과정(ToPrimitive가 객체의 `valueOf`·`toString` 메서드를 호출)은 프로토타입 개념이 필요해 다루지 않고 결과만 보여 준다. 연산마다 원시 값으로 바꾸는 방식이 조금씩 다르지만(`+`와 템플릿 리터럴·`String()`의 차이 등), 객체 리터럴로 만든 일반 객체는 어느 쪽이든 문자열 `"[object Object]"`가 된다. `Symbol.toPrimitive`로 바꾸는 방법도 다루지 않는다.
      7. 숫자로 바꾸는 연산은 정확히는 ToNumeric(BigInt면 BigInt를 그대로 사용)이다. Symbol과 BigInt 자체는 다루지 않고 "변환이 안 되는 경우"에서 오류가 나는지만 다룬다. 문자열을 숫자로 바꾸는 세부 규칙(`'0x10'`, `'Infinity'`, 지수 표기 등)과 숫자를 문자열로 바꾸는 세부 규칙(지수 표기, `-0`)은 다루지 않는다.
      8. ToBoolean에는 브라우저 호스트의 `document.all`(명세 부록 B의 `[[IsHTMLDDA]]`)만 falsy로 다루는 예외가 있으나 다루지 않는다(단축 평가 페이지와 같은 문구).
      9. `==` 느슨한 동등 비교의 변환과 `<=`·`>=`·비트 연산자 등 다른 연산자는 다루지 않는다.
      10. 변수는 선언문이 실행된 뒤에만 표시한다(호이스팅·TDZ는 별도 개념). 변수 열에는 이 코드가 선언한 변수만 표시하며 내장 값(`console`, `JSON` 등)은 표시하지 않는다.
      11. `console.log`는 호스트 API이며, 문자열을 따옴표 없이 출력하는 것은 호스트의 출력 형식이다. 시각화의 값 표시에는 문자열에 큰따옴표를 붙이고 타입을 함께 적는다.
    - `references`: 명세 Type Conversion(`#sec-type-conversion`), ToPrimitive(`#sec-toprimitive`), ToBoolean(`#sec-toboolean`), ToNumber(`#sec-tonumber`), StringToNumber(`#sec-stringtonumber`), ToString(`#sec-tostring`), ApplyStringOrNumericBinaryOperator(`#sec-applystringornumericbinaryoperator`), IsLessThan(`#sec-islessthan`), String(value)(`#sec-string-constructor-string-value`), Number(value)(`#sec-number-constructor-number-value`), MDN(ko) 타입 강제 변환(Glossary/Type_coercion), 타입 변환(Glossary/Type_Conversion), 덧셈(+)(Operators/Addition), 단항 더하기(Operators/Unary_plus), Number 강제 변환(Global_Objects/Number#number_coercion), String 강제 변환(Global_Objects/String#string_coercion). 라벨 문구는 단축 평가 meta 형식(`ECMAScript 명세 — ...`, `MDN — ...`)을 따른다.
  - `concept.test.ts`의 "본문 주장 검증"(`node:vm`, 오류는 `e.name` 비교 — 단축 평가 `concept.test.ts`의 `errorNameOf` 패턴):
    - TypeError: `Symbol('id') + ''`, `` `${Symbol('id')}` ``, `+Symbol('id')`, `Number(Symbol('id'))`, `1n + 1`, `'10' - 1n`, `+10n`
    - 오류 아님 + 값: `10n + ''` → `'10'`, `String(Symbol('id'))` → `'Symbol(id)'`, `Number(10n)` → `10`, `!Symbol('id')` → `false`, `1n > 0` → `true`
    - 본문 서술 근거: `'1' + 2 * 3` → `'16'`, `'  ' - 0` → `0`, `!{}` → `false`(객체는 원시 값으로 바꾸지 않고 항상 truthy), valueOf 객체에서 `p + ''` → `'1'`과 `` `${p}` `` → `'[object Object]'`(템플릿이 `+`와 다른 변환을 쓴다는 본문 주장 근거. `valueOf` 메서드는 본문에 쓰지 않고 테스트에만 둔다)
    - 변환 표: `conversion-table.ts`가 행 배열 `{ source: string /* "undefined", "' 12 '" 처럼 소스 표기 */, toString: string, toNumber: string, toBoolean: string }[]`를 export한다. 행: `undefined`, `null`, `true`, `false`, `0`, `''`, `'0'`, `' 12 '`, `'12px'`. 테스트는 각 행에 대해 vm으로 암묵적 형태(`(${source}) + ''`, `+(${source})`, `!!(${source})`)와 명시적 형태(`String(...)`, `Number(...)`, `Boolean(...)`)를 모두 계산해 표 값과 같은지 확인한다(문자열 결과는 `JSON.stringify` 표기로 비교, 숫자는 `String(n)`).
- 이유: 페이지 전체의 사실 근거를 먼저 고정한다(가장 위험한 부분 = 내용 정확성).
- 주의사항: `meta.ts`는 `ConceptMeta` 타입 외 import 금지. `conversion-table.ts`도 순수 데이터(import 없음). 이 단계에서 content-integrity가 필수 h2를 요구하므로 `route.tsx`(템플릿 그대로)와 h2 3개만 있는 `content.mdx` 골격을 함께 만든다.
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/type-coercion` 통과. examples 실제 출력 = 3절 표. 표 검사 음성 확인: `conversion-table.ts`의 `'12px'` 숫자 칸을 `12`로 바꾸면 실패하는 것을 확인하고 되돌린다. `meta.ts`의 title·summary·tags에 `객체` 없음(`node -e`로 세 필드만 검사).

### 2. 상태 모델과 시나리오, 의미 불변식 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경:
  - 상태 타입(전체 스냅샷):
    ```ts
    export type Val = {
      type: 'number' | 'string' | 'boolean'
      display: string // number: String(n), string: 따옴표 없는 내용, boolean: 'true'|'false'
    }
    export type Conversion = { via: 'ToString' | 'ToNumber'; to: Val }
    export type Operand = {
      code: string // 소스 조각: "'3'", "4", 앞 연산이면 그 소스 "'3' + 4"
      value: Val // 연산 전 값(앞 연산의 결과 포함)
      converted?: Conversion // 타입이 바뀔 때만
    }
    // concat: 한쪽이 문자열인 + → 문자열 연결 / add: 문자열 없는 + → 숫자 덧셈
    // numeric: - * / % → 숫자 연산 / string-compare: 둘 다 문자열인 > / numeric-compare: 그 밖의 >
    export type Rule = 'concat' | 'add' | 'numeric' | 'string-compare' | 'numeric-compare'
    export type Operation = {
      code: string // 지금 계산하는 연산의 소스 전체: "'3' + 4" → 다음 연산은 "'3' + 4 + 5"
      operator: '+' | '-' | '>'
      left: Operand
      right: Operand
      rule: Rule
      result?: Val // 결과 단계에서만
    }
    export type Binding = { name: string; declaredWith: 'const'; value: Val; changed?: boolean }
    export type ConvState = { bindings: Binding[]; operation?: Operation }
    ```
    `Operation.code === `${left.code} ${operator} ${right.code}``가 항상 성립한다(구조 검사). 가짜 중간 코드(`'34' + 5` 같은 소스에 없는 식)를 만들지 않고, 앞 연산의 결과는 `left.code = "'3' + 4"`, `left.value = "34"(string)`처럼 소스 조각 + 값으로 표현한다.
  - 시나리오 3개(id·label·exampleId): `plus-order`·`+ 의 순서`·`plus-order`, `numeric-mix`·`- 와 + 섞기`·`numeric-mix`, `compare`·`> 비교`·`compare`.
  - 단계 구성(첫 단계는 `line` 없음, `state = { bindings: [] }`, `output: []`. 연산마다 [A: 피연산자·규칙·변환 표시, result 없음] → [B: result 표시, 그 줄의 마지막 연산이면 같은 단계에서 바인딩 초기화 + `changed`(result와 새 바인딩을 함께 보임)]. `console.log` 출력 단계는 `operation` 없음(계산 중인 연산 없음), 바인딩은 유지하고 `changed` 없음):
    - `plus-order`(10단계): 실행 전 → 1번 줄 `'3' + 4`(A: 4 → "4" ToString, rule concat / B: "34") → `'3' + 4 + 5`(A: left `'3' + 4`="34", 5 → "5" / B: "345", a 초기화) → 2번 줄 `3 + 4`(A: 변환 없음, add / B: 7) → `3 + 4 + '5'`(A: left `3 + 4`=7 → "7" / B: "75", b 초기화) → 3번 줄 출력 `345 75`(설명: 출력에는 따옴표가 없지만 a, b 모두 문자열).
    - `numeric-mix`(10단계): 실행 전 → `'10' - '4'`(A: 둘 다 ToNumber, numeric / B: 6) → `'10' - '4' + 2`(A: add / B: 8, c) → `'10' + 2`(A: 2 → "2", concat / B: "102") → `'10' + 2 - 1`(A: left "102" → 102 ToNumber, numeric / B: 101, d) → 출력 `8 101`.
    - `compare`(6단계): 실행 전 → `'10' > 9`(A: "10" → 10 ToNumber, numeric-compare / B: true, e) → `'10' > '9'`(A: 변환 없음, string-compare, 설명: 첫 글자 `'1'`과 `'9'`를 비교 / B: false, f) → 출력 `true false`.
  - `concept.test.ts`에 추가:
    - 시나리오마다 `assertScenarioInvariants`, 시나리오 id 순서 고정, 첫 단계 `{ bindings: [] }`·`line` 없음.
    - 상태 무결성: 바인딩 이름 중복 없음, `changed`는 그 단계에서 새로 생긴 바인딩에만, `Operation.code` 구조 검사, 연산의 `code`가 그 단계 `line`의 소스 줄에 부분 문자열로 존재. 출력 단계(`output`이 늘어난 단계)는 `operation`이 없다.
    - **소스 대조 검사**(시나리오가 적은 값을 믿지 않고 소스를 직접 실행 — 이 시나리오의 연산 소스는 변수를 참조하지 않는 리터럴 식이라 단독 실행 가능):
      - 각 `Operand.code`를 vm으로 실행한 값(typeof + 값)이 `operand.value`와 같다(예: `'4'`를 `num(4)`로 잘못 적으면 실패).
      - 각 `Operation.code`를 vm으로 실행한 값이 `result`와 같다(잘못된 묶음 `'3' + (4 + 5)`를 표현하면 실패).
      - 연속성: `left.code`가 직전 연산의 `code`와 같으면 `left.value`는 직전 `result`와 같다.
      - 한 줄의 마지막 연산 `code`가 그 줄 선언의 초기화 식 전체(`const a = ` 뒤부터 `;` 앞까지)와 같고, 그 B 단계에서 생긴 바인딩 값이 그 연산의 `result`와 같다.
    - **의미 검사**(테스트가 값에서 규칙을 계산해 시나리오와 대조):
      - 기대 규칙: `+`이면 한쪽이라도 string → `concat`, 아니면 `add`. `-` → `numeric`. `>`이면 둘 다 string → `string-compare`, 아니면 `numeric-compare`. `rule`이 기대 규칙과 같다.
      - 기대 변환: `concat`이면 string이 아닌 쪽만 `ToString`, `add`·`numeric`·`numeric-compare`이면 number가 아닌 쪽만 `ToNumber`, `string-compare`면 변환 없음. `converted` 유무·`via`가 같고, `converted.to`가 vm에서 `String(v)`/`Number(v)`를 계산한 값과 같다.
      - 결과: `result`가 있으면 vm에서 `${lit(left.value)} ${operator} ${lit(right.value)}`를 실제 실행한 값과 같다(`lit`: 문자열은 `JSON.stringify`, 나머지는 display).
    - 바인딩 값 검사: 예제 원문 끝에 `console.log(JSON.stringify([[typeof x, x], ...]))`를 붙여 `runExample`로 실행하고, 마지막 단계 바인딩의 type·display와 대조(a,b / c,d / e,f).
- 이유: 단계 내용(규칙·변환·결과)이 명세 동작과 일치함을 자동으로 보장한다.
- 주의사항: `Val` 생성은 헬퍼(`num`, `str`, `bool`)로만 해 표기 규칙을 강제한다.
- 완료 조건: `npm test -- app/concepts/type-coercion/concept.test.ts` 통과. 음성 확인 3가지를 일부러 넣어 실패를 확인하고 되돌린다: ① `plus-order` `'3' + 4`의 rule을 `add`로(규칙 검사 실패) ② `numeric-mix` `'10' + 2 - 1`의 결과를 `"101"`(string)로(결과 검사 실패) ③ `compare` `'10' > '9'`에 `ToNumber` 변환을 추가(변환 검사 실패) ④ `numeric-mix` `'10' - '4'`의 오른쪽 값을 `num(4)`로, 변환도 없애 다른 검사와 일관되게 바꿈(소스 대조 검사 실패) ⑤ `plus-order` 두 번째 연산을 `left.code = "'3'"`, `right.code = "4 + 5"`로 묶음 변경(구조·연속성·초기화 식 검사 중 하나 이상 실패).

### 3. 시각화 컴포넌트 ConversionView

- 대상: `ConversionView.tsx`, `ConversionView.test.tsx`
- 변경: 한 단계의 `ConvState`를 그린다.
  - "계산 중인 연산" 영역(`section` + 제목 텍스트, `useId`로 `aria-labelledby`): `operation`이 없으면 "아직 계산 중인 연산이 없습니다." 있으면 연산 소스(`font-mono`), 왼쪽·오른쪽 피연산자 카드(소스 조각, 값, 타입 배지 `문자열`/`숫자`/`불리언`, 변환이 있으면 "→ 값 (타입, ToString)" 줄), 규칙 문구(`concat`: "한쪽이 문자열이므로 문자열 연결", `add`: "문자열이 없으므로 숫자 덧셈", `numeric`: "피연산자를 숫자로 바꿔 계산", `string-compare`: "둘 다 문자열이므로 문자열로 비교", `numeric-compare`: "둘 다 문자열은 아니므로 숫자로 바꿔 비교"), 결과(있을 때만 "결과: 값 (타입)").
  - "변수" 영역: 없으면 "아직 표시할 변수가 없습니다." 있으면 `const` 배지, `이름 = 값`, 타입 배지, `changed`면 `bg-highlight` + `새로 생김` 배지.
  - 변환·타입은 색만이 아니라 텍스트로 전달한다. 스타일 토큰·배지·줄바꿈 클래스는 `EvaluationView.tsx`와 같은 것을 쓴다(파일을 import하지 않고 같은 클래스 문자열 사용). 375px에서 피연산자 카드는 세로로 쌓인다(`flex-wrap` 또는 `grid` 1열 → `sm:` 2열).
- 이유: 상태 모양이 다른 개념과 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더되는 첫 단계(빈 상태)가 JS 없이도 의미 있게 보여야 한다. 애니메이션은 `motion-safe:`만.
- 완료 조건: `ConversionView.test.tsx` 통과 — 빈 상태 문구 2개, A 단계에서 변환 줄(`→ "4"`와 `ToString`)과 규칙 문구, 결과 미표시, B 단계에서 `결과:` 표시, `새로 생김` 배지, 문자열 값 큰따옴표.

### 4. Simulator 래퍼

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `short-circuit-evaluation/Simulator.tsx`와 같은 모양의 얇은 래퍼. `label="암묵적 타입 변환 시뮬레이터"`, `renderState={(state) => <ConversionView state={state} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `+ 의 순서` 시나리오 "실행 전" 단계, 다음 클릭 시 1번 줄 강조(`aria-current="step"`)와 연산 표시, 시나리오 전환 시 0단계 복귀. (셸 공통 동작은 `SimulatorShell.test.tsx`가 검사하므로 개념 테스트는 단축 평가 `Simulator.test.tsx`와 같은 범위로 둔다.)

### 5. 본문 content.mdx와 route.tsx

- `route.tsx`: content-guide 6단계 템플릿 그대로.
- `content.mdx`(필수 h2 3개, 맨 위에서 `Simulator`, `scenarios` import):
  - `## 동작 원리`
    - 타입 변환(type conversion)의 정의. 개발자가 의도해 바꾸는 명시적 타입 변환(explicit)과, 연산자·조건식이 평가 중에 스스로 바꾸는 암묵적 타입 변환(implicit, 타입 강제 변환 type coercion). 변환은 연산에 쓸 새 값을 만들 뿐이다. 변수 `n`의 값이 그대로인 이유는 연산 결과를 `n`에 다시 대입(재할당)하지 않았기 때문이다(예제 1의 `typeof n`, `let n`). 원시 값 불변성을 원인으로 쓰지 않는다.
    - 바뀌는 타입은 세 가지: 문자열(ToString), 숫자(ToNumber), 불리언(ToBoolean). `conversion-table.ts`를 import해 JSX `<table>`(첫 개념 표 형식, `overflow-x-auto`)을 `map`으로 그린다. 행 머리는 소스 표기(`' 12 '`처럼 따옴표로 공백이 보이게), 열은 문자열로 / 숫자로 / 불리언으로.
    - 연산자가 기대하는 타입: ① `+`: 한쪽이라도 문자열이면 다른 쪽을 문자열로 바꿔 연결, 아니면 숫자로 바꿔 덧셈. `+`·`-`는 우선순위가 같아 왼쪽부터 묶이고(왼쪽 결합), `*` 같은 우선순위가 높은 연산이나 괄호가 있으면 그것이 먼저 계산된다(`'1' + 2 * 3`은 `'16'`). ② `-`·`*`·`/`·`%`·단항 `+`: 숫자로. 숫자로 읽을 수 없는 문자열은 `NaN`, 앞뒤 공백은 무시, 빈 문자열이나 공백만 있는 문자열은 0. ③ `>`·`<`: 둘 다 문자열이면 바꾸지 않고 앞 글자부터 비교, 아니면 숫자로 바꿔 비교. ④ 조건식(`if`, 삼항 `? :`)과 `!`: 불리언으로(truthy/falsy, 단축 평가 개념 링크). ⑤ 템플릿 리터럴 `${}`: 안의 값을 문자열로(ToString). `+`와 별도 항목으로 둔다.
    - 객체: 문자열이나 숫자로 바꿔야 하는 연산에 쓰이면 먼저 원시 값으로 바뀐 뒤 위 규칙을 따른다(ToPrimitive). 객체 리터럴로 만든 일반 객체는 `"[object Object]"` 문자열이 되고, 숫자로 바꾸면 그 문자열을 숫자로 바꾼 결과 `NaN`. 불리언으로 바꿀 때는 원시 값으로 바꾸지 않고 객체는 항상 truthy다. 내부 과정은 단순화로 밝힌다.
    - 변환이 안 되는 경우: Symbol 값은 문자열이나 숫자로 암묵적으로 바꿀 수 없어 TypeError(불리언으로는 바뀐다: truthy). BigInt(`10n`처럼 숫자 뒤에 `n`을 붙인 정수 타입이라고 한 줄 소개)와 Number를 산술 연산자로 섞으면 TypeError, `+10n`도 TypeError. BigInt를 문자열과 `+`로 연결하는 것과, Number와 `>`로 비교하는 것은 된다. 오류 메시지 문구는 쓰지 않는다(호스트마다 다름).
    - 명시적 변환: 원시 값에 대해 `Boolean(x)`는 ToBoolean과 같고, `String(x)`·`Number(x)`도 위 표와 같은 결과를 낸다(표 테스트가 둘 다 검사). 다만 `String(Symbol('id'))`는 `"Symbol(id)"`, `Number(10n)`은 `10`으로 암묵적 변환과 달리 오류가 나지 않는다. `Number(Symbol('id'))`는 여전히 TypeError다. "명시적 변환은 오류가 나지 않는다"로 읽히지 않게 쓴다.
  - `## 예제`: 예제 8개를 `file=` 코드 펜스로. `PredictQuiz` 6개(예제 1 to-string, 2 to-number, 3 plus-order, 4 numeric-mix, 5 compare, 7 object; 선택지 3~4개, 여러 줄이면 질문에 ' / ' 안내, 정답은 실행 결과). 예제 3~5 뒤에 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`. 예제 1 설명에 `JSON.stringify`가 출력용이라고 한 줄.
  - `## 결과와 이유`: JSX `<table>` — 열: 연산 / 피연산자를 바꾸는 타입 / 예 / 결과. 이어서 예제별 이유 문단, `Callout type="misconception"`: ① "`+`는 숫자가 있으면 덧셈을 한다"(피연산자 중 문자열이 하나라도 있으면 연결. `+`는 왼쪽부터 묶이므로 `3 + 4 + '5'`는 먼저 `3 + 4`가 7이 되고 `'75'`) ② "문자열과 숫자를 섞은 계산은 항상 문자열이 된다"(`-`는 숫자로 → `'10' - '4'`는 6) ③ "숫자 모양 문자열끼리 비교하면 숫자처럼 비교된다"(`'10' > '9'`는 false) ④ "타입 변환은 변수의 값을 바꾼다"(`n + ''`는 새 문자열을 만들 뿐이고, `n`에 다시 대입하지 않았으므로 `typeof n`은 여전히 number) ⑤ "문자열 `'0'`은 falsy다"(truthy, 빈 문자열만 falsy) ⑥ "숫자로 바꾸면 앞의 숫자만 읽는다"(`+'12px'`는 NaN).
- 주의사항: 미학습 개념(실행 컨텍스트, 프로토타입, 배열, try...catch)을 설명하지 않는다. 같은 대상은 같은 이름("피연산자를 숫자로 바꾼다")으로 부른다. CommonMark 굵게 함정(`)**한글`)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/type-coercion/index.html`에 `<details` 6개 이상, 시뮬레이터 0단계 텍스트와 라디오 3개.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인

- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(9단계 e2e 대상 목록 문구)
- 변경: 단축 평가 개념 추가 때와 같은 방식으로 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y는 라이트·다크 각각 페이지 axe + 시나리오 3개의 모든 단계 axe(단축 평가 케이스처럼 `test.slow()`).
- 완료 조건: AGENTS 검증 순서 전체 통과(`lint && format:check && typecheck && test && test:build && e2e`). `객체` 검색 1건 유지. 브라우저(dev 서버 재시작 후): 1280px·375px·다크 모드에서 3개 시나리오 끝까지 진행, 콘솔 에러 0, 가로 넘침 0, 키보드 ←/→/Home 동작, 스크린샷 1장 이상.

## 6. 엣지 케이스

- 시나리오 출력 `345 75`는 따옴표가 없어 숫자와 구분이 안 된다 → 시각화와 단계 설명에서 타입을 명시한다.
- 빈 문자열·숫자 문자열: 예제 1·2·7·8은 `JSON.stringify`로 따옴표를 보이게 한다. 예제 2는 숫자 결과만 출력하므로 그대로.
- `NaN`: `console.log(NaN)`은 `NaN` 출력(실행 확인). 시나리오에는 등장하지 않는다.
- `{ x: 1, y: 2 } + ''`를 문장 맨 앞에 쓰면 블록으로 해석되므로 예제는 변수 `point`를 쓴다.
- Symbol·BigInt 오류는 예제로 만들 수 없음(실행이 멈춤) → 테스트로만 검증.
- 프리렌더/JS 없음: 시뮬레이터는 0단계(빈 상태), 퀴즈는 `<details>` 정답.
- 홈 정렬: `localeCompare(…, 'ko')` 제목순이라 `단축 평가…` → `암묵적 타입 변환…` → `원시 값과 객체…`로 새 개념은 두 번째 카드다(실행 확인). `navigation.spec.ts`의 `cards.first()` 내용 확인은 `객체` 검색 후 1건일 때만이라 영향 없음.
- 연산자 우선순위: 시나리오 예제는 같은 우선순위(`+`·`-`)만 써서 왼쪽 결합만 보여 준다. 우선순위가 다른 경우(`'1' + 2 * 3`)는 본문 한 줄 + 테스트로만.
- BigInt와 Number 비교(`1n > 0`)는 오류가 아니다 — 본문의 "섞으면 TypeError"는 산술 연산자로 한정.

## 7. 회귀 위험

- `객체` 검색 1건 가정 — 새 meta의 title·summary·tags에 `객체`가 들어가면 실패(1단계 완료 조건).
- 개념 수 = 폴더 수 가드: 폴더 추가로 자동 반영.
- 공통 셸·기존 개념 파일은 수정하지 않는다. 기존 테스트·e2e 그대로 통과해야 한다.
- 홈 카드 순서 변화(새 개념이 두 번째) — 정렬 규칙대로의 결과.

## 8. 검증 계획

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`, 본문 주장 검증(오류·서술·표의 암묵적/명시적 양쪽), 시나리오 소스 대조 검사(피연산자·연산 소스를 직접 실행), 의미 검사(규칙·변환·결과), 바인딩 값 검사, 음성 확인(1단계 1가지 + 2단계 5가지).
- 브라우저(dev 서버 재시작 후 `/concepts/type-coercion`):
  1. 첫 화면: "검토 중" 배지, 학습 목표 5개, 선행 개념 4개 중 2개가 링크, 퀴즈 6개가 라디오 UI.
  2. 시뮬레이터 `+ 의 순서` 2단계: 피연산자 `4`에 `→ "4"`·`ToString`, 규칙 "한쪽이 문자열이므로 문자열 연결", 결과 없음. 3단계: `결과: "34"`.
  3. `- 와 + 섞기` 마지막 직전: `d = 101 (숫자)`, 콘솔 `8 101`.
  4. `> 비교` `'10' > '9'` A단계: 변환 줄 없음, 규칙 "둘 다 문자열이므로 문자열로 비교".
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음. 키보드 ←/→/Home.
  6. 홈에서 카드 3개, `객체` 검색 1개, `변환` 검색 1개.

## 9. 확인 필요 사항

- 콘텐츠 문구는 구현 후 사용자 검토 게이트(`reviewedAt`)에서 확인한다.
- [확인 필요] 기존 단축 평가·원시 값과 객체 개념의 `related`에 새 개념을 역방향으로 연결할지(기존 개념 파일 수정이라 이번 범위에서 제외, 10. 후보).

## 10. 추가 개선 후보

- 기존 두 개념 `related`에 `type-coercion` 역방향 연결.
- `==` 느슨한 동등 비교 개념(7·9장 범위, 이번 페이지의 변환 규칙을 선행 개념으로 사용).
- `'abc' > 1`과 `'abc' < 1`이 모두 false인 NaN 비교 오해 Callout, `<=`·`>=`의 정의.

## 변경 이력

- 2026-10-26 (계획 검토 Architect·Critic 반영, 메인이 vm·명세로 재확인): ① 시나리오 소스 대조 검사 추가(피연산자·연산 소스 직접 실행, 초기화 식·B단계 바인딩 대조, 음성 확인 ④⑤) — Critic HIGH ② 변환 표를 `conversion-table.ts` 공유 데이터로(본문·테스트 동일 출처, 암묵적/명시적 양쪽 검사) ③ 본문: `+` 결합·우선순위 한정, 템플릿 리터럴을 ToString으로 분리(명세 Note), 객체 변환은 문자열·숫자 연산에 한정(ToBoolean은 항상 truthy), 명시적 변환을 원시 값에 한정하고 `Number(Symbol())` TypeError 명시, "변수가 안 바뀌는 이유 = 재할당 안 함"으로 인과 수정(`let n`) ④ simplifications 8→11개(양쪽 변환, 교육용 이름, 문자열 비교 길이 규칙·NaN 비교, document.all, Symbol·BigInt 범위) ⑤ 상태 모양 결정(출력 단계 `operation` 없음, B단계에 result와 새 바인딩 함께) ⑥ 홈 순서 서술 수정(두 번째), content-guide를 "수정"으로 이동, a11y `test.slow()`

## 구현 진행

- baseline (2026-10-26, `6600d85`): lint·format:check·typecheck 오류 0, `npm test` 292 통과, `test:build` 22 통과, e2e 67 통과·3 건너뜀(기존 의도된 3건)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 117 통과, lint·typecheck·prettier 0. 예제 8개가 계획 단계 실행본과 바이트 동일(diff), 실제 출력 = 3절 표. title·summary·tags에 '객체' 없음. 표 음성 확인(`'12px'` → 12)은 서브에이전트 보고(+x·Number(x) 2건 실패)
- [x] 2. 상태 모델·시나리오·의미 검사 — 메인 재실행: vitest(개념) 147 통과, lint·typecheck·prettier 0. 시나리오 3개(10/10/6단계) 설명 26개를 메인이 명세와 대조, 부정확한 문장 2개 메인 수정(numeric-mix 출력 단계 "숫자이므로 따옴표 없이" → 출력만으로 구분 불가, compare "'1'이 '9'보다 앞서므로" → 코드 유닛 값 비교). 음성 확인: 메인이 compare 오른쪽 code `'9'`→`9` 변경 시 6건 실패 재현 후 원복. ①~⑤는 서브에이전트 보고(⑤는 구조·연속성이 아니라 피연산자 소스 대조가 잡음 — `operation()` 헬퍼가 code를 계산하므로). 계획 외 추가 검사(모든 const 초기화 1회, 바인딩은 마지막 B단계에서만, A/B 동일 연산)는 더 엄격한 방향이라 수용
- [x] 3. ConversionView — 메인 재실행: vitest(개념) 163 통과, lint·typecheck·prettier 0. 코드 확인: 타입·변환·규칙이 텍스트로 전달, 문자열 큰따옴표, 테마 토큰·클래스 문자열이 EvaluationView와 같음(import 없음), 피연산자 카드 `grid sm:grid-cols-2`, 하이드레이션 영향 값 없음(useId만). 계획 외: 카드에 왼쪽/오른쪽 라벨, `연산자 +: 규칙` 줄(텍스트 보강이라 수용). 대비·375px는 6단계에서 확인
- [x] 4. Simulator 래퍼 — 단축 평가 래퍼와의 diff가 import·타입·주석·label·View 호출뿐. Simulator.test 7개 포함 통과
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·테스트 근거와 대조, 부정확한 문장 4개 메인 수정: truthy/falsy 정의 문장, `'10' - 1n`을 "BigInt와 숫자 혼합"으로 든 예(왼쪽은 문자열 → `-`가 숫자로 바꾼 뒤 섞임으로 설명), 명시적 변환 "원시 값에 대해서는 표와 같은 결과"(Symbol·BigInt 예외와 충돌 → "위 표에 나온 값에서는"), 결과와 이유 "'1'이 '9'보다 앞서므로"(→ 코드 유닛 값). 빌드 HTML 점검에서 Prettier가 Callout 안 인라인 코드를 줄바꿈해 `'10' -   '4'`로 렌더링되는 문제 발견 → 2곳을 JSX `<code>{"…"}</code>`로 수정. 메인 재실행: `npm test` 472 통과, build 성공, 프리렌더 HTML `<details` 6·라디오 3·"실행 전" 1·`**` 잔존 0·공백 깨진 code 0
- [x] 6. e2e·빌드 테스트 확장과 브라우저 확인 — 테스트 추가만(기존 파일의 삭제 줄은 content-guide 9단계 목록 문구 1줄뿐). 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 472, `test:build` 27(baseline 22 + 새 개념 자동 검사·프리렌더 블록), e2e 79 통과·3 건너뜀(기존 3건), axe 위반 0. 브라우저(dev 재시작): 1280px 다크 `+ 의 순서` 2단계(`4 → "4" (문자열, ToString)`, 규칙 문구), 375px 라이트 `> 비교` 4단계를 키보드 ArrowRight×3으로 진행(변환 없음, 문자열 비교 규칙, e의 강조 해제 확인), 가로 넘침 0, 콘솔 에러 0, 홈 카드 3개(새 개념 두 번째), `변환` 검색 1건
- 리뷰 1차 (critical-code-review: 메인 직접 — 테스트·e2e·빌드·시각화 / Sonnet 서브에이전트 — 콘텐츠 정확성 독립 교차 검토, 메인이 vm으로 재확인·재판정): 결과·퀴즈·시뮬레이터·표에 사실 오류 0. 프로젝트 기준(학습자가 반례를 찾을 수 있는 과일반화 = 정확성 결함)으로 High 5건 상향 후 수정 → 재검증 통과
  - `content.mdx` 소제목·첫 문장 "변환의 목적지는 셋" → "이 페이지에서 다루는 … 셋(명세에는 다른 변환도 있음)"
  - "객체 리터럴로 만든 일반 객체는 [object Object]" → "데이터만 담은 객체 리터럴 … (변환 방법을 직접 정한 경우는 다름)", meta 단순화 6에 valueOf·toString 직접 정의 시 달라짐 추가. 근거 테스트 추가: `({ toString() { return '5' } }) - 1` → 4
  - 명시적 변환 문단·예제 8 이유 "Number(10n)… 암묵적으로는 바꿀 수 없던 값" → Symbol은 문자열로, BigInt는 숫자로만 대비(`10n + ''`은 됨)
  - Callout "문자열이 되는 것은 + 연결뿐" → "이 페이지의 산술·비교 연산자 중"(템플릿 리터럴 제외 범위 명시)
  - meta 단순화 7에 ">·<에서 BigInt와 문자열은 문자열을 BigInt로 바꿔 비교" 추가. 근거 테스트 추가: `'9007199254740993' > 9007199254740992n` → true(숫자 변환이면 false)
  - 재검증(메인): lint·format:check·typecheck 0, `npm test` 474, `test:build` 27, e2e 79 통과·3 건너뜀
  - Medium 0. Low는 보고만(수정 안 함): "바꿀 수 없다"가 NaN(68행)과 TypeError(81행) 두 뜻으로 쓰임, 예제 8 이유 "앞의 표와 같은 결과"(String(5)·Boolean({})는 표에 행 없음 — "같은 규칙"이 정확), 객체 "항상 truthy"(document.all 예외는 단순화에 있음), `-`·`*` 등 "숫자로 바꾼다"(BigInt끼리는 BigInt — 단순화에 있음), build 테스트 `<details` 기준 ≥5(실제 6, 계획은 ≥6)

## 구현 결과

### 계획 대비 실제 구현

- 1~6단계를 계획대로 구현했다. 달라진 점은 아래와 같다.
  - 시나리오 테스트에 계획보다 엄격한 검사를 더했다(모든 const 선언이 한 번씩 초기화, 바인딩은 줄의 마지막 연산 B단계에서만, A/B 단계가 result 외 같은 연산). 음성 확인 ⑤는 계획의 "구조·연속성·초기화 식"이 아니라 피연산자 소스 대조 검사가 잡았다(`operation()` 헬퍼가 code를 피연산자에서 계산하므로 구조가 깨질 수 없음).
  - ConversionView에 계획 외 텍스트 보강(피연산자 카드의 왼쪽/오른쪽 라벨, `연산자 +: 규칙` 줄)을 넣었다.
  - 구현 중 메인이 부정확한 문장 6개(시나리오 2, 본문 4)와 Prettier 줄바꿈으로 깨지는 인라인 코드 2곳을 고쳤다.
  - `test:build` 기준 개수는 계획 완료 조건(`<details` ≥6)보다 느슨한 ≥5로 작성되었다(Low, 실제 6개 프리렌더 확인).
- `docs/content-guide.md`: 9단계 e2e 대상 목록에 `type-coercion` 추가, 작성 시 주의에 "JSX 컴포넌트 안 인라인 코드 줄바꿈" 함정 추가.

### 코드 리뷰

- 리뷰 1차: 콘텐츠 독립 교차 검토에서 사실 오류는 0건이었고, 과일반화 5건을 High로 올려 수정(근거 테스트 2개 추가)한 뒤 재검증을 통과했다. Medium 0, Low 5건은 보고만 했다(`구현 진행` 참고).

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts` `reviewedAt` 기록(현재 `null`, "검토 중" 배지)
- [ ] 리뷰 Low 5건 반영 여부 결정(콘텐츠 검토 때 함께)
- [ ] 기존 두 개념 `related`에 `type-coercion` 역방향 연결
- [ ] `==` 느슨한 동등 비교 개념(이번 페이지를 선행 개념으로)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 리뷰에서 "틀린 결과"는 없었지만, 학습자가 반례를 찾을 수 있는 과일반화 5개를 High로 올려 고쳤다. 예: "객체 리터럴은 [object Object]가 된다"는 `toString`을 직접 정의한 객체(`({ toString() { return '5' } }) - 1`은 4)에서 틀린다. 대안은 Medium으로 보고만 하는 것이었지만, 프로젝트가 정확성을 최우선으로 두기 때문이다(`content.mdx` 동작 원리·결과와 이유, `meta.ts` 단순화 6·7).
- [Claude 판단] 구현 중 서브에이전트가 쓴 문장 중 근거와 어긋난 6개를 메인이 직접 고쳤다. 예: `'10' - 1n`을 "BigInt와 숫자 혼합"의 예로 든 문장은 왼쪽이 문자열이라 부정확했다(`-`가 '10'을 숫자로 바꾼 뒤 섞여서 TypeError).
- [Claude 판단] Prettier가 `<Callout>` 안의 인라인 코드를 줄바꿈해 `'10' -   '4'`로 렌더링되는 문제를 빌드 HTML 검사로 찾아 JSX `<code>{"…"}</code>`로 바꿨다. `.prettierignore`에 mdx를 넣는 대안은 전체 포맷 규칙을 바꾸므로 택하지 않았다.
- [무검토 승인] 시뮬레이터 테스트는 시나리오에 적힌 값을 믿지 않고 피연산자·연산의 소스 조각을 vm으로 직접 실행해 대조한다. 그래서 시나리오가 `'4'`를 숫자 4로 잘못 적거나 `'3' + (4 + 5)`처럼 묶음을 바꾸면 실패한다(계획 검토 Critic HIGH 반영, `concept.test.ts` 소스 대조 검사).
- [무검토 승인] 본문 변환 표는 `conversion-table.ts` 하나를 MDX와 테스트가 함께 import한다. 테스트는 같은 행을 암묵적(`x + ''`, `+x`, `!!x`)·명시적(`String`, `Number`, `Boolean`) 양쪽으로 실행해 대조하므로 본문 표와 검증이 어긋날 수 없다.
- [무검토 승인] "변수 n이 그대로인 이유"를 원시 값 불변성이 아니라 재할당하지 않았기 때문으로 설명하고, 예제를 `let n`으로 썼다(`const`면 "const라서"로 오독).
- 개념(암묵적 타입 변환), 범위(핵심 + 객체 간단히 + 명시적 변환 비교 + 변환이 안 되는 경우), 시뮬레이터 포함은 사용자가 정했다.

#### 배경지식

- `+`는 ApplyStringOrNumericBinaryOperator: 두 피연산자를 ToPrimitive한 뒤 하나라도 문자열이면 양쪽을 ToString해 연결, 아니면 양쪽을 ToNumeric해 더한다. `-`·`*` 등은 항상 ToNumeric. 같은 우선순위는 왼쪽 결합이라 `3 + 4 + '5'`는 `(3 + 4) + '5'`.
- `a > b`는 IsLessThan(b, a): 둘 다 문자열이면 UTF-16 코드 유닛을 앞에서부터 비교(`'10' < '9'`), 아니면 숫자로 비교. 한쪽이 BigInt이고 다른 쪽이 문자열이면 문자열을 BigInt로 바꾼다.
- 템플릿 리터럴의 `${}`는 ToString을 쓰고 `+`와 다르다(명세 Note: "`+` 연산자가 아니라 String.prototype.concat과 같다"). valueOf를 정의한 객체에서 `p + ''`과 `` `${p}` ``가 달라진다.
- 명시적 변환은 대부분 같은 추상 연산을 쓰지만 예외가 있다: `String(symbol)`은 SymbolDescriptiveString, `Number(bigint)`는 BigInt를 숫자로 바꾼다. `Number(symbol)`은 여전히 TypeError.

#### 확인 질문

1. 시나리오에 `'10' - '4'`의 오른쪽 피연산자를 `num(4)`(변환 없음)로 잘못 적으면 규칙·변환·결과 검사는 모두 통과한다. 그런데도 테스트가 실패하는 이유는?
   <details><summary>답</summary>소스 대조 검사가 피연산자 code `'4'`를 vm으로 실행해 문자열 "4"를 얻고, 시나리오가 적은 숫자 4와 비교하기 때문이다. 시나리오 안에서만 일관된 오류를 실제 소스 실행으로 잡는다. 근거: `concept.test.ts` "모든 Operand.code를 실행한 값이 operand.value와 같다", 계획 변경 이력 ①.</details>
2. "객체 리터럴로 만든 일반 객체는 [object Object]가 된다"는 문장을 왜 "데이터만 담은 객체 리터럴"로 좁혔나?
   <details><summary>답</summary>객체 리터럴이어도 `toString`·`valueOf`를 직접 정의하면 ToPrimitive가 그 메서드를 호출해 결과가 달라진다(`({ toString() { return '5' } }) - 1`은 4). 근거: `concept.test.ts` "원시 값으로 바뀌는 방법을 직접 정한 객체…", `구현 진행` 리뷰 1차.</details>
3. `` `${p}` ``와 `p + ''`가 다른 결과를 낼 수 있는 이유는? 일반 객체 리터럴에서는 왜 같나?
   <details><summary>답</summary>`+`는 hint 없는 ToPrimitive(일반 객체는 valueOf를 먼저 시도), 템플릿은 ToString(hint string, toString을 먼저 시도)을 쓴다. 일반 객체는 valueOf가 객체 자신을 돌려줘 결국 toString의 "[object Object]"가 쓰이므로 같다. 근거: 계획 3절 명세 Note, `meta.ts` 단순화 6.</details>
4. `'9007199254740993' > 9007199254740992n`이 true인데, 본문 규칙("하나라도 문자열이 아니면 숫자로 바꿔 비교")대로라면 왜 false가 나와야 하나?
   <details><summary>답</summary>숫자로 바꾸면 2^53 + 1이 2^53으로 반올림되어 두 값이 같아지므로 false다. 실제로는 IsLessThan이 BigInt와 문자열 비교에서 문자열을 BigInt로 바꾸므로 true다. 본문 규칙은 단순화이며 `meta.ts` 단순화 7에 예외를 적었다.</details>
5. 예제 `to-string.js`를 `const n`이 아니라 `let n`으로 쓴 이유는?
   <details><summary>답</summary>`const`면 "n이 그대로인 것은 const라서"로 오독될 수 있다. n이 그대로인 실제 이유는 연산 결과를 n에 재할당하지 않았기 때문이다. 근거: 계획 5단계 1 예제 설명, 변경 이력 ③.</details>
