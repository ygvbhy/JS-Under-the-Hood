# this는 호출 방식이 정한다 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-29
- 기준: `main` @ `6383794`

## 0. 요약

- 목적: 로드맵(13~24장) 8번 `/concepts/this-binding`을 추가한다. this는 함수를 정의한 곳이 아니라 호출하는 방식이 정한다는 것(일반 호출 sloppy 전역 객체·strict undefined, 메서드 호출은 점 앞의 객체, 꺼낸 메서드는 this를 잃음, call·apply·bind)을 예제 11개, 퀴즈, "this 결정" 시뮬레이터로 보인다. 콜백에서 this 잃기와 해결, 중첩 함수, bind 세부 규칙, 괄호·쉼표, 화살표 함수의 this(동작만)도 포함한다(사용자 결정).
- 범위: 새 개념 폴더 1개(category `objects`), e2e·빌드 테스트 추가, `navigation.spec.ts` `객체` 검색 기대값 5→6, content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 18개는 바꾸지 않는다.
- 위험: this를 "함수가 속한 객체"나 "정의된 곳"으로 설명하거나, 실행 컨텍스트·환경 레코드(23장)를 앞서 설명하는 것 → EvaluateCall(참조의 기준 값 → thisArg)·OrdinaryCallBindThis(함수의 this 모드) 순서로만 설명하고, 시뮬레이터의 this를 vm 안 실제 this와 `===`로 대조한다.
- 복잡도: 중간 · Consensus: 생략. new-operator(호출 영역·this 표시·탐침 대조)와 prototype-chain(경로·카드)의 조합이고 공통 코드 변경이 없다. 명세 원문과 vm·ESM·CJS 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md:33`) 8번, 『모던 자바스크립트 Deep Dive』 22장. 22장까지만 전제한다(화살표 함수 문법은 26장이라 this 동작만).
- 핵심
  - ① this의 값은 함수를 정의한 곳이 아니라 호출하는 방식이 정한다. 같은 함수도 호출 방식에 따라 this가 다르다.
  - ② 호출식 `f()`·`obj.m()`을 평가할 때(EvaluateCall) 함수 자리 식이 프로퍼티 참조(`obj.m`)이면 thisArg는 그 기준 값(`obj`), 변수 이름(`f`)이면 undefined, 그 밖의 값이면 undefined.
  - ③ 호출된 함수의 this 모드가 정한다(OrdinaryCallBindThis): strict 함수는 thisArg 그대로, sloppy 함수는 undefined·null이면 전역 객체(globalThis)·원시 값이면 객체로 바꿔 받는다.
  - ④ 메서드를 변수에 꺼내 호출하면(`const f = obj.m; f()`) 참조의 기준 값이 사라져 this가 바뀐다.
  - ⑤ `call`·`apply`는 thisArg를 직접 정해 호출하고, `bind`는 this를 묶은 새 함수(bound function)를 만든다.
- 사용자 결정(2026-10-29)
  - ⑥ 콜백에서 this 잃기와 해결: 메서드·함수를 콜백으로 넘기면 this를 잃는다. 해결: `bind`, 바깥 this를 변수에 담기(`that`), 화살표 함수.
  - ⑦ 메서드 안 중첩 함수: 메서드 안에서 일반 함수로 부른 함수의 this는 바깥 메서드의 this가 아니다.
  - ⑧ bind 세부 규칙: bound function은 다시 `bind`·`call`하거나 메서드로 불러도 this가 바뀌지 않는다. `new`로 부르면 묶인 this를 무시하고 새 객체가 this다(묶인 인수는 쓰임).
  - ⑨ 괄호·쉼표: `(obj.m)()`은 괄호가 참조를 그대로 두어 this가 유지되고, `(0, obj.m)()`은 쉼표 연산자가 값을 꺼내 this를 잃는다.
  - ⑩ 화살표 함수: 자기 this가 없어 바깥 this를 쓰고, `call`·`bind`·메서드 호출로도 바뀌지 않는다. 문법 자체는 별도 개념.
  - 시각화: this 결정 시뮬레이터.

### 유지해야 하는 기존 동작

- 기존 개념 18개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일은 수정하지 않는다.
- `navigation.spec.ts`는 기대값(5→6)만 바꾸고 첫 카드 '원시 값과 객체' 검사는 그대로 통과해야 한다(제목이 `this`로 시작해 한글 제목 뒤로 정렬된다 — new-operator와 같은 경우).
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위

- 실행 컨텍스트·환경 레코드·this 바인딩이 저장되는 구조 — 9번(23장)
- 클래스 메서드(항상 strict)·`super`, 이벤트 핸들러·타이머 등 호스트 API의 this
- 화살표 함수 문법 전반(매개변수·반환·arguments 등) — 26장
- `with` 문, 직접 eval
- 전역 객체 자체(globalThis가 무엇인지) — 추가 게시글 후보

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현
  - `app/concepts/new-operator/`: 호출 영역의 this 표시(`NewView.tsx`), sloppy 일반 호출에서 this = 전역 객체 시나리오, 탐침 대조와 vm 안 `===` 판정(`concept.test.ts`)
  - `app/concepts/prototype-chain/`: 객체 카드·경로 표시(`ProtoView.tsx`), 탐침이 카드와 실제 객체를 동일성으로 대응(`concept.test.ts`)
  - e2e 경로 상수 `tests/e2e/helpers.ts`(PRIMITIVE_METHODS 뒤)
- 메타·검색·정렬
  - category `objects`는 '객체와 프로토타입'(`app/lib/concepts.ts:26`). new-operator·prototype-chain·primitive-methods와 같은 그룹(22장, 메서드와 객체).
  - `객체` 검색 기대값 5: `tests/e2e/navigation.spec.ts:17`, `:32`. summary에 '객체'가 들어가므로 6건이 된다.
- 기존 페이지가 이 페이지로 미룬 부분
  - `function-calls/meta.ts:75`: this, 메서드 호출, 화살표 함수
  - `new-operator/meta.ts:95`: 메서드 호출·call·apply·bind·화살표 함수
  - `prototype-chain/meta.ts:108`: 상속된 메서드를 호출할 때의 this
  - `primitive-methods/meta.ts:96`: 메서드 안의 this
- 명세 원문(tc39.es/ecma262 ES2027 초안, 2026-10-28 내려받은 사본)
  - 13.3.6.1 함수 호출 평가(`sec-function-calls-runtime-semantics-evaluation`): ref = 함수 자리 식의 평가 결과, func = GetValue(ref), EvaluateCall(func, ref, …).
  - 13.3.6.2 EvaluateCall(`sec-evaluatecall`): ref가 Reference Record이고 프로퍼티 참조이면 thisValue = GetThisValue(ref)(기준 값), 환경 레코드 참조이면 refEnv.WithBaseObject()(선언적 환경 레코드는 undefined, `sec-declarative-environment-records-withbaseobject`), Reference가 아니면 undefined.
  - 10.2.1.2 OrdinaryCallBindThis(`sec-ordinarycallbindthis`): thisMode가 lexical(화살표 함수)이면 this를 묶지 않는다. strict이면 thisArg 그대로. 아니면 undefined·null → 전역 this 값, 그 밖 → ToObject(thisArg).
  - 9.4.3 GetThisEnvironment(`sec-getthisenvironment`): this를 제공하는 환경을 바깥으로 찾는다(화살표 함수는 바깥 함수의 this를 쓰게 되는 근거). 세부(환경 레코드)는 9번.
  - 20.2.3.3 `Function.prototype.call`, 20.2.3.1 `apply`(`sec-function.prototype.call`, `sec-function.prototype.apply`): Call(func, thisArg, args). NOTE: thisArg는 변환 없이 넘기고 sloppy 함수가 스스로 변환한다.
  - 20.2.3.2 `Function.prototype.bind`(`sec-function.prototype.bind`): BoundFunctionCreate(target, thisArg, args), 이름 `"bound " + name`.
  - 10.4.1.1 bound function [[Call]](`sec-bound-function-exotic-objects-call-thisargument-argumentslist`): 받은 thisArg를 쓰지 않고 Call(target, boundThis, boundArgs + args).
  - 10.4.1.2 bound function [[Construct]](`sec-bound-function-exotic-objects-construct-argumentslist-newtarget`): newTarget이 자신이면 target으로 바꾸고 Construct(target, boundArgs + args, newTarget) — boundThis를 쓰지 않는다.
  - 13.2.9.2 괄호 식(`sec-grouping-operator-runtime-semantics-evaluation`): 안쪽 식의 평가 결과를 그대로 돌려주며 Reference일 수 있다(GetValue를 하지 않음).
  - 13.16.1 쉼표 연산자(`sec-comma-operator-runtime-semantics-evaluation`): 오른쪽에 GetValue를 적용해 값을 돌려준다(Reference가 아님).
  - 13.2.1.1 this 평가(`sec-this-keyword-runtime-semantics-evaluation`) → ResolveThisBinding(`sec-resolvethisbinding`).
- 예제 초안 실제 출력(vm은 `runExample`과 같은 방식. `.mjs`·`.cjs`는 파일로 직접 실행)

  | # | 파일 | vm 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `method-call.js` | `JS` / `CSS` / `true` | 같음 | 같음 |
  | 2 | `extract-sloppy.js` | `book` / `globalThis` | `book` / `undefined` | 같음 |
  | 3 | `extract-strict.js` | `book` / `undefined` | 같음 | 같음 |
  | 4 | `plain-call.js` | `true` / `undefined` | `false` / `undefined` | 같음 |
  | 5 | `nested-function.js` | `true` / `false` / `true` | `true` / `false` / `false` | 같음 |
  | 6 | `callback.js` | `false` / `true` / `true` / `true` | 같음 | 같음 |
  | 7 | `call-apply.js` | `Hi, Kim!` / `Hello, Kim?` | 같음 | 같음 |
  | 8 | `bind-rules.js` | `Kim` / `Kim` / `Kim` / `Kim` | 같음 | 같음 |
  | 9 | `bind-new.js` | `{"title":"JS"}` / `{"name":"Kim"}` / `true` | 같음 | 같음 |
  | 10 | `arrow-this.js` | `Kim` / `Kim` / `Kim` / `Kim` | 같음 | 같음 |
  | 11 | `parens-comma.js` | `book` / `book` / `undefined` | 같음 | 같음 |

  - CommonJS는 모듈 함수 안에서 실행되지만 위 예제의 출력은 클래식 스크립트와 같다(최상위 this는 쓰지 않는다).
- 본문 근거로 쓸 vm 실행 결과(2026-10-29)
  - 클래식 스크립트 최상위 this는 sloppy·strict 모두 `globalThis`
  - 객체 리터럴의 화살표 함수 프로퍼티 `{ m: () => this }`를 `o.m()`으로 불러도 this는 바깥(최상위) this
  - sloppy `f.call(1)`의 `typeof this`는 `'object'`, strict는 `'number'`. sloppy `f.call(null)`의 this는 `globalThis`, strict는 `null`
  - bound function의 `name`은 `'bound whoAmI'`, `prototype` 프로퍼티 없음, `length`는 묶은 인수만큼 줄어듦(`g(a,b,c).bind(null,1).length` → 2)
  - strict 메서드 안 중첩 함수의 this는 undefined
  - `book?.w()`는 this 유지, `(f = b.w)()`는 this를 잃음(대입식은 값)
  - bound 생성자: `new BB() instanceof BB`와 `instanceof B` 모두 true
  - 화살표 함수에 `call(1)`을 해도 this는 바깥 this
  - `f.bind(null) !== f`(새 함수)
- MDN ko 200 확인: `Operators/this`, `Function/call`·`apply`·`bind`, `Functions/Arrow_functions`, `Operators/Comma_operator`, `Operators/Grouping`

### 추정

- 예제 이름 `book`·`other`·`whoAmI`·`counter`·`run`·`greet`·`kim`·`lee`·`bound`·`obj`·`Book`·`BoundBook`·`outer`·`arrow`가 Chromium에서 `in window`가 아니다 — 6단계 브라우저 확인에서 검사한다.

## 3. 구현 전략

- new-operator의 "호출 영역" 표시를 this 결정에 맞게 바꾸고, 호출할 때마다 결과를 비교표로 쌓는다.
  - slug `this-binding`, category `objects`
  - 제목 `'this: 호출 방식이 정하는 값'`
  - 시뮬레이터 label `'this 결정 시뮬레이터'`
  - related: `['new-operator', 'function-calls']`
- 상태(`ThisState`)
  - `ThisVal`: `{ kind: 'object'; id } | { kind: 'global' } | { kind: 'undefined' }`
  - `ObjectCard`: `{ id; label }` — book·kim·lee 등 예제 객체(프로퍼티는 이 개념의 초점이 아니라 라벨만, 필요하면 `name`/`title` 한 줄)
  - `FnCard`: `{ id; label; mode: 'sloppy' | 'strict' | 'arrow' | 'bound'; lexicalThis?: ThisVal; boundThis?: ThisVal; targetId?: string }` — 화살표는 만들어질 때의 바깥 this를, bound는 묶인 this와 원본 함수를 보인다
  - `Determination`(한 번의 호출에서 this를 정하는 과정)
    - `expr`: 호출식 원문(예: `whoAmI()`, `callback()`, `bound.call(lee)`)
    - `callee`: 실제로 불리는 함수 id
    - `ref`: `{ kind: 'property'; base: ThisVal } | { kind: 'name'; name } | { kind: 'value'; why: string }` — 프로퍼티 참조 / 변수 이름 / 값(쉼표·대입 결과)
    - `via`: `'call' | 'apply' | null` — call·apply면 thisArg가 첫 인수
    - `thisArg`: ThisVal
    - `rule`: 함수 모드별 규칙 문장(예: "sloppy 함수: undefined는 전역 객체로", "strict 함수: 그대로", "화살표 함수: 자기 this 없음, 바깥 this", "bound 함수: 받은 thisArg를 무시하고 묶인 this")
    - `thisValue`: ThisVal
  - `ThisState`: `{ objects; functions; bindings: { name; value: string }[]; current: Determination | null; history: { expr; thisValue }[] }` — `history`는 이 시나리오에서 지금까지 확정한 호출과 this의 비교표
- 화면(`ThisView`)
  - "this 결정" 영역: 4칸 순서 목록(① 함수 자리 식 → 참조 종류와 기준 값 ② thisArg ③ 불리는 함수의 종류와 규칙 ④ this). 칸마다 글자로 상태. 색만으로 구분하지 않는다.
  - 함수 카드: 이름, 모드 배지(sloppy/strict/화살표/bound), 화살표의 바깥 this, bound의 묶인 this·원본
  - 비교표(`<table>`, history): 호출식 → this. 375px에서 넘치지 않게 열 2개, code는 줄바꿈 허용 범위로(primitive-methods에서 배운 대로, 넘치면 포커스 가능한 region)
- 시나리오 4개(한 번의 호출 = 한 단계, 호출이 아닌 줄도 한 단계)
  - `extract`(예제 2): book 정의 → `const whoAmI = book.whoAmI` → `book.whoAmI()`(프로퍼티 참조, base book, sloppy, this book) → `whoAmI()`(이름, thisArg undefined, sloppy → 전역 객체)
  - `callback`(예제 6): `book.report()`(this book) → 함수·화살표 정의(화살표 카드의 바깥 this = book) → `run(plain)` 안 `callback()`(이름, undefined, sloppy → 전역 객체) → `run(plain.bind(this))` 안 `callback()`(bound → 묶인 this book) → `run(viaThat)` 안 `callback()`(this는 전역 객체지만 that 변수가 book) → `run(viaArrow)` 안 `callback()`(화살표 → 바깥 this book). 콜백 호출 단계의 `expr`은 `callback()`이고 줄 강조는 `run` 본문 줄과 호출한 줄을 함께 표시한다(설명 문장에 어느 run 호출인지 적는다).
  - `bind`(예제 8): `bound = whoAmI.bind(kim)` → `bound()` → `bound.call(lee)`(via call, thisArg lee, bound → kim) → `bound.bind(lee)()`(bound의 bound, 원본 bound가 kim을 이미 묶음 → kim) → `obj.bound()`(프로퍼티 참조, base obj, bound → kim)
  - `parens`(예제 11): `book.whoAmI()` → `(book.whoAmI)()`(괄호는 참조 유지 → base book) → `(0, book.whoAmI)()`(쉼표 → 값, thisArg undefined, strict → undefined)
  - 나머지 예제(1·3·4·5·7·9·10)는 예제·퀴즈·본문으로 다룬다.
- 정확성 검증
  - (a) 공통 불변식
  - (b) 구조: `ref.kind === 'property'`이고 `via`가 없으면 `thisArg`는 base와 같다, `ref.kind`가 name·value이고 `via`가 없으면 thisArg는 undefined, `via`가 call·apply면 thisArg는 첫 인수 객체, `rule`과 `thisValue`가 함수 모드 규칙(sloppy: undefined → global, strict: 그대로, arrow: lexicalThis, bound: boundThis)으로 계산한 값과 같다, history가 이전 단계 history에 이번 결정을 더한 것과 같다
  - (c) 탐침 대조: 예제를 탐침 버전으로 바꿔(함수 본문에서 `this`를 읽는 지점에 기록 호출 추가) vm에서 실행하고, 각 호출 단계의 `thisValue`가 실제 this와 같은지 vm 안에서 `===`로 판정(`globalThis`, 예제 객체, undefined). 탐침 버전의 콘솔 출력이 원본과 같은지 검사한다.
  - (d) 음성 확인: `extract`의 `whoAmI()` this를 book으로 그리면 실패, `bind`의 `bound.call(lee)` this를 lee로 그리면 실패, `parens`의 `(0, book.whoAmI)()`를 book으로 그리면 실패해야 한다.
- 버린 대안
  - ① 실행 컨텍스트·환경 레코드로 this 저장 위치를 그리기: 23장(9번). "this 결정 과정"만 그린다.
  - ② 호출 단계를 4칸으로 나눠 4단계씩: 시나리오가 길어진다. 한 단계에 4칸을 모두 채워 보인다.
  - ③ 타이머·이벤트로 콜백 예제: 호스트 API이고 예제 러너가 지원하지 않는다. 직접 만든 `run(callback)`으로 보인다.

## 4. 변경 파일

- 추가 `app/concepts/this-binding/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 11개(2절 표)
  - `scenarios.ts`, `ThisView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정
  - `tests/e2e/navigation.spec.ts:17`, `:32`: `toHaveCount(5)` → `toHaveCount(6)`
  - `tests/e2e/helpers.ts`: `THIS_BINDING_PATH`, `THIS_BINDING_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: prototype-chain 케이스를 본떠 추가만
  - `docs/content-guide.md:164`: e2e 목록에 `this-binding`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 8번 행·진행 기록
