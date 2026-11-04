# 개념 'HTML 어트리뷰트와 DOM 프로퍼티' 구현 계획

- 상태: 완료
- 작성일: 2026-11-04
- 기준: `main` @ `14f9a36`

## 0. 요약

- 목적: 38~42장 로드맵 4번 `/concepts/html-attribute-dom-property`를 추가한다. 39장 어트리뷰트에서 `value`를 바꿔도 `getAttribute('value')`가 그대로인 이유(dirty value flag)와, 그것이 일반 규칙이 아니라 대부분의 프로퍼티는 어트리뷰트를 **반영**한다는 점을 Chromium 예제 11개, 근거 줄과 대조되는 대응 표, 퀴즈로 WHATWG HTML·DOM·Web IDL 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `browser`, order 370, 학습 순서 39번째·마지막, 표 데이터 `attribute-table.ts`). 고정 테스트·e2e·빌드 테스트·content-guide·로드맵을 고친다. 공통 코드와 기존 개념 38개는 바꾸지 않는다.
- 위험: "어트리뷰트 = 초기 상태, 프로퍼티 = 최신 상태"를 일반 규칙처럼 쓰는 오개념(폼 컨트롤 `value`·`checked`에만 해당) → 반영 규칙을 따로 보이고, 표의 칸마다 예제 출력 줄을 근거로 묶는 테스트를 둔다.
- 복잡도: 중간 · Consensus: 생략. 표 + 근거 줄 테스트는 script-async-defer의 `mode-table.ts` 패턴을 그대로 쓰고 공통 코드를 바꾸지 않는다. 예제 출력은 실행기로 3회 확인했고 핵심 주장은 표준 원문과 대조했다.
- 미확정: 없음(추가 주제 3개·시각화·제목은 2026-11-04 사용자 확정). 단, ⑪ 접근자 프로퍼티 절은 제가 추가로 넣은 것이라 승인 때 확인 필요.

## 1. 요구사항

### 요구사항

