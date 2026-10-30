# 학습 순서 표시 구현 계획

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `d0684b1`

## 0. 요약

- 목적: 개념이 21개로 늘어 홈(분류 안 제목 가나다순)만으로는 읽는 순서를 알 수 없다. 각 `meta.ts`에 학습 순서 번호(`order`)를 두고, 개념 페이지 아래에 이전/다음 개념 링크를, 홈에 "분류별 / 학습 순서" 보기 전환을 넣는다.
- 범위: `ConceptMeta` 타입과 개념 21개 `meta.ts`(필드 1줄씩), `app/lib/concepts.ts`, 새 `ConceptPager`, `ConceptLayout`, 홈, 테스트(무결성·단위·빌드·e2e), content-guide. 소개 페이지·본문(`content.mdx`)·`reviewedAt`은 바꾸지 않는다.
- 위험: 홈 보기 전환이 프리렌더 HTML과 첫 클라이언트 렌더를 다르게 만드는 것(하이드레이션 불일치) → 기존 `?q=` 처리와 같이 하이드레이션 뒤에만 `?view=order`를 읽고, 전환 버튼도 하이드레이션 뒤에 그린다.
- 복잡도: 중간 · Consensus: 생략(홈은 기존 `?q=` 패턴을, 이전/다음은 `RelatedConcepts`의 링크 패턴을 그대로 쓰고, 공통 레이아웃 변경은 개념 21개 전체 e2e·axe가 덮는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-10-30)

- 순서 기준: 작성 순서(원시 값과 객체 → … → 클로저). 21개 모두 선수 개념 뒤에 온다.
- 보여 줄 곳: 개념 페이지의 이전/다음 링크, 홈의 학습 순서 목록. 소개 페이지는 바꾸지 않는다.
- 홈 형태: 보기 전환. 처음은 지금의 분류별 보기이고, "학습 순서"를 고르면 번호가 붙은 카드 목록으로 바뀐다. 검색과 함께 동작한다.
- 순서 저장: 각 `meta.ts`에 번호. 10, 20, 30…처럼 간격을 두어 나중에 추가 게시글(예: "전역 객체")을 사이에 끼울 수 있게 한다. 번호 중복과 "선수 개념은 앞 번호"를 테스트로 검사한다.

### 유지해야 하는 기존 동작

- 홈 첫 화면(프리렌더 포함)은 지금과 같은 분류별 보기, 같은 카드 수와 순서(분류 안 제목 가나다순).
- 검색 `?q=`의 동작과 `navigation.spec.ts`의 기대값(`객체` 6건, 첫 카드 '원시 값과 객체').
- JS 없이도 홈의 모든 개념 링크와 개념 페이지 본문을 읽을 수 있다(하이드레이션 규칙).
- 새 개념은 폴더만 추가한다(AGENTS 원칙). `order`는 그 폴더의 `meta.ts`에 쓴다.

### 제외 범위

- 소개 페이지 안내(사용자가 고르지 않음).
- 기존 개념 역방향 연결("이 개념을 전제로 하는 개념")은 사용자 결정으로 나중에 따로.
- 장 번호 표시(도서는 참고로만 언급).
- `rel="prev/next"` 같은 SEO 메타.

## 2. 사실과 추정

### 사실 (코드에서 확인)

