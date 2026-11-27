# 추가 게시글 로드맵 5 (미뤄 둔 주제 5개)

- 상태: 승인
- 작성일: 2026-11-24
- 기준: `main` @ `99a2eca`

## 배경

- 추가 게시글 로드맵 4는 2026-11-24 완료했습니다. 완료한 개념은 세미콜론 자동 삽입 `abca924`, 잡히지 않은 예외 `2e2e9f7`, MutationObserver `838d206`, Math `99a2eca`이고, 2번은 제외했습니다.
- 사용자 요청으로 다음 후보를 추천했습니다(2026-11-24). 추천 방법은 다음과 같습니다.
  - 기존 79개 페이지의 `meta.simplifications`에서 "다루지 않는다"고 밝힌 문장 204개를 모아 주제별로 묶었습니다.
  - 『모던 자바스크립트 Deep Dive』의 장 중 아직 다루지 않은 범위와 대조했습니다.
  - 후보마다 `app/concepts` 전체를 grep했고, 걸린 페이지의 해당 절과 예제 파일을 직접 읽어 남은 범위를 판정했습니다(후보 겹침 확인 교훈).
  - 핵심 동작은 Node로 실행해 확인했습니다.
- 사용자가 추천 5개로 초안을 요청했습니다.
- 진행 방식은 이전 로드맵과 같습니다. 개념 하나씩 `계획 → 구현 → 리뷰 → 커밋`으로 진행하고, 개념마다 계획 문서를 씁니다. 다음에 쓸 개념은 매번 사용자에게 확인합니다.

| # | 후보 | 이미 있는 서술 | 남은 범위 |
| - | - | - | - |
| 1 | 관계 비교 | `type-coercion` 예제 5가 `'10' > 9`(숫자로 바꿔 비교)와 `'10' > '9'`(문자열끼리 코드 유닛 비교)만 다룬다. `type-coercion` simplifications는 "NaN이면 >, <는 모두 false인 경우는 다루지 않음"과 "<=, >= 등 다른 연산자는 다루지 않음", `equality-operators` simplifications는 "<=, >= 같은 비교 연산자는 ==와 다른 규칙을 쓰며 다루지 않음"이라 밝혔다. `bigint`는 BigInt와 Number의 IsLessThan만 다룬다 | `null`·`undefined`·`NaN`의 관계 비교, `a >= b`가 IsLessThan(a, b)의 결과가 `false`일 때만 `true`가 되는 정의(결과가 `undefined`이면 `false`), `==`는 `null`을 숫자로 바꾸지 않는다는 대비 |
| 2 | switch와 let | `switch-break-continue` simplifications가 "switch 문이 만드는 블록 환경과 case마다 선언한 let·const가 하나의 블록을 공유하는 문제는 다루지 않음"이라 밝혔다. `block-scope`·`tdz`에는 switch가 없다(grep 0건) | case 전체가 블록 하나라 case마다 같은 이름을 let으로 선언하면 SyntaxError, 앞 case에서 선언한 let을 그 case를 건너뛰고 뒤 case에서 쓰면 TDZ의 ReferenceError, case마다 중괄호로 블록을 나누는 방법 |
| 3 | 내장 생성자 상속과 Symbol.species | grep 0건. `class-inheritance`("Array·Error 같은 내장 객체 상속, Symbol.species는 다루지 않음"), `array-higher-order-functions`("Symbol.species와 ArraySpeciesCreate가 하위 클래스에서 하는 일은 다루지 않음"), `set-map`, `promise`, `match-all`이 모두 미뤘다 | Array를 상속한 클래스에서 map·filter·slice·concat이 하위 클래스 인스턴스를 돌려주는 것(ArraySpeciesCreate), `static get [Symbol.species]`로 바꾸기, 하위 클래스 인스턴스도 `Array.isArray`가 true인 것, `new MyArr(3)`과 `MyArr.of(3)`의 차이 |
| 4 | 에러 객체와 사용자 정의 에러 | `error-handling` 예제 7이 던질 수 있는 값과 내장 에러의 instanceof만 다룬다. simplifications가 "Error의 cause, AggregateError, stack, 사용자 정의 에러 클래스는 다루지 않음"이라 밝혔다. AggregateError는 `promise-static-methods`가 다룬다. `structured-clone`도 "에러 클래스 작성법과 Error 생성자·cause·stack 자체는 다루지 않음"이라 밝혔다 | name이 인스턴스가 아니라 `Error.prototype`에서 오므로 `class ValidationError extends Error`의 name이 `'Error'`인 것, toString의 `name: message` 규칙, 열거되지 않는 자기 프로퍼티 message 때문에 `JSON.stringify(err)`가 `{}`인 것, cause 옵션(주지 않으면 프로퍼티 자체가 없음), 하위 클래스의 instanceof |
| 5 | Proxy와 Reflect | `symbol` 예제가 `Reflect.ownKeys`를 한 번 쓴다. `property-order`·`class-inheritance` 등이 Reflect를 "다루지 않음"이라 밝혔다. 로드맵 4가 "다음 로드맵 후보"로 남긴 주제다. 책에 장이 없다 | 트랩이 객체의 내부 메서드([[Get]]·[[Set]] 등)를 가로채는 범위, 내부 슬롯이 필요한 메서드가 프록시에서 TypeError가 되는 이유, Reflect가 receiver를 넘겨 getter의 this가 달라지는 것, 취소 가능한 프록시 |

