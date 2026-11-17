# arguments 객체 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-17
- 기준: `main` @ `c735c10`

## 0. 요약
- 목적: "매개변수를 바꿨는데 arguments[0]은 왜 같이 바뀔까"를 질문으로 하는 `arguments-object` 페이지를 추가한다(order 165, 학습 순서 20번째/64). 중심은 sloppy mode의 매핑된 arguments(arguments exotic object)다.
- 범위: 새 개념 폴더(ecmascript 예제 6개, 조건 표 1개, 퀴즈, 시뮬레이터 1개·시나리오 2개), 기존 3개 페이지(arrow-functions, default-parameters, strict-mode)의 "다루지 않는다"·링크 문구, 20번째 이후 순위 +1과 '객체' 검색 개수 테스트. 공통 코드 소스는 바꾸지 않는다.
- 위험: 연결을 "값을 공유한다/복사한다"로 설명하거나, 넘기지 않은 인수·strict·단순하지 않은 목록에서도 연결된다고 읽히게 쓰는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → 모두 반영, HIGH 2건 해소)
- 미확정: 없음 (2건 모두 2026-11-17 사용자 승인으로 기본안 확정)

## 1. 요구사항

- 사용자 결정(2026-11-17)
  - 추가 게시글 로드맵 1차. 2차 classList·style은 별도 계획이다.
  - 위치: 18장 자리, order 165(new-operator 160과 prototype-chain 170 사이). strict mode와 매개변수 기본값은 뒤 개념이라 본문에서 링크로만 가리킨다.
  - 범위: 매핑 중심. 기본 성질(배열이 아님, length, 화살표 함수에는 없음)은 arrow-functions가 계속 맡고, 기존 페이지는 링크와 단순화 문구만 고친다.
  - 시뮬레이터 1개를 넣는다.
- 새 페이지
  - `app/concepts/arguments-object/`, category `execution`(arrow-functions·default-parameters와 같은 그룹), order 165, `reviewedAt: null`.
  - 제목: "arguments 객체: 매개변수를 바꿨는데 arguments[0]은 왜 같이 바뀔까"
  - prerequisites: 함수 호출(`function-calls`), 프로퍼티 어트리뷰트와 접근자(`property-attributes`).
  - 첫 문단의 답(고정 내용, 명세 근거)
    - sloppy mode이고 매개변수 목록이 단순한 함수의 `arguments`는 명세가 arguments 이그조틱 객체(arguments exotic object)라고 부르는 객체다(10.4.4).
    - 이 객체는 넘긴 인수가 있는 매개변수에 대응하는 인덱스 프로퍼티를 읽을 때 매개변수 바인딩의 값을 돌려주고(`[[Get]]`), 쓸 때 매개변수 바인딩에도 쓴다(`[[Set]]`). 그래서 한쪽을 바꾸면 다른 쪽에서도 바뀐 값이 읽힌다.
    - strict mode 함수이거나 매개변수 목록이 단순하지 않으면 평범한 객체가 만들어지고 이 동작이 없다(FunctionDeclarationInstantiation, CreateUnmappedArgumentsObject).
  - 다룰 것
    1. 두 종류의 arguments와 판정 조건(strict 여부, IsSimpleParameterList).
    2. 연결의 범위: 호출 때 넘긴 인수의 개수보다 작고 매개변수 개수보다 작은 인덱스만(기준은 지금의 `arguments.length`가 아니라 호출 때의 인수 개수다). 넘기지 않은 인수의 매개변수도, 매개변수보다 많이 넘긴 인수의 인덱스도 연결되지 않는다.
    3. 양방향: 매개변수 재할당 → `arguments[i]`, `arguments[i]` 대입 → 매개변수.
    4. 연결이 끊기는 경우: `delete arguments[i]`, `Object.defineProperty`로 접근자로 바꾸거나 `writable: false`로 바꾸는 것.
    5. `callee`: 매핑된 객체는 함수 자신을 값으로 갖는 데이터 프로퍼티, 매핑되지 않은 객체는 읽으면 TypeError를 던지는 접근자 프로퍼티. 쓰기는 본문에서 주장하지 않는다(2절 사실: V8에서 sloppy 함수의 쓰기는 던지지 않아 명세와 다르다).
    6. `arguments`가 만들어지지 않는 경우: 매개변수 이름이 `arguments`일 때, 본문에 이름이 `arguments`인 함수 선언이 있을 때, 본문 맨 바깥에 `let`·`const`·클래스 선언의 이름이 `arguments`일 때(한 문장, concept.test로 검증). 뒤의 둘은 매개변수 목록에 식이 없을 때의 규칙이라는 조건을 simplifications에 밝힌다. 예제가 보이는 것은 "그 이름이 arguments 객체를 가리키지 않는다"이고 "만들지 않는다"는 명세 알고리즘의 내용이라고 나눠 쓴다.
  - 다루지 않고 `simplifications`에 밝힐 것: 기본 성질(arrow-functions), 배열로 바꾸는 방법, 이름이 중복된 매개변수의 매핑, 본문의 `var arguments`, 함수 밖의 `arguments`, `arguments.length` 대입, `Symbol.iterator`, ParameterMap이 명세의 서술 장치라는 점, `caller`, `callee`에 쓰기, `Object.freeze`(끊김)·`Object.seal`(유지), 제너레이터·async 함수·메서드(같은 규칙)와 클래스 안(항상 strict), 클래스 필드·static 블록·`eval`의 `arguments`, `arguments` 바인딩 자체의 재할당, 다른 객체가 상속받아 대입하는 경우(`[[Set]]`의 receiver 조건).
- 유지할 것: 기존 페이지의 예제·출력·퀴즈·시뮬레이터, 다른 페이지의 `reviewedAt`.
- 제외: arrow-functions의 arguments 절 축소, function-calls·array-index-length·execution-context의 arguments 언급 변경.

## 2. 사실과 추정

