# JS Under the Hood 초기 기획 및 기술 설계 구현 계획

- 상태: 승인
- 작성일: 2026-10-20
- 기준: git 저장소 아님 (빈 디렉터리 `/Users/sk/Documents/programming/js-basic`)

> 표기: **[확정]** 사용자 요구사항·답변으로 확정 / **[추정]** 계획 작성자의 제안·추정 (계획 승인 시 확정) / **[확인 필요]** 사용자 결정 필요

---

## 1. 목표

### 1.1 목표
- [확정] JS 코드가 "왜 그렇게 동작하는지"를 시각적으로 확인·설명할 수 있게 돕는 정적 학습 사이트를 만든다.
- [확정] 개념 1개 = 독립 URL 1개. 학습 진도에 맞춰 개념을 하나씩 추가해도 공통 코드를 고치지 않는 구조.
- [확정] 교육적 정확성 최우선: 페이지의 모든 "실행 결과" 주장은 실제 실행으로 검증되고, 단순화한 부분은 페이지에 명시한다.
- [확정] Vercel 정적 배포, SEO·접근성·모바일 대응.

### 1.2 비목표 (MVP)
- [확정] 로그인, DB, 백엔드, 자동 채점, AI 튜터, 범용 인터프리터, 도서 목차 기반 커리큘럼, 다국어.
- [추정] 사용자 코드 입력·실행(Monaco, Babel Parser) — 요구사항상 "필요 시 별도 검토" 대상이므로 MVP에서 제외.
- [추정] 학습 진행률 저장, 북마크, 다크모드 토글(시스템 설정만 따름), 전역 검색 팔레트, 목차(TOC).

---

## 2. 요구사항 정리

### 2.1 핵심 사용자와 사용 시나리오
| 사용자 | 진입 | 시나리오 |
|---|---|---|
| [확정] 운영자 본인 (Deep Dive 학습자) | 홈 → 개념 | 그 주 학습한 개념 페이지에서 결과를 먼저 예측 → 시뮬레이터로 한 단계씩 확인 → "왜"를 정리. 새 개념 추가 시 내용·시각 표현 검토/승인 |
| [추정] JS를 학습 중인 개발자/취준생 | 검색엔진·공유 링크로 상세 페이지 직접 진입 | 예측 → 시뮬레이션 → 오해 포인트 확인 → 선행/관련 개념 이동 |
| [추정] 스터디/멘토 | 링크 공유 | 개념 URL을 스터디 자료로 공유 |

### 2.2 요구사항
- 개념 탐색: 목록, 검색(제목·요약·태그), 선행/관련 개념 링크. 학습 순서 강제 없음.
- 상세 페이지 8요소(소개·목표 / 선행 개념 / 원리 / 예제 / 시각화 / 단계 설명 / 결과와 이유 / 관련 링크).
- 시뮬레이터: 개념별로 필요한 기능만. 공통화는 반복이 확인된 최소 부분만.
- 예측 → 확인 구조, 오해 포인트 설명.
- 콘텐츠 요소 분리: 메타데이터 / 설명 / 예제 / 시뮬레이션 단계 / 시각화 / 테스트.

### 2.3 사용자 결정 (질문 답변)
- [확정] 프레임워크: **Vite 기반 React Router Framework mode + 프리렌더** (Astro, Next.js 정적 export 대안 대비 선택).
- [확정] 학습 진도: Deep Dive 1~12장 → 첫 개념은 이 범위에서 선정.
- [확정] 한국어 전용.

### 2.4 유지해야 하는 기존 동작
- 없음(빈 저장소).

### 2.5 제외 범위
- 1.2 비목표 전체. 사용자가 아직 학습하지 않은 개념(실행 컨텍스트, TDZ, Event Loop 등)의 콘텐츠 작성.

---

## 3. 현재 구조
- 빈 디렉터리, git 미초기화, AGENTS.md/CLAUDE.md 등 지침 없음 → 충돌할 기존 규칙 없음.
- 로컬 환경: Node 24.21.0, npm 11.19.0, git 2.54. pnpm·Vercel CLI 미설치.
- 패키지 버전(2026-10-20 `npm view` 확인): react-router / @react-router/dev 8.5.0, vite 8.3.4, react 19.3.1, tailwindcss·@tailwindcss/vite 4.3.3, @mdx-js/rollup 3.1.1, @shikijs/rehype 4.5.0, remark-code-import 1.2.0(마지막 배포 2023-06), vitest 5.0.5, @playwright/test 1.64.1, @axe-core/playwright 4.14.0, typescript 7.0.2 / 6.0.3, typescript-eslint 8.72.0(peer TS `<6.1.0`), eslint 10.13.0, eslint-plugin-jsx-a11y 6.10.2(peer eslint `≤^9` → ESLint 10 미지원).
- React Router v8 (공식 문서 확인): Node ≥22.22, React ≥19.2.7, Vite ≥7. `ssr:false` + `prerender` → 경로별 `build/client/<path>/index.html`. `/`가 프리렌더되면 `__spa-fallback.html`이 항상 생성됨. `ssr:false`에서 `action`/`headers` export 금지, loader는 프리렌더 라우트에서만. loader가 없는 라우트는 `.data` 파일·요청이 없음. `prerender: true`는 정적 경로만 포함(`*`, `:param` 제외). `route()`의 `id` 옵션과 `getAppDirectory()` export 존재.
- Vercel: 출력 디렉터리 루트의 `404.html`을 미매칭 경로의 404 응답으로 사용.

---

## 4. 설계

### 4.1 MVP 기능 범위
| 포함 | 내용 |
|---|---|
| 공통 레이아웃 | 헤더(사이트명·홈·소개), 본문, 푸터(정확성 정책 링크), skip link, 시스템 다크모드 |
| 홈 | 사이트 소개 + 개념 목록(카테고리 그룹) + 클라이언트 검색(`?q=`) |
| 소개 `/about` | 프로젝트 목적, **정확성·단순화 정책**(ECMAScript vs 호스트 API 구분, `console`은 호스트 API라 출력 형식이 환경마다 다를 수 있음, 예제는 sloppy script 기준), 사용법 |
| 개념 상세 템플릿 | 4.3 UX. 메타데이터로 헤더·목표·선행/관련·참고자료·단순화 안내·검토 상태 자동 렌더 |
| 시뮬레이터 공통 최소 단위 | `types.ts`, `useStepper`, `StepControls`, `CodeView` (셸·시나리오 탭은 첫 개념 내부에 구현, 두 번째 개념 때 추출 여부 결정) |
| 예측 퀴즈 | `PredictQuiz` (선택 → 정답 공개 → 이유). 채점·저장 없음 |
| 첫 개념 1개 | 4.4.4 (권장: 원시 값과 객체 — 재할당과 변경) |
| 404 | 정적 404 페이지 (HTTP 404, noindex) |
| SEO | 페이지별 title/description/canonical/OG, sitemap.xml, robots.txt |
| 테스트 | 콘텐츠 무결성, 예제 실제 실행 검증, 시나리오 불변식, 단위 테스트, 빌드 결과 검사, E2E + axe |
| 배포 | Vercel 정적 배포, PR 프리뷰 |
| 문서 | AGENTS.md(+CLAUDE.md), 콘텐츠 추가 가이드 |

