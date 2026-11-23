# 추가 게시글 로드맵 4 (미뤄 둔 주제 5개)

- 상태: 승인
- 작성일: 2026-11-23
- 기준: `main` @ `3ab9dab`

## 배경

- 추가 게시글 로드맵 3(함수 정의 방법 `c0f2325`, 함수의 name `9350034`, 객체를 원시 값으로 `856b151`, 배열 고차 함수 `9f08931`, 태그드 템플릿 `3ab9dab`)은 2026-11-23 완료했다.
- 사용자 요청으로 다음 후보를 추천했다(2026-11-23). 추천 방법은 다음과 같다.
  - 기존 75개 페이지의 `meta.simplifications`에서 "다루지 않는다"고 밝힌 주제를 모았다.
  - 『모던 자바스크립트 Deep Dive』의 장 중 다루지 않은 범위와 대조했다.
  - 후보마다 기존 본문과 겹치는지 grep했다.
- 사용자가 추천 5개로 초안을 요청했다.
- 진행 방식은 이전 로드맵과 같다. 개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`으로 진행하고, 개념마다 계획 문서를 쓴다. 다음에 쓸 개념은 매번 사용자에게 확인한다.

| # | 후보 | 이미 있는 서술 | 남은 범위 |
| - | - | - | - |
| 1 | 세미콜론 자동 삽입 | `iife-module-pattern`이 다음 줄이 `(`로 시작하는 사례만, `tagged-templates`가 백틱 사례만 다룬다. `expressions-statements`는 `{ a: 1 }`의 `}` 앞 삽입만 언급하고 "나머지는 별도 개념"이라 밝혔다. `strict-mode`는 "세부 규칙은 다루지 않음"이라 밝혔다 | 명세의 세 규칙(줄바꿈 뒤 허용되지 않는 토큰, 입력 끝, 줄바꿈을 막는 제한된 생성 규칙), `return`·`throw`·`break`·후위 `++` 뒤 줄바꿈, 다음 줄이 `(`·`[`·백틱·`+`·`-`·`/`로 시작하는 함정, `for` 머리와 빈 문에는 넣지 않는 예외 |
| 2 | 프로미스를 반환하는 then | `promise`가 thenable 채택 Job(NewPromiseResolveThenableJob)이 있다는 것과 결과 값을 다룬다. `microtask-queue`는 "콜백이 프로미스를 반환하면 다음 Job이 들어가는 때가 달라지며 그 경우의 순서는 다루지 않음"이라 밝혔다. `error-handling`은 `return await`와 `return p`의 try·finally 차이만 다룬다 | 다른 체인과 섞였을 때의 순서(Job 두 개만큼 늦어짐), 채택 Job과 then 반응 Job의 단계, async 함수의 `return p`와 `return await p`의 순서 차이 |
| 3 | 잡히지 않은 예외와 전역 error 이벤트 | `error-handling`은 "스크립트 최상위에서 잡히지 않은 예외와 onerror 핸들러 속성은 다루지 않음"이라 밝혔고, report an exception과 unhandledrejection은 문장으로만 언급한다 | script 요소마다 따로 실행되어 앞 script의 예외가 뒤 script를 막지 않는 것, 예외가 난 script의 나머지 줄은 실행되지 않는 것, 전역 `error` 이벤트와 `preventDefault`, `unhandledrejection`이 발생하는 시점 |
| 4 | MutationObserver | `microtask-queue`의 simplifications와 본문이 "렌더링 갱신과 MutationObserver는 다루지 않음"이라 밝혔다. 다른 페이지는 언급하지 않는다 | 콜백이 변경마다가 아니라 마이크로태스크 하나로 묶여 불리는 것(레코드 여러 개), 첫 변경 때 마이크로태스크가 들어가서 그 뒤에 등록한 `then`보다 먼저 불리는 것, `takeRecords`로 꺼낸 레코드는 콜백에 오지 않는 것, 관찰 옵션(childList·attributes·subtree) |
| 5 | Math | `bigint`가 `Math.max`의 ToNumber만, `number-pitfalls`가 `Math.round`의 가운데 규칙만 다룬다. `bigint`의 simplifications는 "Math는 뒤의 장에서 다루는 내장 객체"라 밝혔다 | 인수 없는 `Math.max()`·`Math.min()`의 값(-Infinity·Infinity), 배열을 넘기면 ToNumber 때문에 생기는 결과(`[2]`는 2, `[1, 2]`는 NaN), 스프레드와 빈 배열, `NaN`이 섞이면 `NaN`, `Math.round`·`Math.floor`·`Math.trunc`의 음수와 -0 |

"다루지 않는다"고 밝힌 페이지(연결 대상 후보):

- 1번: `expressions-statements`(simplifications "나머지는 별도 개념"), `strict-mode`(simplifications와 본문 15줄), `iife-module-pattern`(`(` 사례 본문은 그대로 두고 링크만), `tagged-templates`(백틱 사례 문단)
- 2번: `microtask-queue`(simplifications 예제 4 문장), `promise`(thenable 절), `async-await`
- 3번: `error-handling`(simplifications와 본문 85줄)
- 4번: `microtask-queue`(simplifications와 본문 124줄)
- 5번: `bigint`(simplifications), `number-pitfalls`(`Math.round` 절은 그대로 두고 링크만), `global-object`

## 개념 목록 (안)

| # | 개념 (가제) | 책 범위 | 핵심 오해 포인트 (실행으로 확인한 결과) | 런타임 | order (안) | 시각화 (안) | 상태 |
| - | - | - | - | - | - | - | - |
| 1 | 세미콜론 자동 삽입: return 다음 줄의 객체는 왜 반환되지 않을까 | 5장 | `return` 다음 줄에 `{ a: 1 };`를 쓴 함수는 `undefined`. `var a = b` 다음 줄 `++c`는 `++`가 다음 줄에 붙어 `a, b, c`가 `1 1 3`. `var s = [1, 2]` 다음 줄 `[0, 1].forEach(...)`는 앞 줄에 이어져 TypeError (Node) | ecmascript | 105 (`function-calls` 100과 `hoisting` 110 사이, 계획 때 6에서 변경) | 표 + 퀴즈 | 완료 |
| 2 | 프로미스를 반환하는 then: 왜 다른 체인보다 두 번 늦을까 | 45장 | A 체인 첫 콜백이 `Promise.resolve()`를 반환하고 B 체인은 값만 반환하면 순서는 `A1 B1 B2 B3 A2 B4 B5` (Node) | ecmascript | 443 (`promise-static-methods` 442와 `fetch` 445 사이) | 단계 시뮬레이터 또는 표 (계획 때 결정) | 제외 |
| 3 | 잡히지 않은 예외: 한 script에서 예외가 나도 다음 script는 왜 실행될까 | 47장 | 첫 script가 `null.x`에서 예외를 던지면 그 뒤 줄(`s1 end`)은 실행되지 않고 전역 `error` 이벤트가 먼저 오고, 다음 script는 실행된다(`s2 runs`). 거부를 처리하지 않은 프로미스는 그 script가 끝난 뒤에 `unhandledrejection` (Chromium) | browser | 472 (`error-handling` 470과 `async-generator` 475 사이) | 표 + 퀴즈 | 대기 |
| 4 | MutationObserver: 세 번 바꿨는데 콜백은 왜 한 번만 불릴까 | 39장 근처 (책에 장 없음) | 관찰 중인 `ul`에 `li`를 세 번 붙이면 동기 코드가 끝난 뒤 콜백이 한 번 불리고 레코드는 3개(`mo 3 3`). 첫 번째와 두 번째 `appendChild` 사이에 등록한 `then`보다 콜백이 먼저, `setTimeout(fn, 0)`보다도 먼저 실행(`sync end 3`, `mo 3 3`, `then`, `timeout`). 속성을 두 번 바꾼 뒤 `takeRecords()`로 2개를 꺼내면 콜백에는 그 뒤의 변경 1개만 온다(`taken 2`, `cb 1`) (Chromium) | browser | 444 (`fetch` 445 앞, 2번이 443) | 표 + 퀴즈 (단계 시뮬레이터는 계획 때 결정) | 대기 |
| 5 | Math: Math.max()는 왜 -Infinity일까 | 29장 | `Math.max()`는 `-Infinity`, `Math.min()`은 `Infinity`, `Math.max([2])`는 `2`인데 `Math.max([1, 2])`는 `NaN`, `Math.max(...[])`는 `-Infinity`, `Math.round(-0.4)`는 -0 (Node) | ecmascript | 278 (`date` 277과 `regexp-lastindex` 280 사이) | 표 + 퀴즈 | 대기 |

- 순서는 책 장 순서가 아니라 추천 순서다. 1번은 미뤄 둔 페이지가 가장 많다. 2·3·4번은 비동기·에러 페이지가 범위를 밝혀 둔 빈자리다. 4번은 책에 장이 없지만 사용자가 원래 4번(이벤트 핸들러 어트리뷰트) 대신 골랐다.
- order는 모두 중간 삽입이다. 삽입할 때마다 순서 테스트를 고친다. 총수, `navigation.spec.ts`의 순위·이웃 pager·"객체" 검색 순위 배열이 대상이다.
  - 1번(6)은 학습 순서 3번째라 뒤 순위가 거의 모두 밀린다.
  - 맨 앞 개념(3)은 바뀌지 않는다.
- 시각화는 각 계획에서 사용자와 다시 정한다.

## 계획 때 확인할 것

- 1번
  - 명세의 Automatic Semicolon Insertion 절(규칙 세 개와 Note의 예)로 설명한다.
  - 5장 범위라 함수·`return`을 전제할 수 있는지 확인한다. 함수 페이지는 order 95 이후다. 필요하면 `return` 예제만 "함수는 뒤에서 다룬다"고 밝히거나 order를 조정한다.
  - 기존 네 페이지의 사례(`(`, 백틱, `}` 앞, 지시어)와 중복되지 않게 링크로 연결한다.
  - "세미콜론을 항상 쓰라" 같은 스타일 권고는 쓰지 않는다.
- 2번
  - 명세의 Promise Resolve Functions(then 메서드를 가진 값이면 NewPromiseResolveThenableJob을 넣음)와 then 반응 Job의 순서로 Job 두 개만큼 늦어지는 것을 설명한다.
  - 엔진 최적화(V8의 await 최적화, ES2019의 await 단계 축소)는 명세 판 차이와 구분한다.
  - async 함수의 `return p`(await와 다른 경로)도 같은 Node 실행으로 순서를 확인한다.
- 3번
  - HTML 표준의 script 실행(execute the script element), report an exception, unhandled rejection 알림 시점(마이크로태스크 체크포인트 뒤 notify about rejected promises)으로 설명한다.
  - 브라우저 실행기는 pageerror면 실패하므로, 예제는 전역 error·unhandledrejection 리스너에서 `preventDefault()`한다(content-guide "브라우저 예제").
  - 이벤트 메시지 문자열(`Uncaught TypeError: ...`)은 브라우저마다 다르므로 출력하지 않는다.
  - 모듈 script와 다른 출처 script의 `Script error.`는 범위에서 뺄지 정한다.
- 4번
  - DOM 표준의 queue a mutation record(첫 레코드일 때 mutation observer microtask를 큐에 넣음)와 notify mutation observers로 설명한다. 콜백이 `then`보다 먼저인 이유는 큐에 들어간 순서다. "MutationObserver가 프로미스보다 우선순위가 높다"는 틀린 모델을 예제로 배제한다(마이크로태스크를 먼저 등록하면 순서가 바뀌는지 확인).
  - 마이크로태스크와 체크포인트는 `microtask-queue`를 전제로 링크한다. 그래서 order를 마이크로태스크 뒤(444)에 둔다.
  - 레코드 내용은 원시 값만 출력한다(type, 노드 이름, 개수). 레코드 객체를 직접 출력하지 않는다.
  - `disconnect`, `attributeOldValue`·`characterData`, 관찰 대상이 지워질 때의 동작은 범위를 계획 때 정한다.

- 5번
  - 명세의 Math.max(+∞ 대신 −∞에서 시작, 인수마다 ToNumber, NaN이면 NaN, +0과 -0 비교)로 설명한다.
  - `Math.random`의 구현 정의 부분과 정밀도가 구현에 따라 다른 함수(`Math.sin` 등)는 결과를 출력하지 않는다.
  - `number-pitfalls`의 `Math.round` 가운데 규칙과 겹치지 않게 링크한다.
  - order 278은 책 순서(28장 Number → 29장 Math → 30장 Date)와 달리 Date 뒤다. `bigint` 276과 `date` 277 사이에 정수 order가 없기 때문이다. 이 점을 사용자에게 확인한다.

## 결정 (2026-11-23, 사용자 확정)

- 목록 5개와 순서를 확정했다: 1 세미콜론 자동 삽입 → 2 프로미스를 반환하는 then → 3 잡히지 않은 예외 → 4 MutationObserver → 5 Math.
- 4번은 이벤트 핸들러 어트리뷰트 대신 MutationObserver로 정했다.
- Math는 order 278(Date 뒤)로 정했다.
- 각 개념의 범위·시각화·slug는 개념별 계획에서 다시 정한다.

## 보류·제외

- 2번 프로미스를 반환하는 then(2026-11-23 사용자 결정으로 제외): 계획 조사에서 `async-await`의 "이행된 프로미스를 return하면 늦어진다" 절·예제 5(tick 체인과 섞여 늦어지는 순서, `await p`는 Job이 끼지 않는 이유)와 `promise`의 thenable 절·예제 5·시뮬레이터 시나리오가 같은 절차를 이미 다룬다는 것을 확인했다. 추천 때는 grep으로 hit만 보고 절을 읽지 않아 놓쳤다. 새 페이지 대신 `microtask-queue`의 "그 경우의 순서는 다루지 않음" 문장(본문·simplifications)을 async/await로 연결했다(then 콜백 반환값과 async 함수의 return은 둘 다 promiseCapability.[[Resolve]]를 부르는 같은 resolve 절차).

- 이벤트 핸들러 어트리뷰트의 스코프와 지연 컴파일: 원래 4번 후보였다. 어트리뷰트·프로퍼티 동일 핸들러와 `return false`는 `event-propagation-delegation`·`prevent-default-stop-propagation`이 이미 다뤄 남는 범위가 좁다. 사용자 결정으로 MutationObserver로 바꿨다(2026-11-23). 실행 확인: form 안 버튼의 `onclick="console.log(nick.value, typeof title)"`은 `kim string`, 문법 오류 `onclick`은 `click()`할 때 SyntaxError가 `error` 이벤트로 보고되고 그 뒤 프로퍼티는 `null` (Chromium).
- 옵셔널 체이닝 나머지(`?.()`, `?.[]`, `(a?.b).c`, 대입 대상 금지): `short-circuit-evaluation`이 `?.` 체인 단축을 이미 다뤄 남는 범위가 좁다.
- Proxy와 Reflect: 책에 장이 없다. 여러 페이지가 "다루지 않음"으로 언급한다. 다음 로드맵 후보다.
- parseInt 함정: `global-object` 예제 8이 `parseInt(0.0000005)`와 기수 규칙을 다룬다. 제외.
- dispatchEvent의 동기 실행: `microtask-queue` 예제 7(click()의 리스너)이 다룬다. 제외.

## 진행 기록

- 2026-11-23: 로드맵 3 완료 뒤 사용자 요청으로 후보 5개 추천, 사용자가 추천 5개로 초안 요청. 초안 작성 중 4번의 겹침(어트리뷰트·프로퍼티 동일, `return false`)을 발견해 남은 범위를 스코프와 지연 컴파일로 좁히고, 대안 후보(MutationObserver)를 적었다. 브라우저 후보 3·4번의 결과는 Chromium(@playwright/test)으로 실행해 확인했다.
- 2026-11-23: 사용자 결정으로 4번을 MutationObserver(order 444)로 바꿨다. 원래 4번은 보류·제외로 옮겼다. MutationObserver 결과는 Chromium으로 실행해 확인했다.
- 2026-11-23: 사용자가 초안(Math order 278 포함)을 확정했다. 다음은 1번 세미콜론 자동 삽입(사용자 확인 후 계획).
- 2026-11-23: 1번 `automatic-semicolon-insertion` 완료(제목은 "return 다음 줄의 값은 왜 반환되지 않을까"로 바꿈. `{ a: 1 }`은 세미콜론이 들어간 뒤 블록이라 "객체"가 틀린 표현. order 105·15번째/76, 예제 4개·규칙 표 8행·퀴즈 4개, expressions-statements·iife-module-pattern·tagged-templates 연결, strict-mode는 지시어 사례를 다루지 않아 연결 안 함, reviewedAt 2026-11-23). 다음은 2번 프로미스를 반환하는 then(사용자 확인 후 계획).
- 2026-11-23: 2번 계획 조사에서 기존 페이지와의 중복을 발견해 사용자 결정으로 제외했다(보류·제외 절). 대신 microtask-queue 문장을 async/await로 연결했다. 로드맵 4는 4개로 진행하고, 다음은 3번 잡히지 않은 예외(사용자 확인 후 계획).
