# 개념 '타이머' 구현 계획

- 상태: 완료
- 작성일: 2026-11-04
- 기준: `main` @ `df22331`

## 0. 요약

- 목적: 38~42장 로드맵 7번 `/concepts/timers`를 추가한다. 41장 `setTimeout`·`clearTimeout`(동기 코드 뒤 실행, 블로킹으로 늦어짐, 같은 지연은 등록 순서, 숫자 id)과 추가 주제 4개(`setInterval`과 clear 혼용, 추가 인수와 `this`, 지연 값 변환과 `2 ** 31`, 디바운스)를 상황별 결과표 + 예제 8개 + 퀴즈로 WHATWG HTML·Web IDL 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `async` 첫 개념, order 400, 학습 순서 42번째·마지막, 시뮬레이터 없음, 표 데이터 `case-table.ts`). 고정 테스트·e2e·빌드 테스트·content-guide·로드맵을 고친다. 공통 코드와 기존 개념 41개는 바꾸지 않는다.
- 위험: 시간에 따라 달라지는 결과(ms, 지연이 다른 타이머의 순서, `setInterval` 간격)를 표준이 보장하는 사실처럼 쓰는 것 → 표준이 보장하는 순서와 Chromium에서 관찰한 순서를 본문에서 나누고, ms는 "50ms 이상 지났는가" 같은 하한만 확인한다.
- 복잡도: 중간 · Consensus: 생략. 직전 개념들과 같은 표 데이터 + evidence 대조 패턴이고 공통 코드를 바꾸지 않는다. 예제 8개 출력은 실제 실행기로 3회씩 확인했고, 핵심 주장은 표준 원문과 대조했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵 7번 "타이머"(41장)를 새 개념 페이지로 만든다.
- 사용자 결정(2026-11-04)
  - 기본 범위(로드맵): `setTimeout(fn, 0)`은 동기 코드 뒤에 실행, 동기 코드가 50ms 막으면 그만큼 늦어짐, 지연이 같은 타이머는 등록 순서, `clearTimeout`, 브라우저의 타이머 id는 숫자.
  - 추가 주제 4개 모두: **`setInterval`과 clear 혼용**, **추가 인수와 `this`**, **지연 값 변환과 `2 ** 31`**, **디바운스**(스로틀은 이름만).
  - Node 차이: **문서 근거로만 언급**(Node 공식 문서를 참고 자료로 달고, 실행으로 확인하지 않았다고 밝힌다).
  - 시각화: **표 + 퀴즈**(상황별 결과표, 칸마다 예제 출력 줄과 테스트로 대조).
  - 제목 "타이머: setTimeout(fn, 0)은 왜 바로 실행되지 않을까", slug `timers`, category `async`.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 타이머는 콜백을 태스크로 예약한다(예제 1 `sync-first.html`): HTML timer initialization steps "Let completionStep be an algorithm step which queues a global task on the timer task source given global to run task." 콜백은 지연이 끝나면 태스크로 큐에 들어가고, 지금 실행 중인 스크립트가 끝나야 실행된다. 그래서 0ms여도 `스크립트 끝` 뒤에 `타이머 0ms`가 나온다. 태스크와 이벤트 루프의 자세한 규칙은 다음 개념(42장)으로 넘긴다.
  - ② 동기 코드가 길면 늦어진다(예제 2 `blocking.html`): 10ms 타이머를 예약하고 50ms 동안 `while`로 막으면 타이머는 50ms가 지난 뒤에야 실행된다(`... 50ms 이상 지남 true` 두 줄). 표준 note "This API does not guarantee that timers will run exactly on schedule. Delays due to CPU load, other tasks, etc, are to be expected." 지연 값은 "최소한 이만큼 기다린다"이지 "정확히 이때 실행한다"가 아니다.
  - ③ 실행 순서(예제 3 `same-delay.html`): run steps after a timeout "Wait until any invocations of this algorithm that had the same global and orderingIdentifier, that started before this one, and whose milliseconds is less than or equal to this one's, have completed." → 같은 지연을 먼저 등록한 타이머가 먼저(`a 50ms`, `b 50ms`, `d 50ms` 순). 나중에 등록한 0ms 타이머 `c`가 먼저 나온 것은 Chromium 결과이며, 이 단계는 그 순서를 강제하지 않는다. 또 "Optionally, wait a further implementation-defined length of time."이 있어 표준은 지연이 짧다는 이유만으로 먼저 실행된다고 보장하지 않는다고 본문에 밝힌다.
  - ④ id와 `clearTimeout`(예제 4 `clear.html`): id는 "an implementation-defined integer that is greater than zero and does not already exist in global's map of setTimeout and setInterval IDs"(`id number true true`). `clearTimeout(a)`는 map에서 지우고, 태스크가 실행될 때 "If id does not exist in global's map of setTimeout and setInterval IDs, then abort these steps."라서 `a 실행`이 없다. 다른 타이머 콜백에서도 지울 수 있다(`d가 c를 지움`, `c 실행` 없음). id는 0보다 큰 정수이므로 `clearTimeout(0)`·`clearTimeout(-1)`은 아무것도 지우지 않고 오류도 없다. Node의 `setTimeout`은 `Timeout` 객체를 돌려준다(Node 문서 "Returns: <Timeout> for use with clearTimeout()", 실행 확인 안 함 — 호스트 차이).
  - ⑤ `setInterval`과 clear 혼용(예제 5 `interval.html`): "The clearTimeout(id) and clearInterval(id) method steps are to remove this's map of setTimeout and setInterval IDs[id]." + note "Because clearTimeout() and clearInterval() clear entries from the same map, either method can be used to clear timers created by setTimeout() or setInterval()." → `clearInterval(once)`로 setTimeout이 지워지고(`once 실행` 없음), 세 번째 콜백에서 `clearTimeout(id)`로 interval이 멈춘다(`tick 1~3`). 반복은 콜백 실행 뒤 같은 id로 다시 예약된다: "If repeat is true, then perform the timer initialization steps again, given global, handler, timeout, arguments, true, and id." 그래서 처음 받은 id 하나로 몇 번째 실행에서든 멈출 수 있다. 다음 실행까지의 실제 간격은 다루지 않는다(2절 사실 — Chromium 측정은 표준 서술과 맞지 않았다).
  - ⑥ 추가 인수와 `this`(예제 6 `args-this.html`): "If handler is a Function, then invoke handler given arguments and "report", and with callback this value set to thisArg." + "Let thisArg be global if that is a WorkerGlobalScope object; otherwise let thisArg be the WindowProxy that corresponds to global." → 세 번째 인수부터 콜백 인수로 전달(`인수 x y`), strict mode 함수를 그냥 부르면 `this`는 `undefined`이지만(`strict 직접 호출 this undefined`) 타이머 콜백으로는 `window`(`strict 콜백 this는 window true`). 메서드를 그대로 넘기면 객체를 잃는다(`hello undefined`). 감싸는 함수나 `bind`로 해결(`hello kim` 두 줄). [this 바인딩](/concepts/this-binding)의 "호스트가 this를 정하는 경우"를 여기서 다룬다.
  - ⑦ 지연 값 변환(예제 7 `delay-convert.html`): HTML IDL "long setTimeout(TimerHandler handler, optional long timeout = 0, any... arguments);" → Web IDL `long` 변환 "Let x be ? ConvertToInt(V, 32, "signed")." → 문자열은 ToNumber로 숫자가 되고(`'30'` → 30), NaN은 "If x is NaN, +0, +∞, or −∞, then return +0."로 0, 범위를 넘는 값은 2의 32제곱으로 나눈 나머지를 거쳐 부호 있는 32비트 정수가 된다(`2 ** 31` → -2147483648). 그다음 timer initialization steps "If timeout is less than 0, then set timeout to 0."로 음수는 0. 그래서 `2 ** 31`·`-100`·`NaN`은 곧바로, `'30'`은 30ms 뒤 실행되고, 모두 200ms 타이머보다 먼저다. `2 ** 31 - 1`(약 24.8일)은 실행되지 않는다(200ms 타이머가 지움). 이 예제의 순서는 모두 ③의 표준 규칙이 보장한다(먼저 등록하고 지연이 같거나 짧음). Node는 2147483647보다 큰 값을 1로 바꾼다고 문서에 적혀 있다(실행 확인 안 함).
  - ⑧ 디바운스(예제 8 `debounce.html`): 반복문으로 5번 부르면 매번 이전 타이머를 `clearTimeout`하고 새로 예약하므로 마지막 값으로 한 번만 실행(`저장 초안5 1번째`), 시간이 지난 뒤 다시 부르면 다시 실행(`저장 최종 2번째`). 함수가 `timer` 변수를 기억하는 것은 [클로저](/concepts/closure). 스로틀은 이름과 차이만 한 줄로 쓰고 예제는 두지 않는다(결과가 호출 간격에 따라 달라짐).
  - 결과와 이유: 상황별 결과표(3절), 흔한 오해("0ms면 바로 실행된다", "지연 값은 정확한 실행 시각이다", "clearTimeout과 clearInterval은 짝을 맞춰야 한다", "타이머 콜백의 this는 strict mode면 undefined다", "지연 값에 아주 큰 수를 넣으면 아주 늦게 실행된다", "지연이 짧으면 표준이 먼저 실행을 보장한다").

