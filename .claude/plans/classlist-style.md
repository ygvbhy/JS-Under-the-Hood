# classList와 style 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-17
- 기준: `main` @ `978372d`

## 0. 요약
- 목적: 추가 게시글 로드맵 2차. "스타일시트로 준 색인데 el.style.color는 왜 빈 문자열일까"를 질문으로, classList와 style이 각각 class·style 어트리뷰트를 다루는 객체라는 것을 설명하는 65번째 개념 페이지 `classlist-style`을 추가한다(order 375, 학습 순서 51번째).
- 범위: 새 개념 폴더(브라우저 예제 6개, 퀴즈 6개, 결과 표, 시뮬레이터 1개·시나리오 2개), html-attribute-dom-property·live-html-collection의 "별도 개념" 문구, 순서·등록 테스트. 공통 코드 소스는 바꾸지 않는다.
- 위험: CSS 직렬화 형식(`font-size: 20px; color: blue;`, `rgb(255, 0, 0)`)처럼 표준과 Chromium 출력이 얽힌 곳을 표준 문장처럼 쓰는 것.
- 복잡도: 중간 · Consensus: 수행(Architect·Critic 1회, HIGH 3건을 실행·표준으로 확인해 반영)
- 미확정: 2건

## 1. 요구사항
- 사용자 결정(2026-11-17): 한 페이지로 묶음, order 375, style은 인라인 중심(getComputedStyle은 대비로만), 시뮬레이터 1개.
- 전제 장: 『모던 자바스크립트 Deep Dive』 39~40장 범위. 선행 개념은 html-attribute-dom-property(어트리뷰트 반영), dom-tree-nodes.
- 유지: 다른 페이지의 예제·출력·퀴즈·`reviewedAt`. 공통 코드(`app/components/`, `app/simulator/`, `app/lib/` 소스, `app/routes/`).
- 제외: CSS 캐스케이드·명시도 규칙 자체, `!important`, 사용자 정의 속성(`--x`), 축약 속성의 분해 규칙, getComputedStyle의 값 형식 세부(색이 rgb로 나오는 이유 등), 의사 요소, `CSSStyleSheet`·`document.styleSheets`, `relList` 등 다른 DOMTokenList, `supports()`, `replace()`, SVG의 className, MutationObserver, 리플로·성능.

## 2. 사실과 추정

### 사실 (표준 원문 — scratchpad `cl/dom.html`, `cl/cssom.html`, `cl/styleattr.html`, 2026-11-17 내려받음)
- DOM 표준 `#dom-element-classname`: "The className attribute must reflect "class"."
- DOM 표준 Element IDL: `[SameObject, PutForwards=value] readonly attribute DOMTokenList classList;`
- DOM 표준 `#dom-element-classlist`: classList getter는 associated element가 this이고 attribute name이 class인 DOMTokenList를 돌려준다.
- DOM 표준 `#interface-domtokenlist`
  - DOMTokenList는 token set(순서 있는 집합), element, attribute name을 가진다.
  - 어트리뷰트가 바뀔 때(attribute change steps, namespace가 null이고 localName이 attribute name일 때): 값이 null이면 token set을 비우고, 아니면 "set set's token set to value, parsed"(ordered set parser: ASCII 공백으로 나누고 순서 있는 집합에 넣음 → 중복 제거). 생성될 때는 어트리뷰트 값(없으면 빈 문자열)으로 같은 단계를 실행한다.
  - update steps: 어트리뷰트가 없고 token set이 비어 있으면 아무것도 하지 않는다. 아니면 어트리뷰트 값을 ordered set serializer 결과(U+0020으로 이어 붙임)로 설정한다.
  - add/remove: 먼저 모든 토큰을 검사(빈 문자열 → SyntaxError, ASCII 공백 포함 → InvalidCharacterError)한 뒤 집합을 바꾸고 update steps를 실행한다. 이미 있는 토큰을 add해도 update steps는 실행된다.
  - toggle(token, force): 있으면 제거하고 false, 없으면 추가하고 true(force가 없을 때). "The update steps are not always run for toggle() for web compatibility."
  - contains는 검사 없이 token set에 있는지만 돌려준다.
  - `stringifier attribute DOMString value` — serialize steps는 어트리뷰트 값을 그대로 돌려준다.
- CSSOM `#the-elementcssinlinestyle-mixin`: `[SameObject, PutForwards=cssText] readonly attribute CSSStyleProperties style;` — "provides access to inline style properties of an element". 반환 객체는 readonly flag가 unset이고 owner node가 this다.
- CSSOM `#css-declaration-block`
  - 생성될 때: owner node의 style 어트리뷰트 값이 null이 아니면 declarations를 그 값을 파싱한 결과로 둔다.
  - attribute change steps: localName이 style일 때 value가 null이면 declarations를 비우고, 아니면 파싱 결과로 바꾼다(computed flag나 updating flag가 설정돼 있으면 하지 않음).
  - update style attribute: owner node의 style 어트리뷰트를 선언 블록을 직렬화한 문자열로 설정한다.
  - 직렬화 형식: serialize a CSS declaration은 속성 이름 + `": "` + 값 + `";"`이고, serialize a CSS declaration block은 선언들을 U+0020으로 잇는다. 값 부분의 직렬화(`blue`, `0px`, `rgb(…)`)는 속성별 규칙이다.
- CSSOM camel-cased attribute(`#dom-cssstyleproperties-camel_cased_attribute`): 읽기는 getPropertyValue, 쓰기는 setProperty를 호출한다. dashed attribute(`font-size`)도 같다. `cssFloat`는 `float`에 대응한다.
- CSSOM setProperty(`#dom-cssstyledeclaration-setproperty`): 지원하는 속성이 아니면 return, value가 빈 문자열이면 removeProperty, 값을 파싱하지 못하면(component value list가 null) return. 바뀌었으면 update style attribute.
- CSSOM getPropertyValue: declarations에 그 속성의 선언이 없으면 빈 문자열.
- CSSOM getComputedStyle(`#dom-window-getcomputedstyle`): computed flag와 readonly flag가 설정된 live CSSStyleProperties를 돌려주고, 선언은 모든 longhand 속성의 resolved value다.
- CSS Style Attributes `#interpret`: "these declarations are considered to have author origin and a specificity higher than any selector". 명시도에 대한 문장이지 캐스케이드 결과 전체에 대한 문장이 아니다(`!important` 반례는 아래 실행 결과).
- 현재 CSSOM 초안은 style의 반환 타입을 `CSSStyleProperties`(CSSStyleDeclaration을 상속)로 적는다. Chromium의 `Object.prototype.toString.call(el.style)`은 `[object CSSStyleDeclaration]`이다(2026-11-17 실행).

