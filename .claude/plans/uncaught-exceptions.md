# 잡히지 않은 예외 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-23
- 기준: `main` @ `ad57b07`

## 0. 요약
- 목적: "한 스크립트에서 예외가 나도 다음 스크립트는 왜 실행될까"를 묻는 `uncaught-exceptions` 페이지를 추가한다(order 472, 학습 순서 75번째/77, browser). 파서가 실행하는 스크립트 요소는 하나씩 따로 실행되고, 잡히지 않은 예외는 그 스크립트만 멈춘 뒤 "report an exception"으로 전역 `error` 이벤트가 된다. 본문 실행 전에 만들어진 바인딩이 남는 방식, 리스너의 예외, `onerror`의 `return true`까지 HTML·DOM 표준과 Chromium 실행으로 보인다.
- 범위: 새 개념 폴더(browser 예제 6개, 비교표 1개, 퀴즈 6개, 시뮬레이터 없음)를 추가한다. error-handling·prevent-default-stop-propagation의 "다루지 않음" 문장을 연결한다. 75번째 이후 순위 +1 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: "선언이 남는다"·"다음 스크립트와 체크포인트가 이어진다"를 조건 없이 일반화할 수 있다(블록 안 함수 선언, 동적으로 넣은 스크립트는 다름). error-handling과 겹치거나 표준이 정하지 않은 것(메시지 문자열)을 주장할 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: MEDIUM 1·LOW 7, Critic REVISE: HIGH 1·MEDIUM 4·LOW 5. 메인이 Chromium 실행기와 표준 사본으로 재확인해 모두 반영했다)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-23)
  - 추가 게시글 로드맵 4의 3번이다(`.claude/plans/concept-roadmap-extras-4.md`). order 472(`error-handling` 470과 `async-generator` 475 사이).
  - 범위 네 가지를 모두 넣는다: script 단위 실행, 남는 선언, 리스너의 예외, `onerror`의 `return true`.
  - 시각화: 표 + 퀴즈(시뮬레이터 없음).
- [Claude 판단] 새 페이지 메타
  - `app/concepts/uncaught-exceptions/`, slug `uncaught-exceptions`, category `execution`(error-handling과 같음), order 472, `reviewedAt: null`.
  - title: "잡히지 않은 예외: 한 스크립트에서 예외가 나도 다음 스크립트는 왜 실행될까"
  - 표기: 기존 본문(microtask-queue 등)이 "스크립트 요소"를 쓰므로 "스크립트"로 통일한다. 코드·명세 용어(`<script>`, classic script)만 원문을 쓴다.
  - summary(151자, "객체" 없음 → 홈 "객체" 검색 결과 수 19 유지): "스크립트 요소는 하나씩 따로 실행되어, 잡히지 않은 예외는 그 스크립트만 멈추고 전역 error 이벤트로 보고된 뒤 다음 스크립트가 실행됩니다. 실행 전에 만들어진 var와 최상위 함수 선언은 남고 let은 계속 TDZ입니다. 리스너의 예외와 onerror도 확인합니다."
  - tags("객체" 금지): `잡히지 않은 예외`, `uncaught exception`, `error 이벤트`, `report an exception`, `onerror`, `스크립트 요소`, `ErrorEvent`, `TDZ`.
  - goals(4개, 백틱 금지)
    1. 파서가 실행하는 스크립트 요소는 하나씩 따로 실행되어, 잡히지 않은 예외는 그 스크립트의 나머지 코드만 멈추고 전역 error 이벤트로 보고된 뒤 (실행 컨텍스트 스택이 비면) 마이크로태스크 체크포인트와 다음 스크립트가 이어진다는 것을 예측할 수 있다.
    2. 문법 오류가 있는 스크립트는 한 줄도 실행되지 않고 선언도 만들어지지 않지만, 실행 중 예외가 난 스크립트는 본문 실행 전에 만든 var·최상위 함수 바인딩이 남고 let·const·class 바인딩은 초기화되지 않은 채 남는다는 것을 명세의 ScriptEvaluation과 GlobalDeclarationInstantiation으로 설명할 수 있다.
    3. 리스너가 던진 예외는 디스패치를 부른 코드로 전파되지 않고 보고되며 다음 리스너가 실행된다는 것을 예측할 수 있다.
    4. 전역의 onerror 이벤트 핸들러는 인수 다섯 개를 받고 true를 반환해야 이벤트가 취소된다는 것을 다른 이벤트 핸들러와 비교해 설명할 수 있다.
  - prerequisites: try/catch/finally(`error-handling`), 호이스팅(`hoisting`), TDZ(`tdz`), 마이크로태스크 큐(`microtask-queue`), 기본 동작과 전파 막기(`prevent-default-stop-propagation`). 모두 472보다 앞이다.
  - related: `error-handling`, `hoisting`, `tdz`, `microtask-queue`, `prevent-default-stop-propagation`, `event-propagation-delegation`, `script-async-defer`, `global-object`, `execution-context`, `promise`.
- 용어 규칙
  - "잡히지 않은 예외"는 try/catch에 잡히지 않고 script·콜백 밖으로 나온 예외를 뜻한다. 첫 등장 때 정의한다.
  - "보고한다"는 HTML 표준의 "report an exception"이다. 브라우저 콘솔에 찍힌다는 것은 표준이 "may"로 적으므로 단정하지 않는다(취소하지 않았을 때 사용자 에이전트가 콘솔에 보고할 수 있다).
  - 선언이 남는 이유는 명세 단계로 설명한다: ScriptEvaluation은 GlobalDeclarationInstantiation으로 바인딩을 먼저 만든 뒤 본문을 평가한다. var는 undefined로, 스크립트 최상위의 함수 선언(제너레이터·async 포함)은 함수 객체로 초기화되고 let·const·class는 만들어지기만 한다. 평가가 예외로 끝나도 만든 바인딩은 전역 환경에 그대로 있다. "엔진이 메모리에 남긴다" 식으로 쓰지 않는다.
  - "예외 전에 만들어진 선언"이라고 쓰지 않는다(소스에서 예외 줄 앞의 선언으로 읽힌다). 바인딩은 줄 위치와 상관없이 본문 실행 전에 모두 만들어진다(예제 3의 `after`·`later`는 `null.x` 뒤에 있다). "본문 실행 전에 만들어진 바인딩"으로 쓴다.
  - 블록 안 함수 선언은 sloppy mode 웹 호환 의미론(부록 B) 때문에 var 바인딩만 undefined로 생기고 값은 블록을 평가할 때 들어가므로, 예외가 블록보다 앞이면 undefined로 남는다(탐침 a-block). 본문은 "최상위"로 한정하고 블록 함수 선언은 simplifications에 밝힌다.
  - error 이벤트의 `message`·`filename`·`lineno`·`colno` 값은 출력하지 않는다(메시지 문자열은 브라우저마다 다르다). `event.error.name`만 출력한다.
  - 언어(ECMAScript)와 호스트(HTML·DOM)를 구분한다: script를 하나씩 실행하고 예외를 보고하는 것은 HTML, 리스너 예외를 보고하는 것은 DOM, 바인딩을 먼저 만드는 것은 ECMAScript다.
