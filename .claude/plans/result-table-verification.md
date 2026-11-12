# 표 결과 칸 자동 검증 구현 계획

- 상태: 완료
- 작성일: 2026-11-11
- 기준: `main` @ `933eaa7`

## 0. 요약
- 목적: 본문 JSX `<table>`에 손으로 적은 "예제 N의 출력" 칸이 `meta.examples`의 `expectedOutput`과 어긋나면 `npm test`가 실패하게 한다.
- 범위: `tests/`에 검사 helper와 테스트를 추가하고 `docs/content-guide.md`·`AGENTS.md`에 표 작성 규칙을 더한다. 개념 콘텐츠(`app/`)는 바꾸지 않는다.
- 위험: 파서가 행을 못 알아보면 조용히 검사에서 빠진다. 하한선 검사와 "예제 행이 있는 표는 모든 행이 예제 행" 검사로 막는다.
- 복잡도: 낮음 · Consensus: 생략 (테스트·문서만 추가하고 앱 코드는 바꾸지 않으며, 시제품 스크립트로 현재 표 전부가 통과함을 확인함)
- 미확정: 없음

## 1. 요구사항
- 요구사항: 표의 결과 칸 가운데 특정 예제의 출력을 적은 칸을 실제 실행 출력(`expectedOutput`, 이것은 `tests/examples.test.ts`가 실제 실행과 대조한다)과 자동 대조한다.
- 유지할 동작: 기존 테스트, 페이지 렌더링, 표 마크업. 새 개념은 폴더만 추가하면 되고 공통 코드를 고치지 않는다는 원칙(AGENTS.md "목적").
- 제외 범위:
  - 식 → 결과 표 5개(equality-operators:218, number-type:142, typeof-operator:159, type-coercion:219, increment-decrement:123). 행이 예제 번호가 아니라 식으로 되어 있어 대조할 출력이 정해지지 않는다. → `추가 개선 후보`
  - 규칙·비교 설명 표(예: equality-operators:29, this-binding:94, property-attributes:66, short-circuit-evaluation:147). 실행 출력 주장이 아니다.
  - 칸이 출력 줄 일부를 가리키는 표(prototype-chain:69 "예제 8의 4~6번 줄", fetch:106 근거 칸 "예제 N의 출력"), block-scope:40(ES 모듈·CommonJS 열은 실행기가 없다).
  - 데이터 파일로 그리는 표 17개(`{rows.map(...)}`). 이미 각 `concept.test.ts`가 데이터 파일을 import해 검증한다.

## 2. 사실과 추정
### 사실 (코드에서 확인)
- 개념 56개, `<table>` 47개(41개 개념). 그중 17개는 `.map(`으로 데이터 파일을 그리고, 17개 모두 해당 `concept.test.ts`가 그 데이터 파일을 참조한다(예: `app/concepts/typeof-operator/concept.test.ts:3,22-27`).
- 손으로 쓴 표 중 "예제 N" 행 형식인 표 10개: async-await:402, async-generator:575, error-handling:449, es-modules:554, generator:389, microtask-queue:379(머리 `결과` 또는 `결과(예제 출력)`), function-calls:154, hoisting:132, property-keys:172, switch-break-continue:151(머리 `출력`, 첫 칸 `N: 제목`).
- 열 머리가 `예제 9의 출력`인 표 1개: new-operator:65. 칸을 위에서부터 이으면 `built-in.js`의 `expectedOutput` `['{}', '{}', 'object', 'string']`(`app/concepts/new-operator/meta.ts:101`)과 같다.
- 예제 번호는 본문의 `### 예제 N: …` 제목과 그 아래 첫 ```` ```js file=./examples/<file> ```` 로 정해진다(예: `app/concepts/error-handling/content.mdx:91-95`). 레이아웃이 번호를 자동으로 붙이지 않는다.
- `expectedOutput`은 줄 단위 문자열 배열이다(`app/lib/concepts.ts:8,21`).
- 시제품 스크립트(scratchpad, 저장소 밖)로 위 10개 표의 99개 행을 대조한 결과: 결과 칸은 모두 출력 줄을 `, ` 또는 ` / `로 이은 문자열과 정확히 같다(99/99). 칸 텍스트 정규화는 태그 제거, `{'…'}`·`{"…"}`·`` {`…`} `` 풀기(중괄호 안쪽 공백·줄바꿈 허용), 공백을 하나로 접기면 충분하다. 본문 MDX에 HTML 엔티티(`&lt;` 등)는 없다.
- `vitest.config.ts`의 node 프로젝트는 `tests/*.test.ts`를 포함한다. helper는 `tests/helpers/`에 두고 같은 층의 `tests/*.test.ts`에서 검사하는 패턴이 있다(`tests/run-example.test.ts` → `tests/helpers/run-example.ts`).
- `tests/content-integrity.test.ts:8-14`는 `import.meta.glob('../app/concepts/*/meta.ts', { eager: true })`로 메타를 모은다.
### 추정
- 없음

