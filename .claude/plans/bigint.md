# BigInt와 Number 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-19
- 기준: `main` @ `fe037b1`

## 0. 요약
- 목적: "비교는 되는데 왜 더하기는 TypeError일까"를 질문으로 하는 `bigint` 페이지를 추가한다(order 276, 학습 순서 39번째/70). BigInt와 Number를 섞을 때 산술은 던지고 비교는 수학적 값으로 되는 규칙을 연산자별로 명세와 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 10개, 연산 결과표 1개, 퀴즈 10개, 시뮬레이터 없음), 기존 4개 페이지(equality-operators, type-coercion, number-pitfalls, increment-decrement)의 "다루지 않는다" 문구, 39번째 이후 순위 +1 테스트와 e2e·빌드 테스트 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: 명세에 없는 설계 이유를 사실처럼 쓰거나, Number 출력 표기를 저장된 값이나 명세가 유일하게 정한 문자열로 설명하는 것, `String()` 출력 때문에 BigInt 결과와 Number 결과가 구분되지 않아 예제가 틀린 모델을 배제하지 못하는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → HIGH 1건(2^64 출력 표기)·MEDIUM 8건 반영, 메인이 명세·실행으로 재확인)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-19)
  - 추가 게시글 로드맵 2의 5번. 독립 페이지(로드맵 결정 2026-11-17).
  - 핵심 4개: ① 섞으면 산술은 TypeError, 비교·`==`·문자열 연결은 됨 ② 변환 오류의 종류(RangeError·SyntaxError·TypeError) ③ 나눗셈·나머지(0 쪽 버림, `/ 0n`과 음수 지수 RangeError) ④ Number로 되돌리면 반올림.
  - 추가 4개(모두 선택): 단항·Math·전역 함수, 문자열 비교의 함정, 증감과 섞인 배열, 비트 연산과 `asIntN`.
  - 시각화: 연산 결과표 + 퀴즈(시뮬레이터 없음).
  - slug `bigint`, 제목 "BigInt와 Number: 비교는 되는데 왜 더하기는 TypeError일까".
  - 연결: 단순화 문구 4곳(equality-operators, type-coercion, number-pitfalls, increment-decrement). number-type·data-types의 안내 문구는 바꾸지 않는다.
