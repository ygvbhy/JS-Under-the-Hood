# switch와 let 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-26
- 기준: `main` @ `b1a365b`

## 0. 요약
- 목적: "case마다 let x를 쓰면 왜 SyntaxError일까"를 묻는 `switch-let` 페이지를 추가한다(order 145, 학습 순서 21번째/81, ecmascript, category execution). 명세의 switch 평가 순서와 CaseBlock의 Early Errors로 같은 이름 SyntaxError, 건너뛴 case의 ReferenceError, fall-through, 중괄호, var·class·함수 선언, 머리 식과 case 식의 위치를 Node 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 7개, 퀴즈 7개, 결과 표, 선언 종류 표, 흔한 오해 2개, 시뮬레이터 없음)를 추가하고 switch-break-continue·iife-module-pattern의 simplifications를 연결한다. 21번째 이후 순위 +1 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: "case마다 자기 스코프", "중괄호를 치면 다 해결된다", "case 절에는 let을 못 쓴다"는 틀린 모델을 심거나, 웹 호환 규칙(함수 선언)을 언어 공통 규칙처럼 쓰거나, ReferenceError·typeof 'undefined'처럼 원인을 가리지 못하는 출력을 증거로 쓸 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: HIGH 1·MEDIUM 3·LOW 6, Critic REVISE: MEDIUM 4·LOW 7. 메인이 모두 실행으로 재확인해 반영했다. 예제 1·6과 선언 종류 표, 퀴즈 모델을 바꿨다)
- 미확정: 없음

## 1. 요구사항
- 로드맵(`.claude/plans/concept-roadmap-extras-5.md` 2번): 제목 "switch와 let: case마다 let x를 쓰면 왜 SyntaxError일까", order 145, ecmascript. 계획 때 확인할 것: CaseBlock이 블록 하나이고 BlockDeclarationInstantiation이 모든 case의 선언을 한 번에 만든다는 것으로 설명, 독자용 예제에 eval 금지, tdz·block-scope 링크, const·함수 선언·클래스 선언의 범위를 실행으로 정함.
- 사용자 선택(2026-11-26):
  - 범위: 핵심 네 가지(두 case의 같은 이름 let·const → SyntaxError, 건너뛴 case에서 선언한 let을 다른 case에서 쓰면 ReferenceError, fall-through로 선언을 지나오면 읽힘, case마다 중괄호) + 선언 종류 확장(class, let과 var 충돌, var끼리 허용) + switch 머리 식과 case 식의 위치 + 함수 선언(sloppy 중복 허용·strict SyntaxError, 다른 case에서 미리 쓸 수 있음, 바깥 var 바인딩).
  - SyntaxError 표시: `new Function` 컴파일 검사(`tryCompile`).
  - 시각화: 표 + 퀴즈.
- 유지할 것(다시 쓰지 않고 링크): block-scope의 중복 선언 early error와 let 블록 안 var 충돌, var는 같은 스코프에서 여러 번 선언해도 된다는 서술(`app/concepts/block-scope/content.mdx:22`), tdz의 초기화 전 읽기·대입·typeof ReferenceError와 가림(`app/concepts/tdz/content.mdx:9-25`), switch-break-continue의 fall-through·break(`app/concepts/switch-break-continue/content.mdx:7-27`), function-definitions의 Function 생성자(`app/concepts/function-definitions/content.mdx:21-23`, 예제 6), iife-module-pattern의 블록 안 함수 선언 부록 B(`app/concepts/iife-module-pattern/content.mdx:55-59`, 예제 10·11), typeof가 선언되지 않은 이름에 'undefined'를 돌려준다는 것(typeof-operator).
- 제외: 제너레이터·async 함수 선언, `using` 선언(ContainsUsing), 함수 선언의 바깥 바인딩이 만들어지지 않는 조건(같은 이름의 매개변수·let, 같은 이름 함수 선언의 중복), 전역 코드 switch 안의 함수 선언, switch 문의 완료 값, 오류 메시지 문구.

## 2. 사실과 추정
### 사실 (코드·명세·실행에서 확인)
- 명세(ECMAScript 2027 초안 multipage, 사본 scratchpad `sw/ecma-stmts.html`, `sw/fns.html`, `sw/annexb.html`, id는 따옴표 없는 `id=sec-...`. Architect·Critic이 사본과 대조):
  - 14.12.1 Early Errors(`sec-switch-statement-static-semantics-early-errors`): CaseBlock의 LexicallyDeclaredNames에 중복이 있으면 Syntax Error. 예외는 호스트가 웹 브라우저이거나 Block-Level Function Declarations Web Legacy Compatibility Semantics를 지원하고, IsStrict가 false이며, 중복이 FunctionDeclaration으로만 묶일 때. LexicallyDeclaredNames의 원소가 VarDeclaredNames에도 있으면 Syntax Error.
  - 14.12.4 Evaluation(`sec-switch-statement-runtime-semantics-evaluation`): Expression 평가와 GetValue → oldEnv → blockEnv = NewDeclarativeEnvironment(oldEnv) → BlockDeclarationInstantiation(CaseBlock, blockEnv) → LexicalEnvironment를 blockEnv로 → CaseBlockEvaluation → oldEnv로 되돌림. 머리 식은 블록 환경을 만들기 전에, case의 식은 CaseBlockEvaluation(blockEnv 안)에서 평가된다.
  - 14.2.3 BlockDeclarationInstantiation(`sec-blockdeclarationinstantiation`): NOTE "When a Block or CaseBlock is evaluated a new Declarative Environment Record is created and bindings for each block scoped variable, constant, function, or class declared in the block are instantiated". const는 CreateImmutableBinding, 그 밖은 CreateMutableBinding(초기화하지 않음). 함수 선언은 InstantiateFunctionDeclaration으로 함수 객체를 만들어 바로 초기화한다(Normative Optional: 웹 호환이면 이미 초기화된 같은 이름은 SetMutableBinding → 블록 안에서는 뒤의 선언이 이김, 실행 `2`).
  - 10.2.11 FunctionDeclarationInstantiation(`sec-functiondeclarationinstantiation`)의 strict가 false일 때 Normative Optional 단계: Block, CaseClause, DefaultClause에 직접 들어 있는 FunctionDeclaration마다, VariableStatement로 바꿔도 early error가 없고 매개변수 이름이 아니면 함수의 변수 환경에 그 이름의 바인딩을 만들어 undefined로 초기화한다. 그 FunctionDeclaration이 평가될 때 블록 환경의 값을 그 바인딩에 SetMutableBinding한다.
  - 같은 이름 함수 선언이 한 CaseBlock에 둘이면 하나를 `var`로 바꾸는 순간 14.12.1 둘째 규칙에 걸리므로 명세대로라면 바깥 바인딩이 생기지 않는다고 읽히지만, Node는 바인딩을 만들고 값도 복사한다(Critic 실행 `true / function 1 / true / function 1`). 명세 해석이 확정되지 않았으므로 이 경우는 다루지 않는다(simplifications).
  - 부록 B 머리말: 웹 브라우저 호스트에서 필수, 다른 호스트에서는 규범이지만 선택. B.3.2 `sec-block-level-function-declarations-web-legacy-compatibility-semantics`.
