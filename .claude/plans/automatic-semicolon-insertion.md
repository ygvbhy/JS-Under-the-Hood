# 세미콜론 자동 삽입 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-23
- 기준: `main` @ `3ab9dab`

## 0. 요약
- 목적: "return 다음 줄의 값은 왜 반환되지 않을까"를 질문으로 하는 `automatic-semicolon-insertion` 페이지를 추가한다(order 105, 학습 순서 15번째/76). 세미콜론은 줄바꿈마다 들어가지 않는다. 다음 토큰이 문법에 맞지 않을 때(그 토큰 앞의 줄바꿈·`}`·do-while의 `)`), 입력이 끝났는데 전체를 하나로 읽을 수 없을 때, 줄바꿈을 금지한 자리(제한된 생성 규칙)에서만 들어간다. 이것을 명세와 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 4개, 규칙 표 1개, 퀴즈 4개, 시뮬레이터 없음)를 추가한다. 기존 세 페이지(expressions-statements·iife-module-pattern·tagged-templates)에서 새 페이지로 연결한다(strict-mode는 바꾸지 않음). 15번째 이후 순위를 +1 하는 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: 요약·목표·제목이 명세의 조건(줄바꿈 뒤, 식으로 끝난 줄)을 빠뜨려 실제보다 넓게 말할 수 있다. 예제가 "줄 끝마다"·"규칙 1만"·"ASI 없음" 모델을 배제하지 못할 수 있다. 표의 "이렇게 읽힌다" 칸이 실제 파싱과 다를 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: MEDIUM 4·LOW 6, Critic REVISE: HIGH 1·MEDIUM 4·LOW 4. 메인이 실행·코드로 재확인해 모두 반영했고, strict-mode 연결은 하지 않기로 정했다)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-23)
  - 추가 게시글 로드맵 4의 1번이다(`.claude/plans/concept-roadmap-extras-4.md`).
  - order는 105(`function-calls` 100 뒤, `hoisting` 110 앞). 로드맵 초안의 6(책 5장 자리)에서 바꿨다. 핵심 사례(return·후위 ++·레이블 break·대괄호 접근·호출)가 7·8·10·12장 문법이라, 그 개념들을 선행 개념으로 전제할 수 있는 자리를 골랐다.
  - 시각화: 표 + 퀴즈(시뮬레이터 없음).
- [Claude 판단] 새 페이지 메타
  - `app/concepts/automatic-semicolon-insertion/`, slug `automatic-semicolon-insertion`, category `fundamentals`(expressions-statements와 같은 문법 주제), order 105, `reviewedAt: null`.
  - title: "세미콜론 자동 삽입: return 다음 줄의 값은 왜 반환되지 않을까"
    - "객체"를 쓰지 않는다. `return⏎{ a: 1 }`의 `{`는 세미콜론이 들어간 뒤 블록으로 읽히므로 "객체"라고 하면 틀린 설명이다(탐침 returnObj).
  - summary(156자, "객체" 없음 → 홈 "객체" 검색 결과 수 19 유지): "세미콜론은 줄바꿈마다 들어가지 않습니다. 줄바꿈 뒤의 토큰이나 }가 문법에 맞지 않을 때와 return·break·후위 ++처럼 줄바꿈을 금지한 자리에서 들어갑니다. 그래서 return 다음 줄의 값은 반환되지 않고, 식으로 끝난 줄 다음 줄이 [나 -로 시작하면 이어 읽힙니다."
    - 줄바꿈 조건과 "식으로 끝난 줄" 한정은 검토 지적으로 넣었다. 같은 줄의 `var m = 1 var n = 2`는 SyntaxError이고(탐침 oneLine), 함수 선언으로 끝난 줄 다음의 `[`는 이어지지 않는다(탐침 fnDecl). do-while의 `)`와 입력 끝 규칙은 요약에서 빼고 본문·목표에 쓴다.
  - tags("객체" 금지): `세미콜론 자동 삽입`, `자동 세미콜론 삽입`, `ASI`, `automatic semicolon insertion`, `세미콜론`, `줄바꿈`, `제한된 생성 규칙`, `restricted production`.
  - goals(4개, 백틱 금지)
    1. 세미콜론은 줄바꿈마다 들어가지 않고, 다음 토큰이 어떤 문법 규칙에도 맞지 않을 때 그 토큰 앞에 줄바꿈이 있거나 그 토큰이 닫는 중괄호이면 들어가며, 입력이 끝났는데 전체를 하나로 읽을 수 없을 때도 들어간다는 것을 명세의 규칙으로 설명할 수 있다.
    2. return·break·continue 바로 뒤와 후위 ++·-- 바로 앞처럼 문법이 줄바꿈을 금지한 자리(제한된 생성 규칙)에서는 다음 줄을 이어 읽을 수 있어도 세미콜론이 들어간다는 것으로 결과를 예측할 수 있다.
    3. 식으로 끝난 줄 다음 줄이 대괄호, 여는 괄호, 더하기·빼기 기호로 시작하면 앞 줄에 이어 읽혀 프로퍼티 접근, 호출, 이항 연산이 된다는 것을 예측할 수 있다.
    4. 빈 문이 되거나 for 문 머리의 세미콜론이 되는 자리에는 세미콜론이 들어가지 않는다는 예외를 설명할 수 있다.
  - prerequisites: 표현식과 문(`expressions-statements`), 증감 연산자(`increment-decrement`), switch와 break·continue(`switch-break-continue`, 레이블), 프로퍼티 키(`property-keys`, 대괄호 접근), 함수 호출(`function-calls`, return). 모두 order 105보다 앞이다.
  - related: `expressions-statements`, `iife-module-pattern`, `tagged-templates`, `increment-decrement`, `switch-break-continue`, `function-calls`, `property-keys`, `error-handling`.
- 용어 규칙
  - 페이지 이름은 "세미콜론 자동 삽입"(expressions-statements·strict-mode의 표기). 첫 등장 때 "(ASI, Automatic Semicolon Insertion)"을 붙인다. iife-module-pattern의 "자동 세미콜론 삽입"은 tags로만 받는다.
  - 명세 용어: offending token은 "문법에 맞지 않는 토큰", restricted production은 "제한된 생성 규칙", `[no LineTerminator here]`는 "줄바꿈을 허용하지 않는 자리"로 처음에 원어와 함께 쓴다.
  - "세미콜론이 들어간다/넣는다"는 명세의 "a semicolon is automatically inserted"를 옮긴 말이다. 명세가 이 동작을 "토큰 흐름에 세미콜론이 삽입된다고 말하는 방식으로 기술한다"고 적으므로, 엔진이 소스 텍스트를 실제로 고쳐 쓴다고 쓰지 않는다(simplifications).
  - 틀린 모델의 이름을 셋으로 통일한다(퀴즈 해설·흔한 오해·concept.test 공통): "줄 끝마다"(모든 줄 끝에 세미콜론), "규칙 1만"(줄바꿈 뒤의 맞지 않는 토큰 앞에만 넣고 제한된 생성 규칙은 없음), "ASI 없음"(직접 쓴 세미콜론만).
  - throw 뒤 줄바꿈은 "조기 오류"라고 쓰지 않는다. `throw;`는 문법에 없어서 파싱 단계에서 SyntaxError가 나는 것이고, 명세의 Early Errors 항목이 아니다. 본문은 "실행 전에 SyntaxError"로 쓴다.
  - 스타일 권고("세미콜론을 항상 쓰라/쓰지 마라")는 쓰지 않는다. 명세의 "practical advice"(후위 ++는 피연산자와 같은 줄 등)만 사실로 인용할 수 있다.
  - 뒤 개념(템플릿 리터럴 292, 화살표 함수 250, throw·try 470, 제너레이터 450, async 460)은 본문에서 링크("…에서 다룹니다")로, simplifications에서는 개념 이름으로 가리킨다(AGENTS.md). 대상 페이지가 그 하위 주제를 다룰 때만 링크한다: tagged-templates는 백틱 줄바꿈 사례를 다루므로 링크, iife-module-pattern은 `(` 사례를 다루므로 링크. 화살표의 `=>` 앞 줄바꿈, yield·async의 줄바꿈 제약은 다루는 페이지가 없어 "다루지 않음"으로 쓴다.