### 사실
- 명세(현재 초안 사본, scratchpad `spec-draft-now.html`)
  - 10.4.4 Arguments Exotic Objects: "An arguments exotic object is an exotic object whose array index properties map to the formal parameters bindings of an invocation of its associated ECMAScript function."
  - Note 1: CreateUnmappedArgumentsObject가 만드는 것은 ordinary object다.
  - Note 2: 대응은 "numeric name values are less than the number of formal parameters"인 프로퍼티에 한정되고, "deleted and then redefined or if the property is changed into an accessor property"이면 끊긴다. NOTE는 "share"라고 쓰지만 알고리즘은 `[[Get]]`·`[[Set]]`·`[[DefineOwnProperty]]`·`[[Delete]]`가 ParameterMap을 거쳐 바인딩을 읽고 쓰는 것이다.
  - Note 3: ParameterMap은 서술 장치이고 구현이 실제로 만들 필요는 없다.
  - Note 4: ordinary arguments 객체의 `callee`는 접근하면 TypeError를 던지는 non-configurable 접근자다.
  - `[[DefineOwnProperty]]`: 접근자 디스크립터면 map에서 지운다. `[[Value]]`가 있으면 매개변수에도 쓴다. `[[Writable]]: false`면 map에서 지운다(값 없이 `writable: false`만 주면 그때의 매개변수 값을 프로퍼티 값으로 넣는다).
  - `[[Delete]]`: 삭제에 성공하면 map에서도 지운다.
  - CreateMappedArgumentsObject: `index < length`일 때만 매핑을 만든다. 이름이 중복되면 뒤쪽 인덱스가 매핑된다. `callee`는 `{ [[Value]]: func, writable, configurable }`.
  - FunctionDeclarationInstantiation: 화살표 함수(`[[ThisMode]]` lexical)이거나, 매개변수 이름에 `arguments`가 있거나, (매개변수 목록에 식이 없고) 본문의 함수 선언 이름이나 렉시컬 선언 이름에 `arguments`가 있으면 만들지 않는다. `strict`이거나 `simpleParamList`가 false면 unmapped를 만든다.
- 실행으로 확인(Node `vm`, 2026-11-17)
  - `function f(a){a=2;var x=arguments[0];arguments[0]=9;return x+" "+a}` → `f(1)`은 `2 9`. 본문 첫 줄에 `'use strict'`를 넣으면 `1 2`.
  - `function g(a,b){b=5;return arguments.length+" "+arguments[1]+" "+(1 in arguments)}` → `g(1)`은 `1 undefined false`. `arguments[1]=7`을 넣어도 `b`는 `5`다.
  - `delete arguments[0]; arguments[0]=9; return a+" "+arguments[0]` → `1 9`.
  - `Object.defineProperty(arguments,"0",{writable:false}); a=2` → `a`는 `2`, `arguments[0]`은 `1`.
  - 접근자로 바꾼 뒤 `a=2` → `a`는 `2`, `arguments[0]`은 getter 값.
  - `Object.defineProperty(arguments,"0",{value:5})` → `a`도 `5`(연결 유지).
  - `callee`: sloppy 단순 목록은 `arguments.callee===f`가 `true`. strict 함수와 기본값·rest가 있는 sloppy 함수는 읽으면 TypeError.
  - `callee` 쓰기(Node v24.22.3): strict 함수는 TypeError. 기본값·rest가 있는 sloppy 함수의 `arguments.callee = 1`은 오류 없이 끝난다. 같은 객체의 디스크립터 `set`을 직접 부르면 TypeError이고 `get === set`이다. 명세(CreateUnmappedArgumentsObject의 `[[Setter]]: %ThrowTypeError%`)와 다른 V8 동작이다. 다른 엔진은 확인하지 않았다.
  - 끊기 전 연결을 함께 보이는 형태: `a=2; var s=arguments[0]; delete arguments[0]; arguments[0]=9; return s+" "+a+" "+arguments[0]` → `f(1)`은 `2 2 9`(strict면 `1 2 9`). `a=2; Object.defineProperty(arguments,"0",{writable:false}); a=3; return a+" "+arguments[0]` → `3 2`(strict면 `3 1`).
  - 넘긴 인수와 넘기지 않은 인수의 대비: `function g(a,b){a=3;b=5;…}` → `g(1)`에서 `arguments.length`, `arguments[0]`, `arguments[1]`, `1 in arguments`는 `1 3 undefined false`(strict면 `1 1 undefined false`), `arguments[1]=7` 뒤 `b`는 `5`.
  - 매개변수보다 많이 넘긴 인수: `(function(a){arguments[1]=7;return a+" "+arguments[1]+" "+arguments.length})(1,5)` → `1 7 2`.
  - `let arguments = 1`이 있는 함수의 `typeof arguments`는 `number`. `Object.seal(arguments)` 뒤에는 연결이 유지된다(`3 3`).
  - 조건 표 코드 형태: `(function(a){ a = 2; var x = arguments[0]; arguments[0] = 9; return [x, a]; })(1)`은 `String` 변환하면 `2,9`, 본문 첫 문을 `"use strict";`로 두면 `1,2`.
  - rest, 디스트럭처링 패턴, strict에서 `arguments[0]=9` 뒤 매개변수는 그대로다.
  - `function f(arguments){return typeof arguments}` → `f(1)`은 `number`. 본문에 `function arguments(){}` → `function`.
  - `function f(a,a){a=9;return arguments[0]+" "+arguments[1]}` → `f(1,2)`는 `1 9`.
- 기존 페이지
  - `app/concepts/arrow-functions/content.mdx:19-21`: arguments 기본 성질. "매개변수나 함수 안 선언의 이름이 `arguments`인 경우 같은 예외는 여기서 다루지 않습니다", "이 페이지는 … 연동되는 동작(mapped arguments)은 다루지 않습니다". `meta.ts:94`: "mapped arguments와 arguments.callee는 다루지 않습니다".
  - `app/concepts/default-parameters/content.mdx:42`: 매핑 조건과 예제 10. 끝 문장은 arrow-functions로 링크. `meta.ts:115`: "이름이 중복된 매개변수 목록의 arguments 매핑은 다루지 않습니다".
  - `app/concepts/strict-mode/content.mdx:127-141`: 변화 표 5행 "매개변수 재할당과 arguments", 자세히 칸은 `[매개변수 기본값](/concepts/default-parameters)`. `meta.ts:79`: "arguments.callee … 제외합니다", "strict 함수의 arguments가 매개변수와 연결되지 않는 것은 매개변수 기본값 개념에서 다룹니다". `concept.test.ts`는 자세히 칸 slug가 실제 개념인지 검사한다.
  - `app/concepts/function-calls/content.mdx:21`, `meta.ts:81`: 남는 인수를 읽는 방법은 arrow-functions에서 다룬다고 링크(그 내용은 arrow-functions 예제 3이 다루므로 그대로 둔다).
