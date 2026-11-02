# 개념 '클래스 상속과 super' 구현 계획

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `d195a74`

## 0. 요약

- 목적: 25~37장 로드맵 2번 `/concepts/class-inheritance`를 추가한다. `extends`가 만드는 두 체인, 파생 생성자의 `this`가 `super()` 전에는 초기화되지 않는 이유, `super.method()`, `super`가 정의된 곳([[HomeObject]])으로 정해지는 것, 필드 초기화 순서 함정, 파생 생성자의 `return`과 `new.target`, `extends` 대상을 예제 10개와 시뮬레이터(시나리오 4개)·퀴즈로 보인다(사용자 결정 2026-10-30: 추가 주제 4개 모두, 시각화는 시뮬레이터).
- 범위: 새 개념 폴더 1개를 만든다(category `objects`, order 240으로 학습 순서 마지막, 시뮬레이터 있음). 마지막 개념이 바뀌므로 고정 테스트를 갱신하고, e2e(axe·진행·가로 스크롤)와 빌드 테스트, content-guide, 로드맵도 고친다. 공통 코드(`app/simulator/` 등)와 기존 개념 25개는 바꾸지 않는다.
- 위험: ① 시뮬레이터 단계가 명세 순서와 다르게 그려지는 것. 예: 객체가 파생 생성자에서 만들어지는 것처럼 그리거나, 필드가 `super()` 전에 생기는 것처럼 그리는 경우 ② 새 시각화 컴포넌트가 375px에서 넘치는 것 → 탐침 스냅샷 대조 테스트(new-operator 패턴)와 e2e 가로 스크롤 검사로 막는다.
- 복잡도: 중간~높음 · Consensus: 생략. 시뮬레이터를 새로 만들지만 new-operator·prototype-chain과 같은 기존 패턴(상태 스냅샷 + View + 불변식·탐침 테스트)이고 공통 코드를 바꾸지 않는다. 명세 순서는 원문으로, 예제 출력은 vm으로 미리 확인했다.
- 미확정: 1건(제목 문구)

## 1. 요구사항

### 요구사항

- 로드맵 2번 "클래스 상속과 super"(25장, `.claude/plans/concept-roadmap-ch25-37.md`).
- 기본 주제
  - ① `extends`가 만드는 두 체인. `Object.getPrototypeOf(C.prototype) === P.prototype`(인스턴스 쪽)이고 `Object.getPrototypeOf(C) === P`(생성자 쪽)이다. 생성자 쪽 체인 때문에 static 메서드도 상속되고, static 메서드 안의 `this`는 호출한 클래스다.
  - ② 파생 생성자의 `super()` 규칙: 파생 클래스의 [[Construct]]는 `this` 객체를 만들지 않고, `this` 바인딩은 `super()`가 끝날 때 초기화된다. 그래서 `super()` 전에 `this`를 쓰면 ReferenceError이고, `super()`를 부르지 않고 끝나도 ReferenceError, 두 번 부르면 두 번째 `super()`가 ReferenceError다. 생성자를 생략하면 인수를 그대로 넘기는 기본 생성자가 쓰인다.
  - ③ 오버라이드와 `super.method()`: 자식 메서드가 부모 메서드를 가리고, `super.speak()`는 부모 쪽 메서드를 부르지만 `this`는 그대로 인스턴스다.
- 추가 주제(사용자 결정 2026-10-30, 모두 포함)
  - ④ `super`는 정의된 곳이 정한다: `super`는 메서드의 [[HomeObject]]의 [[Prototype]]에서 찾기 시작한다. 그래서 메서드를 다른 객체로 옮겨도 원래 부모를 부른다(`this`와 대비).
  - ⑤ 필드 초기화 순서 함정: 파생 클래스의 필드는 `super()`가 돌아온 뒤에 초기화된다. 그래서 부모 생성자가 오버라이드된 메서드를 부르면 자식 필드는 아직 `undefined`다.
  - ⑥ 파생 생성자의 `return`과 `new.target`: 객체를 return하면 그 객체가 결과다(인스턴스가 아님). `undefined`가 아닌 원시 값을 return하면 TypeError다. 부모 생성자 안의 `new.target`은 `new`로 부른 자식 클래스다. new-operator가 미뤄 둔 내용을 이어받는다.
  - ⑦ `extends` 대상: 생성자 함수(`function`)도 상속할 수 있다. 생성자가 아닌 값(숫자, 화살표 함수)을 `extends`하면 TypeError다. `extends null`이면 `prototype`의 [[Prototype]]이 `null`이다.
- 이미 다룬 내용은 요약하고 링크한다: 클래스 기본은 [클래스는 함수다](/concepts/class-basics), 체인 탐색은 [프로토타입 체인](/concepts/prototype-chain), `new` 단계는 [new 연산자](/concepts/new-operator), 함수 환경 레코드와 `this` 바인딩은 [실행 컨텍스트](/concepts/execution-context)·[this](/concepts/this-binding).
- 시각화: 시뮬레이터(사용자 결정)에 시나리오 4개를 둔다. ① 파생 클래스 객체 만들기 ② `super()` 전에 `this` ③ `super.method()` ④ 필드 초기화 순서. 나머지 예제는 코드 + 퀴즈로 다룬다.

