# 개념 '문자열 길이와 UTF-16' 구현 계획

- 상태: 완료
- 작성일: 2026-11-02
- 기준: `main` @ `f303436`

## 0. 요약

- 목적: 25~37장 로드맵 7번 `/concepts/string-utf16`을 추가한다. 32장 문자열에서 `'😀'.length`가 2인 이유(문자열은 UTF-16 코드 유닛의 나열), 인덱스·`slice`·`split('')`이 서로게이트 쌍을 쪼개는 것, `charCodeAt`과 `codePointAt`, 문자열의 불변성, 결합 문자와 `normalize`, 이모지 조합(ZWJ), 대소문자 변환에서 길이가 바뀌는 것, `isWellFormed`를 예제 7개와 "코드 유닛 보기" 컴포넌트로 명세 근거로 보인다.
- 범위: 새 개념 폴더 1개(category `fundamentals`, order 290으로 학습 순서 31번째·마지막, 시뮬레이터 대신 프리셋 문자열을 고르는 코드 유닛 표 컴포넌트). 마지막 개념이 바뀌므로 개수·마지막 개념을 고정한 테스트, e2e·빌드 테스트, content-guide, 로드맵을 고친다. 공통 코드와 기존 개념 30개는 바꾸지 않는다.
- 위험: ① "글자 수 = length"나 "UTF-16은 엔진 내부 저장 방식"처럼 명세가 정하지 않는 것을 사실로 씀 ② 짝 없는 서로게이트를 그대로 출력해 호스트마다 다르게 보임 → 문자열 타입을 명세(16비트 코드 유닛의 나열, 해석할 때만 UTF-16)대로 설명하고, 짝 없는 서로게이트는 `JSON.stringify`(`\ud83d` 이스케이프)나 16진수로만 출력한다.
- 복잡도: 중간 · Consensus: 생략. 기존 개념 폴더 패턴에 작은 표 컴포넌트 하나를 더하는 작업이고 공통 코드를 바꾸지 않는다. 예제 출력과 핵심 주장은 명세 원문과 vm 실행으로 미리 확인했다.
- 미확정: 없음(추가 주제·for...of 처리·시각화·slug는 2026-11-02 사용자 확정)

## 1. 요구사항

### 요구사항

- 로드맵 7번 "문자열 길이와 UTF-16"(32장)을 새 개념 페이지로 만든다(`.claude/plans/concept-roadmap-ch25-37.md`).
- 사용자 결정(2026-11-02)
  - 핵심(코드 유닛과 `length`, 서로게이트 쌍, 인덱스·`slice`·`split`이 쌍을 쪼갬, `charCodeAt`·`codePointAt`, 불변성)에 더해 **결합 문자와 normalize**, **이모지 조합(ZWJ)**, **대소문자 변환과 길이**, **isWellFormed(ES2024)**를 넣는다.
  - `for...of`·스프레드가 코드 포인트 단위로 도는 것(34·35장)은 **별도 개념으로 언급만** 한다(예제에 쓰지 않음, 로드맵 9번 '이터러블과 for...of'로 미룸).
  - 시각화: **코드 유닛 보기** — 미리 정한 문자열을 골라 코드 유닛(인덱스·16진수 값·종류)과 코드 포인트 묶음을 표로 본다. 자유 입력은 두지 않는다.
  - slug `string-utf16`, 제목(가제) '문자열 길이와 UTF-16: 😀의 length는 왜 2일까'.
- 주제(본문 동작 원리 h3 순서, 괄호는 예제)
  - ① 문자열은 코드 유닛의 나열이다(예제 1): 명세의 String 타입은 16비트 정수(요소)의 나열이고 `length`는 요소의 개수다. 문자열의 내용을 해석하는 연산은 각 요소를 UTF-16 코드 유닛으로 본다. U+FFFF를 넘는 코드 포인트(😀 = U+1F600)는 상위 서로게이트(0xD800~0xDBFF)와 하위 서로게이트(0xDC00~0xDFFF) 두 코드 유닛으로 나타낸다. `'😀'.length`는 2, `'가나'.length`는 2(한글 음절은 U+FFFF 이하라 한 유닛). `charCodeAt`은 코드 유닛 값, `codePointAt`은 그 위치에서 시작하는 코드 포인트(쌍의 앞이면 합친 값, 쌍의 뒤나 짝 없는 서로게이트면 그 값). `String.fromCodePoint(0x1f600)`과 `'\u{1F600}'`은 같은 문자열.
  - ② 인덱스·slice·split은 코드 유닛 단위다(예제 2 + 코드 유닛 보기): `text[1]`·`charAt`·`slice(0, 2)`·`split('')`은 쌍을 쪼개 짝 없는 서로게이트를 만든다. `indexOf`가 돌려주는 위치도 코드 유닛 인덱스(`'a😀b'.indexOf('b')`는 3). `split('').reverse().join('')`은 쌍의 순서까지 뒤집어 깨진 문자열이 된다. 짝 없는 서로게이트는 `JSON.stringify`가 `\ud83d`처럼 이스케이프해 쓴다.
  - ③ 문자열은 바뀌지 않는다(예제 3): `word[0] = 'b'`는 sloppy mode에서 아무 일도 하지 않는다(strict mode에서는 TypeError — 근거 테스트). 문자열의 인덱스 프로퍼티는 `writable: false`, `configurable: false`로 정의된다(String exotic object의 StringGetOwnProperty). `toUpperCase` 같은 메서드는 새 문자열을 돌려줄 뿐이다. `length`에 대입해도 실패한다는 것과 래퍼 객체는 [원시 값의 메서드](/concepts/primitive-methods)에서 다뤘으므로 요약하고 링크한다.
  - ④ 결합 문자와 normalize(예제 4): `'é'`(é 한 코드 포인트)과 `'é'`(e + 결합 양음 부호)은 같아 보여도 `length`가 1과 2이고 `===`는 `false`. `normalize()`(기본 NFC)로 맞추면 같다. 명세는 `normalize`와 `localeCompare` 말고는 문자열을 저절로 정규화하지 않는다고 적는다.
  - ⑤ 이모지 조합(예제 5): 가족 이모지는 이모지 세 개를 ZWJ(U+200D) 두 개로 이은 코드 포인트 5개, 코드 유닛 8개라 `length`는 8. `slice(0, 2)`는 첫 사람 이모지만. 사람이 보는 "한 글자"(자소 클러스터)는 언어가 정한 단위가 아니며, 그 단위로 나누는 `Intl.Segmenter`는 별도 명세(ECMA-402)라 이름만 언급.
  - ⑥ 대소문자 변환과 길이(예제 6): `'straße'.toUpperCase()`는 `'STRASSE'`(ß → SS)라 `length`가 6에서 7로 바뀌고, 다시 `toLowerCase()`해도 `'strasse'`라 원래와 다르다. 명세는 대소문자 변환에 유니코드의 로캘에 상관없는 매핑(SpecialCasing 포함)을 쓰도록 정한다. `toLocaleUpperCase`는 호스트·로캘에 따라 달라질 수 있어 다루지 않는다.
  - ⑦ 짝 없는 서로게이트 검사(예제 7): `isWellFormed`는 짝 없는 서로게이트가 있으면 `false`, `toWellFormed`는 그것을 U+FFFD(�)로 바꾼 새 문자열을 돌려준다. ES2024에 추가되었고 『모던 자바스크립트 Deep Dive』 출간 이후의 메서드임을 밝힌다.
