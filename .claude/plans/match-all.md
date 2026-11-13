# 추가 게시글 'matchAll' 구현 계획

- 상태: 완료
- 작성일: 2026-11-13
- 기준: `main` @ `180a439`

## 0. 요약

- 목적: `String.prototype.matchAll`이 호출할 때 원래 정규식의 패턴·flags로 새 정규식(이 페이지의 호칭 '복제본')을 만들고 `next`마다 매치를 하나씩 찾는 이터레이터를 돌려준다는 점을 설명하는 추가 게시글 `match-all`을 만든다. regexp-lastindex·string-replace-split가 '별도 개념'으로 미뤄 둔 주제다.
- 범위: 새 개념 폴더 1개(예제 7개, 시뮬레이터 2시나리오, 퀴즈 7개 이상), 개념 수·학습 순서 테스트(58→59, 39번째) 갱신, 빌드·e2e 등록, regexp-lastindex·string-replace-split의 '별도 개념' 문구를 링크로. 공통 앱 코드는 바꾸지 않는다.
- 위험: 명세 분기(인수 종류별 경로, 복제 시점·lastIndex 이어받기, `[[Done]]`·`[[Global]]` 갈래, 빈 매치에서 exec와 next가 각각 lastIndex를 바꾸는 방식, sticky)를 넘치게 일반화하는 것과 시뮬레이터 단계가 실행과 어긋나는 것. 명세 원문 대조, 틀린 모델을 배제하는 예제 출력, exec·next 호출 기록 대조 테스트로 막는다.
- 복잡도: 높음 · Consensus: 수행(Architect·Critic 1회 — HIGH 2·MEDIUM 10 반영: 원래 lastIndex 증거 예제, 빈 매치의 exec 이동, `[[Done]]` 갈래, 인수 분기, 복제본 정의, 스프레드 처리, 단계표, 단계 단위 대조 등)
- 미확정: 1건(제목 문구)

## 1. 요구사항

- 새 개념 `match-all`(가제 "matchAll: g 정규식을 넘겼는데 lastIndex는 왜 그대로일까")을 추가한다. 학습 순서는 iterable-for-of(310) 다음, spread-destructuring(320) 앞 → order 315(39번째). category `objects`(regexp-lastindex와 같음).
- 다룰 것(명세 이름은 현재 초안 기준):
  1. 결과는 배열이 아니라 이터레이터(RegExp String Iterator): `Array.isArray` false, `length` 프로퍼티 없음(`'length' in it` false — `JSON.stringify`로 undefined를 null로 찍지 않는다), `Object.prototype.toString`이 `[object RegExp String Iterator]`, `[Symbol.iterator]()`가 자기 자신. 끝까지 꺼낸 뒤 다시 꺼내면 비어 있는 이유는 `[[Done]]`이 true라 next가 exec 없이 끝을 돌려주기 때문(복제본 lastIndex 때문이 아님). 같은 이터레이터를 다시 돌리는 상황 자체는 iterable-for-of의 '이터레이터는 한 번 쓰면 끝' 절에 링크하되, 그 페이지의 근거(배열 이터레이터의 `[[IteratedArrayLike]]`)와 이 이터레이터의 근거(`[[Done]]`)가 다르다는 점을 구분해 쓴다. 꺼내는 방법: `for...of`, 스프레드(spread-destructuring 링크), `Array.from`.
  2. 호출 시점과 복제본: 첫 인수가 g 정규식이면 `String.prototype.matchAll`이 flags에 g가 있는지 검사한 뒤 정규식의 `Symbol.matchAll` 메서드(well-known 심벌, symbol 링크)를 부르고, 그 메서드가 `Construct(speciesCtor, « regexp, flags »)`로 원래 정규식의 패턴과 flags를 가진 **새 정규식**을 만들고 원래 `lastIndex`를 ToLength로 그 새 정규식에 Set한 뒤 이터레이터를 만든다. 이때는 검색하지 않는다. 이 새 정규식을 이 페이지는 '복제본'이라 부르며, 패턴·flags·lastIndex 말고 원래 정규식의 다른 자기 프로퍼티는 옮기지 않는다(단순화에 호칭임을 밝힘). 결과: 검색은 복제본에서만 일어나 원래 정규식의 `lastIndex`는 바뀌지 않고, 호출 뒤 원래 `lastIndex`를 바꿔도 이미 만든 이터레이터에는 영향이 없으며, 호출 전 `lastIndex`가 2면 복제본은 2부터 찾는다.
  3. `next`의 갈래(`%RegExpStringIteratorPrototype%.next`): `[[Done]]`이 true면 exec 없이 `{ value: undefined, done: true }` / 아니면 복제본에 RegExpExec를 한 번 → null이면 `[[Done]]` true와 끝 결과 / `[[Global]]`이 false면 `[[Done]]` true로 하고 그 매치 하나를 value로 / 매치면 value로(빈 매치면 아래 5). 지연 실행은 `RegExp.prototype.exec`를 잠시 기록용 함수로 감싸 보인다(RegExpExec가 `exec` 프로퍼티를 찾아 부르기 때문, 사용자 결정 2026-11-13).
  4. 결과 값: 매치마다 exec 결과와 같은 배열(`[0]`, 캡처들, `index`, `input`, `groups`). `match`에 g를 주면 매치한 문자열만 모은 배열이라 `index`가 없다(regexp-lastindex 링크)와 대비.
  5. 빈 매치: g 정규식의 exec는 성공하면 lastIndex를 매치 끝으로 두는데, 빈 매치는 끝이 시작 위치와 같다. 그래서 lastIndex는 매치 시작 위치가 된다(검색을 시작한 위치보다 뒤에서 매치하면 exec가 lastIndex를 앞으로 옮김, 시작 위치에서 매치하면 제자리). 그 자리에서 다음 검색이 같은 빈 매치를 다시 찾지 않도록 next가 AdvanceStringIndex로 lastIndex를 한 칸 더 옮긴다. `u`·`v` 플래그면 한 칸이 코드 포인트(`'\u{1F600}'`에 `/(?:)/gu` → index 0, 2 / `/(?:)/g` → 0, 1, 2). string-utf16 링크.
  6. 첫 인수의 종류(이 페이지가 다루는 범위를 본문에 한정해 씀): g가 없는 정규식(y만 있어도)은 호출만으로 TypeError. 문자열 인수는 RegExpCreate로 그 문자열을 패턴으로 한 g 정규식이 됨(`'a1b2'.matchAll('[0-9]')` → index 1, 3 — 문자열 `[0-9]`를 글자 그대로 찾지 않음, string-replace-split의 matchAll 문단에 링크), 인수 생략은 빈 패턴이라 모든 위치에서 빈 매치. gy는 sticky라 이어지지 않는 위치에서 멈춤(`'aXa'.matchAll(/a/gy)` → index 0만). 그 밖의 경로(Symbol.matchAll 메서드를 가진 객체는 정규식이 아니어도 그 메서드에 맡김, null은 패턴 "null", 일반 객체는 ToString, Symbol.match를 false로 바꾼 정규식은 g 검사를 건너뜀)는 단순화에만 쓴다.
  7. `break`: 이 이터레이터에는 `return` 메서드가 없어(`%RegExpStringIteratorPrototype%`에도 `%Iterator.prototype%`에도 없음) `for...of`를 `break`로 끝내도 IteratorClose가 할 일이 없고, 같은 이터레이터에서 남은 매치를 이어서 꺼낼 수 있다(iterable-for-of의 IteratorClose 설명 링크 — 그 페이지의 직접 만든 이터러블은 return이 있었다).
  8. `Symbol.matchAll`을 직접 부르면 String.prototype.matchAll의 g 검사를 거치지 않아, g가 없는 정규식이면 `[[Global]]`이 false라 매치 하나를 내고 끝난다. 본문 한 문장 + 근거 테스트('g 검사를 거치지 않는 경로' 중 하나로 쓰고 '이 경우에만'이라고 쓰지 않음).
