# 브라우저 예제 실행 인프라 구현 계획

- 상태: 완료
- 작성일: 2026-11-03
- 기준: `main` @ `65484bb`

## 0. 요약

- 목적: 38~42장 로드맵 0번. `runtime: 'browser'` 예제를 실제 Chromium(Playwright)에서 실행해 `expectedOutput`과 대조하는 실행기·검사를 `npm test`에 넣고, 카테고리 '브라우저'(`browser`)를 추가한다.
- 범위: 예제 타입·카테고리(`app/lib/concepts.ts`), 테스트 실행기·검사 함수·L1·무결성 테스트(`tests/`), 문서(`docs/content-guide.md`, `AGENTS.md`). 기존 `ecmascript` 예제·개념 35개·화면은 그대로(새 카테고리는 개념이 생기기 전까지 화면에 나오지 않음).
- 위험: 시간에 의존하는 예제가 틀린 출력을 정답으로 고정하거나 불안정해지는 것 → 등록 안 된 요청·페이지 이동·대기 뒤 출력 증가·규칙 밖 콘솔 사용을 모두 실패로 만들고, "정확한 ms가 아니라 순서만 주장" 규칙과 시간 상한을 둔다.
- 복잡도: 높음 · Consensus: 수행(Architect PASS, Critic REVISE → HIGH 2·MEDIUM 7 반영, 아래 변경 이력)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-03, `concept-roadmap-ch38-42.md`): 검증은 Playwright 실제 Chromium, 카테고리 `browser` 추가, 38~42장 개념 8개(async·defer, DOM 트리, HTMLCollection, 어트리뷰트/프로퍼티, 이벤트 전파·위임, 기본 동작·전파 막기, 타이머, 이벤트 루프)를 이 인프라로 검증한다.
- 인프라가 지원할 것
  - HTML 문서를 그대로 실행(공백 텍스트 노드·파서 순서가 결과에 영향).
  - 외부 스크립트와 도착 지연 재현(1번 async·defer).
  - `load` 이후 타이머 콜백 출력까지 수집(7·8번).
  - JS만 있는 예제(`.js`)를 최소 문서로 실행.
  - 사용자 입력은 **예제 코드 안의 `el.click()`·`dispatchEvent`로** 일으킨다. 실행기는 Playwright 입력(실제 클릭)을 쓰지 않는다 — 2026-11-03 실행 확인: `el.click()`으로 캡처(1)→타깃(2)→버블(3), `target`/`currentTarget`, 체크박스 `preventDefault` 뒤 `checked false`가 모두 재현되고 `isTrusted`는 `false`.
- 유지할 동작: 기존 `ecmascript` 예제 실행·비교(`runExample`), 시나리오 불변식, 무결성 검사, 빌드·e2e, 하이드레이션 규칙.
- 제외: 개념 페이지 작성(1~8번은 각자 계획), WebKit·Firefox 실행, 네트워크·서버 예제(43~44장), `type="module"` 전용 기능, **Node 호스트 예제**(실행기 sandbox는 `console.log`뿐 — `tests/helpers/run-example.ts:11-13`. 로드맵 7번의 "Node 타이머 id는 객체" 같은 Node 쪽 주장은 실행 검증할 수 없으므로 7번 계획에서 빼거나 문서 근거로만 다룰지 정한다).

## 2. 사실과 추정

### 사실 (코드)