- 순서와 테스트
  - 현재 63개. order 165는 20번째가 되고 prototype-chain 이후가 모두 +1이다.
  - `app/lib/concepts.test.ts:104,111,112`(63), `app/components/concept/ConceptPager.test.tsx:18,28`.
  - `tests/e2e/navigation.spec.ts`: `toHaveCount(63)` 2곳(85, 149), '63번째'(93), `학습 순서 N / 63` 38곳(1, 4, 27, 29~63).
  - `tests/e2e/navigation.spec.ts:24,39,100,136`: '객체' 검색 결과 17개(4곳). `:107-125` 순위 배열 `4,12,19,20,21,23,24,26,28,30,31,34,42,44,45,54,59`. 검색은 title·summary·tags 부분 일치다(`app/lib/concepts.ts:91-98`). 새 제목에 '객체'가 있으므로 18개가 되고 배열은 `4,12,19,20,21,22,24,25,27,29,31,32,35,43,45,46,55,60`이 된다(새 페이지 20, 기존 20 이상은 +1).
  - `tests/e2e/responsive.spec.ts:1552` `toHaveCount(63)`.
  - 시뮬레이터가 있는 개념의 등록 선례(default-parameters): `tests/e2e/helpers.ts:44-45`(경로·시뮬레이터 이름 상수), `a11y.spec.ts:1408-1419`(페이지, 시뮬레이터 진행 뒤), `responsive.spec.ts:704-719`(가로 스크롤, 시뮬레이터 끝까지), `tests/build/build-output.test.ts:866-877`(시뮬레이터 프리렌더 describe), `docs/content-guide.md:225` 목록.
  - 시뮬레이터 구조 선례: `app/concepts/default-parameters/`의 `scenarios.ts`, `Simulator.tsx`(19줄 래퍼), `DefaultParametersView.tsx`, `*.test.tsx`, `concept.test.ts`.
- 용어: '바인딩'은 variable-declaration(order 3), '환경 레코드'는 hoisting(110)에서 이미 쓴다.

### 추정
- 없음. (검토에서 확인: '객체' 검색의 첫 카드는 분류별 보기와 학습 순서 보기 모두 '원시 값과 객체' 그대로다 — `app/lib/concept-groups.ts:10-18`은 fundamentals를 먼저 묶고 새 페이지는 execution이다. IsSimpleParameterList의 id는 `app/concepts/default-parameters/meta.ts:130`의 `sec-static-semantics-issimpleparameterlist`다.)

## 3. 구현 전략
- strict-mode(표를 concept.test가 실행 대조)와 default-parameters(시뮬레이터)의 패턴을 조합한다. 새 공통 코드는 만들지 않는다.
- 설명은 "공유"·"복사"가 아니라 명세의 내부 메서드 동작(읽을 때 매개변수 바인딩을 읽고, 쓸 때 매개변수 바인딩에도 쓴다)으로 쓴다. ParameterMap은 본문에 이름만 한 번 소개하고 "명세가 설명을 위해 둔 장치"라고 밝힌다.
- 예제는 틀린 모델을 배제하도록 만든다. 연결이 끊기거나 없음을 보이는 예제는 같은 함수 안에서 연결이 살아 있는 출력을 먼저 보인다(그렇지 않으면 "처음부터 사본" 모델과 출력이 같다). 틀린 모델은 셋이다: "arguments는 호출 때 값의 사본이다", "매개변수와 arguments는 언제나 연결된다", "연결은 한 방향(매개변수 → arguments)이다".
- 시뮬레이터 상태는 매개변수 바인딩 목록과 arguments 프로퍼티 목록 두 덩어리이고, 프로퍼티마다 연결된 매개변수 이름(`mappedTo`)을 텍스트로 보인다. 선을 긋는 그림은 쓰지 않는다(375px).
- 버린 대안
  - arrow-functions의 arguments 절을 새 페이지로 옮기기: 사용자가 매핑 중심을 골랐고 기존 페이지 재검토 범위가 커진다.
  - 제목에서 '객체'를 빼서 검색 테스트를 건드리지 않기: 개념의 이름이 "arguments 객체"이고, '객체' 검색에 나오는 것이 맞다.
  - order 257: 사용자가 18장 자리를 골랐다.
  - 예제에 rest 파라미터 쓰기: rest는 arrow-functions(order 250)에서 처음 나오는 문법이라 독자가 읽고 예측해야 하는 예제·퀴즈에는 쓰지 않는다. 단순하지 않은 목록은 조건 표와 링크로만 보인다. 함수 본문의 `'use strict'`와 try/catch는 order 165 이전 페이지(tdz, property-attributes, new-operator)의 예제에 선례가 있어 쓴다.
  - `callee` 쓰기의 TypeError를 본문에 쓰기: 명세와 V8 실행 결과가 달라 실행으로 검증할 수 없으므로 쓰지 않는다.

## 4. 변경 파일
- 추가
  - `app/concepts/arguments-object/meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`
  - `scenarios.ts`, `Simulator.tsx`, `ArgumentsView.tsx`, `ArgumentsView.test.tsx`, `Simulator.test.tsx`
  - `examples/two-way.js`, `not-passed.js`, `unlink.js`, `unmapped.js`, `callee.js`, `no-arguments-object.js`
- 수정
  - `app/concepts/arrow-functions/content.mdx:19,21`, `meta.ts:94`(+related)
  - `app/concepts/default-parameters/content.mdx:42`, `meta.ts`(+related)
  - `app/concepts/strict-mode/content.mdx`(변화 표 5행 자세히 칸), `meta.ts:79`(+related)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
- 변경하지 않음: 공통 코드 소스(`app/components/`, `app/simulator/`, `app/lib/*.ts` 소스, `app/routes/`), 다른 페이지의 예제·퀴즈·`reviewedAt`.

