# 시뮬레이터 공통 셸 추출 구현 계획

- 상태: 완료
- 작성일: 2026-10-26
- 기준: `main` @ `41b4114`

## 1. 목표

두 개념(`primitives-and-objects`, `short-circuit-evaluation`)에 복사되어 있는 시뮬레이터 셸을 `app/simulator/`의 제네릭 공통 셸 하나로 추출하고, 두 개념이 그 셸을 쓰게 바꾼다. 화면·동작은 바뀌지 않는다(첫 개념은 사용자 검토 승인 상태).

## 2. 요구사항 정리

- 요구사항
  - `app/simulator/`에 제네릭 셸 추가. props: 시나리오 목록, 영역 `aria-label`, 시각화 렌더 함수(`state`, `prevState`를 받음).
  - 두 개념이 이 셸을 쓰게 변경.
  - `AGENTS.md` 시뮬레이터 규칙(+디렉터리 구조의 `simulator/` 설명)과 `docs/content-guide.md` 5단계(시뮬레이터) 문구 갱신.
- 유지해야 하는 기존 동작 (현재 두 셸에서 같은 코드)
  - 시나리오 라디오(fieldset/legend "시나리오", 선택 시 `stepper.reset()`), 반응형 배치(lg 2열 grid, 좁은 화면 sticky 컨트롤, DOM 순서), 키보드(←/→/Home, 수정키 없을 때, 영역 자체나 컨트롤 버튼 포커스일 때만), 스크린 리더 안내(재생 중 고정, 정지 시 1회, 첫 렌더 빈 문자열), 콘솔 출력 섹션(`(아직 출력 없음)`), 루트 `data-wide=""`, `tabIndex={0}`, `role="region"`, 클래스 문자열 전부, 첫 렌더 = 프리렌더.
- 제외 범위
  - 시각화 컴포넌트(`MemoryView`, `EvaluationView`)·시나리오·본문(`content.mdx`) 변경 없음.
  - 셸의 UI 문구·클래스·구조 개선 없음(그대로 이동).
  - `useStepper`·`StepControls`·`CodeView` 변경 없음.

## 3. 현재 구조

- `app/concepts/primitives-and-objects/Simulator.tsx`와 `app/concepts/short-circuit-evaluation/Simulator.tsx`는 `diff` 결과 다음만 다르다: 시각화 import(`MemoryView`/`EvaluationView`), 상태 타입(`MemoryState`/`EvalState`), 맨 위 주석, `prevState` 계산 줄(단축 평가에는 없음), `aria-label`("원시 값과 객체 시뮬레이터"/"단축 평가 시뮬레이터"), 시각화 호출(`<MemoryView state prevState />`/`<EvaluationView state />`).
- 사용처: 각 `content.mdx` 1행 `import { Simulator } from './Simulator'`, `<Simulator scenarios={scenarios} />`. 각 `Simulator.test.tsx`가 `import { Simulator } from './Simulator'`, `render(<Simulator scenarios={scenarios} />)`.
- `app/simulator/index.ts`가 `CodeView`, `StepControls`, `SPEEDS`, `useStepper`, 타입(`Speed`, `Stepper`, `LineRange`, `Scenario`, `Step`)을 내보낸다.
- `MemoryView` props: `{ state: MemoryState; prevState?: MemoryState }`. `EvaluationView` props: `{ state: EvalState }`.
- e2e(`tests/e2e/*`)는 region 이름·버튼·텍스트로 찾고, `useId` 값에 의존하지 않는다(grep 확인).

## 4. 변경 범위

- 추가: `app/simulator/SimulatorShell.tsx`, `app/simulator/SimulatorShell.test.tsx`
- 수정: `app/simulator/index.ts`(export 추가), 두 개념의 `Simulator.tsx`(얇은 래퍼로 축소), `AGENTS.md`, `docs/content-guide.md`
- 변경하지 않음: 두 개념의 `Simulator.test.tsx`, `content.mdx`, 시각화 컴포넌트, `scenarios.ts`, `tests/e2e/*`, `tests/build/*`

## 5. 구현 계획

### 1. 공통 셸 `SimulatorShell` 추가