- 이미 다룬 내용은 요약하고 링크한다: 래퍼 객체와 `length` 쓰기 실패는 [원시 값의 메서드](/concepts/primitive-methods), 원시 값의 불변성과 재할당은 [원시 값과 객체](/concepts/primitives-and-objects), 프로퍼티 어트리뷰트는 [프로퍼티 어트리뷰트와 접근자](/concepts/property-attributes), 문자열 비교가 코드 유닛 값 비교라는 것은 [암묵적 타입 변환](/concepts/type-coercion), 정규 표현식의 `u` 플래그와 코드 포인트는 [정규 표현식의 g 플래그와 lastIndex](/concepts/regexp-lastindex)에서 짧게 언급했다.

### 유지해야 하는 기존 동작

- 기존 개념 30개의 페이지·테스트 결과는 그대로 두고 파일도 수정하지 않는다(테스트 고정값 갱신은 4절 목록만).
- 하이드레이션 규칙을 지키고 `loader`를 두지 않는다. 코드 유닛 보기는 JS 없이 첫 프리셋의 표를 그린다.

### 제외 범위

- `for...of`·스프레드·`Array.from`으로 코드 포인트 단위로 도는 것(34·35장) — 한 줄 언급만
- 자소 클러스터 분할(`Intl.Segmenter`), `localeCompare`·`toLocaleUpperCase` 등 로캘 의존 동작(ECMA-402)
- 문자열 메서드 전반(`replace`·`split`의 정규 표현식 인수, `padStart`, `trim` 등)의 사용법
- 소스 코드의 인코딩(UTF-8 파일)과 엔진 내부의 문자열 저장 방식(명세가 정하지 않음)
- `encodeURIComponent`·`TextEncoder` 등 다른 인코딩 변환

## 2. 사실과 추정

### 사실 (명세 원문 — tc39.es/ecma262 현재 초안, scratchpad `spec.html`, 2026-11-02 확인)

- The String Type(`#sec-ecmascript-language-types-string-type`): "the set of all ordered sequences of zero or more 16-bit unsigned integer values ('elements')". 해석하는 연산은 각 요소를 UTF-16 코드 유닛으로 다룬다. 상위 서로게이트 다음에 하위 서로게이트가 오면 서로게이트 쌍으로 `(c1 - 0xD800) × 0x400 + (c2 - 0xDC00) + 0x10000` 코드 포인트로 해석하고, 쌍을 이루지 않은 서로게이트는 그 값 그대로의 코드 포인트로 해석한다. `normalize`와 `localeCompare` 외에는 문자열을 저절로 정규화하지 않는다. "the substring of string from inclusiveStart to exclusiveEnd"는 코드 유닛 단위.
- String exotic object / StringGetOwnProperty(`#sec-string-exotic-objects`, `#sec-stringgetownproperty`): 정수 인덱스 키에 `{ [[Value]]: 그 위치의 코드 유닛 한 개짜리 문자열, [[Writable]]: false, [[Enumerable]]: true, [[Configurable]]: false }`.
- CodePointAt(`#sec-codepointat`), `String.prototype.codePointAt`(`#sec-string.prototype.codepointat`), `charCodeAt`(`#sec-string.prototype.charcodeat`), `String.fromCodePoint`(`#sec-string.fromcodepoint`), UTF16SurrogatePairToCodePoint(`#sec-utf16decodesurrogatepair`).
- `split`(`#sec-string.prototype.split`): 구분자가 빈 문자열이면 코드 유닛 하나씩 나눈다. `slice`(`#sec-string.prototype.slice`): 코드 유닛 인덱스의 substring.
- `normalize`(`#sec-string.prototype.normalize`): 형식 기본값 "NFC".
- `toUpperCase`·`toLowerCase`(`#sec-string.prototype.touppercase`, `#sec-string.prototype.tolowercase`): 유니코드 문자 데이터베이스의 로캘 비의존 매핑(SpecialCasing.txt 포함)으로 변환하며 결과 길이가 원래와 다를 수 있다.
- `isWellFormed`·`toWellFormed`(`#sec-string.prototype.iswellformed`, `#sec-string.prototype.towellformed`): ES2024(15.0) 판에 있고(3곳) ES2023(14.0) 판에 없다(0곳) — 2026-11-02 내려받아 확인. `toWellFormed`는 짝 없는 서로게이트를 U+FFFD로 바꾼다.
- QuoteJSONString(`#sec-quotejsonstring`): 서로게이트 범위의 코드 유닛이 쌍을 이루지 않으면 `\uXXXX`(소문자 16진수)로 쓴다. → 예제 출력에서 짝 없는 서로게이트를 호스트 차이 없이 보일 수 있다.
- `codePointAt`·`String.fromCodePoint`·`normalize`는 ES2015(6.0) 판에 있다(5곳 확인). 연도는 isWellFormed(ES2024)만 쓴다.

