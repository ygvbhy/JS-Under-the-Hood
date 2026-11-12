# 추가 게시글 'fetch'와 브라우저 실행기 응답 확장 구현 계획

- 상태: 완료
- 작성일: 2026-11-10
- 기준: `main` @ `32ac57c`

## 0. 요약

- 목적: 브라우저 예제 실행기가 `.json` 리소스·HTTP 상태 코드·네트워크 오류를 낼 수 있게 확장하고, `/concepts/fetch`를 추가해 fetch가 404·500에도 이행하고 결과가 network error일 때 거부하는 이유, `response.ok`, `json()`이 또 프로미스인 이유를 예제 8개·결과표·퀴즈로 설명한다
- 범위: 공통 테스트 실행기(`tests/helpers/`)와 `BrowserExample` 타입(`app/lib/concepts.ts`), content-guide·AGENTS.md 문구, 새 개념 폴더 1개(category `async`, order 445), 순위 테스트·빌드·e2e 등록, 43~48장 로드맵 문서 / 기존 개념 본문·예제와 화면 컴포넌트는 바꾸지 않음
- 위험: 공통 실행기 변경이 기존 브라우저 예제(개념 3개가 `resources` 사용)를 깨뜨리는 것 — 기존 형태(`.js`, 상태 200)는 기본값으로 유지하고 `npm test` 전체와 전체 e2e로 확인한다
- 복잡도: 높음 · Consensus: 수행 1회 (공통 테스트 코드·`app/lib` 타입 변경, 새 설정 필드). Architect·Critic 모두 REVISE → 지적을 코드·표준 원문으로 재확인해 전부 반영, 재검토 생략(구조 변경 없음)
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-10)

- 남은 개념 후보 `fetch`를 추가 게시글로 쓴다. 43~48장 로드맵은 "43장 Ajax·45장 `fetch`는 JSON 응답을 내주는 가짜 서버 경로가 필요"해서 제외했다(`.claude/plans/concept-roadmap-ch43-48.md:16`). fetch는 45장(프로미스) 내용이다.
- 사용자 선택: **실행기 확장 후 fetch 작성**. 실행기에 `.json` 리소스와 상태 코드 지정을 추가한다.
- 사용자 선택: **네트워크 오류 리소스도 추가**(`networkError: true` — 가짜 서버가 응답하지 않고 요청을 네트워크 오류로 실패시킨다). fetch가 network error에서 거부하는 것을 실제 실행으로 보인다.
- 사용자 선택: 시각화는 **결과표 + 퀴즈**(시뮬레이터 없음, `timers`·`json`과 같은 형식).

### 유지해야 하는 기존 동작

- 기존 브라우저 예제의 실행 결과와 `checkExampleSpec`이 받아들이던 명세(`.js` 리소스, `delayMs`, `settleMs`)는 그대로 통과한다. 상태를 주지 않으면 200, `.js`는 `text/javascript; charset=utf-8`.
- 미등록 요청은 계속 실패, 등록했는데 요청되지 않은 리소스도 계속 실패(네트워크 오류 리소스 포함).
- 기존 개념 학습 순서는 order 445 뒤쪽(`generator` 50 → 51, `async-await` 51 → 52, `error-handling` 52 → 53, `async-generator` 53 → 54, `es-modules` 54 → 55)만 밀린다. 테스트 기대값만 바꾼다.

### 제외 범위

- XMLHttpRequest(43장), REST 규약(44장). HTTP 상태 코드는 본문에서 "서버가 응답에 담는 세 자리 숫자" 정도로만 짧게 정의한다.
- 요청 옵션(`method`·`headers`·`body`), `Request` 생성자 옵션, CORS·CSP·`mode`·`credentials`·캐시, `AbortController`(중단), 본문 스트림(`response.body`)·진행 상황, `clone()`, `statusText`·응답 헤더
- async/await(46장)·try...catch(47장)로 다시 쓰기 — 45장까지 전제로 then 체인만 쓴다. 두 문법은 "별도 개념"으로 링크만 한다.
- 실행기의 리다이렉트(3xx)·1xx·본문 없는 상태(204·205) 지원, 응답 헤더 지정, 네트워크 오류 리소스의 지연
- 다른 페이지(`promise`, `json`)에 역방향 링크 넣기(9절 후보)

## 2. 사실과 추정

### 사실 (코드)

