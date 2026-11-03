# 개념 '이터러블과 for...of' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `367ae7c`

## 0. 요약

- 목적: 25~37장 로드맵 9번 `/concepts/iterable-for-of`를 추가한다. 34장 이터러블에서 일반 객체에 `for...of`를 쓰면 TypeError인 이유(`Symbol.iterator` 메서드가 없음), 이터레이션 프로토콜(`Symbol.iterator`가 이터레이터를, `next`가 `{ value, done }`을 돌려줌), 직접 만든 이터러블과 `break` 때의 `return`, 이터레이터는 한 번 쓰면 끝, 유사 배열과 이터러블의 차이, 순회 중 배열 변경과 구멍, `for...in`과의 차이, 문자열의 코드 포인트 순회, 스프레드·배열 디스트럭처링도 같은 프로토콜이라는 것을 예제 9개와 "이터레이터 시뮬레이터"로 명세 근거로 보인다.
- 범위: 새 개념 폴더 1개(category `execution`, order 310으로 학습 순서 33번째·마지막, 시나리오 2개의 시뮬레이터). 마지막 개념과 '객체' 검색 결과가 바뀌므로 고정 테스트·e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드(`app/simulator/` 등)와 기존 개념 32개는 바꾸지 않는다.
- 위험: ① 배열 이터레이터의 상태를 엔진 구현처럼 쓰거나 `for...of`가 "인덱스로 돈다"고 씀 ② 시나리오 단계가 실제 호출 순서와 어긋남 → 명세의 내부 슬롯 이름(`[[ArrayLikeNextIndex]]`)과 알고리즘(GetIterator·IteratorClose)으로 쓰고, 배열 시나리오는 `next`를 감싼 호출 기록과, 직접 만든 이터러블 시나리오는 예제 출력(`next`·`return` 로그)과 대조한다.
- 복잡도: 중간~높음 · Consensus: 생략. 시뮬레이터를 새로 만들지만 regexp-lastindex와 같은 "시나리오 + View + 실행 대조 테스트" 패턴이고 공통 코드를 바꾸지 않는다. 호출 기록 방식(내장 `next`·`Symbol.iterator` 감싸기)과 예제 출력·핵심 주장은 vm으로 미리 확인했다(2절).
- 미확정: 없음(추가 주제·스프레드 범위·시각화·slug는 2026-11-02 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 9번 "이터러블과 for...of"(34장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-02)
  - 기본 범위: 이터러블(`Symbol.iterator` 메서드)과 이터레이터(`next`가 `{ value, done }`) 프로토콜, 일반 객체의 `for...of` TypeError, 직접 만든 이터러블, `for...in`과의 차이, 문자열의 코드 포인트 순회([문자열 길이와 UTF-16](/concepts/string-utf16) 연결).
  - 추가 주제 4개 모두: **break와 return**, **이터레이터는 한 번 쓴다**, **유사 배열 vs 이터러블**, **순회 중 배열 변경·구멍**.
  - 스프레드·배열 디스트럭처링(35·36장, 로드맵 10번): **프로토콜만 예제 1개**(같은 `next`를 부르고 디스트럭처링은 남은 이터레이터를 닫는다는 것만, 문법 자체는 10번 페이지).
  - 시각화: **next 단계 시뮬레이터** — 공통 셸로 `for...of`가 `Symbol.iterator`를 부르고 `next()`가 `{ value, done }`을 돌려주는 과정을 한 단계씩. 시나리오: 배열 순회, 직접 만든 이터러블(break·return).
  - slug `iterable-for-of`, 제목 '이터러블과 for...of: 일반 객체는 왜 for...of로 돌 수 없을까'.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① for...of가 하는 일(예제 1 `array-loop.js` + 시뮬레이터 시나리오 1): ForIn/OfHeadEvaluation이 GetIterator로 `obj[Symbol.iterator]`를 꺼내 부르고(없으면 TypeError, 결과가 객체가 아니면 TypeError), ForIn/OfBodyEvaluation이 매 반복 `next`를 불러 결과가 객체가 아니면 TypeError, IteratorComplete(`done`을 ToBoolean)가 true면 끝, 아니면 IteratorValue(`value`)를 루프 변수에 넣고 본문을 실행한다. 일반 객체(`{}`)와 `null`은 `Symbol.iterator`가 없어 TypeError(근거 테스트). `for...in`의 `null`은 아무 일도 하지 않는다는 대비는 근거 테스트로만.
  - ② 이터레이터를 직접 다루기(예제 2 `manual-next.js`): `arr[Symbol.iterator]()`가 돌려준 배열 이터레이터에 `next()`를 부르면 `{ value, done }`(IteratorResult) 객체. 끝나면 `value`가 `undefined`, `done`이 `true`이고 `value` 프로퍼티는 있다(`'value' in r3`가 true, `JSON.stringify`는 `undefined` 값 프로퍼티를 빼서 `{"done":true}`로 보인다). 배열 이터레이터의 상태는 내부 슬롯 `[[IteratedArrayLike]]`·`[[ArrayLikeNextIndex]]`.
  - ③ 무엇이 이터러블인가(예제 3 `iterable-check.js`): 배열·문자열·`arguments`는 `Symbol.iterator` 메서드가 있고(`Array.prototype[Symbol.iterator] === Array.prototype.values`), 일반 객체와 유사 배열 객체(`{ 0: 'a', length: 2 }`)는 없다. 유사 배열은 `length`와 인덱스 키가 있을 뿐 이터러블이 아니라 `for...of`는 TypeError지만(근거 테스트), `Array.from`은 `Symbol.iterator`가 없으면 유사 배열로 보고 `length`로 읽는다. Map·Set(37장)은 별도 개념.
  - ④ 직접 만든 이터러블과 break(예제 4 `custom-iterable.js` + 시뮬레이터 시나리오 2): `[Symbol.iterator]()` 메서드가 `next`와 `return`을 가진 객체를 돌려주면 이터러블이다(메서드 축약 + 계산된 키 — [화살표 함수와 메서드 축약](/concepts/arrow-functions), [심벌](/concepts/symbol)). `next`는 본문보다 먼저, 반복마다 한 번씩 불린다. `break`로 빠져나가면 ForIn/OfBodyEvaluation이 IteratorClose를 불러 이터레이터의 `return` 메서드를 호출한다(출력 `next, 3, next, 2, return`). 끝까지 돌아 `done: true`로 끝나면 `return`은 불리지 않는다(근거 테스트). `return`이 객체가 아닌 값을 돌려주면 TypeError(근거 테스트, 본문 한 줄). `done`이 없으면 false로 본다(IteratorResult 인터페이스, 근거 테스트).
  - ⑤ 이터레이터는 한 번 쓰면 끝(예제 5 `one-shot.js`): 배열 이터레이터도 `Symbol.iterator` 메서드가 있어 자기 자신을 돌려준다(`%Iterator.prototype%[Symbol.iterator]`가 this를 돌려줌 — 프로토타입 체인에서 상속, [프로토타입 체인](/concepts/prototype-chain)). 그래서 이터레이터를 `for...of`에 넣을 수 있지만, 끝까지 돈 이터레이터는 `[[IteratedArrayLike]]`가 `undefined`라 다시 돌면 0번 돈다. 배열 자체는 `for...of`마다 새 이터레이터를 만들어 다시 돌 수 있다.
  - ⑥ for...in과 for...of(예제 6 `for-in-vs-of.js`): `for...in`은 EnumerateObjectProperties로 열거 가능한 문자열 키(배열 인덱스 `'0'`·`'1'`과 `extra`)를, `for...of`는 배열 이터레이터가 인덱스 0부터 `length` 전까지의 값만 돌려준다. `for...in` 순서는 [프로토타입 체인](/concepts/prototype-chain)대로 명세가 일부만 정한다.
  - ⑦ 순회 중 배열 변경과 구멍(예제 7 `mutate-holes.js`): 배열 이터레이터의 `next`는 부를 때마다 LengthOfArrayLike로 `length`를 다시 읽으므로 반복 중에 `push`한 요소도 돈다(`[1,2,3,4]`). 구멍은 `Get`으로 읽어 `undefined`가 된다(`forEach`가 건너뛰는 것과 다름 — [배열 메서드의 함정](/concepts/array-method-pitfalls)). 끝난 뒤 `push`해도 끝난 이터레이터는 다시 돌지 않는다(근거 테스트).
  - ⑧ 문자열은 코드 포인트 단위로 돈다(예제 8 `string-code-points.js`): 문자열 이터레이터는 CodePointAt으로 코드 포인트마다 한 문자열을 돌려줘 `'a😀b'`는 `length` 4지만 3번 돈다. [문자열 길이와 UTF-16](/concepts/string-utf16)이 미뤄 둔 내용.
  - ⑨ 스프레드와 배열 디스트럭처링도 같은 프로토콜(예제 9 `spread-destructure.js`): `[...pair]`는 `done: true`까지 `next`를 불러(`next`×3) `return`을 부르지 않고, `var [first] = pair`는 값 하나만 꺼낸 뒤 이터레이터가 끝나지 않았으므로 IteratorClose로 `return`을 부른다. 문법 자체는 별도 개념(35·36장).
- 이미 다룬 내용은 요약하고 링크한다: `Symbol.iterator`가 well-known 심벌이라는 것([심벌](/concepts/symbol)), 유사 배열과 `length`([배열은 객체다](/concepts/array-index-length)), 구멍과 `forEach`([배열 메서드의 함정](/concepts/array-method-pitfalls)), 코드 포인트([문자열 길이와 UTF-16](/concepts/string-utf16)), `for...in`과 프로토타입([프로토타입 체인](/concepts/prototype-chain)), 반복마다 새 바인딩은 `let`일 때([for 문의 let](/concepts/for-let) — 이 페이지 예제는 `var`).

### 유지해야 하는 기존 동작

- 기존 개념 32개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만). 기존 페이지의 "별도 개념" 문구(string-utf16·symbol 등)를 링크로 바꾸는 역방향 연결은 사용자 결정대로 나중에 일괄 처리한다.
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 시뮬레이터는 JS 없이 첫 시나리오의 1단계("실행 전")를 그린다.

