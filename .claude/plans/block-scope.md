# 블록 스코프: var와 let·const 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-28
- 기준: `main` @ `99d4a0a`

## 0. 요약

- 목적: 로드맵(13~24장) 2번 `/concepts/block-scope`를 추가한다. 블록 안의 `var`는 블록 밖에서도 보이고(함수 레벨 스코프) `let`·`const`는 블록 안에서만 보이며, 선언 없는 대입은 암묵적 전역을 만든다는 것을 중심으로 중복 선언·전역 객체 프로퍼티 여부·`const` 재할당·암묵적 전역과 `var`의 차이까지 예제 8개·퀴즈·"블록 스코프" 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개(category `execution`) + e2e·빌드 테스트 케이스 추가 + `docs/content-guide.md` 2곳(9단계 목록, 작성 원칙 문구 충돌 해소) + 로드맵. 공통 코드와 기존 개념 12개는 바꾸지 않는다.
- 위험: `let`·`const` 바인딩의 생성 시점(블록 진입)과 `var`의 소속 스코프를 잘못 그리는 것 → 예제에 스냅샷 코드를 끼워 그 위치의 실제 값(초기화 전이면 ReferenceError)과 대조한다.
- 복잡도: 중간 · Consensus: 생략 (scope-chain과 같은 구조, 공통 코드·새 공통 패턴 없음. 명세 원문과 vm 실행으로 사실을 미리 확인했고 위험 지점은 실제 실행 대조 테스트로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md`) 2번. 『모던 자바스크립트 Deep Dive』 14·15장 범위. 15장까지만 전제한다.
- 핵심: ① 블록 안의 `var`는 블록 밖에서도 보인다(함수 안이면 함수 스코프, 밖이면 전역 스코프에 속함) ② `let`·`const`는 블록 스코프에 속해 블록 밖에서 찾을 수 없다 ③ 선언 없이 대입하면 암묵적 전역이 생긴다.
- 사용자 결정(2026-10-28) 추가 항목 4개 모두 포함: ① 중복 선언(`var` 허용, `let`·`const`는 SyntaxError) ② 전역 객체 프로퍼티 여부(맨 바깥 `var`·암묵적 전역은 프로퍼티, `let`·`const`는 아님) ③ `const` 재할당 TypeError와 `const`에 담은 객체의 변경 ④ 암묵적 전역과 `var`의 차이(선언 처리 없음, `delete`).
- 사용자 결정(2026-10-28): 시뮬레이터는 `let`·`const` 이름을 블록에 들어갈 때 "초기화 전"으로 만들고 선언문에서 값을 넣는 것으로 그린다(명세와 일치). 선언 전에 읽으면 어떻게 되는지는 3번(TDZ)으로 미룬다.
- 사용자 결정(2026-10-28): `docs/content-guide.md` 작성 원칙의 "사용자가 아직 학습하지 않은 개념을 앞서 설명하지 않습니다"를 AGENTS.md 규칙에 맞게 고쳐 이번 커밋에 넣는다.

### 유지해야 하는 기존 동작

- 기존 개념 12개의 페이지·시뮬레이터·테스트는 그대로 통과하고 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 2개(`tests/e2e/navigation.spec.ts:17`, `:32`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다("전역 객체" 대신 tags에 `globalThis`).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위

- TDZ(선언문 전에 `let`·`const`를 읽으면 ReferenceError, 3번), `for (let …)`의 반복마다 새 바인딩(CreatePerIterationEnvironment — 관찰하려면 클로저가 필요, 10번), 블록 안 함수 선언(부록 B), `switch`의 CaseBlock 스코프, 전역 객체 자체(21장), 실행 컨텍스트, 변수의 생명주기·전역 변수를 줄이는 방법(14장 후반 — 9절 추가 게시글 후보), 모듈.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현은 `app/concepts/scope-chain/`(가장 최근: `scenarios.ts`의 `Scope`·`Lookup` 상태와 헬퍼, `ScopeView.tsx`의 찾기 패널·스코프 카드, `concept.test.ts`의 `snapshotAt`·`functionRanges`·정의 위치 표·음성 확인). e2e 상수 `tests/e2e/helpers.ts`(SCOPE_CHAIN), a11y·responsive·build-output의 scope-chain 케이스가 본보기. content-guide 9단계 목록 `docs/content-guide.md:164`, 원칙 문장 `docs/content-guide.md:177`.
- 기존 개념 연결: `scope-chain/meta.ts` 단순화 6이 암묵적 전역을 "별도 개념"으로 미뤘다. `hoisting/meta.ts` 단순화 4가 TDZ, 단순화 6이 블록과 `var`의 관계를 "별도 개념"으로 미뤘다. `primitives-and-objects`가 재할당과 변경을 다룬다.
- 명세(tc39.es/ecma262, 2026-10-28 원문 확인):
  - Block Evaluation(14.2.2): `{ }`(빈 블록)는 아무것도 하지 않는다. `{ StatementList }`는 항상 `NewDeclarativeEnvironment(oldEnv)`로 블록 환경을 만들고 BlockDeclarationInstantiation 뒤 실행, 끝나면 이전 환경으로 되돌린다(어떻게 빠져나가도).
  - BlockDeclarationInstantiation(14.2.3): 블록의 LexicallyScopedDeclarations마다 `const`는 `CreateImmutableBinding(name, true)`, 그 밖은 `CreateMutableBinding` — 초기화하지 않는다.
  - `var`는 VarScopedDeclarations로 함수(FunctionDeclarationInstantiation) 또는 스크립트(GlobalDeclarationInstantiation)에서 처리되어 블록 환경에 들어가지 않는다.
  - Script Early Errors(16.1.1): LexicallyDeclaredNames 중복, 또는 LexicallyDeclaredNames와 VarDeclaredNames가 겹치면 SyntaxError → 스크립트 전체가 실행되지 않는다.
  - Declarative Environment Record SetMutableBinding(9.1.1.1.5): strict binding이면 strict를 true로 바꾸고, 변경 불가 바인딩에 strict이면 TypeError → `const`(strict binding)는 sloppy mode에서도 재할당 TypeError.
  - PutValue(6.2.5.6): unresolvable 참조에 대입하면 strict이면 ReferenceError, 아니면 `Set(globalObj, name, value, false)` → 전역 객체에 프로퍼티(configurable).
  - CreateGlobalVarBinding(9.1.1.4.16): 맨 바깥 `var`는 전역 객체(Object Environment Record)에 바인딩을 만든다. GlobalDeclarationInstantiation은 `deletable`을 false로 넘겨 지울 수 없다. `let`·`const`는 전역 환경의 Declarative Record에 만들어져 전역 객체 프로퍼티가 아니다.
  - 앵커 존재 확인: `sec-block-runtime-semantics-evaluation`, `sec-blockdeclarationinstantiation`, `sec-let-and-const-declarations`, `sec-let-and-const-declarations-runtime-semantics-evaluation`, `sec-variable-statement`, `sec-scripts-static-semantics-early-errors`, `sec-declarative-environment-records-setmutablebinding-n-v-s`, `sec-putvalue`, `sec-createglobalvarbinding`, `sec-global-environment-records`, `sec-delete-operator-runtime-semantics-evaluation`, `sec-globaldeclarationinstantiation`, `sec-createperiterationenvironment`.
- 예제 초안 실제 출력(Node 24.22.1 `vm` + `util.format`, `runExample`과 같은 방식, 8절 1단계 원문 그대로):

  | # | 예제 | 출력 (클래식 스크립트) | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `block-var-let.js` | `사과 물` / `사과` / `undefined` | 같음 | 같음 |
  | 2 | `function-block.js` | `연필` / `undefined` | 같음 | 같음 |
  | 3 | `for-loop.js` | `3` / `undefined` | 같음 | 같음 |
  | 4 | `implicit-global.js` | `100` / `100` | ReferenceError | 같음 |
  | 5 | `implicit-vs-var.js` | `false` / `true` / `number` / `undefined` | SyntaxError | 같음(1단계 실행 확인) |
  | 6 | `global-object.js` | `서울` / `undefined` / `undefined` | `undefined` ×3 | `undefined` ×3 |
  | 7 | `redeclare.js` | `2` | 같음 | 같음 |
  | 8 | `const-object.js` | `2` | 같음 | 같음 |

- 본문·단순화 서술 근거(vm, 오류는 `e.name`): `let a = 1; let a = 2;` → SyntaxError, `var a = 1; let a = 2;` → SyntaxError, `let a = 1; var a = 2;` → SyntaxError, `const b = 1; b = 2;` → TypeError(sloppy), `const c;` → SyntaxError, `x; x = 1;` → ReferenceError(암묵적 전역은 대입 전에 없음), `var r = q; var q = 1; r` → `undefined`, `{ let z = 1; } z` → ReferenceError, `'use strict'; function f() { w = 1 } f()` → ReferenceError, `var dv = 1; delete dv` → `false`.

### 추정

- 없음

## 3. 구현 전략

- scope-chain과 같은 구조(예제 → meta → 시나리오·실제 실행 대조 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다. slug `block-scope`, category `execution`.
- 시뮬레이터 상태(`BlockState`)는 scope-chain 모양에 블록 스코프와 선언 종류를 더한다.
  - `Scope`: `id`, `label`(`전역 스코프`, `pick 함수 스코프`, `if 블록 스코프`), `kind: 'global' | 'function' | 'block'`, `outerId`, `bindings`.
  - `Binding`: `name`, `declaredBy: 'var' | 'let' | 'const' | 'function' | 'implicit'`, `value`(`Val` — `string`/`number`/`undefined`/`function`/`uninitialized`), `onGlobalObject?: true`(맨 바깥 `var`·함수 선언·암묵적 전역), `changed?: 'created' | 'initialized' | 'updated'`.
  - `Lookup`: scope-chain과 같음(`name`, `purpose: 'read' | 'assign'`, `path`). 암묵적 전역 대입 단계는 경로가 전역에서 `found: false`로 끝나고 같은 단계에 전역 스코프에 `implicit` 바인딩이 생긴다(예외로 명시).
- 화면: scope-chain `ScopeView`와 같은 2열(이름 찾기 / 스코프). 스코프 카드에 종류 배지(`전역`/`함수`/`블록`), 이름 행에 선언 배지(`var`/`let`/`const`/`함수 선언`/`암묵적 전역`), 전역 객체 프로퍼티면 `전역 객체 프로퍼티` 배지, 값이 `uninitialized`면 `초기화 전`(값 대신 표시).
- 단계 구성: 실행 전 → 전역 선언 처리 → 실행. 블록은 "블록 진입"(블록 스코프 생성 + `let`·`const` 초기화 전) / "블록 끝"(표시에서 뺌) 단계를 둔다. `if (true)` 조건 평가는 블록 진입 단계에 묶는다. 함수 호출은 scope-chain처럼 "이름 찾기"와 "호출 시작" 두 단계. `let x = 값` 선언문은 `purpose: 'assign'` 찾기 + `changed: 'initialized'`.
- 시나리오 3개: `block-var-let`(예제 1, 블록 안 `var`는 전역에·`let`은 블록에), `function-block`(예제 2, 블록 안 `var`가 함수 스코프에 속하고 빈 블록 스코프가 생김), `implicit-global`(예제 4, 찾기 실패 → 전역 객체 프로퍼티 생성). 예제 3·5·6·7·8은 예제·퀴즈·본문으로 다룬다.
- 정확성 검증: (a) 공통 불변식 (b) 구조(scope-chain과 같은 경로 규칙 + 블록 스코프의 `outerId`는 진입 직전 현재 스코프) (c) 함수 정의 위치 표를 소스에서 계산해 대조 (d) 스냅샷 대조: 찾은 값·선언 처리·블록 진입 상태를 예제의 그 위치에서 실제로 읽은 값과 비교하고, `uninitialized`로 표시한 이름은 그 위치에서 읽으면 ReferenceError인지 확인 (e) `onGlobalObject` 표시는 그 위치에서 `Object.prototype.hasOwnProperty.call(globalThis, name)`(테스트 코드 안에서만)과 비교 (f) 암묵적 전역 단계 직전에는 프로퍼티가 없고 직후에는 있음.
- 버린 대안: ① `let`을 선언문에서 처음 나타나게 그리기 — 명세와 다르고 3번(TDZ)에서 설명을 뒤집어야 한다(사용자 결정). ② 전역 스코프 카드를 객체 레코드/선언적 레코드 두 칸으로 나누기 — 환경 레코드 구조(9번)를 앞서 보인다. `전역 객체 프로퍼티` 배지로 충분하다. ③ `for (let …)` 시나리오 — 반복마다 새 바인딩을 정확히 그리면 클로저 전에는 관찰할 수 없는 구조가 늘고, 대충 그리면 명세와 다르다. 예제 3 + 단순화로 다룬다. ④ 중복 선언·`const` 재할당 오류를 예제로 — 오류는 실행을 멈추므로 본문 + 테스트로 다룬다(기존 개념과 같은 방식). ⑤ scope-chain `ScopeView` 재사용 — 개념 간 공유 부품은 `app/simulator/`뿐(AGENTS). 클래스 문자열만 같게 쓴다.

## 4. 변경 파일

- 추가 `app/concepts/block-scope/`:
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 8개(2절 표)
  - `scenarios.ts`, `BlockView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `BLOCK_SCOPE_PATH`, `BLOCK_SCOPE_SIMULATOR_NAME`(`'블록 스코프 시뮬레이터'`)
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`: scope-chain 케이스를 본떠 뒤에 추가
  - `docs/content-guide.md`: 9단계 목록에 `block-scope` 추가(`:164`), 작성 원칙 문장 교체(`:177`, 사용자 결정)
  - `.claude/plans/concept-roadmap-ch13-24.md`: 2번 계획 문서·상태, 진행 기록, 9절 추가 게시글 후보
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, `tests/e2e/navigation.spec.ts`, 기존 개념 폴더 12개(`scope-chain`·`hoisting`의 `related` 역방향 연결은 9절 후보), `package.json`, `AGENTS.md`.

## 5. 위험 요소

- `let`·`const` 생성 시점, `var` 소속 스코프, 블록 스코프의 바깥 연결을 잘못 그림 → 3절 검증 (b)~(f) + 음성 확인(`fruit`를 블록 스코프에 넣으면 실패, `drink`를 선언문 단계에서 처음 만들면 실패).
- "`let`은 호이스팅되지 않는다"·"블록이 끝나면 변수가 사라진다" 같은 서술 → 본문은 "블록에 들어갈 때 만들어지고 선언문에서 값이 들어간다", "블록이 끝나면 바깥 스코프로 돌아가 블록의 이름은 찾지 않는다"로 쓰고, 표시에서 빼는 것은 단순화에 밝힌다. 선언 전 읽기의 결과는 쓰지 않는다(3번).
- "암묵적 전역 = 전역 변수 선언" 오개념 → "전역 객체의 프로퍼티가 생긴다, 선언이 아니라 선언 처리 때 만들어지지 않는다"로 쓰고 근거 테스트를 둔다(scope-chain 리뷰 High ① 기준).
- `const` 재할당 TypeError를 "strict mode에서만"으로 잘못 쓰기 → const 바인딩은 strict binding이라 항상 TypeError(9.1.1.1.5), 테스트로 sloppy 확인.
- 중복 선언 SyntaxError를 "두 번째 줄에서 오류"처럼 실행 중 오류로 쓰기 → 스크립트 전체가 실행 전에 거부된다(early error)고 쓰고, 테스트는 첫 줄의 출력이 없음을 확인(예: `console.log(1); let a; let a;`가 아무것도 출력하지 않고 SyntaxError).
- 모듈·CommonJS에서 예제 4·5·6 결과가 다름 → 본문에 클래식 스크립트 기준임을 밝히고 2절 표의 다른 결과를 근거 테스트로 둔다.
- 브라우저 `window` 고유 이름과 겹치는 예제 이름 → `fruit`·`drink`·`item`·`pick`·`i`·`j`·`score`·`setScore`·`kept`·`removed`·`city`·`town`·`village`·`level`·`box`를 1단계에서 Chromium `in window`로 확인.
- `객체` 검색 2건 → meta 세 필드에 `객체` 없음을 1단계 완료 조건으로.
- 375px에서 배지가 많아 넘침 → `flex-wrap`, `break-words [overflow-wrap:anywhere]`, e2e 가로 스크롤 검사.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`, 본문 주장 검증(2절 목록 + 모듈·CommonJS), 시나리오 대조(3절 a~f), 음성 확인(5절).
- 브라우저(빌드 결과 `serve` 4175, 사용자 dev 서버 5173은 건드리지 않음):
  1. 첫 화면: "검토 중" 배지, 분류 '실행 모델', 선행 개념 `scope-chain`·`hoisting` 링크, 퀴즈 라디오 UI.
  2. `블록 안의 var와 let`: 전역 선언 처리 단계에 `fruit = undefined`(`var`·`전역 객체 프로퍼티`), 블록 진입 단계에 `if 블록 스코프`와 `drink` `초기화 전`(`let`), 2번 줄 대입 경로 블록 없음 → 전역 있음, 마지막 단계 `typeof drink` 경로 전역 없음, 콘솔 `사과 물`/`사과`/`undefined`.
  3. `함수 안의 블록`: 호출 시작 단계 `pick 함수 스코프`에 `item = undefined`, 블록 진입 단계에 빈 `if 블록 스코프`(이름 없음), 3번 줄 대입 경로 블록 없음 → pick 있음, 콘솔 `연필`/`undefined`.
  4. `암묵적 전역`: 2번 줄 대입 경로 setScore 없음 → 전역 없음, 같은 단계에 전역 스코프 `score = 100`(`암묵적 전역`·`전역 객체 프로퍼티`), 콘솔 `100`/`100`.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home, 콘솔 에러 0.
  6. 홈: '실행 모델' 그룹 카드 3개, 카드 13개, `객체` 검색 2건, `블록` 검색 1건 이상(새 개념 포함).

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route·본문 주장 검증

- 대상: `examples/*.js` 8개, `meta.ts`, `route.tsx`, `content.mdx`(필수 h2 자리표시), `concept.test.ts`(본문 주장 검증)
- 변경:
  - 예제 원문(이 그대로, 파일 끝 줄바꿈 하나, 들여쓰기 2칸, 작은따옴표):
    - `block-var-let.js`
      ```js
      if (true) {
        var fruit = '사과';
        let drink = '물';
        console.log(fruit + ' ' + drink);
      }
      console.log(fruit);
      console.log(typeof drink);
      ```
    - `function-block.js`(7줄은 빈 줄)
      ```js
      function pick() {
        if (true) {
          var item = '연필';
        }
        return item;
      }

      console.log(pick());
      console.log(typeof item);
      ```
    - `for-loop.js`(3줄은 빈 줄)
      ```js
      for (var i = 0; i < 3; i++) {}
      console.log(i);

      for (let j = 0; j < 3; j++) {}
      console.log(typeof j);
      ```
    - `implicit-global.js`(4줄은 빈 줄)
      ```js
      function setScore() {
        score = 100;
      }

      setScore();
      console.log(score);
      console.log(globalThis.score);
      ```
    - `implicit-vs-var.js`
      ```js
      var kept = 1;
      removed = 2;
      console.log(delete kept);
      console.log(delete removed);
      console.log(typeof kept);
      console.log(typeof removed);
      ```
    - `global-object.js`
      ```js
      var city = '서울';
      let town = '마포';
      const village = '합정';
      console.log(globalThis.city);
      console.log(globalThis.town);
      console.log(globalThis.village);
      ```
    - `redeclare.js`
      ```js
      var level = 1;
      var level = 2;
      console.log(level);
      ```
    - `const-object.js`
      ```js
      const box = { count: 1 };
      box.count = 2;
      console.log(box.count);
      ```
  - `meta.ts`:
    - `slug: 'block-scope'`, `category: 'execution'`
    - `title: '블록 스코프: var와 let·const는 어디까지 보일까'`
    - `summary`(160자 이하, `객체` 없음): `'블록 안에서 var로 선언한 변수는 블록 밖에서도 보이지만 let·const는 블록 안에서만 보입니다. 선언 없이 대입하면 암묵적 전역이 생기고, let·const의 중복 선언과 const 재할당은 오류입니다.'` (1단계에서 길이 확인)
    - `tags`: `['블록 스코프', 'block scope', '함수 레벨 스코프', 'var', 'let', 'const', '암묵적 전역', '중복 선언', '재할당', 'globalThis', 'SyntaxError', 'TypeError']`
    - `goals`: ① 블록 안의 `var`와 `let`·`const`가 어느 스코프에 만들어지는지 설명할 수 있다. ② `let`·`const` 이름이 블록에 들어갈 때 만들어지고 선언문에서 값이 들어간다는 것을 설명할 수 있다. ③ 선언 없는 대입이 만드는 암묵적 전역과 `var` 선언의 차이를 구분할 수 있다. ④ 중복 선언, `const` 재할당, 전역 객체 프로퍼티 여부에서 `var`와 `let`·`const`의 결과를 예측할 수 있다.
    - `prerequisites`: `[{ label: '스코프 체인', slug: 'scope-chain' }, { label: '호이스팅', slug: 'hoisting' }, { label: '원시 값과 객체', slug: 'primitives-and-objects' }]` (마지막은 `const` 객체 변경 연결; slug 존재 1단계 확인)
    - `related`: `[]`
    - `examples`: 2절 표의 클래식 스크립트 출력(처음에는 `[]`, `npm test` 실제 출력 확인 후 채움). id = 파일명에서 `.js` 뺀 것, 순서 = 2절 표 번호.
    - `simplifications`:
      1. "'스코프' 카드는 명세의 환경 레코드(Environment Record)를 단순화한 것입니다. 전역 스코프는 명세에서 전역 객체 쪽과 선언 쪽 두 부분으로 이루어지지만, 이 페이지는 '전역 객체 프로퍼티' 표시로만 구분합니다. 환경 레코드는 별도 개념에서 다룹니다."
      2. '블록 실행이 끝나면 그 블록의 스코프를, 함수가 끝나면 그 함수의 스코프를 표시에서 뺍니다. 끝난 스코프가 어떻게 되는지는 클로저 개념에서 다룹니다.'
      3. "'초기화 전' 상태의 이름을 선언문보다 앞에서 읽으면 어떻게 되는지(TDZ)는 별도 개념에서 다룹니다. 이 페이지의 예제는 선언문 뒤에서만 읽습니다."
      4. "for 문의 let 변수는 반복마다 새로 만들어지지만, 이 차이는 클로저와 함께 별도 개념에서 다룹니다. 이 페이지는 for 문 밖에서 찾을 수 없다는 점만 다룹니다."
      5. 'if 조건을 평가하는 과정은 블록 진입 단계에 묶었고, console과 globalThis를 찾는 과정은 표시하지 않습니다. globalThis는 전역 객체를 가리키는 이름이며 전역 객체는 별도 개념에서 다룹니다.'
      6. '이 페이지의 예제는 strict mode가 아닌 클래식 스크립트 기준입니다. ES 모듈(항상 strict mode)에서는 예제 4가 ReferenceError, 예제 5가 SyntaxError이고, ES 모듈과 Node.js CommonJS에서는 예제 6의 세 값이 모두 undefined입니다.'
      7. '블록 안의 함수 선언은 strict mode 여부와 호스트에 따라 동작이 달라 다루지 않습니다.'
    - `references`: 명세 Block Evaluation(`sec-block-runtime-semantics-evaluation`), BlockDeclarationInstantiation, Let and Const Declarations(`sec-let-and-const-declarations`), Variable Statement(`sec-variable-statement`), Scripts Early Errors(`sec-scripts-static-semantics-early-errors`), PutValue(`sec-putvalue`), CreateGlobalVarBinding, SetMutableBinding(Declarative)(`sec-declarative-environment-records-setmutablebinding-n-v-s`), MDN `let`·`const`·`var`·'블록'(Statements/block) — 1단계에서 200·제목 확인(한국어 없으면 en-US). 라벨 형식은 scope-chain 따름.
    - `reviewedAt: null`
  - `concept.test.ts` 본문 주장 검증: 2절 "본문·단순화 서술 근거" 전부 + `console.log(1); let a = 1; let a = 2;` 실행 시 출력 없이 SyntaxError(early error) + 2절 표의 `.mjs`·`.cjs` 결과(별도 node 프로세스, scope-chain 방식).
- 완료 조건: `npm test`에서 새 예제 8개 L1 통과(출력 = 2절 표), meta 무결성·본문 주장 테스트 통과, `title`·`summary`·`tags`에 `객체` 없음, `window` 이름 충돌 확인 기록, MDN 링크 200 기록, `.cjs` 예제 5 결과를 2절 표에 기록.

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오 부분)
- 변경:
  - 3절 상태 타입. `Val`의 `uninitialized`는 `display: '초기화 전'`.
  - 시나리오 3개(id/label): `block-var-let`/`블록 안의 var와 let`, `function-block`/`함수 안의 블록`, `implicit-global`/`암묵적 전역`.
    - `block-var-let`: 실행 전 → 전역 선언 처리(`fruit` var undefined, 전역 객체 프로퍼티) → 블록 진입(1~5줄, `if 블록 스코프` outer 전역, `drink` let 초기화 전) → 2줄 `fruit` 대입(블록 ✗ → 전역 ✓ '사과') → 3줄 `drink` 선언문(블록 ✓, initialized '물') → 4줄 `fruit` 읽기(블록 ✗ → 전역 ✓) → 4줄 `drink` 읽기(블록 ✓, 출력 `사과 물`) → 블록 끝(5줄) → 6줄 `fruit` 읽기(전역 ✓, 출력 `사과`) → 7줄 `typeof drink`(전역 ✗, 출력 `undefined`).
    - `function-block`: 실행 전 → 전역 선언 처리(`pick` 함수, 전역 객체 프로퍼티) → 8줄 `pick` 찾기 → 호출 시작(1~6줄, `pick 함수 스코프` outer 전역, `item` var undefined) → 블록 진입(2~4줄, `if 블록 스코프` outer pick, 이름 없음) → 3줄 `item` 대입(블록 ✗ → pick ✓ '연필') → 블록 끝(4줄) → 5줄 `item` 읽기(pick ✓) → pick 끝(6줄, 출력 `연필`) → 9줄 `typeof item`(전역 ✗, 출력 `undefined`).
    - `implicit-global`: 실행 전 → 전역 선언 처리(`setScore` 함수) → 5줄 `setScore` 찾기 → 호출 시작(1~3줄, 이름 없음) → 2줄 `score` 대입(setScore ✗ → 전역 ✗; 같은 단계에 전역 스코프에 `score = 100` implicit·전역 객체 프로퍼티·created) → setScore 끝(3줄) → 6줄 `score` 읽기(전역 ✓, 출력 `100`) → 7줄 `globalThis.score`(찾기 표시 없음, 출력 `100`).
  - 설명 문장 용어: "블록에 들어갑니다", "블록 스코프", "초기화 전", "값이 들어갑니다", "전역 객체의 프로퍼티", "찾지 못하면". "사라진다"·"메모리"·"호이스팅되지 않는다" 금지.
  - 테스트(scope-chain `concept.test.ts`를 본뜸): 공통 불변식, 구조·찾기 경로(예외: `implicit-global`의 대입 단계와 두 시나리오의 마지막 `typeof` 단계만 `found: false`로 끝남), 함수 정의 위치 표(소스 계산 대조), 블록 스코프 `outerId` = 직전 단계 `currentId`, 블록 진입 단계의 `let`·`const` 이름은 소스의 그 블록 안 `let`·`const` 선언과 일치, `var` 이름은 블록 스코프에 없음, 스냅샷 대조(값, `uninitialized`면 그 위치 읽기가 ReferenceError, `onGlobalObject` = 실제 own property 여부), 암묵적 전역 대입 전후 own property 여부.