- 시각화(사용자 결정): 시뮬레이터 + 퀴즈. 시뮬레이터 영역 `label`은 `matchAll 시뮬레이터`.
  - 상태(단계마다 전체 스냅샷): `regexes`(원래 정규식 카드 `re` — 리터럴·lastIndex·changed / 복제본 카드 — '코드에 이름이 없음' 표시·리터럴·lastIndex·changed, matchAll 단계부터), `iterator`(슬롯 `[[Done]]`·`[[Global]]`·`[[Unicode]]`, matchAll 단계부터), `input`(검색 문자열, matchAll 단계부터)과 이번 단계의 매치 범위, `calls`(이번 단계의 호출만: `get-iterator`(자기 자신 반환) / `next`(갈래) / `exec`(호출 전 lastIndex·매치 범위 또는 null·호출 후 lastIndex) / `advance`(next가 옮긴 from→to)), `results`(지금까지 받은 매치의 문자열·index).
  - 시나리오 1 '다음 매치를 하나씩'(`next-one-by-one.js`, 11단계):

    ```js
    var re = /[0-9]+/g;
    var it = 'a1b22'.matchAll(re);
    var r1 = it.next();
    console.log(r1.value[0], r1.value.index, r1.done, re.lastIndex);
    var r2 = it.next();
    console.log(r2.value[0], r2.value.index, r2.done);
    var r3 = it.next();
    console.log(r3.value, r3.done);
    var r4 = it.next();
    console.log(r4.done, re.lastIndex);
    ```

    출력 `1 1 false 0` / `22 3 false` / `undefined true` / `true 0`(4번 줄의 `re.lastIndex` 0은 '원래 re로 검색한다'는 틀린 모델이면 2가 되어 구별됨). 단계: 0 실행 전 / 1(1행) re 카드 lastIndex 0 / 2(2행) g 검사 통과 → Symbol.matchAll → 복제본(lastIndex 0) → 이터레이터(Done false, Global true, Unicode false), exec 없음 / 3(3행) next: exec 0→[1,2)→2 / 4(4행) 출력 / 5(5행) next: exec 2→[3,5)→5 / 6(6행) 출력 / 7(7행) next: exec 5→null→0, Done true / 8(8행) 출력 / 9(9행) next: Done이 true라 exec 없음 / 10(10행) 출력.
  - 시나리오 2 'lastIndex 이어받기와 빈 매치'(`inherit-empty.js`, 12단계):

    ```js
    var re = /(?=[0-9])/g;
    re.lastIndex = 2;
    var it = 'a1b2c3'.matchAll(re);
    re.lastIndex = 0;
    for (var m of it) {
      console.log(JSON.stringify(m[0]), m.index);
    }
    console.log(re.lastIndex);
    ```

    출력 `"" 3` / `"" 5` / `0`(복제본이 이어받지 않았거나 4행 대입이 이터레이터에 영향을 줬다면 `"" 1`이 먼저 나와 구별됨). `(?=[0-9])`는 '바로 뒤에 숫자가 오는 위치'에 빈 문자열로 매치한다고 본문에 한 줄로 설명(패턴 문법은 단순화). 단계: 0 실행 전 / 1(1행) re lastIndex 0 / 2(2행) re lastIndex 2 / 3(3행) 복제본 lastIndex 2, 이터레이터 / 4(4행) re lastIndex 0, 복제본은 2 그대로 / 5(5행) get-iterator: 자기 자신 / 6(5행) next: exec 2→[3,3)→3(exec가 빈 매치 시작 위치로 옮김), advance 3→4 / 7(6행) 출력 / 8(5행) next: exec 4→[5,5)→5, advance 5→6 / 9(6행) 출력 / 10(5행) next: exec 6→null→0, Done true, 반복 끝 / 11(8행) 출력.
- 예제 7개(출력 주장, `runtime: 'ecmascript'`):
  1. `next-one-by-one.js`(시나리오 1)
  2. `iterator-not-array.js` — 다룰 것 1: `Array.isArray(it)`, `'length' in it`, `Object.prototype.toString.call(it)`, `it[Symbol.iterator]() === it`, 스프레드 두 번의 길이(2, 0)
  3. `lazy-exec.js` — 다룰 것 3: `RegExp.prototype.exec`를 감싸 호출마다 `this === re`와 `this.lastIndex`를 기록, matchAll 호출 직후 기록이 비어 있음, next 네 번(세 번째에서 끝, 네 번째는 기록이 늘지 않음), 끝에서 원래 exec 복원
  4. `match-results.js` — 다룰 것 4: 이름 있는 그룹이 있는 g 정규식으로 결과 배열의 `[0]`·캡처·`index`·`groups` 값과 `match`(g) 결과 비교
  5. `inherit-empty.js`(시나리오 2)
  6. `flags-and-args.js` — 다룰 것 6: TypeError(`/a/`, `/a/y`, `try…catch`로 `e.name`), 문자열 인수 `'[0-9]'`, 인수 생략, gy, `u` 플래그 빈 매치(`\u{1F600}` 표기, 4자리 `\uXXXX` 금지)
  7. `break-resume.js` — 다룰 것 7: `for...of`에서 첫 매치 뒤 `break`, 같은 이터레이터를 스프레드하면 남은 매치, `typeof it.return`