- 로드맵 4번 "어트리뷰트와 프로퍼티"(39장)를 새 개념 페이지로 만든다.
- 사용자 결정(2026-11-04)
  - 기본 범위: ① `value`/`defaultValue`와 dirty value flag ② `checked`/`defaultChecked`와 dirty checkedness ③ 반영(`id`, `class`↔`className`, `for`↔`htmlFor`) ④ 타입 변환(불리언·숫자·URL) ⑤ `attributes`·`getAttribute`/`setAttribute`/`hasAttribute`/`removeAttribute` ⑥ `dataset` ⑦ 비표준 어트리뷰트는 프로퍼티가 되지 않음.
  - 추가 주제 3개 모두: **`form.reset()`**, **어트리뷰트 이름 대소문자**, **없는 어트리뷰트의 값**.
  - 시각화: **표 + 퀴즈**(시뮬레이터 없음).
  - 제목 "HTML 어트리뷰트와 DOM 프로퍼티: value를 바꿨는데 getAttribute는 왜 그대로일까", slug `html-attribute-dom-property`. 16장 '프로퍼티 어트리뷰트'(`property-attributes`)와 헷갈리지 않게 본문 첫머리에서 구분한다.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 어트리뷰트와 프로퍼티는 다른 곳에 있다: 어트리뷰트는 요소의 attribute list(문자열), DOM 프로퍼티는 Web IDL attribute가 만든 JS 프로퍼티. 16장 '프로퍼티 어트리뷰트'(`[[Writable]]` 등)와 다른 말이라는 안내.
  - ② `value`는 기본값만 어트리뷰트에서 온다(`value-dirty.html`, `value-clean.html`): HTML "The value content attribute gives the default value of the input element. When the value content attribute is added, set, or removed, if the control's dirty value flag is false, the user agent must set the value of the element to the value of the value content attribute…", value 모드 setter "Set the element's value to the new value. Set the element's dirty value flag to true.", 폼 인프라 "If it is false, value mirrors the default value. If it is true, the default value is ignored." `defaultValue`는 IDL `[CEReactions, Reflect="value"] attribute DOMString defaultValue`라 어트리뷰트를 반영한다. 입력 전(`value-clean`)에는 `setAttribute`·`defaultValue` 대입·`removeAttribute`가 `.value`까지 바꾼다.
  - ③ `checked`도 같은 구조(`checked.html`): checked IDL setter "set the element's checkedness to the new value and set the element's dirty checkedness flag to true", checked 어트리뷰트 "gives the default checkedness … When the checked content attribute is added, if the control does not have dirty checkedness…", `defaultChecked`는 `Reflect="checked"`. 체크박스의 `.value`는 value 모드가 아니라 default/on 모드라 어트리뷰트를 그대로 읽고 쓴다("if the element has a value content attribute, return that attribute's value; otherwise, return the string "on"", "On setting, set the value of the element's value content attribute to the new value") — value/defaultValue 분리가 텍스트 입력류에만 해당한다는 근거.
  - ④ `form.reset()`은 어트리뷰트로 되돌린다(`reset.html`): input reset 알고리즘 "set its user validity, dirty value flag, and dirty checkedness flag back to false, set the value of the element to the value of the value content attribute, … set the checkedness of the element to true if the element has a checked content attribute and false if it does not". 리셋 뒤에는 dirty가 false라 `setAttribute('value')`가 다시 `.value`를 바꾼다. `reset` 이벤트 발생은 40장 별도 개념으로 한 줄만.
  - ⑤ 대부분은 반영이다(`reflect.html`): HTML "In general this means that the IDL attribute getter returns the current value of the content attribute, and the setter changes the value of the content attribute to the given value." DOM "The id attribute must reflect "id". The className attribute must reflect "class"." label IDL `[CEReactions, Reflect="for"] attribute DOMString htmlFor`. `class`·`for`는 예약어라는 설명은 하지 않는다(근거 미확인 — 쓰지 않음). `tag.class`·`tag.for`는 `undefined`.
  - ⑥ 반영할 때 타입이 바뀐다(`types.html`): boolean 반영 getter "If contentAttributeValue is null, then return false. Return true.", setter "If the given value is false, then run this's delete the content attribute. If the given value is true, then run this's set the content attribute with the empty string." HTML boolean attributes "The values "true" and "false" are not allowed on boolean attributes. To represent a false value, the attribute has to be omitted altogether." → `disabled="false"`도 `true`. `maxLength`는 `[ReflectNonNegative] attribute long`이라 숫자, 파싱 실패 시 "If the reflected IDL attribute is limited to only non-negative numbers, then return −1." `a.href`는 hyperlink href getter "Return url, serialized." → 절대 URL, `getAttribute('href')`는 쓴 그대로.
  - ⑦ 없는 어트리뷰트의 값(`missing.html`): `getAttribute`는 "If attr is null, return null.", 반영 프로퍼티는 DOMString이면 "If contentAttributeValue is null, then return the empty string.", boolean은 `false`, ReflectNonNegative long은 `-1`, `a.href`는 "If url is null and this has no href content attribute, return the empty string."
  - ⑧ 어트리뷰트를 다루는 메서드와 `attributes`(`attributes.html`): `attributes`는 NamedNodeMap — "A NamedNodeMap object's attribute list is its element's attribute list." → 미리 받은 `attrs.length`도 바뀐다(살아 있음, [HTMLCollection은 살아 있다](/concepts/live-html-collection)와 연결). `getAttributeNames`는 순서대로 이름. 불리언 어트리뷰트 `required`의 값은 빈 문자열(`required=`).
  - ⑨ 이름은 대소문자를 가리지 않는다(`attributes.html`): DOM get an attribute by name "If element is in the HTML namespace and its node document is an HTML document, then set qualifiedName to qualifiedName in ASCII lowercase." `setAttribute`·`hasAttribute`도 같은 단계 → `getAttribute('VALUE')`가 찾고, `setAttribute('Placeholder')`는 `placeholder`로 저장. (HTML 문서 안 HTML 요소에만 해당 — 단순화에 명시.)
  - ⑩ `data-*`와 `dataset`(`dataset.html`): DOMStringMap name-value pairs "whose first five characters are the string "data-" … for each U+002D HYPHEN-MINUS character (-) in the name that is followed by an ASCII lower alpha, remove the U+002D HYPHEN-MINUS character (-) and replace the character that followed it by the same character converted to ASCII uppercase", setter "For each ASCII upper alpha in name, insert a U+002D HYPHEN-MINUS character (-) before the character and replace the character with the same character converted to ASCII lowercase. Insert the string data- at the front of name." 값은 항상 문자열(`'42'`의 typeof `string`, `'false'`는 `Boolean`으로 `true`). `delete card.dataset.inStock`이 어트리뷰트를 지운다.
  - ⑪ (제안) DOM 프로퍼티는 프로토타입의 접근자 프로퍼티다(`accessor.html`): Web IDL "Regular attributes are exposed on the interface prototype object" → `HTMLInputElement.prototype`의 `value`는 get·set이 있는 접근자 프로퍼티, `nick`의 자기 프로퍼티가 아니다. 그래서 getter가 매번 어트리뷰트나 내부 상태를 읽는다는 설명의 근거([프로토타입 체인](/concepts/prototype-chain), [프로퍼티 어트리뷰트](/concepts/property-attributes)와 연결). 사용자가 빼라고 하면 이 절과 예제를 뺀다.
  - ⑫ 비표준 어트리뷰트(`custom.html`): `<div color="red">`의 `box.color`는 `undefined`(HTMLDivElement에 그런 IDL attribute가 없다). `box.size = 'big'`은 보통 JS 프로퍼티라 어트리뷰트가 생기지 않는다. 표준 어트리뷰트 `title`(HTMLElement `[CEReactions, Reflect] attribute DOMString title`)은 반영된다. 자기만의 데이터는 `data-*`를 쓰라는 연결.
  - 대응 표: 3절.

### 유지해야 하는 기존 동작

- 기존 개념 38개는 수정하지 않는다(역방향 링크는 사용자 결정으로 나중에 일괄). 하이드레이션 규칙(퀴즈는 JS 없이 `<details>`).
- title·summary·tags에 '객체'를 쓰지 않는다(홈 '객체' 검색 고정 테스트).

### 제외 범위

