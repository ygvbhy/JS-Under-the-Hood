# 후속 정리(strict 링크·명세 문구) 구현 계획

- 상태: 완료
- 작성일: 2026-11-16
- 기준: `main` @ `468f1a9`

## 0. 요약
- 목적: data-types·strict-mode·match-all 작업이 남긴 후속 항목(명세 인용 판 불일치, 실행 조건 문구, 명세 용어, strict mode 링크, 규칙 문장, 표현 다듬기)을 한 번에 정리한다.
- 범위: 기존 개념 15개 페이지(미확정 2 기본안이면 17개)의 본문·메타 문구와 `AGENTS.md`·`docs/content-guide.md` 한 문장씩. 예제 파일, 예제 출력, 공통 코드, 테스트 로직은 바꾸지 않는다.
- 위험: 링크나 고친 문장이 명세·대상 페이지 내용과 어긋나는 것. 첫 문단·제목 문구에 묶인 빌드 테스트·e2e가 깨지는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → 모두 반영, HIGH 1건은 미확정 3으로 올림)
- 미확정: 없음 (3건 모두 2026-11-16 사용자 승인으로 기본안 확정)

## 1. 요구사항
- 요구사항 (사용자 "1번 후속 정리부터 하자", 2026-11-16)
  - R1. spread-destructuring: undefined·null 인용을 현재 초안 6.1.1·6.1.2 문장으로 바꾸고 링크를 현재 id로 고친다(사용자 결정).
  - R2. variable-declaration: "예제의 출력도 이 조건으로 실행해 확인했습니다"(실제는 Node `vm`)와 느슨한 클래식 스크립트 정의를 고친다.
  - R3. strict-mode 후속
    - R3a. '모듈·클래스는 항상 strict'를 말하거나 sloppy mode 용어를 풀이하는 12개 페이지의 본문에 strict mode 페이지 링크를 1개씩 걸고 `related`에 slug를 더한다(사용자 결정: 12개 페이지만).
    - R3b. property-attributes의 "non-strict mode code"를 명세 용어 "non-strict code"로 고친다.
    - R3c. `AGENTS.md` 예제 규칙의 "이 지시어 없이 strict/sloppy에 따라 결과가 달라지는 예제는 쓰지 않는다"를 실제 관행에 맞게 고친다(`docs/content-guide.md`의 같은 문장 포함).
  - R4. 선택 항목
    - R4a. regexp-lastindex: 빈 매치 문장 한정, 흔한 오해 3의 "복제해 쓰므로".
    - R4b. match-all: lastIndex를 복제본에 '옮긴다'는 동사, 예제 7 제목·목표의 '닫히지 않는다'.
- 유지해야 하는 기존 동작
  - 예제 파일과 `expectedOutput`, 시뮬레이터 단계 수와 상태, 퀴즈 정답, 학습 순서(order).
  - 수정한 기존 페이지의 `reviewedAt`은 그대로 둔다(역방향 링크 정리 때의 선례).
- 제외 범위
  - strict를 언급하는 나머지 25개 페이지의 링크.
  - simplifications 문장 안의 '모듈은 항상 strict mode' 서술(사실 서술이고 '별도 개념' 문구가 아니다).
  - arguments 객체 개념이 생긴 뒤의 strict-mode 변화 표 5행 재검토.
  - data-types 후속 3번째 줄(typeof-operator·spread-destructuring 역방향 링크, expressions-statements 단순화의 템플릿 리터럴 언급, Low 지적).

## 2. 사실과 추정
### 사실 (코드·원문에서 확인)
- R1
  - `app/concepts/spread-destructuring/content.mdx:47`은 "명세의 용어 정의"라 하고 `undefined`를 "변수에 값이 할당되지 않았을 때 쓰이는 원시 값", `null`을 "객체 값이 의도적으로 없음을 나타내는 원시 값"으로 "정의합니다"라고 쓴다. 이는 ES2025판 4.4.13 "primitive value used when a variable has not been assigned a value", 4.4.15 "primitive value that represents the intentional absence of any object value"의 번역이다(`tc39.es/ecma262/2025/` 사본에서 확인).
  - `meta.ts:174-180`의 참고 링크는 `https://tc39.es/ecma262/#sec-undefined-value`, `#sec-null-value`이고 라벨은 'undefined value', 'null value'다. 현재 초안에서 이 id는 6.1.1·6.1.2(`sec-ecmascript-language-types-undefined-type`, `sec-ecmascript-language-types-null-type`)의 `oldids`이고 옛 앵커도 남아 있어, 링크는 깨지지 않고 6.1.1·6.1.2로 이동한다. 문제는 인용 문장(ES2025 4.4)과 링크가 도착하는 절(현재 초안 6.1)·라벨이 어긋나는 것이다.
  - 현재 초안(ES2027) 6.1.1: "The Undefined type has exactly one value, called undefined. Any variable that has not been assigned a value has the value undefined." 6.1.2: "The Null type has exactly one value, called null, representing the intentional absence of any object value." ("representing…" 구절은 ES2025판 6.1.2에는 없고 현재 초안에만 있다.)
  - data-types는 같은 두 절을 라벨 'ECMAScript 명세 — The Undefined Type', 'ECMAScript 명세 — The Null Type'로 링크한다(`app/concepts/data-types/meta.ts:95-100`).
