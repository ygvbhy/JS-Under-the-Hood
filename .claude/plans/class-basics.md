# 개념 '클래스는 함수다' 구현 계획

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `4afa898`

## 0. 요약

- 목적: 25~37장 로드맵 1번 `/concepts/class-basics`를 추가한다. 클래스가 함수 객체라는 것과, 생성자 함수와 달라지는 지점을 예제 9개와 비교표·퀴즈로 보인다. 다루는 지점은 TDZ, `new` 없이 호출하면 TypeError, 항상 strict, 메서드 열거 불가, 클래스 이름 바인딩, 인스턴스 필드·static, private 필드, 메서드는 생성자가 아님이다(사용자 결정 2026-10-30: 추가 주제 4개 모두, 시각화는 비교표 + 퀴즈).
- 범위: 새 개념 폴더 1개를 만든다(category `objects`, order 230으로 학습 순서 마지막, 시뮬레이터 없음). 마지막 개념이 바뀌므로 개수·마지막 개념·이전/다음을 고정한 테스트를 갱신하고, e2e·빌드 테스트와 content-guide, 로드맵도 고친다. 공통 코드와 기존 개념 24개는 바꾸지 않는다.
- 위험: ① "클래스는 문법 설탕일 뿐"처럼 차이를 지우거나, 반대로 "클래스는 함수가 아니다"처럼 과장하는 서술 ② 비교표의 칸이 실제 동작과 어긋나는 것 → 표 칸마다 실행 probe를 두고 테스트가 대조한다.
- 복잡도: 중간 · Consensus: 생략. iife-module-pattern·global-object와 같은 "표 데이터 + 근거 테스트" 패턴이고 공통 코드를 바꾸지 않는다. 예제와 핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 1건(제목 문구)

## 1. 요구사항

### 요구사항

- 로드맵 1번 "클래스는 함수다"(25장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`, 사용자 확정 2026-10-30).
- 기본 주제
  - ① 클래스는 함수 객체다. `typeof`가 `'function'`이고, `prototype`·`constructor` 연결과 `new`로 만든 객체의 `[[Prototype]]`이 생성자 함수와 같은 구조다.
  - ② 클래스 선언은 호이스팅되지만(바인딩이 블록·스크립트 처음부터 있음) 선언이 평가되기 전에는 초기화되지 않아 TDZ다. 선언 전에 쓰면 ReferenceError이고, 바깥의 같은 이름도 가린다.
  - ③ `new` 없이 부르면(`call` 포함) TypeError다(`[[IsClassConstructor]]`).
  - ④ 클래스의 모든 부분은 strict mode 코드다. 꺼내서 부른 메서드의 `this`는 `undefined`이고, 선언 없는 대입은 ReferenceError다.
  - ⑤ 클래스 메서드는 `prototype`에 열거 불가로 정의되어 `for...in`에 나오지 않는다(생성자 함수의 `prototype`에 대입한 메서드는 열거됨).
- 추가 주제(사용자 결정 2026-10-30, 모두 포함)
  - ⑥ 클래스 이름 바인딩: 클래스 안의 이름은 변경할 수 없는 바인딩이라 대입하면 TypeError다. 바깥의 클래스 선언 바인딩은 `let`처럼 다시 대입할 수 있다. 클래스 식의 이름은 클래스 안에서만 보인다. 같은 스코프의 `let`과 이름이 겹치면 SyntaxError다.
  - ⑦ 인스턴스 필드와 static: 필드(`count = 0`)는 인스턴스마다 생기는 자기 프로퍼티이고(열거됨), 메서드는 `prototype`에 하나만 있다. static은 클래스(함수 객체) 자신의 프로퍼티다.
  - ⑧ private 필드(`#x`): 프로퍼티가 아니라서 `Object.keys`·`JSON.stringify`에 나타나지 않는다. `obj['#x']`는 이름이 `'#x'`인 별개의 문자열 키 프로퍼티다. 클래스 밖에서 `obj.#x`를 쓰면 SyntaxError다(스크립트 전체가 실행되지 않음). 상태 은닉은 [클로저](/concepts/closure)·[모듈 패턴](/concepts/iife-module-pattern)과 짧게 비교한다.
  - ⑨ 메서드는 생성자가 아니다: 클래스 메서드를 `new`하면 TypeError다(`function` 식으로 만든 생성자 함수 메서드는 됨). 클래스의 `prototype` 프로퍼티는 writable false다(함수는 true). 3번 개념(화살표 함수와 메서드 축약)과 겹치는 부분은 짧게 쓰고 "별도 개념"으로 넘긴다.
- 이미 다룬 내용은 요약하고 링크한다: `new`의 단계는 [new 연산자](/concepts/new-operator), 프로토타입 체인은 [프로토타입 체인](/concepts/prototype-chain), TDZ는 [TDZ](/concepts/tdz), 열거·writable은 [프로퍼티 어트리뷰트와 접근자](/concepts/property-attributes), strict mode에서 `this`가 `undefined`가 되는 것은 [this](/concepts/this-binding).
- 시각화: 비교표 "생성자 함수와 클래스"는 데이터 파일로 두고, 칸마다 실행 probe를 넣어 테스트가 대조한다.

### 유지해야 하는 기존 동작

- 기존 개념 24개의 페이지·테스트 결과는 그대로 두고, 파일도 수정하지 않는다. new-operator simplifications의 "클래스…별도 개념" 문구도 그대로 둔다(역방향 연결은 나중에 일괄로 처리).
- 홈 '객체' 검색의 첫 카드는 '원시 값과 객체'로 유지한다.
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다.

### 제외 범위

- 상속(`extends`, `super`, 파생 클래스 생성자) — 2번 개념
- 화살표 함수와 메서드 축약 전반 — 3번 개념(⑨는 클래스 메서드만)
- getter·setter의 일반 동작(property-attributes가 다룸), static 블록, private 메서드, `#x in obj`, 필드 초기화 순서의 세부, 계산된 메서드 이름
- `Function.prototype.toString` 결과, 데코레이터
- "클래스를 써야 한다/쓰지 말아야 한다" 같은 권고

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안 ES2027, 2026-10-30 내려받아 확인)

