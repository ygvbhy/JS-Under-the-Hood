# 객체를 원시 값으로 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-20
- 기준: `main` @ `9350034`

## 0. 요약
- 목적: "`[] + {}`는 왜 `'[object Object]'`일까"를 질문으로 하는 `to-primitive` 페이지를 추가한다(order 305, 학습 순서 47번째/73). ToPrimitive가 `Symbol.toPrimitive`를 먼저 보고, 없으면 연산이 정한 힌트에 따라 `valueOf`·`toString`을 정해진 순서로 불러 처음 나온 원시 값을 쓰며(OrdinaryToPrimitive), 둘 다 실패하면 TypeError라는 것을 명세·실행·시뮬레이터로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 6개, 시뮬레이터 3시나리오, 비교표 9행, 퀴즈 6개), 기존 5개 페이지(type-coercion·equality-operators·property-keys·primitive-methods·bigint)의 "결과만 보인다" 문장 10곳을 새 페이지로 연결, 47번째 이후 순위 +1과 "객체" 검색 결과 18→19, e2e·빌드 등록. 공통 코드는 바꾸지 않는다.
- 위험: "+는 문자열이 있으면 toString", "valueOf는 숫자", "힌트 없음 = number"를 Date·Symbol.toPrimitive 객체나 `==`의 모든 경우로 일반화하는 것, 시뮬레이터가 명세 순서(Symbol.toPrimitive 확인 → number 지정)를 거꾸로 그리는 것, 역방향 링크가 새 페이지가 다루지 않는 범위를 가리키는 것.
- 복잡도: 높음 · Consensus: 수행 (Architect REVISE·Critic REVISE → HIGH 3(표 칸 `<`, 예제 5 출력·퀴즈 오답, 본문 역방향 링크 누락)·MEDIUM 다수 반영, 메인이 실행·명세로 재확인)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-20)
  - 추가 게시글 로드맵 3의 3번(`.claude/plans/concept-roadmap-extras-3.md`). order 305(`symbol` 300 뒤, `iterable-for-of` 310 앞).
  - 시각화: 시뮬레이터 + 비교표(+ 예제별 퀴즈).
  - 역방향 링크: 기존 페이지가 "ToPrimitive 과정은 결과만" 미룬 문장 중 새 페이지가 실제로 다루는 부분을 이번에 연결(simplifications는 개념 이름, 본문은 링크, related 추가). reviewedAt은 선례대로 바꾸지 않는다.
- 새 페이지 메타
  - `app/concepts/to-primitive/`, slug `to-primitive`, category `objects`(symbol·date와 같음), order 305, `reviewedAt: null`.
  - 제목(로드맵 안): "객체를 원시 값으로: [] + {}는 왜 '[object Object]'일까". title·summary에 "객체"가 있어 홈 "객체" 검색 결과가 18 → 19가 된다(피할 수 없는 영향, 6단계에서 갱신).
  - summary(안, 156자): "객체를 문자열이나 숫자로 바꿔야 할 때 명세의 ToPrimitive는 Symbol.toPrimitive를 먼저 보고, 없으면 연산이 정한 힌트에 따라 valueOf와 toString을 정해진 순서로 불러 처음 나온 원시 값을 씁니다. [] + {}의 결과를 이 순서로 확인합니다."
  - tags: `ToPrimitive`, `OrdinaryToPrimitive`, `valueOf`, `toString`, `Symbol.toPrimitive`, `힌트`, `암묵적 변환`, `[object Object]`.
  - goals(4)
    1. 연산이 ToPrimitive에 주는 힌트(없음·string·number)에 따라 `valueOf`와 `toString` 중 무엇을 먼저 부르는지 예측할 수 있다.
    2. 메서드가 객체를 돌려주면 다음 메서드로 넘어가고, 둘 다 원시 값을 주지 못하면 TypeError라는 것으로 `[] + {}`, `[] + []`, `Object.create(null)`의 결과를 설명할 수 있다.
    3. ToPrimitive가 돌려준 원시 값에 연산이 다시 자기 변환(ToString·ToNumber 등)을 한다는 것을 구분할 수 있다.
    4. `Symbol.toPrimitive`가 있으면 `valueOf`·`toString`보다 먼저 쓰이고, Date는 힌트가 없을 때 문자열 쪽을 먼저 쓴다는 것을 예측할 수 있다.
  - prerequisites: 암묵적 타입 변환(`type-coercion`, 30), 프로토타입 체인(`prototype-chain`, 170), 심벌(`symbol`, 300).
  - related: `type-coercion`, `prototype-chain`, `symbol`, `date`, `equality-operators`, `property-keys`, `primitive-methods`, `bigint`, `expressions-statements`, `json`, `error-handling`.
- 첫 문단의 답
  - `+`, 템플릿 리터럴, `<`·`>`, 프로퍼티 키, 그리고 다른 쪽이 원시 값(null·undefined 제외)인 `==`처럼 객체를 문자열이나 숫자로 바꿔야 하는 연산은 먼저 ToPrimitive로 객체를 원시 값으로 바꾼다. 객체에 `Symbol.toPrimitive` 메서드가 있으면 그것을 부르고, 없으면 OrdinaryToPrimitive가 힌트가 string이면 `toString` → `valueOf`, 그 밖이면 `valueOf` → `toString` 순으로 불러 처음 나온 원시 값을 쓴다.
  - `[]`와 `{}`는 `valueOf`를 직접 갖지 않아 `Object.prototype.valueOf`(객체 자신을 돌려줌)를 상속하므로 건너뛰고, `toString`이 배열은 요소를 이은 `''`, `Symbol.toStringTag`가 없는 일반 객체는 `'[object Object]'`를 돌려준다. `+`는 왼쪽 → 오른쪽 순으로 둘 다 원시 값으로 바꾼 뒤 문자열이 있어 이어 붙인다.
