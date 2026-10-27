# SEO 구조화 데이터와 sitemap lastmod 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `fb3d578`

## 0. 요약
- 목적: 검색 엔진이 페이지 성격과 수정 시점을 읽도록 개념 페이지·홈 `<head>`에 구조화 데이터(JSON-LD)를 넣고, `sitemap.xml`의 개념 URL에 `lastmod`를 넣는다(출처는 `reviewedAt` 하나).
- 범위: `app/lib/seo.ts`(생성 함수 추가, `buildMeta` 시그니처 불변), 홈 route와 개념 `route.tsx` 6개(`meta()` 한 줄), `scripts/postbuild.mjs`, 단위·메타 무결성·빌드 테스트, `docs/content-guide.md`. `ConceptLayout`·`meta.ts`·기존 메타 태그는 바꾸지 않는다.
- 위험: `reviewedAt: null`인 새 개념에서 빌드가 깨지거나, `lastmod`가 실제 수정과 어긋나는 것 → null이면 `lastmod`만 생략하는 규칙과 그 경로의 검증을 넣고, "본문을 고치면 재검토 후 `reviewedAt` 갱신" 규칙을 문서화한다.
- 복잡도: 중간 · Consensus: 수행 (Architect·Critic 각 REVISE → 지적 반영, HIGH 0 남음)
- 미확정: 1건

## 1. 요구사항

### 요구사항
- (사용자 요청 2026-10-27 "푸시하고 2, 3번 진행해줘") 푸시는 계획 전에 완료(`48bea4a..fb3d578`). SEO 2번: 구조화 데이터(JSON-LD). 3번: sitemap `lastmod`, `reviewedAt` 활용.
- 개념 페이지: schema.org `TechArticle` — 제목·설명·URL·언어·대표 이미지·사이트·수정일(`reviewedAt`이 있을 때만).
- 홈: schema.org `WebSite` — 이름·URL·설명·언어.
- `sitemap.xml`: 개념 URL에 `reviewedAt`이 있으면 `<lastmod>YYYY-MM-DD</lastmod>`. 홈·소개는 수정일 출처가 없으므로 넣지 않는다.

### 유지해야 하는 기존 동작
- 기존 메타 태그(`buildMeta` 출력)와 그 테스트(`app/lib/seo.test.ts`, `tests/build/build-output.test.ts`)가 그대로 통과한다. `buildMeta` 시그니처는 바꾸지 않는다(소개·404 호출부 불변).
- 하이드레이션 규칙(`AGENTS.md` 하이드레이션 규칙). e2e `collectConsoleErrors`(`tests/e2e/helpers.ts:20-31`)가 하이드레이션 경고까지 잡는다.
- "새 개념은 폴더만 추가"(`AGENTS.md:5`): 새 개념은 content-guide 6단계 route 템플릿을 복사하는 것만으로 JSON-LD가 붙고, `reviewedAt: null`로 시작해도 빌드가 성공해야 한다(content-guide 2단계 표 `docs/content-guide.md:37`).
- 404는 `noindex`·sitemap 제외 유지.
- 커밋 규칙(`AGENTS.md:24` Co-Authored-By, 로컬 git 작성자).

### 제외 범위
- 검색 엔진 등록(1번, 사용자 보류), 개념별 공유 이미지(4번), 커스텀 도메인(5번).
- `BreadcrumbList`: 개념 페이지에 화면에 보이는 breadcrumb UI가 없다(`ConceptLayout`). 보이지 않는 내용의 마크업을 피하려고 넣지 않는다.
- `author`·`datePublished`(출처 데이터가 없다 → 7절), 소개·404의 JSON-LD, 다른 구조화 데이터 유형.
- 리치 결과 노출 보장(검색 엔진이 결정). 페이지나 문서에 그런 주장을 쓰지 않는다.

## 2. 사실과 추정

