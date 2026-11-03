# 개념 '스프레드와 디스트럭처링' 구현 계획

- 상태: 완료
- 작성일: 2026-11-03
- 기준: `main` @ `1d99e41`

## 0. 요약

- 목적: 25~37장 로드맵 10번 `/concepts/spread-destructuring`을 추가한다. 35·36장에서 스프레드(배열·함수 인수·객체)와 얕은 복사, 스프레드와 `Object.assign`의 차이, 배열·객체 디스트럭처링, 기본값이 `undefined`일 때만 쓰이는 이유와 평가 시점, rest 요소·프로퍼티, `null`·원시 값 디스트럭처링, 매개변수·스왑·할당 디스트럭처링을 예제 10개와 기본값 비교표로 명세 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `objects`, order 320으로 학습 순서 34번째·마지막, 정적 표 + 퀴즈). 마지막 개념과 '객체' 검색 결과가 바뀌므로 고정 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 33개는 바꾸지 않는다.
- 위험: ① 결과의 원인을 "복사해서/공유해서"로 설명함(AGENTS.md 정확성 원칙) ② 기본값 조건을 "값이 없을 때/falsy일 때"로 씀 ③ 뒷장(try...catch 47장)·보류 주제(매개변수 기본값 세부)를 앞서 설명 → 원인은 명세 알고리즘(CopyDataProperties·CreateDataPropertyOrThrow·KeyedBindingInitialization 등)으로 쓰고, 나머지는 "별도 개념" + `simplifications`.
- 복잡도: 중간 · Consensus: 생략. 직전 symbol·array-method-pitfalls와 같은 "실행 검증 표 + 퀴즈" 패턴을 그대로 쓰고 공통 코드를 바꾸지 않는다. 예제 출력·표 28칸·핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 없음(추가 주제 4개·시각화·slug·제목은 2026-11-03 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 10번 "스프레드와 디스트럭처링"(35·36장)을 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-03)
  - 기본 범위: 스프레드(배열·함수 인수·객체), 스프레드 결과는 얕은 복사(중첩 객체는 같은 객체), 배열·객체 디스트럭처링, 기본값은 `undefined`일 때만 쓰이고 `null`이면 쓰이지 않음.
  - 추가 주제 4개 모두: **스프레드 vs `Object.assign`**(정의 vs 대입, getter·setter, 프로토타입·열거 불가 제외, `{...null}`), **`null` 디스트럭처링과 원시 값**, **rest 요소와 기본값 평가 시점**, **매개변수·스왑·할당 디스트럭처링**(매개변수 기본값 자체는 보류 후보라 디스트럭처링 쪽만).
  - 시각화: **정적 표 + 퀴즈**(입력값별 기본값 적용 비교표).
  - slug `spread-destructuring`, 제목 "스프레드와 디스트럭처링: 기본값은 왜 null일 때 쓰이지 않을까".
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 스프레드는 이터러블을 펼치고 객체 스프레드는 프로퍼티를 펼친다(예제 1 `spread-basics.js`): 배열 리터럴의 `...`은 ArrayAccumulation이 GetIterator로 이터레이터를 얻어 값마다 새 배열에 CreateDataPropertyOrThrow로 요소를 정의한다. 함수 인수의 `...`은 ArgumentListEvaluation이 같은 방식으로 인수 목록에 값을 붙인다(`Math.max(...nums)` 3 vs `Math.max(nums)` NaN). 객체 리터럴의 `...`은 이터레이션이 아니라 CopyDataProperties로 자기 열거 가능 프로퍼티를 새 객체에 정의한다. 같은 키는 나중 정의가 값을 바꾸지만 키의 위치는 처음 정의된 자리(`{ b: 20, ...base }` → `{"b":2,"a":1}`). 이터레이션 프로토콜은 [이터러블과 for...of](/concepts/iterable-for-of) 링크.
  - ② 얕은 복사: 새 객체에 같은 값이 들어간다(예제 2 `shallow.js`): 스프레드는 새 배열·객체를 만들고 원본에서 읽은 값을 프로퍼티로 정의할 뿐이다. 값이 원시 값이면 새 객체의 프로퍼티를 재할당해도 원본과 무관하고, 값이 객체면 두 프로퍼티가 같은 객체를 가리키므로 그 객체를 변경하면 양쪽에서 보인다. "얕은 복사"는 관용 용어이고 명세에는 복사 단계가 없다 — [원시 값과 객체](/concepts/primitives-and-objects)의 재할당/변경 구분으로 설명.
  - ③ 객체 스프레드와 Object.assign(예제 3 `spread-vs-assign.js`): 둘 다 출처의 `[[OwnPropertyKeys]]` 중 열거 가능한 것만 Get으로 읽으므로 출처의 getter는 둘 다 실행된다. 차이는 대상에 넣는 방법이다. `Object.assign`은 기존 대상에 Set(대입)하므로 대상의 setter가 불리고, 객체 스프레드는 새 객체에 CreateDataPropertyOrThrow(정의)하므로 setter를 부르지 않고 결과 프로퍼티는 getter가 아닌 데이터 프로퍼티다. [프로퍼티 어트리뷰트와 접근자](/concepts/property-attributes) 링크.
  - ④ 무엇이 펼쳐지지 않을까(예제 4 `what-is-copied.js`): 프로토타입에서 상속한 프로퍼티와 열거 불가 프로퍼티는 빠진다(CopyDataProperties가 자기 키·`[[Enumerable]]`만 봄). 출처가 `null`·`undefined`면 CopyDataProperties가 아무것도 하지 않아 `{...null}`은 `{}`이지만, 배열 스프레드 `[...null]`과 인수 스프레드 `f(...null)`은 GetIterator가 TypeError(본문 문장 + 근거 테스트). 문자열은 객체 스프레드에서 ToObject로 인덱스 키를, 배열 스프레드에서 이터레이터로 코드 포인트를 펼친다(`{"0":"h","1":"i"}`, `["h","i"]`). 열거 가능한 심벌 키도 펼쳐진다는 것은 [심벌](/concepts/symbol) 링크로 한 줄.
  - ⑤ 디스트럭처링: 패턴으로 값을 꺼낸다(예제 5 `destructuring-basics.js`): 배열 패턴은 이터레이터에서 순서대로(빈 자리 건너뛰기), 객체 패턴은 키 이름으로 GetV(프로토타입 체인 포함)해서 읽는다. `age: years`처럼 다른 이름에 넣기, 없는 키는 `undefined`, 중첩 패턴.
  - ⑥ 기본값은 undefined일 때만 쓰인다(예제 6 `default-undefined.js`, 기본값 비교표): KeyedBindingInitialization과 IteratorBindingInitialization은 "Initializer가 있고 값이 undefined이면" 기본값을 평가한다. 키가 없거나 요소가 모자라 읽은 값이 `undefined`인 경우와 `undefined`를 직접 넣은 경우는 같고, `null`·`0`·`''`·`false`·`NaN`은 그대로 쓰인다. `??`(null과 undefined)·`||`(falsy)와 비교 — [단축 평가](/concepts/short-circuit-evaluation) 링크.
  - ⑦ 기본값은 필요할 때만, 왼쪽부터 평가된다(예제 7 `default-lazy.js`): 기본값 식은 값이 `undefined`일 때만 평가되므로 `p`에 값이 있으면 `next()`는 불리지 않는다(`count` 1). 요소는 왼쪽부터 초기화되므로 기본값 식에서 앞 변수를 쓸 수 있다(`second = first * 10`).
  - ⑧ rest 요소와 rest 프로퍼티(예제 8 `rest.js`): 배열 rest는 남은 값을 새 배열로, 객체 rest는 RestBindingInitialization이 `Object.prototype`을 프로토타입으로 하는 새 객체를 만들어 CopyDataProperties(앞에서 꺼낸 키 제외)로 정의한다. 그래서 객체 rest에는 상속 프로퍼티가 빠지지만(`others.inherited` undefined) 패턴의 `{ inherited }`는 체인을 따라 읽는다(`'P'`). rest도 얕다(`others.box === src.box`). rest는 패턴 맨 끝에만 쓸 수 있다(SyntaxError, 근거 테스트). rest 파라미터는 [화살표 함수와 메서드 축약](/concepts/arrow-functions) 링크.
  - ⑨ null과 원시 값을 디스트럭처링하면(예제 9 `primitive-source.js`): 객체 패턴은 BindingInitialization이 먼저 RequireObjectCoercible을 해서 `null`·`undefined`면 TypeError(본문 문장 + 근거 테스트). 원시 값은 GetV가 ToObject로 래퍼를 거쳐 읽으므로 `var { length } = 'hello'`는 5, `var { toFixed } = 5`는 함수 — [원시 값의 메서드](/concepts/primitive-methods) 링크. 배열 패턴은 GetIterator를 쓰므로 문자열은 되고(`'hi'` → `h`, `i`) `null`·일반 객체는 TypeError.
  - ⑩ 매개변수·스왑·할당 디스트럭처링(예제 10 `params-swap.js`): 매개변수에도 패턴을 쓸 수 있고 같은 규칙이 적용된다(`height: null`이면 기본값이 아니라 `null`이 쓰여 `3 * null` = 0). 인수 없이 부르면 패턴에 `undefined`가 들어가 TypeError이므로 `= {}`를 붙인다 — 매개변수 기본값도 `undefined`일 때만 쓰인다는 것까지만 쓰고 세부는 별도 개념(simplifications). `[a, b] = [b, a]`는 오른쪽 배열을 먼저 평가한 뒤 DestructuringAssignmentEvaluation이 꺼내 대입하므로 스왑이 된다. 선언 없는 객체 패턴 할당은 문장이 `{`로 시작하면 블록으로 읽히므로(ExpressionStatement의 lookahead 제한) 괄호로 감싼다 — 괄호 없으면 SyntaxError(근거 테스트).
  - ⑪ 기본값 비교표(표): 3절 표.

