# 개념 '배열은 객체다: 인덱스와 length' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `91c78d1`

## 0. 요약

- 목적: 25~37장 로드맵 4번 `/concepts/array-index-length`를 추가한다. 배열이 객체이고 인덱스가 문자열 프로퍼티 키라는 것, `length`가 인덱스 대입·`length` 대입에 따라 어떻게 바뀌는지, 희소 배열(구멍)을 예제 7개와 **length 시뮬레이터**(시나리오 3개)·퀴즈로 보인다. 사용자 결정(2026-11-02)으로 인덱스가 아닌 키, `length` 프로퍼티 자체, 배열 생성의 함정, 구멍을 만나는 동작도 다룬다.
- 범위: 새 개념 폴더 1개(category `objects`, order 260으로 학습 순서 마지막, 시뮬레이터 있음). 공통 코드(`app/simulator/` 셸 포함)는 바꾸지 않는다. 마지막 개념이 바뀌므로 고정 테스트·e2e·빌드 테스트·content-guide·로드맵을 고친다.
- 위험: ① "배열은 해시 테이블/연속 메모리로 구현된다" 같은 엔진 구현을 사실처럼 쓰는 것 ② 시뮬레이터 상태가 실제와 어긋나는 것 → 명세(Array exotic object)로만 설명하고, 단계마다 예제를 그 줄까지 실제로 실행한 결과와 상태를 대조하는 테스트를 둔다.
- 복잡도: 중간~높음 · Consensus: 생략. 시뮬레이터를 새로 만들지만 property-keys와 같은 기존 패턴(상태 스냅샷 + View + 불변식·실행 대조 테스트)이고 공통 코드를 바꾸지 않는다. 명세 원문과 vm 실행으로 사실을 미리 확인했다.
- 미확정: 없음(slug·제목은 2026-11-02 계획 승인으로 초안 그대로 확정)

## 1. 요구사항

### 요구사항

- 로드맵 4번 "배열은 객체다: 인덱스와 length"(27장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 기본 주제
  - ① 배열은 객체다: `typeof []`는 `'object'`, `Array.isArray`로 구분한다. 인덱스는 문자열 프로퍼티 키라 `Object.keys`가 `["0","1"]`이고 `a['1']`과 `a[1]`이 같다([프로퍼티 키](/concepts/property-keys)를 잇는다).
  - ② `length`의 자동 변경: `length` 이상인 인덱스에 대입하면 `length`가 그 인덱스 + 1이 된다. `length`에 작은 값을 대입하면 그 이상인 인덱스 프로퍼티가 지워지고, 큰 값을 대입하면 구멍만 생긴다. 인덱스가 아닌 키(`a.color`)는 `length`와 관계없다.
  - ③ 희소 배열: `[1, , 3]`은 `length`가 3이지만 `1 in a`가 false다(구멍 = 그 인덱스의 프로퍼티가 없음). `[1, undefined, 3]`은 프로퍼티가 있고 값이 undefined다. 읽으면 둘 다 undefined다. `delete`는 프로퍼티를 지울 뿐 `length`를 줄이지 않는다.
- 추가 주제(사용자 결정 2026-11-02, 모두 포함)
  - ④ 인덱스가 아닌 키: `-1`, `'01'`, `1.5`, `4294967295`(2^32 - 1)는 배열 인덱스가 아니라 `length`가 바뀌지 않는다. `4294967294`(2^32 - 2)는 마지막 배열 인덱스라 `length`가 4294967295가 된다.
  - ⑤ `length` 프로퍼티 자체: 디스크립터가 writable true·enumerable false·configurable false. 음수·소수를 대입하면 RangeError. 유사 배열 객체(`{0: 'a', 1: 'b', length: 2}`)는 인덱스 모양 키에 대입해도 `length`가 바뀌지 않는다(일반 객체라 배열의 특별한 `[[DefineOwnProperty]]`가 없음). [화살표 함수와 메서드 축약](/concepts/arrow-functions)의 `arguments`와 연결한다.
  - ⑥ 배열 생성의 함정: `new Array(3)`은 구멍 3개의 `length` 3 배열(`Object.keys`가 `[]`), `new Array(3, 4)`는 `[3, 4]`, `new Array('3')`은 `['3']`, `Array.of(3)`은 `[3]`, `Array(3)`도 `new` 없이 같은 결과, `new Array(-1)`은 RangeError.
  - ⑦ 구멍을 만나는 동작: `for...in`과 `Object.keys`는 구멍을 건너뛰고(프로퍼티가 없으므로), `JSON.stringify`는 구멍과 undefined를 모두 `null`로 쓴다.
- 시각화: length 시뮬레이터(사용자 결정). 시나리오 3개(①②, ②, ③). 단계마다 배열의 자기 프로퍼티 표(키·값, 인덱스 여부)와 `length`, 0부터 `length - 1`까지의 칸 보기(구멍 표시), 그 단계에서 지워진 키를 보인다.

### 유지해야 하는 기존 동작

- 기존 개념 27개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(this-binding·typeof-operator의 "배열은 별도 개념" 문구 포함 — 역방향 연결은 나중에 일괄 처리).
- 공통 시뮬레이터 셸(`app/simulator/`)을 바꾸지 않는다.
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 시뮬레이터는 JS 없이 첫 단계를 그린다.

### 제외 범위

- 배열 메서드(`push`·`pop`·`splice`·`sort`·`indexOf`·`includes`·`forEach` 등)의 동작과 함정 — 5번 개념. 예제에서 `push`를 쓰는 것은 결과를 모으는 용도로만(`hole-iteration.js` 3번 줄)
- `Array.from`, 스프레드, 이터러블(34·35장), 형식화 배열(TypedArray), 배열 디스트럭처링
- 엔진의 배열 최적화(밀집/희소 표현, 해시 테이블) — 명세가 정하지 않으므로 쓰지 않는다
- `length`를 writable false로 만든 배열, configurable false 요소가 있을 때 `length` 줄이기가 멈추는 것(ArraySetLength의 실패 경로)
- `length`에 객체를 대입할 때 `valueOf`가 두 번 불리는 레거시 동작

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안 ES2027, 2026-11-02 내려받아 확인)

