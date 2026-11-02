# 개념 '심벌' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `52201d8`

## 0. 요약

- 목적: 25~37장 로드맵 8번 `/concepts/symbol`을 추가한다. 33장 심벌에서 `Symbol('id') === Symbol('id')`가 false인 이유(호출마다 새 값, description은 이름표일 뿐), `Symbol.for`·`keyFor`와 전역 심벌 레지스트리, 심벌을 프로퍼티 키로 쓰는 법과 충돌하지 않는 확장, 심벌 키를 건너뛰는 연산과 보여 주는 연산(비공개가 아님), `Object.assign`·`JSON.stringify`의 심벌 처리, 키 나열 순서, well-known 심벌(`Symbol.toStringTag`·`Symbol.toPrimitive`)을 예제 8개와 연산 비교표로 명세 근거로 보인다.
- 범위: 새 개념 폴더 1개(category `objects`, order 300으로 학습 순서 32번째·마지막, 시뮬레이터 없이 정적 표 + 퀴즈). 마지막 개념이 바뀌므로 개수·마지막 개념을 고정한 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 31개는 바꾸지 않는다.
- 위험: ① "심벌 키는 숨겨진(비공개) 키"나 "심벌 키는 열거 불가라서 안 보인다"처럼 명세와 다른 원인을 씀 ② 뒷장 개념(이터러블 34장, 스프레드 35장, JSON 43장)을 앞서 설명 → 원인은 각 연산의 명세 알고리즘(문자열 키만 고르는 EnumerableOwnProperties 등)으로 쓰고, 뒷장 내용은 "별도 개념" + `simplifications`.
- 복잡도: 중간 · Consensus: 생략. 기존 개념 폴더 패턴(array-method-pitfalls의 실행 검증 표 + 퀴즈)을 그대로 쓰고 공통 코드를 바꾸지 않는다. 예제 출력·표 값·핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 없음(추가 주제·시각화·slug는 2026-11-02 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 8번 "심벌: 충돌하지 않는 프로퍼티 키"(33장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-02)
  - 기본 범위: 심벌은 호출마다 새 값, description, `Symbol.for`/`Symbol.keyFor` 전역 레지스트리, 대괄호 표기로만 심벌 키를 씀, `Object.keys`·`for...in`·`JSON.stringify`에서 빠지지만 `Object.getOwnPropertySymbols`로 보이므로 비공개가 아님, well-known 심벌 소개.
  - 추가 주제 4개 모두: **`Object.assign`·`JSON.stringify`의 심벌 처리**, **키 나열 순서**(`Reflect.ownKeys`), **well-known 심벌 직접 정의**(`Symbol.toStringTag`·`Symbol.toPrimitive`, `Symbol.iterator`는 34장이라 이름만), **충돌 없는 확장 예**(일반 객체, 내장 프로토타입 수정은 피함).
  - 시각화: **정적 표 + 퀴즈**(연산마다 문자열 키·열거 불가 문자열 키·심벌 키가 결과에 나오는지 비교, array-method-pitfalls 방식).
  - slug `symbol`, 제목 "심벌: Symbol('id')끼리는 왜 같지 않을까".
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 심벌은 부를 때마다 새 값이다(예제 1 `unique.js`): 명세의 Symbol 타입은 "문자열이 아니면서 프로퍼티 키로 쓸 수 있는 값"이고 각 심벌은 유일하고 바뀌지 않는다. `Symbol(description)`은 호출할 때마다 새 심벌을 만들고, 인수는 `[[Description]]`에 문자열로 저장되는 이름표다. `===`는 심벌을 동일성(identity)으로 비교하므로 description이 같아도 다른 심벌은 false. `description`은 `Symbol.prototype`의 접근자(읽을 때 래퍼를 거침 — [원시 값의 메서드](/concepts/primitive-methods) 링크), `String(sym)`·`toString()`은 `Symbol(설명)`. description 없이 만들면 `undefined`, 문자열로는 `Symbol()`. `new Symbol()` TypeError와 암묵적 문자열 변환 TypeError는 이미 다른 페이지에서 다뤘으므로 요약 + 링크([원시 값의 메서드](/concepts/primitive-methods), [암묵적 타입 변환](/concepts/type-coercion)).
  - ② Symbol.for와 전역 심벌 레지스트리(예제 2 `registry.js`): `Symbol.for(key)`는 키 문자열로 레지스트리를 찾아 있으면 그 심벌을, 없으면 새로 만들어 등록한다. 그래서 같은 키는 같은 심벌, `Symbol('app.id')`와는 다르다. `Symbol.keyFor`는 등록된 심벌의 키를, 등록되지 않은 심벌(일반 `Symbol()`, well-known 심벌)은 `undefined`를 돌려준다. 키는 ToString을 거친다(`Symbol.for(1) === Symbol.for('1')` — 근거 테스트).
  - ③ 심벌을 프로퍼티 키로 쓰기(예제 3 `symbol-key.js`): 대괄호 표기와 계산된 프로퍼티 이름의 키는 ToPropertyKey를 거치는데, 값이 심벌이면 문자열로 바꾸지 않고 그대로 키로 쓴다([프로퍼티 키](/concepts/property-keys)의 "식의 값을 문자열로 바꾼다"는 문자열 키 기준 — 이 페이지가 심벌을 보충). 점 표기 `user.id`는 문자열 키 `'id'`라 심벌 키와 다른 프로퍼티. `user['Symbol(id)']`도 다른 키라 `undefined`. `in`은 심벌 키도 찾는다.
  - ④ 같은 설명이어도 충돌하지 않는다(예제 4 `no-collision.js`): 두 코드가 같은 객체에 같은 이름의 문자열 키를 쓰면 나중 대입이 덮어쓰지만, 각자 `Symbol('tag')`를 만들어 키로 쓰면 서로 다른 프로퍼티 두 개가 된다. 기존 코드가 쓰는 `Object.keys` 결과도 바뀌지 않는다. 내장 프로토타입을 고치는 예는 쓰지 않는다(simplifications).
  - ⑤ 심벌 키를 건너뛰는 연산, 보여 주는 연산(예제 5 `not-private.js`): `for...in`(EnumerateObjectProperties: "Symbol 키는 돌려주지 않는다"), `Object.keys`·`JSON.stringify`(EnumerableOwnProperties: 문자열 키만), `Object.getOwnPropertyNames`(GetOwnPropertyKeys(string))는 심벌 키를 빼고, `Object.getOwnPropertySymbols`(GetOwnPropertyKeys(symbol))는 심벌 키만 돌려준다. 리터럴로 만든 심벌 키 프로퍼티는 `enumerable: true`다 — 빠지는 이유는 열거 불가라서가 아니라 연산이 문자열 키만 고르기 때문. 심벌을 몰라도 `getOwnPropertySymbols`로 찾아 값을 읽을 수 있으므로 비공개(private)가 아니다. 진짜 비공개가 필요하면 private 필드([클래스는 함수다](/concepts/class-basics) 링크, 프로퍼티 키가 아님).
  - ⑥ Object.assign과 JSON.stringify(예제 6 `assign-json.js`): `Object.assign`은 출처의 `[[OwnPropertyKeys]]`(심벌 포함)를 돌며 열거 가능한 것만 복사하므로 열거 가능한 심벌 키는 복사되고 열거 불가 심벌 키는 빠진다. `JSON.stringify`는 심벌 키를 보지 않고, 값이 심벌이면 SerializeJSONProperty가 `undefined`를 돌려줘 객체에서는 그 프로퍼티가 빠지고 배열에서는 `null`이 된다. 객체 스프레드(`{ ...obj }`)도 심벌 키를 복사하지만 35장 별도 개념이라 한 줄 언급만.
  - ⑦ 키는 어떤 순서로 나열될까(예제 7 `key-order.js`): 일반 객체의 `[[OwnPropertyKeys]]`(OrdinaryOwnPropertyKeys)는 배열 인덱스 키(오름차순) → 그 밖의 문자열 키(만든 순서) → 심벌 키(만든 순서). `Reflect.ownKeys`는 이 목록 그대로, `Object.keys`는 여기서 열거 가능한 문자열 키만 고른다. 심벌을 리터럴 중간에 써도 맨 뒤. `for...in` 순서는 [프로토타입 체인](/concepts/prototype-chain)에서 본 대로 명세가 일부만 정하므로 예로 쓰지 않는다.
  - ⑧ well-known 심벌(예제 8 `well-known.js`): 명세 알고리즘이 직접 참조하는 내장 심벌로, `Symbol.toStringTag`·`Symbol.toPrimitive`·`Symbol.iterator` 등 `Symbol`의 프로퍼티로 꺼낸다. 레지스트리에 등록된 것이 아니라 `keyFor`는 `undefined`(예제 2). `Object.prototype.toString`은 `Symbol.toStringTag` 값이 문자열이면 `[object 그 값]`을 만든다(`String(point)`도 같은 메서드를 거쳐 같은 결과). ToPrimitive는 객체에 `Symbol.toPrimitive` 메서드가 있으면 힌트(`'number'`·`'string'`·`'default'`)를 넘겨 부른다 — 단항 `+`는 `'number'`, 템플릿 리터럴은 `'string'`, 이항 `+`는 `'default'`. [암묵적 타입 변환](/concepts/type-coercion)이 미뤄 둔 내용을 여기서 보충한다. `Symbol.iterator`는 이름과 `description`만 보이고 이터러블은 별도 개념(34장).
  - ⑨ 연산 표로 정리(표): 3절 표.
- 이미 다룬 내용은 요약하고 링크한다: `typeof`가 `'symbol'`([typeof 연산자](/concepts/typeof-operator)), 래퍼 객체와 `new Symbol()` TypeError([원시 값의 메서드](/concepts/primitive-methods)), 암묵적 변환 TypeError와 `String(sym)`([암묵적 타입 변환](/concepts/type-coercion)), 열거 가능 여부([프로퍼티 어트리뷰트와 접근자](/concepts/property-attributes)), 문자열 키 변환([프로퍼티 키](/concepts/property-keys)).

### 유지해야 하는 기존 동작

- 기존 개념 31개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만). 기존 페이지의 "심벌은 별도 개념" 문구를 링크로 바꾸는 역방향 연결은 사용자 결정대로 나중에 일괄 처리한다(이번에 하지 않음).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 표는 정적 마크업이라 JS 없이 보인다.
- 홈 '객체' 검색 결과(11개, 순위 목록)가 바뀌지 않도록 새 meta의 title·summary·tags에 '객체'를 넣지 않는다(`app/lib/concepts.ts:70-78`, `tests/e2e/navigation.spec.ts:17,32,91,97,109`).

