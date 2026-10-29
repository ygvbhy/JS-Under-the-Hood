# 실행 컨텍스트 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-29
- 기준: `main` @ `32714f0`

## 0. 요약

- 목적: 로드맵(13~24장) 9번 `/concepts/execution-context`를 추가한다. 앞 개념(스코프 체인·블록 스코프·TDZ·호이스팅·this)이 명세에서 어떤 구조로 처리되는지를 실행 컨텍스트 스택과 환경 레코드로 보인다. 예제 9개, 퀴즈, "스택 + 환경 레코드" 시뮬레이터. 사용자 결정: 함수 환경은 명세대로 둘(VariableEnvironment·LexicalEnvironment), 전역 환경 레코드는 객체·선언적 두 칸, 추가 주제 4개(this 바인딩 위치, 블록의 환경 교체·복원, 함수 객체의 [[Environment]], 소스 코드 4종류).
- 범위: 새 개념 폴더 1개(category `execution`), e2e·빌드 테스트 추가, content-guide e2e 목록, 로드맵. 공통 코드와 기존 개념 19개는 바꾸지 않는다(역방향 연결은 나중에 따로 — 사용자 결정). summary·tags에 '객체'를 넣지 않아 `navigation.spec.ts`는 바꾸지 않는다.
- 위험: 명세 구조를 잘못 그리는 것(예: 호출 스택 순서를 스코프 체인으로 그림, strict 함수도 레코드 둘로 그림, 블록 뒤 LexicalEnvironment 복원 누락) → 명세 원문 대조, 구조 테스트(바깥 연결·복원·탐색 경로), 탐침 대조(값·스택·전역 객체 프로퍼티)로 막는다.
- 복잡도: 중간 · Consensus: 생략. 기존 scope-chain·block-scope·tdz(스코프 카드·탐색 경로·탐침)와 this-binding(결정 과정)의 조합이고 공통 코드 변경이 없다. 명세 원문과 vm·ESM·CJS 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md:34`) 9번, 『모던 자바스크립트 Deep Dive』 23장. 23장까지만 전제한다(클로저는 24장이라 "별도 개념").
- 핵심
  - ① 코드를 실행하려면 그 코드의 실행 컨텍스트가 만들어지고, 실행 컨텍스트 스택의 맨 위가 지금 실행 중인 컨텍스트다. 함수를 호출하면 새 컨텍스트가 쌓이고(push), 함수가 끝나면 빠진다(pop).
  - ② 코드는 선언 처리(GlobalDeclarationInstantiation·FunctionDeclarationInstantiation) → 실행 두 단계로 평가된다(호이스팅·TDZ의 근거).
  - ③ 실행 컨텍스트는 LexicalEnvironment·VariableEnvironment로 환경 레코드를 가리키고, 환경 레코드는 이름과 값(바인딩)을 담고 [[OuterEnv]]로 바깥 환경 레코드를 가리킨다. 식별자는 지금 LexicalEnvironment부터 [[OuterEnv]]를 따라 찾는다(스코프 체인의 근거).
  - ④ let·const 바인딩은 선언 처리 때 만들어지지만 초기화 전 상태로 남고, 선언문이 실행될 때 초기화된다(TDZ의 근거).
- 사용자 결정(2026-10-29)
  - ⑤ 함수 환경: 명세대로 둘로 나눈다. 함수 환경 레코드(매개변수·var·함수 선언·this) = VariableEnvironment, 본문 최상위 let·const용 선언적 환경 레코드 = LexicalEnvironment. 명세상 strict 함수는 두 이름이 같은 레코드 하나를 가리킨다(2절) — 예제가 sloppy라 둘로 그리고, strict 경우는 본문과 단순화에 밝힌다.
  - ⑥ 전역 환경 레코드: 객체 환경 레코드(var·함수 선언 → 전역 객체의 프로퍼티)와 선언적 환경 레코드(let·const) 두 칸으로 그린다. 전역 객체 자체는 추가 게시글 후보로 남긴다.
  - ⑦ 추가 주제: this 바인딩의 위치(함수 환경 레코드, 화살표 함수는 this 바인딩이 없어 바깥에서 찾음), 블록의 환경 교체·복원, 함수 객체의 [[Environment]](정의한 곳의 환경 → 호출할 때 새 환경의 바깥), 소스 코드 4종류(전역·함수·eval·모듈, eval·모듈은 언급만).
  - ⑧ 역방향 연결: 나중에 따로(기존 개념 수정 없음).
  - 시각화: 스택 + 환경 레코드 시뮬레이터(로드맵).

### 유지해야 하는 기존 동작

- 기존 개념 19개의 페이지·시뮬레이터·테스트는 그대로 통과하고 파일은 수정하지 않는다.
- 홈 `객체` 검색 6건·첫 카드 '원시 값과 객체'(`tests/e2e/navigation.spec.ts:17`, `:32`) 유지 — summary·tags에 '객체'를 쓰지 않는다. 제목 '실행 컨텍스트: …'는 '스코프 체인'과 '원시 값과 객체' 사이로 정렬된다(확인함).
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위

- 클로저(함수가 끝난 뒤에도 환경이 남는 경우) — 10번(24장). 이 페이지는 "호출이 끝나면 그 컨텍스트가 빠진다"까지만 보이고, 환경 레코드가 계속 남을 수 있다는 것은 별도 개념으로 언급한다.
- 전역 객체 자체(globalThis, 빌트인) — 추가 게시글 후보.
- 제너레이터·async의 컨텍스트 중단·재개, 클래스·PrivateEnvironment, `using`(DisposableResourceStack), 매개변수 기본값이 만드는 추가 레코드, with 문의 객체 환경 레코드, 직접 eval의 세부, 모듈 환경 레코드의 세부.
- 호출 스택 크기 제한(스택 넘침 오류) — 명세가 아니라 구현·호스트가 정하는 것이라 다루지 않는다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현
  - `app/concepts/scope-chain/`·`block-scope/`·`tdz/`: 스코프 카드(`outerId`)·탐색 경로(`lookup`)·초기화 전 표시, `probeAt`(줄 뒤에 스냅샷을 끼워 값·초기화 전을 vm에서 읽음, `app/concepts/block-scope/concept.test.ts:229`)
  - `app/concepts/this-binding/`: 결정 과정 표시, 탐침 `__probe`(`app/concepts/this-binding/concept.test.ts`)
  - 앞 개념의 단순화 문구가 이 페이지로 미룬 부분: `scope-chain/meta.ts:69`(스코프 카드 = 환경 레코드, 바깥 스코프 = [[OuterEnv]]), `hoisting/meta.ts:66`(전역 환경 레코드), `function-calls/meta.ts:70`(함수 안 호출), `new-operator/meta.ts:96`·`this-binding/meta.ts:106`(this 저장 구조), `primitives-and-objects/meta.ts:32`, `short-circuit-evaluation/meta.ts:75`
- 메타·검색·정렬
  - category `execution`은 '실행 모델'(`app/lib/concepts.ts:25`), 현재 4개(hoisting·scope-chain·block-scope·tdz).
  - 홈 검색은 title·summary·tags에서 찾는다(`app/lib/concepts.ts:54`).
- 명세 원문(tc39.es/ecma262 현재 초안 사본 2026-10-28, ES2025와 차이는 표시)
  - 9.4 Execution Contexts(`sec-execution-contexts`): 실행 컨텍스트 스택, running execution context = 맨 위, 제어가 다른 코드로 옮겨질 때 새 컨텍스트를 만들어 push. 구성 요소 code evaluation state·Function·Realm·ScriptOrModule, ECMAScript 코드 컨텍스트는 LexicalEnvironment·VariableEnvironment·PrivateEnvironment.
  - 9.1 Environment Records: 선언적·함수·모듈·객체·전역 환경 레코드, 모두 [[OuterEnv]]. 함수 환경 레코드는 [[ThisValue]]·[[ThisBindingStatus]](lexical·initialized·uninitialized)·[[FunctionObject]]·[[NewTarget]]. 전역 환경 레코드는 [[ObjectRecord]]·[[GlobalThisValue]]·[[DeclarativeRecord]](`sec-newglobalenvironment`).
  - 9.1.2.1 GetIdentifierReference(`sec-getidentifierreference`): HasBinding이 true면 그 레코드, 아니면 [[OuterEnv]]로 재귀, null이면 unresolvable. 9.4.2 ResolveBinding은 running execution context의 LexicalEnvironment에서 시작.
  - 9.1.1.4.1 전역 환경 레코드 HasBinding(`sec-global-environment-records-hasbinding-n`): [[DeclarativeRecord]]를 먼저 보고, 없으면 [[ObjectRecord]]를 본다.
  - 9.1.2.4 NewFunctionEnvironment(`sec-newfunctionenvironment`): [[OuterEnv]] = 함수의 [[Environment]], 화살표 함수([[ThisMode]] lexical)는 [[ThisBindingStatus]] lexical.
  - 10.2.1.1 PrepareForOrdinaryCall(`sec-prepareforordinarycall`): 새 컨텍스트, LexicalEnvironment·VariableEnvironment = 새 함수 환경 레코드, 호출한 컨텍스트를 suspend하고 push. 10.2.1 [[Call]]: 본문 평가 뒤 "Remove calleeContext from the execution context stack and restore callerContext".
  - 10.2.11 FunctionDeclarationInstantiation(`sec-functiondeclarationinstantiation`): 매개변수·var·함수 이름은 함수 환경 레코드(매개변수 기본값이 있으면 별도 varEnv). 그 뒤 현재 초안은 "If strict is true, let lexicalEnv be variableEnv. Else, … lexicalEnv = NewDeclarativeEnvironment(variableEnv)"(ES2025도 같은 조건, 변수 이름만 lexEnv·varEnv). NOTE: sloppy 함수가 최상위 lexical 선언용 레코드를 따로 두는 것은 직접 eval이 var 충돌을 판단하게 하려는 것. 함수 선언의 함수 객체는 `InstantiateFunctionObject(funcDecl, lexicalEnv, …)`로 만들고 `variableEnv.SetMutableBinding`으로 저장 — [[Environment]]는 LexicalEnvironment 쪽 레코드.
  - 16.1.7 GlobalDeclarationInstantiation: var·함수 선언 → 객체 레코드(전역 객체 프로퍼티), let·const·class → 선언적 레코드(초기화 전), 함수 객체의 [[Environment]] = 전역 환경 레코드.
  - 14.2.2 Block 평가(`sec-block-runtime-semantics-evaluation`): oldEnv 저장 → NewDeclarativeEnvironment(oldEnv) → BlockDeclarationInstantiation → LexicalEnvironment 교체 → 문 실행 → oldEnv로 복원. NOTE: 어떻게 블록을 빠져나가도 복원.
  - 9.4.3 GetThisEnvironment(`sec-getthisenvironment`): LexicalEnvironment부터 HasThisBinding이 true인 레코드까지 [[OuterEnv]]를 따라감(전역에서 반드시 멈춤).
  - 11.2 Types of Source Code(`sec-types-of-source-code`): 전역·eval·함수·모듈 코드.
- 예제 초안 실제 출력(scratchpad `ec-draft/`, vm은 `runExample`과 같은 방식, `.mjs`·`.cjs`는 파일로 직접 실행)

  | # | 파일 | vm 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `call-stack.js` | `first start` / `second start` / `second end` / `first end` / `global end` | 같음 | 같음 |
  | 2 | `two-phases.js` | `function` / `undefined` / `ReferenceError` | 같음 | 같음 |
  | 3 | `global-records.js` | `true` / `false` / `function` / `2` | `false` / `false` / `undefined` / `2` | `.mjs`와 같음 |
  | 4 | `lookup-defined.js` | `global` | 같음 | 같음 |
  | 5 | `function-records.js` | `pvl` | 같음 | 같음 |
  | 6 | `tdz-env.js` | `ReferenceError` / `inner` | 같음 | 같음 |
  | 7 | `block-env.js` | `block` / `function` / `var` / `global` | 같음 | 같음 |
  | 8 | `this-env.js` | `obj` | 같음 | 같음 |
  | 9 | `recursion.js` | `1` / `2` / `3` / `done` | 같음 | 같음 |

  - 예제 3만 달라진다: 모듈·CommonJS의 최상위 코드는 전역 코드가 아니라 var·함수 선언이 전역 객체의 프로퍼티가 되지 않는다.
- 본문 근거로 쓸 vm 실행 결과(2026-10-29)
  - sloppy 함수에서 최상위 `let x`와 직접 `eval('var x = 2')`는 SyntaxError, strict 함수에서는 오류 없이 바깥 `x`는 1 그대로(strict eval은 새 레코드에 선언)
  - 함수 안 `var`는 전역 객체의 프로퍼티가 아니다, 블록 안 전역 `var`는 프로퍼티다, 블록의 `let`은 블록 뒤에서 `typeof` → `'undefined'`
  - 함수 선언은 함수 본문 안에서도 선언 처리 때 만들어진다(`typeof g` → `'function'`), 함수 최상위 `let`을 선언 전에 읽으면 ReferenceError
  - 화살표 함수 안 `this`는 바깥 메서드의 this와 같다(`===`)
- MDN ko 200·ko 경로 유지 확인(2026-10-29): `Glossary/Call_stack`, `Glossary/Scope`, `Web/JavaScript/Reference/Statements/block`, `Web/JavaScript/Reference/Statements/let`, `Web/JavaScript/Reference/Statements/var`, `Web/JavaScript/Reference/Operators/this`, `Web/JavaScript/Guide/Functions`. 클로저 문서는 쓰지 않는다.

### 추정

- 예제 이름(`first`, `second`, `greet`, `count`, `total`, `label`, `show`, `run`, `outer`, `inner`, `countdown`, `test`, `obj`, `read`, `value`, `x`, `y`)이 Chromium에서 `in window`가 아니다 — 6단계 브라우저 확인에서 검사한다(`test`·`x`·`y`·`value`는 window 프로퍼티가 아님을 그때 확인).

## 3. 구현 전략

- scope-chain·block-scope의 "스코프 카드 + 바깥 연결 + 탐색 경로"를 환경 레코드로 바꾸고, 그 위에 실행 컨텍스트 스택을 더한다.
  - slug `execution-context`, category `execution`
  - 제목 `'실행 컨텍스트: 코드는 어떤 구조 위에서 실행될까'`
  - 시뮬레이터 label `'실행 컨텍스트 시뮬레이터'`
  - related: `['scope-chain', 'this-binding']`
- 상태(`ExecState`)
  - `ContextCard`: `{ id; label; code: 'global' | 'function'; phase: 'instantiation' | 'evaluation'; lexicalEnv: envId; variableEnv: envId; created? }` — `stack`은 아래(전역)부터 위(실행 중) 순서
  - `Binding`: `{ name; value: string | null; state: 'uninitialized' | 'initialized'; changed? }` — `value`는 표시 문자열(`'global'`, `'함수 show'`, `'undefined'`), 초기화 전이면 null
  - `EnvRecord`: `{ id; kind: 'global' | 'function' | 'declarative'; label; outerId: string | null; bindings: Binding[]; objectBindings?: Binding[]; thisBinding?: { status: 'lexical' | 'initialized'; value?: string }; created? }`
    - `global`: `objectBindings` = 객체 환경 레코드(전역 객체 프로퍼티), `bindings` = 선언적 환경 레코드, this = 전역 객체
    - `function`: 매개변수·var·함수 선언 + this(화살표는 `lexical` = this 바인딩 없음)
    - `declarative`: 함수 최상위 let·const(sloppy) 또는 블록
  - `FnObject`: `{ name; environmentId }` — 함수 객체의 [[Environment]] 표시
  - `lookup`: `{ kind: 'identifier' | 'this'; name; path: envId[]; foundIn: envId; part?: 'object' | 'declarative'; result: string } | null`
  - `ExecState`: `{ stack; envs; functions; lookup }`
- 화면(`ExecView`)
  - 왼쪽(모바일은 위) "실행 컨텍스트 스택": 위가 실행 중. 카드마다 이름, 단계(선언 처리/실행), LexicalEnvironment → 레코드 이름, VariableEnvironment → 레코드 이름. "실행 중" 배지.
  - 오른쪽 "환경 레코드": 카드마다 종류 배지(전역/함수/선언적), 바인딩 목록(초기화 전은 글자로), this(함수·전역), "바깥: 레코드 이름 | 없음(null)". 전역 카드는 "객체 환경 레코드(전역 객체 프로퍼티)"와 "선언적 환경 레코드" 두 칸.
  - "함수 객체" 목록: 이름 → [[Environment]] 레코드 이름.
  - 탐색 경로: 찾는 이름(또는 this), 거친 레코드 순서와 찾은 곳. 색만으로 구분하지 않는다.
- 시나리오 4개(줄·호출·반환마다 1단계, 실행 전 0단계, 선언 처리를 따로 1단계)
  - `stack`(예제 1): 전역 선언 처리(first·second → 객체 레코드) → `first()` push(함수 환경 레코드 + 선언적 레코드, this = 전역 객체) → 출력 → `second()` push → 출력 2회 → second 반환 pop → 출력 → first 반환 pop → 출력
  - `lookup`(예제 4): 전역 선언 처리(label 초기화 전, show·run → [[Environment]] 전역) → label 초기화 → `run()` push(선언적 레코드에 label 초기화 전) → `const label = 'run'` → `show()` push: show 함수 환경 레코드의 바깥 = show.[[Environment]] = 전역(run의 레코드가 아님) → `return label` 탐색: show 선언적 → show 함수 → 전역(선언적 칸)에서 찾음 'global' → pop → pop → 출력
  - `block`(예제 7): test() 안에서 블록 진입: LexicalEnvironment가 새 블록 레코드로 바뀜(VariableEnvironment는 그대로) → `var y`는 함수 환경 레코드에 → 블록 안 `x` 탐색 → 블록 끝: LexicalEnvironment 복원 → `x` 탐색은 함수의 선언적 레코드, `y` 탐색은 함수 환경 레코드 → pop → 전역 `x`
  - `this`(예제 8): `obj.regular()` push(함수 환경 레코드 this = obj) → `const arrow = …`(arrow.[[Environment]] = regular의 LexicalEnvironment 레코드) → `arrow()` push(함수 환경 레코드 this 없음) → `this.name`의 this 탐색: arrow 선언적 → arrow 함수(this 없음) → regular 선언적 → regular 함수(this = obj) → pop → pop → 출력
  - 나머지 예제(2·3·5·6·9)는 예제·퀴즈·본문으로 다룬다.
- 정확성 검증
  - (a) 공통 불변식
  - (b) 구조: 모든 `outerId`·`lexicalEnv`·`variableEnv`·`environmentId`가 존재; 각 컨텍스트의 LexicalEnvironment에서 [[OuterEnv]]를 따라가면 VariableEnvironment에 닿는다; 함수 환경 레코드의 `outerId` = 그 함수 객체의 `environmentId`; 블록 레코드의 `outerId` = 블록 진입 전 LexicalEnvironment, 블록 다음 단계에서 LexicalEnvironment가 그 값으로 복원; 스택에서 빠진 컨텍스트만 가리키던 레코드는 다음 단계에 없다; `lookup.path`는 실행 중 컨텍스트의 LexicalEnvironment부터 바깥 연결을 따라가며 이름(또는 this 바인딩)을 가진 첫 레코드에서 멈춘다(전역은 선언적 칸 → 객체 칸 순서, GetIdentifierReference·전역 HasBinding); 전역의 var·함수는 `objectBindings`, let·const는 `bindings`; 화살표 함수 레코드만 this `lexical`.
  - (c) 탐침 대조: 단계 줄 뒤에 스냅샷을 끼워(block-scope `probeAt` 방식) 실행 중 컨텍스트에서 보이는 바인딩의 값·초기화 전(ReferenceError)이 vm 실제 값과 같다; 함수 본문 시작·끝에 `__stack` 기록을 끼워 각 단계의 스택(함수 이름 순서)이 실제 호출 순서와 같다; 전역 `objectBindings` 이름은 `name in globalThis`가 true, `bindings` 이름은 false; `lookup.result`가 그 줄에서 실제로 읽은 값과 같다(this 포함). 탐침 버전의 출력 = 원본 출력.
  - (d) 음성 확인: `lookup`의 show 함수 환경 레코드 바깥을 run의 레코드로 바꾸면 실패, `block`에서 블록 뒤 LexicalEnvironment를 복원하지 않으면 실패, `this`에서 arrow 함수 환경 레코드에 this를 주면 실패해야 한다.
- 버린 대안
  - ① 함수 환경 하나로 단순화: 사용자 결정으로 둘로 나눈다.
  - ② 클로저까지 보이기(반환된 함수가 환경을 붙잡음): 24장, 10번.
  - ③ 재귀 예제를 시뮬레이터로: 단계가 길어진다(컨텍스트 4개). 예제·퀴즈로 다룬다.
  - ④ console.log 같은 빌트인 함수의 실행 컨텍스트까지 그리기: 명세상 빌트인 함수 호출도 컨텍스트를 만들지만 초점이 흐려져 생략하고 단순화에 밝힌다.

## 4. 변경 파일

- 추가 `app/concepts/execution-context/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 9개(2절 표)
  - `scenarios.ts`, `ExecView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정
  - `tests/e2e/helpers.ts`: `EXECUTION_CONTEXT_PATH`, `EXECUTION_CONTEXT_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: this-binding 케이스를 본떠 추가만
  - `docs/content-guide.md:164`: e2e 목록에 `execution-context`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 9번 행·진행 기록
