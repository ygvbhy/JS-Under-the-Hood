# 역방향 링크 일괄 정리 구현 계획

- 상태: 완료
- 작성일: 2026-11-11
- 기준: `main` @ `7eabb66`

## 0. 요약

- 목적: 앞서 쓴 개념 페이지가 '별도 개념'·'다음 개념'·'43장에서 다루는 주제'로만 가리킨 주제 중 지금은 페이지가 있는 곳을 그 페이지로 연결하고, 연결한 쌍만 `related`에 더한다
- 범위: 개념 폴더의 `content.mdx`(링크), `meta.ts`(단순화 문구의 개념 이름, `related`), 문구가 든 `.ts` 3개 / 공통 코드·테스트·예제·`reviewedAt`은 바꾸지 않음
- 위험: 대상 페이지가 실제로 다루지 않는 주제를 '그 개념에서 다룹니다'로 바꾸는 것 — 행마다 대상 페이지의 근거 위치를 남기고 메인이 확인한 행만 바꾼다
- 복잡도: 중간 · Consensus: 생략 (선례 `53d8454`와 같은 문구 교체이고 공통 코드 변경이 없음. 위험은 매핑 정확성이라 단계 1의 근거 확인으로 막는다)
- 미확정: 없음

## 1. 요구사항

### 요구사항 (사용자 결정 2026-11-11)

- 기존 페이지에서 '별도 개념'으로만 언급한 주제 가운데 지금 해당 페이지가 있는 곳을 그 페이지로 연결한다.
- `related`는 **이번에 본문·단순화에서 연결한 쌍만** 더한다(186개 비대칭 쌍 전체를 양방향으로 만들지 않는다).
- '별도 개념'이라는 말을 쓰지 않지만 계획 문서들에 '역방향 링크 일괄 처리 때'로 미뤄 둔 항목도 **포함**한다(3절 목록).

### 유지해야 하는 기존 동작

- 수정하는 기존 페이지의 `reviewedAt`은 바꾸지 않는다(문구 교체뿐. 선례 `53d8454`, `async-generator.md:29`).
- 예제 파일, 예제 출력, 시뮬레이터 단계 구성, 테스트 코드는 바꾸지 않는다.
- 페이지가 없는 주제(Proxy, `innerHTML`, `classList`·`style`, `__proto__` 문법, `Object.keys`, `matchAll`, reset 이벤트 등)의 '별도 개념' 문구는 그대로 둔다.

### 제외 범위

- 대상 페이지가 없는 주제를 위해 새 문장을 쓰거나 새 개념을 만드는 일.
- 언급이 없는 곳에 새 연결 문장을 추가하는 일 — 예외는 계획 문서에 명시된 두 곳(`promise`의 '정적 메서드' 절, `fetch`의 `Promise.all` 설명)뿐이다. `promise`·`json` → `fetch`(`fetch.md:225`)는 두 페이지에 `fetch`를 가리키는 문구가 없어 이번에 하지 않는다(`json`의 Ajax 언급은 XMLHttpRequest라 `fetch` 페이지 범위가 아니다).
- 이미 'X 개념에서 다룹니다'라고 이름을 쓴 기존 문구의 `related` 보강(이번에 바꾼 문구가 아니므로).
- `related`만 더하라는 과거 후보(`block-scope.md:304`, `scope-chain.md:317`, `type-coercion.md:356`, `date.md:242` 등) — 이번 문구 교체로 같은 쌍이 연결되면 그때만 더한다.

## 2. 사실과 추정

### 사실 (코드에서 확인)

