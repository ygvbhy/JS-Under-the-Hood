# 관계 비교 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-24
- 기준: `main` @ `99a2eca`

## 0. 요약
- 목적: "null >= 0은 true인데 null == 0은 왜 false일까"를 묻는 `relational-comparison` 페이지를 추가한다(order 45, 학습 순서 8번째/80, ecmascript, category fundamentals). 명세의 관계 연산자 평가(IsLessThan, `<=`·`>=`는 결과가 true나 undefined면 false)로 null·undefined·NaN 비교, `<=`·`>=`의 정의, 범위 검사, 피연산자를 평가한 뒤 왼쪽부터 변환하는 순서를 Node 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 5개, 퀴즈 5개, 데이터 파일로 그리는 값 쌍 표 1개, 흔한 오해 2개, 시뮬레이터 없음)를 추가한다. type-coercion·equality-operators·bigint·to-primitive의 simplifications를 새 개념으로 연결한다. 8번째 이후 순위 +1 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: "`>=`는 `>` 또는 `==`", "`>=`는 `<`의 부정", "null은 falsy라서 0"이라는 틀린 모델을 본문이 심거나, 예제가 보이지 못하는 피연산자 뒤집기를 증명한 것처럼 쓸 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: HIGH 1·MEDIUM 6·LOW 3, Critic REVISE: MEDIUM 5·LOW 5. 메인이 normalizeCell 실행·모델 재계산·역방향 grep으로 재확인해 모두 반영했다. 예제 3·5와 표 방식을 바꿨다)
- 미확정: 없음

## 1. 요구사항
- 사용자 선택(2026-11-24): 범위 네 가지 모두 — (1) null·undefined·NaN 비교(필수), (2) `>=`·`<=`의 정의, (3) 범위 검사 실전 예, (4) 피연산자 변환 순서. 시각화는 표 + 퀴즈.
- 로드맵(`.claude/plans/concept-roadmap-extras-5.md` 1번): 제목 "관계 비교: null >= 0은 true인데 null == 0은 왜 false일까", order 45, ecmascript.
- 유지할 것(다시 쓰지 않고 링크): equality-operators의 `null == 0`이 false인 이유(`==`는 null을 바꾸지 않음, 본문 94줄·예제 4), type-coercion의 문자열끼리 비교(예제 5)와 ToNumber 결과(`examples/to-number.js`: +null 0, +undefined NaN, +'' 0, +' 12 ' 12).
- 제외: BigInt 비교(bigint), 문자열 코드 유닛 비교의 세부(type-coercion·array-method-pitfalls), 배열 등 객체의 ToPrimitive 결과와 힌트(to-primitive), `instanceof`·`in`, -0과 +0, document.all.