- 연결: regexp-lastindex 본문 '`matchAll`(ES2020, 별도 개념)'(content.mdx 56행)·'(이터레이터를 쓰는 별도 개념)'(263행)을 링크로, meta 단순화(94행)의 matchAll 문장을 개념 이름으로, related에 slug. string-replace-split 본문 50행 '`matchAll` 자체는 별도 개념입니다.'를 링크로, meta 단순화(82행)를 개념 이름으로, related에 slug. 두 페이지의 `reviewedAt`은 유지(연결 문구만).
- 유지: 공통 앱 코드, 다른 개념 예제·`reviewedAt`.
- 제외: 정규식 패턴 문법, SpeciesConstructor·RegExp 하위 클래스, IsRegExp의 Symbol.match 확인, flags getter, 이터레이터 헬퍼, async 이터레이션, `match`·`search`의 심벌 위임.

## 2. 사실과 추정

### 사실 (명세·실행·코드에서 확인)

- 명세(현재 초안 사본: 스크래치패드 `spec.html`, id는 현재 판 기준):
  - `String.prototype.matchAll ( regexpOrPattern )`(`#sec-string.prototype.matchall`): RequireObjectCoercible(this) → regexpOrPattern이 Object면: IsRegExp가 true일 때만 `Get(flags)`·RequireObjectCoercible·ToString(flags)에 "g"가 없으면 TypeError, 그다음 IsRegExp와 상관없이 `GetMethod(regexpOrPattern, %Symbol.matchAll%)`가 있으면 Call하고 그 결과를 반환 → 아니면 `string = ToString(this)`, `regexp = RegExpCreate(regexpOrPattern, "g")`, `Invoke(regexp, %Symbol.matchAll%, « string »)`.
  - `RegExp.prototype [ %Symbol.matchAll% ] ( string )`(`#sec-regexp-prototype-%symbol.matchall%`, 옛 id `sec-regexp-prototype-matchall`): speciesCtor, `flags = ToString(Get(regexp,"flags"))`, `matcher = Construct(speciesCtor, « regexp, flags »)`, `lastIndex = ToLength(Get(regexp,"lastIndex"))`, `Set(matcher,"lastIndex",lastIndex,true)`, global = flags에 g, fullUnicode = u 또는 v, `CreateRegExpStringIterator(matcher, string, global, fullUnicode)`.
  - `CreateRegExpStringIterator`(`#sec-createregexpstringiterator`): `%RegExpStringIteratorPrototype%`로 객체를 만들고 슬롯 `[[IteratingRegExp]]`·`[[IteratedString]]`·`[[Global]]`·`[[Unicode]]`·`[[Done]]`(false)만 채운다(검색 없음).
  - `%RegExpStringIteratorPrototype%.next`(`#sec-%regexpstringiteratorprototype%.next`): Done이면 `{undefined, true}` → `match = RegExpExec(regexp, string)` → null이면 Done true, `{undefined, true}` → global이 false면 Done true, `{match, false}` → 매치 문자열이 빈 문자열이면 `thisIndex = ToLength(Get(regexp,"lastIndex"))`, `Set(regexp, "lastIndex", AdvanceStringIndex(string, thisIndex, fullUnicode))` → `{match, false}`.
  - `%RegExpStringIteratorPrototype%`의 [[Prototype]]은 `%Iterator.prototype%`(`#sec-%regexpstringiteratorprototype%-object`), `%Symbol.toStringTag%`는 "RegExp String Iterator". `return` 메서드는 정의되어 있지 않다.
  - ES2020판(`spec2020.html`)에도 g 검사 TypeError가 있다(조건 표기는 "undefined/null이 아니면", v 플래그 없음). 페이지는 현재 판 기준으로 쓰고 판 비교는 하지 않는다.
- 실행(Node v24.22.3 `vm`, 2026-11-13, Critic이 전부 재현):
  - `[Array.isArray(it), typeof it.next, it.length, toString, it[Symbol.iterator]()===it]` → `[false,"function",undefined,"[object RegExp String Iterator]",true]`; 두 번 스프레드 → `[2,0]`
  - 결과: `'a1b22'.matchAll(/[0-9]+/g)` → `["1",1,"a1b22",배열,groups undefined]`, `["22",3,...]`; `'a1b22'.match(/[0-9]+/g)` → `["1","22"]`
  - `re=/[0-9]/g; re.lastIndex=3; [...'1a2b3'.matchAll(re)]` → index `[4]`, 이후 `re.lastIndex` 3 / 호출 뒤 원래 lastIndex 변경 `re.lastIndex=2` → index `[0,2]`(영향 없음) / 첫 next 직후 `re.lastIndex` 0(복제본은 2)
  - exec·next 기록(시나리오 1): `next-start, exec(this≠re, 0→index 1→2), next-end` / `exec(2→3→5)` / `exec(5→null→0), done` / 네 번째 next는 exec 없이 done
  - exec·next 기록(시나리오 2): `exec(this≠re, 2→index 3→3)`, `exec(4→5→5)`, `exec(6→null→0)`; 출력 `"" 3`·`"" 5`·`0`. 빈 매치에서 exec가 lastIndex를 옮기는 반례: `'aab'.matchAll(/(?=b)/g)` exec 0→index 2→2
  - `'a1'`에서 next 네 번 → exec 두 번(`[[Done]]` 갈래)
  - 빈 매치: `'abc'.matchAll(/x*/g)` → index 0~3의 빈 매치 네 개; `'\u{1F600}'.matchAll(/(?:)/g)` → `[0,1,2]`, `/(?:)/gu` → `[0,2]`
  - `'a1b2'.matchAll('[0-9]')` → `["1",1],["2",3]`; `'ab'.matchAll()` → index `0,1,2`의 빈 매치
  - `'aa'.matchAll(/a/)`·`'aa'.matchAll(/a/y)` → TypeError; `'aXa'.matchAll(/a/gy)` → `[0]`
  - `/a/[Symbol.matchAll]('aa')` → index `[0]`; `r=/a/; r[Symbol.match]=false` → `[...'aa'.matchAll(r)]` index `[0]`; `'nullnull'.matchAll(null)` → `[0,4]`; `{[Symbol.matchAll](){return ['custom']}}` → `["custom"]`; `re.foo=1`은 복제본에서 undefined
  - `break` 뒤 같은 이터레이터 스프레드 → `["2"]`(`'x1y2'`), `typeof it.return` → `"undefined"`, `%Iterator.prototype%`에도 `return` 없음
  - 감싸기 함수 안에서 스크립트 최상위 `var re`(전역 프로퍼티)에 닿아 `this === re`를 판정할 수 있다(위 기록).