### 제외 범위

- 이터러블·`for...of`·`Symbol.iterator` 구현(34장), 스프레드 문법(35장) — 한 줄 언급만
- 그 밖의 well-known 심벌(`Symbol.hasInstance`, `Symbol.species`, `Symbol.match` 등, `Symbol.asyncIterator`) — simplifications에 이름만
- 내장 프로토타입(`Array.prototype` 등)에 심벌 메서드를 붙이는 확장
- 심벌을 `WeakMap` 키로 쓰기(ES2023), 렐름·에이전트 사이 레지스트리 공유
- `Object.entries`·`Object.values`, `structuredClone`, Proxy

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안(ES2027), scratchpad `sym/spec.html`, 2026-11-02 확인, anchor 21개 존재 확인)

- The Symbol Type(`#sec-ecmascript-language-types-symbol-type`): "the set of all non-String values that may be used as the key of an Object property. Each Symbol is unique and immutable. Each Symbol has an immutable [[Description]] internal slot whose value is either a String or undefined."
- Well-Known Symbols(`#sec-well-known-symbols`): "built-in Symbol values that are explicitly referenced by algorithms of this specification … used as the keys of properties whose values serve as extension points"; 별도 지정이 없으면 모든 렐름이 공유. Table 1의 `[[Description]]`은 `"Symbol.iterator"` 등. 예전 판의 `@@name` 표기는 현재 `%Symbol.name%`.
- `Symbol ( [ description ] )`(`#sec-symbol-description`): NewTarget이 있으면 TypeError, description이 undefined가 아니면 ToString, "Return a new Symbol whose [[Description]] is descString".
- `Symbol.for`(`#sec-symbol.for`): ToString(key) → 에이전트의 [[GlobalSymbolRegistry]]에서 같은 [[Key]]를 찾으면 그 심벌, 없으면 description이 키인 새 심벌을 만들어 등록. `Symbol.keyFor`(`#sec-symbol.keyfor`)·KeyForSymbol(`#sec-keyforsymbol`): 심벌이 아니면 TypeError, 레지스트리에 있으면 등록 키, 없으면 undefined.
- `get Symbol.prototype.description`(`#sec-symbol.prototype.description`): 접근자, `[[Description]]`을 돌려줌. SymbolDescriptiveString(`#sec-symboldescriptivestring`): `"Symbol(" + (description 또는 빈 문자열) + ")"`.
- SameValueNonNumber(`#sec-samevaluenonnumber`): 문자열·BigInt·불리언 외 값은 "compared by identity". (`===`의 IsStrictlyEqual이 이것을 부른다 — equality-operators에서 다룬 경로.)
- ToPropertyKey(`#sec-topropertykey`): ToPrimitive(arg, string) 결과가 Symbol이면 그대로, 아니면 ToString.
- OrdinaryOwnPropertyKeys(`#sec-ordinaryownpropertykeys`): 배열 인덱스(오름차순) → 배열 인덱스가 아닌 String(생성 순) → Symbol(생성 순).
- EnumerableOwnProperties(`#sec-enumerableownproperties`): `If key is a String` 인 것만 열거 가능 여부를 본다 → `Object.keys`(`#sec-object.keys`)와 SerializeJSONObject가 이것을 쓴다.
- GetOwnPropertyKeys(`#sec-getownpropertykeys`): type이 string이면 String 키, symbol이면 Symbol 키만(열거 여부 무관) → `Object.getOwnPropertyNames`, `Object.getOwnPropertySymbols`(`#sec-object.getownpropertysymbols`).
- EnumerateObjectProperties(`#sec-enumerate-object-properties`): "Returned property keys do not include keys that are Symbols." 순서는 명세가 정하지 않음(규칙만).
- `Object.assign`(`#sec-object.assign`): `from.[[OwnPropertyKeys]]()`의 모든 키 중 `[[Enumerable]]`이 true인 것을 Get → Set.
- SerializeJSONProperty(`#sec-serializejsonproperty`): 값이 심벌이면 마지막 `Return undefined`. SerializeJSONObject는 undefined면 그 프로퍼티를 넣지 않고, SerializeJSONArray는 `Append "null"`.
- `Reflect.ownKeys`(`#sec-reflect.ownkeys`): `target.[[OwnPropertyKeys]]()`를 그대로 배열로.
- `Object.prototype.toString`(`#sec-object.prototype.tostring`): builtinTag를 정한 뒤 `Get(obj, %Symbol.toStringTag%)`가 문자열이면 그 값을 tag로 써 `"[object " + tag + "]"`.
- ToPrimitive(`#sec-toprimitive`): `GetMethod(input, %Symbol.toPrimitive%)`가 있으면 hint(`"default"`/`"string"`/`"number"`)로 호출, 결과가 객체가 아니면 반환, 객체면 TypeError. `Symbol.toStringTag`(`#sec-symbol.tostringtag`), `Symbol.toPrimitive`(`#sec-symbol.toprimitive`).
- 힌트 출처: 이항 `+`는 ApplyStringOrNumericBinaryOperator(`#sec-applystringornumericbinaryoperator`)가 힌트 없이 `ToPrimitive(leftValue)` → `'default'`. 단항 `+`는 ToNumber(`#sec-unary-plus-operator-runtime-semantics-evaluation`) → ToPrimitive(number) → `'number'`. 템플릿 리터럴은 ToString → ToPrimitive(string) → `'string'`.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/672cdeee-df3d-452d-8527-bf9e1dd907fa/scratchpad/sym/ex/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `unique.js` | `false true` / `symbol id Symbol(id)` / `undefined Symbol()` |
| 2 `registry.js` | `true false` / `app.id app.id` / `undefined undefined` |
| 3 `symbol-key.js` | `1 2 2` / `true true` / `undefined true` |
| 4 `no-collision.js` | `lib-b` / `lib-a lib-b 2` / `["name","tag"]` |
| 5 `not-private.js` | `["label"] ["label"]` / `{"label":"box"} ["label"]` / `1 true 42` / `true` |
| 6 `assign-json.js` | `T 2 1` / `{"a":1}` / `{"n":1} [null,1]` |
| 7 `key-order.js` | `["1","2","b","a"]` / `1, 2, b, a, Symbol(s)` |
| 8 `well-known.js` | `[object Point] [object Point]` / `100 price:string price:default` / `symbol Symbol.iterator` |

