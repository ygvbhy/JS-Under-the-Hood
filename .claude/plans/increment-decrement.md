# 증감 연산자(`x++`와 `++x`) 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-27
- 기준: `main` @ `19a3a6d`

## 0. 요약
- 목적: 로드맵 4번 개념 `/concepts/increment-decrement`를 추가한다. `x++`와 `++x`는 변수에 같은 값을 남기지만 식의 값이 다르고, 값 변경(부수 효과)은 식을 평가하는 그 순간 일어난다는 것을 예제, 퀴즈, "읽기 → 쓰기 → 식의 값" 시뮬레이터로 보여 준다.
- 범위: 새 개념 폴더 1개 + e2e·빌드 테스트에 케이스 추가 + `docs/content-guide.md` 9단계 목록 문구 + 로드맵 상태. 공통 코드와 기존 개념 6개는 바꾸지 않는다.
- 위험: 시나리오 단계의 읽기·쓰기 순서나 값을 손으로 잘못 적는 것 → 테스트가 명세 규칙(후위는 옛 값, 전위는 새 값)을 직접 계산하고, 단계마다 소스를 vm으로 실행해 대조한다.
- 복잡도: 중간 · Consensus: 생략 (equality-operators와 같은 구조라 새 공통 패턴이 없다. 명세 원문과 vm 실행 결과로 사실을 미리 확인했고, 위험 지점은 의미 검사·소스 대조 테스트로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항
- 로드맵(`.claude/plans/concept-roadmap-ch1-12.md`) 4번. 『모던 자바스크립트 Deep Dive』 7장 범위(사용자 진도 1~12장).
- 핵심: `x++`·`++x`·`x--`·`--x`의 식의 값, 단독 문으로 쓸 때 차이가 없음, 대입 식·복합 대입 식(`+=`)·연쇄 대입의 값.
- 사용자 결정(2026-10-27)으로 추가: ① `x = x++` 시뮬레이터 시나리오 ② `i++ + i` 시뮬레이터 시나리오 ③ 문자열 변수에 `++`(예제 + 퀴즈) ④ `5++`는 SyntaxError(본문 한 줄, 테스트로 검증).
- 단계별 시뮬레이터를 넣는다(로드맵 결정).
- `docs/content-guide.md` 절차를 따르고 개념 폴더만 추가한다(테스트 확장 제외).

### 유지해야 하는 기존 동작
- 기존 개념 6개의 페이지·시뮬레이터·테스트는 그대로 통과하고, 그 파일은 수정하지 않는다.
- e2e `객체` 검색 결과는 정확히 1개다(`tests/e2e/navigation.spec.ts:16-17`). 새 meta의 `title`·`summary`·`tags`에 `객체`를 넣지 않는다.
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위
- BigInt의 `++`(BigInt::add), 객체 프로퍼티의 증감(`obj.n++`, 로드맵 6번), `const` 변수에 증감(TypeError, 본문 한 줄 언급만), 함수 호출 식에 증감(`f()++`가 SyntaxError가 아니라 실행 중 ReferenceError인 web-compat 예외).
- `+=` 외 복합 대입 연산자, 논리 대입(`&&=`·`||=`·`??=`), 구조 분해 할당.
- 연산자 우선순위·결합 순서의 일반론(연쇄 대입이 오른쪽부터 묶인다는 것만 쓴다).
- 기존 개념 `related`에 새 개념을 역방향으로 연결하는 일(9절 후보).

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 개념 추가 절차: `docs/content-guide.md` 1~10단계. 라우트는 폴더 스캔(`app/routes.ts`), 레지스트리는 glob, 홈 정렬은 제목 `localeCompare(…, 'ko')`(`app/lib/concepts.ts:37-39`).
- 가장 가까운 참고 구현: `app/concepts/equality-operators/`(`scenarios.ts`의 `Val`·헬퍼·단계 구성, `ComparisonView.tsx`의 배지·`formatVal`·빈 상태 문구·클래스 문자열, `Simulator.tsx` 19줄 래퍼, `concept.test.ts`의 "본문 주장 검증"·소스 대조·바인딩 값 검사). 바인딩 값이 단계 사이에 바뀌는 표현은 `primitives-and-objects/scenarios.ts`(`changed` 표시)를 참고한다.
- 공통 테스트 자동 대상: `tests/examples.test.ts`(L1), `tests/content-integrity.test.ts`(L3), `tests/build/build-output.test.ts`(레지스트리·HTML·sitemap·JSON-LD). 개념별 프리렌더 블록은 `build-output.test.ts:163-186`(equality)처럼 수동 추가.
- e2e 개념별 상수 `tests/e2e/helpers.ts:3-12`, a11y 케이스 `tests/e2e/a11y.spec.ts:125-161`, responsive 케이스 `tests/e2e/responsive.spec.ts:101-146`.
- 예제 실행 환경: `tests/helpers/run-example.ts`(`runInNewContext`, sandbox는 `console`만, `util.format`).
- 명세(tc39.es/ecma262, ES2027 초안, 2026-10-27 원문 확인):
  - 후위 증가 `LeftHandSideExpression ++` Evaluation(13.4.2.1): ① lhs 평가(참조) ② web-compat이면 ReferenceError ③ `oldValue = ToNumeric(GetValue(lhs))` ④ Number면 `newValue = Number::add(oldValue, 1)`(BigInt면 BigInt::add) ⑤ `PutValue(lhs, newValue)` ⑥ **`oldValue`를 돌려준다**.
  - 전위 증가 `++ UnaryExpression`(13.4.4.1): 같은 절차, **`newValue`를 돌려준다**. 감소(`--`)는 1을 뺀다.
  - Early Errors(13.4.1): 피연산자의 AssignmentTargetType이 invalid면 SyntaxError.
  - 대입 `LHS = AssignmentExpression`(13.15.2): leftRef 평가 → 오른쪽 평가·GetValue → `PutValue(leftRef, rightValue)` → **`rightValue`를 돌려준다**. 복합 대입: leftRef → `leftValue = GetValue` → 오른쪽 평가 → `result = ApplyStringOrNumericBinaryOperator` → PutValue → **`result`를 돌려준다**. 문법이 `LHS = AssignmentExpression`이라 `p = q = 7`은 `p = (q = 7)`이다.
  - EvaluateStringOrNumericBinaryExpression(13.15.4): 왼쪽 피연산자 평가·GetValue → 오른쪽 평가·GetValue → 연산. 즉 `i++ + i`는 `i++`의 부수 효과가 끝난 뒤 오른쪽 `i`를 읽는다.
  - 앵커 존재 확인: `sec-update-expressions`, `sec-update-expressions-static-semantics-early-errors`, `sec-postfix-increment-operator`, `sec-postfix-increment-operator-runtime-semantics-evaluation`, `sec-prefix-increment-operator`, `sec-prefix-increment-operator-runtime-semantics-evaluation`, `sec-postfix-decrement-operator`, `sec-prefix-decrement-operator`, `sec-assignment-operators`, `sec-assignment-operators-runtime-semantics-evaluation`, `sec-evaluatestringornumericbinaryexpression`, `sec-tonumeric`, `sec-getvalue`, `sec-putvalue`.
- MDN(ko) 200 확인: `Reference/Operators/Increment`, `Decrement`, `Assignment`, `Addition_assignment`, `Guide/Expressions_and_operators`.
- 예제 초안 실제 출력(Node 24.22.1 `vm`, `run-example.ts`와 같은 방식, 8절 1단계 원문 그대로):

  | 예제 | 출력 (`console.log` 줄마다) |
  | - | - |
  | `postfix-prefix.js` | `2 1 2 2` |
  | `statement.js` | `6` |
  | `string-operand.js` | `number 5 number 6` |
  | `assignment-value.js` | `3 7 7` / `15 15` |
  | `self-assign.js` | `1` |
  | `operand-order.js` | `3 2` |

- 본문 서술 근거(vm): `5++`·`++5`·`(a + b)++`는 파싱 단계 SyntaxError(`new vm.Script`), `(a)++`는 파싱 성공. `const k = 1; k++` → TypeError, 이후 `k`는 1. `let n = 5; [n--, n, --n, n]` → `[5,4,3,3]`. `let p; typeof (p = 3)` → `"number"`. `function f(){return 1} f()++`는 파싱 성공·실행 시 ReferenceError(제외 범위 근거).
- 홈 정렬(실행 확인): 단축 평가 → 동등 비교 → 숫자 타입 → 암묵적 타입 변환 → 원시 값과 객체 → **증감 연산자** → typeof 연산자. 새 개념은 여섯 번째 카드다.
- summary 초안 122자, `객체` 없음(실행 확인).

### 추정
- 없음

## 3. 구현 전략
- equality-operators와 같은 구조(예제 → meta → 시나리오·불변식 테스트 → 시각화 → 래퍼 → 본문 → e2e)로 개념 폴더를 만든다.
- 시뮬레이터는 식 하나를 평가하는 동안 일어나는 일을 **사건 목록**(읽기 GetValue / 쓰기 PutValue / 식의 값)으로 한 단계에 하나씩 쌓아 보여 주고, 쓰기 단계에서 변수 영역의 값이 바로 바뀐다. "값이 바뀌는 시점"이 이 개념의 핵심이라, `x = x++`에서 x가 2가 되었다가 1로 덮어쓰이는 과정과 `i++ + i`에서 오른쪽 `i`가 이미 2인 것을 단계로 드러내는 이 모양을 골랐다.
- 버린 대안: ① 시뮬레이터 없이 표만. 쓰기가 식의 중간에 일어나는 순서를 표로는 보여 주기 어렵다. ② 명세 절차(참조 평가 → ToNumeric → add → PutValue → return)를 모두 단계로. 시나리오 피연산자가 모두 숫자라 ToNumeric은 값이 그대로이고, 참조 평가는 화면에 보일 값이 없어 단계만 늘린다. 설명 문장과 `simplifications`로 다룬다. ③ equality의 `ComparisonView` 재사용. AGENTS 규칙상 개념 간 공유 부품은 `app/simulator/`뿐이고 상태 모양도 다르다. 클래스 문자열만 같게 쓴다.
- 선언문의 초기화(`const b = a++`)는 명세상 PutValue가 아니라 바인딩 초기화이므로 "쓰기" 사건으로 만들지 않고, 식의 값이 정해지는 단계에서 변수가 "새로 생김"으로 나타나게 한다.

## 4. 변경 파일
- 추가 `app/concepts/increment-decrement/`:
  - `meta.ts`, `content.mdx`, `route.tsx`(content-guide 6단계 템플릿)
  - `examples/` 6개: `postfix-prefix.js`, `statement.js`, `string-operand.js`, `assignment-value.js`, `self-assign.js`, `operand-order.js`
  - `scenarios.ts`(상태 타입 + 시나리오 3개), `EvaluationView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`
- 수정(추가만):
  - `tests/e2e/helpers.ts`: `INCREMENT_PATH`, `INCREMENT_SIMULATOR_NAME`
  - `tests/e2e/a11y.spec.ts`: 새 페이지 axe + 시나리오 3개 모든 단계 axe(라이트·다크 describe 안)
  - `tests/e2e/responsive.spec.ts`: 새 경로 가로 스크롤 + 시뮬레이터 끝까지 진행
  - `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 블록
  - `docs/content-guide.md` 9단계: e2e 대상 개념 목록에 `increment-decrement` 추가(문구 1줄)
  - `.claude/plans/concept-roadmap-ch1-12.md`: 4번 계획 문서·상태 갱신
- 변경하지 않음: `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, 기존 개념 폴더 6개, `package.json`(의존성 없음), `AGENTS.md`.

## 5. 위험 요소
- 시나리오 사건(읽기·쓰기·식의 값)의 순서나 값을 잘못 적음 → 틀린 절차를 보여 줌 → 2단계 의미 검사(후위/전위 규칙을 테스트가 계산), 읽기 값 = 그 시점 변수 값 검사, 단계별 소스 대조(vm), 음성 확인.
- "후위 증가는 문이 끝난 뒤(또는 나중에) 값을 늘린다"는 오해를 강화하는 문구 → 본문·단계 설명은 "식을 평가하는 그 순간 변수에 새 값을 넣고, 식의 값으로는 옛 값을 돌려준다"로 통일한다(5단계 체크).
- 결과의 원인을 "복사본을 돌려준다"처럼 설명 → AGENTS 정확성 원칙. 명세 용어(옛 값 oldValue, 새 값 newValue, 식의 값)로만 설명한다.
- `x = x++` 설명에서 왼쪽 참조를 먼저 정하는 단계를 생략 → 단계 설명 문장에 "대입할 대상 x를 먼저 정해 두고"를 넣고 `simplifications` 1에 밝힌다.
- 시나리오 라벨에 `++`·`=` 같은 기호를 쓰면 radio 이름 매칭이 헷갈릴 수 있음 → 라벨은 한국어 설명형(`후위와 전위`, `자기 자신에 대입`, `피연산자 평가 순서`)으로 한다.
- `객체` 검색 1건 가정 → meta 세 필드 검사(1단계 완료 조건).
- 홈 카드 순서 변화(새 개념이 여섯 번째) → 정렬 규칙대로의 결과. `navigation.spec.ts`는 검색 후 1건만 확인하므로 영향 없음.
- 공통 셸 미수정이므로 기존 시뮬레이터 회귀는 없어야 한다 → 전체 검증 순서로 확인.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`.
- 정확성: 예제 6개 실제 출력 = `expectedOutput`, "본문 주장 검증", 시나리오 의미·소스 대조·바인딩 값 검사, 음성 확인(2단계 5가지).
- 브라우저(빌드 결과 `serve` 또는 dev 서버 재시작 후 `/concepts/increment-decrement`):
  1. 첫 화면: "검토 중" 배지, 학습 목표, 선행 개념 중 `type-coercion`·`primitives-and-objects` 링크, 퀴즈가 라디오 UI.
  2. 시나리오 `후위와 전위`: 3단계에 사건 `읽기: a의 값 1`, 4단계 `쓰기: a에 2를 넣음` + 변수 `a = 2`(값이 바뀜), 5단계 `식의 값: a++ → 1` + `b = 1`(새로 생김). 9단계 `식의 값: ++c → 2`. 마지막 콘솔 `2 1 2 2`.
  3. 시나리오 `자기 자신에 대입`: 4단계에 `x = 2`(값이 바뀜), 6단계에 `x = 1`(값이 바뀜), 7단계 `식의 값: x = x++ → 1`, 콘솔 `1`.
  4. 시나리오 `피연산자 평가 순서`: 6단계 `읽기: i의 값 2`, 7단계 `식의 값: i++ + i → 3` + `sum = 3`, 콘솔 `3 2`.
  5. 375px·다크 모드에서 2~4 반복, 가로 스크롤 없음, 키보드 ←/→/Home 동작, 콘솔 에러 0.
  6. 홈: 카드 7개(새 개념 여섯 번째), `객체` 검색 1건, `증감` 검색 1건.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제·meta·본문 주장 검증
- 대상: `examples/*.js` 6개, `meta.ts`, `concept.test.ts`("본문 주장 검증" describe만), `route.tsx`, h2 3개만 있는 `content.mdx` 골격
- 현재: 폴더 없음
- 변경:
  - 예제를 아래 원문 그대로 만든다(파일 끝 줄바꿈 1개, 줄 번호를 시뮬레이터가 쓴다).

    `postfix-prefix.js` (시나리오)
    ```js
    let a = 1;
    const b = a++;
    let c = 1;
    const d = ++c;
    console.log(a, b, c, d);
    ```
    `statement.js`
    ```js
    let n = 5;
    n++;
    ++n;
    n--;
    console.log(n);
    ```
    `string-operand.js`
    ```js
    let s = '5';
    const t = s++;
    console.log(typeof t, t, typeof s, s);
    ```
    `assignment-value.js`
    ```js
    let p;
    let q;
    const r = (p = 3);
    p = q = 7;
    console.log(r, p, q);
    let m = 10;
    console.log(m += 5, m);
    ```
    `self-assign.js` (시나리오)
    ```js
    let x = 1;
    x = x++;
    console.log(x);
    ```
    `operand-order.js` (시나리오)
    ```js
    let i = 1;
    const sum = i++ + i;
    console.log(sum, i);
    ```
  - `meta.ts`:
    - `slug: 'increment-decrement'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: ['type-coercion', 'primitives-and-objects']`
    - `title: '증감 연산자: x++와 ++x는 어떤 값이 되나'`
    - `summary`(122자): `x++와 ++x는 둘 다 변수의 값을 1 늘리지만 식의 값이 다릅니다. 후위는 늘리기 전 값, 전위는 늘린 뒤 값이 됩니다. 대입 식도 값을 가지며, 값이 바뀌는 시점을 알면 x = x++의 결과를 설명할 수 있습니다.`
    - `tags`(`객체` 금지): `증감 연산자`, `증가 연산자`, `감소 연산자`, `후위 증가`, `전위 증가`, `++`, `--`, `x++`, `++x`, `부수 효과`, `side effect`, `대입 연산자`, `할당 연산자`, `복합 대입`, `+=`, `평가 순서`, `UpdateExpression`, `ToNumeric`
    - `goals`: ① `x++`와 `++x`가 변수에 남기는 값은 같고 식의 값(옛 값/새 값)만 다르다는 것을 설명할 수 있다 ② 증감 연산자가 식을 평가하는 그 순간 변수의 값을 바꾼다는 것으로 `i++ + i`와 `x = x++`의 결과를 예측할 수 있다 ③ 대입 식과 복합 대입 식이 값을 가진다는 것을 알고 연쇄 대입의 결과를 예측할 수 있다 ④ 문자열 변수에 `++`를 쓰면 숫자로 바꾼 값으로 계산하고 옛 값도 숫자가 된다는 것을 설명할 수 있다
    - `prerequisites`: `{ label: '표현식과 문' }`, `{ label: '연산자' }`, `{ label: '암묵적 타입 변환', slug: 'type-coercion' }`, `{ label: '원시 값과 객체', slug: 'primitives-and-objects' }`
    - `examples`: 위 6개(id는 파일명에서 `.js`를 뺀 것). `expectedOutput`은 `[]`로 두고 `npm test` 실제 출력을 2절 표와 대조한 뒤 채운다(다르면 멈추고 원인 확인).
    - `simplifications`:
      1. 시뮬레이터는 식을 평가하는 동안 일어나는 일을 "읽기"(명세의 GetValue), "쓰기"(PutValue), "식의 값"으로만 보여 준다. 명세는 먼저 피연산자나 대입의 왼쪽을 평가해 값을 넣을 대상(Reference Record)을 정하는데, 이 단계는 따로 표시하지 않고 설명 문장으로만 다룬다.
      2. 명세의 증감 연산자는 읽은 값을 먼저 ToNumeric으로 숫자로 바꾼다. 시뮬레이터 시나리오의 값은 모두 숫자라 이 단계에서 값이 그대로이므로 표시하지 않는다. 문자열의 경우는 예제로 다룬다.
      3. 선언문의 초기화(`const b = a++`)는 명세상 대입(PutValue)이 아니라 바인딩 초기화이므로 "쓰기"로 표시하지 않고, 변수가 새로 생기는 것으로 표시한다.
      4. "읽기", "쓰기", "식의 값", "옛 값", "새 값"은 교육용 이름이다(옛 값·새 값은 명세 알고리즘의 oldValue·newValue). "부수 효과"는 명세 용어가 아니라 식이 값을 만드는 것 말고 변수 등 상태를 바꾸는 일을 가리키는 일반 용어다.
      5. BigInt의 증감(BigInt::add), 객체 프로퍼티의 증감, 함수 호출 식에 증감을 쓸 때 SyntaxError가 아니라 실행 중 ReferenceError가 나는 예외(명세의 web-compat)는 다루지 않는다.
      6. 복합 대입 연산자는 `+=`만, 대입은 변수에 하는 것만 다룬다. 다른 복합 대입·논리 대입(`&&=` 등)·구조 분해 할당은 다루지 않는다.
      7. 변수는 선언문이 실행된 뒤에만 표시한다(호이스팅·TDZ는 별도 개념에서 다룬다). 이 코드가 선언한 변수만 표시한다.
      8. `console.log`는 호스트 API다. 예제의 `typeof` 결과(`number`)는 문자열이며 따옴표 없이 출력된다.
    - `references`(라벨 형식 `ECMAScript 명세 — …`, `MDN — …`): 명세 Update Expressions, Postfix Increment Operator: Runtime Semantics: Evaluation, Prefix Increment Operator: Runtime Semantics: Evaluation, Update Expressions: Static Semantics: Early Errors, Assignment Operators: Runtime Semantics: Evaluation, EvaluateStringOrNumericBinaryExpression, ToNumeric / MDN(ko) 증가 연산자(++), 감소 연산자(--), 할당 연산자(=), 더하기 할당(+=), 표현식과 연산자(가이드). URL은 2절에서 확인한 것만 쓴다.
  - `concept.test.ts` "본문 주장 검증"(`runInNewContext`·`new Script`):
    - `5++`, `++5`, `(a + b)++`는 `new Script`에서 SyntaxError, `(a)++`는 파싱 성공.
    - `const k = 1; k++` → TypeError.
    - `let n = 5; [n--, n, --n, n]` → `[5,4,3,3]`.
    - `let p; typeof (p = 3)` → `'number'`.
- 이유: 페이지의 사실 근거를 먼저 고정한다(가장 큰 위험은 내용 정확성).
- 주의사항: `meta.ts`는 `ConceptMeta` 타입 외 import 금지. 예제 폴더는 Prettier 대상이 아니므로 `(p = 3)`·`m += 5` 같은 원문이 바뀌지 않는다.
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/increment-decrement` 통과. 실제 출력 = 2절 표. `node -e`로 meta의 `title`·`summary`·`tags`에 `객체`가 없음을 확인한다.

### 2. 상태 모델·시나리오·의미 불변식 테스트
- 대상: `scenarios.ts`, `concept.test.ts`
- 변경:
  - 상태 타입(전체 스냅샷):
    ```ts
    export type Val = { type: 'number'; display: string } // 시나리오 값은 모두 숫자
    export type Binding = {
      name: string
      declaredWith: 'let' | 'const'
      value: Val
      changed?: 'created' | 'updated' // 그 단계에서 새로 생김 / 값이 바뀜. 다음 단계에서 해제
    }
    export type EvalEvent =
      | { kind: 'read'; name: string; value: Val } // 변수의 값을 읽음 (GetValue)
      | { kind: 'write'; name: string; value: Val } // 변수에 새 값을 넣음 (PutValue)
      | { kind: 'result'; code: string; value: Val } // 식 code의 값이 정해짐
    export type Evaluation = { code: string; events: EvalEvent[] } // code: 그 줄에서 평가하는 식 전체
    export type IncState = { bindings: Binding[]; evaluation?: Evaluation }
    ```
    `Val`·`Binding` 생성은 헬퍼(`num`, `bind`)로만 한다.
  - 시나리오 3개(id·label·exampleId): `postfix-prefix`·`후위와 전위`·`postfix-prefix`, `self-assign`·`자기 자신에 대입`·`self-assign`, `operand-order`·`피연산자 평가 순서`·`operand-order`.
  - 단계 구성: 첫 단계 "실행 전"(`line` 없음, `{ bindings: [] }`, `output: []`). 리터럴로 초기화하는 선언(`let a = 1`)은 한 단계(`evaluation` 없음, 새 바인딩 `created`). 증감이 들어간 줄은 사건 하나당 한 단계(이전 단계 `events`에 하나를 더함). `write` 단계에서 그 변수 값이 바뀌고 `updated`. 선언문의 마지막 `result` 단계에서 선언한 변수가 `created`로 생긴다. `console.log` 단계는 `evaluation` 없음.
    - `postfix-prefix`(10단계): 실행 전 → `a = 1` → [`a++`] 읽기 a 1 → 쓰기 a 2 → 식의 값 `a++` 1 + `b = 1` → `c = 1` → [`++c`] 읽기 c 1 → 쓰기 c 2 → 식의 값 `++c` 2 + `d = 2` → 출력 `2 1 2 2`
    - `self-assign`(8단계): 실행 전 → `x = 1` → [`x = x++`] 읽기 x 1(설명: 대입할 대상 x를 먼저 정해 두고 오른쪽 `x++`를 평가) → 쓰기 x 2 → 식의 값 `x++` 1 → 쓰기 x 1(설명: 대입이 오른쪽 식의 값 1을 x에 넣어 앞의 2를 덮어씀) → 식의 값 `x = x++` 1 → 출력 `1`
    - `operand-order`(8단계): 실행 전 → `i = 1` → [`i++ + i`] 읽기 i 1 → 쓰기 i 2 → 식의 값 `i++` 1 → 읽기 i 2(설명: 왼쪽 피연산자 평가가 끝난 뒤 오른쪽을 평가하므로 이미 바뀐 값) → 식의 값 `i++ + i` 3 + `sum = 3` → 출력 `3 2`
  - `concept.test.ts`에 추가:
    - 시나리오마다 `assertScenarioInvariants`, id 순서 고정, 첫 단계 빈 상태·`line` 없음.
    - 구조: 바인딩 이름 중복 없음. `changed`는 테스트가 직전 단계와 비교해 계산한 값과 같다(새 이름 → `created`, 값이 다름 → `updated`, 그대로 → 없음). 같은 `evaluation.code`가 이어지는 동안 `events`는 직전 단계 `events`에 하나를 더한 것(앞부분 동일). `evaluation.code`는 그 단계 `line` 소스 줄에서 선언이면 초기화 식(`= ` 뒤 `;` 앞), 식 문이면 `;` 앞 전체와 같다. 출력 단계는 `evaluation`이 없다. 마지막 사건은 `code`가 `evaluation.code`인 `result`다(그 식의 평가가 끝나는 단계).
    - 사건과 변수의 일관성: `read` 단계에서 그 이름의 변수 값 = 읽은 값. `write` 단계에서 그 이름의 변수 값 = 쓴 값이고 `updated`. 변수 값은 `write` 단계에서만 바뀐다. 새 변수는 `evaluation`이 없는 선언 단계나 선언문의 마지막 `result` 단계에서만 생기고 값은 그 `result` 값과 같다.
    - 의미 검사(테스트가 명세 규칙으로 계산): `result` 사건의 `code`가 `name++`·`name--`·`++name`·`--name`이면, 바로 앞 두 사건이 같은 이름의 `read`와 `write`이고 `write` 값 = `read` 값 ± 1, `result` 값은 후위면 `read` 값(옛 값), 전위면 `write` 값(새 값). `code`가 `name = rhs`면 바로 앞 사건은 `name`에 값 V를 넣는 `write`, 그 앞 사건은 값이 V인 `rhs`의 `result`이고, `result` 값 = V(대입 식의 값 = 오른쪽 값). `code`가 `left + right`면 `left`의 `result` 뒤에 `right`의 읽기(또는 `result`)가 오고, `result` 값 = 두 값의 합(왼쪽 → 오른쪽 평가 순서).
    - 소스 대조(vm): 각 `evaluation`의 마지막 단계마다 소스의 1 ~ (`line.from` − 1)줄을 실행한 뒤 `const __r = (code);`를 실행하고 `JSON.stringify([__r, ...그 단계 변수 이름])`을 얻어, `result` 값과 그 단계 변수 값(선언문이면 새 변수 포함 — 선언 변수는 `__r`로 대신)과 대조한다.
    - 바인딩 값: 예제 원문 끝에 `console.log(JSON.stringify([...변수 이름]))`을 붙여 `runExample`로 실행하고 마지막 단계 바인딩과 대조.
- 이유: 단계 내용이 명세 절차와 같음을 자동으로 보장한다.
- 주의사항: 의미 검사의 대입 규칙은 이 페이지 시나리오(`x = x++`)의 모양만 처리하면 된다. 처리하지 못하는 `code` 모양이 나오면 테스트가 실패하도록 한다(조용히 건너뛰지 않음).
- 완료 조건: `npm test -- app/concepts/increment-decrement/concept.test.ts` 통과. 음성 확인 5가지를 일부러 넣어 실패를 확인하고 되돌린다: ① `postfix-prefix` `a++`의 식의 값을 `num(2)`로(의미·소스 대조) ② `self-assign` 두 번째 쓰기 값을 `num(2)`로(의미·바인딩 값) ③ `operand-order` 두 번째 읽기 값을 `num(1)`로(사건·변수 일관성) ④ `postfix-prefix` 쓰기 단계를 빼고 다음 단계 사건을 그대로 둠(사건 누적) ⑤ `self-assign` 읽기 단계의 x에 `updated`를 붙임(`changed` 계산).

### 3. 시각화 컴포넌트 EvaluationView
- 대상: `EvaluationView.tsx`, `EvaluationView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `IncState`를 그린다.
  - "평가 중인 식" 영역(`section` + `useId` `aria-labelledby`): 없으면 "아직 평가 중인 식이 없습니다." 있으면 식 소스(`font-mono`)와 사건 순서 목록(`<ol>`): 사건마다 종류 배지(`읽기`/`쓰기`/`식의 값`, 텍스트) + 문장 — 읽기 `a의 값 1`, 쓰기 `a에 2를 넣음`, 식의 값 `a++ → 1`.
  - "변수" 영역: ComparisonView와 같은 모양(`let`/`const` 배지, `이름 = 값`, 타입 배지 `숫자`, `새로 생김`/`값이 바뀜` 배지, 강조 배경 `bg-highlight`).
  - 스타일 토큰·배지·줄바꿈 클래스 문자열은 `equality-operators/ComparisonView.tsx`와 같게 쓴다(import하지 않음).
- 이유: 상태 모양이 달라 시각화를 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더되는 첫 단계(빈 상태)가 JS 없이 의미 있게 보여야 한다. 애니메이션은 `motion-safe:`만. 색만으로 구분하지 않는다(배지 텍스트). 375px에서 넘치지 않게 `flex-wrap`·`break-words [overflow-wrap:anywhere]`. `prevState`는 쓰지 않는다(`changed`가 상태에 있음).
- 완료 조건: `EvaluationView.test.tsx` 통과 — 빈 상태 문구 2개, 사건 3개 상태에서 `읽기`·`쓰기`·`식의 값` 배지와 문장(`a의 값 1`, `a에 2를 넣음`, `a++ → 1`), `새로 생김`·`값이 바뀜` 배지, 사건 순서가 `<ol>` 순서와 같음.

### 4. Simulator 래퍼
- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 변경: `equality-operators/Simulator.tsx`와 같은 모양. `label="증감 연산자 시뮬레이터"`, `renderState={(state) => <EvaluationView state={state} />}`.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `후위와 전위` "실행 전", 다음 클릭 시 1번 줄 강조(`aria-current="step"`), 시나리오 전환 시 0단계로 돌아감(equality `Simulator.test.tsx`와 같은 범위).

### 5. 본문 content.mdx
- 대상: `content.mdx`(맨 위에서 `Simulator`, `scenarios` import)
- 변경:
  - `## 동작 원리`
    - 증감 연산자 네 개: `x++`(후위 증가), `++x`(전위 증가), `x--`(후위 감소), `--x`(전위 감소). 모두 ① 변수의 값을 읽어 숫자로 바꾸고(ToNumeric) ② 1을 더하거나 뺀 새 값을 변수에 넣은 뒤 ③ 식의 값을 돌려준다. 후위는 옛 값, 전위는 새 값. 변수에 남는 값은 같다.
    - 부수 효과: 식이 값을 만드는 것 말고 변수 값을 바꾸는 일. 증감 연산자는 식을 평가하는 그 순간 변수에 새 값을 넣는다. 그래서 단독 문(`n++;`)으로 쓰면 식의 값을 쓰지 않으므로 후위·전위 차이가 없다.
    - 대입도 식이다: `p = 3`의 값은 오른쪽 값 3, `m += 5`의 값은 계산 결과. `p = q = 7`은 `p = (q = 7)`로 묶인다.
    - 피연산자가 문자열이면 숫자로 바꾼 값으로 계산하고, 후위가 돌려주는 옛 값도 숫자다([암묵적 타입 변환](/concepts/type-coercion) 링크, ToNumber 표는 반복하지 않음).
    - 증감 연산자는 값을 넣을 수 있는 대상에만 쓸 수 있다: `5++`, `(a + b)++`는 실행 전에 SyntaxError. `const` 변수에 쓰면 TypeError(재할당이므로, [원시 값과 객체](/concepts/primitives-and-objects)의 재할당 용어와 연결).
  - `## 예제`: 예제 6개를 `file=` 코드 펜스로. `PredictQuiz` 6개(예제마다 1개; 선택지 3~4개, 여러 줄 출력이면 질문에 ' / ' 안내, 정답은 실제 출력). 시나리오 예제 3개(`postfix-prefix`, `self-assign`, `operand-order`) 뒤에 `### 시뮬레이터로 확인하기` + 독립된 줄의 `<Simulator scenarios={scenarios} />`.
  - `## 결과와 이유`: JSX `<table>`(식 / 변수에 남는 값 / 식의 값), 예제별 이유 문단, `Callout type="misconception"` 5개: ① "`x++`는 문이 끝난 뒤에 값을 늘린다"(`i++ + i`) ② "`x = x++`는 x를 1 늘린다" ③ "`x++;`와 `++x;`는 단독 문에서도 결과가 다르다" ④ "`s++`는 문자열 `'5'`를 돌려준다" ⑤ "대입은 값을 만들지 않는다"(연쇄 대입·`(p = 3)`).
- 주의사항: 미학습 개념(실행 컨텍스트, 반복문 심화, 프로퍼티, `try...catch`)을 설명하지 않는다. 같은 대상은 같은 이름으로 부른다("옛 값/새 값", "식의 값", "넣는다"로 통일; "할당"과 "대입"을 섞지 않고 "대입"으로 쓴다 — 단 tags에는 동의어 `할당 연산자` 포함). 특정 스타일을 강요하는 권고("++ 대신 += 1을 써야 한다")는 쓰지 않는다. CommonMark 굵게 함정과 Callout 안 인라인 코드 줄바꿈(content-guide 4단계)을 피한다.
- 완료 조건: `npm test` 전체 통과. `npm run build` 후 `build/client/concepts/increment-decrement/index.html`에 `<details` 6개 이상, 시뮬레이터 0단계 텍스트, 라디오 3개 이상, `grep -o '<code>[^<]*  [^<]*</code>'` 0건, 남은 `**` 0건.

### 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인
- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`, `.claude/plans/concept-roadmap-ch1-12.md`
- 변경: equality-operators 케이스를 본떠 새 개념 케이스를 추가한다(기존 케이스 수정 없음). a11y 시뮬레이터 케이스는 `test.slow()`, 시나리오 라벨 3개(`후위와 전위`, `자기 자신에 대입`, `피연산자 평가 순서`). 빌드 블록은 `단계 1: 실행 전`, `아직 평가 중인 식이 없습니다.`, `아직 표시할 변수가 없습니다.`, region `aria-label="증감 연산자 시뮬레이터"`, 시나리오 라벨 3개, `<details` 6개 이상. 로드맵 4번 행의 계획 문서·상태를 갱신하고 진행 기록 한 줄을 추가한다.
- 완료 조건: AGENTS 검증 순서 전체 통과. 6절 브라우저 시나리오 1~6을 확인하고 스크린샷 1장 이상.

## 9. 추가 개선 후보
- 기존 개념 `related`에 `increment-decrement` 역방향 연결(`type-coercion`, `primitives-and-objects`).
- 로드맵 5번(`switch`)·7번(함수 호출)에서 반복문 카운터(`i++`)를 쓸 때 이 페이지를 선행 개념으로 링크.

## 구현 진행

- baseline (2026-10-27, `19a3a6d`): lint·format:check·typecheck 오류 0, `npm test` 650 통과, `test:build` 56 통과, e2e 103 통과·3 건너뜀(기존 의도된 3건). 사용자 dev 서버가 5173에서 실행 중(새 폴더 확인 시 재시작 필요 — 사용자 서버라 건드리지 않고 빌드 결과 `serve`로 확인)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 118 통과, lint·typecheck 0. 예제 6개가 계획 원문과 바이트 동일, 실제 출력 = 2절 표. title·summary·tags에 `객체` 없음, summary 122자
- [x] 2. 상태 모델·시나리오·의미 불변식 테스트 — 메인 재실행: vitest(개념) 45 통과, lint·typecheck·prettier 0. 단계 수 10/8/8. 음성 확인 ①~⑤는 서브에이전트 보고(각 1~3건 실패), 메인이 ①(`a++` 식의 값 2)을 재현해 3건 실패 확인 후 원복. 메인이 단계 설명을 명세와 대조해 1곳 수정("이 값은 … 바뀝니다" → "a의 값은 …"). 계획 외 보강 2건(선언 키워드 소스 대조, line 한 줄 검사) 수용
- [x] 3. EvaluationView — 메인 재실행: vitest(개념) 52 통과, lint·typecheck·prettier 0. 코드 확인: 사건 종류·변경 여부가 배지 텍스트로 전달, 클래스 문자열이 ComparisonView와 같음(import 없음), `flex-wrap`·`overflow-wrap:anywhere`, 하이드레이션 영향 값 없음(useId만). 메인 수정: 쓰기 문장 조사가 항상 '를'이라 `x에 1를 넣음`이 되던 것을 숫자 끝자리 발음에 맞춘 `을/를`로 고치고 테스트 1개 추가(self-assign `x에 1을 넣음`)
- [x] 4. Simulator 래퍼 — equality 래퍼와의 diff가 import·타입·주석·label·View 호출뿐. Simulator.test 3개 포함 통과
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·vm 근거와 대조해 수정: 미학습 배열 리터럴 예시 `[n--, n, --n, n]`을 배열 없는 문장으로(같은 본문 주장 테스트가 근거), "옛 값도 바뀐 뒤의 숫자"(새 값과 혼동) → "숫자로 바꾼 값" 3곳, `p = q = 7`의 "안쪽이 먼저 평가"(명세는 왼쪽 대상을 먼저 정함)에서 "먼저" 제거, "변수가 문자열이면" → "변수의 값이", 표의 `s++ (s는 '5')` 코드와 설명 분리. 메인 재실행: `npm test` 718 통과, build 성공, HTML `<details` 6·라디오 3·0단계 문구 있음·공백 깨진 code 0·`**` 0
- [x] 6. e2e·빌드 테스트 확장, 문서 갱신, 브라우저 확인 — 테스트 추가만(기존 파일의 삭제 줄은 content-guide 9단계 목록 문구와 로드맵 4번 행뿐). 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 718(baseline 650), `test:build` 63(baseline 56), e2e 115 통과·3 건너뜀(baseline 103·3). 브라우저(빌드 결과를 `serve` 4175로 띄워 Playwright, 사용자 dev 서버 5173은 건드리지 않음): 1280px 다크에서 세 시나리오 전 단계 사건·변수 텍스트가 6절 2~4와 일치(`a++ → 1` + `b = 1` 새로 생김, `x에 2를 넣음` → `x에 1을 넣음` 값이 바뀜 → `x = x++ → 1`, `i의 값 2` → `i++ + i → 3`), 콘솔 `2 1 2 2`·`1`·`3 2`. "검토 중" 배지, 선행 링크, 라디오 퀴즈 6. 375px 라이트 전 단계 가로 넘침 0, 키보드 →×3/←/Home 동작. 콘솔 에러 0. 홈 카드 7개(새 개념 여섯 번째), `객체` 검색 1건, `증감` 검색 1건. 스크린샷 2장(scratchpad)
- 리뷰 1차 (critical-code-review: 메인 직접 — diff가 개념 폴더 1개 + 테스트 추가라 sub agent 생략): Critical/High 0. Low 2(보고만): ① `content.mdx:30` const 설명만 "재할당"(primitives-and-objects 용어 연결 의도, 나머지는 "대입") ② `build-output.test.ts` 새 블록("일곱 번째")이 "다섯 번째" 블록 앞에 위치

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(변경 이력 없음). 달라진 점: ① 메인 검토에서 시뮬레이터 쓰기 문장의 조사를 숫자 발음에 맞춰 `을/를`로 고쳤다(구현 진행 3) ② 본문의 미학습 배열 리터럴 예시를 배열 없는 문장으로 바꾸고 표현 4곳을 명세에 맞게 고쳤다(구현 진행 5) ③ 서브에이전트가 계획 외 테스트 보강 2건(선언 키워드 소스 대조, `line` 한 줄 검사)을 넣었고 수용했다(구현 진행 2).
- `reviewedAt`은 `null`로 둔다. 사용자 콘텐츠 검토 승인은 별도로 받는다.

### 코드 리뷰
- Critical/High 0. Low 2건(`content.mdx:30`의 "재할당" 용어, `build-output.test.ts` 블록 순서)은 보고만 하고 고치지 않았다.

### 후속 작업
- [ ] 사용자 콘텐츠 검토 후 `meta.ts`의 `reviewedAt` 기록
- [ ] 9절 추가 개선 후보(역방향 `related`, 5·7번에서 `i++` 선행 링크)
- [ ] 로드맵 5번 "`switch`의 fall-through와 `break`·`continue`" 계획

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 시뮬레이터 쓰기 문장을 `x에 1를 넣음`에서 `x에 1을 넣음`으로 고쳤다 — 끝자리 숫자의 한국어 발음(영·일·삼·육·칠·팔은 받침 있음)으로 `을/를`을 고르는 함수 하나만 두었다. 시나리오 값이 모두 정수 `display`라 이 규칙으로 충분하고, 조사 라이브러리는 의존성 추가라 쓰지 않았다(`EvaluationView.tsx:25-28`).
- [Claude 판단] 본문의 `[n--, n, --n, n]` 예시를 "`n--`의 값은 옛 값 5이고 `n`은 4가 되며, 이어서 `--n`의 값은 새 값 3"이라는 문장으로 바꿨다 — 배열은 미학습 범위(AGENTS 규칙). 같은 주장은 `concept.test.ts` "본문 주장 검증"이 vm으로 확인한다.
- [Claude 판단] `p = q = 7` 설명에서 "안쪽이 먼저 평가된다"의 "먼저"를 지웠다 — 명세(13.15.2)는 왼쪽 대상 `p`의 참조를 먼저 정한 뒤 오른쪽 `q = 7`을 평가하므로 "먼저"는 순서를 거꾸로 말한다.
- [무검토 승인] 시뮬레이터를 "읽기(GetValue) → 쓰기(PutValue) → 식의 값" 사건 목록으로 설계하고, ToNumeric·참조 평가는 단계로 만들지 않고 `simplifications`로 밝혔다 — 값이 바뀌는 시점이 핵심이고, 숫자 피연산자에서 ToNumeric은 값이 그대로라 단계만 늘린다(3절).
- [무검토 승인] `const b = a++`의 초기화는 "쓰기" 사건이 아니라 "새로 생김"으로 표시했다 — 명세상 선언 초기화는 PutValue가 아니라 바인딩 초기화다(3절).
- [무검토 승인] 시나리오 값을 손으로 맞추지 않고 테스트가 명세 규칙(후위는 옛 값, 전위는 새 값, `name = rhs`는 오른쪽 값, `left + right`는 왼쪽부터)으로 계산해 대조하고, 단계마다 소스를 vm으로 실행해 바인딩 값을 비교한다(`concept.test.ts`, 5절).
- `x = x++`·`i++ + i` 시나리오, 문자열에 `++` 예제·퀴즈, `5++` SyntaxError 한 줄은 사용자가 골랐다.

#### 배경지식
- 후위 `x++`(13.4.2.1): `oldValue = ToNumeric(GetValue(x))` → `PutValue(x, oldValue + 1)` → `oldValue`를 돌려준다. 전위 `++x`(13.4.4.1)는 같은 절차에서 `newValue`를 돌려준다. 변수 값은 두 경우 모두 식을 평가하는 그 순간 바뀐다.
- 대입(13.15.2): 왼쪽 참조를 먼저 정하고, 오른쪽을 평가한 뒤 PutValue하고, 오른쪽 값을 식의 값으로 돌려준다. 그래서 `x = x++`는 x에 2를 넣었다가 오른쪽 값 1로 다시 덮어쓴다.
- 이항 연산(13.15.4): 왼쪽 피연산자를 평가·GetValue한 뒤 오른쪽을 평가한다. `i++ + i`의 오른쪽 `i`는 이미 2다.
- Early Errors(13.4.1): 피연산자가 대입 대상이 될 수 없으면(`5++`, `(a + b)++`) 실행 전에 SyntaxError. `const` 변수는 대입 대상이지만 PutValue에서 TypeError.

#### 확인 질문
1. `let x = 1; x = x++;` 뒤 `x`가 2가 아니라 1인 이유를 명세 순서로 설명하면?
   <details><summary>답</summary>대입은 왼쪽 대상 x를 먼저 정하고 오른쪽 `x++`를 평가한다. `x++`는 x에 2를 넣고 식의 값으로 옛 값 1을 돌려준다. 그 다음 대입이 x에 1을 넣으므로 2가 덮어쓰인다(시나리오 `자기 자신에 대입`, 2절 13.15.2·13.4.2.1).</details>
2. "후위 증가는 문이 끝난 뒤에 값을 늘린다"가 틀렸다는 것을 이 페이지의 어느 예제가 보여 주나?
   <details><summary>답</summary>`i++ + i`가 3이다. 왼쪽 `i++`를 평가하는 순간 i가 2가 되고, 같은 식 안의 오른쪽 `i`가 2로 읽힌다. 문이 끝난 뒤 늘린다면 2가 나와야 한다(`operand-order.js`, 시나리오 `피연산자 평가 순서` 6단계 `i의 값 2`).</details>
3. `const b = a++`에서 b가 생기는 것을 "쓰기" 사건으로 보여 주지 않은 이유는?
   <details><summary>답</summary>명세에서 `const`·`let` 선언의 초기화는 PutValue가 아니라 바인딩 초기화다. "쓰기"는 PutValue에만 쓰고, 선언으로 생긴 변수는 "새로 생김" 배지로 구분했다(3절).</details>
4. 시뮬레이터 조사 함수(`withObjectParticle`)가 틀리게 되는 입력은? 지금은 왜 괜찮은가?
   <details><summary>답</summary>끝자리 문자만 본다. 숫자로 끝나는 표기는 `10`·`100`·`-1`·`0.5`처럼 끝자리 발음이 조사를 정하므로 맞는다. 숫자가 아닌 표기는 규칙 밖이라 `NaN`("낸", 받침 있음)에 `를`이 붙는다. 이 페이지 시나리오의 쓰기 값은 모두 한 자리 정수(2·1)라 문제가 없다(`EvaluationView.tsx:25-28`, `scenarios.ts`).</details>
5. `5++`와 `const k = 1; k++`는 둘 다 실패하는데 오류 종류와 시점이 어떻게 다른가?
   <details><summary>답</summary>`5++`는 피연산자가 대입 대상이 될 수 없어 Early Error, 즉 실행 전 파싱 단계의 SyntaxError다. `k++`는 문법상 대입 대상이라 파싱은 되고, 실행 중 PutValue가 상수 바인딩에 값을 넣으려다 TypeError를 던진다(`concept.test.ts` "본문 주장 검증").</details>