## 3. 구현 전략
- 정규식 기반 helper가 `content.mdx` 원문에서 (1) `### 예제 N` → 예제 파일 대응표, (2) `.map(`이 없는 `<table>`의 행·칸 텍스트를 뽑는다. 테스트는 두 형식의 주장을 `expectedOutput`과 대조한다.
  - 행 형식: 머리 칸 중 `결과` 또는 `출력`으로 시작하는 열이 있고, 본문 행의 첫 칸이 `예제 N` 또는 `N:`으로 시작하면, 그 열의 칸이 `expectedOutput.join(', ')` 또는 `expectedOutput.join(' / ')`와 같아야 한다.
  - 열 형식: 머리 칸이 `예제 N의 출력`이면 그 열의 칸을 위에서부터 모은 배열이 `expectedOutput`과 같아야 한다.
- 고른 이유: 현재 표 100개 칸(99개 행과 new-operator 1개 열)이 이미 이 규칙을 따르므로 콘텐츠를 바꾸지 않고 바로 검사할 수 있다. 개념 목록을 테스트에 적지 않아 새 개념은 폴더만 추가하면 자동으로 검사된다.
- 버린 대안:
  - MDX AST(remark-mdx)로 파싱: `remark-mdx`·`remark-parse`는 직접 의존성이 아니라 추가하려면 승인이 필요하고, 정규식으로도 현재 표 전부를 처리한다.
  - 표를 데이터 파일로 옮기기(기존 17개 표의 방식): 개념 10개의 MDX와 표 마크업을 바꿔야 해서 요구보다 크다.
  - 칸에 `data-example` 속성 달기: 렌더링 HTML이 바뀌고 47개 표 중 대부분에는 필요 없다.

## 4. 변경 파일
- 추가 `tests/helpers/result-tables.ts`: 대응표·표 파싱·칸 정규화 함수(순수 함수, `content.mdx` 문자열을 받는다).
- 추가 `tests/result-tables.test.ts`: helper 단위 테스트(작은 MDX 고정 문자열로 일치·불일치·형식 위반을 확인)와 모든 개념 검사.
- 수정 `docs/content-guide.md`: "표는 JSX `<table>`로 씁니다" 단락(141행) 뒤에 예제 출력 표 작성 규칙을 더한다.
- 수정 `AGENTS.md`: 디렉터리 구조의 `tests/` 목록에 `result-tables.test.ts` 한 줄을 더하고, `helpers/` 목록에 `result-tables.ts`를 더한다.
- 변경하지 않음: `app/` 전체(콘텐츠·컴포넌트), `vitest.config.ts`(기존 include가 새 파일을 포함), `package.json`(의존성 없음).