- `ConceptMeta`에는 순서 필드가 없다 — `app/lib/concepts.ts:3-21`. `listConcepts()`는 제목 `localeCompare(…, 'ko')`로 정렬한다 — `app/lib/concepts.ts:38-40`.
- 홈은 `listConcepts()` → `filterConcepts` → `groupByCategory`로 분류별 `<section>`(h3) 안에 `ConceptCard`(h4)를 그린다 — `app/routes/home.tsx:17,47-48,92-107`. 그룹 안 순서는 입력 순서 그대로다 — `app/lib/concept-groups.ts:9`.
- 홈의 `?q=`는 하이드레이션 뒤에만 읽고(`hydrated && seenParam !== paramQuery`), 입력은 `setParams(…, { replace: true, preventScrollReset: true })`로 URL에 쓴다 — `app/routes/home.tsx:20-45`.
- 개념 페이지 템플릿은 `ConceptLayout`이고 끝이 `SimplificationNote` → `RelatedConcepts` → `References`다 — `app/components/concept/ConceptLayout.tsx:52-58`. 링크 스타일은 `RelatedConcepts`의 `text-accent underline underline-offset-4` — `app/components/concept/RelatedConcepts.tsx:14`.
- `ConceptCard`는 `<article>`이고 h4 제목 옆에 "검토 중" 배지를 둔다 — `app/components/site/ConceptCard.tsx:6-15`. e2e는 홈 카드를 `getByRole('article')`로 센다 — `tests/e2e/navigation.spec.ts:10,18,33`.
- 작성 순서(각 `meta.ts`를 추가한 커밋 순): primitives-and-objects(`6ff9823`) → short-circuit-evaluation → type-coercion → equality-operators → number-type → typeof-operator → increment-decrement → switch-break-continue → property-keys → function-calls → hoisting → scope-chain → block-scope → tdz → property-attributes → new-operator → prototype-chain → primitive-methods → this-binding → execution-context → closure(`253fc15`) — `git log --diff-filter=A -- 'app/concepts/*/meta.ts'`.
- 이 순서에서 21개 모두의 `prerequisites[].slug`가 자기보다 앞에 있다(메인이 각 `meta.ts`의 prerequisites를 뽑아 대조). 책 장 순서로는 number-type(6장)이 선수 개념 equality-operators(7·9장)보다 앞에 와서 어긋난다.
- 무결성 테스트는 개념마다 `describe.each(entries)`로 slug·선수 개념 등을 검사한다 — `tests/content-integrity.test.ts:52-80`.
- `ConceptMeta` 객체를 직접 만드는 테스트 픽스처: `app/lib/concepts.test.ts:4-19`(`stub`), `app/lib/concept-groups.test.ts`, `app/lib/seo.test.ts:79` — 새 필수 필드를 넣으면 타입 오류가 난다.
- axe 태그는 `wcag2a, wcag2aa, wcag21a, wcag21aa`이고 critical·serious만 실패로 본다 — `tests/e2e/a11y.spec.ts:46-50`. 홈 axe 검사는 `tests/e2e/a11y.spec.ts:69` 부근, 375px 가로 넘침 검사는 `tests/e2e/responsive.spec.ts:45`(`/` 포함).
- e2e의 개념 페이지 `'다음'` 버튼 선택자는 모두 시뮬레이터 `region` 안으로 범위를 좁히고 role이 `button`이다 — `tests/e2e/concept.spec.ts:81,113`, `tests/e2e/a11y.spec.ts:96`. 페이지 하단의 이전/다음은 `link`라 겹치지 않는다.
- 빌드 테스트는 홈 HTML에 모든 개념 제목과 `href`가 있는지 검사한다 — `tests/build/build-output.test.ts:245-252`.
- content-guide의 `meta.ts` 필드 표 — `docs/content-guide.md:24-37`. `reviewedAt`은 "본문을 고치면" 갱신한다 — `docs/content-guide.md:168`.

### 추정

- `<ol>` 안 `<li>`에 카드를 넣고 `list-none`으로 기본 번호를 숨긴 뒤 카드에 "n번째" 텍스트를 보여 주는 방식이, CSS 목록 번호(`list-decimal` + 그리드)보다 375px에서 안정적이다 — 브라우저에서 확인(작업 순서 4).

## 3. 구현 전략