- 표 값(공통 준비: `var secret = Symbol('secret'); var box = { label: 'box', [secret]: 1 }; Object.defineProperty(box, 'code', { value: 2 });`, 열: `label` / `code` / `secret`):
  - `for...in`, `Object.keys`, `JSON.stringify`: 나옴 / 빠짐 / 빠짐
  - `Object.assign({}, box)`: 나옴 / 빠짐 / 나옴
  - `Object.getOwnPropertyNames`: 나옴 / 나옴 / 빠짐
  - `Object.getOwnPropertySymbols`: 빠짐 / 빠짐 / 나옴
  - `Reflect.ownKeys`: 나옴 / 나옴 / 나옴
  - `키 in box`: true / true / true
- 그 밖(근거 테스트로만): `new Symbol()`·`Symbol.keyFor('x')`·`Symbol('a') + ''`·`` `${Symbol('a')}` ``·`+Symbol()` 모두 TypeError, `Symbol.for(1) === Symbol.for('1')` true, `Symbol(123).description === '123'`, `!!Symbol()` true, 열거 불가 심벌 키도 `getOwnPropertySymbols`에 나옴(`1 0`), 프로토타입의 심벌 키는 `in`이 true지만 `getOwnPropertySymbols`는 0, `{ ...{ [s]: 1 } }[s]`는 1, `Object.entries`는 심벌 키를 뺌(`[]`), `obj.s`는 심벌 변수 `s`와 무관(`undefined`).

### 사실 (코드에서 확인)

