# 내장 생성자 상속(Array 하위 클래스) 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-26
- 기준: `main` @ `8affe20`

## 0. 요약
- 목적: "Array를 상속한 클래스의 map은 왜 하위 클래스를 돌려줄까"를 묻는 `array-subclass` 페이지를 추가한다(order 273, 학습 순서 44번째/82, ecmascript, category objects). 명세의 ArraySpeciesCreate, `get Array[%Symbol.species%]`, Array 생성자(NewTarget), Array.from·of의 this 사용으로 하위 클래스 인스턴스가 진짜 배열인 이유, 결과 배열의 생성자를 얻는 곳, 생성자에 넘기는 인수, species를 쓰지 않는 경로를 Node 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 6개, 퀴즈 6개, 결과 표, 생성 경로 표, 흔한 오해 2개, 시뮬레이터 없음)를 추가하고 class-inheritance·array-higher-order-functions·array-method-pitfalls·symbol의 simplifications를 Array로 한정해 연결한다. 44번째 이후 순위 +1 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: "결과 클래스는 원본이 만들어진 클래스로 정해진다", "species를 바꾸면 그 클래스의 모든 생성이 바뀐다", "map은 원본 생성자 인수를 다시 넘긴다", "부모 생성자를 부르면 배열이 된다" 같은 틀린 모델을 심거나, 뒷장 개념(심벌 300·이터러블 310·스프레드 320)을 예제 문법으로 전제할 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: MEDIUM 3·LOW 11, Critic REVISE: HIGH 1·MEDIUM 7·LOW 7. 메인이 모두 실행으로 재확인해 반영했다. 스프레드를 예제·표에서 빼고, 예제 2·4·5·6을 바꾸고, 문구를 8절에 확정했다)
- 미확정: 없음

## 1. 요구사항
- 로드맵(`.claude/plans/concept-roadmap-extras-5.md` 3번): 제목 "내장 생성자 상속: Array를 상속한 클래스의 map은 왜 하위 클래스를 돌려줄까", 25장(map·filter는 27장), order 273(`array-higher-order-functions` 272와 `number-pitfalls` 275 사이), ecmascript, 표 + 퀴즈. 계획 때 할 것: ArraySpeciesCreate(constructor 프로퍼티와 Symbol.species를 읽음)와 map 등이 그것을 부르는 단계로 설명, Array.from·Array.of가 this를 생성자로 쓰는 것은 species와 다른 경로임을 구분, Promise·Map·RegExp의 species는 다루지 않고 연결 여부를 정함.
- 사용자 선택(2026-11-26): 핵심(map·filter·slice·concat이 하위 클래스를 돌려줌, 호출한 배열의 constructor 프로퍼티를 읽음, `static get [Symbol.species]`로 바꾸기, Array.from·of는 this를 씀, Array.isArray true) + 옛 상속 방식과 비교 + 생성자 시그니처 함정 + species를 쓰지 않는 경로. 시각화는 로드맵대로 표 + 퀴즈.
  - "species를 쓰지 않는 경로"는 Array.from·of(this)로 보이고, concat은 species를 쓰되 인수가 아니라 호출한 배열에서 얻는다는 대비로 보인다. 스프레드(35장, order 320)는 질문 때 "링크로만"이라 밝힌 대로 예제·표에 쓰지 않고 본문 링크와 simplifications로만 가리킨다(Critic HIGH, Architect MEDIUM).
- 유지할 것(다시 쓰지 않고 링크): class-inheritance의 "파생 클래스 생성자는 객체를 만들지 않고 super()가 끝나야 this가 생긴다"(`app/concepts/class-inheritance/content.mdx:16-18`)와 기본 생성자(`:22-26`), class-accessors의 static 접근자가 클래스 함수 객체에 있고 클래스 쪽 체인으로 상속된다는 서술(`app/concepts/class-accessors/content.mdx:37-39`), array-index-length의 `Array(...values)` 인수 규칙과 `new Array(3)`·`Array.of(3)` 차이(`app/concepts/array-index-length/content.mdx:48-50`), prototype-chain의 Object.create(`app/concepts/prototype-chain/content.mdx:118-120`)와 instanceof(`:124-126`), array-higher-order-functions의 map·filter 방문 규칙.
- 로드맵 행의 `new MyArr(3).length` 3·`MyArr.of(3).length` 1은 새 예제로 만들지 않는다. 같은 규칙(Number 하나면 length)을 array-index-length가 다루므로 ④ 절에서 링크로 가리키고, 그 규칙이 예제 5(map이 `new TodoList(3)`을 부름)를 설명하는 데 쓰인다(Architect·Critic LOW).
- 제외: Error·Map·Set·Promise·RegExp·TypedArray 상속과 그 species, 다른 realm의 Array(ArraySpeciesCreate의 realm 단계), species 생성자가 배열이 아닌 것을 돌려주는 경우, 배열 메서드를 유사 배열에 빌려 쓰는 경우(IsArray false 분기는 알고리즘 설명에만 한 줄), ES2023의 toSorted·toReversed·toSpliced·with(simplifications에만, concept.test로 확인), 스프레드(simplifications·링크로만), Reflect.construct, 오류 메시지 문구, 예제 5를 고치는 별도 코드(본문은 예제 3의 species 재정의를 가리키기만 한다).

## 2. 사실과 추정
### 사실 (코드·명세·실행에서 확인)
- 명세(ECMAScript 초안 tc39.es/ecma262 단일 페이지, 사본 scratchpad `full.html`; id 존재 확인. Architect·Critic이 사본과 대조):
  - ArraySpeciesCreate(originalArray, length)(`sec-arrayspeciescreate`): IsArray(originalArray)가 false면 ArrayCreate(length). ctor = Get(originalArray, "constructor"). IsConstructor(ctor)이면 realm 단계(다른 realm의 %Array%면 undefined). ctor가 Object면 ctor = Get(ctor, %Symbol.species%), null이면 undefined. undefined면 ArrayCreate(length). IsConstructor(ctor)가 false면 TypeError. Construct(ctor, «𝔽(length)»). NOTE: 생성자가 Array를 돌려주도록 강제하지 않는다.
  - `get Array[%Symbol.species%]`(`sec-get-array-%symbol.species%`, URL에는 `%25symbol.species%25`; iterable-for-of `meta.ts:165` 선례): this 값을 돌려준다. NOTE: 하위 클래스가 %Symbol.species%를 다시 정의해 기본 동작을 바꿀 수 있다.
  - ArraySpeciesCreate의 length 인수: map은 원본 길이, filter 0, slice count(max(final - k, 0)), splice actualDeleteCount, concat 0(`sec-array.prototype.concat`: obj = ToObject(this), ArraySpeciesCreate(obj, 0), obj를 items 앞에 붙여 순회 — concat도 species를 쓰고 그 생성자는 호출한 배열에서 얻는다), flat 0, flatMap 0. map·filter는 CreateDataPropertyOrThrow로 요소를 넣고(배열이면 length가 늘어남), slice는 끝에 length를 Set한다.
  - toSorted·with는 ArrayCreate(length)를 쓴다(species 아님).
  - Array.from(`sec-array.from`): ctor = this. items에 %Symbol.iterator% 메서드가 있으면 IsConstructor(ctor)일 때 Construct(ctor)(인수 없음), 없으면 유사 배열로 보고 Construct(ctor, «len»). 끝에 Set(array, "length").
  - Array.of(`sec-array.of`): ctor = this, IsConstructor면 Construct(ctor, «len»), 끝에 Set "length".
  - Array(...values)(`sec-array`): NewTarget이 undefined면 newTarget = 활성 함수(Array). GetPrototypeFromConstructor(newTarget, "%Array.prototype%") → ArrayCreate(…, proto). 인수가 Number 하나면 length. 그래서 `Array.call(this)`는 Array.prototype을 가진 새 배열을 만들어 돌려줄 뿐 this를 바꾸지 않는다.
  - Array.prototype.push(`sec-array.prototype.push`): 범용. LengthOfArrayLike(O)로 길이를 읽고 요소를 Set한 뒤 Set(O, "length", len)한다. `Array.prototype`은 자기 데이터 프로퍼티 length 0을 가진다(Architect 실행 `true 0`). 그래서 옛 방식 객체의 length 2는 push가 만든 일반 데이터 프로퍼티다.
