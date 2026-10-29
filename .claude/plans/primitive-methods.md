# 원시 값의 메서드 호출 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-29
- 기준: `main` @ `030cc93`

## 0. 요약

- 목적: 로드맵(13~24장) 7번 `/concepts/primitive-methods`를 추가한다. 원시 값의 프로퍼티를 읽으면 명세가 ToObject로 래퍼 객체를 만들어 찾는다는 것, 원시 값에 대입한 프로퍼티는 어디에도 생기지 않는다는 것(sloppy 무시·strict TypeError), null·undefined에는 래퍼가 없다는 것을 예제 9개, 퀴즈, 원시 타입별 표로 보인다. 래퍼 객체 직접 만들기, `?.`, Symbol·BigInt(표 한 줄)도 포함한다(사용자 결정).
- 범위: 새 개념 폴더 1개(category `objects`, 시뮬레이터 없음), e2e·빌드 테스트 추가, `navigation.spec.ts` `객체` 검색 기대값 4→5, content-guide e2e 목록, 로드맵(7번 행, 전역 객체 추가 게시글 후보). 공통 코드와 기존 개념 17개는 바꾸지 않는다.
- 위험: "임시 래퍼 객체에 프로퍼티가 생겼다가 버려진다"처럼 엔진 구현이나 명세와 다른 설명을 쓰는 것 → PutValue·OrdinarySetWithOwnDescriptor 원문(대입 대상이 원시 값 자체라 false)과 GetValue NOTE(래퍼는 코드에서 접근 불가, 실제로 만들지 않아도 됨)를 근거로 쓰고 오해 Callout으로 다룬다.
- 복잡도: 중간 · Consensus: 생략. typeof-operator의 "표 데이터 파일 + 퀴즈" 패턴과 기존 예제·테스트 패턴의 조합이고 공통 코드 변경이 없다. 명세 원문과 vm·ESM·CJS 실행으로 사실을 미리 확인했다.
- 미확정: 없음

## 1. 요구사항

### 요구사항

- 로드맵(`.claude/plans/concept-roadmap-ch13-24.md:32`) 7번, 『모던 자바스크립트 Deep Dive』 21장 전반(원시값과 래퍼 객체). 21장까지만 전제한다.
- 핵심
  - ① 원시 값은 객체가 아니지만(`typeof 'hi'`는 `'string'`) 프로퍼티를 읽을 수 있다. 명세의 GetValue가 프로퍼티 참조의 기준 값에 ToObject를 적용해 String·Number·Boolean 객체(래퍼 객체)를 만들고 그 객체의 [[Get]]으로 찾는다. 그 객체는 코드에서 접근할 수 없고, 구현은 실제로 만들지 않아도 된다(GetValue NOTE).
  - ② 메서드는 래퍼 객체의 프로토타입(`String.prototype` 등)에 있다. 원시 값 자체는 바뀌지 않는다(`toUpperCase`는 새 문자열을 돌려준다).
  - ③ 원시 값에 프로퍼티를 대입하면 PutValue가 ToObject 객체의 [[Set]]을 부르지만 대입 대상(receiver)이 원시 값 자체라 프로퍼티를 만들지 못하고 false를 돌려준다. sloppy mode에서는 무시, strict mode에서는 TypeError. 래퍼 객체에 만들어졌다가 사라지는 것이 아니다.
  - ④ null·undefined는 ToObject가 TypeError를 던지므로 프로퍼티를 읽거나 쓰면 TypeError다.
- 사용자 결정(2026-10-29)
  - ⑤ 래퍼 객체 직접 만들기: `new String`·`new Number`·`new Boolean`은 객체(`typeof` `'object'`), `new String('hi') === 'hi'`는 false, `==`는 true, 래퍼 객체에 넣은 프로퍼티는 남는다, `new Boolean(false)`는 객체라 truthy. `new` 없이 부르면 변환 함수(`String(123)`은 문자열), `Object('hi')`는 래퍼 객체.
  - ⑥ 옵셔널 체이닝 `?.`: 기준 값이 null·undefined면 undefined를 돌려준다는 것만 예제 하나로 짧게.
  - ⑦ Symbol·BigInt: 예제 없이 표에 한 줄씩(프로퍼티 읽기는 되고 `new Symbol()`·`new BigInt()`는 TypeError).
  - 전역 객체(21장 후반)는 이 페이지에 넣지 않고 로드맵의 추가 게시글 후보로 올린다.
  - 시각화는 시뮬레이터 없이 표 + 퀴즈(로드맵 기준).

### 유지해야 하는 기존 동작

- 기존 개념 17개의 페이지·테스트는 그대로 통과하고 파일은 수정하지 않는다.
- `navigation.spec.ts`는 기대값(4→5)만 바꾸고 첫 카드 '원시 값과 객체' 검사는 그대로 통과해야 한다(2절 정렬 확인).
- 하이드레이션 규칙, `loader` 없음.

### 제외 범위

- 전역 객체(globalThis, 빌트인 전역 프로퍼티·함수, var·함수 선언과의 관계) — 추가 게시글 후보
- 메서드 안의 `this`(원시 값 그대로인지 객체로 바뀌는지) — 8번(22장)
- 문자열의 특수 동작 세부(String exotic object의 [[GetOwnProperty]]), 각 내장 메서드 목록
- `==`에서 객체가 원시 값으로 바뀌는 과정(ToPrimitive) 세부 — 결과만
- `?.`의 호출 형태(`?.()`)와 단축 평가 세부

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 참고 구현
  - `app/concepts/typeof-operator/typeof-table.ts:1-13`: 본문 표 데이터를 파일로 두고 `content.mdx`와 `concept.test.ts`가 함께 쓰는 패턴(`content.mdx:1`, `concept.test.ts:3`)
  - 시뮬레이터 없는 개념의 테스트: `tests/e2e/a11y.spec.ts:161-166`(페이지 axe), `tests/e2e/responsive.spec.ts:143`(가로 스크롤), `tests/build/build-output.test.ts:230-243`(프리렌더 `<details>`·표 행)
  - try…catch·strict 예제와 `.mjs`/`.cjs` 비교: `app/concepts/new-operator/concept.test.ts`, `app/concepts/prototype-chain/concept.test.ts`