- 변경하지 않음: 공통 코드, `package.json`, `AGENTS.md`, 기존 개념 폴더 18개(역방향 연결은 9절 후보)

## 5. 위험 요소

- "this는 함수가 속한 객체"·"정의된 곳" 설명 → 예제 1(같은 함수를 다른 객체에 붙임)과 EvaluateCall 순서로 막는다.
- sloppy 예제가 모듈에서 다른 결과 → 단순화와 `.mjs`·`"type": "module"` 테스트(예제 2·4·5).
- 화살표 함수를 문법까지 설명 → this 동작(lexical, call·bind 무시)만, 나머지는 별도 개념.
- 실행 컨텍스트를 앞서 설명 → "바깥 함수의 this를 쓴다"까지만, 저장 구조는 9번.
- 콜백 단계의 줄 강조가 run 본문과 호출 줄 중 무엇인지 헷갈림 → 설명 문장에 명시하고 줄 범위를 둘 다 강조할 수 있으면 둘 다(공통 `LineRange`는 한 범위이므로 run 본문 줄을 강조하고 설명에 호출 줄을 적는다).
- bind + new를 "bind가 무시된다"로 일반화 → 묶인 this만 무시되고 묶인 인수는 쓰인다(예제 9의 'JS').
- `apply`의 배열 인수 → 배열(27장)은 단순화에 "인수 목록을 배열로 넘긴다"로만.
- 비교표가 375px에서 넘침 → 열 2개, 넘치면 primitive-methods처럼 포커스 가능한 region(axe `scrollable-region-focusable`).
- `navigation.spec.ts` 첫 카드 검사 → 제목이 `this`로 시작해 한글 제목 뒤(정렬 확인은 6단계 e2e)
- 탐침이 실행 흐름을 바꿈 → 탐침은 this를 배열에 기록만 하고 탐침 버전 출력 = 원본 출력 검사

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성: 예제 11개 출력, 본문 주장 근거 테스트(2절 vm 목록), `.mjs`·`.cjs`·`"type": "module"` 결과, 시나리오 (a)~(d), 퀴즈 정답 = expectedOutput·위치 분산
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. "검토 중" 배지, 분류 '객체와 프로토타입', 퀴즈 라디오 UI
  2. `extract`: `whoAmI()` 단계에서 ① 변수 이름 ② thisArg undefined ③ sloppy 규칙 ④ 전역 객체, 비교표 2행
  3. `callback`: 화살표 카드의 바깥 this = book, `run(viaArrow)` 단계 this = book
  4. `bind`: `bound.call(lee)` 단계에서 thisArg lee·규칙 "묶인 this"·this kim
  5. `parens`: 쉼표 단계에서 ① 값 ④ undefined
  6. 375px·다크: 가로 넘침 0(비교표 포함), 키보드 ←/→/Home, 콘솔 에러 0
  7. 홈: '객체와 프로토타입' 그룹 카드 5개, 전체 카드 19개, `객체` 검색 6건(첫 카드 '원시 값과 객체'), `this` 검색 1건 이상
  8. 예제 이름 `in window` 없음

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `examples/*.js`(11개), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장), 자리표시 `content.mdx`
- 변경
  - 예제 11개는 scratchpad 초안(`this-draft/*.js`)과 같은 원문(`cp` 후 `cmp`)
  - `meta.ts`
    - slug, title, category, related는 3절대로
    - summary(160자 이하): this는 함수를 정의한 곳이 아니라 호출 방식이 정한다, 메서드로 부르면 점 앞의 객체, 꺼내 부르면 sloppy는 전역 객체·strict는 undefined, call·apply·bind로 정할 수 있고 화살표 함수는 바깥 this를 쓴다
    - tags: `this`, `메서드 호출`, `함수 호출`, `call`, `apply`, `bind`, `bound function`, `화살표 함수`, `콜백`, `strict mode`, `globalThis`, `참조`, `쉼표 연산자`
    - goals 4개: 호출식에서 this가 정해지는 순서(참조의 기준 값 → 함수 모드) 설명 / 메서드를 꺼내거나 콜백으로 넘겼을 때 this 예측과 해결 방법 / call·apply·bind와 bound function 규칙(재bind·call·new) 예측 / 화살표 함수와 중첩 함수의 this, 괄호·쉼표의 차이 설명
    - prerequisites: `function-calls`, `new-operator`, `primitives-and-objects`, `scope-chain`(바깥 변수 that)
    - examples 11개(2절 출력), `reviewedAt: null`
  - 단순화
    - ① this가 저장되는 구조(실행 컨텍스트와 환경 레코드)는 별도 개념입니다. 시뮬레이터는 명세의 EvaluateCall과 OrdinaryCallBindThis가 this를 정하는 과정을 네 칸으로 나눠 그린 것입니다.
    - ② 화살표 함수는 this를 어떻게 정하는지만 다룹니다. 화살표 함수가 바깥 this를 쓰는 구조, 문법 전반은 별도 개념입니다.
    - ③ 전역 객체(globalThis)가 무엇인지는 별도 개념에서 다룹니다. 이 페이지는 sloppy 함수의 this가 그 객체와 같은지만 비교합니다.
    - ④ 예제 2·4·5는 sloppy mode 결과입니다. 파일로 실행할 때 .mjs 파일이거나 package.json에 "type": "module"이 있으면 모듈이라 항상 strict mode여서 전역 객체 대신 undefined가 나옵니다. 클래식 스크립트나 CommonJS(.cjs)로 실행하면 이 페이지의 결과와 같습니다.
    - ⑤ 클래스 메서드(항상 strict mode), 이벤트 핸들러·타이머처럼 호스트가 this를 정하는 경우, with 문은 다루지 않습니다.
    - ⑥ apply의 두 번째 인수는 인수 목록을 배열로 넘기는 것까지만 다룹니다. 배열은 별도 개념입니다.
    - ⑦ 함수 자리 식이 변수 이름일 때 thisArg가 undefined인 것은 일반적인 경우이고, with 문 안에서는 다를 수 있습니다(명세의 WithBaseObject).
    - ⑧ new 호출의 this는 new 연산자 개념에서 다루고, 이 페이지는 bind와 함께 쓸 때만 다룹니다.
    - ⑨ 시뮬레이터는 선언문이 실행된 변수와 이 예제에 필요한 객체·함수만 보이며, console·JSON 호출 과정과 객체의 다른 프로퍼티를 생략합니다.
  - references: 2절 앵커(함수 호출 평가, EvaluateCall, OrdinaryCallBindThis, GetThisEnvironment, call, apply, bind, bound [[Call]]·[[Construct]], 괄호 식, 쉼표 연산자, this 평가)와 MDN ko 7개
  - `concept.test.ts` 본문 주장: 2절 vm 목록 전부, `.mjs`·`.cjs`가 2절 표와 같다, 예제 2·4·5의 `"type": "module"` 실행 결과가 `.mjs`와 같다
