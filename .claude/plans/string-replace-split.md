# 추가 게시글 '문자열 replace와 split' 구현 계획

- 상태: 완료
- 작성일: 2026-11-13
- 기준: `main` @ `6939f86`

## 0. 요약

- 목적: `replace`·`replaceAll`·`split`의 규칙(문자열 패턴은 첫 번째만, `$` 치환 패턴, 함수 치환, g 정규식과 lastIndex, `replaceAll`의 g 검사, `split`의 캡처 그룹·limit·빈 구분자)을 설명하는 추가 게시글 `string-replace-split`을 만든다. 이 메서드들의 동작을 다룬 페이지는 아직 없다(regexp-lastindex는 심벌 메서드를 거치는 방식만 '별도 개념'으로 미룸).
- 범위: 새 개념 폴더 1개(예제 7개, 식 → 결과 표, 퀴즈 6개 이상, 시뮬레이터 없음), 개념 수·학습 순서 테스트(57→58) 갱신, 빌드·e2e 등록, regexp-lastindex 단순화 문장 연결. 공통 앱 코드는 바꾸지 않는다.
- 위험: 명세 분기(문자열 패턴 vs 정규식, 범위 밖 `$n`은 글자 그대로, `$<name>`은 이름 있는 그룹이 있을 때만, 빈 문자열 처리)를 넘치게 일반화하는 것. 명세 원문 대조와 표 칸 실행 대조로 막는다.
- 복잡도: 중간 · Consensus: 수행(Architect·Critic 1회, HIGH 4·MEDIUM 8 반영 — `$<name>`·y 플래그·표 칸 표기·pager 블록 등)
- 미확정: 없음(사용자 결정: replace·replaceAll·split 중심, matchAll은 한 문단, 결과 표 + 퀴즈)

## 1. 요구사항

- 새 개념 `string-replace-split`(가제 제목 "문자열 replace와 split: 왜 첫 번째만 바뀔까")를 추가한다. 학습 순서는 문자열 장 위치: string-utf16(290) 다음, symbol(300) 앞 → order 295(36번째).
- 다룰 것:
  1. `replace`에 문자열 패턴을 주면 첫 번째 위치 하나만 바꾼다(StringIndexOf 한 번). 문자열 패턴은 정규식이 아니라 글자 그대로(`'.'`은 점 한 글자). 모두 바꾸려면 `replaceAll` 또는 g 플래그 정규식.
  2. 치환 문자열의 특수 패턴(GetSubstitution): `$$`, `$&`, `` $` ``, `$'`, `$n`·`$nn`(캡처 그룹), `$<name>`(이름 있는 그룹). 조건을 나눠 쓴다.
     - `$n`: 번호가 1~그룹 수 밖이면 글자 그대로(`$0`·`$00`도), 두 자리가 그룹 수보다 크면 한 자리 + 숫자 글자로 읽힘, 그 그룹이 매치에 참여하지 않았으면(undefined) 빈 문자열. 문자열 패턴에는 캡처가 없으므로 `$1`도 글자 그대로.
     - `$<name>`: 정규식에 이름 있는 그룹이 하나도 없거나(문자열 패턴 포함) `>`가 없으면 `$<` 글자 그대로. 이름 있는 그룹이 있으면 그 이름의 값이고, 그런 이름이 없거나 값이 undefined면 빈 문자열.
  3. 함수 치환: 인수는 (매치 문자열, 캡처들…, 위치, 원래 문자열), 이름 있는 그룹이 있을 때만 마지막에 그룹 객체가 더해진다. 반환값은 문자열로 바뀌고 `$` 패턴으로 해석되지 않는다. g 정규식이면 매치를 **모두 찾은 뒤** 매치마다 차례로 불린다(그래서 함수 안에서 lastIndex는 이미 0). replaceAll의 문자열 패턴도 위치를 모두 모은 뒤 부른다.
  4. g 정규식 `replace`는 시작 전에 `lastIndex`를 0으로 하고(Symbol.replace의 Set) 마지막 검색이 실패하며 0이 된다(RegExpBuiltinExec). g도 y도 없으면 `lastIndex`를 무시하고 바꾸지 않는다. y만 있으면 `lastIndex` 위치에서 한 번 시도하고 `lastIndex`를 바꾼다(regexp-lastindex의 y 절과 같은 규칙, 본문 한 문장 + 근거 테스트). 링크: regexp-lastindex.
  5. `replaceAll`: 문자열 패턴이면 왼쪽부터 겹치지 않게 찾은 모든 위치(`'aaa'.replaceAll('aa','b')` → `"ba"`), 인수가 정규식(IsRegExp)이고 flags에 g가 없으면 TypeError(`/a/y`도). 빈 문자열 패턴: `replace('', x)`는 맨 앞 한 번, `replaceAll('', x)`는 맨 앞·코드 유닛 사이·맨 끝.
  6. `split`: 문자열 구분자로 나누고 빈 조각도 남김, limit은 결과 배열 길이의 최댓값(정규식 캡처로 끼어든 값도 센다, 0이면 빈 배열; 음수·소수가 ToUint32로 바뀌는 것은 다루지 않고 simplifications에), 구분자 생략 시 원래 문자열 하나짜리 배열, 빈 구분자는 코드 유닛 단위(string-utf16 링크), 빈 문자열에 대한 split(`''.split(',')` → `[""]`, `''.split('')` → `[]`). 정규식 구분자는 원래 정규식의 g·y·lastIndex를 무시하고(읽지도 바꾸지도 않음), 캡처 그룹이 있으면 캡처한 값이 결과에 끼어든다. 매치에 참여하지 않은 캡처는 undefined로 끼어드는데 예제·표에는 쓰지 않는다(본문 한 문장 + 근거 테스트).
  - 범위 한정: '문자열 패턴은 글자 그대로'는 replace·replaceAll·split에만 맞다. matchAll은 문자열 인수를 g 정규식으로 만든다(`'a.b'.matchAll('.')`은 세 글자 모두에 매치) — matchAll 문단에 한 줄로 밝힌다.
  7. `matchAll`: 한 문단 — g가 없는 정규식이면 호출만으로 TypeError(스프레드 없이 `'aa'.matchAll(/a/)`), 문자열 인수는 g 정규식이 됨, 결과는 이터레이터이며 이터레이터는 [이터러블과 for...of]에서 다루고 matchAll 자체는 별도 개념.
