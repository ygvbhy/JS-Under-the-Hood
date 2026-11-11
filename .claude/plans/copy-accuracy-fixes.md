# 기존 페이지 문구 정확성 수정 구현 계획

- 상태: 완료
- 작성일: 2026-11-06
- 기준: `main` @ `a1c16d0`

## 0. 요약
- 목적: 결정을 기다리던 문구 5건을 고쳐 사실과 다르거나 독자가 알 수 없는 서술을 없앤다
- 범위: 기존 개념 10개의 본문·meta 문구와 테스트 1건 추가 / 공통 코드, 예제, 시뮬레이터, 퀴즈는 바꾸지 않음
- 위험: 문구를 고치며 조건을 떨어뜨리는 것 — 명세 원문(`even significand`)과 실행 결과로 대조했다
- 복잡도: 중간 · Consensus: 생략 (문구 변경뿐이고 공통 코드·구조 변경이 없음)
- 미확정: 2건 (`찾히다` 교체 여부, `reviewedAt` 유지 여부 — 기본안 있음)

## 1. 요구사항
- 요구사항
  1. `microtask-queue`·`async-await`·`generator`의 "테스트가 대조합니다"는 없는 테스트를 주장하므로 고친다.
  2. `number-type`의 "2진 표현의 마지막 자리" 표현을 m의 홀짝 기준으로 고친다.
  3. `array-method-pitfalls`의 구멍 서술이 전제한 프로토타입 체인을 `simplifications`에 적는다.
  4. `class-basics`·`arrow-functions`의 "테스트가 확인합니다"류 문구를 독자용 문장으로 고친다.
  5. '찾히다' 표기를 정리한다.
- 유지해야 하는 기존 동작: 예제 출력, 표의 값, 퀴즈, 테스트의 검증 내용.
- 제외 범위: 표 결과 열을 `expectedOutput`과 대조하는 새 테스트(9절), 새 개념 작성.

## 2. 사실과 추정
### 사실 (코드에서 확인)
- 세 페이지의 문장: `app/concepts/microtask-queue/content.mdx:370`, `app/concepts/async-await/content.mdx:393`, `app/concepts/generator/content.mdx:380`. 세 페이지의 `concept.test.ts`에는 본문·표를 읽는 코드가 없다(`content`·`mdx`·`table` grep 결과 없음).
- 세 표의 결과 열 27행을 `meta.ts`의 `expectedOutput`을 `, `로 이은 값과 스크립트로 비교했더니 모두 같다. "결과 열은 meta의 출력과 같고"는 사실이고 "테스트가 대조합니다"만 사실이 아니다.
- `html-attribute-dom-property:182`와 `script-async-defer:65`의 "테스트가 대조해 두었고"는 해당 `concept.test.ts`가 근거 대조를 하므로 사실이다. 고치지 않는다.
- 명세(`sec-ecmascript-language-types-number-type`): "If two values of the set are equally close, then the one with an even significand is chosen". significand의 홀짝은 `m`의 홀짝으로 정의된다.
- `number-pitfalls/content.mdx:36`이 이미 `m × 2^e`와 m의 홀짝으로 같은 내용을 설명한다. 그 페이지의 meta는 `number-type`이 roundTiesToEven을 설명한다고 적는다.
- `number-type` 본문에는 '정규 수'가 나오지 않는다(`grep -c` 0).
- 구멍과 프로토타입 체인을 Node로 실행한 결과. `Array.prototype[1] = 'P'`일 때 `[1,,3]`의 `forEach`는 콜백 3회, `includes('P')`는 `true`, `indexOf('P')`는 `1`, `map`은 `[1,"P",3]`이다.
- "테스트가 확인합니다": `class-basics/content.mdx:37,49,61`, `arrow-functions/content.mdx:29,33,35,41,51`. 해당 주장은 각 `concept.test.ts`와 `comparison.ts`가 실제로 검증한다.
- `array-index-length`는 같은 문구를 빼는 방식으로 고쳤고, 나머지 두 페이지는 `.claude/plans/array-index-length.md:312`에 사용자 결정 대기로 남아 있다.
- '찾히다'는 5개 파일 14곳이다(`global-object` meta 2·본문 5, `this-binding` 1, `execution-context` 본문 4·테스트 제목 1 — 줄 기준, 한 줄에 2회인 곳 포함). `docs/`에는 없다.
- `reviewedAt`은 `dateModified`와 sitemap `lastmod`로도 쓰인다(`docs/content-guide.md:38`).

