# 개념 '기본 동작과 전파 막기' 구현 계획

- 상태: 완료
- 작성일: 2026-11-04
- 기준: `main` @ `7449c4f`

## 0. 요약

- 목적: 38~42장 로드맵 6번 `/concepts/prevent-default-stop-propagation`을 추가한다. 40장 `preventDefault`(기본 동작 취소)·`stopPropagation`·`stopImmediatePropagation`·같은 함수 중복 등록과 추가 주제 4개(체크박스 click 안의 `checked`, `passive`·`once`, `dispatchEvent` 반환값, `return false`)를 호출별 비교표 + 예제 10개 + 퀴즈로 WHATWG DOM·HTML 근거와 함께 보인다.
- 범위: 새 개념 폴더 1개(category `browser`, order 390, 학습 순서 41번째·마지막, 시뮬레이터 없음, 표 데이터 `action-table.ts`). 고정 테스트·e2e·빌드 테스트·content-guide·로드맵을 고친다. 공통 코드와 기존 개념 40개는 바꾸지 않는다.
- 위험: 표 칸이 실제 동작과 어긋나거나, 이동(링크·폼 제출)처럼 예제로 보일 수 없는 동작을 실행 결과처럼 쓰는 것 → 표 행의 불리언 값으로 만든 출력 줄을 Chromium expectedOutput과 정확히 대조, 이동은 표준 근거로만 쓰고 단순화에 밝힘.
- 복잡도: 중간 · Consensus: 생략. html-attribute-dom-property와 같은 표 데이터 + evidence 대조 패턴이고 공통 코드를 바꾸지 않는다. 예제 10개 출력은 실행기로 3회씩 확인했고 핵심 주장은 표준 원문과 대조했다.
- 미확정: 1건(직전 개념의 "다음 개념 '기본 동작과 전파 막기'" 문구를 링크로 바꿀지)

## 1. 요구사항

### 요구사항

