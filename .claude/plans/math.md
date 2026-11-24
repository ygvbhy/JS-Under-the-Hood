# Math 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-24
- 기준: `main` @ `838d206`

## 0. 요약
- 목적: "Math.max()는 왜 -Infinity일까"를 묻는 `math` 페이지를 추가한다(order 278, 학습 순서 45번째/79, ecmascript, category fundamentals). 명세의 Math.max·min(인수마다 ToNumber, -∞/+∞에서 시작, NaN이면 NaN, +0과 -0 특례)과 floor·ceil·trunc·round의 음수와 -0 구간을 Node 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 4개, 퀴즈 4개, 표 2개, 흔한 오해 2개, 시뮬레이터 없음)를 추가한다. bigint 본문·simplifications와 number-pitfalls 본문을 새 페이지로 연결한다. 45번째 이후 순위 +1 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: 배열 인수·스프레드(spread-destructuring), 빈 배열 reduce(array-method-pitfalls), 가운데 규칙(number-pitfalls)과 겹치거나, 명세에 없는 의도("항등원이라서")와 예제가 증명하지 못한 단계 순서를 사실처럼 쓸 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: HIGH 2·MEDIUM 2·LOW 4, Critic REVISE: HIGH 1·MEDIUM 5·LOW 4. 메인이 근거를 grep과 모델 실행으로 재확인해 모두 반영했다. 예제 1·2·3을 고쳐 다시 실행했다)
- 미확정: 없음

## 1. 요구사항
- 사용자 선택(2026-11-24): 범위 네 가지 모두 — (1) 인수 없는 max·min(필수), (2) NaN과 ToNumber 순서, (3) +0과 -0, (4) 정수 만드는 함수와 음수. 시각화는 표 + 퀴즈.
- 로드맵(`.claude/plans/concept-roadmap-extras-4.md` 5번): 제목 "Math: Math.max()는 왜 -Infinity일까", order 278(Date 뒤, 사용자 확정), ecmascript.
- 유지할 것(다시 쓰지 않고 링크): spread-destructuring의 `Math.max(nums)`(배열 → 문자열 → NaN, `[7]`→7)와 스프레드, array-method-pitfalls의 빈 배열 reduce(초기값 없으면 TypeError), number-pitfalls의 `Math.round` 가운데 규칙과 `0.49999999999999994`, equality-operators의 `===`·`Object.is`와 -0.
- 로드맵 5번 "남은 범위" 중 배열 인수 결과(`[2]`→2, `[1, 2]`→NaN)와 `Math.max(...[])`는 spread-destructuring이 이미 다뤄 이 페이지에서 뺀다(빈 배열은 apply로 보임). finalize 때 로드맵 표에 이 결정을 적는다.
- 제외: Math.random 값, 근삿값 함수(sin·pow 등, 명세가 정밀도를 정하지 않음), Math.sumPrecise, Math 상수, 비트 연산(`x | 0`), 큰 인수 목록의 한계, Math 객체가 함수가 아니라는 성질(예제 없음, new-operator가 Math.max의 [[Construct]]만 다룸).