### 사실 (실행 확인 — Node v24.22.1 vm `runInNewContext`, `tests/helpers/run-example.ts`와 같은 옵션)

초안 파일: `/private/tmp/claude-502/-Users-samg-Documents-programming-JS-Under-the-Hood/49c95a79-8449-45bc-806b-77d0e59b9bf0/scratchpad/su/`(전문은 문서 끝 "부록: 예제 초안").

| 예제 | 실제 출력 |
| - | - |
| 1 `length-units.js` | `2 4 2` / `d83d de00` / `1f600 de00` / `true true` |
| 2 `split-pair.js` | `"\ud83d" "\ude00"` / `"a\ud83d" 3` / `["a","\ud83d","\ude00","b"]` / `"b\ude00\ud83da"` |
| 3 `immutable.js` | `cat c` / `{"value":"c","writable":false,"enumerable":true,"configurable":false}` / `cat CAT` |
| 4 `normalize.js` | `1 2 false` / `true 2` / `1 3` |
| 5 `zwj-emoji.js` | `8` / `200d` / `"👨" 3` |
| 6 `case-length.js` | `6 STRASSE 7` / `strasse false` |
| 7 `well-formed.js` | `true false` / `"�" 1` / `fffd` |

- 그 밖: strict mode에서 `word[0] = 'b'`는 TypeError. `'é'`(U+00E9)와 `'é'`의 `normalize('NFD')` 길이 2. `for (var ch of 'a😀b')`는 3번 돈다(본문에서 별도 개념으로만 언급, 근거 테스트로만 확인).

### 사실 (코드에서 확인)

- 겹치는 기존 개념: `primitive-methods`가 문자열 `length`가 쓰기 불가라 `str.length = 1`이 sloppy에서 무시·strict에서 TypeError, `toUpperCase`가 새 문자열을 돌려줌을 다뤘다(`app/concepts/primitive-methods/content.mdx:33`, `:132`, `:183`). 인덱스 대입(`str[0] = …`)과 인덱스 프로퍼티 어트리뷰트는 다루지 않았다. → ③은 인덱스 대입과 어트리뷰트에 집중하고 나머지는 링크한다.
- `type-coercion`이 문자열 비교를 "UTF-16 코드 유닛 값"으로 설명(`app/concepts/type-coercion/content.mdx:174`, `:357`).
- 프리셋 선택 UI 패턴: `SimulatorShell`의 시나리오 라디오(`app/simulator/SimulatorShell.tsx:74-93`, `fieldset`·`legend`·숨긴 radio + 칸 모양 label). 공통 셸은 단계 실행기라 그대로 쓰지 않고, 같은 마크업·클래스를 개념 폴더 컴포넌트에서 본뜬다. `useState` 기본값이 첫 프리셋이라 프리렌더와 첫 클라이언트 렌더가 같다(하이드레이션 규칙).
- 정적 표 컴포넌트 예: `app/concepts/array-method-pitfalls/content.mdx`의 메서드 표(스크롤 region `aria-label`).
- category: number-type·type-coercion이 `fundamentals`('언어 기초'). 문자열 타입의 성질이 축이므로 `fundamentals`. 현재 마지막 개념은 regexp-lastindex(order 280, 30번째). order 290이면 31번째이자 마지막.
- 고정값(현재): 개수 30·마지막 regexp-lastindex — `tests/e2e/navigation.spec.ts`(카드 수 2곳, 마지막 '30번째'·제목, pager 분모 `/ 30` 전부, regexp-lastindex '30 / 30' 블록), `tests/e2e/responsive.spec.ts`(홈 학습 순서 카드 30), `app/lib/concepts.test.ts`(total 30, 마지막 regexp-lastindex), `app/components/concept/ConceptPager.test.tsx`('1 / 30', '30 / 30'). 직전 커밋 `f303436`에서 같은 파일이 어떻게 바뀌었는지 참고한다.
- e2e·빌드 등록 위치: `tests/e2e/helpers.ts`(경로 상수), `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md:167` e2e 목록.
- '객체' 검색: 새 meta의 title·summary·tags에 '객체'를 넣지 않으면 navigation의 '객체' 검색 결과는 그대로다(`app/lib/concepts.ts:70-78`).

### 추정

- 없음

## 3. 구현 전략