- 동작 원리 절(h3 5개)
  1. **ToPrimitive와 힌트**: 연산이 힌트를 정한다(명세). 이항 `+`(ApplyStringOrNumericBinaryOperator)와 `==`(IsLooselyEqual, 상대가 String·Number·BigInt·Symbol일 때. 불리언은 먼저 Number로 바꾼 뒤)는 힌트 없이, ToNumber·ToNumeric(단항 `+`, `-`, `*`)과 IsLessThan(`<`, `>`)은 number, ToString(템플릿 리터럴, `String()`)과 ToPropertyKey(대괄호 키)는 string. 힌트 없이 불리면 ToPrimitive는 먼저 `Symbol.toPrimitive`를 찾고, **없을 때만** OrdinaryToPrimitive에 number를 넘긴다(명세의 "If preferredType is not present, set preferredType to number"는 그 확인 뒤 단계). `Symbol.toPrimitive`가 받는 힌트 문자열은 [심벌](/concepts/symbol)에서 다룬다. `obj == obj`·`obj == null`은 ToPrimitive를 부르지 않는다는 것과 `==`의 나머지 단계는 [동등 비교](/concepts/equality-operators) 링크.
  2. **valueOf와 toString의 순서**(예제 1·2, 시나리오 A): 같은 객체 `o`(valueOf → 1, toString → 'two')가 `o + ''`에서는 `"1"`, `` `${o}` ``에서는 `"two"`이고 호출 기록으로 두 번째 메서드는 불리지 않음을 보인다. 예제 2: `+o`·`o * 1`·`o > 0` → valueOf(`o > 0`이 true인 것은 toString 먼저였다면 `'two' > 0`이 false였을 것과 대비), `o == 1` true·`o == 'two'` false → 힌트 없음은 상대 타입과 무관하게 valueOf 먼저, `String(o)`·키 → toString. 키 변환은 [프로퍼티 키](/concepts/property-keys) 링크.
  3. **객체를 돌려주면 다음 메서드**(예제 3, 시나리오 B): 배열·일반 객체는 `Object.prototype.valueOf`를 상속해(`a.valueOf() === a` → true) 건너뛰고 `toString`으로 간다([프로토타입 체인](/concepts/prototype-chain) 링크). 배열의 toString은 Array.prototype.toString(join)이라 `[1, 2] + 1` → `"1,21"`, `[] + []` → `""`, `[] + {}` → `"[object Object]"`, `[5] * 2` → 10, `[1] == 1` → true. `[] == ![]` → true: `!`는 ToBoolean이라 ToPrimitive를 부르지 않고 객체는 항상 true라 `![]`는 false, IsLooselyEqual이 불리언을 먼저 Number(0)로 바꾼 뒤 `[]`를 ToPrimitive해 `''` → 0. 래퍼 객체(String·Number·Boolean·BigInt)는 상속한 `valueOf`가 감싼 원시 값을 돌려주므로 `new Number(5) + 1` → 6, `new String('hi') == 'hi'` → true(5번 줄, [원시 값의 메서드](/concepts/primitive-methods) 링크). Symbol 래퍼는 `[Symbol.toPrimitive]`를 거치므로 이 문장에 넣지 않는다.
  4. **원시 값이면 그 값을 쓰고, 연산이 다시 변환한다**(예제 4): `valueOf`가 `'5'`를 돌려주면 `five - 1` → 4(ToNumber), `five + 1` → `"51"`. 원시 값끼리의 변환 규칙은 [암묵적 타입 변환](/concepts/type-coercion) 링크.
  5. **TypeError, Symbol.toPrimitive, Date**(예제 5·6, 시나리오 C): `Object.create(null)`은 두 메서드를 상속하지 않아(호출할 수 없음, prototype-chain 링크) `String(bare)` → TypeError, 둘 다 객체를 돌려주는 `stubborn + ''` → TypeError. `Symbol.toPrimitive`가 있으면 OrdinaryToPrimitive로 가지 않는다(`priced + ''` → `default`, valueOf 호출 0회). Date는 자기 `[Symbol.toPrimitive]`가 힌트 `'default'`를 string처럼 다뤄 `typeof (d + 1)` → `string`, `d - 1` → -1([Date](/concepts/date) 링크). 명세 ToPrimitive NOTE("명세가 정의한 객체 중 Date와 Symbol 객체만 기본 동작을 바꾼다")를 근거로 쓰고, Date 절의 "All other built-in … treat default as number" 문장은 Symbol 예외와 어긋나 인용하지 않는다.
- 예제(모두 sloppy 스크립트, 출력은 원시 값·`JSON.stringify`·불리언·오류 이름. 파일은 계획 때 실행한 초안 그대로 옮긴다: 스크래치 `to-primitive/ex/`)
  1. `hint-order.js`(시나리오 A): → `"1" valueOf` / `"two" toString`
  2. `operation-hints.js`(11번 줄 `console.log(+o, o * 1, o > 0);`): → `1 1 true` / `true false` / `two two`
  3. `array-and-object.js`(시나리오 B, 5줄): → `true` / `"1,21" "" "[object Object]"` / `10 true true` / `6 true`
  4. `primitive-result.js`: → `4 "51"`
  5. `type-error.js`(시나리오 C, try 안에서 `console.log(String(bare))`·`console.log(stubborn + '')`): → `TypeError` / `TypeError`
  6. `symbol-and-date.js`: → `default 0` / `string -1`(시간대 무관 확인)
  - 파일 첫 줄에 `'use strict';`를 붙여도 6개 모두 출력이 같다(메인 실행 확인).
- 배제하는 틀린 모델과 퀴즈 선택지(정답 = expectedOutput을 ' / '로 이은 것, 오답 = 그 모델의 실제 출력. 메인이 모델을 코드로 흉내 내 확인)
  1. 정답 `"1" valueOf / "two" toString` / 오답 "문자열과 섞이면 toString" `"two" toString / "two" toString`, "항상 valueOf 먼저" `"1" valueOf / "1" valueOf`, "두 메서드를 모두 부른다" `"1" valueOf,toString / "two" toString,valueOf`.
  2. 정답 `1 1 true / true false / two two` / 오답 "`>`는 문자열 비교라 toString" `1 1 false / true false / two two`, "상대 피연산자 타입이 힌트를 정한다" `1 1 true / true true / two two`, "프로퍼티 키도 valueOf" `1 1 true / true false / two 1`.
  3. 정답 `true / "1,21" "" "[object Object]" / 10 true true / 6 true` / 오답 "배열 valueOf가 요소를 이은 문자열을 돌려준다" `false / "1,21" "" "[object Object]" / 10 true true / 6 true`, "빈 배열은 0" `true / "1,21" 0 "0[object Object]" / 10 true true / 6 true`, "[]는 truthy라 == ![]는 false" `true / "1,21" "" "[object Object]" / 10 true false / 6 true`.
  4. 정답 `4 "51"` / 오답 "valueOf 결과는 숫자로 바뀐다" `4 6`, "valueOf가 준 문자열은 숫자로 바뀌지 않는다" `NaN "51"`, "+는 toString을 부른다" `4 "[object Object]1"`.
  5. 정답 `TypeError / TypeError` / 오답 "메서드가 없으면 [object Object]" `[object Object] / TypeError`, "객체를 돌려주면 그 객체의 문자열을 쓴다" `TypeError / [object Object]`, "실패하면 undefined" `undefined / undefined`.
  6. 정답 `default 0 / string -1` / 오답 "valueOf가 먼저" `1 1 / string -1`, "+는 Date도 숫자 먼저" `default 0 / number -1`, "힌트 없음은 number로 전달" `number 0 / number -1`.