- 대상: `app/simulator/SimulatorShell.tsx`, `app/simulator/index.ts`
- 현재: 없음(셸이 개념마다 복사됨).
- 변경: `primitives-and-objects/Simulator.tsx`의 본문을 그대로 옮겨 제네릭 컴포넌트로 만든다.
  ```tsx
  type Props<S> = {
    scenarios: Scenario<S>[]
    label: string // 영역 aria-label, 예: "원시 값과 객체 시뮬레이터"
    renderState: (state: S, prevState: S | undefined) => ReactNode
  }
  export function SimulatorShell<S>({ scenarios, label, renderState }: Props<S>)
  ```
  - `aria-label={label}`, 시각화 자리에 `{renderState(step.state, prevState)}`. `prevState` 계산은 첫 개념 셸 그대로(`stepper.index > 0 ? 이전 단계 state : undefined`).
  - 내부 import는 상대 경로(`./CodeView`, `./StepControls`, `./useStepper`, `./types`) — `app/simulator` 안의 다른 파일과 같은 방식.
  - 나머지 JSX·클래스·주석(배치·안내·키보드 설명)은 문자 그대로 옮긴다. 맨 위 주석만 "개념 공통 셸 ..."로 바꾼다.
  - `index.ts`에 `export { SimulatorShell } from './SimulatorShell'` 추가.
- 이유: 두 셸의 차이는 라벨·시각화·상태 타입뿐이므로 이 셋을 props/제네릭으로 받으면 된다.
- 주의사항: 렌더 함수는 컴포넌트가 아니라 호출 결과(ReactNode)를 넣는다(`renderState(...)`). 매 렌더 새 함수여도 시각화 컴포넌트가 리마운트되지 않는다(요소 타입이 그대로). 기존 구조와 DOM이 같아야 한다.
- 완료 조건: `npm run typecheck`·`npm run lint` 오류 0. `diff <(git show 41b4114:app/concepts/primitives-and-objects/Simulator.tsx) app/simulator/SimulatorShell.tsx`의 차이가 다음 줄뿐: import 4줄, `Props` 타입 선언, 맨 위 주석 1줄, 함수 시그니처(`SimulatorShell<S>({ scenarios, label, renderState }: Props<S>)`), `aria-label={label}`, 시각화 호출 1줄(`{renderState(step.state, prevState)}`).

### 2. 두 개념의 `Simulator.tsx`를 얇은 래퍼로 교체

- 대상: `app/concepts/primitives-and-objects/Simulator.tsx`, `app/concepts/short-circuit-evaluation/Simulator.tsx`
- 현재: 셸 전체 구현(약 145줄).
- 변경: 같은 이름·같은 props(`{ scenarios: Scenario<XState>[] }`)의 `Simulator`를 유지하고 공통 셸에 위임한다.
  ```tsx
  export function Simulator({ scenarios }: Props) {
    return (
      <SimulatorShell
        scenarios={scenarios}
        label="원시 값과 객체 시뮬레이터"
        renderState={(state, prevState) => <MemoryView state={state} prevState={prevState} />}
      />
    )
  }
  ```
  단축 평가는 `label="단축 평가 시뮬레이터"`, `renderState={(state) => <EvaluationView state={state} />}`.
- 이유: MDX와 테스트의 import·사용법(`<Simulator scenarios={scenarios} />`)을 그대로 두어 테스트를 수정 없이(import 경로도 그대로) 통과시키고, 라벨·시각화 연결을 개념 폴더에 둔다. MDX에 렌더 함수를 쓰지 않아 본문이 깔끔하다.
- 주의사항: 래퍼 한 층이 생겨 `useId` 값 문자열이 달라질 수 있지만 프리렌더와 클라이언트가 같은 트리이므로 하이드레이션 불일치는 없다. id는 DOM 내부 연결(`aria-labelledby`, radio `name`)에만 쓰인다.
- 완료 조건: `npx vitest run app/concepts` 통과(두 `Simulator.test.tsx`, 시각화·concept 테스트 포함), `npm run lint` 오류 0(인라인 `renderState` 화살표가 react-hooks 규칙에 걸리지 않는지 확인), `git diff 41b4114 -- '*Simulator.test.tsx' '*content.mdx'` 비어 있음.

### 3. 공통 셸 단위 테스트

- 대상: `app/simulator/SimulatorShell.test.tsx`
- 변경: 개념과 무관한 작은 시나리오(상태 `{ n: number }`, 2개 시나리오)로 셸 고유 계약만 검사한다(동작 상세는 개념별 테스트가 이미 검사).
  - `label`이 region 이름이 된다.
  - `renderState`가 첫 단계에서 `prevState === undefined`, 다음 단계에서 이전 단계 state를 받는다(렌더 결과 텍스트로 확인).
  - 시나리오 전환 시 0단계로 돌아가고 `prevState`가 다시 `undefined`.
- 이유: 다른 공통 부품(`CodeView`, `StepControls`, `useStepper`)도 `app/simulator`에 자체 테스트가 있다.
- 완료 조건: `npx vitest run app/simulator` 통과.

