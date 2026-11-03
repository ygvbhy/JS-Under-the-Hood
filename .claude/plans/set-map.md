# 개념 'Set과 Map' 구현 계획

- 상태: 완료
- 작성일: 2026-11-03
- 기준: `main` @ `0ccab19`

## 0. 요약

- 목적: 25~37장 로드맵 11번(마지막) `/concepts/set-map`을 추가한다. 37장 Set·Map에서 `NaN`이 한 번만 들어가고 `0`과 `-0`이 같은 키인 이유(SameValueZero), 모양이 같은 객체가 다른 키인 이유(동일성), 일반 객체에 객체 키를 넣으면 `'[object Object]'` 하나로 합쳐지는 이유(ToPropertyKey), 삽입 순서, 순회 중 추가·삭제, Map을 일반 객체처럼 쓸 때의 함정, WeakMap·WeakSet을 예제 8개와 같음 비교표로 명세 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `objects`, order 330으로 학습 순서 35번째·마지막, 정적 비교표 + 퀴즈). 마지막 개념과 '객체' 검색 결과가 바뀌므로 고정 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 34개는 바꾸지 않는다.
- 위험: ① 엔진 구현(해시 테이블 등)을 사실처럼 쓰거나 명세의 `[[MapData]]` 목록·`empty` 표시를 실제 구조로 서술 ② 판마다 다른 `add`·`set` 알고리즘(ES2024판 SameValueZero 비교 후 `-0`→`+0`, ES2025판부터 CanonicalizeKeyedCollectionKey 후 SameValue)을 한쪽만 단정 ③ WeakMap의 가비지 컬렉션 시점을 관찰 가능한 것처럼 씀 → 명세 원문·판별 링크로 서술하고 단순화에 밝힘.
- 복잡도: 중간 · Consensus: 생략. 직전 symbol·spread-destructuring과 같은 "실행 검증 표 + 퀴즈" 패턴이고 공통 코드를 바꾸지 않는다. 예제 출력·표 40칸·핵심 주장은 명세 원문(현재 초안, ES2024·ES2025판)과 vm 실행으로 미리 확인했다.
- 미확정: 없음(추가 주제 4개·시각화·slug·제목은 2026-11-03 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 11번 "Set과 Map: 키는 어떻게 같다고 판단할까"(37장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-03)
  - 기본 범위: Set·Map 기본 사용(`add`·`set`·`get`·`has`·`delete`·`size`), 키 비교는 SameValueZero(`NaN`은 하나, `0`과 `-0`은 같은 키), 객체 키는 동일성(모양이 같은 새 객체는 다른 키), 일반 객체는 키를 문자열로 바꿔 객체 키가 `'[object Object]'`로 합쳐짐.
  - 추가 주제 4개 모두: **삽입 순서**, **순회 중 추가·삭제**, **일반 객체처럼 쓸 때의 함정**(프로퍼티 vs 엔트리, `JSON.stringify`, `Object.entries`·`fromEntries` 변환), **WeakMap·WeakSet 소개**.
  - 시각화: **같음 비교표 + 퀴즈**(값 쌍마다 `===`·`Object.is`·Set·Map·일반 객체 키 결과 비교, 칸마다 실행 검증).
  - slug `set-map`, 제목 "Set과 Map: NaN은 왜 한 번만 들어갈까".
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① Set과 Map 기본(예제 1 `basics.js`): Set은 같은 값을 한 번만 담는 컬렉션, Map은 키와 값의 쌍을 담고 키는 어떤 값이든 된다(명세 Set Objects·Map Objects 머리말). 생성자는 이터러블을 받는다(Map은 `[키, 값]` 쌍의 이터러블 — AddEntriesFromIterable, `new` 없이 부르면 TypeError). `add`·`set`은 그 Set·Map 자신을 돌려줘 이어 부를 수 있고, 이미 있는 값의 `add`는 아무것도 바꾸지 않으며 이미 있는 키의 `set`은 값만 바꾼다. `delete`는 지웠으면 `true`. `size`는 `Map.prototype`의 접근자 프로퍼티(get 함수만 있음). Set·Map은 이터러블이라 스프레드·`for...of`로 돈다([이터러블과 for...of](/concepts/iterable-for-of), [스프레드와 디스트럭처링](/concepts/spread-destructuring)). 예제 3번 줄의 인수는 왼쪽부터 평가되므로 `size`가 `delete` 전후로 3·2.
  - ② 키는 SameValueZero로 구분한다(예제 2 `same-value-zero.js`): 명세는 "Distinct values are discriminated using the semantics of the SameValueZero comparison algorithm"이라고 정한다. SameValueZero는 `NaN`을 `NaN`과 같다고 보고 `+0`과 `-0`을 같다고 본다([배열 메서드의 함정](/concepts/array-method-pitfalls)의 `includes`와 같은 비교, `===`·`Object.is`는 [동등 비교](/concepts/equality-operators)). 알고리즘 판 차이: ES2024판까지 `Set.prototype.add`·`Map.prototype.set`은 SameValueZero로 기존 값과 비교한 뒤 `-0`이면 `+0`으로 바꿔 넣었고, ES2025판부터는 먼저 CanonicalizeKeyedCollectionKey로 `-0`을 `+0`으로 바꾼 뒤 SameValue로 비교한다. 두 방식의 관찰 결과는 같다 — 저장된 값은 `+0`(`Object.is(stored[1], 0)` true). 타입이 다르면 같지 않으므로 `1`·`'1'`·`true`·`'true'`는 네 개.
  - ③ 객체 키는 동일성으로 구분한다(예제 3 `object-keys.js`): 객체끼리의 SameValueZero는 SameValueNonNumber의 동일성 비교라 모양(프로퍼티)이 같아도 다른 객체면 다른 키다. 키로 쓴 객체의 프로퍼티를 바꿔도(변경) 같은 객체이므로 그대로 찾고, 모양이 같은 새 객체로는 찾을 수 없다. 재할당/변경 구분은 [원시 값과 객체](/concepts/primitives-and-objects).
  - ④ 일반 객체의 키는 문자열로 바뀐다(예제 4 `plain-object-keys.js`): 대괄호 표기의 키는 ToPropertyKey를 거쳐 객체는 문자열 `'[object Object]'`, 숫자 `1`은 `'1'`이 된다([프로퍼티 키](/concepts/property-keys)). 그래서 서로 다른 두 객체 키가 같은 프로퍼티 하나가 되고 나중 대입이 덮어쓴다. Map은 키를 변환하지 않아 네 엔트리. 심벌 키는 문자열로 바뀌지 않아 일반 객체에서도 구분된다([심벌](/concepts/symbol)) — 비교표의 심벌 행.
  - ⑤ 삽입 순서(예제 5 `insertion-order.js`): Map·Set은 엔트리를 `[[MapData]]`·`[[SetData]]` 목록 끝에 덧붙이고 이터레이터가 그 순서로 돈다. 일반 객체의 키 나열(OrdinaryOwnPropertyKeys)은 배열 인덱스 형태 키가 먼저 오름차순이라 `["2","10","b","a"]`이지만 Map은 넣은 순서 `["b","a",10,2]`(숫자 키도 숫자 그대로). 이미 있는 키의 `set`은 값만 바꿔 자리를 유지하고, `delete` 후 다시 `set`하면 새 엔트리라 맨 뒤.
  - ⑥ 순회 중 추가·삭제(예제 6 `mutate-while-iterating.js`): CreateSetIterator(Map도 같은 구조)는 인덱스를 하나씩 올리며 돌고, 값을 돌려준 뒤 목록 길이를 다시 읽는다(명세 NOTE: "The number of elements in entries may have increased"). 그래서 순회 중 `add`한 값도 방문한다. `delete`는 명세상 그 자리를 `empty`로 바꾸고 이터레이터는 `empty`를 건너뛰므로 아직 방문하지 않은 값을 지우면 방문하지 않는다. `empty`는 명세의 표기 장치이고 구현은 실제로 지울 수 있다(명세 Note) — 단순화에 밝힘. 무한 루프 주의(조건 `n < 3`).
  - ⑦ Map을 일반 객체처럼 쓰면(예제 7 `not-a-plain-object.js`): Map의 엔트리는 프로퍼티가 아니라 내부 슬롯 `[[MapData]]`에 있다. `m.b = 2`는 Map 객체에 프로퍼티 `b`를 만들 뿐 엔트리가 아니라 `size`는 1, `has('b')`는 false, `get('b')`는 undefined. `JSON.stringify(m)`은 자기 열거 가능 프로퍼티만 보므로 엔트리는 빠지고 `{"b":2}`. 객체 → Map은 `new Map(Object.entries(obj))`, Map → 객체는 `Object.fromEntries(map)`(키는 문자열로 바뀜). 엔트리를 보려면 스프레드.
  - ⑧ WeakMap과 WeakSet(예제 8 `weak.js`): 키(WeakSet은 값)는 CanBeHeldWeakly가 true인 값 — 객체, 그리고 `Symbol.for`로 등록하지 않은 심벌 — 만 되고 원시 값은 TypeError(근거 테스트). 명세는 키를 내놓지 않고는 키를 관찰할 수 없게 하라고 요구하므로(WeakMap Objects) `size`·`keys`·`forEach`·이터레이터가 없다(`typeof` undefined). 다른 곳에서 더 이상 닿을 수 없게 된 키의 엔트리는 구현이 제거할 수 있지만 그 시점은 정하지 않고 관찰할 수도 없다 — 예제로 보이지 않고 단순화에 밝힘.
  - ⑨ 같음 비교표(표): 3절 표.

### 유지해야 하는 기존 동작

- 기존 개념 34개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만). 기존 페이지의 "Map·Set은 별도 개념" 문구(`iterable-for-of/meta.ts:107` 등)의 역방향 링크는 사용자 결정대로 나중에 일괄 처리한다.
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 표는 정적 마크업이라 JS 없이 보인다.