- The Object Type(`#sec-object-type`): "An array index is an integer index n such that CanonicalNumericIndexString(n) returns an integral Number in the inclusive interval from +0𝔽 to …" — 구현 단계 1에서 상한(𝔽(2^32 - 2))을 원문으로 재확인한다. vm 결과는 4294967294가 인덱스, 4294967295가 인덱스 아님.
- Array exotic object `[[DefineOwnProperty]]`(`#sec-array-exotic-objects-defineownproperty-p-desc`): 키가 `"length"`면 ArraySetLength. 키가 array index이면 프로퍼티를 정의한 뒤 "If index ≥ length, then Set lengthDesc.[[Value]] to index + 1𝔽" — 인덱스 대입이 `length`를 늘리는 근거.
- ArraySetLength(`#sec-arraysetlength`): `newLength = ToUint32(값)`, `numberLength = ToNumber(값)`이 SameValueZero가 아니면 RangeError(음수·소수). newLength ≥ oldLength면 `length`만 바꾼다. 작으면 "For each own property key … that is an array index and ToUint32(propertyKey) ≥ newLength, in descending numeric index order" `[[Delete]]`한다.
- ArrayCreate(`#sec-arraycreate`): `length`를 `{ [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }`로 정의. 2^32 - 1보다 크면 RangeError.
- OrdinaryOwnPropertyKeys(`#sec-ordinaryownpropertykeys`): array index 키를 숫자 오름차순으로 먼저, 그다음 나머지 문자열 키를 생성 순서로 — `Object.keys(fruits)`가 `["0","1","4","color"]`인 근거.
- 그 밖에 구현 단계 1에서 원문을 재확인할 절: Array Initializer(`#sec-array-initializer`, Elision이 인덱스를 건너뛰고 `length`를 정함), Array(...values)(`#sec-array`)·Array(len)(`#sec-array-len`, 숫자 하나면 ToUint32와 같지 않을 때 RangeError, 숫자가 아니면 그 값 하나를 요소로), Array.of(`#sec-array.of`), `delete`(`#sec-delete-operator`), `in`(HasProperty), JSON.stringify의 SerializeJSONArray(Get → undefined → `"null"`).

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, 예제마다 새 컨텍스트, 초안 파일 실행)

초안 전문은 문서 끝 "부록: 예제 초안".

| 예제 | 실제 출력 |
| - | - |
| `index-keys.js`(typeof·isArray, 키 목록·`fruits['1']`, `fruits[4]` 대입 뒤 length·`2 in`·`fruits[2]`, 비인덱스 키) | `object true` / `["0","1"] banana` / `5 false undefined` / `5 ["0","1","4","color"]` |
| `shrink-length.js`(length 줄이기·늘리기, 다시 대입) | `[10,20] false` / `4 false undefined` / `["0","1","3"]` |
| `holes.js`(구멍 vs undefined, delete 뒤 length) | `3 false undefined` / `3 true undefined` / `3 false ["0","1"]` |
| `not-index-keys.js`(-1, '01', 1.5, 4294967295, 4294967294) | `0 ["-1","01","1.5","4294967295"]` / `4294967295` |
| `length-property.js`(디스크립터, -1·1.5 대입, 유사 배열) | `{"value":3,"writable":true,"enumerable":false,"configurable":false}` / `RangeError` / `RangeError` / `2 false` |
| `array-constructor.js`(new Array(3), (3, 4), ('3'), Array.of(3), Array(3), new Array(-1)) | `3 false []` / `[3,4] ["3"]` / `[3] 3` / `RangeError` |
| `hole-iteration.js`(for...in, Object.keys, JSON.stringify) | `["0","2"] ["0","2"]` / `[1,null,3] [1,null,3]` |

- 테스트로만 확인할 주장(vm 확인): `[,].length`는 1, `[1, 2, ,].length`는 3(마지막 쉼표 하나는 세지 않음), `new Array(1.5)`는 RangeError, `Object.getPrototypeOf([]) === Array.prototype`.

### 사실 (코드에서 확인)