### 4. 문서 갱신

- 대상: `AGENTS.md`, `docs/content-guide.md`
- 변경:
  - `AGENTS.md` 디렉터리 구조: `simulator/` 설명에 `SimulatorShell` 추가. 개념 폴더 줄의 `scenarios.ts 등 # (선택) 시뮬레이터: 시나리오, 시각화, 셸`을 "시각화, Simulator(공통 셸 래퍼)"로.
  - `AGENTS.md` 시뮬레이터 규칙: 공유 부품 목록에 `SimulatorShell` 추가. "셸은 개념 폴더 안에 둔다 … 미리 일반화하지 않는다" 항목을 "시나리오 선택·배치·키보드·스크린 리더 안내·콘솔 출력은 공통 셸 `SimulatorShell`이 맡는다. 개념 폴더의 `Simulator.tsx`는 영역 `aria-label`과 시각화 렌더 함수(`state`, `prevState`)만 넘기는 얇은 래퍼다. 셸을 바꾸면 모든 시뮬레이터 개념의 `Simulator.test.tsx`와 e2e로 회귀를 확인한다."로 교체. 상태 모양·시각화는 개념마다 설계한다는 문장은 유지.
  - `docs/content-guide.md` 5단계: 서두 "공통 부품은 `app/simulator/`뿐이고 나머지는 개념마다 직접 만듭니다"를 공통 셸 포함으로, 4번 항목 "셸(`Simulator.tsx`)"을 래퍼 작성법(`SimulatorShell`에 `scenarios`, `label`, `renderState` 전달, `data-wide`는 셸이 붙임, 예시 코드 몇 줄)으로 교체. 5번(MDX 독립된 줄)은 그대로.
- 완료 조건: `grep -n "SimulatorShell" AGENTS.md docs/content-guide.md`에 각각 해당 줄이 있고, "미리 일반화하지 않는다", "처음 만들 때는 `primitives-and-objects/Simulator.tsx`를 참고" 문구가 남아 있지 않음. `npm run format:check` 통과.

### 5. 전체 검증과 기록

- 대상: `.claude/plans/simulator-shell-extraction.md`의 `## 구현 진행`
- 변경: AGENTS 검증 순서 전체 실행, 명령별 결과(통과 수)를 `## 구현 진행`에 기록. `.claude/plans/short-circuit-evaluation.md` 후속 작업의 "시뮬레이터 공통 셸 추출" 체크는 finalize 단계에서.
- 완료 조건: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e` 모두 통과. `git diff --stat -- tests/ '*Simulator.test.tsx'` 비어 있음.

## 6. 엣지 케이스

- `EvaluationView`는 `prevState`를 받지 않음 → 렌더 함수에서 무시. 셸은 항상 `prevState`를 계산(비용 무시 가능).
- 시나리오가 1개인 개념: 현재 셸과 동일하게 라디오 1개를 그린다(동작 변화 없음, 개선은 범위 밖).
- 렌더 함수가 매 렌더 새로 만들어져도 요소 타입이 같아 시각화 내부 상태(`MemoryView`의 `useRef`/`useEffect`, `EvaluationView`의 `useId`)는 유지된다.

## 7. 회귀 위험

- 승인된 첫 개념 화면: 클래스·DOM 구조를 문자 그대로 옮기므로 위험 낮음. 개념별 `Simulator.test.tsx`, e2e responsive(배치)·a11y(axe)·concept(키보드·안내)가 검증.
- 하이드레이션: 래퍼 추가로 `useId` 값 변경 가능 → 서버·클라이언트 동일 트리라 불일치 없음. e2e의 콘솔 오류 수집(`tests/e2e/helpers.ts`)이 하이드레이션 경고를 잡는다.
- 번들: 공통 셸이 두 개념 청크가 공유하는 청크로 빠질 수 있음 — 동작 영향 없음.

## 8. 검증 계획

- 정적: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run test:build`, `npm run e2e`(AGENTS 검증 순서).
- 브라우저(e2e로 대부분 자동화됨, 보조로 dev 서버 확인): `/concepts/primitives-and-objects`와 `/concepts/short-circuit-evaluation`에서 ① 첫 화면 "단계 1: 실행 전", 시나리오 라디오 첫 항목 선택 ② "다음" 클릭 시 코드 강조·시각화(첫 개념은 "새로 생김" 표시) ③ 영역 포커스 후 → / ← / Home ④ 375px에서 컨트롤 sticky·가로 넘침 없음, 1280px에서 2열 ⑤ 콘솔 오류 없음.