### 사실 (Chromium 실행 — Playwright Chromium, 2026-11-17, scratchpad `cl/ex/*.html`)
- inline-only: `"" 20px` / `rgb(255, 0, 0) 20px`
- style-attribute: `font-size:20px 1` / `font-size: 20px; color: blue; 2` / `"" 4px 1` / `"" 0`
- style-values: `yellow yellow` / `10px` / `10px` / `0.5 string` / `"" background-color: yellow; opacity: 0.5;`
- class-list: `note on note on` / `3 a false` / `true`
- token-set: `2 a b a` / `2 a b` / `false a` / `true a b` / `InvalidCharacterError false a b` / `true ""`
- class-and-style: `"" rgb(0, 0, 0)` / `"" rgb(0, 128, 0)` / `blue rgb(0, 0, 255)` / `on blue rgb(0, 0, 255)`
- 그 밖의 탐침 결과
  - `el.style === el.style`은 true, `el.classList === el.classList`도 true.
  - `el.style = 'color: red'`(문자열 대입)는 cssText 대입처럼 동작한다(PutForwards).
  - `el.classList = 'u v'`도 value 대입처럼 동작한다(PutForwards=value).
  - `box.style.foo = 'bar'`는 JS 프로퍼티만 만들고 style 어트리뷰트에는 나타나지 않는다.
  - style에 값을 넣었다가 `''`로 지우면 style 어트리뷰트는 빈 문자열로 남는다(`hasAttribute('style')`이 true).
  - class 어트리뷰트가 없는 요소에서 `classList.remove('k')`를 해도 어트리뷰트가 생기지 않는다.
  - `.imp { color: green !important; }` + `style="color: blue"`이면 `style.color`는 `blue`, `getComputedStyle().color`는 `rgb(0, 128, 0)`이다. 스타일시트의 `!important` 선언이 style 어트리뷰트의 선언을 이긴다.
  - `class="a  a b"`에서 `toggle('a', true)`는 `true`를 돌려주고 className은 그대로다(update steps를 실행하지 않음). 같은 상태에서 `remove('zzz')`를 하면 `a b`로 다시 쓰인다.
  - `width = 0`은 `0px`, `opacity = 0.5`는 `0.5`, `width = 10`은 무시된다. 숫자라서가 아니라 `10`이 width의 유효한 값이 아니어서다.
  - getComputedStyle 결과에 쓰면 sloppy·strict 모두 NoModificationAllowedError다.
  - `'color' in box.style`은 true인데 Chromium에서는 자기 프로퍼티다(`hasOwnProperty`가 true). 표준 IDL과 다른 구현 세부라 본문에 쓰지 않는다.

### 사실 (코드)
- html-attribute-dom-property `meta.ts:145`: "classList와 style은 별도 개념이며 이 페이지에서 다루지 않습니다. form.reset()이 일으키는 reset 이벤트도 별도 개념입니다."
- live-html-collection `content.mdx:234`가 `classList.add`를 쓰는 처리를 언급하고, `meta.ts:110`이 "className 대입은 DOM 조작 API이며 … 설명하지 않고"라고 적는다.
- 브라우저 개념의 시뮬레이터는 `examples/*.html?raw`를 가져와 줄 번호로 강조한다(`live-html-collection/scenarios.ts:2-3`). 래퍼는 `Simulator.tsx`가 `SimulatorShell`에 `label`과 `renderState`만 넘긴다.
- 순서 삽입 시 고칠 곳(arguments-object 계획 §4와 같은 목록): `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`(총수 64 → 65), `tests/e2e/navigation.spec.ts`(51번째 이후 순위 +1, `/ 64` → `/ 65`, `toHaveCount(64)` 2곳, html-attribute-dom-property의 다음·event-propagation-delegation의 이전 링크: 485~523행), `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md:225`.
- 홈 검색 '객체' 결과 수(18)와 순위 배열이 `navigation.spec.ts`에 고정돼 있다. 새 페이지의 title·summary·tags에 '객체'가 들어가면 4곳과 순위 배열을 고쳐야 한다.

### 추정
- 없음. (검토에서 확인: `filterConcepts`는 title·summary·tags만 본다 `app/lib/concepts.ts:91-100`. '객체' 순위 배열 `navigation.spec.ts:107-126`에서 51 이상은 55·60뿐이다.)
- 표 칸과 화면의 연속 공백: `normalizeCell`이 `\s+`를 공백 하나로 접고(`tests/helpers/result-tables.ts:23`), 시뮬레이터 콘솔·퀴즈 선택지도 연속 공백을 한 칸으로 보인다. 그래서 예제 출력에 연속 공백을 넣지 않는다(Architect HIGH).

## 3. 구현 전략
- 한 줄기: "classList는 class 어트리뷰트를, style은 style 어트리뷰트를 다루는 객체다. 둘 다 요소에 적용된 최종 스타일을 보여 주지 않는다." 제목 질문(스타일시트의 색이 style에 없는 이유)의 답을 첫 문단에 쓰고, 표준의 생성 단계·attribute change steps·update steps로 양방향을 설명한다.
- 결과의 원인을 "동기화된다", "연결돼 있다" 같은 비유로 쓰지 않고, 표준이 정한 단계(어트리뷰트가 바뀌면 token set·declarations를 다시 파싱, 객체로 바꾸면 어트리뷰트를 직렬화한 문자열로 설정)로 쓴다.
- 예제는 "끊김/없음"보다 먼저 "있음"을 같은 예제 안에서 보인다(arguments-object 교훈). 예: inline-only는 `style.color`가 빈 문자열인 줄과 `style.fontSize`가 `20px`인 줄을 함께 출력해 "style은 늘 비어 있다" 모델을 배제한다.
- 표준과 Chromium 출력의 구분: 직렬화된 문자열의 정확한 형식(`font-size: 20px; color: blue;`, `rgb(255, 0, 0)`, `0px`)은 "Chromium에서 실행한 값"이라고 밝히고, 표준 근거는 "직렬화한 문자열로 설정한다"까지만 쓴다. getComputedStyle의 값 형식은 다루지 않는다고 simplifications에 적는다.
- 버린 대안
  - 두 페이지 분리, getComputedStyle 심화: 사용자 결정으로 제외.
  - `el.style`이 CSSStyleProperties라는 타입 이름을 본문에 쓰기: Chromium의 클래스 이름(CSSStyleDeclaration)과 초안의 이름이 달라 혼란을 준다. 본문은 "CSS 선언 블록(CSS declaration block)을 나타내는 객체"라고 쓰고, 타입 이름 차이는 simplifications에 한 줄로 밝힌다.
  - 시뮬레이터에 스타일시트 규칙·계산된 스타일 영역 넣기: 캐스케이드를 시각화해야 해서 범위를 넘는다. 시뮬레이터는 어트리뷰트와 두 객체의 내부 상태만 그린다.