### 4.2 정보 구조와 사용자 흐름
```
/                       홈: 소개 + 개념 목록(카테고리 그룹) + 검색(?q=)
/concepts/<slug>        개념 상세 (개념별 정적 HTML)
/about                  프로젝트 소개 · 정확성 정책
/404 (+ 모든 미지 경로)  Not Found (HTTP 404)
/sitemap.xml, /robots.txt
```
- [추정] 카테고리: `fundamentals`(언어 기초) / `execution`(실행 모델) / `objects`(객체·프로토타입) / `async`(비동기) / `memory`(메모리). 탐색용 그룹이며 순서를 강제하지 않는다. 개념이 없는 카테고리는 표시하지 않는다.
- [추정] `/concepts` 별도 목록 페이지는 두지 않는다(홈이 목록). 개념 수가 늘면 추가 개선.
- 흐름: (A) 홈 → 검색/카드 → 상세 → 예측 → 시뮬레이터 → 관련 개념. (B) 검색엔진 → 상세 직접 진입 → 헤더·관련 링크로 이동.
- 검색: 입력값을 `?q=`에 반영(공유 가능), 제목·요약·태그 부분 일치(대소문자·앞뒤 공백 무시). **하이드레이션 안전 규칙**: 첫 렌더는 프리렌더 HTML과 동일하게 전체 목록 + 빈 입력값, `useHydrated()`가 true가 된 뒤에 `?q=`를 읽어 입력값·필터 적용. 결과 없음 문구 제공.

### 4.3 개념 상세 페이지 UX
섹션 순서 (요구사항 3.2의 8요소 매핑):
1. **헤더** (메타데이터): 제목, 한 줄 요약, 카테고리·태그, 검토 상태(`reviewedAt` 날짜 또는 "검토 중" 배지). → 요소 1
2. **학습 목표** (메타데이터 `goals`). → 요소 1
3. **선행 개념** (메타데이터 `prerequisites`): slug가 있으면 링크 칩, 없으면 텍스트 칩(아직 페이지가 없는 선행 지식, 예: "변수", "데이터 타입"). 비어 있으면 섹션 숨김. → 요소 2
4. **본문 (MDX)**: 필수 h2 3개 — `## 동작 원리`(요소 3), `## 예제`(요소 4·5·6: 예제 코드, `PredictQuiz`, 시뮬레이터), `## 결과와 이유`(요소 7, 오해 포인트 `Callout` 포함). 필수 h2의 존재는 테스트로 검사, 순서·추가 h2는 개념별 자유.
5. **이 시각화에서 단순화한 부분** (메타데이터 `simplifications`, ≥1). → 정확성 원칙
6. **관련 개념** + **참고 자료**(ECMAScript 명세 절, MDN). → 요소 8

레이아웃:
- 본문 최대 폭 약 70ch. 시뮬레이터는 본문보다 넓게(최대 ~1100px).
- 첫 개념 시뮬레이터: 데스크톱(≥1024px) 2열 = [코드 + 출력] | [시각화 + 단계 설명], 컨트롤은 상단. 모바일 = 세로 스택(코드 → 컨트롤 → 시각화 → 설명 → 출력), 컨트롤은 시뮬레이터 영역 안에서 sticky.

### 4.4 시뮬레이터 설계 방향

#### 4.4.1 원칙
- **인터프리터가 아니라 "검증된 스냅샷 시퀀스"**: 시나리오 = 사람이 작성한 단계 배열, 각 단계 = 그 시점의 **전체 상태 스냅샷**(차분 아님 → 이전/처음 이동과 테스트가 단순).
- 상태 모양(`S`)과 시각화·배치는 **개념별로 자유**. 공통 코드는 요구사항 3.3 기능 자체(단계 이동·자동 재생·속도·초기화·코드 강조)만.
- 시뮬레이터가 보여주는 코드 = `examples/*.js`를 `?raw`로 가져온 문자열 → 테스트가 같은 파일을 실제 실행해 최종 출력과 대조.

#### 4.4.2 공통 타입 (`app/simulator/types.ts`)
```ts
export type LineRange = { from: number; to: number }   // 1-based, inclusive
export type Step<S> = {
  title: string          // "q.n에 2를 할당 (객체 변경)"
  explanation: string    // 왜 이렇게 되는지 (평문 1~3문장)
  line?: LineRange       // 현재 실행 위치; 시작/종료 단계는 생략 가능
  state: S               // 이 단계 시점의 전체 상태
  output?: string[]      // 이 단계까지 누적된 console 출력 (출력 없는 개념은 생략)
}
export type Scenario<S> = {
  id: string             // URL-safe
  label: string
  exampleId: string      // meta.examples[].id — 코드 원본·기대 출력의 출처
  code: string           // examples/<file>?raw
  steps: Step<S>[]       // ≥ 2
}
```

#### 4.4.3 공통 컴포넌트 (`app/simulator/`)
- `useStepper({ total })` → `{ index, isFirst, isLast, next, prev, reset, goTo, playing, play, pause, speed, setSpeed }`. 자동 재생 간격 1500ms ÷ speed (0.5/1/2). 마지막 단계에서 자동 정지. 수동 이동·`goTo` 시 재생 정지. 언마운트 시 타이머 정리.
- `StepControls`: 처음으로·이전·재생/일시정지·다음(아이콘 + `aria-label`), "3 / 9" 표시, 속도 `<select>`. `autoplay={false}`면 재생·속도 숨김. 경계에서 해당 버튼 disabled.
- `CodeView`: 줄 번호 + `line` 범위 배경 강조 + 강조 줄 `aria-current="step"`. MVP는 구문 색상 없음(본문 코드 블록은 빌드 타임 Shiki 색상).
- 키보드·스크린리더(첫 개념 Simulator에서 구현, 규칙은 공통): 시뮬레이터 영역(`role="region"` + `aria-label`)에 포커스가 있을 때 ←/→ 이전/다음, Home 처음(입력 요소 포커스 시 무시, `preventDefault`). 단계 설명은 `aria-live="polite"`, **자동 재생 중에는 live 안내 끔**(정지 시 현재 단계 1회 안내).
- 애니메이션: CSS transition만, `prefers-reduced-motion: reduce`면 제거. Motion 라이브러리 미도입.

#### 4.4.4 첫 개념 선정과 설계
| 후보 (1~12장 범위) | 시각화 적합성 | 오해 포인트 | 순수 ECMAScript | 판단 |
|---|---|---|---|---|
| **원시 값과 객체: 재할당과 변경** (Deep Dive 11장 주제) | 높음 — 변수·객체 박스와 화살표로 "같은 객체"가 바로 보임 | `const` 객체 변경, 매개변수 재할당 vs 프로퍼티 변경, 객체 `===` | 예 | **권장** |
| 변수 선언과 호이스팅 (4장) | 중간 | `var` 호이스팅 | 예 | 실행 컨텍스트·TDZ 미학습 상태에서 정확히 설명하기 어려움 → 이후 |
| 타입 변환과 단축 평가 (9장) | 낮음 — 표/규칙 위주 | 많음 | 예 | 시뮬레이터보다 표가 적합 |

권장 첫 개념 `primitives-and-objects` — "원시 값과 객체: 재할당과 변경"
- **핵심 메시지 (명세 기준)**: 대입은 오른쪽 값을 평가해 바인딩에 넣을 뿐이며 명세에 "복사" 연산은 없다. 원시 값은 불변이라 공유 여부를 관찰할 수 없다. 관찰 가능한 차이는 단 하나 — **객체는 변경(mutation)할 수 있고, 같은 객체를 값으로 가진 모든 바인딩에서 그 변경이 보인다.** 재할당은 원시 값이든 객체든 다른 바인딩에 영향을 주지 않는다.
- **시나리오** (독자 예제, 도서 예제·문장 복제 금지):
  1. 재할당은 다른 변수에 영향이 없다 — 원시 값과 객체 모두: `let a = 10; let b = a; b = 20; let p = { n: 1 }; let q = p; q = { n: 2 }; console.log(a, b, p.n, q.n)` → `10 20 1 2`
  2. 변경은 같은 객체를 가진 모든 변수에서 보인다 (+ `const`는 재할당만 막음): `const p = { n: 1 }; const q = p; q.n = 2; console.log(p.n, p === q)` → `2 true`
  3. 함수 인자: 프로퍼티 변경은 호출자에게 보이고, 매개변수 재할당은 보이지 않는다 → 예) `99 1` (정확한 코드는 6단계에서 작성, 출력은 테스트로 확정)