- 주의사항: `console.log`에는 원시 값·JSON만. 예제는 포맷 제외 경로. vm 판정은 컨텍스트 안에서.
- 완료 조건: `npm test` L1 11개와 본문 주장 테스트 통과, lint·format·typecheck 통과, summary 160자 이하, MDN 200

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오)
- 변경: 3절 상태 모델과 시나리오 4개. 줄(또는 호출)마다 1단계, 실행 전 0단계. 테스트 3절 (a)~(c)와 단계 수 고정
- 주의사항: 단계 설명은 2절 명세 순서(참조 → thisArg → 함수 모드 → this)와 맞춘다. 콜백 단계 설명에 어느 `run(...)` 호출인지 적는다.
- 완료 조건: 이 개념 테스트 통과, 음성 확인 3건(3절 (d))을 서브에이전트가 실행·원복, 메인이 테스트 코드 확인

### 3. 시각화 `ThisView`

- 대상: `ThisView.tsx`, `ThisView.test.tsx`
- 변경: 3절 화면. new-operator `NewView`의 단계 목록·호출 영역, prototype-chain `ProtoView`의 카드·배지 클래스 기반
- 주의사항: effect·window 없음, 색만으로 구분하지 않음, 375px 줄바꿈, 비교표가 넘치면 포커스 가능한 region
- 완료 조건: 테스트 통과(빈 상태, 4칸 결정 과정과 각 칸 글자, 참조 종류 3가지 표시, via call 표시, 함수 모드 배지 4종, 화살표 바깥 this·bound 묶인 this 표시, 비교표 행 누적, 바뀐 칸 표시), typecheck 통과

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="this 결정 시뮬레이터"`, 다른 래퍼와 같은 형태
- 완료 조건: 테스트 4개(첫 화면, `extract`의 `whoAmI()` 단계 문구, 시나리오 전환, 마지막 콘솔)

### 5. 본문 content.mdx

- `## 동작 원리` h3
  - this는 호출 방식이 정한다(예제 1)
  - 호출식에서 this가 정해지는 순서(EvaluateCall: 프로퍼티 참조의 기준 값 / 변수 이름 → undefined, OrdinaryCallBindThis: sloppy·strict)
  - 메서드를 꺼내 부르면(예제 2·3, 일반 호출 예제 4)
  - 메서드 안의 중첩 함수(예제 5)
  - 콜백으로 넘기면 this를 잃는다와 세 가지 해결(예제 6)
  - call과 apply(예제 7, sloppy에서 null·원시 값 변환)
  - bind와 bound function 규칙(예제 8·9)
  - 화살표 함수의 this(예제 10, 객체 리터럴 화살표 프로퍼티 주의)
  - 괄호와 쉼표(예제 11, 대입식·`?.` 한 줄)
  - 정리 표(JSX `<table>`): 호출 방식 → this
