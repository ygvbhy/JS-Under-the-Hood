# 책 이름 없는 장 번호 표기 정리 구현 계획

- 상태: 완료
- 작성일: 2026-11-12
- 기준: `main` @ `9bc630c`

## 0. 요약

- 목적: 책 이름 없이 'NN장'으로만 다른 내용을 가리키는 문구를 정리한다. 사이트 페이지에는 책 이름이 거의 나오지 않아, 독자는 장 번호가 무엇을 가리키는지 알 수 없다. fetch 페이지는 이미 같은 방식으로 정리했다.
- 범위: 개념 13개의 `meta.ts`(13개 파일, 17줄)와 `content.mdx`(3개 파일, 5줄)의 문구, `docs/content-guide.md`에 규칙 한 문장. 예제·코드·테스트·`related`·`reviewedAt`은 바꾸지 않는다.
- 위험: 장 번호를 빼면서 문장 뜻이 바뀌거나("뒤에서 다룬다"는 정보 손실), 새 개념 참조가 생겨 `related` 규칙과 어긋나는 것. 문장마다 바꿀 글을 미리 정했고, 새 링크나 개념 이름 참조는 만들지 않는다.
- 복잡도: 낮음 · Consensus: 생략. 동작 변화가 없는 문구 정리이고 바꿀 글을 모두 이 문서에 적었다.
- 미확정: 없음(사용자 결정: 장 번호 지우기, 본문도 함께)

## 1. 요구사항

- 책 이름 없이 쓴 장 번호(`46장`, `34·35장`, `39장 뒤쪽`, `40장의`, `뒤의 장(39장, 40장)` 등)를 지운다(사용자 결정).
- `meta.ts`와 `content.mdx` 모두 정리한다(사용자 결정).
- 유지: 책 이름을 함께 쓴 두 곳은 그대로 둔다. `regexp-lastindex/meta.ts:94`('『모던 자바스크립트 Deep Dive』 31장 밖의 ES2015 플래그')와 `regexp-lastindex/content.mdx:60`('『모던 자바스크립트 Deep Dive』 31장은 다루지 않습니다')이다.
- 유지: 이미 있는 개념 이름 참조와 링크, `related`, `reviewedAt`.
- 제외: 계획 문서와 테스트 주석의 장 번호(예: `tests/build/build-output.test.ts`의 '25~37장 로드맵'). 독자에게 보이지 않는다.

## 2. 사실과 추정

### 사실 (코드에서 확인)

- 대상은 책 이름 없는 장 번호가 있는 22줄이다(정규식 `\d+(·\d+)*장`, 'Deep Dive'가 없는 줄). 앱 코드(`app/routes`, `app/components`, `app/lib`, 시뮬레이터 파일)에는 장 번호가 없다.
- `meta.simplifications`는 '이 글에서 단순화한 부분' 절에 일반 텍스트로 그려진다(`tests/build/build-output.test.ts:72`).
- 페이지 레이아웃과 홈·소개 페이지는 책 이름이나 장 정보를 보여 주지 않는다(`app/lib/concepts.ts`, `ConceptLayout.tsx`, `routes/about.tsx`, `routes/home.tsx`에서 'Deep Dive'·장 검색 결과 없음).
- 선례: fetch 작업에서 사용자 검토 지적으로 simplifications의 장 번호(43·46·47장)를 지웠다(`.claude/plans/fetch.md` 변경 이력 2026-11-10 ⑧). 후속 항목으로 '다른 개념 meta 13개의 책 이름 없는 장 번호 표기 정리 여부 결정'이 남아 있다(`.claude/plans/fetch.md:226`).
- 지침: `docs/content-guide.md:242` "도서를 언급해야 한다면 책 이름과 장 정도로 한정합니다". `:238`은 뒷장 개념을 "별도 개념" 또는 개념 이름·링크로 가리키게 한다. 개념 이름으로 가리킬 때는 그 slug를 `related`에 더해야 한다.
- 장 번호를 고정한 테스트는 없다. 빌드 테스트 `firstProseLine`은 각 페이지의 첫 본문 줄이 HTML에 들어 있는지 본다(`tests/build/build-output.test.ts:31-63`). `iterable-for-of/content.mdx:6`이 그 첫 줄이고, 바꿔도 링크·코드 구조는 그대로라 검사 방식에 영향이 없다.
- '앞선 장'·'뒤의 장'처럼 번호 없이 장을 가리키는 표현은 2곳이다. `live-html-collection/meta.ts:110`과 `script-async-defer/content.mdx:8`인데, 둘 다 이미 대상 줄이다.

