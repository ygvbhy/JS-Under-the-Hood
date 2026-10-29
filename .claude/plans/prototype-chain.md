# 프로토타입 체인 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-29
- 기준: `main` @ `17051a2`

## 0. 요약

- 목적: 로드맵(13~24장) 6번 `/concepts/prototype-chain`을 추가한다. 프로퍼티를 읽을 때 자기 프로퍼티가 없으면 [[Prototype]]을 따라 찾고 `null`에서 끝난다는 것, 함수의 `prototype` 프로퍼티와 객체의 [[Prototype]]이 다르다는 것, 대입은 자기 프로퍼티를 만든다(섀도잉)는 것을 예제 11개, 퀴즈, 체인 탐색 시뮬레이터로 보인다. 상속된 setter·읽기 전용 대입, `in`·`Object.hasOwn`·`for...in`, `Object.create`·null 프로토타입, `instanceof`도 포함한다(사용자 결정).
- 범위: 새 개념 폴더 1개(category `objects`), e2e·빌드 테스트 추가, `navigation.spec.ts` `객체` 검색 기대값 3→4, content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 16개는 바꾸지 않는다.
- 위험: 범위가 넓어 `this`(22장)·클래스·래퍼 객체를 앞서 설명하거나, 체인 그림을 엔진의 실제 메모리 구조처럼 쓰는 것 → 명세 원문 대조, 단순화 명시, 시나리오의 경로를 vm 안 실제 체인과 동일성(`===`)으로 대조하는 테스트로 막는다.
- 복잡도: 중간 · Consensus: 생략. 기존 개념 패턴(scope-chain 탐색 경로, property-attributes 객체 카드, new-operator 동일성 대조)의 조합이고 공통 코드 변경이 없다. 명세 원문과 vm·ESM·CJS 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md:31`) 6번, 『모던 자바스크립트 Deep Dive』 19장 범위. 19장까지만 전제한다.
- 핵심
  - ① 모든 객체는 [[Prototype]] 내부 슬롯을 가진다(객체 또는 `null`). 객체 리터럴은 `Object.prototype`, `Object.prototype`의 [[Prototype]]은 `null`. 코드에서는 `Object.getPrototypeOf`로 읽는다.
  - ② 프로퍼티를 읽을 때 자기 프로퍼티가 없으면 [[Prototype]]이 가리키는 객체에서 이어서 찾고, `null`에 닿으면 `undefined`다(프로토타입 체인).
  - ③ 함수의 `prototype`은 평범한 프로퍼티이고, `new F()`로 만든 객체의 [[Prototype]]이 그 값이 된다. F 자신의 [[Prototype]]은 `Function.prototype`이다. `prototype` 객체에는 `constructor`가 있다.
  - ④ 체인은 읽을 때마다 따라간다. 나중에 프로토타입에 추가한 프로퍼티도 기존 객체에서 보인다. 상속된 프로퍼티는 자기 프로퍼티가 아니다(`JSON.stringify`에 나오지 않음).
  - ⑤ 섀도잉: 대입은 체인을 확인한 뒤 데이터 프로퍼티가 쓰기 가능하면 대입한 객체에 자기 프로퍼티를 만들고, 프로토타입의 값은 그대로다. `delete`는 자기 프로퍼티만 지운다.
- 사용자 결정(2026-10-29): 아래 네 가지를 모두 포함한다. 예제는 `Object.getPrototypeOf`·`Object.create` 중심으로 쓰고 `__proto__`는 본문에서 레거시 접근자로만 소개한다.
  - ⑥ 상속된 읽기 전용(`writable: false`) 프로퍼티에 대입하면 자기 프로퍼티가 생기지 않는다(sloppy 무시, strict TypeError). 상속된 setter는 호출되고 자기 프로퍼티가 생기지 않는다.
  - ⑦ `in`은 체인 전체, `Object.hasOwn`은 자기 프로퍼티만 본다. `for...in`은 상속된 열거 가능한 프로퍼티까지 돈다.
  - ⑧ `Object.create(proto)`는 [[Prototype]]을 직접 정한다. `Object.create(null)`로 만든 객체는 체인이 바로 끝난다.
  - ⑨ `instanceof`는 `F.prototype`이 체인에 있는지 확인한다. 생성자를 호출했는지와 관계없다. `prototype`을 교체하면 결과가 바뀐다.

### 유지해야 하는 기존 동작

- 기존 개념 16개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일은 수정하지 않는다.
- `navigation.spec.ts`는 기대값(3→4)만 바꾸고 첫 카드 '원시 값과 객체' 검사는 그대로 통과해야 한다(2절 정렬 확인).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위

- 메서드 안의 `this`(상속된 메서드를 호출할 때의 this) — 8번(22장)
- 클래스와 `extends`, `super` — 별도 개념
- `Object.setPrototypeOf`, 객체 리터럴의 `__proto__:` 문법 — 이름만 언급
- 원시 값의 프로퍼티 접근(래퍼 객체) — 7번(21장)
- 정적 프로퍼티는 "생성자 자신의 프로퍼티는 인스턴스 체인에 없다" 한 문장만(근거 테스트)
- 배열을 돌려주는 `Object.keys` 등 — 배열(27장) 이후

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현
  - `app/concepts/scope-chain/scenarios.ts:12-23`: 탐색 경로 모델 `Lookup = { name; purpose: 'read' | 'assign'; path: { scopeId; found }[] }`, `ScopeView.tsx:86-120` 경로 표시와 `PURPOSE_LABELS`(`:26`)
  - `app/concepts/property-attributes/`: 객체 카드·어트리뷰트 칩(`AttrView.tsx`), 탐침 대조·`.mjs`/`.cjs` 비교
  - `app/concepts/new-operator/`: 객체 카드와 역할 배지(`NewView.tsx`), vm 안 `===` 판정(`concept.test.ts`)
  - e2e 경로 상수 `tests/e2e/helpers.ts:31-32`(new-operator) 뒤에 추가
- 메타·검색·정렬
  - `related`는 존재하는 slug 문자열 배열(`app/lib/concepts.ts:11`)
  - `객체` 검색 기대값 3: `tests/e2e/navigation.spec.ts:17`, `:32`. 첫 카드 검사 `:18`, `:22`. summary에 '객체'가 들어가므로 4건이 된다.
  - 정렬(node `localeCompare('ko')`): '원시 값과 객체' → '프로토타입 체인: …' → '프로퍼티 키' → 'new 연산자'. 첫 카드는 그대로 '원시 값과 객체'다.
- 기존 페이지가 이 페이지로 미룬 부분
  - `property-keys/meta.ts:86`: 없는 프로퍼티를 읽으면 프로토타입에서 이어 찾고, 대입도 프로토타입을 확인한다
  - `property-attributes/meta.ts:94`: 상속된 writable·setter가 대입에 주는 영향
  - `new-operator/meta.ts:94`: 새 객체의 프로토타입은 newTarget의 prototype
  - `type-coercion/meta.ts:83`: 객체의 valueOf·toString(프로토타입 개념 필요) — 이 페이지는 `toString`이 `Object.prototype`에서 온다는 것까지만
- 명세 원문(tc39.es/ecma262 ES2027 초안, 2026-10-28 내려받은 사본으로 확인)
  - 10.1.8.1 OrdinaryGet(`sec-ordinaryget`): 자기 프로퍼티 서술자가 없으면 parent = [[GetPrototypeOf]](), parent가 null이면 undefined, 아니면 parent.[[Get]](key, receiver). 데이터면 [[Value]], 접근자면 getter를 receiver로 호출.
  - 10.1.9.2 OrdinarySetWithOwnDescriptor(`sec-ordinarysetwithowndescriptor`): 자기 서술자가 없으면 parent.[[Set]]으로 올라가고, parent가 null이면 쓰기 가능한 데이터 서술자로 본다. 데이터 서술자의 writable이 false면 false. 아니면 receiver에 자기 프로퍼티가 없을 때 CreateDataProperty(receiver, …). 접근자면 setter를 receiver로 호출, setter가 없으면 false.
  - 10.1.7.1 OrdinaryHasProperty(`sec-ordinaryhasproperty`, `in`): 자기 프로퍼티가 있으면 true, 아니면 parent.[[HasProperty]], parent가 null이면 false.
  - 7.3.12 HasOwnProperty, 20.1.2.14 `Object.hasOwn`(`sec-object.hasown`): 자기 프로퍼티만 본다.
  - 14.7.5.9 EnumerateObjectProperties(`sec-enumerate-object-properties`): 프로토타입까지 재귀로 열거, 이미 처리한 이름은 건너뜀(열거 가능 여부와 관계없이), Symbol 제외. 순서는 일반적으로 지정하지 않지만, 일반 객체이고 열거 중 체인·프로퍼티가 바뀌지 않으면 CreateForInIterator(`sec-%foriniteratorprototype%.next`)와 같게 동작해야 한다(자기 키 [[OwnPropertyKeys]] 순서 → 프로토타입).
  - 20.1.2.2 `Object.create`(`sec-object.create`): proto가 객체도 null도 아니면 TypeError, OrdinaryObjectCreate(proto).
  - 10.1.12 OrdinaryObjectCreate(`sec-ordinaryobjectcreate`), 13.2.5.5 객체 리터럴 평가(`sec-object-initializer-runtime-semantics-evaluation`): OrdinaryObjectCreate(%Object.prototype%).
  - 20.1.3 Object.prototype의 [[Prototype]]은 null, immutable prototype exotic object(`sec-properties-of-the-object-prototype-object`).
  - 20.1.2.12 `Object.getPrototypeOf`(`sec-object.getprototypeof`).
  - 10.2.5 MakeConstructor(`sec-makeconstructor`): prototype 객체 = OrdinaryObjectCreate(%Object.prototype%), 그 객체에 `constructor`(writable, 열거 불가, configurable), 함수에 `prototype`(writable, 열거 불가, configurable 불가).
  - 13.10.2 InstanceofOperator(`sec-instanceofoperator`): target의 %Symbol.hasInstance%를 먼저 확인(일반 함수는 `Function.prototype[%Symbol.hasInstance%]`가 OrdinaryHasInstance를 부름). 7.3.21 OrdinaryHasInstance(`sec-ordinaryhasinstance`): `Get(ctor, "prototype")`가 객체가 아니면 TypeError, instance의 [[Prototype]]을 null까지 따라가며 SameValue 비교.
  - 10.1.2.1 OrdinarySetPrototypeOf(`sec-ordinarysetprototypeof`): 순환을 만들면 false.
  - 20.1.3.8 `Object.prototype.__proto__`(`sec-object.prototype.__proto__`): "Normative Optional, Legacy" 접근자 프로퍼티, getter는 [[GetPrototypeOf]].
- 예제 초안 실제 출력(vm은 `runExample`과 같은 방식. `.mjs`·`.cjs`는 파일로 직접 실행)

  | # | 파일 | vm 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `literal.js` | `true` / `function` / `false` / `null` / `undefined` | 같음 | 같음 |
  | 2 | `chain.js` | `JS` / `ko` / `book` / `undefined` | 같음 | 같음 |
  | 3 | `prototype-property.js` | `true` / `false` / `true` / `book` / `undefined` / `true` | 같음 | 같음 |
  | 4 | `shared.js` | `undefined` / `book` / `book` / `{"title":"JS"}` | 같음 | 같음 |
  | 5 | `shadowing.js` | `red` / `blue` / `red` / `true` / `red` | 같음 | 같음 |
  | 6 | `inherited-readonly.js` | `1` / `false` / `2` / `1` | TypeError(모듈은 strict) | 같음 |
  | 7 | `inherited-setter.js` | `JS` / `false` / `undefined` | 같음 | 같음 |
  | 8 | `in-hasown.js` | `true` / `true` / `true` / `true` / `false` | 같음 | 같음 |
  | 9 | `for-in.js` | `title` / `kind` / `lang` | 같음 | 같음 |
  | 10 | `null-prototype.js` | `null` / `false` / `undefined` / `true` / `true` | 같음 | 같음 |
  | 11 | `instanceof.js` | `true` / `true` / `false` / `true` / `true` / `{}` | 같음 | 같음 |

- 본문 근거로 쓸 vm 실행 결과(2026-10-29)
  - `inherited-readonly.js`에 첫 줄 `'use strict';`를 붙이면 `item.id = 2`에서 TypeError
  - 상속된 getter만 있는 프로퍼티에 대입: sloppy는 무시(읽으면 getter 값, 자기 프로퍼티 없음), strict는 TypeError
  - `new Book()`의 `constructor === Book`이고 자기 프로퍼티가 아니다. `Book.prototype = { … }`로 교체한 뒤 만든 객체의 `constructor === Object`
  - `Object.create(1)`·`Object.create(undefined)` → TypeError
  - 메서드 축약과 화살표 함수에는 `prototype` 프로퍼티가 없다(`typeof … .prototype`이 `'undefined'`)
  - 자기 프로퍼티 값이 `undefined`여도 `in`은 true, `obj.x !== undefined`는 false
  - `Object.prototype`에 `__proto__` 접근자(get·set 함수)가 있고, `{}`의 자기 프로퍼티는 아니다. `Object.create(null)` 객체의 `__proto__`는 undefined
  - 상속된 프로퍼티를 `delete`하면 true를 돌려주지만 여전히 읽힌다
  - `Object.getPrototypeOf(F) === Function.prototype`, `Object.getPrototypeOf(Function.prototype) === Object.prototype`, `Object.getPrototypeOf(F.prototype) === Object.prototype`
  - `F.prototype` 서술자: writable true, enumerable false, configurable false. `constructor`는 enumerable false
  - 체인 순환(`Object.setPrototypeOf(a, b)`, b의 프로토타입이 a) → TypeError. `Object.setPrototypeOf(Object.prototype, {})` → TypeError
  - `JSON.stringify`는 상속된 프로퍼티를 넣지 않는다
  - 자기 프로퍼티가 열거 불가이면 같은 이름의 상속된 열거 가능 프로퍼티도 `for...in`에 나오지 않는다
  - `1 instanceof F` → false, `Object.create(null) instanceof Object` → false, `typeof Function.prototype[Symbol.hasInstance]` → `'function'`
  - 상속된 메서드 호출: `({}).hasOwnProperty('x')` → false(메서드가 `Object.prototype`에서 온다)
  - 생성자 자신의 프로퍼티(`Book.count = 1`)는 `new Book().count`로 읽히지 않는다(구현 1단계에서 테스트로 추가)
- MDN ko `Inheritance_and_the_prototype_chain`, `Object/getPrototypeOf`, `Object/create`, `Object/hasOwn`, `Operators/in`, `Operators/instanceof`, `Statements/for...in`, `Object/proto`(구현 1단계에서 200 확인)

### 추정

- 예제 이름 `book`·`base`·`mid`·`item`·`Book`·`a`·`b`·`c`·`saved`·`dict`·`plain`·`key`가 Chromium에서 `in window`가 아니다 — 6단계 브라우저 확인에서 검사한다.
- MDN ko 문서 8개가 모두 있다 — 1단계에서 확인하고 없으면 en-US 링크로 바꾼다.

## 3. 구현 전략

- scope-chain의 탐색 경로 모델과 new-operator의 객체 카드를 조합한다.
  - slug `prototype-chain`, category `objects`
  - 제목 `'프로토타입 체인: 없는 프로퍼티는 어디서 찾을까'`
  - 시뮬레이터 label `'프로토타입 체인 시뮬레이터'`
  - related: `['scope-chain']`(이 페이지의 meta만 바꾼다. 본문에서 "스코프 체인과 이름이 비슷하지만 찾는 대상이 다르다"고 한 줄 비교)
- 상태(`ProtoState`). 개념 간 공유 금지라 타입을 새로 정의한다.
  - `Val`: `string`·`number`·`boolean`·`undefined`·`null`(display)
  - `Ref`: `{ kind: 'ref'; id }` — 카드 객체를 가리킨다
  - `Prop`: `{ key; value: Val | Ref; note?: 'readonly' | 'setter' | 'hidden'; changed?: 'created' | 'updated' }` — `readonly`는 "쓰기 불가", `setter`는 "setter", `hidden`은 "열거 불가" 글자 칩
  - `Proto`: `{ kind: 'ref'; id } | { kind: 'null' } | { kind: 'omitted'; label: 'Function.prototype' }`
  - `ObjectCard`: `{ id; label; props: Prop[]; proto: Proto; builtin?: true; omittedNote?: string; created?: true; protoChanged?: true }`
    - 내장 객체(`Object.prototype`, `Function.prototype`)는 `builtin`과 `omittedNote`("toString·hasOwnProperty 등 다른 프로퍼티 생략")를 둔다.
    - 카드에서 [[Prototype]]은 프로퍼티 목록과 구분된 줄("[[Prototype]] (내부 슬롯) → 라벨")로, 함수의 `prototype`은 평범한 프로퍼티 줄로 그린다. 두 줄의 글자와 모양을 다르게 해서 ③을 보인다.
  - `Binding`: `{ name; declaredWith: 'const' | 'function'; value: Ref | Val; changed?: true }` — 선언문이 실행된 변수만, 함수 선언은 0단계부터(hoisting 개념과 같음)
  - `Lookup`
    - `{ kind: 'get' | 'set'; key; startId; path: { id; found: boolean }[]; end: 'found' | 'null'; outcome: string }` — `path`는 시작 객체부터 처음 찾은 곳까지. `end: 'null'`이면 마지막에 "null — 체인 끝" 칸을 그린다. `outcome` 예: "'book'을 읽음", "undefined", "item에 자기 프로퍼티 color를 만듦"
    - `{ kind: 'instanceof'; startId; targetId; path: { id; match: boolean }[]; end: 'match' | 'null'; outcome: 'true' | 'false' }` — `path`는 시작 객체의 [[Prototype]]부터
  - `ProtoState`: `{ bindings; objects; lookup: Lookup | null }`
- 화면(`ProtoView`): 3영역
  - 탐색 경로(scope-chain과 같은 자리): 찾는 키와 목적("읽기"/"대입"/"instanceof"), 경로를 순서 목록(`<ol>`)으로, 칸마다 "없음"/"찾음"/"일치"/"불일치" 글자, 끝 칸(`null`)과 결과 문장. 색만으로 구분하지 않는다.
  - 변수 영역: 변수 이름 → 값 또는 카드 라벨
  - 객체 카드: 경로에 든 카드에 `data-on-path`와 글자 배지("경로 1", "경로 2"…), 바뀐 칸 강조(`bg-highlight` + `data-changed`), 새 카드 "새로 생김"
  - 375px에서 `flex-wrap`과 줄바꿈
- 시나리오 4개
  - `chain`(예제 2): 객체 3개 생성 → 읽기 4번. title은 item에서, lang은 mid, kind는 base, price는 Object.prototype까지 없어서 null → undefined.
  - `prototype-property`(예제 3): 0단계에 Book 함수 카드(자기 프로퍼티 `prototype` → Book.prototype 카드, [[Prototype]] → Function.prototype 카드)와 Book.prototype 카드(`constructor` → Book, [[Prototype]] → Object.prototype). 4번 줄은 Book에서 `prototype`을 읽고(자기 프로퍼티) Book.prototype에 kind를 만든다. 5번 줄 new는 한 단계(내부 단계는 new-operator로 링크)로 객체 a를 만들고 [[Prototype]]을 Book.prototype으로 둔다. 6~11번 줄은 비교 결과와 a.kind·a.prototype 탐색.
  - `shadowing`(예제 5): 읽기(base에서 찾음) → 대입(set 경로 item 없음 → base의 color는 쓰기 가능한 데이터 → item에 자기 프로퍼티 생성) → 읽기(item에서) → base.color 그대로 → hasOwn(경로 없이 자기 프로퍼티만, lookup null로 두고 단계 설명으로) → delete(item의 color 사라짐) → 읽기(다시 base에서).
  - `instanceof`(예제 11): Book과 처음 prototype 객체(라벨 "처음 Book.prototype") → a 생성 → `a instanceof Book`(a의 [[Prototype]] = 처음 객체, 일치) → `a instanceof Object`(처음 객체 불일치 → Object.prototype 일치) → 7번 줄 교체(새 카드 "새 Book.prototype", Book의 `prototype` 칸 updated, 처음 객체 라벨 "이전 Book.prototype") → `a instanceof Book`(이전 → Object.prototype → null, false) → b 생성·true → `Object.create(Book.prototype)`로 c(생성자 호출 없음)·true → `{}`. Book의 [[Prototype]]은 `omitted` Function.prototype.
  - 나머지 예제(1·4·6~10)는 예제·퀴즈·본문으로 다룬다.
- 정확성 검증
  - (a) 공통 불변식(`assertScenarioInvariants`)
  - (b) 구조: Ref·Proto가 존재하는 카드를 가리킨다, 경로의 연속한 칸이 카드의 `proto`를 따라간다(get·set은 시작 카드부터, instanceof는 시작 카드의 proto부터), `found`·`match`는 마지막 칸만 true(끝이 null이면 모두 false), `changed`·`created`가 이전 단계와의 실제 차이와 같다
  - (c) 스냅샷 대조: 예제의 해당 줄 뒤에 탐침을 끼워 vm 안에서 읽는다. 탐침은 카드마다 실제 객체를 동일성(`===`)으로 대응시킨다(변수, `Object.prototype`, `Function.prototype`, `Object.getPrototypeOf` 결과, Ref 칸으로 도달). 사용자 카드는 자기 프로퍼티(키 순서·데이터 값·`writable`/`enumerable`·접근자 여부)를, 모든 카드는 [[Prototype]] 대상 카드를 비교한다. 내장 카드는 화면에 둔 프로퍼티가 자기 프로퍼티로 있는지만 확인한다. 탐침은 접근자 값을 읽지 않는다(서술자만).
  - (d) 경로 대조: get·set 단계는 vm 안에서 시작 객체부터 `Object.getPrototypeOf`를 따라 `Object.hasOwn(o, key)`가 처음 true인 객체(없으면 null)까지의 목록을 만들어 `path`와 비교한다. instanceof 단계는 `Object.getPrototypeOf`를 따라가며 `=== F.prototype`인 곳(없으면 null)까지와 비교하고, 결과가 실제 `instanceof` 값과 같다.
  - (e) 음성 확인: `chain`의 kind를 mid에서 찾은 것으로 그리면 실패, `shadowing`의 대입이 base를 바꾼 것으로 그리면 실패, `instanceof` 교체 뒤 a 결과를 true로 그리면 실패해야 한다.
- 버린 대안
  - ① `__proto__`로 예제 작성: 명세 "Normative Optional, Legacy"이고 null 프로토타입 객체에는 없다(사용자 결정).
  - ② 생성자 함수만으로 체인 만들기: 3단계 체인에 프로토타입 교체나 `Object.setPrototypeOf`가 필요하다. `Object.create`가 [[Prototype]]을 정한다는 것이 더 직접적이다.
  - ③ 상속된 메서드를 `this`와 함께 쓰기: 22장이다. 예제는 데이터 프로퍼티와 `this`를 쓰지 않는 함수만 쓴다.
  - ④ 읽기 전용·setter·for...in을 시나리오로: 경로 그림은 `shadowing`과 같고 차이는 결과 문장뿐이라 예제·퀴즈로 충분하다.
  - ⑤ `Function.prototype`을 모든 함수 시나리오에 카드로: `instanceof`에서는 카드가 8개가 되어 375px에서 읽기 어렵다. `prototype-property`에서만 카드로 두고 `instanceof`는 `omitted` 표시.

## 4. 변경 파일

- 추가 `app/concepts/prototype-chain/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 11개(2절 표)
  - `scenarios.ts`, `ProtoView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정
  - `tests/e2e/navigation.spec.ts:17`, `:32`: `toHaveCount(3)` → `toHaveCount(4)`(new-operator 때 사용자 결정과 같은 방식, 다른 줄은 그대로)
  - `tests/e2e/helpers.ts`: `PROTOTYPE_CHAIN_PATH`, `PROTOTYPE_CHAIN_SIMULATOR_NAME` 추가
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: new-operator 케이스를 본떠 추가만
  - `docs/content-guide.md:164`: e2e 목록에 `prototype-chain`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 6번 행·진행 기록
- 변경하지 않음
  - 공통 코드(`app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`), `package.json`, `AGENTS.md`
  - 기존 개념 폴더 16개. 역방향 연결은 9절 후보.

## 5. 위험 요소

- "상속된 프로퍼티는 복사된다"로 읽히는 서술 → 결과의 원인을 OrdinaryGet의 탐색으로 쓰고, 예제 4(나중에 추가해도 보임)와 `JSON.stringify`로 막는다(AGENTS 정확성 원칙: "복사" 비유 금지).
- `prototype`과 [[Prototype]] 혼동 → 카드에서 두 줄을 다르게 그리고, 예제 3에서 `Object.getPrototypeOf(Book) !== Book.prototype`을 보인다.
- 대입 설명을 "프로토타입을 보지 않고 바로 만든다"로 단순화 → OrdinarySet은 체인을 확인한다. set 경로를 시뮬레이터에 그리고 ⑥(읽기 전용·setter)으로 체인 확인이 결과를 바꾸는 경우를 보인다.
- `for...in` 순서를 항상 보장된 것처럼 서술 → "이 예제처럼 일반 객체이고 열거 중 바뀌지 않으면 명세가 순서를 정한다(자기 키 → 프로토타입)"로 한정하고 단순화에 적는다.
- `instanceof`를 "그 생성자로 만들었는지"로 설명 → OrdinaryHasInstance 단계로 쓰고 예제 11의 c(생성자 호출 없음)·교체 결과로 막는다. Symbol.hasInstance는 단순화에 적는다.
- `this`·래퍼 객체·클래스를 앞서 설명 → "별도 개념"으로만 쓴다. setter가 receiver로 호출된다는 사실은 단순화에 적되 예제는 바깥 변수(`saved`)를 쓴다.
- `inherited-readonly.js`가 모듈에서 TypeError → 단순화와 `.mjs` 테스트로 밝힌다.
- 탐침이 getter·setter를 호출해 상태를 바꾸는 것 → 탐침은 `Object.getOwnPropertyDescriptors`·`Object.getPrototypeOf`만 쓴다.
- 내장 카드의 프로퍼티를 전부 그린 것처럼 보임 → `omittedNote`로 생략을 밝힌다.
- 범위가 넓어 본문이 길어짐 → h3 9개를 각각 짧게, 예제마다 퀴즈 하나, 표 하나(`in`·`hasOwn`·`for...in` 비교)로 정리한다.
- `navigation.spec.ts` 첫 카드 검사 → 2절 정렬 확인, 6단계 e2e로 확인
- 375px에서 카드 5~7개 넘침 → `flex-wrap`, e2e 가로 스크롤 검사

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 11개의 실제 출력이 `expectedOutput`과 같다.
  - 본문 주장 근거 테스트(2절 vm 목록), `.mjs`·`.cjs` 출력이 2절 표와 같다, `inherited-readonly.js`에 `'use strict';`를 붙이면 TypeError(모듈 결과와 일치)
  - 시나리오 대조(3절 a~e)
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. 첫 화면: "검토 중" 배지, 분류 '객체와 프로토타입', 선행 개념 링크, 퀴즈 라디오 UI
  2. `chain`: price 읽기 단계에서 경로 item → mid → base → Object.prototype → null, 결과 undefined, 마지막 콘솔 `JS` / `ko` / `book` / `undefined`
  3. `prototype-property`: 0단계에 Book·Book.prototype·Function.prototype·Object.prototype 카드, Book 카드의 `prototype` 줄과 [[Prototype]] 줄이 서로 다른 카드를 가리킴, new 단계에서 a의 [[Prototype]] → Book.prototype
  4. `shadowing`: 대입 단계에서 경로 item(없음) → base(찾음)와 결과 "item에 자기 프로퍼티 color를 만듦", base 카드 값 'red' 유지, delete 뒤 읽기가 base에서 찾음
  5. `instanceof`: 교체 단계에서 Book의 `prototype` 칸 바뀜, 교체 뒤 `a instanceof Book` 경로가 null까지 불일치, 결과 false
  6. 375px·다크에서 2~5 반복: 가로 넘침 0, 키보드 ←/→/Home, 콘솔 에러 0
  7. 홈: '객체와 프로토타입' 그룹 카드 3개, 전체 카드 17개, `객체` 검색 4건(첫 카드 '원시 값과 객체'), `프로토타입` 검색 1건 이상
  8. 예제 이름이 `in window`가 아님(2절 추정)

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `app/concepts/prototype-chain/examples/*.js`(11개), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장 부분), 필수 h2 자리표시용 `content.mdx`
- 변경
  - 예제 11개는 아래 원문 그대로 둔다(` / `는 줄 구분, 들여쓰기 2칸, 끝 줄바꿈 1개). 원본은 scratchpad 초안과 같다.
    - `literal.js`: `const book = { title: 'JS' };` / `console.log(Object.getPrototypeOf(book) === Object.prototype);` / `console.log(typeof book.toString);` / `console.log(Object.hasOwn(book, 'toString'));` / `console.log(Object.getPrototypeOf(Object.prototype));` / `console.log(book.price);`
    - `chain.js`: `const base = { kind: 'book' };` / `const mid = Object.create(base);` / `mid.lang = 'ko';` / `const item = Object.create(mid);` / `item.title = 'JS';` / `console.log(item.title);` / `console.log(item.lang);` / `console.log(item.kind);` / `console.log(item.price);`
    - `prototype-property.js`: `function Book(title) {` / `  this.title = title;` / `}` / `Book.prototype.kind = 'book';` / `const a = new Book('JS');` / `console.log(Object.getPrototypeOf(a) === Book.prototype);` / `console.log(Object.getPrototypeOf(Book) === Book.prototype);` / `console.log(Object.getPrototypeOf(Book) === Function.prototype);` / `console.log(a.kind);` / `console.log(a.prototype);` / `console.log(Book.prototype.constructor === Book);`
    - `shared.js`: `function Book(title) {` / `  this.title = title;` / `}` / `const a = new Book('JS');` / `const b = new Book('CSS');` / `console.log(a.kind);` / `Book.prototype.kind = 'book';` / `console.log(a.kind);` / `console.log(b.kind);` / `console.log(JSON.stringify(a));`
    - `shadowing.js`: `const base = { color: 'red' };` / `const item = Object.create(base);` / `console.log(item.color);` / `item.color = 'blue';` / `console.log(item.color);` / `console.log(base.color);` / `console.log(Object.hasOwn(item, 'color'));` / `delete item.color;` / `console.log(item.color);`
    - `inherited-readonly.js`: `const base = {};` / `Object.defineProperty(base, 'id', { value: 1, writable: false });` / `const item = Object.create(base);` / `item.id = 2;` / `console.log(item.id);` / `console.log(Object.hasOwn(item, 'id'));` / `Object.defineProperty(item, 'id', { value: 2, writable: true });` / `console.log(item.id);` / `console.log(base.id);`
    - `inherited-setter.js`: `let saved = '';` / `const base = {` / `  set name(value) {` / `    saved = value;` / `  },` / `};` / `const item = Object.create(base);` / `item.name = 'JS';` / `console.log(saved);` / `console.log(Object.hasOwn(item, 'name'));` / `console.log(item.name);`
    - `in-hasown.js`: `const base = { kind: 'book' };` / `const item = Object.create(base);` / `item.title = 'JS';` / `console.log('title' in item);` / `console.log('kind' in item);` / `console.log('toString' in item);` / `console.log(Object.hasOwn(item, 'title'));` / `console.log(Object.hasOwn(item, 'kind'));`
    - `for-in.js`: `const base = { kind: 'book', lang: 'ko' };` / `Object.defineProperty(base, 'hidden', { value: 1, enumerable: false });` / `const item = Object.create(base);` / `item.title = 'JS';` / `item.kind = 'ebook';` / `for (const key in item) {` / `  console.log(key);` / `}`
    - `null-prototype.js`: `const dict = Object.create(null);` / `dict.title = 'JS';` / `console.log(Object.getPrototypeOf(dict));` / `console.log('toString' in dict);` / `console.log(typeof dict.hasOwnProperty);` / `console.log(Object.hasOwn(dict, 'title'));` / `const plain = Object.create(Object.prototype);` / `console.log(Object.getPrototypeOf(plain) === Object.prototype);`
    - `instanceof.js`: `function Book(title) {` / `  this.title = title;` / `}` / `const a = new Book('JS');` / `console.log(a instanceof Book);` / `console.log(a instanceof Object);` / `Book.prototype = { kind: 'book' };` / `console.log(a instanceof Book);` / `const b = new Book('CSS');` / `console.log(b instanceof Book);` / `const c = Object.create(Book.prototype);` / `console.log(c instanceof Book);` / `console.log(JSON.stringify(c));`
  - `meta.ts`
    - slug, title, category, related는 3절대로 한다.
    - summary(160자 이하): 객체에 없는 프로퍼티는 [[Prototype]]이 가리키는 객체에서 이어서 찾고 null에서 끝난다, 함수의 prototype 프로퍼티와 객체의 [[Prototype]]은 다르다, 대입은 프로토타입이 아니라 그 객체에 프로퍼티를 만든다.
    - tags: `프로토타입`, `prototype`, `[[Prototype]]`, `프로토타입 체인`, `상속`, `섀도잉`, `Object.create`, `Object.getPrototypeOf`, `Object.hasOwn`, `in`, `for...in`, `instanceof`, `constructor`, `__proto__`
    - goals 4개: 프로퍼티 읽기가 체인을 따라가는 순서와 끝(null) 설명 / `prototype` 프로퍼티와 [[Prototype]] 구분과 `new`·`Object.create`가 [[Prototype]]을 정하는 방식 / 대입·섀도잉과 상속된 읽기 전용·setter가 있을 때의 결과 예측 / `in`·`Object.hasOwn`·`for...in`·`instanceof`가 체인을 어떻게 보는지 설명
    - prerequisites: `property-keys`, `property-attributes`(writable·접근자·strict TypeError), `new-operator`
    - examples 11개(2절 출력)
    - `reviewedAt: null`
  - 단순화
    - ① [[Prototype]]·[[Get]]·[[Set]]은 명세의 내부 슬롯·내부 메서드 이름이며 코드에서 직접 접근할 수 없다. 이 페이지는 `Object.getPrototypeOf`로 읽는다. 시뮬레이터의 카드와 화살표는 교육용 그림이며 엔진이 객체를 저장하는 방식이 아니다.
    - ② `__proto__`는 `Object.prototype`의 접근자 프로퍼티이며 명세에서 "Normative Optional, Legacy"로 분류된다. [[Prototype]] 슬롯 자체가 아니고, null 프로토타입 객체에는 없다. 객체 리터럴의 `__proto__:` 문법과 `Object.setPrototypeOf`는 다루지 않는다.
    - ③ 상속된 메서드를 호출할 때의 `this`는 별도 개념이다. 예제는 `this`를 쓰지 않는다. 상속된 getter·setter는 명세상 읽거나 대입한 객체(receiver)를 this로 호출되지만 예제는 바깥 변수만 쓴다.
    - ④ `instanceof`는 명세상 오른쪽 값의 `Symbol.hasInstance` 메서드를 먼저 확인하고, 일반 함수는 `Function.prototype`의 그 메서드가 이 페이지의 체인 비교(OrdinaryHasInstance)를 한다. `Symbol.hasInstance`를 직접 정의한 경우와 bind로 만든 함수는 다루지 않는다.
    - ⑤ `for...in`의 순서는 명세가 일부만 정한다. 이 페이지의 예제처럼 일반 객체이고 열거하는 동안 체인과 프로퍼티가 바뀌지 않으면 자기 프로퍼티 다음 프로토타입 순서다. Symbol 키는 열거하지 않는다. 배열을 돌려주는 `Object.keys` 등은 별도 개념이다.
    - ⑥ 시뮬레이터의 `Object.prototype`·`Function.prototype` 카드는 이 페이지에 필요한 프로퍼티만 보이고 나머지는 생략한다. `instanceof` 시나리오는 Book의 [[Prototype]](`Function.prototype`)을 카드 없이 이름으로만 표시한다.
    - ⑦ `new Book(...)`의 내부 단계(새 객체 생성, this 연결, 본문 실행)는 new 연산자 개념에서 다루고, 시뮬레이터는 한 단계로 그린다. 함수 선언은 선언 처리로 실행 전에 만들어지므로(호이스팅 개념) 0단계부터 보인다.
    - ⑧ 클래스와 `extends`로 만드는 체인, 원시 값의 프로퍼티 접근(래퍼 객체)은 별도 개념에서 다룬다.
    - ⑨ `inherited-readonly.js`는 ES 모듈(항상 strict mode)에서는 4번 줄에서 TypeError로 끝난다. 직접 작성한 CommonJS 파일은 이 페이지의 실행 결과와 같다.
    - ⑩ 시뮬레이터는 선언문이 실행된 변수만 보이며 `console`·`JSON`·`Object.getPrototypeOf` 호출 과정과 `Object`·`Function` 바인딩을 생략한다.
  - references: 2절 앵커 중 OrdinaryGet, OrdinarySetWithOwnDescriptor, OrdinaryHasProperty, `Object.hasOwn`, EnumerateObjectProperties, `Object.create`, OrdinaryObjectCreate, `Object.getPrototypeOf`, MakeConstructor, InstanceofOperator, OrdinaryHasInstance, `Object.prototype.__proto__`와 MDN ko 8개(2절)
  - `concept.test.ts` 본문 주장 `describe`
    - 2절 vm 목록 전부(정적 프로퍼티 포함)
    - `.mjs`·`.cjs` 출력이 2절 표와 같다
    - `inherited-readonly.js`에 첫 줄 `'use strict';`를 붙이면 TypeError(모듈 결과와 일치)
- 주의사항
  - `console.log`에는 원시 값과 `JSON.stringify` 결과만 넘긴다(`Object.getPrototypeOf(dict)`는 `null`).
  - 예제는 Prettier·ESLint 제외 경로다.
  - vm 테스트에서 realm이 다르므로 호스트에서 `instanceof`·`Object.prototype` 비교를 하지 않는다. 판정은 vm 안에서 하고 결과만 꺼낸다.
- 완료 조건
  - `npm test`에서 L1 11개와 본문 주장 테스트가 통과한다.
  - lint·format:check·typecheck가 통과한다.
  - summary 160자 이하(content-integrity 테스트), MDN 링크 8개 200 확인

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오 부분)
- 변경
  - 3절 상태 모델과 시나리오 4개를 만든다. 줄마다 1단계, 실행 전 0단계. `chain` 10단계, `shadowing` 10단계, `prototype-property` 9단계(4번 줄 1단계, 5번 줄 new 1단계), `instanceof` 11단계(1~3번 줄 함수 선언은 0단계)가 기준이며, 구현 중 바뀌면 사유를 구현 진행에 기록한다.
  - 테스트: 3절 (a)~(d)와 단계 수 고정
- 주의사항
  - 단계 설명은 2절 명세 순서와 맞춘다(get: 자기 프로퍼티 → [[Prototype]], set: 체인 확인 후 receiver에 생성).
  - 탐침은 vm 안에서 실행하고 결과를 JSON으로 넘긴다. 탐침을 끼운 코드의 콘솔 출력이 원본과 같은지 검사한다.
- 완료 조건
  - 이 개념 테스트가 전부 통과한다.
  - 음성 확인 3건(3절 (e))은 서브에이전트가 실행해 실패를 확인하고 되돌린다. 메인이 테스트 코드를 확인한다.

### 3. 시각화 `ProtoView`

- 대상: `ProtoView.tsx`, `ProtoView.test.tsx`
- 변경: 3절 화면. scope-chain `ScopeView`의 탐색 경로 영역과 new-operator `NewView`의 카드 클래스를 기반으로 한다.
- 주의사항: effect와 window 접근을 쓰지 않는다. 경로·일치 여부를 색만으로 구분하지 않는다. 375px에서 줄바꿈된다.
- 완료 조건
  - `ProtoView.test.tsx`가 통과한다. 검사 항목: 빈 상태, get 경로("없음"·"찾음"과 null 끝 칸), set 경로와 결과 문장, instanceof 경로("불일치"·"일치"), 카드의 `prototype` 줄과 [[Prototype]] 줄이 다른 글자로 그려짐, 내장 카드 생략 문구, `omitted` [[Prototype]] 표시, 프로퍼티 칩(쓰기 불가·setter·열거 불가), 바뀐 칸·새 카드 표시
  - typecheck가 통과한다.

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="프로토타입 체인 시뮬레이터"`, new-operator 래퍼와 같은 형태
- 완료 조건: 테스트 4개(첫 화면, `chain`의 price 탐색 단계 문구, 시나리오 전환, 마지막 콘솔)가 통과한다.

### 5. 본문 content.mdx

- `## 동작 원리`의 h3
  - 모든 객체에는 [[Prototype]]이 있다(리터럴 → Object.prototype → null, `Object.getPrototypeOf`, `__proto__`는 레거시 접근자)
  - 프로퍼티를 읽을 때: 프로토타입 체인(OrdinaryGet, scope-chain과 이름만 비슷함)
  - 함수의 `prototype` 프로퍼티와 [[Prototype]](MakeConstructor, new, `constructor`, 메서드 축약·화살표 함수에는 없음, 정적 프로퍼티)
  - 체인은 읽을 때마다 따라간다(나중에 추가, `JSON.stringify`는 자기 프로퍼티만)
  - 대입은 자기 프로퍼티를 만든다: 섀도잉(OrdinarySet, delete)
  - 상속된 읽기 전용 프로퍼티와 setter(sloppy·strict, getter만 있는 경우)
  - 프로퍼티가 있는지 확인하기: `in`·`Object.hasOwn`·`for...in`(JSX `<table>`로 비교, 값이 undefined인 자기 프로퍼티)
  - `Object.create`와 null 프로토타입(TypeError 조건)
  - `instanceof`는 체인에서 `prototype`을 찾는다(교체, `constructor`가 Object가 되는 것)
- `## 예제`: 예제 1~11에 `file=` 코드 블록과 PredictQuiz를 둔다. 끝에 `### 시뮬레이터로 확인하기`.
- `## 결과와 이유`
  - 예제별 설명
  - 오해 Callout: ① 상속된 프로퍼티는 자식 객체에 복사된다 ② `F.prototype`은 F의 프로토타입이다 ③ 대입하면 프로토타입의 값이 바뀐다 ④ `obj.x !== undefined`나 `in`으로 자기 프로퍼티인지 알 수 있다 ⑤ `instanceof`는 그 생성자로 만들었는지 확인한다 ⑥ `__proto__`는 [[Prototype]] 그 자체다
- 링크: property-keys, property-attributes(writable·접근자·strict TypeError), new-operator, scope-chain(이름 비교), hoisting(함수 선언이 실행 전에 만들어짐), typeof-operator(`typeof`로 함수 확인)
- 주의사항
  - 2절의 확인된 사실만 쓴다. 오류 메시지 문구를 인용하지 않는다.
  - 결과의 원인을 "복사"로 쓰지 않는다. `this`·클래스·래퍼 객체는 "별도 개념"으로만 쓴다.
  - `**`와 깨진 인라인 code가 없어야 한다(content-guide 4단계 주의). `[[Prototype]]`처럼 대괄호가 든 인라인 code가 MDX에서 깨지지 않는지 빌드 HTML로 확인한다.
- 완료 조건
  - 메인이 전문을 2절과 대조한다.
  - `npm test`와 build가 성공한다.
  - HTML `<details` 수가 퀴즈 수(11)와 같고, `**`가 0개다.

### 6. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: new-operator 케이스를 본떠 추가만(`chain` price 탐색 단계 문구 확인 e2e 1개 포함). `navigation.spec.ts`는 두 줄의 기대값만 4로. content-guide 목록과 로드맵 6번 행·진행 기록.
- 완료 조건: 전체 검증 명령이 통과하고, 6절 브라우저 시나리오 1~8을 확인한다.

## 9. 추가 개선 후보

- 추가 게시글 후보: "같은 이름의 열거 불가 자기 프로퍼티가 for...in에서 상속 프로퍼티를 가린다"는 이 페이지의 근거 테스트로만 두고 별도 게시글로는 만들지 않는다. 19장의 정적 프로퍼티·프로토타입 교체는 이 페이지에 한두 문장으로 담았다. 추가 게시글 후보 없음.
- 기존 개념 역방향 연결: `property-keys/meta.ts:86`, `property-attributes/meta.ts:94`, `new-operator/meta.ts:94`의 "별도 개념(프로토타입)" 문구와 `related`에 이 페이지를 거는 일(기존 개념 수정, 사용자 확인)

## 변경 이력

- 2026-10-29 (구현 중 사실 확인): 단계 수 `prototype-property` 12→9, `instanceof` 13→11. 원래 수는 선언 줄(1~3번)을 실행 단계로 센 값으로, "줄마다 1단계 + 함수 선언은 0단계" 원칙과 모순이었다. 원칙대로 고쳤다. 영향 단계 2.
- 2026-10-29 (사용자 요청 — 외부 콘텐츠 검수 7건 반영): 모두 vm 실행·명세로 확인 후 반영. ① summary의 절대 문장 "대입은 그 객체에 프로퍼티를 만듭니다" → "보통 … 상속된 읽기 전용 프로퍼티나 setter가 있으면 달라집니다"(160자 이하로 다듬음) ② 단순화 ⑨의 파일명·CommonJS 표현 → "예제 6을 .mjs나 package.json \"type\": \"module\"로 실행하면 TypeError, 클래식 스크립트·.cjs는 같음" ③ "F.prototype이 가리키는 객체의 [[Prototype]]은 Object.prototype" → 함수가 기본으로 받는 prototype 객체로 한정 ④ "메서드 축약에는 prototype 없음" → 일반 메서드로 한정, 제너레이터 메서드는 예외(별도 개념) ⑤ JSON.stringify "자기 프로퍼티만" → "열거 가능한 자기 프로퍼티만"(본문 2곳) ⑥ for...in 순서 문장을 "명세는 조건을 만족하는 경우에만 순서를 정한다"로 ⑦ 대입받는 객체가 확장 불가이면 자기 프로퍼티가 생기지 않는다는 한 문단 추가(property-attributes 링크). 비기술: 퀴즈 정답 위치가 10개 연속 4번이라 선택지 순서를 바꿔 위치를 분산(1·0·2·1·0·2·3·1·0·2·3, 정답 = expectedOutput 대조 확인). 근거 테스트 4개 추가. 범위·접근 방식 변화 없음 — 영향 단계 1(meta), 5(본문).

## 구현 진행

- baseline (2026-10-29, `17051a2`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 61파일 1584 통과(메인 실행). `test:build` 127·`e2e` 235 통과(3 skipped)는 같은 커밋 내용의 직전 검증 결과(검토 승인 기록 커밋 전 전체 재실행). dev 서버 5173 실행 중, serve 4175 미실행.
- [x] 1. 예제·meta·route·본문 주장 테스트 — 서브에이전트 작성, 메인 재실행: lint·format:check·typecheck 통과, 이 개념+L1+L3 3파일 337 통과. 예제 11개 = 계획 초안(`cmp` 차이 없음), route = new-operator와 동일. 본문 주장 테스트 21개(2절 vm 목록 전부 + 정적 프로퍼티 + strict 지시어) + ESM/CJS 비교. MDN ko 8개 200, 명세 앵커 12개 확인. meta 메인 검토: summary·goals·단순화 ①~⑩·references 20개 계획과 일치.
- [x] 2. 시나리오와 대조 테스트 — 서브에이전트 작성. 메인 재실행: lint·format·typecheck 통과, 이 개념 112 통과. 단계 수 10/9/10/11(변경 이력). (a) 공통 불변식 (b) 참조 무결성·경로가 카드 proto를 따라감·found/match는 마지막 칸만·changed/created/protoChanged = 실제 차이 (c) 모든 단계 탐침 대조(카드 ↔ 실제 객체 `===`, 자기 프로퍼티 키 순서·값·writable·enumerable·접근자 여부, [[Prototype]] 대상, 접근자 값은 읽지 않음, 탐침 코드 출력 = 원본) (d) get·set 경로와 instanceof 경로·결과를 vm 안 실제 체인과 대조(set은 대입 직전 경로와 대입 뒤 상태를 각각). 음성 확인 3건(서브에이전트 실행·원복): chain kind를 mid에서 찾음 → 2 실패, shadowing 대입이 base를 바꿈 → 2 실패(첫 시도 1 실패로 대입 뒤 탐침 보강), instanceof 교체 뒤 true → 2 실패. 메인 검토 수정 3건: ① Function.prototype 카드 생략 안내가 Object.prototype 것(hasOwnProperty 등)이었음 → 'call·apply·bind 등' ② chain 3단계 "다음 시나리오"가 실제 순서와 다름 → "대입과 섀도잉" 시나리오 ③ `a instanceof Object` 설명에 비교 대상이 Object의 prototype 값임을 명시. 단계 설명을 OrdinaryGet·OrdinarySetWithOwnDescriptor·OrdinaryHasInstance 순서와 대조 — 그 외 수정 없음.
- [x] 3. 시각화 `ProtoView` — 서브에이전트 작성(테스트 10개). 메인 검토: effect·window·document 없음(grep), 경로 칸·일치 여부·바뀐 칸 모두 글자 배지 병행, [[Prototype]] 줄(점선·이탤릭·"[[Prototype]] (내부 슬롯)")과 `prototype` 프로퍼티 줄이 다른 글자·모양. 참고(Low): null 끝 칸에 "null"·"체인 끝" 배지·"null — 체인 끝"이 함께 있어 글자가 겹침(보고만).
- [x] 4. 래퍼 `Simulator` — new-operator 래퍼와 같은 형태(label만 다름, diff 확인), 테스트 4개.
- [x] 5. 본문 content.mdx — 서브에이전트 작성(h3 9, 퀴즈 11, misconception 6, `<table>` 1). 메인이 전문을 명세·실행 결과와 대조해 수정: ① "모든 객체는 [[Prototype]] 슬롯" → 일반 객체(ordinary object)로 한정, h3 제목도 "객체에는 [[Prototype]]이 있다", 단순화 ①에 Proxy 등 특수 객체는 별도 개념 추가 ② `new F()`에서 F.prototype이 객체가 아니면 Object.prototype이 쓰임 추가 ③ instanceof 단계 순서를 OrdinaryHasInstance대로(왼쪽 값이 객체가 아니면 F.prototype을 읽기 전에 false → F.prototype이 객체가 아니면 TypeError → 체인 비교) ④ [[Set]] 설명의 해석 문장("대입을 허용할지 확인하는 것이 목적") → "처음 만나는 프로퍼티를 확인하고 그 종류가 결과를 정한다" ⑤ 예제 3 결과 설명의 호이스팅 언급을 "선언이 실행 전에 처리되어 함수와 prototype 객체가 처음부터 있다"로 ⑥ 객체 리터럴 근거에 예제 1 추가 ⑦ Callout 2곳의 줄바꿈된 인라인 code(`writable:   false`, `!==  undefined`)를 문장 변경으로 해소. 근거 테스트 3개 추가(F.prototype 비객체 → Object.prototype, instanceof 판정 순서, in은 열거 불가 toString에도 true). 메인 재실행: lint·format·typecheck 통과, `npm test` 64파일 1735 통과, build 성공, HTML `<details` 11·`**` 0·`<table` 1·공백 든 깨진 code 0.
- [x] 6. e2e·빌드 테스트·문서 — 서브에이전트가 테스트 4파일에 추가만(new-operator 케이스 본뜸 + `chain` '단계 10: item.price 읽기'·'null — 체인 끝' e2e), `navigation.spec.ts` `toHaveCount(3)` 두 곳만 4로, content-guide 목록·로드맵 6번 행·진행 기록. 메인이 diff 확인 후 전체 재실행: lint·format·typecheck 통과, `npm test` 64파일 1735, `test:build` 134, `e2e` 251 통과·3 skipped(기존). 브라우저(빌드 serve 4175, Playwright, 데스크톱 라이트·375px 다크): 시나리오 4개 단계 수 10/9/10/11, get 경로 "없음"/"찾음"과 null 끝 칸, set 경로와 "새로 생김", instanceof "불일치"/"일치"와 교체 뒤 null 끝, 가로 넘침 0, 콘솔 에러 0, 예제 이름 `in window` 없음([]), '검토 중' 1·'객체와 프로토타입' 1·라디오 48(퀴즈 44 + 시나리오 4), 홈 카드 17·`객체` 4(첫 카드 '원시 값과 객체')·`프로토타입` 1. 375px 다크 `prototype-property` 8단계 스크린샷 육안 확인 → 수정 1건: 내장 카드(Object.prototype·Function.prototype)에 "자기 프로퍼티 없음"이 표시되어 사실과 다름(생략했을 뿐 자기 프로퍼티가 있음) → 생략 안내가 있는 카드는 그 문구를 그리지 않음(`ProtoView.tsx`), 테스트 2개 추가. 재실행: `npm test` 1736, `test:build` 134, `e2e` 251 통과·3 skipped.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가 + 기대값 2줄 + 문서): 새 Critical/High 0. 명세 불일치·사실 오류는 2·5·6단계 메인 대조에서 수정 완료(Function.prototype 생략 안내, instanceof 판정 순서, 일반 객체 한정, F.prototype 비객체, 내장 카드 "자기 프로퍼티 없음"). 확인한 것: 단계 설명·본문이 OrdinaryGet·OrdinarySetWithOwnDescriptor·OrdinaryHasProperty·HasOwnProperty·EnumerateObjectProperties(순서 한정)·Object.create·MakeConstructor·OrdinaryHasInstance와 일치, 모든 실행 결과 주장에 테스트 존재(`.mjs`·`.cjs`·지시어 재실행 포함), 탐침은 서술자만 읽고 getter·setter를 호출하지 않음, 경로는 vm 안 실제 체인과 `===`로 대조, ProtoView에 effect·window 없음(하이드레이션), "복사" 원인 서술 없음(부정문 1곳뿐), 오류 메시지 인용 없음, e2e 추가 케이스는 기존 케이스 수정 없음. Low 2: ① null 끝 칸에 "null"·"체인 끝" 배지·"null — 체인 끝"이 겹쳐 표시(정보 손실 없음) ② 단순 대입 단계(chain의 `mid.lang`, prototype-property의 `Book.prototype.kind`)는 set 경로를 그리지 않고 설명으로만 다룸(set 경로는 shadowing 시나리오의 초점). 둘 다 보고만.
- [x] 7. 외부 콘텐츠 검수 반영(변경 이력 2026-10-29 검수 7건) — 메인 직접(본문·meta 문장, 퀴즈 선택지 순서, 근거 테스트 4개). 재실행: lint·format·typecheck 통과, `npm test` 64파일 1740, `test:build` 134, `e2e` 251 통과·3 skipped, HTML `<details` 11·`**` 0·깨진 code 0, 퀴즈 정답 11개 = expectedOutput.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 예제 11개, 시나리오 4개(10/9/10/11단계), 퀴즈 11, misconception 6, `<table>` 1. 공통 코드와 기존 개념 파일은 바꾸지 않았고 `navigation.spec.ts`는 기대값 두 곳만 4로 바꿨다.
- 계획과 달라진 점: 시나리오 단계 수를 "줄마다 1단계 + 함수 선언은 0단계" 원칙대로 바로잡았다(`prototype-property` 12→9, `instanceof` 13→11, `변경 이력`). 본문은 메인 대조(일반 객체 한정, instanceof 판정 순서, F.prototype 비객체 등)와 외부 콘텐츠 검수 7건으로 다듬었고 근거 테스트를 더했다. 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- 새 Critical/High 0. 명세 불일치·사실 오류(Function.prototype 생략 안내, instanceof 판정 순서, 일반 객체 한정, F.prototype 비객체, 내장 카드 "자기 프로퍼티 없음")는 구현 단계에서 수정했다. Low 2건(null 끝 칸 글자 겹침, 단순 대입 단계는 set 경로를 그리지 않음)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록
- [ ] (선택) 리뷰 Low 2건
- [ ] (선택) 9절 기존 개념 역방향 연결(property-keys·property-attributes·new-operator의 "별도 개념(프로토타입)" 문구와 `related`)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시나리오의 set 경로는 "대입 직전" 체인을 그리고, 테스트는 대입 직전 경로와 대입 뒤 상태를 탐침 두 개로 따로 대조했다 — 대입 뒤에는 item에 자기 프로퍼티가 생겨 경로가 달라지므로, 한 탐침으로는 "base를 확인한 뒤 item에 만든다"를 검증할 수 없다.
- [Claude 판단] 시뮬레이터의 `Object.prototype`·`Function.prototype` 카드는 생략 안내만 두고 "자기 프로퍼티 없음"을 그리지 않는다 — 실제로는 자기 프로퍼티가 많고 그림에서 뺐을 뿐이라, "없음"은 사실과 다른 표시가 된다.
- [Claude 판단] instanceof 설명을 OrdinaryHasInstance 순서(왼쪽이 객체가 아니면 false → F.prototype이 객체가 아니면 TypeError → 체인 비교)로 고쳤다 — 순서가 바뀌면 `1 instanceof F`(F.prototype이 1)가 TypeError라고 잘못 예측하게 된다.
- [무검토 승인] 상속된 메서드를 쓰는 예제 대신 데이터 프로퍼티와 `this` 없는 예제만 썼다 — 상속된 메서드의 this는 22장(8번 개념)이다.
- [무검토 승인] instanceof 시나리오는 Book의 [[Prototype]](Function.prototype)을 카드 없이 이름으로만 표시했다 — 카드가 8개가 되어 375px에서 읽기 어렵다.
- 범위(상속된 setter·읽기 전용, in·hasOwn·for...in, Object.create·null 프로토타입, instanceof)와 `getPrototypeOf` 중심 예제는 사용자 결정. 외부 검수 7건 반영은 사용자 요청.

#### 배경지식

- 읽기(OrdinaryGet)는 자기 프로퍼티 → [[Prototype]] → … → null 순서로 찾고, null이면 undefined다.
- 대입(OrdinarySetWithOwnDescriptor)도 체인을 따라 처음 만나는 같은 이름의 프로퍼티를 본다. 쓰기 가능한 데이터 프로퍼티이거나 아무것도 없으면 대입한 객체(receiver)에 자기 프로퍼티를 만들고, `writable: false`면 실패, setter가 있으면 setter를 호출한다.
- 함수의 `prototype`은 평범한 프로퍼티이고 `new`가 그 값을 새 객체의 [[Prototype]]으로 쓴다. 함수 자신의 [[Prototype]]은 Function.prototype이다.
- `in`은 체인 전체(열거 가능 여부 무관), `Object.hasOwn`은 자기 프로퍼티만, `for...in`은 체인의 열거 가능한 문자열 키를 본다.

#### 확인 질문

1. `item.color = 'blue'`가 base의 color를 바꾸지 않는데도, 명세상 대입은 왜 base까지 확인해야 할까?
   <details><summary>답</summary>체인에서 처음 만난 color가 쓰기 불가이거나 setter이면 결과가 달라지기 때문이다(실패하거나 setter 호출). 쓰기 가능한 데이터 프로퍼티일 때만 item에 자기 프로퍼티를 만든다. 계획 2절 OrdinarySetWithOwnDescriptor, 예제 5·6·7.</details>
2. `Object.getPrototypeOf(Book) === Book.prototype`은 왜 false일까?
   <details><summary>답</summary>Book.prototype은 Book이 new로 만들 객체의 [[Prototype]]이 될 값을 담은 프로퍼티이고, Book 자신의 [[Prototype]]은 Function.prototype이다. 예제 3, prototype-property 시나리오.</details>
3. `Book.prototype`을 교체한 뒤 a instanceof Book이 false가 되는 이유와, 생성자를 호출하지 않은 c가 true인 이유는?
   <details><summary>답</summary>instanceof는 지금의 Book.prototype이 왼쪽 값의 [[Prototype]] 체인에 있는지만 본다. a의 체인에는 이전 객체만 있고, c는 Object.create로 [[Prototype]]이 새 Book.prototype이다. 예제 11, OrdinaryHasInstance.</details>
4. 시뮬레이터의 Object.prototype 카드에 "자기 프로퍼티 없음"을 쓰면 무엇이 틀릴까?
   <details><summary>답</summary>Object.prototype에는 toString·hasOwnProperty 등 자기 프로퍼티가 많다. 그림에서 생략했을 뿐이므로 생략 안내만 둔다. 구현 진행 6단계, `ProtoView.tsx`.</details>
5. `inherited-readonly.js`(예제 6)를 `"type": "module"`이 있는 폴더에서 `.js`로 실행하면 왜 결과가 달라질까?
   <details><summary>답</summary>그 파일은 ES 모듈로 실행되고 모듈은 항상 strict mode라, 상속된 읽기 전용 프로퍼티에 대입하는 4번 줄이 TypeError를 던진다. 단순화 ⑨, concept.test.ts.</details>
