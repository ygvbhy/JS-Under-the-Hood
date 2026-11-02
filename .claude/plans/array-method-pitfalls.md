# 개념 '배열 메서드의 함정' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `3c2dac0`

## 0. 요약

- 목적: 25~37장 로드맵 5번 `/concepts/array-method-pitfalls`를 추가한다. 27장 배열 메서드에서 결과가 예상과 다른 지점(기본 `sort`의 문자열 비교, 원본을 바꾸는 메서드와 새 배열을 만드는 메서드, 반환값, `indexOf`와 `includes`의 비교 방식, `sort`의 `undefined`·구멍·안정성, 구멍을 만난 콜백 메서드와 `reduce` 초기값, ES2023 복사 메서드)을 예제 7개와 표·퀴즈로 명세 동작에 근거해 보인다.
- 범위: 새 개념 폴더 1개(category `objects`, order 270으로 학습 순서 29번째·마지막, 시뮬레이터 없음). 마지막 개념이 바뀌므로 개수·마지막 개념을 고정한 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 28개는 바꾸지 않는다.
- 위험: ① 기본 `sort`를 "숫자를 문자열로 바꿔 저장한다"처럼 잘못 설명하거나 비교 순서·횟수(구현 정의)를 사실처럼 쓰는 것 ② 복사 메서드를 "깊은 복사"로 오해시키는 것 → 원인은 명세 절차(CompareArrayElements, HasProperty/Get, ArrayCreate)로 쓰고, 표 칸은 probe로 테스트가 대조한다.
- 복잡도: 중간 · Consensus: 생략. arrow-functions·class-basics와 같은 "표 데이터 + probe 근거 테스트" 패턴이고 공통 코드를 바꾸지 않는다. 예제 출력과 핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 없음(범위·시각화·slug는 2026-11-02 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 5번 "배열 메서드의 함정"(27장)을 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-02)
  - 콜백 메서드는 **함정만** 다룬다. 고차 함수의 기본 사용법은 짧게 쓰고, 구멍을 만났을 때(map은 구멍 유지, forEach는 건너뜀)와 초기값 없는 `reduce`만 자세히 다룬다.
  - 로드맵 세 핵심 외에 **ES2023 복사 메서드**, **sort의 undefined와 안정성**, **반환값 함정**을 넣는다.
  - 시각화: 표 + 퀴즈(시뮬레이터 없음).
  - slug `array-method-pitfalls`, 제목 '배열 메서드의 함정: 원본은 언제 바뀌고 무엇으로 비교할까'.
- 주제(본문 h3 순서)
  - ① 기본 `sort`는 문자열로 비교한다: 비교 함수가 없으면 두 값을 ToString한 문자열을 코드 유닛 순서로 비교한다. 배열의 요소는 숫자 그대로 남는다(문자열로 바뀌어 저장되지 않는다). `[-1, -2, 3]`도 그대로이고, 대문자가 소문자 앞에 온다. 숫자 정렬은 `(a, b) => a - b`. 비교 함수가 불리언(`a > b`)을 반환하면 일관된 비교자(consistent comparator)가 아니어서 결과 순서를 명세가 정하지 않는다(출력 예제 없음, 문장만).
  - ② 원본을 바꾸는 메서드와 새 배열을 만드는 메서드: `sort`·`reverse`는 원본을 바꾸고 그 배열 자신을 반환한다(`sorted === original`). `slice`·`map`은 새 배열을 만들고 원본은 그대로다.
  - ③ 반환값 함정: `push`는 새 `length`, `pop`은 꺼낸 요소, `splice`는 지운 요소들의 새 배열, `forEach`는 `undefined`.
  - ④ ES2023 복사 메서드: `toSorted`·`toReversed`·`toSpliced`·`with`는 원본을 바꾸지 않고 새 배열을 반환한다. `with`는 음수 인덱스를 뒤에서 세고 범위를 벗어나면 RangeError. 새 배열의 요소는 원래 배열에서 읽은 값이라, 요소가 객체면 같은 객체다(새 배열이 생겨도 요소 객체가 새로 생기지 않는다). 책 출간 이후 추가된 메서드임을 밝힌다.
  - ⑤ `sort`와 `undefined`·구멍·안정성: `undefined`는 비교 함수와 상관없이 끝으로 가고(비교 함수에 넘어가지 않는다), 구멍은 그 뒤에 구멍으로 남는다. 비교 결과가 같은 요소는 원래 순서를 유지한다(ES2019부터 명세가 안정 정렬을 요구).
  - ⑥ `indexOf`와 `includes`: `indexOf`는 IsStrictlyEqual(`===`)이라 `NaN`을 못 찾고, `includes`는 SameValueZero라 찾는다. 둘 다 `+0`과 `-0`은 같다고 본다. 구멍은 `indexOf`가 건너뛰고(HasProperty) `includes`는 `undefined`로 읽는다(Get).
  - ⑦ 구멍을 만난 콜백 메서드와 `reduce`: `forEach`·`map`은 구멍에서 콜백을 부르지 않고, `map` 결과는 같은 `length`에 같은 자리가 구멍이다. 복사 메서드(`toSorted`)는 구멍을 `undefined`로 읽어 채운다. `reduce`는 초기값이 없으면 첫 요소를 초기값으로 쓰고, 빈 배열이면 TypeError, 요소가 하나면 콜백을 부르지 않는다.
- 이미 다룬 내용은 요약하고 링크한다: 인덱스·`length`·구멍은 [배열은 객체다](/concepts/array-index-length), `NaN`·`+0/-0`과 `===`는 [동등 연산자](/concepts/equality-operators), 같은 객체를 값으로 가진다는 것은 [원시 값과 객체](/concepts/primitives-and-objects), 콜백으로 쓰는 화살표 함수는 [화살표 함수와 메서드 축약](/concepts/arrow-functions), 문자열 변환은 [암묵적 타입 변환](/concepts/type-coercion).

### 유지해야 하는 기존 동작

