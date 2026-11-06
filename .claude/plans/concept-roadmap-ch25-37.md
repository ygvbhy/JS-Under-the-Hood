# 개념 로드맵 (Deep Dive 25~37장 범위)

- 상태: 완료
- 작성일: 2026-10-30
- 기준: `main` @ `4afa898`

## 결정 (2026-10-30, 사용자)

- 범위: 『모던 자바스크립트 Deep Dive』 25~37장(클래스 ~ Set과 Map). 모두 언어 동작이라 지금 예제 실행기(vm 스크립트, Promise microtask 지원)로 검증할 수 있다. 42~48장(비동기·에러 처리·모듈)은 다음 로드맵에서 정한다. 38~41장(브라우저 렌더링·DOM·이벤트·타이머)은 실행기가 지원하지 않아 그때 따로 정한다.
- 진행 방식은 13~24장 로드맵과 같다. 개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`으로 진행하고, 개념마다 계획 문서(`.claude/plans/<slug>.md`)를 둔다. 한 페이지는 그 개념의 장까지만 전제로 쓰고, 뒷장 개념은 "별도 개념"으로만 언급한 뒤 `simplifications`에 밝힌다. 따로 설명이 필요한 내용은 계획 단계에서 추가 게시글 후보로 제안하고, 사용자가 확인하면 목록에 넣는다.
- strict mode 예제(첫 줄 `'use strict';`)를 허용한다. 클래스 본문은 항상 strict라서 클래스 예제는 지시어 없이도 strict 동작을 보인다.

## 기존 개념 (겹치지 않게 할 범위)

- `new-operator`(17장): 함수로 만든 생성자만 다뤘다. 클래스를 `new` 없이 부르면 TypeError가 난다는 것과 파생 클래스의 `return`은 simplifications로 미뤘다 → 1·2번이 이어받는다.
- `prototype-chain`(19장): `prototype`과 `[[Prototype]]`, 체인 탐색은 다뤘다 → 2번은 `extends`가 만드는 두 체인(인스턴스 쪽과 생성자 쪽)만 다룬다.
- `this-binding`(22장): 화살표 함수는 `this`를 정하는 방식만 다뤘고, "화살표 함수의 구조와 문법 전반은 별도 개념"이라고 적었다 → 3번이 이어받는다.
- `property-keys`(10장): 키는 문자열이나 심벌이고, 객체를 키로 쓰면 문자열로 바뀐다 → 4번(배열 인덱스도 키)과 11번(Map은 객체 자체를 키로 씀)이 이 내용 위에 선다.
- `primitive-methods`(21장): 원시 값의 메서드 호출과 래퍼 객체를 다뤘다 → 7번은 문자열의 길이(UTF-16)와 불변성만 다룬다.
- `number-type`(5장): `0.1 + 0.2`와 부동소수점을 다뤘다 → 28장(Number)은 따로 만들지 않고 아래 "보류·제외"에 둔다.
- `equality-operators`(7장): `===`와 `==`를 다뤘다 → 5·11번은 SameValueZero(`includes`, `Set`, `Map`)가 `===`와 다른 점(NaN)을 다룬다.

## 개념 목록

| # | 개념 (가제) | 장 | 핵심 오해 포인트 (vm으로 확인한 결과) | 시각화 (안) | 상태 |
| - | - | - | - | - | - |
| 1 | 클래스는 함수다 | 25 | `typeof` 결과가 `'function'`. 선언 전에 쓰면 ReferenceError(TDZ). `new` 없이 부르면 TypeError. 본문은 항상 strict이고 메서드는 열거되지 않음 | 표 + 퀴즈 | 완료(`class-basics.md`) |
| 2 | 클래스 상속과 super | 25 | 파생 클래스 생성자에서 `super()` 전에 `this`를 쓰면 ReferenceError. `super.method()`. `extends`는 인스턴스 쪽과 생성자 쪽 두 체인을 만듦 | 체인 그림 또는 생성 단계 시뮬레이터 | 완료(`class-inheritance.md`) |
| 3 | 화살표 함수와 메서드 축약 | 26 | 화살표 함수와 메서드 축약은 생성자가 아님(`new`하면 TypeError, 화살표는 `prototype` 없음). 화살표 함수에는 자기 `arguments`·`this`가 없음 | 함수 종류별 비교표 + 퀴즈 | 완료(`arrow-functions.md`) |
| 4 | 배열은 객체다: 인덱스와 length | 27 | 인덱스는 프로퍼티 키. `[1, , 3]`은 `length`가 3이지만 `1 in a`는 false(희소 배열). `length`에 작은 값을 대입하면 요소가 지워짐 | 프로퍼티 표 | 완료(`array-index-length.md`) |
| 5 | 배열 메서드의 함정 | 27 | `[10, 9, 1].sort()`는 `[1, 10, 9]`(기본 비교가 문자열 비교). 원본을 바꾸는 메서드와 새 배열을 만드는 메서드가 다름. `[NaN].indexOf(NaN)`은 -1이지만 `includes`는 true | 표 + 퀴즈 | 완료(`array-method-pitfalls.md`) |
| 6 | 정규 표현식의 g 플래그와 lastIndex | 31 | 같은 `/a/g`로 `test('a')`를 반복하면 `true, false, true`. 원인은 `lastIndex` 상태 | lastIndex 단계 시뮬레이터 | 완료(`regexp-lastindex.md`) |
| 7 | 문자열 길이와 UTF-16 | 32 | `'😀'.length`는 2지만 `[...'😀'].length`는 1(코드 유닛과 코드 포인트). 문자열은 불변이라 인덱스에 대입해도 바뀌지 않음 | 코드 유닛 표 | 완료(`string-utf16.md`) |
| 8 | 심벌: 충돌하지 않는 프로퍼티 키 | 33 | `Symbol('x') === Symbol('x')`는 false, `Symbol.for`는 true. 심벌 키는 `Object.keys`·`JSON.stringify`·`for...in`에 나타나지 않음. well-known 심벌 | 표 + 퀴즈 | 완료(`symbol.md`) |
| 9 | 이터러블과 for...of | 34 | 일반 객체에 `for...of`를 쓰면 TypeError. 이터레이션 프로토콜(`Symbol.iterator`, `next`). 스프레드와 배열 디스트럭처링도 이 프로토콜을 씀 | 이터레이터 `next` 단계 시뮬레이터 | 완료(`iterable-for-of.md`) |
| 10 | 스프레드와 디스트럭처링 | 35·36 | 스프레드 복사는 얕은 복사. 디스트럭처링 기본값은 `undefined`일 때만 쓰이고 `null`이면 쓰이지 않음 | 표 + 퀴즈 | 완료(`spread-destructuring.md`) |
| 11 | Set과 Map: 키는 어떻게 같다고 판단할까 | 37 | `new Set([NaN, NaN, 0, -0]).size`는 2(SameValueZero). 모양이 같은 객체 두 개는 다른 키. 일반 객체에 객체를 키로 넣으면 `'[object Object]'` 하나로 합쳐짐 | 표 + 퀴즈 | 완료(`set-map.md`) |

- 시각화는 각 계획에서 사용자와 다시 정한다. 위 칸은 출발점이다.
- 위 "핵심 오해 포인트"의 결과는 2026-10-30 Node v24.22.1 vm `runInNewContext`로 확인했다. 페이지에 쓸 때는 각 계획에서 예제로 다시 실행하고 명세와 대조한다.

## 보류·제외 (사용자 확인)

- 28장 Number: `number-type`이 부동소수점을 다뤘다. `(1.005).toFixed(2)`가 `'1.00'`인 것, `Number.MAX_SAFE_INTEGER + 2`가 `9007199254740992`인 것(안전한 정수)은 추가 게시글 후보로 둔다.
- 29장 Math: 메서드 목록 성격이라 개념 페이지로 만들지 않는다.
- 30장 Date: 결과가 호스트의 시간대에 따라 달라 "실제 실행으로 검증"하기 어렵다. 제외하거나, 시간대 고정 방법을 정한 뒤 다시 검토한다.
- 26장 매개변수 기본값 (2026-11-06 추가 게시글 `default-parameters`, order 255로 작성): 3번 `arrow-functions`에서 다루지 않았다(사용자 결정 2026-11-02, 범위는 화살표 함수·메서드 축약·rest). `undefined`일 때만 적용, 호출할 때마다 평가, `length`에서 빠짐, 매개변수 스코프를 추가 게시글 후보로 둔다.

## 개념 간 메모 (각 계획에서 확인)

- 1·2번 클래스는 `new-operator`·`prototype-chain`·`tdz`를 선수 개념으로 둔다. private 필드(`#x`)와 static 블록을 1번에 넣을지, 추가 게시글로 둘지는 1번 계획에서 정한다.
- 3번은 26장이라 1·2번 뒤에 둔다. `this-binding`의 화살표 함수 절과 겹치지 않게 `this`는 요약과 링크로만 다룬다.
- 5번의 콜백 메서드(`map`·`filter`·`reduce`)를 어디까지 다룰지는 5번 계획에서 정한다. 고차 함수 자체는 27장 범위다.
- 9번 이터러블은 34장이지만, 35·36장(스프레드·디스트럭처링)이 이 프로토콜을 쓰므로 10번보다 앞에 둔다. 제너레이터(46장)는 "별도 개념"으로만 쓴다.
- order: 기존 마지막이 for-let(220)이므로 230부터 10 간격으로 매긴다. 선수 개념보다 큰 번호여야 한다(테스트가 검사). 새 개념이 학습 순서의 마지막이 되면 개수와 마지막 개념을 고정한 테스트(`app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `navigation.spec.ts`, `responsive.spec.ts`)도 갱신한다.

## 진행 기록

- 2026-10-30: 범위(25~37장)와 진행 방식(13~24장과 같음) 사용자 결정. 개념 목록 초안 11개 작성.
- 2026-10-30: 개념 목록 11개와 보류·제외(28장 후보, 29·30장 제외) 사용자 확정. 1번부터 진행.
- 2026-10-30: 1번 '클래스는 함수다'(`class-basics`, order 230, category `objects`) 계획 작성(사용자 결정: 클래스 이름 바인딩·인스턴스 필드와 static·private 필드·메서드는 생성자가 아님 포함, 비교표 + 퀴즈).
- 2026-10-30: 1번 `class-basics` 구현·리뷰·외부 콘텐츠 검토 2회(5건 중 4건·1건, 나머지 1건은 공통 부품 제목이라 별도 커밋) 반영 완료, 커밋.
- 2026-10-30: 사용자 콘텐츠 검토 승인 — `class-basics`의 `reviewedAt`을 2026-10-30으로 기록.
- 2026-10-30: 2번 '클래스 상속과 super'(`class-inheritance`, order 240, category `objects`) 계획 작성(사용자 결정: super는 정의된 곳이 정한다·필드 초기화 순서·파생 생성자의 return과 new.target·extends 대상 포함, 시뮬레이터).
- 2026-11-02: 2번 `class-inheritance` 구현·리뷰·외부 콘텐츠 검토 2회(6건·4건) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋.
- 2026-11-02: 3번 '화살표 함수와 메서드 축약'(`arrow-functions`, order 250, category `execution`) 계획 작성(사용자 결정: rest 파라미터 포함·매개변수 기본값은 추가 게시글 후보, arguments는 이 페이지에서 짧게, 비교표 + 퀴즈, slug·제목 추천안).
- 2026-11-02: 3번 `arrow-functions` 구현·리뷰(High 1 수정)·외부 콘텐츠 검토 2회(8건·3건 중 명세와 다른 제안 1건 제외) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋.
- 2026-11-02: 4번 '배열은 객체다: 인덱스와 length'(`array-index-length`, order 260, category `objects`) 계획 작성(사용자 결정: 인덱스가 아닌 키·length 프로퍼티와 유사 배열·배열 생성의 함정·구멍을 만나는 동작 포함, length 시뮬레이터).
- 2026-11-02: 4번 `array-index-length` 구현·리뷰·외부 콘텐츠 검토 2회(7건·3건) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋·배포.
- 2026-11-02: 5번 '배열 메서드의 함정'(`array-method-pitfalls`, order 270, category `objects`) 계획 작성(사용자 결정: 콜백 메서드는 함정만 — 구멍을 만난 forEach·map과 초기값 없는 reduce, ES2023 복사 메서드·sort의 undefined와 안정성·반환값 함정 포함, 표 + 퀴즈).
- 2026-11-02: 5번 `array-method-pitfalls` 구현·리뷰(High 2 수정)·외부 콘텐츠 검토 2회(5건·3건) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋·배포.
- 2026-11-02: 6번 '정규 표현식의 g 플래그와 lastIndex'(`regexp-lastindex`, order 280, category `objects`) 계획 작성(사용자 결정: 31장 메서드(test·exec·match)만, filter와 test의 함정·리터럴은 매번 새 객체·exec 반복과 빈 매치·y 플래그 포함, lastIndex 시뮬레이터).
- 2026-11-02: 6번 `regexp-lastindex` 구현·리뷰·외부 콘텐츠 검토 2회(6건·4건) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋·배포.
- 2026-11-02: 7번 '문자열 길이와 UTF-16'(`string-utf16`, order 290, category `fundamentals`) 계획 작성(사용자 결정: 결합 문자와 normalize·이모지 조합(ZWJ)·대소문자 변환과 길이·isWellFormed 포함, for...of는 별도 개념으로 언급만, 프리셋 코드 유닛 보기).
- 2026-11-02: 7번 `string-utf16` 구현·리뷰·외부 콘텐츠 검토 1회(높음 1·중 1·낮음 3) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋·배포.
- 2026-11-02: 8번 '심벌'(`symbol`, order 300, category `objects`) 계획 작성(사용자 결정: assign·JSON의 심벌 처리·키 나열 순서·well-known 심벌 직접 정의(toStringTag·toPrimitive)·충돌 없는 확장 예 포함, 정적 표 + 퀴즈, slug `symbol`·제목 "심벌: Symbol('id')끼리는 왜 같지 않을까").
- 2026-11-02: 8번 `symbol` 구현·리뷰(High 1 수정)·외부 콘텐츠 검토 2회(5건·2건, 판 경계와 `==` 일반화는 원문·실행으로 확인해 문구 조정) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-02), 커밋·배포.
- 2026-11-02: 9번 '이터러블과 for...of'(`iterable-for-of`, order 310, category `execution`) 계획 작성(사용자 결정: break와 return·이터레이터는 한 번 쓴다·유사 배열 vs 이터러블·순회 중 배열 변경과 구멍 포함, 스프레드·배열 디스트럭처링은 프로토콜만 예제 1개, next 단계 시뮬레이터, slug `iterable-for-of`).
- 2026-11-03: 9번 `iterable-for-of` 구현·리뷰(구현 중 3건 수정)·외부 콘텐츠 검토 2회(5건·2건, 배열 이터레이터 내부 슬롯의 판 이력과 ES2025판 경계는 원문으로 확인해 문구 조정) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-03), 커밋·배포.
- 2026-11-03: 10번 '스프레드와 디스트럭처링'(`spread-destructuring`, order 320, category `objects`) 계획 작성(사용자 결정: 스프레드 vs Object.assign·null 디스트럭처링과 원시 값·rest와 기본값 평가 시점·매개변수·스왑·할당 디스트럭처링 포함, 기본값 비교표 + 퀴즈, 제목 "스프레드와 디스트럭처링: 기본값은 왜 null일 때 쓰이지 않을까"). 구현·리뷰 완료.
- 2026-11-03: 10번 `spread-destructuring` 구현·리뷰·외부 콘텐츠 검토 1회(8건, 모두 실행·명세로 확인 후 반영 — 기본값 규칙의 이유는 명세 용어 정의를 근거로 한 해석임을 명시) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-03), 커밋·배포.
- 2026-11-03: 11번 'Set과 Map'(`set-map`, order 330, category `objects`) 계획 작성(사용자 결정: 삽입 순서·순회 중 추가와 삭제·Map을 일반 객체처럼 쓸 때의 함정·WeakMap과 WeakSet 포함, 같음 비교표 + 퀴즈, 제목 "Set과 Map: NaN은 왜 한 번만 들어갈까"). 구현·리뷰 완료.
- 2026-11-03: 11번 `set-map` 구현·리뷰·외부 콘텐츠 검토 2회(8건·3건, 판별 원문으로 확인 — `getOrInsert`는 ES2026판, ES2025판부터 `get`·`has`·`delete`도 정규화 후 SameValue, WeakMap 엔트리 제거는 ES2020판 "must"·ES2021판부터 "may", Set 정의 문장은 ES2026판에서 바뀜) 반영 완료, 사용자 검토 승인(`reviewedAt` 2026-11-03), 커밋·배포. 25~37장 로드맵 11개 모두 완료.
- 2026-11-06: 보류 목록의 26장 매개변수 기본값을 추가 게시글 `default-parameters`(order 255, category `execution`)로 구현.