### 제외 범위

- ES2025 Set 메서드(`union`·`intersection` 등), `Map.groupBy`(ES2024), `getOrInsert`(현재 초안) — 책 범위 밖, 단순화에 이름만
- WeakRef·FinalizationRegistry, 가비지 컬렉션 동작, 성능(명세의 "sublinear" 요구는 한 줄 언급만)
- Map·Set 서브클래싱, `Symbol.species`, `forEach`의 `thisArg`
- `clear`·`entries`·`keys`·`values`의 개별 설명(예제에 쓰는 것만), `Set.prototype.keys === values`는 한 줄 + 근거 테스트

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안(ES2027), scratchpad `sd/spec.html`, 2026-11-03 확인. 판 비교는 `sd/spec2024.html`·`spec2025.html`·`spec2026.html`)

- Set Objects(`#sec-set-objects`): "A Set may contain each distinct value at most once. Distinct values are discriminated using the semantics of the SameValueZero comparison algorithm." Map Objects(`#sec-map-objects`): 키와 값은 어떤 값이든, 키는 SameValueZero로 구분. 둘 다 "hash tables or other mechanisms … sublinear" 요구와 "The data structure used in this specification is only intended to describe the required observable semantics".
- SameValueZero(`#sec-samevaluezero`): 타입이 다르면 false, Number면 `Number::sameValueZero`, 아니면 SameValueNonNumber. Note: SameValue와 `+0`/`-0`을 같다고 보는 점만 다름.
- `Set.prototype.add`(`#sec-set.prototype.add`) 현재 초안·ES2025·ES2026판: `CanonicalizeKeyedCollectionKey(value)` → 기존 엔트리와 SameValue → 없으면 Append, `Return set`. ES2024판(`tc39.es/ecma262/2024/#sec-set.prototype.add`): SameValueZero로 비교 → "If value is -0𝔽, set value to +0𝔽" → Append. `Map.prototype.set`(`#sec-map.prototype.set`)도 같은 구조(있으면 `[[Value]]`만 바꿈). CanonicalizeKeyedCollectionKey(`#sec-canonicalizekeyedcollectionkey`): `-0`이면 `+0`. 이 연산은 ES2025판에 처음 있다(2024판 anchor 없음).
- `Map.prototype.get`(`#sec-map.prototype.get`): 키를 정규화한 뒤 SameValue, 없으면 undefined. `Set.prototype.delete`(`#sec-set.prototype.delete`): 엔트리를 `empty`로 바꾸고 true, Note: `empty`는 명세 표기 장치이며 구현은 실제로 지울 수 있다.
- CreateSetIterator(`#sec-createsetiterator`)·CreateMapIterator(`#sec-createmapiterator`): index를 올리며 `empty`가 아닌 엔트리만 내보내고, NOTE "The number of elements in entries may have increased while execution of this abstract operation was paused by GeneratorYield"에 따라 길이를 다시 읽는다. `Set.prototype.forEach`(`#sec-set.prototype.foreach`): 콜백 인수는 `(값, 값, set)`, Note에 순회 중 추가한 값은 방문, 방문 전 삭제한 값은 방문하지 않음.
- `get Map.prototype.size`(`#sec-get-map.prototype.size`): set 접근자가 undefined인 접근자 프로퍼티, `empty`가 아닌 엔트리 수.
- Map 생성자·AddEntriesFromIterable(`#sec-add-entries-from-iterable`): NewTarget이 undefined면 TypeError, 이터러블의 각 값에서 `"0"`·`"1"`을 읽어 `set` 호출.
- WeakMap Objects(`#sec-weakmap-objects`): 키는 객체 및/또는 심벌, "no mechanism is provided for enumerating the values it holds as keys", "must not provide any means to observe a key of a WeakMap that does not require the observer to present the observed key", 살아 있지 않은 키는 제거될 수 있고 지연 시간은 구현이 정함. WeakSet Objects(`#sec-weakset-objects`). CanBeHeldWeakly(`#sec-canbeheldweakly`): 객체면 true, 심벌이고 KeyForSymbol이 undefined면 true, 아니면 false.
- ToPropertyKey(`#sec-topropertykey`), OrdinaryOwnPropertyKeys(`#sec-ordinaryownpropertykeys`) — symbol·property-keys 페이지에서 쓴 것과 같음.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/sm/ex/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `basics.js` | `3 true true 2` / `2 31 undefined true` / `["js","html"] [["kim",31],["lee",25]]` |
| 2 `same-value-zero.js` | `2 true false` / `true false` / `not a number 4` |
| 3 `object-keys.js` | `2 true false` / `first undefined false` |
| 4 `plain-object-keys.js` | `["[object Object]"] B` / `1 string` / `4 A number` |
| 5 `insertion-order.js` | `["2","10","b","a"]` / `["b","a",10,2]` / `[["b",100],[10,3],[2,4],["a",200]]` |
| 6 `mutate-while-iterating.js` | `[1,2,3] 3` / `["a","c"] 2` |
| 7 `not-a-plain-object.js` | `1 false undefined 2` / `{"b":2} ["b"]` / `1 {"x":1,"y":2}` / `[["a",1]]` |
| 8 `weak.js` | `data true false` / `undefined undefined undefined` / `true undefined` |