## 4. 변경 파일
- 추가: `app/concepts/classlist-style/`
  - `meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`
  - `scenarios.ts`, `Simulator.tsx`, `AttributeObjectView.tsx`, `AttributeObjectView.test.tsx`, `Simulator.test.tsx`
  - `examples/inline-only.html`, `style-attribute.html`, `style-values.html`, `class-list.html`, `token-set.html`, `class-and-style.html`
- 수정
  - `app/concepts/html-attribute-dom-property/meta.ts:145`(문구 + related), 본문에 한 문장 링크(작업 순서 4)
  - `app/concepts/live-html-collection/meta.ts:110`(문구 + related)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`
  - `docs/content-guide.md:225`
- 계획 문서: `.claude/plans/classlist-style.md`
- 변경하지 않음: 공통 코드 소스, 다른 페이지의 예제·퀴즈·`reviewedAt`, `tests/helpers/`(브라우저 예제 실행기).

## 5. 위험 요소
- Chromium 직렬화 형식을 표준 문장처럼 서술 → 독자가 모든 브라우저에서 같은 문자열을 기대 → 본문에서 "Chromium에서 실행한 값"으로 한정(작업 순서 2), simplifications.
- "style은 인라인 스타일만 보여 준다"를 "스타일시트 값은 JS로 읽을 수 없다"로 읽힘 → class-and-style·inline-only 예제가 getComputedStyle로 읽는 줄을 함께 보임(작업 순서 1·2).
- "classList가 class 어트리뷰트와 같다"는 과잉 일반화 → token-set 예제가 중복이 있는 어트리뷰트(`a b a`)에서 `length 2`인데 `className`은 원문 그대로임을 보이고, add 뒤에야 어트리뷰트가 다시 쓰임을 보임(작업 순서 1).
- update steps의 조건을 빠뜨림 → 본문은 층을 나눠 쓴다: "add·remove는 집합을 바꾼 뒤 어트리뷰트를 다시 쓴다. 다만 class 어트리뷰트가 없고 집합도 비어 있으면 쓰지 않는다(표준 인용)". toggle의 force 인수와 "집합이 바뀌지 않는 toggle"은 다루지 않고 simplifications에 밝힌다(작업 순서 1·2).
- "style 어트리뷰트가 선택자보다 우선한다"는 과잉 일반화(`!important` 반례) → 본문 문장은 표준 그대로 "명시도가 어떤 선택자보다 높은 것으로 취급된다"로 쓰고, 같은 문장 안에서 "`!important`가 붙은 선언은 다루지 않는다"고 한정(작업 순서 2).
- "숫자는 무시된다"로 읽힘 → style-values 예제가 `opacity = 0.5`가 들어가는 줄을 함께 보이고, 본문은 "그 속성의 값으로 파싱하지 못하면"으로 쓴다(작업 순서 1·2).
- 예제 HTML의 공백·줄 번호가 시뮬레이터 강조와 어긋남 → `assertScenarioInvariants`와 줄 번호 테스트(작업 순서 3).
- 순서 삽입으로 순위 테스트 누락 → HEAD 목록을 변환한 것과 대조하는 스크립트(작업 순서 5).
- '객체'가 summary·tags에 들어가 검색 테스트가 깨짐 → 넣지 않는다. concept.test에 `filterConcepts(…, '객체')`에 새 slug가 없다는 검사를 둔다(작업 순서 3).
- 브라우저 예제가 `npm test`에서 `expectedOutput`과 달라짐(탐침은 `setContent`, 실행기는 서버 주소) → 작업 순서 1에서 실행기로 대조.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(공통 코드 미변경): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "classlist-style|classList와 style|홈 학습 순서 보기"`. 수정한 두 페이지(html-attribute-dom-property, live-html-collection)의 a11y·responsive 케이스도 `-g`에 더한다.
- 브라우저(dev 서버, 재시작 필요)
  1. `/concepts/classlist-style`을 연다 → pager가 `51 / 65`, 이전이 'HTML 어트리뷰트와 DOM 프로퍼티', 다음이 '이벤트 전파와 위임'.
  2. 시뮬레이터 첫 시나리오에서 '다음'을 끝까지 누른다 → 마지막 단계의 출력이 예제의 `expectedOutput`과 같다.
  3. 시나리오를 둘째로 바꾼다 → 첫 단계로 돌아가고 class 어트리뷰트·token set 영역이 보인다.
  4. 콘솔 오류가 없다.
  5. `/concepts/html-attribute-dom-property`의 단순화 목록에서 새 페이지 이름이 보인다.