- 시뮬레이터 패턴: `app/concepts/property-keys/`(`scenarios.ts` 상태 타입·헬퍼, `PropertyView.tsx`, `Simulator.tsx` 19줄 래퍼, `Simulator.test.tsx`, `PropertyView.test.tsx`). 공통 타입 `app/simulator/types.ts:3-17`(Step: title·explanation·line·state·output, Scenario: id·label·exampleId·code·steps ≥ 2).
- 실행 대조 테스트: `app/concepts/property-keys/concept.test.ts:80-108`(`runUntil`: 예제 1..to 줄 + 스냅샷 코드를 vm에서 실행)과 `:213-279`(단계마다 바인딩·키 순서·값·출력 대조). 공통 불변식 `tests/helpers/scenario-invariants.ts:5-60`.
- 시뮬레이터 개념의 e2e·빌드 등록: `tests/e2e/helpers.ts:47-48`(경로·시뮬레이터 이름 상수), `tests/e2e/a11y.spec.ts:563-612`(페이지 axe + 시뮬레이터 모든 단계 axe + 특정 단계 확인), `tests/e2e/responsive.spec.ts:688-718`(가로 스크롤 + 시뮬레이터 진행 중 가로 스크롤), `tests/build/build-output.test.ts:694-718`(단계 1 텍스트, region·라디오, `<details` 수).
- 현재 마지막 개념은 arrow-functions(order 250, 27번째, `app/concepts/arrow-functions/meta.ts:9`). order 260이면 28번째이자 마지막.
- 고정값(현재): `tests/e2e/navigation.spec.ts` 카드 27·마지막 '27번째'·arrow-functions 제목·pager '/ 27'·arrow-functions '27 / 27'·링크 1개, `tests/e2e/responsive.spec.ts` 홈 학습 순서 카드 27, `app/lib/concepts.test.ts` total 27·마지막 arrow-functions, `app/components/concept/ConceptPager.test.tsx` '1 / 27'·마지막 arrow-functions.
- 검색은 title·summary·tags 포함 여부(`app/lib/concepts.ts:70-78`). 새 meta에 '객체'가 들어가면 '객체' 검색이 11건·순위에 '28' 추가(`tests/e2e/navigation.spec.ts`의 '객체' 검색 단언). 제목 초안에 '객체'가 들어가므로 단계 5에서 반영한다.
- 배열을 다룬 기존 페이지는 없다. this-binding·typeof-operator simplifications가 배열을 별도 개념으로 미뤘다.
- e2e 범위(AGENTS.md 검증 순서, 2026-11-02): 공통 코드를 바꾸지 않는 새 개념이므로 `navigation.spec.ts` + `-g "<slug>|<a11y 케이스 이름>|<시뮬레이터 이름>|홈 학습 순서 보기"`만 실행한다.

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "배열은 `length`라는 특별한 프로퍼티를 가진 객체이고, 인덱스 키에 대입하거나 `length`에 대입하면 명세가 둘을 함께 맞춘다". 원인은 Array exotic object의 `[[DefineOwnProperty]]`와 ArraySetLength로 설명한다. "배열은 해시 테이블/연속 메모리"처럼 엔진 구현을 사실로 쓰지 않고, 오해 Callout과 simplifications에서 "명세는 메모리 배치를 정하지 않는다"고 밝힌다.
- 시뮬레이터 상태(`scenarios.ts`)
  ```ts
  type Val = { type: 'number' | 'string' | 'undefined'; display: string }
  type Prop = { key: string; value: Val; changed?: boolean } // length를 뺀 자기 프로퍼티, Object.keys 순서
  type ArrayCard = { name: string; length: number; lengthChanged?: boolean; props: Prop[]; removed?: string[] }
  type ArrayState = { arrays: ArrayCard[] }
  ```
  - `removed`는 그 단계에서 지워진 키(이전 단계 props에 있고 지금 없는 키). `changed`·`lengthChanged`는 그 단계에서 생기거나 바뀐 것에만 붙인다.
  - 인덱스 여부와 칸 보기(0..length-1, 프로퍼티가 없으면 "구멍")는 View가 키에서 계산한다(상태에 중복 저장하지 않는다). 인덱스 판정은 `String(Number(k)) === k`이고 0 이상 2^32 - 2 이하 정수인지로 한다(시나리오의 키만 쓰므로 충분하고, 테스트가 시나리오 키마다 vm의 실제 동작과 대조한다).
  - 칸 보기는 `length`가 작은 시나리오만 쓰므로 그린다. 테스트로 모든 단계의 `length` ≤ 8을 강제한다(375px에서 줄바꿈으로 넘치지 않게).