- 예제 실행(Node v24.22.3, `runInNewContext` + `util.format`, scratchpad `as/ex/*.js`가 8절 원문과 같음, `as/run.mjs`). 모든 예제는 파일 첫 줄에 `'use strict';`를 붙여도 출력이 같다.
  - species-basic.js → `true`, `true`, `MyArr`, `true`, `true`
  - constructor-property.js → `true`, `false`, `true`, `false true`
  - species-override.js → `true`, `false`, `false`, `true`, `true`
  - old-vs-class.js → `old true false 2`, `class true true 6`
  - constructor-signature.js → `work`, `3`, `0`, `["a","c"] 2`, `2`
  - receiver-and-this.js → `true`, `false`, `false`, `true`
- 틀린 모델(scratchpad `as/models3.mjs`, 예제 원문을 명시 치환(횟수 1 단언)해 실제 실행. 출력은 정답과도 서로와도 다름):
  - 예제 1: A "배열 메서드는 늘 Array"(class에 species → Array) `true / false / Array / false / false`. B "콜백을 받는 메서드만"(slice·concat 결과를 `Array.from(…)`으로) `true / true / MyArr / false / false`. C "of는 Array의 메서드라 늘 Array"(`MyArr.of(`→`Array.of(`) `false / false / Array / false / false`.
  - 예제 2: A "원본 프로토타입으로"(두 map 결과를 `Object.setPrototypeOf(…, Object.getPrototypeOf(원본))`으로) `false / true / true / false true`. B "늘 Array"(두 map 결과를 `Array.from(…)`으로) `false / false / true / false true`. C "하위 클래스마다 자기 species"(class 뒤 `Object.defineProperty(MyArr, Symbol.species, { value: MyArr });`) `true / false / true / true true`. D "species는 직접 정의해야"(species → undefined인 getter) `false / false / false / true true`(퀴즈에는 쓰지 않음).
  - 예제 3: A "species가 모든 생성을 바꾼다"(`Plain.of(`·`Plain.from(`·`new Plain()`을 Array로) `false / false / false / false / false`. B "species 무시"(getter 제거) `true / true / true / true / true`. C "species가 from·of까지"(of·from만 Array로) `false / false / false / false / true`.
  - 예제 4: A "class도 옛 방식과 같다"(class 줄을 옛 방식 코드로) `old true false 2 / class true false 2`. B "부모 생성자를 불렀으니 배열"(`const old = new OldArr();`→`const old = Reflect.construct(Array, [], OldArr);`) `old true true 6 / class true true 6`. C "instanceof Array는 진짜 배열만"(첫 출력의 `old instanceof Array`→`Array.isArray(old)`) `old false false 2 / class true true 6`.
  - 예제 5: A "원본 생성자 인수를 다시 넘긴다"(species가 `super('work')` 하위 클래스) `work / work / work / ["a","c"] 2 / work`. B "인수 없이 부른다"(`super()`) `work / undefined / undefined / ["a","c"] 2 / undefined`. C "결과 길이를 넘긴다"(map·rest·slice의 name 읽기를 `new TodoList(<결과>.length).name`으로) `work / 3 / 2 / ["a","c"] 2 / 2`.
  - 예제 6: A "인수에 하위 클래스가 있으면 결과도"(`[0].concat(mine)`·`Array.from(mine)`을 `MyArr.from(…)`으로) `true / true / true / true`. B "concat은 species를 안 쓴다"(`mine.concat([0])`→`Array.from(mine.concat([0]))`) `false / false / false / true`. C "Array.from이 원본 클래스를 유지"(`Array.from(mine)`→`MyArr.from(mine)`) `true / false / true / true`.
  - 옛 방식 생성자 본문을 `Array.call(this);` 없이 빈 함수로 해도 출력은 같다(Architect 실행). 그래서 예제 4는 "Array를 부르기만 하면 된다"는 모델도 배제한다.
- 생성 경로 표(탐침 `sp1.cjs`·`sp2.cjs`, Architect·Critic 재실행, 생성자 인수를 기록하는 하위 클래스): 행마다 새 `a = Log.of(1, 2, 3)` 기준 map `[3]`, filter `[0]`, slice(1) `[2]`, concat `[0]`, flat `[0]`, flatMap `[0]`, splice(0, 2) `[2]`, `Log.of(7, 8)` `[2]`, `Log.from({ length: 2 })` `[2]`, `Log.from([1, 2])` `[]`, `Array.from(a)`는 Log를 부르지 않음. species가 undefined·null이면 Array, 1이면 TypeError, constructor 프로퍼티가 undefined면 Array.
- 겹침(`grep -rni "species|extends Array|내장 생성자|내장 객체|상속한 클래스"`, 걸린 절을 읽음):
  - simplifications로 미룬 곳: `class-inheritance/meta.ts:107`, `array-higher-order-functions/meta.ts:101`, `array-method-pitfalls/meta.ts:102`, `symbol/meta.ts:104` → 연결(Array로 한정). `set-map/meta.ts:107`(Map·Set 서브클래싱), `promise/meta.ts:111`(Promise 서브클래싱), `match-all/meta.ts:90`(RegExp의 SpeciesConstructor) → 이 페이지가 다루지 않으므로 연결하지 않는다.
  - 본문: `array-higher-order-functions/content.mdx:22,24`가 `ArraySpeciesCreate(obj, length)`·`(obj, 0)`을 "보통의 배열이면"으로 한정해 쓴다(링크는 9절 후보). `structured-clone/content.mdx:23`은 복제 시 서브클래스 인스턴스 문제라 주제가 달라 연결하지 않는다. new-operator의 "내장 생성자"는 new 유무 맥락이라 무관.
- 장 범위와 order: 25장(클래스 상속)·27장(배열). order 273은 44번째/82. 선수 개념 slug: prototype-chain 170, class-inheritance 240, class-accessors 245, arrow-functions 250, array-index-length 260, array-higher-order-functions 272(모두 273보다 작음). 뒤 개념 symbol 300(심벌·well-known 심벌), iterable-for-of 310(Array.from의 이터러블 분기), spread-destructuring 320(스프레드)은 prerequisites에 넣지 않고 related·본문 링크·simplifications로만(Critic LOW: 학습 순서 모순). class-accessors simplifications(`meta.ts:105`)가 계산된 이름·심벌 키 접근자를 미뤘으므로 `static get [Symbol.species]()` 문법은 이 페이지에서 짧게 설명한다. 예제가 쓰는 hasOwnProperty·Object.create·화살표 함수·JSON.stringify는 선행 범위 안(Critic 확인; JSON.stringify는 다른 앞 페이지 예제에서도 출력용으로 쓴다).
- 순서 테스트(현재 81개, 새 개념 44번째, 44 이상 +1): `app/lib/concepts.test.ts:104,111-112`(81→82), `app/components/concept/ConceptPager.test.tsx:18,28`(`/ 81`→`/ 82`), `tests/e2e/responsive.spec.ts:1884`(article 81→82), `tests/e2e/navigation.spec.ts:94,102,160`(카드 82, `82번째`), 같은 파일 115-135 "객체" 순위(43 이하 그대로, 53·54·56·57·68·76 → 54·55·57·58·69·77), 186-이후 `학습 순서 N / 81`(N≤43 그대로, N≥44면 N+1, 분모 82), 361-383의 array-higher-order-functions 다음 링크와 number-pitfalls 이전 링크를 `/concepts/array-subclass`로, 그 사이에 새 블록(44 / 82, 이전 array-higher-order-functions, 다음 number-pitfalls). build-output의 pager 검사는 동적이라 그대로(Architect). "객체" 검색 결과 수 19 유지(새 meta의 title·summary·tags에 "객체"를 넣지 않음, filterConcepts는 title·summary·tags만 검색 `app/lib/concepts.ts:91-100`).
- 등록 선례(switch-let 8affe20): `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/navigation.spec.ts`, `tests/build/build-output.test.ts`('프리렌더 (switch-let)' 블록), `docs/content-guide.md:225` 경로 목록, route.tsx(switch-let과 같음). 퀴즈 파싱과 모델 실행은 `app/concepts/switch-let/concept.test.ts`(MODELS·rep·runModel).
- 표 파서: 결과 표의 행 형식(`예제 N: …` + `결과` 열, ` / `로 이음)은 `tests/result-tables.test.ts`가 expectedOutput과 대조한다. 생성 경로 표는 첫 칸이 예제 꼴이 아니라 위반이 아니며 `tableBody`(`tests/helpers/expression-tables.ts:9`)로 읽는다. 표 칸에 `<`는 없다.