- '별도 개념'은 `app/concepts/` 안에 145곳(`grep -rn "별도 개념" app/concepts`), '작성 예정'은 0곳이다.
- 145곳 분류 초안: `.claude/plans/backlinks/separate-concepts-initial.tsv`(Sonnet 조사, 열: file, line, kind, fragment, topic, target_slug, already_linked, confidence). 대상 있음 138 / NONE 7, 이미 링크됨 2(`fetch/content.mdx:87,93`). 대상별: error-handling 23, iterable-for-of 11, tdz 10, global-object 10, execution-context 8, this-binding 7, spread-destructuring 7, arrow-functions 7, prototype-chain 6, symbol 5, for-let 5, generator 4, block-scope 4, array-method-pitfalls 4, live-html-collection 3, es-modules 3, class-inheritance 3, async-await 3, primitive-methods 2, microtask-queue 2, json 2, 그 밖 1개씩 9.
- 메인이 확인한 초안의 오류(단계 1에서 반영):
  - `event-propagation-delegation/meta.ts:106`(stopImmediatePropagation, 같은 함수 중복 등록)은 NONE이 아니라 `prevent-default-stop-propagation` — 그 페이지 `content.mdx`에 `stopImmediatePropagation` 10회, 중복 등록 언급 있음.
  - `regexp-lastindex/content.mdx:263`의 `matchAll`→`iterable-for-of`는 틀림(`iterable-for-of`에 `matchAll` 0회) → NONE.
  - `arrow-functions/meta.ts`의 `arguments`를 배열로 바꾸기→`spread-destructuring`은 근거 없음(`spread-destructuring`에 `arguments` 0회) → 단계 1에서 재판정.
  - `tdz/content.mdx:14`·`block-scope/content.mdx:26`의 `for…in`·`for…of` 머리의 `const`→`iterable-for-of`는 그 페이지가 `for...of` 문을 다루지만 `for...in`은 다루지 않는다 → 문구를 `for...of`에 한정해 연결하거나 NONE(단계 1).
- 렌더링: `meta.ts`의 `simplifications`는 일반 텍스트로 그린다(`app/components/concept/SimplificationNote.tsx` — `<li>{s}</li>`). 링크를 걸 수 없으므로 기존 관례대로 'X 개념에서 다룹니다'라고 개념 이름을 쓴다(예: `number-pitfalls/meta.ts:115` 'try/catch/finally 개념에서 다룹니다', `arrow-functions/meta.ts:90` '매개변수 기본값 개념에서 다룹니다').
- 본문 링크 선례(`53d8454`): `[ES 모듈](/concepts/es-modules)은 이 페이지에서 다루지 않고 해당 개념에서 다룹니다.` 다른 페이지들은 `[try/catch/finally](/concepts/error-handling)에서 다루고` 식으로 링크 텍스트에 짧은 개념 이름을 쓴다(`async-await/content.mdx:96`).
- 선수 개념 라벨 중 슬러그 없는 것(`primitives-and-objects`의 '함수 호출', `short-circuit-evaluation`의 '함수 호출' 등)은 대상(`function-calls`, order 100)이 자기보다 뒤라 슬러그를 달 수 없다(선수 개념 order가 더 작아야 한다는 무결성 테스트). 이번 범위 밖.
- `.ts` 안의 문구: `new-operator/scenarios.ts:129`(시뮬레이터 설명 문자열 — 일반 텍스트), `iife-module-pattern/approaches.ts:49-50`와 `iife-module-pattern/content.mdx:100`(비교 표의 'ES 모듈' 행 칸 값 '별도 개념'), `string-utf16/concept.test.ts:115`(테스트 이름 — 바꾸지 않음).
- '별도 개념' 밖의 일괄 처리 대상(계획 문서 근거):
  - `block-scope/content.mdx:10,234` '다음 개념에서 다룹니다'(TDZ) → `tdz` (`tdz.md:346`)
  - `function-calls/meta.ts:78` '호이스팅은 다음 개념에서' → '호이스팅 개념에서'
  - `event-propagation-delegation/content.mdx:375` "다음 개념 '기본 동작과 전파 막기'" → 링크 (`event-propagation-delegation.md:207`, `prevent-default-stop-propagation.md:226`)
  - `spread-destructuring/meta.ts:115`, `set-map/meta.ts:106`, `symbol/meta.ts:103` 'JSON.stringify는 43장에서 다루는 주제' → 'JSON 개념에서 다루는 주제' (`json.md:371`)
  - `this-binding/meta.ts:111` '이벤트 핸들러·타이머처럼 호스트가 this를 정하는 경우' → 타이머(`timers` content에 `this` 22회)·이벤트 핸들러(`event-propagation-delegation` content에 `this` 19회) 개념 이름 (`timers.md:181`, `event-propagation-delegation.md:208`)
  - `promise/content.mdx:69-76` '정적 메서드' 절 끝에 `promise-static-methods` 링크 한 문장, `fetch/content.mdx:520` 근처 `Promise.all` 설명에 링크 (`promise-static-methods.md:313`)
- 현재 `related`: 198쌍 중 186쌍이 한쪽 방향(메인 계산, `node` 스크립트).

### 추정

- 없음

## 3. 구현 전략

