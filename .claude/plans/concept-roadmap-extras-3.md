# 추가 게시글 로드맵 3 (기초 보강과 미뤄 둔 주제 5개)

- 상태: 승인
- 작성일: 2026-11-19
- 기준: `main` @ `bf9c568`

## 배경

- 추가 게시글 로드맵 2(DOM 조작 `61a70d0`, 클래스 접근자 `bcc337e`, structuredClone `d42d769`, requestAnimationFrame `fe037b1`, BigInt `bf9c568`)는 2026-11-19 완료했다.
- 사용자가 기초 주제(예: 함수 선언)도 좋다고 해서, 기존 70개 페이지의 `meta.simplifications`가 미뤄 둔 주제와 『모던 자바스크립트 Deep Dive』 장 범위를 대조해 후보 9개를 추천했고, 사용자가 추천 5개로 초안을 요청했다(2026-11-19).
- 진행 방식은 이전 로드맵과 같다. 개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`으로 진행하고, 개념마다 계획 문서를 쓴다. 다음에 쓸 개념은 매번 사용자에게 확인한다.

## 조사 결과: 기존 페이지와 겹치는 범위

| # | 후보 | 이미 있는 서술 | 남은 범위 |
| - | - | - | - |
| 1 | 함수를 정의하는 방법 | `hoisting`이 함수 선언문의 호이스팅과 var에 담은 함수 표현식을, `typeof-operator`가 함수 선언·표현식을 예로 다룬다. 기명 함수 표현식을 다룬 페이지는 없다 | 함수 선언문과 함수 표현식의 구분(같은 `function` 코드가 위치에 따라 달라짐), 기명 함수 표현식의 이름 바인딩, Function 생성자의 스코프, 함수 리터럴 |
| 2 | 함수 객체의 name과 length | `default-parameters`에 '함수의 length' 절과 예제 6(ExpectedArgumentCount)이 있다 | `name`의 추론 규칙(변수 대입·프로퍼티 대입·메서드·getter·심벌 키·bind), 만든 뒤 바뀌지 않음, `bind`의 `length`. `length`의 기본 규칙은 `default-parameters`를 가리킨다 |
| 3 | 객체를 원시 값으로 바꾸기 | `type-coercion`이 "객체는 먼저 원시 값으로 바뀐다"를 결과만 보이고(ToPrimitive는 프로토타입 개념이 필요해 다루지 않음), `equality-operators`·`bigint`도 결과만 보인다. `date`·`symbol`이 Symbol.toPrimitive를 언급한다 | ToPrimitive와 hint(number·string·default), OrdinaryToPrimitive의 valueOf·toString 순서, Symbol.toPrimitive, Date의 기본 hint |
| 4 | 배열 고차 함수와 순회 중 변경 | `array-method-pitfalls`가 구멍을 만난 `forEach`·`map`과 초기값 없는 `reduce`만 다룬다(`filter`·`some`·`every`·`find`·`flat`·`flatMap`은 다루지 않음) | 콜백 메서드가 시작할 때 `length`를 한 번 읽고 요소는 매번 읽는 것(순회 중 `push`·`pop`·대입), `find`와 `filter`의 차이, `some`·`every`의 조기 종료, `flat`·`flatMap` |
| 5 | 템플릿 리터럴과 태그드 템플릿 | `type-coercion`이 `${}`의 ToString을, `data-types`가 문자열 리터럴을 다루고 태그드 템플릿·`String.raw`는 다루지 않는다고 밝힌다. `expressions-statements`는 템플릿 리터럴을 리터럴에서 뺐다 | 템플릿 리터럴의 평가(ToString), 태그 함수가 받는 인수(strings와 raw), 같은 위치의 템플릿 객체 재사용과 동결, `String.raw` |

"다루지 않는다"고 밝힌 페이지(연결 대상 후보):

- 1번: `hoisting`(블록 안 함수 선언은 부록 B라 제외 — 새 페이지도 제외), `typeof-operator`, `function-calls`
- 2번: `default-parameters`(length 절은 그대로 두고 링크만), `arguments-object`
- 3번: `type-coercion`, `equality-operators`, `bigint`(객체 피연산자의 ToPrimitive)
- 4번: `array-method-pitfalls`
- 5번: `data-types`(태그드 템플릿과 String.raw), `expressions-statements`(템플릿 리터럴)

## 개념 목록 (안)

| # | 개념 (가제) | 책 범위 | 핵심 오해 포인트 (실행으로 확인한 결과) | 런타임 | order (안) | 시각화 (안) | 상태 |
| - | - | - | - | - | - | - | - |
| 1 | 함수를 정의하는 방법: 같은 function인데 왜 어떤 이름은 밖에서 보이지 않을까 (`function-definitions`) | 12장 | `const f = function g() { return typeof g; }`에서 `f()`는 `'function'`, 밖의 `typeof g`는 `'undefined'`. 함수 안의 `g = 1`은 sloppy에서 무시, strict에서 TypeError. `(function foo() {})` 뒤의 `typeof foo`는 `'undefined'`(괄호 안은 표현식). Function 생성자로 만든 함수는 둘러싼 함수의 변수가 아니라 전역을 본다(`local` 1 대 2) | ecmascript | 95 (`property-keys` 90과 `function-calls` 100 사이, 계획 때 105에서 변경) | 표 + 퀴즈 | 완료 |
| 2 | 함수의 name: o.p = () => {}의 name은 왜 빈 문자열일까 (`function-name`) | 18장 + 26장 | `let x; x = () => {}`는 `'x'`인데 `o.p = () => {}`는 `''`. 메서드 `'m'`, getter `'get x'`, 심벌 키 `'[k]'`, `bind`는 `'bound h'`이고 `length`가 인수만큼 줄어 2. `const g = f`로 옮겨도 `g.name`은 `'f'`, `f.name = 'z'`는 무시(쓰기 불가) | ecmascript | 257 (`default-parameters` 255 뒤, `array-index-length` 260 앞) | 표 + 퀴즈 | 완료 |
| 3 | 객체를 원시 값으로: [] + {}는 왜 '[object Object]'일까 (`to-primitive`) | 9장 보충 (프로토타입·Symbol·Date 뒤) | `[] + {}`는 `'[object Object]'`, `[] + []`는 `''`, `{ valueOf() { return 1; } } + 1`은 `2`, `new Date(0) + 1`은 문자열, `[1] == 1`은 `true` | ecmascript | 305 (`symbol` 300 뒤, `iterable-for-of` 310 앞) | 단계 시뮬레이터 또는 표 (계획 때 결정) | 완료 |
| 4 | 배열 고차 함수: forEach 안에서 push한 요소는 왜 방문하지 않을까 | 27장 | `[1, 2]`를 `forEach`로 돌며 `push`해도 방문은 `1, 2`. 순회 중 `pop`하면 마지막 요소를 방문하지 않음(`[1, 2]`). `map` 콜백이 뒤 요소에 대입하면 그 값을 읽음(`[1, 0, 0]`) | ecmascript | 272 (`array-method-pitfalls` 270과 `number-pitfalls` 275 사이) | 표 + 퀴즈 (시뮬레이터는 계획 때 결정) | 대기 |
| 5 | 태그드 템플릿: 같은 템플릿을 두 번 평가하면 왜 같은 배열을 받을까 | 32장 근처 | 반복문에서 같은 위치의 `` t`x` ``는 매번 같은 strings 배열(`true`)이고 동결되어 있으며(`true`), 다른 위치의 `` t`x` ``와는 다른 배열(`false`) | ecmascript | 292 (`string-utf16` 290과 `string-replace-split` 295 사이) | 표 + 퀴즈 | 대기 |

- 순서는 기초부터 놓았다. 1번은 사용자가 예로 든 "함수 선언"이고, 2번은 같은 함수 객체 주제다. 3번은 기존 페이지가 가장 많이 미룬 주제다.
- order는 모두 중간 삽입이다. 삽입할 때마다 순서 테스트(총수, `navigation.spec.ts`의 순위·이웃 pager·"객체" 검색 순위 배열)를 고친다. 1번(105)은 학습 순서 14번째라 뒤 순위가 많이 밀린다.
- 시각화는 각 계획에서 사용자와 다시 정한다.

## 계획 때 확인할 것

- 1번: Function 생성자의 스코프는 13장(스코프) 개념을 전제하므로, 105 위치에서는 "별도 개념"으로만 쓰거나 예제를 `scope-chain` 뒤로 미룰지 정한다. 블록 안 함수 선언(부록 B)은 `hoisting`처럼 제외한다. 함수 선언문과 표현식의 호이스팅 차이는 `hoisting`이 이미 다루므로 링크만 한다. 화살표 함수·메서드·클래스는 뒷장이라 언급만 한다.
- 2번: `default-parameters`의 length 절과 겹치지 않게 `name`이 중심이다. name 추론은 명세의 NamedEvaluation(대입 대상이 식별자일 때만)과 SetFunctionName으로 설명하고, `o.p = …`가 빈 문자열인 이유를 그 조건으로 보인다. 클래스의 `name`(static name 메서드와의 충돌)은 후보로만 둔다.
- 3번: ToPrimitive는 프로토타입(170)과 Symbol(300), Date(277)를 전제하므로 305에 둔다. `type-coercion`이 "프로토타입 개념이 필요해 다루지 않는다"고 쓴 이유와 맞다. hint가 default인 연산(`+`, `==`)과 Date의 예외를 예제로 가른다. `[] == ![]` 같은 유명한 식은 `equality-operators`와 겹치는지 확인한다.
- 4번: 콜백 메서드의 순회 범위는 명세 알고리즘(시작 때 `LengthOfArrayLike`, 인덱스마다 `HasProperty`·`Get`)으로 설명한다. `array-method-pitfalls`의 구멍 절과 겹치지 않게 순회 중 변경을 중심으로 한다. `thisArg`와 `Array.prototype` 메서드의 범용성은 후보로만 둔다.
- 5번: 템플릿 객체 재사용은 명세의 GetTemplateObject(같은 Parse Node면 같은 객체, realm의 [[TemplateMap]])로 설명한다. 이스케이프 오류가 있는 태그드 템플릿의 cooked가 `undefined`인 것(ES2018)을 넣을지 정한다. `string-utf16`의 이스케이프 서술과 겹치는지 확인한다.

## 결정 (2026-11-19, 사용자가 초안 그대로 확정)

- 목록 5개와 순서(1 함수 정의 방법 → 2 함수의 name → 3 객체를 원시 값으로 → 4 배열 고차 함수 → 5 태그드 템플릿)를 확정했다.
- 각 개념의 범위·시각화·slug는 개념별 계획에서 다시 정한다.

## 보류·제외

- 옵셔널 체이닝과 `??`: `short-circuit-evaluation`과 겹치는 범위를 먼저 확인해야 한다. 다음 로드맵 후보.
- 이벤트 핸들러 등록 방식(어트리뷰트의 스코프·this·반환값): browser, 다음 로드맵 후보.
- Math(`Math.max()`가 `-Infinity`): 범위가 좁고, `bigint`(276)와 `date`(277) 사이에 정수 order가 없어 조정이 필요하다.
- MutationObserver: 로드맵 2에서 보류한 후보. 다음 로드맵 후보.
- 레이블(`switch-break-continue`에 있음), call·apply·bind(`this-binding`에 있음), WeakMap·WeakRef(제거 시점을 관찰할 수 없음): 제외.

## 진행 기록

- 2026-11-19: 로드맵 2 완료 뒤 사용자 요청으로 후보 9개 추천, 사용자가 추천 5개로 초안 요청. 기존 본문을 확인해 2번의 범위를 `name` 중심으로 좁혔다(`default-parameters`에 length 절이 있음).
- 2026-11-19: 사용자가 초안 그대로 확정. 1번 함수 정의 방법부터 계획.
- 2026-11-19: 1번 계획 조사에서 `iife-module-pattern`(215)이 문 맨 앞 `function`과 이름 있는 함수 식의 바인딩을 이미 다룬다는 것을 발견(추천 때 '기명 함수'로만 검색해 '이름 있는 함수 식'을 놓침). 사용자 결정: 기초 페이지로 좁혀 유지, order 95(책 순서·function-calls 선행 개념 연결), Function 생성자는 결과 + 스코프 체인 링크. 계획 `function-definitions.md` 승인 대기.
- 2026-11-19: 1번 `function-definitions` 완료(예제 6개·퀴즈 6개·비교표 4행, 기존 5개 페이지 문구, reviewedAt 2026-11-19). 범위는 iife와 겹치지 않는 기초 페이지로 좁혔고 iife 문단은 새 페이지를 가리키게 줄였다. 다음은 2번 함수의 name(사용자 확인 후 계획).
- 2026-11-20: 2번 `function-name` 완료(order 257, 예제 5개·퀴즈 5개·비교표 10행, function-definitions name 문장 2곳을 조건을 넣어 고침, reviewedAt 2026-11-20). bind는 this-binding과 겹치지 않는 "bind하는 순간의 name"만 다뤘다. 다음은 3번 객체를 원시 값으로(사용자 확인 후 계획).
- 2026-11-20: 3번 `to-primitive` 완료(order 305, 예제 6개·시뮬레이터 3시나리오·비교표 9행·퀴즈 6개, 기존 5개 페이지 10곳 연결, reviewedAt 2026-11-20). 다음은 4번 배열 고차 함수(사용자 확인 후 계획).