- 리소스 타입: `resources?: { path: string; file: string; delayMs?: number }[]` (`app/lib/concepts.ts:16`). 사용처는 `tests/helpers/browser-example.ts`, `tests/examples.test.ts:6,34`, meta 3개(`dom-tree-nodes`, `es-modules`, `script-async-defer`). 화면 코드에는 없다.
- 명세 검사 `checkExampleSpec`: 리소스 파일·경로가 `.js`가 아니면 위반, 경로는 `/`로 시작, 예약 경로 `/`·`/example.js`, 중복 경로, `delayMs` 0~1000 정수 (`tests/helpers/browser-example.ts:44-58`). `resource.file.endsWith`를 바로 부른다(`:45`). 호출처는 `tests/content-integrity.test.ts:126`뿐이다. `examples.test.ts:34`는 검사 없이 `toRunnerInput`만 부른다.
- `toRunnerInput`: 리소스를 `{ path, body, delayMs }`로 바꾼다 (`browser-example.ts:61-77`). `RunnerResource = { path; body; delayMs }` (`run-browser-example.ts:14`). 기본값(`DEFAULT_SETTLE_MS`)은 한 곳에서만 정한다는 기존 결정(`browser-example-runtime.md:206`).
- 실행기: 리소스를 모두 `text/javascript; charset=utf-8`, 상태 200으로 `fulfill`한다(`run-browser-example.ts:80-86,108-110`). 미등록 요청은 `route.abort()`(기본 `failed`) 후 실패 처리(`:101-105,160-162`), 요청되지 않은 리소스도 실패(`:165-170`).
- 단위 테스트: `tests/browser-example.test.ts`(정상 3, 위반 16, toRunnerInput 3). 새 규칙에서 바뀌는 곳: 위반 메시지 `:104-107`('x.txt은 .js여야 합니다'), `:109-117`('/로 시작하는 .js 경로' 두 곳), `toRunnerInput` 기본값 기대 객체 `:170-175`(`toEqual`). 실행기 테스트 `tests/run-browser-example.test.ts`(it 12개)의 `RunnerResource` 리터럴 `:54-55,70-71,125`는 새 필수 필드가 없어 typecheck가 깨진다(`tsconfig.json` `include: ["**/*"]`).
- `app/concepts/*/examples/**`는 Prettier(`.prettierignore`)·ESLint(`eslint.config.js:13`)에서 제외되고, tsconfig 와일드카드는 `.json`을 잡지 않는다 → 잘못된 JSON 파일(`broken.json`)이 lint·format·typecheck를 깨지 않는다. `file=` 코드 가져오기는 확장자 제한이 없다(`vite.config.ts:32`).
- 학습 순서: `json` 47, `promise` 48, `microtask-queue` 49(`navigation.spec.ts:539`), `generator` 50(`:553`). fetch는 50 / 55가 된다.
- 개수·순위 고정: `app/lib/concepts.test.ts:104,111,112`(54), `ConceptPager.test.tsx:18,28`, `navigation.spec.ts:78,84,139`와 pager 블록의 "/ 54" 33곳, '객체' 검색 순위 목록(`navigation.spec.ts:96-113`)에서 바뀌는 것은 `'50'`(generator) → `'51'` 하나, `responsive.spec.ts:1401`(`toHaveCount(54)`, 홈 학습 순서 보기). 홈 검색 필드는 title·summary·tags(`app/lib/concepts.ts:90-92`) → 이 셋에 '객체' 금지.
- 표 형식 개념의 빌드 검사 예: `describe('프리렌더 (json)')` (`tests/build/build-output.test.ts:1198-1210`). e2e 경로 상수 `tests/e2e/helpers.ts:84-92`, 등록 예 `a11y.spec.ts:80,1074`, `responsive.spec.ts:78,1316`.
- 숨은 실행 조건을 보이는 선례: `script-async-defer/content.mdx:8,117,127-131`(지연을 코드 앞에 적고 리소스 파일을 `file=`로 보임). content-guide는 `delayMs`를 "페이지에 보이지 않는 숨은 조건"이라 밝히라고 한다(`docs/content-guide.md:92`). 코드 펜스 언어 규칙은 "`html` 또는 `js`"(`:104`), 근거 목록은 WHATWG HTML·DOM·MDN(`:102`).
- AGENTS.md "정확성 원칙"은 브라우저 동작 근거를 "WHATWG HTML·DOM 표준과 실제 Chromium 실행 결과"로 적고, 디렉터리 구조는 `examples/*.js, *.html`로 적는다.
- `reviewedAt`: 현재 null인 개념 없음, 최근 추가 게시글(`date`, `async-generator`)은 사용자 최종 승인일을 기록.
- 장 범위 선례: `promise/examples/chain.js:10`이 then 콜백 안에서 `throw new Error`를 쓴다(47장 내용).

### 사실 (WHATWG Fetch 표준 — 2026-11-10 사본, 스크래치패드 `fetch.html`)

- `fetch()` 메서드 단계(`#dom-global-fetch`): ① Request 생성자를 부르고 "If this throws an exception, reject p with it and return p." ② 신호가 이미 중단됐으면 abort ③ processResponse에서 "If response is a network error, then reject p with a TypeError and abort these steps." 아니면 Response를 만들어 "Resolve p with responseObject." — 상태 코드 검사 단계는 없다. 거부되는 경우는 생성자 예외(잘못된 URL 등), 중단, network error.
- network error(`#concept-network-error`): "a response whose type is "error", status is 0 …, body is null".
- 서버가 응답을 보내도 network error가 될 수 있다: HTTP fetch(`#http-fetch`) "If request's response tainting is "cors" and a CORS check for request and response returns failure, then return a network error." → 기준은 "응답을 받았는가"가 아니라 "결과가 network error인가".
- ok status(`#ok-status`): "a status in the range 200 to 299, inclusive." `ok` getter(`#dom-response-ok`): ok status면 true.
- null body status(`#null-body-status`): 101, 103, 204, 205, 304.
- HTTP-network fetch(`#http-network-fetch`): "Wait until all the HTTP response headers are transmitted." 뒤 응답을 돌려주고, 본문 바이트는 "in parallel"로 이어서 전송된다. → 이행 시점에 본문이 다 오지 않았을 수 있고, 본문은 `json()`·`text()`로 따로 읽는다.
- consume body(`#concept-body-consume-body`): "If object is unusable, then return a promise rejected with a TypeError." 아니면 새 프로미스를 만들어 본문을 끝까지 읽은 뒤 이행 — 본문 도착 여부와 상관없이 항상 프로미스. unusable(`#body-unusable`): body가 null이 아니고 stream이 disturbed 또는 locked. `json()`(`#dom-body-json`): consume body + parse JSON from bytes, "can reject with a SyntaxError."

### 사실 (Chromium 156.0.8078.4 실행 — 스크래치패드 `fx/run.mjs`, 계획한 실행기 동작을 흉내 낸 독립 스크립트. Critic이 재실행해 일치 확인)

가짜 서버 경로: `/user.json` 200 `{"name":"Kim"}`, `/created.json` 201 `{"id":7}`, `/missing.json` 404 `{"message":"not found"}`(파일 `not-found.json`), `/server-error.json` 500 `{"message":"server error"}`, `/broken.json` 200 `{name: "Kim"}`, `/offline.json` 네트워크 오류.

| 예제 | 리소스 | 출력 |
| --- | --- | --- |
| `ok-response.js` | `/user.json` | `sync end` / `200 true` / `true` / `Kim` |
| `not-found.js` | `/missing.json` | `then 404 false` / `not found` |
| `status-ok.js` | `/user.json`·`/created.json`·`/missing.json`·`/server-error.json` | `[[200,true],[201,true],[404,false],[500,false]]` |
| `network-error.js` | `/offline.json` | `catch TypeError true` |
| `check-ok.js` | `/user.json`, `/missing.json` | `data Kim` / `catch HTTP 404` |
| `body-used.js` | `/user.json` | `false` / `true string` / `catch TypeError` |
| `invalid-json.js` | `/broken.json` | `then 200 true` / `catch SyntaxError true` |
| `bad-url.js` | 없음(`fetch('http://[')`, 요청이 나가지 않음) | `after fetch` / `catch TypeError` |