### 유지해야 하는 기존 동작

- 기존 개념 41개는 수정하지 않는다. 하이드레이션 규칙.
- title·summary·tags에 '객체'를 쓰지 않는다(홈 '객체' 검색 고정 테스트).

### 제외 범위

- 이벤트 루프·태스크 큐의 처리 순서 상세(42장 다음 개념), 마이크로태스크·Promise(45장)
- 문자열 handler(`setTimeout('code')`)의 컴파일, Trusted Types·CSP
- 중첩 타이머 4ms 제한(이름과 note 인용만, 실행 확인 안 함), 백그라운드 탭·절전으로 늦어지는 정책
- `setInterval`의 실제 간격 계산, 워커의 타이머, `requestAnimationFrame`, `queueMicrotask`
- 스로틀 구현, Node의 `Timeout` 메서드(`ref`·`unref`·`refresh`)와 `timers/promises`

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-04 내려받음: scratchpad `tm/std/` timers.html, webidl.html, node-timers.html, `pd/std/webappapis.txt`, 텍스트 `*.txt`)

- 1절 ①~⑧의 HTML 인용은 `timers.txt` 66–175(timer initialization steps, clear 메서드, note)와 206–235(run steps after a timeout)에 있다. IDL `long setTimeout(...)`은 `pd/std/webappapis.txt:4626`. Web IDL `long` 변환은 `webidl.txt:5161–5165`, ConvertToInt는 `:5218–5250`(NaN·±0·±∞ → +0, IntegerPart, modulo 2^bitLength, 부호 처리). 지수가 텍스트에서 위첨자로 풀려 "2bitLength"처럼 보이므로 modulo 줄은 인용하지 않고 우리말로 쓴다.
- 중첩 제한 note: "Timers can be nested; after five such nested timers, however, the interval is forced to be at least four milliseconds."(`timers.txt` 약 50행). 단순화에만 쓴다.
- Node(`node-timers.txt` 370–385): "Returns: <Timeout> for use with clearTimeout()", "When delay is larger than 2147483647 or less than 1 or NaN, the delay will be set to 1." 로컬 Node v24.22.1에서 `typeof setTimeout(...)`가 `object`, 생성자 이름 `Timeout`인 것을 확인했지만, 사이트 실행기로는 확인할 수 없으므로 본문은 문서 근거로만 쓴다.
- 참고 링크 anchor(사본에서 존재 확인): HTML `timers-and-user-prompts.html#dom-settimeout`, `#dom-setinterval`, `#dom-cleartimeout`, `#timer-initialisation-steps`, `#run-steps-after-a-timeout`, `#map-of-settimeout-and-setinterval-ids`, `#timer-nesting-level`. Web IDL `#js-long`, `#abstract-opdef-converttoint`. Node `timers.html#settimeoutcallback-delay-args`, `#class-timeout`, `#cleartimeouttimeout`. MDN ko `Window/setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`(모두 200).