- 시뮬레이터(시나리오 3개, 공통 셸 `SimulatorShell`, date 개념 구조)
  - 상태 `ToPrimitiveState`(단계마다 전체 스냅샷):
    - `call`: 지금 평가 중인 식(예 `o + ''`), 요약·시작 단계는 null.
    - `target`: 지금 원시 값으로 바꾸는 피연산자(예 `'o'`, `'[]'`, `'{}'`), 없으면 null.
    - `hint`: ToPrimitive가 받은 값 `'none' | 'string' | 'number'`, 없으면 null.
    - `exotic`: `Symbol.toPrimitive` 확인 상태 `'unchecked' | 'absent' | 'present'`.
    - `ordinaryHint`: exotic이 없다고 확인한 뒤 OrdinaryToPrimitive에 넘긴 값 `'string' | 'number' | null`(확인 전에는 null — 명세 순서대로 `none`이 number가 되는 것은 이 단계).
    - `attempts`: 각 `{ method: 'valueOf' | 'toString', status: 'pending' | 'not-callable' | 'returned-object' | 'returned-primitive' | 'not-called', value?: string }`. 원시 값을 얻으면 남은 메서드는 `not-called`("부르지 않음").
    - `outcome`: `{ kind: 'primitive'; value: string; type: 'number' | 'string' | 'boolean' } | { kind: 'TypeError' } | null` — 값과 타입을 함께 표시(숫자 `1`과 문자열 `'1'`을 구분).
    - `after`: 연산이 원시 값으로 하는 일(예 `1 + '' → ToString(1) → "1"`), 없으면 null.
  - 뷰 표시 문구: hint `none`은 "없음", `ordinaryHint`는 "OrdinaryToPrimitive에 number" 식, 상태별 한국어 라벨(호출 전/호출할 수 없음/객체를 돌려줌 → 다음으로/원시 값 → 사용/부르지 않음). 색만으로 구분하지 않는다. 375px에서 넘치지 않는다.
  - A `hint-order`(라벨 "힌트에 따라 순서가 바뀐다"): 객체 생성 → 12번 줄 `o + ''`(hint none → exotic absent → ordinaryHint number → valueOf → `1`(number) → toString not-called → after `1 + '' → ToString(1) → "1"`) → 13번 줄 → 14번 줄 템플릿(hint string → absent → string → toString `'two'` → valueOf not-called).
  - B `array-and-object`(라벨 "객체를 돌려주면 다음 메서드"): 2번 줄 → 3번 줄 `a + 1`(target `a`: valueOf returned-object → toString `'1,2'` → after `'1,2' + 1 → "1,21"`) → 3번 줄 `[] + {}`(target `[]` → `''`, target `{}` → valueOf 객체 → toString `'[object Object]'` → after `'' + '[object Object]'`) → 나머지(`[] + []`, 4·5번 줄)는 요약 단계(`call: null`, `attempts: []`).
  - C `type-error`(라벨 "둘 다 실패하면 TypeError"): `String(bare)`(hint string → absent → toString not-callable → valueOf not-callable → TypeError) → `stubborn + ''`(none → absent → number → valueOf returned-object → toString returned-object → TypeError).
  - 마지막 단계 출력 = expectedOutput(`assertScenarioInvariants`). 줄 번호는 예제 원문 기준. JS 없이 첫 단계가 보인다.
  - 2단계 산출물로 정한다: Simulator `label`("객체를 원시 값으로 시뮬레이터"), 시나리오 라벨(위), 시나리오별 단계 수 → helpers·a11y·responsive·build-output 검사에 쓴다.
- 비교표(결과와 이유 절, 머리 `연산 | ToPrimitive 힌트 | 먼저 부르는 메서드 | 결과 | 예제`, 행 9개, 칸 문구 그대로)
  1. `o + ''` | 없음 → number(Symbol.toPrimitive 없음) | valueOf | `'1'` | 1
  2. `` `${o}` `` | string | toString | `'two'` | 1
  3. `+o` | number | valueOf | `1` | 2
  4. `o > 0` | number | valueOf | `true` | 2
  5. `o == 1` | 없음 → number(Symbol.toPrimitive 없음) | valueOf | `true` | 2
  6. `String(o)` | string | toString | `'two'` | 2
  7. `box[o] = true` | string | toString | 키 `'two'` | 2
  8. `[] + {}` | 없음 → number(Symbol.toPrimitive 없음) | valueOf(객체라 건너뜀) → toString | `'[object Object]'` | 3
  9. `d + 1` | 없음 → default(Date의 Symbol.toPrimitive가 string처럼) | [Symbol.toPrimitive] → toString | 문자열 | 6
  - 표기: `{}`·작은따옴표·백틱이 든 칸은 `<code>{"…"}</code>` 등 `normalizeCell`이 푸는 형식. 칸에 `<`를 쓰지 않는다(`normalizeCell`의 태그 제거가 깨짐 — 계획 때 확인). concept.test가 원문 표 블록에서 `<` 금지 글자를 검사한다(bigint `concept.test.ts:56` 방식).
  - concept.test 검증: 칸 전체 정확 비교, 행마다 probe(결과 + 먼저 부른 메서드), 예제 칸 번호의 예제 파일에 연산 칸 코드가 있는지(7행은 `box[o] = true;`, 9행은 `typeof (d + 1)` 안의 `d + 1`).
  - 호출 기록 probe 방법: 대상에 `Symbol.toPrimitive`(있는 경우)·`valueOf`·`toString`을 기록 후 원래 메서드(`Object.prototype.valueOf`, `Array.prototype.toString`, `Date.prototype.toString`, `Date.prototype[Symbol.toPrimitive]` 등)를 위임 호출하는 자기 프로퍼티로 정의해 순서를 얻는다(배열 `v,t`, Date `d + 1`은 `[Symbol.toPrimitive]` → `toString`). `bare`는 `bare.valueOf === undefined && bare.toString === undefined`로 호출할 수 없음을 확인한다. 같은 방법으로 시나리오 각 호출 단계의 `attempts` 순서·상태를 대조한다.