- **순서 데이터:** `ConceptMeta`에 필수 필드 `order: number`(양의 정수)를 추가하고, 21개 `meta.ts`에 작성 순서대로 10, 20, …, 210을 넣는다. 화면에는 `order` 값이 아니라 정렬 뒤의 **순위(1~21)**를 보여 준다. 그래야 사이에 끼운 번호(예: 205)가 화면에 드러나지 않는다.
- **조회 함수:** `app/lib/concepts.ts`에 순수 함수 `sortByOrder(concepts)`와 `getAdjacentConcepts(slug)`(`{ prev, next, position, total }`)를 둔다. `listConcepts()`(제목순)는 그대로 둬서 분류별 보기와 기존 테스트를 바꾸지 않는다.
- **무결성 검사:** `order`가 양의 정수인지, 개념끼리 겹치지 않는지, 선수 개념(slug 있는 것)의 `order`가 자기보다 작은지 검사한다. 마지막 조건 덕분에 순서가 언제나 선수 개념과 맞는다.
- **이전/다음:** 새 컴포넌트 `ConceptPager`를 `ConceptLayout` 맨 끝(`References` 뒤)에 둔다. `<nav aria-label="학습 순서">` 안에 "학습 순서 n / 21"과 링크 둘("이전 개념" + 제목, "다음 개념" + 제목)을 둔다. 처음 개념에는 이전이, 마지막 개념에는 다음이 없다. 정적 데이터라 프리렌더 HTML에 그대로 들어가 JS 없이도 동작한다.
- **홈 보기 전환:** `?view=order` URL 파라미터로 상태를 둔다. [Claude 판단] 로컬 상태가 아니라 URL을 쓰는 이유: 개념 페이지에 갔다가 뒤로 오면 같은 보기가 돌아오고, 검색 `?q=`와 같은 패턴을 쓸 수 있다. 하이드레이션 규칙대로 첫 렌더는 항상 분류별 보기다. 하이드레이션 뒤에 파라미터를 읽어 바꾸고, 전환 버튼(`aria-pressed` 버튼 두 개, `role="group" aria-label="보기 방식"`)도 하이드레이션 뒤에만 그린다. JS가 없으면 버튼이 보이지 않고 분류별 보기만 남는다.
  - 학습 순서 보기: 검색 결과를 `sortByOrder`로 정렬해 `<section>`(h3 "학습 순서") 안 `<ol>`로 그린다. 카드에는 전체 순서의 순위를 "n번째"로 보여 준다. 검색으로 걸러져도 번호는 전체 순위 그대로다.
  - `ConceptCard`에 선택 prop `position?: number`를 추가하고, 있을 때만 제목 줄 앞에 "n번째" 표시를 그린다. 분류별 보기는 prop을 넘기지 않아 지금과 같다.
- 버린 대안
  - 선수 개념으로 위상 정렬해 순서를 계산: 같은 단계의 순서가 정해지지 않아 결과가 바뀔 수 있다. 사용자는 작성 순서를 골랐다.
  - 중앙 목록 파일: 사용자가 meta 번호를 골랐다(AGENTS "폴더만 추가" 원칙 유지).
  - 로컬 상태로 보기 전환: 뒤로 가기에서 보기가 풀린다.
  - CSS 목록 번호(`list-decimal`): 걸러진 목록에서는 번호가 1부터 다시 매겨져 전체 순위와 달라진다.

## 4. 변경 파일

- 수정
  - `app/lib/concepts.ts` — `order` 필드, `sortByOrder`, `getAdjacentConcepts`
  - `app/concepts/*/meta.ts` 21개 — `category` 다음 줄에 `order: <n>,` 한 줄씩(본문이 아니라 `reviewedAt`은 그대로)
  - `app/lib/concepts.test.ts`, `app/lib/concept-groups.test.ts`, `app/lib/seo.test.ts` — 픽스처에 `order`, 새 함수 단위 테스트
  - `tests/content-integrity.test.ts` — `order` 검사 3개
  - `app/components/concept/ConceptLayout.tsx` — 끝에 `<ConceptPager slug={concept.slug} />`
  - `app/components/site/ConceptCard.tsx` — 선택 prop `position`
  - `app/routes/home.tsx` — 보기 전환과 학습 순서 목록
  - `tests/build/build-output.test.ts` — 개념 페이지 HTML에 이전/다음 링크
  - `tests/e2e/navigation.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts` — 전환·이전/다음·axe·375px
  - `docs/content-guide.md` — 필드 표에 `order`, 새 개념 추가 시 번호 정하는 법
- 추가
  - `app/components/concept/ConceptPager.tsx`, `ConceptPager.test.tsx`
- 변경하지 않음
  - `app/routes/about.tsx`(사용자가 고르지 않음), 모든 `content.mdx`, `reviewedAt`, `listConcepts`·`groupByCategory`의 동작, `AGENTS.md`(규칙은 그대로이고 절차는 content-guide에 쓴다)

## 5. 위험 요소

