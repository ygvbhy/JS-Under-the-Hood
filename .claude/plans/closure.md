# 클로저 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-29
- 기준: `main` @ `330f9b5`

## 0. 요약

- 목적: 로드맵(13~24장) 10번 `/concepts/closure`를 추가한다. 함수 객체가 만들어질 때의 환경 레코드를 [[Environment]]로 가리키기 때문에, 바깥 함수가 끝나 실행 컨텍스트가 빠져도 그 레코드를 계속 쓸 수 있다는 것(클로저)을 예제 7개, 퀴즈, 시뮬레이터로 보인다. 사용자 결정: 실행 컨텍스트 그림 이어쓰기, 추가 주제 4개(값이 아니라 바인딩, 상태 은닉, 메모리 오해, 함수를 돌려주는 함수), 반복문 var/let은 추가 게시글로 미룸.
- 범위: 새 개념 폴더 1개(category `execution`), e2e·빌드 테스트 추가, content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 20개는 바꾸지 않는다. summary·tags에 '객체'를 넣지 않아 `navigation.spec.ts`는 바꾸지 않는다.
- 위험: 클로저를 "값을 복사·저장해 둔다"거나 "엔진이 이 변수를 메모리에 남긴다"로 설명하는 것 → 명세의 [[Environment]]·환경 레코드·바인딩으로만 설명하고, 메모리 회수는 명세가 정하지 않는다는 근거(9.9.1, 6.2)를 단다. 시뮬레이터의 "남아 있는 레코드"는 구조 테스트(도달 가능성)와 실제 실행 값 대조로 막는다.
- 복잡도: 중간 · Consensus: 생략. 직전 execution-context의 상태 모델·화면·탐침을 그대로 확장(레코드 유지 표시 추가)하고 공통 코드 변경이 없다. 명세 원문과 vm·ESM·CJS 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md:35`) 10번, 『모던 자바스크립트 Deep Dive』 24장. 24장까지 전제한다. 배열(27장)은 쓰지 않는다.
- 핵심
  - ① 함수 객체는 만들어질 때 그 시점의 실행 중 컨텍스트의 LexicalEnvironment를 [[Environment]]로 가진다(함수 선언·함수 식·화살표 함수·메서드 모두).
  - ② 그 함수를 부르면 새 함수 환경 레코드의 [[OuterEnv]]가 [[Environment]]다. 그래서 바깥 함수의 호출이 끝나 그 실행 컨텍스트가 스택에서 빠진 뒤에도, 안쪽 함수 객체가 남아 있으면 바깥 함수의 환경 레코드를 통해 바깥 변수를 찾을 수 있다. 이것을 흔히 클로저라고 부른다(명세에는 이 의미의 '클로저' 항목이 따로 없고, 명세의 Abstract Closure는 다른 개념이다).
  - ③ 바깥 함수를 부를 때마다 새 환경 레코드가 만들어지므로 두 카운터는 독립이다.
  - ④ 같은 호출에서 만들어진 함수들은 같은 환경 레코드를 [[Environment]]로 가리켜 바인딩을 공유한다.
- 사용자 결정(2026-10-29)
  - ⑤ 시각화: execution-context 그림(스택 + 환경 레코드 + 함수 객체의 [[Environment]] + 찾기 경로)을 이어 쓰고, 실행 컨텍스트가 가리키지 않아도 함수 객체가 가리키는 레코드를 "남아 있음"으로 표시한다.
  - ⑥ 값이 아니라 바인딩을 붙잡는다: 함수를 만든 뒤 바깥 변수를 바꾸면 함수도 바뀐 값을 읽는다.
  - ⑦ 상태 은닉과 캡슐화: 바깥에서 직접 바꿀 수 없는 변수를 함수로만 다룬다(객체 프로퍼티와 다름).
  - ⑧ 메모리에 대한 오해: 명세 모델은 레코드를 가리킨다고 설명할 뿐, 엔진이 실제로 무엇을 언제 회수하는지는 명세가 보장하지 않는다(9.9.1)·환경 레코드는 구현의 실체와 대응할 필요가 없는 명세 장치다(6.2). 엔진별 최적화는 단정하지 않는다.
  - ⑨ 함수를 돌려주는 함수: `makeAdder(amount)` — 매개변수도 함수 환경 레코드의 바인딩이라 함께 남는다.
  - ⑩ 반복문에서 클로저(var/let): 추가 게시글 "for 문의 let"으로 미루고 이 페이지는 별도 개념으로만 언급.

### 유지해야 하는 기존 동작

- 기존 개념 20개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일은 수정하지 않는다.
- 홈 `객체` 검색 6건·첫 카드 '원시 값과 객체'(`tests/e2e/navigation.spec.ts:17`, `:32`) 유지 — summary·tags에 '객체'(예: '함수 객체')를 쓰지 않는다. 제목 '클로저: …'는 한글 정렬상 '원시 값과 객체' 뒤로 간다(`localeCompare(…, 'ko')`로 확인함).
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위

- 반복문 안 클로저(var/let, CreatePerIterationEnvironment) — 추가 게시글 후보
- 즉시 실행 함수·모듈 패턴 — 추가 게시글 후보
- 클래스의 private(`#`) 필드, 제너레이터·async, 타이머·이벤트 콜백(호스트 API)
- 엔진의 실제 메모리 구조·최적화(어떤 변수만 남기는지 등)

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현: `app/concepts/execution-context/`(상태 모델 `scenarios.ts` 머리 주석 — 컨텍스트·레코드·함수 객체·찾기 경로, 도달 가능성으로 레코드를 빼는 규칙, `ExecView.tsx`, 탐침 `concept.test.ts`). 그 페이지 단순화 ④가 "함수 객체가 그 레코드를 계속 가리키면 남는데, 클로저 개념에서 다룬다"고 이 페이지로 미뤘다(`app/concepts/execution-context/meta.ts`).
- 메타·검색: category `execution`은 '실행 모델'(`app/lib/concepts.ts:25`), 현재 5개. 검색은 title·summary·tags(`app/lib/concepts.ts:54`).
- 명세 원문(tc39.es/ecma262 현재 초안 사본 2026-10-28)
  - 10.2 ECMAScript Function Objects(`sec-ecmascript-function-objects`): "ECMAScript function objects encapsulate parameterized ECMAScript code closed over a lexical environment".
  - OrdinaryFunctionCreate(`sec-ordinaryfunctioncreate`): `func.[[Environment]]`을 인수로 받은 환경 레코드로 설정.
  - InstantiateOrdinaryFunctionExpression(`sec-runtime-semantics-instantiateordinaryfunctionexpression`)·InstantiateArrowFunctionExpression(`sec-runtime-semantics-instantiatearrowfunctionexpression`)·DefineMethod(`sec-runtime-semantics-definemethod`): 환경 = 실행 중 컨텍스트의 LexicalEnvironment. 단 이름 있는 함수 식은 `funcEnv = NewDeclarativeEnvironment(LexicalEnvironment)`에 자기 이름을 바꿀 수 없는 바인딩으로 만들고 `funcEnv`를 [[Environment]]로 삼는다(콘텐츠 검토 1차에서 바로잡음). 함수 선언은 FunctionDeclarationInstantiation이 sloppy 함수의 LexicalEnvironment 레코드로 InstantiateFunctionObject(`sec-runtime-semantics-instantiateordinaryfunctionobject`, execution-context 계획 2절).
  - NewFunctionEnvironment(`sec-newfunctionenvironment`): [[OuterEnv]] = 함수의 [[Environment]]. GetIdentifierReference(`sec-getidentifierreference`).
  - 6.2 ECMAScript Specification Types(`sec-ecmascript-specification-types`): "Specification type values are specification artefacts that do not necessarily correspond to any specific entity within an ECMAScript implementation."
  - 9.9.1 Objectives(`sec-weakref-processing-model`): "This specification does not make any guarantees that any object or symbol will be garbage collected."
  - 6.2.8 Abstract Closure: 알고리즘 단계와 값을 묶는 명세 내부 타입(이 페이지의 클로저와 다른 개념).
