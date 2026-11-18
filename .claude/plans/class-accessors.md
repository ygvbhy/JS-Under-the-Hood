# 클래스의 getter와 setter 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-18
- 기준: `main` @ `61a70d0`

## 0. 요약
- 목적: "대입했는데 왜 자기 프로퍼티가 생기지 않을까"를 질문으로 하는 `class-accessors` 페이지를 추가한다(order 245, 학습 순서 33번째/67). 중심은 클래스의 `get`·`set`이 프로토타입(또는 클래스 자체)의 접근자 프로퍼티라는 것과, 상속·필드·`super`·private에서 대입이 어디로 가는지다.
- 범위: 새 개념 폴더(ecmascript 예제 9개, 정리 표 1개, 퀴즈 9개, 시뮬레이터 없음), 기존 2개 페이지(class-basics, class-inheritance)의 "다루지 않는다" 문구, 33번째 이후 순위 +1 테스트와 e2e·빌드 테스트 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: 대입·필드·`super`의 결과를 "복사"·"덮어쓴다"로 설명하거나, 명세에 규정이 없는 호출 깊이 한계(RangeError)를 언어 동작처럼 쓰는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → HIGH 3건 모두 반영, 메인이 실행·원문으로 재확인)
- 미확정: 2건 (기본안 있음)

## 1. 요구사항

- 사용자 결정(2026-11-18)
  - 추가 게시글 로드맵 2의 2번. 범위는 "클래스와 상속의 접근자"(로드맵 결정). 접근자 프로퍼티 전반은 `property-attributes`가, 객체 리터럴의 상속된 setter는 `prototype-chain`이 이미 다룬다.
  - 핵심 4개: 프로토타입에 생기는 접근자와 `this`, getter만 오버라이드하면 대입 실패, `super.v`로 부모 접근자 부르기, 서브클래스 필드가 상속된 접근자를 가림.
  - 추가 4개(모두 선택): 필드는 setter를 부르지 않음, 부모 생성자의 대입이 자식 setter를 호출, static·private 접근자, setter 안의 `this.v = x`.
  - 시각화: 표 + 퀴즈(시뮬레이터 없음).
  - slug `class-accessors`, 제목 "클래스의 getter와 setter: 대입했는데 왜 자기 프로퍼티가 생기지 않을까".
- 새 페이지
  - `app/concepts/class-accessors/`, category `objects`(class-basics·class-inheritance와 같은 그룹), order 245(class-inheritance 240과 arrow-functions 250 사이), `reviewedAt: null`.
  - prerequisites: 클래스 상속과 super(`class-inheritance`), 프로퍼티 어트리뷰트와 접근자(`property-attributes`), 프로토타입 체인(`prototype-chain`), this(`this-binding`).
  - 첫 문단의 답(고정 내용, 명세 근거)
    - 클래스 본문의 `get v() {}`·`set v(x) {}`는 인스턴스가 아니라 `클래스.prototype`에 접근자 프로퍼티를 정의한다(ClassElementEvaluation → MethodDefinitionEvaluation, 열거 불가·설정 가능).
    - 디스크립터 필드는 본문에서 `get`·`set` 필드 이름으로만 부른다. 명세 이름이 필요하면 현행 초안의 `[[Getter]]`·`[[Setter]]`로 쓴다. 내부 메서드 `[[Get]]`·`[[Set]]`(대입·읽기)과 섞이지 않게 한다(property-attributes `content.mdx:14`의 방식과 같다).
    - `a.v = 5`는 `a`에 `v`가 없으므로 프로토타입 체인에서 접근자를 찾고 그 setter를 `a`를 this로 호출한다(OrdinarySet → OrdinarySetWithOwnDescriptor). 데이터 프로퍼티를 만드는 단계에 가지 않으므로 `a`에 `v`가 생기지 않는다.
  - 다룰 것(예제 번호)
    1. 클래스 접근자는 `prototype`의 열거 불가 접근자다. setter는 대입한 객체(receiver)를 this로 호출되므로 인스턴스마다 자기 프로퍼티(`_c` 등)를 바꾼다(예제 1).
    2. 같은 클래스의 `get v`와 `set v`는 한 프로퍼티로 합쳐진다. getter 정의의 디스크립터에는 `set` 필드가 없어서, 이미 있는 프로퍼티에 정의하면 기존 `set`이 유지된다(ValidateAndApplyPropertyDescriptor는 디스크립터에 있는 필드만 갱신한다). 서브클래스가 `get v`만 정의하면 `서브.prototype`에 `set`이 `undefined`인 새 접근자가 생기고(없는 프로퍼티를 새로 만들 때 빠진 필드는 기본값 `undefined`), 대입은 체인에서 이것을 먼저 만나 실패한다. 부모의 setter까지 가지 않는다. 클래스 밖의 sloppy 코드에서는 무시, 클래스 안(항상 strict)에서는 TypeError(예제 2). 반대로 `set v`만 다시 정의하면 읽기가 `undefined`라는 한 문장을 더한다(concept.test 탐침, 실행 `undefined 10`). 이 규칙의 일반형(상속된 접근자에 setter가 없으면 대입 실패)은 prototype-chain을 링크로 전제하고, 새 내용은 "서브클래스가 get만 쓰면 그 상황이 생긴다"로 한정한다.
    3. `super.v`는 HomeObject의 `[[Prototype]]`에서 `v`를 찾아 getter를 지금의 this로 호출한다. `super.v = x`는 부모 setter를 지금의 this로 호출한다(MakeSuperPropertyReference, GetValue/PutValue). 부모 쪽에서 setter가 있는 접근자를 찾는 경우만 다룬다(예제 3).
    4. 클래스 필드는 대입이 아니라 정의다. 필드 초기화는 DefineField → CreateDataPropertyOrThrow로 인스턴스에 데이터 프로퍼티를 만들고 `[[Set]]`을 거치지 않는다. 서브클래스의 필드 `v = 2`는 부모 setter를 부르지 않고 인스턴스에 자기 프로퍼티를 만들어 상속된 접근자를 가린다(예제 4). 같은 클래스에 `set v`가 있어도 필드 `v = 1`은 setter를 부르지 않는다. 생성자 안의 `this.v = 1`은 대입이라 setter를 부른다(예제 5).
    5. 부모 생성자 안의 `this.v = 1`은 대입이므로 `this`(파생 인스턴스)의 체인에서 자식 클래스의 setter를 찾아 호출한다. 이때 자식의 필드는 아직 초기화되지 않았다(class-inheritance 필드 초기화 순서와 연결)(예제 6).
    6. `static get`·`static set`은 클래스 자체(생성자 함수)의 자기 프로퍼티다. 인스턴스에서는 읽히지 않는다. 서브클래스는 생성자 쪽 체인으로 상속받고(class-inheritance의 두 체인), `Sub.count = 7`은 부모의 static setter를 `Sub`를 this로 호출한다. setter 안의 `this._n = x`는 체인에서 부모의 쓰기 가능한 데이터 프로퍼티 `_n`을 만나므로 `Sub`에 자기 프로퍼티를 만든다(prototype-chain의 섀도잉 규칙, 링크). 그래서 부모의 `count`는 그대로다(예제 7).
    7. private 접근자(`get #v`·`set #v`)는 프로토타입 체인으로 찾지 않는다. 인스턴스 `p`에서는 읽히지만, `p`를 프로토타입으로 삼은 `Object.create(p)`나 `클래스.prototype`에서 읽으면 TypeError다. 명세는 private 메서드·접근자를 인스턴스의 private 요소 목록에 더하는 것으로 설명한다(InitializeInstanceElements → PrivateMethodOrAccessorAdd). 다만 명세 NOTE가 이는 설명을 위한 방식이고 구현은 다르게 할 수 있으며 함수는 인스턴스끼리 공유된다고 밝히므로, "인스턴스마다 접근자 함수가 생긴다"로 쓰지 않는다. setter만 있는 private 접근자를 읽으면 TypeError다(PrivateGet). setter만 있는 public 접근자를 읽으면 `undefined`인 것과 다르다. getter만 있는 private 접근자에 쓰면 TypeError(PrivateSet)라는 것은 본문 한 문장 + concept.test 탐침으로 둔다(클래스 안의 public도 strict라 TypeError이므로 대비 증거가 아니다)(예제 8).
    8. setter 안에서 같은 이름에 대입(`this.v = x`)하면 그 대입이 다시 같은 setter를 호출한다. 예제는 멈춤 조건을 둬서 호출 횟수(3)로 보인다. 멈춤 조건이 없으면 명세의 알고리즘으로는 호출이 끝없이 이어지고, 명세에는 호출 깊이 한계에 대한 규정이 없다. 실제로는 Node(V8)에서 RangeError로 끝난다(엔진 동작으로 밝히고, Chromium·다른 엔진은 쓰지 않는다). 실용적 결론은 값을 다른 이름(`_c`, 예제 1)이나 private 필드에 저장하는 것이다(예제 9).
  - 다루지 않고 밝힐 것(simplifications)
    - 객체 리터럴의 `get`·`set`과 `Object.defineProperty`의 접근자(property-attributes), 객체 리터럴의 상속된 setter(prototype-chain).
    - 부모 쪽에서 setter가 있는 접근자를 찾지 못할 때의 `super.v = x`(결과가 경우마다 다르다 — 탐침: 부모 쪽에 `v`가 없으면 this에 자기 프로퍼티가 생기고, getter만 있으면 TypeError. 본문에는 쓰지 않고 "다루지 않는다"고만 쓴다).
    - 계산된 이름의 접근자(`get [key]()`), 심벌 키 접근자, `static` 블록, static private 요소(필드·접근자) 전반(서브클래스를 this로 읽으면 TypeError가 되는 경우 포함), `#v in obj`.
    - private 요소 목록은 명세가 설명을 위해 둔 방식이고 엔진 구현이 아니라는 것(ClassDefinitionEvaluation·PrivateMethodOrAccessorAdd의 NOTE).
    - 접근자와 데이터 프로퍼티를 같은 클래스에서 같은 이름으로 정의할 때(메서드 `v()`와 `get v`)의 덮어쓰기.
    - 데코레이터, `accessor` 키워드(제안 단계).
    - `JSON.stringify`·전개가 접근자 값을 담지 않는 것(필요하면 예제 1의 `Object.keys` 출력만으로 설명한다).