- 완료 조건: 이 개념 테스트 전부 통과 + 음성 확인 2가지(5절) 실패 확인 후 되돌림(구현 진행에 기록).

### 3. 시각화 `BlockView`

- 대상: `BlockView.tsx`, `BlockView.test.tsx`
- 변경: scope-chain `ScopeView.tsx` 구성 + 3절 화면 추가 요소(종류 배지, 선언 배지, `전역 객체 프로퍼티` 배지, `초기화 전`). 빈 상태·`lookup` 없음·끝까지 못 찾음 문구는 scope-chain과 같게. 클래스 문자열 같게.
- 완료 조건: `BlockView.test.tsx`가 ① 실행 전 문구 ② 블록 진입 단계의 `if 블록 스코프`·`블록` 배지·`drink`의 `초기화 전`·`let` 배지 ③ `fruit`의 `var`·`전역 객체 프로퍼티` 배지 ④ 암묵적 전역 단계의 `끝까지 찾지 못했습니다.`와 `암묵적 전역` 배지 ⑤ `changed` 배지(`새로 생김`/`값이 들어감`/`값이 바뀜`)를 확인하고 통과.

### 4. 래퍼 `Simulator`

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="블록 스코프 시뮬레이터"`, scope-chain 래퍼와 같은 모양. 테스트도 scope-chain과 같은 항목(첫 화면, 3단계 줄 강조, 시나리오 전환, 마지막 단계 콘솔 출력).
- 완료 조건: 테스트 통과, typecheck 통과.

### 5. 본문 `content.mdx`

- 변경:
  - `## 동작 원리`: 블록(`{ }`로 묶은 문장)과 블록 스코프(실행할 때마다 만들어짐, 빈 블록 제외), 블록에 들어갈 때 `let`·`const` 이름이 만들어지고 선언문에서 값이 들어감(BlockDeclarationInstantiation; 선언 전 읽기는 다음 개념), `var`는 블록과 무관하게 함수 스코프/전역 스코프에 만들어짐(함수 레벨 스코프), 블록이 끝나면 바깥 스코프로 돌아감. 중복 선언(early error, 스크립트 전체 거부), `const`(초기값 필수, 재할당 TypeError — sloppy에서도, 객체 변경은 가능 — `primitives-and-objects` 링크), 암묵적 전역(PutValue; 선언이 아님 → 선언 처리 때 없음·`delete` 가능, strict는 ReferenceError — scope-chain 단순화 6과 같은 서술), 전역 객체 프로퍼티 여부(맨 바깥 `var`·함수 선언·암묵적 전역은 프로퍼티, `let`·`const`는 아님; `globalThis` 한 줄 소개), 클래식 스크립트 기준 한 문단(모듈·CommonJS 차이).
  - `## 예제`: 예제 8개(`file=`), 퀴즈 8개, 시뮬레이터(예제 1·2·4).
  - `## 결과와 이유`: 예제별 "예제 N의 …" 문단 + 오해 Callout 5개: ① 블록 안의 `var`는 블록 안에서만 보인다 ② `let`은 선언문에 도달해야 만들어진다(→ 블록 진입 때 만들어지고 선언문에서 값이 들어감, 선언 전 읽기는 다음 개념) ③ 선언 없이 대입하면 전역 변수가 선언된다(→ 전역 객체 프로퍼티, 선언 처리 없음, `delete` 가능, strict는 ReferenceError) ④ `const`면 값을 바꿀 수 없다(→ 다시 대입할 수 없을 뿐 담긴 객체는 변경 가능) ⑤ 맨 바깥의 `let`도 전역 객체의 프로퍼티다.