- `textarea`(기본값이 자식 텍스트)·`select`/`option`(`selected`/`defaultSelected`), `type` 변경 시 value 처리, 값 정제(sanitization) 상세
- 실제 사용자 입력(예제는 스크립트 대입. 표준상 둘 다 dirty를 true로 만든다 — 단순화)
- `classList`·`style`(39장 뒷부분 스타일, 별도 개념), `toggleAttribute`, `getAttributeNS` 등 네임스페이스 메서드, Attr 노드 조작(`getAttributeNode`), Trusted Types
- 열거형 어트리뷰트 반영(limited to only known values), `dataset`의 `SyntaxError`(47장 `try...catch` 필요)
- `class`·`for`가 왜 `className`·`htmlFor`인지(예약어 이유) — 표준 근거를 확인하지 못해 쓰지 않음

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-04 내려받음, scratchpad `attr/std/`)

- HTML forms `form-control-infrastructure.html`: "input and textarea elements have a dirty value flag. This is used to track the interaction between the value and default value. If it is false, value mirrors the default value. If it is true, the default value is ignored."
- HTML `input.html`: dirty value flag "must be set to true whenever the user interacts with the control in a way that changes the value. (It is also set to true when the value is programmatically changed, as described in the definition of the value IDL attribute.)"; value 어트리뷰트 단락(1절 ②); dirty checkedness(1절 ③); checked 어트리뷰트(1절 ③); input reset 알고리즘(1절 ④); IDL `[CEReactions, Reflect="checked"] attribute boolean defaultChecked; attribute boolean checked; … [CEReactions, Reflect] attribute boolean disabled; … [CEReactions, ReflectNonNegative] attribute long maxLength; … [CEReactions, Reflect="value"] attribute DOMString defaultValue; [CEReactions] attribute [LegacyNullToEmptyString] DOMString value;`; value IDL 모드 value·default·default/on 정의(`#dom-input-value-value`, `#dom-input-value-default-on`); checked IDL(`#dom-input-checked`).
- HTML `forms.html`: label IDL `[CEReactions, Reflect="for"] attribute DOMString htmlFor;`; `#dom-form-reset` → reset 단계(`form-control-infrastructure.html#concept-form-reset`, reset 이벤트 후 각 요소의 reset 알고리즘).
- HTML `common-dom-interfaces.html#reflecting-content-attributes-in-idl-attributes`: 반영 일반 문장과 DOMString·USVString·boolean·long 반영 getter/setter(1절 ⑤⑥⑦).
- HTML `common-microsyntaxes.html#boolean-attributes`: 1절 ⑥ 인용.
- HTML `links.html#dom-hyperlink-href`: "If url is null and this has no href content attribute, return the empty string. Otherwise, if url is null, return this's href content attribute's value. Return url, serialized."
- HTML `dom.html#dom-dataset`·`#dom-domstringmap-setitem`: 1절 ⑩ 인용. HTMLElement IDL `[CEReactions, Reflect] attribute DOMString title;`.
- DOM: `#dom-element-id` "The id attribute must reflect "id". The className attribute must reflect "class"."; `#dom-element-getattribute` "If attr is null, return null. Return attr's value."; `#concept-element-attributes-get-by-name`(1절 ⑨); `#dom-element-setattribute`·`#dom-element-hasattribute` 소문자화 단계; `#dom-element-attributes` "return the associated NamedNodeMap", `getAttributeNames` "return the qualified names of the attributes in this's attribute list, in order"; `#concept-namednodemap-element` "A NamedNodeMap object's attribute list is its element's attribute list."
- Web IDL `#es-attributes`: "Regular attributes are exposed on the interface prototype object".

### 사실 (실행 확인 — Playwright Chromium, `runBrowserExample` settleMs 300, 3회 연속 같은 출력)

초안: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/48daa705-1d4a-4069-aedf-5b13655d519c/scratchpad/attr/ex/`. 모두 `.html`, resources 없음, 동기 스크립트(지연 의존 없음). 출력 칸의 ` / `는 줄 구분.

| # | 예제 | 실제 출력 |
| - | - | - |
| 1 | `value-dirty.html` | `처음 ["손님","손님","손님"]` / `value 대입 ["철수","손님","손님"]` / `setAttribute ["철수","영희","영희"]` |
| 2 | `value-clean.html` | `setAttribute ["영희","영희","영희"]` / `defaultValue 대입 ["민수","민수","민수"]` / `removeAttribute ["",null,""]` |
| 3 | `checked.html` | `처음 true true true` / `checked 대입 false true true` / `어트리뷰트 다시 추가 false true true` / `on null` / `동의 동의` |
| 4 | `reset.html` | `철수 true` / `손님 false` / `영희` |
| 5 | `reflect.html` | `tag hint nick` / `hint error email` / `nick-label` / `undefined undefined` |
| 6 | `types.html` | `true "false"` / `false` / `""` / `number 4 string` / `-1` / `help.html http://example.test/help.html` |
| 7 | `missing.html` | `null false ""` / `null false` / `null -1` / `null ""` |
| 8 | `attributes.html` | `4 ["id=nick","type=text","value=손님","required="]` / `손님 true` / `["id","type","value","required","placeholder"]` / `4 false` |
| 9 | `dataset.html` | `42 string` / `false true` / `오늘` / `["itemId","inStock","lastSeen"]` / `false` |
| 10 | `accessor.html` | `function function false` / `false true` / `function true true` |
| 11 | `custom.html` | `red undefined` / `big false null` / `안내` |