- 예제 타입 `runtime: 'ecmascript'` 하나(`app/lib/concepts.ts:13-18`), 카테고리 union·라벨(`app/lib/concepts.ts:1,24-30`). 라벨 선언 순서 = 홈 그룹 순서, 빈 카테고리는 빠짐(`app/lib/concept-groups.ts:9-17`). 라벨 사용처는 그 외 `app/components/concept/ConceptLayout.tsx:26`뿐, 전체 키 목록 고정 테스트 없음(`concept-groups.test.ts:31-32`는 일부만).
- `examples` 소비처: `tests/examples.test.ts:8-15`(동기 `it.each`), `tests/content-integrity.test.ts:110-117`(id 중복·파일 존재), 개념별 `concept.test.ts`(`{ file, expectedOutput }`·`.expectedOutput`만), `tests/helpers/scenario-invariants.ts:5-9`(`expectedOutput`만), `app/simulator/types.ts:14-15`. 유니온으로 바꿔도 공통 필드라 깨지지 않음(Architect가 scratchpad tsc로 확인, `satisfies` 안 `runtime: 'ecmascript'` 리터럴 좁혀짐, ecmascript 예제에 `settleMs`를 넣으면 초과 프로퍼티 오류).
- Vitest: `tests/*.test.ts`는 node 프로젝트에 자동 포함(`vitest.config.ts:14-20`), timeout 설정 없음(기본 testTimeout 5s·hookTimeout 10s). `npm test` = `vitest run`(`package.json:16`). Vitest 5.0.5 안에서 `import { chromium } from '@playwright/test'` 실행 정상(Architect 확인). `@playwright/test` 1.64.1 직접 devDependency(`package.json:32`) — 새 의존성 없음. CI 워크플로 없음(`.github/workflows` 없음), Vercel은 build만.
- 코드 블록: `remark-code-import`(`vite.config.ts:31`) + `@shikijs/rehype`가 `langs` 미지정 시 bundled 언어 전체 로드(`node_modules/@shikijs/rehype/dist/index.mjs:6`) → ```` ```html file=… ```` 강조 가능. CodeView는 언어 무관 평문(`app/simulator/CodeView.tsx`). 예제 폴더 전체가 Prettier·ESLint 제외(`.prettierignore`, `eslint.config.js`).
- 문서 갱신 위치: `docs/content-guide.md:29-30`(category 행), `:35`(runtime), `:41`(`examples/<이름>.js`), `:44-45`(Node vm·호스트 API 금지), 폴더 트리 `examples/*.js`. `AGENTS.md:11`(근거는 ECMAScript 명세), `:45`(helpers 목록), 디렉터리 트리 `examples/*.js`, `:66`(`examples/*.js`에 두기), `:68`(Node vm·호스트 API 미지원), `:91`(`npm test` 설명), `:112`(chromium 설치가 e2e 절에만).

### 사실 (실행 — 2026-11-03 Playwright 1.64.1 Chromium, 메인·Architect·Critic)

- `msg.text()`는 `console.log(3,'a',true,undefined,null,NaN,-0,'')`를 `"3 a true undefined null NaN 0 "`로 낸다(Node `util.format`은 `-0`) → 콘솔 텍스트로는 Node 실행기와 같은 규칙을 지킬 수 없다. `addInitScript`로 감싼 `console.log`는 `-0`과 `setTimeout` 콜백 출력까지 수집.
- `page.route('http://example.test/**')`는 다른 호스트 요청(`https://example.com/x.png`)을 가로채지 않는다(실제 네트워크로 나감).
- 등록 안 된 `<script src="/missing.js">`를 abort해도 `pageerror`가 없고 문서가 계속 실행돼 출력 `["after"]` — 조용히 틀린 정답이 된다.
- 링크 `click()`으로 이동하면 이동 전 출력이 사라지고 `chrome-error://`로 간다.
- 지우지 않은 `setInterval`은 300ms 대기 후 잘린 `["t0","t1","t2"]`로 수집된다.
- load 뒤 예외와 처리 안 된 `Promise.reject`는 `pageerror`로 온다. load 전 `while(true)`는 goto timeout으로 잡히지만, load 뒤 타이머의 무한 루프는 `page.evaluate`를 멈춘다(evaluate에 timeout 없음).
- `http://example.test`는 secure context가 아니다(`isSecureContext false`). headless Chromium은 favicon을 요청하지 않는다(요청 목록 `["http://example.test/"]`). warm launch 약 100ms, 예제 1개(load+300ms) 약 315ms. 브라우저 타이머 id `typeof` `number`.

### 추정

- 브라우저 예제 30~40개(로드맵 8개 완료 시)면 순차 실행으로 `examples.test.ts`가 10초 이상 걸릴 수 있다 — 단계 3에서 측정하고, 길면 `it.concurrent`(예제마다 context 분리라 안전)를 9절 후보로.

## 3. 구현 전략

### 예제 타입과 카테고리

- `examples` 원소를 유니온으로:
  - `{ id, file, runtime: 'ecmascript', expectedOutput }` — 그대로.
  - `{ id, file, runtime: 'browser', expectedOutput, resources?: { path: string; file: string; delayMs?: number }[], settleMs?: number }`
- `ConceptCategory`에 `'browser'`, `CATEGORY_LABELS`에 `browser: '브라우저'`를 `objects` 다음(`async` 앞). 홈 그룹 순서: 언어 기초 → 실행 모델 → 객체와 프로토타입 → 브라우저 → 비동기 → 메모리.

### 실행기 `tests/helpers/run-browser-example.ts`

- 시그니처: `runBrowserExample(browser, { kind: 'html' | 'js', source, resources: { path, body, delayMs }[], settleMs }) => Promise<string[]>`. 상수: `ORIGIN = 'http://example.test'`, `JS_DOCUMENT`(아래), `QUIET_MS = 200`, `GOTO_TIMEOUT_MS = 5000`, `EVALUATE_TIMEOUT_MS = 2000`.
- 문서: `kind: 'html'`이면 `source`를 `/` 응답으로 그대로. `kind: 'js'`면 `/`는 고정 문서 `JS_DOCUMENT` = `<!doctype html>\n<html lang="ko">\n<head><meta charset="utf-8"></head>\n<body>\n<script src="/example.js"></script>\n</body>\n</html>\n`이고 `/example.js`가 `source`(인라인이 아니라 외부 스크립트라 소스의 `</script>`·`<!--`가 파서에 영향을 주지 않음).
- 요청: `context.route('**/*')`로 **모든 요청**을 가로챈다. `ORIGIN + '/'`와 등록된 `resources`(`/example.js` 포함)만 `fulfill`(`delayMs` 뒤, JS는 `text/javascript; charset=utf-8`, 문서는 `text/html; charset=utf-8`), 나머지는 `abort`하고 URL을 기록. 실행 뒤 **기록된 미등록 요청이 하나라도 있으면 reject**, 등록됐지만 **요청되지 않은 resource가 있어도 reject**.
- 출력 수집: `context.addInitScript`로 페이지 안에서 `console.log`를 감싼다. 수집 배열은 클로저에 두고 `Symbol.for('jsuth.logs')` 키의 **열거 불가** 프로퍼티로만 노출(예제의 `Object.keys(window)` 등을 오염시키지 않음). 포맷 규칙(Node `runExample`의 `util.format`과 허용 값에서 같은 결과): 문자열 그대로, 숫자 `Object.is(v, -0) ? '-0' : String(v)`, bigint `String(v) + 'n'`, undefined·null·불리언·심벌 `String(v)`, 객체·함수 `'[unsupported: object]'`, 첫 인수가 `/%[sdifjoOc%]/`를 포함한 문자열이면 줄 전체를 `'[unsupported: format]'`, 인수는 공백으로 잇는다. `console.info`·`warn`·`error`·`debug`는 `'[unsupported: console.<이름>]'`을 기록(규칙 위반이 비교 실패로 드러남). 원래 콘솔 메서드는 호출하지 않는다.
- 실패 조건(모두 reject, 메시지에 원인): `pageerror`(잡히지 않은 예외·처리 안 된 rejection), 첫 문서 뒤 **main frame 재이동**(`framenavigated`), 미등록 요청, 요청되지 않은 resource, **출력 불안정**(`settleMs` 뒤 거둔 출력과 `QUIET_MS` 더 기다린 뒤 거둔 출력이 다르면 — 끝나지 않는 interval이나 `settleMs`보다 늦는 출력), goto·evaluate 타임아웃.
- 흐름: `browser.newContext()` → init script·route·리스너 → `page.goto(ORIGIN + '/', { waitUntil: 'load', timeout: GOTO_TIMEOUT_MS })` → `waitForTimeout(settleMs)` → 수거 → `waitForTimeout(QUIET_MS)` → 재수거·비교 → 실패 조건 확인 → 출력 반환. `evaluate`는 `Promise.race`로 `EVALUATE_TIMEOUT_MS` 제한, `finally`에서 `context.close()`.