- **상태 모델** (`MemoryState`, 개념 폴더 내부 타입):
  ```ts
  type Primitive = { kind: 'primitive'; type: 'number' | 'string' | 'boolean' | 'undefined' | 'null' | 'bigint' | 'symbol'; display: string } // string은 따옴표 포함 표시
  type Value = Primitive | { kind: 'object'; id: string }
  type MemoryState = {
    scopes: { id: string; label: string; bindings: { name: string; declaredWith: 'let' | 'const' | 'var' | 'param'; value: Value; changed?: boolean }[] }[]
    objects: { id: string; label: string; props: { key: string; value: Value }[]; changed?: boolean }[]
  }
  ```
- **시각화 `MemoryView`**: 왼쪽 "변수" 열(바인딩마다 `let`/`const`/매개변수 표식), 오른쪽 "객체" 열(HTML/CSS 레이아웃). 객체 참조는 `→ 객체 A` 텍스트 칩(접근성·모바일 대체 수단, 숫자/주소처럼 보이지 않도록 문자 라벨) + 장식용 SVG 화살표 오버레이(`aria-hidden`, ResizeObserver로 위치 계산; 계산 실패·좁은 폭에서는 화살표 생략). 변경된 바인딩/프로퍼티는 색 + "변경됨" 텍스트(색상 단독 의존 금지). 더 이상 어떤 바인딩도 가리키지 않는 객체는 흐리게 표시하고 "더 이상 참조되지 않음"(GC 시점은 설명하지 않음).
- **정확성 처리 → `simplifications`와 본문에 반영**:
  1. 명세는 값의 저장 위치(스택/힙/메모리 주소)를 규정하지 않으며 관찰 가능한 동작만 보장한다. `객체 A`는 객체의 **동일성(identity)** 을 나타내는 교육용 라벨이다.
  2. "복사"는 교육용 표현이다. 결과 차이의 원인은 재할당과 변경의 차이다.
  3. JS의 인자 전달은 항상 값의 전달이며, 객체의 경우 그 값이 객체를 가리킨다("공유에 의한 전달"). 명세의 Reference Record와 혼동되지 않게 "참조"라는 단어는 정의 후 제한적으로 사용.
  4. 바인딩은 **선언문이 실행된 뒤에만** 표시한다. 실제로는 선언 전에도 바인딩이 존재하며(호이스팅/TDZ), 이는 이후 개념에서 다룬다. 함수 선언의 바인딩과 함수 객체도 표시하지 않는다.
  5. 함수 호출 시 매개변수 묶음을 `change(...) 호출` 영역으로 표시 — 실행 컨텍스트/환경 레코드의 단순화.
- **Deep Dive와의 대응**: 도서 11장은 메모리 주소·스택/힙 그림과 "참조에 의한 전달" 용어를 사용한다. 이 페이지는 명세 기반 모델(바인딩·객체 동일성)을 쓰고, 본문에 "도서의 주소 그림과 이 페이지 모델의 대응" 문단을 독자 문장으로 둔다. → **[확인 필요] 10절 D2**

### 4.5 기술 스택과 선택 근거

#### 4.5.1 스택
| 영역 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | [확정] React Router Framework mode, `ssr:false` + `prerender` / [추정] 버전 8.5.x | 사용자 선택. Vite 기반, 경로별 정적 HTML(SEO), 서버 불필요, 라우트별 코드 분할(v8 기본) |
| 빌드 | [추정] Vite 8 | RR8 peer(^7‖^8), Tailwind·Vitest 지원 |
| UI | [추정] React 19 | RR8 요건 |
| 언어 | [추정] **TypeScript 6.0.x** (7 아님) | typescript-eslint 8.72 peer `<6.1.0` |
| 스타일 | [추정] Tailwind CSS 4 (`@tailwindcss/vite`) | 설정 최소, 반응형·다크모드 유틸 |
| UI 컴포넌트 | [추정] **MVP에서 shadcn/ui 미도입** | MVP의 버튼·라디오·select는 네이티브 요소 + Tailwind로 접근성 확보 가능. shadcn button 1개에도 cva·clsx·tailwind-merge·Radix slot·lucide 등이 추가됨. dialog/popover/command 필요 시 도입 |
| 콘텐츠 | [추정] MDX 3 (`@mdx-js/rollup`, `enforce:'pre'`) | 설명은 마크다운, 시뮬레이터는 JSX로 같은 문서에 배치 |
| 코드 하이라이트 | [추정] Shiki (`@shikijs/rehype`) 빌드 타임, github-light/dark 듀얼 테마 | 런타임 JS 0 |
| 예제 단일 원천 | [추정] `remark-code-import` (1단계 스파이크에서 검증, 실패·dev 갱신 문제 시 `?raw` + 빌드 타임 컴포넌트로 교체) | 본문 코드 블록·시뮬레이터·테스트가 같은 파일 |
| 단위/콘텐츠 테스트 | [추정] Vitest 5 + jsdom + @testing-library/react | Vite 생태계 |
| E2E·접근성 | [추정] Playwright + @axe-core/playwright, 정적 서버 `serve`(Vercel serve-handler 기반, 404.html 동작 유사) | 프리렌더 결과물 대상 실제 브라우저 검증 |
| 린트/포맷 | [추정] ESLint 10 + typescript-eslint + react-hooks + react-refresh / Prettier(+tailwind 플러그인). **jsx-a11y 미사용**(ESLint 10 미지원) → 접근성은 axe E2E + Testing Library role 쿼리로 보장 | ESLint 9로 내리는 대안은 9.x 유지보수 종료가 가까워 비권장 |
| 패키지 매니저 | [추정] npm, 정확한 버전 고정(`save-exact`) + lockfile | 이미 설치됨 |
| 배포 | [확정] Vercel 정적 | 요구사항 |

#### 4.5.2 도입하지 않는 후보
- React Flow: 그래프 편집용으로 무겁다. 프로토타입 체인 등 그래프가 필요해질 때 SVG 직접 구현과 비교 재검토.
- Motion: CSS transition으로 충분한지 먼저 확인.
- Monaco / Babel Parser: 사용자 코드 실행이 MVP 범위 밖.
- Pagefind/Fuse: 개념 수가 적어 단순 필터로 충분.
- 상태 관리·스키마 라이브러리(zod 등): 로컬 상태뿐이고 메타데이터는 TS 타입 + 테스트로 검증.

#### 4.5.3 주요 대안 비교
**A. 프레임워크** — [확정] 사용자 결정(RR 프리렌더). 기록용:
| | Astro + React islands | Next.js static export | **RR8 프리렌더 (선택)** |
|---|---|---|---|
| SEO | 정적 HTML | 정적 HTML | 정적 HTML |
| JS 로드 | 시뮬레이터만 | 페이지 전체 하이드레이션 | 페이지 전체 하이드레이션 |
| 콘텐츠 스키마 | 내장 | 직접 | 직접 (TS + 테스트) |
| 러닝커브 | .astro + React | RSC 경계 | React만 |
→ 트레이드오프: 페이지 전체가 하이드레이트되어 JS가 Astro보다 많음 → 라우트별 청크·빌드 타임 하이라이트·무거운 라이브러리 미도입으로 완화. 하이드레이션 불일치 규칙(4.2, 4.6) 필요.

**B. 개념 라우트 등록 방식**
| | B1. 단일 `concepts/:slug` + `import.meta.glob` lazy | **B2. `routes.ts`가 `app/concepts/*` 폴더를 읽어 개념별 라우트 등록 (권장)** | B3. 개념마다 routes.ts 수동 편집 |
|---|---|---|---|
| 코드 분할 | lazy+Suspense, 프리렌더 시 본문 포함 불확실 | 개념별 route 모듈 = 자동 청크 | 동일 |
| 개념 추가 비용 | 폴더 추가 | 폴더 추가(얇은 `route.tsx` 포함) | 폴더 + routes.ts |
| 프리렌더 | slug 나열 필요 | 모두 정적 경로 | 동일 |

