# 태그드 템플릿 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-23
- 기준: `main` @ `9f08931`

## 0. 요약
- 목적: "같은 템플릿을 두 번 평가하면 왜 같은 배열을 받을까"를 질문으로 하는 `tagged-templates` 페이지를 추가한다(order 292, 학습 순서 46번째/75). 태그 함수는 템플릿 객체(글자 조각 배열)와 문자열로 바꾸지 않은 값을 받는다. 템플릿 객체는 소스 위치(Parse Node)마다 하나라서 반복해 평가해도 같은 동결 배열이다. 이것을 명세(GetTemplateObject)와 실행으로 보인다. cooked·raw, String.raw, 잘못된 이스케이프도 짧게 다룬다.
- 범위: 새 개념 폴더(ecmascript 예제 6개, 분해 표 1개, 퀴즈 6개, 시뮬레이터 없음)를 추가한다. data-types의 simplifications 한 문장을 연결하고, 46번째 이후 순위를 +1 하는 테스트, e2e·빌드 등록, content-guide 경로 목록을 고친다. 공통 코드 소스는 바꾸지 않는다.
- 위험: 예제가 "태그 함수는 완성된 문자열을 받는다", "글자가 같으면 같은 배열", "함수 객체마다 새 배열" 모델을 배제하지 못할 수 있다. 명세에 없는 설계 의도(동결 이유)를 사실처럼 쓸 수 있다. 백슬래시가 든 표 칸·퀴즈 문자열·첫 문단의 백틱이 테스트와 렌더를 깨뜨릴 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: HIGH 1·MEDIUM 6, Critic REVISE: HIGH 1·MEDIUM 5. 메인이 실행·명세(현행 초안과 ES2015~2019판)로 재확인해 반영했고, rest 파라미터 선행 개념 지적 1건만 기각)
- 미확정: 없음

## 1. 요구사항

- 사용자 결정(2026-11-23)
  - 추가 게시글 로드맵 3의 5번이다(`.claude/plans/concept-roadmap-extras-3.md`). order 292(`string-utf16` 290 뒤, `string-replace-split` 295 앞).
  - 시각화: 표 + 퀴즈(시뮬레이터 없음).
  - 잘못된 이스케이프는 짧은 절로 넣는다. 태그가 있는 경우만 예제로 실행해 검증한다. 태그 없는 SyntaxError는 예제 파일 전체를 실패시키므로 본문 문장과 concept.test 탐침으로만 확인한다.
- [Claude 판단] 새 페이지 메타
  - `app/concepts/tagged-templates/`, slug `tagged-templates`, category `fundamentals`(string-utf16·string-replace-split과 같은 문자열 주제), order 292, `reviewedAt: null`.
  - title: "태그드 템플릿: 같은 템플릿을 두 번 평가하면 왜 같은 배열을 받을까"
  - summary(148자, "객체" 없음 → 홈 "객체" 검색 결과 수 19 유지): "태그 함수는 완성된 문자열이 아니라 글자 조각 배열과, 문자열로 바꾸지 않은 끼운 값을 받습니다. 조각 배열은 소스의 그 위치마다 하나라서 몇 번 평가해도 같은 동결 배열이고, 글자가 같아도 위치가 다르면 다른 배열입니다. raw와 String.raw도 확인합니다."
  - tags("객체" 금지): `태그드 템플릿`, `tagged template`, `템플릿 리터럴`, `태그 함수`, `String.raw`, `raw`, `GetTemplateObject`, `이스케이프`.
  - goals(4개, 백틱 금지)
    1. 태그 함수가 첫 인수로 글자 조각 배열을, 나머지 인수로 끼운 식의 값을 문자열로 바꾸지 않은 채 받고, 조각 수가 언제나 값 수보다 하나 많다는 것을 예측할 수 있다.
    2. 같은 위치의 태그드 템플릿은 몇 번 평가해도, 같은 코드에서 만든 다른 함수가 평가해도 같은 조각 배열을 받는다는 것을 명세의 GetTemplateObject로 설명할 수 있다. 글자가 같아도 다른 위치이면 다른 배열을 받는다는 것도 같은 근거로 설명할 수 있다.
    3. 조각 배열과 raw 배열이 동결되어 있고 raw 프로퍼티는 열거되지 않는다는 것으로 대입·Object.keys의 결과를 예측할 수 있다.
    4. cooked 문자열과 raw 문자열의 차이와 String.raw의 결과를 설명할 수 있다. 잘못된 이스케이프가 든 조각이 태그드 템플릿에서는 cooked 값이 undefined가 되고, 태그 없는 템플릿 리터럴에서는 SyntaxError가 된다는 것도 설명할 수 있다.
  - prerequisites: 데이터 타입(`data-types`, 템플릿 리터럴), 프로퍼티 어트리뷰트와 접근자(`property-attributes`, freeze), 화살표 함수와 메서드 축약(`arrow-functions`. `content.mdx:43`에 "rest 파라미터" 절이 있다).
  - related: `data-types`, `type-coercion`, `to-primitive`, `property-attributes`, `arrow-functions`, `strict-mode`, `closure`, `string-utf16`, `this-binding`.
- 용어 규칙
  - 명세 용어 "템플릿 객체(template object)"는 본문에서 정의하고 쓴다. 정의 전에는 "글자 조각 배열"로 부른다. 예제의 첫 인수 이름은 `strings`로 통일하고, 나머지 인수는 "rest 파라미터"(사이트 용어)로 받는다.
  - cooked와 raw는 명세 TemplateStrings의 매개변수 `escapes`에 넘기는 값이다(cooked = 템플릿 객체의 인덱스 값, raw = `raw` 배열의 값). 본문에서는 첫 등장 때 풀어 쓴다. cooked 문자열은 "이스케이프를 해석한 값", raw 문자열은 "이스케이프를 해석하지 않은 값"이다. raw를 "소스에 쓴 글자 그대로"라고 쓰지 않는다(TRV도 CR·CRLF는 LF로 바꾼다).
  - "위치"는 명세의 Parse Node를 풀어 쓴 말이다. 첫 등장 때 "소스 코드에서 그 템플릿 리터럴이 쓰인 자리(Parse Node)"로 밝힌다. [[TemplateMap]]은 "맵·키"로 쓰지 않는다. realm이 가진 Record 목록이고, GetTemplateObject는 [[Site]]가 같은 Parse Node인 항목을 찾는다고 쓴다.
  - 동결의 이유(설계 의도)는 명세에 없으므로 쓰지 않는다. 사실만 쓴다: 매번 같은 동결 배열이 넘어오므로, 태그 함수가 그 배열을 바꿔 다음 평가가 받는 값에 영향을 줄 수는 없다.
  - 명세 Note 2는 템플릿 객체를 만드는 시점(처음 평가 때인지 미리인지)을 관찰할 수 없다고 적는다. 그러므로 "처음 평가할 때 만든다"고 단정하지 않는다.
  - 뒤 개념을 가리킬 때 본문은 링크로 "…에서 다룹니다", simplifications는 개념 이름으로 쓴다(AGENTS.md). to-primitive(305)는 뒤 개념이다.
  - 판 이력은 확인한 것만 쓴다. ES2015(6.0)·ES2016(7.0)·ES2017(8.0)판의 GetTemplateObject는 [[TemplateMap]] 항목의 [[Strings]]와 raw 문자열 목록이 같으면 그 배열을 돌려줬다. ES2018판(tc39.es/ecma262/2018)부터 [[Site]]가 같은 Parse Node인지 본다(2026-11-23 원문 대조).