- 예제 실행(Node v24.22.3, `runInNewContext` + `util.format`, scratchpad `sw/ex/*.js`가 8절 원문과 같음, `sw/final.mjs`):
  - same-name.js → `SyntaxError`, `ok`, `ok`, `SyntaxError`
  - skipped-case.js → `low`, `ReferenceError`, `none`
  - fall-through.js → `A`, `ReferenceError`
  - braces.js → `zero`, `one`, `one`
  - declaration-kinds.js → `class SyntaxError`, `let-class SyntaxError`, `let-var SyntaxError`, `var-var ok`, `function ok`, `strict-function SyntaxError`
  - function-in-case.js → `function`, `true`, `false`. **파일 첫 줄에 `'use strict';`를 붙이면 `function`, `ReferenceError`, `ReferenceError`** (sloppy 의존 예제)
  - head-and-case.js → `v`, `ReferenceError`
  - 예제 6 외에는 `'use strict';` 접두에서도 출력이 같다. 예제 1·5가 같은 이유는 Function 생성자 본문이 본문의 지시어로만 strict가 되기 때문이다(`app/concepts/strict-mode/content.mdx:39`). 그래서 예제 5의 `function ok`는 "strict 코드에서도 중복이 허용된다"는 뜻이 아니다.
- 틀린 모델(scratchpad `sw/final.mjs`, 예제 원문을 명시 치환해 실제 실행. 오류로 끝나면 `<오류 이름>로 실행되지 않음`(출력 0줄 SyntaxError) 형식):
  - 예제 1: M1 "case마다 자기 블록"(case 본문을 중괄호로) `ok / ok / ok / ok`. "case 절에는 let·const를 바로 쓸 수 없다"(case 뒤 선언을 `if (n) let …`으로) `SyntaxError / SyntaxError / ok / SyntaxError`. "default는 case와 따로"(default 본문만 중괄호) `SyntaxError / ok / ok / ok`.
  - 예제 2: M1 `low / high / high`(strict도 같음). M3 "switch 안 let은 var처럼"(`let`→`var`) `low / high / none`.
  - 예제 3: M1 `ReferenceError / ReferenceError`. M3 `A / undefined`. 둘째 줄 `ReferenceError`는 M1에서도 나오므로(이름을 찾지 못해서) TDZ의 증거가 아니고, M1을 가르는 줄은 첫 줄 `A`다.
  - 예제 4: "중괄호 끝에서 switch를 벗어난다"(case 0 블록 끝에 break) `zero / one`. "중괄호로 감싸도 같은 블록"(중괄호 제거) `SyntaxError로 실행되지 않음`.
  - 예제 5(ok가 나오는 줄): 실제 `var-var, function`. "함수 선언도 let처럼"(문자열의 `function f() {}`→`let f = function () {};`) `var-var`. "var는 let과 충돌하지 않는다"(var를 switch 앞 `var v;`와 대입으로) `let-var, var-var, function`. "함수 선언은 strict에서도 중복 허용"(strict-function 문자열의 지시어 제거) `var-var, function, strict-function`.
  - 예제 6: M1 `undefined / true / false`. "함수 선언은 함수 맨 위로"(선언을 run 본문 첫 줄로) `function / false / false`. "블록 안 함수 선언은 블록 밖에 이름을 만들지 않는다"(파일 앞 `'use strict';` = strict 의미) `function / ReferenceError / ReferenceError`.
  - 예제 7: "머리 식도 블록 안"(switch를 블록으로 감싸고 `let limit;`을 switch 뒤로, default의 `let`을 대입으로) `ReferenceError / ReferenceError`. "case 식도 블록 밖"(case 식을 switch 앞 var로 미리 계산)과 M1이 모두 `v / limit`. M3 `limit / limit`. "let은 함수 스코프이고 TDZ만 있다"는 머리도 안 모델과 같은 `ReferenceError / ReferenceError`(Critic).
  - 예제 2에 중괄호를 쳐도(M1) ReferenceError가 사라질 뿐 case 1의 대입이 바깥 `level`을 바꾼다(`low / high / high`). 중괄호가 해결하는 것은 같은 이름 SyntaxError뿐이다(Architect HIGH).
- 선언 종류 표(scratchpad `sw/final.mjs`): 둘째 열은 함수 안 `switch (n) { case 0: <선언> break; case 1: <같은 이름 선언> }`의 컴파일 결과, 셋째 열은 선언이 하나인 `switch (n) { case 0: try { var v = x; … } … case 1: <선언> }`에서 case 0으로 들어가 x를 읽은 결과(오류면 이름, 아니면 읽은 값의 typeof). let·const·class는 sloppy·strict 모두 `SyntaxError` / `ReferenceError`. var는 `ok` / `undefined`(읽기가 오류 없이 끝났으므로 바인딩이 있고 undefined라는 증거). 함수 선언 sloppy `ok` / `function`, strict `SyntaxError` / `function`.
- 기존 페이지의 문법 오류 표시 방식(읽고 확인): function-definitions(order 95) 예제 6 `anonymous-declaration.js`가 `try { new Function(...) } catch (e) { console.log(e.name) }`로 SyntaxError를 보이고 simplifications(`meta.ts:103`)가 "new 연산자 개념에서 다루는 new를 Function 생성자를 부르는 데만 쓴다"고 밝힌다. strict-mode 예제 3 `syntax-errors.js`의 `tryCompile`, default-parameters `use-strict-body.js`도 같은 방식. variable-declaration은 코드·결과 표를 concept.test의 `new Script`로 대조(`concept.test.ts:28-33`). block-scope는 본문 서술 + concept.test `errorNameOf`(`concept.test.ts:14-45`). `runExample`은 문자열 코드 생성을 막지 않는다(`tests/helpers/run-example.ts:15`).
- 겹침(`app/concepts` 전체 grep `switch|CaseBlock`, 걸린 절을 읽음): block-scope·tdz·for-let에는 switch가 없다. switch-break-continue는 실행 위치만 다루고 simplifications(`meta.ts:92`)가 이 주제를 미뤘다. iife-module-pattern `meta.ts:116`이 "switch의 case 안 같은 세부 조건은 다루지 않습니다"라고 밝혔다. function-calls 예제 5는 switch 안 return만, automatic-semicolon-insertion·expressions-statements는 레이블·완료 값 맥락으로만 언급한다. hoisting `meta.ts:78`·function-definitions `meta.ts:95`·execution-context `meta.ts:106`·uncaught-exceptions `meta.ts:96`·strict-mode `meta.ts:80`은 블록 안 함수 선언 일반을 미뤘고 switch를 언급하지 않아 연결하지 않는다.
- 장 범위와 order: 8장(switch)·15장(let·const). order 145는 tdz(140)와 property-attributes(150) 사이로 21번째/81. 선수 개념 slug(typeof-operator 60, switch-break-continue 80, function-definitions 95, function-calls 100, hoisting 110, block-scope 130, tdz 140)는 모두 145보다 작다. 뒤 개념(new-operator 160, strict-mode 177, execution-context 200, iife-module-pattern 215, class-basics 230, error-handling 470)은 related와 simplifications로 가리킨다. tdz가 try…catch를 같은 방식으로 썼다(`app/concepts/tdz/meta.ts:74`).
- 순서 테스트(현재 80개, 새 개념 21번째, 21 이상 +1): `app/lib/concepts.test.ts:104,111-112`(80→81, 마지막 position 81, hoisting position 17은 그대로), `app/components/concept/ConceptPager.test.tsx:18,28`(`1 / 81`, `81 / 81`), `tests/e2e/responsive.spec.ts:1873`(article 81), `tests/e2e/navigation.spec.ts:93,101,159`(카드 81, `81번째`), 같은 파일 115-135 "객체" 순위(4·13 그대로, 22 이상 +1), 185-913 `학습 순서 N / 80`(N<21이면 N 그대로, N≥21이면 N+1, 분모 81). tdz·property-attributes의 이웃을 고정한 테스트는 없다. "객체" 검색 결과 수 19는 유지(새 meta에 "객체"를 넣지 않음).
- 등록 선례(relational-comparison): `tests/e2e/helpers.ts:73`, `tests/e2e/a11y.spec.ts:61,940`, `tests/e2e/responsive.spec.ts:70,1566`, `tests/e2e/navigation.spec.ts:5,203`, `tests/build/build-output.test.ts:1588-1615`, `docs/content-guide.md:225`. 퀴즈 파싱 `app/concepts/relational-comparison/concept.test.ts:387-451`, 표 region 래퍼는 relational·math content.mdx.
- 표 파서: 결과 표의 행 형식(`예제 N: …` + `결과` 열, ` / `로 이음)은 `tests/result-tables.test.ts`가 expectedOutput과 대조한다(`tests/helpers/result-tables.ts:174`). 선언 종류 표는 머리에 결과·출력이 없고 첫 칸이 예제 꼴이 아니라 위반이 아니며 `tableBody`(`tests/helpers/expression-tables.ts:9`)로 읽는다. 두 표의 칸에 `<`는 없다.