- `## 예제`: 예제 1~11, PredictQuiz(정답 위치 분산, sloppy 예제는 질문에 클래식 스크립트 명시), `### 시뮬레이터로 확인하기`
- `## 결과와 이유`: 예제별 설명, 오해 Callout ① this는 함수가 정의된 객체다 ② 메서드 안의 함수는 메서드의 this를 이어받는다 ③ call로 부르면 bound function의 this도 바뀐다 ④ 화살표 함수도 메서드로 부르면 점 앞의 객체가 this다 ⑤ 괄호로 감싸면 값만 꺼낸다(괄호는 참조를 유지)
- 링크: function-calls, new-operator, primitives-and-objects, scope-chain, primitive-methods(원시 값 this 변환), prototype-chain(상속된 메서드도 점 앞의 객체)
- 주의사항: 2절 사실만, 오류 메시지 인용 없음, 실행 컨텍스트·화살표 문법·전역 객체는 별도 개념, JSX 안 인라인 code 줄바꿈 주의, 표는 375px 확인
- 완료 조건: 메인 대조, `npm test`·build 성공, HTML `<details` 11·`**` 0·깨진 code 0, 퀴즈 정답 = expectedOutput

### 6. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: prototype-chain 케이스를 본떠 추가만(`extract`의 `whoAmI()` 단계 문구 e2e 1개 포함), `navigation.spec.ts` 두 줄만 6으로, content-guide 목록·로드맵
- 완료 조건: 전체 검증 통과, 6절 브라우저 시나리오 1~8

