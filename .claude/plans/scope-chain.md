# 스코프 체인: 렉시컬 스코프 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-28
- 기준: `main` @ `47a996f`

## 0. 요약

- 목적: 로드맵(13~24장) 1번 `/concepts/scope-chain`을 추가한다. 이름을 만나면 지금 스코프부터 바깥으로 찾아 올라가고(스코프 체인), 함수의 바깥 스코프는 호출한 곳이 아니라 정의한 곳으로 정해지며(렉시컬 스코프), 안쪽의 같은 이름이 바깥을 가린다(섀도잉)는 것을 예제 5개·퀴즈·"스코프 찾기" 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개(category `execution`) + e2e·빌드 테스트 케이스 추가 + `docs/content-guide.md` 9단계 목록 문구 + 로드맵 상태. 공통 코드와 기존 개념 11개는 바꾸지 않는다.
- 위험: 단계별 스코프 구성·바깥 연결·찾기 경로를 손으로 잘못 적는 것 → 바깥 연결은 소스의 함수 정의 위치 표와 대조하고, 찾은 값은 예제에 스냅샷 코드를 끼워 실행한 실제 값과 대조한다.
- 복잡도: 중간 · Consensus: 생략 (hoisting과 같은 구조, 공통 코드·새 공통 패턴 없음. 명세 원문과 vm 실행으로 사실을 미리 확인했고 위험 지점은 실제 실행 대조 테스트로 막는다)
- 미확정: 1건 (content-guide 원칙 문구와 AGENTS.md 충돌)

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md`) 1번. 『모던 자바스크립트 Deep Dive』 13장 범위. 13장까지만 전제한다(AGENTS.md 규칙).
- 핵심 3가지: ① 이름은 지금 스코프 → 바깥 스코프 순으로 찾고 처음 찾은 곳에서 멈춘다(스코프 체인) ② 함수의 바깥 스코프는 함수를 정의한 위치로 정해진다(렉시컬 스코프, 호출 위치와 무관) ③ 안쪽 스코프의 같은 이름이 바깥 변수를 가린다(섀도잉).
- 시각화: 스코프 체인 찾기 시뮬레이터.
- 장을 정리하며 따로 설명할 내용이 보이면 추가 게시글 후보로 제안한다(로드맵 결정) → 9절.

### 유지해야 하는 기존 동작

- 기존 개념 11개의 페이지·시뮬레이터·테스트는 그대로 통과하고 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 2개(`tests/e2e/navigation.spec.ts:17`, `:32`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 홈 첫 카드는 '언어 기초' 그룹 첫 카드(`navigation.spec.ts:18`). 새 개념은 `execution` 그룹(hoisting과 같은 그룹)에 들어가 영향 없음.
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위

- 블록 스코프와 `let`·`const`의 차이, 암묵적 전역(로드맵 2번), TDZ(3번), 실행 컨텍스트·환경 레코드 구조(9번), 클로저(10번), `this`, 전역 객체, `eval`·`with`, 모듈 스코프, 화살표 함수.
- 위 항목은 필요한 곳에서 `simplifications`로만 밝힌다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 참고 구현은 `app/concepts/hoisting/`(가장 최근: `scenarios.ts` 상태 타입·헬퍼·`changed` 배지 규칙, `HoistView.tsx` 섹션·배지·클래스 문자열, `Simulator.tsx` 래퍼, `concept.test.ts`의 `errorNameOf`·스냅샷 대조). 공통 타입 `app/simulator/types.ts`, 불변식 `tests/helpers/scenario-invariants.ts`.
- e2e 개념별 상수 `tests/e2e/helpers.ts:21-22`(hoisting), a11y `tests/e2e/a11y.spec.ts:257-`, responsive `tests/e2e/responsive.spec.ts:272-`, 빌드 프리렌더 블록 `tests/build/build-output.test.ts:448-`가 가장 최근 본보기. content-guide 9단계 목록 `docs/content-guide.md:164`.
- 기존 개념 연결: `hoisting/meta.ts` 단순화 5가 "함수 안의 var·함수 선언도 … 스코프는 별도 개념에서 다룹니다"라고 적었다. 이 개념의 시나리오 3(함수 안 `var`가 호출 시작에 `undefined`)이 그 내용을 이어받는다.
- 기존 예제는 `let`·`const`를 널리 쓴다(10개 개념 폴더). 이 개념은 13장 범위에 맞춰 `var`와 함수 선언만 쓴다(3절).
- 명세(tc39.es/ecma262, 2026-10-28 원문 확인):
  - GetIdentifierReference(9.1.2.1): 환경 레코드에 이름이 있으면 그 레코드를 기준으로 한 Reference를 돌려주고, 없으면 `[[OuterEnv]]`로 재귀한다. `null`까지 가면 unresolvable Reference.
  - OrdinaryFunctionCreate: 함수를 만들 때 `F.[[Environment]]`를 그때의 환경 레코드로 정한다. InstantiateOrdinaryFunctionObject(15.2.4)는 함수 선언을 처리하는 시점의 환경을 넘긴다.
  - NewFunctionEnvironment(9.1.2.4): 호출 때 만드는 함수 환경 레코드의 `[[OuterEnv]]`를 `func.[[Environment]]`로 정한다 → 바깥 스코프는 호출 위치가 아니라 정의 시점 환경.
  - FunctionDeclarationInstantiation: 본문 실행 전에 `var` 이름을 `undefined`(매개변수와 같은 이름이면 그 값)로 초기화하고 함수 선언을 함수로 초기화한다.
  - 앵커 존재 확인: `sec-getidentifierreference`, `sec-resolvebinding`, `sec-ordinaryfunctioncreate`, `sec-newfunctionenvironment`, `sec-functiondeclarationinstantiation`, `sec-environment-records`, `sec-identifier-reference`, `sec-runtime-semantics-instantiateordinaryfunctionobject`, `sec-putvalue`.
- 예제 초안 실제 출력(Node 24.22.1 `vm` + `util.format`, `runExample`과 같은 방식, 8절 1단계 원문 그대로):

  | 예제 | `var`(원문) | `let`으로 바꾸면 | `const`로 바꾸면 |
  | - | - | - | - |
  | `scope-chain.js` | `합정 마포 서울` / `undefined` | 같음 | 같음 |
  | `lexical-scope.js` | `전역` | 같음 | 같음 |
  | `shadowing.js` | `빨강` / `파랑` | 같음 | 같음 |
  | `assign-outer.js` | `2` | 같음 | TypeError(재할당) |
  | `shadow-hoisting.js` | `undefined` / `20` / `10` | ReferenceError | ReferenceError |

  `'use strict';`를 붙여도 `scope-chain.js` 결과는 같다. 함수 안에서 선언하지 않은 이름을 읽으면 ReferenceError(`function f() { return missing } f()`).
- summary 초안(4절) 115자, `객체` 없음(실행 확인).

### 추정

- 없음

## 3. 구현 전략

- hoisting과 같은 구조(예제 → meta → 시나리오·실제 실행 대조 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다. slug `scope-chain`, category `execution`.
- 예제는 `var`와 함수 선언만 쓴다. 13장 범위이고, `let`·`const`의 블록 스코프·TDZ는 2·3번에서 다루기 때문이다. 결과가 `let`·`const`에서도 같은지(2절 표)는 `simplifications`와 본문 주장 테스트로 밝힌다.
- 시뮬레이터 상태(`ScopeState`):
  - `scopes`: 지금 존재하는 스코프 목록(전역 + 실행 중인 함수의 스코프, 생긴 순서). 스코프마다 `id`, 표시 이름(`전역 스코프`, `outer 함수 스코프`), 바깥 스코프 `outerId`(전역은 `null`), 이름 목록(`name`, 값, `changed`).
  - `currentId`: 지금 코드가 실행되는 스코프.
  - `lookup`: 그 단계에서 찾는 이름과 경로(`[{ scopeId, found }]`, 처음 찾은 곳에서 끝남), 목적(`읽기`/`대입`). 없으면 `null`.
- 화면: 왼쪽 "이름 찾기" 패널(경로를 `inner 함수 스코프: 없음 → outer 함수 스코프: 없음 → 전역 스코프: 있음 '서울'` 같은 순서 목록으로), 오른쪽 "스코프" 카드 목록(카드마다 `바깥 스코프: …` 배지, 지금 실행 중 배지, 찾기 경로에 든 카드 강조). 중첩 상자 대신 카드 + `바깥 스코프` 배지를 고른 이유: 렉시컬 스코프 시나리오에서 `show` 스코프가 `run` 스코프 옆에 있으면서도 바깥이 `전역`인 것을 글자로 분명히 보이고, 375px에서 중첩이 깊어지지 않는다.
- 단계 구성: 실행 전 → 전역 선언 처리(한 단계, 세부는 hoisting 개념) → 문장/찾기 단위 실행. 이름을 찾는 곳(읽기·대입·함수 이름 호출)마다 찾기 경로를 보인다. 한 줄에서 이름을 여럿 찾으면(`street + ' ' + area + ' ' + city`) 이름마다 한 단계. 함수 호출은 "스코프 생성 + 본문 실행 전 선언 처리"를 한 단계로, 함수가 끝나면 그 스코프를 표시에서 뺀다.
- 시나리오 3개: `scope-chain`(3단계 깊이 찾기 + 바깥에서 안쪽 이름 못 찾음), `lexical-scope`(호출한 `run` 스코프를 건너뛰고 전역에서 찾음), `shadow-hoisting`(가린 이름이 호출 시작부터 `undefined`). `shadowing`·`assign-outer`는 예제·퀴즈·본문으로 다룬다.
- 정확성 검증: (a) 단계마다 스코프의 `outerId`가 "함수를 정의한 위치" 표(테스트에 둠, 소스 줄 범위 포함 관계로도 대조)와 일치 (b) `lookup.path`가 `currentId`에서 `outerId`를 따라간 순서이고 처음 그 이름을 가진 스코프에서 끝남 (c) 찾은 값 = 예제의 그 단계 `line` 위치에 스냅샷 코드를 끼워 실행한 실제 값 (d) 스냅샷이 쓰는 이름은 `console`이 아닌 예제의 이름만.
- 버린 대안: ① 스코프를 중첩 상자로 그리기 — 375px에서 3단계 중첩이 좁아지고, "옆에 있지만 바깥이 아님"을 보이기 어렵다. ② `let`·`const`로 예제 쓰기 — `shadow-hoisting`이 TDZ로 바뀌고 블록 스코프 질문이 생겨 2·3번을 앞서 다루게 된다. ③ 함수가 끝난 뒤에도 스코프를 회색으로 남기기 — 클로저(10번) 전에 "남는다/사라진다"를 단정하게 된다. 표시에서만 빼고 단순화에 밝힌다. ④ hoisting `HoistView` 재사용 — 개념 간 공유 부품은 `app/simulator/`뿐(AGENTS). 클래스 문자열만 같게 쓴다. ⑤ 환경 레코드·`[[OuterEnv]]`를 그대로 그리기 — 9번 개념 범위. 이 페이지는 "스코프"·"바깥 스코프"로 부르고 명세 이름은 단순화·참고 자료로만.

## 4. 변경 파일

- 추가 `app/concepts/scope-chain/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 5개: `scope-chain.js`, `lexical-scope.js`, `shadowing.js`, `assign-outer.js`, `shadow-hoisting.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `ScopeView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `SCOPE_CHAIN_PATH`, `SCOPE_CHAIN_SIMULATOR_NAME`(`'스코프 체인 시뮬레이터'`)
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(hoisting 케이스 뒤)
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행(파일 끝)
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록(파일 끝)
  - `docs/content-guide.md` 9단계: e2e 대상 목록에 `scope-chain` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch13-24.md`: 1번 계획 문서·상태, 진행 기록 한 줄
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, `tests/e2e/navigation.spec.ts`, 기존 개념 폴더 11개(`hoisting`의 `related` 역방향 연결은 9절 후보), `package.json`, `AGENTS.md`.
- 미확정 1(7절) 승인 시 추가 수정: `docs/content-guide.md` 작성 규칙 > 원칙 4번째 항목 1줄.

## 5. 위험 요소

- 바깥 연결·찾기 경로·값을 잘못 적음 → 틀린 그림 → 2단계 대조 테스트(a~c) + 음성 확인(`show`의 `outerId`를 `run`으로 바꾸면 실패, 스냅샷 값 하나를 바꾸면 실패).
- "호출한 곳의 변수를 본다"는 오해를 그림이 강화 → `lexical-scope` 시나리오에서 `run` 스코프 카드가 화면에 있는데도 경로에서 빠진 것을 설명 문장에 직접 쓴다("run 스코프는 지금 존재하지만 show의 바깥 스코프가 아니므로 찾지 않습니다").
- 스코프를 "메모리 공간", "함수가 끝나면 사라진다"처럼 엔진 구현으로 서술 → 본문은 "이름을 찾을 수 있는 범위"와 명세 동작(찾기 순서, 정의 시점에 바깥이 정해짐)만 쓰고, 표시에서 빼는 것은 단순화로 밝힌다.
- 미리 쓰는 개념 서술(블록 스코프·TDZ·실행 컨텍스트·클로저·전역 객체) → 본문은 함수 스코프와 전역 스코프만, 나머지는 `simplifications`.
- 대입 시 찾기 실패(sloppy 암묵적 전역)를 ReferenceError로 잘못 쓰는 것 → 본문은 "읽을 때 끝까지 없으면 ReferenceError"로 한정하고, 대입은 2번 개념으로 미룬다고 단순화에 밝힌다.
- 브라우저 `window` 고유 이름과 겹치는 예제 이름(`name`, `status` 등) → 예제 이름 `city`·`area`·`street`·`level`·`color`·`count`·`total`·`outer`·`inner`·`show`·`run`·`paint`·`addOne`·`report`. 이 중 브라우저 `window`의 쓰기 가능 고유 프로퍼티가 없는지 1단계에서 확인(Chrome 콘솔 `'x' in window`)한다. 겹치면 이름을 바꾼다.
- `console` 이름 찾기 생략 → 단순화에 밝힌다.
- 375px에서 찾기 경로 목록·바깥 스코프 배지가 넘침 → `break-words [overflow-wrap:anywhere]`, `flex-wrap`, e2e 가로 스크롤 검사.
- `객체` 검색 2건 가정 → meta 세 필드에 `객체` 없음을 1단계 완료 조건으로.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 5개 실제 출력 = `expectedOutput`, 본문 주장 검증(8절 1단계 목록), 시나리오 대조(a~c), 음성 확인(5절).
- 브라우저(빌드 결과 `serve` 4175, 사용자 dev 서버 5173은 건드리지 않음):
  1. 첫 화면: "검토 중" 배지, 분류 '실행 모델', 선행 개념 `hoisting`·`function-calls` 링크, 퀴즈가 라디오 UI.
  2. `스코프 체인` 시나리오: `inner` 호출 단계에서 카드 3개(전역, outer, inner)와 `inner`의 `바깥 스코프: outer 함수 스코프`, `city` 찾기 단계 경로가 inner 없음 → outer 없음 → 전역 있음 `'서울'`, 콘솔 `합정 마포 서울`, 마지막 `typeof area` 단계에서 전역만 찾고 없음, 콘솔 `undefined`.
  3. `렉시컬 스코프` 시나리오: `show` 호출 단계에 카드 3개(전역, run, show), `show`의 `바깥 스코프: 전역 스코프`, `level` 찾기 경로 show 없음 → 전역 있음 `'전역'`(run 없음), 콘솔 `전역`.
  4. `가려진 이름과 선언 처리` 시나리오: `report` 호출 단계에 report 스코프 `total = undefined`, 4번 줄 찾기 경로 report 있음 `undefined`에서 멈춤, 콘솔 `undefined`/`20`/`10`.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: '실행 모델' 그룹 카드 2개, 카드 12개, `객체` 검색 2건, `스코프` 검색 1건.

## 7. 미확정 사항

- [미확정] `docs/content-guide.md` 작성 규칙 > 원칙의 "사용자가 아직 학습하지 않은 개념(예: 실행 컨텍스트, TDZ, Event Loop)을 앞서 설명하지 않습니다"가 2026-10-28 갱신한 AGENTS.md 규칙(미리 작성 허용, "그 개념의 장까지만 전제")과 충돌한다. 원인: AGENTS.md 갱신 때 이 문장을 찾지 못해 함께 고치지 않았다(문서 미갱신). 제안: "페이지가 다루는 장 이후의 개념(예: 13장 페이지에서 실행 컨텍스트, TDZ)을 앞서 설명하지 않습니다. 필요하면 …"으로 바꿔 AGENTS.md와 맞춘다. 이 계획은 어느 쪽이든 AGENTS.md 기준(13장까지 전제)으로 작성하므로 구조는 같다. 사용자 확인 후 8절 6단계에 포함하거나 별도 커밋으로 처리한다.

## 8. 작업 순서

### 1. 예제·meta·route·본문 주장 검증

- 대상: `examples/*.js` 5개, `meta.ts`, `route.tsx`, `content.mdx`(필수 h2 자리표시만), `concept.test.ts`(본문 주장 검증 부분)
- 현재: 없음
- 변경:
  - 예제 원문(이 그대로, 파일 끝 줄바꿈 하나, 들여쓰기 2칸, 작은따옴표):
    - `scope-chain.js`(2·5·10·13줄은 빈 줄)
      ```js
      var city = '서울';

      function outer() {
        var area = '마포';

        function inner() {
          var street = '합정';
          console.log(street + ' ' + area + ' ' + city);
        }

        inner();
      }

      outer();
      console.log(typeof area);
      ```
    - `lexical-scope.js`(2·6·11줄은 빈 줄)
      ```js
      var level = '전역';

      function show() {
        console.log(level);
      }

      function run() {
        var level = 'run 안';
        show();
      }

      run();
      ```
    - `shadowing.js`(2·7줄은 빈 줄)
      ```js
      var color = '파랑';

      function paint() {
        var color = '빨강';
        console.log(color);
      }

      paint();
      console.log(color);
      ```
    - `assign-outer.js`(2·6줄은 빈 줄)
      ```js
      var count = 0;

      function addOne() {
        count = count + 1;
      }

      addOne();
      addOne();
      console.log(count);
      ```
    - `shadow-hoisting.js`(2·8줄은 빈 줄)
      ```js
      var total = 10;

      function report() {
        console.log(total);
        var total = 20;
        console.log(total);
      }

      report();
      console.log(total);
      ```
  - `meta.ts`:
    - `slug: 'scope-chain'`, `category: 'execution'`
    - `title: '스코프 체인: 함수는 어디서 변수를 찾을까'`
    - `summary`(115자): `'변수 이름을 만나면 지금 스코프부터 바깥 스코프로 차례로 찾아 올라갑니다. 함수의 바깥 스코프는 함수를 호출한 곳이 아니라 정의한 곳으로 정해지고, 안쪽 스코프에 같은 이름이 있으면 바깥 변수는 가려집니다.'`
    - `tags`: `['스코프', 'scope', '스코프 체인', 'scope chain', '렉시컬 스코프', 'lexical scope', '정적 스코프', '섀도잉', 'shadowing', '전역 스코프', '지역 스코프', '함수 스코프', 'var', 'ReferenceError']`
    - `goals`: ① 이름을 찾을 때 지금 스코프에서 바깥 스코프로 차례로 찾고 처음 찾은 곳에서 멈춘다는 것을 설명할 수 있다. ② 함수의 바깥 스코프가 호출한 위치가 아니라 정의한 위치로 정해진다는 것을 예제로 설명할 수 있다. ③ 안쪽 스코프의 같은 이름이 바깥 변수를 가릴 때, 함수 안에서 `var` 없이 바깥 변수에 대입할 때의 결과를 예측할 수 있다. ④ 바깥 스코프에서 안쪽 함수의 변수를 찾을 수 없는 이유를 설명할 수 있다.
    - `prerequisites`: `[{ label: '호이스팅', slug: 'hoisting' }, { label: '함수 호출', slug: 'function-calls' }]`
    - `related`: `[]`
    - `examples`: 2절 표 `var` 열을 `expectedOutput`으로(처음에는 `[]`로 두고 `npm test` 실제 출력을 확인한 뒤 채움). id = 파일명에서 `.js`를 뺀 것.
    - `simplifications`:
      1. "'스코프' 카드는 명세의 환경 레코드(Environment Record)를, '바깥 스코프'는 그 [[OuterEnv]] 연결을 단순화한 것입니다. 실행 컨텍스트와 환경 레코드는 별도 개념에서 다룹니다."
      2. '함수 실행이 끝나면 그 함수의 스코프를 표시에서 뺍니다. 함수가 끝난 뒤 스코프가 어떻게 되는지는 클로저 개념에서 다룹니다.'
      3. '코드를 실행하기 전 전역 선언 처리와 함수 호출 시작의 선언 처리는 각각 한 단계로 묶었습니다. 선언 처리 순서는 호이스팅 개념에서 다룹니다.'
      4. 'console을 찾는 과정은 표시하지 않습니다. console은 호스트가 제공하는 이름이며 같은 방식으로 스코프 체인에서 찾습니다.'
      5. '예제는 var와 함수 선언만 씁니다. let·const로 바꿔도 예제 1~3의 결과는 같지만, 블록({ }) 스코프와 선언 전 참조(TDZ)에서 차이가 나며 별도 개념에서 다룹니다. 예를 들어 예제 5를 let으로 바꾸면 ReferenceError가 납니다.'
      6. '끝까지 찾지 못한 이름을 읽으면 ReferenceError입니다. 찾지 못한 이름에 대입하면 strict mode가 아닐 때 전역 변수가 새로 생기며(암묵적 전역), 이는 별도 개념에서 다룹니다.'
      7. '전역 스코프는 전역 객체와 연결되어 있지만 이 페이지에서는 다루지 않습니다.'
    - `references`: 명세 GetIdentifierReference(`sec-getidentifierreference`), ResolveBinding(`sec-resolvebinding`), OrdinaryFunctionCreate(`sec-ordinaryfunctioncreate`), NewFunctionEnvironment(`sec-newfunctionenvironment`), FunctionDeclarationInstantiation(`sec-functiondeclarationinstantiation`), Environment Records(`sec-environment-records`), MDN 'Scope'(Glossary), MDN '클로저'의 렉시컬 스코핑 절. MDN 링크는 1단계에서 실제로 열어 200·내용 확인(한국어 문서가 없으면 en-US). 라벨 형식은 `hoisting/meta.ts` 따름.
    - `reviewedAt: null`
  - `route.tsx`: content-guide 6단계 템플릿.
  - `concept.test.ts` 본문 주장 검증(`errorNameOf`는 hoisting과 같은 모양으로 이 파일 안에 둔다):
    - `function f() { return missing } f()` → `'ReferenceError'`
    - `function o() { var a = 1 } o(); typeof a` → `'undefined'`
    - 예제 5개를 `var` → `let`으로 바꾼 결과: 1~4는 원문과 같음, 5는 `'ReferenceError'`(단순화 5 근거)
    - `'use strict';` + `scope-chain.js` 결과가 원문과 같음
- 이유: 출력 주장의 근거를 먼저 고정한다.
- 주의사항: 예제 파일은 Prettier/ESLint 대상이 아니다. 줄 번호를 바꾸지 않는다.
- 완료 조건: `npm test`에서 새 예제 5개 L1 통과(실제 출력 = 2절 표 `var` 열), meta 무결성 통과, 본문 주장 테스트 통과, `title`·`summary`·`tags`에 `객체` 없음, MDN 링크 200 확인 기록, `window` 이름 충돌 확인 기록.

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`(시나리오 부분)
- 현재: 없음
- 변경:
  - 타입: `Val`(`string`/`number`/`undefined` + `display`, `function` + `display`), `Binding`(`name`, `value`, `changed?: 'created' | 'updated'`), `Scope`(`id`, `label`, `outerId: string | null`, `bindings`), `Lookup`(`name`, `purpose: 'read' | 'assign'`, `path: { scopeId: string; found: boolean }[]`), `ScopeState`(`scopes`, `currentId: string | null`, `lookup: Lookup | null`). 문자열 값 `display`는 작은따옴표 포함(`'서울'`).
  - 시나리오 3개(id/label): `scope-chain`/`스코프 체인`, `lexical-scope`/`렉시컬 스코프`, `shadow-hoisting`/`가려진 이름과 선언 처리`. 각 시나리오는 실행 전 → 전역 선언 처리 → 실행 단계. 이름을 찾는 곳(읽기·대입·함수 이름)마다 `lookup`을 둔다. 함수 호출 단계는 함수 이름 찾기 + 새 스코프(`outerId` = 정의 위치 스코프) + 본문 실행 전 선언 처리 결과를 함께 담는다. 함수가 끝나는 단계에서 그 스코프를 뺀다.
  - `changed`는 그 단계에서 새로 생기거나 값이 바뀐 이름에만 붙이고 다음 단계에서 해제(hoisting 규칙).
  - 테스트:
    - `assertScenarioInvariants(scenario, example, source)` 3개.
    - 구조: 모든 단계에서 `outerId`가 같은 단계의 스코프를 가리키거나 `null`(전역만), `currentId`가 존재, `lookup.path[0].scopeId === currentId`, 경로가 `outerId` 사슬 순서, 마지막 요소만 `found: true`이고 그 스코프에 이름이 있음, 앞 요소들의 스코프에는 그 이름이 없음.
    - 정의 위치 표: 함수 이름 → 정의된 스코프(`outer`·`show`·`run`·`report` → 전역, `inner` → `outer`)를 테스트에 두고, 각 함수 스코프의 `outerId`가 표와 같은지 확인. 표 자체는 소스에서 함수 선언 줄 범위(`function 이름(`부터 짝 맞는 `}`)의 포함 관계로 계산한 결과와 대조.
    - 실제 값: 찾기 단계마다 예제 원문의 `line.from` 앞 줄에 `__snap(<이름>)`(그 위치에서 이름을 평가)을 끼워 실행하고, 경로 마지막 스코프에 표시한 값과 비교. 대입(`purpose: 'assign'`) 단계는 `line.to` 뒤에 끼워 대입 후 값과 비교. `typeof area` 단계는 `typeof area === 'undefined'`와 경로가 전역 하나에서 `found: false`로 끝나는 것을 확인(이 단계만 `found: true` 없이 끝나는 예외로 명시).
- 이유: 위험 1번(그림 오류)을 실제 실행으로 막는다.
- 주의사항: 스냅샷 함수는 컨텍스트 안에서 이름을 평가해야 한다(hoisting 계획 2절 주의 — 호스트에서 sandbox를 읽으면 틀린다). 한 줄에 이름을 여럿 찾는 단계는 같은 줄 앞에 이름별로 스냅샷을 끼운다.
- 완료 조건: `npm test`의 이 개념 테스트 전부 통과 + 음성 확인 2가지(5절)를 임시로 바꿔 실패하는 것을 확인하고 되돌림(구현 진행에 기록).

### 3. 시각화 `ScopeView`

- 대상: `ScopeView.tsx`, `ScopeView.test.tsx`
- 현재: 없음
- 변경: 3절 화면 구성. 섹션 2개(`이름 찾기`, `스코프`), `useId`로 `aria-labelledby`. 찾기 패널: `lookup`이 없으면 "이 단계에서는 이름을 찾지 않습니다", 있으면 `level 읽기` 같은 제목과 경로 순서 목록(`<ol>`; 항목마다 스코프 이름 + `없음`/`있음: 값`). 스코프 카드: 이름, `바깥 스코프: …`(전역은 `가장 바깥`), 지금 실행 중이면 `지금 실행 중` 배지, 경로에 든 카드는 강조 클래스, 이름 목록(`name = 값` + `changed` 배지). 실행 전(`scopes` 빈 배열)은 "아직 코드를 실행하지 않았습니다". 클래스 문자열(`badgeClass`, `changedClass`, `fade`, `wrap`)은 `HoistView.tsx`와 같게 쓴다.
- 이유: 상태를 그대로 그리는 순수 컴포넌트.
- 주의사항: 색만으로 구분하지 않는다(배지 텍스트로도). 첫 렌더는 상태만으로 정해진다(하이드레이션).
- 완료 조건: `ScopeView.test.tsx`가 ① 실행 전 문구 ② 경로 목록 순서와 `없음`/`있음` 텍스트 ③ `바깥 스코프` 배지 텍스트 ④ `지금 실행 중` 배지 ⑤ `changed` 배지를 확인하고 통과.

### 4. 래퍼 `Simulator`와 본문 연결

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `label="스코프 체인 시뮬레이터"`, `renderState={(state) => <ScopeView state={state} />}`(hoisting 래퍼와 같은 모양). 테스트는 hoisting `Simulator.test.tsx`와 같은 항목(시나리오 3개 라디오, 다음 단계 이동, 마지막 단계 콘솔 출력).
- 완료 조건: `Simulator.test.tsx` 통과, `npm run typecheck` 통과.

### 5. 본문 `content.mdx`

- 대상: `content.mdx`
- 변경:
  - `## 동작 원리`: 스코프(scope) = 이름을 찾을 수 있는 범위. 전역 스코프와 함수 스코프(지역 스코프). 이름을 만나면 지금 스코프 → 바깥 스코프 순으로 찾고 처음 찾은 곳에서 멈춘다(스코프 체인, scope chain). 끝까지 없으면 읽기는 ReferenceError. 함수의 바깥 스코프는 함수가 만들어질 때(정의된 위치) 정해지고 호출할 때 그대로 쓰인다(렉시컬 스코프, lexical scope / 정적 스코프). 근거 명세 절 이름을 한 번 언급.
  - `## 예제`: 예제 5개(`file=`), 예측 퀴즈 5개(예제마다 1개), 시뮬레이터 1개(`scenarios` 전달).
  - `## 결과와 이유`: 예제별 이유 문단 + 오해 Callout 5개: ① 함수는 호출한 곳의 변수를 본다(→ 정의한 곳) ② 안쪽 `var`가 바깥 변수를 바꾼다(→ 새 이름, 바깥은 그대로) ③ 가려진 이름도 선언문 전에는 바깥 값을 읽는다(→ 호출 시작부터 안쪽 이름이 있어 `undefined`) ④ 바깥에서 안쪽 함수의 변수를 읽을 수 있다(→ 찾기는 바깥 방향으로만) ⑤ 함수 안에서 대입하면 항상 지역 변수가 된다(→ `var` 없이 대입하면 찾은 바깥 변수가 바뀜).
- 주의사항: 13장까지만 전제(실행 컨텍스트·환경 레코드·블록 스코프·TDZ·클로저·전역 객체를 설명하지 않음, "별도 개념"으로만). 같은 대상은 같은 이름("스코프", "바깥 스코프", "찾는다", "가린다"). "스코프(scope)", "스코프 체인(scope chain)", "렉시컬 스코프(lexical scope)", "섀도잉(shadowing)"은 처음 나올 때 영어 병기. "메모리", "사라진다" 같은 구현 서술 금지. 스타일 권고 금지. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test`(필수 h2) 통과, `npm run build` 후 HTML에 `<details` 5개 이상, `**` 0, 공백 깨진 `<code>` 0, 메인이 본문 전문을 명세·2절 실행 결과와 대조(구현 진행에 수정 내역 기록).

### 6. e2e·빌드 테스트·문서 목록

- 대상: `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md:164`, (미확정 1 승인 시) `docs/content-guide.md` 원칙 항목, `.claude/plans/concept-roadmap-ch13-24.md`
- 변경: hoisting 케이스를 본떠 새 개념 케이스를 뒤에 추가(기존 케이스 수정 없음). 빌드 블록은 0단계 문구(`아직 코드를 실행하지 않았습니다`), region과 라디오 3개, `<details` 5개 이상. content-guide 9단계 목록에 `scope-chain` 추가. 로드맵 1번 계획 문서 `scope-chain.md`·상태 갱신, 진행 기록 한 줄.
- 완료 조건: `npm run test:build`·`npm run e2e` 통과(새 케이스 포함), 6절 브라우저 시나리오 1~6 확인 기록.

## 9. 추가 개선 후보

- `hoisting/meta.ts`의 `related`에 `scope-chain` 추가(역방향 연결, 기존 개념 파일 수정이라 사용자 확인 필요).
- 추가 게시글 후보(로드맵 결정): 13장 정리 중 따로 떼어 설명할 만한 내용은 지금 보이지 않는다. 함수 안 호이스팅은 이 개념 시나리오 3이, 블록·암묵적 전역은 2번이 다룬다. 구현 중 생기면 이 절에 추가하고 보고한다.

## 변경 이력

- 2026-10-28 (구현 중 발견): 함수 호출을 "함수 이름 찾기"(호출한 스코프가 현재) 단계와 "호출 시작"(새 스코프 생성 + 본문 실행 전 선언 처리, 새 스코프가 현재) 단계로 나눈다. 한 단계로 묶으면 `lookup.path[0] === currentId` 불변식과 어긋난다. 범위·접근 방식 변화 없음 — 영향 단계 2.

## 구현 진행

- baseline (2026-10-28, `47a996f`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 46파일 1017 통과 / `test:build` 91 통과 / `e2e` 163 통과. dev 서버(5173)·serve(4175) 미실행.
- 사전 확인(메인): MDN `ko/docs/Glossary/Scope` 200(제목 "스코프"), `ko/docs/Web/JavaScript/Guide/Closures` 200(앵커 `#어휘적_범위_지정lexical_scoping` 존재). Chromium(Playwright)에서 예제 이름 14개 중 `in window`인 것 없음(`[]`).
- [x] 1. 예제·meta·route·본문 주장 검증 — 메인 재실행: lint·format:check·typecheck 통과, `npm test` 47파일 1040 통과. 예제 5개 원문·줄 번호·끝 줄바꿈 1개 확인, 실제 출력 = 2절 표 `var` 열, `title`·`summary`·`tags`에 `객체` 없음(단순화 7에만 있음, 검색 대상 아님), MDN 200·`window` 충돌 없음은 위 사전 확인.
- [x] 2. 시나리오와 대조 테스트 — 메인 재실행: lint·format:check·typecheck 통과, `npm test` 47파일 1073 통과. 단계 수 15/11/10. 음성 확인(서브에이전트 실행, 메인이 테스트 코드로 확인): `show.outerId`를 `run`으로 → 경로·정의 위치 테스트 2개 실패, `'마포'`→`'망원'` → 스냅샷·changed 테스트 2개 실패, 되돌린 뒤 통과. 스냅샷은 컨텍스트 안에서 `typeof`·`String`으로 읽는다(`concept.test.ts` `snapshotAt`). 메인 수정 1건: `globalDeclare`의 조사 "를"이 `level`·`total` 뒤에서 틀려 "~ 이름을 만듭니다"로 바꿈.
- [x] 3. 시각화 `ScopeView` — 메인 재실행: lint·format:check·typecheck 통과, `npm test` 49파일 1083 통과. `ScopeView.test.tsx` 6개(빈 상태, 3단계 찾기 경로, 렉시컬 경로에서 run 제외, changed 배지, 끝까지 못 찾음, lookup 없음). 클래스 문자열은 `HoistView.tsx`와 같음, 배지 텍스트로 상태 표시(색만 쓰지 않음).
- [x] 4. 래퍼 `Simulator` — `label="스코프 체인 시뮬레이터"`, `Simulator.test.tsx` 4개 통과(첫 화면, 3단계 줄 강조, 시나리오 전환, 마지막 단계 콘솔 출력). typecheck 통과.
- [x] 5. 본문 content.mdx — 서브에이전트 작성 후 메인이 전문을 명세·실행 결과와 대조해 표현 4곳 수정(결론 변경 없음): ① "맨 바깥 스코프가 모듈 스코프가 된다"(명세상 모듈 환경 바깥에 전역 환경이 있음)를 "ES 모듈에서는 맨 바깥 코드가 모듈 스코프에서 실행되고 전역 스코프는 그 바깥"으로, "Node.js의 파일(CommonJS)"를 "Node.js가 CommonJS로 실행하는 파일"로 ② 결과와 이유·Callout ④의 "읽는 이름이라면 ReferenceError"(typeof도 읽기)를 "`typeof` 없이 읽었다면"으로 ③ Callout ③ "`var`는"을 "함수 안의 `var` 선언은"으로. 근거 테스트 추가: `.mjs`·`.cjs`에서 맨 바깥 `var`는 `globalThis` 프로퍼티가 아니고 바깥 전역 이름은 찾음(`undefined 2`). 서브에이전트가 Callout 안 `typeof area` 공백 깨짐 1건을 `<code>{…}</code>`로 해소. 메인 재실행: `npm test` 49파일 1087 통과, lint·format·typecheck 통과, build 성공, HTML `<details` 5·`**` 0·공백 깨진 인라인 code 0(121개 중), `[[Environment]]` 글자 그대로 렌더링.
- [x] 6. e2e·빌드 테스트·문서 목록 — 기존 케이스 수정 없이 추가만(a11y 반복 상한 `i < 20`, 단계 15/11/10). content-guide 9단계 목록에 `scope-chain` 추가, 로드맵 1번 행·진행 기록 갱신(메인). 메인 전체 재실행: lint·format:check·typecheck 통과, `npm test` 49파일 1087, `test:build` 98(baseline 91 + 7), `e2e` 175 통과·3 skipped(baseline과 같은 프로젝트 전용 skip). 브라우저(빌드 `serve` 4175, Playwright 스크립트, 데스크톱 라이트·375px 다크): 시나리오 1~4 기대 텍스트 일치, 검토 중 배지·'실행 모델'·선행 링크 2개·라디오 퀴즈 5, 키보드 Home/→ 동작, 가로 넘침 0, 콘솔 에러 0, 홈 카드 12·`객체` 검색 2·`스코프` 검색 1. 375px 다크 스크린샷 육안 확인.
- 미확정 1(content-guide 원칙 문구 충돌): 사용자 답이 없어 이번 구현에서 바꾸지 않음 → 후속 작업으로 넘김.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가만): High 2(수정) · Low 1(보고). High ① 단순화 6 "찾지 못한 이름에 대입하면 … 전역 변수가 새로 생기며"가 명세(PutValue: 전역 객체에 프로퍼티를 만들 뿐 변수 선언이 아님)와 어긋남 → "전역 객체에 그 이름의 프로퍼티가 만들어지고(암묵적 전역), strict mode에서는 ReferenceError"로 수정 + 근거 테스트 추가. High ② 단순화 5의 "const로 바꿔도 예제 1~3 결과가 같다"에 실행 근거 없음(AGENTS 정확성 원칙) → const 대조 테스트 3개 추가. Low: `ScopeView`의 `scope?.label ?? scopeId` 등 시나리오상 일어나지 않는 경우의 방어 코드(보고만). 재검증: `npm test` 1091 통과, lint·format·typecheck 통과, `test:build` 98 통과(HTML에 새 문구 확인). e2e는 UI 구조 변경 없음(meta 문구·테스트만)이라 재실행하지 않음 — 직전 전체 실행 175 통과.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 달라진 점: ① 함수 호출을 "이름 찾기"와 "호출 시작" 두 단계로 나눴다(변경 이력 — 찾기 경로의 시작 = 현재 스코프 불변식) ② 본문에 ES 모듈·CommonJS 실행 시 출력이 같다는 문단과 근거 테스트를 더했다(구현 진행 5) ③ 리뷰에서 단순화 6 문구와 const 대조 테스트를 고쳤다(리뷰 1차).
- 미확정 1(content-guide 원칙 문구)은 사용자 답이 없어 반영하지 않았다.

### 코드 리뷰

- High 2건 수정(단순화 6 "전역 변수가 생긴다" → 전역 객체 프로퍼티·strict ReferenceError, 단순화 5 const 주장 근거 테스트). Low 1건(시나리오상 일어나지 않는 경우의 방어 코드)은 보고만 하고 남겼다.

### 후속 작업

- [x] `docs/content-guide.md` 작성 원칙 "사용자가 아직 학습하지 않은 개념을 앞서 설명하지 않습니다"를 AGENTS.md 규칙(그 개념의 장까지 전제)과 맞추기 — 2번 `block-scope` 작업에서 반영(사용자 결정)
- [ ] 사용자 콘텐츠 검토 후 `reviewedAt` 기록
- [ ] `hoisting/meta.ts` `related`에 `scope-chain` 역방향 연결(기존 개념 수정, 사용자 확인)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 함수 호출을 "함수 이름 찾기"(호출한 스코프가 현재)와 "호출 시작"(새 스코프가 현재) 두 단계로 나눴다 — 대안은 계획대로 한 단계로 묶기. 묶으면 같은 단계에서 찾기 경로는 호출한 스코프에서 시작하는데 현재 스코프는 새 함수 스코프여서 `lookup.path[0] === currentId` 불변식이 깨진다.
- [Claude 판단] 리뷰에서 단순화 6을 "전역 변수가 새로 생긴다"에서 "전역 객체에 그 이름의 프로퍼티가 만들어지고, strict mode에서는 ReferenceError"로 고쳤다 — 명세 PutValue는 찾지 못한 참조에 대해 sloppy mode에서 전역 객체에 Set할 뿐 변수 선언을 만들지 않는다. 결과만 맞는 용어가 2번 개념(암묵적 전역)에서 오개념이 된다(명세 정확성 기준).
- [Claude 판단] 본문의 "모듈에서는 맨 바깥 스코프가 모듈 스코프가 된다"를 "맨 바깥 코드가 모듈 스코프에서 실행되고 전역 스코프는 그 바깥"으로 고쳤다 — 모듈 환경의 바깥 연결은 전역 환경이라 가장 바깥 스코프는 여전히 전역이다. 근거 테스트: `.mjs`·`.cjs`에서 맨 바깥 `var`는 `globalThis` 프로퍼티가 아니지만 전역 이름 `b`는 찾는다.
- [무검토 승인] 예제를 `var`와 함수 선언만으로 썼다 — `let`으로 쓰면 예제 5가 TDZ로 ReferenceError가 되어 3번 개념을 앞서 다루게 된다. 차이는 단순화 5와 let·const 대조 테스트로 밝혔다.
- [무검토 승인] 스코프를 중첩 상자 대신 카드 + "바깥 스코프: …" 배지로 그리고, 함수가 끝나면 표시에서만 뺐다 — 중첩 상자는 375px에서 좁고 "옆에 있지만 바깥이 아님"(예제 2의 run)을 보이기 어렵다. 끝난 스코프를 남기거나 "사라진다"고 쓰면 클로저(10번) 전에 단정하게 된다.
- [무검토 승인] 시뮬레이터 정확성은 예제에 스냅샷 코드를 끼워 실행한 실제 값과, 소스의 함수 줄 범위 포함 관계로 계산한 정의 위치 표로 대조했다.

#### 배경지식

- GetIdentifierReference(9.1.2.1): 환경 레코드에 이름이 없으면 `[[OuterEnv]]`로 재귀하고, `null`까지 가면 unresolvable 참조. 읽으면 ReferenceError, `typeof`는 `'undefined'`.
- 렉시컬 스코프의 근거: OrdinaryFunctionCreate가 함수를 만들 때 그때의 환경을 `[[Environment]]`에 기록하고, 호출 때 NewFunctionEnvironment가 새 함수 환경의 `[[OuterEnv]]`를 그 값으로 정한다. 호출 위치는 쓰이지 않는다.
- FunctionDeclarationInstantiation: 호출 때 본문 실행 전에 함수 안의 `var`를 `undefined`로, 함수 선언을 함수로 초기화한다 → 예제 5에서 4번 줄의 `total`이 `report` 스코프에서 찾아져 `undefined`.
- PutValue: unresolvable 참조에 대입하면 strict mode에서는 ReferenceError, 아니면 전역 객체에 프로퍼티를 만든다.

#### 확인 질문

1. 예제 2에서 `show`를 `run` 안에서 호출하는데, `level`을 찾을 때 `run` 함수 스코프는 왜 경로에 없나? 명세의 어느 두 단계가 이것을 정하나?
   <details><summary>답</summary>`show`는 전역 코드의 선언 처리 때 OrdinaryFunctionCreate로 만들어지며 `[[Environment]]`가 전역 환경으로 기록된다. 호출 때 NewFunctionEnvironment가 새 스코프의 바깥을 그 `[[Environment]]`로 정하므로 바깥은 전역이고, 찾기(GetIdentifierReference)는 `[[OuterEnv]]`만 따라가므로 `run` 스코프를 지나지 않는다. 근거: 계획 2절 명세, `content.mdx` 렉시컬 스코프 절, `scenarios.ts` 렉시컬 스코프 시나리오.</details>
2. 함수 호출을 한 단계로 묶으면 무엇이 깨지나? 그 대신 무엇을 나눴나?
   <details><summary>답</summary>그 단계의 찾기 경로는 호출한 스코프에서 시작하지만 현재 스코프는 새 함수 스코프가 되어 `lookup.path[0] === currentId` 불변식이 어긋난다. 그래서 "함수 이름 찾기"(현재 = 호출한 스코프)와 "호출 시작"(현재 = 새 스코프, 선언 처리 결과) 두 단계로 나눴다. 근거: 계획 변경 이력, `concept.test.ts` 찾기 경로 테스트.</details>
3. 예제 5를 `let`으로 바꾸면 결과가 어떻게 바뀌고, 그것이 이 페이지가 `var`만 쓴 이유와 어떻게 이어지나?
   <details><summary>답</summary>ReferenceError로 멈춘다. `let total`도 호출 시작 때 report 스코프에 생기지만 선언문 실행 전에는 초기화되지 않아(TDZ) 4번 줄 읽기가 ReferenceError다. TDZ는 3번 개념이라, 이 페이지는 `var`로 섀도잉과 선언 처리만 보이고 차이는 단순화 5와 테스트로 밝혔다. 근거: 계획 2절 표, `concept.test.ts` 본문 주장 검증.</details>
4. 시나리오에 `'마포'` 대신 `'망원'`을 잘못 적거나 `show`의 바깥 스코프를 `run`으로 잘못 적으면 각각 어떤 테스트가 잡나?
   <details><summary>답</summary>값 오류는 스냅샷 대조 테스트(예제 해당 줄 앞뒤에 `__snap`을 끼워 vm 컨텍스트 안에서 읽은 실제 값과 비교)와 changed 계산 테스트가 잡는다. 바깥 연결 오류는 찾기 경로 테스트와 정의 위치 표 테스트(표를 소스의 함수 줄 범위 포함 관계로 계산해 대조)가 잡는다. 음성 확인으로 실제 실패를 확인했다. 근거: 구현 진행 2.</details>
5. "찾지 못한 이름에 대입하면 전역 변수가 생긴다"는 결과가 맞아 보이는데 왜 고쳤나?
   <details><summary>답</summary>명세 PutValue는 sloppy mode에서 전역 객체에 프로퍼티를 만들 뿐 변수 선언(바인딩 생성·선언 처리)이 아니고, strict mode에서는 ReferenceError다. "변수"라고 쓰면 선언과 같은 것처럼 읽혀 2번 개념에서 충돌하는 오개념이 된다. 근거: 리뷰 1차, `meta.ts` 단순화 6, 근거 테스트.</details>