- 모든 예제에서 pageerror·미등록 요청 없음, 등록한 리소스는 모두 요청됨.
- 404·500·네트워크 오류 때 Chromium이 내는 "Failed to load resource" 콘솔 메시지는 페이지의 `console.log` 덮어쓰기를 거치지 않아 수집 출력에 섞이지 않는다.
- `route.abort('failed')`는 일반 실패(net::ERR_FAILED)이고 fetch는 `TypeError`로 거부(메시지 `Failed to fetch`는 브라우저마다 달라 출력하지 않는다). '연결 끊김'은 Playwright의 다른 오류 코드라 이 표현을 쓰지 않는다.
- 예제가 배제하는 틀린 모델: 4xx·5xx면 거부(`not-found`·`status-ok`·`check-ok`), 다시 읽기가 성공하거나 빈 값(`body-used`), 잘못된 JSON이면 fetch 자체가 거부(`invalid-json`), 잘못된 URL이면 동기 throw(`bad-url`). 배제하지 못하는 것: `ok`의 위쪽 경계(200~299 대 400 미만 — 3xx 미지원) → 본문은 경계를 표준에서 가져왔다고 구분한다. `ok-response`의 `true`는 반환 타입만 보이고 "본문이 아직 안 와서"의 증거가 아니다(가짜 서버는 본문을 한 번에 줌).

### 추정

- 없음

## 3. 구현 전략

- **리소스를 두 모양의 유니언으로**: 응답 리소스 `{ path, file, status?, delayMs? }`(파일 확장자 `.js`·`.json`, 경로 확장자는 파일과 같아야 함)와 네트워크 오류 리소스 `{ path, networkError: true }`(파일·상태·지연 없음). Content-Type은 파일 확장자로 정한다(`.js` → `text/javascript; charset=utf-8`, `.json` → `application/json`). 상태는 200~299, 400~599 정수 중 204·205 제외(1xx·3xx는 임시 응답·리다이렉트라 헤더 없이 흉내 내지 않는다, 204·205는 null body status라 파일 본문과 모순).
  - 판별: 런타임은 `'networkError' in r`(값이 `true`가 아니면 위반), 응답 모양은 `typeof file === 'string'`을 먼저 확인하고 리소스마다 기존 `loose` 캐스트 패턴(`browser-example.ts:24`)으로 선언 밖 필드도 검사한다. 응답 모양 타입에 `networkError`를 선언하지 않아 `in` 검사로 TS 좁히기가 된다. `toRunnerInput`도 같은 판별식.
  - 버린 대안: 모든 리소스에 `file`을 두고 `networkError?: true`를 덧붙이기 — 의미 없는 파일을 요구한다. `contentType` 직접 지정 — 지금 필요 없다. 미등록 요청을 네트워크 오류로 쓰기 — 등록 누락을 잡는 안전장치(`browser-example-runtime.md:201`)를 깬다. 네트워크 오류 리소스에 `delayMs` — 요구사항·예제에서 쓰지 않는다.
- `RunnerResource`는 `{ path; networkError: true } | { path; delayMs; status; contentType; body }`(응답 쪽 필드 모두 필수). 기본값(상태 200, Content-Type)은 `toRunnerInput` 한 곳에서만 정한다. 실행기는 네트워크 오류 리소스를 요청 경로로 기록한 뒤 `route.abort('failed')`한다.
- 개념 페이지는 then 체인만 쓴다(45장 전제). 여러 fetch의 완료 순서는 출력하지 않고 `Promise.all`로 한 줄에 모은다. 오류는 `name`·`instanceof`만 출력한다.
- 가짜 서버 조건을 독자에게 보인다: `## 예제` 첫머리에 "가짜 서버 경로" 표(경로 | 상태 | 응답 본문 파일 또는 '네트워크 오류')를 두고, 출력에 본문 내용이 나오는 예제(`ok-response`·`not-found`·`check-ok`·`invalid-json`)는 해당 `.json`을 ` ```json file=./examples/…json ` 블록으로 함께 보인다. 테스트용 가짜 서버라는 사실은 simplifications에도 적는다.

## 4. 변경 파일

- 수정: `app/lib/concepts.ts`(리소스 타입), `tests/helpers/browser-example.ts`(검사·변환), `tests/helpers/run-browser-example.ts`(상태·타입·네트워크 오류), `tests/browser-example.test.ts`, `tests/run-browser-example.test.ts`, `docs/content-guide.md`(meta 표 `examples` 행, "`resources`와 `delayMs`" 항목, "실패하는 경우", "근거", "코드 블록"), `AGENTS.md`(정확성 원칙의 근거 표준에 Fetch 추가, 디렉터리 구조의 `examples/` 줄에 리소스 `.json`), 순위 테스트(`app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts:1401`), 등록(`tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`), `.claude/plans/concept-roadmap-ch43-48.md`(45장 fetch 구현 기록)
- 추가: `app/concepts/fetch/` — `meta.ts`, `content.mdx`, `route.tsx`, `examples/`(`.js` 8개 + `.json` 5개: `user.json`, `created.json`, `not-found.json`, `server-error.json`, `broken.json`)
- 변경하지 않음: 기존 개념 폴더, `tests/examples.test.ts`(인터페이스 유지), `app/simulator/`, 화면 컴포넌트, `package.json`(의존성 없음)

## 5. 위험 요소

- 유니언 타입 → 실행기 테스트 리터럴(`run-browser-example.test.ts:54-55,70-71,125`)이 typecheck 실패 → 1단계에서 `status: 200`, `contentType: 'text/javascript; charset=utf-8'`을 명시. meta 리터럴 3곳은 응답 모양에 그대로 맞는다.
- 기존 기대값 변경 → `browser-example.test.ts:104-117` 메시지 3곳, `:170-175` 기대 객체 → 1단계에서 새 모양에 맞추고 삭제하지 않는다.
- `file` 없는 값이 들어오면 `endsWith`에서 TypeError로 무결성 테스트가 터짐 → 판별 후 검사(3절), 위반 테스트로 확인.
- 네트워크 오류 리소스를 요청 기록에서 빼먹음 → "요청되지 않은 resource"로 잘못 실패 / 요청되지 않은 네트워크 오류 리소스는 실패해야 함 → 1단계 실행기 테스트 두 개.
- 여러 fetch 동시 출력 순서 → 비결정적 → 예제는 체인 하나 또는 `Promise.all` 한 줄.
- 처리되지 않은 거부(pageerror) → 거부될 수 있는 예제마다 `catch`(`ok-response`·`status-ok`는 거부되지 않는 경로라 catch 없음 — 거부되면 pageerror로 드러남).
- 서술 오류 ① "응답을 받지 못했을 때 거부" → CORS 실패 등은 응답이 와도 network error → 기준을 "결과가 network error인가"로 쓰고, CORS 같은 경우가 있다는 한 문장 + simplifications. title·summary·② 문장·결과표·흔한 오해에 같은 기준. ② "네트워크 오류일 때만 거부" → 생성자 예외·중단도 거부 → 세 경우를 모두 적고 이 페이지가 실행으로 보인 것은 network error와 잘못된 URL이라고 밝힌다. ③ "헤더가 오면 이행"을 넘어 "본문이 아직 안 와서 프로미스"를 예제 증거처럼 쓰는 것 → `#http-network-fetch`·consume body 문장으로만 근거를 대고, `ok-response`의 `true`는 반환 타입 확인으로만 쓴다. ④ `ok` 경계 → 표준 출처라고 구분.
- 결과표 칸 중 실행 근거 없는 칸(201·500의 본문) → 본문 읽기 칸은 예제가 읽은 행만 채우고 나머지는 "—". 표 설명에 칸의 출처(예제 출력 / 표준)를 구분한다.
- '객체' 낱말이 title·summary·tags에 들어감 → 홈 검색 e2e → 3단계 주의.
- `bad-url.js`가 요청을 만들면 미등록 요청 실패 → 실행 확인상 요청 없음, 테스트가 계속 지킨다.

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 공통 코드(`app/lib/concepts.ts`)를 바꾸므로 전체 `npm run e2e`.
- 브라우저: `npm run dev` 재시작 후 `/concepts/fetch` — ① 결과표·가짜 서버 표가 375px에서 가로 스크롤 region 안에만 넘침 ② 퀴즈 정답 선택 후 결과 문구 ③ 학습 순서 "50 / 55", 이전 `microtask-queue`·다음 `generator` ④ JS 끈 프리렌더(`npm run start`)에서 `<details>` 정답이 보임.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 실행기 확장