- 배열 출력은 빈 문자열과 `null`을 구분하려고 `JSON.stringify`를 쓴다(예제 규칙: 원시 값·불리언·`JSON.stringify` 결과만).
- 책 대비: 책 39.7은 `id="user"`·`value` 입력과 `data-user-id`·`data-role` 목록을 쓴다. 이 페이지는 닉네임(`nick`·`손님`), 동의 체크박스, 상품 카드(`data-item-id`·`data-in-stock`), 라벨(`tag`)로 직접 작성했다.
- `href` 출력의 `http://example.test/`는 실행기 주소(`tests/helpers/run-browser-example.ts:6` `ORIGIN`)라 본문에서 "예제를 연 주소 기준"이라고 밝힌다.

### 사실 (코드에서 확인)

- 표 + 근거 줄 패턴: `app/concepts/script-async-defer/mode-table.ts`(columns·rows·evidence `{ example, lines }`), `concept.test.ts`(구조 검사·`isSubsequence`로 evidence 줄이 expectedOutput에 순서대로 있는지), `content.mdx:67-111`(`<Wide>` + `<table>`).
- 카테고리 `browser`: `app/lib/concepts.ts:1-2,42`. 브라우저 예제 규칙: `docs/content-guide.md:59-104`, 검사기 `tests/helpers/browser-example.ts`.
- 고정 테스트(38개·마지막 live-html-collection): `app/lib/concepts.test.ts`(total·마지막), `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(카드 수·마지막 제목·분모 전부·live-html-collection 38/39 + 링크 2개·새 개념 39/39), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 수) — `14f9a36`이 고친 위치와 같다.
- 시뮬레이터 없는 browser 개념의 테스트 패턴(`f16f473` dom-tree-nodes): `tests/e2e/helpers.ts` PATH 상수, `a11y.spec.ts` '개념 페이지: …'(정답 확인 버튼 보인 뒤 axe), `responsive.spec.ts` `${PATH}: 가로 스크롤이 없다`, `tests/build/build-output.test.ts` `프리렌더 (<slug>)` describe(표 region aria-label, `<details` 개수).
- content-guide e2e 대상 목록: `docs/content-guide.md:214`.

### 추정

- 없음

## 3. 구현 전략

- 구성: `meta.ts`, `content.mdx`, `route.tsx`, `attribute-table.ts`, `concept.test.ts`, `examples/`(11개, 초안 `cp`).
- 대응 표(`attribute-table.ts`, 본문 "어트리뷰트와 프로퍼티 대응 표"): 열 = `프로퍼티`, `관계`(반영 / 기본값만 반영), `프로퍼티 값의 타입`, `어트리뷰트가 없을 때`. 행(어트리뷰트, 요소) = `value`(텍스트 input, 프로퍼티 `value` — 기본값만), `value`(텍스트 input, `defaultValue` — 반영), `checked`(`checked` — 기본값만), `checked`(`defaultChecked` — 반영), `value`(체크박스, `value` — 반영, 없으면 `'on'`), `id`, `class`(`className`), `for`(`htmlFor`), `disabled`(불리언), `maxlength`(`maxLength`, 숫자·없거나 잘못되면 -1), `href`(절대 URL·없으면 `''`), `data-item-id`(`dataset.itemId`, 문자열), `color`(비표준, 프로퍼티 없음). 행마다 `evidence: { example, lines }`(그 칸을 보이는 출력 줄)와 `source`(표준 절 anchor 라벨). 출력으로 안 보이는 칸(예: `checked` 없을 때 `false`를 `missing` 예제가 다루지 않는 경우)은 만들지 않거나 근거 예제를 추가한다 — 모든 칸이 출력 줄이나 IDL 인용 중 하나에 묶이게 한다.
- 테스트(`concept.test.ts`): ① 행 칸 수 = 열 수 ② evidence.example이 meta.examples id ③ 모든 예제가 표 근거 또는 본문 예제로 쓰임(표에 안 쓰이는 예제 목록은 테스트에 명시) ④ evidence 줄이 expectedOutput에 순서대로 있음(`isSubsequence`, script-async-defer와 같은 함수). 음성 확인: 줄 하나를 바꿔 실패하는지 단계 2에서 확인.
- 퀴즈 10개 안팎: 예제 1·2·3·4·5·6·7·8·9·11에서 하나씩(예: `setAttribute` 뒤 `.value`, `disabled="false"`, `maxlength="넷"`, `dataset.inStock`의 `Boolean`).
- 본문 결과와 이유: 핵심 오해("어트리뷰트 = 초기값, 프로퍼티 = 현재값"은 dirty 플래그가 있는 폼 컨트롤에만 맞고, 나머지는 반영)를 정리.
- 버린 대안: value 단계 시뮬레이터(사용자 미선택), 표를 정적 마크다운으로(근거 줄과 묶을 수 없어 어긋날 위험).

## 4. 변경 파일

- 추가 `app/concepts/html-attribute-dom-property/` — 3절 구성. `meta.ts`: category `browser`, order 370, prerequisites `[{ label: 'DOM 트리와 노드 종류', slug: 'dom-tree-nodes' }, { label: '프로퍼티 어트리뷰트', slug: 'property-attributes' }]`, related `['dom-tree-nodes', 'live-html-collection', 'property-attributes', 'prototype-chain']`, examples 11개 browser, references(2절 표준 절 + MDN), simplifications(아래), reviewedAt은 사용자 콘텐츠 승인 날짜.
  - simplifications(안): Chromium 실행 결과·표준 근거 / 사용자 입력 대신 스크립트 대입(둘 다 dirty를 true로) / value 모드가 아닌 type(체크박스 등)은 `value`가 어트리뷰트를 반영 / `textarea`·`select` 제외 / `disabled="false"`는 표준상 허용되지 않는 값이며 동작을 보이려고만 씀 / 이름 소문자화는 HTML 문서의 HTML 요소에만 / `classList`·`style`은 별도 개념 / `reset` 이벤트(40장)는 별도 개념 / 접근자 프로퍼티의 enumerable 등 세부 / 예제 주소 `example.test` / console은 호스트 API.
- 수정
  - `tests/e2e/helpers.ts`: `HTML_ATTRIBUTE_DOM_PROPERTY_PATH`
  - `tests/e2e/a11y.spec.ts`: '개념 페이지: HTML 어트리뷰트와 DOM 프로퍼티'(정답 확인 버튼 보인 뒤 axe)
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤 없음, 홈 학습 순서 38→39
  - `tests/e2e/navigation.spec.ts`: 38→39, 마지막 '39번째'·새 제목, 분모 전부, live-html-collection '38 / 39'·링크 2개, 새 개념 '39 / 39'
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 39, 마지막 html-attribute-dom-property(이전 live-html-collection)
  - `tests/build/build-output.test.ts`: `프리렌더 (html-attribute-dom-property)` — 대응 표 region aria-label, 표 안 글자(`defaultValue`, `htmlFor`), `<details` 10개 이상
  - `docs/content-guide.md`: e2e 대상 목록에 slug 추가
  - `.claude/plans/concept-roadmap-ch38-42.md`: 4번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/`, `tests/helpers/`, 기존 개념 38개