- 시각화(사용자 결정): 결과 표 + 퀴즈. 표의 결과 칸은 concept.test가 식을 실제로 평가해 대조한다.
- 표 칸 표기 제약(normalizeCell이 태그를 지우고 `{'…'}`를 벗기기만 하며 JS 이스케이프를 풀지 않으므로, 화면 글자 = 테스트가 평가하는 글자가 되게): 식 칸에는 `\`, `<`, `>`, `{`, `}`, 백틱, 이스케이프한 따옴표, 큰따옴표를 쓰지 않는다(숫자는 `[0-9]`). 이름 있는 그룹, `` $` ``·`$'`, 함수 치환, y 플래그는 예제나 본문 근거 테스트로만 다룬다. 식 칸은 `<code>{"…"}</code>`, 결과 칸(JSON, 큰따옴표 포함)은 `<code>{'…'}</code>`로 쓴다. concept.test가 식 칸에 금지 글자가 없는지 검사한다.
- 유지: 공통 앱 코드, 다른 개념의 본문·예제·`reviewedAt`.
- 제외: 정규식 패턴 문법(regexp-lastindex처럼 단순화), Symbol.replace·Symbol.split로 정규식 객체에 일을 넘기는 방식(심벌이 뒷장이고 symbol 페이지도 이를 다루지 않음 → '별도 개념'), IsRegExp가 먼저 Symbol.match를 본다는 점, matchAll의 이터레이터 세부, u·v 플래그와 빈 매치의 AdvanceStringIndex, `split`이 내부에서 y 플래그 정규식을 새로 만드는 방식, exec 덮어쓰기·RegExp 하위 클래스·species, `search`·`match`, limit의 ToUint32 변환(음수·소수·2^32 이상).
- 연도 표기: replaceAll은 ES2021, 이름 있는 그룹은 ES2018에 추가됐다는 사실만 simplifications에 쓴다(책 범위에 대한 주장은 쓰지 않음).

## 2. 사실과 추정

### 사실 (명세·실행·코드에서 확인)

- 명세(현재 초안, 사본: 스크래치패드 `spec.html`):
  - `String.prototype.replace`(`#sec-string.prototype.replace`): searchValue가 객체면 `GetMethod(searchValue, %Symbol.replace%)`가 있으면 그것을 부르고 끝. 아니면 `searchString = ToString(searchValue)`, `position = StringIndexOf(string, searchString, 0)` 한 번, 없으면 원래 문자열. 함수 치환은 `Call(replaceValue, undefined, « searchString, position, string »)`의 결과를 ToString, 아니면 `GetSubstitution(searchString, string, position, captures(빈 목록), undefined, replaceValue)`.
  - `String.prototype.replaceAll`(`#sec-string.prototype.replaceall`): searchValue가 객체이고 IsRegExp면 `Get(searchValue, "flags")`에 "g"가 없으면 TypeError. 문자열이면 `advanceBy = max(1, searchLength)`로 모든 위치를 모은다.
  - `GetSubstitution`(`#sec-getsubstitution`): `$$`→`$`, `` $` ``→앞부분, `$&`→매치, `$'`→뒷부분, `$`+숫자 1~2자리(두 자리가 그룹 수보다 크면 한 자리 + 숫자 글자로), `1 ≤ index ≤ captureLength`가 아니면 ref 그대로, 캡처가 undefined면 빈 문자열; `$<`는 `>`가 없거나 namedCaptures가 undefined면 `$<` 그대로.
  - `RegExp.prototype[%Symbol.replace%]`(`#sec-regexp.prototype-%symbol.replace%`): global이면 `Set(regexp, "lastIndex", +0)` 뒤 RegExpExec 반복(결과가 null이면 끝 — RegExpBuiltinExec가 실패 시 lastIndex를 0으로 둠), 함수 치환 인수는 « matched, captures…, position, string » + namedCaptures가 있으면 그 객체.
  - `String.prototype.split`(`#sec-string.prototype.split`): separator 객체에 %Symbol.split%이 있으면 그것을 부름. limit 생략 시 2^32 − 1, `ToUint32(limit) = 0`이면 빈 배열, separator가 undefined면 « string », 빈 구분자면 코드 유닛 목록(limit까지), string이 빈 문자열이면 « string ».
  - `RegExp.prototype[%Symbol.split%]`(`#sec-regexp.prototype-%symbol.split%`): "ignoring its global, lastIndex, and sticky properties", 캡처(undefined 포함)를 결과에 끼워 넣음(Note 2), 빈 문자열이면 매치가 있으면 빈 배열.