### 예제 명세 검사·로더 `tests/helpers/browser-example.ts` (순수 함수, 브라우저 예제가 0개여도 테스트됨)

- `checkExampleSpec(example, fs: { exists(file): boolean; read(file): string }): string[]` — 위반 메시지 목록.
  - `ecmascript`: `file`은 `.js`, `resources`·`settleMs` 없음(타입이 막지만 런타임으로도).
  - `browser`: `file`은 `.html`·`.js`, `.html`은 `<!doctype html>`로 시작(대소문자 무시), `resources[].file`은 `.js`이고 존재, `resources[].path`는 `/`로 시작하는 `.js` 경로이며 `/`·`/example.js`가 아니고 예제 안에서 중복 없음, `delayMs`는 0 이상 1000 이하 정수, `settleMs`는 0 이상 2000 이하 정수.
- `toRunnerInput(example, read): RunnerInput` — 파일을 읽어 실행기 인자로(`kind`는 확장자, `settleMs` 기본 300, `delayMs` 기본 0).

### 테스트

- `tests/run-browser-example.test.ts`(실행기 자체 테스트, `beforeAll`에서 launch·hookTimeout 30s, `afterAll` close, 각 `it` timeout 15s): ① `.html` 문서의 DOM 출력(줄바꿈 `<ul>`의 `childNodes` 3) ② `.js` 최소 문서 + `setTimeout` 콜백 출력 ③ `defer` 두 개(앞 것 지연 200ms)가 문서 순서대로 ④ `async` 두 개는 도착 순서대로(지연 200/10ms) ⑤ `-0`·`''`·`undefined`·bigint 포맷이 `runExample`과 같음 ⑥ 객체 인수·`%d` 서식·`console.warn`이 `[unsupported: …]` ⑦ 잡히지 않은 예외 reject ⑧ 다른 호스트 요청(`<img src="https://example.com/x.png">`)과 미등록 경로(`/missing.js`) reject ⑨ 요청되지 않은 resource reject ⑩ 링크 이동 reject ⑪ 끝나지 않는 `setInterval` reject ⑫ `Object.keys(window)`에 수집 배열이 나오지 않음.
- `tests/browser-example.test.ts`(순수 함수 단위): `checkExampleSpec` 정상 3(ecmascript·html·js+resources)과 위반 10개 이상(확장자, doctype, resource 없음, path 형식·중복·예약 경로, delayMs·settleMs 범위, ecmascript에 resources) — 각 위반이 해당 메시지를 낸다. `toRunnerInput`의 기본값·kind 판정.
- `tests/content-integrity.test.ts`: 예제 검사를 `checkExampleSpec(example, 실제 fs)` 결과가 빈 배열인지로 바꾼다(기존 id 중복·파일 존재 검사 유지).
- `tests/examples.test.ts`: 런타임 분기. `ecmascript`는 지금 그대로(동기). `browser` 예제가 하나라도 있으면 `beforeAll`(timeout 30s)에서 launch하고 `afterAll`에서 close, 해당 `it`은 async·timeout 15s로 `runBrowserExample(browser, toRunnerInput(...))`. launch 실패 시 "`npx playwright install chromium`을 실행하세요"를 붙여 다시 throw(실행기 자체 테스트도 같은 헬퍼 사용).

