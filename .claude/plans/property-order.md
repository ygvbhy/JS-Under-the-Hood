# 추가 게시글 '프로퍼티 순서' 구현 계획

- 상태: 완료
- 작성일: 2026-11-13
- 기준: `main` @ `45dd54e`

## 0. 요약

- 목적: 객체의 키 나열 순서 규칙(배열 인덱스 키는 작은 수부터, 나머지 문자열 키는 만든 순서)을 설명하는 추가 게시글 `property-order`를 만든다. property-keys가 단순화 목록에서 '다루지 않는다'고 미룬 주제다.
- 범위: 새 개념 폴더 1개(예제 5개, 키 목록 시뮬레이터 3시나리오, 퀴즈), 개념 수·학습 순서를 고정한 기존 테스트(56→57) 갱신, 빌드·e2e 등록, 기존 4개 페이지(property-keys·json·prototype-chain·symbol)의 연결 문구. 공통 앱 코드(`app/components`, `app/simulator`, `app/lib`, `app/routes`)는 바꾸지 않는다.
- 위험: 명세 판에 따라 달라진 사실(Object.keys 순서는 ES2020부터 명세가 정함)과 for...in의 조건부 보장을 넘치게 일반화하는 것. 판별 원문 대조와 예제 실행으로 막는다.
- 복잡도: 중간 · Consensus: 수행(Architect·Critic 1회, HIGH 2·MEDIUM 8 반영, symbol 중복은 사용자 결정으로 진행)
- 미확정: 없음(사용자 결정: 키 목록 시뮬레이터, for...in은 한 절, symbol과 일부 겹쳐도 진행, 연결 문구는 관련 4곳 모두)

## 1. 요구사항

- 새 개념 `property-order`(가제 제목 "프로퍼티 순서: Object.keys는 어떤 순서로 키를 줄까")를 추가한다.
- 다룰 것:
  1. OrdinaryOwnPropertyKeys 순서: 배열 인덱스(0 이상 2^32 − 2 이하 정수의 표준 문자열) 키를 작은 수부터, 그다음 나머지 문자열 키를 만든 순서대로, 마지막에 심벌 키를 만든 순서대로.
  2. 배열 인덱스가 아닌 숫자 모양 키: `'01'`, `'1.5'`, `'-1'`, `'4294967295'`(2^32 − 1)는 문자열 쪽이다.
  3. 값을 다시 대입해도 순서는 그대로, `delete` 뒤 다시 만들면 맨 뒤.
  4. Object.keys·values·entries와 Object.getOwnPropertyNames가 같은 순서를 쓴다(getOwnPropertyNames는 열거 불가 키도 포함). defineProperty로 만든 키도 만든 시점 기준.
  5. for...in(사용자 결정: 한 절): 자기 키가 같은 규칙을 따르고 그다음 프로토타입 키, 같은 이름은 한 번. 명세가 이 순서를 정하는 것은 obj와 체인의 어느 객체도 Proxy exotic object·TypedArray·module namespace exotic object·구현이 제공하는 exotic object가 아닐 때이며, 다음 네 사건 중 하나가 일어나기 전까지다: obj나 체인 객체의 [[Prototype]] 변경, obj나 체인 객체에서 프로퍼티 제거, 체인 객체(obj 자신이 아님)에 프로퍼티 추가, obj나 체인 객체의 프로퍼티 [[Enumerable]] 변경. 본문은 이 원문 목록을 줄이지 않고 "이 경우 명세가 순서를 정한다"로 쓰며 "~에서만 보장" 같은 필요조건 단정은 쓰지 않는다.
  6. 명세 판 변화: ES2019판의 EnumerableOwnPropertyNames에는 결과를 EnumerateObjectProperties(for...in) 순서에 맞추라는 문장이 있었고 그 순서는 명세가 정하지 않았다. ES2020판에서 그 문장이 없어졌고(Object.keys·values·entries 순서가 [[OwnPropertyKeys]] 순서가 됨), EnumerateObjectProperties에 CreateForInIterator 조건 문단이 생겼다. 본문은 2019판 → 2020판의 문장 변화로만 한정한다. 2018판 이전 문구, 구현의 실제 동작, Object.getOwnPropertyNames의 과거 순서는 쓰지 않는다(사본으로 확인하지 않음).
