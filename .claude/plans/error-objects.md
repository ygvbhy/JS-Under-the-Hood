# 에러 객체(error-objects) 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-26
- 기준: `main` @ `c22d9fb`

## 0. 요약
- 목적: "class ValidationError extends Error의 인스턴스는 name이 왜 Error일까"를 묻는 `error-objects` 페이지를 추가한다(order 471, 학습 순서 80번째/83, ecmascript, category objects). 명세의 Error 생성자(newTarget의 prototype으로 생성, message는 주어질 때만 열거되지 않는 자기 프로퍼티, InstallErrorCause의 HasProperty), `Error.prototype.name`·`message` 초기값, `Error.prototype.toString`, [[Set]]의 섀도잉으로 설명하고 Node 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 8개, 퀴즈 8개, 결과 표, name 지정 방법 표, toString 규칙 표, 흔한 오해 3개, 시뮬레이터 없음)와 error-handling·structured-clone·class-inheritance·array-subclass의 "다루지 않음" 문장 연결. 80번째 이후 순위 +1, 홈 '객체' 검색 개수 19→20, e2e·빌드·content-guide 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: "name은 클래스 이름에서 정해진다", "prototype에 둔 name은 열거되지 않아 JSON에 안 나온다"(실제로는 열거 가능하지만 상속한 것이라서), "JSON 결과 {}는 명세가 보장", "cause: undefined는 생략과 같다", "Error를 상속하면 name은 모두 Error" 같은 틀린 모델을 심을 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: HIGH 2·MEDIUM 3·LOW 7, Critic REVISE: HIGH 2·MEDIUM 3·LOW 다수. 메인이 실행으로 재확인해 모두 반영: 예제 1·2·5 보강, 모델·퀴즈·표 대조 고정, 홈 '객체' 검색 등록, 연결 문장 확정)
- 미확정: 없음 (category는 objects로 정함 — 승인 때 바꿀 수 있음)

## 1. 요구사항
- 로드맵(`.claude/plans/concept-roadmap-extras-5.md` 4번): 제목 "에러 객체: class ValidationError extends Error의 name은 왜 Error일까", 47장, order 471(`error-handling` 470과 `uncaught-exceptions` 472 사이), ecmascript, 표 + 퀴즈. 계획 때 할 것: Error 생성자·`Error.prototype.name`·`toString`으로 설명, `stack`은 출력하지 않음, 열거 불가는 `property-attributes`·JSON 규칙은 `json` 링크, `Error.captureStackTrace`·`Error.isError` 범위 결정.
- 사용자 선택(2026-11-26):
  - 핵심: 하위 클래스 name이 `Error.prototype`에서 와서 `'Error'`, toString의 `name: message` 규칙, 하위 클래스 instanceof, message가 열거되지 않아 `JSON.stringify`가 `'{}'`, cause 옵션.
  - 추가 4개 모두: name 지정 방법 비교(생성자 대입 vs prototype 프로퍼티), message 생략·변환 규칙, toString의 빈 값 규칙, new 없이 `Error()` 호출.
  - `Error.captureStackTrace`(V8 전용)·`Error.isError`: 다루지 않음(simplifications에만). `stack`은 출력하지 않음.
- 유지할 동작: 기존 82개 페이지 내용·순서(80번째 이후 +1 외), 공통 코드.
- 제외 범위: stack 내용, captureStackTrace, Error.isError, AggregateError 생성자 자체, SuppressedError(초안에만), DOMException(호스트), `Object.prototype.toString`의 `[object Error]`, 다른 realm의 instanceof, 클래스 필드로 name 정하기, 옛 방식 `Error.call(this, m)` 상속, Symbol message의 TypeError, toString의 비객체 this TypeError(명세 서술로만).

## 2. 사실과 추정
### 사실 (명세·실행·코드에서 확인)
- 명세(현재 초안 `tc39.es/ecma262`와 ES2026 = 17.0판, 2026-11-26 내려받아 대조):
  - Error ( message [ , options ] ): NewTarget이 undefined면 active function object를 newTarget으로 → `OrdinaryCreateFromConstructor(newTarget, "%Error.prototype%", « [[ErrorData]] »)` → message가 undefined가 아니면 `ToString(message)`를 `CreateNonEnumerableDataPropertyOrThrow`로 "message"에 → `InstallErrorCause` → 반환. NativeError 6개도 같은 단계. 변수 이름이 판마다 달라(초안 obj·messageString, ES2026 O·msg) 단계는 인용하지 않고 풀어 쓴다.
  - OrdinaryCreateFromConstructor → GetPrototypeFromConstructor: `newTarget.prototype`이 객체가 아니면 newTarget의 realm의 `%Error.prototype%`을 쓴다. 하위 클래스 인스턴스의 prototype은 newTarget(=하위 클래스)의 prototype이다. 이 경로는 class-inheritance "### 파생 생성자의 this"·"### super() 규칙과 기본 생성자"(`content.mdx:22,26`)가 설명하므로 링크하고 다시 풀어 쓰지 않는다.
  - InstallErrorCause: options가 객체이고 `HasProperty(options, "cause")`가 true면 Get 후 열거 불가 데이터 프로퍼티로 정의. 판마다 변수 이름(obj/O)과 절 번호(초안 20.5.9.1, ES2026 20.5.8.1)가 달라 앵커 `sec-installerrorcause`만 쓴다.
  - Error.prototype.toString: this가 객체가 아니면 TypeError → name을 Get해 undefined면 "Error" 아니면 ToString → message를 Get해 undefined면 "" 아니면 ToString → name이 ""면 message, message가 ""면 name, 아니면 `name + ": " + message`.
  - 두 판에 똑같은 문장(인용 가능, 이것만 인용):
    - "The initial value of Error.prototype.name is "Error"."
    - "The initial value of Error.prototype.message is the empty String."
    - "Thus the function call Error(…) is equivalent to the object creation expression new Error(…) with the same arguments."
    - "Subclass constructors that intend to inherit the specified Error behaviour must include a super call to the Error constructor to create and initialize subclass instances with an [[ErrorData]] internal slot."
    - "The initial value of the "name" property of the prototype for a given NativeError constructor is the String value consisting of the name of the constructor (the name used instead of NativeError)."
    - "Every other data property described in clauses 19 through 28 and in Annex B.2 has the attributes { [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: true } unless otherwise specified."
    - Conformance "A conforming implementation of ECMAScript may provide additional types, values, objects, properties, and functions beyond those described in this specification."
    - Error 인스턴스 절 둘째 문장은 초안에만 SuppressedError가 있어 인용하지 않는다.
  - [[ErrorData]]의 명세상 쓰임은 Object.prototype.toString과 Error.isError뿐이다. 이 페이지는 둘 다 다루지 않으므로 [[ErrorData]]는 관찰되지 않는다. instanceof가 true인 원인은 프로토타입 체인이다(`Object.create(Error.prototype) instanceof Error`도 true, Architect 실행).