### 사실 (코드에서 확인)
- 메타 태그는 라우트 `meta()`가 `buildMeta()`(`app/lib/seo.ts:17-36`)로 만든다. 호출부: 홈(`app/routes/home.tsx:10-12`), 소개(`app/routes/about.tsx`), 404(`app/routes/not-found.tsx`), 개념 route 6개(`app/concepts/*/route.tsx`), content-guide 6단계 템플릿(`docs/content-guide.md:130-140`).
- React Router 8.5.0 `<Meta />`는 leaf 라우트의 meta만 출력한다(루프마다 덮어씀, `node_modules/react-router/dist/development/lib/dom/ssr/components.js:350-431`). `root.tsx`에는 `meta` export가 없다 → JSON-LD는 페이지당 한 번, 부모와 병합되지 않는다.
- `{ "script:ld+json": LdJsonObject | LdJsonObject[] }` 디스크립터는 `<script type="application/ld+json">`로 출력되고(`components.js:416-422`), `escapeHtml`이 `& > < U+2028 U+2029`를 JSON 유니코드 이스케이프(`&` 등)로 바꾼다(`markup.js:12-22`). 이 문자들은 JSON 문자열 안에만 있으므로 출력은 여전히 유효한 JSON이고 `JSON.parse`로 원문이 복원된다(Architect가 Node로 왕복 확인). `short-circuit-evaluation` 제목의 `&&`가 이 경로를 실제로 거친다.
- 디스크립터 타입: `index-react-server.d.ts:2647-2657`의 `LdJsonObject`. `Record<string, unknown>`은 이 제약을 받지 않으므로 프레임워크 타입에서 꺼내 쓴다.
- `ConceptMeta.reviewedAt: string | null`(`app/lib/concepts.ts:20`). 현재 값: `primitives-and-objects` 2026-10-21, `short-circuit-evaluation` 2026-10-26, 나머지 4개 2026-10-27.
- `tests/content-integrity.test.ts`에는 `reviewedAt` 형식 검사가 없다(Critic 확인).
- `seo.ts`가 `import type { ConceptMeta }`만 하면 `verbatimModuleSyntax`로 런타임 import가 사라져 소개·404 번들에 레지스트리가 추가되지 않는다. `concepts.ts`는 `seo.ts`를 import하지 않아 순환이 없다.
- sitemap은 `scripts/postbuild.mjs`가 `build/client/**/index.html` 목록으로 만들고(404 제외) 개념 메타는 읽지 않는다. 빌드 테스트 `htmlToText`는 `<script>`를 제거하므로 JSON-LD가 기존 본문 검사에 영향을 주지 않는다. `test:build` = `npm run build && vitest run --config vitest.build.config.ts`.
- CSP 헤더 없음(`vercel.json`). `AGENTS.md`의 "postbuild.mjs(404.html, sitemap, robots)"와 `README.md` 설명은 변경 후에도 사실이라 고치지 않는다.

### 추정
- React 19가 `<head>`의 `type="application/ld+json"` 인라인 script를 하이드레이션할 때 경고를 내지 않는다 — React Router 공식 디스크립터이므로 가능성이 높다. 확인 시점: 4단계 e2e(콘솔 에러 0).

## 3. 구현 전략
- **출력: React Router 메타 디스크립터 `script:ld+json`.** `<head>`에 나가고, 이스케이프를 프레임워크가 맡으며, 하이드레이션 경로가 기존 메타 태그와 같다. `buildMeta`는 바꾸지 않고 새 함수가 `[...buildMeta(...), { 'script:ld+json': … }]`를 반환한다(공통 함수 변경 최소).
- **개념 페이지 적용: `buildConceptMeta(concept)`** 를 `seo.ts`에 두고 개념 route 6개와 content-guide 6단계 템플릿의 `meta()`를 `return buildConceptMeta(concept)`로 바꾼다. 기존 6개 route는 한 줄씩 바뀌지만, 이후 새 개념은 템플릿 복사만으로 JSON-LD가 붙는다. 템플릿을 복사하지 않아 JSON-LD가 빠지면 postbuild가 빌드를 실패시켜 알린다.
  - 버린 대안 A: `ConceptLayout`에서 body에 `<script>`를 직접 렌더링 — route 수정은 없지만 이스케이프를 직접 해야 하고 메타 정보가 head(`buildMeta`)와 body로 나뉜다.
  - 버린 대안 B: `buildMeta`가 `path` 문자열로 레지스트리를 조회 — `seo.ts`가 `concepts.ts`(import.meta.glob)에 의존해 소개·404 번들에 레지스트리가 추가되고, path 문자열로 암묵 결합된다.