### 추정
- 없음

## 3. 구현 전략
- switch-let과 같은 구성(동작 원리 → 예제 → 결과와 이유: 결과 표·예제별 이유·생성 경로 표·흔한 오해 2개)으로 쓰고, 공통 코드는 바꾸지 않는다.
- 결과 생성 규칙은 명세 ArraySpeciesCreate 단계 순서로 설명한다. 예제 2가 "원본 프로토타입"·"하위 클래스마다 자기 species" 모델을, 예제 3이 "species가 모든 생성을 바꾼다" 모델을, 예제 4가 "부모 생성자를 부르면 배열" 모델을, 예제 5가 "인수 복사·결과 길이" 모델을, 예제 6이 "인수 쪽 클래스를 따른다" 모델을 배제하게 설계했다.
- 예제의 인스턴스 생성은 `MyArr.of`(array-index-length 260이 다룸)로 하고, `Array.from`은 this 경로가 요점인 예제 3·6과 표에만 남긴다(Architect LOW: 이터러블 전제 축소).
- 표는 JSX `<table>`(region 래퍼), 칸은 `<code>{'…'}</code>`. 생성 경로 표의 칸은 concept.test가 행마다 새 컨텍스트에서 실행해 생성자 인수·결과를 대조한다.
- 버린 대안: 시뮬레이터(단계가 짧아 표로 충분, 로드맵 결정), 생성자 인수를 rest·spread로 기록하는 독자용 예제(스프레드가 35장이라 예제 5의 `name` 프로퍼티로 간접 관찰), 스프레드를 예제·표에 넣기(같은 이유), toSorted 계열을 본문에 넣기(책 범위 밖).

## 4. 변경 파일
- 추가: `app/concepts/array-subclass/{meta.ts, content.mdx, route.tsx, concept.test.ts, examples/*.js 6개}`.
- 수정(연결): class-inheritance·array-higher-order-functions·array-method-pitfalls·symbol의 `meta.ts` simplifications 한 문장과 related에 `array-subclass`. 네 페이지 reviewedAt은 그대로.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/{navigation,responsive,a11y}.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`.
- 계획·로드맵: 이 문서, finalize 때 `.claude/plans/concept-roadmap-extras-5.md` 3번 행 상태와 진행 기록.
- 변경하지 않음: set-map·promise·match-all·structured-clone(이 페이지가 다루지 않는 하위 주제), 공통 코드.

## 5. 위험 요소
- 결과 클래스를 "원본이 만들어진 클래스"로 설명 → 예제 2(constructor 프로퍼티 바꾸기)와 흔한 오해 1(작업 2).
- species 재정의가 from·of·new까지 바꾼다고 오해 → 예제 3 넷째·다섯째 줄과 흔한 오해 2(작업 2).
- concat을 "species를 쓰지 않는 경로"로 읽힘 → ⑤ 절을 "species를 쓰지 않는 경로(from·of)"와 "species를 쓰지만 호출한 배열에서 얻는 경우(concat)"로 나누고, 예제 6 이름을 receiver-and-this로(Architect·Critic MEDIUM).
- 옛 방식 length 2를 "반쯤 배열"로 오해 → ① 절에 push가 만든 일반 데이터 프로퍼티라는 문장(Critic MEDIUM, Architect LOW: Array.prototype.length 0을 읽음).
- "map은 결과 길이를 넘긴다"(filter도) → 예제 5 셋째 줄 `0`, 요소가 정상이라는 주장은 넷째 줄 출력으로 뒷받침.
- 뒷장 전제 → 스프레드는 예제·표에 쓰지 않음, 심벌·이터러블은 링크와 simplifications.
- 표 칸 주장 → concept.test가 행마다 실행 대조(작업 3). splice가 a를 바꾸므로 표 위에 "행마다 새 a"를 쓰고 splice 행을 메서드 행의 끝에 둔다.
- 44번째 이후 순위 +1 누락 → 작업 4 완료 조건 grep.
- 다른 페이지 연결 문장이 다루지 않는 범위(Map·Promise species)를 보증 → 네 문장을 Array로 한정(작업 4).

## 6. 검증 방법
- 정적: AGENTS.md 검증 순서(lint → format:check → typecheck → npm test → test:build → e2e). 공통 코드를 바꾸지 않으므로 e2e는 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "array-subclass|내장 생성자 상속|홈 학습 순서 보기"`.
- 브라우저(dev, 새 폴더라 서버 재시작): `/concepts/array-subclass`에서 학습 순서 44 / 82·이전 array-higher-order-functions·다음 number-pitfalls, 결과 표 6행·생성 경로 표 11행, 퀴즈 6개 중 2개(예제 2·5) 정답 선택 피드백, 375px 가로 넘침 없음, 콘솔 오류 없음, 연결한 네 페이지의 새 문구 렌더.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 폴더 골격, 예제, meta
- 대상: `examples/*.js` 6개, `meta.ts`, `route.tsx`, `content.mdx` 골격(필수 h2 `동작 원리`·`예제`·`결과와 이유`만, 예제 코드 블록 6개 `file=`)
- 예제 원문(scratchpad `as/ex/`와 같게):
  - 1 species-basic.js
    ```js
    class MyArr extends Array {}
    const nums = MyArr.of(1, 2, 3);
    console.log(nums instanceof MyArr);
    console.log(nums.map((x) => x * 2) instanceof MyArr);
    console.log(nums.filter((x) => x > 1).constructor.name);
    console.log(nums.slice(1) instanceof MyArr);
    console.log(nums.concat([4]) instanceof MyArr);
    ```
  - 2 constructor-property.js
    ```js
    class MyArr extends Array {}
    const plain = [1, 2];
    plain.constructor = MyArr;
    console.log(plain.map((x) => x) instanceof MyArr);
    const mine = MyArr.of(1, 2);
    mine.constructor = Array;
    console.log(mine.map((x) => x) instanceof MyArr);
    console.log(MyArr[Symbol.species] === MyArr);
    console.log(MyArr.hasOwnProperty(Symbol.species), Array.hasOwnProperty(Symbol.species));
    ```
  - 3 species-override.js
    ```js
    class Plain extends Array {
      static get [Symbol.species]() {
        return Array;
      }
    }
    const list = Plain.of(1, 2, 3);
    console.log(list instanceof Plain);
    console.log(list.map((x) => x) instanceof Plain);
    console.log(list.filter((x) => x > 1) instanceof Plain);
    console.log(Plain.from(list) instanceof Plain);
    console.log(new Plain() instanceof Plain);
    ```
  - 4 old-vs-class.js
    ```js
    function OldArr() {
      Array.call(this);
    }
    OldArr.prototype = Object.create(Array.prototype);
    OldArr.prototype.constructor = OldArr;
    const old = new OldArr();
    old.push('a', 'b');
    old[5] = 'f';
    console.log('old', old instanceof Array, Array.isArray(old), old.length);

    class NewArr extends Array {}
    const neu = new NewArr();
    neu.push('a', 'b');
    neu[5] = 'f';
    console.log('class', neu instanceof Array, Array.isArray(neu), neu.length);
    ```
  - 5 constructor-signature.js
    ```js
    class TodoList extends Array {
      constructor(name) {
        super();
        this.name = name;
      }
    }
    const todos = new TodoList('work');
    todos.push('a', 'b', 'c');
    console.log(todos.name);
    console.log(todos.map((x) => x.toUpperCase()).name);
    const rest = todos.filter((x) => x !== 'b');
    console.log(rest.name);
    console.log(JSON.stringify(rest), rest.length);
    console.log(todos.slice(1).name);
    ```
  - 6 receiver-and-this.js
    ```js
    class MyArr extends Array {}
    const mine = MyArr.of(1, 2);
    console.log(mine.concat([0]) instanceof MyArr);
    console.log([0].concat(mine) instanceof MyArr);
    console.log(Array.from(mine) instanceof MyArr);
    console.log(MyArr.from([0]) instanceof MyArr);
    ```
