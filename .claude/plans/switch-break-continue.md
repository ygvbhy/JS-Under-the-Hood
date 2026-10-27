# switch와 break·continue 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `83ab9c2`

## 0. 요약
- 목적: 로드맵 5번 개념 `/concepts/switch-break-continue`를 추가한다. `switch`가 `===`로 일치하는 첫 `case`부터 아래로 이어서 실행하고(fall-through), `break`는 가장 가까운 반복문·`switch`를, `continue`는 가장 가까운 반복문의 이번 반복을 끝낸다는 것을 예제, 퀴즈, 실행 흐름 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개 + e2e·빌드 테스트에 케이스 추가 + `docs/content-guide.md` 9단계 목록 문구 + 로드맵 상태. 공통 코드와 기존 개념 7개는 바꾸지 않는다.
- 위험: 반복문 시나리오(17·21단계)의 실행 순서·비교 결과를 손으로 잘못 적는 것 → 테스트가 명세 알고리즘(CaseBlockEvaluation)으로 비교 순서를 계산하고, 조건·출력을 vm으로 다시 평가하고, 계측한 예제를 실행해 얻은 실제 줄 순서와 대조한다.
- 복잡도: 중간 · Consensus: 생략 (increment-decrement와 같은 구조라 공통 코드·새 공통 패턴이 없다. 명세 원문과 vm 실행으로 사실을 미리 확인했고, 위험 지점은 계산·대조 테스트로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 5번. 『모던 자바스크립트 Deep Dive』 8장 범위(사용자 진도 1~12장).
- 핵심: `case`는 `===`로 비교, 일치한 `case`부터 `break` 전까지 아래 `case`의 문장도 실행(fall-through), `for` 안의 `break`·`continue`, `for` 안의 `switch`에서 `break`는 `switch`만 끝내고 `continue`는 `for`의 다음 반복으로 간다.
- 사용자 결정(2026-10-27): 범위는 "switch + for 반복문 + 중첩". 추가 항목 4개 모두 포함: ① `default`가 중간에 있을 때(예제 + 퀴즈) ② `case` 식은 필요할 때만 평가(본문 설명 + 시뮬레이터 비교 단계 + 예제) ③ 레이블 문 `break outer`(예제 1개) ④ `break`·`continue`를 쓸 수 없는 위치의 SyntaxError(본문 한 줄, 테스트로 검증).
- 실행 흐름 시뮬레이터를 넣는다(로드맵 결정). 1번 `equality-operators`를 선행 개념으로 연결한다(로드맵 메모).
- `docs/content-guide.md` 절차를 따르고 개념 폴더만 추가한다(테스트 확장 제외).

### 유지해야 하는 기존 동작
- 기존 개념 7개의 페이지·시뮬레이터·테스트는 그대로 통과하고, 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 1개다(`tests/e2e/navigation.spec.ts:16-17`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위
- `while`·`do...while`·`for...in`·`for...of`(규칙은 같다는 한 줄 언급만), 블록에 붙인 레이블, `continue` 레이블의 상세(예제는 `break outer`만, 본문에 한 줄 설명).
- `switch` 블록 안의 `let`·`const` 선언 충돌(케이스 블록 전체가 하나의 블록), `switch (true)` 패턴, 함수 안 `break`가 바깥 반복문을 가리킬 수 없는 경우(테스트로만 확인, 본문 미언급).
- 스코프·블록 레벨 스코프(13장). `for`의 `let` 변수가 반복마다 새로 만들어지는 것(CreatePerIterationEnvironment)은 `simplifications`로만 밝힌다.
- 기존 개념 `related`에 새 개념을 역방향으로 연결하는 일(9절 후보).

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 라우트는 폴더 스캔(`app/routes.ts`), 레지스트리는 glob, 홈 정렬은 제목 `localeCompare(…, 'ko')`(`app/lib/concepts.ts:37-39`).
- 가장 가까운 참고 구현: `app/concepts/increment-decrement/`(`scenarios.ts`의 `Val`·`Binding`·헬퍼·`changed`, `EvaluationView.tsx`의 배지·`<ol>` 사건 목록·빈 상태 문구·클래스 문자열, `Simulator.tsx` 래퍼, `concept.test.ts`의 "본문 주장 검증"·`changed` 계산·사건 누적·의미 검사). 공통 셸·타입은 `app/simulator/types.ts`(`Step.line`, `output`), 불변식은 `tests/helpers/scenario-invariants.ts`(①~⑤).
- 공통 테스트 자동 대상: `tests/examples.test.ts`(L1), `tests/content-integrity.test.ts`(L3), `tests/build/build-output.test.ts`(레지스트리·HTML·sitemap·JSON-LD). 개념별 프리렌더 블록은 `build-output.test.ts`의 `시뮬레이터 프리렌더 (increment-decrement)` 블록처럼 수동 추가.
- e2e 개념별 상수 `tests/e2e/helpers.ts`, a11y 케이스 `tests/e2e/a11y.spec.ts`, responsive 케이스 `tests/e2e/responsive.spec.ts`(increment-decrement 케이스가 가장 최근 본보기).
- 예제 실행 환경: `tests/helpers/run-example.ts`(`runInNewContext`, sandbox는 `console`만, `util.format`).
- 명세(tc39.es/ecma262, 2026-10-27 원문 확인):
  - `switch` Evaluation(14.12.4): 식을 평가해 `switchValue = GetValue(…)`를 한 번 구하고 CaseBlockEvaluation을 실행한다. `CaseClause : case Expression : StatementList`의 평가는 StatementList 평가뿐이다(`case` 식은 여기서 평가하지 않는다).
  - CaseClauseIsSelected(14.12.3): `case` 식을 평가·GetValue한 값과 `IsStrictlyEqual(input, clauseSelector)`. 즉 `===`와 같은 비교.
  - CaseBlockEvaluation(14.12.2): `found`가 false인 동안만 각 `case`에 CaseClauseIsSelected를 실행하고, `found`가 true가 된 뒤의 `case`는 문장만 평가한다(→ fall-through, 일치 뒤의 `case` 식은 평가하지 않음). 완료가 abrupt(break 등)면 즉시 돌려준다. `default`가 있으면 ① `default` 앞의 `case`들 ② (일치 없으면) `default` 뒤의 `case`들을 비교 ③ 그래도 없으면 `default`부터 실행하고 이어서 `default` 뒤의 `case`들의 문장을 실행한다.
  - `break;` Evaluation(14.9.2): `{ [[Type]]: break, [[Target]]: empty }` 완료. `break label;`은 `[[Target]]: label`. `continue`(14.8.2)도 같은 모양의 continue 완료.
  - LabelledEvaluation(14.13.4): `BreakableStatement`(반복문, `switch`)는 Target이 empty인 break 완료를 정상 완료로 바꾸고 끝난다. `LabelledStatement`는 Target이 자기 레이블인 break 완료를 정상 완료로 바꾼다.
  - LoopContinues(14.7.1.1): 정상 완료이거나 Target이 empty(또는 레이블 집합에 있는) continue 완료면 반복을 계속한다. ForBodyEvaluation(14.7.4.3): 조건 → 본문 → (LoopContinues면) 증감식 → 조건 순서. `switch`는 continue 완료를 처리하지 않으므로 그대로 바깥 `for`로 전달된다.
  - Early Errors: `break;`는 반복문이나 `switch` 안(함수 경계를 넘지 않음)에만(14.9.1), `continue`는 반복문 안에만(14.8.1) 올 수 있다. 아니면 SyntaxError.
  - 앵커 존재 확인: `sec-switch-statement`, `sec-switch-statement-runtime-semantics-evaluation`, `sec-runtime-semantics-caseblockevaluation`, `sec-runtime-semantics-caseclauseisselected`, `sec-break-statement`, `sec-break-statement-static-semantics-early-errors`, `sec-continue-statement`, `sec-continue-statement-static-semantics-early-errors`, `sec-loopcontinues`, `sec-for-statement`, `sec-forbodyevaluation`, `sec-labelled-statements`, `sec-runtime-semantics-labelledevaluation`, `sec-isstrictlyequal`.
- MDN(ko) 200 확인: `Reference/Statements/switch`, `break`, `continue`, `label`, `for`.
- 예제 초안 실제 출력(Node 24.22.1 `vm`, `run-example.ts`와 같은 방식, 8절 1단계 원문 그대로):

  | 예제 | 출력 (`console.log` 줄마다) |
  | - | - |
  | `fall-through.js` | `무료 배송` / `적립` |
  | `strict-match.js` | `문자열 1` |
  | `default-middle.js` | `확인 필요` / `보통` |
  | `case-evaluation.js` | `b` / `c` / `2` |
  | `loop-break-continue.js` | `1` / `3` / `끝` |
  | `switch-in-loop.js` | `하나` / `1번 끝` / `둘` / `3번 끝` |
  | `label.js` | `1 1` / `1 2` / `1 3` / `2 1` / `끝` |

- 본문 서술 근거(vm): `break;`, `continue;`, `if (true) { break; }`, `switch (1) { case 1: continue; }`, `for (;;) { function f() { break; } }`는 `new vm.Script`에서 SyntaxError. `switch (1) { default: break; }`는 파싱 성공. `'1' == 1`은 true, `'1' === 1`은 false. `label.js`에서 `break outer`를 `break`로 바꾸면 출력이 `1 1`/`1 2`/`1 3`/`2 1`/`3 1`/`3 2`/`3 3`/`끝`. 일치하는 `case`도 `default`도 없으면 아무 문장도 실행하지 않는다(`switch (5) { case 1: … }` 뒤 문장만 출력). `default-middle.js`의 값을 `'S'`로 바꾸면 `작음`, `'L'`이면 `큼`.
- 홈 정렬(실행 확인): 단축 평가 → 동등 비교 → 숫자 타입 → 암묵적 타입 변환 → 원시 값과 객체 → 증감 연산자 → **switch와 break·continue** → typeof 연산자. 새 개념은 일곱 번째 카드다.
- summary 초안 154자, `객체` 없음(실행 확인).

### 추정
- 없음

## 3. 구현 전략
- increment-decrement와 같은 구조(예제 → meta → 시나리오·불변식 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다.
- 시뮬레이터 상태는 "실행 중인 구조" 목록(바깥 → 안쪽 순서의 `for`·`switch` 블록)과 변수 목록이다. 블록마다 그 안에서 일어난 사건(식의 값, `case` 비교, 조건 검사, fall-through, `break`·`continue`, 끝)을 쌓는다. `break`·`continue` 다음 단계에서 어느 블록이 사라지고 실행이 어느 줄로 가는지가 이 개념의 핵심이라, 블록이 겹쳐 보이는 모양을 골랐다(`for` 안의 `switch`에서 `continue`가 `switch`를 지나 `for`로 가는 것이 보인다).
- `for` 블록의 사건은 반복 회차마다 새로 시작한다(회차 번호를 머리에 표시). 17·21단계 시나리오에서 사건 목록이 길어지지 않게 하기 위해서다.
- 버린 대안: ① 줄 강조만 하는 시뮬레이터. `case` 비교 결과와 `break`의 대상이 보이지 않는다. ② 명세의 완료 기록(Completion Record)을 그대로 보여 주기. 미학습 용어가 늘고 화면이 복잡해진다. 본문 한 문단과 `simplifications`로 다룬다. ③ `default-middle`·`label`도 시나리오로. 단계가 너무 많아진다. 예제 + 퀴즈로 다룬다(사용자 결정과 일치). ④ 다른 개념의 `EvaluationView` 재사용. AGENTS 규칙상 개념 간 공유 부품은 `app/simulator/`뿐이고 상태 모양도 다르다. 클래스 문자열만 같게 쓴다.
- 정확성 검증은 세 겹이다: (a) `case` 비교 순서를 테스트가 CaseBlockEvaluation 규칙으로 계산 (b) 조건·출력·증감을 그 단계 변수 값으로 vm에서 다시 평가 (c) 예제에 줄 기록 호출을 끼운 계측본을 실행해 얻은 실제 줄 순서와 시나리오 단계의 줄 순서를 대조.

## 4. 변경 파일
- 추가 `app/concepts/switch-break-continue/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 7개: `fall-through.js`, `strict-match.js`, `default-middle.js`, `case-evaluation.js`, `loop-break-continue.js`, `switch-in-loop.js`, `label.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `FlowView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `SWITCH_PATH`, `SWITCH_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(라이트·다크 describe 안, `test.slow()`)
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록(파일 끝 increment-decrement 블록 뒤)
  - `docs/content-guide.md` 9단계: e2e 대상 개념 목록에 `switch-break-continue` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch1-12.md`: 5번 계획 문서·상태 갱신, 진행 기록 한 줄
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, 기존 개념 폴더 7개, `package.json`(의존성 없음), `AGENTS.md`.

## 5. 위험 요소
- 시나리오의 `case` 비교 순서·결과, 조건 결과, 출력, 실행 줄 순서를 잘못 적음 → 틀린 흐름을 보여 줌 → 2단계 계산·대조 테스트 3겹 + 음성 확인 5가지.
- "`break`는 `switch`에서만 쓴다", "`continue`는 다음 `case`로 간다"처럼 오해를 강화하는 문구 → 본문·단계 설명은 "가장 가까운 반복문이나 `switch`를 끝낸다", "가장 가까운 반복문의 이번 반복을 끝내고 다음 반복으로"로 통일한다(5단계 체크).
- fall-through 단계에서 아래 `case`의 식을 평가하는 것처럼 보이게 함 → fall-through 사건 문장에 "식은 평가하지 않음"을 넣고, 테스트가 일치 뒤에는 그 `switch` 실행에서 `compare` 사건이 없음을 검사한다.
- 미학습 개념(스코프·블록 스코프·실행 컨텍스트) 서술 → `for` 문이 끝나면 `i`를 표시에서 빼는 이유는 "`for` 문 밖에서는 쓸 수 없다(스코프는 별도 개념)"로만 쓰고 `simplifications`에 밝힌다.
- 시나리오 라벨에 기호가 많으면 radio 이름 매칭이 헷갈림 → 라벨: `break가 없을 때`, `반복문의 break와 continue`, `반복문 안의 switch`.
- 21단계 시나리오가 e2e a11y 전 단계 검사 시간을 늘림 → `test.slow()`(increment-decrement와 같음). 시나리오 3개 합계 47단계.
- 375px에서 블록 두 겹 + 사건 문장이 넘침 → `flex-wrap`·`[overflow-wrap:anywhere]`, 안쪽 블록 들여쓰기는 작게(예: `ml-2`), e2e 가로 스크롤 검사.
- `객체` 검색 1건 가정 → meta 세 필드 검사(1단계 완료 조건).
- 홈 카드 순서 변화(새 개념이 일곱 번째, typeof가 여덟 번째) → 정렬 규칙대로. `navigation.spec.ts`는 검색 후 1건만 확인하므로 영향 없음.
- 공통 셸 미수정이므로 기존 시뮬레이터 회귀는 없어야 한다 → 전체 검증 순서로 확인.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 7개 실제 출력 = `expectedOutput`, "본문 주장 검증", 시나리오 비교 순서 계산·vm 재평가·실제 줄 순서 대조, 음성 확인(2단계 5가지).
- 브라우저(빌드 결과 `serve` 또는 dev 서버 재시작 후 `/concepts/switch-break-continue`):
  1. 첫 화면: "검토 중" 배지, 학습 목표, 선행 개념 중 `equality-operators`·`increment-decrement` 링크, 퀴즈가 라디오 UI.
  2. `break가 없을 때`: 4단계 `case 3: 2 === 3 → false`, 5단계 `case 2: 2 === 2 → true`, 7단계 fall-through 문장(`case 1`, 식은 평가하지 않음), 9단계 `switch` 끝. 콘솔 `무료 배송`/`적립`.
  3. `반복문의 break와 continue`: 8단계 `continue` 사건 뒤 9단계가 1번 줄·`i = 3`·3회차, 16단계 `break` 뒤 17단계에 블록이 없고 콘솔 마지막 줄 `끝`.
  4. `반복문 안의 switch`: 6단계 `break` 사건(switch 블록 안) 뒤 7단계에 switch 블록이 없고 `1번 끝` 출력, 13단계 `continue` 뒤 14단계가 1번 줄·`n = 3`(10번 줄 출력 없음), 18단계 일치하는 case 없음. 콘솔 `하나`/`1번 끝`/`둘`/`3번 끝`.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: 카드 8개(새 개념 일곱 번째), `객체` 검색 1건, `switch` 검색 1건.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제·meta·본문 주장 검증
- 대상: `examples/*.js` 7개, `meta.ts`, `concept.test.ts`("본문 주장 검증" describe만), `route.tsx`, h2 3개만 있는 `content.mdx` 골격
- 현재: 폴더 없음
- 변경:
  - 예제를 아래 원문 그대로 만든다(파일 끝 줄바꿈 1개, 줄 번호를 시뮬레이터가 쓴다).

    `fall-through.js` (시나리오)
    ```js
    const level = 2;
    switch (level) {
      case 3:
        console.log('라운지');
      case 2:
        console.log('무료 배송');
      case 1:
        console.log('적립');
    }
    ```
    `strict-match.js`
    ```js
    const input = '1';
    switch (input) {
      case 1:
        console.log('숫자 1');
        break;
      case '1':
        console.log('문자열 1');
        break;
      default:
        console.log('일치 없음');
    }
    ```
    `default-middle.js`
    ```js
    const size = 'XL';
    switch (size) {
      case 'S':
        console.log('작음');
        break;
      default:
        console.log('확인 필요');
      case 'M':
        console.log('보통');
        break;
      case 'L':
        console.log('큼');
    }
    ```
    `case-evaluation.js`
    ```js
    let count = 0;
    function pick(value) {
      count++;
      return value;
    }
    switch ('b') {
      case pick('a'):
        console.log('a');
      case pick('b'):
        console.log('b');
      case pick('c'):
        console.log('c');
    }
    console.log(count);
    ```
    `loop-break-continue.js` (시나리오)
    ```js
    for (let i = 1; i <= 5; i++) {
      if (i === 2) continue;
      if (i === 4) break;
      console.log(i);
    }
    console.log('끝');
    ```
    `switch-in-loop.js` (시나리오)
    ```js
    for (let n = 1; n <= 3; n++) {
      switch (n) {
        case 1:
          console.log('하나');
          break;
        case 2:
          console.log('둘');
          continue;
      }
      console.log(n + '번 끝');
    }
    ```
    `label.js`
    ```js
    outer: for (let a = 1; a <= 3; a++) {
      for (let b = 1; b <= 3; b++) {
        if (a * b === 4) break outer;
        console.log(a, b);
      }
    }
    console.log('끝');
    ```
  - `meta.ts`:
    - `slug: 'switch-break-continue'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: ['equality-operators', 'increment-decrement']`
    - `title: 'switch와 break·continue: 실행은 어디로 이어지나'`
    - `summary`(154자): `switch는 ===로 일치하는 case부터 아래로 이어서 실행하고 break를 만나야 멈춥니다. break는 가장 가까운 반복문이나 switch를 끝내고, continue는 가장 가까운 반복문의 다음 반복으로 넘어갑니다. 실행 위치가 어디로 옮겨 가는지 단계별로 따라갑니다.`
    - `tags`(`객체` 금지): `switch`, `case`, `default`, `break`, `continue`, `fall-through`, `폴스루`, `제어문`, `조건문`, `반복문`, `for`, `레이블`, `레이블 문`, `label`, `일치 비교`, `===`, `CaseBlockEvaluation`, `IsStrictlyEqual`
    - `goals`: ① `switch`가 `===`로 일치하는 첫 `case`부터 `break`를 만날 때까지 아래 `case`의 문장도 실행한다는 것으로 출력을 예측할 수 있다 ② `default`가 어디에 있든 모든 `case`가 일치하지 않을 때 실행되고, 일치한 뒤에는 아래 `case`의 식을 평가하지 않는다는 것을 설명할 수 있다 ③ `break`는 가장 가까운 반복문이나 `switch`를 끝내고 `continue`는 가장 가까운 반복문의 다음 반복으로 넘어간다는 것을 구분해 반복문 안 `switch`의 실행 흐름을 예측할 수 있다 ④ 레이블을 붙인 `break`로 바깥 반복문을 끝낼 수 있다는 것과 `break`·`continue`를 쓸 수 없는 위치를 설명할 수 있다
    - `prerequisites`: `{ label: '표현식과 문' }`, `{ label: 'if 문과 for 문' }`, `{ label: '함수 선언과 호출' }`, `{ label: '동등 비교', slug: 'equality-operators' }`, `{ label: '증감 연산자', slug: 'increment-decrement' }`
    - `examples`: 위 7개(id는 파일명에서 `.js`를 뺀 것). `expectedOutput`은 `[]`로 두고 `npm test` 실제 출력을 2절 표와 대조한 뒤 채운다(다르면 멈추고 원인 확인).
    - `simplifications`:
      1. 시뮬레이터는 실행 위치를 줄 단위로 보여 준다. `for` 문의 조건식과 증감식은 모두 1번 줄로 표시하고, 증감식 실행과 다음 조건 검사는 한 단계로 묶는다.
      2. 명세는 `break`·`continue` 문을 평가하면 break·continue 종류의 완료 기록(Completion Record)을 만들고, 그것을 받은 바깥 문이 처리하도록 정한다. 시각화는 이것을 "가장 가까운 반복문·`switch`를 끝냄", "다음 반복으로"라는 이동으로만 보여 준다.
      3. 명세의 `for` 문은 `let`으로 선언한 변수를 반복마다 새로 만들어 이전 반복의 값으로 초기화한다(CreatePerIterationEnvironment). 시각화는 변수 하나의 값이 바뀌는 것처럼 보여 주고, `for` 문이 끝나면 그 변수를 표시에서 뺀다(`for` 문 밖에서는 쓸 수 없다. 스코프는 별도 개념에서 다룬다).
      4. `switch` 문이 실행될 때 명세가 만드는 블록 환경(BlockDeclarationInstantiation)과, `case`마다 선언한 `let`·`const`가 하나의 블록을 공유하는 문제는 다루지 않는다.
      5. 반복문은 `for`만 다룬다. `while`·`do...while`·`for...in`·`for...of`에서도 `break`·`continue`는 같은 규칙으로 동작한다. 레이블은 반복문에 붙이는 경우만 다룬다.
      6. "실행 중인 구조", "fall-through", "회차"는 교육용 이름이다(fall-through는 흔히 쓰는 용어이고 명세 용어가 아니다).
      7. `console.log`는 호스트 API다.
    - `references`(라벨 형식 `ECMAScript 명세 — …`, `MDN — …`): 명세 The switch Statement, CaseBlockEvaluation, CaseClauseIsSelected, IsStrictlyEqual, The break Statement, The continue Statement, LoopContinues, ForBodyEvaluation, Labelled Statements: LabelledEvaluation / MDN(ko) switch, break, continue, label, for. URL은 2절에서 확인한 것만 쓴다.
  - `concept.test.ts` "본문 주장 검증"(`runInNewContext`·`new Script`):
    - `break;`, `continue;`, `if (true) { break; }`, `switch (1) { case 1: continue; }`, `for (;;) { function f() { break; } }`는 `new Script`에서 SyntaxError. `switch (1) { default: break; }`는 파싱 성공.
    - `'1' == 1` → true, `'1' === 1` → false.
    - `label.js` 원문에서 `break outer`를 `break`로 바꿔 실행하면 2절의 8줄 출력.
    - `default-middle.js` 원문에서 `'XL'`을 `'S'`로 바꾸면 `['작음']`, `'L'`로 바꾸면 `['큼']`.
- 이유: 페이지의 사실 근거를 먼저 고정한다(가장 큰 위험은 내용 정확성).
- 주의사항: `meta.ts`는 `ConceptMeta` 타입 외 import 금지. 예제 폴더는 Prettier·ESLint 대상이 아니므로 한 줄 `if (…) continue;`가 유지된다. 예제 문자열은 한국어 그대로.
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/switch-break-continue` 통과. 실제 출력 = 2절 표. `node -e`로 meta의 `title`·`summary`·`tags`에 `객체`가 없고 summary가 160자 이하임을 확인한다.

### 2. 상태 모델·시나리오·의미 불변식 테스트
- 대상: `scenarios.ts`, `concept.test.ts`
- 변경:
  - 상태 타입(전체 스냅샷):
    ```ts
    export type Val = { type: 'number' | 'string'; display: string }
    export type Binding = {
      name: string
      declaredWith: 'let' | 'const'
      value: Val
      changed?: 'created' | 'updated' // 그 단계에서 새로 생김 / 값이 바뀜. 다음 단계에서 해제
    }
    export type FlowEvent =
      | { kind: 'value'; code: string; value: Val } // switch (code)의 값을 구함
      | { kind: 'compare'; caseCode: string; left: Val; right: Val; result: boolean } // case 비교 (===)
      | { kind: 'default' } // 일치하는 case가 없어 default부터 실행
      | { kind: 'fall-through'; caseCode: string } // break가 없어 caseCode의 문장으로 이어서 실행 (식은 평가하지 않음)
      | { kind: 'condition'; code: string; result: boolean } // for 조건식 또는 if 조건
      | { kind: 'jump'; statement: 'break' | 'continue'; target: 'switch' | 'for' } // 가장 가까운 대상
      | { kind: 'exit'; reason: 'end' | 'no-match' } // switch를 끝까지 실행 / 일치하는 case·default 없음
    export type Block = {
      kind: 'switch' | 'for'
      code: string // 블록 머리: 'switch (level)' / 'for (let i = 1; i <= 5; i++)'
      iteration?: number // for만: 현재 회차(1부터)
      events: FlowEvent[]
    }
    export type FlowState = { bindings: Binding[]; blocks: Block[] } // blocks: 바깥 → 안쪽
    ```
    `Val`·`Binding`·사건 생성은 헬퍼(`num`, `str`, `bind`, `compare` 등)로만 한다.
  - 시나리오 3개(id·label·exampleId): `fall-through`·`break가 없을 때`·`fall-through`, `loop-break-continue`·`반복문의 break와 continue`·`loop-break-continue`, `switch-in-loop`·`반복문 안의 switch`·`switch-in-loop`.
  - 단계 구성 공통: 첫 단계 "실행 전"(`line` 없음, `{ bindings: [], blocks: [] }`, `output: []`). 사건 하나당 한 단계(그 블록의 `events`에 하나를 더함). 출력 단계는 사건을 더하지 않고 `output`만 늘린다. `for` 증감식 단계는 변수 값을 바꾸고(`updated`) 회차를 1 늘리며 그 회차의 `events`를 조건 사건 하나로 새로 시작한다. `jump` 다음 단계에서 끝난 블록은 `blocks`에서 빠진다(`continue`면 `switch` 블록이 빠지고 `for`는 다음 회차로).
    - `fall-through`(9단계): 실행 전 → 1 `level = 2`(const, created) → 2 [switch (level)] 값 2 → 3 `case 3: 2 === 3 → false` → 5 `case 2: 2 === 2 → true` → 6 출력 `무료 배송` → 7 fall-through `case 1`(설명: 일치한 뒤라 `case 1`의 식은 평가하지 않고 문장으로 이어서 실행) → 8 출력 `적립` → 9 exit `end`(마지막 문장까지 실행해 switch를 벗어남)
      (각 화살표 앞 숫자는 그 단계의 `line`)
    - `loop-break-continue`(17단계): 실행 전 → 1 [for 1회차] `i = 1`(let, created) 조건 `i <= 5 → true` → 2 `i === 2 → false` → 3 `i === 4 → false` → 4 출력 `1` → 1 `i = 2`(updated) 2회차 `i <= 5 → true` → 2 `i === 2 → true` → 2 jump continue `for`(설명: 이번 반복의 남은 문장 3·4번 줄을 건너뛰고 증감식으로) → 1 `i = 3` 3회차 조건 true → 2 false → 3 false → 4 출력 `3` → 1 `i = 4` 4회차 조건 true → 2 false → 3 `i === 4 → true` → 3 jump break `for` → 6 블록 없음·변수 없음(i는 표시에서 뺌), 출력 `끝`
    - `switch-in-loop`(21단계): 실행 전 → 1 [for 1회차] `n = 1`(let, created) 조건 `n <= 3 → true` → 2 [switch (n)] 값 1 → 3 `case 1: 1 === 1 → true` → 4 출력 `하나` → 5 jump break `switch`(switch 블록 안 사건) → 10 switch 블록 없음, 출력 `1번 끝`(설명: break는 가장 가까운 switch만 끝냈으므로 for 본문의 다음 문장) → 1 `n = 2` 2회차 조건 true → 2 [switch] 값 2 → 3 `case 1: 2 === 1 → false` → 6 `case 2: 2 === 2 → true` → 7 출력 `둘` → 8 jump continue `for`(switch 블록 안 사건, 설명: continue는 switch가 아니라 가장 가까운 반복문에 적용) → 1 switch 블록 없음, `n = 3` 3회차 조건 true(10번 줄 건너뜀) → 2 [switch] 값 3 → 3 `case 1: 3 === 1 → false` → 6 `case 2: 3 === 2 → false` → 9 exit `no-match`(일치하는 case도 default도 없음) → 10 switch 블록 없음, 출력 `3번 끝` → 1 `n = 4` 4회차 조건 `n <= 3 → false`(설명: 조건이 false라 반복문이 끝남) → (line 없음) 블록 없음·변수 없음 "실행 끝"
  - `concept.test.ts`에 추가:
    - 시나리오마다 `assertScenarioInvariants`, id 순서 고정, 첫 단계 빈 상태·`line` 없음, 단계 수 9/17/21.
    - 구조: 바인딩 이름 중복 없음. `changed`는 테스트가 직전 단계와 비교해 계산한 값과 같다(새 이름 → `created`, 값이 다름 → `updated`, 그대로 → 없음). `blocks`의 `kind` 순서는 `for` 다음 `switch`만 허용. 같은 블록이 이어지는 동안(같은 `kind`·`code`, `for`는 같은 `iteration`) `events`는 직전 단계 `events` 그대로이거나 하나를 더한 것. `for` 회차가 바뀌는 단계는 그 변수가 정확히 1 늘고 `events`가 조건 사건 하나다. 출력이 늘어나는 단계는 사건이 늘지 않는다. `jump` 다음 단계에서 break의 대상 블록은 `blocks`에 없고, continue면 `switch` 블록은 없고 `for`는 회차가 1 늘어 있다. `for` 블록의 첫 단계(변수 생성)와 회차가 바뀌는 단계는 `events`가 조건 사건 하나다.
    - 비교 순서(명세 계산): 각 `switch` 블록 실행 구간마다 소스의 그 `switch`에서 `case` 식과 `default` 위치를 정규식으로 뽑고(`case (.+):`, `default:`), 식을 vm으로 평가한 값과 `value` 사건 값으로 CaseBlockEvaluation 규칙을 따라 기대 비교 목록(비교할 `case`와 결과)과 시작 지점(`case` / `default` / 일치 없음)을 계산해 `compare` 사건 목록과 대조한다. `compare`의 `left` = `value` 사건 값, `result` = `left`와 `right`의 타입·값이 같음. 일치 뒤에는 그 구간에 `compare`가 없다. `fall-through` 사건의 `caseCode`는 소스상 다음 `case`/`default`다.
    - vm 재평가: `value` 사건 값 = `switch (…)` 식을 그 단계 변수로 평가한 값, `condition` 결과 = `code`를 그 단계 변수(증감 단계는 바뀐 값)로 평가한 값(`runInNewContext(code, 변수 객체)`), 출력이 늘어나는 단계의 새 줄 = 그 단계 `line`의 `console.log(…)` 문을 그 단계 변수로 실행한 출력(`util.format`).
    - 실제 줄 순서(`for`가 있는 시나리오 2개와 `fall-through` 모두): 예제 원문에서 `console.log`·`if`·`break`·`continue`·`switch`로 시작하는 줄 앞에 `__hit(N); `를 붙이고 `for (…; 조건; …)`의 조건을 `(__hit(N), 조건)`으로 바꾼 계측본을 `__hit`이 있는 sandbox로 실행해 줄 번호 목록을 얻는다. 시나리오에서 `line.from`이 계측한 줄인 단계의 줄 목록을 만들고, 두 목록 모두 연속 중복을 하나로 합친 뒤 같아야 한다(`for` 머리 줄은 조건 검사 단계만 포함).
- 이유: 단계 내용이 명세 절차와 실제 실행 순서와 같음을 자동으로 보장한다.
- 주의사항: 정규식·계측은 이 페이지 예제 3개의 모양만 처리하면 된다. 처리하지 못하는 모양이 나오면 테스트가 실패하도록 한다(조용히 건너뛰지 않음).
- 완료 조건: `npm test -- app/concepts/switch-break-continue/concept.test.ts` 통과. 음성 확인 5가지를 일부러 넣어 실패를 확인하고 되돌린다: ① `fall-through` `case 3` 비교 결과를 true로(비교 계산) ② `fall-through` 7단계 앞에 `case 1` `compare` 사건을 넣음(일치 뒤 비교 금지) ③ `loop-break-continue` 8단계(continue) 다음에 4번 줄 출력 단계를 끼움(줄 순서·출력 재평가) ④ `switch-in-loop` 14단계 `n`을 2로 둠(증감·조건 재평가) ⑤ `switch-in-loop` 7단계에 switch 블록을 남김(`jump` 다음 단계 구조 검사).

### 3. 시각화 컴포넌트 FlowView
- 대상: `FlowView.tsx`, `FlowView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `FlowState`를 그린다.
  - "실행 중인 구조" 영역(`section` + `useId` `aria-labelledby`): 없으면 "아직 실행 중인 switch나 반복문이 없습니다." 있으면 블록마다 테두리 상자(안쪽 블록은 바깥 상자 안에 작게 들여씀). 머리: 종류 배지(`반복문`/`switch`, 텍스트) + `code`(`font-mono`) + `for`면 `N회차`. 사건 순서 목록(`<ol>`): 사건마다 종류 배지 + 문장:
    - `value`: 배지 `값` — `level의 값 2`(문자열 값은 따옴표: `"1"`)
    - `compare`: 배지 `비교` — `case 3: 2 === 3 → false`
    - `default`: 배지 `default` — `일치하는 case가 없어 default부터 실행`
    - `fall-through`: 배지 `이어서 실행` — `break가 없어 case 1의 문장으로 이어서 실행(식은 평가하지 않음)`
    - `condition`: 배지 `조건` — `i <= 5 → true`
    - `jump`: 배지 `break`/`continue` — break+switch `가장 가까운 switch를 끝냄`, break+for `가장 가까운 반복문을 끝냄`, continue `이번 반복을 끝내고 증감식으로`
    - `exit`: 배지 `끝` — end `마지막 문장까지 실행해 switch를 벗어남`, no-match `일치하는 case도 default도 없어 switch를 벗어남`
  - "변수" 영역: increment-decrement `EvaluationView`와 같은 모양(`let`/`const` 배지, `이름 = 값`, 타입 배지 `숫자`/`문자열`, `새로 생김`/`값이 바뀜` 배지, `bg-highlight`). 문자열 값은 따옴표로 표시한다.
  - 스타일 토큰·배지·줄바꿈 클래스 문자열은 `increment-decrement/EvaluationView.tsx`와 같게 쓴다(import하지 않음).
- 이유: 상태 모양이 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더되는 첫 단계(빈 상태)가 JS 없이 의미 있게 보여야 한다. 애니메이션은 `motion-safe:`만. 색만으로 구분하지 않는다(배지 텍스트). 375px에서 넘치지 않게 `flex-wrap`·`break-words [overflow-wrap:anywhere]`, 중첩 들여쓰기는 작게. `prevState`는 쓰지 않는다.
- 완료 조건: `FlowView.test.tsx` 통과 — 빈 상태 문구 2개, `fall-through` 7단계에서 `switch` 배지·`switch (level)`·`비교` 배지 2개·`case 3: 2 === 3 → false`·`이어서 실행` 문장, `switch-in-loop` 6단계에서 블록 두 겹(`반복문` 안에 `switch`, `1회차`)과 `break` 배지·`가장 가까운 switch를 끝냄`, 변수 `새로 생김`/`값이 바뀜` 배지.

### 4. Simulator 래퍼
- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `increment-decrement/Simulator.tsx`와 같은 모양. `label="switch와 break·continue 시뮬레이터"`, `renderState={(state) => <FlowView state={state} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `break가 없을 때` "실행 전", 다음 클릭 시 1번 줄 강조(`aria-current="step"`), 시나리오 전환 시 0단계로 돌아감(increment-decrement `Simulator.test.tsx`와 같은 범위).

### 5. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `Simulator`, `scenarios` import)
- 변경:
  - `## 동작 원리`
    - `switch`: 괄호 안 식의 값을 한 번 구한 뒤, `case`의 식을 위에서부터 차례로 평가해 그 값과 `===`로 비교한다([동등 비교](/concepts/equality-operators) 링크). 처음 일치한 `case`의 문장부터 아래로 실행하며, 일치한 뒤에는 아래 `case`의 식을 평가하지 않고 문장만 이어서 실행한다(fall-through). `break`를 만나거나 끝까지 실행하면 `switch`를 벗어난다.
    - `default`: 위치와 상관없이 모든 `case`가 일치하지 않을 때 실행된다. 명세는 `default` 앞의 `case`, 뒤의 `case`를 모두 비교한 뒤에 `default`로 간다. `default`에서도 `break`가 없으면 그 아래 `case`의 문장으로 이어진다.
    - `break`: 가장 가까운 반복문이나 `switch`를 끝낸다. `continue`: 가장 가까운 반복문의 이번 반복을 끝내고 다음 반복으로 넘어간다(`for`는 증감식 → 조건식). `switch`는 `continue`의 대상이 아니므로 반복문 안 `switch`의 `continue`는 반복문에 적용된다.
    - 명세 한 문단: `break`·`continue`를 평가하면 "break 완료"·"continue 완료"라는 결과가 만들어지고, 그것을 받은 가장 가까운 반복문이나 `switch`가 처리한다(교육용 설명, `simplifications` 2와 연결).
    - 레이블: `outer: for …`처럼 반복문에 이름을 붙이고 `break outer`로 그 반복문을 끝낸다(`continue outer`는 그 반복문의 다음 반복으로, 한 줄).
    - SyntaxError 한 줄: 반복문이나 `switch` 밖의 `break`, 반복문 밖의 `continue`(`switch` 안이라도)는 실행 전에 SyntaxError.
  - `## 예제`: 예제 7개를 `file=` 코드 펜스로. `PredictQuiz` 7개(예제마다 1개; 선택지 3~4개, 여러 줄 출력이면 질문에 ' / ' 구분 안내, 정답은 실제 출력). 시나리오 예제 3개(`fall-through`, `loop-break-continue`, `switch-in-loop`) 뒤에 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`. `case-evaluation.js` 설명에 `pick`이 2번만 호출된 이유(일치 뒤 `case pick('c')`의 식은 평가하지 않음).
  - `## 결과와 이유`: JSX `<table>`(예제 / 출력 / 이유), 예제별 이유 문단, `Callout type="misconception"` 5개: ① "`case`는 `==`로 비교한다"(`strict-match`) ② "일치한 `case`의 문장만 실행된다"(`fall-through`) ③ "`default`는 가장 먼저 확인되거나 맨 끝에만 올 수 있다"(`default-middle`) ④ "반복문 안 `switch`의 `break`는 반복문도 끝낸다"(`switch-in-loop`) ⑤ "`continue`는 `switch`의 다음 `case`로 넘어간다"(`switch-in-loop`, 반복문 밖이면 SyntaxError).
- 주의사항: 미학습 개념(스코프, 블록 레벨 스코프, 실행 컨텍스트)을 설명하지 않는다. 같은 대상은 같은 이름으로 부른다("가장 가까운 반복문이나 switch", "이번 반복", "이어서 실행"). 특정 스타일을 강요하는 권고("fall-through는 쓰면 안 된다", "레이블은 피해야 한다")는 쓰지 않는다. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/switch-break-continue/index.html`에 `<details` 7개 이상, 시뮬레이터 0단계 텍스트, 라디오 3개 이상, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 남은 `**` 0건.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch1-12.md`
- 변경: increment-decrement 케이스를 본떠 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y 시뮬레이터 케이스는 `test.slow()`, 시나리오 라벨 3개(`break가 없을 때`, `반복문의 break와 continue`, `반복문 안의 switch`). 빌드 블록(주석 "여덟 번째 개념(switch-break-continue)")은 `단계 1: 실행 전`, `아직 실행 중인 switch나 반복문이 없습니다.`, `아직 표시할 변수가 없습니다.`, region `aria-label="switch와 break·continue 시뮬레이터"`, 시나리오 라벨 3개, `<details` 7개 이상. 로드맵 5번 행의 계획 문서·상태를 갱신하고 진행 기록 한 줄을 추가한다.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~6을 확인하고 스크린샷 1장 이상.

## 9. 추가 개선 후보
- 기존 개념 `related`에 `switch-break-continue` 역방향 연결(`equality-operators`, `increment-decrement`).
- 7번(함수 호출) 개념에서 `return`이 반복문·`switch`를 함께 끝내는 경우를 이 페이지와 연결.

## 구현 진행

- baseline (2026-10-27, `83ab9c2`): lint·format:check·typecheck 오류 0, `npm test` 718 통과, `test:build` 63 통과, e2e 115 통과·3 건너뜀(기존 의도된 3건). 사용자 dev 서버가 5173에서 실행 중(새 폴더 확인 시 재시작 필요 — 사용자 서버라 건드리지 않고 빌드 결과 `serve`로 확인)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 137 통과, lint·typecheck·prettier 0. 예제 7개가 계획 원문과 바이트 동일, 실제 출력 = 2절 표. `객체` 없음, summary 154자. 메인 수정: `meta.ts`의 URL 상수(`SPEC`·`MDN`)를 다른 개념과 같은 전체 URL 문자열로 풀어 씀(기존 패턴 일치)
- [x] 2. 상태 모델·시나리오·의미 불변식 테스트 — 메인 재실행: vitest(개념) 66 통과, lint·typecheck·prettier 0. 단계 수 9/17/21. 메인이 단계 설명 전부를 명세와 대조(문제 없음). 음성 확인 ①~⑤는 서브에이전트 보고(각 1~5건 실패), 메인이 별도 음성 확인(`loop-break-continue` 4회차 조건 code를 `i === 3`으로)으로 2건 실패(line 소스 대조·vm 재평가) 확인 후 원복. 계획 외 보강 검사 4건(새 사건 ↔ line 소스, 블록이 사라지는 경우 제한, fall-through 다음 절, exit end 시 마지막 절까지) 수용. 쓰이지 않는 `str` 헬퍼는 lint 때문에 만들지 않음(`Val`의 `'string'`은 계획대로 유지)
- [x] 3. FlowView — 메인 재실행: vitest(개념) 75 통과, lint·typecheck·prettier 0. 코드 확인: 사건 종류는 배지 텍스트로 전달, 클래스 문자열이 EvaluationView와 같음(import 없음), 중첩 블록 `mt-2 ml-2` 재귀, `flex-wrap`·`overflow-wrap:anywhere`, 하이드레이션 영향 값 없음(useId만). 메인 수정: `eventText`의 중첩 switch가 `// eslint-disable-next-line no-fallthrough`에 기대던 것을 `jumpText`·`exitText` 헬퍼로 나눠 주석 제거
- [x] 4. Simulator 래퍼 — increment-decrement 래퍼·테스트와의 diff가 import·타입·주석·label·View·시나리오 문구뿐. Simulator.test 3개 포함 통과
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·vm 근거와 대조해 수정: continue 완료를 "가장 가까운 반복문이나 switch가 처리"라고 쓴 문장을 "switch는 처리하지 않고 넘겨 가장 가까운 반복문이 처리"로(명세 14.13.4·LoopContinues), `while`·`do...while` "같은 규칙" 한 줄을 "가장 가까운 반복문에 적용되는 규칙은 같고 continue 뒤 바로 조건식"으로(vm 확인: `w 1, w 3, w 4`·`d 1, d 3`), 퀴즈 설명 `=== 로` 띄어쓰기, 예제 7의 레이블 없는 break 출력 문장 명확화. 서브에이전트가 Callout 안 `case 2`·`case 1`을 `<code>{'…'}</code>`로 바꿔 공백 깨짐 1건 해소. 메인 재실행: `npm test` 810 통과, lint·format:check 0, build 성공, HTML `<details` 7·라디오 3·0단계 문구·region aria-label 있음·공백 깨진 code 0·`**` 0
- [x] 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인 — 테스트 추가만(기존 파일의 삭제 줄은 content-guide 9단계 목록 문구와 로드맵 5번 행뿐). 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 810(baseline 718), `test:build` 70(baseline 63), e2e 127 통과·3 건너뜀(baseline 115·3). 브라우저(빌드 결과를 `serve` 4175로 띄워 Playwright, 사용자 dev 서버 5173은 건드리지 않음): 1280px 다크에서 세 시나리오 전 단계 블록·사건·변수 텍스트가 6절 2~4와 일치(`case 3: 2 === 3 → false`·`case 2: 2 === 2 → true`·fall-through 문장·`switch를 벗어남`, continue 뒤 9단계 `i = 3` 3회차·break 뒤 17단계 블록 없음, 6단계 switch 안 break 뒤 7단계 switch 블록 없음·13단계 continue 뒤 14단계 `n = 3`·18단계 일치 없음), 콘솔 `무료 배송 적립`·`1 3 끝`·`하나 1번 끝 둘 3번 끝`. "검토 중" 배지, 선행 링크(equality·increment), 라디오 퀴즈 7. 375px 라이트 전 단계 가로 넘침 0, 키보드 →×3/←/Home 동작. 콘솔 에러 0. 홈 카드 8개(새 개념 일곱 번째), `객체` 검색 1건, `switch` 검색 1건. 스크린샷 2장(scratchpad)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff가 개념 폴더 1개 + 테스트 추가라 sub agent 생략): Critical/High 0. Low 3(보고만): ① `scenarios.ts:95` 첫 단계 설명 "실행 중인 switch나 반복문과 선언문이 실행된 변수만"이 읽기 어색함 ② `meta.ts:91` 단순화 4의 "하나의 블록을 공유하는 문제" — 결과의 원인 설명이 아니라 다루지 않는 주제 이름이지만 AGENTS가 피하라는 단어("공유")를 씀. "같은 블록에 속하는 문제"로 바꿀 수 있음 ③ `build-output.test.ts` 새 블록이 다른 시뮬레이터 프리렌더 블록 옆이 아니라 sitemap 블록 뒤 파일 끝에 있음(동작 영향 없음)

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 메인 검토에서 본문의 continue 완료 처리 문장을 명세에 맞게 고치고 `while`·`do...while` 한 줄을 구체화했다(구현 진행 5) ② `FlowView`의 중첩 switch를 헬퍼로 나눠 `eslint-disable` 주석을 없앴다(구현 진행 3) ③ `meta.ts` URL 상수를 기존 패턴대로 풀어 썼다(구현 진행 1) ④ 서브에이전트가 계획 외 보강 검사 4건을 넣었고 수용했다(구현 진행 2). 쓰이지 않는 `str` 헬퍼는 만들지 않았다.
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. Low 3건(첫 단계 설명 문장, 단순화 4의 "공유" 단어, 빌드 테스트 블록 위치)은 보고만 했고, 사용자가 고치지 않은 상태로 승인했다.

### 후속 작업
- [x] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록 — 2026-10-27 사용자 승인, `'2026-10-27'`(4번 `increment-decrement`도 함께)
- [ ] 리뷰 Low 3건 정리 여부(선택)
- [ ] 9절 추가 개선 후보(역방향 `related`, 7번에서 `return` 연결)
- [ ] 로드맵 6번 "프로퍼티 키와 접근" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 본문의 "continue 완료를 가장 가까운 반복문이나 switch가 처리한다"를 "switch는 처리하지 않고 넘겨 가장 가까운 반복문이 처리한다"로 고쳤다 — 명세 LabelledEvaluation(14.13.4)에서 `BreakableStatement : SwitchStatement`는 break 완료만 정상 완료로 바꾸고, continue 완료는 LoopContinues(14.7.1.1)를 가진 반복문만 처리한다.
- [Claude 판단] `FlowView.eventText`의 중첩 switch가 바깥 `case 'jump'`에서 `case 'exit'`로 떨어질 수 있는 모양이라 `eslint-disable-next-line no-fallthrough`가 붙어 있던 것을 `jumpText`·`exitText` 헬퍼로 나눴다 — 동작은 같고(안쪽 switch가 모든 경우를 return), 린트 예외 없이 타입 검사로 빠짐없음이 보장된다.
- [무검토 승인] 시각화를 "실행 중인 구조"(바깥 → 안쪽 `for`·`switch` 블록)와 블록별 사건 목록으로 설계하고, `for` 사건은 회차마다 새로 시작했다 — `break`·`continue` 다음 단계에서 어느 블록이 사라지는지가 핵심이라 블록을 겹쳐 보였고, 21단계 시나리오에서 목록이 길어지지 않게 회차별로 초기화했다(계획 3절).
- [무검토 승인] 시나리오 정확성을 손으로 맞추지 않고 세 겹으로 검사했다 — CaseBlockEvaluation 규칙으로 비교 순서 계산, 조건·출력 vm 재평가, 예제에 `__hit(N)`을 끼운 계측본의 실제 줄 순서 대조(`concept.test.ts`, 계획 3절).
- [무검토 승인] `for` 문의 `let` 변수가 반복마다 새로 만들어지는 것(CreatePerIterationEnvironment)과 `for` 문 밖에서 쓸 수 없는 것을 시각화하지 않고, 변수 하나가 바뀌다 반복문이 끝나면 표시에서 빠지는 것으로 단순화했다 — 스코프는 13장(미학습)이라 `simplifications` 3에만 밝혔다.
- [무검토 승인] 리뷰 Low 3건을 고치지 않고 커밋했다.
- 범위(switch + for + 중첩)와 추가 항목 4개(`default` 중간, `case` 식 지연 평가, 레이블, SyntaxError 위치)는 사용자가 골랐다.

#### 배경지식
- CaseBlockEvaluation(14.12.2): `found`가 false인 동안만 `case` 식을 평가해 `===`(IsStrictlyEqual)로 비교하고, 일치한 뒤에는 남은 `case`의 문장만 평가한다(fall-through). `default`가 있으면 앞의 `case`, 뒤의 `case`를 모두 비교한 뒤에 `default`부터 실행하고 이어서 뒤의 `case` 문장을 실행한다.
- `break`·`continue`는 Target이 empty(레이블 없음) 또는 레이블인 break·continue 완료를 만든다. 반복문과 `switch`는 레이블 없는 break 완료를 정상 완료로 바꾸고 끝나며(14.13.4), continue 완료는 반복문만 LoopContinues로 처리한다. ForBodyEvaluation은 본문 → (계속이면) 증감식 → 조건식 순서다.
- Early Errors: 레이블 없는 `break`는 반복문·`switch` 안, `continue`는 반복문 안에만 올 수 있고(함수 경계를 넘지 않음), 아니면 파싱 단계 SyntaxError.

#### 확인 질문
1. 반복문 안의 `switch`에서 `break`는 `switch`만 끝내는데 `continue`는 왜 `for`에 적용되나?
   <details><summary>답</summary>`switch`는 레이블 없는 break 완료를 정상 완료로 바꾸고 끝나지만 continue 완료는 처리하지 않고 그대로 돌려준다. 그 완료를 받은 `for`가 LoopContinues로 "다음 반복"으로 처리한다(명세 14.13.4·14.7.1.1, 시나리오 `반복문 안의 switch` 6·13단계).</details>
2. `case-evaluation.js`에서 `count`가 3이 아니라 2인 이유는? 이 성질을 시뮬레이터는 어디서 보여 주나?
   <details><summary>답</summary>CaseBlockEvaluation은 일치한 뒤 남은 `case`의 식을 평가하지 않고 문장만 실행하므로 `pick('c')`는 호출되지 않는다. 시뮬레이터 `break가 없을 때` 7단계의 fall-through 사건("식은 평가하지 않음")이 보여 주고, 테스트가 일치 뒤 `compare` 사건이 없음을 검사한다(`concept.test.ts` "case 비교 순서").</details>
3. `default-middle.js`에서 값이 `'XL'`일 때 `'S'`·`'M'`·`'L'` 비교와 `default` 실행 순서는? `'L'`이면 왜 `큼`만 나오나?
   <details><summary>답</summary>`default` 앞의 `case 'S'`, 뒤의 `case 'M'`·`case 'L'`을 모두 비교해 일치가 없을 때 `default`부터 실행하고, `break`가 없어 `case 'M'`의 문장까지 이어진 뒤 `break`에서 멈춘다. `'L'`은 뒤쪽 `case 'L'`과 일치해 그 문장부터 실행하고 아래에 문장이 없어 끝난다(명세 14.12.2, `concept.test.ts` 본문 주장 검증).</details>
4. 시나리오 단계를 검사하는 "실제 줄 순서" 테스트는 무엇을 잡고, 무엇은 못 잡나?
   <details><summary>답</summary>예제의 `console.log`·`if`·`break`·`continue`·`switch` 줄과 `for` 조건에 `__hit(N)`을 끼운 계측본을 실행해 실제 줄 순서를 얻고, 시나리오 단계의 줄 순서(연속 중복 제거)와 비교한다. 그래서 continue 뒤에 건너뛴 줄을 실행하는 단계처럼 순서가 틀린 경우를 잡는다. `case` 줄은 문장을 끼울 수 없어 계측하지 못하므로 비교 순서는 따로 CaseBlockEvaluation 계산 검사가 맡는다(`concept.test.ts` "실제 줄 순서", 구현 진행 2).</details>
5. `FlowView`에서 `eslint-disable`을 지우고 헬퍼로 나눈 것이 동작을 바꾸지 않는 이유는?
   <details><summary>답</summary>원래 코드의 안쪽 switch는 `statement`·`reason`의 모든 경우에서 return해 실제로 바깥 `case 'exit'`로 떨어지지 않았다. 헬퍼로 나눠도 같은 문자열을 돌려주고, 반환 타입이 `string`인 함수에서 TypeScript가 모든 경우를 다뤘는지 검사한다(`FlowView.tsx`, FlowView 테스트 6개 통과).</details>