- 실행(Node v24 `vm.runInNewContext`, 2026-11-13):
  - `'a-b-c'.replace('-','+')` → `"a+b-c"`, `replaceAll('-','+')` → `"a+b+c"`, `replace(/-/g,'+')` → `"a+b+c"`, `'a.b.c'.replace('.','!')` → `"a!b.c"`, `'a.b.c'.replace(/./,'!')` → `"!.b.c"`.
  - `'cat'.replace('a','[$&]')` → `"c[a]t"`, `'2026-11-13'.replace(/(\d+)-(\d+)-(\d+)/,'$3/$2/$1')` → `"13/11/2026"`, `'2026-11'.replace(/(?<y>\d+)-(?<m>\d+)/,'$<m>.$<y>')` → `"11.2026"`, `'5'.replace('5','$$5')` → `"$5"`, `` 'abc'.replace('b', "[$`|$']") `` → `"a[a|c]c"`, `'abc'.replace('b','$1')` → `"a$1c"`, `'abc'.replace(/(b)/,'$2')` → `"a$2c"`.
  - 함수 치환: `'x1y22'.replace(/(\d+)/g, f)`에서 인수 `1:1:1:x1y22`, `22:22:3:x1y22`; 함수가 `'$&'`를 반환하면 `"$&b"`; 7을 반환하면 `"7b"`.
  - lastIndex: `r=/a/g; r.lastIndex=2; 'aaa'.replace(r,'b'); r.lastIndex` → 0. `r=/a/; r.lastIndex=2;` → `["baa", 2]`.
  - `'aa'.replaceAll(/a/,'b')` → TypeError, `replaceAll(/a/g,'b')` → `"bb"`, `[...'aa'.matchAll(/a/)]` → TypeError.
  - split: `'a,b,,c'.split(',')` → `["a","b","","c"]`, `'a,b,c'.split(',',2)` → `["a","b"]`, `'a1b2c'.split(/(\d)/)` → `["a","1","b","2","c"]`, `'a1b2c'.split(/\d/)` → `["a","b","c"]`, `'a,b'.split()` → `["a,b"]`, `''.split(',')` → `[""]`, `''.split('')` → `[]`, `'abc'.replace('','-')` → `"-abc"`, `'abc'.replaceAll('','-')` → `"-a-b-c-"`.
- 기존 페이지:
  - regexp-lastindex `meta.ts` simplifications: "replace·split·search와 match가 심벌 메서드를 거쳐 정규 표현식 쪽 검색을 부르는 방식은 별도 개념이라 다루지 않습니다. matchAll(ES2020)은 …"(장 번호는 이미 지움).
  - string-utf16 `content.mdx:15-19`·예제 `split-pair.js`: `split('')`이 코드 유닛 단위라 서로게이트 쌍을 쪼갠다는 것을 이미 다룸 → 새 페이지는 링크만.
  - symbol 페이지에는 Symbol.replace·Symbol.split 서술이 없다(`grep` 0) → '별도 개념'.
  - category: string-utf16은 `fundamentals`, regexp-lastindex는 `objects`.
- 학습 순서: order 정렬로 regexp-lastindex 34번째(280), string-utf16 35번째(290), symbol 36번째(300). 새 개념 295 → 36번째, 기존 36번째 이후는 +1.
- 개념 수 57을 고정한 곳: `app/lib/concepts.test.ts:104,111,112`(`toBe(57)`), `ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts`(`toHaveCount(57)` 78·140행, '57번째' 84행, `학습 순서 N / 57` 35곳 — 1, 23, 25~57 — 중 36 이상 22곳, '객체' 검색 개수 17·32·91·127행과 순위 배열 98-115행), `responsive.spec.ts:1468`.
- navigation pager 블록(25~57번째 개념마다): string-utf16 블록(`navigation.spec.ts:327-340`)의 다음 개념 href가 `/concepts/symbol`, symbol 블록(`:341-354`)의 이전 개념 href가 `/concepts/string-utf16` → 새 개념이 36번째로 들어가면 두 href를 새 slug로 바꾸고 새 개념 블록(36 / 58, 이전 string-utf16, 다음 symbol)을 추가해야 한다.
- 빌드 테스트: 시뮬레이터 없는 개념도 `프리렌더 (<slug>)` 블록이 있다(예: string-utf16 `build-output.test.ts:927`, class-basics `:679`).
- 표 대조 helper: `tests/helpers/expression-tables.ts`의 `tableBody`(머리 행이 정확히 같은 표 하나), `exampleContext`. 가장 가까운 사용 예는 `app/concepts/typeof-operator/concept.test.ts`(errorNameOf, 결과 칸 대조). `normalizeCell`(`tests/helpers/result-tables.ts:17-25`)은 `<…>`를 지우고 `{'…'}`류를 벗기기만 해서, 백슬래시·`<…>`·섞인 따옴표가 든 칸은 화면과 평가 문자열이 달라진다(검토에서 실행 확인). 머리 `식 | 결과 | 이유`는 result-tables 판정 A·B에 걸리지 않는다.
- 추가 실행 확인: `/a/y` + lastIndex 1 → `'baa'.replace` `"bXa"`, 뒤 lastIndex 2 / `'ab'.replace(/(?<x>a)/,'[$<zz>]')` → `"[]b"`, `/(a)/`+`'[$<x>]'` → `"[$<x>]b"` / `'a'.replace(/(a)/,'[$0|$00|$1|$10]')` → `"[$0|$00|a|a0]"` / `'a1b2c'.split(/(\d)/,2)` → `["a","1"]` / `'aaa'.replaceAll('aa','b')` → `"ba"` / `'aa'.matchAll(/a/)`·`'aa'.replaceAll(/a/y,'b')` → TypeError / g 함수 치환 안의 lastIndex `[0,0]` / `split(',',0)` → `[]`.