- 대상: `app/lib/concepts.ts`, `tests/helpers/browser-example.ts`, `tests/helpers/run-browser-example.ts`, `tests/browser-example.test.ts`, `tests/run-browser-example.test.ts`
- 현재: `.js` 리소스만, 상태 200만
- 변경: 3절 유니언 타입과 판별식. `checkExampleSpec` 규칙 — 응답 리소스: 파일 `.js`·`.json`, 파일 존재, 경로는 `/`로 시작하고 파일과 같은 확장자로 끝남, 예약 경로·중복 금지, `status`는 정수이고 200~299 또는 400~599, 204·205 아님, `delayMs` 0~1000 정수. 네트워크 오류 리소스: `networkError === true`, `file`·`status`·`delayMs` 없음, 경로는 `/`로 시작하고 `.js`·`.json`으로 끝남, 예약·중복 금지. `toRunnerInput`: 응답 리소스는 `status ?? 200`, 확장자로 `contentType`, `delayMs ?? 0`; 네트워크 오류는 `{ path, networkError: true }`. 실행기: 네트워크 오류는 요청 기록 → `route.abort('failed')`.
- 테스트 추가: 정상(`.json` + status 404, 네트워크 오류 리소스), 위반(경로·파일 확장자 불일치 양방향, `.txt` 파일, status 302·199·600·204·200.5, 네트워크 오류에 `file`·`status`·`delayMs`, `networkError: false`, 네트워크 오류 경로 `.txt`, `file`도 `networkError`도 없음), toRunnerInput(`.json` contentType, status 기본 200·지정값, 네트워크 오류 변환). 실행기 테스트(Chromium): `.json` 404 → `then 404 false`와 본문 읽기, 네트워크 오류 → fetch `TypeError` 거부이며 실행 실패 아님, 요청되지 않은 네트워크 오류 리소스 → reject.
- 이유: 공통 실행기가 먼저 있어야 예제를 실행할 수 있다.
- 주의사항: 기존 케이스는 삭제하지 않고 메시지·기대값을 새 모양에 맞춘다. 미등록 요청 처리·출력 안정 검사는 건드리지 않는다.
- 완료 조건: `npx vitest run tests/browser-example.test.ts tests/run-browser-example.test.ts` 통과, `npm test` 전체 통과(기존 브라우저 예제 그대로), `npm run typecheck` 통과.

### 2. content-guide와 AGENTS.md

- 대상: `docs/content-guide.md`(35행 meta 표, 92행 `resources`, 98행 실패 조건, 102행 근거, 104행 코드 블록), `AGENTS.md`
- 변경: content-guide — 응답 리소스(`.js`·`.json`, `status` 규칙과 기본 200, Content-Type은 확장자)와 네트워크 오류 리소스(`networkError: true`, 요청을 네트워크 오류로 실패시킴, 미등록 요청과 달리 실패로 치지 않음, 실제 원인은 다양하므로 simplifications에 밝힐 것), 가짜 서버 조건(상태·본문·네트워크 오류)은 숨은 조건이므로 본문에 보일 것, 여러 fetch의 완료 순서는 주장하지 않을 것, 근거 목록에 WHATWG Fetch 표준, 코드 펜스 언어에 `json`. AGENTS.md — 정확성 원칙 근거에 "Fetch" 추가, 디렉터리 구조 `examples/` 줄에 리소스 `.json` 추가.
- 완료 조건: `npm run format:check` 통과, 문서의 값 범위·확장자가 1단계 검사 코드와 일치(대조).

### 3. 메타와 예제