- 기존 페이지:
  - regexp-lastindex `content.mdx:56`(`matchAll`(ES2020, 별도 개념)), `:263`(matchAll의 복제·lastIndex·빈 매치·TypeError 한 문단, '(이터레이터를 쓰는 별도 개념)'), `meta.ts:94`(단순화), `concept.test.ts`의 `runWithTrace`(`:25-55`)와 단계 검사(`:177-256`, 검색 줄이 아닌 단계는 calls가 빔).
  - string-replace-split `content.mdx:48-50`(matchAll 한 문단, `'a.b'.matchAll('.')` 예), `:359`(Callout), `meta.ts:82`(단순화), `meta.ts:18`(태그), `meta.ts:33`(related).
  - iterable-for-of: '이터레이터는 한 번 쓰면 끝'(`content.mdx:44-48`, 내장 이터레이터로 한정·근거는 배열 이터레이터의 `[[IteratedArrayLike]]`), `break`와 IteratorClose(`:42`), 스프레드는 링크와 단순화로 처리(`meta.ts:109`, `content.mdx:66`), 단계 수 고정 테스트(`concept.test.ts:206`), 호출은 결과가 정해지는 줄의 단계에만(`:254`).
  - symbol: well-known 심벌 절(`content.mdx:63-69`).
- 학습 순서(order 정렬): 36 string-replace-split(295), 37 symbol(300), 38 iterable-for-of(310), 39 spread-destructuring(320), 40 set-map(330). 새 개념 315 → 39번째, 기존 39번째 이후 +1, 총 59.
- 개념 수 58을 고정한 곳: `app/lib/concepts.test.ts:104,111,112`, `ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts`(`toHaveCount(58)` 78·140행, '58번째' 84행, `학습 순서 N / 58` 166~652행 — 39 이상은 N+1, 1~38은 N 유지), `tests/e2e/responsive.spec.ts:1479`.
- navigation pager: iterable-for-of 블록(`:369-381`)의 다음 href → 새 slug, spread-destructuring 블록(`:383-395`)의 이전 href → 새 slug, 새 블록(39 / 59, 이전 iterable-for-of, 다음 spread-destructuring) 추가. build-output의 pager 검사(`:1440-1455`)는 순서에서 동적으로 계산.
- '객체' 검색(`navigation.spec.ts:90-115`): 개수 17, 순위 배열의 39 이상(39·40·49·54)은 +1. 검색은 title·summary·tags(`app/lib/concepts.ts:91-99`) — 새 개념은 세 곳에 '객체'를 쓰지 않는다.
- e2e 등록 본보기: `tests/e2e/helpers.ts:55-56`, `a11y.spec.ts:733-775`(페이지 axe + 시뮬레이터 진행 axe, 단계 20 이하 전제 `:745-753`), `responsive.spec.ts:896-925`, `build-output.test.ts:904-923`, `docs/content-guide.md:225`.

### 추정

- 없음

## 3. 구현 전략

- regexp-lastindex의 시뮬레이터 구조(정규식 카드 + 검색 호출 기록)를 본뜨고, iterable-for-of처럼 이터레이터 내부 슬롯을 필드로 보인다. 상태 모양은 이 개념 전용(공통 부품만 공유).
- 시뮬레이터 대조(concept.test): regexp-lastindex의 `runWithTrace`를 본떠 새 컨텍스트에서 `RegExp.prototype.exec`와 `%RegExpStringIteratorPrototype%.next`(`Object.getPrototypeOf(''.matchAll(/a/g))`)를 함께 감싼다. 기록: `next-start` / `exec`(this가 원래 `re`인지 — 최상위 `var re`를 전역에서 참조, 호출 전후 lastIndex, 매치 index와 끝, 그 시점의 `re.lastIndex`) / `next-end`(done, 마지막 exec의 this였던 복제본의 lastIndex). 검사: (1) 시나리오의 next 호출 순서·갈래와 각 next 안의 exec(before·match·after)가 기록과 같음 (2) advance 호출의 to = 그 next의 `next-end` 시점 복제본 lastIndex (3) exec의 this는 항상 원래 `re`가 아님 (4) 호출이 있는 단계의 줄은 `.next(` 또는 `for (`를 포함하고 그 밖의 단계(matchAll 줄 포함)는 calls가 빔(matchAll 줄은 exec 0개) (5) 첫 exec의 before = matchAll 단계에 표시한 복제본 lastIndex, 각 exec 시점의 `re.lastIndex` = 그 단계 re 카드 값 (6) 단계 수 고정(11, 12)과 20 이하. 출력은 `assertScenarioInvariants`.
- 지연 실행 예제(`lazy-exec.js`)는 감싸기를 예제 코드 안에서 직접 하고 끝에서 되돌린다(사용자 결정). 시뮬레이터 예제 두 개에는 감싸기 코드를 넣지 않는다.
- 각 예제는 틀린 모델을 배제하는 값을 출력한다(시나리오 1의 첫 next 직후 `re.lastIndex` 0, 시나리오 2의 `"" 3` 시작, lazy-exec의 `this === re` false와 네 번째 next에서 기록이 늘지 않음).
- 본문은 명세 이름으로 근거를 대고 분기를 빼지 않는다. '복제본'은 첫 등장에서 "원래 정규식의 패턴과 flags로 만든 새 정규식(이 페이지는 복제본이라 부름)"으로 정의한다(content-guide의 비유 금지 규칙).
- 스프레드는 iterable-for-of와 같은 방식: 본문 링크 [스프레드와 디스트럭처링], 단순화 항목, related에 spread-destructuring.
- 버린 대안: 결과 표 + 퀴즈(사용자가 시뮬레이터 선택), RegExp 하위 클래스로 지연 관찰(사용자가 exec 감싸기 선택), order를 spread-destructuring 뒤로(순위 이동이 더 커지고 iterable-for-of가 이미 스프레드를 링크로 처리한 선례가 있음), 시나리오 2를 `/x*/g`로(빈 매치에서 exec가 lastIndex를 옮기는 경우를 못 보여 틀린 모델을 강화).

## 4. 변경 파일