- R2
  - `app/concepts/variable-declaration/content.mdx:3`: "이 페이지는 클래식 스크립트, 즉 `type="module"`이 아닌 `<script>`로 실행되는 코드의 맨 바깥에서 `var`로 선언한 변수를 기준으로 설명합니다. 예제의 출력도 이 조건으로 실행해 확인했습니다. …". 이 줄은 본문의 첫 문단이다.
  - 이 페이지의 예제 3개는 모두 `runtime: 'ecmascript'`(Node `vm`)다(`meta.ts`).
  - HTML 표준("prepare the script element"): type이 빈 문자열이거나 type·language가 모두 없으면 type 문자열은 "text/javascript"이고, 이 문자열이 JavaScript MIME type essence match이면 classic이다. "module"이면 모듈, "importmap" 등은 다른 종류, 그 밖의 값은 실행하지 않는 데이터 블록이다. 그래서 "`type="module"`이 아닌 `<script>`"는 import map과 데이터 블록까지 포함해 틀리다.
  - strict-mode 페이지가 같은 조건을 이미 정확히 쓴다(`app/concepts/strict-mode/content.mdx:5`): "이 페이지의 예제는 Node의 `vm` 모듈에서 모듈이 아닌 스크립트(Script)로 실행한 결과입니다. 브라우저라면 `type` 속성이 없거나 빈 문자열이거나 JavaScript MIME 타입인 `<script>`로 실행되는 클래식 스크립트에 해당합니다."
  - 빌드 테스트는 본문 첫 문단의 첫 줄이 빌드 HTML 텍스트에 들어 있는지 본다(`tests/build/build-output.test.ts:31-44,63` `firstProseLine`). 링크와 `` ` `` `*` `_`는 지우고 비교하므로 첫 문단의 링크·강조 때문에 깨지지는 않는다.
  - 같은 종류의 문구가 다른 페이지에도 있다(Architect·Critic 지적, 메인이 확인).
    - 느슨한 정의 "`type="module"`이 아닌 `<script>`": `app/concepts/hoisting/content.mdx:6`, `app/concepts/expressions-statements/content.mdx:3`
    - "예제의 출력도 클래식 스크립트로 실행해 확인했습니다": `app/concepts/block-scope/content.mdx:38`, `app/concepts/hoisting/content.mdx:6`, `app/concepts/scope-chain/content.mdx:26`. 세 페이지의 예제는 모두 `runtime: 'ecmascript'`다.
    - block-scope `:45`의 표 머리는 "결과(클래식 스크립트)"다.
- R3a
  - strict-mode 페이지는 sloppy mode 용어(`content.mdx:11`), '모듈 코드는 항상 strict'(`:31`), '클래스의 모든 부분은 strict'(`:32`)를 다룬다.
  - 12개 페이지 모두 현재 본문 링크·`related`에 strict-mode가 없다(variable-declaration만 이미 있음).
  - 각 페이지에서 "strict mode"가 처음 나오는 본문 줄(도입 첫 문단·제목 제외):
    - block-scope `content.mdx:26` "이 TypeError는 strict mode가 아니어도 납니다."
    - new-operator `:37` "호출된 함수의 코드가 strict mode인지에 따라 갈립니다."
    - es-modules `:18` "모듈 코드는 `'use strict';` 지시어가 없어도 항상 strict mode입니다."
    - this-binding `:26` "- strict mode 함수는 thisArg를 그대로 `this`로 받습니다."
    - property-attributes `:34` "이때 그 코드가 strict mode이면 TypeError를 던지고"
    - class-basics `:11` "내부 슬롯, 프로퍼티 어트리뷰트, strict mode 여부가 다릅니다." (`:5`는 도입 첫 문단이라 제외)
    - class-inheritance `:60` "클래스 본문은 `'use strict'`가 없어도 strict mode입니다."
    - hoisting `:46` "코드는 항상 strict mode로 실행됩니다. 그래서 아래 예제 3과 예제 5는 모듈에서 SyntaxError입니다." — 이 인과는 틀리다(미확정 3).
    - primitive-methods `:29` "strict mode에서는 TypeError를 던집니다."
    - prototype-chain `:56` "strict mode에서는 TypeError입니다."
    - for-let `:36` "strict mode가 아닌 코드(흔히 sloppy mode라 부르며, …)"
    - global-object `:84` "strict mode가 아닌 코드(흔히 sloppy mode라 부르며, …)" (`:78`은 "strict가 아닌 `eval` 코드"로 "strict mode"라는 말이 아니다)
  - hoisting 예제 3(`same-name.js`)·예제 5(`duplicate-function.js`)는 앞에 `'use strict';`를 붙여 `vm.Script`로 파싱하면 통과하고, `node --input-type=module`로 실행하면 `SyntaxError: Identifier 'item'/'pick' has already been declared`다(메인이 실행). 원인은 strict mode가 아니다. 명세는 "At the top level of a Module, function declarations are treated like lexical declarations rather than like var declarations."라고 적고, ModuleItemList의 LexicallyDeclaredNames에 중복이 있거나 VarDeclaredNames와 겹치면 Syntax Error로 정한다(현재 초안 사본에서 확인).
  - `related` 검사는 slug 존재와 자기 자신 여부뿐이다(`tests/content-integrity.test.ts:104-108`). `RelatedConcepts.tsx`는 `slugs.map`으로 전부 그려 표시 상한이 없다.
  - `.prettierrc`의 `printWidth`는 100이다. `related`가 한 줄 배열인 class-inheritance(`meta.ts:33`, 100자)·for-let(`:33`, 99자)·global-object(`:36`, 97자)·hoisting(`:32`, 90자)은 `, 'strict-mode'`(15자)를 더하면 100자를 넘는다.
- R3b
  - `app/concepts/property-attributes/content.mdx:34`: "(명세에는 이 말이 없고 non-strict mode code라고 씁니다)". 현재 초안에 "non-strict mode code"는 0번, "non-strict code"는 15번 나온다(ES2025판도 0번 / 12번). for-let·global-object·new-operator·strict-mode는 이미 "non-strict code"라고 쓴다.
- R3c
  - `AGENTS.md:69`: "기본은 sloppy mode이고, strict mode 동작을 보이려면 파일 첫 줄에 `'use strict';`를 쓴다. 이 지시어 없이 strict/sloppy에 따라 결과가 달라지는 예제는 쓰지 않는다."
  - `docs/content-guide.md:45`: "…`import`/`export`, 타이머·DOM 같은 호스트 API, 지시어 없이 strict/sloppy에 따라 결과가 달라지는 코드는 쓰지 않습니다."
  - 실제로는 지시어 없이 sloppy 결과에 기대고 전제를 밝힌 예제가 여럿 있다: block-scope 예제 4·5(`meta.ts:92`), this-binding 예제 2·4·5(`meta.ts:119`), property-attributes 예제 2·7·8(`content.mdx:38`), class-basics 예제 4(`meta.ts:106`), strict-mode. 사용자는 strict-mode 계획에서 "선례대로 전제를 밝히고 쓴다"를 승인했다(`.claude/plans/strict-mode.md:308`).
  - 함수 본문 첫 줄 지시어도 이미 쓴다(`app/concepts/this-binding/content.mdx:30`).
- R4a
  - `app/concepts/regexp-lastindex/content.mdx:54`: "`/x*/`처럼 빈 문자열에도 매치할 수 있는 정규 표현식은 `exec` 반복에서 조심해야 합니다. 빈 문자열에 매치하면 매치 끝이 시작 위치와 같으므로, 성공 규칙대로 `lastIndex`에 쓴 값이 원래 값 그대로입니다. 다음 `exec`도 같은 위치에서 같은 빈 문자열에 매치하므로, …반복은 끝나지 않습니다." 둘째 문장은 검색을 시작한 위치에서 곧바로 빈 매치가 날 때만 참이다. 더 뒤에서 빈 매치가 나면 `lastIndex`가 그 위치로 바뀐다(match-all의 `concept.test.ts:227`이 `(?=b)`로 확인, `/(?=b)/g.exec('aab')`는 index 2·`lastIndex` 2). match-all은 이 규칙을 `content.mdx:39-41`의 '빈 매치' 절에서 서술한다. match-all 예제 5의 출력에는 복제본의 `lastIndex`가 나오지 않으므로 예제 5는 이 규칙의 직접 증거가 아니다. 예제 7 파일의 정규식은 `/x*/g`다(`regexp-lastindex/examples/empty-match.js:1`).
  - `:263`: "`matchAll`은 정규 표현식을 복제해 쓰므로 원래 객체의 `lastIndex`는 바뀌지 않지만, 복제본은 원래 `lastIndex` 값을 이어받아 그 위치부터 찾습니다."
- R4b
  - lastIndex를 복제본에 '옮긴다'고 쓴 곳: match-all `meta.ts:25`(goals), `meta.ts:90`(단순화 "lastIndex만 따로 Set으로 옮긴다는"), `content.mdx:194`(예제 1 설명), `content.mdx:230`(흔한 오해), `scenarios.ts:116`(단계 설명). 본문 동작 원리 13행은 이미 '읽어 … 대입'으로 쓴다(match-all 계획 212행 기록).
  - 같은 페이지에서 '옮긴다'는 `exec`·`next`가 lastIndex 값을 앞으로 보내는 뜻으로도 쓴다(`content.mdx:6,41,210,214`, `scenarios.ts:130,336,364`). 이쪽은 바꾸지 않는다.
  - '닫히지 않는다': `content.mdx:172` 제목 "예제 7: break해도 이터레이터는 닫히지 않는다", `content.mdx:218` "이터레이터는 닫히지 않았으므로", `meta.ts:27` goals "break가 이터레이터를 닫지 않는 것". 실제로는 IteratorClose가 불리지만 `return` 메서드가 없어 아무 일도 하지 않는다(같은 218행이 설명).
  - `tests/`와 match-all의 `.ts` 테스트에 '닫히지'·"예제 7: break" 문자열을 고정한 곳은 grep으로 찾지 못했다.

### 추정
- `scenarios.ts:116`의 단계 설명 문장을 고정해 비교하는 테스트는 없다고 본다 — 근거: tests·개념 폴더 grep에서 해당 문구가 나오지 않음. 확인 시점: 작업 순서 5(문구 교체 뒤 `npm test`와 e2e).
- 12개 페이지 중 링크를 걸 줄이 PredictQuiz prop이나 표 안이 아니다 — 근거: 위 인용 문장이 모두 산문·목록. 확인 시점: 작업 순서 3의 근거 표.

## 3. 구현 전략
- 문구 교체는 '행별 근거 표(path:line, 바꾸기 전·후) → 메인 확인 → 교체 → 메인이 word diff를 직접 읽음'으로 한다. 역방향 링크 정리 때 효과가 있었던 방식이다. 서브에이전트가 고른 위치를 그대로 믿지 않는다.
- 링크는 페이지마다 "strict mode"가 처음 나오는 본문 산문 줄에 1개만 건다(`[strict mode](/concepts/strict-mode)`). 독자가 그 말을 처음 만나는 곳에 링크가 있어야 하기 때문이다.
  - 도입 첫 문단에는 걸지 않는다. 도입 문단은 페이지가 다룰 항목을 나열하는 자리이고, 링크는 그 말을 설명에 쓰는 첫 문장에 둔다(테스트 제약은 아니다). 해당하는 곳은 class-basics `:5` 하나다.
  - 제목(`###`), 코드, 표, `PredictQuiz`·`Callout` prop 문자열에는 걸지 않는다.
  - 버린 대안: '모듈은 항상 strict' 문장마다 링크. 한 페이지에 같은 링크가 여러 번 생기고, 그 문장이 페이지의 첫 언급이 아닌 경우가 많다.