**C. 메타데이터 검증**
| | **C1. TS `satisfies ConceptMeta` + Vitest 무결성 테스트 (권장)** | C2. Zod | C3. MDX frontmatter |
|---|---|---|---|
| 의존성 | 없음 | zod | 플러그인 2개 |
| 타입 안정성 | 컴파일 타임 | 런타임+타입 | 약함 |

### 4.6 콘텐츠 및 디렉터리 구조
```
.
├─ AGENTS.md                      # 프로젝트 규칙 (1단계 최소판 → 9단계 완성). CLAUDE.md는 `@AGENTS.md`
├─ README.md
├─ docs/content-guide.md          # 새 개념 추가 절차·작성 규칙·검토 체크리스트
├─ app/
│  ├─ root.tsx                    # html shell(lang="ko"), 공통 레이아웃, ErrorBoundary
│  ├─ routes.ts                   # 정적 라우트 + app/concepts/* 자동 등록 + `*`
│  ├─ app.css                     # Tailwind, 테마 토큰
│  ├─ routes/{home,about,not-found}.tsx
│  ├─ components/
│  │  ├─ site/                    # SiteHeader, SiteFooter, SkipLink
│  │  └─ concept/                 # ConceptLayout, PrerequisiteList, RelatedConcepts, References,
│  │                              # SimplificationNote, ReviewBadge, Callout, PredictQuiz, mdx-components.tsx
│  ├─ simulator/                  # types.ts, useStepper.ts, StepControls.tsx, CodeView.tsx (+ 테스트)
│  ├─ lib/
│  │  ├─ concepts.ts              # ConceptMeta 타입, import.meta.glob 레지스트리, getConcept/listConcepts, filterConcepts
│  │  ├─ seo.ts                   # buildMeta()
│  │  ├─ site.ts                  # SITE_NAME, SITE_URL (= import.meta.env.VITE_SITE_URL ?? 기본값)
│  │  └─ useHydrated.ts
│  └─ concepts/
│     └─ primitives-and-objects/  # 개념 1개 = 폴더 1개 (slug = 폴더명)
│        ├─ meta.ts               # 메타데이터 — 순수 데이터, type import 외 import 금지
│        ├─ content.mdx           # 설명 본문
│        ├─ route.tsx             # 얇은 라우트 모듈: meta export + <ConceptLayout><Content components=…/></ConceptLayout>
│        ├─ examples/*.js         # 예제 (실제 실행 검증 대상, Prettier/ESLint 제외)
│        ├─ scenarios.ts          # 시뮬레이션 단계
│        ├─ MemoryView.tsx        # 시각화
│        ├─ Simulator.tsx         # 셸·시나리오 선택·배치 (첫 개념 전용)
│        └─ concept.test.ts       # 개념별 검증
├─ tests/
│  ├─ helpers/{run-example.ts,scenario-invariants.ts}
│  ├─ content-integrity.test.ts
│  ├─ examples.test.ts
│  ├─ build/build-output.test.ts  # `npm run test:build` 전용 (npm test 제외)
│  └─ e2e/*.spec.ts               # Playwright (Vitest 제외)
├─ scripts/postbuild.mjs          # 404.html 복사, __spa-fallback.html 삭제, sitemap.xml·robots.txt 생성
├─ public/{favicon.svg,og-default.png}
├─ react-router.config.ts vite.config.ts vitest.config.ts playwright.config.ts serve.json
├─ tsconfig.json eslint.config.js .prettierrc .prettierignore vercel.json .gitignore .nvmrc
```

`ConceptMeta` (`app/lib/concepts.ts`):
```ts
export type ConceptCategory = 'fundamentals' | 'execution' | 'objects' | 'async' | 'memory'
export type ConceptMeta = {
  slug: string                                   // 폴더명과 동일 (테스트)
  title: string
  summary: string                                // 카드·meta description, ≤160자 (테스트)
  category: ConceptCategory
  tags: string[]
  goals: string[]                                // ≥1
  prerequisites: { label: string; slug?: string }[]  // slug 있으면 존재 검사, 자기 자신 금지
  related: string[]                              // 존재하는 slug만
  examples: {
    id: string
    file: string                                 // examples/ 하위 파일명
    runtime: 'ecmascript'                        // MVP: Node vm, sloppy script 기준
    expectedOutput: string[]                     // console.log 줄 단위
  }[]
  simplifications: string[]                      // ≥1 (단순화가 없으면 그 사유를 1줄로)
  references: { label: string; url: string }[]   // ≥1
  reviewedAt: string | null                      // YYYY-MM-DD, null이면 "검토 중" 배지
}
```

`routes.ts`:
```ts
import { type RouteConfig, getAppDirectory, index, route } from '@react-router/dev/routes'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const conceptsDir = join(getAppDirectory(), 'concepts')
const slugs = readdirSync(conceptsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(conceptsDir, d.name, 'route.tsx')))
  .map((d) => d.name)
  .sort()
export default [
  index('routes/home.tsx'),
  route('about', 'routes/about.tsx'),
  ...slugs.map((slug) => route(`concepts/${slug}`, `concepts/${slug}/route.tsx`)),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
```
`react-router.config.ts`: `{ ssr: false, prerender: ({ getStaticPaths }) => [...getStaticPaths(), '/404'] }` → `/404`는 `*` 라우트로 프리렌더되어 서버·클라이언트 route id가 동일(하이드레이션 안전).

규칙:
- 라우트에 loader를 두지 않는다(콘텐츠는 정적 import) → `.data` 파일·요청 없음.
- 레지스트리: `import.meta.glob('../concepts/*/meta.ts', { eager: true })`. meta.ts가 순수 데이터라 홈 청크에 본문·시뮬레이터가 끌려오지 않음.
- MDX 공통 컴포넌트는 `<Content components={mdxComponents} />`로 주입. 개념 전용 컴포넌트는 MDX에서 직접 import.
- **하이드레이션 규칙**: 프리렌더 시점에 알 수 없는 값(URL query, JS 유무, 창 크기)에 따라 첫 렌더 마크업을 바꾸지 않는다. 필요한 경우 `useHydrated()`로 마운트 후 전환.
- 예제 작성: 출력 결과를 주장하는 예제는 반드시 `examples/` + `meta.examples` 등록. `console.log`는 원시 값/불리언/`JSON.stringify` 결과만. sloppy/strict에 따라 결과가 달라지는 예제는 MVP에서 쓰지 않음. 도서 문장·예제 복제 금지, 도서는 참고 자료로만 언급.
- 새 개념 폴더 추가 후 dev 서버 재시작 필요(routes.ts 재평가) — content-guide에 명시.