- 메타·검색·정렬
  - category `objects`의 라벨은 '객체와 프로토타입'(`app/lib/concepts.ts:26`). 21장 '빌트인 객체'이고 래퍼 객체의 프로토타입을 다루므로 이 분류에 둔다.
  - `객체` 검색 기대값 4: `tests/e2e/navigation.spec.ts:17`, `:32`. summary에 '객체'가 들어가므로 5건이 된다.
  - 정렬(node `localeCompare('ko')`): '원시 값과 객체' → '원시 값의 메서드 호출: …' → '프로토타입 체인'. 첫 카드는 그대로 '원시 값과 객체'다.
- 기존 페이지가 이 페이지로 미룬 부분
  - `new-operator/meta.ts:100`: new String이 만드는 객체(래퍼 객체)
  - `typeof-operator/meta.ts:74`: 래퍼 객체의 typeof
  - `prototype-chain/meta.ts:113`: 원시 값의 프로퍼티 접근(래퍼 객체)
  - `block-scope/meta.ts:90`, `scope-chain/meta.ts:74-75`, `hoisting/meta.ts:67`: 전역 객체 — 이 페이지가 아니라 추가 게시글 후보
- 명세 원문(tc39.es/ecma262 ES2027 초안, 2026-10-28 내려받은 사본으로 확인)
  - 6.2.5.5 GetValue(`sec-getvalue`): 프로퍼티 참조이면 baseObj = ? ToObject(기준 값), baseObj.[[Get]](이름, GetThisValue(참조)). NOTE: "The object that may be created in step 3.a is not accessible outside of the above abstract operation and the ordinary object [[Get]] internal method. An implementation might choose to avoid the actual creation of the object."
  - 6.2.5.6 PutValue(`sec-putvalue`): 프로퍼티 참조이면 baseObj = ? ToObject(기준 값), succeeded = ? baseObj.[[Set]](이름, 값, GetThisValue(참조)). succeeded가 false이고 strict이면 TypeError.
  - 10.1.9.2 OrdinarySetWithOwnDescriptor(`sec-ordinarysetwithowndescriptor`): 데이터 서술자 경로에서 "If receiver is not an Object, return false." 접근자면 setter를 receiver로 호출.
  - 7.1.20 ToObject(`sec-toobject`): undefined·null → TypeError, Boolean·Number·String·Symbol·BigInt → 각 래퍼 객체(새 객체), 객체 → 그대로.
  - 13.3.9.1 OptionalExpression 평가(`sec-optional-chains`): 기준 값이 undefined나 null이면 undefined를 돌려준다.
  - 22.1.4.1 String 인스턴스의 `length`(`sec-properties-of-string-instances-length`): writable·enumerable·configurable 모두 false.
  - 20.3.1.1 `Boolean(value)`, 21.1.1.1 `Number(value)`(`sec-boolean-constructor-boolean-value`, `sec-number-constructor-number-value`): NewTarget이 undefined면 변환 값, 아니면 래퍼 객체. 22.1.1.1 `String(value)`도 같다(new-operator 계획에서 확인).
  - 20.4.1.1 `Symbol([description])`(`sec-symbol-description`), 21.2.1.1 `BigInt(value)`(`sec-bigint-constructor-number-value`): NewTarget이 undefined가 아니면 TypeError.
  - 7.1.2 ToBoolean(`sec-toboolean`): 객체는 true(브라우저의 [[IsHTMLDDA]] 예외는 Normative Optional).
  - 7.2.15 IsStrictlyEqual, 7.2.14 IsLooselyEqual(`sec-isstrictlyequal`, `sec-islooselyequal`): 타입이 다르면 `===`는 false, `==`는 객체를 ToPrimitive로 바꿔 비교.
- 예제 초안 실제 출력(vm은 `runExample`과 같은 방식. `.mjs`·`.cjs`는 파일로 직접 실행)

  | # | 파일 | vm 출력 | `.mjs` | `.cjs` |
  | - | - | - | - | - |
  | 1 | `string-property.js` | `5` / `h` / `HELLO` / `hello` / `string` | 같음 | 같음 |
  | 2 | `number-boolean.js` | `3.14` / `string` / `ff` / `true` | 같음 | 같음 |
  | 3 | `method-source.js` | `true` / `true` / `true` / `false` | 같음 | 같음 |
  | 4 | `assign-sloppy.js` | `undefined` / `5` / `hello` | TypeError(모듈은 strict) | 같음 |
  | 5 | `assign-strict.js` | `TypeError` / `undefined` | 같음 | 같음 |
  | 6 | `null-undefined.js` | `TypeError` / `TypeError` / `undefined` / `undefined` | 같음 | 같음 |
  | 7 | `wrapper-object.js` | `object` / `string` / `false` / `true` / `1` | 같음 | 같음 |
  | 8 | `boolean-wrapper.js` | `object` / `truthy` / `true` / `false` | 같음 | 같음 |
  | 9 | `conversion.js` | `string` / `number` / `boolean` / `object` / `false` | 같음 | 같음 |