- 시각화(사용자 결정): 키 목록 시뮬레이터. 한 줄 실행마다 객체 카드의 키가 '배열 인덱스 키(작은 수부터)'와 '그 밖의 문자열 키(만든 순서)' 두 칸으로 나뉘어 보이고, 그 아래 둘을 이은 Object.keys 결과가 보인다.
- 유지: 기존 개념의 본문·예제·`reviewedAt`(연결 문구만 바꾼 페이지도 `reviewedAt` 유지), 공통 앱 코드.
- 제외: 심벌 키의 세부(심벌 개념으로 링크), 배열·Map·JSON의 세부(각 개념 링크), Object.assign·객체 스프레드(같은 순서를 쓰지만 다루지 않음, simplifications에 적음), Proxy·TypedArray·String 객체 같은 특수 객체의 [[OwnPropertyKeys]], 기존 키를 defineProperty로 재정의하거나 접근자↔데이터로 바꿀 때의 위치(재정의·enumerable 토글은 위치가 그대로임을 실행으로 확인했지만 전환은 명세 문구로 단정하기 어려워 쓰지 않음), 엔진 내부 저장 방식.
- 기존 서술과의 관계: symbol `content.mdx:57-61` '키는 어떤 순서로 나열될까' 절이 세 묶음 규칙과 심벌 키가 맨 뒤라는 점을 이미 예제 7로 보인다(사용자에게 알리고 진행 결정). 새 페이지는 같은 용어('배열 인덱스 형태의 문자열 키')를 쓰고, 심벌 키 위치는 그 절로 링크한다.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 명세(현재 초안, ECMAScript 2027 draft) OrdinaryOwnPropertyKeys: "For each own property key propertyKey of obj such that propertyKey is an array index, in ascending numeric index order … such that propertyKey is a String and propertyKey is not an array index, in ascending chronological order of property creation … such that propertyKey is a Symbol, in ascending chronological order of property creation". 2019판·2020판도 같은 세 단계(문구만 다름). 사본: 스크래치패드 `spec.html`(현재), `spec2019.html`, `spec2020.html`, `spec2021.html`.
- array index 정의(현재 초안 `#array-index`): CanonicalNumericIndexString이 +0부터 2^32 − 2까지의 정수를 돌려주는 integer index.
- EnumerableOwnProperties(현재 `#sec-enumerableownproperties`): `obj.[[OwnPropertyKeys]]()` 순서대로 열거 가능한 문자열 키를 모은다. 2019판 EnumerableOwnPropertyNames에는 마지막에 "Order the elements of properties so they are in the same relative order as would be produced by the Iterator that would be returned if the EnumerateObjectProperties internal method were invoked with O."가 있었고, 2020판에는 없다.
- EnumerateObjectProperties: 2019판·현재 모두 "The mechanics and order of enumerating the properties is not specified"이고, 2020판부터 CreateForInIterator 조건 문단이 있다(2019판 0회, 2020판 6회). 현재 초안 원문: "if neither obj nor any object in its prototype chain is a Proxy exotic object, TypedArray, module namespace exotic object, or implementation provided exotic object, then the iterator must behave as would the iterator given by CreateForInIterator(obj) until one of the following occurs: the value of the [[Prototype]] internal slot of obj or an object in its prototype chain changes, a property is removed from obj or an object in its prototype chain, a property is added to an object in obj's prototype chain, or the value of the [[Enumerable]] attribute of a property of obj or an object in its prototype chain changes." 2020·2021판은 TypedArray 자리에 "Integer-Indexed exotic object"라고 쓴다(판별 인용 시 구분).
- 실행(Node v24 `vm.runInNewContext`, 2026-11-13):
  - `book.title, book[2], book.author, book[1]` 순서 대입 → `Object.keys`는 `["1","2","title","author"]`; 같은 순서의 리터럴도 같다.
  - `'10','9','01','1.5','-1','4294967295','4294967294'` 순서 대입 → `["9","10","4294967294","01","1.5","-1","4294967295"]`.
  - `{a,b}`에서 `o.a=3` → `["a","b"]`; `delete o.a; o.a=3` → `["b","a"]`.
  - `{ b, 1, a }` + defineProperty(`hidden`, 열거 불가) + `c` → values `["one","B","A","C"]`, getOwnPropertyNames `["1","b","a","hidden","c"]`.
  - for...in: base `{ z, 7, shared }`, item에 `b`, `3`, `shared` → `3, b, shared, 7, z`.
  - 심벌: `o[s2]; o.b; o[s1]; o[0]` → Reflect.ownKeys `0, b, Symbol(s2), Symbol(s1)`.
  - 경계: `{x:0}`에 `'9007199254740991'`, `'-0'`, `'4294967294'` 순서로 추가 → `["4294967294","x","9007199254740991","-0"]`(integer index 상한 2^53 − 1인 키도, -0도 배열 인덱스가 아니다).
  - 기존 키 재정의: `{a,b}`에서 defineProperty(`a`, {value})·enumerable false→true 토글 뒤에도 `a,b`.
- 기존 페이지:
  - property-keys `meta.ts:98` simplifications: "정수 형태 키가 먼저 나열되는 순서 규칙은 다루지 않으며 …".
  - json `content.mdx:41`: "키 순서는 … OrdinaryOwnPropertyKeys의 순서(배열 인덱스 형태의 문자열 키를 오름차순으로 먼저, 나머지는 만든 순서)라서 … ([프로퍼티 키](/concepts/property-keys))" — 링크 대상(property-keys)은 이 규칙을 다루지 않는다.
  - prototype-chain `meta.ts:111`: for...in 순서는 명세가 일부만 정한다는 단순화, 예제 `for-in.js`(자기 프로퍼티 다음 프로토타입).
  - array-index-length `content.mdx:38`: 인덱스가 아닌 키 `["-1","01","1.5","4294967295"]`가 만든 순서로 나온다는 예제 문장(배열에서).
  - set-map `content.mdx:27-33`: Set·Map은 넣은 순서(삽입 순서) 절.
  - symbol `content.mdx:44-47`: Object.keys·JSON.stringify·for...in에 심벌 키가 나오지 않음. `content.mdx:57-61` '### 키는 어떤 순서로 나열될까': 세 묶음 규칙, 예제 7(`["1","2","b","a"]`, Reflect.ownKeys에서 심벌이 맨 뒤), 61행 끝 "`for...in`의 순서는 [프로토타입 체인](/concepts/prototype-chain)에서 본 대로 명세가 일부만 정하므로 예제에 쓰지 않습니다."
  - prototype-chain `meta.ts:111` 끝 문장: "배열을 돌려주는 Object.keys 등은 별도 개념입니다."
- 학습 순서: prototype-chain `order: 170`, primitive-methods `order: 180`. 새 개념 `order: 175`면 학습 순서 18번째가 된다. 선수 개념 property-keys(90)·property-attributes(150)·prototype-chain(170)보다 크다.
- 개념 수 56을 고정한 테스트: `app/lib/concepts.test.ts:104,111,112`, `app/components/concept/ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts:78,84,139` 및 `학습 순서 N / 56` 35곳(165~637행, 위치 1과 22~56 — 18~21 위치 케이스는 없으므로 1/57만 빼고 모두 N+1), `tests/e2e/responsive.spec.ts:1437`.
- 홈 검색 '객체': `navigation.spec.ts:17,32,91,126`의 개수 16, `navigation.spec.ts:98-115`의 순위 배열(`'1','9','16','17','18','19','21',…,'52'`) — 18 이상은 +1이 되고, 새 개념이 '객체'에 걸리면 `'18'`이 들어간다. 검색은 `filterConcepts(listConcepts(), q)`(`app/lib/concepts.ts:91`, 제목·요약·태그 부분 일치).
- 빌드 테스트: 개념마다 `tests/build/build-output.test.ts`에 '시뮬레이터 프리렌더 (<slug>)' 블록이 있다(예: array-index-length `:738-758` — '단계 1: 실행 전', region aria-label, 시나리오 라벨, `<details>` 개수). 개념 수 검사(`:54`)와 pager 검사(`:1404`)는 동적이다.
- e2e 등록 패턴: `tests/e2e/helpers.ts`에 경로·시뮬레이터 이름 상수, `a11y.spec.ts`에 페이지 axe·시뮬레이터 진행 axe, `responsive.spec.ts`에 가로 스크롤 2개(페이지·시뮬레이터 끝까지) — array-index-length(`helpers.ts:52-53`, `a11y.spec.ts:670-690`, `responsive.spec.ts:825-850`)가 같은 모양이다. `docs/content-guide.md:225`에 e2e 등록 slug 목록이 있다.
- 시뮬레이터 패턴: array-index-length의 `scenarios.ts`(상태 타입·작성 헬퍼·`changed`/`removed` 표시), `Simulator.tsx`(19줄 래퍼), `concept.test.ts`(단계 줄까지 실제 실행해 상태와 대조, `changed`가 이전 단계와의 차이와 같은지).

