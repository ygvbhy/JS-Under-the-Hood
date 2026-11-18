# structuredClone 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-18
- 기준: `main` @ `bcc337e`

## 0. 요약
- 목적: "깊은 복사인데 왜 메서드와 클래스는 사라질까"를 질문으로 하는 `structured-clone` 페이지를 추가한다(order 425, 학습 순서 59번째/68). 중심은 HTML 표준의 직렬화(StructuredSerializeInternal)와 역직렬화가 무엇을 기록하고 무엇을 거부하는지다.
- 범위: 새 개념 폴더(browser 예제 8개 + 비교표 예제 1개, 값별 비교표, 퀴즈 8개, 시뮬레이터 없음), 기존 3개 페이지(json, spread-destructuring, array-method-pitfalls)의 "다루지 않는다"·"별도 개념" 문구, 59번째 이후 순위 +1 테스트와 e2e·빌드 테스트 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: 결과를 "복사해서/참조를 공유해서"로 설명하거나, 표준이 정한 것(Error 기록에 name·message·stack만 있음)과 Chromium 결과(cause가 남음, lastIndex 0)를 섞어 쓰는 것.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE·Critic REVISE → HIGH 2건 모두 반영, 메인이 Chromium 탐침과 표준 원문으로 재확인)
- 미확정: 3건 (기본안 있음)

## 1. 요구사항

- 사용자 결정(2026-11-18)
  - 추가 게시글 로드맵 2의 3번. 핵심 3개(JSON 방식과 달리 보존되는 것 / DataCloneError / 클래스 인스턴스) + 추가 4개 모두(프로퍼티 어트리뷰트, Error 객체, RegExp·배열 세부, getter 오류 전파).
  - 시각화: 값별 비교표(`JSON.parse(JSON.stringify(x))`와 `structuredClone(x)`) + 퀴즈. 시뮬레이터 없음.
  - slug `structured-clone`, 제목 "structuredClone: 깊은 복사인데 왜 메서드와 클래스는 사라질까", order 425(json 420과 promise 430 사이).
- 새 페이지
  - `app/concepts/structured-clone/`, category `objects`(json `meta.ts:8`과 같은 그룹, 미확정 3), `reviewedAt: null`.
  - prerequisites: JSON(`json`), 프로퍼티 어트리뷰트와 접근자(`property-attributes`), 클래스의 getter와 setter(`class-accessors`), Set과 Map(`set-map`).
  - 첫 문단의 답(고정 내용, HTML 표준 근거)
    - `structuredClone(value)`는 ECMAScript가 아니라 HTML 표준이 정한 호스트 API다. 값을 realm과 무관한 기록으로 직렬화(StructuredSerializeWithTransfer → StructuredSerializeInternal)한 뒤 그 기록에서 새 값을 만든다(역직렬화).
    - 일반 객체는 자기 열거 가능 문자열 키의 값만 기록하고(EnumerableOwnProperties + `[[Get]]`), 역직렬화는 그 기록으로 `Object.prototype`을 프로토타입으로 하는 새 객체를 만든다. 그래서 프로토타입(클래스)과 그 위의 메서드·접근자는 기록되지 않는다.
    - 함수, 심벌, 직렬화할 수 없는([Serializable]이 아닌) 플랫폼 객체(예: DOM 노드), 앞의 어느 종류(Date·Map·배열 등)에도 해당하지 않으면서 다른 내부 슬롯을 가진 객체(예: WeakMap, Promise)나 이그조틱 객체(예: Proxy)는 "DataCloneError" DOMException을 던지고 결과는 만들어지지 않는다.
    - 직렬화와 역직렬화가 각각 memory 맵으로 이미 처리한 객체를 다시 처리하지 않으므로 순환과 공유 참조의 모양이 결과 안에서 유지된다.
  - 다룰 것(예제 번호)
    1. 보존되는 타입: Date·Map·Set·BigInt·값이 undefined인 프로퍼티·NaN. 결과는 새 객체다(원본과 `!==`, 결과의 Map을 바꿔도 원본은 그대로). -0 보존은 비교표 행으로 보인다(예제 1, 비교표).
    2. 공유 참조와 순환: 원본에서 `left === right`였으면 결과에서도 `true`, 원본과는 다른 객체. 순환 객체도 결과에서 자기 자신을 가리킨다(예제 2).
    3. 복제할 수 없는 값: 함수 값의 프로퍼티, 심벌 값, DOM 노드는 DataCloneError. JSON처럼 조용히 빼지 않고 전체가 실패한다. `e.name`은 `'DataCloneError'`, `e instanceof DOMException`은 `true`(예제 3). DOMException 자체(WebIDL)는 다루지 않는다.
    4. 클래스 인스턴스: 결과의 프로토타입은 `Object.prototype`, `instanceof`는 `false`, 프로토타입의 메서드와 접근자는 사라지고 자기 공개 필드만 남는다. 프로토타입의 메서드는 자기 프로퍼티가 아니라 기록되지 않으므로 DataCloneError도 나지 않는다(예제 3과 대비). private 필드도 옮겨지지 않는다(결과에서 `o.#secret`을 읽으면 TypeError, class-accessors 예제 8과 같은 방식)(예제 4).
    5. 프로퍼티 어트리뷰트: 열거 불가 프로퍼티와 심벌 키 프로퍼티는 빠진다. 자기 접근자는 getter를 호출한 값의 데이터 프로퍼티가 된다(getter 1회 호출). freeze된 객체의 결과는 freeze되어 있지 않고 모든 프로퍼티가 쓰기·열거·설정 가능하다(역직렬화가 CreateDataProperty로 정의)(예제 5).
    6. Error 객체: 표준의 Error 기록은 name·message·stack뿐이고 자기 프로퍼티를 하나씩 기록하는 단계가 없다. 그래서 `code` 같은 추가 프로퍼티는 기록되지 않는다(표준). name은 클래스가 아니라 `name` 값으로 정해진다 — 허용 목록(Error·EvalError·RangeError·ReferenceError·SyntaxError·TypeError·URIError)에 없으면 "Error"이고, 역직렬화는 그 이름의 프로토타입으로 새 객체를 만든다. 그래서 `TypeError`를 상속했지만 `name`을 바꾼 클래스는 `Error`가 되고, `Error`인데 `name`을 `'TypeError'`로 바꾼 객체는 `TypeError`가 된다. `message`는 자기 데이터 프로퍼티일 때만 기록된다. 표준은 아직 명세되지 않은 부가 데이터를 UA가 붙이도록 하며(should), Chromium은 `cause`를 남겼다(Chromium 결과, 예제에 넣지 않음)(예제 6).
    7. RegExp와 배열: RegExp 기록은 matcher·source·flags뿐이라 `lastIndex`가 기록되지 않는다(표준). Chromium에서 결과의 `lastIndex`는 `0`이다(Chromium 결과). 배열은 길이와 자기 열거 가능 키를 기록하므로 구멍은 구멍으로 남고 인덱스가 아닌 추가 프로퍼티도 남는다(예제 7).
    8. getter가 던진 오류: 직렬화 중 `[[Get]]`이 던진 오류는 DataCloneError로 바뀌지 않고 그대로 전파된다(`?` 표기). 직렬화는 키 순서대로 진행하므로, getter보다 앞에 복제할 수 없는 값이 있으면 DataCloneError가 먼저 난다(예제 8).
  - 값별 비교표(동작 원리 마지막 절): 값마다 `JSON.parse(JSON.stringify(x))`와 `structuredClone(x)`의 결과를 같은 확인 식으로 비교한다(작업 순서 2의 행 목록). 표는 `compare-table.js`(browser 예제)의 출력과 concept.test로 행 단위 대조한다.
  - 다루지 않고 밝힐 것(simplifications)
    - `transfer` 옵션과 transferable 객체, `postMessage`·IndexedDB 등 같은 알고리즘을 쓰는 다른 API, ArrayBuffer·typed array·SharedArrayBuffer.
    - Error의 `stack`(표준이 구현 정의 문자열로 둔다), `cause` 같은 UA 부가 데이터(Chromium은 `cause`를 남겼다. 다른 브라우저는 확인하지 않았다). Error 생성자·사용자 정의 에러 클래스·`cause`·`stack` 자체는 이 사이트에서 다루지 않는다(error-handling `content.mdx:85`도 다루지 않는다고 밝힘).
    - DOMException 자체(이름·코드·WebIDL 정의)는 다루지 않는다(classlist-style·dom-manipulation 표현과 같게).
    - [Serializable] 플랫폼 객체(Blob, DOMException 등)의 복제, 래퍼 객체(`Object(1)`), `%Object.prototype%` 자체의 복제, 배열·Map 서브클래스(내장 타입으로 돌아감).
    - Promise는 DataCloneError가 나는 내부 슬롯 객체의 예로만 언급한다(Promise 페이지는 이 하위 주제를 다루지 않으므로 링크하지 않는다).
    - Node에도 전역 `structuredClone`이 있지만 이 페이지의 결과는 Chromium 실행 기준이다(Node 동작은 확인하지 않음).
    - 직렬화 기록(Record)과 memory 맵은 표준이 설명을 위해 쓰는 모델이고 엔진 내부 구현이 아니다.

