# property-order 남긴 Low 5건 정리 구현 계획

- 상태: 완료
- 작성일: 2026-11-13
- 기준: `main` @ `bae5dbb`

## 0. 요약

- 목적: `property-order` 리뷰에서 남긴 Low 5건(`.claude/plans/property-order.md:206`, `:220`, `:224`)을 정리한다. '-0' 이유, JSON.stringify 한정, 2020판 표기는 문구 수정, 퀴즈 2는 삭제, 연결은 es-modules만.
- 범위: `app/concepts/property-order/`의 `content.mdx`·`meta.ts`·`concept.test.ts`, `tests/build/build-output.test.ts`의 퀴즈 개수 1줄. 공통 앱 코드, 예제 파일, 시뮬레이터, spread-destructuring·es-modules 페이지는 바꾸지 않는다.
- 위험: 새 문장이 명세보다 넓게 일반화되는 것(특히 '-0'의 이유와 2020판 용어). 명세 원문 대조와 근거 테스트로 막는다.
- 복잡도: 낮음 · Consensus: 생략(한 개념 페이지의 문구 수정과 퀴즈 1개 삭제, 기존 패턴 그대로, 방향은 사용자 답으로 확정)
- 미확정: 1건(reviewedAt 갱신 여부)

## 1. 요구사항

- ① '-0' 이유: "명세가 배열 인덱스가 아니라고 밝힘"이라는 근거가 약한 본문 문장과 표 칸을 이유가 드러나게 고친다.
- ② JSON.stringify: 마지막 문단의 "같은 키 순서 규칙은 JSON.stringify가 … 적용"에 'replacer 배열을 넘기지 않을 때' 한정을 붙인다.
- ③ 2020판 표기: "같은 판에서 for...in에도 위에서 본 조건 문단이 생겼습니다"에 2020판이 TypedArray 자리에 Integer-Indexed exotic object라고 쓴다는 점을 밝힌다.
- ④ 퀴즈 2: examples 파일 없이 concept.test로만 대조되는 퀴즈 2를 삭제한다(사용자 결정 2026-11-13). 대조 테스트도 함께 뺀다.
- ⑤ 연결: es-modules만 연결한다(사용자 결정 2026-11-13). spread-destructuring은 스프레드 결과의 키 순서를 다루지 않으므로 연결하지 않는다.
- 유지: 예제 1~5 번호와 파일, 시뮬레이터 3시나리오, 나머지 퀴즈 5개, summary·title, 기존 근거 테스트.
- 제외: spread-destructuring 보강(키 자리 예제), es-modules 쪽 역링크, 본문 for...in 절의 '모듈 네임스페이스 객체' 링크화, 새 예제 추가.

## 2. 사실과 추정

### 사실 (코드·명세에서 확인)

