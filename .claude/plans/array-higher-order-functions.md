# 배열 고차 함수 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-20
- 기준: `main` @ `8038844`

## 0. 요약
- 목적: "forEach 안에서 push한 요소는 왜 방문하지 않을까"를 질문으로 하는 `array-higher-order-functions` 페이지를 추가한다(order 272, 학습 순서 40번째/74). 콜백 메서드가 시작할 때 `length`를 한 번 읽고(LengthOfArrayLike), 인덱스마다 그때의 값을 읽어(HasProperty → Get) 콜백을 부른다는 것과, find·findIndex는 HasProperty 없이 Get만 한다는 차이, some·every·find의 조기 종료, flat·flatMap의 깊이를 명세·실행·시뮬레이터로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 7개, 시뮬레이터 3시나리오, 비교표 8행, 퀴즈 7개), `array-method-pitfalls`의 "다루지 않는다" 문장 3곳 연결, 40번째 이후 순위 +1·"객체" 검색 순위 배열, e2e·빌드 등록. 공통 코드는 바꾸지 않는다.
- 위험: "forEach는 배열을 복사해 돈다", "length를 매번 다시 읽는다"(for...of와 혼동), "콜백 메서드는 모두 구멍을 건너뛴다", "shift하면 지운 요소를 건너뛴다"를 예제·표·시뮬레이터가 배제하지 못하거나 오히려 강화하는 것, 시뮬레이터 단계가 실제 HasProperty·Get 순서와 어긋나는 것.
- 복잡도: 높음 · Consensus: 수행 (Architect REVISE: MEDIUM 5·LOW 7, Critic REVISE: HIGH 1·MEDIUM 4·LOW 5 → 모두 실행·명세로 재확인해 반영)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-20)
  - 추가 게시글 로드맵 3의 4번(`.claude/plans/concept-roadmap-extras-3.md`). order 272(`array-method-pitfalls` 270 뒤, `number-pitfalls` 275 앞).
  - 시각화: 시뮬레이터 + 비교표(+ 예제별 퀴즈).
  - flat·flatMap: 짧은 절로 포함(예제 1개·표 1행).
- [Claude 판단] 역방향 링크: `array-method-pitfalls`가 미룬 3곳만 이번에 연결(본문 링크, simplifications는 개념 이름, related 추가). reviewedAt은 선례대로 바꾸지 않는다. `live-html-collection`(forEach 길이 고정 설명)·`iterable-for-of`(forEach 구멍 대조)는 이미 자기 설명이 있어 9절 후보로 둔다.
- 새 페이지 메타
  - `app/concepts/array-higher-order-functions/`, slug `array-higher-order-functions`([Claude 판단] 책 용어 '배열 고차 함수'), category `objects`(array-method-pitfalls와 같음), order 272, `reviewedAt: null`.
  - title: "배열 고차 함수: forEach 안에서 push한 요소는 왜 방문하지 않을까"
  - summary(156자, "객체" 없음 → 홈 "객체" 검색 결과 수 19 유지): "forEach·map·filter·some·every·find는 시작할 때 length를 한 번만 읽고 요소는 방문할 때 읽습니다. 그래서 순회 중 push한 요소는 방문하지 않고, pop으로 줄어든 끝 인덱스를 forEach는 건너뛰지만 find는 undefined로 읽습니다."
  - tags(“객체” 금지): `배열 고차 함수`, `higher-order function`, `forEach`, `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flat`, `flatMap`, `LengthOfArrayLike`, `순회 중 변경`.
  - goals(5, 백틱 금지)
    1. 콜백 메서드가 시작할 때 length를 한 번만 읽는다는 것으로, 순회 중 push한 요소는 방문하지 않고, pop·shift로 length가 줄어 프로퍼티가 없어진 끝 인덱스는 건너뛰며, shift로 앞으로 당겨진 값은 이미 지난 인덱스에 놓여 방문하지 않는 결과를 예측할 수 있다.
    2. 요소의 값은 그 인덱스를 방문할 때 읽으므로 앞선 콜백이 뒤 요소에 대입한 값이 전달되고, filter는 콜백에 넘긴 값을 결과에 담는다는 것을 설명할 수 있다.
    3. find·findIndex와 filter의 반환값·콜백 호출 횟수 차이, some·every가 결과가 정해지는 순간 멈추는 것과 빈 배열에서의 결과를 예측할 수 있다.
    4. forEach·map·filter·some·every는 프로퍼티가 없는 인덱스에서 콜백을 부르지 않지만 find·findIndex는 그 자리도 undefined로 읽는다는 것을 HasProperty 확인 유무로 설명할 수 있다.
    5. flat의 기본 깊이 1과 구멍 처리, flatMap이 콜백 결과를 깊이 1만 펼친다는 것을 예측할 수 있다.
  - prerequisites: 배열은 객체다(`array-index-length`), 배열 메서드의 함정(`array-method-pitfalls`), 화살표 함수와 메서드 축약(`arrow-functions`).
  - related: `array-method-pitfalls`, `array-index-length`, `arrow-functions`, `type-coercion`(ToBoolean), `iterable-for-of`, `live-html-collection`, `set-map`, `async-await`.
- 용어 규칙: 현행 명세는 고정한 길이를 변수 `length`로 부르므로 `len`·`O`·`findRec` 같은 옛 판 이름을 쓰지 않는다. 본문·뷰는 "시작할 때 읽어 고정한 길이"(뷰 라벨 "시작 때 읽은 길이(고정)")와 "배열의 지금 length"로 구분한다. 산문에서 `k < length` 같은 `<`와 Record의 `{`는 반드시 백틱 안에 쓴다(MDX 파싱).
- 첫 문단의 답
  - `forEach`·`map`·`filter`·`some`·`every`는 시작할 때 LengthOfArrayLike로 `length`를 한 번 읽어 고정하고, 인덱스 0부터 그 길이 직전까지 HasProperty로 프로퍼티가 있는지 확인한 뒤 있으면 Get으로 그때의 값을 읽어 콜백을 부른다. 순회 중 push로 늘어난 인덱스는 고정한 길이 밖이라 방문하지 않고, pop·shift로 length가 줄어 프로퍼티가 없어진 끝 인덱스는 건너뛴다. 값은 방문할 때 읽으므로 앞선 콜백이 바꾼 값을 받는다(shift로 당겨진 값은 이미 지난 인덱스로 가서 방문하지 않음).
  - `find`·`findIndex`(FindViaPredicate)도 길이는 시작 때 고정하지만 HasProperty 없이 각 인덱스를 Get으로 읽어, 구멍과 pop으로 지운 끝 인덱스도 `undefined`로 콜백에 넘긴다.
  - `for...of`(배열 이터레이터)는 매번 `length`를 다시 읽는다는 점이 다르다 → [이터러블과 for...of](/concepts/iterable-for-of) 링크(뒤 장 개념, 코드는 쓰지 않음). 예제 1과 같은 데이터(`[1, 2]`, `x < 3`이면 `x + 2`를 push)를 그 페이지 예제 7이 for...of로 돌려 4개를 방문한다는 것을 결과로만 언급한다.