- meta:
  - slug `array-subclass`, title `내장 생성자 상속: Array를 상속한 클래스의 map은 왜 하위 클래스를 돌려줄까`, category `objects`, order 273, reviewedAt null.
  - summary(160자, "객체" 없음): `Array를 상속한 클래스에서 map·filter·slice·concat은 호출한 배열의 constructor에서 Symbol.species로 얻은 생성자로 결과를 만들므로, species를 바꾸지 않으면 하위 클래스를 돌려줍니다. Array.from·of는 this를 생성자로 씁니다.`
  - tags: `Array`, `extends`, `하위 클래스`, `서브클래싱`, `Symbol.species`, `ArraySpeciesCreate`, `map`, `filter`, `slice`, `concat`, `Array.from`, `Array.of`, `Array.isArray`, `constructor`, `super`, `내장 생성자`, `배열 이그조틱`, `Object.create`.
  - goals:
    1. `Array를 상속한 클래스의 인스턴스에서 map·filter·slice·concat이 하위 클래스 인스턴스를 돌려준다는 것과 그 이유인 ArraySpeciesCreate의 단계를 설명할 수 있다.`
    2. `결과 배열의 생성자가 호출한 배열의 constructor 프로퍼티와 그 Symbol.species에서 정해지며, Array의 Symbol.species 접근자가 상속되어 this를 돌려준다는 것을 예측할 수 있다.`
    3. `static get [Symbol.species]로 배열 메서드의 결과만 바꿀 수 있고 Array.from·Array.of·new는 그대로라는 것을 구분할 수 있다.`
    4. `배열 메서드가 생성자에 길이 인수 하나만 넘기므로 생성자의 매개변수를 바꾼 하위 클래스에서 어떤 값이 들어가는지 예측할 수 있다.`
    5. `class extends Array로 만든 인스턴스는 Array.isArray가 true인 진짜 배열이고, Object.create(Array.prototype)로 이은 옛 방식은 그렇지 않다는 것을 설명할 수 있다.`
  - prerequisites(slug, 모두 order < 273): `{ label: '프로토타입 체인', slug: 'prototype-chain' }`, `{ label: '클래스 상속과 super', slug: 'class-inheritance' }`, `{ label: '클래스 접근자', slug: 'class-accessors' }`, `{ label: '화살표 함수', slug: 'arrow-functions' }`, `{ label: '배열의 인덱스와 length', slug: 'array-index-length' }`, `{ label: '배열 고차 함수', slug: 'array-higher-order-functions' }` (label은 각 페이지 제목 앞부분과 맞게 구현 때 조정).
  - related: `symbol`, `iterable-for-of`, `spread-destructuring`, `class-basics`, `new-operator`, `array-method-pitfalls`.
  - simplifications:
    1. `예제는 Node vm에서 strict mode가 아닌 스크립트로 실행했고 console은 ECMAScript가 아니라 호스트가 제공하는 API입니다. 모든 예제는 파일 첫 줄에 'use strict';를 붙여도 출력이 같습니다.`
    2. `Symbol.species는 well-known 심벌이고 심벌 자체는 심벌 개념에서 다룹니다. 여기서는 static get [Symbol.species]()가 계산된 이름으로 클래스에 정적 접근자를 정의한다는 것만 씁니다.`
    3. `Array.from이 인수를 순회할 수 있으면 생성자를 인수 없이 부르고 그렇지 않으면 길이로 부르는 구분은 이터러블과 for...of 개념에서 다루는 이터러블에 따른 것입니다. 스프레드 문법([...a])으로 만든 배열은 species를 쓰지 않고 늘 Array이며 스프레드와 디스트럭처링 개념에서 다룹니다.`
    4. `ArraySpeciesCreate의 다른 realm 단계, species 생성자가 배열이 아닌 것을 돌려주는 경우, 배열 메서드를 배열이 아닌 값에 빌려 쓰는 경우(IsArray가 false이면 늘 Array)는 다루지 않습니다.`
    5. `ES2023의 toSorted·toReversed·toSpliced·with는 species를 쓰지 않고 늘 Array를 만들며 다루지 않습니다.`
    6. `Error·Map·Set·Promise·RegExp 같은 다른 내장 생성자의 상속과 species, Reflect.construct는 다루지 않습니다.`
  - references: 명세 `sec-arrayspeciescreate`(ArraySpeciesCreate), `sec-get-array-%25symbol.species%25`(get Array [ %Symbol.species% ]), `sec-array.prototype.map`, `sec-array.prototype.concat`, `sec-array.from`, `sec-array.of`, `sec-array`(Array ( ...values )), `sec-array-exotic-objects`(Array Exotic Objects), MDN `Global_Objects/Symbol/species`, `Global_Objects/Array/Array`(또는 Classes/extends). 모두 `https://tc39.es/ecma262/#` 접두.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과(골격의 필수 h2·route 포함), 예제 파일이 scratchpad `as/ex/`와 `cmp`로 같음.