### 제외 범위

- 제너레이터(46장)와 `yield`, 비동기 이터레이션(`for await...of`, `Symbol.asyncIterator`)
- 이터레이터 헬퍼(ES2025 `Iterator.prototype.map` 등)와 전역 `Iterator`
- Map·Set·TypedArray의 이터레이터(37장 이후), `entries`·`keys` 등 다른 배열 이터레이터 종류
- 스프레드·디스트럭처링 문법 전반(기본값, rest, 객체 디스트럭처링) — 로드맵 10번
- `throw` 메서드, 이터레이터를 쓰는 다른 내장 함수(`Promise.all` 등), `using` 선언

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안(ES2027), scratchpad `sym/spec.html`, 2026-11-02 확인, anchor 31개 존재 확인)

- The Iterable Interface(`#sec-iterable-interface`): `%Symbol.iterator%` — "a function that returns an iterator object". The Iterator Interface(같은 절): 필수 `next` — "a function that returns an IteratorResult object". 선택 `return`·`throw`. The IteratorResult Interface(`#sec-iteratorresult-interface`): `done`이 (자기·상속) 없으면 false로 본다. `done`이 true면 `value`는 반환 값이고 없으면 `undefined`이며 그때 `value` 프로퍼티는 없어도 된다.
- ForIn/OfHeadEvaluation(`#sec-runtime-semantics-forin-div-ofheadevaluation-tdznames-expr-iterationkind`): `enumerate`(for...in)는 값이 `undefined`·`null`이면 break completion(루프를 건너뜀), 아니면 ToObject + EnumerateObjectProperties. `iterate`(for...of)는 `GetIterator(exprValue, sync)`.
- GetIterator(`#sec-getiterator`): `GetMethod(obj, %Symbol.iterator%)`가 undefined면 TypeError → GetIteratorFromMethod(`#sec-getiteratorfrommethod`): `Call(method, obj)` 결과가 객체가 아니면 TypeError. Iterator Record에 `[[NextMethod]]`를 한 번 꺼내 둔다.
- ForIn/OfBodyEvaluation(`#sec-runtime-semantics-forin-div-ofbodyevaluation-lhs-stmt-iterator-lhskind-labelset`): 반복마다 `Call([[NextMethod]], [[Iterator]])` → 객체가 아니면 TypeError → IteratorComplete(`#sec-iteratorcomplete`: `ToBoolean(Get(result, "done"))`)가 true면 끝 → IteratorValue → 바인딩 → 본문. 본문이 LoopContinues가 false(break 등)면 `IteratorClose(iteratorRecord, status)`. 바인딩이 실패해도 IteratorClose.
- IteratorClose(`#sec-iteratorclose`): `GetMethod(iterator, "return")`이 undefined면 그대로, 있으면 호출. 원래 completion이 throw면 그것을, 아니면 return 결과가 객체가 아니면 TypeError.
- CreateArrayIterator(`#sec-createarrayiterator`): 내부 슬롯 `[[IteratedArrayLike]]`, `[[ArrayLikeNextIndex]]`(0), `[[ArrayLikeIterationKind]]`. `%ArrayIteratorPrototype%.next`(`#sec-%arrayiteratorprototype%.next`): `[[IteratedArrayLike]]`가 undefined면 `{ undefined, true }`. 매 호출 `LengthOfArrayLike(array)`; index ≥ length면 `[[IteratedArrayLike]]`를 undefined로 하고 `{ undefined, true }`. 아니면 index+1을 저장하고 `Get(array, ToString(index))` 값.
- CreateIteratorResultObject(`#sec-createiterresultobject`): `value`·`done` 데이터 프로퍼티를 가진 객체.
- `Array.prototype[%Symbol.iterator%]`(`#sec-array.prototype-%symbol.iterator%`)의 초기값은 `%Array.prototype.values%`(`#sec-array.prototype.values`).
- `String.prototype[%Symbol.iterator%]`(`#sec-string.prototype-%symbol.iterator%`): 코드 포인트마다(CodePointAt) 부분 문자열을 돌려준다.
- `Iterator.prototype[%Symbol.iterator%]`(`#sec-%iteratorprototype%-%symbol.iterator%`): "Return the this value". 배열 이터레이터 → `%ArrayIteratorPrototype%` → `%Iterator.prototype%`.
- `Array.from`(`#sec-array.from`): `GetMethod(items, %Symbol.iterator%)`가 있으면 이터레이터로, 없으면 "items is not iterable so assume it is an array-like object" → LengthOfArrayLike.
- 인수 객체: CreateUnmappedArgumentsObject(`#sec-createunmappedargumentsobject`)·매핑 버전이 `%Symbol.iterator%`에 `%Array.prototype.values%`를 둔다.
- ArrayAccumulation(`#sec-runtime-semantics-arrayaccumulation`, 스프레드): GetIterator 후 IteratorStepValue를 done까지. BindingInitialization(`#sec-runtime-semantics-bindinginitialization`)의 ArrayBindingPattern: GetIterator → IteratorBindingInitialization(`#sec-runtime-semantics-iteratorbindinginitialization`) → `iteratorRecord.[[Done]]`이 false면 IteratorClose(배열 디스트럭처링이 return을 부르는 근거, 원문 확인).
- EnumerateObjectProperties(`#sec-enumerate-object-properties`): 열거 가능한 문자열 키, 순서는 일부만 정함.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/672cdeee-df3d-452d-8527-bf9e1dd907fa/scratchpad/it/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `array-loop.js` | `a` / `b` / `end b` |
| 2 `manual-next.js` | `a false b false` / `undefined true true {"done":true}` / `function value,done` |
| 3 `iterable-check.js` | `function function undefined` / `undefined function` / `["a","b"] true` |
| 4 `custom-iterable.js` | `next` / `3` / `next` / `2` / `return` |
| 5 `one-shot.js` | `true` / `3 0` / `3` |
| 6 `for-in-vs-of.js` | `["0","1","extra"] ["x","y"]` |
| 7 `mutate-holes.js` | `[1,2,3,4] 4` / `1,undefined,3` |
| 8 `string-code-points.js` | `4 3 [1,2,1]` |
| 9 `spread-destructure.js` | `[0,1] next,next,next` / `0 next,return` |