- 본문 근거로 쓸 vm 실행 결과(2026-10-29)
  - `'length' in 'abc'` → TypeError(`in`의 오른쪽은 객체여야 하며 ToObject를 하지 않는다)
  - null에 대입(`x.a = 1`, x는 null) → sloppy에서도 TypeError
  - strict에서 `s.length = 1`(s는 문자열) → TypeError
  - `Symbol('id').description` → `'id'`, `new Symbol('id')` → TypeError, `(10n).toString()` → `'10'`, `new BigInt(10)` → TypeError, `typeof Object(Symbol('x'))`·`typeof Object(1n)` → `'object'`
  - `Object('abc')`의 `'0'` 서술자: value `'a'`, writable false, enumerable true, configurable false. `length` 서술자: value 3, 모두 false
  - `new Number(1) === 1` false, `new Number(1) == 1` true, `new Number(1) === new Number(1)` false
  - `typeof new String('a').valueOf()` → `'string'`
  - `typeof new Object('hi')` → `'object'`
  - `255.toString(16)` → SyntaxError(숫자 리터럴 뒤의 점은 소수점으로 읽힌다), `(1).toString()` → `'1'`
  - strict mode에서 `'a'.__proto__ = {}`는 오류 없음(체인의 `Object.prototype.__proto__` setter가 호출되고, setter는 this가 객체가 아니면 아무것도 하지 않는다) — 단순화 근거
  - `String.prototype`에 getter·setter를 정의하면 this(receiver)의 `typeof`가 `'string'`(원시 값 그대로) — 단순화 근거
  - `let o = null; let c = 0; o?.[c++]; c` → 0(기준 값이 null이면 나머지를 평가하지 않음) — 단순화 근거
- MDN ko: `Global_Objects/String`·`Boolean`·`Number`·`Object/Object`·`Operators/Optional_chaining` 200 확인. `Glossary/Primitive`는 `/ko/docs/Glossary/Primitive` 경로로 1단계에서 확인한다.

### 추정

- 예제 이름 `str`·`n`·`empty`·`missing`·`a`·`b`·`flag`가 Chromium에서 `in window`가 아니다 — 6단계 브라우저 확인에서 검사한다.

## 3. 구현 전략

- typeof-operator처럼 표 데이터 파일(`wrapper-table.ts`)을 두고 본문 표와 테스트가 함께 쓴다. 시뮬레이터는 두지 않는다(사용자 결정).
  - slug `primitive-methods`, category `objects`
  - 제목 `'원시 값의 메서드 호출: 객체가 아닌데 메서드를 쓸 수 있는 이유'`
  - related: `['new-operator', 'equality-operators']`
- 표 데이터 `wrapperTable: { type; sample; wrapper; read: { source; result }; newWrapper: string }[]` — 7행
  - String: `'hi'`, `String`, `'hi'.length` → `2`, `new String('hi')` → `typeof`가 `object`
  - Number: `5`, `Number`, `(5).toFixed(1)` → `'5.0'`, `new Number(5)` → `object`
  - Boolean: `true`, `Boolean`, `true.toString()` → `'true'`, `new Boolean(true)` → `object`
  - Symbol: `Symbol('id')`, `Symbol`, `Symbol('id').description` → `'id'`, `new Symbol('id')` → TypeError
  - BigInt: `10n`, `BigInt`, `(10n).toString()` → `'10'`, `new BigInt(10)` → TypeError
  - null: `null`, 없음, `null.x` → TypeError, 해당 없음
  - undefined: `undefined`, 없음, `undefined.x` → TypeError, 해당 없음
  - 테스트는 행마다 `read.source`와 `newWrapper` 식을 vm에서 실제로 평가해 표의 결과와 비교한다(결과 표기는 typeof-operator 표처럼 출력 형식을 정해 일관되게).
- 버린 대안
  - ① 단계 시뮬레이터: 임시 래퍼를 그림으로 그리면 엔진이 매번 객체를 만드는 것처럼 오해하기 쉽고 명세도 실제 생성을 요구하지 않는다(사용자 결정).
  - ② 전역 객체를 같은 페이지에: 주제가 둘로 나뉜다. 9번 실행 컨텍스트(전역 환경 레코드)와 함께 다루는 편이 낫다(사용자 결정, 추가 게시글 후보).
  - ③ 메서드 this를 예제로: 22장이다. 단순화에만 적는다.

## 4. 변경 파일

- 추가 `app/concepts/primitive-methods/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/` 9개(2절 표)
  - `wrapper-table.ts`, `concept.test.ts`
- 수정
  - `tests/e2e/navigation.spec.ts:17`, `:32`: `toHaveCount(4)` → `toHaveCount(5)`(앞선 두 개념과 같은 방식, 다른 줄은 그대로)
  - `tests/e2e/helpers.ts`: `PRIMITIVE_METHODS_PATH` 추가
  - `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`: typeof-operator 케이스를 본떠 페이지 axe·가로 스크롤 추가만
  - `tests/build/build-output.test.ts`: typeof-operator처럼 프리렌더 `<details>` 수와 표 행 확인 추가만
  - `docs/content-guide.md:164`: e2e 목록에 `primitive-methods`
  - `.claude/plans/concept-roadmap-ch13-24.md`: 7번 행·진행 기록, "추가 게시글 후보"에 전역 객체 항목
- 변경하지 않음
  - 공통 코드, `package.json`, `AGENTS.md`, 기존 개념 폴더 17개(역방향 연결은 9절 후보)

## 5. 위험 요소