### 2. 본문
- 대상: `content.mdx`
- 첫 문단: `class MyArr extends Array {}`의 map이 MyArr를 돌려주는 이유를 묻고, 이 페이지가 하위 클래스 인스턴스가 진짜 배열인 이유와 배열 메서드가 결과의 생성자를 고르는 규칙을 다룬다고 쓴다.
- 동작 원리 ### (핵심 문장):
  - ① `class extends Array의 인스턴스는 진짜 배열이다`: 파생 클래스 생성자는 객체를 만들지 않고 super()가 부모를 부른다([클래스 상속과 super](/concepts/class-inheritance), 생성자를 생략하면 기본 생성자가 인수를 넘김). 부모가 Array이면 Array 생성자가 NewTarget(하위 클래스)의 prototype으로 배열 이그조틱 객체를 만든다. 옛 방식 `Object.create(Array.prototype)`([프로토타입 체인](/concepts/prototype-chain))은 new가 일반 객체를 만들고, 생성자 안의 `Array.call(this)`는 NewTarget이 없어 Array.prototype을 가진 새 배열을 따로 만들어 돌려줄 뿐 this를 바꾸지 않는다. instanceof는 프로토타입 체인만 보므로 둘 다 true이고, 진짜 배열인지는 Array.isArray와 인덱스 대입 뒤의 length로 드러난다. 옛 방식의 length 2는 범용 메서드 push가 Array.prototype에서 물려받은 length 0을 읽고 자기 프로퍼티 length를 써 넣은 결과라, 인덱스 5에 대입해도 바뀌지 않는다(예제 4).
  - ② `결과 배열의 생성자는 호출한 배열에서 얻는다`: map·filter·slice·splice·concat·flat·flatMap은 ArraySpeciesCreate로 결과를 만든다. 단계: 호출한 값이 배열이 아니면 Array → `constructor` 프로퍼티를 읽음 → 객체면 그 `Symbol.species`를 읽음(null이면 undefined) → undefined면 Array → 생성자가 아니면 TypeError → 그 생성자를 길이 인수 하나로 new. 그래서 결과를 정하는 것은 원본이 어떤 클래스로 만들어졌는지가 아니라 지금 읽히는 `constructor` 프로퍼티다(예제 1·2).
  - ③ `Array의 Symbol.species는 this를 돌려준다`: Array에는 정적 접근자 `get [Symbol.species]`가 있고 this를 돌려준다. MyArr에는 자기 Symbol.species가 없고 클래스 쪽 체인(MyArr의 [[Prototype]]이 Array)에서 이 접근자를 찾으며, 이때 this는 MyArr라 MyArr를 돌려준다([클래스 접근자](/concepts/class-accessors)의 static 접근자). 하위 클래스가 `static get [Symbol.species]() { return Array; }`를 정의하면 배열 메서드의 결과만 Array가 된다(예제 2 넷째 줄, 예제 3). 심벌은 [심벌](/concepts/symbol)에서 다룹니다.
  - ④ `생성자에는 길이 인수 하나만 넘긴다`: map은 원본 길이, filter·concat·flat·flatMap은 0, slice는 잘라 낼 개수, splice는 지운 개수를 넘기고, 요소는 그 뒤 메서드가 하나씩 넣는다. Array 생성자는 Number 하나를 받으면 그 수를 length로 쓴다([배열의 인덱스와 length](/concepts/array-index-length)). 생성자의 첫 매개변수를 다른 뜻으로 바꾼 하위 클래스는 그 자리에 이 수를 받는다(예제 5). 생성자를 바꾸지 않으려면 예제 3처럼 species를 Array로 돌려주는 방법이 있다.
  - ⑤ `species를 쓰지 않는 경로와 호출한 배열을 따르는 concat`: Array.from·Array.of는 species가 아니라 this(호출한 생성자)로 만든다. `Array.from(mine)`은 this가 Array라 Array이고 `MyArr.from([0])`은 MyArr다. concat은 species를 쓰지만 생성자를 인수가 아니라 호출한 배열에서 얻으므로 `[0].concat(mine)`은 Array다(예제 6). 스프레드 문법으로 만든 배열은 늘 Array이며 [스프레드와 디스트럭처링](/concepts/spread-destructuring)에서 다룹니다.
  - ⑥ `예제가 쓰는 도구`: vm·console 호스트, `MyArr.of`로 만드는 이유(array-index-length), hasOwnProperty는 자기 프로퍼티인지 확인.
- 예제 6개 + 퀴즈 6개. 선택지는 정답 + 2절 모델 A·B·C 출력(예제 2는 A·B·C), 순서와 answer는 아래(0부터):
  - 퀴즈 1 `예제 1의 출력은 무엇일까요?` choices `['true / false / Array / false / false', 'true / true / MyArr / false / false', 'false / false / Array / false / false', 'true / true / MyArr / true / true']` answer 3.
  - 퀴즈 2 `예제 2의 출력은 무엇일까요?` choices `['true / false / true / false true', 'false / true / true / false true', 'false / false / true / false true', 'true / false / true / true true']` answer 0.
  - 퀴즈 3 `예제 3의 출력은 무엇일까요?` choices `['false / false / false / false / false', 'true / false / false / true / true', 'true / true / true / true / true', 'false / false / false / false / true']` answer 1.
  - 퀴즈 4 `예제 4의 출력은 무엇일까요?` choices `['old true false 2 / class true false 2', 'old true true 6 / class true true 6', 'old true false 2 / class true true 6', 'old false false 2 / class true true 6']` answer 2.
  - 퀴즈 5 `예제 5의 출력은 무엇일까요?` choices `['work / work / work / ["a","c"] 2 / work', 'work / undefined / undefined / ["a","c"] 2 / undefined', 'work / 3 / 2 / ["a","c"] 2 / 2', 'work / 3 / 0 / ["a","c"] 2 / 2']` answer 3.
  - 퀴즈 6 `예제 6의 출력은 무엇일까요?` choices `['true / true / true / true', 'true / false / false / true', 'false / false / false / true', 'true / false / true / true']` answer 1.
  - 각 explanation은 정답 이유 + 오답마다 어느 모델인지 한 문장씩(모델 이름은 2절). 따옴표가 든 선택지(퀴즈 5)는 MDX 속성에서 깨지지 않게 JSX 배열 문자열로 쓴다.
- 결과와 이유:
  - 결과 표(행 형식, 열 `예제`·`결과`): `예제 1: 메서드의 결과 클래스` … `예제 6: 호출한 배열과 this`.
  - 예제별 h3(핵심 증거 줄):
    - 예제 1: 둘째·넷째·다섯째 줄 true와 셋째 줄 MyArr가 "늘 Array"를, 넷째·다섯째 줄이 "콜백 메서드만"을 배제.
    - 예제 2: 첫 줄(평범한 배열인데 MyArr)·둘째 줄(MyArr 인스턴스인데 Array)이 "원본 프로토타입" 모델을 배제. 셋째 줄만으로는 "하위 클래스마다 자기 species"를 가리지 못하고, 넷째 줄 `false true`가 접근자가 Array에만 있고 상속된다는 증거.
    - 예제 3: 넷째·다섯째 줄 true가 species는 배열 메서드의 결과에만 쓰인다는 증거.
    - 예제 4: 두 줄 모두 instanceof true라 instanceof로는 구별되지 않고, Array.isArray와 length(2 대 6)가 증거. Array.call(this)를 불러도 old가 배열이 아니다.
    - 예제 5: 둘째 줄 3(원본 길이), 셋째 줄 0(결과 길이 2가 아님), 다섯째 줄 2(slice 개수). 넷째 줄은 생성자가 수를 버려도 요소와 length는 메서드가 채운다는 증거.
    - 예제 6: 첫·둘째 줄의 차이가 호출한 배열을 따른다는 증거, 셋째·넷째 줄이 from은 this를 쓴다는 증거.
  - 생성 경로 표 `aria-label="생성 경로 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"`, 표 위 문장 "`a`는 행마다 새로 만든 `MyArr.of(1, 2, 3)`입니다." 열 `호출`·`생성자를 얻는 곳`·`생성자에 넘기는 인수`·`결과가 MyArr인가`. 행(11):
    1. `a.map((x) => x)` / `a.constructor[Symbol.species]` / `3` / 예
    2. `a.filter((x) => x > 1)` / `a.constructor[Symbol.species]` / `0` / 예
    3. `a.slice(1)` / `a.constructor[Symbol.species]` / `2` / 예
    4. `a.concat([4])` / `a.constructor[Symbol.species]` / `0` / 예
    5. `a.flat()` / `a.constructor[Symbol.species]` / `0` / 예
    6. `a.flatMap((x) => [x])` / `a.constructor[Symbol.species]` / `0` / 예
    7. `a.splice(0, 2)` / `a.constructor[Symbol.species]` / `2` / 예
    8. `MyArr.of(7, 8)` / this(`MyArr`) / `2` / 예
    9. `MyArr.from({ length: 2 })` / this(`MyArr`) / `2` / 예
    10. `MyArr.from([1, 2])` / this(`MyArr`) / 인수 없음 / 예
    11. `Array.from(a)` / this(`Array`) / MyArr를 부르지 않음 / 아니요
    - 표 아래: 9·10행의 차이는 인수를 순회할 수 있는지에 따른 것이고 [이터러블과 for...of](/concepts/iterable-for-of)에서 다룹니다.
  - 흔한 오해:
    1. 제목 `map 결과의 클래스는 원본이 만들어진 클래스로 정해진다`: 예제 2의 첫 두 줄로 반박. 결과는 지금 읽히는 constructor 프로퍼티와 그 Symbol.species로 정해진다.
    2. 제목 `Symbol.species를 Array로 바꾸면 그 클래스는 자기 인스턴스를 만들지 못한다`: 예제 3의 첫째·넷째·다섯째 줄로 반박. species는 배열 메서드가 결과를 만들 때만 읽는다.