### 문서

- content-guide: 폴더 트리·예제 절(`examples/<이름>.js` → `.js`·`.html`), meta 표의 `category`(브라우저 추가)·`runtime`(두 런타임과 `resources`·`settleMs`), 예제 절에 "브라우저 예제" 소절 — 언제 쓰는지(DOM·이벤트·타이머 등 호스트 API), `.html`은 `<!doctype html>`부터 쓴 문서 그대로·`.js`는 최소 문서(`JS_DOCUMENT` 모양 그대로 적음)에 `<script src>`로, 입력은 `el.click()`·`dispatchEvent`(`isTrusted` false — 필요하면 simplifications), `resources`·`delayMs`(숨은 조건이므로 결과가 지연에 의존하면 본문이나 simplifications에 밝히고, 지연 차이로 강제되지 않는 순서는 주장하지 않는다 — 예: 지연 0인 async와 `DOMContentLoaded`의 선후), `settleMs`와 출력 안정 검사(정확한 ms를 주장하지 않고 순서만, 모든 출력이 `settleMs` 안에 끝나야 함), 출력 규칙(`console.log`만, 원시 값·불리언·`JSON.stringify`, 첫 인수에 `%` 서식 지정자 금지), 실패 조건 목록, Chromium 결과이므로 브라우저마다 다를 수 있는 부분은 simplifications, secure context 아님, 코드 블록 언어 `html`, 근거는 WHATWG HTML·DOM 표준과 MDN.
- AGENTS.md: 정확성 원칙에 "브라우저(호스트) 동작의 근거는 WHATWG HTML·DOM 표준"을 덧붙임(:11), 디렉터리 구조의 helpers 목록(:45)과 `examples/*.js`(→ `*.js`·`*.html`), 예제 규칙(:66 파일 두기, :68 실행 환경 — `ecmascript`는 Node vm 그대로, `browser`는 Chromium·세부는 content-guide), `npm test` 설명(:91 브라우저 예제 포함·Chromium 필요), `npx playwright install chromium`(:112)이 `npm test`에도 필요.

### 버린 대안

- 콘솔 메시지 텍스트 수집: `-0` 등 Node 실행기와 결과가 다르다.
- `page.route('http://example.test/**')`만 가로채기: 다른 호스트 요청이 실제 네트워크로 나간다.
- 미등록 요청을 조용히 abort: 빠진 스크립트가 반영된 틀린 출력이 정답이 된다.
- 타이머를 감싸 대기 중 타이머 수 세기: 예제 실행 환경을 더 많이 바꾼다. 출력 안정 검사로 끝나지 않는 타이머를 잡는다.
- Playwright Clock API로 시간 고정: 로드맵 7번의 `Date.now()` 바쁜 대기(블로킹) 예제가 멈출 수 있다.
- 별도 `npm run test:browser`: "npm test가 예제를 실제로 실행해 대조"(AGENTS.md:11)가 깨진다. `npm test`가 Chromium을 요구하게 되지만 이미 e2e 전제다.
- 실행기에 실제 입력(Playwright click) 기능: 예제 코드의 `el.click()`으로 충분하다(실행 확인).
- `.js`를 인라인 `<script>`로: 소스의 `</script>`·`<!--`가 파서에 영향을 준다.
- jsdom: 사용자 결정.