### 4.7 테스트와 정확성 검증 전략
| 계층 | 무엇을 | 어떻게 |
|---|---|---|
| L1 예제 실행 | "실행 결과" 주장이 사실인가 | `examples.test.ts`: 모든 `meta.examples`를 예제마다 새 `node:vm` 컨텍스트에서 sloppy script로 실행, `console.log`를 `util.format`으로 수집, 2초 timeout, `expectedOutput`과 정확히 일치 |
| L2 시나리오 불변식 | 시뮬레이션이 예제와 어긋나지 않는가 | `scenario-invariants.ts` + 개념별 테스트: ① `scenario.code` = 예제 파일 원문 ② 마지막 단계 `output` = `expectedOutput` ③ 단계별 `output`은 이전 단계의 확장(prefix) ④ `line`이 코드 줄 범위 안이고 강조 줄이 공백/주석만이 아님 ⑤ 단계 ≥2 ⑥(개념별) 모든 `object` 값의 id가 `objects`에 존재 |
| L3 메타데이터·콘텐츠 무결성 | 깨진 링크·누락 | `content-integrity.test.ts`: slug=폴더명·중복 없음, prerequisites(slug 있는 것)/related 존재·자기참조 없음, example 파일 존재, simplifications·references·goals ≥1, summary ≤160자, 모든 개념 폴더에 meta.ts·content.mdx·route.tsx 존재, content.mdx에 필수 h2 3개(`동작 원리`, `예제`, `결과와 이유`) 존재 |
| L4 단위 | 공통 로직 | `useStepper`(fake timers), `filterConcepts`, `buildMeta`, `PredictQuiz`, `StepControls`/`CodeView`(role 쿼리) |
| L5 빌드 결과 | 프리렌더·SEO | `npm run test:build`(= build 후 별도 vitest config 실행): 개념 HTML에 제목·본문 문장·Shiki 코드 블록·canonical·og:title·필수 섹션, `404.html` 존재(+noindex), `__spa-fallback.html` 없음, sitemap에 모든 개념 URL·404 제외, robots.txt |
| L6 E2E | 실제 사용 흐름 | Playwright(chromium 데스크톱 + 모바일 375×812), `serve`로 `build/client` 서빙: 4.8 검증 계획 시나리오, axe critical/serious 0, `/?q=객체` 직접 진입 시 콘솔 에러 0, `/does-not-exist` 404 상태·본문·콘솔 에러 0, JS 비활성 컨텍스트에서 상세 본문·예측 정답(`<details>`) 열람 가능 |
| L7 사람 검토 | 설명의 정확성·이해도 | 개념마다 사용자 검토 게이트. 체크리스트: 8요소 충족, 명세/MDN 근거 링크, ECMAScript vs 호스트(브라우저/Node) 구분, 결과 원인을 "복사/공유"로 잘못 설명하지 않는가, 불확실한 엔진 세부를 사실처럼 쓰지 않았는가, 단순화 목록 완전성. 승인 시 `reviewedAt` 기록 |

- 정적 검사: `npm run typecheck`(= `react-router typegen && tsc --noEmit`), `npm run lint`, `npm run format:check`.
- Vitest: 별도 `vitest.config.ts`(RR 플러그인 제외, `resolve.tsconfigPaths`로 `~` alias), include `app/**/*.test.ts(x)`, `tests/*.test.ts`; exclude `tests/build/**`, `tests/e2e/**`. 테스트는 `content.mdx`·`route.tsx`를 import하지 않는다.
- 런타임 기준: L1은 Node(V8)에서 실행 → ECMAScript 범위 예제만. 브라우저 런타임 예제(타이머·DOM)는 도입 시 Playwright 실행 방식을 별도 설계.
- `node:vm`은 보안 경계가 아니며 저장소 내 신뢰된 예제만 실행(주석 명시).

### 4.8 Vercel 배포 전략
- GitHub 저장소 → Vercel Import(사용자 작업: 계정 로그인·연결). main = Production, PR = Preview.
- `vercel.json`:
  ```json
  {
    "framework": null,
    "installCommand": "npm ci",
    "buildCommand": "npm run build",
    "outputDirectory": "build/client",
    "trailingSlash": false,
    "headers": [{ "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }]
  }
  ```
  `framework: null`로 SSR 프리셋 자동 감지를 막고 정적 배포로 고정.
- `npm run build` = `react-router build && node scripts/postbuild.mjs`
  - postbuild: `build/client/404/index.html` → `build/client/404.html` 복사, `__spa-fallback.html` 삭제(모든 경로가 프리렌더되므로 불필요, 200 쓰레기 페이지 색인 방지), `build/client/**/index.html`(404 제외)로 `sitemap.xml` 생성, `robots.txt` 생성.
  - URL: 앱 코드는 `import.meta.env.VITE_SITE_URL`(클라이언트 번들에 `process` 없음), postbuild는 `process.env.VITE_SITE_URL`(`node --env-file-if-exists=.env scripts/postbuild.mjs`로 실행). 기본값은 `.env` 한 곳에만 정의(`VITE_SITE_URL=https://<project>.vercel.app`)하고, Vercel Production 환경변수로 덮어쓴다(셸/플랫폼 환경변수가 `.env`보다 우선).
  - not-found 페이지 `<meta name="robots" content="noindex">`.
- Node: `package.json` `engines.node: ">=22.22"` + `.nvmrc` 24.
- **조기 검증**: 3단계 완료 후(사용자가 저장소·Vercel을 연결했다면) 4단계에서 Preview 배포로 정적 출력 형태를 먼저 검증. 연결 전이면 4단계를 마지막으로 미루고 나머지 진행.

---

## 5. 변경 범위
- 추가: 4.6의 전체 파일, `git init`.
- 수정: 없음(빈 저장소).
- 변경하지 않음: 해당 없음.

---

## 6. 구현 계획
> 순서: 불확실한 연동(스파이크) → 품질·정확성 기반 → 공통 셸 → 배포 형태 조기 검증 → 템플릿 → 시뮬레이터 공통 → 첫 개념 → E2E → 문서. 각 단계는 독립 검증 가능. 사용자 개입 지점: 4단계(저장소·Vercel 연결), 5단계(레이아웃 스크린샷 피드백, 선택), 7단계(콘텐츠 검토, 필수).

### 1. 프로젝트 골격 + 프리렌더/MDX 파이프라인 스파이크
- 대상: `package.json`, `react-router.config.ts`, `vite.config.ts`, `tsconfig.json`, `app/{root.tsx,routes.ts,app.css}`, `app/routes/{home,about,not-found}.tsx`(임시), `app/concepts/primitives-and-objects/{meta.ts,content.mdx,route.tsx,examples/scenario-1.js}`(임시), `.gitignore`, `.nvmrc`, `AGENTS.md`(최소판: 목적·정확성 원칙·금지 사항), `CLAUDE.md`
- 변경: `git init`. RR8 framework 최소 구성 수동 작성. 정확한 버전 고정: react-router·@react-router/dev 8.5.x, vite 8.x, react·react-dom 19.x, typescript 6.0.x. tsconfig: strict, `types: ["node", "vite/client"]`, `paths: { "~/*": ["./app/*"] }`, `rootDirs`(RR typegen), `*.mdx` 모듈 타입(`@types/mdx`). Tailwind 4, `@mdx-js/rollup`(`enforce:'pre'`, reactRouter 앞), remark `remark-code-import` → rehype `@shikijs/rehype`. routes.ts·config는 4.6 그대로. 임시 MDX에 코드 import 블록 1개 + 클릭 카운터 버튼 1개.
- 이유: RR8(Vite 8/Rolldown) + MDX + Shiki + 폴더 라우트 + 프리렌더 + 404 조합은 문서상 가능하나 실제 조합은 미검증. 실패 시 구조 전체가 바뀜.
- 주의사항: 실패 시 대안 순서 — (a) remark-code-import 실패/ dev 미갱신 → `?raw` import + 빌드 타임 하이라이트 컴포넌트, (b) MDX 플러그인 비호환 → `@mdx-js/rollup` 설정 조정 후에도 실패 시 사용자 보고, (c) 프리렌더에 본문 누락 → 사용자 보고 후 프레임워크 재결정. 결과는 이 문서 `구현 진행`에 기록.
- 완료 조건:
  - `npm run build` 성공. `grep`으로 `build/client/concepts/primitives-and-objects/index.html`에 MDX 본문 문장과 `class="shiki` 코드 블록(예제 파일 내용 포함) 확인.
  - `build/client/{index.html, about/index.html, 404/index.html}` 존재.
  - `npx react-router typegen && npx tsc --noEmit` 오류 0, `npm ls` 오류 0.
  - `npx serve build/client`로 서빙 후 브라우저: 상세 페이지 카운터 클릭 시 증가(하이드레이션), 콘솔 hydration 경고 0.
  - 404 스파이크(postbuild 최소판 포함): `/does-not-exist` → HTTP 404, 404 본문 표시, 콘솔 에러 0, 404 페이지에서 홈 링크 클라이언트 내비게이션 정상.
  - 개념 route 청크가 별도 파일로 분리되고 홈 HTML의 modulepreload에 포함되지 않음.
  - `npm run dev`에서 예제 파일 수정 시 상세 페이지 코드 블록 갱신 여부 확인·기록(미갱신이면 대안 (a) 적용 여부를 판단해 기록).

