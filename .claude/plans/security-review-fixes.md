# 전체 코드·보안 리뷰 지적 수정 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `f2f6109`

## 0. 요약

- 목적: 2026-10-27 전체 리뷰의 Medium 1건·Low 5건을 최소 변경으로 수정한다
- 범위: 예제 실행 하네스, dev 의존성 override, `vercel.json` 헤더, `.gitignore`, `Anchor` 내부 링크, `.claude/` 정리 / 콘텐츠·시뮬레이터·공통 셸은 바꾸지 않는다
- 위험: `compression` override가 `serve`(로컬 서빙·e2e)를 깨뜨릴 수 있음 → e2e 전체로 확인
- 복잡도: 낮음 · Consensus: 생략 (서로 독립적인 작은 변경 6건, 각각 기존 패턴 그대로, 단계별로 검증 가능)
- 미확정: 1건 (보안 헤더는 Preview/Production 배포 후에만 실제 확인 가능)

## 1. 요구사항

- 요구사항 (사용자: "Medium, Low 다 수정 해줘")
  - M1 예제 실행이 비동기(microtask) 출력까지 수집해, 출력이 빠진 `expectedOutput`이 통과하지 않게 한다
  - L1 `npm audit`의 `compression <1.8.2`(GHSA-vc2v-76pw-4v95) 2건을 해소한다
  - L2 배포 응답에 기본 보안 헤더(`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`)를 추가한다
  - L3 `.env.[mode].local` 계열이 커밋되지 않게 한다
  - L4 MDX 내부 링크(`/`로 시작)에도 `title` 등 나머지 props를 전달한다
  - L5 빈 `.claude/setting.json`을 정리하고, 계획 문서의 로컬 절대 경로를 지운다
- 유지할 기존 동작: 모든 예제의 기존 출력, 동기 예제의 2초 timeout, `/assets/*` immutable 캐시, `.env` 커밋(공개 설정), 외부·해시 링크 동작, 기존 테스트 474·27·79건
- 제외 범위: 완전한 CSP(인라인 스크립트 hash 관리), `serve` 교체, git 이력 재작성(이력에 남은 로컬 경로), 비동기 개념 콘텐츠

## 2. 사실과 추정

### 사실 (코드에서 확인)

- `runExample`은 `runInNewContext(code, sandbox, { timeout })`만 호출한다 — `tests/helpers/run-example.ts:14`. 사용처는 `tests/examples.test.ts:14`, `app/concepts/short-circuit-evaluation/concept.test.ts:263`, `app/concepts/type-coercion/concept.test.ts:201`(동기 probe)
- 재현: `Promise.resolve().then(() => console.log('late')); console.log('sync')`는 반환 시점에 `["sync"]`. `microtaskMode: 'afterEvaluate'`를 주면 `["sync","late"]`, 무한 microtask 루프는 `ERR_SCRIPT_EXECUTION_TIMEOUT`(Node 24.22.1에서 직접 실행해 확인)
- 현재 예제(`app/concepts/*/examples/`) 중 Promise/async/timer를 쓰는 파일은 없다(grep)
- `runExample` 단위 테스트는 없다. `tests/*.test.ts`는 vitest node 프로젝트에 포함된다 — `vitest.config.ts:17`
- `serve@14.2.6`이 npm 최신이고, 그 dependencies가 `compression: 1.8.1`로 고정되어 있다(`npm view`). `compression@1.8.2`가 최신. `npm ls compression` → `serve@14.2.6 └── compression@1.8.1`이 유일한 사용처
- `serve`는 `npm start`(`package.json:12`)와 e2e webServer(`playwright.config.ts:31`)에서만 쓰인다. 프로덕션 의존성 audit은 0건
- `vercel.json`의 headers는 `/assets/(.*)` Cache-Control 하나뿐이다 — `vercel.json:7-12`. 배포 응답(curl)에는 Vercel 기본 HSTS만 있다. 로컬 `serve`는 `vercel.json`을 읽지 않는다(`serve.json`만 사용)
- `.gitignore:4`는 `.env.local`만 제외한다
- `Anchor`의 `href.startsWith('/')` 분기는 `<Link to className>`만 넘기고 `props`를 버린다 — `app/components/concept/MdxElements.tsx:40-45`. 다른 두 분기는 `{...props}`를 전달한다(`:49`, `:56`). `MdxElements` 테스트는 없고, `Link` 렌더 테스트는 `MemoryRouter`로 감싼다 — `app/components/concept/PrerequisiteList.test.tsx:9`
- `.claude/setting.json`은 빈 파일이고 `6ff9823`(골격 커밋)에서 추가되었으며, 저장소 어디에서도 참조하지 않는다(grep)
- 로컬 절대 경로는 `.claude/plans/js-under-the-hood-initial-design.md:5` 한 곳이다(grep `/Users/`)
- 저장소는 공개 상태다(GitHub API 200)