### 추정

- 없음

## 3. 구현 전략

- 괄호 속 장 번호(`(46장)`)는 괄호째 지운다. 장 번호가 문장의 대상인 곳(`39장 뒤쪽에서 다루는 API`, `40장의 별도 개념`, `뒤의 장(39장, 40장)에서 다루므로`)은 장을 빼고 같은 뜻을 남기도록 고쳐 쓴다.
- [Claude 판단] 장 번호 대신 개념 이름이나 링크를 새로 넣지 않는다. 새로 넣으면 `related`도 함께 바꿔야 하고(`content-guide.md:238`), 대상 페이지가 그 하위 주제를 실제로 다루는지 확인하는 일이 따로 생긴다(역방향 링크 작업의 범위). 이미 있는 개념 이름과 링크는 그대로 둔다.
- [Claude 판단] 같은 줄의 '앞선 장의 내용을 그대로 씁니다'(`live-html-collection/meta.ts:110`)도 함께 고친다. 번호는 없지만 책을 전제로 하는 같은 문제이고, 이미 고치는 줄이다.
- [Claude 판단] `docs/content-guide.md:238`에 "다른 장의 내용을 가리킬 때 장 번호만 쓰지 않는다"는 한 문장을 더한다. 같은 표기가 다시 생기지 않게 하려는 것이다. 자동 검사(테스트)는 넣지 않는다(9절).
- 버린 대안: 책 이름 붙이기. 사용자가 고르지 않았다. 문장이 길어지고 장 번호 22곳을 책 목차로 확인해야 한다.

## 4. 변경 파일

- 수정 `meta.ts` 13개: class-inheritance, date, dom-tree-nodes, html-attribute-dom-property, iterable-for-of, json, live-html-collection, regexp-lastindex(93행만), script-async-defer, set-map, spread-destructuring, string-utf16, symbol. 정확한 줄은 8절 표.
- 수정 `content.mdx` 3개: html-attribute-dom-property, iterable-for-of, script-async-defer.
- 수정 `docs/content-guide.md`: 238행 문단 끝에 한 문장.
- 변경하지 않음: `regexp-lastindex`의 책 이름을 쓴 두 곳, 예제, 테스트, `related`, `reviewedAt`, 계획 문서·테스트 주석의 장 번호.

## 5. 위험 요소

- 고쳐 쓴 문장의 뜻이 원문과 달라짐 → 8절 표에 원문과 새 문구를 나란히 적었다. 구현 뒤 `git diff --word-diff`로 표와 같은지 대조한다.
- 장 번호가 남음 → 작업 순서 3의 정규식 검색 결과가 책 이름을 쓴 2곳뿐이어야 한다.
- Prettier가 긴 문자열 줄을 다시 나눔 → `npm run format:check`.
- MDX 첫 줄 검사(`firstProseLine`) → `npm run test:build`.
- 문구에 작은따옴표가 들어가 문자열이 깨짐 → 새 문구에는 작은따옴표를 쓰지 않는다. typecheck와 `npm test`로 확인한다.

## 6. 검증 방법