- 흔한 오해 Callout 2개: "+에 문자열이 있으면 toString을 부른다"(예제 1·4), "valueOf는 숫자를 돌려주고 결과는 숫자다"(예제 4).
- simplifications
  - 힌트 문자열이 `Symbol.toPrimitive` 메서드에 전달되는 형식과 well-known 심벌은 심벌 개념에서 다룬다.
  - Date의 다른 변환(시각 값, toString 형식)은 Date 개념에서 다룬다. 명세가 정의한 객체 중 기본 동작을 바꾸는 것은 Date와 Symbol 객체뿐이며 Symbol 객체는 다루지 않는다.
  - 원시 값끼리의 변환 규칙은 암묵적 타입 변환 개념에서, ToPrimitive가 BigInt를 돌려준 뒤의 연산은 BigInt 개념에서 다룬다.
  - `==`의 나머지 단계(null·undefined, 객체끼리, 불리언의 숫자 변환)는 동등 비교 개념에서 다룬다.
  - `a > b`는 IsLessThan이 두 피연산자의 순서를 바꿔 계산하며, 이 페이지는 그 결과의 힌트(number)만 쓴다.
  - Array.prototype.toString은 join을 부르며 join의 세부(null·undefined 요소, 중첩 배열)는 다루지 않는다. `Symbol.toStringTag`로 태그를 바꾼 객체는 심벌 개념에서 다룬다.
  - 문 맨 앞의 `{}`는 블록으로 읽히므로 예제는 `[] + {}`를 식 안에서만 쓴다(표현식과 문 개념).
  - 예제의 메서드는 객체 리터럴에 직접 정의한 자기 프로퍼티다. `Object.prototype`의 메서드를 바꾸는 방법은 다루지 않는다. `JSON.stringify`는 빈 문자열을 보이려는 출력 용도이며 JSON 개념에서 다룬다.
  - 예제의 try…catch는 try/catch/finally 개념에서 다룬다. console은 호스트 API다.
- 기존 페이지 문구(5개 페이지 10곳, reviewedAt 유지. 각 문장이 가리키는 하위 주제가 새 페이지에 있는지 5단계에서 대조)
  - type-coercion `content.mdx:75` 괄호 "(…, 이 페이지에서는 다루지 않습니다)" → "(…, [객체를 원시 값으로](/concepts/to-primitive)에서 다룹니다)".
  - type-coercion `content.mdx:77` "…결과만 보여 줍니다(아래 단순화 참고)." → "…결과만 보여 줍니다(아래 단순화 참고). 그 과정은 [객체를 원시 값으로](/concepts/to-primitive)에서 다룹니다."
  - type-coercion `meta.ts:84` 마지막 문장 → "객체가 원시 값으로 바뀌는 과정과 valueOf·toString을 직접 정의하거나 Symbol.toPrimitive를 둔 경우의 호출 순서는 객체를 원시 값으로 개념에서, Symbol.toPrimitive가 받는 힌트 문자열은 심벌 개념에서 다룹니다." related `to-primitive`.
  - equality-operators `meta.ts:87` "…결과가 달라지는데 이 경우는 다루지 않습니다(암묵적 타입 변환 페이지와 같은 범위입니다)." → "…결과가 달라지며, 그 과정은 객체를 원시 값으로 개념에서 다룹니다." related `to-primitive`.
  - property-keys `content.mdx:22` "이 페이지는 이 결과만 보여 줍니다." → "이 페이지는 이 결과만 보여 주고, 그 과정은 [객체를 원시 값으로](/concepts/to-primitive)에서 다룹니다."
  - property-keys `content.mdx:264` "객체가 어떤 과정을 거쳐 이 문자열이 되는지는 이 페이지에서 다루지 않습니다." → "객체가 어떤 과정을 거쳐 이 문자열이 되는지는 [객체를 원시 값으로](/concepts/to-primitive)에서 다룹니다."
  - property-keys `meta.ts:97` 끝에 "그 과정(ToPropertyKey가 string 힌트로 ToPrimitive를 부르는 과정)은 객체를 원시 값으로 개념에서 다룹니다." 추가. related `to-primitive`.
  - primitive-methods `content.mdx:46` "`==`가 객체를 원시 값으로 바꾸는 과정은 [동등 비교 연산자](/concepts/equality-operators)에서 결과만 확인합니다." → "`==`가 래퍼 객체를 원시 값으로 바꾸는 과정은 [객체를 원시 값으로](/concepts/to-primitive)에서 다룹니다."
  - primitive-methods `meta.ts:107` → "==가 래퍼 객체를 원시 값으로 바꾸는 과정(ToPrimitive)은 결과만 보여 줍니다. 그 과정은 객체를 원시 값으로 개념에서 다룹니다." related `to-primitive`.
  - bigint `meta.ts:128` → "객체 피연산자(래퍼 객체, valueOf를 정의한 객체)를 원시 값으로 바꾸는 과정(ToPrimitive)은 객체를 원시 값으로 개념에서 다루며, ToPrimitive가 BigInt를 돌려준 뒤의 연산은 다루지 않습니다." related `to-primitive`.

## 2. 사실과 추정