## 7. 미확정 사항
- [미확정 1] 제목. 기본안: `classList와 style: 스타일시트로 준 색인데 el.style.color는 왜 빈 문자열일까`. 대안: `…: el.style.color는 왜 빈 문자열일까`(짧게). 답과 무관하게 구조는 같다.
- [미확정 2] 기존 페이지 문구 범위와 `reviewedAt`. 기본안: html-attribute-dom-property와 live-html-collection 두 페이지만 고치고 `reviewedAt`은 유지한다. `docs/content-guide.md:229`는 "본문을 고치면 다시 검토받고 `reviewedAt`을 갱신"이라고 적지만, 링크만 더한 이전 커밋(c735c10, 0901ba0)은 날짜를 바꾸지 않았다(문서와 관행의 차이). event-propagation-delegation·prevent-default-stop-propagation 등 예제에서 classList·style을 쓰는 다른 페이지는 작업 순서 4에서 grep으로 확인만 하고, "별도 개념" 문구가 있을 때만 고친다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: `app/concepts/classlist-style/meta.ts`, `route.tsx`, `examples/*.html` 6개
- 현재: 없음
- 변경
  - 예제 6개를 scratchpad `cl/ex/*.html`의 내용 그대로 만든다(문서 전체, `<!doctype html>`로 시작, 파일 끝 줄바꿈 하나). 본문 텍스트는 `글자`.
    - `inline-only.html`: `<style>#box { color: red; }</style>` + `<p id="box" style="font-size:20px">`. `JSON.stringify(box.style.color), box.style.fontSize` → `"" 20px`. `computed.color, computed.fontSize` → `rgb(255, 0, 0) 20px`.
    - `style-attribute.html`: `getAttribute('style'), style.length` → `font-size:20px 1` / `box.style.color = 'blue'` 뒤 → `font-size: 20px; color: blue; 2` / `setAttribute('style', 'margin-top: 4px')` 뒤 `JSON.stringify(style.color), style.marginTop, style.length` → `"" 4px 1` / `removeAttribute('style')` 뒤 → `"" 0`.
    - `style-values.html`: `backgroundColor = 'yellow'` 뒤 `style['background-color'], getPropertyValue('background-color')` → `yellow yellow` / `width = '10px'; width = 10` → `10px` / `width = 'wide'` → `10px` / `opacity = 0.5` 뒤 `style.opacity, typeof style.opacity` → `0.5 string` / `width = ''` → `"" background-color: yellow; opacity: 0.5;`.
    - `class-list.html`: `class="note"`, `list.add('on')` → `note on note on` / `className = 'a b c'` 뒤 `list.length, list[0], list.contains('note')` → `3 a false` / `list === tag.classList` → `true`.
    - `token-set.html`: `class="a b a"`. `list.length, className` → `2 a b a` / `list.add('a')` 뒤 → `2 a b` / `list.toggle('b'), className` → `false a` / 다시 → `true a b` / `try { list.add('c', 'd e') } catch (e)`에서 `e.name, list.contains('c'), className` → `InvalidCharacterError false a b` / `list.remove('a', 'b')` 뒤 `hasAttribute('class'), JSON.stringify(getAttribute('class'))` → `true ""`. 출력에 연속 공백을 넣지 않는다.
    - `class-and-style.html`: `<style>p { color: black; } .on { color: green; }</style>`(규칙마다 한 줄) + `<p id="tag">`. → `"" rgb(0, 0, 0)` / `classList.add('on')` 뒤 → `"" rgb(0, 128, 0)` / `style.color = 'blue'` 뒤 `style.color, getComputedStyle(tag).color` → `blue rgb(0, 0, 255)` / `classList.remove('on'); classList.add('on')` 뒤 `className, style.color, computed` → `on blue rgb(0, 0, 255)`. 마지막 줄은 "나중에 바꾼 쪽이 적용된다" 모델을 배제한다. `p { color: black; }`은 첫 줄이 UA 기본 글자색에 기대지 않게 한다.
  - 예제별로 배제하는 틀린 모델(퀴즈 오답 선택지는 이 모델이 내는 출력으로 만든다)
    - 1 inline-only: "style은 적용된 스타일을 돌려준다"(`red`·`rgb(255, 0, 0)`), "style은 늘 비어 있다"(`"" ""`).
    - 2 style-attribute: "style은 처음 읽을 때의 사본이다"(setAttribute 뒤에도 `blue`), "style에 쓰면 어트리뷰트 끝에 덧붙인다"(`font-size:20px; color: blue`).
    - 3 style-values: "숫자 대입은 무시된다"(opacity도 빈 값), "틀린 값을 넣으면 선언이 지워진다"(`""`), "숫자 10은 10px이 된다".
    - 4 class-list: "classList는 얻은 시점의 사본이다"(`2 note true`), "읽을 때마다 새 객체다"(`false`).
    - 5 token-set: "add는 문자열 끝에 붙인다"(`a b a a`), "이미 있으면 아무 일도 없다"(`a b a` 유지), "예외 전에 앞 토큰은 들어간다"(`true`·`a b c`), "토큰이 없어지면 어트리뷰트도 없어진다"(`false null`).
    - 6 class-and-style: "클래스를 바꾸면 el.style도 바뀐다"(`green`), "나중에 바꾼 쪽이 적용된다"(마지막 줄 green).
  - summary(초안, 160자 이하): 'el.style은 style 어트리뷰트의 선언만 보여 줍니다. classList와 class 어트리뷰트, style과 style 어트리뷰트가 서로 어떻게 바뀌는지, 적용된 값은 어디서 읽는지 확인합니다.'
  - `meta.ts`: slug `classlist-style`, title 미확정 1 기본안, category `browser`, order 375, prerequisites `html-attribute-dom-property`·`dom-tree-nodes`, related `html-attribute-dom-property`·`live-html-collection`·`dom-tree-nodes`·`error-handling`, examples 6개(runtime `browser`, 위 expectedOutput), `reviewedAt: null`. title·summary·tags에 '객체'를 넣지 않는다. summary 160자 이하.
  - references: DOM 표준 `https://dom.spec.whatwg.org/#interface-domtokenlist`, `#dom-element-classlist`, CSSOM `https://drafts.csswg.org/cssom/#the-elementcssinlinestyle-mixin`, `#css-declaration-block`, `#dom-window-getcomputedstyle`, CSS Style Attributes `https://drafts.csswg.org/css-style-attr/#interpret`, MDN `Element/classList`, `HTMLElement/style`.
  - simplifications(초안): 실행 결과는 Chromium 값이고 선언을 `이름: 값;`으로 쓰고 공백 하나로 잇는 것은 CSSOM이 정하지만 값 부분의 직렬화 규칙(`rgb(…)`, `0px`)은 다루지 않음 / 캐스케이드·명시도·`!important`는 다루지 않고, style 어트리뷰트 선언의 명시도가 어떤 선택자보다 높게 취급된다는 표준 문장만 씀(`!important`가 붙은 스타일시트 선언은 이 선언을 이길 수 있음) / getComputedStyle은 스타일시트 값을 읽는 대비로만 쓰고 값 형식·의사 요소·읽기 전용은 다루지 않음 / 축약 속성(`margin`)이 여러 선언으로 나뉘는 것은 다루지 않음 / 현재 CSSOM 초안은 style의 타입을 CSSStyleProperties로 적는데 Chromium은 CSSStyleDeclaration으로 보임 / `replace`·`supports`·`relList`·toggle의 둘째 인수(force)는 다루지 않음 / 예제 5의 try…catch와 `e.name`은 예외 이름을 출력하는 도구로만 쓰고 try/catch/finally 개념에서 다룸 / style 쓰기가 무시되는 경우는 값이 유효하지 않은 경우만 보이고 지원하지 않는 속성 이름 등은 다루지 않음 / 시뮬레이터 단순화 항목 / console.log는 호스트 API(이 페이지는 전부 호스트 동작).