- "임시 래퍼 객체에 프로퍼티가 저장됐다가 버려진다" 서술 → 명세상 [[Set]]의 대입 대상은 원시 값 자체이고 OrdinarySetWithOwnDescriptor가 false를 돌려준다. 본문과 오해 Callout에서 이 순서로 설명한다.
- 래퍼 객체를 엔진의 실제 동작처럼 서술 → "명세가 동작을 정의하려고 쓰는 개념적 객체, 코드에서 접근할 수 없고 구현은 만들지 않아도 된다"(GetValue NOTE)를 쓰고 단순화 ①에 적는다. GC 서술을 하지 않는다.
- `'length' in 'abc'`처럼 ToObject를 하지 않는 연산까지 일반화("원시 값은 어디서든 객체처럼") → `in` 예외를 본문 한 문장 + 테스트로.
- `Object(null)`을 ToObject(null)과 혼동 → `Object` 생성자는 null·undefined에 빈 객체를 돌려준다(new-operator에서 확인). 본문에서 ToObject와 `Object()`를 같은 것으로 쓰지 않는다.
- 상속된 setter(`__proto__`)가 있으면 대입 결과가 다름 → 단순화에 적고 예제는 체인에 없는 이름(`custom`)과 `length`만 쓴다.
- `assign-sloppy.js`가 모듈에서 TypeError → 단순화와 `.mjs`·`"type": "module"` 테스트로 밝힌다.
- `this`·전역 객체를 앞서 설명 → "별도 개념"으로만.
- `navigation.spec.ts` 첫 카드 검사 → 2절 정렬 확인, 6단계 e2e로 확인
- 표가 375px에서 넘침 → typeof-operator처럼 `overflow-x-auto` 래퍼, e2e 가로 스크롤 검사

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 정확성
  - 예제 9개의 실제 출력이 `expectedOutput`과 같다.
  - 본문 주장 근거 테스트(2절 vm 목록), `.mjs`·`.cjs` 출력이 2절 표와 같다, `assign-sloppy.js`에 `'use strict';`를 붙이면 TypeError, `"type": "module"` 폴더의 `.js`도 TypeError
  - 표 7행을 vm에서 평가한 결과가 표와 같다.
  - 퀴즈 정답 선택지가 `expectedOutput`을 ' / '로 이은 값과 같고, 정답 위치가 한 번호에 몰리지 않는다(prototype-chain 검수 지적 반영).
- 브라우저: 빌드 serve 4175, Playwright, 데스크톱 라이트와 375px 다크
  1. "검토 중" 배지, 분류 '객체와 프로토타입', 선행 개념 링크, 퀴즈 라디오 UI
  2. 표 7행이 보이고 375px에서 가로 넘침 0(표는 자체 스크롤)
  3. 콘솔 에러 0, 예제 이름 `in window` 없음
  4. 홈: '객체와 프로토타입' 그룹 카드 4개, 전체 카드 18개, `객체` 검색 5건(첫 카드 '원시 값과 객체'), `래퍼` 검색 1건 이상

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제·meta·route·표 데이터와 본문 주장 근거 테스트