## 5. 위험 요소
- 파서가 행을 못 알아봄 → 검사가 조용히 빠짐 → 작업 순서 2의 하한선 검사(대조한 칸 100개 이상)와 "예제 행이 하나라도 있는 표는 본문 행이 모두 예제 행" 검사.
- 예제 번호 대응 오류(다음 예제의 `file=`을 잡음) → 잘못된 출력과 대조 → 대응표는 `### 예제 N` 제목부터 다음 `#`·`##`·`###` 제목 전까지만 찾고, 찾은 파일이 `meta.examples`에 없거나 번호가 없으면 실패한다.
- 칸 정규화가 다른 텍스트를 같게 만듦(거짓 통과) → 정규화는 태그 제거·JSX 문자열 풀기·공백 접기만 한다. 단위 테스트에 한 줄만 다른 불일치 고정 문자열을 넣어 실패를 확인한다.
- 출력 줄 자체에 `, `가 들어 있음 → 이은 문자열끼리 비교하므로 영향 없음.
- 한 표 안에서 `, `와 ` / `를 섞어 씀 → 행마다 둘 중 하나와 같으면 통과. 표 단위 일관성은 검사하지 않는다(현재 위반 없음, 범위 밖).
- 하한선 숫자 → 표를 지우면 내려야 한다. 개념을 추가할 때는 고칠 필요가 없다(이상 비교).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck`
- 테스트: `npm test` 전체 통과. 새 테스트가 100개 칸을 대조했는지 테스트 이름·개수로 확인.
- 실패 확인: error-handling:449 예제 3 칸(`finally x = 2, 1`)을 임시로 `finally x = 2, 2`로 바꾸면 `npm test -- tests/result-tables.test.ts`가 그 칸을 짚어 실패하는지 확인하고 되돌린다(`git diff --stat`이 비어야 함).
- 빌드·e2e: 앱 코드 변경이 없으므로 결과는 바뀌지 않지만 AGENTS.md 검증 순서대로 `npm run test:build`, `npm run e2e`까지 실행한다.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 검사 helper 작성
- 대상: `tests/helpers/result-tables.ts`
- 현재: 없음
- 변경: 다음 함수를 export한다.
  - `normalizeCell(html: string): string`: 태그 제거, `\{\s*'([^']*)'\s*\}`·`\{\s*"([^"]*)"\s*\}`·`` \{\s*`([^`]*)`\s*\} `` 풀기, 공백 접기·trim.
  - `exampleFilesByNumber(mdx: string): Map<number, string>`: `### 예제 N` 제목마다 다음 제목 전까지의 첫 `file=./examples/<file>`(코드 펜스 안의 줄은 제목으로 보지 않음). 같은 번호에 `file=`이 두 번 대응되면 throw(`file=` 없이 반복되는 "결과와 이유" 절의 제목은 허용).
  - `extractTables(mdx: string): { line: number; rows: string[][] }[]`: 줄 맨 앞(들여쓰기 허용)에서 시작하는 `<table>…</table>` 중 `{rows.map(` 같은 JSX 식(`/\{\s*[\w.]+\.map\(/`)이 없는 것만, 첫 행은 머리. `line`은 `<table`의 1부터 센 줄 번호.
  - `extractOutputClaims(mdx: string): { line: number; exampleNumber: number; kind: 'row' | 'column'; text: string | string[] }[]` 와 형식 위반 목록(예제 행과 아닌 행이 섞인 표). 행 형식·열 형식 규칙은 "구현 전략"과 같다.
- 이유: 파싱을 순수 함수로 분리해 고정 문자열로 단위 테스트할 수 있게 한다.
- 주의사항: 의존성을 추가하지 않는다(`node:` 모듈도 필요 없음). Prettier·ESLint 규칙을 따른다.
- 완료 조건: `npm run typecheck`·`npm run lint` 통과.

### 2. 테스트 작성
- 대상: `tests/result-tables.test.ts`
- 현재: 없음
- 변경:
  - 단위: 고정 MDX로 (a) 행 형식 `, `·` / ` 일치, (b) 한 줄 다른 칸, (c) 열 형식, (d) `### 예제 N` 범위 밖의 `file=`을 잡지 않음, (e) 예제 행과 아닌 행이 섞인 표가 위반으로 나옴, (f) `.map(` 표 제외를 확인한다.
  - 전체: `import.meta.glob('../app/concepts/*/meta.ts', { eager: true })`와 같은 폴더의 `content.mdx`(`readFileSync`)로 개념마다 주장을 뽑아 `it.each`로 대조한다. 테스트 이름에 `<slug>:<line> 예제 N`을 넣는다. 예제 번호가 대응표에 없거나 파일이 `meta.examples`에 없으면 실패한다. 형식 위반 목록이 비어 있어야 한다. 대조한 칸 수가 100 이상이어야 한다.
