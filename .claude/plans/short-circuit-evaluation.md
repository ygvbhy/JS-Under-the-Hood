# 단축 평가 개념 페이지 구현 계획

- 상태: 완료
- 작성일: 2026-10-21
- 기준: `main` @ `134c771`

## 1. 목표

두 번째 개념 페이지 `/concepts/short-circuit-evaluation`을 추가한다. `&&`, `||`, `??`, `?.`가 왼쪽 값을 보고 오른쪽(또는 체인의 나머지)을 평가할지 정한다는 것을 실행 검증된 예제, 예측 퀴즈, 단계별 시뮬레이터로 보여 준다. 결과 값은 둘로 나뉜다. `&&`·`||`·`??`는 `true`/`false`가 아니라 **피연산자의 값 자체**를 돌려주고, `?.`는 왼쪽이 `null`·`undefined`이면 왼쪽 값이 아니라 **`undefined`**를 돌려준다(명세 OptionalChain 평가. `null?.x`도 `undefined`, 실행 확인).

## 2. 요구사항 정리

### 요구사항

- [확정] 범위: `&&`, `||`, `??`, `?.` 네 가지 모두(사용자 결정 2026-10-21). 『모던 자바스크립트 Deep Dive』 9장 범위이며 사용자 진도는 1~12장.
- [확정] 논리 연산자가 피연산자 값을 그대로 돌려주는 동작, 오른쪽 피연산자를 평가하지 않는 경우, 평가 순서를 단계별 시뮬레이터로 보여 준다.
- [확정] `docs/content-guide.md` 절차를 따르고, 공통 코드(`app/routes.ts`, `app/lib/`, `app/components/`, `app/simulator/`)를 수정하지 않고 개념 폴더만 추가한다.
- [확정] 정확성 원칙: 모든 실행 결과 주장은 실제 실행으로 검증하고, 단순화는 `meta.simplifications`에 적는다. 도서 예제·문장은 쓰지 않는다.

### 유지해야 하는 기존 동작

- 첫 개념(`primitives-and-objects`)의 페이지·시뮬레이터·테스트는 그대로 통과해야 한다. 첫 개념 파일은 수정하지 않는다.
- e2e `navigation.spec.ts`는 `객체` 검색 결과가 **정확히 1개**라고 가정한다(`toHaveCount(1)`). 새 개념의 `title`·`summary`·`tags`에 문자열 `객체`를 넣지 않는다(`filterConcepts`가 이 세 필드만 검색, `app/lib/concepts.ts`).
- 하이드레이션 규칙(첫 렌더 = 프리렌더), `loader` 없음.

### 제외 범위

- 실행 컨텍스트, TDZ, 호이스팅 상세(미학습). 함수 선언으로 만들어지는 변수는 첫 개념과 같이 표시하지 않고 단순화로 공개한다.
- `try...catch`(미학습)를 쓰는 예제. 오류가 나는 동작은 본문 설명 + 개념 테스트(vm)로만 검증한다(5단계 1의 "본문 주장 검증").
- 연산자 우선순위 일반론, `==` 등 다른 연산자 설명, 논리 할당 연산자(`&&=`, `||=`, `??=`), `!!` 외의 명시적 타입 변환(`Boolean()` 등). `!!`는 예제 1에서 쓰므로 본문에 "`!`를 두 번 적용해 ToBoolean 결과를 얻는 방법"으로 한 줄 설명한다(`!`는 7장, `!!`는 9장 범위).
- `?.[]`, `?.()`, 괄호로 체인이 끊기는 경우(`(a?.b).c`). 단순화 항목으로 공개한다.
- 시뮬레이터 공통 셸 추출(10. 추가 개선 후보).

## 3. 현재 구조

- 라우트: `app/routes.ts`가 `app/concepts/*` 폴더를 서버 시작 시 스캔해 `/concepts/<slug>` 라우트를 만든다. 레지스트리는 `app/lib/concepts.ts`의 `import.meta.glob('../concepts/*/meta.ts')`.
- 공통 테스트가 새 폴더를 자동 검사한다: `tests/examples.test.ts`(예제 실제 실행 L1, `tests/helpers/run-example.ts`: `runInNewContext` + `util.format`), `tests/content-integrity.test.ts`(slug=폴더명, summary ≤160, goals/simplifications/references ≥1, 필수 h2 3개, 개념 수 = 폴더 수), `tests/build/build-output.test.ts`(홈 목록·sitemap·canonical 등).
- 시뮬레이터 공통: `app/simulator/`(`types.ts`의 `Step<S>`/`Scenario<S>`, `useStepper`, `StepControls`, `CodeView`). 셸·시각화·상태 모양은 개념 폴더 안(`primitives-and-objects/Simulator.tsx`, `MemoryView.tsx`, `scenarios.ts`).
- 시나리오 불변식: `tests/helpers/scenario-invariants.ts`의 `assertScenarioInvariants`(코드 원문 일치, 마지막 output = expectedOutput, output 누적, line 범위, 단계 ≥2). 상태 무결성(⑥)은 개념별 `concept.test.ts`.
- e2e는 첫 개념만 대상(`tests/e2e/helpers.ts`의 `CONCEPT_PATH`). 새 개념은 content-guide 9단계에 따라 브라우저 확인 + 필요 시 e2e 경로 추가.

### 실행 확인한 사실 (계획 단계, Node `vm` sloppy script)

| 예제 초안               | 실제 출력                                                                         |
| ----------------------- | --------------------------------------------------------------------------------- |
| `truthy-falsy.js`       | `false false false false false false false false` / `true true true true true`    |
| `logical-result.js`     | `hello hi 0 hello`                                                                |
| `skip-right.js`         | `평가: A` / `0` / `평가: C` / `ok` / `평가: E` / `평가: F` / `2`                  |
| `nullish.js`            | `10 0` / `"제목 없음" ""` / `메모 없음`                                           |
| `optional-chaining.js`  | `30` / `undefined` / `나이 정보 없음`                                             |
| `new vm.Script('a ?? b \|\| c')` | `SyntaxError`                                                            |
| `const g = null; g.profile` | `TypeError` (다른 realm이라 `instanceof TypeError`는 false → 테스트는 `e.name`으로 비교) |

명세 앵커 존재 확인(2026-10-21, tc39.es/ecma262): `sec-binary-logical-operators-runtime-semantics-evaluation`, `sec-toboolean`, `sec-optional-chains`, `sec-optional-chaining-evaluation`. MDN(ko) `Logical_AND`, `Logical_OR`, `Nullish_coalescing`, `Optional_chaining`, `Glossary/Falsy`, `Glossary/Truthy` 모두 200.