- 동작 원리 절(h3 5개)
  1. "시작할 때 length를 한 번 읽는다" — forEach 알고리즘 단계(LengthOfArrayLike → 인덱스가 고정한 길이보다 작은 동안 HasProperty → Get → Call), 명세 노트 인용 1개("The range of elements processed by forEach is set before the first call to callback." — 15단어), push·pop·shift 결과(예제 1·2). 증거 범위를 밝힌다: 예제 1은 length를 다시 읽는 모델을 배제하지만 "시작 때 배열을 복사해 돈다" 모델과는 출력이 같다. 예제 2는 반대로 복사 모델을 배제하지만 length 재확인 모델과는 출력이 같다. 예제 2의 shift는 "값 2가 인덱스 0으로 옮겨져 방문하지 않음, 지워진 값 1은 이미 방문함"을 명시한다.
  2. "값은 방문할 때 읽는다" — map이 뒤 요소에 대입한 값을 읽음(복사 모델 배제), map의 결과 배열은 시작 때 고정한 길이로 만듦(`ArraySpeciesCreate(obj, length)` → 보통 배열이면 그 길이의 새 배열, 예제 3에서 결과 3개·`src.length` 6), filter는 콜백에 넘긴 값을 결과에 넣음(예제 3).
  3. "find는 찾으면 멈추고, filter는 끝까지 돈다" — find·findIndex의 반환(요소/undefined, 인덱스/-1), filter는 언제나 새 배열(없으면 `[]`), 콜백 반환값은 ToBoolean([암묵적 타입 변환](/concepts/type-coercion)) (예제 4).
  4. "find는 프로퍼티가 없는 인덱스도 읽는다" — FindViaPredicate에 HasProperty가 없음, 구멍 `1:undefined`, pop 뒤 `undefined`(예제 5). 예제 5의 콜백은 아무것도 돌려주지 않아(undefined → ToBoolean false) find가 멈추지 않는다는 것, `String(x)`를 쓴 이유(join은 undefined를 빈 문자열로 바꿈), find가 돌려준 `undefined`만으로는 "못 찾음"과 "undefined를 찾음"을 구분할 수 없다는 것(`[1, , 3].findIndex((x) => x === undefined)`는 1 — 문장으로, concept.test 탐침으로 확인)을 쓴다. forEach의 구멍 처리는 [배열 메서드의 함정](/concepts/array-method-pitfalls) 예제 7을 가리킨다.
  5. "some·every는 결과가 정해지면 멈춘다, flat·flatMap" — some은 처음 truthy에서 true, every는 처음 falsy에서 false, 빈 배열은 some false·every true(콜백 0번, 알고리즘의 마지막 반환값)(예제 6). flat은 depth 기본 1, IsArray인 요소만 펼치고 FlattenIntoArray가 HasProperty로 구멍을 건너뜀, flatMap은 map 후 깊이 1(예제 7).
- 예제(초안. 아래 판 그대로 `scratchpad/hof/ex`에 두고 Node vm에서 sloppy·`'use strict';` 접두 모두 실행해 같은 출력 확인 완료, 2026-11-20 검토 반영 뒤 재실행). 예제 파일 이름과 expectedOutput:
  1. `push-during-foreach.js` → `['[1,2] [1,2,3,4]']`
     ```js
     var nums = [1, 2];
     var seen = [];
     nums.forEach((x) => {
       seen.push(x);
       if (x < 3) nums.push(x + 2);
     });
     console.log(JSON.stringify(seen), JSON.stringify(nums));
     ```
  2. `remove-during-foreach.js` → `['[1,2] 2', '[1,3] [2,3]']`
     ```js
     var a = [1, 2, 3];
     var seenA = [];
     a.forEach((x) => {
       seenA.push(x);
       if (x === 1) a.pop();
     });
     console.log(JSON.stringify(seenA), a.length);
     var b = [1, 2, 3];
     var seenB = [];
     b.forEach((x) => {
       seenB.push(x);
       if (x === 1) b.shift();
     });
     console.log(JSON.stringify(seenB), JSON.stringify(b));
     ```
  3. `read-when-visited.js` → `['[10,20,300] 6', '[1,2,3] [0,0,0]']`
     ```js
     var src = [1, 2, 3];
     var mapped = src.map((x, i) => {
       if (i === 0) src[2] = 30;
       src.push(0);
       return x * 10;
     });
     console.log(JSON.stringify(mapped), src.length);
     var items = [1, 2, 3];
     var kept = items.filter((x, i) => {
       items[i] = 0;
       return true;
     });
     console.log(JSON.stringify(kept), JSON.stringify(items));
     ```
  4. `find-vs-filter.js` → `['15 [3,15]', '[15,40] [3,15,7,40]', 'undefined [] -1']`(MDN 대표 예제와 겹치지 않게 값을 직접 정함)
     ```js
     var calls = [];
     var found = [3, 15, 7, 40].find((x) => {
       calls.push(x);
       return x > 10;
     });
     console.log(found, JSON.stringify(calls));
     calls = [];
     var all = [3, 15, 7, 40].filter((x) => {
       calls.push(x);
       return x > 10;
     });
     console.log(JSON.stringify(all), JSON.stringify(calls));
     var none = [1, 2];
     console.log(none.find((x) => x > 5), JSON.stringify(none.filter((x) => x > 5)), none.findIndex((x) => x > 5));
     ```
  5. `find-reads-missing-index.js` → `['0:1 1:undefined 2:3', '1 2 undefined']`
     ```js
     var a = [1, , 3];
     var seenA = [];
     a.find((x, i) => {
       seenA.push(i + ':' + x);
     });
     console.log(seenA.join(' '));
     var b = [1, 2, 3];
     var seenB = [];
     b.find((x) => {
       seenB.push(String(x));
       if (x === 1) b.pop();
     });
     console.log(seenB.join(' '));
     ```
  6. `some-every.js` → `['true [1,2]', 'false [1,2]', 'false true']`
     ```js
     var log = [];
     var any = [1, 2, 3, 4].some((x) => {
       log.push(x);
       return x > 1;
     });
     console.log(any, JSON.stringify(log));
     log = [];
     var all = [1, 2, 3, 4].every((x) => {
       log.push(x);
       return x < 2;
     });
     console.log(all, JSON.stringify(log));
     console.log([].some((x) => true), [].every((x) => false));
     ```
  7. `flat-flatmap.js` → `['[1,2,[3,[4]]] [1,2,3,[4]]', '[1,2,3,4] [1,2,3]', '[[1,10],[2,20]]', '[1,[10],2,[20]]', '[1,3]']`
     ```js
     var nested = [1, [2, [3, [4]]]];
     console.log(JSON.stringify(nested.flat()), JSON.stringify(nested.flat(2)));
     console.log(JSON.stringify(nested.flat(Infinity)), JSON.stringify([1, , [2, , 3]].flat()));
     console.log(JSON.stringify([1, 2].map((x) => [x, x * 10])));
     console.log(JSON.stringify([1, 2].flatMap((x) => [x, [x * 10]])));
     console.log(JSON.stringify([1, 2, 3].flatMap((x) => (x % 2 ? [x] : []))));
     ```