- 이유: 요구사항의 자동 대조 본체.
- 주의사항: 개념 목록을 하드코딩하지 않는다. `expectedOutput`의 출처는 `meta.examples`뿐이다(예제를 다시 실행하지 않는다, 실행 대조는 `tests/examples.test.ts`가 맡는다).
- 완료 조건: `npx vitest run tests/result-tables.test.ts` 통과, 출력에 대조 테스트가 100개 이상. "검증 방법"의 실패 확인 절차로 임시 변경 시 실패하고 되돌린 뒤 `git status`에 `app/` 변경이 없다.

### 3. 문서 갱신
- 대상: `docs/content-guide.md`(141행 단락 뒤), `AGENTS.md`(디렉터리 구조 `tests/`)
- 변경:
  - content-guide: "표에 예제 출력을 적으면 `npm test`가 `expectedOutput`과 대조합니다. 행마다 예제 하나면 첫 칸을 `예제 N: …` 또는 `N: …`로 시작하고 `결과`·`출력`으로 시작하는 열에 출력 줄을 `, `나 ` / `로 이어 씁니다. 한 열이 예제 하나의 출력이면 열 머리를 `예제 N의 출력`으로 쓰고 칸마다 한 줄씩 씁니다. 출력을 줄여 쓰거나 일부만 쓰려면 이 형식을 쓰지 않습니다." 취지의 단락.
  - AGENTS.md: `helpers/` 줄에 `result-tables.ts`, `tests/` 목록에 `result-tables.test.ts  # 표의 예제 출력 칸 대조` 한 줄.
- 완료 조건: `npm run format:check` 통과, 문서의 규칙 문장이 작업 순서 2의 테스트 규칙과 같다.

### 4. 전체 검증
- 완료 조건: AGENTS.md 검증 순서 명령 전체 통과.

## 9. 추가 개선 후보
- 식 → 결과 표 5개를 데이터 파일로 옮기고 `concept.test.ts`에서 식을 직접 평가해 대조(typeof-operator의 `typeof-table.ts` 방식). 행마다 준비 코드(`p`, `q`, `empty`, `add` 등)가 달라 표별 작업이 필요하다.
- prototype-chain:69, fetch:106처럼 출력 일부나 줄 번호를 가리키는 칸의 대조.
- 한 표 안 구분자(`, `·` / `) 일관성 검사.

## 변경 이력
- 2026-11-11 (구현 중 발견): 단계 1의 "같은 번호가 두 번 나오면 throw"를 "같은 번호에 `file=`이 두 번 대응되면 throw"로 좁힘. 근거: 개념 25개(arrow-functions, date, fetch 등)의 "결과와 이유" 절이 `### 예제 N` 제목을 `file=` 없이 다시 쓴다. 잘못된 파일을 잡는 위험은 이중 대응 throw와 제목 범위 제한으로 계속 막는다 — 영향 단계 1·2
- 2026-11-11 (구현 검증 중 보완): 표 추출을 줄 맨 앞의 `<table`로, 데이터 표 판별을 `.map(` 포함에서 JSX 식 `{xxx.map(`으로 좁힘. 근거: dom-tree-nodes 본문 문장에 인라인 코드 `<table>`이 있고, 손으로 쓴 표의 코드 칸에 `arr.map(f)`가 적히면 그 표가 조용히 빠진다. 현재 결과(손으로 쓴 표 29개, 대조 100개)는 같다 — 영향 단계 1·2

## 구현 진행