### 사실 (코드·실행에서 확인)
- order 300 symbol, 310 iterable-for-of 사이 305가 비어 있다. order < 305인 개념 46개라 47번째, 총 73개(두 검토자도 확인).
- 기존 서술: symbol `content.mdx:67-69`(String(point)는 string 힌트라 toString 먼저, Symbol.toPrimitive가 먼저 불리고 힌트 3종·연산별 힌트), date `content.mdx:52`·`meta.ts:126`, type-coercion `content.mdx:75,77`·`meta.ts:84`, equality-operators `meta.ts:87`, property-keys `content.mdx:22,264`·`meta.ts:97`, primitive-methods `content.mdx:46`·`meta.ts:107`, bigint `meta.ts:128`(모두 결과만/다루지 않음). number 힌트의 valueOf 먼저·건너뛰기·TypeError·배열 toString은 어느 페이지에도 없다. `[] + {}`·`[1] == 1`·`[] == ![]`를 쓴 페이지도 없다.
- 링크 대상: prototype-chain `content.mdx:122`(Object.create(null)), expressions-statements `content.mdx:89-91`(문 맨 앞 `{`), equality-operators(불리언 → 숫자, null/undefined), symbol `content.mdx:69`, date `content.mdx:52`, primitive-methods(래퍼). 모두 order < 305.
- `tests/helpers/result-tables.ts:18` `normalizeCell`의 `/<[^>]*>/g`가 `<code>{'o < 2'}</code>`를 `{'o`로 만든다(두 검토자 실행). bigint는 `>`로 뒤집고 원문 블록에서 `<`를 금지 글자로 검사한다(`app/concepts/bigint/concept.test.ts:56`).
- 명세(2026-11-20 현재 초안): ToPrimitive 7.1.1(GetMethod로 Symbol.toPrimitive → hint 문자열, 결과가 객체면 TypeError, 그 뒤 preferredType 없으면 number, NOTE: Date·Symbol 객체만), OrdinaryToPrimitive 7.1.1.1, Date.prototype[%Symbol.toPrimitive%] 21.4.4.45, IsLessThan `ToPrimitive(x, number)`, ToPropertyKey `(arg, string)`, IsLooselyEqual `ToPrimitive(x)`(상대가 원시 값일 때, 힌트 없음), ApplyStringOrNumericBinaryOperator `ToPrimitive(lval)`·`(rval)`, ToNumber·ToNumeric number, ToString string, Object.prototype.valueOf(ToObject(this)), Array.prototype.toString(join), Number.prototype.valueOf(ThisNumberValue).
- Node v24.22.3 vm: 예제 6개 출력이 1절과 같고 `'use strict';` 접두로도 같다. 퀴즈 오답 모델 출력 확인(`4 "[object Object]1"`, `o.toString() == 'two'` → true, `0 "0[object Object]"` 등). 탐침: Symbol.toPrimitive가 객체 반환 → TypeError, `Object.create(null) + ''` TypeError, 호출 기록 배열 `v,t`.
- 순서·검색 테스트: "객체" 검색 18 → 19, 순위 `[4,12,20,21,22,23,25,26,28,30,32,33,38,47,49,50,61,68]` → `[…,38,47,48,50,51,62,69]`(첫 카드 '원시 값과 객체' 유지). 72 고정 위치 `concepts.test.ts:104,111,112`, `ConceptPager.test.tsx:18,28`, `navigation.spec.ts`(카드·article 수, '72번째', `N / 72`, pager), `responsive.spec.ts`(홈 article 수). 시뮬레이터 선례(32ac57c): a11y(페이지 + 시뮬레이터 진행), responsive(가로 스크롤 + 시나리오별 끝까지 진행), helpers 상수, build-output(region·첫 단계·라디오·details 개수), content-guide 목록.

### 추정
- 없음

## 3. 구현 전략

- date·property-order 구조(예제 + `scenarios.ts` + 뷰 + 얇은 `Simulator.tsx` + 불변식 테스트), 비교표 검증은 function-name 방식. 메서드 호출 순서는 예제의 호출 기록과 concept.test의 위임 기록 probe로 드러낸다.
- symbol과 중복을 피한다: 힌트 문자열 전달과 Symbol.toPrimitive 기본은 링크, 이 페이지는 "있으면 valueOf보다 먼저"만. Date는 date 링크 + OrdinaryToPrimitive와 대비하는 한 줄.
- 버린 대안: 표 + 퀴즈만(사용자 결정), 역방향 연결 미루기(사용자 결정), `o < 2` 유지(표 검증이 깨짐), 래퍼를 탐침만으로(역방향 링크 근거가 약해 예제 줄로), Symbol 객체 예제(범위 밖).

## 4. 변경 파일

- 추가: `app/concepts/to-primitive/{meta.ts, content.mdx, route.tsx, concept.test.ts, scenarios.ts, ToPrimitiveView.tsx, ToPrimitiveView.test.tsx, Simulator.tsx, Simulator.test.tsx}`, `examples/` 6개.
- 수정(문구·related): `type-coercion/{content.mdx, meta.ts}`, `equality-operators/meta.ts`, `property-keys/{content.mdx, meta.ts}`, `primitive-methods/{content.mdx, meta.ts}`, `bigint/meta.ts`.
- 수정(순서·검색·등록): 2절의 파일들.
- 변경하지 않음: 공통 코드, symbol·date·set-map 본문(9절 후보).

## 5. 위험 요소

