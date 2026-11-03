# 개념 'script의 async와 defer' 구현 계획

- 상태: 완료
- 작성일: 2026-11-03
- 기준: `main` @ `abb1bd3`

## 0. 요약

- 목적: 38~42장 로드맵 1번 `/concepts/script-async-defer`를 추가한다. 38장의 HTML 파싱 중단과 `async`·`defer`를 첫 `runtime: 'browser'` 예제 8개와 모드 비교표·퀴즈로, WHATWG HTML 표준 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `browser` 첫 개념, order 340으로 학습 순서 36번째·마지막). 개수·마지막 개념 고정 테스트, e2e·빌드 테스트, content-guide e2e 목록, 로드맵을 고친다. 공통 코드와 기존 개념 35개는 바꾸지 않는다(홈에 '브라우저' 그룹이 처음 생기는 것은 기존 코드 동작).
- 위험: ① 테스트에서 넣은 지연(`delayMs`)이 만든 순서를 표준이 보장하는 순서처럼 씀 ② Chromium 결과를 모든 브라우저의 동작처럼 씀 ③ 뒷장(39장 DOM, 40장 이벤트, 48장 모듈) 내용을 전제 → 지연에 의존하는 줄은 본문에 밝히고, 순서 주장은 표준 단계(prepare the script element, the end)로 근거를 대고, 도구로만 쓰는 API는 단순화에 밝힌다.
- 복잡도: 중간 · Consensus: 생략. 직전 개념들과 같은 "실행 검증 표 + 퀴즈" 패턴이고 공통 코드를 바꾸지 않는다. 브라우저 실행기는 직전 커밋에서 검토·검증을 마쳤고, 예제 8개의 출력은 실행기로 10회씩 실행해 모두 같았으며, 핵심 주장은 표준 원문과 대조했다.
- 미확정: 없음(추가 주제 4개·시각화·제목·렌더링 개요 범위는 2026-11-03 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 1번 "script의 async와 defer"(38장)를 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch38-42.md`).
- 사용자 결정(2026-11-03)
  - 기본 범위: ① 보통 `<script>`는 파싱을 멈추고 그때까지 만들어진 DOM만 본다 ② `defer`는 늦게 받아도 문서 순서대로, 파싱이 끝난 뒤 `DOMContentLoaded` 전에 실행된다 ③ `async`는 받는 대로 실행되며 `DOMContentLoaded` 뒤일 수 있고 `load` 전이다.
  - 추가 주제 4개 모두: **인라인 script의 `defer`**(무시되고 즉시 실행), **`async`와 `defer`를 함께**(async로 동작, defer는 옛 브라우저용 대비책), **동적으로 만든 script**(`async`가 기본 true, `async = false`면 넣은 순서), **`innerHTML`로 넣은 script**(실행되지 않음).
  - 시각화: **모드 비교표 + 퀴즈**(방식마다 파싱을 기다리게 하는지·실행 시점·여러 개일 때 순서·`DOMContentLoaded`가 기다리는지. 행마다 근거 예제의 출력 줄을 테스트로 대조).
  - 제목: "script의 async와 defer: 늦게 받은 defer 스크립트는 왜 순서를 지킬까", slug `script-async-defer`.
  - 렌더링 개요: 파서가 HTML을 위에서부터 읽어 DOM을 만든다는 데까지만 짧게 쓰고 예제로 확인한다. CSSOM·렌더 트리·레이아웃·페인트·리플로우는 이름만 언급하고 단순화에 밝힌다.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 파서는 위에서부터 읽으며 DOM을 만든다, 보통 script는 파싱을 멈춘다(예제 1 `parser-blocking.html`): 표준은 async·defer가 없는 외부 클래식 스크립트를 "fetched and evaluated immediately, blocking parsing until these are both complete"라고 적는다. 처리 알고리즘에서는 그 script가 문서의 pending parsing-blocking script가 되고, 받기가 끝나면 파서가 실행한다. 그래서 `<head>`의 script는 `document.body`가 아직 `null`이고, 본문 중간의 script는 그 앞의 `<p>` 하나만 보며, 그 script를 300ms 늦게 응답해도 뒤의 인라인 script가 먼저 실행되지 않는다. script를 `</body>` 바로 앞에 두는 관례의 이유. 파서가 멈춘 동안 브라우저가 뒤쪽 리소스를 미리 받아 둘 수 있다(추측 파싱 — 표준의 speculative HTML parser)는 점과, 스타일시트가 script 실행을 막을 수 있다는 점(style sheet that is blocking scripts)은 단순화에 이름만.
  - ② `defer`: 받기는 파싱과 함께, 실행은 파싱이 끝난 뒤 문서 순서대로(예제 2 `defer-order.html`): 처리 알고리즘에서 defer 외부 클래식 스크립트는 문서의 list of scripts that will execute when the document has finished parsing에 차례로 들어간다. 파싱이 끝나면("the end") readyState를 `interactive`로 바꾸고, 목록의 첫 script가 준비될 때까지 기다렸다 실행하기를 목록이 빌 때까지 반복한 뒤 `DOMContentLoaded`를 보낸다. 그래서 300ms 늦게 응답한 `first.js`가 먼저 받은 `second.js`보다 먼저 실행되고, 둘 다 readyState `interactive`에서 문서 전체(`<p>` 1개)를 보며, `DOMContentLoaded`보다 먼저다. 인라인 script는 그보다 먼저 `loading`에서 실행된다.
  - ③ `async`: 받는 대로 실행(예제 3 `async-order.html`): async 외부 클래식 스크립트는 set of scripts that will execute as soon as possible에 들어가 준비되는 대로 실행된다. 표준은 "evaluated as soon as it is available (potentially before parsing completes)"라고 적는다. 그래서 문서에서 뒤에 있지만 빨리 받은 `fast.js`가 먼저다. "the end"는 `DOMContentLoaded`를 보낸 뒤에 이 집합이 빌 때까지 기다리고 `load`를 보내므로, async는 `DOMContentLoaded`를 붙잡지 않지만 `load`보다는 먼저다. 이 예제에서 `DOMContentLoaded`가 둘보다 먼저 찍히는 것은 두 script를 100ms·400ms 늦게 응답하게 했기 때문이고(숨은 조건, 본문에 밝힘), 지연이 없으면 선후는 정해지지 않는다.
  - ④ 인라인 script의 `defer`(예제 4 `inline-defer.html`): 표준의 속성 적용표에서 인라인 클래식 스크립트는 `async`·`defer`를 쓸 수 없고(·표시), 처리 알고리즘의 목록 분기는 "el has a src attribute, or el's type is module"일 때만 탄다. 그 밖의 경우는 "immediately execute". 그래서 `<script defer>…</script>`는 `loading` 상태에서 그 자리에서 실행되어 뒤의 `<p>`를 보지 못한다(0).
  - ⑤ `async`와 `defer`를 함께(예제 5 `async-and-defer.html`): 처리 알고리즘은 async를 먼저 확인하므로 둘 다 있으면 async다. 표준은 defer를 함께 쓰는 이유를 "legacy web browsers that only support defer (and not async) to fall back to the defer behavior"라고 설명한다. 300ms 늦게 응답한 `both.js`(async defer)가 문서에서 뒤인 `defer-only.js`보다 나중에 실행된다(defer였다면 문서 순서상 먼저).
  - ⑥ 동적으로 만든 script(예제 6 `dynamic-async.js`, 예제 7 `dynamic-in-order.js`): `document.createElement('script')`로 만든 script는 force async 플래그가 처음부터 true다(파서가 만든 script는 파서가 false로 바꿈). `async` getter는 force async가 true면 true를 돌려주므로 `async` 속성을 쓰지 않아도 `true`이고, 받는 대로 실행된다. `async = false`로 바꾸면(setter가 force async를 false로) 파서가 넣지 않은 script의 list of scripts that will execute in order as soon as possible에 들어가 넣은 순서대로 실행된다. 300ms 늦은 `slow.js`가 `fast.js`보다 먼저.
  - ⑦ `innerHTML`로 넣은 script(예제 8 `inner-html.js`): 표준은 innerHTML·outerHTML·insertAdjacentHTML로 넣은 script는 "do not execute at all"이라고 적는다(Trusted Types 기본 정책 예외는 단순화). `innerHTML`로 넣은 script 요소는 DOM에 있지만(1개) 실행되지 않고, `createElement`로 만들어 `append`한 인라인 script는 그 자리에서 실행된다.
  - ⑧ 모드 비교표(표): 3절 표.
  - `DOMContentLoaded`와 `load`, `document.readyState`(`loading` → `interactive` → `complete`)는 ②에서 정의한다(표준 Document `readyState` 설명: "interactive once it is finished parsing but still loading subresources", `DOMContentLoaded`는 "all subresources apart from async script elements have loaded" 시점).

### 유지해야 하는 기존 동작

- 기존 개념 35개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 표는 정적 마크업이라 JS 없이 보인다.
- 홈 '객체' 검색 결과(14개)를 바꾸지 않도록 title·summary·tags에 '객체'를 쓰지 않는다(`app/lib/concepts.ts:90-92`가 이 세 필드만 검색).

### 제외 범위

- CSSOM·렌더 트리·레이아웃·페인트·리플로우·리페인트(이름만), 렌더링 차단(`blocking="render"`, "Block rendering on el")
- `type="module"`(48장 — 모듈은 기본이 defer처럼 동작한다는 한 줄만 단순화에), `nomodule`, import map
- `document.write`, `crossorigin`·`integrity`·`fetchpriority`, preload·`<link rel="preload">`
- 추측 파싱(speculative parsing)·스타일시트가 script를 막는 조건의 상세(단순화에 이름만)
- 정확한 ms·네트워크 성능(순서만 주장)

## 2. 사실과 추정

### 사실 (WHATWG HTML 표준 원문 — html.spec.whatwg.org multipage, 2026-11-03 내려받음: scratchpad `ad/scripting.html`·`parsing.html`·`dom.html`)

- `scripting.html#attr-script-async`: "For external classic scripts, if the async attribute is present, then the classic script will be fetched in parallel to parsing and evaluated as soon as it is available (potentially before parsing completes). If the async attribute is not present but the defer attribute is present, then the classic script will be fetched in parallel and evaluated when the page has finished parsing. If neither attribute is present, then the script is fetched and evaluated immediately, blocking parsing until these are both complete." 모듈은 "The defer attribute has no effect on module scripts".
- 같은 절: "When inserted using the innerHTML and outerHTML attributes, or the insertAdjacentHTML() method, they do not execute at all, unless a Trusted Types default policy's createParserOptions callback enables script execution." / "The defer attribute may be specified even if the async attribute is specified, to cause legacy web browsers that only support defer (and not async) to fall back to the defer behavior instead of the blocking behavior that is the default."
- 속성 적용표("Which other attributes may be specified on a given script element is determined by the following table"): External classic scripts는 async·defer Yes, Inline classic scripts는 async·defer ·(불가).
- force async(`scripting.html`): "A script element has a force async boolean, initially true. It is set to false by the HTML parser and the XML parser on script elements they insert (except when the HTML parser's scripting mode is Fragment), and when the element gets an async content attribute added." `async` getter(`#dom-script-async`): force async가 true면 true, async 속성이 있으면 true, 아니면 false. setter: force async를 false로, 값이 true면 속성 추가, 아니면 제거.
- prepare the script element(`#prepare-the-script-element`): "If el's type is "classic" and el has a src attribute, or el's type is "module"": async 속성이 있거나 force async면 set of scripts that will execute as soon as possible(준비되면 실행) → 아니고 parser-inserted가 아니면 list of scripts that will execute in order as soon as possible(맨 앞부터 차례로) → 아니고 defer가 있거나 module이면 list of scripts that will execute when the document has finished parsing → 그 밖(파서가 넣은 보통 외부 script)은 pending parsing-blocking script. 이 조건이 아닌 경우(인라인 클래식): 스타일시트가 막는 경우를 빼면 "immediately execute the script element el".
- the end(`parsing.html#the-end`): 파싱이 멈추면 readiness를 "interactive"로 → defer 목록의 첫 script가 준비될 때까지 기다렸다 실행하고 빼기를 목록이 빌 때까지 → `DOMContentLoaded` 보내는 태스크 큐 → "Spin the event loop until the set of scripts that will execute as soon as possible and the list of scripts that will execute in order as soon as possible are empty" → load를 늦추는 것이 없을 때까지 → readiness "complete", `load`.
- `dom.html` `document.readyState`: "Returns "loading" while the Document is loading, "interactive" once it is finished parsing but still loading subresources, and "complete" once it has loaded." / "The DOMContentLoaded event fires after the transition to "interactive" but before the transition to "complete", at the point where all subresources apart from async script elements have loaded."

### 사실 (실행 확인 — Playwright 1.64.1 Chromium, 이 저장소의 `runBrowserExample`(`tests/helpers/run-browser-example.ts`)로 settleMs 300, 예제마다 10회 연속 같은 출력)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/7d5bef27-dcef-42c7-91e5-98737f1ce317/scratchpad/ad/ex/`(전문은 문서 끝 "부록: 예제 초안"). 실행 스크립트 `scratchpad/ad/probe3.mts`(실행 1회 평균 약 825ms).

| # | 예제 | resources(지연) | 실제 출력 |
| - | - | - | - |
| 1 | `parser-blocking.html` | `/head.js`(0), `/middle.js`(300) | `head.js true` / `middle.js 1` / `inline 2` |
| 2 | `defer-order.html` | `/first.js`(300), `/second.js`(0) | `inline loading` / `first.js interactive 1` / `second.js interactive` / `DOMContentLoaded` / `load` |
| 3 | `async-order.html` | `/slow.js`(400), `/fast.js`(100) | `DOMContentLoaded` / `fast.js` / `slow.js` / `load` |
| 4 | `inline-defer.html` | 없음 | `inline defer loading 0` / `DOMContentLoaded` |
| 5 | `async-and-defer.html` | `/both.js`(300), `/defer-only.js`(0) | `defer-only.js` / `both.js` |
| 6 | `dynamic-async.js` | `/slow.js`(300), `/fast.js`(0) | `true true` / `fast.js` / `slow.js` |
| 7 | `dynamic-in-order.js` | `/slow.js`(300), `/fast.js`(0) | `false false` / `slow.js` / `fast.js` |
| 8 | `inner-html.js` | 없음 | `1` / `createElement` / `end` |

- 지연이 강제하는 순서와 표준이 강제하는 순서: 예제 1(inline이 middle.js 뒤 — 표준, 지연은 "늦어도 기다린다"를 보이려는 것), 2(first.js가 second.js 앞 — 표준, 지연은 "받은 순서와 무관"을 보이려는 것), 4·8(표준만). 지연에 의존하는 순서: 예제 3의 `fast.js` < `slow.js`와 `DOMContentLoaded`가 둘보다 앞, 예제 5의 `defer-only.js` < `both.js`, 예제 6의 `fast.js` < `slow.js`. 예제 7의 `slow.js` < `fast.js`는 표준(넣은 순서). 본문은 이 구분을 그대로 쓴다.
- 처음 시도에서 동적 예제가 같은 `slow.js`·`fast.js`로 readyState까지 찍었을 때 `interactive`였지만, 지연 0인 script와 파싱 종료의 선후는 강제되지 않으므로 resource는 이름만 찍게 바꿨다(content-guide "지연 차이로 강제되지 않는 순서는 주장하지 않습니다").

### 사실 (코드에서 확인)

- 브라우저 예제 타입·검사: `BrowserExample`(`app/lib/concepts.ts:11-18`), `checkExampleSpec`(`tests/helpers/browser-example.ts:20`) — `.html`은 `<!doctype html>`로 시작, resources는 `.js`, path는 `/`로 시작하는 `.js`이며 `/`·`/example.js` 예약, delayMs 0~1000. 여러 예제가 같은 resource 파일(`slow.js`)을 써도 규칙 위반이 아니다(파일 존재만 검사).
- L1: `tests/examples.test.ts`가 browser 예제가 있으면 `beforeAll`로 Chromium을 띄우고 `it.each`로 차례로 실행(15s 제한). 이 개념이 첫 browser 예제라 처음으로 이 분기가 실제로 돈다.
- 카테고리: `CATEGORY_LABELS`의 `browser: '브라우저'`(`app/lib/concepts.ts:42`), 홈 그룹은 선언 순서대로 개념이 있는 카테고리만(`app/lib/concept-groups.ts:9-15`) → '객체와 프로토타입' 다음에 '브라우저' 그룹이 처음 생긴다. 개념 페이지 상단 분류 라벨은 `ConceptLayout.tsx:26`.
- Shiki: `@shikijs/rehype` 4.5.0은 `langs`를 주지 않으면 번들된 언어 전체를 불러온다(`node_modules/@shikijs/rehype/dist/index.mjs:6`) → ` ```html file=… ` 펜스가 하이라이트된다. 지금까지 `html` 펜스를 쓴 개념은 없다.
- 고정 테스트(개념 수 35·마지막 set-map): `tests/e2e/navigation.spec.ts:78,84,135,161~339`, `tests/e2e/responsive.spec.ts:916`, `app/lib/concepts.test.ts:104-112`, `app/components/concept/ConceptPager.test.tsx:18,27-28`. '객체' 검색 순위 목록 `navigation.spec.ts:96-110`은 바뀌지 않는다.
- 새 개념 폴더는 meta.ts → content.mdx → route.tsx 순으로 만든다(dev 서버가 `./meta` 실패를 캐시하지 않게, 메모리 기록).

### 추정

- npm test 소요가 약 7초 늘 것(예제 8개 × 약 0.83s, 순차 실행) — 근거: probe3 평균. 단계 1에서 측정해 구현 진행에 기록.

## 3. 구현 전략

- set-map과 같은 구성: `meta.ts` + `content.mdx` + `route.tsx`(그대로 복사) + 표 데이터 `mode-table.ts` + `concept.test.ts` + `examples/`. 시뮬레이터 없음.
- 모드 비교표 `mode-table.ts`: 행 8개(보통 외부, `defer`, `async`, `async defer`, 인라인 `defer`, 동적 생성(기본), 동적 생성 `async = false`, `innerHTML`), 열 4개(받는 동안 파서가 기다리나 / 실행 시점 / 여러 개일 때 순서 / `DOMContentLoaded`가 기다리나) + 근거 예제 링크. 각 행은 `evidence: { example: <id>, lines: string[] }`를 가지고, `concept.test.ts`가 그 줄들이 해당 예제 `expectedOutput`에 그 순서로(부분 수열) 들어 있는지 검사한다. `expectedOutput`은 L1이 Chromium으로 대조하므로 "표 → 예제 출력 → 실제 실행"이 이어진다. 파싱 차단·`DOMContentLoaded` 칸 중 예제 출력에 직접 없는 것(보통 script의 `DOMContentLoaded` 칸, 동적 script의 `DOMContentLoaded` 칸)은 표준 단계(prepare the script element·the end) 근거라고 표 앞 문장에 밝힌다.
  - 표 칸(안): 보통 `<script src>` = 기다림 / 받는 즉시 그 자리에서 / 문서 순서 / 예(파싱 중에 실행) · `defer` = 기다리지 않음 / 파싱이 끝난 뒤 / 문서 순서 / 예 · `async` = 기다리지 않음 / 받는 대로 / 받은 순서 / 아니요(`load`는 기다림) · `async defer` = async와 같음 · 인라인 `<script defer>` = 그 자리에서 바로 실행 / 즉시 / 문서 순서 / 예 · 동적 생성 = 해당 없음(파서가 넣지 않음) / 받는 대로 / 받은 순서 / 아니요 · 동적 `async = false` = 해당 없음 / 받은 뒤 넣은 순서대로 / 넣은 순서 / 아니요 · `innerHTML` = 실행되지 않음.
- 퀴즈 6개(`PredictQuiz`): 예제 1(inline이 보는 `<p>` 수가 아니라 middle.js가 보는 수), 2(first.js와 second.js 중 먼저), 3(fast.js가 먼저인가), 4(인라인 defer가 보는 `<p>` 수), 5(both.js와 defer-only.js 중 먼저), 8(innerHTML의 script가 실행되나). 정답·해설은 예제 출력과 같게.
- 코드 블록: 예제 본문 파일은 ` ```html file=./examples/<f>.html `(또는 `js`), resource도 각각 ` ```js file=./examples/<f>.js `로 보이고, 바로 앞 문장에 "테스트에서 `/first.js`를 300ms 늦게 응답하게 했습니다" 식으로 지연을 밝힌다(content-guide `delayMs`는 숨은 조건 규칙).
- 숨은 조건 공통 안내: 동작 원리 머리 또는 예제 절 머리에 "이 페이지의 예제는 테스트가 Chromium에서 열고, 스크립트마다 응답을 일부러 늦춰 받는 순서를 정해 둔다"는 한 단락.
- 뒷장 API: `querySelectorAll`·`getElementById`·`createElement`·`append`·`innerHTML`·`textContent`(39장), `addEventListener`(40장)는 결과를 보이는 도구로만 쓰고 단순화에 밝힌다. `document.readyState`·`DOMContentLoaded`·`load`는 이 페이지에서 정의한다.
- 버린 대안: 타임라인 시뮬레이터(사용자 미선택), 예제 수 줄이기(동적 두 개를 한 파일로 — 두 그룹의 지연이 겹쳐 그룹 간 순서가 강제되지 않아 버림), `settleMs: 0`(모든 출력이 `load` 전에 끝나 가능하지만 숨은 설정이 늘어 기본값 유지).

## 4. 변경 파일

- 추가 `app/concepts/script-async-defer/`
  - `meta.ts`(category `browser`, order 340, examples 8개 runtime `browser`와 resources·delayMs, reviewedAt은 사용자 콘텐츠 승인 날짜), `content.mdx`, `route.tsx`(set-map 그대로), `mode-table.ts`, `concept.test.ts`
  - `examples/`(16개): 부록의 `parser-blocking.html`, `head.js`, `middle.js`, `defer-order.html`, `first.js`, `second.js`, `async-order.html`, `slow.js`, `fast.js`, `inline-defer.html`, `async-and-defer.html`, `both.js`, `defer-only.js`, `dynamic-async.js`, `dynamic-in-order.js`, `inner-html.js`
- 수정
  - `tests/e2e/helpers.ts`: `SCRIPT_ASYNC_DEFER_PATH = '/concepts/script-async-defer'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe(라이트·다크, '정답 확인' 버튼 보인 뒤), 이름 '개념 페이지: script의 async와 defer'
  - `tests/e2e/responsive.spec.ts`: `${SCRIPT_ASYNC_DEFER_PATH}: 가로 스크롤이 없다`, 홈 학습 순서 카드 35→36
  - `tests/e2e/navigation.spec.ts`: 카드 35→36(두 곳), 마지막 '36번째'와 새 제목, pager 분모 35→36 전부, set-map '35 / 36'·링크 2개(이전 spread-destructuring, 다음 script-async-defer), 새 개념 '36 / 36'·이전 링크 set-map. '객체' 검색 순위는 그대로
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 36, 마지막 script-async-defer(prev set-map, position 36)
  - `tests/build/build-output.test.ts`: set-map describe 뒤에 `프리렌더 (script-async-defer)` describe(표 region aria-label 앞부분, 텍스트에 `DOMContentLoaded`, `<details` 6개 이상, html 펜스가 Shiki로 하이라이트됐는지 — `<pre class="shiki` 안에 `&#x3C;script` 또는 `&lt;script` 포함)
  - `docs/content-guide.md:214`: e2e 대상 목록에 `script-async-defer`
  - `.claude/plans/concept-roadmap-ch38-42.md`: 1번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes/`, `tests/helpers/`, 기존 개념 폴더 35개

## 5. 위험 요소

- 지연이 만든 순서를 표준 보장처럼 씀 → 2절 "지연이 강제하는 순서" 구분을 본문 문장과 단순화에 그대로 반영, 리뷰 때 줄마다 대조(단계 3, 리뷰)
- Chromium 결과의 일반화 → 순서 주장마다 표준 단계를 근거로 달고, "결과는 Chromium에서 실행한 값"을 단순화에(단계 3)
- 표 칸이 예제와 어긋남 → `concept.test.ts`의 evidence 부분 수열 검사(단계 2)
- 첫 browser 예제라 L1 분기가 처음 실제로 돈다 → 단계 1에서 `npm test` 3회 연속 통과와 소요 시간 기록. 실패하면 인프라 문제인지 예제 문제인지 나눠 보고(인프라 수정은 이 계획 범위 밖 → 중단 조건)
- npm test 약 +7초 → 기록만(병렬화는 인프라 계획의 추가 개선 후보)
- `html` 코드 펜스: Prettier가 mdx 안 펜스를 건드리지 않는지, remark-code-import가 `.html`을 읽는지, Shiki 하이라이트 → `test:build` 검사와 dev 화면 확인(단계 3·4)
- 본문 코드 블록의 `<script>`가 실제 태그로 들어가면 페이지에서 실행됨 → Shiki가 이스케이프한 코드로 렌더되는지 빌드 결과에서 확인(단계 4 build 테스트)
- 새 '브라우저' 그룹이 홈에 처음 생김 → 홈 관련 e2e(axe·가로 스크롤·no-js 목록) 포함해 실행(6절)
- 뒷장 개념 전제 → 단순화에 39·40·48장 API 명시

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(공통 코드 변경 없음 → 새 페이지 관련만, 단 홈 그룹이 새로 생기므로 홈 테스트 포함): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "script-async-defer|script의 async와 defer|홈"`
- 브라우저(dev 서버, 메인 직접): `/concepts/script-async-defer`에서 ① 상단 분류 라벨 '브라우저' ② html·js 코드 블록 하이라이트, 라이트·다크 ③ 표 375px 가로 스크롤 영역 ④ 퀴즈 6개 정답 확인 ⑤ 홈 분류별 보기에서 '브라우저' 그룹과 카드 1개, 학습 순서 보기 36번째
- 콘텐츠: 모든 표준 인용을 내려받은 원문과 글자 대조, 참고 링크 anchor가 실제로 존재하는지 확인(scratchpad 파일 grep)

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/` 16개, `meta.ts`, `route.tsx`(이 순서)
- 변경: 부록 초안 그대로 복사. `meta.ts`는 2절 표의 resources·delayMs·출력으로 examples 8개, settleMs 생략(기본 300). simplifications·references·goals·prerequisites(`{ label: 'HTML 문서의 기본 구조' }` slug 없음)·related(`global-object`)는 3절·5절 기준. content.mdx는 이 단계에서 필수 h2 3개만 있는 임시본.
- 완료 조건: `npm test` 3회 연속 통과(L1 browser 8개 포함), 소요 시간 기록, 무결성(`checkExampleSpec` 위반 0), `expectedOutput`을 일부러 바꾸면 실패하는 것 1회 확인 후 원복

### 2. 표 데이터와 테스트

- 대상: `mode-table.ts`, `concept.test.ts`
- 변경: 3절 표 8행, evidence 부분 수열 검사, 행의 example id가 meta에 있는지 검사
- 완료 조건: `npx vitest run app/concepts/script-async-defer` 통과, evidence 줄 하나를 바꾸면 실패(음성 확인)

### 3. 본문 작성

- 대상: `content.mdx`, `meta.ts`(summary·goals·simplifications·references 확정)
- 변경: 1절 주제 ①~⑧ 순서, 퀴즈 6개, 지연 안내, 표는 `mode-table.ts`에서 렌더(set-map 표 마크업 패턴)
- 주의: '객체'를 title·summary·tags에 쓰지 않는다. 표준 인용은 원문 그대로 영어로, 번역은 따로. 뒷장 API는 단순화.
- 완료 조건: lint·format:check·typecheck·npm test 통과, 표준 인용 글자 대조 완료, dev 화면 6절 ①~④ 확인

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 완료 조건: `npm test`, `npm run test:build`, 6절 e2e 통과, 6절 ⑤ 확인

## 변경 이력

- 2026-11-03 (구현 중 사실): 단계 1 완료 조건 "`npm test` 3회 연속 통과"는 개념 수·마지막 개념 고정 테스트 4개(`concepts.test.ts`·`ConceptPager.test.tsx`)가 단계 4 전까지 실패하므로, 단계 1에서는 `tests/examples.test.ts`·`tests/content-integrity.test.ts` 3회 연속 통과로 확인하고 전체 `npm test` 3회 연속·소요 시간 기록은 단계 4 완료 조건으로 옮긴다 — 영향 단계 1·4
- 2026-11-03 (사용자 전달 외부 검토 6건, 실행·표준으로 확인 후 반영): ① `DOMContentLoaded` 설명에 "표준 문장은 요약이고 the end 단계에서 그보다 먼저 와야 하는 것은 파싱 완료와 defer 목록뿐, 이미지처럼 파서가 기다리지 않는 리소스는 load만 늦춘다" 추가(표준 images.html updating the image data "must delay the load event", Chromium 직접 확인: 800ms 늦춘 이미지가 `DOMContentLoaded` 때 `complete` false, `load` 때 true) ② the end 2단계에 스타일시트 조건 생략 괄호 ③ 비교표 동적 행 이름을 외부(src) 스크립트로 한정, 동적 인라인 script는 붙이는 즉시 실행(예제 8)이라고 본문에 한 줄 ④ 예제 8 설명에 "인라인 script에 옮기면 문자열 속 `</script>`가 요소를 닫으므로 `<\/script>`로 쓴다"(Chromium 확인: 그대로 두면 pageerror "Invalid or unexpected token", `<\/script>`면 정상) ⑤ 동적 script의 `defer = true`는 효과가 없다 — 문장만으로는 실행 검증 없는 주장이 되므로 **예제 9 `dynamic-defer.js`와 비교표 9행을 추가**(Chromium 5회: `true true true true` / `fast.js` / `slow.js`, `async = false`+`defer = true`는 `defer` 없을 때와 같은 넣은 순서) ⑥ 예제 6·7 퀴즈 추가(퀴즈 8개, 빌드 테스트 `<details` ≥ 8) — 영향 단계 1·2·3·4

- 2026-11-03 (사용자 전달 추가 검토 3건): 예제 8 퀴즈 추가(퀴즈 9개, 빌드 테스트 `<details` ≥ 9), `DOMContentLoaded` 보강 문장에 "(2단계에서 생략한 스타일시트 조건은 제외)", 비교표에 동적 인라인 script 행 추가(10행, 근거 예제 9의 `createElement`·`end`) — 예제 9가 두 행의 근거가 되어 `concept.test.ts`의 "예제마다 정확히 한 행"을 "모든 예제가 한 행 이상의 근거"로 바꾸고, 본문 표 key 중복 방지(mode+note) 검사와 innerHTML 코드가 출력되지 않는다는 검사를 추가. innerHTML 행 evidence는 `1`·`end`로 — 영향 단계 2·3·4
## 부록: 예제 초안

### `parser-blocking.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script src="/head.js"></script>
</head>
<body>
<p>첫째 문단</p>
<script src="/middle.js"></script>
<p>둘째 문단</p>
<script>
console.log('inline', document.querySelectorAll('p').length);
</script>
</body>
</html>
```

### `head.js`

```js
console.log('head.js', document.body === null);
```

### `middle.js`

```js
console.log('middle.js', document.querySelectorAll('p').length);
```

### `defer-order.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script defer src="/first.js"></script>
<script defer src="/second.js"></script>
</head>
<body>
<p>본문</p>
<script>
document.addEventListener('DOMContentLoaded', () => console.log('DOMContentLoaded'));
window.addEventListener('load', () => console.log('load'));
console.log('inline', document.readyState);
</script>
</body>
</html>
```

### `first.js`

```js
console.log('first.js', document.readyState, document.querySelectorAll('p').length);
```

### `second.js`

```js
console.log('second.js', document.readyState);
```

### `async-order.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script async src="/slow.js"></script>
<script async src="/fast.js"></script>
</head>
<body>
<script>
document.addEventListener('DOMContentLoaded', () => console.log('DOMContentLoaded'));
window.addEventListener('load', () => console.log('load'));
</script>
</body>
</html>
```

### `slow.js`

```js
console.log('slow.js');
```

### `fast.js`

```js
console.log('fast.js');
```

### `inline-defer.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
</head>
<body>
<script defer>
console.log('inline defer', document.readyState, document.querySelectorAll('p').length);
</script>
<p>본문</p>
<script>
document.addEventListener('DOMContentLoaded', () => console.log('DOMContentLoaded'));
</script>
</body>
</html>
```

### `async-and-defer.html`

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<script async defer src="/both.js"></script>
<script defer src="/defer-only.js"></script>
</head>
<body>
</body>
</html>
```

### `both.js`

```js
console.log('both.js');
```

### `defer-only.js`

```js
console.log('defer-only.js');
```

### `dynamic-async.js`

```js
var slow = document.createElement('script');
slow.src = '/slow.js';
var fast = document.createElement('script');
fast.src = '/fast.js';
console.log(slow.async, fast.async);
document.head.append(slow, fast);
```

### `dynamic-in-order.js`

```js
var slow = document.createElement('script');
slow.src = '/slow.js';
slow.async = false;
var fast = document.createElement('script');
fast.src = '/fast.js';
fast.async = false;
console.log(slow.async, fast.async);
document.head.append(slow, fast);
```

### `inner-html.js`

```js
var box = document.createElement('div');
document.body.append(box);
box.innerHTML = '<script>console.log("innerHTML")</script>';
console.log(box.querySelectorAll('script').length);
var script = document.createElement('script');
script.textContent = 'console.log("createElement")';
box.append(script);
console.log('end');
```


## 구현 진행

- baseline (2026-11-03, `abb1bd3`): lint·format:check·typecheck 통과 / `npm test` 103 files·3309 tests 통과, Duration 16.43s. test:build·e2e는 직전 커밋 검증에서 통과(286 / 471 passed·3 skipped).
- [x] 1. 예제·meta·route — 메인 확인: `examples/` 16개가 scratchpad 초안과 `diff -r` 동일, `route.tsx`는 set-map과 동일, meta 8개 예제의 resources·delayMs·expectedOutput이 2절 표와 일치(summary 147자, '객체' 없음). `tests/examples.test.ts`+`content-integrity.test.ts` 3회 연속 746 통과(7.33s·7.30s·7.27s), browser 예제 8개 각 576~997ms. 음성 확인: defer-order 기대값 한 줄을 바꾸면 그 예제만 실패 → 원복. 전체 `npm test`는 고정 테스트 4개만 실패(단계 4 대상)
- [x] 2. 표 데이터와 테스트 — 메인 확인: `mode-table.ts` 8행·4열이 3절과 일치, `concept.test.ts` 13개(구조 3, 행별 evidence 부분 수열 8, DOMContentLoaded 칸 2) 메인 재실행 13 통과. 서브에이전트 음성 확인: async 행 evidence 순서를 바꾸면 그 행만 실패 → 원복
- [x] 3. 본문 — 메인이 `content.mdx` 전문을 읽고 대조: 표준 인용 7개가 내려받은 원문과 같음, "the end" 6단계 서술, 인라인 분기 조건, 줄 번호(예제 6·7·8) 직접 셈, 지연 의존/표준 강제 구분이 2절과 일치, 퀴즈 6개 정답이 `expectedOutput`과 같음. meta는 단계 1 초안 유지(참고 링크 앵커 7개는 내려받은 표준에서, MDN 3개는 HTTP 200 확인). 메인 수정: 빌드 결과 화면에서 6열 표가 1280px에서도 본문 폭을 넘어 마지막 열이 잘려 `<Wide>`로 감쌈(content-guide의 넓은 표 부품, 개념 중 첫 사용) → 데스크톱 6열 모두 보이고 375px는 표 영역 안 가로 스크롤, 문서 가로 스크롤 없음(375·1280). 화면(빌드 결과 serve): 분류 라벨 '브라우저', html·js 코드 하이라이트(라이트·다크), 홈 그룹 `언어 기초·실행 모델·객체와 프로토타입·브라우저`에 브라우저 카드 1개
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — 메인이 diff 확인(36개·마지막 script-async-defer, set-map pager 35/36·다음 링크, '객체' 검색 그대로, a11y·responsive 추가, content-guide e2e 목록, 로드맵 1번 '구현 중'). 메인 수정: 빌드 테스트의 html 펜스 검사가 `&lt;script`를 붙여 찾았으나 Shiki가 `&lt;`와 `script`를 다른 span으로 나눠 사이 태그를 건너뛰게 고침. 전체 `npm test` 3회 연속 통과(104 files·3343 tests, 18.46s·16.55s·17.58s — baseline 16.43s 대비 +0~2s. 예제 파일이 다른 테스트 파일과 병렬이라 계획 추정 +7s보다 작음)
- 전체 검증(2026-11-03, `<Wide>` 수정 뒤): lint·format:check·typecheck 통과, `npm test` 3343 통과(16.67s), `test:build` 294 통과, `navigation.spec.ts` 16 passed, `-g "script-async-defer|script의 async와 defer|홈"` 31 passed·1 skipped(기존 조건부)

- 리뷰 1차(critical-code-review, 메인 직접 — 본문 전문·표 데이터·테스트·고정 테스트 diff): Critical/High/Medium 0 · Low 2(보고만) — ① 표 첫 열이 `note.startsWith('로')`일 때만 공백 없이 붙이는 분기(`content.mdx`)는 note 문구에 기대는 서식 규칙이라, 다른 조사로 시작하는 note가 생기면 함께 고쳐야 함 ② 예제 5 퀴즈 오답 중 한 줄짜리 보기 2개(`defer-only.js`, `both.js`)는 '한쪽이 실행되지 않는다'는 오해를 겨냥한 것으로 유지
- 외부 검토 반영(변경 이력 마지막 항목, 메인이 실행·표준으로 6건 확인 후 서브에이전트에 위임): 예제 9개(`dynamic-defer.js` 추가, innerHTML은 예제 9), 비교표 9행, 퀴즈 8개. 메인 확인: 새 예제가 초안과 동일, 바뀐 문단·퀴즈 정답·예제 번호 참조 대조, `'<\/script>'` 백슬래시 1개. 검증: lint·format:check·typecheck 통과, `npm test` 3회 연속 3345 통과(16.81s·18.41s·16.90s), `test:build` 294 통과(`<details` 8개), navigation 16 passed, `-g` 31 passed·1 skipped. 재리뷰: 새 Critical/High/Medium 없음
- 추가 검토 반영(메인 직접 수정, 데이터·테스트·본문 몇 줄): `concept.test.ts` 17개 통과, 음성 확인(새 행 evidence 순서를 바꾸면 그 행만 실패 → 원복). lint·format:check·typecheck 통과, `npm test` 3회 연속 3348 통과(18.15s·20.55s·19.02s), `test:build` 294 통과(`<details` 9개), navigation 16 passed, `-g` 31 passed·1 skipped, 빌드 화면 1280px 10행 표 잘림 없음·375px 문서 가로 스크롤 없음

## 구현 결과

### 계획 대비 실제 구현

- 계획의 예제 8개·비교표 8행·퀴즈 6개로 구현한 뒤, 사용자가 전달한 외부 검토 두 차례를 반영해 예제 9개(`dynamic-defer.js` 추가), 비교표 10행(동적 `defer`·동적 인라인 행 추가), 퀴즈 9개가 됐다(변경 이력).
- 단계 1의 "`npm test` 3회 연속" 완료 조건은 고정 테스트 때문에 단계 4로 옮겼다(변경 이력).
- 계획에 없던 수정: 6열 표가 데스크톱에서도 잘려 `<Wide>`로 감쌈(개념 중 첫 사용), 빌드 테스트의 html 펜스 검사를 Shiki 토큰 분리에 맞춤, `concept.test.ts`의 예제-행 일대일 검사를 "한 행 이상"으로 완화.
- `npm test` 소요는 계획 추정(+7s)과 달리 baseline 16.43s 대비 +0~4s(브라우저 예제 파일이 다른 테스트 파일과 병렬).

### 코드 리뷰

- Critical/High/Medium 0. Low 1건 유지: 표 첫 열이 note가 '로'로 시작할 때만 공백 없이 붙이는 서식 분기. 예제 5 퀴즈의 한 줄짜리 오답은 의도대로 유지.

### 후속 작업

- [ ] 기존 페이지에서 이 개념으로의 역방향 링크(나중에 일괄 처리하기로 한 목록에 추가)
- [ ] 표 첫 열 note 서식 분기(`startsWith('로')`)는 다른 조사로 시작하는 note가 생기면 데이터 쪽 표기로 바꾸기

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 외부 검토 5번("동적 script의 `defer`는 효과가 없다"를 한 문장 추가)을 문장만이 아니라 예제 9 `dynamic-defer.js`와 비교표 행으로 반영 — 대안: 문장만 추가. 이유: 실행 결과 주장은 실제 실행으로 검증한다는 원칙(AGENTS.md)에 따라, 문장만 넣으면 테스트가 확인하지 않는 주장이 된다.
- [Claude 판단] 비교표를 `<Wide>`로 감쌈 — 대안: 열을 줄이거나 그대로 가로 스크롤. 이유: 6열 표가 1280px에서도 본문 폭을 넘어 마지막 열이 잘렸고, content-guide가 넓은 표용으로 둔 공통 부품이 있다.
- [Claude 판단] `concept.test.ts`의 "예제마다 정확히 한 행" 검사를 "모든 예제가 한 행 이상의 근거"로 완화하고 행 key 중복·innerHTML 미출력 검사를 추가 — 이유: 동적 인라인 행과 innerHTML 행이 같은 예제 9를 근거로 쓴다. 모든 행이 실행된 출력에 묶인다는 보장은 유지된다.
- [무검토 승인] 비교표 행마다 근거 예제의 출력 줄을 두고, 그 줄이 `expectedOutput`에 순서대로(부분 수열) 있는지 테스트 — 이유: `expectedOutput`은 L1이 Chromium으로 대조하므로 "표 → 예제 출력 → 실제 실행"이 이어진다. 출력에 없는 칸(파서 대기, 일부 DOMContentLoaded 칸)은 표준 단계가 근거라고 본문에 밝힌다.
- [무검토 승인] 순서를 "표준이 강제하는 것"과 "테스트 지연 때문에 생긴 것"으로 나눠 본문 한 절로 정리 — 이유: `delayMs`는 페이지에 보이지 않는 숨은 조건이라, 구분하지 않으면 async끼리의 순서나 async와 DOMContentLoaded의 선후를 표준 보장처럼 읽게 된다.
- [무검토 승인] 동적 예제가 불러오는 `slow.js`·`fast.js`는 이름만 찍게 함(초안에서 readyState 제거) — 이유: 지연 0인 script와 파싱 종료의 선후는 강제되지 않아 readyState 값은 주장할 수 없는 결과다.
- 추가 주제 4개·모드 비교표+퀴즈·제목·렌더링 개요 범위는 사용자가 정했고, 외부 검토 9건(두 차례)은 사용자가 전달했다.

#### 배경지식

- WHATWG HTML의 prepare the script element는 외부 클래식 script를 async(또는 force async) → 파서가 넣지 않음 → defer → 그 밖(파서 차단) 순서로 판정해 각각 다른 목록에 넣는다. 인라인 클래식 script는 이 분기에 들어가지 않고 즉시 실행된다.
- 파싱이 끝나면 "the end"가 readiness를 interactive로 바꾸고 defer 목록을 문서 순서대로 실행한 뒤 DOMContentLoaded를 보내고, 그 뒤에 async·in-order 목록이 빌 때까지 기다렸다 load를 보낸다. 그래서 defer는 DOMContentLoaded 전, async는 DOMContentLoaded와의 선후가 정해지지 않지만 load 전이다.
- `createElement('script')`로 만든 요소는 force async가 처음부터 true라 `async`가 true로 보인다. `async = false`(setter가 force async를 false로)면 넣은 순서 목록에 들어가고, `defer = true`는 force async를 바꾸지 않아 효과가 없다.
- Shiki는 `<script`를 `&lt;`와 `script`의 서로 다른 span으로 나눠 출력해, 빌드 결과에서 코드 문자열을 찾을 때 사이 태그를 건너뛰어야 한다.

#### 확인 질문

1. 예제 3에서 `DOMContentLoaded`가 `fast.js`보다 먼저 찍히는데, 이것을 표준 보장이라고 쓰지 않은 이유는?
   <details><summary>답</summary>"the end"는 DOMContentLoaded를 보낸 뒤에야 async 집합이 빌 때까지 기다리므로 DOMContentLoaded가 async를 기다리지 않는다는 것만 정해져 있다. 둘의 선후는 script가 도착하는 시간에 달려 있고, 이 예제는 `/fast.js`를 100ms 늦춰 파싱이 먼저 끝나게 했을 뿐이다. 표준이 강제하는 것은 async가 load보다 먼저라는 점이다. (본문 "표준이 강제하는 순서와 지연 때문에 생긴 순서", 계획 2절)</details>
2. 예제 2의 `first.js`를 300ms 늦게 응답하게 한 지연은 무엇을 보이려는 것이고, 지연을 없애면 출력이 바뀌는가?
   <details><summary>답</summary>defer는 받은 순서와 무관하게 문서 순서로 실행된다는 것을 보이려는 것이다. defer 목록의 첫 script가 준비될 때까지 기다렸다 실행하므로 지연을 없애도 `first.js` → `second.js` 순서는 같다. (계획 2절 "지연이 강제하는 순서와 표준이 강제하는 순서")</details>
3. 동적 script에 `defer = true`를 대입해도 효과가 없다는 것을 예제 8의 출력은 어떻게 보여 주는가?
   <details><summary>답</summary>첫 줄 `true true true true`로 `defer`를 대입해도 `async`가 여전히 true(force async 그대로)임을 보이고, 실행 순서가 넣은 순서(`slow.js` 먼저)가 아니라 지연이 정한 도착 순서(`fast.js` 먼저)라서 defer 분기에 들어가지 않았음을 보인다. 선후 자체는 지연이 정한 것이라 "defer가 무시된다"까지만 표준 근거로 쓴다. (본문 결과와 이유 예제 8)</details>
4. 비교표의 칸이 실제 동작과 어긋나는 것을 무엇이 막고, 그 사슬이 닿지 않는 칸은 어디인가?
   <details><summary>답</summary>행마다 근거 예제의 출력 줄이 `expectedOutput`에 순서대로 있는지 `concept.test.ts`가 검사하고, `expectedOutput`은 `tests/examples.test.ts`가 Chromium에서 대조한다. 출력으로 직접 보이지 않는 칸(파서가 기다리는지, 보통·동적 script의 DOMContentLoaded 칸)은 표준 단계가 근거이고 본문 표 앞 문장에 그렇게 밝혔다. (`mode-table.ts` 주석, 본문 "모드 비교표로 정리")</details>
5. `concept.test.ts`의 "예제마다 정확히 한 행" 검사를 왜 완화했고, 완화해도 잃지 않는 보장은 무엇인가?
   <details><summary>답</summary>동적 인라인 행과 innerHTML 행이 같은 예제 9를 근거로 쓰게 되어 일대일이 성립하지 않는다. 모든 행의 근거가 meta 예제이고 그 줄이 출력에 순서대로 있다는 검사, 모든 예제가 한 행 이상의 근거라는 검사는 그대로라 표 전체가 실행 결과에 묶인다. 대신 행 key 중복 검사와 innerHTML 코드 미출력 검사를 더했다. (변경 이력 마지막 항목)</details>