### 2. 품질 도구 + 콘텐츠 모델·레지스트리 + 정확성 테스트 기반
- 대상: `eslint.config.js`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`, `app/lib/concepts.ts`, `app/simulator/types.ts`, `tests/helpers/{run-example.ts,scenario-invariants.ts}`, `tests/{content-integrity,examples}.test.ts`, `package.json` scripts(`typecheck`, `lint`, `format`, `format:check`, `test`)
- 변경: ESLint 10(typescript-eslint, react-hooks, react-refresh), Prettier(+tailwind 플러그인), `app/concepts/*/examples/**`를 ESLint ignores·`.prettierignore`에 추가. `ConceptMeta`·레지스트리·`getConcept`·`listConcepts`·`filterConcepts`. L1·L2 헬퍼·L3 테스트.
- 이유: 콘텐츠 작성 전에 정확성 안전망을 둔다.
- 주의사항: L3 필수 h2 검사는 임시 content.mdx에도 적용되므로 임시 본문에 h2 3개를 넣는다.
- 완료 조건: `npm run lint`, `npm run format:check`, `npm run typecheck` 오류 0, `npm test` 통과. 음성 확인: `expectedOutput` 변조 / 없는 prerequisite slug / 필수 h2 삭제 / 예제 파일에 빈 줄 강조 각각에서 해당 테스트가 실패함을 확인 후 원복.

### 3. 공통 레이아웃·홈·소개·404·SEO
- 대상: `app/root.tsx`, `app/components/site/*`, `app/routes/{home,about,not-found}.tsx`, `app/lib/{seo,site,useHydrated}.ts`, `scripts/postbuild.mjs`, `public/*`, `.env`, `tests/build/build-output.test.ts`, `package.json`(`test:build`)
- 변경: `<html lang="ko">`, skip link, 헤더/푸터, 시스템 다크모드 토큰, 홈 목록(카테고리 그룹, 빈 카테고리 숨김) + 4.2 하이드레이션 안전 검색, 소개 페이지(4.1 정책 내용), not-found(noindex), `buildMeta`(title·description·canonical·og:*·twitter:card), postbuild 완성(4.8).
- 이유: 모든 개념 페이지가 의존하는 공통 셸과 SEO.
- 완료 조건: `npm test`(filterConcepts·buildMeta 단위 포함) 통과, `npm run test:build` 통과. 브라우저: `/?q=객체` 직접 진입 → 첫 개념만 표시·입력값 "객체"·콘솔 에러 0, `/?q=zzz` → 결과 없음 문구, 375px 폭 가로 스크롤 없음.

### 4. Vercel Preview 조기 검증 (사용자 선행 작업 필요)
- 대상: `vercel.json`, `package.json` engines
- 변경: 4.8 설정. 사용자에게 GitHub 원격 저장소 생성·Vercel Import 안내 → push 후 Preview 확인. 사용자 준비 전이면 이 단계를 9단계 뒤로 미룸.
- 이유: 정적 출력·404·trailing slash 동작이 가장 불확실한 배포 연동.
- 완료 조건: Preview URL에 `curl -sI`: `/`, `/about`, `/concepts/primitives-and-objects` 200, `/does-not-exist` 404 + 커스텀 404 본문, `/sitemap.xml` 200, `/__spa-fallback.html` 404, `/assets/*`에 `immutable`. Preview 응답의 `X-Robots-Tag` 확인·기록.

### 5. 개념 상세 템플릿 + MDX 공통 컴포넌트
- 대상: `app/components/concept/*`, `app/concepts/primitives-and-objects/route.tsx`
- 변경: `ConceptLayout`(4.3 섹션 순서, 메타데이터 렌더, `ReviewBadge`), `PrerequisiteList`(링크/텍스트 칩), `Callout`, `SimplificationNote`, `References`, `RelatedConcepts`, `mdx-components.tsx`(h2/h3 앵커, 코드 블록 스타일), `PredictQuiz`.
- `PredictQuiz` 설계: 첫 렌더(프리렌더 = 하이드레이션 전)는 질문 + 선택지 목록 + `<details><summary>정답 보기</summary>정답·이유</details>`. 하이드레이션 후 네이티브 라디오 그룹 + "정답 확인" 버튼(선택 전 disabled) → 정답·이유 공개, 선택지별 정오 표시(텍스트 포함), "다시 풀기".
- 이유: 새 개념은 meta + mdx만으로 페이지가 완성되어야 한다(요구사항 7).
- 완료 조건: `npm run test:build`에 섹션 제목(학습 목표·이 시각화에서 단순화한 부분·참고 자료) 검사 추가 후 통과. `PredictQuiz` 단위 테스트(선택 전 확인 불가, 공개 후 정답 표시, 다시 풀기 초기화) 통과. 상세 페이지 직접 진입 시 콘솔 hydration 에러 0. 데스크톱(1280px)/모바일(375px) 스크린샷을 사용자에게 공유(레이아웃 피드백, 선택).

### 6. 시뮬레이터 공통 최소 단위
- 대상: `app/simulator/{useStepper.ts,StepControls.tsx,CodeView.tsx}` + 테스트
- 변경: 4.4.3 명세.
- 이유: 요구사항 3.3 기능 자체로, 두 번째 개념에서도 확실히 반복됨. 셸·배치·탭은 공통화하지 않음.
- 완료 조건: `useStepper` 테스트(첫 단계 prev 무시, 마지막 next 무시, 자동 재생이 마지막에서 정지, speed 2 → 750ms 간격, 수동 이동 시 재생 정지, reset → 0·정지, 언마운트 후 대기 타이머 0) 통과. `StepControls`(경계 disabled, `autoplay={false}`면 재생·속도 없음)·`CodeView`(`aria-current` 줄이 `line`과 일치) 테스트 통과.

### 7. 첫 개념: 원시 값과 객체 — 재할당과 변경 (사용자 검토 게이트)
- 대상: `app/concepts/primitives-and-objects/*` 전체
- 변경: 4.4.4 그대로 — 예제 3개, `meta.ts`(목표·텍스트 선행 개념 "변수", "데이터 타입"·단순화 5항목·참고자료: ECMAScript 명세 해당 절, MDN), `scenarios.ts`, `MemoryView.tsx`, `Simulator.tsx`(시나리오 선택은 네이티브 라디오/버튼 그룹, 4.3 배치, 4.4.3 키보드·live 규칙), `content.mdx`(동작 원리 → 예제·예측·시뮬레이터 → 결과와 이유 → 오해 포인트 "객체도 재할당하면 원본에 영향 없음" → Deep Dive 모델 대응 문단), `concept.test.ts`(L2 전체 + ⑥).
- 이유: MVP의 첫 시각화이자 콘텐츠 구조 검증.
- 주의사항: 단계 설명에서 결과 원인을 "복사했기 때문"으로 쓰지 않는다(재할당/변경으로 설명). 참고 링크는 실제로 열어 존재 확인. 10절 D1·D2 결정에 따름. `reviewedAt: null`로 시작.
- 완료 조건: `npm test` 통과(3개 예제 실제 출력 = expectedOutput, 시나리오 불변식). 브라우저: 각 시나리오 처음→끝 진행 시 강조 줄·상태·출력이 단계 설명과 일치, 시나리오 1에서 `q = { n: 2 }` 단계 후 `p`는 `객체 A`, `q`는 `객체 B`를 가리킴, 시나리오 2에서 `q.n = 2` 단계에 `객체 A`의 `n`이 "변경됨"과 함께 2, 375px에서 MemoryView 가로 넘침 없음(화살표 없이도 칩으로 참조 파악). **사용자에게 설명·시각 표현 검토 요청 → 승인 시 `reviewedAt` 기록.** 피드백 반영은 이 단계 안에서 반복.

### 8. E2E·접근성
- 대상: `playwright.config.ts`, `serve.json`(`trailingSlash: false`), `tests/e2e/*.spec.ts`, scripts(`e2e`)
- 변경: `webServer`로 `serve build/client`, 4.7 L6 및 9절 브라우저 시나리오 자동화, axe 검사.
- 완료 조건: `npm run build && npm run e2e` 통과(데스크톱·모바일 프로젝트), axe critical/serious 0.

### 9. 문서
- 대상: `AGENTS.md`(완성), `README.md`, `docs/content-guide.md`
- 변경: AGENTS.md = 목적, 정확성 원칙(요구사항 5), 학습 범위 밖 개념 작성 금지, 명령어, 디렉터리·하이드레이션·예제 규칙, 의존성 추가 원칙(근거 제시·사용자 승인). content-guide = 새 개념 추가 절차(폴더 생성 → meta → examples → mdx(필수 h2) → (선택) 시뮬레이터 → 테스트 → dev 재시작 → 사용자 검토 → reviewedAt), 예제·저작권 규칙, L7 체크리스트.
- 완료 조건: content-guide 절차만 따라 더미 개념을 추가했을 때 공통 코드 수정 없이 `npm test`·`npm run test:build` 통과, 홈 목록·sitemap에 등장(확인 후 더미 삭제).

---

## 7. 엣지 케이스
- 개념 1개일 때 홈: 카테고리 1개만 표시, 검색 동작.
- `/concepts/foo` 등 미지 경로: 정적 404(HTTP 404).
- `/404` 직접 접근: 200으로 응답될 수 있음 → noindex로 색인 방지.
- 선행 개념 페이지가 아직 없음: `{ label }`만으로 텍스트 칩.
- 개념 폴더에 `route.tsx` 누락: routes.ts에선 무시되지만 L3 테스트가 실패시킴.
- `?q=` 직접 진입·JS 비활성: 전체 목록(하이드레이션 전) 표시.
- 시나리오 단계 1개 이하·빈 줄 강조: L2 실패.
- 자동 재생 중 수동 이동/시나리오 전환: 재생 정지 후 이동, 시나리오 전환 시 단계 0.
- ←/→ 키와 페이지 스크롤 충돌: 시뮬레이터 영역 포커스 시에만 처리.
- 좁은 폭/ResizeObserver 미지원: 화살표 생략, 칩으로 의미 전달.
- `prefers-reduced-motion`, 시스템 다크모드에서 Shiki 듀얼 테마·강조 색 대비.
- `reviewedAt: null` 상태로 배포: "검토 중" 배지 노출.

## 8. 위험 요소와 대응
| 위험 | 영향 | 대응 |
|---|---|---|
| RR8(Vite 8) + MDX + Shiki + remark-code-import + 폴더 라우트 + 프리렌더 조합 미검증 | 구조 전체 | 1단계 스파이크 선검증, 대안 순서 명시, 실패 시 사용자 재결정 |
| 하이드레이션 불일치(404·검색·퀴즈) | 깜빡임·에러 | 단일 `*` + `/404` 프리렌더, `useHydrated` 규칙, E2E 콘솔 에러 0 검사 |
| 교육 내용 부정확 (특히 "복사" 서술, 엔진 세부를 사실처럼 서술) | 신뢰도 | L1~L3 자동 검증, `simplifications` 필수, 명세/MDN 근거, L7 체크리스트, 사용자 검토 게이트 |
| 손으로 쓴 스냅샷의 중간 상태 오류 | 잘못된 시각화 | L2 불변식(원문 동일·최종 출력·참조 무결성·강조 줄 유효). 중간 값은 사람 검토 의존 → 한계로 문서화, 추가 개선 후보(계측 검증) |
| 예제 파일이 포맷터로 변경되어 줄 번호 어긋남 | 잘못된 강조 | examples를 Prettier·ESLint에서 제외, L2 ④ |
| 도서 모델(주소·스택/힙)과 사이트 모델 차이 | 학습 혼란 | 대응 문단 + D2 사용자 결정 |
| 과한 공통화 | 개념마다 안 맞는 틀 | 공통은 stepper·controls·codeview만, 셸은 두 번째 개념 때 추출 판단 |
| 페이지 전체 하이드레이션으로 JS 증가 | 성능 | 라우트별 청크, 빌드 타임 하이라이트, 무거운 라이브러리·shadcn 미도입 |
| 신규 메이저 의존성 호환 | 설치·빌드 실패 | 정확한 버전 고정·lockfile, TS 6.0.x, jsx-a11y 제외, `npm ls` |
| remark-code-import 유지보수 중단(2023-06) | 향후 깨짐 | 스파이크 검증, `?raw` 대안 준비 |
| Vercel이 SSR 프리셋으로 감지/404·slash 동작 차이 | 배포 오류 | `framework: null`, 4단계 조기 검증 |
| 도서 저작권 | 공개 사이트 법적 위험 | 독자 예제·문장, 도서는 참고로만 |
| 학습보다 개발이 앞섬 | 운영 원칙 위반 | 학습한 범위 개념만 작성(AGENTS.md 규칙) |

## 9. 검증 계획
- 정적: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run test:build`, `npm run e2e`.
- 브라우저 시나리오 (8단계에서 자동화, 7단계에서 수동 확인):
  1. `/` → 카드 표시 → 검색 "객체" 입력 → URL `?q=객체`, 해당 카드만 → 카드 클릭 → `/concepts/primitives-and-objects`.
  2. 상세: 헤더·"검토 중" 또는 검토일·학습 목표·선행 개념 텍스트 칩 → 예측 퀴즈: 선택 전 "정답 확인" disabled → 선택 후 정답·이유 표시 → 다시 풀기.
  3. 시뮬레이터 시나리오 2: 다음 클릭마다 강조 줄 이동, `q.n = 2` 단계에서 `객체 A`의 `n`이 2 + "변경됨", 마지막 단계 출력 `2 true`, 처음으로 → 단계 1.
  4. 시나리오 1: `q = { n: 2 }` 단계 후 `p → 객체 A`, `q → 객체 B`, 출력 `10 20 1 2`.
  5. 키보드만: Tab으로 시뮬레이터 영역 → → 키로 이동, live region 문구 갱신, 자동 재생 중엔 갱신 안내 없음.
  6. 375×812: 가로 스크롤 없음, 컨트롤 조작 가능.
  7. 시스템 다크모드: 코드 블록·강조 색 대비(axe color-contrast 통과).
  8. `/does-not-exist` → 404 상태·404 페이지·홈 링크 동작.
  9. JS 비활성: 상세 본문·코드·퀴즈 정답(`<details>`) 열람 가능.

## 10. 확인 필요 사항 (사용자 결정)
- **D1** [확인 필요] 첫 개념: 권장 "원시 값과 객체: 재할당과 변경" 승인 여부 (대안: 변수 선언과 호이스팅 — 이후 학습 후 권장).
- **D2** [확인 필요] 시각화 모델: 권장 **명세 기반(변수·객체 동일성, 주소/스택/힙 없음) + 도서 그림과의 대응 문단** vs 도서와 같은 메모리 주소 모델. 7단계 전에 필요.
- **D3** [확인 필요] GitHub 원격 저장소(이름·공개 여부)와 Vercel 연결 — 4단계 전에 필요(준비 전이면 배포 검증을 마지막으로). 사이트 이름 "JS Under the Hood" 확정 여부, 초기 도메인 `*.vercel.app` 사용 여부.
- **D4** [확인 필요] 커밋 방식: 기본 제안 = 단계별 로컬 커밋(롤백 단위 확보), 대안 = 최종 승인 후 일괄 커밋.
- **결정 (2026-10-20, 사용자)**: D1 권장안(원시 값과 객체: 재할당과 변경), D2 권장안(명세 기반 모델 + 도서 대응 문단), D3 나중에(→ 4단계 Vercel 조기 검증은 9단계 이후로 미룸, `vercel.json`은 4단계 시점에 작성만), D4 단계별 로컬 커밋.
- [추정, 승인 시 확정] 카테고리 5종, 홈이 목록 겸함, 다크모드 시스템 설정만, shadcn/ui·jsx-a11y MVP 미도입, TS 6.0.x.

## 11. 추가 개선 후보
- 시뮬레이터 셸 공통화(두 번째 시뮬레이터 개념 추가 시 판단).
- 시뮬레이터 코드 구문 색상, 시나리오 딥링크(`?scenario=&step=`), 코드 변경 A/B 비교.
- 계측 기반 중간 상태 검증(예제 체크포인트 값과 스냅샷 대조).
- 예제 실행 모드(strict/module) 지원, 브라우저 런타임 예제(Playwright 실행) — Event Loop 등 도입 시.
- 개념 관계 그래프, `/concepts` 목록·태그 필터, Pagefind 전문 검색.
- 다크모드 토글, 웹폰트(Pretendard), 개념별 OG 이미지.
- GitHub Actions CI(lint·test·build·e2e), Lighthouse CI·번들 예산.
- 사용자 코드 입력 실행(보안·격리·지원 문법 별도 설계).

## 변경 이력
- 2026-10-20 (사용자 요청): D1·D2 권장안 확정, D3 보류로 4단계(Preview 배포 검증)를 9단계 이후로 이동(`vercel.json` 작성은 유지), D4 단계별 로컬 커밋 — 영향 단계 4, 전체(커밋)

## 구현 진행

- baseline (2026-10-20, git 없음): 빈 디렉터리 — 검증 명령 없음, 기존 실패 없음
- 진행 순서 (D3 반영): 1 → 2 → 3 → 5 → 6 → 7 → 8 → 9 → (4: 사용자 저장소·Vercel 연결 후). `vercel.json`·engines 작성은 9단계에서 함께 수행
- [x] 1. 골격 + 프리렌더/MDX 스파이크 (`6ff9823`) — build 성공, 개념 HTML에 본문·`class="shiki` 블록 존재, `index/about/404.html` 존재·`__spa-fallback.html` 제거, typecheck·`npm ls` 0, 홈 HTML에 개념 청크 미포함, serve: `/`·`/about`·개념 200 / `/does-not-exist` 404, 카운터 하이드레이션 확인
  - 발견: `react-router build`가 기본 entry.server용 `isbot` 의존성을 요구(추가됨). `tsconfig types`에 `mdx` 필요. dev에서 예제 파일 수정이 MDX에 반영되지 않음(remark-code-import가 watch 의존성 미등록 → dev hydration 오류) → 2단계에서 예제 변경 시 같은 폴더 `content.mdx` 모듈을 무효화하는 소형 Vite 플러그인으로 해결. `serve@14.2.6`의 `compression` 취약점 경고(dev 전용, 보고)
- [x] 2. 품질 도구 + 콘텐츠 모델·정확성 테스트 기반 — lint·format:check·typecheck 0, `npm test` 22 통과, build 성공. 음성 확인(expectedOutput 변조·없는 선행 slug·필수 h2 삭제) 각 테스트 실패 확인. dev 예제 HMR 플러그인(`vite.config.ts` `concept-example-hmr`)으로 예제 수정 즉시 반영 확인
  - 참고: Prettier가 MDX 코드 import 블록 안에 빈 줄을 넣음(동작 영향 없음 → content-guide에 명시)
- [x] 3. 공통 레이아웃·홈·소개·404·SEO — lint·format·typecheck 0, `npm test` 31 통과, `npm run test:build` 8 통과(canonical·og·sitemap·robots·404 noindex·fallback 없음). 브라우저(메인 확인): `/?q=객체` 하이드레이션 후 입력값·결과 1개, 375px·다크모드에서 `/`·`/about`·개념 페이지 가로 스크롤 없음, Shiki 다크 배경 적용, 콘솔 에러 0. 한국어 어절 줄바꿈(`word-break: keep-all`) 메인이 추가
  - 변경: Shiki는 라이트 색을 인라인으로 내보내므로 다크 미디어쿼리에서만 `--shiki-dark` 변수로 덮어씀. `.gitignore`/`.prettierignore`의 `build` → `/build`(tests/build 보호). 홈 그룹핑 헬퍼 `app/lib/concept-groups.ts` 추가. og:image는 8단계에서 추가
- [x] 5. 개념 상세 템플릿 + MDX 공통 컴포넌트 — lint·format·typecheck 0, `npm test` 통과(PredictQuiz·ReviewBadge·PrerequisiteList·slugify 단위), `npm run test:build` 8 통과(학습 목표·단순화·참고 자료·선행 개념 섹션, `<details`). 브라우저: 퀴즈 하이드레이션·정답/오답·다시 풀기 동작, 375px 가로 스크롤 없음. 메인 수정: `data-wide` 블록이 본문 열 기준으로 비대칭 정렬되던 문제 → `.concept-body`를 70ch 제한에서 제외해 화면 가운데 정렬(1150px에서 좌우 25/25px, 375px에서 16/16px)
  - 구현 메모: inline code 스타일은 MDX 컴포넌트 대신 CSS(`.concept-article :not(pre) > code`), 제목 앵커 `#` 상시 표시(axe 대비), `<Wide>` MDX 컴포넌트 제공
- [x] 6. 시뮬레이터 공통 최소 단위 — `useStepper`·`StepControls`·`CodeView` + 테스트 29개 통과(경계·자동재생 정지·속도·수동 이동 정지·reset·goTo·끝에서 재생 시 처음부터·언마운트 타이머 0·total 변경 리셋). CodeView는 페이지 스크롤 방지를 위해 `scrollIntoView` 대신 블록 내부 `scrollTop` 사용
- [~] 7. 첫 개념: 원시 값과 객체 — 구현·자동 검증 완료, **사용자 콘텐츠 검토 대기**(`reviewedAt: null`). lint·format·typecheck 0, `npm test` 124 통과(예제 실제 출력 `10 20 1 2`·`2 true`·`99 1`, 시나리오 불변식 ①~⑥), `npm run test:build` 11 통과(시뮬레이터 단계 0 프리렌더, `data-wide`가 `.concept-body` 직계). 메인이 `scenarios.ts` 22단계를 콘텐츠 명세와 대조(문장·line·상태·출력 일치), 1280px에서 함수 시나리오 7단계 화면 확인
  - 변경: 결과 표는 GFM 미도입(`remark-gfm` 의존성 미추가)으로 JSX `<table>`로 작성(문구 동일)
- [x] 8. E2E·접근성 — 메인 재실행: `npx playwright test` 55 통과·3 건너뜀(no-JS 2·모바일 전용 1, 의도), axe(wcag2a/aa/21a/21aa) critical/serious 0(라이트·다크, 시뮬레이터 전 단계 진행 후 포함), `npm test` 125·`test:build` 16 통과, lint·format·typecheck 0
  - 제품 수정: Shiki 테마 `github-light`/`github-dark` → `-default` 변형(라이트 `#e36209` 대비 3.48:1 axe 위반, 다크 주석색 3.05:1). og:image(1200×630, `scripts/generate-og.mjs`로 생성) + `twitter:card: summary_large_image` 추가
- [x] 9. 문서 + `vercel.json`(4단계 설정 파일만) — AGENTS.md 완성, `docs/content-guide.md`·`README.md` 추가. 더미 개념(`zz-dummy`)을 가이드만으로 추가 → 공통 코드 수정 없이 `npm test`·`test:build` 통과, 홈·sitemap 반영 확인 후 삭제
  - 발견·수정: Vitest 5 `fsModuleCache`가 `import.meta.glob` 레지스트리를 캐시해 새 개념 폴더를 놓침 → `vitest.config.ts`에 `fsModuleCache: false`. 빌드 테스트의 `<details` 검사가 모든 개념에 퀴즈를 강제하던 것을 메인이 `<PredictQuiz` 사용 개념에만 적용하도록 수정(계획에 없던 제약 제거), 가이드 문구를 "권장"으로 조정
- [ ] 4. Vercel Preview 검증 — 보류(D3: 사용자 GitHub·Vercel 연결 후 진행)