- 그 밖(근거 테스트로만): `for (var x of {a:1})`·`for (var x of null)`·유사 배열 `for...of`·`[...{a:1}]` 모두 TypeError, `for (var k in null)`은 0번, `next`가 객체 아닌 값을 돌려주면 TypeError, `Symbol.iterator`가 객체 아닌 값을 돌려주면 TypeError, `done`이 없는 결과는 계속 돈다(`{value: i}` → `1,2`), 끝까지 돌면 `return`을 부르지 않음(`n,n`), `break` 시 `return`이 객체 아닌 값이면 TypeError, 끝난 배열 이터레이터는 `push` 뒤에도 `{"done":true}`, 배열 이터레이터의 프로토타입의 프로토타입에 자기 `Symbol.iterator`가 있음.
- 호출 기록 방식: 새 컨텍스트에서 `%ArrayIteratorPrototype%.next`와 `Array.prototype[Symbol.iterator]`를 원래 함수를 부르는 기록용 함수로 감싸면 `for...of`·스프레드·디스트럭처링의 호출이 모두 기록된다(예제 1 소스로 `iter | next a false | next b false | next undefined true`, 출력 변화 없음 — 2026-11-02 확인).

### 사실 (코드에서 확인)

- 시뮬레이터 패턴: `app/concepts/regexp-lastindex/`(`scenarios.ts` 상태 모델·헬퍼·`before` 단계, `Simulator.tsx` 19줄 래퍼, `RegexView.tsx`, `Simulator.test.tsx`, `RegexView.test.tsx`), `concept.test.ts`의 `runWithTrace`(새 컨텍스트에서 내장 메서드를 감싸 기록, `concept.test.ts:24-50`)와 시나리오 검사(공통 불변식 `assertScenarioInvariants` + 기록 대조 + 상태 일관성, `:138-257`). 공통 타입 `app/simulator/types.ts`(Step 전체 스냅샷, `line` 1-based), 공통 export `app/simulator/index.ts`.
- 시뮬레이터 e2e 패턴: `tests/e2e/a11y.spec.ts:662-702`(페이지 axe, 모든 시나리오·모든 단계 axe — 20단계 이하 전제, 특정 단계 텍스트 확인), `tests/e2e/responsive.spec.ts:796-820`(가로 스크롤, 시나리오 끝까지 진행 중 가로 스크롤 없음). 빌드 테스트 `tests/build/build-output.test.ts`의 `시뮬레이터 프리렌더 (regexp-lastindex)`(단계 1 텍스트, region·라디오, `<details>` 개수).
- category: for-let·arrow-functions·closure가 `execution`. `for...of` 문의 실행 방식이 축이므로 `execution`. 현재 마지막 개념 symbol(order 300, 32번째). order 310이면 33번째이자 마지막.
- 고정값(현재): 개수 32·마지막 symbol — `tests/e2e/navigation.spec.ts`(카드 수 2곳, 마지막 '32번째'·제목, pager 분모 `/ 32` 전부, symbol '32 / 32' 블록), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 32), `app/lib/concepts.test.ts`(total 32, 마지막 symbol), `app/components/concept/ConceptPager.test.tsx`('1 / 32', '32 / 32'). 직전 커밋 `367ae7c`의 같은 파일 변경을 본뜬다.
- '객체' 검색: 사용자가 정한 제목에 '객체'가 들어 있어 홈 '객체' 검색 결과가 11→12개가 되고 순위 목록 끝에 `'33'`이 붙는다(`app/lib/concepts.ts:70-78`, `tests/e2e/navigation.spec.ts:17,32,91,98,109`). summary·tags에는 '객체'를 더 넣어도 결과 수는 같다(제목만으로 포함).
- e2e 이름: 기존 e2e·빌드 테스트 이름에 'iterable'·'이터러블'·'이터레이터'가 없다(grep 결과 0건) → `-g "iterable-for-of|이터러블|이터레이터 시뮬레이터|홈 학습 순서 보기"`로 새 케이스만 잡힌다(단계 5에서 `--list` 확인).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "`for...of`는 값을 직접 도는 문법이 아니라, 값에서 `Symbol.iterator` 메서드로 이터레이터를 얻고 `next()`를 `done`이 true일 때까지 부르는 프로토콜이다. 이터러블인지는 값의 종류(배열·문자열)가 아니라 `Symbol.iterator` 메서드가 있는지로 정해진다." 배열 이터레이터의 진행 상태는 명세 내부 슬롯 이름으로 보이고, "인덱스로 돈다"처럼 `for` 문과 같은 동작으로 쓰지 않는다.
- 시뮬레이터(`scenarios.ts` + `IterView.tsx` + `Simulator.tsx`)
  - 상태 모델(단계마다 전체 스냅샷):
    ```ts
    export type IterResult = { value: string; done: boolean } // value는 화면용 문자열('undefined' 포함)
    export type ProtocolCall =
      | { kind: 'get-iterator'; target: string } // target[Symbol.iterator]() 호출
      | { kind: 'next'; result: IterResult }
      | { kind: 'return' }
    export type Field = { name: string; value: string; changed?: boolean }
    export type IterState = {
      iterable: { name: string; summary: string } | null // 예: letters / "배열 ['a', 'b']", countdown / "Symbol.iterator 메서드가 있는 객체"
      iterator: { label: string; fields: Field[] } | null // 배열: [[IteratedArrayLike]]·[[ArrayLikeNextIndex]], 직접 만든 것: left
      binding: { name: string; value: string } | null // 루프 변수
      calls: ProtocolCall[] // 이 단계에서 일어난 프로토콜 호출만
    }
    ```
  - 시나리오 1 `array-loop`(라벨 '배열을 for...of로', 예제 1, 9단계): 실행 전 → 1번 줄 letters → 2번 줄 GetIterator(`letters[Symbol.iterator]()`, 이터레이터 `[[IteratedArrayLike]] letters`, `[[ArrayLikeNextIndex]] 0`) → 2번 줄 next `{a,false}`(index 1, ch 'a') → 3번 줄 출력 a → 2번 줄 next `{b,false}`(index 2, ch 'b') → 3번 줄 출력 b → 2번 줄 next `{undefined,true}`(index 2 ≥ length 2라 `[[IteratedArrayLike]]` undefined, 루프 끝, ch는 'b' 그대로) → 5번 줄 출력 `end b`.
  - 시나리오 2 `custom-break`(라벨 '직접 만든 이터러블과 break', 예제 4, 13단계): 실행 전 → 1~15번 줄 countdown 객체 → 16번 줄 GetIterator(`countdown[Symbol.iterator]()`, 이터레이터 `left 3`) → 6번 줄 next 시작·출력 next → 7번 줄 `{3,false}`(left 2, n 3) → 17번 줄 출력 3 → 18번 줄 조건 거짓 → 6번 줄 출력 next → 7번 줄 `{2,false}`(left 1, n 2) → 17번 줄 출력 2 → 18번 줄 break → 10번 줄 IteratorClose가 return 호출·출력 return → 11번 줄 `{ done: true }`를 돌려주고 루프 끝. 20단계 이하(a11y e2e 전제).
  - `IterView.tsx`: 세 칸(이터러블 / 이터레이터 / 루프 변수) 카드 + "이번 단계의 호출" 목록(`letters[Symbol.iterator]() → 이터레이터`, `next() → { value: 'a', done: false }`, `return()`). 바뀐 필드는 regexp-lastindex의 `bg-highlight`·"(바뀜)" 표시를 따른다(`changed` 또는 prevState 비교). 빈 상태 문구 "아직 만든 값이 없습니다." 375px에서 카드가 세로로 쌓이고 긴 텍스트는 `break-words`.
  - `Simulator.tsx`: regexp-lastindex 래퍼 복사, label '이터레이터 시뮬레이터'.