## 4. 변경 파일

- 수정: `app/lib/concepts.ts`(예제 유니온·카테고리), `tests/examples.test.ts`, `tests/content-integrity.test.ts`, `docs/content-guide.md`, `AGENTS.md`
- 추가: `tests/helpers/run-browser-example.ts`, `tests/helpers/browser-example.ts`, `tests/run-browser-example.test.ts`, `tests/browser-example.test.ts`
- 변경하지 않음: 개념 폴더 35개, `tests/helpers/run-example.ts`, 화면 컴포넌트, `vitest.config.ts`·`playwright.config.ts`·`package.json`(의존성·스크립트)

## 5. 위험 요소

- 런타임 간 출력 차이 → 페이지 안 포맷터, 자체 테스트 ⑤가 `runExample`과 직접 대조.
- 틀린 출력이 정답으로 고정 → 미등록 요청·요청 안 된 resource·이동·출력 불안정·규칙 밖 콘솔을 실패로(자체 테스트 ⑥⑧⑨⑩⑪).
- 병렬 부하에서의 시간 불안정 → 순서만 주장하는 규칙, `delayMs` 차이는 넉넉히(자체 테스트는 200/10ms), 출력 안정 검사, 검증 때 **전체 `npm test`를 3회 연속** 실행(파일 단독 반복만으로는 부하를 재현하지 못함).
- 무한 루프·멈춤 → goto·evaluate 타임아웃, `finally` context 닫기, `it` timeout 15s.
- `npm test`가 Chromium 없이 실패 → 실패 메시지에 설치 명령, AGENTS.md 안내 이동.
- 기존 예제 회귀 → `ecmascript` 경로 무변경, 무결성 검사로 바꿔도 기존 35개 개념이 위반 0(단계 3 완료 조건).
- 유니온 변경의 타입 오류 → `npm run typecheck`.

## 6. 검증 방법

- `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`(공통 코드 변경이라 e2e 전체).
- `npx vitest run tests/run-browser-example.test.ts` 10회 연속 통과 + `npm test` 전체 3회 연속 통과. 단계 3에서 `npm test` 소요 시간을 변경 전과 비교해 기록.
- 화면: dev 서버 홈에서 카테고리 그룹이 변경 전과 같음(브라우저 그룹 없음 — 개념 0개).
- 음성 확인: 자체 테스트의 기대값 하나를 바꾸면 실패, `checkExampleSpec` 위반 케이스 하나를 정상 값으로 바꾸면 실패.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 실행기와 자체 테스트

- 대상: `tests/helpers/run-browser-example.ts`, `tests/run-browser-example.test.ts`
- 변경: 3절 "실행기"와 자체 테스트 ①~⑫.
- 주의사항: `context.route('**/*')`(page 단위 아님), 수집 배열은 열거 불가 심벌 키, 원래 콘솔 미호출, `finally` close. launch 실패 메시지 헬퍼는 이 파일에서 export해 단계 3에서도 쓴다.
- 완료 조건: 자체 테스트 12개 통과, 10회 연속 통과, 음성 확인(기대값 하나 변경 시 실패) 후 원복, lint·typecheck 통과.

### 2. 예제 명세 검사·로더와 단위 테스트

- 대상: `tests/helpers/browser-example.ts`, `tests/browser-example.test.ts`
- 변경: 3절 `checkExampleSpec`·`toRunnerInput`과 단위 테스트(정상 3, 위반 10개 이상 각각 메시지 확인).
- 주의사항: 실제 파일 시스템을 쓰지 않고 `exists`·`read`를 주입받는다. 타입은 단계 3의 유니온과 맞추되 이 단계에서는 helper 안에 지역 타입으로 두지 말고 `~/lib/concepts`의 타입을 쓴다 → 단계 3(타입)보다 먼저 하면 타입이 없으므로 **단계 3의 타입 변경을 이 단계 맨 앞에서 함께 한다**(아래 단계 3은 L1·무결성 연결만).
- 완료 조건: `npx vitest run tests/browser-example.test.ts` 통과(위반 케이스마다 기대 메시지 일치), 음성 확인, typecheck 통과(유니온·카테고리 변경 포함, 기존 `meta.ts` 35개 오류 0).