## 2. 사실과 추정

### 사실 (코드에서 확인)
- 탐침(2026-11-18, Node v24.22.3, 지시어 없는 CommonJS 파일 = sloppy)
  - `class Temp { constructor(c){this._c=c} get f(){return this._c*9/5+32} set f(v){this._c=(v-32)*5/9} }` → `new Temp(100)`의 `t.f`는 `212`, `Object.hasOwn(t,'f')` `false`, `Object.keys(t)` `["_c"]`. `t.f = 32` 뒤 `t._c` `0`, `Object.hasOwn(t,'f')` `false`, `'f' in t` `true`. `Temp.prototype`의 `f` 디스크립터: `typeof get/set` `function function`, `enumerable` `false`, `configurable` `true`, `'value' in d` `false`.
  - getter만 오버라이드: `class A { constructor(){this._v=1} get v(){return this._v} set v(x){this._v=x} } class B extends A { get v(){return this._v*10} }` → 클래스 밖 sloppy `b.v = 5` 뒤 `b.v` `10`, `b._v` `1`, `Object.hasOwn(b,'v')` `false`. `B.prototype`의 디스크립터 `set`은 `undefined`. B의 메서드 안에서 `this.v = 7` → `TypeError`.
  - `super`: `class C extends A { get v(){return super.v*10} set v(x){super.v = x+1} }` → `c.v = 4` 뒤 `c.v` `50`, `c._v` `5`, `Object.hasOwn(c,'v')` `false`.
  - 서브클래스 필드: `class D extends A { v = 2 }` → `d.v` `2`, `d._v` `1`, `Object.hasOwn(d,'v')` `true`, 디스크립터 `{"value":2,"writable":true,"enumerable":true,"configurable":true}`.
  - 같은 클래스 필드: `class E { v = 1; set v(x){calls++} get v(){return 'getter'} }` → `e.v` `1`, `calls` `0`, `Object.hasOwn(e,'v')` `true`. 생성자 대입 `class F { constructor(){this.v=1} set v(x){calls++} }` → `calls` `1`, `Object.hasOwn(f,'v')` `false`.
  - 부모 생성자: `class Base { constructor(){this.v=1} } class Der extends Base { label='d'; set v(x){log('setter', x, this.label)} }` → `setter 1 undefined`(label이 아직 없음), 생성 뒤 `Object.hasOwn(der,'v')` `false`, `der.label` `d`.
  - static: `class S2 { static _n = 0; static get count(){return this._n} static set count(x){this._n=x} } class T2 extends S2 {}` → `T2.count = 7` 뒤 `S2.count` `0`, `T2.count` `7`, `Object.hasOwn(T2,'_n')` `true`. `Object.hasOwn(S,'count')` `true`, `Object.hasOwn(S.prototype,'count')` `false`, `new S().count` `undefined`. (private static `#n`을 쓰면 `T.count`가 TypeError — 다루지 않음)
  - private: `class P { #c=0; get #v(){return this.#c} set #w(x){this.#c=x} … }` → setter만 있는 `#w` 읽기 `TypeError`, getter만 있는 `#v` 쓰기 `TypeError`. setter만 있는 public `w`를 클래스 안에서 읽으면 `undefined`. `class P { #c = 7; get #v(){…} static read(o){ try { return o.#v } catch(e){ return e.name } } }` → `P.read(p)` `7`, `P.read(P.prototype)` `TypeError`, `P.read(Object.create(p))` `TypeError`(체인으로 찾지 않음). `Object.getOwnPropertyNames`는 문자열 키만 돌려주므로 private 이름은 어느 객체의 목록에도 나오지 않는다(위치의 증거가 아니다 — 검토 지적).
  - `super.v = x`(B의 setter 안): 부모 쪽에 `v`가 없으면 `Object.hasOwn(b,'v')` `true`, `b.v` `5`. 부모에 getter만 있으면 `TypeError`.
  - setter만 오버라이드: `class A3 { get v(){return this._v} set v(x){this._v=x} } class B3 extends A3 { set v(x){this._v=x*10} }` → `b3.v = 1` 뒤 `b3.v` `undefined`, `b3._v` `10`.
  - 재귀: `set v(x){ depth++; if (depth < 3) this.v = x; }` → `r.v = 1` 뒤 `depth` `3`, `Object.hasOwn(r,'v')` `false`. 멈춤 조건 없는 `set v(x){ this.v = x }` → `RangeError`.
  - 같은 클래스 `get v`만 있으면 디스크립터의 `set`은 `undefined`(`'set' in md` `true`).