### 추정

- 없음

## 3. 구현 전략

- 새 개념 폴더는 array-index-length의 구조(키 카드 시뮬레이터, 단계별 실제 실행 대조)를 본뜬다. 상태 모양만 다르게 설계한다: 객체 카드마다 `indexKeys`(배열 인덱스 키, 작은 수부터)와 `stringKeys`(그 밖의 문자열 키, 만든 순서)를 따로 담고, 화면은 두 칸과 그 둘을 이은 'Object.keys 결과' 줄을 그린다.
- 시뮬레이터 대조 테스트는 단계마다 예제를 그 줄까지 실제로 실행해(예제 끝에 스냅숏 코드를 이어 붙인 한 스크립트, `const`도 같은 스크립트 안이라 읽힘) `Object.keys(obj)`와 값을 읽고, 상태의 `indexKeys`+`stringKeys`가 그것과 같은지 본다. 칸 나누기는 이어 붙인 결과로는 검증되지 않으므로 따로 독립 판정한다: 개념 폴더 안 `isArrayIndex(key)`(명세 정의: `String(Number(key)) === key`, 정수, 0 이상 2^32 − 2 이하) 술어로 `indexKeys`는 모두 참·`stringKeys`는 모두 거짓인지 검사하고, 그 술어 자체를 실행과 대조한다 — 문자열 키 `x`를 **먼저** 만든 새 객체(`{ x: 0 }`)에 키를 넣어 `Object.keys`에서 `x`보다 앞에 나오면 배열 인덱스. 다른 개념 폴더(array-index-length)의 술어는 import하지 않는다.
- 키 분류 표(키 → 배열 인덱스인가)는 `tableBody`로 content.mdx에서 읽어 같은 실행 판정(`{ x: 0 }`에 넣기)으로 대조한다.
- 시뮬레이터의 변경 표시는 array-index-length의 ArrayView처럼 `prevState`로 '새로 생김'(이전에 없던 키)과 '값 바뀜'(있던 키의 값만 바뀜)을 나누고, 사라진 키는 '지워짐'으로 보인다. reassign-delete의 다시 대입 단계에는 '값 바뀜'만 붙고 '새로 생김'은 붙지 않아야 하며, View 테스트로 이를 고정한다.
- 역사(ES2019 → ES2020)는 실행할 수 없는 명세 판 차이이므로 예제 대신 판별 명세 링크 두 개(2019 EnumerableOwnPropertyNames, 2020 같은 절)를 references에 넣고, 본문은 "명세 문장이 바뀌었다"까지만 쓴다. 구현이 그 전에 실제로 어떻게 동작했는지는 쓰지 않는다(근거 없음).
- 연결 문구(사용자 결정: 관련 4곳 모두): property-keys 단순화의 부정확한 '정수 형태 키'를 '배열 인덱스 형태의 키'로 고치며 새 개념을 가리키고, json 41행 링크를 새 페이지로, prototype-chain의 'Object.keys 등은 별도 개념'을 새 개념 이름으로, symbol 61행의 for...in 문장에 새 페이지 링크를 더한다. 네 페이지 related에 `property-order`를 더하고 `reviewedAt`은 유지한다. array-index-length 예제 4 문장은 고치지 않는다(규칙을 가리키는 문장이 아니라 결과 서술).
- 범위 제한: 페이지는 프로토타입 장까지를 전제로 한다. 배열·심벌·Map·JSON은 예제로 쓰지 않고 본문 링크와 simplifications의 개념 이름으로만 가리킨다. 심벌 키가 맨 뒤라는 점은 본문 한 문장 + [심벌](/concepts/symbol) 링크(그 페이지 '키는 어떤 순서로 나열될까' 절이 예제로 보임)로 쓰고, concept.test '본문 서술의 근거'로도 확인한다.
- 버린 대안:
  - 표 + 퀴즈만: 사용자가 시뮬레이터를 골랐다.
  - 순서 규칙을 property-keys에 절로 추가: 기존 페이지 본문을 크게 바꾸고 `reviewedAt` 재검토가 필요하다. 추가 게시글로 분리하는 것이 로드맵 정책(추가 게시글)과 맞다.

## 4. 변경 파일

- 추가 `app/concepts/property-order/`:
  - `meta.ts`(slug `property-order`, category `objects`, order 175, prerequisites property-keys·property-attributes·prototype-chain, related: prototype-chain·array-index-length·symbol·set-map·json — 본문에서 링크하는 slug와 정확히 같게, reviewedAt null)
  - `content.mdx`(필수 h2 3개, 퀴즈 6개 이상, 키 분류 표, 시뮬레이터, 흔한 오해 Callout)
  - `route.tsx`(템플릿)
  - `examples/`: `basic-order.js`, `not-index.js`, `reassign-delete.js`, `values-names.js`, `for-in-order.js`
  - `scenarios.ts`(상태 타입, `isArrayIndex`, 시나리오), `KeyOrderView.tsx`, `Simulator.tsx`, `concept.test.ts`, `KeyOrderView.test.tsx`, `Simulator.test.tsx`
