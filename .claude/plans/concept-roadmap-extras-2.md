# 추가 게시글 로드맵 2 (기존 페이지가 미뤄 둔 주제 5개)

- 상태: 승인
- 작성일: 2026-11-17
- 기준: `main` @ `7ac81dd`

## 배경

- 추가 게시글 로드맵 1(arguments 객체 `4c7d48c`, classList와 style `7ac81dd`)은 2026-11-17 완료했다.
- 이번 로드맵은 기존 65개 페이지의 `meta.simplifications`가 "다루지 않는다"고 밝힌 주제에서 5개를 골랐다(2026-11-17 사용자 요청).
- 진행 방식은 이전 로드맵과 같다. 개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`으로 진행하고, 개념마다 계획 문서를 쓴다. 다음에 쓸 개념은 매번 사용자에게 확인한다.

## 조사 결과: 기존 페이지와 겹치는 범위

후보를 추천할 때는 grep 빈도만 봤다. 본문을 읽어 보니 두 후보는 이미 일부가 쓰여 있어 범위를 좁혔다.

| # | 후보 | 이미 있는 서술 | 남은 범위 |
| - | - | - | - |
| 1 | DOM 조작 | `dom-tree-nodes`가 `textContent` 대입(텍스트 노드 하나로 교체)을 다룬다. `script-async-defer`가 "innerHTML로 넣은 script는 실행되지 않는다"를 설명한다 | `innerHTML` 대입·읽기, `insertAdjacentHTML`, `createElement`, 노드 삽입과 이동, `DocumentFragment`, `cloneNode` |
| 2 | 접근자 프로퍼티 | `property-attributes`에 '접근자 프로퍼티' 절과 예제 2개(getter는 읽을 때마다 호출, setter와 디스크립터)가 있다 | 클래스의 `get`·`set`, 상속된 setter와 대입, getter만 오버라이드한 경우, 클래스 필드와 접근자의 관계 |
| 3 | 깊은 복사와 structuredClone | `spread-destructuring`에 '얕은 복사' 절과 예제, `json`에 '깊은 복사로 쓸 때 잃는 것' 절이 있다 | `structuredClone`이 보존하는 것과 잃는 것, 던지는 값 |
| 4 | requestAnimationFrame | 없음(`event-loop`·`microtask-queue`·`timers`가 다루지 않는다고만 밝힘) | 전부 |
| 5 | BigInt | `number-pitfalls`에 'BigInt' 절과 예제 9가 있고 `data-types`가 그 페이지를 가리킨다 | Number와 섞을 때의 규칙(산술 TypeError, 비교는 허용), 변환 오류의 종류, 나눗셈, `==` |

"다루지 않는다"고 밝힌 페이지(연결 대상 후보):

- 1번: `dom-tree-nodes`, `script-async-defer`
- 2번: `class-basics`, `class-inheritance`, `arrow-functions`, `property-keys`, `property-order`, `property-attributes`(상속된 setter는 프로토타입 체인 개념에서 다룬다고 적음 — 계획 때 실제로 다루는지 확인)
- 3번: `json`, `spread-destructuring`, `array-method-pitfalls`
- 4번: `event-loop`, `microtask-queue`, `timers`
- 5번: `equality-operators`, `increment-decrement`, `type-coercion`, `number-pitfalls`(비트 연산·asIntN)

## 개념 목록 (안)

| # | 개념 (가제) | 책 범위 | 핵심 오해 포인트 (실행으로 확인한 결과) | 런타임 | order (안) | 시각화 (안) | 상태 |
| - | - | - | - | - | - | - | - |
| 1 | DOM 조작: innerHTML에 `+=`를 했는데 먼저 잡아 둔 요소는 왜 문서에서 빠질까 | 39장 | `d.innerHTML += '<i>x</i>'` 뒤 먼저 얻어 둔 자식은 `isConnected`가 `false`(자식 전체가 새 노드로 교체). `insertAdjacentHTML`은 기존 자식을 그대로 둠. `appendChild`로 이미 문서에 있는 노드를 넣으면 복사가 아니라 이동(원래 부모의 자식 수 2 → 1). `DocumentFragment`를 넣으면 프래그먼트가 비워짐(자식 0). `div.innerHTML = '<tr>…'`은 `1`만 남고, `table`에서는 `<tbody>`가 생김 | browser | 377 (`classlist-style` 뒤) | 노드 트리 시뮬레이터 후보 | 완료 |
| 2 | 클래스의 getter와 setter: 대입했는데 왜 자기 프로퍼티가 생기지 않을까 | 16장, 25장 | 클래스의 `get v`·`set v`는 프로토타입의 접근자라 `a.v = 5` 뒤에도 `Object.hasOwn(a, 'v')`는 `false`. 상속된 setter가 있으면 대입은 setter를 호출. 서브클래스가 getter만 다시 정의하면 대입이 sloppy에서는 무시, strict에서는 TypeError. 서브클래스의 필드 `v = 2`는 상속된 getter를 가리는 자기 프로퍼티를 만듦 | ecmascript | 245 (`class-inheritance` 뒤) | 표 + 퀴즈 | 완료 |
| 3 | structuredClone: 깊은 복사인데 왜 메서드와 클래스는 사라질까 | 11장 이후 | `Date`·`Map`·중첩 객체·`undefined` 프로퍼티·순환 참조·BigInt는 보존. 함수와 심벌 값은 `DataCloneError`(DOMException). 클래스 인스턴스는 프로토타입이 `Object.prototype`이 되고 접근자는 데이터 프로퍼티로 바뀜(`{value: 7, writable: true, …}`) | browser (호스트 API) | 425 (`json` 뒤) | 값별 결과표(`json`의 표와 나란히) | 대기 |
| 4 | requestAnimationFrame: 콜백은 언제 실행될까 | 41~42장 | 같은 프레임의 콜백 두 개는 같은 타임스탬프를 받음. 콜백 안에서 다시 등록한 콜백은 다음 프레임. 콜백 하나가 끝날 때마다 마이크로태스크가 먼저 실행(`raf1 → micro-in-raf → raf2`). `cancelAnimationFrame`한 콜백은 실행되지 않음 | browser | 441 (`microtask-queue` 뒤) | 이벤트 루프 시뮬레이터에 렌더링 단계를 더한 것 후보 | 대기 |
| 5 | BigInt와 Number: 비교는 되는데 왜 더하기는 TypeError일까 | 6장 이후 | `1n == 1`은 `true`, `1n === 1`은 `false`, `2n > 1`은 `true`. `1n + 1`, `+1n`, `Math.max(1n)`은 TypeError. `BigInt(1.5)`는 RangeError, `BigInt('1.5')`는 SyntaxError. `5n / 2n`은 `2`, `-5n / 2n`은 `-2`. `Number(2n ** 64n)`은 `18446744073709552000` | ecmascript | 276 (`number-pitfalls` 뒤) | 연산 결과표 + 퀴즈 | 대기 |

- 위 결과는 2026-11-17 Node(로컬)와 Playwright Chromium으로 한 번씩 확인한 값이다. 페이지에 쓸 때는 각 계획에서 프로젝트 실행기로 다시 실행하고 명세·표준 원문과 대조한다.
- 순서는 남은 범위가 넓고 최근 페이지와 이어지는 것부터 놓았다. 1번은 직전 페이지 `classlist-style`과 같은 장이다. 5번은 남은 범위가 가장 좁다.
- order는 중간 삽입이다. 삽입할 때마다 순서 테스트(총수, `navigation.spec.ts`의 순위·이웃 pager)를 고친다.
- 시각화는 각 계획에서 사용자와 다시 정한다.

## 계획 때 확인할 것

- 1번: `innerHTML` 대입 직후의 `window.ran`이 `0`인 것은 동기 시점의 값이다. `<img onerror>`는 나중에 실행되므로 "innerHTML로 넣은 코드는 실행되지 않는다"고 쓰면 틀린다. 예제와 문장을 script 요소로 한정한다. Trusted Types는 `script-async-defer`가 이미 한정해 두었다.
- 2번: `property-attributes`의 접근자 절·예제와 겹치지 않게 범위를 클래스와 상속으로 잡는다. private 필드(`#v`)를 예제에 쓸지는 `class-basics`가 다룬 범위를 보고 정한다.
- 3번: `structuredClone`은 HTML 표준의 호스트 API다. Node vm 컨텍스트에는 전역이 없으므로 `runtime: 'browser'`로 검증한다. 전송(transfer)과 `postMessage`는 범위 밖 후보다.
- 4번: 탐침에서 `requestAnimationFrame` 콜백이 `setTimeout(…, 0)` 콜백보다 먼저 실행됐지만(`raf1 → raf2 → timeout0`), 이 순서는 표준이 보장하지 않는다. `timers`·`microtask-queue`의 교훈대로 예제 출력에 넣지 않는다. 헤드리스 Chromium의 프레임 시점이 테스트에서 안정적인지도 먼저 확인한다.
- 5번: 범위가 좁아 독립 페이지로 충분한지 계획 때 다시 판단한다. 부족하면 `number-pitfalls`의 BigInt 절을 넓히는 쪽을 사용자에게 제안한다.