- [[Set]] 섀도잉: `Error.prototype.name`은 쓰기 가능한 상속 데이터 프로퍼티라 인스턴스에 대입하면 인스턴스에 열거 가능한 자기 데이터 프로퍼티가 생긴다. `ProtoError.prototype.name = 'Proto'`는 `ProtoError.prototype`에 열거 가능한 자기 프로퍼티를 만든다(디스크립터 enumerable true, 실행 확인). 인스턴스 JSON에 안 나오는 원인은 열거 불가가 아니라 자기 프로퍼티가 아니어서다(json "### 자기 열거 가능한 문자열 키만", `content.mdx:33`). toJSON 단계는 json `content.mdx:29`가 다루고 명세의 Error.prototype에는 toJSON이 없다.
- `class X extends TypeError {}`의 name은 `'TypeError'`(TypeError.prototype의 자기 name, 실행 확인). 규칙은 "프로토타입 체인에서 처음 만나는 name"이다.
- Node v24.22.3 실행: 8절 예제 출력 전부 확인. 프로젝트 실행기와 같은 `vm.runInNewContext` + `util.format`에서 sloppy와 첫 줄 `'use strict';` 출력이 같다(메인·Architect·Critic 각각 확인).
- V8은 인스턴스에 비표준 자기 프로퍼티 `stack`을 더하며, Node 24에서 열거되지 않는 **접근자**(get/set)다(`getOwnPropertyNames` `['stack','message']`). 데이터 프로퍼티라고 쓰지 않는다.
- 틀린 모델 실행(코드 치환, scratchpad `models.js`):
  - A "name = 클래스 이름"(Error.prototype.name을 `this.constructor.name` getter로 치환): 예제 1의 3번 줄 `ValidationError ValidationError`.
  - B "toString은 constructor.name 사용": 예제 2의 12번 줄 `AssignedError: a ProtoError: p`.
  - C "열거 가능하면 상속한 것도 JSON에"(for...in으로 모은 객체를 직렬화): 예제 2의 15번 줄 `{"name":"Assigned"} {"name":"Proto"}`.
  - C' "대입한 name도 열거 불가": 15번 줄 `{} {}`.
  - D "message 열거 가능": 예제 3의 2번 줄 `bad {"message":"bad"}`.
  - E "JSON은 toString 결과를 쓴다": 2번 줄 `bad "Error: bad"`.
  - F "기본값 ''을 자기 프로퍼티로": 예제 4의 2·4번 줄 `true "" / true`. F' "''는 생략과 같다": `false "" / false`.
  - G "undefined name도 ToString": 예제 5의 3·4번 줄 `undefined: m / null: m`. H "falsy name은 빈 값과 같다": `m / m`.
  - I cause 2×2(예제 6의 6·8번 줄): 명세 `true undefined / 3 true`, 자기+값 `false undefined / undefined false`, 값만 `false undefined / 3 true`, 자기만 `true undefined / undefined false`.
  - J "cause 자동 전달": 예제 7의 10번 줄 `invalid age true`. J' "기본 생성자는 options를 넘기지 않는다": 2번 줄 `undefined`.
  - K "클래스도 Error처럼 new 없이 객체를 만든다": 예제 8에서 catch가 실행되지 않아 마지막 줄 `TypeError`가 없다.
- 기존 서술(연결 대상): `error-handling/meta.ts:138`, `error-handling/content.mdx:85`, `structured-clone/meta.ts:122`, `class-inheritance/meta.ts:108`, `array-subclass/meta.ts:101`(문구는 작업 5). promise-static-methods가 Promise.any의 AggregateError를 다룬다(`content.mdx:55,64`).
- 링크 대상 절: prototype-chain "### 대입은 자기 프로퍼티를 만든다: 섀도잉"(`content.mdx:43`), json(`content.mdx:29,33`), class-basics "### new 없이 부르면"(`content.mdx:19`), class-inheritance(`content.mdx:22,26`), this-binding call(`content.mdx:58`), property-attributes, to-primitive(String(obj)가 toString을 부르는 경로), function-name(constructor.name).
- order: 471 미만 79개 → 80번째/83. 이전 error-handling(79), 다음 uncaught-exceptions(80→81).
- 홈 검색: `filterConcepts`(`app/lib/concepts.ts:91-99`)가 title을 includes로 걸러 제목의 "에러 객체"가 '객체' 검색에 걸린다. `tests/e2e/navigation.spec.ts:34,49,110,149` `toHaveCount(19)`, `:117-137` 순위 배열(마지막 '77'). 선례 to-primitive `concept.test.ts:610`.
- 순위 테스트: `app/lib/concepts.test.ts:104,111-112`, `app/components/concept/ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts`(`toHaveCount(82)`·`82번째`(:103)·`/ 82`, error-handling 블록 :862-875, uncaught-exceptions 블록 :877-889), `tests/e2e/responsive.spec.ts:1901`. 등록: `tests/e2e/helpers.ts:75` 근처, `tests/e2e/a11y.spec.ts`(:63 import, :955 케이스), `tests/e2e/responsive.spec.ts`(:72 import, :1588 케이스), `tests/build/build-output.test.ts:1650~` 형식, `docs/content-guide.md:226` 경로 목록.
- category: structured-clone·array-subclass·json·class-inheritance가 objects이고 이 페이지의 축(프로퍼티 위치·어트리뷰트·상속)도 같아 objects로 정한다. 카테고리 개수를 고정한 테스트는 없다(grep).
### 추정
- 다른 엔진은 에러 인스턴스에 열거 가능한 자기 프로퍼티를 더해 `JSON.stringify` 결과가 `{}`가 아닐 수 있다(Conformance 문장이 허용, 검토자들이 JSC 사례를 기억하나 확인하지 않음). 페이지는 `{}`를 "Node에서 실행한 결과"로만 쓰고 다른 엔진 결과는 단정하지 않는다.