### 추정

- `ComponentProps<'a'>`를 `Link`에 spread해도 타입이 맞는다 — React Router `LinkProps`가 anchor 속성을 확장하므로. 작업 순서 4에서 typecheck로 확인
- `compression@1.8.2`는 1.8.1과의 patch 차이라 `serve` 동작에 영향이 없다 — 작업 순서 2에서 e2e로 확인

## 3. 구현 전략

- M1: 옵션 한 줄(`microtaskMode: 'afterEvaluate'`)을 추가한다. microtask가 컨텍스트 전용 큐에서 평가 직후 같은 timeout 안에 실행되므로 수집·무한 루프 차단이 모두 된다. 비동기를 쓰는 예제를 금지하는 테스트 규칙은 개념 범위를 미리 정하는 일이라 버렸다
- L1: `package.json`에 `serve` 범위로 한정한 `overrides`(`"serve": { "compression": "1.8.2" }`)를 둔다. 버전은 정확히 고정한다(AGENTS.md 규칙). 버린 대안: `npm audit fix --force`(serve 10.0.2로 내리는 breaking 변경), `serve` 교체(`serve.json` trailingSlash 동작을 다시 맞춰야 함), 대기(요청은 수정)
- L2: 모든 경로(`/(.*)`)에 헤더 규칙 1개를 추가한다. `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`를 넣는다. iframe에 넣어 쓰는 곳이 없으므로 DENY로 한다. CSP는 `frame-ancestors`만 쓸 수도 있지만 `X-Frame-Options`와 중복이라 넣지 않는다. 완전한 CSP는 제외 범위다
- L3: `.env.local` 줄을 `.env*.local`로 바꾼다(기존 `.env.local`도 포함)
- L4: 내부 링크 분기에 `{...props}`를 다른 분기와 같은 위치(앞)로 넣는다. `to`와 `className`이 뒤에 오므로 덮어쓰이지 않는다
- L5: 빈 파일을 삭제한다. 계획 문서의 경로는 `~/Documents/programming/js-basic`으로 바꾼다(기록의 의미는 유지). git 이력에는 남는다 — 민감 정보가 아니므로 이력 재작성은 하지 않는다

## 4. 변경 파일

- 수정 `tests/helpers/run-example.ts` — M1
- 추가 `tests/run-example.test.ts` — M1 회귀 테스트
- 수정 `package.json`, `package-lock.json` — L1 override (`npm install`이 lockfile 갱신)
- 수정 `vercel.json` — L2
- 수정 `.gitignore` — L3
- 수정 `app/components/concept/MdxElements.tsx` — L4
- 추가 `app/components/concept/MdxElements.test.tsx` — L4 회귀 테스트
- 삭제 `.claude/setting.json` — L5
- 수정 `.claude/plans/js-under-the-hood-initial-design.md:5` — L5
- 변경하지 않음: 예제·시나리오·`SimulatorShell`·`serve.json`·`playwright.config.ts`
- 문서(`AGENTS.md` 배포 절의 `vercel.json` 설명, 예제 규칙, `README.md` 배포 절)는 `finalize-work`의 문서 최신화에서 맞춘다