## 4. 변경 범위

### 추가

- `app/concepts/short-circuit-evaluation/`
  - `meta.ts`, `content.mdx`, `route.tsx`
  - `examples/truthy-falsy.js`, `logical-result.js`, `skip-right.js`, `nullish.js`, `optional-chaining.js`
  - `scenarios.ts`(상태 타입 + 시나리오 4개), `EvaluationView.tsx`(+ `.test.tsx`), `Simulator.tsx`(+ `.test.tsx`), `concept.test.ts`

### 수정 (테스트만)

- `tests/e2e/helpers.ts`: 새 개념 경로·시뮬레이터 이름 상수 추가
- `tests/e2e/a11y.spec.ts`: 새 개념 페이지 axe(라이트·다크, 시뮬레이터 진행 후 포함)
- `tests/e2e/responsive.spec.ts`: 새 개념 경로 가로 스크롤 검사 + 시뮬레이터 끝까지 진행
- `tests/build/build-output.test.ts`: 새 시뮬레이터 0단계 프리렌더 검사(첫 개념 블록과 같은 방식)

### 변경하지 않음

- `app/routes.ts`, `app/lib/*`, `app/components/*`, `app/simulator/*`, `app/concepts/primitives-and-objects/*`, `package.json`(의존성 추가 없음), `docs/content-guide.md`, `AGENTS.md`

## 5. 구현 계획

### 1. 예제 파일과 meta.ts, 본문 주장 검증 테스트

- 대상: `examples/*.js` 5개, `meta.ts`, `concept.test.ts`(이 단계에서는 "본문 주장 검증" describe만)
- 현재: 폴더 없음
- 변경:
  - 예제 5개를 아래 원문 그대로 만든다(파일 끝 줄바꿈 1개). 줄 번호를 시뮬레이터가 쓰므로 빈 줄 위치도 그대로 둔다.

    `truthy-falsy.js`
    ```js
    console.log(!!false, !!0, !!-0, !!0n, !!NaN, !!'', !!null, !!undefined);
    console.log(!!'0', !!'false', !!' ', !!-1, !!{});
    ```
    `logical-result.js`
    ```js
    const a = 0 || 'hello';
    const b = 'hi' || 'hello';
    const c = 0 && 'hello';
    const d = 'hi' && 'hello';
    console.log(a, b, c, d);
    ```
    `skip-right.js`
    ```js
    function check(label, value) {
      console.log('평가: ' + label);
      return value;
    }

    const x = check('A', 0) && check('B', 1);
    console.log(x);
    const y = check('C', 'ok') || check('D', 2);
    console.log(y);
    const z = check('E', 1) && check('F', 2);
    console.log(z);
    ```
    `nullish.js`
    ```js
    const count = 0;
    const title = '';
    let memo;

    console.log(count || 10, count ?? 10);
    console.log(JSON.stringify(title || '제목 없음'), JSON.stringify(title ?? '제목 없음'));
    console.log(memo ?? '메모 없음');
    ```
    `optional-chaining.js`
    ```js
    const user = { profile: { age: 30 } };
    const guest = null;

    console.log(user?.profile.age);
    console.log(guest?.profile.age);
    console.log(guest?.profile.age ?? '나이 정보 없음');
    ```
  - `meta.ts`:
    - `slug: 'short-circuit-evaluation'`, `category: 'fundamentals'`, `reviewedAt: null`, `related: []`
    - `title: '단축 평가: &&, ||, ??, ?.는 어디서 평가를 멈추나'`
    - `summary`(≤160자, `객체` 금지): `&&, ||, ??는 왼쪽 값을 보고 오른쪽을 평가할지 정하고 피연산자의 값을 그대로 돌려줍니다. ?.는 왼쪽이 null이나 undefined면 나머지를 평가하지 않고 undefined를 돌려줍니다.` (`?.`가 피연산자 값을 돌려준다고 쓰지 않는다)
    - `tags`(`객체` 금지): `단축 평가`, `short-circuit`, `논리 연산자`, `&&`, `||`, `null 병합 연산자`, `??`, `옵셔널 체이닝`, `?.`, `truthy`, `falsy`, `기본값`
    - `goals`: ① falsy 값 8가지를 말하고 truthy/falsy로 조건을 판단할 수 있다 ② `&&`·`||`의 결과가 어느 피연산자의 값인지 예측할 수 있다 ③ 오른쪽 피연산자가 평가되지 않는 경우를 찾을 수 있다 ④ `||`와 `??`가 `0`·`''`에서 다르게 동작하는 이유를 설명할 수 있다 ⑤ `?.`가 `null`·`undefined`에서 체인의 나머지를 평가하지 않고 `undefined`를 돌려준다는 것을 설명할 수 있다
    - `prerequisites`(label만): `데이터 타입`, `논리 연산자`, `함수 호출`, `객체 리터럴과 프로퍼티 접근`
    - `examples`: 위 5개, `expectedOutput`은 3. 현재 구조의 실행 확인 표 값. content-guide대로 `[]`로 두고 `npm test` 실제 출력을 확인한 뒤 채운다(표와 다르면 멈추고 원인 확인).
    - `simplifications`(6. 엣지 케이스·시각화 결정 반영):
      1. 시각화는 식을 "조각"(피연산자, `?.` 체인의 각 접근) 단위로 보여 준다. 명세의 평가 단계(참조 평가, GetValue 등)는 묶어서 표시한다.
      2. 시뮬레이터의 "평가함/평가 안 함/아직 평가 전" 표시는 교육용 이름이며, 명세 용어가 아니다.
      3. 변수는 선언문이 실행된 뒤에만 표시한다. 함수 선언으로 만들어지는 `check`와 함수 객체, 함수 호출 내부(매개변수, 본문 실행)는 표시하지 않고 호출 하나를 한 단계로 묶는다(호이스팅·실행 컨텍스트는 별도 개념).
      4. 이 페이지의 값 표시(`{ profile: {…} }` 등)는 내용을 줄여 쓴 것이다.
      5. ToBoolean에는 브라우저 호스트의 `document.all`(명세 부록 B의 `[[IsHTMLDDA]]`)만 falsy로 다루는 예외가 있으나 다루지 않는다.
      6. `console.log`는 호스트 API이며, 문자열을 따옴표 없이 출력하는 것은 호스트의 출력 형식이다. 시각화의 값 표시에는 문자열에 큰따옴표를 붙인다.
      7. 변수 열에는 이 코드가 선언한 변수만 표시한다. 내장 값(`console`, `JSON` 등)은 표시하지 않는다.
      8. 명세는 `?.`를 연산자가 아니라 OptionalChain 문법으로 정의하지만, 이 페이지는 편의상 네 가지를 함께 "연산자"로 부른다. `?.[]`, `?.()`, 괄호로 체인이 끊기는 경우(`(a?.b).c`)는 다루지 않는다.
    - `references`: 명세 Binary Logical Operators Runtime Semantics: Evaluation(`#sec-binary-logical-operators-runtime-semantics-evaluation`), ToBoolean(`#sec-toboolean`), Optional Chains(`#sec-optional-chains`), Optional Chaining Evaluation(`#sec-optional-chaining-evaluation`), ChainEvaluation(`#sec-optional-chaining-chain-evaluation`), MDN(ko) 논리 AND, 논리 OR, 널 병합 연산자, 옵셔널 체이닝, Falsy, Truthy.
  - `concept.test.ts`의 "본문 주장 검증" describe(본문에서 주장하지만 예제로 출력할 수 없는 오류 동작): `node:vm`으로
    - `new vm.Script('a ?? b || c')`와 `'a || b ?? c'`, `'a ?? b && c'`가 `SyntaxError`(`e.name`)를 던지고, `'(a ?? b) || c'`는 던지지 않는다.
    - `runInNewContext('const guest = null; guest.profile')`가 `TypeError`(`e.name`)를 던진다.
    - `runInNewContext('const user = {}; user?.missing.age')`가 `TypeError`를 던진다(`?.`는 바로 왼쪽 값만 검사).
    - `runInNewContext('const guest = null; guest?.profile.age')`는 던지지 않고 `undefined`를 반환한다.
    - `runInNewContext('const g = null; g?.x')`는 `null`이 아니라 `undefined`를 반환한다(`?.`는 왼쪽 값을 돌려주지 않음).