## 9. 추가 개선 후보

- 추가 게시글 후보: 없음(22장 내용은 이 페이지에 담았다). 클래스 메서드의 this는 클래스 개념에서.
- 기존 개념 역방향 연결: `function-calls/meta.ts:75`, `new-operator/meta.ts:95`, `prototype-chain/meta.ts:108`, `primitive-methods/meta.ts:96`의 "별도 개념(this)" 문구와 `related`(기존 개념 수정, 사용자 확인)

## 변경 이력

- 2026-10-29 (사용자 외부 검토 1차, 9건): 본문·meta 문구와 근거 테스트만 바뀜(구조·범위 변경 없음, 재승인 불필요) — 영향 단계 1·5
- 2026-10-29 (사용자 외부 검토 2차, 1건): 매개변수 이름 문장을 판별로 정정 — 영향 단계 1·5

## 구현 진행

- baseline (2026-10-29, `6383794`): lint 0 / format 통과 / typecheck 0 / test 1824 통과. test:build 140·e2e 257(skip 3)은 직전 커밋 검증 결과 사용
- [x] 1. 예제·meta·route와 본문 주장 근거 테스트 — 예제 11개 초안과 `cmp` 동일, summary 137자, test 1892(+68: 본문 주장 11·L1 11·`.cjs` 11·`.mjs` 11·`"type": "module"` 3 등), lint·format·typecheck 통과. 메인 수정: 쓰지 않는 오류 헬퍼용 주석 1줄 삭제
- [x] 2. 시나리오와 대조 테스트 — 단계 수 extract 5·callback 8·bind 8·parens 5, test 1927(+35), 음성 확인 3건 서브에이전트 실행·원복, 메인이 parens 쉼표 단계로 재확인(3개 실패 → 원복 `cmp` 동일). 판단: call·apply 호출의 함수 자리 식을 `ref.kind: 'function-property'`(기준 값 = 함수)로 두고 `firstArg` 필드 추가, `run(...)` 자체는 결정하지 않고 안쪽 `callback()`만 결정. 메인 수정: bind 4·5단계 설명 문구(call의 this는 bound, "받은 thisArg")
- [x] 3. 시각화 `ThisView` — 테스트 12개(빈 상태, ref 4종 문구, call·apply 문구, 모드 배지 4종, 바깥 this·묶인 this·원본, 비교표 행 수 = history 길이(모든 단계), 새로 생김·방금 결정 표시), test 1943, lint·format·typecheck 통과. 비교표는 2열 `table-fixed` + 줄바꿈(region 없음) — 375px 확인은 6단계
- [x] 4. 래퍼 `Simulator` — 테스트 4개(첫 화면, `extract`의 `whoAmI()` 단계, 시나리오 전환, 마지막 콘솔)
- [x] 5. 본문 content.mdx — 메인 대조 후 직접 수정 8곳: 모듈 실행 결과 문장(예제 4는 `undefined`가 아니라 `false`), 콜백 일반화("받은 쪽이 항상 변수 이름으로 부른다" → "부르는 일이 많다"), bound [[Call]]의 인수 순서, `new` + bound의 `instanceof` 근거, 정리 표 call·apply 칸과 화살표 칸("어떻게 불러도" → call·bind·메서드 호출), 예제 1 퀴즈 해설("3번 줄" → "세 번째 출력"), 문장 다듬기 1곳. 근거 테스트 2개 추가(함수 안 객체 리터럴 화살표 프로퍼티는 그 함수의 this, 프로토타입 체인에서 찾은 메서드도 this는 점 앞의 객체). 빌드 HTML `<details` 11·`**` 0, 퀴즈 정답 = expectedOutput(정답 위치 0·1·2·3 분산)
- [x] 6. e2e·빌드 테스트·문서 — `helpers.ts` 상수, a11y 3개·responsive 2개·build 3개 추가, `navigation.spec.ts` 5→6, content-guide 목록, 로드맵 8행. 전체 검증: lint·format·typecheck 통과, test 1945, test:build 147, e2e 273 통과(skip 3은 기존)
  - 브라우저(serve 4175, Playwright, 데스크톱 라이트·375px 다크): ① 검토 중 배지·분류·퀴즈 버튼 11 ② `extract` 5단계 네 칸(변수 이름 / thisArg undefined / sloppy 규칙 / 전역 객체)·비교표 2행 ③ `callback` 화살표 카드 바깥 this book·8단계 this book ④ `bind` 5단계 call의 첫 인수 lee·bound 규칙·this kim ⑤ `parens` 5단계 참조가 아닌 값·undefined ⑥ 네 시나리오 끝까지 가로 넘침 0, 키보드 →·Home, 콘솔 에러 0 ⑦ 홈 카드 19·'객체와 프로토타입' 5·`객체` 6건(첫 카드 '원시 값과 객체')·`this` 3건 ⑧ 예제 이름 `in window` 없음. 정리 표는 375px에서 74px 넘쳐 포커스 가능한 region 안에서 가로 스크롤(primitive-methods와 같은 방식, axe 통과)
  - 브라우저에서 발견해 고침: 비교표 code가 `[overflow-wrap:anywhere]`로 `run(plain.bind(thi` / `s))`처럼 식별자 중간에서 끊김 → `table-fixed`와 anywhere를 빼고 자동 열 너비 + `break-words`(재확인: 끊김 없음, 넘침 0)
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 없음. Low 2(보고만): ① `ThisView`가 call·apply 참조의 함수 자리 식을 `fnId`로 표시(현재 시나리오는 fnId = 변수 이름이라 맞음) ② 콜백 단계 설명이 매개변수 `callback`을 "변수 이름"으로 표기(명세상 식별자 참조라 틀리지 않음)
- 외부 검토 1차(사용자, 9건) 반영 — 명세 원문(ES2027 초안 사본)과 vm·Chromium 실행으로 먼저 확인
  - 중간 3건 반영: ① 대괄호 접근도 프로퍼티 참조(규칙 정의 문장·정리 표에 `obj['m']()`, summary "점(대괄호) 앞") ② "실행 환경에 따라" → "클래식 스크립트인지 모듈인지에 따라", 모듈 예에 `<script type="module">`(Chromium에서 클래식은 globalThis·모듈은 undefined 확인), 단순화 ④에도 추가 ③ sloppy 규칙에 "객체이면 그대로" 추가
  - 낮음 6건: ④ 용어 — 검토는 "[[Call]]·OrdinaryCallBindThis는 thisArgument"라 했으나 참고 링크가 가리키는 현재 초안은 두 곳 모두 `thisArg`, EvaluateCall만 `thisValue`라서 그 사실대로 한 문장 추가 ⑤ 참조 설명 "찾았는가" → "찾을지"(Reference Record 병기, 없는 프로퍼티도 참조) ⑥ 예제 3은 "globalThis 비교를 뺀 것 말고는 예제 2와 같다"로(예제 파일은 그대로) ⑦ bind `length`는 0 아래로 안 줄어듦 ⑧ 단순화에 `super.m()`(GetThisValue가 [[ThisValue]]) 추가, references에 GetThisValue ⑨ 단순화 ③에 global this value와 전역 객체 구분
  - 근거 테스트 추가: 대괄호 호출 this, `super.m()`의 this, bind `length` 0 하한. 단순화 ④ 문장도 "undefined가 나옵니다" → "this가 undefined가 되고 결과가 달라집니다"(예제 4는 `false` 출력)
  - 검증: lint·format·typecheck 통과, test 1947, test:build 147, e2e 273 통과(skip 3 기존), 브라우저 스크립트 재실행(넘침 0·콘솔 에러 0), 예제 11개 초안과 `cmp` 동일