- 겹치는 기존 개념: `property-keys`가 "키는 문자열 또는 심벌, 이 페이지는 문자열 키만(심벌은 별도 개념)"(`app/concepts/property-keys/content.mdx:6`, `meta.ts:86`), 계산된 프로퍼티 이름이 "식의 값을 문자열로 바꿔" 키로 씀(`content.mdx:30`). `property-attributes`가 "심벌 키와 for…in은 다루지 않는다"(`meta.ts:96`), `enumerable: false`면 `Object.keys`·`JSON.stringify`에 안 나옴(`content.mdx:17`). `type-coercion`이 Symbol의 암묵적 변환 TypeError와 `String(Symbol('id'))`를 다루고 `Symbol.toPrimitive`를 다루지 않는다고 적음(`content.mdx:83,90`, `meta.ts:84`). `primitive-methods`가 `new Symbol` TypeError와 `description` 읽기(`content.mdx:52,111`, `wrapper-table.ts:39-43`). `typeof-operator`가 `typeof Symbol('id')`(`typeof-table.ts:9`). `prototype-chain`이 for...in은 Symbol 키를 열거하지 않는다고 적음(`content.mdx:103`, `meta.ts:111`). `class-basics`가 private 필드를 다룸(`content.mdx:5`).
- 표 패턴: `app/concepts/array-method-pitfalls/methods.ts`(칸마다 `text`·`probe`·`expected`, 행마다 `exampleId`), 표 렌더링 `content.mdx:59-95`(`role="region"`·`tabIndex={0}`·`aria-label`·`overflow-x-auto`, `th scope`), 표 검증 `concept.test.ts`(칸마다 새 vm 컨텍스트에서 probe 실행, exampleId가 meta.examples에 있는지).
- 예제 파일은 주석을 거의 쓰지 않는다(전체 2곳). 이 개념 예제도 주석 없이 쓰고 줄은 본문에서 설명한다.
- category `objects`, 현재 마지막 개념 string-utf16(order 290, 31번째). order 300이면 32번째이자 마지막.
- 고정값(현재): 개수 31·마지막 string-utf16 — `tests/e2e/navigation.spec.ts`(카드 수 `:78`·`:122`, 마지막 '31번째'·제목 `:84-87`, pager 분모 `/ 31` 전부, string-utf16 '31 / 31' 블록 `:268-272`), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 31), `app/lib/concepts.test.ts:104-113`(total 31, 마지막 string-utf16), `app/components/concept/ConceptPager.test.tsx:18,27-32`('1 / 31', '31 / 31', 이전 regexp-lastindex). 직전 커밋 `52201d8`의 같은 파일 변경을 그대로 본뜬다.
- e2e·빌드 등록 위치: `tests/e2e/helpers.ts`(경로 상수), `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`(string-utf16 describe 뒤), `docs/content-guide.md:167` e2e 목록.
- e2e 이름: 기존 e2e·빌드 테스트 이름에 'symbol'·'심벌'이 없다(`grep` 결과 build의 `new Symbol('id')` 본문 검사 1곳뿐, 테스트 이름 아님) → `-g "symbol|심벌|홈 학습 순서 보기"`로 새 케이스만 잡힌다.

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "심벌은 문자열이 아닌 프로퍼티 키로, 부를 때마다 유일한 값이 만들어진다. 설명(description)은 이름표일 뿐 같음을 정하지 않는다. 심벌 키가 어떤 연산에서 빠지는 것은 '숨겨서'가 아니라 그 연산의 명세가 문자열 키만 고르기 때문이다." 결과의 원인은 각 연산의 명세 알고리즘 이름(EnumerableOwnProperties, GetOwnPropertyKeys, OrdinaryOwnPropertyKeys, ToPropertyKey, SerializeJSONProperty)으로 설명한다. 절 번호는 라벨에 쓰지 않는다.
- 연산 표(`key-visibility.ts` + content.mdx 표)
  - 데이터: `export const setup`(2절 공통 준비 코드 문자열), `export const columns = [{ key: 'label', label: '문자열 키 label' }, { key: 'code', label: '열거 불가 문자열 키 code' }, { key: 'secret', label: '심벌 키 secret' }]`, `export const operations: { operation: string; exampleId: string | null; cells: [Cell, Cell, Cell] }[]`, `Cell = { text: '나옴' | '빠짐' | 'true'; probe: string; expected: 'true' | 'false' }`. probe는 `setup` 뒤에 붙여 실행하며 "그 키가 결과에 나오는가"를 불리언 문자열로 돌려준다.
  - 행 8개와 probe 방식: `for...in`(키를 배열에 모아 `indexOf`), `Object.keys(box)`, `Object.getOwnPropertyNames(box)`, `Object.getOwnPropertySymbols(box)`, `Reflect.ownKeys(box)`(결과 배열에 그 키가 있는지 `indexOf(키) >= 0`), `JSON.stringify(box)`(출력 문자열에 `"label"`·`"code"` 포함 여부, 심벌 칸은 그 키의 값 `1`이 출력에 있는지 — 값 1은 심벌 키에만 있다), `Object.assign({}, box)`(복사본에 `Object.prototype.hasOwnProperty.call(copy, 키)`), `키 in box`(text 'true'). 각 행 exampleId: for...in·Object.keys·JSON.stringify·getOwnPropertyNames·getOwnPropertySymbols → `not-private`, Object.assign → `assign-json`, Reflect.ownKeys → `key-order`, in → `symbol-key`.
  - 렌더: array-method-pitfalls 표 마크업 그대로(`role="region"`, `tabIndex={0}`, `aria-label="연산마다 문자열 키와 심벌 키가 결과에 나오는지 비교한 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"`, 첫 열 `th scope="row"`에 `<code>`). 표 위 문단에 공통 준비 코드를 `<code>`로 보이고 "칸마다 실제로 실행한 결과와 대조했다"고 쓴다. 표 아래 문단: `in`은 프로토타입 체인까지 찾는다는 것, 열거 불가 심벌 키도 `getOwnPropertySymbols`에 나온다는 것.
- 테스트(`concept.test.ts`)
  - ① 표 근거: 행마다 exampleId가 meta.examples에 있다, 칸마다 새 vm 컨텍스트에서 `setup + probe` 결과 = `expected`, `text`와 `expected`가 맞물린다('나옴'·'true' ↔ 'true', '빠짐' ↔ 'false'). 행 8개, 열 3개.
  - ② 본문 주장 근거(2절 "그 밖" 목록 중 본문에 쓰는 것 모두): TypeError 5개(다른 realm 오류라 `name`으로 검사 — array-method-pitfalls와 같음), `Symbol.for(1) === Symbol.for('1')`, `Symbol(123).description`, 열거 불가 심벌 키와 `getOwnPropertySymbols`, 프로토타입의 심벌 키와 `in`, 객체 스프레드가 심벌 키를 복사, `Symbol.keyFor(Symbol.iterator)`는 undefined(예제 2에도 있음 — 생략 가능), well-known 심벌이 `Symbol`의 쓰기 불가 프로퍼티(`Object.getOwnPropertyDescriptor(Symbol, 'iterator')`가 `writable:false, enumerable:false, configurable:false`)를 본문에 쓰면 그것도.