### 유지해야 하는 기존 동작

- 기존 개념 33개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만). 기존 페이지의 "스프레드·디스트럭처링은 별도 개념" 문구(`array-method-pitfalls/meta.ts:98`, `arrow-functions/meta.ts:85`, `array-index-length/meta.ts:99`, `iterable-for-of/meta.ts:105`, `string-utf16/meta.ts:97`, `symbol/meta.ts:99`, `increment-decrement/meta.ts:77`, `for-let/meta.ts:58`)의 역방향 링크는 사용자 결정대로 나중에 일괄 처리한다(이번에 하지 않음).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 표는 정적 마크업이라 JS 없이 보인다.
- 예제 9 `iterable-for-of`의 "스프레드·디스트럭처링이 같은 프로토콜을 쓴다"는 내용과 겹치지 않게, 이터레이터 호출 횟수·IteratorClose는 링크로만 다룬다.

### 제외 범위

- 매개변수 기본값의 세부(호출마다 평가, `length`에서 빠짐, 매개변수 스코프) — 로드맵 보류 목록의 추가 게시글 후보 그대로
- 깊은 복사와 `structuredClone`(호스트 API), JSON 왕복 복사
- `for...of` 머리·`catch` 매개변수의 디스트럭처링, 계산된 키 패턴(`{ [k]: v }`), 디스트럭처링 대상에 프로퍼티 쓰기(`({ a: obj.x } = …)`)
- 스프레드가 배열 구멍을 `undefined`로 채우는 동작 — 9절 후보
- try...catch(47장) — 예제에 쓰지 않고 TypeError·SyntaxError는 본문 문장 + 근거 테스트

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안(ES2027), scratchpad `sd/spec.html`, 2026-11-03 확인)