## 5. 위험 요소

- 표 칸과 실제 동작 불일치 → evidence 줄 테스트 + 음성 확인(단계 2)
- 오개념(초기값/현재값 일반화) → ②~④는 dirty 플래그 근거, ⑤~⑦은 반영 근거로 나눠 쓰고 결과와 이유에서 정리(단계 3, 콘텐츠 검토)
- 16장 '프로퍼티 어트리뷰트'와 용어 혼동 → 제목에 'HTML'·'DOM', ①에서 구분, ⑪은 링크(단계 3)
- 근거 없는 설명(예약어 이유 등) → 제외 범위로 막음. 표준 인용은 글자 대조(단계 4)
- 책 예제와 닮음 → 직접 만든 이름·값(2절)
- '객체'가 title·summary·tags에 들어가 홈 검색 고정 테스트가 바뀜 → 쓰지 않음(단계 1)
- 넓은 표의 375px 넘침 → `<Wide>`, responsive e2e(단계 4)

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "html-attribute-dom-property|HTML 어트리뷰트와 DOM 프로퍼티|홈 학습 순서 보기"`
- 화면(빌드 serve, 메인 직접): 표(라이트·다크, 375·1280), JS 없이 퀴즈 정답, 퀴즈 동작, 코드 블록이 예제 원문과 같음
- 콘텐츠: 표준 인용 글자 대조, 참고 링크 anchor 확인

## 7. 미확정 사항

- 없음(⑪ 접근자 프로퍼티 절 포함 — 2026-11-04 사용자 승인)

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `examples/` 11개(초안 `cp`), `meta.ts`, 임시 `content.mdx`(필수 h2 3개), `route.tsx`(live-html-collection과 같은 모양) — meta.ts → content.mdx → route.tsx 순으로 만든다
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 3회 연속 통과, expectedOutput 한 줄을 바꾸면 실패(음성 확인 후 되돌림)

### 2. 대응 표 데이터와 테스트

- 대상: `attribute-table.ts`, `concept.test.ts`
- 완료 조건: `npx vitest run app/concepts/html-attribute-dom-property` 통과, evidence 줄 하나를 바꾸면 실패(음성 확인)

### 3. 본문

- 대상: `content.mdx`(1절 ①~⑫ h3, 예제 `file=` 블록, `<Wide>` 표, 퀴즈 10개 안팎, 결과와 이유)
- 주의사항: 한 페이지는 39장까지만 전제(이벤트 40장·`try...catch` 47장은 별도 개념). 원인을 "복사/공유"로 설명하지 않고 표준이 정한 단계(반영, dirty 플래그)로 설명
- 완료 조건: `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck` 통과

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 완료 조건: 6절 정적·단위·e2e 명령 통과, 화면 확인 항목 확인, 표준 인용 대조 결과를 구현 진행에 기록

## 변경 이력

- 2026-11-04 (사용자 요청 — 외부 콘텐츠 검토 8건): 모두 표준 원문·Chromium으로 확인 후 반영 — 단계 3. ① "대부분의 DOM 프로퍼티는 반영" → "어트리뷰트와 짝을 이루는 프로퍼티는 대부분 반영"(절 제목·도입·summary·흔한 오해) ② 흔한 오해 1의 "value와 checked뿐" → 이 페이지 범위로 한정, `textarea`(dirty value flag)·`option.selected`(dirtiness, `form-elements.html#concept-option-dirtiness` "It controls whether adding or removing the selected content attribute has any effect.")도 같은 구조라고 밝힘(Chromium: option 어트리뷰트 재추가 뒤 `false true`, textarea `입력 새 기본`) ③ 비표준 절 이유를 "요소 자신의 인터페이스에 그 이름의 IDL 어트리뷰트가 없으면"으로 좁히고 named getter(`form.이름` — HTMLFormElement `getter (RadioNodeList or Element) (DOMString name)`, Chromium `object INPUT`; `window`의 id 이름) 경로를 단순화에 추가 ④ href getter 4단계 "Otherwise, if url is null, return this's href content attribute's value." 인용 추가, 표 '문자열 (해석할 수 있으면 절대 URL)', 단순화 추가(Chromium `href="http://[bad"` → `http://[bad`, 예제로는 넣지 않음) ⑤ `[Reflect]` 계열이 HTML 표준이 정의한 확장 어트리뷰트임을 첫 등장에 명시, 참고 링크 `#using-reflect-via-idl-extended-attributes` 추가 ⑥ NamedNodeMap 유보 문장 삭제·단정 ⑦ 대소문자 절 제목에 "(HTML 요소에서)"·본문 첫 문장 범위 ⑧ reset 인용을 "or the empty string otherwise"까지. 인용문 28개를 내려받은 표준 사본과 공백 무시 대조, 모두 일치