- 장 범위: 33장까지. 예제에 계산된 프로퍼티 이름(10장), `Object.defineProperty`·`getOwnPropertyDescriptor`(16장), `for...in`·`Object.keys`(19장), `call`(22장), 메서드 축약(26장), 배열 `map`·`join`·`indexOf`(27장)를 쓴다. `JSON.stringify`(43장)는 다른 페이지처럼 출력 도구로 쓰되, 심벌 처리 자체를 설명하므로 simplifications에 "JSON은 43장, 여기서는 심벌 처리만" 밝힌다. `Reflect.ownKeys`는 책의 장 주제가 아닌 ES2015 내장 함수라 "키 목록을 그대로 보여 주는 함수"로만 소개한다. `try...catch`·스프레드·`for...of`는 예제에 쓰지 않는다(TypeError는 본문 문장 + 근거 테스트).
- meta: category `objects`, order 300. prerequisites: 프로퍼티 키(`property-keys`), 프로퍼티 어트리뷰트와 접근자(`property-attributes`), 원시 값의 메서드(`primitive-methods`). related: `property-keys`, `property-attributes`, `primitive-methods`, `type-coercion`, `typeof-operator`, `prototype-chain`, `class-basics`. title·summary·tags에 '객체' 없음.
- 버린 대안
  - ① 선택형 키 목록 보기: 사용자 결정(정적 표). 
  - ② 내장 프로토타입에 심벌 메서드를 붙이는 확장 예: 사용자 결정(일반 객체). 내장 객체 수정은 권장하지 않는 관행이라 예로 쓰지 않는다.
  - ③ 열 4개(열거 불가 심벌 키 포함): 375px에서 표가 너무 넓어진다. 열거 불가 심벌 키는 예제 6과 표 아래 문단으로 다룬다.

## 4. 변경 파일

- 추가 `app/concepts/symbol/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `key-visibility.ts`, `concept.test.ts`
  - `examples/`(8개): `unique.js`, `registry.js`, `symbol-key.js`, `no-collision.js`, `not-private.js`, `assign-json.js`, `key-order.js`, `well-known.js`
- 수정
  - `tests/e2e/helpers.ts`: `SYMBOL_PATH = '/concepts/symbol'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe(라이트·다크, '정답 확인' 버튼 보인 뒤) — array-method-pitfalls 케이스 형태, 이름 '개념 페이지: 심벌'
  - `tests/e2e/responsive.spec.ts`: `${SYMBOL_PATH}: 가로 스크롤이 없다`, 홈 학습 순서 카드 31→32
  - `tests/e2e/navigation.spec.ts`: 카드 31→32(두 곳), 마지막 '32번째'와 새 제목, pager 분모 31→32 전부, string-utf16 '31 / 32'·링크 2개(이전 regexp-lastindex, 다음 symbol), 새 개념 '32 / 32'·이전 링크 string-utf16. '객체' 검색 값(11, 순위 목록)은 그대로
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 32, 마지막 symbol(prev string-utf16, position 32)
  - `tests/build/build-output.test.ts`: string-utf16 describe 뒤에 `프리렌더 (symbol)` describe(표 aria-label, 표 칸 텍스트 예 `Object.getOwnPropertySymbols`, 퀴즈 `<details` 8개 이상)
  - `docs/content-guide.md:167`: e2e 목록에 `symbol`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 8번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes.ts`, 기존 개념 폴더 31개

## 5. 위험 요소

- "심벌 키는 숨겨진 키/비공개 키", "열거 불가라서 안 보인다" 같은 서술 → 3절 축대로 원인을 연산 알고리즘으로 쓰고, 오해 Callout으로 바로잡는다. 단계 3에서 '숨', '비공개', 'private' grep 결과가 바로잡는 문맥뿐인지 확인.
- "description이 같으면 같은 심벌", "Symbol.for는 Symbol과 같다" → 예제 1·2와 Callout.
- 엔진 세부를 사실처럼 씀(예: "심벌은 내부적으로 고유 ID") → 명세 문장("각 심벌은 유일하고 바뀌지 않는다", 동일성 비교)만 쓴다.
- 레지스트리를 "전역 객체의 프로퍼티"처럼 씀 → 명세는 에이전트 레코드의 목록. simplifications에 "레지스트리는 명세상 에이전트마다 하나, 렐름 간 공유는 다루지 않음".
- 키 순서를 `for...in`으로 단정 → `Object.keys`·`Reflect.ownKeys`만 예로 쓴다(OrdinaryOwnPropertyKeys는 일반 객체 기준이라고 밝힘 — 배열·문자열 같은 특수 객체도 같은 규칙을 쓰지만 프록시 등은 다를 수 있음은 simplifications).
- ToPrimitive 힌트 설명 오류 → 예제 8 출력(`100 price:string price:default`)과 2절 명세 근거(이항 `+`·단항 `+`·템플릿 리터럴)를 대조해 쓴다.
- 뒷장 문법 → `try...catch`·스프레드·`for...of`를 예제에 쓰지 않는다. 스프레드·이터러블은 "별도 개념"으로만.
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 4에서 고친다.
- '객체' 검색 결과 변화 → title·summary·tags에 '객체' 금지, 단계 1 완료 조건에서 grep.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx(실행 중 dev 서버가 `./meta` 실패를 캐시하지 않게).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "symbol|심벌|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스(a11y 라이트·다크, 가로 스크롤 데스크톱·모바일, 홈 학습 순서 보기)가 모두 잡히는지 확인.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`(처음엔 `[]`로 두고 실행 결과로 채움), concept.test 통과·음성 확인(표 칸 하나의 expected를 바꾸면 실패), 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 참고 링크 전부 200.
- 브라우저(build + start, 375px·다크)
  1. `/concepts/symbol` → 페이지 가로 스크롤 없음, 연산 표가 region 안에서만 가로 스크롤되고 Tab으로 포커스된다.
  2. 표의 `Object.assign` 행이 나옴/빠짐/나옴, `Object.getOwnPropertySymbols` 행이 빠짐/빠짐/나옴으로 보인다.
  3. 퀴즈 8개 중 하나를 골라 '정답 확인' → 정답·해설이 보인다. JS를 끈 상태(또는 프리렌더 HTML)에서 `<details>` 정답이 보인다.
  4. 하단 학습 순서 '32 / 32', 이전 string-utf16. string-utf16 하단 '31 / 32', 다음 symbol.

## 7. 미확정 사항