### 3. L1·무결성 연결

- 대상: `tests/examples.test.ts`, `tests/content-integrity.test.ts`
- 변경: 3절 "테스트"의 두 파일 변경.
- 주의사항: 브라우저 예제가 0개인 지금은 Chromium을 띄우지 않는다(`beforeAll` 조건). 기존 무결성 메시지(파일 없음 등)는 유지.
- 완료 조건: `npm test` 통과, 기존 개념 35개가 `checkExampleSpec` 위반 0, `npm test` 소요 시간을 변경 전(baseline)과 함께 구현 진행에 기록, 전체 `npm test` 3회 연속 통과.

### 4. 문서

- 대상: `docs/content-guide.md`, `AGENTS.md`
- 변경: 3절 "문서".
- 주의사항: content-guide의 최소 문서 모양·상수(QUIET_MS, 상한값)·실패 조건이 실행기 코드와 글자 그대로 같은지 메인이 diff로 대조. AGENTS.md는 기존 구조·문체 유지, 바뀌는 줄만.
- 완료 조건: `npm run format:check` 통과, 2절 "문서 갱신 위치"의 모든 줄이 갱신됨(grep으로 `examples/*.js` 단독 표기·"현재 지원하지 않는다" 문구가 남지 않음), 문서의 값이 코드 상수와 일치.

### 5. 전체 검증

- 6절 전부. 완료 조건: 모든 명령 통과, 홈 그룹 변화 없음 확인.

## 9. 추가 개선 후보

- 브라우저 예제가 많아져 `examples.test.ts`가 느려지면 브라우저 분기를 `it.concurrent`로(예제마다 context 분리).
- content-guide의 최소 문서 문자열과 `JS_DOCUMENT` 상수를 테스트로 대조.

## 변경 이력

- 2026-11-03 (Consensus 1회: Architect PASS·Critic REVISE): 모든 요청 가로채기(`context.route('**/*')`)와 미등록 요청·요청 안 된 resource를 reject(HIGH·MEDIUM), 검사·로더를 순수 함수로 분리해 브라우저 예제 0개에서도 단위 테스트(HIGH), main frame 재이동 reject, 출력 안정 검사(`QUIET_MS`), 입력은 예제의 `el.click()`·`dispatchEvent`로 결정, Node 호스트 주장은 제외 범위, 문서 갱신 위치 보강, 숨은 지연 조건 규칙과 async 자체 테스트, 시간 상한·타임아웃(`delayMs` ≤ 1000, `settleMs` ≤ 2000, goto 5s, evaluate 2s, `it` 15s, `beforeAll` 30s), `%` 서식·`console.info` 등 실패화, 수집 배열 비열거, `.js`는 `<script src>`, resources는 `.js`만, 원래 콘솔 미호출, Clock API를 버린 대안에 기록, 반복 검증을 전체 `npm test` 3회로.

## 구현 진행

