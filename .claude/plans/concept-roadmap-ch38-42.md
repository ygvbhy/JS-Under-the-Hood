# 개념 로드맵 (Deep Dive 38~42장 범위)

- 상태: 진행 중
- 작성일: 2026-11-03
- 기준: `main` @ `65484bb`

## 결정 (2026-11-03, 사용자)

- 범위: 『모던 자바스크립트 Deep Dive』 38~42장(브라우저 렌더링 과정 ~ 비동기 프로그래밍)을 책 순서대로 진행한다. 25~37장 로드맵(`concept-roadmap-ch25-37.md`)은 2026-11-03 완료.
- 검증 방식: **Playwright로 실제 Chromium에서 예제를 실행**해 console 출력을 대조한다. 지금 예제 실행기(Node vm 스크립트, `runtime: 'ecmascript'`)는 DOM·타이머를 지원하지 않는다(`app/lib/concepts.ts:16`, `tests/helpers/run-example.ts`). 초기 설계도 "브라우저 런타임 예제(타이머·DOM)는 도입 시 Playwright 실행 방식을 별도 설계"로 남겨 두었다(`js-under-the-hood-initial-design.md:329,486`).
- 카테고리: **'브라우저'(`browser`)를 새로 추가**한다. DOM·이벤트·렌더링은 `browser`, 타이머·이벤트 루프는 기존 `async`.
- 진행 방식은 이전 로드맵과 같다(개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`, 개념마다 계획 문서). 한 페이지는 그 장까지만 전제로 쓰고, 뒷장(45장 프로미스·마이크로태스크 등)은 "별도 개념" + `simplifications`.
- 언어(ECMAScript)와 호스트(HTML·DOM 표준, 브라우저)를 구분한다. 이 범위의 근거는 주로 WHATWG HTML·DOM 표준이며, 결과는 Chromium 실행으로 확인하고 브라우저마다 다를 수 있는 부분은 단순화에 밝힌다.

## 0번: 브라우저 예제 실행 인프라 (개념보다 먼저, 별도 계획)

- 공통 코드 변경이므로 별도 계획 문서(`.claude/plans/browser-example-runtime.md`)로 계획 → Consensus 검토 → 사용자 승인 → 구현한다.
- 범위(안): `meta.examples[].runtime`에 `'browser'` 추가(HTML 문서 안에서 실행할지, 스크립트 로딩 지연을 어떻게 재현할지 포함), Playwright로 예제를 실행해 `expectedOutput`과 대조하는 테스트와 실행 명령, `ConceptCategory`에 `browser`와 라벨 추가, `content-guide`·`AGENTS.md`의 예제 규칙·검증 순서 갱신, 기존 `ecmascript` 예제는 그대로.
- 세부(테스트를 `npm test`에 넣을지 별도 명령으로 둘지, 출력 수집 방식, 시간에 의존하는 예제의 결정성 규칙 등)는 그 계획에서 정한다.

## 개념 목록

| # | 개념 (가제) | 장 | 핵심 오해 포인트 (Chromium으로 확인한 결과) | 시각화 (안) | 상태 |
| - | - | - | - | - | - |
| 1 | script의 async와 defer | 38 | 지연이 다른 `defer` 스크립트 둘(먼저 받은 것이 뒤)은 문서 순서대로 실행되고 둘 다 `DOMContentLoaded` 전(`readyState` `interactive`). `async`는 받는 대로 실행. 파서 차단 스크립트는 그 시점까지의 DOM만 봄(`querySelectorAll('p').length` 1) | 타임라인 표 또는 시뮬레이터 | 완료 |
| 2 | DOM 트리와 노드 종류 | 39 | 줄바꿈이 있는 `<ul>`의 `childNodes.length` 3·`children.length` 1, `firstChild.nodeType` 3(텍스트 노드), `firstElementChild`는 `LI` | 트리 그림 | 대기 |
| 3 | HTMLCollection은 살아 있다 | 39 | `getElementsByClassName('r')` 4개를 돌며 클래스를 바꾸면 2개가 남음(살아 있는 컬렉션이 줄어들며 건너뜀). `querySelectorAll`의 정적 NodeList로는 4개 모두 바뀜 | 단계 시뮬레이터 후보 | 대기 |
| 4 | 어트리뷰트와 프로퍼티 | 39 | `value="init"`인 input에 `.value = 'typed'` 뒤 `getAttribute('value')`·`defaultValue`는 `init`. 그 뒤 `setAttribute('value', …)`는 `defaultValue`만 바꾸고 `.value`는 `typed` 그대로 | 표 + 퀴즈 | 대기 |
| 5 | 이벤트 전파와 위임 | 40 | 바깥 캡처(eventPhase 1) → 타깃(2) → 바깥 버블(3) 순서, 바깥 핸들러의 `target`은 버튼·`currentTarget`은 바깥. 위임 | 실제 DOM 클릭 시뮬레이터 후보 | 대기 |
| 6 | 기본 동작과 전파 막기 | 40 | 체크박스 `click`에서 `preventDefault()`는 체크를 막지만 부모 핸들러는 그대로 불림. `stopPropagation()`은 부모 핸들러를 막음. 같은 함수를 두 번 `addEventListener`하면 한 번만 불림 | 표 + 퀴즈 | 대기 |
| 7 | 타이머 | 41 | `setTimeout(fn, 0)`은 동기 코드 뒤에 실행, 동기 코드가 50ms 막으면 그만큼 늦어짐, 지연이 같은 타이머는 등록 순서, `clearTimeout`. 브라우저의 타이머 id는 숫자(Node는 객체 — 호스트 차이) | 표 + 퀴즈 | 대기 |
| 8 | 이벤트 루프와 태스크 큐 | 42 | 동기 코드 → 타이머 콜백 순서, 블로킹. 마이크로태스크(프로미스)는 45장 별도 개념 | 큐 시뮬레이터 후보 | 대기 |

- 위 결과는 2026-11-03 Playwright 1.64.1 Chromium(`page.setContent`, 스크립트 지연은 `page.route`로 재현)으로 확인했다. 페이지에 쓸 때는 각 계획에서 0번 인프라로 다시 실행하고 표준 원문과 대조한다.
- 시각화는 각 계획에서 사용자와 다시 정한다. 위 칸은 출발점이다.
- order: 마지막 개념 `set-map`(330) 뒤로 340부터 10 간격. 새 개념이 마지막이 되면 개수·마지막 개념 고정 테스트를 갱신한다.

## 보류·제외

- 38장 리플로우·리페인트: 발생 시점을 표준이 정하지 않고 실행 결과로 결정적으로 보이기 어렵다. 1번에서 한 줄 언급 또는 제외.
- 43장 Ajax·44장 REST API: 네트워크·서버가 필요한 호스트 API라 다음 로드맵에서 정한다.
- 45~48장(프로미스·제너레이터·async/await·에러 처리·모듈)은 다음 로드맵.

## 진행 기록

- 2026-11-03: 범위(38~42장, 책 순서), 검증 방식(Playwright 실제 브라우저), 카테고리(`browser` 추가), 개념 8개 사용자 결정. 0번 인프라 계획부터 진행.
- 2026-11-03: 0번 브라우저 예제 실행 인프라 완료(`browser-example-runtime.md`). 1번 script의 async와 defer 계획 시작.
- 2026-11-03: 1번 `script-async-defer`(order 340, browser 첫 개념, 36번째·마지막, 모드 비교표 10행 + 퀴즈 9개, 브라우저 예제 9개) 완료. 외부 검토 두 차례 반영. 다음은 2번 DOM 트리와 노드 종류.