- 새 페이지
  - `app/concepts/bigint/`, category `fundamentals`(number-pitfalls와 같은 그룹), order 276(number-pitfalls 275와 date 277 사이), `reviewedAt: null`(사용자 검토 후 finalize 때 날짜 기록, `app/lib/concepts.ts:41`).
  - summary(107자): "BigInt와 Number를 섞으면 산술은 TypeError이지만 비교와 ==는 수학적 값으로 됩니다. 변환 오류의 종류, 나눗셈과 나머지, 비트 연산, 정렬을 명세와 실행 결과로 확인합니다."
  - prerequisites: 숫자의 함정(`number-pitfalls`), 암묵적 타입 변환(`type-coercion`), 동등 비교(`equality-operators`).
  - related: `number-pitfalls`, `type-coercion`, `equality-operators`, `increment-decrement`, `array-method-pitfalls`, `json`, `error-handling`.
  - tags: `BigInt`, `TypeError`, `RangeError`, `SyntaxError`, `ToNumeric`, `StringToBigInt`, `asIntN`, `비트 연산`, `정렬` 정도. 제목·요약·태그에 "객체"를 쓰지 않는다(`tests/e2e/navigation.spec.ts:21-25,99-100`이 "객체" 검색 결과 18개와 첫 카드를 고정한다).
  - 예제 출력 원칙: BigInt인 것이 주장의 핵심인 결과는 `String(v)`와 함께 `typeof v`를 출력한다(`String()`만 쓰면 `2n`과 `2`가 둘 다 "2"로 보인다). 각 예제에는 number-pitfalls 예제 9로 설명되지 않는 출력이 1개 이상 있고, 겹치는 결과는 본문에서 number-pitfalls를 링크로 가리킨다.
  - 첫 문단의 답(명세 근거)
    - 이항 산술·비트 연산자는 ApplyStringOrNumericBinaryOperator가 처리한다. `+`이고 한쪽이 문자열이면 먼저 문자열 연결을 하고, 그 밖에는 두 피연산자를 ToNumeric으로 바꾼 뒤 SameType이 false이면 TypeError를 던진다. 한쪽을 다른 타입으로 바꾸는 단계가 없다.
    - 비교는 다른 알고리즘이다. IsLessThan(`<`·`>`·`<=`·`>=`)과 IsLooselyEqual(`==`)은 BigInt와 Number를 수학적 값(ℝ)으로 비교하므로 오류가 나지 않는다.
    - 설계 이유(정밀도·소수 표현)는 명세가 적지 않으므로 사실로 쓰지 않는다. 쓰려면 TC39 BigInt 제안 문서를 근거로 "제안 문서는 … 라고 설명한다"로 한정한다(본문에 넣을지는 2단계에서 판단, 넣지 않아도 된다).
  - 동작 원리 절(예제 번호)
    1. 섞은 산술(예제 1): `1n * true`·`1n + undefined`는 TypeError(ToNumeric이 Boolean·undefined를 Number로 바꾸므로 Number가 아닌 값도 결국 Number와 섞인다). `1n + 1`의 TypeError는 number-pitfalls 예제 9를 가리킨다. `1n + '1'`과 `'1' + 1n`은 `'11'`(문자열 연결이 ToNumeric보다 먼저). 명시적으로 맞추면 된다: `Number(1n) + 1`은 number, `1n + BigInt(1)`은 bigint(값과 `typeof`를 함께 출력).
    2. 단항·내장 함수(예제 2): 단항 `-`·`~`는 ToNumeric이라 `-1n`·`~1n`이 bigint로 된다(`typeof` 출력). 단항 `+`는 ToNumber라 TypeError. `Math.max(1n, 2n)`·`isNaN(1n)`은 인수에 ToNumber를 하므로 TypeError. `Number.isInteger(1n)`은 변환하지 않고 "정수인 Number인가"만 봐서 `false`. 문장은 "ToNumber를 하는 함수"로 한정한다. "내장 함수는 BigInt를 받지 못한다"로 넓히지 않는다(`parseInt(1n)`은 ToString이라 1, `Number.isNaN(1n)`은 false). Math는 29장이고 개념 페이지가 없어 링크 없이 함수 이름으로만 쓴다.
    3. 증감과 복합 대입(예제 3): `x++`는 ToNumeric 뒤 BigInt면 BigInt::add(x, 1ℤ)라 된다(결과의 `typeof`가 bigint임을 출력해 "Number로 바꿔 더한다" 모델을 배제). `x += 1`은 이항 `+`라 TypeError, `x += 1n`은 된다. increment-decrement 링크.
    4. Number와의 비교(예제 4): IsLessThan은 한쪽이 BigInt, 한쪽이 Number면 NaN이면 undefined(그래서 `<`·`>=` 모두 false), ±∞를 먼저 처리, 그 밖에는 ℝ로 비교한다. 두 틀린 모델을 각각 배제한다. (a) BigInt를 Number로 바꿔 비교: `9007199254740993n > 9007199254740992`가 `true`, `9007199254740993n == 9007199254740992`가 `false`(바꾸면 둘 다 9007199254740992). (b) Number를 BigInt로 바꿔 비교: `1n < 1.5`와 `2n > 1.5`가 `true`(BigInt()로 바꾸면 RangeError, 버리면 false). `[1n].includes(1)`은 SameValueZero라 false(array-method-pitfalls 링크). `1n === 1`은 number-pitfalls 예제 9를 가리키고 예제에 넣지 않는다.
    5. 문자열과의 비교(예제 5): 한쪽이 BigInt, 한쪽이 문자열이면 문자열을 StringToBigInt로 바꾼다(Number가 아니다). `9007199254740993n == '9007199254740993'`은 true(문자열을 Number로 바꾸면 9007199254740992가 되어 false여야 한다). `1n == ' 1 '`과 `16n == '0x10'`은 true(BigInt를 문자열로 바꿔 문자열끼리 비교하는 모델이면 false). StringToBigInt가 실패하면 `==`는 false, IsLessThan은 undefined라 `1n < '1.5'`와 `1n >= '1.5'`가 모두 false다. Number와 비교한 `1 < '1.5'`는 true인 것과 대비한다. type-coercion 링크(그 페이지가 이미 한 문장으로 밝힌 규칙을 실행으로 넓힌다).
    6. BigInt로 바꾸기(예제 6): `BigInt(value)`는 ToPrimitive 뒤 Number이면 NumberToBigInt(정수가 아니면 RangeError: `1.5`, `NaN`, `Infinity`), 아니면 ToBigInt(undefined·null은 TypeError, Boolean은 1n/0n, 문자열은 StringIntegerLiteral 문법으로 읽고 실패하면 SyntaxError). 문자열 문법: 앞뒤 공백 허용, 빈 문자열은 0n, 10진은 부호 허용, `0x`·`0o`·`0b`는 부호 불가, 소수점·지수·`n` 접미사·숫자 구분자(`_`) 불가. `BigInt('1e3')`은 SyntaxError인데 `Number('1e3')`은 1000이라 "문자열을 Number로 바꾼 뒤 BigInt로" 모델이 배제된다. `BigInt.asIntN(8, 255)`는 ToBigInt를 바로 쓰므로 Number 인수가 TypeError다(`BigInt(255)`는 된다).
    7. Number로 바꾸기(예제 7): `Number(bigint)`는 𝔽(ℝ(x)), 곧 가장 가까운 Number 값이고 너무 크면 Infinity다(반올림 자체는 number-pitfalls 예제 9를 가리킨다). `Number(2n ** 63n)`은 2^63을 정확히 담지만 출력은 `9223372036854776000`이다. Number::toString은 그 Number 값으로 돌아오는 가장 짧은 자릿수를 고르고(2^63은 16자리 후보가 `9223372036854776000` 하나뿐 — 스크래치로 확인), 모자란 자리를 0으로 채운다. 그 값을 다시 `BigInt()`로 바꾸면 `9223372036854775808`이라 출력 문자열과 저장 값이 다르다는 것이 보인다. `Number(10n ** 400n)`은 Infinity. 2^64는 쓰지 않는다: 17자리 후보가 셋(`…551000`·`…552000`·`…553000`)이라 출력의 마지막 자리는 명세 비규범 Note의 권고를 따른 V8의 선택이다.
    8. 나눗셈·나머지·거듭제곱(예제 8): BigInt::divide가 0 쪽으로 버리는 것은 number-pitfalls 예제 9를 가리키고 예제에서는 반복하지 않는다(표에 한 행만). BigInt::remainder의 부호는 나눠지는 수를 따른다(`-5n % 3n`은 -2n, `5n % -3n`은 2n). `1n / 0n`·`1n % 0n`은 RangeError, `2n ** -1n`은 RangeError, `0n ** 0n`은 1n. `typeof (5n / 2n)`은 'bigint'.
    9. 비트 연산(예제 9): `&`·`|`·`^`·`~`·`<<`·`>>`는 BigInt끼리 된다. 근거는 BigInt::leftShift의 Note(BigInt를 무한 길이의 2의 보수 비트열로 해석)와 BigIntBitwiseOp(부호를 확장해 비트별로 계산), bitwiseNOT(−x − 1)이다. `-5n >> 1n`은 -3n(0 쪽이 아니라 내림이라 `-5n / 2n`의 -2n과 다르다). `1n << 31n`은 2147483648인데 Number `1 << 31`은 -2147483648이다(Number의 시프트는 결과를 ToInt32로 32비트 부호 있는 정수로 만든다). Number 시프트 횟수의 `modulo 32` 같은 세부는 다루지 않는다(simplifications). `1n << 64n`은 예제에만 두고 표에는 넣지 않는다. `>>>`는 BigInt::unsignedRightShift가 항상 TypeError. `BigInt.asUintN(64, -1n)`은 2^64 − 1, `asIntN(8, 255n)`은 -1n, `asIntN(8, 128n)`은 -128n(나머지를 구해 2^(bits−1) 이상이면 2^bits를 뺀다).
    10. 정렬(예제 10): 비교 함수 없는 `sort`는 문자열로 비교해 `[30n, 4n, 100n]`이 `100,30,4`(array-method-pitfalls와 같은 규칙). `(a, b) => a - b`는 BigInt끼리만 든 배열에서도 TypeError다. `a - b` 자체는 BigInt 뺄셈으로 되지만 CompareArrayElements가 비교 함수의 반환값에 ToNumber를 하기 때문이다. 이를 출력으로 구분하려고 `(a, b) => Number(a - b)`가 같은 배열을 정렬하는 출력을 함께 넣는다(`a - b`에서 던진다는 모델 배제). `<`·`>`로 -1·0·1을 돌려주는 비교 함수는 `[3n, 1, 2n]`처럼 섞인 배열에서도 된다. 명세는 비교 함수를 부르는 순서와 횟수를 구현에 맡기므로 "명세상 반드시 TypeError"라고 쓰지 않고, 비교 함수가 불리면 반환값의 변환에서 던진다고 쓴다(출력은 실행 결과).
  - 연산 결과표(결과와 이유 절, 예제 뒤)
    - 머리 `식 | 결과 | 규칙`. 행 약 24개, 위 1~10을 연산자별로 한 행씩(예제와 다른 피연산자도 허용). `<`·`<<`·`<=`가 든 식은 표에 넣지 않는다(작다 비교는 `>`로 뒤집고, 왼쪽 시프트는 예제 9로만). `1n == true` 행을 넣어 Boolean 분기(ToNumber 뒤 ℝ 비교)도 다룬다. `<th>`는 한 줄로 쓴다(`<th className=…>식</th>`, build-output 정규식). concept.test가 식 칸을 새 vm 컨텍스트에서 평가해 결과 칸과 대조한다.
    - 결과 칸 표기: BigInt는 리터럴 표기(`2n`), Number는 그대로(`2`), 문자열은 작은따옴표(`'11'`), 불리언은 `true`/`false`, 던지면 오류 이름(`TypeError`). 표 위에 "결과 칸은 console 출력이 아니라 값을 리터럴로 적은 것"이라고 한 문장 쓴다.
    - 식 칸 금지 글자: `<`(normalizeCell의 태그 제거 정규식이 내용을 지운다), `\`, `{`, `}`, 백틱, 큰따옴표. `>`는 안전하다(Architect 확인, string-replace-split의 정규식은 `>`까지 막으므로 복사하지 않는다). 작다 비교는 피연산자를 바꿔 `>`로 쓴다(`1.5 > 1n`). 문자열이 든 식은 `<code>{"1n == '1'"}</code>`. 금지 글자 검사는 정규화된 칸이 아니라 content.mdx 원문의 표 블록(`<code>{…}</code>` 안쪽)에서 한다.
  - 다루지 않고 밝힐 것(simplifications)
    - `console.log`는 호스트 API이고, BigInt는 `String()`으로 바꿔 넘긴다(Node `util.format`의 `1n` 표기에 기대지 않는다).
    - 예제의 `try…catch`는 오류 이름을 보이는 용도다. try/catch/finally 개념에서 다룬다.
    - 객체 피연산자(래퍼 객체, `valueOf`를 정의한 객체)의 ToPrimitive는 다루지 않는다.
    - `a > b`·`a <= b`는 명세에서 IsLessThan의 인수 순서를 바꿔 계산하지만, 본문은 왼쪽과 오른쪽을 그대로 비교하는 것으로 설명한다(type-coercion과 같은 단순화).
    - `BigInt()`·`==`에 Symbol 값을 넘기는 경우는 다루지 않는다(Symbol은 뒷장 개념).
    - Number 비트 연산의 세부(피연산자의 ToInt32·ToUint32, 시프트 횟수를 32로 나눈 나머지)는 다루지 않고 `1 << 31` 대비에 필요한 만큼만 쓴다.
    - Number로 바꾼 값의 출력은 Number::toString이 고른 가장 짧은 자릿수 표기다. 자릿수 후보가 여럿인 값(예: 2^64)의 마지막 자리는 명세가 하나로 정하지 않는다.
    - BigInt 리터럴의 문법 오류(`1.5n` 등), `toString(radix)`·`toLocaleString`, `BigInt64Array`·`DataView`, 성능·내부 표현은 다루지 않는다. `JSON.stringify`의 TypeError는 JSON 개념에서 다룬다.
    - 수학적 값(ℝ)과 𝔽(가장 가까운 Number 값으로 반올림)은 명세 표기를 풀어 쓴 것이다.
    - 정렬에서 비교 함수가 몇 번, 어떤 순서로 불리는지는 명세가 정하지 않으므로 다루지 않는다.
- 기존 페이지 문구(4곳, 새 페이지가 실제로 다루는 하위 주제만)
  - equality-operators `content.mdx:26` "이 페이지는 BigInt와 Symbol이 끼는 규칙을 다루지 않습니다(아래 단순화 참고)." → "BigInt와 문자열·숫자·불리언을 `==`로 비교하는 규칙은 [BigInt](/concepts/bigint)에서 다루고, BigInt와 객체, Symbol이 끼는 규칙은 다루지 않습니다(아래 단순화 참고)." `meta.ts:86`은 "BigInt와 문자열·숫자·불리언의 == 규칙(문자열을 BigInt로 바꾸는 규칙, BigInt와 숫자 비교)은 BigInt 개념에서 다룹니다. BigInt와 객체, Symbol이 끼는 ==의 규칙은 다루지 않습니다." related에 `bigint`.
  - type-coercion `content.mdx:84` BigInt 항목 끝에 "BigInt와 숫자를 섞어 계산하거나 비교할 때의 규칙은 [BigInt](/concepts/bigint)에서 다룹니다" 한 문장("전체"라고 쓰지 않는다). `meta.ts:85`의 "Symbol과 BigInt 자체는 다루지 않고"를 "BigInt 자체는 BigInt 개념에서 다루고, Symbol 자체는 다루지 않으며"로. related에 `bigint`.
  - number-pitfalls `content.mdx:52` BigInt 절 끝에 "Number와 섞어 계산하거나 비교할 때의 규칙은 [BigInt](/concepts/bigint)에서 다룹니다." `meta.ts`의 "…BigInt의 비트 연산과 asIntN, 단항 연산자는 다루지 않습니다"에서 BigInt 부분을 떼어 "BigInt의 비트 연산·asIntN·단항 연산자는 BigInt 개념에서 다룹니다"로. related에 `bigint`.
  - increment-decrement `meta.ts:76` "BigInt의 증감(BigInt::add), …은 다루지 않습니다" → BigInt의 증감은 BigInt 개념에서 다루고, 나머지는 그대로 다루지 않음. related에 `bigint`.

## 2. 사실과 추정

### 사실 (코드·실행에서 확인)
- order 275 number-pitfalls, 277 date 사이에 276이 비어 있다(`app/concepts/*/meta.ts` order 목록). order < 276인 개념은 38개라 새 페이지는 39번째, 총 70개.
- number-pitfalls에 BigInt 절과 예제 9가 있다: `2n ** 53n + 1n`, `1n == 1`/`===`, 섞은 덧셈 TypeError, `7n / 2n`·`-7n / 2n`, `BigInt(9007199254740993)`(`app/concepts/number-pitfalls/content.mdx:50-52`, `examples/bigint-exact.js`). 새 페이지는 이 결과를 다시 예제로 쓰지 않는다.
- 기존 페이지의 "다루지 않는다" 문구: `equality-operators/content.mdx:26`, `equality-operators/meta.ts:86`, `type-coercion/content.mdx:84`(BigInt 항목), `type-coercion/meta.ts:85`, `number-pitfalls/meta.ts`(simplifications 7번째 항목), `increment-decrement/meta.ts:76`.
- type-coercion이 이미 "`>·<`에서 BigInt와 문자열은 문자열을 BigInt로 바꾼다"를 단순화에 쓰고 concept.test로 검증한다(`type-coercion/meta.ts:85`, `concept.test.ts:85`).
- array-method-pitfalls가 기본 `sort`의 문자열 비교와 비교 함수 반환값의 ToNumber(NaN이면 0)를 다룬다(`array-method-pitfalls/content.mdx:9,15`). BigInt 반환값의 TypeError는 다루지 않는다.
- 식 → 결과 표는 concept.test가 `tableBody`로 읽어 평가한다(`tests/helpers/expression-tables.ts`, 예: `increment-decrement/concept.test.ts:393`). `normalizeCell`은 `/<[^>]*>/g`로 태그를 지우고 `{'…'}`·`{"…"}`를 벗긴다(`tests/helpers/result-tables.ts:17-25`) — 식 칸의 `<`는 내용을 지운다.
- 명세(2026-11-19 tc39.es/ecma262 multipage 원문으로 확인): ApplyStringOrNumericBinaryOperator(13.15.3), ToNumeric·ToNumber(7.1.3·7.1.4: BigInt면 TypeError), unary `+`는 ToNumber, unary `-`는 ToNumeric(13.5.4.1·13.5.5.1), postfix `++`는 BigInt::add(oldValue, 1ℤ)(13.4.2.1), IsLessThan(7.2.12)·IsLooselyEqual(7.2.13)의 BigInt 분기, 관계 연산자 평가(13.10.1: undefined면 `<`·`>=` 모두 false), BigInt(value)(21.2.1.1)·NumberToBigInt·ToBigInt(Table 12)·StringToBigInt·StringIntegerLiteral(SignedInteger와 NonDecimalIntegerLiteral, [~Sep]), BigInt::divide·remainder(Note: 부호는 피제수)·exponentiate·unsignedRightShift(항상 throw), BigInt.asIntN·asUintN(ToBigInt), Number(value)(𝔽(ℝ)), Math.max·isNaN(ToNumber), Number.isInteger(integral Number인지만), Array.prototype.includes(SameValueZero), CompareArrayElements(비교 함수 결과에 ToNumber, 없으면 ToString 비교).
- Node v24.22.3 `vm.runInNewContext` 실행 결과(스크래치 탐침): 위 1~10의 모든 값과 오류 이름이 계획대로 나온다(예: `1n < '1.5'`·`1n >= '1.5'` false, `1 < '1.5'` true, `BigInt({})` SyntaxError, `BigInt('-0x10')` SyntaxError, `[3n,1n,2n].sort((a,b)=>a-b)` TypeError, `String(BigInt(Number(2n**64n)))` '18446744073709551616').
- 등록·순서 테스트는 이전 개념과 같은 파일을 고친다(`bcc337e`, `fe037b1`의 stat): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(`/ 69` 등), `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(e2e 등록 목록).

### 추정
- 없음. (예제 출력은 1단계에서 `npm test`로 다시 확인한다.)

## 3. 구현 전략

- class-accessors(ecmascript, 표 + 퀴즈, 시뮬레이터 없음)의 구조를 그대로 따른다. 예제 파일 10개, 퀴즈는 예제마다 1개, 결과 표는 식 → 결과 표 1개.
- 예제마다 틀린 모델 하나를 배제하는 출력을 넣는다(number-pitfalls 교훈): BigInt를 Number로 바꿔 계산·비교(예제 1·3의 `typeof`, 예제 4의 2^53+1 비교), Number를 BigInt로 바꿔 비교(예제 4의 `1n < 1.5`), "BigInt가 끼면 무조건 TypeError"(예제 1의 `'11'`, 예제 4의 비교), "단항 +는 그대로"(예제 2), "`x++`는 `x = x + 1`"(예제 3), 문자열을 Number로 바꿔 비교(예제 5의 2^53+1 문자열, `1n < '1.5'`), BigInt를 문자열로 바꿔 문자열 비교(예제 5의 `' 1 '`·`'0x10'`), "BigInt(문자열) = BigInt(Number(문자열))"(예제 6), "출력 문자열 = 저장 값"(예제 7), 수학적 나머지·제수 부호(예제 8), 32비트 시프트·0 쪽 시프트(예제 9), "`a - b`에서 던진다"(예제 10의 `Number(a - b)` 성공).
- 결과 표는 데이터 파일이 아니라 content.mdx의 JSX 표로 쓰고 concept.test가 `tableBody`로 읽어 식을 평가한다(content-guide 규칙, increment-decrement 방식). 결과 칸 포매터는 concept.test 안에 둔다.
- 버린 대안: 시뮬레이터(사용자 결정으로 제외). number-pitfalls BigInt 절을 넓히기(로드맵 결정으로 독립 페이지). 데이터 파일로 표 그리기(`{rows.map}` 표는 자동 대조되지 않아 별도 검증이 필요하고, 기존 식 표는 JSX로 쓴다).

## 4. 변경 파일

- 추가: `app/concepts/bigint/{meta.ts, content.mdx, route.tsx, concept.test.ts}`, `examples/` 10개(`mixed-arithmetic.js`, `unary-builtins.js`, `increment.js`, `compare-number.js`, `compare-string.js`, `to-bigint.js`, `to-number.js`, `division.js`, `bitwise.js`, `sort.js` — 이름은 구현 때 조정 가능).
- 수정(문구·related): `equality-operators/{content.mdx, meta.ts}`, `type-coercion/{content.mdx, meta.ts}`, `number-pitfalls/{content.mdx, meta.ts}`, `increment-decrement/meta.ts`.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(e2e 등록 목록에 `bigint`).
- 수정(계획): `.claude/plans/concept-roadmap-extras-2.md` 5번 행 상태는 finalize 때.
- 변경하지 않음: 공통 코드(`app/components/`, `app/simulator/`, `app/lib/` 소스, 라우트), number-type·data-types(사용자 결정).

## 5. 위험 요소

- 설계 이유를 명세 사실처럼 씀 → 오개념·근거 없음 → 2단계 완료 조건(grep "정밀도"·"잃지 않" 등으로 근거 확인), 리뷰.
- Number 출력 표기를 "반올림된 값"이나 "명세가 정한 유일한 문자열"로 설명 → 틀림 → 예제 7은 16자리 후보가 하나뿐인 2^63을 쓰고 `BigInt(Number(2n ** 63n))`을 함께 출력, 2^64는 쓰지 않음(1단계 완료 조건).
- `String()`만 출력해 BigInt와 Number 결과가 같아 보임 → 예제가 틀린 모델을 배제하지 못함 → 1절 예제 출력 원칙(`typeof` 병기), 1단계 완료 조건.
- 비교·정렬 예제가 다른 틀린 모델(Number→BigInt 변환, 문자열 비교, `a - b`에서 던짐)로도 같은 출력 → 1절 4·5·10의 추가 출력.
- Symbol(order 300) 언급 → 장 순서 규칙 위반 → 예제·표에서 Symbol을 쓰지 않음.
- 검색 결과 수 고정 테스트("객체" 18개) → 태그·제목·요약에 "객체"를 쓰지 않음, 5단계 완료 조건.
- `-5n >> 1n`을 "나눗셈과 같다"로 설명 → `-5n / 2n`은 -2n이라 다름 → 예제 9 본문에서 내림임을 명시.
- 식 칸에 `<`·큰따옴표 등 금지 글자 → 표 대조가 엉뚱한 식을 평가 → concept.test에 금지 글자 검사, 브라우저에서 표 글자 확인.
- 결과 칸 표기 불일치(`2n` vs `2`) → 포매터가 타입별로 만들고 대조, 표 위 안내 문장.
- sloppy mode 의존 → 예제마다 `'use strict';`를 붙여 같은 출력인지 concept.test로 확인(AGENTS 예제 규칙).
- 순서 삽입(39번째)으로 navigation pager 이웃(number-pitfalls 38 ↔ bigint 39 ↔ date 40)과 그 뒤 순위가 바뀜 → 5단계 grep 완료 조건.
- 기존 페이지 문구가 새 페이지가 다루지 않는 부분까지 링크(Symbol, ==의 객체 규칙) → 4단계 완료 조건에서 문장별로 대조.
- number-pitfalls 예제 9와 결과 중복 → 1절 예제 출력 원칙(예제마다 예제 9로 설명되지 않는 출력 1개 이상, 겹치는 결과는 링크) → 1단계 완료 조건(예제별 대조표를 구현 진행에 기록).
- 같은 장 범위: 새 페이지(276)보다 뒤 개념(error-handling 470, json 420)은 본문 링크 없이 simplifications에서 개념 이름으로만 가리킨다.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "bigint|BigInt|홈 학습 순서 보기|equality-operators|동등 비교|type-coercion|암묵적 타입 변환|number-pitfalls|숫자의 함정|increment-decrement|증감"` (공통 코드 변경 없음, AGENTS e2e 범위)
- 브라우저(dev 재시작 뒤 375px·다크)
  1. `/concepts/bigint`: 학습 순서 `39 / 70`, 이전 number-pitfalls·다음 date.
  2. 정답 확인 버튼 10개, 결과 표가 가로 스크롤 영역(포커스 가능)이고 문서 폭 375.
  3. 결과 표 식 칸의 화면 글자가 content.mdx 원문과 같다(특히 `'1.5' > 1n`, `5n | 3n`, `5n & 3n`).
  4. equality-operators·type-coercion·number-pitfalls 본문의 새 링크가 `/concepts/bigint`로 이동.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 명세 확인, 폴더 뼈대·예제·meta
- 대상: `app/concepts/bigint/{meta.ts, route.tsx, examples/*}`
- 변경: 1절 동작 원리 1~10의 예제 10개를 쓰고 meta(expectedOutput, simplifications, references: 명세 각 절과 MDN BigInt)를 채운다. route.tsx는 class-accessors와 같은 모양.
- 주의사항: 출력은 원시 값·불리언·`String()` 결과만. 오류는 `try…catch`로 `e.name`만 출력. 각 예제가 1절에 적은 틀린 모델을 배제하는 출력을 갖는다. number-pitfalls `bigint-exact.js`의 식을 그대로 쓰지 않는다.
- 완료 조건: `npx vitest run tests/examples.test.ts -t bigint` 통과, 예제마다 `'use strict';`를 붙여 실행해도 같은 출력(스크래치 실행 결과 기록), `grep -rn "Symbol\|2n \*\* 64n\|7n / 2n\|2n \*\* 53n" app/concepts/bigint/examples` 0건, 예제마다 "배제하는 틀린 모델 → 그 출력 줄"과 "number-pitfalls 예제 9로 설명되지 않는 출력 줄"을 적은 대조표를 구현 진행에 기록(1절 원칙 위반 0건), 결과가 bigint인 것이 주장인 줄에 `typeof` 출력이 있음, summary 160자 이하, tags에 "객체" 없음.

### 2. content.mdx 본문
- 대상: `app/concepts/bigint/content.mdx`
- 변경: 첫 문단(질문과 답) → `## 동작 원리`(1절 1~10을 묶어 h3 5~6개) → `## 예제`(예제 10개 + 퀴즈 10개) → `## 결과와 이유`(예제별 설명, 연산 결과표, 흔한 오해 Callout 2~3개).
- 주의사항: 명세 알고리즘 이름은 괄호로 한 번만. 설계 이유는 쓰지 않거나 제안 문서로 한정. 표는 `<div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="…">`(axe). 식 칸 금지 글자 규칙. 뒷장 개념 본문 링크 금지(error-handling·json). 인라인 코드 공백 줄바꿈 함정은 `<code>{…}</code>`. 내장 함수 문장은 "ToNumber를 하는 함수"로 한정. 표 `<th>`는 한 줄.
- 완료 조건: `npm test -- app/concepts/bigint tests/content-integrity.test.ts tests/result-tables.test.ts` 통과, `grep -n "정밀도\|잃지 않\|때문에 설계" content.mdx`의 각 줄이 명세나 실행으로 뒷받침됨(없으면 0건), 퀴즈 10개.

### 3. concept.test.ts
- 대상: `app/concepts/bigint/concept.test.ts`
- 변경: (a) 퀴즈 정답 = expectedOutput을 ' / '로 이은 문자열, (b) 결과 표: `tableBody(mdx, ['식', '결과', '규칙'])` 행마다 식을 새 컨텍스트에서 평가해 포매터 결과 = 결과 칸, 행 수 하한, (c) content.mdx 원문 표 블록의 식 칸 금지 글자 검사(`<`·`\`·`{`·`}`·백틱·큰따옴표, `>`는 허용), (d) 예제마다 `'use strict';` 버전 출력 = expectedOutput, (e) 본문에서 예제 없이 주장한 것의 탐침(예: `BigInt({})` SyntaxError가 본문에 있으면).
- 완료 조건: `npx vitest run app/concepts/bigint` 통과, 결과 칸 하나를 일부러 틀리게 바꾸면 실패(변조 실험 후 원복).

### 4. 기존 페이지 문구
- 대상: 1절 "기존 페이지 문구" 4곳(6개 파일).
- 완료 조건: 각 문장이 1절 목표대로 바뀜(grep), 새 문장이 가리키는 하위 주제가 새 페이지 본문에 실제로 있음(문장별 대조표를 구현 진행에 기록), 4개 meta의 related에 `bigint`, `npm test -- app/concepts/{equality-operators,type-coercion,number-pitfalls,increment-decrement} tests/content-integrity.test.ts` 통과.

### 5. 순서 테스트와 새 페이지 등록
- 대상: 4절 순서·등록 파일.
- 완료 조건: `grep -rn "/ 69\|toBe(69)\|toHaveCount(69)\|69번째" app tests` 0건, navigation pager 블록에 number-pitfalls → bigint → date 이웃, a11y·build-output에 `bigint` 케이스, content-guide 등록 목록에 `bigint`, `navigation.spec.ts`의 "객체" 검색 결과 수(18)와 첫 카드가 그대로 통과.

### 6. 전체 검증
- 6절 정적·e2e·브라우저 시나리오 전부.
- 완료 조건: 모두 통과, 브라우저 1~4 확인 기록.

## 9. 추가 개선 후보
- number-type·data-types의 "BigInt는 숫자의 함정 개념에서 다룹니다"에 새 페이지 병기(이번엔 사용자 결정으로 제외).
- `BigInt64Array`·`DataView`의 ToBigInt64(형식화 배열 페이지가 생기면).

## 변경 이력

- 2026-11-19 (사용자 검토 7건, 명세·실행으로 확인): 정렬 절의 단정과 "반드시 TypeError라 하지 않음"의 충돌 → 비교 함수가 불리면 던지고 요소 0~1개면 불리지 않음(탐침 `[1n].sort(...)`) / 비트 연산 근거를 연산자별로(BigIntBitwiseOp는 `&`·`|`·`^`만, `~`는 `-x - 1`, 시프트는 2의 거듭제곱 곱셈·내림 나눗셈) / "비교는 undefined" → IsLessThan이 undefined를 돌려주어 관계 연산자 넷이 모두 false, Symbol 단순화에 관계 비교(TypeError) 추가 / 문자열 문법과 리터럴의 차이 방향(리터럴엔 부호 없음, 문자열은 공백·빈 문자열·10진 부호·앞자리 0 허용, `012n`은 SyntaxError) / `BigInt(Number)`는 반올림된 값을 옮김(숫자의 함정 참조) / `+` 말고는 문자열을 먼저 보지 않음(표에 `1n - '1'` TypeError) / `parseInt(1n)`은 Number라 큰 값은 정밀도를 잃음 — 영향 단계 2·3(문장·표·탐침, 예제 출력은 그대로)

## 구현 진행

- baseline (2026-11-19, `fe037b1`): lint 오류 0 / format:check 통과 / typecheck 오류 0 / test 179파일 5601개 통과 / test:build·e2e는 6단계에서 실행
- [x] 1. 예제·meta — 예제 10개(`mixed-arithmetic`·`unary-builtins`·`increment`·`compare-number`·`compare-string`·`to-bigint`·`to-number`·`division`·`bitwise`·`sort`), `'use strict';` 접두 동일 출력(concept.test), 예제에 Symbol·`2n ** 64n`·`7n / 2n`·`2n ** 53n` 0건, tags에 "객체" 없음. 예제별 대조(배제 모델 → 출력 줄 / 예제 9로 설명 안 되는 줄): 1 "무조건 TypeError" → 2줄 `string:11` / 1·3줄, 2 "단항 +는 그대로" → 2줄, "내장 함수 전부 못 받음" → 4줄 `false false 1`, 3 "`x++` = `x = x + 1`" → 2줄 TypeError·3줄 `bigint 2`, 4 BigInt→Number → 2줄 `true false`, Number→BigInt → 1줄 `true true`, 5 문자열 비교 → 1줄, 문자열→Number → 2줄 `==`, 6 BigInt(Number(문자열)) → 4줄 `SyntaxError 1000`, 7 출력=저장 값 → 2줄, 8 제수 부호 나머지 → 1줄, 9 0 쪽 시프트 → 2줄 `-3 -2`, 32비트 → 3줄, 10 `a - b`에서 던짐 → 3·4줄. 모든 예제에 예제 9로 설명되지 않는 줄이 있다.
- [x] 2. content.mdx — 동작 원리 h3 8개, 예제·퀴즈 10개, 결과와 이유(예제별 설명, 연산 결과 표 27행, 흔한 오해 3개). 설계 이유 서술 없음(concept.test 검사). 메인 수정: 예제 10 설명의 `a - b` → `x - y`, "old 값" → "옛 값", meta simplification의 백틱 제거, goals의 "Number()의 변환 오류"를 "BigInt()의 변환 오류 … Number()로 바꿀 때의 반올림과 Infinity"로.
- [x] 3. concept.test.ts — 표 27행 평가 대조(하한 24), 원문 표 식 칸 금지 글자, `'use strict';` 접두, 퀴즈 정답, 탐침 2개, 메타 조건. 변조 실험(`-7n % 3n` 결과 칸 변경 → 실패 → 원복) 서브에이전트 수행.
- [x] 4. 기존 페이지 문구 — 4곳 6파일 계획 문장대로, related에 `bigint`. 대조: equality-operators "문자열·숫자·불리언 ==" → bigint 예제 4·5·표 `1n == true`, type-coercion "섞어 계산하거나 비교" → 예제 1·4·5, number-pitfalls 단순화 "비트 연산·asIntN·단항" → 예제 2·9, increment-decrement "BigInt의 증감" → 예제 3.
- [x] 5. 순서·등록 — `/ 69` 등 0건, pager number-pitfalls → bigint → date, a11y·build-output·responsive·helpers·content-guide 등록. 메인 수정: navigation "객체" 검색 순위 배열에서 39 이상 +1(44·46·47·58·65 → 45·47·48·59·66, 서브에이전트 누락).
- [x] 6. 전체 검증 — lint 0, format:check 통과, typecheck 0, test 180파일 5683개, test:build 556개, e2e navigation 16개 + `-g` 관련 60개 통과. 브라우저(dev 재시작, 375px·다크): pager `39 / 70`·이전 number-pitfalls·다음 date, 정답 확인 10개, 문서 폭 375, 표 영역 tabIndex 0, 식 칸 27개 화면 글자 = 원문, 3개 페이지 HTML에 `/concepts/bigint` 링크.
- 리뷰 1차(메인 + Opus 교차): Opus는 Critical/High 0·Medium 2·Low 7. 메인이 명세 정확성 기준(오개념 위험은 결과가 맞아도 높음)으로 재판정해 High 3건으로 올려 수정 — (1) 예제 5의 2번 줄 두 번째 식 `9007199254740993n > '9007199254740992'`가 어떤 틀린 모델도 배제하지 못함 → `9007199254740992n < '9007199254740993'`(문자열→Number 모델이면 false)로 바꾸고 본문·결과 절 수정(출력 `true true` 그대로), (2) "정수 리터럴 문법" → "명세의 StringIntegerLiteral 문법"과 소스 리터럴과의 차이(n 접미사·구분자 없음, 10진만 부호) 명시(본문·퀴즈 해설·표), (3) "0을 채운다"를 정수 부분 21자리 이하로 한정(더 크면 지수 표기, 탐침 추가). 규칙 위반 Low 3건도 수정 — increment-decrement 링크 범위(전위 `++`·`--`도 같은 규칙이라는 문장 + 탐침), Math를 simplifications에 추가, 흔한 오해 제목을 "BigInt와 Number를 비교할 때"로 한정. 재검증: bigint·examples·content-integrity·result-tables 1707개, lint 0, typecheck 0, format 통과, test:build 556개, e2e bigint 6개 통과.
  - Low(남김): `equality-operators` 문구와 bigint 도입부가 `==`의 유한 Number 한정(NaN·±∞는 false)을 밝히지 않음 / `content.mdx` 7행·표 1행 "`1n + 1`을 예제 9에서 보았다"(예제 9의 식은 `big + 1`) / `meta.ts` goals 2번째 문장의 모호함("ToNumber를 하는 함수에서 BigInt가 되는 경우"로 읽힐 수 있음)
- 사용자 검토 7건(2026-11-19) 반영: 7건 모두 명세 원문(BigInt::bitwiseNOT·leftShift·signedRightShift·bitwiseAND)과 실행(`[1n].sort(...)` 정상, `1n < Symbol()` TypeError, `BigInt('012')` 12n·`012n` SyntaxError, `BigInt(9007199254740993)` 9007199254740992n, `2n * '3'`·`1n - '1'` TypeError, `parseInt(9007199254740993n)` 9007199254740992)으로 확인한 뒤 문장만 수정, 표에 `1n - '1'` 행 추가(28행), meta Symbol 단순화에 관계 비교 추가, concept.test 탐침 6개 추가. 새 문장의 "정밀도"가 설계 이유 금지 검사에 걸려 "Number로 반올림됩니다"로 바꿈(검사는 유지). 재검증: bigint·examples·content-integrity·result-tables 1714개, lint 0, typecheck 0, format 통과, test:build 556개, e2e bigint 6개, dev 화면에서 표 28행·새 문장 확인.
- 사용자 재검토 1건(2026-11-19): 본문 "(아래 연산 결과 표)"가 표에 없는 `2n * '3'`까지 가리킴 → "(`1n - '1'`은 아래 연산 결과 표)"로 좁힘(`2n * '3'`은 concept.test 탐침으로 검증).

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 예제 10개, 퀴즈 10개, 연산 결과 표는 계획의 약 24행보다 많은 28행(사용자 검토로 `1n - '1'` 추가), 흔한 오해 3개, 기존 4개 페이지 문구, 39번째 삽입에 따른 순서·등록 테스트.
- 계획에 없던 출력을 예제에 더했다: 예제 2의 `Number.isNaN(1n)`·`parseInt(1n)`(내장 함수 일반화 방지), 예제 5의 `9007199254740992n < '9007199254740993'`(리뷰에서 원래 식이 증거가 아니라 교체), 예제 9의 `1n << 64n`·`1n & 1`, 예제 10의 `list[0] - list[1]`.
- 변경 이력: 사용자 검토 7건(문장·표·탐침)과 재검토 1건(표 참조 범위). 예제 출력은 리뷰 교체 1식 외에 바뀌지 않았다.
- 마무리 때 사용자 결정으로 `reviewedAt: '2026-11-19'`을 기록하면서 concept.test의 "reviewedAt은 null" 단언(구현 중 상태 확인용)을 지웠다.

### 코드 리뷰
- Opus 교차 리뷰는 Critical/High 0. 메인이 명세 정확성 기준으로 High 3(예제 5의 증거력, "정수 리터럴 문법" 용어, "0을 채운다"의 범위)으로 올려 수정하고, 규칙 위반 Low 3(증감 링크 범위, Math 단순화, 오해 제목)도 수정했다.
- 남긴 Low 3: `==`의 유한 Number 한정 미표기, "`1n + 1`을 예제 9에서 보았다"(예제 9는 `big + 1`), goals 2번째 문장의 모호함.

### 후속 작업
- [ ] (선택) 남긴 Low 3건 문장 정리.
- [ ] (선택) number-type·data-types의 "BigInt는 숫자의 함정 개념에서 다룹니다"에 bigint 병기(이번 사용자 결정으로 제외).
- [ ] 다음 범위 결정: 추가 게시글 로드맵 2의 5개가 모두 끝났다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 리뷰에서 Opus가 Medium으로 둔 두 지적(예제 5의 두 번째 식이 증거가 아님, "정수 리터럴 문법" 용어)과 Low의 "0을 채운다"를 High로 올려 사용자에게 묻지 않고 고쳤다 — 출력이 맞아도 독자가 틀린 규칙을 배우면 심각도가 높다는 기준. 고치지 않고 Medium으로 보고하는 대안은 오개념을 남긴다고 보았다.
- [Claude 판단] 재검토의 두 수정안 중 표에 `2n * '3'` 행을 더하는 대신 본문 괄호를 "(`1n - '1'`은 아래 연산 결과 표)"로 좁혔다 — `2n * '3'`은 이미 concept.test 탐침으로 실행 대조되므로 표를 늘리지 않았다.
- [Claude 판단] `parseInt` 문장의 "정밀도를 잃습니다"가 설계 이유 금지 검사(`/정밀도|잃지 않|때문에 설계/`)에 걸리자 검사를 풀지 않고 표현을 "Number로 반올림됩니다"로 바꿨다.
- [무검토 승인] Number로 바꾼 값의 출력 예로 2^64 대신 2^63을 쓴다 — 2^64는 17자리 최단 표기 후보가 셋이라 마지막 자리를 명세가 정하지 않고(비규범 Note를 따른 V8의 선택), 2^63은 16자리 후보가 하나라 출력 문자열이 명세로 정해진다(계획 Consensus HIGH).
- [무검토 승인] 결과가 BigInt인지가 요점인 줄은 `String()`과 함께 `typeof`를 출력한다 — `String()`만 쓰면 `2n`과 `2`가 같은 "2"로 보여 "Number로 바꿔 계산한다" 모델을 배제하지 못한다.
- [무검토 승인] 연산 결과 표는 JSX 표로 쓰고 concept.test가 식 칸을 실제로 평가한다. normalizeCell의 태그 제거가 `<` 이후를 지우므로 식 칸에 `<`·`<<`·`<=`를 쓰지 않고 작다 비교는 `>`로 뒤집으며, 금지 글자 검사는 정규화 전 원문에서 한다.
- 추가 주제 4개 모두, 표 + 퀴즈(시뮬레이터 없음), slug `bigint`, 기존 4곳 연결은 사용자가 골랐다. 사용자 검토 7건(정렬의 0~1개 경계, 비트 연산 근거, "비교는 undefined", 문자열 문법과 리터럴의 차이 방향 등)은 명세·실행으로 확인한 뒤 반영했다.

#### 배경지식
- ApplyStringOrNumericBinaryOperator: `+`이고 한쪽이 문자열이면 먼저 연결하고, 그 밖에는 두 피연산자를 ToNumeric으로 바꾼 뒤 타입이 다르면 TypeError. 한쪽을 다른 타입으로 바꾸는 단계가 없다. 단항 `+`는 ToNumber라 BigInt에서 던지고, 단항 `-`·`~`·`++`는 ToNumeric이라 된다.
- IsLessThan은 BigInt와 Number를 수학적 값으로 비교하고, 문자열은 StringToBigInt로 바꾼다. 비교할 수 없으면 undefined를 돌려주고 `<`·`>`·`<=`·`>=`는 모두 false가 된다(그래서 `>=`가 `<`의 반대가 아니다). IsLooselyEqual은 유한한 Number와 수학적 값으로 비교한다.
- BigInt(value)는 Number면 NumberToBigInt(정수 아니면 RangeError), 아니면 ToBigInt(undefined·null은 TypeError, 문자열은 StringIntegerLiteral 문법, 실패하면 SyntaxError). asIntN·asUintN은 ToBigInt를 바로 써서 Number 인수가 TypeError다.
- Number::toString은 같은 Number로 돌아오는 가장 짧은 자릿수를 고르고, 정수 부분이 21자리 이하면 0을 채운다. 출력 문자열과 저장된 값은 다를 수 있다.
- CompareArrayElements는 비교 함수의 반환값에 ToNumber를 하므로 BigInt를 돌려주는 `(x, y) => x - y`는 던진다. 요소가 0~1개면 비교 함수가 불리지 않는다.

#### 확인 질문
1. `x++`는 BigInt에서 되는데 `x += 1`은 왜 TypeError인가? `x = x + 1`과 `x++`는 어떤 단계에서 갈리는가?
   <details><summary>답</summary>후위 `++`는 ToNumeric으로 옛 값을 얻고 BigInt면 BigInt::add(옛 값, 1ℤ)를 해서 Number 1과 섞이지 않는다. `x += 1`과 `x = x + 1`은 ApplyStringOrNumericBinaryOperator에서 BigInt와 Number 1의 타입이 달라 던진다(계획 1절 3, 예제 3, content.mdx "증감과 복합 대입").</details>
2. 예제 7에서 2^64가 아니라 2^63을 쓴 이유는? 2^64를 쓰면 무엇이 문제인가?
   <details><summary>답</summary>2^64는 같은 Number로 돌아오는 17자리 후보가 셋(`…551000`·`…552000`·`…553000`)이라 출력의 마지막 자리가 명세로 정해지지 않고 비규범 Note를 따른 V8의 선택이다. 2^63은 16자리 후보가 `9223372036854776000` 하나라 출력이 명세로 정해진다(계획 1절 7, 변경 전 Consensus HIGH, meta simplifications).</details>
3. 예제 5의 두 번째 식을 `9007199254740993n > '9007199254740992'`에서 `9007199254740992n < '9007199254740993'`로 바꾼 이유는?
   <details><summary>답</summary>원래 식은 문자열을 Number로 바꾸는 모델, 문자열끼리 비교하는 모델, 올바른 모델(StringToBigInt) 모두에서 `true`라 증거가 아니었다. 새 식은 문자열을 Number로 바꾸면 `9007199254740992`가 되어 `false`, StringToBigInt면 `true`라 그 모델을 배제한다(구현 진행 리뷰 1차, content.mdx "비교와 ==는 수학적 값으로").</details>
4. 결과 표 식 칸에 `1n < 1.5` 대신 `1.5 > 1n`을 쓴 이유는? `<`를 쓰면 어떤 일이 생기나?
   <details><summary>답</summary>표 대조 helper의 normalizeCell이 `/<[^>]*>/g`로 태그를 지우므로 식 안의 `<`부터 다음 `>`(`</code>`)까지가 지워져 엉뚱한 식을 평가한다. 그래서 `<`·`<<`·`<=`는 표에 쓰지 않고, concept.test가 원문 표 블록에서 금지 글자를 검사한다(계획 1절 연산 결과표, `tests/helpers/result-tables.ts`).</details>
5. `[3n, 1n, 2n].sort((x, y) => x - y)`는 왜 던지고, 언제는 던지지 않는가?
   <details><summary>답</summary>`x - y`는 BigInt 뺄셈이라 되지만 CompareArrayElements가 반환값(BigInt)에 ToNumber를 해서 던진다. `Number(x - y)`로 감싸면 정렬된다. 요소가 0~1개면 비교 함수가 불리지 않아 던지지 않는다(예제 10, 사용자 검토 1번 반영).</details>