- baseline (2026-11-03, `65484bb`): lint·format:check·typecheck 통과 / `npm test` 101 files·3234 tests 통과, Duration 11.45s(real 11.79s). test:build·e2e는 직전 커밋에서 통과.
- 단계 1(실행기)과 단계 2(타입·검사 함수)는 파일이 겹치지 않아 Sonnet 서브에이전트 2개에 병렬 위임. 단계 3·4는 그 뒤.
- [x] 1. 실행기와 자체 테스트 — 메인이 diff 확인(`context.route('**/*')`, 열거 불가 `Symbol.for('jsuth.logs')`, 실패 조건 7종, `finally` close, launch 실패 시 설치 안내+`cause`). 서브에이전트 보고: 12개 통과·10회 연속 실패 0·음성 확인(async 기대값 반전 시 실패). 메인 재실행: 아래 단계 2와 함께 통과. ⑩은 `<a href="/">`+`window.name` 가드로 `/` 재이동(`framenavigated`) 경로를 검증
- [x] 2. 예제 타입·검사 함수 — `ConceptExample` 유니온·`browser` 카테고리(`objects` 다음), `checkExampleSpec`·`toRunnerInput` + 단위 28개(정상 3, 위반 다수, 경계값), 음성 확인. `RunnerInput`·`DEFAULT_SETTLE_MS`가 실행기와 중복 정의돼 단계 3에서 실행기 쪽으로 합침
- [x] 3. L1·무결성 연결 — 메인이 diff 확인: `examples.test.ts`는 `ecmascript` 동기 경로 그대로, `browser` 예제가 있을 때만 `beforeAll`(30s) launch·`it` 15s, `content-integrity.test.ts`에 `checkExampleSpec` 위반 0 검사 추가, `browser-example.ts`의 중복 `RunnerInput`·`DEFAULT_SETTLE_MS`는 실행기에서 import·re-export. 기존 35개 개념 위반 0. 연결 확인: 메인이 scratchpad vitest로 가짜 BrowserExample(`.html` + defer resources 지연 200ms)을 `checkExampleSpec`→`toRunnerInput`→`runBrowserExample`로 실행해 `['3','a','b']` 확인(임시 파일 삭제)
- [x] 4. 문서 — content-guide "브라우저 예제" 소절·meta 표 category/examples·폴더 트리·원칙, AGENTS.md 정확성 원칙·디렉터리·예제 규칙·`npm test` 설명·Chromium 설치 안내. 메인이 소절 전문을 읽고 실행기 상수·실패 조건과 대조(일치). 최소 문서 코드 블록은 `<!-- prettier-ignore -->`로 `JS_DOCUMENT`와 글자 그대로 유지
- 전체 검증(2026-11-03): lint·format:check·typecheck 통과, `npm test` 3회 연속 통과(103 files·3309 tests, Duration 15.60s·16.74s·16.48s — baseline 11.45s 대비 약 +4~5s는 항상 실행되는 실행기 자체 테스트 파일(단독 약 8s) 때문), 실행기 자체 테스트 10회 연속 실패 0, `test:build` 286 통과, 전체 e2e 471 passed·3 skipped(기존 조건부 skip: `concept.spec.ts:171` 모바일 전용, `no-js.spec.ts:6` 데스크톱 전용) 10.7m
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 0 · Low 2(보고만) — ① `npm test`가 약 4~5초 늘고 Chromium 설치를 항상 요구(계획대로, 문서화됨) ② 실행기는 쿼리 문자열이 붙은 요청(`/a.js?x`)도 미등록으로 실패시키는데 문서에 그 점이 명시되지 않음

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현. 완료 조건 변경 없음. 단계 2에서 `RunnerInput`·`DEFAULT_SETTLE_MS`가 실행기와 검사 함수 양쪽에 정의돼, 단계 3에서 실행기 쪽 하나로 합치고 `browser-example.ts`가 re-export하게 했다.

### 코드 리뷰

- Critical/High/Medium 0. Low 2건은 고치지 않고 보고: `npm test` 약 +4~5초·Chromium 항상 필요(계획대로), 쿼리 문자열 요청이 미등록으로 실패한다는 점이 문서에 없음.

### 후속 작업

- [ ] 쿼리 문자열 요청(`/a.js?x`)이 미등록 요청으로 실패한다는 점을 content-guide "브라우저 예제"에 한 줄 추가(필요해질 때)
- [ ] 브라우저 예제가 많아지면 `examples.test.ts` 브라우저 분기 병렬화 검토(9절)
- [ ] Node 호스트 동작 주장(예: Node 타이머 id는 객체)은 이 인프라로 실행 검증할 수 없음 — 38~42장 7번 계획에서 처리 방식 결정

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [무검토 승인] 모든 요청을 가로채고(`context.route('**/*')`) 등록되지 않은 요청은 조용히 막지 않고 테스트 실패로 처리 — 택하지 않은 대안: `example.test/**`만 가로채기, 미등록 요청 abort만 하기. 이유: 다른 호스트 요청이 밖으로 나가거나, 스크립트가 빠진 채 나온 잘못된 출력이 `expectedOutput`으로 굳을 수 있다.
- [무검토 승인] 출력을 `settleMs` 뒤 한 번 모으고 `QUIET_MS`(200ms) 뒤 다시 모아 다르면 실패 — 대안: 한 번만 수집. 이유: 멈추지 않는 `setInterval`이나 늦은 타이머가 있으면 잘린 출력을 정답처럼 기록하게 된다.
- [무검토 승인] 출력 문자열을 Playwright `msg.text()`가 아니라 페이지 안 `addInitScript` 콘솔 래퍼에서 Node 실행기와 같은 규칙으로 만든다. 객체·`%` 서식·`console.info` 등은 `[unsupported: …]`로 남겨 실패시킨다 — 이유: Chromium `msg.text()`는 `-0`을 `0`으로, 빈 문자열 인자를 뒤 공백으로 바꿔 두 런타임의 출력 규칙이 달라진다.
- [무검토 승인] 명세 검사(`checkExampleSpec`)와 입력 변환(`toRunnerInput`)을 파일 시스템을 주입받는 순수 함수로 빼서 단위 테스트 — 대안: 무결성 테스트 안에 직접 작성. 이유: 지금은 브라우저 예제가 0개라 무결성 테스트 안의 브라우저 분기가 한 번도 실행되지 않는다.
- [무검토 승인] 브라우저 예제를 별도 명령이 아니라 `npm test`에 넣고, 브라우저 예제가 있을 때만 `beforeAll`로 Chromium을 띄운다. 실행기 자체 테스트는 항상 돈다 — 대가: `npm test` 약 +4~5초, Chromium 설치 필수.
- [Claude 판단] 실행기·검사 함수에 중복 정의된 `RunnerInput`·`DEFAULT_SETTLE_MS`를 실행기 쪽 하나로 합침 — 이유: 기본 대기 시간 값이 두 곳에서 따로 바뀌면 문서·검사·실행이 어긋난다.
- [Claude 판단] content-guide의 최소 HTML 문서 코드 블록에 `<!-- prettier-ignore -->`를 달아 실행기의 `JS_DOCUMENT` 문자열과 글자 그대로 유지 — 이유: 포맷터가 줄을 바꾸면 문서와 실제 실행 문서가 달라진다.
- 검증 방식(실제 Chromium 실행)과 `browser` 카테고리 신설은 사용자가 직접 정했다.