## 9. 확인 필요 사항

- 없음

### 설계 결정

- 개념별 `Simulator.tsx`를 얇은 래퍼로 남긴다(MDX·테스트가 셸을 직접 쓰는 방식 대신). 이유: MDX에 렌더 함수를 쓰지 않아도 되고, 두 `Simulator.test.tsx`와 `content.mdx`를 import 경로까지 수정 없이 유지한다. 라벨·시각화 연결은 개념 폴더에 남는다. 문서 5단계 예시도 이 구조를 전제로 쓴다.
- AGENTS.md에는 요청에 없는 새 절차 규칙을 넣지 않는다. 기존 "미리 일반화하지 않는다" 항목은 조건(두 번째 시뮬레이터 개념)이 충족되어 공통 셸 설명으로 교체한다.

## 10. 추가 개선 후보

- 시나리오가 1개뿐인 개념에서 라디오 그룹 숨기기(현재 해당 개념 없음).

## 변경 이력

- 2026-10-26 (기준 갱신): main이 `f50442e` → `41b4114`(단축 평가 검토 반영)로 바뀌어 기준 해시와 diff 기준을 갱신. 두 `Simulator.tsx`, `app/simulator/`, `AGENTS.md`, `docs/content-guide.md`는 변경 없음(`git diff --stat f50442e..41b4114`). 단축 평가의 `EvaluationView.tsx`(aria-hidden 1곳), `Simulator.test.tsx`·`scenarios.ts`(문구)만 바뀜 — 계획 영향 없음

## 구현 진행

- baseline (2026-10-26, `41b4114`): lint·format:check·typecheck 오류 0, `npm test` 289 통과(20 파일), `test:build` 22 통과, e2e 67 통과·3 건너뜀(의도)
- [x] 1. 공통 셸 `SimulatorShell` 추가 — `diff <(git show 41b4114:…/primitives-and-objects/Simulator.tsx) app/simulator/SimulatorShell.tsx` 차이가 import·Props·맨 위 주석·시그니처·`aria-label={label}`·`renderState(...)` 줄뿐, typecheck·lint 오류 0
- [x] 2. 두 개념 `Simulator.tsx` 얇은 래퍼로 교체 — `git diff 41b4114 -- tests '*Simulator.test.tsx' '*content.mdx'` 비어 있음, 두 `Simulator.test.tsx` 수정 없이 통과
- [x] 3. 공통 셸 단위 테스트 — `app/simulator/SimulatorShell.test.tsx` 3개 통과
- [x] 4. 문서 갱신 — `AGENTS.md:33,40,73,74`, `docs/content-guide.md:101,106~118`. "미리 일반화하지 않는다"·"`primitives-and-objects/Simulator.tsx`를 참고" 문구 제거 확인
- [x] 5. 전체 검증 — lint·format:check·typecheck 오류 0, `npm test` 292 통과(21 파일, baseline +3), `test:build` 22 통과, e2e 67 통과·3 건너뜀(baseline과 같음)
- 리뷰 1차 (메인 직접): Critical/High 0 · Medium 0 · Low 0 — 계획 대조 일치

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현. 완료 조건 변경 없음(`변경 이력`은 기준 해시 갱신 1건뿐).

### 코드 리뷰

- 리뷰 1차에서 지적 없음(Critical/High/Medium/Low 0). 수정하거나 남긴 항목 없음.

### 후속 작업

- 없음

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [무검토 승인] 개념별 `Simulator.tsx`를 지우지 않고 얇은 래퍼로 남겼다. 대안은 `content.mdx`에서 `SimulatorShell`을 직접 쓰는 것이었다. 래퍼를 남기면 MDX에 렌더 함수를 쓰지 않아도 되고, 두 `Simulator.test.tsx`와 `content.mdx`가 import 경로까지 그대로라 "기존 테스트 수정 없이 통과"를 그대로 증명할 수 있다(9. 설계 결정).
- [무검토 승인] 시각화는 컴포넌트가 아니라 렌더 함수 `renderState(state, prevState)`로 받고, 셸이 그 호출 결과(ReactNode)를 넣는다. 매 렌더 새 화살표 함수가 만들어져도 반환하는 요소 타입(`MemoryView`/`EvaluationView`)이 같아 시각화가 리마운트되지 않는다(5. 1단계 주의사항, `app/simulator/SimulatorShell.tsx`).
- [무검토 승인] 셸은 `prevState`를 항상 계산하고, 쓰지 않는 개념(단축 평가)은 `(state) => …`로 무시한다. 셸 props를 개념마다 다르게 만들지 않기 위해서다(6. 엣지 케이스).
- [무검토 승인] 셸 내부는 `./CodeView` 같은 상대 경로로, 개념 래퍼는 `~/simulator`(index)로 가져온다. 셸이 index를 거치면 `index.ts` → `SimulatorShell.tsx` → `index.ts` 순환이 생긴다(5. 1단계).
- [무검토 승인] AGENTS.md의 "미리 일반화하지 않는다" 항목은 조건(두 번째 시뮬레이터 개념)이 충족되어 공통 셸 설명으로 바꿨고, 계획 검토에서 나온 새 절차 규칙("셸 수정 전 사용자와 상의")은 요청에 없어 넣지 않았다(9. 설계 결정).
- [무검토 승인] 개념 테스트와 별도로 `SimulatorShell.test.tsx`를 두어 셸 고유 계약(`label`→영역 이름, `prevState` 전달, 시나리오 전환 시 초기화)을 검사한다. 다른 공통 부품도 `app/simulator`에 자체 테스트가 있다(5. 3단계).