- **행 단위 판정 → 일괄 교체.** 먼저 145행 + 3절 추가 항목의 최종 매핑 표를 만들고, 행마다 대상 페이지가 그 주제를 다룬다는 근거 위치(`target/content.mdx:line` 또는 `meta.ts:line`)를 붙인다. 근거를 대지 못하면 NONE으로 둔다. 메인이 medium/low 행과 수정된 행 전부, high 행 표본을 확인한 뒤에 문구를 바꾼다.
- **문구 규칙**
  - `content.mdx`: '별도 개념(에서 다룹니다)' 자리를 `[짧은 개념 이름](/concepts/<slug>)에서 다룹니다`로. 짧은 이름은 기존 본문 링크에서 쓰는 이름을 따른다(예: try/catch/finally, 이터러블과 for...of, TDZ, 전역 객체, 실행 컨텍스트, this, 화살표 함수, 프로토타입 체인, 심벌, for 문의 let, 제너레이터, 블록 스코프, 배열 메서드의 함정, HTMLCollection은 살아 있다, ES 모듈, 클래스 상속과 super, async/await, 원시 값의 메서드 호출, 마이크로태스크 큐, JSON). 한 문장에 여러 주제가 있으면 페이지가 있는 주제만 링크하고 나머지는 '별도 개념'으로 남긴다.
  - `meta.ts`·`.ts` 일반 텍스트: '별도 개념에서 다룹니다' → '<짧은 개념 이름> 개념에서 다룹니다'. 여러 주제면 각각 이름을 쓰거나 페이지 없는 주제는 '별도 개념'으로 남긴다.
  - 뜻을 바꾸지 않는다. 장 번호(예: '40장')를 새로 쓰지 않는다. 범위 한정(예: `for...in`)을 대상 페이지가 다루지 않으면 링크를 그 부분에 걸지 않는다.
- **`related`**: 문구를 바꿔 새로 이름이나 링크가 생긴 대상 slug를 그 페이지 `related` 끝에 더한다(이미 있으면 그대로, 자기 자신 제외).
- **iife 비교 표**: `approaches.ts:49-50`와 `content.mdx:100`의 '별도 개념' 칸 값을 'ES 모듈 개념에서 다룸'으로 바꾼다(표 구조·테스트는 그대로). 표의 행 이름을 링크로 바꾸는 JSX 변경은 하지 않는다.
- 버린 대안: 모든 비대칭 `related`를 양방향으로(사용자 미선택), 단순화 문구를 마크다운 링크로 렌더링하도록 `SimplificationNote` 변경(공통 컴포넌트 변경이고 요구 밖).

## 4. 변경 파일

- 수정: '별도 개념' 행이 있는 개념의 `content.mdx`·`meta.ts`(약 50개 폴더), `new-operator/scenarios.ts`, `iife-module-pattern/approaches.ts`, 3절 추가 항목 파일(`block-scope`, `function-calls`, `event-propagation-delegation`, `spread-destructuring`, `set-map`, `symbol`, `this-binding`, `promise`, `fetch`)
- 추가: `.claude/plans/backlinks/separate-concepts-initial.tsv`(조사 초안), `.claude/plans/backlinks/mapping-final.tsv`(단계 1 결과)
- 변경하지 않음: `app/components/`, `app/simulator/`, `app/lib/`, `tests/`, 모든 `examples/`, `concept.test.ts`(테스트 이름 포함), `reviewedAt`

## 5. 위험 요소