- 링크를 걸 때 그 문장의 사실성을 다시 본다(링크가 부정확한 원문을 보증하는 함정). 틀린 문장을 발견하면 고치지 않고 보고한다.
- R1은 인용만 바꾸고 문단의 논리(값이 주어지지 않은 자리는 `undefined`)는 유지한다. "용어 정의"·"정의합니다"·"원시 값"은 현재 초안 문장에 없으므로 뺀다. 인용은 번역문이며 직접 인용 부호 안의 뜻이 원문과 맞아야 한다.
- R2는 strict-mode 페이지의 검증된 문장 구조를 따른다. 새 정의를 지어내지 않는다.
- R3c는 금지 문장을 '전제를 밝힌다'는 요구로 바꾼다. 문구는 미확정 1의 기본안.
- R4b의 '닫히지 않는다'는 제목·목표를 관찰 가능한 결과('남은 매치를 이어서 꺼낼 수 있다')로 바꾼다. 버린 대안: 그대로 둠(틀린 말은 아니지만 "IteratorClose가 불리지 않는다"로 읽힐 수 있다).

## 4. 변경 파일
- 수정
  - `app/concepts/spread-destructuring/content.mdx`, `meta.ts` — R1
  - `app/concepts/variable-declaration/content.mdx` — R2
  - `app/concepts/{block-scope,new-operator,es-modules,this-binding,property-attributes,class-basics,class-inheritance,hoisting,primitive-methods,prototype-chain,for-let,global-object}/content.mdx`, `meta.ts` — R3a(링크 1개, related 1개)
  - `app/concepts/property-attributes/content.mdx` — R3b
  - `AGENTS.md`, `docs/content-guide.md` — R3c
  - `app/concepts/regexp-lastindex/content.mdx` — R4a
  - `app/concepts/match-all/content.mdx`, `meta.ts`, `scenarios.ts` — R4b
  - (미확정 2 기본안이면) `app/concepts/block-scope/content.mdx:38`, `hoisting/content.mdx:6`, `scope-chain/content.mdx:26`, `expressions-statements/content.mdx:3`
  - (미확정 3 기본안이면) `app/concepts/hoisting/content.mdx:46`
  - `.claude/plans/strict-mode.md`, `data-types.md`, `match-all.md`의 '후속 작업' 체크 표시 — 마무리 단계(finalize-work)에서