- 테스트(`concept.test.ts`)
  - ① 시나리오 id·라벨·exampleId(순서 array-loop, custom-break), 공통 불변식 `assertScenarioInvariants`, 첫 단계 빈 상태·이후 단계 `line` 있음.
  - ② 호출 기록 대조(시나리오 1): `runWithTrace`로 `%ArrayIteratorPrototype%.next`·`Array.prototype[Symbol.iterator]`를 감싸 예제 1을 실행 → 출력 = expectedOutput(감싸도 결과 불변), 모든 단계 `calls`를 이은 목록 = 기록(`get-iterator`·`next` value/done).
  - ③ 출력 대조(시나리오 2): `calls`의 `next`·`return` 순서 = 예제 출력에서 `'next'`·`'return'` 줄의 순서, 각 `next` 결과의 value가 `done: false`면 바로 뒤 루프 본문 출력과 같다. `return` 호출은 정확히 1번.
  - ④ 상태 일관성: 배열 시나리오 `[[ArrayLikeNextIndex]]` = 그때까지 `done: false`인 next 개수, `done: true` 뒤 `[[IteratedArrayLike]]`가 `undefined`. 직접 만든 시나리오 `left` = 3 − `done: false` 개수. `binding.value` = 마지막 `done: false` 결과의 value. 필드 `changed`는 이전 단계와 값이 달라진 단계에서만 true.
  - ⑤ 본문 주장 근거: 2절 "그 밖" 목록 전부(TypeError는 `name`으로 검사 — 다른 realm).
  - 그 밖 컴포넌트 테스트: `Simulator.test.tsx`(regexp-lastindex와 같은 3개: 처음 실행 전·다음 누르면 1번 줄 강조·시나리오 바꾸면 처음으로), `IterView.test.tsx`(빈 상태 문구, 호출 목록 텍스트, 바뀐 필드 표시).
- 장 범위: 34장까지. 예제에 계산된 프로퍼티 이름·메서드 축약(26장)·`Symbol.iterator`(33장)·삼항 연산자·`arguments`(12장)·`Array.from`(27장)·`JSON.stringify`를 쓴다. 스프레드·디스트럭처링은 예제 9에서만, "별도 개념"으로 밝힌다. `try...catch`·`let`·제너레이터는 예제에 쓰지 않는다(TypeError는 본문 문장 + 근거 테스트).
- meta: category `execution`, order 310. prerequisites: 심벌(`symbol`), 배열은 객체다(`array-index-length`), 화살표 함수와 메서드 축약(`arrow-functions`). related: `symbol`, `string-utf16`, `array-index-length`, `array-method-pitfalls`, `prototype-chain`, `for-let`. 제목에 '객체'가 있으므로 '객체' 검색 고정값을 갱신한다(4절).
- 버린 대안
  - ① 표 + 퀴즈: 사용자 결정(시뮬레이터). 호출 순서(`next`가 본문보다 먼저, `break` 뒤 `return`)는 단계로 보는 편이 분명하다.
  - ② 시나리오 3개(스프레드 포함): 스프레드는 예제 하나로만 다루기로 했다(사용자 결정). 시나리오는 for...of 두 개로 둔다.
  - ③ 직접 만든 이터러블의 호출을 vm에서 가로채기: 사용자 코드의 메서드라 실행 전에 감쌀 수 없다. 예제가 `next`·`return`에서 출력하게 만들어 출력 자체를 호출 기록으로 쓴다(이 출력이 교육 내용이기도 하다).