- 첫 문단의 답(첫 평문 줄에는 백틱이 든 코드를 쓰지 않는다. `firstProseLine`이 백틱을 지우고 렌더 텍스트와 대조하기 때문이다, `tests/build/build-output.test.ts:31-43`)
  - 첫 줄(평문만): 태그 함수 이름 바로 뒤에 템플릿 리터럴을 붙인 식은 함수 호출이다. 태그 함수는 첫 인수로 템플릿의 글자 조각을 담은 배열(템플릿 객체)을, 나머지 인수로 끼운 식의 값을 문자열로 바꾸지 않은 채 받는다.
  - 둘째 문장부터: `` tag`…` `` 표기를 쓴다. GetTemplateObject는 realm의 [[TemplateMap]]에서 [[Site]]가 그 템플릿 리터럴과 같은 Parse Node인 항목을 찾는다. 그래서 반복문 안이든, 같은 코드에서 만든 여러 함수 안이든 같은 위치는 매번 같은 배열을 받는다. 글자가 같아도 다른 위치의 템플릿은 다른 배열을 받는다. 그 배열은 동결되어 있다.
- 동작 원리 절(h3 6개)
  1. "태그드 템플릿은 함수 호출이다"
     - MemberExpression이나 CallExpression 뒤에 TemplateLiteral이 오면 EvaluateCall(태그 값, 참조, 템플릿)이다.
     - 인수 목록은 ArgumentListEvaluation이 만든다. 첫 인수는 GetTemplateObject의 결과이고, 이어서 `${}` 식을 왼쪽부터 평가한 값(GetValue만, ToString 없음)이 온다. 태그 없는 템플릿 리터럴의 Evaluation은 각 값에 ToString을 쓴다는 것과 대비한다. 링크: [암묵적 타입 변환](/concepts/type-coercion), 뒤 개념인 [객체를 원시 값으로](/concepts/to-primitive)("…에서 다룹니다" 꼴).
     - 태그 함수의 반환값이 식의 값이고, 문자열일 필요가 없다.
     - `` kind(`id`) ``는 괄호 안 템플릿 리터럴을 먼저 문자열로 평가한 보통 호출이다(예제 1).
     - `` obj.tag`x` ``처럼 프로퍼티 참조로 부르면 보통 메서드 호출처럼 this가 obj다(탐침, [this 바인딩](/concepts/this-binding) 링크).
  2. "조각은 값보다 하나 많다"
     - TemplateStrings가 head, middle들, tail을 모으므로 조각 수 = 식 수 + 1이다.
     - 템플릿이 `${}`로 시작하거나 끝나는 자리, `${}`가 붙어 있는 자리의 조각은 빈 문자열이다(예제 2).
  3. "같은 위치면 같은 배열"
     - GetTemplateObject 단계: 현재 realm의 [[TemplateMap]](Record 목록)에서 [[Site]]가 같은 Parse Node인 항목이 있으면 그 [[Array]]를 돌려준다. 없으면 만들어서 목록에 더한다.
     - Note 2를 인용한다. 후보는 "the same template object is used each time a specific tagged Template is evaluated"이고, 단어 수를 원문에서 직접 세어 15단어 이하인지 확인한다.
     - 예제 3:
       - 반복문 안의 같은 위치는 같은 배열이다.
       - [클로저](/concepts/closure)로 같은 코드에서 만든 서로 다른 함수 두 개(`f1 === f2`가 false)도 같은 배열을 받는다. 같은 Parse Node이기 때문이다.
       - 반복문 밖에서 글자까지 똑같은 `` keep`x${i}` ``는 다른 배열을 받는다.
     - 만드는 시점은 관찰할 수 없다.
     - 판 이력 한 문장: ES2017판까지는 raw 문자열이 같으면 같은 배열이었고 ES2018판부터 위치 기준이다. 흔한 오해 상자의 "글자가 같으면 같은 배열"은 지금 명세 기준으로는 틀렸지만 옛 판의 동작이었다고 밝힌다.
  4. "템플릿 객체는 동결되어 있다"
     - GetTemplateObject가 인덱스 프로퍼티를 writable false·configurable false로 만든다. rawObj와 template에 SetIntegrityLevel frozen을 하고, `raw`는 enumerable false다.
     - strict 대입은 TypeError, sloppy 대입은 조용히 무시된다([프로퍼티 어트리뷰트](/concepts/property-attributes)·[strict mode](/concepts/strict-mode) 링크). `Object.keys`에 raw가 없다(예제 4).
     - Note 3(앞으로 열거되지 않는 프로퍼티가 더 생길 수 있음)은 본문 한 문장으로 쓴다. simplifications에는 넣지 않는다.
  5. "cooked와 raw, String.raw"
     - 인덱스 값은 TV(이스케이프를 해석한 값)이고, raw는 TRV(이스케이프를 해석하지 않은 값)다.
     - `String.raw`는 첫 인수의 `raw`를 읽고, 그 raw 문자열 사이에 나머지 인수를 ToString해 끼우는 보통 함수다. 그래서 `{ raw: [...] }`를 직접 넘길 수도 있다. 조각 수 - 1보다 많은 인수는 쓰지 않는다(예제 5).
  6. "잘못된 이스케이프"
     - `\u` 뒤에 16진수가 오지 않는 것처럼 NotEscapeSequence에 해당하면, 그 조각의 TV가 undefined다(다른 조각은 정상, 탐침).
     - 태그드 템플릿에서는 그 조각의 cooked 값이 undefined이고 raw는 이스케이프를 해석하지 않은 값이다(예제 6).
     - 태그 없는 템플릿 리터럴은 조기 오류(SyntaxError)다. 스크립트가 아예 실행되지 않는다(탐침: 앞줄의 출력도 없음).
     - `String.raw`는 raw만 읽으므로 이스케이프를 해석하지 않은 문자열을 돌려준다(예제 6).
     - 명세 TemplateString Note의 raw·undefined 문장은 알고리즘과 어긋나 보이므로 인용하지 않는다. 근거는 TV 정의와 GetTemplateObject의 Assert로 쓴다.