- 하이드레이션 불일치 → 첫 렌더가 `?view=`나 `hydrated`에 따라 달라지면 경고·깜빡임 → 첫 렌더는 분류별 보기와 버튼 없음으로 고정하고 `?q=`와 같은 `hydrated` 가드를 쓴다(작업 순서 4). e2e의 콘솔 에러 0과 `/?view=order` 직접 진입으로 확인.
- `?q=`와 `?view=`가 서로 지우기 → 한쪽을 쓸 때 다른 쪽이 사라짐 → 둘 다 `new URLSearchParams(prev)`로 나머지 키를 보존(작업 순서 4). e2e: 순서 보기에서 검색해도 `view=order`가 남는지.
- 홈 e2e 기대값 회귀 → 전환 버튼이나 순서 목록이 `article` 수를 바꿈 → 버튼은 `article`이 아니고, 보기마다 카드는 결과 수만큼만 그린다. `navigation.spec.ts`의 기존 단언은 그대로 통과해야 한다.
- 제목 단계 건너뛰기 → 순서 보기에서 h3 없이 h4 카드 → h3 "학습 순서" 섹션으로 감싼다. axe 홈 검사에 순서 보기를 추가(작업 순서 5).
- 공통 레이아웃 회귀 → `ConceptPager`가 21개 페이지 모두에 들어감 → 개념 페이지 e2e·axe 전체 실행, 375px 가로 넘침 검사. 긴 제목(예: 프로퍼티 어트리뷰트, 원시 값의 메서드 호출)은 줄바꿈되게 한다.
- 새 개념이 `order`를 빠뜨리거나 잘못 줌 → 타입 오류(필수 필드)와 무결성 테스트(중복·선수 개념보다 뒤)로 막는다.
- 이전/다음 링크와 다른 링크의 접근 이름 충돌 → e2e가 링크를 이름으로 잡는 곳은 404 페이지뿐(조사함). 새 e2e는 `nav` 안으로 범위를 좁힌다.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 단위: `sortByOrder` 정렬, `getAdjacentConcepts`(처음·중간·마지막, 없는 slug는 오류), `ConceptPager`(처음은 이전 없음, 마지막은 다음 없음, href·"n / 총" 텍스트), `ConceptCard` `position` 있을 때만 "n번째"
- 무결성: `order` 양의 정수·중복 없음·선수 개념보다 큼. 음성 확인: 한 개념의 `order`를 선수 개념보다 작게 바꾸면 실패하는지 확인 후 원복
- 빌드: 개념 페이지 HTML에 `aria-label="학습 순서"`와 이전/다음 `href`(처음 개념은 다음만, 마지막은 이전만), 홈 HTML은 지금처럼 모든 제목·링크
- 브라우저(serve 4175, 데스크톱 라이트·375px 다크)
  1. `/`: 첫 화면이 분류별 보기, 하이드레이션 뒤 "분류별 / 학습 순서" 버튼이 나타나고 "분류별"이 눌린 상태
  2. "학습 순서" 클릭: URL에 `view=order`, h3 "학습 순서", 카드 21개, 첫 카드 '원시 값과 객체'에 "1번째", 마지막 카드 '클로저'에 "21번째"
  3. 순서 보기에서 `객체` 검색: 6건이 학습 순서대로, 번호는 전체 순위 그대로, URL에 `q`와 `view` 둘 다
  4. 카드 클릭 → 개념 페이지 → 뒤로: 순서 보기와 검색어가 유지
  5. `/?view=order` 직접 진입: 콘솔 에러 0, 순서 보기
  6. `/concepts/primitives-and-objects`: 하단 "학습 순서 1 / 21", 다음 개념 '단축 평가…' 링크만. `/concepts/closure`: 이전 개념 '실행 컨텍스트…'만. 중간 개념에서 다음 클릭으로 이동
  7. 375px에서 홈 두 보기와 하단 링크의 가로 넘침 0, 키보드로 전환 버튼 조작(Tab·Enter/Space)

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 순서 데이터와 무결성 검사

- 대상: `app/lib/concepts.ts`, 21개 `meta.ts`, `tests/content-integrity.test.ts`, `app/lib/*.test.ts` 픽스처, `docs/content-guide.md`
- 현재: 순서 필드 없음, 홈은 제목순
- 변경: `ConceptMeta`에 `order: number`(주석: 학습 순서, 10 간격, 선수 개념보다 커야 함), 21개 meta에 2절 작성 순서대로 10~210. 무결성 테스트 3개(양의 정수, 전체 중복 없음, slug 있는 선수 개념의 `order`보다 큼). 픽스처 `stub` 등에 `order`. content-guide 필드 표에 `order` 행과 "새 개념은 선수 개념 뒤, 끼워 넣을 때는 사이 번호" 안내
- 이유: 모든 표시 기능이 이 데이터에 기대고, 선수 개념 조건이 순서의 정당성을 지킨다
- 주의사항: meta는 `category` 다음 줄에 넣어 diff를 한 줄로 유지. `reviewedAt`은 바꾸지 않는다(본문 변경 아님). `listConcepts` 정렬은 그대로
- 완료 조건: typecheck 통과, `npm test` 통과(무결성 개념당 +3), 음성 확인 1회(closure `order`를 5로 → 선수 개념 검사 실패 → 원복), `grep -c "order:" app/concepts/*/meta.ts` 21개 모두 1