- 외부 검토 2차(사용자, 1건): "[[Call]]·OrdinaryCallBindThis의 매개변수는 thisArgument"라는 지적 → 명세를 다시 내려받아 확인: 발행된 ES2024·ES2025는 `[[Call]] ( thisArgument, argumentsList )`·`OrdinaryCallBindThis ( F, calleeContext, thisArgument )`, 현재 초안(참고 링크 대상)은 `[[Call]] ( thisArg, argList )`·`OrdinaryCallBindThis ( func, calleeContext, thisArg )`. 1차에 넣은 문장은 초안 기준으로만 맞았고 references 라벨은 ES2025 이름이 섞여 있었음 → 본문을 "ES2025 판까지 thisArgument, 현재 초안은 thisArg, call·apply·bind의 첫 매개변수도 thisArg"로 고치고, references의 EvaluateCall·OrdinaryCallBindThis 라벨을 링크 대상인 현재 초안 시그니처로 맞춤. lint·format·typecheck 통과, test 1947, test:build 147

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 예제 11개, 퀴즈 11, misconception 5, 정리 표, "this 결정" 시뮬레이터(시나리오 4개: 5·8·8·5단계). 공통 코드와 기존 개념 파일은 바꾸지 않았고 `navigation.spec.ts`는 기대값 두 곳만 6으로 바꿨다.
- 계획과 달라진 점
  - 상태 모델: call·apply 호출을 그리려고 `Ref`에 `function-property`(함수 자리 식 `bound.call`의 기준 값이 함수 bound)를 더하고 `Determination.firstArg`를 두었다. `run(...)` 호출 자체는 결정하지 않고 안쪽 `callback()`만 결정한다.
  - 비교표는 처음에 `table-fixed` + `overflow-wrap:anywhere`였으나 375px에서 식별자 중간이 끊겨 자동 열 너비 + `break-words`로 바꿨다. 정리 표는 375px에서 넘쳐 primitive-methods처럼 포커스 가능한 region으로 감쌌다.
  - 본문은 메인 대조(8곳)와 외부 콘텐츠 검토 두 차례(1차 9건, 2차 1건)로 다듬었다. 2차 지적(매개변수 이름 thisArgument)은 명세 판마다 이름이 달라(ES2024·ES2025 `thisArgument`, 현재 초안 `thisArg`) 두 판을 함께 적고 references 라벨을 링크 대상인 현재 초안에 맞췄다. 단순화 항목에 `super.m()`과 global this value를 더했다. 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- Critical/High 0. Low 2건(시뮬레이터의 call·apply 칸이 함수 id를 변수 이름으로 표시, 콜백 설명이 매개변수를 "변수 이름"으로 표기)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록
