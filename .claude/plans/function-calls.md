# 함수 호출: 매개변수와 반환 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `ab7d1f4`

## 0. 요약
- 목적: 로드맵 7번 개념 `/concepts/function-calls`를 추가한다. 호출하면 인수를 왼쪽부터 모두 평가한 뒤 매개변수에 차례로 넣고, 모자란 매개변수는 `undefined`(기본값이 있으면 기본값), 남는 인수는 매개변수에 들어가지 않으며, `return`이 없거나 값 없는 `return;`이면 결과가 `undefined`라는 것을 예제, 퀴즈, 호출 영역 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개 + e2e·빌드 테스트 케이스 추가 + `docs/content-guide.md` 9단계 목록 문구 + 로드맵 상태. 공통 코드와 기존 개념 9개는 바꾸지 않는다.
- 위험: 시나리오의 호출 순서·매개변수 값·반환값을 손으로 잘못 적는 것 → 테스트가 예제 함수를 감싸 실제 호출 기록(호출·매개변수·반환·출력 순서)을 얻고 시나리오에서 뽑은 기록과 대조한다.
- 복잡도: 중간 · Consensus: 생략 (property-keys와 같은 구조라 공통 코드·새 공통 패턴이 없다. 명세 원문과 vm 실행으로 사실을 미리 확인했고, 위험 지점은 실제 호출 기록 대조 테스트로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 7번. 『모던 자바스크립트 Deep Dive』 12장 범위(사용자 진도 1~12장). 직전 개념(6번) 다음 순서(사용자 지시, 2026-10-27).
- 핵심: ① 인수가 모자라면 그 매개변수는 `undefined` ② 남는 인수는 매개변수에 들어가지 않음(무시) ③ `return`이 없으면 호출 결과는 `undefined` ④ `return`을 만나면 그 자리에서 함수가 끝남(값 없는 `return;`도 `undefined`).
- 사용자 결정(2026-10-27) 추가 항목 4개 모두 포함: ① 매개변수 기본값(인수가 없거나 `undefined`일 때만, `null`·`0`은 그대로; 예제 + 퀴즈) ② 인수 평가 순서(본문 실행 전에 왼쪽부터 모두 평가; 시뮬레이터 시나리오) ③ 반복문·`switch` 안의 `return`은 함수 전체를 끝냄(예제 + 퀴즈, switch 페이지 연결) ④ `f`와 `f()`의 차이(함수 자체 vs 호출 결과; 예제 + 퀴즈).
- 호출 영역 시뮬레이터를 넣는다(로드맵 결정). `primitives-and-objects`의 함수 인자 시나리오(객체 전달, 매개변수 재할당)와 겹치지 않게 하고 그 페이지를 관련 개념으로 링크한다(로드맵 메모).

### 유지해야 하는 기존 동작
- 기존 개념 9개의 페이지·시뮬레이터·테스트는 그대로 통과하고, 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 2개다(`tests/e2e/navigation.spec.ts:17`, `:32`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위
- 함수 정의 방식의 차이(함수 표현식·화살표 함수·`Function` 생성자), 호이스팅(8번 개념), `arguments` 객체(18장), 나머지 매개변수·스프레드(26장 이후), `this`, 메서드 호출, 재귀·콜백·즉시 실행 함수, 클로저·스코프(13장), 배열(27장), 객체 인수(primitives-and-objects가 다룸), `return` 뒤 줄바꿈(ASI).
- 위 항목은 필요한 곳에서 `simplifications`로만 밝힌다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 홈 정렬은 제목 `localeCompare(…, 'ko')`(`app/lib/concepts.ts:37-39`), 검색은 title·summary·tags 부분 일치(`app/lib/concepts.ts:47-56`).
- 참고 구현: `app/concepts/property-keys/`(가장 최근: `scenarios.ts` 상태 타입·헬퍼, `PropertyView.tsx` 섹션·배지·클래스 문자열, `Simulator.tsx` 래퍼, `concept.test.ts`의 실제 실행 대조·본문 주장 검증), `app/concepts/primitives-and-objects/scenarios.ts`(호출 영역을 `'change(o, x) 호출'` 라벨로 묶은 방식, 단순화 문구). 공통 타입 `app/simulator/types.ts`, 불변식 `tests/helpers/scenario-invariants.ts`, 예제 실행 `tests/helpers/run-example.ts`.
- e2e 개념별 상수 `tests/e2e/helpers.ts`, a11y·responsive의 property-keys 케이스가 가장 최근 본보기. 빌드 프리렌더 블록 `tests/build/build-output.test.ts` 파일 끝 property-keys 블록.
- 선행 개념 라벨: `primitives-and-objects/meta.ts:16`과 `short-circuit-evaluation/meta.ts:33`이 `{ label: '함수 호출' }`(slug 없음), `switch-break-continue/meta.ts:38`이 `{ label: '함수 선언과 호출' }`. 즉 primitives-and-objects는 함수 호출을 선행 개념으로 둔다 → 새 개념은 그 페이지를 `prerequisites`가 아니라 `related`로 연결한다(로드맵 메모의 "선행·관련" 중 관련). 기존 라벨에 slug를 다는 것은 9절 후보.
- 명세(tc39.es/ecma262, 2026-10-27 원문 확인):
  - EvaluateCall(13.3.6.2): `ArgumentListEvaluation`으로 인수 목록을 먼저 만든 뒤, 호출 대상이 객체가 아니거나 호출할 수 없으면 TypeError, 아니면 `Call(func, thisValue, argList)`.
  - ArgumentListEvaluation(13.3.8.1): `ArgumentList , AssignmentExpression`은 앞의 인수 목록을 먼저 평가한 뒤 다음 식을 평가해 이어 붙인다 → 왼쪽부터 차례로.
  - `[[Call]]`(10.2.1) → OrdinaryCallEvaluateBody → EvaluateFunctionBody(15.2.3): `FunctionDeclarationInstantiation(funcObj, argList)` 후 본문 문장을 평가하고, 정상 완료(끝까지 실행)면 `ReturnCompletion(undefined)`.
  - FunctionDeclarationInstantiation(10.2.11): `CreateListIteratorRecord(argList)`로 매개변수 목록에 `IteratorBindingInitialization`.
  - SingleNameBinding(8.6.3): 값은 `undefined`로 시작해, 인수 목록이 끝나지 않았으면 다음 인수로 바꾼다. Initializer(기본값)가 있고 값이 `undefined`면 기본값 식을 평가해 쓴다 → 인수 없음·`undefined`일 때만 기본값, 남는 인수는 어떤 매개변수에도 묶이지 않는다.
  - Return 문(14.10.1): `return;`은 `ReturnCompletion(undefined)`, `return 식;`은 식의 값으로 ReturnCompletion.
  - 앵커 존재 확인: `sec-function-calls`, `sec-evaluatecall`, `sec-runtime-semantics-argumentlistevaluation`, `sec-ecmascript-function-objects-call-thisargument-argumentslist`, `sec-functiondeclarationinstantiation`, `sec-runtime-semantics-iteratorbindinginitialization`, `sec-runtime-semantics-evaluatefunctionbody`, `sec-return-statement`, `sec-function-definitions`.
- MDN(ko) 200 확인: `Reference/Functions`, `Guide/Functions`, `Reference/Statements/return`, `Reference/Functions/Default_parameters`.
- 예제 초안 실제 출력(Node 24.22.1 `vm` + `util.format`, 8절 1단계 원문 그대로):

  | 예제 | 출력 (`console.log` 줄마다) |
  | - | - |
  | `arg-count.js` | `3` / `NaN` / `3` |
  | `no-return.js` | `안녕, 민지` / `계산` / `undefined undefined 5` |
  | `eval-order.js` | `square 2` / `square 3` / `add 시작` / `13` |
  | `default-param.js` | `사과 3개` / `사과 1개` / `사과 1개` / `사과 null개` / `사과 0개` |
  | `return-in-loop.js` | `5 아님` / `6 아님` / `7 아님` / `8` / `둘 모름` |
  | `call-vs-reference.js` | `function string` / `true 민지` |

- 본문 서술 근거(vm): `function g(){ return 'a' } g()();`와 `const x = 1; x();`는 TypeError(`e.name`). `function f(a){ return arguments.length + ' ' + arguments[1] } f(1, 2)` → `'2 2'`(남는 인수는 `arguments`에 남음 — 본문은 "별도 개념" 한 줄만). `function f(){ return; } typeof f()` → `'undefined'`. 기본값 식은 기본값이 필요할 때마다 평가된다(`let k=0; function f(a = ++k){…}` → `f(), f(), f(5), f()` = `1,2,5,3`).
- 호출 기록 계측 시제품(scratchpad, 실행 확인): 스크립트 맨 앞에 `add = __wrap('add', add);`를 두면(함수 선언은 코드 실행 전에 만들어지므로) 모든 호출의 인수 목록과 반환값을 얻고, 함수 머리 줄 `function add(a, b) {` 끝에 같은 줄로 `__p('add', [['a', a], ['b', b]]);`를 붙이면 기본값 적용 후의 매개변수 값을 얻는다. 세 시나리오 예제에서 기록 순서가 8절 2단계 단계 목록과 일치했다(예: `eval-order` = enter square[2] → out `square 2` → exit 4 → enter square[3] → … → enter add[4, 9] → out `add 시작` → exit 13 → out `13`).
- 홈 정렬(실행 확인): … 증감 연산자 → 프로퍼티 키 → **함수 호출** → switch와 break·continue → typeof 연산자. 새 개념은 여덟 번째 카드다.
- summary 초안 144자, `객체` 없음(실행 확인).

### 추정
- 없음

## 3. 구현 전략
- property-keys와 같은 구조(예제 → meta → 시나리오·실제 호출 기록 대조 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다. slug `function-calls`, category `fundamentals`.
- 시뮬레이터 상태는 "인수 평가 중" 패널(바깥 호출의 인수 목록을 왼쪽부터 채움, 없으면 그리지 않음) + "호출 영역"(호출 식, 넘어온 인수, 매개변수마다 값과 출처 `인수`/`인수 없음`, 무시된 인수, 반환 결과 `return 값`/`return;`/`본문 끝`) + 맨 바깥 코드의 변수 목록이다. 핵심 오해 셋(모자람·남음·반환 없음)이 모두 호출 영역 한 상자 안에 배지로 보이게 하려고 이 모양을 골랐다.
- 호출 영역은 한 번에 하나만 그린다. 시나리오는 함수 안에서 다른 함수를 부르지 않게 짰고(`eval-order`의 `square`는 `add`의 인수로, `add` 호출 전에 끝난다), 동시에 여러 호출 영역을 쌓아 보이는 것(실행 컨텍스트 스택, 23장)은 피한다.
- 시나리오는 3개(`arg-count` 10단계, `no-return` 15단계, `eval-order` 12단계). 추가 항목 중 기본값·반복문 안 `return`·`f`와 `f()`는 예제 + 퀴즈로 다룬다.
- 정확성 검증: (a) 예제를 계측해 얻은 실제 호출 기록(enter 인수 목록 / params 매개변수 값 / exit 반환값 / out 출력)과 시나리오 단계에서 뽑은 기록을 순서까지 대조 (b) 반환 방식(`return`/`return;`/`본문 끝`)은 그 단계 강조 줄 원문으로 검사 (c) 마지막 단계의 변수 값은 예제 끝에 붙인 스냅샷과 대조.
- 버린 대안: ① 함수 안에서 함수를 부르는 시나리오(호출 영역 두 겹) — 실행 컨텍스트 스택을 앞서 보이게 된다. ② `arguments` 객체를 호출 영역에 표시 — 18장 범위이고 남는 인수가 "어딘가 쓰인다"는 오해를 만든다. `simplifications`로만 밝힌다. ③ `console.log`도 호출 영역으로 그리기 — 호스트 API라 본문을 보일 수 없다. ④ primitives-and-objects `MemoryView` 재사용 — 개념 간 공유 부품은 `app/simulator/`뿐이다(AGENTS). 클래스 문자열만 같게 쓴다. ⑤ 줄 단위 prefix 실행 대조(property-keys 방식) — 함수 본문은 줄로 잘라 실행할 수 없어 호출 기록 계측으로 바꿨다.

## 4. 변경 파일
- 추가 `app/concepts/function-calls/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 6개: `arg-count.js`, `no-return.js`, `eval-order.js`, `default-param.js`, `return-in-loop.js`, `call-vs-reference.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `CallView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `FUNCTION_CALLS_PATH`, `FUNCTION_CALLS_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(라이트·다크 describe 안, property-keys 케이스 뒤)
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행(파일 끝)
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록(파일 끝 property-keys 블록 뒤)
  - `docs/content-guide.md` 9단계: e2e 대상 개념 목록에 `function-calls` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch1-12.md`: 7번 계획 문서·상태 갱신, 진행 기록 한 줄
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `tests/helpers/*`, `tests/e2e/navigation.spec.ts`, 기존 개념 폴더 9개, `package.json`, `AGENTS.md`.

## 5. 위험 요소
- 시나리오의 호출 순서·매개변수 값·반환값·출력을 잘못 적음 → 틀린 그림 → 2단계 호출 기록 대조 + 음성 확인 4가지.
- "남는 인수는 사라진다/버려진다", "모자란 인수는 오류다"는 서술 → 본문·단계 설명은 "매개변수에 들어가지 않는다"(남는 인수), "그 매개변수는 `undefined`"(모자람)로 통일. `arguments`에 남는다는 사실은 `simplifications`와 본문 한 줄("별도 개념")로 밝힌다.
- `add(1)`의 `NaN` 원인 설명 → "`b`가 `undefined`이고 `1 + undefined`는 `undefined`를 숫자로 바꾸면 `NaN`이라 `NaN`"([암묵적 타입 변환] 링크). "오류가 난다"로 쓰지 않는다.
- 기본값이 `null`·`0`·`''`에도 쓰인다는 오해(단축 평가 `||`와 혼동) → `default-param` 예제의 `null`·`0` 줄과 Callout, [단축 평가] 링크.
- 미학습 개념(실행 컨텍스트·스코프·호이스팅·`arguments`·`this`) 서술 → 호출 영역은 "교육용으로 묶은 영역", 함수 선언이 호출보다 위에 있어야 하는지는 언급하지 않고 `simplifications`에 "호이스팅은 다음 개념"으로만.
- 예제의 함수 이름이 호스트 전역과 겹침(브라우저에서 복사해 실행) → `add`·`square`·`greet`·`half`·`order`·`label`·`firstMultiple`·`getName`은 브라우저 `window` 고유 프로퍼티가 아니다. `name`은 매개변수로만 쓴다(전역 아님).
- `객체` 검색 2건 가정 → meta 세 필드에 `객체` 없음을 1단계 완료 조건으로.
- 홈 카드 순서 변화(새 개념이 여덟 번째) → 정렬 규칙대로, `navigation.spec.ts`는 첫 카드만 확인하므로 영향 없음.
- 375px에서 호출 영역(인수·매개변수·무시된 인수·결과 배지)이 넘침 → `flex-wrap`·`[overflow-wrap:anywhere]`, e2e 가로 스크롤 검사.
- 37단계 a11y 전 단계 검사 시간 → `test.slow()`.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 6개 실제 출력 = `expectedOutput`, 본문 주장 검증(TypeError·`return;`), 시나리오 호출 기록 대조·반환 방식·최종 변수, 음성 확인(2단계 4가지).
- 브라우저(빌드 결과 `serve` 4175, 사용자 dev 서버 5173은 건드리지 않음):
  1. 첫 화면: "검토 중" 배지, 학습 목표, 선행 개념 중 `type-coercion`·`switch-break-continue` 링크, 관련 개념에 `primitives-and-objects`, 퀴즈가 라디오 UI.
  2. `인수 개수가 다를 때`: 2단계 호출 영역 `add(1, 2)`·`a = 1`·`b = 2`, 5단계 `add(1)`의 `b = undefined`·`인수 없음`, 6단계 `return 값 NaN`, 8단계 `add(1, 2, 3)`의 무시된 인수 `3`. 콘솔 `3`/`NaN`/`3`.
  3. `return이 없을 때`: 4단계 `본문 끝`·`undefined`, 8단계 `return;`·`undefined`, 13단계 `return 값 5`, 마지막 변수 `a = undefined`·`b = undefined`·`c = 5`. 콘솔 3줄.
  4. `인수 평가 순서`: 2단계 "인수 평가 중" `add(…)` 인수 `평가 전`·`평가 전`과 호출 영역 `square(2)`, 5단계 `add` 인수 `4`·`평가 전`, 8단계 "인수 평가 중"이 사라지고 호출 영역 `add(4, 9)`. 콘솔 4줄.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: 카드 10개(새 개념 여덟 번째), `객체` 검색 2건, `함수` 검색에 새 개념 포함.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제·meta·본문 주장 검증
- 대상: `examples/*.js` 6개, `meta.ts`, `route.tsx`, `content.mdx`(필수 h2 자리표시만), `concept.test.ts`(본문 주장 검증 부분)
- 현재: 없음
- 변경:
  - 예제 원문(이 그대로, 파일 끝 줄바꿈 하나, 들여쓰기 2칸):
    - `arg-count.js`
      ```js
      function add(a, b) {
        return a + b;
      }
      console.log(add(1, 2));
      console.log(add(1));
      console.log(add(1, 2, 3));
      ```
    - `no-return.js`
      ```js
      function greet(name) {
        console.log('안녕, ' + name);
      }
      function half(n) {
        if (n < 0) {
          return;
        }
        console.log('계산');
        return n / 2;
      }
      const a = greet('민지');
      const b = half(-4);
      const c = half(10);
      console.log(a, b, c);
      ```
    - `eval-order.js`
      ```js
      function square(n) {
        console.log('square ' + n);
        return n * n;
      }
      function add(a, b) {
        console.log('add 시작');
        return a + b;
      }
      const total = add(square(2), square(3));
      console.log(total);
      ```
    - `default-param.js`
      ```js
      function order(item, count = 1) {
        return item + ' ' + count + '개';
      }
      console.log(order('사과', 3));
      console.log(order('사과'));
      console.log(order('사과', undefined));
      console.log(order('사과', null));
      console.log(order('사과', 0));
      ```
    - `return-in-loop.js`
      ```js
      function firstMultiple(start, n) {
        for (let i = start; i <= start + 10; i++) {
          if (i % n === 0) {
            return i;
          }
          console.log(i + ' 아님');
        }
        return '없음';
      }
      function label(code) {
        switch (code) {
          case 1:
            return '하나';
          case 2:
            return '둘';
        }
        return '모름';
      }
      console.log(firstMultiple(5, 4));
      console.log(label(2), label(3));
      ```
    - `call-vs-reference.js`
      ```js
      function getName() {
        return '민지';
      }
      const fn = getName;
      const result = getName();
      console.log(typeof fn, typeof result);
      console.log(fn === getName, fn());
      ```
  - `meta.ts`:
    - `slug: 'function-calls'`, `title: '함수 호출: 인수가 모자라거나 남으면 어떻게 되나'`, `category: 'fundamentals'`
    - `summary`: `'함수를 호출하면 인수를 왼쪽부터 모두 평가한 뒤 매개변수에 차례로 넣고 본문을 실행합니다. 모자란 매개변수는 undefined(기본값이 있으면 기본값)가 되고 남는 인수는 매개변수에 들어가지 않으며, return이 없으면 호출 결과는 undefined입니다.'`(144자)
    - `tags`: `['함수', '함수 호출', '매개변수', '인수', 'return', '반환값', '매개변수 기본값', 'undefined']`
    - `goals`(4개): 인수가 모자라거나 남을 때 매개변수의 값을 예측할 수 있다 / 매개변수 기본값이 쓰이는 경우(인수 없음·`undefined`)와 쓰이지 않는 경우(`null`·`0`)를 구분할 수 있다 / 인수가 본문 실행 전에 왼쪽부터 평가된다는 것으로 출력 순서를 예측할 수 있다 / `return`이 없거나 값 없는 `return;`이면 결과가 `undefined`이고, 반복문·`switch` 안의 `return`도 함수 전체를 끝낸다는 것과 `f`와 `f()`의 차이를 설명할 수 있다.
    - `prerequisites`: `{ label: '함수 선언' }`, `{ label: '암묵적 타입 변환', slug: 'type-coercion' }`, `{ label: 'switch와 break·continue', slug: 'switch-break-continue' }`
    - `related`: `['primitives-and-objects', 'short-circuit-evaluation', 'typeof-operator']`
    - `examples`: 6개, `expectedOutput`은 2절 표(처음엔 `[]`로 두고 `npm test` 실제 출력으로 채운 뒤 표와 같은지 확인)
    - `simplifications`(7개):
      1. 함수 호출 중의 매개변수는 '`add(1, 2)` 호출' 영역으로 묶어 표시합니다. 명세의 실행 컨텍스트와 환경 레코드를 단순화한 것이며, 이 페이지의 시나리오는 한 번에 호출 하나만 진행되도록 짰습니다(함수 안에서 다른 함수를 부르는 경우는 별도 개념).
      2. 남는 인수는 매개변수에 들어가지 않을 뿐, 함수 안에서 `arguments` 객체로 읽을 수 있습니다. `arguments`는 별도 개념이며 시각화에 표시하지 않습니다.
      3. 함수 선언으로 만들어지는 변수(`add` 등)와 함수 객체는 표시하지 않습니다. 함수 선언이 코드 실행 전에 처리되는 과정(호이스팅)은 다음 개념에서 다룹니다.
      4. '인수 평가 중' 패널은 바깥 호출의 인수 목록을 왼쪽부터 채우는 과정을 보여 주는 교육용 표현입니다. `console.log`도 함수 호출이지만 호스트가 제공하는 함수라 호출 영역으로 그리지 않고, 그 인수를 평가하는 과정도 '인수 평가 중' 패널에 그리지 않습니다(`console.log(add(1, 2))`에서는 `add(1, 2)` 호출만 보입니다).
      5. 매개변수 기본값이 있는 함수에서 매개변수가 만들어지는 세부 과정(기본값 식이 평가되는 환경 등)은 다루지 않습니다. 기본값 식은 기본값이 필요한 호출마다 평가됩니다.
      6. `this`, 메서드 호출, 화살표 함수처럼 호출 방식에 따른 차이는 다루지 않습니다.
      7. 변수는 선언문이 실행된 뒤에만 표시합니다(TDZ는 별도 개념).
    - `references`: 명세 `sec-function-calls`, `sec-evaluatecall`, `sec-runtime-semantics-argumentlistevaluation`, `sec-functiondeclarationinstantiation`, `sec-runtime-semantics-iteratorbindinginitialization`, `sec-runtime-semantics-evaluatefunctionbody`, `sec-return-statement`; MDN(ko) 4개(2절). 다른 개념처럼 전체 URL 문자열.
    - `reviewedAt: null`
  - `route.tsx`: property-keys와 같은 템플릿. `content.mdx`: 필수 h2 세 개 + 자리표시 한 줄(본문은 5단계).
  - `concept.test.ts` "본문 주장 검증": ① `function g(){ return 'a'; } g()();`와 `const x = 1; x();`는 `e.name === 'TypeError'` ② `function f(){ return; } typeof f()` → `'undefined'`, `function f(){} typeof f()` → `'undefined'` ③ 남는 인수는 `arguments`에 남는다(`'2 2'`, simplifications 2의 근거) ④ 기본값 식은 필요한 호출마다 평가된다(`1,2,5,3`, simplifications 5의 근거).
- 이유: 모든 출력·서술의 근거를 먼저 고정한다(정확성 원칙).
- 주의사항: `examples/`는 Prettier·ESLint 대상이 아니다(줄 번호 고정). 예제는 직접 작성한 것이다. meta 세 필드에 `객체` 금지. 예제에 배열·객체 인수를 쓰지 않는다.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/function-calls` 통과, 예제 6개 실제 출력 = 2절 표, `npm run lint`·`npm run typecheck` 0, summary ≤ 160자, title·summary·tags에 `객체` 없음.

### 2. 상태 모델·시나리오·호출 기록 대조 테스트
- 대상: `scenarios.ts`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태 타입:
    ```ts
    export type Val = { type: 'number' | 'string' | 'undefined'; display: string } // string은 따옴표 없이
    export type Binding = { name: string; declaredWith: 'const'; value: Val; changed?: boolean }
    export type Param = { name: string; value: Val; from: 'argument' | 'missing' }
    export type CallResult = { value: Val; how: 'return' | 'return-empty' | 'end' }
    export type Call = {
      id: string // 호출마다 다른 id(예: 'add-1')
      callee: string // 'add'
      code: string // 호출 식 원문 그대로(예: 'add(1)', 'square(2)'); eval-order의 add는 'add(square(2), square(3))'
      args: Val[] // 평가된 인수 목록
      params: Param[]
      ignored: Val[] // 매개변수에 들어가지 않은 인수
      result: CallResult | null // 반환하는 단계에서만 채움
    }
    export type Pending = { callee: string; code: string; args: (Val | null)[] } // null = 아직 평가 전
    export type CallState = { bindings: Binding[]; pending: Pending | null; call: Call | null }
    ```
  - 시나리오 3개(라벨 / 단계, 줄 번호는 1단계 예제 원문 기준):
    - `arg-count` "인수 개수가 다를 때" — 10단계: 실행 전(설명: 함수 선언은 호출할 때까지 본문을 실행하지 않음) / 4줄 `add(1, 2)` 호출 시작(a=1, b=2) / 2줄 `return a + b` → 3 / 4줄 호출이 끝나 출력 `3` / 5줄 `add(1)`(a=1, b=undefined `missing`) / 2줄 return NaN / 5줄 출력 `NaN` / 6줄 `add(1, 2, 3)`(ignored `[3]`) / 2줄 return 3 / 6줄 출력 `3`.
    - `no-return` "return이 없을 때" — 15단계: 실행 전 / 11줄 `greet('민지')`(name="민지") / 2줄 출력 `안녕, 민지` / 3줄 본문 끝 → undefined(`end`) / 11줄 `a = undefined` / 12줄 `half(-4)`(n=-4) / 5줄 조건 `n < 0`이 true / 6줄 `return;` → undefined(`return-empty`) / 12줄 `b = undefined` / 13줄 `half(10)`(n=10) / 5줄 조건 false / 8줄 출력 `계산` / 9줄 return 5 / 13줄 `c = 5` / 14줄 출력 `undefined undefined 5`.
    - `eval-order` "인수 평가 순서" — 12단계: 실행 전 / 9줄 pending `add(square(2), square(3))` 인수 `[null, null]` + 호출 `square(2)`(n=2) / 2줄 출력 `square 2` / 3줄 return 4 / 9줄 pending `[4, null]` + 호출 `square(3)` / 2줄 출력 / 3줄 return 9 / 9줄 pending 없음 + 호출 `add(square(2), square(3))`(args `[4, 9]`, a=4, b=9) / 6줄 출력 `add 시작` / 7줄 return 13 / 9줄 `total = 13` / 10줄 출력 `13`.
    - 반환 단계 다음 단계에서 `call`은 `null`(또는 다음 호출)이다. `changed`는 변수에만 쓰고, 그 단계에서 새로 생기거나 값이 바뀐 변수에만 붙인다(다음 단계에서 해제).
    - 단계 설명은 "매개변수에 들어가지 않는다", "그 매개변수는 undefined", "본문 끝까지 실행해 호출 결과는 undefined", "return을 만나 그 자리에서 함수가 끝난다"로 쓰고, 실행 컨텍스트·스코프·호이스팅·`arguments`를 설명하지 않는다.
  - `concept.test.ts`:
    - 시나리오마다 `assertScenarioInvariants`.
    - **호출 기록 대조**: 예제 원문을 계측해(2절 시제품 방식: 맨 앞에 `<이름> = __wrap('<이름>', <이름>);`, 함수 머리 줄 끝에 같은 줄로 `__p(…)`) `runInNewContext`로 실행해 실제 기록 `enter(callee, args)` / `params(callee, [name, typeof, String])` / `exit(callee, typeof, String)` / `out(line)`을 얻는다. 시나리오에서는 단계를 차례로 보며 새 `call.id`가 나타나면 enter+params, `call.result`가 나타나면 exit, `output`이 늘면 늘어난 줄마다 out을 뽑는다. 두 기록이 순서까지 같아야 한다.
    - **호출 영역 일관성**: `ignored` = `args.slice(params.length)`, `params[i].from`은 `i < args.length`면 `argument`(값 = `args[i]`), 아니면 `missing`(값 `undefined`), 매개변수 이름·순서 = 함수 머리 줄. `call.code`와 `pending.code`는 그 단계 강조 줄 원문에 들어 있다. `pending.args`에 채워진 값은 그 뒤 같은 callee 호출의 `args`와 같은 위치 값이다.
    - **반환 방식**: `result`가 있는 단계의 강조 줄 원문이 `how`와 맞다 — `return-empty` ↔ `return;`, `return` ↔ `return `으로 시작, `end` ↔ `}`.
    - **최종 변수**: 마지막 단계의 바인딩 이름·순서·값 = 예제 끝에 스냅샷 코드를 붙여 실행한 실제 값(`typeof`·`String`). 각 바인딩이 생기는 단계의 값은 바로 앞 단계 호출의 `result.value`와 같다.
    - **changed 계산**: 이전 단계와 비교해 새로 생기거나 값이 바뀐 변수에만 `changed`.
    - **음성 확인(구현 중 한 번씩, 커밋하지 않음)**: ① `arg-count` 5단계 `b`의 `from`을 `argument`로 → 일관성 실패 ② `no-return` 8단계 `how`를 `end`로 → 반환 방식 실패 ③ `eval-order`에서 `square(3)` 호출 단계를 `square(2)` 출력 단계 앞으로 옮김 → 기록 대조 실패 ④ `arg-count` 8단계 `ignored`를 `[]`로 → 일관성 실패. 각각 실패 확인 후 원복.
- 이유: 단계 상태를 손으로 쓰지만 근거는 실제 실행으로 고정한다(정확성 원칙). 함수 본문은 줄 단위로 잘라 실행할 수 없어 호출 기록 계측을 쓴다.
- 주의사항: 계측 코드는 테스트 안에서만 만들고 예제 파일은 바꾸지 않는다. 계측 정규식은 `^function (\w+)\(([^)]*)\) \{$` 머리 줄만 대상으로 한다(시나리오 예제 3개의 함수는 모두 이 모양).
- 완료 조건: `npx vitest run app/concepts/function-calls` 통과, 단계 수 10/15/12, 음성 확인 ①~④ 각각 실패 확인 후 원복, lint·typecheck 0.

### 3. 시각화 컴포넌트 CallView
- 대상: `CallView.tsx`, `CallView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `CallState`를 그린다(`prevState` 사용, 변수 `새로 생김`/`값이 바뀜` 구분용).
  - "인수 평가 중" 영역: `pending`이 있을 때만 그린다. `code`(`font-mono`) + 인수 목록(위치 `1번째`/`2번째` + 값 또는 `평가 전`).
  - "호출 영역" 영역(`section` + `useId` `aria-labelledby`): `call`이 없으면 "실행 중인 함수 호출이 없습니다." 있으면 테두리 상자, 머리 `‘<code>’ 호출`.
    - `인수` 줄: 값 목록(없으면 `없음`).
    - 매개변수 행: `이름 = 값` + 배지 `인수`(from argument) 또는 `인수 없음`(from missing).
    - `ignored`가 있으면 `매개변수에 들어가지 않은 인수` 줄 + 값 목록.
    - `result`가 있으면 결과 배지 + 문장: `return` — `return 값: 3` / `return-empty` — `값 없는 return; → undefined` / `end` — `본문 끝까지 실행 → undefined`.
  - "변수" 영역: `const` + `이름 = 값` + `새로 생김`/`값이 바뀜` 배지. 없으면 "아직 표시할 변수가 없습니다."
  - 값 표시: 문자열은 큰따옴표, 숫자·`undefined`는 그대로. 타입 배지(`숫자`/`문자열`/`undefined`)는 매개변수와 결과에 붙인다.
  - 클래스 문자열·섹션 제목(`<p id>`)·줄바꿈은 `property-keys/PropertyView.tsx`와 같게 쓴다(import하지 않음).
- 이유: 상태 모양이 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더 첫 단계가 JS 없이 의미 있게 보여야 한다(빈 상태 문구 2개). 색만으로 구분하지 않는다(배지 텍스트). 375px에서 넘치지 않게 `flex-wrap`·`break-words [overflow-wrap:anywhere]`. 애니메이션은 `motion-safe:`만.
- 완료 조건: `CallView.test.tsx` 통과(실제 `scenarios` 단계 state로) — 빈 상태 문구 2개, `arg-count` 5단계 `add(1)`·`b`·`undefined`·`인수 없음`, 6단계 `return 값`·`NaN`, 8단계 `매개변수에 들어가지 않은 인수`·`3`, `no-return` 4단계 `본문 끝까지 실행`, 8단계 `값 없는 return;`, `eval-order` 2단계 `인수 평가 중`·`평가 전` 2개·`square(2)`, 8단계 "인수 평가 중" 없음, 변수 `새로 생김`.

### 4. Simulator 래퍼
- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: property-keys `Simulator.tsx`와 같은 모양. `label="함수 호출 시뮬레이터"`, `renderState={(state, prevState) => <CallView state={state} prevState={prevState} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `인수 개수가 다를 때` "실행 전", 다음 클릭 시 4번 줄 강조(`aria-current="step"`), 시나리오 전환 시 0단계로 돌아감.

### 5. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `Simulator`, `scenarios` import)
- 변경:
  - `## 동작 원리`
    - 호출 순서: `f(인수1, 인수2)`를 평가하면 ① 인수 식을 왼쪽부터 모두 평가해 인수 목록을 만들고 ② 매개변수에 차례로 넣은 뒤 ③ 본문을 실행한다. 인수 식 안에 다른 호출이 있으면 그 호출이 먼저 끝난다(`eval-order`).
    - 개수가 다를 때: 인수가 모자라면 남은 매개변수는 `undefined`, 인수가 남으면 그 인수는 매개변수에 들어가지 않는다(오류가 아님). 남는 인수를 읽는 방법(`arguments`)은 별도 개념 한 줄.
    - 기본값: `count = 1`은 그 자리의 값이 `undefined`일 때(인수가 없거나 `undefined`를 넘겼을 때)만 쓰인다. `null`·`0`은 그대로 쓰인다([단축 평가](/concepts/short-circuit-evaluation)의 `||`와 다르다는 연결).
    - 반환: `return 식;`은 그 값을 호출 결과로 하고 그 자리에서 함수를 끝낸다. `return;`과 `return` 없이 본문 끝까지 실행한 경우 결과는 `undefined`. 반복문·`switch` 안의 `return`도 반복문만이 아니라 함수 전체를 끝낸다([switch와 break·continue](/concepts/switch-break-continue) 링크, `break`와 대비).
    - `f`와 `f()`: 괄호 없는 `f`는 함수 자체(값)이고 `typeof`는 `'function'`([typeof](/concepts/typeof-operator) 링크), `f()`는 호출해서 얻은 결과. 함수가 아닌 값을 호출하면 TypeError(예: `getName()()`).
  - `## 예제`: 예제 6개를 `file=` 코드 펜스로(순서: arg-count, no-return, eval-order 뒤에 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`, 이어서 default-param, return-in-loop, call-vs-reference). `PredictQuiz` 6개(예제마다, 선택지 3~4개, 여러 줄 출력이면 ' / ' 안내, 정답은 실제 출력). `console`은 호스트 API라는 한 줄.
  - `## 결과와 이유`: JSX `<table>`(예제 / 출력 / 이유), 예제별 이유 문단(`add(1)`의 `NaN`은 `1 + undefined`가 `NaN`이라서 — [암묵적 타입 변환](/concepts/type-coercion) 링크), `Callout type="misconception"` 5개: ① "인수 개수가 매개변수와 다르면 오류가 난다"(`arg-count`) ② "`return`이 없으면 마지막 줄의 값이 반환된다"(`no-return`) ③ "함수는 호출한 순서대로 바깥부터 실행된다 / `add`가 먼저 시작된다"(`eval-order`) ④ "기본값은 값이 없어 보이면(`null`, `0`) 쓰인다"(`default-param`) ⑤ "반복문 안의 `return`은 `break`처럼 반복문만 끝낸다"(`return-in-loop`).
- 주의사항: 미학습 개념(실행 컨텍스트, 스코프, 호이스팅, `arguments` 상세, `this`)을 설명하지 않는다. 같은 대상은 같은 이름("인수", "매개변수", "호출 결과", "본문 끝까지 실행"). "인수(argument)", "매개변수(parameter)"는 처음 나올 때 영어 병기. 스타일 권고 금지. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/function-calls/index.html`에 `<details` 6개 이상, 시뮬레이터 0단계 텍스트, 라디오 3개 이상, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 남은 `**` 0건.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch1-12.md`
- 변경: property-keys 케이스를 본떠 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y 시뮬레이터 케이스는 시나리오 라벨 3개(`인수 개수가 다를 때`, `return이 없을 때`, `인수 평가 순서`)의 모든 단계(합계 37단계, `test.slow()`, 반복 상한은 최대 단계 수보다 크게). 빌드 블록(주석 "열 번째 개념(function-calls)"): `단계 1: 실행 전`, `실행 중인 함수 호출이 없습니다.`, `아직 표시할 변수가 없습니다.`, region `aria-label="함수 호출 시뮬레이터"`, 시나리오 라벨 3개, `<details` 6개 이상. content-guide 9단계 목록에 `function-calls` 추가. 로드맵 7번 행의 계획 문서(`` `function-calls.md` ``)·상태(`완료(콘텐츠 검토 대기)`)를 갱신하고 진행 기록 한 줄을 추가한다.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~6을 확인하고 스크린샷 1장 이상.

## 9. 추가 개선 후보
- 기존 개념의 선행 개념 라벨에 slug 연결: `primitives-and-objects/meta.ts:16`·`short-circuit-evaluation/meta.ts:33`의 `{ label: '함수 호출' }`, `switch-break-continue/meta.ts:38`의 `{ label: '함수 선언과 호출' }` → `slug: 'function-calls'`(기존 개념 파일 수정이라 사용자 확인 필요). property-keys 계획 9절의 `short-circuit-evaluation` 라벨 연결과 함께 처리할 수 있다.
- 8번(호이스팅)에서 이 페이지의 "함수 선언으로 만들어지는 변수는 표시하지 않는다" 단순화를 이어받아 설명.

## 구현 진행

- baseline (2026-10-27, `ab7d1f4`): 직전 검토 기록 커밋 직전에 같은 코드로 실행한 전체 검증 — lint·format:check·typecheck 오류 0, `npm test` 873 통과, `test:build` 77 통과, e2e 139 통과·3 건너뜀(기존 의도된 3건). 이후 바뀐 것은 계획 문서뿐. 사용자 dev 서버가 5173에서 실행 중(건드리지 않고 빌드 결과 `serve`로 확인)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 165 통과, lint·typecheck 0. 예제 6개가 계획 원문(scratchpad 초안)과 바이트 동일, 실제 출력 = 2절 표. summary 144자, title·summary·tags에 `객체` 없음, meta 필드가 계획과 일치
- [x] 2. 상태 모델·시나리오·호출 기록 대조 테스트 — 메인 재실행: vitest(개념·examples·content-integrity) 200 통과, lint·typecheck·prettier 0. 단계 수 10/15/12. 음성 확인 ①~④는 서브에이전트 보고(각 1~2건 실패, `cmp`로 원복 확인). 메인이 단계 설명 전부를 검토해 4곳 수정: `add(1)` 호출·NaN 반환 설명을 읽기 쉬운 문장으로, `본문 끝` 설명의 중복 문장 정리, `return;` 설명의 `console.log("계산")`을 예제 원문과 같은 작은따옴표로. 계획 외 보강 검사(같은 id 호출 내용 동일, id·바인딩 이름 중복 없음, `declaredWith` 원문 대조) 수용. `call.code`·`pending.code`의 강조 줄 검사는 새로 나타난 단계에서만(return·출력 줄에는 호출 식이 없음 — 계획 의도와 같음)
- [x] 3. CallView — 메인 재실행: vitest(개념) 57 통과, lint·typecheck·prettier 0. 코드 확인: `useId`만 사용(창 크기·localStorage 없음), 섹션 제목 `<p id>`, 클래스 문자열이 PropertyView와 같음(import 없음). 계획과 다른 점(수용): ① 호출 영역과 변수를 PropertyView처럼 `sm:grid-cols-2`로 나란히(375px는 1열) ② 계획에 문구가 없던 결과 배지를 `return`/`return;`/`본문 끝`으로 정함
- [x] 4. Simulator 래퍼 — property-keys 래퍼와의 diff가 import·타입·주석·label·View뿐. Simulator.test 3개 통과(첫 클릭 시 4번 줄 강조)
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·vm 근거와 대조해 표현 8곳 수정(결론 변경 없음): `||` 대비를 "값이 비어 보이면"에서 "왼쪽 값이 falsy이면"으로, `f`·`fn`을 "가리키는"(참조 비유) 대신 "함수 값", 인수 목록 `[4, 9]`(배열 표기, 미학습)를 "4와 9로 된 인수 목록"으로 2곳, Callout ①의 "오류가 나는 경우는 …일 때"(단정)를 "함수가 아닌 값에 ()를 붙이면 TypeError", Callout ⑤의 "return '없음'까지 건너뛰고"를 "실행되지 않고"로 + 인라인 코드를 `<code>{…}</code>`로. 서브에이전트가 Callout ④의 `사과 null개` 공백 깨짐 1건을 `<code>{…}</code>`로 해소. 메인 재실행: `npm test` 946 통과, lint·prettier 0, build 성공, HTML `<details` 6·라디오 3(시나리오 선택)·0단계 문구·region aria-label 있음·공백 깨진 code 0·`**` 0
- [x] 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인 — 기존 파일의 삭제 줄은 content-guide 9단계 목록 문구와 로드맵 7번 행뿐(테스트는 추가만). 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 946(baseline 873), `test:build` 84(baseline 77), e2e 151 통과·3 건너뜀(baseline 139·3). 브라우저(빌드 결과를 `serve` 4175로 띄워 Playwright, 사용자 dev 서버 5173은 건드리지 않음): 1280px 다크·375px 라이트에서 단계 수 10/15/12, `인수 개수가 다를 때` 2단계 `add(1, 2)`·a=1·b=2, 5단계 `b = undefined`·`인수 없음`, 6단계 `return 값: NaN`, 8단계 `매개변수에 들어가지 않은 인수 3`, `return이 없을 때` 4단계 `본문 끝까지 실행 → undefined`, 8단계 `값 없는 return; → undefined`, 13단계 `return 값: 5`, 15단계 변수 a·b undefined·c 5와 콘솔 3줄, `인수 평가 순서` 2단계 인수 평가 중 `평가 전` 2개·`square(2)` 호출, 5단계 1번째 4·2번째 평가 전, 8단계 인수 평가 중 없음·add 인수 4 9, 12단계 콘솔 4줄. 전 단계 가로 넘침 0(두 폭), 키보드 →×3/←/Home = 단계 4/3/1, "검토 중" 배지, 콘솔 에러 0. 홈 카드 10개(새 개념 여덟 번째), `객체` 검색 2건, `함수` 검색 3건(새 개념 포함). 스크린샷 2장(scratchpad)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff가 개념 폴더 1개 + 테스트 추가라 sub agent 생략): Critical/High 0. Low 2(보고만): ① `CallView.tsx` 결과 줄이 배지 `return`과 문장 `return 값: 3`에서 "return"을 두 번 보이고, `undefined` 결과는 타입 배지와 문장 끝에 `undefined`가 겹침(정보는 맞음) ② `concept.test.ts`의 `const { result: _result, ...rest } = call; void _result` — 쓰지 않는 변수 린트 회피용 줄(동작 영향 없음)

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 호출 영역과 변수를 넓은 화면에서 나란히 배치하고(375px는 위아래), 계획에 문구가 없던 결과 배지를 `return`/`return;`/`본문 끝`으로 정했다(구현 진행 3) ② 메인 검토에서 시나리오 단계 설명 4곳, 본문 표현 8곳을 고쳤다(결론 변경 없음, 구현 진행 2·5) ③ 서브에이전트의 계획 외 보강 검사를 수용했다(구현 진행 2).
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. Low 2건(`CallView.tsx` 결과 줄의 "return"·`undefined` 중복 표시, `concept.test.ts:187`의 `void _result`)은 보고만 했고, 사용자가 고치지 않은 상태로 승인했다.

### 후속 작업
- [x] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록(2026-10-28)
- [ ] 리뷰 Low 2건 정리 여부(선택)
- [ ] 9절 추가 개선 후보(기존 개념의 `'함수 호출'`·`'함수 선언과 호출'` 선행 라벨에 slug 연결)
- [ ] 로드맵 8번 "호이스팅: var와 함수 선언" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 본문에서 인수 목록 `[4, 9]`를 "4와 9로 된 인수 목록"으로, `f`를 "함수를 가리키는 값" 대신 "함수 값"으로 고쳤다 — 배열(27장)은 미학습이라 대괄호 표기가 배열로 읽히고, "가리킨다"는 AGENTS가 피하라는 참조 비유다(구현 진행 5).
- [Claude 판단] 호출 영역과 변수를 넓은 화면에서 나란히 두고, 결과 배지를 `return`/`return;`/`본문 끝`으로 정했다 — 계획에 배치·문구 지정이 없어 property-keys 배치를 따랐다(구현 진행 3).
- [무검토 승인] 시나리오를 손으로 쓰되, 예제 함수를 감싸(`add = __wrap('add', add)`를 맨 앞에, 머리 줄에 `__p(...)`) 실제 호출 기록(enter·params·exit·out)을 얻고 시나리오에서 뽑은 기록과 순서까지 대조했다 — 함수 본문은 줄 단위로 잘라 실행할 수 없어 property-keys의 prefix 실행 대신 계측을 썼다(`concept.test.ts` `runInstrumented`, 계획 3절).
- [무검토 승인] 호출 영역을 한 번에 하나만 그리고 함수 안에서 함수를 부르는 시나리오를 만들지 않았다 — 두 겹 호출 영역은 실행 컨텍스트 스택(23장)을 앞서 보이게 된다. `add(square(2), square(3))`은 인수 평가가 `add` 호출 전에 끝나 한 겹으로 충분하다(계획 3절).
- [무검토 승인] 남는 인수를 "버려진다"가 아니라 "매개변수에 들어가지 않는다"로 쓰고 `arguments`는 단순화 항목에만 밝혔다 — 남는 인수는 실제로 `arguments`에 남는다(`concept.test.ts` 본문 주장 검증 `'2 2'`).
- [무검토 승인] primitives-and-objects를 선행이 아니라 관련 개념으로 연결했다 — 그 페이지가 이미 '함수 호출'을 자기 선행 개념으로 둔다(`primitives-and-objects/meta.ts:16`).
- 추가 항목 4개(매개변수 기본값, 인수 평가 순서, 반복문 안의 return, f와 f()의 차이)는 사용자가 골랐다.

#### 배경지식
- EvaluateCall(13.3.6.2)은 ArgumentListEvaluation으로 인수 목록을 먼저 만든 뒤(왼쪽부터, 13.3.8.1) 호출 대상이 호출할 수 없으면 TypeError, 아니면 `[[Call]]`한다.
- 매개변수 바인딩(SingleNameBinding, 8.6.3)은 값을 `undefined`로 시작해 남은 인수가 있으면 다음 인수로 바꾸고, 기본값이 있고 값이 `undefined`면 기본값 식을 평가한다. 인수 목록에 남은 값은 어떤 매개변수에도 묶이지 않는다.
- EvaluateFunctionBody(15.2.3)는 본문이 정상 완료(끝까지 실행)되면 `ReturnCompletion(undefined)`, `return;`도 `undefined`(14.10.1). `return`은 반복문·`switch`를 지나 함수 호출을 끝낸다.

#### 확인 질문
1. `add(1)`이 오류가 아니라 `NaN`인 이유를 명세 동작으로 설명하면?
   <details><summary>답</summary>SingleNameBinding이 `b`를 `undefined`로 시작하고 남은 인수가 없어 그대로 둔다. 본문 `a + b`는 `1 + undefined`이고 `undefined`를 숫자로 바꾸면 `NaN`이라 결과가 `NaN`이다(계획 2절, 시나리오 `인수 개수가 다를 때` 5·6단계).</details>
2. `order('사과', null)`에 기본값 1이 쓰이지 않는 이유와, `||`로 기본값을 흉내 낸 코드와 결과가 어떻게 다른가?
   <details><summary>답</summary>기본값은 값이 `undefined`일 때만 평가된다(8.6.3). `null`·`0`은 그대로 쓰여 `사과 null개`·`사과 0개`. `count || 1`은 왼쪽이 falsy면 오른쪽을 쓰므로 `null`·`0`에도 1이 된다(예제 `default-param.js`, 본문 동작 원리).</details>
3. 시나리오 테스트가 함수 머리 줄에 `__p(...)`를 붙이고 맨 앞에 `__wrap`을 두는 이유는? 예제에 화살표 함수를 쓰면 무엇이 깨지나?
   <details><summary>답</summary>함수 선언은 코드 실행 전에 만들어지므로 맨 앞에서 감싸면 모든 호출의 인수·반환을 기록하고, 머리 줄 `__p`는 기본값 적용 후 매개변수 값을 기록한다. 계측 정규식은 `^function 이름(…) {$` 머리 줄만 잡으므로 화살표 함수나 여러 줄 머리는 기록되지 않아 대조가 실패한다(`concept.test.ts` `runInstrumented`, 계획 8절 2단계 주의사항).</details>
4. 왜 함수 안에서 다른 함수를 부르는 시나리오를 넣지 않았나? `eval-order`는 왜 괜찮은가?
   <details><summary>답</summary>함수 안 호출을 보이려면 호출 영역이 두 겹 쌓여 실행 컨텍스트 스택(미학습)을 앞서 보이게 된다. `eval-order`의 `square` 호출은 `add`의 인수 평가 중이라 `add` 호출이 시작되기 전에 끝나므로 한 번에 호출 하나만 진행된다(계획 3절, simplifications 1).</details>
5. `firstMultiple(5, 4)`에서 `'8 아님'`과 `'없음'`이 출력되지 않는 이유는? `return i;`를 `break;`로 바꾸면 출력은?
   <details><summary>답</summary>`i`가 8일 때 `return i;`가 반복문과 함수 호출을 함께 끝내 그 뒤 문장은 실행되지 않는다. `break;`면 반복문만 끝나고 그 뒤 `return '없음'`이 실행되어 마지막 줄이 `없음`이 된다(`8 아님`은 여전히 출력되지 않음 — `break`가 `console.log`보다 앞). 본문 Callout ⑤, 예제 `return-in-loop.js`.</details>