- ArrayAccumulation(`#sec-runtime-semantics-arrayaccumulation`) `SpreadElement : ... AssignmentExpression`: GetIterator(spreadObj, sync) → 반복 IteratorStepValue → `CreateDataPropertyOrThrow(array, ToString(nextIndex), next)`. Note: Array 프로토타입이 바뀌어도 자기 프로퍼티를 정의하기 위해 [[Set]]이 아니라 CreateDataPropertyOrThrow를 쓴다.
- ArgumentListEvaluation(`#sec-runtime-semantics-argumentlistevaluation`) `... AssignmentExpression`: GetIterator → 값마다 list에 Append.
- PropertyDefinitionEvaluation(`#sec-runtime-semantics-propertydefinitionevaluation`) `PropertyDefinition : ... AssignmentExpression`: `CopyDataProperties(obj, fromValue, « »)`. `PropertyName : AssignmentExpression`은 `CreateDataPropertyOrThrow(obj, propertyKey, propertyValue)`.
- CopyDataProperties(`#sec-copydataproperties`): source가 undefined·null이면 바로 반환 → `ToObject(source)` → `from.[[OwnPropertyKeys]]()`의 키마다 excludedItems에 없고 `[[GetOwnProperty]]`가 있고 `[[Enumerable]]`이 true면 `Get(from, nextKey)` → `CreateDataPropertyOrThrow(target, nextKey, propertyValue)`. Note: target은 항상 새로 만든 객체.
- `Object.assign`(`#sec-object.assign`): 같은 키 선택(자기·열거 가능, Get)이지만 마지막이 `Set(targetObj, nextKey, propertyValue, true)`. source가 undefined·null이면 건너뜀.
- BindingInitialization(`#sec-runtime-semantics-bindinginitialization`): `BindingPattern : ObjectBindingPattern` → `RequireObjectCoercible(value)` 후 진행. `BindingPattern : ArrayBindingPattern` → `GetIterator(value, sync)`, 끝나지 않았으면 IteratorClose.
- RequireObjectCoercible(`#sec-requireobjectcoercible`): undefined·null이면 TypeError.
- KeyedBindingInitialization(`#sec-runtime-semantics-keyedbindinginitialization`): `GetV(value, propertyName)` → "If Initializer is present and value is undefined" 이면 Initializer를 평가.
- IteratorBindingInitialization(`#sec-runtime-semantics-iteratorbindinginitialization`) `SingleNameBinding`: value를 undefined로 두고, 이터레이터가 끝나지 않았으면 IteratorStepValue → 값이 undefined이고 Initializer가 있으면 평가.
- RestBindingInitialization(`#sec-destructuring-binding-patterns-runtime-semantics-restbindinginitialization`): `OrdinaryObjectCreate(%Object.prototype%)` → `CopyDataProperties(restObj, value, excludedNames)`.
- 할당 연산자 평가(`#sec-assignment-operators-runtime-semantics-evaluation`): 왼쪽이 ObjectLiteral·ArrayLiteral이면 AssignmentPattern으로 보고, 오른쪽을 먼저 평가한 뒤 `DestructuringAssignmentEvaluation(assignmentPattern, rightValue)`, 결과는 rightValue. 관련: DestructuringAssignmentEvaluation(`#sec-runtime-semantics-destructuringassignmentevaluation`), `#sec-destructuring-assignment`.
- Expression Statement(`#sec-expression-statement`): `[lookahead ∉ { {, function, async function, class, let [ }]`. Note: `{`로 시작하면 Block과 모호하므로 시작할 수 없다.
- 그 밖 anchor 존재 확인: `#sec-destructuring-binding-patterns`, `#sec-runtime-semantics-iteratordestructuringassignmentevaluation`, `#sec-runtime-semantics-keyeddestructuringassignmentevaluation`, `#sec-runtime-semantics-restdestructuringassignmentevaluation`.
- 판 주의: 이 알고리즘들은 객체 rest/spread가 들어간 ES2018 이후 같은 구조다. 참고 링크는 다른 페이지처럼 현재 초안(`tc39.es/ecma262`)을 가리키고 절 번호는 라벨에 쓰지 않는다.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/sd/ex/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `spread-basics.js` | `[0,3,1,2,4] 5` / `3 NaN` / `{"a":1,"b":20} {"b":2,"a":1}` |
| 2 `shallow.js` | `Kim Lee` / `["a","b"] true` / `2 false true` |
| 3 `spread-vs-assign.js` | `get,set 1 function` / `get 1 undefined` |
| 4 `what-is-copied.js` | `["own"] undefined false` / `{} {}` / `{"0":"h","1":"i"} ["h","i"]` |
| 5 `destructuring-basics.js` | `10 30` / `Kim 30 undefined` / `Seoul` |
| 6 `default-undefined.js` | `D null 0 D` / `D null` / `"" "D" "D"` |
| 7 `default-lazy.js` | `given 1 1` / `1 10` |
| 8 `rest.js` | `1 [2,3] true` / `P 1 {"box":{"n":1}} undefined` / `2 true` |
| 9 `primitive-source.js` | `5 h i` / `function` |
| 10 `params-swap.js` | `3 0 1` / `2 1` / `X Y` |

- 기본값 비교표(공통 준비 `function show(v) { return typeof v === 'string' ? "'" + v + "'" : String(v); }`, 열: `var { v = 'D' } = …` / `var [v = 'D'] = …` / `값 ?? 'D'` / `값 || 'D'`):
  - 없음(`{}`·`[]`·`({}).v`): `'D'` / `'D'` / `'D'` / `'D'`
  - `undefined`: `'D'` / `'D'` / `'D'` / `'D'`
  - `null`: `null` / `null` / `'D'` / `'D'`
  - `0`: `0` / `0` / `0` / `'D'`
  - `''`: `''` / `''` / `''` / `'D'`
  - `false`: `false` / `false` / `false` / `'D'`
  - `NaN`: `NaN` / `NaN` / `NaN` / `'D'`
- 근거 테스트로 쓸 것(실행 확인): TypeError — `var {a} = null`, `var {a} = undefined`, `var [a] = null`, `var [a] = {}`, `[...null]`, `Math.max(...null)`, `[...{a:1}]`, `var a; ({a} = null)`, `function f({a}){} f()`. SyntaxError(`new vm.Script`로 컴파일만) — `var [...r, last] = [1,2]`, `var {...r, a} = {}`, `var x; { x } = { x: 1 }`; 괄호 있는 `var x; ({ x } = { x: 1 })`는 파싱됨. 기타 — `Object.assign({a:1}, null, undefined)`는 `{"a":1}`, 객체 rest는 열거 가능한 심벌 키도 담음(`1 2`), 객체 rest로 받은 getter는 데이터 프로퍼티(`typeof desc.get` undefined).

### 사실 (코드에서 확인)