- 첫 문단의 답(첫 평문 줄에는 백틱 코드를 쓰지 않는다. `firstProseLine`이 백틱을 지우고 렌더 텍스트와 대조한다, `tests/build/build-output.test.ts:31-43`)
  - 첫 줄(평문만): 세미콜론은 줄바꿈마다 들어가는 것이 아니다. 파서가 왼쪽부터 읽다가 어떤 문법 규칙에도 맞지 않는 토큰을 만났을 때, 그 토큰 앞에 줄바꿈이 있으면 그 앞에 세미콜론을 넣는다.
  - 둘째 문장부터: 그래서 다음 줄이 앞 줄에 이어 읽힐 수 있으면(`[`, `(`, `-`) 세미콜론이 들어가지 않는다. 반대로 `return` 바로 뒤처럼 문법이 줄바꿈을 금지한 자리에서는 이어 읽을 수 있어도 세미콜론이 들어가서 다음 줄의 값이 반환되지 않는다.
- 동작 원리 절(h3 5개)
  1. "줄바꿈 뒤의 맞지 않는 토큰 앞에 들어간다"
     - 명세 첫째 규칙: 왼쪽부터 읽다가 어떤 생성 규칙에도 맞지 않는 토큰(offending token)을 만나면, 그 토큰이 앞 토큰과 줄바꿈으로 떨어져 있거나, `}`이거나, 앞 토큰이 `)`이고 넣은 세미콜론이 do-while 문의 끝 세미콜론이 될 때 그 앞에 넣는다.
     - 같은 줄의 `var m = 1 var n = 2`는 둘째 `var` 앞에 줄바꿈이 없어 SyntaxError다(탐침 oneLine). 줄을 나누면 들어간다.
     - `{ x = 2 }`처럼 `}` 앞은 같은 줄이어도 들어간다(탐침 braceRule). do-while의 `)` 뒤(탐침 doWhile).
     - 둘째 규칙: 입력 끝에서 전체를 하나로 파싱할 수 없으면 끝에 넣는다(탐침 eofNoSemi: 끝에 `;` 없는 `var x = 1`도 실행된다).
  2. "식으로 끝난 줄은 다음 줄과 이어질 수 있다"
     - 다음 줄이 앞 줄에 이어져도 문법에 맞으면 "맞지 않는 토큰"이 없으므로 (제한된 생성 규칙이 아닌 한) 들어가지 않는다. 명세 Interesting Cases는 "식으로 끝나는 줄" 다음 줄의 첫 글자로 다음을 꼽는다: `(`(호출), `[`(프로퍼티 접근), 백틱(태그드 템플릿), 단항 `+`·`-`(이항 연산), 정규식 리터럴(`/` 나눗셈으로 읽힐 수 있음).
     - `(` 사례는 [즉시 실행 함수와 모듈 패턴](/concepts/iife-module-pattern), 백틱 사례는 [태그드 템플릿](/concepts/tagged-templates)에서 다룹니다(둘 다 뒤 개념). 정규식 사례는 다루지 않는다(simplifications).
     - 앞 줄이 식으로 끝나지 않으면(함수 선언의 `}` 등) 다음 줄의 `[`는 새 문의 시작이다(탐침 fnDecl). `return` 뒤의 `-3`처럼 제한된 자리이면 이어지지 않는다(3절).
     - 예제 2.
  3. "줄바꿈을 금지한 자리에는 이어 읽을 수 있어도 들어간다"
     - 셋째 규칙: 제한된 생성 규칙에서 `[no LineTerminator here]` 바로 뒤에 올 토큰(restricted token)이 앞 토큰과 줄바꿈으로 떨어져 있으면, 그 토큰이 문법에 맞더라도 앞에 세미콜론을 넣는다.
     - 이 페이지에서 예로 드는 것: `return`·`break`·`continue` 뒤, 후위 `++`·`--` 앞. 명세 Note(`sec-rules-of-automatic-semicolon-insertion`)는 이 밖에 throw, yield, 화살표 함수의 `=>`, async 함수 정의, 현재 초안의 using 선언을 목록에 둔다(simplifications).
     - 예제 1(return), 예제 3(후위 ++), 예제 4(레이블 break).
     - `throw` 뒤 줄바꿈은 세미콜론이 들어간 뒤 `throw;`가 문법에 없으므로 실행 전에 SyntaxError다(탐침 throwNl, 같은 줄의 `throw 1`은 문법 오류가 아님). throw는 [try/catch/finally](/concepts/error-handling)에서 다룹니다.
  4. "넣지 않는 예외"
     - 넣은 세미콜론이 빈 문이 되거나 for 문 머리의 두 세미콜론 중 하나가 될 때는 넣지 않는다. `if (…)⏎else …`는 SyntaxError(탐침 ifElse), for 머리를 줄로 나눠도 SyntaxError(탐침 forHead).
  5. "명세가 정한 것과 정하지 않은 것"
     - 명세는 이 동작을 "토큰 흐름에 세미콜론이 삽입된다고 말하는 방식"으로 기술한다. 엔진이 소스를 고쳐 쓴다는 뜻이 아니다.
     - 명세 Note의 실용적 권고(후위 ++는 피연산자와 같은 줄, return·throw의 식은 같은 줄에서 시작, break·continue의 레이블은 같은 줄)를 사실로만 소개한다.
- 예제(아래 판 그대로 `scratchpad/asi/ex`에서 Node vm으로 sloppy·`'use strict';` 접두 모두 실행해 같은 출력을 확인했다). 파일 이름과 expectedOutput은 다음과 같다.
  1. `return-newline.js` → `undefined 3`
     ```js
     function total(a, b) {
       return
         a + b;
     }
     function totalSameLine(a, b) {
       return a + b;
     }
     console.log(total(1, 2), totalSameLine(1, 2));
     ```
  2. `next-line-continues.js` → `number 7`
     ```js
     var box = { size: 3 }
     var copy = box
     ['size']
     var price = 10
     var discount = price
     -3
     console.log(typeof copy, discount);
     ```
     - 처음 판은 문자열의 `['length']`를 읽었는데, 원시 값의 프로퍼티 접근은 원시 값의 메서드 호출 개념(order 180)의 내용이라 객체 리터럴(property-keys까지의 범위)로 바꿨다(Critic). 출력에는 원시 값만 남긴다(`typeof copy`).
  3. `postfix-newline.js` → `1 1 2`
     ```js
     var a = 1
     var b = 1
     var c = 1
     a = b
     ++c
     console.log(a, b, c);
     ```
  4. `break-label.js` → `[00][10]`
     ```js
     var log = ''
     outer: for (var i = 0; i < 2; i++) {
       for (var j = 0; j < 2; j++) {
         log = log + '[' + i + j + ']'
         break
         outer
       }
     }
     console.log(log);
     ```
     - 6번 줄 `outer`는 세미콜론이 들어간 뒤 식 문이 되지만, 5번 줄 `break`가 먼저 안쪽 반복을 끝내므로 평가되지 않는다. 레이블 이름은 변수가 아니라서 평가하면 ReferenceError다(탐침 labelRef).