- 추가: 없음
- 변경하지 않음: 예제 파일, 테스트 파일, 공통 코드, strict-mode 페이지

## 5. 위험 요소
- 링크 문법이 MDX에서 깨지거나 목록·인라인 코드와 붙어 잘못 렌더링 → `npm run test:build`(MDX 컴파일)와 빌드 HTML의 `href="/concepts/strict-mode"` 개수 확인(작업 순서 3 완료 조건).
- 첫 문단을 고친 페이지(variable-declaration, 미확정 2 기본안이면 hoisting·expressions-statements)에서 `firstProseLine` 불일치 → `npm run test:build`로 확인(작업 순서 2).
- 미확정 2에서 "브라우저의 클래식 스크립트에 해당한다"고 쓰는데 Node `vm`과 브라우저의 결과가 다른 예제가 있을 수 있음(이 실행기는 전역 `var` 프로퍼티의 configurable을 명세와 다르게 보고한 적이 있다, block-scope 예제 5는 `delete`를 쓴다) → block-scope 예제 4·5·6을 Chromium 클래식 스크립트로 한 번 실행해 `expectedOutput`과 같은지 확인하고, 다르면 그 문장을 쓰지 않고 보고한다(작업 순서 2).
- `related` 한 줄 배열이 100자를 넘어 `format:check` 실패 → 4개 `meta.ts`는 `npx prettier --write`로 펼친다(작업 순서 3).
- mdx는 `proseWrap` 기본값(preserve)이라 문장 교체로 줄이 다시 감기지 않는다 → `npm run format:check`로 확인.
- R1 번역이 원문에 없는 뜻을 더함(예: "원시 값") → 원문 대조(작업 순서 1 완료 조건, 리뷰).
- R4a 한정 문장이 새로운 틀린 일반화를 만듦(예: "빈 매치면 lastIndex가 항상 바뀐다") → 두 경우(시작 위치에서 매치 / 더 뒤에서 매치)를 나눠 쓰고, 뒤쪽은 match-all 링크로 넘긴다.
- match-all `scenarios.ts` 문구 변경으로 시뮬레이터 테스트·e2e가 깨짐 → `npm test`와 match-all e2e(작업 순서 5).
- e2e: 기존 페이지 15개를 건드리므로 범위가 애매하다 → 전체 `npm run e2e`를 실행한다.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 문자열 검사
  - `grep -rn "sec-undefined-value\|sec-null-value" app/` → 0건
  - `grep -rn "non-strict mode code" app/` → 0건
  - `grep -c "/concepts/strict-mode" app/concepts/<12개>/content.mdx` → 각 1
  - `grep -n "'strict-mode'" app/concepts/<12개>/meta.ts` → 각 1(related 안)
  - `grep -n "type=\"module\"이 아닌\|이 조건으로 실행해" app/concepts/variable-declaration/content.mdx` → 0건
  - `grep -n "복제해 쓰므로" app/concepts/regexp-lastindex/content.mdx` → 0건
- 브라우저(빌드 결과 `npm run start`)
  - `/concepts/es-modules`에서 "strict mode" 링크를 눌러 `/concepts/strict-mode`로 이동하는지 확인.
  - `/concepts/class-basics` 하단 관련 개념에 strict mode가 보이는지 확인.
  - `/concepts/match-all`의 시뮬레이터 첫 시나리오 2단계 설명에 바뀐 문장이 보이고 다음 단계로 진행되는지 확인.

## 7. 미확정 사항
- [미확정 1] R3c 규칙 문장 문구(프로젝트 규칙이므로 사용자 확인)
  - 기본안 `AGENTS.md:69`: "기본은 sloppy mode이고, strict mode 동작을 보이려면 파일 첫 줄(함수 하나만 strict로 만들 때는 그 함수 본문 첫 줄)에 `'use strict';`를 쓴다. 지시어 없는 예제의 결과가 sloppy mode에 기대면(파일 첫 줄에 `'use strict';`를 붙였을 때 출력이 달라지거나 오류가 나면) 그 예제가 sloppy mode라는 전제와 strict mode·ES 모듈에서 달라지는 점을 본문이나 `meta.simplifications`에 밝힌다."
  - 판정 기준을 '모듈로 실행하면 달라지는가'로 쓰지 않는다. 모듈은 strict 말고도 최상위 선언·`this`가 달라 기준이 넓어진다(Critic 지적).
  - 기본안 `docs/content-guide.md:45`: 같은 내용을 '-합니다'체로 쓰고, "`import`/`export`, 타이머·DOM 같은 호스트 API는 쓰지 않습니다"는 그대로 둔다.
- [미확정 2] R2와 같은 종류의 문구가 4개 페이지에 더 있다(2절 R2 사실). 기록된 후속 항목은 variable-declaration뿐이다.
  - 기본안: 이번에 함께 고친다. hoisting과 block-scope는 R3a로 이미 건드리고, 한 곳만 고치면 같은 문구가 다른 페이지에 남는다.
    - hoisting `:6`, expressions-statements `:3`: "클래식 스크립트, 즉 `type="module"`이 아닌 `<script>`로 실행되는 코드" → "클래식 스크립트"로 줄이고, 브라우저 조건은 R2와 같은 문장("브라우저라면 `type` 속성이 없거나 빈 문자열이거나 JavaScript MIME 타입인 `<script>`로 실행되는 클래식 스크립트에 해당합니다")으로 쓴다.
    - block-scope `:38`, hoisting `:6`, scope-chain `:26`: "예제의 출력도 클래식 스크립트로 실행해 확인했습니다" → "예제의 출력은 Node의 `vm` 모듈에서 모듈이 아닌 스크립트(Script)로 실행한 결과이고, 브라우저의 클래식 스크립트에 해당합니다". 앞 절("이 페이지는 … 기준으로 하며")은 문장을 끊어 유지한다. block-scope `:45`의 표 머리 "결과(클래식 스크립트)"는 이 연결 문장이 있으므로 그대로 둔다.
  - 대안: 4개 페이지는 범위 밖으로 두고 추가 개선 후보로 남긴다.