## 5. 위험 요소
- 연결의 서술: "공유한다"·"같은 값을 가리킨다"로 쓰면 AGENTS.md 정확성 원칙에 어긋난다 → 첫 문단 고정 내용과 작업 순서 2의 금지 표현 grep.
- 연결 범위: 넘기지 않은 인수, 매개변수보다 많은 인수, strict, 단순하지 않은 목록을 빠뜨리면 "언제나 연결"로 읽힌다 → 예제 2·4와 조건 표.
- sloppy 전제: 예제 1·2·3·5·6은 sloppy mode 결과에 기댄다(예제 2·3은 연결이 보이는 출력을 함께 넣은 형태라야 기댄다) → 본문 실행 조건 문장과 simplifications(AGENTS.md 예제 규칙). 모듈과 클래스 안의 함수는 strict라 매핑되지 않는다는 점은 뒤 개념이므로 링크로만 쓴다.
- 장 순서: strict mode(177), 화살표 함수(250), 매개변수 기본값·rest(255), 디스트럭처링(320)은 뒤 개념이다 → 본문 링크, simplifications는 개념 이름, related에 slug. 조건 표의 기본값·rest·패턴 행은 "뒤에서 다루는 문법"이라고 표 아래에 밝히고 링크한다. 예제와 퀴즈에는 이 문법을 쓰지 않는다.
- 순위 +1 누락과 '객체' 검색 개수: 작업 순서 5의 대조 스크립트.
- 기존 3개 페이지 문구를 고치며 사실이 달라지는 것 → 바꾸는 문장을 작업 순서 4에 문장 단위로 적고, 대상 페이지가 그 내용을 실제로 다룰 때만 링크한다.
- MDX: 첫 문단에 `**`·장 번호를 쓰지 않는다. 맨 `{`를 쓰지 않는다. 표의 코드 칸은 `<code>{'…'}</code>`, `<th>`는 한 줄.
- 시뮬레이터 375px 가로 넘침 → responsive e2e.
- 시뮬레이터가 연결된 프로퍼티 칸에 값을 그리면 "두 곳에 저장하고 맞춘다"로 읽힐 수 있다 → 칸의 값은 "그 프로퍼티를 읽었을 때 나오는 값"이라고 시각화 안 문구와 simplifications에 밝힌다.
- 조건 표 칸의 따옴표: `normalizeCell`(`tests/helpers/result-tables.ts:19-21`)은 `{'…'}` 안의 작은따옴표를 풀지 못한다 → 코드 칸 안의 지시어는 큰따옴표(`"use strict";`)로 쓴다.
- 예제의 try/catch(callee의 TypeError)는 뒤 개념(error-handling)이다 → simplifications에 "오류를 보이려는 용도"라고 밝힌다(default-parameters `meta.ts:113` 선례).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 공통 코드 소스를 바꾸지 않으므로 `npx playwright test tests/e2e/navigation.spec.ts`와 `npx playwright test -g "arguments-object|arguments 객체|홈 학습 순서 보기"`. 기존 3개 페이지 본문을 고치므로 `-g "arrow-functions|default-parameters|strict-mode|화살표 함수|매개변수 기본값|strict mode"`도 실행한다.
- 브라우저(dev 서버 재시작 후)
  1. 홈 학습 순서 19~21번째가 new-operator, arguments-object, prototype-chain이다.
  2. 새 페이지 pager가 '20 / 64'이고 이전은 new-operator, 다음은 prototype-chain이다.
  3. 시뮬레이터 시나리오 2개를 끝까지 진행하면 마지막 출력이 예제 출력과 같다.
  4. 375px·다크 모드에서 시뮬레이터와 조건 표가 넘치지 않는다.
  5. strict-mode 변화 표 5행 링크가 새 페이지로 간다.

## 7. 미확정 사항
- [미확정 1] 기존 3개 페이지(arrow-functions, default-parameters, strict-mode)는 문구·링크만 바뀐다. `reviewedAt`은 그대로 둔다(기본안, 역방향 링크 정리와 직전 후속 정리의 선례).
- [미확정 2] 매핑되지 않은 객체의 `callee`에 쓰는 동작은 본문에 쓰지 않고 simplifications에 "다루지 않는다"로만 둔다(기본안). 명세는 TypeError를 던지게 정의하지만 V8의 sloppy 함수에서는 던지지 않는다. 명세와 엔진의 차이를 본문에 밝히기로 하면 concept.test에 현재 V8 동작을 고정하는 검사가 생긴다.
- (확정) 이름이 중복된 매개변수의 매핑(`function f(a, a)`)은 본문에서 다루지 않고 simplifications와 concept.test로만 둔다. default-parameters `meta.ts:115`는 그대로 둔다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: `meta.ts` → `content.mdx`(필수 h2 뼈대) → `route.tsx`(strict-mode 것을 복사해 slug만 바꾼다), 예제 6개.
- 예제(모두 `runtime: 'ecmascript'`, 지시어 없는 sloppy 스크립트. `expectedOutput`은 `[]`로 시작해 실제 출력으로 채우고 아래 기대와 같은지 확인한다. 함수 이름과 값은 구현자가 정하되 구조는 지킨다)
  1. `two-way.js` — 양방향. 매개변수 재할당 뒤 `arguments[0]`, `arguments[0]` 대입 뒤 매개변수. 기대: 재할당한 값이 `arguments[0]`에서 읽히고, `arguments[0]`에 쓴 값이 매개변수에서 읽힌다. "사본" 모델과 "한 방향" 모델이 각각 다른 출력을 내야 한다.
  2. `not-passed.js` — 매개변수 2개인 함수를 인수 1개로 부른다. 두 매개변수를 모두 재할당한 뒤 `arguments.length`, `arguments[0]`, `arguments[1]`, `1 in arguments`를 한 줄로 출력하고, 이어서 `arguments[1]`에 대입한 뒤 둘째 매개변수를 출력한다. 기대(2절 형태): 첫 줄 `1 3 undefined false`(넘긴 첫째는 연결, 넘기지 않은 둘째는 연결 없음), 둘째 줄은 재할당한 값 그대로.
  3. `unlink.js` — 함수 둘. 첫째는 매개변수 재할당 뒤 `arguments[0]`을 먼저 읽어 두고(연결 확인) `delete arguments[0]` 뒤 다시 대입한다. 둘째는 매개변수 재할당 → `Object.defineProperty(arguments, '0', { writable: false })` → 매개변수 재할당. 기대(2절 형태): `2 2 9`, `3 2`. 끊기 전 재할당은 `arguments[0]`에 보이고 끊은 뒤의 변경은 보이지 않는다.
  4. `unmapped.js` — 같은 본문의 함수 둘. 하나는 지시어가 없고 하나는 본문 첫 줄에 `'use strict';`를 둔다. 양방향 조작 뒤의 값을 각각 출력해 같은 코드가 `2 9`와 `1 2`로 갈림을 보인다(default-parameters 예제 10은 기본값·한 방향이므로 겹치지 않는다). rest·기본값은 쓰지 않는다.
  5. `callee.js` — sloppy 단순 목록 함수의 `arguments.callee === f`, strict 함수에서 `arguments.callee`를 읽을 때의 `e.name`(try/catch). 기대: `true`, `TypeError`. 쓰기는 넣지 않는다.
  6. `no-arguments-object.js` — 매개변수 이름이 `arguments`인 함수의 `typeof arguments`, 본문에 `function arguments() {}`가 있는 함수의 `typeof arguments`. 기대: `number`(인수 1을 넘김), `function`. strict mode에서는 두 형태 모두 SyntaxError다(sloppy 전제).