### 2. 조회 함수

- 대상: `app/lib/concepts.ts`, `app/lib/concepts.test.ts`
- 변경: `sortByOrder(concepts: ConceptMeta[]): ConceptMeta[]`(새 배열, `order` 오름차순), `getAdjacentConcepts(slug)` → `{ prev: ConceptMeta | null, next: ConceptMeta | null, position: number, total: number }`(레지스트리 기준, 없는 slug는 `getConcept`처럼 오류)
- 주의사항: 레지스트리 함수 테스트는 실제 21개 기준 단언(첫 개념 prev null, 마지막 next null, position 1과 21)과 순수 함수 픽스처 테스트를 둘 다 둔다
- 완료 조건: 단위 테스트 통과, typecheck·lint 통과

### 3. 개념 페이지 이전/다음

- 대상: 새 `app/components/concept/ConceptPager.tsx`·테스트, `ConceptLayout.tsx`, `tests/build/build-output.test.ts`
- 변경: `<nav aria-label="학습 순서">`, `mt-10`, "학습 순서 {position} / {total}" 텍스트, 이전·다음 `Link`(`/concepts/<slug>`, 텍스트 "이전 개념" / "다음 개념" 작은 라벨 + 제목, 기존 링크 스타일). 데스크톱은 양쪽 정렬, 375px은 세로로 쌓이고 긴 제목은 줄바꿈. `ConceptLayout` 맨 끝에 배치
- 주의사항: 공통 부품이다. `References`보다 뒤라 기존 섹션 순서는 그대로. 제목 요소(h2)를 쓰지 않아 개념 페이지 h2 목록 테스트(필수 h2)에 영향이 없게 한다
- 완료 조건: 컴포넌트 테스트(처음·중간·마지막) 통과, 빌드 테스트(21개 페이지 모두 nav, 처음은 next만·마지막은 prev만, 중간 하나의 두 href 값) 통과, `test:build` 통과

### 4. 홈 보기 전환

- 대상: `app/routes/home.tsx`, `app/components/site/ConceptCard.tsx`
- 변경: `?view=order` 읽기는 `?q=`와 같은 `hydrated` 가드. 전환 버튼 두 개(`aria-pressed`)는 `hydrated`일 때만 렌더, 검색 입력 아래·상태 문구 위. "학습 순서" 클릭 시 `view=order` 설정, "분류별" 클릭 시 `view` 삭제(둘 다 다른 키 보존, `replace: true`, `preventScrollReset: true`). 순서 보기는 `<section aria-labelledby>` + h3 "학습 순서" + `<ol className="list-none …">`의 `<li>`마다 `ConceptCard position={rank}`. rank는 전체 `sortByOrder(allConcepts)`에서의 1부터의 순위
- 주의사항: 첫 렌더(프리렌더)는 분류별 보기·버튼 없음. 결과 없음 문구·상태 문구는 두 보기가 같다. `ConceptCard`는 `position`이 없으면 지금과 같은 마크업
- 완료 조건: typecheck·lint·`npm test` 통과, 브라우저 시나리오 1~5 통과(콘솔 에러 0), `navigation.spec.ts` 기존 4개 그대로 통과

### 5. e2e와 문서 마무리

- 대상: `tests/e2e/navigation.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`
- 변경: navigation — 순서 보기 전환·URL·첫/마지막 카드·검색 병행·뒤로 가기 유지·`/?view=order` 직접 진입, 개념 페이지 하단 다음 링크 클릭 이동. a11y — 홈 순서 보기 axe(라이트·다크), 키보드 전환. responsive — 375px 홈 순서 보기 가로 넘침 0(개념 페이지 하단은 기존 개념 페이지 검사가 덮는지 확인하고 아니면 추가)
- 완료 조건: 전체 검증 명령 통과(e2e 새 실패 0), 브라우저 시나리오 6·7 통과