### 추정

- 없음

## 3. 구현 전략

- 기존 표+퀴즈 개념(string-utf16, class-basics)의 구조를 따른다. 시뮬레이터 없음.
- 핵심 표는 '식 → 결과' 표(머리 `식 | 결과 | 이유`)로, concept.test가 `tableBody`로 읽어 식 칸을 `runInNewContext`로 평가하고 `JSON.stringify` 결과가 결과 칸과 같은지 본다(오류를 던지는 행은 결과 칸 `TypeError`, 오류 이름 비교). 결과 칸 표기는 JSON(`"a+b-c"`, `["a","b"]`)로 통일한다.
- 예제(실행 검증되는 출력 주장)는 표가 다루지 않는 흐름(함수 치환 인수, lastIndex 전후, try…catch로 보이는 TypeError, split의 빈 조각·limit)을 맡고, 표는 한 줄 식들의 비교를 맡는다. 같은 식을 표와 예제에 중복하지 않는다.
- 본문은 명세 분기를 원문 이름(StringIndexOf, GetSubstitution, IsRegExp)으로 짧게 근거를 대고, `$` 패턴 '해당 그룹이 없으면 글자 그대로'처럼 예외 분기를 빼지 않는다.
- [Claude 판단] 연결: regexp-lastindex 단순화 문장 앞부분을 "정규 표현식을 넘긴 replace·split이 g와 lastIndex를 어떻게 다루는지는 문자열 replace와 split 개념에서 다루고, replace·split·search와 match가 심벌 메서드를 거쳐 정규 표현식 쪽 검색을 부르는 방식은 별도 개념이라 다루지 않습니다."로 바꾸고(뒤의 matchAll 문장은 그대로) related에 새 slug를 더한다(`reviewedAt` 유지). 위임 방식은 계속 '별도 개념'으로 남긴다. string-utf16은 고치지 않는다.
- related 기준: 본문 링크 slug + simplifications가 개념 이름으로 가리키는 slug(예: '예제의 try…catch는 try/catch/finally 개념' → `error-handling`).
- 버린 대안: 치환 과정 시뮬레이터(사용자가 표+퀴즈 선택), matchAll 포함(사용자가 replace·replaceAll·split 중심 선택, 이터러블이 뒷장).

## 4. 변경 파일

- 추가 `app/concepts/string-replace-split/`:
  - `meta.ts`(slug, category `fundamentals`, order 295, prerequisites primitive-methods·regexp-lastindex·string-utf16, related = 본문 링크 + 단순화가 이름으로 가리키는 개념(regexp-lastindex·string-utf16·iterable-for-of·error-handling 예정), reviewedAt null)
  - `content.mdx`, `route.tsx`
  - `examples/`: `first-only.js`(문자열 패턴은 첫 번째·글자 그대로, replaceAll·g 비교), `substitution.js`($ 패턴과 글자 그대로 남는 경우), `function-replacer.js`(인수·반환값), `global-lastindex.js`(g 전후 lastIndex, g도 y도 없음 — 함수 치환 안에서 lastIndex를 출력하지 않음), `replaceall-error.js`(g 없는 정규식 TypeError, 빈 패턴), `split-basics.js`(빈 조각·limit(0 이상 정수만)·생략·빈 문자열), `split-regex.js`(캡처 그룹·비캡처·limit이 캡처도 셈·원래 정규식의 lastIndex를 읽지도 바꾸지도 않음; 참여 안 한 캡처는 쓰지 않음)
  - `concept.test.ts`(식 → 결과 표 대조, 본문 서술의 근거)
- 수정(개념 수 57→58·위치): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(개수·N/58·'객체'·pager의 string-utf16 다음·symbol 이전 href·새 블록), `tests/e2e/responsive.spec.ts`
- 수정(e2e·빌드 등록): `tests/e2e/helpers.ts`(경로 상수), `tests/e2e/a11y.spec.ts`(페이지 axe 1개), `tests/e2e/responsive.spec.ts`(가로 스크롤 1개), `tests/build/build-output.test.ts`(프리렌더 블록), `docs/content-guide.md` e2e 등록 목록
- 수정(연결): `app/concepts/regexp-lastindex/meta.ts`(단순화 문장, related)
- 함께 커밋: `.gitignore`에 `.claude/review/` 추가(사용자 요청, 2026-11-13, 이미 작업 트리에 반영됨).
- 변경하지 않음: 공통 앱 코드, 다른 개념 본문, string-utf16, symbol.