- 예제(아래 판 그대로 `scratchpad/tt/ex`에서 Node vm으로 sloppy·`'use strict';` 접두 모두 실행해 같은 출력을 확인했다. 예제 3·5는 검토 반영 뒤 다시 실행했다. 예제 4는 첫 줄이 `'use strict';`다). 파일 이름과 expectedOutput은 다음과 같다(실제 출력 줄 표기).
  1. `tag-arguments.js` → `["id:",", next:",""] 3 2`, `object number`, `2 number`, `id:[object Object], next:8`, `object string`
     ```js
     function inspect(strings, ...values) {
       console.log(JSON.stringify(strings), strings.length, values.length);
       console.log(typeof values[0], typeof values[1]);
       return values.length;
     }
     var item = { id: 7 };
     var result = inspect`id:${item}, next:${item.id + 1}`;
     console.log(result, typeof result);
     console.log(`id:${item}, next:${item.id + 1}`);
     function kind(arg) {
       return typeof arg;
     }
     console.log(kind`id`, kind(`id`));
     ```
  2. `strings-count.js` → `["plain"] 0`, `["",""] 1`, `["","",""] 2`, `["a","b"] 1`
     ```js
     function count(strings, ...values) {
       return JSON.stringify(strings) + ' ' + values.length;
     }
     console.log(count`plain`);
     console.log(count`${1}`);
     console.log(count`${1}${2}`);
     console.log(count`a${1}b`);
     ```
  3. `same-site.js` → `true true`, `false`, `false true`
     ```js
     function keep(strings) {
       return strings;
     }
     var seen = [];
     for (var i = 0; i < 3; i++) {
       seen.push(keep`x${i}`);
     }
     var elsewhere = keep`x${i}`;
     console.log(seen[0] === seen[1], seen[1] === seen[2]);
     console.log(seen[0] === elsewhere);
     function makeTagger() {
       return function () {
         return keep`y`;
       };
     }
     var f1 = makeTagger();
     var f2 = makeTagger();
     console.log(f1 === f2, f1() === f2());
     ```
  4. `frozen-template.js` → `true true true`, `TypeError`, `a 0,1`
     ```js
     'use strict';
     function keep(strings) {
       return strings;
     }
     var s = keep`a${1}b`;
     console.log(Object.isFrozen(s), Object.isFrozen(s.raw), Array.isArray(s));
     try {
       s[0] = 'z';
     } catch (e) {
       console.log(e.name);
     }
     console.log(s[0], Object.keys(s).join(','));
     ```
  5. `cooked-raw.js` → `"a\tb" 3`, `"a\\tb" 4`, `"a\\tb2c"`, `true`, `x1y`
     ```js
     function both(strings) {
       console.log(JSON.stringify(strings[0]), strings[0].length);
       console.log(JSON.stringify(strings.raw[0]), strings.raw[0].length);
     }
     both`a\tb`;
     console.log(JSON.stringify(String.raw`a\tb${1 + 1}c`));
     console.log(String.raw`a\tb` === 'a\\tb');
     console.log(String.raw({ raw: ['x', 'y'] }, 1, 2));
     ```
  6. `invalid-escape.js` → `undefined "\\unicode"`, `undefined "C:\\xyz"`, `\unicode`
     ```js
     function both(strings) {
       console.log(strings[0], JSON.stringify(strings.raw[0]));
     }
     both`\unicode`;
     both`C:\xyz`;
     console.log(String.raw`\unicode`);
     ```
  - meta.ts의 expectedOutput은 TS 문자열이므로 백슬래시를 두 번 쓴다. 테스트(L1)가 실제 출력과 대조한다.
- 예제별로 배제하는 틀린 모델(퀴즈 오답의 출처). Critic이 모델을 다시 계산해 아래 값이 맞음을 확인했다. 구현 때도 각 모델을 코드로 흉내 내 concept.test에 남긴다. 선택지 = 정답 + 오답이다.
  1. M1 끼운 값도 문자열로 바뀌어 넘어간다 → 둘째 줄 `string string`. M2 조각 수 = 값 수(끝 빈 문자열 없음) → 첫 줄 `["id:",", next:"] 2 2`. M3 괄호로 감싸도 태그드 템플릿과 같다 → 마지막 줄 `object object`. 4지선다.
  2. M1 빈 조각은 넣지 않는다 → `["plain"] 0 / [] 1 / [] 2 / ["a","b"] 1`. M2 조각 수 = 값 수(마지막 조각을 버림) → `[] 0 / [""] 1 / ["",""] 2 / ["a"] 1`. 3지선다.
  3. M1 평가할 때마다 새 배열 → `false false / false / false false`. M2 글자가 같으면 같은 배열(ES2017판까지의 규칙) → `true true / true / false true`. M3 함수 객체마다 새 배열 → `true true / false / false false`. 4지선다. 퀴즈 해설은 M2를 "명세가 그렇게 정한 적이 없는 오해"로 쓰지 않는다.
  4. M1 동결만 뺀 배열(raw는 지금처럼 열거되지 않는 프로퍼티) → `false false true / z 0,1`(TypeError 줄 없음). M2 raw도 열거된다 → `true true true / TypeError / a 0,1,raw`. M3 strict에서도 조용히 무시 → `true true true / a 0,1`. 4지선다.
  5. M1 raw도 이스케이프를 해석한다 → `"a\tb" 3 / "a\tb" 3 / "a\tb2c" / false / x1y`. M2 String.raw는 넘긴 값을 모두 붙인다 → 마지막 줄 `x1y2`. 3지선다.
  6. M1 태그가 있어도 SyntaxError → "SyntaxError로 아무것도 출력되지 않는다". M2 cooked도 raw와 같은 글자 → `\unicode "\\unicode" / C:\xyz "C:\\xyz" / \unicode`. 3지선다.