"다루지 않는다"고 밝힌 페이지(연결 대상 후보):

- 1번: `type-coercion`(simplifications 두 문장), `equality-operators`(simplifications)
- 2번: `switch-break-continue`(simplifications)
- 3번: `class-inheritance`, `array-higher-order-functions`, `set-map`, `promise`, `match-all`(각 simplifications. 대상 페이지가 그 하위 주제를 실제로 다룰 때만 연결)
- 4번: `error-handling`(simplifications와 본문 85줄), `structured-clone`(simplifications)
- 5번: `property-order`·`class-inheritance` 등 Reflect를 언급한 simplifications(계획 때 grep으로 확정)

## 개념 목록 (안)

| # | 개념 (가제) | 책 범위 | 핵심 오해 포인트 (실행으로 확인한 결과) | 런타임 | order (안) | 시각화 (안) | 상태 |
| - | - | - | - | - | - | - | - |
| 1 | 관계 비교: null >= 0은 true인데 null == 0은 왜 false일까 | 7·9장 | `null >= 0` true, `null > 0` false, `null == 0` false, `undefined >= 0` false, `undefined == 0` false, `NaN <= NaN` false, `null <= undefined` false (Node) | ecmascript | 45 (`equality-operators` 40과 `number-type` 50 사이) | 표 + 퀴즈 | 완료 |
| 2 | switch와 let: case마다 let x를 쓰면 왜 SyntaxError일까 | 8·15장 | 두 case에서 `let x`를 선언하면 SyntaxError. `case 0: let y = 1; break; case 1: y = 2;`로 1번 case에 들어가면 ReferenceError (Node) | ecmascript | 145 (`tdz` 140과 `property-attributes` 150 사이) | 표 + 퀴즈 | 완료 |
| 3 | 내장 생성자 상속: Array를 상속한 클래스의 map은 왜 하위 클래스를 돌려줄까 | 25장 (map·filter는 27장) | `class MyArr extends Array {}`의 `MyArr.from([1,2,3]).map(x => x) instanceof MyArr` true, filter 결과의 `constructor.name` `MyArr`, slice·concat도 MyArr, `Array.isArray(m)` true. `static get [Symbol.species]() { return Array; }`를 두면 map 결과는 MyArr가 아님. `new MyArr(3).length` 3, `MyArr.of(3).length` 1 (Node) | ecmascript | 273 (`array-higher-order-functions` 272와 `number-pitfalls` 275 사이) | 표 + 퀴즈 | 완료 |
| 4 | 에러 객체: class ValidationError extends Error의 인스턴스는 name이 왜 Error일까 | 47장 | `new ValidationError('bad').name` `'Error'`, `String(v)` `'Error: bad'`, `v instanceof Error` true, `JSON.stringify(v)` `'{}'`, name을 생성자에서 대입하면 `'Named: x'`, `new Error('m', { cause: 1 }).cause` 1, `'cause' in new Error('m')` false, `cause: undefined`를 주면 자기 프로퍼티 cause가 생김 (Node) | ecmascript | 471 (`error-handling` 470과 `uncaught-exceptions` 472 사이) | 표 + 퀴즈 | 완료 |
| 5 | Proxy와 Reflect: Proxy로 감싼 Date의 getTime은 왜 TypeError일까 | 책에 장 없음 | `new Proxy(new Date(0), {}).getTime()` TypeError, get 트랩에서 함수를 대상에 bind하면 0, getter가 있는 객체를 프록시로 감싸 상속할 때 `Reflect.get(t, k, r)`이면 하위 객체의 값 2, `t[k]`이면 대상의 값 1, 취소한 프록시 접근 TypeError (Node) | ecmascript | 307 (`to-primitive` 305와 `iterable-for-of` 310 사이) | 표 + 퀴즈 (단계 시뮬레이터는 계획 때 결정) | 완료 |