- 첫 문단의 답(첫 평문 줄에 백틱 금지)
  - 첫 줄(평문만): 브라우저는 HTML을 파싱하면서 만나는 스크립트 요소를 하나씩 따로 실행합니다. 한 스크립트에서 잡히지 않은 예외가 나면 그 스크립트의 나머지 코드만 실행되지 않고, 예외는 전역 error 이벤트로 보고된 뒤 다음 스크립트가 실행됩니다.
  - 둘째 문장부터: 본문 실행 전에 만들어진 바인딩은 남는다는 것, 리스너의 예외도 같은 방식으로 보고된다는 것을 예고한다.
- 동작 원리 절(h3 5개)
  1. "스크립트 요소마다 따로 실행된다"
     - HTML의 run a classic script: 스크립트마다 ScriptEvaluation을 부르고, 결과가 abrupt completion이면(rethrow errors가 false인 기본 경우) report an exception을 한 뒤 clean up after running script를 한다. 인용 후보: "Report an exception given by evaluationStatus.[[Value]]" (단어 수 확인).
     - clean up after running script: 실행 컨텍스트 스택이 비면 마이크로태스크 체크포인트. prepare to run script가 넣은 realm 실행 컨텍스트가 clean up 전까지 스택에 있으므로, error 리스너가 모두 끝난 뒤 clean up에서 체크포인트가 일어난다. 그래서 예제 1에서 `then`이 error 이벤트 뒤, 다음 스크립트 앞이다([마이크로태스크 큐](/concepts/microtask-queue) 링크, 그 페이지 예제 5 "스크립트 요소 사이에서 체크포인트").
     - 이 순서는 파서가 실행하는 스크립트의 경우다. 다른 스크립트가 `appendChild`로 넣은 인라인 스크립트는 그 자리에서 실행되어, 예외는 보고되지만 넣은 쪽 코드가 이어지고 스택이 비지 않아 그 사이 체크포인트가 없다(탐침 b-dynamic: `inner`, `E TypeError`, `append 뒤`, `then`). 본문은 파서가 실행하는 스크립트로 한정하고 simplifications에 밝힌다.
     - report an exception: 전역 객체에 cancelable한 ErrorEvent `error`를 발화한다. 리스너는 동기로 실행된다(디스패치). 취소 여부와 콘솔 보고는 [try/catch/finally](/concepts/error-handling)에서 본 그대로다.
     - 예제 1.
  2. "문법 오류는 실행 전에 걸린다"
     - create a classic script: ParseScript가 오류 목록을 돌려주면 스크립트의 parse error와 error to rethrow를 그 첫 오류로 정한다. run a classic script는 error to rethrow가 있으면 ScriptEvaluation을 부르지 않고 그 오류를 보고한다. 그래서 오류 줄 앞의 코드도, 그 스크립트의 선언도 없다.
     - 예제 2.
  3. "본문 실행 전에 만들어진 바인딩은 남는다"
     - ScriptEvaluation이 GlobalDeclarationInstantiation을 먼저 하고 본문을 평가한다. var는 undefined로, 스크립트 최상위의 함수 선언은 함수 객체로 초기화하고, let·const·class는 초기화되지 않은 바인딩으로 만든다. 바인딩은 줄 위치와 상관없이 본문 실행 전에 모두 만들어진다.
     - 예외로 평가가 끝나면 `var after = 2`의 대입과 `let late = 3`의 초기화는 실행되지 않는다. `after`는 undefined, `later`는 함수, `late`는 초기화되지 않아 다음 스크립트에서 읽으면 ReferenceError다([TDZ](/concepts/tdz)). 그 `let` 문은 다시 평가되지 않으므로 `late`는 계속 초기화되지 않은 채다.
     - 이 이름은 다시 선언할 수도 없다. 이것은 예외 때문이 아니라 전역 렉시컬 선언의 규칙이다: 앞 스크립트가 정상으로 끝났어도 GlobalDeclarationInstantiation이 HasLexicalDeclaration을 보고 SyntaxError를 던진다. 이 검사는 바인딩을 만들기 전에 하므로 실패한 스크립트는 같은 스크립트의 `var fresh`도 만들지 않는다(예제 3 마지막 줄 `다음 스크립트 undefined`, 탐침 c-atomic). 이 SyntaxError도 run a classic script가 보고하므로 error 이벤트가 되고, 다음 스크립트는 실행된다(파싱 오류가 아니라 실행 전 선언 단계의 오류).
     - [호이스팅](/concepts/hoisting), [실행 컨텍스트](/concepts/execution-context) 링크.
     - 예제 3.
  4. "리스너의 예외는 다음 리스너를 막지 않는다"
     - DOM inner invoke: 리스너 호출이 예외를 던지면 그 리스너의 전역 객체에 report an exception을 하고 다음 리스너로 넘어간다. 그래서 `click()`을 부른 코드로 예외가 전파되지 않는다.
     - 예제 4. 리스너 순서와 디스패치는 [이벤트 전파와 위임](/concepts/event-propagation-delegation) 링크.
     - 타이머 콜백의 예외는 Web IDL 콜백 호출의 "report"를 거쳐 같은 report an exception 단계에 닿는다([try/catch/finally](/concepts/error-handling) 예제 10). then 콜백의 예외는 보고되지 않는다. 프로미스 반응 Job이 핸들러의 throw completion을 then이 돌려준 프로미스의 거부로 바꾸기 때문이다([프로미스](/concepts/promise)에서 다룸, 처리되지 않으면 [try/catch/finally](/concepts/error-handling)의 unhandledrejection). 대비용으로 예제 6 하나만 두고 설명은 링크로 넘긴다.
  5. "onerror는 true를 반환해야 취소된다"
     - HTML 이벤트 핸들러 처리 알고리즘: event가 ErrorEvent이고 type이 error이고 currentTarget이 WindowOrWorkerGlobalScope를 구현하면 special error event handling. 콜백을 « message, filename, lineno, colno, error » 다섯 인수로 부르고, 반환값이 true이면 canceled flag를 세운다. 다른 경우는 false이면 세운다([기본 동작과 전파 막기](/concepts/prevent-default-stop-propagation)의 return false 절 링크).
     - `addEventListener` 리스너의 반환값은 쓰이지 않는다(그 페이지에서 다룸). report an exception의 Note "Returning true in an event handler cancels the event" 인용 후보.
     - 예제 5: onerror가 true를 반환하면 뒤 리스너가 본 defaultPrevented가 true, false를 반환하면 false. onerror 핸들러는 처음 대입할 때 리스너 목록에 자리가 정해지고 다시 대입해도 자리는 그대로라서 두 번 모두 뒤 리스너보다 먼저 불린다(이벤트 전파와 위임 링크).