- 완료 조건: `npx vitest run tests/result-tables.test.ts tests/content-integrity.test.ts` 통과, 본문에 "테스트"·`eval` 없음, 스프레드 문법이 코드 블록·표에 없음.

### 3. concept.test와 빌드 등록
- 대상: `concept.test.ts`, `tests/build/build-output.test.ts`
- 변경:
  - strict 접두 실행(모두 expectedOutput과 같음).
  - 모델 실행(2절 전부, rep 횟수 1 단언, 출력 하드코딩, 정답과 다름, 퀴즈 오답 선택지 집합이 사용한 모델 출력 집합과 같음, 변환 없이 실행하면 expectedOutput과 같음). 예제 4의 `Array.call(this)`를 지운 소스도 같은 출력임을 단언.
  - 퀴즈 choices·answer가 8절 목록과 같고 answer 선택지가 실제 출력과 같음, 선택지 중복 없음.
  - 생성 경로 표: `tableBody(mdx, [머리 4개])` 11행, 행마다 새 컨텍스트에서 `class MyArr extends Array { constructor(...args) { record(args); super(...args); } }`(테스트 코드라 스프레드 허용)로 `a = MyArr.of(1, 2, 3)`을 만든 뒤 기록을 비우고 호출 칸을 실행해, 기록된 인수(없음·숫자·부르지 않음)와 결과 instanceof를 칸과 대조. 생성자를 얻는 곳 칸은 행 종류(species/this)와 대조.
  - ② 단계 주장: species가 undefined·null이면 Array, 1이면 TypeError, 인스턴스의 constructor가 undefined면 Array.
  - 4절 제외 주장: toSorted·toReversed·toSpliced·with 결과가 MyArr가 아님, 스프레드 결과가 MyArr가 아님(simplifications 근거).
  - meta: summary ≤ 160, slug 선수 개념 order < 273, `filterConcepts([concept], '객체')` 빈 배열, 예제 파일에 `eval`·`...`(스프레드) 없음.
  - 본문 필수 문구(① push 문장, ② 단계, ⑤ concat 문장).
  - build-output '프리렌더 (array-subclass)' 블록: 두 표 region, 퀴즈 `<details>` 6개와 정답 문자열.
- 완료 조건: 퀴즈 answer·표 칸을 바꾸면 실패(변이 검사 후 원복), `npm test` 통과.

### 4. 연결과 순서 테스트
- 대상: 네 페이지 meta, 순서 테스트 묶음, content-guide, e2e 등록.
- 변경:
  - class-inheritance 107 → `'\`Array\` 상속과 배열 메서드가 쓰는 \`Symbol.species\`는 내장 생성자 상속 개념에서 다루고, \`Error\` 같은 다른 내장 객체 상속과 그 species, mixin, \`Reflect.construct\`는 다루지 않습니다.'`
  - array-higher-order-functions 101 → `'\`thisArg\`, 유사 배열에 빌려 쓰는 범용성은 다루지 않습니다. 하위 클래스 배열에서 \`Symbol.species\`와 ArraySpeciesCreate가 하는 일은 내장 생성자 상속 개념에서 다룹니다.'`
  - array-method-pitfalls 102 첫 문장 → `'Symbol.species와 ArraySpeciesCreate에 따른 하위 클래스 배열의 동작은 내장 생성자 상속 개념에서 다루고, 배열 메서드를 유사 배열에 빌려 쓰는 경우는 다루지 않습니다.'`(뒤 두 문장 유지)
  - symbol 104 → `'배열 메서드가 쓰는 Array의 Symbol.species는 내장 생성자 상속 개념에서 다루고, 다른 생성자의 Symbol.species와 Symbol.hasInstance, Symbol.match 같은 다른 well-known 심벌은 이름만 언급하고 다루지 않습니다.'`
  - 네 페이지 related에 `array-subclass`.
  - 순서 테스트는 2절 목록대로. e2e helpers `ARRAY_SUBCLASS_PATH = '/concepts/array-subclass'`, a11y '개념 페이지: 내장 생성자 상속', responsive 가로 스크롤(두 표 region), navigation 새 pager 블록. content-guide 경로 목록에 `array-subclass`.
- 완료 조건: 순서 관련 파일에서 `grep -nE "/ 81|81번째|toHaveCount\(81\)|toBe\(81\)"` 0건, navigation e2e 통과, 연결 문장의 하위 주제가 새 본문에 실제로 있음.

### 5. 전체 검증
- AGENTS.md 검증 순서 + 6절 e2e + 브라우저 시나리오.

## 9. 추가 개선 후보
- array-higher-order-functions 본문 22줄의 "보통의 배열이면 그 길이의 새 배열" 뒤에 새 페이지 링크를 거는 것(필수 규칙은 아니어서 이번 범위에서 뺌).
- 예제 4에 `Array.isArray(old.map((x) => x))`(true)를 더해 ArraySpeciesCreate의 IsArray false 분기를 출력으로 보이는 것.

## 변경 이력

- 2026-11-26 (리뷰 지적, Opus 명세 교차 검토 MEDIUM 4·LOW 5): 요구사항 범위 안의 문구·예제 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3·4.
  - 예제 3의 `Plain.from(list)`를 `Plain.from([1, 2])`로 바꾼다. `list`가 Plain 인스턴스라 "from은 인수의 constructor로 만든다" 모델과 출력이 같았다. 출력·모델 출력은 그대로(`true / false / false / true / true`).
  - ① `Array.call(this)`가 this를 바꾸지 않는 원인을 NewTarget 부재가 아니라 "Array는 this를 쓰지 않고 늘 새 배열을 만든다"로, NewTarget 부재는 새 배열의 프로토타입(Array.prototype)에만 연결. 옛 방식 length가 안 바뀌는 이유를 "그냥 데이터 프로퍼티"(진짜 배열의 length도 데이터 프로퍼티라 오해 유발)가 아니라 "일반 객체라 배열의 [[DefineOwnProperty]]가 없음"으로.
  - 예제 5의 넷째 줄 이유: "요소와 length는 메서드가 채운다"(filter·map은 length를 Set하지 않음)를 "요소는 메서드가 넣고, 결과가 배열이라 length가 따라 늘어난다"로(퀴즈 5 해설 포함).
  - ⑤ Array.from·of는 this가 생성자일 때만 그 생성자, 아니면 보통의 Array(concept.test 단언 추가). ⑥ 절 방향("아래"→"위"와 절 제목), hasOwnProperty "이름"→"키". 예제 2 셋째·넷째 줄 해석을 "Array에만"이 아니라 "MyArr가 아니라 Array의 자기 프로퍼티이고 상속해 this를 돌려받음"으로(퀴즈 2 해설 포함).
  - Error에는 species가 없으므로 class-inheritance·이 페이지 simplifications의 "다른 내장 객체 상속과 그 species"를 "다른 내장 객체 상속, Map·Promise 같은 다른 생성자의 species"로 나눔.
