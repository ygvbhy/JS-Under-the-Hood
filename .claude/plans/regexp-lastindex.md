# 개념 '정규 표현식의 g 플래그와 lastIndex' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `980716b`

## 0. 요약

- 목적: 25~37장 로드맵 6번 `/concepts/regexp-lastindex`를 추가한다. 31장 정규 표현식에서 `g`(와 `y`) 플래그가 있으면 `test`·`exec`가 정규 표현식 객체의 `lastIndex`를 읽고 바꾸기 때문에 같은 호출의 결과가 달라지는 현상을, 예제 8개와 lastIndex 시뮬레이터(시나리오 3개)로 명세(RegExpBuiltinExec) 근거로 보인다.
- 범위: 새 개념 폴더 1개(category `objects`, order 280으로 학습 순서 30번째·마지막, 시뮬레이터 있음). 마지막 개념이 바뀌므로 개수·마지막 개념을 고정한 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드(`app/simulator/` 등)와 기존 개념 29개는 바꾸지 않는다.
- 위험: ① 시뮬레이터의 lastIndex·매치 위치가 실제와 다름 ② `lastIndex`를 "문자열에 붙은 위치"나 "엔진 내부 커서"처럼 설명 → 시뮬레이터 상태를 예제 실행 중 `exec` 호출 기록(trace)과 대조하는 테스트로 막고, 원인은 "정규 표현식 객체의 `lastIndex` 프로퍼티를 RegExpBuiltinExec가 읽고 쓴다"로만 쓴다.
- 복잡도: 중간 · Consensus: 생략. array-index-length와 같은 "시나리오 + View + 실행 대조 테스트" 패턴이고 공통 코드를 바꾸지 않는다. 새로 쓰는 것은 이 개념의 테스트 안에서만 쓰는 exec 호출 기록 헬퍼뿐이며, 동작은 미리 vm으로 확인했다(2절).
- 미확정: 없음(범위·추가 주제·시각화·slug는 2026-11-02 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 6번 "정규 표현식의 g 플래그와 lastIndex"(31장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-02)
  - 메서드 범위: **31장만** — `test`·`exec`·`String.prototype.match`. `replace`·`split`·`search`·`matchAll`은 32장 이후라 "별도 개념"으로 한 줄 언급하고 `simplifications`에 밝힌다.
  - 추가 주제 4개 모두: **filter와 test의 함정**, **리터럴은 평가할 때마다 새 객체**, **exec 반복과 빈 매치**, **y(sticky) 플래그**.
  - 시각화: **lastIndex 시뮬레이터**(문자열 글자 칸, lastIndex 위치, 매치 범위, 호출 결과를 단계별로).
  - slug `regexp-lastindex`, 제목(가제) '정규 표현식의 g 플래그: test 결과는 왜 번갈아 바뀔까'.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① `lastIndex`는 다음 검색을 시작할 위치다(예제 1 + 시뮬레이터): `g`가 있으면 `test`·`exec`는 `lastIndex`부터 찾고, 찾으면 `lastIndex`를 매치 끝으로 옮기고, 못 찾으면 0으로 되돌린다. 같은 `/a/g.test('a')` 세 번이 `true 1` / `false 0` / `true 1`. `lastIndex`는 문자열이 아니라 **정규 표현식 객체의 프로퍼티**(쓰기 가능, 열거 불가, 설정 불가)다. `test`도 `exec`와 같은 검색을 하고 결과를 불리언으로 바꿀 뿐이다.
  - ② `exec` 반복으로 모든 매치 찾기(예제 2 + 시뮬레이터): `while ((m = re.exec(text)) !== null)`는 `lastIndex`가 매번 앞으로 가기 때문에 끝난다. 마지막 실패에서 `lastIndex`가 0으로 돌아간다. 매치 결과 배열의 `index`.
  - ③ `g`가 없으면 `lastIndex`를 쓰지 않는다(예제 3): 검색은 항상 0부터이고 `lastIndex`를 바꾸지도 않는다(3을 넣어 두면 그대로 3).
  - ④ `match`(예제 4): `g`가 없으면 `exec`와 같은 결과(`index` 있음), `g`가 있으면 `lastIndex`를 0으로 맞춘 뒤 끝까지 반복해 매치 문자열만 모은 배열(`index` 없음)을 돌려주고, 끝나면 `lastIndex`는 0. 하나도 없으면 `null`.
  - ⑤ 같은 정규 표현식을 여러 문자열에 쓰는 함정(예제 5 + 시뮬레이터): `/^a/g`를 `filter` 콜백에서 쓰면 `'apple'` 성공 뒤 `lastIndex` 1에서 `'avocado'`를 찾다 실패해 `["apple","apricot"]`. `g`를 빼면 `["apple","avocado","apricot"]`. (`lastIndex = 0`으로 되돌리는 방법은 문장으로)
  - ⑥ 리터럴은 평가할 때마다 새 객체(예제 6): 함수 안의 `/a/g`는 호출마다 새 RegExp라 `true true true`, 바깥 변수에 담아 공유하면 `true false true`. `make() === make()`는 `false`.
  - ⑦ 빈 문자열 매치와 `exec` 반복(예제 7): `/x*/g.exec('abc')`는 빈 문자열에 매치하고 `lastIndex`가 매치 끝(0) 그대로라 같은 결과가 반복된다 — `while` 반복은 끝나지 않는다(실행하지 않고 문장으로). `match`는 빈 매치면 다음 위치로 직접 넘겨 `["","","",""]`. 반복문에서는 빈 매치일 때 `lastIndex`를 직접 늘린다.
  - ⑧ `y`(sticky) 플래그(예제 8): `lastIndex` 위치에서만 매치를 시도하고 앞으로 찾아가지 않는다. `/a/y.test('ba')`는 `false 0`, `lastIndex = 1`이면 `true 2`. 같은 상황의 `/a/g`는 1에서 찾아 `true 2`. 『모던 자바스크립트 Deep Dive』 31장이 다루지 않는 ES2015 플래그임을 밝힌다.
- 이미 다룬 내용은 요약하고 링크한다: 프로퍼티 어트리뷰트는 [프로퍼티 어트리뷰트와 접근자](/concepts/property-attributes), 같은 객체를 여러 곳에서 쓰는 것은 [원시 값과 객체](/concepts/primitives-and-objects), `filter` 콜백의 화살표 함수는 [화살표 함수와 메서드 축약](/concepts/arrow-functions), 문자열 메서드 호출은 [원시 값의 메서드](/concepts/primitive-methods).

### 유지해야 하는 기존 동작

- 기존 개념 29개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 시뮬레이터는 JS 없이 첫 단계("실행 전")를 그린다.

### 제외 범위

- 정규 표현식 패턴 문법 전반(문자 클래스, 수량자, 그룹·역참조, lookaround, 이름 있는 그룹)과 `i`·`m`·`s`·`u`·`v`·`d` 플래그의 세부. `^`는 예제 5에서 "문자열 시작"으로만 쓴다.
- `replace`·`replaceAll`·`split`·`search`(32장), `matchAll`(이터레이터, 34장), `Symbol.match` 등 심벌 메서드(33장)
- 정규 표현식 엔진의 매칭 알고리즘·백트래킹·성능
- `RegExp.prototype.exec`를 덮어쓰거나 하위 클래스로 바꾸는 경우(테스트에서만 기록용으로 감싼다)
- 코드 포인트(`u` 플래그) 단위 진행, 서로게이트 쌍(7번 개념 '문자열 길이와 UTF-16' 후보)

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안, scratchpad `spec.html`, 2026-11-02 확인)

