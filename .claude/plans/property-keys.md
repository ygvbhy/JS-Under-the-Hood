# 프로퍼티 키와 접근 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `3c5b1f2`

## 0. 요약
- 목적: 로드맵 6번 개념 `/concepts/property-keys`를 추가한다. 대괄호 안의 값은 문자열로 바뀌어 프로퍼티 키가 되고(`obj[1]` = `obj['1']`), 점 표기는 이름을 그대로 키로 쓰며, 없는 키 읽기는 `undefined`, 대입은 추가·갱신, `delete`는 삭제(없어도 `true`)라는 것을 예제, 퀴즈, 객체 박스 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개 + e2e·빌드 테스트 케이스 추가 + 기존 e2e `객체` 검색 기대 개수 1 → 2(사용자 결정) + `docs/content-guide.md` 9단계 목록 문구 + 로드맵 상태. 공통 코드와 기존 개념 8개는 바꾸지 않는다.
- 위험: 시나리오의 객체 상태·키 계산·출력을 손으로 잘못 적는 것 → 테스트가 예제를 해당 줄까지 실제로 실행해 얻은 변수·객체·출력과 단계마다 대조하고, 대괄호 안 식을 vm에서 다시 평가한다.
- 복잡도: 중간 · Consensus: 생략 (switch-break-continue와 같은 구조라 공통 코드·새 공통 패턴이 없다. 명세 원문과 vm 실행으로 사실을 미리 확인했고, 위험 지점은 실제 실행 대조 테스트로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 6번. 『모던 자바스크립트 Deep Dive』 10장 범위(사용자 진도 1~12장). 직전 커밋(5번 switch) 다음 순서(사용자 지시, 2026-10-27).
- 핵심: ① 대괄호 안의 값은 문자열로 바뀌어 키가 된다(`obj[1]`과 `obj['1']`은 같은 프로퍼티) ② 점 표기는 점 뒤의 이름을 그대로 키로 쓰고, `obj.key`와 `obj[key]`는 다르다 ③ 없는 프로퍼티를 읽으면 `undefined` ④ 없는 키에 대입하면 추가, 있으면 갱신, `delete`로 삭제.
- 사용자 결정(2026-10-27) 추가 항목 4개 모두 포함: ① 계산된 프로퍼티 이름 `{ [key]: v }`(예제 + 퀴즈) ② 숫자 키 정규화 `obj[1.0]` = `obj['1']`, `obj['01']`은 다름(예제 + 퀴즈) ③ 불리언·`null`·객체를 키로(`obj[{}]` → 키 `"[object Object]"`, 예제 + 퀴즈) ④ `undefined`의 프로퍼티 접근은 TypeError(본문 한 문단 + [단축 평가](/concepts/short-circuit-evaluation) `?.` 링크, 테스트로 검증).
- 사용자 결정(2026-10-27): meta에 `객체`를 넣고, 기존 e2e `navigation.spec.ts`의 `객체` 검색 기대 개수를 1 → 2로 바꾼다.
- 객체 박스 시뮬레이터를 넣는다(로드맵 결정). `docs/content-guide.md` 절차를 따른다.

### 유지해야 하는 기존 동작
- 기존 개념 8개의 페이지·시뮬레이터·테스트는 그대로 통과하고, 그 파일은 수정하지 않는다.
- `객체` 검색의 첫 카드는 계속 `원시 값과 객체`이고 그 카드를 눌러 `primitives-and-objects`로 간다(`tests/e2e/navigation.spec.ts:18-22`). 정렬상 새 개념(`프…`)은 `원…` 뒤라 유지된다(실행 확인).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위
- 심벌 키(33장), 프로토타입 체인 탐색(19장), `in` 연산자·`hasOwnProperty`·`Object.keys` 설명(존재 확인은 다루지 않음), 프로퍼티 어트리뷰트·접근자 프로퍼티, `delete`가 `false`를 돌려주는 경우와 strict mode TypeError, 메서드·축약 표현(`{ x }`), 객체 리터럴의 중복 키, 정수 형태 키가 먼저 나열되는 순서 규칙, 배열.
- 위 항목은 필요한 곳에서 `simplifications`로만 밝힌다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 라우트는 폴더 스캔(`app/routes.ts`), 레지스트리 glob·홈 정렬 `localeCompare(…, 'ko')`(`app/lib/concepts.ts:37-39`), 검색은 title·summary·tags 부분 일치(`app/lib/concepts.ts:47-56`).
- 참고 구현: `app/concepts/switch-break-continue/`(가장 최근: `Simulator.tsx` 래퍼, `route.tsx`, `concept.test.ts` 구조), `app/concepts/primitives-and-objects/`(객체 카드·`→ 객체 A` 참조 칩·`changed` 배지 모양, `MemoryView.tsx:96-174`), `app/concepts/increment-decrement/EvaluationView.tsx`(배지·빈 상태·줄바꿈 클래스 문자열). 공통 타입 `app/simulator/types.ts`, 불변식 `tests/helpers/scenario-invariants.ts`(①~⑤), 예제 실행 `tests/helpers/run-example.ts`(`runInNewContext`, sandbox는 `console`만, `util.format`).
- e2e 개념별 상수 `tests/e2e/helpers.ts`, a11y `tests/e2e/a11y.spec.ts:174-200`, responsive `tests/e2e/responsive.spec.ts:181-210`, 빌드 프리렌더 블록 `tests/build/build-output.test.ts:371-`(switch 블록이 본보기).
- `객체` 검색 의존: `tests/e2e/navigation.spec.ts:17`(`toHaveCount(1)`), `:32`(`toHaveCount(1)`). `a11y.spec.ts:50`은 개수를 검사하지 않는다. 다른 테스트에 카드 총 개수 의존 없음(grep 확인).
- `short-circuit-evaluation/meta.ts:34`에 `{ label: '객체 리터럴과 프로퍼티 접근' }`(slug 없음) 선행 개념이 있다 → 9절 후보.
- 명세(tc39.es/ecma262, 2026-10-27 원문 확인):
  - The Object Type(6.1.7): 프로퍼티 키는 String 또는 Symbol. 빈 문자열도 키가 된다.
  - Property Accessors Evaluation(13.3.2.1): `a.b`는 `EvaluatePropertyAccessWithIdentifierKey` — IdentifierName의 StringValue가 키(13.3.4). `a[b]`는 `EvaluatePropertyAccessWithExpressionKey` — 식을 평가·GetValue한 값을 그대로 담고(13.3.3), NOTE: 보통 바로 ToPropertyKey를 하지만 `a[b] = c`에서는 `c`를 평가한 뒤에 한다.
  - GetValue(6.2.5.5)·PutValue(6.2.5.6): 프로퍼티 참조면 `ToObject(base)`(base가 `undefined`·`null`이면 TypeError) → 이름이 키가 아니면 `ToPropertyKey` → `[[Get]]`/`[[Set]]`.
  - ToPropertyKey(7.1.21): `ToPrimitive(arg, string)` → 심벌이면 그대로, 아니면 `ToString`.
  - 객체 리터럴(13.2.5.5): `LiteralPropertyName : IdentifierName`은 StringValue, `StringLiteral`은 SV, `NumericLiteral`은 `ToString(NumericValue)`. `ComputedPropertyName : [ AssignmentExpression ]`은 평가·GetValue 후 `ToPropertyKey`.
  - OrdinaryGet(10.1.8.1): 자기 프로퍼티가 없으면 프로토타입에서 찾고, 프로토타입이 `null`이면 `undefined`.
  - OrdinarySetWithOwnDescriptor(10.1.9.2): 자기 프로퍼티가 없으면(프로토타입 확인 후) `CreateDataProperty`로 새 프로퍼티, 있으면 값을 바꾼다.
  - `delete`(13.5.1.2) → OrdinaryDelete(10.1.10.1): 프로퍼티가 없으면 `true`, configurable이면 지우고 `true`, 아니면 `false`(sloppy) / TypeError(strict).
  - OrdinaryOwnPropertyKeys(10.1.11.1): 배열 인덱스 키 오름차순 → 나머지 문자열 키 생성 순.
  - 앵커 존재 확인: `sec-object-type`, `sec-property-accessors`, `sec-property-accessors-runtime-semantics-evaluation`, `sec-topropertykey`, `sec-object-initializer`, `sec-object-initializer-runtime-semantics-evaluation`, `sec-getvalue`, `sec-putvalue`, `sec-ordinaryget`, `sec-ordinarysetwithowndescriptor`, `sec-delete-operator`, `sec-ordinarydelete`, `sec-numeric-types-number-tostring`.
- MDN(ko) 200 확인: `Reference/Operators/Property_accessors`, `Reference/Operators/Object_initializer`, `Reference/Operators/delete`, `Guide/Working_with_objects`.
- 예제 초안 실제 출력(Node 24.22.1 `vm` + `util.format`, `run-example.ts`와 같은 방식, 8절 1단계 원문 그대로):

  | 예제 | 출력 (`console.log` 줄마다) |
  | - | - |
  | `same-key.js` | `금` / `은` / `동` / `{"1":"동","2":"은"}` |
  | `dot-vs-bracket.js` | `민지` / `민지` / `민지` / `열쇠` |
  | `add-delete.js` | `undefined` / `{"a":10,"b":2}` / `true` / `undefined` / `true` / `{"b":2}` |
  | `computed-key.js` | `{"field":"빨강"}` / `{"color":"빨강","size2":"M"}` |
  | `number-key.js` | `하나 천` / `undefined undefined` / `{"1":"하나","1000":"천","0.30000000000000004":"근삿값"}` |
  | `non-string-key.js` | `참 없음` / `빈 객체` / `빈 객체` / `{"true":"참","null":"없음","[object Object]":"빈 객체"}` |
  | `dot-syntax.js` | `1000` / `NaN` / `A` |

- 본문 서술 근거(vm): `const o = {}; o.1;`은 `new vm.Script`에서 SyntaxError. `const o = {}; o.missing.x;`와 `const o = { v: null }; o.v.x;`는 TypeError(`e.name`), `o.missing`은 오류 없음. 예제에서 없는 키로 읽는 `b`·`c`·`a`(삭제 후)·`01`·`1.0`은 `Object.prototype`에도 없다(`k in Object.prototype` 모두 false).
- 세 예제(`number-key`, `non-string-key`, `same-key`)의 `JSON.stringify` 키 순서는 생성 순서와 같다(정수 형태 키를 먼저 만들었기 때문). 순서 규칙을 설명하지 않아도 출력이 혼동을 주지 않는다.
- 홈 정렬(실행 확인): 단축 평가 → 동등 비교 → 숫자 타입 → 암묵적 타입 변환 → 원시 값과 객체 → 증감 연산자 → **프로퍼티 키** → switch와 break·continue → typeof 연산자. 새 개념은 일곱 번째 카드다.
- summary 초안 131자, `객체` 포함(실행 확인).

### 추정
- 없음

## 3. 구현 전략
- switch-break-continue와 같은 구조(예제 → meta → 시나리오·실행 대조 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다. slug는 `property-keys`, category는 `fundamentals`(다른 8개와 같음. `objects` 그룹 이름 "객체와 프로토타입"은 미학습인 프로토타입을 앞세우므로 쓰지 않는다).
- 시뮬레이터 상태는 "프로퍼티 접근" 패널(이번 줄의 접근 식 → 표기 → 대괄호 안 값 → 프로퍼티 키 → 결과) + 변수 목록 + 객체 카드다. 키가 문자열이라는 것을 보이려고 객체 카드의 키는 항상 큰따옴표로 표시한다(`"1": "금"`). 핵심 오해(숫자 키와 문자열 키가 다르다)를 "대괄호 안의 값 1(숫자) → 프로퍼티 키 "1"(문자열)" 한 줄로 보여 주는 것이 이 모양을 고른 이유다.
- 시나리오는 3개(`same-key`, `dot-vs-bracket`, `add-delete`)로 핵심 4가지를 다루고, 추가 항목(계산된 이름, 숫자 정규화, 비문자열 키, 점 표기 제약)은 예제 + 퀴즈로 다룬다. 시나리오 예제는 한 줄에 문장 하나만 두어, 테스트가 "1번 줄부터 그 단계의 줄까지" 잘라 실제로 실행할 수 있게 한다.
- 정확성 검증은 두 겹이다: (a) 단계마다 예제를 그 줄까지 vm으로 실행해 변수·객체(키 순서·값·타입)·출력을 상태와 대조 (b) 대괄호 안 식을 그 직전 줄까지 실행한 컨텍스트에서 다시 평가해 `keyValue`·`key`(= `String(값)`)와 대조하고, 결과 종류(읽음/없음/추가/갱신/삭제)를 이전·현재 객체 상태로 검사.
- 버린 대안: ① primitives-and-objects `MemoryView` 재사용 — AGENTS 규칙상 개념 간 공유 부품은 `app/simulator/`뿐이고, 키 계산 패널이 없다. 클래스 문자열만 같게 쓴다. ② 참조 화살표(SVG) — 객체가 하나뿐인 시나리오라 `→ 객체 A` 칩 텍스트로 충분하다. ③ 명세의 Reference Record·ToPropertyKey 시점(대입 오른쪽 평가 뒤)을 단계로 나누기 — 미학습 용어가 늘고 단계가 많아진다. 본문 한 줄과 `simplifications`로 밝힌다. ④ 추가 항목도 시나리오로 — 단계가 너무 많아진다. ⑤ TypeError를 `try...catch` 예제로 — `try...catch`는 47장(미학습)이고 오류 메시지는 엔진마다 다르다. 본문 + 테스트로 검증한다(사용자 결정과 일치).

## 4. 변경 파일
- 추가 `app/concepts/property-keys/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 7개: `same-key.js`, `dot-vs-bracket.js`, `add-delete.js`, `computed-key.js`, `number-key.js`, `non-string-key.js`, `dot-syntax.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `PropertyView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정:
  - `tests/e2e/navigation.spec.ts:17`, `:32`: `toHaveCount(1)` → `toHaveCount(2)`(사용자 결정). 첫 카드·클릭 검사는 그대로.
  - `tests/e2e/helpers.ts`: `PROPERTY_KEYS_PATH`, `PROPERTY_KEYS_SIMULATOR_NAME` 추가
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(라이트·다크 describe 안) 추가
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행 추가
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록(파일 끝 switch 블록 뒤) 추가
  - `docs/content-guide.md` 9단계: e2e 대상 개념 목록에 `property-keys` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch1-12.md`: 6번 계획 문서·상태 갱신, 진행 기록 한 줄
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, 기존 개념 폴더 8개, `package.json`(의존성 없음), `AGENTS.md`.

## 5. 위험 요소
- 시나리오의 객체 상태·키·결과·출력을 잘못 적음 → 틀린 그림 → 2단계 실행 대조·재평가 테스트 + 음성 확인 4가지.
- "숫자 키는 숫자로 저장된다", "객체에 정수 키와 문자열 키가 따로 있다"는 오해를 강화 → 객체 카드의 키는 항상 따옴표 문자열, 접근 패널은 "프로퍼티 키 "1"(문자열)"로 통일(3·5단계).
- 없는 프로퍼티 `undefined` 설명이 프로토타입을 무시함 → `simplifications`에 OrdinaryGet의 프로토타입 탐색을 밝히고, 테스트가 예제에서 없는 키로 읽는 키가 `Object.prototype`에도 없음을 검사한다(`toString` 같은 키로 "없으면 undefined"를 보이면 틀린다).
- 결과의 원인을 "복사"·"공유"로 설명 → 단계 설명은 "추가한다", "값을 바꾼다", "지운다"(명세의 생성·변경·삭제)로 쓴다.
- 객체 카드 키 순서가 실제와 다름 → 실행 대조 테스트가 `Object.keys` 순서와 비교한다. 순서 규칙 자체는 `simplifications`.
- `dot-syntax.js`의 `price`가 호스트 전역과 겹침 → vm에는 `console`만 있다. 브라우저 전역 이름(`name` 등)과 겹치지 않는 이름(`product`, `price`)을 골랐다.
- 미학습 개념(프로토타입, 심벌, `try...catch`, 스코프) 서술 → 본문은 "별도 개념"으로만 언급하고 `simplifications`에 적는다.
- Callout 안 인라인 코드 공백 깨짐, CommonMark 굵게 함정(`obj['1']`처럼 따옴표·대괄호가 많다) → content-guide 4단계 방식(`<code>{"…"}</code>`), 빌드 후 grep 검사(5단계 완료 조건).
- 기존 e2e 수정 → 바꾸는 것은 기대 개수 2곳뿐. 첫 카드 텍스트·클릭 대상 검사는 그대로 두어 정렬 회귀를 계속 잡는다.
- 375px에서 접근 패널 문장·`[object Object]` 같은 긴 키가 넘침 → `flex-wrap`·`break-words [overflow-wrap:anywhere]`, e2e 가로 스크롤 검사.
- 공통 셸 미수정이므로 기존 시뮬레이터 회귀는 없어야 한다 → 전체 검증 순서로 확인.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 7개 실제 출력 = `expectedOutput`, 본문 주장 검증(SyntaxError·TypeError·`Object.prototype` 키), 시나리오 실행 대조·키 재평가·결과 종류 검사, 음성 확인(2단계 4가지).
- 브라우저(빌드 결과 `serve` 또는 dev 서버 재시작 후 `/concepts/property-keys`):
  1. 첫 화면: "검토 중" 배지, 학습 목표, 선행 개념 중 `primitives-and-objects`·`type-coercion` 링크, 퀴즈가 라디오 UI.
  2. `숫자 키와 문자열 키`: 3단계 접근 패널 `scores[1]`·대괄호 안의 값 `1`(숫자)·프로퍼티 키 `"1"`·결과 `추가`, 객체 카드 `"1": "금"`. 6단계 `scores[2]` → 키 `"2"` 읽음 `"은"`. 7단계 갱신 후 카드 `"1": "동"`. 콘솔 `금`/`은`/`동`/`{"1":"동","2":"은"}`.
  3. `점 표기와 대괄호 표기`: 4단계 `user.name` 점 표기·키 `"name"`, 6단계 `user[key]` 대괄호 안의 값 `"name"`(변수 `key`의 값), 7단계 `user.key` 키 `"key"` → `"열쇠"`.
  4. `추가·갱신·삭제`: 3단계 `box.b` 없음 → `undefined`, 4단계 추가(`새로 생김`), 5단계 갱신(`값이 바뀜`), 7단계 `delete box.a` 후 카드에서 `"a"`가 사라지고 결과 `true`, 9단계 `delete box.c` 없음·결과 `true`. 콘솔 6줄.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: 카드 9개(새 개념 일곱 번째), `객체` 검색 2건(첫 카드 `원시 값과 객체`), `프로퍼티` 검색 1건.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제·meta·본문 주장 검증
- 대상: `examples/*.js` 7개, `meta.ts`, `route.tsx`, `concept.test.ts`(본문 주장 검증 부분)
- 현재: 없음
- 변경:
  - 예제 원문(이 그대로, 파일 끝 줄바꿈 하나):
    - `same-key.js`
      ```js
      const scores = {};
      scores[1] = '금';
      scores['2'] = '은';
      console.log(scores['1']);
      console.log(scores[2]);
      scores['1'] = '동';
      console.log(scores[1]);
      console.log(JSON.stringify(scores));
      ```
    - `dot-vs-bracket.js`
      ```js
      const user = { name: '민지', key: '열쇠' };
      const key = 'name';
      console.log(user.name);
      console.log(user['name']);
      console.log(user[key]);
      console.log(user.key);
      ```
    - `add-delete.js`
      ```js
      const box = { a: 1 };
      console.log(box.b);
      box.b = 2;
      box.a = 10;
      console.log(JSON.stringify(box));
      console.log(delete box.a);
      console.log(box.a);
      console.log(delete box.c);
      console.log(JSON.stringify(box));
      ```
    - `computed-key.js`
      ```js
      const field = 'color';
      const n = 2;
      const a = { field: '빨강' };
      const b = { [field]: '빨강', ['size' + n]: 'M' };
      console.log(JSON.stringify(a));
      console.log(JSON.stringify(b));
      ```
    - `number-key.js`
      ```js
      const t = { 1: '하나', 1e3: '천' };
      console.log(t[1.0], t['1000']);
      console.log(t['01'], t['1.0']);
      t[0.1 + 0.2] = '근삿값';
      console.log(JSON.stringify(t));
      ```
    - `non-string-key.js`
      ```js
      const m = {};
      m[true] = '참';
      m[null] = '없음';
      m[{}] = '빈 객체';
      console.log(m['true'], m['null']);
      console.log(m['[object Object]']);
      console.log(m[{ a: 1 }]);
      console.log(JSON.stringify(m));
      ```
    - `dot-syntax.js`
      ```js
      const product = { 'unit-price': 1000, class: 'A' };
      const price = 3;
      console.log(product['unit-price']);
      console.log(product.unit-price);
      console.log(product.class);
      ```
  - `meta.ts`:
    - `slug: 'property-keys'`, `title: "프로퍼티 키: obj[1]과 obj['1']은 왜 같은 프로퍼티인가"`, `category: 'fundamentals'`
    - `summary`: `"대괄호 안의 값은 문자열로 바뀌어 프로퍼티 키가 되므로 obj[1]과 obj['1']은 같은 프로퍼티입니다. 점 표기와 대괄호 표기의 차이, 없는 프로퍼티를 읽을 때의 결과, 객체에 프로퍼티를 추가·삭제하는 과정을 단계별로 따라갑니다."`(131자)
    - `tags`: `['객체', '프로퍼티', '프로퍼티 키', '점 표기법', '대괄호 표기법', '계산된 프로퍼티 이름', 'delete', '객체 리터럴']`
    - `goals`(4개): 대괄호 안의 값이 문자열로 바뀌어 키가 된다는 것으로 숫자·불리언·`null`·객체를 키로 쓴 결과를 예측할 수 있다 / 점 표기는 이름을 그대로 키로 쓰고 대괄호 표기는 식의 값을 키로 쓴다는 차이로 `obj.key`와 `obj[key]`를 구분할 수 있다 / 없는 프로퍼티를 읽을 때(`undefined`)와 `undefined`의 프로퍼티를 읽을 때(TypeError)를 구분할 수 있다 / 대입이 프로퍼티를 추가하거나 값을 바꾸고 `delete`가 프로퍼티를 지운다는 것(없는 키도 `true`)을 설명할 수 있다.
    - `prerequisites`: `{ label: '객체 리터럴' }`, `{ label: '원시 값과 객체', slug: 'primitives-and-objects' }`, `{ label: '암묵적 타입 변환', slug: 'type-coercion' }`
    - `related`: `['short-circuit-evaluation', 'number-type']`
    - `examples`: 7개, `expectedOutput`은 2절 표(처음엔 `[]`로 두고 `npm test` 실제 출력으로 채운 뒤 표와 같은지 확인)
    - `simplifications`(7개):
      1. 프로퍼티 키는 문자열 또는 심벌입니다. 심벌은 문자열로 바뀌지 않고 그대로 키가 되며, 이 페이지는 문자열 키만 다룹니다(심벌은 별도 개념).
      2. 객체에 없는 프로퍼티를 읽으면 명세는 그 객체의 프로토타입에서 이어서 찾고, 끝까지 없을 때 `undefined`를 돌려줍니다. 대입도 프로토타입을 확인한 뒤 프로퍼티를 추가합니다. 이 페이지의 예제는 프로토타입에도 없는 키만 쓰며, 프로토타입은 별도 개념에서 다룹니다.
      3. 시뮬레이터는 대괄호 안의 값을 키로 바꾸는 과정을 한 번에 보여 줍니다. 명세는 `obj[k] = v`에서 오른쪽 `v`를 평가한 뒤에 키로 바꿉니다.
      4. 객체가 키로 쓰일 때 문자열 `"[object Object]"`가 되는 과정(ToPrimitive가 객체의 메서드를 호출)은 결과만 보여 줍니다(암묵적 타입 변환 페이지와 같은 범위).
      5. 프로퍼티 어트리뷰트(쓰기·삭제 가능 여부 등)와 접근자 프로퍼티는 다루지 않습니다. 그래서 `delete`가 `false`를 돌려주거나 strict mode에서 TypeError가 나는 경우도 다루지 않습니다.
      6. 객체 카드의 프로퍼티 순서는 실제 나열 순서(`Object.keys`)와 같습니다. 정수 형태 키가 먼저 나열되는 순서 규칙은 다루지 않으며, 예제는 생성 순서와 나열 순서가 같게 작성했습니다.
      7. ‘객체 A’는 같은 객체인지 구분하기 위한 교육용 이름이며 메모리 주소가 아닙니다. 변수는 선언문이 실행된 뒤에만 표시합니다(호이스팅·TDZ는 별도 개념).
    - `references`: 명세 `sec-object-type`, `sec-property-accessors`, `sec-topropertykey`, `sec-object-initializer`, `sec-ordinaryget`, `sec-ordinarysetwithowndescriptor`, `sec-delete-operator`; MDN(ko) 4개(2절). 다른 개념처럼 전체 URL 문자열로 쓴다(상수 금지).
    - `reviewedAt: null`
  - `route.tsx`: switch-break-continue와 같은 템플릿.
  - `concept.test.ts` "본문 주장 검증": ① `new vm.Script('const o = {}; o.1;')` SyntaxError ② `o.missing.x`·`o.v.x`(`v: null`) 실행 시 `e.name === 'TypeError'`, `o.missing`은 오류 없음 ③ 예제에서 없는 키로 읽는 `['b', 'c', 'a', '01', '1.0']`이 모두 `!(k in Object.prototype)` ④ `dot-syntax`의 `product.unit-price`가 `product.unit - price`와 같은 값(`NaN`)임은 예제 출력으로 확인됨(추가 검사 없음).
- 이유: 모든 출력·서술의 근거를 먼저 고정한다(정확성 원칙).
- 주의사항: `examples/`는 Prettier·ESLint 대상이 아니다(줄 번호 고정). 예제 문장·코드는 직접 작성한 것이다(도서 예제 아님). meta의 다른 필드에 `객체`가 들어가도 된다(사용자 결정).
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/property-keys` 통과, 예제 7개 실제 출력 = 2절 표, `npm run lint`·`npm run typecheck` 0. summary ≤ 160자.

### 2. 상태 모델·시나리오·실행 대조 테스트
- 대상: `scenarios.ts`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태 타입:
    ```ts
    export type Val = {
      type: 'number' | 'string' | 'boolean' | 'undefined'
      display: string // string은 따옴표 없는 내용, 화면에서 큰따옴표를 붙인다
    }
    export type ObjectRef = { kind: 'object'; id: string }
    export type Binding = { name: string; declaredWith: 'const'; value: Val | ObjectRef; changed?: boolean }
    export type Prop = { key: string; value: Val; changed?: boolean }
    export type ObjectBox = { id: string; label: string; props: Prop[]; changed?: boolean }
    export type Access = {
      code: string // 접근 식 원문(예: 'scores[1]', 'delete box.a'가 아니라 'box.a')
      notation: 'dot' | 'bracket'
      keyExpr: string // bracket: 대괄호 안 식 원문, dot: 점 뒤 이름
      keyValue?: Val // bracket만: 대괄호 안 식의 값
      key: string // 프로퍼티 키(문자열)
      op: 'get' | 'set' | 'delete'
      result: 'found' | 'missing' | 'created' | 'updated' | 'deleted' | 'delete-missing'
      value: Val // get: 읽은 값, set: 넣은 값, delete: delete 식의 값(true)
    }
    export type PropertyState = { bindings: Binding[]; objects: ObjectBox[]; access: Access | null }
    ```
    `Binding`과 값에 `ObjectRef`를 쓰는 이유: 변수 `scores`의 값이 객체 A라는 것을 primitives-and-objects와 같은 방식(`→ 객체 A`)으로 보이기 위해서다. 시나리오 예제의 변수는 모두 `const`다.
  - 시나리오 3개(라벨 / 단계):
    - `same-key` "숫자 키와 문자열 키" — 9단계: 실행 전 / 1줄 빈 객체 A, `scores` / 2줄 `scores[1]` set created `"금"` / 3줄 `scores['2']` set created / 4줄 get found `"금"` / 5줄 `scores[2]` 대괄호 안 값 숫자 2 → `"2"` found / 6줄 `scores['1']` set updated `"동"` / 7줄 `scores[1]` found `"동"` / 8줄 JSON 출력(access null, 설명: `JSON.stringify` 결과의 키가 따옴표 문자열).
    - `dot-vs-bracket` "점 표기와 대괄호 표기" — 7단계: 실행 전 / 1줄 객체 A `name`·`key` (access null, 설명: 리터럴의 이름이 그대로 키) / 2줄 변수 `key = "name"` / 3줄 `user.name` dot / 4줄 `user['name']` bracket 값 문자열 `"name"` / 5줄 `user[key]` bracket 값 `"name"`(변수 `key`의 값) / 6줄 `user.key` dot 키 `"key"` → `"열쇠"`.
    - `add-delete` "추가·갱신·삭제" — 10단계: 실행 전 / 1줄 객체 A `a: 1` / 2줄 `box.b` missing `undefined` / 3줄 created / 4줄 `box.a` updated 10 / 5줄 JSON / 6줄 `box.a` delete deleted 값 true(`"a"` 사라짐) / 7줄 `box.a` missing / 8줄 `box.c` delete-missing true / 9줄 JSON.
    - `changed`는 그 단계에서 새로 생기거나 값이 바뀐 항목에만 붙인다(다음 단계에서 해제). 단계 설명 문장은 "추가한다 / 값을 바꾼다 / 지운다 / 없어서 undefined"로 쓰고 "복사·공유"를 쓰지 않는다.
  - `concept.test.ts`:
    - 시나리오마다 `assertScenarioInvariants`.
    - **실행 대조**: `line`이 있는 단계마다 예제 원문의 1..`line.to` 줄 + 스냅샷 코드(상태의 바인딩 이름마다 `typeof`, 원시 값이면 `String(v)`, 객체면 `Object.keys(v)`와 각 값의 `typeof`·`String`)를 `runInNewContext`로 실행해(`console`·출력 수집은 `run-example.ts`와 같은 `util.format`) ① 바인딩 이름·순서·값 ② 객체 카드의 키 순서·값·타입 ③ 그 단계 `output`이 실제 출력과 같음을 검사한다. 같은 객체를 가리키는 바인딩은 같은 `ObjectRef.id`여야 한다. `line`이 없는 첫 단계는 빈 상태·빈 출력.
    - **키 재평가**: `access`가 있는 단계마다 ① `access.code`가 강조 줄 원문에 있다 ② dot이면 `code`가 `.${keyExpr}`로 끝나고 `key === keyExpr`, `keyValue` 없음 ③ bracket이면 `code`가 `[${keyExpr}]`로 끝나고, 1..`line.from - 1` 줄을 실행한 컨텍스트에서 `(${keyExpr})`를 평가한 값의 `typeof`·`String`이 `keyValue`와 같고 `String(값) === key`.
    - **결과 종류**: 이전·현재 단계의 대상 객체(코드 앞부분 변수의 `ObjectRef`)에서 키 존재 여부 `had`/`has`로 found(`had && has`, `value` = 그 값), missing(`!had && !has`, `value` undefined), created(`!had && has`), updated(`had && has`, 값이 바뀜), deleted(`had && !has`, `value` true), delete-missing(`!had && !has`, `value` true). `op` ↔ `result` 짝(get: found·missing, set: created·updated, delete: deleted·delete-missing). set이면 현재 프로퍼티 값 = `access.value`.
    - **changed 계산**: 이전 단계와 비교해 새로 생기거나 값이 바뀐 바인딩·프로퍼티·객체에만 `changed`.
    - **음성 확인(구현 중 한 번씩, 커밋하지 않음)**: ① `same-key` 5단계 `keyValue`를 문자열 `"2"`로 → 키 재평가 실패 ② `add-delete` 7단계 상태에 `"a"`를 남김 → 실행 대조 실패 ③ `dot-vs-bracket` 7단계 `key`를 `"name"`으로 → 키 검사 실패 ④ `add-delete` 9단계 result를 `deleted`로 → 결과 종류 실패. 각각 실패를 확인하고 원복한다.
- 이유: 단계 상태를 손으로 쓰지만 근거는 실제 실행으로 고정한다(정확성 원칙, switch에서 쓴 대조 방식).
- 주의사항: 시나리오 예제 3개는 한 줄에 문장 하나다(줄 단위로 잘라 실행 가능). 스냅샷 코드는 `__snap = …`(sloppy 전역 대입)으로 sandbox에서 읽는다. 상태 참조 무결성(`ObjectRef.id`가 `objects`에 있음)도 검사한다.
- 완료 조건: `npx vitest run app/concepts/property-keys` 통과, 단계 수 9/7/10, 음성 확인 ①~④ 각각 실패 확인 후 원복, lint·typecheck 0.

### 3. 시각화 컴포넌트 PropertyView
- 대상: `PropertyView.tsx`, `PropertyView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `PropertyState`를 그린다.
  - "프로퍼티 접근" 영역(`section` + `useId` `aria-labelledby`): `access`가 없으면 "이 단계에는 프로퍼티 접근이 없습니다." 있으면 `code`(`font-mono`) + 표기 배지(`점 표기`/`대괄호 표기`) + 줄 목록:
    - bracket: `대괄호 안의 값` — `1` + 타입 배지(`숫자`/`문자열`/`불리언`) → `프로퍼티 키` — `"1"` + 배지 `문자열`
    - dot: `점 뒤의 이름` → `프로퍼티 키` — `"name"` + 배지 `문자열`
    - 결과 배지 + 문장: found `읽음` — `키 "1"이 있어 값 "금"을 읽음` / missing `없음` — `키 "b"가 없어 undefined` / created `추가` — `키 "b"가 없어 프로퍼티를 추가하고 2를 넣음` / updated `갱신` — `키 "a"가 있어 값을 10으로 바꿈` / deleted `삭제` — `키 "a" 프로퍼티를 지움, delete의 값 true` / delete-missing `삭제할 것 없음` — `키 "c"가 없어 지울 것이 없음, delete의 값 true`
  - "변수" 영역: `const` 배지 + 이름 + 값(원시 값은 문자열이면 큰따옴표, 객체면 `→ 객체 A` 칩) + `새로 생김`/`값이 바뀜` 배지.
  - "객체" 영역: 객체 카드(라벨 + 프로퍼티 목록 `"key": 값`, 키는 항상 큰따옴표). `changed` 프로퍼티는 `새로 생김`/`값이 바뀜` 배지 + `bg-highlight`. 접근 결과가 found인 키는 `읽음` 배지. 프로퍼티가 없으면 "프로퍼티 없음". 객체가 없으면 "아직 이 코드가 만든 객체가 없습니다."
  - 첫 단계(빈 상태)는 "이 단계에는 프로퍼티 접근이 없습니다." + "아직 표시할 변수가 없습니다."
  - 클래스 문자열(배지, `bg-highlight`, `motion-safe:` 전환, 줄바꿈)은 `primitives-and-objects/MemoryView.tsx`·`increment-decrement/EvaluationView.tsx`와 같게 쓴다(import하지 않음). 새로 생김/값이 바뀜 구분은 `prevState` 대신 `changed` + 이전 단계 존재 여부가 필요하므로 `renderState(state, prevState)`의 `prevState`를 받는다(MemoryView와 같은 방식).
- 이유: 상태 모양이 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더 첫 단계가 JS 없이 의미 있게 보여야 한다. 색만으로 구분하지 않는다(배지 텍스트). 375px에서 `[object Object]` 같은 긴 키·문장이 넘치지 않게 `flex-wrap`·`break-words [overflow-wrap:anywhere]`.
- 완료 조건: `PropertyView.test.tsx` 통과 — 빈 상태 문구 2개, `same-key` 3단계에서 `대괄호 표기`·`1`·`숫자`·`"1"`·`추가`·카드 `"1"`·`새로 생김`, `dot-vs-bracket` 7단계에서 `점 표기`·`"key"`·`읽음`, `add-delete` 7단계에서 `삭제`·카드에 `"a"` 없음, 변수 `→ 객체 A` 칩.

### 4. Simulator 래퍼
- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: switch-break-continue `Simulator.tsx`와 같은 모양. `label="프로퍼티 키 시뮬레이터"`, `renderState={(state, prevState) => <PropertyView state={state} prevState={prevState} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `숫자 키와 문자열 키` "실행 전", 다음 클릭 시 1번 줄 강조(`aria-current="step"`), 시나리오 전환 시 0단계로 돌아감(switch `Simulator.test.tsx`와 같은 범위).

### 5. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `Simulator`, `scenarios` import)
- 변경:
  - `## 동작 원리`
    - 객체는 프로퍼티의 모음이고 각 프로퍼티는 키로 구분된다. 키는 문자열이다(심벌은 별도 개념, 한 줄).
    - 점 표기 `obj.name`: 점 뒤의 이름이 그대로 키(`"name"`). 그래서 이름 규칙(식별자 이름)에 맞아야 하고, 예약어는 쓸 수 있다(`product.class`). `obj.1`은 실행 전에 SyntaxError, `product.unit-price`는 `product.unit - price`로 해석된다.
    - 대괄호 표기 `obj[식]`: 식을 평가한 값을 문자열로 바꿔 키로 쓴다(명세 ToPropertyKey). 숫자 1 → `"1"`, `1.0`도 `"1"`, `true` → `"true"`, `null` → `"null"`, 객체 → `"[object Object]"`([암묵적 타입 변환](/concepts/type-coercion) 링크). `'01'`은 이미 문자열이라 그대로 `"01"`. `0.1 + 0.2`는 `"0.30000000000000004"`([숫자 타입](/concepts/number-type) 링크).
    - 객체 리터럴의 키도 같은 규칙: 이름·문자열은 그대로, 숫자는 문자열로(`1e3` → `"1000"`), `[식]`(계산된 프로퍼티 이름)은 식의 값을 문자열로.
    - 읽기: 키가 있으면 그 값, 없으면 `undefined`(오류 아님). 단, 왼쪽 값이 `undefined`나 `null`이면 TypeError — `obj.missing.x`. `?.`로 피할 수 있다([단축 평가](/concepts/short-circuit-evaluation) 링크).
    - 대입: 키가 없으면 프로퍼티를 추가하고, 있으면 값을 바꾼다. `delete`: 프로퍼티를 지우고 `true`, 없는 키도 `true`(그래서 `true`가 "있었다"는 뜻이 아니다).
  - `## 예제`: 예제 7개를 `file=` 코드 펜스로. `PredictQuiz` 7개(예제마다 1개, 선택지 3~4개, 여러 줄 출력이면 질문에 ' / ' 구분 안내, 정답은 실제 출력). 시나리오 예제 3개 뒤에 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`.
  - `## 결과와 이유`: JSX `<table>`(예제 / 출력 / 이유), 예제별 이유 문단, `Callout type="misconception"` 5개: ① "`obj[1]`과 `obj['1']`은 다른 프로퍼티다"(`same-key`) ② "`obj.key`는 변수 `key`의 값을 키로 쓴다"(`dot-vs-bracket`) ③ "없는 프로퍼티를 읽으면 오류가 난다"(`add-delete`, `undefined`의 프로퍼티는 TypeError라는 구분 포함) ④ "`delete`가 `true`면 프로퍼티가 있었다"(`add-delete`) ⑤ "객체를 키로 쓰면 객체마다 다른 키가 된다"(`non-string-key`).
- 주의사항: 미학습 개념(프로토타입, 심벌, `in`, 스코프)을 설명하지 않는다. 같은 대상은 같은 이름으로 부른다("프로퍼티 키", "점 표기", "대괄호 표기", "추가·값을 바꾼다·지운다"). 특정 스타일 권고("대괄호 표기는 피해야 한다" 등)는 쓰지 않는다. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/property-keys/index.html`에 `<details` 7개 이상, 시뮬레이터 0단계 텍스트, 라디오 3개 이상, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 남은 `**` 0건.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인
- 대상: `tests/e2e/navigation.spec.ts`, `helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch1-12.md`
- 변경:
  - `navigation.spec.ts:17`, `:32`의 `toHaveCount(1)` → `toHaveCount(2)`(다른 줄은 그대로).
  - switch 케이스를 본떠 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y 시뮬레이터 케이스는 시나리오 라벨 3개(`숫자 키와 문자열 키`, `점 표기와 대괄호 표기`, `추가·갱신·삭제`)의 모든 단계(합계 26단계, `test.slow()`는 switch와 같이 둔다).
  - 빌드 블록(주석 "아홉 번째 개념(property-keys)"): `단계 1: 실행 전`, `이 단계에는 프로퍼티 접근이 없습니다.`, `아직 표시할 변수가 없습니다.`, region `aria-label="프로퍼티 키 시뮬레이터"`, 시나리오 라벨 3개, `<details` 7개 이상.
  - content-guide 9단계 e2e 대상 목록에 `property-keys` 추가. 로드맵 6번 행의 계획 문서(`property-keys.md`)·상태를 갱신하고 진행 기록 한 줄을 추가한다.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~6을 확인하고 스크린샷 1장 이상.

## 9. 추가 개선 후보
- `short-circuit-evaluation/meta.ts:34`의 선행 개념 `{ label: '객체 리터럴과 프로퍼티 접근' }`에 `slug: 'property-keys'` 연결(기존 개념 파일 수정이라 사용자 확인 필요).
- 기존 개념 `related`에 `property-keys` 역방향 연결(`primitives-and-objects`, `type-coercion`).
- 정수 형태 키의 나열 순서(OrdinaryOwnPropertyKeys)와 `in` 연산자는 프로토타입·배열 진도 이후 별도 개념 후보.

## 구현 진행

- baseline (2026-10-27, `3c5b1f2`): lint·format:check·typecheck 오류 0, `npm test` 810 통과, `test:build` 70 통과, e2e 127 통과·3 건너뜀(기존 의도된 3건). 사용자 dev 서버가 5173에서 실행 중(건드리지 않고 빌드 결과 `serve`로 확인)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 150 통과, lint·typecheck·prettier 0. 예제 7개가 계획 원문(scratchpad 초안)과 바이트 동일, 실제 출력 = 2절 표. summary 131자, meta 필드가 계획과 일치
- [x] 2. 상태 모델·시나리오·실행 대조 테스트 — 메인 재실행: vitest(개념·examples·content-integrity) 179 통과, lint·typecheck·prettier 0. 단계 수 9/7/10. 음성 확인 ①~④는 서브에이전트 보고(각 1~3건 실패, `cmp`로 원복 확인). 메인이 단계 설명 전부를 검토: `same-key` 8단계 설명이 "JSON은 항상 따옴표로 쓴다"와 "키가 문자열이라 이렇게 보인다"를 함께 써 따옴표를 근거처럼 읽히던 것을 "숫자와 문자열을 섞어 대입·읽었지만 키는 "1"·"2"뿐이라 프로퍼티는 두 개"로 고침. 계획 외 보강 검사(`declaredWith`·객체를 가리키는 변수 존재·줄 번호 1씩 증가·접근 줄 모양↔op) 수용
- [x] 3. PropertyView — 메인 재실행: vitest(개념) 46 통과, lint·typecheck·prettier 0. 코드 확인: 배지·`bg-highlight`·`fade` 클래스가 MemoryView와 같음(import 없음), `useId`만 사용(하이드레이션 영향 값 없음), 화살표 SVG 없음, `flex-wrap`·`overflow-wrap:anywhere`. 계획과 다른 점: ① 결과 문장을 조사(이/가)가 키에 따라 틀리지 않게 `키 "1" 프로퍼티가 있어 읽은 값: "금"` 형태로 씀(수용) ② 메인 수정: 섹션 제목 `h4`를 기존 FlowView·EvaluationView와 같은 `<p id>`로 바꿈(시뮬레이터 안에 문서 헤딩을 만들지 않음)
- [x] 4. Simulator 래퍼 — switch 래퍼와 같은 모양(label·View·타입만 다름). Simulator.test 포함 통과
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·vm 근거와 대조: 예제 7 이유의 "숫자로 바꿀 수 없는 값이 있어 NaN"을 "`undefined`를 숫자로 바꾸면 `NaN`이므로 결과도 `NaN`"으로 고침(vm 확인 `Number(undefined)` → NaN). 그 밖의 서술(점 표기 IdentifierName·예약어·`obj.1` SyntaxError, ToPropertyKey 예시, 리터럴 키 규칙, TypeError, delete true)은 2절 근거와 일치. 퀴즈 7개 정답 = expectedOutput. 메인 재실행: `npm test` 873 통과, lint·prettier 0, build 성공, HTML `<details` 7·라디오 3(시나리오 선택)·0단계 문구·region aria-label 있음·공백 깨진 code 0·`**` 0
- [x] 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인 — 기존 파일의 삭제 줄은 `navigation.spec.ts` 기대 개수 2곳, content-guide 9단계 목록 문구, 로드맵 6번 행, `build-output.test.ts`의 `escapeHtml`뿐. 계획과 다른 점: 새 제목이 처음으로 작은따옴표(`obj['1']`)를 포함해 `test:build`의 제목 검사 2건이 실패 → 서브에이전트가 테스트 헬퍼 `escapeHtml`에 `'` → `&#x27;`를 추가(React가 실제로 `&#x27;`로 출력함을 빌드 HTML에서 확인, 수용). 메인 수정: 로드맵 계획 문서 칸을 다른 행처럼 백틱으로. 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 873(baseline 810), `test:build` 77(baseline 70), e2e 139 통과·3 건너뜀(baseline 127·3). 브라우저(빌드 결과를 `serve` 4175로 띄워 Playwright, 사용자 dev 서버 5173은 건드리지 않음): 1280px 다크·375px 라이트에서 세 시나리오 단계 수 9/7/10, `same-key` 3단계 `scores[1]`·대괄호 안의 값 1 숫자·키 "1"·추가·카드 `"1": "금"` 새로 생김, 6단계 `scores[2]` → "2" 읽음, 9단계 카드 `"1": "동"`·`"2": "은"`, `dot-vs-bracket` 6단계 `user[key]` 대괄호 안의 값 "name", 7단계 `user.key` 점 표기·키 "key"·읽음 "열쇠", `add-delete` 3단계 없음·undefined, 7단계 삭제·카드에 "b"만, 9단계 삭제할 것 없음·true. 전 단계 가로 넘침 0(두 폭 모두), 키보드 →×3/←/Home = 단계 4/3/1, "검토 중" 배지, 콘솔 에러 0. 홈 카드 9개(새 개념 일곱 번째), `객체` 검색 2건(첫 카드 원시 값과 객체), `프로퍼티` 검색 1건. 스크린샷 2장(scratchpad)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff가 개념 폴더 1개 + 테스트 추가라 sub agent 생략): Critical/High 0. Low 3(보고만): ① `PropertyView.tsx:88` 대괄호 표기인데 `keyValue`가 없으면 "점 뒤의 이름"으로 그려지는 분기(테스트가 대괄호 표기에 `keyValue`를 강제해 실제로는 도달하지 않음) ② `content.mdx:13` `obj.1`이 SyntaxError인 이유를 "숫자로 시작하는 이름은 식별자 이름이 아니라서"로만 설명(실제로는 `.1`이 숫자 리터럴로 읽혀 식이 이어지지 않음, 결론은 같음) ③ `delete` 단계의 접근 패널 코드가 `delete box.a`가 아니라 `box.a`(계획대로, 결과 배지 `삭제`로 구분)

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 새 제목의 작은따옴표 때문에 `test:build` 제목 검사가 실패해 테스트 헬퍼 `escapeHtml`에 `'` → `&#x27;`를 추가했다(구현 진행 6) ② 시뮬레이터 결과 문장을 조사가 키에 따라 틀리지 않는 형태로 바꿨다(구현 진행 3) ③ 섹션 제목을 기존 시각화와 같은 `<p id>`로 바꿨다(구현 진행 3) ④ 메인 검토에서 `same-key` 마지막 단계 설명과 예제 7의 `NaN` 이유 문장을 고쳤다(구현 진행 2·5) ⑤ 서브에이전트의 계획 외 보강 검사를 수용했다(구현 진행 2).
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. Low 3건(`PropertyView.tsx:88`의 도달하지 않는 분기, `content.mdx:13`의 `obj.1` 이유 설명, `delete` 단계 접근 패널 코드 표기)은 보고만 했고, 사용자가 고치지 않은 상태로 승인했다.

### 후속 작업
- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록(4·5번은 2026-10-27 검토 승인 완료)
- [ ] 리뷰 Low 3건 정리 여부(선택)
- [ ] 9절 추가 개선 후보(`short-circuit-evaluation` 선행 개념 slug 연결, 역방향 `related`)
- [ ] 로드맵 7번 "함수 호출: 매개변수와 반환" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 테스트 헬퍼 `escapeHtml`에 작은따옴표 이스케이프(`&#x27;`)를 추가했다 — 새 제목 `obj['1']`이 사이트 첫 작은따옴표였고 React가 HTML에 `&#x27;`로 출력해 기존 제목 검사가 실패했다. 제목을 바꾸는 대안 대신 헬퍼를 실제 출력에 맞췄다(`tests/build/build-output.test.ts:12-18`).
- [Claude 판단] 시뮬레이터 결과 문장을 `키 "1" 프로퍼티가 있어 읽은 값: "금"` 형태로 바꿨다 — 계획의 `키 "1"이 있어`는 키 문자에 따라 조사(이/가)가 틀린다. 조사가 "프로퍼티가"에 붙도록 고정했다(`PropertyView.tsx` `resultText`).
- [무검토 승인] 시뮬레이터 상태를 손으로 쓰되, 단계마다 예제를 그 줄까지 vm으로 실제 실행해 변수·객체(`Object.keys` 순서)·출력과 대조하고 대괄호 안 식을 다시 평가했다 — 그래서 시나리오 예제는 한 줄에 문장 하나로 썼다(`concept.test.ts` `runUntil`·`evalKeyExpr`, 계획 3절).
- [무검토 승인] 없는 프로퍼티를 읽으면 `undefined`라는 설명은 프로토타입 탐색(OrdinaryGet)을 생략한 단순화라, `simplifications` 2에 밝히고 예제의 없는 키가 `Object.prototype`에도 없음을 테스트로 고정했다(`concept.test.ts` 본문 주장 검증).
- [무검토 승인] `undefined`의 프로퍼티 접근 TypeError를 예제가 아니라 본문 + 테스트로 다뤘다 — 예제로 보이려면 미학습인 `try...catch`(47장)가 필요하고 오류 메시지는 엔진마다 다르다(계획 3절 버린 대안 ⑤).
- [무검토 승인] 객체 카드의 키를 항상 큰따옴표 문자열로 그리고 접근 패널에 "대괄호 안의 값 1(숫자) → 프로퍼티 키 "1"(문자열)"을 보였다 — 숫자 키가 따로 있다는 오해를 한 줄로 보이기 위해서다(계획 3절).
- 추가 항목 4개(계산된 이름, 숫자 키 정규화, 불리언·null·객체 키, undefined의 프로퍼티 접근)와 `객체` 검색 e2e 기대 개수 1 → 2는 사용자가 골랐다.

#### 배경지식
- 점 표기 `a.b`의 키는 IdentifierName의 StringValue(13.3.4), 대괄호 표기 `a[b]`는 식의 값을 ToPropertyKey(ToPrimitive → 심벌이 아니면 ToString)로 바꾼 것(7.1.21). 객체 리터럴의 숫자 키는 `ToString(NumericValue)`, 계산된 이름은 ToPropertyKey(13.2.5.5).
- GetValue는 프로퍼티 참조의 base에 ToObject를 적용하므로 base가 `undefined`·`null`이면 TypeError(6.2.5.5). 없는 자기 프로퍼티는 프로토타입에서 찾고 끝까지 없으면 `undefined`(10.1.8.1).
- OrdinaryDelete는 프로퍼티가 없으면 `true`, configurable이면 지우고 `true`(10.1.10.1). 키 나열 순서는 배열 인덱스 키 오름차순 → 나머지 문자열 키 생성 순(10.1.11.1).

#### 확인 질문
1. `t[1.0]`은 `"하나"`인데 `t['1.0']`은 왜 `undefined`인가?
   <details><summary>답</summary>`1.0`은 숫자 리터럴이라 값이 숫자 1이고 ToString으로 `"1"`이 된다. `'1.0'`은 이미 문자열이라 ToPropertyKey가 그대로 `"1.0"`을 키로 쓰며 그런 프로퍼티는 없다(명세 7.1.21, 예제 `number-key.js`).</details>
2. "없는 프로퍼티는 `undefined`"를 `obj.toString`으로 보여 주면 왜 틀리나? 이 페이지는 그 위험을 어떻게 막았나?
   <details><summary>답</summary>OrdinaryGet은 자기 프로퍼티가 없으면 프로토타입에서 찾으므로 `toString`은 `Object.prototype`의 함수를 돌려준다. 예제의 없는 키(`b`, `c`, `a`(삭제 후), `01`, `1.0`)가 `Object.prototype`에도 없음을 테스트가 검사하고, `simplifications` 2에 프로토타입 탐색을 밝혔다(`concept.test.ts` 본문 주장 검증).</details>
3. 시뮬레이터 상태를 손으로 썼는데도 틀린 그림이 나오지 않는다고 말할 수 있는 근거는? 이 방식이 깨지는 예제 모양은?
   <details><summary>답</summary>테스트가 단계마다 예제의 1..해당 줄을 vm으로 실행해 변수·객체 키 순서·값·출력을 상태와 대조하고, 대괄호 안 식을 직전 줄까지 실행한 컨텍스트에서 다시 평가한다. 한 줄에 문장이 둘이거나 한 문장이 여러 줄이면 줄 단위로 잘라 실행할 수 없어 깨진다(`concept.test.ts` `runUntil`, 계획 3절).</details>
4. 빌드 테스트의 `escapeHtml`을 고치지 않고 제목에서 작은따옴표를 빼는 방법도 있었다. 왜 헬퍼를 고쳤나?
   <details><summary>답</summary>실패 원인은 제목이 아니라 헬퍼가 React의 실제 출력(`'` → `&#x27;`)을 따라가지 못한 것이었다. 제목을 바꾸면 이후 작은따옴표가 든 제목에서 같은 실패가 반복된다. 빌드 HTML에서 `&#x27;1&#x27;`을 확인했다(구현 진행 6).</details>
5. `delete box.c`가 `true`인 것을 보고 "`c`가 있었다"고 말하면 왜 틀리나?
   <details><summary>답</summary>OrdinaryDelete는 프로퍼티가 없으면 바로 `true`를 돌려준다. `true`는 지우기 전 존재 여부를 알려 주지 않는다(명세 10.1.10.1, 시나리오 `추가·갱신·삭제` 9단계).</details>