- 기존 개념 28개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다. array-index-length의 "배열 메서드는 별도 개념" 문구도 그대로 둔다(역방향 연결은 나중에 일괄 처리 — 사용자 결정).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다.

### 제외 범위

- 고차 함수 하나하나의 사용법(`filter`·`some`·`every`·`find`·`flat`·`flatMap` 등)과 `thisArg`
- `Symbol.species`·ArraySpeciesCreate의 하위 클래스 동작, 메서드를 유사 배열에 빌려 쓰는 것(generic), 콜백 안에서 배열을 바꾸는 경우
- `localeCompare`·`Intl.Collator`, 유니코드 정규화(문자열 비교의 세부는 32장 후보)
- 스프레드·`Array.from`·이터러블(34~35장), 깊은 복사·`structuredClone`
- 정렬 알고리즘과 비교 횟수(명세가 정하지 않음)

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안 ES2027, 2026-11-02 내려받아 확인)

- `Array.prototype.sort`(`#sec-array.prototype.sort`): `SortIndexedProperties(obj, length, sortCompare, skip-holes)`로 정렬한 값을 0부터 Set하고, 남은 인덱스는 DeletePropertyOrThrow로 지워 구멍 수를 유지한 뒤 `obj`를 반환한다. Note 1: "undefined property values always sort to the end of the result, followed by non-existent property values."
- SortIndexedProperties(`#sec-sortindexedproperties`): 정렬은 "an implementation-defined sequence of calls to sortCompare". sortCompare가 일관된 비교자가 아니면 순서가 구현 정의. 비교 결과가 0인 요소는 원래 순서를 유지 — "i.e., the sort is stable". 일관된 비교자 조건: 같은 쌍에 같은 Number(NaN 아님), 대칭(a =C b면 b =C a), 추이 등.
- CompareArrayElements(`#sec-comparearrayelements`): 둘 다 undefined면 +0, x가 undefined면 1, y가 undefined면 -1(여기까지 comparator를 부르지 않음). comparator가 있으면 `ToNumber(Call(comparator, undefined, « x, y »))`, NaN이면 +0. 없으면 `ToString(x)`·`ToString(y)`를 `IsLessThan(xString, yString, true)`로 비교.
- `indexOf`(`#sec-array.prototype.indexof`): HasProperty가 true인 인덱스만 Get해 IsStrictlyEqual로 비교, 없으면 -1.
- `includes`(`#sec-array.prototype.includes`): 모든 인덱스를 Get해 SameValueZero로 비교. Note 3: indexOf와 두 가지가 다르다 — SameValueZero로 NaN을 찾고, 구멍을 건너뛰지 않고 undefined로 다룬다.
- `push`(`#sec-array.prototype.push`): "It returns the new length of the array." `splice`(`#sec-array.prototype.splice`): "It returns an Array containing the deleted elements". `reverse`(`#sec-array.prototype.reverse`): "It returns the reversed array"(`obj` 자신).
- `map`(`#sec-array.prototype.map`): `ArraySpeciesCreate(obj, length)` 후 HasProperty가 true인 인덱스에만 콜백을 부르고 CreateDataPropertyOrThrow → 같은 length, 구멍 자리는 비어 있음. `forEach`(`#sec-array.prototype.foreach`): 같은 HasProperty 검사, `undefined` 반환.
- `reduce`(`#sec-array.prototype.reduce`): "If length = 0 and initialValue is not present, throw a TypeError exception." 초기값이 없으면 처음 있는 요소를 accumulator로 쓰고, 있는 요소가 없으면 TypeError.
- `toSorted`(`#sec-array.prototype.tosorted`): `ArrayCreate(length)`, `SortIndexedProperties(…, read-through-holes)` → 구멍을 Get(undefined)으로 읽어 새 배열에 채운다. `toReversed`·`toSpliced`·`with`도 ArrayCreate한 새 배열에 Get한 값을 CreateDataPropertyOrThrow. `with`(`#sec-array.prototype.with`): `ToAbsoluteIndex(index, length)`(음수는 length에 더함) 후 `actualIndex < 0 or actualIndex ≥ length`면 RangeError.
- `slice`(`#sec-array.prototype.slice`): ArraySpeciesCreate한 새 배열에 HasProperty가 true인 요소만 담는다.
- 구현 단계 1에서 확인: ES2023 판(`https://262.ecma-international.org/14.0/`)에 `toSorted`가 있고 ES2022 판에 없는지, ES2019 판에서 안정 정렬 요구가 들어갔는지. 확인되지 않으면 페이지에서 연도를 쓰지 않는다.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, 예제마다 새 컨텍스트, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/49c95a79-8449-45bc-806b-77d0e59b9bf0/scratchpad/am/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `default-sort.js` | `[1,10,9]` / `[-1,-2,3]` / `[1,9,10]` / `["B","a","b"]` |
| 2 `mutating-methods.js` | `true [1,2,3]` / `true [3,2,1]` / `false [2,1] [3,2,1]` / `[6,4,2] [3,2,1]` |
| 3 `return-values.js` | `3 ["a","b","c"]` / `c ["a","b"]` / `["a"] ["x","y","b"]` / `undefined` |
| 4 `copy-methods.js` | `[10,20,30] [30,10,20]` / `[20,10,30] [10,20]` / `[30,10,99] [30,10,20]` / `RangeError` / `false lee` |
| 5 `undefined-and-stable.js` | `4 [1,3,null,null] true false` / `0` / `BDAC` |
| 6 `search-nan.js` | `-1 true` / `2 true` / `-1 true` |
| 7 `holes-and-reduce.js` | `2 3 false [2,null,6]` / `3 true true` / `6 16` / `TypeError` / `0 5` |

- 예제 5의 `[1,3,null,null]`은 JSON이 `undefined`와 구멍을 모두 `null`로 쓰기 때문이고, 뒤의 `2 in mixed`(true, undefined 값)와 `3 in mixed`(false, 구멍)로 둘을 구분한다.
- 예제 5의 `BDAC`(같은 나이끼리 원래 순서)는 명세가 안정 정렬을 요구하므로 고정된 결과다. 비교 순서·횟수는 구현 정의라 예제로 보이지 않는다.