- 2026-11-26 (사용자 전달 외부 검토 3건): 요구사항 범위 안의 문구 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3. 근거는 Node 실행(scratchpad `rv.cjs`)과 MDN Symbol.species 문서 원문.
  - 1(중간, species를 함정 해법으로 제시): 반영. species를 Array로 돌려줘도 `TodoList.of('a','b').name` 2, `TodoList.from(['a']).name` undefined(실행). ④와 예제 5 이유를 "배열 메서드에 한한 방법이고 of·from은 여전히 이 생성자를 부른다"로 고치고, 생성자를 생략하고 이름은 정적 메서드에서 정하는 대안(실행 확인: 넘기는 수가 이름 자리에 들어가지 않고 결과 배열에는 이름이 없음)을 쓴다. MDN 경고(임의 코드 실행·보안 취약점·최적화, 엔진 구현자들의 제거 검토, 의존을 피하라)를 본문 ④와 simplifications에 MDN의 말로 밝힌다. "생성자를 바꾸지 않으려면" 모호 문구 제거.
  - 2(중간, constructor는 보통 상속 프로퍼티): 반영. `mine.hasOwnProperty('constructor')` false, `MyArr.prototype.hasOwnProperty('constructor')` true, `Object.setPrototypeOf([1, 2], MyArr.prototype).map(…) instanceof MyArr` true(실행). ②에 상속 문장과 예제 2 대입이 가린다는 문장, 예제 2 이유·퀴즈 2 해설을 "원본의 [[Prototype]]을 직접 보는" 모델로 바꾸고 프로토타입은 constructor를 찾는 경로라 간접 영향이라고 쓴다.
  - 3(낮음, 용어): 반영. "호출한 배열 = 메서드의 this 값" 정의, IsArray false·species undefined·from·of 비생성자 경로를 "생성자를 부르지 않고 보통 배열을 바로 만든다(ArrayCreate)"로.
  - concept.test에 위 실행 사실 단언 5개 추가(constructor 상속, setPrototypeOf, species+of·from, 정적 메서드 대안, 본문·simplifications의 한계·MDN 문장).
- 2026-11-26 (사용자 전달 추가 검토 3건, 문구): 예제 5 이유의 "(④ 절)"을 절 이름 참조로(본문에 원문자 번호가 없음), "길이나 인수 없이"를 "길이 하나를 넘기거나 인수 없이"로, 본문 ④의 MDN 경고 전문을 "MDN도 권하지 않습니다(아래 \"이 글에서 단순화한 부분\")"로 줄이고 전문은 simplifications에만 둔다. concept.test 필수 문구 갱신.

## 구현 진행

- baseline (2026-11-26, `8affe20`): lint·format:check·typecheck 통과, npm test 195파일 6532개 통과, test:build 642개 통과. e2e는 기준 실행 생략(직전 커밋 8affe20에서 navigation 16개·관련 8개 통과).
- [x] 1. 폴더 골격, 예제, meta — Sonnet 구현. 예제 6개가 scratchpad `as/ex/`와 `cmp` 동일, prerequisites label은 대상 페이지 제목 앞부분(클래스의 getter와 setter, 화살표 함수와 메서드 축약, 배열은 객체다 등). examples·content-integrity·result-tables 통과.
- [x] 2. 본문 — Sonnet 구현, 메인 정독 후 직접 수정 4건: ⑥의 "Array.of가 this를 쓰는 것은 배열은 객체다에서 본 대로"(그 페이지는 다루지 않음)를 `new Array(3)`·`Array.of(3)` 차이로 바꿈, 퀴즈 3 해설·예제 3 이유의 "`new Plain()`도 this로 만든다"를 "Plain 생성자를 직접 불러"로 바꿈, ③의 예제 참조 위치(예제 2 셋째·넷째 줄은 상속 문장 뒤로), ①의 push 문장 다듬기. 결과 표 aria-label은 switch-let 선례대로 "예제 결과 표"라 responsive e2e 이름을 맞춤. 표 위에 "생성자를 기록하는 하위 클래스로 실행해 확인한 값" 한 문장 추가(3단계가 대조).
- [x] 4. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(네 페이지 simplifications가 8절 문구와 같고 related 추가, 81→82, 순위 44 이상 +1, 새 pager 블록, a11y·responsive·helpers·content-guide 등록). `grep -nE "/ 81|81번째|toHaveCount\(81\)|toBe\(81\)"` 0건, concepts.test·ConceptPager.test 통과, typecheck·lint 통과.
- [x] 3. concept.test와 빌드 등록 — Sonnet 구현(75개: 예제 조건, strict 접두, 모델 A·B·C·D 실행, 퀴즈 choices·answer `[3,0,1,2,3,1]`, 결과 표, 생성 경로 표 11행을 행마다 새 vm에서 생성자 인수 기록으로 대조, ArraySpeciesCreate 단계(species undefined·null → Array, 1 → TypeError, constructor undefined → Array), toSorted 계열·스프레드가 MyArr가 아님, meta·필수 문구). 변이 검사(퀴즈 1 answer, map 행 인수) 실패 확인 후 원복. build-output '프리렌더 (array-subclass)' 블록.
- [x] 5. 전체 검증 (2026-11-26) — lint·format:check·typecheck 통과, npm test 196파일 6632개 통과(baseline 6532), test:build 649개 통과(baseline 642), e2e navigation 16개·관련 8개 통과.
  - navigation e2e 첫 실행에서 "객체" 순위 목록 2건 실패: 4단계 에이전트가 바꿨다고 보고했지만 파일은 그대로였다. 메인이 53·54·56·57·68·76 → 54·55·57·58·69·77로 직접 고쳐 16개 통과.
  - 브라우저(사용자 dev 5173은 새 폴더 이전에 시작돼 500이라 건드리지 않고, 임시 launch 설정으로 5174에서 확인 후 설정 원복): 학습 순서 44 / 82·이전 array-higher-order-functions·다음 number-pitfalls, 표 6행·11행, 퀴즈 6개(예제 2·5 정답 "정답입니다."), 콘솔 오류 없음. 375px에서 생성 경로 표 코드 칸이 글자 단위로 끊겨 선례(array-method-pitfalls 등)대로 table에 `[&_code]:whitespace-nowrap`를 붙임 → 코드 칸 온전, 표만 region 안에서 가로 스크롤(725/343), 페이지 가로 넘침 0. 수정 후 format·개념 테스트·test:build 649·관련 e2e 8개 재통과.
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토, 2026-11-26): 메인 리뷰는 Critical/High 없음(concept.test의 모델·퀴즈·표 대조, build-output 블록, 연결 문장 확인; 구현 중 발견한 4건은 단계 2 기록). Opus HIGH 0·MEDIUM 4·LOW 5 → 프로젝트 기준(명세와 다른 설명은 결과가 맞아도 심각도 높음)에 따라 MEDIUM 4·LOW 4 반영(변경 이력), 메인이 직접 수정.
  - 고치지 않고 남긴 Low: `app/concepts/array-higher-order-functions/content.mdx:22,24` 본문의 ArraySpeciesCreate 문장에 새 페이지 링크(9절 후보, 사용자 판단).
  - 재검증(리뷰 수정 후): lint·format:check·typecheck 통과, npm test 196파일 6633개(⑤ this 비생성자 단언 1개 추가), test:build 649개, e2e navigation 16개·관련 8개 통과. 예제 3 파일이 scratchpad 원본과 `cmp` 동일, 재시작한 dev(5173)에서 바뀐 문구 렌더 확인.
  - 고치지 않고 남긴 Medium/Low: 위 Low 1건(링크 후보)뿐.