- ① 본문 `app/concepts/property-order/content.mdx:20`: "`'-0'`은 명세가 따로 다루는 문자열인데, 명세는 `'-0'`이 배열 인덱스가 아니라고 밝힙니다." 표 칸 `content.mdx:102-104`: "명세가 배열 인덱스가 아니라고 밝힌 문자열".
- ① 명세(현재 초안, scratchpad `spec.html`): CanonicalNumericIndexString은 1단계 "If arg is "-0", return -0𝔽", 그다음 ToNumber 후 ToString이 원문과 같으면 그 수를 돌려준다. 배열 인덱스는 "an integer index n such that CanonicalNumericIndexString(n) returns an integral Number in the inclusive interval from +0𝔽 to 𝔽(2^32 - 2)". 수학 연산 절: "For the purpose of defining intervals, -0𝔽 < +0𝔽, so, for example, an inclusive interval with a lower bound of +0𝔽 includes +0𝔽 but not -0𝔽." 배열 인덱스 정의의 Note 1: ""-0" is neither an integer index nor an array index."
- ① 실행: `node -e "console.log(String(Number('-0')))"` → `0`. 표의 '-0' 판정은 `concept.test.ts:23-34`의 `BOUNDARY_KEYS`(`'-0'` 포함)로 이미 실행 대조된다.
- ① 페이지의 판별 서술(`content.mdx:20` 앞부분 "숫자로 바꿨다가 다시 문자열로 바꿨을 때 원래 문자열과 같고, 0 이상 2^32 − 2 이하의 정수")은 CanonicalNumericIndexString에서 "-0" 예외를 뺀 요약이다.
- ② `content.mdx:281`: "같은 키 순서 규칙은 `JSON.stringify`가 객체를 직렬화할 때도 적용되며, [JSON](/concepts/json)에서 확인할 수 있습니다." json 페이지는 replacer 배열이 없을 때 EnumerableOwnProperties를 쓰고(`app/concepts/json/content.mdx:35`), 배열이면 "목록의 키를 목록 순서대로" 읽는다고 쓴다(`json/content.mdx:53`). json 예제 `replacer-space.js:9`의 목록 `['id', 'buyer']`는 객체 키 순서와 같아 '목록 순서' 자체는 예제로 구별되지 않는다.
- ③ `content.mdx:136` 끝 문장: "같은 판에서 for...in에도 위에서 본 조건 문단이 생겼습니다." 2020판 원문(scratchpad `spec2020.html`): "if neither O nor any object in its prototype chain is a Proxy exotic object, Integer-Indexed exotic object, module namespace exotic object, or implementation provided exotic object". 2020판에서 Integer-Indexed exotic object는 [[TypedArrayName]] 등의 슬롯을 가진 특수 객체(9.4.5)로, TypedArray 인스턴스가 여기에 해당한다.
- ④ 퀴즈 2 `content.mdx:160-166`(예제 1 퀴즈 바로 뒤). 대조 테스트 `concept.test.ts:61-65`. 사이트의 다른 퀴즈 539개는 모두 '예제 N의 출력' 질문이다(`grep 'question="' */content.mdx`). 퀴즈 2의 요점(10이 먼저 만들어져도 9, 10 순서)은 예제 1(`examples/basic-order.js:3,5`, 2를 1보다 먼저 대입)과 예제 2(출력 `"9","10"`, `meta.ts:45`)가 이미 보인다. 본문에 '퀴즈 2'를 가리키는 문장은 없다.
- ④ 빌드 테스트 `tests/build/build-output.test.ts:1434-1436`이 property-order의 `<details>`를 6개 이상 요구한다. 현재 빌드 결과에는 정확히 6개(퀴즈 6개)다. 삭제 후 5개가 되므로 기준을 5로 바꿔야 한다. e2e(`tests/e2e/a11y.spec.ts:697-702`)는 첫 '정답 확인' 버튼만 보므로 영향 없다.
- ⑤ es-modules는 본문에서 네임스페이스 객체의 "문자열 키는 내보낸 이름이고 코드 유닛 순으로 정렬"된다고 쓰고 예제 12와 퀴즈로 확인한다(`app/concepts/es-modules/content.mdx:67`, `:396`). property-order는 단순화에서 "Proxy·TypedArray·String 객체처럼 자기 키 목록을 다르게 정하는 특수 객체는 다루지 않습니다"(`property-order/meta.ts:76`)라고만 쓰고 `related`에 es-modules가 없다(`meta.ts:33`). 단순화에서 개념을 가리키는 기존 표기는 'ES 모듈 개념에서 다룹니다'(`app/concepts/async-await/meta.ts:111`).
- ⑤ spread-destructuring은 CopyDataProperties가 열거 가능한 자기 키를 읽는다는 것만 쓰고 결과 키 순서는 다루지 않는다(`app/concepts/spread-destructuring/content.mdx:11`, `:25`, `:31`). 그래서 `property-order/meta.ts:75`("Object.assign과 객체 스프레드도 같은 순서를 쓰지만 이 페이지에서는 다루지 않습니다")는 그대로 둔다.