### 사실 (코드에서 확인)

- 표 + probe 근거 테스트 패턴: `app/concepts/arrow-functions/comparison.ts:1-11`(`Cell = { text, probe, expected }`, 행에 `exampleId`), `app/concepts/arrow-functions/concept.test.ts:16-80`(본문 주장 describe, 칸마다 probe describe). route 템플릿 `app/concepts/arrow-functions/route.tsx`.
- 현재 마지막 개념은 array-index-length(order 260, 28번째, `app/concepts/array-index-length/meta.ts:9`). order 270이면 29번째이자 마지막.
- array-index-length가 미룬 것: "`push`·`map` 같은 배열 메서드… 별도 개념"(`app/concepts/array-index-length/content.mdx:6`), "`forEach` 같은 배열 메서드가 어느 쪽인지는 메서드마다 다르며 별도 개념"(`:54`).
- `NaN === NaN`이 false, `0 === -0`이 true, `Object.is`는 equality-operators가 다룸(`app/concepts/equality-operators/content.mdx:17-18`, `:102-104`). SameValueZero는 아직 어느 페이지에도 없다(이 페이지가 처음 정의한다).
- "같은 객체를 값으로 갖는다" 표현: `app/concepts/primitives-and-objects/content.mdx:13-17`(복사/참조 비유를 쓰지 않는 원칙).
- 고정값(현재)
  - `tests/e2e/navigation.spec.ts`: 카드 28(`:78`, `:122`), 마지막 '28번째'와 array-index-length 제목(`:84-87`), '객체' 검색 순위 `[… '26', '28']`(`:98`), pager '1 / 28'(`:148`)·'22 / 28'(`:158`)·'24 / 28'(`:172`)·'25 / 28'(`:186`)·'26 / 28'(`:200`)·arrow-functions '27 / 28'(`:214`)·array-index-length '28 / 28'과 링크 1개(`:228-230`)
  - `tests/e2e/responsive.spec.ts:783` 홈 학습 순서 카드 28
  - `app/lib/concepts.test.ts:104`, `:107-113`: total 28, 마지막 array-index-length(prev arrow-functions, position 28)
  - `app/components/concept/ConceptPager.test.tsx:18`, `:26-34`: '1 / 28', 마지막 array-index-length '28 / 28'과 이전 링크 arrow-functions
- e2e 등록 위치: `tests/e2e/helpers.ts:50` 경로 상수, `tests/e2e/a11y.spec.ts`(arrow-functions 페이지 axe 케이스와 같은 모양), `tests/e2e/responsive.spec.ts:751`(가로 스크롤 케이스), 빌드 테스트 `tests/build/build-output.test.ts:737-`(array-index-length 프리렌더 describe), 문서 `docs/content-guide.md:167` e2e 목록.
- 검색은 title·summary·tags 포함 여부(`app/lib/concepts.ts:70-78`).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "배열 메서드의 결과가 예상과 다른 이유는 메서드마다 명세가 정한 세 가지 — 원본에 쓰는지(Set/Delete) 새 배열을 만드는지(ArrayCreate), 무엇으로 비교하는지(문자열 비교, IsStrictlyEqual, SameValueZero), 구멍을 건너뛰는지(HasProperty) 읽는지(Get) — 가 다르기 때문이다". 이 세 질문을 도입에 두고 각 h3가 하나씩 답한다.
- 원인 서술은 명세 용어로 쓴다. 기본 sort는 "요소를 문자열로 바꾼다"가 아니라 "비교할 때 두 값의 문자열 표현을 비교한다(요소는 그대로)". 복사 메서드는 "복사한다"는 메서드 이름 수준의 표현만 쓰고, 결과는 "새 배열을 만들어 원래 배열에서 읽은 값을 넣는다 — 요소가 객체면 같은 객체"로 설명한다(primitives-and-objects 표현과 맞춤). 비교 순서·횟수는 명세가 정하지 않는다고 밝힌다.
- 표 `methods.ts`: 행 = 메서드 12개(`push`, `pop`, `splice`, `sort`, `reverse`, `slice`, `map`, `forEach`, `toSorted`, `toReversed`, `toSpliced`, `with`), 열 = "원본을 바꾸나" / "반환값". 칸은 `{ text, probe, expected }`, 행에 `exampleId`. probe 방식:
  - 원본 열: `var a = [3, 1, 2]; a.<호출>; JSON.stringify(a)` → 바꾸는 메서드는 바뀐 배열, 바꾸지 않는 메서드는 `[3,1,2]`. text는 "바꿈"/"바꾸지 않음".
  - 반환값 열: `var a = [3, 1, 2]; var r = a.<호출>; <판정식>` — 새 length(`String(r)` → `4`), 꺼낸 요소, 지운 요소 배열(`JSON.stringify(r)`), 원본 자신(`String(r === a)` → `true`), 새 배열(`String(Array.isArray(r) && r !== a)` → `true`), `undefined`(`String(r)`).
  - 구현 단계 2에서 전부 실행해 확정한다. 표 아래 문장에 "바꾸는 메서드의 짝"(sort↔toSorted, reverse↔toReversed, splice↔toSpliced, 인덱스 대입↔with)을 쓴다.