- [ ] (선택) 9절 기존 개념 역방향 연결(function-calls·new-operator·prototype-chain·primitive-methods의 "별도 개념(this)" 문구와 `related`)
- [ ] 추가 게시글 후보 "전역 객체" — 9번 실행 컨텍스트 뒤 제안(globalThis와 global this value 구분 포함)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터 한 단계에 호출 하나를 네 칸(함수 자리 식의 참조 → thisArg → 불리는 함수의 모드 규칙 → this)으로 모두 채웠다 — 칸마다 단계를 나누면 시나리오가 네 배로 길어진다. 네 칸은 명세 EvaluateCall과 OrdinaryCallBindThis의 순서를 그린 교육용 단위다.
- [Claude 판단] 시나리오의 `thisValue`는 규칙으로 계산하지 않고 손으로 적고, 테스트가 모드 규칙으로 따로 계산한 값·예제를 실제로 실행해 탐침으로 기록한 this(vm 안 `===`)와 대조한다 — 계산해서 넣으면 틀린 규칙이 테스트와 함께 틀려 음성 확인이 무의미해진다.
- [Claude 판단] 외부 검토 2차의 "매개변수는 thisArgument" 지적을 그대로 따르지 않고 판별로 적었다 — 명세를 다시 받아 보니 발행본과 현재 초안의 이름이 달랐고, 참고 링크는 현재 초안을 가리킨다.
- [Claude 판단] 모바일 비교표의 code 줄바꿈 방식을 `overflow-wrap:anywhere`에서 자동 열 너비 + `break-words`로 바꿨다 — anywhere는 `run(plain.bind(thi`/`s))`처럼 식별자 중간을 끊었다.
- [무검토 승인] bound function을 bound function으로 다시 묶은 호출(`bound.bind(lee)()`)은 한 단계로 그리고, `thisValue`는 마지막 원본이 받는 this(안쪽 bound가 묶은 kim)로 정의했다.
- 범위(화살표 함수는 this 동작만, 콜백·중첩 함수·bind 세부 규칙·괄호와 쉼표 포함), this 결정 시뮬레이터, 외부 검토 반영은 사용자 결정·요청.