- 이유: 페이지 전체의 사실 근거를 가장 먼저 고정한다(가장 위험한 부분 = 내용 정확성).
- 주의사항: `meta.ts`는 `ConceptMeta` 타입 외 import 금지. 예제 폴더는 Prettier/ESLint 제외 대상이라 자동 포맷되지 않는다. 이 단계에서 `content.mdx`·`route.tsx`가 없으면 content-integrity(필수 h2)가 실패하므로, 5단계 전까지는 최소 `route.tsx`와 필수 h2 3개만 있는 `content.mdx` 골격을 함께 만든다.
- 완료 조건: `npm test -- tests/examples.test.ts tests/content-integrity.test.ts app/concepts/short-circuit-evaluation` 통과. examples 테스트의 실제 출력이 3. 표와 일치. `grep -c 객체`로 `meta.ts`의 title·summary·tags에 `객체`가 없음(goals·prerequisites에는 있어도 됨).

### 2. 상태 모델과 시나리오, 의미 불변식 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 현재: 없음
- 변경:
  - 상태 타입(차분이 아닌 전체 스냅샷):
    ```ts
    export type Val = {
      type: 'number' | 'string' | 'boolean' | 'undefined' | 'null' | 'object'
      display: string // string은 따옴표 없는 내용, object는 '{ profile: {…} }'처럼 줄인 표기
    }
    export type Binding = { name: string; declaredWith: 'const' | 'let'; value: Val; changed?: boolean }
    export type Part = {
      code: string // 소스 조각: "0", "check('A', 0)", "user", "?.profile", ".age"
      status: 'pending' | 'evaluated' | 'skipped'
      value?: Val // evaluated일 때만
      check?: Check // 판정에 쓰인 조각에만. 표시 문구는 EvaluationView가 매핑
    }
    // 'truthy'·'falsy'는 &&·||, 'nullish'·'not-nullish'는 ??·?.의 판정. 화면 문구 예: nullish → "null 또는 undefined"
    export type Check = 'truthy' | 'falsy' | 'nullish' | 'not-nullish'
    // 한 Evaluation = 한 종류의 연산자. a && b || c처럼 섞인 식은 표현하지 않는다(이 페이지 예제에 없음).
    // 6번 줄처럼 ?. 결과를 ??가 쓰는 식은 Evaluation 두 개(단계 두 개)로 나눈다.
    export type Evaluation = {
      code: string // 평가 중인 식 전체: "0 || 'hello'"
      operator: '&&' | '||' | '??' | '?.'
      parts: Part[]
      result?: Val
    }
    export type EvalState = { bindings: Binding[]; evaluation?: Evaluation }
    ```
    `changed`는 그 단계에서 새로 생긴 바인딩에만 붙인다(첫 개념과 같은 규칙). 이 예제들에는 재할당이 없으므로 바인딩은 생길 때 한 번만 `changed`.
  - 시나리오 4개(id·label·exampleId): `logical-result`·`값을 돌려줌`, `skip-right`·`오른쪽 건너뛰기`, `nullish`·`?? 와 ||`, `optional-chaining`·`?. 체인`. `truthy-falsy` 예제는 시나리오 없이 본문 예제·퀴즈만.
  - 단계 구성(첫 단계는 `line` 없음, `state = { bindings: [] }`, `output: []`; 모든 단계에 누적 `output`):
    - `logical-result`(10단계): 실행 전 → 줄마다 [왼쪽 평가·판정] → [결과 결정(오른쪽 평가 또는 건너뜀) + 변수 초기화] × 4줄 → 5번 줄 `console.log` 출력.
    - `skip-right`(10단계): 실행 전 → 6번 줄 [`check('A', 0)` 호출, 출력 `평가: A`, 0은 falsy → `&&` 멈춤] → [`check('B', 1)` 평가 안 함, x = 0] → 7번 줄 출력 → 8번 줄 2단계(`||`, `'ok'` truthy → 멈춤) → 9번 줄 → 10번 줄 2단계(`1` truthy → 오른쪽 `check('F', 2)` 평가, 출력 `평가: F`, z = 2) → 11번 줄. 1~4번 줄(함수 선언)은 단계로 만들지 않고 첫 실행 단계 설명에 "check 함수는 표시하지 않는다"를 적는다.
    - `nullish`(10단계): 실행 전 → 1~3번 줄 선언 1단계(`memo`는 초기화 없이 선언되어 `undefined`) → 5번 줄: `count || 10` 1단계, `count ?? 10` 1단계, 출력 1단계 → 6번 줄: `title || '제목 없음'`, `title ?? '제목 없음'`, 출력(설명에 `JSON.stringify`로 빈 문자열을 `""`로 보이게 했다고 적음) → 7번 줄: `memo ?? '메모 없음'`, 출력. 이 시나리오는 연산자 하나를 1단계(왼쪽 판정 + 결과)로 묶는다.
    - `optional-chaining`(10단계): 실행 전 → 1~2번 줄 선언 1단계 → 4번 줄 [`user`는 null·undefined 아님 → 계속] → [`.profile`, `.age` 평가 → 30] → 출력 → 5번 줄 [`guest`는 null → `?.profile`, `.age` 평가 안 함, 결과 undefined. 설명: `?.`가 없었다면 null에서 프로퍼티를 읽어 TypeError] → 출력 → 6번 줄 [`guest?.profile.age` → undefined(체인)] → [`??` 왼쪽 undefined → 오른쪽 평가 → `'나이 정보 없음'`] → 출력.
    - 단계 수는 목표치다. 의미 불변식을 만족하는 범위에서 ±2 허용.
  - `concept.test.ts`에 추가:
    - 시나리오마다 `assertScenarioInvariants`(첫 개념 `concept.test.ts`와 같은 형태), 시나리오 id 중복 없음·순서 고정, 첫 단계 `{ bindings: [] }`·`line` 없음.
    - 상태 무결성: 바인딩 이름 중복 없음. `status === 'evaluated'` ⇔ `value !== undefined`. `skipped` 뒤에 `evaluated` 없음. `result`가 있으면 `pending` 조각 없음.
    - **의미 검사**(시각화가 명세 동작과 어긋나지 않게). 테스트 안의 `isTruthy(val)`(false·0·-0·NaN·`''`·null·undefined → false, `0n`은 시나리오에 없음)와 `isNullish(val)`를 쓴다.
      - 판정 일치: `check`가 있는 조각은 `evaluated`이고, `check`가 연산자별 계산값과 같다(`&&`·`||`: `isTruthy ? 'truthy' : 'falsy'`, `??`·`?.`: `isNullish ? 'nullish' : 'not-nullish'`).
      - `&&`·`||`·`??`: 왼쪽부터 평가된 조각 i(마지막 조각 제외)에 대해 "계속" 조건(`&&`: truthy, `||`: falsy, `??`: nullish)이면 i+1은 `evaluated` 또는 `pending`(result 없음)이다. 멈춤 조건이면 i+1 이후는 `pending`(판정만 보여 주는 단계, result 없음) 또는 전부 `skipped`(result = 조각 i의 값)다. 마지막 조각까지 평가되고 result가 있으면 result = 마지막 조각의 값.
      - `?.`: `?.`로 시작하는 조각의 바로 앞 조각이 nullish면 그 조각부터 끝까지 `skipped` 또는 `pending`이고, result가 있으면 `{ type: 'undefined' }`. 그 밖에 result가 있으면 result = 마지막 조각의 값.
    - 바인딩 값 검사: 각 시나리오 마지막 단계의 바인딩 값이 예제 실제 실행 결과와 같다. `runExample`(`tests/helpers/run-example.ts`)은 출력만 돌려주므로, 예제 원문 끝에 `\nconsole.log(JSON.stringify([이름들의 [typeof, 값] 쌍]))`를 붙여 실행하고 마지막 출력 줄을 파싱해 비교한다(`undefined`가 `null`로 바뀌는 문제를 `typeof`로 구분). 대상: `logical-result`(a,b,c,d), `skip-right`(x,y,z), `nullish`(count,title,memo), `optional-chaining`(user·guest는 `typeof`만).
