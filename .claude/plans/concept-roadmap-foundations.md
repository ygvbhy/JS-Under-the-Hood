# 개념 로드맵 (기초 보강: Deep Dive 4~6장)

- 상태: 진행 중
- 작성일: 2026-11-13
- 기준: `main` @ `180a439`

## 결정 (2026-11-13, 사용자)

- 1~12장 로드맵에서 따로 쓰지 않아 여러 개념의 `prerequisites`에 링크 없는 이름으로만 남은 기초 개념 중, "왜 그렇게 동작하나"를 물을 거리가 있는 3개를 추가한다.
- 연산자, if·for 문, 객체 리터럴, HTML 구조처럼 따로 물을 거리가 약한 선행 개념은 지금처럼 이름만 둔다.
- 진행 방식은 이전 로드맵과 같다. 개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`으로 하고, 개념마다 계획 문서를 따로 만든다(`.claude/plans/<slug>.md`). 무엇을 먼저 쓸지는 매번 사용자에게 확인한다.

## 기존 개념 (겹치지 않게 할 범위)

이번 3개는 기존 페이지와 겹치는 부분이 많다. 아래 내용은 다시 설명하지 않고 링크하거나 "별도 개념"으로만 언급한다.

- `hoisting`(4·12장): `var`는 선언 처리 때 `undefined`로 초기화된다. 대입 전에 읽으면 `undefined`이고, 함수 선언은 미리 호출할 수 있다.
- `block-scope`(15장): 암묵적 전역, `let`·`const`의 중복 선언, `const` 재할당 TypeError, `const c;` SyntaxError.
- `tdz`(15장): `let`·`const`를 선언문보다 먼저 쓰면 ReferenceError.
- `typeof-operator`(6·7장): `typeof null`, `'function'`, 선언하지 않은 식별자에 `'undefined'`.
- `number-type`(6장): 부동소수점, `NaN`·`Infinity`, 안전한 정수.
- `string-utf16`(31장)·`symbol`(33장): 문자열 길이·코드 유닛, 심벌.
- `primitives-and-objects`(11장): 재할당과 변경, `const` 객체 변경.
- `increment-decrement`(7장): 대입 식도 값을 가진다, `x = x++`.
- `arrow-functions`(26장): `() => { value: 1 }`의 `{`는 본문이고 `value:`는 레이블이다.
- `iife-module-pattern`(12장 추가 게시글): `(`로 시작하는 줄에서 ASI가 세미콜론을 넣지 않는 함정.
- `spread-destructuring`: 명세의 `undefined`·`null` 용어 정의를 인용했다.

## 개념 목록

order는 기존 첫 개념 `primitives-and-objects`(10)보다 앞에 둔다. 책 장 순서대로 3·5·7로 두고 앞뒤에 끼울 자리를 남긴다. category는 셋 다 `fundamentals`.

| # | 개념 (가제) | 장 | order | 물을 거리 (후보, 각 계획에서 확정) | 시각화 (후보) | 계획 문서 | 상태 |
| - | - | - | - | - | - | - | - |
| 1 | 변수 선언과 할당: 선언만 한 변수는 왜 undefined일까 | 4 | 3 | 선언은 바인딩을 만들어 `undefined`로 초기화, 초기값 없는 `var x;` 줄의 실행은 아무것도 하지 않음, 한 문장 여러 선언, 할당과 재할당, 찾을 수 없는 이름의 ReferenceError, 식별자 규칙 (재선언은 15장 내용이라 block-scope 링크로만) | 표 + 퀴즈 | `variable-declaration.md` | 완료 |
| 2 | 표현식과 문: `{}`는 언제 블록이고 언제 객체인가 | 5 | 5 | 값으로 평가되는 것과 아닌 것. 문 맨 앞의 `{`는 블록이다. 문의 완료 값(`eval`의 반환값으로 실제 확인). `{ a: 1 }`이 레이블 + 식 문이 되는 경우 | 완료 값 표 + 퀴즈 | `expressions-statements.md` | 대기 |
| 3 | 데이터 타입: 변수에는 타입이 없고 값에 타입이 있다 | 6 | 7 | 동적 타이핑(같은 변수에 다른 타입 값 대입). 명세의 언어 타입 목록. `undefined`와 `null`의 명세 정의 차이. 따옴표 세 종류가 만드는 같은 문자열 값과 템플릿 리터럴 | 타입 표 + 퀴즈 | `data-types.md` | 대기 |

slug는 가제다. 각 계획에서 확정한다.

## 개념 간 메모 (각 계획에서 확인)

- 1번은 `hoisting`과 가장 많이 겹친다. 선언 처리 시점(실행 전)은 hoisting으로 넘기고, 1번은 "선언"과 "할당"이 서로 다른 동작이라는 데까지만 쓴다. `let`·`const`는 15장이므로 "별도 개념"으로 두고 `block-scope`·`tdz`로 링크한다. 암묵적 전역도 `block-scope`로 링크만 한다.
- 2번의 완료 값은 `runtime: 'ecmascript'`에서 `eval`의 반환값을 `JSON.stringify`로 출력해 검증할 수 있다. 직접 eval과 간접 eval의 차이는 다루지 않는다(단순화). 개발자 도구 콘솔이 보여 주는 값은 호스트 동작이므로 주장하지 않는다.
- 2번의 ASI는 `iife-module-pattern`이 일부 다뤘다. 5장 범위에서 따로 쓸지는 계획에서 정한다. `return` 다음 줄바꿈 같은 사례는 12장 함수를 전제로 하므로 범위를 확인한다.
- 3번의 타입 수: 현재 명세는 언어 타입 8개(BigInt 포함)다. 참고 도서의 판이 BigInt를 다루는지와 맞춰 `simplifications`나 본문에서 밝힌다. 판별 명세 문장은 원문 사본과 대조한다.
- 3번은 `typeof-operator`·`number-type`·`string-utf16`·`symbol`과 겹치지 않게 각 타입의 세부는 링크만 한다.
- 선행 개념 연결: 추가가 끝나면 이름만 있던 선행 개념을 slug로 바꾼다. 대상 페이지가 그 내용을 실제로 다룰 때만 바꾼다.
  - '데이터 타입': equality-operators, number-type, primitives-and-objects, short-circuit-evaluation, type-coercion, typeof-operator
  - '표현식과 문': increment-decrement, switch-break-continue
  - '변수와 선언': primitives-and-objects / 'var로 변수 선언하기': hoisting
  - 기존 파일 수정이므로 각 개념 계획의 범위에 넣을지 사용자에게 확인한다.

## 공통 영향 (개념마다 확인)

새 개념이 학습 순서 맨 앞에 오므로, 개념 수만 고정한 테스트보다 고칠 곳이 많다.

- `app/lib/concepts.test.ts`: 첫 개념(`primitives-and-objects`), 전체 개수(59), `hoisting`의 position(11)
- `app/components/concept/ConceptPager.test.tsx`: 첫 개념, '학습 순서 1 / 59'
- `tests/e2e/navigation.spec.ts`: 학습 순서 보기 첫 카드 '원시 값과 객체'
- `tests/e2e/responsive.spec.ts`: 홈 학습 순서 보기 카드 수(59)
- 마지막 개념(`es-modules`)은 그대로다.

## 진행 기록

- 2026-11-13: 로드맵 작성. 후보 3개 확정(사용자). 아직 진행하지 않은 `match-all.md` 계획과의 순서는 사용자에게 확인한다.
- 2026-11-13: 1번 계획 중 Consensus 검토에서 var 재선언이 15장(var의 문제점) 내용이고 block-scope가 이미 다룬다는 지적 → 사용자 결정으로 핵심 질문을 "선언만 한 변수는 왜 undefined"로 변경(장 구분은 기억 근거, 책 미확인). 1번 `variable-declaration` 구현, 사용자 콘텐츠 검토 2회 반영 후 승인(reviewedAt 2026-11-13), 커밋.