- 페이지 축: "자바스크립트 문자열은 글자가 아니라 16비트 코드 유닛의 나열이고, `length`·인덱스·`slice`·`split('')`은 모두 이 코드 유닛을 센다. 코드 포인트(유니코드 문자 번호)나 사람이 보는 한 글자와는 단위가 다르다." 단위를 셋으로 구분해 쓴다: 코드 유닛(언어의 문자열 요소), 코드 포인트(유니코드 번호, 쌍이면 유닛 2개), 사람이 보는 글자(결합 문자·ZWJ 조합, 언어 단위 아님). "UTF-16으로 저장된다"처럼 엔진 저장 방식을 단정하지 않고 "명세는 문자열을 16비트 값의 나열로 정의하고, 해석할 때 UTF-16으로 본다"로 쓴다.
- 짝 없는 서로게이트 출력 규칙: 예제와 본문에서 짝 없는 서로게이트를 `console.log`에 그대로 넘기지 않는다. `JSON.stringify`(이스케이프)나 `toString(16)`으로만 보인다.
- 코드 유닛 보기(`units.ts` + `CodeUnitView.tsx`)
  - `units.ts`: 프리셋 `samples: { id, label, value, note }[]` 5개 — `a😀b`(유닛 4, 코드 포인트 3), `가나`(유닛 2), `é (한 코드 포인트)`(`'é'`, 유닛 1), `é (e + 결합 부호)`(`'é'`, 유닛 2), `가족 이모지`(유닛 8, 코드 포인트 5). 함수 `toUnits(value)` → `{ index, unit, kind: 'single' | 'high' | 'low' | 'lone-high' | 'lone-low' }[]`, `toCodePoints(value)` → `{ start, size: 1 | 2, codePoint }[]`(인덱스 반복 + `charCodeAt`·`codePointAt`, `for...of`를 쓰지 않음). 화면에 보이지 않는 코드 포인트(U+200D ZWJ, U+0301 결합 부호)는 이름 표(`names`)로 텍스트를 보인다.
  - `CodeUnitView.tsx`: `fieldset`·`legend`("문자열")·radio(SimulatorShell 시나리오 라디오 마크업을 본뜸), 요약 한 줄("length 4 · 코드 포인트 3개"), 표(`<table>` + `<caption>`, 열: 인덱스 / 코드 유닛(16진수) / 종류(일반·상위 서로게이트·하위 서로게이트·짝 없는 …) / 코드 포인트(U+XXXX, 쌍이면 `rowSpan=2`) / 글자). 서로게이트 한쪽만의 "글자"는 그리지 않고 쌍 전체 행(rowSpan)에 코드 포인트의 글자를 그린다. region(`role="region"`, `aria-label="코드 유닛 보기"`)으로 감싼다. 375px에서 넘치면 표 영역만 가로 스크롤.
  - 짝 없는 서로게이트 종류(`lone-*`)는 프리셋에 없지만 `toUnits`가 처리하도록 두고 단위 테스트로 확인한다(`'a😀b'.slice(0, 2)`).
- 테스트(`concept.test.ts`)
  - ① 프리셋마다 `toUnits`·`toCodePoints` 결과 = 테스트에 손으로 적은 기대값(16진수 유닛 목록, 종류 목록, 코드 포인트 목록) — 함수가 엔진과 같은 값을 내는지 독립적으로 확인.
  - ② 프리셋마다 새 vm 컨텍스트에서 `value.length`, `charCodeAt(i)`, `codePointAt(i)`를 실행한 결과 = `toUnits`·`toCodePoints`(실행 결과 대조).
  - ③ `toUnits('a😀b'.slice(0, 2))`의 마지막이 `lone-high`, `toUnits('\ude00')`이 `lone-low`.
  - ④ 본문 주장 근거: strict mode 인덱스 대입 TypeError, `for...of`가 `'a😀b'`에서 3번(별도 개념 언급 근거), `length` 속성이 쓰기 불가(이미 primitive-methods가 다뤘지만 이 페이지에서 언급하면), 문자열 리터럴 `'é'`(U+00E9)와 `'é'`가 같다.
  - 프리셋 id 중복 없음, 프리셋 유닛 수 ≤ 8.
- 장 범위: 32장까지. 예제에 `split('').reverse().join('')`(27장 배열 메서드), `JSON.stringify`, `Object.getOwnPropertyDescriptor`(16장)를 쓴다. `for...of`·스프레드·`try...catch`는 예제에 쓰지 않는다(strict TypeError는 본문 문장 + 근거 테스트).
- category `fundamentals`, order 290. prerequisites: primitive-methods, primitives-and-objects, property-attributes. related: primitive-methods, primitives-and-objects, property-attributes, type-coercion, regexp-lastindex.
- 버린 대안
  - ① 자유 입력 코드 유닛 보기: 사용자 결정(프리셋). 입력값에 따른 표는 테스트로 검증할 수 없고, 하이드레이션 전후 마크업도 달라진다.
  - ② `SimulatorShell` 재사용: 단계 실행기라 코드·단계·출력 영역이 필요 없다. 라디오 마크업만 본뜬다.
  - ③ 코드 유닛 표를 프리셋마다 정적으로 모두 그리기: 표 5개가 본문을 길게 만든다. 선택형 하나로 둔다(JS가 없으면 첫 프리셋만 보이고, 나머지 문자열은 본문 예제로 다룬다).

## 4. 변경 파일

- 추가 `app/concepts/string-utf16/`
  - `meta.ts`, `content.mdx`, `route.tsx`(템플릿), `units.ts`, `CodeUnitView.tsx`, `concept.test.ts`, `CodeUnitView.test.tsx`
  - `examples/`(7개): `length-units.js`, `split-pair.js`, `immutable.js`, `normalize.js`, `zwj-emoji.js`, `case-length.js`, `well-formed.js`