- 대상: `examples/*.js`(9개), `meta.ts`, `route.tsx`, `wrapper-table.ts`, `concept.test.ts`, 필수 h2 자리표시용 `content.mdx`
- 변경
  - 예제 9개는 scratchpad 초안(`wrap-draft/*.js`)과 같은 원문으로 둔다. 원문(` / `는 줄 구분):
    - `string-property.js`: `const str = 'hello';` / `console.log(str.length);` / `console.log(str[0]);` / `console.log(str.toUpperCase());` / `console.log(str);` / `console.log(typeof str);`
    - `number-boolean.js`: `const n = 3.14159;` / `console.log(n.toFixed(2));` / `console.log(typeof n.toFixed(2));` / `console.log((255).toString(16));` / `console.log(true.toString());`
    - `method-source.js`: `const str = 'abc';` / `console.log(Object.hasOwn(String.prototype, 'toUpperCase'));` / `console.log(str.toUpperCase === String.prototype.toUpperCase);` / `console.log(Object.getPrototypeOf(str) === String.prototype);` / `console.log(Object.hasOwn(str, 'toUpperCase'));`
    - `assign-sloppy.js`: `const str = 'hello';` / `str.custom = 1;` / `console.log(str.custom);` / `str.length = 1;` / `console.log(str.length);` / `console.log(str);`
    - `assign-strict.js`: `'use strict';` / `const str = 'hello';` / `try {` / `  str.custom = 1;` / `} catch (e) {` / `  console.log(e.name);` / `}` / `console.log(str.custom);`
    - `null-undefined.js`: `const empty = null;` / `let missing;` / `try {` / `  empty.length;` / `} catch (e) {` / `  console.log(e.name);` / `}` / `try {` / `  missing.length;` / `} catch (e) {` / `  console.log(e.name);` / `}` / `console.log(empty?.length);` / `console.log(missing?.length);`
    - `wrapper-object.js`: `const a = new String('hi');` / `const b = 'hi';` / `console.log(typeof a);` / `console.log(typeof b);` / `console.log(a === b);` / `console.log(a == b);` / `a.custom = 1;` / `console.log(a.custom);`
    - `boolean-wrapper.js`: `const flag = new Boolean(false);` / `console.log(typeof flag);` / `console.log(flag ? 'truthy' : 'falsy');` / `console.log(Boolean(flag));` / `console.log(flag.valueOf());`
    - `conversion.js`: `console.log(typeof String(123));` / `console.log(typeof Number('42'));` / `console.log(typeof Boolean('x'));` / `console.log(typeof Object('hi'));` / `console.log(Object('hi') === 'hi');`
  - `meta.ts`
    - slug, title, category, related는 3절대로 한다.
    - summary(160자 이하): 원시 값은 객체가 아니지만 프로퍼티를 읽으면 명세가 래퍼 객체로 바꿔 프로토타입의 메서드를 찾는다, 원시 값에 대입한 프로퍼티는 생기지 않는다, null·undefined는 래퍼가 없어 TypeError.
    - tags: `원시 값`, `래퍼 객체`, `wrapper object`, `ToObject`, `String`, `Number`, `Boolean`, `String.prototype`, `length`, `toUpperCase`, `옵셔널 체이닝`, `?.`, `strict mode`, `TypeError`
    - goals 4개: 원시 값의 프로퍼티 읽기가 ToObject와 프로토타입으로 처리되는 순서 설명 / 원시 값에 대입했을 때 sloppy·strict 결과와 그 이유 예측 / null·undefined의 프로퍼티 접근과 `?.` 결과 예측 / `new String`과 `'hi'`, `String()`의 차이(typeof·비교·truthy) 설명
    - prerequisites: `primitives-and-objects`, `typeof-operator`, `prototype-chain`, `property-attributes`(strict TypeError)
    - examples 9개(2절 출력), `reviewedAt: null`
  - 단순화
    - ① 래퍼 객체는 명세가 프로퍼티 접근을 정의하려고 쓰는 객체(ToObject의 결과)입니다. 명세는 이 객체가 그 연산 밖에서 접근할 수 없고 구현이 실제로 만들지 않아도 된다고 적습니다. 이 페이지의 "래퍼 객체를 만들어 찾는다"는 명세의 동작 설명이며 엔진이 매번 객체를 만든다는 뜻이 아닙니다.
    - ② 원시 값의 메서드를 호출할 때 메서드 안의 this는 명세상 원시 값 그대로 전달되고, sloppy mode 함수로 직접 만든 메서드는 this를 객체로 바꿔 받습니다. this는 별도 개념에서 다룹니다.
    - ③ 문자열의 인덱스(`str[0]`)와 `length`는 String 객체의 특별한 [[GetOwnProperty]]가 감싼 문자열에서 만듭니다. 이 세부 동작과 각 내장 메서드의 목록은 다루지 않습니다.
    - ④ 대입할 이름이 체인에서 setter를 만나면(예: `Object.prototype`의 `__proto__`) setter가 호출되어 이 페이지의 규칙과 다르게 동작합니다. 예제는 체인에 없는 이름과 `length`만 씁니다.
    - ⑤ `==`가 래퍼 객체를 원시 값으로 바꾸는 과정(ToPrimitive)은 결과만 보여 줍니다.
    - ⑥ 옵셔널 체이닝은 기준 값이 null·undefined일 때 undefined를 돌려준다는 것만 다룹니다. `?.()` 호출 형태와 나머지 식을 평가하지 않는 동작은 다루지 않습니다.
    - ⑦ 예제는 오류를 보이려고 try…catch와 `e.name`을 씁니다. 오류 처리는 별도 개념입니다.
    - ⑧ 예제 4를 파일로 실행할 때 `.mjs` 파일이거나 `package.json`에 `"type": "module"`이 있으면 모듈이라 항상 strict mode여서 2번 줄에서 TypeError가 납니다. 클래식 스크립트나 CommonJS(`.cjs`)로 실행하면 이 페이지의 결과와 같습니다.
    - ⑨ 21장의 전역 객체(globalThis, 빌트인 전역 프로퍼티와 함수)는 별도 개념에서 다룹니다.
  - references: 2절 앵커(GetValue, PutValue, OrdinarySetWithOwnDescriptor, ToObject, Optional Chains, String 인스턴스 length, Boolean(value), Number(value), String(value), Symbol(), BigInt(), ToBoolean, IsStrictlyEqual, IsLooselyEqual)와 MDN ko(2절)
  - `wrapper-table.ts`: 3절 7행
  - `concept.test.ts`
    - 본문 주장: 2절 vm 목록 전부
    - 표 7행 평가
    - 예제 실제 실행, `.mjs`·`.cjs` 출력이 2절 표와 같다, `assign-sloppy.js`에 `'use strict';`를 붙이면 TypeError, `"type": "module"` 폴더의 `.js`도 TypeError
- 주의사항
  - `console.log`에는 원시 값과 `JSON.stringify` 결과만 넘긴다.
  - 예제는 Prettier·ESLint 제외 경로다.
  - vm 판정은 컨텍스트 안에서 하고 결과만 꺼낸다(realm이 다르다).
- 완료 조건
  - `npm test`에서 L1 9개와 본문 주장·표 테스트가 통과한다.
  - lint·format:check·typecheck가 통과한다.
  - summary 160자 이하, MDN 링크 200 확인

### 2. 본문 content.mdx

- `## 동작 원리`의 h3
  - 원시 값은 객체가 아니다(그런데 프로퍼티를 읽을 수 있다)
  - 프로퍼티를 읽을 때: ToObject와 래퍼 객체(GetValue, NOTE, `in`은 ToObject를 하지 않음)
  - 메서드는 프로토타입에 있다(String.prototype, prototype-chain 링크, 원시 값은 바뀌지 않음, `255.toString` 괄호)
  - 원시 값에 대입하면(PutValue → [[Set]] → receiver가 원시 값이라 false → sloppy 무시·strict TypeError, `length`도 같음)
  - null과 undefined에는 래퍼가 없다(ToObject TypeError, 대입도 TypeError, `?.`)
  - 래퍼 객체를 직접 만들면(`new String` 등, typeof, `===`·`==`, 프로퍼티가 남음, `new Boolean(false)`는 truthy, `valueOf`)
  - new 없이 부르면 변환 함수(`String()`·`Number()`·`Boolean()`, `Object('hi')`는 래퍼 객체, `Object()`는 null·undefined에 빈 객체이므로 ToObject와 다름)
  - 원시 타입별 정리: `wrapperTable`로 JSX `<table>`(Symbol·BigInt 행 포함)
- `## 예제`: 예제 1~9에 `file=` 코드 블록과 PredictQuiz(정답 위치 분산)
- `## 결과와 이유`
  - 예제별 설명
  - 오해 Callout: ① 원시 값도 사실 객체다 ② 원시 값에 넣은 프로퍼티는 임시 래퍼 객체에 저장됐다가 사라진다 ③ `new String('hi')`와 `'hi'`는 같다 ④ `new Boolean(false)`는 거짓이다 ⑤ null에도 메서드를 부를 수 있다(`?.`가 오류를 막는 것이지 null에 프로퍼티가 생기는 것이 아님)