- 시나리오 3개: `index-keys`(예제 1), `shrink-length`(예제 2), `holes`(예제 3, 배열 2개). 첫 단계는 "실행 전"(line 없음, 빈 상태), 나머지는 한 줄씩. 출력 누적.
- 테스트(`concept.test.ts`): ① 공통 불변식 ② 단계마다 예제를 그 줄까지 실제로 실행해 선언된 배열마다 `Object.keys` 순서·값 타입·값 문자열·`length`가 상태와 같은지(property-keys `runUntil` 방식) ③ `removed`·`changed`·`lengthChanged`가 이전 단계와의 차이와 같은지 ④ View의 인덱스 판정이 시나리오 모든 키에서 실제(배열에 그 키로 대입했을 때 length가 바뀌는지)와 같은지 ⑤ 본문 주장 근거(`[,]`, `[1, 2, ,]`, `new Array(1.5)`, `Array.prototype`) ⑥ 모든 단계 `length` ≤ 8.
- 장 범위: 27장까지. 예제에 스프레드·`Array.from`·고차 함수를 쓰지 않는다. `push`는 `hole-iteration.js`에서 키를 모으는 용도로만 쓰고 본문에서 "배열 끝에 추가하는 메서드(별도 개념)"라고 한 줄로 밝힌다.
- category `objects`, order 260. prerequisites: property-keys, property-attributes, prototype-chain(`Array.prototype` 언급), arrow-functions(유사 배열 `arguments`). related: property-keys, property-attributes, prototype-chain, arrow-functions, typeof-operator.
- 버린 대안: ① 프로퍼티 표 + 퀴즈만(사용자 결정: 시뮬레이터) ② 칸 보기만 그리기 — "구멍 = 프로퍼티 없음"이라는 객체 관점이 사라지므로 프로퍼티 표를 주로 하고 칸 보기를 곁들인다 ③ 큰 인덱스(4294967294) 시나리오 — 칸 보기를 그릴 수 없어 정적 예제로만.

## 4. 변경 파일