- 2026-11-04 (사용자 요청 — 추가 외부 검토 3건): 모두 확인 후 반영 — 단계 3. ① 비표준 절의 좁히기 전 첫 문장 삭제 ② `[Reflect]` 계열 표기 설명을 `defaultValue` 문단에서 반영 절의 `htmlFor` IDL 문단 뒤로 옮기고 그 자리에는 앞으로 설명한다는 괄호만 남김 ③ 흔한 오해 1·단순화에서 `textarea`를 구분: 표준 `#dom-textarea-defaultvalue` "defaultValue attribute's getter must return the element's child text content" → 기본값은 어트리뷰트가 아니라 자식 텍스트, `option`의 `selected`는 `checked`와 같은 구조. 참고 링크 `textarea.defaultValue` 추가. 인용문 28개 표준 사본 대조 일치

## 구현 진행

- baseline (2026-11-04, `14f9a36`): lint 통과 / format:check 통과 / typecheck 통과 / `npm test` 109파일 3434개 통과 / test:build·e2e 미실행(직전 커밋 `14f9a36`에서 통과 기록)
- 결정(2026-11-04): 대응 표 region aria-label은 `어트리뷰트마다 대응하는 DOM 프로퍼티, 관계, 프로퍼티 값, 어트리뷰트가 없을 때의 값을 정리한 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)`. 표 행은 evidence를 예제 여러 개로 둘 수 있게 배열로 했다. `dataset.html` 마지막 줄에 `card.dataset.inStock`을 더해 없는 data 키가 `undefined`임을 출력으로 보인다(`false undefined`). 단계 4는 단계 1·2와 파일이 겹치지 않아 병렬로 진행.
- [x] 1. 예제·meta·route — `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/html-attribute-dom-property` 3회 연속 838개 통과. 예제 10개는 초안과 바이트 동일, `dataset.html`만 계획대로 한 줄 수정. references anchor 25개를 내려받은 사본에서 확인. 음성 확인: `custom` expectedOutput `'red undefined'`→`'red string'`이면 예제 실행과 표 근거 테스트 2건 실패, 되돌림 확인
- [x] 2. 대응 표 데이터와 테스트 — `attribute-table.ts` 13행·evidence 배열, `concept.test.ts` 25개(구조·미사용 예제 `['attributes','accessor']` 고정·근거 줄 subsequence) 통과. 서브에이전트 음성 확인(evidence 줄 변경 시 1건 실패)
- [x] 3. 본문 — 서브에이전트 작성(영어 인용 27조각을 내려받은 표준 사본과 공백 무시 대조, 모두 일치). 메인 검토 후 직접 수정: 예제 7 소개('어트리뷰트를 하나도 쓰지 않은' → `id` 말고는), '퀴즈에서 / 로 이어 적었습니다' 삭제, 첫 h3 '`value`와 `checked`만' → 텍스트 입력의 `value`·체크박스의 `checked`, 반영 절 '어긋날 수 없습니다' 완화, 비표준 절 이유 문장 정확화, 표 행 element `div (비표준)` → `비표준, div`(이중 괄호)
- 변경(2026-11-04, 구현 중 발견): 예제 8(`attributes.html`)의 출력 `4 … / 4 false`만으로는 `attributes`가 살아 있음을 보일 수 없음(서브에이전트 지적). 14번째 줄을 `console.log(attrs.length, JSON.stringify(nick.getAttributeNames()));`로 바꿔 기대 출력 셋째 줄이 `5 ["id","type","value","required","placeholder"]` — 길이 4 → 5 → 4가 보인다. 본문 ⑧·결과와 이유 갱신, 퀴즈 1개 추가(총 14개). 계획 ⑧의 원래 주장을 출력으로 뒷받침하는 수정이라 범위 변경 없음
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 확인(개수 39·마지막 개념·live-html-collection 38/39 링크 2개·새 개념 39/39·a11y·responsive·빌드 describe·content-guide·로드맵 '진행 중'). `npm run lint`·`format:check`·`typecheck` 통과, `npm test` 110파일 3483개 통과, `npm run test:build` 318개 통과, `navigation.spec.ts` 16개 통과, `-g "html-attribute-dom-property|HTML 어트리뷰트와 DOM 프로퍼티|홈 학습 순서 보기"` 8개 통과. 화면(빌드 serve): 1280 라이트 표 전체 보임, 375 다크 표가 region 안에서 가로 스크롤·문서 scrollWidth 375, JS 끔 `<details>` 14개·라디오 0, JS 켬 라디오 56개
- 리뷰 1차(critical-code-review, 메인 직접): High 1 — 표·본문이 `a.href`(IDL `[CEReactions, ReflectSetter] stringifier attribute USVString href`: 쓰기만 반영, 읽기는 별도 getter), 체크박스 `value`(default/on 모드 getter·setter), `dataset`(DOMStringMap)을 `[Reflect]`와 같은 "반영"으로 표기 → 표 관계 칸을 '쓰기는 반영, 읽기는 어트리뷰트를 URL로 해석'·'어트리뷰트를 직접 읽고 쓴다 (default/on 모드)'·'DOMStringMap이 이름을 바꿔 어트리뷰트를 읽고 쓴다'로, 본문 ③⑥⑩과 흔한 오해 Callout을 고침(근거: 내려받은 links.html IDL). Low 1 — `form.reset()`이 reset 이벤트가 취소되지 않을 때만 reset 알고리즘을 실행한다는 조건 누락 → 본문에 반영. 재검증: lint·format:check·typecheck 통과, `npm test` 3483개, `test:build` 318개, navigation 16개, 새 페이지 e2e 8개 통과
- 남은 항목: `reviewedAt: '2026-11-04'`은 사용자 콘텐츠 승인 전 값(승인 날짜로 확정 필요)
- 외부 검토 반영 뒤 재검증: summary 160자 초과(172자)로 content-integrity 1건 실패 → summary를 152자로 줄임. lint·format:check·typecheck 통과, `npm test` 3483개, `test:build` 318개, navigation 16개, 새 페이지 e2e 8개 통과

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(새 개념 폴더 1개, 예제 11개, 대응 표 13행, 고정 테스트·e2e·빌드 테스트·content-guide·로드맵). 공통 코드와 기존 개념 38개는 바꾸지 않았다.
- 달라진 점: 예제 8(`attributes.html`)에 `attrs.length` 출력을 더해 4 → 5 → 4가 보이게 했다(원래 출력으로는 살아 있음이 드러나지 않음). 예제 9(`dataset.html`) 마지막 줄에 없는 키의 `undefined`를 더했다. 퀴즈는 계획의 "10개 안팎"보다 많은 14개.
- 표의 "관계" 칸은 계획의 "반영 / 기본값만 반영" 두 가지에서, `href`(쓰기만 반영)·체크박스 `value`(default/on 모드)·`dataset`(DOMStringMap)을 반영과 구분하는 표기로 바뀌었다(리뷰 High).
- 외부 검토 두 차례(8건·3건)를 표준 원문과 Chromium으로 확인한 뒤 본문·단순화·참고 링크에 반영했다(`변경 이력`).