### 추정
- 없음

## 3. 구현 전략
- 표 문구는 사실인 부분만 남긴다. "meta"는 독자가 모르는 말이라 "각 예제의 실행 출력을 쉼표로 이어 적은 것"으로 바꾼다.
- 테스트 언급은 `array-index-length`와 같이 뺀다. 비교표 두 곳(`:61`, `:51`)은 실제 실행으로 확인했다는 사실이 표를 읽는 데 의미가 있어 "실제로 실행해 확인했습니다"로 남긴다.
- `number-type`은 `number-pitfalls`와 같은 설명을 쓰되, 이 페이지에 없는 '정규 수'는 쓰지 않고 범위를 "이 범위의 Number 값"으로 한정한다.
- 프로토타입 체인 단순화는 실행 결과를 주장하므로 `concept.test.ts`에 근거 테스트를 넣는다.
- 버린 대안: 표 결과 열 대조 테스트를 추가해 문구를 사실로 만드는 방법. 공통 파서가 필요해 문구 수정 범위를 넘는다(9절).

## 4. 변경 파일
- 수정(본문): `microtask-queue`, `async-await`, `generator`, `number-type`, `class-basics`, `arrow-functions`, `global-object`, `this-binding`, `execution-context`의 `content.mdx`
- 수정(meta): `number-type/meta.ts`, `array-method-pitfalls/meta.ts`, `global-object/meta.ts`
- 수정(테스트): `array-method-pitfalls/concept.test.ts`(1건 추가), `execution-context/concept.test.ts`(제목만), `number-type/concept.test.ts:32`(주석만)
- 수정(계획): `.claude/plans/array-index-length.md:312` 체크 표시
- 변경하지 않음: `app/components/`, `app/simulator/`, `app/lib/`, 모든 `examples/`, `html-attribute-dom-property`, `script-async-defer`