## 계획 때 확인할 것

- 1번
  - 명세의 IsLessThan과 관계 연산자 평가(`<`·`>`·`<=`·`>=`가 피연산자 순서와 LeftFirst를 바꿔 IsLessThan을 부르고, `<=`·`>=`는 결과가 `true`이거나 `undefined`이면 `false`)로 설명한다.
  - `type-coercion` 예제 5의 문자열 비교는 다시 쓰지 않고 링크한다.
  - 객체 피연산자(`[2] > 1`)는 ToPrimitive가 필요하고 `to-primitive`(order 305)가 뒤라서, 다룰지 별도 개념으로만 언급할지 정한다.
  - "`>=`는 `>` 또는 `==`"라는 틀린 모델을 예제로 배제한다(`null >= 0` true인데 `null > 0`도 `null == 0`도 false).
- 2번
  - 명세의 CaseBlock이 블록 하나를 이루고 BlockDeclarationInstantiation이 모든 case의 선언을 한 번에 만든다는 것으로 설명한다.
  - SyntaxError는 스크립트 전체의 파싱 단계에서 나므로 독자용 예제에 eval을 쓰지 않는다. 다른 페이지가 문법 오류를 보인 방식(`new Function` 또는 concept.test만의 파싱 검사)을 계획 때 확인한다.
  - TDZ는 `tdz`, 블록 스코프는 `block-scope`를 전제로 링크한다.
  - `const`와 함수 선언, 클래스 선언도 같은 블록을 공유하는지 실행으로 확인하고 범위를 정한다.
- 3번
  - 명세의 ArraySpeciesCreate(constructor 프로퍼티와 `Symbol.species`를 읽음)와 `Array.prototype.map` 등에서 그것을 부르는 단계로 설명한다.
  - map·filter가 27장이라 order를 `array-higher-order-functions`(272) 뒤 273으로 둔다. 책은 25장에서 다루지만 사이트 규칙상 선수 개념의 order가 더 작아야 한다.
  - `Array.from`·`Array.of`가 this를 생성자로 쓰는 것과 species는 다른 경로라는 점을 구분한다.
  - Promise·Map·RegExp의 species는 다루지 않고, 그 페이지들의 simplifications 연결 여부를 정한다.
- 4번
  - 명세의 Error 생성자(message는 주어질 때만 자기 프로퍼티, InstallErrorCause), `Error.prototype.name`·`Error.prototype.toString`으로 설명한다.
  - `stack`은 ECMAScript 표준이 아니므로 출력하지 않는다.
  - 열거되지 않는 프로퍼티는 `property-attributes`, JSON.stringify의 규칙은 `json`을 전제로 링크한다.
  - `Error.captureStackTrace`, `Error.isError`(ES2026)처럼 구현 전용이거나 판이 새로운 기능은 범위에서 뺄지 정한다.