- `#sec-strict-mode-code`: "All parts of a ClassDeclaration or a ClassExpression are strict mode code."
- `#sec-ecmascript-function-objects-call-thisargument-argumentslist` ([[Call]]): `F.[[IsClassConstructor]]`가 true면 TypeError를 만들어 던진다.
- `#sec-definemethodproperty`: 메서드 프로퍼티는 `{ [[Writable]]: true, [[Enumerable]]: enumerable, [[Configurable]]: true }`로 정의한다. 클래스 요소 평가는 enumerable에 false를 넘긴다(`#sec-runtime-semantics-classdefinitionevaluation` → ClassElementEvaluation). 구현 단계 1에서 호출부의 false 인수를 원문으로 재확인한다.
- `#sec-makeconstructor`: `writableProto`가 없으면 true다. 클래스는 ClassDefinitionEvaluation에서 `MakeConstructor(F, false, proto)`로 부른다(구현 단계 1에서 원문 재확인). 그래서 클래스의 `prototype` 프로퍼티는 writable false다.
- 클래스 정의 관련 절: `#sec-class-definitions`, `#sec-runtime-semantics-classdefinitionevaluation`, `#sec-runtime-semantics-bindingclassdeclarationevaluation`, `#sec-class-definitions-runtime-semantics-evaluation`.
- `typeof`: `#sec-typeof-operator-runtime-semantics-evaluation`(호출할 수 있는 객체는 `'function'`).

### 사실 (실행 확인 — Node v24.22.1 vm, 예제마다 새 컨텍스트, 초안 파일 실행)