## 3. 구현 전략
- 직전 개념(array-subclass·switch-let)과 같은 구성: 동작 원리 h3 → 예제(파일 import + 퀴즈) → 결과와 이유(결과 표, 예제별 설명, name 지정 방법 표, toString 규칙 표, 흔한 오해). 시뮬레이터 없음(단계 상태 변화가 아니라 프로퍼티 위치·규칙 대조라 표가 직접적).
- 설명 축은 두 질문이다. (1) 그 프로퍼티는 어디에 있나 — 인스턴스의 자기 프로퍼티인가, 프로토타입 체인 어디에서 상속하나. (2) 자기 프로퍼티라면 열거되나. 생성자 단계가 만드는 자기 프로퍼티는 message·cause뿐이고 둘 다 열거 불가, name은 체인에서 처음 만나는 것을 읽는다. JSON은 자기 열거 가능 키만 쓴다.
- 예제는 틀린 모델(2절 A~K)을 배제하도록 짜고, 퀴즈 오답은 그 모델의 실행 출력으로 둔다.
- 버린 대안: 단계 시뮬레이터(상태 변화가 작음), stack 출력(비표준), toString을 인스턴스로만 보이기(빈 값 분기를 따로 보이려면 평범한 객체에 call해야 함), 옛 방식 `Error.call(this)` 예제(사용자 범위 밖, simplifications로만).