- **JSON-LD 내용**(schema.org, 객체 하나):
  - 개념: `{ '@context': 'https://schema.org', '@type': 'TechArticle', headline: title, description: summary, url: canonical, inLanguage: 'ko', image: OG_IMAGE_URL, isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` }, dateModified?: reviewedAt }` — `reviewedAt`이 null이면 `dateModified` 키 자체를 넣지 않는다.
  - 홈: `{ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/`, description: SITE_DESCRIPTION, inLanguage: 'ko' }`.
- **lastmod**: postbuild가 TS 메타 대신 프리렌더된 개념 HTML의 JSON-LD를 파싱해 `dateModified`를 쓴다 → HTML의 `dateModified`와 sitemap `lastmod`가 같은 값임이 구조적으로 보장된다.
  - 개념 HTML(`concepts/<slug>/index.html`) 규칙: `application/ld+json` 스크립트가 없거나, `JSON.parse` 실패, `@type: 'TechArticle'` 객체가 아니면 → **throw**(빌드 실패). `dateModified`가 없으면 → **lastmod 생략**(정상, 새 개념). 있는데 `^\d{4}-\d{2}-\d{2}$`가 아니면 → **throw**.
  - 버린 대안: git 커밋 날짜(Vercel 얕은 clone), postbuild에서 `meta.ts` 직접 import(Node 타입 스트리핑에 의존).
- **reviewedAt 형식의 1차 방어**는 메타 무결성 테스트(`tests/content-integrity.test.ts`)에 둔다: `null` 또는 `YYYY-MM-DD`이면서 실제 달력 날짜. postbuild 형식 검사는 2차 방어.
- **의미 규칙(문서화)**: `reviewedAt`은 "사용자가 현재 본문을 검토 승인한 날"이며 구조화 데이터 `dateModified`와 sitemap `lastmod`로도 쓰인다. 본문을 고치면 다시 검토받고 `reviewedAt`을 갱신한다.

## 4. 변경 파일
- 수정
  - `app/lib/seo.ts`: `conceptJsonLd(concept)`, `siteJsonLd()`, `buildConceptMeta(concept)` 추가. 타입은 `type LdJson = Extract<MetaDescriptor, { 'script:ld+json': unknown }>['script:ld+json']`. `buildMeta`는 그대로.
  - `app/lib/seo.test.ts`: 새 함수 테스트 추가(기존 6개 유지)
  - `app/routes/home.tsx`: `meta()`가 `[...buildMeta(...), { 'script:ld+json': siteJsonLd() }]`
  - `app/concepts/*/route.tsx` 6개: `meta()` → `return buildConceptMeta(concept)`, 쓰지 않게 된 `buildMeta` import 제거
  - `scripts/postbuild.mjs`: 3절 규칙대로 `<lastmod>` 출력, 로그에 lastmod 개수
  - `tests/content-integrity.test.ts`: `reviewedAt` 형식 검사 추가
  - `tests/build/build-output.test.ts`: JSON-LD·sitemap lastmod 검사 추가(기존 케이스 유지)
  - `docs/content-guide.md`: 2단계 표 `reviewedAt` 설명, 6단계 route 템플릿, 7단계 자동 검사 목록에 "구조화 데이터·sitemap lastmod", 10단계 재검토 규칙
- 변경하지 않음: `app/root.tsx`, `ConceptLayout`, `meta.ts`들, `app/routes/about.tsx`·`not-found.tsx`, `vercel.json`, `package.json`, `AGENTS.md`, `README.md`

## 5. 위험 요소
- `reviewedAt: null` 새 개념에서 빌드 실패 → null이면 `dateModified` 키 없음 → postbuild는 lastmod만 생략(3절 규칙). 4단계 음성 확인 ②로 실제 경로를 실행한다.
- JSON-LD 문자열에 `</script>`·`&` 등 → React Router `escapeHtml`. 빌드 테스트가 모든 개념 JSON-LD의 `JSON.parse`와 `headline === title`(`&&` 포함)을 검사.
- 하이드레이션 경고 → e2e 콘솔 에러 0(4단계).
- 개념 route를 바꾸며 기존 태그가 달라짐 → `buildConceptMeta`는 `buildMeta({ title, description: summary, path: `/concepts/${slug}` })` 결과 전체 + JSON-LD. 단위 테스트가 동일성을 검사하고 기존 빌드 테스트(title·canonical·og)가 통과해야 한다.
- 템플릿을 복사하지 않은 새 개념 → postbuild throw로 드러남(음성 확인 ①).
- `reviewedAt` 잘못된 날짜(`'2026-13-40'`, `'2026-10-27 '`) → content-integrity에서 실패(음성 확인 ③).
- sitemap 형식 → `<url><loc>…</loc><lastmod>…</lastmod></url>` 순서(sitemaps.org).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 빌드 산출물(빌드 테스트로 자동화): 개념 HTML마다 `application/ld+json` 정확히 1개, `JSON.parse` 성공, `@type` `TechArticle`, `headline`=title, `url`=canonical, `inLanguage`='ko', `dateModified`=reviewedAt(null이면 키 없음). 홈은 `WebSite` 1개. 소개·404에는 JSON-LD 없음. sitemap: 개념 URL의 `lastmod`=reviewedAt(null이면 없음), 홈·소개 lastmod 없음.
- 외부 도구(선택, 사용자 확인 항목): 배포 후 Google 리치 결과 테스트 또는 Schema Markup Validator로 개념 URL 하나를 검사.

## 7. 미확정 사항
- [미확정] `author`(작성자 이름)를 넣을지 — Google Article 권장 속성이지만 사이트에 작성자 표기가 없다. 넣지 않아도 구조는 같다(나중에 `conceptJsonLd`에 한 줄). 이번에는 넣지 않는다.

## 8. 작업 순서

### 1. seo.ts 생성 함수, 단위 테스트, reviewedAt 형식 검사
- 대상: `app/lib/seo.ts`, `app/lib/seo.test.ts`, `tests/content-integrity.test.ts`
- 변경: 3·4절대로 함수 추가(`buildMeta` 불변). content-integrity에 개념마다 `reviewedAt === null || (/^\d{4}-\d{2}-\d{2}$/ 그리고 실제 날짜: `new Date(v + 'T00:00:00Z')`가 유효하고 `toISOString().slice(0, 10) === v`)` 검사.
- 완료 조건: `npm test -- app/lib/seo.test.ts tests/content-integrity.test.ts` 통과. 단위 테스트 항목: `conceptJsonLd` 필드 값, `reviewedAt: null`이면 `'dateModified' in result`가 false, `siteJsonLd` 필드, `buildConceptMeta(concept)`가 `buildMeta({...})`의 모든 항목을 포함하고 `script:ld+json` 디스크립터가 정확히 1개, `buildMeta` 출력에는 `script:ld+json`이 없음. `npm run typecheck` 0.

### 2. 라우트 연결과 템플릿
- 대상: `app/routes/home.tsx`, `app/concepts/*/route.tsx` 6개, `docs/content-guide.md` 6단계 템플릿
- 변경: 4절대로.
- 완료 조건: `npm run build` 성공. `build/client`에서 개념 HTML 6개와 홈 HTML에 `application/ld+json`이 1개씩, 소개·404에는 0개(`grep -c`). 기존 `test:build` 통과.

### 3. postbuild lastmod
- 대상: `scripts/postbuild.mjs`
- 변경: 3절 규칙. JSON-LD 추출은 `/<script type="application\/ld\+json">([\s\S]*?)<\/script>/` 후 `JSON.parse`(엔티티 디코딩 불필요). 오류 메시지에 파일 경로 포함.
- 완료 조건: `npm run build` 후 `sitemap.xml`의 개념 URL 6개에 `<lastmod>`가 각 `reviewedAt`과 같고, 홈·소개에는 없다.

### 4. 빌드 테스트, 문서, 음성 확인, 전체 검증
- 대상: `tests/build/build-output.test.ts`, `docs/content-guide.md`(2·7·10단계)
- 변경: 6절 "빌드 산출물" 항목을 빌드 테스트로 추가(개념은 `listConcepts()`로 it.each, 기대값은 meta에서 계산). content-guide 문구.
- 음성 확인(각각 실패를 확인한 뒤 되돌린다):
  ① 개념 route 하나를 `buildMeta`로 되돌리고 `npm run build` → postbuild가 그 파일 경로를 담은 오류로 실패.
  ② 개념 하나의 `reviewedAt`을 `null`로 바꾸고 `npm run test:build` → 빌드 성공, 빌드 테스트 통과(그 URL은 lastmod·dateModified 없음이 기대값), 그 개념 HTML에 `dateModified` 없음과 sitemap에 그 URL의 `<lastmod>` 없음을 `grep`으로 확인.
  ③ 개념 하나의 `reviewedAt`을 `'2026-13-40'`으로 바꾸고 `npm test -- tests/content-integrity.test.ts` → 실패.
  ④ 정상 빌드 후 `build/client/sitemap.xml`의 lastmod 하나를 손으로 바꾸고 `npx vitest run --config vitest.build.config.ts` → lastmod 검사 실패.
- 완료 조건: 음성 확인 ①~④ 결과 기록, 되돌린 뒤 AGENTS 검증 순서 전체 통과(e2e 콘솔 에러 0 포함).

## 9. 추가 개선 후보
- `author`·`datePublished`(출처 데이터를 정한 뒤), 화면에 breadcrumb UI를 만든다면 `BreadcrumbList`.
- 홈 `lastmod`를 개념 `reviewedAt`의 최댓값으로.
- 개념별 OG 이미지(SEO 4번, Google Article 권장 이미지 비율 포함 검토).
- sitemap을 프리렌더 리소스 라우트로 옮겨 `listConcepts()`를 직접 쓰는 구조(loader 금지 규칙 재검토 필요).

## 변경 이력
- 2026-10-27 (계획 검토 Architect·Critic 반영): `reviewedAt: null` 경로의 postbuild 규칙(lastmod만 생략)과 검증 추가(Critic HIGH), 음성 확인을 실제 실패를 보는 4가지로 교체, `reviewedAt` 형식 검사를 content-integrity로 확정, `buildMeta` 시그니처 유지(새 함수가 디스크립터를 덧붙임), JSON-LD 타입을 프레임워크 타입에서 추출, `BreadcrumbList` 제외(화면에 breadcrumb 없음), 요약 범위·사실 위치 정정

## 구현 진행

- baseline (2026-10-27, `fb3d578`): lint·format:check·typecheck 오류 0, `npm test` 639, `test:build` 40(같은 코드에서 커밋 직전 실행). e2e 103 통과·3 건너뜀은 `48bea4a`(이후 `reviewedAt` 값만 변경)에서 실행
- [x] 1. seo.ts 생성 함수, 단위 테스트, reviewedAt 형식 검사 — 메인 재실행: `npm test` 650 통과(baseline 639 + 새 단위·무결성 테스트), lint·typecheck 0. diff 확인: `buildMeta` 불변, `ConceptMeta`는 type import, `reviewedAt` null이면 `dateModified` 키 없음, `LdJson`은 프레임워크 타입에서 추출
- [x] 2. 라우트 연결과 템플릿 — 개념 route 6개는 `meta()`와 import 한 줄씩만 변경, 홈은 `buildMeta` 결과에 디스크립터 덧붙임, content-guide 6단계 템플릿 동일 형태. 메인 빌드: `application/ld+json` 개수 홈 1·소개 0·404 0·개념 6개 각 1. `short-circuit-evaluation` JSON-LD에서 `&&`가 `&&`으로 이스케이프된 것 확인. 기존 `test:build` 40 통과
- [x] 3. postbuild lastmod — 메인 빌드: `sitemap.xml(8개 URL, lastmod 6개)`, 개념 6개 lastmod = 각 reviewedAt(2026-10-21/26/27), 홈·소개 lastmod 없음. 계획 외: JSON.parse 오류에 `{ cause: e }`(ESLint `preserve-caught-error` 규칙) — 수용
- [x] 4. 빌드 테스트, 문서, 음성 확인, 전체 검증 — 빌드 테스트는 추가만(구조화 데이터 describe, sitemap lastmod 케이스), content-guide 2·7·10단계 문구. 메인 음성 확인: ① `number-type` route를 `buildMeta`로 되돌리고 build → postbuild가 "개념 페이지에 JSON-LD(application/ld+json)가 없습니다: …/number-type/index.html"로 exit 1 ② `equality-operators` `reviewedAt: null` → `test:build` 56 통과, postbuild "lastmod 5개", 그 HTML `dateModified` 0건, sitemap 그 URL `<lastmod>` 없음 ③ `reviewedAt: '2026-13-40'` → content-integrity 1 failed ④ 정상 빌드 후 sitemap `number-type` lastmod를 2026-01-01로 변조 → 빌드 테스트 "number-type의 lastmod는 reviewedAt과 같다" 1 failed. 모두 되돌린 뒤(route `cmp` 확인) 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 650, `test:build` 56, e2e 103 통과·3 건너뜀(기존 3건, 콘솔 에러·하이드레이션 경고 없음 → 2절 추정 확인)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff 13파일, 공통 SEO·후처리지만 단계마다 diff와 산출물을 확인했고 음성 확인 4건으로 실패 경로를 실행): Critical/High 0. Low 1(보고만): 빌드 테스트 `urlElement`가 URL을 정규식 이스케이프 없이 넣어 `.`이 임의 문자와 맞음 — `<url><loc>…</loc>` 전체를 고정 문자열로 감싸서 오매칭 가능성은 사실상 없음
- 브라우저 확인(사용자 요청, dev 서버 localhost:5173 + Playwright): 36/36 통과 — 홈 JSON-LD WebSite 1개(head), 홈 → 개념 클라이언트 이동 시 TechArticle 1개로 교체·뒤로 가기 시 WebSite로 복귀, 개념 6개 직접 진입 시 TechArticle 1개(head)·url = canonical·headline = h1·dateModified = reviewedAt, "검토 중" 배지 0, 퀴즈 정답 확인·시뮬레이터 다음 단계 동작, 375px 다크 3개 페이지 가로 넘침 0, 콘솔 에러·하이드레이션 경고 0

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 계획 외: postbuild의 JSON.parse 오류에 `{ cause: e }`(ESLint `preserve-caught-error`). 사용자 요청으로 dev 서버 브라우저 확인(36/36)을 추가로 했다.