- [미확정 3] hoisting `:46`은 "코드는 항상 strict mode로 실행됩니다. 그래서 아래 예제 3과 예제 5는 모듈에서 SyntaxError입니다."라고 쓰는데, 이 SyntaxError의 원인은 strict mode가 아니다(2절 R3a 사실). 이 문장에 링크를 걸면 틀린 인과를 strict mode 페이지가 보증하는 꼴이 된다. 이 페이지에서 "strict mode"는 이 줄에만 나온다(Critic HIGH).
  - 기본안: 문장을 고치고 링크를 건다. "…전역 객체의 프로퍼티가 되지 않고, 코드는 항상 [strict mode](/concepts/strict-mode)로 실행됩니다. 또 모듈의 맨 바깥에 쓴 함수 선언은 `var`가 아니라 `let`·`const` 같은 선언으로 다뤄져서 같은 이름을 두 번 선언할 수 없습니다. 그래서 아래 예제 3과 예제 5는 모듈에서 SyntaxError입니다."
  - 대안 A: 문장은 그대로 두고 hoisting은 `related`만 더한다(틀린 인과가 남는다).
  - 대안 B: hoisting을 R3a에서 뺀다.

## 8. 작업 순서
### 1. spread-destructuring 인용 판 맞추기 (R1)
- 대상: `app/concepts/spread-destructuring/content.mdx:47`, `meta.ts:174-180`
- 현재: ES2025 4.4 정의 번역을 "용어 정의"로 인용하고 옛 id로 링크한다.
- 변경
  - 본문 둘째·셋째 문장을 다음 뜻으로 바꾼다: "다만 명세가 Undefined 타입과 Null 타입을 설명하는 문장이 이 규칙을 이해하는 실마리가 됩니다. 명세는 "값이 할당되지 않은 변수는 `undefined` 값을 가진다"고 적고, `null`은 "객체 값이 의도적으로 없음"을 나타낸다고 적습니다." 나머지 문장은 그대로 둔다.
  - `meta.ts` 참고 링크 2개를 data-types와 같은 라벨·URL로 바꾼다('ECMAScript 명세 — The Undefined Type' / `#sec-ecmascript-language-types-undefined-type`, 'ECMAScript 명세 — The Null Type' / `#sec-ecmascript-language-types-null-type`).
- 이유: 인용 문장과 링크가 가리키는 판이 다르다.
- 주의사항: 같은 페이지의 다른 곳(simplifications, 퀴즈 해설)이 "용어 정의"·"원시 값" 인용에 기대는지 grep으로 확인하고, 있으면 같은 방식으로 맞춘다. `reviewedAt`은 바꾸지 않는다.
- 완료 조건: `grep -rn "sec-undefined-value\|sec-null-value\|용어 정의" app/concepts/spread-destructuring/` 0건. 인용 두 문장이 현재 초안 6.1.1·6.1.2 원문과 뜻이 같다(메인이 원문과 대조). `npm test` 통과.

### 2. 실행 조건 문구 (R2, 미확정 2 기본안이면 4개 페이지 포함)
- 대상: `app/concepts/variable-declaration/content.mdx:3` (+ 미확정 2의 `block-scope:38`, `hoisting:6`, `scope-chain:26`, `expressions-statements:3`)
- 현재: 클래식 스크립트를 "`type="module"`이 아닌 `<script>`"로 정의하고, 예제를 그 조건으로 실행했다고 쓴다.
- 변경: 첫 두 문장을 다음으로 바꾼다. "이 페이지는 클래식 스크립트의 맨 바깥에서 `var`로 선언한 변수를 기준으로 설명합니다. 예제의 출력은 Node의 `vm` 모듈에서 모듈이 아닌 스크립트(Script)로 실행한 결과입니다. 브라우저라면 `type` 속성이 없거나 빈 문자열이거나 JavaScript MIME 타입인 `<script>`로 실행되는 클래식 스크립트에 해당합니다." 셋째 문장("변수를 선언만 하고 …")은 그대로 둔다.
- 이유: 예제는 Node `vm`에서 실행되고, 원래 정의는 import map·데이터 블록까지 포함한다.
- 주의사항: `meta.ts:60`의 simplifications는 "클래식 스크립트의 맨 바깥 코드를 기준"이라고만 써서 바꾸지 않는다. `type` 조건 문장은 strict-mode `:5`의 문장을 그대로 쓴다(폐기된 `language` 속성과 `nomodule`은 그 페이지와 같이 다루지 않는다). 미확정 2의 문장은 7절 기본안대로 쓰고, 문장을 끊을 때 뒤 문장의 지시어·접속어가 가리키는 대상이 바뀌지 않는지 읽는다. block-scope 예제 4·5·6은 Chromium 클래식 스크립트로 한 번 실행해 `expectedOutput`과 같은지 확인한다(브라우저 실행기는 저장소 루트에 임시 `.mts`를 두고 실행한 뒤 지운다). 다르면 "브라우저의 클래식 스크립트에 해당합니다"를 그 페이지에 쓰지 않고 보고한다.
- 완료 조건: `grep -rn 'type="module"이 아닌\|이 조건으로 실행해\|클래식 스크립트로 실행해 확인' app/concepts/*/content.mdx` 0건(미확정 2가 대안이면 variable-declaration만 0건). block-scope 예제 4·5·6의 Chromium 출력이 `expectedOutput`과 같다. `npm run test:build` 통과(firstProseLine).

### 3. strict mode 링크와 related (R3a)
- 대상: 12개 페이지의 `content.mdx`, `meta.ts`
- 현재: strict mode를 설명 없이 언급하고 링크가 없다.
- 변경
  - 먼저 근거 표를 만든다(페이지, 줄 번호, 바꾸기 전 문장, 바꾼 문장). 줄은 2절 사실의 목록을 기준으로 하되, 구현 시점에 "도입 첫 문단·제목·코드·표·prop이 아닌 첫 'strict mode'"인지 다시 확인한다.
  - 그 줄의 첫 "strict mode"를 `[strict mode](/concepts/strict-mode)`로 바꾼다.
  - 각 `meta.ts`의 `related` 배열 끝에 `'strict-mode'`를 더한다. class-inheritance·for-let·global-object·hoisting의 `meta.ts`는 100자를 넘으므로 `npx prettier --write`로 여러 줄 배열로 펼친다.
  - hoisting `:46`은 미확정 3에서 확정된 방식으로 처리한다(기본안: 문장을 고치고 링크).