## 2. 사실과 추정

### 사실 (코드·표준·실행에서 확인)
- 탐침(2026-11-18, Playwright Chromium, `page.setContent`, 메인·Architect·Critic이 각각 재현)
  - `structuredClone({ d: new Date(0), m: new Map([[1,'a']]), s: new Set([1]) })` → `c.d instanceof Date` true, `c.d !== d` true, `getTime()` 0, Map·Set 유지(`c !== s`).
  - 공유 `{left: o, right: o}` → `c.left === c.right` true, `c.left !== o` true. 순환 `cyc.self = cyc` → `c.self === c` true.
  - `{u: undefined, n: NaN, z: -0, big: 10n}` → `'u' in c` true, NaN 유지, `Object.is(c.z, -0)` true, `typeof c.big` bigint. JSON 방식은 `{v:-0}`에서 `Object.is(r.v, -0)` false, BigInt·순환은 TypeError, 구멍 `1 in r` true(null), NaN은 null.
  - `[1, , 3]` → `1 in c` false, length 3. 배열 추가 프로퍼티 유지.
  - `/a/g`에 `lastIndex = 2` → 결과 `flags` g, `lastIndex` 0.
  - 함수 값 프로퍼티·화살표 함수·심벌 값·`document.body`·Proxy·WeakMap·Map 안의 함수 → `DataCloneError`(`instanceof DOMException` true). `new DOMException(...)`과 `new Blob(...)`은 복제된다([Serializable]).
  - 심벌 키 프로퍼티 → 결과에 심벌 키 0개. 열거 불가 프로퍼티 빠짐.
  - `class Pt { x = 1; get dbl(){} m(){} }` 인스턴스 → `instanceof Pt` false, 프로토타입 `Object.prototype`, `JSON.stringify(c)` `{"x":1}`, `'dbl' in c` false, `typeof c.m` undefined, DataCloneError 없음. private 필드: 결과에서 `o.#s` 접근은 TypeError.
  - 자기 접근자 `{ get g(){ return 7 } }` → 결과 디스크립터 `{"value":7,"writable":true,"enumerable":true,"configurable":true}`, getter 1회 호출. `Object.freeze({a:1})` → 결과 `isFrozen` false, 디스크립터 모두 true.
  - Error: `new TypeError('bad')`에 `code = 5` → 결과 `instanceof TypeError` true, message `bad`, `'code' in` false. `class V extends TypeError { constructor(m){ super(m); this.name = 'V' } }` → 결과 `instanceof TypeError` false, name `Error`. `class W extends TypeError {}` → 결과 TypeError. `const e = new Error('m'); e.name = 'TypeError'` → 결과 `instanceof TypeError` true. getter로 정의한 message → 결과에 자기 message 없음. `cause` → 결과에 남음(Chromium, 열거 불가).
  - getter 오류: `{ get g(){ throw new RangeError() } }` → RangeError. `{ f(){}, get g(){ throw … } }` → DataCloneError. 순서를 뒤집으면 RangeError.
  - `http://example.test`(프로젝트 실행기 주소)에서 `isSecureContext` false이고 `structuredClone`은 함수.