- 기존 페이지
  - `app/concepts/class-basics/meta.ts:104`: "private 메서드, static 블록, `#x in obj` 검사, 필드 초기화 순서의 세부, 계산된 메서드 이름, getter와 setter는 다루지 않습니다." 본문(content.mdx)에는 getter·setter 언급이 없다.
  - `app/concepts/class-inheritance/meta.ts:107`: "객체 리터럴 메서드의 `super`(…), `super.x = 1` 같은 프로퍼티 대입, 화살표 함수 안의 `super`와 `this`, private 필드의 상속, 접근자 오버라이드는 다루지 않습니다."
  - `app/concepts/property-attributes/content.mdx:46-55`: 객체 리터럴의 접근자 절(읽을 때마다 호출, 디스크립터, set만 있으면 읽기 undefined, get만 있으면 대입 sloppy 무시·strict TypeError). `meta.ts:95`: 상속된 setter는 프로토타입 체인 개념에서 다룬다(실제로 다룸 — 아래).
  - `app/concepts/prototype-chain/content.mdx:52-58`: "상속된 읽기 전용 프로퍼티와 setter" 절(상속된 setter 호출·자기 프로퍼티 안 생김, getter만 있으면 대입 실패), 예제 7 `inherited-setter.js`. 바깥 변수만 쓴다(`meta.ts:116`: 상속된 getter·setter는 명세상 receiver를 this로 호출되지만 예제는 바깥 변수만).
  - `app/concepts/arrow-functions/meta.ts:97`의 "getter와 setter 축약"은 객체 리터럴 이야기라 이번 범위가 아니다(바꾸지 않는다).
- 순서와 테스트
  - 현재 66개. order 245는 33번째가 되고 arrow-functions(현재 33번째) 이후가 모두 +1이다.
  - `app/lib/concepts.test.ts:104,111,112`(66), `app/components/concept/ConceptPager.test.tsx:18,28`(`1 / 66`, `66 / 66`).
  - `tests/e2e/navigation.spec.ts`: `toHaveCount(66)` 2곳(85, 150), `66번째`(93), `학습 순서 N / 66` 40곳. class-inheritance 블록(236-248)의 다음 링크는 `/concepts/arrow-functions`, arrow-functions 블록(250-262)의 이전 링크는 `/concepts/class-inheritance`.
  - `tests/e2e/navigation.spec.ts:24,39,100,137`: '객체' 검색 18개(4곳). 검색은 title·summary·tags 부분 일치(`app/lib/concepts.ts`의 `filterConcepts`). 새 페이지는 title·summary·tags에 '객체'를 넣지 않으므로(작업 순서 1 meta 결정) 개수 18은 그대로다. 순위 배열(`:106-125`, `4,12,19,20,21,22,24,25,27,29,31,32,35,43,45,46,57,62`)은 33 이상인 값이 무조건 +1이 된다(`35,43,45,46,57,62` → `36,44,46,47,58,63`).
  - 검색 가드 선례: `app/concepts/dom-manipulation/concept.test.ts:186-191`(`filterConcepts([concept], '객체')`가 빈 배열, order 고정).
  - `tests/e2e/responsive.spec.ts:1646` `toHaveCount(66)`.
  - 표+퀴즈 개념(시뮬레이터 없음)의 등록 선례(string-replace-split): `tests/e2e/helpers.ts:133`(경로 상수), `a11y.spec.ts:852-857`(정답 확인 버튼 + axe), `responsive.spec.ts:1082`(가로 스크롤), `tests/build/build-output.test.ts:993-1005`(`<details>` 개수, 표 머리), `docs/content-guide.md:225` 목록.
  - 표 대조 헬퍼: `tests/helpers/expression-tables.ts:9`의 `tableBody(mdx, header)`(머리 행이 정확히 같은 표 1개의 본문 행), 선례 `app/concepts/strict-mode/concept.test.ts:34-38`.

- 명세(Architect가 tc39.es/ecma262 현행 초안 원문으로 확인): MethodDefinitionEvaluation의 getter 분기 디스크립터는 `{ [[Getter]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }`(setter 분기는 `[[Setter]]`), OrdinarySetWithOwnDescriptor는 `ownDesc.[[Setter]]`를 receiver를 this로 호출하고 undefined이면 false, DefineField → CreateDataPropertyOrThrow, MakeSuperPropertyReference의 base는 HomeObject의 `[[GetPrototypeOf]]()`, PrivateGet은 getter가 undefined이면 TypeError. 존재하는 id: `sec-static-semantics-classelementevaluation`(제목은 Runtime Semantics지만 id는 static), `sec-runtime-semantics-methoddefinitionevaluation`, `sec-definefield`, `sec-privateget`, `sec-privateset`, `sec-privatemethodoraccessoradd`, `sec-ordinarysetwithowndescriptor`, `sec-makesuperpropertyreference`, `sec-validateandapplypropertydescriptor`, `sec-runtime-semantics-classdefinitionevaluation`, `sec-createdatapropertyorthrow`. 명세 17절(Error Handling and Language Extensions)에 호출 깊이 한계 규정이 없다.

### 추정
- 없음. MDN ko URL의 존재는 작업 순서 1에서 응답 코드로 확인한다.

## 3. 구현 전략
- string-replace-split·class-basics(표+퀴즈, 시뮬레이터 없음)의 패턴을 따른다. 새 공통 코드는 만들지 않는다.
- 설명은 명세의 동작(어디에 정의되나, 대입이 체인에서 무엇을 먼저 만나나, 정의와 대입의 차이)으로 쓴다. "덮어쓴다"·"복사한다"는 쓰지 않는다. 서브클래스 getter는 부모 접근자를 바꾸지 않고 체인 앞쪽에 새 프로퍼티를 만든다고 쓴다.
- 예제마다 틀린 모델을 배제하는 출력을 넣는다.
  1. "대입하면 인스턴스에 v가 생긴다" → 예제 1의 `hasOwn` `false`. "setter가 프로토타입에 값을 저장한다" → 두 인스턴스의 값이 따로 바뀐다.
  2. "getter만 다시 정의하면 setter는 부모 것이 쓰인다" → 예제 2의 `_v`가 그대로.
  3. "`super.v`는 부모 프로토타입의 값/부모 프로토타입을 this로 한다" → 예제 3의 `_v`가 인스턴스에 반영.
  4. "필드는 생성자에서 `this.v = 2`를 실행하는 것과 같다" → 예제 4·5의 setter 호출 횟수 0과 `hasOwn` `true`(생성자 대입은 1과 `false`).
  5. "부모 생성자의 `this`는 부모 클래스의 객체라 자식 setter와 무관하다" → 예제 6의 자식 setter 출력.
  6. "static 접근자는 인스턴스에서도 읽힌다 / 서브클래스 대입은 부모의 값을 바꾼다" → 예제 7.
  7. "private 접근자도 프로토타입 체인으로 찾는다" → 예제 8의 `Object.create(p)`·`클래스.prototype`에서 읽기 TypeError(같은 줄의 `p`에서는 값). "setter만 있으면 private도 읽기가 undefined다" → 예제 8 둘째 줄(public `undefined`와 private `TypeError`). 원인이 다른 TypeError(요소를 못 찾음 / getter 칸이 없음)는 줄을 나눈다.
  8. "setter 안의 `this.v = x`는 자기 프로퍼티 v에 저장한다" → 예제 9의 호출 횟수 3과 `hasOwn` `false`.
- 정리 표는 "`o.v`에 대입하거나 `v`를 정의하면 무엇이 일어나나"를 상황별로 정리한다(머리: `상황 | 일어나는 일 | 예제`). 결과 값을 칸에 쓰지 않고 동작을 쓴다. 행마다 근거 예제 번호를 두고, 예제가 없는 행·주장만 concept.test 탐침으로 검증한다(작업 순서 2의 대응표).
- 버린 대안
  - 시뮬레이터(체인 세 칸): 사용자가 표+퀴즈를 골랐다.
  - 정리 표의 칸에 실행 코드를 넣어 표 자체를 실행 대조: 클래스 정의가 들어간 한 줄 코드가 길어 375px에서 읽기 어렵다. 예제 파일과 concept.test 탐침으로 검증한다.
  - 예제 9에서 RangeError를 출력: 명세에 규정이 없는 엔진 동작이라 예제 출력(독자가 예측할 값)으로 두지 않는다. 멈춤 조건으로 재호출을 결정적으로 보이고, RangeError는 본문에 Node(V8) 동작으로만 쓴다(미확정 1).
  - 예제 8에서 `Object.getOwnPropertyNames(클래스.prototype)`으로 위치를 보이기: private 이름은 문자열 키가 아니라 어느 모델에서도 목록에 나오지 않는다(검토 지적). 체인 탐색 여부를 가르는 `Object.create(p)` 대비로 바꿨다.
  - 부모 생성자 예제(6)에 같은 이름의 자식 필드를 더해 setter 호출 뒤 필드 정의를 보이는 변형: 4·5와 이어지는 좋은 증거지만 예제가 복잡해진다. 추가 개선 후보로 둔다.
  - static private 필드로 static 예제 작성: 서브클래스에서 TypeError가 나는 별도 함정이 섞인다. public static 필드(`static _n`)를 쓴다.