## 2. 사실과 추정
### 사실
- 명세(ECMAScript 2027 초안, https://tc39.es/ecma262/multipage/ ; 사본 scratchpad `rel/ao.html`, `rel/ex.html`, id는 따옴표 없는 `id=sec-...`):
  - 13.10.1 관계 연산자 평가(`sec-relational-operators-runtime-semantics-evaluation`): 두 피연산자를 차례로 평가(Evaluation, GetValue)한 뒤 `<`는 IsLessThan(leftValue, rightValue, true)이고 결과가 undefined면 false. `>`는 IsLessThan(rightValue, leftValue, false)이고 undefined면 false. `<=`는 IsLessThan(rightValue, leftValue, false)의 결과가 "either true or undefined"면 false, 아니면 true. `>=`는 IsLessThan(leftValue, rightValue, true)의 결과가 true나 undefined면 false, 아니면 true.
  - 7.2.12 IsLessThan(x, y, leftFirst)(`sec-islessthan`): 반환값은 true, false, undefined이고 undefined는 "indicates that the operands could not be coerced to comparable values of the same numeric type"(인용은 자르지 않는다). leftFirst가 true면 ToPrimitive(x, number) 다음 ToPrimitive(y, number), false면 y를 먼저 변환한다(NOTE "The order of evaluation needs to be reversed to preserve left to right evaluation"). 둘 다 String이면 코드 유닛 비교, 그 밖에는 ToNumeric 뒤 Number::lessThan 등.
  - 6.1.6.1.12 Number::lessThan: x나 y가 NaN이면 undefined(Critic이 tc39.es 원문에서 확인).
  - 7.2.13 IsLooselyEqual(`sec-islooselyequal`): 타입이 같으면 IsStrictlyEqual, null과 undefined는 서로 같고, null을 숫자로 바꾸는 단계가 없다. 그래서 null은 null·undefined와만 같다(document.all 제외). y가 Boolean이면 ToNumber(y)로 바꾸므로 `null == false`는 `null == 0`이 되어 false.
- 예제 출력(Node vm + util.format, sloppy·strict 동일, scratchpad `rel/ex2/*.js`, 8절 원문과 같음):
  - null-vs-zero.js → `false false true` / `true true false`
  - undefined-and-nan.js → `false false false false` / `false false false false`
  - le-ge-definition.js → `true false true` / `false false true`
  - range-check.js → `true false true true` / `true false true false`
  - conversion-order.js → `false abAB` / `true abAB`
- 틀린 모델 출력(scratchpad `rel/models2.mjs`, 예제 원문의 비교식을 `M.op(l, r)`로 명시 치환해 실제로 실행):
  - 예제 1: null 안 바꿈 `false false false / false false false`, `<=`·`>=`는 `<`·`>`이거나 `==` `false false false / true false false`, `==`도 null을 0으로 `false true true / true true true`. (`<`의 부정, null은 falsy라서 0, undefined도 0 모델은 정답과 같다 — 예제 2·3·4가 배제)
  - 예제 2: `<`의 부정 `false false true true / false false true true`, undefined도 0 `false false true true / false false false false`, NaN은 자기 자신과 같음(`<=`·`>=`가 true) `false false false false / false false false true`, null은 falsy라서 0(ToBoolean 뒤 숫자) `false false true true / true false false true`.
  - 예제 3: `<`·`>`이거나 `==` `false false true / false false true`, `<`의 부정 `true false true / true false true`, `==`도 null을 0으로 `true true true / false false true`.
  - 예제 4: null 안 바꿈 `false false true true / true false true false`, falsy는 0·truthy는 1 `true true true true / true true true true`, 문자열과 숫자는 비교하지 않음(모두 false) `true false false false / false false true false`, `<`의 부정 `true true true true / true true true false`.
  - 예제 5: 평가하자마자 변환(평가·변환 교차) `false aAbB / true aAbB`, `>`·`<=`는 오른쪽부터 변환 `false abBA / true abBA`.
  - 예제가 보이지 못하는 것: `>`·`<=`가 피연산자를 뒤집어 IsLessThan을 부른다는 것 자체(뒤집지 않고 왼쪽부터 비교하는 모델도 같은 출력). 본문은 뒤집기를 명세 인용으로만 쓰고, 예제 5는 "두 피연산자를 다 평가한 뒤 왼쪽부터 변환"이라는 결과만 보인다고 밝힌다.
- 표 파서: `tests/helpers/result-tables.ts:17` `normalizeCell`은 태그 제거를 먼저 해서 `<code>{'a < b'}</code>`가 `{'a`로 깨진다(Architect·Critic 실행). `{rows.map(` 표는 `extractTables`가 건너뛴다(`result-tables.ts:60-69`, 선례 `app/concepts/number-type/stored-values.ts` + `content.mdx:1,28`). content-guide 148줄: 데이터 파일 표는 그 개념의 concept.test에서 검증.
- 겹침(읽고 확인): `app/concepts/equality-operators/content.mdx:94-96`·예제 4(null-undefined.js)·예제 7(null-check.js), `app/concepts/type-coercion/content.mdx:164`(예제 5 compare.js)·`examples/to-number.js`, `app/concepts/bigint/content.mdx:23,27`(BigInt·NaN의 IsLessThan, "`>=`도 false").
- 역방향 연결 대상(simplifications):
  - `type-coercion/meta.ts:89` "명세에서 a > b는 피연산자 순서를 바꿔 IsLessThan(b, a)로 계산하지만…"
  - `type-coercion/meta.ts`의 "숫자로 바꾼 결과가 NaN이면 >, <는 모두 false가 되는데, 이 경우는 다루지 않습니다."
  - `type-coercion/meta.ts:94` "==(느슨한 동등 비교)의 변환과 <=, >=, 비트 연산자 등 다른 연산자는 다루지 않습니다." (`<=`·`>=` 부분만 떼어 연결, `==`·비트 연산자는 그대로)
  - `equality-operators/meta.ts:91` "<=, >= 같은 비교 연산자는 ==와 다른 규칙을 쓰며 다루지 않습니다."
  - `bigint/meta.ts:131` "a > b와 a <= b는 명세에서 IsLessThan의 인수 순서를 바꿔 계산하지만…"
  - `to-primitive/meta.ts:90` "`a > b`는 IsLessThan이 두 피연산자의 순서를 바꿔 계산하며…"
- 장 범위: 7장(관계 연산자)·9장(타입 변환). 함수 선언·호출(예제 4·5)은 function-definitions(95)·function-calls(100)가 뒤라서, 선례(short-circuit-evaluation(20) `{ label: '함수 호출' }`, switch-break-continue(80) `{ label: '함수 선언과 호출' }`)대로 slug 없는 선수 개념으로 둔다(`tests/content-integrity.test.ts:92-100`은 slug 있는 선수 개념의 order만 검사). valueOf(예제 5)는 to-primitive(305)를 related·simplifications로. 예제 3·4의 `||`·`&&`는 short-circuit-evaluation(20)을 선수 개념으로. 예제 5는 배열 없이 문자열 누적으로 쓴다.
- 학습 순서: order 40 equality-operators(7번째)와 50 number-type 사이 → 8번째/80, number-type부터 +1. 현재 79개. 고칠 곳(Architect 확인): `app/lib/concepts.test.ts:104,111-112`(79→80)·`:119` hoisting position 16→17, `ConceptPager.test.tsx:18,28`, `tests/e2e/responsive.spec.ts`(article 80), `navigation.spec.ts`(카드 수 80, `80번째`, "객체" 순위 목록 중 '4'만 그대로 두고 나머지 +1, `학습 순서 N / 79`는 N≥8이면 N+1·분모 80). pager 이웃 검사는 새 개념 주변에 없다. "객체" 검색 결과 수는 19 유지(새 개념 meta에 "객체"를 넣지 않음).

### 추정
- 없음

## 3. 구현 전략
- math·automatic-semicolon-insertion 구조(ecmascript, 표+퀴즈, 모델 실행 오답)를 따른다.
- 퀴즈 오답: ASI식 `swap`으로 예제 원문의 비교식을 `M.op(l, r)`로 명시 치환하고(치환 횟수 단언, 치환 뒤 비교 연산자가 남지 않음 단언), vm 샌드박스에 모델 `M`을 넣어 실행한다. `M`이 실제 연산이면 출력이 expectedOutput과 같아야 한다(치환이 의미를 보존한다는 대조). 예제 5는 `M.gt(() => val('a', 1), () => val('b', 2))`처럼 썽크로 치환해 모델이 평가·변환 순서를 정하게 한다(실제: 둘 다 평가 뒤 왼쪽부터 `+`, 교차: 평가하자마자 `+`, 오른쪽 먼저: 둘 다 평가 뒤 오른쪽부터 `+`). 모델 출력은 하드코딩 단언하고 정답과 달라야 한다.
- 값 쌍 표: 데이터 파일 `pairs.ts`(피연산자 소스 문자열과 다섯 연산 결과 하드코딩)를 `{pairs.map(`으로 그린다. concept.test가 소스를 `runInNewContext`로 평가해 칸마다 대조한다. 머리 `<th>`의 `a < b`는 JSX 문자열로 쓴다(파서 대상 아님).
- 본문은 명세 단계를 인용으로 설명하고, 예제가 보이는 범위를 밝힌다. 예제 3은 "정의라면 모든 줄에서 첫째 열과 같아야 한다"는 구조로 두 후보 정의를 나란히 놓는다.
- 버린 대안: 단계 시뮬레이터(사용자 선택), `[a, op, b]` 미러 목록(원문과 같은 계산임을 보장하지 못함, Architect), `<code>` 식 표(normalizeCell 함정), 배열 `push`/`join` 기록(27장 전제), 배열 피연산자(`[2] > 1`, ToPrimitive 결과가 뒤 개념).

## 4. 변경 파일
- 추가 `app/concepts/relational-comparison/`: meta.ts, content.mdx, route.tsx, concept.test.ts, pairs.ts, examples/{null-vs-zero,undefined-and-nan,le-ge-definition,range-check,conversion-order}.js
- 수정(연결): `type-coercion/meta.ts`(simplifications 세 문장, related), `equality-operators/meta.ts`(simplifications, related), `bigint/meta.ts`(simplifications 131, related), `to-primitive/meta.ts`(simplifications 90, related). reviewedAt은 바꾸지 않는다. bigint 본문 23·27줄은 "별도 개념" 표현이 아니므로 그대로 둔다.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(경로 목록).
- 문서: 이 계획, finalize 때 `concept-roadmap-extras-5.md`(1번 상태·진행 기록. 로드맵 문서는 첫 커밋에 포함).
- 변경하지 않음: 공통 코드(`normalizeCell` 포함), equality-operators·type-coercion 본문.

## 5. 위험 요소
- "`<=`·`>=`는 `<`·`>`이거나 `==`" → 예제 1(`null >= 0` true인데 `null > 0`·`null == 0` false)과 예제 3 1번 줄. "`>=`는 `<`의 부정" → 예제 2와 예제 3 2번 줄(NaN). "null은 falsy라서 0" → 예제 2(`undefined >= 0` false)·예제 4(`inRange('abc')` false). 흔한 오해 2개로도 다룬다.
- 피연산자 뒤집기를 예제가 보인다고 쓰기 → 3절 한정 문구(단계 2 완료 조건).
- 표 칸의 `<` → 데이터 파일 표, concept.test에 "원문 표 블록(map 밖)에 `<code>{'… < …'}` 없음" 단언.
- 장 범위(함수·valueOf·`||`) → slug 없는 선수 개념, short-circuit-evaluation 선수 개념, simplifications.
- 순서 테스트(79→80, 8 이상 +1, hoisting position) → 단계 4 grep·navigation e2e.
- "객체"가 meta에 들어가 검색 결과가 바뀜 → `filterConcepts([concept], '객체')` 빈 배열 단언.

## 6. 검증 방법
- 정적: lint, format:check, typecheck, `npm test`, `npm run test:build`.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "relational-comparison|관계 비교|홈 학습 순서 보기"`(a11y 케이스 이름 '개념 페이지: 관계 비교').
- 브라우저(dev 서버 재시작 후): /concepts/relational-comparison에서 학습 순서 8 / 80·이전 equality-operators·다음 number-type, 값 쌍 표 8행, 퀴즈 5개와 정답 피드백, 375px 가로 스크롤 없음, 콘솔 오류 없음, type-coercion·equality-operators 페이지의 simplifications 문구 렌더.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 예제·데이터 파일과 meta
- 대상: `app/concepts/relational-comparison/examples/*.js`, `pairs.ts`, `meta.ts`
- 변경: 예제 5개를 아래 원문 그대로(scratchpad `rel/ex2/`와 바이트 동일) 만든다.
  - null-vs-zero.js
    ```js
    console.log(null > 0, null == 0, null >= 0);
    console.log(null < 1, null <= 0, null == false);
    ```
  - undefined-and-nan.js
    ```js
    console.log(undefined > 0, undefined < 0, undefined >= 0, undefined <= 0);
    console.log(NaN < 1, NaN > 1, NaN >= 1, NaN <= NaN);
    ```
  - le-ge-definition.js
    ```js
    var a = null, b = 0;
    console.log(a <= b, a < b || a == b, !(a > b));
    var c = NaN, d = 1;
    console.log(c >= d, c > d || c == d, !(c < d));
    ```
  - range-check.js
    ```js
    function inRange(v) {
      return v >= 0 && v <= 10;
    }
    console.log(inRange(null), inRange(undefined), inRange(''), inRange(' '));
    console.log(inRange('5'), inRange('abc'), inRange(false), inRange(11));
    ```
  - conversion-order.js
    ```js
    var log = '';
    function val(name, n) {
      log += name;
      return { valueOf: function () { log += name.toUpperCase(); return n; } };
    }
    console.log(val('a', 1) > val('b', 2), log);
    log = '';
    console.log(val('a', 1) <= val('b', 2), log);
    ```
  - pairs.ts: 행 8개 — (null, 0), (undefined, 0), (NaN, 1), ('', 0), (' ', 0), ('abc', 1), (false, 0), (null, undefined). 각 행에 피연산자 소스 문자열(`"null"`, `"' '"` 등)과 `<`·`>`·`<=`·`>=`·`==` 결과(불리언)를 하드코딩.
  - meta: slug 'relational-comparison', title '관계 비교: null >= 0은 true인데 null == 0은 왜 false일까', summary ≤160자(조건 포함, "객체" 금지), category 'fundamentals', order 45, tags(관계 연산자, 비교 연산자, IsLessThan, null, undefined, NaN, >=, <= 등), goals 4개(범위 네 가지), prerequisites(`{ label: '암묵적 타입 변환', slug: 'type-coercion' }`, `{ label: '동등 비교', slug: 'equality-operators' }`, `{ label: '단축 평가', slug: 'short-circuit-evaluation' }`, `{ label: '함수 선언과 호출' }`(slug 없음)) — label은 각 페이지 실제 표기 확인, related(to-primitive, function-definitions, function-calls, number-type, bigint, array-method-pitfalls), examples(id = 파일 이름, runtime 'ecmascript'), reviewedAt null.
  - simplifications(최소): 예제는 sloppy·strict 출력이 같고 console은 호스트 API / 명세의 GetValue와 `?`(완료 처리)는 생략하고 ToNumeric을 "숫자로 바꾼다"로 줄여 말함 / IsLessThan의 BigInt·문자열 분기는 BigInt 개념·암묵적 타입 변환 개념에서 다룸 / 예제 4·5의 함수 선언과 호출은 값을 여러 번 검사하려는 용도이며 함수 정의는 함수를 정의하는 방법 개념, 호출은 함수 호출 개념에서 다룸 / 예제 5의 valueOf는 숫자로 바꿀 때 불린다는 것만 전제하고 그 과정(힌트, OrdinaryToPrimitive)은 객체를 원시 값으로 개념에서 다룸 / -0과 +0, document.all은 다루지 않음.
  - references: 명세 sec-relational-operators-runtime-semantics-evaluation, sec-islessthan, sec-islooselyequal, Number::lessThan(앵커는 원문에서 확인), MDN 비교 연산자.
- 완료 조건: 예제 출력 = expectedOutput(sloppy·strict, `npm test -- tests/examples.test.ts`), 예제가 scratchpad 원본과 `cmp` 동일, summary ≤160자, 명세 앵커가 분할 페이지에 존재(curl+grep), MDN 200.
### 2. 본문
- 대상: `content.mdx`
- 변경:
  - 첫 문단: 질문 + 다루는 것 + `null == 0`은 equality-operators, 문자열끼리 비교는 type-coercion 링크.
  - 동작 원리 h3 4개: ① `<`는 IsLessThan으로 두 값을 숫자로 바꿔 비교(null→0, undefined→NaN, 문자열·불리언), NaN이면 undefined → false ② `>`·`<=`는 명세에서 피연산자를 뒤집어 부르고 `<=`·`>=`는 결과가 true나 undefined면 false(명세 인용, "`<`·`>`이거나 `==`"도 "단순 부정"도 아님) ③ 범위 검사는 타입을 걸러 주지 않는다(null·''·' '·false 통과, undefined·'abc' 걸림) ④ 두 피연산자를 평가한 뒤 왼쪽부터 변환(뒤집어도 leftFirst로 순서를 맞춤 — 뒤집기 자체는 예제로 보이지 않는다고 밝힘, valueOf는 to-primitive 링크).
  - 예제 5개 + 퀴즈 5개(아래 선택지를 이 순서로):
    - 퀴즈 1(예제 1 전체): ['false false false / false false false', 'false false false / true false false', 'false false true / true true false', 'false true true / true true true'], answer 2.
    - 퀴즈 2(예제 2 전체): ['false false false false / false false false false', 'false false true true / false false true true', 'false false true true / false false false false', 'false false false false / false false false true'], answer 0.
    - 퀴즈 3(예제 3 전체): ['false false true / false false true', 'true false true / true false true', 'true true true / false false true', 'true false true / false false true'], answer 3.
    - 퀴즈 4(예제 4 전체): ['false false true true / true false true false', 'true false true true / true false true false', 'true true true true / true true true true', 'true false false false / false false true false'], answer 1.
    - 퀴즈 5(예제 5 전체): ['false aAbB / true aAbB', 'false abBA / true abBA', 'false abAB / true abAB'], answer 2.
    - explanation은 정답 이유와 오답 모델 하나 이상을 짚는다.
  - 결과와 이유: 예제별 h3(예제 1~5, 줄마다 배제한 모델), 값 쌍 표(pairs.map, `overflow-x-auto` 래퍼, 8행 × 피연산자 2열 + 연산 5열; 표의 새 정보는 (null, undefined) 행 — `==` true인데 관계 연산은 모두 false), 예제 2와 예제 1의 대비(`null <= 0` true vs `undefined <= 0` false) 명시.
  - 흔한 오해 2개: "`a >= b`는 `a > b || a == b`다", "null은 falsy라서 비교에서 0이 된다"(falsy라서가 아니라 ToNumber(null)이 0이라서, undefined는 falsy인데 NaN).
- 주의: 3절 한정 문구. 독자용 본문에 '테스트' 금지. 끼운 문장 뒤 지시어 재확인.
- 완료 조건: 필수 h2 3개, 퀴즈 5개가 위 선택지·answer와 같음, 본문에 "예제가 뒤집기를 보인다"는 주장 없음, `npm test`(content-integrity·result-tables)·`npm run test:build` 통과.
### 3. concept.test와 빌드 등록
- 대상: `concept.test.ts`, `tests/build/build-output.test.ts`
- 변경: 'use strict' 접두 검사 / swap 치환 + 모델 `M` 실행(2절 모델 전부, 하드코딩 출력, 정답과 다름, 실제 연산 `M`이면 expectedOutput과 같음, 치환 뒤 원문 비교 연산자가 남지 않음) / 퀴즈 choices·answer가 정답·모델 출력과 같음 / pairs.ts 칸마다 실제 평가 / 원문 표 블록(map 밖)에 `<code>{'… < …'}` 없음 / 예제 파일 단언(배열·`push`·`join` 없음, 예제 5는 문자열 누적) / meta(summary 길이, slug 있는 선수 개념 order < 45, `filterConcepts([concept], '객체')` 빈 배열). build-output에 '프리렌더 (relational-comparison)' 블록(표 region, 퀴즈 `<details>`, HTML의 `a &lt; b` 이스케이프 고려).
- 완료 조건: 퀴즈 answer·pairs 칸을 바꾸면 실패(변이 검사 후 원복), `npm test` 통과.
### 4. 연결과 순서 테스트
- 대상: 2절 역방향 연결 대상 6문장(type-coercion 3, equality-operators 1, bigint 1, to-primitive 1)과 각 related, 순서 테스트 묶음, content-guide.
- 변경: 각 문장에 "관계 비교 개념에서 다룹니다"를 붙이거나 그 부분만 바꾼다(type-coercion 94줄은 `<=`·`>=`만 떼고 `==`·비트 연산자는 "다루지 않습니다" 유지). 순서 테스트는 2절 목록대로.
- 완료 조건: 관련 파일 79 grep 0건(정당한 숫자 제외), navigation e2e 통과, 연결 문장의 하위 주제가 새 본문에 실제로 있음.
### 5. 전체 검증
- AGENTS.md 검증 순서 + 6절 e2e + 브라우저 시나리오.

## 변경 이력
- 2026-11-26 (사용자 검토): 다음을 고친다. 사용자 요청을 그대로 반영하는 수정이라 재승인 없이 진행한다. 영향 단계 1·2.
  - [중간] valueOf 호출을 "숫자로 바뀜"으로 쓴 곳(goals 4, 변환 순서 절 끝, 예제 5 결과·퀴즈 해설, simplifications 2곳, 도입부)을 "원시 값으로 바뀜"으로 고치고, 두 값이 모두 원시 값이 된 뒤에야 둘 다 문자열인지 보고 아니면 그때 숫자로 바꾼다는 문장을 더한다. 탐침: valueOf가 '10'·'9'를 돌려주면 `<`가 true(문자열 비교), 왼쪽 valueOf가 Symbol을 돌려줘도 오른쪽 valueOf가 불린 뒤 TypeError(기록 `LR`).
  - [낮음] "결과가 없다"를 첫 등장에서 정의(IsLessThan이 undefined, 연산자 값은 false), "어떤 비교에서도"를 "어떤 관계 비교에서도"로(NaN != NaN은 true), summary 표현.
  - [낮음] simplifications에 Symbol은 관계 비교에서 TypeError라 통과/걸러짐은 예외가 나지 않는 값에 한한다는 문장(탐침 `inRange(Symbol())` TypeError).
  - [낮음] 도입부 "관계 연산자(<, >, <=, >=)" → "관계 연산자 가운데 크기를 비교하는 넷", simplifications에 instanceof·in은 같은 문법 규칙이지만 다루지 않음.
  - [낮음] "`&&`는 왼쪽이 false이면" → "왼쪽 값이 falsy이면".
- 2026-11-26 (사용자 재검토): summary의 "(undefined)"를 "IsLessThan이 undefined를 돌려줘"로 고치고, goals 4를 예제로 확인되는 범위("왼쪽 값부터 원시 값으로 바꾼다는 순서")로 줄인다. 영향 단계 1.

## 구현 진행

- baseline (2026-11-24, `99a2eca`): lint 통과, format:check 통과, typecheck 통과, npm test 193파일 6345개 통과, test:build 628개 통과(같은 세션에서 99a2eca 커밋 직전 실행값, 이후 코드 변경 없음)
- [x] 1·2·3. 새 개념 폴더(예제 5개·pairs.ts·meta·본문·route·concept.test 68개)와 build-output 등록 — Sonnet 구현. 메인 확인: 예제 5개가 scratchpad 원본과 바이트 동일(cmp), 본문 전체 정독 후 두 곳 직접 수정(예제 3 결과의 "두 연산자가 자리를 바꾼 IsLessThan으로 계산" → `<=`만 자리를 바꾸고 `>=`는 바꾸지 않음, 예제 4 결과의 typeof 언급에 typeof 연산자 링크·related·simplifications — order 60이 뒤). Sonnet 보고: 변이 검사(퀴즈 answer·pairs 칸 변경 시 4개 실패 후 원복), 명세 앵커 4개·MDN 3개 확인. 명세 문구는 원문 인용 대신 한국어로 풀어 씀.
- [x] 4. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(type-coercion 세 문장·equality-operators·bigint·to-primitive simplifications에 "관계 비교 개념에서 다룹니다", related 추가, 80·8 이상 +1·hoisting position 17·"객체" 순위 4 외 +1, 새 pager 블록 8 / 80). type-coercion의 == 부분은 "다루지 않습니다" 유지(그 페이지가 equality-operators를 연결하지 않음).
- [x] 5. 전체 검증 (2026-11-24) — lint·format:check·typecheck 통과, npm test 194파일 6431개 통과(baseline 6345), test:build 635개 통과(baseline 628), e2e navigation 16개·관련 8개 통과. 브라우저(dev 5173 재시작): 학습 순서 8 / 80·이전 equality-operators·다음 number-type, 값 쌍 표 8행과 머리 `a < b` 렌더, 퀴즈 5개, 예제 3 퀴즈 정답 선택 후 "정답입니다.", 375px 가로 스크롤 없음(표 영역 343=343), 콘솔 오류 없음.
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토, 2026-11-24): 메인이 구현 확인 중 고친 것 2건은 위 단계 기록. Opus HIGH 4·MEDIUM 1·LOW 5 → 모두 고침(메인 직접, 본문·meta·to-primitive meta·concept.test).
  - HIGH: 범위 검사 설명이 `&&` 단축과 어긋남(`inRange(undefined)`는 `v <= 10`을 평가하지 않음 — 탐침 기록 `ge,ge`), "걸러지는 기준은 NaN이냐" 과일반화(11도 걸러짐 → 0~10 범위에 드느냐), 예제 3이 명세 정의만 남긴다는 과잉 주장(섞인 모델 `<=`는 부정·`>=`는 `>`이거나 `==`도 예제 3을 맞힘 → 예제 1·2가 가려낸다고 쓰고 concept.test에 섞인 모델 단언 추가), 문자열 분기를 원래 피연산자 기준으로 쓴 것(`[10] < [9]` true — IsLessThan은 ToPrimitive 뒤 둘 다 문자열이면 문자열 비교, 본문·제목·simplifications 수정).
  - MEDIUM: to-primitive 역방향 문장 "IsLessThan이 순서를 바꿔" → "명세에서 a > b는 피연산자 순서를 바꿔 IsLessThan(b, a, false)로"(순서를 바꾸는 쪽은 관계 연산자 평가).
  - LOW: type-coercion "표" → "표와 그 아래 설명", 자리 바꿈은 원리적으로 실행 결과로 구별되지 않음(본문·simplifications), "따라서 … 숫자로 인정" → "정리하면 … 통과", "새로 얻는 정보는 주로 마지막 행과 == 열", "이 줄은" → "이 예제는".
  - 재검증: lint·format:check·typecheck 통과, npm test 194파일 6433개, test:build 635개, e2e navigation 16개·관련 8개 통과. dev 서버에서 바뀐 문장 8곳 렌더·옛 문구 3개 0건, 콘솔 오류 없음. 수정 범위 재리뷰: 새 High 없음.
- 사용자 검토(2026-11-26): 중간 1·낮음 4 모두 반영(변경 이력). 메인 탐침(node): valueOf가 '10'·'9'면 `<` true, 왼쪽 valueOf가 Symbol이면 기록 `LR` 뒤 TypeError, `inRange(Symbol())` TypeError, `NaN != NaN` true, `0 && …`은 오른쪽 미평가. 수정은 메인이 직접(본문 8곳, meta summary(152자)·goals 4·simplifications 2곳 수정과 2문장 추가).
  - 재검증: lint·format:check·typecheck 통과, npm test 194파일 6433개, test:build 635개, e2e navigation 16개·관련 8개 통과. dev 서버에서 바뀐 문장 8곳 렌더·옛 문구 0건, 콘솔 오류 없음.
- 사용자 재검토(2026-11-26): 낮음 2건 반영(변경 이력). summary 158자. 재검증: format:check·typecheck 통과, vitest(개념·content-integrity) 1114개, test:build 635개 통과, dev 서버에서 새 요약·목표 렌더와 옛 문구 0건.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(ecmascript 예제 5개·퀴즈 5개·데이터 파일 값 쌍 표 8행·흔한 오해 2개, 시뮬레이터 없음, order 45·학습 순서 8/80, category fundamentals, 네 페이지 simplifications 연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것: 메인 확인으로 `>=`는 자리를 바꾸지 않는다는 서술과 typeof의 장 범위 처리를 고쳤다. Opus 리뷰로 `&&` 단축, 범위 기준(0~10), 섞인 정의 모델(예제 1·2가 가려냄, 테스트 추가), 원시 값으로 바꾼 뒤의 문자열 분기, to-primitive 원문을 고쳤다. 사용자 검토 두 차례로 valueOf를 "원시 값으로 바뀜"으로, "결과가 없다" 정의, Symbol TypeError와 instanceof·in 범위, `&&`의 falsy, 요약의 undefined 주어, 목표 4의 범위를 고쳤다. reviewedAt은 사용자 결정으로 2026-11-26을 기록했고, 연결한 네 페이지는 그대로 뒀다.

### 코드 리뷰
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토): 메인 2건, Opus HIGH 4·MEDIUM 1·LOW 5를 모두 고쳤다. 사용자 검토(중간 1·낮음 4)와 재검토(낮음 2)도 모두 반영했다.
- 고치지 않고 남긴 항목: 없음.

### 후속 작업
- [ ] 없음. 로드맵 5의 다음 개념(2번 switch와 let)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 값 쌍 표를 `<code>` 식 표가 아니라 데이터 파일(`pairs.ts`)을 `{pairs.map(`으로 그렸다 — 공통 헬퍼 `normalizeCell`이 태그를 먼저 지워 `<code>{'a < b'}</code>`가 `{'a`로 깨지기 때문이다(Architect·Critic 지적). 버린 대안: 공통 헬퍼 수정(공통 코드라 전체 e2e 필요).
- [Claude 판단] 예제 5는 평가할 때 소문자, 변환할 때 대문자를 기록한다 — 처음 설계(배열에 이름만 기록)는 "평가하자마자 변환" 모델과 출력이 같았다. 지금 출력 `abAB`는 교차 모델 `aAbB`와 오른쪽 먼저 모델 `abBA`를 배제한다. 배열 대신 문자열 누적으로 27장 전제를 피했다.
- [Claude 판단] `>`·`<=`의 피연산자 뒤집기는 명세 정의로만 쓰고 예제가 보인다고 쓰지 않았다 — leftFirst로 변환 순서를 보정하므로 뒤집지 않는 모델과 실행 결과로 구별되지 않는다(Architect·Opus 지적).
- [Claude 판단] 퀴즈 오답은 예제 원문의 비교식을 `M.op(l, r)`로 치환해 모델로 실제 실행한 출력이다 — 실제 연산을 넣으면 expectedOutput과 같다는 대조로 치환이 의미를 보존함을 보인다(ASI식 swap, Architect 제안).
- [Claude 판단] 함수 선언(예제 4·5)은 slug 없는 선수 개념 "함수 선언과 호출"로 두었다 — function-definitions(95)가 order 45보다 뒤라서 slug를 넣으면 content-integrity가 실패한다(short-circuit-evaluation·switch-break-continue 선례).
- [무검토 승인] 역방향 연결을 6곳(type-coercion 3, equality-operators, bigint, to-primitive)으로 늘렸다 — 그중 to-primitive 원문은 "IsLessThan이 순서를 바꿔"라는 부정확한 표현이라 리뷰에서 원문도 고쳤다.
- 다룰 범위 네 가지와 표+퀴즈, valueOf "원시 값으로 바뀜", "결과가 없다" 정의, Symbol·instanceof 범위, `&&` falsy, 요약 주어, 목표 4 범위 — 사용자가 고르거나 검토로 고쳤다.

#### 배경지식
- 13.10.1: `<`와 `>=`는 IsLessThan(왼쪽, 오른쪽, true), `>`와 `<=`는 IsLessThan(오른쪽, 왼쪽, false). `<`·`>`는 결과가 undefined면 false, `<=`·`>=`는 결과가 true나 undefined면 false. 그래서 `>=`는 IsLessThan이 false일 때만 true다.
- IsLessThan은 leftFirst에 따라 왼쪽부터 ToPrimitive(number)를 하고, 둘 다 문자열이면 코드 유닛 비교, 아니면 ToNumeric 뒤 Number::lessThan(NaN이면 undefined).
- ToNumber: null→0, undefined→NaN, ''·' '→0, 'abc'→NaN, false→0. IsLooselyEqual은 null을 숫자로 바꾸지 않아 null은 null·undefined와만 같다.
- `&&`는 왼쪽 값이 falsy면 오른쪽을 평가하지 않는다. 그래서 `inRange(undefined)`는 `v <= 10`을 평가하지 않는다.

#### 확인 질문
1. `null >= 0`이 true인데 `null > 0 || null == 0`이 false인 이유를 명세 정의로 설명하면?
   <details><summary>답</summary>`>=`는 IsLessThan(null, 0)이 false일 때 true다. ToNumber(null)은 0이라 0 < 0이 false → true. `==`는 null을 숫자로 바꾸지 않아 false이고, `null > 0`은 0 > 0이라 false(content.mdx `<=`·`>=` 절, 예제 1).</details>
2. `a >= b`를 `!(a < b)`로 바꾸면 어떤 입력에서 결과가 달라지는가?
   <details><summary>답</summary>NaN이 낄 때. IsLessThan이 undefined를 돌려줘 `a < b`는 false지만 `a >= b`도 false다. `!(a < b)`는 true가 된다(예제 2·3, `NaN >= 1`).</details>
3. 예제 3만으로 배제하지 못하는 정의 모델은 무엇이고, 무엇이 그것을 가려내는가?
   <details><summary>답</summary>`<=`는 `>`의 부정, `>=`는 `>`이거나 `==`인 섞인 모델. 예제 3은 1번 줄에서 `<=`만, 2번 줄에서 `>=`만 대조하기 때문이다. 예제 1의 `null >= 0`(섞인 모델은 false)과 예제 2의 `undefined <= 0`(섞인 모델은 true)이 가려낸다(Opus 지적, concept.test 섞인 정의 모델).</details>
4. 예제 5의 출력 `abAB`가 보이는 것과 보이지 않는 것은?
   <details><summary>답</summary>두 피연산자를 모두 평가한 뒤(ab) 왼쪽부터 원시 값으로 바꾼다(AB)는 것은 보인다. `>`·`<=`가 명세에서 자리를 바꿔 IsLessThan을 부른다는 것은 leftFirst 보정 때문에 실행 결과로 구별되지 않는다(content.mdx 변환 순서 절).</details>
5. 값 쌍 표를 `<code>{'a < b'}</code>` 칸으로 쓰지 않은 이유는?
   <details><summary>답</summary>표 검증 헬퍼 normalizeCell이 태그를 먼저 지워 `< b'}</code>`까지 태그로 보고 삭제한다. 데이터 파일을 map으로 그리면 파서가 건너뛰고 concept.test가 칸을 직접 평가한다(계획 2절 표 파서).</details>