- 분해 표
  - 감싸기: `<div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="태그드 템플릿 분해 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)">` 안의 JSX `<table>`(function-name `content.mdx:155-160` 선례).
  - 머리 행 `템플릿 | strings | strings.raw | 나머지 인수 | 예제`

  | 템플릿 | strings | strings.raw | 나머지 인수 | 예제 |
  | - | - | - | - | - |
  | `` t`plain` `` | `["plain"]` | `["plain"]` | 없음 | 2 |
  | `` t`${1}${2}` `` | `["","",""]` | `["","",""]` | `1`, `2` | 2 |
  | `` t`id:${item}, next:${item.id + 1}` `` | `["id:",", next:",""]` | `["id:",", next:",""]` | `item` 그 자체(`===`), `8` | 1 |
  | `` t`a\tb` `` | `["a\tb"]` | `["a\\tb"]` | 없음 | 5 |
  | `` t`\unicode` `` | `[undefined]` | `["\\unicode"]` | 없음 | 6 |

  - strings·raw 칸은 `JSON.stringify` 표기다. 단 undefined는 `[undefined]`로 쓴다. 표 위에 표기 규칙과 "칸은 테스트가 각 행의 템플릿을 실제로 평가해 대조한다"는 문장을 쓴다.
  - 칸의 코드는 `<code>{'…'}</code>`로 쓴다. JSX 식 안의 JS 문자열이므로 백슬래시는 소스에 두 번 쓴다(`{'t`a\\tb`'}` → 렌더 `` t`a\tb` ``, `{'["a\\\\tb"]'}` → 렌더 `["a\\tb"]`). 백슬래시 하나짜리 `\u`를 JS 문자열에 쓰면 MDX 파싱에서 SyntaxError가 난다.
  - concept.test(`tableBody`)
    - 칸 텍스트의 백슬래시가 짝으로만 나오는지 단언한 뒤 `\\`를 `\`로 바꾼다. 결과는 JS 문자열 해석과 같다.
    - 템플릿 칸은 vm에서 태그 `t`(인수를 기록)로 평가한다. 셋째 행은 `item`을 미리 정의한다.
    - strings·raw 칸은 평가 결과의 표기와 정확히 비교한다.
    - "나머지 인수" 칸은 행마다 칸 문구를 테스트에 하드코딩해 정확히 비교하고(function-name 비교표 선례), 실제 값을 따로 단언한다(`values[0] === item`, `values[1] === 8`, 첫째·넷째·다섯째 행은 0개).
    - 예제 칸은 양방향으로 검사한다. 그 행의 템플릿 글자가 해당 예제 파일에 있고 다른 예제 파일에는 없어야 한다(`t` 대신 그 예제의 태그 이름으로 바꿔 찾는다).
  - 빌드 테스트는 `htmlToText`(`tests/build/build-output.test.ts:20`)로 바꾼 텍스트에 `` t`a\tb` ``·`["a\\tb"]`·`[undefined]`가 있는지 본다(원본 HTML은 `&quot;` 때문에 맞지 않는다).
- 퀴즈 6개(예제마다 1개, 정답 = 출력 줄을 ' / '로 이은 것). 정답 위치가 모두 같지 않게 한다.
  - 선택지는 JSX 속성 안의 JS 문자열 배열이다. 백슬래시는 두 번 쓴다. 테스트는 표와 같은 방법으로 해석한다(짝 단언 → `\\`→`\`). 그 뒤 정답이 expectedOutput을 ' / '로 이은 값과 같은지, 선택지 수가 위 n지선다와 같은지 검사한다.
  - explanation은 JSX 속성 문자열이라 이스케이프가 해석되지 않는다. 그래서 큰따옴표와 백슬래시 표기(JSON 표기)를 쓰지 않고 산문으로 쓴다(to-primitive 교훈).
- 흔한 오해 2개
  - "태그 함수는 완성된 문자열을 받는다"(예제 1)
  - "글자가 같은 템플릿은 같은 배열을 받는다 / 함수를 새로 만들면 새 배열을 받는다"(예제 3, ES2017판까지의 규칙 한 문장)
- simplifications
  - 예제는 예제 4(첫 줄 `'use strict';`)를 빼고 sloppy mode 스크립트다. 첫 줄에 `'use strict';`를 붙여도 결과가 같다(concept.test 검사). `console.log`는 호스트 API다. 예제의 `JSON.stringify`는 값을 보이는 도구로만 쓰고 JSON 개념에서 다룬다. 예제 4의 try…catch는 try/catch/finally 개념에서 다룬다(function-name·set-map 선례 문구에 맞춘다).
  - "위치"는 명세의 Parse Node를 풀어 쓴 말이다. 같은 소스 텍스트라도 eval·Function 생성자처럼 다시 파싱하면 다른 Parse Node가 되어 다른 템플릿 객체를 받는다(탐침).
  - 템플릿 객체 재사용은 같은 realm 안의 이야기다. realm마다 [[TemplateMap]]이 따로 있다(iframe 등 다른 realm은 다루지 않음).
  - raw 문자열도 CR·CRLF 줄바꿈은 LF로 바뀐다(탐침). 템플릿 리터럴의 줄바꿈 처리와 따옴표 문자열과의 차이는 데이터 타입 개념에서 다룬다. `${}` 값을 문자열로 바꾸는 규칙은 암묵적 타입 변환 개념과 객체를 원시 값으로 개념에서 다룬다.
  - 옵셔널 체이닝 뒤의 태그드 템플릿(SyntaxError, 탐침)과 꼬리 호출 위치는 다루지 않는다.
- references(앵커는 Architect가 사본에서 존재를 확인했다. 절 번호는 라벨에 쓰지 않는다)
  - ECMAScript 현행 초안: Template Literals(`sec-template-literals`), GetTemplateObject(`sec-gettemplateobject`), Tagged Templates(`sec-tagged-templates`), TV(`sec-static-semantics-tv`), TRV(`sec-static-semantics-trv`), 템플릿 조기 오류(`sec-static-semantics-template-early-errors`), String.raw(`sec-string.raw`)
  - ES2017판 GetTemplateObject(판 이력 근거, `https://tc39.es/ecma262/2017/#sec-gettemplateobject`)
  - MDN 템플릿 리터럴(태그드 템플릿 절)

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)
- 기존 서술
  - `data-types`는 템플릿 리터럴 문법과 줄바꿈을 다루고(`app/concepts/data-types/content.mdx:122-128`), 태그드 템플릿·String.raw는 다루지 않는다고 밝힌다(`app/concepts/data-types/meta.ts:78`).
  - `data-types/meta.ts:77`의 "그 밖의 이스케이프 규칙(따옴표와 템플릿의 차이 포함)"은 새 페이지가 일부(태그드 템플릿의 NotEscapeSequence)만 다룬다. 링크 규칙("실제로 다룰 때만")에 따라 연결하지 않는다.
  - `type-coercion`이 `${}`의 ToString을(`type-coercion/content.mdx:71`), `to-primitive`가 템플릿 리터럴의 string 힌트를(`to-primitive/content.mdx:14`) 다룬다.
  - `expressions-statements/meta.ts:49`는 템플릿 리터럴을 "리터럴" 분류에서 뺀 것이라 새 페이지 범위가 아니다.
  - `string-utf16`은 `\u` 이스케이프를 쓰기만 하고 규칙이나 템플릿은 다루지 않아 겹치지 않는다(로드맵 확인 항목).
- 학습 순서: order 290은 `string-utf16`(45번째), 295는 `string-replace-split`(46번째)이다. 292를 넣으면 새 페이지가 46번째가 되고, 기존 46번째 이후가 +1이 되어 총 75개다. 선행 개념(data-types 7, type-coercion 30, property-attributes 150, strict-mode 177, this-binding 190, closure 210, arrow-functions 250)은 모두 292보다 앞이다.
- 순서 고정 테스트(Architect 확인)
  - `app/lib/concepts.test.ts:104,111-112`
  - `app/components/concept/ConceptPager.test.tsx:18,28`
  - `tests/e2e/navigation.spec.ts`: `/ 74` 전체, 88 카드 수, 96 `74번째`, 113-133 "객체" 순위(48·49·51·52·63·70 → 49·50·52·53·64·71, 결과 수 19 유지), 154 article 수, 417 string-utf16 다음, 429 string-replace-split 이전, 새 pager 블록
  - `tests/e2e/responsive.spec.ts:1807`