## 4. 변경 파일
- 추가
  - `app/concepts/class-accessors/meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`
  - `examples/prototype-accessor.js`, `getter-only-override.js`, `super-accessor.js`, `derived-field.js`, `field-vs-setter.js`, `base-constructor-setter.js`, `static-accessor.js`, `private-accessor.js`, `setter-recursion.js`
- 수정
  - `app/concepts/class-basics/meta.ts:104`(+related)
  - `app/concepts/class-inheritance/meta.ts:107`(+related)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
  - `.claude/plans/concept-roadmap-extras-2.md`(2번 상태·진행 기록, finalize 때)
- 변경하지 않음: 공통 코드 소스(`app/components/`, `app/simulator/`, `app/lib/*.ts` 소스, `app/routes/`), property-attributes·prototype-chain·arrow-functions 본문, 다른 페이지의 예제·퀴즈·`reviewedAt`.

## 5. 위험 요소
- 기존 페이지와 겹침: property-attributes(객체 리터럴 접근자)·prototype-chain(상속된 setter, getter만 있을 때 대입 실패)과 같은 내용을 반복하면 중복 → 본문은 두 페이지를 링크로 전제하고, 클래스 문법에서만 생기는 것(같은 클래스에서 합쳐짐, 서브클래스 getter만 정의, 필드=정의, `super`, static, private, 부모 생성자)에 집중한다. 예제 2는 prototype-chain의 "getter만 있는 상속" 규칙을 전제로 링크하고, 새 내용은 "서브클래스가 get만 쓰면 그 상황이 생긴다"임을 밝힌다.
- 장 순서: 이 페이지(25장 자리) 앞의 개념만 전제로 한다. 화살표 함수(250)·전개(320)·JSON(order 420대)은 뒤 개념 → 예제·퀴즈에 화살표 함수·전개를 쓰지 않는다(`console.log`의 `JSON.stringify` 결과 출력은 예제 규칙의 출력 방식이므로 허용, class-basics 예제 5 선례). strict mode(177)·this(190)·class-basics(230)·class-inheritance(240)는 앞 개념이라 본문 링크로 전제.
- sloppy 전제: 예제 2의 클래스 밖 대입은 sloppy 결과에 기댄다 → 본문 실행 조건 문장과 simplifications(모듈·strict에서는 TypeError). 다른 예제도 파일 첫 줄 `'use strict';` 접두로 출력이 같은지 확인하고, 다르면 같은 처리.
- RangeError: 명세에 규정이 없는 동작을 언어 동작처럼 쓰면 정확성 원칙 위반 → "명세에는 호출 깊이 한계 규정이 없고, Node(V8)에서는 RangeError" 형태로만 쓰고, concept.test에서 Node로 확인한다(미확정 1). Chromium·다른 엔진의 오류 종류는 실행하지 않았으므로 쓰지 않는다.
- private 접근자의 위치: 명세의 private 요소 목록(`[[PrivateElements]]`)을 엔진 내부 구현처럼 쓰지 않는다(명세 NOTE가 설명용 방식이라고 밝힘). 확인할 수 있는 식(`Object.create(p)`에서 읽기 TypeError)으로 보인다.
- 디스크립터 필드와 내부 메서드 이름 혼동: `[[Set]]`을 디스크립터 필드로 쓰면 대입의 `[[Set]]` 내부 메서드와 섞인다 → 본문은 `get`·`set` 필드 이름, 명세 이름은 `[[Getter]]`·`[[Setter]]`(작업 순서 2 완료 조건의 grep).
- `super.v = x`의 범위: 부모 쪽에서 setter가 있는 접근자를 찾는 경우만 다룬다. "setter가 없으면 this에 정의된다"처럼 쓰면 getter만 있는 경우(TypeError)와 어긋난다 → 1절 simplifications 문구, 작업 순서 4의 class-inheritance 문구.
- 필드 = 정의: "필드는 Object.defineProperty와 같다"로 단순화하지 않는다(디스크립터 값이 다름 — 필드는 열거 가능·쓰기 가능). 명세 이름 CreateDataPropertyOrThrow와 결과 디스크립터로 쓴다.
- 부모 생성자 예제(6): class-inheritance 예제 7(필드 초기화 순서)과 겹침 → 그 예제를 링크하고, 새 점은 "대입이 자식 setter로 간다"로 한정한다.
- 순위 +1 누락, '객체' 검색 개수: 작업 순서 5의 대조 스크립트.
- 기존 2개 페이지 문구: 대상 페이지(새 페이지)가 실제로 다루는 하위 주제만 옮긴다. class-inheritance의 "`super.x = 1` 같은 프로퍼티 대입"은 새 페이지가 부모 setter가 있는 경우만 다루므로 그대로 두거나 그 경우만 옮긴다(작업 순서 4에 문장 확정).
- MDX: 첫 문단에 `**`·장 번호를 쓰지 않는다. 맨 `{`를 쓰지 않는다. 표의 코드 칸은 `<code>{'…'}</code>`, `<th>`는 한 줄. `#v`처럼 `#`이 든 인라인 코드는 백틱 안이라 안전하지만 표 칸 안에서는 `<code>{'…'}</code>`로 쓴다.
- 예제의 try/catch는 뒤 개념(error-handling) → simplifications에 "오류를 보이려는 용도"(class-basics 선례).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 공통 코드 소스를 바꾸지 않으므로 `npx playwright test tests/e2e/navigation.spec.ts`와 `npx playwright test -g "class-accessors|클래스의 getter와 setter|홈 학습 순서 보기"`. 기존 2개 페이지는 meta 문구만 바꾸므로 `-g "class-basics|class-inheritance|클래스는 함수다|클래스 상속"`도 실행한다.
- 브라우저(dev 서버 재시작 후)
  1. 홈 학습 순서 32~34번째가 class-inheritance, class-accessors, arrow-functions다.
  2. 새 페이지 pager가 '33 / 67'이고 이전은 class-inheritance, 다음은 arrow-functions다.
  3. 퀴즈 9개가 하이드레이션 뒤 라디오 퀴즈로 바뀌고, JS 없이(프리렌더) `<details>` 정답이 보인다.
  4. 375px·다크 모드에서 정리 표와 코드 블록이 페이지 가로 스크롤을 만들지 않는다.
  5. class-basics·class-inheritance의 단순화 항목이 새 개념을 가리킨다.

## 7. 미확정 사항
- [미확정 1] 멈춤 조건이 없는 setter 재귀의 RangeError는 예제 출력에 넣지 않고, 본문에 "명세에는 호출 깊이 한계 규정이 없고 Node(V8)에서는 RangeError"로 쓰며 concept.test에서 Node로 확인한다(기본안). 대안: 본문에서 RangeError를 빼고 "명세의 알고리즘으로는 끝없이 이어진다"까지만 쓴다.
- [미확정 2] 기존 2개 페이지(class-basics, class-inheritance)는 simplifications 문구와 related만 바뀐다. `reviewedAt`은 그대로 둔다(기본안, arguments-object 선례).

## 8. 작업 순서