- 예제(아래 판 그대로 저장소의 브라우저 실행기 `runBrowserExample`로 Chromium에서 실행해 출력을 확인했다). 모두 문서 전체 `.html`이다. 공통 머리: `<!doctype html>`, `<html lang="ko">`, `<head><meta charset="utf-8"></head>`, `<body>`.
  1. `script-stops.html` → `1 시작`, `error 이벤트 TypeError`, `then`, `2 실행`
     - script A: error 리스너(`console.log('error 이벤트 ' + event.error.name); event.preventDefault();`)
     - script B: `console.log('1 시작'); Promise.resolve().then(() => log('then'))`(function 표현식), `null.x;`, `console.log('1 끝');`
     - script C: `console.log('2 실행');`
  2. `syntax-error.html` → `error 이벤트 SyntaxError`, `2 실행 undefined`
     - script B: `console.log('1 시작'); function inBroken() {} var = ;`
     - script C: `console.log('2 실행', typeof inBroken);`
  3. `declarations-remain.html` → `error 이벤트 TypeError`, `1 undefined function`, `late: ReferenceError`, `error 이벤트 SyntaxError`, `다음 스크립트 undefined`
     - script B: `var before = 1; null.x; var after = 2; function later() {} let late = 3;`
     - script C: `console.log(before, typeof after, typeof later); try { late; } catch (e) { console.log('late: ' + e.name); }`
     - script D: `var fresh = 1; let late = 4; console.log('다시 선언함');`
     - script E: `console.log('다음 스크립트', typeof fresh);`
  4. `listener-throws.html` → `리스너 1`, `error 이벤트 TypeError`, `리스너 2`, `click 뒤`
     - 버튼 하나, 같은 스크립트에서 error 리스너, click 리스너 두 개(첫째가 `null.x` 뒤 `console.log('리스너 1 끝')` — 출력되지 않음), `button.click()`, `console.log('click 뒤')`
  5. `onerror-return.html` → `onerror 5 TypeError`, `취소됨 true`, `onerror false 반환`, `취소됨 false`
     - script A: `window.onerror = function (message, source, line, column, error) { console.log('onerror ' + arguments.length + ' ' + error.name); return true; }` 다음 error 리스너(`console.log('취소됨 ' + event.defaultPrevented); event.preventDefault();`)
     - script B: `null.x;` / script C: `window.onerror = function () { console.log('onerror false 반환'); return false; };` / script D: `null.y;`
  6. `then-throws.html` → `끝`, `then 1`, `then 2`, `unhandledrejection TypeError`
     - 한 script에서 error 리스너와 unhandledrejection 리스너(`'unhandledrejection ' + event.reason.name`, preventDefault), 첫 then 콜백이 `console.log('then 1'); null.x; console.log('then 1 끝');`(끝은 출력되지 않음), 둘째 then 콜백이 `then 2`, 마지막 `console.log('끝')`
     - 비교표 마지막 행의 근거가 되는 대비용 예제다. then 콜백의 예외는 report되지 않고 then이 돌려준 프로미스의 거부가 되며, 같은 체크포인트의 다음 마이크로태스크는 실행된다.
  - 예제 원본은 리뷰 반영판이다(예제 3에 script D의 `var fresh`와 script E, 예제 4·6에 throw 뒤 출력 줄 추가, 실행기로 재확인).
  - 실행기는 취소되지 않은 예외(pageerror)를 실패로 처리하므로 모든 예제는 error 리스너에서 `preventDefault()`한다(content-guide 브라우저 예제). 예제 5의 false 경우는 뒤 리스너가 취소한다.
  - 파일 원본은 `scratchpad/uncaught/ex/`에 있다(구현 때 그대로 복사).
- 예제별 퀴즈 오답(브라우저 동작이라 소스 치환 실행 대신 오해 모델을 문장으로 정의하고, 각 오답이 그 모델의 출력과 맞는지 메인이 손으로 계산했다)
  1. 4지선다. 정답 `1 시작 / error 이벤트 TypeError / then / 2 실행`. (a) 예외가 나면 뒤 script도 실행되지 않는다 → `1 시작 / error 이벤트 TypeError / then`. (b) error 이벤트는 나중 태스크로 발화된다 → `1 시작 / then / 2 실행 / error 이벤트 TypeError`. (c) 잡히지 않은 예외 뒤에도 그 script는 끝까지 실행된다 → `1 시작 / error 이벤트 TypeError / 1 끝 / then / 2 실행`.
  2. 3지선다. 정답 `error 이벤트 SyntaxError / 2 실행 undefined`. (a) 오류 줄 앞까지는 실행된다 → `1 시작 / error 이벤트 SyntaxError / 2 실행 function`. (b) 함수 선언은 오류가 있어도 만들어진다 → `error 이벤트 SyntaxError / 2 실행 function`.
  3. 4지선다. 정답 `error 이벤트 TypeError / 1 undefined function / late: ReferenceError / error 이벤트 SyntaxError / 다음 스크립트 undefined`. (a) 예외가 난 줄 뒤의 선언은 아예 생기지 않는다 → `error 이벤트 TypeError / 1 undefined undefined / late: ReferenceError / 다시 선언함 / 다음 스크립트 number`. (b) let도 var처럼 undefined로 남는다 → `error 이벤트 TypeError / 1 undefined function / error 이벤트 SyntaxError / 다음 스크립트 undefined`. (c) 다음 스크립트에서 다시 선언하면 덮어쓴다 → `error 이벤트 TypeError / 1 undefined function / late: ReferenceError / 다시 선언함 / 다음 스크립트 number`.
  4. 4지선다. 정답 `리스너 1 / error 이벤트 TypeError / 리스너 2 / click 뒤`. (a) 예외가 click()을 부른 script로 전파된다 → `리스너 1 / error 이벤트 TypeError`. (b) 리스너는 모두 실행되고 예외는 click()을 부른 script로 전파된다 → `리스너 1 / 리스너 2 / error 이벤트 TypeError`. (c) error 이벤트는 디스패치가 끝난 뒤 발화된다 → `리스너 1 / 리스너 2 / error 이벤트 TypeError / click 뒤`(Critic 지적으로 출력 수정).
  5. 3지선다. 정답 `onerror 5 TypeError / 취소됨 true / onerror false 반환 / 취소됨 false`. (a) 다른 핸들러처럼 false가 취소한다 → `onerror 5 TypeError / 취소됨 false / onerror false 반환 / 취소됨 true`. (b) onerror의 반환값은 취소와 관계없다 → `onerror 5 TypeError / 취소됨 false / onerror false 반환 / 취소됨 false`.
  6. 3지선다. 정답 `끝 / then 1 / then 2 / unhandledrejection TypeError`. (a) then 콜백의 예외도 error 이벤트로 보고된다 → `끝 / then 1 / error 이벤트 / then 2`. (b) 예외가 나면 남은 마이크로태스크가 실행되지 않는다 → `끝 / then 1 / unhandledrejection TypeError`.