- 예제별 배제하는 틀린 모델(퀴즈 오답의 출처. 구현 때 모델을 코드로 흉내 내 아래 출력이 맞는지 다시 계산하고 구현 진행에 기록한다. 선택지는 정답 + 아래 오답 그대로이며 테스트는 예제별 선택지 수를 확인한다)
  1. 정답 `[1,2] [1,2,3,4]`. M1 length를 매번 다시 읽음(for...of처럼) → `[1,2,3,4] [1,2,3,4]`, M2 순회 중 push가 반영되지 않음 → `[1,2] [1,2]`. 3지선다(시작 때 복사 모델은 정답과 출력이 같아 오답이 될 수 없음 — 본문에 밝힘).
  2. 정답 `[1,2] 2 / [1,3] [2,3]`. M1 시작 때 요소를 복사해 돈다 → `[1,2,3] 2 / [1,2,3] [2,3]`, M2 프로퍼티가 없어도 Get으로 읽음(find처럼) → `[1,2,null] 2 / [1,3,null] [2,3]`, M3 인덱스가 아니라 다음 요소를 따라감 → `[1,2] 2 / [1,2,3] [2,3]`.
  3. 정답 `[10,20,300] 6 / [1,2,3] [0,0,0]`. M1 시작 때 값을 복사 → `[10,20,30] 6 / [1,2,3] [0,0,0]`, M2 filter가 끝난 뒤의 현재 요소를 담음 → `[10,20,300] 6 / [0,0,0] [0,0,0]`, M1+M2 → `[10,20,30] 6 / [0,0,0] [0,0,0]`.
  4. 정답 `15 [3,15] / [15,40] [3,15,7,40] / undefined [] -1`. M1 find도 끝까지 돈다 → `15 [3,15,7,40] / [15,40] [3,15,7,40] / undefined [] -1`, M2 filter도 처음 찾으면 멈춘다 → `15 [3,15] / [15] [3,15] / undefined [] -1`, M3 못 찾으면 find도 -1(indexOf·findIndex와 혼동) → `15 [3,15] / [15,40] [3,15,7,40] / -1 [] -1`.
  5. 정답 `0:1 1:undefined 2:3 / 1 2 undefined`. M1 find도 프로퍼티 없는 인덱스를 건너뜀(forEach처럼) → `0:1 2:3 / 1 2`, M2 시작 때 복사 → `0:1 1:undefined 2:3 / 1 2 3`, M3 length를 매번 다시 읽음 → `0:1 1:undefined 2:3 / 1 2`.
  6. 정답 `true [1,2] / false [1,2] / false true`. M1 끝까지 돈 뒤 판정 → `true [1,2,3,4] / false [1,2,3,4] / false true`, M2 빈 배열 every도 false → `true [1,2] / false [1,2] / false false`, M1+M2 → `true [1,2,3,4] / false [1,2,3,4] / false false`.
  7. 정답 `[1,2,[3,[4]]] [1,2,3,[4]] / [1,2,3,4] [1,2,3] / [[1,10],[2,20]] / [1,[10],2,[20]] / [1,3]`. M1 flat 기본이 끝까지 펼침 → 첫 줄 `[1,2,3,4] [1,2,3,[4]]`(`flat(2)`는 깊이를 명시해 그대로, 나머지 정답과 같음), M2 flat이 구멍을 undefined로 넣음 → 둘째 줄 `[1,2,3,4] [1,null,2,null,3]`, M3 flatMap이 끝까지 펼침 → 넷째 줄 `[1,10,2,20]`.
- 시뮬레이터
  - label "배열 고차 함수 시뮬레이터". 시나리오 3개(코드 = 예제 원문, 마지막 출력 = expectedOutput):
    - A "push한 요소는 방문하지 않는다"(예제 1, 약 10단계)
    - B "pop·shift 뒤의 인덱스"(예제 2, 약 20단계)
    - C "find는 프로퍼티가 없는 인덱스도 읽는다"(예제 5, 약 18단계)
  - 배치: 본문 `## 예제` 안, 예제 5의 퀴즈 뒤(시나리오 마지막 출력이 퀴즈 1·2·5의 정답이라 퀴즈보다 앞에 두지 않음. to-primitive·date 선례, content-guide 권장 흐름).
  - 상태(단계마다 전체 스냅샷)
    ```ts
    type Cell =
      | { kind: 'value'; value: string } // 프로퍼티 있음(값은 표시용 문자열: 숫자 그대로, undefined 그대로)
      | { kind: 'hole' } // length 안쪽인데 프로퍼티 없음(구멍)
      | { kind: 'beyond-length' } // 지금 length 밖(pop·shift로 줄어든 자리, push 전 자리)
    type LoopState = {
      call: string | null            // 'nums.forEach(콜백)' 등. 루프 밖이면 null
      method: 'forEach' | 'find' | null
      fixedLength: number | null     // 시작 때 LengthOfArrayLike로 읽어 고정한 길이
      array: { name: string; length: number; cells: Cell[] } | null // 지금 배열. cells는 인덱스 0..max(fixedLength, length)-1
      k: number | null               // 지금 보는 인덱스
      check: 'present' | 'absent' | 'not-checked' | null // HasProperty 결과. find는 'not-checked'
      read: string | null            // Get이 읽은 값. 'absent'면 null
      callback: string | null        // 이번 콜백이 한 일(예: 'seen에 1 추가, nums.push(3)')
      returned: string | null        // find만: 콜백 반환값과 ToBoolean 판정(예: 'undefined → false → 계속')
      visited: { name: string; items: string[] } | null // 콜백이 값을 모은 배열(seen·seenA·seenB)
      outcome: string | null         // 끝난 이유와 반환값(예: '인덱스 2가 고정한 길이 2에 닿아 끝, undefined 반환', find는 'undefined 반환')
    }
    ```
  - 단계: 1단계 '실행 전'(line 없음, output [], call null — 선례 관례), 선언 줄, 시작 단계(길이 읽기), 인덱스마다 "확인·읽기" 단계와 "콜백" 단계(absent면 확인 단계 하나), 끝 단계, 출력 단계. 줄 번호는 예제 원문 기준.
  - 뷰 `LoopView.tsx`: "시작 때 읽은 길이(고정)"와 "배열의 지금 length"를 나란히, 배열 칸(인덱스·값/'구멍'/'length 밖', k 칸 강조), 확인 결과 문구('HasProperty → true', 'HasProperty → false → 콜백 안 부름', 'find는 확인하지 않고 Get'), 읽은 값, 콜백 반환 판정(find), 모은 값 목록, 결과. 'hole'과 'beyond-length'는 둘 다 HasProperty false라는 점을 같은 문구 안에 밝힌다.
- 비교표(머리 행 `메서드 | 프로퍼티 없는 인덱스 | 멈추는 때 | 돌려주는 값 | 예제`, 칸에 `<` 금지)
  | 메서드 | 프로퍼티 없는 인덱스 | 멈추는 때 | 돌려주는 값 | 예제 |
  | `forEach` | 콜백을 부르지 않음 | 끝까지 | `undefined` | 1, 2 |
  | `map` | 콜백을 부르지 않음(결과에도 구멍) | 끝까지 | 시작 때 읽은 길이와 같은 길이의 새 배열 | 3 |
  | `filter` | 콜백을 부르지 않음 | 끝까지 | 콜백이 truthy를 돌려준 때 넘긴 값만 담은 새 배열 | 3, 4 |
  | `some` | 콜백을 부르지 않음 | 콜백이 처음 truthy를 돌려줄 때 | `true` 또는 `false` | 6 |
  | `every` | 콜백을 부르지 않음 | 콜백이 처음 falsy를 돌려줄 때 | `true` 또는 `false` | 6 |
  | `find` | `undefined`로 읽어 콜백을 부름 | 콜백이 처음 truthy를 돌려줄 때 | 그 요소 또는 `undefined` | 4, 5 |
  | `findIndex` | `undefined`로 읽어 콜백을 부름 | 콜백이 처음 truthy를 돌려줄 때 | 그 인덱스 또는 `-1` | 4 |
  | `flatMap` | 콜백을 부르지 않음 | 끝까지 | 콜백 결과를 깊이 1만 펼친 새 배열 | 7 |
  - 표 위 문장: 모든 행이 시작 때 length를 한 번 읽는다(공통이라 열로 두지 않음), 칸마다 실제 실행과 대조, "예제 칸은 그 메서드를 쓴 예제이고 일부 칸(map의 결과 구멍, some·every·findIndex·flatMap의 프로퍼티 없는 인덱스)은 예제 대신 실행 대조로만 확인했다". 예제 칸은 쉼표로 여러 번호를 받고 테스트는 번호마다 그 예제 파일에 `.<메서드>(`가 있는지 본다.