### 사실 (실행 확인 — 실제 실행기 `runBrowserExample`, settleMs 300, 초안 scratchpad `tm/ex/`, 3회 연속 같은 출력)

| 예제 | 출력 |
| - | - |
| 1 `sync-first.html` | `스크립트 시작`, `setTimeout 다음 줄`, `스크립트 끝`, `타이머 0ms` |
| 2 `blocking.html` | `동기 코드 끝, 50ms 이상 지남 true`, `타이머 실행, 50ms 이상 지남 true` |
| 3 `same-delay.html` | `c 0ms`, `a 50ms`, `b 50ms`, `d 50ms` |
| 4 `clear.html` | `id number true true`, `없는 id를 지워도 오류 없음`, `b 실행`, `d가 c를 지움` |
| 5 `interval.html` | `등록 끝`, `tick 1`, `tick 2`, `tick 3` |
| 6 `args-this.html` | `strict 직접 호출 this undefined`, `인수 x y`, `strict 콜백 this는 window true`, `hello undefined`, `hello kim`, `hello kim` |
| 7 `delay-convert.html` | `2 ** 31`, `-100`, `NaN`, `문자열 30`, `200ms 타이머` |
| 8 `debounce.html` | `반복 끝`, `저장 초안5 1번째`, `저장 최종 2번째` |

- 예제 파일은 모두 `<!doctype html>` 문서 + 인라인 `<script>` 하나(직전 개념 예제와 같은 머리). 초안을 그대로 복사한다.
- `setInterval` 간격(별도 탐색, 예제로 쓰지 않음): 콜백 안에서 40ms를 막는 20ms interval의 "앞 콜백 끝 → 다음 콜백 시작" 간격이 Chromium에서 0~1ms였다. 표준대로 콜백 뒤 다시 20ms를 기다린다면 생기지 않을 값이라 Chromium이 표준 서술과 다르게 계산하는 것으로 보인다. 그래서 본문은 "같은 id로 다시 예약된다"만 쓰고 간격은 다루지 않는다(단순화에 명시).
- category `async`는 `CATEGORY_LABELS`에 이미 있고(`app/lib/concepts.ts:43` '비동기') 쓰는 개념이 아직 없다. 홈은 `groupByCategory`(`app/lib/concept-groups.ts:10`)로 개념이 있는 분류만 그리므로 '비동기' 묶음이 새로 생긴다. 첫 browser 개념(`467d06c`) 때도 홈 고정 테스트는 개수만 바꿨다.
- 고정 테스트(직전 커밋 `df22331` 패턴): `app/lib/concepts.test.ts`(total·마지막 개념), `app/components/concept/ConceptPager.test.tsx`(1/N, 마지막 개념, 이전 링크), `tests/e2e/navigation.spec.ts`(카드 수, 'N번째' 제목, 분모, 직전 개념과 새 개념의 이전·다음), `tests/e2e/responsive.spec.ts`(홈 article 수 + 새 페이지 가로 스크롤), `tests/e2e/a11y.spec.ts`(새 페이지 axe), `tests/e2e/helpers.ts`(경로 상수), `tests/build/build-output.test.ts`(새 describe), `docs/content-guide.md`(e2e 대상 목록).
- 표 + evidence 부분 수열 대조 패턴: `app/concepts/script-async-defer/concept.test.ts:5–60`.