- 변경하지 않음: 공통 코드, `package.json`, `AGENTS.md`, `tests/e2e/navigation.spec.ts`, 기존 개념 폴더 19개

## 5. 위험 요소

- 호출 스택과 스코프 체인 혼동 → `lookup` 시나리오(show가 run 안에서 불려도 바깥은 전역)와 구조 테스트(함수 레코드 바깥 = [[Environment]]).
- strict 함수도 레코드 둘로 그림 → 예제는 sloppy, 본문·단순화에 "strict 함수는 LexicalEnvironment와 VariableEnvironment가 같은 레코드". 근거 테스트로 strict 함수의 직접 eval 동작을 보인다.
- 블록 뒤 복원 누락 → 구조 테스트·음성 확인.
- "함수가 끝나면 환경이 사라진다"로 단정 → 그림에서 지우는 것은 "어떤 실행 컨텍스트도 가리키지 않아서"로 쓰고, 함수 객체가 붙잡으면 남는다(클로저)는 별도 개념으로 언급.
- 23장을 넘어선 설명(클로저·모듈 환경 세부) → 별도 개념.
- 화면 복잡도(컨텍스트 3개 + 레코드 6~7개) 375px 넘침 → 한 열 배치, 카드 줄바꿈, e2e 가로 스크롤 검사, 브라우저 확인.
- 예제 3의 모듈 결과 차이 → 단순화와 `.mjs`·`"type": "module"` 테스트.
- 탐침이 실행 흐름을 바꿈 → 탐침은 기록만 하고 탐침 버전 출력 = 원본 출력 검사.
- 전역 HasBinding 순서(선언적 → 객체, 2절 확인) → 구조 테스트의 탐색 경로 규칙에 반영(2단계).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성: 예제 9개 출력, 본문 주장 근거 테스트(2절 vm 목록), `.mjs`·`.cjs`·`"type": "module"`(예제 3), 시나리오 (a)~(d), 퀴즈 정답 = expectedOutput·위치 분산
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. "검토 중" 배지, 분류 '실행 모델', 퀴즈 라디오 UI
  2. `stack`: `second()` 단계에서 스택 3개(위가 second, "실행 중"), second 반환 단계에서 2개
  3. `lookup`: show 함수 환경 레코드의 "바깥: 전역 환경 레코드", 탐색 경로가 run의 레코드를 거치지 않음, 결과 'global'
  4. `block`: 블록 진입 단계에서 LexicalEnvironment = 블록 레코드·VariableEnvironment = 함수 환경 레코드, 블록 뒤 단계에서 복원
  5. `this`: arrow 함수 환경 레코드에 "this 바인딩 없음", this 탐색이 regular 함수 환경 레코드에서 멈춤
  6. 375px·다크: 가로 넘침 0, 키보드 ←/→/Home, 콘솔 에러 0
  7. 홈: '실행 모델' 그룹 카드 5개, 전체 카드 20개, `객체` 검색 6건(변화 없음), `실행 컨텍스트` 검색 1건 이상
  8. 예제 이름 `in window` 없음

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route와 본문 주장 근거 테스트