- 이유: 출력 주장은 예제 파일과 `expectedOutput`으로 실행 검증한다(AGENTS.md).
- 주의사항: `console.log`에는 문자열·숫자·불리언·`JSON.stringify` 결과만 넘긴다. 빈 문자열은 `JSON.stringify`로 감싸 `""`로 보이게 한다. 예제 폴더는 Prettier 제외라 수동으로 형식을 맞춘다.
- 완료 조건: `npm test -- tests/examples.test.ts`와 `tests/content-integrity.test.ts`가 통과하고, 6개 예제의 실제 출력(실행기 주소 기준)이 위 값과 같다. references와 본문에서 링크하는 표준 id가 모두 scratchpad 표준 사본에 있다(grep).

### 2. content.mdx 본문
- 대상: `app/concepts/classlist-style/content.mdx`
- 변경: 필수 h2 3개(동작 원리 / 예제 / 결과와 이유)를 기존 페이지 형식으로 쓴다.
  - `## 동작 원리`
    - 첫 문단: 제목 질문의 답. `el.style`은 요소의 style 어트리뷰트에 적힌 선언만 나타내고, 스타일시트 규칙으로 적용된 값은 들어 있지 않다. 이 페이지가 Chromium 실행과 DOM·CSSOM 표준을 근거로 한다는 한 문장.
    - `### classList는 class 어트리뷰트의 토큰 집합이다`: className은 class를 반영([HTML 어트리뷰트와 DOM 프로퍼티](/concepts/html-attribute-dom-property) 링크). classList는 token set을 가진 객체. 어트리뷰트가 바뀌면 값을 ASCII 공백으로 나눠 집합으로 다시 만든다. add·remove는 집합을 바꾼 뒤 어트리뷰트를 토큰을 공백 하나로 이은 문자열로 설정한다. 다만 class 어트리뷰트가 없고 집합도 비어 있으면 설정하지 않는다(표준 인용, 예제 없음). 그래서 이미 있는 토큰을 add해도 어트리뷰트의 중복이 정리된다. toggle은 토큰이 있으면 빼고 false, 없으면 넣고 true를 돌려준다(force 인수는 다루지 않음). 빈 문자열·공백 포함 토큰은 예외(이름 두 개)이고, 표준이 모든 토큰을 먼저 검사하므로 예외가 나면 아무 토큰도 추가되지 않는다(예제 5의 `contains('c')`가 false). `el.classList`와 `el.style`은 IDL의 `[SameObject]`라 읽을 때마다 같은 객체.
    - `### style은 style 어트리뷰트의 선언 블록이다`: 선언 블록(CSS declaration block) 소개. 어트리뷰트가 바뀌면 선언을 다시 파싱하고, 객체로 선언을 바꾸면 어트리뷰트를 선언 블록을 직렬화한 문자열로 설정한다. 선언마다 `이름: 값;`으로 쓰고 공백 하나로 잇는 것은 CSSOM 인용, 값 부분의 형식은 Chromium에서 실행한 값이라고 한정. `backgroundColor`와 `background-color` 두 이름, 읽기는 getPropertyValue·쓰기는 setProperty와 같다. 쓰기가 무시되는 경우는 "그 속성의 값으로 파싱하지 못할 때"로 쓴다(`10`·`wide`는 width의 유효한 값이 아님. 숫자 `0.5`는 opacity의 유효한 값이라 들어감). "숫자는 무시된다"로 쓰지 않는다. 이것이 무시되는 경우의 전부라고 쓰지 않는다. 빈 문자열은 선언 제거.
    - `### 적용된 스타일은 어디서 읽나`: 요소에 적용되는 선언은 스타일시트 규칙과 style 어트리뷰트 양쪽에서 온다. style 어트리뷰트의 선언은 명시도가 어떤 선택자보다 높은 것으로 취급된다(CSS Style Attributes 인용임을 밝힘). 같은 문장에서 `!important`가 붙은 선언은 다루지 않는다고 한정한다. "항상 우선한다"로 쓰지 않는다. 최종 값은 `getComputedStyle`로 읽는다. 클래스를 바꾸면 선택자가 맞는 규칙이 달라져 계산된 값이 바뀌지만 `el.style`은 그대로다.
  - `## 예제`: 예제 1~6을 `file=`로 가져오고 예제마다 PredictQuiz 1개. 정답 위치를 흩는다(4지선다, 정답 인덱스 0~3을 고루). 시뮬레이터는 예제 2 퀴즈 뒤에 `<Simulator scenarios={scenarios} />`.
  - `## 결과와 이유`: 결과 표(`예제`·`결과` 2열, result-tables 테스트 형식), 예제별 설명 문단, 흔한 오해 Callout 3개 — "el.style로 요소에 적용된 스타일을 읽을 수 있다", "classList를 바꾸면 el.style도 바뀐다", "classList.add는 문자열 끝에 클래스를 붙인다".
- 이유: 사이트의 페이지 구조와 정확성 원칙.
- 주의사항
  - "동기화", "연결", "공유"로 원인을 설명하지 않는다.
  - 표 칸의 코드는 `<code>` 안에 쓰고 결과 칸은 `expectedOutput`을 ` / `로 이은 값과 같게 한다(result-tables 테스트). `""`·`{`가 MDX에서 깨지지 않게 `{'…'}`로 쓴다.
  - 뒤 개념(이벤트 등)을 전제하지 않는다.
- 완료 조건: `npm test -- tests/result-tables.test.ts tests/content-integrity.test.ts` 통과, `npm run test:build`에서 새 페이지가 프리렌더된다.