## 4. 변경 파일

- 추가 `app/concepts/iterable-for-of/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `scenarios.ts`, `IterView.tsx`, `Simulator.tsx`, `concept.test.ts`, `Simulator.test.tsx`, `IterView.test.tsx`
  - `examples/`(9개): `array-loop.js`, `manual-next.js`, `iterable-check.js`, `custom-iterable.js`, `one-shot.js`, `for-in-vs-of.js`, `mutate-holes.js`, `string-code-points.js`, `spread-destructure.js`
- 수정
  - `tests/e2e/helpers.ts`: `ITERABLE_FOR_OF_PATH`, `ITERABLE_FOR_OF_SIMULATOR_NAME`('이터레이터 시뮬레이터')
  - `tests/e2e/a11y.spec.ts`: 페이지 axe, 두 시나리오 모든 단계 axe(`test.slow()`), 시나리오 2의 return 단계 텍스트 확인 — regexp-lastindex 3개 케이스 형태
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤, 시나리오 끝까지 진행 중 가로 스크롤 없음, 홈 학습 순서 카드 32→33
  - `tests/e2e/navigation.spec.ts`: 카드 32→33(두 곳), 마지막 '33번째'와 새 제목, pager 분모 32→33 전부, symbol '32 / 33'·링크 2개(이전 string-utf16, 다음 iterable-for-of), 새 개념 '33 / 33'·이전 링크 symbol, **'객체' 검색 11→12(4곳)과 순위 목록에 `'33'` 추가**
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 33, 마지막 iterable-for-of(prev symbol, position 33)
  - `tests/build/build-output.test.ts`: `시뮬레이터 프리렌더 (iterable-for-of)` describe(단계 1 텍스트, region '이터레이터 시뮬레이터', 시나리오 라벨 2개·라디오 2개 이상, `<details` 9개 이상)
  - `docs/content-guide.md:167`: e2e 목록에 `iterable-for-of`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 9번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes.ts`, 기존 개념 폴더 32개

## 5. 위험 요소

- "for...of는 인덱스로 돈다", "배열 이터레이터는 내부에 인덱스 변수를 가진다(엔진 구현)" 같은 서술 → 명세 내부 슬롯 이름과 "명세가 정한 상태"로 쓰고, 시뮬레이터의 필드 이름도 `[[ArrayLikeNextIndex]]` 그대로. 단계 4에서 '인덱스로 돈다' 같은 표현 grep.
- 시나리오 단계와 실제 호출 불일치 → 시나리오 1은 내장 함수 호출 기록, 시나리오 2는 예제 출력과 대조(3절 테스트 ②③④). 음성 확인(단계 하나의 value를 바꾸면 실패).
- 시나리오 2의 줄 강조가 메서드 안 줄(6·7·10·11)로 뛰어 혼란 → 단계 제목에 "next 메서드 안" 같은 위치를 쓰고 설명에 "for...of가 부른 next가 실행됨"을 밝힌다.
- 루프 변수가 `var`라 루프 뒤에도 값이 남음(예제 1의 `end b`) → 의도한 관찰이지만 for-let과 혼동하지 않게 "`var`라서"를 쓰고 `let`은 [for 문의 let](/concepts/for-let) 링크.
- IteratorResult의 `value`가 없을 수 있다는 명세와 배열 이터레이터가 `value: undefined`를 둔다는 것을 섞음 → 예제 2는 배열 이터레이터(CreateIteratorResultObject라 프로퍼티가 있음)만 주장하고, 일반 규칙은 "없어도 된다"로 쓴다.
- `Iterator.prototype`·이터레이터 헬퍼(ES2025)는 책 이후 → 이름만, simplifications.
- 뒷장 문법 → `try...catch`·`let`·제너레이터 금지, 스프레드·디스트럭처링은 예제 9만.
- 마지막 개념·'객체' 검색 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 5에서 고친다.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "iterable-for-of|이터러블|이터레이터 시뮬레이터|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스가 모두 잡히는지 확인.
- 정확성: 예제 9개 실제 출력 = `expectedOutput`(처음엔 `[]`), concept.test 통과·음성 확인, 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 퀴즈 정답 = 실제 출력(일치 선택지 정확히 1개), 참고 링크 200.
- 브라우저(build + start, 375px·다크)
  1. `/concepts/iterable-for-of` → 가로 스크롤 없음, 시뮬레이터에 '배열을 for...of로' 1단계("실행 전")가 보인다.
  2. 다음 3번 → 2번 줄 강조, 이터레이터 카드 `[[ArrayLikeNextIndex]] 1`(바뀜), 호출 목록 `next() → { value: 'a', done: false }`, 루프 변수 `ch 'a'`.
  3. 끝까지 → `done: true` 단계에서 `[[IteratedArrayLike]] undefined`, 출력 `a`·`b`·`end b`.
  4. '직접 만든 이터러블과 break' → break 다음 단계에서 10번 줄 강조, 호출 목록 `return()`, 출력에 `return`.
  5. 키보드로 시나리오·단계 조작, 하단 학습 순서 '33 / 33'·이전 symbol, symbol 하단 '32 / 33'·다음 iterable-for-of.

## 7. 미확정 사항