- 대상 페이지가 다루지 않는 주제를 '그 개념에서 다룹니다'로 쓰는 것 → 단계 1의 근거 열과 메인 확인. 특히 `arguments`, `Symbol.toPrimitive`의 일반 규칙(`symbol`에 `toPrimitive` 5회 — 일반 규칙인지 확인), 암묵적 전역(`global-object`), 중첩 호출(`execution-context`), 환경 레코드(`execution-context`), 클래스의 TDZ(`class-basics`), `for...in`.
- 한 문장의 여러 주제를 하나로 뭉뚱그려 링크하는 것 → 주제별로 나눠 쓰고, 페이지 없는 주제는 '별도 개념'으로 남김(단계 2·3 주의사항).
- 문장을 고치며 지시어·조사가 어긋나는 것(선례: `promise-static-methods.md` 변경 이력 사용자 검토 ① — 'X가 이 경우입니다'의 대상이 바뀜) → 고친 문장 전후를 다시 읽고, 조사(은/는, 이/가, 에서)를 링크 텍스트 끝 글자에 맞춘다.
- MDX 파싱: 링크가 문단 첫 글자일 때, `**` 근처, JSX 표 칸 안 → `npm run test:build`.
- 깨진 링크(없는 slug) → 단계 4의 링크 검사 스크립트(모든 `](/concepts/x)`의 x가 폴더로 있는지).
- 퀴즈 문자열(PredictQuiz prop) 안의 '별도 개념'은 작은따옴표 문자열 → 링크 대신 개념 이름만 쓰거나 그대로 둔다(문자열 prop은 마크다운이 아님).
- `related` 순서·중복 → content-integrity 테스트(존재 slug만), 단계 3에서 중복 검사.

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: 공통 코드를 바꾸지 않고 본문 문구만 바꾸므로 `npx playwright test -g "개념 페이지"`로 a11y(링크 대비·이름) 회귀만 확인한다. `-g` 패턴은 구현 때 `a11y.spec.ts` 테스트 이름으로 확정한다.
- 남은 문구: `grep -rn "별도 개념" app/concepts`의 남은 행이 최종 매핑의 NONE 행 + 테스트 이름(`string-utf16/concept.test.ts:115`) + 일부만 연결한 문장의 남은 주제와 정확히 같다.
- 링크 검사: 모든 `content.mdx`의 `](/concepts/<slug>)`에 대해 `app/concepts/<slug>/`가 있다(스크립트).
- `related`: 바꾼 각 쌍이 `related`에 있고 중복이 없다(스크립트), `reviewedAt` diff 0줄(`git diff -U0 | grep reviewedAt` 0건).
- 브라우저: dev 서버에서 표본 3페이지(`new-operator`, `hoisting`, `block-scope`)의 새 링크가 대상 페이지로 이동하고, 관련 개념 목록에 새 항목이 보인다.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 최종 매핑 표

- 대상: `.claude/plans/backlinks/mapping-final.tsv`(새 파일)
- 현재: 초안 `separate-concepts-initial.tsv`(145행)
- 변경: 초안 145행 + 2절의 '별도 개념 밖' 항목을 한 표로 만든다. 열: file, line, kind, 원문 조각, 바꿀 문구(안), target_slug(여러 개면 `;`), 근거(대상 페이지 `path:line`), related 추가 여부. 2절의 메인 확인 오류 4건을 반영하고, 근거를 대지 못하는 행은 NONE으로 둔다. NONE 행은 '바꿀 문구'를 비운다.
- 이유: 매핑 오류가 이 작업의 유일한 큰 위험이다.
- 주의사항: 이 단계에서는 표만 만든다(소스 수정 금지). 짧은 개념 이름은 기존 본문 링크 텍스트에서 가져온다(`grep -rho "\[[^]]*\](/concepts/<slug>)" app/concepts`).
- 완료 조건: 표의 행 수 = 145 + 추가 항목 수, 대상이 있는 행은 모두 근거 열이 채워짐. 메인이 medium/low·수정 행 전부와 high 행 20개 표본의 근거를 열어 확인하고 `구현 진행`에 결과를 적음.

### 2. 본문 링크

- 대상: 표에서 kind=content인 행의 `content.mdx`, `promise/content.mdx`(정적 메서드 절 한 문장), `fetch/content.mdx`(`Promise.all` 링크)
- 현재: '별도 개념'·'다음 개념' 문구
- 변경: 3절 문구 규칙대로 링크로 바꾼다.
- 이유: 독자가 바로 이동할 수 있게 한다.
- 주의사항: 퀴즈 prop 문자열 안은 링크 대신 이름만. 바꾼 문장의 앞뒤 문장을 다시 읽어 지시어·조사 확인. 문단 첫 글자가 `[`가 되어도 되지만 `import`/`export`로 시작하지 않게.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, 링크 검사 스크립트 0건 오류, 표의 content 행이 모두 반영됨(행별 grep).

### 3. 단순화 문구, `.ts` 문구, `related`