#### 배경지식

- EvaluateCall: 함수 자리 식이 프로퍼티 참조(`obj.m`, `obj['m']`)면 thisValue = GetThisValue(기준 값, super 참조는 [[ThisValue]]), 식별자면 환경 레코드의 WithBaseObject(보통 undefined), 참조가 아니면 undefined.
- OrdinaryCallBindThis: lexical(화살표)은 묶지 않음, strict는 그대로, sloppy는 undefined·null → global this value, 원시 값 → ToObject, 객체 → 그대로.
- 괄호 식은 Reference를 그대로 돌려주고, 쉼표 연산자·대입식은 GetValue로 값을 돌려준다. `?.`는 this를 유지한다.
- bound function [[Call]]은 받은 thisArg를 버리고 boundThis로 target을 부르고, [[Construct]]는 boundThis를 쓰지 않고 newTarget을 target으로 바꾼다(묶인 인수는 쓰임).
- 모듈 코드는 항상 strict라서 sloppy 예제는 `.mjs`·`"type": "module"`·`<script type="module">`에서 결과가 달라진다.

#### 확인 질문

1. `(book.whoAmI)()`는 this를 유지하는데 `(0, book.whoAmI)()`는 왜 잃는가? 둘 다 괄호가 있지 않은가?
   <details><summary>답</summary>바깥 괄호가 아니라 안쪽 식이 다르다. 괄호 식은 안쪽 평가 결과(프로퍼티 참조)를 그대로 돌려줘 EvaluateCall이 기준 값 book을 thisArg로 쓴다. 쉼표 연산자는 오른쪽 식에 GetValue를 적용해 함수 값만 돌려주므로 참조가 아니어서 thisArg가 undefined다. 예제 11, 계획 2절 13.2.9.2·13.16.1.</details>
2. `bound.call(lee)`에서 `call`은 lee를 thisArg로 넘기는데 왜 this가 kim인가? 시뮬레이터는 이 호출의 ① 칸을 어떻게 그리는가?
   <details><summary>답</summary>`bound.call`은 프로퍼티 참조라 call의 this가 bound이고, call은 bound를 thisArg lee로 부른다. 그러나 bound function의 [[Call]]은 받은 thisArg를 쓰지 않고 boundThis(kim)로 whoAmI를 부른다. 시뮬레이터는 ①을 `function-property`(기준 값은 함수 bound), ②를 "call의 첫 인수 lee"로 그린다. 예제 8, `scenarios.ts`, 계획 2절 10.4.1.1.</details>
3. 시나리오의 `thisValue`를 `decide()`에서 규칙으로 계산하지 않고 인자로 받는 이유는? 계산하게 바꾸면 어떤 테스트가 의미를 잃는가?
   <details><summary>답</summary>계산하면 구조 테스트의 "모드 규칙과 같다" 검사가 같은 규칙을 두 번 쓰는 셈이라 규칙이 틀려도 통과한다. 탐침 대조는 남지만 음성 확인(thisValue를 일부러 틀리게 그리기)을 할 수 없다. `scenarios.ts`의 decide 주석, `concept.test.ts` 시나리오 구조·탐침 대조, 구현 진행 2단계.</details>
4. 예제 4를 `.mjs`로 실행하면 첫 줄이 `undefined`가 아니라 `false`인 이유는?
   <details><summary>답</summary>모듈은 strict라서 `sloppy` 함수의 this가 undefined가 되지만, 이 함수는 this를 출력하지 않고 `this === globalThis`를 돌려주므로 false가 출력된다. 메인 대조에서 고친 문장, 계획 2절 표, `concept.test.ts` 모듈 실행 테스트.</details>
5. 화살표 함수를 객체 리터럴에 `{ m: () => this }`로 쓰면 `o.m()`의 this가 o가 아닌 이유를 명세 순서로 설명하면?
   <details><summary>답</summary>EvaluateCall은 thisArg로 o를 정하지만, 화살표 함수의 thisMode는 lexical이라 OrdinaryCallBindThis가 this를 묶지 않는다. 그래서 화살표 함수 안의 this는 바깥(객체 리터럴을 쓴 자리)의 this다. 본문 "화살표 함수의 this", 근거 테스트 2개.</details>