- 대상: `examples/*.js`(9개), `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장), 자리표시 `content.mdx`
- 변경
  - 예제 9개는 scratchpad 초안(`ec-draft/*.js`, `run.cjs` 제외)과 같은 원문(`cp` 후 `cmp`)
  - `meta.ts`
    - slug, title, category, related는 3절대로
    - summary(160자 이하, '객체' 없음): 함수를 호출하면 실행 컨텍스트가 스택에 쌓이고 끝나면 빠진다, 환경 레코드가 이름을 담고 바깥 레코드를 가리켜 스코프 체인이 된다, 선언 처리 → 실행 두 단계, this·블록도 이 구조로 처리
    - tags('객체' 없음): `실행 컨텍스트`, `실행 컨텍스트 스택`, `콜 스택`, `환경 레코드`, `LexicalEnvironment`, `VariableEnvironment`, `전역 환경 레코드`, `함수 환경 레코드`, `OuterEnv`, `스코프 체인`, `호이스팅`, `TDZ`, `this`
    - goals 4개: 스택 push/pop으로 호출 순서와 실행 중 코드 설명 / 선언 처리 → 실행과 바인딩의 초기화 전 상태로 호이스팅·TDZ 설명 / 환경 레코드와 [[OuterEnv]]·[[Environment]]로 식별자 탐색(호출한 곳이 아니라 정의한 곳) 설명 / 블록의 LexicalEnvironment 교체·복원과 this 바인딩 위치 설명
    - prerequisites: `scope-chain`, `block-scope`, `tdz`, `hoisting`, `function-calls`, `this-binding`
    - examples 9개(2절 출력), `reviewedAt: null`
  - 단순화
    - ① 실행 컨텍스트의 구성 요소 중 LexicalEnvironment와 VariableEnvironment만 그립니다. code evaluation state, Function, Realm, ScriptOrModule, PrivateEnvironment는 생략합니다.
    - ② 환경 레코드 카드는 명세의 Environment Record를 단순화한 것입니다. 바인딩의 변경 가능 여부(const), 함수 환경 레코드의 [[FunctionObject]]·[[NewTarget]] 등은 생략하고 this만 보입니다.
    - ③ strict mode 함수는 LexicalEnvironment와 VariableEnvironment가 같은 레코드 하나를 가리킵니다. 이 페이지의 예제는 sloppy mode라 둘로 그립니다. 매개변수에 기본값이 있으면 레코드가 하나 더 생기지만 다루지 않습니다.
    - ④ 함수가 끝나 어떤 실행 컨텍스트도 가리키지 않는 환경 레코드는 그림에서 지웁니다. 함수 객체가 그 레코드를 계속 가리키면 남는데, 이것은 클로저 개념에서 다룹니다.
    - ⑤ 전역 객체 자체(globalThis와 빌트인 프로퍼티)는 별도 개념입니다. 객체 환경 레코드 칸에는 예제가 선언한 이름만 보입니다.
    - ⑥ 예제 3은 클래식 스크립트 결과입니다. .mjs·"type": "module"(모듈)이나 CommonJS(.cjs)로 실행하면 최상위 코드가 전역 코드가 아니라 var·함수 선언이 전역 객체의 프로퍼티가 되지 않습니다.
    - ⑦ eval 코드와 모듈 코드의 실행 컨텍스트는 언급만 합니다. 제너레이터·async 함수처럼 실행 컨텍스트가 중단됐다가 다시 이어지는 경우와 클래스는 다루지 않습니다.
    - ⑧ console.log 같은 빌트인 함수를 부를 때도 실행 컨텍스트가 만들어지지만 시뮬레이터에서는 생략합니다. 스택 크기 제한은 명세가 아니라 구현이 정하므로 다루지 않습니다.
    - ⑨ 시뮬레이터는 선언 처리를 한 단계로 묶어 보이고, 바인딩 생성·초기화의 세부 순서(매개변수 → var → 함수 등)는 생략합니다.
  - references: 2절 앵커(9.4 실행 컨텍스트, 9.1 환경 레코드, GetIdentifierReference, ResolveBinding, NewFunctionEnvironment, PrepareForOrdinaryCall, FunctionDeclarationInstantiation, GlobalDeclarationInstantiation, Block 평가, GetThisEnvironment, 소스 코드 종류)와 2절의 MDN ko 7개
  - `concept.test.ts` 본문 주장: 2절 vm 목록 전부, `.mjs`·`.cjs`가 2절 표와 같다, 예제 3의 `"type": "module"` 실행 결과가 `.mjs`와 같다
- 주의사항: `console.log`에는 원시 값·JSON만. 예제는 포맷 제외 경로. vm 판정은 컨텍스트 안에서. 명세 이름은 링크 대상인 현재 초안 기준(판마다 다르면 둘 다 적는다).
- 완료 조건: `npm test` L1 9개와 본문 주장 테스트 통과, lint·format·typecheck 통과, summary 160자 이하·'객체' 없음, tags에 '객체' 없음

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오)
- 변경: 3절 상태 모델과 시나리오 4개. 단계 수는 테스트로 고정. 테스트 3절 (a)~(c)
- 주의사항: 단계 설명은 명세 순서(컨텍스트 생성·push → 선언 처리 → 실행 → pop)와 맞춘다. "복사"·"사라진다" 대신 "가리키지 않는다"·"빠진다". 클로저·전역 객체는 별도 개념.
- 완료 조건: 이 개념 테스트 통과, 음성 확인 3건(3절 (d))을 서브에이전트가 실행·원복, 메인이 한 건 재확인

### 3. 시각화 `ExecView`

- 대상: `ExecView.tsx`, `ExecView.test.tsx`
- 변경: 3절 화면. block-scope `BlockView`·scope-chain `ScopeView`의 카드·경로, this-binding `ThisView`의 배지·줄바꿈(code는 `overflow-wrap:anywhere` 쓰지 않음 — this-binding에서 식별자 중간이 끊긴 문제)
- 주의사항: effect·window 없음, 색만으로 구분하지 않음, 375px 한 열, 스택은 위가 실행 중(읽는 순서를 글자로도 표시)
- 완료 조건: 테스트 통과(빈 스택·실행 전, 스택 순서와 "실행 중", 단계 배지, LexicalEnvironment·VariableEnvironment 표시, 레코드 종류 3가지, 전역 두 칸, 초기화 전 글자, this 표시와 "this 바인딩 없음", 바깥 연결, 함수 객체 [[Environment]], 탐색 경로·찾은 곳, 새로 생김 표시), typecheck 통과

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="실행 컨텍스트 시뮬레이터"`, 다른 래퍼와 같은 형태
- 완료 조건: 테스트 4개(첫 화면, `lookup`의 show 탐색 단계 문구, 시나리오 전환, 마지막 콘솔)

### 5. 본문 content.mdx

- `## 동작 원리` h3
  - 소스 코드와 실행 컨텍스트(4종류, eval·모듈은 언급)
  - 실행 컨텍스트 스택(예제 1, 재귀 예제 9)
  - 선언 처리와 실행(예제 2, hoisting·tdz 연결)
  - 환경 레코드와 [[OuterEnv]](scope-chain 연결)
  - 전역 환경 레코드: 객체 환경 레코드와 선언적 환경 레코드(예제 3)
  - 함수 환경: VariableEnvironment와 LexicalEnvironment(예제 5, strict는 하나, 직접 eval NOTE 한 줄)
  - 함수 객체의 [[Environment]]: 정의한 곳이 바깥이 된다(예제 4)
  - 초기화 전 바인딩(예제 6, tdz 연결)
  - 블록의 환경 교체와 복원(예제 7, block-scope 연결)
  - this 바인딩은 어디에 있나(예제 8, this-binding 연결)
  - 정리 표(JSX `<table>`): 무엇이 어디에 저장되나(전역 var·함수 / 전역 let·const / 함수 매개변수·var·함수 / 함수 최상위 let·const / 블록 let·const / this)
- `## 예제`: 예제 1~9, PredictQuiz(정답 위치 분산, 예제 3은 클래식 스크립트 명시), `### 시뮬레이터로 확인하기`
- `## 결과와 이유`: 예제별 설명, 오해 Callout ① 스코프 체인은 호출한 순서(스택)를 따라간다 ② 함수가 끝나면 그 변수는 반드시 사라진다(→ 가리키는 것이 없을 때만, 클로저는 별도) ③ let·const는 호이스팅되지 않는다(→ 바인딩은 만들어지고 초기화 전) ④ 블록에 들어가면 새 실행 컨텍스트가 생긴다(→ 레코드만 바뀜) ⑤ 화살표 함수의 this는 화살표 함수 환경에 저장된다(→ this 바인딩이 없어 바깥에서 찾음)
- 링크: scope-chain, block-scope, tdz, hoisting, function-calls, this-binding
- 주의사항: 2절 사실만, 오류 메시지 인용 없음, 클로저·전역 객체는 별도 개념, JSX 안 인라인 code 줄바꿈 주의, 표는 375px 확인
- 완료 조건: 메인 대조, `npm test`·build 성공, HTML `<details` 9·`**` 0·깨진 code 0, 퀴즈 정답 = expectedOutput

### 6. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: this-binding 케이스를 본떠 추가만(`lookup`의 show 탐색 단계 문구 e2e 1개 포함), content-guide 목록·로드맵
- 완료 조건: 전체 검증 통과, 6절 브라우저 시나리오 1~8

## 9. 추가 개선 후보

- 추가 게시글 후보 "전역 객체"(로드맵에 있음): 이 페이지의 객체 환경 레코드 칸과 이어진다 — 10번 뒤 또는 이 개념 뒤 제안.
- 기존 개념 역방향 연결(사용자 결정: 나중에 따로): 2절 "앞 개념의 단순화 문구" 7곳과 this-binding·primitive-methods 등 앞서 쌓인 후보.

## 변경 이력

- 2026-10-29 (사용자 외부 검토 1차, 10건): 본문·meta 문구, 단순화 2개 추가(arguments, Annex B 블록 함수), 근거 테스트 4개 추가(구조·범위 변경 없음, 재승인 불필요) — 영향 단계 1·5

## 구현 진행

- baseline (2026-10-29, `32714f0`): lint 0 / format 통과 / typecheck 0 / test 1947 통과. test:build 147·e2e 273(skip 3)은 직전 커밋 검증 결과 사용
- [x] 1. 예제·meta·route와 본문 주장 근거 테스트 — 예제 9개 초안과 `cmp` 동일, summary 109자('객체' 없음, tags도 없음), 명세 앵커 12개 사본에서 확인, test 2002(+55: 개념 테스트 36 — 본문 주장 8·L1 9·`.cjs` 9·`.mjs` 9·`"type": "module"` 1, 공통 examples·무결성 19), lint·format·typecheck 통과
- [x] 2. 시나리오와 대조 테스트 — 단계 수 stack 11·lookup 10·block 14·this 10, test 2077(+75), 음성 확인 3건 서브에이전트 실행·원복(블록 복원 누락은 처음 탐침 1개만 실패해 구조 테스트를 보강), 메인이 lookup의 show 함수 환경 레코드 바깥을 run 레코드로 바꿔 재확인(3개 실패 → 원복 `cmp` 동일). 판단: 컨텍스트 push와 그 선언 처리를 한 단계로 묶음(phase `instantiation`), 호출·반환 단계의 줄은 호출한 줄, this 값 표시는 '객체 obj', arrow 함수 객체는 regular의 선언적 레코드 바인딩이 가리키므로 regular가 끝날 때 함께 뺌
- [x] 3. 시각화 `ExecView` — 테스트 14개(빈 스택, 스택 순서·실행 중, 단계 배지, LexicalEnvironment·VariableEnvironment, 레코드 종류 3가지, 전역 두 칸, 초기화 전, this·this 바인딩 없음, 바깥 연결·null, 함수 객체 [[Environment]], 찾기 경로·찾음·칸·결과, 새로 생김·바뀜), `overflow-wrap:anywhere` 없음, effect·window 없음. 객체 칸(`part: 'object'`) 배지는 시나리오에 해당 단계가 없어 합성 상태로 테스트
- [x] 4. 래퍼 `Simulator` — 테스트 4개(첫 화면, `lookup`의 label 찾기 단계, 시나리오 전환, 마지막 콘솔). 개념 폴더 테스트 129, lint·typecheck 통과
- [x] 5. 본문 content.mdx — 메인 대조 후 직접 수정 5곳: 예제 6의 바깥 `value` 줄 번호(6번 → 1번), 예제 6 탐색 경로("가장 가까운 레코드" → `try` 블록 레코드를 지나 함수의 선언적 레코드에서 멈춤), 예제 5의 호출 줄 번호(1번 → 9번), 함수 환경 레코드의 this(화살표 함수 예외 명시), this 절 첫 문장. 빌드 HTML `<details` 9·`**` 0, 퀴즈 정답 = expectedOutput(정답 위치 0~3 분산). 서브에이전트가 보고한 일반화 문장(var는 undefined로 시작, [[Environment]] 일반 서술, BlockDeclarationInstantiation의 함수 선언)은 명세와 맞아 유지
- [x] 6. e2e·빌드 테스트·문서 — `helpers.ts` 상수, a11y 3개·responsive 2개·build 3개 추가, content-guide 목록, 로드맵 9행. 첫 e2e에서 새 테스트 4건 실패(결과 표시가 `'global'`처럼 따옴표 포함인데 정규식이 따옴표 없이 기대) → 정규식 수정 후 해당 테스트 4건 통과. 전체: lint·format·typecheck 통과, test 2095, test:build 154, e2e 285 통과 + 수정한 4건 재실행 통과(skip 3 기존), `navigation.spec.ts` 변경 없음
  - 브라우저(serve 4175, Playwright, 데스크톱 라이트·375px 다크): ① 검토 중 배지·분류 '실행 모델'·퀴즈 버튼 9 ② `stack` 5단계 스택 3개(second 실행 중·선언 처리), 8단계 2개 ③ `lookup` show 함수 환경 레코드 바깥 = 전역, 찾기 경로 show 선언적 → show 함수 → 전역(선언적 칸) 'global', run 레코드 없음 ④ `block` 블록 안 LexicalEnvironment = 블록 레코드·VariableEnvironment = test 함수 레코드, 블록 뒤 test 선언적 레코드로 복원 ⑤ `this` 경로 arrow 선언적 → arrow 함수 → regular 선언적 → regular 함수에서 찾음 ⑥ 네 시나리오 끝까지 가로 넘침 0, 키보드 →·Home, 콘솔 에러 0 ⑦ 홈 카드 20·'실행 모델' 5·`객체` 6건(첫 카드 '원시 값과 객체')·`실행 컨텍스트` 1건 ⑧ 예제 이름 `in window` 없음. 정리 표는 375px에서 10px 넘쳐 포커스 가능한 region 안에서 스크롤(axe 통과)
  - 메인 수정: 컨텍스트 카드 이름 "전역 코드"·"first 함수 코드" → 계획대로 "전역 실행 컨텍스트"·"first 실행 컨텍스트"(scenarios.ts 2줄, ExecView.test.tsx 3줄)
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 없음. Low 2(보고만): ① 정리 표가 375px에서 10px 넘쳐 포커스 가능한 region 안에서 가로 스크롤(primitive-methods·this-binding과 같은 방식) ② 시나리오에 전역 객체 칸에서 찾는 단계가 없어 "객체 칸" 배지는 합성 상태로만 테스트됨
- 외부 검토 1차(사용자, 10건) 반영 — vm 실행과 명세 사본으로 먼저 확인
  - 중 2건: ① 예제 3 인과 — `total`이 찾히는 이유는 선언적 레코드에 바인딩이 있어서이고, 확인 순서는 같은 이름이 양쪽에 있을 때 무엇이 찾히는지를 정함. 검토 제안 문장의 "선언적 레코드 쪽이 가려진다"는 반대라(실행: `globalThis.dup` + `let dup` → `dup`은 선언적 값) 전역 객체 프로퍼티가 가려진다로 씀 ② console.log 용어 — "Math.max 같은 빌트인 함수나 console.log 같은 호스트 제공 함수"로. 명세 정의(4.4.12 built-in object = 구현이 제공하는 객체 포함)상 검토의 "빌트인 = ECMAScript가 정의한 것"은 정확하지 않지만 페이지 안 표현 충돌은 사실이라 반영
  - 낮~중·낮 8건: CommonJS는 Node가 파일을 함수로 감싸 최상위가 함수 코드(모듈 코드와 이유 구분, 본문·결과와 이유·단순화) / TDZ는 읽기·대입·`typeof` 모두 ReferenceError(실행 확인) / 단순화에 Annex B 블록 함수 선언(실행: sloppy는 블록 앞에서 읽어도 undefined, strict는 ReferenceError) / "반드시 멈춘다" → "늦어도 그곳에서는 멈춘다" / 예제 7의 `var y`는 선언 처리 때 이미 바인딩, 6번 줄은 대입 / 전역 레코드 "선언이 담기는 칸은 둘, this 값 등은 따로" / 단순화에 arguments(화살표가 아닌 함수, 실행: sloppy·strict 모두 object) / "한 줄씩 실행" → "문을 차례로 평가", "[[OuterEnv]]가 null", references 라벨에서 판마다 바뀌는 절 번호 제거
  - 근거 테스트 추가 4개: TDZ 대입·typeof, 전역 이름 가림, Annex B 블록 함수(typeof는 미선언과 구분이 안 돼 직접 읽기로 판정), arguments
  - 검증: lint·format·typecheck 통과, test 2099, test:build 154, 이 개념 e2e 16 통과, 예제 9개 초안과 `cmp` 동일

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 예제 9개, 퀴즈 9, misconception 5, 정리 표, 실행 컨텍스트 시뮬레이터(시나리오 4개: 11·10·14·10단계). 공통 코드·기존 개념·`navigation.spec.ts`는 바꾸지 않았다.
- 계획과 달라진 점
  - 시뮬레이터는 컨텍스트 push와 그 선언 처리를 한 단계로 묶었고(phase `instantiation`), 호출·반환 단계의 줄은 호출한 줄로 했다. arrow 함수 객체는 regular의 선언적 레코드 바인딩이 가리키므로 regular가 끝날 때 함께 뺀다.
  - 본문은 메인 대조(5곳)와 외부 콘텐츠 검토 1회(10건)로 다듬었다. 단순화 항목에 arguments와 Annex B 블록 함수 선언을 더해 11개가 됐다. 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- Critical/High 0. Low 2건(정리 표가 375px에서 region 안 가로 스크롤, 전역 객체 칸에서 찾는 단계는 합성 상태로만 테스트)은 보고만 하고 남겼다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록
- [ ] (사용자 결정: 나중에 따로) 기존 개념 역방향 연결 — 2절 "앞 개념의 단순화 문구" 7곳과 앞서 쌓인 후보
- [ ] 추가 게시글 후보 "전역 객체" 제안(이 페이지의 객체 환경 레코드 칸과 이어짐)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터에서 컨텍스트를 쌓는 단계와 그 컨텍스트의 선언 처리를 한 단계로 묶었다 — 명세는 PrepareForOrdinaryCall(push) → FunctionDeclarationInstantiation 순서지만, 나누면 호출마다 단계가 하나씩 늘어난다. 묶었다는 사실은 단순화와 시나리오 머리 주석에 밝혔다.
- [Claude 판단] 탐색 경로·바깥 연결·결과를 시나리오에 손으로 적고, 테스트가 상태에서 다시 계산한 값과 실제 실행(탐침) 결과로 대조한다 — 계산해서 넣으면 틀린 규칙이 테스트와 함께 틀린다. 블록 복원 누락은 처음 탐침 하나만 잡아서 구조 테스트를 보강했다.
- [Claude 판단] 외부 검토의 "같은 이름이 양쪽에 있으면 선언적 레코드 쪽이 가려진다" 제안을 실행해 보고 반대로 썼다 — 전역 HasBinding이 선언적 칸을 먼저 보므로 가려지는 것은 전역 객체 프로퍼티다.
- [Claude 판단] 질문 때 "sloppy 함수만 let·const 레코드를 따로 만든다"는 조건을 빠뜨렸던 것을 계획 단계에서 바로잡고, 예제를 sloppy로 두어 둘로 그리고 strict 경우는 본문·단순화·근거 테스트(직접 eval)로 보였다.
- 함수 환경은 둘로, 전역 환경 레코드는 두 칸으로, 추가 주제 4개(this 위치, 블록 교체·복원, [[Environment]], 소스 코드 4종류), 역방향 연결은 나중에 — 사용자 결정. 외부 검토 반영은 사용자 요청.

#### 배경지식

- 실행 컨텍스트 스택의 맨 위가 running execution context다. 함수 [[Call]]은 PrepareForOrdinaryCall로 새 컨텍스트를 push하고, 본문 평가 뒤 pop해서 호출한 컨텍스트를 되돌린다.
- ResolveBinding은 실행 중 컨텍스트의 LexicalEnvironment에서 시작해 GetIdentifierReference로 [[OuterEnv]]를 따라간다. 새 함수 환경 레코드의 [[OuterEnv]]는 함수 객체의 [[Environment]](정의한 곳)다.
- sloppy 함수는 함수 환경 레코드(VariableEnvironment: 매개변수·var·함수 선언·this)와 본문 최상위 let·const용 선언적 레코드(LexicalEnvironment)를 따로 두고, strict 함수는 하나다. 함수 안 함수 선언의 [[Environment]]는 LexicalEnvironment 쪽이다.
- 전역 환경 레코드는 객체 환경 레코드(var·함수 → 전역 객체 프로퍼티)와 선언적 환경 레코드(let·const·class)로 선언을 나눠 담고, HasBinding은 선언적 칸을 먼저 본다.
- 블록은 새 선언적 레코드로 LexicalEnvironment만 바꾸고 끝나면 복원한다. GetThisEnvironment는 this 바인딩이 있는 첫 레코드까지 바깥으로 가고, 화살표 함수의 함수 환경 레코드에는 this 바인딩이 없다.

#### 확인 질문

1. 예제 4에서 show는 run 안에서 불리고 스택에서도 run 바로 위에 있다. 그런데 왜 run의 label이 아니라 전역의 label을 읽는가?
   <details><summary>답</summary>스택은 호출 순서이고 식별자 탐색은 [[OuterEnv]]를 따른다. show를 호출할 때 만든 함수 환경 레코드의 [[OuterEnv]]는 show 함수 객체의 [[Environment]]인 전역 환경 레코드다(NewFunctionEnvironment). 그래서 경로는 show 선언적 → show 함수 → 전역이고 run의 레코드는 없다. 예제 4, `lookup` 시나리오, 계획 2절.</details>
2. 예제 7에서 블록 안에 쓴 `var y`를 블록 뒤에서 읽을 수 있는 이유를 실행 컨텍스트의 두 구성 요소로 설명하면?
   <details><summary>답</summary>블록은 LexicalEnvironment만 새 블록 레코드로 바꾸고 VariableEnvironment는 그대로다. y의 바인딩은 test의 선언 처리 때 VariableEnvironment가 가리키는 함수 환경 레코드에 이미 만들어졌고, 6번 줄은 대입만 한다. 블록이 끝나 LexicalEnvironment가 복원돼도 y는 함수 환경 레코드에 남아 있어 찾힌다. 예제 7, `block` 시나리오.</details>
3. 시나리오의 탐색 경로를 상태에서 계산하지 않고 손으로 적은 이유는? 블록 복원 누락을 음성 확인했을 때 처음에 무엇이 부족했나?
   <details><summary>답</summary>계산하면 구조 테스트가 같은 규칙을 두 번 쓰는 셈이라 규칙이 틀려도 통과한다. 블록 레코드를 남겨 둔 음성 확인에서 처음에는 탐침 하나만 실패해, "블록 레코드는 블록 줄을 실행하는 단계에만 있다"는 구조 검사를 더해 두 테스트가 잡게 했다. 구현 진행 2단계, `concept.test.ts`.</details>
4. 예제 3을 `.cjs`로 실행해도 `.mjs`와 같은 결과가 나오는데, 이유는 같은가?
   <details><summary>답</summary>결과는 같지만 이유가 다르다. 모듈의 최상위는 명세의 모듈 코드이고, CommonJS는 Node가 파일을 함수로 감싸 최상위가 함수 코드가 된다. 둘 다 전역 코드가 아니라 var·함수 선언이 전역 객체 프로퍼티가 되지 않는다. 외부 검토 1차 반영, 본문 전역 환경 레코드 절.</details>
5. strict 함수였다면 예제 5의 그림은 어떻게 달라지고, 그 차이를 코드로 관찰할 수 있는 예는?
   <details><summary>답</summary>LexicalEnvironment와 VariableEnvironment가 같은 함수 환경 레코드 하나를 가리키고 let l도 거기에 담긴다(FunctionDeclarationInstantiation의 strict 분기). 관찰 예는 직접 eval: sloppy 함수에서 최상위 `let x`와 `eval('var x')`는 SyntaxError, strict 함수에서는 오류 없이 eval이 새 레코드에 선언한다. 본문 함수 환경 절, 근거 테스트.</details>