- RegExpBuiltinExec(`#sec-regexpbuiltinexec`): `lastIndex = ToLength(Get(R, "lastIndex"))`. `g`·`y`가 둘 다 없으면 `lastIndex`를 0으로 두고 시작하며 프로퍼티에 쓰지 않는다. 반복: `lastIndex > length`이면 (`g` 또는 `y`일 때) `lastIndex`에 0을 쓰고 null. 매치 실패 시 `y`면 0을 쓰고 null, 아니면 `AdvanceStringIndex`로 한 칸 나아가 다시 시도. 성공하면 (`g` 또는 `y`일 때) `lastIndex`에 매치 끝(`endIndex`)을 쓴다. 결과 배열에 `index`(매치 시작)·`input`·`0`(매치 문자열)·`groups`.
- `RegExp.prototype.test`(`#sec-regexp.prototype.test`): `RegExpExec(R, S)`가 null이면 false, 아니면 true.
- RegExpExec(`#sec-regexpexec`): `Get(R, "exec")`가 호출 가능하면 그것을 부른다(기본은 `RegExp.prototype.exec` → RegExpBuiltinExec). → 테스트에서 `RegExp.prototype.exec`를 감싸면 `test`·`match`가 내부에서 하는 검색까지 기록된다(실행 확인, 아래).
- `RegExp.prototype[%Symbol.match%]`(`#sec-regexp.prototype-%symbol.match%`): `flags`에 `g`가 없으면 `RegExpExec` 결과 그대로. 있으면 `lastIndex`에 0을 쓰고 RegExpExec를 null이 나올 때까지 반복해 매치 문자열만 배열에 모은다. 매치 문자열이 빈 문자열이면 `lastIndex`를 `AdvanceStringIndex`로 직접 한 칸 옮긴다. 하나도 없으면 null. `String.prototype.match`(`#sec-string.prototype.match`)는 이 메서드를 부른다(심벌 메서드 경유는 33장 → 본문에서는 "match는 정규 표현식 쪽 검색을 부른다"로만 쓴다).
- 정규 표현식 리터럴 평가(`#sec-regular-expression-literals-runtime-semantics-evaluation`): 평가할 때마다 `RegExpCreate(pattern, flags)` → 새 객체.
- RegExp 인스턴스의 `lastIndex`(`#sec-properties-of-regexp-instances`, 22.2.8.1): "the String index at which to start the next match", 어트리뷰트 `{ [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }`.
- `y`(sticky) 플래그: ES2015(6.0) 판에 있고(`sticky` 15곳) ES5.1 판에는 없다(0곳) — 2026-11-02 `262.ecma-international.org/6.0/`·`/5.1/` 내려받아 확인.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/49c95a79-8449-45bc-806b-77d0e59b9bf0/scratchpad/rl/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `test-alternates.js` | `true 1` / `false 0` / `true 1` |
| 2 `exec-loop.js` | `at 1 3` / `at 5 7` / `0` |
| 3 `non-global.js` | `true 3` / `1 3` |
| 4 `match-global.js` | `["an","an"] undefined 0` / `["an"] 1` / `null` |
| 5 `filter-trap.js` | `["apple","apricot"] 1` / `["apple","avocado","apricot"]` |
| 6 `literal-new-object.js` | `true true true` / `true false true` / `false` |
| 7 `empty-match.js` | `"" 0 0` / `"" 0 0` / `["","","",""]` / `4 0` |
| 8 `sticky.js` | `false 0` / `true 2` / `false 0` / `true 2` |

- `RegExp.prototype.exec` 기록(trace) 확인: 컨텍스트 안에서 `exec`를 감싸 `{ re: String(this), input, before: lastIndex, start, end, after: lastIndex }`를 모으면
  - 예제 2: `/at/g` `cat bat` 0→(1,3)→3, 3→(5,7)→7, 7→null→0
  - 예제 5: `/^a/g` apple 0→(0,1)→1, avocado 1→null→0, banana 0→null→0, apricot 0→(0,1)→1, 이어서 `/^a/` 네 번 모두 before 0·after 0(apple·avocado·apricot 성공, banana 실패)
  - 예제 1: `/a/g` 0→(0,1)→1, 1→null→0, 0→(0,1)→1
- 그 밖: `lastIndex = 10` 뒤 `/a/g.test('a')` → `false 0`. `Object.getOwnPropertyDescriptor(/a/g, 'lastIndex')` → `{"value":0,"writable":true,"enumerable":false,"configurable":false}`.

### 사실 (코드에서 확인)