- 이유: 페이지가 있는 개념은 본문에서 링크로 가리키고 `related`에 slug를 더한다(AGENTS.md 규칙).
- 주의사항: 한 페이지에 링크는 1개. simplifications와 퀴즈 해설은 바꾸지 않는다. 링크를 건 문장이 strict-mode 페이지 내용과 어긋나면 고치지 말고 보고한다. `reviewedAt` 유지.
- 완료 조건: 검증 방법의 링크·related grep이 12개 모두 1. `npm test`(content-integrity)와 `npm run format:check` 통과. 빌드 뒤 12개 페이지 HTML마다 `href="/concepts/strict-mode"`가 2개 이상이다(본문 링크 + 관련 개념).

### 4. 용어와 규칙 문장 (R3b, R3c)
- 대상: `app/concepts/property-attributes/content.mdx:34`, `AGENTS.md:69`, `docs/content-guide.md:45`
- 변경: "non-strict mode code" → "non-strict code". 규칙 문장은 미확정 1에서 확정된 문구로 바꾼다.
- 이유: 명세에 없는 용어, 실제 관행과 어긋난 규칙.
- 주의사항: 작업 순서 3이 같은 34행에 링크를 건다. 두 변경이 한 줄에 함께 들어간다. `AGENTS.md`의 다른 문장은 건드리지 않는다.
- 완료 조건: `grep -rn "non-strict mode code" app/` 0건. `grep -n "결과가 달라지는 예제는 쓰지 않는다\|결과가 달라지는 코드는 쓰지 않습니다" AGENTS.md docs/content-guide.md` 0건. `npm run format:check` 통과.

### 5. regexp-lastindex·match-all 표현 (R4a, R4b)
- 대상: `app/concepts/regexp-lastindex/content.mdx:54,263`, `app/concepts/match-all/content.mdx:172,194,218,230`, `meta.ts:25,27,90`, `scenarios.ts:116`
- 변경
  - regexp-lastindex `:54` 둘째 문장: "검색을 시작한 `lastIndex` 위치에서 곧바로 빈 문자열에 매치하면 매치 끝이 그 위치와 같으므로, 성공 규칙대로 `lastIndex`에 쓴 값이 원래 값 그대로입니다." 셋째 문장("다음 `exec`도 … 끝나지 않습니다")은 그대로 두고, 그 바로 뒤에 한 문장을 더한다: "검색을 시작한 위치보다 뒤에서 빈 문자열에 매치하는 패턴이면 `lastIndex`가 그 매치 위치로 바뀌지만, 다음 `exec`가 그 위치에서 같은 빈 문자열에 다시 매치하므로 반복이 끝나지 않는 것은 같습니다([matchAll](/concepts/match-all)의 빈 매치 설명에서 다룹니다)." 첫 문장의 `/x*/` 표기는 바꾸지 않는다.
  - regexp-lastindex `:263`: "`matchAll`은 원래 정규 표현식의 패턴과 flags로 새 정규 표현식을 만들고 검색은 그 새 정규 표현식에서 하므로 원래 객체의 `lastIndex`는 바뀌지 않지만, 새 정규 표현식은 원래 `lastIndex` 값을 이어받아 그 위치부터 찾습니다."
  - match-all의 복제본 쪽 '옮긴다' 5곳을 '대입한다' 계열로 바꾼다. 예: `content.mdx:194` "`re.lastIndex`(`0`)를 복제본에 옮긴 뒤" → "`re.lastIndex` 값(`0`)을 복제본의 `lastIndex`에 대입한 뒤". `meta.ts:90`의 "다른 자기 프로퍼티는 옮기지 않습니다"와 `content.mdx:16`의 "옮겨 가지 않습니다"는 lastIndex 이동과 겹치지 않으므로 그대로 둔다.
  - match-all `content.mdx:172` 제목 → "예제 7: break한 뒤에도 남은 매치를 꺼낼 수 있다". `:218` "이터레이터는 닫히지 않았으므로" → "이터레이터의 상태는 그대로이므로". `meta.ts:27` "break가 이터레이터를 닫지 않는 것" → "break한 뒤에도 남은 매치를 이어서 꺼낼 수 있는 것".
- 이유: 일반 규칙으로 읽히는 문장, 명세 동작과 다른 어감의 동사·제목.
- 주의사항: `exec`·`next`가 lastIndex를 '옮긴다'는 문장은 바꾸지 않는다. match-all 제목 앵커를 가리키는 링크와 이 문구들을 고정한 테스트는 없다(검토에서 확인). `scenarios.ts:116`의 '옮긴 뒤'를 고정한 e2e가 있는지만 `grep -rn "옮긴 뒤" tests/`로 확인한다. 더한 문장의 "다시 매치하므로 끝나지 않는다"는 `/(?=b)/g`로 `exec`를 두 번 불러 두 번 모두 index 2인지 `node -e`로 확인한다.
- 완료 조건: 검증 방법의 "복제해 쓰므로" grep 0건. `grep -n "복제본에 옮\|새 정규식에 옮\|Set으로 옮" app/concepts/match-all/` 0건. `npm test` 통과(시뮬레이터 불변식·컴포넌트 테스트). 전체 검증 순서 통과.

## 9. 추가 개선 후보
- this-binding `content.mdx:40`의 "예제 2, 4는 클래식 스크립트로 실행한 결과입니다", primitive-methods `content.mdx:173`의 "클래식 스크립트로 실행하므로 sloppy mode입니다"도 Node `vm` 실행을 클래식 스크립트라고 부르는 같은 계열이다(Architect 발견).
- strict를 언급하는 나머지 25개 페이지의 링크(사용자 결정으로 이번 범위 밖).
- data-types 후속: typeof-operator·spread-destructuring 본문의 data-types 역방향 링크, expressions-statements 단순화의 템플릿 리터럴 언급.
- regexp-lastindex `:192`(퀴즈 해설)·`:241`의 "매치 끝이 시작 위치와 같아"는 예제 7에 한정된 서술이라 그대로 둔다. '시작 위치'가 매치 시작인지 검색 시작인지 모호하다는 점만 남긴다.