### 추정

- 없음

## 3. 구현 전략

- 직전 개념들과 같은 구조: 예제 8개(`runtime: 'browser'`, `.html`) + 상황별 결과표 데이터 `case-table.ts` + `concept.test.ts`.
- 표: 행 = 상황(아래 13행), 열 = 상황 / 코드 / 결과 / 근거 규칙. 각 행은 `evidence: { example, lines }`를 가지고, 테스트가 `lines`가 그 예제 `expectedOutput`에 순서대로(부분 수열) 있는지 검사한다(script-async-defer 패턴). 결과 칸 글자는 손으로 쓰되 evidence 줄로 묶인다.
  1. 0ms 타이머 — 동기 코드 뒤(예제 1) 2. 동기 코드가 막으면 늦어짐(2) 3. 같은 지연 — 등록 순서(3) 4. 나중에 등록한 0ms — Chromium에서 먼저, 표준 보장 아님(3) 5. `clearTimeout`(4) 6. 다른 콜백에서 지우기(4) 7. `clearInterval`로 setTimeout 지우기(5) 8. 같은 id로 interval 멈추기(5) 9. 추가 인수(6) 10. strict 콜백의 `this`(6) 11. 메서드를 그대로 넘김(6) 12. 음수·NaN·`2 ** 31` → 0(7) 13. 디바운스(8)
- 테스트 불변식(데이터와 예제 사이): 모든 행의 evidence 예제가 meta에 있음, 모든 예제가 한 행 이상의 근거, 상황 이름 중복 없음, 예제 1의 `타이머 0ms`가 마지막 줄, 예제 3에서 `a`·`b`·`d` 순서, 예제 4·5·7에서 지운 타이머 줄(`a 실행`, `c 실행`, `once 실행`, `2 ** 31 - 1 실행`)이 없음, 예제 파일 존재.
- 버린 대안: 타임라인 시뮬레이터(사용자 결정으로 표 + 퀴즈, 태스크 큐 시각화는 8번 후보와 겹침). 모든 상황을 한 예제에 모으는 방식(직전 개념의 `actions.html`처럼) — 타이머끼리 서로의 순서와 시간에 영향을 주므로 예제를 나눈다.

## 4. 변경 파일