- 비교표("예외가 나는 곳")
  - JSX `<table>`로 쓴다(GFM 표 금지). 감싸기: region div(tabIndex·role·aria-label "잡히지 않은 예외 비교표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"). 아래 마크다운 표는 계획 문서 안의 표기일 뿐이다.
  - 머리 `예외가 나는 곳 | 멈추는 것 | 이어지는 것 | 보고되는 방식 | 근거`(결과·출력·예제로 시작하는 머리 없음 → 결과 표 자동 대조 대상 아님)

  | 예외가 나는 곳 | 멈추는 것 | 이어지는 것 | 보고되는 방식 | 근거 |
  | - | - | - | - | - |
  | 파서가 실행하는 스크립트 | 그 스크립트의 나머지 | 마이크로태스크 체크포인트, 다음 스크립트 | 전역 error 이벤트 | 예제 1 |
  | 스크립트의 문법 오류 | 그 스크립트 전체(선언도 없음) | 다음 스크립트 | 전역 error 이벤트 | 예제 2 |
  | 앞 스크립트가 선언한 let을 다시 선언 | 그 스크립트 전체(선언도 없음) | 다음 스크립트 | 전역 error 이벤트 | 예제 3 |
  | 리스너 안 | 그 리스너의 나머지 | 다음 리스너, 디스패치를 부른 코드 | 전역 error 이벤트 | 예제 4 |
  | 타이머 콜백 안 | 그 콜백의 나머지 | 다음 태스크(예제 10에서는 다음 타이머) | 전역 error 이벤트 | try/catch/finally 예제 10 |
  | then 콜백 안 | 그 콜백의 나머지 | 같은 체크포인트의 다음 마이크로태스크 | then이 돌려준 프로미스의 거부(처리되지 않으면 unhandledrejection) | 예제 6 |

  - 칸은 산문이라 concept.test가 `tableBody(mdx, [머리...])`(tests/helpers/expression-tables)로 읽어 행·칸 텍스트를 하드코딩 목록과 비교한다(ASI 선례).
  - 행마다 주장을 근거 예제의 expectedOutput으로 단언한다: 1행 `1 끝` 없음·`then`이 `2 실행` 앞·`error 이벤트` 있음, 2행 `1 시작` 없음·`2 실행 undefined`, 3행 `다시 선언함` 없음·`다음 스크립트 undefined`, 4행 `리스너 1 끝` 없음·`리스너 2`와 `click 뒤` 있음, 6행 `then 1 끝`·`error 이벤트` 없음·`then 2`와 `unhandledrejection` 있음.
  - 타이머 행: error-handling content.mdx에 `exampleFilesByNumber`를 적용해 10번이 `timer-error.js`인지, 그 예제의 expectedOutput에 `error 이벤트`와 `다음 타이머`가 있는지 단언한다(error-handling meta import, 선례 array-higher-order-functions/concept.test.ts).
- 흔한 오해 2개
  - "잡히지 않은 예외가 나면 페이지의 JavaScript가 모두 멈춘다"(예제 1·4)
  - "예외가 난 스크립트는 없었던 일이 된다"(예제 3: 본문 실행 전에 만들어진 바인딩은 남는다)
- simplifications
  - 예제는 Chromium에서 실행한 결과이고 다른 브라우저는 확인하지 않았다. error 이벤트의 message·filename·lineno·colno는 브라우저마다 다를 수 있어 출력하지 않는다.
  - 실행기는 취소되지 않은 예외를 실패로 처리하므로 모든 예제는 error 리스너에서 preventDefault()한다. 취소하지 않았을 때 사용자 에이전트가 콘솔에 보고할 수 있다는 부분은 표준 서술로만 쓴다(try/catch/finally와 같은 방식).
  - 파서가 HTML에서 만나 실행하는 인라인 클래식 스크립트만 다룬다. 다른 스크립트가 appendChild 등으로 넣은 스크립트는 그 자리에서 실행되어 넣은 쪽 코드가 이어지고 그 사이 체크포인트가 없으므로 다루지 않는다. 모듈 스크립트, 외부 스크립트의 로딩 오류(스크립트 요소의 error 이벤트), 다른 출처 스크립트의 muted errors("Script error."), 워커도 다루지 않는다.
  - 남는 바인딩은 스크립트 최상위의 선언만 다룬다. 블록 안 함수 선언은 sloppy mode의 웹 호환 의미론(명세 부록 B) 때문에 var 바인딩만 먼저 생기고 값은 블록을 평가할 때 들어가므로, 예외가 그 블록보다 앞이면 undefined로 남는다. 브라우저 확장·개발자 도구가 예외를 다루는 방식도 다루지 않는다.
  - error 리스너 안에서 다시 예외가 나면 report an exception의 in error reporting mode 때문에 error 이벤트가 다시 발화하지 않는다. 실행기가 그 경우를 실패로 처리하므로 예제로 보이지 않는다.
  - `button.click()`으로 만든 이벤트는 isTrusted가 false다. 리스너의 예외가 보고되는 방식은 사용자의 실제 클릭에서도 같은 DOM 단계(inner invoke)지만, 실제 클릭은 이 페이지에서 실행하지 않았다.
  - 요소(예: img)의 onerror는 special error event handling 대상이 아니라 이벤트 객체 하나를 받는다. 이 페이지는 전역(window)의 onerror만 다룬다.
  - 예제의 console.log는 호스트 API다. try…catch는 try/catch/finally 개념에서 다룬다.
- references
  - HTML: run a classic script(`webappapis.html#run-a-classic-script`), report an exception(`#report-an-exception`), clean up after running script(`#clean-up-after-running-script`), create a classic script(`#creating-a-classic-script`), event handler processing algorithm(`#the-event-handler-processing-algorithm`), OnErrorEventHandler(`#onerroreventhandler`) — 모두 Architect·Critic이 사본에서 존재 확인
  - DOM: inner invoke(`dom.spec.whatwg.org/#concept-event-listener-inner-invoke`, Architect가 존재 확인)
  - ECMAScript: ScriptEvaluation(`sec-runtime-semantics-scriptevaluation`), GlobalDeclarationInstantiation(`sec-globaldeclarationinstantiation`)
  - MDN: Window error 이벤트, Window.onerror(GlobalEventHandlers.onerror), ErrorEvent