### 코드 리뷰
- Critical/High 0. Low 1건(빌드 테스트 `urlElement`의 URL 정규식 미이스케이프)은 오매칭 가능성이 사실상 없어 보고만 했다.

### 후속 작업
- [ ] 배포 후 Google 리치 결과 테스트로 개념 URL 1개 확인(사용자 확인 항목)
- [ ] `author` 추가 여부(7절 미확정, 표시할 이름 필요)
- [ ] 검색 엔진 등록(SEO 1번, 사용자 보류)
- [ ] 페이지 이동 시 JSON-LD 교체를 e2e에 정식 테스트로 둘지(이번에는 임시 스크립트로만 확인)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] Critic 지적을 받아 `reviewedAt: null`인 새 개념에서는 postbuild가 `lastmod`만 생략하고, JSON-LD 자체가 없을 때만 빌드를 실패시키도록 규칙을 정했다 — 새 개념은 반드시 `null`로 시작하므로(content-guide 2단계) 이 경로가 깨지면 다음 개념 추가 때 빌드가 막힌다. 음성 확인 ②로 실제 실행했다.
- [Claude 판단] `BreadcrumbList`를 넣지 않았다 — 개념 페이지에 화면에 보이는 breadcrumb UI가 없어, 보이지 않는 내용을 마크업하지 않기 위해서다.
- [Claude 판단] `buildMeta` 시그니처를 바꾸지 않고 새 함수가 `script:ld+json` 디스크립터를 덧붙이게 했다(Architect 제안) — 소개·404 호출부를 건드리지 않아 공통 함수 변경이 가장 작다.
- [무검토 승인] JSON-LD 출력을 React Router 메타 디스크립터(`script:ld+json`)로 했다 — `<head>` 출력, 프레임워크 이스케이프, 메타 태그와 같은 하이드레이션 경로. body에 직접 렌더링하는 대안은 이스케이프를 직접 해야 한다.
- [무검토 승인] sitemap `lastmod`를 TS 메타가 아니라 프리렌더 HTML의 JSON-LD `dateModified`에서 읽었다 — HTML과 sitemap 값이 구조적으로 같고, 템플릿을 복사하지 않은 개념은 빌드 실패로 드러난다.
- [무검토 승인] `reviewedAt`을 수정일 출처로 쓰고 "본문을 고치면 재검토 후 갱신" 규칙을 문서화했다.