### 유지해야 하는 기존 동작

- 기존 개념 25개의 페이지·테스트 결과는 그대로 두고, 파일도 수정하지 않는다(new-operator·class-basics의 "별도 개념" 문구 포함, 역방향 연결은 나중에 일괄로 처리).
- 공통 셸 `SimulatorShell`·`useStepper`·`StepControls`·`CodeView`를 바꾸지 않는다.
- 하이드레이션 규칙(첫 단계는 JS 없이도 보임)을 지키고 `loader`를 두지 않는다.

### 제외 범위

- 빌트인 상속(`extends Array` 등, 27장 이후), `Symbol.species`, mixin, `Reflect.construct`
- `extends null` 클래스의 인스턴스 생성(TypeError) — prototype 체인만 보이고 생성은 simplifications로 넘긴다
- private 필드의 상속, 접근자 오버라이드, `super` 프로퍼티 대입(`super.x = 1`)
- 화살표 함수 안의 `super`·`this`(26장, 3번 개념)
- 객체 리터럴 메서드의 `super`(`__proto__`와 함께 쓰는 경우) — HomeObject 설명에서 언급하지 않는다

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안 ES2027, 2026-10-30 내려받아 확인)

- ClassDefinitionEvaluation(`#sec-runtime-semantics-classdefinitionevaluation`):
  - `superclass`가 `null`이면 protoParent = null, ctorParent = %Function.prototype%다.
  - `IsConstructor(superclass)`가 false면 TypeError다.
  - 그 밖에는 protoParent = `Get(superclass, "prototype")`(객체나 null이 아니면 TypeError), ctorParent = superclass다. → 두 체인
- [[Construct]](`#sec-ecmascript-function-objects-construct-argumentslist-newtarget`):
  - kind가 base일 때만 `OrdinaryCreateFromConstructor(newTarget, …)`로 this 객체를 만들고 바인딩한 뒤 InitializeInstanceElements를 수행한다.
  - 본문이 끝나면: 결과가 Object면 그 값을 돌려준다. base면 thisArg를 돌려준다. derived에서 결과가 `undefined`가 아니면 TypeError다. 아니면 `ctorEnv.GetThisBinding()`을 돌려준다(초기화 안 됐으면 ReferenceError).
  - → 파생 생성자는 객체를 만들지 않는다. 객체는 체인 끝의 기본 생성자가 newTarget(=`new`로 부른 클래스)의 `prototype`으로 만든다.
- SuperCall(`#sec-super-keyword-runtime-semantics-evaluation`):
  - newTarget = GetNewTarget(), superCtor = GetSuperConstructor()(활성 함수의 [[GetPrototypeOf]]())
  - 이어서 인수 평가 → `Construct(superCtor, argList, newTarget)` → `BindThisValue(thisER, result)` → `InitializeInstanceElements(result, funcObj)`(파생 클래스의 필드는 여기서)
- BindThisValue(`#sec-bindthisvalue`): 이미 initialized면 ReferenceError(두 번째 `super()`)다. GetThisBinding(`#sec-function-environment-records-getthisbinding`): uninitialized면 ReferenceError다.
- GetSuperBase(`#sec-getsuperbase`): `home = envRecord.[[FunctionObject]].[[HomeObject]]`이고 `home.[[GetPrototypeOf]]()`를 돌려준다. MakeSuperPropertyReference(`#sec-makesuperpropertyreference`)는 actualThis를 그대로 쓴다 → `super.m()`의 `this`는 현재 `this`다.
- 기본 생성자: 파생 클래스에서 생성자를 생략하면 인수를 그대로 부모에게 넘긴다. 구현 단계 1에서 ClassDefinitionEvaluation의 기본 생성자 단계 원문을 확인해 문구를 정한다.
- 그 밖의 anchor: `#sec-getsuperconstructor`, `#sec-initializeinstanceelements`, `#sec-makemethod`([[HomeObject]] 설정), `#sec-super-keyword`, `#sec-instanceofoperator`.

### 사실 (실행 확인 — Node v24.22.1 vm, 예제마다 새 컨텍스트, 초안 파일 `$CLAUDE_JOB_DIR/tmp/inh/`)

| 초안 예제 | 실제 출력 |
| - | - |
| `construct-derived.js`(Animal/Dog, super(name) 뒤 this.kind, 두 `getPrototypeOf`) | `Rex dog` / `true` / `true` |
| `two-chains.js`(static create가 `new this`, `getPrototypeOf(Cat) === Animal`, 기본 생성자) | `true` / `true Nabi` / `true` |
| `this-before-super.js`(super 전에 this.kind) | `ReferenceError` |
| `super-rules.js`(super 안 부름, 두 번 부름) | `ReferenceError` / `ReferenceError` |
| `super-method.js`(오버라이드 + super.speak(), hasOwnProperty) | `Rex makes a sound (woof)` / `false true` |
| `home-object.js`(Child.prototype.who를 Object.create(other) 객체로 옮김) | `Parent>Child` |
| `field-order.js`(부모 생성자에서 오버라이드된 describe 호출) | `label=undefined` / `derived` |
| `derived-return.js`(객체 return, 숫자 return) | `{"custom":true} false` / `TypeError` |
| `new-target.js`(부모 생성자에서 new.target.name) | `Base` / `Derived` |
| `extends-targets.js`(function 생성자 상속, extends 42, extends 화살표, extends null의 prototype) | `hi Kim` / `TypeError` / `TypeError` / `true` |