- meta
  - summary 160자 이하. tags: arguments, arguments 객체, 매개변수, mapped arguments, callee, sloppy mode, 유사 배열.
  - goals 4개: 연결의 원인을 내부 메서드 동작으로 설명 / 연결되는 인덱스의 범위 / 연결이 없는 함수와 끊기는 조작 / callee의 두 형태.
  - related: `function-calls`, `property-attributes`, `strict-mode`, `arrow-functions`, `default-parameters`, `array-index-length`, `iterable-for-of`, `spread-destructuring`, `error-handling`(본문·simplifications에서 가리키는 것만 남긴다).
  - references: Arguments Exotic Objects, CreateMappedArgumentsObject, CreateUnmappedArgumentsObject, FunctionDeclarationInstantiation, IsSimpleParameterList(id는 default-parameters `meta.ts`와 명세 사본에서 확인), MDN arguments(ko URL을 열어 확인). 절 번호는 라벨에 쓰지 않는다.
  - simplifications: 1절 "다루지 않고 밝힐 것" 전부 + sloppy 전제(모듈로 실행하면 달라진다) + try/catch 용도 + `console.log`는 호스트 API + 시뮬레이터가 그리지 않는 것(`length`·`callee`·`Symbol.iterator` 프로퍼티, 환경 레코드의 다른 바인딩) + 시뮬레이터에서 연결된 프로퍼티 칸의 값은 그 프로퍼티를 읽었을 때 나오는 값이라는 것 + 본문 함수 선언·렉시컬 선언 규칙은 매개변수 목록에 식이 없을 때라는 것.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과. 여섯 예제의 출력이 위 기대와 같다. 여섯 예제 모두 파일 첫 줄에 `'use strict';`를 붙여 실행하면 출력이 달라지거나 오류가 남을 확인한다(sloppy 전제 문구의 근거. 예제 4는 지시어 없는 쪽 함수의 출력이 달라진다). 예제 파일에 rest·기본값·패턴·화살표 함수가 없다.

### 2. content.mdx 본문
- 첫 문단: 질문과 1절의 고정 내용. `**`·장 번호 없음.
- 실행 조건 문장: "예제의 출력은 Node의 `vm` 모듈에서 모듈이 아닌 스크립트(Script)로 실행한 결과입니다"(직전 후속 정리와 같은 표현) + 지시어가 없으므로 sloppy mode라는 것.
- `## 동작 원리`
  - `### 두 종류의 arguments`: 판정 조건과 조건 표.
    - 표 머리: `매개변수 목록 | 코드 | 매개변수를 바꾼 뒤 arguments[0] | arguments[0]을 바꾼 뒤 매개변수`.
    - 행: sloppy·단순 목록 / strict 함수 / 기본값 / rest / 디스트럭처링 패턴. 코드 칸은 2절의 조건 표 코드 형태(한 줄 즉시 실행 함수 식, `[x, a]`를 돌려준다)이고 지시어는 큰따옴표로 쓴다. 두 결과 칸은 그 배열의 첫째·둘째 값이다.
    - strict mode·기본값·rest·패턴은 링크로 가리킨다.
  - `### 연결은 어떻게 동작하나`: `[[Get]]`·`[[Set]]`, 연결되는 인덱스 범위, ParameterMap 한 번 소개.
  - `### 연결이 끊기는 경우`: delete, 접근자, `writable: false`. `value`만 다시 정의하면 끊기지 않고 매개변수에도 쓰인다는 한 문장.
  - `### callee`: 두 형태(매핑되지 않은 쪽은 "읽으면 TypeError"까지만). 매개변수 목록이 단순하지 않은 sloppy 함수도 매핑되지 않은 객체라 같다는 한 문장(concept.test로 검증). strict mode에서 왜 막는지 같은 설계 이유는 명세에 없으므로 쓰지 않는다.
  - `### arguments가 만들어지지 않는 경우`: 매개변수 이름, 함수 선언 이름, `let`·`const`·클래스 선언 이름(한 문장). 예제가 보이는 것과 명세가 정한 것을 나눠 쓴다(1절 6). 화살표 함수는 arrow-functions 링크.
- `## 예제`: 예제 1~6. 각각 `### 예제 N: …`, `file=`, PredictQuiz(오답은 틀린 모델의 출력). 시뮬레이터는 예제 3과 그 퀴즈 뒤의 독립된 줄에 한 번 둔다(시나리오가 예제 1·3이므로 두 예제의 예측을 마친 뒤).
- `## 결과와 이유`: 결과 표(`예제 | 결과`, result-tables 형식)와 예제별 설명, 흔한 오해 Callout 3개("arguments는 넘긴 값의 사본이다", "매개변수와 arguments는 언제나 연결되어 있다", "strict mode에서는 arguments를 쓸 수 없다").
- 완료 조건: `npm test`(result-tables 포함)와 `npm run test:build` 통과. `grep -n "공유\|복사\|가리킨" app/concepts/arguments-object/content.mdx app/concepts/arguments-object/meta.ts`의 결과가 오해를 부정하는 문장뿐이다.

### 3. 시뮬레이터
- `scenarios.ts`
  - 상태 타입 `ArgumentsState = { running: string; params: ParamBinding[]; args: ArgProperty[] | null }`.
    - `ParamBinding = { name: string; value: string; changed?: true }`
    - `ArgProperty = { key: string; value: string; mappedTo: string | null; changed?: true }`
    - `args`가 null이면 함수 호출 전·후다. 값은 표시 문자열이다.
  - 시나리오 2개: `two-way`(예제 1), `unlink`(예제 3, 함수 둘의 호출을 차례로 그린다). 각 5~12단계, 단계마다 전체 스냅샷. 코드는 `?raw` import.
  - 연결된 프로퍼티의 `value`는 항상 `mappedTo` 매개변수의 `value`와 같아야 한다(테스트가 검사).
- `ArgumentsView.tsx`: 매개변수 바인딩 칸과 arguments 프로퍼티 칸. 프로퍼티마다 "a와 연결" 또는 "연결 없음" 텍스트. 바뀐 항목은 색과 "바뀜" 텍스트로 함께 표시(default-parameters View의 표시 방식을 따른다).
- `Simulator.tsx`: `label="arguments 객체 시뮬레이터"`.
- 테스트
  - `concept.test.ts`: 시나리오마다 `assertScenarioInvariants`. 모든 단계에서 `mappedTo`가 있는 프로퍼티의 값이 해당 매개변수 값과 같고, `mappedTo`가 가리키는 이름이 `params`에 있다.
  - `ArgumentsView.test.tsx`, `Simulator.test.tsx`: default-parameters의 것과 같은 수준(렌더, 연결 텍스트, 단계 이동).