- 이유: 단계 내용(값·판정·건너뜀)이 명세 동작과 일치함을 자동으로 보장한다. 첫 개념은 사람 대조에 의존했지만 이 개념은 판정 규칙이 단순해 테스트로 검사할 수 있다.
- 주의사항: `Val.display`로 truthiness를 계산하므로 표기 규칙(숫자는 `String(n)`, 문자열은 내용만)을 헬퍼(`num`, `str`, `undef`, `nul`, `objv`)로 강제한다.
- 완료 조건: `npm test -- app/concepts/short-circuit-evaluation/concept.test.ts` 통과. 음성 확인 3가지를 각각 일부러 넣어 실패를 확인하고 되돌린다: ① `logical-result` 2단계의 `check`를 `'truthy'`로 바꿈(판정 일치 검사 실패) ② `skip-right`에서 건너뛴 `check('B', 1)`을 `evaluated`로 바꿈(의미 검사 실패) ③ `nullish` 마지막 단계의 `memo` 값을 `null`로 바꿈(바인딩 값 검사 실패).

### 3. 시각화 컴포넌트 EvaluationView

- 대상: `EvaluationView.tsx`, `EvaluationView.test.tsx`
- 현재: 없음
- 변경: 한 단계의 `EvalState`를 그린다.
  - "평가 중인 식" 영역(`role="region"` 대신 `section` + 제목 텍스트): `evaluation`이 없으면 "아직 평가 중인 식이 없습니다." 있으면 식 전체(`font-mono`), 조각 목록(`ol`), 각 항목에 조각 코드, 상태 배지 텍스트(`평가함` / `평가 안 함` / `아직 평가 전`), 값(문자열은 큰따옴표), 판정 문구, 마지막에 "결과: 값"(결과가 정해진 단계만).
  - `평가 안 함` 조각은 배지 텍스트 + 취소선 + 흐린 색. 색만으로 구분하지 않는다.
  - "변수" 영역: 바인딩이 없으면 "아직 표시할 변수가 없습니다." 있으면 `이름 = 값`과 `const`/`let` 배지, `changed`면 강조 배경 + `새로 생김` 배지.
  - 스타일 토큰은 첫 개념 `MemoryView.tsx`와 같은 Tailwind 테마 클래스(`border-border`, `bg-surface`, `bg-highlight`, `text-muted` 등)만 쓴다. 긴 코드 조각은 줄바꿈(`break-words`)해 375px에서 넘치지 않게 한다.
- 이유: 상태 모양이 첫 개념과 달라 시각화도 새로 만든다(AGENTS 시뮬레이터 규칙).
- 주의사항: 프리렌더되는 첫 단계(빈 상태)가 JS 없이도 의미 있게 보여야 한다. 애니메이션은 `motion-safe:`만.
- 완료 조건: `EvaluationView.test.tsx` 통과 — 빈 상태 문구 2개, 평가 중 단계에서 조각별 배지 텍스트와 값(`"hello"`처럼 따옴표), `평가 안 함` 항목 존재, 결과 표시, `새로 생김` 배지.