- 로드맵 6번 "기본 동작과 전파 막기"(40장)를 새 개념 페이지로 만든다.
- 사용자 결정(2026-11-04)
  - 기본 범위: ① `preventDefault`(체크박스 click·링크·form submit, `defaultPrevented`, `cancelable`이 false인 이벤트) ② `stopPropagation`과 `stopImmediatePropagation`(서로 대신하지 않음) ③ 같은 함수를 두 번 `addEventListener`하면 한 번만 등록, `capture`가 다르면 별개, `removeEventListener`도 `capture`가 맞아야 함.
  - 추가 주제 4개 모두: **체크박스 click 안의 `checked`**(리스너 안에서는 이미 바뀐 값, 취소되면 디스패치 뒤 되돌아감), **`passive`와 `once`**, **`dispatchEvent` 반환값**, **`onclick`의 `return false`**.
  - 시각화: **표 + 퀴즈**(호출별로 기본 동작·같은 노드의 남은 리스너·부모 리스너·`defaultPrevented`를 칸마다 예제 출력과 테스트로 대조).
  - 제목 "기본 동작과 전파 막기: preventDefault를 했는데 부모 리스너는 왜 불릴까", slug `prevent-default-stop-propagation`.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① `preventDefault`는 기본 동작만 취소한다(예제 1 `checkbox-prevent.html`): DOM `preventDefault()` "The preventDefault() method steps are to set the canceled flag with this." 전파 플래그는 건드리지 않으므로 부모 `row` 리스너는 그대로 불리고 `defaultPrevented`는 `true`. 기본 동작은 디스패치가 끝난 뒤 실행된다: DOM dispatch "If activationTarget is non-null: If event's canceled flag is unset, then run activationTarget's activation behavior with event. Otherwise, if activationTarget has legacy-canceled-activation behavior, then run activationTarget's legacy-canceled-activation behavior."
  - ② 체크박스 click 안의 `checked`(예제 1): 리스너보다 먼저 DOM dispatch "If activationTarget is non-null and activationTarget has legacy-pre-activation behavior, then run activationTarget's legacy-pre-activation behavior." → HTML "If this element's type attribute is in the Checkbox state, then set this element's checkedness to its opposite value …". 그래서 리스너 안에서는 `true`(`preventDefault` 뒤에도 `true`), 디스패치가 끝난 뒤 HTML legacy-canceled-activation "set the element's checkedness and the element's indeterminateness back to the values they had before the legacy-pre-activation behavior was run." → `false`. 취소되면 activation behavior(= `input`·`change` 발생, HTML Checkbox "Fire an event named input … Fire an event named change …")가 실행되지 않아 `change`는 `news`에서만(`["news"]`). DOM 원문 "These algorithms only exist for checkbox and radio input elements and are not to be used for anything else." — 체크박스·라디오만의 예외라는 점을 밝힌다(라디오는 다루지 않음). 직전 개념 [HTML 어트리뷰트와 DOM 프로퍼티](/concepts/html-attribute-dom-property)의 checkedness와 연결.
  - ③ 링크와 폼 제출(예제 2 `link-submit.html`): 링크 click을 취소하면 HTML `a` activation behavior가 실행되지 않는다. 제출 버튼 click은 취소하지 않았으므로(`click send false`) 버튼의 기본 동작인 폼 제출이 시작되고, 폼 제출 알고리즘이 따로 `submit` 이벤트를 발생시킨다: HTML "Let shouldContinue be the result of firing an event named submit at form using SubmitEvent, with the submitter attribute initialized to submitterButton, the bubbles attribute initialized to true, and the cancelable attribute initialized to true." "If shouldContinue is false, then return." → `submit true true`. click과 submit은 서로 다른 이벤트이며 각각 취소할 수 있다.
    - 막지 않았을 때의 이동은 실행기가 페이지 이동을 실패로 처리하므로 예제로 두지 않는다(2절 사실 — preventDefault를 뺀 판은 `/next`, `/save?q=hi` 이동 요청이 생겨 실패). 본문에는 표준 근거("취소되지 않으면 링크는 이동하고 폼 제출은 계속된다")로만 쓰고 `simplifications`에 밝힌다.
  - ④ `cancelable`이 false인 이벤트(예제 3 `not-cancelable.html`): DOM "To set the canceled flag, given an event event, if event's cancelable attribute value is true and event's in passive listener flag is unset, then set event's canceled flag, and do nothing otherwise." `new Event('ping')`은 `cancelable` 기본값 false(`EventInit`, 직전 개념의 `bubbles = false`와 같은 딕셔너리 — MDX에서 `{`를 쓰지 않도록 `boolean cancelable = false;`로 인용) → `ping false false`, `dispatchEvent`는 `true`. 체크박스 `change`는 HTML이 `bubbles`만 true로 발생시켜 취소할 수 없고(`change false false`), 체크는 그대로(`pin true`) — `change`가 나올 때는 이미 체크가 끝난 뒤.
  - ⑤ `dispatchEvent`의 반환값(예제 3·4 `dispatch-return.html`): DOM "Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked; otherwise false." dispatch 끝 "Return false if event's canceled flag is set; otherwise true." 직접 만든 이벤트로 "취소할 수 있는 기본 동작"을 흉내 내는 패턴: 저장하지 않은 메모가 있으면 리스너가 취소 → `닫기 false hidden false`, 저장 뒤 `닫기 true hidden true`. 이 "기본 동작"은 브라우저가 아니라 코드가 반환값을 보고 정한 것이라고 밝힌다.
  - ⑥ `stopPropagation`(예제 5 `stop-propagation.html`): DOM "The stopPropagation() method steps are to set this's stop propagation flag." invoke "If event's stop propagation flag is set, then return." → 다음 경로 항목으로 가지 않지만 같은 노드의 남은 리스너는 그대로(`["save 1","save 2"]`). 캡처 순회 중 바깥에서 멈추면 타깃 리스너도 불리지 않는다(`["card 캡처"]`). 기본 동작은 막지 않는다(`true []` — 체크됨, 부모 `card` 리스너는 불리지 않음).
  - ⑦ `stopImmediatePropagation`(예제 6 `stop-immediate.html`): DOM "The stopImmediatePropagation() method steps are to set this's stop propagation flag and this's stop immediate propagation flag." inner invoke "If event's stop immediate propagation flag is set, then break." → `["save 1"]`, 기본 동작은 그대로(`true []`). 디스패치가 끝나면 dispatch "Unset event's dispatch flag, stop propagation flag, and stop immediate propagation flag."로 전파 플래그는 지워지고(`cancelBubble` `false`) canceled flag는 남는다(`defaultPrevented` `true`) → `리스너 안 true true` / `디스패치 뒤 false true`. `cancelBubble`은 DOM getter "return true if this's stop propagation flag is set"으로 플래그를 읽는 레거시 이름이라고만 소개.
  - ⑧ 같은 함수 중복 등록(예제 7 `duplicate-listener.html`): DOM add "If eventTarget's event listener list does not contain an event listener whose type is listener's type, callback is listener's callback, and capture is listener's capture, then append listener …" → 같은 함수 두 번 `1`, capture만 다르면 `2`. remove: "Let capture be the result of flattening options." 후 type·callback·capture가 같은 것만 제거 → capture 없이 제거하면 `1`(캡처 리스너가 남음), `{ capture: true }`로 제거하면 `0`. 함수 표현식은 평가될 때마다 새 함수라 `2`. 같은 함수·capture에 `{ once: true }`를 나중에 주면 무시되어 처음 등록(once 없음)이 남는다(`once를 나중에 줌 2`) — 비교에 `once`·`passive`가 들어가지 않기 때문.
  - ⑨ `passive`와 `once`(예제 8 `passive-once.html`): inner invoke "If listener's passive is true, then set event's in passive listener flag." 호출 뒤 "Unset event's in passive listener flag." + set the canceled flag 조건 → passive 리스너 안의 `preventDefault`는 무시(`passive 리스너 false`, `pin true`), 다음 일반 리스너에서는 다시 취소 가능(`다음 리스너 false` → `직접 호출 뒤 true`, `star false`). DOM 원문 "There are scenarios where invoking preventDefault() has no effect." `once`: "If listener's once is true, then remove an event listener given event's currentTarget attribute value and listener." → `once 1`. 일부 이벤트(`touchstart`·`touchmove`·`wheel`·`mousewheel`을 window·document·html·body에 등록)는 passive 기본값이 true라는 DOM "default passive value"는 한 줄로만 언급하고 단순화에 밝힌다.
  - ⑩ `return false`(예제 9 `return-false.html`): HTML event handler processing "If return value is false, then set event's canceled flag." → `onclick` 어트리뷰트와 프로퍼티(같은 이벤트 핸들러 — 직전 개념)는 취소(`a true`, `b true`), `addEventListener` 리스너의 반환값은 DOM inner invoke가 쓰지 않으므로 취소되지 않음(`c false`) → `false false true`. 세 경우 모두 `document` 리스너가 불리므로 `return false`는 전파를 막지 않는다. 이 처리는 canceled flag를 직접 세운다(set the canceled flag 절차를 거치지 않음)는 원문 차이는 본문에 쓰지 않는다(이 예제의 결과에 영향 없음, passive 리스너는 이벤트 핸들러가 아님).
  - 결과와 이유: 호출별 비교표(예제 10 `actions.html`, 3절), 흔한 오해(“preventDefault가 전파를 막는다”, “stopPropagation이 기본 동작을 막는다”, “return false는 어디서나 취소”, “같은 함수를 여러 번 등록하면 여러 번 불린다”, “click 리스너의 checked는 클릭 전 값”, “remove는 함수만 같으면 된다”).

### 유지해야 하는 기존 동작