- 퀴즈 7개(예제마다 1개, 정답 = expectedOutput을 ' / '로 이은 것, 오답 = 위 모델 출력).
- 흔한 오해 2개: "forEach는 배열을 복사해서 돈다"(예제 2·3이 배제, 예제 1은 이 모델과 출력이 같다고 밝힘), "콜백 메서드는 모두 구멍을 건너뛴다"(예제 5).
- simplifications
  - thisArg, 유사 배열에 빌려 쓰는 범용성, Symbol.species·ArraySpeciesCreate의 하위 클래스 동작은 다루지 않는다.
  - 구멍 설명은 Array.prototype·Object.prototype에 인덱스 프로퍼티가 없는 보통의 경우를 전제한다(HasProperty·Get은 프로토타입 체인까지 봄).
  - reduce·reduceRight도 시작 때 length를 한 번 읽고 HasProperty로 건너뛰지만, 초기값과 구멍은 배열 메서드의 함정 개념에서 다루므로 예제를 두지 않는다. findLast·findLastIndex(ES2023, 뒤에서부터 같은 FindViaPredicate)는 다루지 않는다.
  - for...of가 length를 매번 다시 읽는 것은 이터러블과 for...of 개념에서 다룬다.
  - flat의 depth 변환(ToIntegerOrInfinity, 음수는 0)과 flatMap 콜백이 배열이 아닌 유사 배열을 돌려줄 때(IsArray가 false라 펼치지 않음)는 다루지 않는다.
  - 시뮬레이터는 HasProperty와 Get을 한 단계로, 콜백 본문 실행을 한 단계로 묶는다.
  - 예제의 console은 호스트 API. 예제는 sloppy mode 스크립트지만 결과는 strict mode에서도 같다(확인함).
- references: ECMAScript 명세 forEach·map·filter·some·every·find·FindViaPredicate·findIndex·flat·FlattenIntoArray·flatMap·LengthOfArrayLike(앵커는 구현 때 로컬 명세 사본에서 존재 확인), MDN forEach·find 2개.