- 예제별로 배제하는 틀린 모델(퀴즈 오답의 출처, 모델 이름은 1절 용어 규칙의 세 가지). concept.test가 예제 소스를 정해진 문자열 치환으로 바꿔 실행한 결과로 오답을 고정한다(치환이 실제로 일어났는지 먼저 단언). 선택지 = 정답 + 오답. 값은 Critic·Architect와 메인이 각각 실행해 확인했다.
  1. 규칙 1만(`return` 뒤 줄바꿈을 없앤 것과 같음) → `3 3`. 그 밖의 오답: return 다음 줄의 식은 문법 오류 → "SyntaxError로 아무것도 출력되지 않는다"(원본이 오류 없이 실행됨을 단언). 줄 끝마다 모델은 정답과 같으므로 오답이 아니다. 3지선다.
  2. 줄 끝마다(2·5번 줄 끝에 `;`) → `object 10`. `[` 줄만 이어진다(5번 줄 끝에만 `;`) → `number 10`. `-` 줄만 이어진다(2번 줄 끝에만 `;`) → `object 7`. 4지선다.
  3. 규칙 1만(`++`가 앞 줄 b의 후위 연산자가 되고 c 앞에 세미콜론, `a = b++⏎c`) → `1 2 1`. ASI 없음(`a = b ++c`) → "SyntaxError로 아무것도 출력되지 않는다"(치환본이 SyntaxError임을 단언). 3지선다.
  4. 규칙 1만(`break outer`) → `[00]`. 6번 줄 `outer`가 평가된다고 보는 오해 → "ReferenceError로 아무것도 출력되지 않는다"(치환본 `outer⏎break`가 ReferenceError로 출력 없음을 단언). 3지선다.
- 규칙 표
  - 감싸기: `<div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="세미콜론 자동 삽입 규칙 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)">` 안의 JSX `<table>`(tagged-templates 선례).
  - 머리 행 `앞 줄 | 다음 줄 | 세미콜론 | 이렇게 읽힌다 | 근거`
  - 행(8개)

  | 앞 줄 | 다음 줄 | 세미콜론 | 이렇게 읽힌다 | 근거 |
  | - | - | - | - | - |
  | `return` | `a + b` | 넣는다 | `return; a + b;` | 줄바꿈을 금지한 자리 |
  | `a = b` | `++c` | 넣는다 | `a = b; ++c;` | 줄바꿈을 금지한 자리 |
  | `break` | `outer` | 넣는다 | `break; outer;` | 줄바꿈을 금지한 자리 |
  | `throw` | `1` | 넣는다 | `throw; 1;` (SyntaxError) | 줄바꿈을 금지한 자리 |
  | `var m = 1` | `var n = 2` | 넣는다 | `var m = 1; var n = 2;` | 맞지 않는 토큰 앞 줄바꿈 |
  | `var copy = box` | `['size']` | 넣지 않는다 | `var copy = box['size'];` | 이어 읽어도 문법에 맞음 |
  | `var discount = price` | `-3` | 넣지 않는다 | `var discount = price - 3;` | 이어 읽어도 문법에 맞음 |
  | `var s = n` | `(1)` | 넣지 않는다 | `var s = n(1);` (TypeError) | 이어 읽어도 문법에 맞음 |

  - 표 위에 "각 행은 테스트가 두 줄로 쓴 코드와 '이렇게 읽힌다' 칸의 코드를 실제로 실행해 결과가 같은지 대조한다"는 문장을 쓴다.
  - 칸의 코드는 `<code>{'…'}</code>`로 쓰고, 작은따옴표가 든 칸(`['size']`, `var copy = box['size'];`)은 `<code>{"…"}</code>`로 쓴다(`normalizeCell`은 `{'…'}` 안에 `'`가 없을 때만 푼다, `tests/helpers/result-tables.ts:20-21`). `<`는 쓰지 않는다. `format:check` 뒤 따옴표가 바뀌지 않았는지 하드코딩 비교로 확인한다.
  - concept.test(`tableBody`)
    - 행 수와 칸 텍스트를 테스트의 하드코딩 목록과 정확히 비교한다(function-name 비교표 선례).
    - 행마다 래퍼(함수 본문, 반복문, 변수 준비)를 테스트에 하드코딩하고, `앞 줄 + "\n" + 다음 줄`과 `이렇게 읽힌다`를 같은 래퍼에 넣어 vm에서 실행한다. 반환값이 같거나 같은 이름의 예외(SyntaxError·TypeError)인지 비교한다.
    - 래퍼 규칙: 두 줄 코드 바로 뒤에는 새 줄의 명시적 `;`를 두고, 결과는 함수 본문의 `return [ … ]`처럼 앞 줄에 이어 읽힐 수 없는 자리에서 읽는다(검토 중 `var n = 2⏎[m,n].join()`이 `2[m,n]`으로 이어지는 함정을 확인했다).
    - 행마다 반대 해석(예: `var copy = box; ['size'];`, `break outer`, 한 줄의 `var m = 1 var n = 2`, `return a + b`, `a = b++; c`)을 같은 래퍼에서 실행해 결과가 다른지 단언한다. 두 쪽이 모두 undefined라서 같다는 비교가 아무것도 증명하지 않는 경우를 막는다.
    - throw 행은 두 쪽 모두 SyntaxError이고 같은 줄의 `throw 1`은 SyntaxError가 아님을, 괄호 행은 두 쪽 모두 TypeError이고 `var s = n;⏎(1)`은 오류가 없음을 단언한다.
- 퀴즈 4개(예제마다 1개, 정답 = 출력 줄). 정답 위치가 모두 같지 않게 한다. explanation은 큰따옴표·백슬래시를 쓰지 않는 산문으로 쓴다.
- 흔한 오해 2개
  - "줄바꿈마다 세미콜론이 들어간다"(줄 끝마다 모델, 예제 2가 반례)
  - "세미콜론은 다음 줄과 이어 읽을 수 없을 때만 들어가므로, 이어 읽을 수 있는 줄은 항상 이어진다"(규칙 1만 모델, 예제 1·3·4가 반례)