- 외부 검토 반영(2026-11-26, 변경 이력 참고): 3건 모두 반영. 재검증: lint·format:check·typecheck 통과, npm test 196파일 6638개(새 단언 5개 포함), test:build 649개, e2e navigation 16개·관련 8개 통과, dev(5173)에서 새 문구 렌더 확인.
- 추가 검토 반영(2026-11-26): 개념 테스트 1339개(관련 3파일), format:check·lint·typecheck, test:build 649개 통과, dev(5173) 렌더 확인. 본문만 바뀌어 e2e는 직전 통과로 갈음.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(ecmascript 예제 6개·퀴즈 6개·결과 표·생성 경로 표 11행·흔한 오해 2개, 시뮬레이터 없음, order 273·학습 순서 44/82, category objects, 네 페이지 simplifications 연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것:
  - 구현 중 메인 확인: array-index-length가 다루지 않는 내용을 "거기서 본 대로"라 쓴 문장, `new Plain()`도 this 경로라고 쓴 문장을 고치고, 375px에서 생성 경로 표 코드 칸에 `[&_code]:whitespace-nowrap`를 붙였다. "객체" 순위 목록은 에이전트 보고와 달리 빠져 있어 메인이 고쳤다.
  - Opus 리뷰: 예제 3을 `Plain.from([1, 2])`로 바꾸고, `Array.call(this)`·옛 방식 length·filter 결과 length의 인과, from·of의 비생성자 this, Error species 문구를 고쳤다.
  - 사용자 전달 검토 두 차례: species 재정의의 한계(of·from은 그대로)·정적 메서드 대안·MDN 경고, constructor가 상속 프로퍼티라는 설명, "호출한 배열 = this 값" 정의와 "생성자 호출 없이 보통 배열" 용어, 절 참조와 MDN 문장 중복을 고쳤다.
  - reviewedAt은 사용자 결정으로 2026-11-26을 기록했고, 연결한 네 페이지는 그대로 뒀다. array-higher-order-functions 본문 링크는 사용자 결정으로 걸지 않았다.

### 코드 리뷰
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토): 메인 Critical/High 없음, Opus MEDIUM 4·LOW 4 반영. 사용자 전달 검토(중간 2·낮음 1, 추가 낮음 3)도 모두 반영했다.
- 고치지 않고 남긴 항목: array-higher-order-functions 본문 22·24줄의 새 페이지 링크(사용자 결정으로 보류).

### 후속 작업
- [ ] (선택) array-higher-order-functions 본문 22·24줄의 ArraySpeciesCreate 문장에 내장 생성자 상속 링크 걸기.
- [ ] 로드맵 5의 다음 개념(4번 에러 객체)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 3의 넷째 줄을 `Plain.from(list)`에서 `Plain.from([1, 2])`로 바꿨다 — `list`가 Plain 인스턴스라 "from은 인수의 constructor로 만든다"는 틀린 모델도 true를 냈다. 평범한 배열을 넘겨야 this 경로의 증거가 된다(Opus 지적).
- [Claude 판단] 옛 방식에서 length가 안 바뀌는 이유를 "그냥 데이터 프로퍼티"가 아니라 "일반 객체라 배열의 [[DefineOwnProperty]]가 없다"로 썼다 — 진짜 배열의 length도 데이터 프로퍼티라 앞 설명은 오개념을 심는다. `Array.call(this)`가 this를 바꾸지 않는 이유도 NewTarget 부재가 아니라 Array가 this를 쓰지 않기 때문으로 고쳤다.
- [Claude 판단] 생성 경로 표의 코드 칸을 줄바꿈하지 않게 해 표만 region 안에서 가로 스크롤되게 했다 — 375px에서 `a.map((x) => x)`가 글자 단위로 끊겼다. array-method-pitfalls 등 기존 표와 같은 방식.
- [무검토 승인] 예제 4의 옛 방식 생성자에 `Array.call(this)`를 넣었다 — 없으면 "Array를 부르지 않았으니 당연히 배열이 아니다"라는 반론이 남는다. 불러도 결과가 같아 "부모 생성자를 부르면 배열" 모델을 배제한다(Architect 제안).
- [무검토 승인] concat을 "species를 쓰지 않는 경로"에서 빼고 "species를 쓰되 호출한 배열에서 얻는다"로 분리했다(예제 6 receiver-and-this) — concat도 ArraySpeciesCreate(obj, 0)를 부른다.
- [무검토 승인] 생성자에 넘기는 인수를 rest·spread로 기록하는 대신 예제 5의 `name` 프로퍼티로 간접 관찰했다 — 스프레드가 35장이라 장 범위 밖이다. 대신 concept.test가 인수 기록 하위 클래스로 표 11행을 대조한다.
- 다룰 범위(옛 상속 방식, 생성자 시그니처 함정, species를 쓰지 않는 경로), species 재정의의 한계와 MDN 경고, constructor 상속 설명, 용어 정의 — 사용자가 고르거나 검토로 고쳤다.

#### 배경지식
- ArraySpeciesCreate(originalArray, length): IsArray가 false면 ArrayCreate → `constructor`를 Get(보통 프로토타입에서 상속) → 객체면 그 `%Symbol.species%`를 Get, null이면 undefined → undefined면 ArrayCreate → 생성자가 아니면 TypeError → `Construct(ctor, «length»)`. map은 원본 길이, filter·concat·flat·flatMap은 0, slice는 개수, splice는 지운 개수를 넘긴다.
- `get Array[%Symbol.species%]`는 this를 돌려주고, 클래스 쪽 체인(MyArr의 [[Prototype]]이 Array)으로 상속되어 MyArr에서 읽으면 MyArr다.
- Array 생성자는 NewTarget의 prototype으로 배열 이그조틱 객체를 만들고 this를 쓰지 않는다. 파생 클래스는 super()가 부모 생성자를 불러 this를 얻으므로 class extends Array 인스턴스는 진짜 배열이다.
- Array.from·of는 this가 생성자면 그 생성자로(from은 이터러블이면 인수 없이, 유사 배열이면 길이로, of는 개수로) 만들고, 아니면 ArrayCreate로 만든다. species는 읽지 않는다.

#### 확인 질문
1. 예제 2에서 평범한 배열 `[1, 2]`의 `constructor`를 `MyArr`로 바꾸면 map 결과가 MyArr인 이유를 ArraySpeciesCreate 단계로 설명하면?
   <details><summary>답</summary>map은 호출한 배열(this)의 `constructor`를 읽는다. 자기 프로퍼티로 MyArr를 넣었으니 MyArr를 얻고, 객체이므로 `MyArr[Symbol.species]`를 읽는데 Array의 정적 접근자를 상속해 this인 MyArr를 돌려준다. 그래서 `new MyArr(2)`로 결과를 만든다(content.mdx 결과 배열의 생성자 절, 예제 2).</details>
2. 예제 3의 넷째 줄을 `Plain.from(list)`로 두면 어떤 틀린 모델을 배제하지 못하는가?
   <details><summary>답</summary>"Array.from은 인수의 constructor로 만든다" 모델. `list`가 Plain 인스턴스라 그 모델도 true를 낸다. 평범한 배열 `[1, 2]`를 넘겨야 this(Plain)로 만든다는 증거가 된다(변경 이력, Opus 지적).</details>
3. 옛 방식 생성자에서 `Array.call(this)`를 불러도 `old`가 배열이 아닌 이유는? NewTarget을 넘기면 달라지는가?
   <details><summary>답</summary>Array는 받은 this를 쓰지 않고 늘 새 배열을 만들어 돌려주며, 그 배열은 버려진다. NewTarget은 새 배열의 프로토타입만 정하므로 넘겨도 this는 그대로 일반 객체다(content.mdx ① 절, Opus 탐침).</details>
4. 예제 5의 TodoList에 species를 Array로 돌려주는 getter만 더하면 함정이 모두 사라지는가?
   <details><summary>답</summary>아니다. 배열 메서드는 species로 얻은 Array를 부르지만 `TodoList.of('a','b')`는 this인 TodoList를 길이 2로, `TodoList.from(['a'])`는 인수 없이 불러 name이 2·undefined가 된다(content.mdx ④ 절, concept.test 단언).</details>
5. `[0].concat(mine)`이 Array인 이유는 concat이 species를 쓰지 않아서인가?
   <details><summary>답</summary>아니다. concat도 ArraySpeciesCreate(obj, 0)를 부르지만 obj는 호출한 배열 `[0]`이라 그 constructor인 Array에서 species를 얻는다. 인수 쪽 mine은 보지 않는다(예제 6, content.mdx ⑤ 절).</details>