### 4. 시뮬레이터 셸

- 대상: `Simulator.tsx`, `Simulator.test.tsx`
- 현재: 첫 개념의 `primitives-and-objects/Simulator.tsx`가 같은 역할(시나리오 라디오, 배치, 키보드, 스크린 리더 안내, 콘솔 출력)
- 변경: 첫 개념 셸을 이 폴더로 복사해 `EvaluationView`·`EvalState`로 바꾸고 `aria-label="단축 평가 시뮬레이터"`로 한다. 배치·키보드·안내 동작은 그대로 둔다. 첫 개념 파일은 import하지 않는다(개념 간 결합 방지).
- 이유: AGENTS "셸은 개념 폴더 안에 둔다"와 사용자 원칙(공통 코드 수정 없음). 두 셸이 같아지므로 공통 셸 추출을 후속 작업으로 남긴다(10).
- 주의사항: 복사 후 첫 개념 셸과 다르게 바꾸지 않는다(후속 추출을 쉽게 하기 위해). `EvaluationView`는 `prevState`를 받지 않으므로(`changed`만으로 `새로 생김` 표시) 셸의 `prevState` 계산 줄은 지운다.
- 완료 조건: `Simulator.test.tsx` 통과 — 첫 렌더가 `값을 돌려줌` 시나리오 "단계 1: 실행 전", 다음 클릭 시 1번 줄 강조(`aria-current="step"`)와 조각 표시, 시나리오 전환 시 0단계 복귀, 영역 포커스 시 ←/→/Home. `diff primitives-and-objects/Simulator.tsx short-circuit-evaluation/Simulator.tsx` 결과가 import·타입·컴포넌트 이름·`aria-label`·맨 위 주석·`prevState` 줄뿐.

### 5. 본문 content.mdx와 route.tsx

- 대상: `content.mdx`, `route.tsx`
- 변경:
  - `route.tsx`: content-guide 6단계 템플릿 그대로.
  - `content.mdx` 구성(필수 h2 3개):
    - `## 동작 원리`: ① 단축 평가(short-circuit evaluation) 정의 ② truthy/falsy와 ToBoolean, falsy 8가지(`false`, `0`, `-0`, `0n`, `NaN`, `''`, `null`, `undefined`) — `truthy-falsy.js`로 확인. `!!x`는 `!`를 두 번 적용해 x의 ToBoolean 결과를 얻는 방법이라고 한 줄 설명. `0n`은 bigint 타입의 0이라고 짧게 밝힌다(첫 개념 본문이 bigint를 원시 타입으로 이미 소개) ③ `&&`·`||`: 왼쪽을 평가해 ToBoolean으로 판정, 결과가 정해지면 왼쪽 값을 그대로 돌려주고 오른쪽을 평가하지 않음, 아니면 오른쪽을 평가한 값을 돌려줌 ④ `??`: 왼쪽이 `null` 또는 `undefined`일 때만 오른쪽을 평가. `0`·`''`·`false`는 그대로 결과. `&&`·`||`와 괄호 없이 섞으면 SyntaxError ⑤ `?.`: 바로 왼쪽 값이 `null`·`undefined`면 체인의 나머지(뒤의 프로퍼티 접근, 함수 호출과 인수)를 평가하지 않고 `undefined`를 돌려준다(왼쪽 값 `null`을 돌려주지 않는다). `?.` 없이 `null`의 프로퍼티를 읽으면 TypeError.
    - `## 예제`: 예제 1~5를 `file=` 코드 펜스로 넣고 각 예제 뒤에 `PredictQuiz`(5개, 선택지 3~4개, 정답은 실행 결과). 예제 3 설명에 `JSON.stringify`는 빈 문자열을 출력에서 `""`로 보이게 하려는 출력용이라고 한 줄 적는다. `### 시뮬레이터로 확인하기` + `<Simulator scenarios={scenarios} />`를 독립된 줄에.
    - `## 결과와 이유`: JSX `<table>`(첫 개념 형식) — 열: 연산자 / 왼쪽 값을 보는 기준 / 오른쪽을 평가하는 경우 / 결과. `?.` 행의 결과는 "왼쪽이 null·undefined면 `undefined`, 아니면 체인 끝까지 평가한 값"으로 쓴다. 이어서 예제별 이유 문단, `Callout type="misconception"` 4개: "`&&`·`||`는 항상 true나 false를 돌려준다", "`||`로 기본값을 주면 값이 없을 때만 기본값이 된다"(0·`''`도 기본값으로 바뀜 → `??`), "`?.`를 한 번 쓰면 뒤의 모든 접근이 안전하다"(`user?.missing.age`는 user가 있으면 `.missing`이 undefined라 TypeError), "`null?.x`의 결과는 `null`이다"(결과는 `undefined`).
  - 오류 주장(SyntaxError, TypeError)은 1단계의 "본문 주장 검증" 테스트가 근거이며, 본문에는 오류 메시지 문구(호스트마다 다름)를 쓰지 않고 오류 종류만 쓴다.
- 이유: content-guide 4단계 권장 흐름.
- 주의사항: 미학습 개념(실행 컨텍스트, TDZ, try...catch)을 설명하지 않는다. 같은 대상은 같은 이름("오른쪽 피연산자", "평가하지 않는다")으로 부른다. 도서 문장·예제를 쓰지 않는다.
- 완료 조건: `npm test` 전체 통과(필수 h2 포함). `npm run build` 후 `build/client/concepts/short-circuit-evaluation/index.html`에 `<details` 5개 이상(퀴즈 프리렌더 정답), 시뮬레이터 "단계 1: 실행 전" 텍스트 존재.

### 6. e2e·빌드 테스트 확장과 브라우저 확인