- 없음. 시나리오 라벨·단계 제목·퀴즈 문구는 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(9개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경
  - 부록 초안 9개를 그대로 옮긴다.
  - `meta.ts`: slug `iterable-for-of`, title '이터러블과 for...of: 일반 객체는 왜 for...of로 돌 수 없을까', summary(149자, '객체' 포함 가능 — "for...of는 값에서 Symbol.iterator 메서드로 이터레이터를 얻고 done이 true일 때까지 next를 부릅니다. 이 메서드가 없는 일반 객체가 TypeError인 이유와 break·return, 문자열·유사 배열·스프레드의 순회를 명세로 확인합니다."), category `execution`, order 310, tags(이터러블, iterable, 이터레이터, iterator, for...of, Symbol.iterator, next, 이터레이션 프로토콜, IteratorResult, return, 유사 배열, Array.from), goals 4개, prerequisites·related(3절), examples는 처음엔 `[]`, references(2절 명세 anchor 중 본문에 쓰는 것 + MDN ko `Iteration_protocols`·`Statements/for...of`·`Global_Objects/Symbol/iterator`·`Global_Objects/Array/from`·`Global_Objects/Array/values` — 2026-11-02 모두 200 확인), `reviewedAt: null`
  - simplifications: 제너레이터(46장)·비동기 이터레이션은 다루지 않음 / 스프레드·배열 디스트럭처링(35·36장)은 프로토콜만 예제 하나 / 이터레이터 헬퍼와 전역 Iterator(ES2025, 책 이후)는 다루지 않고 `Iterator.prototype`은 이름만 / Map·Set(37장)·TypedArray·`entries`·`keys` 이터레이터는 다루지 않음 / `throw` 메서드와 이터레이터를 쓰는 다른 내장 함수는 다루지 않음 / 시뮬레이터는 Iterator Record·completion 같은 명세 내부 값을 단계로 묶어 보이며 바인딩 생성 등 세부 단계를 줄임 / `for...in`의 순서는 일부만 정함 / `console`은 호스트 API
  - `route.tsx`: symbol 템플릿 복사
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. 예제 파일은 부록 그대로(`😀`는 그대로 써도 안전 — 서로게이트 이스케이프가 아니라 문자 그대로이며 출력에 쓰이지 않음), 파일 끝 줄바꿈 하나.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표. 참고 링크 전부 200.

### 2. 시나리오와 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절의 상태 모델·시나리오 2개와 테스트 ①~⑤. `scenarios.ts`는 regexp-lastindex처럼 상단 주석(상태 모델 설명)·작성용 헬퍼·`before` 단계를 둔다. 코드는 `./examples/<file>?raw`로 가져온다.
- 주의사항: 각 단계는 전체 스냅샷. `calls`는 그 단계에서 일어난 호출만. 시나리오 1의 `next` 결과 value는 기록의 `String(r.value)`와 같은 표기('undefined' 포함).
- 완료 조건: `npx vitest run app/concepts/iterable-for-of/concept.test.ts` 통과, 음성 확인 2건(시나리오 1 next 결과 하나, 시나리오 2 return 단계 순서를 바꾸면 각각 실패) 후 원복. lint·typecheck 통과.

### 3. 시각화 컴포넌트

- 대상: `IterView.tsx`, `Simulator.tsx`, `IterView.test.tsx`, `Simulator.test.tsx`
- 변경: 3절대로. 스타일 토큰은 regexp-lastindex `RegexView.tsx`를 따른다(`border-border`, `bg-surface`, `bg-highlight`, `text-muted`, `motion-safe` 전환).
- 주의사항: 렌더에 브라우저 전용 값 금지. 호출 목록은 `<ul aria-label="이번 단계의 호출">`, 카드 제목은 텍스트로(색만으로 구분하지 않음). 바뀐 필드는 텍스트 "(바뀜)"을 함께.
- 완료 조건: `npx vitest run app/concepts/iterable-for-of` 통과(Simulator 3개, IterView: 빈 상태 문구, 호출 목록 텍스트, 바뀐 필드 "(바뀜)"), lint·typecheck 통과.

### 4. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 동작 원리 h3: 1절 주제 ①~⑨ 순서. 시뮬레이터는 ① 뒤 h3 "시뮬레이터로 따라가기"(독립된 줄에 `<Simulator scenarios={scenarios} />`). 예제 9개마다 PredictQuiz, 결과와 이유는 예제별 h3. 오해 Callout 4개: "for...of는 인덱스로 배열을 돈다", "length가 있으면 for...of로 돌 수 있다", "이터레이터는 여러 번 돌 수 있다", "break하면 이터레이터는 아무 일도 하지 않는다".
- 주의사항: '찾히다' 금지, 뒷장 내용은 "별도 개념"으로만, 공백 든 인라인 코드 Prettier 확인.
- 완료 조건: `npm test` 통과(개수·'객체' 고정 테스트는 단계 5 대상이라 이 시점 실패 허용 — 실패 목록이 그것뿐인지 확인), 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, 퀴즈 정답 대조, `grep -c '찾히'` 0.

### 5. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만. '객체' 검색 순위 목록은 끝에 `'33'`만 추가.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- 로드맵 10번 '스프레드와 디스트럭처링'에서 예제 9의 프로토콜 설명을 이어받고 이 페이지와 연결한다.
- string-utf16(simplifications의 for...of 언급)·symbol(well-known 심벌 절의 `Symbol.iterator` "별도 개념") 문구를 이 페이지 링크로 바꾸는 역방향 연결(사용자 결정대로 나중에 일괄).

## 부록: 예제 초안

`array-loop.js`

```js
var letters = ['a', 'b'];
for (var ch of letters) {
  console.log(ch);
}
console.log('end', ch);
```

`manual-next.js`

```js
var it = ['a', 'b'][Symbol.iterator]();
var r1 = it.next();
var r2 = it.next();
var r3 = it.next();
console.log(r1.value, r1.done, r2.value, r2.done);
console.log(r3.value, r3.done, 'value' in r3, JSON.stringify(r3));
console.log(typeof it.next, Object.keys(r1).join(','));
```

`iterable-check.js`

```js
var arrayLike = { 0: 'a', 1: 'b', length: 2 };
function argsIterator() {
  return typeof arguments[Symbol.iterator];
}
console.log(typeof [][Symbol.iterator], typeof 'hi'[Symbol.iterator], typeof {}[Symbol.iterator]);
console.log(typeof arrayLike[Symbol.iterator], argsIterator());
console.log(JSON.stringify(Array.from(arrayLike)), Array.prototype[Symbol.iterator] === Array.prototype.values);
```

`custom-iterable.js`

```js
var countdown = {
  [Symbol.iterator]() {
    var left = 3;
    return {
      next() {
        console.log('next');
        return left > 0 ? { value: left--, done: false } : { value: undefined, done: true };
      },
      return() {
        console.log('return');
        return { done: true };
      },
    };
  },
};
for (var n of countdown) {
  console.log(n);
  if (n === 2) break;
}
```

`one-shot.js`

```js
var nums = [1, 2];
var it = nums[Symbol.iterator]();
console.log(it[Symbol.iterator]() === it);
var first = 0;
for (var a of it) first += a;
var second = 0;
for (var b of it) second += b;
console.log(first, second);
var again = 0;
for (var c of nums) again += c;
console.log(again);
```

`for-in-vs-of.js`

```js
var list = ['x', 'y'];
list.extra = 'z';
var keys = [];
for (var k in list) keys.push(k);
var values = [];
for (var v of list) values.push(v);
console.log(JSON.stringify(keys), JSON.stringify(values));
```

`mutate-holes.js`

```js
var queue = [1, 2];
var seen = [];
for (var x of queue) {
  seen.push(x);
  if (x < 3) queue.push(x + 2);
}
console.log(JSON.stringify(seen), queue.length);
var holes = [];
for (var h of [1, , 3]) holes.push(String(h));
console.log(holes.join(','));
```

`string-code-points.js`

```js
var text = 'a😀b';
var parts = [];
for (var ch of text) parts.push(ch.length);
console.log(text.length, parts.length, JSON.stringify(parts));
```

`spread-destructure.js`

```js
var calls = [];
var pair = {
  [Symbol.iterator]() {
    var i = 0;
    return {
      next() {
        calls.push('next');
        return i < 2 ? { value: i++, done: false } : { value: undefined, done: true };
      },
      return() {
        calls.push('return');
        return { done: true };
      },
    };
  },
};
console.log(JSON.stringify([...pair]), calls.join(','));
calls = [];
var [first] = pair;
console.log(first, calls.join(','));
```

## 변경 이력

- 2026-11-02 (외부 콘텐츠 검토 1회, 5건): ① "배열 이터레이터 내부 슬롯은 현행 명세에 없다" — 판별로 원문 확인: ES2020판·ES2026판·ES2027 초안은 [[IteratedArrayLike]]·[[ArrayLikeNextIndex]] 슬롯, ES2021~ES2025판만 GeneratorResume 클로저 → 제안 전제는 틀리지만 판 차이는 사실이라 슬롯 이름은 유지하고 simplifications에 판 이력 추가 ② 내장 이터레이터만 Symbol.iterator를 상속한다고 한정, 직접 만든 이터레이터를 for...of에 넣으면 TypeError 추가 ③ GetIterator: null·함수 아닌 값도 TypeError ④ "이터레이터의 [[Done]]" → "Iterator Record의 [[Done]]" ⑤ 참고 링크 라벨 %IteratorPrototype% → %Iterator.prototype%. 근거 테스트 2개 추가 — 영향 단계 4
- 2026-11-02 (외부 콘텐츠 재검토, 2건): ① 판 경계 — 검토는 "tc39 git 태그 es2025부터 슬롯"이라 했고, 확인 결과 슬롯 복귀는 2025-04-10 #3559("Revert ArrayIterator and RegExpStringIterator to manual iterators")이며 태그 es2025(2025-06-29) 소스에는 슬롯이 있으나, 발행된 ES2025 문서(ECMA-262 16판, tc39.es/ecma262/2025)는 GeneratorResume 방식 → 두 출처가 갈려 "ES2021판부터 발행된 ES2025판 문서까지"로 쓰고 항목을 한 문장으로 줄임 ② 예제 4 이터레이터는 next와 return을 가짐 → "Symbol.iterator 없이 next와 return만 가진"으로 수정 — 영향 단계 4

## 구현 진행

- baseline (2026-11-02, `367ae7c`): lint·format:check·typecheck 통과 / `npm test` 96 files·3024 tests 통과. test:build·e2e는 단계 5 이후 실행(직전 커밋에서 통과).
- [x] 1. 예제·meta·route — examples·content-integrity 통과(예제 9개 출력 = expectedOutput), 예제 9개가 부록과 동일, 참고 링크(MDN 5개) 200, 명세 anchor 존재(`%` 인코딩 형태는 regexp-lastindex와 같음)
- [x] 2. 시나리오와 테스트 — concept.test 27개 통과, 메인 음성 확인 2건(시나리오 1 next 'b'→'z' → ②④ 실패, 시나리오 2 return 호출 제거 → ③ 실패) 후 원복. 메인이 시나리오 전문을 명세 순서와 대조, 시나리오 2 GetIterator 단계의 "2~13번 줄"을 "3~13번 줄"(메서드 본문)로 수정
- [x] 3. 시각화 컴포넌트 — `npx vitest run app/concepts/iterable-for-of` 36개 통과. 서브에이전트 판단: 빈 상태 문구를 카드별로 다르게("아직 이터레이터가 없습니다." 등 — getByText 중복 방지), 호출이 없으면 목록 대신 "이번 단계에서는 호출이 없습니다.", 값 표기는 문자열에 따옴표('a')
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서(단계 4와 병렬로 먼저 작성) — diff 확인. a11y의 return 케이스가 12단계(호출 없음)를 보고 `getByText('return()')` 부분 일치로 코드 영역에 걸려 항상 통과하던 문제를 메인이 수정(12번 클릭 → 13단계 제목·호출 목록 `return()`·다음 버튼 비활성 확인)
- [x] 4. 본문 작성 — 메인이 전문을 명세·예제·시나리오와 대조해 수정: 배열 이터레이터 next의 순서([[IteratedArrayLike]] 확인이 먼저), "%Iterator.prototype%는 체인 끝"이 아니라 체인의 객체, 유사 배열 Callout의 예제 참조 위치, for...in 순서 서술("순서에 기대지 않는다"는 틀림 — 예제 6 출력이 순서에 기대므로 CreateForInIterator 조건과 [[OwnPropertyKeys]] 순서로 수정, simplifications도 같게). 근거 테스트 2개 추가(arguments의 Symbol.iterator === Array.prototype.values, join이 undefined를 빈 문자열로). 퀴즈 9개 정답 = expectedOutput(일치 선택지 정확히 1개), `찾히` 0
- 전체 검증(2026-11-02): lint·format:check·typecheck 통과, `npm test` 99 files·3083 tests, `test:build` 272 tests, e2e navigation 16 + 새 개념 18(`--list`로 확인) 통과. 375px 다크 스크린샷으로 시뮬레이터 두 시나리오 확인(카드 세로 쌓임, "(바뀜)" 강조, 13단계 return() 호출)
- 리뷰 1차(critical-code-review, 메인 직접): 구현 중 메인이 고친 3건 — ① a11y return 케이스가 코드 영역의 `return() {`에 부분 일치해 항상 통과(검증 무력화) ② for...in 순서 서술 오류(예제 6 출력이 순서에 기대는데 "기대지 않는다"고 씀) ③ 배열 이터레이터 next 서술 순서 — 모두 수정·재검증 완료. 그 밖 Critical/High 없음. Low 1(보고): `IterView.tsx`의 `Card` children 타입에 `React.ReactNode`를 import 없이 씀(typecheck 통과, 동작 영향 없음)

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 9개, 시나리오 2개 `array-loop` 9단계·`custom-break` 13단계, 퀴즈 9개). 단계 5는 다른 파일만 바꾸므로 단계 4와 병렬로 먼저 진행했다. 본문은 메인이 명세·예제·시나리오와 대조해 고쳤고, 근거 테스트를 계획보다 4개 더 추가했다(`arguments[Symbol.iterator] === Array.prototype.values`, `join`이 `undefined`를 빈 문자열로, `Symbol.iterator`가 `null`·함수 아닌 값이면 TypeError, 직접 만든 이터레이터를 `for...of`에 넣으면 TypeError).
- 외부 콘텐츠 검토 2회를 반영하면서 배열 이터레이터 내부 슬롯의 판 이력(simplifications), 내장 이터레이터만 `Symbol.iterator`를 상속한다는 한정, GetIterator의 TypeError 조건, "Iterator Record의 `[[Done]]`", 참고 링크 라벨이 바뀌었다(`변경 이력`). 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- 구현 중 메인이 찾은 3건(a11y return 케이스가 코드 영역에 부분 일치해 항상 통과, for...in 순서 서술 오류, 배열 이터레이터 next 서술 순서)을 수정했다. 그 밖 Critical/High 없음. Low 1(`IterView.tsx`의 `React.ReactNode`를 import 없이 씀, 동작 영향 없음)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 로드맵 10번(스프레드·디스트럭처링)에서 이 페이지의 예제 9(같은 프로토콜)와 연결한다.
- [ ] 기존 페이지의 "이터러블은 별도 개념" 류 문구를 이 페이지 링크로 바꾸는 역방향 연결(symbol 때와 같이 나중에 일괄 처리).

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 외부 검토 ①("배열 이터레이터 내부 슬롯은 현행 명세에 없다")을 그대로 받지 않고 판별로 원문을 확인했다. ES2020판·ES2026판·ES2027 초안은 `[[IteratedArrayLike]]`·`[[ArrayLikeNextIndex]]` 슬롯이고 ES2021~ES2025판만 제너레이터식 닫힌 절차라서, 슬롯 이름은 유지하고 판 이력을 simplifications에 한 줄로 밝혔다.
- [Claude 판단] 재검토의 "tc39 태그 es2025부터 슬롯"도 그대로 쓰지 않았다. 슬롯 복귀(#3559, 2025-04-10)는 태그 es2025 소스에 들어 있지만 발행된 ES2025 문서(ECMA-262 16판)는 GeneratorResume 방식이라, 경계를 "ES2021판부터 발행된 ES2025판 문서까지"로 적었다.
- [Claude 판단] a11y e2e의 return 케이스를 12번 클릭 → 13단계 제목·"이번 단계의 호출" 목록 `return()`·다음 버튼 비활성으로 고쳤다. 기존 `getByText('return()')`는 코드 영역의 `return() {`에 부분 일치해 어느 단계에서든 통과했다(검증 무력화).
- [무검토 승인] 배열 시나리오는 vm 새 컨텍스트에서 `%ArrayIteratorPrototype%.next`·`Array.prototype[Symbol.iterator]`를 감싼 호출 기록과 대조하고, 직접 만든 이터러블 시나리오는 예제가 `next`·`return` 안에서 출력하게 만들어 그 출력을 호출 기록으로 대조했다. 사용자 코드의 메서드는 실행 전에 감쌀 수 없기 때문이다.
- [무검토 승인] 예제에 `try...catch`를 쓰지 않고(아직 다루지 않은 문법) TypeError 주장은 본문 문장 + concept.test.ts 근거 테스트(오류 `name` 비교)로 뒷받침했다.
- [무검토 승인] 제목에 '객체'가 들어가 홈 '객체' 검색 고정값(11→12, 순위 목록에 33 추가)을 navigation.spec.ts에서 갱신했다.
- 범위: break와 return·이터레이터는 한 번 쓴다·유사 배열 vs 이터러블·순회 중 배열 변경과 구멍을 포함하고, 스프레드·배열 디스트럭처링은 프로토콜만 예제 1개, 시각화는 next 단계 시뮬레이터(사용자 결정).

#### 배경지식

- `for...of`는 ForIn/OfHeadEvaluation에서 GetIterator로 `value[Symbol.iterator]`를 꺼내 부르고(`undefined`·`null`·함수 아닌 값이면 TypeError, 결과가 객체가 아니면 TypeError), `next`를 한 번 꺼내 Iterator Record에 둔다. ForIn/OfBodyEvaluation이 반복마다 그 `next`를 불러 IteratorComplete(ToBoolean(done))로 끝을 판정한다.
- `break`·`return` 등으로 루프를 빠져나가면 IteratorClose가 `return` 메서드가 있을 때 부른다. 끝까지 돌아 `done: true`로 끝나면 부르지 않는다.
- 배열 이터레이터 `next`는 `[[IteratedArrayLike]]`가 `undefined`인지 먼저 보고, 아니면 매번 LengthOfArrayLike로 `length`를 다시 읽는다. 그래서 순회 중 push한 요소도 돌고, 구멍은 `undefined`로 나온다.
- 내장 이터레이터는 `%Iterator.prototype%`의 `[Symbol.iterator]`(this를 돌려줌)를 상속해 이터러블이기도 하다. 문자열 이터레이터는 CodePointAt으로 코드 포인트 단위로 돈다.
- `Array.from`은 `Symbol.iterator`가 없으면 유사 배열로 처리하지만 `for...of`에는 그런 대체 경로가 없다.

#### 확인 질문

1. 배열 이터레이터의 상태를 `[[ArrayLikeNextIndex]]` 같은 내부 슬롯 이름으로 설명한 것은 ES2023판을 읽은 독자에게 틀린 말일까? 페이지는 이 차이를 어떻게 다뤘나?
   <details><summary>답</summary>ES2021~발행된 ES2025판 문서는 같은 동작을 제너레이터식 닫힌 절차로 적어 슬롯 이름이 없다. 동작은 같고 서술 방식만 다르므로 슬롯 이름(현재 초안·ES2026판·ES2020판)을 쓰고 판 이력을 simplifications에 밝혔다(meta.ts simplifications, 변경 이력 2026-11-02 2건).</details>
2. 직접 만든 `{ next, return }` 객체를 `for...of`에 넣으면 왜 TypeError일까? 배열 이터레이터는 왜 괜찮을까?
   <details><summary>답</summary>`for...of`는 넣은 값에서 `Symbol.iterator`를 꺼내는데, 직접 만든 이터레이터에는 그 메서드가 없다. 배열 이터레이터는 `%Iterator.prototype%[Symbol.iterator]`(this를 돌려줌)를 상속해 이터러블이다(content.mdx 오해 Callout, concept.test.ts 근거 테스트).</details>
3. 예제 4에서 `break` 없이 끝까지 돌면 `return`이 출력될까? 그 이유는?
   <details><summary>답</summary>출력되지 않는다. `next`가 `done: true`를 돌려 정상 종료하면 IteratorClose를 부르지 않는다. `break`처럼 완료되지 않은 채 빠져나갈 때만 `return`을 부른다(본문 예제 4 절, 시나리오 `custom-break` 13단계).</details>
4. 기존 a11y 테스트의 `getByText('return()')`가 항상 통과했던 이유는? 바꾼 테스트는 무엇을 보장하나?
   <details><summary>답</summary>부분 일치라 코드 영역의 `return() {`에 걸렸다. 바꾼 테스트는 12번 클릭해 13단계 제목을 확인하고, "이번 단계의 호출" 목록의 텍스트가 정확히 `return()`이며 마지막 단계(다음 버튼 비활성)인지 본다(tests/e2e/a11y.spec.ts, 구현 진행 단계 5).</details>
5. 순회 중 배열에 push한 요소가 `for...of`에서 왜 나올까? 이것이 `forEach`와 다른 점은?
   <details><summary>답</summary>배열 이터레이터 `next`는 부를 때마다 `length`를 다시 읽기 때문이다(예제 7 `[1,2,3,4] 4`). `forEach`는 시작할 때 `length`를 한 번 읽고 구멍을 건너뛰지만, `for...of`는 구멍도 Get으로 읽어 `undefined`로 돈다(예제 7 둘째 줄, 배열 메서드의 함정 페이지).</details>