- 5번
  - 명세의 Proxy exotic object 내부 메서드(트랩이 없으면 대상의 내부 메서드로 넘김), 내부 슬롯 검사(thisTimeValue 등), Reflect 함수들과 receiver로 설명한다.
  - 내부 슬롯 예는 Map 대신 Date로 쓴다. Map은 `set-map`(order 330)이 뒤에 있어서다.
  - 불변 조건(invariant) 위반 TypeError, `has`·`deleteProperty`·`ownKeys` 트랩, Proxy를 쓴 반응형 패턴 중 무엇을 다룰지 정한다.
  - 책에 장이 없으므로 order 위치(심벌·객체를 원시 값으로 다음)를 사용자에게 다시 확인한다.

## 결정 (2026-11-24, 사용자 확정)

- 목록 5개와 순서를 초안대로 확정했다: 1 관계 비교 → 2 switch와 let → 3 내장 생성자 상속과 Symbol.species → 4 에러 객체 → 5 Proxy와 Reflect.
- order는 초안대로다(45, 145, 273, 471, 307). 3번은 map·filter가 27장 페이지(272) 뒤라 273, 5번의 내부 슬롯 예는 Date로 쓴다.
- 각 개념의 범위·시각화·slug는 개념별 계획에서 다시 정한다.

## 보류·제외

- 정규식 플래그 i·m·s·u(`.`은 왜 줄바꿈과 매치되지 않을까): `regexp-lastindex`가 g·y만 다뤄 남은 범위가 있다. 실행 확인: `/a.b/.test('a\nb')` false, `/a.b/s` true, `/^b/.test('a\nb')` false, `/^b/m` true, `/^.$/.test('😀')` false, `/^.$/u` true. 정규식 패턴 문법을 여러 페이지가 미뤄 두어 범위 잡기가 까다롭다. 예비 후보.
- 숫자 문자열 문법(`1_000`은 되는데 `Number('1_000')`은 왜 NaN일까): 빈 문자열·공백·`'12px'`은 `type-coercion`(본문 59줄, 예제 2)이 이미 다뤄 남은 범위가 `0x`·`0b`·`Infinity`·`1e3`·`'-0x10'`·`'1_000'`으로 좁다. 실행 확인: `Number('0x10')` 16, `Number('-0x10')` NaN, `Number('1_000')` NaN, `Number('Infinity')` Infinity. 예비 후보.
- 리스너 옵션과 중복 등록: `prevent-default-stop-propagation`이 once·passive·같은 함수의 중복 등록·capture 일치 제거를 이미 다룬다. 제외.
- 블록 안 함수 선언(부록 B): `iife-module-pattern` 예제 10·11이 sloppy·strict 차이를 다룬다. 제외.
- WeakRef·FinalizationRegistry와 가비지 컬렉션: 명세가 정리 시점을 정하지 않아 실행으로 검증할 수 없다. 제외.
- 이터레이터 헬퍼, Promise.withResolvers·Promise.try, Set 메서드: 책 범위 밖의 새 판 기능이다. 제외.
- 논리 대입(`||=`·`&&=`·`??=`): `function-name`이 이름 전달만 언급하고, 책 범위 밖(ES2021)이며 남는 범위가 단축 평가 한 가지다. 제외.

## 진행 기록