## 9. 추가 개선 후보

- 소개 페이지 "사용 방법"에 학습 순서 안내와 `/?view=order` 링크(사용자가 이번에는 고르지 않음)
- 이전/다음 링크 옆에 홈 학습 순서 보기로 가는 링크
- 기존 개념 역방향 연결(사용자 결정: 나중에)

## 변경 이력

- 2026-10-30 (사용자 요청): 리뷰 Low ① 수정 — 순서 보기에서 검색 결과가 0건이면 학습 순서 섹션(h3·`<ol>`)을 그리지 않음, e2e 1개 추가 — 영향 단계 4·5

## 구현 진행

- baseline (2026-10-30, `d0684b1`): lint 0 / format 통과 / typecheck 0 / test 2240 통과. test:build 161·e2e 305(skip 3)는 같은 코드의 직전 실행 결과 사용(이후 문서·`reviewedAt`만 바뀜)
- [x] 1. 순서 데이터와 무결성 검사 — 21개 meta `order` 10~210(작성 순서, 메인 대조), 무결성: 개념별 2개(양의 정수, 선수 개념보다 큼) + 전체 1개(중복 없음). 계획의 "개념당 +3"은 중복 검사를 전체 수준에 두어 "개념당 +2, 전체 +1"로 구현(검사 내용 동일). content-guide 필드 표에 `order` 행. 음성 확인: 서브에이전트 closure 5 → 실패, 메인 new-operator 135(선수 property-attributes 150) → 1개 실패, 원복
- [x] 2. 조회 함수 — `sortByOrder`(새 배열), `getAdjacentConcepts`(prev·next·position·total, 없는 slug 오류), 단위 테스트 5개. lint·format·typecheck 통과, test 2288(+48 = 21×2 + 1 + 5)
- [x] 3. 개념 페이지 이전/다음 — `ConceptPager`(nav "학습 순서", "학습 순서 n / 21", 링크 안 라벨 "이전 개념"/"다음 개념" + 제목, 375px 세로 쌓기·데스크톱 양쪽 정렬), `ConceptLayout` 끝에 배치. 서브에이전트 판단: 위쪽 구분선(`border-t pt-6`) 추가. 컴포넌트 테스트 3개, 빌드 테스트 21개(nav 안 href가 이전·다음 경로와 정확히 같음)
- [x] 4. 홈 보기 전환 — `?view=order`를 `?q=`와 같은 하이드레이션 가드로 읽음, 전환 버튼(`role="group"`, `aria-pressed`)은 하이드레이션 뒤에만, 순서 보기는 h3 "학습 순서" + `<ol>` + 카드 "n번째"(전체 순위). `ConceptCard` `position` 선택 prop, 테스트 2개
  - 메인 검증(3·4 합산): lint·format·typecheck 통과, test 2293(+5), test:build 182(+21). 브라우저(serve 4175, Playwright, 데스크톱 라이트·375px 다크) 시나리오 1~7 통과: ① 하이드레이션 뒤 버튼, "분류별" 눌림, 카드 21 ② 전환 → `/?view=order`, h3 1, 첫 "1번째 원시 값과 객체", 끝 "21번째 클로저" ③ `객체` 검색 6건 순위 1·9·16·17·18·19(전체 순위 유지), URL `view`·`q` 둘 다 ④ 카드 → 뒤로: 순서 보기·검색어 유지 ⑤ `/?view=order` 직접 진입 카드 21 ⑥ primitives-and-objects 1/21 다음만, hoisting 11/21 이전 function-calls·다음 scope-chain, closure 21/21 이전만, 다음 클릭 이동 ⑦ Space로 전환, 홈 순서 보기·하단 링크 가로 넘침 0, 콘솔 에러 0