## 2. 사실과 추정
### 사실
- 명세(ECMAScript 2027 초안, https://tc39.es/ecma262/multipage/numbers-and-dates.html, 사본 scratchpad `math/nd.html`, id는 따옴표 없는 `id=sec-math.max` 형식):
  - Math.max(...args): "Let coerced be a new empty List. For each element arg of args, do Let n be ? ToNumber(arg). Append n to coerced. Let highest be -∞𝔽. For each element number of coerced, do If number is NaN, return NaN. If number is +0𝔽 and highest is -0𝔽, set highest to +0𝔽. If number > highest, set highest to number. Return highest." Note: "+0𝔽 is considered to be larger than -0𝔽". Math.min은 대칭(+∞에서 시작, "If number is -0𝔽 and lowest is +0𝔽, set lowest to -0𝔽").
  - Math.round: 유한하지 않거나 정수면 n, `n < 0.5 and n > +0`이면 +0, `n < -0 and n ≥ -0.5`이면 -0, 아니면 가장 가까운 정수(동률이면 +∞ 쪽). NOTE 2: x가 -0이거나 -0.5 이상 0 미만이면 round는 -0, `Math.floor(x + 0.5)`는 +0.
  - Math.floor: 0이 아닌 유한수가 아니면 n, `0 < n < 1`이면 +0, 정수면 n, 아니면 n 이하 최대 정수. Math.ceil: `-1 < n < -0`이면 -0, 아니면 n 이상 최소 정수. Math.trunc: `0 < n < 1`이면 +0, `-1 < n < -0`이면 -0, 아니면 +0 쪽 가장 가까운 정수.
  - 명세의 Math 절은 -∞에서 시작하는 이유를 적지 않는다.
- 예제 출력(Node vm + util.format, sloppy·strict 동일, scratchpad `math/ex2/*.js`, 8절 원문과 같음):
  - empty-args.js → `-Infinity Infinity` / `-Infinity Infinity` / `true`
  - nan-and-coercion.js → `0 NaN 10 number` / `NaN a,b,c` / `RangeError a,t`
  - signed-zero.js → `0 0` / `-0 -0` / `-0 -0 0 0` / `-0 0`
  - to-integer.js → `-1.5 -2 -1 -1 -1` / `-0.5 -1 -0 -0 -0` / `-0.4 -1 -0 -0 -0` / `0.4 0 1 0 0` / `1.5 1 2 1 2` / `-0 0`
- 틀린 모델 실행(scratchpad `math/models.mjs`, `runInNewContext(code, { console, Math: model })`로 샌드박스 Math를 모델로 바꿈. 모델은 실제 Math 함수를 복사한 뒤 해당 함수만 바꿈):
  - 예제 1: 0에서 시작 `0 0 / 0 0 / true`, 첫 인수에서 시작 `undefined undefined / undefined undefined / false`, 인수 없으면 TypeError → 출력 없이 TypeError.
  - 예제 2: NaN이면 바로 멈춤(변환과 비교를 번갈아) `… / NaN a / …`, NaN 건너뜀 `0 1 10 number / 2 a,b,c / …`, null 무시 `-1 NaN 10 number / …`, 문자열끼리 문자열 비교 `0 NaN 9 number / …`, 변환이 던지면 NaN으로 침 → 셋째 줄 없음.
  - 예제 3: 먼저 온 쪽 `-0 0 / 0 -0 / -0 -0 0 0`, 나중 온 쪽 `0 -0 / -0 0 / -0 -0 0 0`, "max는 0을 +0, min은 -0으로" `0 0 / -0 -0 / 0 0 -0 -0`, -0 없음 `0 0 / 0 0 / 0 0 0 0`.
  - 예제 4: floor=trunc(-0.5 행 `-0.5 -0 -0 -0 -0`), round=floor(x + 0.5)(`-0.5 -1 -0 -0 0`, 마지막 줄 `0 0`), 0에서 먼 쪽 반올림(`-0.5 -1 -0 -0 -1`, -1.5 행 `-2`), -0 없음(`-0.5 -1 0 0 0`).
  - 출력으로 구별되지 않는 것(본문에서 증명한 것처럼 쓰지 않음): "모두 변환한 뒤 비교"와 "변환하며 비교하되 NaN을 기억하고 계속 변환", "-∞에서 시작"과 "첫 인수에서 시작하고 없으면 -∞"(예제 1의 3번 줄은 0에서 시작 모델도 true).
- 겹침(읽고 확인): `app/concepts/spread-destructuring/content.mdx:13`, `app/concepts/array-method-pitfalls/content.mdx:57`·`examples/holes-and-reduce.js:10-11`(빈 배열 reduce, 초안의 "reduce 없음"은 틀린 사실이었음 — 후보 겹침 확인 교훈 재발), `app/concepts/number-pitfalls/content.mdx:22`, `app/concepts/bigint/content.mdx:15`("이 페이지는 Math 객체를 따로 다루지 않으므로 함수 이름으로만 씁니다.")·`meta.ts:136`, `app/concepts/equality-operators/content.mdx:102`, `app/concepts/this-binding/content.mdx:56`(apply), `app/concepts/new-operator/content.mdx:54`.
- 장 범위: 스프레드(35장, spread-destructuring order 320)는 예제에 쓰지 않고 `Math.max.apply(null, arr)`(22장, this-binding order 190)로 쓴다. valueOf가 불리는 과정은 to-primitive(order 305)가 다룬다(type-coercion `meta.ts:91`도 그쪽으로 미룸, bigint `meta.ts:129` 선례). try…catch는 47장(number-pitfalls `meta.ts:115` 패턴).
- 학습 순서: order 277 date(44번째)와 280 regexp-lastindex(45번째) 사이 → math 45번째/79, regexp-lastindex부터 +1. 현재 78개. 바꿀 묶음은 838d206과 같다(ConceptPager.test, concepts.test, navigation(45 이상 순위와 이웃 pager), responsive, a11y, helpers, build-output, content-guide).
- `tests/helpers/run-example.ts:12`의 util.format과 Node console은 -0을 `-0`으로 찍지만 `String(-0)`은 `'0'`(Number::toString). 예제는 `show(n)`(Object.is로 `'-0'` 문자열)만 출력한다.
- 표 형식(`tests/helpers/result-tables.ts`): 첫 칸이 `예제 N`·`N:`으로 시작하지 않고 `결과`·`출력`으로 시작하는 열 머리가 없으면 자동 대조 대상이 아니다. 머리 행은 하나.

### 추정
- 없음

## 3. 구현 전략
- automatic-semicolon-insertion(ecmascript, 표+퀴즈, 모델 실행으로 오답)과 mutation-observer의 구조를 따른다.
- category fundamentals: 핵심이 숫자 결과(-Infinity, NaN, -0)라 number-pitfalls·bigint와 같은 묶음. 버린 대안: objects(객체 동작은 다루지 않음).
- 퀴즈 오답은 모델 Math 주입으로 예제를 실행한 출력(손 계산 없음). 모델마다 기대 출력을 하드코딩해 단언하고, 정답과 다름을 단언한다.
- 정수 함수 표는 칸 하드코딩 + concept.test가 `tableBody`로 읽어 칸마다 실제 계산·예제 4 출력과 대조. 규칙 표는 산문 칸 하드코딩 + 행마다 근거 예제 출력 단언.
- 본문의 알고리즘 서술은 명세 인용으로 하고, 예제가 보여 주는 것은 "NaN이 나와도 뒤 인수의 ToNumber가 왼쪽부터 끝까지 불린다", "변환이 던지면 그 뒤는 변환하지 않는다", "인수가 없으면 -Infinity", "+0 특례는 -0을 +0으로 바꾸지 않는다"로 한정한다.
- 버린 대안: 단계 시뮬레이터(사용자 선택), 스프레드 예제(35장·중복), reduce 줄(array-method-pitfalls 중복이고 콜백이 불리지 않아 Math 증거가 아님), 구멍을 apply로 넘기는 줄(apply의 CreateListFromArrayLike 동작이고 undefined 줄과 중복), `===`/Object.is 대비 줄(equality-operators 중복).

## 4. 변경 파일
- 추가 `app/concepts/math/`: meta.ts, content.mdx, route.tsx, concept.test.ts, examples/{empty-args,nan-and-coercion,signed-zero,to-integer}.js
- 수정(연결): `app/concepts/bigint/content.mdx:15`(문장을 링크로), `bigint/meta.ts`(simplifications 136줄, related에 'math'), `app/concepts/number-pitfalls/content.mdx:22`(문단 끝 링크 한 문장), `number-pitfalls/meta.ts`(related에 'math'). 두 페이지 reviewedAt은 바꾸지 않는다.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(경로 목록).
- 문서: 이 계획 문서, finalize 때 `concept-roadmap-extras-4.md`(5번 상태, 남은 범위 조정, 진행 기록).
- 변경하지 않음: spread-destructuring, array-method-pitfalls, global-object, new-operator, equality-operators, 공통 코드.

## 5. 위험 요소
- 명세에 없는 의도("-∞는 항등원이라서") → 본문은 알고리즘의 시작 값으로만 설명. 예제 1의 3번 줄은 "결과만으로 빈 인수와 -Infinity 하나를 구별할 수 없다"는 결과의 성질로만 쓴다(단계 2 완료 조건).
- 예제가 증명하지 못한 단계 순서를 증명한 것처럼 쓰기 → 3절의 한정 문구를 따른다(단계 2 완료 조건, 리뷰).
- "+0 특례가 -0을 +0으로 바꾼다"는 오해 → 예제 3의 3번 줄(`Math.max(-0)`은 -0)로 배제하고 본문에 특례 조건(highest가 -0인데 +0이 올 때만)을 쓴다.
- `Math.round(-0.5)`를 가운데 규칙만으로 0이라 쓰기 → 명세 분기(-0.5 이상 -0 미만은 -0)로 쓰고 number-pitfalls와 모순 없이 연결.
- valueOf·try…catch·apply가 장 범위 밖이거나 다른 페이지 내용 → 링크와 simplifications(단계 1·2).
- 순서 테스트 누락(78→79, 45 이상 +1, 이웃 pager) → 단계 4 grep·navigation e2e. title·summary·tags에 "객체"를 넣지 않고 `filterConcepts([concept], '객체')`가 빈 배열이라고 단언("객체" 검색 결과 19개 유지, 45번째 이후 순위만 +1).
- 표 칸·PredictQuiz 문자열의 `<`, 백틱, 작은따옴표, MDX `{` → `<code>{'…'}</code>`, 큰따옴표 속성.
- 예제 4 퀴즈는 한 행만 묻는다(긴 선택지 방지). 375px에서 선택지 줄바꿈 확인.

## 6. 검증 방법
- 정적: lint, format:check, typecheck, `npm test`, `npm run test:build`.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "math|Math|홈 학습 순서 보기"`(a11y 케이스 이름 '개념 페이지: Math').
- 브라우저(dev 서버 재시작 후): /concepts/math에서 학습 순서 45 / 79·이전 date·다음 regexp-lastindex, 정수 함수 표 5행·규칙 표 8행, 퀴즈 4개와 정답 피드백, 375px 가로 스크롤 없음, bigint·number-pitfalls의 새 링크 렌더, 콘솔 오류 없음.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 예제와 meta
- 대상: `app/concepts/math/examples/*.js`, `meta.ts`
- 변경: 예제 4개를 아래 원문 그대로(scratchpad `math/ex2/`와 바이트 동일) 만들고 meta를 쓴다.
  - empty-args.js
    ```js
    var none = [];
    console.log(Math.max(), Math.min());
    console.log(Math.max.apply(null, none), Math.min.apply(null, none));
    console.log(Math.max(-Infinity) === Math.max());
    ```
  - nan-and-coercion.js
    ```js
    var calls = [];
    function num(name, value) {
      return { valueOf: function () { calls.push(name); return value; } };
    }
    console.log(Math.max(-1, null), Math.max(1, undefined), Math.max('10', '9'), typeof Math.max(1, '5'));
    console.log(Math.max(num('a', NaN), num('b', 1), num('c', 2)), calls.join(','));
    calls = [];
    var stop = { valueOf: function () { calls.push('t'); throw new RangeError('stop'); } };
    try {
      Math.max(num('a', 1), stop, num('c', 3));
    } catch (e) {
      console.log(e.name, calls.join(','));
    }
    ```
  - signed-zero.js
    ```js
    function show(n) { return Object.is(n, -0) ? '-0' : String(n); }
    function naiveMax(a, b) { return b > a ? b : a; }
    console.log(show(Math.max(-0, 0)), show(Math.max(0, -0)));
    console.log(show(Math.min(0, -0)), show(Math.min(-0, 0)));
    console.log(show(Math.max(-0)), show(Math.max(-0, -1)), show(Math.min(0)), show(Math.min(0, 1)));
    console.log(show(naiveMax(-0, 0)), show(naiveMax(0, -0)));
    ```
  - to-integer.js
    ```js
    function show(n) { return Object.is(n, -0) ? '-0' : String(n); }
    var xs = [-1.5, -0.5, -0.4, 0.4, 1.5];
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      console.log(show(x), show(Math.floor(x)), show(Math.ceil(x)), show(Math.trunc(x)), show(Math.round(x)));
    }
    console.log(show(Math.round(-0.4)), show(Math.floor(-0.4 + 0.5)));
    ```
  - meta: slug 'math', title 'Math: Math.max()는 왜 -Infinity일까', summary ≤160자(조건 포함, "객체" 금지), category 'fundamentals', order 278, tags(Math, Math.max, Math.min, Math.floor, Math.ceil, Math.trunc, Math.round, -Infinity, NaN, -0 등), goals 4개(범위 네 가지), prerequisites(type-coercion, equality-operators, number-pitfalls, this-binding), related(spread-destructuring, array-method-pitfalls, to-primitive, bigint, number-type, new-operator, error-handling), examples(id = 파일 이름, runtime 'ecmascript', 2절의 expectedOutput), reviewedAt null.
  - simplifications(최소): 예제는 sloppy·strict 출력이 같다는 표준 문장(ASI meta 첫 항목 패턴) / 스프레드는 스프레드와 구조 분해 개념, 배열 하나를 넘길 때의 ToNumber도 그 개념 / 빈 배열 reduce는 배열 메서드의 함정 개념 / valueOf가 불리는 과정은 객체를 원시 값으로 개념 / 가운데 규칙과 0.49999999999999994는 숫자의 함정 개념 / try…catch는 오류를 보이려는 용도, try/catch/finally 개념 / String(-0)이 '0'이라 show로 구분해 출력하며 console 출력 형식은 호스트 API / Math.random·근삿값 함수·sumPrecise·상수는 다루지 않음.
  - references: 명세 sec-math.max, sec-math.min, sec-math.round, sec-math.floor, sec-math.ceil, sec-math.trunc, sec-function.prototype.apply, MDN Math.max·Math.round(또는 Math)·Object.is 중 필요한 것. 앵커는 명세 해당 분할 페이지(numbers-and-dates, fundamental-objects)에서 확인.
- 완료 조건: 예제 4개 sloppy·strict 출력 = expectedOutput(`npm test -- tests/examples.test.ts`), 예제 파일이 scratchpad 원본과 `cmp` 동일, summary ≤160자, references 앵커가 명세 분할 페이지에 존재(curl+grep), MDN 링크 200.
### 2. 본문
- 대상: `content.mdx`
- 변경:
  - 첫 문단: 질문(`Math.max()`는 왜 -Infinity이고 `Math.min()`은 Infinity인가) + 다루는 것 + 배열 인수·스프레드는 spread-destructuring 링크.
  - 동작 원리 h3 4개: ① 인수마다 ToNumber한 뒤 -∞(min은 +∞)에서 시작(명세 인용, 의도는 쓰지 않음) ② 하나라도 NaN이면 NaN, NaN이 나와도 뒤 인수는 끝까지 변환되고 변환이 던지면 거기서 멈춤(valueOf는 to-primitive 링크, null→0·undefined→NaN·문자열 숫자는 type-coercion 링크) ③ +0과 -0 특례(highest가 -0인데 +0이 오면 +0, 그 외에는 -0을 바꾸지 않음, `>`만으로는 둘이 같아 먼저 온 쪽이 남는 naiveMax와 대비, -0 확인은 equality-operators 링크, show를 쓰는 이유) ④ floor(-∞ 쪽)·ceil(+∞ 쪽)·trunc(0 쪽)·round(가장 가까운, 동률이면 +∞ 쪽)의 방향과 -0 구간(ceil·trunc는 -1과 0 사이, round는 -0.5 이상 0 미만), round와 floor(x + 0.5)가 다른 경우(NOTE 2, 가운데 규칙과 0.49999999999999994는 number-pitfalls 링크).
  - 예제 4개 + 퀴즈 4개(아래 선택지를 이 순서로, 정답은 answer 인덱스):
    - 퀴즈 1(예제 1 전체): ['0 0 / 0 0 / true', '-Infinity Infinity / -Infinity Infinity / true', 'undefined undefined / undefined undefined / false', '아무것도 출력되지 않고 TypeError로 멈춥니다'], answer 1.
    - 퀴즈 2(예제 2의 1·2번째 줄): ['0 NaN 10 number / NaN a', '0 1 10 number / 2 a,b,c', '-1 NaN 10 number / NaN a,b,c', '0 NaN 10 number / NaN a,b,c'], answer 3.
    - 퀴즈 3(예제 3의 1~3번째 줄): ['0 0 / -0 -0 / -0 -0 0 0', '-0 0 / 0 -0 / -0 -0 0 0', '0 -0 / -0 0 / -0 -0 0 0', '0 0 / -0 -0 / 0 0 -0 -0'], answer 0.
    - 퀴즈 4(예제 4의 x = -0.5 줄): ['-0.5 -0 -0 -0 -0', '-0.5 -1 -0 -0 0', '-0.5 -1 -0 -0 -0', '-0.5 -1 -0 -0 -1'], answer 2.
    - explanation은 정답 이유와 오답 모델 하나 이상을 짚는다.
  - 결과와 이유: 예제별 h3(예제 1~4). 예제 1은 3번 줄을 결과의 성질로만 설명. 예제 2는 줄마다 배제한 모델(null 무시, 문자열 비교, NaN이면 멈춤, NaN 건너뜀, 변환 실패를 NaN으로)을 짚음. 예제 3은 3번 줄이 "max는 0을 +0으로" 모델을 배제한다는 것, 4번 줄은 Math 밖의 비교 함수.
    - 정수 함수 표(5행 × x·floor·ceil·trunc·round, 예제 4의 1~5번째 줄과 같은 값): 머리 `x`, `Math.floor`, `Math.ceil`, `Math.trunc`, `Math.round`. 칸은 `-0`처럼 show 표기.
    - max·min 규칙 표 8행(머리: `상황`, `결과`가 아닌 이름 예: `상황`, `Math.max·Math.min이 하는 일`, `근거`): 인수 없음(max -Infinity, min Infinity, 예제 1 1번 줄) / null(0으로 바뀌어 비교, 예제 2 1번 줄 첫 값) / undefined(NaN이 되어 결과 NaN, 예제 2 1번 줄 둘째 값) / 숫자 문자열(숫자로 바뀌어 비교하고 결과는 number, 예제 2 1번 줄 셋째·넷째 값) / 앞 인수가 NaN(결과 NaN, 뒤 인수도 변환, 예제 2 2번 줄) / 변환이 던짐(예외가 그대로 나가고 뒤 인수는 변환 안 함, 예제 2 3번 줄) / +0과 -0(max는 +0, min은 -0, 순서와 무관, 예제 3 1~2번 줄) / -0 하나 또는 -0과 음수(-0이 그대로 남음, 예제 3 3번 줄). 첫 칸은 `예제 N`이나 `N:`으로 시작하지 않는다.
  - 흔한 오해 2개: "인수가 없으면 0이거나 오류다", "Math.trunc와 Math.floor는 같다"(음수에서 갈림).
- 주의: 3절 한정 문구를 지킨다. 독자용 본문에 '테스트' 금지. 끼운 문장 뒤 지시어 재확인.
- 완료 조건: 필수 h2 3개, 퀴즈 4개가 위 선택지·answer와 같음, 본문에 "항등원"·"모두 변환한 뒤 비교한다는 것을 예제가 보여" 같은 증명 주장 없음(grep), `npm test`(content-integrity·result-tables) 통과, `npm run test:build` 통과.
### 3. concept.test와 빌드 등록
- 대상: `concept.test.ts`, `tests/build/build-output.test.ts`
- 변경: 'use strict' 접두 검사(ASI 패턴) / 모델 Math 주입 실행(2절 모델 전부, 모델마다 기대 출력 하드코딩 단언, 정답과 다름 단언, "변환 실패를 NaN" 모델은 셋째 줄이 없음을 단언) / 퀴즈 choices·answer가 정답 줄 조합과 모델 출력 줄 조합과 같음 / 정수 함수 표를 `tableBody`로 읽어 칸마다 `show(Math.fn(x))`와 예제 4 출력에 대조 / 규칙 표 8행 칸 하드코딩 비교 + 행마다 근거 예제 출력 단언 / 예제 파일 단언(apply 사용, `...` 스프레드 없음, reduce 없음) / meta(summary 길이, prerequisites order < 278, `filterConcepts([concept], '객체')` 빈 배열). build-output에 '프리렌더 (math)' 블록(표 2개, 퀴즈 `<details>`).
- 완료 조건: 퀴즈 answer·표 칸을 바꾸면 실패하는 것을 변이 검사로 확인 후 원복, `npm test` 통과.
### 4. 연결과 순서 테스트
- 대상: bigint content·meta, number-pitfalls content·meta, 순서 테스트 묶음, content-guide.
- 변경: bigint content:15 문장을 "`Math.max`의 다른 규칙은 [Math](/concepts/math)에서 다룹니다" 식으로, meta:136을 "…Math 개념에서 다룹니다"로, related에 'math'. number-pitfalls content:22 문단 끝에 "음수에서 -0이 되는 구간과 floor·ceil·trunc와의 차이는 [Math](/concepts/math)에서 다룹니다" 식 한 문장, related에 'math'. 순서 테스트는 78→79, 45번째 이후 +1, 이웃 pager(date 다음 → math, regexp-lastindex 이전 → math).
- 완료 조건: 관련 파일 78 grep 0건, navigation e2e 통과, 링크 대상 하위 주제가 math 본문에 실제로 있음(round의 -0 분기, Math.max의 ToNumber).
### 5. 전체 검증
- AGENTS.md 검증 순서 + 6절 e2e + 브라우저 시나리오.

## 변경 이력
- 2026-11-24 (사용자 검토): 다음을 고친다. 사용자 요청을 그대로 반영하는 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3.
  - [낮음] 입력 -0의 근거를 함수별로: floor·ceil·trunc는 "0이 아닌 유한한 Number가 아니면 n", round는 "유한하지 않거나 정수면 n"(-0은 정수). 이중 부정 풀기.
  - [낮음] 정수 함수 표 아래 모델 배제 문장의 행 범위: floor=trunc 모델은 1행(-1)도, round=floor(x + 0.5) 모델은 3행도 다름.
  - [낮음] '가운데 규칙'을 한 번 풀어 씀(두 정수의 정확히 가운데일 때 어느 쪽을 고르는지), 이후 같은 표현 유지(본문·simplifications).
  - [선택→반영] 예제 1에 4번 줄 `console.log(Math.max(3, Math.max()), Math.min(3, Math.min()));` → `3 3`을 덧붙이고, 동작 원리 1절에 "인수 없는 호출의 결과를 NaN이 아닌 숫자와 함께 다시 넘겨도 결과가 그 숫자"라는 결과의 성질(의도 아님)을 쓴다. 모델 출력: 0에서 시작 `3 0`, 첫 인수에서 시작 `NaN NaN`.
  - [선택→반영] 예제 2에 4번 줄(try 안 `Math.max(NaN, 1n)` → `TypeError`)을 덧붙이고 bigint를 본문 링크·prerequisites(order 276)로 연결. "변환이 비교보다 먼저라서"는 쓰지 않고(변환하며 NaN을 기억하는 구현도 같은 출력) "앞 인수가 NaN이어도 뒤 인수의 변환이 이어져 BigInt의 ToNumber가 던진다"로 쓴다. concept.test 모델의 ToNumber를 `Number()`에서 단항 `+`로 바꾼다(`Number(1n)`은 1, ToNumber(1n)은 TypeError). 모델 출력: NaN이면 멈춤은 4번 줄 없음, 변환 실패를 NaN은 3·4번 줄 없음, 나머지는 `TypeError`.

## 구현 진행

- baseline (2026-11-24, `838d206`): lint 통과, format:check 통과, typecheck 통과, npm test 192파일 6280개 통과, test:build 620개 통과(같은 세션에서 838d206 커밋 직전 실행값, 이후 코드 변경 없음)
- [x] 1·2·3. 새 개념 폴더(예제 4개·meta·본문·route·concept.test)와 build-output 등록 — Sonnet 구현. 메인 확인: 예제 4개가 scratchpad 원본과 바이트 동일(cmp), 본문 전체 정독 후 두 곳 직접 수정(h3 "+0은 -0보다 크다"를 "Math.max·Math.min은 +0을 -0보다 크다고 본다"로 — 일반 비교에서는 같으므로 전칭 금지, "===로 같아서 그래서 > 가 거짓"의 잘못된 인과를 "크기 비교에서도 같다고 봐서 0 > -0과 -0 > 0이 모두 거짓"으로, "명세는 이 비교를 그대로 쓰지 않고"를 "> 로 비교하되 그 앞에 특례 단계"로). summary의 "+0이 -0보다 큽니다"도 "+0을 -0보다 크다고 봅니다"로(140자). Sonnet 보고: 모델 16개 하드코딩 단언, 변이 검사(퀴즈 answer·표 칸·근거 칸 변경 시 실패 후 원복), 명세 앵커·MDN 200 확인.
- [x] 4. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(bigint 본문 15줄 링크 문장, number-pitfalls 22줄 끝 링크 문장, 두 meta related에 'math', 79·45 이상 +1·이웃 pager). bigint simplifications "Math 객체는 Math 개념에서 다룹니다"는 새 페이지가 Math 객체 자체를 다루지 않아 "Math.max의 나머지 규칙(인수가 없을 때의 값, NaN, +0과 -0, 인수를 바꾸는 순서)은 Math 개념에서 다룹니다"로 메인이 고침.
- [x] 5. 전체 검증 (2026-11-24) — lint·format:check·typecheck 통과, npm test 193파일 6345개 통과(baseline 6280), test:build 628개 통과(baseline 620), e2e navigation 16개·관련 8개 통과(axe light·dark 포함). 브라우저(dev 5173 재시작): 학습 순서 45 / 79·이전 date·다음 regexp-lastindex, 표 5행·8행, 퀴즈 4개, 예제 4 퀴즈 정답 선택 후 "정답입니다.", 375px에서 페이지 가로 스크롤 없음(정수 표 영역 안에서만 343→469), 콘솔 오류 없음, bigint·number-pitfalls 새 링크 렌더.
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토, 2026-11-24): 메인이 구현 확인 중 고친 것(+0/-0 전칭 h3, === 때문이라는 잘못된 인과, bigint simplifications 범위)은 위 단계 기록. Opus HIGH 3·MEDIUM 4·LOW 9 → 모두 고침(메인 직접, 본문·meta·concept.test 규칙 표 기대값 두 칸).
  - HIGH: 예제 1 결과가 "시작 값"을 보인다는 문장(첫 인수에서 시작하고 없으면 -Infinity인 모델도 같은 출력 — 인수가 없을 때의 결과만 보이고 -∞ 시작은 명세에서 온다고 고침), "비교 연산자 하나로 짠 최댓값은 먼저 온 쪽"(>=는 나중 쪽 — `b > a ? b : a`로 한정, goals도), 정수 표 설명 "1.5 행은 round만 2"(ceil도 2).
  - MEDIUM: 규칙 표 7행 조건(가장 큰/작은 값이 0일 때), 규칙 표 5행·goals·summary의 NaN 결과에 "변환 예외가 없으면" 조건(Math.max(NaN, 던지는 valueOf)는 RangeError), "항상 같지 않다"→"항상 같지는 않다", 규칙 표 앞 문장(예제 2만 Math.max로만 보임).
  - LOW: floor의 -1 이유(그래서 → 이하 최대 정수) + 입력 -0은 네 함수 모두 -0, 퀴즈 2 해설의 typeof 대상, 예제 3 결과의 잘못된 연결어미, "거꾸로"→"방향만 바꿔", "오류가 아닙니다"→"예외가 던져지지 않고", summary 표현(158자), simplifications 범위(가운데 규칙·toFixed 차이), 개념 이름 "스프레드와 디스트럭처링", apply의 this.
  - 재검증: lint·format:check·typecheck 통과, npm test 193파일 6345개, test:build 628개, e2e navigation 16개·관련 8개 통과. dev 서버에서 바뀐 문장 11곳 렌더·옛 문구 3개 0건, 콘솔 오류 없음. 수정 범위 재리뷰: 새 High 없음.
- 사용자 검토(2026-11-24): 낮음 3·선택 2 모두 반영(변경 이력). 메인 확인: 명세 사본의 round 단계 "If n is not a finite Number or n is an integral Number, return n"과 floor 단계 "If n is not a non-zero finite Number, return n", node로 `Math.max(3, Math.max())` 3·`Math.min(3, Math.min())` 3·`Math.max(NaN, 1n)` TypeError·`Number(1n)` 1·`+1n` TypeError. 예제 1·2에 줄을 덧붙여(앞 줄 불변) expectedOutput·모델 출력·규칙 표 6행 근거(3~4번 줄)·퀴즈 1 질문(1~3번째 줄)을 갱신, 모델의 ToNumber를 단항 +로 바꿈, prerequisites에 bigint(order 276). 수정은 메인이 직접.
  - 재검증: lint·format:check·typecheck 통과, npm test 193파일 6345개, test:build 628개, e2e navigation 16개·관련 8개 통과. dev 서버에서 바뀐 문장 8곳 렌더·옛 문구 0건·bigint 링크, 콘솔 오류 없음.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(ecmascript 예제 4개·퀴즈 4개·표 2개·흔한 오해 2개, 시뮬레이터 없음, order 278·학습 순서 45/79, category fundamentals, bigint·number-pitfalls 연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것: 메인 확인과 Opus 리뷰로 +0/-0 서술(전칭 제목, === 때문이라는 인과, `>=` 반례), 예제 1이 시작 값을 보인다는 과잉 주장, "1.5 행은 round만 2", NaN 결과의 예외 조건, 규칙 표 7행 조건 등을 고쳤다. 사용자 검토로 입력 -0의 함수별 근거, 모델 배제 행 범위, '가운데 규칙' 풀어 쓰기를 고쳤고, 선택 제안 두 개를 예제 줄(예제 1의 `Math.max(3, Math.max())`, 예제 2의 `Math.max(NaN, 1n)`)로 더해 prerequisites에 bigint를 넣었다. reviewedAt은 사용자 결정으로 2026-11-24를 기록했고, bigint·number-pitfalls는 그대로 뒀다.

### 코드 리뷰
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토): 메인이 구현 확인 중 3건, Opus HIGH 3·MEDIUM 4·LOW 9를 모두 고쳤다. 사용자 검토(낮음 3·선택 2)도 모두 반영했다.
- 고치지 않고 남긴 항목: 없음.

### 후속 작업
- [ ] 없음. 추가 게시글 로드맵 4가 끝났다(2번은 제외). 다음 범위는 사용자에게 확인한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제는 스프레드 대신 `Math.max.apply(null, arr)`를 쓴다 — 스프레드는 35장(spread-destructuring order 320)이라 29장 페이지가 전제할 수 없고, 배열 인수와 스프레드는 그 페이지가 이미 다룬다. apply는 22장(this-binding)이라 범위 안이다.
- [Claude 판단] 퀴즈 오답은 틀린 모델 Math를 vm 샌드박스에 주입해 예제를 실제로 실행한 출력이다 — 손 계산 대신 `runInNewContext(code, { Math: model })`로 모델 16개를 돌리고 출력을 하드코딩해 단언한다. 모델의 ToNumber는 단항 `+`(Number()는 BigInt를 바꿔 ToNumber와 다름).
- [Claude 판단] 예제가 구별하지 못하는 것은 증명했다고 쓰지 않았다 — "모두 변환한 뒤 비교"와 "변환하며 NaN을 기억", "-∞에서 시작"과 "첫 인수에서 시작하고 없으면 -∞"는 출력이 같다. 본문은 명세 인용으로 쓰고, 예제가 보이는 범위(NaN이 나와도 뒤 변환이 이어짐, 예외는 뒤 변환을 막음, 인수가 없을 때의 결과)를 따로 밝혔다.
- [Claude 판단] 예제 3에 `Math.max(-0)` 줄을 넣었다 — 처음 예제는 "max는 0을 +0으로, min은 -0으로 만든다" 모델과 출력이 같았다(Critic 지적). 특례는 highest가 -0인데 +0이 올 때만 일어난다.
- [Claude 판단] category는 fundamentals — 핵심이 숫자 결과(-Infinity, NaN, -0)라 number-pitfalls·bigint와 같은 묶음이다.
- [무검토 승인] reduce 줄을 예제 1에서 뺐다(계획 검토 후 보고, 사용자 승인) — 빈 배열이라 콜백(Math.max)이 불리지 않아 Math의 증거가 아니고 array-method-pitfalls와 중복이다.
- 다룰 범위 네 가지와 표+퀴즈, 입력 -0의 함수별 근거, '가운데 규칙' 풀어 쓰기, `Math.max(3, Math.max())`·`Math.max(NaN, 1n)` 예제 줄 — 사용자가 고르거나 검토로 고쳤다.

#### 배경지식
- Math.max(...args)는 `? ToNumber`로 인수를 왼쪽부터 coerced 목록에 넣고, highest = -∞에서 시작해 NaN이면 NaN을 돌려주고, "+0이고 highest가 -0이면 +0"인 특례 뒤 `>`로 비교한다. Math.min은 +∞에서 시작하고 -0 특례가 대칭이다.
- `>`(IsLessThan)는 +0과 -0을 같다고 본다. `String(-0)`은 "0"이라 -0은 Object.is로 가려야 한다.
- floor·ceil·trunc는 "0이 아닌 유한한 Number가 아니면 n"(NaN·±∞·±0은 그대로), round는 "유한하지 않거나 정수면 n"(-0은 정수). -0 구간: ceil·trunc는 -1 < n < -0, round는 -0.5 ≤ n < -0. round(x)는 floor(x + 0.5)와 항상 같지는 않다(NOTE 2).
- ToNumber는 null을 0, undefined를 NaN, 숫자 문자열을 숫자로, 객체는 ToPrimitive(valueOf)로 바꾸고, BigInt면 TypeError를 던진다.

#### 확인 질문
1. 예제 1의 출력만으로 "-∞에서 시작한다"를 증명할 수 없는 이유는? 그럼에도 1번 줄은 어떤 모델을 배제하는가?
   <details><summary>답</summary>"첫 인수에서 시작하고 인수가 없으면 -Infinity" 구현도 같은 출력을 낸다(Opus 지적). 1번 줄은 0에서 시작, 첫 인수에서 시작해 undefined, 인수 없으면 TypeError 모델을 배제한다(content.mdx 예제 1 결과, concept.test MODELS[1]).</details>
2. `Math.max(num('a', NaN), num('b', 1), num('c', 2))`가 `a,b,c`를 기록한다는 것이 보이는 것과 보이지 않는 것은?
   <details><summary>답</summary>NaN이 나와도 뒤 인수의 변환이 이어진다는 것은 보인다(NaN에서 멈추는 모델은 a). "모두 변환한 뒤 비교"와 "변환하며 NaN을 기억했다가 끝에 반환"은 구별하지 못한다(content.mdx 예제 2 마지막 문단).</details>
3. 처음 예제 3(1·2번 줄만)이 배제하지 못한 모델은 무엇이고, 3번 줄은 어떻게 배제하는가?
   <details><summary>답</summary>"max의 결과 0은 항상 +0, min은 항상 -0" 모델. `Math.max(-0)`·`Math.max(-0, -1)`은 실제로 -0이지만 이 모델은 0이다. 특례는 반대 부호의 0이 함께 있을 때만 일어난다(계획 변경 전 Critic 지적, concept.test MODELS[3]).</details>
4. 테스트의 오답 모델에서 ToNumber를 `Number(v)`로 쓰면 예제 2의 4번 줄에서 무엇이 틀어지는가?
   <details><summary>답</summary>`Number(1n)`은 1이라 모델이 TypeError 없이 계산해 버린다. ToNumber(1n)은 TypeError이므로 단항 `+`를 써야 모델이 명세의 변환을 흉내 낸다(사용자 검토 반영, concept.test toNum 주석).</details>
5. 스프레드 대신 apply를 쓴 이유는? `Math.max.apply(null, [])`와 `Math.max()`는 무엇이 같고 무엇이 다른가?
   <details><summary>답</summary>스프레드는 35장이라 29장 페이지의 범위 밖이고 spread-destructuring이 다룬다. 인수 목록은 둘 다 비어 결과가 같고, this는 null과 Math로 다르지만 Math.max는 this를 쓰지 않는다(content.mdx 예제 절 첫 문단, 계획 2절 장 범위).</details>