## 2. 사실과 추정
### 사실 (코드·실행에서 확인)
- `array-method-pitfalls`(order 270)는 구멍을 만난 forEach·map과 초기값 없는 reduce만 다루고 filter·some·every·find·flat·flatMap·콜백 안에서 배열을 바꾸는 경우를 다루지 않는다고 밝힌다 — `app/concepts/array-method-pitfalls/meta.ts`의 simplifications 2·3번째 항목, `content.mdx:5` 마지막 문장.
- `live-html-collection/content.mdx:64`가 forEach의 LengthOfArrayLike 고정·HasProperty와 명세 노트("elements that are deleted …")를 이미 인용한다. `iterable-for-of/content.mdx:56-58`이 배열 이터레이터의 length 재확인과 forEach의 구멍 건너뜀을 대조한다(링크 대상 pitfalls).
- 명세(로컬 사본 `scratchpad/spec/indexed-collections.html`): forEach·map·filter는 LengthOfArrayLike로 읽은 `length`에 대해 `k < length` 동안 HasProperty → Get → Call(현행 판 변수 이름 `obj`·`length`·`propertyKey`). map은 `ArraySpeciesCreate(obj, length)`, filter는 `ArraySpeciesCreate(obj, 0)`. filter는 kValue를 CreateDataPropertyOrThrow. FindViaPredicate는 0..length-1 각 k에 HasProperty 없이 Get. flat은 depth 기본 1, FlattenIntoArray가 HasProperty로 건너뛰고 IsArray 요소만 재귀(LengthOfArrayLike(element)). flatMap은 depth 1 고정.
- 7개 예제 출력은 Node vm에서 sloppy·strict 접두 모두 위 expectedOutput과 같다(`scratchpad/hof/run.js`).
- 시뮬레이터 패턴: `to-primitive/scenarios.ts`(상태 주석·헬퍼), `SimulatorShell`, `assertScenarioInvariants`. 등록 파일은 856b151에서 바뀐 목록과 같다(`ConceptPager.test.tsx`, `concepts.test.ts`, `navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `build-output.test.ts`, `content-guide.md`).
- 현재 총 73개, 39번째가 array-method-pitfalls, "객체" 검색 19개·순위 `[4,12,20,21,22,23,25,26,28,30,32,33,38,47,48,50,51,62,69]` — `tests/e2e/navigation.spec.ts:102-124`. 새 페이지는 "객체"와 맞지 않으므로 순위만 `[…,38,48,49,51,52,63,70]`이 된다. `filterConcepts`는 title·summary·tags만 본다 — `app/lib/concepts.ts:91-100`.
### 추정
- 시나리오 B·C 단계 수(약 20·18)와 퀴즈 질문 문구는 구현 때 확정 — 1·3단계. 단계 내용은 Proxy 대조가 묶는다.
- 『모던 자바스크립트 Deep Dive』 27장에 flat·flatMap이 실린 범위는 책으로 확인하지 못했다. 로드맵 4번이 27장 범위로 정했고, 사용자가 포함을 결정했다.

## 3. 구현 전략
- to-primitive와 같은 구조(예제 → meta → 시나리오 → 뷰 → 본문 → concept.test → 기존 페이지 → 등록)를 따른다.
- 시뮬레이터는 forEach와 find 두 알고리즘만 그린다. map·filter·some·every는 forEach와 같은 루프(+ 결과 처리)라 본문·표로 다루고, 시뮬레이터에 넣으면 상태 모양이 메서드마다 갈라져 복잡해진다(버린 대안: 메서드별 결과 칸을 둔 범용 상태).
- concept.test는 시나리오 단계를 실제 실행과 대조한다(Architect가 scratchpad에서 시험 실행해 동작 확인):
  - (a) 예제 원문에서 배열 선언 줄만 정확한 문자열로 치환한다(예: `var nums = [1, 2];` → `var nums = __track('nums', [1, 2]);`). 치환 전에 원문이 그 줄을 포함하는지 단언해 조용히 안 바뀌는 일을 막는다. 줄 수는 그대로.
  - (b) `__track`은 Proxy를 돌려준다. get 트랩은 `'forEach'`·`'find'` 키에 감싼 함수를 돌려주고, 그 함수는 `this`(Proxy)로 원래 메서드를 부르며 콜백을 감싸 콜백 실행 중에는 기록을 끈다(콜백 안 push·pop·shift의 내부 접근 제외).
  - (c) 기록은 그 메서드에 들어간 뒤부터 빠져나오기 전까지만 켠다(마지막 `JSON.stringify`의 접근 제외).
  - (d) 기록 항목: `get length`(호출당 정확히 1회, 값 = 시나리오의 `fixedLength`), 인덱스 `has`(결과)·`get`(값). forEach는 has → get(present일 때만), find는 has 없이 get. 이 목록을 시나리오 확인 단계의 `k`·`check`·`read`와 비교한다. Proxy는 테스트 코드에만 쓴다.
- 비교표는 행마다 probe: `[1, , 3]`에서 콜백 호출 인덱스(프로퍼티 없는 인덱스 칸), `[1, 2, 3, 4]`에 판정 콜백을 줬을 때 호출 횟수(멈추는 때 칸), 반환값의 종류(돌려주는 값 칸)를 실행해 칸 문구와 매핑 대조. 칸 문구는 정확 비교.
- 버린 대안: 표+퀴즈만(사용자 결정), 시뮬레이터에 for...of 시나리오(뒤 장 개념이라 코드 금지).

## 4. 변경 파일
- 추가: `app/concepts/array-higher-order-functions/` — `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `scenarios.ts`, `LoopView.tsx`(+`.test.tsx`), `Simulator.tsx`(+`.test.tsx`), `examples/*.js` 7개.
- 수정(로직): `array-method-pitfalls/content.mdx:5`(마지막 문장 → 링크), `array-method-pitfalls/meta.ts`(simplifications 2·3번째 → 개념 이름, related에 slug).
- 수정(기계적): `app/lib/concepts.test.ts`(total 74), `app/components/concept/ConceptPager.test.tsx`(`/ 74`), `tests/e2e/navigation.spec.ts`(`/ 74` 일괄, 40번째 이후 pager 블록, 카드 74, 마지막 74번째, "객체" 순위), `tests/e2e/responsive.spec.ts`(article 74, 시나리오별 가로 스크롤), `tests/e2e/a11y.spec.ts`(페이지·시뮬레이터 진행 뒤), `tests/e2e/helpers.ts`(경로·시뮬레이터 이름·시나리오 라벨 3개, to-primitive 선례), `tests/build/build-output.test.ts`(프리렌더: region·첫 단계·비교표·퀴즈 details), `docs/content-guide.md:225`(e2e 등록 목록).
- 변경하지 않음: 공통 코드(`app/components/`, `app/simulator/`, `app/lib/` 본체), `live-html-collection`·`iterable-for-of`(9절 후보).

## 5. 위험 요소
- 예제가 틀린 모델을 배제하지 못함: 예제 2는 length 재확인 모델과 같은 출력 → 본문에 밝히고 예제 1이 배제(1·3단계). 각 예제의 모델 출력을 코드로 계산해 기록(1단계).
- 시뮬레이터가 실제 순서와 어긋남(예: find에 HasProperty 단계를 그림, shift 뒤 k=1 값을 2로 그림) → Proxy 기록 대조(4단계).
- 표 칸이 모든 경우로 일반화: "같은 길이의 새 배열"은 일반 배열 기준(Symbol.species 제외) → simplifications. "결과에도 구멍"은 probe로 확인(4단계).
- 문장 일반화: "콜백 메서드는 모두 구멍을 건너뛴다"·"forEach는 복사본을 돈다"를 쓰지 않도록 grep(3단계 완료 조건).
- 표 칸 `<` → `normalizeCell` 파손: 칸에 `<` 없음, 원문 블록 `<` 금지 검사(4단계).
- MDX 속성 안 큰따옴표 → explanation에 `"` grep(3단계).
- goals·title·summary 백틱 → grep(1단계).
- 순서 삽입 누락 → `grep -rnE "/ 73|toBe\(73\)|toHaveCount\(73\)|73번째" app tests` 0건(6단계).
- 예제 5의 `[1, , 3]` 구멍 리터럴은 Prettier 제외 폴더라 유지됨(예제 폴더 제외 규칙).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`, e2e는 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "array-higher-order-functions|배열 고차 함수|홈 학습 순서 보기"`.
- 변조 실험: 비교표 한 칸, 시나리오 한 단계의 check 값, `fixedLength` 하나를 바꾸면 concept.test가 실패(원복 후 통과).
- 브라우저(dev, 375px·다크): `40 / 74`, 이전 array-method-pitfalls·다음 number-pitfalls, 학습 목표에 백틱 없음, 시나리오 3개를 끝까지 넘기며 고정한 길이·지금 length·k 칸, pop 뒤 'length 밖' 칸, find의 콜백 반환 판정 표시, 시뮬레이터가 예제 5 퀴즈 뒤에 있음, 퀴즈 7개 정답 선택, 비교표 가로 스크롤 영역, 홈 "객체" 19개, pitfalls 새 링크, 콘솔 오류 없음.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 예제·meta·시나리오
- 대상: `meta.ts`, `route.tsx`, `examples/*`, `scenarios.ts`
- 변경: 예제 7개(1절 그대로), meta(1절), 시나리오 3개(1절 상태·단계).
- 주의사항: 줄 번호는 예제 원문 기준. 예제 파일은 Prettier·ESLint 제외. route.tsx는 to-primitive와 같은 모양.
- 완료 조건: `npx vitest run tests/examples.test.ts -t array-higher-order-functions` 통과, 시나리오 불변식 통과, summary 160자 이하·"객체" 없음, goals·title·summary 백틱 0, 예제별 "틀린 모델 → 출력" 계산 기록.
### 2. 시각화·Simulator
- 대상: `LoopView.tsx`, `Simulator.tsx`, 각 테스트.
- 완료 조건: 뷰·시뮬레이터 테스트 통과(고정한 길이와 지금 length를 따로 표시, check 3종 문구, 'hole'·'beyond-length' 칸 문구가 서로 다름, find 단계의 returned 문구, 이전/다음, 1단계 '실행 전'·line 없음·output [], 시나리오 전환 시 1단계, 첫 단계 프리렌더), 시나리오 라벨·단계 수 기록.
### 3. content.mdx
- 변경: 첫 문단 → 동작 원리(h3 5개) → 예제 7개(퀴즈 각 1개, 시뮬레이터는 예제 5 퀴즈 뒤) → 결과와 이유(예제별, 비교표, 흔한 오해 2개).
- 완료 조건: `npx vitest run app/concepts/array-higher-order-functions tests/content-integrity.test.ts tests/result-tables.test.ts` 통과, 퀴즈 7개, grep: "복사" 문장이 forEach가 복사한다고 주장하지 않음, "구멍을 건너뛴" 문장은 메서드를 한정, explanation 속성에 `"` 없음, 예제 1 문단에 복사 모델과 출력이 같다는 문장, 예제 2 문단에 length 재확인 모델과 출력이 같다는 문장과 "값 2가 인덱스 0으로 옮겨져 방문하지 않음" 문장, "지운 자리"·"지운 요소"는 pop의 끝 인덱스 문맥에서만 쓰임(shift를 '지운 요소를 건너뜀'으로 설명하지 않음), 산문의 `<`·`{`가 모두 백틱 안, "len" 0건(현행 명세 이름), 시뮬레이터가 예제 5 퀴즈 뒤.
### 4. concept.test.ts
- 변경: 퀴즈 정답·오답 중복 없음, 비교표(칸 정확 비교·probe·예제 파일에 `.<메서드>(` 포함·원문 `<` 금지), 시나리오 확인 단계와 Proxy 기록 대조(3절 방식: 콜백 밖 `length` get이 호출당 정확히 1회이고 값이 `fixedLength`와 같음, 인덱스 has·get 순서가 확인 단계의 k·check·read와 같음), 탐침(map 결과 length = 시작 때 길이, filter가 콜백에 넘긴 값을 담음, `[1, , 3].findIndex((x) => x === undefined)`가 1이고 find는 undefined, `[1, , 3].map` 결과의 `1 in`이 false), `'use strict';` 접두 비교, `filterConcepts([concept], '객체')`가 빈 배열.
- 완료 조건: `npx vitest run app/concepts/array-higher-order-functions` 통과, 변조 실험 3개, 예제별 선택지 수(예제 1은 3개, 나머지 4개) 검사.
### 5. 기존 페이지 문구
- 대상: `array-method-pitfalls` content 1곳·meta simplifications 2곳·related.
- 완료 조건: `grep -nE "다루지 않" app/concepts/array-method-pitfalls/{content.mdx,meta.ts}`에 filter·find·콜백 안 변경 관련 미룬 문장이 남지 않음(thisArg·Symbol.species·유사 배열은 남음), 연결한 하위 주제 ↔ 새 페이지 절 대조 기록, `npx vitest run app/concepts/array-method-pitfalls tests/content-integrity.test.ts` 통과.
### 6. 순서·검색·등록
- 완료 조건: `grep -rnE "/ 73|toBe\(73\)|toHaveCount\(73\)|73번째" app tests` 0건, "객체" 순위 배열 갱신, pager array-method-pitfalls → array-higher-order-functions → number-pitfalls, 시뮬레이터 a11y·responsive·build-output 검사, content-guide 목록.
### 7. 전체 검증
- 6절 전부와 브라우저 확인 기록.

## 9. 추가 개선 후보
- `live-html-collection/content.mdx:64`의 forEach 설명에 새 페이지 링크.
- `iterable-for-of/content.mdx:58`의 forEach 대조 문장에 새 페이지 링크(find는 구멍을 읽는다는 보충). 그 페이지 예제 7(`mutate-holes.js`)은 새 페이지 예제 1과 데이터가 같아 역방향 대조 후보.
- thisArg·범용성은 다음 로드맵 후보.

## 변경 이력
- 2026-11-20 (Consensus 반영): goal 1·첫 문단의 shift 인과("당겨진 값은 지난 인덱스로 가서 방문 안 함"), 예제 1·2의 증거 범위 문장(복사 모델·length 재확인 모델), 예제 2를 `a.length` 판으로 통일·재실행, 예제 4 값 변경(`[3, 15, 7, 40]`)·M3를 "find도 -1"로, 예제 5 파일 이름·시나리오 C 라벨 범위 한정, 오답 문자열 확정, 현행 명세 변수 이름(`len` 금지), 시뮬레이터 배치(예제 5 퀴즈 뒤)·상태(`hole`/`beyond-length`, `returned`, `visited` 이름, `fixedLength`, 1단계 '실행 전'), Proxy 대조 방식 구체화(선언 줄 치환·기록 구간·length get 1회), 비교표 map·filter 칸 문구와 예제 칸 여러 번호, find의 undefined 모호성 문장, MDX `<`·`{` 규칙 — 영향 단계 1~4.
- 2026-11-20 (구현 1단계 모델 재계산): 예제 7 M1 오답을 `[1,2,3,4] [1,2,3,4]` → `[1,2,3,4] [1,2,3,[4]]`로 정정(명시한 `flat(2)`는 기본값 모델의 영향을 받지 않음, `scratchpad/hof/models/models.js` 실행) — 영향 단계 3·4.

## 구현 진행

- baseline (2026-11-20, `8038844`): lint 경고 0 / format:check 통과 / typecheck 오류 0 / `npm test` 185파일·5906개 통과
- 예제별 틀린 모델 출력 재계산(`scratchpad/hof/models/models.js`): 예제 1~6 오답은 계획과 같음, 예제 7 M1만 정정(변경 이력)
- [x] 1. 예제·meta·시나리오 — examples.test 7개 통과, 예제 파일이 scratchpad 검증본과 `diff -r` 동일, summary 156자·"객체" 없음·goals/title/summary 백틱 0, 시나리오 A 10·B 21·C 23단계(불변식 임시 실행 통과). 메인 수정: 출력 단계 주석의 다른 개념 문구("호출이 만드는 컨텍스트") 제거, 시나리오 C의 "forEach는 이 인덱스를 건너뛰었습니다"(그 시나리오에서 forEach 미실행)를 가정문으로.
- [x] 2. 시각화·Simulator — `npx vitest run app/concepts/array-higher-order-functions` 2파일 24개 통과, typecheck·lint·prettier 통과. 루프 밖은 array·visited만 마지막 값 유지(header 주석).
- [x] 5. 기존 페이지 문구 — pitfalls `content.mdx:5` 마지막 문장 링크, meta simplifications 2·3번째에서 고차 함수 사용법·콜백 안 배열 변경만 개념 이름으로(thisArg·Symbol.species·유사 배열은 그대로), related 추가.
- [x] 6. 순서·검색·등록 — `/ 73` 등 grep 0건, "객체" 순위 갱신(기존 배열 일치 확인 후), pager 블록, helpers `ARRAY_HOF_*`, a11y 2케이스, responsive, build-output(퀴즈 `<details>` 7개 이상은 메인이 조정), content-guide 목록.
- [x] 3. content.mdx — 퀴즈 7개(선택지 3/4/4/4/4/4/4, 오답 = 모델 출력), 시뮬레이터는 예제 5 퀴즈 뒤, 비교표 8행, 오해 2개(2번 제목은 "forEach처럼 find도 구멍을 건너뛴다"로 메서드 한정). grep: "복사" 문장은 모두 모델·반박·오해 표시, "콜백 메서드는 모두" 0건, `len`·`O`·`findRec` 0건, explanation 속성 `"` 0건. 메인 수정: 명세 NOTE 인용이 문장 중간에서 잘리고 "(문장은 콜백 이름으로 이어집니다)"가 붙어 있던 것을 원문 한 문장(14단어, 현행 판 `callback`)으로, 예제 2 shift 문장의 명사형 나열을 서술문으로(테스트 단언도 같이).
- [x] 4. concept.test.ts — 81개 통과(폴더 전체). Proxy 대조(선언 줄 1회 존재 단언 후 치환, 콜백 중 기록 끔, length 호출당 1회·맨 앞·fixedLength 일치, has·get 순서), 비교표 칸 정확 비교·probe·예제 파일 `.<메서드>(`, 탐침, 증거 범위 모델 대조, strict 접두. 변조 실험(서브에이전트 실행): 표 find 행 칸 → 실패, 시나리오 read·check → Proxy 대조 실패, 시나리오 B fixedLength 3→4 → 실패, 원복 후 통과.
- 전체 검증 (2026-11-20): lint·format:check·typecheck 통과, `npm test` 188파일·6007개 통과, `npm run test:build` 588개 통과, `npx playwright test tests/e2e/navigation.spec.ts` 16개·`-g "array-higher-order-functions|배열 고차 함수|홈 학습 순서 보기"` 18개 통과. 브라우저(dev, 375px·다크): 학습 목표 백틱 없음, 시나리오 3개, 가로 스크롤 없음(scrollWidth 375), 시나리오 B 9단계 pop 뒤 인덱스 2 'length 밖'·'HasProperty → false → 콜백 안 부름', 콘솔 오류 없음.
- 리뷰 1차 (메인 직접 + Opus 명세 정확성 교차 검토, 지적은 Node·명세로 재확인): High 4 수정 · Medium 1·Low 8 보고
  - High(수정) H1 `shift`로 당겨진 값을 모두 방문하지 않는다고 일반화(`[1,2,3,4]`에서 shift 시 방문 `[1,3,4]`) → 첫 문단·goal 1을 "지금 인덱스 바로 뒤의 값만"으로, 탐침 추가.
  - High(수정, Opus Medium을 [[spec-accuracy-severity]]로 상향) pop·shift 인과 반대(명세는 DeletePropertyOrThrow 뒤 length Set, Proxy로 `delete 2, length 2` 확인) → 첫 문단·goal 1·시나리오 단계 4곳을 "끝 인덱스를 지우고 length를 줄임"으로, 탐침·금지 단언 추가.
  - High(수정, 상향) goal 1이 "콜백 메서드" 전체로 일반화(find는 끝 인덱스를 읽음)·원인 누락 → forEach·map·filter·some·every와 HasProperty로 한정. summary도 같은 원인으로 고침(160자).
  - High(수정, 상향) 뷰가 끝 단계·find 시작 단계에 "아직 확인 전/읽기 전"을 보여 그 뒤에 확인·읽기가 있다고 읽힘 → 끝 단계 "확인하지 않음(인덱스가 고정한 길이에 닿아 루프 끝)"·"읽지 않음(루프 끝)", find "find는 확인하지 않음". 뷰 테스트 2개 추가.
  - Medium `content.mdx` 비교표 위 "실행으로만 확인한 칸" 목록 불완전(filter 구멍, forEach 반환값, findIndex 찾은 경우가 예제에 없음) — 일반 문구로 바꾸기 권장.
  - Low `content.mdx` filter 문장 어순(truthy 뒤 Get처럼 읽힘) / every 판정 대상("2가 falsy") / flat 구멍 설명 "펼치는 깊이 안에서" 한정 / `k < length`의 `length`가 고정한 길이 / "방문" 두 뜻(루프 도달 vs 콜백 호출) / 퀴즈 1·3 오답 일부가 단일 모델이 아님(계획대로) / 탐침 없는 주장(예제 3 복사 모델, join, reduce, flatMap 유사 배열 — Opus가 실행으로 참 확인) / `array-method-pitfalls/meta.ts` simplifications 3 "콜백 안에서 배열을 바꾸는 경우"는 forEach·map·filter·find로 한정 권장.
- 리뷰 수정 후 재검증 (2026-11-20): lint·format:check·typecheck 통과, `npm test` 188파일·6011개, test:build 588개, e2e navigation 16개·새 페이지 범위 18개 통과. 검수 가이드 `.claude/review/array-higher-order-functions-2026-11-20.md`.
- 리뷰 Medium·Low 수정 (2026-11-23, 사용자 요청 "Fix those too"): 비교표 위 "실행으로 확인한 칸"을 일반 문구 + 전체 목록으로, filter 문장 어순(Get → 콜백 → 다시 읽지 않고 담음), every 판정 대상(콜백 반환값 false), flat 구멍 설명을 "펼치는 깊이 안에서"로 한정하고 펼치지 않은 안쪽 배열의 구멍은 남는다고 추가, `k < length` → "고정한 길이보다 작은 동안", '방문한다'(콜백 호출)·'건너뛴다' 정의 추가와 "방문 대상" 표현 4곳을 "루프가 닿다/보다"로, 퀴즈 오답 출처 주석 정정(예제 3 마지막 오답은 두 오해의 조합), 탐침 5개 추가(예제 3 복사 모델 `[10,20,30] 6`, join의 undefined, reduce 구멍, flatMap 유사 배열, 안쪽 배열 구멍), `array-method-pitfalls/meta.ts` simplifications 3을 forEach·map·filter·find 콜백으로 한정.
- 재검증 (2026-11-23): lint·format:check·typecheck 통과, `npm test` 188파일·6016개, test:build 588개, e2e navigation 16개·새 페이지 범위 18개 통과. 브라우저(dev): 시나리오 C 전 단계에서 check·read 문구(find 시작 "find는 확인하지 않음", 끝 "확인하지 않음(…루프 끝)"/"읽지 않음(루프 끝)") 확인, 콘솔 오류 없음.
- 사용자 외부 검토 반영 (2026-11-23, 지적마다 Node 실행으로 확인):
  - shift로 당겨진 값 2가 가는 인덱스 0은 "이미 지난 인덱스"가 아니라 지금 콜백이 실행 중인(이미 Get을 마친) 인덱스 → goal 1·첫 문단·예제 2·결과와 이유·퀴즈 2 해설·시나리오 B 2단계를 "이미 값을 읽은 지금 인덱스로 옮겨져 다시 읽지 않음"으로, "지난 인덱스" 금지 단언.
  - 예제 1~3은 "고정한 길이와 지금 length 중 작은 쪽까지만 돌고 HasProperty 없음" 모델로도 출력이 같음(실행 확인) → 예제 2 문단에 한계 문장 + 배열 메서드의 함정 예제 7(가운데 구멍, visited 2 vs 모델 3)·예제 5 연결. 예제 추가 대신 링크를 택함(기존 예제·퀴즈·시나리오 유지). 모델 대조 테스트(예제 1~3 같음, 가운데 delete·pitfalls 예제 7에서 갈림) 추가.
  - 고차 함수 정의 문장과 flat을 함께 다루는 이유를 동작 원리 첫 문단에.
  - flat 구멍 설명: 원본 배열은 깊이와 상관없이 HasProperty로 돌아 `[1, , 2].flat(0)`도 `[1,2]` → "펼치는 깊이 안에서" 제거, 탐침 추가.
  - 사소: find·findIndex는 FindViaPredicate의 레코드에서 `[[Value]]`/`[[Index]]`를 꺼냄, 비교표 map 예제 칸 "3, 7"(테스트를 "그 메서드를 쓰는 예제 전부"로 양방향 검사), 시나리오 C의 "(시나리오 B)"를 화면 이름 「pop·shift 뒤의 인덱스」로.
- 재검증 (2026-11-23, 외부 검토 반영 후): lint·format:check·typecheck 통과, `npm test` 188파일·6018개, test:build 588개, e2e navigation 16개·새 페이지 범위 18개 통과.
- 사용자 재검토 반영 (2026-11-23): 고차 함수 정의 문장을 "`flat`을 뺀 이 페이지의 메서드는 모두 콜백 함수를 인수로 받습니다"로, 예제 1~3의 한계 문단을 "`pop`과 `shift`가 프로퍼티를 지우는 자리는 끝 인덱스뿐"으로 고치고 읽는 순서에 맞게 예제 3 설명 뒤(값은 방문할 때 읽는다 절 끝)로 옮김. 검증: 관련 vitest 1233개·format·lint·test:build 588개 통과(본문 문구만 바뀌어 e2e는 재실행하지 않음).

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 예제 7개, 퀴즈 7개, 시뮬레이터 3시나리오(A 10·B 21·C 23단계), 비교표 8행, 흔한 오해 2개를 만들고, array-method-pitfalls 3곳을 연결했으며, 순서·e2e·빌드 등록을 마쳤다.
- 달라진 점
  - 예제 7의 M1 오답을 정정했다(변경 이력).
  - 리뷰와 외부 검토를 거치며 문장을 고쳤다: shift·pop 인과, "이미 값을 읽은 지금 인덱스", 예제 1~3의 한계 문단과 함정 예제 7 연결, 고차 함수 정의, flat 구멍 설명, find·findIndex 레코드.
  - 비교표의 map 예제 칸은 "3, 7"이다.
  - 뷰는 끝 단계와 find 시작 단계의 확인·읽기 문구를 바꿨다.
  - 사용자 결정으로 reviewedAt을 '2026-11-23'으로 기록했다.

### 코드 리뷰
- 리뷰 1차(메인 + Opus 명세 교차 검토)에서 High 4건을 수정했다.
- Medium 1건과 Low 8건은 사용자 요청으로 모두 수정했다.
- 사용자 외부 검토(낮음 4, 사소 3)와 재검토(사소 2)도 모두 반영했다.
- 남긴 항목은 없다.

### 후속 작업
- [ ] `live-html-collection/content.mdx:64`의 forEach 설명과 `iterable-for-of/content.mdx:58`의 forEach 대조 문장에 새 페이지 링크 걸기(9절 후보)
- [ ] thisArg·유사 배열 범용성은 다음 로드맵 후보
- [ ] 로드맵 3의 다음 항목(5번)을 사용자에게 확인

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 리뷰 지적의 심각도를 올려 고쳤다.
  - Opus는 pop·shift 인과, 학습 목표 일반화, 뷰의 "아직 확인 전" 문구를 Medium으로 냈다. 명세와 다르거나 따라 하면 출력을 틀리게 예측하는 설명이라 High로 올려 구현 단계에서 고쳤다.
  - 택하지 않은 대안은 Medium으로 남겨 보고하는 것이다.
  - 근거: 계획 `## 구현 진행` 리뷰 1차.
- [Claude 판단] 시뮬레이터 끝 단계와 find 시작 단계의 표시를 바꿨다.
  - 끝 단계는 "확인하지 않음(인덱스가 고정한 길이에 닿아 루프 끝)", find 시작 단계는 "find는 확인하지 않음"이다.
  - 빈 칸 기본 문구("아직 확인 전")는 그 뒤에 확인이 이어진다고 읽히기 때문이다. FindViaPredicate에는 HasProperty가 없다.
  - 근거: `LoopView.tsx` `LOOP_DONE`·`FIND_NO_CHECK`.
- [Claude 판단] 퀴즈 오답을 틀린 모델로 직접 실행해 다시 계산했다.
  - 계획에 적힌 예제 7 M1 오답 `[1,2,3,4] [1,2,3,4]`가 실제 모델 출력 `[1,2,3,4] [1,2,3,[4]]`와 달랐다. 깊이를 명시한 `flat(2)`는 "기본 깊이가 무한"이라는 모델의 영향을 받지 않는다.
  - 근거: 변경 이력, `scratchpad/hof/models/models.js`.
- [무검토 승인] 시뮬레이터 단계를 Proxy 실행 기록과 대조하게 했다.
  - 예제의 배열 선언 줄만 `__track(...)`으로 바꿔 실행하고, 콜백이 실행되는 동안은 기록을 끈다.
  - `length` 읽기는 호출당 1회여야 하고, 인덱스 has·get 순서가 시나리오의 확인 단계와 같아야 한다.
  - 버린 대안은 시나리오를 손으로만 맞추는 것이다. 이렇게 하면 "find에도 HasProperty 단계를 그리는" 식의 오류를 테스트가 잡지 못한다.
  - 근거: 3절, `concept.test.ts` `traceExample`.
- [무검토 승인] 시뮬레이터는 forEach와 find 두 알고리즘만 그린다.
  - map·filter·some·every는 forEach와 같은 루프에 결과 처리가 더해진 것이라 본문과 표로 다룬다.
  - 메서드별 결과 칸을 두면 상태 모양이 갈라진다.
  - 근거: 3절.
- 예제 1~3이 HasProperty 확인을 입증하지 못한다는 한계를 문장으로 밝혔다(외부 검토 반영).
  - 예제를 추가하는 대신 배열 메서드의 함정 예제 7(가운데 구멍)로 연결했다.
  - 이 선택지는 사용자가 "Add the example too" 대신 승인을 골랐다.
  - 근거: `content.mdx` "예제 1~3에는 한계도 있습니다" 문단, 모델 대조 테스트.

#### 배경지식
- **forEach·map·filter·some·every의 루프**:
  - LengthOfArrayLike로 length를 한 번 읽어 고정한다.
  - `k`가 그 길이보다 작은 동안 HasProperty → Get → Call을 한다.
  - map은 `ArraySpeciesCreate(obj, length)`로, filter는 `ArraySpeciesCreate(obj, 0)`으로 결과를 만든다.
  - filter는 콜백에 넘긴 kValue를 다시 읽지 않고 그대로 담는다.
- **FindViaPredicate(find·findIndex)**:
  - HasProperty 없이 Get만 한다.
  - `[[Index]]`와 `[[Value]]`를 담은 레코드를 돌려준다.
- **pop·shift의 끝 인덱스 처리**: DeletePropertyOrThrow로 끝 인덱스를 지운 뒤 length를 Set한다. shift는 그 전에 값을 한 칸씩 Set으로 옮긴다.
- **flat**: FlattenIntoArray는 원본과 펼치기로 한 안쪽 배열을 돌며 HasProperty로 구멍을 건너뛰고, 남은 깊이가 있을 때만 IsArray 요소를 펼친다.
- **for...of**: 배열 이터레이터의 next는 호출할 때마다 length를 다시 읽는다(뒤 장 개념이라 링크로만 다룬다).

#### 확인 질문
1. 예제 1(push)만으로 "forEach는 시작할 때 배열을 복사해 돈다"는 모델을 배제할 수 없는 이유는? 그 모델을 배제하는 예제는?
   <details><summary>답</summary>복사 모델도 push한 3·4를 방문하지 않으므로 출력이 같다(`[1,2] [1,2,3,4]`). 예제 2(pop 뒤 끝 인덱스를 건너뜀)와 예제 3(map이 첫 콜백이 대입한 30을 읽음)이 배제한다. 근거: `content.mdx` 동작 원리 첫 h3, concept.test "예제의 증거 범위".</details>
2. `[1,2,3,4]`를 forEach로 돌다가 x가 1일 때 shift하면 방문한 값은? 값 2를 방문하지 않는 정확한 이유는?
   <details><summary>답</summary>`[1,3,4]`. 값 2는 인덱스 0으로 옮겨지는데, 인덱스 0은 지금 콜백이 실행 중인 인덱스이고 그 Get은 콜백을 부르기 전에 끝났다. 그래서 다시 읽지 않는다. 3과 4는 한 칸 앞 인덱스(1, 2)에서 방문한다. 근거: 첫 문단, concept.test 탐침.</details>
3. "고정한 길이와 지금 length 중 작은 쪽까지만 돌고 HasProperty는 확인하지 않는다"는 모델을 예제 1~3으로 배제할 수 없는 이유는? 어떤 경우에 실제와 갈리는가?
   <details><summary>답</summary>pop·shift는 끝 인덱스만 지우므로 그 자리는 length 밖이 되고, 작은 쪽까지만 도는 모델도 거기서 멈춘다. length가 그대로인 가운데 구멍에서 갈린다. `[1, , 3]`의 forEach는 콜백을 2번만 부르는데(함정 예제 7), 그 모델은 3번 부른다. 근거: `content.mdx` 한계 문단, 모델 대조 테스트.</details>
4. 시뮬레이터 단계가 실제 명세 순서와 맞는지 테스트는 어떻게 확인하는가? 콜백이 실행되는 동안 기록을 끄지 않으면 무엇이 깨지는가?
   <details><summary>답</summary>Proxy로 메서드 안의 length·has·get 접근을 기록해 시나리오 확인 단계의 k·check·read와 비교한다. 기록을 끄지 않으면 콜백 안의 push·pop·shift가 일으키는 내부 접근(length 읽기·쓰기, 인덱스 get)까지 섞인다. 그러면 "length 호출당 1회" 단언과 순서 비교가 깨진다. 근거: `concept.test.ts` `traceExample`.</details>
5. 같은 `pop` 뒤의 끝 인덱스를 forEach는 건너뛰고 find는 undefined로 읽는 차이는 어디서 오는가?
   <details><summary>답</summary>forEach는 Get 전에 HasProperty로 프로퍼티가 있는지 확인한다. FindViaPredicate는 확인 없이 Get을 하고, 프로퍼티가 없으면 Get은 undefined를 돌려준다. 두 메서드 모두 길이는 시작할 때 고정한다. 근거: 동작 원리 4번째 h3, 예제 5.</details>