## 변경 이력
- 2026-11-16 (Consensus 검토)
  - hoisting 46행의 틀린 인과를 미확정 3으로 올리고, 실행·명세 근거를 사실에 더했다(Critic HIGH, 메인이 실행으로 확인).
  - 같은 종류의 실행 조건 문구를 4개 페이지로 넓혀 미확정 2를 다시 썼다(두 검토자 공통).
  - `related` 한 줄 배열 4개의 100자 초과, regexp-lastindex 링크 문구와 문장 위치, 규칙 문장의 판정 기준, 첫 문단 제약의 근거, R1 사실 서술을 고쳤다.
- 2026-11-16 (사용자 승인): 계획 승인. 미확정 기본안 확정 — 1 규칙 문장은 기본안 문구, 2 같은 종류 실행 조건 문구 4개 페이지를 함께 고침, 3 hoisting 46행은 원인 문장을 더해 고치고 링크.

## 구현 진행

- baseline (2026-11-16, `468f1a9`): lint 0 / format:check 통과 / typecheck 0 / test 165파일 5197개 통과 / test:build·e2e 미실행(직전 커밋이 같은 검증을 통과한 상태에서 시작)
- [x] 1. spread-destructuring 인용 판 맞추기 — `content.mdx:47`, `meta.ts` 참고 링크 2개. grep 0건(`sec-undefined-value`·`sec-null-value`·`용어 정의`), 인용 두 문장을 현재 초안 6.1.1·6.1.2와 대조함
- [x] 2. 실행 조건 문구 — variable-declaration:3, hoisting:6, expressions-statements:3, block-scope:38, scope-chain:26. grep 0건. 다섯 페이지 예제 23개를 Chromium 클래식 스크립트(`<script src>`)로 실행해 `expectedOutput`과 모두 같음을 확인(임시 스크립트는 삭제)
  - expressions-statements:3은 서브에이전트가 `type` 조건 문장만 넣어 "해당합니다"의 주어가 없었다. 메인이 variable-declaration과 같은 "예제의 출력은 Node의 `vm` …" 문장을 더했다(예제 2개 모두 `runtime: 'ecmascript'`).
- [x] 3. strict mode 링크와 related — 12개 페이지 본문 링크 각 1, `related` 각 1. 빌드 HTML의 `href="/concepts/strict-mode"`는 각 2개(primitive-methods는 이전/다음 링크까지 3개). hoisting:46은 원인 문장을 더하고 링크. class-inheritance·for-let·global-object·hoisting `meta.ts`는 여러 줄 배열로 펼침
- [x] 4. 용어와 규칙 문장 — property-attributes:34, `AGENTS.md:69`, `docs/content-guide.md:45`. grep 0건
- [x] 5. regexp-lastindex·match-all 표현 — regexp-lastindex:54·263, match-all `content.mdx:172,194,218,230`, `meta.ts:25,27,90`, `scenarios.ts:116`. grep 0건. `/(?=b)/g.exec('aab')` 두 번 모두 index 2
- 전체 검증(2026-11-16): lint 0 / format:check 통과 / typecheck 0 / test 165파일 5197개 통과 / test:build 503개 통과
- e2e 전체(2026-11-16): 743개 통과, 3개 건너뜀(13.1분)
- 리뷰 1차: Critical 0 · High 0 · Low 3 (보고)
  - Low: `app/concepts/regexp-lastindex/content.mdx:54` 더한 문장 끝의 "(matchAll의 빈 매치 설명에서 다룹니다)"가 문장 전체(반복이 끝나지 않음)까지 가리키는 것처럼 읽힐 수 있다. match-all이 직접 다루는 것은 "더 뒤에서 매치하면 lastIndex가 그 위치로 바뀐다"까지다.
  - Low: `app/concepts/block-scope/content.mdx:249` 퀴즈 해설에 26행과 같은 문장이 있지만 링크는 26행에만 걸었다(prop 문자열에는 링크를 걸지 않는 계획대로).
  - Low: `app/concepts/this-binding/content.mdx:40`, `app/concepts/primitive-methods/content.mdx:173`에 Node `vm` 실행을 "클래식 스크립트로 실행"이라 부르는 표현이 남았다(계획 9절, 범위 밖).

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 단계 1~5 모두 완료 조건을 통과했다.
- 달라진 점 1건: expressions-statements `content.mdx:3`에 variable-declaration과 같은 "예제의 출력은 Node의 `vm` 모듈에서 모듈이 아닌 스크립트(Script)로 실행한 결과입니다" 문장을 더했다. 계획 문구대로만 넣으면 "해당합니다"의 주어가 없었기 때문이다.
- 계획에 없던 확인 1건: "브라우저의 클래식 스크립트에 해당합니다"를 쓰기 전에 다섯 페이지 예제 23개를 Chromium 클래식 스크립트로 실행해 `expectedOutput`과 같음을 확인했다.
- 수정한 17개 페이지의 `reviewedAt`은 바꾸지 않았다(역방향 링크 정리 때의 선례, 사용자 최종 승인).

### 코드 리뷰
- 구현 리뷰에서 Critical·High는 없었다. 계획 검토의 HIGH 1건(hoisting 46행의 틀린 인과)은 계획에 반영해 고쳤다.
- Low 3건은 사용자 결정으로 남겼다(`## 구현 진행`의 리뷰 1차).