- 2026-11-24: 로드맵 4 완료 뒤 사용자 요청으로 후보를 추천했다. simplifications의 "다루지 않음" 204문장을 주제별로 묶고 겹침을 절 단위로 확인했으며, 핵심 동작은 Node로 실행해 확인했다. 사용자가 추천 5개로 초안을 요청했다.
- 2026-11-24: 사용자가 초안을 그대로 확정했다. 다음은 1번 관계 비교(사용자 확인 후 계획).
- 2026-11-26: 1번 `relational-comparison` 완료(order 45·8번째/80, category fundamentals, ecmascript 예제 5개·퀴즈 5개·값 쌍 표 8행(데이터 파일 pairs.ts), 시뮬레이터 없음, type-coercion·equality-operators·bigint·to-primitive simplifications 연결, reviewedAt 2026-11-26). 객체 피연산자는 원시 값으로 바꾼 뒤 둘 다 문자열이면 문자열 비교라는 점과, 자리 바꿈은 실행 결과로 구별되지 않는다는 점을 밝혔다. 다음은 2번 switch와 let(사용자 확인 후 계획).
- 2026-11-26: 2번 `switch-let` 완료(order 145·21번째/81, category execution, ecmascript 예제 7개·퀴즈 7개·결과 표·선언 종류 표, 시뮬레이터 없음, switch-break-continue·iife-module-pattern simplifications 연결, reviewedAt 2026-11-26). SyntaxError는 Function 생성자로 컴파일만 해 보였고, 함수 선언의 중복 허용과 바깥 바인딩은 웹 호환 규칙(호스트 의존)으로 한정했다. using·await using은 case 절에 바로 쓰는 것 자체가 SyntaxError라는 점도 밝혔다. 다음은 3번 내장 생성자 상속(사용자 확인 후 계획).
- 2026-11-26: 3번 `array-subclass` 완료(order 273·44번째/82, category objects, ecmascript 예제 6개·퀴즈 6개·결과 표·생성 경로 표 11행, 시뮬레이터 없음, class-inheritance·array-higher-order-functions·array-method-pitfalls·symbol simplifications를 Array로 한정해 연결, reviewedAt 2026-11-26). 스프레드는 35장이라 예제·표에 쓰지 않고 링크로만 가리켰고, `new MyArr(3)`·`MyArr.of(3)` 비교는 array-index-length 링크로 대신했다. species 재정의는 배열 메서드에만 통하고 of·from은 그대로라는 한계와 MDN의 의존 자제 경고를 밝혔다. 다음은 4번 에러 객체(사용자 확인 후 계획).
- 2026-11-27: 4번 `error-objects` 완료(order 471·80번째/83, category objects, ecmascript 예제 8개·퀴즈 8개·결과 표·name 지정 방법 표 3행·toString 규칙 표 7행·흔한 오해 3개, 시뮬레이터 없음, error-handling·structured-clone·class-inheritance·array-subclass simplifications 연결, reviewedAt 2026-11-27). 제목은 사용자 전달 검토에 따라 "…의 인스턴스는 name이 왜 Error일까"로 바꿨다(클래스 자신의 name과 구분). JSON.stringify 결과 `{}`는 Node 결과로 한정했고(Conformance 절), prototype에 둔 name이 JSON에 안 나오는 원인은 열거 불가가 아니라 자기 프로퍼티가 아니라서임을 밝혔다. 생성자를 생략한 클래스를 new 없이 부를 때의 TypeError는 기본 생성자의 NewTarget 검사로 설명했다(class-basics는 같은 경우를 [[IsClassConstructor]]로 설명해 별도 수정 후보). 다음은 5번 Proxy와 Reflect(사용자 확인 후 계획).
- 2026-11-27: 5번 `proxy-reflect` 완료(order 307·55번째/84, category objects, ecmascript 예제 9개·퀴즈 9개·결과 표·연산·트랩 대응 표 5행·실패 알림 비교 표 5행·흔한 오해 4개, 시뮬레이터 없음, prototype-chain simplifications 연결, reviewedAt null). 내부 슬롯 예는 Date로 쓰고, getTime의 TypeError 원인을 receiver가 아니라 호출의 this(점 앞의 프록시)로 설명했다. 사용자 전달 검토 2회로 bind 해법의 한계(private·내부 슬롯 getter, 동결 대상의 자기 메서드), set 트랩의 불리언 변환 판정, Array.isArray 예외, SameValue 기준을 더했고, Map·Set·Promise는 뒤 개념이라 이름을 들지 않았다. 로드맵 5 완료.