## 4. 변경 파일
- 추가: `app/concepts/error-objects/{meta.ts, content.mdx, route.tsx, concept.test.ts, examples/*.js 8개}`.
- 수정(연결): error-handling(`meta.ts` simplifications + related, `content.mdx:85`), structured-clone·class-inheritance·array-subclass(`meta.ts` simplifications + related). 네 페이지 reviewedAt은 그대로.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/{navigation,responsive,a11y}.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`.
- 계획·로드맵: 이 문서, finalize 때 로드맵 4번 행 상태와 진행 기록.
- 변경하지 않음: promise-static-methods, uncaught-exceptions(순위 테스트 외), 공통 코드.

## 5. 위험 요소
- prototype 방식 name이 JSON에 안 나오는 원인을 "열거 불가"로 씀 → 예제 2의 14번 줄(enumerable true)로 배제, 표 열은 "자기 프로퍼티인가", concept.test에 본문 문구 검사 (작업 2·3·4).
- "Error를 상속하면 name은 모두 Error" 일반화 → 예제 1의 9~10번 줄(`TypeError`), 본문은 "체인에서 처음 만나는 name"으로 (작업 1·2).
- "extends가 name을 하위 prototype에 복사" 모델 → 예제 1의 6번 줄 둘째 값 false.
- "JSON.stringify(err)는 항상 {}" 단정 → 예제 1·2·3·6의 `{}` 모두 Node 결과로 한정, Conformance 인용 (작업 2·simplifications).
- 하위 클래스 prototype 원인을 "super가 Error.prototype으로 만든다"로 씀 → newTarget의 prototype, `%Error.prototype%`은 `newTarget.prototype`이 객체가 아닐 때의 대체값 (작업 2).
- instanceof true를 [[ErrorData]] 때문이라고 씀 → 프로토타입 체인으로만 설명 (작업 2).
- `this.name = …`이 자기 프로퍼티를 만드는 원인을 "생성자 안이라서"로 씀 → [[Set]] 섀도잉, prototype-chain 링크.
- message "기본값 ''"을 인스턴스에 있다고 오해 → 예제 4.
- cause를 "값이 undefined가 아니면"·"자기 프로퍼티만"으로 씀 → 예제 6의 2×2.
- NativeError 일반화 → message·cause 단계는 명세 NativeError가 같은 단계라는 근거로만 쓰고, 실행으로 보인 NativeError는 RangeError의 new 없는 호출(예제 8)과 TypeError 상속 name(예제 1)뿐이라고 simplifications에 밝힌다.
- V8 stack을 데이터 프로퍼티로 씀 → "열거되지 않는 자기 접근자"로만, 값은 출력하지 않음.
- 명세 인용 판 차이 → 2절 목록만 인용, 절 번호 대신 앵커.
- 표 형식(result-tables), 표 칸 `<`, `[&_code]:whitespace-nowrap`, MDX `{`, 퀴즈 choices는 JSX 배열 문자열(예제 3·4 출력의 `"`), explanation 속성에 큰따옴표 금지 → 기존 페이지 형식, npm test.
- 순위·검색 테스트 누락 → 작업 4의 구체 패턴 grep.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`, e2e는 `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "error-objects|에러 객체|홈 학습 순서 보기"`.
- 브라우저(dev 서버 재시작 또는 다른 포트 임시 실행): `/concepts/error-objects`에서 학습 순서 80 / 83, 이전 error-handling·다음 uncaught-exceptions, 결과 표 8행·name 지정 방법 표 3행·toString 규칙 표 7행, 퀴즈 2개(예제 2·6) 정답 선택 피드백, 375px 가로 넘침 없음, 콘솔 오류 없음, 홈 '객체' 검색 20개, 연결한 네 페이지 새 문구 렌더.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 예제 8개와 meta
- 대상: `examples/*.js`, `meta.ts`, `route.tsx`(array-subclass와 같은 얇은 모듈)
- meta: slug `error-objects`, title "에러 객체: class ValidationError extends Error의 인스턴스는 name이 왜 Error일까", summary(160자 이하, 안) "Error를 상속한 클래스의 인스턴스가 읽는 name이 Error인 이유를 프로퍼티가 있는 곳으로 설명하고, toString·JSON.stringify 결과, message·cause가 생기는 조건, new 없이 부르는 경우를 실행으로 확인합니다.", category objects, order 471, reviewedAt null. prerequisites: prototype-chain, property-attributes, class-inheritance, json, error-handling. related: prototype-chain, property-attributes, class-basics, class-inheritance, this-binding, function-name, array-subclass, to-primitive, json, structured-clone, promise-static-methods, error-handling. goals 4~5개(백틱 금지). tags: Error, name, message, cause, toString, extends, 사용자 정의 에러, JSON.stringify, InstallErrorCause 등.
- 예제(코드·출력 고정):
  1. `subclass-name.js`
     ```js
     class ValidationError extends Error {}
     const v = new ValidationError('bad');
     console.log(v.name, v.constructor.name);
     console.log(String(v), JSON.stringify(v));
     console.log(v instanceof ValidationError, v instanceof Error);
     console.log(Object.hasOwn(v, 'name'), Object.hasOwn(ValidationError.prototype, 'name'));
     console.log(Object.hasOwn(Error.prototype, 'name'));

     class TypeCheckError extends TypeError {}
     console.log(new TypeCheckError('t').name);
     ```
     → `Error ValidationError`, `Error: bad {}`, `true true`, `false false`, `true`, `TypeError`
  2. `name-ways.js`
     ```js
     class AssignedError extends Error {
       constructor(message) {
         super(message);
         this.name = 'Assigned';
       }
     }
     class ProtoError extends Error {}
     ProtoError.prototype.name = 'Proto';

     const a = new AssignedError('a');
     const p = new ProtoError('p');
     console.log(String(a), String(p));
     console.log(Object.hasOwn(a, 'name'), Object.hasOwn(p, 'name'));
     console.log(Object.getOwnPropertyDescriptor(ProtoError.prototype, 'name').enumerable);
     console.log(JSON.stringify(a), JSON.stringify(p));
     ```
     → `Assigned: a Proto: p`, `true false`, `true`, `{"name":"Assigned"} {}` (name 값을 클래스 이름과 다르게 둔 이유: 모델 B 배제. 본문에서 실무는 보통 클래스 이름을 쓴다고 밝힘)
  3. `json-empty.js`
     ```js
     const e = new Error('bad');
     console.log(e.message, JSON.stringify(e));
     const d = Object.getOwnPropertyDescriptor(e, 'message');
     console.log(d.value, d.enumerable);
     console.log(Object.keys(e).length);
     console.log(JSON.stringify({ name: e.name, message: e.message }));
     ```
     → `bad {}`, `bad false`, `0`, `{"name":"Error","message":"bad"}`
  4. `message-rules.js`
     ```js
     const none = new Error();
     console.log(Object.hasOwn(none, 'message'), JSON.stringify(none.message));
     console.log(Object.hasOwn(new Error(undefined), 'message'));
     console.log(Object.hasOwn(new Error(''), 'message'));
     const num = new Error(42);
     console.log(typeof num.message, num.message);
     console.log(new Error(null).message);
     ```
     → `false ""`, `false`, `true`, `string 42`, `null`
  5. `to-string-rules.js`
     ```js
     const errorToString = Error.prototype.toString;
     console.log(errorToString.call({ name: 'Custom', message: 'm' }));
     console.log(errorToString.call({ message: 'm' }));
     console.log(errorToString.call({ name: null, message: 'm' }));
     console.log(errorToString.call({ name: '', message: 'm' }));
     console.log(errorToString.call({ name: 'N', message: '' }));
     console.log(errorToString.call({}));
     console.log(String(new Error()));
     ```
     → `Custom: m`, `Error: m`, `null: m`, `m`, `N`, `Error`, `Error`
  6. `cause.js`
     ```js
     const withCause = new Error('m', { cause: 1 });
     console.log(withCause.cause, JSON.stringify(withCause));
     console.log('cause' in new Error('m'));
     console.log(Object.hasOwn(new Error('m', {}), 'cause'));
     const undef = new Error('m', { cause: undefined });
     console.log(Object.hasOwn(undef, 'cause'), undef.cause);
     const inherited = new Error('m', Object.create({ cause: 3 }));
     console.log(inherited.cause, Object.hasOwn(inherited, 'cause'));
     ```
     → `1 {}`, `false`, `false`, `true undefined`, `3 true`
  7. `subclass-cause.js`
     ```js
     class ValidationError extends Error {}
     console.log(new ValidationError('m', { cause: 1 }).cause);

     class FieldError extends Error {
       constructor(field) {
         super('invalid ' + field);
       }
     }
     const f = new FieldError('age', { cause: 1 });
     console.log(f.message, 'cause' in f);

     class ForwardingError extends Error {
       constructor(field, options) {
         super('invalid ' + field, options);
       }
     }
     console.log(new ForwardingError('age', { cause: 1 }).cause);
     ```
     → `1`, `invalid age false`, `1`
  8. `call-without-new.js`
     ```js
     const e = Error('x');
     console.log(e instanceof Error, Object.getPrototypeOf(e) === Error.prototype, String(e));
     console.log(String(RangeError('r')));
     class ValidationError extends Error {}
     try {
       ValidationError('x');
     } catch (err) {
       console.log(err.name);
     }
     ```
     → `true true Error: x`, `RangeError: r`, `TypeError`
- 완료 조건: `npx vitest run tests/examples.test.ts -t error-objects`에서 예제 8개 통과(content.mdx가 생기기 전이므로 content-integrity는 작업 3에서 확인).

### 2. 본문 "## 동작 원리"
- 대상: `content.mdx`
- h3(안): "에러 객체는 어떻게 만들어지나"(newTarget의 prototype — class-inheritance 링크, [[ErrorData]]는 이 페이지에서 관찰되지 않음, 명세 단계가 만드는 자기 프로퍼티는 message·cause뿐이며 V8은 열거되지 않는 자기 접근자 stack을 더함) / "name과 message는 Error.prototype에 있다"(초기값 두 문장 인용, 체인에서 처음 만나는 name, NativeError prototype의 name 문장 인용) / "toString이 문자열을 만드는 규칙" / "name을 정하는 두 방법"(섀도잉 — prototype-chain 링크, 자기 프로퍼티인가로 JSON이 갈림) / "JSON.stringify가 {}인 이유"(toJSON 없음·자기 열거 가능 키만 — json 링크, Node 결과·Conformance 인용) / "message를 생략하거나 문자열이 아닌 값을 주면" / "cause는 HasProperty로 정해진다"(하위 클래스 생성자가 options를 super에 넘겨야 함, 기본 생성자는 인수를 그대로 넘김 — class-inheritance 링크, Subclass constructors 문장) / "new 없이 부르면"(Error(…) 동치 문장 인용, 클래스는 TypeError — class-basics 링크) / "이 페이지가 다루지 않는 것".
- 완료 조건: 인과 문장마다 2절 명세 단계와 대조, 영어 인용문이 2절 목록 안에만 있는지 grep(`^> `).

### 3. 예제·퀴즈·결과와 이유
- 대상: `content.mdx` "## 예제", "## 결과와 이유"
- 퀴즈(정답 위치 고정, 오답 출처는 2절 모델):
  1. 예제 1의 3번 줄: [`ValidationError ValidationError`(A), `Error ValidationError`, `undefined ValidationError`(인스턴스에 name이 생겨야 한다는 모델)] answer 1
  2. 예제 2의 15번 줄: [`{"name":"Assigned"} {}`, `{} {}`(C'), `{"name":"Assigned"} {"name":"Proto"}`(C)] answer 0
  3. 예제 3의 2번 줄: [`bad {"message":"bad"}`(D), `bad "Error: bad"`(E), `bad {}`] answer 2
  4. 예제 4의 2·4번 줄: [`true "" / true`(F), `false "" / false`(F'), `false "" / true`] answer 2
  5. 예제 5의 3·4번 줄: [`Error: m / null: m`, `undefined: m / null: m`(G), `m / m`(H)] answer 0
  6. 예제 6의 6·8번 줄: [`false undefined / undefined false`, `true undefined / 3 true`, `false undefined / 3 true`, `true undefined / undefined false`](I) answer 1
  7. 예제 7의 2·10·17번 줄: [`1 / invalid age true / 1`(J), `undefined / invalid age false / 1`(J'), `1 / invalid age false / 1`] answer 2
  8. 예제 8 전체: [`true true Error: x / RangeError: r`(K), `true true Error: x / RangeError: r / TypeError`] answer 1
- 결과 표 8행(result-tables 형식, array-subclass `content.mdx:145~` 따름), 예제별 설명 h3 8개.
- name 지정 방법 표(aria-label "name 지정 방법 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"): 열 = 방법 / name이 있는 곳 / 인스턴스의 자기 프로퍼티인가 / String 결과 / JSON 결과. 행 = 아무것도 안 함(예제 1: Error.prototype, 아니오, `Error: bad`, `{}`) / 생성자에서 대입(예제 2 a: 인스턴스, 예(열거 가능), `Assigned: a`, `{"name":"Assigned"}`) / prototype에 대입(예제 2 p: ProtoError.prototype(열거 가능), 아니오, `Proto: p`, `{}`).
- toString 규칙 표(aria-label "toString 규칙 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"): 예제 5의 7행 = name 값 / message 값 / 적용 규칙 / 결과.
- 흔한 오해 3개: "extends Error 하면 name이 클래스 이름이 된다"(예제 1), "JSON.stringify(err)로 에러 내용을 보낼 수 있다"(예제 3, Node 결과, 필요한 프로퍼티를 골라 객체로), "cause: undefined는 cause를 안 준 것과 같다"(예제 6).
- 완료 조건: `npx vitest run tests/result-tables.test.ts tests/content-integrity.test.ts` 통과.

### 4. concept.test·순서·등록
- `concept.test.ts`(array-subclass `concept.test.ts` 구성 따름):
  - 예제 8개 모두 첫 줄 `'use strict';` 접두 실행 출력이 expectedOutput과 같다.
  - 2절 모델 A~K를 코드 치환으로 실행해 각 출력이 정답과 다르고 퀴즈 오답 문자열과 같다.
  - 퀴즈 집합: mdx의 PredictQuiz 8개 choices·answer가 8절 목록과 같고, 정답이 해당 예제 줄의 expectedOutput을 ` / `로 이은 값과 같다.
  - name 지정 방법 표·toString 규칙 표: `tableBody`로 읽은 각 행을 실행해 결과 칸과 대조(content-guide `:149`).
  - 메타: `filterConcepts([concept], '객체')`가 `['error-objects']`(to-primitive `:610` 선례), order 471, summary 160자 이하.
  - 본문 한정 문구: JSON `{}` 근처의 Node 한정, "자기 프로퍼티가 아니어서", "처음 만나는 name", stack "접근자", 인용문이 2절 목록 안.
- 순위·검색: 82→83(`toBe(82)`, `toHaveCount(82)`, `82번째`, `/ 82`), 80번째 이후 +1, navigation의 error-handling 다음 href → `/concepts/error-objects`, uncaught-exceptions 81 / 83·이전 href → `/concepts/error-objects`, error-objects 블록(80 / 83, 이전 error-handling, 다음 uncaught-exceptions) 추가, '객체' 검색 `toHaveCount(19)` 4곳 → 20, 순위 배열 끝에 `'80'`.
- 등록: `helpers.ts`에 `ERROR_OBJECTS_PATH`, a11y 케이스 "개념 페이지: 에러 객체", responsive 가로 스크롤 케이스(두 표 region), build-output "프리렌더 (error-objects)" 블록(region 3개: 예제 결과 표·name 지정 방법 표·toString 규칙 표, `<details>` 8개 이상, 퀴즈 정답 8개 문자열), content-guide 경로 목록.
- 완료 조건: `grep -rnE "toBe\(82\)|toHaveCount\(82\)|82번째|/ 82|toHaveCount\(19\)" app tests` 결과 없음, `npm test`·`npm run test:build`·지정 e2e 통과.

### 5. 연결
- error-handling `meta.ts:138` → "Error의 cause와 사용자 정의 에러 클래스는 에러 객체 개념에서 다룹니다. AggregateError와 stack(ECMAScript 표준이 아닌 비표준 속성)은 다루지 않습니다."
- error-handling `content.mdx:85` 첫 문장 → "`Error`의 `cause`와 사용자 정의 에러 클래스는 [에러 객체](/concepts/error-objects)에서 다룹니다. `AggregateError`와 `stack`(ECMAScript 표준이 아님)은 다루지 않습니다."
- structured-clone `meta.ts:122` 마지막 문장 → "예제 6은 name을 바꾸려고 TypeError 서브클래스를 쓰지만, 에러 클래스 작성법과 Error 생성자·cause는 에러 객체 개념에서 다루고, stack 자체는 이 사이트에서 다루지 않습니다."
- class-inheritance `meta.ts:108` → "`Array` 상속과 배열 메서드가 쓰는 `Symbol.species`는 내장 생성자 상속 개념에서, `Error` 상속은 에러 객체 개념에서 다루고, 그 밖의 내장 객체 상속, `Map`·`Promise` 같은 다른 생성자의 species, mixin, `Reflect.construct`는 다루지 않습니다."
- array-subclass `meta.ts:101` → "Error 상속은 에러 객체 개념에서 다루고, Map·Set·Promise·RegExp 같은 다른 내장 생성자의 상속과 species, Reflect.construct는 다루지 않습니다."
- 네 페이지 related에 `error-objects`.
- 완료 조건: content-integrity 통과, 각 문장의 하위 주제(cause, 사용자 정의 에러 클래스, Error 생성자, Error 상속)를 새 페이지 h3가 실제로 다루는지 대조.

### 6. 전체 검증
- 6절 정적 검증과 브라우저 확인. 끝나면 critical-code-review.

## 9. 추가 개선 후보
- promise-static-methods의 AggregateError와 error-handling의 "AggregateError는 다루지 않음" 문장 연결 여부(이번 범위 밖).

## 구현 진행

- baseline (2026-11-26, `c22d9fb`): lint·format:check·typecheck 통과, npm test 196 파일 6638 테스트 통과. test:build·e2e는 마지막에 실행.
- [x] 1. 예제 8개와 meta — 예제 8개 계획 코드와 동일(diff), examples.test 통과
- [x] 2. 본문 동작 원리 — 인용문 6개 모두 2절 목록 안(concept.test 단언), 메인 검토로 3곳 수정(생성자 단계 한정·상속 cause 포함 명시, 예제 4 모델 배제 줄 귀속, 흔한 오해 2의 원인에 Node 한정), meta simplifications 1문장 수정(message·cause가 열거 가능하다고 읽히던 문장)
- [x] 3. 예제·퀴즈·결과와 이유 — result-tables·content-integrity 통과
- [x] 4. concept.test·순서·등록 — concept.test 70개(모델 A~K 실행 출력, 퀴즈 집합, 두 보조 표 행 실행 대조, strict 접두, '객체' 검색), 82·19 잔존 grep 0건
- [x] 5. 연결 — 네 페이지 문구가 계획 문안과 같음(diff), related 추가, reviewedAt 그대로
- [x] 6. 전체 검증 — lint·format:check·typecheck 통과, npm test 197 파일 6737 통과, test:build 656 통과, navigation e2e 16 통과, `-g "error-objects|에러 객체|홈 학습 순서 보기"` 8 통과. 브라우저(임시 포트 5180, launch.json 원복): 학습 순서 80 / 83·이전 error-handling·다음 uncaught-exceptions, 표 8·3·7행, 퀴즈 8개 중 예제 2·6 정답 피드백, 375px scrollWidth 375, 콘솔 오류 없음, 연결 네 페이지 새 문구 렌더
- 리뷰 1차(메인 + Opus 본문 정확성 교차 검토): High 1(수정) · Medium 6(5 수정, 1 보고) · Low 9(7 수정, 2 보고) → 수정 후 error-objects concept.test·examples·result-tables·content-integrity 1985 통과, lint·format·tsc 통과, test:build 656 통과, navigation e2e 16·지정 e2e 8 통과
  - High(수정): 예제 8의 TypeError를 class-basics 링크로 설명해, 생성자를 생략한 클래스의 원인(기본 생성자의 NewTarget 검사)을 [[IsClassConstructor]] 원인으로 보증함 → 본문을 기본 생성자 경로로 고치고 링크 제거, 생성자를 직접 쓴 경우는 simplifications로(두 판 ClassDefinitionEvaluation 대조)
  - 수정한 Medium/Low: 흔한 오해 2의 과잉 일반화(new Error('bad')로 한정), goals 2·5 한정, Subclass constructors 인용 제거(options 전달 근거가 아님, 인용 5개), stack 형태(접근자/데이터)는 Node 버전마다 달라 "자기 프로퍼티"로만, 퀴즈 1 해설 오기, NewTarget 다단 상속 표현·realm, "NewTarget이 undefined" 표현, 예제 8 해설의 비교 근거 없는 문장, JSON 인과에 stack 포함, h3 두 개 한정, function-name 링크 제거(클래스 name 미포함), "~해야 합니다" 완화, 다른 엔진 문장을 가능성으로
  - 남긴 Medium: `app/concepts/error-objects/meta.ts:8` 제목 "…extends Error의 name"이 클래스의 name으로도 읽힘(로드맵에서 확정한 제목이라 사용자 판단) → 리뷰 2차에서 사용자 선택으로 해소
  - 남긴 Low: `examples/message-rules.js:7` new Error(null).message 출력 null이 문자열임을 출력만으로 못 보임(본문 예제 4 설명에 한계와 근거를 밝힘)
  - 범위 밖(기존): `app/concepts/class-basics/content.mdx:21,152,275` 생성자를 생략한 `class Member {}`의 TypeError 원인을 [[IsClassConstructor]]로 설명(명세는 기본 생성자의 NewTarget 검사) — 별도 작업 후보
- 리뷰 2차(사용자 전달 외부 검토, 2026-11-27): Medium 1 · Low 5 → 6건 모두 코드·Node 실행으로 대조해 수정
  - Medium(수정): h3 "Node에서 JSON.stringify가 {}인 이유"의 `{}`를 MDX가 빈 JSX 식으로 지워 "…가 인 이유"로 렌더 → 백틱으로 감쌈, concept.test에 제목의 맨 중괄호 금지 단언 추가(다른 페이지 제목은 grep으로 해당 없음 확인)
  - Low(수정): 제목·summary·본문·simplification의 "클래스의 name"을 "클래스의 인스턴스(가 읽는) name"으로(제목은 사용자 선택: "…의 인스턴스는 name이 왜 Error일까", 남긴 Medium 해소) / "new 없이 부르면"에 생성자를 직접 쓴 클래스도 TypeError이고 던지는 단계만 다르다는 문장 추가(Node에서 "Class constructor A cannot be invoked without 'new'" 확인, 예제는 없음을 밝힘, simplification 문구 맞춤) / h3 "cause가 생기는지는 HasProperty로 정해진다"와 goals 4·흔한 오해 3 문장 / NativeError prototype이 자기 message(빈 문자열)도 가짐(Node에서 TypeError.prototype 자기 키 constructor,name,message 확인) / "결과와 이유" 첫머리에 출력 줄·코드 줄 번호 기준 한 문장, 동작 원리의 "예제 1의 마지막 줄"→"마지막 출력 줄"
  - 검증: lint·format:check·typecheck 통과, npm test 197 파일 6738 통과, 추가 단언 포함 error-objects concept.test 72 통과, test:build 656 통과, navigation e2e 16·지정 e2e 8 통과, dev 서버(5173)에서 새 제목·h3 `{}`·추가 문장 렌더와 콘솔 오류 없음 확인
- 리뷰 3차(사용자 전달 재검토, 2026-11-27): Low 2 → 수정. 흔한 오해 2·3의 "예제 N의 …줄"을 "출력 …줄"로 명시(흔한 오해는 "결과와 이유" h2 안이라 기준 문장 범위이긴 하나 h3로 읽힐 수 있음), 직접 쓴 생성자 문장 어순을 "TypeError를 던지는 곳이 … 점만 다릅니다"로. 검증: format:check 통과, error-objects·content-integrity·result-tables·examples 1986 통과, test:build 656 통과, 지정 e2e 8 통과, dev 서버 렌더 확인

## 변경 이력
- 2026-11-26 (리뷰 지적): 본문 "new 없이 부르면" 절을 기본 생성자 경로로 바꾸고 class-basics 링크 제거, 인용문 6→5(Subclass constructors 제거), stack 서술에서 "접근자" 제거 — 영향 단계 2·4(concept.test 단언 갱신)
- 2026-11-27 (리뷰 지적, 사용자 전달): 제목을 "에러 객체: class ValidationError extends Error의 인스턴스는 name이 왜 Error일까"로 바꾸고(사용자 선택) summary·본문의 "클래스의 name" 정리, h3 `{}` 렌더 누락 수정, cause 절 제목·goals 4, NativeError prototype의 message, 생성자를 직접 쓴 클래스의 TypeError 문장, 줄 기준 문장 — 영향 단계 1·2·3·4(concept.test 단언 1개 추가)
- 2026-11-27 (리뷰 지적, 사용자 전달 재검토): 흔한 오해의 줄 참조를 출력 줄로 명시, 직접 쓴 생성자 문장 어순 — 영향 단계 2·3

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(ecmascript 예제 8개·퀴즈 8개·결과 표·name 지정 방법 표 3행·toString 규칙 표 7행·흔한 오해 3개, 시뮬레이터 없음, order 471·학습 순서 80/83, category objects, 네 페이지 simplifications 연결). 예제 코드와 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것:
  - 리뷰 1차: "new 없이 부르면"을 class-basics 링크 대신 기본 생성자의 NewTarget 검사로 설명했다. 인용문은 6개에서 5개로 줄였고(Subclass constructors 제거), stack은 "접근자" 없이 자기 프로퍼티로만 썼다.
  - 사용자 전달 검토 2차·3차: 제목을 "에러 객체: class ValidationError extends Error의 인스턴스는 name이 왜 Error일까"로 바꿨다(사용자 선택). h3의 `{}` 렌더 누락을 고치고 concept.test에 제목의 맨 중괄호 금지 단언을 더했다. cause 절 제목·goals 4, NativeError prototype의 message, 생성자를 직접 쓴 클래스의 TypeError 문장, 출력 줄·코드 줄 번호 기준도 고쳤다.
  - reviewedAt은 사용자 결정으로 2026-11-27을 기록했다(concept.test 단언도 맞춤). 연결한 네 페이지의 reviewedAt은 그대로 뒀다.

### 코드 리뷰
- 리뷰 1차(메인 + Opus 명세 교차 검토): High 1 수정, Medium 6 중 5개·Low 9 중 7개 수정. 남긴 제목 Medium은 2차에서 사용자 선택으로 해소했다. 사용자 전달 검토 2차(Medium 1·Low 5)와 3차(Low 2)는 모두 반영했다.
- 고치지 않고 남긴 항목: `examples/message-rules.js:7`의 출력 `null`은 출력만으로 문자열임을 보일 수 없다(본문에 한계와 근거를 밝힘).

### 후속 작업
- [ ] class-basics 예제 3(`app/concepts/class-basics/content.mdx:21,152,275`)이 생성자를 생략한 클래스의 TypeError 원인을 [[IsClassConstructor]]로 설명하는 것을 기본 생성자의 NewTarget 검사로 바로잡기(별도 세션 카드 제안됨).
- [ ] (선택) promise-static-methods의 AggregateError와 error-handling의 "AggregateError는 다루지 않음" 문장 연결.
- [ ] 로드맵 5의 다음 개념(5번 Proxy와 Reflect)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] `JSON.stringify(new Error('bad'))`의 `{}`를 명세 보장이 아니라 Node 결과로 한정했다 — Conformance 절이 구현의 추가 프로퍼티를 허용하므로, 다른 엔진이 열거 가능한 자기 프로퍼티를 더하면 결과가 달라질 수 있다. V8의 stack은 열거되지 않는 자기 프로퍼티라 Node에서는 `{}`다.
- [Claude 판단] 예제 8의 TypeError를 class-basics 링크로 설명하지 않고 본문에 기본 생성자 경로를 직접 썼다 — 생성자를 생략한 클래스는 명세가 만든 기본 생성자(내장 함수)가 NewTarget이 undefined이면 TypeError를 던진다. [[IsClassConstructor]] 검사는 생성자를 직접 쓴 클래스에서만 일어나므로, 링크를 걸면 class-basics의 틀린 원인 설명을 보증하게 된다(Opus 리뷰 High).
- [Claude 판단] 예제 2에서 prototype에 둔 name을 열거 가능하게 대입하고, 열거 가능 여부를 따로 출력했다 — "prototype의 name은 열거되지 않아 JSON에 안 나온다"는 틀린 모델을 배제하려는 것이다. 원인은 자기 프로퍼티가 아니라는 것이다(JSON.stringify는 자기 열거 가능 키만 본다).
- [Claude 판단] stack을 "접근자"로 쓰지 않고 "열거되지 않는 자기 프로퍼티"로만 썼다 — Node 22·24에서는 접근자지만 Node 20에서는 데이터 프로퍼티라 형태가 버전마다 다르다.
- [무검토 승인] 예제 1에 `class TypeCheckError extends TypeError {}`의 name을 넣었다 — "Error를 상속하면 name은 늘 Error"라는 일반화를 막는다. NativeError prototype은 자기 name(과 message)을 가지므로 체인에서 그것을 먼저 만난다.
- [무검토 승인] toString 규칙을 `Error.prototype.toString.call(평범한 객체)`로 보였다 — 에러 인스턴스로는 name이 undefined이거나 null인 경우 같은 빈 값 분기를 따로 만들기 어렵다.
- 다룰 범위(추가 4개 주제 포함, captureStackTrace·isError 제외)와 제목은 사용자가 골랐다.

#### 배경지식
- Error 생성자는 OrdinaryCreateFromConstructor(newTarget, "%Error.prototype%")로 객체를 만든다. `newTarget.prototype`이 객체가 아니면 newTarget realm의 %Error.prototype%으로 대신한다. `super()`는 NewTarget을 그대로 넘기므로 하위 클래스 인스턴스의 프로토타입은 하위 클래스의 prototype이다.
- message는 인수가 undefined가 아닐 때만 ToString한 값으로, CreateNonEnumerableDataPropertyOrThrow를 거쳐 열거되지 않는 자기 프로퍼티가 된다. cause는 InstallErrorCause가 options가 객체이고 HasProperty(options, "cause")가 true일 때만 Get한 값으로 만든다(상속한 cause, `cause: undefined`도 포함).
- Error.prototype.toString은 name이 undefined면 "Error"를, message가 undefined면 ""를 쓴다. 그다음 name이 빈 문자열이면 message를, message가 빈 문자열이면 name을, 아니면 `name: message`를 돌려준다.
- 상속한 쓰기 가능한 데이터 프로퍼티에 대입하면([[Set]]) 인스턴스에 열거 가능한 자기 프로퍼티가 생긴다(섀도잉).

#### 확인 질문
1. `ProtoError.prototype.name = 'Proto'`로 둔 인스턴스 p의 `JSON.stringify(p)`가 `{}`인 이유를 "열거 불가"로 설명하면 왜 틀렸나?
   <details><summary>답</summary>`ProtoError.prototype`에 대입한 name은 열거 가능한 프로퍼티다(예제 2 셋째 줄 true). JSON.stringify는 자기 열거 가능 키만 직렬화하므로, p에서 빠지는 이유는 p의 자기 프로퍼티가 아니라서다(content.mdx "Node에서 `JSON.stringify`가 `{}`인 이유", 예제 2).</details>
2. `class ValidationError extends Error {}`를 new 없이 부를 때 TypeError가 나는 단계는 어디이고, 생성자를 직접 쓰면 무엇이 달라지나?
   <details><summary>답</summary>생성자를 생략하면 명세가 만든 기본 생성자가 NewTarget이 undefined이면 TypeError를 던진다. 직접 쓰면 클래스 생성자 함수의 [[Call]]에서 [[IsClassConstructor]]가 true라 TypeError다. 결과는 같지만 던지는 단계가 다르다(content.mdx "new 없이 부르면", meta simplifications).</details>
3. 왜 JSON 결과 `{}`를 "명세가 보장한다"고 쓰지 않았나?
   <details><summary>답</summary>명세의 Error 생성자가 만드는 자기 프로퍼티는 열거되지 않는 message·cause뿐이고 Error.prototype에 toJSON도 없다. 하지만 Conformance 절이 구현의 추가 프로퍼티를 허용하므로, 다른 엔진이 열거 가능한 자기 프로퍼티를 더하면 달라질 수 있다(meta simplifications 2·3번째 항목).</details>
4. `new Error('m', Object.create({ cause: 3 })).cause`가 3인 이유는? HasProperty가 아니라 자기 프로퍼티만 본다면 결과는?
   <details><summary>답</summary>InstallErrorCause는 HasProperty로 확인해 상속한 cause도 있는 것으로 치고, Get으로 읽은 3을 에러의 자기 cause로 만든다. 자기 프로퍼티만 본다면 cause가 생기지 않아 undefined·false가 된다(예제 6 다섯째 줄, 퀴즈 6의 네 번째 선택지).</details>
5. `class TypeCheckError extends TypeError {}` 인스턴스의 message는 어디서 오나?
   <details><summary>답</summary>message를 주지 않으면 자기 message가 없고, 체인에서 먼저 만나는 `TypeError.prototype.message`(빈 문자열)를 읽는다. Error.prototype까지 가지 않는다(content.mdx "name과 message의 초깃값은 Error.prototype에 있다", 리뷰 2차).</details>