- 기존 개념 40개는 수정하지 않는다(7절 미확정 1건 제외 — 기본값은 수정하지 않음). 하이드레이션 규칙.
- title·summary·tags에 '객체'를 쓰지 않는다(홈 '객체' 검색 고정 테스트).

### 제외 범위

- 라디오 버튼의 legacy 동작, 실제 사용자 입력(`isTrusted` true)만의 기본 동작(포커스 이동, 텍스트 선택 등)
- `signal`(AbortSignal), `handleEvent` 객체 리스너, `returnValue` setter, `cancelBubble = true` setter의 상세(이름만 소개)
- `beforeunload`·`error` 이벤트 핸들러의 반환값 예외, 이벤트 핸들러 콘텐츠 어트리뷰트의 스코프
- Shadow DOM·`composed`, `CustomEvent`의 `detail`, `MouseEvent`로 만든 click의 activation
- 타이머(41장)·이벤트 루프(42장)·Promise(45장)

## 2. 사실과 추정

### 사실 (표준 원문 — 2026-11-04 내려받음: scratchpad `pd/std/` dom.html·input.html·links.html·form-control-infrastructure.html·webappapis.html, 텍스트 `*.txt`)

- 1절 ①~⑩의 영어 인용은 모두 이 사본에서 확인했다(`dom.txt` 549–598 플래그·메서드, 761–763 legacy 동작 범위, 770–800 addEventListener 설명·dispatchEvent 반환, 802–900 flatten·default passive value·add/remove, 1009–1045 dispatch, 1079 invoke 전파 확인, 1120–1160 inner invoke / `input.txt` 1186–1198 legacy 동작, 2751–2754 Checkbox activation / `form-control-infrastructure.txt` 2213–2217 submit 이벤트 / `webappapis.txt` 3932–3947 반환값 처리 / `links.txt` 128 a·area activation behavior).
- 참고 링크 anchor(사본에서 존재 확인): DOM `#dom-event-preventdefault`, `#dom-event-stoppropagation`, `#dom-event-stopimmediatepropagation`, `#set-the-canceled-flag`, `#dom-event-defaultprevented`, `#dom-event-cancelbubble`, `#concept-event-dispatch`, `#concept-event-listener-invoke`, `#concept-event-listener-inner-invoke`, `#add-an-event-listener`, `#dom-eventtarget-addeventlistener`, `#dom-eventtarget-removeeventlistener`, `#dom-eventtarget-dispatchevent`, `#eventtarget-legacy-pre-activation-behavior`, `#eventtarget-legacy-canceled-activation-behavior`. HTML `input.html#checkbox-state-(type=checkbox)`, `input.html#the-input-element:legacy-pre-activation-behavior`, `links.html#links-created-by-a-and-area-elements`, `form-control-infrastructure.html#concept-form-submit`, `webappapis.html#the-event-handler-processing-algorithm`. MDN(`Event/preventDefault`, `Event/stopPropagation`, `Event/stopImmediatePropagation`, `EventTarget/addEventListener`, `EventTarget/removeEventListener`, `EventTarget/dispatchEvent`)은 구현 단계 1에서 열어 확인.

### 사실 (실행 확인 — Playwright Chromium, `runBrowserExample` settleMs 300, 3회 연속 같은 출력)

초안: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/278c0b51-3d8d-4ca1-849a-5f195fd52102/scratchpad/pd/ex/`. 모두 `.html`, resources 없음, 동기(지연 의존 없음). ` / `는 줄 구분.

| # | 예제 | 실제 출력 |
| - | - | - |
| 1 | `checkbox-prevent.html` | `agree 리스너 true` / `preventDefault 뒤 true` / `row agree true` / `agree 클릭 뒤 false` / `news 리스너 true` / `row news false` / `news 클릭 뒤 true` / `["news"]` |
| 2 | `link-submit.html` | `click next true` / `click send false` / `submit true true` (2026-11-04 `location.pathname` 줄 제거 — 변경 이력) |
| 3 | `not-cancelable.html` | `ping false false` / `true` / `ping true true` / `false` / `change false false` / `pin true` |
| 4 | `dispatch-return.html` | `닫기 false hidden false` / `닫기 true hidden true` |
| 5 | `stop-propagation.html` | `["save 1","save 2"]` / `["card 캡처"]` / `true []` |
| 6 | `stop-immediate.html` | `["save 1"]` / `true []` / `리스너 안 true true` / `디스패치 뒤 false true` |
| 7 | `duplicate-listener.html` | `같은 함수 두 번 1` / `capture만 다름 2` / `capture 없이 제거 1` / `capture: true로 제거 0` / `함수 표현식 두 번 2` / `once를 나중에 줌 2` |
| 8 | `passive-once.html` | `passive 리스너 false` / `pin true` / `다음 리스너 false` / `직접 호출 뒤 true` / `star false` / `once 1` |
| 9 | `return-false.html` | `a true` / `b true` / `c false` / `false false true` |
| 10 | `actions.html` | 아래 7줄 |

`actions.html`(표 근거) 출력:

```
아무것도 안 함 체크 true 남은 true 부모 true defaultPrevented false
preventDefault 체크 false 남은 true 부모 true defaultPrevented true
stopPropagation 체크 true 남은 true 부모 false defaultPrevented false
stopImmediatePropagation 체크 true 남은 false 부모 false defaultPrevented false
passive에서 preventDefault 체크 true 남은 true 부모 true defaultPrevented false
onclick의 return false 체크 false 남은 true 부모 true defaultPrevented true
addEventListener의 return false 체크 true 남은 true 부모 true defaultPrevented false
```

- `actions.html`은 행마다 새 `div > input[type=checkbox]`를 만들고 ① 그 행의 동작을 하는 리스너(또는 `onclick`) ② 같은 노드의 다음 리스너(`남은`) ③ 부모 `div` 리스너(`부모`)를 등록한 뒤 `click()`한다. `defaultPrevented`는 `window` 캡처 리스너가 저장한 이벤트를 디스패치 뒤 읽는다(canceled flag는 디스패치 끝에 지워지지 않음 — 예제 6 마지막 줄과 같은 규칙).
- 음성 확인(실행기): `link-submit.html`에서 링크의 `preventDefault`를 빼면 `첫 문서 뒤에 페이지가 다시 이동했습니다 | 등록되지 않은 요청: http://example.test/next`, 폼의 `preventDefault`를 빼면 `… /save?q=hi` 로 실패(3회 동일). 즉 막은 효과가 실제로 있고, 막지 않은 경우는 이 실행기로 예제화할 수 없다. 같은 이유로 `href="#here"` 프래그먼트 이동도 main frame 이동으로 실패했다.
- `click()`으로 만든 이벤트는 `isTrusted` false이고 HTML이 `bubbles`·`cancelable`을 true로 만든다(직전 개념에서 인용한 "Initialize event's bubbles and cancelable attributes to true.").
- 책 대비: 책 40.8은 링크·체크박스 기본 동작 예제와 버튼 목록 예제를 쓴다. 이 페이지는 약관 동의·소식 받기 체크박스, 메모 패널, 카드·저장 버튼, 다음 링크·보내기 폼으로 직접 작성했다.