#### 배경지식

- React `useId`는 컴포넌트 트리 위치로 값을 정한다. 래퍼 한 층이 생기면 id 문자열이 바뀔 수 있지만, 프리렌더와 클라이언트 하이드레이션이 같은 트리를 그리므로 불일치는 생기지 않는다. 이 사이트에서 id는 라디오 `name`과 콘솔 영역 `aria-labelledby`에만 쓰인다.
- React는 같은 위치에 같은 타입의 요소가 오면 기존 인스턴스(상태·ref)를 유지한다. 렌더 함수가 매번 새로 만들어져도 반환 요소 타입이 같으면 리마운트가 없다. 반대로 렌더 중에 컴포넌트 함수를 새로 정의해 `<Comp />`로 쓰면 매 렌더 타입이 달라져 리마운트된다.
- `.concept-body > [data-wide]` CSS와 build 테스트는 `data-wide`가 본문의 직계 자식이어야 한다. 래퍼는 DOM을 추가하지 않으므로 셸 루트가 그대로 직계 자식이다.

#### 확인 질문

1. 개념 폴더의 `Simulator.tsx`를 지우고 `content.mdx`에서 `SimulatorShell`을 바로 쓰면 무엇이 달라지는가?
   <details><summary>답</summary>MDX에 `renderState={(state, prevState) => <MemoryView … />}` 같은 함수 식과 시각화 import를 직접 써야 하고, 두 `Simulator.test.tsx`의 import·render 코드도 바꿔야 한다. 그러면 "기존 테스트 수정 없이 통과"로 회귀가 없음을 보이기 어렵다(9. 설계 결정).</details>
2. `renderState` 대신 `View` 컴포넌트를 prop으로 받아 셸이 `<View state={…} prevState={…} />`로 그리게 했다면 단축 평가 쪽에 어떤 문제가 생기는가?
   <details><summary>답</summary>`EvaluationView`의 props에 `prevState`가 없어 셸이 넘기는 props 타입과 맞지 않는다. `View`의 props 타입을 개념마다 맞추거나 `prevState`를 optional로 받게 바꿔야 한다. 렌더 함수는 개념이 필요한 인자만 골라 쓸 수 있다(6. 엣지 케이스, `EvaluationView.tsx` Props).</details>
3. 셸에서 `import { CodeView, StepControls, useStepper } from '~/simulator'`처럼 index를 거쳐 가져오면 어떤 문제가 생길 수 있는가?
   <details><summary>답</summary>`index.ts`가 `SimulatorShell`을 내보내고 `SimulatorShell`이 다시 `index.ts`를 가져오는 순환 import가 생긴다. 지금은 모두 함수 선언이라 바로 깨지지 않을 수도 있지만 모듈 평가 순서에 기대게 되고, 최상위에서 값을 쓰는 코드가 생기면 초기화 전 접근 오류가 날 수 있다. 그래서 같은 폴더 안은 기존 파일처럼 상대 경로로 가져온다(5. 1단계).</details>
4. 개념 래퍼에서 `SimulatorShell`을 `<div>`로 한 번 감싸면 무엇이 깨질 수 있는가?
   <details><summary>답</summary>감싸는 `<div>`를 넣으면 셸 루트가 `.concept-body`의 직계 자식이 아니게 되어 `data-wide` 넓은 배치 CSS가 적용되지 않고 `tests/build/build-output.test.ts`의 직계 자식 검사가 실패한다(7. 회귀 위험, `app/app.css`).</details>