- [x] 5. e2e — navigation 3개(홈 전환·검색·뒤로 가기, `/?view=order` 직접 진입, 개념 페이지 하단 처음·마지막·중간), a11y(홈 순서 보기 axe 라이트·다크, 키보드 Space·Enter 전환), responsive(375px 홈 순서 보기, closure·hoisting 하단 nav). 서브에이전트 첫 실행에서 자기 단언 2건 실패(순위 span과 제목 사이 공백 가정) → 따로 비교하도록 수정
- 전체 검증(메인 새 실행): lint·format·typecheck 통과, test 2293, test:build 182, e2e 325 passed(skip 3 기존, 이전 305 → +20)
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 없음. Low 4(보고만): ① 순서 보기에서 검색 결과가 0건이면 h3 "학습 순서"와 빈 `<ol>`이 남음(분류별 보기는 아무것도 그리지 않음) ② 전환 버튼이 하이드레이션 뒤에 나타나 아래 내용이 한 줄 정도 밀림(하이드레이션 규칙상 의도) ③ `list-none`인 `<ol>`은 Safari VoiceOver에서 목록으로 안내되지 않을 수 있음(순위는 카드의 "n번째" 텍스트로 보임) ④ 카드 h4 안 "n번째"와 제목 사이에 텍스트 공백이 없어(간격은 flex gap) 텍스트 추출 시 붙어 나옴
- 리뷰 Low ① 수정(2026-10-30, 사용자 요청, 메인 직접 — 조건 한 줄): `home.tsx` 순서 보기를 `results.length > 0 &&`로 감쌈(prettier가 삼항식 들여쓰기를 다시 맞춰 diff가 큼), navigation e2e "학습 순서 보기에서 결과가 없으면 학습 순서 목록을 그리지 않는다"(`/?view=order&q=zzz`: 버튼 눌림·결과 없음 문구·h3 0·main 안 `ol` 0). 검증: lint·format·typecheck 통과, test 2293, test:build 182, e2e 1차 273 passed — 실행 중 Playwright 웹 서버(4173)가 종료되어 모바일 54건 `ERR_CONNECTION_REFUSED`(같은 시각 4175 미리보기 serve도 종료, 코드 무관) → 재실행 327 passed(skip 3 기존, +2 = 새 테스트 데스크톱·모바일)

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 21개 `meta.ts`에 `order` 10~210, `sortByOrder`·`getAdjacentConcepts`, 개념 페이지 하단 `ConceptPager`, 홈 `?view=order` 보기 전환, content-guide `order` 안내. 소개 페이지·본문·`reviewedAt`은 바꾸지 않았다.
- 계획과 달라진 점
  - 무결성 테스트는 "개념당 +3" 대신 "개념당 +2(양의 정수, 선수 개념보다 큼) + 전체 1(중복 없음)"으로 만들었다. 검사 내용은 같다.
  - `ConceptPager` 위에 구분선(`border-t pt-6`)을 더했다(서브에이전트 판단, 브라우저에서 확인).

### 코드 리뷰

- Critical/High 0. Low 4건(순서 보기 0건일 때 빈 제목·목록, 전환 버튼이 하이드레이션 뒤에 나타나 내용이 밀림, `list-none` 목록의 Safari VoiceOver 안내, "n번째"와 제목 사이 텍스트 공백 없음)은 보고만 하고 남겼다(사용자 승인 시 별도 지시 없음).

### 후속 작업

- [x] (선택) 리뷰 Low ① 순서 보기에서 검색 결과가 0건이면 목록 섹션을 그리지 않기(2026-10-30 수정)
- [ ] (추가 개선 후보) 소개 페이지 학습 순서 안내, 이전/다음 옆 홈 순서 보기 링크
- [x] execution-context `reviewedAt` 갱신 여부 사용자 확인 — 사용자 결정(2026-10-30): 바꾸지 않음

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 홈 보기 상태를 로컬 상태가 아니라 URL `?view=order`에 두었다 — 개념 페이지에 갔다가 뒤로 오면 같은 보기가 돌아오고, 기존 `?q=`와 같은 하이드레이션 가드·`URLSearchParams(prev)` 보존 패턴을 그대로 쓸 수 있다. 로컬 상태는 뒤로 가기에서 풀린다.
- [Claude 판단] 전환 버튼은 하이드레이션 뒤에만 그린다 — 프리렌더 시점에는 URL을 알 수 없어 첫 렌더를 분류별 보기로 고정해야 하고, JS 없이 동작하지 않는 버튼을 보여 주지 않기 위해서다. 대가로 버튼이 나타날 때 내용이 한 줄 밀린다(리뷰 Low ②).
- [Claude 판단] 화면에는 `order` 값(10, 20…)이 아니라 정렬 뒤 순위(1~21)를 보여 주고, 검색으로 걸러도 전체 순위를 유지한다 — 나중에 사이 번호(예: 205)를 끼워도 화면 번호가 자연스럽고, CSS 목록 번호처럼 걸러진 목록에서 1부터 다시 매겨지지 않는다.
- [무검토 승인] Consensus 검토를 생략하고, 이전/다음을 `ConceptLayout` 맨 끝(`References` 뒤)에 두었다 — 기존 패턴 재사용이고 공통 레이아웃 변경은 21개 페이지 e2e·axe가 덮는다.
- [무검토 승인] 리뷰 Low 4건을 고치지 않고 남겼다.
- 순서 기준은 작성 순서, 보여 줄 곳은 개념 페이지 이전/다음과 홈 학습 순서 목록, 홈은 보기 전환, 순서는 각 `meta.ts` 번호 — 사용자 결정.