- 대상: kind=meta-simplification·ts-other 행의 파일, 3절 추가 항목의 `meta.ts`, 연결이 생긴 페이지의 `related`
- 현재: '별도 개념에서 다룹니다' 일반 텍스트, `related`에 대상 없음
- 변경: 문구 규칙대로 개념 이름을 쓰고, 새로 연결된 slug를 `related` 끝에 더한다. `iife-module-pattern`의 표 칸 값 3곳은 'ES 모듈 개념에서 다룸'.
- 이유: 단순화 목록은 링크를 렌더링하지 않으므로 이름으로 연결하고, 관련 개념 목록으로 실제 링크를 제공한다.
- 주의사항: `string-utf16/concept.test.ts:115`는 바꾸지 않는다. `iife-module-pattern/concept.test.ts`가 표 칸 값을 검사하는지 확인하고, 검사하면 값 변경을 멈추고 보고.
- 완료 조건: `npm test` 통과, `related` 검사 스크립트(표의 related 추가 행이 모두 반영, 중복 0) 통과, `git diff -U0 | grep -c reviewedAt` 0.

### 4. 전체 검증

- 대상: 전체
- 변경: 6절 검증을 모두 실행한다.
- 완료 조건: 6절 명령 통과, 남은 '별도 개념' 행이 표의 NONE·부분 연결 행과 같음, 브라우저 표본 3페이지 확인.

### 5. 정확성 대조

- 대상: 바뀐 문구 전체 diff
- 변경: Opus 서브에이전트에 diff와 최종 매핑 표를 주고, '그 개념에서 다룹니다'가 대상 페이지 내용과 맞지 않는 곳, 뜻이 바뀐 문장, 조사·지시어 오류를 찾게 한 뒤 메인이 확인해 반영한다.
- 이유: 문구 수십 곳을 한꺼번에 바꾸는 작업은 개별 확인이 약해지기 쉽다.
- 완료 조건: 지적마다 수용·기각 근거를 `구현 진행`에 기록.

## 9. 추가 개선 후보

- `SimplificationNote`에서 링크 렌더링(공통 컴포넌트 변경 — 별도 결정).
- 186개 비대칭 `related` 전체 정리(사용자 미선택).
- `promise`·`json` → `fetch`, `json`의 Ajax 언급 → 43장 Ajax 개념이 생기면 연결.

## 구현 진행