- simplifications
  - 예제는 sloppy mode 스크립트이고 첫 줄에 `'use strict';`를 붙여도 결과가 같다(concept.test 검사). `console.log`는 호스트 API다.
  - 명세는 이 동작을 토큰 흐름에 세미콜론이 삽입된다고 말하는 방식으로 기술한다. "세미콜론이 들어간다"는 그 표현을 옮긴 것이고, 엔진이 소스 텍스트를 고쳐 쓴다는 뜻이 아니다.
  - 제한된 생성 규칙 중 이 페이지가 예로 드는 것은 return·break·continue와 후위 ++·--이고, throw는 결과(SyntaxError)만 보인다. yield, 화살표 함수의 =>, async 함수 정의, 현재 명세 초안의 using 선언에도 줄바꿈을 허용하지 않는 자리가 있지만 다루지 않는다. 다음 줄이 정규식 리터럴로 시작하는 경우도 다루지 않는다.
  - 예제 2의 대괄호 사례는 결과를 보이려고 객체의 프로퍼티를 읽는다. 다음 줄이 배열 리터럴로 시작하는 실제 코드(배열 메서드 호출, 디스트럭처링)는 배열 고차 함수 개념과 스프레드와 디스트럭처링 개념의 문법이라 예로 쓰지 않는다.
  - throw는 try/catch/finally 개념에서, 다음 줄이 템플릿 리터럴로 시작하는 사례는 태그드 템플릿 개념에서, 여는 괄호로 시작하는 사례는 즉시 실행 함수와 모듈 패턴 개념에서 다룬다.
  - 레이블은 switch와 break·continue 개념에서 다룬다. 예제 4의 6번 줄처럼 레이블 이름만 쓴 식 문은 변수를 찾는 식이라 평가되면 ReferenceError다.
- references(앵커는 ES2027 초안 사본에서 존재를 확인했다. 절 번호는 라벨에 쓰지 않는다)
  - Automatic Semicolon Insertion(`sec-automatic-semicolon-insertion`), Rules(`sec-rules-of-automatic-semicolon-insertion`), Examples(`sec-examples-of-automatic-semicolon-insertion`), Interesting Cases in Statement Lists(`sec-asi-interesting-cases-in-statement-lists`), The return Statement(`sec-return-statement`). 제한된 생성 규칙 목록은 Rules 절의 Note에 있다. `sec-no-lineterminator-here-automatic-semicolon-insertion-list`는 선택 피연산자가 있는 생성 규칙만의 목록(throw·화살표·using 없음)이라 넣지 않는다(Architect).
  - MDN Lexical grammar의 자동 세미콜론 삽입 절(`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#automatic_semicolon_insertion`, 앵커는 구현 때 열어 확인)

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 기존 서술
  - `expressions-statements/meta.ts:50`: "세미콜론 자동 삽입은 즉시 실행 함수와 모듈 패턴 개념의 ( 사례만 다루고, 나머지는 별도 개념으로 다룹니다."
  - `strict-mode/meta.ts:83`: "지시어 뒤에 세미콜론을 생략해도 되는 세미콜론 자동 삽입의 세부 규칙은 다루지 않습니다." `strict-mode/content.mdx:15`: "세미콜론 자동 삽입의 세부는 다루지 않습니다." 새 페이지는 지시어 사례를 다루지 않고 strict mode(177)는 새 페이지보다 뒤 개념이라, 링크 조건(대상 페이지가 그 하위 주제를 다룰 때만)을 충족하지 않는다고 보고 바꾸지 않는다. 실행 확인: `'use strict'⏎var t = this`는 지시어로 동작하고, `'use strict'⏎['length']`는 이어 읽혀 지시어가 아니게 된다(Critic).
  - `expressions-statements/content.mdx:93`: "`}` 바로 앞에는 세미콜론이 자동으로 들어가 `{ a: 1; }`처럼 처리됩니다." 새 페이지가 `}` 규칙을 다루므로 링크한다(Critic LOW 반영).
  - `iife-module-pattern/content.mdx:35-37`: "### 앞 줄의 세미콜론" 절이 `(` 사례만 다룬다. tags에 `자동 세미콜론 삽입`(`meta.ts:17`).
  - `tagged-templates/content.mdx:15`: 백틱 줄바꿈 사례와 return 뒤 삽입을 한 문단으로 다룬다.
  - `increment-decrement`·`switch-break-continue`·`function-calls`·`property-keys` 본문에는 줄바꿈·세미콜론 언급이 없다(grep 0건).
- 학습 순서: order 105보다 작은 개념은 14개(3, 5, 7, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100)다. 새 페이지가 15번째가 되고 기존 15번째(hoisting) 이후가 +1이 되어 총 76개다.
- 순서 고정 테스트
  - `app/lib/concepts.test.ts:104,111-112`(total 75, 마지막 position 75), `:117`(hoisting의 prev `function-calls` → 새 slug), `:119`(hoisting position 15 → 16)
  - `app/components/concept/ConceptPager.test.tsx:18,28`(`/ 75`, `75 / 75`), `:41`(hoisting 링크 `['/concepts/function-calls', '/concepts/scope-chain']` → 첫 항목 새 slug)
  - `tests/e2e/navigation.spec.ts`: 88 카드 수 75, 96 `75번째`, 110-130 "객체" 순위(4·12는 그대로, 20 이상은 +1 → 4, 12, 21, 22, 23, 24, 26, 27, 29, 31, 33, 34, 39, 50, 51, 53, 54, 65, 72, 결과 수 19 유지), 154 article 수, 180-831의 `학습 순서 N / 75`(N은 15 이상이면 +1, 모두 `/ 76`), 838 function-definitions `13 / 75` → `13 / 76`, 849-856 hoisting의 이전 링크 `/concepts/function-calls` → 새 slug, 새 pager 블록(15 / 76, 이전 function-calls, 다음 hoisting)
  - `tests/e2e/responsive.spec.ts:1818`(article 75)
- 표+퀴즈형 선례 등록 위치: `tests/e2e/helpers.ts:68`, `tests/e2e/a11y.spec.ts:57`(import)·`:900`, `tests/e2e/responsive.spec.ts:66`(import)·`:1511`, `tests/build/build-output.test.ts`의 `describe('프리렌더 (tagged-templates)')`. `docs/content-guide.md:225`의 경로 등록 목록.
- 검색은 title·summary·tags만 본다(`app/lib/concepts.ts:92-98`).
- `normalizeCell`·`tableBody`(`tests/helpers/result-tables.ts`, `tests/helpers/expression-tables.ts`)는 머리에 "결과"·"출력"이 없고 첫 머리가 "예제"가 아니면 자동 대조 대상이 아니다.
- 명세(ES2027 초안 사본, `sec-automatic-semicolon-insertion`)
  - 규칙 세 개와 "빈 문·for 머리에는 넣지 않는다"는 우선 조건. 첫째 규칙의 세 조건(줄바꿈, `}`, do-while의 `)`).
  - 제한된 생성 규칙 목록: UpdateExpression(후위 ++·--), UsingDeclaration, Continue, Break, Return, Throw, Yield, ArrowFunction, Async 함수·메서드·화살표 정의.
  - Examples(비규범): `{ 1 2 } 3`은 오류, `{ 1⏎2 } 3`은 변환됨, for 머리는 변환 안 됨, `return⏎a + b`, `a = b⏎++c`, `if (a > b)⏎else`는 변환 안 됨, `a = b + c⏎(d + e).print()`는 호출.
  - Interesting Cases(비규범): 줄 첫 글자 `(`·`[`·백틱·단항 `+`·`-`·정규식 리터럴.