- 완료 조건: `npx vitest run app/concepts/arguments-object` 통과. 시나리오의 `mappedTo` 값 하나를 틀리게 바꾸면 실패하는 것을 확인하고 되돌린다.

### 4. concept.test.ts의 본문 주장 검증과 기존 페이지 문구
- concept.test.ts(작업 순서 3의 파일에 더한다)
  - 조건 표: `tableBody`로 5행을 읽어 코드 칸을 새 컨텍스트에서 실행하고, 반환값을 `String`으로 바꿔 쉼표로 나눈 두 값을 두 결과 칸과 대조한다.
  - 본문 주장: `value`만 다시 정의하면 연결 유지, 접근자로 바꾸면 끊김, 매개변수보다 많은 인수의 인덱스는 연결 없음(`1 7 2`), `arguments.length`를 키워도 넘기지 않은 인수는 연결되지 않음, 이름 중복 `f(a, a)`는 `1 9`, rest·기본값이 있는 sloppy 함수의 `callee` 읽기는 TypeError, `let arguments`·`const arguments`·`class arguments`가 있는 함수의 `typeof arguments`. `callee` 쓰기는 검사하지 않는다.
- 기존 페이지(문장 단위, 그 밖은 바꾸지 않는다)
  - arrow-functions `content.mdx:19`: "매개변수나 함수 안 선언의 이름이 `arguments`인 경우 같은 예외는 여기서 다루지 않습니다" → "매개변수나 함수 선언, `let`·`const` 선언의 이름이 `arguments`인 경우 같은 예외는 [arguments 객체](/concepts/arguments-object)에서 다룹니다"(새 페이지가 다루는 범위로 좁힌다. `var arguments`는 넣지 않는다).
  - arrow-functions `content.mdx:21`: "이 페이지는 sloppy mode에서 `arguments[0]`과 매개변수가 연동되는 동작(mapped arguments)은 다루지 않습니다." → "sloppy mode에서 `arguments[0]`과 매개변수가 연동되는 동작(mapped arguments)은 arguments 객체 페이지에서 다룹니다."(링크는 19행에만 둔다).
  - arrow-functions `meta.ts:94`: "…(mapped arguments)과 arguments.callee는 다루지 않습니다." → "…(mapped arguments)과 arguments.callee는 arguments 객체 개념에서 다룹니다." related에 `arguments-object`.
  - default-parameters `content.mdx:42` 끝 문장: "자세한 `arguments`의 성질은 [화살표 함수]…를 보세요." 뒤에 "매개변수와의 연결은 [arguments 객체](/concepts/arguments-object)에서 다룹니다."를 더한다. related에 `arguments-object`.
  - strict-mode `content.mdx` 변화 표 5행 자세히 칸: `[매개변수 기본값](/concepts/default-parameters)` → `[arguments 객체](/concepts/arguments-object)`. `meta.ts:79`: "arguments.callee, … 제외합니다"에서 callee를 빼고 "strict 함수의 arguments.callee를 읽으면 TypeError인 것과 strict 함수의 arguments가 매개변수와 연결되지 않는 것은 arguments 객체 개념에서 다룹니다"로 옮긴다. "매개변수 목록이 단순하지 않은 함수의 지시어가 SyntaxError인 것"은 매개변수 기본값 개념 그대로. related에 `arguments-object`.
- 완료 조건: `npx vitest run app/concepts` 통과(strict-mode concept.test의 자세히 칸 slug 검사 포함). 조건 표의 결과 칸 하나를 변조하면 실패하는 것을 확인하고 되돌린다. `grep -rn "arguments-object" app/concepts/{arrow-functions,default-parameters,strict-mode}`가 페이지마다 본문 링크 1개와 related 1개다.

### 5. 순서 테스트와 새 페이지 등록
- 순서: 2절 "순서와 테스트"의 모든 위치를 64 기준으로 고친다. `학습 순서 N / 63`은 N ≥ 20이면 N+1. '객체' 검색 17 → 18(4곳)과 순위 배열.
- 등록: `helpers.ts` 상수 2개(`ARGUMENTS_OBJECT_PATH`, `ARGUMENTS_OBJECT_SIMULATOR_NAME`), `a11y.spec.ts`(페이지, 시뮬레이터 진행 뒤), `responsive.spec.ts`(가로 스크롤, 시뮬레이터 끝까지), `build-output.test.ts`(시뮬레이터 프리렌더 describe: region aria-label, `<details` 6개 이상, 조건 표 머리), `docs/content-guide.md:225` 목록. 기존 케이스는 고치지 않고 추가만 한다.
- 완료 조건
  - `grep -rn "/ 63\|63번째\|toHaveCount(63)\|toBe(63)\|toHaveCount(17)" tests/e2e app/lib app/components`가 0건.
  - HEAD의 `N / 63` 목록을 변환한 것과 새 `/ 64` 목록이 같다(대조 스크립트).
  - '객체' 검색 개수와 순위 배열을 `filterConcepts`와 order 정렬로 계산한 값과 대조한다(일회용 스크립트, 커밋하지 않는다).
  - `npx vitest run app/lib app/components` 통과.

### 6. 전체 검증
- 6절의 정적 검증, e2e, 브라우저 확인 1~5.
- 완료 조건: 모두 통과. 실패하면 해당 단계로 돌아간다.

## 9. 추가 개선 후보
- function-calls `content.mdx:21`·`meta.ts:81`의 "남는 인수를 읽는 방법"이 arrow-functions(250번대)를 가리킨다. 새 페이지가 더 앞 순서이지만 그 내용(남는 인수 읽기)은 arrow-functions 예제가 다루므로 이번에는 그대로 둔다.
- execution-context `meta.ts:105`의 "arguments 바인딩도 만들어지지만"에 새 페이지 언급을 더하는 것.
- `tests/build/build-output.test.ts:866`의 주석 "28번째 개념(default-parameters)"은 이미 현재 순위와 다르다.

## 변경 이력
- 2026-11-17 (Consensus 검토)
  - 예제 2·3을 연결이 살아 있는 출력을 먼저 보이는 형태로 바꿨다. 원래 형태는 strict mode에서도 출력이 같아 sloppy 전제와 "사본" 모델 배제가 성립하지 않았다(두 검토자 공통, 메인이 실행으로 확인).
  - 매핑되지 않은 객체의 `callee` 쓰기 주장을 뺐다. V8의 sloppy 함수에서는 던지지 않는다(Critic HIGH, 메인이 실행으로 확인). 미확정 2로 올렸다.
  - 예제에서 rest를 빼고 단순하지 않은 목록은 조건 표와 링크로만 보이게 했다(장 순서).
  - 연결 범위 표현(넘긴 인수의 개수, 매개변수보다 많은 인수), 조건 표의 대조 방식과 따옴표, '객체' 검색 개수 위치(4곳), arrow-functions 19·21행 문장, 렉시컬 선언 한 문장, simplifications 목록을 고쳤다.