- 같음 비교표(행마다 준비 코드로 `a`·`b`를 정의하고 열마다 probe 실행, 결과 true = "같음", false = "다름"):

| 값 쌍 (준비 코드) | `a === b` | `Object.is(a, b)` | Set·Map(SameValueZero) | 일반 객체 키 |
| - | - | - | - | - |
| `NaN`, `NaN` | 다름 | 같음 | 같음 | 같음 |
| `0`, `-0` | 같음 | 다름 | 같음 | 같음 |
| `1`, `'1'` | 다름 | 다름 | 다름 | 같음 |
| `true`, `'true'` | 다름 | 다름 | 다름 | 같음 |
| `'a'`, `'a'` | 같음 | 같음 | 같음 | 같음 |
| `{}`, `{}`(서로 다른 두 객체) | 다름 | 다름 | 다름 | 같음 |
| `a`, `a`(같은 객체) | 같음 | 같음 | 같음 | 같음 |
| `Symbol('k')`, `Symbol('k')` | 다름 | 다름 | 다름 | 다름 |

  - probe: `String(a === b)`, `String(Object.is(a, b))`, `String(new Set([a, b]).size === 1)`(Map도 `String(new Map([[a, 1], [b, 2]]).size === 1)`이 모든 행에서 Set과 같음 — 테스트로 확인), `var o = {}; o[a] = 1; o[b] = 2; String(Object.keys(o).length + Object.getOwnPropertySymbols(o).length === 1)`.
- 근거 테스트로 쓸 것(실행 확인): TypeError — `new WeakMap().set(1, 1)`, `new WeakSet().add('a')`, `new WeakMap().set(Symbol.for('r'), 1)`, `Map()`(new 없이), `new Set(5)`(이터러블 아님). 성공 — `new WeakMap().set(Symbol('u'), 1)`. 기타 — Set `forEach` 콜백 인수 `["x","x",1]`, `Set.prototype.keys === Set.prototype.values` true, `Object.getOwnPropertyDescriptor(Map.prototype, 'size')`의 `get`은 함수·`set`은 undefined, 이미 있는 값 `add`의 반환이 같은 Set이고 `size` 변화 없음.

### 사실 (코드에서 확인)