- 실행(Node 24, vm, sloppy·strict 접두)
  - 위 예제 4개 출력(예제 4는 `[00][10]`로 고친 판을 다시 실행해 확인했다).
  - 탐침(본문 주장마다 하나, 주장이 없는 탐침은 두지 않는다): returnObj(`return⏎{ a: 1 }` → `undefined`), labelRef(레이블 이름 평가는 ReferenceError), throwNl(SyntaxError, 같은 줄 `throw 1`은 SyntaxError 아님), paren(`n⏎(1)` → TypeError), tpl(백틱 줄은 태그로 호출), ifElse·forHead·oneLine(SyntaxError), braceRule(2), doWhile(3), contLabel(`continue⏎outer` → 안쪽 반복만 건너뜀), fnDecl(`function f(){ return 1 }⏎[1,2].length` → 2), returnMinus(`return⏎-3` → undefined), eofNoSemi(끝에 `;` 없는 `var x = 1` 실행됨).

### 추정
- 없음

## 3. 구현 전략
- tagged-templates와 같은 표+퀴즈형 구조: `## 동작 원리` → `## 예제`(코드+퀴즈) → `## 결과와 이유`(예제별 h3 + 규칙 표 + 흔한 오해). 공통 코드는 쓰기만 한다.
- 예제 4개로 두 틀린 모델을 함께 배제한다: 예제 2가 "줄 끝마다" 모델을, 예제 1·3·4가 "오류 날 때만" 모델을 배제한다.
- 규칙 표는 "두 줄 코드 → 이렇게 읽힌다"를 행마다 보이는 표다. 결과 표 자동 대조 형식이 아니므로 concept.test가 두 코드를 실행해 같은 결과인지 대조한다.
- 버린 대안
  - order 6(책 5장 자리): 사용자가 105를 골랐다.
  - 토큰 단계 시뮬레이터: 사용자가 표+퀴즈를 골랐다.
  - 배열 메서드·디스트럭처링으로 대괄호 사례를 보이는 예제: 뒤 장 문법이다.
  - try/catch로 TypeError를 출력하는 예제: 뒤 장 문법이고 괄호 사례는 iife-module-pattern이 이미 예제로 다룬다.