- `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 공통 앱 코드는 바꾸지 않지만 페이지 13개의 글이 바뀐다(본문을 고치는 3개는 meta도 고치는 페이지다). 영향 범위가 넓으므로 전체 `npm run e2e`를 실행한다(AGENTS.md "영향 범위가 애매하면 전체").
- 남은 장 번호 검색: `grep -rnE "[0-9]+(·[0-9]+)*장" app/concepts/*/meta.ts app/concepts/*/content.mdx`의 결과가 `regexp-lastindex` 두 줄(Deep Dive 포함)뿐이어야 한다. `grep -rn "앞선 장\|뒤의 장" app/concepts`의 결과는 0줄이어야 한다.
- 브라우저: 동작 변화는 없다. 빌드 HTML에서 `grep -c "4[0-9]장\|3[0-9]장" build/client/concepts/{iterable-for-of,script-async-defer,date}/index.html`가 0인지 확인한다.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. meta.ts 문구 정리

- 대상: 아래 표의 `meta.ts` 17줄
- 변경: 원문 조각을 새 문구로 바꾼다. 표에 없는 부분은 건드리지 않는다.

| 위치 | 원문 조각 | 새 문구 |
| --- | --- | --- |
| class-inheritance:104 | 반복자는 이터러블(34장)의 내용이라 | 반복자는 이터러블의 내용이라 |
| date:130 | JSON의 toJSON(43장), 타이머(41장), try...catch(47장)는 | JSON의 toJSON, 타이머, try...catch는 |
| dom-tree-nodes:125 | getAttributeNode는 39장 뒤쪽(요소 취득, 어트리뷰트)에서 다루는 API이며 이 페이지에서는 결과를 보이는 도구로만 씁니다. | getAttributeNode는 요소 취득과 어트리뷰트를 다루는 API이며, 이 페이지에서는 설명하지 않고 결과를 보이는 도구로만 씁니다. |
| html-attribute-dom-property:145 | reset 이벤트는 40장의 별도 개념입니다. | reset 이벤트도 별도 개념입니다. |
| iterable-for-of:108 | 제너레이터(46장)와 yield는 | 제너레이터와 yield는 |
| iterable-for-of:109 | 스프레드 문법(35장)과 배열 디스트럭처링(36장)은 | 스프레드 문법과 배열 디스트럭처링은 |
| iterable-for-of:111 | Map·Set(37장)과 | Map·Set과 |
| iterable-for-of:113 | 닫힌 절차(46장)로 적었습니다. | 닫힌 절차로 적었습니다. |
| json:120 | try...catch(47장) 대신 | try...catch 대신 |
| live-html-collection:110 | className 대입은 39장 뒤쪽(DOM 조작)에서 다루는 API이며 이 페이지에서는 컬렉션이 변하는 모습을 보이는 도구로만 씁니다. Array.from과 화살표 함수는 앞선 장의 내용을 그대로 씁니다. | className 대입은 DOM 조작 API이며, 이 페이지에서는 설명하지 않고 컬렉션이 변하는 모습을 보이는 도구로만 씁니다. Array.from과 화살표 함수도 설명 없이 씁니다. |
| live-html-collection:112 | SyntaxError(47장 try...catch)는 | SyntaxError는 |
| regexp-lastindex:93 | replace·split·search(32장)와 … 부르는 방식(33장)은 | replace·split·search와 … 부르는 방식은 |
| script-async-defer:123 | textContent는 39장(DOM)에서, addEventListener는 40장(이벤트)에서 다루는 API이며 이 페이지에서는 결과를 보이는 도구로만 씁니다. | textContent는 DOM API, addEventListener는 이벤트 API이며, 이 페이지에서는 설명하지 않고 결과를 보이는 도구로만 씁니다. |
| set-map:109 | try...catch(47장)를 | try...catch를 |
| spread-destructuring:116 | try...catch(47장)를 | try...catch를 |
| string-utf16:98 | 도는 것(34·35장)은 | 도는 것은 |
| symbol:102 | for...of(34장)는 … 스프레드 문법(35장)은 | for...of는 … 스프레드 문법은 |

- 주의사항: 문자열은 작은따옴표로 감싸져 있으므로 새 문구에 작은따옴표를 넣지 않는다. 줄 바꿈과 들여쓰기는 그대로 둔다.
- 완료 조건: `grep -nE "[0-9]+(·[0-9]+)*장" app/concepts/*/meta.ts`의 결과가 `regexp-lastindex/meta.ts:94` 한 줄뿐이다. `npm run typecheck`와 `npx vitest run tests/content-integrity.test.ts`가 통과한다.

### 2. content.mdx 문구 정리

| 위치 | 원문 조각 | 새 문구 |
| --- | --- | --- |
| html-attribute-dom-property:68 | 이벤트의 전파와 취소 일반은 40장의 [이벤트 전파와 위임] | 이벤트의 전파와 취소 일반은 [이벤트 전파와 위임] |
| iterable-for-of:6 | 제너레이터(46장), 스프레드 문법(35장)과 배열 디스트럭처링(36장), Map·Set(37장)은 각각 | 제너레이터, 스프레드 문법과 배열 디스트럭처링, Map·Set은 각각 |
| iterable-for-of:34 | Map과 Set이 이터러블이라는 것은 37장의 [Set과 Map] | Map과 Set이 이터러블이라는 것은 [Set과 Map] |
| iterable-for-of:66 | 문법 자체는 35·36장의 [스프레드와 디스트럭처링] | 문법 자체는 [스프레드와 디스트럭처링] |
| script-async-defer:8 | 같은 DOM과 이벤트 API는 뒤의 장(39장, 40장)에서 다루므로 여기서는 결과를 보이는 도구로만 쓰고, | 같은 DOM과 이벤트 API는 여기서 설명하지 않고 결과를 보이는 도구로만 쓰며, |

- 주의사항: 링크 대상 URL과 코드 표기는 그대로 둔다.
- 완료 조건: `grep -nE "[0-9]+(·[0-9]+)*장" app/concepts/*/content.mdx`의 결과가 `regexp-lastindex/content.mdx:60` 한 줄뿐이다.

### 3. 문서 규칙

- 대상: `docs/content-guide.md:238` 문단 끝
- 변경: "다른 장의 내용을 가리킬 때 장 번호(`46장`)만 쓰지 않습니다. 페이지에 책 이름이 나오지 않아 독자가 장 번호를 알 수 없습니다. 개념 이름이나 링크, 또는 \"별도 개념\"으로 씁니다." 한 문장을 더한다.
- 완료 조건: `npm run format:check` 통과.

### 4. 전체 검증

- 6절의 명령과 검색을 실행한다.
- 완료 조건: 모든 명령 통과, 남은 장 번호 검색 결과가 `regexp-lastindex` 두 줄뿐, `앞선 장`·`뒤의 장` 검색 0줄, 빌드 HTML 검색 0.

## 9. 추가 개선 후보

- 책 이름 없는 장 번호를 막는 자동 검사(`content-integrity` 테스트에 정규식 검사 추가). 이번에는 문서 규칙만 둔다.


## 구현 진행

- baseline (2026-11-12, `9bc630c`): 직전 작업 커밋 시점에 lint·format:check·typecheck 통과 / `npm test` 4831 / `test:build` 451 통과(그 뒤 소스 변경 없음)
- 문구 정리는 계획 8절 표의 원문·새 문구를 그대로 쓰는 기계적 치환이라 메인 에이전트가 직접 했다(원문 조각마다 정확히 1회 일치를 assert한 스크립트).
- [x] 1. meta.ts 문구 정리 — 13개 파일 17줄, 남은 장 번호는 `regexp-lastindex/meta.ts:94`(Deep Dive 포함)뿐
- [x] 2. content.mdx 문구 정리 — 3개 파일 5줄, 남은 장 번호는 `regexp-lastindex/content.mdx:60`(Deep Dive 포함)뿐
- [x] 3. 문서 규칙 — `docs/content-guide.md:238` 문단 끝에 한 문장, format:check 통과
- [x] 4. 전체 검증 — lint·format:check·typecheck 통과 / `npm test` 4831 / `test:build` 451 / 전체 `npm run e2e` 689 통과·3 skipped(기존 skip) / 장 번호 검색은 regexp-lastindex 두 줄뿐, `앞선 장`·`뒤의 장` 0줄, 빌드 HTML(iterable-for-of·script-async-defer·date) 장 번호 0
- 리뷰 1차: Critical·High·Medium·Low 없음. `git diff --word-diff`가 8절 표의 원문·새 문구와 일치. 로직 변경이 없는 문구 정리라 검수 가이드 파일은 만들지 않고 보고에 확인 항목을 적음

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 8절 표의 원문·새 문구를 그대로 치환했고 `git diff --word-diff`로 대조했다.

### 코드 리뷰

- 지적 없음.

### 후속 작업

- [ ] (선택) 책 이름 없는 장 번호를 막는 자동 검사(9절)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 문구 치환은 서브에이전트에 맡기지 않고 메인 에이전트가 직접 했다 — 계획 표에 원문·새 문구가 모두 정해진 기계적 치환이라, 원문 조각마다 정확히 1회 일치를 확인하는 스크립트로 바꾸는 편이 위임보다 정확하다.
- [무검토 승인] 장 번호 자리에 개념 이름이나 링크를 새로 넣지 않았다 — 새로 넣으면 `related`도 바꿔야 하고(`docs/content-guide.md:238`), 대상 페이지가 그 하위 주제를 실제로 다루는지 따로 확인해야 한다(역방향 링크 작업의 범위).
- [무검토 승인] 번호 없는 '앞선 장의 내용을 그대로 씁니다'(live-html-collection)도 함께 고쳤다 — 책을 전제로 하는 같은 문제이고 이미 고치는 줄이었다.
- [무검토 승인] content-guide에 "장 번호만 쓰지 않는다" 규칙 한 문장을 더하고, 자동 검사는 넣지 않았다 — 재발 방지는 문서 규칙으로 두고, 테스트는 추가 개선 후보로 남겼다.
- 책 이름을 붙이지 않고 장 번호를 지웠다(사용자 결정) — fetch 페이지의 선례와 같고, 22곳의 장 번호를 책 목차로 확인할 필요가 없다.
- 본문(content.mdx)도 함께 정리했다(사용자 결정).

#### 배경지식

- `meta.simplifications`는 페이지의 '이 글에서 단순화한 부분' 절에 일반 텍스트로 그려진다. 링크가 되지 않으므로 다른 개념은 이름으로만 가리킬 수 있다(`docs/content-guide.md:238`).
- 사이트의 페이지·레이아웃은 책 이름이나 장 정보를 보여 주지 않는다. 그래서 '46장'만으로는 독자가 무엇을 가리키는지 알 수 없다.
- 책 이름과 함께 쓴 장 언급(`regexp-lastindex`의 'Deep Dive 31장' 두 곳)은 지침 "도서를 언급해야 한다면 책 이름과 장 정도로 한정"(`docs/content-guide.md:242`)에 맞아 남겼다.

#### 확인 질문

1. class-inheritance의 '반복자는 이터러블(34장)의 내용'을 '이터러블과 for...of 개념에서 다룹니다'처럼 개념 이름으로 바꾸려면 무엇을 더 해야 하나?
   <details><summary>답</summary>class-inheritance의 `related`(지금 class-basics, prototype-chain, new-operator, this-binding, error-handling)에 `iterable-for-of`를 더하고, 그 페이지가 반복자를 실제로 다루는지 확인해야 한다(`docs/content-guide.md:238`). 이번에는 이런 새 참조를 만들지 않고 '이터러블의 내용'으로 장 번호만 지웠다(계획 3절).</details>
2. regexp-lastindex의 '31장' 두 곳은 왜 지우지 않았나?
   <details><summary>답</summary>책 이름(『모던 자바스크립트 Deep Dive』)과 함께 써서 독자가 무엇을 가리키는지 알 수 있고, 지침 `docs/content-guide.md:242`가 허용하는 형태다(계획 1절).</details>
3. 장 번호를 지우면서 문장을 고쳐 써야 했던 곳은 어떤 경우였나?
   <details><summary>답</summary>장 번호가 괄호 속 보충이 아니라 문장의 대상인 경우다. 예를 들어 '39장 뒤쪽에서 다루는 API', '40장의 별도 개념', '뒤의 장(39장, 40장)에서 다루므로'는 괄호만 지우면 문장이 성립하지 않아, '…를 다루는 API이며, 이 페이지에서는 설명하지 않고'처럼 고쳐 썼다(계획 8절 표).</details>
4. 이번에 넣은 규칙 문장만으로 같은 표기가 다시 생기는 것을 막을 수 있나?
   <details><summary>답</summary>완전히 막지는 못한다. 문서 규칙은 작성자가 읽어야 효과가 있고, `npm test`는 장 번호를 검사하지 않는다. 자동으로 막으려면 content-integrity 테스트에 정규식 검사를 더해야 한다(계획 9절 추가 개선 후보).</details>