- `concept.test.ts`: (a) 표 모든 칸 probe = expected (b) 표의 exampleId가 meta에 있음 (c) 본문 주장 근거 — 기본 sort 뒤에도 요소가 숫자(`typeof a[0] === 'number'`) / 구멍만 있는 배열(`[, ,]`)의 초기값 없는 reduce는 TypeError / `[1,,3].sort()` 뒤 `length` 3이고 `2 in a` false(구멍이 끝으로) / 비교 함수에 `undefined`가 넘어가지 않음(예제 5와 같은 근거, 비교 함수가 내림차순일 때도) / `[NaN].lastIndexOf(NaN)`은 -1(문장에 쓸 경우만).
- 장 범위: 27장까지 전제. 콜백은 26장 화살표 함수로 쓴다. 스프레드·`Array.from`·이터러블은 예제에 쓰지 않는다. 예제 5의 `people.map((p) => p.name).join('')`은 이름을 이어 붙이는 용도로만 쓴다고 본문에서 밝힌다.
- category `objects`(array-index-length와 같은 그룹), order 270. prerequisites: array-index-length, equality-operators, arrow-functions, primitives-and-objects. related: array-index-length, equality-operators, primitives-and-objects, type-coercion, arrow-functions.
- 버린 대안
  - ① sort 과정 시뮬레이터: 사용자 결정(표 + 퀴즈). 비교 순서가 구현 정의라 과정을 그리면 특정 엔진 동작처럼 보인다.
  - ② indexOf/includes 비교를 별도 표로: 예제 6과 퀴즈로 충분하고, 표 하나에 축이 섞이지 않게 한다.
  - ③ 비교 함수가 불리언을 반환하는 예제: 결과가 구현 정의라 "실제 실행 결과"를 주장할 수 없다. 문장으로만 쓴다.

## 4. 변경 파일