- 추가 `app/concepts/timers/`: `meta.ts`, `content.mdx`, `route.tsx`(기존 개념과 같은 얇은 모듈), `case-table.ts`, `concept.test.ts`, `examples/` 8개.
- 수정(고정 테스트·문서): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch38-42.md`(마무리 때).
- 변경하지 않음: 공통 코드(`app/components/`, `app/simulator/`, `app/lib/` 본문, `app/routes/`), 기존 개념 41개(직전 개념에 "다음 개념" 문구가 없음을 확인함 — `prevent-default-stop-propagation/content.mdx`에 '타이머' 언급 없음).

### meta 안

- slug `timers`, title '타이머: setTimeout(fn, 0)은 왜 바로 실행되지 않을까', category `async`, order 400, reviewedAt null.
- summary(160자 이하, '객체' 금지): "setTimeout은 콜백을 태스크로 예약해 지금 실행 중인 코드가 끝난 뒤에 부릅니다. 0ms여도 늦게 실행되는 이유, 실행 순서, clearTimeout과 clearInterval, this와 지연 값 변환, 디바운스를 HTML 표준과 Chromium 실행으로 확인합니다."
- tags: 타이머, setTimeout, clearTimeout, setInterval, clearInterval, 태스크, 디바운스, 호스트 API
- prerequisites: [this 바인딩](this-binding), [클로저](closure). related: this-binding, closure, global-object.
- simplifications(안): ① 이벤트 루프·태스크 큐의 처리 순서는 다음 개념(42장), 여기서는 "콜백은 태스크로 큐에 들어가 지금 실행 중인 코드가 끝난 뒤 실행" 수준 ② Promise·마이크로태스크는 45장 별도 개념 ③ 정확한 ms는 주장하지 않고 하한("50ms 이상")과 순서만 확인 ④ 예제 3의 0ms가 먼저인 것은 Chromium 결과, 표준은 같거나 짧은 지연을 먼저 등록한 경우의 순서만 보장 ⑤ 중첩 타이머 4ms 제한은 note만 소개, 실행 확인 안 함 ⑥ `setInterval` 다음 실행까지의 실제 간격은 다루지 않음 ⑦ 문자열 handler·Trusted Types·CSP 생략 ⑧ 백그라운드 탭·절전으로 늦어지는 정책 생략 ⑨ Node 내용(Timeout 객체, 큰 지연을 1로)은 Node 문서 근거, 실행 확인 안 함 ⑩ 워커 생략 ⑪ 스로틀은 이름만 ⑫ 결과는 Chromium, 다른 브라우저는 확인 안 함.
- references(안): HTML 7개(위 anchor), Web IDL 2개, Node 3개, MDN ko 4개.

## 5. 위험 요소

- 시간에 의존하는 출력이 CI에서 흔들림 → 출력은 순서와 불리언 하한만 쓰고, 지연 차이는 50ms 이상(예제 3), 디바운스 50/120ms, 200ms 기준 타이머로 여유를 둔다. 실행기 출력 안정 검사(settle 300 + 200ms)와 3회 실행으로 확인(작업 순서 1).
- 표준이 보장하지 않는 순서(예제 3의 `c`)를 보장처럼 쓰는 것 → 표 4행·본문·단순화에 "Chromium 결과, 표준 보장 아님"을 명시, 리뷰에서 원문 대조(작업 순서 3).
- `setInterval` 간격 서술이 Chromium과 어긋남 → 간격은 쓰지 않는다(2절 사실).
- Node 내용을 실행 결과처럼 쓰는 것 → "Node 문서에 따르면", 단순화에 실행 확인 안 함 명시.
- 42장 이벤트 루프 개념을 앞당겨 쓰는 것 → "태스크로 큐에 들어가 지금 실행 중인 코드가 끝난 뒤" 이상의 규칙(태스크 선택, 렌더링, 마이크로태스크 체크포인트)을 쓰지 않는다.
- 첫 `async` 개념으로 홈에 새 묶음이 생김 → navigation·responsive e2e와 홈 화면 확인(작업 순서 4).
- MDX에서 `{`·`<` → 코드 안에 두고, 영어 인용은 스크립트로 원문 대조.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "timers|타이머|홈 학습 순서 보기"`
- 인용 대조: 본문 `>` 인용과 영어 인용 문자열을 내려받은 원문 사본과 공백 무시 비교(직전 개념의 `quotes.py`를 `tm/std` 대상으로 바꿔 사용), 누락 0.
- 브라우저(빌드 serve): ① 홈 1280에서 '비동기' 묶음 아래 새 카드 1개 ② 새 페이지 1280 라이트·375 다크에서 표가 페이지 가로 스크롤을 만들지 않음(`scrollWidth` = 창 너비, 표 영역만 스크롤 허용) ③ JS 끔에서 퀴즈 정답 `<details>` 수 = 퀴즈 수.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `examples/` 8개(초안 `cp`), `meta.ts`, 임시 `content.mdx`(필수 h2 3개), `route.tsx` — meta.ts → content.mdx → route.tsx 순
- 현재: 폴더 없음
- 변경: 4절 meta 안대로 작성, expectedOutput은 2절 표 그대로
- 주의사항: 예제 파일은 초안과 바이트 단위로 같게(`diff -r`). references URL은 2절 anchor, MDN·Node는 열어서 확인
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 3회 연속 통과, expectedOutput 한 줄을 바꾸면 실패(음성 확인 후 되돌림)

### 2. 표 데이터와 테스트

- 대상: `case-table.ts`, `concept.test.ts`
- 변경: 3절 13행과 불변식
- 완료 조건: `npx vitest run app/concepts/timers` 통과, 한 행의 evidence 줄을 바꾸면 실패(음성 확인 후 되돌림)

### 3. 본문

- 대상: `content.mdx`(1절 ①~⑧ h3, 예제 `file=` 블록, 퀴즈 10개 이상, 결과와 이유에 결과표·흔한 오해)
- 주의사항: 41장까지만 전제(이벤트 루프 42장·Promise 45장은 별도 개념). 첫 문단은 산문으로, 표 데이터는 `.ts`에서 import. 표준 보장과 Chromium 관찰을 문장마다 구분. Node는 문서 근거로만
- 완료 조건: `npm test`·lint·format:check·typecheck 통과, 영어 인용 전부 원문 사본과 일치

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록(42개, 마지막 개념 `timers`, 직전 `prevent-default-stop-propagation`은 41/42와 다음 링크 생김)
- 완료 조건: 6절 명령 모두 통과, 6절 브라우저 확인 항목 확인

## 변경 이력

- 2026-11-04 (사용자 콘텐츠 검토 10건): 원문·Chromium 실행으로 확인 후 반영 — ①[중] 예제 4의 `d`(0ms)가 `c`(50ms)를 지우는 순서는 나중에 등록한 더 짧은 타이머라 표준 보장이 아님 → `d`를 `c`보다 먼저 등록(`var c;` 뒤 대입)해 보장되는 순서로 바꿈. 예제 7도 `2 ** 31 - 1`을 200ms 타이머 뒤에 등록해 같은 규칙으로 보장 ②[중] "지연이 다른 타이머는 보장 없음" → "나중에 등록한 더 짧은 타이머만 보장 없음"으로 좁힘(예제 3 제목·해설에 `c`→`d` 보장 추가, 학습 목표 2, 단순화, 흔한 오해 6, 표 4행) ③[중] "다음 개념(42장)" → "이벤트 루프를 다루는 별도 개념(42장, 아직 작성 전)"(이 페이지가 마지막) ④[중] 4ms 제한은 note가 아니라 정규 단계 → setInterval 절에 "If nestingLevel is greater than 5, and timeout is less than 4, then set timeout to 4." 인용과 예제 5·8이 걸리지 않음, 단순화 수정 ⑤`clearTimeout`은 대기·태스크를 취소하지 않고 맵만 지움으로 고침, uniqueHandle 비교는 단순화에 한 줄 ⑥orderingIdentifier가 `"setTimeout/setInterval"`로 두 메서드에 공통임을 설명 ⑦IntegerPart(소수부 버림, 실행 확인 안 함)·`Infinity` → 0·`2 ** 32 + 30` → 30을 본문에 추가하고 예제 7에 `Infinity`·`2 ** 32 + 30` 줄 추가(출력 7줄, 3회 같은 출력), 표에 '2 ** 32 + 30' 행 추가(14행) ⑧디바운스를 trailing 방식으로 한정, 첫 호출의 `clearTimeout(undefined)`가 기본값 0으로 무시됨 ⑨예제 2를 `performance.now()`로 ⑩학습 목표 3을 "0보다 큰 정수라는 규칙과 그 때문에 clearTimeout(0)이 안전한 이유"로 — 단계 1·2·3
- 2026-11-04 (사용자 콘텐츠 검토 2차 5건): ①'42장, 아직 작성 전' → 번호 없이 '작성 예정'(이 페이지 학습 순서 42와 혼동, 본문·단순화) ②'반복 예약에는 지연 하한' → '타이머 콜백 안에서 만든 타이머에는', setInterval은 그 한 경우 ③인라인 인용 `Set x to IntegerPart(x).` 구두점 → 'IntegerPart 단계에서' ④절 제목 '같은 지연이면 등록 순서대로 실행된다' → '먼저 등록했고 지연이 같거나 짧으면 먼저 실행된다' ⑤호스트 API 문장에 `performance.now()` 추가(본문·단순화) — 단계 1·3

## 구현 진행

- baseline (2026-11-04, `df22331`): lint·format:check·typecheck 통과, `npm test` 114파일 3567개 통과. test:build·e2e는 `df22331` 커밋 직전 통과 기록(미재실행). 예제 초안은 scratchpad `tm/ex/`, 실행 스크립트 `tm/run.mts`
- [x] 1. 예제·meta·route — 예제 8개 초안과 동일(`diff -r`), references 16개(HTML 7·Web IDL 2·Node 3·MDN ko 4), reviewedAt null, prerequisites 라벨은 기존 관례대로 `this`·`클로저`. 메인 재실행 `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/timers` 3회 연속 899개 통과. 음성 확인(서브에이전트, sync-first 마지막 줄 변경 → 실패 후 원복). 메인 수정: goals 5번째의 '2 ** 31은 모듈로 뒤 0' 부정확 서술 → 'long 변환에서 음수가 된 뒤 음수를 0으로', 단순화의 '예제 same-delay' → '예제 3'
- [x] 2. 표 데이터와 테스트 — `case-table.ts` 13행(`columns` 4열), `concept.test.ts` 21개(evidence 부분 수열·예제 사용·상황 중복·sync-first 마지막 줄·same-delay a→b→d·지운 타이머 줄 없음·파일 존재). 음성 확인(evidence 줄 변경 → 실패 후 원복). 메인 수정: 같은 지연 행 규칙을 원문대로('먼저 등록했고 지연이 같거나 짧은 타이머가 끝날 때까지'), 메서드 행 결과·규칙(this는 window), 지연 변환 행 규칙 순서(long 변환 → 타이머의 음수 0)
- [x] 3. 본문 — 서브에이전트 작성(h3 동작 원리 8·예제 8·상황별 결과표·흔한 오해 6, 퀴즈 13개, 영어 인용 16개 원문 일치). Node `Returns: <Timeout>`은 MDX `<` 때문에 인용 대신 우리말로 씀. 메인 검토 후 직접 수정: 순서 규칙을 "먼저 등록한 같거나 짧은 지연 타이머가 끝나야 실행" → 원문대로 "그 알고리즘이 끝나야(콜백 태스크가 먼저 큐에 들어가야) 이 타이머도 큐에 넣는다 + 같은 태스크 소스는 넣은 순서대로(상세는 다음 개념)"(본문·퀴즈 2·표 3행·오해 6), 예제 7 순서 설명에 `2 ** 31 - 1`이 끼어들지 않는 이유, 첫 문장 "'0ms 뒤에 실행'이라는 이름" 표현, 예제 4 퀴즈 질문 문구, 표 아래 유지보수용 문장 삭제. 재검증: lint·format:check·typecheck 통과, vitest 899개 통과, 인용 16개 누락 0
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 확인(개수 42·'42번째'·마지막 제목·분모 /42, prevent-default-stop-propagation 41/42 링크 2개, timers 42/42, a11y·responsive 새 페이지, 빌드 describe `프리렌더 (timers)`, content-guide 목록). test:build 1건 실패: 공통 검사 `firstProseLine`이 첫 문단의 `**`를 마크업으로 지워 `` `2 ** 31` ``과 불일치 → 첫 문단 표현을 "아주 큰 지연 값이 곧바로 실행되는 이유"로 바꿈(헬퍼는 그대로). 재검증(메인): lint·format:check·typecheck 통과, `npm test` 115파일 3609개, `test:build` 340개, navigation 16개, 새 페이지 e2e 8개 통과
- 화면(빌드 serve): 홈 1280에 '비동기' 묶음 생김(분류 순서 언어 기초·실행 모델·객체와 프로토타입·브라우저·비동기), 새 페이지 1280 라이트·375 다크 문서 scrollWidth = 창 너비, 375 JS 끔 `<details>` 13개(= 퀴즈 수, JS 켜면 라디오 52개). 표는 375에서 표 영역만 가로 스크롤(scrollWidth 997). 코드 칸에 한글이 섞인 행(`setTimeout(f, 10) 뒤에 50ms 동안 while`)을 `setTimeout(f, 10)` + 상황 '등록 뒤 동기 코드가 50ms 막음'으로, 지연 변환 행 코드를 `setTimeout(f, 2 ** 31)`로 바꿈(vitest·typecheck·test:build 재통과)
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 없음. Low 2(보고만) — ① 본문 "같은 타이머 태스크 소스의 태스크는 큐에 들어간 순서대로 실행"은 이벤트 루프 규칙(HTML event loop의 "first runnable task")에 기대며 인용 없이 다음 개념으로 넘김 ② goals 3번째의 "이미 지워진 id를 지워도 오류가 없다"는 예제가 직접 보이지 않음(없는 id 0·-1만 보임). 계획 대비 차이: Node `Returns: <Timeout>` 인용을 우리말로 대체(MDX `<`), 첫 문단 `2 ** 31` 표현 변경, 퀴즈 13개
- 사용자 최종 승인(2026-11-04) → `reviewedAt` '2026-11-04'
- 사용자 콘텐츠 검토 1차(10건) 반영(`변경 이력`). 예제 8개 3회 같은 출력(실제 실행기), 재검증: lint·format:check·typecheck 통과, `npm test` 3610개, `test:build` 340개, navigation 16개, 새 페이지 e2e 8개 통과, 영어 인용 17개 + 인라인 2개 원문 일치, 퀴즈 13개

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(새 개념 폴더 1개, 브라우저 예제 8개, 상황별 결과표, 고정 테스트·e2e·빌드 테스트·content-guide·로드맵). 공통 코드와 기존 개념 41개는 바꾸지 않았다.
- 달라진 점: 결과표 14행(검토로 `2 ** 32 + 30` 행 추가), 퀴즈 13개, 블록 인용 17개. 예제 4는 `d`를 `c`보다 먼저, 예제 7은 `2 ** 31 - 1`을 맨 뒤에 등록하고 `Infinity`·`2 ** 32 + 30`을 더해 출력 7줄, 예제 2는 `performance.now()`. Node `Returns: <Timeout>`은 MDX `<` 때문에 우리말로 대체. 첫 문단은 빌드 테스트 `firstProseLine`의 `**` 처리 때문에 `2 ** 31`을 쓰지 않음. 4ms 중첩 제한은 단순화 대신 정규 단계로 인용(실행 확인 안 함).

### 코드 리뷰
- critical-code-review: Critical/High/Medium 없음, Low 2(같은 태스크 소스는 넣은 순서대로라는 이벤트 루프 규칙을 인용 없이 넘김, 학습 목표의 '이미 지워진 id')는 보고만. 사용자 콘텐츠 검토 15건은 모두 원문·Chromium 실행으로 확인해 반영(학습 목표 문구는 검토 10번으로 고침).

### 후속 작업
- [ ] 38~42장 로드맵 8번 이벤트 루프와 태스크 큐 — 이 페이지의 "이벤트 루프를 다루는 별도 개념(작성 예정)" 두 곳을 그때 링크로 바꿀지 결정
- [ ] this-binding의 "타이머처럼 호스트가 this를 정하는 경우는 다루지 않는다" 문구 역방향 링크 — 역방향 링크 일괄 처리 때

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 결과표 행마다 `evidence: { example, lines }`를 두고 그 줄이 예제 `expectedOutput`에 순서대로 있는지(부분 수열) 테스트한다 — 직전 개념처럼 한 예제에 모든 상황을 모으면 타이머끼리 서로의 시간과 순서에 영향을 주므로 예제를 8개로 나눴다.
- [Claude 판단] `setInterval`의 다음 실행까지 간격은 다루지 않았다 — 표준은 콜백 실행 뒤 같은 id로 다시 예약(그 뒤 다시 timeout만큼 대기)한다고 쓰지만, 40ms를 막는 20ms interval에서 Chromium의 '앞 콜백 끝 → 다음 시작' 간격이 0~1ms로 표준 서술과 맞지 않았다. 같은 id로 다시 예약된다는 점만 예제로 보였다.
- [Claude 판단] Node 내용(`Timeout` 객체, 2147483647보다 큰 지연을 1로)은 사이트 실행기로 확인할 수 없어 "Node 공식 문서에 따르면"으로만 쓰고 단순화에 실행 확인 안 함을 밝혔다(사용자가 '문서 근거로만'을 고름).
- [Claude 판단] 빌드 테스트가 첫 문단의 `**`를 서식으로 지워 실패했을 때 공통 헬퍼를 고치지 않고 첫 문단 표현을 바꿨다 — 공통 테스트 변경은 범위 밖.
- 예제 4·7의 등록 순서를 바꿔, 페이지가 주장하는 순서가 모두 표준 규칙("먼저 등록했고 지연이 같거나 짧으면 먼저")으로 보장되게 했다(사용자 검토 반영). 예제 3의 `c 0ms`가 `a 50ms`보다 먼저인 것만 Chromium 관찰로 남겼다.

#### 배경지식
- timer initialization steps: 지연이 끝나면 콜백 태스크를 타이머 태스크 소스에 넣는다. 지금 실행 중인 스크립트가 끝나야 그 태스크가 실행되므로 0ms도 동기 코드 뒤다.
- run steps after a timeout: 같은 전역·`"setTimeout/setInterval"`에서 먼저 시작했고 지연이 같거나 짧은 호출이 끝날 때까지 기다린 뒤 태스크를 넣는다. 나중에 등록한 더 짧은 타이머의 순서는 정하지 않고, 구현이 추가로 기다릴 수 있다.
- id 맵: id는 0보다 큰 정수이고 `clearTimeout`·`clearInterval`은 같은 맵에서 지운다. 태스크는 실행 시작 때 맵을 확인해 없으면 중단한다. 반복은 같은 id로 다시 예약된다.
- 콜백의 this는 표준이 thisArg(WindowProxy)로 지정해 strict mode에서도 `window`. 추가 인수는 세 번째부터 전달.
- 지연은 Web IDL `long` 변환(ToNumber → NaN·±∞는 0 → 소수부 버림 → 2^32 나머지 → 부호 있는 32비트) 뒤 음수를 0으로. 그래서 `2 ** 31`은 곧바로, `2 ** 32 + 30`은 30ms.

#### 확인 질문
1. 예제 3에서 `c 0ms`가 `a 50ms`보다 먼저 나온 것은 왜 표준 보장이 아닌데, `c 0ms`가 `d 50ms`보다 먼저인 것은 보장인가?
   <details><summary>답</summary>run steps after a timeout은 "먼저 시작했고 지연이 같거나 짧은" 호출만 기다린다. `a`는 `c`보다 먼저 등록했지만 지연이 더 길어 이 조건에 해당하지 않고, 추가 대기("Optionally, wait a further implementation-defined length of time.")도 허용된다. `d`는 `c`보다 나중에 등록했고 지연이 더 길어서 `c`가 끝나기를 기다린다(본문 '먼저 등록했고 지연이 같거나 짧으면 먼저 실행된다' 절, 변경 이력 1차 ②).</details>
2. 예제 4를 처음 판(`c`를 먼저, `d`를 나중에 등록)으로 두면 무엇이 문제인가? 지금 판은 `c`를 대입하기 전에 `d`를 등록하는데 왜 괜찮은가?
   <details><summary>답</summary>처음 판은 `d`가 나중에 등록한 더 짧은 타이머라 `d`가 `c`보다 먼저 실행된다는 보장이 없다(Chromium에서만 성립). 지금 판은 `d`가 먼저 등록되고 지연이 짧아 먼저 실행이 보장되고, `d`의 콜백은 스크립트가 끝난 뒤 실행되므로 그때 `c`에는 이미 id가 들어 있다(변경 이력 1차 ①, `examples/clear.html`).</details>
3. `setTimeout(f, 2 ** 31)`이 곧바로 실행되는데 `setTimeout(f, 2 ** 32 + 30)`은 30ms인 이유는? Node라면 어떻게 된다고 문서에 적혀 있나?
   <details><summary>답</summary>Web IDL `long` 변환은 2^32로 나눈 나머지를 부호 있는 32비트로 맞추므로 `2 ** 31`은 -2147483648이 되고, timer initialization steps가 음수를 0으로 바꾼다. `2 ** 32 + 30`은 나머지가 30이다. Node 문서는 2147483647보다 큰 값을 1로 바꾼다고 적는다(실행 확인 안 함)(본문 '지연 값은 long으로 변환된다' 절, 예제 7).</details>
4. strict mode 함수를 그냥 부르면 `this`가 `undefined`인데 타이머 콜백으로 부르면 왜 `window`인가? 그런데도 `setTimeout(user.hello, 0)`이 `hello undefined`를 찍는 이유는?
   <details><summary>답</summary>표준이 "with callback this value set to thisArg"로 this를 직접 지정하고 thisArg는 WindowProxy다. `user.hello`를 넘기면 함수만 넘어가 `user` 없이 이 규칙으로 불리므로 this는 `window`이고 `window.nick`이 없어 `undefined`다(예제 6, 결과표 '메서드를 그대로 넘김').</details>
5. 이 페이지가 `setInterval`의 실제 간격을 다루지 않은 이유는? 그 대신 무엇을 예제로 보였나?
   <details><summary>답</summary>표준은 콜백 실행 뒤 같은 id로 다시 예약한다고 쓰지만, Chromium 측정(콜백이 40ms 걸리는 20ms interval의 간격 0~1ms)이 그 서술과 맞지 않았다. 대신 세 번째 콜백에서 처음 받은 id로 `clearTimeout`해 반복이 멈추는 것(같은 id로 재예약)과 `clearInterval`로 setTimeout을 지우는 것을 보였다(2절 사실, 예제 5).</details>