## 5. 위험 요소

- `microtaskMode` 변경 → 기존 동기 예제·probe 출력이 바뀔 수 있음 → `npm test` 전체 통과로 확인(작업 순서 1)
- override가 무시되거나 lockfile에 반영되지 않음 → `npm ls compression`이 1.8.2, `npm audit` 0건으로 확인(작업 순서 2)
- override 후 `serve` 오동작(압축·trailingSlash) → e2e 79건, 특히 `navigation.spec.ts`의 404 상태와 리다이렉트(작업 순서 2, 6)
- 헤더 문법 오류로 배포 실패, 또는 `DENY`가 필요한 임베드를 막음 → 로컬 검증 불가. JSON 유효성은 `format:check`, 실제 응답은 배포 후 curl(미확정 1)
- `.env*.local` 패턴이 `.env`를 무시하게 됨 → `git check-ignore`로 확인(작업 순서 3)
- `Anchor`에 props를 spread해 `href`가 `Link`로 넘어감 → `href`는 구조 분해로 빠지므로 넘어가지 않음. 테스트로 `href` 값을 확인(작업 순서 4)

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e` 전체 통과
- 보안: `npm audit` 0건, `npm ls compression` → 1.8.2
- 배포 후(사용자 push 이후): `curl -sI <Preview URL>/`과 `/assets/<파일>`에서 세 헤더가 있고 `/assets/*`의 `immutable`이 유지되는지 확인
- 브라우저: 화면 변경이 없으므로 e2e로 대신한다

## 7. 미확정 사항

- [미확정] 보안 헤더의 실제 적용은 Vercel 배포 후에만 확인할 수 있다. 커밋·push는 사용자 요청 시에만 하므로 구현 단계에서는 JSON 유효성까지만 검증하고, 배포 후 확인 명령을 보고한다

## 8. 작업 순서

### 1. 예제 실행 하네스의 microtask 수집 (M1)

- 대상: `tests/helpers/run-example.ts`, `tests/run-example.test.ts`(신규)
- 현재: 동기 실행 직후 반환해 microtask 안의 `console.log`를 놓친다
- 변경: `runInNewContext` 옵션에 `microtaskMode: 'afterEvaluate'`를 추가하고, 주석에 이유를 한 줄 덧붙인다. 테스트 3건: (a) `Promise.then` 안의 출력이 동기 출력 뒤 순서로 수집된다(`["sync","late"]`), (b) 무한 microtask 루프는 짧은 `timeoutMs`에서 throw한다, (c) 동기 무한 루프도 throw한다(기존 동작 유지)
- 이유: 정확성 원칙("실행 결과는 실제 실행으로 대조")이 비동기 예제에서 조용히 깨지는 것을 막는다
- 주의사항: AGENTS.md의 "타이머·DOM 등 호스트 API 예제는 지원하지 않는다"는 그대로 유지한다(Promise는 언어 기능)
- 완료 조건: 변경 전 코드에서 (a)가 실패하고 변경 후 통과한다. `npm test`가 전체 통과한다(기존 474건 + 신규)

### 2. compression override (L1)

- 대상: `package.json`, `package-lock.json`
- 현재: `serve@14.2.6` → `compression@1.8.1`, `npm audit` high 2건
- 변경: `"overrides": { "serve": { "compression": "1.8.2" } }`를 추가하고 `npm install`로 lockfile을 갱신한다
- 이유: 최신 `serve`가 취약 버전을 고정하고 있어 override 외에는 비파괴적 방법이 없다
- 주의사항: `^`·`~`를 쓰지 않는다. `npm audit fix`를 쓰지 않는다. lockfile에서 `compression` 외 패키지가 바뀌지 않았는지 `git diff --stat package-lock.json`과 diff 내용으로 확인한다
- 완료 조건: `npm ls compression`이 `compression@1.8.2 overridden`을 표시하고, `npm audit`이 `found 0 vulnerabilities`를 표시한다. lockfile diff가 `compression` 항목에 한정된다

### 3. .gitignore 패턴 (L3)

- 대상: `.gitignore`
- 변경: `.env.local` → `.env*.local`
- 완료 조건: `git check-ignore -v .env.local .env.production.local .env.development.local`이 셋 다 매칭되고, `git check-ignore .env`는 매칭되지 않는다(exit 1)

### 4. Anchor 내부 링크 props 전달 (L4)

- 대상: `app/components/concept/MdxElements.tsx:42`, `app/components/concept/MdxElements.test.tsx`(신규)
- 현재: 내부 링크는 `title` 등을 버린다
- 변경: `<Link {...props} to={href} className={cls}>`. 테스트(`MemoryRouter`로 감싼다): 내부 링크가 `href="/concepts/x"`와 `title`을 갖는다. 외부 링크는 `target="_blank"`와 `rel="noopener noreferrer"`를 유지한다
- 완료 조건: 변경 전 `title` 검사가 실패하고 변경 후 통과한다. `npm run typecheck`가 통과한다

### 5. 보안 헤더 (L2)

- 대상: `vercel.json`
- 변경: `headers` 배열에 `{ "source": "/(.*)", "headers": [X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, X-Frame-Options: DENY] }`를 추가한다. 기존 `/assets/(.*)` 규칙은 그대로 둔다
- 완료 조건: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` 성공, `npm run format:check` 통과, 기존 assets 규칙이 diff에서 바뀌지 않는다

### 6. .claude 정리 (L5)와 전체 검증

- 대상: `.claude/setting.json`(삭제), `.claude/plans/js-under-the-hood-initial-design.md:5`
- 변경: 빈 파일 `git rm`, 경로를 `~/Documents/programming/js-basic`으로 바꾼다
- 완료 조건: `grep -rnE "/Users/[A-Za-z]" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build --exclude-dir=test-results --exclude-dir=playwright-report .`이 0건이고, `git ls-files .claude`에 `setting.json`이 없다. 이어서 6절 검증 명령 전체와 `npm audit`이 통과한다

## 9. 추가 개선 후보

- `serve`가 `compression >=1.8.2`를 쓰는 버전을 내면 override를 제거한다
- 완전한 CSP(`script-src`에 React Router 인라인 스크립트 hash)는 필요해지면 별도 작업으로 한다

## 변경 이력

- 2026-10-27 (구현 중 발견): 6단계 완료 조건의 `grep "/Users/"`가 이 계획 문서에 적힌 검색 패턴 자체를 매칭해 0건이 될 수 없음 → 실제 경로만 잡는 `/Users/[A-Za-z]`로 바꾸고 e2e 산출물 폴더를 제외. 조건의 의도(로컬 절대 경로 0건)는 같다 — 영향 단계 6

## 구현 진행

- baseline (2026-10-27, `f2f6109`): lint ✓ / format:check ✓ / typecheck ✓ / test 474 통과 / test:build 27 통과 / e2e 79 통과·3 skip(의도된 skip) / `npm audit` high 2 (`compression` via `serve`)
- [x] 1. microtask 수집 — 변경 전 (a) 실패(`expected [ 'sync' ] to deeply equal [ 'sync', 'late' ]`). 변경 전 (b)는 실패가 아니라 vitest를 무한 대기시켰다(microtask가 호스트 루프에서 돌아 timeout 미적용) → 변경 후 (a)(b)(c) 통과, `tests/helpers/run-example.ts:15`
- [x] 2. compression override — `npm ls compression` → `1.8.2 overridden`, `npm audit` 0건. lockfile diff는 `compression`과 1.8.2가 새로 고정 의존하는 `destroy@1.2.0`(같은 하위 트리)뿐. `npm ci` 재설치 성공·lockfile 변화 없음
- [x] 3. .gitignore — `.env.local`·`.env.production.local`·`.env.development.local` 매칭, `.env`는 미매칭(exit 1)
- [x] 4. Anchor props — 변경 전 title 검사 실패(`Received: null`) → 통과, `app/components/concept/MdxElements.tsx:42`, typecheck 통과
- [x] 5. 보안 헤더 — JSON 파싱·Prettier 통과, `/assets/(.*)` 규칙 변경 없음. 실제 응답은 배포 후 확인(미확정 1)
- [x] 6. .claude 정리 — `/Users/[A-Za-z]` 0건, `setting.json` 삭제. 전체 검증: lint ✓ / format:check ✓ / typecheck ✓ / test 479 통과 / test:build 27 통과 / e2e 79 통과·3 skip / audit 0건
- 리뷰 1차: Critical/High 0 · 문서 미갱신(AGENTS.md·README.md의 `vercel.json` 설명) 1건은 계획대로 `finalize-work`에서 처리

## 구현 결과

### 계획 대비 실제 구현

- 6단계 모두 계획대로 구현했다. 달라진 점: 6단계 완료 조건의 검색 패턴을 `/Users/[A-Za-z]`로 바로잡았다(`변경 이력`). L1 lockfile 변경에 `compression@1.8.2`가 새로 고정 의존하는 `destroy@1.2.0`이 포함되었다(같은 하위 트리)
- 문서: `AGENTS.md`(예제 규칙에 microtask 수집, 의존성 규칙에 `compression` override와 제거 조건, 배포 절에 보안 헤더), `README.md`(배포 절에 보안 헤더)를 갱신했다. `docs/content-guide.md`는 실제 동작과 충돌하지 않아 바꾸지 않았다

### 코드 리뷰

- Critical/High 0건. 문서 미갱신 1건은 마무리 단계에서 반영했다

### 후속 작업

- [ ] push 후 배포 응답에서 보안 헤더 3종과 `/assets/*` `immutable` 유지 확인 (`curl -sI <URL>/`)
- [ ] `serve`가 `compression >=1.8.2`를 쓰는 버전을 내면 `overrides`를 제거한다

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 6단계 완료 조건 수정 — `grep "/Users/"`가 계획 문서 안의 검색어 자체를 잡아 0건이 될 수 없었다. 조건을 지우는 대신 실제 경로만 잡는 `/Users/[A-Za-z]`로 바꾸고, 그 사실을 `변경 이력`에 남겼다
- [Claude 판단] 문서에 override 제거 조건을 적음 — `package.json`은 주석을 쓸 수 없어, override가 왜 있고 언제 지우는지를 `AGENTS.md` 의존성 규칙에 남겼다. 남기지 않으면 나중에 이유를 모르는 override가 된다
- [무검토 승인] `microtaskMode: 'afterEvaluate'` — 출력 비교 시점을 늦추는 방법(await 후 비교) 대신 vm 옵션을 골랐다. 이 옵션은 microtask를 컨텍스트 전용 큐에서 같은 timeout 안에 실행하므로 무한 microtask 루프도 끊는다. 변경 전에는 그런 루프가 vitest를 멈춰 세웠다
- [무검토 승인] `serve` 범위 `overrides`로 `compression`을 1.8.2에 고정 — `serve@14.2.6`이 최신이면서 1.8.1을 정확히 고정해 업그레이드로는 해결되지 않는다. `npm audit fix --force`는 serve 10.0.2로 내리는 breaking 변경이라 버렸다
- [무검토 승인] 보안 헤더 3종만 추가, 완전한 CSP 제외 — 사용자 입력·인증·쿠키가 없는 정적 사이트라 실제 위험이 낮다. React Router 프리렌더가 넣는 인라인 스크립트 때문에 CSP는 hash 관리가 필요해 비용 대비 효과가 낮다. iframe 차단은 `X-Frame-Options: DENY` 하나로 했다
- [무검토 승인] 로컬 경로는 문서에서만 지우고 git 이력은 재작성하지 않음 — 민감 정보가 아니고, 공개 저장소 이력을 다시 쓰는 비용과 위험(force push)이 더 크다
- 수정 범위(Medium·Low 전부) — 사용자가 직접 결정했다

#### 배경지식

- `node:vm`의 microtask: 기본값에서는 컨텍스트 안의 Promise 콜백이 호스트(Node) microtask 큐에서 실행된다. 그래서 `runInNewContext`가 반환한 뒤에 돌고 `timeout`도 적용되지 않는다. `afterEvaluate`는 컨텍스트 전용 큐를 두고, 평가 직후 timeout 안에서 큐를 비운다
- `node:vm`은 보안 경계가 아니다. 바깥 realm의 함수(`console.log`)에서 `constructor`를 따라가면 호스트 `Function`에 닿는다
- npm `overrides`: 의존성 트리 깊은 곳의 버전을 강제한다. `{ "serve": { "compression": "1.8.2" } }`처럼 부모로 범위를 좁힐 수 있다. lockfile에 반영되므로 `npm ci`(Vercel 설치 명령)에서도 그대로 쓰인다
- `X-Content-Type-Options: nosniff`는 브라우저의 MIME 추측을 막는다. `X-Frame-Options: DENY`는 다른 사이트가 이 페이지를 iframe에 넣지 못하게 한다(클릭재킹 방지)
- Vite는 `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`을 읽고, `VITE_`로 시작하는 값은 클라이언트 번들에 그대로 들어간다

#### 확인 질문

1. 예제 출력이 실행 결과와 다른데도 테스트가 통과할 수 있었던 이유는 무엇이고, 왜 비교 전에 `await`를 넣는 대신 `microtaskMode`를 골랐나?
   <details><summary>답</summary>기본 모드에서는 Promise 콜백이 `runInNewContext` 반환 뒤 호스트 큐에서 실행되어, 비교 시점의 `out`에 출력이 없었다. `await`로 기다리면 수집은 되지만 timeout이 microtask에 적용되지 않아 무한 루프가 테스트를 멈춘다. `afterEvaluate`는 수집과 timeout을 둘 다 해결한다(`tests/helpers/run-example.ts:15`, `tests/run-example.test.ts`)</details>
2. `serve`를 최신으로 올리는 방법은 왜 통하지 않았고, `overrides`를 영구히 두면 어떤 문제가 생기나?
   <details><summary>답</summary>최신 `serve@14.2.6`이 `compression@1.8.1`을 정확히 고정한다. override를 계속 두면 나중에 `serve`가 다른 `compression` 버전을 요구할 때 호환되지 않는 버전을 강제할 수 있다. 그래서 제거 조건을 `AGENTS.md` 의존성 규칙과 후속 작업에 남겼다</details>
3. 이 사이트에서 완전한 CSP가 아니라 헤더 3종만 넣은 근거는 무엇이고, 어떤 기능이 추가되면 이 판단을 다시 해야 하나?
   <details><summary>답</summary>사용자 입력 저장, 인증, 쿠키, 외부 스크립트가 없어 XSS로 잃을 것이 거의 없다. 반면 CSP는 React Router 인라인 스크립트 hash를 빌드마다 관리해야 한다. 댓글처럼 사용자 콘텐츠를 렌더하거나, 로그인·외부 스크립트(분석 도구 등)가 생기면 다시 판단한다(3절 구현 전략)</details>
4. `.gitignore`를 `.env*.local`로 바꿨을 때 커밋된 `.env`가 무시되지 않는 이유는? `VITE_` 변수에 비밀 값을 넣으면 왜 gitignore만으로는 막을 수 없나?
   <details><summary>답</summary>패턴이 `.local`로 끝나는 파일만 잡으므로 `.env`는 매칭되지 않는다(`git check-ignore .env` exit 1). `VITE_` 값은 빌드할 때 클라이언트 JS에 문자열로 들어가 배포 사이트에 공개된다. 파일이 커밋되지 않아도 마찬가지다</details>