### 사실 (코드에서 확인)

- 표 패턴: `app/concepts/html-attribute-dom-property/attribute-table.ts`(columns·rows·evidence)와 `concept.test.ts`(evidence 줄이 expectedOutput에 순서대로 있는지, 표에 쓰이지 않는 예제 목록 고정). 본문 표는 content.mdx가 같은 데이터를 import해 그린다(`143c043`).
- 고정 테스트(40개·마지막 event-propagation-delegation): `app/lib/concepts.test.ts`(total·마지막·이전), `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(개수·마지막 번째·제목·분모 전부·직전 개념 링크 2개·새 개념 n/n), `tests/e2e/responsive.spec.ts`(홈 학습 순서 개수) — `7449c4f`·`143c043`이 고친 위치.
- e2e·빌드: `tests/e2e/helpers.ts` PATH 상수, `a11y.spec.ts` 페이지 axe('정답 확인' 보인 뒤), `responsive.spec.ts` 가로 스크롤, `tests/build/build-output.test.ts` `프리렌더 (html-attribute-dom-property)` describe(표 region aria-label, 표 안 글자, `<details` 10개 이상).
- 직전 개념의 언급: `app/concepts/event-propagation-delegation/content.mdx:6`(첫 문단 끝 "다음 개념 '기본 동작과 전파 막기'에서 다룹니다."), `:375` 끝("같은 함수를 중복 등록했을 때의 동작은 다음 개념 '기본 동작과 전파 막기'에서 다룹니다."), `meta.ts:106` simplifications.

### 추정

- 없음

## 3. 구현 전략

- 구성: `meta.ts`, `content.mdx`, `route.tsx`, `action-table.ts`, `concept.test.ts`, `examples/`(10개, 초안 `cp`). 시뮬레이터 없음.
- 표 데이터(`action-table.ts`): 칸 글자를 손으로 쓰지 않고 불리언 결과에서 만든다.
  ```ts
  export const ACTION_EXAMPLE_ID = 'actions'
  export type ActionRow = {
    name: string        // actions.html의 trial 이름 = 출력 줄 첫 부분 (예: 'preventDefault')
    call: string        // 본문 표의 호출 코드 (예: 'e.preventDefault()')
    checked: boolean    // 클릭 뒤 체크 여부 (기본 동작이 일어났나)
    rest: boolean       // 같은 노드의 다음 리스너가 불렸나
    parent: boolean     // 부모 리스너가 불렸나
    defaultPrevented: boolean
    rule: string        // 근거가 된 표준 규칙 (짧은 한국어)
  }
  export function evidenceLine(r: ActionRow): string // `${name} 체크 ${checked} 남은 ${rest} 부모 ${parent} defaultPrevented ${defaultPrevented}`
  ```
  행은 7개(`actions.html`의 trial 순서). 칸 표시: 기본 동작(체크) `일어남`/`취소됨`, 남은 리스너·부모 리스너 `불림`/`불리지 않음`, `defaultPrevented` `true`/`false`. 색만으로 구분하지 않고 글자로.
- 대조 테스트(`concept.test.ts`):
  - `rows.map(evidenceLine)`이 `actions` 예제의 `expectedOutput`과 **정확히 같다**(순서·개수 포함). expectedOutput은 `tests/examples.test.ts`가 Chromium 실행과 대조하므로 표 칸 = 실측.
  - 행 `name`이 겹치지 않는다, `actions.html` 원문에 `trial('<name>'`이 행 순서대로 있다(`?raw` import 또는 `readFileSync`).
  - 표준 규칙 일관성(독립 검사): `checked`는 `!defaultPrevented`와 같다(체크박스 click은 cancelable이므로 취소 여부가 곧 기본 동작 여부), `rest`가 false인 행은 `parent`도 false(stopImmediatePropagation은 stop propagation flag도 세움).
- 본문 표는 `<Wide>` + `<div className="my-6 overflow-x-auto">` + JSX `<table>`(aria-label "호출마다 기본 동작과 전파가 어떻게 되는지")로 `rows`를 map해 그린다(html-attribute-dom-property 방식). 표 아래에 "칸의 값은 예제 10의 출력 줄이며 테스트가 Chromium 실행 결과와 대조한다" 설명 + 예제 10 코드 블록.
- 퀴즈 10개 이상(예제마다 1개 이상).
- 버린 대안: 전파 시뮬레이터(사용자 미선택), 표 칸 글자를 손으로 쓰고 evidence 줄만 대조(불리언에서 만들면 칸과 출력이 어긋날 수 없어 더 단순·강함), 막지 않은 링크·폼 이동을 예제로 보이기(실행기가 이동을 실패로 처리 — 실행기 변경은 공통 코드라 범위 밖).

## 4. 변경 파일

- 추가 `app/concepts/prevent-default-stop-propagation/` — 3절 구성. `meta.ts`: category `browser`, order 390, prerequisites `[{ label: '이벤트 전파와 위임', slug: 'event-propagation-delegation' }, { label: 'HTML 어트리뷰트와 DOM 프로퍼티', slug: 'html-attribute-dom-property' }]`, related `['event-propagation-delegation', 'html-attribute-dom-property']`, examples 10개 browser, references(2절 anchor + MDN), reviewedAt은 사용자 콘텐츠 승인 날짜(승인 전 `null`).
  - summary(안, 160자 이하): "preventDefault는 기본 동작만 취소하고 전파는 막지 않습니다. stopPropagation과 stopImmediatePropagation, passive와 once, 같은 함수의 중복 등록을 DOM·HTML 표준과 Chromium 실행 결과로 확인합니다."
  - tags(안): `기본 동작`, `preventDefault`, `stopPropagation`, `stopImmediatePropagation`, `defaultPrevented`, `cancelable`, `dispatchEvent`, `passive`, `once`, `removeEventListener`, `이벤트 취소`, `DOM`
  - simplifications(안): Chromium 실행·표준 근거, 다른 브라우저 미확인 / 사용자 클릭 대신 `click()`·`dispatchEvent`(`isTrusted` false), 실제 입력만의 기본 동작(포커스 이동 등) 제외 / 링크 이동·폼 제출이 계속되는 경우는 예제 실행기가 페이지 이동을 실패로 처리해 예제로 보이지 않고 표준 근거로만 씀 / 체크박스만 다루고 라디오 버튼의 legacy 동작 제외 / passive 기본값이 true인 경우(`touchstart`·`wheel` 등) 한 줄만 / `signal`·`handleEvent`·`returnValue`·`cancelBubble` setter 제외 / `beforeunload`·`error` 반환값 예외, 핸들러 어트리뷰트 스코프 제외 / Shadow DOM 제외 / `dispatchEvent` 반환값으로 만든 "기본 동작"은 브라우저 기본 동작이 아니라 코드가 정한 것 / console은 호스트 API.
- 수정
  - `tests/e2e/helpers.ts`: `PREVENT_DEFAULT_STOP_PROPAGATION_PATH`
  - `tests/e2e/a11y.spec.ts`: 페이지 axe('정답 확인' 보인 뒤), 테스트 이름 `개념 페이지: 기본 동작과 전파 막기`
  - `tests/e2e/responsive.spec.ts`: 새 페이지 가로 스크롤 없음, 홈 학습 순서 40→41
  - `tests/e2e/navigation.spec.ts`: 40→41, 마지막 '41번째'·새 제목, 분모 전부, event-propagation-delegation '40 / 41'·링크 2개, 새 개념 '41 / 41'
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 41, 마지막 prevent-default-stop-propagation(이전 event-propagation-delegation)
  - `tests/build/build-output.test.ts`: `프리렌더 (prevent-default-stop-propagation)` — 표 region aria-label, 표 안 글자(`stopImmediatePropagation`, `불리지 않음`), `<details` 10개 이상
  - `docs/content-guide.md`: e2e 대상 목록에 slug 추가
  - `.claude/plans/concept-roadmap-ch38-42.md`: 6번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/components/`, `tests/helpers/`, 기존 개념 40개(7절 미확정이 "바꾼다"로 정해지면 `event-propagation-delegation/content.mdx` 두 문장만)

## 5. 위험 요소

- 표 칸과 실제 동작 불일치 → 불리언에서 출력 줄을 만들어 expectedOutput과 정확히 대조 + 표준 규칙 일관성 검사(단계 2), 음성 확인(행 하나의 불리언을 뒤집으면 실패)
- 이동(링크·폼 제출 계속)을 실행 결과처럼 서술 → 표준 근거 문장으로만, `simplifications`에 명시(단계 3)
- "체크박스 click에서 checked가 이미 바뀐다"를 모든 요소의 일반 규칙처럼 서술 → DOM 원문 "only exist for checkbox and radio input elements" 인용(단계 3)
- `return false` 설명을 jQuery 관례와 섞음 → 이벤트 핸들러(`onclick`)만 취소, 전파는 막지 않음을 예제 9 출력으로만(단계 3)
- 41장 이후(타이머·이벤트 루프·Promise) 선행 사용 → 예제에 타이머 없음, 본문은 "별도 개념"으로만(단계 3)
- MDX가 `{`를 표현식으로 읽음(EventInit 인용) → `boolean cancelable = false;`로 인용(직전 개념 교훈, 단계 3)
- 공백 들어간 인라인 코드가 Callout 안에서 줄바꿈으로 깨짐 → content-guide 규칙대로 `<code>{"…"}</code>`, 빌드 후 grep(단계 4)
- 375px 넘침(넓은 표) → `<Wide>` + overflow-x 래퍼, responsive e2e(단계 4)

## 6. 검증 방법

- 정적·단위: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "prevent-default-stop-propagation|기본 동작과 전파 막기|홈 학습 순서 보기"`
- 화면(빌드 serve, 메인 직접): 라이트·다크, 375·1280에서 표와 퀴즈, JS 끈 상태의 `<details>` 정답, 문서 scrollWidth = 창 너비
- 콘텐츠: 영어 인용을 내려받은 표준 사본과 공백 무시 대조, 참고 링크 anchor 확인, MDN 링크 열기

## 7. 미확정 사항

- [결정 2026-11-04: 바꾸지 않음(사용자가 따로 정하지 않아 기본값)] 직전 개념 `event-propagation-delegation/content.mdx:6`·`:375`의 "다음 개념 '기본 동작과 전파 막기'" 두 문장을 이 페이지 링크로 바꿀지. 기본값은 **바꾸지 않음**(역방향 연결은 사용자 결정으로 나중에 일괄 처리). 바꾸면 그 개념의 `reviewedAt` 처리도 사용자 판단(작은 문구 수정은 유지한 전례 있음).

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `examples/` 10개(초안 `cp`), `meta.ts`, 임시 `content.mdx`(필수 h2 3개), `route.tsx` — meta.ts → content.mdx → route.tsx 순(dev 서버 캐시 함정)
- 현재: 폴더 없음
- 변경: 4절 meta 안대로 작성, expectedOutput은 2절 표 그대로
- 주의사항: 예제 파일은 초안과 바이트 단위로 같게(`diff -r`). references URL은 2절 anchor, MDN은 열어서 확인
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 3회 연속 통과, expectedOutput 한 줄을 바꾸면 실패(음성 확인 후 되돌림)

### 2. 표 데이터와 테스트

- 대상: `action-table.ts`, `concept.test.ts`
- 변경: 3절 타입·7행·`evidenceLine`, 3절 대조 테스트
- 완료 조건: `npx vitest run app/concepts/prevent-default-stop-propagation` 통과, 행 하나의 `parent`를 뒤집으면 실패(음성 확인 후 되돌림)

### 3. 본문

- 대상: `content.mdx`(1절 ①~⑩ h3, 예제 `file=` 블록, 퀴즈 10개 이상, 결과와 이유에 비교표·흔한 오해)
- 주의사항: 40장까지만 전제(타이머 41장·이벤트 루프 42장·Promise 45장은 별도 개념). 첫 문단은 산문으로(빌드 테스트 `firstProseLine`), 표 데이터는 `.ts`에서 import. 이동은 표준 근거로만
- 완료 조건: `npm test`·lint·format:check·typecheck 통과, 영어 인용 전부 표준 사본과 일치(스크립트로 공백 무시 대조)

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 완료 조건: 6절 명령 모두 통과, 화면 확인 항목 확인

## 변경 이력

- 2026-11-04 (메인 검토 — 단계 3): 예제 2 마지막 줄 `console.log(location.pathname)`(`/`)을 예제·expectedOutput에서 제거 — `send.click()` 직후 동기로 찍혀 이동을 막지 않았어도 `/`라 취소의 근거가 아님. 이동이 없었다는 근거는 "테스트가 페이지 이동을 실패로 처리하는데 예제가 통과한다"로 본문에 씀. `button` 활성화 동작 원문("If element is a submit button, then submit element's form owner from element with userInvolvement set to event's user navigation involvement, and return.", scratchpad `std/form-elements.txt` 170–179) 인용과 참고 링크 `form-elements.html#the-button-element:activation-behaviour` 추가 — 단계 1·3
- 2026-11-04 (사용자 콘텐츠 검토 8건): 모두 원문·Chromium 실행으로 확인 후 반영 — ①[중] 타깃은 캡처·버블 순회에서 두 번 방문(dom dispatch 'in reverse order'/'For each item', inner invoke 'If phase is "capturing" and listener's capture is false, then continue')되므로 "같은 노드의 남은 리스너" → "같은 방문의 남은 리스너", 표 열 "같은 노드·같은 단계의 남은 리스너", 예제 5에 타깃 캡처 리스너에서 멈추는 케이스 추가(`["save 캡처"]`, 실행 확인)와 퀴즈 1개 추가(19개) ②예제 5 제목 "부모로만 막는다" → "다음 방문부터 막는다" ③폼 제출 "바로 다음 단계" → 사이의 firing submission events 단계 언급 ④passive 절 note를 일반 note로 설명하고 뒤 문장(콘솔 기록 권장)까지 인용, Chromium 콘솔 메시지 `Unable to preventDefault inside passive event listener invocation.`(Playwright 실행으로 확인, 예제 8·10) 언급 ⑤리스너 안 checked는 "누르기 전의 반대 값" ⑥예제 2 버튼에 `type="submit"` 명시(현행 HTML은 type 생략 시 Auto 상태이고 command·select 조건이 붙어 설명 대신 명시) ⑦체크박스 활성화 동작의 `If the element is not connected, then return` 인용, 연결 안 된 체크박스 click은 checked true·change 없음(실행 확인) ⑧'기본 동작'은 WHATWG DOM·HTML이 정의하지 않고 W3C UI Events 용어집이 정의함을 명시, 참고 링크 `uievents/#default-action` 추가(28개) — 단계 1·2·3
- 2026-11-04 (사용자 콘텐츠 검토 2차 4건): ①stopImmediatePropagation 절 '다음 방문' 괄호를 버블=부모, 캡처=한 칸 안쪽 항목 또는 타깃의 버블 방문으로 보완 ②'한 항목 안에서' → '한 방문 안에서' ③연결 안 된 체크박스를 예제 1에 `loose` 케이스로 추가해 실행 결과로 만듦(`loose 클릭 뒤 true`, change 목록 `["news"]` 유지), 예제 1 마지막 줄 퀴즈 선택지·해설 갱신 ④'두 번 지난다'에 버블 순회의 조상 항목은 `bubbles`가 true일 때만 방문한다는 조건 추가(dom dispatch 'If event's bubbles attribute is false, then continue') — 단계 1·3
- 2026-11-04 (사용자 콘텐츠 검토 3차 1건): 예제 1의 `change` 리스너를 `recordChange` 함수로 이름 붙여 `row`와 `loose`가 같이 쓰게 하고 `loose.id = 'loose'` 추가(id 목록 퀴즈와 기록 방식 통일), 예제 1 소개 문장 갱신 — 단계 1·3

## 구현 진행

- baseline (2026-11-04, `7449c4f`): lint·format:check·typecheck 통과, `npm test` 113파일 3538개 통과. test:build·e2e는 `7449c4f` 커밋 직전 통과 기록(미재실행)
- [x] 1. 예제·meta·route — 예제 10개 초안과 동일(`diff -r`), references 26개(DOM 15·HTML 5·MDN ko 6, MDN 200 확인), reviewedAt null. 메인 재실행 `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts app/concepts/prevent-default-stop-propagation` 3회 연속 863개 통과. 음성 확인(서브에이전트): `pin true`→`pin false`면 예제 2건 실패, 되돌림 후 통과
- [x] 2. 표 데이터와 테스트 — `action-table.ts`(7행, `evidenceLine`·`defaultText`·`calledText`), `concept.test.ts`(출력 줄 정확 일치·이름 중복·trial 순서·checked=!defaultPrevented·rest false면 parent false·예제 파일 존재). 음성 확인(서브에이전트): stopPropagation 행 parent 뒤집으면 1건 실패
- [x] 3. 본문 — 서브에이전트 작성(h3 동작 원리 10·예제 9·비교표·흔한 오해 6, 퀴즈 18개). 메인 검토 후 직접 수정: 기본 동작 정의 문장(DOM은 활성화 동작 자리, HTML이 요소마다 내용, submit은 발생시킨 알고리즘이 판단), legacy 예외 범위 '체크박스와 라디오 버튼', indeterminateness 서술 오류('보관'→ false로 만듦), '직전 개념'을 링크 이름으로, `once` 제거 시점(콜백 호출 '뒤'→'직전'), 이벤트 핸들러가 리스너 하나로 들어가 처리 알고리즘을 실행한다는 설명, `cancelable` false 반환값 '항상 true' 단정 완화, 'stopImmediatePropagation은 이름과 달리' 삭제, button 활성화 동작 인용 추가, 예제 2 pathname 줄 제거(변경 이력). 영어 인용 28개 표준 사본 대조 불일치 0
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — diff 확인(개수 41·마지막 개념·event-propagation-delegation 40/41 링크 2개·새 개념 41/41·a11y 페이지·responsive 페이지·빌드 describe·content-guide). 재검증: lint·format:check·typecheck 통과, `npm test` 114파일 3567개, `test:build` 333개, navigation 16개, 새 페이지 e2e 8개 통과
- 화면(빌드 serve): 1280 라이트·375 다크·375 JS 끔(`<details>` 18개, 라디오 72개는 JS 켰을 때), 문서 scrollWidth = 창 너비. 375에서 표 호출 칸 코드가 글자 단위로 줄바뀜 → `[&_code]:whitespace-nowrap`(기존 표 패턴) + `ActionRow`를 `call: string | null`과 `where`(설명)로 나눠 코드만 줄바꿈 금지, 근거 규칙 열 `min-w-64`(표 높이 약 1600px→794px, 표 영역만 가로 스크롤)
- 리뷰 1차(critical-code-review, 메인 직접): Critical/High/Medium 없음. Low 2(보고만) — ① 본문 "예제 2가 테스트를 통과한다는 것은 이동이 일어나지 않았다는 뜻"은 실행기의 이동 감지 범위(load 뒤 settleMs 300 + 200ms)에 기댐(취소를 뺀 판이 그 안에 감지됨은 계획 2절 음성 확인) ② `cancelBubble`을 '옛 이름의 getter'로 부름(DOM IDL은 stopPropagation의 legacy alias). 계획 대비 차이 3건은 모두 기록됨(예제 2 pathname 줄 제거, `ActionRow.where` 추가, 퀴즈 18개)
- 사용자 콘텐츠 검토 세 차례(8건·4건·1건) 반영(`변경 이력`), 재검증: lint·format:check·typecheck 통과, `npm test` 3567개, `test:build` 333개, navigation 16개, 새 페이지 e2e 8개, 영어 인용 31개 원문 일치
- 사용자 최종 승인(2026-11-04) → `reviewedAt` '2026-11-04'. 직전 개념의 '다음 개념' 문구 링크화는 계획 7절 결정대로 하지 않음

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(새 개념 폴더 1개, 브라우저 예제 10개, 호출별 비교표 7행, 고정 테스트·e2e·빌드 테스트·content-guide·로드맵). 공통 코드와 기존 개념 40개는 바꾸지 않았다.
- 달라진 점: 예제 2의 `location.pathname` 줄 제거(이동을 막은 근거가 아님), 예제 2 버튼에 `type="submit"` 명시, 예제 5에 타깃 캡처 리스너 케이스 추가(4줄), 예제 1에 문서에 붙이지 않은 체크박스 `loose` 추가(9줄). 퀴즈 19개, 참고 자료 28개(W3C UI Events 용어집 추가), 영어 인용 31개. 375px 표 줄바뀜 문제로 `ActionRow.call`을 코드와 `where`로 나눔.
- 본문 용어를 "같은 노드의 남은 리스너"에서 "같은 방문(invoke 한 번)의 남은 리스너"로 바꿨다(타깃은 캡처·버블 순회에서 두 번 방문). 표 열 이름은 "같은 노드·같은 단계의 남은 리스너".

### 코드 리뷰
- critical-code-review: Critical/High/Medium 없음, Low 2(실행기 이동 감지 범위에 기댄 근거, `cancelBubble` '옛 이름' 표현)는 보고만 하고 남김. 이후 사용자 콘텐츠 검토 13건은 모두 표준 원문·Chromium 실행으로 확인해 반영.

### 후속 작업
- [ ] 직전 개념 `event-propagation-delegation`의 "다음 개념 '기본 동작과 전파 막기'" 두 문장을 링크로 바꿀지 — 역방향 링크 일괄 처리 때 결정
- [ ] 38~42장 로드맵 7번 타이머

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 비교표의 칸을 손으로 쓰지 않고 `action-table.ts`의 행에서 `evidenceLine`으로 만든 줄이 예제 10 `expectedOutput`과 정확히 같아야 하게 했다 — 예제 10은 Chromium에서 실제로 실행되므로 표의 모든 칸이 실행 결과에 묶이고, 칸 하나를 바꾸면 테스트가 실패한다(음성 확인).
- [Claude 판단] 예제 2의 `location.pathname` 출력을 지우고, "이동이 없었다"의 근거를 "실행기는 페이지 이동이 일어나면 실패하는데 예제가 통과한다"로 바꿨다 — `click()` 직후 동기로 찍히는 값이라 이동을 막지 않았어도 `/`가 나와 근거가 되지 못한다. 취소하지 않은 이동은 실행하지 않고 표준 근거로만 썼다.
- [Claude 판단] 375px에서 표의 코드가 글자 단위로 줄바뀜되자, 호출 칸을 `call`(코드, 줄바꿈 금지)과 `where`(설명)로 나누고 규칙 열에 최소 너비를 줬다 — 기존 표 패턴(`[&_code]:whitespace-nowrap`)을 재사용해 공통 코드를 건드리지 않았다.
- [Claude 판단] 예제 2 버튼은 "type을 생략한 button은 제출 버튼"이라고 설명하는 대신 `type="submit"`을 명시했다 — 현행 HTML 표준은 생략 시 Auto 상태이고 command·commandfor·select 부모 조건이 붙어 한 줄 설명이 부정확해진다.
- stopPropagation 설명의 단위를 "노드"가 아니라 "방문"으로 바꾸고 예제 5에 타깃 캡처 리스너에서 멈추는 케이스를 넣었다(사용자 검토 반영).
- 문서에 붙이지 않은 체크박스의 `change` 미발생을 표준 서술만이 아니라 예제 1의 `loose` 실행 결과로 보였다(사용자 검토 반영).

#### 배경지식
- canceled flag(`preventDefault`)와 stop propagation / stop immediate propagation flag(`stopPropagation` / `stopImmediatePropagation`)는 서로 다른 플래그다. 디스패치가 끝나면 전파 플래그는 지워지고 canceled flag는 남는다(`cancelBubble` false, `defaultPrevented` true).
- 체크박스는 legacy-pre-activation behavior로 리스너보다 먼저 checkedness를 뒤집고, 취소되면 legacy-canceled-activation behavior로 되돌린다. 취소되지 않으면 활성화 동작이 (connected일 때만) input·change를 발생시킨다. change는 cancelable이 아니다.
- set the canceled flag는 `cancelable`이 true이고 in passive listener flag가 없을 때만 동작한다. `dispatchEvent` 반환값은 canceled flag의 부정이다.
- 디스패치는 경로를 캡처 순회(역순)와 버블 순회로 지나며 타깃은 두 번 방문된다. inner invoke는 순회에 맞지 않는 capture 값의 리스너를 건너뛴다. 버블 순회의 조상은 `bubbles`가 true일 때만 방문된다.
- addEventListener는 type·callback·capture가 같으면 추가하지 않고, removeEventListener는 옵션을 capture로만 정리해 비교한다. 이벤트 핸들러(`onclick`)의 `false` 반환은 HTML 이벤트 핸들러 처리 알고리즘이 canceled flag로 바꾼다.

#### 확인 질문
1. 비교표의 칸을 `content.mdx`에 직접 쓰지 않고 예제 10 출력 줄과 대조하게 만든 이유는? 대조가 없다면 어떤 변경이 조용히 틀린 표를 만들 수 있나?
   <details><summary>답</summary>표의 모든 칸을 Chromium 실행 결과에 묶기 위해서다. 대조가 없으면 행 데이터를 고치거나 예제를 바꿔도 표와 실제 동작이 어긋난 채 통과한다. `concept.test.ts`가 `evidenceLine` 결과와 `expectedOutput`의 정확한 일치를 검사하고, 예제 10은 `npm test`가 Chromium에서 실행한다(구현 진행 단계 2).</details>
2. 예제 2에서 `location.pathname`이 `/`로 찍히는 것은 왜 이동을 막았다는 증거가 아닌가? 그럼 무엇이 증거인가?
   <details><summary>답</summary>`click()` 직후 동기로 찍히므로 이동이 예약됐어도 아직 `/`다. 실행기는 페이지 이동이 일어나면 실패하므로, 예제가 통과한다는 것이 이동이 없었다는 근거다(변경 이력 첫 줄, 리뷰 Low ①은 감지 시간 범위에 기댄다는 점).</details>
3. 타깃 `save`에 캡처 리스너와 일반 리스너를 달고 캡처 리스너에서 `stopPropagation()`을 부르면 일반 리스너는 불리나? 일반 리스너 쪽에서 불렀다면?
   <details><summary>답</summary>캡처 리스너에서 멈추면 일반 리스너는 버블 순회의 다음 방문에 속해 불리지 않는다(예제 5 셋째 줄 `["save 캡처"]`). 일반 리스너에서 부르면 같은 방문의 남은 일반 리스너는 불리고 부모만 막힌다(첫 줄 `["save 1","save 2"]`).</details>
4. passive 리스너에서 `preventDefault()`를 부른 뒤 같은 이벤트의 다음 일반 리스너가 `preventDefault()`를 부르면 결과는? 왜 그런가?
   <details><summary>답</summary>취소된다. in passive listener flag는 그 passive 리스너를 부르는 동안에만 서고 돌아오면 지워지므로, 다음 일반 리스너의 호출은 canceled flag를 세운다(본문 passive 절, 예제 8 `직접 호출 뒤 true`).</details>
5. `createElement`로 만든 체크박스를 문서에 붙이지 않고 `click()`하면 `checked`와 `change`는 어떻게 되나? 붙인 뒤라면?
   <details><summary>답</summary>legacy-pre-activation behavior로 checked는 true가 되지만, 활성화 동작이 `If the element is not connected, then return`에서 끝나 change가 나오지 않는다(예제 1 `loose 클릭 뒤 true`, 목록 `["news"]`). 붙인 뒤라면 input·change가 나온다.</details>