#### 배경지식
- React Router `<Meta />`는 leaf 라우트의 `meta()`만 출력한다. 그래서 페이지 이동 시 JSON-LD가 교체되고 중복되지 않는다(브라우저 확인으로 확인).
- React Router `escapeHtml`은 `& < >`를 HTML 엔티티가 아니라 JSON 유니코드 이스케이프(`&` 등)로 바꾼다. 이 문자들은 JSON 문자열 안에만 있으므로 결과를 그대로 `JSON.parse`할 수 있다.
- sitemap `lastmod`는 선택 항목이며, 검색 엔진은 값이 일관되게 정확할 때 참고한다.

#### 확인 질문
1. postbuild가 `dateModified`가 없을 때는 넘어가고 JSON-LD가 없을 때는 빌드를 실패시키는 이유는?
   <details><summary>답</summary>`dateModified`가 없는 것은 `reviewedAt: null`인 새 개념의 정상 상태라 lastmod만 생략한다. JSON-LD가 없는 것은 route 템플릿을 복사하지 않은 실수이므로 빌드 실패로 드러낸다(3절, 음성 확인 ①②).</details>
2. sitemap `lastmod`를 `meta.ts`에서 직접 읽지 않고 HTML의 JSON-LD에서 읽은 이유는?
   <details><summary>답</summary>postbuild는 Node 스크립트라 TS·경로 별칭을 읽으려면 추가 처리가 필요하다. HTML에서 읽으면 페이지의 `dateModified`와 sitemap `lastmod`가 같은 값임이 구조적으로 보장된다(3절).</details>
3. 홈에서 개념 페이지로 클라이언트 이동했을 때 JSON-LD가 두 개가 되지 않는 이유는?
   <details><summary>답</summary>React Router `<Meta />`가 leaf 라우트의 meta만 렌더링하므로, 이동하면 홈의 WebSite 디스크립터가 개념의 TechArticle 디스크립터로 교체된다(2절 사실, 브라우저 확인).</details>
4. `reviewedAt`을 수정일로 쓸 때 생기는 위험과 그 대응은?
   <details><summary>답</summary>본문을 고쳐도 `reviewedAt`을 갱신하지 않으면 lastmod가 실제 수정일보다 오래된다. content-guide 10단계에 "본문을 고치면 다시 검토받고 `reviewedAt` 갱신" 규칙을 넣었다. 기계적 보장은 없다.</details>