### 3. 시뮬레이터와 concept.test
- 대상: `scenarios.ts`, `Simulator.tsx`, `AttributeObjectView.tsx`, 테스트 3개
- 변경
  - 상태 모양: `{ attributes: { class: string | null; style: string | null }; tokens: string[] | null; declarations: { property: string; value: string }[] | null }`. 시나리오마다 쓰지 않는 쪽은 `null`로 두어 그 영역을 그리지 않는다.
  - 시나리오 2개: `style-attribute`(예제 2, label '예제 2: style과 style 어트리뷰트'), `token-set`(예제 5, label '예제 5: classList와 class 어트리뷰트'). 코드는 `examples/*.html?raw`. 각 Step은 전체 스냅샷.
  - 단계 구성: 스크립트의 실행되는 줄마다 단계 1개(변경 줄과 출력 줄을 따로). style-attribute는 요소 얻기 1 + 출력 4 + 변경 3 = 8단계, token-set은 요소·classList 얻기 2 + 출력 6 + 변경 3(add, add 시도, remove) = 11단계 안팎. toggle 줄은 한 줄이 변경과 출력을 함께 하므로 단계 1개로 둔다. try 줄(`list.add('c', 'd e')`)은 "검사에서 예외, 집합·어트리뷰트 그대로" 단계 1개, catch 안 출력 줄이 단계 1개.
  - 시각화: 왼쪽 "요소의 어트리뷰트"(이름과 값 문자열, 없으면 '없음'), 오른쪽 "classList의 토큰 집합" 또는 "style의 선언"(목록). 이전 단계와 달라진 칸에 '바뀜' 배지(ArgumentsView의 방식).
  - `Simulator.tsx`: label `classList와 style 시뮬레이터`.
  - `concept.test.ts`: `assertScenarioInvariants`, 마지막 단계 출력 = `expectedOutput`, '객체' 검색에 새 slug 없음. concept.test는 node 환경이라 브라우저 동작을 실행할 수 없다. 본문의 실행 결과 주장은 6개 예제의 출력으로 받칠 수 있는 것으로 한정하고, 예제가 없는 주장(어트리뷰트가 없고 집합이 비면 쓰지 않음)은 표준 인용으로만 쓴다.
- 이유: 시뮬레이터 규칙(전체 스냅샷, 원문 코드, 마지막 출력 일치).
- 주의사항: JS 없이 첫 단계가 보여야 한다. 공통 셸은 바꾸지 않는다.
- 완료 조건: `npm test -- app/concepts/classlist-style` 통과. 시나리오의 한 단계 값을 틀리게 바꾸면 테스트가 실패하는 것을 확인하고 원복한다.

### 4. 기존 페이지 문구
- 대상: `html-attribute-dom-property/meta.ts:145`, `content.mdx`, `live-html-collection/meta.ts:110`
- 변경
  - html-attribute-dom-property `meta.ts:145`: "classList와 style은 classList와 style 개념에서 다룹니다. form.reset()이 일으키는 reset 이벤트는 별도 개념입니다." + related에 `classlist-style`.
  - html-attribute-dom-property 본문: className 반영을 설명하는 80행 근처에 "class를 토큰 단위로 다루는 classList는 [classList와 style](/concepts/classlist-style)에서 다룹니다" 한 문장.
  - live-html-collection `meta.ts:110`: 기존 문장("append, createElement, removeChild, className 대입은 DOM 조작 API이며 … 설명하지 않고 …")은 그대로 두고, 그 항목 끝에 "className과 classList는 classList와 style 개념에서 다룹니다." 한 문장을 더한다. related에 `classlist-style` 추가. `content.mdx`는 바꾸지 않는다.
  - 다른 페이지: `grep -rn "classList\|\.style" app/concepts/*/content.mdx app/concepts/*/meta.ts`로 "별도 개념" 문구가 있는지 확인하고 있으면 같은 방식으로 고친다. 없으면 건드리지 않는다.
- 이유: AGENTS.md 링크 규칙(대상 페이지가 그 주제를 실제로 다룰 때 링크).
- 주의사항: `reviewedAt` 유지. 문장 뜻을 바꾸지 않는다.
- 완료 조건: `grep -rn "classList와 style은 별도 개념" app/concepts`가 0건, `npm test -- tests/content-integrity.test.ts` 통과.

### 5. 순서 테스트와 새 페이지 등록
- 대상: `app/lib/concepts.test.ts`, `ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md:225`
- 변경: 총수 64 → 65, 51번째 이후 순위 +1, html-attribute-dom-property의 다음과 event-propagation-delegation의 이전을 새 페이지로, '객체' 순위 배열에서 51 이상인 값 +1, `navigation.spec.ts:93`의 `'64번째'`, 새 페이지 자신의 pager 블록(`51 / 65`, 이전 html-attribute-dom-property, 다음 event-propagation-delegation) 추가, helpers에 `CLASSLIST_STYLE_PATH`·`CLASSLIST_STYLE_SIMULATOR_NAME`, a11y·responsive에 새 케이스(arguments-object 케이스를 본뜸), build-output에 새 describe(시뮬레이터 첫 단계·퀴즈 `<details>`·결과 표 프리렌더).
- 이유: 순서 삽입.
- 주의사항: 순위 변경은 HEAD의 `N / 64` 목록을 스크립트로 변환한 결과와 대조한다. 검색 필드 확인(추정 2건)을 여기서 한다.
- 완료 조건: `npm test`, `npm run test:build`, §6의 e2e 명령이 통과한다.

### 6. 전체 검증
- 대상: 전체
- 변경: §6의 정적 검증과 e2e, dev 서버 브라우저 시나리오.
- 완료 조건: §6 명령이 baseline 대비 새 실패 없이 통과하고, 브라우저 시나리오 1~5를 확인한다.

## 9. 추가 개선 후보
- event-propagation-delegation 등 예제에서 classList를 쓰는 페이지의 본문 링크.
- getComputedStyle 심화 페이지(값 형식, 의사 요소).

## 변경 이력
- 2026-11-17 (사용자 승인): 계획 승인. 미확정 1은 긴 제목 기본안, 미확정 2는 두 페이지만 고치고 `reviewedAt` 유지로 확정.
- 2026-11-17 (Consensus 검토)
  - Architect HIGH: 예제 5의 출력에 연속 공백이 있으면 결과 표 대조와 화면 표시가 깨진다 → `class="a b a"`로 다시 설계하고 Chromium에서 재실행.
  - Critic HIGH: "add·remove는 항상 어트리뷰트를 설정"(update steps 조건 누락), "style 어트리뷰트가 선택자보다 우선"(`!important` 반례 실행 확인) → 본문 문구를 표준대로 한정.
  - Critic MEDIUM: class-and-style에 "나중에 바꾼 쪽이 적용" 모델을 배제하는 줄 추가, style-values에 `opacity = 0.5` 줄 추가와 원인 한정, toggle force 제외, 직렬화 구조의 CSSOM 근거, live-html-collection 수정 문구 확정, 예제별 배제 모델·시뮬레이터 단계 구성·summary 초안 추가.
  - Architect MEDIUM/LOW: try…catch를 simplifications와 related(error-handling)에 반영, navigation.spec의 `'64번째'`와 새 페이지 pager 블록, `reviewedAt` 문서·관행 차이를 미확정 2에 추가.