- baseline (2026-11-11, `7eabb66`): lint·format:check·typecheck 통과, `npm test` 152 파일 4636개 통과 / test:build 451개·e2e는 `7eabb66` 커밋 전 검증에서 통과(4단계에서 재실행)
- [x] 1. 최종 매핑 표 — `.claude/plans/backlinks/mapping-final.tsv` 156행(초안 145 + 별도 개념 밖 11, `event-propagation-delegation/content.mdx:6`의 같은 '다음 개념' 문구 1행 추가 발견), 대상 있음 139·NONE 17. 서브에이전트 정정: Symbol.match·IIFE로 var 해결·for…of 머리의 반복마다 바인딩·상속된 writable·제너레이터 메서드의 prototype·reset 이벤트 → NONE, 암묵적 전역 → `block-scope`(근거 `block-scope/content.mdx:30`), `for…in` 머리 → `for-let`(근거 `for-let/content.mdx:44`, `for…of`는 '별도 개념' 유지). 메인 확인: 저확신 17행과 표본 18행의 근거 줄을 열어 확인(`block-scope:30` 암묵적 전역, `symbol:69` ToPrimitive·Symbol.toPrimitive 규칙, `for-let:44` for…in 머리, `iterable-for-of:32,34` arguments·Array.from, `date/content.mdx:6` 원문 전체). 수정 1건: 25행 '배열은 객체다 개념에서 배열을 다룹니다' → "배열은 '배열은 객체다' 개념에서 다룹니다". 개념 이름 표기 통일 규칙을 2·3단계에 지시(slug마다 기존 링크 텍스트 최다형: this-binding은 `this`, arrow-functions는 `화살표 함수와 메서드 축약`, 문장형 이름은 단순화 문구에서 작은따옴표로 감쌈)
- [x] 2. 본문 링크 — 서브에이전트가 content 행 54개 + `promise` 정적 메서드 절 끝 문장 1개 + `fetch` `Promise.all` 링크 적용(29 파일). 메인이 word diff 전체와 바뀐 문장 12곳을 문맥째 읽음: `date/content.mdx:6`에 '`toLocaleString` 같은 지역화 출력, 명세 형식이 아닌 날짜 문자열,'이 두 번 들어간 오류를 메인이 직접 고침. 그 밖의 지시어·조사 문제 없음. `iife-module-pattern/content.mdx`의 표 칸 리터럴은 3단계에서 처리
- [x] 3. 단순화 문구, `.ts` 문구, `related` — 서브에이전트가 83행 적용(`dom-tree-nodes/meta.ts:121`은 조각이 달라 실제 문장의 해당 구절만 수동 교체), `iife-module-pattern` 표 칸 3곳 'ES 모듈 개념에서 다룸'(`concept.test.ts`에 '별도 개념' 검사 없음 확인). `related` 41 페이지에 108개 추가(메인이 HEAD와 비교해 집계, 최다 `new-operator` +9). 이름: `this 바인딩 개념` → `this 개념`, 문장형 이름 작은따옴표. 목록 밖 `프로미스 개념`·`async 제너레이터 개념`은 기존 링크 텍스트와 맞아 유지. 메인이 meta·ts word diff 전체를 읽음 — 뜻이 바뀐 곳 없음
- 4단계(1차, 5단계 반영 전): lint·format:check·typecheck 통과, `npm test` 4636개, `test:build` 451개 통과. 링크 483개 중 없는 slug 0, `reviewedAt` 변경 0, `related` 중복·자기 참조 0. 남은 '별도 개념' 26곳 = NONE 17 + 일부만 연결한 문장의 남은 주제 9(for…of 머리 ×2, Reflect.construct, 배열 메서드 빌려 쓰기 ×3, 깊은 복사, Ajax, ES2025 Set 메서드) — 의도와 일치
- [x] 5. 정확성 대조 — Opus 지적 High 1·Medium 7·Low 9. 메인이 대상 페이지 원문으로 확인 후 반영: H1 `dom-tree-nodes` '두 컬렉션이 "살아 있는지"의 차이'(원래부터 있던 표현이지만 링크로 대상 페이지가 그 차이를 설명한다고 주장하게 됨 — `live-html-collection/content.mdx:78,360`은 `childNodes`도 살아 있다고 씀) → '살아 있는 컬렉션이라는 점'(본문·meta) / M1 `for-let/meta.ts` → 'for...of 문 자체는 … 다루지만, 그 머리에서 만들어지는 바인딩은 별도 개념' / M3 `property-attributes/meta.ts` 상속된 writable·setter는 NONE이 아니라 `prototype-chain`(`prototype-chain/content.mdx:52-58`, 예제 6·7) → 문구 교체 + `related`에 `prototype-chain` 추가(매핑표 판정 오류) / M4 getter·setter의 this → 'this의 일반 규칙은'(본문·meta) / M5 `html-attribute-dom-property` 본문 → '이벤트의 전파와 취소 일반은 … 다루고, `reset` 이벤트 자체는 다루지 않습니다'(meta의 'reset 이벤트는 별도 개념'과 일치) / M6 `new-operator/meta.ts` 문장을 둘로 나눔 / L2 `this-binding/meta.ts` 괄호 대신 별도 문장 / L3 `array-index-length/meta.ts` 중복 괄호 삭제 / L6 `array-method-pitfalls/meta.ts` 주제·개념 짝 명확히 / L7 `new-operator/scenarios.ts` 주어 보충 / L8 `arrow-functions` '아직 다루지 않은' → '배열로 바꾸는 용도로는 아직 다루지 않은'(`live-html-collection` 예제 6이 `Array.prototype.forEach.call`을 씀). 기각·유지: M2(`for…of`는 별도 개념 — 사실과 맞음), L1(`[암묵적 전역]` 링크 텍스트는 `tdz/content.mdx:18` 선례), L4(동어 반복은 틀리지 않음), L5(이름 표기는 기존 본문 다수형을 따름 — 계획 3절 목록만 차이), L9. M7(AGENTS.md:21·content-guide.md:231의 '별도 개념으로만 언급' 규칙과 이번 관례의 차이)은 CLAUDE.md 8절에 따라 사용자에게 보고하고 문서는 바꾸지 않음
- [x] 4. 전체 검증(5단계 반영 후) — lint·format:check·typecheck 통과, `npm test` 152 파일 4636개, `test:build` 451개 통과, `reviewedAt` 변경 0, 남은 '별도 개념' 26곳(의도와 일치, M1·M6으로 생긴 2곳과 M3로 없어진 1곳 포함). a11y e2e `tests/e2e/a11y.spec.ts` 456개 통과(5단계 문구 반영 전 빌드 — 반영분은 문구만 바뀜). 브라우저(dev 5174): `new-operator`·`hoisting`·`block-scope` 프리렌더 HTML에서 새 본문 링크(TDZ·for 문의 let·전역 객체·프로토타입 체인·제너레이터·원시 값의 메서드·try/catch/finally)와 관련 개념 목록의 새 항목(`new-operator` 9개, `hoisting` 5개, `block-scope` 4개) 확인
- 리뷰 1차(critical-code-review, 메인 직접): 변경 범위 72 파일(개념 `content.mdx` 29, `meta.ts` 41, `scenarios.ts`·`approaches.ts` 각 1) + 계획 문서. 공통 코드·테스트·예제 diff 0줄. Critical·High 0. Medium 1(보고): AGENTS.md:21·`docs/content-guide.md:231`의 '뒷장 개념은 별도 개념으로만 언급' 문구와 '페이지가 있으면 이름·링크로 가리킨다'는 실제 관례(선례 `53d8454`, 이번 변경)의 차이 — 문서 갱신 여부는 사용자 결정. Low 3(보고): `[암묵적 전역](/concepts/block-scope)` 링크 텍스트는 개념 이름이 아님(선례 있음), 'TDZ는 TDZ 개념에서'류 동어 반복, 매핑표 `property-attributes/meta.ts:95` 판정 오류는 5단계에서 바로잡았고 표(`mapping-final.tsv`)는 기록용이라 그대로 둠

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 '별도 개념'·'다음 개념'·'43장에서 다루는 주제' 문구를 대상 페이지가 있는 곳만 연결했다(본문은 링크, 단순화 목록·`.ts` 문자열은 'X 개념에서 다룹니다'). `related`는 이번에 연결한 쌍만 41개 페이지에 109개 더했다(3단계 108 + 5단계 `property-attributes`→`prototype-chain` 1). 변경 72 파일, 공통 코드·테스트·예제·`reviewedAt`은 그대로다.
- 달라진 점: 매핑 표는 145+11행(`event-propagation-delegation/content.mdx:6`의 같은 '다음 개념' 문구 1행 추가 발견). 5단계 정확성 대조에서 매핑 판정 1건(`property-attributes/meta.ts:95` 상속된 writable·setter → `prototype-chain`)과 원래부터 부정확하던 표현 1건(`dom-tree-nodes`의 '살아 있는지의 차이')을 바로잡았다. `mapping-final.tsv`는 1단계 판정 기록이라 그 뒤의 수정은 반영하지 않았다(`구현 진행` 5단계가 최종).

