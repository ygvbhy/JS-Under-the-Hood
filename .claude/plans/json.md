# 개념 'JSON' 구현 계획

- 상태: 완료
- 작성일: 2026-11-05
- 기준: `main` @ `1be09da`

## 0. 요약

- 목적: 43~48장 로드맵 1번 `/concepts/json`을 추가한다. 43장 JSON에서 `undefined`·함수·심벌이 객체에서는 빠지고 배열에서는 `null`이 되는 이유(SerializeJSONProperty가 `undefined`를 돌려줌), 숫자·Date·래퍼 객체의 변환, 자기 열거 가능 문자열 키만 직렬화하는 이유, 직접 만든 `toJSON`, replacer·space, `JSON.parse`와 reviver, 깊은 복사로 쓸 때 잃는 것을 예제 8개와 값별 결과표로 명세 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `objects`, order 420으로 학습 순서 44번째·마지막, 값별 결과표 + 퀴즈). 마지막 개념과 '객체' 검색 결과가 바뀌므로 고정 테스트, e2e·빌드 테스트, content-guide, 로드맵 문서를 고친다. 공통 코드와 기존 개념 43개는 바꾸지 않는다.
- 위험: ① 결과의 원인을 "JSON은 undefined를 지원하지 않아서" 같은 말로 넘기고 명세 절차(SerializeJSONProperty → SerializeJSONObject/Array)로 설명하지 않음 ② 깊은 복사 절에서 "복사"를 엔진 동작처럼 쓰거나 호스트 API(`structuredClone`)를 언어 기능처럼 씀 ③ ES2026판에 추가된 `JSON.rawJSON`·reviver의 세 번째 인수를 책 범위 서술과 섞음 → 명세 원문 이름으로 설명하고 판 경계는 단순화에 밝힘.
- 복잡도: 중간 · Consensus: 생략. 직전 set-map과 같은 "실행 검증 표 + 퀴즈" 패턴이고 공통 코드를 바꾸지 않는다. 예제 출력 8개·표 39칸·근거 테스트 주장은 명세 원문(현재 초안 ES2027, ES2020·2025·2026판)과 vm 실행으로 미리 확인했다.
- 미확정: 없음(추가 주제 4개·slug·제목·카테고리는 2026-11-05 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 1번 "JSON.stringify가 빼는 값"(43장)을 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch43-48.md`).
- 사용자 결정(2026-11-05)
  - 기본 범위: ① `undefined`·함수·심벌 — 객체에서는 프로퍼티가 빠지고 배열에서는 `null`, 최상위에서는 `undefined` 반환 ② `NaN`·`Infinity`는 `null`, `-0`은 `0` ③ Date는 `toJSON`을 거쳐 문자열, `JSON.parse`로 되돌려도 문자열 ④ 자기 열거 가능 문자열 키만 직렬화 ⑤ BigInt·순환 참조는 TypeError.
  - 추가 주제 4개 모두: **JSON.parse와 reviver**, **replacer와 space**, **직접 만든 toJSON**, **깊은 복사로 쓸 때 잃는 것**.
  - 시각화: **값별 결과표 + 퀴즈**(로드맵 확정).
  - slug `json`, 제목 "JSON: undefined는 왜 사라질까", category `objects`.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 값 하나를 바꾸는 SerializeJSONProperty(예제 1 `omitted-values.js`): `JSON.stringify`는 값을 빈 문자열 키로 감싼 객체(wrapper)를 만들고 SerializeJSONProperty로 시작한다. SerializeJSONProperty는 `null`·불리언·문자열·유한한 숫자·객체(호출할 수 없는 것)만 문자열로 바꾸고, `undefined`·함수(IsCallable)·심벌은 어느 분기에도 걸리지 않아 마지막 단계 "Return undefined"에 닿는다. 이 `undefined`를 받는 쪽이 다르게 처리한다 — SerializeJSONObject는 그 프로퍼티를 결과에 넣지 않고(`stringP`가 undefined면 member를 만들지 않음), SerializeJSONArray는 `"null"`을 넣는다, 최상위면 `JSON.stringify`가 `undefined`를 그대로 돌려준다(문자열이 아님). 명세 Note 5 원문 인용. `null`은 `"null"`로 남는다. 심벌 키·심벌 값은 [심벌](/concepts/symbol)에서 본 내용과 이어진다고 한 줄.
  - ② 숫자와 래퍼 객체(예제 2 `numbers.js`): 유한한 숫자는 ToString으로 바꾸므로 `-0`은 `"0"`, `1e21`은 `1e+21`([숫자 타입](/concepts/number-type)). `NaN`·`Infinity`·`-Infinity`는 `"null"`(Note 4). `new Number(7)`·`new String('7')`·`new Boolean(false)`는 `[[NumberData]]` 등 내부 슬롯을 보고 원시 값으로 바꾼 뒤 직렬화([원시 값의 메서드](/concepts/primitive-methods)). 배열의 구멍은 Get이 `undefined`를 돌려줘 `null`이고 `length`는 그대로([배열은 객체다](/concepts/array-index-length)). BigInt는 TypeError — try...catch가 47장이라 예제가 아니라 본문 문장 + 근거 테스트.
  - ③ toJSON과 Date(예제 3 `date-tojson.js`): SerializeJSONProperty는 값이 객체(또는 BigInt)면 먼저 `toJSON` 메서드를 찾아(GetV — 프로토타입 체인 포함) 부르고 그 반환값을 직렬화한다. `Date.prototype.toJSON`은 시간 값이 유한하지 않으면 `null`, 아니면 `toISOString`을 부른다. 그래서 Date는 문자열이 되고, `JSON.parse`는 그 문자열을 Date로 되돌릴 근거가 없으므로 문자열 그대로(`typeof` string, `instanceof Date` false).
  - ④ 자기 열거 가능 문자열 키만(예제 4 `own-enumerable.js`): SerializeJSONObject는 replacer 배열이 없으면 키를 EnumerableOwnProperties(key)로 모은다 — 자기 프로퍼티 중 키가 문자열이고 `[[Enumerable]]`이 true인 것. 상속 프로퍼티([프로토타입 체인](/concepts/prototype-chain)), `enumerable: false`인 프로퍼티([프로퍼티 어트리뷰트](/concepts/property-attributes)), 심벌 키는 빠진다. 배열은 SerializeJSONArray가 0부터 `length` 앞까지의 인덱스만 읽어 인덱스가 아닌 프로퍼티(`scores.label`)는 빠진다(SerializeJSONArray Note). 키 순서는 OrdinaryOwnPropertyKeys 순서(정수 키 먼저, [프로퍼티 키](/concepts/property-keys)).
  - ⑤ 직접 만든 toJSON(예제 5 `custom-tojson.js`): 객체에 `toJSON` 메서드를 두면 그 반환값이 대신 직렬화된다. 인수 `key`는 그 값이 들어 있던 프로퍼티 이름 — 객체 프로퍼티면 이름, 배열 요소면 인덱스 문자열 `"0"`, 최상위면 빈 문자열(wrapper의 키). `toJSON`이 `undefined`를 돌려주면 ①과 같은 이유로 프로퍼티가 빠진다. `toJSON`이 함수가 아닌 값이면 일반 프로퍼티로 직렬화된다(근거 테스트).
  - ⑥ replacer와 space(예제 6 `replacer-space.js`): 함수 replacer는 `toJSON` 다음에, 그 값을 가진 객체(holder)를 `this`로 하여 `(key, value)`로 불린다. 첫 호출은 wrapper의 빈 문자열 키라 `keys`의 첫 원소가 `""`이고 value는 최상위 값 전체. 반환값이 직렬화된다(숫자를 두 배로). 배열 replacer는 PropertyList가 되어 **모든 깊이의** 객체에서 그 키만 고른다(`buyer`의 `name`도 빠짐). 배열의 요소는 PropertyList와 상관없이 직렬화된다(근거 테스트). space는 숫자면 최대 10칸 공백, 문자열이면 앞 10자까지를 들여쓰기로 쓴다(근거 테스트: 20 → 10칸).
  - ⑦ JSON.parse와 reviver(예제 7 `parse-reviver.js`): `JSON.parse`는 ECMA-404 JSON 문법만 받는다(명세 JSON Object 머리말 "without any deletions or extensions"). 작은따옴표 문자열, 끝 쉼표, 따옴표 없는 키, `undefined`·`NaN`, 빈 문자열, `01`은 SyntaxError(근거 테스트). 결과 객체는 일반 객체·배열이다(`Object.prototype` — 근거 테스트). reviver가 있으면 InternalizeJSONProperty가 값을 깊은 곳부터 방문한다 — 객체·배열이면 자식을 먼저 처리한 뒤 자기 자신에 대해 reviver를 부르므로 배열 요소 `"0"`이 `tags`보다 먼저, 맨 마지막이 빈 문자열 키(최상위). reviver가 `undefined`를 돌려주면 그 프로퍼티를 지우고(`draft`), 다른 값이면 그 값으로 바꾼다(`at` → Date). 최상위 원시 값 `JSON.parse('42')`는 숫자 42.
  - ⑧ 깊은 복사로 쓸 때 잃는 것(예제 8 `deep-copy.js`): `JSON.parse(JSON.stringify(x))`는 ①~⑦의 규칙을 그대로 거친 결과다 — 생성자 함수로 만든 객체는 ④에 따라 자기 프로퍼티만 남고 `JSON.parse`가 일반 객체를 만들어 `instanceof Point`가 false, Map은 엔트리가 프로퍼티가 아니라 `{}`([Set과 Map](/concepts/set-map)), Date는 문자열, `undefined` 프로퍼티는 빠짐. `stringify`는 [[Stack]]으로 지금 직렬화 중인 객체만 검사하므로 **같은 객체를 두 번 만나는 것은 순환이 아니어서** 두 번 직렬화되고, `parse`는 텍스트마다 새 객체를 만든다 — 원본의 `left === right`(true)가 사본에서는 false, `copy.left`를 바꿔도(변경) `copy.right`는 그대로. 순환 참조는 [[Stack]]에 이미 있어 TypeError(Note 1, 근거 테스트). "복사"는 결과를 가리키는 말로만 쓰고 원인은 직렬화·파싱 절차로 설명([원시 값과 객체](/concepts/primitives-and-objects)). `structuredClone`은 HTML 표준이 정한 호스트 API라 다루지 않는다고 한 줄.
  - ⑨ 값별 결과표(표): 3절 표.

### 유지해야 하는 기존 동작

- 기존 개념 43개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만). 기존 페이지의 "JSON.stringify는 43장에서 다루는 주제" 문구(`symbol`, `set-map` 등 meta.ts)의 역방향 링크는 사용자 결정대로 나중에 일괄 처리한다.
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 표는 정적 마크업이라 JS 없이 보인다.

### 제외 범위

- 43장의 Ajax·XMLHttpRequest, 44장 REST API(로드맵에서 제외)
- `JSON.rawJSON`·`JSON.isRawJSON`, reviver의 세 번째 인수(context, `source`) — ES2026판에 추가, 단순화에 이름만
- 문자열 이스케이프 세부(QuoteJSONString, 짝 없는 서로게이트) — [문자열 길이와 UTF-16](/concepts/string-utf16)에서 다룬 범위, 단순화에 한 줄
- `structuredClone`(호스트 API), 깊은 복사 구현 방법, 성능
- `BigInt.prototype.toJSON`을 직접 정의하는 우회, replacer 배열에 Number·String 객체를 넣는 경우, `JSON.parse`의 `__proto__` 키

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안(ES2027), 2026-11-03에 받은 사본 `scratchpad/js/spec.html`, 판 비교는 `spec2020.html`·`spec2025.html`·`spec2026.html`. 이 세션 샌드박스에서는 tc39.es에 접속하지 못해 이전 세션 사본을 썼다 — 단계 1에서 링크와 함께 현재 판을 다시 확인)

- JSON Object(`#sec-json-object`): `parse`·`stringify` 두 함수, "Conforming implementations of JSON.parse and JSON.stringify must support the exact interchange format described in ECMA-404 without any deletions or extensions to the format."
- `JSON.stringify`(`#sec-json.stringify`): replacer가 함수면 ReplacerFunction, 배열이면 PropertyList(문자열·숫자, 중복 제거). space는 숫자면 `min(10, …)`칸 공백(1 미만이면 빈 문자열), 문자열이면 앞 10자. wrapper(`OrdinaryObjectCreate(%Object.prototype%)`)에 빈 문자열 키로 value를 넣고 `SerializeJSONProperty(state, "", wrapper)`. Note 1(순환이면 TypeError), Note 2(`undefined` is not rendered), Note 4(NaN·±∞ → `"null"`), Note 5 원문: "Values that do not have a JSON representation (such as undefined and functions) do not produce a String. Instead they produce the undefined value. In arrays these values are represented as the String value "null". In objects an unrepresentable value causes the property to be excluded from stringification."
- SerializeJSONProperty(`#sec-serializejsonproperty`): `Get(holder, key)` → 객체 또는 BigInt면 `GetV(value, "toJSON")`이 호출 가능하면 `Call(toJSON, value, « key »)` → ReplacerFunction이 있으면 `Call(replacer, holder, « key, value »)` → 객체면 (현재 초안·ES2026판: `[[IsRawJSON]]`이면 rawJSON 반환) `[[NumberData]]`·`[[StringData]]`·`[[BooleanData]]`·`[[BigIntData]]`를 원시 값으로 → `null`/`true`/`false`/문자열(QuoteJSONString)/유한 숫자(ToString)/비유한 숫자 `"null"` → BigInt면 TypeError → 호출할 수 없는 객체면 IsArray로 SerializeJSONArray 또는 SerializeJSONObject → "Return undefined". ES2020판도 `[[IsRawJSON]]` 단계만 없고 같은 순서(확인).
- SerializeJSONObject(`#sec-serializejsonobject`): `[[Stack]]`에 value가 있으면 TypeError("because the structure is cyclical"), PropertyList가 없으면 `EnumerableOwnProperties(value, key)`, 각 키의 `stringP`가 undefined가 아니면 member 추가, 끝나면 Stack에서 제거.
- SerializeJSONArray(`#sec-serializejsonarray`): 같은 Stack 검사, `LengthOfArrayLike`로 0..length-1 각각 SerializeJSONProperty, undefined면 `"null"`. Note: "Properties whose keys are not array indices are excluded from the stringification." PropertyList를 쓰지 않는다.
- EnumerableOwnProperties(`#sec-enumerableownproperties`): `[[OwnPropertyKeys]]` 중 문자열 키이고 `[[Enumerable]]`이 true인 것.
- `JSON.parse`(`#sec-json.parse`): `ParseJSON` 결과, reviver가 호출 가능하면 root 객체(빈 문자열 키)로 `InternalizeJSONProperty`. InternalizeJSONProperty(`#sec-internalizejsonproperty`): 객체면 배열은 인덱스마다, 아니면 EnumerableOwnProperties의 키마다 재귀하고 결과가 undefined면 `[[Delete]]`, 아니면 CreateDataProperty, 마지막에 `Call(reviver, holder, « name, value, context »)`(현재 초안·ES2026판. ES2025판까지는 `« name, val »`).
- `Date.prototype.toJSON`(`#sec-date.prototype.tojson`): `ToPrimitive(obj, number)`가 유한하지 않은 숫자면 `null`, 아니면 `Invoke(obj, "toISOString")`. Note 2: 일부러 범용(generic).
- 판 경계: `JSON.rawJSON`(`#sec-json.rawjson`)과 reviver의 context 인수는 ES2026판에 있고 ES2025판에 없다(사본 grep·추출로 확인).

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/3d862c42-a841-44a9-88c8-d28c01005883/scratchpad/js/ex/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `omitted-values.js` | `{"name":"kim"}` / `["kim",null,null,null]` / `undefined undefined undefined` / `null {"empty":null}` |
| 2 `numbers.js` | `{"avg":null,"max":null,"min":null,"zero":0}` / `[null,null,0,1e+21]` / `[7,"7",false]` / `[1,null,3] 3` |
| 3 `date-tojson.js` | `{"title":"standup","at":"2026-11-05T09:30:00.000Z"}` / `string false` / `function {"at":null}` |
| 4 `own-enumerable.js` | `{"name":"lee"} proto secret` / `[90,80] math` / `{"1":"a","2":"b","z":"z"}` |
| 5 `custom-tojson.js` | `{"total":"1200 KRW (total)"}` / `["1200 KRW (0)"]` / `"1200 KRW ()"` / `{"a":1}` |
| 6 `replacer-space.js` | `{"id":14,"item":"pen","qty":4,"buyer":{"id":6,"name":"park"}}` / `["","id","item","qty","buyer","id","name"]` / `{"id":7,"buyer":{"id":3}}` / `["{","--\"a\": 1,","--\"b\": [","----2","--]","}"]` |
| 7 `parse-reviver.js` | `true 9 false` / `["title","at","draft","0","tags",""]` / `42 true true` |
| 8 `deep-copy.js` | `false {"x":1}` / `{} string false` / `true false` / `1 1` |

- 값별 결과표(행마다 준비 코드 `var x = <식>;`, 열마다 probe, 결과가 `undefined`면 표에 "반환값 `undefined`", 예외면 이름):

| 값 `x` | `JSON.stringify({ v: x })` | `JSON.stringify([x])` | `JSON.stringify(x)` |
| - | - | - | - |
| `undefined` | `{}` | `[null]` | 반환값 `undefined` |
| `function () {}` | `{}` | `[null]` | 반환값 `undefined` |
| `Symbol('s')` | `{}` | `[null]` | 반환값 `undefined` |
| `null` | `{"v":null}` | `[null]` | `null` |
| `NaN` | `{"v":null}` | `[null]` | `null` |
| `Infinity` | `{"v":null}` | `[null]` | `null` |
| `-0` | `{"v":0}` | `[0]` | `0` |
| `'hi'` | `{"v":"hi"}` | `["hi"]` | `"hi"` |
| `new Date(0)` | `{"v":"1970-01-01T00:00:00.000Z"}` | `["1970-01-01T00:00:00.000Z"]` | `"1970-01-01T00:00:00.000Z"` |
| `new Number(1)` | `{"v":1}` | `[1]` | `1` |
| `new Map([[1, 2]])` | `{"v":{}}` | `[{}]` | `{}` |
| `1n` | TypeError | TypeError | TypeError |
| 순환 객체(`var x = {}; x.self = x;`) | TypeError | TypeError | TypeError |

  - probe 실행 형태(테스트 코드 안에서만 try 사용): `var r; try { r = <probe>; r === undefined ? '(undefined)' : r } catch (e) { e.name }`. 순환 행의 세 칸도 실행해 모두 TypeError임을 확인했다(감싸도 내부 `self`에서 Stack 검사에 걸림).
- 근거 테스트로 쓸 것(실행 확인): TypeError — `JSON.stringify({ n: 1n })`, `JSON.stringify(1n)`, 순환 객체·순환 배열. 성공 — 같은 객체를 두 번 담은 배열 `[s, s]` → `[{},{}]`. SyntaxError — `JSON.parse` of `{'a':1}`, `{"a":1,}`, `undefined`, `NaN`, `{a:1}`, `''`, `01`. 그 밖 — 배열 replacer는 배열 요소를 거르지 않음(`JSON.stringify({a:[{a:1,b:2},5],b:1}, ['a'])` → `{"a":[{"a":1},5]}`), replacer 첫 호출의 `this['']`가 value(true), 하위 호출의 `this`는 holder, `toJSON`이 replacer보다 먼저(`{d: new Date(0)}`에서 replacer가 받는 값의 typeof `string`), space 20 → 10칸, space `'--'`, 함수가 아닌 `toJSON`은 일반 프로퍼티(`{"toJSON":1,"a":2}`), 상속한 `toJSON`도 쓰임(`["P"]`), `Date.prototype.toJSON`은 범용(`toISOString`만 있으면 됨), `JSON.parse('{}')`의 프로토타입은 `Object.prototype`, 자기 getter는 값으로 직렬화(`{"g":1}`)·프로토타입의 getter는 빠짐(`{}`).

### 사실 (코드에서 확인)

- 겹치는 기존 개념: `symbol`이 JSON.stringify의 심벌 키·심벌 값 처리(`app/concepts/symbol/content.mdx:51-55`), `set-map`이 Map의 `JSON.stringify` → 프로퍼티만(`app/concepts/set-map/content.mdx` 예제 7), `string-utf16`이 짝 없는 서로게이트 이스케이프를 다룬다. 이 페이지는 이 내용을 링크로 잇고 반복 설명하지 않는다.
- 표 패턴: `app/concepts/set-map/sameness-table.ts`(columns·rows, 칸마다 새 vm 컨텍스트), 표 렌더링 `app/concepts/set-map/content.mdx:46-80`(`role="region"`·`tabIndex={0}`·`aria-label`·`overflow-x-auto`·`[&_code]:whitespace-nowrap`, `th scope`). 근거 테스트 형태 `app/concepts/set-map/concept.test.ts:1-30`(`errorName` — 다른 realm 오류라 name 비교). route 템플릿 `app/concepts/set-map/route.tsx`.
- 현재 마지막 개념 event-loop(order 410, 43번째). order 420이면 44번째이자 마지막. category 타입 `app/lib/concepts.ts:1-2`.
- 검색: `filterConcepts`는 title·summary·tags 부분 일치. 새 summary에 '객체'가 들어가므로 홈 '객체' 검색이 14→15개, 순위 목록 끝에 `'44'`(`tests/e2e/navigation.spec.ts:17,32,91,124`, ranks 배열 `:98-113`).
- 고정값(현재 43·마지막 event-loop): `tests/e2e/navigation.spec.ts`(카드 43 `:78,:137`, 마지막 '43번째'·제목 `:84-87`, pager 분모 `/ 43` 전부, event-loop '43 / 43' 블록 `:450-454`), `tests/e2e/responsive.spec.ts:1056`(홈 학습 순서 카드 43), `app/lib/concepts.test.ts:104,108-112`, `app/components/concept/ConceptPager.test.tsx:18,27-33`. 직전 커밋 `1be09da`의 같은 파일 변경을 본뜬다.
- e2e·빌드 등록 위치: `tests/e2e/helpers.ts:71-72`(경로 상수 뒤), `tests/e2e/a11y.spec.ts:808-814`(set-map 표 페이지 케이스 형태, event-loop 케이스 `:886` 뒤에 추가), `tests/e2e/responsive.spec.ts:914`(set-map 형태, event-loop 케이스 뒤), `tests/build/build-output.test.ts:975-990`(set-map describe 형태, event-loop describe `:1132` 뒤), `docs/content-guide.md:214` e2e 목록.
- e2e 이름: 기존 e2e 제목에 'json'·'JSON'이 없다(grep 0건). 새 케이스 이름은 `/concepts/json: 가로 스크롤이 없다`, `개념 페이지: JSON` → `-g "/concepts/json|개념 페이지: JSON|홈 학습 순서 보기"`(단계 4에서 `--list` 확인).

### 추정

- MDN ko 링크(`Global_Objects/JSON/stringify`, `Global_Objects/JSON/parse`, `Global_Objects/Date/toJSON`)는 존재할 것으로 보지만 이 세션 샌드박스에서 네트워크가 막혀 확인하지 못했다 — 단계 1 완료 조건에서 200 확인(안 되면 en-US로).

## 3. 구현 전략

- 페이지 축: "`JSON.stringify`는 값마다 SerializeJSONProperty를 부르고, JSON으로 나타낼 수 없는 값이면 `undefined`를 돌려준다. 그 `undefined`를 객체는 빼고 배열은 `null`로 채우고 최상위는 그대로 돌려준다. `toJSON`·replacer는 그 앞에 끼어드는 단계이고, `JSON.parse`는 문자열만 보고 값을 만든다." 원인은 명세 이름(SerializeJSONProperty, SerializeJSONObject, SerializeJSONArray, EnumerableOwnProperties, InternalizeJSONProperty)으로 설명하고 절 번호는 라벨에 쓰지 않는다. 판 차이(rawJSON, reviver context)는 단순화에만.
- 값별 결과표(`value-table.ts` + content.mdx 표)
  - 데이터: `export const columns = [{ key: 'property', label: 'JSON.stringify({ v: x })', probe: 'JSON.stringify({ v: x })' }, { key: 'element', label: 'JSON.stringify([x])', … }, { key: 'top', label: 'JSON.stringify(x)', … }]`(세 열 모두 코드라 `<code>`), `export const rows: { value: string; setup: string; cells: [Cell, Cell, Cell] }[]` — 13행(2절 표 순서). `Cell`은 `{ json: string } | { undefined: true } | { error: 'TypeError' }` 대신 단순하게 `string`으로 두고 특수값 상수 `RETURNS_UNDEFINED = '(undefined)'`를 쓴다(테스트 probe의 결과 문자열과 그대로 비교, 표에서는 "반환값 `undefined`", `TypeError`는 굵게 없이 텍스트).
  - 렌더: set-map 표 마크업 그대로(`aria-label="값마다 객체 프로퍼티, 배열 요소, 최상위 값으로 JSON.stringify한 결과를 비교한 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)"`, 첫 열 `th scope="row"`에 `<code>`, JSON 결과 칸은 `<code>`). 표 위 문단에 열마다 무엇을 실행했는지와 "칸마다 실제로 실행해 대조"를 쓴다. 표 아래 문단: 처음 세 행에서 같은 `undefined`가 열마다 다르게 쓰이는 것이 ①의 세 가지 처리이고, `NaN`·`-0`·Date·래퍼는 열과 상관없이 같은 문자열이 된다.
- 테스트(`concept.test.ts`)
  - ① 표 근거: 13행 × 3열, 칸마다 새 vm 컨텍스트에서 `setup` + probe 결과가 `cells[i]`.
  - ② 본문 주장 근거: 2절 "근거 테스트로 쓸 것" 전부.
- 장 범위: 43장까지. 예제에 `Object.create`(19장)·`Object.defineProperty`(16장)·Symbol(33장)·Map(37장)·Date(30장)·생성자 함수(17장)를 쓴다. try...catch(47장)는 예제에 쓰지 않고 TypeError·SyntaxError는 본문 문장 + 근거 테스트.
- meta
  - slug `json`, title "JSON: undefined는 왜 사라질까", category `objects`, order 420, `reviewedAt: null`
  - summary(안, 구현 때 160자 이하 확인): "JSON.stringify는 undefined·함수·심벌을 객체에서는 빼고 배열에서는 null로 씁니다. NaN과 Date가 어떻게 바뀌는지, toJSON·replacer·reviver와 깊은 복사로 쓸 때 잃는 것까지 명세로 확인합니다."
  - tags: JSON, JSON.stringify, JSON.parse, 직렬화, toJSON, replacer, reviver, 깊은 복사, 역직렬화
  - goals 4개: ① `undefined`·함수·심벌이 객체·배열·최상위에서 다르게 쓰이는 이유를 SerializeJSONProperty와 그 호출자로 설명 ② 숫자·래퍼 객체·Date가 바뀌는 결과와 자기 열거 가능 문자열 키만 직렬화되는 이유 ③ `toJSON`·replacer·space·reviver가 끼어드는 순서와 인수(`key`, `this`)로 결과를 예측 ④ `JSON.parse(JSON.stringify(x))`가 잃는 것(프로토타입, Map, Date, `undefined`, 같은 객체를 가리키던 참조)과 순환 참조가 TypeError인 이유
  - prerequisites: 프로퍼티 어트리뷰트(`property-attributes`), 프로토타입 체인(`prototype-chain`), 심벌(`symbol`)
  - related: `symbol`, `set-map`, `property-attributes`, `prototype-chain`, `property-keys`, `primitive-methods`, `number-type`, `primitives-and-objects`
  - simplifications: ECMA-404 문법 세부와 문자열 이스케이프(QuoteJSONString, 짝 없는 서로게이트)는 다루지 않음 / `JSON.rawJSON`·`JSON.isRawJSON`·reviver 세 번째 인수(context)는 ES2026판에 추가된 기능이라 다루지 않으며 본문의 알고리즘 설명은 그 단계를 뺀 것 / BigInt·순환 참조의 TypeError와 `JSON.parse`의 SyntaxError는 try...catch(47장) 대신 이 페이지의 테스트로 확인 / 깊은 복사의 대안 `structuredClone`은 HTML 표준이 정한 호스트 API라 다루지 않음 / replacer 배열의 숫자·래퍼 객체 항목, `JSON.parse`의 `__proto__` 키 같은 세부는 다루지 않음 / "복사"·"사본"은 결과를 부르는 말이며 엔진이 값을 복사한다는 뜻이 아님 / `console`은 호스트 API
  - references: 2절 anchor 중 본문에 쓰는 것(`#sec-json-object`, `#sec-json.stringify`, `#sec-serializejsonproperty`, `#sec-serializejsonobject`, `#sec-serializejsonarray`, `#sec-enumerableownproperties`, `#sec-json.parse`, `#sec-internalizejsonproperty`, `#sec-date.prototype.tojson`) + ES2026판 `#sec-json.rawjson` + MDN ko 3개(JSON.stringify, JSON.parse, Date.prototype.toJSON)
- 버린 대안
  - ① 직렬화 단계 시뮬레이터: 사용자 결정(값별 결과표 + 퀴즈).
  - ② 표에 "parse로 되돌린 값" 열: 칸 내용이 값이 아니라 설명이 되어 실행 대조가 어색하다. 되돌림은 예제 3·8이 보인다.
  - ③ try...catch로 TypeError를 예제에서 출력: 47장 내용을 앞당긴다. set-map과 같이 근거 테스트로 둔다.

## 4. 변경 파일

- 추가 `app/concepts/json/`
  - `meta.ts`, `content.mdx`, `route.tsx`(set-map 템플릿), `value-table.ts`, `concept.test.ts`
  - `examples/`(8개): `omitted-values.js`, `numbers.js`, `date-tojson.js`, `own-enumerable.js`, `custom-tojson.js`, `replacer-space.js`, `parse-reviver.js`, `deep-copy.js`
- 수정
  - `tests/e2e/helpers.ts`: `JSON_PATH = '/concepts/json'`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe(라이트·다크, '정답 확인' 버튼 보인 뒤), 이름 '개념 페이지: JSON'
  - `tests/e2e/responsive.spec.ts`: `${JSON_PATH}: 가로 스크롤이 없다`, 홈 학습 순서 카드 43→44
  - `tests/e2e/navigation.spec.ts`: 카드 43→44(두 곳), 마지막 '44번째'와 새 제목, pager 분모 43→44 전부, event-loop '43 / 44'·링크 2개(이전 timers, 다음 json), 새 개념 '44 / 44'·이전 링크 event-loop, '객체' 검색 14→15(4곳)와 순위 목록에 `'44'` 추가
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 44, 마지막 json(prev event-loop, position 44)
  - `tests/build/build-output.test.ts`: event-loop describe 뒤에 `프리렌더 (json)` describe(표 aria-label 앞부분 `값마다 객체 프로퍼티, 배열 요소, 최상위 값으로`, 텍스트에 `SerializeJSONProperty`, `<details` 8개 이상)
  - `docs/content-guide.md:214`: e2e 목록에 `json`
  - `.claude/plans/concept-roadmap-ch43-48.md`: 1번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/` 코드, `app/routes.ts`, 기존 개념 폴더 43개

## 5. 위험 요소

- 원인을 "JSON이 지원하지 않아서"로만 씀 → ①에서 SerializeJSONProperty의 "Return undefined"와 호출자 세 곳의 처리로 설명, Note 5 인용. 단계 3 완료 조건에서 대조.
- "깊은 복사"를 엔진 복사처럼 서술, `structuredClone`을 언어 기능처럼 씀 → ⑧과 단순화 문장, 단계 3에서 '복사' grep 결과가 결과를 가리키는 문맥뿐인지 확인.
- 판 경계 혼동(현재 초안의 `[[IsRawJSON]]` 단계, reviver context 인수를 본문 알고리즘에 넣거나 반대로 "없다"고 단정) → 본문은 해당 단계를 생략했다고 단순화에 밝히고 ES2026판 링크.
- `JSON.stringify(undefined)`의 출력 `undefined`를 문자열로 오해하게 씀 → 예제 1은 `typeof`로 출력하고 표는 "반환값 `undefined`"로 표기.
- 예제 3 Date의 시간대 → `Date.UTC`와 `toISOString`(UTC)이라 실행 환경 시간대와 무관. `getUTCHours`만 사용.
- 예제 7 reviver 방문 순서는 명세 절차로 결정됨(자식 먼저) — 순서 주장은 InternalizeJSONProperty 단계로만 설명.
- '객체' 검색 고정값 누락 → 4절 navigation.spec 목록, 단계 4 완료 조건.
- dev 서버의 `./meta` 실패 캐시 → 생성 순서 meta → content → route, 이후 dev 서버 재시작.
- 표가 375px에서 페이지 가로 스크롤을 만듦(Date 칸이 김) → region `overflow-x-auto`, responsive e2e.
- 첫 문단에 `**`·`2 ** 31` 같은 표기 금지(빌드 테스트 `firstProseLine`).

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "/concepts/json|개념 페이지: JSON|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스(a11y 라이트·다크, 가로 스크롤 데스크톱·모바일, 홈 학습 순서 보기)가 모두 잡히는지 확인.
- 정확성: 예제 8개 실제 출력 = `expectedOutput`(처음엔 `[]`, 실행 결과로 채움, 2절 표와 같아야 함), concept.test 통과·음성 확인(표 칸 하나를 바꾸면 실패), 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 참고 링크 전부 200·anchor 존재.
- 브라우저(dev 서버 375px·다크)
  1. `/concepts/json` → 페이지 가로 스크롤 없음, 결과표 region이 Tab으로 포커스되고 안에서만 가로 스크롤.
  2. 표의 `undefined` 행이 `{}` / `[null]` / 반환값 `undefined`, `1n` 행이 TypeError 세 칸.
  3. 퀴즈 하나를 골라 '정답 확인' → 정답·해설. 프리렌더 HTML에 `<details>` 정답.
  4. 하단 학습 순서 '44 / 44', 이전 event-loop. event-loop 하단 '43 / 44', 다음 json.
  5. 홈 '객체' 검색 15개, 학습 순서 보기 마지막 카드 '44번째' 새 제목.

## 7. 미확정 사항

- 없음. 제목·표 열 이름·퀴즈 문구·summary 문장은 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(8개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경: 부록 초안 8개를 그대로 옮긴다. `meta.ts`는 3절 meta대로(examples는 처음엔 `expectedOutput: []`, 실행 결과로 채움). `route.tsx`는 set-map 템플릿 복사.
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route, 그다음 메인이 dev 서버 재시작. 예제 파일은 부록 그대로, 주석 없이, 파일 끝 줄바꿈 하나. 링크 확인은 네트워크가 되는 방법(샌드박스 밖 curl 또는 브라우저)으로 하고, 안 되면 확인하지 못했다고 기록.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표, 참고 링크 전부 200·명세 anchor 존재(현재 판 원문에서 2절 인용 문장 재확인), dev 서버에서 `/concepts/json` 200.

### 2. 결과표 데이터와 테스트

- 대상: `value-table.ts`, `concept.test.ts`
- 변경: 3절의 데이터와 테스트 ①·②.
- 주의사항: probe는 칸마다 `setup`부터 새 컨텍스트에서 실행. 다른 realm 오류라 TypeError·SyntaxError는 `name`으로 비교.
- 완료 조건: `npx vitest run app/concepts/json` 통과(표 13행 × 3칸 = 39칸 + 본문 주장). 음성 확인(칸 하나를 바꾸면 실패) 후 원복. lint·typecheck 통과.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 도입 문단: 질문 "`{ nickname: undefined }`를 `JSON.stringify`하면 왜 `{}`이고, 같은 값이 배열 안에서는 왜 `null`일까" + 페이지 구성 + 전제 개념 링크(1절 링크 목록) + 별도 개념(try...catch 47장, Ajax). 동작 원리 h3: 1절 주제 ①~⑨ 순서(⑨ "값별 결과표로 정리"에 표). 예제 8개마다 PredictQuiz. 결과와 이유는 예제별 h3(줄 번호를 예제 파일과 맞춤). 오해 Callout 4개: "JSON.stringify는 undefined를 문자열 'undefined'로 바꾼다", "JSON.parse를 거치면 Date가 돌아온다", "toJSON이 있으면 replacer는 원래 값을 받는다", "JSON.parse(JSON.stringify(x))는 원본과 같은 구조를 만든다". 예제 절 첫 문단은 set-map과 같은 형식(console 호스트 API, sloppy mode, 여러 줄 출력 ' / ').
- 주의사항: '찾히다' 금지, 판 차이 문장은 2절 원문대로, 뒷장 내용은 "별도 개념"으로만, 공백 든 인라인 코드는 Prettier 깨짐 확인(`<code>{"…"}</code>`), 첫 문단에 `**` 금지.
- 완료 조건: `npm test` 통과(개수 고정 테스트는 단계 4 대상이라 이 시점 실패 허용 — 실패 목록이 그것뿐인지 확인), 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0, '복사' grep 결과가 5절 기준을 지킴.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- 기존 페이지의 "JSON.stringify는 43장에서 다루는 주제" 문구 역방향 링크(사용자 결정대로 나중에 일괄).
- `structuredClone`(호스트 API)과의 비교 — 브라우저 예제로 추가 게시글 후보.

## 변경 이력

- 2026-11-05 (사용자 콘텐츠 검토 1회, 8건 + 선택 1건 — 모두 vm 실행·명세로 확인 후 반영): ① 예제 6의 space `2` 들여쓰기 공백이 인라인 `<code>`(`white-space: normal`)에서 한 칸으로 합쳐짐 → 공통 CSS를 건드리지 않도록 예제를 space `'--'`로 바꿈(출력 `["{","--\"a\": 1,","--\"b\": [","----2","--]","}"]`), 숫자 space는 본문 + 근거 테스트(2 → 두 칸, 0 → 들여쓰기 없음, 리뷰 Low ① 해소) ② 래퍼 객체: 내부 슬롯은 분기 조건이고 Number·String은 ToNumber·ToString(→ `valueOf`·`toString`), Boolean만 슬롯 값 — 실행 `[42,"x",false]` ③ 배열 replacer는 EnumerableOwnProperties를 대체해 목록 순서로 `Get` — 상속·열거 불가도 직렬화(`{"password":"secret","inherited":"proto","name":"lee"}`) ④ BigInt TypeError는 "나타낼 수 없어서"가 아니라 명세가 예외로 정한 것, `BigInt.prototype.toJSON` 정의 시 `{"v":"1"}`, 표 아래에 "기본 상태" 단서. 검토가 든 설계 이유("JSON.parse가 Number로 읽어 왕복이 보장되지 않아서")는 명세 원문에 없어 쓰지 않음 ⑤ `Date.prototype.toJSON` 조건을 "this를 숫자 힌트로 원시 값으로 바꾼 결과(Date라면 시간 값)"로 ⑥ "빈 텍스트(`JSON.parse('')`)" ⑦ "텍스트마다" → "객체 표기가 나올 때마다" ⑧ `this[key]`는 화살표 함수가 아닌 replacer에서만 ⑨(선택) 깊은 복사 절·오해 Callout에 "앞 절의 변환도 모두 적용" — 근거 테스트 7개 추가. 산문 수정이라 메인이 직접 반영 — 영향 단계 1·2·3

## 부록: 예제 초안

`/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/3d862c42-a841-44a9-88c8-d28c01005883/scratchpad/js/ex/`의 파일과 같다(2026-11-05 실행 확인, 부록과 파일 내용 일치 확인).

#### `omitted-values.js`

```js
var profile = { name: 'kim', nickname: undefined, greet: function () {}, id: Symbol('id') };
console.log(JSON.stringify(profile));
var list = ['kim', undefined, function () {}, Symbol('id')];
console.log(JSON.stringify(list));
console.log(typeof JSON.stringify(undefined), typeof JSON.stringify(function () {}), typeof JSON.stringify(Symbol('id')));
console.log(JSON.stringify(null), JSON.stringify({ empty: null }));
```

#### `numbers.js`

```js
var stats = { avg: 0 / 0, max: 1 / 0, min: -1 / 0, zero: -0 };
console.log(JSON.stringify(stats));
console.log(JSON.stringify([NaN, Infinity, -0, 1e21]));
console.log(JSON.stringify([new Number(7), new String('7'), new Boolean(false)]));
var sparse = [1, , 3];
console.log(JSON.stringify(sparse), sparse.length);
```

#### `date-tojson.js`

```js
var meeting = { title: 'standup', at: new Date(Date.UTC(2026, 10, 5, 9, 30)) };
var text = JSON.stringify(meeting);
console.log(text);
var restored = JSON.parse(text);
console.log(typeof restored.at, restored.at instanceof Date);
console.log(typeof Date.prototype.toJSON, JSON.stringify({ at: new Date(NaN) }));
```

#### `own-enumerable.js`

```js
var base = { inherited: 'proto' };
var user = Object.create(base);
user.name = 'lee';
Object.defineProperty(user, 'password', { value: 'secret', enumerable: false });
user[Symbol('tag')] = 'symbol key';
console.log(JSON.stringify(user), user.inherited, user.password);
var scores = [90, 80];
scores.label = 'math';
console.log(JSON.stringify(scores), scores.label);
console.log(JSON.stringify({ 2: 'b', z: 'z', 1: 'a' }));
```

#### `custom-tojson.js`

```js
var price = {
  amount: 1200,
  currency: 'KRW',
  toJSON: function (key) {
    return this.amount + ' ' + this.currency + ' (' + key + ')';
  }
};
console.log(JSON.stringify({ total: price }));
console.log(JSON.stringify([price]));
console.log(JSON.stringify(price));
var hidden = { toJSON: function () { return undefined; } };
console.log(JSON.stringify({ a: 1, b: hidden }));
```

#### `replacer-space.js`

```js
var order = { id: 7, item: 'pen', qty: 2, buyer: { id: 3, name: 'park' } };
var keys = [];
var doubled = JSON.stringify(order, function (key, value) {
  keys.push(key);
  return typeof value === 'number' ? value * 2 : value;
});
console.log(doubled);
console.log(JSON.stringify(keys));
console.log(JSON.stringify(order, ['id', 'buyer']));
var pretty = JSON.stringify({ a: 1, b: [2] }, null, '--');
console.log(JSON.stringify(pretty.split('\n')));
```

#### `parse-reviver.js`

```js
var text = '{"title":"standup","at":"2026-11-05T09:30:00.000Z","draft":true,"tags":["daily"]}';
var visited = [];
var meeting = JSON.parse(text, function (key, value) {
  visited.push(key);
  if (key === 'at') return new Date(value);
  if (key === 'draft') return undefined;
  return value;
});
console.log(meeting.at instanceof Date, meeting.at.getUTCHours(), 'draft' in meeting);
console.log(JSON.stringify(visited));
console.log(JSON.parse('42'), JSON.parse('"42"') === '42', JSON.parse('null') === null);
```

#### `deep-copy.js`

```js
function Point(x) { this.x = x; }
var shared = { n: 1 };
var source = {
  point: new Point(1),
  roles: new Map([['admin', true]]),
  created: new Date(0),
  memo: undefined,
  left: shared,
  right: shared
};
var copy = JSON.parse(JSON.stringify(source));
console.log(copy.point instanceof Point, JSON.stringify(copy.point));
console.log(JSON.stringify(copy.roles), typeof copy.created, 'memo' in copy);
console.log(source.left === source.right, copy.left === copy.right);
copy.left.n = 99;
console.log(copy.right.n, source.left.n);
```

## 구현 진행

- baseline (2026-11-05, `1be09da`): lint·format:check·typecheck 통과 / `npm test` 118 files·3677 tests 통과. test:build·e2e는 단계 4 이후 실행(직전 커밋에서 통과).
- 단계 1~3(개념 폴더)과 단계 4(고정 테스트·문서)는 파일이 겹치지 않아 Sonnet 서브에이전트 2개에 병렬 위임.
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — 메인이 diff 확인(개수 44, 마지막 json·이전 event-loop, pager 분모 `/ 43` 0건, event-loop '43 / 44' 다음 json, '객체' 검색 15(4곳)·순위 '44', a11y·responsive·build 새 케이스 추가만, content-guide 목록). e2e·test:build 실행은 단계 1~3 뒤 전체 검증에서
- [x] 1. 예제·meta·route — 예제 8개가 scratchpad 초안과 바이트 단위로 같음(cmp), `expectedOutput` = 2절 표, 참고 링크 13개 200·현재 초안 원문 재대조(서브에이전트 확인 — 그 시점 네트워크 열림)
- [x] 2. 결과표 데이터와 테스트 — `concept.test.ts`(표 39칸 + 본문 주장, `-0` 행 칸 반전 음성 확인 후 원복). 표 마지막 행 이름은 준비 코드 `var x = {}; x.self = x;` 그대로 쓰고 표 위 문단에 밝힘
- [x] 3. 본문 — 메인이 결과·원인 문장과 줄 번호를 예제·2절과 대조. 메인 수정 6곳: `null` 분기 표현, 구멍은 SerializeJSONArray가 부른 SerializeJSONProperty의 `Get`으로, 본문의 "이 저장소의 테스트가 확인합니다"(저자 메모처럼 읽힘) 삭제 — 테스트 언급은 simplifications에만, `structuredClone` 앞 "브라우저의" 삭제(호스트 API 일반), 표 아래 "값 자리에 같은 문자열"로 정확히, Callout 4 마지막 문장(뜻이 흐림) 삭제·맞춤법 '들어옵니다'. `grep -c '찾히'` 0, '복사' 문맥은 결과를 가리키는 말과 단순화뿐
- 전체 검증(2026-11-05): lint·format:check·typecheck 통과, `npm test` 119 files·3765 tests, `test:build` 355 tests, e2e navigation 16 + 새 개념 8(`-g "/concepts/json|개념 페이지: JSON|홈 학습 순서 보기"`) 통과. 빌드 HTML의 공백 든 `<code>`는 예제 6 들여쓰기 출력(의도된 공백)뿐. 브라우저(기존 dev 서버 5173, 375px·다크): 페이지 overflow 0, 표 region tabIndex 0·안에서만 가로 스크롤, `undefined` 행 `{}`/`[null]`/반환값 undefined, `1n`·순환 행 TypeError, 퀴즈 8개 중 예제 1 정답 확인 동작, pager 44/44(이전 event-loop). 홈 '객체' 15개·마지막 44번째는 navigation e2e로 확인
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 0 · Low 2(보고만) — ① 본문 "숫자가 1보다 작으면 들여쓰기가 없습니다"(space)는 명세 단계(spaceMV < 1 → gap 빈 문자열)와 계획 단계 실행(`space 0` → `{"a":[1]}`)으로 확인했지만 `concept.test.ts`에 근거 테스트가 없음 ② 표 마지막 행의 첫 칸이 값이 아니라 준비 코드(`var x = {}; x.self = x;`)라 다른 행과 형식이 다름(표 위 문단에 밝힘)
- 사용자 콘텐츠 검토 1회 반영(2026-11-05, 변경 이력 참고). 퀴즈 해설 문자열 안의 작은따옴표(`'--'`)가 MDX 표현식을 깨뜨려 빌드 실패 → 큰따옴표로 고쳐 해결(`npm test`는 MDX를 컴파일하지 않아 잡지 못함, test:build가 잡음). 재검증: lint·format:check·typecheck 통과, `npm test` 3772, `test:build` 355, 빌드 HTML의 공백 든 `<code>` 0건, e2e navigation 16 + 새 개념 8 통과, dev 서버에서 고친 문단 6곳과 예제 6 출력(`----2`) 표시 확인
- 사용자 콘텐츠 검토 2회 반영(2026-11-05, 3건 Low — 명세 GetV 원문·실행 확인): ① "GetV이므로 프로토타입 체인도" → GetV는 원시 값(BigInt)에서도 래퍼 객체로 조회하고 프로토타입 체인도 따라간다(명세 GetV: "If the value is not an object, the property lookup is performed using a wrapper object") ② `{"v":"1"}` 예시에 입력(`toJSON`이 `this.toString()`, `JSON.stringify({ v: 1n })`) 명시 ③ 깊은 복사 목록 "undefined·함수·심벌인 프로퍼티는 빠집니다(메서드도 사라집니다)" + 근거 테스트(`["n"]`). 재검증: lint·format:check·typecheck 통과, `npm test` 3773, `test:build` 355, e2e navigation 16 + 새 개념 8 통과, 빌드 HTML에 고친 문장 3곳 존재
- 마무리(2026-11-05): 사용자 최종 승인(콘텐츠 검토 2회 반영 후) → `reviewedAt` 2026-11-05 기록, 로드맵 1번 완료 처리

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현. 달라진 점: ① 예제 6의 space를 `2`에서 `'--'`로 바꿈 — 인라인 `<code>`(`white-space: normal`)에서 들여쓰기 공백이 한 칸으로 합쳐져 "두 칸" 설명과 화면이 어긋났고, 공통 CSS를 바꾸지 않는 쪽을 택함. 숫자 space는 본문과 근거 테스트로 ② 사용자 콘텐츠 검토 2회(8건+선택 1건, 3건) 반영 — 래퍼 객체 변환(ToNumber·ToString, Boolean만 슬롯 값), 배열 replacer는 EnumerableOwnProperties를 대체(상속·열거 불가도 직렬화), BigInt TypeError는 명세가 정한 예외 + `BigInt.prototype.toJSON` 우회, `Date.prototype.toJSON` 조건, GetV의 의미, 깊은 복사에서 함수·심벌 값도 빠짐. 근거 테스트 8개 추가 ③ 표 마지막 행 이름은 준비 코드 그대로(표 위 문단에 밝힘) ④ 메인이 본문 6곳 다듬음(구현 진행 단계 3)

### 코드 리뷰

- critical-code-review(메인 직접): Critical/High/Medium 0. Low ①(space < 1 근거 테스트 없음)은 검토 반영 때 테스트 추가로 해소, Low ②(표 마지막 행 형식)는 보고만 하고 유지. 검토 반영 중 퀴즈 해설의 작은따옴표가 MDX 빌드를 깨뜨린 것을 test:build가 잡아 수정

### 후속 작업

- [ ] 기존 페이지의 "JSON.stringify는 43장에서 다루는 주제" 문구 역방향 링크(사용자 결정대로 나중에 일괄)
- [ ] `structuredClone`(호스트 API) 비교 — 추가 게시글 후보
- [ ] 43~48장 로드맵 2번 프로미스와 then 체이닝

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 예제 6 들여쓰기 문제를 공통 CSS(`white-space: pre-wrap`)가 아니라 예제의 space를 `'--'`로 바꿔 해결했다 — 공통 CSS를 바꾸면 모든 개념 페이지의 인라인 코드 렌더링이 달라져 전체 e2e·회귀 확인이 필요하고, 이 페이지만의 문제라 예제 쪽에서 푸는 편이 범위가 작다. 숫자 space는 본문 문장과 근거 테스트로 남겼다.
- [Claude 판단] 검토가 제안한 BigInt TypeError의 설계 이유("JSON.parse가 Number로 읽어 왕복이 보장되지 않아서")는 쓰지 않았다 — 명세 원문에 그 이유가 없고, 이 사이트는 명세와 실행 결과만 근거로 쓴다. 명세가 TypeError로 정했다는 사실과 `BigInt.prototype.toJSON` 우회(실행 확인)만 썼다.
- [Claude 판단] try...catch(47장)를 예제에 쓰지 않고 BigInt·순환 참조의 TypeError와 `JSON.parse`의 SyntaxError를 `concept.test.ts`의 근거 테스트로 확인했다 — 뒷장 개념을 앞당기지 않는 규칙(AGENTS.md) 때문이며 set-map과 같은 방식이다. 본문에서는 "이 저장소의 테스트가 확인합니다" 같은 저자 메모 표현을 지우고 simplifications에만 남겼다.
- [Claude 판단] 결과표의 칸 값을 문자열로 두고 `undefined` 반환은 `RETURNS_UNDEFINED`, 예외는 이름(`TypeError`)으로 표기해 테스트 probe 결과와 그대로 비교하게 했다 — 표에 보이는 글자와 테스트가 대조하는 값이 같은 데이터(`value-table.ts`)에서 나와 어긋날 수 없다.
- [무검토 승인] summary에 '객체'가 들어가 홈 '객체' 검색 결과가 14→15개가 되는 것을 받아들였다.
- 추가 주제 4개 모두, slug `json`, 제목 "JSON: undefined는 왜 사라질까", category `objects`는 사용자 결정. 콘텐츠 검토 2회는 사용자 요청.

#### 배경지식

- `JSON.stringify`는 값을 빈 문자열 키로 담은 wrapper에서 SerializeJSONProperty를 시작한다. 이 연산은 `toJSON` → replacer → 래퍼 객체 풀기 → 종류별 검사 순서로 진행하고, `undefined`·함수·심벌은 "Return undefined"에 닿는다. 그 `undefined`를 SerializeJSONObject는 항목에서 빼고, SerializeJSONArray는 `"null"`로 채우고, 최상위는 그대로 돌려준다.
- SerializeJSONObject는 키를 EnumerableOwnProperties(자기·문자열 키·열거 가능)로 모으지만, replacer 배열이 있으면 그 목록(PropertyList)이 이를 대체하고 `Get`으로 읽는다. SerializeJSONArray는 PropertyList를 쓰지 않는다.
- 순환 검사는 지금 직렬화 중인 객체를 담는 `[[Stack]]`으로 하므로, 같은 객체를 두 번 만나는 것은 순환이 아니다. `JSON.parse`는 객체 표기마다 새 객체를 만든다 — 그래서 `JSON.parse(JSON.stringify(x))`에서 공유 참조가 둘로 나뉜다.
- InternalizeJSONProperty는 자식을 먼저 처리한 뒤 자기 자신에 대해 reviver를 부르므로 방문 순서가 깊은 곳부터이고 마지막이 빈 문자열 키다.
- GetV는 원시 값이면 래퍼 객체로 조회한다 — 그래서 BigInt도 `toJSON` 단계를 거친다.

#### 확인 질문

1. `{ a: undefined }`는 `{}`, `[undefined]`는 `[null]`, `JSON.stringify(undefined)`는 `undefined`인 이유를 하나의 명세 연산과 그 호출자 세 곳으로 설명하면?
   <details><summary>답</summary>SerializeJSONProperty가 `undefined`에 대해 문자열이 아니라 `undefined`를 돌려주고, SerializeJSONObject는 그 항목을 만들지 않고, SerializeJSONArray는 `"null"`을 넣고, 최상위에서는 `JSON.stringify`가 그 값을 그대로 돌려준다(본문 "값 하나를 바꾸는 SerializeJSONProperty", `value-table.ts` 처음 세 행).</details>
2. 예제 6을 space `2` 그대로 두고 공통 CSS를 고치는 대신 `'--'`로 바꾼 이유는? 공통 CSS를 고쳤다면 무엇을 더 확인해야 했나?
   <details><summary>답</summary>인라인 `<code>`의 공백이 합쳐지는 것은 이 페이지 예제만의 문제였고, 공통 CSS(`app/app.css`)를 바꾸면 모든 개념 페이지의 인라인 코드 줄바꿈·레이아웃이 달라져 전체 e2e와 375px 회귀 확인이 필요했다(AGENTS.md 검증 범위, 변경 이력 ①).</details>
3. `JSON.stringify(user, ['password', 'inherited', 'name'])`에서 열거 불가 `password`와 상속한 `inherited`가 나오는 이유는? replacer 배열 없이 `JSON.stringify(user)`이면 왜 빠지나?
   <details><summary>답</summary>replacer 배열은 PropertyList가 되어 EnumerableOwnProperties를 대체하고 목록의 키를 순서대로 `Get`으로 읽으므로 자기·열거 가능 여부를 검사하지 않는다. 배열이 없으면 EnumerableOwnProperties가 자기·문자열·열거 가능 키만 모아 둘 다 빠진다(본문 "replacer와 space", `concept.test.ts` 배열 replacer 테스트).</details>
4. BigInt가 TypeError인 이유로 "JSON으로 나타낼 수 없어서"도, "왕복이 보장되지 않아서"도 쓰지 않은 이유는?
   <details><summary>답</summary>JSON 문법은 `1` 같은 숫자를 쓸 수 있어 앞의 설명은 사실과 다르고, 뒤의 설명은 명세 원문에 없는 설계 의도라 이 사이트의 근거 기준(명세·실행)에 맞지 않는다. 명세 SerializeJSONProperty의 "If value is a BigInt, throw a TypeError exception"만 근거로 썼다(변경 이력 ④).</details>
5. 원본의 `left === right`가 `true`인데 `JSON.parse(JSON.stringify(source))`의 `copy.left === copy.right`가 `false`인 이유는? 만약 `source.self = source`였다면?
   <details><summary>답</summary>`[[Stack]]`은 지금 직렬화 중인 객체만 담아 같은 객체를 두 번 만나는 것은 순환이 아니므로 두 번 직렬화되고, `JSON.parse`가 객체 표기마다 새 객체를 만든다. `source.self = source`이면 직렬화 중인 `source`를 다시 만나 `[[Stack]]`에 있으므로 TypeError다(본문 "깊은 복사로 쓸 때 잃는 것", 예제 8).</details>