### 추정

- 없음

## 3. 구현 전략

- 문구는 기존 문장을 최소로 고친다. 새 사실 주장(① '-0'을 숫자로 바꿨다 문자열로 바꾸면 '0', ② replacer 배열을 넘기면 그 순서)은 `concept.test.ts`의 '본문 서술의 근거'에 실행 테스트를 하나씩 더한다(이 페이지의 기존 방식, `concept.test.ts:36-`).
- ①은 이유를 두 단계로 쓴다: 페이지의 판별(왕복 비교)에서 빠지는 이유와, 명세가 '-0'을 따로 -0으로 읽어도 범위(+0부터, -0 < +0) 밖이라는 이유. 명세 Note는 결론으로만 인용한다.
- ③은 판별 원문 용어를 그대로 밝히고 그 객체가 TypedArray 인스턴스에 해당한다는 점까지만 쓴다(이름이 언제 바뀌었는지는 확인하지 않았으므로 쓰지 않는다).
- ⑤는 단순화 항목에 개념 이름으로 가리키고 `related`에 slug를 더한다(AGENTS.md 링크 규칙). 본문 링크는 넣지 않는다 — for...in 절의 '모듈 네임스페이스 객체'는 for...in 예외 목록이고 es-modules는 for...in을 다루지 않는다.
- 버린 대안: 퀴즈 2를 새 예제 파일로 옮기기(예제 2~5 번호가 밀려 본문·시뮬레이터 안내·테스트 수정이 커짐, 사용자 결정으로 제외), spread-destructuring에 키 자리 예제 추가(사용자 결정으로 제외).

## 4. 변경 파일

- 수정 `app/concepts/property-order/content.mdx`: ①(20행, 102-104행 표 칸), ②(281행), ③(136행), ④(160-166행 퀴즈 삭제).
- 수정 `app/concepts/property-order/meta.ts`: ⑤ 단순화 76행에 문장 추가, `related`에 `'es-modules'` 추가.
- 수정 `app/concepts/property-order/concept.test.ts`: 퀴즈 2 테스트(61-65행) 삭제, ①·② 근거 테스트 2개 추가.
- 수정 `tests/build/build-output.test.ts`: 1434-1436행 `<details>` 기준 6 → 5.
- 변경하지 않음: 예제 파일·`scenarios.ts`·시뮬레이터(퀴즈 2는 예제·시나리오와 무관), es-modules·spread-destructuring·json 페이지, 공통 앱 코드.

## 5. 위험 요소

- ① 새 문장이 "명세가 '-0'을 숫자로 인정하지 않는다"처럼 틀리게 읽힘 → CanonicalNumericIndexString은 '-0'에 -0을 돌려준다는 점을 명시하고 범위 규칙을 이유로 쓴다 → 작업 순서 1, 리뷰에서 원문 대조.
- ① 표 칸에 결과 표 금지 글자(`\ < > { }`, 백틱, 큰따옴표)가 들어가 표 대조 테스트가 깨짐 → 칸 문구는 한글과 `+0`·`-0`만 쓴다 → `npm test`(result-tables).
- ② "replacer 배열을 넘기면 그 배열의 순서"가 함수 replacer에도 해당하는 것처럼 읽힘 → '배열'을 명시한다(함수 replacer는 키 목록을 바꾸지 않음, json `content.mdx:35`·`:51`) → 작업 순서 1.
- ③ Integer-Indexed exotic object를 'TypedArray와 같은 것'으로 넘치게 단정 → "TypedArray 인스턴스가 해당하는 특수 객체"까지만 쓴다.
- ④ 퀴즈 삭제로 빌드 테스트 실패 → 작업 순서 3에서 기준 변경, `npm run test:build`로 확인.
- ⑤ related 추가가 관련 개념 순서·무결성 테스트에 걸림 → `npm test`(content-integrity)로 확인.