- 시뮬레이터 패턴: `app/concepts/array-index-length/{scenarios.ts,ArrayView.tsx,Simulator.tsx,concept.test.ts,ArrayView.test.tsx,Simulator.test.tsx}`. `Simulator.tsx`는 `SimulatorShell`에 `label`·`renderState`만 넘긴다(`app/concepts/array-index-length/Simulator.tsx:10-18`). Step 타입 `app/simulator/types.ts:1-16`(각 Step은 전체 스냅샷, `output` 누적).
- 공통 불변식 `tests/helpers/scenario-invariants.ts`(`assertScenarioInvariants`: 코드 원문, 마지막 출력 = `expectedOutput`, line 범위, 단계 수).
- 현재 마지막 개념은 array-method-pitfalls(order 270, 29번째, `app/concepts/array-method-pitfalls/meta.ts:9`). order 280이면 30번째이자 마지막.
- 카테고리: `objects` 라벨은 '객체와 프로토타입'(`app/lib/concepts.ts:24-30`). `lastIndex`가 정규 표현식 객체의 프로퍼티라는 것이 페이지의 축이라 `objects`로 둔다.
- 고정값(현재)
  - `tests/e2e/navigation.spec.ts`: 카드 29(`:78`, `:122`), 마지막 '29번째'와 array-method-pitfalls 제목(`:84-87`), '객체' 검색 11건·순위(`:17`, `:32`, `:91`, `:98`, `:109`), pager 분모 29(`:148`, `:158`, `:172`, `:186`, `:200`, `:214`, `:228`), array-method-pitfalls '29 / 29'와 링크 1개(`:239-244`)
  - `tests/e2e/responsive.spec.ts:794` 홈 학습 순서 카드 29
  - `app/lib/concepts.test.ts:104`, `:107-113`: total 29, 마지막 array-method-pitfalls(prev array-index-length, position 29)
  - `app/components/concept/ConceptPager.test.tsx:18`, `:26-34`: '1 / 29', 마지막 array-method-pitfalls '29 / 29'과 이전 링크
- e2e·빌드 등록 위치(array-index-length 시뮬레이터 케이스를 그대로 본뜬다): `tests/e2e/helpers.ts:50-52`(경로·시뮬레이터 이름 상수), `tests/e2e/a11y.spec.ts:626-670`(페이지 axe, 모든 단계 axe, 특정 단계 확인), `tests/e2e/responsive.spec.ts:752-779`(가로 스크롤, 시뮬레이터 진행 중 가로 스크롤), `tests/build/build-output.test.ts:735-757`(시뮬레이터 프리렌더 describe), `docs/content-guide.md:167` e2e 목록.
- 검색은 title·summary·tags 포함 여부(`app/lib/concepts.ts:70-78`).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "`g`·`y` 플래그가 있는 정규 표현식 객체는 `lastIndex`라는 상태를 가지고, `test`·`exec`는 호출할 때마다 그 상태를 읽고 바꾼다. 그래서 같은 호출이라도 앞선 호출에 따라 결과가 달라진다." 원인 서술은 RegExpBuiltinExec의 규칙 세 가지(어디서 시작하나 / 성공하면 / 실패하면)로만 하고, 엔진 내부 커서·캐시처럼 쓰지 않는다. `lastIndex`가 문자열이 아니라 정규 표현식 객체의 프로퍼티라는 점을 처음과 함정 절(⑤⑥)에서 강조한다.
- 시뮬레이터 상태(`scenarios.ts`)
  ```ts
  type RegexCard = { name: string; literal: string; lastIndex: number; lastIndexChanged?: boolean }
  type ExecCall = {
    regex: string // RegexCard.name
    method: 'test' | 'exec'
    input: string
    before: number // 호출 직전 lastIndex
    match: { start: number; end: number } | null
    after: number // 호출 직후 lastIndex
  }
  type RegexState = { regexes: RegexCard[]; calls: ExecCall[] } // calls: 이 단계에서 일어난 검색만
  ```
  - `calls`는 그 단계에서 일어난 검색(RegExpBuiltinExec 호출)만 담는다. 예제 5의 6번 줄처럼 한 줄에서 여러 번 검색하면 여러 개, 선언·출력 줄은 빈 배열.
  - View는 호출마다 입력 문자열을 글자 칸(인덱스 0..length-1)과 끝 칸(index = length, `lastIndex`가 문자열 길이와 같을 수 있으므로)으로 그리고, "시작(before)"·"다음 lastIndex(after)" 위치 표시, 매치 범위, 결과(`true`/`false`, `exec`는 `index` 또는 `null`)를 텍스트로 보인다. 정규 표현식 카드에는 리터럴과 `lastIndex`(바뀌면 강조)를 보인다. 색만으로 구분하지 않는다.
  - 입력 문자열 길이 ≤ 8(375px에서 칸 9개가 넘치지 않게) — 테스트로 강제.
- 시나리오 3개
  - `test-alternates`(예제 1): 실행 전, 1~4번 줄. 2~4번 줄은 호출 1개씩.
  - `exec-loop`(예제 2): 실행 전, 1·2·3번 줄, 4번 줄(exec 성공) → 5번 줄(출력) → 4번 줄 → 5번 줄 → 4번 줄(null, lastIndex 0) → 7번 줄. 10단계.
  - `filter-trap`(예제 5): 실행 전, 1·2번 줄, 3번 줄 4단계(콜백 호출 하나씩: apple·avocado·banana·apricot), 4번 줄(출력), 5번 줄, 6번 줄(검색 4번을 한 단계에 + 출력). 10단계.
  - 첫 단계는 line 없는 빈 상태·빈 출력. 출력 누적.
- 테스트(`concept.test.ts`)
  - ① 공통 불변식(`assertScenarioInvariants`).
  - ② **검색 기록 대조**: 예제를 새 컨텍스트에서 실행하되 먼저 그 컨텍스트의 `RegExp.prototype.exec`를 원래 함수를 부르는 기록용 함수로 감싼다(위 2절 확인 방식). 시나리오의 모든 단계 `calls`를 순서대로 이은 목록이 기록과 같아야 한다: `input`, `before`, `match`(`start`·`end` 또는 null), `after`, 그리고 `regex`가 가리키는 카드의 `literal` = `String(this)`. 출력도 `expectedOutput`과 같은지(감싸도 결과가 바뀌지 않음) 확인한다.
  - ③ 카드 `lastIndex` 일관성: 각 단계의 카드 `lastIndex` = 그 정규 표현식의 마지막 기록 `after`(그 단계까지), 기록이 없으면 0. `lastIndexChanged`는 이전 단계와 값이 다를 때만.
  - ④ 각 `call.method`가 그 단계 줄의 소스에 `.<method>(`로 나타난다. 입력 길이 ≤ 8, 카드 이름 중복 없음.
  - ⑤ 본문 주장 근거: `lastIndex` 어트리뷰트, `lastIndex`가 문자열 길이보다 크면 `false`·0, `g` 없는 정규 표현식에 `exec`를 여러 번 불러도 `lastIndex` 불변, (본문에 쓰면) `lastIndex = 0`으로 되돌리면 예제 5가 `["apple","avocado","apricot"]`가 된다.
