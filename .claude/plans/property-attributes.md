# 프로퍼티 어트리뷰트와 접근자 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-28
- 기준: `main` @ `866f3b2`

## 0. 요약

- 목적: 로드맵(13~24장)의 4번 `/concepts/property-attributes`를 추가한다. 다음을 예제 8개와 퀴즈, "프로퍼티 어트리뷰트" 시뮬레이터로 보여 준다.
  - 프로퍼티에는 값 말고도 어트리뷰트(writable·enumerable·configurable)가 있다.
  - 막힌 대입·삭제는 sloppy mode에서는 조용히 무시되고 strict mode에서는 TypeError다.
  - 접근자 프로퍼티(getter·setter)는 읽고 쓸 때마다 함수가 호출된다.
  - `preventExtensions`·`seal`·`freeze`는 어트리뷰트와 확장 가능 여부를 한꺼번에 바꾸며, 얕게 적용된다.
- 범위:
  - 새 개념 폴더 1개(category `objects`, 홈에 '객체와 프로토타입' 그룹이 처음 생긴다)
  - e2e·빌드 테스트 케이스 추가
  - `docs/content-guide.md` e2e 목록 1곳
  - 로드맵
  - 공통 코드와 기존 개념 14개는 바꾸지 않는다.
- 위험:
  - sloppy와 strict의 차이를 "모드에 따라 결과가 다른 예제"로 잘못 쓸 위험 → 예제 쌍에 `'use strict';`를 명시하고 실행 대조 테스트로 막는다.
  - getter를 "값을 저장한 프로퍼티"처럼 그릴 위험 → 같은 대조 테스트로 막는다.