## 2. 사실과 추정

### 사실 (코드·표준·실행에서 확인)
- 기존 서술
  - `error-handling/content.mdx:57-81`: 타이머 콜백 예외와 report an exception, error 이벤트 취소(preventDefault)와 콘솔 보고 may, unhandledrejection·rejectionhandled를 다룬다. 예제 10~13.
  - `error-handling/content.mdx:85`와 `meta.ts:140`: "스크립트 최상위에서 잡히지 않은 예외와 `onerror` 핸들러 속성, 다른 출처 스크립트의 `Script error.`, 워커의 에러, Node.js의 `process` 이벤트 … 다루지 않습니다."
  - `prevent-default-stop-propagation/meta.ts:143`: "beforeunload와 error 이벤트 핸들러의 반환값 예외, 이벤트 핸들러 어트리뷰트의 스코프는 다루지 않습니다." 본문 "### return false는 이벤트 핸들러에서만 취소한다"(`content.mdx:157`)는 false 경우만 인용한다.
  - `microtask-queue` 예제 5(two-scripts.html)는 script 요소 사이 체크포인트를 다룬다(예외 없음).
  - tdz·hoisting·global-object·execution-context·script-async-defer에는 여러 script 사이에서 선언이 남는 경우, 리스너 예외를 다룬 문장이 없다(grep 0건).
- 학습 순서: order 472보다 작은 개념은 74개다. 새 페이지가 75번째, async-generator 76번째, es-modules 77번째가 된다. 총 77개.
- 순서 고정 테스트
  - `app/lib/concepts.test.ts:104,111-112`(total 76, 마지막 position 76)
  - `app/components/concept/ConceptPager.test.tsx:18,28`(`/ 76`, `76 / 76`)
  - `tests/e2e/navigation.spec.ts`: 89 카드 수, 97 `76번째`, 155 article 수, `학습 순서 N / 76` 50곳(N≥75면 +1), 798·812 error-handling의 다음 링크(`/concepts/async-generator` → 새 slug), 822 async-generator의 이전 링크(`/concepts/error-handling` → 새 slug), 834 es-modules의 이전 링크는 그대로, 새 pager 블록(75 / 77, 이전 error-handling, 다음 async-generator). "객체" 순위(최대 72)는 바뀌지 않는다.
  - `tests/e2e/responsive.spec.ts:1829`(article 76)
- 등록 선례: `tests/e2e/helpers.ts:69`, `a11y.spec.ts:58`(import)·새 케이스, `responsive.spec.ts:67`(import)·`:1522`, `tests/build/build-output.test.ts:1471`, `docs/content-guide.md:225`.
- 표준(2026-11-23 html.spec.whatwg.org·dom.spec.whatwg.org 현재 판 사본)
  - run a classic script: error to rethrow가 있으면 evaluationStatus를 그 throw completion으로, 없으면 ScriptEvaluation. abrupt이고 rethrow errors가 false면 "Report an exception given by evaluationStatus.[[Value]] for script's settings object's global object", 그 뒤 clean up after running script.
  - create a classic script: "If result is a list of errors: Set script's parse error and its error to rethrow to result[0]."
  - clean up after running script: 실행 컨텍스트 스택이 비면 마이크로태스크 체크포인트.
  - report an exception: in error reporting mode가 아니면 전역에 cancelable ErrorEvent error 발화, Note "Returning true in an event handler cancels the event per the event handler processing algorithm."
  - event handler processing algorithm: special error event handling(ErrorEvent, type error, currentTarget이 WindowOrWorkerGlobalScope) → 인수 다섯 개, 반환값 true면 canceled flag. 그 밖은 false면.
  - DOM inner invoke: "If this throws an exception exception: Report exception for listener's callback's corresponding JavaScript object's associated realm's global object."
- ECMAScript(ES2027 초안 사본): ScriptEvaluation은 GlobalDeclarationInstantiation 뒤 본문 평가. GlobalDeclarationInstantiation은 lexical 이름마다 HasLexicalDeclaration이면 SyntaxError.
- 실행(저장소 브라우저 실행기, Chromium)
  - 예제 6개 출력은 1절과 같다(예제 6 then-throws도 실행기로 확인).
  - 탐침(실행기 또는 Playwright goto): a-block(블록 안 함수 선언은 undefined, `K`·`C`는 ReferenceError), b-dynamic(appendChild로 넣은 스크립트: `inner`, `E TypeError`, `append 뒤`, `then`), c-atomic(let 재선언 스크립트의 var·함수도 생기지 않음). `let` 다시 선언 script는 실행되지 않고 다음 script는 실행됨, 초기화 안 된 `late`에 대입도 ReferenceError, `typeof late`도 ReferenceError, `'before' in window`·`'later' in window`는 true이고 `'late' in window`는 false, error 리스너 안에서 다시 던지면 error 이벤트가 다시 오지 않고 pageerror, img의 onerror는 인수 1개, addEventListener 리스너가 true를 반환해도 defaultPrevented false.
  - 주의: `page.setContent`로 실행하면 script 사이 마이크로태스크 순서가 달라졌다(예제 1의 then이 2 실행 뒤). 실행기는 goto로 문서를 열므로 실행기 결과만 근거로 쓴다.

### 추정
- 없음

## 3. 구현 전략
- tagged-templates·automatic-semicolon-insertion과 같은 표+퀴즈형 구조. 예제는 모두 browser 런타임 `.html`.
- 비교표는 산문 칸이라 하드코딩 비교 + 근거 예제의 출력 단언으로 검증한다.
- 퀴즈 오답은 브라우저 동작이라 소스 치환 실행을 하지 않고, 오해 모델과 손 계산 출력을 계획에 적고 concept.test에 하드코딩한다(정답 = expectedOutput은 테스트로 강제).
- 버린 대안: 시뮬레이터(사용자가 표+퀴즈 선택), 메시지 문자열 출력(브라우저마다 다름), 외부 script 로딩 오류(범위 밖, 리소스 실행기 제약).