| 초안 예제 | 실제 출력 |
| - | - |
| `class-is-function.js`(typeof, `prototype.constructor`, 인스턴스의 `[[Prototype]]`) | `function` / `true` / `true 3` |
| `class-tdz.js`(선언 전 `new`, 선언 뒤 `typeof new`, 바깥 `let Shape`를 블록 안 `class Shape`가 가림) | `ReferenceError` / `object` / `ReferenceError` |
| `call-without-new.js`(함수 호출, 클래스 호출, `call`) | `called` / `TypeError` / `TypeError` |
| `class-strict.js`(꺼낸 메서드의 `this`, 메서드 안 선언 없는 대입) | `true undefined` / `ReferenceError undefined` |
| `method-enumerable.js`(`for...in` 키, 메서드 디스크립터 enumerable) | `["own","hello"] ["own"]` / `false` |
| `class-name-binding.js`(안에서 대입, 바깥 재대입, 클래스 식 이름) | `TypeError` / `replaced` / `function undefined` |
| `fields-static.js`(인스턴스 필드·static 카운트, 키) | `2 1 3` / `["count"] false undefined` |
| `private-field.js`(#balance, keys·JSON, 문자열 키 `'#balance'`) | `70` / `[] {} undefined` / `60 0` |
| `method-not-constructor.js`(생성자 함수 메서드 `new`, 클래스 메서드 `new`, prototype writable) | `object` / `TypeError` / `false true` |

- 예제로 보일 수 없는 주장(스크립트 전체가 실행되지 않음) — 근거 테스트로 확인: `let A; class A {}` SyntaxError, 클래스 밖 `w.#b` SyntaxError, 클래스 메서드의 중복 매개변수 `m(a, a)` SyntaxError(strict).
- 초안 파일은 `$CLAUDE_JOB_DIR/tmp/cls/`에 있다. 구현 때 내용을 옮기고 다시 실행해 확인한다.

### 사실 (코드에서 확인)

- 표 + 근거 테스트 패턴: `app/concepts/iife-module-pattern/`(`approaches.ts`를 본문 표와 `concept.test.ts`가 함께 씀), `app/concepts/global-object/`.
- 현재 마지막 개념은 for-let(order 220, 24번째)이다. order 230이면 새 개념이 25번째이자 마지막이 된다.
- 고정값(현재):
  - `tests/e2e/navigation.spec.ts`: 카드 24(`:78`, `:122`), 마지막 '24번째'와 for-let 제목(`:84-87`), pager '1 / 24'(`:148`), closure '22 / 24'(`:158`), for-let '24 / 24'와 링크 1개 `/concepts/iife-module-pattern`(`:169-174`), '객체' 검색 8건과 순위 `[…,'21','23']`(`:17`, `:32`, `:91`, `:98`, `:109`)
  - `tests/e2e/responsive.spec.ts:694` 홈 학습 순서 카드 24
  - `app/lib/concepts.test.ts:104`, `:107-113`: total 24, 마지막 개념 for-let(prev iife-module-pattern, position 24)
  - `app/components/concept/ConceptPager.test.tsx:18`, `:26-34`: '1 / 24', 마지막 for-let '24 / 24'와 이전 링크
- 검색 대상은 title·summary·tags(`app/lib/concepts.ts:72-78`)다. 새 개념의 title·summary·tags에 '객체'가 들어가면 '객체' 검색 결과가 9건이 되고 순위에 '25'가 추가된다. 구현 단계 4에서 실제 meta로 판정한다.
- e2e 등록 방식: `tests/e2e/helpers.ts`의 경로 상수, `a11y.spec.ts`의 페이지 axe 케이스(iife-module-pattern 케이스 `:545-550`), `responsive.spec.ts`의 가로 스크롤 케이스(`:664`).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축은 "클래스는 함수다(같은 점) → 그런데 이렇게 다르다(차이 9가지)"로 잡는다. 같은 점 하나와 차이마다 예제 + 퀴즈를 두고, 마지막에 비교표로 정리한다. 서술의 결론은 "클래스는 함수 객체를 만드는 문법이지만, 클래스로 만든 함수는 일반 함수와 다른 내부 슬롯·속성·strict 규칙을 가진다"이다. "문법 설탕일 뿐"이라는 표현은 쓰지 않고, 오해 Callout에서 바로잡는다.
- 표 데이터 `comparison.ts`: 행마다 항목, 생성자 함수 칸, 클래스 칸을 둔다. 각 칸은 `{ text, probe, expected }`로, 본문에는 `text`를 보인다. 테스트는 `probe`(짧은 스크립트, 결과를 문자열로 반환)를 vm 새 컨텍스트에서 실행해 `expected`와 같은지 확인하고, 오류는 `e.name`으로 비교한다. 행: typeof / 선언 전에 `new` / `new` 없이 호출 / strict mode / 메서드 열거 / 메서드를 `new` / `prototype` writable / 상태 은닉(클로저 vs `#x`).
- 예제로 출력할 수 없는 SyntaxError 세 가지는 본문 + 근거 테스트로 확인한다(iife-module-pattern과 같은 방식).
- 장 범위: 25장까지를 전제로 하고, 화살표 함수·메서드 축약(26장)은 "별도 개념"으로만 쓴다. 상속도 2번 개념으로 넘긴다. 예제에 화살표 함수·`extends`·배열 메서드를 쓰지 않는다(`JSON.stringify` 배열 출력은 허용).
- 용어: '찾히다'는 쓰지 않는다.
- order 230, category `objects`. prerequisites는 new-operator, prototype-chain, tdz, property-attributes이고, related는 new-operator, prototype-chain, this-binding, closure, iife-module-pattern이다.
- 버린 대안
  - ① 시뮬레이터: 사용자 결정(비교표 + 퀴즈).
  - ② category `execution`: 주제가 생성자·프로토타입이라 new-operator·prototype-chain과 같은 `objects`.
  - ③ 표를 본문 JSX에 직접 쓰기: 칸과 실제 동작이 어긋나도 테스트가 잡지 못한다.

## 4. 변경 파일

- 추가 `app/concepts/class-basics/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `comparison.ts`(표 데이터), `concept.test.ts`
  - `examples/`(9개): `class-is-function.js`, `class-tdz.js`, `call-without-new.js`, `class-strict.js`, `method-enumerable.js`, `class-name-binding.js`, `fields-static.js`, `private-field.js`, `method-not-constructor.js`
- 수정
  - `tests/e2e/helpers.ts`: `CLASS_BASICS_PATH`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe 1개(iife-module-pattern 케이스와 같은 모양)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 1개 추가, 홈 학습 순서 카드 24→25
  - `tests/e2e/navigation.spec.ts`:
    - 카드 24→25(두 곳), 마지막 '25번째'와 새 제목
    - pager '1 / 25', closure '22 / 25'
    - for-let은 '24 / 25'가 되고 링크 2개(이전 iife-module-pattern, 다음 class-basics)
    - 새 개념 '25 / 25'와 이전 링크 for-let(1개)
    - '객체' 검색 수·순위는 단계 4 판정에 따름
  - `app/lib/concepts.test.ts`: total 25. 마지막 개념 테스트는 class-basics(prev for-let, position 25)로
  - `app/components/concept/ConceptPager.test.tsx`: '1 / 25'. 마지막 개념은 class-basics '25 / 25'와 이전 링크 `/concepts/for-let`
  - `tests/build/build-output.test.ts`: class-basics 프리렌더 describe(퀴즈 `<details` 개수, 표 텍스트)
  - `docs/content-guide.md`: 9단계 e2e 목록에 `class-basics`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 1번 상태·계획 문서·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 24개

## 5. 위험 요소

- "클래스는 문법 설탕일 뿐" 또는 "클래스는 함수가 아니다" 같은 과장 → 같은 점(typeof, prototype 구조)과 다른 점(내부 슬롯·속성·strict)을 각각 예제로 보이고 오해 Callout에서 바로잡는다(단계 3).
- TDZ 설명이 "클래스는 호이스팅되지 않는다"로 흐름 → 블록 안 `class Shape`가 바깥 `let Shape`를 가려 ReferenceError가 나는 예제로 바인딩이 처음부터 있음을 보인다(단계 1·3).
- 비교표 칸 오류 → probe 대조 테스트와 음성 확인(칸 하나를 바꾸면 실패)(단계 2).
- private 필드를 "숨긴 프로퍼티"로 설명함 → 명세상 프로퍼티가 아니라 Private Name으로 관리되는 요소라고 쓰고, 문자열 키 `'#balance'`와 별개임을 예제로 보인다.
- 3번 개념과의 중복 → ⑨는 클래스 메서드 `new`와 `prototype` writable만 다루고 나머지는 "별도 개념"으로 넘긴다.
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 4에서 고치고 `npm test`·e2e로 확인한다.
- 예제의 최상위 `let Shape`·`class` 선언: 예제마다 새 vm 컨텍스트라 다른 예제와 충돌하지 않는다.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 9개의 실제 출력이 `expectedOutput`과 같다(처음엔 `[]`로 두고 실행 결과를 확인한 뒤 채움). 2절 표와 다르면 멈춘다.
  - `concept.test.ts`: (a) SyntaxError 3종(let·class 중복, 클래스 밖 `#x`, 메서드 중복 매개변수) (b) 비교표 모든 칸의 probe = expected (c) 표의 예제 id가 meta에 있음.
  - 명세 재확인: ClassElementEvaluation이 DefineMethodProperty에 enumerable false를 넘기는지, ClassDefinitionEvaluation이 MakeConstructor에 writableProto false를 넘기는지 원문으로 확인한다.
  - 메인 에이전트가 본문의 결과·원인 문장을 2절과 대조하고, 줄 번호 언급을 예제 파일과 대조한다.
  - 참고 링크(명세 anchor, MDN ko — 없으면 en-US)를 실제로 열어 확인한다.
- 브라우저(e2e 외 직접 확인, dev 서버 5173 또는 `npm run build && npm run start`)
  1. `/concepts/class-basics`를 375px로 연다 → 비교표가 표 영역 안에서만 가로 스크롤되고 페이지에는 가로 스크롤이 없다.
  2. 다크 모드 → 표·코드·Callout 대비가 읽힌다.
  3. 키보드로 첫 퀴즈를 선택하고 '정답 확인'을 누른다 → 정답과 설명이 보인다.
  4. 하단 학습 순서 → '25 / 25', 이전 for-let, 다음 없음.
  5. for-let 페이지 하단 → '24 / 25', 다음이 class-basics다.
  6. 새 개념 폴더를 추가했으므로 dev 서버를 재시작한 뒤 확인한다(AGENTS.md).

## 7. 미확정 사항

- [미확정] 제목 문구: 초안은 '클래스는 함수다: 생성자 함수와 무엇이 다를까'다. 사용자 검토 때 조정할 수 있고, 계획 구조에는 영향이 없다.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인, 명세 재확인

- 대상: `app/concepts/class-basics/examples/*.js`(9개), `meta.ts`, `route.tsx`, 임시 `content.mdx`(필수 h2 3개만)
- 현재: 폴더 없음
- 변경
  - 2절 초안 예제를 옮긴다.
  - `meta.ts`:
    - slug, title(7절 초안), summary(160자 이하), category `objects`, order 230
    - tags: 클래스, class, 생성자 함수, 클래스 필드, static, private 필드, TDZ, strict mode, 열거 불가, `[[IsClassConstructor]]`
    - goals 4개, prerequisites·related(3절)
    - examples: 처음엔 `[]`로 두고 실행 결과를 확인한 뒤 채운다
    - simplifications: 상속은 별도 개념, 메서드 축약·화살표 함수는 별도 개념, private 메서드·static 블록·`#x in`·필드 초기화 순서 세부는 다루지 않음, `console`은 호스트 API, 예제는 스크립트로 실행
    - references: 2절 명세 anchor와 MDN(Classes, class 선언, private 속성, static)
    - `reviewedAt: null`
  - `route.tsx`: 템플릿을 복사한다.
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 예제에 화살표 함수·`extends`·`import`를 쓰지 않는다. `console.log`에는 원시 값과 `JSON.stringify`만 넘긴다. 파일 끝에 줄바꿈 하나를 둔다. 명세 원문에서 enumerable false·writableProto false 인수를 확인하고, 다르면 멈춘다.
- 완료 조건:
  - `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts`가 통과하고, 출력이 2절 표와 같다.
  - 명세 두 인수를 확인한 원문 문장을 구현 진행에 기록한다.
  - 참고 링크가 전부 200이다.

### 2. 비교표 데이터와 근거 테스트

- 대상: `comparison.ts`, `concept.test.ts`
- 변경: 3절의 행 8개를 만들고, 6절 정확성 (a)~(c)를 테스트로 쓴다.
- 주의사항: vm 오류는 `name`으로 비교한다. probe는 한 칸에서 다른 칸의 상태에 의존하지 않게 칸마다 새 컨텍스트에서 실행한다.
- 완료 조건: `npx vitest run app/concepts/class-basics`가 통과한다. 음성 확인으로 칸 하나의 `expected`를 바꾸면 실패하는지 본 뒤 되돌린다.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경
  - 필수 h2 3개를 둔다.
  - 동작 원리의 h3: 클래스는 함수 객체 / 호이스팅과 TDZ / `new` 없이 부르면 / 항상 strict / 메서드는 열거되지 않는다 / 클래스 이름 바인딩 / 인스턴스 필드와 static / private 필드 / 메서드는 생성자가 아니다 / 비교표
  - 예제마다 PredictQuiz를 둔다(9개).
  - 오해 Callout: "클래스는 문법 설탕일 뿐이라 함수와 똑같다", "클래스는 호이스팅되지 않는다", "private 필드는 이름이 `#`으로 시작하는 프로퍼티다", "static 메서드는 인스턴스에서도 부를 수 있다"
- 주의사항: 표는 JSX `<table>`로 쓰고 `comparison.ts`에서 그린다(iife-module-pattern 표 마크업). 이미 다룬 내용은 링크로 넘긴다. '찾히다'는 쓰지 않는다. 공백이 든 인라인 코드가 Prettier 줄바꿈에 걸리지 않게 한다.
- 완료 조건:
  - `npm test`가 통과한다.
  - 메인 에이전트가 본문의 결과·원인 문장을 2절과 하나씩 대조했고, 줄 번호 언급을 예제 파일과 대조했다.
  - `grep -c '찾히' content.mdx`의 결과가 0이다.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로 고친다. '객체' 검색은 `concepts.ts`의 검색과 같은 조건(title·summary·tags에 '객체'가 포함되는지)으로 새 meta를 판정한다. 포함되면 '객체' 검색 수를 9로 바꾸고 순위에 '25'를 추가하고, 아니면 그대로 둔다.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만 한다.
- 완료 조건: 6절의 전체 검증 명령이 통과하고, 6절 브라우저 시나리오 1~5를 확인한다.

## 9. 추가 개선 후보

- 기존 new-operator simplifications의 "클래스 생성자는 new 없이 호출하면 TypeError…" 문구를 이 페이지 링크로 바꾸기 — 역방향 연결을 일괄로 처리할 때 함께 한다.

## 변경 이력

- 2026-10-30 (외부 콘텐츠 검수 5건 중 4건, 실행·명세로 확인 후 반영): ① 메서드를 new하면 TypeError인 원인은 클래스가 아니라 메서드 정의 문법(객체 리터럴 `{ make() {} }`도 같음) — 비교표 행 이름·칸, 예제 9 설명, 오해 Callout에 단서 추가, "열거 불가"는 객체 리터럴 메서드가 열거되므로 클래스 고유 차이임을 명시(근거 테스트 추가) ② 클래스 안쪽 이름의 TypeError 원인을 "strict 본문"이 아니라 `CreateImmutableBinding(classBinding, true)`(strict 바인딩)로 고치고, 바깥 재대입 뒤에도 안쪽 이름은 원래 클래스를 가리킴을 추가(근거 테스트) ③ 비교표 "상태를 숨기는 방법" 행을 "#private 필드" 사용 가능 여부로 바꾸고(생성자 함수 안 `this.#x`는 SyntaxError), 클로저는 클래스 constructor 안에서도 쓸 수 있음을 본문에 명시 ④ "꺼낸 메서드의 this" 행을 sloppy 스크립트 기준으로 표기, `'use strict'` 스크립트면 생성자 함수 메서드도 undefined임을 본문에 추가, 모듈 단순화 문구에 "예제 4의 6번 줄만 달라짐"을 명시(9개 예제를 .mjs로 실행해 확인) — 영향 단계 2·3. ⑤ 공통 부품 `SimplificationNote` 제목("이 시각화에서 단순화한 부분")은 모든 개념 페이지에 걸리는 공통 코드 변경이라 이 작업에서 제외하고 사용자에게 확인

## 구현 진행

- baseline (2026-10-30, `4afa898`): 직전 커밋에서 전체 검증 통과(lint·format·typecheck, `npm test` 2472, `test:build` 204, e2e 355 passed / 3 skipped). 이후 변경은 `.claude/plans/` 문서뿐
- 명세 재확인(단계 1 선행, 메인): ClassDefinitionEvaluation "Perform MakeConstructor ( ctorFunc , false , proto )" → 클래스 `prototype` writable false. ClassElementEvaluation(`#sec-static-semantics-classelementevaluation`) "MethodDefinitionEvaluation of MethodDefinition with arguments obj and false" → 메서드 enumerable false. `constructor`도 "DefineMethodProperty ( proto , "constructor" , ctorFunc , false )"
- [x] 1. 예제·meta·route — 예제 9개 실제 출력 = 2절 표(`tests/examples.test.ts` 통과), 명세 anchor 9개·MDN 5개 확인(ko 404인 Public class fields는 en-US). 생성 순서 meta → content → route(dev 서버 보호)
- [x] 2. 비교표·근거 테스트 — `npx vitest run app/concepts/class-basics` 20개 통과, 음성 확인 완료. 메인 수정: 표 칸 2개 문구를 probe가 보이는 사실로 좁힘('함수로 호출됨', 'globalThis의 값(sloppy mode)'). 서브에이전트 vitest JSON 리포트 부산물 `.vitest/` 제거
- [x] 3. 본문 작성 — 메인 검토 후 4곳 수정(`typeof`가 `'function'`인 근거로 `[[Call]]` 명시, sloppy `this`를 global this value로, 예제 6 "오류의 이름" 오기, static Callout 제목·근거를 예제 7 범위로 좁히고 검증 안 된 권고 문장 삭제). 줄 번호 대조·'찾히' 0건·공백 인라인 코드 깨짐 0건
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 검토(카드 25, '객체' 검색 9건·순위 '25' 추가 — summary의 "함수 객체", for-let 24/25 링크 2개, class-basics 25/25)
- 전체 검증 (2026-10-30): lint·format:check·typecheck 통과 / `npm test` 2513 통과 / `npm run test:build` 211 통과 / `npm run e2e` 361 passed, 3 skipped. dev 서버(5173) 재시작 후 `/concepts/class-basics` 200
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0. 계획 대비 차이 없음(MDN Public class fields는 ko 404라 en-US). Low 1: static Callout 제목을 계획의 "static 메서드는…"에서 "static으로 만든 것도…"로 바꿈(예제 7이 static 필드로 보이므로)
- 외부 검수 반영(2026-10-30, 변경 이력 ①~④): 비교표 3개 행 수정(꺼낸 메서드의 this는 sloppy 스크립트 기준, 메서드를 new는 function 식 대입 vs 메서드 정의 문법, 상태 숨기기 → #private 필드 사용 가능 여부), 본문 5곳·퀴즈 2개·결과와 이유 1곳·오해 Callout 1곳, 모듈 simplification 구체화, 근거 테스트 3개 추가(객체 리터럴 메서드 new TypeError·열거됨, 바깥 재대입 뒤 안쪽 이름 유지, 'use strict' 스크립트의 생성자 함수 메서드 this). 검증: lint·format:check·typecheck 통과 / `npm test` 2516 / `test:build` 211 / e2e 아래 기록
- e2e (외부 검수 반영 후): 361 passed, 3 skipped
- 외부 검수 2차 반영(2026-10-30, 1건, 실행·명세 확인): private 이름의 SyntaxError 조건을 "생성자 함수 안"에서 "선언한 클래스 본문 밖"(AllPrivateIdentifiersValid)으로 바로잡음 — 본문 1곳, 비교표 칸 문구, 근거 테스트 추가(클래스 본문 안 function 선언은 private 이름 사용 가능). 공통 부품 제목(5번)은 사용자 결정 대기

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 달라진 점: ① 외부 검수 2회(5건·1건)로 비교표 3개 행(꺼낸 메서드의 this는 sloppy 스크립트 기준, 메서드를 new는 메서드 정의 문법의 차이, 상태 숨기기 → #private 필드 사용 가능 여부)과 본문을 고침 ② static 오해 Callout 제목을 "static으로 만든 것도 인스턴스에서 쓸 수 있다"로 바꿈(근거 예제가 static 필드) ③ 근거 테스트 4개 추가 ④ MDN Public class fields는 ko 404라 en-US ⑤ 공통 부품 제목 변경(검수 5번)은 사용자 결정에 따라 별도 커밋으로 분리.

### 코드 리뷰
- critical-code-review: Critical·High 0, Low 1(static Callout 제목 조정). 외부 검수 지적은 모두 실행·명세로 확인 후 반영.

### 후속 작업
- [ ] new-operator simplifications의 "클래스…별도 개념" 문구를 이 페이지 링크로 바꾸기(역방향 연결 일괄 처리 때)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 비교표 칸마다 probe(실행 코드)와 expected를 두고 테스트가 대조 — 표 문구와 실제 동작이 어긋나지 않게 하려는 것. 버린 대안: 표를 본문 JSX에 직접 쓰기(3절 ③)
- [Claude 판단] order 230·category objects — 25장 주제이고 new-operator·prototype-chain과 같은 생성자·프로토타입 주제(3절 ②)
- [Claude 판단] 스크립트 전체가 거부되는 SyntaxError 3가지(let·class 중복, 클래스 밖 #x, 메서드 중복 매개변수)는 예제가 아니라 근거 테스트로 확인
- [무검토 승인] 페이지 축을 "같은 점(typeof·prototype 구조) → 차이 9가지 → 비교표"로 잡고 "문법 설탕일 뿐"을 오해 Callout으로 바로잡음
- 추가 주제 4개(클래스 이름 바인딩·필드와 static·private 필드·메서드는 생성자가 아님)와 비교표 + 퀴즈는 사용자가 골랐다. 외부 검수를 받아 "메서드를 new할 수 없음"을 클래스가 아니라 메서드 정의 문법의 차이로 고쳤다.

#### 배경지식
- 클래스 생성자도 [[Call]]이 있어 typeof는 'function'이지만, [[IsClassConstructor]]가 true라 그 [[Call]]은 TypeError를 던진다.
- ClassDefinitionEvaluation은 MakeConstructor(F, false, proto)로 prototype을 writable false로, ClassElementEvaluation은 메서드를 enumerable false로 정의한다.
- 클래스 안쪽 이름은 CreateImmutableBinding(classBinding, true)로 만든 strict 바인딩이라 대입하면 코드의 모드와 관계없이 TypeError다. 이름 있는 함수 식의 이름은 strict 바인딩이 아니다.
- private 이름은 선언한 클래스 본문 안에서만 유효하다(AllPrivateIdentifiersValid). 함수의 종류와는 관계없다.

#### 확인 질문
1. 클래스를 new 없이 부르면 TypeError인데 typeof는 왜 'function'인가?
   <details><summary>답</summary>typeof는 [[Call]]이 있는지만 본다. 클래스 생성자에도 [[Call]]이 있지만, [[IsClassConstructor]]가 true라서 그 [[Call]]이 TypeError를 던진다(본문 "클래스는 함수 객체", "new 없이 부르면").</details>
2. 클래스 메서드를 new하면 TypeError인 것은 클래스의 특징인가?
   <details><summary>답</summary>아니다. 메서드 정의 문법의 특징이라 객체 리터럴의 `{ make() {} }`도 같다. 반면 메서드가 열거되지 않는 것은 클래스 고유의 차이다(변경 이력 ①, 근거 테스트).</details>
3. 클래스 안에서 자기 이름에 대입하면 TypeError인 이유는 "클래스 본문이 strict라서"가 정확한가?
   <details><summary>답</summary>정확하지 않다. 명세가 클래스 안쪽 이름을 strict 바인딩으로 만들어서, 대입하는 코드의 모드와 관계없이 TypeError다(변경 이력 ②).</details>
4. [Claude 판단] 비교표 칸을 probe로 검증하지 않고 문구만 썼다면 무엇이 깨질 수 있었나?
   <details><summary>답</summary>칸 문구가 실제 동작과 달라도 테스트가 잡지 못한다. 실제로 외부 검수에서 "상태를 숨기는 방법" 행이 두 구문의 차이가 아니라는 지적이 나와 행을 바꿨고, 바꾼 행도 probe로 다시 확인했다(3절, 변경 이력 ③).</details>
5. 클래스 본문 안의 function 선언에서 this.#secret을 쓸 수 있는가?
   <details><summary>답</summary>쓸 수 있다. private 이름은 그것을 선언한 클래스 본문 안에서 유효하고, 함수 종류와는 관계없다. 클래스 본문 밖에서 쓰면 SyntaxError다(외부 검수 2차, 근거 테스트).</details>