- 장 범위: 31장까지. `filter` 콜백(27장)·화살표 함수(26장)·`while` 조건 안의 대입(`(m = re.exec(text)) !== null`)을 쓴다. 조건 안 대입은 본문에서 "대입식의 값은 대입한 값"이라고 한 줄로 설명한다. `y` 플래그는 책 31장 밖이지만 사용자 결정으로 포함하고 그렇게 밝힌다.
- category `objects`, order 280. prerequisites: property-attributes(`lastIndex` 어트리뷰트), primitives-and-objects(같은 객체를 공유), arrow-functions(`filter` 콜백). related: property-attributes, primitives-and-objects, primitive-methods, array-method-pitfalls, arrow-functions.
- 버린 대안
  - ① 표 + 퀴즈만: 사용자 결정(시뮬레이터). 호출마다 `lastIndex`가 이어지는 흐름은 단계로 볼 때 가장 잘 보인다.
  - ② "N번째 줄까지 실행" 대조(array-index-length 방식): 반복문(예제 2)과 콜백(예제 5)은 같은 줄이 여러 번 실행되므로 줄 단위 재실행으로 상태를 얻을 수 없다. RegExpExec가 `exec` 프로퍼티를 부른다는 명세에 기대어 검색 기록으로 대조한다.
  - ③ 예제 7(빈 매치)의 무한 반복을 실제로 실행: 실행기의 2초 제한에 걸린다. 매치가 제자리라는 것은 `exec` 두 번의 결과로 보이고, 고친 반복문이 끝나는 것을 실행한다.
  - ④ `y` 시나리오를 시뮬레이터에 추가: 시나리오 3개로 핵심이 충분하고, `y`는 예제와 퀴즈로 다룬다.

## 4. 변경 파일

- 추가 `app/concepts/regexp-lastindex/`
  - `meta.ts`, `content.mdx`, `route.tsx`(array-index-length 템플릿), `scenarios.ts`, `RegexView.tsx`, `Simulator.tsx`, `concept.test.ts`, `RegexView.test.tsx`, `Simulator.test.tsx`
  - `examples/`(8개): `test-alternates.js`, `exec-loop.js`, `non-global.js`, `match-global.js`, `filter-trap.js`, `literal-new-object.js`, `empty-match.js`, `sticky.js`