### 1. 명세 확인, 폴더 뼈대·예제·meta
- 대상: `meta.ts` → `content.mdx`(필수 h2 뼈대) → `route.tsx`(class-basics 것을 복사해 slug만 바꾼다), 예제 9개.
- 예제(모두 `runtime: 'ecmascript'`, 지시어 없는 스크립트. `expectedOutput`은 `[]`로 시작해 실제 출력으로 채우고 아래 기대와 같은지 확인한다. 클래스·변수 이름과 값은 구현자가 정하되 구조와 배제할 모델은 지킨다. 화살표 함수·전개 금지)
  1. `prototype-accessor.js` — 섭씨 `_c`를 저장하고 화씨 `f`를 get/set으로 보이는 클래스, 인스턴스 둘. 기대: 한 인스턴스에 `f` 대입 뒤 그 인스턴스의 `_c`만 바뀌고 다른 인스턴스는 그대로, `Object.hasOwn(인스턴스, 'f')` `false`, `Object.keys(인스턴스)`에 `f`가 없음, `Object.hasOwn(클래스.prototype, 'f')` `true`, 디스크립터의 `enumerable` `false`.
  2. `getter-only-override.js` — 부모 get/set, 자식 get만. 기대: 클래스 밖 대입 뒤 값 그대로(`_v` 불변, `hasOwn` `false`), `typeof 자식.prototype 디스크립터.set`이 `'undefined'`, 자식 메서드 안 대입의 `e.name` `TypeError`.
  3. `super-accessor.js` — 자식이 get/set 모두 정의하고 `super.v`·`super.v = …`로 부모 것을 부른다. 기대: 대입·읽기 결과가 부모 setter·getter가 인스턴스를 this로 동작한 값(탐침 형태 `50 5 false`).
  4. `derived-field.js` — 부모 get/set(setter가 호출 횟수를 센다), 자식 필드 `v = 2`. 기대: setter 호출 0, `hasOwn` `true`, 읽으면 필드 값(부모 getter 결과가 아님), 이후 대입도 setter 호출 0.
  5. `field-vs-setter.js` — 같은 클래스에 필드 `v`와 `set v`(호출 횟수), 다른 클래스는 생성자에서 `this.v = …`. 기대: 필드 쪽 호출 0·`hasOwn` `true`, 생성자 쪽 호출 1·`hasOwn` `false`.
  6. `base-constructor-setter.js` — 부모 생성자 `this.v = 1`, 자식 필드 `label`과 `set v`(받은 값과 `this.label`을 출력). 기대: `setter 1 undefined` 같은 줄(label이 아직 없음), 생성 뒤 `hasOwn(…, 'v')` `false`, `label` 값.
  7. `static-accessor.js` — public static 필드 `_n`과 static get/set `count`, 서브클래스. 기대: `hasOwn(클래스, 'count')` `true`, `hasOwn(클래스.prototype, 'count')` `false`, 인스턴스의 `count` `undefined`, 서브클래스 대입 뒤 부모 `count` 그대로·서브 `count` 바뀜·`hasOwn(서브, '_n')` `true`.
  8. `private-accessor.js` — private 필드와 `get #v`, setter만 있는 `set #w`, 비교용 setter만 있는 public `w`, 인수로 받은 객체에서 `#v`를 읽어 값 또는 `e.name`을 돌려주는 static 메서드. 기대 첫째 줄: 인스턴스 `p`에서 값, `Object.create(p)`에서 `TypeError`, `클래스.prototype`에서 `TypeError`(탐침 형태 `7 TypeError TypeError`). 둘째 줄: setter만 있는 public 읽기 `undefined`, setter만 있는 private 읽기 `TypeError`(클래스 안에서 읽는다). `Object.getOwnPropertyNames` 출력은 넣지 않는다.
  9. `setter-recursion.js` — `set v(x) { depth++; if (depth < 3) this.v = x; }`. 기대: `depth` `3`, `hasOwn` `false`.
- meta
  - summary 160자 이하. title·summary·tags에 '객체'를 넣지 않는다(인스턴스·프로토타입으로 쓴다). concept.test가 검사한다(dom-manipulation 선례).
  - tags: getter, setter, 접근자 프로퍼티, 클래스, 오버라이드, 클래스 필드, super, static, private 접근자.
  - goals 4개: 클래스 접근자가 어디에 정의되고 대입이 setter를 어떤 this로 부르는지 / getter만 오버라이드했을 때 대입이 실패하는 이유 / 필드(정의)와 대입의 차이를 setter 호출로 구분 / static·private 접근자가 있는 곳과 동작 차이.
  - related: `class-basics`, `class-inheritance`, `property-attributes`, `prototype-chain`, `this-binding`, `strict-mode`, `error-handling`(본문·simplifications에서 가리키는 것만 남긴다).
  - references: 2절 사실의 명세 id 목록(ClassElementEvaluation은 `sec-static-semantics-classelementevaluation`) + MDN getter·setter·static·private(ko URL은 응답 코드를 확인하고 없으면 en). 절 번호는 라벨에 쓰지 않는다.
  - simplifications: 1절 "다루지 않고 밝힐 것" 전부 + sloppy 전제(예제 2, 모듈이면 TypeError) + RangeError는 Node(V8) 동작이고 명세에 규정이 없음 + try/catch 용도 + `console`은 호스트 API + 스크립트 실행 기준.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과. 9개 예제 출력이 위 기대와 같다. 각 예제 파일 첫 줄에 `'use strict';`를 붙여 실행했을 때 달라지는 예제 목록을 계획 "구현 진행"에 기록한다(예상: 예제 2만). 예제에 화살표 함수·전개 문법이 없다(`grep -n "=>\|\.\.\." app/concepts/class-accessors/examples/*.js` 0건).

### 2. content.mdx 본문
- 첫 문단: 질문과 1절의 고정 내용. `**`·장 번호 없음. 전제 개념 링크(class-inheritance, property-attributes, prototype-chain, this-binding).
- 실행 조건 문장: "예제의 출력은 Node의 `vm` 모듈에서 모듈이 아닌 스크립트(Script)로 실행한 결과입니다" + 지시어가 없으므로 클래스 밖 코드는 sloppy mode, 클래스 안은 항상 strict mode([strict mode](/concepts/strict-mode), class-basics).
- `## 동작 원리`(h3는 1절 "다룰 것" 1~8 순서, 마지막에 `### 정리 표`)
  - 정리 표 머리: `상황 | 일어나는 일 | 예제`. 행과 근거(작업 순서 3의 concept.test가 같은 대응표를 쓴다):

    | 행 | 상황 | 근거 |
    | - | - | - |
    | 1 | 같은 클래스 get·set에 대입 | 예제 1 |
    | 2 | 서브클래스가 get만 정의한 뒤 대입 | 예제 2 |
    | 3 | 서브클래스가 set만 정의한 뒤 읽기 | 탐침 |
    | 4 | `super.v = x`(부모에 setter) | 예제 3 |
    | 5 | 서브클래스 필드 `v` | 예제 4 + 탐침(필드 디스크립터) |
    | 6 | 같은 클래스 필드 `v`와 생성자의 `this.v = x` | 예제 5 |
    | 7 | 부모 생성자의 `this.v = x` | 예제 6 |
    | 8 | static 접근자 | 예제 7 |
    | 9 | private 접근자를 다른 객체에서 읽기 | 예제 8 |
    | 10 | setter만 있는 private 읽기 / getter만 있는 private 쓰기 | 예제 8 + 탐침(쓰기) |
    | 11 | setter 안의 `this.v = x` | 예제 9 + 탐침(RangeError) |

    칸에는 결과 값 대신 동작("프로토타입의 setter를 o를 this로 호출, o에 v 안 생김")을 쓴다. 예제 칸은 숫자만, 탐침 행은 `—`로 쓴다. 첫 칸이 "예제 N"으로 시작하지 않게 한다(result-tables 형식 판정). `#v` 등 코드는 `<code>{'…'}</code>`.