### 추정
- 없음

## 3. 구현 전략
- relational-comparison·math 구조(ecmascript, 표+퀴즈, 퀴즈 오답을 모델로 실제 실행)를 따른다.
- SyntaxError는 function-definitions 예제 6과 같은 `tryCompile`로 보인다. 본문은 "Function 생성자는 문자열을 따로 파싱하므로 문법 오류가 예제 스크립트 전체를 막지 않고 그 자리에서 SyntaxError로 잡힌다"고 설명하고, 실제 스크립트에서는 어떤 줄도 실행되지 않는다는 것은 block-scope로 링크한다. concept.test가 그 주장을 `runInNewContext`로 대조한다.
- 퀴즈 오답은 모두 예제 파일 원문을 relational의 `swap`처럼 명시 치환(치환 횟수 단언)한 뒤 같은 실행기로 파일 전체를 실행한 출력이다. 줄 정규식 변환은 쓰지 않는다. 오류로 끝난 모델은 출력 0줄 SyntaxError면 `SyntaxError로 실행되지 않음`으로 쓴다. 한 오답을 여러 모델이 낼 수 있으므로 "모델 출력은 모두 선택지에 있고, 오답 선택지마다 그것을 내는 모델이 하나 이상"으로 단언한다. 예제 5는 출력에서 ok인 줄의 라벨을 `, `로 이어 선택지와 비교한다.
- 결과 표는 행 형식(자동 대조). 선언 종류 표는 `tableBody`로 읽고, concept.test가 2절 템플릿으로 코드를 만들어 칸마다 대조한다. 표 위에 두 템플릿을 인라인 코드로 보이고, 셋째 열은 선언이 하나인 코드라는 것을 적는다.
- 함수 선언은 "블록 스코프 선언이지만 블록에 들어갈 때 바로 함수가 된다"(BlockDeclarationInstantiation)와 "웹 호환 규칙(Normative Optional, 부록 B): sloppy mode에서만 같은 이름 중복 허용, 감싼 함수에 바깥 바인딩"으로 나눠 쓴다. 바깥 바인딩은 선언이 하나인 예제 6 기준으로만 쓴다. 예제 6의 둘째 줄 `true`(ReferenceError가 아니고 undefined)가 run에 들어갈 때부터 바깥 바인딩이 있다는 증거이고, 셋째 줄 `false`가 그 case에 닿은 뒤 함수가 들어갔다는 증거다. strict 결과(`ReferenceError`)를 본문에 함께 쓴다.
- 버린 대안: eval(규칙), 코드·결과 표 + `new Script`만(사용자 선택), 단계 시뮬레이터(사용자 선택), 예제 6의 typeof 줄(typeof는 선언되지 않은 이름에도 'undefined'라 바깥 바인딩을 가리지 못함, Critic), 선언 종류 표의 typeof 열(var 행이 증거가 되지 못함, Architect), 퀴즈 5의 규칙 함수 모델(변환 실행으로 대체), 퀴즈 6의 TDZ 모델(출력 0줄 ReferenceError, strict 의미 모델이 더 유익).