- 2026-11-17 (사용자 콘텐츠 검토 1차): 인라인 선언이 이기는 근거를 CSS Style Attributes의 명시도 문장에서 CSS Cascade 5 §6.1의 Element-Attached Styles(같은 중요도 안에서 선택자로 연결된 선언보다 우선, 명시도보다 앞 단계)로 바꾸고 예전 표현으로만 남김, getComputedStyle의 값이 resolved value임을 밝힘, 예외가 DOMException임을 밝힘, 대입 값의 문자열 변환(CSSOMString) 단계 추가, "집합을 바꾼 뒤" 문구 정리, "속성"·`font-size` 표기 통일, 첫 문단의 classList 문장 수정 — 영향 단계 2·3.
- 2026-11-17 (사용자 콘텐츠 검토 2차): 도입부 근거 목록을 CSS Cascade 5로 고치고 인용문에 앞 구절("Separately for normal and important declarations")을 넣음, CSS Style Attributes를 "예전 표준"이 아니라 2013년 W3C 권고안으로 쓰고 "같은 내용" 표현을 뺌(참고 링크도 w3.org/TR로), `readonly`·`PutForwards=cssText` 설명 추가, 흔한 오해 3의 제목·본문(새 토큰은 맨 뒤, 통째로 다시 씀, 공백 정리는 예제로 보이지 않음을 명시), className의 HTML 요소 한정(단순화 항목), `e instanceof SyntaxError`가 false라는 문장, 대괄호 표기법 명시, "값이 null일 때"를 "어트리뷰트가 제거되면"으로 통일 — 영향 단계 2.

## 구현 진행

- baseline (2026-11-17, `978372d`): lint 0 / format:check 통과 / typecheck 통과 / npm test 168 files·5266 tests 통과 / test:build 512 tests 통과
- [x] 1. 폴더 뼈대·예제·meta — examples.test에서 6개 예제 출력이 계획 값과 일치(실행기 주소 기준), content-integrity 통과. 예제 파일은 scratchpad 원본과 `cmp` 동일.
- [x] 2. content.mdx 본문 — result-tables·test:build 통과. 메인 수정 2곳: "중복과 여분의 공백이 정리" → "중복이 정리"(예제 5는 중복만 보임), `width = 10` 무시에 "`<!doctype html>`로 시작하는 문서에서 실행한 결과" 조건 추가(doctype 없는 문서에서는 Chromium이 `10px`로 받아들임 — 탐침 확인, simplifications에도 추가).
  - 구현 중 결정: 예제 3 퀴즈 오답은 계획의 모델(빈 출력·정답과 같은 출력) 대신 `0.5 number`, `wide`가 저장됨, 빈 문자열 대입이 무시됨으로 만들었다. 시뮬레이터는 '실행 전' 단계를 더해 9단계·12단계.
- [x] 3. 시뮬레이터와 concept.test — 폴더 테스트 33개 통과, 시나리오 값 변조 시 4개 실패 후 원복(서브에이전트 보고), 메인이 scenarios.ts 상태·줄 번호를 읽어 확인.
- [x] 4. 기존 페이지 문구 — `grep "classList와 style은 별도 개념"` 0건, `reviewedAt` 유지.
- [x] 5. 순서 테스트와 등록 — HEAD `N / 64` 38건 변환 = 새 `/ 65` 38건(서브에이전트 대조 True). 메인 수정 1곳: `ConceptPager.test.tsx`의 마지막 순위가 `64 / 65`로 잘못 바뀌어 실패 → `65 / 65`.
- [x] 6. 전체 검증(2026-11-17) — lint 0 / format:check / typecheck / npm test 171 files·5324 / test:build 520 — baseline 대비 새 실패 없음. e2e: navigation 16, 새 페이지·수정한 두 페이지 관련 42 통과(공통 코드 미변경이라 전체 e2e 미실행). dev 서버: pager `51 / 65`, 이전·다음 링크, 시뮬레이터 첫 단계 렌더, 콘솔 오류 없음. 시뮬레이터를 끝까지 누르는 확인은 e2e(시뮬레이터 진행 케이스)로 대신함.
- 리뷰 1차(critical-code-review, 메인): Critical / High 없음(위 메인 수정 3곳은 검증 단계에서 고침).
  - Medium: `content.mdx` 동작 원리의 "`setAttribute('class', …)`를 하면 먼저 얻어 둔 classList에서도 새 집합이 읽힌다"는 예제 4가 className 대입만 실행한다(탐침에서는 확인, 표준 attribute change steps 근거).
  - Low: 첫 문단이 길다 / 시뮬레이터 token-set 12단계 / build-output의 표 검사는 `<table` 개수만 본다.
- 사용자 콘텐츠 검토 1차 반영(2026-11-17): 7건 모두 표준(css-cascade-5, cssom)과 실행(`e instanceof SyntaxError` false, `instanceof DOMException` true)으로 확인 후 반영(메인 직접 수정, `content.mdx`·`meta.ts`·`scenarios.ts`). references에 CSS Cascade 5 추가. lint·format·typecheck·npm test 5324·test:build 520·새 페이지 e2e 통과.
- 사용자 콘텐츠 검토 2차 반영(2026-11-17): 6건 모두 표준 사본(cascade5, cssom)·w3.org/TR/css-style-attr(REC 2013-11-07)과 Chromium 탐침으로 확인 후 반영(메인 직접 수정, `content.mdx`·`meta.ts`). 탐침: 공백·줄바꿈 섞인 class에 add → `a b c`, `setAttribute('style', null)` → 값 `"null"`·선언 0개, `el.style = 'color: blue'` → 같은 객체·어트리뷰트 `color: blue;`, `style['background-color']` 쓰기 동작, SVG `className`은 SVGAnimatedString이고 문자열 대입이 class를 바꾸지 않음. lint·format·typecheck·npm test 5324·test:build 520·새 페이지 e2e 12 통과.
- 마무리(2026-11-17): 사용자 최종 승인. 사용자 결정으로 새 페이지 `reviewedAt`을 `'2026-11-17'`로 기록(같은 커밋).

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 6개, 퀴즈 6개, 결과 표, 시뮬레이터 1개·시나리오 2개, 기존 두 페이지 문구, 순서·등록 테스트).
- 달라진 점: 예제 3 퀴즈의 오답 모델, "중복과 여분의 공백" 문구(공백 정리는 예제로 보이지 않는다고 밝힘), `width = 10`의 doctype 조건, 인라인 선언이 우선하는 근거를 CSS Style Attributes의 명시도 문장에서 CSS Cascade 5로 교체(사용자 검토 1·2차).
- 새 페이지 `reviewedAt`은 계획에서는 `null`이었고, 사용자 검토 두 차례 뒤 결정으로 기록했다.