#### 배경지식

- Playwright `context.route`는 컨텍스트의 모든 요청을 가로채 `fulfill`(응답 제공)·`abort`를 고를 수 있다. 존재하지 않는 출처(`http://example.test`)도 가로채서 응답하면 페이지가 정상 로드된다.
- `addInitScript`는 문서의 어떤 스크립트보다 먼저 실행되므로 `console.log`를 미리 감쌀 수 있다. 수집 배열은 `Symbol.for` 키의 열거 불가 프로퍼티로 둬 예제의 `Object.keys(console)` 같은 코드에 보이지 않게 했다.
- `defer` 스크립트는 받은 순서와 무관하게 문서 순서대로 `DOMContentLoaded` 전에 실행되고, `async`는 받는 대로 실행된다(WHATWG HTML). 실행기는 `delayMs`로 응답을 늦춰 이를 재현한다.
- 예제의 `el.click()`·`dispatchEvent`로 만든 이벤트는 `isTrusted`가 false다. 전파 순서(캡처 → 타깃 → 버블)는 사용자 입력과 같다.

#### 확인 질문

1. 등록되지 않은 요청을 조용히 `abort`하지 않고 테스트 실패로 만드는 이유는?
   <details><summary>답</summary>abort만 하면 예제가 스크립트 하나를 못 받은 상태로도 출력이 나오고, 그 잘못된 출력을 `expectedOutput`으로 적어도 테스트가 통과한다. 실패로 만들어야 등록 누락이 드러난다. (계획 변경 이력, `tests/helpers/run-browser-example.ts`)</details>
2. `QUIET_MS` 두 번째 수집을 없애면 어떤 예제에서 무엇이 깨지는가?
   <details><summary>답</summary>`clearInterval`하지 않는 `setInterval`이나 `settleMs`보다 늦은 타이머가 있는 예제. 첫 수집 시점의 잘린 출력이 정답처럼 기록되고, 실행 환경 속도에 따라 결과가 흔들린다. (계획 3절, 실행기 "출력이 안정되지 않았습니다")</details>
3. 출력 문자열을 Playwright `msg.text()`로 받지 않은 이유는?
   <details><summary>답</summary>Chromium `msg.text()`는 `-0`을 `0`으로 보이고 빈 문자열 인자에 뒤 공백을 남긴다. Node 실행기(`util.format`)와 같은 규칙으로 페이지 안에서 직접 문자열을 만들어야 두 런타임의 `expectedOutput` 규칙이 같아진다. (계획 3절, `installConsoleCollector`)</details>
4. 브라우저 예제가 0개인데 검사 함수를 따로 단위 테스트한 이유는?
   <details><summary>답</summary>무결성 테스트는 실제 개념 폴더의 예제만 검사하므로, 브라우저 예제가 생기기 전에는 브라우저 규칙(확장자, resources 경로, delayMs 범위 등) 코드가 한 번도 실행되지 않는다. 메모리 fs를 주입한 단위 테스트 28개로 지금 검증한다. (`tests/browser-example.test.ts`)</details>
5. 예제가 `<script src="/a.js?v=1">`를 쓰고 resources에 `/a.js`를 등록하면 어떻게 되는가?
   <details><summary>답</summary>요청 경로에 쿼리 문자열이 붙어 등록 경로와 같지 않으므로 "등록되지 않은 요청"으로 실패한다. 문서에는 아직 적혀 있지 않다(리뷰 Low ②, 후속 작업). (`tests/helpers/run-browser-example.ts`)</details>