- 겹치는 기존 개념: `iterable-for-of`가 스프레드·배열 디스트럭처링의 이터레이터 호출만 다룸(`app/concepts/iterable-for-of/content.mdx:64-66,201-216,255`, `meta.ts:105` "기본값·rest·객체 디스트럭처링은 다루지 않습니다"), 유사 배열 스프레드 TypeError(`content.mdx:34`). `symbol`이 객체 스프레드의 심벌 키 복사를 한 줄 언급(`app/concepts/symbol/content.mdx:53`). `arrow-functions`가 rest 파라미터를 다룸(`meta.ts:7,16,76`). `primitives-and-objects`가 재할당/변경과 "복사는 교육용 비유"를 다룸(`meta.ts:29-30`). `short-circuit-evaluation`이 `??`·`||` 차이를 다룸(`meta.ts:5,28`). `property-attributes`가 getter·setter·enumerable.
- 표 패턴: `app/concepts/symbol/key-visibility.ts`(setup + 칸마다 probe·expected, content.mdx와 concept.test.ts가 함께 씀), 표 렌더링 `app/concepts/symbol/content.mdx:71-111`(`role="region"`·`tabIndex={0}`·`aria-label`·`overflow-x-auto`, `th scope`), 표 검증·본문 주장 테스트 `app/concepts/symbol/concept.test.ts:1-80`(`runInNewContext`, 다른 realm 오류라 `name`으로 검사).
- route 템플릿 `app/concepts/symbol/route.tsx`. 예제 실행기 `tests/helpers/run-example.ts:6-17`.
- category 타입 `app/lib/concepts.ts:1`. 현재 마지막 개념 iterable-for-of(order 310, 33번째). order 320이면 34번째이자 마지막.
- 검색: `filterConcepts`는 title·summary·tags에 부분 일치(`app/lib/concepts.ts:70-78`). 새 summary에 '객체'가 들어가므로(아래 3절) 홈 '객체' 검색 결과가 12→13개, 순위 목록 끝에 `'34'`가 붙는다(`tests/e2e/navigation.spec.ts`의 `toHaveCount(12)` 3곳과 ranks 배열 — 직전 커밋 `1d99e41`이 11→12, `'33'` 추가로 바꾼 같은 자리).
- 고정값(현재): 개수 33·마지막 iterable-for-of — `tests/e2e/navigation.spec.ts`(카드 수 33 두 곳, 마지막 '33번째'·제목, pager 분모 `/ 33` 전부, iterable-for-of '33 / 33' 블록), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 33), `app/lib/concepts.test.ts`(total 33, 마지막 iterable-for-of, prev symbol), `app/components/concept/ConceptPager.test.tsx`('1 / 33', '33 / 33', 이전 symbol). 직전 커밋 `1d99e41`의 같은 파일 변경을 그대로 본뜬다.
- e2e·빌드 등록 위치: `tests/e2e/helpers.ts:57-59`(경로 상수), `tests/e2e/a11y.spec.ts:739-744`(symbol 페이지 axe 케이스 형태), `tests/e2e/responsive.spec.ts:852-860`(가로 스크롤 케이스 형태), `tests/build/build-output.test.ts:923-936`(`프리렌더 (symbol)` describe 형태, iterable-for-of describe 뒤에 추가), `docs/content-guide.md:167` e2e 목록.
- e2e 이름: 기존 e2e·빌드 테스트에 'spread'·'스프레드'·'디스트럭처링'이 없다(grep 0건) → `-g "spread-destructuring|스프레드와 디스트럭처링|홈 학습 순서 보기"`로 새 케이스만 잡힌다(단계 4에서 `--list` 확인).
- MDN ko 링크 200 확인(2026-11-03): `Operators/Spread_syntax`, `Operators/Destructuring`(구 `Destructuring_assignment`는 여기로 리다이렉트), `Global_Objects/Object/assign`.
- dev 서버가 실행 중이다(`npm run dev`, 5173). 새 폴더는 meta.ts → content.mdx → route.tsx 순서로 만들고, 만든 뒤 dev 서버를 재시작해야 라우트가 잡힌다(AGENTS.md 하이드레이션 규칙, 메모).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "스프레드와 디스트럭처링은 값을 '복사'하지 않는다. 스프레드는 새 배열·객체를 만들어 원본에서 읽은 값을 프로퍼티로 정의하고, 디스트럭처링은 원본에서 값을 읽어 변수에 넣는다. 기본값은 읽은 값이 `undefined`일 때만 평가된다." 결과의 원인은 명세 알고리즘 이름(ArrayAccumulation, CopyDataProperties, CreateDataPropertyOrThrow vs Set, KeyedBindingInitialization, RequireObjectCoercible, RestBindingInitialization)으로 설명하고, "얕은 복사"는 관용 용어로 한 번 소개한 뒤 재할당/변경으로 설명한다.
- 기본값 비교표(`default-table.ts` + content.mdx 표)
  - 데이터: `export const setup`(2절의 `show` 함수 문자열), `export const columns = [{ key: 'object', label: "객체 디스트럭처링 { v = 'D' }" }, { key: 'array', label: "배열 디스트럭처링 [v = 'D']" }, { key: 'nullish', label: "값 ?? 'D'" }, { key: 'or', label: "값 || 'D'" }]`, `export const rows: { value: string; cells: [Cell, Cell, Cell, Cell] }[]`, `Cell = { result: string; probe: string }`. probe는 `setup` 뒤에 붙여 실행하고 완료 값이 `result`와 같아야 한다(예: `var { v = 'D' } = { v: null }; show(v)` → `null`). 행 7개(2절 순서, 첫 행 value `없음`).
  - 렌더: symbol 표 마크업 그대로(`role="region"`, `tabIndex={0}`, `aria-label="입력값마다 디스트럭처링 기본값과 ??·||의 결과를 비교한 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"`, 첫 열 `th scope="row"`에 `<code>`, 칸은 `<code>{cell.result}</code>`). 열 머리글의 코드도 `<code>`. 표 위 문단에 "칸마다 실제로 실행한 결과와 대조했다", 표 아래 문단에 "디스트럭처링 기본값은 `undefined`만, `??`는 `null`과 `undefined`, `||`는 falsy 전부".
- 테스트(`concept.test.ts`)
  - ① 표 근거: 행 7개·칸 4개, 칸마다 새 vm 컨텍스트에서 `setup + ';' + probe` 결과 = `result`.
  - ② 본문 주장 근거: 2절 "근거 테스트로 쓸 것" 전부(TypeError 9개는 `errorName`, SyntaxError 3개와 괄호 있는 할당 파싱 1개는 `new Script(code)` 컴파일 결과 이름, 기타 3개).
- 장 범위: 36장까지. 예제에 `Object.create`(19장), getter·setter·`getOwnPropertyDescriptor`·`defineProperty`(16장), `push`·`Array.isArray`·`join`(27장), `Math.max`(29장), `??`·`||`(9장)를 쓴다. `JSON.stringify`(43장)는 다른 페이지처럼 출력 도구로만 쓰고 simplifications에 밝힌다. `try...catch`는 쓰지 않는다.
- meta
  - slug `spread-destructuring`, title "스프레드와 디스트럭처링: 기본값은 왜 null일 때 쓰이지 않을까"
  - summary: "스프레드는 새 배열·객체를 만들어 원본의 값을 프로퍼티로 정의하므로 중첩 객체는 원본과 같은 객체입니다. 디스트럭처링의 기본값은 읽은 값이 undefined일 때만 쓰입니다. Object.assign과의 차이, rest, null과 원시 값 디스트럭처링을 명세로 확인합니다."(구현 때 길이 확인, 기존 summary 수준 120~150자)
  - category `objects`, order 320, `reviewedAt: null`
  - tags: 스프레드, spread, 디스트럭처링, 구조 분해 할당, destructuring, 얕은 복사, 기본값, rest, Object.assign, 나머지 요소
  - goals 4개: ① 배열·인수 스프레드는 이터레이터로, 객체 스프레드는 자기 열거 가능 프로퍼티로 새 값을 만들고 중첩 객체는 같은 객체라는 것(얕은 복사)을 재할당/변경으로 설명 ② 객체 스프레드와 `Object.assign`의 차이(정의 vs 대입, setter)와 펼쳐지지 않는 프로퍼티 ③ 기본값이 `undefined`일 때만 평가되는 조건·시점을 예측하고 `??`·`||`와 구분 ④ rest, `null`·원시 값 디스트럭처링, 매개변수·스왑·할당 디스트럭처링 결과 예측
  - prerequisites: 이터러블과 for...of(`iterable-for-of`), 원시 값과 객체(`primitives-and-objects`), 프로퍼티 어트리뷰트와 접근자(`property-attributes`)
  - related: `iterable-for-of`, `primitives-and-objects`, `property-attributes`, `short-circuit-evaluation`, `primitive-methods`, `arrow-functions`, `symbol`, `prototype-chain`
  - simplifications: "얕은 복사"는 관용 용어이며 명세에는 복사 단계가 없고 읽은 값을 새 객체의 프로퍼티로 정의할 뿐 / 이터레이터 호출 횟수와 IteratorClose는 iterable-for-of에서 다룸 / 매개변수 기본값은 `undefined`일 때 쓰인다는 것까지만, 호출마다 평가·`length`·매개변수 스코프는 별도 개념 / 깊은 복사와 `structuredClone`(호스트 API)은 다루지 않음 / `for...of` 머리·`catch` 매개변수·계산된 키 패턴·프로퍼티 대상 할당은 다루지 않음 / TypeError·SyntaxError는 try...catch(47장)를 쓰지 않고 본문 문장과 테스트로 확인 / `JSON.stringify`는 43장이며 출력 도구로만 / `console`은 호스트 API
  - references: 2절 명세 anchor 중 본문에 쓰는 것(ArrayAccumulation, ArgumentListEvaluation, PropertyDefinitionEvaluation, CopyDataProperties, Object.assign, BindingInitialization, KeyedBindingInitialization, IteratorBindingInitialization, RestBindingInitialization, RequireObjectCoercible, Destructuring Assignment, 할당 연산자 평가, Expression Statement) + MDN ko 3개