- 수정
  - `tests/e2e/helpers.ts`: `STRING_UTF16_PATH`, `STRING_UTF16_VIEW_NAME`('코드 유닛 보기')
  - `tests/e2e/a11y.spec.ts`: 페이지 axe, 코드 유닛 보기의 프리셋 5개를 차례로 골라 axe
  - `tests/e2e/responsive.spec.ts`: 가로 스크롤, 프리셋 5개를 고를 때마다 가로 스크롤 없음, 홈 학습 순서 카드 30→31
  - `tests/e2e/navigation.spec.ts`: 카드 30→31(두 곳), 마지막 '31번째'와 새 제목, pager 분모 30→31, regexp-lastindex '30 / 31'·링크 2개(이전 array-method-pitfalls, 다음 string-utf16), 새 개념 '31 / 31'·이전 링크 regexp-lastindex. '객체' 검색은 단계 4 판정
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`: total 31, 마지막 string-utf16(prev regexp-lastindex, position 31)
  - `tests/build/build-output.test.ts`: 프리렌더 describe(region '코드 유닛 보기', 첫 프리셋 표의 `U+1F600`과 `d83d`, 라디오 5개, 퀴즈 `<details` 7개 이상)
  - `docs/content-guide.md:167`: e2e 목록에 `string-utf16`
  - `.claude/plans/concept-roadmap-ch25-37.md`: 7번 상태·진행 기록
- 변경하지 않음: `app/simulator/`, `app/lib/` 코드, `app/routes.ts`, 기존 개념 폴더 30개

## 5. 위험 요소

- "length = 글자 수", "엔진은 UTF-16으로 저장한다" 같은 서술 → 3절의 세 단위 구분으로 쓰고, 단계 3에서 '저장'·'글자 수' grep으로 오해를 바로잡는 문맥에만 있는지 확인.
- 짝 없는 서로게이트 출력이 호스트·폰트마다 다름 → 2절 출력 규칙. 예제 파일과 본문 인라인 코드에서 짝 없는 서로게이트를 그대로 쓰지 않는다(이스케이프 표기).
- 이모지·결합 문자가 소스에서 보이지 않거나 편집 중 바뀜 → ZWJ·결합 부호·`é`는 `\u` 이스케이프로 쓰고, 보이는 이모지 `😀`와 `ß`만 그대로 쓴다. examples는 Prettier 제외라 바뀌지 않는다.
- 표 값 오류 → 손으로 적은 기대값 + vm 실행 대조(단계 2), 음성 확인.
- 대소문자 변환 결과가 호스트 유니코드 버전에 따라 다를 수 있음 → `ß`→`SS`는 SpecialCasing의 오래된 로캘 비의존 매핑이라 안정적이지만, simplifications에 "결과는 호스트가 따르는 유니코드 데이터 판에 따른다(Node 24 기준)"를 밝힌다. `normalize` 결과도 같다.
- 하이드레이션 불일치 → `useState` 기본값을 첫 프리셋으로 고정하고 렌더에 브라우저 전용 값을 쓰지 않는다(빌드 테스트로 첫 프리셋 표가 HTML에 있는지 확인).
- 375px 넘침 → 표는 열 5개라 region 안에서만 가로 스크롤, responsive e2e가 프리셋마다 페이지 가로 스크롤을 확인.
- `try...catch` 등 뒷장 문법 → 예제에 쓰지 않는다. strict TypeError는 근거 테스트로만.
- 마지막 개념 변경으로 고정 테스트 누락 → 2절 목록 전부를 단계 4에서 고친다.
- 새 폴더 생성 순서 → meta.ts → content.mdx → route.tsx.

## 6. 검증 방법

- 정적·테스트: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(AGENTS.md 새 개념 범위): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "string-utf16|문자열 길이와 UTF-16|코드 유닛 보기|홈 학습 순서 보기"` — 실행 전 `--list`로 새 케이스가 모두 잡히는지 확인.
- 정확성: 예제 7개 실제 출력 = `expectedOutput`(처음엔 `[]`), concept.test 통과·음성 확인, 본문 결과·원인 문장과 줄 번호를 메인이 2절·예제 파일과 대조, 참고 링크 200.
- 브라우저(build + start, 375px·다크)
  1. `/concepts/string-utf16` → 가로 스크롤 없음, 코드 유닛 보기에 첫 프리셋 `a😀b`의 표(유닛 4행, 😀가 `rowSpan` 2행, `U+1F600`)가 보인다.
  2. 프리셋 '가족 이모지' → 유닛 8행, ZWJ 행에 이름 텍스트, 요약 "length 8 · 코드 포인트 5개".
  3. 프리셋 'é (e + 결합 부호)' → 유닛 2행, 결합 부호 행에 이름 텍스트.
  4. 키보드(Tab·화살표)로 프리셋을 바꿀 수 있다.
  5. 하단 학습 순서 '31 / 31', 이전 regexp-lastindex. regexp-lastindex 하단 '30 / 31', 다음 string-utf16.

## 7. 미확정 사항

- 없음. 제목·프리셋 라벨 문구는 검토 때 조정 가능.

## 8. 작업 순서

### 1. 예제·meta·route 작성과 실행 확인

- 대상: `examples/*.js`(7개), `meta.ts`, 임시 `content.mdx`(필수 h2만), `route.tsx`
- 현재: 폴더 없음
- 변경
  - 부록 초안 7개를 그대로 옮긴다.
  - `meta.ts`: slug `string-utf16`, title '문자열 길이와 UTF-16: 😀의 length는 왜 2일까', summary(160자 이하, '객체' 없이), category `fundamentals`, order 290, tags(문자열, string, length, UTF-16, 코드 유닛, code unit, 코드 포인트, 서로게이트 쌍, codePointAt, normalize, 이모지, isWellFormed), goals 4개, prerequisites·related(3절), examples는 처음엔 `[]`, references(2절 명세 anchor + MDN ko `String/length`·`String/codePointAt`·`String/normalize`·`String/isWellFormed` — ko가 404면 en-US), `reviewedAt: null`
  - simplifications: 엔진 내부 저장 방식은 명세가 정하지 않음(명세는 16비트 값의 나열로 정의) / `for...of`·스프레드의 코드 포인트 순회는 별도 개념(34·35장) / 자소 클러스터 분할 `Intl.Segmenter`와 `localeCompare`·`toLocale*Case`는 ECMA-402라 다루지 않음 / 대소문자 변환·정규화 결과는 호스트의 유니코드 데이터 판을 따름(Node 24 기준) / `isWellFormed`·`toWellFormed`는 책 출간 이후(ES2024) / 짝 없는 서로게이트는 `JSON.stringify` 이스케이프와 16진수로만 출력 / 코드 유닛 보기는 미리 정한 문자열만 다룸 / `console`은 호스트 API
  - `route.tsx`: regexp-lastindex 템플릿 복사
- 이유: 출력은 추측하지 않고 실행 결과로 채운다(AGENTS.md).
- 주의사항: 생성 순서 meta → content → route. 예제 파일은 부록 그대로(이스케이프 포함). 파일 끝 줄바꿈 하나.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과, 출력 = 2절 표. 참고 링크 전부 200.

### 2. 코드 유닛 데이터·컴포넌트와 테스트