- `## 예제`: 예제 1~9. 각각 `### 예제 N: …`, `file=`, PredictQuiz(오답은 3절의 틀린 모델의 출력).
- `## 결과와 이유`: 결과 표(`예제 | 결과`, result-tables 형식)와 예제별 설명, 흔한 오해 Callout 3개("getter만 바꾸면 setter는 부모 것이 그대로 쓰인다", "클래스 필드는 생성자에서 대입하는 것과 같다", "setter 안에서 this.v에 저장하면 된다").
- 완료 조건: `npm test`(result-tables 포함)와 `npm run test:build` 통과. `grep -n "복사\|덮어" app/concepts/class-accessors/content.mdx app/concepts/class-accessors/meta.ts` 결과가 오해를 부정하는 문장뿐이다. `RangeError`가 나오는 모든 문장에 "V8"과 "규정이 없"(또는 같은 문장 근처의 명세 언급)이 함께 있고 "Chromium"은 없다. `grep -n "\[\[Get\]\]\|\[\[Set\]\]"` 결과가 내부 메서드(읽기·대입)를 가리키는 문장뿐이다(디스크립터 필드는 `get`·`set` 또는 `[[Getter]]`·`[[Setter]]`). `super.v = x`를 설명하는 문장이 "부모 쪽에서 setter가 있는 접근자를 찾는 경우"로 한정되어 있다.

### 3. concept.test.ts
- 정리 표: `tableBody(mdx, ['상황', '일어나는 일', '예제'])`로 행이 11개이고, 예제 칸이 작업 순서 2의 대응표와 같다(숫자 칸은 `exampleFilesByNumber(mdx)`(`tests/helpers/result-tables.ts:28`)에 있는 번호, 탐침 행은 `—`). 대응표는 테스트 안에 배열로 둔다.
- 탐침(`runInNewContext`, 예제가 없는 주장만): 행 3 setter만 오버라이드한 뒤 읽기 `undefined` / 행 5 필드 디스크립터 `{"value":…,"writable":true,"enumerable":true,"configurable":true}` / 행 10 getter만 있는 private 접근자에 쓰면 TypeError / 행 11 멈춤 조건 없는 setter 재귀가 Node에서 `RangeError`(주석에 "V8 동작, 명세에 규정 없음") / 본문 2번의 "같은 클래스에서 set을 먼저, get을 나중에 정의해도 두 필드가 모두 함수". 부모 쪽에서 setter를 찾지 못하는 `super.v = x`는 검사하지 않는다(다루지 않음).
- sloppy 전제: 9개 예제 각각에 `'use strict';`를 붙여 실행해, 예제 2는 출력이 달라지거나 오류가 나고 나머지 8개는 출력이 같다는 것을 고정한다(arguments-object concept.test 선례). 구현 중 다른 예제가 달라지면 그 예제도 본문·simplifications에 sloppy 전제를 밝히고 테스트 기대를 바꾼다.
- 메타 조건: `filterConcepts([concept], '객체')`가 빈 배열, `concept.order`가 245(dom-manipulation `concept.test.ts:186-191` 선례).
- 퀴즈 정답 선택지가 각 예제의 `expectedOutput`을 ` / `로 이은 문자열과 같은지 검사한다(dom-manipulation 선례).
- `reviewedAt` 값을 테스트로 고정하지 않는다.
- 완료 조건: `npx vitest run app/concepts/class-accessors` 통과. 탐침 하나의 기대값을 바꾸면 실패하는 것을 확인하고 되돌린다.

### 4. 기존 페이지 문구
- class-basics `meta.ts:104`: "…계산된 메서드 이름, getter와 setter는 다루지 않습니다." → "…계산된 메서드 이름은 다루지 않습니다. getter와 setter는 클래스의 getter와 setter 개념에서 다룹니다." related에 `class-accessors`.
- class-inheritance `meta.ts:107` 전체를 다음으로 바꾼다: "객체 리터럴 메서드의 `super`(`__proto__`와 함께 쓰는 경우), 부모 쪽에서 setter가 있는 접근자를 찾지 못할 때의 `super.x = 1` 같은 프로퍼티 대입, 화살표 함수 안의 `super`와 `this`, private 필드의 상속은 다루지 않습니다. 접근자 오버라이드와 부모의 setter를 부르는 `super.x = 1`은 클래스의 getter와 setter 개념에서 다룹니다." related에 `class-accessors`.
- 그 밖의 문장은 바꾸지 않는다.
- 완료 조건: `npx vitest run app/concepts tests/content-integrity.test.ts` 통과. `grep -rn "class-accessors\|클래스의 getter와 setter" app/concepts/{class-basics,class-inheritance}`가 페이지마다 simplifications 1곳과 related 1곳이다.

### 5. 순서 테스트와 새 페이지 등록
- 순서: 2절 "순서와 테스트"의 모든 위치를 67 기준으로 고친다. `학습 순서 N / 66`은 N ≥ 33이면 N+1. navigation.spec에 class-accessors 블록(33 / 67, 이전 class-inheritance, 다음 arrow-functions)을 class-inheritance 블록 뒤에 추가하고, class-inheritance의 다음 링크와 arrow-functions의 이전 링크를 `/concepts/class-accessors`로 고친다. '객체' 검색 개수 18은 그대로 두고, 순위 배열의 33 이상 값은 +1(`35,43,45,46,57,62` → `36,44,46,47,58,63`).
- 등록: `helpers.ts`의 `CLASS_INHERITANCE_PATH` 근처(`:54-57`)에 `CLASS_ACCESSORS_PATH`, `a11y.spec.ts`(페이지: 정답 확인 버튼 + axe), `responsive.spec.ts`(가로 스크롤), `build-output.test.ts`(`<details>` 9개 이상, 정리 표 머리 `상황`·`일어나는 일`), `docs/content-guide.md:225` 목록 끝에 `class-accessors`. 기존 케이스는 고치지 않고 추가만 한다.
- 완료 조건
  - `grep -rn "/ 66\|66번째\|toHaveCount(66)\|toBe(66)" tests/e2e app/lib app/components`가 0건.
  - HEAD의 `N / 66` 목록을 변환한 것과 새 `/ 67` 목록이 같다(대조 스크립트, 새 블록 1개 추가분 제외).
  - '객체' 검색 개수와 순위 배열을 `filterConcepts`와 order 정렬로 계산한 값과 대조한다(일회용 스크립트, 커밋하지 않는다). 기대: 18개, `4,12,19,20,21,22,24,25,27,29,31,32,36,44,46,47,58,63`.
  - `npx vitest run app/lib app/components` 통과.

### 6. 전체 검증
- 6절의 정적 검증, e2e, 브라우저 확인 1~5.
- 완료 조건: 모두 통과. 실패하면 해당 단계로 돌아간다.

## 9. 추가 개선 후보
- prototype-chain 예제 7(상속된 setter)이 바깥 변수만 쓰는 이유(this는 뒤 개념)를 밝혀 두었으므로, 그 절에서 새 페이지로 링크를 거는 것(order가 뒤라 "다음에 볼 개념"으로만).
- property-attributes `meta.ts:94`의 "getter와 setter는 보통 this로…" 문장에 새 페이지 언급.
- 예제 6의 변형: 부모 생성자가 `this.v = 1`을 하고 자식에 `set v`와 같은 이름의 필드 `v = 2`가 함께 있으면 setter가 먼저 불리고(`setter 1`) 그 뒤 필드가 자기 프로퍼티를 정의한다(`2 true`, Critic 탐침). 4·5번 주제를 잇는 증거.