#### 배경지식

- 이 사이트는 프리렌더 HTML을 하이드레이션하므로 첫 클라이언트 렌더가 프리렌더와 같아야 한다. URL query처럼 프리렌더 때 알 수 없는 값은 `useHydrated()`가 true가 된 뒤에 반영한다.
- `useSearchParams`의 `setParams(fn, { replace: true })`는 히스토리 항목을 늘리지 않고 URL을 바꾼다. `new URLSearchParams(prev)`로 시작해야 다른 키(`q`, `view`)가 지워지지 않는다.
- 작성 순서는 모든 선수 개념이 앞에 오는 위상 순서다. 책 장 순서는 number-type(6장) → equality-operators(7·9장) 같은 선수 관계와 어긋난다. 무결성 테스트가 "선수 개념보다 큰 order"를 검사해 이 성질을 유지한다.
- 이전/다음은 정적 데이터로 프리렌더 HTML에 들어가므로 JS 없이도 동작한다(빌드 테스트가 21개 페이지의 nav href를 검사).

#### 확인 질문

1. 홈 보기 전환을 로컬 `useState`만으로 만들었다면 어떤 사용자 흐름에서 문제가 생기는가?
   <details><summary>답</summary>순서 보기에서 카드를 눌러 개념 페이지로 갔다가 뒤로 오면 컴포넌트가 다시 마운트되어 분류별 보기로 돌아간다. URL `?view=order`에 두면 뒤로 가기에서 URL이 복원되고, 하이드레이션 가드가 그 값을 읽어 순서 보기를 되살린다. 3절 구현 전략, e2e navigation "뒤로 가기와 함께 유지".</details>
2. `/?view=order`로 처음 들어왔을 때 프리렌더 HTML은 어떤 보기이고, 왜 그래야 하는가?
   <details><summary>답</summary>분류별 보기다. 정적 프리렌더는 query를 모른 채 `/` 하나의 HTML만 만들기 때문에, 첫 클라이언트 렌더도 분류별이어야 하이드레이션 불일치가 없다. `useHydrated()`가 true가 된 뒤 `?view=`를 읽어 순서 보기로 바꾼다. AGENTS 하이드레이션 규칙, `home.tsx`.</details>
3. 나중에 "전역 객체" 개념을 execution-context(200)와 closure(210) 사이에 넣으려면 무엇을 해야 하고, 테스트는 무엇을 막아 주는가?
   <details><summary>답</summary>새 폴더의 `meta.ts`에 `order: 205`처럼 사이 번호를 준다. 화면 순위는 자동으로 21번째가 되고 closure는 22번째가 된다. 무결성 테스트가 번호 중복과 "선수 개념보다 큰 번호"를 검사하므로, 선수 개념보다 앞 번호를 주거나 기존 번호와 겹치면 실패한다. content-guide `order` 행.</details>
4. 순서 보기에서 `객체`로 검색했을 때 카드 번호가 1, 2, 3…이 아니라 1, 9, 16…인 이유는?
   <details><summary>답</summary>번호는 모듈 수준에서 전체 `sortByOrder(allConcepts)`로 한 번 계산한 순위(`rankBySlug`)를 쓰기 때문이다. 걸러진 목록에서 순번을 다시 매기면 같은 개념의 번호가 검색어마다 달라져 "몇 번째로 읽을 개념인지"를 알 수 없다. 3절 구현 전략.</details>