- 추가 확인: `super()` 전 화살표 함수가 잡은 `this`는 `super()` 뒤 인스턴스다(`true`). 다만 이 페이지에서는 다루지 않는다.

### 사실 (코드에서 확인)

- 시뮬레이터 패턴: `app/concepts/new-operator/`
  - `scenarios.ts:6-18`: 상태 모델 주석, 단계별 스냅샷, `changed`/`created` 표시 규칙
  - `Simulator.tsx`(19줄 래퍼), `NewView.tsx`
  - `concept.test.ts`: 본문 주장 검증, 시나리오 불변식, 구조 검사, 탐침 스냅샷 대조(`:466-620`, 줄 뒤에 탐침을 끼워 실행한 값과 단계 상태를 비교)
- 공통: `app/simulator/types.ts`(Step·Scenario), `tests/helpers/scenario-invariants.ts`(코드 원문·마지막 출력·출력 누적·line 범위·단계 수)
- e2e 시뮬레이터 패턴:
  - `tests/e2e/a11y.spec.ts:459-501`: 페이지 axe, 모든 시나리오의 모든 단계 axe, 특정 단계 텍스트
  - `tests/e2e/responsive.spec.ts:446-470`: 페이지 가로 스크롤, 끝까지 진행 가로 스크롤
  - `tests/e2e/helpers.ts`: `*_PATH`·`*_SIMULATOR_NAME`
- 빌드 테스트 시뮬레이터 프리렌더 패턴: `tests/build/build-output.test.ts:578-603`(단계 1 텍스트, region aria-label, 시나리오 라디오, `<details`)
- 고정값(현재): 개념 25개, 마지막 class-basics(25/25, 이전 for-let)
  - `tests/e2e/navigation.spec.ts`: 카드 25, 마지막 '25번째' 제목, pager, '객체' 검색 9건·순위 `[…,'25']`
  - `tests/e2e/responsive.spec.ts`: 홈 카드 25
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
- 검색은 title·summary·tags(`app/lib/concepts.ts:72-78`)를 본다. '객체' 포함 여부는 단계 5에서 실제 meta로 판정한다.

### 추정

- 없음

## 3. 구현 전략

### 시뮬레이터 상태 모델 `InheritState`(단계마다 전체 스냅샷)

- `classes: ClassBox[]`: 평가가 끝난 클래스만 담는다. ClassBox의 칸은 다음과 같다.
  - `name`, `kind`('base'|'derived')
  - `ctorParent`: 'Function.prototype' 또는 부모 이름
  - `protoParent`: 'Object.prototype' 또는 '부모.prototype'
  - `methods`(prototype 메서드 이름), `fields`(인스턴스 필드 이름), `hasOwnConstructor`(false면 기본 생성자)
- `frames: Frame[]`: 진행 중인 생성자 호출 스택이다(아래가 먼저).
  - `fn`, `kind`, `newTarget`
  - `thisStatus`: '초기화 전'(`uninitialized`) | 객체 참조 — base frame은 생성 직후부터 참조이고, derived frame은 `super()`가 돌아온 단계부터 참조다
- `objects: ObjectBox[]`: `id`, `label`('객체 A'), `proto`('Dog.prototype'), `props`(자기 프로퍼티, 원시 값), `created?`
- `bindings`: 선언문이 실행된 `const`만 담는다(new-operator 관례).
- `lookup: Lookup | null`: 메서드 찾기다. `expr`('pet.speak()' | 'super.speak()'), `startAt`(찾기 시작한 곳: 객체 label 또는 'Animal.prototype'), `via?`('HomeObject Dog.prototype의 [[Prototype]]'), `foundIn`, `thisValue`(객체 참조)를 담는다.
- `error: { name: 'ReferenceError'; reason: string } | null`
- 주석으로 "명세 [[Construct]]·SuperCall 순서를 묶은 교육용 단위이며 엔진 구현이 아님"을 밝힌다(new-operator 주석 관례).

### 시나리오 4개(예제 파일 원문 `?raw`)

1. `construct-derived`
   - 실행 전 → class Animal 평가 → class Dog 평가(두 체인) → `new Dog('Rex')`
   - Dog frame: this 초기화 전, newTarget Dog
   - `super(name)` → Animal frame(base): newTarget Dog의 `prototype`으로 객체 A 생성(proto Dog.prototype), this = A
   - `this.name` → Animal 반환, Dog frame this = A(BindThisValue) → `this.kind` → 결과가 `pet`에 들어감 → 출력 3줄