## 변경 이력
- 2026-11-18 (Consensus 검토)
  - 디스크립터 필드를 `[[Get]]`·`[[Set]]`으로 쓴 서술을 고쳤다. 현행 초안은 `[[Getter]]`·`[[Setter]]`이고 내부 메서드 이름과 겹친다(Architect HIGH, property-attributes `content.mdx:14` 방식을 따른다).
  - "부모에 setter가 없으면 this에 정의" 서술을 뺐다. 부모에 getter만 있으면 TypeError다(두 검토자 공통, 메인이 실행으로 확인). 범위를 "부모 쪽에서 setter가 있는 접근자를 찾는 경우"로 한정하고 class-inheritance 문구도 그에 맞췄다.
  - 예제 8의 증거를 `getOwnPropertyNames`에서 `Object.create(p)` 대비로 바꿨다. private 이름은 문자열 키가 아니라 위치의 증거가 되지 못한다(Critic HIGH·Architect MEDIUM, 메인이 실행으로 확인). private 요소 목록이 설명용 방식이라는 명세 NOTE를 simplifications에 더했다.
  - 순위 배열의 33 이상 값 +1을 명시했다(Architect MEDIUM). 새 페이지는 '객체'를 넣지 않고 concept.test로 가드한다.
  - 정리 표 머리를 `일어나는 일`로 바꾸고 행-근거 대응표를 넣었다. 예제가 있는 행은 예제로, 없는 주장만 탐침으로 검증한다(두 검토자 공통).
  - RangeError를 "Node(V8)"로 한정하고 "명세에 규정이 없다"로 표현했다. setter만 오버라이드한 경우의 읽기 `undefined`, static 예제의 섀도잉 원인, 재귀 주제의 실용적 결론, strict 접두 검사를 9개 예제 전부로 넓힌 것, 로드맵 문서 갱신을 더했다.
  - 재검토는 생략했다. 수정이 모두 검토자가 제시한 실행 결과·명세 원문으로 메인이 재확인한 사실 반영이고 구조는 바뀌지 않았다.
- 2026-11-18 (사용자 승인): 계획 승인. 미확정 1·2 모두 기본안 확정 — RangeError는 본문에 Node(V8) 동작으로만 쓰고 concept.test로 확인, 기존 2개 페이지 `reviewedAt` 유지.

## 구현 진행

- baseline (2026-11-18, `61a70d0`): lint 0 / format:check 통과 / typecheck 0 / test 174파일 5387개 통과. test:build·e2e는 직전 커밋(61a70d0)의 전체 검증 통과를 baseline으로 쓴다(소스 트리 동일, 이후 변경은 계획 문서뿐).
- [x] 1. 폴더 뼈대·예제·meta — 예제 9개 출력이 계획의 기대와 같다(`212`/`0 20`/`false true ["_c"]`/`true function function false`, `10 1 false`/`undefined`/`TypeError`, `50 5 false`, `0 true 2 1`/`0 3 1`, `0 true 1`/`1 false undefined`, `setter 1 undefined`/`false d`, `true false undefined`/`0 7 true`, `7 TypeError TypeError`/`undefined TypeError`, `3 false`). `'use strict';` 접두로 달라지는 예제는 2번뿐(concept.test가 고정). 화살표 함수·전개 grep 0건. MDN `Classes/getter`·`setter`는 404라 `Functions/get`·`set`(ko), Public class fields는 en-US.
  - 계획과 다른 점: 예제 8의 이름을 `w`/`#w` 대신 `shown`/`#hidden`으로 했다(한 줄에서 구분하기 쉽게).
- [x] 2. content.mdx 본문 — 정리 표 11행(예제 칸 1,2,—,3,4,5,6,7,8,8,9), 퀴즈 9개, 결과 표, 흔한 오해 3개. "복사·덮어" 0건, Chromium 0건, `[[Get]]`·`[[Set]]`은 내부 메서드만.
  - 메인이 고친 것: getter 디스크립터 문장("get만 있고" → "get 필드는 있지만 set 필드는 없다"), private NOTE 문장을 원문(ClassDefinitionEvaluation NOTE "For ease of specification…", PrivateMethodOrAccessorAdd NOTE "shared across instances… does not create a new copy")에 맞춤(meta 단순화 항목도), 예제 8 쓰기 문장의 범위 한정, 정리 표 행 3(읽으면 undefined)·행 9(읽는 객체 자신에게 private 요소가 없으면 TypeError) 문구.
- [x] 3. concept.test.ts — 정리 표 대응표, 탐침 6개(행 3·5·10·11, set→get 순서, 접근자 디스크립터), strict 접두 9개, 퀴즈 정답 대조, 메타 조건(객체 검색·order·RangeError 문장). 탐침 기대값 변조 시 실패 확인.
- [x] 4. 기존 페이지 문구 — class-basics `meta.ts` 104행, class-inheritance `meta.ts` 107행을 계획 문장으로, related에 `class-accessors`.
- [x] 5. 순서 테스트와 등록 — 66 고정 grep 0건, `N / 66` 40곳 변환 대조 일치, 순위 배열 `…32,36,44,46,47,58,63`, helpers·a11y·responsive·build-output·content-guide 등록.
- [x] 6. 전체 검증 (2026-11-18) — lint 0 / format:check 통과 / typecheck 0 / test 175파일 5449개 / test:build 535개 / e2e navigation 16개 + `-g "class-accessors|클래스의 getter와 setter|홈 학습 순서 보기|class-basics|class-inheritance|클래스는 함수다|클래스 상속"` 30개 통과. 브라우저(dev, 375px·다크): pager '33 / 67'·이전 class-inheritance·다음 arrow-functions, 정답 확인 버튼 9개(하이드레이션 후), 문서 가로 폭 375(넘침 없음), 정리 표는 영역 안에서 표시.
- 리뷰 1차 (critical-code-review, Opus 교차 검토): High 1 · Medium 1 · Low 5 → High·Medium과 Low 5건 모두 수정(단계 1·2·3으로 되돌림)
  - High: 예제 8의 getter가 private 필드 `#c`를 읽어, "private도 체인으로 찾는다"는 틀린 모델에서도 `Object.create(p)`·`P.prototype`이 TypeError라 배제하지 못함(메인이 실행으로 재현). 본문 "public 접근자였다면 체인에서 찾아 읽혔겠지만"도 이 코드에서는 거짓. → getter가 상수를 돌려주게 하고 같은 몸체의 public getter 줄을 더한다(`private TypeError TypeError` / `public public public` / `undefined TypeError`).
  - Medium: 정리 표 행 6과 흔한 오해 2가 "생성자의 대입은 setter를 부른다"를 조건 없이 씀. 같은 클래스에 필드가 있으면 필드가 먼저 자기 프로퍼티를 만들어 생성자 대입은 setter를 부르지 않음 → 두 클래스로 나눠 쓰고 조건을 붙인다.
  - Low: 예제 6 설명의 "super()가 돌아온 뒤"(생성자 없음, 기본 생성자), ValidateAndApplyPropertyDescriptor 문장의 조건(기존 프로퍼티가 접근자일 때), `super.v` 근거에 GetSuperBase 추가, 정리 표 행 10을 읽기(8)·쓰기(—)로 분리(행 12개), 첫 문장 "static이 아닌 public", goals의 private "어디에 있고".
  - 수정 결과: 예제 8 출력 `private TypeError TypeError` / `public public public` / `undefined TypeError`(틀린 모델은 `private private private`, 퀴즈 오답에 포함). 정리 표 12행(evidence `1,2,—,3,4,5,6,7,8,8,—,9`). concept.test에 같은 클래스 필드+생성자 대입 탐침(`0 true 2`) 추가. 메인이 "같은 몸체의 public getter"를 "문자열만 돌려주는/같은 형태의 public getter"로 고침(두 getter의 몸체는 다르다).
  - 재리뷰: 수정 diff와 예제 8·필드 흐름을 메인이 다시 읽음 → High·Medium 해소. 재검증 lint 0 / format:check 통과 / typecheck 0 / test 5450개 / test:build 535개 / e2e navigation 16개 + `-g "class-accessors|클래스의 getter와 setter|홈 학습 순서 보기"` 8개 통과.