- 표+퀴즈형 선례 `function-name`의 등록 위치: `tests/e2e/helpers.ts:20`, `tests/e2e/a11y.spec.ts:891`, `tests/e2e/responsive.spec.ts:1500`, `tests/build/build-output.test.ts:1432-`. 직전 두 개념 커밋은 `docs/content-guide.md` "경로를 직접 등록한 페이지" 목록(약 223행)에 slug를 더했다.
- 검색은 title·summary·tags만 본다(`app/lib/concepts.ts:92-98`).
- 빌드 첫 문단 검사 `firstProseLine`은 첫 평문 줄의 `` ` ``·`*`·`_`를 지운 뒤 렌더 텍스트와 비교한다(`tests/build/build-output.test.ts:31-43`).
- `normalizeCell`은 태그를 지우고 `{'…'}`의 안쪽을 해석 없이 꺼낸다(`tests/helpers/result-tables.ts:17-23`). 머리에 "결과"·"출력"이 없고 첫 머리가 "예제"가 아니면 자동 대조와 형식 위반 판정 대상이 아니다(`tests/helpers/result-tables.ts:93-140`). `tableBody`는 머리 행이 정확히 같은 표 1개를 요구한다.
- 퀴즈 선택지 추출 선례는 해석하지 않은 소스 글자를 꺼낸다(`app/concepts/function-name/concept.test.ts:223-224`).
- 명세(ES2027 초안 사본, 2026-11-12)
  - GetTemplateObject: [[TemplateMap]]에서 [[Site]]가 같은 Parse Node면 [[Array]]를 돌려준다. 아니면 다음 순서로 만든다.
    - 인덱스 프로퍼티 `{writable: false, enumerable: true, configurable: false}`
    - rawObj frozen
    - `raw`는 `{writable: false, enumerable: false, configurable: false}`
    - template frozen
    - 맵에 추가
    - Note 2: 같은 tagged Template을 평가할 때마다 같은 템플릿 객체이고, 만드는 시점은 관찰할 수 없다. Note 3: 열거되지 않는 프로퍼티가 추가될 수 있다.
  - Tagged Templates Evaluation: EvaluateCall(tagFunc, tagRef, TemplateLiteral, tailCall). ArgumentListEvaluation(TemplateLiteral): « siteObj » + 식 값(GetValue만).
  - 태그 없는 Evaluation: 각 값에 ToString. Note: "like String.prototype.concat rather than the + operator".
  - TV: `\` NotEscapeSequence의 TV는 undefined이고 그 TemplateCharacters 전체로 번진다. 조기 오류: [Tagged]가 없고 cooked TemplateStrings에 undefined가 있으면 SyntaxError.
  - String.raw: ToObject → Get "raw" → LengthOfArrayLike → 조각 사이에 substitutions[i]를 ToString해 끼운다. 남는 인수는 무시하고, 모자라면 그 자리를 건너뛴다.
  - 사본의 TemplateString Note(raw이면 undefined)는 알고리즘·Assert와 어긋난다. 인용하지 않는다.
- 판 이력(원문 대조): ES2015(262.ecma-international.org/6.0), ES2016(7.0), ES2017(8.0, tc39.es/ecma262/2017)의 GetTemplateObject는 "e.[[Strings]] and rawStrings contain the same values in the same order"다. ES2018·ES2019판(tc39.es/ecma262/2018, 2019)은 "e.[[Site]] is the same Parse Node as templateLiteral"이다.
- 실행(Node 24, vm, sloppy·strict 접두)
  - 위 예제 6개 출력
  - 탐침
    - 태그 없는 `` `\unicode` ``는 SyntaxError이고 앞줄 출력도 없다.
    - `` obj.tag`x` ``의 this는 obj다.
    - 평가 순서는 태그 식 → `${}` 식 왼쪽부터 → 호출이다.
    - sloppy에서 조각 배열 대입은 무시되고 `push`는 TypeError다.
    - raw 디스크립터는 위 명세와 같다.
    - CRLF는 cooked·raw 모두 LF다.
    - `` t`\u${1}ok` ``의 strings는 `[undefined,"ok"]`, raw는 `["\\u","ok"]`다.
    - `eval(src) === eval(src)`는 false다.
    - `` o?.t`x` ``는 SyntaxError다.
    - 예제 1 템플릿의 값은 `values[0] === item`, `values[1] === 8`이다.
    - 같은 자리에서 태그 함수만 달라도 같은 템플릿 객체다(Critic).

### 추정
- 없음

## 3. 구현 전략
- function-name과 같은 표+퀴즈형 구조를 따른다: `## 동작 원리` → `## 예제`(코드+퀴즈) → `## 결과와 이유`(예제별 h3 + 분해 표 + 흔한 오해). 공통 코드는 쓰기만 한다.
- 분해 표는 "템플릿 하나 → 태그 함수가 받는 인수"를 한 줄로 보이는 식 표다. 결과 표 자동 대조 형식이 아니므로 concept.test가 행마다 템플릿을 평가해 대조한다.
- 버린 대안
  - [[TemplateMap]] 시뮬레이터: 사용자가 표+퀴즈를 골랐다.
  - 태그 호출 순서·this·eval 예제: 탐침과 simplifications로 충분하다. 독자용 eval 금지 교훈도 있다.
- 검토 지적 중 기각: "arrow-functions는 rest 파라미터를 설명하지 않는다"(Architect LOW). `arrow-functions/content.mdx:43`에 "### rest 파라미터" 절과 예제 6이 있어 선행 개념으로 유지한다.

## 4. 변경 파일
- 추가: `app/concepts/tagged-templates/` — `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`, `examples/*.js` 6개. 계획 문서 `.claude/plans/tagged-templates.md`.
- 수정(로직): `app/concepts/data-types/meta.ts:78`의 첫 문장을 "태그드 템플릿과 String.raw는 태그드 템플릿 개념에서 다룹니다."로 바꾸고 related에 `tagged-templates`를 더한다. reviewedAt은 선례대로 바꾸지 않는다.
- 수정(기계적)
  - `app/lib/concepts.test.ts`(total 75)
  - `app/components/concept/ConceptPager.test.tsx`(`/ 75`, 마지막 `75 / 75`)
  - `tests/e2e/navigation.spec.ts`(2절의 목록)
  - `tests/e2e/responsive.spec.ts`(article 75, 새 페이지 가로 스크롤)
  - `tests/e2e/a11y.spec.ts`(새 페이지 "개념 페이지: 태그드 템플릿")
  - `tests/e2e/helpers.ts`(경로 상수)
  - `tests/build/build-output.test.ts`(프리렌더: 분해 표 칸·퀴즈가 HTML에 있음)
  - `docs/content-guide.md`(경로 등록 페이지 목록에 slug 추가)
- 변경하지 않음
  - 공통 코드
  - `expressions-statements`(범위가 다르다)
  - `data-types/meta.ts:77`(일부만 다룬다)
  - `type-coercion`·`to-primitive`(자기 설명이 있다)