- 예제 초안 실제 출력(scratchpad `closure-draft/`, vm은 `runExample`과 같은 방식, `.mjs`·`.cjs`는 파일로 직접 실행 — 모두 같음)

  | # | 파일 | 출력 |
  | - | - | - |
  | 1 | `counter.js` | `1` / `2` / `undefined` |
  | 2 | `independent.js` | `1` / `2` / `1` |
  | 3 | `shared-env.js` | `2` |
  | 4 | `binding-not-value.js` | `Hi, Lee` |
  | 5 | `make-adder.js` | `3` / `11` / `7` |
  | 6 | `private-state.js` | `150` / `undefined` / `150` |
  | 7 | `nested.js` | `ab` |

- 본문 근거로 쓸 vm 실행 결과(2026-10-29)
  - 같은 함수를 두 번 부르면 돌려받는 안쪽 함수 객체는 서로 다르다(`!==`)
  - 같은 호출에서 나온 두 메서드가 같은 바인딩을 공유한다(inc 뒤 get이 1)
  - 반환한 뒤 setter로 바꾼 값을 getter가 읽는다(5)
  - 전역 함수도 정의 뒤에 바뀐 전역 `let`의 값을 읽는다(2)
  - 매개변수 바인딩도 남고(`mk(7)()` → 7), 함수를 만든 뒤 매개변수를 바꾸면 바뀐 값을 읽는다(9)
- MDN ko 200·ko 경로 유지: `Web/JavaScript/Guide/Closures`, `Glossary/Closure`, `Web/JavaScript/Reference/Functions`, `Web/JavaScript/Guide/Functions`

### 추정

- 예제 이름(`makeCounter`, `increment`, `next`, `first`, `second`, `counter`, `makeGreeter`, `greet`, `name`, `makeAdder`, `add2`, `add10`, `createAccount`, `account`, `outer`, `middle`, `inner`)이 Chromium에서 `in window`가 아니다 — `name`은 `window.name`이 있으므로 예제에서 함수 안 지역 변수로만 쓰는지 확인하고, 6단계 브라우저 확인에서 전역 이름만 검사한다(`counter.js`의 `next`, `first`·`second` 등).

## 3. 구현 전략

- execution-context의 상태 모델·화면을 개념 폴더 안에서 복사해 확장한다(시뮬레이터 규칙: 상태·시각화는 개념마다). 공통 코드는 쓰지 않는다.
  - slug `closure`, category `execution`
  - 제목 `'클로저: 함수가 끝나도 바깥 변수가 남는 이유'`
  - 시뮬레이터 label `'클로저 시뮬레이터'`
  - related: `['execution-context', 'scope-chain']`
- 상태(`ClosureState`) — execution-context `ExecState`에서
  - `EnvRecord`에 `retained?: true`: 어떤 실행 컨텍스트도(그 LexicalEnvironment·VariableEnvironment의 바깥 연결로도) 가리키지 않지만, 남아 있는 함수 객체의 [[Environment]]에서 바깥 연결로 이어져 남은 레코드. 화면에 "실행 컨텍스트 없이 남음: 함수 X가 가리킴".
  - `FnObject`: `{ id; label; environmentId; heldBy: string }` — `heldBy`는 그 함수 객체를 가리키는 곳(예: `'변수 next'`, `'counter의 increment 메서드'`, `'makeCounter 함수 환경 레코드의 increment'`). 익명 함수는 label로 구분(예: `'익명 함수(first)'`).
  - 그림에서 빼는 기준(단순화 ①): 실행 컨텍스트에서도, 남아 있는 함수 객체에서도 이어지지 않는 레코드와 함수 객체. 함수 객체가 남는 기준은 전역 바인딩·남은 레코드의 바인딩·전역 변수가 가리키는 객체의 메서드에서 이어질 때.
  - this 바인딩은 이 페이지에서 그리지 않는다(단순화).