- 사용자 검토 1차 (2026-11-18): 4건 반영(메인 직접, 문장만).
  - 중간: goals 4의 "(프로토타입 체인을 보지 않는다)"가 static에도 걸려 예제 7과 모순 → static은 클래스 쪽 체인, private은 체인 없이 객체 자신의 private 요소로 나눠 씀.
  - 낮음: simplifications "같은 클래스에서 같은 이름으로 정의"가 예제 5(필드 `v`와 `get v`·`set v`)와 충돌 → "프로토타입의 한 프로퍼티가 메서드(데이터 프로퍼티)와 접근자 사이에서 바뀌는 경우"로 한정('덮어쓴다' 표현은 피함).
  - 낮음: private 절 끝 "클래스 안에서만 쓸 수 있고 … 이 예제에서" → "private 이름은 클래스 본문 안에서만 참조할 수 있고 … 쓰기는 예제에 넣지 않았습니다".
  - 낮음: "JSON.stringify와 전개가 접근자의 값을 담지 않는 것" → 원인을 "프로토타입에 있는 열거 불가 프로퍼티라서"로(객체 리터럴의 자기 접근자는 `{"x":1}`로 담김 — 실행 확인).
- finalize (2026-11-18): 사용자 승인으로 `reviewedAt` 2026-11-18 기록. 로드맵 문서 2번 상태 완료.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 달라진 점: 예제 8을 리뷰 High로 교체(getter가 상수를 돌려주고 public getter `pub` 줄 추가, 출력 3줄), 정리 표 11행 → 12행(private 쓰기 행 분리), concept.test에 같은 클래스 필드+생성자 대입 탐침 추가, 예제 8의 이름 `shown`/`#hidden`.

### 코드 리뷰
- Opus 교차 리뷰 High 1(예제 8이 틀린 모델을 배제하지 못함)·Medium 1(필드와 생성자 대입의 조건)·Low 5 모두 수정. 사용자 검토 4건(goals 4의 static/private 구분, 단순화 항목 2개, private 절 끝 문장) 반영. 남긴 지적 없음.

### 후속 작업
- [ ] 로드맵 2의 3번 structuredClone(다음 개념, 시작 전에 사용자 확인).
- [ ] (선택) 예제 6 변형: 부모 생성자의 `this.v = 1`과 같은 이름의 자식 필드가 함께 있으면 setter가 먼저 불리고 그 뒤 필드가 자기 프로퍼티를 정의한다.
- [ ] (선택) prototype-chain 예제 7 절, property-attributes `meta.ts`의 getter·setter 문장에서 새 페이지 언급.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 8의 증거를 `Object.create(p)`와 같은 형태의 public getter 대비로 바꿨다 — `getOwnPropertyNames`(private 이름은 문자열 키가 아니라 어느 모델에서도 안 나옴)와, private 필드를 읽는 getter(틀린 모델에서도 같은 TypeError)를 버렸다. 출력이 틀린 모델과 갈라져야 증거가 된다.
- [Claude 판단] 멈춤 조건이 없는 setter 재귀의 RangeError는 예제 출력에 넣지 않고 "명세에 규정이 없고 Node(V8)에서는 RangeError"로만 쓰고 concept.test로 확인했다 — 예제는 `depth < 3`으로 재호출을 결정적으로 보인다.
- [Claude 판단] `super.v = x`는 "부모 쪽에서 setter가 있는 접근자를 찾는 경우"만 다룬다 — 부모 쪽에 `v`가 없으면 this에 자기 프로퍼티가 생기고 getter만 있으면 TypeError라 한 문장으로 일반화할 수 없다.
- [Claude 판단] 디스크립터 필드를 본문에서 `get`·`set`(명세 이름 `[[Getter]]`·`[[Setter]]`)으로 부르고 `[[Get]]`·`[[Set]]`은 내부 메서드에만 썼다 — 대입을 `[[Set]]` 내부 메서드로 설명하는 페이지라 섞이면 오독된다.
- [Claude 판단] 정리 표 칸에 결과 값이 아니라 동작을 쓰고, 행마다 근거 예제를 두고 예제가 없는 행만 탐침으로 검증했다 — 클래스 정의가 든 코드를 표 칸에서 실행 대조하면 375px에서 읽기 어렵다.
- 범위(핵심 4 + 추가 4), 표+퀴즈, slug, RangeError 기본안, 기존 페이지 reviewedAt 유지, 새 페이지 reviewedAt 기록은 사용자가 정했다.

#### 배경지식
- 대입 `o.v = x`는 OrdinarySet → OrdinarySetWithOwnDescriptor로 체인을 따라가며, 처음 만난 프로퍼티가 접근자면 그 setter를 receiver(o)를 this로 호출하고 setter가 없으면 실패(sloppy 무시, strict TypeError), 데이터 프로퍼티면 receiver에 데이터 프로퍼티를 만든다.
- 같은 클래스의 `get v`·`set v`가 합쳐지는 이유: getter 정의의 디스크립터에 `set` 필드가 없고, ValidateAndApplyPropertyDescriptor는 기존 접근자에 디스크립터에 있는 필드만 갱신한다. 새로 만들 때 빠진 필드는 기본값 `undefined`라 서브클래스의 get만 있는 접근자는 setter가 없다.
- 클래스 필드는 DefineField → CreateDataPropertyOrThrow로 정의하므로 `[[Set]]`(setter)을 거치지 않는다.
- private 이름은 PrivateElementFind로 객체 자신의 private 요소에서만 찾는다. 명세 NOTE는 이 목록이 설명용 방식이고 함수는 인스턴스끼리 공유된다고 밝힌다.

#### 확인 질문
1. 서브클래스가 `get v`만 정의하면 왜 부모의 `set v`가 쓰이지 않는가?
   <details><summary>답</summary>`B.prototype`에 `set`이 `undefined`인 새 접근자가 생기고(빠진 필드는 기본값), 대입은 체인에서 이것을 먼저 만나 멈춘다(OrdinarySetWithOwnDescriptor). 1절 다룰 것 2, 예제 2.</details>
2. 예제 8에서 private getter가 `this.#c`를 읽게 두면 무엇이 문제였나?
   <details><summary>답</summary>"private도 체인으로 찾는다"는 틀린 모델에서도 `Object.create(p)`·`P.prototype`에 `#c`가 없어 똑같이 TypeError라 출력이 모델을 가르지 못한다. 구현 진행 "리뷰 1차" High, 예제 8의 30·31번 줄 대비.</details>
3. 클래스 필드 `v = 1`과 생성자의 `this.v = 1`이 setter 호출에서 다른 이유는? 같은 클래스에 둘 다 있으면?
   <details><summary>답</summary>필드는 CreateDataPropertyOrThrow로 정의, 생성자 쪽은 `[[Set]]` 대입이다. 둘 다 있으면 필드가 먼저 자기 데이터 프로퍼티를 만들어 생성자의 대입은 그것을 바꿀 뿐 setter를 부르지 않는다(concept.test 행 6 탐침 `0 true 2`).</details>
4. 왜 RangeError를 예제 출력으로 두지 않았나?
   <details><summary>답</summary>명세에 호출 깊이 한계 규정이 없어 엔진 동작이고, 다른 엔진은 확인하지 않았다. 예제는 멈춤 조건으로 재호출을 결정적으로 보이고 RangeError는 본문·simplifications에 Node(V8) 동작으로만 쓴다. 7절 미확정 1.</details>
5. `super.v = x`를 "부모에 setter가 없으면 this에 정의된다"로 쓰면 무엇이 틀리나?
   <details><summary>답</summary>부모에 getter만 있으면 대입이 실패해 클래스 안에서는 TypeError다(Consensus 검토 탐침). 그래서 setter가 있는 경우만 다룬다. 변경 이력 Consensus 항목.</details>