### 코드 리뷰

- critical-code-review에서 Critical·High 0건. Medium 1건(AGENTS.md:21·`docs/content-guide.md:231`의 '뒷장 개념은 별도 개념으로만 언급' 문구와 실제 관례의 차이)은 사용자에게 보고했고 문서는 바꾸지 않았다. Low 2건(`[암묵적 전역]` 링크 텍스트, 'TDZ는 TDZ 개념에서'류 동어 반복)은 보고만 했다.

### 후속 작업

- [x] AGENTS.md:21·`docs/content-guide.md:231`에 '해당 페이지가 있으면 그 개념 이름이나 링크로 가리킨다'를 더할지 결정(리뷰 Medium) — 2026-11-11 사용자 결정으로 두 문서에 추가
- [ ] 남은 비대칭 `related`(이번 범위 밖) 정리 여부
- [ ] `promise`·`json` → `fetch` 연결과 `json`의 Ajax 언급은 43장 Ajax 개념이 생길 때
- [ ] `SimplificationNote`에서 링크 렌더링(공통 컴포넌트 — 별도 결정)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 한 문장에 여러 주제가 있으면 페이지가 있는 주제만 연결하고 나머지는 '별도 개념'으로 남겼다. 예: `tdz`·`block-scope`의 `for…in`·`for…of` 머리 — `for-let/content.mdx:44`가 `for…in` 머리만 다루므로 `for…of`는 남겼다. 문장을 통째로 링크하는 대안은 대상 페이지가 다루지 않는 부분까지 다룬다고 주장하게 되어 버렸다.
- [Claude 판단] `dom-tree-nodes`의 '두 컬렉션이 "살아 있는지"의 차이'는 원래 문구였지만, 링크를 걸면 `live-html-collection`이 그 차이를 설명한다고 주장하게 된다. 그 페이지는 `childNodes`도 살아 있다고 쓰므로(`live-html-collection/content.mdx:78,360`) '살아 있는 컬렉션이라는 점'으로 고쳤다(Opus 지적 H1).
- [Claude 판단] getter·setter 안의 `this`, 상속된 메서드의 `this`처럼 대상 페이지가 하위 주제를 직접 다루지 않는 경우는 '`this`의 일반 규칙은 …에서'처럼 범위를 좁혀 연결했다.
- [무검토 승인] 매핑은 행마다 대상 페이지의 근거 줄(`path:line`)을 붙이고, 근거를 대지 못하면 연결하지 않는다(NONE). 메인이 저확신 행 전부와 표본을 열어 확인했다. Consensus는 생략하고 구현 뒤 Opus 정확성 대조로 대신했다.
- [무검토 승인] 단순화 목록은 일반 텍스트로 렌더링되므로(`SimplificationNote.tsx`) 링크 대신 'X 개념에서 다룹니다'라고 개념 이름을 쓰고, 실제 이동은 `related`가 맡는다. 수정한 기존 페이지의 `reviewedAt`은 바꾸지 않는다(선례 `53d8454`).
- `related`는 이번에 연결한 쌍만 더하고(186개 비대칭 전체가 아님), '별도 개념' 밖의 미뤄 둔 항목도 포함한다 — 사용자가 골랐다.