- 추가 `app/concepts/match-all/`: `meta.ts`, `content.mdx`, `route.tsx`, `examples/*.js`(7개), `scenarios.ts`, `MatchAllView.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `MatchAllView.test.tsx`, `concept.test.ts`
- 수정(개념 수 58→59·위치): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/responsive.spec.ts`
- 수정(e2e·빌드 등록): `tests/e2e/helpers.ts`(`MATCH_ALL_PATH`, `MATCH_ALL_SIMULATOR_NAME = 'matchAll 시뮬레이터'`), `tests/e2e/a11y.spec.ts`(테스트 이름 '개념 페이지: matchAll', '개념 페이지: matchAll 시뮬레이터를 진행한 뒤'), `tests/e2e/responsive.spec.ts`(가로 스크롤·시뮬레이터), `tests/build/build-output.test.ts`(시뮬레이터 프리렌더 블록), `docs/content-guide.md`(목록)
- 수정(연결): `app/concepts/regexp-lastindex/content.mdx`·`meta.ts`, `app/concepts/string-replace-split/content.mdx`·`meta.ts`
- 변경하지 않음: 공통 앱 코드, iterable-for-of·symbol·spread-destructuring 본문.

## 5. 위험 요소

- '복제본은 lastIndex 0부터' → 원래 lastIndex를 ToLength로 옮김(시나리오 2·근거 테스트).
- '원래 lastIndex는 그대로'를 증거 없이 주장 → 시나리오 1 4행·시나리오 2 시작 index·lazy-exec의 `this === re`.
- 'g가 없으면 항상 TypeError'·'정규식이 아니면 g 정규식이 된다' → IsRegExp일 때만 g 검사, Symbol.matchAll 메서드가 있으면 위임, 페이지 본문은 g 정규식·문자열·생략만 다루고 나머지는 단순화.
- '`[[Global]]` false는 Symbol.matchAll 직접 호출에서만' → 'g 검사를 거치지 않는 경로' 중 하나로.
- '빈 매치에서 exec는 lastIndex를 그대로 둔다' → exec는 매치 끝(빈 매치면 시작 위치)으로 두고 next가 한 칸 더 옮김(시나리오 2가 exec 2→3을 보임).
- '다시 꺼내면 비는 이유는 lastIndex' → `[[Done]]`.
- '모든 매치를 찾는다' → gy는 이어지지 않으면 멈춤.
- '결과는 배열이라 map을 쓸 수 있다/없다' 단정 → 배열이 아님만 쓰고, 이터레이터 헬퍼는 단순화에 사실만(판 표기는 ES2025로 확인 후).
- 'break하면 닫힌다' → return이 없어 닫히지 않음.
- '복제'를 원인 비유로 씀 → 첫 등장 정의 + 단순화에 호칭임을 밝힘, 다른 자기 프로퍼티는 옮기지 않음(근거 테스트).
- 시뮬레이터 단계와 실행 불일치 → 3절 대조 (1)~(6).
- `JSON.stringify`가 undefined를 null로 찍어 오해 → `'length' in it`처럼 불리언으로.
- `\uXXXX` 4자리 표기 사고 → `\u{1F600}`만 쓰고 파일 바이트 확인.
- 위치 이동(39 이상 +1)·pager href·'객체' 순위 갱신 누락 → 작업 순서 5 완료 조건.
- MDX 함정: PredictQuiz 문자열에 작은따옴표 금지, 첫 문단에 `**` 금지, `{`·`<`가 든 텍스트는 인라인 코드 안에(`(?=[0-9])`·`[[Done]]`도 인라인 코드).

## 6. 검증 방법