- 겹치는 기존 개념: `array-method-pitfalls`가 SameValueZero(`includes`)를 다룸(`content.mdx:47`, `meta.ts:18,27,125`). `equality-operators`가 SameValueZero는 다루지 않는다고 적음(`meta.ts:90`). `iterable-for-of`가 Map·Set 이터레이터를 다루지 않는다고 적음(`meta.ts:107`). `property-keys`가 객체 키 → 문자열 변환을 다룸. `symbol`이 심벌 키, OrdinaryOwnPropertyKeys 순서를 다룸. `spread-destructuring`이 스프레드·`Object.entries` 미사용(이번에 `Object.entries`·`fromEntries` 처음 사용 — 책 범위 안의 내장 함수).
- 표 패턴: `app/concepts/spread-destructuring/default-table.ts`·`concept.test.ts`(setup + probe, 칸마다 새 vm 컨텍스트), 표 렌더링 `app/concepts/spread-destructuring/content.mdx`의 "기본값 표로 정리"(`role="region"`·`tabIndex={0}`·`aria-label`·`overflow-x-auto`, `th scope`). route 템플릿 `app/concepts/spread-destructuring/route.tsx`.
- 현재 마지막 개념 spread-destructuring(order 320, 34번째). order 330이면 35번째이자 마지막. category 타입 `app/lib/concepts.ts:1`.
- 검색: `filterConcepts`는 title·summary·tags 부분 일치(`app/lib/concepts.ts:70-78`). 새 summary에 '일반 객체'가 들어가므로 홈 '객체' 검색 결과가 13→14개, 순위 목록 끝에 `'35'`(`tests/e2e/navigation.spec.ts`의 `toHaveCount(13)` 3곳과 ranks 배열 끝 `'34'` 다음 — 직전 커밋 `0ccab19`이 바꾼 같은 자리).
- 고정값(현재): 개수 34·마지막 spread-destructuring — `tests/e2e/navigation.spec.ts`(카드 수 34 두 곳, 마지막 '34번째'·제목, pager 분모 `/ 34` 전부, spread-destructuring '34 / 34' 블록), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 34), `app/lib/concepts.test.ts:108`(total 34, 마지막 spread-destructuring, prev iterable-for-of), `app/components/concept/ConceptPager.test.tsx:27`('1 / 34', '34 / 34', 이전 iterable-for-of). 직전 커밋 `0ccab19`의 같은 파일 변경을 본뜬다.
- e2e·빌드 등록 위치: `tests/e2e/helpers.ts:60`(경로 상수 뒤), `tests/e2e/a11y.spec.ts:789-794`(spread-destructuring 케이스 형태), `tests/e2e/responsive.spec.ts:892-900`, `tests/build/build-output.test.ts:960-973`(describe 형태, 그 뒤에 추가), `docs/content-guide.md:167` e2e 목록.
- e2e 이름: 기존 e2e·빌드 테스트에 'set-map'·'Set과 Map'이 없다(grep 0건) → `-g "set-map|Set과 Map|홈 학습 순서 보기"`로 새 케이스만 잡힌다(단계 4에서 `--list` 확인).
- MDN ko 링크 200 확인(2026-11-03): `Global_Objects/Set`, `Global_Objects/Map`, `Global_Objects/WeakMap`, `Global_Objects/WeakSet`, `Global_Objects/Object/fromEntries`, `Equality_comparisons_and_sameness`.

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "Set·Map은 키를 바꾸지 않고 그대로 비교하고, 그 비교가 SameValueZero다. 일반 객체는 키를 먼저 문자열(또는 심벌)로 바꾼다. 같은 값을 넣어도 결과가 다른 것은 이 두 규칙이 다르기 때문이다." 원인은 명세 이름(SameValueZero, CanonicalizeKeyedCollectionKey, SameValue, ToPropertyKey, OrdinaryOwnPropertyKeys, CreateSetIterator, CanBeHeldWeakly)으로 설명하고, `[[MapData]]`·`empty`는 명세가 관찰 가능한 동작을 설명하려고 쓰는 목록 표기이지 구현 구조가 아니라고 밝힌다(명세 원문 근거). 절 번호는 라벨에 쓰지 않는다. 판 차이는 ②에서 한 번만, ES2024판 링크와 함께.
- 같음 비교표(`sameness-table.ts` + content.mdx 표)
  - 데이터: `export const columns = [{ key: 'strict', label: 'a === b', probe: 'String(a === b)' }, { key: 'is', label: 'Object.is(a, b)', probe: … }, { key: 'collection', label: 'Set·Map (SameValueZero)', probe: Set probe }, { key: 'object', label: '일반 객체 키', probe: … }]`, `export const rows: { pair: string; setup: string; same: [boolean, boolean, boolean, boolean] }[]` — 행 8개(2절 표 순서, `pair`는 표에 보일 문자열 예 `NaN, NaN`, `{}, {} (서로 다른 객체)`, `a, a (같은 객체)`). 칸 텍스트는 `same`에서 '같음'/'다름'으로 만든다.
  - 렌더: spread-destructuring 표 마크업 그대로(`aria-label="값 쌍마다 ===, Object.is, Set·Map, 일반 객체 키가 같다고 보는지 비교한 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"`, 첫 열 `th scope="row"`에 `<code>`). 표 위 문단에 열마다 무엇을 실행했는지(같음 판단 기준: Set은 두 값을 넣은 Set의 `size`가 1인지, 일반 객체 키는 두 값을 키로 대입한 뒤 키가 하나인지)와 "칸마다 실제로 실행해 대조"를 쓴다. 표 아래 문단: `NaN` 행과 `0` 행에서 `===`·`Object.is`·SameValueZero가 갈리고, 일반 객체 키는 심벌을 빼면 모두 '같음'이 될 수 있다(문자열로 바뀌어서).
- 테스트(`concept.test.ts`)
  - ① 표 근거: 행 8개·열 4개, 칸마다 새 vm 컨텍스트에서 `setup + probe` 결과가 `String(same[i])`, 모든 행에서 Map probe 결과가 Set probe 결과와 같음.
  - ② 본문 주장 근거: 2절 "근거 테스트로 쓸 것" 전부 + 저장된 `-0`이 `+0`(`Object.is([...new Set([-0])][0], 0)`), Map 키도 같음(`Object.is([...new Map([[-0, 1]]).keys()][0], 0)`).
- 장 범위: 37장까지. 예제에 스프레드(35장)·`for...of`(34장)·`JSON.stringify`(43장, 출력 도구)·`Object.entries`·`Object.fromEntries`·`Object.is`·`Symbol.iterator`를 쓴다. try...catch(47장)는 쓰지 않고 TypeError는 본문 문장 + 근거 테스트.
- meta
  - slug `set-map`, title "Set과 Map: NaN은 왜 한 번만 들어갈까", category `objects`, order 330, `reviewedAt: null`
  - summary: "Set과 Map은 키를 바꾸지 않고 SameValueZero로 비교해 NaN은 하나, 0과 -0은 같은 키로 봅니다. 키를 문자열로 바꾸는 일반 객체와 무엇이 다른지, 삽입 순서와 WeakMap까지 명세로 확인합니다."(구현 때 길이 확인, '일반 객체' 포함)
  - tags: Set, Map, WeakMap, WeakSet, SameValueZero, NaN, 키 비교, 삽입 순서, 컬렉션
  - goals 4개: ① Set·Map이 SameValueZero로 키를 구분해 `NaN`이 하나·`0`과 `-0`이 같은 키가 되는 이유와 `===`·`Object.is`와의 차이 ② 객체 키는 동일성이라 모양이 같은 새 객체로는 찾지 못하고, 일반 객체는 ToPropertyKey로 키를 문자열로 바꿔 객체 키가 합쳐지는 이유 ③ 삽입 순서·순회 중 추가와 삭제의 결과 예측 ④ Map 엔트리와 프로퍼티의 차이(`JSON.stringify`·변환), WeakMap·WeakSet의 키 조건과 나열할 수 없는 이유
  - prerequisites: 동등 비교(`equality-operators`), 프로퍼티 키(`property-keys`), 이터러블과 for...of(`iterable-for-of`)
  - related: `equality-operators`, `property-keys`, `iterable-for-of`, `array-method-pitfalls`, `symbol`, `spread-destructuring`, `primitives-and-objects`
  - simplifications: ES2025 Set 메서드·`Map.groupBy`·`getOrInsert`는 책 범위 밖 / `[[MapData]]`·`[[SetData]]`와 `empty`는 명세의 표기이며 구현은 해시 테이블 등을 쓴다(명세가 "sublinear" 접근을 요구), 성능은 다루지 않음 / 판 차이(ES2024판 SameValueZero 후 `-0`→`+0`, ES2025판부터 정규화 후 SameValue)는 결과가 같으며 본문은 현재 초안 기준 / WeakMap 엔트리가 언제 제거되는지는 명세가 정하지 않고 관찰할 수도 없어 예제로 보이지 않으며 WeakRef·FinalizationRegistry는 다루지 않음 / 서브클래싱·`Symbol.species`·`forEach`의 `thisArg`는 다루지 않음 / `JSON.stringify`는 43장, 출력 도구로만 / try...catch(47장) 대신 테스트 / `console`은 호스트 API
  - references: 2절 anchor 중 본문에 쓰는 것 + ES2024판 `Set.prototype.add` + MDN ko 6개