- 복잡도: 중간 · Consensus: 생략. 개념 전용 시각화이고 공통 코드·공통 패턴 변경이 없다. 사실은 명세 원문과 vm·ESM·CJS 실행으로 미리 확인했다.
- 미확정: 없음 (객체 변경 방지는 이 페이지에 포함 — 사용자 결정)

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md`) 4번, 『모던 자바스크립트 Deep Dive』 16장 범위이며 16장까지만 전제한다.
- 핵심:
  - ① 내부 슬롯·내부 메서드(`[[ ]]` 표기)는 명세가 동작을 설명하는 이름이고 코드에서 직접 접근할 수 없다.
  - ② 데이터 프로퍼티는 값·writable·enumerable·configurable을 가진다. 접근자 프로퍼티는 get·set 함수와 enumerable·configurable을 가진다.
  - ③ `Object.getOwnPropertyDescriptor(s)`로 확인하고 `Object.defineProperty`로 정의한다. 리터럴·대입으로 만들면 어트리뷰트가 모두 `true`이고, `defineProperty`에서 생략한 어트리뷰트는 `false`다.
  - ④ writable `false`인 프로퍼티에 대입하거나 configurable `false`인 프로퍼티를 `delete`하면, sloppy mode에서는 조용히 무시된다(`delete`는 `false`). strict mode에서는 TypeError다.
  - ⑤ `defineProperty`로 바꿀 수 없는 재정의를 하면 모드와 관계없이 TypeError다.
  - ⑥ getter는 읽을 때마다, setter는 대입할 때마다 호출된다. setter만 있으면 읽기 결과는 `undefined`다. getter만 있는 프로퍼티에 대입하면 sloppy mode에서는 무시되고 strict mode에서는 TypeError다.
  - ⑦ enumerable `false`면 `Object.keys`·`JSON.stringify`에 나오지 않지만 프로퍼티는 있다(`in`).
  - ⑧ 세 함수가 막는 범위:
    - `preventExtensions`: 추가를 막는다.
    - `seal`: 추가·삭제를 막는다(모든 프로퍼티를 configurable `false`로).
    - `freeze`: 여기에 값 변경까지 막는다(데이터 프로퍼티를 writable `false`로).
    - 세 함수 모두 그 객체의 프로퍼티에만 적용된다(얕다). 프로퍼티 값인 다른 객체는 바뀔 수 있다.
- 사용자 결정(2026-10-28): 객체 변경 방지(preventExtensions·seal·freeze)를 이 페이지에 포함한다.
- 로드맵 결정(B안): strict mode 동작은 첫 줄 `'use strict';` 예제로 보이고, 두 모드를 나란히 보일 수 있다.

### 유지해야 하는 기존 동작

- 기존 개념 14개의 페이지·시뮬레이터·테스트는 그대로 통과해야 하고, 그 파일들은 수정하지 않는다.
- e2e에서 `객체` 검색 결과는 정확히 2개다(`tests/e2e/navigation.spec.ts:17`, `:32`). 그래서 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙(첫 렌더 = 프리렌더)을 지키고 `loader`를 두지 않는다.

### 제외 범위

- `this`를 쓰는 getter·setter(22장 — 예제의 getter·setter는 바깥 변수를 읽고 쓴다)
- 프로토타입과 상속된 프로퍼티의 영향(19장)
- 심벌 키
- `for…in`
- 클래스의 접근자
- `Object.create`
- 깊은 동결을 구현하는 재귀 함수(본문에서 "안쪽 객체에도 따로 적용해야 한다"고만 쓴다)
- Proxy
- 배열의 `length`
- 모듈 실행 결과는 단순화에 적는다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현은 `app/concepts/property-keys/`다.
  - `scenarios.ts:11-42`: `Val`, `ObjectRef`, `Binding`, `Prop`, `ObjectBox`, `Access`, `PropertyState`
  - 객체 카드 시각화: `PropertyView.tsx`
  - `concept.test.ts`
  - TDZ의 try…catch 예제 형식(`app/concepts/tdz/examples/*`, 단순화 ②)과 `errorNameOf`·ESM/CJS 비교(`app/concepts/tdz/concept.test.ts`)
- `property-keys/meta.ts` 단순화 5가 "프로퍼티 어트리뷰트와 접근자 프로퍼티, delete가 false이거나 strict mode에서 TypeError가 나는 경우"를 별도 개념으로 미뤘다. 이 페이지가 그 부분을 이어받는다.
- category `objects`('객체와 프로토타입', `app/lib/concepts.ts:24-26`)를 쓰는 개념은 아직 없다. `groupByCategory`는 개념이 없는 카테고리를 뺀다(`app/lib/concept-groups.ts:9-17`). 따라서 이 개념이 들어가면 홈에 새 그룹이 생긴다(공통 코드 변경 없음).
- 필수 h2는 `동작 원리`, `예제`, `결과와 이유`다(`docs/content-guide.md:60`). e2e 목록은 `docs/content-guide.md:164`다.
- 명세 원문(tc39.es/ecma262, 2026-10-28 로컬에 저장해 확인):
  - 6.1.7.1 Property Attributes (Table 3)
    - 데이터 프로퍼티는 [[Value]]·[[Writable]], 접근자 프로퍼티는 get 함수·set 함수, 둘 다 [[Enumerable]]·[[Configurable]]을 가진다.
    - 기본값은 `undefined`/`false`다.
    - [[Writable]]이 `false`면 [[Set]]으로 값을 바꾸는 시도가 성공하지 않는다.
    - getter는 읽을 때마다, setter는 쓸 때마다 호출된다.
    - [[Configurable]]이 `false`면 삭제, 데이터↔접근자 전환, 어트리뷰트 변경이 실패한다. 예외는 [[Value]] 교체와 [[Writable]]을 `false`로 바꾸는 것이다.
    - 이 초안은 접근자 어트리뷰트 이름을 [[Getter]]·[[Setter]]로 적는다. 판마다 표기가 다를 수 있으므로 본문은 디스크립터 필드 이름 `get`·`set`으로만 쓴다.
  - 6.1.7.2 Object Internal Methods and Internal Slots
  - OrdinarySetWithOwnDescriptor: 자기 데이터 프로퍼티가 writable `false`면 `false`를 돌려주고, 접근자 프로퍼티의 setter가 `undefined`면 `false`를 돌려준다.
  - PutValue: [[Set]]이 `false`를 돌려주고 참조가 strict면 TypeError다. sloppy면 아무 일도 없다.
  - `delete` 연산자: [[Delete]]가 `false`이고 strict면 TypeError다. sloppy면 `false`를 돌려준다.
  - `Object.defineProperty` → DefinePropertyOrThrow: 실패하면 모드와 관계없이 TypeError다.
  - SetIntegrityLevel:
    - sealed는 모든 키를 { [[Configurable]]: false }로 바꾼다.
    - frozen은 접근자를 { [[Configurable]]: false }로, 데이터 프로퍼티를 { [[Configurable]]: false, [[Writable]]: false }로 바꾼다.
    - 둘 다 먼저 [[PreventExtensions]]를 한다.
  - `Object.freeze`: 객체가 아니면 그대로 돌려주고, 객체면 그 객체를 돌려준다.
  - SerializeJSONObject: enumerable인 자기 문자열 키만 쓰고 값은 Get으로 읽는다(getter 호출).
  - 앵커 존재 확인:
    - `sec-property-attributes`, `sec-object-internal-methods-and-internal-slots`, `sec-ordinarysetwithowndescriptor`, `sec-putvalue`
    - `sec-delete-operator-runtime-semantics-evaluation`, `sec-ordinarydelete`, `sec-validateandapplypropertydescriptor`, `sec-object.defineproperty`, `sec-definepropertyorthrow`
    - `sec-object.getownpropertydescriptor`, `sec-object.getownpropertydescriptors`, `sec-frompropertydescriptor`
    - `sec-object.preventextensions`, `sec-object.seal`, `sec-object.freeze`, `sec-setintegritylevel`, `sec-testintegritylevel`, `sec-object.isfrozen`
    - `sec-serializejsonobject`, `sec-runtime-semantics-methoddefinitionevaluation`, `sec-runtime-semantics-propertydefinitionevaluation`
- 예제 초안 실제 출력. vm은 `util.format`(`runExample`과 같은 방식)으로 실행했고, `.mjs`·`.cjs`는 파일로 직접 실행했다.

  | # | 파일 | 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `descriptor.js` | `{"value":100,"writable":true,"enumerable":true,"configurable":true}` / `{"value":"A1","writable":false,"enumerable":false,"configurable":false}` / `{"price":100}` | 같음 | 같음 |
  | 2 | `writable-sloppy.js` | `A1` / `false` / `A1` | TypeError(모듈은 strict) | 같음 |
  | 3 | `writable-strict.js` | `TypeError` / `TypeError` / `A1` | 같음 | 같음 |
  | 4 | `redefine.js` | `TypeError` / `A1` | 같음 | 같음 |
  | 5 | `getter.js` | `1` / `2` / `function` / `{"next":3}` | 같음 | 같음 |
  | 6 | `setter.js` | `100` / `212` / `["get","set","enumerable","configurable"]` | 같음 | 같음 |
  | 7 | `three-levels.js` | `[{},{"x":3},{"x":1}]` | TypeError | 같음 |
  | 8 | `freeze-shallow.js` | `1` / `20` / `true` / `false` | TypeError | 같음 |

- 본문 근거로 쓸 vm 실행 결과(오류는 `e.name`):
  - getter만 있는 프로퍼티에 대입: sloppy는 무시(다시 읽으면 getter 값), strict는 TypeError
  - 확장 불가 객체에 추가: sloppy는 무시(`undefined`), strict는 TypeError
  - configurable `true`·writable `false`: `defineProperty`로 값 변경 가능
  - configurable `false`·writable `true`: writable을 `false`로 바꾸기 가능, 값 변경 가능
  - configurable `false`·writable `false`: writable을 `true`로 바꾸면 TypeError, 같은 값으로 재정의하면 오류 없음
  - configurable `false`인 데이터 프로퍼티를 접근자로 바꾸면 TypeError, configurable `true`면 가능
  - 없는 키의 디스크립터는 `undefined`
  - enumerable `false`: `Object.keys` 길이 0, `in`은 `true`
  - freeze한 객체의 setter는 여전히 호출된다
  - freeze 뒤 접근자 디스크립터는 configurable `false`이고 writable 필드가 없다
  - seal: 데이터 프로퍼티 writable `true`·configurable `false`·확장 불가
  - freeze: writable `false`·configurable `false`·확장 불가
  - preventExtensions: 어트리뷰트 그대로, 확장 불가
  - `Object.freeze(o) === o`, `Object.freeze(5)` → `5`
  - 무시된 대입식의 값은 오른쪽 값이다(`(o.a = 2)` → `2`)
  - 리터럴 getter의 디스크립터: enumerable `true`·configurable `true`·set `undefined`
  - frozen이면 sealed이고 확장 불가
  - 상속된 non-writable 프로퍼티가 있으면 자기 프로퍼티 추가 대입도 무시된다(단순화의 근거)
- Chromium(Playwright)에서 예제 이름 `item`·`counter`·`reads`·`temp`·`celsius`·`config`·`a`·`b`·`c`는 `in window`가 아니다(`[]`).
- MDN ko `Object/defineProperty`·`getOwnPropertyDescriptor`·`freeze`·`seal`·`preventExtensions`, `Functions/get`·`set`은 200을 돌려준다.

### 추정

- 없음

## 3. 구현 전략

- property-keys(객체 카드)와 tdz(try…catch 예제) 구조를 조합해 개념 폴더를 만든다.
  - slug `property-attributes`, category `objects`
  - 제목 `'프로퍼티 어트리뷰트와 접근자: 대입했는데 값이 그대로인 이유'`
  - 시뮬레이터 label `'프로퍼티 어트리뷰트 시뮬레이터'`
- 상태(`AttrState`). 개념 간 공유는 금지라 property-keys에서 복사해 고친다.
  - `Val`: `number`·`string`·`boolean`·`undefined`(display)
  - `ObjectRef`: `{ kind: 'object'; id }`
  - `Binding`: `{ name; declaredWith: 'const' | 'let'; value: Val | ObjectRef; changed?: true }` — getter·setter가 읽고 쓰는 바깥 변수(`reads`)도 여기에 둔다.
  - `DataProp`: `{ key; kind: 'data'; value: Val | ObjectRef; writable; enumerable; configurable; changed?: ('created' | 'value' | 'writable' | 'enumerable' | 'configurable')[] }`
  - `AccessorProp`: `{ key; kind: 'accessor'; get: string | null; set: string | null; enumerable; configurable; changed?: … }`
    - `get`·`set`은 함수 원문 첫 줄 표시(예: `'get next() { … }'`)이고, 없으면 `null`이다.
  - `ObjectBox`: `{ id; label; extensible: boolean; props: (DataProp | AccessorProp)[]; changed?: ('created' | 'extensible')[] }`
  - `Op`: `{ code; kind: 'read' | 'assign' | 'delete' | 'define' | 'describe' | 'stringify' | 'integrity'; objectId; key?; result: 'value' | 'created' | 'updated' | 'ignored' | 'deleted' | 'delete-false' | 'TypeError' | 'getter-called' | 'setter-called' | 'applied'; value?: Val }`
    - `ignored`는 "sloppy mode라 대입이 조용히 무시됨"이다.
    - `TypeError`는 무시 대신 오류가 났다는 뜻이다.
    - `getter-called`·`setter-called`는 함수 호출의 결과 값을 함께 둔다.
  - `AttrState`: `{ bindings; objects; op: Op | null }`
- 화면(`AttrView`):
  - 3영역: 변수 / 객체 카드 / 이번 단계의 동작
  - 객체 카드
    - 머리: `객체 A`, 확장 가능 여부 배지 `확장 가능`·`확장 불가`
    - 프로퍼티는 행마다 `key`, 종류 배지(`데이터`·`접근자`), 값(데이터) 또는 `get`·`set`(접근자, 없으면 `없음`)을 보인다.
    - 어트리뷰트 칩은 `writable: true`처럼 이름과 값을 글자로 쓴다. 색만으로 구분하지 않는다.
    - 그 단계에서 바뀐 칸은 강조한다.
  - 동작 패널: 코드와 결과 문장(예: "writable이 false라 대입이 무시됨 — strict mode가 아니라 오류 없음", "TypeError", "getter 호출 → 1 반환")
  - 375px에서 칩이 줄바꿈되게 `flex-wrap`과 `wrap` 클래스를 쓴다.
- 시나리오 4개:
  - `writable-sloppy`(예제 2): `defineProperty`로 정의(나머지 어트리뷰트 `false`) → 대입 무시 → `delete`가 `false` → 값 그대로
  - `writable-strict`(예제 3): 같은 코드에 `'use strict';`를 붙인다. 대입 TypeError → catch → `delete` TypeError → catch → 값 그대로. 두 시나리오를 바꿔 보며 모드 차이를 비교할 수 있다.
  - `getter`(예제 5): 읽을 때마다 getter 호출 → 바깥 `reads`가 1, 2로 바뀜 → 디스크립터의 get이 함수(호출 안 됨) → `JSON.stringify`가 getter를 다시 호출해 `reads` 3
  - `freeze-shallow`(예제 8): 객체 A(config)·B(limits) → freeze가 A만 확장 불가·writable/configurable `false` → A.level 대입 무시 → B.max 대입 성공 → 출력
  - 예제 1·4·6·7은 예제·퀴즈·본문으로 다룬다.
- 정확성 검증:
  - (a) 공통 불변식
  - (b) 구조
    - ObjectRef가 존재하는 객체를 가리킨다.
    - 데이터·접근자 필드가 배타적이다.
    - `changed` 표시가 이전 단계와 비교한 실제 변화와 같다.
    - op `ignored`는 sloppy 시나리오에만, op `TypeError`는 strict 시나리오 또는 `defineProperty`에만 나온다.
  - (c) 스냅샷 대조: 단계마다 예제 해당 줄 뒤에 탐침을 끼워 vm 컨텍스트 안에서 실제 값을 읽고 화면 상태와 비교한다.
    - 읽는 것: 각 객체의 `Object.getOwnPropertyDescriptors`(접근자는 함수 유무만), `Object.isExtensible`, 바깥 변수 값
    - 탐침은 접근자 값을 읽지 않는다. getter를 호출하면 `reads`가 바뀌기 때문이다.
  - (d) op 검증
    - `ignored` 단계: 그 줄을 strict로 실행하면 TypeError이고, sloppy 실행 뒤 값이 그대로다.
    - `TypeError` 단계: 그 줄이 실제로 TypeError를 던진다.
    - `getter-called` 단계: 실행 전후 `reads`가 1 늘어난다.
  - (e) 음성 확인
    - `writable-sloppy`의 대입 단계를 `updated`로 그리면 실패해야 한다.
    - `freeze-shallow`에서 B도 확장 불가로 그리면 실패해야 한다.
- 버린 대안:
  - ① `this`로 자기 프로퍼티를 읽는 getter: `this`는 22장(8번)이다. 바깥 변수를 쓰고, 단순화에 "보통 this를 쓰지만 별도 개념"이라고 밝힌다.
  - ② 객체 변경 방지를 따로 빼기: 사용자가 포함을 결정했다.
  - ③ 공통 실행기로 잡히지 않은 TypeError 지원: tdz와 같은 이유로 try…catch를 쓴다.
  - ④ 디스크립터를 JSON 그대로 보이는 화면: 접근자 함수가 JSON에서 사라지고(`JSON.stringify`가 함수를 뺀다), 바뀐 칸을 강조할 수 없다. 칩 표로 그린다.
  - ⑤ 예제 7(preventExtensions·seal·freeze 비교)을 시나리오로: 객체 3개 × 동작 9개라 단계가 길다. 본문의 비교 표와 퀴즈로 다룬다.

## 4. 변경 파일

- 추가 `app/concepts/property-attributes/`:
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 8개(2절 표)
  - `scenarios.ts`, `AttrView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `PROPERTY_ATTRIBUTES_PATH`, `PROPERTY_ATTRIBUTES_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: tdz 케이스를 본떠 추가
  - `docs/content-guide.md:164`: e2e 목록
  - `.claude/plans/concept-roadmap-ch13-24.md`: 4번 행·진행 기록
- 변경하지 않음:
  - 공통 코드(`app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, `tests/e2e/navigation.spec.ts`), `package.json`, `AGENTS.md`
  - 기존 개념 폴더 14개. `property-keys`에서 이 페이지로 이어지는 역방향 연결은 9절 후보로 둔다.

## 5. 위험 요소

- 모드 차이를 "결과가 모드에 따라 다른 예제"로 쓰는 것(AGENTS 예제 규칙 위반) → strict 예제는 첫 줄에 `'use strict';`를 둔다. sloppy 예제가 모듈에서 다른 결과를 낸다는 것은 단순화와 `.mjs` 테스트로 밝힌다.
- "writable false면 값을 절대 못 바꾼다"는 과장 → configurable이 `true`면 `defineProperty`로 바꿀 수 있다는 것을 본문에 쓰고 근거 테스트를 둔다.
- "freeze하면 모든 게 바뀌지 않는다"는 과장
  - 얕음: 예제 8
  - setter는 여전히 호출된다: 테스트와 본문 한 줄
- "getter는 값을 저장한다"는 오해 → 예제 5에서 `JSON.stringify`도 getter를 호출함(`{"next":3}`)을 보이고, 시나리오에서 `reads` 변화로 보인다.
- 탐침이 getter를 호출해 상태를 바꾸는 것 → 디스크립터만 읽고 값은 데이터 프로퍼티만 읽는다(작업 순서 2 주의사항).
- 명세 판마다 다른 접근자 어트리뷰트 표기([[Get]]·[[Getter]]) → 본문은 디스크립터 필드 `get`·`set`으로만 쓴다.
- 내부 슬롯 설명이 엔진 구현처럼 읽힘 → "명세가 동작을 설명하려고 쓰는 이름이며 코드에서 직접 접근할 수 없다"로 쓴다.
- `객체` 검색 2건 → meta의 세 필드에 `객체`가 없어야 한다(1단계 완료 조건).
- 새 홈 그룹 → 빌드·e2e 홈 테스트를 확인한다. 카드 수 15개는 브라우저 시나리오에서 확인한다.
- 375px 칩 넘침 → `flex-wrap`, e2e 가로 스크롤 검사

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 8개의 실제 출력이 `expectedOutput`과 같다.
  - 본문 주장을 검증한다(2절 목록, `.mjs`·`.cjs`).
  - 시나리오 대조(3절 a~e)
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. 첫 화면: "검토 중" 배지, 분류 '객체와 프로토타입', 선행 개념 링크, 퀴즈 라디오 UI
  2. `쓰기 금지: sloppy mode`
     - 정의 단계: `code` 칩 `writable: false`·`enumerable: true`·`configurable: false`
     - 대입 단계: 동작 패널에 무시 문구, 값 `'A1'` 그대로
     - 콘솔: `A1` / `false` / `A1`
  3. `쓰기 금지: strict mode`: 대입 단계 TypeError 문구, 콘솔 `TypeError` / `TypeError` / `A1`
  4. `getter는 읽을 때 호출된다`: 첫 읽기 단계에서 `reads = 1`, getter 호출 문구, 마지막 `reads = 3`
  5. `freeze는 얕다`: freeze 단계에서 객체 A만 `확장 불가`와 writable/configurable `false`, 객체 B는 그대로. 콘솔 `1` / `20` / `true` / `false`
  6. 375px·다크에서 2~5를 반복하고 다음을 확인한다: 가로 넘침 0, 키보드 ←/→/Home, 콘솔 에러 0
  7. 홈: '객체와 프로토타입' 그룹 카드 1개, 전체 카드 15개, `객체` 검색 2건, `어트리뷰트` 검색 1건

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `app/concepts/property-attributes/examples/*.js`(8개), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장 부분), 필수 h2 자리표시용 `content.mdx`
- 변경
  - 예제 8개는 아래 원문 그대로 둔다(` / `는 줄 구분, 들여쓰기 2칸, 끝 줄바꿈 1개).
    - `descriptor.js`: `const item = { price: 100 };` / `console.log(JSON.stringify(Object.getOwnPropertyDescriptor(item, 'price')));` / `Object.defineProperty(item, 'code', { value: 'A1' });` / `console.log(JSON.stringify(Object.getOwnPropertyDescriptor(item, 'code')));` / `console.log(JSON.stringify(item));`
    - `writable-sloppy.js`: `const item = {};` / `Object.defineProperty(item, 'code', { value: 'A1', enumerable: true });` / `item.code = 'B2';` / `console.log(item.code);` / `console.log(delete item.code);` / `console.log(item.code);`
    - `writable-strict.js`: `'use strict';` / `const item = {};` / `Object.defineProperty(item, 'code', { value: 'A1', enumerable: true });` / `try {` / `  item.code = 'B2';` / `} catch (e) {` / `  console.log(e.name);` / `}` / `try {` / `  delete item.code;` / `} catch (e) {` / `  console.log(e.name);` / `}` / `console.log(item.code);`
    - `redefine.js`: `const item = {};` / `Object.defineProperty(item, 'code', { value: 'A1' });` / `try {` / `  Object.defineProperty(item, 'code', { value: 'B2' });` / `} catch (e) {` / `  console.log(e.name);` / `}` / `console.log(item.code);`
    - `getter.js`: `let reads = 0;` / `const counter = {` / `  get next() {` / `    reads = reads + 1;` / `    return reads;` / `  },` / `};` / `console.log(counter.next);` / `console.log(counter.next);` / `console.log(typeof Object.getOwnPropertyDescriptor(counter, 'next').get);` / `console.log(JSON.stringify(counter));`
    - `setter.js`: `let celsius = 0;` / `const temp = {` / `  get fahrenheit() {` / `    return (celsius * 9) / 5 + 32;` / `  },` / `  set fahrenheit(f) {` / `    celsius = ((f - 32) * 5) / 9;` / `  },` / `};` / `temp.fahrenheit = 212;` / `console.log(celsius);` / `console.log(temp.fahrenheit);` / `console.log(JSON.stringify(Object.keys(Object.getOwnPropertyDescriptor(temp, 'fahrenheit'))));`
    - `three-levels.js`: `const a = Object.preventExtensions({ x: 1 });` / `const b = Object.seal({ x: 1 });` / `const c = Object.freeze({ x: 1 });` / `a.y = 2;` / `b.y = 2;` / `c.y = 2;` / `a.x = 3;` / `b.x = 3;` / `c.x = 3;` / `delete a.x;` / `delete b.x;` / `delete c.x;` / `console.log(JSON.stringify([a, b, c]));`
    - `freeze-shallow.js`: `const config = { level: 1, limits: { max: 10 } };` / `Object.freeze(config);` / `config.level = 2;` / `config.limits.max = 20;` / `console.log(config.level);` / `console.log(config.limits.max);` / `console.log(Object.isFrozen(config));` / `console.log(Object.isFrozen(config.limits));`
  - `meta.ts`
    - slug, title, category는 3절대로 한다.
    - summary는 160자 이하이고 `객체`를 쓰지 않는다. 다음 내용을 담는다: 프로퍼티의 어트리뷰트, writable `false` 대입은 sloppy에서 무시·strict에서 TypeError, getter는 읽을 때마다 호출, freeze는 어트리뷰트를 한꺼번에 바꾸고 얕다.
    - tags: `프로퍼티 어트리뷰트`, `디스크립터`, `defineProperty`, `writable`, `enumerable`, `configurable`, `접근자 프로퍼티`, `getter`, `setter`, `freeze`, `seal`, `strict mode`, `TypeError`. `객체`는 넣지 않는다.
    - goals 4개
    - prerequisites: `property-keys`, `primitives-and-objects`, `tdz`(try…catch 예제 형식)
    - related: `[]`
    - examples 8개(2절 출력)
    - `reviewedAt: null`
  - 단순화
    - ① 내부 슬롯·메서드(`[[ ]]`)는 명세 표기이며 코드에서 접근할 수 없다. 화면의 칩은 디스크립터 필드를 보인다.
    - ② 예제는 오류를 try…catch와 `e.name`으로 보인다(오류 처리는 별도 개념). 무시된 대입식도 오른쪽 값으로 평가된다는 점은 다루지 않는다.
    - ③ getter·setter는 보통 `this`로 자기 프로퍼티를 읽고 쓰지만 `this`는 별도 개념이다. 예제는 바깥 변수를 쓴다.
    - ④ 상속된 프로퍼티(프로토타입)의 writable·setter도 대입 결과에 영향을 주지만 별도 개념에서 다룬다. 예제는 자기 프로퍼티만 쓴다.
    - ⑤ 심벌 키와 `for…in`은 다루지 않는다.
    - ⑥ sloppy 예제 2·7·8은 ES 모듈(항상 strict)에서 TypeError다. CommonJS는 같다.
    - ⑦ 시뮬레이터는 바깥 변수를 찾는 과정과 `console`·`JSON` 호출 과정을 보이지 않는다.
  - `concept.test.ts` 본문 주장 `describe`
    - 2절 vm 목록 전부
    - 예제 3에서 `'use strict';`를 빼면 출력은 `A1` 하나뿐이다(대입·삭제가 오류 없이 무시된다). 예제 4는 첫 줄에 지시어를 붙여도 `TypeError` / `A1`로 같다(`defineProperty`는 모드와 관계없다).
    - `.mjs`·`.cjs` 출력이 2절 표와 같다.
    - 각 sloppy 예제는 첫 줄에 `'use strict';`를 붙이면 TypeError다(모듈 결과와 일치).
- 주의사항
  - `console.log`에는 원시 값과 `JSON.stringify` 결과만 넘긴다.
  - 예제는 Prettier·ESLint 제외 경로다.
  - vm 테스트에서 객체를 꺼내 호스트에서 검사할 때는 realm이 다르므로 `instanceof`를 쓰지 않는다.
- 완료 조건
  - `npm test`에서 L1 8개와 본문 주장 테스트가 통과한다.
  - lint·format:check·typecheck가 통과한다.
  - meta 세 필드에 `객체`가 없다(grep).

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오 부분)
- 변경
  - 3절 상태 모델과 시나리오 4개를 만든다.
  - 단계는 줄 단위로 나눈다. 선언·정의·대입·삭제·읽기·출력을 각 1단계로 하고, try…catch는 오류 단계와 catch 단계로 나눈다(tdz와 같다).
  - 테스트: 3절 (a)~(d)와 단계 수 고정
- 주의사항
  - 탐침은 `Object.getOwnPropertyDescriptors`·`Object.isExtensible`·바깥 변수만 읽는다. 접근자 값은 읽지 않는다.
  - 탐침은 vm 컨텍스트 안에서 실행하고 결과를 JSON으로 넘긴다.
  - strict 시나리오의 탐침도 같은 파일(지시어 포함)에 끼운다.
- 완료 조건
  - 이 개념 테스트가 전부 통과한다.
  - 음성 확인 2건(3절 (e))은 서브에이전트가 실행해 실패를 확인하고 되돌린다. 메인이 테스트 코드를 확인한다.

### 3. 시각화 `AttrView`

- 대상: `AttrView.tsx`, `AttrView.test.tsx`
- 변경: 3절 화면. property-keys `PropertyView`의 카드·클래스 문자열을 기반으로 한다.
- 주의사항
  - effect와 window 접근을 쓰지 않는다.
  - 어트리뷰트를 색만으로 구분하지 않는다.
  - 375px에서 줄바꿈된다.
- 완료 조건
  - `AttrView.test.tsx`가 통과한다. 검사 항목: 빈 상태, 데이터 프로퍼티 칩, 접근자 행(get·set 없음 표시), 확장 불가 배지, 무시·TypeError·getter 호출 문구, 바뀐 칸 표시
  - typecheck가 통과한다.

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="프로퍼티 어트리뷰트 시뮬레이터"`
- 완료 조건: 테스트 4개(첫 화면, 무시 문구 단계, 시나리오 전환, 마지막 콘솔)가 통과한다.

### 5. 본문 content.mdx

- `## 동작 원리`의 h3:
  - 프로퍼티에는 어트리뷰트가 있다(내부 슬롯·메서드 표기 포함)
  - 디스크립터로 확인하고 정의한다(리터럴 `true` vs `defineProperty` 기본 `false`)
  - 세 어트리뷰트가 막는 것
  - 막힌 대입과 삭제: sloppy는 무시, strict는 TypeError
  - `defineProperty`는 모드와 관계없이 TypeError
  - 접근자 프로퍼티(getter·setter 호출, setter만 있을 때, getter만 있을 때 대입)
  - 객체 변경 방지(JSX `<table>`로 세 함수 비교: 추가·삭제·값 변경·어트리뷰트 변경)
  - 변경 방지는 얕다
- `## 예제`: 예제 1~8에 `file=` 코드 블록과 PredictQuiz를 둔다. 끝에 `### 시뮬레이터로 확인하기`를 둔다.
- `## 결과와 이유`
  - 예제별 설명
  - 오해 Callout 5개
    - 오류가 없으면 대입이 된 것이다
    - writable `false`면 절대 못 바꾼다
    - getter는 값을 저장한다
    - enumerable `false`면 프로퍼티가 없다
    - freeze하면 안쪽까지 얼린다
- 링크: property-keys, primitives-and-objects, tdz(try…catch 형식), block-scope(`const` 재할당과 다름)
- 주의사항
  - 2절의 확인된 사실만 쓴다.
  - 엔진 내부 구현처럼 쓰지 않는다.
  - 오류 메시지 문구를 인용하지 않는다.
  - `this`·프로토타입·클래스는 "별도 개념"으로만 쓴다.
  - `**`와 깨진 인라인 code가 없어야 한다.
- 완료 조건
  - 메인이 전문을 2절과 대조한다.
  - `npm test`와 build가 성공한다.
  - HTML `<details` 수가 퀴즈 수와 같고, `**`가 0개다.

### 6. e2e·빌드 테스트·문서

- tdz 케이스를 본떠 추가만 한다(오류·무시 문구 단계 확인 e2e 1개 포함).
- content-guide 목록과 로드맵을 고친다.
- 완료 조건: 전체 검증 명령이 통과하고, 6절 브라우저 시나리오 1~7을 확인한다.

## 9. 추가 개선 후보

- 추가 게시글 후보: 없음. 16장의 나머지 내용(내부 슬롯, 디스크립터, 변경 방지)은 이 페이지에 담았다.
- `property-keys/meta.ts`의 `related`에 `property-attributes`를 거는 역방향 연결과, 단순화 5의 "별도 개념"을 이 페이지 링크로 바꾸는 일(기존 개념 수정, 사용자 확인)

## 변경 이력

- 2026-10-28 (사용자 요청 — 외부 글 리뷰 반영): 6건을 명세·실행으로 검증해 모두 반영. ① 접근자 어트리뷰트 이름: ES2025 판은 `[[Get]]`·`[[Set]]`(내부 메서드와 같은 이름), 현재 초안은 `[[Getter]]`·`[[Setter]]`(두 판 원문 확인) → 본문에 두 판의 표기와 내부 메서드와의 차이를 설명하고 ES2025 참고 링크 추가(계획 2절의 "본문은 get·set으로만" 방침을 바꿈) ② "그렇지 않으면 아무 일도 일어나지 않는다" → "값이 바뀌지 않을 뿐 오류도 나지 않는다" + 오른쪽 식은 평가됨(근거 테스트), 단순화 ②의 "다루지 않는다" 문구 삭제 ③ 학습 목표 1에 "새로 만들 때" 조건 ④ sloppy mode 첫 등장에 "명세 용어는 non-strict mode code" 병기(명세 초안에 'sloppy' 0회·'non-strict' 81회) ⑤ CommonJS 문장에 "TypeScript·Babel이 변환한 CommonJS 출력에는 보통 use strict가 붙는다" 추가(TypeScript 6.0.3 `module: commonjs` 출력, Babel 7.28 `plugin-transform-modules-commonjs` 출력에서 확인) ⑥ defineProperty의 같은 값 판단은 SameValue(동등 비교 페이지 링크, NaN→NaN 허용·0→-0 TypeError 근거 테스트). 범위·접근 방식 변화 없음 — 영향 단계 1(meta), 5(본문).

## 구현 진행

- baseline (2026-10-28, `866f3b2`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 55파일 1304 통과(메인 재실행). `test:build` 112·`e2e` 203 통과(3 skipped)는 같은 커밋의 직전 검증 결과(tdz 구현 진행 6). dev 서버 5173 실행 중(빌드 산출물과 무관), serve 4175 미실행.
- [x] 1. 예제·meta·route·본문 주장 테스트 — 서브에이전트 작성, 메인 재실행: lint·format:check·typecheck 통과, `npm test` 56파일 1373 통과. 예제 8개 = 계획 초안 원문(diff 없음), meta `title`·`summary`·`tags`에 `객체` 없음. 본문 주장 테스트는 2절 목록 전부 + setter만 있을 때 읽기 `undefined`, 막힌 `delete`가 sloppy에서 `false`. 메인 수정 1건: summary에 계획 요구(freeze) 누락 → "…getter는 읽을 때마다 호출되고, freeze는 얕게 적용됩니다."(155자). `content.mdx`는 필수 h2용 자리표시(5단계에서 다시 씀).
- [x] 2. 시나리오와 대조 테스트 — 메인 재실행: lint·format·typecheck 통과, `npm test` 56파일 1421 통과. 단계 수 7/8/7/9. 스냅샷 대조는 줄이 있는 모든 단계(탐침이 vm 안에서 `getOwnPropertyDescriptors`·`isExtensible`·바깥 변수만 읽음, 접근자 값은 읽지 않음, `config.limits`로 B 추적, 그 시점 콘솔 출력도 대조). op 검증: `ignored`·`delete-false` 단계는 그 문장만 strict 함수 안에서 실행하면 TypeError, `TypeError` 단계는 실제로 던짐, getter 호출 단계는 `reads`가 1씩 증가, describe 단계는 `reads` 불변. 음성 확인(서브에이전트 실행·되돌림, 메인이 테스트 코드 확인): 대입 단계를 `updated`·`B2`로 그리면 2개 실패, freeze 단계에서 B를 확장 불가로 그리면 3개 실패. 메인이 단계 설명을 명세와 대조(isFrozen 이유, getOwnPropertyDescriptor가 getter를 호출하지 않음, JSON.stringify가 getter 호출) — 수정 없음.
- [x] 3. 시각화 `AttrView` — 메인 재실행: lint·format·typecheck 통과, `npm test` 58파일 1438 통과. effect·window·document 없음(grep). 어트리뷰트는 `writable: false` 같은 글자 칩, 바뀐 칸은 `bg-highlight` + `data-changed`, 동작 패널은 결과 문장(무시·delete false·TypeError·getter 호출·디스크립터 읽기(getter 호출 안 함)·적용됨·결과). `AttrView.test.tsx` 14개. 참고: 시나리오에 없는 결과(`deleted`·`setter-called`)의 문장 분기는 타입상 남겨 둠. `ignored` 문장은 "writable이 false라"로 고정되어 있는데, 이 개념의 무시 단계는 모두 writable 때문이라 사실과 맞음(확장 불가로 무시되는 시나리오를 추가하면 문장도 바꿔야 함).
- [x] 4. 래퍼 `Simulator` — `label="프로퍼티 어트리뷰트 시뮬레이터"`, tdz 래퍼와 같은 형태. `Simulator.test.tsx` 4개 통과.
- [x] 5. 본문 content.mdx — 서브에이전트 작성 후 메인이 전문을 명세·실행 결과와 대조해 수정: ① (명세 불일치, High 급) "[[Value]]·[[Writable]]… 내부 슬롯과 내부 메서드라고 부르는 이 이름" → 어트리뷰트·내부 슬롯(`[[Extensible]]`)·내부 메서드(`[[Get]]`·`[[Set]]`·`[[Delete]]`)를 구분(명세 원문 확인: "Every ordinary object has a Boolean-valued [[Extensible]] internal slot", 10.1.8~10.1.10), meta 단순화 ①도 같은 취지로 수정 ② 예제 2·3을 "같은 코드"라 한 두 곳 → "같은 동작을 모드만 바꿔"(예제 3에는 try…catch가 더 있음) ③ 변경 방지 표 아래에 "'가능'은 writable·configurable이 true일 때" 조건 추가 ④ freeze 뒤 setter가 호출되는 이유를 명세 근거(freeze는 접근자의 configurable만 바꾸고, 접근자 대입은 set이 있으면 호출)로 교체. 근거 테스트 1개 추가(이미 있는 프로퍼티를 defineProperty로 고치면 생략한 어트리뷰트는 그대로). 메인 재실행: lint·format·typecheck 통과, `npm test` 58파일 1439 통과. 서브에이전트 build 확인: `<details` 8·`**` 0·깨진 code 0·`<table` 1(6단계에서 메인 재확인).
- [x] 6. e2e·빌드 테스트·문서 — 서브에이전트가 테스트 4파일에 추가만(tdz 케이스 본뜸 + 무시·TypeError 문구 단계 e2e). 메인: content-guide `:164` 목록에 `property-attributes`, 로드맵 4번 행·진행 기록. 메인 전체 재실행: lint·format·typecheck 통과, `npm test` 58파일 1439, `test:build` 120, `e2e` 219 통과·3 skipped(기존). 빌드 HTML `<details` 8·`**` 0·깨진 code 0·`<table` 1. 브라우저(빌드 serve 4175, Playwright, 데스크톱 라이트·375px 다크): 4개 시나리오 기대 텍스트 일치(정의 단계 칩 `writable: false`·`enumerable: true`·`configurable: false`, 무시 문구, `TypeError 발생`, `reads = 1/2/3`·getter 호출 문구·디스크립터 단계 "getter는 호출하지 않음", freeze 단계 A 확장 불가·B 확장 가능), 끝에서 다음 비활성, '검토 중'·'객체와 프로토타입'·선행 링크 3개·라디오 36(퀴즈 32 + 시나리오 4), 키보드 Home/→, 가로 넘침 0(진행 후 포함), 콘솔 에러 0, 홈 카드 15·'객체와 프로토타입' 그룹 제목 1·`객체` 2·`어트리뷰트` 1. freeze 단계 강조는 DOM으로 확인: `data-changed`가 A의 확장 배지와 A 프로퍼티 칩 4개뿐(B 없음). 375px 다크 스크린샷 육안 확인.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가 + 문서 2줄): 새 Critical/High 0. 명세 불일치 1건(어트리뷰트를 내부 슬롯·메서드로 부름, High 급)은 5단계 메인 대조에서 수정 완료. 확인한 것: 본문·단순화·시나리오 설명이 명세 절(Property Attributes 표와 기본값, OrdinarySetWithOwnDescriptor, PutValue·delete의 strict 분기, DefinePropertyOrThrow, SetIntegrityLevel, SerializeJSONObject, 내부 슬롯 [[Extensible]]·내부 메서드 [[Get]]/[[Set]]/[[Delete]])와 일치, 모든 실행 결과 주장에 테스트 존재(`.mjs`·`.cjs`·strict 재실행 포함), 탐침은 vm 안에서 디스크립터만 읽어 getter를 호출하지 않음, 하이드레이션(AttrView 효과·window 없음), 오류 메시지 인용 없음, meta 세 필드에 `객체` 없음(e2e `객체` 2건 유지). Low 2: ① `AttrView`의 `ignored` 문장이 "writable이 false라"로 고정 — 현재 무시 단계는 모두 writable 때문이라 사실과 맞지만, 확장 불가·getter만 있는 경우를 시나리오에 추가하면 문장을 일반화해야 함 ② 시나리오에 없는 결과(`deleted`·`setter-called`) 문장 분기가 테스트되지 않음. 둘 다 동작 영향 없음, 보고만.
- [x] 7. 외부 글 리뷰 반영(변경 이력 2026-10-28) — 메인 직접(본문·meta 문장과 근거 테스트 2개). 재실행: lint·format·typecheck 통과, `npm test` 58파일 1441, `test:build` 120, HTML `<details` 8·`**` 0·깨진 code 0, 이 개념 e2e 16 통과.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 달라진 점: ① 사용자가 전달한 외부 글 리뷰 6건 반영(변경 이력) — 그중 접근자 어트리뷰트 이름은 계획의 "본문은 get·set으로만" 방침을 바꿔 ES2025(`[[Get]]`·`[[Set]]`)와 현재 초안(`[[Getter]]`·`[[Setter]]`) 표기를 함께 설명 ② 메인 대조에서 본문의 "어트리뷰트 = 내부 슬롯·메서드" 서술과 요약 문장 등을 고침(구현 진행 1·5).
- 완료 조건 변경 없음.

### 코드 리뷰

- 리뷰 1차 새 Critical/High 0(명세 불일치 1건은 구현 중 수정). Low 2건(무시 문장이 writable 원인으로 고정, 시나리오에 없는 결과 문장 미검증)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `reviewedAt` 기록
- [ ] `property-keys`의 `related`에 `property-attributes` 역방향 연결과 단순화 5의 "별도 개념"을 이 페이지 링크로 바꾸기(기존 개념 수정, 사용자 확인)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 본문의 "`[[Value]]`·`[[Writable]]`… 내부 슬롯과 내부 메서드라고 부르는 이름"을 어트리뷰트·내부 슬롯(`[[Extensible]]`)·내부 메서드(`[[Get]]`·`[[Set]]`·`[[Delete]]`)로 나눠 고쳤다 — 셋 다 `[[ ]]` 표기지만 명세에서 다른 범주이고, 섞으면 명세를 읽을 때 오개념이 된다.
- [Claude 판단] 시뮬레이터 대조 탐침은 `getOwnPropertyDescriptors`·`isExtensible`·바깥 변수만 읽고 접근자 값은 읽지 않는다 — 값을 읽으면 getter가 호출되어 `reads`가 바뀌므로, 검증 자체가 검증 대상을 바꾼다.
- [무검토 승인] category를 `objects`로 두어 홈에 '객체와 프로토타입' 그룹이 처음 생겼다 — 5~8번(new, 프로토타입, 래퍼 객체, this)도 같은 그룹에 들어갈 주제이고, 공통 코드는 빈 카테고리를 숨기므로 변경이 없다.
- [무검토 승인] getter·setter 예제는 `this` 대신 바깥 변수(`reads`, `celsius`)를 쓴다 — `this`는 22장(8번)이라 16장 페이지가 앞서 설명하지 않는다.
- [무검토 승인] 예제 7(preventExtensions·seal·freeze 비교)은 시나리오가 아니라 본문 표와 퀴즈로 다뤘다 — 객체 3개 × 동작 9개라 단계가 길어진다.
- 객체 변경 방지를 이 페이지에 포함(사용자 결정), 외부 글 리뷰 6건 반영(사용자 요청).

#### 배경지식

- Property Attributes 표: 데이터 프로퍼티는 [[Value]]·[[Writable]], 접근자 프로퍼티는 get·set 함수(ES2025 `[[Get]]`·`[[Set]]`, 현재 초안 `[[Getter]]`·`[[Setter]]`), 둘 다 [[Enumerable]]·[[Configurable]]. 기본값은 `false`/`undefined`이고 `defineProperty`로 새로 만들 때 생략하면 이 기본값이 쓰인다. 리터럴·대입은 모두 `true`로 만든다.
- OrdinarySetWithOwnDescriptor는 writable `false`나 setter 없는 접근자에서 `false`를 돌려준다. PutValue는 그 결과가 `false`이고 strict일 때만 TypeError를 던진다(sloppy는 값만 안 바뀜, 오른쪽 식은 평가됨). `delete`도 같은 구조.
- `Object.defineProperty`는 DefinePropertyOrThrow라 실패가 모드와 관계없이 TypeError다. 같은 값 판단은 SameValue(`Object.is`).
- SetIntegrityLevel: seal은 모든 키를 configurable `false`, freeze는 데이터 프로퍼티를 writable·configurable `false`, 접근자를 configurable `false`로 바꾸고, 둘 다 먼저 확장 불가로 만든다. 그 객체의 자기 프로퍼티에만 적용된다(얕다).
- SerializeJSONObject는 enumerable 자기 키의 값을 Get으로 읽으므로 getter를 호출한다. `getOwnPropertyDescriptor`는 get 함수를 꺼낼 뿐 호출하지 않는다.

#### 확인 질문

1. 예제 2와 3은 같은 대입인데 왜 하나는 조용히 넘어가고 하나는 TypeError인가? 어트리뷰트가 다른가?
   <details><summary>답</summary>어트리뷰트는 같다(writable·configurable `false`). [[Set]]이 `false`를 돌려주는 것까지는 같고, PutValue(대입)와 `delete` 연산자가 그 코드가 strict일 때만 TypeError를 던진다. 차이는 모드에서 온다. 근거: 계획 2절 PutValue·delete, 예제 writable-sloppy.js·writable-strict.js.</details>
2. 예제 4는 strict 지시어가 없는데 왜 TypeError인가? 같은 값으로 재정의하면 왜 괜찮은가?
   <details><summary>답</summary>`Object.defineProperty`는 실패를 `false`로 돌려주지 않고 DefinePropertyOrThrow로 TypeError를 던지도록 정의되어 있다. configurable `false`라도 실제로 바뀌는 것이 없으면(SameValue로 같은 값) 실패가 아니다. 그래서 `NaN`→`NaN`은 되고 `0`→`-0`은 TypeError다. 근거: 예제 redefine.js, concept.test.ts 본문 주장.</details>
3. 예제 5에서 `JSON.stringify`는 getter를 호출하는데 `getOwnPropertyDescriptor`는 왜 호출하지 않는가? 시뮬레이터 대조 테스트가 접근자 값을 읽지 않는 이유는?
   <details><summary>답</summary>`JSON.stringify`는 enumerable 프로퍼티의 값을 Get으로 읽는다(값 읽기 = getter 호출). 디스크립터는 프로퍼티의 상태(get 함수 자체)를 꺼낼 뿐 읽기가 아니다. 테스트가 값을 읽으면 getter가 호출되어 `reads`가 바뀌므로 검증이 상태를 바꿔 버린다. 근거: 예제 getter.js, 구현 진행 2.</details>
4. 예제 8에서 `config.limits.max = 20`이 성공한 이유는? 어떻게 하면 실패하게 만들 수 있나?
   <details><summary>답</summary>freeze는 `config` 객체의 자기 프로퍼티(level, limits)만 writable·configurable `false`로 바꾸고 확장 불가로 만든다. `limits`가 가리키는 객체는 별개의 객체라 그대로다. 그 객체에도 따로 `Object.freeze(config.limits)`를 적용해야 막힌다. 근거: 예제 freeze-shallow.js, 시나리오 freeze-shallow 3단계.</details>
5. ES2025 명세에서 접근자 프로퍼티의 `[[Get]]`과 내부 메서드 `[[Get]]`은 무엇이 다른가?
   <details><summary>답</summary>어트리뷰트 `[[Get]]`은 프로퍼티 하나가 가진 값(getter 함수 또는 `undefined`)이고, 내부 메서드 `[[Get]]`은 객체가 프로퍼티를 읽는 동작이다(읽다가 접근자 프로퍼티를 만나면 그 어트리뷰트의 함수를 호출한다). 이름이 같아 헷갈려 현재 초안은 어트리뷰트를 `[[Getter]]`·`[[Setter]]`로 바꿨다. 근거: 변경 이력 ①, content.mdx 어트리뷰트 절.</details>