## 5. 위험 요소
- 예제가 틀린 모델을 배제하지 못할 수 있다. 막는 곳: 모델별 출력을 코드로 계산해 정답과 다른지 테스트로 남긴다(작업 2). 예제 3은 글자가 같은 다른 위치와 클로저 두 개로 "소스 글자" 모델과 "함수 객체" 모델을 배제한다.
- 동결 이유나 만드는 시점을 단정할 수 있다. 막는 곳: `grep -nE "동결.{0,30}위해|위해.{0,30}동결|처음 평가할 때 만들"` 0건(작업 3).
- 판 이력을 틀리게 쓸 수 있다. 막는 곳: 2절의 원문 대조 결과만 쓴다. "ES2018판부터"보다 세밀한 제안 번호·연도는 쓰지 않는다.
- 첫 문단 첫 줄에 백틱 코드가 들어가 `test:build`가 실패할 수 있다. 막는 곳: 작업 3 완료 조건.
- 백슬래시 표기
  - 표 칸·퀴즈 선택지(JSX 식의 JS 문자열)는 백슬래시를 두 번 쓴다. 테스트는 짝 단언 뒤 해석한다.
  - explanation에는 백슬래시 표기를 쓰지 않는다.
  - 본문 인라인 코드 `` `\unicode` ``는 마크다운 코드라 그대로 보이는지 빌드 텍스트로 확인한다.
  - `\uXXXX` 4자리 이스케이프는 쓰지 않는다(도구 입력 함정. `\unicode`는 16진수 4자리가 아니다).