## 5. 위험 요소
- 테스트 언급을 뺀 뒤 앞뒤 접속이 어색해짐 → 고친 문단을 앞 문장부터 다시 읽음(작업 순서 3).
- `찾아지는지`로 글자가 늘어 summary·설명 길이 검사에 걸림 → `npm test`, `test:build`(작업 순서 4).
- 프로토타입 오염이 다른 테스트로 번짐 → 예제 실행기의 새 vm 컨텍스트에서만 실행하고 전역 `Array.prototype`을 건드리지 않음(작업 순서 2).
- PredictQuiz 등 MDX 문법 깨짐 → `npm run test:build`(검증 방법).

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build && npm run e2e`
- 문구: 아래 grep이 모두 0건 — `테스트가 대조합니다`, `테스트가 확인`(`class-basics`·`arrow-functions`), `마지막 자리`(number-type), `찾히`(작업 순서 4 적용 시)
- 브라우저: `number-type` 페이지를 프리뷰로 열어 `m × 2^e` 문장이 깨지지 않고 표시되는지, 인라인 코드가 그대로인지 확인

## 7. 미확정 사항
- [미확정] '찾히다' 교체 여부. 기본안은 표기 일관을 위해 '찾아지다'로 일괄 교체(찾히는→찾아지는, 찾히고→찾아지고, 찾히지→찾아지지, 찾히더라도→찾아지더라도, 찾히므로→찾아지므로, 찾히는지→찾아지는지). 유지하기로 하면 작업 순서 4를 뺀다.
- [미확정] `reviewedAt` 유지 여부. 기본안은 작은 문구 수정이므로 유지(`lastmod`를 바꾸지 않음). 사용자가 원하면 2026-11-06으로 갱신.

## 8. 작업 순서
### 1. 사실과 다른 문구 수정
- 대상: `microtask-queue/content.mdx:370`, `async-await/content.mdx:393`, `generator/content.mdx:380`, `number-type/content.mdx:48`, `number-type/meta.ts:66`
- 현재: 없는 테스트를 주장하고, 두 후보 모두 해당할 수 있는 기준으로 반올림을 설명한다.
- 변경:
  - 세 페이지: "결과 열은 meta의 출력과 같고 테스트가 대조합니다." → "결과 열은 각 예제의 실행 출력을 쉼표로 이어 적은 것입니다."
  - `content.mdx:48`: "가운데일 때 명세의 반올림 규칙은 2진 표현의 마지막 자리가 0인 쪽을 고르므로 `2 ** 53`이 됩니다." → "이 범위의 Number 값은 `m × 2^e`(m은 2^52 이상 2^53 미만의 정수)로 나타내는데, 가운데일 때 명세의 반올림 규칙은 m이 짝수인 쪽을 고릅니다. `2 ** 53`은 m이 2^52로 짝수이고 `2 ** 53 + 2`는 m이 2^52 + 1로 홀수이므로 `2 ** 53`이 됩니다."
  - `meta.ts:66`: "2진 표현의 마지막 자리가 0인 쪽을 고릅니다" → "Number 값을 m × 2^e(이 예제의 범위에서 m은 2^52 이상 2^53 미만의 정수)로 나타낸 m이 짝수인 쪽을 고릅니다"
- 이유: 페이지가 근거 없는 검증을 주장하면 정확성 원칙에 어긋나고, '마지막 자리'는 `2 ** 53`과 `2 ** 53 + 2` 모두 정수 2진 표현의 끝이 0이라 기준이 되지 못한다.
- 주의사항: `2 ** 53` 표기는 코드 안에서만 쓰고 m의 값은 본문처럼 `2^52`로 쓴다. 뒤 문장("소스에 쓴 리터럴 …도 같은 이유로")은 그대로 둔다.
- 완료 조건: `grep -rn "테스트가 대조합니다" app/concepts`와 `grep -rn "마지막 자리" app/concepts/number-type`가 0건.

### 2. 프로토타입 체인 단순화 추가
- 대상: `array-method-pitfalls/meta.ts`, `array-method-pitfalls/concept.test.ts`
- 현재: 구멍 서술이 프로토타입 체인에 인덱스가 없다는 전제를 밝히지 않는다.
- 변경:
  - `simplifications`의 'Symbol.species…' 항목 뒤에 추가: "구멍 설명은 Array.prototype과 Object.prototype에 인덱스 프로퍼티가 없는 보통의 경우를 전제합니다. 명세의 HasProperty와 Get은 프로토타입 체인까지 보므로, 그곳에 같은 인덱스가 있으면 구멍에서도 콜백이 불리고 그 값을 읽습니다."
  - `concept.test.ts`에 근거 테스트 1건: 새 vm 컨텍스트에서 `Array.prototype[1] = 'P'` 후 `forEach` 콜백 3회, `includes('P')` true를 확인.
- 이유: 실행 결과 주장은 실제 실행으로 검증한다.
- 주의사항: 기존 `concept.test.ts`의 실행 방식을 따른다. 테스트 프로세스의 `Array.prototype`을 바꾸지 않는다.
- 완료 조건: `npx vitest run app/concepts/array-method-pitfalls` 통과, 새 테스트가 목록에 보임.

### 3. 저자 메모 같은 문구 수정
- 대상: `class-basics/content.mdx:37,49,61`, `arrow-functions/content.mdx:29,33,35,41,51`
- 현재: 독자가 알 수 없는 "이 페이지의 테스트가 확인합니다"가 있다.
- 변경:
  - `class-basics:37`: "그래서 예제로 출력을 보일 수 없고, 이 페이지의 테스트가 확인합니다." → "그래서 예제로 출력을 보일 수 없습니다."
  - `class-basics:49`: "…실행되지 않으므로 예제로 보이지 않고 테스트가 확인합니다." → "…실행되지 않으므로 예제로 보이지 않습니다."
  - `class-basics:61`, `arrow-functions:51`: "칸마다 짧은 코드를 실제로 실행한 결과를 테스트가 확인합니다." → "칸마다 짧은 코드를 실제로 실행해 확인했습니다."
  - `arrow-functions:29`: "(이 페이지의 테스트가 확인합니다)" 삭제
  - `arrow-functions:33`: "…이 SyntaxError는 예제가 아니라 이 페이지의 테스트가 확인합니다." → "…이 SyntaxError는 예제로 보이지 않습니다."
  - `arrow-functions:35`: "…출력에는 드러나지 않고, 이 페이지의 테스트가 확인합니다." → "…출력에는 드러나지 않습니다."
  - `arrow-functions:41`: "그래서 예제로 출력을 보일 수 없고, 이 페이지의 테스트가 확인합니다." → "그래서 예제로 출력을 보일 수 없습니다."
- 이유: `array-index-length`에서 같은 문구를 외부 검수 지적으로 뺐다.
- 주의사항: 테스트 자체는 그대로 둔다. `arrow-functions:41` 다음 문장("아래 비교표의 마지막 행에도 들어 있습니다.")의 대상이 그대로인지 다시 읽는다.
- 완료 조건: `grep -rn "테스트가 확인" app/concepts/class-basics app/concepts/arrow-functions`가 0건. `.claude/plans/array-index-length.md:312`를 `[x]`로 바꾸고 이 계획 파일명을 적는다.

### 4. '찾히다' 표기 교체 (미확정 — 기본안 적용 시)
- 대상: `global-object/meta.ts`, `global-object/content.mdx`, `this-binding/content.mdx`, `execution-context/content.mdx`, `execution-context/concept.test.ts`(제목)
- 현재: 14곳에 '찾히다'를 쓴다.
- 변경: 7절의 대응표대로 교체한다.
- 이유: 외부 검토 지적이고, 같은 뜻의 표기를 하나로 맞춘다.
- 주의사항: 문장을 다시 쓰지 않고 그 낱말만 바꾼다.
- 완료 조건: `grep -rn "찾히" app docs`가 0건, `npm test` 통과.

### 5. 전체 검증
- 대상: 저장소 전체
- 현재: 없음
- 변경: 6절의 검증 순서를 실행하고 `number-type` 페이지를 프리뷰로 확인한다.
- 이유: MDX 빌드 오류는 `npm test`로 잡히지 않는다.
- 주의사항: 공통 코드는 바꾸지 않지만 페이지가 여러 개라 전체 e2e를 실행한다.
- 완료 조건: 모든 명령 통과.

### 6. 후속: 결정 대기 문구 2곳 (2026-11-11 추가, 기준 `312f597`)
- 대상: `app/concepts/set-map/content.mdx:257`, `app/concepts/error-handling/content.mdx:440`
- 현재:
  - set-map: "`new Set([-0])`과 `new Map([[-0, 1]])`의 키가 `+0`인 것은 이 저장소의 테스트가 직접 확인합니다." — 독자가 볼 수 없는 저장소 테스트를 근거로 든다. 근거 테스트는 `set-map/concept.test.ts:96-103`.
  - error-handling: "결과 열은 meta의 출력과 같고, 그 출력은 테스트가 실제 실행과 대조합니다." — `meta`는 독자가 모르는 내부 파일 이름이다.
- 변경:
  - set-map: 해당 문장을 "실제로 `new Set([-0])`과 `new Map([[-0, 1]])`을 실행해도 저장된 키는 `+0`입니다."로 바꾼다(앞 문장 "명세가 `-0`을 `+0`으로 바꿔 저장하도록 정하는 것은 위 설명대로이고,"와 이어지도록 문장 이음은 구현 때 맞춘다).
  - error-handling: "결과 열은 각 예제의 실행 출력입니다."로 바꾼다. 다른 페이지의 표 설명(`microtask-queue/content.mdx:370`, `generator/content.mdx:380`의 "결과 열은 각 예제의 실행 출력을 …")과 같은 표현이다. 어느 예제가 Node `vm`이고 어느 예제가 Chromium인지는 `error-handling/content.mdx:89`가 이미 밝힌다.
- 이유: 2026-11-06 결정 기준("검증 범위를 밝히는 사실 문장은 남기고, 독자가 확인할 수 없는 저자 메모만 뺀다")을 적용한다. 두 문장의 사실 주장(-0이 +0으로 저장됨, 결과 열이 실행 출력임)은 유지하고 내부 근거 표현만 바꾼다.
- 주의사항: 사실 주장은 그대로이므로 `set-map/concept.test.ts:96-103`과 `error-handling`의 예제 대조 테스트가 계속 근거가 된다. 지시어·문장 이음이 깨지지 않게 앞뒤 문장과 함께 읽는다.
- 완료 조건: `/usr/bin/grep -rn "저장소의 테스트\|meta의 출력" app/concepts` 결과 없음, lint·format:check·typecheck·npm test·test:build 통과, `npx playwright test -g "Set과 Map|try/catch/finally"` 통과.

## 9. 추가 개선 후보
- `microtask-queue`·`async-await`·`generator` 표의 결과 열을 `expectedOutput`과 자동 대조하는 테스트. 지금은 이번 조사의 일회성 스크립트로만 확인했으므로 예제가 바뀌면 표가 어긋날 수 있다.

## 변경 이력
- 2026-11-06 (구현 중 발견): 작업 순서 3의 완료 조건 `grep -rn "테스트가 확인" app/concepts` 0건을 두 대상 페이지로 좁혔다. 계획 조사가 놓친 `microtask-queue/content.mdx:120`과 `timers/content.mdx:384`는 실제 검증 범위를 밝히는 사실 문장이고 이번 대상이 아니다 — 영향 단계 3.
- 2026-11-06 (구현 중 발견): `number-type/concept.test.ts:32` 주석에 같은 "마지막 자리" 표현이 있어 함께 고쳤다(계획 조사는 content·meta만 봤다) — 영향 단계 1.
- 2026-11-06 (구현 중 발견): 계획의 14곳은 `찾히`가 그대로 보이는 활용형만 센 것이었다. 음절이 합쳐진 `찾힙니다` 10곳, `찾혀` 6곳, `찾혔습니다` 1곳을 추가로 교체해 모두 31곳이고, `closure/content.mdx`와 `prototype-chain/content.mdx`가 대상에 더해졌다. 완료 조건은 `grep -rnE "찾(히|힙|혀|혔|힌|힐)" app docs` 0건으로 강화한다 — 영향 단계 4.
- 2026-11-06 (리뷰 지적, High): `arrow-functions/content.mdx:9,45,245`에 같은 종류의 문구("테스트로 확인합니다", "이 페이지의 테스트가 두 경우를 실행해 확인합니다")가 남아 있어 같은 방식으로 고쳤다. 완료 조건에 `테스트로 확인`·`테스트가 두 경우`도 더한다 — 영향 단계 3.

- 2026-11-11 (사용자 요청, 후속): 결정 대기 문구 2곳을 처리하는 단계 6을 추가하고 상태를 `승인 대기`로 되돌림 — 영향 단계 6

## 구현 진행

- baseline (2026-11-06, `a1c16d0`): lint 통과 / format:check 통과 / typecheck 통과 / test 143파일 4364건 통과
- e2e 1차 전체 실행: 644 통과, 1 실패(`[mobile] axe (light) 클로저 시뮬레이터를 진행한 뒤`, 90초 시간 초과). 해당 테스트만 재실행하면 2건 모두 통과(각 51.5초). 이번 변경은 그 페이지의 시뮬레이터를 건드리지 않아 부하에 따른 시간 초과로 본다.
- e2e 2차 전체 실행(찾히다 전수 교체 후): 645 통과(15.3분).
- [x] 1. 사실과 다른 문구 수정 — grep 0건, 세 표 27행 `expectedOutput` 일치, `number-type` 프리뷰에서 문장·인라인 코드 확인, 콘솔 오류 없음
- [x] 2. 프로토타입 체인 단순화 추가 — `array-method-pitfalls/concept.test.ts` 새 테스트 통과(전체 4365건)
- [x] 3. 저자 메모 같은 문구 수정 — `class-basics`·`arrow-functions`의 '테스트' 언급 0건
- [x] 4. '찾히다' 표기 교체 — 31곳, `grep -rnE "찾(히|힙|혀|혔|힌|힐)" app docs` 0건
- [x] 5. 전체 검증 — 마지막 수정 뒤 lint·format:check·typecheck·test(143파일 4365건)·test:build(420건)·`arrow-functions` e2e 6건 통과, 그 직전 전체 e2e 645건 통과
- 리뷰 1차: High 1 (수정, 단계 3 — `arrow-functions`에 같은 문구 3곳 잔존) · Low 2 (보고) → 재검증 통과

- [x] 6. 후속: 결정 대기 문구 2곳 — 잔존 grep 결과 없음, lint·format:check·typecheck 통과, npm test 4637 통과, test:build 451 통과, e2e `-g "Set과 Map|try/catch/finally"` 14 통과·실패 0. 직접 리뷰: set-map은 앞 문장("이 예제만으로 보이지 않습니다")과 이어 읽어도 자연스럽고, error-handling은 다른 페이지 표 설명과 같은 표현이라 새 지적 없음

## 구현 결과

### 계획 대비 실제 구현
- 5건 모두 구현했다. `reviewedAt`은 사용자 승인대로 유지했다.
- 달라진 점(`변경 이력`): '찾히다'는 14곳이 아니라 31곳이고 `closure`·`prototype-chain`이 더해졌다. `arrow-functions`의 정리 대상은 5곳이 아니라 8곳이다. `number-type/concept.test.ts:32` 주석도 고쳤다. 작업 순서 3의 완료 조건은 두 대상 페이지로 좁혔다.
- 후속 단계 6(2026-11-11 사용자 요청): 결정 대기 문구 2곳(`set-map/content.mdx:257`, `error-handling/content.mdx:440`)을 독자용 문장으로 바꿨다. 사실 주장은 유지했다.

### 코드 리뷰
- High 1건(`arrow-functions` 같은 문구 3곳 잔존)을 수정했다. Low 2건은 범위 밖이라 남겼다.

### 후속 작업
- [x] `set-map/content.mdx:257`의 "이 저장소의 테스트가 직접 확인합니다"를 독자용 문장으로 고칠지 결정
- [x] `error-handling/content.mdx:440`의 "결과 열은 meta의 출력과 같고"에서 `meta`를 독자가 아는 말로 바꿀지 결정
- [ ] `microtask-queue`·`async-await`·`generator` 표 결과 열을 `expectedOutput`과 자동 대조하는 테스트 추가 검토(9절)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] `찾히`로만 찾지 않고 활용형 전체를 찾아 범위를 31곳으로 넓힘 — 대안은 승인된 14곳만 고치고 나머지를 후속으로 두는 것이다. 한글은 받침과 어미가 한 음절로 합쳐져(`찾힙니다`, `찾혀`, `찾혔습니다`) `찾히` grep에 걸리지 않고, 일부만 바꾸면 사용자가 승인한 "일괄 교체"가 되지 않아 넓혔다.
- [Claude 판단] `arrow-functions`의 `:245`는 삭제하지 않고 "두 경우를 실제로 실행해 확인했습니다"로 바꿈 — 대안은 문장 삭제다. 표의 두 곳과 같은 이유로, 실행했다는 사실은 독자에게 의미가 있고 `테스트`라는 내부 사정만 뺐다.
- [Claude 판단] `microtask-queue:120`과 `timers:384`는 고치지 않음 — 대안은 "테스트" 언급을 전부 없애는 것이다. 두 문장은 실제 검증 범위를 밝히는 사실이고 이번 대상도 아니어서, 계획의 완료 조건을 두 페이지로 좁혔다.
- [Claude 판단] 표 문구를 테스트 추가가 아니라 문장 수정으로 고침 — 대안은 표 셀 대조 테스트를 만드는 것이다. MDX 표를 파싱하는 공통 코드가 필요해 문구 수정 범위를 넘고, 27행 일치는 일회성 스크립트로 확인했다. 대신 예제가 바뀌면 표가 어긋날 위험은 남는다.
- [무검토 승인] `number-type`에서 '정규 수'를 쓰지 않고 "이 범위의 Number 값"으로 한정 — `number-pitfalls`는 '정규 수에서'라고 쓰지만 `number-type` 본문에는 이 말이 나오지 않는다.
- [무검토 승인] 프로토타입 체인 서술에 근거 테스트 추가 — 단순화 문장이어도 실행 결과를 주장하므로 AGENTS.md의 정확성 원칙에 따라 실행으로 검증한다.

#### 배경지식
- 명세의 Number 값 고르기: 두 값이 똑같이 가깝으면 significand가 짝수인 쪽을 고른다. significand의 홀짝은 `s × m × 2^e`의 정수 m으로 정의된다.
- `2 ** 53`과 `2 ** 53 + 2`는 정수를 2진수로 쓰면 둘 다 끝자리가 0이다. 그래서 '2진 표현의 마지막 자리'는 기준이 되지 못하고 m(각각 2^52, 2^52 + 1)을 봐야 한다.
- 구멍은 프로퍼티가 없는 인덱스다. `HasProperty`와 `Get`은 프로토타입 체인을 따라가므로 `Array.prototype[1]`이 있으면 구멍이 없는 것처럼 동작한다.

#### 확인 질문
1. `2 ** 53 + 1`이 `2 ** 53 + 2`가 아니라 `2 ** 53`이 되는 이유를 '마지막 자리가 0'으로 설명하면 왜 부족한가?
   <details><summary>답</summary>두 후보의 정수 2진 표현은 끝자리가 모두 0이라 구분되지 않는다. 명세 기준은 m의 홀짝이고 `2 ** 53`의 m은 2^52(짝수), `2 ** 53 + 2`의 m은 2^52 + 1(홀수)이다. 근거: `number-type/content.mdx:48`.</details>
2. `찾히`로 grep한 결과가 0건이어도 교체가 끝났다고 볼 수 없었던 이유는?
   <details><summary>답</summary>`찾힙니다`·`찾혀`·`찾혔습니다`는 어미와 합쳐져 `찾히`라는 문자열이 없다. 그래서 `grep -E "찾(히|힙|혀|혔|힌|힐)"`로 완료 조건을 강화했다. 근거: 이 문서의 변경 이력.</details>
3. 세 페이지의 표 문구를 고친 뒤에도 남아 있는 위험은 무엇이고, 무엇이 바뀌면 드러나는가?
   <details><summary>답</summary>결과 열과 `expectedOutput`을 묶는 테스트가 없다. 예제 출력이 바뀌면 `npm test`는 meta만 맞추고 표는 그대로 낡을 수 있다. 근거: 9절.</details>
4. `array-method-pitfalls`의 새 테스트가 `runInNewContext`로 실행되어야 하는 이유는?
   <details><summary>답</summary>`Array.prototype[1]`을 바꾸므로 테스트 프로세스의 전역에서 실행하면 다른 테스트의 배열이 오염된다. 새 vm 컨텍스트는 자기 전역 객체를 가진다. 근거: `array-method-pitfalls/concept.test.ts`.</details>
5. `microtask-queue:120`의 "이 페이지의 테스트가 확인한 것은…"을 남긴 이유는?
   <details><summary>답</summary>표준에서 이끌어 낸 설명과 실제로 실행한 범위를 구분하는 사실 문장이다. 저자 메모가 아니라 검증 범위를 독자에게 밝히는 역할을 한다. 근거: 이 문서의 변경 이력.</details>