- 대상: `app/concepts/fetch/meta.ts`, `examples/*` 13개, `route.tsx`, `content.mdx`(필수 h2만)
- 변경: 2절 표의 예제를 스크래치패드 `fx/` 원문 그대로 만든다(파일 끝 줄바꿈 하나). `meta.ts`: slug `fetch`, title `fetch: 404 응답인데 왜 catch로 가지 않을까`, category `async`, order 445, prerequisites `promise`, `json`, related `promise`, `json`, `microtask-queue`, `event-loop`, `async-await`, `error-handling`, `reviewedAt: null`(사용자 최종 승인 때 승인일로 바꾼다 — 최근 관례). summary(안, 160자 이하): "fetch가 돌려주는 프로미스는 404·500 응답에도 이행하고, 결과가 네트워크 오류일 때 TypeError로 거부합니다. response.ok로 상태를 확인해야 하는 이유와 json()이 또 프로미스를 돌려주는 이유를 Fetch 표준과 실행 결과로 확인합니다." goals 4개(이행·거부 조건 / ok와 ok status / 본문 읽기가 별도 프로미스이고 한 번만 / 실패를 catch로 모으는 then 체인). tags에 '객체' 금지. simplifications: 예제 응답은 테스트용 가짜 서버가 주는 것(경로별 상태·본문을 페이지에 표시), 네트워크 오류는 가짜 서버가 요청을 실패시켜 만든 것(실제 원인은 오프라인·DNS 실패·CORS 실패 등 다양), 응답을 한 번에 주므로 본문 스트리밍은 보이지 않음, `ok`의 3xx 경계는 실행으로 보이지 않고 표준에서 가져옴, 요청 옵션·CORS·중단 제외, Chromium 결과·오류 메시지 미출력, HTTP 상태 코드(43·44장)는 짧게만, async/await(46장)·try...catch와 Error·throw(47장)는 별도 개념, XMLHttpRequest(43장) 제외, `console.log`는 호스트 API. references: Fetch 표준 앵커(`#dom-global-fetch`, `#concept-network-error`, `#http-fetch`, `#http-network-fetch`, `#ok-status`, `#dom-response-ok`, `#concept-body-consume-body`, `#dom-body-json`) + MDN ko `fetch()`·`Response.ok`·`Response.json()`(열어서 확인, 없으면 en-US).
- 주의사항: `meta.ts` → `content.mdx` → `route.tsx` 순으로 만든다. `expectedOutput`은 실제 실행기 출력으로 채운다(2절 표와 다르면 멈추고 원인 확인 — 흉내 스크립트와 실행기의 수집·대기 방식이 다르다).
- 완료 조건: `npx vitest run tests/examples.test.ts -t fetch`에서 8개가 2절 표와 일치, `npx vitest run tests/content-integrity.test.ts` 통과.

### 4. 본문

- 대상: `content.mdx`
- 변경: 도입(질문, 전제 개념 링크, 다루지 않는 것). `## 동작 원리` h3: ① fetch는 프로미스를 돌려준다(`ok-response.js`, 동기 코드가 먼저) ② 이행 조건: 결과가 network error가 아니면 상태와 상관없이 Response로 이행(`not-found.js`, `status-ok.js`, 표준 단계에 상태 검사가 없음) ③ 거부 조건: network error·생성자 예외·중단(`network-error.js`, `bad-url.js`, 중단은 예제 없이 표준 문장). 서버가 응답해도 CORS 검사 실패 등으로 network error가 될 수 있다는 한 문장 ④ `ok`는 200~299(`status-ok.js`, 경계는 표준 출처라고 구분) ⑤ 본문은 따로 읽고 결과도 프로미스(`#http-network-fetch`·consume body 근거, `ok-response.js`의 `true`는 반환 타입 확인으로만) ⑥ 본문은 한 번만(`body-used.js`) ⑦ JSON이 아니면 `json()`이 SyntaxError로 거부(`invalid-json.js`) ⑧ 실패를 한 catch로 모으기(`check-ok.js`). 결과표(상황 | fetch 프로미스 | `ok` | 본문 읽기 | 근거): 200·201·404·500·네트워크 오류·잘못된 URL·잘못된 JSON·본문 다시 읽기 — 본문 읽기 칸은 예제가 읽은 행만, 나머지 "—", 표 설명에 칸 출처(예제 출력 / 표준) 구분. `## 예제`: 첫머리 가짜 서버 경로 표, 본문이 출력에 나오는 예제에 `json file=` 블록, 예제마다 PredictQuiz(8개 이상). `## 결과와 이유`: 예제별 h3 + 흔한 오해 Callout(404면 catch로 간다 / 서버가 응답만 하면 거부되지 않는다 / `response.json()`이 바로 값이다 / 본문을 여러 번 읽을 수 있다).
- 주의사항: 표준 인용은 2절에서 확인한 문장만. '테스트가 확인합니다'류 저자 메모 금지(결과표 대조 테스트도 없다). 표는 `<Wide>` 또는 `overflow-x-auto` + `tabIndex`·`role="region"`·`aria-label`. 첫 문단에 `**` 금지. 퀴즈 문자열 prop에 작은따옴표 금지(MDX 빌드). 퀴즈 정답 위치를 섞고 `expectedOutput`과 대조한다.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, 퀴즈 정답 대조 불일치 0건, `npm run test:build`의 MDX 빌드 통과.

### 5. 순위 테스트, 빌드·e2e 등록, 로드맵 문서

- 대상: `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `navigation.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `tests/e2e/helpers.ts`, `a11y.spec.ts`, `concept-roadmap-ch43-48.md`
- 변경: 개수 54 → 55(`concepts.test.ts`, `ConceptPager.test.tsx`, `navigation.spec.ts:78,84,139`, pager "/ 54" 33곳, `responsive.spec.ts:1401`), `es-modules` 위치 55. `navigation.spec.ts`: '객체' 검색 순위 `'50'` → `'51'`(개수 그대로), `microtask-queue` 다음 → `/concepts/fetch`, `fetch` 블록(50 / 55, 이전 `microtask-queue`, 다음 `generator`), `generator` 이전 → `/concepts/fetch`, `generator`~`es-modules` 순위 +1. 빌드 검사는 `json` 항목을 본떠 결과표 region과 `<details` 8개 이상. e2e는 a11y와 가로 스크롤 등록. 로드맵 문서에 45장 fetch를 추가 게시글로 구현했다고 기록.
- 완료 조건: `npm test`, `npm run test:build` 통과, `grep -rn "/ 54\|(54)\|toBe(54)" tests app` 0건.

### 6. 전체 검증

- 변경: 6절 명령 전체와 전체 `npm run e2e`, 브라우저 확인 ①~④.
- 주의사항: e2e 90초 시간 초과는 재실행해 구분하고 보고에 적는다.
- 완료 조건: 모두 통과, 스크린샷.