### 코드 리뷰
- High 1(명세상 `[Reflect]`가 아닌 것을 "반영"으로 표기)·Low 1(reset 이벤트 취소 조건) 수정. 남긴 항목 없음.

### 후속 작업
- [ ] 기존 개념의 "별도 개념" 문구를 이 페이지 링크로 바꾸는 역방향 연결(dom-tree-nodes의 '어트리뷰트와 프로퍼티의 관계는 별도 개념' 등) — 사용자 결정대로 나중에 일괄 처리
- [ ] 38~42장 로드맵 5번 이벤트 전파와 위임

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 표의 칸마다 근거 예제 출력 줄을 데이터(`attribute-table.ts`의 `evidence`)로 붙이고 테스트가 expectedOutput과 대조한다 — 표를 정적 마크다운으로 쓰는 대안은 표와 실제 동작이 어긋나도 알 수 없어서 버렸다. 출력에 안 보이는 칸(예: `defaultChecked`가 없을 때 `false`)은 표준 반영 규칙에서 가져왔다고 본문에 밝혔다.
- [Claude 판단] `a.href`·체크박스 `value`·`dataset`을 "반영"에서 분리했다 — 셋 다 결과는 어트리뷰트를 따르지만 IDL이 `[Reflect]`가 아니다(`href`는 `[ReflectSetter]`, 체크박스 `value`는 default/on 모드 getter·setter, `dataset`은 DOMStringMap). 결과가 같아도 명세와 다른 용어는 오개념 위험이 크다는 기준을 따랐다.
- [Claude 판단] 예제 8에 `attrs.length`를 하나 더 출력하게 고쳤다 — 원래 `4 → 4` 출력은 스냅숏이어도 같은 값이라, "NamedNodeMap은 요소의 어트리뷰트 목록 자체"라는 주장을 실행 결과로 보이지 못했다.
- [무검토 승인] ⑪ "DOM 프로퍼티는 프로토타입의 접근자 프로퍼티" 절 추가 — 요청 범위 밖이었지만 getter가 매번 어트리뷰트나 내부 상태를 읽는다는 설명의 근거라 넣었다(Web IDL "Regular attributes are exposed on the interface prototype object").
- "어트리뷰트 = 초기값, 프로퍼티 = 현재값"을 일반 규칙으로 쓰지 않고, dirty 플래그가 있는 텍스트 입력 `value`·`checked`(그리고 `option.selected`)에만 맞는다고 한정했다. 외부 검토로 "대부분의 DOM 프로퍼티" → "어트리뷰트와 짝을 이루는 프로퍼티는 대부분"으로 범위를 좁혔다.