- 2026-11-17 (구현 중 발견): `class arguments {}`는 SyntaxError다(클래스 코드는 항상 strict). 1절 6과 8절의 "`let`·`const`·클래스 선언"에서 클래스를 뺐다. 본문·meta·concept.test에 반영했고 meta에는 SyntaxError라는 사실을 적었다 — 영향 단계 2·4.
- 2026-11-17 (사용자 승인): 계획 승인. 미확정 1·2 모두 기본안 확정 — 기존 3개 페이지 `reviewedAt` 유지, `callee` 쓰기는 본문에 쓰지 않는다.
- 2026-11-17 (사용자 검토): 본문 문장 5곳을 고쳤다 — 연결을 내부 메서드별로 나눠 쓰고(`[[Get]]`·`[[Set]]`, 끊김은 `[[Delete]]`·`[[DefineOwnProperty]]`), "식이 없다"의 뜻을 풀고, `let`·`const` 문장과 예제 6 퀴즈 해설의 반사실 문장, 흔한 오해 1의 범위를 고쳤다. concept.test에 근거 2건을 더했다 — 영향 단계 2·4.

## 구현 진행

- baseline (2026-11-17, `c735c10`): 직전 작업의 전체 검증(lint 0 / format:check 통과 / typecheck 0 / test 165파일 5197개 / test:build 503개 / e2e 743개 통과)과 같은 소스 트리에서 시작. 이후 변경은 계획 문서뿐이다.
- [x] 1. 폴더 뼈대·예제·meta — 예제 6개 출력이 계획의 기대와 같다(`2 9` / `1 3 undefined false`, `5` / `2 2 9`, `3 2` / `2 9`, `1 2` / `true`, `TypeError` / `number`, `function`). 여섯 예제 모두 `'use strict';` 접두로 출력이 달라지거나 오류(concept.test가 검사)
- [x] 2. content.mdx 본문 — 조건 표 5행, 퀴즈 6개, 결과 표, 흔한 오해 3개. 금지 표현 grep 0건
  - 메인이 고친 것: "매개변수 목록에 식이 없을 때"라는 조건이 매개변수 이름이 `arguments`인 경우에도 붙어 있었다(명세상 그 분기는 무조건). 조건을 함수 선언과 `let`·`const` 문장으로 옮겼다. 퀴즈 2 해설의 "둘째 값"을 "arguments[1]"로 고쳤다.
- [x] 3. 시뮬레이터 — 시나리오 2개(two-way 7단계, unlink 14단계). 연결된 프로퍼티 값 = 매개변수 값 불변식. 값 변조 시 실패 확인 후 원복
  - 계획과 다른 점: unlink가 14단계(계획 5~12). 함수 두 개의 호출을 차례로 그린다. 시각화에 '실행 컨텍스트' 영역이 하나 더 있다(선례와 같은 모양).
- [x] 4. concept.test.ts와 기존 페이지 문구 — 조건 표 실행 대조(결과 칸 변조 시 실패 확인 후 원복), 본문 주장 10건. arrow-functions·default-parameters·strict-mode 문장과 related
  - 메인이 고친 것: strict-mode `meta.ts` related에 `arguments-object`가 빠져 있어 더했다. `class arguments`가 SyntaxError라는 테스트를 더했다.
- [x] 5. 순서 테스트와 새 페이지 등록 — grep 0건, `N / 63` → `N / 64` 38곳 대조 일치, '객체' 검색 18개와 순위 배열을 메타데이터로 계산해 대조
- [x] 6. 전체 검증(2026-11-17): lint 0 / format:check 통과 / typecheck 0 / test 168파일 5264개 통과 / test:build 512개 통과
  - e2e: navigation.spec 16개 통과, `-g "arguments-object|arguments 객체|홈 학습 순서 보기|arrow-functions|default-parameters|strict-mode|화살표 함수|매개변수 기본값|strict mode"` 38개 통과
  - 브라우저(dev 서버): 새 페이지 pager '20 / 64', 이전 개념 new-operator, 시뮬레이터 영역과 시나리오 2개 렌더, 콘솔 오류 없음. 시뮬레이터 단계 진행과 375px 가로 스크롤은 e2e(responsive·a11y)로 확인
- 리뷰 1차: High 2 (구현 중 메인이 수정 — 식 조건의 적용 범위, `class arguments`) · Low 3 (보고)
  - Low: `app/concepts/arguments-object/scenarios.ts` unlink 시나리오가 14단계로 길다.
  - Low: `app/concepts/arguments-object/content.mdx` 조건 표의 기본값·rest·패턴 행은 뒤 개념의 문법이다(표 아래에 밝히고 링크함, 계획대로).
  - Low: `tests/build/build-output.test.ts` default-parameters describe 위 주석 "28번째 개념"이 현재 순위와 다르다(범위 밖, 계획 9절).
- 사용자 검토 반영(2026-11-17): 지적 4건(중하 1, 하 3) 수정. 반례 `(function (a = arguments.length) { function arguments() {} … })(undefined, 2)`가 `2,function`임을 실행으로 확인. 참고 사항(시뮬레이터 단계 제목의 `' '` 생략)은 고치지 않음.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 단계 1~6 모두 완료 조건을 통과했다.
- 달라진 점
  - `class arguments {}`는 SyntaxError라서 "`let`·`const`·클래스 선언"에서 클래스를 뺐다(변경 이력).
  - 사용자 검토로 본문 문장 5곳을 고쳤다(변경 이력).
  - unlink 시나리오는 14단계다(계획 5~12). 시각화에 '실행 컨텍스트' 영역이 하나 더 있다.
- 새 페이지의 `reviewedAt`은 `null`이다(strict-mode 커밋 때와 같은 방식). 기존 3개 페이지의 `reviewedAt`은 그대로다.

### 코드 리뷰
- 계획 검토 HIGH 2건과 구현 중 High 2건(식 조건의 적용 범위, `class arguments`)을 고쳤다. 사용자 검토 지적 4건도 반영했다.
- Low 3건은 사용자 결정으로 남겼다(`## 구현 진행`의 리뷰 1차).