## 결정 (2026-11-17, 사용자가 초안 그대로 확정)

- 목록 5개와 순서(1 DOM 조작 → 2 클래스 접근자 → 3 structuredClone → 4 requestAnimationFrame → 5 BigInt)를 확정했다.
- 2번의 범위는 "클래스와 상속의 접근자"로 좁힌다. 접근자 프로퍼티 전반은 `property-attributes`가 이미 다룬다.
- 5번 BigInt는 독립 페이지로 둔다. 범위가 충분한지는 5번 계획 때 다시 확인한다.

## 보류·제외

- `call`·`apply`·`bind`, `instanceof`: `this-binding`·`prototype-chain` 본문에 이미 나오고 "다루지 않는다"는 표기가 거의 없다.
- Web Storage: 어느 페이지도 언급하지 않아 연결할 곳이 없다.
- `getComputedStyle` 심화(값 형식, 의사 요소): `classlist-style`의 후속 후보로만 남긴다.
- MutationObserver: `microtask-queue`가 미뤘지만 이번 5개에 넣지 않았다. 4번 뒤 후보.

## 진행 기록

- 2026-11-17: 후보 5개 추천 뒤 사용자 요청으로 로드맵 초안 작성. 기존 본문과 겹치는 범위를 확인해 2번·5번의 범위를 좁혔다.
- 2026-11-17: 사용자가 초안 그대로 확정. 1번 DOM 조작부터 계획.
- 2026-11-17: 1번 계획 작성(`dom-manipulation.md`, 사용자 결정: 추가 주제 4개 모두 — DocumentFragment, 문맥 파싱과 읽기, cloneNode와 remove, innerHTML과 코드 실행 / 노드 트리 시뮬레이터 / slug `dom-manipulation`, 제목 "DOM 조작: innerHTML에 +=를 했는데 먼저 잡아 둔 요소는 왜 문서에서 빠질까", order 377). Consensus 검토 반영, 승인 대기.
- 2026-11-17: 1번 `dom-manipulation`(order 377, browser, 52번째 / 66, 예제 7개·퀴즈 7개·메서드 비교표·노드 트리 시뮬레이터 10·15단계) 완료. 사용자 콘텐츠 검토 두 차례(8건+선택 2건, 2건) 반영, `reviewedAt` 2026-11-17. 결과 표는 마크업 출력을 대조하지 못해 두지 않음. 다음은 2번 클래스의 getter와 setter.
- 2026-11-18: 2번 계획 작성(`class-accessors.md`, 사용자 결정: 핵심 4개 + 추가 4개 모두 — 필드는 setter를 부르지 않음, 부모 생성자가 자식 setter 호출, static·private 접근자, setter 재귀 / 표+퀴즈 / slug `class-accessors`, order 245). Consensus 검토 반영, 승인.
- 2026-11-18: 2번 `class-accessors`(order 245, objects, 33번째 / 67, 예제 9개·정리 표 12행·퀴즈 9개) 완료. Opus 리뷰 High 1(예제 8의 증거력)·Medium 1 수정, 사용자 검토 4건 반영, `reviewedAt` 2026-11-18. 다음은 3번 structuredClone.