- baseline (2026-11-11, `933eaa7`): lint·format:check·typecheck 통과 / `npm test` 152 파일 4637 테스트 통과 / test:build·e2e 미실행(앱 변경 없음, 마지막 전체 검증에서 실행)
- [x] 1. 검사 helper 작성 — `tests/helpers/result-tables.ts`(normalizeCell·exampleFilesByNumber·extractTables·extractOutputClaims·compareClaim·checkClaims), typecheck·lint 통과
- [x] 2. 테스트 작성 — `tests/result-tables.test.ts` 119개 통과(단위 17 + 칸 100 + 위반 없음 1 + 하한선 1). 손으로 쓴 표 29개 추출(dom-tree-nodes 0개). 실패 확인: error-handling:449 예제 3 칸을 `finally x = 2, 2`로 바꾸면 `error-handling:449 예제 3`만 실패, `git checkout`으로 되돌려 `app/` 변경 없음
- [x] 3. 문서 갱신 — `docs/content-guide.md:143-147`, `AGENTS.md:45,48`, format:check 통과
- [x] 4. 전체 검증 — lint·format:check·typecheck 통과 / `npm test` 153 파일 4756 테스트 통과(baseline +119) / `npm run test:build` 451 통과 / `npm run e2e` 689 통과·3 skipped(기존 skip, 앱 변경 없음)
- 리뷰 1차: Critical·High·Medium 없음 · Low 2 (보고)
  - Low: `tests/helpers/result-tables.ts:34` 줄 맨 앞의 코드 펜스만 인식(들여쓴 펜스의 file=은 대응 실패로 드러남, 현재 없음)
  - Low: 형식을 따르지 않는 표(줄여 쓴 출력, 식 → 결과 표)는 검사 밖(의도, content-guide에 명시)

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 helper(`tests/helpers/result-tables.ts`)·테스트(`tests/result-tables.test.ts`)·문서(content-guide, AGENTS.md)를 추가했다. 손으로 쓴 표 29개에서 칸 100개(행 99, 열 1)를 대조하고 모두 일치한다.
- 달라진 점 2건(`변경 이력`): 이중 대응일 때만 throw(개념 25개의 "결과와 이유" 절이 제목을 반복), 표 추출을 줄 맨 앞 `<table`·JSX 식 `{xxx.map(`으로 좁힘(dom-tree-nodes의 인라인 코드 `<table>`, 코드 칸의 `arr.map(f)`). 완료 조건은 바꾸지 않았다.
- content-guide의 구분자 문장은 Prettier가 `` ` / ` ``를 `/`로 바꿔 의미가 사라져서 "쉼표와 공백(예: `a, b`)이나 앞뒤에 공백을 둔 슬래시(예: `a / b`)"로 썼다.

### 코드 리뷰
- Critical·High·Medium 없음. Low 2건(들여쓴 코드 펜스 미인식, 형식을 따르지 않는 표는 검사 밖)은 의도한 범위로 남김.

### 후속 작업
- [ ] 식 → 결과 표 5개(equality-operators, number-type, typeof-operator, type-coercion, increment-decrement)를 데이터 파일로 옮겨 식을 직접 평가해 대조
- [x] 예제 행으로 쓰려던 표가 첫 칸 형식을 어겨 조용히 빠지는 경우를 잡는 검사(예: `예제`로 시작하지만 형식에 맞지 않는 첫 칸 경고) — 2026-11-12 `table-verification-followups.md`에서 처리(형식 위반 판정 A·B, block-scope 표를 형식에 맞춤)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [무검토 승인] 콘텐츠를 바꾸지 않고 현재 표가 이미 따르는 관례(첫 칸 `예제 N`/`N:`, 출력 줄을 `, `·` / `로 이음)를 규칙으로 삼았다 — MDX AST 파싱(의존성 추가 필요), 표를 데이터 파일로 옮기기(개념 10개 MDX 변경), `data-example` 속성(렌더링 변경)을 버림. 시제품으로 100개 칸이 이미 관례를 따름을 확인했기 때문.
- [무검토 승인] 예제를 다시 실행하지 않고 `meta.examples[].expectedOutput`과만 대조한다 — 실행 ↔ `expectedOutput`은 `tests/examples.test.ts`, `expectedOutput` ↔ 표는 이번 테스트로 나눠 두 층을 이으면 표가 실행 결과와 같다는 것이 보장된다.
- [무검토 승인] 같은 번호에 `file=`이 두 번 대응될 때만 throw — 번호 중복만으로 throw하면 "결과와 이유" 절에서 제목을 반복하는 개념 25개가 실패한다. 잘못된 파일을 잡는 위험은 이중 대응 throw와 "다음 제목 전까지" 범위 제한이 막는다.
- [무검토 승인] 표 추출을 줄 맨 앞의 `<table`, 데이터 표 판별을 `{xxx.map(`으로 좁힘 — `.map(` 포함으로 판별하면 코드 칸에 `arr.map(f)`가 적힌 손으로 쓴 표가 조용히 빠지고, 위치 제한이 없으면 문장 속 인라인 코드 `<table>`부터 표로 잡는다.
- [무검토 승인] 대조 칸 수는 정확한 값이 아니라 하한(≥ 100)으로 검사 — 정확한 값이면 새 개념에 표를 추가할 때마다 공통 테스트를 고쳐야 해 "폴더만 추가" 원칙과 어긋난다. 대신 새 표가 형식을 어기면 빠지는 것은 막지 못한다.
- [무검토 승인] 식 → 결과 표 5개는 범위에서 뺌 — 행이 예제 번호가 아니라 식이라 대조할 출력이 정해지지 않는다. 검증하려면 표별 준비 코드가 필요하다.