- 없음. 제목·표 열 이름·퀴즈 문구는 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(8개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경
  - 부록 초안 8개를 그대로 옮긴다.
  - `meta.ts`: slug `symbol`, title "심벌: Symbol('id')끼리는 왜 같지 않을까", summary "Symbol()은 설명이 같아도 호출할 때마다 다른 값을 만들어, 프로퍼티 키로 쓰면 다른 키와 충돌하지 않습니다. Symbol.for, 심벌 키를 건너뛰는 연산과 보여 주는 연산, well-known 심벌을 명세로 확인합니다."(127자), category `objects`, order 300, tags(심벌, symbol, Symbol.for, Symbol.keyFor, description, 프로퍼티 키, getOwnPropertySymbols, Object.assign, Reflect.ownKeys, well-known symbol, Symbol.toStringTag, Symbol.toPrimitive), goals 4개(① 호출마다 새 값·description·동일성 비교 ② Symbol.for/keyFor와 레지스트리 ③ 심벌 키 사용과 충돌 없는 확장, 연산별로 심벌 키가 나오는지 예측(비공개 아님) ④ 키 나열 순서와 well-known 심벌로 동작 바꾸기), prerequisites·related(3절), examples는 처음엔 `expectedOutput: []`, references(2절 명세 anchor 21개 중 본문에 쓰는 것 + MDN ko `Symbol`·`Symbol.for`·`Symbol.keyFor`·`Symbol.prototype.description`·`Object.getOwnPropertySymbols`·`Object.assign`·`Reflect.ownKeys`·`Symbol.toStringTag`·`Symbol.toPrimitive` — 2026-11-02 모두 200 확인), `reviewedAt: null`
  - simplifications: 이터러블과 `Symbol.iterator`·`for...of`(34장), 스프레드(35장)는 별도 개념 / 다른 well-known 심벌(`Symbol.hasInstance`·`Symbol.species`·`Symbol.match` 등)은 이름만 / 전역 심벌 레지스트리는 명세상 에이전트마다 하나이며 렐름 간 공유·`WeakMap`의 심벌 키는 다루지 않음 / 키 순서는 일반 객체의 OrdinaryOwnPropertyKeys 기준(프록시 등 다른 객체는 다룰 범위 밖), `for...in` 순서는 명세가 일부만 정함 / `JSON.stringify`는 43장이며 여기서는 심벌 처리만 / `Reflect`는 키 목록 확인용으로만 / 내장 프로토타입 확장은 다루지 않음 / private 필드는 프로퍼티 키가 아니며 class-basics에서 다룸 / `console`은 호스트 API
  - `route.tsx`: string-utf16 템플릿 복사
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. 예제 파일은 부록 그대로, 파일 끝 줄바꿈 하나.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표. 참고 링크 전부 200. `grep -c '객체' app/concepts/symbol/meta.ts`에서 title·summary·tags 줄에 '객체' 없음(simplifications·goals는 무관).

### 2. 연산 표 데이터와 테스트

- 대상: `key-visibility.ts`, `concept.test.ts`
- 변경: 3절의 데이터와 테스트 ①·②.
- 주의사항: probe는 다른 칸에 의존하지 않게 칸마다 `setup`부터 새로 실행. 심벌 칸 probe는 심벌 변수 `secret`을 직접 써서 검사한다(`'secret'` 문자열과 혼동 금지).
- 완료 조건: `npx vitest run app/concepts/symbol` 통과(표 8행 × 3칸 = 24칸 + 본문 주장). 음성 확인(칸 하나의 expected를 반대로 바꾸면 실패) 후 원복. lint·typecheck 통과.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 동작 원리 h3: 1절 주제 ①~⑨ 순서(⑨ "연산 표로 정리"에 표). 예제 8개마다 PredictQuiz. 결과와 이유는 예제별 h3. 오해 Callout 4개: "description이 같으면 같은 심벌이다", "심벌 키는 비공개 키다", "심벌 키는 열거할 수 없어서 Object.keys에 안 나온다", "user.id로 심벌 키를 읽을 수 있다". 예제 절 첫 문단은 array-method-pitfalls처럼 console은 호스트 API, sloppy mode, 여러 줄 출력은 ' / '로 이음.
- 주의사항: '찾히다' 금지, 뒷장 내용은 "별도 개념"으로만, ToPrimitive 힌트는 2절 근거대로, 공백 든 인라인 코드는 Prettier 깨짐 확인(필요하면 `<code>{"..."}</code>`).
- 완료 조건: `npm test` 통과(개수 고정 테스트 4건은 단계 4 대상이라 이 시점 실패 허용 — 실패 목록이 그 4건뿐인지 확인), 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0, '숨|비공개|private' grep 결과가 오해를 바로잡는 문맥뿐.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만. '객체' 검색 값은 건드리지 않는다.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~4 확인.

## 9. 추가 개선 후보

- 로드맵 9번 '이터러블과 for...of'에서 `Symbol.iterator`를 다룰 때 이 페이지의 well-known 심벌 절과 연결한다.
- 기존 페이지의 "심벌은 별도 개념" 문구(property-keys, property-attributes, type-coercion의 Symbol.toPrimitive)를 이 페이지 링크로 바꾸는 역방향 연결(사용자 결정대로 나중에 일괄).

## 부록: 예제 초안

`unique.js`

```js
var a = Symbol('id');
var b = Symbol('id');
console.log(a === b, a === a);
console.log(typeof a, a.description, String(a));
console.log(Symbol().description, String(Symbol()));
```

`registry.js`

```js
var x = Symbol.for('app.id');
var y = Symbol.for('app.id');
console.log(x === y, x === Symbol('app.id'));
console.log(Symbol.keyFor(x), x.description);
console.log(Symbol.keyFor(Symbol('app.id')), Symbol.keyFor(Symbol.iterator));
```

`symbol-key.js`

```js
var id = Symbol('id');
var user = { name: 'Lee', [id]: 1 };
user.id = 2;
console.log(user[id], user.id, user['id']);
console.log(id in user, 'id' in user);
console.log(user['Symbol(id)'], Object.getOwnPropertySymbols(user)[0] === id);
```

`no-collision.js`

```js
var item = { name: 'pen' };
item.tag = 'lib-a';
item.tag = 'lib-b';
console.log(item.tag);
var tagA = Symbol('tag');
var tagB = Symbol('tag');
item[tagA] = 'lib-a';
item[tagB] = 'lib-b';
console.log(item[tagA], item[tagB], Object.getOwnPropertySymbols(item).length);
console.log(JSON.stringify(Object.keys(item)));
```

`not-private.js`

```js
var secret = Symbol('secret');
var box = { label: 'box', [secret]: 42 };
var names = [];
for (var key in box) names.push(key);
console.log(JSON.stringify(names), JSON.stringify(Object.keys(box)));
console.log(JSON.stringify(box), JSON.stringify(Object.getOwnPropertyNames(box)));
var found = Object.getOwnPropertySymbols(box);
console.log(found.length, found[0] === secret, box[found[0]]);
console.log(Object.getOwnPropertyDescriptor(box, secret).enumerable);
```

`assign-json.js`

```js
var tag = Symbol('tag');
var src = { a: 1, [tag]: 'T' };
Object.defineProperty(src, Symbol('hidden'), { value: 'H', enumerable: false });
var copy = Object.assign({}, src);
console.log(copy[tag], Object.getOwnPropertySymbols(src).length, Object.getOwnPropertySymbols(copy).length);
console.log(JSON.stringify(copy));
console.log(JSON.stringify({ v: Symbol('x'), n: 1 }), JSON.stringify([Symbol('x'), 1]));
```

`key-order.js`

```js
var s = Symbol('s');
var obj = { b: 1, 2: 1, [s]: 1, a: 1, 1: 1 };
console.log(JSON.stringify(Object.keys(obj)));
console.log(Reflect.ownKeys(obj).map(String).join(', '));
```

`well-known.js`

```js
var point = { x: 1, y: 2, [Symbol.toStringTag]: 'Point' };
console.log(Object.prototype.toString.call(point), String(point));
var price = {
  [Symbol.toPrimitive](hint) {
    return hint === 'number' ? 100 : 'price:' + hint;
  },
};
console.log(+price, `${price}`, price + '');
console.log(typeof Symbol.iterator, Symbol.iterator.description);
```

## 변경 이력

- 2026-11-02 (외부 콘텐츠 검토 1회, 5건): ① Symbol.for 동기 설명을 "값을 직접 주고받을 수 없는 코드가 문자열 키로 같은 심벌을 얻는 방법"으로 수정 ② 레지스트리 단순화 문구 — 제안("명세상 에이전트 아님")은 현재 초안과 다름(현재 초안: Agent Record의 [[GlobalSymbolRegistry]], ES2025판: "globally available, shared by all realms" — 2026-11-02 두 판 원문 확인) → 두 판을 모두 밝히도록 수정 ③ 암묵적 변환 TypeError 범위 한정 — 제안 문장 "==는 예외 없이 false"는 `sym == Object(sym)`이 true라 틀림 → "문자열과 ==로 비교하면 false"로 한정, 불리언 변환·Object(sym) 래퍼 추가 ④ ToPropertyKey에 ToPrimitive 단계 추가 ⑤ 예제 5 줄 번호(호출 7번 줄) 수정. 근거 테스트 2개 추가 — 영향 단계 3
- 2026-11-02 (외부 콘텐츠 재검증, 2건): ① 레지스트리 판 경계 — 발행된 ES2026판(tc39.es/ecma262/2026/)도 "globally available, shared by all realms"이고 에이전트별 정의는 ES2027 초안에만 있음(원문 확인) → "현재 초안(ES2027 draft)… 발행된 ES2026판까지는"으로 수정 ② 암묵적 변환 단락에서 참조 문장을 끝으로 옮기고 "문자열·숫자·불리언으로 바꾸는 규칙"으로 범위 명시 — 영향 단계 3

## 구현 진행

- baseline (2026-11-02, `52201d8`): lint 통과 / format:check 통과 / typecheck 통과 / `npm test` 95 files·2939 tests 통과. test:build·e2e는 단계 4 이후 실행(직전 커밋에서 통과).
- [x] 1. 예제·meta·route — examples·content-integrity 통과(예제 8개 출력 = expectedOutput), 예제 8개가 부록과 동일, 참고 링크 29개 200, title·summary·tags에 '객체' 없음
- [x] 2. 연산 표 데이터와 테스트 — `npx vitest run app/concepts/symbol` 61개 통과, 음성 확인(Object.assign/secret 칸 expected 반전 → 2개 실패) 후 원복
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서(단계 3과 병렬로 먼저 작성) — diff 확인, concepts.test·ConceptPager.test 통과. e2e·test:build는 전체 검증에서 실행
- [x] 3. 본문 작성 — 메인이 전문을 명세·예제와 대조해 7곳 수정(문자열 비교 표현, `sym + ''`, "배열 인덱스" 용어 통일(meta goal 포함), well-known 심벌 "대개 확장 지점", `String(point)`의 ToPrimitive 순서, `'hidden'`은 설명). 본문 주장 근거 테스트 3개 추가(well-known 심벌 3개 어트리뷰트, toPrimitive가 객체를 돌려주면 TypeError, `sym + ''` TypeError). 퀴즈 8개 정답 = expectedOutput(일치 선택지 정확히 1개), `찾히` 0
- 전체 검증(2026-11-02): lint·format:check·typecheck 통과, `npm test` 96 files·3022 tests, `test:build` 264 tests, e2e navigation 16 + 새 개념 8(`-g "symbol|심벌|홈 학습 순서 보기"`, `--list`로 8개 확인) 통과
- 리뷰 1차(critical-code-review, 메인 직접): High 1 수정 — 예제 4 설명의 "기존 코드가 심벌 키 때문에 달라지지 않는다"가 Object.assign 같은 연산까지 포함하는 과잉 일반화(오개념 위험) → 문자열 키만 다루는 연산으로 한정하고 Object.assign 예외를 명시. 재검증: prettier·lint·예제·무결성·symbol 테스트 690, test:build 264, e2e 새 개념 6 통과. Low 1(보고): JSON.stringify가 키를 EnumerableOwnProperties로 모은다는 설명은 replacer 배열이 없을 때 기준(simplifications 미기재)
- 사용자 요청(2026-11-02): simplifications에 JSON.stringify replacer 조건 추가(명세 JSON.stringify의 replacer 배열 단계와 `JSON.stringify({a:1,b:2,1:3},["b",1])` → `{"b":2,"1":3}` 실행 확인), 검토 승인으로 `reviewedAt` 2026-11-02

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 단계 4는 다른 파일만 바꾸므로 단계 3과 병렬로 먼저 진행했다. 본문은 메인이 명세·예제와 대조해 7곳을 고쳤고, 근거 테스트를 계획보다 5개 더 추가했다(well-known 심벌 어트리뷰트 3개, toPrimitive가 객체를 돌려주면 TypeError, `sym + ''`, 불리언·`==`·`Object(sym)`, ToPropertyKey의 ToPrimitive 단계).
- 외부 콘텐츠 검토 2회를 반영하면서 Symbol.for 동기 설명, 암묵적 변환 범위, ToPropertyKey 단계, 예제 5 줄 번호, 레지스트리 판 경계 문구가 바뀌었다(`변경 이력`). 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- High 1(예제 4 설명이 Object.assign까지 포함하는 과잉 일반화)을 수정했다. Low 1(JSON replacer 조건)은 사용자 결정으로 simplifications에 추가했다.

### 후속 작업

- [ ] 로드맵 9번 '이터러블과 for...of'에서 `Symbol.iterator`를 다룰 때 이 페이지의 well-known 심벌 절과 연결한다.
- [ ] 기존 페이지의 "심벌은 별도 개념" 문구(property-keys, property-attributes, type-coercion의 Symbol.toPrimitive)를 이 페이지 링크로 바꾸는 역방향 연결(사용자 결정대로 나중에 일괄 처리).

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 리뷰 High로 예제 4 설명을 고친 방식: "기존 코드는 심벌 키 때문에 달라지지 않는다"를 지우지 않고 "문자열 키만 다루는 연산(Object.keys·for...in·JSON.stringify)을 쓰는 코드"로 한정하고 Object.assign 예외를 덧붙였다. 문장을 통째로 빼는 대안은 충돌 없는 확장의 장점이 사라져 택하지 않았다.
- [Claude 판단] 외부 검토 ③의 제안 문장 "==는 예외 없이 false"를 그대로 쓰지 않고 "문자열과 ==로 비교하면 TypeError 없이 false"로 한정했다. `sym == Object(sym)`은 ToPrimitive가 래퍼에서 같은 심벌을 꺼내 true다.
- [Claude 판단] 외부 검토 ②("명세상 에이전트 단위가 아니다")를 그대로 받지 않고 판을 확인했다. 참고 링크가 가리키는 ES2027 초안은 Agent Record의 필드이고, 발행된 ES2026판까지는 "모든 렐름이 공유"라서 두 판을 모두 밝혔다(재검증에서 판 경계를 ES2025→ES2026으로 바로잡음).
- [무검토 승인] 연산 표를 열 3개(문자열 키·열거 불가 문자열 키·심벌 키)로 두고 열거 불가 심벌 키는 예제 6과 표 아래 문단으로 다뤘다. 열 4개는 375px에서 너무 넓다.
- [무검토 승인] 새 meta의 title·summary·tags에 '객체'를 넣지 않아 홈 '객체' 검색 결과(11개, 순위 목록)를 고정한 e2e를 바꾸지 않았다.
- 원인 설명의 축: 심벌 키가 빠지는 이유는 "숨겨서"나 "열거 불가라서"가 아니라 각 연산의 명세 알고리즘이 문자열 키만 고르기 때문이다(사용자가 고른 범위 "비공개는 아님"을 본문 구조로 옮김).

#### 배경지식

- 키를 모으는 명세 연산이 셋으로 나뉜다. EnumerableOwnProperties(Object.keys·JSON.stringify — 문자열 키 중 열거 가능), GetOwnPropertyKeys(getOwnPropertyNames/Symbols — 타입만 봄, 열거 여부 무관), `[[OwnPropertyKeys]]`(Reflect.ownKeys·Object.assign — 전부, assign은 그중 `[[Enumerable]]`만 복사).
- ToPropertyKey는 ToPrimitive(string) 뒤 결과가 심벌이면 그대로 키로 쓴다. 점 표기는 식별자 이름을 문자열 키로 쓴다.
- ToPrimitive 힌트는 연산이 정한다. 단항 `+`는 ToNumber라 'number', 템플릿 리터럴은 ToString이라 'string', 이항 `+`는 힌트 없이 불러 'default'다.
- 예제 실행기는 vm 새 컨텍스트라 다른 realm의 오류다. 테스트는 instanceof 대신 오류 `name`으로 검사한다.

#### 확인 질문

1. 리터럴로 만든 심벌 키가 Object.keys에 나오지 않는데, 이것을 "열거 불가라서"라고 설명하면 왜 틀릴까?
   <details><summary>답</summary>리터럴로 만든 심벌 키 프로퍼티의 enumerable은 true다(예제 5의 9번 줄). Object.keys가 쓰는 EnumerableOwnProperties가 키가 String인 것만 보기 때문에 빠진다. 반대로 열거 불가 심벌 키도 getOwnPropertySymbols에는 나온다(concept.test.ts 근거 테스트, 본문 "연산 표로 정리" 아래 문단).</details>
2. Object.assign은 심벌 키를 복사하는데 JSON.stringify는 왜 심벌 키를 보지 않을까? 열거 불가 심벌 키는 assign에서 어떻게 될까?
   <details><summary>답</summary>assign은 `[[OwnPropertyKeys]]`(심벌 포함) 전체를 돌며 `[[Enumerable]]`이 true인 것만 Get·Set한다. JSON.stringify는 replacer 배열이 없으면 EnumerableOwnProperties로 문자열 키만 모은다. 열거 불가 심벌 키는 assign에서 복사되지 않는다(예제 6, `T 2 1`).</details>
3. 외부 검토가 제안한 "심벌은 ==로 비교하면 예외 없이 false"를 왜 그대로 쓰지 않았을까?
   <details><summary>답</summary>`sym == Object(sym)`은 true다. 래퍼 객체를 ToPrimitive하면 Symbol.prototype[%Symbol.toPrimitive%]가 같은 심벌을 돌려주기 때문이다. 그래서 문자열과 비교하는 경우로 한정했다(변경 이력 2026-11-02 외부 검토 ③, concept.test.ts '불리언 변환은 true…' 테스트).</details>
4. 홈 '객체' 검색 결과를 고정한 e2e를 바꾸지 않으려면 새 개념 meta에서 무엇을 지켜야 했고, 왜 summary를 바꾸면 테스트가 깨질 수 있을까?
   <details><summary>답</summary>filterConcepts가 title·summary·tags에 검색어가 들어 있는지 본다(app/lib/concepts.ts). 새 개념의 세 필드에 '객체'가 들어가면 결과가 12개가 되고 순위 목록도 바뀌어 navigation.spec.ts의 고정값(11, 순위 배열)이 실패한다.</details>
5. 레지스트리를 설명하는 단순화 문구에 판(ES2027 초안·ES2026)을 함께 적은 이유는?
   <details><summary>답</summary>참고 링크(tc39.es/ecma262/)는 현재 초안을 가리키고, 초안은 레지스트리를 Agent Record의 [[GlobalSymbolRegistry]]로 정의한다. 발행된 ES2026판까지는 "globally available, shared by all realms"라서 어느 한쪽만 쓰면 다른 판을 읽은 독자에게 틀린 말이 된다(변경 이력, 두 판 원문 확인).</details>