- 버린 대안
  - ① 키 비교 시뮬레이터: 사용자 결정(비교표 + 퀴즈).
  - ② 표에 `==` 열: 동등 비교 페이지에서 다뤘고 열이 5개가 되면 375px에서 너무 넓다.
  - ③ Map 열을 따로 두기: 모든 행에서 Set과 같으므로 한 열로 합치고 테스트로 같음을 보장한다.
  - ④ WeakMap GC를 예제로 보이기: 명세가 관찰 수단을 금지하고 시점도 정하지 않아 실행 검증이 불가능하다.

## 4. 변경 파일

- 추가 `app/concepts/set-map/`
  - `meta.ts`, `content.mdx`, `route.tsx`(spread-destructuring 템플릿), `sameness-table.ts`, `concept.test.ts`
  - `examples/`(8개): `basics.js`, `same-value-zero.js`, `object-keys.js`, `plain-object-keys.js`, `insertion-order.js`, `mutate-while-iterating.js`, `not-a-plain-object.js`, `weak.js`
- 수정
  - `tests/e2e/helpers.ts`: `SET_MAP_PATH = '/concepts/set-map'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe(라이트·다크, '정답 확인' 버튼 보인 뒤), 이름 '개념 페이지: Set과 Map'
  - `tests/e2e/responsive.spec.ts`: `${SET_MAP_PATH}: 가로 스크롤이 없다`, 홈 학습 순서 카드 34→35
  - `tests/e2e/navigation.spec.ts`: 카드 34→35(두 곳), 마지막 '35번째'와 새 제목, pager 분모 34→35 전부, spread-destructuring '34 / 35'·링크 2개(이전 iterable-for-of, 다음 set-map), 새 개념 '35 / 35'·이전 링크 spread-destructuring, '객체' 검색 13→14(3곳)와 순위 목록에 `'35'` 추가
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 35, 마지막 set-map(prev spread-destructuring, position 35)
  - `tests/build/build-output.test.ts`: spread-destructuring describe 뒤에 `프리렌더 (set-map)` describe(표 aria-label 앞부분 `값 쌍마다 ===, Object.is, Set·Map, 일반 객체 키가`, 텍스트에 `SameValueZero`, `<details` 8개 이상)
  - `docs/content-guide.md:167`: e2e 목록에 `set-map`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 11번 상태·진행 기록(25~37장 로드맵 마지막)
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes.ts`, 기존 개념 폴더 34개

## 5. 위험 요소

- 엔진 구현을 사실처럼 씀("Map은 해시 테이블이라 빠르다", "delete하면 그 자리가 비어 있다") → 명세 원문(관찰 가능한 동작만 정함, `empty`는 표기 장치)대로 쓰고 단순화에 밝힌다. 단계 3에서 '해시'·'메모리'·'빠르' grep 결과가 명세 인용·단순화 문맥뿐인지 확인.
- 판 차이를 한쪽만 단정 → ②의 문장과 ES2024판 링크, 단순화. 단계 3 완료 조건에서 대조.
- "Set·Map은 ===로 비교한다" 또는 "Object.is로 비교한다" → 비교표 `NaN`·`0` 행과 오해 Callout.
- WeakMap을 "메모리에서 자동으로 지워진다"고 단정 → "구현이 제거할 수 있고 시점은 정하지 않으며 관찰할 수 없다"로만.
- 예제 6 무한 루프 → 조건 `n < 3`으로 끝남(실행 확인), 본문에 "추가가 계속되면 끝나지 않는다" 한 줄.
- '객체' 검색 고정값 누락 → 4절 navigation.spec 목록, 단계 4 완료 조건.
- dev 서버의 `./meta` 실패 캐시 → 생성 순서 meta → content → route, 이후 dev 서버 재시작.
- 표가 375px에서 페이지 가로 스크롤을 만듦 → region `overflow-x-auto`, responsive e2e.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "set-map|Set과 Map|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스(a11y 라이트·다크, 가로 스크롤 데스크톱·모바일, 홈 학습 순서 보기)가 모두 잡히는지 확인.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`(처음엔 `[]`, 실행 결과로 채움, 2절 표와 같아야 함), concept.test 통과·음성 확인(표 칸 하나의 `same`을 뒤집으면 실패), 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 참고 링크 전부 200.
- 브라우저(dev 서버 375px·다크)
  1. `/concepts/set-map` → 페이지 가로 스크롤 없음, 비교표 region이 Tab으로 포커스되고 안에서만 가로 스크롤.
  2. 표의 `NaN, NaN` 행이 다름/같음/같음/같음, `{}, {}` 행이 다름/다름/다름/같음.
  3. 퀴즈 하나를 골라 '정답 확인' → 정답·해설. 프리렌더 HTML에 `<details>` 정답.
  4. 하단 학습 순서 '35 / 35', 이전 spread-destructuring. spread-destructuring 하단 '34 / 35', 다음 set-map.
  5. 홈 '객체' 검색 14개, 학습 순서 보기 마지막 카드 '35번째' 새 제목.

## 7. 미확정 사항