### 후속 작업
- [ ] 새 페이지 `reviewedAt` 기록(사용자 검토 승인 날짜).
- [ ] (선택) 시뮬레이터 단계 제목 `return fromParam + a` 등을 실제 코드처럼 `' '` 연결까지 쓰기(사용자 검토의 참고 사항).
- [ ] (선택) function-calls `content.mdx:21`·`meta.ts:81`, execution-context `meta.ts:105`에 새 페이지 언급 더하기.
- [ ] (선택) `tests/build/build-output.test.ts`의 default-parameters 주석 "28번째 개념" 정리.
- [ ] 추가 게시글 로드맵 2차: classList·style.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 연결을 "값을 공유한다"가 아니라 arguments 이그조틱 객체의 내부 메서드 동작으로 설명했다. 읽기는 `[[Get]]`이 매개변수 바인딩의 값을 돌려주고, 쓰기는 `[[Set]]`이 매개변수 바인딩에도 쓴다. 명세 NOTE는 "share"라고 쓰지만 알고리즘은 내부 메서드다. 택하지 않은 대안은 NOTE의 표현을 그대로 옮기는 것이다.
- [Claude 판단] 매핑되지 않은 객체의 `callee`는 "읽으면 TypeError"까지만 썼다. 명세는 쓰기도 던지게 정의하지만 V8의 sloppy 함수(기본값·rest가 있는 경우)에서는 던지지 않아 실행으로 검증할 수 없다. (기본안을 사용자가 승인)
- [Claude 판단] 끊김을 보이는 예제 2·3은 같은 함수 안에서 연결이 살아 있는 출력을 먼저 보이게 만들었다. 처음 설계는 strict mode에서도 출력이 같아 "처음부터 사본" 모델과 구분되지 않았다.
- [Claude 판단] 예제와 퀴즈에는 rest·기본값·패턴을 쓰지 않고, 단순하지 않은 목록은 조건 표와 링크로만 보였다. 이 페이지(order 165)보다 뒤 개념의 문법이기 때문이다.
- [Claude 판단] "arguments가 만들어지지 않는 경우"에서 예제가 보이는 것(그 이름이 arguments 객체가 아니다)과 명세가 정한 것(객체를 만들지 않는다)을 나눠 썼다. `typeof`만으로는 "만들지 않음"과 "만들었지만 가려짐"을 구분할 수 없다.
- 학습 순서는 order 165(18장 자리), 범위는 매핑 중심, 시뮬레이터 1개(사용자 결정).
- 내부 메서드 이름을 방향별로 나누고 `[[Delete]]`·`[[DefineOwnProperty]]`를 밝힌 것, "식이 없다"의 뜻 풀이, 흔한 오해 1의 범위는 사용자 검토로 고쳤다.

#### 배경지식
- 함수를 호출하면 FunctionDeclarationInstantiation이 `arguments` 객체를 만든다. strict 함수이거나 매개변수 목록이 단순하지 않으면(IsSimpleParameterList가 false) 평범한 객체를, 아니면 arguments 이그조틱 객체를 만든다.
- 이그조틱 객체는 `[[GetOwnProperty]]`·`[[DefineOwnProperty]]`·`[[Get]]`·`[[Set]]`·`[[Delete]]` 다섯 내부 메서드를 따로 정의한다. 매핑은 호출 때 넘긴 인수의 개수보다 작고 매개변수 개수보다 작은 인덱스에만 생긴다.
- `[[Delete]]`가 성공하면 매핑이 없어진다. `[[DefineOwnProperty]]`는 접근자로 바꾸거나 `writable: false`로 바꾸면 매핑을 없애고, `value`만 주면 매개변수에도 쓴다.
- "목록이 단순하다"와 "목록에 식이 없다"는 다른 조건이다. 패턴만 있는 목록은 단순하지 않지만 식은 없다. 앞의 것은 mapped/unmapped를, 뒤의 것은 본문의 함수 선언·`let`·`const` 이름이 `arguments`일 때 객체를 만드는지를 정한다.
- 클래스 코드는 항상 strict라서 `arguments`를 바인딩 이름으로 쓸 수 없다.

#### 확인 질문
1. 명세 NOTE가 "share"라고 쓰는데 왜 페이지는 "공유한다"고 쓰지 않았는가?
   <details><summary>답</summary>알고리즘은 값을 한 곳에 두고 나눠 쓰는 것이 아니라 `[[Get]]`이 매개변수 바인딩의 값을 돌려주고 `[[Set]]`이 매개변수 바인딩에도 쓰는 것이다. NOTE 3은 ParameterMap이 서술 장치라고 밝힌다. 프로젝트 정확성 원칙도 결과의 원인을 "공유"로 설명하지 않게 한다(계획 2절 사실, 3절).</details>
2. 예제 3의 `afterDelete`가 `before`를 먼저 읽어 두지 않으면 무엇을 증명하지 못하는가?
   <details><summary>답</summary>출력이 `1 9`가 되는데, 이는 strict mode에서도 같고 "처음부터 사본" 모델로도 같은 출력이다. 끊기 전에 재할당한 값이 `arguments[0]`에서 읽히는 것을 보여야 "연결되어 있다가 끊겼다"가 증명된다(변경 이력, 예제 `unlink.js`).</details>
3. `function f(a, b)`를 `f(1)`로 부른 뒤 `arguments.length = 2; b = 5`를 하면 `arguments[1]`은 무엇이고 왜인가?
   <details><summary>답</summary>`undefined`다. 매핑은 호출 때 넘긴 인수의 개수를 기준으로 만들어지고, 나중에 `length`를 바꿔도 새로 생기지 않는다(CreateMappedArgumentsObject의 `index < length`, concept.test).</details>
4. 본문은 왜 매핑되지 않은 객체의 `callee`에 쓰는 동작을 말하지 않는가?
   <details><summary>답</summary>명세는 getter와 setter가 모두 %ThrowTypeError%라고 정의하지만, Node v24(V8)에서 기본값이나 rest가 있는 sloppy 함수의 `arguments.callee = 1`은 오류 없이 끝난다. 실행으로 검증되지 않는 주장은 쓰지 않는다(계획 2절 사실, 미확정 2).</details>
5. 본문에 `function arguments() {}`가 있으면 항상 arguments 객체가 만들어지지 않는가?
   <details><summary>답</summary>아니다. 매개변수 목록에 식이 없을 때만이다. `(function (a = arguments.length) { function arguments() {} return [a, typeof arguments]; })(undefined, 2)`는 `2,function`이다. 객체는 만들어져 기본값 식에서 쓰였고, 본문에서는 이름이 함수 선언에 가려졌다(concept.test).</details>