- 화면(`ClosureView`): `ExecView` 구성(스택 / 환경 레코드 / 함수 객체 / 찾기)을 따르고, 레코드 카드에 "남아 있음" 배지와 이유, 함수 객체에 "가리키는 곳". 색만으로 구분하지 않는다. `overflow-wrap:anywhere` 금지(this-binding 교훈).
- 시나리오 4개(줄·호출·반환마다 1단계, 실행 전 0단계, 전역 선언 처리 1단계)
  - `counter`(예제 1): `makeCounter()` push(함수 레코드에 increment, 선언적 레코드에 count 초기화 전, increment.[[Environment]] = makeCounter 선언적) → count = 0 → `return increment` 후 pop + `next` 초기화: makeCounter 레코드 둘이 "남아 있음"(increment가 가리킴) → `next()` push(increment 함수 레코드 바깥 = makeCounter 선언적) → `count += 1` 찾기 경로 increment 선언적 → increment 함수 → makeCounter 선언적(찾음) 0→1 → 반환 pop·출력 1 → 다시 `next()` → 1→2 → 출력 2 → `typeof count`(전역에서 못 찾음) `'undefined'`
  - `independent`(예제 2): `makeCounter()` 두 번 → 레코드 세트 두 개(각각 count), `first()` 두 번은 첫 세트만 바뀌고 `second()`는 둘째 세트 0→1
  - `shared`(예제 3): 객체 리터럴의 두 메서드가 같은 makeCounter 선언적 레코드를 [[Environment]]로 가리킴 → `counter.increment()` 두 번 → `counter.get()`이 같은 count 2를 읽음
  - `binding`(예제 4): 화살표 함수 greet를 만든 뒤 `name = 'Lee'`로 바인딩 값을 바꿈 → 반환 → `greet()`가 'Lee'를 읽음
  - 나머지 예제(5·6·7)는 예제·퀴즈·본문으로.
- 정확성 검증
  - (a) 공통 불변식
  - (b) 구조: execution-context 구조 테스트를 가져오되 도달 가능성 규칙을 바꾼다 — 레코드는 (컨텍스트에서 바깥 연결로 이어짐) 또는 (남은 함수 객체의 [[Environment]]에서 바깥 연결로 이어짐)일 때만 있고, 후자만이면 `retained`; 함수 객체는 `heldBy`가 가리키는 곳이 남아 있을 때만 있다; 함수 레코드 바깥 = 그 함수 객체의 [[Environment]]; 찾기 경로 규칙; 같은 호출에서 만든 함수들의 `environmentId`가 같고(shared), 다른 호출이면 다르다(independent).
  - (c) 탐침 대조: 단계 줄 뒤(반환 줄은 앞)에 스냅샷을 끼워 실행 중 컨텍스트에서 보이는 바인딩의 값·초기화 전이 vm 실제 값과 같다(남은 레코드의 값은 그 레코드를 쓰는 다음 호출 단계에서 대조); 스택(`__stack`)이 실제 호출 순서와 같다; `lookup.result`가 그 줄에서 실제로 읽은 값과 같다. 탐침 버전 출력 = 원본 출력.
  - (d) 음성 확인: `counter`에서 반환 뒤 makeCounter 레코드를 빼면 실패, `independent`에서 두 함수의 [[Environment]]를 같은 레코드로 그리면 실패, `binding`에서 greet가 'Kim'을 읽는 것으로 그리면 실패해야 한다.
- 버린 대안
  - ① 단순한 환경 카드: 사용자 결정으로 실행 컨텍스트 그림을 이어 쓴다.
  - ② 반복문 클로저 포함: 추가 게시글로(사용자 결정).
  - ③ execution-context의 `ExecView`를 import해 재사용: 개념 간 공유 부품은 `app/simulator/`뿐이라는 규칙(AGENTS.md 시뮬레이터 규칙) → 개념 폴더에 복사해 확장한다.

## 4. 변경 파일