#### 배경지식
- 예제 번호는 레이아웃이 자동으로 붙이지 않고 본문의 `### 예제 N: …` 제목이 정한다. 그 아래 `file=./examples/<file>` 펜스가 `meta.examples`의 `file`과 이어진다.
- 데이터 파일로 그리는 표 17개(`{rows.map(...)}`)는 표 데이터가 `.ts`에 있어 각 `concept.test.ts`가 import해 검증한다. 본문에 직접 쓴 표만 검사 공백이었다.
- `import.meta.glob(..., { eager: true })`는 변환 시점에 파일 목록을 박는다. `vitest.config.ts`가 `fsModuleCache: false`로 옛 목록에 얼지 않게 한다.
- CommonMark는 인라인 코드 양끝에 공백이 하나씩 있으면 하나씩 지운다. 그래서 `` ` / ` ``는 `/`로 보인다(Prettier도 그렇게 정리).

#### 확인 질문
1. 이 테스트는 예제를 실행하지 않는데, 어떻게 표가 "실제 실행 결과"와 같다고 말할 수 있나?
   <details><summary>답</summary>`tests/examples.test.ts`가 예제를 실제로 실행해 `expectedOutput`과 대조하고, 이번 테스트가 표를 `expectedOutput`과 대조한다. 둘 다 통과하면 표 = expectedOutput = 실행 결과다(계획 1절·3절).</details>
2. "같은 예제 번호가 두 번 나오면 실패"로 했다면 무엇이 깨지나? 지금 규칙은 그 위험을 어떻게 막나?
   <details><summary>답</summary>개념 25개의 "결과와 이유" 절이 `### 예제 N` 제목을 `file=` 없이 반복해 모두 실패한다. 지금은 같은 번호에 `file=`이 두 번 대응될 때만 throw하고, `file=`은 제목부터 다음 `#`~`###` 제목 전까지만 찾는다(`tests/helpers/result-tables.ts:28` `exampleFilesByNumber`, 변경 이력).</details>
3. 데이터 표 판별을 "표에 `.map(`이 있으면"으로 두면 어떤 표가 조용히 빠지나?
   <details><summary>답</summary>코드 칸에 `arr.map(f)` 같은 텍스트가 있는 손으로 쓴 표. 그래서 `{` 바로 뒤의 `xxx.map(` JSX 식만 데이터 표로 본다(`DATA_TABLE`, `tests/helpers/result-tables.ts:62`, 단위 테스트 "코드 칸에 .map(이 적힌…").</details>
4. 대조 칸 수를 `=== 100`이 아니라 `>= 100`으로 둔 이유와, 그 대가는?
   <details><summary>답</summary>정확한 값이면 새 개념이 표를 추가할 때마다 공통 테스트를 고쳐야 한다(AGENTS.md "폴더만 추가" 원칙). 대가는 새 표가 첫 칸 형식을 어기면 검사에서 조용히 빠지는 것을 막지 못한다는 것(검수 가이드 5절 잠재 위험, 후속 작업).</details>
5. 표의 결과 칸을 `try, finally, …` 대신 출력 일부만 줄여 쓰고 싶으면 어떻게 해야 하나?
   <details><summary>답</summary>행·열 형식(첫 칸 `예제 N`, `결과`·`출력` 열, `예제 N의 출력` 머리)을 쓰지 않는다. 그 표는 검사 대상이 아니다(`docs/content-guide.md` 표 규칙 셋째 항목).</details>