#### 배경지식
- dirty value flag: `input`·`textarea`가 가진 플래그. false면 값이 기본값(`value` 어트리뷰트)을 따라가고, 사용자 입력이나 `.value =` 대입으로 true가 되면 어트리뷰트를 바꿔도 값이 그대로다. `form.reset()`은 플래그를 false로 되돌린다.
- 반영(reflect): HTML 표준의 IDL 확장 어트리뷰트 `[Reflect]` 등으로 선언되며, getter가 어트리뷰트를 읽고 setter가 어트리뷰트를 쓴다. 타입에 따라 불리언(있으면 true), 음이 아닌 정수(실패 시 -1) 같은 변환이 붙는다.
- DOM 프로퍼티는 Web IDL에 따라 인터페이스 프로토타입 객체의 접근자 프로퍼티다(요소의 own 프로퍼티가 아님).
- HTML 문서의 HTML 요소에서는 `getAttribute`·`setAttribute`·`hasAttribute`가 이름을 ASCII 소문자로 바꾼다.

#### 확인 질문
1. `nick.value = '철수'` 뒤 `setAttribute('value', '영희')`를 하면 `.value`가 바뀌지 않는데, `form.reset()` 뒤에는 같은 `setAttribute`가 `.value`를 바꾼다. 무엇이 달라졌기 때문인가?
   <details><summary>답</summary>`.value` 대입이 dirty value flag를 true로 만들었고, reset 알고리즘이 그 플래그를 false로 되돌렸다. 플래그가 false일 때만 value 어트리뷰트 변경이 값에 반영된다(계획 1절 ②④, 예제 1·4).</details>
2. 체크박스의 `.value = '동의'`는 `getAttribute('value')`도 `'동의'`로 바꾸는데, 텍스트 입력은 그렇지 않다. 왜 같은 `value`가 다르게 동작하나?
   <details><summary>답</summary>value IDL 어트리뷰트는 input type마다 모드가 다르다. 텍스트 입력은 value 모드(값을 따로 두고 dirty 플래그를 켬), 체크박스는 default/on 모드(getter·setter가 value 어트리뷰트를 직접 읽고 씀, 없으면 'on')다(계획 1절 ③, 예제 3, `attribute-table.ts` 체크박스 value 행).</details>
3. 표에서 `href`를 왜 그냥 "반영"이라고 쓰지 않았나? 결과만 보면 어트리뷰트를 따르는데.
   <details><summary>답</summary>IDL이 `[ReflectSetter]`라 쓰기만 반영이고, 읽기는 별도 getter가 URL로 해석해 절대 URL을 돌려준다(해석 실패 시 어트리뷰트 문자열 그대로). 명세 용어와 다른 표기는 결과가 맞아도 오개념 위험이 있어 리뷰에서 High로 고쳤다(`구현 진행` 리뷰 1차, `변경 이력` ④).</details>
4. 예제 8에서 `attrs.length`를 중간에 한 번 더 출력하지 않으면 어떤 주장이 실행 결과로 뒷받침되지 않나?
   <details><summary>답</summary>`attributes`가 돌려준 NamedNodeMap이 요소의 어트리뷰트 목록 자체를 본다(이후 변경이 보인다)는 주장. 추가·삭제 뒤 길이가 4로 같아 스냅숏이어도 같은 출력이었다(`변경` 2026-11-04 항목, 예제 8).</details>
5. `<div color="red">`에서 `box.color`는 `undefined`인데 `<form><input name="color"></form>`의 `form.color`는 요소다. 본문의 비표준 어트리뷰트 설명과 모순인가?
   <details><summary>답</summary>아니다. 본문은 "요소 자신의 인터페이스에 그 이름의 IDL 어트리뷰트가 없으면"으로 범위를 좁혔고, `form.color`는 HTMLFormElement의 named getter로 컨트롤에 닿는 다른 경로라 단순화에 "다루지 않는다"고 밝혔다(`변경 이력` 외부 검토 ③).</details>