## 6. 검증 방법

- 정적·테스트: AGENTS.md 검증 순서 `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e: 개념 폴더 문구와 `tests/build`만 바꾸고 공통 앱 코드는 바꾸지 않으므로 property-order 관련 e2e만 실행한다: `npx playwright test -g "property-order|프로퍼티 순서|키 순서 시뮬레이터"`(navigation.spec은 개념 수·순서가 바뀌지 않으므로 생략).
- 브라우저(dev 서버, `/concepts/property-order`): ① "배열 인덱스 키의 기준" 문단과 표 '-0' 행의 새 문구가 보이고 표에 가로 깨짐이 없다 ② 예제 1 다음 퀴즈가 바로 "예제 2: 배열 인덱스가 아닌 숫자 키" 제목으로 이어진다(퀴즈 5개) ③ 마지막 문단에 replacer 배열 한정이 보인다 ④ 단순화 목록에 ES 모듈 문장이 있고 관련 개념에 ES 모듈 카드가 있다.

## 7. 미확정 사항

- [미확정] `reviewedAt`(현재 2026-11-13)을 다시 바꿀지. 같은 날짜라 값이 같으므로 실질 차이는 없다. 마무리 때 사용자에게 확인한다.

## 8. 작업 순서

### 1. 문구 수정 ①②③

- 대상: `app/concepts/property-order/content.mdx`
- 현재: 20행 '-0' 이유가 "명세가 밝힌다"뿐, 102-104행 표 칸 동일, 136행 2020판 용어 차이 없음, 281행 JSON.stringify 한정 없음.
- 변경:
  - 20행의 '-0' 문장을 다음 취지로 교체: "`'-0'`은 숫자로 바꾸면 -0이고, -0을 다시 문자열로 바꾸면 `'0'`이라 원래 문자열과 다릅니다. 명세가 키를 숫자로 읽는 연산(CanonicalNumericIndexString)은 `'-0'`만은 예외로 -0을 돌려주지만, 배열 인덱스의 범위는 +0부터이고 명세는 범위를 정할 때 -0을 +0보다 작게 보므로 -0은 이 범위 밖입니다. 명세도 `'-0'`은 배열 인덱스가 아니라고 따로 적어 둡니다."
  - 102-104행 표 칸: "숫자로 읽으면 -0이라 +0부터인 범위 밖" 취지(금지 글자 없이).
  - 136행 끝에 덧붙임: "다만 ES2020판의 이 문단은 TypedArray 자리에 Integer-Indexed exotic object라고 씁니다. TypedArray 인스턴스가 해당하는 특수 객체의 이름입니다."
  - 281행: "replacer 배열을 넘기지 않으면 `JSON.stringify`가 객체를 직렬화할 때도 같은 키 순서를 쓰고(replacer 배열을 넘기면 그 배열의 순서를 따릅니다), [JSON](/concepts/json)에서 확인할 수 있습니다." 취지.
- 이유: Low ①②③.
- 주의사항: 문장을 고친 뒤 앞뒤의 지시어·접속어('이 기준은' 등, 20행 뒤 문장)가 여전히 맞는지 다시 읽는다. MDX 문자열 prop이 아닌 본문이라 작은따옴표 문제는 없다.
- 완료 조건: 네 곳의 새 문구가 파일에 있고 `npm run format:check` 통과, `grep -n "명세가 따로 다루는\|밝힌 문자열" content.mdx` 결과 0건.

### 2. 퀴즈 2 삭제와 근거 테스트

- 대상: `content.mdx` 160-166행, `concept.test.ts`
- 현재: 퀴즈 2가 예제 1 퀴즈 뒤에 있고 `concept.test.ts:61-65`가 대조한다.
- 변경: 퀴즈 2 블록과 앞뒤 빈 줄 하나를 지워 예제 1 퀴즈 다음에 빈 줄 하나를 두고 "### 예제 2" 제목이 오게 한다. 테스트 61-65 삭제. '본문 서술의 근거'에 테스트 2개 추가: (a) `Object.is(Number('-0'), -0)`이 true이고 `String(Number('-0'))`이 `'0'` (b) `JSON.stringify({ a: 1, b: 2 }, ['b', 'a'])`가 `'{"b":2,"a":1}'`이고 replacer 없이는 `'{"a":1,"b":2}'`. 기존처럼 `runInNewContext`로 실행.
- 이유: Low ④와 ①②의 새 주장 근거.
- 주의사항: 다른 퀴즈의 순서·내용은 그대로. 테스트 파일의 다른 테스트를 건드리지 않는다.
- 완료 조건: `grep -c "<PredictQuiz" content.mdx` = 5, `npx vitest run app/concepts/property-order` 통과.

### 3. 연결 ⑤와 빌드 테스트 기준

- 대상: `meta.ts`, `tests/build/build-output.test.ts`
- 변경: `meta.ts:76` 단순화 문장 끝에 "모듈 네임스페이스 객체의 키가 내보낸 이름의 코드 유닛 순으로 정렬되는 것은 ES 모듈 개념에서 다룹니다." 추가. `related`에 `'es-modules'`를 끝에 추가. `build-output.test.ts:1435`의 `toBeGreaterThanOrEqual(6)` → `5`.
- 이유: Low ⑤, 퀴즈 삭제에 따른 기준.
- 주의사항: spread 관련 단순화(`meta.ts:75`)는 그대로 둔다.
- 완료 조건: `npm test` 통과(content-integrity 포함), `npm run test:build` 통과.

### 4. 전체 검증

- 6절 명령 순서대로 모두 통과, 브라우저 확인 4항목.

## 9. 추가 개선 후보

- spread-destructuring에 스프레드가 이미 있는 키를 덮어써도 키 자리는 그대로라는 예제와 property-order 역링크(사용자가 이번 범위에서 제외).
- json 예제의 replacer 배열을 객체 키 순서와 다른 순서로 바꿔 '목록 순서'를 예제로 구별하기.

## 구현 진행

- baseline (2026-11-13, `bae5dbb`): lint·format:check·typecheck 통과, `npm test` 158파일 4968개 통과
- 구현 방식: 문구 수정과 10줄 남짓한 테스트 변경이라 문장을 정확히 맞추기 위해 메인 에이전트가 직접 수정했다(Sonnet 위임 생략).
- [x] 1. 문구 수정 ①②③ — `content.mdx:20`('-0' 이유, 뒤 문장 지시어 '이 기준은' → '배열 인덱스의 기준은'), `:102` 표 칸, `:134` ES2020판 용어, `:272` replacer 배열 한정. 옛 문구 grep 0건, format:check 통과
- [x] 2. 퀴즈 2 삭제와 근거 테스트 — `<PredictQuiz` 5개, `concept.test.ts`에 '-0' 왕복·replacer 배열 순서 테스트 2개 추가, 퀴즈 2 테스트 삭제
- [x] 3. 연결 ⑤와 빌드 테스트 기준 — `meta.ts` 단순화·`related`에 es-modules, `build-output.test.ts:1435` 6 → 5
- [x] 4. 전체 검증 — lint·format:check·typecheck 통과, `npm test` 4969 통과(−1 +2), `test:build` 466 통과(빌드 결과 `<details>` 5개), e2e `-g "property-order|프로퍼티 순서|키 순서 시뮬레이터"` 12 통과. 브라우저(dev 5174): 4항목 확인 — '-0' 문단·표 칸, 예제 1 퀴즈 뒤 바로 예제 2(정답 확인 버튼 5개), replacer 한정 문장, 단순화의 ES 모듈 문장과 관련 개념 카드. 가로 스크롤 없음
- 리뷰 1차(메인 직접, 명세 원문 대조): High 1(수정) · Low 1(보고) → 수정 후 재검증 통과
  - High(프로젝트 명세 정확성 기준): `meta.ts` 단순화 "모듈 네임스페이스 객체의 키가 … 정렬" — 명세의 namespace [[OwnPropertyKeys]]는 정렬된 exports 뒤에 심벌 키(Symbol.toStringTag)를 붙이므로 '문자열 키'로 한정. 수정 후 lint·format·typecheck, property-order·content-integrity vitest 814, `test:build` 466 통과(e2e는 단순화 문구 한 단어라 재실행하지 않음)
  - Low: `content.mdx:272` "같은 키 순서를 쓰고(…), JSON에서 확인할 수 있습니다" 문장 연결이 다소 어색함(의미는 정확)
  - 확인한 것: '-0' 서술(CanonicalNumericIndexString 1단계, 구간 규칙, Note 1), replacer PropertyList는 배열 순서·중복 제거, ES2020 for...in 문단 용어, json 페이지 `:53`이 목록 순서를 다룸

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 계획에 없던 것: ① 문단의 뒤 문장 주어를 '이 기준은' → '배열 인덱스의 기준은'으로 바꿈(주의사항의 지시어 점검 결과) ② 리뷰 High로 단순화의 '키'를 '문자열 키'로 한정. `reviewedAt`은 2026-11-13 그대로 유지(같은 날짜, 사용자 승인).

### 코드 리뷰

- High 1(네임스페이스 '문자열 키' 한정) 수정. Low 1(`content.mdx:272` 문장 연결) 남김.

### 후속 작업

- [ ] (선택) `content.mdx:272` replacer 한정 문장의 연결 다듬기
- [ ] (선택) spread-destructuring에 스프레드가 이미 있는 키를 덮어써도 키 자리는 그대로라는 예제와 property-order 역링크
- [ ] (선택) json 예제의 replacer 배열을 객체 키 순서와 다른 순서로 바꿔 '목록 순서'를 예제로 구별

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 단순화 문장을 '모듈 네임스페이스 객체의 문자열 키가 … 정렬'로 한정 — '키'로 두면 심벌 키까지 정렬되는 것처럼 읽힌다. 명세의 namespace [[OwnPropertyKeys]]는 정렬된 [[Exports]] 뒤에 OrdinaryOwnPropertyKeys로 얻은 심벌 키(Symbol.toStringTag)를 붙인다.
- [Claude 판단] '-0' 설명을 넣으면서 뒤 문장 주어를 '배열 인덱스의 기준은'으로 바꿈 — 그대로 '이 기준은'이면 바로 앞의 '-0' 범위 이야기를 가리키는 것처럼 읽힌다.
- [무검토 승인] '-0'의 이유를 두 단계로 씀 — 페이지의 요약 판별(왕복 비교)로는 '-0' → -0 → '0'이라 빠지고, 명세 연산은 '-0'만 예외로 -0을 돌려주지만 배열 인덱스 범위는 +0부터이고 구간 정의에서 -0 < +0이라 빠진다. 버린 대안: Note 1("-0" is neither …)만 인용 — 결론만 있고 이유가 없어 원래 Low와 같다.
- [무검토 승인] ⑤를 본문 링크가 아니라 단순화 문장 + `related`로 처리 — for...in 절의 '모듈 네임스페이스 객체'는 예외 목록일 뿐이고 es-modules는 for...in을 다루지 않아 AGENTS.md의 '대상 페이지가 그 하위 주제를 실제로 다룰 때만 링크' 규칙에 맞지 않는다.
- [무검토 승인] 빌드 테스트의 `<details>` 기준을 6 → 5로 낮춤 — 퀴즈 2 삭제의 직접 결과이며 빌드 결과가 정확히 5개임을 확인했다.
- 퀴즈 2 삭제(사용자 결정) — 사이트에서 유일하게 examples 파일 없이 concept.test로만 대조되던 퀴즈였고, 요점(10이 먼저 만들어져도 9, 10 순서)은 예제 1·2가 이미 보인다. 새 예제로 옮기는 대안은 예제 번호를 밀어 변경이 커져 버렸다.
- spread-destructuring은 연결하지 않음(사용자 결정) — 그 페이지는 스프레드 결과의 키 순서를 다루지 않는다.

#### 배경지식

- CanonicalNumericIndexString: '-0'이면 -0을, 그 밖에는 ToNumber 후 ToString이 원문과 같을 때 그 수를 돌려준다. 정수 인덱스·배열 인덱스는 이 결과가 정해진 구간 안의 정수인 키다.
- 명세의 구간 표기는 -0𝔽 < +0𝔽로 보므로 하한이 +0𝔽인 닫힌 구간은 -0을 포함하지 않는다. JS의 `-0 >= 0`이 true인 것과 다르다.
- JSON.stringify의 replacer가 배열이면 PropertyList(문자열·숫자·래퍼 항목, 중복 제거, 배열 순서)가 되어 모든 깊이의 객체에서 EnumerableOwnProperties 대신 쓰인다. 함수 replacer는 키 목록을 바꾸지 않는다.
- ES2020판 for...in 조건 문단의 'Integer-Indexed exotic object'는 [[TypedArrayName]] 등의 슬롯을 가진 특수 객체로, TypedArray 인스턴스가 여기에 해당한다. 현재 초안은 이 자리에 TypedArray라고 쓴다.

#### 확인 질문

1. 페이지의 요약 판별(숫자로 바꿨다 다시 문자열로 바꿨을 때 같은가)만으로도 '-0'은 빠지는데, 왜 범위 규칙까지 설명했나?
   <details><summary>답</summary>명세의 실제 판별 연산 CanonicalNumericIndexString은 '-0'을 예외로 -0으로 인정하므로, 명세 기준으로는 왕복 비교가 아니라 구간(+0부터, -0 < +0)이 '-0'을 빼는 이유다. 요약만 쓰면 명세 연산과 다른 이유를 주는 셈이 된다(계획 2절 ①, `content.mdx:20`).</details>
2. `-0 >= 0`이 true인데 왜 -0은 '0 이상' 범위 밖인가?
   <details><summary>답</summary>JS 비교 연산과 명세의 구간 표기는 다르다. 명세는 구간을 정할 때 -0𝔽 < +0𝔽로 본다고 수학 연산 절에 명시한다(계획 2절 ①).</details>
3. 단순화에서 '키'를 '문자열 키'로 바꾸지 않았다면 무엇이 틀리게 되나?
   <details><summary>답</summary>`Reflect.ownKeys(ns)`는 정렬된 내보낸 이름 뒤에 Symbol.toStringTag를 돌려준다. '키가 정렬된다'고 하면 심벌 키도 정렬 대상인 것처럼 읽힌다(`meta.ts:76`, 구현 진행 리뷰 1차).</details>
4. replacer 한정을 '배열'로 명시한 이유는? 함수 replacer를 넘기면 키 순서는 어떻게 되나?
   <details><summary>답</summary>함수 replacer는 값을 바꿀 뿐 키 목록은 EnumerableOwnProperties 그대로라 같은 순서다. 순서를 바꾸는 것은 PropertyList가 되는 배열 replacer뿐이다(계획 5절, json `content.mdx:35`·`:53`).</details>
5. es-modules를 for...in 절 본문에서 링크하지 않은 이유는?
   <details><summary>답</summary>그 절에서 모듈 네임스페이스 객체는 for...in 순서 보장의 예외 목록 항목이고, es-modules는 for...in을 다루지 않는다. AGENTS.md는 대상 페이지가 그 하위 주제를 실제로 다룰 때만 링크하라고 정한다(계획 3절).</details>