## 4. 변경 파일
- 추가 `app/concepts/switch-let/`: meta.ts, content.mdx, route.tsx, concept.test.ts, examples/{same-name,skipped-case,fall-through,braces,declaration-kinds,function-in-case,head-and-case}.js
- 수정(연결): `app/concepts/switch-break-continue/meta.ts`(simplifications 92줄, related), `app/concepts/iife-module-pattern/meta.ts`(simplifications 116줄, related). reviewedAt은 바꾸지 않는다.
- 수정(순서·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`(경로 목록).
- 문서: 이 계획, finalize 때 `concept-roadmap-extras-5.md`(2번 상태·진행 기록).
- 변경하지 않음: 공통 코드 소스, block-scope·tdz·switch-break-continue 본문.

## 5. 위험 요소
- "case마다 자기 스코프" → 예제 1 첫 줄, 예제 2(마지막 줄 `none`), 예제 3 첫 줄 `A`, 흔한 오해 1. "case 절에는 let을 못 쓴다" → 예제 1 둘째 줄 `ok`(이름만 다르면 허용). "실행하지 않은 case의 let은 없다/바깥 이름을 쓴다" → 예제 2·7, 흔한 오해 2. "let이 var처럼 undefined로 시작" → 예제 3 둘째 줄, 예제 2 둘째 줄. 막는 곳: 단계 1(원문), 단계 3(모델 단언).
- "중괄호로 다 해결된다" → summary·goal 3·본문 ③에서 해결 대상을 같은 이름 선언으로 한정하고, 중괄호를 치면 다른 case에서 이름이 보이지 않아 바깥 같은 이름을 읽고 쓴다(예제 2에 치면 `low / high / high`, concept.test M1 출력), 여러 case에서 쓸 변수는 switch 앞에 선언한다고 쓴다. 단계 1·2.
- ReferenceError·typeof 'undefined'만으로는 원인이 구별되지 않는다 → 예제 2는 바깥 같은 이름과 마지막 줄 `none`, 예제 3은 첫 줄 `A`, 예제 6은 `helper === undefined`(true/ReferenceError), 선언 종류 표는 직접 읽기로 증거를 둔다. 본문 예제별 설명이 각 줄의 증거 범위를 밝힌다. 단계 2 검토 항목.
- 웹 호환 규칙을 언어 공통 규칙처럼 쓰기, 중복 함수 선언의 바깥 바인딩을 단정하기 → ④ 문단과 simplifications에 호스트 조건, Node 결과, 중복 선언의 바깥 바인딩은 다루지 않음. 선언 종류 표의 함수 선언(sloppy) 행 이름에 웹 호환 규칙 조건. 단계 1·2.
- 예제 5의 `function ok`를 strict 코드에서도 허용으로 읽기 → simplifications 1과 본문 예제 5 설명에 "Function 생성자 본문은 지시어가 없어 sloppy, strict-function 줄은 지시어로 strict"(strict mode 개념). 단계 1·2.
- Function 생성자 본문은 스크립트가 아니라 함수 본문 → switch의 Early Errors는 같고 본문의 `n`은 컴파일만 하므로 선언하지 않아도 된다고 simplifications에 적는다.
- 장 범위(new, try…catch, class, strict mode, ES 모듈) → simplifications와 related. 단계 1.
- 순서 테스트(80→81, 21 이상 +1) → 단계 4 grep·navigation e2e.
- "객체"가 meta에 들어가 검색 결과가 바뀜 → `filterConcepts([concept], '객체')` 빈 배열 단언.

## 6. 검증 방법
- 정적: lint, format:check, typecheck, `npm test`, `npm run test:build`.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "switch-let|switch와 let|홈 학습 순서 보기"`(a11y 케이스 이름 '개념 페이지: switch와 let').
- 브라우저(dev 서버 재시작 후): /concepts/switch-let에서 학습 순서 21 / 81·이전 tdz·다음 property-attributes, 결과 표 7행·선언 종류 표 6행과 두 표의 템플릿 문구, 퀴즈 7개와 정답 피드백(예제 2 퀴즈 정답 선택 후 "정답입니다."), 375px 가로 스크롤 없음(두 표 region 안에서만 스크롤), 콘솔 오류 없음, switch-break-continue·iife-module-pattern 페이지의 simplifications 새 문구 렌더.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 예제와 meta
- 대상: `app/concepts/switch-let/examples/*.js`, `meta.ts`, `route.tsx`
- 변경: 예제 7개를 아래 원문 그대로(scratchpad `sw/ex/`와 바이트 동일, 파일 끝 줄바꿈 하나) 만든다.
  - same-name.js
    ```js
    function tryCompile(code) {
      try {
        new Function(code);
        return 'ok';
      } catch (e) {
        return e.name;
      }
    }
    console.log(tryCompile('switch (n) { case 0: let x = 1; break; case 1: let x = 2; }'));
    console.log(tryCompile('switch (n) { case 0: let x = 1; break; case 1: let y = 2; }'));
    console.log(tryCompile('if (n) { let x = 1; } else { let x = 2; }'));
    console.log(tryCompile('switch (n) { case 0: const x = 1; break; default: const x = 2; }'));
    ```
  - skipped-case.js
    ```js
    let level = 'none';
    function setLevel(n) {
      switch (n) {
        case 0:
          let level = 'low';
          console.log(level);
          break;
        case 1:
          try {
            level = 'high';
            console.log(level);
          } catch (e) {
            console.log(e.name);
          }
      }
    }
    setLevel(0);
    setLevel(1);
    console.log(level);
    ```
  - fall-through.js
    ```js
    function walk(n) {
      switch (n) {
        case 0:
          let step = 'A';
        case 1:
          try {
            console.log(step);
          } catch (e) {
            console.log(e.name);
          }
      }
    }
    walk(0);
    walk(1);
    ```
  - braces.js
    ```js
    function pick(n) {
      switch (n) {
        case 0: {
          let word = 'zero';
          console.log(word);
        }
        case 1: {
          let word = 'one';
          console.log(word);
          break;
        }
      }
    }
    pick(0);
    pick(1);
    ```
  - declaration-kinds.js
    ```js
    function tryCompile(code) {
      try {
        new Function(code);
        return 'ok';
      } catch (e) {
        return e.name;
      }
    }
    function check(label, code) {
      console.log(label, tryCompile(code));
    }
    check('class', 'switch (n) { case 0: class C {} break; case 1: class C {} }');
    check('let-class', 'switch (n) { case 0: let C = 1; break; case 1: class C {} }');
    check('let-var', 'switch (n) { case 0: let v = 1; break; case 1: var v = 2; }');
    check('var-var', 'switch (n) { case 0: var v = 1; break; case 1: var v = 2; }');
    check('function', 'switch (n) { case 0: function f() {} break; case 1: function f() {} }');
    check('strict-function', "'use strict'; switch (n) { case 0: function f() {} break; case 1: function f() {} }");
    ```
  - function-in-case.js
    ```js
    function run(n) {
      switch (n) {
        case 0:
          console.log(typeof helper);
          break;
        case 1:
          function helper() {}
      }
      try {
        console.log(helper === undefined);
      } catch (e) {
        console.log(e.name);
      }
    }
    run(0);
    run(1);
    ```
  - head-and-case.js
    ```js
    let limit = 1;
    function check(v) {
      try {
        switch (limit) {
          case v:
            console.log('v');
            break;
          case limit:
            console.log('limit');
            break;
          default:
            let limit = 99;
        }
      } catch (e) {
        console.log(e.name);
      }
    }
    check(1);
    check(2);
    ```
  - meta:
    - slug 'switch-let', title 'switch와 let: case마다 let x를 쓰면 왜 SyntaxError일까', category 'execution', order 145, reviewedAt null.
    - summary ≤160자, "객체" 금지, 중괄호의 해결 대상을 같은 이름 선언으로 한정. 안(158자): "switch의 case들은 블록 하나를 함께 쓰므로 두 case에서 같은 이름을 let으로 선언하면 SyntaxError이고, 선언한 case를 건너뛰고 다른 case에서 그 이름을 쓰면 ReferenceError입니다. 같은 이름 선언은 case마다 중괄호로 블록을 나눠 피합니다."
    - tags: switch, case, default, let, const, class, var, 함수 선언, SyntaxError, ReferenceError, TDZ, 블록 스코프, CaseBlock, BlockDeclarationInstantiation, early error, 중괄호, fall-through 등.
    - goals 5개: ① switch의 모든 case(default 포함)가 블록 하나라 두 case에서 같은 이름을 let·const·class로 선언하면 실행 전 SyntaxError라는 것을 설명 ② 선언한 case를 건너뛰고 다른 case에서 그 이름을 쓰면 ReferenceError이고 fall-through로 선언문을 지나오면 쓸 수 있다는 것을 예측 ③ case마다 중괄호로 블록을 나누면 같은 이름을 선언할 수 있지만 다른 case에서는 그 이름이 보이지 않고 fall-through는 그대로라는 것을 설명 ④ var끼리는 허용되고 let과 같은 이름의 var는 SyntaxError이며, 함수 선언은 블록에 들어갈 때 바로 함수가 되고 같은 이름 중복은 웹 호환 규칙에서 sloppy mode일 때만 허용된다는 것을 구분 ⑤ switch 머리의 식은 블록 밖에서, case의 식은 블록 안에서 평가된다는 것을 예측.
    - prerequisites: `{ label: 'switch와 break·continue', slug: 'switch-break-continue' }`, `{ label: '블록 스코프', slug: 'block-scope' }`, `{ label: 'TDZ', slug: 'tdz' }`, `{ label: '호이스팅', slug: 'hoisting' }`, `{ label: 'typeof 연산자', slug: 'typeof-operator' }`, `{ label: '함수를 정의하는 방법', slug: 'function-definitions' }`, `{ label: '함수 호출', slug: 'function-calls' }` — label은 각 페이지 표기 확인.
    - related: strict-mode, iife-module-pattern, error-handling, new-operator, class-basics, execution-context, es-modules.
    - examples: id = 파일 이름(확장자 제외), runtime 'ecmascript', expectedOutput은 2절 실행값.
    - simplifications(최소):
      1. 예제는 Node vm에서 strict mode가 아닌 스크립트로 실행했고 console은 호스트 API. 예제 6만 sloppy mode에 기대며 strict mode와 ES 모듈(항상 strict)에서는 둘째·셋째 줄이 ReferenceError다. 나머지 예제는 strict mode에서도 출력이 같다. 예제 1·5의 문자열은 Function 생성자 본문의 지시어로만 strict 여부가 정해지므로 파일과 무관하게 strict-function 줄만 strict다(strict mode 개념).
      2. 예제 1·5는 함수를 정의하는 방법 개념의 Function 생성자를 문법 검사 도구로만 쓴다. new는 new 연산자 개념. 문자열은 스크립트가 아니라 함수 본문으로 파싱되지만 switch 문의 문법 규칙은 같고, 본문의 n은 컴파일만 하므로 선언하지 않았다. 실제 스크립트에서는 이 SyntaxError 때문에 스크립트의 어떤 줄도 실행되지 않는다(블록 스코프 개념).
      3. try…catch와 e.name은 오류 종류를 보이려고만 쓴다(try/catch/finally 개념). 오류 메시지 문구는 엔진마다 달라 인용하지 않는다.
      4. 명세의 BlockDeclarationInstantiation과 선언적 환경 레코드를 "switch에 들어갈 때 블록 하나에 이름을 만든다"로 줄여 말한다(환경 레코드는 실행 컨텍스트 개념).
      5. 함수 선언의 sloppy mode 중복 허용과 바깥 바인딩은 명세의 웹 호환 규칙(Normative Optional, 부록 B)으로, 웹 브라우저 호스트에서 필수이고 다른 호스트에서는 선택이다. 예제는 Node 결과다. 바깥 바인딩은 선언이 하나인 경우만 보이며, 같은 이름 함수 선언이 중복될 때와 같은 이름의 매개변수·let이 있을 때, 전역 코드의 switch는 다루지 않는다. 블록 안 함수 선언 일반은 즉시 실행 함수와 모듈 패턴 개념에서 다룬다.
      6. class 선언은 클래스 개념에서 다루고 여기서는 이름이 같은 블록에 만들어진다는 점만 쓴다. 제너레이터·async 함수 선언과 using 선언은 다루지 않는다.
      7. switch 문의 완료 값은 다루지 않는다.
    - references: 명세 sec-switch-statement-static-semantics-early-errors, sec-switch-statement-runtime-semantics-evaluation, sec-blockdeclarationinstantiation, sec-runtime-semantics-caseblockevaluation, sec-functiondeclarationinstantiation, sec-block-level-function-declarations-web-legacy-compatibility-semantics, MDN switch(블록 스코프 절), MDN let. 명세 함수 이름은 사본 표기(InstantiateFunctionDeclaration 등)를 따른다.
- 완료 조건: `npx vitest run tests/examples.test.ts -t switch-let`(저장소 루트)에서 예제 7개 출력 = expectedOutput, 예제가 scratchpad 원본과 `cmp` 동일(scratchpad가 지워졌으면 이 절 원문과 diff), summary ≤160자, 명세 앵커 6개가 분할 페이지에 존재(curl+grep), MDN 200.

### 2. 본문
- 대상: `content.mdx`
- 변경:
  - 첫 문단: 질문 + 다루는 것 + 선수 개념 링크(switch-break-continue, block-scope, tdz).
  - 동작 원리 h3:
    ① switch의 case들은 블록 하나: 명세 평가 순서(머리 식 → 블록 환경 → 모든 case의 선언 이름을 만듦 → case 비교·실행 → 원래 환경). 같은 이름 let·const·class는 early error(SyntaxError, 실행 전 거부는 block-scope 링크). 오류를 가르는 것은 이름의 중복이지 case 절에 선언을 쓴 것이 아니다(이름이 다르면 ok). if/else의 두 블록은 각각 블록이라 괜찮다.
    ② 이름은 switch에 들어갈 때 만들어지고 선언문을 실행할 때 초기화된다: 건너뛴 case의 선언은 초기화되지 않은 채 남아 다른 case에서 읽거나 대입하면 ReferenceError(tdz 링크), 바깥 같은 이름도 가린다. fall-through로 선언문을 실행하고 넘어오면 쓸 수 있다. ReferenceError라는 이름만으로는 "초기화 전"과 "찾을 수 없음"이 구별되지 않으므로 예제는 바깥 이름이 바뀌지 않는지, fall-through에서 값이 읽히는지로 확인한다.
    ③ case마다 중괄호: 블록 문이 case의 문장이 되어 각자 블록이라 같은 이름을 선언할 수 있다. break는 블록 안에서도 switch를 끝내고, 블록의 닫는 중괄호는 switch를 끝내지 않는다(fall-through 그대로). 중괄호가 해결하는 것은 같은 이름 선언뿐이다: 다른 case에서는 그 이름이 보이지 않아 바깥에 같은 이름이 있으면 그쪽을 읽고 쓴다(예제 2에 중괄호를 치면 `low / high / high`). 여러 case에서 쓸 변수는 switch 앞에 선언한다.
    ④ var와 함수 선언: var는 같은 스코프에서 여러 번 선언해도 되고(block-scope 링크) switch 블록이 아니라 감싼 함수의 스코프에 속하므로 var끼리는 허용, 같은 switch 블록의 let과 같은 이름이면 SyntaxError(block-scope의 let 블록 안 var 규칙과 같음). 함수 선언은 블록 스코프 선언이지만 switch에 들어갈 때 바로 함수 객체로 초기화되어 다른 case에서도 쓸 수 있다. 웹 호환 규칙(호스트 조건 명시): sloppy mode에서는 같은 이름 함수 선언 중복이 허용된다. 또 선언이 하나일 때 감싼 함수에 같은 이름 바인딩이 함수에 들어갈 때 undefined로 만들어지고, 실행이 그 선언에 닿을 때 함수가 들어간다. strict mode에서는 중복이 SyntaxError이고 바깥 바인딩이 없다(strict-mode, iife-module-pattern 링크).
    ⑤ 머리 식은 블록 밖, case 식은 블록 안(명세 단계 순서).
    ⑥ 예제가 쓰는 도구: tryCompile(Function 생성자, function-definitions 링크)과 try…catch.
  - 예제 7개 + 퀴즈 7개(아래 선택지를 이 순서로):
    - 퀴즈 1(예제 1 전체): ['ok / ok / ok / ok', 'SyntaxError / SyntaxError / ok / SyntaxError', 'SyntaxError / ok / ok / ok', 'SyntaxError / ok / ok / SyntaxError'], answer 3.
    - 퀴즈 2(예제 2 전체): ['low / high / high', 'low / ReferenceError / none', 'low / high / none'], answer 1.
    - 퀴즈 3(예제 3 전체): ['A / undefined', 'ReferenceError / ReferenceError', 'A / ReferenceError'], answer 2.
    - 퀴즈 4(예제 4 전체): ['zero / one / one', 'zero / one', 'SyntaxError로 실행되지 않음'], answer 0.
    - 퀴즈 5(예제 5에서 ok가 나오는 줄): ['var-var', 'var-var, function', 'let-var, var-var, function', 'var-var, function, strict-function'], answer 1.
    - 퀴즈 6(예제 6 전체): ['undefined / true / false', 'function / false / false', 'function / true / false', 'function / ReferenceError / ReferenceError'], answer 2.
    - 퀴즈 7(예제 7 전체): ['ReferenceError / ReferenceError', 'v / limit', 'limit / limit', 'v / ReferenceError'], answer 3.
    - explanation은 정답 이유와 오답 모델 하나 이상을 짚는다(2절 모델 이름). 퀴즈 6 해설은 strict mode 결과가 넷째 선택지라는 것을 밝힌다.
  - 결과와 이유:
    - 결과 표: 행 형식, 머리 `예제 | 결과 | 배제한 모델`, 7행, 출력은 ` / `로 이음. 예제 7의 배제한 모델에 "let은 함수 스코프이고 TDZ만 있다"도 적는다. relational·math처럼 `role="region"`, `tabIndex={0}`, `aria-label="…(좁은 화면에서는 가로로 스크롤할 수 있습니다)"` 래퍼.
    - 예제별 h3: 줄마다 무엇을 보이고 무엇을 배제하는지와 증거 범위(예제 3 둘째 줄은 TDZ의 증거가 아님, 예제 5 function 줄은 Function 생성자 본문이 sloppy라서, 예제 6 둘째·셋째 줄의 의미와 strict 결과).
    - 선언 종류 표: 머리 `선언 | 두 case에 같은 이름 | 선언한 case보다 앞 case에서 읽기`, 행 `let`·`const`·`class`·`var`·`함수 선언(sloppy, 웹 호환 규칙)`·`함수 선언(strict)`, 칸 값은 2절. 표 바로 위 문장에 두 열의 코드 모양을 `<code>`로 보이고, 셋째 열은 선언이 하나인 코드이고 오류가 없으면 읽은 값의 typeof라는 것, var 행의 undefined는 읽기가 오류 없이 끝난 결과라는 것을 적는다. 같은 region 래퍼.
  - 흔한 오해 2개: "case마다 자기 스코프가 있다", "실행하지 않은 case의 let은 없는 것과 같다".
- 주의: 독자용 본문에 '테스트' 금지, eval 금지. 끼운 문장 뒤 지시어 재확인. 표 칸에 `<` 금지. JSX 칸의 코드는 `<code>{'…'}</code>`.
- 완료 조건: 필수 h2 3개, 퀴즈 7개가 위 선택지·answer와 같음, 결과 표가 result-tables 대조 통과, `npm test`(content-integrity·result-tables)·`npm run test:build` 통과. 검토 체크(사람·리뷰어가 확인): 본문에 typeof 'undefined'나 ReferenceError 하나만으로 원인을 단정하는 문장이 없음, 함수 선언 문단에 호스트 조건이 있고 바깥 바인딩은 선언 하나 기준임, "중괄호로 해결"이 같은 이름 선언으로 한정됨.

### 3. concept.test와 빌드 등록
- 대상: `concept.test.ts`, `tests/build/build-output.test.ts`
- 변경:
  - 'use strict' 접두 실행: 예제 6 외에는 expectedOutput과 같고, 예제 6은 `['function', 'ReferenceError', 'ReferenceError']`.
  - 실제 스크립트의 early error: `runInNewContext("console.log(1);\n" + 예제 1 첫 문자열)`이 SyntaxError이고 출력이 없음.
  - 중괄호 범위: 예제 2에 case마다 중괄호를 친 소스가 `low / high / high`(본문 ③ 주장).
  - 모델 실행(2절 전부): 예제 파일 원문을 명시 치환(치환 횟수 단언)해 같은 실행기로 실행. 모델 출력 하드코딩 단언, 정답과 다름, 선택지에 있음, 오답 선택지마다 그것을 내는 모델이 하나 이상. 오류 형식은 3절 규칙. 변환 없이 같은 실행기를 돌리면 expectedOutput과 같음(실행기 대조).
  - 퀴즈: choices·answer가 2단계 목록과 같고 answer 선택지가 정답, 선택지 중복 없음(relational concept.test 387-451 방식). 퀴즈 5는 출력에서 ok인 줄 라벨을 `, `로 이은 값과 비교.
  - 선언 종류 표: `tableBody(mdx, [머리 3개])` 6행, 행마다 2절 템플릿으로 코드를 만들어 컴파일·읽기 결과 대조(scratchpad `sw/final.mjs` 끝부분 방식).
  - meta: summary 길이, slug 있는 선수 개념 order < 145, `filterConcepts([concept], '객체')` 빈 배열, 예제 파일에 `eval` 없음.
  - build-output에 '프리렌더 (switch-let)' 블록: 두 표 region, 퀴즈 `<details>` 7개 이상과 정답 문자열 7개.
- 완료 조건: 퀴즈 answer·표 칸을 바꾸면 실패(변이 검사 후 원복), `npm test` 통과.

### 4. 연결과 순서 테스트
- 대상: switch-break-continue·iife-module-pattern meta, 순서 테스트 묶음, content-guide, e2e 등록.
- 변경:
  - switch-break-continue simplifications 92줄 → "…case마다 선언한 let·const가 하나의 블록을 공유하는 문제는 switch와 let 개념에서 다룹니다." related에 'switch-let'.
  - iife-module-pattern simplifications 116줄 → "… 같은 이름의 let이 있을 때의 세부 조건은 다루지 않고, switch의 case 안 함수 선언은 switch와 let 개념에서 다룹니다." related에 'switch-let'.
  - 순서 테스트는 2절 목록대로. e2e helpers `SWITCH_LET_PATH`, a11y '개념 페이지: switch와 let', responsive 가로 스크롤, navigation 새 pager 블록(21 / 81, 이전 tdz, 다음 property-attributes). content-guide 225줄 경로 목록에 `switch-let`.
- 완료 조건: 순서 관련 파일에서 `grep -nE "/ 80|80번째|toHaveCount\(80\)|toBe\(80\)"` 0건, navigation e2e 통과, 연결 문장의 하위 주제가 새 본문에 실제로 있음.

### 5. 전체 검증
- AGENTS.md 검증 순서 + 6절 e2e + 브라우저 시나리오.

## 9. 추가 개선 후보
- tdz·block-scope의 related에 `switch-let`을 넣을지(두 페이지 simplifications가 이 주제를 미루지 않아 이번 범위에서는 빼었다).

## 변경 이력
- 2026-11-26 (리뷰 지적, Opus 명세 교차 검토 HIGH 2·MEDIUM 5·LOW 9): 요구사항 범위 안의 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3.
  - 예제 4(braces.js)에 바깥 `let word = 'outer'`와 `case 2: { console.log(word); }`, `pick(2)`를 더한다(출력 `zero / one / one / outer`, strict 같음). 예제 4만으로는 "다른 case에서 그 이름이 보이지 않는다"가 보이지 않았고(HIGH), 본문 ③의 "예제 2에 중괄호를 친 변형 `low / high / high`"는 예제 파일에 없는 출력 주장이었다(AGENTS 예제 규칙). 본문 ③·흔한 오해 1·goal ③은 예제 4의 `pick(2)`를 근거로 쓰고 변형 출력 주장은 뺀다. 퀴즈 4: ['zero / one / one / outer', 'zero / one / outer', 'SyntaxError로 실행되지 않음', 'zero / one / one / undefined'], answer 0(모델: 닫는 중괄호가 break처럼 동작 / 중괄호를 지운 같은 블록 / 중괄호 안 let을 var로).
  - 함수 선언 문단: "선언이 하나일 때"를 규칙의 조건처럼 쓰지 않고, 규칙은 "감싼 함수에 같은 이름 바인딩을 따로 만든다"로, 범위는 "이 페이지는 선언이 하나인 경우만 보고 같은 이름 함수 선언이 여럿일 때는 다루지 않는다"로 분리(HIGH). strict에서 바깥 바인딩이 없다는 문장의 링크를 strict-mode(블록 안 함수 선언 제외)에서 iife-module-pattern으로.
  - 예제 6: 출력이 보이는 것(switch 뒤에도 바인딩이 있고 undefined)과 명세가 정한 생성 시점(FunctionDeclarationInstantiation, run에 들어갈 때)을 나눠 쓴다. 예제 6을 설명하는 곳(예제 절 머리, 퀴즈 6 해설, 결과 표, simplifications 1)에 "웹 호환 규칙을 지원하는 호스트(Node 포함)의 sloppy mode" 조건, 넷째 선택지는 "strict mode, ES 모듈, 또는 그 규칙을 지원하지 않는 호스트의 결과".
  - ④ var 문장의 충돌 대상에 함수 선언 추가(탐침 `switch (n) { case 0: function f() {} break; case 1: var f; }` SyntaxError), concept.test에 파싱 단언.
  - LOW: 첫 Early Error 규칙에 "(함수 선언끼리의 예외는 아래)", ①의 "중괄호 안 전체" → "각 case·default에 바로 쓴 선언"(탐침: case 안 중괄호 블록의 let은 다른 case의 같은 이름 let과 충돌 안 함), 선언 종류 표 셋째 열은 웹 호환 규칙과 무관함을 설명 문단에, 결과 표 예제 2 모델 이름을 퀴즈 해설과 맞춤, 표 아래 "var는 선언보다 앞 case에서 읽으면 undefined", simplifications 5에 같은 이름 var·이름이 arguments인 경우 추가, ES 모듈 언급에 "ES 모듈 개념에서 다룹니다", 첫 문단 "한 case에서만 선언하면 SyntaxError는 나지 않는데", var 스코프 "함수 밖이면 스크립트".

- 2026-11-26 (사용자 전달 외부 검토 4건): 요구사항 범위 안의 문구 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3. 근거는 현재 명세 초안(tc39.es/ecma262)과 Node 24.22.3 탐침.
  - 1(InstantiateFunctionDeclaration은 명세에 없는 이름): 반영하지 않음. 현재 초안의 BlockDeclarationInstantiation은 "InstantiateFunctionDeclaration of decl"을 호출한다(초안 본문 8회, InstantiateFunctionObject 0회). 검토가 인용한 read262는 이전 판(InstantiateFunctionObject)이고 페이지 references는 초안을 가리킨다.
  - 2(예제 6만 웹 호환 규칙에 기댄다): 반영. 초안 14.12.1의 중복 예외 조건에 "host supports … Web Legacy Compatibility Semantics"가 있어 예제 5의 function 줄도 호스트 의존이다. 본문 예제 머리말·meta simplifications 1을 "예제 6의 출력과 예제 5의 function 줄은 … 호스트에서만, 파일 sloppy 의존은 예제 6뿐"으로, 예제 5 결과와 이유 5번 줄에 "지원하지 않는 호스트에서는 SyntaxError"를 더한다.
  - 3(렉시컬 선언 이름 범위): 반영. 탐침 `case 0: { let x; } break; case 1: var x;` ok, `case 0: let x; … case 1: { var x; }` SyntaxError. ①과 ④를 "case·default에 바로 쓴 let·const·class·함수 선언의 이름(렉시컬 선언 이름)"으로 고치고, 안쪽 블록의 let은 이 검사에 들지 않는다고 쓴다. concept.test에 ok 쪽 파싱 단언 추가.
  - 4(using): 반영. 초안 14.12.1 "CaseClause/DefaultClause: It is a Syntax Error if ContainsUsing of StatementList is true"(ContainsUsing은 StatementListItem의 Declaration만 본다), Node 24 탐침 `case 0: using x = null;` SyntaxError, 중괄호 안 ok. ①의 "오류를 가르는 것은 이름의 중복" 문장을 let·const·class로 한정하고, simplifications 6에 using·await using은 case·default에 바로 쓰는 것 자체가 SyntaxError라고 쓴다. concept.test에 using 지원 런타임에서만 도는 파싱 단언 추가(Node 22는 건너뜀).
  - 재검토(같은 날): ④ var 문단 마지막 문장이 두 절을 한 주어로 묶어 "switch 밖 var와 충돌하지 않는다"가 안쪽 블록 let에 대한 말로 읽힘 → 두 문장으로 나누고 둘째 문장 주어를 "case·default에 바로 쓴 선언"으로 밝힌다.

## 구현 진행

- baseline (2026-11-26, `b1a365b`): lint 통과, format:check 통과, typecheck 통과, npm test 194파일 6433개 통과, test:build 635개 통과
- [x] 1·2·3. 새 개념 폴더(예제 7개·meta·route·본문·concept.test)와 build-output 등록 — Sonnet 구현. 메인 확인: 예제 7개가 scratchpad 원본과 바이트 동일(cmp, Sonnet 보고 + 원본 복사), 본문 전체 정독 후 직접 수정 3건 — ④ var 문장이 switch 밖 var도 충돌하는 것처럼 읽혀 "switch 안에 쓴 var(case 안 더 안쪽 블록 포함)… switch 밖 같은 이름 var와는 충돌하지 않음"으로 고치고 concept.test에 파싱 단언 3개 추가(탐침: 안쪽 블록 var SyntaxError, switch 앞·뒤 var ok), 퀴즈 5 해설의 var 허용 이유를 "같은 스코프에서 여러 번 선언해도 되므로"로, concept.test의 `reviewedAt` null 단언 제거(프로젝트 규칙). 브라우저 375px에서 표 칸 `<code>`가 단어 중간에서 끊겨 결과 칸을 일반 텍스트로 바꿈(첫 열 선언 이름만 code 유지). Sonnet 보고: 변이 검사(퀴즈 answer, 선언 종류 표 칸, 결과 표 칸 변경 시 실패 후 원복), 명세 앵커 6개·MDN 2개 확인.
- [x] 4. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(switch-break-continue·iife-module-pattern simplifications와 related, 81·21 이상 +1, pager N은 1·4·8·14·16 그대로·31 이상 +1·새 블록 21, "객체" 순위 4·13 외 +1, e2e·content-guide 등록). `grep -nE "/ 80|80번째|toHaveCount\(80\)|toBe\(80\)"` 0건.
- [x] 5. 전체 검증 (2026-11-26) — lint·format:check·typecheck 통과, npm test 195파일 6530개 통과(baseline 6433), test:build 642개 통과(baseline 635), e2e navigation 16개·관련 8개 통과. 브라우저(dev 5173 새로 시작): 학습 순서 21 / 81·이전 tdz·다음 property-attributes, 결과 표 7행·선언 종류 표 6행, 퀴즈 7개(예제 2 정답 선택 후 "정답입니다."), 375px 가로 넘침 0(두 region 343=343), 콘솔 오류 없음, switch-break-continue·iife-module-pattern 새 문구 렌더. 표 칸 변경 뒤 개념·result-tables·content-integrity 1309개, format·lint 재통과.
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토, 2026-11-26): 메인 리뷰는 Critical/High 없음(concept.test·build-output·route 확인, 본문 정독 중 고친 3건은 위 단계 기록). Opus HIGH 2·MEDIUM 5·LOW 9 → 모두 반영(변경 이력, Sonnet 구현). 메인 확인: 예제 4 새 원본과 바이트 동일(cmp), 바뀐 본문(①·③·④·예제 4·6 h3, 퀴즈 4·6 해설, simplifications 1·5) 정독, 탐침 — 예제 4 모델 3개(`zero / one / outer`, SyntaxError, `zero / one / one / undefined`), 함수 선언과 switch 안 var SyntaxError, case 안 중괄호 블록의 let은 다른 case의 let과 충돌 안 함, 같은 이름 var가 있으면 새 바인딩 없이 값만 복사(`5,number`→도달 시 `function`), 이름이 arguments면 arguments 객체 바인딩에 값 복사.
  - 재검증: lint·format:check·typecheck 통과, npm test 195파일 6530개, test:build 642개, e2e navigation 16개·관련 8개 통과. dev 서버에서 예제 4 코드(`let word = 'outer'`) 렌더, 퀴즈 4 정답 선택 후 "정답입니다.", 표 7행·6행, 콘솔 오류 없음. 수정 범위 재리뷰: 새 High 없음.
  - 고치지 않고 남긴 Medium/Low: 없음.