- 링크: primitives-and-objects, typeof-operator, prototype-chain, property-attributes, new-operator(내장 생성자 new 유무), equality-operators, short-circuit-evaluation(truthy·falsy)
- 주의사항
  - 2절의 확인된 사실만 쓴다. 오류 메시지 문구를 인용하지 않는다. GC·엔진 최적화 서술을 하지 않는다.
  - `this`·전역 객체는 "별도 개념"으로만 쓴다.
  - JSX 안 인라인 code가 줄바꿈으로 깨지지 않게 쓴다(prototype-chain에서 발견, 빌드 HTML로 확인).
- 완료 조건
  - 메인이 전문을 2절과 대조한다.
  - `npm test`와 build가 성공한다.
  - HTML `<details` 수가 퀴즈 수(9)와 같고, `**` 0개, 공백이 연속된 깨진 code 0개.

### 3. e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: typeof-operator 케이스를 본떠 추가만. `navigation.spec.ts`는 두 줄의 기대값만 5로. content-guide 목록, 로드맵 7번 행·진행 기록·추가 게시글 후보(전역 객체: "21장 후반의 전역 객체(globalThis, 빌트인 전역 프로퍼티·함수, var·함수 선언과의 관계) — 9번 실행 컨텍스트 뒤 제안, block-scope·scope-chain·hoisting이 미룬 내용").
- 완료 조건: 전체 검증 명령이 통과하고, 6절 브라우저 시나리오 1~4를 확인한다.

## 9. 추가 개선 후보

- 추가 게시글 후보: 전역 객체(21장 후반) — 3단계에서 로드맵에 올린다(사용자 결정).
- 기존 개념 역방향 연결: `new-operator/meta.ts:100`, `typeof-operator/meta.ts:74`, `prototype-chain/meta.ts:113`의 "별도 개념(래퍼 객체)" 문구와 `related`에 이 페이지를 거는 일(기존 개념 수정, 사용자 확인)

## 변경 이력

- 2026-10-29 (사용자 요청 — 외부 콘텐츠 검토 7건): 1~6번은 명세 원문·vm으로 확인 후 반영. ① 단순화 ③의 length 설명 → 인덱스만 String exotic [[GetOwnProperty]]가 만들고 length는 StringCreate가 생성 시 정의하는 쓰기 불가 데이터 프로퍼티 ② "새로 만들 때 receiver가 객체가 아니면 false" → 찾은 프로퍼티가 쓰기 가능한 데이터이거나 없을 때로 넓히고 `str.toUpperCase = 1`도 같은 이유로 실패한다고 추가 ③ GetValue 문단에 [[Get]]의 receiver(getter의 this)도 원시 값 자체라는 문장 추가 ④ 단순화의 "21장의 전역 객체" → 장 번호 삭제 ⑤ `Object` 설명 → "원시 값을 돌려주는 함수가 아니라 객체를 돌려주는 생성자, ToObject 그 자체도 아님" ⑥ summary "래퍼 객체로 바꿔" → "래퍼 객체를 거쳐", `?.` 문단의 섞인 문장 분리. ⑦(선택, ES3까지는 임시 객체에 실제로 프로퍼티가 생겼다는 역사) → ES3 원문 PDF를 로컬 도구로 읽지 못해 확인 불가 — 미확인 사실을 쓰지 않는 원칙에 따라 반영하지 않음. 근거 테스트 2개 추가. 범위·접근 방식 변화 없음 — 영향 단계 1(meta), 2(본문).
- 2026-10-29 (사용자 요청 — 외부 콘텐츠 검토 2차 2건): vm으로 확인(sloppy getter의 typeof this는 object) 후 반영. ① 본문 "getter의 this" → "getter를 부를 때 넘기는 this 값", 단순화 ②를 메서드와 getter 모두로 넓히고 sloppy 함수는 객체로 바꿔 받는다고 정리 ② PutValue 문단의 "그래서 … 그래서" 연결을 바로잡음. 근거 테스트 1개 추가(sloppy getter의 this는 객체). 영향 단계 1(meta), 2(본문).

## 구현 진행