#### 배경지식

- 이 사이트는 한 페이지가 그 장까지만 전제하고, 뒷장 주제는 '별도 개념'으로 언급한다(AGENTS.md). 뒷장 페이지가 생긴 뒤 그 언급을 이름·링크로 바꾸는 것이 역방향 연결이다.
- 선수 개념(`prerequisites`)에 slug를 달려면 대상의 order가 더 작아야 한다(무결성 테스트). 그래서 '함수 호출' 같은 라벨은 `function-calls`(order 100)가 뒤에 있어 이번에 연결할 수 없었다.
- MDX 본문의 마크다운 링크는 렌더링되지만, `meta.ts` 문자열과 PredictQuiz 문자열 prop은 마크다운이 아니다.

#### 확인 질문

1. `block-scope`의 '`for…in`·`for…of` 머리의 `const`' 문장을 `for…of`까지 `for-let`으로 연결하지 않은 이유는?
   <details><summary>답</summary>`for-let/content.mdx:44`는 `for…in` 머리의 반복마다 바인딩을 설명하고 `for…of`는 "같은 형태이지만 별도 개념"이라고만 쓴다. `iterable-for-of`도 머리의 바인딩을 다루지 않는다. 그래서 `for…of`를 연결하면 어느 페이지도 다루지 않는 내용을 다룬다고 주장하게 된다(매핑 표 45·59행, `구현 진행` 5단계 M1·M2).</details>
2. '별도 개념' 문구를 이름으로 바꿨을 때 문장이 원래보다 틀린 말이 될 수 있는 경우는? 이번에 실제로 그런 예는?
   <details><summary>답</summary>원래 문구가 부정확했는데 링크가 그 부정확한 내용을 대상 페이지가 설명한다고 보증하게 되는 경우다. `dom-tree-nodes`의 '살아 있는지의 차이'가 그 예이고, 대상 페이지는 두 컬렉션 모두 살아 있다고 쓴다(`구현 진행` 5단계 H1).</details>
3. 단순화 목록에 링크를 걸 수 없는데도 이름으로 바꾼 의미는 무엇이고, 실제 이동은 무엇이 맡나?
   <details><summary>답</summary>독자가 어느 페이지를 찾아야 하는지 알게 하고, 같은 페이지의 `related`(관련 개념 목록, 실제 링크)에 그 slug를 더해 이동을 맡겼다(`SimplificationNote.tsx`가 `<li>{s}</li>`로 그림, 3절).</details>
4. AGENTS.md의 '뒷장 개념은 별도 개념으로만 언급' 규칙과 이번 변경이 어떻게 공존하는가?
   <details><summary>답</summary>뒷장 주제를 이 페이지에서 설명하지 않는다는 뜻은 그대로이고, 이름이나 링크로 가리키기만 한다. 선례는 `53d8454`와 기존 'try/catch/finally 개념에서 다룹니다' 문구다. 다만 문서 문구 자체는 이 관례를 적지 않아, 갱신 여부를 후속 결정으로 남겼다(코드 리뷰 Medium).</details>