- 추가 `app/concepts/array-method-pitfalls/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `methods.ts`(표 데이터), `concept.test.ts`
  - `examples/`(7개): `default-sort.js`, `mutating-methods.js`, `return-values.js`, `copy-methods.js`, `undefined-and-stable.js`, `search-nan.js`, `holes-and-reduce.js`
- 수정
  - `tests/e2e/helpers.ts`: `ARRAY_METHOD_PITFALLS_PATH`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe 1개(arrow-functions 케이스와 같은 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 1개 추가, 홈 학습 순서 카드 28→29
  - `tests/e2e/navigation.spec.ts`: 카드 28→29(두 곳), 마지막 '29번째'와 새 제목, pager 분모 28→29(1·22·24·25·26·27), array-index-length는 '28 / 29'·링크 2개(이전 arrow-functions, 다음 array-method-pitfalls), 새 개념 '29 / 29'·이전 링크 array-index-length(1개). '객체' 검색 순위는 단계 4 판정
  - `app/lib/concepts.test.ts`: total 29, 마지막 array-method-pitfalls(prev array-index-length, position 29)
  - `app/components/concept/ConceptPager.test.tsx`: '1 / 29', 마지막 array-method-pitfalls '29 / 29'과 이전 링크 `/concepts/array-index-length`
  - `tests/build/build-output.test.ts`: array-method-pitfalls 프리렌더 describe(퀴즈 `<details` 7개 이상, 표 텍스트)
  - `docs/content-guide.md:167`: e2e 목록에 `array-method-pitfalls`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 5번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 28개

## 5. 위험 요소

- 기본 sort 원인 서술 오류("문자열로 바꿔 정렬한다" → 요소가 문자열이 되는 것처럼 읽힘) → 단계 3에서 "비교할 때 문자열 표현을 비교, 요소는 그대로"로 쓰고 (c) 테스트로 요소 타입을 확인.
- 구현 정의 동작을 사실처럼 씀(비교 순서·횟수, 불리언 비교 함수 결과) → 출력 예제를 두지 않고 "명세가 정하지 않는다"로 쓴다. 단계 3 완료 조건에서 대조.
- 복사 메서드를 깊은 복사로 오해 → 예제 4 마지막 줄(`false lee`)과 오해 Callout. '복사'라는 말은 메서드 분류 이름으로만 쓰고 결과 원인으로 쓰지 않는다(grep 확인).
- 연도 주장(ES2019 안정 정렬, ES2023 복사 메서드) 근거 부족 → 단계 1에서 판별 명세로 확인, 안 되면 연도 삭제.
- 호스트 차이: 복사 메서드는 오래된 브라우저에 없을 수 있다 → simplifications에 "예제는 ES2023 이후를 지원하는 환경 기준"을 쓴다(Node 24에서 확인).
- `undefined`와 구멍이 JSON에서 둘 다 `null` → 예제 5에서 `in`으로 구분하고 본문에서 설명(array-index-length 예제 7과 같은 근거).
- 표 칸 오류 → probe 대조 테스트 + 음성 확인(칸 하나를 바꾸면 실패).
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 4에서 고치고 `npm test`·e2e로 확인.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx(실행 중 dev 서버가 `./meta` 실패를 캐시하지 않게).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`, 이어서 e2e는 새 개념만 추가했으므로 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "array-method-pitfalls|배열 메서드의 함정|홈 학습 순서 보기"`(AGENTS.md e2e 범위).
- 정확성
  - 예제 7개의 실제 출력 = `expectedOutput`(처음엔 `[]`로 두고 실행 결과를 확인한 뒤 채움). 2절 표와 다르면 멈춘다.
  - `concept.test.ts` (a)~(c) 통과, 음성 확인.
  - 메인 에이전트가 본문의 결과·원인 문장을 2절과 대조하고, 줄 번호 언급을 예제 파일과 대조한다.
  - 참고 링크(명세 anchor, MDN ko — 없으면 en-US)를 실제로 열어 200과 내용을 확인한다.
- 브라우저(dev 서버 재시작 후 또는 `npm run build && npm run start`)
  1. `/concepts/array-method-pitfalls`를 375px로 연다 → 메서드 표(3열)가 표 영역 안에서만 가로 스크롤되고 페이지에는 가로 스크롤이 없다.
  2. 다크 모드 → 표·코드·Callout 대비가 읽힌다.
  3. 키보드로 첫 퀴즈를 선택하고 '정답 확인'을 누른다 → 정답과 설명이 보인다.
  4. 하단 학습 순서 → '29 / 29', 이전 array-index-length, 다음 없음.
  5. array-index-length 하단 → '28 / 29', 다음이 array-method-pitfalls.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인, 명세 재확인

- 대상: `app/concepts/array-method-pitfalls/examples/*.js`(7개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경
  - 부록 초안 예제 7개를 그대로 옮긴다.
  - `meta.ts`: slug `array-method-pitfalls`, title(1절), summary(160자 이하), category `objects`, order 270, tags(배열 메서드, sort, 정렬, 비교 함수, toSorted, toReversed, toSpliced, with, indexOf, includes, SameValueZero, NaN, splice, push, reduce, 안정 정렬), goals 4개 내외, prerequisites·related(3절), examples는 처음엔 `[]`, references(2절 명세 anchor + MDN sort·toSorted·includes·indexOf·splice·reduce·with), `reviewedAt: null`
  - simplifications: 고차 함수 각각의 사용법과 `thisArg`는 다루지 않음 / 콜백 안에서 배열을 바꾸는 경우·`Symbol.species`·유사 배열에 빌려 쓰기는 다루지 않음 / 정렬 알고리즘과 비교 순서·횟수는 명세가 정하지 않으므로 다루지 않음 / 문자열 비교의 세부(코드 유닛, `localeCompare`)는 별도 개념 / 복사 메서드 예제는 ES2023 이후를 지원하는 환경 기준 / 예제 5의 `map`·`join`은 이름을 모으는 용도 / `console`은 호스트 API
  - `route.tsx`: arrow-functions 템플릿 복사
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. `console.log`에는 원시 값·`JSON.stringify`만. 파일 끝 줄바꿈 하나. 스프레드·`Array.from`을 쓰지 않는다.
- 완료 조건
  - `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력이 2절 표와 같다.
  - ES2023 판에 `toSorted`가 있고 ES2022 판에 없는지, 안정 정렬 요구가 들어간 판을 판별 명세로 확인해 "구현 진행"에 기록한다(확인 못 하면 연도를 쓰지 않는다고 기록).
  - 참고 링크 전부 200.

### 2. 메서드 표 데이터와 근거 테스트

- 대상: `methods.ts`, `concept.test.ts`
- 변경: 3절의 12행 × 2열과 근거 테스트 (a)~(c)를 쓴다. 행 타입은 `{ method, exampleId, mutates: Cell, returns: Cell }`. probe 실행은 arrow-functions `concept.test.ts`의 방식(칸마다 새 컨텍스트, 완료 값을 문자열로, 오류는 `name`)을 따른다.
- 완료 조건: `npx vitest run app/concepts/array-method-pitfalls` 통과. 칸 하나의 `expected`를 바꾸면 실패하는지 본 뒤 되돌린다.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경
  - 필수 h2. 동작 원리 h3: 1절 주제 ①~⑦ 순서 + 메서드 표
  - 예제마다 PredictQuiz(7개), 결과와 이유는 예제별 h3
  - 오해 Callout: "sort()는 숫자를 크기순으로 정렬한다", "새 배열을 반환하면 요소도 새로 만들어진다(깊은 복사)", "indexOf와 includes는 같은 방법으로 찾는다", "map은 구멍을 undefined로 채운다"
- 주의사항: 표는 `methods.ts`에서 그린다(arrow-functions 표 마크업, 스크롤 region `aria-label`). 이미 다룬 내용은 링크. '찾히다' 금지. 공백 든 인라인 코드가 Prettier 줄바꿈에 걸리면 `<code>{"…"}</code>`.
- 완료 조건
  - `npm test` 통과.
  - 본문 결과·원인 문장을 2절과 하나씩, 줄 번호 언급을 예제 파일과 대조했다.
  - `grep -c '찾히' content.mdx`가 0. `grep -n '복사' content.mdx` 결과가 메서드 분류 이름("복사 메서드")뿐이고 원인 설명이 아니다. 비교 순서·불리언 비교 함수에 대해 구체적 결과를 주장하는 문장이 없다.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로 고친다. '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 들어가는지로 판정해, 들어가면 순위 끝에 '29' 추가, 아니면 그대로 둔다.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만 한다.
- 완료 조건: 6절 검증 명령 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- array-index-length의 "배열 메서드는 별도 개념" 문구(`content.mdx:6`, `:54`)를 이 페이지 링크로 바꾸기 — 역방향 연결을 일괄로 처리할 때 함께 한다.

## 변경 이력

- 2026-11-02 (사용자 요청 — 외부 콘텐츠 검토 5건): ① reduce 초기값을 "프로퍼티가 있는 첫 요소"로(`[ , 5, 6].reduce(sum)` → 11 확인) ② 불리언 비교자 문단 뒤에 비교 함수가 NaN을 돌려주면 +0(같다)으로 보는 함정 추가(`['b', 'a'].sort((a, b) => a - b)` → `["b","a"]`, concept.test에 근거 추가) ③ 오해 Callout 4의 "includes가 채운다" 표현 분리 ④ 예제 4의 6번 줄·예제 7의 10번 줄 try 블록에 `console.log`를 넣어 퀴즈 오답 보기가 성립하게(출력은 그대로, 줄 번호 불변) ⑤ "+0과 -0은 둘 다" → "두 방법 모두 +0과 -0을". 부록 예제 4·7도 같이 바뀜 — 영향 단계 1·2·3.
- 2026-11-02 (사용자 요청 — 외부 콘텐츠 검토 2차 3건): ① "빼기 비교 함수는 숫자에만" → "숫자로 바꾸면 NaN이 되는 값, 예를 들어 'a' 같은 보통의 문자열에는"(`["10","9","1"].sort((a, b) => a - b)` → `["1","9","10"]` 확인) ② NaN 문단의 안정 정렬을 "뒤에서 볼 안정 정렬 규칙"으로 전방 참조임을 밝힘 ③ reduce "앞쪽의 구멍" → "초기값을 찾을 때도, 그 뒤 반복에서도 구멍은 어디에 있든"(`[1, , 2, , 3].reduce` → 6, 콜백 2회 확인), 결과와 이유·퀴즈 해설의 "콜백 없이" → "콜백을 부르지 않고" — 영향 단계 2.

## 부록: 예제 초안

본문 예제 순서(예제 1~7)대로 적는다. 구현 단계 1에서 이 내용 그대로 `examples/`에 옮긴다.

### 예제 1: `default-sort.js`

```js
var numbers = [10, 9, 1];
console.log(JSON.stringify(numbers.sort()));
console.log(JSON.stringify([-1, -2, 3].sort()));
console.log(JSON.stringify([10, 9, 1].sort((a, b) => a - b)));
console.log(JSON.stringify(['b', 'B', 'a'].sort()));
```

### 예제 2: `mutating-methods.js`

```js
var original = [3, 1, 2];
var sorted = original.sort();
console.log(sorted === original, JSON.stringify(original));
var reversed = original.reverse();
console.log(reversed === original, JSON.stringify(original));
var part = original.slice(1);
console.log(part === original, JSON.stringify(part), JSON.stringify(original));
var doubled = original.map((n) => n * 2);
console.log(JSON.stringify(doubled), JSON.stringify(original));
```

### 예제 3: `return-values.js`

```js
var list = ['a', 'b'];
console.log(list.push('c'), JSON.stringify(list));
console.log(list.pop(), JSON.stringify(list));
var removed = list.splice(0, 1, 'x', 'y');
console.log(JSON.stringify(removed), JSON.stringify(list));
console.log(list.forEach((item) => item + '!'));
```

### 예제 4: `copy-methods.js`

```js
var scores = [30, 10, 20];
var asc = scores.toSorted((a, b) => a - b);
console.log(JSON.stringify(asc), JSON.stringify(scores));
console.log(JSON.stringify(scores.toReversed()), JSON.stringify(scores.toSpliced(0, 1)));
console.log(JSON.stringify(scores.with(-1, 99)), JSON.stringify(scores));
try { console.log(JSON.stringify(scores.with(3, 0))); } catch (e) { console.log(e.name); }
var users = [{ name: 'kim' }];
var copy = users.toReversed();
copy[0].name = 'lee';
console.log(copy === users, users[0].name);
```

### 예제 5: `undefined-and-stable.js`

```js
var mixed = [3, undefined, , 1];
mixed.sort();
console.log(mixed.length, JSON.stringify(mixed), 2 in mixed, 3 in mixed);
var called = 0;
[undefined, 2, 1].sort((a, b) => { called += a === undefined || b === undefined ? 1 : 0; return a - b; });
console.log(called);
var people = [
  { name: 'A', age: 30 },
  { name: 'B', age: 20 },
  { name: 'C', age: 30 },
  { name: 'D', age: 20 },
];
people.sort((x, y) => x.age - y.age);
console.log(people.map((p) => p.name).join(''));
```

### 예제 6: `search-nan.js`

```js
var values = [1, NaN, 0];
console.log(values.indexOf(NaN), values.includes(NaN));
console.log(values.indexOf(-0), values.includes(-0));
var sparse = [1, , 3];
console.log(sparse.indexOf(undefined), sparse.includes(undefined));
```

### 예제 7: `holes-and-reduce.js`

```js
var sparse = [1, , 3];
var visited = 0;
sparse.forEach(() => { visited += 1; });
var mapped = sparse.map((n) => n * 2);
console.log(visited, mapped.length, 1 in mapped, JSON.stringify(mapped));
var filled = sparse.toSorted();
console.log(filled.length, 1 in filled, 2 in filled);
var sum = (total, n) => total + n;
console.log([1, 2, 3].reduce(sum), [1, 2, 3].reduce(sum, 10));
try { console.log([].reduce(sum)); } catch (e) { console.log(e.name); }
console.log([].reduce(sum, 0), [5].reduce(() => 'never'));
```

## 구현 진행

- baseline (2026-11-02, `3c2dac0`): lint 오류·경고 0 / format:check 통과 / typecheck 오류 0 / `npm test` 89 파일 2795 통과. test:build·e2e는 단계 4에서 실행
- [x] 1. 예제·meta·route — 예제 7개가 부록 초안과 동일(diff), `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 568 통과(출력이 2절 표와 같음), 참고 링크 19개 200, 명세 anchor 12개가 현재 초안에 존재. 판 확인: ES2018(9.0) sort는 "The sort is not necessarily stable", ES2019(10.0)은 "The sort must be stable"(소개에도 "requiring that Array.prototype.sort be a stable sort") → 안정 정렬은 ES2019부터. `Array.prototype.toSorted`는 ES2022(13.0)에 없고 ES2023(14.0)에 있음 → 복사 메서드는 ES2023. 본문에 두 연도를 쓸 수 있다.
- [x] 2. 메서드 표·근거 테스트 — `methods.ts` 12행 × 2열, probe 결과가 3절과 같음, `npx vitest run app/concepts/array-method-pitfalls` 30 통과, 음성 확인(push 원본 칸 expected 변경 시 1 실패 → 되돌려 통과). (c) 근거: 기본 sort 뒤 요소 타입 number, `[, ,].reduce` TypeError, `[3, , 1].sort()` → `3 false [1,3,null]`, 내림차순 비교 함수에서 undefined 미전달·끝 배치, `[NaN].lastIndexOf(NaN)` -1.
- [x] 3. 본문 — 메인 에이전트가 작성(정확성 대조를 직접 하기 위해). 필수 h2, 동작 원리 h3 8개(1절 ①~⑦ + 메서드 표), PredictQuiz 7개, 오해 Callout 4개. `npm test`는 이 페이지 관련 전부 통과, 실패 4건은 단계 4 대상인 개수 고정 테스트(`concepts.test.ts`·`ConceptPager.test.tsx`, 28→29). '찾히' 0, '복사'는 "복사 메서드"라는 분류 이름으로만 씀, 비교 순서·불리언 비교 함수의 구체적 결과를 주장하는 문장 없음. 본문 결과·원인 문장과 줄 번호를 2절·예제 파일과 대조함. 퀴즈 해설의 `&quot;`는 MDX 속성에서 그대로 보일 수 있어 `['a']`로 바꿈. 표 제목은 "메서드 표로 정리"(methods.ts 주석도 맞춤).
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — 테스트 파일은 Sonnet, `docs/content-guide.md`·로드맵은 메인 에이전트. diff 검토에서 `navigation.spec.ts` 마지막 카드 제목이 이전 개념 제목으로 남은 누락을 발견해 메인 에이전트가 고침. '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 없어 그대로. 검증(2026-11-02, 메인 에이전트 실행): lint·format:check·typecheck 통과, `npm test` 90 파일 2844 통과, `npm run test:build` 241 통과, `npx playwright test tests/e2e/navigation.spec.ts` 16 통과, `-g "array-method-pitfalls|배열 메서드의 함정|홈 학습 순서 보기"` 8 통과. 브라우저(빌드 결과를 serve, Playwright chromium 375px·다크): 페이지 scrollWidth 375 = innerWidth, 표 영역 343 = 343(12행, 스크롤 불필요), 첫 퀴즈를 키보드(화살표 → Tab → Enter)로 풀면 "정답입니다."와 해설 표시, 하단 '학습 순서 29 / 29'·이전 array-index-length. array-index-length의 '28 / 29'·다음 링크는 navigation e2e가 확인.
- 리뷰 1차(메인 에이전트 + 본문 정확성 독립 검토 Opus 1개): High 2 (수정, 단계 3) · Medium 1 · Low 7 (보고) → 수정 후 재검증 통과.
  - High 1: `content.mdx` 복사 메서드 절이 넷 모두 "같은 length의 새 배열에 원래 배열에서 읽은 값을 넣는다"고 씀 → toSpliced는 length가 달라지고 with·toSpliced는 인수 값을 넣는다고 고침(명세 `sec-array.prototype.tospliced`·`sec-array.prototype.with`).
  - High 2: 오해 Callout "새 배열을 돌려주면 요소도 새로 만들어진다"가 map을 "원래 값이 그대로 들어가는" 목록에 넣음 → map을 빼고 "콜백이 돌려준 값을 넣는다"는 문장 추가(실행: `u.map(p=>p)[0]===u[0]` true, 새 객체를 돌려주면 false).
  - 재검증: lint·format:check·typecheck 통과, `npm test` 2844, `npm run test:build` 241, `-g "array-method-pitfalls|배열 메서드의 함정"` 6 통과.
  - 보고만 한 것: Medium — 구멍 서술이 "프로토타입 체인에 인덱스 프로퍼티가 없음"을 전제(HasProperty는 체인까지 봄, Get은 체인 값을 읽음), simplifications에 밝히지 않음. Low — CompareArrayElements 문장에 "undefined가 아닌", simplifications의 "불리언을 반환하면" 표현, includes를 "채우는" 주체로 쓴 문장, reduce "프로퍼티가 있는 첫 요소", toSpliced·with가 일부 인덱스는 읽지 않음, goals의 "이유", try…catch(47장) 미표기.
- 외부 콘텐츠 검토 1차(사용자 전달, 5건 모두 Low) 반영 — 제안을 먼저 실행으로 확인(`[ , 5, 6].reduce(sum)` → 11, `["b","a"].sort((a, b) => a - b)` → `["b","a"]`, 명세 CompareArrayElements "If result is NaN, return +0"). 예제 4·7의 try 줄에 `console.log`를 넣었고 출력·줄 번호는 그대로(examples 테스트 통과). concept.test에 NaN 비교·앞 구멍 reduce 근거 2개 추가. 재검증: lint·format:check·typecheck 통과, `npm test` 2846, `npm run test:build` 241, `-g "array-method-pitfalls|배열 메서드의 함정"` 6 통과. 리뷰 Low 중 includes "채운다" 표현과 reduce "첫 요소"는 이 반영으로 해소.
- 외부 콘텐츠 검토 2차(사용자 전달, 3건 모두 Low) 반영 — 제안을 먼저 실행으로 확인(`["10","9","1"].sort((a, b) => a - b)` → `["1","9","10"]`, `[1, , 2, , 3].reduce(sum)` → 6·콜백 2회). content.mdx 4곳 교체(퀴즈 해설의 "콜백 없이"도 함께), concept.test에 중간 구멍 reduce·숫자 문자열 빼기 비교 근거 2개 추가. 재검증: lint·format:check·typecheck 통과, `npm test` 2848, `npm run test:build` 241, `-g "array-method-pitfalls|배열 메서드의 함정"` 6 통과.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 7개, 메서드 표 12행 × 2열과 칸마다 probe 근거 테스트, 퀴즈 7개, 오해 Callout 4개, 고정 테스트·e2e·빌드 테스트·문서). 본문 주장 근거 테스트는 계획 (c)보다 늘었다(NaN 비교 함수, 앞·중간 구멍 reduce, 숫자 문자열 빼기 비교).
- 외부 콘텐츠 검토 2회(5건·3건)로 범위 안에서 문장을 바로잡았고, 예제 4·7의 try 줄에 `console.log`를 넣었다(출력·줄 번호 불변, 변경 이력).
- 사용자 최종 승인으로 `reviewedAt`을 2026-11-02로 기록했다(content-guide 10단계).

### 코드 리뷰

- critical-code-review 1차: High 2(복사 메서드의 length·인수 값 서술, Callout의 map 포함)를 수정. Medium 1(구멍 서술의 프로토타입 체인 전제를 simplifications에 미기재)과 남은 Low(CompareArrayElements 문장, simplifications의 "불리언을 반환하면", toSpliced·with 일부 인덱스 미읽기, goals의 "이유", try…catch(47장) 미표기)는 보고만 하고 사용자 승인으로 남겼다.

### 후속 작업

- [ ] 리뷰 Medium: 구멍 동작 서술이 `Array.prototype`에 인덱스 프로퍼티가 없다는 전제임을 simplifications에 밝힐지 사용자 결정
- [ ] 리뷰 Low: 예제의 `try…catch`(47장)를 simplifications에 "별도 개념"으로 밝힐지 등 사용자 결정
- [ ] array-index-length의 "배열 메서드는 별도 개념" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결 일괄 처리 때

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 메서드 표의 칸마다 `probe` 코드와 `expected`를 함께 두고 테스트가 새 vm 컨텍스트에서 실행해 대조 — 표의 "바꿈/반환값"을 손으로만 쓰면 틀려도 알 수 없다. 원본 열은 `[3, 1, 2]`에 호출 뒤 `JSON.stringify(a)`, 반환값 열은 새 length·지운 요소 배열·`r === a`·`Array.isArray(r) && r !== a`로 판정.
- [Claude 판단] 불리언 비교 함수(`(a, b) => a > b`)는 예제로 쓰지 않고 문장으로만 설명 — 명세상 일관된 비교자가 아니라 정렬 순서가 구현 정의라 "실제 실행 결과"를 주장할 수 없다.
- [Claude 판단] 오류를 보이는 줄(`with` 범위 밖, 빈 배열 `reduce`)을 `try { console.log(...) } catch (e) { console.log(e.name) }`로 작성 — 오류 이름만 출력해 호스트마다 다른 메시지를 피하고, try 안 `console.log`가 실행되지 않는다는 점을 퀴즈 판단 근거로 남김(외부 검토 1차 ④).
- [Claude 판단] 본문은 Sonnet에 맡기지 않고 메인 에이전트가 직접 작성 — 명세 대조(CompareArrayElements, SameValueZero, HasProperty vs Get)를 문장마다 직접 확인하기 위해.
- [무검토 승인] category `objects`, order 270, prerequisites 4개(array-index-length, equality-operators, arrow-functions, primitives-and-objects).
- 콜백 메서드는 함정만(구멍을 만난 forEach·map, 초기값 없는 reduce), 추가 주제 3개(ES2023 복사 메서드, sort의 undefined와 안정성, 반환값 함정), 표 + 퀴즈, slug·제목은 사용자가 골랐다.

#### 배경지식

- 기본 `sort`: SortIndexedProperties가 구멍을 빼고 값을 모은 뒤 CompareArrayElements로 비교 — `undefined`는 비교 함수 없이 끝으로, 비교 함수가 없으면 두 값의 ToString 결과를 코드 유닛 순서로 비교(요소 자체는 바뀌지 않음). 남은 끝 인덱스는 DeletePropertyOrThrow로 지워 구멍. 비교 함수 결과가 `NaN`이면 +0(같다).
- 안정 정렬: ES2019부터 명세가 요구. 같다고 본 요소는 원래 순서를 지킨다.
- `indexOf`/`lastIndexOf`는 HasProperty + IsStrictlyEqual(`NaN` 못 찾음, 구멍 건너뜀), `includes`는 Get + SameValueZero(`NaN` 찾음, 구멍을 `undefined`로 읽음). 둘 다 `+0`과 `-0`은 같다고 본다.
- ES2023 `toSorted`·`toReversed`·`toSpliced`·`with`: ArrayCreate로 새 배열을 만들고 원본에 쓰지 않는다. 구멍은 Get으로 읽어 `undefined`가 들어간다. `with`는 범위 밖 인덱스에서 RangeError.
- `map`·`forEach`·`reduce`는 HasProperty로 구멍을 건너뛴다. `reduce`는 초기값이 없으면 프로퍼티가 있는 첫 요소를 초기값으로 쓰고, 그런 요소가 없으면 TypeError.

#### 확인 질문

1. `[10, 9, 1].sort()` 뒤에 `typeof a[0]`이 `'number'`인 이유는? "요소를 문자열로 바꿔 정렬한다"는 설명은 어디가 틀렸나?
   <details><summary>답</summary>CompareArrayElements가 비교할 때만 두 값의 ToString 결과를 비교하고, 정렬 결과로 쓰는 값은 원래 값이다. 저장된 요소가 문자열로 바뀌지 않는다(본문 "기본 sort는 문자열로 비교한다", concept.test '기본 sort 뒤에도 요소는 숫자다').</details>
2. `[NaN].indexOf(NaN)`은 -1인데 `[NaN].includes(NaN)`은 true인 이유와, `[1, , 3]`에서 `undefined`를 찾을 때 두 메서드 결과가 다른 이유는?
   <details><summary>답</summary>indexOf는 IsStrictlyEqual(NaN ≠ NaN), includes는 SameValueZero(NaN = NaN). 구멍은 indexOf가 HasProperty로 건너뛰고, includes는 Get으로 읽어 undefined가 되어 찾는다(예제 6).</details>
3. [Claude 판단] 불리언을 돌려주는 비교 함수를 실행 예제로 보이지 않은 이유는? 예제로 넣으면 무엇이 깨지나?
   <details><summary>답</summary>a &lt; b일 때도 0(같다)이 되어 일관된 비교자가 아니므로 명세가 정렬 순서를 구현 정의로 둔다. 예제 출력은 특정 엔진(Node)의 결과일 뿐이라 "실행 결과"로 주장할 수 없다(3절 버린 대안 ③).</details>
4. `[ , 5, 6].reduce(sum)`이 TypeError가 아니라 11이고, `[, ,].reduce(sum)`은 TypeError인 이유는?
   <details><summary>답</summary>초기값이 없으면 HasProperty가 true인 첫 요소를 초기값으로 찾는다. 앞 구멍은 건너뛰고 5에서 시작한다. 구멍만 있으면 그런 요소가 없어 TypeError(변경 이력 1차 ①, concept.test).</details>
5. [Claude 판단] 메서드 표의 probe를 칸마다 새 컨텍스트에서 실행하는 이유는? 한 컨텍스트에서 이어 실행하면 무엇이 문제인가?
   <details><summary>답</summary>원본을 바꾸는 메서드(push·sort·reverse 등)가 앞 칸의 배열 상태를 바꾸면 다음 칸 결과가 그 상태에 의존해 표가 말하는 "이 메서드 하나의 동작"과 달라진다(concept.test '메서드 표 근거' 주석).</details>