- 외부 검토 반영(2026-11-26, 변경 이력 참고): 4건 중 3건 반영, 1건(연산 이름)은 현재 명세 초안 기준 맞는 이름이라 유지. 재검증: lint·format:check·typecheck 통과, npm test 195파일 6532개(새 파싱 단언 2개 포함, Node 24에서 using 단언이 건너뛰지 않고 실행됨), test:build 642개, e2e navigation 16개·관련 8개 통과.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(ecmascript 예제 7개·퀴즈 7개·결과 표·선언 종류 표·흔한 오해 2개, 시뮬레이터 없음, order 145·학습 순서 21/81, category execution, switch-break-continue·iife-module-pattern simplifications 연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것: 메인 확인으로 var 충돌 범위(switch 안 var만), 퀴즈 5의 var 이유, 375px 표 칸(결과 칸을 일반 텍스트로)을 고쳤다. Opus 리뷰로 예제 4에 바깥 `word`와 `case 2`를 더해 다른 case에서 이름이 보이지 않음을 실행으로 보이고, "선언이 하나일 때"를 규칙 조건이 아닌 페이지 범위로 나누고, 예제 6의 보이는 것과 명세 시점을 나눴다. 사용자 전달 외부 검토로 예제 5 function 줄의 호스트 의존, 렉시컬 선언 이름 범위(case·default에 바로 쓴 선언), using·await using 문장을 더했고, 연산 이름(InstantiateFunctionDeclaration)은 현재 명세 초안 기준이라 유지했다. reviewedAt은 사용자 결정으로 2026-11-26을 기록했고, 연결한 두 페이지는 그대로 뒀다.

### 코드 리뷰
- 리뷰 1차(critical-code-review 메인 + Opus 명세 교차 검토): 메인 3건, Opus HIGH 2·MEDIUM 5·LOW 9를 모두 고쳤다. 사용자 전달 검토 4건 중 3건 반영·1건 근거와 함께 유지, 재검토 1건(낮음)도 반영했다.
- 고치지 않고 남긴 항목: 없음.

### 후속 작업
- [ ] 없음. 로드맵 5의 다음 개념(3번 내장 생성자 상속)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 4(braces.js)에 바깥 `let word = 'outer'`와 `case 2`를 더했다 — 원래 예제는 중괄호로 같은 이름 선언이 된다는 것만 보였고 "다른 case에서는 그 이름이 보이지 않는다"는 배제하지 못했다. `pick(2)`가 `outer`를 출력해 바깥 이름을 읽는다는 것이 증거다(Opus HIGH).
- [Claude 판단] 퀴즈 오답은 예제 원문을 명시 치환(`rep`, 횟수 단언)한 틀린 모델을 실제로 실행한 출력에서 만들었다(concept.test.ts `MODELS`) — 손으로 쓴 오답은 모델과 맞지 않을 수 있기 때문이다.
- [Claude 판단] 예제 6을 "함수에 들어갈 때 바깥 바인딩이 만들어진다"의 증거로 쓰지 않고, 출력이 보이는 것(switch 뒤에도 이름이 있고 undefined)과 명세가 정한 시점(FunctionDeclarationInstantiation)을 나눴다. 같은 이름 함수 선언 중복은 명세 해석과 Node 동작이 다를 수 있어 다루지 않았다.
- [Claude 판단] 외부 검토의 "InstantiateFunctionObject로 고치라"는 지적을 반영하지 않았다 — 현재 명세 초안은 InstantiateFunctionDeclaration을 쓰고, 검토가 인용한 read262는 이전 판이다. 페이지 references는 초안을 가리킨다.
- SyntaxError 표시는 Function 생성자 컴파일 검사, 다룰 범위(선언 종류 확장·머리 식과 case 식·함수 선언), 표 + 퀴즈 — 사용자가 골랐다. 외부 검토 지적 2·3·4와 재검토는 사용자가 전달해 반영했다.

#### 배경지식
- 14.12.1 Early Errors: CaseBlock의 LexicallyDeclaredNames(case·default에 바로 쓴 let·const·class·함수 선언)에 중복이 있으면 SyntaxError(웹 호환 규칙을 지원하는 호스트에서 sloppy mode이고 중복이 함수 선언끼리면 예외). 그 이름이 CaseBlock의 VarDeclaredNames(안쪽 블록 var 포함)와 겹쳐도 SyntaxError. case·default의 StatementList에 using·await using이 바로 있으면(ContainsUsing) SyntaxError.
- 14.12.4 Evaluation: 머리 식은 블록 밖에서 평가하고, 그 뒤 블록 환경을 만들어 BlockDeclarationInstantiation을 하고 case 식은 그 블록 안에서 평가한다. let·const·class는 초기화 전 상태, 함수 선언은 곧바로 함수로 초기화된다.
- 부록 B 웹 호환 규칙은 웹 브라우저 호스트에서 필수, 다른 호스트에서 선택이다. sloppy mode에서 블록 안 함수 선언마다 감싼 함수에 같은 이름 var 바인딩(undefined)을 만들고, 선언에 닿으면 블록의 함수를 그 바인딩에 대입한다.

#### 확인 질문
1. 예제 2에서 ReferenceError 한 줄만으로는 원인을 단정할 수 없는 이유와, 실제 증거가 되는 줄은?
   <details><summary>답</summary>ReferenceError는 "이름이 아예 없다" 모델에서도 나온다. 마지막 줄 `none`이 바깥 level이 바뀌지 않았음을 보여, case 1의 대입이 바깥이 아니라 같은 블록의 초기화 전 level을 가리켰다는 증거다(content.mdx 예제 2 결과와 이유).</details>
2. `switch (n) { case 0: { let x; } break; case 1: var x; }`는 왜 오류가 아니고, 배치를 바꾼 `case 0: let x; break; case 1: { var x; }`는 왜 SyntaxError인가?
   <details><summary>답</summary>안쪽 블록의 let은 CaseBlock의 렉시컬 선언 이름에 들지 않는다. 반면 VarDeclaredNames는 안쪽 블록의 var까지 모은다. 그래서 case에 바로 쓴 let과 안쪽 블록의 var만 충돌한다(content.mdx "var와 함수 선언은 다르다", concept.test 파싱 단언).</details>
3. 예제 5의 `function` 줄이 ok인 것과 예제 6의 출력은 각각 무엇에 기대는가? 파일 첫 줄에 `'use strict';`를 붙이면 어느 쪽이 바뀌는가?
   <details><summary>답</summary>둘 다 웹 호환 규칙을 지원하는 호스트에 기댄다. 예제 5의 코드 문자열은 Function 생성자 본문의 지시어로만 strict가 정해지므로 파일 지시어와 무관하고, 파일 지시어로 바뀌는 것은 예제 6뿐이다(둘째·셋째 줄이 ReferenceError)(meta simplifications 1).</details>
4. 예제 4를 원래 형태(바깥 word와 case 2 없이)로 두면 어떤 틀린 모델을 배제하지 못하는가?
   <details><summary>답</summary>"중괄호가 있어도 다른 case에서 그 이름이 보인다" 모델. 원래 출력은 중괄호 안 선언이 된다는 것만 보였다. `pick(2)`의 `outer`가 이 모델을 배제한다(변경 이력, Opus HIGH).</details>
5. InstantiateFunctionDeclaration을 InstantiateFunctionObject로 고치라는 검토를 반영하지 않은 근거는?
   <details><summary>답</summary>현재 명세 초안(tc39.es/ecma262)의 BlockDeclarationInstantiation이 InstantiateFunctionDeclaration을 호출하고 InstantiateFunctionObject는 초안에 없다. 검토 출처는 이전 판이다(변경 이력 2026-11-26 외부 검토 1).</details>