### 후속 작업
- [ ] (선택) regexp-lastindex `content.mdx:54` 괄호 "(matchAll의 빈 매치 설명에서 다룹니다)"가 가리키는 범위를 좁힌다.
- [ ] (선택) this-binding `content.mdx:40`, primitive-methods `content.mdx:173`의 "클래식 스크립트로 실행" 표현을 Node `vm` 실행 기준으로 고친다.
- [ ] (선택) strict를 언급하는 나머지 25개 페이지의 strict mode 링크.
- [ ] data-types 후속: typeof-operator·spread-destructuring 본문의 data-types 역방향 링크, expressions-statements 단순화의 템플릿 리터럴 언급.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [무검토 승인] hoisting 46행: 모듈에서 예제 3·5가 SyntaxError인 원인을 strict mode가 아니라 "모듈 맨 바깥의 함수 선언은 렉시컬 선언으로 다뤄져 같은 이름을 두 번 선언할 수 없다"로 고쳤다. 택하지 않은 대안은 문장을 그대로 두고 링크만 거는 것이다. 링크가 틀린 인과를 보증하게 되므로 버렸다.
- [무검토 승인] 예제 규칙을 금지("sloppy 전용 결과에 기대는 예제는 쓰지 않는다")에서 요구("기대면 전제와 strict mode·ES 모듈에서 달라지는 점을 밝힌다")로 바꿨다. 판정 기준은 "파일 첫 줄에 `'use strict';`를 붙였을 때 출력이 달라지거나 오류가 나면"이다. "모듈로 실행하면 달라지면"은 모듈 고유 차이(맨 바깥 `this`, 렉시컬 함수 선언)까지 섞여 기준이 흐려지므로 버렸다.
- [무검토 승인] 같은 종류의 실행 조건 문구를 기록된 1개 페이지가 아니라 5개 페이지에서 함께 고쳤다. 예제는 Node `vm`의 Script로 실행되므로 "클래식 스크립트로 실행해 확인"이라고 쓰지 않고 "스크립트로 실행한 결과이고 브라우저의 클래식 스크립트에 해당"이라고 썼다.
- [Claude 판단] "브라우저의 클래식 스크립트에 해당합니다"를 쓰기 전에 예제 23개를 Chromium `<script src>`로 실행해 대조했다. 명세상 Script 목표 기호가 같다는 추론만으로 쓰지 않았다.
- [Claude 판단] expressions-statements 3행에 vm 문장을 직접 더했다(서브에이전트 결과의 주어 누락).
- strict mode 링크는 "모듈·클래스는 항상 strict"와 sloppy 용어 풀이를 쓴 12개 페이지에만 걸었다(사용자 결정). 페이지마다 본문 링크 1개와 `related` 1개다.
- spread-destructuring의 undefined·null 인용은 ES2025 4.4 용어 정의가 아니라 현재 초안 6.1.1·6.1.2 문장으로 맞췄다(사용자 결정). 옛 id는 초안에 oldids로 남아 링크는 동작했고, 문제는 인용한 판과 링크한 판이 다른 것이었다.

#### 배경지식
- 모듈의 맨 바깥에서 함수 선언은 `var`처럼이 아니라 렉시컬 선언처럼 다뤄진다. 그래서 같은 이름의 함수 선언 두 개, 함수 선언과 `var`의 이름 겹침은 모듈에서 Syntax Error다. strict mode 스크립트에서는 둘 다 허용된다.
- 명세 용어는 "non-strict code"다. "non-strict mode code"는 명세에 없다.
- HTML 표준은 `<script>`의 `type`이 없거나 빈 문자열이거나 JavaScript MIME 타입이면 클래식 스크립트로, `module`이면 모듈로, `importmap`이면 import map으로 처리하고 그 밖은 데이터 블록으로 둔다. "type=module이 아닌 script"는 클래식 스크립트의 정의가 아니다.
- RegExpBuiltinExec는 g·y 플래그에서 매치에 성공하면 `lastIndex`를 매치 끝 인덱스로 쓴다. 빈 매치는 끝이 매치 위치와 같으므로, 검색 시작 위치에서 매치하면 값이 그대로고 더 뒤에서 매치하면 그 위치로 바뀐다. 어느 쪽이든 다음 `exec`는 같은 자리에서 다시 매치한다.
- `firstProseLine` 빌드 테스트는 링크와 강조 기호를 걷어낸 뒤 첫 문단을 비교하므로 첫 문단에 링크를 걸어도 깨지지 않는다.

#### 확인 질문
1. hoisting 예제 3·5가 모듈에서 SyntaxError인 이유를 "모듈은 항상 strict mode라서"라고 설명하면 왜 틀린가?
   <details><summary>답</summary>파일 첫 줄에 `'use strict';`를 붙인 스크립트로는 두 예제가 파싱을 통과한다. 모듈로 실행할 때만 `Identifier ... has already been declared`가 난다. 원인은 모듈 맨 바깥의 함수 선언이 렉시컬 선언으로 다뤄지는 것이다(2절 사실, 검수 가이드 5절, `app/concepts/hoisting/content.mdx:46`).</details>
2. 새 예제 규칙에서 "sloppy mode에 기댄다"를 왜 "모듈로 실행하면 달라지면"이 아니라 "`'use strict';`를 붙였을 때 달라지면"으로 판정하는가?
   <details><summary>답</summary>모듈 실행은 strict mode 외에도 맨 바깥 `this`, 렉시컬 함수 선언 같은 차이를 함께 가져온다. 지시어를 붙이는 쪽이 strict mode 하나만 바꾸는 판정이다(변경 이력, `AGENTS.md:69`).</details>
3. 예제를 Node `vm`으로 실행하면서 "브라우저의 클래식 스크립트에 해당합니다"라고 써도 되는 근거는 무엇이고, 어떤 예제가 들어오면 이 문장이 깨지는가?
   <details><summary>답</summary>다섯 페이지 예제 23개를 Chromium 클래식 스크립트로 실행해 기대 출력과 같음을 확인했다(`## 구현 진행` 단계 2). 전역 객체의 호스트 정의 프로퍼티(`name`, `top` 등)처럼 호스트마다 다른 것에 기대는 예제가 들어오면 깨진다.</details>
4. spread-destructuring의 옛 id 링크는 동작했는데 왜 고쳤는가?
   <details><summary>답</summary>본문은 ES2025 4.4의 용어 정의 문장을 인용하고 링크는 현재 초안 6.1로 갔다. 독자가 링크를 따라가도 인용한 문장을 찾을 수 없다. 인용을 초안 6.1.1·6.1.2 문장으로 바꾸고 링크도 현재 id로 맞췄다(`app/concepts/spread-destructuring/content.mdx:47`, `meta.ts:174,178`).</details>
5. regexp-lastindex의 "빈 문자열에 매치하면 `lastIndex`가 원래 값 그대로"를 왜 한정했는가?
   <details><summary>답</summary>`/(?=b)/g`를 `'aab'`에 쓰면 검색은 0에서 시작하지만 매치는 2에서 일어나 `lastIndex`가 2로 바뀐다. 값이 그대로인 것은 검색 시작 위치에서 곧바로 매치할 때뿐이다. 반복이 끝나지 않는 것은 두 경우 모두 같다(`app/concepts/regexp-lastindex/content.mdx:54`).</details>