- 수정(개념 수 56→57, 위치 이동):
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`(개수 78·139행, '57번째', `N / 56` 35곳 → 1/57 외 N+1, '객체' 개수 17·32·91·126행, 순위 배열 98-115행)
  - `tests/build/build-output.test.ts`('시뮬레이터 프리렌더 (property-order)' 블록 추가)
  - `tests/e2e/responsive.spec.ts`(홈 개수 1곳 + 새 페이지 가로 스크롤 2개 추가)
  - `tests/e2e/helpers.ts`(경로·시뮬레이터 이름 상수), `tests/e2e/a11y.spec.ts`(페이지·시뮬레이터 진행 2개 추가)
- 수정(연결): `property-keys/meta.ts:98`·related, `json/content.mdx:41`·`json/meta.ts` related, `prototype-chain/meta.ts:111`·related, `symbol/content.mdx:61`·`symbol/meta.ts` related.
- 수정(문서): `docs/content-guide.md:225` e2e 등록 slug 목록에 `property-order` 추가.
- 변경하지 않음: 공통 앱 코드, 다른 개념의 본문·예제·`reviewedAt`.

## 5. 위험 요소

- 명세 판 차이를 넘치게 일반화("ES2020 전에는 순서가 무작위였다") → 본문은 명세 문장 변화만 쓰고 구현 동작은 쓰지 않는다. 작업 순서 2 완료 조건에서 본문 문장을 판별 원문과 대조(사본 경로 위 2절).
- for...in 조건을 줄이거나 넓힘('프로퍼티가 바뀌지 않으면', 'Proxy 등', '~에서만 보장') → 1절 5번의 예외 4종·사건 4개를 그대로 쓰고, 작업 순서 2에서 현재 초안 원문과 대조.
- '정수 키'라는 말로 범위를 흐림(2^32 − 1, 2^53 − 1, '01', '-0') → 본문 용어를 '배열 인덱스 형태의 문자열 키'(명세 array index)로 통일, 경계를 예제 2와 표로 보이고, property-keys의 '정수 형태 키'도 고친다.
- '만든 시점'을 넓게 씀(기존 키 defineProperty 재정의도 생성처럼 읽힘) → "없던 키를 defineProperty로 만들면 그때가 만든 시점"으로 한정하고 재정의는 위치가 그대로라고만 쓴다(실행 확인한 범위).
- 시뮬레이터 칸 나누기 오류(경계 키를 문자열 칸에 둠)가 이어 붙인 결과 대조로 안 잡힘 → `isArrayIndex` 독립 판정 + 실행 대조(작업 순서 3).
- 다시 대입 단계에 '새로 생김' 오표시 → prevState 기반 구분 + View 테스트(작업 순서 3).
- 시뮬레이터 그림이 실행과 어긋남 → 단계별 실제 실행 대조 테스트(작업 순서 3).
- `vm`의 동작이 명세와 다를 가능성 → 이 규칙은 명세가 정한 순서이고 Node(V8) 실행이 일치함을 확인했다. 브라우저 차이는 주장하지 않는다.
- 위치 이동·검색 결과 갱신 누락(grep으로 안 잡히는 순위 배열·'객체' 개수) → 작업 순서 5 완료 조건에 4곳·배열을 명시하고 `filterConcepts(listConcepts(), '객체')` 실제 결과로 기대값을 계산.
- 새 폴더 생성 순서(dev 서버가 `./meta` 실패를 캐시) → meta.ts → content.mdx → route.tsx 순으로 만든다.
- MDX 함정: 문단을 `import`·`export`로 시작하지 않기, PredictQuiz 문자열 속 작은따옴표 금지(test:build만 잡음), 첫 문단에 `**`·`2 ** 32` 같은 코드 금지(빌드 테스트 firstProseLine).

## 6. 검증 방법

- `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md: 공통 앱 코드를 바꾸지 않으면 관련 e2e만): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "property-order|프로퍼티 순서|홈 학습 순서 보기|개념 페이지: 프로퍼티 키|개념 페이지: JSON|개념 페이지: 프로토타입 체인|개념 페이지: 심벌"`(연결 문구를 고친 4개 페이지 포함, `-g` 패턴은 실제 테스트 이름에 맞춘다).
- 브라우저(dev 서버 재시작 후 `/concepts/property-order`): ① 375px에서 시뮬레이터 세 시나리오를 끝까지 넘겨 가로 스크롤 없음 ② 다크 모드에서 두 칸 배지·변경 표시가 색 말고 텍스트로도 구분됨 ③ 키보드(화살표·Tab)로 단계 이동 ④ JS 끄고(프리렌더) 첫 단계와 퀴즈 정답(`<details>`)이 보임.
- 퀴즈 정답·해설의 값은 예제 출력과 대조(구현 후 `expectedOutput`과 퀴즈 문구 비교).

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제와 meta

- 대상: `app/concepts/property-order/meta.ts`, `examples/*.js`
- 변경: 예제 5개를 쓴다(초안, 줄 번호는 시뮬레이터가 쓰므로 확정 후 바꾸지 않는다).
  - `basic-order.js`: 빈 객체에 `title`, `2`, `author`, `1` 순서로 대입 → `Object.keys` 출력, 같은 순서의 객체 리터럴 → 출력. 기대 `["1","2","title","author"]` 두 번.
  - `not-index.js`: `'10'`, `'9'`, `'01'`, `'1.5'`, `'-1'`, `'4294967295'`, `'4294967294'` 순서로 대입 → 출력. 기대 `["9","10","4294967294","01","1.5","-1","4294967295"]`.
  - `reassign-delete.js`: `{ name: 'Lee', age, city }` → `name`에 다른 값('Park') 다시 대입 → 출력 → `delete name` 뒤 또 다른 값('Choi')으로 다시 대입 → 출력. 기대 `["name","age","city"]`, `["age","city","name"]`.
  - `values-names.js`: `{ b, 1, a }` + defineProperty 열거 불가 `hidden` + `c` → values, entries, getOwnPropertyNames 출력.
  - `for-in-order.js`: base `{ z, 7, shared }`, `Object.create(base)`로 만든 item에 `b`, `3`, `shared` → for...in으로 키 출력. 기대 `3`, `b`, `shared`, `7`, `z`.
  - meta: 1절·4절 값. summary는 160자 이하. '객체' 포함 여부는 작업 순서 5에서 계산에 쓴다. references: 현재 초안 OrdinaryOwnPropertyKeys(`#sec-ordinaryownpropertykeys`), array index(`#array-index`), EnumerableOwnProperties(`#sec-enumerableownproperties`), EnumerateObjectProperties(`#sec-enumerate-object-properties`), 2019판 EnumerableOwnPropertyNames(`https://tc39.es/ecma262/2019/#sec-enumerableownpropertynames`), 2020판 같은 절(`https://tc39.es/ecma262/2020/#sec-enumerableownpropertynames`), MDN Object.keys, MDN for...in, MDN Enumerability and ownership of properties. 링크는 실제로 열어 id를 확인한다.
  - simplifications(초안): 명세 내부 메서드 이름은 코드에서 부를 수 없음 / 두 칸 그림은 명세의 나열 규칙을 보인 것이지 엔진이 키를 두 칸에 저장한다는 뜻이 아님 / 심벌 키는 심벌 개념 / 배열은 '배열은 객체다' 개념 / Map·Set의 삽입 순서는 Set과 Map 개념 / JSON.stringify는 JSON 개념 / Object.assign과 객체 스프레드도 같은 순서를 쓰지만 다루지 않음 / Proxy·TypedArray·String 객체 등 [[OwnPropertyKeys]]가 다른 특수 객체는 다루지 않음 / for...in에서 명세가 순서를 정하지 않는 경우(예외 객체·네 사건)는 이름만 들고 예제로 보이지 않음 / 기존 키의 defineProperty 재정의는 위치가 그대로인 경우만 언급, 접근자↔데이터 전환은 다루지 않음 / 명세 판 변화는 2019판·2020판 문장만 비교 / 예제는 출력에 JSON.stringify를 씀(JSON 개념) / 시뮬레이터는 바깥 변수 찾기와 console·JSON 호출을 보이지 않음.
- 완료 조건: `npx vitest run tests/examples.test.ts -t property-order` 통과(expectedOutput은 처음 `[]`로 두고 실제 출력 확인 후 채움, 위 기대와 다르면 멈추고 원인 확인), `npx vitest run tests/content-integrity.test.ts` 통과.

### 2. content.mdx와 route.tsx

- 대상: `content.mdx`, `route.tsx`
- 변경:
  - 도입(첫 문단에 `**`·`2 ** 32` 금지): 흔한 질문 "객체 키 순서는 보장되지 않는다?"와 예제 1 결과.
  - `## 동작 원리`: OrdinaryOwnPropertyKeys 세 단계(용어 '배열 인덱스 형태의 문자열 키', 심벌은 [심벌] 링크), 배열 인덱스 정의(경계 2^32 − 2), 만든 시점(다시 대입은 새로 만들지 않음, delete 후 다시 만들면 새로 만듦, 없던 키를 defineProperty로 만들면 그때가 만든 시점, 기존 키 재정의는 위치 그대로), Object.keys·values·entries·getOwnPropertyNames가 [[OwnPropertyKeys]]를 쓴다는 것(getOwnPropertyNames는 열거 불가 키 포함), for...in 한 절(1절 5번 원문 그대로의 조건, 프로토타입 쪽은 prototype-chain 링크), 명세 판 변화 한 문단(1절 6번 한정).
  - 키 분류 표: 머리 `키 | 배열 인덱스인가 | 이유`, 행 `'0'`, `'9'`, `'10'`, `'4294967294'`, `'4294967295'`, `'9007199254740991'`, `'01'`, `'1.5'`, `'-1'`, `'-0'`(값은 실행으로 확인).
  - `## 예제`: 예제 5개 + 퀴즈(예제마다 1개 이상) + 시뮬레이터(독립된 줄).
  - `## 결과와 이유`: 예제별 설명, 흔한 오해 Callout 2개(순서는 보장되지 않는다 / 숫자 모양 키는 모두 앞으로 간다).
- 주의사항: 본문 링크는 실제 하위 주제를 다루는 페이지만(prototype-chain for...in, symbol 심벌 키 제외, set-map 삽입 순서, array-index-length 배열 인덱스, json 직렬화 순서). 링크한 slug는 related에 있어야 한다.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts tests/result-tables.test.ts` 통과, for...in 조건 문단과 명세 판 문단의 문장을 2절 원문과 한 줄씩 대조한 결과를 구현 진행에 기록, 본문 링크 slug 집합 = meta.related.

### 3. 시뮬레이터

- 대상: `scenarios.ts`, `KeyOrderView.tsx`, `Simulator.tsx`, 테스트 3개
- 변경:
  - 상태: `{ objects: Array<{ name: string; indexKeys: Prop[]; stringKeys: Prop[]; removed?: string[] }> }`, `Prop = { key, value: { type, display }, changed?: boolean }`. 단계마다 전체 스냅샷.
  - 시나리오 3개: `basic-order`(예제 1), `reassign-delete`(예제 3), `not-index`(예제 2). 첫 단계 '실행 전'(빈 상태), 이후 한 줄씩.
  - View: 객체 카드마다 '배열 인덱스 키(작은 수부터)'와 '그 밖의 문자열 키(만든 순서)' 두 영역(텍스트 제목 포함), 그 아래 'Object.keys 결과' 줄. prevState와 비교해 '새로 생김'·'값 바뀜'·'지워짐'을 색과 텍스트로 표시(ArrayView 방식). 375px에서 넘치지 않게 줄바꿈.
  - concept.test.ts: 공통 불변식, 시나리오 id·label·exampleId, 단계별 실제 실행 대조(`indexKeys`+`stringKeys` = 실제 `Object.keys`, 값 표시 일치), 칸 독립 판정(`isArrayIndex`로 indexKeys 모두 참·stringKeys 모두 거짓), `isArrayIndex` = 실행 판정(`{ x: 0 }`에 넣어 `x`보다 앞) — 시나리오 키 전체와 경계 키(`'4294967294'`, `'4294967295'`, `'9007199254740991'`, `'01'`, `'-0'`, `'1.5'`)에 대해, `changed`·`removed`가 이전 단계 차이와 같음, 키 분류 표 대조(`tableBody` + 실행 판정), 본문 서술의 근거(심벌 키가 맨 뒤, 기존 키 재정의 후 위치 그대로).
  - KeyOrderView.test.tsx: reassign-delete의 다시 대입 단계에 '값 바뀜'이 보이고 '새로 생김'이 없음, delete 단계에 '지워짐'.
  - build-output.test.ts에 '시뮬레이터 프리렌더 (property-order)' 블록('단계 1: 실행 전', region aria-label, 시나리오 라벨 3개, `<details>` 수 ≥ 퀴즈 수).
- 완료 조건: `npx vitest run app/concepts/property-order` 통과, 일부러 not-index 상태에서 `'4294967294'`를 문자열 칸으로 옮기면 칸 독립 판정이 실패하는지 확인 후 되돌림.

### 4. 연결 문구

- 대상: `property-keys/meta.ts:98`, `json/content.mdx:41`, `prototype-chain/meta.ts:111`, `symbol/content.mdx:61`, 네 개념의 related, `docs/content-guide.md:225`
- 변경:
  - property-keys: "정수 형태 키가 먼저 나열되는 순서 규칙은 다루지 않으며" → "배열 인덱스 형태의 키가 먼저 나열되는 순서 규칙은 프로퍼티 순서 개념에서 다루며"(문장 나머지 유지).
  - json: 41행 `([프로퍼티 키](/concepts/property-keys))` → `([프로퍼티 순서](/concepts/property-order))`.
  - prototype-chain: "배열을 돌려주는 Object.keys 등은 별도 개념입니다." → "Object.keys 같은 함수가 키를 돌려주는 순서는 프로퍼티 순서 개념에서 다룹니다."
  - symbol: 61행 "`for...in`의 순서는 [프로토타입 체인](/concepts/prototype-chain)에서 본 대로" → "`for...in`의 순서는 [프로토타입 체인](/concepts/prototype-chain)과 [프로퍼티 순서](/concepts/property-order)에서 본 대로".
  - 네 개념 related에 `property-order`. content-guide 225행 목록에 `property-order`.
- 완료 조건: content-integrity 통과(없는 slug 0), `reviewedAt` 변경 0(`git diff -U0 | grep reviewedAt` 0줄), `grep -rn "정수 형태 키" app/concepts` 0줄.

### 5. 개념 수·학습 순서 테스트와 e2e 등록

- 대상: 4절의 테스트 파일들
- 변경: 56 → 57. navigation `학습 순서 N / 56` 35곳은 1/57 외 N+1(마지막 es-modules 57/57). 홈 '57번째'. '객체' 검색: `filterConcepts(listConcepts(), '객체')`로 실제 결과를 계산해 개수 4곳(17·32·91·126행)과 순위 배열(98-115행)을 맞춘다. helpers 상수, a11y 2개, responsive 2개 추가(기존 케이스는 고치지 않음).
- 완료 조건: `grep -rnE "/ 56|\(56\)|56번째" tests app` 0줄, 순위 배열이 계산 결과와 같음, `npx vitest run app/lib app/components` 통과.

### 6. 전체 검증

- 6절 명령과 브라우저 시나리오.
- 완료 조건: 모든 명령 통과, 브라우저 4개 확인 기록.

## 9. 추가 개선 후보

- array-index-length 예제 4 문장에서 새 페이지로 링크(결과 서술이라 이번에는 두지 않음).
- `tests/build/build-output.test.ts:632`의 primitive-methods 주석 '일곱 번째 개념'이 실제 순서와 다름(이번 작업과 무관).

## 변경 이력

- 2026-11-13 (사용자 콘텐츠 검토): 중간 1·낮음 4·선택 1 반영 — ① 흔한 오해 박스와 예제 5 해설의 "특수 객체가 없고"를 명세의 예외 4종(Proxy, TypedArray, 모듈 네임스페이스 객체, 구현이 제공하는 특수 객체)으로(Object.prototype도 immutable prototype exotic object라 '특수 객체 없음'으로 읽으면 예제 5가 조건 밖이 됨, 명세 Object prototype object 절 확인), 예제 5에 체인 `item → base → Object.prototype`과 Object.prototype에 열거 가능한 키가 없다는 문장 ② 단순화의 'OrdinaryOwnPropertyKeys 같은 명세 내부 메서드' → '추상 연산', Reflect.ownKeys가 [[OwnPropertyKeys]] 결과를 그대로 돌려준다는 점(명세 Reflect.ownKeys 단계 확인)과 이 페이지에서 다루지 않음 ③ for...in 절에 심벌 키는 나오지 않음 ④ 판 비교 문단에 EnumerableOwnPropertyNames가 현재 판 EnumerableOwnProperties의 당시 이름임 ⑤ summary를 '그 밖의 문자열 키는 그 묶음의 맨 뒤'로 ⑥ 순서 규칙 자체는 2019판에도 같았다는 문장. 함께: for...in 단순화의 '같은 특수 객체'(리뷰 Low)도 4종 목록으로. 근거 테스트 2개 추가(Object.prototype for...in 0개, for...in 심벌 제외). 재검증: lint·format·typecheck, `npm test` 4904, `test:build` 459, 새 페이지 e2e 12 통과 — 영향 단계 1·2
## 구현 진행

- baseline (2026-11-13, `45dd54e`): 직전 작업 커밋 시점에 lint·format:check·typecheck 통과 / `npm test` 4831 / `test:build` 451 / 전체 e2e 689 통과·3 skipped(그 뒤 소스 변경 없음)
- [x] 1. 예제와 meta — 예제 5개 실제 출력이 2절 기대와 일치(`tests/examples.test.ts -t property-order` 5 통과), typecheck 통과, summary 129자. 메인 수정: for...in 단순화 문장을 명세 조건(대상 객체나 체인의 특수 객체, 사건 '일어난 뒤')에 맞게 고침. MDN 링크 3개 200, 2019·2020판 `#sec-enumerableownpropertynames` id 사본에서 확인
- [x] 2. content.mdx와 route.tsx — 퀴즈 6개, 본문 링크 slug = related 5개 + 선행 개념 2개(property-keys·property-attributes). 메인 수정: 도입 문단을 `## 동작 원리` 앞으로, OrdinaryOwnPropertyKeys 설명 문장, `'-0'`은 명세 Note("\"-0\" is neither an integer index nor an array index")에 맞춰 이유를 고침(왕복 비교 설명은 명세의 CanonicalNumericIndexString이 "-0"을 따로 -0으로 돌려주므로 맞지 않음), for...in 예외 객체 이름 표기 통일, 명세 판 문장에 'ES2020판부터', 예제 5 결과 설명의 줄 번호 2~4 → 3~5. 대조: for...in 조건 문단의 예외 4종·사건 4개가 현재 초안 `sec-enumerate-object-properties` 원문과 같고, 판 변화 문단이 2019판 EnumerableOwnPropertyNames 마지막 문장 유무·2020판 CreateForInIterator 조건 문단 등장과 같음
- [x] 3. 시뮬레이터 — 48개 + 메인 추가 3개(퀴즈 2 값, Map 삽입 순서, JSON.stringify 키 순서 근거) = 51 통과. not-index에서 '4294967294'를 문자열 칸으로 옮기면 칸 독립 판정·실행 대조·View 테스트가 실패함을 서브에이전트가 확인 후 원복. 계획과 다른 점: 변경 표시는 prevState 대신 상태의 `change: 'new' | 'value'`로 그리고, 그 값이 이전 단계와의 차이와 같은지 concept.test가 검사(같은 효과, ArrayView도 상태의 changed를 씀)
- [x] 4. 연결 문구 — property-keys·json·prototype-chain·symbol 문구와 related, content-guide 목록. `정수 형태 키` 0줄, `reviewedAt` 변경 0
- [x] 5. 개념 수·학습 순서 테스트와 e2e 등록 — `/ 56`·`(56)`·`56번째` 0줄, '객체' 개수 4곳 17, 순위 배열 갱신, helpers·a11y 2·responsive 2 추가
- [x] 6. 전체 검증 — lint·format:check·typecheck 통과 / `npm test` 157 파일 4900 통과 / `test:build` 459 통과 / navigation.spec 16 통과 / `-g "property-order|프로퍼티 순서|키 순서 시뮬레이터|홈 학습 순서 보기|개념 페이지: 프로퍼티 키|개념 페이지: JSON|개념 페이지: 프로토타입 체인|개념 페이지: 심벌"` 42 통과 / 브라우저(dev 5173): 375px·다크에서 세 시나리오 끝 단계(9·7·10)까지 가로 스크롤 없음(scrollWidth 375), 콘솔 오류 0, 마지막 단계 칸 나누기 화면 확인. 프리렌더 첫 단계·퀴즈 `<details>`는 build-output 블록으로 확인. 키보드 조작은 공통 셸 기능이라 따로 확인하지 않음
- 리뷰 1차(메인 + Opus 명세 정확성 리뷰): High 1 · 명세 정확성 관련 Medium 3(프로젝트 기준으로 High 취급, 수정) · Low 다수(일부 수정)
  - 수정(High): `content.mdx` for...in 절이 "이미 나온 이름은 건너뜀"으로 써서, 열거할 수 없는 자기 키가 같은 이름의 상속된 키를 가리는 경우를 빠뜨림(명세 "already been processed … [[Enumerable]] … not considered", 실행 `y`) → "이미 처리한 이름(열거 불가 자기 키 포함)"으로 고치고 근거 테스트 추가. 첫 문장의 무조건 단정도 조건부로 재배치
  - 수정: summary·goals·본문의 "delete 뒤 다시 만들면 맨 뒤"를 그 밖의 문자열 키로 한정(배열 인덱스 키는 숫자 자리로 돌아감, 실행 `1,a,b`, 근거 테스트 추가)
  - 수정: defineProperty 재정의 문장을 "어트리뷰트만 바꾸는 경우"로 한정하고 ValidateAndApplyPropertyDescriptor의 만들기/바꾸기 분기를 근거로 밝힘(전환은 replace라 다루지 않음과 충돌 제거)
  - 수정: 시뮬레이터 단계 설명·퀴즈 해설의 단독 '문자열 키'를 '그 밖의 문자열 키'로 통일(배열 인덱스 키도 문자열이라는 본문과 어긋남), Callout과 for...in 절에 '열거하는 도중' 한정
  - 수정 후: `npm test` 4902 / `test:build` 459 / 새 페이지 e2e 12 통과, lint·typecheck·format 통과
  - Low(남김): `content.mdx` 표·본문의 '-0' 이유가 "명세가 배열 인덱스가 아니라고 밝힘"이라 이유가 약함 / 마지막 문단 JSON.stringify 키 순서에 'replacer 배열이 없을 때' 한정 없음 / 판 변화 문단 "같은 판에서 위에서 본 조건 문단" — 2020판은 TypedArray 대신 Integer-Indexed exotic object 표기(같은 취지) / `meta.ts` for...in 단순화의 "Proxy·TypedArray·모듈 네임스페이스 같은 특수 객체"는 4종 목록이 아닌 예시처럼 읽힘 / 퀴즈 2(`{ b, 10, a, 9 }`)는 examples 파일이 아니라 concept.test로만 대조 / es-modules(모듈 네임스페이스 키 순서)·spread-destructuring(스프레드 키 자리)과의 연결 검토
- 마무리: 사용자 콘텐츠 검토 반영 후 최종 승인(2026-11-13)으로 `reviewedAt: '2026-11-13'` 기록(content-guide 10단계). content-integrity 745·`test:build` 459 통과, 빌드 HTML `dateModified` 2026-11-13, '검토 중' 배지 없음

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 1·3·4·5단계는 Sonnet 서브에이전트가, 본문 2단계는 서브에이전트 초안을 메인이 검토·수정했다.
- 계획과 다른 점: 시뮬레이터 변경 표시는 `prevState` 대신 상태의 `change: 'new' | 'value'`로 그리고, concept.test가 이전 단계 차이와 같은지 검사한다(같은 효과).
- 추가: 퀴즈 2·Map·JSON·delete 뒤 배열 인덱스 키·열거 불가 키의 가림·Object.prototype·for...in 심벌 제외의 본문 근거 테스트(계획의 '본문 서술의 근거'를 본문 최종 문장에 맞춰 늘림).

### 코드 리뷰

- Opus 명세 정확성 리뷰의 High 1(for...in '이미 처리한 이름')과 명세 정확성 Medium 3(delete 한정, defineProperty 재정의 한정, '그 밖의 문자열 키' 용어)을 수정했다. 사용자 콘텐츠 검토 6건(변경 이력)도 반영했다.
- 남긴 Low: '-0' 이유 문장, JSON.stringify의 replacer 한정, 2020판 TypedArray 표기, 퀴즈 2가 examples 파일이 아님, es-modules·spread-destructuring 연결(구현 진행 기록).

### 후속 작업

- [ ] (선택) 남긴 Low 5건 정리
- [ ] (선택) array-index-length 예제 4 문장에서 새 페이지로 링크(9절)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터의 두 칸 나누기를 이어 붙인 결과가 아니라 `isArrayIndex`로 따로 판정하고, 그 판정을 다시 실행(`{ x: 0 }`에 넣어 `x`보다 앞에 나오는지)과 대조했다 — 이어 붙인 결과만 보면 경계 키를 잘못된 칸에 둬도 같은 `Object.keys`가 나와 통과한다(교차 검토 Architect·Critic 지적, `concept.test.ts` 칸 독립 판정).
- [Claude 판단] 리뷰 지적 중 명세 정확성 Medium 3건을 프로젝트 기준(명세와 다른 설명은 결과가 맞아도 심각)으로 High처럼 보고 수정했다 — delete 뒤 맨 뒤는 그 밖의 문자열 키만, defineProperty는 어트리뷰트만 바꾸는 재정의만, 배열 인덱스 키도 문자열이므로 '그 밖의 문자열 키'로 통일.
- [무검토 승인] 학습 순서를 order 175(prototype-chain 다음)로 두고, 배열·심벌·Map·JSON은 예제로 쓰지 않고 링크와 개념 이름으로만 가리켰다 — 페이지는 프로토타입 장까지를 전제로 한다(content-guide 238행).
- [무검토 승인] 명세 판 변화는 2019판·2020판 문장 차이로만 한정했다 — 그 이전 판 문구와 엔진의 실제 동작은 사본으로 확인하지 않았다.
- 시각화는 키 목록 시뮬레이터, for...in은 한 절, symbol 페이지와 일부 겹쳐도 진행, 연결 문구 4곳 모두(사용자 결정).
- for...in 조건을 '특수 객체 없음'이 아니라 명세의 예외 4종으로 쓴다(사용자 검토) — `Object.prototype`도 immutable prototype exotic object라서 '특수 객체 없음'으로 읽으면 예제 5가 조건 밖이 된다.

#### 배경지식

- OrdinaryOwnPropertyKeys는 배열 인덱스(CanonicalNumericIndexString이 +0~2^32 − 2의 정수를 돌려주는 키, "-0"은 아님) → 그 밖의 문자열 키(만든 순서) → 심벌 키(만든 순서)로 키를 돌려준다. Object.keys·values·entries는 EnumerableOwnProperties로 이 목록에서 열거 가능한 문자열 키만 고른다.
- '만든 순서'에서 다시 대입과 어트리뷰트만 바꾸는 defineProperty는 ValidateAndApplyPropertyDescriptor의 '바꾸기' 분기라 새로 만들지 않고, delete(OrdinaryDelete) 뒤 대입은 '만들기' 분기다.
- for...in(EnumerateObjectProperties)은 원칙적으로 순서를 정하지 않지만, 예외 4종이 없고 열거 도중 네 사건이 없으면 CreateForInIterator 순서를 따라야 한다. 이미 처리한 이름은 열거 가능 여부와 관계없이 건너뛴다.

#### 확인 질문

1. 시뮬레이터 상태에서 `'4294967294'`를 문자열 칸 맨 앞에 두면 `indexKeys + stringKeys`는 실제 `Object.keys`와 같을까? 그런데도 왜 테스트가 실패하나?
   <details><summary>답</summary>이어 붙인 순서는 같아서 실행 대조만으로는 통과할 수 있다. 칸 독립 판정이 `isArrayIndex('4294967294')`가 참인데 문자열 칸에 있다고 실패시킨다(`concept.test.ts` 칸 독립 판정, 구현 진행 3단계 되돌림 확인).</details>
2. `{ 1: 1, a: 2, b: 3 }`에서 `delete o[1]; o[1] = 1` 뒤 `Object.keys`는? 요약을 "delete 뒤 다시 만들면 맨 뒤"로만 쓰면 무엇이 틀리나?
   <details><summary>답</summary>`["1","a","b"]`. 배열 인덱스 키는 다시 만들어도 숫자 크기 자리로 돌아가므로, 맨 뒤로 가는 것은 그 밖의 문자열 키뿐이다(본문 '만든 순서'의 뜻, 근거 테스트).</details>
3. 예제 5의 체인 끝 `Object.prototype`은 특수 객체인데, 왜 명세가 for...in 순서를 정하는 경우에 들어가나?
   <details><summary>답</summary>명세가 제외하는 것은 Proxy, TypedArray, 모듈 네임스페이스 객체, 구현이 제공하는 특수 객체 4종뿐이다. `Object.prototype`(immutable prototype exotic object)은 이 목록에 없다(변경 이력 사용자 검토 ①).</details>
4. 자기 프로퍼티 `x`를 열거 불가로 만들고 프로토타입에 열거 가능한 `x`가 있으면 for...in에 `x`가 나오나?
   <details><summary>답</summary>나오지 않는다. 명세는 이미 처리한(processed) 이름을 건너뛰고 [[Enumerable]]은 따지지 않으므로, 출력되지 않은 자기 키도 상속된 키를 가린다(리뷰 High 수정, 근거 테스트 결과 `y`).</details>
5. "Object.keys 순서는 ES2020부터 생겼다"는 말은 왜 부정확한가?
   <details><summary>답</summary>OrdinaryOwnPropertyKeys의 세 묶음 순서는 2019판에도 같았다. 2020판에서 바뀐 것은 EnumerableOwnPropertyNames가 결과를 for...in 순서에 맞추라는 문장이 없어져, Object.keys 같은 함수가 [[OwnPropertyKeys]] 순서를 그대로 쓰게 된 연결이다(본문 명세 판에 따른 변화).</details>