2. `this-before-super`: 클래스 2개 → `new Dog` Dog frame(초기화 전) → 8번 줄 `this.kind`에서 ReferenceError(객체는 만들어지지 않음, Animal frame 없음) → catch 출력
3. `super-method`
   - 클래스 2개(Dog는 기본 생성자) → `new Dog('Rex')`(기본 생성자 → Animal에서 객체 생성 → this 바인딩)
   - `pet.speak()` lookup: pet에 없음 → Dog.prototype에서 찾음, this = pet
   - 11번 줄 `super.speak()` lookup: HomeObject Dog.prototype의 [[Prototype]] = Animal.prototype에서 찾음, this = pet
   - 반환 → 출력
4. `field-order`
   - 클래스 2개(Derived fields: label) → `new Derived()`(기본 생성자, Derived frame 초기화 전)
   - Base frame: 객체 A 생성(proto Derived.prototype, props 없음)
   - 3번 줄 `this.describe()` lookup → Derived.prototype.describe → 12번 줄 `this.label`은 아직 없음(`undefined`) → `this.text = 'label=undefined'`
   - Base 반환 → Derived frame this = A → 필드 `label = 'derived'` 초기화 → 결과 d → 출력 2줄

### View `InheritView`

- 영역 4개를 위에서 아래로 쌓는다(375px에서 넘치지 않게 세로 배치).
  - "클래스와 두 체인": 클래스 카드마다 `extends`, 생성자 쪽 [[Prototype]], prototype 쪽 [[Prototype]], 메서드·필드 목록
  - "생성 중인 호출": frame 스택. 함수, 기본/파생, new.target, this
  - "객체": 객체와 [[Prototype]], 자기 프로퍼티. 그리고 변수
  - "메서드 찾기"와 오류(lookup·error가 있을 때만)
- 색만으로 구분하지 않고 텍스트 라벨을 둔다("초기화 전", "새로 생김").
- 문구 규칙: '찾히다'를 쓰지 않는다.

### 그 밖

- 예제 10개 중 시뮬레이터 4개 외 6개는 코드 + 퀴즈로 다룬다. 스크립트 전체가 거부되는 오류는 없다(모든 오류는 실행 중 TypeError·ReferenceError라 예제로 출력 가능).
- order 240, category `objects`. prerequisites는 class-basics, prototype-chain, new-operator, execution-context이고, related는 class-basics, prototype-chain, new-operator, this-binding이다.
- 버린 대안
  - ① 표 + 퀴즈: 사용자 결정(시뮬레이터). 핵심이 "순서"라서 단계 시각화가 맞다.
  - ② prototype-chain의 ProtoView 재사용: 상태 모양이 다르고, 개념 간 공유는 `app/simulator/`뿐이라는 규칙(AGENTS.md 시뮬레이터 규칙)에 어긋난다.
  - ③ 시나리오에 `derived-return`·`home-object`까지 넣기: 시나리오 수가 늘어 e2e 시간이 길어지고, 코드 + 퀴즈로 충분하다.

## 4. 변경 파일

- 추가 `app/concepts/class-inheritance/`
  - `meta.ts`, `content.mdx`, `route.tsx`, `scenarios.ts`, `InheritView.tsx`, `InheritView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`
  - `examples/`(10개): `construct-derived.js`, `two-chains.js`, `this-before-super.js`, `super-rules.js`, `super-method.js`, `home-object.js`, `field-order.js`, `derived-return.js`, `new-target.js`, `extends-targets.js`