### 7. 명세 대조

- 대상: `content.mdx`, `meta.ts`
- 변경: Opus 서브에이전트에 초안과 Fetch 표준 사본 경로를 주고 조건·분기 누락(거부 경우, network error가 되는 경우, unusable 조건, ok 범위), 틀린 모델을 통과시키는 예제, 언어(ECMAScript 프로미스)와 호스트(Fetch 표준) 구분 오류를 찾게 한 뒤 메인이 원문과 실행으로 재확인해 반영.
- 완료 조건: 지적마다 수용·기각과 근거를 `구현 진행`에 기록.

## 9. 추가 개선 후보

- `promise`·`json` 페이지에서 `fetch`로 역방향 링크
- 실행기 응답 헤더 지정, 리다이렉트 지원(필요한 개념이 생기면)
- 결과표 칸과 예제 출력을 대조하는 테스트(기존 3곳 문구 후속과 함께)

## 변경 이력

- 2026-11-10 (사용자 검토): ① 예제 4와 8의 비교가 체인 모양 차이 때문에 거부 시점을 가르지 못함(중간) → `network-error.js`를 `p`에 `then(onFulfilled, onRejected)`로 직접 붙이는 모양으로 변경(출력 그대로 `microtask / catch TypeError true`). Node 대조 실험: 이미 거부된 `p`에 직접 붙이면 `catch`가 먼저, `then().catch()` 체인이면 `microtask`가 먼저 — ③·퀴즈 4·결과 4 서술 갱신 ② `redirect: "error"`에서 리다이렉트 상태는 network error(원문 "\"error\" Set response to a network error") 한 문장 + simplifications '예제는 기본 옵션' ③ 3xx → 리다이렉트 상태 301·302·303·307·308, Location 있을 때 따라감(원문 "If locationURL is null, then return response") ④ CORS 조건 → '기본 모드로 보낸 교차 출처 요청' ⑤ '값이 아니라 프로미스' → '파싱된 값이 아니라 그 값으로 이행될 프로미스'(도입·⑤·퀴즈 1·결과 1·오해) ⑥ 두 번 읽는 방법(`clone()`은 읽기 전, `text()`+`JSON.parse`) 한 문장 ⑦ "Typically …" 인용 출처를 HTTP fetch → HTTP-network fetch 단계 끝으로 정정(HTTP fetch 쪽은 주어가 internalResponse's) ⑧ simplifications의 장 번호(43·46·47장) 제거 — 영향 단계 3·4. 재검증: lint·format·typecheck, `npm test` 4576, `test:build` 443, navigation 16, fetch 관련 e2e 8 통과, 퀴즈 대조 불일치 0
- 2026-11-10 (사용자 추가 검토): ① ⑤ 인용문 출처 재확인 — 표준 사본에서 "Typically response's body's stream is still being enqueued to after returning."은 4.7 HTTP-network fetch의 마지막 문장(앞 "Return response.", 뒤 4.8 CORS-preflight fetch). 4.6 끝에도 같은 문구, 4.4 HTTP fetch 끝은 주어가 internalResponse's → 본문 'HTTP-network fetch 단계의 끝' 유지 ② 예제 4는 `.catch`를 쓰지 않으므로 출력 라벨 'catch' → 'rejected'(`network-error.js`, expectedOutput, 퀴즈 4 보기·해설, 결과 4). 재검증: lint·format·typecheck, `npm test` 4576, `test:build` 443, navigation 16, fetch 관련 e2e 8, 퀴즈 대조 불일치 0

## 구현 진행
- baseline (2026-11-10, `32ac57c`): lint 통과 / format:check 통과 / typecheck 통과 / npm test 149파일 4533개 통과 / test:build·e2e는 직전 커밋에서 통과(미재실행)
- [x] 1. 실행기 확장 — lint·format·typecheck 통과, `npm test` 149파일 4555개 통과(기준 4533 + 새 22), 기존 브라우저 예제 그대로 통과. 판별 `tests/helpers/browser-example.ts` `'networkError' in resource`, 실행기 abort `run-browser-example.ts` `route.abort('failed')`
- [x] 2. content-guide와 AGENTS.md — `format:check` 통과. content-guide: 폴더 트리, meta 표 `examples` 행, 응답 리소스(`.json`·`status` 200~299/400~599, 204·205 제외, Content-Type은 확장자)·네트워크 오류 리소스·가짜 서버 조건 표시 항목 추가, 미등록 요청 항목, 근거(Fetch 표준), 코드 블록(`json`). 값 범위·확장자를 `tests/helpers/browser-example.ts` 검사와 대조해 일치. AGENTS.md 2줄
- [x] 3. 메타와 예제 — `tests/examples.test.ts -t fetch` 8개 통과(2절 표와 일치), content-integrity 719개 통과, typecheck·prettier 통과, 예제 13개가 스크래치패드 원본과 `cmp` 일치. 메인 수정: simplifications의 'HTTP 상태 코드는 43장·44장' 장 번호를 근거 미확인이라 삭제
- [x] 4. 본문 — content-integrity 통과, 퀴즈 8개 정답 대조 불일치 0(정답 위치 3·0·3·1·2·0·3·1), `npm run build` 통과(서브에이전트 실행, 6단계에서 재실행). 메인 수정 5건: ① 동기 코드가 먼저인 이유를 '응답이 늦어서'에서 표준의 processResponse 태스크 + then 콜백 Job으로 ② processResponse 검사 항목에 중단 추가('network error인지만' 삭제) ③ 예제 3 '같은 경로' 오기 ④ Response에 본문 stream이 있음 ⑤ bodyUsed는 '끝난 뒤'가 아니라 읽기 시작(disturbed) 기준(표준 bodyUsed getter 확인)
- [x] 5. 순위 테스트·등록 — 개수 55, fetch 블록 50 / 55, '객체' 검색 순위 '50'→'51', `FETCH_PATH`, a11y·가로 스크롤 등록, 로드맵 문서 한 줄. 빌드 검사 `describe('프리렌더 (fetch)')`는 메인이 추가(표 region 2개, `<details` 8개 이상)
- [x] 7. 명세 대조 (Opus, Fetch·WebIDL·Infra 사본 대조) — HIGH 1·MEDIUM 7·LOW 9. 메인이 원문으로 재확인해 반영:
  - 수용 H1: ⑦ '상태 코드와 헤더가 정상이어서 이행' → '결과가 network error가 아니어서'(퀴즈 7·결과 7도)
  - 수용 M1: `fetch()` 단계 안의 세 경우로 범위 한정 + Web IDL 인수 변환 예외도 거부로 바뀜(webidl 사본 "If op has a return type that is a promise type, then return ! Call(%Promise.reject%…)")
  - 수용 M2: 중단은 p가 아직 이행되지 않았으면 abort reason으로 거부, 이미 이행됐으면 본문 오류("This is a no-op if promise has already fulfilled")
  - 수용 M3: 예제 8이 '잘못된 URL도 network error' 모델을 배제하지 못함 → `bad-url.js`·`network-error.js` 끝에 마이크로태스크 표지 추가. 출력 `after fetch / catch TypeError / microtask`, `microtask / catch TypeError true`(Chromium 실행). prerequisites에 `microtask-queue`(440) 추가
  - 수용 M4: '`fetch` 자체는 본문 내용을 검사하지 않음'(integrity 옵션 반례) → '본문을 JSON으로 파싱하지 않고 이행'
  - 수용 M5: 본문 수신 중 비정상 종료·중단이면 본문 읽기 프로미스 거부("error stream with a TypeError"), 실행 안 함 명시
  - 수용 M6: '본문은 한 번만' → '본문이 있는 Response는'(제목·오해·goal·도입), body null이면 빈 본문
  - 수용 M7: 예제 6이 '다 읽어야 bodyUsed true' 모델을 배제하지 못함 → `body-used.js`를 `text()` 호출 직후 `bodyUsed` 출력으로 변경. 출력 `false / true / string / catch TypeError`
  - 수용 LOW: 퀴즈 1 원인 서술, CORS 모드 조건, "Typically response's body's stream is still being enqueued to after returning." 인용, disturbed에 취소 포함, SyntaxError는 Infra 절차가 부른 `JSON.parse`(infra 사본 확인), 결과 2 줄 번호, 결과 5 주어·근거, 3xx는 기본 redirect mode "follow"면 따라감(원문 "Unless stated otherwise, it is "follow""), 호스트 표기
  - 퀴즈 정답 대조 불일치 0(정답 위치 3·0·3·1·2·0·3·1), `examples.test.ts -t fetch` 8개 통과
- [x] 6. 전체 검증 — 명세 대조 반영 전 전체 `npm run e2e` 679 통과(3 skipped, 14.8m). 반영 후 재실행: lint·format·typecheck 통과, `npm test` 4576, `test:build` 443, `navigation.spec.ts` 16, `-g "fetch|홈 학습 순서 보기"` 8 통과(본문 변경은 fetch 폴더뿐). 브라우저(정적 빌드, 375px): 페이지 scrollWidth 375(가로 스크롤 없음), 표 region 2개는 내부 스크롤, 학습 순서 "50 / 55" 이전 microtask-queue·다음 generator, 예제 4 퀴즈 정답 선택 → "정답입니다"와 해설. 확인용 임시 launch 설정은 되돌림
- 리뷰 1차(critical-code-review, 메인 직접): Critical·High 0, Low 1(보고만: `tests/browser-example.test.ts`의 기존 케이스 이름 'resource 파일이 .js가 아님'은 이제 '.js·.json이 아님'을 검사 — 이름만 옛 규칙). 사용처 `content-integrity.test.ts:126`·`examples.test.ts:34` 확인, 본문의 '테스트' 2곳은 검증 범위를 밝히는 사실 문장(저자 메모 아님)
- 마무리: `reviewedAt` 2026-11-10(사용자 최종 승인일, 최근 관례)

## 구현 결과

### 계획 대비 실제 구현

- 실행기 확장·문서·새 개념·순위 테스트는 계획대로 구현했다.
- 달라진 점: 명세 대조(Opus)와 사용자 검토 두 차례에서 예제 3개가 틀린 모델을 배제하지 못한다는 지적이 나와 예제를 바꿨다. `bad-url.js`·`network-error.js` 끝에 마이크로태스크 표지를 붙였고, `network-error.js`는 `p`에 거부 처리 함수를 직접 붙이는 모양으로 바꾸고 라벨을 `rejected`로 했다. `body-used.js`는 `text()` 호출 직후 `bodyUsed`를 출력한다. 이 때문에 prerequisites에 `microtask-queue`를 더했다.
- 본문 서술도 바꿨다. 거부 경로(Web IDL 인수 변환·중단 조건), CORS(기본 모드의 교차 출처 요청), 리다이렉트(`"error"` 모드, 리다이렉트 상태 5개), '파싱된 값으로 이행될 프로미스', '본문이 있는 Response', 인용 출처(HTTP-network fetch 끝), 장 번호 제거를 반영했다(`변경 이력`, `구현 진행` 7단계).

### 코드 리뷰

- critical-code-review에서 Critical·High는 0건이었다. Low 1건(기존 테스트 이름 'resource 파일이 .js가 아님'이 옛 규칙)은 보고만 하고 고치지 않았다.

### 후속 작업

- [ ] `promise`·`json` 페이지에서 `fetch`로 역방향 링크
- [x] 다른 개념 meta 13개의 책 이름 없는 장 번호 표기(예: '46장') 정리 여부 결정 — 2026-11-12 장 번호를 지우기로 결정(사용자), 본문 3개 페이지까지 `chapter-number-cleanup.md`에서 처리
- [ ] `tests/browser-example.test.ts` 'resource 파일이 .js가 아님' 케이스 이름 정리(Low)
- [ ] 결과표 칸과 예제 출력을 대조하는 테스트(기존 후보와 함께)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 네트워크 오류 리소스는 미등록 요청과 똑같이 `route.abort('failed')`로 끝내되, 미리 `requestedPaths`에 기록해 실패로 치지 않는다. 미등록 요청을 네트워크 오류로 쓰는 대안은 버렸다. 등록 누락을 잡는 안전장치(빠진 스크립트로 나온 틀린 출력이 정답으로 굳는 것을 막음)가 깨지기 때문이다. (`tests/helpers/run-browser-example.ts`)
- [Claude 판단] 리소스 타입을 `{ path, file, status?, delayMs? } | { path, networkError: true }` 유니언으로 나눴다. 응답 모양에는 `networkError`를 선언하지 않아 `'networkError' in r`로 TS 좁히기가 된다. 런타임 검사는 판별을 먼저 하고 `typeof file === 'string'`을 확인한다. `file` 없는 값이 `endsWith`에서 터지지 않게 하기 위해서다. 기본값(상태 200, Content-Type)은 `toRunnerInput` 한 곳에서만 정한다. (`app/lib/concepts.ts`, `tests/helpers/browser-example.ts`)
- [Claude 판단] 실행기가 허용하는 상태는 200~299·400~599에서 204·205를 뺀 범위다. 1xx·3xx는 임시 응답·리다이렉트라 헤더 없이 흉내 내지 않고, 204·205는 null body status라 파일 본문과 모순된다. 그래서 `ok`의 위쪽 경계(3xx)는 실행이 아니라 표준에서 가져왔다고 본문에 밝혔다.
- [Claude 판단] 페이지는 then 체인만 쓰고 async/await·try...catch는 링크로만 다룬다(45장 전제 규칙). 여러 fetch의 완료 순서는 네트워크 타이밍이라 `Promise.all` 한 줄로 모았다.
- 거부 기준은 '서버가 응답했는가'가 아니라 '결과가 network error인가'다. CORS 실패처럼 응답이 와도 network error가 될 수 있다(Critic 지적 → 사용자 계획 승인).
- 예제 4와 8은 `p`에 반응을 직접 붙이고 마이크로태스크 표지를 둬야 거부 시점을 가른다. `then().catch()` 체인이면 이미 거부된 `p`에서도 `microtask`가 먼저 나와 비교가 깨진다(사용자 검토, Node 대조 실험).
- 네트워크 오류 리소스 추가, 결과표+퀴즈 형식, 예제 4 라벨 `rejected`는 사용자가 골랐다.

#### 배경지식

- Fetch 표준 `fetch()` 단계: Request 생성자 예외면 `p`를 바로 거부한다. 응답 처리(processResponse)는 fetch task로 실행되고, network error면 TypeError로 거부하며, 아니면 Response로 이행한다. 이 단계에는 상태 검사가 없다. `ok`는 200~299다.
- consume body: unusable(body가 있고 stream이 disturbed 또는 locked)이면 TypeError로 거부된 프로미스를 돌려준다. `bodyUsed`는 disturbed 여부라서 읽기를 시작한 순간 true가 된다. `json()`은 Infra 절차를 거쳐 `JSON.parse`를 부르고, 실패하면 SyntaxError로 거부한다.
- 프로미스: 이미 정해진 프로미스에 `then`을 붙이면 그 순간 반응 Job이 큐에 들어간다. 체인 중간의 `then`은 거부를 한 단계 더 거쳐 넘긴다. Web IDL은 프로미스를 돌려주는 연산에서 던진 예외를 거부된 프로미스로 바꾼다.
- Playwright `route.abort('failed')`는 net::ERR_FAILED이고, fetch는 이를 TypeError로 거부한다. 404·500 때 Chromium이 내는 "Failed to load resource" 메시지는 페이지의 `console.log` 수집에 섞이지 않는다.

#### 확인 질문

1. 네트워크 오류를 보이려고 '등록하지 않은 경로에 요청'하는 방법을 쓰지 않은 이유는?
   <details><summary>답</summary>실행기는 미등록 요청을 테스트 실패로 처리한다. 등록을 빠뜨린 스크립트 때문에 생긴 틀린 출력이 expectedOutput으로 굳는 것을 막는 안전장치다(`browser-example-runtime.md:201`). 그래서 의도한 네트워크 오류는 `networkError: true`로 등록해 요청 기록에 넣은 뒤 abort하고, 요청되지 않으면 여전히 실패시킨다(`tests/helpers/run-browser-example.ts`).</details>
2. 예제 4를 `fetch(...).then(...).catch(...)`로 두면 왜 '거부는 태스크에서 일어난다'의 증거가 되지 못하는가?
   <details><summary>답</summary>`p`가 이미 거부돼 있어도 순서는 이렇다. 먼저 `then`의 반응 Job이 큐에 들어가고, 다음에 `Promise.resolve().then`의 Job이 들어간다. 첫 Job이 파생 프로미스를 거부한 뒤에야 `catch` Job이 들어가므로 `microtask`가 먼저 나온다. 프로미스 규칙만으로 같은 출력이 나오는 것이다. `p`에 직접 붙이면 이미 거부된 경우 반응이 먼저 나오므로 두 경우가 갈린다(변경 이력 2026-11-10 사용자 검토, `examples/network-error.js`).</details>
3. 실행기가 3xx 상태를 허용했다면 본문의 `ok` 설명에서 무엇이 달라질 수 있나?
   <details><summary>답</summary>지금은 `ok`의 위쪽 경계를 표준(#ok-status)에서 가져왔다고 밝힌다. 3xx를 내면 경계를 실행으로 보일 수 있다. 하지만 기본 redirect mode가 "follow"라서, Location 헤더가 있는 리다이렉트 상태(301·302·303·307·308)는 따라가 최종 상태만 보인다. 헤더 지정 없이 흉내 내면 혼란스러워 제외했다(3절, 본문 ④).</details>
4. `body-used.js`에서 `text()`를 부른 '바로 다음 줄'에 `bodyUsed`를 출력하는 이유는?
   <details><summary>답</summary>`text()`가 끝난 뒤에만 확인하면 '다 읽어야 bodyUsed가 true가 된다'는 틀린 모델과 출력이 같다. 호출 직후 아직 이행되지 않은 시점에 true가 나오면, 읽기 시작(disturbed)이 기준이라는 것을 실행으로 보인다(구현 진행 7단계 M7, 표준 bodyUsed getter).</details>
5. 리소스 유니언에서 응답 모양에 `networkError?: false`를 선언하면 무엇이 깨지는가?
   <details><summary>답</summary>`'networkError' in r` 검사로 TS 좁히기가 되지 않는다. 그러면 `toRunnerInput`과 실행기에서 `r.file` 접근이 타입 오류가 되거나 별도의 판별이 필요하다. 런타임 검사도 '키가 있으면 네트워크 오류 모양'이라는 규칙과 어긋난다(3절 판별, `app/lib/concepts.ts`).</details>