- `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e(공통 앱 코드 변경 없음): `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "match-all|matchAll|홈 학습 순서 보기|string-replace-split|문자열 replace|regexp-lastindex|개념 페이지: 정규 표현식"`(구현 때 실제 테스트 이름과 대조해 패턴을 확정하고 계획에 기록).
- 브라우저(dev 재시작 후): 두 시나리오를 끝까지 진행하며 복제본 lastIndex·advance 표시·결과 목록이 단계 설명과 맞는지, 375px·다크에서 가로 넘침 없음, 퀴즈, 콘솔 오류 0, 연결된 두 페이지의 링크가 새 페이지로 감.

## 7. 미확정 사항

- [미확정] 제목 문구(가제 "matchAll: g 정규식을 넘겼는데 lastIndex는 왜 그대로일까"). 구조와 무관.

## 8. 작업 순서

### 1. 예제와 meta

- 대상: `meta.ts`, `examples/*.js`
- 변경: 1절 예제 7개(시나리오 두 개는 1절 코드 그대로). 출력은 원시 값·불리언·`JSON.stringify`만, TypeError는 `try…catch`로 `e.name`. expectedOutput은 실제 출력으로(2절 값과 다르면 멈추고 보고).
- meta: summary 160자 이하·'객체' 미포함, tags에 '객체' 미포함, prerequisites regexp-lastindex·iterable-for-of, related = 본문 링크 slug(regexp-lastindex·iterable-for-of·string-replace-split·string-utf16·symbol·spread-destructuring) + 단순화가 이름으로 가리키는 개념(error-handling·json), `reviewedAt: null`. simplifications: 패턴 문법(`(?=…)` 포함) 생략, '복제본'은 이 페이지의 호칭(Construct로 만든 새 정규식, lastIndex만 따로 옮김), SpeciesConstructor·하위 클래스, 첫 인수의 그 밖의 경로(Symbol.matchAll 메서드를 가진 객체, null, 일반 객체, Symbol.match false), 이터레이터 헬퍼는 `%Iterator.prototype%` 상속으로 쓸 수 있다는 사실만, exec 감싸기는 관찰용, 스프레드는 스프레드와 디스트럭처링 개념, try…catch는 try/catch/finally 개념, JSON.stringify는 출력 확인용(JSON 개념), console은 호스트 API, matchAll은 ES2020·이름 있는 그룹은 ES2018·v 플래그는 ES2024에 추가. references: 명세(String.prototype.matchAll, RegExp.prototype[%Symbol.matchAll%], CreateRegExpStringIterator, %RegExpStringIteratorPrototype%.next — 현재 id, `%`는 URL에서 `%25`) + MDN matchAll.
- 완료 조건: `npx vitest run tests/examples.test.ts -t match-all` 7개 통과, typecheck 통과, 예제 파일에 4자리 `\u` 이스케이프 0건(`grep -nP '\\\\u[0-9A-Fa-f]{4}'`).

### 2. 시뮬레이터

- 대상: `scenarios.ts`, `MatchAllView.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `MatchAllView.test.tsx`
- 변경: 1절 상태 모델과 단계표(시나리오 1 11단계, 시나리오 2 12단계)를 그대로. 예제는 `?raw`. 0단계 '실행 전'은 JS 없이도 보이는 상태. 375px에서 카드·슬롯·호출 기록이 세로로 쌓여 가로로 넘치지 않게(regexp-lastindex·iterable-for-of 레이아웃 참고).
- 완료 조건: `assertScenarioInvariants` 통과, Simulator·View 컴포넌트 테스트 통과(첫 단계·줄 강조·시나리오 전환·복제본 표시·advance 표시).

### 3. 시나리오 대조 테스트

- 대상: `concept.test.ts`
- 변경: 3절의 감싸기 기록과 검사 (1)~(6). 본문 서술의 근거(예제에 없는 주장): Symbol.matchAll 직접 호출의 매치 하나, `return` 없음(`%Iterator.prototype%` 포함), `%Iterator.prototype%` 상속, 원래 lastIndex 3 이어받기와 끝난 뒤에도 3, 복제본에 다른 자기 프로퍼티가 없음, 빈 매치에서 exec가 lastIndex를 옮기는 `(?=b)` 반례, 단순화의 그 밖의 인수 경로 4개.
- 완료 조건: `npx vitest run app/concepts/match-all` 통과, 시나리오의 exec before 하나와 advance to 하나를 각각 일부러 바꾸면 실패(되돌림).

### 4. content.mdx와 route.tsx

- 도입(첫 문단 `**` 금지): `re.lastIndex`가 그대로인 질문.
- `## 동작 원리`: 1절 다룰 것 1~8 순서(복제본 정의를 처음에).
- `## 예제`: 예제 1~7, 퀴즈 7개 이상(시나리오 1 뒤에 시뮬레이터), 퀴즈는 예제 출력만 묻는다.
- `## 결과와 이유`: 예제별 줄 번호 설명, 흔한 오해 Callout 3개(결과는 배열이다 / 원래 정규식의 lastIndex가 바뀐다 / break하면 이터레이터가 닫힌다).
- 완료 조건: content-integrity 통과, 본문 링크 slug가 모두 related에 있음(`grep -o '](/concepts/[a-z-]*)' content.mdx | sort -u`와 related 대조), 명세 서술을 2절 원문과 대조한 기록.

### 5. 연결 문구·개념 수·e2e·빌드 등록

- regexp-lastindex·string-replace-split 연결(1절), 개념 수 58→59, navigation `N / 58`(39 이상 N+1), '59번째', pager 두 href + 새 블록, '객체' 순위 배열 39 이상 +1(개수 17), helpers 상수 2개, a11y 2개, responsive 2개, build-output 시뮬레이터 프리렌더 블록(단계 1 텍스트, region label, 시나리오 라디오 2개, 퀴즈 `<details>` 수), content-guide 목록.
- 완료 조건: `grep -rn "58" app/lib/concepts.test.ts app/components/concept/ConceptPager.test.tsx tests/e2e/navigation.spec.ts tests/e2e/responsive.spec.ts`에 개념 수·위치 의미의 58이 남지 않음, 순위 배열이 `filterConcepts(listConcepts(), '객체')` 계산과 같음, 두 연결 페이지의 `reviewedAt` 변경 0.

### 6. 전체 검증

- 6절 명령과 브라우저 확인.

## 9. 추가 개선 후보

- regexp-lastindex `content.mdx:55` 근처의 "빈 문자열에 매치하면 … lastIndex가 원래 값 그대로" 문장은 `/x*/` 맥락에서는 맞지만 일반 문장으로 읽히면 '빈 매치에서 exec는 lastIndex를 그대로 둔다'는 같은 일반화가 될 수 있다(Critic 지적). 이번 범위 밖 — 사용자 확인 후 별도 처리.

## 변경 이력

- 2026-11-13 (사용자 콘텐츠 검토): 낮음 5·선택 2 반영 — ① 단순화 'Symbol.match를 거짓 같은 값으로'는 undefined에서 틀림(IsRegExp가 [[RegExpMatcher]] 확인으로 넘어가 true, 실행: undefined → TypeError, false·null·0·"" → 통과) → 'undefined가 아닌 거짓 같은 값' ② 빈 매치 절 '더 뒤에서 매치하면 … 앞으로 옮깁니다'의 방향 혼동 → '그 매치 위치까지 늘립니다' ③ 예제 6 설명·퀴즈 해설에서 글자 자리를 '위치'로 쓴 곳 → '칸'(lastIndex·경계는 '위치' 유지) ④ 예제 7 설명의 인덱스 2와 문자 2 구분 ⑤ 시뮬레이터 advance 호출 문구의 조사(`${to}로` 고정 → 받침에 따라 으로/로, '6으로') ⑥ 선택: 문자열 인수 절에 정규식 특수 문자 함정(`'1.5'.matchAll('.')` → 세 글자, `'a(b'.matchAll('(')` → SyntaxError)과 ES2025 `RegExp.escape`(ES2025판에 있고 ES2024판에 없음 확인) ⑦ 선택: break 절에 제너레이터 객체는 return이 있어 break 뒤 남은 값이 없다는 대비(generator 페이지 80행이 다룸, related 추가). 근거 테스트 추가 — 영향 단계 2·3·4
- 2026-11-13 (사용자 추가 검토): 낮음 1 반영 — 문자열 인수 문단의 '점은 아무 글자 하나에 매치'는 줄 끝 문자에서 틀림(`'a\nb'.matchAll('.')` → index 0, 2, U+2028도 제외, 문자열 인수는 flags가 g뿐이라 s 플래그 없음) → string-replace-split과 같은 표현 '줄 끝 문자를 제외한 아무 글자 하나', 근거 assertion 추가. 수정 중 주석의 4자리 유니코드 이스케이프가 실제 U+2028 문자로 풀려 문법 오류가 난 것을 이스케이프 없는 문장으로 고침(폴더에 U+2028·U+2029 0건 확인) — 영향 단계 3·4

## 구현 진행

- baseline (2026-11-13, `180a439`): 같은 커밋에서 이번 세션에 실행 — lint·format:check·typecheck 통과, `npm test` 158파일 4969 통과, `test:build` 466 통과, 이후 소스 변경 없음(계획 문서만)
- 분배: 1~4단계(새 개념 폴더)와 5단계(연결·고정값·등록)를 Sonnet 서브에이전트 둘에 병렬 위임(파일 겹침 없음)
- [x] 1·2·3·4. 새 개념 폴더(Sonnet) — 예제 7개 실제 출력이 2절 값과 일치, 시나리오 11·12단계, 퀴즈 7개, Callout 3개, 본문 링크 slug 6개 ⊂ related(+ error-handling·json은 단순화). 메인 확인: `exec before`(execHit 2→1)·`advance to`(3,4→3,5)를 바꾸면 대조 테스트 실패, 원복 후 41 통과. 메인 수정: 본문 '`g` 플래그가 있는 정규식을 넘기면 … 없으면 TypeError'의 모순을 '정규식을 넘기면'으로, regexp-lastindex 빈 매치 인용을 원문(`exec`를 다시 불러도 같은 자리)에 맞춤, 단순화의 인수 경로 문장 구조·well-known 심벌 범위 표현
- [x] 5. 연결·개념 수·e2e·빌드 등록(Sonnet) — diff 확인: 연결 문구는 '별도 개념' 표기만 바뀜, 두 페이지 `reviewedAt` 그대로, 58→59, pager·'객체' 순위(38,40,41,50,55)
- [x] 6. 전체 검증 — lint·format:check·typecheck 통과 / `npm test` 161파일 5030 통과 / `test:build` 474 통과(빌드 HTML `<details>` 7개) / navigation.spec 16 통과 / `-g "match-all|matchAll|홈 학습 순서 보기|string-replace-split|문자열 replace|regexp-lastindex|개념 페이지: 정규 표현식"` 26 통과 / 브라우저(dev 5174, 375px·다크): 두 시나리오 끝까지 진행, 콘솔 출력이 예제와 같음, 빈 매치 단계에 exec(2→3)와 advance(3→4) 표시, 가로 스크롤 없음, 콘솔 오류 0, regexp-lastindex의 matchAll 링크 2개가 새 페이지로
- 리뷰 1차(메인 + Opus 명세 정확성 리뷰): Opus 판정 High 0·Medium 4·Low 10 → 프로젝트 기준(명세와 다른 설명은 결과가 맞아도 높은 심각도)으로 메인이 High 9건으로 재판정해 수정, Low 3건 남김
  - 수정: ① 끝난 이터레이터가 빈 근거를 예제 2만으로 든 문장(틀린 모델과 구별 안 됨)과 반사실 문장 → 관찰 가능한 사실 + 예제 3의 18~19번 줄, 흔한 오해 1에 예제 3 ② '직접 만든 이터러블은 return을 가짐'(2곳) → '이터러블의 이터레이터' ③ 시나리오 1 단계 7 '문자열 끝이라 매치가 없다'(lastIndex = length면 매처를 실행함, `'ab'.matchAll(/$/g)` → 2) → '남은 글자가 없어 [0-9]+가 매치하지 못함' ④ 예제 파일에 없는 출력 주장(`/a/[Symbol.matchAll]('aa')` → index 0) → 명세 서술만(근거 테스트 있음) ⑤ 실패 시 lastIndex 0 대입 주체·순서(RegExpBuiltinExec가 null 반환 전) 2곳 ⑥ 시나리오 단계 3·5의 주어(exec가 lastIndex를 바꿈) ⑦ 예제 4 패턴 설명(이름 없는 그룹 + 이름 있는 그룹) ⑧ CreateRegExpStringIterator의 슬롯 5개를 모두 내부 슬롯으로 ⑨ 단순화의 인수 경로에 Symbol.match 조건·'거짓 같은 값', 이터레이터 헬퍼 문장(본문 언급 없음과 모순), goals의 next 갈래 조건
  - 남긴 Low: lastIndex를 복제본에 '옮긴다'는 동사가 '매치 끝으로 옮긴다'와 겹침(`meta.ts` goals·단순화, `content.mdx` 예제 1·흔한 오해 2, `scenarios.ts` 단계 2 — 본문 동작 원리 13행은 '읽어 … 대입'으로 정확) / 예제 7 제목·goals의 '닫히지 않는다'(IteratorClose는 불림, 본문과 Callout이 풀어 줌) / regexp-lastindex 흔한 오해 3의 기존 문장 '정규 표현식을 복제해 쓰므로'(이번 범위 밖)
  - 수정 후: lint·format·typecheck 통과, `npm test` 5030, `test:build` 474(빌드 HTML에 수정 문장 반영 확인), e2e `-g "match-all|matchAll"` 12 통과
- 사용자 콘텐츠 검토 반영(변경 이력 2026-11-13): 메인 직접 수정(문구·조사 헬퍼 1개). 근거 테스트 3개(Symbol.match undefined/거짓 값, 문자열 특수 문자·SyntaxError·RegExp.escape, 제너레이터 break)와 View 조사 테스트 1개 추가. 재검증: lint·format·typecheck 통과, `npm test` 5034, `test:build` 474, e2e `-g "match-all|matchAll"` 12 통과, 개발 서버(5173) 화면에 수정 문장 8곳·'5에서 6으로'·generator 링크 반영, 콘솔 오류 0
- 사용자 추가 검토 반영: lint·format·typecheck 통과, `npm test` 5034, `test:build` 474(빌드 HTML에 수정 문장), e2e `-g "match-all|matchAll"` 12 통과, 개발 서버 화면 반영
- 마무리: 사용자 콘텐츠 검토 2회 반영 후 최종 승인(2026-11-13)으로 `reviewedAt: '2026-11-13'` 기록. content-integrity 771·`test:build` 474 통과, 빌드 HTML `dateModified` 2026-11-13

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 1~4단계(새 개념 폴더)와 5단계(연결·고정값·등록)는 Sonnet 서브에이전트 둘이 병렬로, 본문 검토·수정은 메인이 했다.
- 계획에 더한 것: 리뷰 High 9건 수정(이터러블·이터레이터 구분, 문자열 끝 인과, 예제 밖 출력 주장 제거 등), 사용자 검토 반영(Symbol.match undefined 예외, 칸/위치 구분, advance 문구 조사 헬퍼 `roParticle`, 문자열 인수의 특수 문자·SyntaxError·ES2025 `RegExp.escape`, 제너레이터 break 대비와 related `generator`, 점의 줄 끝 문자 예외).
- 최종 규모: 예제 7개, 시나리오 11·12단계, 퀴즈 7개, 흔한 오해 3개, concept.test 근거 테스트 포함 40여 개.

### 코드 리뷰

- Opus 명세 정확성 리뷰 지적을 프로젝트 기준으로 High 9건 재판정해 모두 수정했다.
- 남긴 Low: lastIndex를 복제본에 '옮긴다'는 동사 중복, 예제 7 제목·goals의 '닫히지 않는다'(IteratorClose는 불림), regexp-lastindex 흔한 오해 3의 기존 '복제해 쓰므로'(범위 밖).

### 후속 작업

- [ ] (선택) regexp-lastindex `content.mdx:55` 근처 '빈 문자열에 매치하면 lastIndex가 원래 값 그대로'가 일반 규칙으로 읽히지 않게 한정(계획 검토 Critic 지적)
- [ ] (선택) regexp-lastindex 흔한 오해 3의 '정규 표현식을 복제해 쓰므로'를 '패턴과 flags로 새 정규식을 만들어'로
- [ ] (선택) 남긴 Low 2건(match-all의 '옮긴다' 동사, '닫히지 않는다' 제목)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 리뷰에서 Opus가 Medium·Low로 매긴 지적 9건을 High로 올려 고쳤다 — '직접 만든 이터러블은 return을 가짐'(return은 이터레이터에 있음), '문자열 끝이라 매치가 없다'(lastIndex = length면 매처를 실행함), 예제 파일 밖의 출력 주장, 틀린 모델과 구별되지 않는 근거 등. 이 프로젝트는 결과가 맞아도 설명이 명세와 다르면 심각도를 높게 보기 때문이다.
- [무검토 승인] 시나리오 1에서 첫 next 직후 `re.lastIndex`를 출력하게 했다 — 마지막에만 출력하면 '원래 re로 검색한다'는 틀린 모델에서도 마지막 실패가 lastIndex를 0으로 되돌려 같은 0이 나온다.
- [무검토 승인] 시나리오 2의 패턴을 `/x*/g`가 아니라 `/(?=[0-9])/g`로, 시작 lastIndex를 2로 했다 — exec가 빈 매치에서도 lastIndex를 매치 시작 위치로 옮기는 경우(2→3)와 next가 한 칸 더 옮기는 경우(3→4)를 함께 보이고, 이어받지 않았다면 `"" 1`이 먼저 나와 구별된다.
- [무검토 승인] 대조 테스트는 `RegExp.prototype.exec`와 `%RegExpStringIteratorPrototype%.next`를 함께 감싸고, 원래 정규식은 최상위 `var re`를 전역에서 찾아 `this === re`로 구분한다 — exec 기록만으로는 어느 next 안의 검색인지, this가 복제본인지 알 수 없다.
- [무검토 승인] order 315(39번째, iterable-for-of 다음)에 두고 뒷장인 스프레드는 iterable-for-of처럼 본문 링크 + 단순화로 처리, 새 페이지 `reviewedAt`은 최종 승인 때 기록.
- 시각화(시뮬레이터 + 퀴즈)와 지연 실행 관찰 방법(예제에서 exec 잠시 감싸기)은 사용자 결정. 콘텐츠 검토 2회의 지적은 사용자 요청으로 반영.

#### 배경지식

- `RegExp.prototype[Symbol.matchAll]`: `Construct(speciesCtor, « regexp, flags »)`로 새 정규식을 만들고, 원래 lastIndex를 ToLength로 읽어 Set한 뒤 CreateRegExpStringIterator(검색 없음).
- `%RegExpStringIteratorPrototype%.next`: `[[Done]]`이면 exec 없이 끝 / exec가 null이면 Done / `[[Global]]` false면 매치 하나 뒤 Done / 빈 매치면 AdvanceStringIndex로 lastIndex를 한 칸 더(u·v면 코드 포인트).
- RegExpBuiltinExec(g 또는 y): 성공하면 lastIndex = 매치 끝(빈 매치면 시작 위치), 실패하면 0으로 대입한 뒤 null. lastIndex > length일 때만 매처 없이 바로 실패.
- IteratorClose는 이터레이터의 `return`을 GetMethod로 찾고 없으면 아무 일도 하지 않는다. RegExp String Iterator와 `%Iterator.prototype%`에는 return이 없고, 제너레이터 객체에는 있다.
- IsRegExp: `Symbol.match` 값이 undefined가 아니면 그 값을 ToBoolean, undefined면 [[RegExpMatcher]] 슬롯으로 판정.

#### 확인 질문

1. 시나리오 1에서 `re.lastIndex`를 마지막뿐 아니라 첫 next 직후에도 출력하는 이유는?
   <details><summary>답</summary>마지막 값 0은 '원래 re로 검색한다'는 틀린 모델에서도 마지막 exec 실패가 lastIndex를 0으로 되돌려 똑같이 나온다. 첫 next 직후라면 그 모델에서는 2가 되어 구별된다(계획 1절 시나리오 1, Critic HIGH 1, `examples/next-one-by-one.js` 4행).</details>
2. 시나리오 2를 `/x*/g`로 만들었다면 어떤 오개념이 남았을까?
   <details><summary>답</summary>`/x*/g`는 검색 시작 위치에서 곧바로 빈 매치를 내 exec 전후 lastIndex가 같아서, '빈 매치에서 exec는 lastIndex를 그대로 두고 next만 옮긴다'는 틀린 모델을 강화한다. `/(?=[0-9])/g`는 exec가 2→3으로 옮기고 next가 3→4로 옮기는 두 이동을 보인다(계획 3절, Critic HIGH 2, `'aab'.matchAll(/(?=b)/g)` 반례).</details>
3. 끝난 matchAll 이터레이터를 다시 스프레드하면 비는 이유는 복제본 lastIndex인가 `[[Done]]`인가? 어느 예제가 그것을 가르나?
   <details><summary>답</summary>`[[Done]]`이다. 마지막 실패로 복제본 lastIndex는 0으로 돌아가지만 Done이 true라 next가 exec를 부르지 않는다. 예제 2의 빈 둘째 스프레드는 두 모델 모두에서 나오고, 예제 3의 18~19번 줄(네 번째 next에서 exec 기록이 늘지 않음)이 가른다(`content.mdx` 결과는 배열이 아니라 이터레이터 절, 리뷰 수정 ①).</details>
4. `for...of`에서 break한 뒤 matchAll 이터레이터는 이어 쓸 수 있는데 제너레이터는 왜 안 되나?
   <details><summary>답</summary>break 때 IteratorClose가 return을 찾는데, RegExp String Iterator(와 %Iterator.prototype%)에는 return이 없어 아무 일도 없고 `[[Done]]`도 false 그대로다. 제너레이터 객체는 return이 있어 불리면 끝난다(`content.mdx` break 절, 근거 테스트).</details>
5. `re[Symbol.match] = undefined`인 g 없는 정규식은 왜 여전히 TypeError이고, false면 왜 통과하나?
   <details><summary>답</summary>IsRegExp는 Symbol.match 값이 undefined면 [[RegExpMatcher]] 슬롯을 보고 정규식으로 판정해 g 검사를 거친다. false·null·0이면 ToBoolean이 false라 정규식이 아니라고 보고 g 검사를 건너뛴다(meta.ts 단순화, 사용자 검토 ①, 근거 테스트).</details>