- 대상: `tests/e2e/helpers.ts`, `a11y.spec.ts`, `responsive.spec.ts`, `tests/build/build-output.test.ts`
- 변경:
  - `helpers.ts`: `SHORT_CIRCUIT_PATH = '/concepts/short-circuit-evaluation'`, `SHORT_CIRCUIT_SIMULATOR_NAME = '단축 평가 시뮬레이터'` 추가(기존 상수 유지).
  - `a11y.spec.ts`: 라이트·다크 각각 새 개념 페이지 axe 1개 + 시나리오 4개를 끝까지 진행하며 홀수 단계와 마지막 단계에서 axe(실행 시간 절약. 단계 수 상한 12). 시나리오마다 `평가 안 함`·결과·`새로 생김` 표시가 이 단계들에 포함되는지 구현 시 확인하고, 빠지면 해당 단계를 추가한다.
  - `responsive.spec.ts`: 경로 목록에 새 경로 추가 + 새 시뮬레이터 끝까지 진행 시 가로 스크롤 없음.
  - `build-output.test.ts`: 새 개념 HTML에 시뮬레이터 0단계(`단계 1: 실행 전`, 라디오 4개 이상) 프리렌더 검사 블록 추가.
- 이유: content-guide 9단계는 새 개념의 e2e를 "필요하면" 추가하라고 한다. 새 시각화 컴포넌트의 대비·375px 넘침은 자동 검사가 없으면 회귀를 놓친다.
- 주의사항: 기존 테스트 케이스는 수정하지 않고 추가만 한다. `navigation.spec.ts`의 `객체` 검색 1건 가정이 유지되는지 e2e로 확인한다.
- 완료 조건: `npm run test:build`·`npm run e2e` 통과(기존 55 통과·3 건너뜀 + 새 케이스). 브라우저(dev 서버 재시작 후): 1280px·375px·다크 모드에서 시뮬레이터 4개 시나리오 끝까지 진행, 콘솔 에러 0, 가로 스크롤 없음, 키보드(Tab으로 영역 포커스 → ←/→/Home) 동작을 확인하고 스크린샷 1장 이상.

## 6. 엣지 케이스

- 빈 문자열: 콘솔 출력에서 보이지 않으므로 예제는 `JSON.stringify`로 `""`를 출력한다. 시각화에서는 큰따옴표로 `""` 표시.
- `-0`, `0n`, `NaN`: `truthy-falsy.js`에서만 다룬다(출력 `false`). 시나리오에는 등장하지 않는다. `console.log(-0)`처럼 값 자체를 출력하는 예제는 쓰지 않는다(호스트 형식 차이 가능).
- `let memo;`: 초기화 없는 선언은 `undefined`. 시각화에 `memo = undefined` 표시.
- `?.`와 `??` 조합: 6번 줄은 `?.` 체인 평가와 `??` 평가를 두 단계로 나눠 `evaluation`을 바꿔 그린다.
- `??`와 `||`/`&&` 혼용 금지는 문법 오류라 예제 파일로 만들 수 없다 → 테스트로만 검증.
- `?.`는 바로 왼쪽 값만 검사: `user?.missing.age`(TypeError)를 오해 Callout에서 설명, 테스트로 검증.
- 프리렌더/JS 없음: 시뮬레이터는 0단계(빈 상태)만 보이고 퀴즈는 `<details>` 정답.
- 홈 정렬: `listConcepts`가 제목 가나다순이라 새 개념(`단축 평가…`)이 첫 개념보다 앞에 온다. 홈 첫 카드를 첫 개념으로 가정하는 테스트가 없는지 e2e로 확인(조사 결과 `navigation.spec.ts`는 검색 후 첫 카드를 쓴다).

## 7. 회귀 위험

- `객체` 검색 결과 1건 가정(e2e) — 새 meta의 title·summary·tags에 `객체`가 들어가면 실패. 1단계 완료 조건으로 확인.
- 개념 수 = 폴더 수 가드: 폴더만 추가하면 자동 반영(fsModuleCache false 설정 유지).
- 첫 개념 셸을 복사하므로 첫 개념 파일은 건드리지 않는다. 첫 개념 테스트·e2e가 그대로 통과해야 한다.
- 홈 카드 순서 변화(새 개념이 먼저 표시) — 사용자에게 보이는 변화이지만 정렬 규칙(제목순)대로의 결과.