- baseline (2026-10-29, `030cc93`): lint 0 / format:check 통과 / typecheck 통과 / `npm test` 64파일 1740 통과(메인 실행). `test:build` 134·`e2e` 251 통과(3 skipped)는 같은 커밋 내용의 직전 검증 결과(prototype-chain 구현 진행 7). dev 서버 5173 실행 중.
- [x] 1. 예제·meta·route·표 데이터·본문 주장 테스트 — 서브에이전트 작성, 메인 재실행: lint·format:check·typecheck 통과, 이 개념+L1+L3 3파일 363 통과. 예제 9개 = 초안(`cmp`), route = prototype-chain과 동일. 표 7행(결과 표기 규칙: 문자열은 작은따옴표, 그 밖은 String(값), 오류는 이름, new 결과는 `typeof: …`)을 vm에서 평가해 비교. 명세 앵커 14개·MDN ko 6개 200 확인. 메인 검토: summary·단순화 ①~⑨ 계획과 일치. getter·setter receiver 테스트는 함수 안에 'use strict'(sloppy 함수는 this를 객체로 바꿔 받으므로, 단순화 ②와 일치).
- [x] 2. 본문 content.mdx — 서브에이전트 작성(h3 8, 퀴즈 9, misconception 5, 표 1 = `wrapperTable`). 메인이 전문을 명세·실행 결과와 대조해 수정: ① "원시 문자열 str의 프로토타입은 String.prototype"(본문·퀴즈 해설) → 원시 값에는 [[Prototype]]이 없고 `Object.getPrototypeOf`가 ToObject로 바꾼 String 객체의 [[Prototype]]이라고 정정 ② "ToObject를 쓰는 것은 GetValue와 PutValue"가 그 둘뿐인 것처럼 읽힘 → "ToObject를 쓰도록 정의된 연산에서만", 예제 3의 `Object.getPrototypeOf`·`Object.hasOwn`도 ToObject를 적용한다고 추가 ③ 원시 값이 바뀌지 않는 이유의 순환 문장 → "변경할 수 없는 값"과 primitives-and-objects 링크 ④ 본문의 "npm test" 언급 → "실제로 실행해 확인한 값". 근거 테스트 1개 추가(getPrototypeOf·hasOwn의 ToObject, null은 TypeError). 퀴즈 정답 위치 2·0·3·1·2·0·3·1·2, 정답 = expectedOutput 대조 확인. 메인 재실행: lint·format·typecheck 통과, `npm test` 65파일 1821, build 성공, HTML `<details` 9·`**` 0·`<table` 1·깨진 code 0.
- [x] 3. e2e·빌드 테스트·문서 — 서브에이전트가 테스트 4파일에 추가만(typeof-operator 케이스 본뜸: 페이지 axe, 가로 스크롤, 프리렌더 `<details>`·표 행), `navigation.spec.ts` `toHaveCount(4)` 두 곳만 5로, content-guide 목록·로드맵 7번 행·진행 기록·추가 게시글 후보(전역 객체). 새 axe 테스트가 mobile에서 `scrollable-region-focusable`(serious)로 실패 — 원시 타입별 표가 375px에서 가로 스크롤되는데 키보드로 포커스할 수 없음(다른 개념 표는 넘치지 않아 걸리지 않았음). 메인 수정: 첫 시도(열 하나 제거 + `overflow-wrap:anywhere`)는 axe는 통과했지만 375px 스크린샷에서 코드가 글자 중간에서 끊겨(`Stri`/`ng`) 읽기 어려워 되돌림 → 표 래퍼에 `tabIndex={0}`·`role="region"`·`aria-label`·focus-visible 외곽선, 표 안 code는 `whitespace-nowrap`. 겹치던 "예" 열(읽기 예와 중복)과 `wrapperTable.sample` 필드는 제거. 확인: 375px 다크에서 region 포커스 후 → 키로 scrollLeft 0→120, 페이지 가로 넘침 0, 스크린샷 육안 확인. 메인 전체 재실행: lint·format·typecheck 통과, `npm test` 65파일 1821, `test:build` 140, `e2e` 257 통과·3 skipped. 브라우저(빌드 serve 4175, 데스크톱 라이트·375px 다크): '검토 중' 1·'객체와 프로토타입' 1·라디오 36(퀴즈 9×4), 표 7행, 콘솔 에러 0, 예제 이름 `in window` 없음([]), 홈 카드 18·`객체` 5(첫 카드 '원시 값과 객체')·`래퍼` 1.
- 리뷰 1차 (critical-code-review: 메인 직접 — 공통 코드 변경 없음, 개념 폴더 + 테스트 추가 + 기대값 2줄 + 문서): 새 Critical/High 0. 명세 불일치는 2단계 메인 대조에서 수정 완료(원시 값의 [[Prototype]], ToObject를 쓰는 연산 범위). 접근성 결함(표 스크롤 영역 포커스 불가)은 3단계에서 수정. 확인한 것: 대입 설명이 PutValue → [[Set]] receiver = 원시 값 → OrdinarySetWithOwnDescriptor false와 일치("임시 래퍼에 저장 후 폐기" 서술 없음, Callout으로 정정), GetValue NOTE대로 래퍼를 엔진 동작으로 쓰지 않음·GC 서술 없음, `in`·`Object()`·`255.toString` 예외 서술에 테스트 존재, 모든 실행 결과 주장과 표 7행에 테스트 존재(`.mjs`·`.cjs`·`"type": "module"`·지시어 재실행 포함), 퀴즈 정답 9개 = expectedOutput·위치 분산, 오류 메시지 인용 없음, e2e 추가 케이스는 기존 케이스 수정 없음. Low 1: 표 영역이 탭 순서에 들어가 데스크톱(넘치지 않음)에서도 포커스가 한 번 머묾(스크롤 영역 포커스 패턴의 일반적 비용, 보고만).
- [x] 4. 외부 콘텐츠 검토 반영(변경 이력 2026-10-29) — 메인 직접(본문·meta 문장, 근거 테스트 2개). 재실행: lint·format·typecheck 통과, `npm test` 1823, `test:build` 140, `e2e` 257 통과·3 skipped, HTML `<details` 9·`**` 0·깨진 code 0·'21장' 0, summary 117자.
- [x] 5. 외부 콘텐츠 검토 2차 반영 — 메인 직접(문장 3곳, 근거 테스트 1개). 재실행: lint·format·typecheck 통과, `npm test` 1824, `test:build` 140, HTML `<details` 9·`**` 0·깨진 code 0. `e2e` 257 통과·3 skipped.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 예제 9개, 퀴즈 9, misconception 5, 원시 타입별 표 7행(`wrapper-table.ts`, 본문과 테스트가 공유). 공통 코드와 기존 개념 파일은 바꾸지 않았고 `navigation.spec.ts`는 기대값 두 곳만 5로 바꿨다. 로드맵 추가 게시글 후보에 전역 객체를 올렸다.
- 계획과 달라진 점: 원시 타입별 표의 "예" 열(읽기 예와 중복)과 `wrapperTable.sample` 필드를 뺐고, 375px에서 표가 가로 스크롤되는 접근성 결함(axe `scrollable-region-focusable`)을 고치려고 표 래퍼를 포커스 가능한 이름 있는 영역(`tabIndex={0}`·`role="region"`·`aria-label`)으로 만들고 표 안 code를 줄바꿈하지 않게 했다. 본문은 메인 대조와 외부 콘텐츠 검토 두 차례(1차 6건 반영·1건 확인 불가로 미반영, 2차 2건)로 다듬었다. 완료 조건은 바꾸지 않았다.