- 버린 대안
  - ① 얕은 복사 시뮬레이터: 사용자 결정(표 + 퀴즈). 얕은 복사는 예제 2와 primitives-and-objects 시뮬레이터 링크로 대신한다.
  - ② 표에 `0`·`''`·`false`·`NaN`을 빼고 `undefined`/`null`만: 사용자가 고른 핵심("null이면 안 쓰임")과 `||` 혼동을 함께 보이려면 falsy 행이 필요하다. 7행 × 4열은 375px에서 region 가로 스크롤로 처리(기존 표와 같음).
  - ③ 표 행마다 exampleId: 행이 예제와 1:1로 대응하지 않아 두지 않는다(칸마다 probe로 실행 검증하므로 근거는 충분).

## 4. 변경 파일

- 추가 `app/concepts/spread-destructuring/`
  - `meta.ts`, `content.mdx`, `route.tsx`(symbol 템플릿), `default-table.ts`, `concept.test.ts`
  - `examples/`(10개): `spread-basics.js`, `shallow.js`, `spread-vs-assign.js`, `what-is-copied.js`, `destructuring-basics.js`, `default-undefined.js`, `default-lazy.js`, `rest.js`, `primitive-source.js`, `params-swap.js`
- 수정
  - `tests/e2e/helpers.ts`: `SPREAD_DESTRUCTURING_PATH = '/concepts/spread-destructuring'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe(라이트·다크, '정답 확인' 버튼 보인 뒤) — symbol 케이스 형태, 이름 '개념 페이지: 스프레드와 디스트럭처링'
  - `tests/e2e/responsive.spec.ts`: `${SPREAD_DESTRUCTURING_PATH}: 가로 스크롤이 없다`, 홈 학습 순서 카드 33→34
  - `tests/e2e/navigation.spec.ts`: 카드 33→34(두 곳), 마지막 '34번째'와 새 제목, pager 분모 33→34 전부, iterable-for-of '33 / 34'·링크 2개(이전 symbol, 다음 spread-destructuring), 새 개념 '34 / 34'·이전 링크 iterable-for-of, '객체' 검색 12→13(3곳)과 순위 목록에 `'34'` 추가
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 34, 마지막 spread-destructuring(prev iterable-for-of, position 34)
  - `tests/build/build-output.test.ts`: iterable-for-of describe 뒤에 `프리렌더 (spread-destructuring)` describe(표 aria-label, 표 칸 텍스트 예 `값 ?? 'D'`, 퀴즈 `<details` 10개 이상)
  - `docs/content-guide.md:167`: e2e 목록에 `spread-destructuring`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 10번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes.ts`, 기존 개념 폴더 33개

## 5. 위험 요소

- "스프레드가 값을 복사해서/참조를 공유해서" 같은 원인 서술(AGENTS.md 위반) → 3절 축대로 "새 객체에 읽은 값을 정의 → 값이 객체면 같은 객체 → 변경은 양쪽에서 보임"으로 쓴다. 단계 3에서 '복사'·'참조'·'공유' grep 결과가 관용 용어 소개·simplifications·바로잡는 문맥뿐인지 확인.
- "기본값은 값이 없을 때/falsy일 때 쓰인다" → 예제 6·표·Callout. "키가 없으면"은 "읽은 값이 undefined라서"로 원인을 맞춘다.
- `{ b: 20, ...base }`의 키 순서를 "나중 것이 뒤에 붙는다"로 잘못 설명 → CreateDataPropertyOrThrow는 기존 프로퍼티의 값만 바꾸고 순서(OrdinaryOwnPropertyKeys의 생성 순)는 처음 만든 때를 따른다고 쓴다. 예제 출력 `{"b":2,"a":1}`로 확인.
- 객체 스프레드도 이터레이터를 쓴다고 서술 → 객체 스프레드는 CopyDataProperties, 배열·인수 스프레드만 GetIterator. 예제 4의 `{...'hi'}` vs `[...'hi']`로 대비.
- 객체 패턴의 상속 프로퍼티: 패턴은 GetV로 체인을 따라 읽지만 객체 rest·스프레드는 자기 키만 → 예제 8에서 둘을 함께 보인다. 혼동 서술 주의.
- 매개변수 기본값 세부를 앞서 설명(보류 후보와 겹침) → `= {}`가 `undefined`일 때 쓰인다는 것만, 나머지는 simplifications.
- '객체' 검색 고정값 누락 → 4절 navigation.spec 목록과 단계 4 완료 조건(e2e navigation 통과).
- dev 서버가 `./meta` 실패를 캐시 → 생성 순서 meta → content → route, 이후 dev 서버 재시작.
- 표가 375px에서 페이지 가로 스크롤을 만듦 → region `overflow-x-auto`, responsive e2e.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "spread-destructuring|스프레드와 디스트럭처링|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스(a11y 라이트·다크, 가로 스크롤 데스크톱·모바일, 홈 학습 순서 보기)가 모두 잡히는지 확인.
- 정확성: 예제 10개 실제 출력 = `expectedOutput`(처음엔 `[]`로 두고 실행 결과로 채움, 2절 표와 같아야 함), concept.test 통과·음성 확인(표 칸 하나의 result를 바꾸면 실패), 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 참고 링크 전부 200.
- 브라우저(build + start, 375px·다크)
  1. `/concepts/spread-destructuring` → 페이지 가로 스크롤 없음, 기본값 표가 region 안에서만 가로 스크롤되고 Tab으로 포커스된다.
  2. 표의 `null` 행이 `null` / `null` / `'D'` / `'D'`, `0` 행이 `0` / `0` / `0` / `'D'`로 보인다.
  3. 퀴즈 10개 중 하나를 골라 '정답 확인' → 정답·해설이 보인다. 프리렌더 HTML에서 `<details>` 정답이 보인다.
  4. 하단 학습 순서 '34 / 34', 이전 iterable-for-of. iterable-for-of 하단 '33 / 34', 다음 spread-destructuring.
  5. 홈 검색 '객체' → 13개, 학습 순서 보기에서 마지막 카드 '34번째' 새 제목.