## 4. 변경 파일
- 추가: `app/concepts/automatic-semicolon-insertion/` — `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `examples/*.js` 4개. 계획 문서.
- 수정(로직, reviewedAt은 선례대로 바꾸지 않음)
  - `expressions-statements/meta.ts:50`: 둘째 문장을 "세미콜론 자동 삽입은 세미콜론 자동 삽입 개념에서 다룹니다."로 바꾸고 related에 새 slug를 더한다.
  - `expressions-statements/content.mdx:93`의 `}` 문장 뒤에 "([세미콜론 자동 삽입](/concepts/automatic-semicolon-insertion)에서 다룹니다)" 꼴의 링크를 단다.
  - `iife-module-pattern/content.mdx:37` 끝에 "세미콜론이 들어가는 규칙 전체는 [세미콜론 자동 삽입](/concepts/automatic-semicolon-insertion)에서 다룹니다." related에 새 slug.
  - `tagged-templates/content.mdx:15` 문단 끝에 같은 꼴의 한 문장. related에 새 slug.
- 수정(기계적)
  - `app/lib/concepts.test.ts`(total 76, 마지막 position 76, hoisting prev·position)
  - `app/components/concept/ConceptPager.test.tsx`(`/ 76`, `76 / 76`, hoisting 링크)
  - `tests/e2e/navigation.spec.ts`(2절의 목록)
  - `tests/e2e/responsive.spec.ts`(import, article 76, 새 페이지 가로 스크롤)
  - `tests/e2e/a11y.spec.ts`(import, 새 페이지 "개념 페이지: 세미콜론 자동 삽입")
  - `tests/e2e/helpers.ts`(경로 상수)
  - `tests/build/build-output.test.ts`(프리렌더: 규칙 표 영역과 칸 `['size']`, 퀴즈 정답이 HTML에 있음, `htmlToText` 기준)
  - `docs/content-guide.md:225`(경로 등록 목록에 slug 추가)
- 변경하지 않음: 공통 코드, strict-mode(2절의 이유), increment-decrement·switch-break-continue·function-calls·property-keys(언급 없음).
- finalize 때 사용자에게 물을 것: 본문을 고친 세 페이지(expressions-statements·iife-module-pattern·tagged-templates)의 reviewedAt을 바꿀지(content-guide 10절, 선례는 바꾸지 않음).

## 5. 위험 요소
- 요약·목표·h3 제목이 조건을 빠뜨리거나 페이지가 반박하는 오해를 그대로 말할 수 있다. 막는 곳: summary·goals·h3 제목은 1절 문구를 그대로 쓰고, "이어 읽을 수 있으면 넣지 않는다"·"오류 직전에 들어간다" 같은 무조건 문장 grep 0건(작업 3).
- 예제가 틀린 모델을 배제하지 못할 수 있다. 막는 곳: 모델별 치환 실행 결과를 테스트로 남긴다(작업 2).
- throw를 "조기 오류"라 쓸 수 있다. 막는 곳: `grep -n "조기 오류"` 0건(작업 3).
- "들어간다"를 소스 변경처럼 쓸 수 있다. 막는 곳: `grep -nE "소스(를|가) (고쳐|바꿔)|코드를 (고쳐|바꿔) 쓴"` 0건, simplifications 문장.
- 표의 "이렇게 읽힌다"가 실제와 다를 수 있다. 막는 곳: 행마다 두 코드 실행 대조(작업 4).
- `{ a: 1 }`을 "객체"로 부를 수 있다. 막는 곳: title·summary·tags와 본문에 `return` 뒤 중괄호를 객체로 설명하는 문장이 없는지 리뷰.
- 뒤 장 문법을 설명 없이 전제할 수 있다. 막는 곳: 템플릿·throw·괄호 사례는 링크만, yield·화살표·async·using·정규식은 simplifications로.
- 첫 문단 첫 줄 백틱 → `test:build` 실패. 막는 곳: 작업 3 완료 조건.
- MDX 함정: 산문의 `{`·`<`는 백틱 안에, 속성 안 큰따옴표·백슬래시 금지, 표 칸 `<` 금지.
- 순서 삽입 누락. 막는 곳: `grep -rnE "/ 75|toBe\(75\)|toHaveCount\(75\)|75번째" app tests` 0건, 그리고 hoisting을 중간 개념으로 쓰는 단위 테스트(`concepts.test.ts:117,119`, `ConceptPager.test.tsx:41`)를 `grep -n "function-calls\|toBe(15)"`로 확인.
- 예제 파일은 Prettier 제외 폴더라 세미콜론 없는 줄이 유지된다. ESLint도 제외다.

## 6. 검증 방법
- 정적(저장소 루트에서 실행): `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(공통 코드 불변): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "automatic-semicolon-insertion|세미콜론 자동 삽입|홈 학습 순서 보기"`
- 브라우저(개발 서버 재시작 후 `/concepts/automatic-semicolon-insertion`)
  - 첫 문단이 보인다.
  - 규칙 표 8행의 코드 칸이 보이고 `['size']` 표기가 맞다.
  - 퀴즈 4개를 하나씩 풀면 정답 피드백이 나온다.
  - "학습 순서 15 / 76"과 이전(function-calls)·다음(hoisting) 링크가 맞다. hoisting의 이전 링크가 새 페이지다.
  - 375px 폭에서 표 영역만 가로로 스크롤되고 페이지는 가로 스크롤이 없다.
  - 링크를 더한 세 페이지에서 새 링크가 렌더된다.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 메타와 예제
- 대상: `meta.ts`, `examples/*.js` 4개, `route.tsx`(meta → content(임시 최소 본문) → route 순서)
- 완료 조건
  - 저장소 루트에서 `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts`가 통과한다.
  - title·summary·goals에 백틱과 "객체"가 없다. summary는 160자 이하다.
### 2. concept.test 골격(예제·모델·탐침)
- 대상: `concept.test.ts`
- 변경
  - `'use strict';` 접두로 실행해도 출력이 같은지 본다.
  - 예제별 틀린 모델을 치환으로 만들고(치환 발생 단언) 실행 결과가 1절의 값과 같고 정답과 다른지 본다.
  - 탐침: 2절 실행 목록 전부(본문 주장마다 하나).
  - 메타 조건: "객체" 없음, order 105, summary 160자 이하. reviewedAt null은 단언하지 않는다.
- 완료 조건: `npx vitest run app/concepts/automatic-semicolon-insertion` 통과. 모델 출력을 구현 진행에 기록한다.
### 3. 본문
- 대상: `content.mdx`
- 완료 조건: `npm test` 통과, 첫 평문 줄에 백틱 없음, 5절 금지 문구 grep 0건(소스 고쳐 쓰기, 무조건 문장, "조기 오류"), explanation 속성에 `"`·`\` 없음.
### 4. 규칙 표·퀴즈 대조 테스트
- 대상: `concept.test.ts`
- 변경: `tableBody`로 표를 읽어 1절의 방식대로 대조한다. 퀴즈는 정답 = expectedOutput, 선택지 수, 정답 위치 분산을 검사한다.
- 완료 조건: 테스트 통과. 표 칸 하나와 퀴즈 정답 하나를 일부러 바꾸면 각각 실패하는 것을 확인한 뒤 되돌린다.
### 5. 연결과 순서 테스트
- 대상: 세 페이지의 문구·related, `docs/content-guide.md`, 4절의 기계적 수정 파일
- 완료 조건: 75 grep 0건, hoisting 단위 테스트 갱신 확인, `npm run typecheck`·`npm test`·`npm run test:build` 통과.
### 6. 전체 검증
- 완료 조건: 6절의 명령이 모두 통과하고 브라우저 시나리오를 확인한다.

## 변경 이력
- 2026-11-23 (리뷰 지적, Opus 명세 교차 검토): 다음을 고친다. 요구사항 범위 안의 리뷰 수정이라 재승인 없이 진행한다. 영향 단계 1·2·3·4.
  - return 뒤 줄의 식은 "평가만 된다"가 아니라 평가되지 않는다. return 완료가 함수 본문 평가를 끝내기 때문이다. 탐침 afterReturn: `return⏎hit = 'yes'` 뒤 hit은 'no'.
  - 예제 3의 "규칙 1만" 모델은 `1 2 1`이 아니라 SyntaxError다. 원본 줄 배치 `a = b⏎++c`에서 `++`가 후위로 붙으면, 같은 줄의 `c` 앞에 줄바꿈이 없어 규칙 1이 적용되지 않는다(실행: `a = b ++c` → SyntaxError). 계획의 `a = b++⏎c` 치환은 줄바꿈 위치를 옮긴 다른 코드였다. 계획 검토 때 Critic도 같은 오류를 냈다.
    - 퀴즈 3 오답은 SyntaxError(규칙 1만)와 `1 2 1`(++가 앞 줄 b에 붙고 c는 따로 남는다고 보는 직관. 실제로는 이렇게 읽힐 수 없다)로 둔다.
    - 표 2행의 반대 해석은 `a = b ++c`(SyntaxError)로 바꾼다.
    - 흔한 오해 2와 goal 2: 줄 단위로 "이어 읽을 수 없을 때만 들어간다"는 오해로도 예제 3은 `1 1 2`라 반례가 아니다. 반례는 예제 1·4로 줄이고, 예제 3은 "줄바꿈 뒤 토큰이 문법에 맞아도 들어간다"(규칙 3)의 예로 쓴다.
  - "식으로 끝난 줄 다음 줄이 [·(·-로 시작하면 이어 읽힌다"를 "그 토큰이 앞 줄 끝의 식에 이어 붙을 수 있으면"으로 한정한다. 반례: `var r = i++⏎[0]`·`⏎(1)`은 세미콜론이 들어간다(r은 0).
  - 판정이 줄 단위가 아니라 토큰 하나씩이라는 문장을 더한다. 탐침 noBacktrack: `var s = n⏎(1) 2`는 줄 끝에 세미콜론을 넣지 않고 SyntaxError.
  - Low: 첫 문장의 ASI 정의 범위, `}` 조건("맞지 않는 토큰이면"), goal 1의 do-while 조건, goal 2의 제한된 생성 규칙 정의, 권고 위반 예(예제 1·4), ReferenceError 조건(같은 이름 변수가 없으면, 탐침 labelShadow), related에 array-higher-order-functions·spread-destructuring, "async 함수 정의" 범위, goal 3의 기호(빼기), 세 페이지 링크 문장의 "규칙 전체"→"규칙", 소스 고쳐 쓰기 문장 완화, MODEL_OUTPUT을 모델 실행 결과와 연결.

- 2026-11-23 (사용자 검토): 본문 문구 7건을 실행으로 확인한 뒤 반영했다. 영향 단계 1·3·4.
  - 예제 머리말 "없는 곳은 자동 삽입에 맡긴 곳"을 "일부러 쓰지 않은 곳이고, 들어가는지는 예제마다 다르다"로 바꿨다(예제 2의 2·5번 줄은 세미콜론이 없어도 들어가지 않음).
  - return 다음 줄 `{ a: 1, b: 2 }`는 블록으로 읽을 수 없어 SyntaxError라는 문장을 더했다(탐침 returnObj에 이미 있음).
  - 셋째 규칙 요약을 "줄바꿈을 금지한 자리에 줄바꿈이 있을 때"로 통일했다: 첫 문단, 흔한 오해 1, 표 근거 칸("줄바꿈을 금지한 자리의 줄바꿈"), summary(159자, break 생략).
  - 예제 3 "`a = b;` 뒤에 세미콜론이 들어가고"를 "`a = b` 뒤에 세미콜론이 들어가 `a = b;`가 되고"로 고쳤다.
  - `var r = i++` 문장에 `i`가 0이었다는 전제와 다음 줄 `[0]`이 별개의 배열 리터럴 식 문이 된다는 것을 더했다(탐침: 완료 값이 `[0]`, `r, i`는 `0,1`).
  - 규칙 표 마지막 행과 표 위 문장에 "n이 함수가 아니면"을 더했다(탐침: n이 함수이면 s는 2).
  - 용어: "같은 글자", "첫 글자"를 "토큰"으로, 레이블 ReferenceError 인과를 "레이블은 변수 바인딩을 만들지 않으므로"로 바꿨다(본문·simplifications).

- 2026-11-23 (사용자 2차 검토): 세 문장을 다듬었다(실행으로 확인). 영향 단계 3·4.
  - `{ a: 1, b: 2 }` 문장: 원인은 프로퍼티 개수가 아니라 둘째 `키: 값`의 `:`다. 단축 프로퍼티 `{ a: 1, b }`·`{ a, b }`는 블록 안의 쉼표 식이라 오류 없이 undefined다(탐침 returnObj에 단언 추가).
  - 예제 머리말: 세미콜론이 들어가는지는 예제가 아니라 줄마다 다르다(예제 2의 1번 줄 끝에는 들어가고 2번 줄 끝에는 들어가지 않음). 두 문장으로 나눴다.
  - `var r = i++` 문장: `[0]`이 예고 없이 나오지 않게 "예를 들어 `i`가 0이고 다음 줄이 `[0]`이면"으로 시작한다.

## 구현 진행

- baseline (2026-11-23, `3ab9dab`): lint·format:check·typecheck 통과 / npm test 189파일 6100개 통과 / test:build·e2e 미실행(6단계에서 실행)
- [x] 1·2·3·4. 새 개념 폴더(meta·예제 4개·route·본문·concept.test 54개) — Sonnet 구현, 메인이 diff 검토 후 본문 문구 5곳 직접 수정: 첫 문단 둘째 문장에 "식으로 끝난 줄" 한정, return 뒤 `{ a: 1 }`을 "별개의 문"에서 "문 맨 앞의 중괄호라서 블록"으로(expressions-statements 링크), Note 권고 문장의 "세 예제"를 "예제 1·3·4"로, 규칙 표 위 문장에서 독자용 본문의 "테스트가 대조합니다"를 실행 결과 서술로, 흔한 오해 1의 삽입 자리 열거를 세 규칙의 조건 그대로. 변이 검사: 표 칸·퀴즈 answer 변경 시 실패 확인 후 원복(Sonnet 보고, cmp 확인). MDN 앵커 `#automatic_semicolon_insertion` 존재 확인(Sonnet).
  - 모델 출력(테스트로 고정): 1 규칙 1만 `3 3` / 2 줄 끝마다 `object 10`, `[`만 `number 10`, `-`만 `object 7` / 3 규칙 1만 `1 2 1`(리뷰 1차에서 틀린 모델로 판명, 아래 참고), ASI 없음 SyntaxError(출력 없음) / 4 규칙 1만 `[00]`, `outer⏎break` ReferenceError(출력 없음)
  - 검증(메인 실행): `npx vitest run app/concepts/automatic-semicolon-insertion tests/examples.test.ts tests/content-integrity.test.ts tests/result-tables.test.ts` 1812개 통과, lint·typecheck·format:check 통과.
- [x] 5. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(세 페이지 링크 문장·related, 15 / 76 블록, hoisting 이전 링크, "객체" 순위, 빌드 테스트 블록). 75 grep 0건(es-modules 앞의 `75 / 76`만 남음, 정상), hoisting 단위 테스트 3곳 갱신.
- [x] 6. 전체 검증 (2026-11-23) — lint·format:check·typecheck 통과, npm test 190파일 6171개 통과, test:build 604개 통과, e2e navigation 16개·관련 8개 통과. 브라우저(dev 5173): 학습 순서 15 / 76·이전 function-calls·다음 hoisting, 표 8행(`['size']` 칸 표기), 퀴즈 4개 렌더·예제 2 정답 선택 시 "정답입니다", 콘솔 오류 없음, 375px에서 페이지 가로 스크롤 없음(표 영역 안에서만 343→376 스크롤), 세 페이지와 hoisting에 새 페이지 링크가 렌더됨.
- 리뷰 1차(critical-code-review + Opus 명세 교차 검토, 2026-11-23): Opus High 2·Medium 2·Low 9 → 프로젝트 기준(명세와 다른 설명·오개념 위험은 높음)으로 High 4건(return 뒤 평가, 예제 3 모델, 이어 읽기 한정, 토큰 단위 판정)과 Low 9건 모두 수정하기로 함(변경 이력). 메인 확인 실행: afterReturn 'no', `a = b ++c` SyntaxError, `i++⏎[0]` 0, noBacktrack SyntaxError, labelShadow 5.
  - 수정(Sonnet, 메인이 diff 확인): 변경 이력의 항목을 모두 반영. 예제 3의 규칙 1만 모델은 `a = b ++c`(SyntaxError)로, `1 2 1`은 "줄바꿈을 ++ 뒤로 옮긴 다른 코드"라는 직관 오답으로 라벨을 바꿈. 퀴즈 오답 검사는 모델 실행 결과(MODELS)와 모델이 없는 오답(예제 1의 SyntaxError) 목록으로 대조. 탐침 afterReturn·postfixBracket·postfixParen·noBacktrack·labelShadow 추가. 재검증: lint·format:check·typecheck 통과, npm test 190파일 6176개, test:build 604개, e2e navigation 16개·관련 16개(새 페이지·태그드 템플릿·즉시 실행 함수) 통과. 수정 범위 재리뷰: 새 High 없음.
- 사용자 검토 반영(2026-11-23): 변경 이력 참고. 탐침 2개 보강(returnObj 외 기존 탐침에 단언 추가). lint·format:check·typecheck 통과, npm test 6176개, test:build 604개, e2e 새 페이지 관련 6개 통과. dev 5173에서 바뀐 문장 11곳이 렌더되고 콘솔 오류가 없음을 확인.
- 사용자 2차 검토 반영(2026-11-23): lint·format:check·typecheck 통과, npm test 6176개, test:build 604개, e2e 새 페이지 관련 6개 통과. dev 5173에서 바뀐 세 문장 렌더 확인.
- 마무리(2026-11-23): 사용자 결정으로 새 페이지 reviewedAt을 `'2026-11-23'`으로 기록했고, 링크 문장만 더한 세 페이지의 reviewedAt은 그대로 뒀다. 개념·무결성·예제 테스트 1642개, test:build 604개 재실행 통과.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(예제 4개·규칙 표 8행·퀴즈 4개·흔한 오해 2개, 시뮬레이터 없음, order 105·학습 순서 15/76, 세 페이지 연결, strict-mode 미연결). 완료 조건은 바꾸지 않았다.
- 계획 이후 바뀐 것: Opus 리뷰로 return 뒤 식은 평가되지 않는다는 서술, 예제 3의 모델(규칙 1만 → SyntaxError, `1 2 1`은 직관 오답), 이어 읽기 한정(앞 줄 식에 이어 붙을 수 있을 때), 토큰 단위 판정 문단을 고치거나 더했다. 사용자 검토 두 차례로 예제 머리말(줄마다 다름), `키: 값` 둘째 `:`의 SyntaxError, 셋째 규칙 요약("줄바꿈이 있을 때"), `i++` 뒤 `[0]`, 표 TypeError 조건, 토큰·레이블 용어를 다듬었다. concept.test는 59개다.

### 코드 리뷰
- 리뷰 1차(critical-code-review + Opus 명세 교차 검토): 프로젝트 기준으로 High 4건과 Low 9건을 모두 고쳤다(변경 이력).
- 고치지 않고 남긴 Low: 규칙 표 throw 행은 SyntaxError끼리만 비교해 "이렇게 읽힌다" 칸 내용은 결과로만 대조된다. 빌드 테스트의 퀴즈 정답 문자열 검사는 본문의 같은 글자에도 걸려 증거력이 약하다(선례 수준).

### 후속 작업
- [ ] 없음. 로드맵 4의 다음 개념(2번 프로미스를 반환하는 then)은 사용자 확인 후 계획한다.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 4개로 틀린 모델 세 가지를 나눠 배제했다 — 예제 2가 "줄 끝마다"를, 예제 1·4가 줄 단위의 "이어 읽을 수 없을 때만"을, 예제 3이 토큰 단위의 "규칙 1만"(SyntaxError)을 배제한다. 퀴즈 오답은 모델 소스를 치환해 실제로 실행한 결과로 테스트에 고정했다. 버린 대안: 손으로 쓴 오답.
- [Claude 판단] 예제 2의 대괄호 사례를 문자열의 `['length']`가 아니라 객체의 `['size']`로 바꿨다 — 원시 값의 프로퍼티 접근은 order 180 개념이라 order 105 페이지의 범위를 넘는다(Critic 지적). 출력에는 원시 값만 남기려고 `typeof copy`를 찍었다.
- [Claude 판단] strict-mode는 연결하지 않았다 — strict-mode가 미뤄 둔 것은 "지시어 뒤 세미콜론 생략"인데 새 페이지는 지시어 사례를 다루지 않고, strict mode(177)는 새 페이지보다 뒤 개념이다. 링크 규칙(대상 페이지가 그 하위 주제를 다룰 때만)에 맞지 않는다고 판단했다.
- [Claude 판단] Opus 리뷰의 Medium 2건(이어 읽기 한정, 토큰 단위 판정)을 High로 올려 고쳤다 — 결과가 맞아도 명세보다 넓게 말하는 설명은 이 프로젝트에서 오개념 위험이라 심각도가 높다. 반례: `var r = i++` 다음 줄의 `[0]`은 이어지지 않는다.
- [Claude 판단] 예제 3의 `1 2 1` 오답을 "줄바꿈을 `++` 뒤로 옮긴 다른 코드의 값"이라고 라벨을 바꿔 남겼다 — 계획 때는 규칙 1만 모델의 출력으로 잘못 계산했다(Critic도 같은 오류). 원본 줄 배치로는 SyntaxError다.
- order 105 — 책은 5장이지만 핵심 사례(return·후위 ++·레이블 break·대괄호 접근·호출)가 7·8·10·12장 문법이라 사용자가 function-calls 뒤를 골랐다.
- 예제 머리말, `{ a: 1, b: 2 }`의 SyntaxError 원인, 셋째 규칙 요약 등 문구 — 사용자 검토로 고쳤다.

#### 배경지식
- ASI 세 규칙: (1) 어떤 생성 규칙에도 맞지 않는 토큰을 만났을 때 그 토큰 앞에 줄바꿈이 있거나, 그 토큰이 `}`이거나, do-while의 `)` 뒤이면 그 앞에 넣는다. (2) 입력 끝에서 전체를 하나로 파싱할 수 없으면 끝에 넣는다. (3) 제한된 생성 규칙의 `[no LineTerminator here]` 바로 뒤 토큰이 줄바꿈 뒤에 오면, 그 토큰이 문법에 맞아도 넣는다. 넣은 세미콜론이 빈 문이나 for 머리의 세미콜론이 되면 넣지 않는다.
- 판정은 토큰 하나씩이고 되돌아가지 않는다. 줄바꿈 뒤 첫 토큰이 이어 붙으면 그 줄바꿈에는 넣지 않고, 같은 줄의 뒤 토큰이 맞지 않으면 그 토큰의 조건으로 따로 판정한다.
- `return;` 뒤의 문은 평가되지 않는다(return 완료가 함수 본문 평가를 끝낸다). 문 맨 앞의 `{`는 블록이라 `{ a: 1 }`은 레이블과 식 문이고, `{ a: 1, b: 2 }`는 둘째 `:`에서 SyntaxError다.
- `throw` 뒤 줄바꿈은 `throw;`가 문법에 없어서 생기는 파싱 단계의 SyntaxError이고, 명세의 Early Errors 항목이 아니다.

#### 확인 질문
1. 예제 3(`a = b` 다음 줄 `++c`)에서 제한된 생성 규칙이 없다면 결과는 무엇이고, 왜 `1 2 1`이 아닌가?
   <details><summary>답</summary>`++`는 b의 후위 연산자로 붙을 수 있어 그 자리에는 세미콜론이 들어가지 않고, 같은 줄의 `c`는 앞에 줄바꿈이 없어 규칙 1이 적용되지 않으므로 SyntaxError다. `1 2 1`은 줄바꿈이 `++`와 `c` 사이에 있어야 나온다(content.mdx 예제 3 설명, concept.test MODELS[3], 계획 변경 이력 리뷰 항목).</details>
2. 예제 2만으로는 왜 "이어 읽을 수 없을 때만 세미콜론이 들어간다"는 오해를 배제하지 못하는가? 어떤 예제가 배제하는가?
   <details><summary>답</summary>예제 2의 결과(`number 7`)는 그 오해로도 나온다. 반례는 이어 읽을 수 있어도 세미콜론이 들어가는 제한된 자리, 곧 예제 1(return)과 예제 4(break)다. 예제 3은 그 오해로도 `1 1 2`라 반례가 아니다(흔한 오해 2, 계획 변경 이력).</details>
3. "식으로 끝난 줄 다음 줄이 `[`로 시작하면 이어진다"를 그대로 믿으면 어디서 틀리는가?
   <details><summary>답</summary>앞 줄 끝의 식이 프로퍼티 접근의 왼쪽이 될 수 없으면 이어지지 않는다. `var r = i++` 다음 줄 `[0]`은 맞지 않는 토큰이라 세미콜론이 들어가 r은 0, `[0]`은 별개의 식 문이다. 함수 선언의 `}` 뒤도 새 문이다(content.mdx 이어 읽는 조건 문단, 탐침 postfixBracket·fnDecl).</details>
4. strict-mode 페이지의 "세미콜론 자동 삽입의 세부는 다루지 않습니다"에 왜 링크를 걸지 않았나?
   <details><summary>답</summary>그 문장이 미룬 하위 주제는 지시어 뒤 세미콜론 생략인데 새 페이지는 지시어 사례를 다루지 않는다. AGENTS.md는 대상 페이지가 그 하위 주제를 실제로 다룰 때만 링크하라고 한다(계획 2절 사실, 4절 변경하지 않음).</details>
5. `return` 다음 줄에 `{ a: 1, b }`를 쓰면 어떻게 되고, `{ a: 1, b: 2 }`와 왜 다른가?
   <details><summary>답</summary>`{ a: 1, b }`는 블록 안에서 레이블 `a:`와 쉼표 식 `1, b`로 읽혀 문법에 맞으므로 오류 없이 undefined를 반환한다(그 문은 평가되지 않는다). `{ a: 1, b: 2 }`는 둘째 `b:`의 `:`를 쉼표 식 안에서 읽을 수 없어 SyntaxError다(탐침 returnObj, 사용자 2차 검토).</details>