- 없음. 제목·표 열 이름·퀴즈 문구·summary 문장은 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(8개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경: 부록 초안 8개를 그대로 옮긴다. `meta.ts`는 3절 meta대로(examples는 처음엔 `expectedOutput: []`, 실행 결과로 채움). `route.tsx`는 spread-destructuring 템플릿 복사.
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route, 그다음 메인이 dev 서버 재시작. 예제 파일은 부록 그대로, 주석 없이, 파일 끝 줄바꿈 하나.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표, 참고 링크 전부 200, dev 서버에서 `/concepts/set-map` 200.

### 2. 비교표 데이터와 테스트

- 대상: `sameness-table.ts`, `concept.test.ts`
- 변경: 3절의 데이터와 테스트 ①·②.
- 주의사항: probe는 칸마다 `setup`부터 새 컨텍스트에서 실행. 다른 realm 오류라 TypeError는 `name`으로 비교.
- 완료 조건: `npx vitest run app/concepts/set-map` 통과(표 8행 × 4칸 = 32칸 + Map=Set 8행 + 본문 주장). 음성 확인(칸 하나의 `same` 반전 시 실패) 후 원복. lint·typecheck 통과.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 도입 문단: 질문 "`new Set([NaN, NaN, 0, -0])`의 `size`는 왜 2일까" + 페이지 구성 + 전제 개념 링크(1절 링크 목록) + 별도 개념. 동작 원리 h3: 1절 주제 ①~⑨ 순서(⑨ "같음 비교표로 정리"에 표). 예제 8개마다 PredictQuiz. 결과와 이유는 예제별 h3(줄 번호를 예제 파일과 맞춤). 오해 Callout 4개: "Set과 Map은 ===로 값을 비교한다", "모양이 같은 객체는 같은 키다", "Map에 m.key = value로 넣어도 된다", "WeakMap은 키가 지워지는 순간을 확인할 수 있다". 예제 절 첫 문단은 spread-destructuring과 같은 형식(console 호스트 API, sloppy mode, 여러 줄 출력 ' / ').
- 주의사항: '찾히다' 금지, 판 차이 문장은 2절 원문대로, 뒷장 내용은 "별도 개념"으로만, 공백 든 인라인 코드는 Prettier 깨짐 확인.
- 완료 조건: `npm test` 통과(개수 고정 테스트는 단계 4 대상이라 이 시점 실패 허용 — 실패 목록이 그것뿐인지 확인), 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0, '해시|메모리|빠르' grep 결과가 5절 기준을 지킴.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- ES2025 Set 메서드(`union` 등)와 `Map.groupBy` — 책 범위 밖이라 이후 추가 게시글 후보.
- 기존 페이지의 "Map·Set은 별도 개념" 문구 역방향 링크(사용자 결정대로 나중에 일괄).

## 변경 이력

- 2026-11-03 (외부 콘텐츠 검토 1회, 8건 — 판별 원문(ES2020·2021·2022·2023·2024·2025·2026판, 현재 초안)과 실행으로 확인 후 반영): ① WeakMap 키 조건의 "원시 값은 TypeError"가 심벌 허용과 모순 → "심벌이 아닌 원시 값이나 `Symbol.for`로 등록한 심벌"로, 심벌 키는 ES2023판부터(ES2022판까지 객체만)라고 명시(리뷰 Low 1건도 해소) ② "키를 바꾸지 않고"가 `-0` 정규화와 충돌 → "키를 문자열로 바꾸지 않고"로 통일 ③ 판 귀속: Set 메서드 ES2025판, `Map.groupBy` ES2024판, `getOrInsert` ES2026판(검토의 "제안 단계"는 원문과 달라 반영하지 않음 — ES2026판에 anchor 있음) ④ 검토 제안 "has·get·delete는 어느 판에서든 SameValueZero"는 원문과 다름(ES2025판부터 이들도 CanonicalizeKeyedCollectionKey 후 SameValue) → 그 사실대로 "has·get·delete도 같은 방식"으로 보강 ⑤ ToPropertyKey: "원시 값이 아닌 객체는 문자열로" → "객체는 ToPrimitive를 거쳐 보통 문자열" ⑥ 명세 인용: Set 정의는 따옴표 대신 원문 병기, "the semantics of"는 현재 초안 원문에 있어 유지(검토 기억과 다름), NOTE 인용에 생략 표시 ⑦ WeakMap 제거: 현재 초안 9.9.3은 "may perform"이라 "제거할 수 있다" 유지, ES2020판은 "must detect and remove"였고 ES2021판부터 바뀌었다는 판 경계를 추가(검토의 "must"는 옛 판 문구) ⑧ `Set.prototype.size`도 접근자, 생성자 인수 생략·undefined·null이면 빈 컬렉션, 지웠다가 다시 넣은 값은 다시 방문(`[1,2,1]`), Set은 값·Map은 엔트리로 용어 정리. 새 주장은 근거 테스트 추가. 산문 수정이라 메인이 직접 반영 — 영향 단계 2·3
- 2026-11-03 (외부 콘텐츠 검토 2회, 3건): ① 지웠다 다시 넣는 재방문 문장에 "처음 방문할 때 한 번만" 조건과 "매번 다시 넣으면 끝나지 않는다"를 추가(실행: 조건 없으면 `[1,2,1,1,1,…]` 무한 반복) ② ES2020판 서술의 용어를 그 판 원문대로 "닿을 수 없게 된(inaccessible)"으로(liveness는 ES2021판부터) — 본문·simplifications ③ Set 정의 인용 "A Set may contain each distinct value at most once"는 ES2026판·현재 초안 원문과 일치해 유지(검토가 기억한 "A distinct value may only occur once as an element of a Set's collection"은 ES2020~ES2025판 문장) — 영향 단계 3

## 부록: 예제 초안

`/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/sm/ex/`의 파일과 같다(2026-11-03 실행 확인).

#### `basics.js`

```js
var tags = new Set(['js', 'css', 'js']);
tags.add('html').add('css');
console.log(tags.size, tags.has('css'), tags.delete('css'), tags.size);
var ages = new Map([['kim', 30]]);
ages.set('lee', 25).set('kim', 31);
console.log(ages.size, ages.get('kim'), ages.get('park'), ages.has('lee'));
console.log(JSON.stringify([...tags]), JSON.stringify([...ages]));
```

#### `same-value-zero.js`

```js
var nums = new Set([NaN, NaN, 0, -0]);
console.log(nums.size, nums.has(NaN), NaN === NaN);
var stored = [...nums];
console.log(Object.is(stored[1], 0), Object.is(stored[1], -0));
var m = new Map([[NaN, 'not a number']]);
console.log(m.get(NaN), new Set([1, '1', true, 'true']).size);
```

#### `object-keys.js`

```js
var a = { id: 1 };
var b = { id: 1 };
var seen = new Set([a, b, a]);
console.log(seen.size, seen.has(a), seen.has({ id: 1 }));
var meta = new Map();
meta.set(a, 'first');
a.id = 99;
console.log(meta.get(a), meta.get(b), meta.has({ id: 99 }));
```

#### `plain-object-keys.js`

```js
var cache = {};
var a = { id: 1 };
var b = { id: 2 };
cache[a] = 'A';
cache[b] = 'B';
console.log(JSON.stringify(Object.keys(cache)), cache[a]);
var store = {};
store[1] = 'number';
store['1'] = 'string';
console.log(Object.keys(store).length, store[1]);
var map = new Map([[a, 'A'], [b, 'B'], [1, 'number'], ['1', 'string']]);
console.log(map.size, map.get(a), map.get(1));
```

#### `insertion-order.js`

```js
var obj = { b: 1, a: 2, 10: 3, 2: 4 };
var map = new Map([['b', 1], ['a', 2], [10, 3], [2, 4]]);
console.log(JSON.stringify(Object.keys(obj)));
console.log(JSON.stringify([...map.keys()]));
map.set('b', 100);
map.delete('a');
map.set('a', 200);
console.log(JSON.stringify([...map]));
```

#### `mutate-while-iterating.js`

```js
var queue = new Set([1]);
var visited = [];
for (var n of queue) {
  visited.push(n);
  if (n < 3) queue.add(n + 1);
}
console.log(JSON.stringify(visited), queue.size);
var letters = new Set(['a', 'b', 'c']);
var seen = [];
for (var v of letters) {
  seen.push(v);
  if (v === 'a') letters.delete('b');
}
console.log(JSON.stringify(seen), letters.size);
```

#### `not-a-plain-object.js`

```js
var m = new Map();
m.set('a', 1);
m.b = 2;
console.log(m.size, m.has('b'), m.get('b'), m.b);
console.log(JSON.stringify(m), JSON.stringify(Object.keys(m)));
var fromObj = new Map(Object.entries({ x: 1, y: 2 }));
var toObj = Object.fromEntries(fromObj);
console.log(fromObj.get('x'), JSON.stringify(toObj));
console.log(JSON.stringify([...m]));
```

#### `weak.js`

```js
var wm = new WeakMap();
var key = {};
wm.set(key, 'data');
console.log(wm.get(key), wm.has(key), wm.has({}));
console.log(typeof wm.size, typeof wm.keys, typeof wm[Symbol.iterator]);
var ws = new WeakSet([key]);
console.log(ws.has(key), typeof ws.forEach);
```


## 구현 진행

- baseline (2026-11-03, `0ccab19`): lint·format:check·typecheck 통과 / `npm test` 100 files·3157 tests 통과. test:build·e2e는 단계 4 이후 실행(직전 커밋에서 통과).
- 단계 1~3(개념 폴더)과 단계 4(고정 테스트·문서)는 파일이 겹치지 않아 Sonnet 서브에이전트 2개에 병렬 위임.
- [x] 1. 예제·meta·route — 예제 8개가 scratchpad 초안과 바이트 단위로 같음(diff), `expectedOutput` = 2절 표, 참고 링크 200·anchor 18개 존재(서브에이전트 확인, anchor는 메인도 계획 단계에서 확인), dev 서버 재시작 후 `/concepts/set-map` 200
- [x] 2. 비교표 데이터와 테스트 — `concept.test.ts` 53 tests(32칸 + Map=Set 8행 + 본문 주장), 음성 확인(NaN 행 일반 객체 키 칸 반전 시 1건 실패) 후 원복
- [x] 3. 본문 — 메인이 결과·원인 문장과 줄 번호를 2절 명세 발췌·예제와 대조(판 차이·`empty` 표기·WeakMap 관찰 금지 인용 원문 일치). 서브에이전트 보정 수용: 예제 2의 `stored[1]`은 `0`이 먼저 들어가 `+0`이므로 `-0` 정규화의 증거가 아님 → 결과와 이유에 밝히고 `new Set([-0])`·`new Map([[-0, 1]])` 근거 테스트로 확인. 추가 테스트 1개(`Object.fromEntries` 키 문자열화). '해시'는 simplifications의 명세 인용 문맥 1곳뿐
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 확인(개수 35, 마지막 개념, pager 분모, '객체' 검색 14·순위 '35', 새 케이스 추가만). 로드맵 문서 11번 상태·진행 기록은 메인이 반영
- 메인 수정(브라우저 확인 중 발견): 375px에서 열 머리글 `a === b`가 세 줄로 쪼개짐 → `sameness-table.ts` 열에 `code` 표시를 두고 본문 표에서 `<code>`로 감싸 nowrap(`a === b`, `Object.is(a, b)` 두 열)
- 전체 검증(2026-11-03): lint·format:check·typecheck 통과, `npm test` 101 files·3231 tests, `test:build` 286 tests, e2e navigation 16 + 새 개념 8(`--list` 확인) 통과. dev 서버 375px 다크: 표 region 포커스·페이지 overflow 0·`NaN, NaN` 행 다름/같음/같음/같음·`{}, {}` 행 다름/다름/다름/같음, 예제 2 퀴즈 정답 표시, pager 35/35(이전 spread-destructuring)·34/35(다음 set-map), 홈 '객체' 검색 14개·마지막 35번째
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 0 · Low 1(보고만) — WeakMap·WeakSet에 심벌 키를 쓸 수 있게 된 것은 ES2023판부터(ES2022판은 "If Type(key) is not Object, throw", CanBeHeldWeakly 없음 — 판별 원문 확인)인데 본문·simplifications에 판 표시가 없다. 책(ES2020 무렵)은 객체만 키라고 설명하므로 한 줄 판 표시 후보
- 외부 검토 8건 반영(2026-11-03, 변경 이력 참고): 판별 원문 확인 — `Map.groupBy` anchor ES2024판에 있고 2023판에 없음, `getOrInsert` ES2026판·초안에 있음, `union` ES2025판에 있고 2024판에 없음, ES2025판·초안의 `get`·`has`·`delete`는 Canonicalize 후 SameValue(2024판은 SameValueZero), Set Objects 머리말에 "the semantics of" 있음, Set·Map 이터레이터 NOTE 모두 "entries", "must detect and remove"는 ES2020판에만 있고 2021판부터 없음, CanBeHeldWeakly는 2023판부터(2022판은 "If Type(key) is not Object, throw"). 실행 확인 — 지웠다 다시 넣은 값 재방문 `[1,2,1]`, 빈 생성자 `0 0 0 0`, `Set.prototype.size` 접근자. 근거 테스트 3개 추가, references에 9.9.3 Execution·ES2020 WeakMap Objects·ES2022 WeakMap.prototype.set 추가(200). 리뷰 Low 1건(심벌 키 판 표시)도 함께 해소. 재검증: lint·format:check·typecheck 통과, `npm test` 3234, `test:build` 286, e2e navigation 16 + 새 개념 8 통과
- 마무리(2026-11-03): 사용자 최종 승인(콘텐츠 검토 승인 포함) → `reviewedAt` 2026-11-03 기록, 로드맵 11번 완료·25~37장 로드맵 상태 완료 처리

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현. 달라진 점: ① 예제 2는 `0`이 먼저 들어가 `stored[1]`만으로는 `-0` 정규화의 증거가 아니어서 결과와 이유에 한계를 밝히고 `new Set([-0])`·`new Map([[-0, 1]])` 근거 테스트로 보완 ② 표 열 머리글 중 코드 두 개(`a === b`, `Object.is(a, b)`)를 `<code>`로 감싸 375px에서 줄바꿈 방지(`sameness-table.ts`의 `code` 표시) ③ 외부 검토 2회(8건·3건) 반영 — 판 경계(Set 메서드 ES2025·`Map.groupBy` ES2024·`getOrInsert` ES2026, `get`·`has`·`delete`도 ES2025판부터 정규화 후 SameValue, WeakMap 심벌 키 ES2023판, 엔트리 제거 ES2020판 must·ES2021판부터 may), 근거 테스트 3개·참고 링크 3개 추가 ④ 로드맵 문서 갱신은 단계 4 위임에서 빠져 메인이 반영

### 코드 리뷰

- critical-code-review(메인 직접): Critical/High/Medium 0, Low 1(WeakMap 심벌 키 판 표시)은 외부 검토 반영 때 함께 해소. 외부 검토 제안 중 원문과 다른 4건(`getOrInsert` 제안 단계, `has`·`get`·`delete`는 언제나 SameValueZero, 엔트리 제거 "must", Set 정의 문장·"the semantics of")은 판별 원문대로 처리

### 후속 작업

- [ ] ES2025 Set 메서드(`union` 등)·`Map.groupBy` — 책 범위 밖, 추가 게시글 후보
- [ ] 기존 페이지 "Map·Set은 별도 개념" 문구의 역방향 링크(사용자 결정대로 나중에 일괄)
- [ ] 25~37장 로드맵 완료 — 다음 로드맵(42~48장 비동기·에러 처리·모듈, 38~41장 브라우저)은 사용자와 정함

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 외부 검토 제안 중 원문과 다른 4건은 제안 문장 대신 판별 원문대로 고쳤다 — `getOrInsert`는 "제안 단계"가 아니라 ES2026판에 있고, ES2025판부터 `has`·`get`·`delete`도 SameValueZero가 아니라 정규화 후 SameValue이며, "must detect and remove"는 ES2020판 문구이고, Set 정의 문장은 ES2026판에서 바뀌었다. 검토자의 기억이 옛 판 기준인 경우가 많아 판마다 원문을 받아 대조했다.
- [Claude 판단] 예제 2의 `stored[1]`이 `+0`인 것은 `0`이 먼저 들어갔기 때문이라 `-0` 정규화의 증거가 아니다(서브에이전트가 발견, 메인 수용). 예제를 바꾸는 대신 본문에 한계를 밝히고 `new Set([-0])` 근거 테스트로 보완했다.
- [Claude 판단] 375px 확인 중 열 머리글 `a === b`가 세 줄로 쪼개져, 코드인 열 이름에만 `code` 표시를 두고 `<code>`(표의 nowrap 규칙)로 감쌌다.
- [무검토 승인] 같음 비교표를 8행 × 4열(`===`·`Object.is`·Set·Map·일반 객체 키)로 설계하고, Map 열은 Set과 모든 행에서 같아 한 열로 합치되 테스트로 같음을 보장했다.
- [무검토 승인] summary에 '일반 객체'가 들어가 홈 '객체' 검색이 13→14개가 되는 것을 받아들였다.
- 추가 주제 4개 모두, 같음 비교표 + 퀴즈, 제목 "NaN은 왜 한 번만 들어갈까"는 사용자 결정. 외부 검토 반영은 사용자 요청.

#### 배경지식

- Set·Map 머리말은 SameValueZero의 의미로 값을 구분한다고 정한다. ES2024판까지 `add`·`set`·`has`·`get`·`delete`는 SameValueZero로 비교했고, ES2025판부터 CanonicalizeKeyedCollectionKey(`-0`→`+0`) 뒤 SameValue로 비교한다. 관찰 결과는 같다.
- 일반 객체의 `obj[키]`는 ToPropertyKey로 키를 문자열(또는 심벌)로 바꾸므로 서로 다른 객체 키가 `'[object Object]'` 하나로 합쳐진다. Map은 키를 문자열로 바꾸지 않는다.
- Set·Map 이터레이터는 값을 내놓은 뒤 목록 길이를 다시 읽고 `empty`를 건너뛴다 — 순회 중 추가한 값은 방문, 방문 전에 지운 값은 건너뜀, 지웠다 다시 넣은 값은 끝에 붙어 다시 방문.
- WeakMap 키는 CanBeHeldWeakly(객체, 등록하지 않은 심벌 — ES2023판부터)이고, 명세는 키를 내놓지 않고 키를 관찰하는 수단을 금지하며 엔트리 제거 시점을 정하지 않는다.

#### 확인 질문

1. `new Set([NaN, NaN, 0, -0])`의 `size`가 2인 이유를 `===`, `Object.is`와 비교해 설명하면?
   <details><summary>답</summary>Set은 SameValueZero로 값을 구분한다. `===`와 달리 `NaN`을 `NaN`과 같다고 보고, `Object.is`(SameValue)와 달리 `+0`과 `-0`을 같다고 보므로 `NaN` 하나와 `0` 하나만 남는다(본문 "키는 SameValueZero로 구분한다", 비교표 NaN·0 행).</details>
2. 예제 2의 `Object.is(stored[1], 0)`이 `true`인 것으로 "`-0`은 `+0`으로 저장된다"를 증명할 수 없는 이유는? 그럼 무엇으로 확인했나?
   <details><summary>답</summary>그 Set에는 `0`이 `-0`보다 먼저 들어가 이미 `+0`이 저장되어 있고 `-0`은 같은 값이라 추가되지 않았기 때문이다. `new Set([-0])`·`new Map([[-0, 1]])`의 키가 `+0`인지 근거 테스트로 확인했다(`concept.test.ts`, 결과와 이유 예제 2).</details>
3. 검토자가 "has·get·delete는 어느 판에서든 SameValueZero"라고 제안했을 때 그대로 넣지 않은 이유는? 그런데도 절 제목 "키는 SameValueZero로 구분한다"가 유효한 근거는?
   <details><summary>답</summary>ES2025판부터 이 메서드들도 CanonicalizeKeyedCollectionKey 후 SameValue로 비교한다(판별 원문 확인). 하지만 Set·Map 머리말이 지금도 "SameValueZero의 의미로" 구분한다고 적고, 정규화 + SameValue의 관찰 결과가 SameValueZero와 같기 때문이다(변경 이력 ④, 본문 판 차이 문단).</details>
4. `const o = {}; o[a] = 1; o[b] = 2`에서 서로 다른 객체 `a`, `b`가 같은 키가 되는데, 비교표의 심벌 행은 왜 '다름'인가?
   <details><summary>답</summary>ToPropertyKey가 객체는 보통 문자열 `'[object Object]'`로 바꾸지만 심벌은 문자열로 바꾸지 않고 그대로 키로 쓰기 때문이다(본문 "일반 객체의 키는 문자열로 바뀐다", `sameness-table.ts` 심벌 행).</details>
5. 순회 중 `1`을 지웠다 다시 넣을 때 "처음 방문할 때 한 번만"이라는 조건이 왜 필요한가?
   <details><summary>답</summary>다시 넣은 값은 목록 끝에 새로 붙어 다시 방문되므로, 방문할 때마다 지웠다 넣으면 매번 끝에 다시 붙어 순회가 끝나지 않는다(실행 `[1,2,1,1,1,…]`, 변경 이력 2회차 ①).</details>