- 추가 `app/concepts/closure/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 7개(2절 표)
  - `scenarios.ts`, `ClosureView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정
  - `tests/e2e/helpers.ts`: `CLOSURE_PATH`, `CLOSURE_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: execution-context 케이스를 본떠 추가만
  - `docs/content-guide.md:164`: e2e 목록에 `closure`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 10번 행·진행 기록(13~24장 로드맵 완료)
- 변경하지 않음: 공통 코드, `package.json`, `AGENTS.md`, `tests/e2e/navigation.spec.ts`, 기존 개념 폴더 20개

## 5. 위험 요소

- "값을 복사해 둔다" 설명 → 예제 4(만든 뒤 바꾼 값을 읽음)와 "바인딩을 가리킨다"로만 설명, 시나리오 설명 금지어 검사("복사").
- 메모리 단정 → 명세가 회수를 보장하지 않고 환경 레코드는 명세 장치라는 근거만 쓰고, 엔진 최적화(쓰지 않는 변수를 남기지 않는 등)는 쓰지 않는다.
- "남아 있음" 표시가 틀림(빼야 할 레코드를 남기거나 그 반대) → 도달 가능성 구조 테스트와 음성 확인.
- 독립·공유 혼동 → `environmentId` 같음/다름 구조 테스트, 탐침으로 실제 값 대조.
- 화면 복잡도(independent는 레코드 세트 두 개) 375px → 한 열, e2e 가로 스크롤, 브라우저 확인.
- 23·24장을 넘는 내용(모듈 패턴·반복문) → 별도 개념.
- 탐침이 흐름을 바꿈 → 기록만, 탐침 버전 출력 = 원본 출력.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성: 예제 7개 출력, 본문 주장 근거 테스트(2절 vm 목록), `.mjs`·`.cjs` 결과, 시나리오 (a)~(d), 퀴즈 정답 = expectedOutput·위치 분산
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. "검토 중" 배지, 분류 '실행 모델', 퀴즈 라디오 UI
  2. `counter`: makeCounter 반환 뒤 스택은 전역만인데 makeCounter 레코드 둘이 "남아 있음(increment가 가리킴)", `count += 1` 찾기 경로가 makeCounter 선언적 레코드에서 찾음
  3. `independent`: 레코드 세트 두 개, `second()` 단계에서 둘째 세트의 count만 1
  4. `shared`: 두 메서드의 [[Environment]]가 같은 레코드, `get()` 결과 2
  5. `binding`: `greet()` 찾기 결과 'Lee'
  6. 375px·다크: 가로 넘침 0, 키보드 ←/→/Home, 콘솔 에러 0
  7. 홈: '실행 모델' 그룹 카드 6개, 전체 카드 21개, `객체` 검색 6건(변화 없음), `클로저` 검색 1건 이상
  8. 예제 전역 이름 `in window` 없음

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `examples/*.js`(7개), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장), 자리표시 `content.mdx`
- 변경
  - 예제 7개는 scratchpad 초안(`closure-draft/*.js`, `run.cjs` 제외)과 같은 원문(`cp` 후 `cmp`)
  - `meta.ts`
    - slug, title, category, related는 3절대로
    - summary(160자 이하, '객체' 없음): 함수는 만들어질 때의 환경을 기억하고, 바깥 함수가 끝나도 그 환경의 변수를 계속 읽고 바꾼다, 호출마다 새 환경, 같은 호출의 함수들은 공유
    - tags('객체' 없음): `클로저`, `closure`, `[[Environment]]`, `환경 레코드`, `실행 컨텍스트`, `렉시컬 스코프`, `상태 은닉`, `캡슐화`, `카운터`, `고차 함수`
    - goals 4개: 바깥 함수가 끝난 뒤에도 안쪽 함수가 바깥 변수를 쓰는 이유를 [[Environment]]와 환경 레코드로 설명 / 호출마다 새 환경(독립)과 같은 호출의 함수들(공유) 예측 / 값이 아니라 바인딩을 가리킨다는 것으로 결과 예측 / 상태 은닉 활용과 메모리에 대해 명세가 말하는 것과 말하지 않는 것 구분
    - prerequisites: `execution-context`, `scope-chain`, `function-calls`, `primitives-and-objects`
    - examples 7개(2절 출력), `reviewedAt: null`
  - 단순화
    - ① 시뮬레이터는 실행 컨텍스트에서도, 남아 있는 함수가 가리키는 레코드에서도 이어지지 않는 환경 레코드를 그림에서 뺍니다. 명세는 메모리가 언제 회수되는지 보장하지 않고, 환경 레코드는 엔진 안의 특정 구조와 대응할 필요가 없는 명세의 장치입니다. 엔진이 실제로 무엇을 메모리에 남기는지는 구현마다 다를 수 있습니다.
    - ② 실행 컨텍스트 그림의 단순화(구성 요소 일부만, sloppy 함수의 레코드 둘, 컨텍스트 push와 선언 처리를 한 단계로)를 그대로 따릅니다. this 바인딩은 이 페이지에서 그리지 않습니다.
    - ③ 함수가 남는 기준은 변수·남아 있는 레코드의 바인딩·변수가 가리키는 객체의 메서드에서 이어지는지로 단순화했습니다. 객체 자체와 그 다른 프로퍼티는 그리지 않습니다.
    - ④ 반복문 안에서 만든 클로저(var와 let의 차이)는 별도 개념입니다.
    - ⑤ 즉시 실행 함수와 모듈 패턴, 클래스의 private 필드는 다루지 않습니다.
    - ⑥ console.log를 부를 때 만들어지는 실행 컨텍스트는 생략합니다.
  - references: 2절 앵커(ECMAScript Function Objects, OrdinaryFunctionCreate, InstantiateOrdinaryFunctionExpression, InstantiateArrowFunctionExpression, DefineMethod, InstantiateOrdinaryFunctionObject, NewFunctionEnvironment, GetIdentifierReference, ECMAScript Specification Types, WeakRef 처리 모델) — 절 번호는 라벨에 쓰지 않는다 — 와 2절의 MDN ko 4개
  - `concept.test.ts` 본문 주장: 2절 vm 목록 전부, `.mjs`·`.cjs`가 vm과 같다
- 주의사항: `console.log`에는 원시 값만. 예제는 포맷 제외 경로. vm 판정은 컨텍스트 안에서.
- 완료 조건: `npm test` L1 7개와 본문 주장 테스트 통과, lint·format·typecheck 통과, summary 160자 이하·'객체' 없음, tags에 '객체' 없음

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오)
- 변경: 3절 상태 모델과 시나리오 4개(execution-context `scenarios.ts`의 헬퍼·주석 구조를 복사해 확장). 단계 수 고정. 테스트 3절 (a)~(c)
- 주의사항: 설명은 명세 순서와 맞추고 "복사"·"사라진다" 금지, 남는 이유는 "함수 X가 [[Environment]]로 가리켜서". 메모리 회수를 단정하지 않는다.
- 완료 조건: 이 개념 테스트 통과, 음성 확인 3건(3절 (d))을 서브에이전트가 실행·원복, 메인이 한 건 재확인

### 3. 시각화 `ClosureView`

- 대상: `ClosureView.tsx`, `ClosureView.test.tsx`
- 변경: execution-context `ExecView`를 복사해 "남아 있음" 배지·이유, 함수 객체의 "가리키는 곳" 추가, this 표시 제거
- 주의사항: effect·window 없음, 색만으로 구분하지 않음, 375px 한 열, `overflow-wrap:anywhere` 없음
- 완료 조건: 테스트 통과(ExecView 테스트 항목 + 남아 있음 배지·이유, 가리키는 곳, 같은 레코드를 가리키는 두 함수, 레코드 세트 두 개), typecheck 통과

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="클로저 시뮬레이터"`, 다른 래퍼와 같은 형태
- 완료 조건: 테스트 4개(첫 화면, `counter`의 반환 뒤 "남아 있음" 단계 문구, 시나리오 전환, 마지막 콘솔)

### 5. 본문 content.mdx

- `## 동작 원리` h3
  - 함수 객체는 만들어진 곳의 환경을 가리킨다([[Environment]], execution-context 연결)
  - 바깥 함수가 끝나도 남는 레코드(예제 1)
  - 클로저라는 이름(MDN 정의, 명세에는 이 의미의 항목이 없음·Abstract Closure와 다름, 모든 함수가 [[Environment]]를 가짐)
  - 호출마다 새 환경(예제 2)
  - 같은 호출의 함수들은 환경을 공유(예제 3)
  - 값이 아니라 바인딩(예제 4, 반환 뒤 setter 한 줄)
  - 함수를 돌려주는 함수(예제 5, 매개변수도 바인딩)
  - 상태 은닉과 캡슐화(예제 6, 객체 프로퍼티와 다름)
  - 여러 겹의 클로저(예제 7, 바깥 연결이 이어짐)
  - 메모리에 대한 오해(명세가 말하는 것과 말하지 않는 것)
  - 반복문 안 클로저는 별도 개념(한 줄)
- `## 예제`: 예제 1~7, PredictQuiz(정답 위치 분산), `### 시뮬레이터로 확인하기`
- `## 결과와 이유`: 예제별 설명, 오해 Callout ① 함수가 끝나면 그 지역 변수는 항상 사라진다 ② 클로저는 만들 때의 값을 복사해 저장한다 ③ 같은 함수로 만든 클로저들은 변수를 공유한다(→ 호출마다 새 환경) ④ 클로저는 특별한 문법으로 만든다(→ 모든 함수가 [[Environment]]를 가지며, 바깥 레코드가 남는 상황을 흔히 클로저라 함) ⑤ 클로저를 쓰면 바깥 함수의 변수가 모두 메모리에 남는다고 명세가 정한다(→ 명세는 회수를 보장하지 않고 엔진 구현의 몫)
- 링크: execution-context, scope-chain, function-calls, primitives-and-objects, block-scope(반복문 언급 시 별도 개념)
- 주의사항: 2절 사실만, 엔진 최적화 단정 금지, 오류 메시지 인용 없음, JSX 안 인라인 code 줄바꿈 주의
- 완료 조건: 메인 대조, `npm test`·build 성공, HTML `<details` 7·`**` 0·깨진 code 0, 퀴즈 정답 = expectedOutput

### 6. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: execution-context 케이스를 본떠 추가만(`counter`의 "남아 있음" 단계 e2e 1개 포함), content-guide 목록·로드맵(10번 완료, 13~24장 로드맵 완료 기록)
- 완료 조건: 전체 검증 통과, 6절 브라우저 시나리오 1~8

## 9. 추가 개선 후보

- 추가 게시글 후보(로드맵에 있음, 이 개념 뒤 제안): "전역 객체", "for 문의 let: 반복마다 새 바인딩", "전역 변수를 줄이는 방법: 즉시 실행 함수·모듈 패턴".
- 기존 개념 역방향 연결(사용자 결정: 나중에 따로): execution-context 단순화 ④의 "클로저 개념" 문구 등.

## 변경 이력

- 2026-10-30 (외부 콘텐츠 검토 1차, 사용자 전달): 예제 4의 전역 변수 `greet` → `sayHi`(안쪽 `greet`와 이름 겹침 제거), 본문 표현 7건 수정 — 영향: 예제 4·binding 시나리오·근거 테스트, content.mdx, meta.ts
- 2026-10-30 (외부 콘텐츠 검토 2차, 사용자 전달): strict 함수의 레코드 조건을 "매개변수 기본값이 없으면" → "매개변수 목록에 기본값 같은 식이 없으면" — 영향: content.mdx 1문장

## 구현 진행

- baseline (2026-10-29, `330f9b5`): lint 0 / format 통과 / typecheck 0 / test 2099 통과. test:build 154·e2e는 직전 커밋 검증 결과 사용
- [x] 1. 예제·meta·route와 본문 주장 근거 테스트 — 예제 7개 초안과 `cmp` 동일, summary 105자('객체' 없음, tags도 없음), 명세 앵커 10개 사본에서 확인(라벨에 절 번호 없음), test 2142(+43: 개념 테스트 26 — 본문 주장 5·L1 7·`.cjs` 7·`.mjs` 7, 공통 examples·무결성 17), lint·format·typecheck 통과
- [x] 2. 시나리오와 대조 테스트 — 단계 수 counter 14·independent 20·shared 16·binding 10, test 2215(+73), 음성 확인 3건 서브에이전트 실행·원복, 메인이 `retained` 표시를 모두 없애 재확인(도달 가능성 테스트 4개 실패 → 원복 `cmp` 동일). 판단: `count += 1`을 "이름 찾기"와 "값이 바뀜" 두 단계로 나눔(읽은 값과 바뀐 값이 한 상태에서 어긋나지 않게), 함수가 실행 중이면 그 컨텍스트의 바깥 연결로 닿으므로 "남아 있음"을 해제하고 끝나면 다시 표시, 못 찾는 이름은 `lookup.foundIn: null`, 탐침은 같은 줄의 n번째 실행을 기록. 메인 수정: 설명 문구 2곳("호출의 레코드" → "익명 함수 호출의 레코드")
- [x] 3. 시각화 `ClosureView` — execution-context `ExecView`를 복사해 this 행 제거, "남아 있음" 배지·이유(상태에서 가리키는 함수를 다시 계산), 함수 객체의 "가리키는 곳", 못 찾음 표시 추가. 테스트 18개. 메인 수정: 이유 문구 "increment, get가 가리킴"(조사 어색) → "실행 컨텍스트 없이 남음 · 가리키는 함수: increment, get"(ClosureView·테스트)
- [x] 4. 래퍼 `Simulator` — 테스트 4개(첫 화면, counter 반환 단계의 남아 있음, 시나리오 전환, 마지막 콘솔). 개념 폴더 테스트 121, lint·typecheck 통과
- [x] 5. 본문 content.mdx — 메인 대조 후 직접 수정: 예제 7의 레코드를 "호출 레코드"에서 선언적 환경 레코드(LexicalEnvironment 쪽)로 정확히 쓰고 찾기 순서(b → a) 정리(동작 원리·결과와 이유), 독자에게 어색한 "테스트로 확인했습니다" 문장 2개 삭제, 문장 다듬기 1곳. 근거 테스트 1개 추가(바인딩과 같은 이름의 프로퍼티 대입은 객체에 새 프로퍼티를 만들 뿐). 빌드 HTML `<details` 7·`**` 0, 퀴즈 정답 = expectedOutput(정답 위치 0~3 분산)
- [x] 6. e2e·빌드 테스트·문서 — `helpers.ts` 상수, a11y 3개·responsive 2개·build 3개, content-guide 목록, 로드맵 10행. 첫 e2e에서 새 테스트 4건 실패(서브에이전트가 단계 제목을 "counter 초기화"로 추정, 실제는 "next 초기화") → 제목 수정, "남아 있음" 확인은 설명문이 아니라 배지를 잡도록 `exact: true`. 전체: lint·format·typecheck 통과, test 2238, test:build 161, e2e 305 통과(skip 3 기존), `navigation.spec.ts` 변경 없음
  - 브라우저(serve 4175, Playwright, 데스크톱 라이트·375px 다크): ① 검토 중 배지·분류 '실행 모델'·퀴즈 버튼 7 ② `counter` 반환 단계 스택은 전역만, makeCounter 레코드 둘 "남아 있음 · 가리키는 함수: increment", increment는 "가리키는 곳: 변수 next" ③ `counter` count 찾기 경로 increment 선언적 → increment 함수 → makeCounter 선언적(0), 마지막 typeof count 찾지 못함 'undefined' ④ `independent` 레코드 세트 둘(1번째 호출 count 2, 2번째 호출 count 1) ⑤ `shared` 두 메서드의 [[Environment]] 같음 ⑥ `binding` 결과 'Lee' ⑦ 네 시나리오 끝까지 가로 넘침 0, 키보드 →·Home, 콘솔 에러 0 ⑧ 홈 카드 21·'실행 모델' 6·`객체` 6건(첫 카드 '원시 값과 객체')·`클로저` 1건, 예제 전역 이름 `in window` 없음
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 없음. Low 2(보고만): ① 함수가 실행 중이면 그 레코드가 컨텍스트로 닿아 "남아 있음" 배지가 잠시 꺼졌다 켜짐(정의상 맞지만 처음 보는 사람은 헷갈릴 수 있음, 단계 설명에 이유를 적음) ② 탐침이 함수 본문을 `try`로 감싸 내부 선언이 블록 레코드에 들어감(관찰 값은 같음, execution-context와 같은 방식)
- [x] 7. 콘텐츠 검토 1차 반영(2026-10-29, 사용자 승인: 지적 1~7 전부) — baseline lint 0·format 통과·typecheck 0·test 2238 → 반영 후 lint·format·typecheck 통과, test 2240(+2: 프로토타입 체인 없음, 이름 있는 함수 식의 이름 바인딩), test:build 161, e2e 305 통과(skip 3 기존), 빌드 HTML `<details` 7·`**` 0·setter·getter·"호출 레코드" 0·깨진 code 0, 퀴즈 선택지·정답 변경 없음(= expectedOutput), `nested.js` 출력 `ab` 그대로
  - 대상: `examples/nested.js`, `content.mdx`, `meta.ts`(단순화 1개 추가), `concept.test.ts`(본문 주장 근거), 이 계획 문서 2절
  - 변경
    - ① 이름 있는 함수 식: `nested.js`의 `function middle()`·`function inner()`를 이름 없는 함수 식으로(줄·출력 그대로), 동작 원리의 "함수 식"을 "이름 없는 함수 식"으로, 이름 있는 함수 식의 이름 레코드는 단순화에 "다루지 않음"으로, 근거 테스트 추가
    - ② 예제 7 퀴즈 해설의 "호출 레코드"를 선언적·함수 환경 레코드로 정확히
    - ③ "네 번째 시나리오" 문장을 예제 4 설명 바로 뒤로, 반환 뒤 변경은 예제 6을 가리킴
    - ④ setter·getter → "바꾸는 함수·읽는 함수"(접근자 프로퍼티와 혼동 방지)
    - ⑤ 클로저 정의를 MDN 정의(함수 + 만들어진 환경, 코드로 작성한 모든 함수)로 통일, Callout ④ 맞춤
    - ⑥ `account.balance`: 객체와 프로토타입 체인 어디에도 없어서 `undefined`(본문·결과와 이유·퀴즈), 근거 테스트
    - ⑦ 예제 5: 함수 식의 [[Environment]]는 각 호출의 선언적 환경 레코드, 그 바깥이 `amount`가 있는 함수 환경 레코드(본문·퀴즈)
  - 완료 조건: lint·format·typecheck 새 실패 0, `npm test` 통과(근거 테스트 포함), `test:build` 통과, 빌드 HTML에 "setter"·"getter"·"호출 레코드" 없음, `<details` 7, 깨진 인라인 code 0, 퀴즈 정답 = expectedOutput
  - 리뷰(critical-code-review, 메인 직접): High 1 — ⑤에서 처음 쓴 "모든 함수가 클로저"가 내장 함수(`[[Environment]]` 없음)까지 포함하는 과잉 일반화 → "코드로 작성한 모든 함수"로 수정(본문·Callout ④), 재검증 통과(위 수치). Medium·Low 없음
- 외부 검토 1차(8건, 2026-10-30) 반영 — 모두 명세·실행으로 확인 후 수용
  - ① 메모리 절: 명세 Conformance 절(구현은 명세의 의미를 모두 지원해야 함)을 근거로 "안쪽 함수가 읽고 쓰는 바인딩은 어느 구현에서든 명세대로 동작, 구현마다 다른 것은 쓰지 않는 바인딩의 처리·실제 구조·회수 시점" 추가(본문·Callout ⑤·simplifications 1), references에 Conformance 추가
  - ② 함수 선언: FunctionDeclarationInstantiation이 strict·sloppy 모두 `lexicalEnv`로 InstantiateFunctionObject 호출함을 로컬 명세로 확인 → "sloppy mode의" 한정 제거, "함수 본문 최상위", strict는 (기본값 없으면) 같은 레코드로 수정
  - ③ 예제 1·2·결과 절에 선언적 환경 레코드 명시, 예제 7은 inner 호출 자신의 빈 레코드 두 개에서 출발하도록 수정
  - ④ 학습 목표 3·도입부: "만들 때의 값이 아니라 바인딩이 있는 (환경) 레코드를 가리킨다" (검토 제안의 "복사본"은 AGENTS 원칙상 쓰지 않음)
  - ⑤ 퀴즈 선택지는 정답 = expectedOutput 규칙 때문에 유지하고, 예제 1·6 해설에 문자열 'undefined'와 값 undefined 구분 추가
  - ⑥ "닫힌" → "묶인(closed over)" + 내부 슬롯 표 "[[Environment]]: …the function was closed over" 근거 문장
  - ⑦ 소제목 "매개변수도 바인딩이다", 예제 5 제목 "매개변수가 남는 함수"
  - ⑧ 예제 4 전역 변수 `sayHi`(Sonnet): 예제 파일 7·8번 줄, binding 시나리오 전역 바인딩·가리키는 쪽 표시·설명문, 근거 테스트 holders. 줄 수·출력 불변
  - 검증(메인 새 실행): lint·format·typecheck 통과, `npm test` 2240(7단계와 같은 수. 참고 링크는 무결성 테스트 한 개 안에서 반복 검사되어 테스트 수가 늘지 않음), `test:build` 161, e2e 305 통과(skip 3 기존). 빌드 HTML `<details` 7, "닫힌" 0, `**` 0
- 외부 검토 2차(1건, 2026-10-30) 반영: FunctionDeclarationInstantiation의 분리 조건은 `hasParamExprs`(ContainsExpression of formals)이고, 구조 분해의 계산된 키(BindingProperty의 IsComputedPropertyKey)도 포함함을 로컬 명세(2026-10-28 초안)로 확인 → 수정안 (a) 채택. (b)는 함수 호출 페이지가 이 내용을 다루지 않아(그 페이지 simplifications) 쓰지 않음
  - 같은 좁은 표현이 커밋된 execution-context(`content.mdx:58`, `meta.ts:98` "기본값이 있으면 레코드가 하나 더")에도 있음 — 범위 밖이라 보고만
- 사용자 요청(2026-10-30): execution-context의 같은 표현 2곳(`content.mdx:58`, `meta.ts:98`)을 "매개변수 목록에 기본값 같은 식이 있으면"으로 수정(별도 fix 커밋, `reviewedAt` 그대로). `npm test` 2240 통과

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 예제 7개, 퀴즈 7, misconception 5, 클로저 시뮬레이터(시나리오 4개: 14·20·16·10단계). 공통 코드와 `navigation.spec.ts`는 바꾸지 않았다.
- 계획과 달라진 점
  - `count += 1`은 "이름 찾기"와 "값이 바뀜" 두 단계로 나눴다. 함수가 실행 중이면 그 레코드는 컨텍스트로 닿으므로 "남아 있음"을 해제했다가 끝나면 다시 표시한다.
  - 본문은 콘텐츠 검토 1회(7건)와 외부 검토 2회(8건·1건)로 다듬었다. 예제 7은 이름 없는 함수 식으로 바꿨고, 예제 4의 전역 변수는 `sayHi`로 바꿨다(줄 수·출력 그대로). 단순화 7개, 참고 자료 15개(Conformance 추가). 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- 1차 Critical/High 0, Low 2(실행 중 "남아 있음" 배지가 잠시 꺼짐, 탐침의 `try` 감싸기)는 보고만 하고 남겼다. 콘텐츠 검토 반영 리뷰의 High 1("모든 함수가 클로저" 과잉 일반화)은 "코드로 작성한 모든 함수"로 수정했다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록
- [ ] (사용자 결정: 나중에 따로) 기존 개념 역방향 연결 — execution-context 단순화의 "클로저 개념" 문구 등
- [ ] 추가 게시글 후보 "전역 객체", "for 문의 let: 반복마다 새 바인딩", "즉시 실행 함수·모듈 패턴" 제안
- [ ] (사용자 요청 2026-10-30) 읽는 순서를 화면에 보여 주기 — 별도 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] "남아 있음"의 기준을 실행 컨텍스트에서는 닿지 않지만 남아 있는 함수 객체의 `[[Environment]]`에서 이어지는 레코드로 정했고, 테스트가 상태에서 도달 가능성을 다시 계산해 시나리오에 손으로 적은 표시와 대조한다 — 표시를 계산해서 넣으면 규칙이 틀려도 테스트가 함께 통과한다. 함수가 남는 기준(변수·남은 레코드의 바인딩·변수가 가리키는 객체의 메서드)은 단순화에 밝혔다.
- [Claude 판단] 메모리 절은 명세 근거(GC를 보장하지 않음, 명세 타입은 구현의 특정 실체와 대응할 필요 없음, Conformance)만 쓰고 엔진이 실제로 무엇을 남기는지는 단정하지 않았다 — 엔진 최적화는 명세가 정하지 않는 구현 세부라 사실처럼 쓸 수 없다.
- [Claude 판단] 외부 검토의 "선택지를 'undefined'로" 제안 대신 해설에 문자열과 값의 차이를 적었다 — 퀴즈 정답은 실제 출력(expectedOutput)을 ' / '로 이은 것이어야 하고, console.log는 문자열을 따옴표 없이 출력한다.
- [Claude 판단] strict 함수의 레코드 조건은 외부 검토 2차의 (a)안("매개변수 목록에 기본값 같은 식이 없으면")을 골랐다 — (b)안이 넘기려던 함수 호출 페이지는 이 내용을 다루지 않는다.
- 실행 컨텍스트 그림 이어쓰기, 추가 주제 4개(값이 아니라 바인딩, 상태 은닉, 메모리 오해, 함수를 돌려주는 함수), 반복문 var/let은 추가 게시글로 — 사용자 결정. 콘텐츠·외부 검토 반영과 execution-context 같은 표현 수정은 사용자 요청.

#### 배경지식

- 함수 객체의 `[[Environment]]`는 만들어질 때 정해진다. 함수 식·화살표 함수·메서드는 평가 시점의 실행 중 컨텍스트 LexicalEnvironment를, 함수 본문 최상위의 함수 선언은 FunctionDeclarationInstantiation이 넘긴 lexicalEnv를 쓴다.
- 호출하면 NewFunctionEnvironment가 새 함수 환경 레코드를 만들고 그 `[[OuterEnv]]`를 함수의 `[[Environment]]`로 둔다. 그래서 호출마다 레코드가 새로 생기고(독립), 같은 호출에서 만든 함수들은 같은 레코드를 가리킨다(공유).
- 레코드는 값이 아니라 바인딩을 담으므로, 함수를 만든 뒤 바인딩에 대입하면 함수는 바뀐 값을 읽는다. 객체 프로퍼티와 레코드의 바인딩은 이름이 같아도 다른 곳에 있다.
- sloppy 함수는 함수 환경 레코드(매개변수·var·함수 선언)와 본문 최상위 let·const용 선언적 레코드를 따로 둔다. 매개변수 목록에 식이 있으면(ContainsExpression) var용 레코드가 하나 더 생긴다.

#### 확인 질문

1. 예제 1에서 `makeCounter`의 컨텍스트가 스택에서 빠졌는데도 시뮬레이터가 그 레코드를 그리는 이유는? 그 레코드가 "남아 있음" 배지를 잠시 잃는 때는 언제이고 왜인가?
   <details><summary>답</summary>`next`가 가리키는 increment 함수 객체의 `[[Environment]]`가 makeCounter 호출의 선언적 환경 레코드라서 함수 객체를 통해 닿는다. `next()`가 실행 중일 때는 increment 호출 레코드의 `[[OuterEnv]]`를 따라 실행 컨텍스트에서 바로 닿으므로 "실행 컨텍스트 없이 남음"이 아니어서 배지를 해제한다. counter 시나리오, 구현 진행 2단계, 리뷰 Low ①.</details>
2. 예제 2와 예제 3의 차이를 레코드 개수로 설명하면? `first`와 `second`가 같은 함수 식에서 나왔는데 왜 count를 공유하지 않는가?
   <details><summary>답</summary>예제 2는 makeCounter를 두 번 호출해 레코드 세트가 둘이고, 함수 식도 호출마다 평가되어 각자 자기 호출의 레코드를 `[[Environment]]`로 가진다. 예제 3은 한 번의 호출에서 두 메서드를 만들어 같은 레코드를 가리킨다. 공유 여부는 같은 함수 식인지가 아니라 같은 호출인지로 정해진다. 본문 "호출마다 새 환경"·"같은 호출의 함수들은 환경을 공유".</details>
3. 시뮬레이터의 "남아 있음" 표시를 상태에서 계산해 넣지 않고 손으로 적은 뒤 테스트로 대조한 이유는? 음성 확인에서 무엇을 했나?
   <details><summary>답</summary>계산해서 넣으면 도달 가능성 규칙이 틀려도 시나리오와 테스트가 같은 규칙으로 함께 틀려 통과한다. 메인 에이전트가 `retained` 표시를 모두 지워 보니 도달 가능성 테스트 4개가 실패했고, 원복했다. 구현 진행 2단계, `concept.test.ts`.</details>
4. "클로저가 쓰는 변수는 엔진이 메모리에 남긴다"는 문장의 어디까지가 명세로 말할 수 있는 것인가?
   <details><summary>답</summary>명세로 말할 수 있는 것은 함수 객체가 `[[Environment]]`로 레코드를 가리킨다는 것과, Conformance에 따라 그 함수가 읽고 쓰는 바인딩은 어느 구현에서든 명세대로 동작해야 한다는 것이다. 쓰지 않는 바인딩까지 남기는지, 실제 메모리 구조, 회수 시점은 명세가 정하지 않는다(GC 보장 없음, 명세 타입은 구현 실체와 대응할 필요 없음). 본문 "메모리에 대한 오해", 외부 검토 1차 ①.</details>
5. 예제 1 퀴즈 선택지의 `undefined`에 따옴표를 붙이면 무엇이 깨지는가?
   <details><summary>답</summary>퀴즈 정답은 meta의 expectedOutput을 ' / '로 이은 문자열과 같아야 하고, console.log는 typeof가 돌려준 문자열 'undefined'를 따옴표 없이 출력해 expectedOutput은 `undefined`다. 그래서 선택지는 두고 해설에 문자열과 값의 차이를 적었다. 외부 검토 1차 ⑤.</details>