## 7. 미확정 사항

- 없음. 제목·표 열 이름·퀴즈 문구·summary 문장은 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(10개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경: 부록 초안 10개를 그대로 옮긴다. `meta.ts`는 3절 meta대로(examples는 처음엔 `expectedOutput: []`, 실행 결과로 채움). `route.tsx`는 symbol 템플릿 복사.
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route, 그다음 dev 서버 재시작(실행 중인 백그라운드 `npm run dev`를 멈추고 다시 띄움). 예제 파일은 부록 그대로, 주석 없이, 파일 끝 줄바꿈 하나. 예제 폴더는 Prettier·ESLint 제외 대상이라 줄 번호가 바뀌지 않는다.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표. 참고 링크 전부 200. dev 서버에서 `/concepts/spread-destructuring`이 200.

### 2. 기본값 표 데이터와 테스트

- 대상: `default-table.ts`, `concept.test.ts`
- 변경: 3절의 데이터와 테스트 ①·②.
- 주의사항: probe는 칸마다 `setup`부터 새 컨텍스트에서 실행. SyntaxError 검사는 실행하지 말고 `new Script(code)`로 컴파일만 한다(다른 realm 오류라 `name`으로 비교).
- 완료 조건: `npx vitest run app/concepts/spread-destructuring` 통과(표 7행 × 4칸 = 28칸 + 본문 주장 16개). 음성 확인(칸 하나의 result를 바꾸면 실패) 후 원복. lint·typecheck 통과.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2(`동작 원리`·`예제`·`결과와 이유`). 첫 문단(도입): 질문 "`var { v = 'D' } = { v: null }`의 `v`는 왜 `'D'`가 아니라 `null`일까" + 페이지 구성 + 전제 개념 링크(1절 링크 목록) + 별도 개념. 동작 원리 h3: 1절 주제 ①~⑪ 순서(⑪ "기본값 표로 정리"에 표). 예제 10개마다 PredictQuiz. 결과와 이유는 예제별 h3(줄 번호로 설명). 오해 Callout 4개: "스프레드하면 중첩 객체까지 새로 만들어진다", "기본값은 값이 없거나 falsy일 때 쓰인다", "객체 스프레드와 Object.assign은 같다", "디스트럭처링은 null이면 기본값을 쓴다". 예제 절 첫 문단은 symbol처럼 console은 호스트 API, sloppy mode, 여러 줄 출력은 ' / '로 이음.
- 주의사항: '찾히다' 금지, 뒷장 내용은 "별도 개념"으로만, 원인은 3절 축과 2절 명세 근거대로, 공백 든 인라인 코드는 Prettier 깨짐 확인(필요하면 `<code>{"..."}</code>`).
- 완료 조건: `npm test` 통과(개수 고정 테스트는 단계 4 대상이라 이 시점 실패 허용 — 실패 목록이 `concepts.test.ts`·`ConceptPager.test.tsx`의 고정값 케이스뿐인지 확인), 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0, '복사|참조|공유' grep 결과가 5절 기준을 지킴.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- 배열 스프레드가 구멍을 `undefined`인 자기 프로퍼티로 채우는 동작(`[...[1, , 3]]`, `1 in` 결과 true) — `array-index-length`·`iterable-for-of`와 이어지는 짧은 추가 게시글이나 이후 보충 후보.
- 매개변수 기본값 추가 게시글(로드맵 보류 목록 그대로) — 이 페이지의 ⑩과 연결.
- 기존 페이지의 "스프레드·디스트럭처링은 별도 개념" 문구 역방향 링크(사용자 결정대로 나중에 일괄).

## 변경 이력

- 2026-11-03 (외부 콘텐츠 검토 1회, 8건 — 모두 실행·명세로 확인 후 반영): ① "명세에 복사 단계가 없다"가 CopyDataProperties 이름과 충돌 → "CopyDataProperties도 값을 Get으로 읽어 정의할 뿐, 읽은 객체를 새로 만드는 단계는 없다"로(본문·simplifications) ② summary·얕은 복사 절을 배열·객체 리터럴의 스프레드로 한정(인수 스프레드 제외) ③ 재할당이 원본에 영향 없는 이유를 "원시 값이라서"가 아니라 "새 객체의 프로퍼티만 바꿔서"로 ④ 객체 스프레드는 정의라서 리터럴 앞에 같은 이름의 setter가 있어도 부르지 않고 데이터 프로퍼티로 바뀜(실행: 호출 get뿐, writable true) ⑤ 문자열 스프레드는 그릇뿐 아니라 단위도 다름(인덱스 키=코드 유닛, 이터레이터=코드 포인트, `'😀'` 2 vs 1) ⑥ `Math.max(nums)`의 NaN 원인을 ToNumber가 `'3,1,2'`를 만드는 것으로(`Math.max([7])`은 7) ⑦ `3 * null`이 0인 이유(`*`가 null을 0으로 바꿈) ⑧ 기본값 절에 명세 용어 정의(undefined value / null value)를 근거로 한 해석 단락 추가 — 명세가 설계 의도를 밝히지 않았다는 점을 함께 씀. 새 주장은 concept.test 근거 테스트 추가. 산문 수정이라 메인이 직접 반영 — 영향 단계 2·3

## 부록: 예제 초안

`/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/sd/ex/`의 파일과 같다(2026-11-03 실행 확인).

#### `spread-basics.js`

```js
var nums = [3, 1, 2];
var more = [0, ...nums, 4];
console.log(JSON.stringify(more), more.length);
console.log(Math.max(...nums), Math.max(nums));
var base = { a: 1, b: 2 };
var over = { ...base, b: 20 };
var under = { b: 20, ...base };
console.log(JSON.stringify(over), JSON.stringify(under));
```

#### `shallow.js`

```js
var user = { name: 'Kim', tags: ['a'] };
var copy = { ...user };
copy.name = 'Lee';
copy.tags.push('b');
console.log(user.name, copy.name);
console.log(JSON.stringify(user.tags), copy.tags === user.tags);
var list = [{ n: 1 }];
var listCopy = [...list];
listCopy[0].n = 2;
console.log(list[0].n, listCopy === list, listCopy[0] === list[0]);
```

#### `spread-vs-assign.js`

```js
var calls = [];
var source = {
  get value() { calls.push('get'); return 1; }
};
var target = {
  set value(v) { calls.push('set ' + v); }
};
Object.assign(target, source);
console.log(calls.join(','), typeof Object.getOwnPropertyDescriptor(target, 'value').set);
calls = [];
var copy = { ...source };
var desc = Object.getOwnPropertyDescriptor(copy, 'value');
console.log(calls.join(','), desc.value, typeof desc.get);
```

#### `what-is-copied.js`

```js
var proto = { inherited: 1 };
var obj = Object.create(proto);
obj.own = 2;
Object.defineProperty(obj, 'hidden', { value: 3 });
var copy = { ...obj };
console.log(JSON.stringify(Object.keys(copy)), copy.inherited, 'hidden' in copy);
console.log(JSON.stringify({ ...null }), JSON.stringify({ ...undefined }));
console.log(JSON.stringify({ ...'hi' }), JSON.stringify([...'hi']));
```

#### `destructuring-basics.js`

```js
var point = [10, 20, 30];
var [x, , z] = point;
console.log(x, z);
var user = { name: 'Kim', age: 30 };
var { name, age: years, email } = user;
console.log(name, years, email);
var { address: { city } } = { address: { city: 'Seoul' } };
console.log(city);
```

#### `default-undefined.js`

```js
var { a = 'D', b = 'D', c = 'D', d = 'D' } = { a: undefined, b: null, c: 0 };
console.log(a, b, c, d);
var [e = 'D', f = 'D'] = [undefined, null];
console.log(e, f);
var { g = 'D' } = { g: '' };
console.log(JSON.stringify(g), JSON.stringify('' || 'D'), JSON.stringify(null ?? 'D'));
```

#### `default-lazy.js`

```js
var count = 0;
function next() {
  count += 1;
  return count;
}
var { p = next(), q = next() } = { p: 'given' };
console.log(p, q, count);
var [first = 1, second = first * 10] = [];
console.log(first, second);
```

#### `rest.js`

```js
var [head, ...tail] = [1, 2, 3];
console.log(head, JSON.stringify(tail), Array.isArray(tail));
var proto = { inherited: 'P' };
var src = Object.create(proto);
src.a = 1;
src.box = { n: 1 };
var { inherited, a, ...others } = src;
console.log(inherited, a, JSON.stringify(others), others.inherited);
others.box.n = 2;
console.log(src.box.n, others.box === src.box);
```

#### `primitive-source.js`

```js
var { length } = 'hello';
var [c1, c2] = 'hi';
console.log(length, c1, c2);
var { toFixed } = 5;
console.log(typeof toFixed);
```

#### `params-swap.js`

```js
function area({ width = 1, height = 1 } = {}) {
  return width * height;
}
console.log(area({ width: 3 }), area({ width: 3, height: null }), area());
var a = 1;
var b = 2;
[a, b] = [b, a];
console.log(a, b);
var x, y;
({ x, y } = { x: 'X', y: 'Y' });
console.log(x, y);
```


## 구현 진행

- baseline (2026-11-03, `1d99e41`): lint·format:check·typecheck 통과 / `npm test` 99 files·3085 tests 통과. test:build·e2e는 단계 4 이후 실행(직전 커밋에서 통과).
- 단계 1~3(개념 폴더)과 단계 4(고정 테스트·문서)는 파일이 겹치지 않아 Sonnet 서브에이전트 2개에 병렬 위임.
- [x] 1. 예제·meta·route — 예제 10개가 scratchpad 초안과 바이트 단위로 같음(diff), `expectedOutput` = 2절 표, 참고 링크 16개 200(서브에이전트 확인), dev 서버 재시작 후 `/concepts/spread-destructuring` 200
- [x] 2. 기본값 표 데이터와 테스트 — `npx vitest run app/concepts/spread-destructuring` 45 tests(28칸 + TypeError 9 + SyntaxError 3 + 파싱 1 + 기타 3 + 구조 1), 음성 확인(null 행 칸 변경 시 1건 실패) 후 원복
- [x] 3. 본문 — 메인이 결과·원인 문장과 줄 번호를 2절 명세 발췌·예제와 대조. 메인 수정 2곳: 오해 Callout의 "복사본의 프로퍼티" → "새 객체의 프로퍼티", "요소 값이 null일 때" → "패턴에서 읽은 값이 null일 때". '찾히'·'참조'·'공유' 0건, '복사'는 관용 용어 소개·simplifications·깊은 복사·소제목뿐. 표 열 머리글은 symbol 표처럼 `<code>` 없이 문자열(한글·코드 혼합이라 nowrap 시 열이 지나치게 넓어짐 — 서브에이전트 판단, 메인 수용)
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 확인(개수 34, 마지막 개념, pager 분모, '객체' 검색 13·순위 '34', 새 케이스 추가만)
- 전체 검증(2026-11-03): lint·format:check·typecheck 통과, `npm test` 100 files·3152 tests, `test:build` 279 tests, e2e navigation 16 + 새 개념 8(`--list`로 확인) 통과. dev 서버 375px 다크: 표 region 포커스·페이지 overflow 0·null 행 `null null 'D' 'D'`, 예제 6 퀴즈 정답 표시, pager 34/34(이전 iterable-for-of)·33/34(다음 spread-destructuring), 홈 '객체' 검색 13개·마지막 34번째
- 메인 보완: 4절 목록의 `.claude/plans/concept-roadmap-ch25-37.md`(10번 상태·진행 기록)가 단계 4 위임에서 빠져 메인이 직접 반영.
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High 0 · Medium 0 · Low 2(보고만 — summary에 Object.assign·rest 문장 생략, 표 열 머리글 `<code>` 미적용)
- 외부 검토 8건 반영(2026-11-03, 변경 이력 참고): 반영 전 실행 확인 — `copy.tags = []` 뒤 원본 `["a"]`, 리터럴 앞 setter + 스프레드는 호출 `get`뿐·`writable` true, `'😀'` 객체 스프레드 키 2·배열 스프레드 1, `Math.max([7])` 7·`String([3,1,2])` `3,1,2`, `3 * null` 0, 명세 4.4.13·4.4.15 정의 원문 확인. related에 `type-coercion`·`string-utf16` 추가(본문에 링크가 생겨서), references에 undefined value·null value 추가(200). 이모지는 실제 문자 바이트로 들어감(이스케이프 없음). 재검증: lint·format:check·typecheck 통과, `npm test` 3157, `test:build` 279, e2e navigation 16 + 새 개념 8 통과
- 마무리(2026-11-03): 사용자 최종 승인(콘텐츠 검토 승인 포함) → `reviewedAt` 2026-11-03 기록, 로드맵 10번 완료 처리. 리뷰 Low 2건은 사용자가 별도 지시 없이 승인해 그대로 둠

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현. 달라진 점: ① 표 열 머리글은 `<code>` 없이 문자열(한글·코드 혼합이라 nowrap 시 열이 지나치게 넓어짐, symbol 표와 같음) ② summary를 두 문장으로 줄임(Object.assign·rest 문장 생략) ③ 외부 검토 8건 반영(변경 이력) — related에 `type-coercion`·`string-utf16`, references에 undefined value·null value 추가, 근거 테스트 5개 추가 ④ 로드맵 문서 갱신은 단계 4 위임에서 빠져 메인이 반영

### 코드 리뷰

- critical-code-review(메인 직접): Critical/High/Medium 0, Low 2(위 ①②)는 사용자 승인으로 그대로 둠. 외부 콘텐츠 검토 8건(중 1·낮음 7)은 모두 실행·명세 확인 후 반영

### 후속 작업

- [ ] 배열 스프레드가 구멍을 `undefined` 자기 프로퍼티로 채우는 동작 — 추가 게시글/보충 후보(9절)
- [ ] 매개변수 기본값 추가 게시글(로드맵 보류 목록)
- [ ] 기존 페이지 "스프레드·디스트럭처링은 별도 개념" 문구의 역방향 링크(사용자 결정대로 나중에 일괄)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 기본값 규칙의 "왜"를 명세 용어 정의(undefined value: 값이 할당되지 않았을 때 쓰이는 값 / null value: 객체 값이 의도적으로 없음)를 근거로 한 **해석**으로 쓰고, "명세가 밝힌 설계 의도는 아니다"라고 명시했다. 검토 제안의 "null은 코드가 의도적으로 넣은 값"은 쓰지 않았다 — 내장 함수도 null을 돌려주므로(예: 일치하지 않는 match) 사실로 단정할 수 없다.
- [Claude 판단] `'😀'`의 코드 유닛/코드 포인트 차이는 예제 4를 바꾸지 않고 본문 문장 + 근거 테스트로 넣었다. 예제를 바꾸면 expectedOutput·퀴즈·줄 번호 설명이 함께 바뀌고, JSON 출력의 `\uD83D` 같은 이스케이프가 도구 입력에서 실제 문자로 풀리는 사고 위험도 있어 `length` 비교(2 vs 1)만 썼다.
- [Claude 판단] 외부 검토 8건은 산문 몇 줄 수정이라 서브에이전트에 위임하지 않고 메인이 직접 반영했다(명세 문구를 정확히 맞춰야 해서).
- [무검토 승인] 기본값 표를 7행(없음·undefined·null·0·''·false·NaN) × 4열(객체 패턴·배열 패턴·`??`·`||`)로 설계했다. falsy 행이 있어야 "기본값 ≠ `||`"를, `??` 열이 있어야 "null 행에서만 갈린다"를 함께 보일 수 있다.
- [무검토 승인] summary에 '객체'가 들어가 홈 '객체' 검색 결과가 12→13개가 되는 것을 받아들이고 e2e 기대값을 바꿨다.
- [무검토 승인] 표 열 머리글을 `<code>`로 감싸지 않았다(Low로 보고, 지시 없이 승인).
- 추가 주제 4개 모두 포함, 표 + 퀴즈, 제목 "기본값은 왜 null일 때 쓰이지 않을까"는 사용자 결정.

#### 배경지식

- 같은 `...`이라도 배열 리터럴(ArrayAccumulation)·함수 인수(ArgumentListEvaluation)는 GetIterator로 이터레이터를 쓰고, 객체 리터럴은 CopyDataProperties로 자기 열거 가능 프로퍼티를 읽는다. 그래서 `{...null}`은 `{}`이지만 `[...null]`은 TypeError다.
- 객체 스프레드는 새 객체에 CreateDataPropertyOrThrow(정의), `Object.assign`은 대상에 Set(대입). 정의는 setter를 부르지 않는다.
- 디스트럭처링 기본값은 KeyedBindingInitialization·IteratorBindingInitialization의 "Initializer가 있고 값이 undefined이면" 조건으로만 평가된다. 키가 없는 경우도 GetV가 undefined를 돌려줘서 같은 조건에 걸린다.
- 객체 패턴은 먼저 RequireObjectCoercible로 null·undefined를 막고, 원시 값은 GetV의 ToObject로 래퍼를 거쳐 읽는다. 패턴 이름은 GetV라 체인을 따라 읽지만 객체 rest는 CopyDataProperties라 자기 프로퍼티만 담는다.

#### 확인 질문

1. `{ ...null }`은 `{}`인데 `[...null]`은 왜 TypeError일까?
   <details><summary>답</summary>객체 스프레드는 CopyDataProperties가 출처가 undefined·null이면 바로 반환하고, 배열 스프레드는 ArrayAccumulation이 GetIterator를 불러 null에서 메서드를 꺼내다 TypeError가 난다(계획 2절, 본문 "무엇이 펼쳐지지 않을까").</details>
2. 기본값 표에서 디스트럭처링 열과 `??` 열이 갈리는 행은 어디이고, `||` 열이 따로 갈리는 행은 어디인가? 표에 `??`·`||` 열을 둔 이유는?
   <details><summary>답</summary>`null` 행에서 디스트럭처링(null)과 `??`('D')가 갈리고, `0`·`''`·`false`·`NaN` 행에서 `||`만 'D'가 된다. 기본값 조건이 "falsy"도 "null·undefined"도 아닌 "undefined 하나"라는 것을 비교로 보이려고(`default-table.ts`, 본문 표 아래 문단).</details>
3. 기본값 규칙의 이유를 설명하면서 "null은 코드가 일부러 넣은 값이라서"라고 단정하지 않은 이유는?
   <details><summary>답</summary>명세는 기본값 규칙의 설계 의도를 밝히지 않았고, 내장 함수도 null을 돌려주므로 "코드가 넣은 값"은 사실이 아니다. 그래서 명세 용어 정의를 근거로 한 해석이라고 밝혀 썼다(변경 이력 ⑧, 본문 기본값 절).</details>
4. `{ set value(v) {}, ...source }`에서 setter가 불리지 않는 이유는? `Object.assign`이라면?
   <details><summary>답</summary>객체 스프레드는 CreateDataPropertyOrThrow로 정의하므로 setter를 부르지 않고 그 자리를 데이터 프로퍼티로 바꾼다. `Object.assign`은 Set으로 대입해 setter를 부른다(본문 "객체 스프레드와 Object.assign", concept.test 근거 테스트).</details>
5. `var { inherited, ...others } = src`에서 `inherited`는 상속값을 읽는데 `others.inherited`는 왜 undefined인가?
   <details><summary>답</summary>패턴의 이름은 KeyedBindingInitialization의 GetV로 프로토타입 체인까지 읽지만, rest는 RestBindingInitialization이 CopyDataProperties로 자기 열거 가능 프로퍼티만 정의한다(예제 8, 계획 1절 ⑧).</details>