## 4. 변경 파일
- 추가: `app/concepts/uncaught-exceptions/` — `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `examples/*.html` 6개. 계획 문서.
- 수정(로직, reviewedAt 그대로)
  - `error-handling/content.mdx:85`(본문): "스크립트 최상위에서 잡히지 않은 예외와 `onerror` 핸들러 속성은 [잡히지 않은 예외](/concepts/uncaught-exceptions)에서 다룹니다"처럼 링크로 쓰고, 나머지(Script error.·워커·Node)는 "다루지 않습니다"로 남긴다. `meta.ts:140`(simplifications)은 "…잡히지 않은 예외 개념에서 다룹니다"처럼 개념 이름으로 쓴다. related에 새 slug.
  - `prevent-default-stop-propagation/meta.ts:143`: "error 이벤트 핸들러의 반환값 예외"를 새 개념 이름으로 가리키고(beforeunload와 어트리뷰트 스코프는 그대로) related에 새 slug.
- 수정(기계적): `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`.
- 변경하지 않음: 공통 코드, microtask-queue(예제 5가 이미 체크포인트를 다룸), tdz·hoisting(링크 받을 문장 없음).

## 5. 위험 요소
- error-handling과 겹친 설명. 막는 곳: 타이머·unhandledrejection은 표 한 행과 링크로만 다룬다.
- 콘솔 보고·메시지를 단정. 막는 곳: `grep -nE "콘솔에 (찍힌|출력된|표시된)"` 0건, message 출력 금지.
- 선언이 남는 이유를 엔진 구현처럼 서술. 막는 곳: "메모리" 금지 grep, 명세 단계 서술.
- 예제의 pageerror로 실행기 실패. 막는 곳: 모든 예제에 preventDefault 리스너(예제 5는 뒤 리스너).
- 첫 문단 백틱, MDX 함정(`{`, `<`, 속성 큰따옴표), 표 칸 `<`.
- 순서 삽입 누락. 막는 곳: `grep -rnE "/ 76|toBe\(76\)|toHaveCount\(76\)|76번째" app tests` 0건(es-modules 앞 `76 / 77`만 남음), error-handling·async-generator 이웃 링크 확인.

## 6. 검증 방법
- 정적(저장소 루트): `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "uncaught-exceptions|잡히지 않은 예외|홈 학습 순서 보기"`(a11y 케이스 이름 "개념 페이지: 잡히지 않은 예외")
- 브라우저(개발 서버 재시작 후 `/concepts/uncaught-exceptions`): 첫 문단, 표 6행, 퀴즈 6개 정답 피드백, "학습 순서 75 / 77"과 이전(error-handling)·다음(async-generator), 375px 가로 스크롤 없음, error-handling·prevent-default 페이지의 새 링크.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 메타·예제·탐침 확인
- 대상: `meta.ts`, `examples/*.html` 6개(scratchpad 원본 복사), `route.tsx`
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과. title·summary·goals에 백틱·"객체" 없음, summary 160자 이하.
### 2. 본문
- 대상: `content.mdx`
- 완료 조건: `npm test` 통과, 첫 평문 줄 백틱 없음, 5절 금지 grep 0건, explanation에 `"`·`\` 없음.
### 3. concept.test
- 대상: `concept.test.ts`
- 변경: 퀴즈(정답 = expectedOutput, 선택지 수 4·3·4·4·3·3, 오답 = 1절 목록, 정답 위치 분산), 비교표(행·칸 하드코딩, 근거 예제 출력 단언, error-handling 예제 id·출력 단언), 메타 조건("객체" 없음, order 472, summary 160자 이하).
- 완료 조건: 테스트 통과. 표 칸 하나와 퀴즈 정답 하나를 일부러 바꾸면 실패하는 것을 확인한 뒤 되돌린다.
### 4. 연결과 순서 테스트
- 대상: error-handling·prevent-default 문구·related, content-guide, 4절의 기계적 수정 파일
- 완료 조건: 76 grep 0건(`76 / 77` 제외), `npm run typecheck`·`npm test`·`npm run test:build` 통과.
### 5. 전체 검증
- 완료 조건: 6절 명령 통과, 브라우저 시나리오 확인.

## 변경 이력
- 2026-11-23 (리뷰 지적, Opus 명세 교차 검토): 다음을 고친다. 요구사항 범위 안의 리뷰 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3.
  - summary·goal 2: 예외 전에 평가된 let·const·class는 초기화되어 남는다(탐침: `let a = 1; const c = 2; class K {} null.x; let b = 2;` 뒤 `1 2 function`, `b ReferenceError`). "let은 계속 TDZ"를 "예외 때문에 선언문까지 평가되지 않은 let·const·class"로 한정한다.
  - 재선언 원자성: 명세상 GlobalDeclarationInstantiation의 검사는 바인딩 생성 전이지만, Chromium은 var·함수 선언이 앞 스크립트의 let과 충돌하면 충돌 전에 나온 var·함수 바인딩을 만든 채 SyntaxError를 냈다(탐침 a-varconflict: `function true`). 본문의 원자성 문장은 let 재선언으로 한정하고 simplifications에 이 차이를 밝힌다.
  - 예제 3 셋째 스크립트의 `typeof after`를 `after`로 바꾼다(`typeof`는 바인딩이 없어도 undefined라 바인딩 존재의 증거가 아니다. 바뀐 판도 출력은 같다). 퀴즈 3 오답 (a) "예외가 난 줄 뒤의 선언은 아예 생기지 않는다"의 출력은 `error 이벤트 TypeError / error 이벤트 ReferenceError / 다시 선언함 / 다음 스크립트 number`가 된다(셋째 스크립트가 `after`를 읽다 ReferenceError로 멈춤).
  - Low: GDI가 만드는 바인딩을 "스크립트 최상위의 let·const·class·함수 선언과 var"로 한정, 블록 함수 simplification은 "그 함수 선언에 닿을 때", 동적 스크립트 simplification은 "인라인"으로 한정, 요소 onerror는 "img 같은 요소(body·frameset은 window의 onerror를 가리키므로 제외)", goal 4에 "보고된 예외의 error 이벤트에서" 조건, 비교표 행 2·3·4의 보고 방식 단언 추가.

- 2026-11-24 (사용자 검토): 다음을 고친다. 사용자 요청을 그대로 반영하는 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3(본문·meta만).
  - [중간] 도입부 정의의 콜백을 "브라우저가 부른 콜백(타이머 콜백·이벤트 리스너)"으로 좁히고, 리스너 절에 forEach 콜백처럼 JavaScript가 직접 부른 콜백의 예외는 호출한 쪽으로 전파된다는 대비 문장을 넣는다. 흔한 오해 1의 괄호도 같은 범위로 좁힌다.
  - [낮음] var 초기화를 "전역 객체에 같은 이름의 자기 프로퍼티가 없을 때만 undefined, 있으면 기존 값 유지"로 고친다(CreateGlobalVarBinding).
  - [낮음] 바인딩 범위를 "함수 밖의 모든 var(블록·for 안 포함)"로 고치고, 예제 3 결과 문장과 simplifications의 "최상위 선언만"을 블록 안 함수 선언만 제외하는 표현으로 바꾼다.
  - [낮음] 참고 자료의 MDN GlobalEventHandlers.onerror(Window: error event로 301 리다이렉트, 위 항목과 중복)를 지운다.
  - [선택 보강] late에 대입과 typeof도 ReferenceError이고, 초기화도 다시 선언도 할 수 없어 페이지를 다시 읽기 전에는 쓸 수 없다는 문장을 넣는다.

- 2026-11-24 (사용자 재검토): 다음을 고친다. 사용자 요청을 그대로 반영하는 수정이라 재승인 없이 진행한다. 영향 단계 3(본문만).
  - [낮음] forEach 대비의 이유를 "누가 부르느냐"가 아니라 "부르는 단계가 예외를 어떻게 처리하느냐"로 고친다(forEach의 단계는 그대로 전파, inner invoke는 보고 후 다음 리스너).
  - [낮음] "계속 쓸 수 없는 이름"을 전역 스코프로 한정하고 블록·함수 안 새 선언은 된다고 밝힌다.

## 구현 진행

- baseline (2026-11-23, `ad57b07`): lint·format:check·typecheck 통과 / npm test 190파일 6176개 통과 / test:build·e2e 미실행(5단계에서 실행)
- [x] 1·2·3. 새 개념 폴더(meta·예제 6개·route·본문·concept.test) — Sonnet 구현, 메인이 본문 전체를 읽고 한 곳 직접 수정("다른 이벤트의 핸들러는 false일 때 취소"를 "그 밖의 경우"로 하고 beforeunload는 다루지 않는다고 밝힘). 계획과 다른 점: references의 `#onerroreventhandler` 앵커가 현재 webappapis.html에서 확인되지 않아 넣지 않고 event handler processing algorithm 링크로 대신함(Sonnet 보고). MDN 3개 URL 200 확인(Sonnet). 변이 검사: 표 칸·퀴즈 answer 변경 시 실패 확인 후 원복(Sonnet 보고).
  - 검증(메인 실행): `npx vitest run app/concepts/uncaught-exceptions tests/examples.test.ts tests/content-integrity.test.ts tests/result-tables.test.ts` 1804개 통과(브라우저 예제 6개 Chromium 대조 포함), lint·typecheck·format 통과.
- [x] 4. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(error-handling 본문 링크·simplifications 개념 이름·related, prevent-default simplifications·related, 75 / 77 블록, error-handling 다음·async-generator 이전 링크). 76 grep 0건(`76 / 77`은 async-generator로 정상).
- [x] 5. 전체 검증 (2026-11-23) — lint·format:check·typecheck 통과, npm test 191파일 6222개 통과, test:build 612개 통과, e2e navigation 16개·관련 8개 통과. 브라우저(dev 5173 재시작): 학습 순서 75 / 77·이전 error-handling·다음 async-generator, 표 6행, 퀴즈 6개 렌더·예제 4 정답 선택 후 "정답입니다", 콘솔 오류 없음, 375px에서 페이지 가로 스크롤 없음(표 영역 안에서만 343→617 스크롤), error-handling·prevent-default·async-generator에 새 페이지 링크 렌더.
- 리뷰 1차(critical-code-review + Opus 명세 교차 검토, 2026-11-23): Opus High 1·Medium 2·Low 7 → High 1·Medium 2와 Low 6건을 고치기로 함(변경 이력). 고치지 않는 Low: prevent-default 본문의 false 인용 옆 안내 한 줄(선택 사항, 링크 규칙상 필수 아님), DOM 인용의 둥근 아포스트로피(기존 페이지 인용과 같은 곧은 따옴표 유지). 메인 확인 실행: a-varconflict `function true`, b-lexbefore `1 2 function`·`b ReferenceError`, 예제 3 새 판 출력 동일.
  - 수정(Sonnet, 메인이 diff 확인): 변경 이력 항목 모두 반영(summary 157자). 재검증: lint·format:check·typecheck 통과, npm test 6222개, test:build 612개, e2e 새 페이지 관련 6개 통과. 수정 범위 재리뷰: 새 High 없음.
- 사용자 검토(2026-11-24): 중간 1·낮음 3·선택 보강 1을 모두 반영(변경 이력). 메인이 Chromium 실행기로 탐침: keep `error TypeError / keep 1`, 상속 프로퍼티 toString은 자기 프로퍼티가 아니어서 새로 만들어짐(`toString undefined true`), 블록·for 안 var `true undefined true true`, late 대입·typeof `assign ReferenceError / typeof ReferenceError`, forEach `cb 1 / error TypeError / next`(둘째 호출·다음 줄 없음), EventTarget dispatchEvent 리스너 예외 뒤 `after dispatch`. MDN GlobalEventHandlers.onerror는 curl로 301 → /en-US/docs/Web/API/Window/error_event 확인. 수정은 메인이 직접(문구 8곳·meta 2곳).
- 사용자 재검토(2026-11-24): 낮음 2건 반영(변경 이력). 메인 탐침(Chromium 실행기, late가 초기화되지 않은 뒤): `block 1`, `fn 2`, 전역 `var late = 6`은 `error SyntaxError`, `window.late = 5` 뒤에도 `late` 읽기 ReferenceError, 모듈 스크립트 `module 7`. 수정은 메인이 직접(문구 2곳).

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(browser 예제 6개·퀴즈 6개·비교표 6행·흔한 오해 2개, 시뮬레이터 없음, order 472·학습 순서 75/77, error-handling·prevent-default-stop-propagation 연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것: Opus 리뷰로 "예외 뒤의 let은 TDZ"를 "예외 때문에 선언문까지 평가되지 않은 것"으로 한정했고, let 재선언의 원자성 문장을 let끼리로 한정하고 Chromium의 var·함수 충돌 차이를 simplifications에 밝혔고, 예제 3이 `typeof after` 대신 `after`를 직접 읽게 했다(출력 동일). 사용자 검토 두 차례로 콜백 범위(브라우저가 부른 콜백, forEach 대비와 그 이유), var 초기화(자기 프로퍼티가 없을 때만), 블록·for 안 var, MDN 중복 참고 자료 삭제, late의 대입·typeof와 전역 스코프 한정을 고쳤다. reviewedAt은 사용자 결정으로 2026-11-24를 기록했고, error-handling·prevent-default-stop-propagation은 그대로 뒀다.

### 코드 리뷰
- 리뷰 1차(critical-code-review + Opus 명세 교차 검토): Opus High 1·Medium 2와 Low 6건을 고쳤다(변경 이력). 사용자 검토 1차(중간 1·낮음 3·선택 1)와 재검토(낮음 2)는 모두 반영했다.
- 고치지 않고 남긴 Low: prevent-default-stop-propagation 본문은 여전히 return false 분기만 인용한다(simplifications에서만 새 페이지로 연결, 링크 규칙상 필수 아님). DOM 인용문은 기존 페이지처럼 곧은 아포스트로피를 쓴다.

### 후속 작업
- [ ] 없음. 로드맵 4의 다음 개념(4번 MutationObserver)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 모든 예제가 error 리스너에서 `preventDefault()`를 부른다 — 사이트 실행기가 취소되지 않은 예외(pageerror)를 실패로 처리하기 때문이다. 그래서 취소하지 않았을 때 콘솔에 보고될 수 있다(may)는 동작은 표준의 서술로만 쓰고 예제로 보이지 않는다고 본문에 밝혔다. 버린 대안: 실행기를 고쳐 pageerror를 허용(공통 코드 변경이라 범위 밖).
- [Claude 판단] 범위를 파서가 실행하는 스크립트로 좁혔다 — `appendChild`로 넣은 인라인 스크립트는 그 자리에서 실행되어 넣은 쪽 코드가 이어지고 그 사이에 마이크로태스크 체크포인트가 없다(Critic 지적, 탐침 `inner / E TypeError / append 뒤 / then`). 예제 1의 then 위치 설명이 이 경우에는 맞지 않는다.
- [Claude 판단] let 재선언이 같은 스크립트의 var도 만들지 않는다는 문장을 let끼리의 충돌로 한정했다 — 명세는 충돌 검사를 바인딩 생성 전에 하지만 Chromium은 var·함수가 앞 스크립트의 let과 충돌하면 앞선 바인딩을 만든 채 SyntaxError를 낸다(Opus 지적, 탐침 `function true`). 명세와 다른 동작은 simplifications에 밝히고 다루지 않았다.
- [Claude 판단] 예제 3에서 `typeof after` 대신 `after`를 직접 읽는다 — typeof는 바인딩이 없어도 `undefined`라서 바인딩이 있다는 증거가 못 된다(Opus 지적). 직접 읽어 ReferenceError가 없어야 증거가 된다.
- [Claude 판단] 퀴즈 오답은 오해 모델을 손으로 계산해 고정했다 — 브라우저 동작은 모델대로 소스를 바꿔 실행할 수 없어서다. 검산은 Critic·Architect·Opus가 했고, 예제 4의 오답 (c)를 한 번 고쳤다.
- [무검토 승인] then 콜백의 예외(예제 6)를 비교표의 대비 행으로 넣었다 — 프로미스 반응 Job이 예외를 거부로 바꿔 error 이벤트가 아니라 unhandledrejection이 된다.
- 다룰 범위 네 가지(script 단위 실행, 남는 선언, 리스너의 예외, onerror의 return true)와 표+퀴즈 시각화, 콜백 범위·forEach 대비 이유·var 초기화·블록 안 var·전역 스코프 한정 문구 — 사용자가 고르거나 검토로 고쳤다.

#### 배경지식
- HTML run a classic script: 파싱 오류(다시 던질 오류)가 있으면 ScriptEvaluation 없이 보고하고, 평가가 예외로 끝나면 report an exception 뒤 clean up after running script(스택이 비면 마이크로태스크 체크포인트)를 한다. 다음 스크립트를 막는 단계는 없다.
- report an exception은 취소할 수 있는 ErrorEvent를 전역 객체에 발화한다. 전역 onerror 핸들러는 special error event handling으로 인수 다섯 개를 받고 true를 반환하면 취소한다(다른 경우는 false, beforeunload는 별도).
- GlobalDeclarationInstantiation은 본문 평가 전에 바인딩을 만든다. var는 전역 객체에 자기 프로퍼티가 없을 때만 undefined로 만들고(CreateGlobalVarBinding), 최상위 함수 선언은 함수 객체로, let·const·class는 초기화 없이 만든다. 블록 안 함수 선언은 부록 B 때문에 선언에 닿아야 값이 들어간다.
- DOM inner invoke는 리스너가 던진 예외를 보고하고 다음 리스너로 넘어간다. forEach는 콜백을 `? Call`로 불러 예외를 그대로 전파한다. 차이는 누가 부르느냐가 아니라 부르는 단계가 예외를 어떻게 처리하느냐다.

#### 확인 질문
1. 예제 1에서 then 콜백은 왜 error 이벤트 뒤, 다음 스크립트 앞에 찍히는가? appendChild로 넣은 스크립트라면 왜 이 설명이 맞지 않는가?
   <details><summary>답</summary>run a classic script의 순서가 평가 → 보고 → 정리이고, 정리 단계에서 실행 컨텍스트 스택이 비면 마이크로태스크 체크포인트를 한다. appendChild로 넣은 스크립트는 넣은 쪽 코드가 스택에 있는 채로 실행되므로 스택이 비지 않아 그 사이에 체크포인트가 없다(content.mdx 스크립트 요소 절, 계획 변경 이력 Critic 항목).</details>
2. 예제 3의 셋째 스크립트가 `typeof after`를 찍었다면 무엇을 증명하지 못하는가?
   <details><summary>답</summary>바인딩이 아예 없어도 typeof는 undefined라서, after의 바인딩이 본문 실행 전에 만들어졌다는 것을 배제 못 한다. after를 직접 읽어 ReferenceError가 나지 않아야 바인딩이 있다는 증거다(예제 3 결과와 이유, 계획 변경 이력 Opus 항목).</details>
3. 예외 전에 이미 평가된 `let a = 1`은 다음 스크립트에서 어떻게 보이고, 예외 뒤의 `let late = 3`과 왜 다른가?
   <details><summary>답</summary>선언문까지 평가되어 초기화되었으므로 1로 정상으로 읽힌다. late는 선언문이 평가되지 않아 초기화되지 않은 채 남고, 읽기·대입·typeof가 모두 ReferenceError이며 전역에서는 다시 선언할 수도 없다(content.mdx 바인딩 절, 탐침 b-lexbefore·lateOps).</details>
4. forEach 콜백의 예외는 스크립트의 나머지를 멈추는데 click 리스너의 예외는 왜 멈추지 않는가? "명세의 단계가 부르면 격리된다"가 왜 틀린 일반화인가?
   <details><summary>답</summary>둘 다 명세의 단계가 부르지만, forEach의 단계는 예외를 호출한 쪽으로 그대로 넘기고 DOM inner invoke는 보고한 뒤 다음 리스너로 넘어간다. 기준은 부르는 단계의 예외 처리다(content.mdx 리스너 절, 사용자 재검토).</details>
5. 전역 onerror가 false를 반환하면 이벤트가 취소되는가? addEventListener 리스너의 반환값은?
   <details><summary>답</summary>취소되지 않는다. 전역 객체의 ErrorEvent error는 special error event handling이라 true일 때 취소한다(예제 5: 취소됨 true / 취소됨 false). addEventListener 리스너의 반환값은 취소에 쓰이지 않는다(content.mdx onerror 절).</details>