## 8. 검증 계획

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e` (AGENTS 검증 순서).
- 정확성: 예제 5개 실제 출력 = `expectedOutput`, 시나리오 의미 검사, 본문 주장 검증 테스트, 2단계 음성 확인.
- 브라우저(dev 서버 재시작 후 `/concepts/short-circuit-evaluation`):
  1. 첫 화면: "검토 중" 배지, 학습 목표 5개, 선행 개념 칩 4개(링크 아님), 퀴즈 5개가 라디오 UI로 바뀜.
  2. 퀴즈 하나에서 오답 선택 → 정답 확인 → 이유 표시 → 다시 풀기.
  3. 시뮬레이터 `오른쪽 건너뛰기`: 3단계에서 `check('B', 1)` 조각이 "평가 안 함"이고 콘솔에 `평가: B`가 없음. 마지막 단계 콘솔이 `평가: A`, `0`, `평가: C`, `ok`, `평가: E`, `평가: F`, `2`.
  4. `?. 체인`: `guest` 단계에서 `?.profile`, `.age`가 "평가 안 함", 결과 `undefined`.
  5. 375px·다크 모드에서 1~4 반복, 가로 스크롤 없음. 키보드 ←/→/Home.
  6. 홈에서 카드 2개, `객체` 검색 시 1개(첫 개념), `단축` 검색 시 1개(새 개념).

## 9. 확인 필요 사항

- [결정 2026-10-21, 사용자] 시뮬레이터 공통 셸 추출은 별도 작업으로 한다. 이번 작업은 셸을 개념 폴더에 복사한다(AGENTS의 "폴더만 추가" 규칙과 "두 번째 시뮬레이터에서 셸 추출" 규칙의 충돌을 이렇게 해소).
- 콘텐츠 문구는 구현 후 사용자 검토 게이트(`reviewedAt`)에서 확인한다.

## 10. 추가 개선 후보

- 시뮬레이터 공통 셸 추출: 이번 작업으로 두 개념의 셸이 상태 타입·시각화·라벨만 다른 같은 코드가 된다. AGENTS 규칙("두 번째 시뮬레이터 개념이 생겨 반복이 확인되면 그때 공통 셸을 추출")에 따라 별도 작업으로 `app/simulator/`에 셸을 추출하고 두 개념이 쓰게 바꾼다.
- 첫 개념 `related`에 새 개념 연결(현재는 내용상 연결이 약해 양쪽 모두 `[]`).
- e2e 대상 개념 목록을 레지스트리에서 자동으로 만들기(개념이 늘면).

## 변경 이력

- 2026-10-21 (구현 중 근거): 6단계 a11y 조건 "홀수 단계와 마지막 단계에서 axe" → "모든 단계에서 axe"(`test.slow()`). 근거: 홀수 단계만으로는 `평가 안 함`·결과·`새로 생김` 표시 단계가 빠짐(값을 돌려줌 인덱스 4·6, 오른쪽 건너뛰기 인덱스 2·5·9). 검사를 강화하는 변경이라 재승인 불필요 — 영향 단계 6

## 구현 진행

- baseline (2026-10-21, `134c771`): lint·format:check·typecheck 오류 0, `npm test` 141 통과, `test:build` 17 통과, e2e 55 통과·3 건너뜀(의도) — 이 세션에서 `134c771` 커밋 직전 같은 코드로 메인이 실행한 결과(이후 변경은 계획 문서뿐)
- [x] 1. 예제·meta·본문 주장 검증 — 메인 재실행: vitest(examples·content-integrity·개념) 37 통과, lint·typecheck 0, prettier 통과. 예제 5개 원문이 계획 단계 실행본과 동일, 실제 출력 = 계획 3절 표. title·summary·tags에 '객체' 없음. references 11개(계획 목록 그대로)
- [x] 2. 상태 모델·시나리오·의미 검사 — 메인 재실행: vitest 139 통과, lint·typecheck·prettier 0. 시나리오 4개 각 10단계, 단계 설명 40개를 메인이 명세 동작과 대조(오류 없음). 음성 확인: 메인이 ② skip-right 건너뛴 조각 evaluated화 → 의미 검사 실패, ③ memo를 null로 → 바인딩 값 검사 실패를 직접 재현 후 원복(diff 동일). ①은 서브에이전트 보고(판정 일치 검사 실패). 계획 외 추가 검사(check 필수, pending 뒤 evaluated 금지, skipped 시 result 필수, changed 규칙, 선언 키워드 일치)는 더 엄격한 방향이라 수용
- [x] 3. EvaluationView — 메인 재실행: `npm test` 286 통과(baseline 141 + 신규), lint·typecheck·prettier 0. 코드 확인: 상태 배지·판정 문구가 텍스트로 전달, 평가 안 함은 배지+취소선+흐린 색, 테마 토큰만 사용, 하이드레이션 영향 값 없음(useId만). 실제 대비·375px 넘침은 6단계 axe·브라우저에서 확인
- [x] 4. 시뮬레이터 셸 — 메인 확인: 첫 개념 셸과의 diff가 import·Props 타입·맨 위 주석·prevState 줄·aria-label·EvaluationView 호출뿐(13줄). Simulator.test 10개 포함 전체 통과
- [x] 5. 본문 content.mdx — 메인이 본문 전문을 명세·검증 범위와 대조. 미검증 주장 3개(`false ?? 'x'`가 false, `?.`가 null에서 뒤 함수 호출의 인수를 평가하지 않음, `null && 'x'`가 null)를 메인이 "본문 주장 검증" 테스트에 추가해 근거화. 메인 재실행: `npm test` 289 통과, lint·typecheck·format:check 0, build 성공, 프리렌더 HTML에 `<details` 5개·"실행 전" 1건·라디오 4개(React 텍스트 노드 사이 `<!-- -->` 주석 때문에 "단계 1: 실행 전" 연속 문자열 grep은 0 — 첫 개념과 같은 형태)
- [x] 6. e2e·빌드 테스트 확장과 브라우저 확인 — 테스트 추가만(기존 케이스 수정 없음, import 줄만 확장). `test:build`가 본문 버그 발견: `**단축 평가(short-circuit evaluation)**라고`의 닫는 `**`가 `)` 뒤·한글 앞이라 CommonMark right-flanking 규칙에 걸려 별표가 그대로 노출 → 메인이 `**단축 평가**(short-circuit evaluation)`로 수정, 같은 패턴 없음 확인. 메인 재실행 전체 검증: lint·format:check·typecheck 0, `npm test` 289, `test:build` 22, e2e 67 통과·3 건너뜀(기존과 같은 3건), axe 위반 0, `객체` 검색 1건 유지. 브라우저(dev): 1280px 다크에서 오른쪽 건너뛰기 3단계(`check('B', 1)` 평가 안 함, 콘솔 `평가: A`만), 375px 라이트에서 ?. 체인 6단계(키보드 ArrowRight×5, `?.profile`·`.age` 평가 안 함, 결과 undefined), 가로 넘침 0, 콘솔 에러 0
- 리뷰 1차 (critical-code-review: 메인 직접 — 테스트·e2e·build·접근성 / Sonnet 서브에이전트 — 콘텐츠 정확성 교차 검토, 메인 재판정): High 3건(콘텐츠 정확성, 서브에이전트는 Low로 분류했으나 프로젝트 기준으로 상향) 수정 → 재검증 통과
  - `content.mdx:33` "결과는 true나 false가 아니라" → "ToBoolean의 판정 결과(true나 false)가 아니라, 변환하지 않은 … 값"(`1 && true`는 true라 과일반화), `:211` "판정에 쓴 값이 아니라"(자기모순) → "ToBoolean의 판정 결과가 아니라", `:234` "&&가 왼쪽 값을 그대로 돌려주는 것" → "왼쪽이 falsy일 때 … (`null && 'x'`는 `null`)"
  - 재검증(메인): lint·format:check·typecheck 0, `npm test` 289, `test:build` 22, e2e 67 통과·3 건너뜀
  - Medium 0. Low는 보고만(수정 안 함): 단계 제목 "넣음"/"초기화" 혼용, scenarios "profile 프로퍼티를 가진 값" vs 본문 "객체", 표 헤더 "오른쪽을 평가하는 경우"(?.는 체인의 나머지), 예제 1 퀴즈 질문에 ' / ' 안내 없음, 본문 falsy 목록에 document.all 예외 각주 없음(단순화에는 있음), 조각 value 자체는 실행값과 직접 대조하지 않음(의미 검사·최종 바인딩 검사로 간접 보장), 시각화 `=` 기호 aria-hidden

## 구현 결과

### 계획 대비 실제 구현

- 1~6단계를 계획대로 구현했다. 달라진 점은 아래와 같다.
  - 6단계 axe를 "홀수 단계와 마지막 단계"에서 "모든 단계"로 바꿨다(`변경 이력`). 홀수 단계만으로는 `평가 안 함`·결과·`새로 생김` 단계가 빠지기 때문이다.
  - 5단계에서 본문에 근거 없던 주장 3개(`false ?? 'x'`, `?.`가 뒤 호출의 인수를 평가하지 않음, `null && 'x'`)를 "본문 주장 검증" 테스트로 근거화했다.
  - 2단계 테스트에는 계획보다 엄격한 검사를 더했다(check 필수, pending 뒤 evaluated 금지, skipped 시 result 필수, changed 규칙, 선언 키워드 일치).
  - `test:build`가 찾은 굵게 렌더링 버그(`)**한글`)를 고쳤다.
- `docs/content-guide.md`를 두 군데 갱신했다. e2e 대상 범위 설명을 현재 상태(두 개념)로 고쳤고, 굵게 렌더링 함정을 추가했다.

### 코드 리뷰

- 리뷰 1차: High 3건(콘텐츠 정확성 — 과일반화·자기모순 문장)을 수정하고 재검증을 통과했다. Medium은 0건이다. Low 7건은 보고만 했고 수정하지 않았다(`구현 진행` 참고).

### 후속 작업

- [ ] 사용자 콘텐츠 검토 후 `meta.ts` `reviewedAt` 기록
- [ ] 시뮬레이터 공통 셸 추출(사용자 결정으로 별도 작업, 세션 제안됨)
- [ ] 리뷰 Low 7건 반영 여부 결정(콘텐츠 검토 때 함께)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 리뷰에서 서브에이전트가 Low로 분류한 문장 3개를 High로 올려 고쳤다. "결과는 true나 false가 아니라"는 `1 && true`(결과 true)와 충돌하고, "판정에 쓴 값이 아니라 피연산자의 값"은 자기모순처럼 읽히며, "&&가 왼쪽 값을 그대로 돌려준다"는 왼쪽이 falsy일 때만 참이다. 프로젝트가 정확성 문제를 High로 보기 때문이다(`content.mdx` 동작 원리·결과와 이유).
- [Claude 판단] 예제로 출력할 수 없는 동작(SyntaxError·TypeError, 인수 미평가 등)은 `concept.test.ts`의 "본문 주장 검증" 테스트로 근거를 남겼다. 대안이었던 `try...catch` 예제는 미학습 범위라 쓰지 않았다. vm은 다른 realm이라 `instanceof` 대신 `e.name`으로 비교한다.
- [Claude 판단] axe를 모든 단계에서 돌린다(`test.slow()`). 계획의 홀수 단계안은 표시 종류가 빠져 검사가 비었다.
- [무검토 승인] 시뮬레이터 상태 모델: 식을 조각(`Part`) 목록과 판정(`Check` 유니온)으로 표현하고, 한 Evaluation은 한 종류의 연산자로 제한한다. 테스트는 `isTruthy`/`isNullish`로 단계마다 판정·건너뜀·결과가 명세 규칙과 맞는지 검사한다(`scenarios.ts`, `concept.test.ts`).
- [무검토 승인] `?.`의 결과를 다른 셋과 구분했다. `&&`·`||`·`??`는 피연산자 값을, `?.`는 왼쪽이 null·undefined면 `undefined`를 돌려준다(초안 HIGH를 계획 단계에서 반영, meta summary).
- 범위는 `&&`, `||`, `??`, `?.` 네 가지이고, 셸 추출은 별도 작업으로 한다(사용자 결정).

#### 배경지식

- ToBoolean(명세 추상 연산): falsy는 `false`, `0`, `-0`, `0n`, `NaN`, `''`, `null`, `undefined`의 8가지다. 브라우저의 `document.all`은 부록 B의 예외다.
- `&&`·`||`는 lval을 ToBoolean으로 판정한 뒤 lval 자체 또는 오른쪽 평가값을 반환한다. `??`는 null·undefined만 보며, CoalesceExpression 문법상 `&&`·`||`와 괄호 없이 섞을 수 없다.
- OptionalChain: 바로 왼쪽 값이 null·undefined면 체인 전체가 `undefined`가 되고, 뒤의 접근·호출·인수를 평가하지 않는다. 바로 왼쪽만 검사하므로 `user?.missing.age`는 TypeError다.
- CommonMark에서 닫는 `**`는 right-flanking이어야 한다. 앞이 문장부호이고 뒤가 글자이면 닫히지 않는다.

#### 확인 질문

1. meta summary에서 `?.`를 "피연산자의 값을 그대로 돌려준다"에 함께 묶으면 무엇이 틀리나?
   <details><summary>답</summary>`?.`는 왼쪽이 null이어도 null이 아니라 undefined를 돌려준다(`g?.x === undefined`). 왼쪽 값을 돌려주는 것은 `&&`·`||`·`??`뿐이다. 근거: 계획 1절, `concept.test.ts` "null?.x의 결과는 null이 아니라 undefined다".</details>
2. SyntaxError·TypeError 동작을 `examples/*.js`가 아니라 `concept.test.ts`로 검증한 이유는?
   <details><summary>답</summary>문법 오류는 파일 자체를 실행할 수 없고, TypeError는 실행을 멈추게 해 출력 예제로 만들 수 없다. 잡으려면 `try...catch`가 필요한데 미학습 범위다. 그래서 vm으로 오류 종류(`e.name`)를 검사한다. 근거: 계획 2절 제외 범위, 5단계 1.</details>
3. 시나리오의 조각 값(예: `check('A', 0)`의 0)을 틀리게 적으면 테스트가 반드시 잡나?
   <details><summary>답</summary>항상은 아니다. 값이 바뀌어 판정이 달라지면 의미 검사가 실패하고, 최종 변수 값이 달라지면 바인딩 값 검사가 실패한다. 하지만 판정과 결과가 그대로인 오기(예: truthy인 1을 2로 적기)는 직접 대조하지 않는다(리뷰 Low). 근거: `구현 진행` 리뷰 1차.</details>
4. "결과는 true나 false가 아니라 한쪽 피연산자의 값"이라는 문장을 왜 고쳤나?
   <details><summary>답</summary>`1 && true`처럼 피연산자가 불리언이면 결과도 true다. 대비할 대상은 "ToBoolean의 판정 결과"이지 true/false라는 값 자체가 아니다. 근거: `구현 진행` 리뷰 1차, `content.mdx` 33줄.</details>
5. a11y e2e에서 axe를 홀수 단계에서만 돌리면 무엇을 놓치나?
   <details><summary>답</summary>`평가 안 함`·결과·`새로 생김` 표시가 짝수 단계에 있는 시나리오가 있다(값을 돌려줌 인덱스 4·6, 오른쪽 건너뛰기 인덱스 2·5·9). 그 상태의 대비·구조 위반을 검사하지 못한다. 근거: `변경 이력`.</details>