- 수정
  - `tests/e2e/helpers.ts`: `REGEXP_LASTINDEX_PATH`, `REGEXP_LASTINDEX_SIMULATOR_NAME`('lastIndex 시뮬레이터')
  - `tests/e2e/a11y.spec.ts`: 페이지 axe, 시뮬레이터 모든 단계 axe, 특정 단계 확인(array-index-length 케이스 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤, 시뮬레이터 진행 중 가로 스크롤, 홈 학습 순서 카드 29→30
  - `tests/e2e/navigation.spec.ts`: 카드 29→30(두 곳), 마지막 '30번째'와 새 제목, pager 분모 29→30, array-method-pitfalls '29 / 30'·링크 2개(이전 array-index-length, 다음 regexp-lastindex), 새 개념 '30 / 30'·이전 링크 array-method-pitfalls. '객체' 검색은 단계 5 판정
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 30, 마지막 regexp-lastindex(prev array-method-pitfalls, position 30)
  - `tests/build/build-output.test.ts`: 시뮬레이터 프리렌더 describe(region, 시나리오 라벨 3개, `단계 1: 실행 전`, 퀴즈 `<details` 8개 이상)
  - `docs/content-guide.md:167`: e2e 목록에 `regexp-lastindex`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 6번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 29개

## 5. 위험 요소

- 시뮬레이터 상태가 실제와 다름 → 검색 기록 대조 테스트(단계 2). 음성 확인(한 호출의 `after`·`match`·`before` 하나씩 바꾸면 실패).
- 기록용 감싸기가 동작을 바꿈 → 감싼 컨텍스트에서도 출력이 `expectedOutput`과 같은지 함께 확인(단계 2).
- `lastIndex`를 문자열·엔진 내부 상태로 오해시키는 서술 → "정규 표현식 객체의 프로퍼티"로 쓰고 예제 6(공유 vs 매번 새 객체)·오해 Callout으로 보강. 단계 4에서 '커서'·'포인터'·'캐시' 같은 단어를 grep해 오해를 바로잡는 문맥에만 있는지 확인.
- `test`가 `exec`와 다른 검색을 한다고 쓰는 것 → 명세대로 "RegExpExec 결과가 null인지로 불리언"이라고 쓴다.
- `match`의 내부(심벌 메서드)를 33장보다 먼저 설명 → "match는 정규 표현식 쪽의 검색을 부른다"까지만 쓰고 simplifications에 밝힌다.
- 무한 반복 예제가 실행기를 멈춤 → 예제 7은 고친 반복문만 실행. 예제 파일을 바꿀 때마다 `npx vitest run tests/examples.test.ts`로 2초 안에 끝나는지 확인.
- 375px 넘침 → 입력 길이 ≤ 8 테스트, 칸 줄바꿈 금지 대신 고정 폭 칸, responsive 시뮬레이터 진행 테스트(단계 3·5).
- 표시를 색만으로 구분 → 매치 칸·시작·다음 위치에 텍스트 표시(단계 3, View 테스트).
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 5에서 고친다.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx(실행 중 dev 서버가 `./meta` 실패를 캐시하지 않게).
- `y` 플래그·ES2015 연도 → 2절에서 판별 명세로 확인함. 책 범위 밖임을 simplifications에 밝힌다.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "regexp-lastindex|정규 표현식의 g 플래그|lastIndex 시뮬레이터|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스가 모두 잡히는지 확인한다.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`(처음엔 `[]`), concept.test 통과·음성 확인, 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 참고 링크 200.
- 브라우저(dev 서버 재시작 후 또는 build + start, 375px·다크)
  1. `/concepts/regexp-lastindex` → 가로 스크롤 없음, 시뮬레이터 첫 단계("실행 전")가 보인다.
  2. "test 결과가 번갈아" 시나리오 3번 줄 단계 → 시작 위치 1(끝 칸), 결과 `false`, `lastIndex` 1→0 강조.
  3. "filter와 test" 시나리오의 `'avocado'` 단계 → 시작 위치 1에서 실패, `lastIndex` 0.
  4. 키보드(화살표·Tab)로 시나리오 선택과 다음/이전이 동작한다.
  5. 하단 학습 순서 '30 / 30', 이전 array-method-pitfalls. array-method-pitfalls 하단 '29 / 30', 다음 regexp-lastindex.

## 7. 미확정 사항

- 없음. 제목·시나리오 라벨 문구는 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(8개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경
  - 부록 초안 8개를 그대로 옮긴다.
  - `meta.ts`: slug `regexp-lastindex`, title '정규 표현식의 g 플래그: test 결과는 왜 번갈아 바뀔까', summary(160자 이하), category `objects`, order 280, tags(정규 표현식, RegExp, lastIndex, g 플래그, global, test, exec, match, sticky, y 플래그, 빈 매치), goals 4개 내외, prerequisites·related(3절), examples는 처음엔 `[]`, references(2절 명세 anchor: RegExpBuiltinExec, RegExp.prototype.test, RegExp.prototype.exec, RegExpExec, %Symbol.match%, String.prototype.match, 리터럴 평가, lastIndex 프로퍼티 + MDN ko `RegExp/test`·`RegExp/global`·`String/match`, ko가 없는 `RegExp/lastIndex`·`RegExp/exec`·`RegExp/sticky`는 en-US), `reviewedAt: null`
  - simplifications: 패턴 문법과 `i`·`m`·`s`·`u`·`v`·`d` 플래그는 다루지 않음(예제의 `^`는 문자열 시작) / `replace`·`split`·`search`(32장), `matchAll`(이터레이터), `match`가 심벌 메서드를 거쳐 정규 표현식 쪽 검색을 부르는 방식(33장)은 별도 개념 / `y` 플래그는 책 31장 밖의 ES2015 플래그 / 시뮬레이터는 매칭 과정(백트래킹)을 그리지 않고 검색 한 번의 시작 위치·매치 범위·`lastIndex` 변화만 그림 / 글자 칸은 UTF-16 코드 유닛 단위이며 예제는 ASCII만 씀 / `exec`·`test`를 덮어쓰거나 하위 클래스를 만드는 경우는 다루지 않음 / `console`은 호스트 API
  - `route.tsx`: array-index-length 템플릿 복사(시뮬레이터 import는 단계 3에서 본문과 함께)
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. `console.log`에는 원시 값·`JSON.stringify`만(`null`은 원시 값). 파일 끝 줄바꿈 하나. 예제 7은 끝나는 반복문만 둔다.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력이 2절 표와 같다. 참고 링크 전부 200(ko 404는 en-US로 바꿔 200 확인).

### 2. 시나리오와 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 변경: 3절 상태 타입·작성용 헬퍼와 시나리오 3개, 3절 테스트 ①~⑤. 검색 기록 헬퍼는 `concept.test.ts` 안에 둔다(공통 helpers에 넣지 않는다).
- 주의사항: 각 Step은 전체 스냅샷. 첫 단계 line 없음. 시나리오 라벨: `test 결과가 번갈아`, `exec로 모두 찾기`, `filter와 test`(검토 때 조정 가능). 카드 `lastIndexChanged`는 그 단계에서 바뀐 경우만.
- 완료 조건: `npx vitest run app/concepts/regexp-lastindex/concept.test.ts` 통과. 음성 확인(한 단계의 `after`, `match.start`, 카드 `lastIndex`를 하나씩 바꾸면 실패) 후 원복.

### 3. 시각화와 시뮬레이터

- 대상: `RegexView.tsx`, `Simulator.tsx`, `RegexView.test.tsx`, `Simulator.test.tsx`
- 변경: array-index-length `ArrayView` 스타일(카드, 배지, `bg-highlight`, `motion-safe`)을 따른다. 정규 표현식 카드(이름·리터럴·`lastIndex`, 바뀌면 "바뀜" 표시), 이 단계의 검색 목록(호출 식 `name.method('input')`, 글자 칸 + 끝 칸과 인덱스, 시작 위치·매치 범위·다음 `lastIndex` 텍스트 표시, 결과), 검색이 없는 단계 문구. `Simulator.tsx`는 `label="lastIndex 시뮬레이터"` 래퍼.
- 주의사항: 색만으로 구분하지 않는다. 375px에서 칸 9개 + 여백이 넘치지 않는 폭. `prevState`로 `lastIndex` 변화를 보인다.
- 완료 조건: `npx vitest run app/concepts/regexp-lastindex` 통과(RegexView: 매치 칸 텍스트 표시, 끝 칸에서의 시작 위치, 실패 결과 문구, `lastIndex` 바뀜 표시 / Simulator: 첫 단계 "실행 전", 다음을 누르면 1번 줄 강조, 시나리오 전환 시 첫 단계).

### 4. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 동작 원리 h3: 1절 주제 ①~⑧ 순서. 시뮬레이터는 ① 뒤 독립된 줄. 예제 8개마다 PredictQuiz, 결과와 이유는 예제별 h3. 오해 Callout: "test는 결과만 알려 주고 정규 표현식은 바뀌지 않는다", "lastIndex는 문자열에 따라 정해진다", "match에 g를 붙여도 exec처럼 index를 준다", "g 없이도 lastIndex를 바꾸면 그 위치부터 찾는다".
- 주의사항: '찾히다' 금지, 엔진 내부 단정 금지, 공백 든 인라인 코드 Prettier 깨짐 확인(`<code>{"…"}</code>`), 이미 다룬 내용은 링크. 32·33·34장 내용은 "별도 개념"으로만.
- 완료 조건: `npm test` 통과, 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0, '커서|포인터|캐시' grep 결과가 오해를 바로잡는 문맥뿐.

### 5. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로. '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 있으면 12건·순위 '30' 추가, 없으면 그대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- 32장 문자열 메서드 개념이 생기면 `replace`·`split`·`search`의 `lastIndex` 동작(search는 `lastIndex`를 저장했다 되돌림)을 그 페이지에서 다루고 이 페이지와 연결한다.

## 변경 이력

- 2026-11-02 (사용자 요청 — 외부 콘텐츠 검토 6건): ① 검색 규칙에 g의 전진 탐색(한 칸씩 옮겨 재시도)과 y의 한 자리 시도를 넣고, 실패는 "끝까지 매치가 없음"으로 ② 예제 7의 `lastIndex++` 뒤에 u·v 플래그에서는 서로게이트 쌍 가운데에 놓여 반복이 끝나지 않을 수 있음과 `matchAll`(ES2020) 안내 추가(`/x*/gu`·`'😀b'`·`lastIndex++` 반복이 20회를 넘김, lastIndex 1에서 exec → `0 0` 확인) ③ g 없는 절의 '쓰다'(사용) → '삼다', 제목 "g가 없으면 lastIndex를 무시하고 바꾸지 않는다", goals·오해 4 같은 정리 ④ 규칙에 "문자열 끝(길이와 같은 위치)에서도 한 번 시도" 경계와 예제 7의 빈 문자열이 네 개인 이유 ⑤ 예제 7의 8번 줄 `re.lastIndex = 0;`(이미 0) 삭제 — 출력 그대로, 뒤 줄 번호 1씩 당김 ⑥ 오해 3에 `matchAll` 한 줄 안내(원래 객체의 lastIndex를 바꾸지 않고 빈 매치를 건너뜀 — 검색 시작은 원래 객체의 lastIndex 값이라 그 이상은 쓰지 않음). simplifications 2곳 갱신, concept.test 근거 3개 추가 — 영향 단계 1·2·4.
- 2026-11-02 (사용자 요청 — 외부 콘텐츠 검토 2차 4건): ① `matchAll`이 빈 매치를 "건너뛴다" → "결과에 넣고 match처럼 다음 위치로 나아간다"(`[...'abc'.matchAll(/x*/g)]` → 빈 매치 4개 확인) ② `matchAll`의 복제본은 원래 `lastIndex` 값에서 찾기 시작하고(`/an/g` lastIndex 2 → `'banana'`에서 3만, 원래 lastIndex 2 그대로), `g`가 없으면 TypeError임을 오해 3·simplifications에 추가, 예제 7의 안내는 "빈 매치의 전진을 대신 해 준다"로 좁힘 ③ 방향어 통일: 규칙 1에서 "다음 위치(인덱스가 1 큰 쪽)"로 정의하고 y 절·예제 7·시나리오 2 설명의 "뒤로/앞으로"를 "다음 위치로"로 ④ 예제 7 결과에 "앞의 exec 두 번이 lastIndex를 0에 남겨 반복은 0부터" 추가. concept.test 근거 2개 추가(빈 매치 포함, 복제본 시작 위치·TypeError) — 영향 단계 2·4.

## 부록: 예제 초안

`test-alternates.js`

```js
var re = /a/g;
console.log(re.test('a'), re.lastIndex);
console.log(re.test('a'), re.lastIndex);
console.log(re.test('a'), re.lastIndex);
```

`exec-loop.js`

```js
var re = /at/g;
var text = 'cat bat';
var m;
while ((m = re.exec(text)) !== null) {
  console.log(m[0], m.index, re.lastIndex);
}
console.log(re.lastIndex);
```

`non-global.js`

```js
var re = /a/;
re.lastIndex = 3;
console.log(re.test('a'), re.lastIndex);
var m = re.exec('banana');
console.log(m.index, re.lastIndex);
```

`match-global.js`

```js
var re = /an/g;
re.lastIndex = 4;
var all = 'banana'.match(re);
console.log(JSON.stringify(all), all.index, re.lastIndex);
var first = 'banana'.match(/an/);
console.log(JSON.stringify(first), first.index);
console.log('xyz'.match(/an/g));
```

`filter-trap.js`

```js
var startsWithA = /^a/g;
var words = ['apple', 'avocado', 'banana', 'apricot'];
var picked = words.filter((w) => startsWithA.test(w));
console.log(JSON.stringify(picked), startsWithA.lastIndex);
var noFlag = /^a/;
console.log(JSON.stringify(words.filter((w) => noFlag.test(w))));
```

`literal-new-object.js`

```js
function hasA(s) {
  return /a/g.test(s);
}
console.log(hasA('a'), hasA('a'), hasA('a'));
var shared = /a/g;
function hasAShared(s) {
  return shared.test(s);
}
console.log(hasAShared('a'), hasAShared('a'), hasAShared('a'));
function make() {
  return /a/g;
}
console.log(make() === make());
```

`empty-match.js`

```js
var re = /x*/g;
var m = re.exec('abc');
console.log(JSON.stringify(m[0]), m.index, re.lastIndex);
m = re.exec('abc');
console.log(JSON.stringify(m[0]), m.index, re.lastIndex);
console.log(JSON.stringify('abc'.match(/x*/g)));
var found = 0;
while ((m = re.exec('abc')) !== null) {
  found++;
  if (m[0] === '') re.lastIndex++;
}
console.log(found, re.lastIndex);
```

`sticky.js`

```js
var sticky = /a/y;
console.log(sticky.test('ba'), sticky.lastIndex);
sticky.lastIndex = 1;
console.log(sticky.test('ba'), sticky.lastIndex);
console.log(sticky.test('ba'), sticky.lastIndex);
var globalA = /a/g;
console.log(globalA.test('ba'), globalA.lastIndex);
```

## 구현 진행

- baseline (2026-11-02, `980716b`): lint 오류·경고 0 / format:check 통과 / typecheck 오류 0 / `npm test` 90 파일 2848 통과. test:build·e2e는 단계 5에서 실행
- [x] 1. 예제·meta·route — Sonnet 작성. 예제 8개가 부록 초안과 동일(diff), `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과(출력 = 2절 표), 참고 링크 14개 200(명세 anchor 8개는 scratchpad `spec.html`에 id 존재 확인). title·summary·tags에 '객체' 없음.
- [x] 2. 시나리오·테스트 — Sonnet 작성, 메인이 설명 두 곳 다듬음(시나리오 1 3단계의 불필요한 console 문장 삭제, 예제 2 세 번째 exec 실패 이유를 "7에서 시도해도 매치가 없고 더 나아갈 자리도 없다"로). 시나리오 5·10·10단계. `npx vitest run app/concepts/regexp-lastindex` 24 통과. 계획 외 테스트 1개 추가(검색 줄이 아닌 단계는 calls 빈 배열). 음성 확인(메인 실행): test-alternates call `after` 0→1, filter-trap apricot `match.start` 0→1 각각 ② 실패 → 원복 후 24 통과.
- [x] 3. 시각화와 시뮬레이터 — Sonnet 작성(`RegexView.tsx`, `Simulator.tsx`, 테스트 2개). 메인이 매치 범위 표기를 고침: "매치 1~3"은 끝 위치를 포함하는 것처럼 읽혀 `matchText`로 "1~2번 칸에 매치"(빈 매치는 "N번 위치의 빈 문자열에 매치"), 시나리오 2의 제목·설명도 칸 번호로. 칸 `w-7`·`gap-1`, 9칸 284px. `npx vitest run app/concepts/regexp-lastindex` 33 통과, lint·typecheck 통과. 375px 확인은 단계 5 브라우저에서.
- [x] 4. 본문 — 메인 작성. 동작 원리 h3 8개(1절 ①~⑧), 퀴즈 8개(answer 2,0,3,1,2,1,3,0), 결과와 이유 8개, 오해 Callout 4개. 계획과 다른 점: 시뮬레이터 위치를 "① 뒤"가 아니라 다른 시뮬레이터 개념과 같이 예제 절(예제 2 뒤 h3 "시뮬레이터로 확인하기")에 둠 — 시나리오가 예제 1·2·5를 다루므로. 결과·원인 문장과 줄 번호를 2절·예제 파일과 대조, `lastIndex` 어트리뷰트는 writable/enumerable/configurable 이름으로 씀. `grep -c '찾히'` 0, '커서|포인터|캐시' 0건. `npm test`는 이 페이지 관련 전부 통과, 실패 4건은 단계 5 대상인 개수 고정 테스트(`concepts.test.ts`·`ConceptPager.test.tsx`).
- [x] 5. 고정 테스트·e2e·빌드 테스트·문서 — Sonnet 작성, 메인이 diff 확인(기존 케이스는 값만, 새 케이스는 추가만). '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 없어 그대로. 검증(2026-11-02, 메인 실행): lint·format:check·typecheck 통과, `npm test` 93 파일 2901 통과, `npm run test:build` 249 통과, `npx playwright test tests/e2e/navigation.spec.ts` 16 통과, `-g "regexp-lastindex|정규 표현식의 g 플래그|lastIndex 시뮬레이터|홈 학습 순서 보기"` 18 통과. 빌드 HTML에 백틱 잔여 0(인라인 코드 깨짐 없음). 브라우저(빌드 결과를 serve, Playwright chromium 375px·다크): scrollWidth 375 = innerWidth, 시나리오 1 단계 4에서 끝 칸(1)에 "시작"·0번 칸에 "다음"과 `결과: false (매치 없음) · lastIndex 1 → 0`, 시나리오 3 단계 5(avocado)에서 1번 칸 시작·실패·`lastIndex 0 (바뀜)`, 시나리오 라디오 ArrowLeft로 전환, 하단 '학습 순서 30 / 30'·이전 array-method-pitfalls. array-method-pitfalls의 '29 / 30'·다음 링크는 navigation e2e가 확인.
- 리뷰 1차(메인 직접): Critical·High 0. 수정 1건(메인): meta goals 2번이 "lastIndex가 객체의 프로퍼티라는 점으로 exec 반복문이 끝나는 이유를"이라고 인과를 잘못 이어 붙여 "exec 반복문이 끝나는 이유는 lastIndex가 매치 끝으로 옮겨 가는 규칙으로, filter 함정은 객체의 프로퍼티라는 점으로"로 나눔 → content-integrity·개념 테스트 397 통과, lint·typecheck 통과.
  - 보고만 한 것: Low — 테스트 ③이 카드 lastIndex를 리터럴 문자열로 묶어 비교(같은 리터럴의 정규 표현식 두 개가 나오는 시나리오가 생기면 이름 기준으로 바꿔야 함). Low — 한 단계에 검색이 4개면 범례 문장이 4번 반복됨(시나리오 3 단계 10).
- 외부 콘텐츠 검토 1차(사용자 전달, 중 2·낮 4) 반영 — 제안을 먼저 실행으로 확인(u 플래그 + `lastIndex++` 반복이 끝나지 않음, `matchAll`은 ES2020(11.0)에 처음 있고 10.0에 없음, `matchAll` 첫 `next()` 뒤 원래 `lastIndex` 0 그대로, 예제 7 8번 줄 삭제 후에도 `4 0`). 변경 내용은 변경 이력. 재검증: lint·format:check·typecheck 통과, `npm test` 2904, `npm run test:build` 249, `-g "regexp-lastindex|정규 표현식의 g 플래그|lastIndex 시뮬레이터"` 16 통과.
- 외부 콘텐츠 검토 2차(사용자 전달, 중 2·낮 2) 반영 — 제안을 먼저 실행으로 확인(matchAll 빈 매치 4개 포함, lastIndex 2 상속 시 `2,3`·`'banana'`에서 3만, g 없으면 TypeError). 변경 내용은 변경 이력. 재검증: lint·format:check·typecheck 통과, `npm test` 2906, `npm run test:build` 249, `-g "regexp-lastindex|정규 표현식의 g 플래그|lastIndex 시뮬레이터"` 16 통과.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 8개, lastIndex 시뮬레이터 시나리오 3개(5·10·10단계)와 exec 호출 기록 대조 테스트, 퀴즈 8개, 오해 Callout 4개, 고정 테스트·e2e·빌드 테스트·문서).
- 계획과 다른 점: 시뮬레이터를 동작 원리 첫 절 뒤가 아니라 다른 시뮬레이터 개념처럼 예제 절(예제 2 뒤)에 두었다. 매치 범위는 끝 위치를 포함하는 것처럼 읽히지 않게 칸 번호("1~2번 칸에 매치")로 표시한다.
- 외부 콘텐츠 검토 2회(6건·4건)로 문장과 예제 7(이미 0인 `lastIndex = 0` 줄 삭제)을 바로잡았다(변경 이력). 본문에 새로 쓴 주장은 근거 테스트로 추가했다.
- 사용자 최종 승인으로 `reviewedAt`을 2026-11-02로 기록했다.

### 코드 리뷰

- critical-code-review 1차(메인 직접): Critical·High 0. meta goals의 인과 표현 1건을 수정. Low 2건(테스트 ③이 카드를 리터럴로 묶음, 검색이 여러 개인 단계에서 범례 반복)은 보고만 하고 사용자 승인으로 남겼다.

### 후속 작업

- [ ] 리뷰 Low: 같은 리터럴의 정규 표현식이 두 번 나오는 시나리오를 추가할 때 테스트 ③을 카드 이름 기준으로 바꾸기
- [ ] 리뷰 Low: 한 단계에 검색이 여러 개일 때 칸 범례를 한 번만 보일지 사용자 결정
- [ ] 32장 문자열 메서드 개념이 생기면 replace·split·search의 lastIndex 동작을 그 페이지에서 다루고 연결

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [무검토 승인] 시뮬레이터 상태를 "N번째 줄까지 실행"이 아니라 예제 실행 중 `RegExp.prototype.exec` 호출 기록과 대조 — 반복문(예제 2)과 filter 콜백(예제 5)은 같은 줄이 여러 번 실행되어 줄 단위 재실행으로 상태를 얻을 수 없다. RegExpExec가 `exec` 프로퍼티를 부른다는 명세에 기대어 `test`·`match` 안의 검색까지 기록한다(3절 버린 대안 ②).
- [무검토 승인] 상태 모델을 "정규 표현식 카드(lastIndex) + 이 단계의 검색 목록(calls)"으로 나눔 — 한 줄에서 검색이 여러 번 일어나는 단계(예제 5의 6번 줄, 검색 4번)도 하나의 스냅샷으로 그리고 기록과 대조할 수 있다.
- [Claude 판단] 매치 범위를 "1~3"이 아니라 칸 번호 "1~2번 칸에 매치"로 표시 — 매치 끝(= 새 lastIndex)은 매치에 포함되지 않는 위치라, "1~3"은 3번 칸까지 매치한 것처럼 읽힌다.
- [Claude 판단] 시뮬레이터를 예제 절(예제 2 뒤)에 둠 — 시나리오가 예제 1·2·5를 다루고, 다른 시뮬레이터 개념도 예제 절에 둔다.
- [무검토 승인] category `objects`, order 280, prerequisites 3개(property-attributes, primitives-and-objects, arrow-functions).
- 메서드 범위는 31장(test·exec·match)만, 추가 주제 4개(filter 함정, 리터럴은 매번 새 객체, exec 반복과 빈 매치, y 플래그), lastIndex 시뮬레이터, slug는 사용자가 골랐다. 검색 규칙의 전진 탐색·경계, u 플래그 주의, matchAll 서술은 외부 검토에 따라 고쳤다.

#### 배경지식

- RegExpBuiltinExec: `g`·`y`가 없으면 lastIndex를 읽어도 0부터 찾고 쓰지 않는다. 있으면 lastIndex에서 시작해 `g`는 다음 위치로 옮겨 가며 재시도, `y`는 그 자리에서만 시도. lastIndex > 길이면 시도 없이 실패(길이와 같으면 한 번 시도). 성공하면 lastIndex = 매치 끝, 실패하면 0.
- `test`는 RegExpExec 결과가 null인지로 불리언을 돌려줄 뿐 같은 검색을 한다. RegExpExec는 `exec` 프로퍼티를 부른다.
- `match`(g): lastIndex에 0을 쓰고 실패할 때까지 반복해 매치 문자열만 모은다(index 없음). 빈 매치면 AdvanceStringIndex로 다음 위치로 옮긴다.
- 정규 표현식 리터럴은 평가할 때마다 RegExpCreate로 새 객체를 만든다. `lastIndex`는 writable true, enumerable false, configurable false인 인스턴스 프로퍼티.
- `matchAll`(ES2020)은 정규 표현식을 복제해 쓰고 복제본은 원래 lastIndex 값에서 시작한다. `g`가 없으면 TypeError.

#### 확인 질문

1. 같은 `/a/g`로 `test('a')`를 세 번 부르면 `true, false, true`인 이유는? 두 번째 호출에서 lastIndex 1이 "문자열 길이보다 크지 않은데" 실패하는 과정은?
   <details><summary>답</summary>첫 호출이 성공하며 lastIndex에 매치 끝 1을 쓴다. 두 번째는 1(= 길이)에서 한 번 시도해 매치가 없고, 다음 위치 2가 길이보다 커져 실패하며 0을 쓴다. 세 번째는 다시 0부터(2절 RegExpBuiltinExec, 예제 1).</details>
2. `/^a/g`를 filter 콜백에서 쓰면 `'avocado'`가 빠지는 이유와, `g`를 빼면 왜 해결되는가?
   <details><summary>답</summary>lastIndex는 문자열이 아니라 정규 표현식 객체의 프로퍼티라 `'apple'` 성공 뒤 1이 남고, `'avocado'`는 1부터 찾는데 `^`는 0에서만 맞아 실패한다. g가 없으면 항상 0부터 찾고 lastIndex를 쓰지 않는다(예제 5).</details>
3. [무검토 승인] 시뮬레이터 상태를 "줄까지 실행" 방식이 아니라 exec 호출 기록과 대조한 이유는? 이 방식이 기대는 명세 동작은?
   <details><summary>답</summary>반복문·콜백은 같은 줄이 여러 번 실행되어 줄 단위 재실행으로 각 단계 상태를 얻을 수 없다. RegExpExec가 `exec` 프로퍼티를 부르므로 그것을 감싸면 test·match 안의 검색까지 순서대로 기록된다(3절, concept.test ②).</details>
4. 예제 7에서 빈 매치 때 `lastIndex++`로 반복을 끝냈는데, `u` 플래그가 있으면 왜 위험한가?
   <details><summary>답</summary>u가 있으면 한 칸이 코드 포인트라 lastIndex++가 서로게이트 쌍 가운데에 놓일 수 있고, 그 위치의 검색은 쌍의 처음에서 빈 매치를 해 lastIndex가 제자리로 돌아와 반복이 끝나지 않을 수 있다. 명세의 match는 AdvanceStringIndex로 코드 포인트 단위로 옮긴다(변경 이력 1차 ②, concept.test).</details>
5. [Claude 판단] 매치 범위를 "1~3"이 아니라 "1~2번 칸"으로 표시한 이유는?
   <details><summary>답</summary>매치 끝 위치(3)는 매치에 포함되지 않고 다음 lastIndex가 되는 위치라, "1~3"은 3번 칸까지 매치한 것처럼 오해된다(RegexView `matchText`, 구현 진행 단계 3).</details>