- 수정
  - `tests/e2e/helpers.ts`: `CLASS_INHERITANCE_PATH`, `CLASS_INHERITANCE_SIMULATOR_NAME = '클래스 상속 시뮬레이터'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe, 모든 시나리오·단계 axe, 특정 단계 텍스트(construct-derived에서 Dog frame "초기화 전" → super 뒤 객체 A)
  - `tests/e2e/responsive.spec.ts`: 페이지 가로 스크롤, 끝까지 진행 가로 스크롤, 홈 카드 25→26
  - `tests/e2e/navigation.spec.ts`:
    - 카드 25→26(두 곳), 마지막 '26번째'와 새 제목
    - pager '1 / 26', closure '22 / 26', for-let '24 / 26'
    - class-basics '25 / 26'(링크 2개, 다음 class-inheritance), 새 개념 '26 / 26'(이전 class-basics)
    - '객체' 검색은 단계 5 판정에 따름
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 26, 마지막 class-inheritance(prev class-basics)
  - `tests/build/build-output.test.ts`: 시뮬레이터 프리렌더 describe(단계 1 텍스트, region, 라디오 4개, `<details`)
  - `docs/content-guide.md`: e2e 목록에 `class-inheritance`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 2번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 25개

## 5. 위험 요소

- 객체 생성 위치를 잘못 그림(파생 생성자가 객체를 만드는 것처럼) → 구조 테스트: derived frame이 맨 위인 동안 그 frame의 this는 '초기화 전'이고, 객체는 base frame이 push된 단계에서만 `created`이며, 그 proto는 `newTarget.prototype`이다(단계 3).
- 필드 초기화 시점을 잘못 그림 → 구조 테스트: 자식 필드는 derived frame의 this가 초기화된 단계 이후에만 객체 props에 있다. 탐침으로 field-order의 Base 본문 안에서 `Object.keys(this)`에 `label`이 없음을 확인한다(단계 3).
- 단계 상태와 실제 실행이 어긋남 → 탐침 스냅샷 대조. 생성자 본문 안(this가 초기화된 줄 뒤)과 바깥 줄 뒤에 탐침을 끼워 객체 자기 프로퍼티·proto 이름·바인딩을 비교한다. `this` 초기화 전 줄에는 탐침을 끼우지 않고 그 이유를 테스트 주석에 쓴다(단계 3).
- `super.method`의 `this`가 바뀌는 것처럼 그림 → lookup.thisValue는 언제나 인스턴스이고, 구조 테스트로 확인한다.
- 375px 넘침 → View는 세로 배치·`min-w-0`·`break-words`, e2e 가로 스크롤 검사(단계 4·5).
- 하이드레이션: 첫 단계(실행 전)는 클래스·frame이 없는 상태라 프리렌더와 같다(공통 셸 규칙). 빌드 테스트가 단계 1 텍스트를 확인한다.
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 5에서 고친다.
- dev 서버: 폴더 생성 순서를 meta → content → route로 하고, 끝나면 dev 서버를 재시작한다.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 10개 실제 출력 = `expectedOutput`(2절 표와 다르면 멈춤)
  - `concept.test.ts`
    - 본문 주장(default 생성자가 인수를 넘김, super 두 번째 호출 시 부모 생성자는 다시 실행된 뒤 ReferenceError, 생성된 객체의 proto는 newTarget.prototype, extends null의 생성자 쪽 [[Prototype]]은 Function.prototype)
    - 시나리오 불변식(공통), 시나리오 id ↔ meta
    - 구조 검사(5절)
    - 탐침 스냅샷 대조
  - `InheritView.test.tsx`: 각 영역의 텍스트 라벨, 초기화 전 표시, lookup·error 표시
  - `Simulator.test.tsx`: 시나리오 라디오 4개, 단계 이동
  - 명세 재확인: 기본 생성자 단계 원문
  - 메인이 본문·단계 설명 문장을 2절과 대조하고, 줄 번호를 대조한다.
- 브라우저(e2e 외 직접 확인, dev 서버 재시작 뒤)
  1. `/concepts/class-inheritance`를 375px로 열고 시나리오 4개를 끝까지 진행한다 → 가로 스크롤이 없다.
  2. construct-derived 4·5단계 → Dog frame this가 "초기화 전"이다가, super 뒤 객체 A로 바뀐다. 객체 A의 [[Prototype]]은 Dog.prototype이다.
  3. field-order에서 Base 본문 단계 → 객체 A에 label이 없다. Derived 바인딩 뒤 → label 'derived'가 생긴다.
  4. 다크 모드와 키보드(시나리오 라디오, 다음/이전 버튼)로 조작해 본다.
  5. 하단 학습 순서 → '26 / 26', 이전 class-basics.

## 7. 미확정 사항

- [미확정] 제목 문구: 초안은 '클래스 상속과 super: 파생 클래스의 this는 언제 생길까'다. 사용자 검토 때 조정할 수 있다.

## 8. 작업 순서

### 1. 예제·meta·route와 명세 재확인

- 대상: `examples/*.js`(10개), `meta.ts`, 임시 `content.mdx`, `route.tsx`(이 순서로 생성)
- 변경
  - 초안 예제를 옮긴다.
  - `meta.ts`
    - slug `class-inheritance`, category `objects`, order 240, title(7절), summary ≤160자
    - tags: 상속, extends, super, 파생 클래스, 오버라이드, static 상속, new.target, HomeObject, 필드 초기화 순서
    - goals 4개, prerequisites·related(3절)
    - examples(실행 후 채움)
    - simplifications: 시뮬레이터 단계는 명세 순서를 묶은 교육용 단위, extends null 인스턴스 생성 미다룸, 빌트인 상속·mixin 미다룸, 객체 리터럴 super 미다룸, `console`은 호스트 API, 스크립트 기준
    - references: 2절 anchor와 MDN(extends, super, Classes의 상속)
    - `reviewedAt: null`
- 완료 조건:
  - `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력이 2절 표와 같다.
  - 기본 생성자 원문을 구현 진행에 기록한다.
  - 참고 링크가 전부 200이다.

### 2. 시나리오와 상태 모델

- 대상: `scenarios.ts`
- 변경: 3절 상태 모델과 시나리오 4개(단계 제목·설명·line·state·output)를 쓴다.
- 주의사항: 단계마다 전체 스냅샷을 둔다. `changed`/`created`는 그 단계에만 붙인다. 단계 설명 문장은 2절 사실에서만 쓰고, '찾히다'를 쓰지 않는다.
- 완료 조건: `npm run typecheck`가 통과한다(테스트는 단계 3).

### 3. 시나리오 테스트(불변식·구조·탐침)와 본문 주장 테스트

- 대상: `concept.test.ts`
- 변경: 6절 정확성 항목을 new-operator `concept.test.ts`의 구조를 따라 쓴다.
- 완료 조건: `npx vitest run app/concepts/class-inheritance/concept.test.ts`가 통과한다. 음성 확인 두 가지를 한 뒤 되돌린다.
  - field-order에서 label을 Base 본문 단계 객체에 넣으면 실패한다.
  - construct-derived에서 Dog frame this를 super 전에 객체로 바꾸면 실패한다.

### 4. View·Simulator와 컴포넌트 테스트

- 대상: `InheritView.tsx`, `Simulator.tsx`(label '클래스 상속 시뮬레이터'), `InheritView.test.tsx`, `Simulator.test.tsx`
- 변경: 3절 View를 만들고, new-operator의 NewView·테스트 구조를 따른다.
- 완료 조건: 컴포넌트 테스트가 통과하고 `npm run typecheck`·`npm run lint`가 통과한다.

### 5. 본문, 고정 테스트·e2e·빌드 테스트·문서

- 대상: `content.mdx`, 4절 수정 목록
- 변경
  - 필수 h2 3개를 둔다.
  - 동작 원리 h3: 두 체인 / 파생 생성자의 this / super() 규칙과 기본 생성자 / 오버라이드와 super.method / super는 정의된 곳이 정한다 / 필드 초기화 순서 / 파생 생성자의 return과 new.target / extends 대상
  - 예제 10개마다 퀴즈, 시뮬레이터는 독립된 줄에 둔다.
  - 오해 Callout: "자식 생성자가 객체를 만들고 부모 생성자가 채운다", "super.method()를 부르면 this가 부모 객체가 된다", "필드는 생성자 본문보다 먼저 모두 준비된다", "클래스는 클래스만 상속할 수 있다"
  - 고정 테스트는 4절대로 고친다. '객체' 검색은 새 meta로 판정한다(포함되면 10건·순위 '26' 추가).
- 완료 조건:
  - 6절 전체 검증 명령이 통과한다.
  - 메인이 본문·단계 설명을 2절과 대조했고, 줄 번호를 대조했다. '찾히' 0건이다.
  - dev 서버를 재시작한 뒤 6절 브라우저 시나리오 1~5를 확인한다.

## 9. 추가 개선 후보

- new-operator·class-basics의 "상속…별도 개념" 문구를 이 페이지 링크로 바꾸기(역방향 연결 일괄 처리 때)

## 변경 이력

- 2026-10-30 (구현 단계 1 명세 재확인): 생략한 파생 생성자는 ClassDefinitionEvaluation의 defaultCtor(Abstract Closure → CreateBuiltinFunction)로, ECMAScript 함수 환경이 없어 `this` 바인딩 자체가 없다. 동작은 `Construct(부모, args, NewTarget)` 뒤 `InitializeInstanceElements(result, ctorFunc)`. → 상태 모델 Frame.kind에 `'default-derived'`를 두고 thisStatus는 `'없음'`(내장 기본 생성자)으로 그린다. super-method·field-order 시나리오의 Dog·Derived frame이 여기에 해당. 본문도 "기본 생성자는 `constructor(...args) { super(...args) }`와 비슷하게 동작하는 내장 함수"로 쓴다 — 영향 단계 2·3·4·5(범위 안 정밀화, 재승인 불필요)
- 2026-11-02 (외부 콘텐츠 검수 6건, vm·명세로 확인 후 반영): ① 파생 생성자가 객체를 return하면 [[Construct]]가 this 바인딩을 읽지 않아 `super()` 없이도 오류가 없음(`{"ok":1}`) — super() 규칙 문구에 조건 추가, return 절에 문장 추가, 예제 8 `ReturnsObject`에서 `super();`를 빼 이 사실을 직접 보임(출력 동일) ② `extends` 조건에 "`prototype` 프로퍼티가 객체나 null"을 추가(bind한 함수는 생성자지만 prototype이 없어 TypeError) — 본문·오해 Callout·simplifications ③ `super.who()`는 "언제나 Parent.prototype"이 아니라 HomeObject의 그때의 [[Prototype]](Object.setPrototypeOf로 바꾸면 `Q>Child`), `super()` 대상도 호출 시점의 생성자 쪽 [[Prototype]](GetSuperConstructor) — 두 체인 절에 연결 ④ 화살표가 아닌 모든 함수의 this 바인딩은 uninitialized로 시작하고 기반 생성자는 [[Construct]]가 본문 전에 OrdinaryCallBindThis로 묶어 줌 — 대조 문장 정정 ⑤ 기본 생성자의 "this 바인딩 없음" 문장은 시뮬레이터 표시를 설명하는 용도로 줄이고, 관찰 가능한 차이(명시적 `super(...args)`와 달리 배열 반복자를 부르지 않음)는 simplifications에 "현행 명세 기준"으로 적음(이터러블은 34장) ⑥ 도입부 "일반 클래스" → "기반 클래스", 기본 생성자 첫 등장에 풀이 — 근거 테스트 5개 추가. 영향 단계 1(예제 8·meta)·3·5

## 구현 진행

- baseline (2026-10-30, `d195a74`): 직전 커밋에서 전체 검증 통과(lint·format·typecheck, `npm test` 2517, `test:build` 211, e2e 361 passed / 3 skipped). 이후 변경은 `.claude/plans/` 문서뿐
- 명세 재확인(메인): defaultCtor 원문 "NOTE: This branch behaves similarly to constructor(...args) { super(...args); } … Let result be ? Construct ( func , args , NewTarget). … Perform ? InitializeInstanceElements ( result , ctorFunc )", "CreateBuiltinFunction ( defaultCtor , 0, className , …)"
- [x] 1. 예제·meta·route — 예제 10개 실제 출력 = 2절 표(`tests/examples.test.ts` 통과), 명세 anchor 11개·MDN 3개(ko 200) 확인, 생성 순서 meta → content → route
- [x] 2. 시나리오와 상태 모델 — 4개(12·7·12·13단계), default-derived frame은 this '없음', 단계 설명을 메인이 2절과 대조
- [x] 3. 시나리오 테스트 — `npx vitest run … app/concepts/class-inheritance` 632 통과(concept.test 120), 음성 확인 2건(field-order label 조기 노출 → 4 실패, Dog this 조기 바인딩 → 2 실패) 후 원복. typecheck·lint 통과
- [x] 4. View·Simulator — `InheritView.tsx`(영역 4개 세로 배치, 텍스트 배지, frame 스택은 맨 위가 실행 중), `Simulator.tsx`(label '클래스 상속 시뮬레이터'), 컴포넌트 테스트 11개 통과
- [x] 5. 본문·고정 테스트·e2e·빌드 테스트·문서 — 메인 수정: 퀴즈 정답이 모두 0번이라 위치를 섞음(정답 문자열 = expectedOutput 재대조), 기본 생성자 인수 전달의 인과 문장 정정("this 바인딩이 없어서"가 아니라 "받은 인수를 그대로 넘겨서"), 예제 9 문장 정리, 근거 테스트 추가(기반 클래스 필드는 본문 전에 초기화·원시 값 return 무시). '객체' 검색 10건·순위 '26'(summary의 "객체")
- 전체 검증 (2026-10-30): lint·format:check·typecheck 통과 / `npm test` 2671 / `npm run test:build` 219 / e2e 아래 기록
- e2e 1차: 373 passed / 4 failed / 3 skipped — 실패 4건은 모두 새로 추가한 특정 단계 테스트(데스크톱·모바일 × light·dark)가 "Animal 반환" 단계를 6단계로 잘못 셈(실제 7단계, index 6). 테스트만 고침(3번 더 클릭, '단계 7') → `npx playwright test tests/e2e/a11y.spec.ts -g "클래스 상속"` 12 passed. 나머지 e2e는 1차에서 이미 통과
- 375px 스크린샷(dev 서버, field-order 7단계)으로 세로 배치·텍스트 라벨·가로 넘침 없음 확인. dev 서버 재시작 후 `/concepts/class-inheritance` 200
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0. 계획 대비 차이: 영역 제목 "객체" → "객체와 변수"(변수도 함께 보이므로), Frame에 args 추가(기본 생성자가 인수를 넘기는 것을 보이기 위해) — 둘 다 범위 안. Low 1: field-order 7단계(this.label 읽기)에서 메서드 찾기 영역은 아직 실행 중인 this.describe() 호출을 보인다(설명 문장이 label을 다룸) — 사실과 어긋나지 않아 유지
- 외부 검수 반영(2026-11-02, 변경 이력 ①~⑥): 예제 8 `ReturnsObject`에서 `super();` 제거(출력 동일), 본문 9곳·퀴즈 설명 1곳·simplifications 2개 추가, 근거 테스트 5개 추가. 검증: lint·format:check·typecheck 통과 / `npm test` 2676 / `npm run test:build` 219 / `npm run e2e` 377 passed, 3 skipped(실패 0)
- 외부 검수 2차 반영(2026-11-02, 4건, 실행 확인): 오해 Callout 첫 문장을 "클래스가 아니어도 됩니다"로, "static 상속에만 쓰이는 것이 아닙니다"로 모호함 제거, 기본 생성자를 "ECMAScript 코드 본문이 있는 함수가 아니라 내장 함수"로 한정하고 `String(Cat)`이 클래스 소스를 돌려주는 이유 추가, simplifications의 bind 문장을 "생성자 함수를 bind로 묶은 함수"로 한정. 근거 테스트 1개 추가. 검증: lint·format:check·typecheck 통과 / `npm test` 2677 / `test:build` 219 / e2e 아래 기록
- 사용자 콘텐츠 검토 승인(2026-11-02): `reviewedAt: '2026-11-02'`

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 달라진 점: ① 기본 생성자는 내장 함수라 this 바인딩이 없어 상태 모델에 `default-derived`(this '없음')를 추가(변경 이력, 명세 재확인) ② View 영역 제목 "객체와 변수", Frame에 args 추가 ③ 외부 검수 2회(6건·4건)로 super() 규칙·extends 조건·super 탐색 시작점·기반 생성자 this 대조·기본 생성자 문장을 정밀화하고 예제 8 `ReturnsObject`에서 `super()`를 뺌 ④ 새 e2e 특정 단계 테스트의 단계 번호 오류(6→7)를 수정.

### 코드 리뷰
- critical-code-review: Critical·High 0, Low 1(field-order 7단계의 메서드 찾기 영역 표시, 사실과 어긋나지 않아 유지). 외부 검수 지적은 모두 실행·명세로 확인 후 반영.

### 후속 작업
- [ ] new-operator·class-basics의 "상속…별도 개념" 문구를 이 페이지 링크로 바꾸기(역방향 연결 일괄 처리 때)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 기본 생성자 frame의 this를 "초기화 전"이 아니라 "없음"으로 그림 — 명세의 defaultCtor는 CreateBuiltinFunction으로 만든 내장 함수라 함수 환경 레코드가 없다(변경 이력 첫 항목)
- [Claude 판단] 시뮬레이터 단계 상태를 예제에 탐침을 끼워 실제 실행한 값과 대조하고, super() 전 줄에는 탐침을 끼우지 않음 — 그 줄에서 this를 읽으면 ReferenceError라서
- [Claude 판단] 시나리오는 4개(예제 1·3·5·7)만 두고 나머지 6개 예제는 코드 + 퀴즈 — 시나리오가 늘면 e2e 시간이 길어지고 코드 + 퀴즈로 충분(3절 버린 대안 ③)
- [무검토 승인] 상태 모델(클래스와 두 체인 / 생성 중인 호출 / 객체와 변수 / 메서드 찾기)
- 추가 주제 4개와 시뮬레이터는 사용자가 골랐다. 외부 검수로 "super()는 반드시 불러야 한다"를 "객체를 return하지 않으면"으로, extends 조건에 prototype 검사를 더했다.

#### 배경지식
- 파생 클래스의 [[Construct]]는 객체를 만들지 않는다. 체인 끝의 기반 생성자가 OrdinaryCreateFromConstructor(newTarget)로 만들어 [[Prototype]]이 new로 부른 클래스의 prototype이 된다.
- SuperCall 순서: GetSuperConstructor(호출 시점의 생성자 쪽 [[Prototype]]) → Construct(부모, args, newTarget) → BindThisValue(이미 초기화면 ReferenceError) → InitializeInstanceElements(자식 필드).
- 파생 생성자가 끝날 때 결과가 객체면 그대로, undefined가 아닌 원시 값이면 TypeError, 아니면 GetThisBinding(초기화 전이면 ReferenceError).
- super.m은 메서드의 [[HomeObject]]의 그때의 [[Prototype]]에서 찾고, this는 현재 this를 그대로 쓴다.

#### 확인 질문
1. 예제 1에서 객체는 Animal 생성자 안에서 만들어지는데 왜 [[Prototype]]이 Animal.prototype이 아니라 Dog.prototype인가?
   <details><summary>답</summary>super()가 newTarget(Dog)을 그대로 넘기고, 기반 생성자의 [[Construct]]가 OrdinaryCreateFromConstructor(newTarget)로 newTarget.prototype을 쓰기 때문이다(본문 "파생 생성자의 this", 탐침 테스트).</details>
2. 파생 생성자에서 super()를 부르지 않아도 오류가 나지 않는 경우는?
   <details><summary>답</summary>객체를 return할 때다. [[Construct]]가 this 바인딩을 읽기 전에 그 객체를 바로 돌려준다(변경 이력 ①, 예제 8).</details>
3. 예제 7에서 this.describe()는 Derived의 메서드를 부르는데 this.label은 왜 undefined인가?
   <details><summary>답</summary>객체의 [[Prototype]]은 생성 순간 이미 Derived.prototype이지만, 자식 필드는 부모 생성자가 돌아온 뒤 InitializeInstanceElements에서 초기화되기 때문이다(본문 "필드 초기화 순서", 구조 테스트).</details>
4. [Claude 판단] 기본 생성자 frame의 this를 "초기화 전"으로 그렸다면 무엇이 틀렸을까?
   <details><summary>답</summary>"초기화 전"은 함수 환경 레코드의 this 바인딩 상태다. 기본 생성자는 내장 함수라 그런 레코드가 없으므로, 존재하지 않는 바인딩의 상태를 그리는 셈이 된다(변경 이력 첫 항목).</details>
5. 메서드를 다른 객체로 옮겨도 super가 원래 부모를 부르는 이유와, 그래도 결과가 바뀔 수 있는 경우는?
   <details><summary>답</summary>super는 메서드에 고정된 [[HomeObject]]에서 출발한다. 다만 그 [[Prototype]]은 호출할 때마다 읽으므로 HomeObject의 [[Prototype]]을 바꾸면 결과가 바뀐다(변경 이력 ③, 근거 테스트).</details>
- e2e (외부 검수 2차 반영 후): 377 passed, 3 skipped, 실패 0