- HTML 표준(https://html.spec.whatwg.org/multipage/structured-data.html, 2026-11-18 원문 추출)
  - 2.7.4 StructuredSerializeInternal(`#structuredserializeinternal`): memory 맵, 원시 값, Symbol → DataCloneError, `[[DateValue]]`, RegExp 기록은 `[[RegExpMatcher]]`·`[[OriginalSource]]`·`[[OriginalFlags]]`, Map·Set은 deep, `[[ErrorData]]` 분기는 `? Get(value, "name")` 허용 목록·`[[GetOwnProperty]]("message")`가 데이터 디스크립터일 때만 message·구현 정의 stack·"User agents should attach a serialized representation of any interesting accompanying data which are not yet specified"이고 deep을 true로 두지 않음, 배열은 length와 프로퍼티(deep), [Serializable]이 아닌 플랫폼 객체 → DataCloneError, IsCallable → DataCloneError, `[[Prototype]]`·`[[Extensible]]`·`[[PrivateElements]]` 외 내부 슬롯 → DataCloneError(예: `[[PromiseState]]`, `[[WeakMapData]]`), 이그조틱 객체 → DataCloneError(예: proxy), 그 밖은 "Object". deep이면 `! EnumerableOwnProperties(value, key)`의 각 키에 `? value.[[Get]](key, value)`.
  - 2.7.7 StructuredDeserialize(`#structureddeserialize`): 역직렬화에도 memory, "Object"는 targetRealm의 새 Object(값은 CreateDataProperty), "Array"는 `ArrayCreate(length, %Array.prototype%)`, "Error"는 이름에 맞는 프로토타입으로 OrdinaryObjectCreate하고 message를 `{writable: true, enumerable: false, configurable: true}`로 정의, RegExp는 세 슬롯으로 새 RegExp.
  - 2.7.11 `structuredClone(value, options)`(`#dom-structuredclone`): StructuredSerializeWithTransfer → StructuredDeserializeWithTransfer. 개발자용 안내: "Throws a "DataCloneError" DOMException if any part of the input value is not serializable."
- 기존 페이지
  - `app/concepts/json/content.mdx:63-74` "깊은 복사로 쓸 때 잃는 것" 절. 74행 끝: "`structuredClone`은 HTML 표준이 정한 호스트 API라 이 페이지에서는 다루지 않습니다." `meta.ts:122`: "깊은 복사의 대안인 structuredClone은 HTML 표준이 정한 호스트 API라 다루지 않습니다." 74행의 "'사본'은 결과를 부르는 말" 표현 선례.
  - `app/concepts/spread-destructuring/content.mdx:5`: "…, 깊은 복사는 별도 개념이고, `try...catch`는 …". `meta.ts:114`: "깊은 복사와 structuredClone(호스트 API)은 다루지 않습니다."
  - `app/concepts/array-method-pitfalls/meta.ts:102`: "…예제에 쓰지 않으며, 깊은 복사와 structuredClone도 다루지 않습니다."
  - `app/concepts/class-basics/meta.ts:105`, `class-accessors/meta.ts:105`: `#x in obj` 검사는 다루지 않는다 → 예제에 쓰지 않는다.
  - `app/concepts/error-handling/content.mdx:85`: Error의 `cause`·`stack`·사용자 정의 에러 클래스는 다루지 않는다 → Error 하위 주제는 error-handling에 링크하지 않는다(try/catch 용도로만).
  - try/catch·DOMException 단순화 문구 선례: `app/concepts/classlist-style/meta.ts:102`("예외 이름을 출력하려고 try…catch와 e.name을 씁니다. 던져지는 것은 DOMException이며 DOMException 자체는 다루지 않습니다. 오류 처리는 try/catch/finally 개념에서 다룹니다.").
  - 표 영역 패턴: class-accessors `content.mdx:58-60`, json `content.mdx:81-83`(`overflow-x-auto` + `tabIndex={0}` + `role="region"` + `aria-label`).
- 순서와 테스트
  - 현재 67개. order 425는 59번째(json 58, promise 59 → 60).
  - `app/lib/concepts.test.ts:104,111,112`(67), `app/components/concept/ConceptPager.test.tsx:18,28`.
  - `tests/e2e/navigation.spec.ts`: `toHaveCount(67)` 85·150, `67번째` 93, `학습 순서 N / 67`(N ≥ 59이면 N+1). json 블록(600-610행)의 다음 링크 `/concepts/promise` → `/concepts/structured-clone`, promise 블록(614-624행)의 이전 링크 `/concepts/json` → `/concepts/structured-clone`, 사이에 structured-clone 블록(59 / 68) 추가.
  - '객체' 검색 18개 4곳(24, 39, 100, 137). 순위 배열 끝 `'58','63'` → `'58','64'`(63번째 generator가 64번째로). 새 페이지는 title·summary·tags에 '객체'를 넣지 않는다(concept.test 가드).
  - `tests/e2e/responsive.spec.ts:1657` `toHaveCount(67)`.
  - 등록 선례(class-accessors): `tests/e2e/helpers.ts:57`, `a11y.spec.ts:861`, `responsive.spec.ts:1093`, `tests/build/build-output.test.ts:1008`, `docs/content-guide.md:225`. `JSON_PATH`는 `helpers.ts:84`.
- 테스트 구조: `tests/examples.test.ts`가 browser 예제를 `toRunnerInput` → `runBrowserExample`로 Chromium에서 실행해 `expectedOutput`과 대조한다. concept.test는 `./meta`에서 `expectedOutput`을 읽어 표와 대조할 수 있다(Chromium 없이). 실행기는 -0을 `'-0'`으로 기록한다(`tests/helpers/run-browser-example.ts:43`). `exampleFilesByNumber`(`tests/helpers/result-tables.ts:28-58`)는 `### 예제 N` 밖의 `file=`을 번호에 넣지 않는다. `tableBody`(`tests/helpers/expression-tables.ts:9`)는 머리 행이 정확히 같은 표 1개를 요구한다.

### 추정
- 없음.

## 3. 구현 전략
- class-accessors·json(표+퀴즈, concept.test로 표 대조)과 classlist-style(browser 예제)의 패턴을 조합한다. 새 공통 코드는 만들지 않는다.
- 비교표 검증: browser 예제 `compare-table.js`가 표의 행마다 `console.log(JSON.stringify([값 라벨, JSON 결과, structuredClone 결과]))`를 한 줄씩 출력하고, examples.test가 Chromium에서 그 출력을 대조한다. concept.test는 표의 행을 순서대로 그 예제의 `expectedOutput` 줄(JSON 배열)과 대조한다 — "값" 칸 = 라벨, 두 결과 칸 = 두 결과(`String`). "확인 식" 칸 문자열은 `compare-table.js` 원문에 표 순서대로 나와야 한다(`indexOf`가 증가). 표 → expectedOutput → Chromium 실행이 행 단위로 이어진다. concept.test 안에서 Node의 `structuredClone`으로 다시 실행하지 않는다(Node는 HTML 표준 구현이라는 근거가 없다). 확인 식을 문자열로 두고 실행하는 방식(eval)은 쓰지 않는다.
- 설명은 표준의 동작(무엇을 기록하나, 무엇을 거부하나, 역직렬화가 무엇을 만드나)으로 쓴다. "복사"는 결과를 부르는 말(json 74행 선례)로만 쓰고 원인 설명에 쓰지 않는다. 표준이 정한 것과 Chromium 결과를 문장에서 나눈다.
- 예제마다 틀린 모델을 배제한다.
  1. "JSON 방식과 같다" → `instanceof Date`·Map·Set·`'u' in`이 true. "얕은 복사(같은 Date)" → `c.d !== d`, 결과 Map 변경 뒤 원본 크기 그대로.
  2. "공유 참조는 둘로 갈라진다(JSON)" → `c.left === c.right` true. "원본 객체를 그대로 참조한다" → `c.left === o` false.
  3. "복제할 수 없는 값은 JSON처럼 빠진다" → DataCloneError로 결과 없음. "보통 TypeError다" → `e.name` DataCloneError, `instanceof DOMException` true.
  4. "깊은 복사니까 클래스도 유지된다" → `instanceof` false, 메서드 undefined. "메서드도 함수라 DataCloneError다" → 오류 없음(예제 3과 대비). "private 필드도 옮겨진다" → 결과에서 `#secret` 읽기 TypeError(원본에서는 값).
  5. "속성까지 그대로 복제" → 열거 불가 빠짐, freeze 풀림, 접근자는 데이터 프로퍼티.
  6. "Error는 그대로" → `code` 빠짐. "가장 가까운 내장 부모 클래스로 돌아간다" → `name`을 바꾼 TypeError 서브클래스는 `instanceof TypeError` false. "클래스대로 정해진다" → `name`만 `'TypeError'`로 바꾼 Error가 TypeError가 된다.
  7. "RegExp는 상태까지" → lastIndex 0(Chromium). "배열은 JSON처럼 구멍이 null" → `1 in c` false.
  8. "복제 중 오류는 모두 DataCloneError" → RangeError. "getter 오류가 항상 이긴다" → 앞에 함수가 있으면 DataCloneError.
- 버린 대안
  - 시뮬레이터(memory 맵 단계): 사용자가 표+퀴즈를 골랐다.
  - 비교표를 concept.test에서 Node `structuredClone`으로 대조: Node 구현과 HTML 표준·Chromium이 같다는 근거가 없다.
  - 비교표 확인 식 문자열만 파일 어딘가에 있는지 검사: 행 순서와 값의 대응을 묶지 못한다(검토 지적).
  - 예제 6에서 사용자 오류 클래스 하나만 출력: "내장 부모로 돌아간다" 모델과 출력이 같아 증거가 안 된다(검토 HIGH).
  - 예제 4에서 `#secret in o`: class-basics·class-accessors가 다루지 않는다고 밝힌 문법이다.
  - 예제 3에서 `instanceof Error`: DOMException의 프로토타입 체인은 WebIDL이 정한다(이 페이지 범위 밖).
  - 예제에 Error의 `stack`·`cause` 출력: 표준이 구현 정의·UA 재량으로 둔다.

## 4. 변경 파일
- 추가
  - `app/concepts/structured-clone/meta.ts`, `content.mdx`, `route.tsx`, `concept.test.ts`
  - `examples/keeps-types.js`, `shared-and-cycle.js`, `data-clone-error.js`, `class-instance.js`, `attributes.js`, `error-object.js`, `regexp-array.js`, `getter-throws.js`, `compare-table.js`
- 수정
  - `app/concepts/json/content.mdx:74`, `meta.ts:122`(+related)
  - `app/concepts/spread-destructuring/content.mdx:5`, `meta.ts:114`(+related)
  - `app/concepts/array-method-pitfalls/meta.ts:102`(+related)
  - `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`
  - `tests/e2e/navigation.spec.ts`, `responsive.spec.ts`, `a11y.spec.ts`, `helpers.ts`
  - `tests/build/build-output.test.ts`, `docs/content-guide.md:225`
  - `.claude/plans/concept-roadmap-extras-2.md`(3번 상태, finalize 때)
- 변경하지 않음: 공통 코드 소스, 다른 페이지의 예제·퀴즈·`reviewedAt`.

## 5. 위험 요소
- 호스트/언어 구분: structuredClone은 HTML 표준이다 → references는 HTML 표준 2.7.4·2.7.7·2.7.11과 MDN. ECMAScript 명세는 표준이 부르는 연산(EnumerableOwnProperties)에만.
- 표준과 Chromium 결과의 구분: Error 기록(name·message·stack, 추가 프로퍼티 없음)은 표준, `cause`가 남는 것은 Chromium. RegExp `lastIndex`가 기록되지 않는 것은 표준, 결과가 `0`인 것은 Chromium → 문장에서 나눠 쓴다. 다른 브라우저 결과는 쓰지 않는다.
- 일반 규칙 문장의 반례: "플랫폼 객체는 DataCloneError"(DOMException·Blob 반례), "사용자 오류 클래스는 Error가 된다"(name을 안 바꾼 서브클래스 반례), "getter 오류는 그대로 전파"(앞에 함수가 있으면 DataCloneError) → 1절 고정 문장과 다룰 것 6·8에 조건을 넣었다.
- 장 순서: json(420)까지 전제. try/catch(error-handling 470)는 simplifications에 용도만. Error 하위 주제는 error-handling에 링크하지 않는다. Promise(430)는 예로만 언급. DOM 노드는 dom-tree-nodes(350) 이후.
- 비교표 행과 예제 출력의 어긋남 → concept.test가 행 수·순서·라벨·결과·확인 식 순서를 대조한다(작업 순서 3).
- browser 예제의 잡히지 않은 예외는 실패 → DataCloneError·RangeError·TypeError는 모두 try/catch로 잡아 이름을 출력한다.
- "깊은 복사" 용어: 원인 설명에 "복사해서"를 쓰지 않는다 → 작업 순서 2의 grep.
- 순위 +1·'객체' 검색: 작업 순서 5의 대조 스크립트.
- 표 칸: `normalizeCell`은 `{'…'}` 안 작은따옴표를 풀지 못한다 → 확인 식의 문자열은 큰따옴표. 확인 식에 `>`·`{`를 쓰지 않는다(MDX).
- 4열 비교표의 375px 넘침 → 표 영역 패턴(`overflow-x-auto`·`tabIndex={0}`·`role="region"`·`aria-label`)과 responsive e2e.
- 기존 페이지 문구: 새 페이지가 실제로 다루는 범위(structuredClone)만 가리키고, 깊은 복사 일반은 JSON 방식(json 페이지)과 structuredClone으로 나눠 쓴다.

## 6. 검증 방법
- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`
- e2e: `npx playwright test tests/e2e/navigation.spec.ts`와 `npx playwright test -g "structured-clone|structuredClone|홈 학습 순서 보기|json|JSON|spread-destructuring|array-method-pitfalls"`(기존 페이지 본문·meta 수정 포함 — 테스트 이름에 맞는 패턴은 구현 때 `grep -n "test(" tests/e2e/*.ts`로 확인).
- 브라우저(dev 서버 재시작 후)
  1. 홈 학습 순서 58~60번째가 json, structured-clone, promise다.
  2. 새 페이지 pager가 '59 / 68'이고 이전은 json, 다음은 promise다.
  3. 퀴즈 8개가 하이드레이션 뒤 라디오 퀴즈로 바뀐다.
  4. 375px·다크 모드에서 비교표가 영역 안에서만 가로 스크롤되고 문서 폭이 넘치지 않는다.
  5. json 74행, spread-destructuring 5행의 링크가 새 개념으로 간다.

## 7. 미확정 사항
- [미확정 1] 기존 3개 페이지(json, spread-destructuring, array-method-pitfalls)의 문구를 바꾼다(기본안). spread-destructuring 5행 "깊은 복사는 별도 개념"과 array-method-pitfalls 102행은 json 페이지가 생긴 뒤에도 남아 있던 기존 불일치라 이번에 함께 링크·개념 이름으로 바꾼다. 대안: json·spread-destructuring meta 114만 바꾸고 나머지는 별도 정리로 미룬다.
- [미확정 2] 기존 3개 페이지의 `reviewedAt`은 그대로 둔다(기본안, 선례).
- [미확정 3] category는 json과 같은 `objects`(기본안). 호스트 API인 fetch·timers는 `async`이지만 이 페이지는 비동기와 무관하고 json 옆에서 읽히는 내용이다. 분류 개수를 고정한 테스트는 없다.

## 8. 작업 순서

### 1. 폴더 뼈대·예제·meta
- 대상: `meta.ts` → `content.mdx`(필수 h2 뼈대) → `route.tsx`(class-accessors 것 복사, slug만 변경), 예제 9개(모두 `runtime: 'browser'`, `.js`). `expectedOutput`은 `[]`로 시작해 `npx vitest run tests/examples.test.ts`(Chromium) 결과로 채우고 아래 기대와 같은지 확인한다. 모든 오류는 try/catch로 잡아 이름을 출력한다. `console.log` 인수는 원시 값·불리언·`JSON.stringify` 결과만.
  1. `keeps-types.js` — 원본 `{ d: new Date(0), m: new Map([['k', 1]]), s: new Set([1]), u: undefined, n: NaN, big: 10n }`을 복제. 출력: `c.d instanceof Date`, `c.d === original.d`, `c.d.getTime()` / `c.m instanceof Map`, `c.m.get('k')`, `c.s.has(1)` / `'u' in c`, `Number.isNaN(c.n)`, `typeof c.big` / 결과 Map에 `set` 뒤 원본 Map의 `size`.
  2. `shared-and-cycle.js` — 공유 `{ left: o, right: o }`와 순환 `a.self = a`. 출력: `c.left === c.right`, `c.left === o` / `c2.self === c2`, `c2 === a`.
  3. `data-clone-error.js` — `{ name: 'x', greet() {} }`, `{ id: Symbol('s') }`, `document.body` 각각 try/catch. 출력: 세 오류 이름 / 첫 오류의 `instanceof DOMException`.
  4. `class-instance.js` — `class Point { #secret = 1; x = 1; y = 2; get sum() { return this.x + this.y; } move() {} static read(o) { try { return o.#secret; } catch (e) { return e.name; } } }`. 출력: `c instanceof Point`, `Object.getPrototypeOf(c) === Object.prototype` / `JSON.stringify(c)` / `typeof c.move`, `c.sum` / `Point.read(p)`, `Point.read(c)`.
  5. `attributes.js` — 열거 불가 프로퍼티(`Object.defineProperty`), 심벌 키, 자기 접근자(getter 호출 횟수 세기), `Object.freeze`. 출력: 열거 불가 키 `in` 여부, 심벌 키 개수 / 접근자 결과 디스크립터 JSON, getter 호출 횟수 / 결과 `Object.isFrozen`, 결과 프로퍼티 `writable`.
  6. `error-object.js` — (가) `new TypeError('bad')`에 `code = 5`. (나) `class NamedTypeError extends TypeError { constructor(m) { super(m); this.name = 'NamedTypeError'; } }`. (다) `const plain = new Error('m'); plain.name = 'TypeError';`. 출력: (가) `instanceof TypeError`, `message`, `'code' in` / (나) `instanceof TypeError`, `name` / (다) `instanceof TypeError`, `name`. 기대: `true bad false` / `false Error` / `true TypeError`.
  7. `regexp-array.js` — `/a/g`의 `lastIndex = 2`, `[1, , 3]`에 `extra`. 출력: `re2.flags`, `re2.lastIndex` / `1 in arr2`, `arr2.length`, `arr2.extra`.
  8. `getter-throws.js` — (가) getter가 `RangeError`를 던지는 객체, (나) 같은 getter 앞에 메서드 `f() {}`가 있는 객체. 출력: (가) `e.name`, `e instanceof DOMException` / (나) `e.name`. 기대: `RangeError false` / `DataCloneError`.
  9. `compare-table.js` — 작업 순서 2의 표 행마다 `x`를 만들고 `JSON.parse(JSON.stringify(x))`와 `structuredClone(x)`에 같은 확인 식(함수 `(r) => …`)을 적용해 `console.log(JSON.stringify([라벨, json결과, clone결과]))`(예외면 예외 이름 문자열)를 출력한다. 라벨은 표의 "값" 칸과 같은 문자열, 확인 식 본문은 표의 "확인 식" 칸과 같은 문자열이다.
- meta
  - summary 160자 이하, title·summary·tags에 '객체'를 넣지 않는다.
  - tags: structuredClone, 깊은 복사, DataCloneError, HTML 표준, 직렬화, Date, Map, 순환 참조.
  - goals 4개: 직렬화·역직렬화로 결과가 만들어진다는 것과 보존되는 것 / DataCloneError가 나는 값과 JSON과의 차이 / 클래스 인스턴스·프로퍼티 어트리뷰트가 결과에서 달라지는 이유 / Error·RegExp·배열·getter 오류의 처리.
  - related: `json`, `spread-destructuring`, `property-attributes`, `class-accessors`, `class-basics`, `set-map`, `date`, `regexp-lastindex`, `primitives-and-objects`, `error-handling`(error-handling은 try/catch 용도만).
  - references: HTML 표준 `#structuredserializeinternal`·`#structureddeserialize`·`#dom-structuredclone`, MDN structuredClone·structured clone algorithm(ko 응답 확인, 없으면 en), ECMAScript EnumerableOwnProperties.
  - simplifications: 1절 "다루지 않고 밝힐 것" 전부 + Chromium 실행 기준 + try/catch 용도(classlist-style 102행 표현) + `console`은 호스트 API.
- 완료 조건: `npx vitest run tests/examples.test.ts tests/content-integrity.test.ts` 통과(Chromium). 9개 예제의 출력이 2절 탐침과 같은 값이다. 잡히지 않은 예외 0.

### 2. content.mdx 본문
- 첫 문단: 질문과 1절의 고정 내용. `**`·장 번호 없음. JSON 페이지의 "깊은 복사로 쓸 때 잃는 것"을 링크로 전제.
- 실행 조건 문장: 예제는 Playwright Chromium에서 실행한 결과이고 structuredClone은 HTML 표준이 정한 호스트 API라는 것.
- `## 동작 원리`: 1절 "다룰 것" 1~8 순서의 h3 + `### 값별 비교표`.
  - 비교표 머리: `값 | 확인 식 | JSON.parse(JSON.stringify(x)) | structuredClone(x)`. 행: Date(`r instanceof Date`), Map(`r instanceof Map`), 값이 undefined인 프로퍼티(`"v" in r`), NaN(`Number.isNaN(r.v)`), -0(`Object.is(r.v, -0)`), BigInt(`typeof r.v`), 공유 참조(`r.a === r.b`), 순환(`r.self === r`), 함수 값 프로퍼티(`"f" in r`), 클래스 인스턴스(`r instanceof P`), 배열 구멍(`1 in r`), RegExp(`r instanceof RegExp`). 칸에는 결과(불리언·문자열·예외 이름)만. 표 영역은 2절의 표 영역 패턴(aria-label 포함). 표 아래에 `compare-table.js`를 `file=`로 보인다(`### 예제 N` 밖).
- `## 예제`: 예제 1~8, 각각 `### 예제 N: …`, `file=`, PredictQuiz(오답은 3절의 틀린 모델 출력 — 예제 6은 "내장 부모로 돌아감" `true TypeError`와 "클래스대로" `false Error` 계열, 예제 8은 "항상 getter 오류" `RangeError`).
- `## 결과와 이유`: 결과 표(`예제 | 결과`)와 예제별 설명, 흔한 오해 Callout 3개("structuredClone은 무엇이든 복제한다", "클래스 인스턴스도 그대로 복제된다", "복제할 수 없는 값은 JSON처럼 빠진다").
- 완료 조건: `npm test`(result-tables 포함)와 `npm run test:build` 통과. `grep -n "복사해서\|공유해서\|공유한다"` 결과가 오해를 부정하는 문장뿐이다. "Chromium" 언급이 실행 조건, Error 부가 데이터(`cause`), `lastIndex` 결과 문장, simplifications에만 있다. "플랫폼 객체"가 나오는 문장에 "직렬화할 수 없는"(또는 [Serializable]) 조건이 있다.

### 3. concept.test.ts
- 비교표: `tableBody(mdx, ['값', '확인 식', 'JSON.parse(JSON.stringify(x))', 'structuredClone(x)'])`의 행 수 = `compare-table` 예제 `expectedOutput` 줄 수. i번째 행에 대해 `JSON.parse(expectedOutput[i])`의 `[라벨, json, clone]`과 `[행[0], 행[2], 행[3]]`이 같다(결과는 `String`으로 비교). 행[1](확인 식) 문자열이 `compare-table.js` 원문에 있고, 그 위치가 행 순서대로 증가한다.
- 퀴즈 정답 대조: `exampleFilesByNumber(mdx)`로 번호 → 파일 → meta 예제를 찾아 정답 선택지가 `expectedOutput`을 ` / `로 이은 문자열과 같은지(class-accessors 선례를 이 방식으로). 번호가 `[1..8]`, `concept.examples` 길이가 9(8 + compare-table).
- 메타 조건: `filterConcepts([concept], '객체')` 빈 배열, order 425.
- `reviewedAt`을 고정하지 않는다.
- 완료 조건: `npx vitest run app/concepts/structured-clone` 통과. 표의 결과 칸 하나, 행 순서 하나를 바꾸면 각각 실패하는 것을 확인하고 되돌린다.

### 4. 기존 페이지 문구
- json `content.mdx:74` 끝 문장 → "`structuredClone`은 HTML 표준이 정한 호스트 API이며 [structuredClone](/concepts/structured-clone)에서 다룹니다." `meta.ts:122` → "깊은 복사의 대안인 structuredClone은 HTML 표준이 정한 호스트 API이며 structuredClone 개념에서 다룹니다." related에 `structured-clone`.
- spread-destructuring `content.mdx:5`의 "깊은 복사는 별도 개념이고," → "깊은 복사는 [JSON](/concepts/json)과 [structuredClone](/concepts/structured-clone)에서 다루고,". `meta.ts:114` → "깊은 복사는 JSON 개념(JSON.parse(JSON.stringify(x)))과 structuredClone 개념에서 다룹니다." related에 `json`(없으면)·`structured-clone`.
- array-method-pitfalls `meta.ts:102`의 "…예제에 쓰지 않으며, 깊은 복사와 structuredClone도 다루지 않습니다." → "…예제에 쓰지 않습니다. 깊은 복사는 JSON 개념과 structuredClone 개념에서 다룹니다." related에 `json`(없으면)·`structured-clone`.
- 그 밖의 문장은 바꾸지 않는다.
- 완료 조건: `npx vitest run app/concepts tests/content-integrity.test.ts` 통과. `grep -rn "structured-clone\|structuredClone 개념" app/concepts/{json,spread-destructuring,array-method-pitfalls}`가 의도한 위치뿐이다.

### 5. 순서 테스트와 새 페이지 등록
- 2절 "순서와 테스트"의 모든 위치를 68 기준으로. `학습 순서 N / 67`은 N ≥ 59이면 N+1. navigation.spec에 structured-clone 블록(59 / 68, 이전 json, 다음 promise) 추가, json 블록의 다음 링크·promise 블록의 이전 링크 수정. 순위 배열 `'63'` → `'64'`, 개수 18 유지.
- 등록: `helpers.ts:84`(`JSON_PATH`) 근처에 `STRUCTURED_CLONE_PATH`, a11y(정답 확인 버튼 + axe), responsive(가로 스크롤), build-output(`<details` 8개 이상, `<table`, 머리 `확인 식`·`structuredClone(x)`, 표 영역 aria-label), `docs/content-guide.md:225` 목록 끝에 `structured-clone`.
- 완료 조건: `grep -rn "/ 67\|67번째\|toHaveCount(67)\|toBe(67)" tests/e2e app/lib app/components` 0건, `N / 67` 변환 대조 일치, '객체' 검색 계산 대조(18개, 배열 `4,12,19,20,21,22,24,25,27,29,31,32,36,44,46,47,58,64`), `npx vitest run app/lib app/components` 통과.

### 6. 전체 검증
- 6절의 정적 검증, e2e, 브라우저 확인 1~5. 완료 조건: 모두 통과.

## 9. 추가 개선 후보
- Node `structuredClone`과 Chromium 결과 비교(별도 조사).
- transfer 옵션·postMessage 페이지.

## 변경 이력
- 2026-11-18 (Consensus 검토)
  - Error의 `code`가 빠지는 원인을 "UA에 맡김"에서 "표준 Error 기록에 자기 프로퍼티 단계가 없음"으로 고쳤다(Architect HIGH, 메인이 원문 확인). `cause`가 남는 것만 Chromium 결과로 둔다. message는 자기 데이터 프로퍼티일 때만.
  - 예제 6에 `name`을 바꾼 TypeError 서브클래스(→ Error)와 `name`만 바꾼 Error(→ TypeError)를 넣어 "클래스가 아니라 name 값" 규칙을 틀린 모델과 가르게 했다(Critic HIGH, 메인이 Chromium으로 재현).
  - 첫 문단 DataCloneError 목록에 조건(직렬화할 수 없는 플랫폼 객체, 앞 종류에 해당하지 않는 내부 슬롯·이그조틱)을 넣었다(DOMException·Blob 반례).
  - 예제 4의 `#secret in o`를 `o.#secret` 읽기로, 예제 3의 `instanceof Error` 줄을 뺐다. 예제 1에 Set, 비교표에 -0 행을 넣었다. 예제 8에 getter 앞 메서드 경우를 더했다(순서 의존, 메인 재현).
  - 비교표 대조를 행 단위(라벨·결과·확인 식 순서)로 바꿨다. 퀴즈 대조는 `exampleFilesByNumber` 기준.
  - 기존 페이지 수정 대상에 spread-destructuring 5행과 array-method-pitfalls 102행을 더하고, 문구를 "깊은 복사는 JSON과 structuredClone"으로 범위에 맞췄다(미확정 1).
  - 역직렬화 쪽 memory, 표 영역 패턴, error-handling 링크 범위, Promise 언급 처리, DOMException 단순화 문구, category(미확정 3)를 정했다.
  - 재검토는 생략했다. 수정이 모두 검토자가 제시한 실행 결과·원문을 메인이 재확인한 사실 반영이고 구조는 바뀌지 않았다.
- 2026-11-18 (사용자 승인): 계획 승인. 미확정 1~3 모두 기본안 확정 — 기존 3개 페이지 문구 수정, 그 페이지들의 `reviewedAt` 유지, category `objects`.
- 2026-11-18 (사용자 검토): Low 6건 반영 — 결과 realm은 `this`의 relevant realm, 프로퍼티 절에 HasOwnProperty 단계, 내장 상속 문장의 Array는 배열 이그조틱 객체, Map·Set·Date·RegExp 추가 프로퍼티는 기록되지 않음, "일반 객체" 정의 1문장(+ 비교표 설명의 Map은 `{}`), secure context는 표준이 요구하지 않음. 문장 수정만이라 재승인 없음 — 영향 단계 2(본문·meta).

## 구현 진행

- baseline (2026-11-18, `bcc337e`): 직전 작업(class-accessors)의 검증과 같은 소스 트리 — lint 0 / format:check 통과 / typecheck 0 / test 175파일 5450개 / test:build 535개 통과(이후 변경은 reviewedAt 한 줄과 문서, finalize 때 관련 테스트 938개·test:build 재통과). 이후 변경은 계획 문서뿐이다.
- [x] 1. 폴더 뼈대·예제·meta — 예제 9개 출력이 계획 기대와 같다(`true false 0`/`true 1 true`/`true true bigint`/`1`, `true false`/`true false`, `DataCloneError ×3`/`true`, `false true`/`{"x":1,"y":2}`/`undefined undefined`/`1 TypeError`, `false 0`/`{"value":7,…}` `1`/`false true`, `true bad false`/`false Error`/`true TypeError`, `g 0`/`false 3 x`, `RangeError false`/`DataCloneError`, 비교표 12행). 잡히지 않은 예외 0.
  - 계획과 다른 점: 예제 3의 `instanceof DOMException`은 별도 try/catch 줄. 예제 4의 JSON은 필드 2개라 `{"x":1,"y":2}`.
- [x] 2. content.mdx 본문 — 비교표 12행(+ -0 행), 퀴즈 8개, 결과 표, 흔한 오해 3개. "복사해서·공유해서" 0건.
  - 메인이 고친 것: 작성자 메모성 괄호("예제로 확인하지 않았습니다", "표준의 단계에서 읽은 것으로…")를 표준 서술·예제 첫 줄 참조로 바꿈, [Serializable] 플랫폼 객체 문장의 "오류가 나지 않습니다"를 "이 검사에서 DataCloneError가 나지 않습니다"로 한정, private 필드를 명세 모델로 한정, simplifications의 검증하지 않은 괄호("내장 타입으로 돌아갑니다") 삭제와 Promise 링크 이유 문구.
  - 메인이 고친 것(빌드 테스트 실패로 발견): 비교표 `<th scope="col">`가 Prettier로 여러 줄이 되어 MDX가 `<p>`로 감쌌다 → `scope` 없이 한 줄(`<th>`는 한 줄 교훈).
- [x] 3. concept.test.ts — 비교표 행 단위(라벨·결과·확인 식 순서) 대조, 퀴즈 정답(exampleFilesByNumber 기준), 메타 조건. 결과 칸·행 순서 변조 시 각각 실패 확인.
- [x] 4. 기존 페이지 문구 — json 74행·meta, spread-destructuring 5행·meta, array-method-pitfalls meta 102행, related 추가.
- [x] 5. 순서 테스트와 등록 — 67 고정 grep 0건, `N / 67` 41곳 변환 대조 일치, 순위 배열 `…,58,64`, helpers·a11y·responsive·build-output·content-guide.
- [x] 6. 전체 검증 (2026-11-18) — lint 0 / format:check 통과 / typecheck 0 / test 176파일 5496개 / test:build 542개 / e2e navigation 16개 + `-g "structured-clone|structuredClone|홈 학습 순서 보기|/concepts/json|JSON|spread-destructuring|스프레드|array-method-pitfalls|배열 메서드"` 26개 통과. 브라우저(dev 재시작, 375px·다크): pager '59 / 68'·이전 json·다음 promise, 정답 확인 버튼 8개, 문서 폭 375(비교표는 영역 343px 안에서 756px 가로 스크롤).
- 리뷰 1차 (critical-code-review, Opus 교차 검토): High 1 · Medium 5 · Low 6 → 모두 수정(단계 1·2로 되돌림, 메인이 Chromium으로 재현)
  - High: 23행 "클래스로 만든 인스턴스는 … 일반 객체로 처리"에 조건 누락 — 내장 객체를 상속한 클래스는 앞선 종류로 처리(`class M extends Map` 결과 `instanceof Map` true·`M` false, 예제 6도 그 예). → "내장 객체를 상속하지 않은 클래스"로 한정.
  - Medium: 흔한 오해 2의 "같은 이유로 Error도"(원인이 다름), 흔한 오해 1의 "내부 슬롯을 가진 객체"(조건 누락), Error `code`를 "표준상 기록되지 않는다"로 단정(UA 부가 데이터 여지 — 직접 대입한 `cause`는 Chromium에서 남음), 예제 8이 "키 순서" 원인을 증명하지 못함(getter가 앞이면 RangeError, 정수 키는 정의 순서와 무관하게 앞), 9행 "엔진이 값을 베끼는 별도 연산이 있어서가 아님"(확인 불가 단정, 표준도 copy를 씀).
  - Low: Error 분기의 "플랫폼 객체가 아닌" 조건(DOMException은 name 그대로), meta "사용자 정의 에러 클래스는 다루지 않음"과 예제 6의 충돌, 화살표 함수 필드는 DataCloneError, dom-tree-nodes 링크 위치, 배열 "문자열 키", "결과의 프로퍼티는 모두"의 범위(일반 객체), realm 풀이와 단일 realm 전제.
  - 수정 결과: 예제 8을 같은 getter·메서드의 순서만 바꾼 두 객체로 교체(출력 그대로 `RangeError false`/`DataCloneError`), related에 `property-order`, 나머지는 문장 수정. 메인이 클래스 절의 내장 상속 문장 위치("그러니" 앞에 끼어 논리가 끊김)와 Error 절의 중복 문장을 정리. RegExp `lastIndex`의 "표준상 기록되지 않는다"는 RegExp 기록에 UA 부가 데이터 문구가 없어 그대로 둠.
  - 재리뷰: 수정 diff와 클래스·Error·getter 절을 메인이 다시 읽음 → High·Medium 해소. 재검증 lint 0 / format:check 통과 / typecheck 0 / test 5496개 / test:build 542개 / e2e 아래.
  - e2e: navigation 16개, `-g "structured-clone|structuredClone|홈 학습 순서 보기"` 8개 통과(수정 뒤).
- 사용자 검토 (2026-11-18): Low 6건 → 모두 수정. 메인이 HTML 표준 원문(2.7.4 HasOwnProperty 단계, 2.7.11 `this`'s relevant realm, Array exotic 분기, WindowOrWorkerGlobalScope IDL에 [SecureContext] 없음)과 Chromium 탐침(Map·Set·Date·RegExp·Error의 `extra` false·Array true, getter가 뒤 키를 지우고 새 키를 더하면 결과 키 `["a"]`, `iframe.contentWindow.structuredClone({})` 결과 프로토타입이 iframe 쪽, `isSecureContext` false)으로 확인. 재검증 lint 0 / format:check 통과 / typecheck 0 / test 5496개 / test:build 542개 / e2e `-g "structured-clone|structuredClone"` 6개 통과.

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다(order 425, objects, 59번째 / 68, browser 예제 8개 + 비교표 예제 1개, 비교표 12행, 퀴즈 8개, 흔한 오해 3개, `reviewedAt` 2026-11-18). 달라진 점: 비교표 `<th>`를 `scope` 없이 한 줄로(빌드 테스트 실패로 발견), 예제 8을 리뷰 Medium으로 같은 getter·메서드의 순서만 바꾼 두 객체로 교체, related에 `property-order` 추가.

### 코드 리뷰
- Opus 교차 리뷰 High 1(클래스 인스턴스 문장의 조건 누락)·Medium 5·Low 6 모두 수정. 사용자 검토 Low 6건(결과 realm, HasOwnProperty 단계, Array 판별, 추가 프로퍼티 비대칭, "일반 객체" 정의, secure context)을 표준 원문·Chromium으로 확인해 반영. 남긴 지적 없음.

### 후속 작업
- [ ] 로드맵 2의 4번 requestAnimationFrame(다음 개념, 시작 전에 사용자 확인).
- [ ] (선택) 내장 객체 상속 클래스(`class M extends Map`)와 화살표 함수 필드의 DataCloneError를 예제나 concept.test 탐침으로 고정 — 지금은 본문 문장만 있고 Chromium 탐침으로만 확인했다.
- [ ] (선택) class-accessors 정리 표의 td 10칸이 `<p class="my-4">`로 감싸여 렌더되는 문제(여러 줄 td 텍스트) 정리.

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 비교표의 결과 칸은 Node의 `structuredClone`이 아니라 Chromium에서 실행한 `compare-table` 예제 출력(`[라벨, JSON 결과, clone 결과]`)과 concept.test가 행 단위로 대조한다 — 페이지가 Chromium 기준이고 Node와 브라우저가 같다고 단정할 근거가 없어서, 결과 표 자동 대조(result-tables) 대신 전용 테스트를 두었다.
- [Claude 판단] 예제 8은 같은 getter와 메서드를 키 순서만 바꾼 두 객체로 보인다(RangeError / DataCloneError) — 함수가 앞에 있는 경우만 보이면 "DataCloneError가 항상 이긴다"는 틀린 모델과 출력이 같아 증거가 되지 않는다.
- [Claude 판단] Error 절은 "표준의 Error 기록에 `code`를 기록하는 단계가 없다"와 "Chromium에서도 `code`가 남지 않았다"를 나눠 쓰고, `cause`는 Chromium 결과로만 적었다 — 표준이 UA가 부가 데이터를 붙이도록(should) 열어 두었기 때문이다.
- [Claude 판단] 클래스 인스턴스가 일반 객체로 처리된다는 문장을 "내장 객체를 상속하지 않은 클래스"로 한정했다 — `extends Map`·`extends TypeError`는 내부 슬롯(Array는 이그조틱 객체)으로 앞선 분기에 걸려 내장 타입으로 돌아온다(예제 6 (나)).
- [무검토 승인] 기존 3개 페이지(json·spread-destructuring·array-method-pitfalls)의 "다루지 않는다" 문구를 새 페이지 링크로 바꾸고 그 페이지들의 `reviewedAt`은 유지, category `objects`.
- 추가 주제 4개(프로퍼티 어트리뷰트, Error 객체, RegExp·배열, getter 오류 전파), 값별 비교표 + 퀴즈, slug `structured-clone`, 사용자 검토 6건 반영, 새 페이지 `reviewedAt` 기록은 사용자가 정했다.

#### 배경지식
- `structuredClone(value)`는 HTML 표준(2.7.11)의 호스트 API다. StructuredSerializeWithTransfer로 기록을 만들고 `this`의 relevant realm에서 StructuredDeserializeWithTransfer로 새 값을 만든다.
- StructuredSerializeInternal(2.7.4)은 종류를 차례로 검사한다: 원시 값·Date·RegExp·Map·Set·Error·배열·[Serializable] 플랫폼 객체 → 그 밖의 플랫폼 객체와 IsCallable은 DataCloneError → `[[Prototype]]`·`[[Extensible]]`·`[[PrivateElements]]` 외 내부 슬롯이나 이그조틱 객체는 DataCloneError → 나머지(일반 객체)는 EnumerableOwnProperties 키마다 HasOwnProperty 확인 후 `? [[Get]]`.
- 자기 프로퍼티를 순회하는 것은 배열과 일반 객체뿐이라 Map·Set·Date·RegExp·Error에 붙인 추가 프로퍼티는 기록되지 않는다. Error의 결과 종류는 `? Get(value, "name")`이 허용 목록에 있는지로 정해진다.
- 직렬화·역직렬화는 각자 memory 맵으로 이미 처리한 객체를 적어 두므로 공유 참조와 순환의 모양이 결과에 유지된다.

#### 확인 질문
1. 비교표 결과를 result-tables 자동 대조나 Node 실행으로 검증하지 않은 이유는?
   <details><summary>답</summary>페이지 근거가 Chromium 실행이고 Node 결과가 같다고 확인하지 않았다. 그래서 browser 예제 `compare-table.js`의 출력 줄과 표 행을 concept.test가 라벨·두 결과·확인 식 순서까지 대조한다. concept.test "값별 비교표", 3. 구현 전략.</details>
2. 예제 8에서 함수 프로퍼티를 getter 앞에 둔 객체 하나만 보이면 무엇을 증명하지 못하나?
   <details><summary>답</summary>"DataCloneError 검사가 getter보다 항상 먼저"라는 틀린 모델도 같은 출력을 낸다. 순서만 바꾼 객체가 RangeError로 갈라져야 키 순서가 원인이라는 증거가 된다. 구현 진행 리뷰 1차 Medium, getter-throws.js.</details>
3. `class NamedTypeError extends TypeError`의 인스턴스가 `Error`로 돌아오는 이유와, `class M extends Map`이 Map으로 돌아오는 이유는 어떻게 다른가?
   <details><summary>답</summary>둘 다 내부 슬롯으로 앞선 분기에 걸린다. Error 분기는 결과 종류를 `name` 값으로 정하는데 'NamedTypeError'가 허용 목록에 없어 Error가 된다. Map 분기는 엔트리를 기록해 Map으로 만든다. 두 경우 모두 서브클래스 프로토타입은 기록되지 않는다. content.mdx 클래스·Error 절, 예제 6.</details>
4. 배열에 붙인 `extra`는 남는데 Map에 붙인 `extra`는 사라지는 이유는?
   <details><summary>답</summary>표준 2.7.4의 깊은 단계에서 EnumerableOwnProperties 순회는 Map·Set 분기의 "Otherwise"에 있어 배열과 일반 객체에만 적용된다. Chromium 탐침도 Map·Set·Date·RegExp·Error false, Array true. 구현 진행 사용자 검토.</details>
5. `iframe.contentWindow.structuredClone({})`의 결과 프로토타입은 어느 쪽 `Object.prototype`인가?
   <details><summary>답</summary>iframe 쪽이다. 역직렬화 대상 realm이 호출한 쪽이 아니라 메서드의 `this`(그 전역 객체)의 relevant realm이다(2.7.11). meta simplifications, 사용자 검토 1번.</details>