- 일반화 → 1절 한정 문장("Symbol.toPrimitive 없을 때만 number", "다른 쪽이 원시 값인 ==", "toStringTag 없는 일반 객체", 래퍼 종류), 예제 1·2·4·6, 3단계 grep.
- 시뮬레이터가 명세 순서를 거꾸로 그림 → `hint`/`exotic`/`ordinaryHint` 분리, `not-called`, `outcome.type`, concept.test 위임 기록 대조.
- 역방향 링크가 새 페이지가 다루지 않는 범위를 가리킴 → 10곳 각각 하위 주제 대조 기록(5단계), 새 페이지 h3 3의 래퍼 줄·h3 1의 키 힌트.
- symbol·date 중복 → 링크와 한 줄 대비만.
- "객체" 검색 결과·순위, 47번째 삽입 → 6단계 완료 조건.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "to-primitive|객체를 원시 값으로|홈 학습 순서 보기|type-coercion|암묵적 타입 변환|property-keys|프로퍼티 키|primitive-methods|원시 값의 메서드"` (a11y 케이스 이름에 "객체를 원시 값으로")
- 브라우저(dev 재시작 뒤 375px·다크): `/concepts/to-primitive` 학습 순서 `47 / 73`, 이전 symbol·다음 iterable-for-of, 시뮬레이터 3시나리오 처음→끝(각 호출 단계의 상태 라벨, `not-called`, 숫자/문자열 구분), JS 없이 첫 단계(프리렌더 HTML), 퀴즈 6개, 비교표 스크롤 영역, 문서 폭 375, 홈 "객체" 검색 19개, type-coercion·property-keys·primitive-methods의 새 링크 이동.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·시나리오
- 대상: `meta.ts`, `route.tsx`, `examples/*`, `scenarios.ts`
- 변경: 예제 6개(초안 그대로), meta(1절), 시나리오 3개(1절 상태·단계).
- 주의사항: 줄 번호는 예제 원문 기준. 예제 파일은 Prettier·ESLint 제외.
- 완료 조건: `npx vitest run tests/examples.test.ts -t to-primitive` 통과, 시나리오 불변식 통과, summary 160자 이하, `'use strict';` 접두 비교 기록, 예제별 "틀린 모델 → 출력 줄" 대조 기록.
### 2. 시각화·Simulator
- 대상: `ToPrimitiveView.tsx`, `Simulator.tsx`, 각 테스트.
- 완료 조건: 뷰·시뮬레이터 테스트 통과(상태 라벨 텍스트, `not-called`, 숫자/문자열 구분, 이전/다음, 첫 단계 프리렌더), label·시나리오 라벨·단계 수를 구현 진행에 기록.
### 3. content.mdx
- 변경: 첫 문단 → 동작 원리(h3 5개) → 시뮬레이터(독립 줄) → 예제 6개(퀴즈 각 1개, 1절 선택지) → 결과와 이유(예제별, 비교표, 흔한 오해 2개).
- 완료 조건: `npx vitest run app/concepts/to-primitive tests/content-integrity.test.ts tests/result-tables.test.ts` 통과, 퀴즈 6개, grep: "number로" 문장은 Symbol.toPrimitive 없음 조건을 가짐, `==` 문장은 "다른 쪽이 원시 값" 조건, "[object Object]" 일반화 문장은 toStringTag 조건.
### 4. concept.test.ts
- 변경: 퀴즈 정답·오답 중복 없음, 비교표(칸 정확 비교·probe·예제 포함·원문 `<` 금지), 시나리오 호출 단계와 위임 기록 probe 대조, 탐침(Symbol.toPrimitive 객체 반환 TypeError, `Object.create(null) + ''`, `obj == obj`는 메서드를 부르지 않음), `'use strict';` 접두, `filterConcepts([concept], '객체')`가 이 페이지를 포함.
- 완료 조건: `npx vitest run app/concepts/to-primitive` 통과, 비교표 칸 변조 실험.
### 5. 기존 페이지 문구
- 대상: 1절 10곳.
- 완료 조건: grep으로 새 문장, `grep -nE "결과만|다루지 않" app/concepts/{type-coercion,equality-operators,property-keys,primitive-methods,bigint}/content.mdx`에 ToPrimitive 관련 미룬 문장이 남지 않음, 10곳의 하위 주제 ↔ 새 페이지 절 대조 기록, related 5개, `npx vitest run app/concepts/{type-coercion,equality-operators,property-keys,primitive-methods,bigint} tests/content-integrity.test.ts` 통과.
### 6. 순서·검색·등록
- 완료 조건: `grep -rnE "/ 72|toBe\(72\)|toHaveCount\(72\)|72번째" app tests` 0건, "객체" 검색 19개·순위 배열, pager symbol → to-primitive → iterable-for-of, 시뮬레이터 a11y·responsive·build-output 검사, content-guide 목록.
### 7. 전체 검증
- 6절 전부와 브라우저 확인 기록.

## 9. 추가 개선 후보
- symbol `content.mdx:67`에서 새 페이지로 링크(number 힌트의 순서).
- date `content.mdx:52`의 "기본 힌트·숫자 힌트" 근거 링크가 type-coercion(힌트를 다루지 않음)을 가리킴 → 새 페이지로 바꿀 후보.
- set-map `content.mdx:25`("ToPrimitive를 거쳐")와 equality-operators `content.mdx:74,356`(미룬 문장은 아님)에 링크할지.

## 변경 이력

- 2026-11-20 (사용자 검토 지적): Symbol.toPrimitive가 객체를 돌려주면 valueOf·toString으로 넘어가지 않고 바로 TypeError, 값이 undefined·null이면 없는 것으로 보고 함수가 아닌 다른 값이면 TypeError(GetMethod) 문장을 5절에 추가 + goals 2를 "valueOf·toString 중 하나가"로 한정 / number 힌트는 순서만 정할 뿐 숫자 비교가 아니라는 반례 `[10] > [9]` false·`[2] > [10]` true를 4절에 추가 / 1절에 preferredType(string·number, 생략 가능)과 Symbol.toPrimitive에 전달되는 문자열의 관계 추가, "명세가 정한 힌트"를 "대표적인 호출 지점"으로 바꾸고 힌트 없음에 `new Date(값)` 추가 / simplifications의 블록 문장을 `{} + []`로 정정 / "Date는 자기 [Symbol.toPrimitive]" → "상속한 Date.prototype[Symbol.toPrimitive]" / 시뮬레이터: 마지막 메서드가 객체를 돌려주면 "객체를 돌려줌 → 더 시도할 메서드 없음", 시나리오 C의 catch 줄 번호(4번·17번 줄의 catch, 5번·18번 줄의 출력) 정정. concept.test 탐침 4개·뷰 테스트 1개 추가 — 영향 단계 2·3·4
- 2026-11-20 (사용자 재검토 지적): 힌트 없음 항목의 `new Date(값)`을 "값이 Date 객체가 아닐 때"로 한정(Date 객체이면 ToPrimitive 없이 시각 값을 읽음 — `new Date(new Date(123))`은 123, Symbol.toPrimitive 미호출), 심벌로 미루는 범위를 "힌트 문자열로 분기하는 Symbol.toPrimitive 메서드를 작성하는 방법"으로 좁힘(본문·simplifications). 탐침 1개 추가 — 영향 단계 3·4

## 구현 진행

- baseline (2026-11-20, `9350034`): lint 0 / format 통과 / typecheck 0 / test 182 files·5806 tests 통과 / test:build 570·e2e는 9350034에서 통과 기록
- [x] 1. 예제·meta·시나리오 — 예제 6개는 계획 때 초안과 byte 단위로 같음, `tests/examples.test.ts -t to-primitive` 통과, 시나리오 불변식 통과, summary 156자, `'use strict';` 접두로 6개 모두 출력 같음(concept.test 검사). 틀린 모델 → 출력: 1절 "배제하는 틀린 모델과 퀴즈 선택지" 그대로(메인이 모델을 코드로 흉내 내 확인).
- [x] 2. 시각화·Simulator — label "객체를 원시 값으로 시뮬레이터", 시나리오 "힌트에 따라 순서가 바뀐다"(15단계)·"객체를 돌려주면 다음 메서드"(24단계)·"둘 다 실패하면 TypeError"(17단계). 첫 단계 "실행 전". 서브에이전트 편차: B에 2번 줄·5번 줄 요약 단계 추가, `[] + []` 요약을 평가 순서대로 `a + 1` 뒤에, C에 출력 단계 추가 — 모두 계획 의도 안.
- [x] 3. content.mdx — h3 5개·시뮬레이터(예제 5 뒤 독립 줄)·퀴즈 6개·비교표 9행·Callout 2개. 메인 수정 3곳: 퀴즈 4 해설 속성값 안의 `"51"`(JSX 속성이 끊김) → `문자열 '51'`, "같은 객체끼리 `obj == obj`" → "양쪽이 모두 객체인 `==`(같은 객체인지만 봅니다)"(서로 다른 두 객체도 메서드를 부르지 않음 — 실행 확인), "valueOf는 건너뛰고" → "valueOf를 부른 결과(객체)는 버려지고".
- [x] 4. concept.test.ts — 칸 정확 비교·행별 probe(결과·호출 순서·Symbol.toPrimitive 힌트)·예제 포함·원문 `<` 금지, 시나리오 attempts를 위임 기록 probe와 대조, 탐침, 퀴즈. 메인이 `==` 탐침을 서로 다른 두 객체까지 넓힘. 서브에이전트 변조 실험(표 1행 결과 칸, 시나리오 `{}.valueOf` 상태 → 실패, 원복 후 통과).
- [x] 5. 기존 페이지 문구 — 10곳 계획 문구 그대로, related 5개, `grep -nE "결과만|다루지 않"` 남은 문장은 새 링크를 단 문장이거나 ToPrimitive와 무관(type-coercion:16, primitive-methods:39·115·309, equality-operators:26, bigint:15).
- [x] 6. 순서·검색·등록 — `/ 72` 등 grep 0건, "객체" 검색 19개·순위 `[…,38,47,48,50,51,62,69]`, pager symbol → to-primitive(47/73) → iterable-for-of, a11y(페이지 + 시뮬레이터 진행)·responsive(가로 스크롤 + 시나리오별 끝까지, 단계 수 하드코딩 없음)·build-output·helpers·content-guide 등록.
- [x] 7. 전체 검증 (2026-11-20) — lint 0, format 통과, typecheck 0, test 185 files·5901 tests(+95), test:build 579, e2e navigation 16·관련 48 passed. dev 재시작 뒤 375px·다크: `47 / 73`, 이전 symbol·다음 iterable-for-of, 시뮬레이터(받은 힌트 없음 → Symbol.toPrimitive 없음 → OrdinaryToPrimitive에 number → valueOf 원시 값 사용 → toString 부르지 않음 → 원시 값 1(타입 number) → `1 + '' → ToString(1) → "1"`), 퀴즈 6개 모두 "정답입니다.", 비교표 스크롤 영역, 문서 폭 375, 홈 "객체" 검색 19개, 세 페이지의 새 링크, 콘솔 오류 없음. 브라우저에서 발견: 학습 목표에 백틱이 그대로 찍힘(ConceptLayout은 goals를 평문으로 그림) → goals의 백틱 제거 후 concept·content-integrity 1029, test:build 579 재통과.
- 리뷰 1차(메인 직접): Critical/High 없음 · Low 2(보고)
  - Low: `equality-operators/meta.ts:87` 새 문장이 "…되며, …달라지며, …"로 연결어미가 반복됨(계획 문구 그대로, 뜻은 정확)
  - Low(범위 밖, 이전 작업): `function-name/meta.ts` goals에도 백틱이 있어 페이지에 그대로 찍힘(9350034, push 완료) — 별도 수정 필요
- 사용자 검토 1차 반영(2026-11-20, 변경 이력 참고): lint 0, format 통과, typecheck 0, test 185 files·5905 tests(+4), test:build 579, e2e 새 페이지 관련 16 passed. dev 브라우저: 새 문장 5곳 표시, 시나리오 C 15/17단계 "더 시도할 메서드 없음", 콘솔 오류 없음.
- 사용자 재검토 반영(2026-11-20): lint 0, format 통과, typecheck 0, test 185 files 통과, 새 개념 관련 1209, test:build 579.
- finalize(2026-11-20): 사용자 결정으로 to-primitive reviewedAt `2026-11-20` 기록, 문구를 고친 기존 5개 페이지 reviewedAt은 유지.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(예제 6개·시뮬레이터 3시나리오 15·24·17단계·비교표 9행·퀴즈 6개·Callout 2개, 기존 5개 페이지 10곳, 순서·검색·등록).
- 시나리오에 출력 줄을 맞추는 요약·출력 단계가 계획보다 늘었다(B의 2번·5번 줄, C의 출력 단계). 계획 의도 안.
- 구현 뒤 메인 수정: 퀴즈 4 해설의 JSX 속성 안 따옴표, `==` 문장 범위(양쪽이 모두 객체), "valueOf는 건너뛰고" 표현, 학습 목표의 백틱(평문으로 그려짐).
- 사용자 검토 1차·재검토(`변경 이력`)로 Symbol.toPrimitive 객체 반환·GetMethod, 문자열 비교 반례, preferredType, `new Date(값)`(Date 객체 제외), `{} + []` 단순화, Date.prototype 표기, 시뮬레이터 마지막 메서드 라벨·catch 줄 번호, 심벌로 미루는 범위를 고쳤다.

### 코드 리뷰
- 메인 직접 리뷰: Critical/High 없음. Low 2건(equality-operators 새 문장의 연결어미 반복, 범위 밖 function-name goals 백틱)을 남겼다.

### 후속 작업
- [ ] function-name `meta.ts` goals의 백틱이 페이지에 그대로 찍힘(9350034) — 고칠지 사용자 결정.
- [ ] (선택) symbol `content.mdx:67`, date `content.mdx:52`(힌트 근거 링크가 type-coercion), set-map `content.mdx:25`에서 새 페이지로 링크.
- [ ] (선택) equality-operators `meta.ts:87` 문장 다듬기.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 비교표·예제 2의 `o < 2`를 `o > 0`으로 바꿨다 — 표 칸의 `<`는 `normalizeCell`의 태그 제거가 칸을 깨뜨린다(검토자 둘이 실행 확인). `o > 0`도 IsLessThan이 number 힌트로 ToPrimitive를 부르고, valueOf 먼저면 `1 > 0` true, toString 먼저면 `'two' > 0` false라 같은 증거력을 가진다.
- [Claude 판단] 래퍼 객체를 concept.test 탐침이 아니라 예제 3의 5번 줄(`new Number(5) + 1`, `new String('hi') == 'hi'`)로 넣었다 — primitive-methods·bigint를 새 페이지로 연결하려면 새 페이지가 그 하위 주제를 실제로 다뤄야 한다.
- [Claude 판단] 시뮬레이터 상태를 `hint`(받은 힌트)·`exotic`(Symbol.toPrimitive 확인)·`ordinaryHint`(OrdinaryToPrimitive에 넘긴 힌트)로 나누고, 남은 메서드는 `not-called`, 결과는 값과 타입을 함께 보였다 — 명세에서 "힌트 없음 → number"는 Symbol.toPrimitive 확인 뒤 단계이고, 숫자 1과 문자열 '1'을 구분해야 "연산이 다시 변환한다"가 보인다.
- [Claude 판단] 메서드 호출 순서를 concept.test에서 대상의 `valueOf`·`toString`·`Symbol.toPrimitive`를 기록 후 원래 내장 메서드로 위임하는 자기 프로퍼티로 감싸 확인했다 — 배열·Date처럼 직접 정의하지 않은 메서드도 순서를 실행으로 대조할 수 있다.
- [무검토 승인] 기존 5개 페이지 10곳의 교체 문구 — 연결 여부는 사용자가 정했고, 구체 문장은 계획대로 승인됐다. 본문 3곳(property-keys 2, primitive-methods 1)은 Consensus 검토에서 추가됐다.
- 사용자 결정: 시뮬레이터 + 비교표, 역방향 링크 이번에 연결, 검토 6건·재검토 2건 반영, reviewedAt 2026-11-20(기존 5개 페이지는 유지).

#### 배경지식
- ToPrimitive(7.1.1)는 GetMethod로 `Symbol.toPrimitive`를 찾아 있으면 힌트 문자열('default'·'string'·'number')로 부르고, 결과가 객체면 TypeError다. 없을 때만 preferredType을 생략했으면 number로 정해 OrdinaryToPrimitive를 부른다. GetMethod는 값이 undefined·null이면 없는 것으로, 그 밖에 호출할 수 없는 값이면 TypeError다.
- OrdinaryToPrimitive(7.1.1.1)는 string이면 toString → valueOf, number면 valueOf → toString 순으로 호출할 수 있는 메서드를 불러 객체가 아닌 첫 결과를 돌려주고, 끝까지 없으면 TypeError다.
- 연산별 힌트: 이항 `+`·`==`(상대가 원시 값일 때)·`new Date(값)`(Date 객체가 아닐 때)는 생략, ToNumber·ToNumeric·IsLessThan은 number, ToString·ToPropertyKey는 string.
- `Object.prototype.valueOf`는 객체 자신을 돌려주고 `Array.prototype.toString`은 join을 부르므로 `[]`는 `''`, Symbol.toStringTag가 없는 일반 객체는 `'[object Object]'`가 된다. Date는 `Date.prototype[Symbol.toPrimitive]`가 'default'를 string처럼 다룬다.
- ToPrimitive는 원시 값을 그대로 돌려줄 뿐이고, 그 뒤 변환(ToString·ToNumber, 문자열끼리면 문자열 비교)은 연산이 한다.

#### 확인 질문
1. 같은 객체 `o`(valueOf → 1, toString → 'two')가 `o + ''`에서는 `"1"`, `` `${o}` ``에서는 `"two"`인 이유는? "힌트 없음이 number가 된다"는 단계는 어느 시점인가?
   <details><summary>답</summary>이항 `+`는 힌트 없이 ToPrimitive를 부르고, `o`에 Symbol.toPrimitive가 없으므로 그 확인 뒤 preferredType이 number가 되어 OrdinaryToPrimitive가 valueOf를 먼저 부른다(1). 템플릿 리터럴은 ToString → string 힌트라 toString을 먼저 부른다('two'). Symbol.toPrimitive가 있으면 number로 바뀌지 않고 'default'가 전달된다(예제 6). 근거: 계획 1절 h3 1·2, 예제 1, 명세 7.1.1.</details>
2. 예제 2를 `o < 2` 대신 `o > 0`으로 쓴 이유와, 그래도 "toString 먼저" 모델을 배제하는 이유는?
   <details><summary>답</summary>표 칸의 `<`가 `normalizeCell`의 태그 제거 정규식에 걸려 칸 비교가 깨진다. `o > 0`도 IsLessThan이 number 힌트로 ToPrimitive를 부르므로 valueOf 먼저면 `1 > 0` true, toString 먼저면 `'two' > 0`(NaN 비교) false로 갈린다. 근거: 계획 2절, 예제 2 11번 줄, 퀴즈 2 오답.</details>
3. 시뮬레이터에서 "받은 힌트: 없음"과 "OrdinaryToPrimitive에 number"를 다른 칸·다른 단계로 보인 이유는?
   <details><summary>답</summary>명세에서 preferredType이 number가 되는 단계는 Symbol.toPrimitive를 찾아 없다고 확인한 뒤다. 처음부터 number로 보이면 Symbol.toPrimitive가 있는 객체나 Date에서 틀리는 "힌트 없음 = number" 일반화를 강화한다. 근거: 계획 1절 시뮬레이터 상태, `scenarios.ts`, Consensus 지적.</details>
4. `Symbol.toPrimitive` 메서드가 객체를 돌려주면 왜 valueOf로 넘어가지 않는가? 그 프로퍼티가 null이면?
   <details><summary>답</summary>객체를 돌려주면 ToPrimitive가 그 자리에서 TypeError를 던지고 OrdinaryToPrimitive는 그 뒤 단계라 실행되지 않는다. null·undefined이면 GetMethod가 undefined로 보고 OrdinaryToPrimitive로 간다(`'1'`), 함수가 아닌 다른 값이면 GetMethod가 TypeError다. 근거: 변경 이력(사용자 검토), concept.test 탐침, 명세 7.1.1·GetMethod.</details>
5. `[10] > [9]`는 number 힌트인데 왜 `false`인가?
   <details><summary>답</summary>number 힌트는 OrdinaryToPrimitive의 메서드 순서만 정한다. 배열은 valueOf가 자기 자신이라 toString으로 `'10'`·`'9'`가 되고, 둘 다 문자열이면 IsLessThan이 문자열로 비교해 `'10' > '9'`는 false다. 근거: 본문 h3 4, concept.test 탐침, 변경 이력.</details>