- 주의사항: 15장까지만 전제(TDZ 결과·실행 컨텍스트·환경 레코드 구조·클로저·전역 객체 상세 설명 금지). 용어 첫 등장 영어 병기: 블록 스코프(block scope), 함수 레벨 스코프(function-level scope), 암묵적 전역(implicit global). "사라진다"·"메모리"·"`let`은 호이스팅되지 않는다" 금지. 스타일 권고("var를 쓰지 마라") 금지. Callout 인라인 코드 함정, `**` 금지.
- 완료 조건: `npm test` 통과, build 후 HTML `<details` 8개 이상·`**` 0·공백 깨진 인라인 code 0, 메인이 본문 전문을 명세·2절 실행 결과와 대조(구현 진행에 기록).

### 6. e2e·빌드 테스트·문서

- 대상: `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(`:164`, `:177`), 로드맵
- 변경: scope-chain 케이스를 본떠 추가(a11y 반복 상한은 최대 단계 수보다 크게). content-guide `:177`을 다음으로 교체: "- 페이지가 다루는 장 이후의 개념(예: 13장 페이지에서 실행 컨텍스트, TDZ)을 앞서 설명하지 않습니다. 필요하면 `prerequisites`에 `label`만 적고, 단순화한 부분은 `simplifications`에 \"별도 개념에서 다룬다\"고 밝힙니다." 로드맵 2번 상태·계획 문서, 진행 기록, 추가 게시글 후보(9절) 기록.
- 완료 조건: `npm run test:build`·`npm run e2e` 통과, 6절 브라우저 시나리오 1~6 확인 기록, content-guide 두 곳 diff 확인.

## 9. 추가 개선 후보

- 추가 게시글 후보(로드맵 결정, 사용자 확인 후 로드맵에 추가):
  - "전역 변수를 줄이는 방법: 즉시 실행 함수·모듈 패턴"(14장 후반) — 모듈 패턴은 클로저(10번)가 필요하므로 10번 뒤.
  - "for 문의 let: 반복마다 새 바인딩"(15장, CreatePerIterationEnvironment) — 클로저로만 관찰되므로 10번 뒤.
- `scope-chain/meta.ts`·`hoisting/meta.ts`의 `related`에 `block-scope` 역방향 연결(기존 개념 수정, 사용자 확인).

## 변경 이력

- 2026-10-28 (사용자 요청 — 외부 콘텐츠 검토 반영): 지적 7건을 명세·실행으로 검증해 6건 반영, 1건 일부 반영. ① 중복 선언: `let`·`const`와 같은 이름의 `var`가 그 블록·함수·스크립트 안쪽 어디에 있어도 SyntaxError(Block·함수 본문 Early Errors), 바깥에 있으면 허용 → 본문 문장 교체, Block Early Errors 참고 링크 추가 ② DevTools 콘솔: Chromium REPL 모드(`Runtime.evaluate` `replMode`)에서 따로 입력한 `let` 재선언은 허용(재현), 예제 5 `delete kept`는 콘솔에서도 `false`(지적과 달리 재현 안 됨) → 재현된 동작만 근거로 "예제는 .html의 <script>로 확인" 문장 추가 ③ 요약에 strict mode 단서 ④ `globalThis`: 명세상 값은 `[[GlobalThisValue]]`(호스트가 정함) → "가리키는 이름" 단정 제거(본문·단순화 5·시나리오 설명) ⑤ `for…in`·`for…of` 머리의 `const` 예외 한 줄 ⑥ 블록 = 문장 자리의 `{ }`(함수 본문·객체 리터럴의 `{ }`는 블록 아님) 한 줄 ⑦ 스크립트가 나뉘면 두 번째 스크립트의 선언 처리에서 SyntaxError(어떤 줄도 실행 전) 한 줄. 근거 테스트 추가. 범위·접근 방식 변화 없음 — 영향 단계 1(meta), 2(시나리오 설명 1문장), 5(본문).
- 2026-10-28 (사용자 요청 — 추가 검토 반영): 중복 선언 문장 "let·const가 있는 블록·함수·스크립트 안쪽 어디에 같은 이름의 var가 있어도 충돌"이 함수 경계를 무시한 과장 → "let·const가 선언된 블록(함수 본문·스크립트) 안이면 몇 겹의 블록 안쪽 var도 충돌, 그 블록 바깥의 var나 안쪽 함수 안의 var는 충돌하지 않음"으로 교체, 충돌하지 않는 예 `let x; function f() { var x; }` 추가. 검토 제안 문구("같은 함수 안이면 충돌")는 `{ let a = 1; } var a = 2;`(같은 스크립트, 허용)와 맞지 않아 그대로 쓰지 않음 — 영향 단계 5.

## 구현 진행

- baseline (2026-10-28, `99d4a0a`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 49파일 1091 통과(메인 재실행). `test:build` 98 통과·`e2e` 175 통과(3 skipped, 프로젝트 전용)는 같은 커밋의 직전 검증 결과(scope-chain 구현 진행). dev 서버 5173 실행 중(빌드 산출물과 무관), serve 4175 미실행.
- 사전 확인(메인): Chromium(Playwright)에서 예제 이름 15개 중 `in window`인 것 없음(`[]`). MDN ko `Statements/let`·`const`·`var`·`block`, `Global_Objects/globalThis` 모두 200(제목 확인).
- [x] 1. 예제·meta·route·본문 주장 검증 — 메인 재실행: lint·format:check·typecheck 통과, `npm test` 50파일 1134 통과. 예제 8개 원문·줄 번호·끝 줄바꿈 확인, 실제 출력 = 2절 표, 예제 5 `.cjs` = 클래식 스크립트와 같음(테스트로 고정, 2절 표 갱신). `title`·`summary`·`tags`에 `객체` 없음. 본문 주장 10개 + early error(출력 없이 SyntaxError) + `.mjs`·`.cjs` 차이 테스트.
- [x] 2. 시나리오와 대조 테스트 — 메인 재실행: lint·format:check·typecheck 통과, `npm test` 50파일 1180 통과(이 개념 71). 단계 수 10/10/8. 음성 확인(서브에이전트 실행, 메인이 테스트 코드 확인): `fruit`를 블록 스코프로 옮기면 블록 진입·changed·스냅샷 테스트 3개 실패, `drink`를 선언문 단계에서 처음 만들면 블록 진입 테스트 실패, 되돌린 뒤 통과. 못 찾고 끝나는 경로 허용 목록(두 시나리오 마지막 typeof, 암묵적 전역 대입)을 정확히 단언. 메인 수정 1건: 전역 선언 처리 설명에 "if 블록 안에 쓴 var fruit"이 전역에서 처리됨을 드러냄.
- [x] 3. 시각화 `BlockView` — 메인 재실행: lint·format:check·typecheck 통과, `npm test` 52파일 1190 통과. `BlockView.test.tsx` 6개(빈 상태, 블록 진입 배지·초기화 전, 값이 들어감, 암묵적 전역 경로·배지, 함수 안 빈 블록, lookup 없음). `초기화 전`은 `name = 값` 대신 이름 + 배지로 표시(값처럼 읽히지 않게, 서브에이전트 결정 수용). 클래스 문자열은 `ScopeView.tsx`와 같음.
- [x] 4. 래퍼 `Simulator` — `label="블록 스코프 시뮬레이터"`, `Simulator.test.tsx` 4개 통과(첫 화면, 3단계 블록 진입 여러 줄 강조, 시나리오 전환, 마지막 단계 콘솔).
- [x] 5. 본문 content.mdx — 서브에이전트 작성(본문 주장 테스트 2개 추가: 맨 바깥 함수 선언은 전역 객체 프로퍼티, strict mode의 식별자 `delete`는 SyntaxError) 후 메인이 전문을 명세·실행 결과와 대조해 2곳 수정: ① "이렇게 만들어진 변수를 암묵적 전역이라 부릅니다" → "선언 없는 대입으로 만들어진 전역 객체의 프로퍼티"(변수 선언 오개념, Callout ③과 모순) ② 예제 2 결과 설명의 "pick() 호출이 끝난 뒤라 찾는 경로에 없다"(동적 스코프 오해 유발) → "전역 스코프에서는 바깥 방향으로만 찾으므로". 메인 재실행: `npm test` 52파일 1192 통과, lint·format·typecheck 통과, build 성공, HTML `<details` 8·`**` 0·공백 깨진 인라인 code 0(181개 중).
- [x] 6. e2e·빌드 테스트·문서 — 기존 케이스 수정 없이 추가만. content-guide `:164` 목록에 `block-scope`, `:177` 원칙 문장을 "페이지가 다루는 장 이후의 개념…"으로 교체(diff 확인). 로드맵 2번 행·추가 게시글 후보(사용자 확인 대기)·진행 기록 갱신(메인). 메인 전체 재실행: lint·format·typecheck 통과, `npm test` 52파일 1192, `test:build` 105, `e2e` 187 통과·3 skipped(기존 프로젝트 전용). 브라우저(빌드 serve 4175, Playwright, 데스크톱 라이트·375px 다크): 시나리오 1~4 기대 텍스트 일치(블록 진입 때 `drink` 초기화 전·`let`, `fruit` 전역·`전역 객체 프로퍼티`, 함수 안 빈 블록 스코프, 암묵적 전역 경로·배지), 검토 중·'실행 모델'·선행 링크 3개·라디오 퀴즈 8, 키보드 Home/→, 가로 넘침 0, 콘솔 에러 0, 홈 카드 13·`객체` 2·`블록` 1. 375px 다크 스크린샷 육안 확인.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가 + 문서 2줄): 새 Critical/High 0(본문의 명세 불일치 2건은 5단계 메인 대조에서 이미 수정). 확인한 것: 단순화 1~7과 본문 서술이 명세 절(Block 평가 빈 블록 예외·복원, BlockDeclarationInstantiation, Scripts Early Errors 양방향, const strict binding, PutValue, CreateGlobalVarBinding deletable false)과 일치, 모든 실행 결과 주장에 테스트 존재(모듈·CommonJS 포함), 스냅샷은 vm 컨텍스트 안에서 읽음(`concept.test.ts` 생성 코드 안 `hasOwnProperty`), 하이드레이션(BlockView 효과·window 접근 없음), content-guide diff 2줄만. Low 0.
- [x] 7. 외부 검토 반영(변경 이력 2026-10-28) — 메인 직접(본문·meta·시나리오 설명 문장과 근거 테스트). 검증 근거: vm(`let x; if (true) { var x; }`·함수 안 → SyntaxError, `{ let a = 1; } var a = 2; a` → 2, `for (const k in …)` 동작, 두 스크립트 사이 충돌은 컴파일은 되고 실행 시 SyntaxError·출력 없음), 명세 원문(Block Early Errors `sec-block-static-semantics-early-errors`, globalThis = `[[GlobalThisValue]]` `sec-globalthis`, EvalDeclarationInstantiation `deletable` true), Chromium REPL 모드(`Runtime.evaluate` `replMode: true`, Playwright CDP): 따로 입력한 `let` 재선언 허용·한 입력 안 재선언은 SyntaxError, 예제 5는 `false / true / number / undefined`(지적의 `true`는 재현 안 됨, `<script>` 실행과 같음). 콘솔 문장은 재현된 동작만 쓰고 "재현되지 않을 수 있다"로 한정. 근거 테스트 3개 추가. 재실행: lint·format·typecheck 통과, `npm test` 52파일 1195, `test:build` 105, HTML `<details` 8·`**` 0·공백 깨진 인라인 code 0(201개 중). e2e: 이 개념 a11y 12건 통과(light·dark, 데스크톱·모바일) + 가로 스크롤 검사 재실행(아래 기록).
- 7단계 e2e 재실행 기록: 가로 스크롤 검사 54건 통과(block-scope 데스크톱·모바일 4건 포함).
- [x] 8. 추가 검토 반영 — vm 확인: `let x; function f() { var x; }`·`function g() { let y; function h() { var y; } }`·`function k() { { let b; } var b; }` 허용, `let x; if (true) { if (true) { var x; } }` SyntaxError. 근거 테스트 1개 추가. 재실행: lint·format·typecheck 통과, `npm test` 52파일 1196, `test:build` 105, HTML `<details` 8·`**` 0·공백 깨진 인라인 code 0, 이 개념 e2e 12건 통과.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 달라진 점: ① 사용자가 전달한 외부 콘텐츠 검토 두 차례를 반영했다(변경 이력 2건, 구현 진행 7·8) — 중복 선언 범위(함수 경계에서 멈춤), DevTools 콘솔 차이, 요약의 strict mode 단서, `globalThis` 서술, `for…in`·`for…of` 머리의 `const`, 블록의 정의, 스크립트가 나뉠 때의 충돌. ② 본문 대조에서 "변수를 암묵적 전역"·"pick() 호출이 끝난 뒤라" 두 문장을 고쳤다(구현 진행 5).
- 완료 조건 변경 없음.

### 코드 리뷰

- 리뷰 1차 새 Critical/High 0(본문의 명세 불일치 2건은 구현 진행 5에서 이미 수정), Medium/Low 0. 외부 검토 지적은 명세·실행으로 검증해 반영했고, 재현되지 않은 주장(콘솔에서 `delete kept`가 `true`)과 부정확한 제안 문구("같은 함수 안이면 충돌")는 그대로 쓰지 않았다.

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `reviewedAt` 기록
- [ ] 추가 게시글 후보 2건(즉시 실행 함수·모듈 패턴, for 문의 let 반복마다 새 바인딩) 사용자 결정 — 로드맵에 대기로 기록
- [ ] `scope-chain/meta.ts`·`hoisting/meta.ts` `related`에 `block-scope` 역방향 연결(기존 개념 수정, 사용자 확인)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 외부 검토의 "DevTools 콘솔에서는 `delete kept`가 `true`" 주장은 반영하지 않고, 재현된 동작(따로 입력한 줄 사이의 `let` 재선언 허용)만 근거로 "재현되지 않을 수 있다, `.html`의 `<script>`로 확인하라"고 썼다 — Chromium REPL 모드(`Runtime.evaluate` `replMode: true`)에서 예제 5는 `false / true / number / undefined`로 `<script>` 실행과 같았다. 확인되지 않은 호스트 동작을 사실처럼 쓰지 않는다는 원칙.
- [Claude 판단] 중복 선언 문장을 검토 제안("같은 함수 안이면 충돌")이 아니라 "`let`·`const`가 선언된 블록(함수 본문·스크립트) 안이면 몇 겹의 블록 안쪽 `var`도 충돌, 그 블록 바깥의 `var`나 안쪽 함수 안의 `var`는 충돌하지 않음"으로 썼다 — `{ let a = 1; } var a = 2;`는 같은 스크립트·같은 함수 수준인데 허용된다. Early Errors는 각 블록·함수 본문·스크립트의 LexicallyDeclaredNames와 그 안의 VarDeclaredNames를 비교하고, VarDeclaredNames는 블록은 넘지만 함수 경계에서 멈춘다.
- [Claude 판단] 시각화에서 `초기화 전`을 `name = 값` 자리에 쓰지 않고 이름 + 배지로 표시했다(서브에이전트 결정 수용) — 값처럼 읽히면 "초기화 전이라는 값이 들어 있다"는 오해가 생긴다.
- [무검토 승인] `for (let …)`의 반복마다 새 바인딩은 시나리오로 그리지 않고 예제 3 + 단순화로만 다뤘다 — 정확히 그리면 클로저(10번) 전에는 관찰할 수 없는 구조가 늘고, 대충 그리면 명세와 다르다. 추가 게시글 후보로 10번 뒤에 제안.
- [무검토 승인] 전역 스코프 카드를 객체 레코드/선언적 레코드 두 칸으로 나누지 않고 `전역 객체 프로퍼티` 배지로만 구분했다 — 환경 레코드 구조는 9번(실행 컨텍스트) 내용이다.
- [무검토 승인] 시나리오 정확성은 예제에 스냅샷 코드를 끼워 vm 컨텍스트 안에서 읽은 값과 대조하고, `초기화 전`으로 그린 이름은 그 위치에서 읽으면 ReferenceError인지, `전역 객체 프로퍼티` 표시는 `hasOwnProperty.call(globalThis, name)`와 같은지 확인했다.
- `let`·`const`를 블록 진입 때 `초기화 전`으로 만드는 그림, 추가 항목 4개 포함, content-guide 원칙 문구 수정은 사용자가 직접 결정했다.

#### 배경지식

- Block 평가(14.2.2): `{ }`는 아무것도 하지 않고, `{ StatementList }`는 항상 NewDeclarativeEnvironment로 블록 환경을 만든 뒤 BlockDeclarationInstantiation으로 `let`·`const` 바인딩을 초기화하지 않은 채 만든다. 끝나면 이전 환경으로 돌아간다.
- `var`는 VarScopedDeclarations로 함수(FunctionDeclarationInstantiation)나 스크립트(GlobalDeclarationInstantiation)에서 처리되어 블록 환경에 들어가지 않는다. 맨 바깥 `var`는 CreateGlobalVarBinding으로 전역 객체 프로퍼티가 되고(deletable false), `let`·`const`는 전역 환경의 선언적 레코드에 만들어진다.
- PutValue: 찾지 못한 참조에 대입하면 strict mode는 ReferenceError, 아니면 전역 객체에 Set(설정 가능한 프로퍼티) — 선언이 아니므로 선언 처리 때 만들어지지 않고 `delete`로 지워진다.
- `const` 바인딩은 strict binding이라 SetMutableBinding이 sloppy mode에서도 TypeError를 던진다. 바인딩이 아니라 담긴 객체의 변경은 막지 않는다.
- 같은 스크립트 안의 충돌은 Early Error라 스크립트 전체가 실행되지 않는다. 스크립트가 나뉘면 뒤 스크립트의 GlobalDeclarationInstantiation에서 SyntaxError가 나고 그 스크립트의 어떤 줄도 실행되지 않는다.

#### 확인 질문

1. `let x; if (true) { if (true) { var x; } }`는 SyntaxError인데 `let x; function f() { var x; }`와 `{ let a = 1; } var a = 2;`는 왜 허용되나? 두 경우가 각각 어느 경계 때문인가?
   <details><summary>답</summary>Early Errors는 `let`·`const`가 선언된 블록(함수 본문·스크립트)의 LexicallyDeclaredNames와 그 안의 VarDeclaredNames를 비교한다. VarDeclaredNames는 안쪽 블록은 모두 포함하지만 안쪽 함수에서 멈추므로 `function f() { var x; }`의 `x`는 바깥 스크립트의 VarDeclaredNames에 없다(함수 경계). `{ let a = 1; }`의 `a`는 그 블록의 LexicallyDeclaredNames이고 `var a`는 그 블록 바깥이라 비교 대상이 아니다(블록 바깥). 근거: 변경 이력 2건, `content.mdx` 중복 선언 절, `concept.test.ts` 근거 테스트.</details>
2. "DevTools 콘솔에서는 결과가 다르다"는 검토 지적 중 일부만 반영한 이유는? 반영한 것과 안 한 것은 무엇인가?
   <details><summary>답</summary>Chromium REPL 모드로 직접 실행해 보니 따로 입력한 줄 사이의 `let` 재선언 허용은 재현됐지만 예제 5의 `delete kept`는 `false`로 `<script>`와 같았다. 재현된 것만 근거로 "중복 선언 SyntaxError가 재현되지 않을 수 있다"고 쓰고, `true`라는 주장은 쓰지 않았다. 근거: 구현 진행 7, 변경 이력 1번째.</details>
3. 시뮬레이터가 `drink`를 2번 줄 선언문 단계에서 처음 만들도록 바뀌면 어떤 테스트가 잡고, 왜 그렇게 그리면 안 되나?
   <details><summary>답</summary>블록 진입 상태 테스트(블록 진입 단계에 `let` 바인딩이 `초기화 전`으로 있어야 함)가 실패한다(음성 확인, 구현 진행 2). BlockDeclarationInstantiation은 블록에 들어갈 때 바인딩을 만들고 선언문은 값을 넣을 뿐이라, 선언문에서 처음 그리면 명세와 다르고 3번(TDZ)에서 "let도 미리 만들어진다"로 설명을 뒤집어야 한다. 근거: 계획 3절 버린 대안 ①.</details>
4. 암묵적 전역 `score`와 맨 바깥 `var kept`는 둘 다 전역 객체 프로퍼티인데 `delete` 결과가 왜 다른가?
   <details><summary>답</summary>`var`는 GlobalDeclarationInstantiation이 CreateGlobalVarBinding(deletable false)으로 설정 불가 프로퍼티를 만들어 `delete`가 `false`다. 암묵적 전역은 PutValue의 Set으로 만든 일반(설정 가능) 프로퍼티라 `delete`가 `true`다. 근거: 예제 5 `implicit-vs-var.js`, 계획 2절 명세.</details>
5. `const box = { count: 1 }; box.count = 2;`는 되는데 `box = {}`는 sloppy mode에서도 TypeError인 이유는?
   <details><summary>답</summary>`const`가 막는 것은 바인딩의 재할당이다. const 바인딩은 strict binding이라 SetMutableBinding이 모드와 상관없이 TypeError를 던진다. `box.count = 2`는 바인딩이 아니라 바인딩에 담긴 객체의 프로퍼티를 바꾸므로 막지 않는다. 근거: 예제 8 `const-object.js`, 계획 2절 SetMutableBinding.</details>