- 대상: `units.ts`, `CodeUnitView.tsx`, `concept.test.ts`, `CodeUnitView.test.tsx`
- 변경: 3절의 `units.ts`·`CodeUnitView.tsx`와 테스트 ①~④. 컴포넌트 스타일은 SimulatorShell 시나리오 라디오와 array-index-length `ArrayView`의 토큰(`bg-highlight`, `border-border`, `bg-surface`, `text-muted`)을 따른다.
- 주의사항: 렌더에 브라우저 전용 값 금지. 짝 없는 서로게이트·결합 부호·ZWJ를 글자 칸에 그대로 그리지 않는다(이름 텍스트). 표에 `<caption>`과 `scope="col"`.
- 완료 조건: `npx vitest run app/concepts/string-utf16` 통과(concept.test ①~④, CodeUnitView: 첫 프리셋 표 4행·`U+1F600`·rowSpan 2, 프리셋 전환 시 표와 요약이 바뀜, 이름 텍스트 표시). 음성 확인(테스트 기대값 하나를 바꾸면 실패) 후 원복. lint·typecheck 통과.

### 3. 본문 작성

- 대상: `content.mdx`
- 변경: 필수 h2. 동작 원리 h3: 1절 주제 ①~⑦ 순서. 예제 7개마다 PredictQuiz, 코드 유닛 보기는 예제 2 뒤 h3 "코드 유닛 보기로 확인하기". 결과와 이유는 예제별 h3. 오해 Callout: "length는 글자 수다", "문자열의 한 글자를 인덱스로 바꿀 수 있다", "보기에 같은 문자열은 ===로 같다", "toUpperCase는 길이를 바꾸지 않는다".
- 주의사항: '찾히다' 금지, 짝 없는 서로게이트는 `\ud83d` 표기, 공백 든 인라인 코드 Prettier 깨짐 확인, 뒷장 내용은 "별도 개념"으로만.
- 완료 조건: `npm test` 통과(개수 고정 테스트 4건은 단계 4 대상), 메인이 결과·원인 문장과 줄 번호를 2절·예제와 대조, `grep -c '찾히'` 0, '저장|글자 수' grep 결과가 오해를 바로잡는 문맥뿐.

### 4. 고정 테스트·e2e·빌드 테스트·문서

- 대상: 4절 수정 목록
- 변경: 4절대로. '객체' 검색은 새 meta의 title·summary·tags에 '객체'가 없으면 그대로.
- 주의사항: 기존 케이스는 값만 바꾸고 새 케이스는 추가만.
- 완료 조건: 6절 정적·테스트와 e2e(새 개념 범위) 통과, 6절 브라우저 시나리오 1~5 확인.

## 9. 추가 개선 후보

- 로드맵 9번 '이터러블과 for...of'에서 문자열 이터레이터가 코드 포인트 단위로 도는 것을 다룰 때 이 페이지와 연결한다.

## 변경 이력

- 2026-11-02 (사용자 요청 — 외부 콘텐츠 검토 1차): [높음] 예제 5의 ZWJ와 [중] 예제 4의 é·결합 부호가 `\u` 이스케이프가 아니라 실제 문자로 소스에 들어 있었음(원인: 작성 도구 입력에서 `\uXXXX` 4자리 표기가 실제 문자로 풀림, `\u{…}`는 남음) → 두 예제를 이스케이프로 다시 쓰고 부록도 고침, 예제 파일에 U+200D·U+0301·U+00E9 실제 문자가 있으면 실패하는 테스트 추가(음성 확인). [낮음] 한글: "완성형 한글 음절"로 좁히고 예제 4에 5번 줄 `'한'.normalize('NFD').length`(→ `1 3`) 추가. [낮음] 대소문자 절의 '글자'를 코드 포인트로, goals의 "대입이 무시"를 sloppy·strict로 나눔. [낮음] 명세 용어(선행·후행 서로게이트)와 '상위 쪽 값이 더 작다' 병기, 정규화 문장을 "어떤 연산도 암묵적으로 정규화하지 않으며 예외는 localeCompare"로, NFC 단순화를 simplifications에, JSON.stringify 이스케이프에 ES2019(10.0 QuoteJSONString에 서로게이트 처리가 처음 있음, 9.0에 없음) — 영향 단계 1·2·3.

## 부록: 예제 초안

`length-units.js`

```js
var smile = '😀';
console.log(smile.length, 'a😀b'.length, '가나'.length);
console.log(smile.charCodeAt(0).toString(16), smile.charCodeAt(1).toString(16));
console.log(smile.codePointAt(0).toString(16), smile.codePointAt(1).toString(16));
console.log(String.fromCodePoint(0x1f600) === smile, '\u{1F600}' === smile);
```

`split-pair.js`

```js
var text = 'a😀b';
console.log(JSON.stringify(text[1]), JSON.stringify(text.charAt(2)));
console.log(JSON.stringify(text.slice(0, 2)), text.indexOf('b'));
console.log(JSON.stringify(text.split('')));
console.log(JSON.stringify(text.split('').reverse().join('')));
```

`immutable.js`

```js
var word = 'cat';
word[0] = 'b';
console.log(word, word[0]);
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(word, 0)));
var upper = word.toUpperCase();
console.log(word, upper);
```

`normalize.js`

```js
var composed = '\u00e9';
var decomposed = 'e\u0301';
console.log(composed.length, decomposed.length, composed === decomposed);
console.log(decomposed.normalize() === composed, composed.normalize('NFD').length);
console.log('한'.length, '한'.normalize('NFD').length);
```

`zwj-emoji.js`

```js
var family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}';
console.log(family.length);
console.log(family.codePointAt(2).toString(16));
console.log(JSON.stringify(family.slice(0, 2)), family.split('\u200D').length);
```

`case-length.js`

```js
var street = 'straße';
var upper = street.toUpperCase();
console.log(street.length, upper, upper.length);
console.log(upper.toLowerCase(), upper.toLowerCase() === street);
```

`well-formed.js`