### 코드 리뷰

- 새 Critical/High 0. 명세 불일치(원시 값의 [[Prototype]], ToObject를 쓰는 연산 범위)와 표 스크롤 영역 접근성 결함은 구현 단계에서 수정했다. Low 1건(표 영역이 넘치지 않는 화면에서도 탭 순서에 들어감)은 보고만 하고 남겼다.

### 후속 작업

- [x] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록(2026-10-29)
- [ ] (선택) ES3까지 임시 객체에 실제로 프로퍼티가 생겼다는 역사 서술 — ES3 원문을 확인할 수 있으면 추가(외부 검토 1차 ⑦)
- [ ] (선택) 9절 기존 개념 역방향 연결(new-operator·typeof-operator·prototype-chain의 "별도 개념(래퍼 객체)" 문구와 `related`)
- [ ] 추가 게시글 후보 "전역 객체" — 9번 실행 컨텍스트 뒤 제안

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 표 스크롤 접근성 결함을 고칠 때 코드를 아무 데서나 줄바꿈시키는 방법(axe는 통과)을 버리고, 표 래퍼를 포커스 가능한 region으로 만들고 code는 줄바꿈하지 않게 했다 — 375px에서 `Stri`/`ng`처럼 코드가 끊겨 읽을 수 없었기 때문이다. 대가로 넘치지 않는 화면에서도 탭 순서에 한 번 들어간다.
- [Claude 판단] "원시 문자열의 프로토타입은 String.prototype"을 "Object.getPrototypeOf가 ToObject로 만든 String 객체의 [[Prototype]]"으로 고쳤다 — 원시 값에는 [[Prototype]]이 없고, 예제 3의 결과는 getPrototypeOf가 인수에 ToObject를 적용하기 때문이다.
- [Claude 판단] 외부 검토의 ES3 역사 항목은 원문을 확인하지 못해 넣지 않았다 — 미확인 사실을 쓰지 않는다는 프로젝트 원칙.
- [무검토 승인] 표 데이터를 `wrapper-table.ts`로 두고 테스트가 행마다 vm에서 평가한다 — 본문 표와 실행 결과가 어긋나지 않게 하는 typeof-operator 패턴.
- 범위(래퍼 객체 직접 만들기, `?.`, Symbol·BigInt 표 한 줄), 전역 객체 분리, 표 + 퀴즈 시각화는 사용자 결정. 외부 검토 반영은 사용자 요청.

#### 배경지식

- 읽기(GetValue)와 쓰기(PutValue)는 기준 값에 ToObject를 적용하고 그 객체의 [[Get]]/[[Set]]을 부르지만, receiver(getter·setter의 this, 대입 대상)로는 원시 값 자체를 넘긴다.
- OrdinarySetWithOwnDescriptor는 쓰기 가능한 데이터 프로퍼티이거나 없을 때 receiver가 객체가 아니면 false를 돌려준다. PutValue는 strict이면 TypeError, 아니면 무시한다.
- ToObject는 null·undefined에 TypeError, `Object()` 생성자는 null·undefined에 빈 객체 — 둘은 다르다.
- 명세 NOTE: GetValue가 만드는 객체는 코드에서 접근할 수 없고 구현이 만들지 않아도 된다.

#### 확인 질문

1. `str.custom = 1` 뒤 `str.custom`이 undefined인 이유를 "임시 래퍼에 저장했다가 버려서"라고 하면 명세와 무엇이 다를까?
   <details><summary>답</summary>명세의 [[Set]]은 receiver로 원시 값 자체를 받고, receiver가 객체가 아니라 false를 돌려준다. 래퍼에도 어디에도 프로퍼티가 만들어지지 않는다. strict mode에서 TypeError가 나는 것도 이 false 때문이다. 계획 2절 PutValue·OrdinarySetWithOwnDescriptor, 예제 4·5.</details>
2. `'length' in 'abc'`는 TypeError인데 `'abc'.length`는 왜 되는가?
   <details><summary>답</summary>프로퍼티 참조(GetValue)는 ToObject를 적용하지만 `in` 연산자는 오른쪽이 객체여야 하고 ToObject를 하지 않는다. "원시 값은 어디서나 객체가 된다"는 규칙은 없다. 본문 "프로퍼티를 읽을 때" 절.</details>
3. `Object(null)`은 왜 TypeError가 아닌가, 그러면 ToObject와 같은 것인가?
   <details><summary>답</summary>Object 생성자는 null·undefined면 새 빈 객체를 만들고, 그 밖의 값만 ToObject를 적용한다. ToObject 자체는 null·undefined에 TypeError다. 예제 9 설명, 근거 테스트.</details>
4. 표를 375px에서 코드 줄바꿈으로 좁히는 대신 포커스 가능한 스크롤 영역으로 만든 이유와 그 대가는?
   <details><summary>답</summary>줄바꿈하면 코드가 글자 중간에서 끊겨 읽을 수 없다. 스크롤 영역은 키보드로 갈 수 있어야 하므로 tabIndex·role·aria-label을 줬고, 대가로 넘치지 않는 화면에서도 탭 순서에 한 번 들어간다. 구현 진행 3단계.</details>
5. `new Boolean(false)`를 if 조건에 쓰면 왜 참인가?
   <details><summary>답</summary>new Boolean은 래퍼 객체를 만들고, ToBoolean은 객체에 항상 true를 돌려준다. 안의 값은 valueOf()로 꺼내야 false다. 예제 8.</details>