## 5. 위험 요소

- `$` 패턴 일반화 → `$n`과 `$<name>`의 조건을 나눠 쓴다(1절 2번). 특히 `$<name>`은 '이름 있는 그룹이 하나라도 있으면 없는 이름은 빈 문자열'(GetSubstitution 대조, 작업 순서 2).
- 'g가 없으면 lastIndex 무시'를 y까지 일반화 → 'g도 y도 없으면'(regexp-lastindex 본문과 같은 조건).
- '함수는 매치를 찾을 때마다 불린다' → 모두 찾은 뒤 차례로.
- limit을 '최대 개수'로만 → 결과 배열 길이 최댓값(캡처 포함), 0이면 빈 배열.
- 표 칸이 화면과 평가 문자열에서 달라짐 → 1절의 표기 제약 + concept.test의 금지 글자 검사.
- '문자열 패턴도 정규식처럼 해석된다'는 오해를 반대로 '정규식은 항상 전부 바꾼다'로 넘김 → g 유무로 나눠 쓴다.
- replaceAll TypeError 조건을 'RegExp 객체면'으로 넓힘 → 명세는 IsRegExp가 참이고 flags에 g가 없을 때(y만 있어도 TypeError).
- split 정규식의 lastIndex·g 무시를 증명 없이 씀 → 예제(`split-regex.js`)에서 lastIndex를 바꿔 두고 결과가 같은지, 실행 뒤 lastIndex가 그대로인지 출력.
- 함수 치환 인수 순서를 이름 있는 그룹까지 일반화 → 이름 있는 그룹 객체는 그룹이 있을 때만 마지막 인수.
- regexp-lastindex 연결 문구가 위임 방식까지 새 페이지가 다루는 것처럼 읽힘 → 위임은 계속 '별도 개념'으로 남기는 수정안(3절).
- 표 칸 JSON 표기와 인라인 코드 공백(Prettier) → 식 칸·결과 칸을 `<code>{"…"}</code>`로, 대조 테스트가 원문을 그대로 평가.
- 위치 이동(36번째 이후 +1)·'객체' 검색·pager href 갱신 누락 → 작업 순서 4 완료 조건에 명시하고 실제 `filterConcepts` 결과로 계산.
- MDX 함정: PredictQuiz 문자열에 작은따옴표 금지(`$'`·`` $` ``은 퀴즈에 쓰지 않음), 백틱이 든 인라인 코드는 백틱 두 개로 감싸기, 첫 문단에 `**` 금지, 문단을 `import`/`export`로 시작하지 않기, 본문의 `$<name>`은 반드시 인라인 코드 안에(JSX 태그로 파싱됨).

## 6. 검증 방법

- `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md: 공통 앱 코드 변경 없음): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "string-replace-split|문자열 replace|홈 학습 순서 보기|개념 페이지: 정규 표현식"`(`-g` 패턴은 실제 테스트 이름에 맞춤).
- 브라우저(dev): 375px·다크 모드에서 표가 가로로 넘치지 않는지(넓은 표는 `<Wide>` 또는 `overflow-x-auto`), 퀴즈 동작, 콘솔 오류 0.

## 7. 미확정 사항

- 없음

## 8. 작업 순서

### 1. 예제와 meta

- 대상: `meta.ts`, `examples/*.js`
- 변경: 1절 다룰 것 1~6의 흐름을 예제 7개로(출력은 원시 값·`JSON.stringify`만, TypeError는 `try…catch`로 `e.name`). `$'`·`` $` ``이 든 치환 문자열은 큰따옴표 문자열로. `split-regex.js`는 g 정규식의 lastIndex를 미리 바꿔 두고 split 결과와 이후 lastIndex를 출력. expectedOutput은 처음 `[]` 후 실제 출력으로 채움(2절 실행 결과와 다르면 멈춤).
- meta: summary 160자 이하, category `fundamentals`(string-utf16과 같은 문자열 장), simplifications(정규식 패턴 문법 생략, Symbol.replace·Symbol.split 위임과 IsRegExp의 Symbol.match 확인은 별도 개념, matchAll은 별도 개념이며 이터레이터는 이터러블과 for...of 개념, u·v 플래그와 빈 매치 전진, split 내부의 y 플래그 정규식, exec 덮어쓰기·RegExp 하위 클래스, search·match, limit의 ToUint32 변환, replaceAll은 ES2021·이름 있는 그룹은 ES2018에 추가, 예제의 try…catch는 try/catch/finally 개념, console은 호스트 API), references(명세 5절: replace, replaceAll, GetSubstitution, split, RegExp.prototype[%Symbol.replace%]·[%Symbol.split%] + MDN replace·replaceAll·split).
- 완료 조건: `npx vitest run tests/examples.test.ts -t string-replace-split` 통과, typecheck 통과.

### 2. content.mdx와 route.tsx

- 도입(첫 문단에 `**` 금지): `'a-b-c'.replace('-', '+')`가 `"a+b-c"`인 질문.
- `## 동작 원리`: 문자열 패턴(StringIndexOf 한 번, 글자 그대로) / g 정규식과 lastIndex / 치환 패턴(GetSubstitution, 예외 분기 포함) / 함수 치환 / replaceAll(IsRegExp·g 검사, 빈 패턴) / split(문자열·정규식, 캡처, limit, 빈 경우; 빈 구분자는 [문자열 길이와 UTF-16] 링크) / matchAll 한 문단(이터러블 개념 링크) / 정규식이 이 메서드들을 넘겨받는 방식은 별도 개념.
- 식 → 결과 표: 머리 정확히 `식`, `결과`, `이유`, 10~14행(2절 실행 결과 중 예제와 겹치지 않는 한 줄 식). 결과 칸은 JSON 표기 또는 `TypeError`.
- `## 예제`: 예제 1~7 + 퀴즈 6개 이상(PredictQuiz 문자열에 작은따옴표 금지).
- `## 결과와 이유`: 예제별 줄 번호 설명, 흔한 오해 Callout 2개(문자열 패턴도 정규식처럼 / replace는 모두 바꾼다).
- 완료 조건: content-integrity·result-tables 통과, 본문 링크 slug 집합 = related, GetSubstitution·replaceAll·split 서술을 2절 원문과 대조한 기록.

### 3. 표 대조 테스트

- 대상: `concept.test.ts`
- 변경: typeof-operator/concept.test.ts의 표 대조를 본뜬다. `tableBody(mdx, ['식','결과','이유'])`로 행을 읽어 (1) 식 칸에 금지 글자(`\ < > { }`·백틱·큰따옴표)가 없음 (2) 식 칸을 평가(오류면 `e.name`)한 `JSON.stringify` 결과 또는 오류 이름이 결과 칸과 같음, 행 10개 이상. 본문 서술의 근거(예제·표에 없는 본문 주장 각각: y 플래그 replace, `$<name>` 세 경우, `$0`·`$nn`, 함수 치환 시점의 lastIndex 0, 참여 안 한 split 캡처의 undefined, matchAll 문자열 인수).
- 완료 조건: `npx vitest run app/concepts/string-replace-split` 통과, 표의 결과 칸 하나를 일부러 바꾸면 그 행만 실패(되돌림).

### 4. 연결 문구·개념 수·e2e·빌드 등록

- regexp-lastindex 단순화 문장(3절 수정안)과 related, content-guide 목록, 개념 수 57→58(`toBe(57)`·`toHaveCount(57)` 포함, navigation `N / 57`은 1~35는 N 유지·36 이상은 N+1, '58번째'), pager의 string-utf16 다음·symbol 이전 href를 새 slug로, 새 개념 pager 블록(36 / 58) 추가, '객체' 검색은 `filterConcepts(listConcepts(), '객체')` 실제 결과로 개수 4곳·순위 배열, helpers 상수, a11y 페이지 1개, responsive 가로 스크롤 1개, build-output 프리렌더 블록(class-basics·symbol처럼 퀴즈 `<details>` 수).
- 완료 조건: `grep -rnE "57" tests/e2e/navigation.spec.ts tests/e2e/responsive.spec.ts app/lib/concepts.test.ts app/components/concept/ConceptPager.test.tsx`에 개념 수·위치 의미의 57이 남지 않음(마지막 개념 57/58 같은 위치 값은 계산과 대조), 순위 배열이 계산 결과와 같음, `reviewedAt` 변경 0.

### 5. 전체 검증

- 6절 명령과 브라우저 확인.

## 9. 추가 개선 후보

- matchAll·search·match와 Symbol.replace/split 위임을 다루는 후속 게시글(이터러블·심벌 뒤).

## 변경 이력

- 2026-11-13 (사용자 콘텐츠 검토): 중간 1·낮음 4 반영 — ① 흔한 오해 Callout의 'y가 있으면 lastIndex 위치에서 이어지는 매치만'이 y만·gy를 묶어 gy에서 틀린 예측(`/a/gy`, lastIndex 2 → `"xba"`, `/a/y` → `"abx"`)을 낳아 둘을 나눠 씀, 본문 gy 문장에도 'g 때문에 lastIndex를 0으로 되돌린 뒤' ② 정규식 점을 '모든 글자에 매치되는 기호'(2곳+퀴즈 해설)에서 '줄 끝 문자를 제외한 아무 글자 하나'로(`/./g`는 `\n`에 매치 안 함) ③ g 정규식 절의 '그래서'가 마지막 실패 초기화를 원인으로 가리켜, 시작 때 0으로 만드는 문장 뒤로 옮김 ④ split limit에 '남은 부분은 버려짐' 문장과 예 ⑤ 단순화에 '문자열도 정규식도 아닌 인수는 문자열로, 치환값 생략 시 undefined'. 근거 테스트 4개 추가. 재검증: lint·format·typecheck, `npm test` 4967, `test:build` 466, 새 페이지 e2e 6, 개발 서버 화면 반영·콘솔 오류 0 — 영향 단계 1·2·3
- 2026-11-13 (사용자 재검토): 낮음 1 반영 — 단순화의 '문자열도 정규식도 아닌 첫 인수는 문자열로'에 split 구분자 undefined 예외(생략과 같아 원래 문자열 하나만 든 배열, `'aundefinedb'.split(undefined)` → `["aundefinedb"]`, null은 "null"로 바뀜) 문장 추가, 근거 테스트 1개 — 영향 단계 1·3

## 구현 진행

- baseline (2026-11-13, `6939f86`): 직전 작업 커밋 시점에 lint·format:check·typecheck 통과 / `npm test` 4904 / `test:build` 459 통과(그 뒤 소스 변경은 `.gitignore`뿐)
- [x] 1. 예제와 meta — 예제 7개 실제 출력이 2절 기대와 일치(`tests/examples.test.ts -t string-replace-split` 7 통과), typecheck 통과, summary 120자('객체' 미포함). 메인 수정: matchAll 단순화 문장을 본문 범위(TypeError·문자열 인수)에 맞춤. MDN 링크 3개 200, `%Symbol.replace%`·`%Symbol.split%` id 사본에서 확인
- [x] 2·3. content.mdx·route.tsx·concept.test.ts — 퀴즈 7개, 본문 링크 slug(regexp-lastindex·string-utf16·iterable-for-of) ⊂ related(+ error-handling은 단순화가 이름으로 가리킴), 표 14행 실행 대조·금지 글자 검사, 근거 테스트 포함 34개. 표 결과 칸 하나를 바꾸면 그 행만 실패함을 서브에이전트가 확인 후 원복. 메인 수정: replace(g·y 없음)와 split의 lastIndex를 '읽지도 바꾸지도 않는다'고 쓴 곳을 '값을 무시하고/관계없이 자르고 바꾸지 않는다'로(RegExpBuiltinExec는 g·y가 없어도 lastIndex를 Get한 뒤 0으로 둠 — '읽지 않음'은 명세와 다름), '세 번째 조건' 지시어 수정
- [x] 4. 연결 문구·개념 수·e2e·빌드 등록 — regexp-lastindex 단순화 문장·related, content-guide 목록, 57→58, pager(string-utf16 다음·symbol 이전·새 블록 36/58), '객체' 순위 배열 36 이상 +1(새 개념은 '객체' 미해당), helpers·a11y·responsive·build-output 블록
- [x] 5. 전체 검증 — lint·format:check·typecheck 통과 / `npm test` 158 파일 4958 통과 / `test:build` 466 통과 / navigation.spec 16 통과 / `-g "string-replace-split|문자열 replace|홈 학습 순서 보기|개념 페이지: 정규 표현식"` 12 통과 / 브라우저(dev 재시작 후 5173): 375px·다크에서 가로 스크롤 없음(scrollWidth 375, 표 감싸개도 넘침 없음), 표 14행의 화면 글자가 원문 식과 같음(`'abc'.replace(/(b)/, '$2')` 등), 퀴즈 7개, `$<name>` 표기 보임, 콘솔 오류 0
- 리뷰 1차(메인 + Opus 명세 정확성 리뷰): High 1 · Medium 1 수정, Low 6 중 5 수정
  - 수정(High): g 정규식 replace를 '끝까지 찾아 모두 바꿈', Callout을 'g가 있을 때만 모두·없으면 첫 번째'로 쓴 이분법이 gy·y만 있는 정규식에서 틀림(sticky는 실패 시 바로 null — `'aba'.replace(/a/gy,'x')` → `"xba"`, `/a/y`·lastIndex 0에서 `'baa'` → 그대로) → 'y 없이 g만'으로 한정, gy·y만 있는 경우 문장 추가, 표 이유 칸·goals·Callout 수정, 근거 테스트 2개
  - 수정(Medium): 예제 2 퀴즈 "4~6번째 줄 출력"이 '결과와 이유'의 코드 줄 번호 체계와 달라 "5~7번째 줄이 출력하는 값"으로
  - 수정(Low): 도입의 캡처 한정, Callout에 match·search도 문자열을 정규식으로 받음, 단순화의 위임 대상을 replace·replaceAll·split과 'Symbol.replace·split 메서드를 가진 객체'로, 용어 '일치'→'매치'·'글자 사이'→'코드 유닛 사이', 덮지 못한 본문 주장 근거 테스트 3개(문자열 패턴 치환 함수 인수, `$00`, y 구분자 split)
  - 남긴 Low: `concept.test.ts`의 금지 글자 검사는 정규화된 칸에 적용되어 원문의 태그 자체는 잡지 못함(브라우저에서 14행 화면 글자 = 원문 식 확인으로 보완)
  - 수정 후: lint·format·typecheck 통과, `npm test` 4963, `test:build` 466, 새 페이지 e2e 6 통과, 개발 서버 화면에 수정 문장 반영·콘솔 오류 0
- 마무리: 사용자 콘텐츠 검토·재검토 반영 후 최종 승인(2026-11-13)으로 `reviewedAt: '2026-11-13'` 기록. content-integrity 758·`test:build` 466 통과, 빌드 HTML `dateModified` 2026-11-13

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 1·2·3·4단계는 Sonnet 서브에이전트, 본문은 메인이 검토·수정했다.
- 계획에 더한 것: g·y가 함께 있거나 y만 있는 정규식의 replace 범위(리뷰 High), 점 기호의 줄 끝 문자 예외·split limit의 남은 부분 버림·인수 문자열 변환과 split 구분자 undefined 예외(사용자 검토), 근거 테스트(최종 concept.test 44개 안팎).
- 퀴즈는 계획의 6개 이상보다 많은 7개.

### 코드 리뷰

- Opus 명세 정확성 리뷰 High 1(g·y 이분법)·Medium 1(퀴즈 줄 번호)·Low 5를 수정했고, 사용자 검토 5건·재검토 1건을 반영했다.
- 남긴 Low: 표 칸 금지 글자 검사가 정규화된 칸에 적용되어 원문의 HTML 태그는 잡지 못함(브라우저 화면 대조로 보완).

### 후속 작업

- [ ] (선택) matchAll·search·match와 Symbol.replace/split 위임을 다루는 후속 게시글(이터러블·심벌 뒤)
- [ ] (선택) `tests/helpers/expression-tables.ts`에서 원문 칸의 태그·백슬래시를 막는 공통 검사

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 표 칸에 `\ < > { }`·백틱·큰따옴표를 쓰지 않고 숫자 패턴을 `[0-9]`로 쓰며, 테스트가 이를 검사하게 했다 — 표 칸 정규화(normalizeCell)는 태그를 지우고 `{'…'}`를 벗기기만 해서, `\d`·`$<m>`이 든 칸은 화면 글자와 테스트가 평가하는 식이 달라진다(교차 검토 지적, 실행 확인).
- [Claude 판단] '`lastIndex`를 읽지도 바꾸지도 않는다'를 '값을 무시하고 바꾸지 않는다'로 고쳤다 — RegExpBuiltinExec는 g·y가 없어도 lastIndex를 Get한 뒤 0으로 둔다.
- [무검토 승인] 학습 순서 36번째(string-utf16 다음), category `fundamentals`, 심벌·이터러블은 링크와 개념 이름으로만.
- [무검토 승인] regexp-lastindex 단순화 문장을 'g·lastIndex 처리는 이 개념, 심벌 메서드 위임은 계속 별도 개념'으로 나눴다.
- 범위(replace·replaceAll·split 중심, matchAll 한 문단)와 시각화(결과 표 + 퀴즈)는 사용자 결정. g·y 조합 설명, 점 기호 표현, '그래서' 인과, limit, 인수 변환과 split undefined 예외는 사용자 검토로 고쳤다.

#### 배경지식

- 문자열 패턴: ToString 뒤 StringIndexOf 한 번(replace) 또는 겹치지 않는 모든 위치(replaceAll), 정규식 기호 없음. 치환 문자열은 GetSubstitution이 `$$ $& $` $' $n $nn $<name>`만 해석.
- RegExp.prototype[Symbol.replace]: g면 lastIndex를 0으로 두고 RegExpExec가 null을 돌려줄 때까지 결과를 모은 뒤 치환(함수는 그다음에 차례로 호출). sticky면 실패 즉시 null이라 gy는 이어지는 매치에서 멈춘다.
- split: limit은 결과 배열 길이 최댓값(정규식 캡처 포함, 도달하면 나머지 버림), 정규식 구분자는 원래 정규식의 g·y·lastIndex를 무시하고 새 y 정규식으로 자른다, 구분자 undefined는 생략과 같다.

#### 확인 질문

1. 표에 `'2026-11'.replace(/(?<y>\d+)-(?<m>\d+)/, '$<m>.$<y>')`를 그대로 넣으면 무엇이 깨지나?
   <details><summary>답</summary>표 칸 정규화가 `<…>`를 태그로 지워 `$<m>`·`(?<y>`가 사라지고, `\d`는 이스케이프가 풀리지 않아 테스트가 화면과 다른 식을 평가한다. 그래서 이런 식은 예제 파일로만 다루고 표 식에는 금지 글자 검사를 둔다(계획 1절 표 칸 표기 제약, `concept.test.ts`).</details>
2. `/a/gy`로 `'aba'.replace`를 하면 왜 `"xba"`이고, lastIndex를 2로 미리 둔 `/a/y`는 왜 `"abx"`인가?
   <details><summary>답</summary>gy는 g 때문에 lastIndex를 0으로 되돌린 뒤 시작하고, sticky라 1번 위치에서 매치가 실패하면 바로 멈춘다. y만 있으면 lastIndex 2에서 한 번만 시도해 그 자리의 a를 바꾼다(본문 g 정규식과 lastIndex 절, 근거 테스트).</details>
3. `'a1b2c'.split(/([0-9])/, 2)`가 `["a","b"]`가 아니라 `["a","1"]`인 이유는?
   <details><summary>답</summary>캡처한 값도 결과 배열에 끼어들고 limit은 그 값까지 센 결과 배열 길이의 최댓값이라, a 뒤에 캡처 1이 들어간 순간 2개가 되어 멈춘다(예제 7, RegExp.prototype[%Symbol.split%]).</details>
4. g 정규식에 치환 함수를 주고 함수 안에서 lastIndex를 읽으면 왜 0인가?
   <details><summary>답</summary>Symbol.replace가 매치를 모두 모은 뒤(마지막 실패로 lastIndex 0) 결과마다 함수를 부르기 때문이다(본문 치환 함수 절, 근거 테스트 `[0,0]`).</details>
5. `x`가 선언만 되고 값이 없을 때 `'aundefinedb'.split(x)`와 `'aundefinedb'.replace(x, '-')`는 어떻게 다른가?
   <details><summary>답</summary>split은 구분자 undefined를 생략과 같게 봐서 `["aundefinedb"]`, replace는 문자열 undefined로 바꿔 찾아 `"a-b"`이다(단순화 첫 항목, 사용자 재검토, 근거 테스트).</details>