### 코드 리뷰

- Critical / High 없음. 검증 단계에서 메인이 3곳을 고쳤다(`ConceptPager.test.tsx` 순위, 공백 문구, doctype 조건). 사용자 콘텐츠 검토 1차 7건·2차 6건을 모두 반영했다.
- 남긴 것: Medium 1건(`setAttribute('class', …)` 문장은 예제로 실행하지 않음), Low 3건(첫 문단 길이, token-set 12단계, build-output 표 검사가 `<table` 개수만 봄).

### 후속 작업

- [ ] (선택) `setAttribute('class', …)` 문장을 예제로 보이거나 문장을 줄인다.
- [ ] (선택) event-propagation-delegation 등 classList를 쓰는 페이지의 본문 링크, getComputedStyle 심화 페이지.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 예제 5의 HTML을 `class="a b a"`로 설계 — 연속 공백이 든 출력은 결과 표 대조(`normalizeCell`)와 화면에서 한 칸으로 접혀 증거가 되지 못한다. 그래서 중복만 예제로 보이고 공백 정리는 표준 문장으로만 쓰고 "예제로 보이지 않는다"고 밝혔다.
- [Claude 판단] `width = 10`이 무시된다는 주장에 `<!doctype html>` 조건을 붙임 — doctype이 없는 문서(quirks 모드)에서는 Chromium이 `10px`로 받아들이는 것을 탐침으로 확인했다.
- [Claude 판단] "class 어트리뷰트가 없고 집합도 비면 아무것도 하지 않는다"는 조건과 `setAttribute('class', …)` 문장은 예제 없이 표준 문장으로만 서술 — 예제를 늘리지 않고 본문에 그 사실을 밝혔다.
- [무검토 승인] 제목(긴 제목 기본안)과 기존 두 페이지만 고치고 그 `reviewedAt`을 유지하는 범위 — 사용자가 "기본안대로 승인".
- 한 페이지, order 375, style은 인라인 중심(getComputedStyle은 대비로만), 시뮬레이터 1개 — 사용자가 선택.
- 인라인 선언이 이기는 근거를 명시도가 아니라 CSS Cascade 5의 Element-Attached Styles 기준으로 설명하고 CSS Style Attributes는 2013년 권고안의 표현으로만 인용 — 사용자 검토 지적.
- 예외를 "이름이 SyntaxError인 DOMException"으로, getComputedStyle의 값을 resolved value로 밝힘 — 사용자 검토 지적.

#### 배경지식

- DOMTokenList: 토큰 집합(순서 있는 집합), attribute change steps(어트리뷰트 → 집합 재파싱), update steps(집합 → 어트리뷰트, U+0020 하나로 이음). `add`·`remove`는 모든 토큰을 먼저 검사한 뒤 집합을 바꾸고 항상 update steps를 실행한다.
- CSSOM: `el.style`은 `style` 어트리뷰트의 CSS 선언 블록을 나타내는 객체. 선언을 바꾸면 어트리뷰트를 직렬화(`이름: 값;`)로 다시 쓰고, 어트리뷰트가 바뀌면 선언을 다시 파싱한다. 프로퍼티의 IDL 타입은 문자열이라 대입 값은 먼저 문자열로 변환된다.
- `[SameObject]`, `readonly`, `PutForwards`의 뜻.
- CSS Cascade 5 정렬 기준: 출처와 중요도 → 컨텍스트 → 요소에 직접 붙은 스타일 → 레이어 → 명시도 → 순서.
- 결과 표 검사의 `normalizeCell`이 연속 공백을 한 칸으로 접는다.

#### 확인 질문

1. 스타일시트로 빨간색을 준 요소에서 `el.style.color`가 빈 문자열인데 `el.style.fontSize`는 `20px`인 이유는 무엇인가? 이 두 줄이 함께 있어야 하는 이유는?
   <details><summary>답</summary>`el.style`은 `style` 어트리뷰트에 적힌 선언만 나타낸다. 어트리뷰트에 `font-size`만 있어서 그렇다. `fontSize`가 읽히는 줄이 있어야 "style은 늘 비어 있다"는 모델이 배제된다(content.mdx 예제 1, 결과와 이유).</details>
2. 이미 있는 토큰을 `add`했는데 왜 `class` 어트리뷰트가 `a b a`에서 `a b`로 바뀌는가?
   <details><summary>답</summary>`add`는 집합이 바뀌었는지와 관계없이 update steps를 실행하고, 이 단계가 어트리뷰트를 집합의 직렬화로 통째로 다시 쓴다(content.mdx 동작 원리의 classList 절, 예제 5).</details>
3. 예제 5의 HTML에 연속 공백을 넣지 않은 이유는 무엇이고, 그 때문에 본문에서 무엇을 밝혔는가?
   <details><summary>답</summary>결과 표 대조와 화면이 연속 공백을 한 칸으로 접어 출력이 증거가 되지 못한다. 그래서 공백 정리는 표준 문장으로만 쓰고 예제로 보이지 않는다고 적었다(계획 변경 이력의 Consensus 검토, content.mdx classList 절).</details>
4. 예제 6에서 `on` 클래스를 다시 더해도 파랑인 이유를 "인라인 스타일의 명시도가 높아서"라고 쓰지 않은 이유는?
   <details><summary>답</summary>CSS Cascade 5는 요소에 직접 붙은 선언을 명시도와 분리된, 명시도보다 앞선 기준으로 둔다. 중요도가 같은 선언끼리의 비교이며 `!important`가 있으면 결과가 달라진다(content.mdx '적용된 스타일은 어디서 읽나', meta.ts simplifications).</details>
5. `style.width = 10`이 무시된다는 문장에 doctype 조건이 왜 필요한가?
   <details><summary>답</summary>doctype이 없는 문서(quirks 모드)에서는 Chromium이 `10px`로 받아들인다. 예제는 `<!doctype html>`로 시작한다(계획 구현 진행 단계 2, meta.ts simplifications).</details>