```js
var smile = '😀';
var half = smile.slice(0, 1);
console.log(smile.isWellFormed(), half.isWellFormed());
console.log(JSON.stringify(half.toWellFormed()), half.toWellFormed().length);
console.log(half.toWellFormed().codePointAt(0).toString(16));
```

## 구현 진행

- baseline (2026-11-02, `f303436`): lint 오류·경고 0 / format:check 통과 / typecheck 오류 0 / `npm test` 93 파일 2906 통과. test:build·e2e는 단계 4에서 실행
- [x] 1. 예제·meta·route — Sonnet 작성. 예제 7개가 부록 초안과 바이트 단위로 같음(cmp), `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과(출력 = 2절 표), 참고 링크 20개(명세 16, MDN ko 4) 200. title·summary·tags에 '객체' 없음. 메인이 goals 3번의 "=== 로"를 "===로"로.
- [x] 2. 코드 유닛 데이터·컴포넌트와 테스트 — Sonnet 작성(`units.ts`, `CodeUnitView.tsx`, `concept.test.ts`, `CodeUnitView.test.tsx`). 계획 외: `CodeUnitView`가 `samples` prop(기본값 units.ts)을 받아 짝 없는 서로게이트 렌더를 테스트, `kindLabels`·`isLoneKind` 추가. 코드 포인트 표기는 `U+` 대문자 4자리 이상. 작성 중 테스트 파일의 `é` 리터럴이 결합형으로 바뀌는 일이 있어 리터럴을 `const literal: string`에 담아 비교(현재 `*.ts*`에 결합 부호 리터럴 없음). `npx vitest run app/concepts/string-utf16` 통과, 음성 확인(손 기대값 U+1F600→U+1F601이면 ① 실패) 후 원복, lint·typecheck 통과.
- [x] 3. 본문 — 메인 작성. 동작 원리 h3 7개(1절 ①~⑦), 퀴즈 7개(answer 1,3,0,2,1,3,0), 코드 유닛 보기는 예제 2 뒤, 결과와 이유 7개, 오해 Callout 4개. 결과·원인 문장과 줄 번호를 2절·예제와 대조. `grep -c '찾히'` 0, '저장'은 "엔진 저장 방식은 명세가 정하지 않는다" 문맥 1곳, '글자 수'는 도입과 오해 Callout 제목뿐. 개념 관련 테스트 620 통과, lint·typecheck 통과.
- [x] 4. 고정 테스트·e2e·빌드 테스트·문서 — Sonnet 작성, 메인이 diff 확인(기존 케이스는 값만, 새 케이스는 추가만). '객체' 검색은 그대로. 검증(2026-11-02, 메인 실행): lint·format:check·typecheck 통과, `npm test` 95 파일 2938 통과, `npm run test:build` 257 통과, `npx playwright test tests/e2e/navigation.spec.ts` 16 통과, `-g "string-utf16|문자열 길이와 UTF-16|코드 유닛 보기|홈 학습 순서 보기"` 18 통과. 빌드 HTML 백틱 잔여 0. 브라우저(빌드 결과를 serve, Playwright chromium 375px·다크): 페이지 scrollWidth 375 = innerWidth, 표 영역 317 = 317(스크롤 불필요), 첫 프리셋 4행·`length 4 · 코드 포인트 3개`, 가족 이모지 8행(쌍은 rowSpan 2, ZWJ 행은 이름 텍스트)·`length 8 · 코드 포인트 5개`, e + 결합 부호 2행, 첫 라디오에서 ArrowLeft로 마지막 프리셋 선택, 하단 '학습 순서 31 / 31'·이전 regexp-lastindex. regexp-lastindex의 '30 / 31'·다음 링크는 navigation e2e가 확인.
- 리뷰 1차(메인 직접): Critical·High 0. 수정 1건(메인): simplifications가 localeCompare·toLocaleUpperCase를 "ECMA-402 영역"이라고 썼으나 두 메서드는 ECMA-262에도 정의되어 있어(결과가 구현 정의, ECMA-402가 대체), "Intl.Segmenter는 ECMA-402, 로캘 의존 메서드는 결과가 로캘·구현에 따라 달라 다루지 않음"으로 나눔 → content-integrity·개념 테스트 통과.
  - 보고만 한 것: Low — 좁은 화면에서 글자 칸의 "ZWJ(폭 없는 결합자)"가 두 줄로 줄바꿈됨(넘침 없음).
- 외부 콘텐츠 검토 1차(사용자 전달, 높음 1·중 1·낮음 3) 반영 — 변경 내용은 변경 이력. 재검증: lint·format:check·typecheck 통과, `npm test` 2939, `npm run test:build` 257, `-g "string-utf16|문자열 길이와 UTF-16|코드 유닛 보기"` 16 통과. 빌드 HTML에서 예제 4·5 코드가 `\u00e9`·`e\u0301`·`\u200D` 이스케이프로 보이는 것을 확인.

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다(예제 7개, 코드 유닛 보기(프리셋 5개, 손계산 기대값 + vm 실행 대조 테스트), 퀴즈 7개, 오해 Callout 4개, 고정 테스트·e2e·빌드 테스트·문서).
- 외부 콘텐츠 검토 1차로 예제 4·5의 보이지 않는 문자를 `\u` 이스케이프로 바로잡고(작성 도구에서 `\uXXXX`가 실제 문자로 풀린 것이 원인), 예제 파일에 그런 문자가 실제로 들어가면 실패하는 테스트를 더했다. 예제 4에 완성형 '한'의 NFD 줄을 추가했다(변경 이력).
- 사용자 최종 승인으로 `reviewedAt`을 2026-11-02로 기록했다.

### 코드 리뷰

- critical-code-review 1차(메인 직접): Critical·High 0. simplifications의 "localeCompare·toLocaleUpperCase는 ECMA-402 영역" 표현 1건을 수정. Low 1건(좁은 화면에서 ZWJ 이름이 두 줄로 줄바꿈)은 보고만 하고 사용자 승인으로 남겼다.

### 후속 작업

- [ ] 리뷰 Low: 코드 유닛 보기의 "ZWJ(폭 없는 결합자)" 줄바꿈을 줄일지 사용자 결정
- [ ] 로드맵 9번 '이터러블과 for...of'에서 문자열 이터레이터의 코드 포인트 순회를 다룰 때 이 페이지와 연결

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [무검토 승인] 코드 유닛 보기의 표 값을 컴포넌트가 `charCodeAt`·`codePointAt`으로 계산하되, 테스트에서 서로게이트 공식으로 손계산한 기대값과 새 vm 컨텍스트의 실행 결과 두 가지로 대조 — 함수 결과를 기대값으로 복사하면 함수가 틀려도 통과하므로, 독립된 기대값과 실제 엔진 결과를 함께 본다.
- [무검토 승인] 불변성 절을 인덱스 대입과 인덱스 프로퍼티 어트리뷰트에 집중 — `length` 쓰기 실패와 `toUpperCase`의 새 문자열은 원시 값의 메서드 페이지가 이미 다뤘다. strict mode TypeError는 `try...catch`(47장) 예제 대신 본문 문장과 근거 테스트로 보인다.
- [무검토 승인] 짝 없는 서로게이트는 `JSON.stringify` 이스케이프나 16진수로만 출력 — 그대로 출력하면 호스트·폰트마다 다르게 보인다.
- [Claude 판단] 예제 파일에 U+200D·U+0301·U+00E9가 실제 문자로 들어 있으면 실패하는 테스트 추가 — 검토에서 드러난 원인(작성 도구가 `\uXXXX`를 실제 문자로 바꿈)이 다시 생겨도 화면의 코드와 본문 설명이 어긋나기 전에 잡는다.
- [무검토 승인] category `fundamentals`, order 290, prerequisites 3개(primitive-methods, primitives-and-objects, property-attributes).
- 추가 주제 4개(결합 문자와 normalize, 이모지 조합, 대소문자 변환과 길이, isWellFormed), for...of는 별도 개념으로 언급만, 프리셋 코드 유닛 보기, slug는 사용자가 골랐다. 이스케이프·완성형 한글·단위 표현·명세 용어·ES2019 연도는 외부 검토에 따라 고쳤다.

#### 배경지식

- 명세의 String 타입은 16비트 값(요소)의 나열이고 `length`는 요소 수. 해석하는 연산은 각 요소를 UTF-16 코드 유닛으로 보며, 선행(0xD800~0xDBFF) 다음에 후행(0xDC00~0xDFFF)이 오면 서로게이트 쌍으로 한 코드 포인트를 이룬다.
- 인덱스·`charAt`·`slice`·`split('')`·`indexOf`는 코드 유닛 단위. `codePointAt`은 쌍의 앞에서 합친 값, 쌍의 뒤·짝 없는 서로게이트에서는 그 값.
- String exotic object의 인덱스 프로퍼티는 writable false·configurable false라 원시 문자열에 인덱스로 대입하면 [[Set]]이 실패한다(sloppy 무시, strict TypeError).
- 명세의 어떤 연산도 암묵적으로 정규화하지 않는다(예외 localeCompare). NFC는 합성, NFD는 분해. 완성형 '한'(U+D55C)은 NFD로 자모 세 개.
- `toUpperCase`는 로캘 비의존 매핑(SpecialCasing 포함)이라 코드 포인트 수가 바뀔 수 있다(ß → SS). `isWellFormed`·`toWellFormed`는 ES2024, JSON.stringify의 짝 없는 서로게이트 이스케이프는 ES2019.

#### 확인 질문

1. `'😀'.length`가 2인데 `'가나'.length`도 2인 이유는? 두 경우 "2"가 세는 것은 각각 무엇인가?
   <details><summary>답</summary>둘 다 코드 유닛 수다. 😀(U+1F600)은 U+FFFF를 넘어 서로게이트 쌍 두 유닛, 완성형 한글 음절은 U+FFFF 이하라 음절마다 한 유닛이다(2절 String 타입, 예제 1).</details>
2. `'a😀b'.split('').reverse().join('')`이 깨진 문자열이 되는 이유는?
   <details><summary>답</summary>split('')이 코드 유닛 단위로 나눠 쌍이 두 조각이 되고, 뒤집으면 후행 서로게이트가 선행보다 앞에 와 쌍을 이루지 못한다(예제 2).</details>
3. [무검토 승인] 코드 유닛 표 테스트가 함수 결과가 아니라 손계산 기대값과 vm 실행 결과 두 가지로 대조하는 이유는?
   <details><summary>답</summary>함수 결과를 기대값으로 복사하면 함수가 틀려도 통과한다. 공식으로 손계산한 값은 독립 기준이고, vm의 charCodeAt·codePointAt은 실제 엔진 동작이라 둘을 함께 본다(3절 테스트 ①②).</details>
4. 예제 4의 `'\u00e9'`와 `'e\u0301'`을 이스케이프로 써야 하는 이유는? 실제 문자로 쓰면 무엇이 깨질 수 있나?
   <details><summary>답</summary>둘은 화면에서 같아 보여 코드만 봐서는 차이를 알 수 없고, 편집기·포매터가 NFC로 정규화하면 두 줄이 정말 같은 문자열이 되어 결과가 `1 1 true`로 바뀐다(변경 이력, concept.test '예제 소스').</details>
5. [Claude 판단] 예제 소스에 특정 문자가 실제로 들어 있으면 실패하는 테스트를 둔 이유와, 그 테스트가 잡지 못하는 경우는?
   <details><summary>답</summary>작성 도구가 `\uXXXX`를 실제 문자로 바꾼 사고가 다시 생기면 즉시 잡기 위해서다. 금지 목록(U+200D·U+0301·U+00E9)에 없는 다른 보이지 않는 문자나 결합 문자는 잡지 못한다(concept.test '예제 소스').</details>