- MDX 함정: 산문의 `{`·`<`는 백틱 안에 쓰고, 속성 안 큰따옴표와 표 칸의 `<`는 쓰지 않는다.
- 순서 삽입 누락. 막는 곳: `grep -rnE "/ 74|toBe\(74\)|toHaveCount\(74\)|74번째" app tests` 0건.
- 예제 파일은 Prettier 제외 폴더라 줄이 유지된다.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(공통 코드 불변): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "tagged-templates|태그드 템플릿|홈 학습 순서 보기"`
- 브라우저: 개발 서버(재시작 후)에서 `/concepts/tagged-templates`를 열어 확인한다.
  - 첫 문단이 보인다.
  - 분해 표 5행의 `` t`a\tb` ``·`["a\\tb"]`·`[undefined]` 표기가 보인다.
  - 퀴즈 6개를 하나씩 풀면 정답 피드백이 나온다.
  - "학습 순서 46 / 75"와 이전(string-utf16)·다음(string-replace-split) 링크가 맞다.
  - 375px 폭에서 표 영역만 가로로 스크롤되고 페이지는 가로 스크롤이 없다.

## 7. 미확정 사항
- 없음

## 8. 작업 순서
### 1. 메타와 예제
- 대상: `meta.ts`, `examples/*.js` 6개, `route.tsx`(meta → content(임시 최소 본문) → route 순서로 만든다)
- 변경: 1절의 메타·예제를 그대로 넣는다.
- 완료 조건
  - 저장소 루트에서 `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts`가 통과한다.
  - title·summary·goals에 백틱이 없다.
  - summary는 160자 이하이고 "객체"가 없다.
### 2. concept.test 골격(예제·모델·탐침)
- 대상: `concept.test.ts`
- 변경
  - `'use strict';` 접두로 실행해도 출력이 같은지 본다(예제 4 제외).
  - 예제별 틀린 모델을 코드로 흉내 낸 출력이 1절의 값과 같고 정답과 다른지 본다.
  - 탐침: 태그 없는 잘못된 이스케이프는 SyntaxError이고 앞줄 출력이 없다, member tag의 this, 평가 순서, raw 디스크립터, sloppy 대입 무시, 부분 조각 undefined, eval 재파싱은 다른 객체, CRLF→LF(raw), 옵셔널 체이닝 SyntaxError, `values[0] === item`.
  - 메타 조건: "객체" 없음, order 292, summary 160자 이하. reviewedAt null은 단언하지 않는다.
- 완료 조건: 저장소 루트에서 `npx vitest run app/concepts/tagged-templates`가 통과한다. 모델 출력을 구현 진행에 기록한다.
### 3. 본문
- 대상: `content.mdx`
- 변경: 1절의 첫 문단, 동작 원리 6절, 예제, 퀴즈 6개, 결과와 이유, 분해 표, 흔한 오해를 쓴다.
- 완료 조건
  - `npm test`가 통과한다.
  - 첫 평문 줄에 `` ` ``가 없다.
  - 5절의 금지 문구 grep이 0건이다.
  - explanation 속성에 `"`·`\`가 없다.
### 4. 분해 표·퀴즈 대조 테스트
- 대상: `concept.test.ts`
- 변경
  - `tableBody`로 표를 읽어 1절의 방식대로 대조한다(짝 단언, 해석, 평가, 나머지 인수 하드코딩과 값 단언, 예제 칸 양방향).
  - 퀴즈는 정답 = expectedOutput, 선택지 수, 정답 위치 분산을 검사한다.
- 완료 조건: 테스트가 통과한다. 표 칸 하나와 퀴즈 정답 하나를 일부러 바꾸면 각각 실패하는 것을 확인한 뒤 되돌린다.
### 5. 연결과 순서 테스트
- 대상: `data-types/meta.ts`, `docs/content-guide.md`, 4절의 기계적 수정 파일
- 완료 조건
  - 74 grep이 0건이다.
  - `npm run typecheck`, `npm test`, `npm run test:build`가 통과한다. 빌드 테스트는 `htmlToText` 기준으로 표·퀴즈 표기를 확인한다.
### 6. 전체 검증
- 완료 조건: 6절의 명령이 모두 통과하고, 브라우저 시나리오를 확인한다.

## 9. 추가 개선 후보
- `concept-roadmap-extras-3.md`의 4번 행 상태가 완료(9f08931) 뒤에도 "대기"다. 이번 개념을 마무리할 때 5번과 함께 로드맵 문서 상태를 정리한다(finalize 범위).

## 변경 이력
- 2026-11-23 (사용자 검토): 본문 문구 5건과 선택 보강 1건을 실행·명세로 확인한 뒤 반영했다. 바뀐 문구는 다음과 같다.
  - "바로 뒤에 붙인"을 "뒤에 오는(공백·줄바꿈 허용)"으로 바꿨다. 세미콜론 없는 줄 다음의 백틱 줄이 앞 식의 태그가 되는 문장을 넣고 iife-module-pattern에 링크했다.
  - String.raw는 raw의 각 인덱스 값을 ToString해 읽고, 값이 모자라면 아무것도 끼우지 않는다(`x1yz`).
  - 동결 문장의 인과를 "동결되어 있어서"로 바꾸고, WeakMap 키로 위치별 값을 기억하는 것은 가능하다는 문장을 넣었다(set-map 링크).
  - 판 이력을 "ES2015~ES2017판 명세 본문의 규칙"으로 한정했다. 당시 엔진 동작은 다루지 않는다. 사용자가 든 Firefox 이력은 직접 확인하지 않아 쓰지 않았다.
  - "템플릿 리터럴이 처음 평가될 때"로 용어를 바로잡았다.
  - 숫자 이스케이프 문장(`\1`·`\8`·`\01`·`C:\123`은 undefined, 뒤에 숫자가 없는 `\0`과 `\q`는 유효)을 넣었다.
  - 탐침 4개를 추가했다(concept.test 61개). 영향 단계: 3·4.
- 2026-11-23 (사용자 2차 검토): 두 문장을 고쳤다(실행으로 확인).
  - 줄바꿈 함정: 태그가 되는 것은 앞 줄 전체가 아니라 끝의 MemberExpression·CallExpression이다(`1 + keep⏎`x`` → `1x`). 태그가 함수가 아니면 TypeError이고, `return` 뒤에서는 세미콜론이 삽입된다. 이 설명을 별도 문단으로 옮겨 "그 함수가 태그 함수이고"의 지시 대상이 끊기지 않게 했다.
  - String.raw: length는 LengthOfArrayLike로 읽고 인덱스 값만 ToString한다.
  - 탐침 2개를 추가했다(concept.test 63개). 영향 단계: 3·4.

## 구현 진행

- baseline (2026-11-23, `9f08931`): lint·format:check·typecheck 통과 / npm test 188파일 6018개 통과 / test:build·e2e 미실행(6단계에서 실행)
- [x] 1·2·3·4. 새 개념 폴더(meta·예제 6개·route·본문·concept.test 55개) — Sonnet 구현, 메인이 diff 검토 후 본문 문구 6곳 직접 수정(Note 출처를 GetTemplateObject로 명시, 만드는 시점 문장, 동결 문장을 동결 절 끝으로 이동, Note 3 문구, JSON의 `\t` 표기 설명, 결과와 이유 예제 5 첫 줄, 첫 문단의 선행 개념 문장 삭제·조사 띄어쓰기). 변이 검사: 표 `[undefined]` 칸·예제 3 answer 변경 시 실패 확인 후 원복(Sonnet 보고).
  - 모델 출력(테스트로 고정): 1 M1 둘째 줄 `string string`·M2 첫 줄 `["id:",", next:"] 2 2`·M3 끝 줄 `object object` / 2 M1 `["plain"] 0 / [] 1 / [] 2 / ["a","b"] 1`·M2 `[] 0 / [""] 1 / ["",""] 2 / ["a"] 1` / 3 M1 `false false / false / false false`·M2 `true true / true / false true`·M3 `true true / false / false false` / 4 M1 `false false true / z 0,1`·M2 `true true true / TypeError / a 0,1,raw`·M3 `true true true / a 0,1` / 5 M1 `"a\tb" 3 / "a\tb" 3 / "a\tb2c" / false / x1y`·M2 끝 줄 `x1y2` / 6 M1 SyntaxError(출력 없음)·M2 `\unicode "\\unicode" / C:\xyz "C:\\xyz" / \unicode`
- [x] 5. 연결과 순서 테스트 — Sonnet 구현, 메인이 diff 확인(46 / 75 블록, 이웃 링크, "객체" 순위 49·50·52·53·64·71). 74 grep 0건.
- [x] 6. 전체 검증 (2026-11-23) — lint·format:check·typecheck 통과, npm test 189파일 6092개 통과, test:build 596개 통과, e2e navigation 16개·관련 8개 통과. 브라우저(dev 5173): 학습 순서 46 / 75·이전 string-utf16·다음 string-replace-split, 표 칸 렌더 `` t`a\tb` ``·`["a\\tb"]`·`[undefined]`, 퀴즈 3 정답 선택 시 "정답입니다" 피드백, 375px에서 페이지 가로 스크롤 없음(표 영역 안에서만 스크롤).
- 리뷰 1차(critical-code-review + Opus 명세 교차 검토, 2026-11-23): Opus 보고 Medium 4·Low 9 → 프로젝트 기준(명세와 다른 설명·오개념 위험은 결과가 맞아도 높음)으로 재판정해 High 7건 수정(`\u` 뒤 `{` 조건 누락, 예제 2 퀴즈 해설의 일반화, TemplateStrings가 배열을 만든다는 용어 오류, 문장 중간에서 자른 Note 2 인용 → 의역, 첫 줄 "태그 함수 이름"을 "태그 함수를 가리키는 식"으로, f1·f2가 다른 원인을 클로저가 아니라 함수 식 재평가로, 출력 `object number`가 item 동일성을 보인다는 과장). Low 6건도 문구·탐침으로 반영(ES2015판 `[[strings]]` 표기와 비교 대상, Note 3 "앞으로 나올 판", String.raw가 첫 인수를 검사하지 않는 이유, 8번 줄 result 표현, lone CR·Function 생성자·`\u{41}` 탐침 추가). 수정 후 lint·format·typecheck·npm test 6094개·test:build 596개·e2e 16+8개 통과.
  - 남은 Low: 375px에서 분해 표의 코드 칸이 좁아 여러 줄로 꺾임(가로 스크롤 영역 안, 선례 표와 같은 방식). 고치지 않음.
- 사용자 검토 반영(2026-11-23): 변경 이력 참고. lint·format·typecheck, npm test 6098개, test:build 596개, e2e 16+8개 통과. dev 5173에서 바뀐 문장이 렌더되고 콘솔 오류가 없음을 확인.
- 사용자 2차 검토 반영(2026-11-23): lint·format·typecheck, npm test 6100개, test:build 596개, e2e 16+8개 통과.
- 마무리(2026-11-23): 사용자 결정으로 reviewedAt을 `'2026-11-23'`으로 기록했다. 개념 테스트·content-integrity·examples 1629개, test:build 재실행.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(예제 6개·퀴즈 6개·분해 표 5행·흔한 오해 2개, 시뮬레이터 없음, order 292·학습 순서 46/75). 완료 조건은 바꾸지 않았다.
- 계획 이후 늘어난 것: 사용자 검토 두 차례로 줄바꿈 함정 문단(태그와 템플릿 사이 줄바꿈 허용, 끝의 MemberExpression·CallExpression만 태그, `return` 뒤 ASI), String.raw 읽는 방식(LengthOfArrayLike·인덱스 ToString·값 부족 시 `x1yz`), 동결·WeakMap 문장, 판 이력 범위 한정, 숫자 이스케이프 문장을 더했다. 탐침이 6개 늘어 concept.test는 63개다.
- reviewedAt은 마무리 때 사용자 결정으로 2026-11-23을 기록했다.

### 코드 리뷰
- 리뷰 1차(critical-code-review + Opus 명세 교차 검토)에서 High 7건(`\u{` 조건, 예제 2 해설 일반화, TemplateStrings 용어, Note 2 인용 자름, "태그 함수 이름", 클로저를 원인으로 쓴 문장, `object number` 과장)과 Low 6건을 고쳤다.
- 고치지 않고 남긴 Low: 375px에서 분해 표의 코드 칸이 여러 줄로 꺾임(표 영역 안 가로 스크롤, 선례와 같음).

### 후속 작업
- [ ] 없음. 로드맵 3의 5개가 모두 끝났으므로 다음 범위는 사용자와 정한다(보류 후보: 옵셔널 체이닝과 `??`, 이벤트 핸들러 등록 방식, Math, MutationObserver).

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 예제 3을 "같은 글자, 다른 위치"와 "다른 함수 객체, 같은 위치"로 짰다 — 처음 안은 반복문 안의 재평가만 보여 "소스 글자가 같으면 같은 배열" 모델을 배제하지 못했다. 반복문 밖에 글자가 같은 템플릿(8번 줄)을 두고, `makeTagger`가 매번 새 함수(`f1 !== f2`)를 만들어도 안쪽 `` keep`y` ``가 같은 배열임(18번 줄)을 보여 기준이 위치(Parse Node)임을 가른다. 버린 대안: 반복문만 쓰는 예제(틀린 모델과 출력이 같음).
- [Claude 판단] 퀴즈 오답을 틀린 모델 6종을 실제로 실행한 출력으로 고정했다(concept.test model1~model6) — 오답 문구가 "그럴듯한 오개념"의 실제 결과와 일치하고 정답과 다름을 테스트가 보장한다. 버린 대안: 손으로 쓴 오답(틀린 모델의 실제 출력과 어긋날 위험).
- [Claude 판단] 판 이력은 "ES2015~ES2017판 명세 본문은 raw 문자열로 비교, ES2018판부터 Parse Node"로만 쓰고 당시 엔진 동작은 쓰지 않았다 — 각 판의 GetTemplateObject 원문으로 확인한 것은 명세 규칙뿐이고, 사용자가 든 Firefox 이력은 직접 확인하지 못했다.
- [Claude 판단] Opus 교차 검토의 Medium 4건을 High로 올려 고쳤다 — 이 프로젝트에서는 결과가 맞아도 명세와 다른 설명(예: TemplateStrings가 배열을 만든다, 클로저가 f1·f2를 다르게 만든다)은 오개념 위험이라 심각도가 높다.
- [무검토 승인] 제목·summary·order 292·예제 6개 구성 — 계획에 제시했고 사용자가 "승인, 구현 시작"으로 승인했다(시각화와 잘못된 이스케이프 절은 사용자가 직접 고름).
- 줄바꿈 함정과 String.raw 문장 — 사용자 검토 지적에 따라 실행으로 확인해 고쳤다: 끝의 MemberExpression·CallExpression만 태그가 되고(`1 + keep⏎`x`` → `"1x"`), `return` 뒤는 ASI, String.raw는 `length`를 LengthOfArrayLike로 읽고 인덱스 값만 ToString한다.

#### 배경지식
- GetTemplateObject: realm의 [[TemplateMap]]에서 [[Site]]가 같은 Parse Node인 항목을 찾아 있으면 그 객체를, 없으면 새 템플릿 객체(인덱스는 쓰기 불가·열거 가능, `raw`는 열거 불가, 둘 다 동결)를 만든다. 같은 소스라도 eval·Function 생성자로 다시 파싱하면 다른 Parse Node라 다른 객체다.
- 태그드 템플릿의 ArgumentListEvaluation은 « 템플릿 객체 » 뒤에 `${}` 값을 GetValue만 해서 넘긴다(ToString 없음). 태그가 없는 템플릿의 Evaluation은 ToString해 이어 붙인다.
- TV·TRV: 잘못된 이스케이프(NotEscapeSequence)의 TV는 undefined라 그 조각의 cooked만 undefined가 되고 raw는 남는다. 태그가 없는 템플릿에서는 조기 오류(SyntaxError)다.
- 문법에 `[no LineTerminator here]`가 없어 태그와 템플릿 사이 줄바꿈이 허용되고, 그래서 백틱으로 시작하는 줄 앞에는 ASI가 일어나지 않는다.

#### 확인 질문
1. 예제 3에서 반복문 안의 `` keep`x${i}` ``만으로는 왜 "같은 위치면 같은 배열"을 증명하지 못하는가?
   <details><summary>답</summary>"소스 글자가 같으면 같은 배열" 모델도 반복문 안에서는 같은 배열을 내놓아 출력이 같다. 글자가 같은 다른 위치(8번 줄, `false`)와 다른 함수 객체 속 같은 위치(18번 줄, `true`)를 함께 보여야 위치 기준만 남는다(content.mdx 예제 3 설명, concept.test model2·model3).</details>
2. 판 이력 문장에서 ES2017판까지 "raw 문자열로 비교"라고만 쓰고 "엔진이 그렇게 동작했다"고 쓰지 않은 이유는?
   <details><summary>답</summary>확인한 근거가 각 판의 명세 원문뿐이고 당시 엔진 동작은 실행으로 확인하지 못했다. 정확성 원칙상 확인하지 않은 동작은 사실처럼 쓰지 않는다(변경 이력 사용자 검토 항목, AGENTS.md 정확성 원칙).</details>
3. `t`\unicode``는 되는데 태그 없는 `` `\unicode` ``는 왜 SyntaxError인가? 이 오류는 언제 나는가?
   <details><summary>답</summary>`\u` 뒤에 16진수도 `{`도 없어 NotEscapeSequence이고 TV가 undefined다. 태그드 템플릿은 cooked를 undefined로 두고 raw를 남기지만, 태그 없는 템플릿은 조기 오류 규칙이 있어 파싱 단계에서 오류라 앞의 출력도 나오지 않는다(예제 6, concept.test의 SyntaxError 탐침).</details>
4. `var a = 1 + keep` 다음 줄이 `` `x` ``로 시작하면 무엇이 태그가 되며, `return` 다음 줄이면 왜 다른가?
   <details><summary>답</summary>ASI가 일어나지 않아 끝의 MemberExpression인 `keep`만 태그가 되어 `1 + keep`x``로 묶인다(`"1x"`). `return`은 명세가 바로 뒤 줄바꿈을 허용하지 않는 자리라 세미콜론이 삽입되어 `undefined`를 돌려준다(content.mdx 첫 h3 끝 문단, concept.test 줄바꿈 탐침).</details>
5. `String.raw({ raw: ['x', 'y'] }, 1, 2)`가 `x1y`인 이유는? 첫 인수의 인덱스 0을 바꾸면 결과가 바뀌는가?
   <details><summary>답</summary>`raw`의 `length`(LengthOfArrayLike) 2로 조각 수를 정해 끼울 자리가 하나라 `2`는 쓰이지 않는다. 첫 인수에서는 `raw`만 읽고 인덱스(cooked)는 읽지 않으므로 바뀌지 않는다(content.mdx String.raw 문단, 예제 5, concept.test 읽는 순서 탐침).</details>