- 추가 `app/concepts/array-index-length/`
  - `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `ArrayView.tsx`, `Simulator.tsx`, `concept.test.ts`, `ArrayView.test.tsx`, `Simulator.test.tsx`
  - `examples/`(7개): `index-keys.js`, `shrink-length.js`, `holes.js`, `not-index-keys.js`, `length-property.js`, `array-constructor.js`, `hole-iteration.js`
- 수정
  - `tests/e2e/helpers.ts`: `ARRAY_INDEX_LENGTH_PATH`, `ARRAY_INDEX_LENGTH_SIMULATOR_NAME`('배열 length 시뮬레이터')
  - `tests/e2e/a11y.spec.ts`: 페이지 axe, 시뮬레이터 모든 단계 axe, 특정 단계 확인(class-inheritance 케이스 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤, 시뮬레이터 진행 중 가로 스크롤, 홈 학습 순서 카드 27→28
  - `tests/e2e/navigation.spec.ts`: 카드 27→28, 마지막 '28번째'·새 제목, pager '/ 28', arrow-functions '27 / 28'·링크 2개, 새 개념 '28 / 28'·이전 링크 arrow-functions, '객체' 검색 11건·순위 '28' 추가(단계 5 판정)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 28, 마지막 개념
  - `tests/build/build-output.test.ts`: 시뮬레이터 프리렌더 describe
  - `docs/content-guide.md`: 9단계 e2e 목록에 `array-index-length`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 4번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 27개

## 5. 위험 요소

- 엔진 구현을 사실로 서술 → 원인은 `[[DefineOwnProperty]]`·ArraySetLength로만, 오해 Callout·simplifications에 "명세는 메모리 배치를 정하지 않는다"(단계 4). 본문 grep으로 '해시'·'연속된 메모리' 문장이 오해를 바로잡는 문맥에만 있는지 확인한다.
- 시뮬레이터 상태가 실제와 다름 → 실행 대조 테스트(단계 2). 음성 확인(값 하나를 바꾸면 실패).
- "length = 요소 개수" 오해를 강화하는 서술 → "가장 큰 인덱스 + 1 이상"으로 쓰고 구멍 예제로 보인다.
- 구멍 표시를 색만으로 구분 → 칸에 "구멍" 텍스트를 쓴다(단계 3, ArrayView 테스트).
- 375px 넘침 → `length` ≤ 8 테스트, 칸 보기 줄바꿈, responsive 시뮬레이터 진행 테스트(단계 3·5).
- 5번 개념(배열 메서드)과 겹침 → 메서드 동작은 쓰지 않고 별도 개념으로만 언급.
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 5에서 고친다.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx(실행 중 dev 서버 보호).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "array-index-length|<a11y 케이스 이름>|배열 length 시뮬레이터|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스가 모두 잡히는지 확인한다.
- 정확성: 예제 7개 실제 출력 = `expectedOutput`(처음엔 `[]`), concept.test 통과·음성 확인, 명세 재확인(단계 1), 본문 결과·원인 문장과 줄 번호를 메인이 대조, 참고 링크 200.
- 브라우저(dev 서버 또는 build + start, 375px·다크)
  1. `/concepts/array-index-length` → 가로 스크롤 없음, 시뮬레이터 첫 단계("실행 전")가 보인다.
  2. "인덱스와 length" 시나리오에서 `fruits[4] = 'kiwi'` 단계 → `length` 5, 칸 2·3이 "구멍", 프로퍼티 표에 키 "4"가 새로 생김 표시.
  3. "length 줄이기" 시나리오의 `nums.length = 2` 단계 → 지워진 키 "2", "3" 표시.
  4. 키보드(화살표·Tab)로 시나리오 선택과 다음/이전이 동작한다.
  5. 하단 학습 순서 '28 / 28', 이전 arrow-functions.

## 7. 미확정 사항

- [확정 2026-11-02] slug: `array-index-length`(계획 승인 — 별도 이견 없음).
- [확정 2026-11-02] 제목: '배열은 객체다: 인덱스와 length는 어떻게 움직일까'(검토 때 조정 가능).

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인, 명세 재확인

- 대상: `examples/*.js`(7개), `meta.ts`, 임시 `content.mdx`(필수 h2 3개), `route.tsx`
- 현재: 폴더 없음
- 변경: 부록 초안 7개를 그대로 옮긴다. meta(slug·title 7절 초안, summary ≤160자, category `objects`, order 260, tags: 배열, array, 인덱스, length, 희소 배열, sparse array, 구멍, Array.isArray, Array.of, 유사 배열, array index, ArraySetLength / goals 4개 / prerequisites·related 3절 / examples는 처음 `[]` / simplifications: 엔진 메모리 배치는 명세가 정하지 않음, 배열 메서드는 별도 개념, `length` writable false·configurable false 요소의 실패 경로 제외, 시뮬레이터는 length를 뺀 자기 프로퍼티만 그리고 프로토타입(Array.prototype)은 그리지 않음, 칸 보기는 설명용 표현, `console`은 호스트 API / references: 2절 명세 anchor + MDN Array·length·Array() 생성자·Array.of·희소 배열 / `reviewedAt: null`). route는 템플릿.
- 주의사항: 생성 순서 meta → content → route. 예제에 스프레드·Array.from·고차 함수 금지.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표. array index 상한·Array Initializer·Array(len) 원문 확인을 구현 진행에 기록. 참고 링크 200.

### 2. 시나리오와 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절 상태 타입·헬퍼와 시나리오 3개, 3절 테스트 ①~⑥.
- 주의사항: 각 Step은 전체 스냅샷. 첫 단계 line 없음. vm 오류는 name으로 비교.
- 완료 조건: `npx vitest run app/concepts/array-index-length/concept.test.ts` 통과. 음성 확인(한 단계의 값·length·removed 하나씩 바꾸면 실패) 후 원복.

### 3. 시각화와 시뮬레이터

- 대상: `ArrayView.tsx`, `Simulator.tsx`, `ArrayView.test.tsx`, `Simulator.test.tsx`
- 변경: property-keys View 스타일(배지, `bg-highlight`, `motion-safe`)을 따른다. 배열 카드마다 이름·`length`(바뀌면 강조), 프로퍼티 표(키·값·"인덱스"/"인덱스 아님" 배지, 새로 생김/값 바뀜 표시), 칸 보기(0..length-1, 프로퍼티 없으면 "구멍" 텍스트), "이 단계에서 지워진 키" 목록. 빈 상태 문구. `Simulator.tsx`는 `label="배열 length 시뮬레이터"` 래퍼.
- 주의사항: 색만으로 구분하지 않는다. 375px에서 넘치지 않게 칸 보기는 줄바꿈. `prevState`로 새로 생김/바뀜을 구분.
- 완료 조건: `npx vitest run app/concepts/array-index-length` 통과(ArrayView: 구멍 텍스트, 인덱스 배지, 지워진 키, length 강조 / Simulator: 첫 단계, 다음 누르면 1번 줄 강조, 시나리오 전환 시 0단계).

### 4. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2 3개. 동작 원리 h3: 배열은 객체 / 인덱스 대입과 length / length에 대입하기 / 희소 배열과 구멍 / 인덱스가 아닌 키 / length 프로퍼티와 유사 배열 / 배열 생성의 함정 / 구멍을 만나는 동작. 예제 7개마다 퀴즈, 시뮬레이터는 예제 1 뒤 독립된 줄. 결과와 이유 예제별 h3. 오해 Callout: "배열은 연속된 메모리 칸이다", "length는 요소의 개수다", "구멍은 undefined가 든 칸이다", "delete로 지우면 배열이 줄어든다".
- 주의사항: '찾히다' 금지, 엔진 구현 단정 금지, 공백 든 인라인 코드 Prettier 깨짐 확인, 이미 다룬 내용은 링크.
- 완료 조건: `npm test` 통과, 메인이 결과·원인 문장과 줄 번호 대조, `grep -c '찾히'` 0, 빌드 HTML의 인라인 코드 깨짐 0.

### 5. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로. '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 있으면 11건·순위 '28' 추가.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- this-binding·typeof-operator의 "배열은 별도 개념" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결 일괄 처리 때.

## 부록: 예제 초안

본문 예제 순서(예제 1~7)대로 적는다. 구현 단계 1에서 그대로 `examples/`에 옮긴다.

### 예제 1: `index-keys.js`

```js
var fruits = ['apple', 'banana'];
console.log(typeof fruits, Array.isArray(fruits));
console.log(JSON.stringify(Object.keys(fruits)), fruits['1']);
fruits[4] = 'kiwi';
console.log(fruits.length, 2 in fruits, fruits[2]);
fruits.color = 'red';
console.log(fruits.length, JSON.stringify(Object.keys(fruits)));
```

### 예제 2: `shrink-length.js`

```js
var nums = [10, 20, 30, 40];
nums.length = 2;
console.log(JSON.stringify(nums), 2 in nums);
nums.length = 4;
console.log(nums.length, 2 in nums, nums[2]);
nums[3] = 40;
console.log(JSON.stringify(Object.keys(nums)));
```

### 예제 3: `holes.js`

```js
var a = [1, , 3];
var b = [1, undefined, 3];
console.log(a.length, 1 in a, a[1]);
console.log(b.length, 1 in b, b[1]);
delete b[2];
console.log(b.length, 2 in b, JSON.stringify(Object.keys(b)));
```

### 예제 4: `not-index-keys.js`

```js
var list = [];
list[-1] = 'minus';
list['01'] = 'zero-one';
list[1.5] = 'half';
list[4294967295] = 'too big';
console.log(list.length, JSON.stringify(Object.keys(list)));
list[4294967294] = 'last';
console.log(list.length);
```

### 예제 5: `length-property.js`

```js
var arr = [1, 2, 3];
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(arr, 'length')));
try { arr.length = -1; } catch (e) { console.log(e.name); }
try { arr.length = 1.5; } catch (e) { console.log(e.name); }
var like = { 0: 'a', 1: 'b', length: 2 };
like[5] = 'c';
console.log(like.length, Array.isArray(like));
```

### 예제 6: `array-constructor.js`

```js
var three = new Array(3);
console.log(three.length, 0 in three, JSON.stringify(Object.keys(three)));
console.log(JSON.stringify(new Array(3, 4)), JSON.stringify(new Array('3')));
console.log(JSON.stringify(Array.of(3)), Array(3).length);
try { new Array(-1); } catch (e) { console.log(e.name); }
```

### 예제 7: `hole-iteration.js`

```js
var sparse = [1, , 3];
var keys = [];
for (var key in sparse) keys.push(key);
console.log(JSON.stringify(keys), JSON.stringify(Object.keys(sparse)));
console.log(JSON.stringify(sparse), JSON.stringify([1, undefined, 3]));
```

## 변경 이력

- 2026-11-02 (외부 콘텐츠 검수 7건, 실행·명세로 확인 후 반영): ① `in`은 프로토타입 체인까지 보므로 구멍 판별의 기준은 자기 프로퍼티(`Object.hasOwn`)라고 명시 — `Array.prototype[1]`이 있으면 `[1, , 3]`에서 `1 in a`가 true·`Object.hasOwn(a, 1)`은 false(vm 확인). 예제·시뮬레이터는 그대로 두고 본문·시나리오 설명·Callout·근거 테스트 ② `[[DefineOwnProperty]]` 분기에서 "인덱스가 아닌 키"에 `length`를 제외 ③ ArraySetLength가 지우는 기준을 "새 값 이상"으로 ④ "length는 요소 수가 아니다" → "요소 수와 같다는 보장이 없다, 구멍이 없을 때만 일치" ⑤ RangeError 예시에 2^32 이상 추가(`length = 4294967296` RangeError 확인)와 length 최댓값 2^32 − 1이 가장 큰 인덱스 2^32 − 2와 맞물린다는 문장 ⑥ "인덱스를 하나씩 읽는 쪽은 undefined처럼" → "각 인덱스를 Get으로 읽기만 하는 쪽", 배열 메서드는 메서드마다 다르고 별도 개념 ⑦ 희소 배열도 "명세 용어가 아니라 흔히 쓰는 말"로 표시(sloppy mode는 사이트 전체 표현이라 유지) — 영향 단계 2(시나리오 설명·테스트)·4(본문)
- 2026-11-02 (외부 콘텐츠 추가 검수 3건, 문장): ① 희소 배열 절의 in/Object.hasOwn 문단을 줄이고 독자가 알 수 없는 "(이 페이지의 테스트가 확인합니다)"를 빼고 `Array.prototype[1] = 'x'` 코드 예로 대체 ② 오해 Callout의 끊긴 괄호 문장을 두 문장으로 ③ "length를 제외한 인덱스가 아닌 키" → "인덱스도 length도 아닌 키" — 영향 단계 4

## 구현 진행

- baseline (2026-11-02, `91c78d1`): 직전 커밋 마무리 때 lint·format:check·typecheck 통과 / `npm test` 2729 / `test:build` 226 / e2e(arrow-functions 범위) 24 passed. 이후 변경은 `.claude/plans/`뿐
- 명세 재확인(단계 1 선행, 메인): array index 정의 "inclusive interval from +0𝔽 to 𝔽(2^32 - 2)", Note "Every 32-bit unsigned integer except 2^32 - 1 has a corresponding array index". `#sec-array-len`은 현재 판에서 "Array ( ...values )" 절이다 — 인수가 하나이고 Number가 아니면 그 값을 "0"에 넣고 length 1, Number면 `ToUint32`와 SameValueZero가 아니면 RangeError, 맞으면 `length`만 설정(요소 프로퍼티 없음). Array Initializer Note: 빠진 요소(elision)는 "contributes to the length of the Array and increases the index of subsequent elements. Elided array elements are not defined." — 구멍의 근거. 참고 자료 라벨은 "Array ( ...values )"로 쓴다
- [x] 1. 예제·meta·route — 예제 7개가 부록과 바이트 단위로 같음(`cmp`, 서브에이전트가 prettier로 한때 재포맷했다가 복구한 것을 메인이 재확인), 실제 출력 = 2절 표, 명세 anchor 9개·MDN ko 5개 200. title·summary에 '객체' 있음(단계 5에서 검색 기대값 갱신)
- [x] 2. 시나리오·테스트 — 시나리오 3개(8·8·7단계), concept.test ①~⑧ + console.log 줄은 상태 불변 검사, 음성 확인 3종(값·length·removed). 메인 수정: 없는 인덱스를 읽어 undefined인 설명 3곳에 "프로토타입 체인에도 없어서"를 명시. `npx vitest run app/concepts/array-index-length` 통과, prettier·eslint·typecheck 통과
- [x] 3. 시각화와 시뮬레이터 — ArrayView: 카드(이름·`length` 배지, 바뀌면 강조+"바뀜"), 자기 프로퍼티 표(키·값·인덱스/인덱스 아님 배지, 새로 생김/값 바뀜, 마지막 행 `"length"`·열거 안 됨), "이 단계에서 지워진 키", 칸 보기(점선 테두리 + "구멍" 텍스트, flex-wrap, "설명용 표현" 안내). 메인이 코드 확인, `npx vitest run app/concepts/array-index-length` 45 통과, eslint 통과
- [x] 4. 본문 작성 — 서브에이전트 초안을 메인이 명세·예제와 대조. 줄 번호·결과는 모두 맞음(서브에이전트가 예제 4 줄 번호를 의심했으나 파일 8줄 기준 7번 대입·8번 출력이 맞음). 메인 수정 6곳: ① "가장 큰 인덱스가 2^32 − 2인 이유는 length 표현 때문"이라는 근거 없는 추론 삭제 → 예제 4 결과로 대체 ② "정규 숫자 문자열" 용어를 "숫자로 바꿨다 다시 문자열로 바꿔도 같은 키(CanonicalNumericIndexString)"로 풀어 씀(3곳) ③ "구멍은 세 가지 경로"인데 넷을 나열 → 경로 나열로 고치고 delete·new Array(3) 근거 추가 ④ RangeError 조건 "(음수이거나 소수이면)" → "(예: 음수나 소수)" ⑤ "length는 요소 개수" Callout 첫 문장을 "항상 가장 큰 배열 인덱스보다 큰 값"으로 ⑥ "undefined를 넣은 요소는 나열"의 근거를 예제 3의 6번 줄로. '찾히' 0건, 빌드 HTML 인라인 코드 깨짐 0건
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서 — diff 검토('객체' 검색 단언 4곳 모두 '객체' 검색 문맥에서 10→11, 순위 '28' 추가, 카드 28, arrow-functions 27/28 링크 2개, 새 개념 28/28). e2e `--list`로 새 케이스 18개 확인 후 실행
- 전체 검증 (2026-11-02): lint·format:check·typecheck 통과 / `npm test` 89 files 2793 통과 / `test:build` 234 통과 / e2e 새 개념 범위: navigation 16 passed + 새 페이지·시뮬레이터·홈 18 passed
- 브라우저 확인(dev 5173, Playwright 375px·다크): 페이지 가로 스크롤 없음, "인덱스와 length" 5단계에서 length 5·"바뀜", 키 "4" 새로 생김, 칸 2·3 "구멍"(점선), "length 줄이고 늘리기" 3단계에서 "이 단계에서 지워진 키: "2", "3"". 전환 직후 이전 단계 강조가 300ms 애니메이션으로 남아 보이는 것은 잔상이며 0.6초 뒤 배경 투명 확인(상태에는 changed 없음)
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0, 계획 대조 차이 없음. 확인: isArrayIndex가 명세 정의(CanonicalNumericIndexString, 0~2^32 − 2)와 같고 `"-0"`도 인덱스로 보지 않음, 실행 대조 테스트가 상태 전부를 덮음, 색만으로 구분하는 표시 없음, loader 없음·첫 단계 프리렌더(test:build). 본문 정확성 수정은 단계 4 기록
- 외부 검수 반영(2026-11-02, 변경 이력 ①~⑦): 본문 8곳, 시나리오 설명 2곳, 근거 테스트 2개(Array.prototype[1]이 있을 때 in true·Object.hasOwn false, length = 2^32 RangeError·2^32 − 1 허용). 검증: lint·format:check·typecheck 통과 / `npm test` 2795 / `test:build` 234 / e2e 새 개념 범위 navigation 16 + 18 passed
- 외부 추가 검수 반영(2026-11-02, 문장 3건): 검증 lint·format:check 통과 / `npm test` 2795 / `test:build` 234 / e2e 새 개념 범위 아래
- e2e (추가 검수 반영 후, 새 개념 범위):   16 passed (4.4s)   18 passed (40.3s) 
- 사용자 최종 승인(2026-11-02): 콘텐츠 검토 승인 → `reviewedAt` 2026-11-02 기록("검토 중" 배지 제거), 커밋·main push(Vercel 배포) 요청

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 7개, length 시뮬레이터 시나리오 3개(8·8·7단계), 퀴즈 7개, 오해 Callout 4개, 고정 테스트·e2e·빌드 테스트·문서). 근거 테스트는 계획보다 늘었다(`in`과 프로토타입 체인, `length` 2^32 대입, console.log 줄의 상태 불변).
- 외부 검수 2회(7건·3건)로 범위 안에서 문장을 바로잡았다(변경 이력). 예제와 시뮬레이터 코드는 계획 원문 그대로다.

### 코드 리뷰

- critical-code-review 1차(메인 직접): Critical·High 0. 본문의 명세 정확성 수정 6곳은 단계 4에서 메인이 반영.

### 후속 작업

- [ ] this-binding·typeof-operator의 "배열은 별도 개념" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결 일괄 처리 때
- [ ] "(이 페이지의 테스트가 확인합니다)" 표현을 class-basics(3곳)·arrow-functions(5곳)에서도 바꿀지 사용자 결정

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 원인 설명을 엔진 구현(해시 테이블·연속 메모리) 없이 배열의 `[[DefineOwnProperty]]`와 ArraySetLength로만 함 — 명세는 메모리 배치를 정하지 않으므로, 오해 Callout과 simplifications에서 "정하지 않는다"고만 밝힘.
- [Claude 판단] 시뮬레이터를 "프로퍼티 표가 주, 칸 보기는 보조(설명용 표현)"로 설계 — 칸 보기만 그리면 "구멍 = 프로퍼티 없음"이라는 객체 관점이 사라진다. 인덱스 여부와 칸 보기는 키에서 계산하고 상태에 중복 저장하지 않음.
- [Claude 판단] 시뮬레이터 상태를 단계마다 예제를 그 줄까지 실제로 실행한 결과(키 순서·값·length·출력)와 대조하는 테스트로 검증 — 상태를 손으로 쓰면 틀릴 수 있어서. 모든 단계 length ≤ 8로 칸 보기가 375px에서 넘치지 않게 강제.
- [Claude 판단] 외부 검수의 "`in`은 체인까지 본다"를 예제 변경 없이 본문·시나리오 설명·근거 테스트로 반영 — 예제 결과는 체인에 인덱스 키가 없다는 전제에서 자기 프로퍼티 여부와 같으므로, 기준(`Object.hasOwn`)만 명시.
- [무검토 승인] slug `array-index-length`, 제목 '배열은 객체다: 인덱스와 length는 어떻게 움직일까', category `objects`, order 260.
- 추가 주제 4개(인덱스가 아닌 키, length 프로퍼티와 유사 배열, 배열 생성의 함정, 구멍을 만나는 동작)와 length 시뮬레이터는 사용자가 골랐다.

#### 배경지식

- 배열 인덱스: CanonicalNumericIndexString이 0 이상 2^32 − 2 이하 정수를 돌려주는 키. `'01'`(되돌리면 `'1'`), `'-1'`, `'1.5'`, `'4294967295'`는 아니다.
- 배열의 `[[DefineOwnProperty]]`: 키가 `length`면 ArraySetLength, 배열 인덱스면 정의 후 index ≥ length일 때 length를 index + 1로, 그 외는 일반 객체와 같다.
- ArraySetLength: ToUint32와 ToNumber가 다르면 RangeError(음수·소수·2^32 이상), 커지면 length만, 작아지면 새 값 이상인 인덱스 프로퍼티를 큰 것부터 삭제.
- 구멍은 자기 프로퍼티가 없는 인덱스. 읽으면 체인을 거쳐 undefined, `in`은 체인까지 보고 `Object.hasOwn`은 자기 프로퍼티만 본다. `delete`는 length를 바꾸지 않는다.
- OrdinaryOwnPropertyKeys는 배열 인덱스 키를 오름차순으로 먼저, 나머지 문자열 키를 생성 순서로 낸다.

#### 확인 질문

1. `fruits[4] = 'kiwi'` 뒤에 `length`가 5가 되지만 `'2'`·`'3'` 프로퍼티는 생기지 않는 이유는?
   <details><summary>답</summary>배열의 [[DefineOwnProperty]]는 키 '4' 하나만 정의하고, 4 ≥ length(2)이므로 length를 4 + 1로 올릴 뿐 다른 인덱스는 만들지 않는다(2절 사실, 시나리오 index-keys 5단계).</details>
2. `nums.length = 4`로 다시 늘려도 지워진 값이 돌아오지 않는 이유는?
   <details><summary>답</summary>ArraySetLength는 새 값이 기존 이상이면 length 값만 바꾸고 요소 프로퍼티를 만들지 않는다. 앞서 줄일 때 '2'·'3'은 [[Delete]]로 지워졌다(2절, 예제 2).</details>
3. [Claude 판단] 구멍을 판별할 때 `in`보다 `Object.hasOwn`이 기준인 이유와, 예제가 `in`을 써도 결과가 맞는 조건은?
   <details><summary>답</summary>구멍은 "자기 프로퍼티가 없음"인데 in은 프로토타입 체인까지 본다. Array.prototype[1]이 있으면 [1, , 3]에서도 1 in a가 true다. 예제는 체인에 인덱스 키가 없어서 in 결과가 자기 프로퍼티 여부와 같다(변경 이력 외부 검수 ①, 근거 테스트).</details>
4. `{0: 'a', 1: 'b', length: 2}`에 `like[5] = 'c'`를 해도 length가 2인 이유는?
   <details><summary>답</summary>평범한 객체라 배열의 특별한 [[DefineOwnProperty]]가 없다. length를 맞추는 것은 Array exotic object의 동작이지 length라는 이름의 프로퍼티가 있어서가 아니다(예제 5).</details>
5. [Claude 판단] 시뮬레이터 상태를 실행 결과와 대조하지 않았다면 무엇을 놓칠 수 있었나?
   <details><summary>답</summary>Object.keys 순서(인덱스 먼저), 지워진 키, length 값 같은 손으로 쓴 상태의 오류. 음성 확인으로 값·length·removed를 하나씩 바꾸면 실패하는 것을 확인했다(구현 진행 단계 2).</details>
