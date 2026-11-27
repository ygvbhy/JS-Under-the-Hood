# Proxy와 Reflect(proxy-reflect) 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-27
- 기준: `main` @ `3c056fe`

## 0. 요약
- 목적: "Proxy로 감싼 Date의 getTime은 왜 TypeError일까"를 묻는 `proxy-reflect` 페이지를 추가한다(order 307, 학습 순서 55번째/84, ecmascript, category objects). 명세의 Proxy 내부 메서드(트랩이 없으면 대상의 내부 메서드로 넘김, 트랩 결과 검사), 내부 슬롯·private 요소 검사가 this 값을 보는 것, Reflect와 receiver, 취소 검사로 설명하고 Node 실행으로 보인다.
- 범위: 새 개념 폴더(ecmascript 예제 9개, 퀴즈 9개, 결과 표, 연산·트랩 대응 표 5행, 실패 알림 비교 표 5행, 흔한 오해 4개, 시뮬레이터 없음)와 prototype-chain simplifications 1문장 연결. 55번째 이후 순위 +1, 홈 '객체' 검색 20→21, e2e·빌드·content-guide 등록. 공통 코드 소스는 바꾸지 않는다.
- 위험: "프록시는 복사본/대상 자신", "빈 핸들러 프록시는 대상과 똑같다", "트랩만 두면 해결/bind 없이 Reflect.get이면 된다", "target[key]도 receiver를 쓴다", "set이 false면 늘 TypeError", "has로 숨기면 Object.keys·값에서도 사라진다", "revoke하면 null이 된다" 같은 틀린 모델을 심을 수 있다.
- 복잡도: 중간 · Consensus: 수행 (Architect REVISE: MEDIUM 5·LOW 4, Critic REVISE: HIGH 4·MEDIUM 7·LOW 다수 → 메인이 실행으로 재확인해 예제 2·3·4·6·7·8·9 보강, 퀴즈·표·연결 고정 → Critic 2차 PASS, MEDIUM 1·LOW 1 반영)
- 미확정: 없음

## 1. 요구사항
- 로드맵(`.claude/plans/concept-roadmap-extras-5.md` 5번): 제목 "Proxy와 Reflect: Proxy로 감싼 Date의 getTime은 왜 TypeError일까", 책에 장 없음, order 307(`to-primitive` 305와 `iterable-for-of` 310 사이, 2026-11-24 사용자 확정), ecmascript, 표 + 퀴즈. 내부 슬롯 예는 Date(Map은 order 330).
- 사용자 선택(2026-11-27):
  - 핵심 5개: 빈 핸들러는 대상으로 넘긴다, get 트랩, Date처럼 내부 슬롯이 필요한 메서드의 TypeError와 bind로 고치기, Reflect.get의 receiver가 getter의 this를 정하는 것, 취소 가능한 프록시.
  - 추가 4개 모두: set 트랩이 false를 돌려줄 때(sloppy 무시·strict TypeError·Reflect.set false, Reflect.defineProperty와 Object.defineProperty 비교), 불변 조건 위반, has·ownKeys 트랩으로 숨기기, private 필드도 TypeError.
  - 시뮬레이터 없음(표 + 퀴즈).
  - 다루지 않음: Proxy를 쓴 반응형 패턴, Reflect.apply·Reflect.construct·apply/construct 트랩(simplifications에 이름만).
- 유지할 동작: 기존 83개 페이지 내용·순서(55번째 이후 +1 외), 공통 코드.
- 제외 범위: 위 "다루지 않음" 외에 getPrototypeOf·setPrototypeOf·isExtensible·preventExtensions·getOwnPropertyDescriptor·defineProperty·deleteProperty 트랩 각각의 동작(대응 표의 "함께 거치는 트랩" 칸에 이름만 나옴), 함수 프록시, 다른 realm, Object.prototype.toString과 프록시, for...in과 프록시, ownKeys 결과 순서와 대상에 없는 키, 심벌 키, 성능.

## 2. 사실과 추정
### 사실 (코드·실행·명세에서 확인)
- 순위: order가 307보다 작은 개념 54개 → 55번째/84. 이전 `to-primitive`(305, 54번째), 다음 `iterable-for-of`(310, 55→56번째). `tests/e2e/navigation.spec.ts:514-552`가 to-primitive의 다음, iterable-for-of의 이전 링크를 고정한다.
- 홈 '객체' 검색: `filterConcepts`는 title·summary·tags 부분 문자열(`app/lib/concepts.ts:91-100`). 지금 20개(`tests/e2e/navigation.spec.ts:35,50,111,150`), 순위 목록 `['4','13','23','24','25','26','28','29','31','33','35','36','41','54','55','57','58','69','77','80']`(118-139줄). summary에 "대상 객체"가 있어 21개, 목록 `[...,'41','54','55','56','58','59','70','78','81']`.
- 개념 수 83 고정: `app/lib/concepts.test.ts:104,111,112`, `app/components/concept/ConceptPager.test.tsx:18,28`, `tests/e2e/navigation.spec.ts`(카드 수 95·163줄, '83번째' 104줄, 각 블록 '/ 83'), `tests/e2e/responsive.spec.ts:1919`.
- 등록 패턴(3c056fe와 같음): `tests/e2e/helpers.ts`(PATH), `tests/e2e/a11y.spec.ts`(개념 페이지 케이스), `tests/e2e/responsive.spec.ts`(표 region 가로 스크롤), `tests/build/build-output.test.ts:1682` 형식 블록, `docs/content-guide.md:225` 경로 목록. route.tsx는 `app/concepts/error-objects/route.tsx`와 같다.
- 예제 실행기 `tests/helpers/run-example.ts`: vm 새 컨텍스트, sloppy 기본, util.format.
- 선수 개념·문법 order: property-attributes 150(접근자·freeze), prototype-chain 170(Object.create·instanceof·Object.hasOwn 예제), strict-mode 177, this-binding 190(bind·call), class-basics 230(private 필드), class-accessors 245(private은 체인으로 찾지 않음, `app/concepts/class-accessors/content.mdx:45,444`), 화살표 함수 250, function-name 257(`e.constructor.name`), filter 272, date 277, symbol 300(Reflect.ownKeys). 307보다 뒤: try…catch(error-handling 470), JSON(420) — to-primitive 선례(`app/concepts/to-primitive/meta.ts:94,95`)처럼 simplifications에 밝힌다. 구조 분해(320)는 쓰지 않는다.
- Node v24.22.3 vm 실행(8절 예제 원문): 출력은 expectedOutput과 같다. 파일 첫 줄에 `'use strict';`를 붙이면 예제 6만 8번 줄에서 잡히지 않은 TypeError로 끝나고 나머지 8개는 출력이 같다.
- 트랩 기록 실행(모든 트랩을 Reflect로 넘기며 이름을 기록): `p.a` → get / `p.b = 2` → set, getOwnPropertyDescriptor, defineProperty / `'a' in p` → has / `Object.keys(p)` → ownKeys, getOwnPropertyDescriptor / `Reflect.ownKeys(p)` → ownKeys / `JSON.stringify(p)` → get, ownKeys, getOwnPropertyDescriptor, get.
- 명세(현재 초안 = ES2027 초안, ES2026 = tc39.es/ecma262/2026, 17.0 정식판과 22개 절 문구 같음). 절 번호·앵커가 두 판에서 같고 단계 의미도 같다. 차이는 변수·매개변수 이름, 접근자 필드 표기(초안 [[Getter]]/[[Setter]], ES2026 [[Get]]/[[Set]]), 10.5 표 번호(30/29). 앵커는 초안 단일 페이지에서 모두 확인했다.
  - Proxy [[Get]](10.5.8 `sec-proxy-object-internal-methods-and-internal-slots-get-p-receiver`): ValidateNonRevokedProxy → GetMethod(handler, "get") → undefined면 `target.[[Get]](P, Receiver)` → 트랩 호출(target, P, Receiver) → 대상의 자기 프로퍼티가 설정 불가이면서 쓰기 불가 데이터이면 SameValue가 아닐 때 TypeError, 설정 불가 접근자이고 getter가 없으면 undefined가 아닐 때 TypeError.
  - Proxy [[Set]](10.5.9): 트랩이 없으면 `target.[[Set]](P, V, Receiver)`. 트랩 결과 ToBoolean이 false면 false 반환(예외·불변 조건 검사 없음). PutValue(6.2.5.6) 3.e: [[Set]] 결과가 false이고 참조가 strict이면 TypeError, 아니면 무시. 대상이 일반 객체면 OrdinarySet이 Receiver(프록시)의 [[GetOwnProperty]]·[[DefineOwnProperty]]를 불러 프로퍼티를 만든다(트랩 기록과 일치).
  - Proxy [[HasProperty]](10.5.7): 트랩이 false를 돌려줄 때 대상에 그 자기 프로퍼티가 있고, 그것이 설정 불가이거나 대상이 확장 불가이면 TypeError. 예제 8은 설정 가능·확장 가능이라 통과.
  - Proxy [[OwnPropertyKeys]](10.5.11): 결과 중복 TypeError, 설정 불가 키를 빠뜨리면 TypeError, 대상이 확장 불가면 대상 키와 정확히 같아야 함. 대상이 확장 가능하고 설정 불가 키가 없으면 결과를 그대로 반환.
  - Object.keys(20.1.2.19)·SerializeJSONObject(25.5.4.5) → EnumerableOwnProperties(7.3.23): [[OwnPropertyKeys]] 뒤 문자열 키마다 [[GetOwnProperty]]로 열거 가능 여부를 본다(그래서 Object.keys 결과가 ownKeys 결과와 같다고 단정하지 않는다).
  - ValidateNonRevokedProxy(10.5.14): [[ProxyTarget]]이 null이면 TypeError. Proxy.revocable(28.2.2.1)의 revoke는 프록시의 [[ProxyTarget]]·[[ProxyHandler]]를 null로 하고 undefined를 돌려주며, 이미 취소했으면 아무 일도 하지 않고 undefined. 프록시 값(변수) 자체는 그대로다. typeof(13.5.3.1)는 [[Call]] 유무만 보고 내부 메서드를 부르지 않는다.
  - ProxyCreate(10.5.15): MakeBasicObject(« [[ProxyHandler]], [[ProxyTarget]] »)로 만들며 MakeBasicObject가 빈 [[PrivateElements]]도 붙인다. [[DateValue]]는 없다. instanceof는 OrdinaryHasInstance가 프록시의 [[GetPrototypeOf]]를 부르고 트랩이 없어 대상으로 넘어가 true.
  - Date.prototype.getTime(21.4.4.10): this 값에 RequireInternalSlot(…, [[DateValue]])(10.1.15). 두 판 모두 이 형태(thisTimeValue 없음).
  - private: GetValue(6.2.5.5) 3.b가 private 참조면 PrivateGet으로 가서 [[Get]](트랩)을 부르지 않는다. PrivateGet(7.3.30) → PrivateElementFind(7.3.26)가 프록시의 [[PrivateElements]]에서 못 찾아 TypeError.
  - Reflect.get(28.1.5): receiver가 없으면 target, `target.[[Get]](key, receiver)`. Reflect.set(28.1.12)은 [[Set]]의 Boolean. Reflect.defineProperty(28.1.3)는 [[DefineOwnProperty]]의 Boolean. Object.defineProperty(20.1.2.4)는 DefinePropertyOrThrow(7.3.8: false면 TypeError).
  - 인용 가능(두 판·17.0에서 글자 같음): (Q1) "A Proxy object is an exotic object whose essential internal methods are partially implemented using ECMAScript code." (Q2) "A proxy's handler object does not necessarily have a method corresponding to every essential internal method." (Q3) "ECMAScript Proxy objects maintain these invariants by means of runtime checks on the result of traps invoked on the [[ProxyHandler]] object." (Q4) "The value reported for a property must be the same as the value of the corresponding target object property if the target object property is a non-writable, non-configurable own data property." 인용 금지: 10.5의 표 번호 문장, 10.5.8·10.5.9 NOTE의 getter/setter 필드 문장, 10.5의 "internal slots are set to null" 문장(revoke하면 프록시가 null이 된다는 오해를 부름), 알고리즘 단계(변수 이름이 판마다 다름).
- 기존 페이지 연결 판단:
  - 연결: `app/concepts/prototype-chain/meta.ts:114` "Proxy처럼 이 동작을 바꿀 수 있는 특수 객체는 별도 개념입니다." — 새 페이지가 get·set 트랩과 체인 안의 프록시(예제 5)를 다룬다.
  - 연결하지 않음(새 페이지가 그 하위 주제를 다루지 않음): `property-order/meta.ts:71`(Reflect.ownKeys 순서), `:76`(키 목록의 순서 — 예제 8은 순서를 보이지 않음), `:77`·`content.mdx:123,261`(for...in), `symbol/meta.ts:107`(키 순서), `:110`(다루지 않음 문장 아님), `class-inheritance/meta.ts:109`·`array-subclass/meta.ts:102`·`new-operator/meta.ts:106`(Reflect.construct), `structured-clone/meta.ts:127`·`content.mdx:17,472`(복제 오류 예), `iterable-for-of/meta.ts:115`.

### 추정
- 없음

## 3. 구현 전략
- 직전 개념(error-objects)과 같은 구성: 동작 원리 h3 → 예제(파일 import + 퀴즈) → 결과와 이유(줄 기준 문장, 결과 표, 예제별 설명, 연산·트랩 대응 표, 실패 알림 비교 표, 흔한 오해). 시뮬레이터 없음.
- 설명 축은 세 질문이다. (1) 이 연산은 어떤 내부 메서드를 부르고 그 트랩이 있나 — 없으면 대상의 내부 메서드를 부른다. (2) 그 메서드가 this로 무엇을 보나 — 내부 슬롯·private 요소는 대상에 있고 프록시에는 없다. (3) 트랩 결과는 어떤 검사를 거치나 — false 반환, 불변 조건, 취소.
- 예제는 아래 틀린 모델을 보이는 출력으로 배제하도록 짰고, 퀴즈 오답은 그 모델을 예제 원문에 코드로 치환해 실행한 출력이다(8절 퀴즈 표). 잡히지 않은 예외로 끝나는 모델은 "N번 줄에서 TypeError로 멈춘다"로 적는다.
- 버린 대안: 시뮬레이터(사용자 선택), Map 예(order 330), 구조 분해(order 320), 예제 8 하나의 프록시에 has·ownKeys를 함께 두기(어느 트랩이 어느 결과를 바꿨는지 출력으로 가려지지 않음), ownKeys 순서 보이기(property-order 연결을 하지 않으므로 범위 밖).

### 틀린 모델 (실행으로 배제)
- A 복사본(예제 1, `Object.assign({}, target)` 치환 → `1 undefined / false a,b / false`)
- B 대상 자신(예제 1, `target` 치환 → `1 2 / true a,b / true`)
- C in도 get을 거친다(예제 2, has를 `get(...) !== undefined`로 → 마지막 줄 true. 기본값 -1이 truthy라 Boolean 판정 모델도 true)
- M 트랩 결과가 대상에 저장된다(예제 2, 트랩에서 `target[key] = -1` → `1000 -1 -1 / true`)
- D 프록시는 대상과 똑같이 동작한다(예제 3: 프록시 셋을 각각 date로 → `true true / 0 / 0 / 0 / 0`, 예제 4: Reflect.get으로 넘기는 트랩이 있는 프록시를 counter로 → `1 / (빈 줄) / 2 3`). 예제 4는 빈 핸들러가 아니므로 해설은 "Reflect.get으로 넘기는 트랩이 있어도 TypeError"로 쓴다.
- F Reflect.get 트랩이면 해결된다(예제 3, viaReflect에 bind 추가 → `true true / TypeError / 0 / 0 / 0`)
- P get 트랩이 메서드를 대상에 묶어 준다(예제 4, 트랩에서 bind → `1 / increment / 2 3`)
- G1 target[key]도 receiver를 쓴다(예제 5 → `a b`), G2 receiver를 빼도 같다(→ `base base`, "receiver는 항상 프록시" 모델도 같은 출력)
- H1 false면 늘 TypeError(예제 6 strict 접두 실행 → 8번 줄에서 TypeError로 멈춤), H2 false여도 대입된다(트랩에서 대입 → `1 1 / …`)
- J1 트랩은 아무 값이나 돌려준다(예제 7, freeze 없이 → `2 / 2 / 1 / 2 2`), J2 설정 불가면 쓰기 여부와 무관하게 걸린다(모델 검사 함수로 → 4번째 출력 줄에서 TypeError로 멈춤)
- K1 has가 Object.keys에도 적용(예제 8, hideIn에 ownKeys 추가 → 첫 줄 `false name`), K2 ownKeys가 in에도 적용(hideKeys에 has 추가 → 둘째 줄 `false …`), K3 숨기면 값도 못 읽는다(get 추가 → 셋째 줄 `undefined undefined true`)
- L1 revoke하면 프록시가 null이 된다(예제 9, revoke 대신 `proxy = null` → `1 / false true object / …`), L2 revoke는 대상으로 넘기는 것을 막지 않는다(revoke 제거 → `1 / true false object / 1 / true / undefined`)

## 4. 변경 파일
- 추가: `app/concepts/proxy-reflect/`(meta.ts, content.mdx, route.tsx, concept.test.ts, examples 9개).
- 수정(연결): `app/concepts/prototype-chain/meta.ts:114` 문장, related += 'proxy-reflect'. reviewedAt 그대로.
- 수정(순위·등록): `app/lib/concepts.test.ts`, `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/build/build-output.test.ts`, `docs/content-guide.md`.
- 계획 문서: `.claude/plans/proxy-reflect.md`(이 문서), finalize 때 `.claude/plans/concept-roadmap-extras-5.md` 5번 행·진행 기록.
- 변경하지 않음: 공통 코드 소스, 그 밖의 개념 페이지.

## 5. 위험 요소
- 예제 6의 sloppy 의존 → 본문(예제 6 설명)과 simplifications에 sloppy 전제와 strict·ES 모듈에서는 8번 줄이 TypeError라는 것을 밝히고, concept.test가 나머지 8개 strict 출력 같음·예제 6 TypeError 종료를 단언한다(작업 순서 4).
- 과잉 일반화: 불변 조건은 예제 7의 네 경우(설정 불가+쓰기 불가는 다른 값이면 TypeError, 같은 값은 허용, 한쪽만이면 허용, 대상에 없는 키는 허용)만 단정. 숨기기는 "in·Object.keys·JSON.stringify에서 안 보이고 값 읽기·Object.hasOwn은 그대로"(예제 8)로 한정. bind 고치기는 "메서드 호출의 this만 대상으로 바꾸는 최소 형태, 읽을 때마다 새 함수"로 한정(작업 순서 2·3).
- 예제 5의 대입 `a._name = 'a'`도 프록시의 [[Set]]을 거친다(receiver a, 트랩 없음 → 대상 [[Set]] → a에 정의) → "a에 바로 대입" 같은 서술 금지(작업 순서 3).
- 예제 1의 `proxy.b = 2`가 대상에 b를 만드는 경로는 대상의 [[Set]]이 receiver(프록시)의 [[DefineOwnProperty]]를 부르고 그것이 대상으로 넘어가는 것 → 대응 표 "함께 거치는 트랩" 칸에 적는다.
- JSON(420)·try…catch(470)가 뒤 → simplifications에 밝힌다.
- MDX 중괄호 → 제목·결과 표·퀴즈의 `{"name":"kim"}` 등은 JS 문자열로(`<code>{'…'}</code>`, `error-objects/content.mdx:219` 선례). 표 칸에 `<` 금지.
- 순위 갱신 누락 → 잔존 grep(작업 순서 4 완료 조건)과 e2e.

## 6. 검증 방법
- 정적: lint, format:check, typecheck, npm test, test:build, navigation e2e, `npx playwright test -g "proxy-reflect|Proxy와 Reflect|홈 학습 순서 보기"`.
- 브라우저(dev 서버 재시작 후): (1) /concepts/proxy-reflect 학습 순서 55 / 84, 이전 to-primitive·다음 iterable-for-of. (2) 결과 표 9행, 대응 표 5행, 실패 비교 표 5행. (3) 퀴즈 2개 이상 정답 피드백. (4) 375px에서 scrollWidth ≤ innerWidth. (5) 콘솔 오류 없음. (6) h3·표·퀴즈 텍스트에 중괄호 소실 없음(`{"name":"kim"}`). (7) prototype-chain에 새 문구 렌더.

## 7. 미확정 사항
- 없음

## 8. 작업 순서

### 1. 예제 9개와 meta
- 대상: `app/concepts/proxy-reflect/examples/*.js`, `meta.ts`, `route.tsx`.
- 변경: 아래 예제를 글자 그대로 만든다(examples는 Prettier 제외라 줄 번호가 고정된다).
- meta:
  - slug `proxy-reflect`, title "Proxy와 Reflect: Proxy로 감싼 Date의 getTime은 왜 TypeError일까", category objects, order 307, reviewedAt null.
  - summary "Proxy가 대상 객체의 내부 메서드를 트랩으로 가로채는 범위와 Date 메서드 호출·private 필드 접근이 프록시에서 TypeError가 되는 이유, Reflect의 receiver, 실패 알림, 불변 조건, 취소를 실행으로 확인합니다."
  - goals(백틱 금지):
    1. 프록시의 연산이 같은 이름의 트랩을 부르고, 트랩이 없으면 대상의 내부 메서드로 넘어간다는 것과 프록시가 대상의 복사본도 대상 자신도 아니라는 것을 설명할 수 있다.
    2. Date 메서드 호출과 private 필드 접근이 프록시에서 TypeError가 되는 이유를 this 값이 프록시라는 것으로 설명하고, 메서드를 대상에 bind해 고칠 수 있다.
    3. Reflect.get의 receiver가 상속한 getter의 this를 정한다는 것과 target[key]로 넘길 때와의 차이를 예측할 수 있다.
    4. set 트랩이 false를 돌려줄 때 sloppy mode 대입, strict mode 대입, Reflect.set의 결과를 구분하고, Reflect.defineProperty와 Object.defineProperty가 실패를 알리는 방식을 비교할 수 있다.
    5. get 트랩의 불변 조건이 걸리는 경우, has와 ownKeys 트랩이 바꾸는 결과의 범위, 취소한 프록시에서 던지는 연산과 던지지 않는 typeof를 예측할 수 있다.
  - prerequisites: property-attributes, prototype-chain, this-binding, class-basics, date. related: prototype-chain, property-attributes, strict-mode, this-binding, class-basics, class-accessors, date, symbol, to-primitive, json, structured-clone, error-handling.
  - tags: Proxy, Reflect, 프록시, 트랩, handler, receiver, Reflect.get, Reflect.set, Reflect.defineProperty, Proxy.revocable, revoke, 내부 메서드, 내부 슬롯, 불변 조건, invariant, private 필드, Date.
  - simplifications(이 내용으로 쓴다):
    1. Node vm 스크립트(sloppy) 실행, console은 호스트 API. 예제 6을 뺀 모든 예제는 파일 첫 줄에 'use strict';를 붙여도 출력이 같다. 예제 6은 sloppy mode를 전제로 하며, strict mode 코드나 ES 모듈에서는 8번 줄의 대입이 TypeError를 던진다. 실행 환경은 Node 하나이며 다른 엔진은 확인하지 않았다.
    2. 예제의 try…catch는 예외 처리 개념에서, JSON.stringify는 JSON 개념에서 다룬다. 이 페이지는 JSON.stringify가 키 목록을 얻을 때 [[OwnPropertyKeys]](ownKeys 트랩)를 거친다는 것만 보이며 replacer가 없는 경우 기준이다.
    3. 트랩은 get·set·has·ownKeys만 동작을 설명한다. getOwnPropertyDescriptor·defineProperty는 대응 표에서 함께 불리는 트랩으로 이름만 보이고, getPrototypeOf·setPrototypeOf·isExtensible·preventExtensions·deleteProperty·apply·construct 트랩, Reflect.apply·Reflect.construct, 함수 프록시, Proxy를 쓴 반응형 패턴, 다른 realm은 다루지 않는다.
    4. 트랩이 받는 키는 심벌일 수 있지만 예제는 문자열 키만 쓴다(예제 8은 String(key)로 받는다). ownKeys 결과의 순서와 대상에 없는 키를 넣는 경우는 다루지 않는다.
    5. 불변 조건은 get 트랩의 데이터 프로퍼티 조건(예제 7)만 실행으로 보이고, has·ownKeys·set의 불변 조건은 명세를 요약해 이름만 든다. 예제 8의 대상은 확장 가능하고 프로퍼티가 모두 설정 가능해 불변 조건에 걸리지 않는다.
    6. 내부 슬롯과 private 요소는 명세의 객체 모델이며 엔진의 저장 방식이 아니다. 프록시가 가진 슬롯은 명세의 ProxyCreate가 정한 [[ProxyHandler]]·[[ProxyTarget]]과 모든 객체에 있는 [[PrivateElements]]다.
    7. 명세 링크는 현재 초안(tc39.es/ecma262)을 가리킨다. 영어 인용은 초안과 ES2026판에서 문장이 같은 것만 쓰고, 알고리즘 단계는 판마다 변수 이름이 달라 풀어 썼다.
  - references: 명세 — Proxy Object Internal Methods and Internal Slots(`sec-proxy-object-internal-methods-and-internal-slots`), [[Get]](`…-get-p-receiver`), [[Set]](`…-set-p-v-receiver`), Invariants of the Essential Internal Methods(`sec-invariants-of-the-essential-internal-methods`), Proxy.revocable(`sec-proxy.revocable`), Reflect.get(`sec-reflect.get`), Reflect.set(`sec-reflect.set`), PutValue(`sec-putvalue`), RequireInternalSlot(`sec-requireinternalslot`), PrivateGet(`sec-privateget`), Date.prototype.getTime(`sec-date.prototype.gettime`). MDN — Proxy, Reflect, Proxy.revocable(), handler.get()(en-US, 2026-11-27 200 응답 확인).
- 완료 조건: 예제 9개가 아래 원문과 diff 없음, `npx vitest run tests/examples.test.ts` 통과, summary 160자 이하.

#### 예제 1: `forward.js` — 빈 핸들러는 대상으로 넘긴다

```js
const target = { a: 1 };
const proxy = new Proxy(target, {});
proxy.b = 2;
console.log(proxy.a, target.b);
console.log('b' in target, Object.keys(proxy).join());
console.log(proxy === target);
```

expectedOutput: `['1 2', 'true a,b', 'false']`

#### 예제 2: `get-trap.js` — get 트랩

```js
const prices = { apple: 1000 };
const proxy = new Proxy(prices, {
  get(target, key, receiver) {
    if (key in target) return Reflect.get(target, key, receiver);
    return -1;
  },
});
console.log(proxy.apple, proxy.banana, prices.banana);
console.log('banana' in proxy);
```

expectedOutput: `['1000 -1 undefined', 'false']`

#### 예제 3: `date-slot.js` — 내부 슬롯과 this

```js
const date = new Date(0);
const proxy = new Proxy(date, {});
console.log(proxy instanceof Date, proxy.getTime === Date.prototype.getTime);
try {
  console.log(proxy.getTime());
} catch (e) {
  console.log(e.constructor.name);
}
console.log(proxy.getTime.call(date));
const viaReflect = new Proxy(date, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  },
});
try {
  console.log(viaReflect.getTime());
} catch (e) {
  console.log(e.constructor.name);
}
const bound = new Proxy(date, {
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
console.log(bound.getTime());
```

expectedOutput: `['true true', 'TypeError', '0', 'TypeError', '0']`

#### 예제 4: `private-field.js` — private 필드

```js
class Counter {
  #count = 0;
  increment() {
    this.#count += 1;
    return this.#count;
  }
}
const counter = new Counter();
const seen = [];
const proxy = new Proxy(counter, {
  get(target, key, receiver) {
    seen.push(String(key));
    return Reflect.get(target, key, receiver);
  },
});
try {
  console.log(proxy.increment());
} catch (e) {
  console.log(e.constructor.name);
}
console.log(seen.join());
console.log(proxy.increment.call(counter), counter.increment());
```

expectedOutput: `['TypeError', 'increment', '1 2']`

#### 예제 5: `receiver.js` — receiver가 getter의 this를 정한다

```js
const base = {
  _name: 'base',
  get name() {
    return this._name;
  },
};
console.log(Reflect.get(base, 'name'), Reflect.get(base, 'name', { _name: 'other' }));
const viaReflect = new Proxy(base, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  },
});
const viaIndex = new Proxy(base, {
  get(target, key) {
    return target[key];
  },
});
const a = Object.create(viaReflect);
a._name = 'a';
const b = Object.create(viaIndex);
b._name = 'b';
console.log(a.name, b.name);
```

expectedOutput: `['base other', 'a base']`

#### 예제 6: `set-false.js` — set 트랩의 false와 Reflect의 boolean (sloppy 전제)

```js
let calls = 0;
const readonly = new Proxy({}, {
  set() {
    calls += 1;
    return false;
  },
});
readonly.x = 1;
console.log(calls, readonly.x);
console.log(Reflect.set(readonly, 'x', 1));
function strictAssign() {
  'use strict';
  try {
    readonly.x = 1;
    console.log('assigned');
  } catch (e) {
    console.log(e.constructor.name);
  }
}
strictAssign();
const frozen = Object.freeze({});
console.log(Reflect.defineProperty(frozen, 'x', { value: 1 }));
try {
  Object.defineProperty(frozen, 'x', { value: 1 });
  console.log('defined');
} catch (e) {
  console.log(e.constructor.name);
}
```

expectedOutput: `['1 undefined', 'false', 'TypeError', 'false', 'TypeError']`

#### 예제 7: `invariant.js` — 불변 조건

```js
const frozen = Object.freeze({ level: 1 });
const liar = new Proxy(frozen, {
  get() {
    return 2;
  },
});
try {
  console.log(liar.level);
} catch (e) {
  console.log(e.constructor.name);
}
console.log(liar.other);
const honest = new Proxy(frozen, {
  get(target, key) {
    return key === 'level' ? 1 : 2;
  },
});
console.log(honest.level);
const writableOnly = Object.defineProperty({}, 'level', { value: 1, writable: true, configurable: false });
const configurableOnly = Object.defineProperty({}, 'level', { value: 1, writable: false, configurable: true });
const alwaysTwo = {
  get() {
    return 2;
  },
};
console.log(new Proxy(writableOnly, alwaysTwo).level, new Proxy(configurableOnly, alwaysTwo).level);
```

expectedOutput: `['TypeError', '2', '1', '2 2']`

#### 예제 8: `hide.js` — has와 ownKeys로 숨기기

```js
const user = { name: 'kim', _token: 'abc' };
const hideIn = new Proxy(user, {
  has(target, key) {
    return !String(key).startsWith('_') && key in target;
  },
});
const hideKeys = new Proxy(user, {
  ownKeys(target) {
    return Reflect.ownKeys(target).filter((key) => !String(key).startsWith('_'));
  },
});
console.log('_token' in hideIn, Object.keys(hideIn).join());
console.log('_token' in hideKeys, Object.keys(hideKeys).join(), JSON.stringify(hideKeys));
console.log(hideIn._token, hideKeys._token, Object.hasOwn(hideKeys, '_token'));
```

expectedOutput: `['false name,_token', 'true name {"name":"kim"}', 'abc abc true']`

#### 예제 9: `revocable.js` — 취소 가능한 프록시

```js
const pair = Proxy.revocable({ a: 1 }, {});
const proxy = pair.proxy;
console.log(proxy.a);
pair.revoke();
console.log(proxy === pair.proxy, proxy === null, typeof proxy);
try {
  console.log(proxy.a);
} catch (e) {
  console.log(e.constructor.name);
}
try {
  console.log('a' in proxy);
} catch (e) {
  console.log(e.constructor.name);
}
console.log(pair.revoke());
```

expectedOutput: `['1', 'true false object', 'TypeError', 'TypeError', 'undefined']`

### 2. 본문 동작 원리
- 대상: `content.mdx` 도입 문단과 "## 동작 원리".
- h3(이 제목 그대로, 맨 중괄호 없음):
  1. 프록시는 연산을 트랩으로 받는다 — 연산마다 내부 메서드([[Get]]·[[Set]]·[[HasProperty]]·[[OwnPropertyKeys]])가 정해져 있고 같은 이름의 트랩이 있으면 그것을 부르며 없으면 대상의 내부 메서드로 넘긴다(Q1 또는 Q2 인용). 프록시는 대상과 다른 객체다. instanceof가 true인 것은 [[GetPrototypeOf]]가 트랩 없이 대상으로 넘어가서다.
  2. Reflect는 기본 동작을 함수로 부른다 — Reflect.get·set·has·ownKeys가 같은 내부 메서드를 부르고, Reflect.get의 receiver를 생략하면 대상이 receiver다.
  3. receiver는 getter의 this가 된다 — 예제 5: `a.name`은 a에 없어 부모인 프록시의 [[Get]](receiver a)을 부르고, 그 전 `a._name = 'a'`도 프록시의 [[Set]](receiver a)을 거쳐 대상의 [[Set]]이 a에 프로퍼티를 만든다. Reflect.get(target, key, receiver)는 getter를 a로, target[key]는 대상으로 부른다.
  4. 내부 슬롯과 private 요소는 대상에 있다 — getTime은 this에 RequireInternalSlot([[DateValue]]), 프록시에는 그 슬롯이 없다. private 접근은 [[Get]]을 부르지 않고 PrivateGet이 this(프록시)의 private 요소를 찾는다([클래스의 getter와 setter](/concepts/class-accessors)가 보인 체인으로 찾지 않는 규칙과 같은 성질). 고치기: 메서드를 대상에 bind(최소 형태 한정).
  5. 트랩 결과는 검사를 거친다 — set 트랩 false → [[Set]]이 false, PutValue는 strict일 때만 TypeError, Reflect.set·Reflect.defineProperty는 Boolean, Object.defineProperty는 DefinePropertyOrThrow로 TypeError. 불변 조건(Q3, Q4 인용)은 예제 7의 경우만 단정.
  6. has와 ownKeys는 서로 다른 연산을 바꾼다 — has는 in만, ownKeys는 Object.keys·JSON.stringify의 키 목록만(Object.keys는 키마다 [[GetOwnProperty]]도 부름). 값 읽기·Object.hasOwn은 그대로.
  7. 취소한 프록시 — revoke는 프록시의 대상·핸들러 슬롯을 비우고 프록시 값은 그대로 둔다. 그 뒤 내부 메서드를 부르는 연산은 ValidateNonRevokedProxy에서 TypeError, typeof는 내부 메서드를 부르지 않아 'object'. 두 번째 revoke는 아무 일도 하지 않고 undefined.
  8. 이 페이지가 다루지 않는 것.
- 주의: 접근자 필드는 [[Getter]] 표기 대신 getter/setter로 쓴다. "내부 슬롯이 없다"는 ProxyCreate의 슬롯 목록으로만. 독자용 본문에 "테스트"·eval 금지.
- 완료 조건: 인용문이 2절 Q1~Q4 안(concept.test), h3가 위 8개와 같음, `npm run format:check` 통과.

### 3. 예제·퀴즈·결과와 이유
- 예제 9개를 `file=` 블록으로, 각 예제 아래 PredictQuiz(choices JSX 배열, explanation에 큰따옴표 금지, 해설은 각 오답의 모델 이름을 밝힘). 퀴즈(질문은 출력 기준):

| 퀴즈 | 질문 | 선택지(순서대로) | answer |
| - | - | - | - |
| 1 | 예제 1의 전체 출력 | `1 undefined / false a,b / false`(A), `1 2 / true a,b / false`(정답), `1 2 / true a,b / true`(B) | 1 |
| 2 | 예제 2의 전체 출력 | `1000 -1 undefined / false`(정답), `1000 -1 undefined / true`(C), `1000 -1 -1 / true`(M) | 0 |
| 3 | 예제 3의 전체 출력 | `true true / 0 / 0 / 0 / 0`(D), `true true / TypeError / 0 / 0 / 0`(F), `true true / TypeError / 0 / TypeError / 0`(정답) | 2 |
| 4 | 예제 4의 전체 출력 | `1 / increment / 2 3`(P), `TypeError / increment / 1 2`(정답), `1 / 빈 줄 / 2 3`(D) | 1 |
| 5 | 예제 5의 마지막 출력 줄(a.name과 b.name) | `a b`(G1), `base base`(G2), `a base`(정답) | 2 |
| 6 | 예제 6의 전체 출력 | `1 undefined / false / TypeError / false / TypeError`(정답), `1 1 / false / TypeError / false / TypeError`(H2), `아무것도 출력하지 않고 8번 줄에서 TypeError로 멈춘다`(H1) | 0 |
| 7 | 예제 7의 전체 출력 | `2 / 2 / 1 / 2 2`(J1), `TypeError / 2 / 1 / 2 2`(정답), `TypeError / 2 / 1 / 그다음 줄에서 TypeError로 멈춘다`(J2) | 1 |
| 8 | 예제 8의 전체 출력 | `false name / true name {"name":"kim"} / abc abc true`(K1), `false name,_token / false name {"name":"kim"} / abc abc true`(K2), `false name,_token / true name {"name":"kim"} / abc abc true`(정답), `false name,_token / true name {"name":"kim"} / undefined undefined true`(K3) | 2 |
| 9 | 예제 9의 전체 출력 | `1 / true false object / 1 / true / undefined`(L2), `1 / true false object / TypeError / TypeError / undefined`(정답), `1 / false true object / TypeError / TypeError / undefined`(L1) | 1 |

- 결과와 이유: 첫머리 줄 기준 문장("이 절의 '첫 줄', '둘째 줄'은 출력의 줄이고, 'N번 줄'은 코드의 줄 번호입니다") → 결과 표 9행(`예제 N: 제목` / 출력을 ` / `로 이음) → 예제별 설명(각 줄이 어떤 모델을 배제하는지, 위험 요소의 한정 문구 포함) → 대응 표 → 실패 비교 표 → 흔한 오해 4개.
- 연산·트랩 대응 표(aria-label "연산과 트랩 대응 표(좁은 화면에서는 가로로 스크롤할 수 있습니다)", 열: 연산 / 먼저 부르는 내부 메서드 / 트랩 / 같은 동작의 Reflect 함수 / 기록된 트랩 전체):
  1. `p.a` / [[Get]] / get / Reflect.get / get
  2. `p.b = 2` / [[Set]] / set / Reflect.set / set, getOwnPropertyDescriptor, defineProperty
  3. `'a' in p` / [[HasProperty]] / has / Reflect.has / has
  4. `Object.keys(p)` / [[OwnPropertyKeys]] / ownKeys / Reflect.ownKeys / ownKeys, getOwnPropertyDescriptor
  5. `Reflect.ownKeys(p)` / [[OwnPropertyKeys]] / ownKeys / Reflect.ownKeys / ownKeys
  - 표 아래 한 문장: 마지막 열은 모든 트랩을 Reflect로 넘기며 이름을 기록하는 프록시(대상 `{ a: 1 }`)로 실행한 결과다.
- 실패 알림 비교 표(aria-label "실패 알림 비교 표(…)", 열: 코드 / 실패 신호 / 결과, 예제 6과 같은 객체):
  1. sloppy mode의 `readonly.x = 1` / [[Set]]이 false / 조용히 무시
  2. strict mode의 `readonly.x = 1` / [[Set]]이 false / TypeError
  3. `Reflect.set(readonly, 'x', 1)` / [[Set]]이 false / false 반환
  4. `Object.defineProperty(frozen, 'x', { value: 1 })` / [[DefineOwnProperty]]가 false / TypeError
  5. `Reflect.defineProperty(frozen, 'x', { value: 1 })` / [[DefineOwnProperty]]가 false / false 반환
- 흔한 오해(Callout misconception, 제목 그대로): "프록시는 대상을 복사한 객체다"(예제 1) / "빈 핸들러 프록시는 대상과 똑같이 동작한다"(예제 3·4) / "트랩에서 target[key]로 넘기면 Reflect.get과 같다"(예제 5) / "has 트랩으로 숨기면 그 프로퍼티는 보이지 않는다"(예제 8).
- 표는 region + aria-label + tabIndex, 코드 칸 `[&_code]:whitespace-nowrap`, 표 칸 `<` 금지, 중괄호가 든 칸은 JS 문자열.
- 완료 조건: result-tables·content-integrity 통과, 375px 가로 넘침 없음.

### 4. concept.test·순서·등록
- concept.test(error-objects 구조를 따른다):
  - 3절 모델을 예제 원문 치환으로 실행해 퀴즈 오답 문자열과 같음(치환은 블록마다 정확한 리터럴 문자열로 한다. 예제 3의 D는 2번 줄 `new Proxy(date, {})`, 10~14번 줄 블록, 20~25번 줄 블록을 각각 `date`로 바꾼다. 여러 줄을 한 정규식으로 삼키면 다른 블록까지 지워진다(계획 검토 2차). 빈 출력 줄은 "빈 줄", 잡히지 않은 예외는 해당 문구로 정규화. J2는 get 트랩을 "대상 자기 프로퍼티가 설정 불가이면 값이 다를 때 TypeError"를 직접 던지는 함수로 바꾼 실행).
  - 퀴즈 정답 = expectedOutput을 ` / `로 이은 것(퀴즈 5는 마지막 줄).
  - 대응 표: 각 행 연산을 기록 프록시로 실행해 마지막 열과 같음. 실패 비교 표: 행마다 코드를 실행(strict 행은 함수 안 'use strict')해 결과 칸과 같음.
  - strict 접두: 예제 6 외 8개 출력 같음, 예제 6은 TypeError로 끝남.
  - filterConcepts([concept], '객체')에 걸림, 인용문 목록 = Q1~Q4 중 쓴 것, 제목 맨 중괄호 금지, 본문에 "테스트"·eval 없음, 한정 문구(예: "Object.hasOwn", "최소 형태", "프록시 값은 그대로", "a에 바로" 없음).
- 순위·등록: 83→84, '83번째'→'84번째', 55번째 이후 +1, to-primitive 다음 링크·iterable-for-of 이전 링크 → proxy-reflect, 새 블록 55 / 84, '객체' 검색 20→21(35·50·111·150줄)과 순위 목록, ConceptPager 1/84·84/84, helpers `PROXY_REFLECT_PATH`, a11y '개념 페이지: Proxy와 Reflect', responsive 표 region 3개 가로 스크롤, build-output '프리렌더 (proxy-reflect)' 블록, content-guide 경로 목록.
- 완료 조건: concept.test 통과, `grep -rnE "/ 83'|83번째|toBe\(83\)|toHaveCount\(83\)" app tests` 0건, '객체' 검색의 `toHaveCount(20)` 0건.

### 5. 연결
- `app/concepts/prototype-chain/meta.ts:114`: "Proxy처럼 이 동작을 바꿀 수 있는 특수 객체는 별도 개념입니다." → "Proxy가 이 동작을 트랩으로 바꾸는 것은 Proxy와 Reflect 개념에서 다루고, 그 밖의 특수 객체는 별도 개념입니다." related += 'proxy-reflect'.
- 완료 조건: diff가 위와 같음, reviewedAt 그대로, content-integrity 통과.

### 6. 전체 검증
- AGENTS.md 검증 순서(lint → format:check → typecheck → npm test → test:build) + navigation e2e + `-g "proxy-reflect|Proxy와 Reflect|홈 학습 순서 보기"` + 6절 브라우저 시나리오.

## 변경 이력
- 2026-11-27 (구현 중 메인 검증): 계획 2단계의 "같은 이름의 트랩"은 [[HasProperty]]→has, [[OwnPropertyKeys]]→ownKeys처럼 이름이 다른 대응이 있어 명세와 어긋난다 → 본문·goals를 "대응하는 트랩"으로 고침. "has는 in만, ownKeys는 Object.keys·JSON.stringify만"은 Reflect.has·배열 메서드·Object.getOwnPropertyNames 등도 같은 내부 메서드를 거쳐 과잉 일반화 → "이 예제의 연산 가운데"/"[[HasProperty]]를 부르는 연산(예제 8에서는 in)"으로 한정. "target[key]는 receiver를 쓰지 않는다"는 대상 자신을 receiver로 쓰므로 "트랩이 받은 receiver를 쓰지 않는다"로. 예제 9 마지막 줄은 출력이 보이는 범위("예외 없이 undefined")로. 요구사항·범위 변화 없음(재승인 불필요) — 영향 단계 2·3
- 2026-11-27 (리뷰 지적, Opus 명세 교차 리뷰 M1~M5·L1~L3): summary "대상 객체의 내부 메서드를 가로채는" → "대상 객체를 감싼 Proxy가 연산을 가로채는"('객체' 검색 21건 유지), "모든 연산을 대상으로" → "모든 내부 메서드 호출을"(private·슬롯 확인은 넘어가지 않음 명시), getter receiver를 "상속한"으로 좁히지 않음, 예제 4의 D 모델을 "핸들러를 무시하고 대상 자체를 다룬다"로 이름 바꾸고 퀴즈 1번 선택지에 "메서드 호출이 성공한다는 모델도 같은 출력" 병기, 대응 표 열 "같은 동작의 Reflect 함수" → "같은 내부 메서드를 부르는 Reflect 함수", 도입 질문 "그 메서드가 this로" → "읽어 온 함수를 부를 때 this가", 불변 조건 주어(객체의 불변 조건·대상 상태와 대조), simplifications 2번에 트랩 순서 포함. 사용자 심각도 기준(명세 오개념 위험=높음)으로 모두 반영 — 영향 단계 1·2·3
- 2026-11-27 (리뷰 지적, 사용자 외부 검토 6건): ① bind 해법은 메서드 호출만 고침 — private 필드·내부 슬롯 getter는 트랩의 Reflect.get이 프록시를 this로 실행해 TypeError, receiver에 대상을 넘기면 예제 5의 동작을 잃음(새 문단). Map·Set·Promise는 order 330·430으로 이 페이지보다 뒤라 이름을 들지 않고 "내부 슬롯을 확인하는 내장 메서드/getter"로 일반화 ② bind가 동결 대상 메서드에서 get 불변 조건에 걸림 ③ set 트랩 판정은 반환값의 불리언 변환(return 누락 undefined 포함, 대상에 저장돼도 실패), return Reflect.set 권장 ④ Array.isArray(IsArray)는 프록시의 대상을 보고 JSON.stringify도 같음, 취소하면 TypeError ⑤ 취소 뒤 typeof는 취소 전과 같은 값(이 예제에서 'object') ⑥ 불변 조건의 같은 값은 SameValue(NaN 통과, 0에 -0 TypeError, property-attributes 링크). 모두 Node 실행으로 재현 확인, concept.test '본문의 실행 근거'에 6개 단언 추가. 요구사항·범위 변화 없음 — 영향 단계 2·4
- 2026-11-27 (리뷰 지적, 사용자 재검토 4건): bind와 get 불변 조건 충돌을 "대상의 자기 프로퍼티"로 한정하고 상속 메서드는 동결해도 걸리지 않는다고 명시(실행: 동결 객체 리터럴 f TypeError, 동결 클래스 인스턴스 상속 메서드·동결 Date getTime 정상). 끼운 문장 뒤 지시어 3곳 정리: "이때 예외는 아직 없습니다"를 [[Set]] false 문장 바로 뒤로, undefined·return Reflect.set 설명은 실패 알림 문단 뒤 별도 문단으로, "bind와 같은 동작"을 "다른 this로 부를 수 없게 됩니다" 바로 뒤로, Array.isArray 수식어를 "프록시의 내부 메서드를 부르지 않는"으로. 근거 테스트에 상속 메서드 2단언 추가 — 영향 단계 2·4

## 구현 진행

- baseline (2026-11-27, `3c056fe`): lint 경고·오류 0 / format:check 통과 / typecheck 오류 0 / npm test 197 파일 6739개 통과
- [x] 1. 예제 9개와 meta — 예제 원문 diff 없음(서브에이전트 스크립트 추출 + 메인 읽기 확인), summary 135자, examples.test 통과
- [x] 2. 본문 동작 원리 — h3 8개 계획과 같음, 인용 Q1~Q4, 메인 검토로 대응 트랩·범위 문구 수정(변경 이력)
- [x] 3. 예제·퀴즈·결과와 이유 — 퀴즈 9개 선택지·answer 계획 표와 같음, 표 3개 aria-label 확인, content-integrity·result-tables 통과
- [x] 4. concept.test·순서·등록 — concept.test 83개 통과, 83 잔존 grep 0건, '객체' 21건 목록은 listConcepts로 계산 확인, build-output 퀴즈 단언을 정답 9개 대조로 보강(메인)
- [x] 5. 연결 — prototype-chain/meta.ts:115 문장·related diff가 계획과 같음, reviewedAt 그대로
- [x] 6. 전체 검증 — lint·format:check·typecheck 통과, npm test 198 파일 6853개, test:build 663개, navigation e2e 16개, `-g "proxy-reflect|Proxy와 Reflect|홈 학습 순서 보기"` 8개 통과(리뷰 수정 뒤 재실행). 브라우저(dev 재시작): 55 / 84·이전 to-primitive·다음 iterable-for-of, 표 9·5·5행, 퀴즈 정답·오답 피드백 3개, 375px scrollWidth 375/375, 콘솔 오류 없음, `{"name":"kim"}`·`{ proxy, revoke }`·`{ _name: 'other' }` 렌더, prototype-chain 새 문장 렌더
- 리뷰 1차(메인): 본문의 "같은 이름의 트랩"·has/ownKeys 범위 과잉 일반화·target[key] receiver 표현 수정(변경 이력 1)
- 리뷰 2차(Opus 명세 교차): High 0 · Medium 5 · Low 3 → 사용자 심각도 기준으로 모두 수정(변경 이력 2) → 재검증 통과
- 리뷰 3차(사용자 외부 검토): Medium 1 · Low 5 → 모두 수정(변경 이력 3), 실행 근거 테스트 6개 추가
- 리뷰 4차(사용자 재검토): Low 4 → 모두 수정(변경 이력 4) → 재검증 통과(npm test 6859, test:build 663, e2e 16+8)
- 남긴 항목: 없음

## 구현 결과

### 계획 대비 실제 구현
- 계획대로 구현했다. 예제 9개·퀴즈 9개·결과 표·연산·트랩 대응 표 5행·실패 알림 비교 표 5행·흔한 오해 4개, 시뮬레이터 없음, order 307(55번째/84), prototype-chain 연결.
- 계획과 달라진 점(모두 변경 이력에 기록, 요구사항·범위 변화 없음):
  - 계획 2단계의 "같은 이름의 트랩"을 "대응하는 트랩"으로 바꿨다.
  - summary를 "대상 객체를 감싼 Proxy가 연산을 트랩으로 가로채는"으로 바꿨다('객체' 검색 유지).
  - 외부 검토로 본문에 bind 해법의 한계(private·내부 슬롯 getter, 동결 대상의 자기 메서드), set 트랩의 불리언 변환 판정과 `return Reflect.set`, Array.isArray 예외, 취소 뒤 typeof, SameValue 기준을 더했다. 그 주장은 concept.test '본문의 실행 근거'가 실행으로 단언한다.

### 코드 리뷰
- 리뷰 4회(메인, Opus 명세 교차, 사용자 외부 검토 2회)의 지적을 모두 고쳤다. High는 없었고, 사용자 심각도 기준(명세 오개념 위험=높음)으로 Medium·Low도 모두 반영했다. 남긴 항목은 없다.
- Map·Set·Promise는 이 페이지보다 뒤 개념(order 330·430)이라 이름을 들지 않고 "내부 슬롯을 확인하는 내장 메서드/getter"로 일반화했다.

### 후속 작업
- [ ] class-basics의 "생성자를 생략한 클래스를 new 없이 부를 때 TypeError" 원인 설명 정정(error-objects에서 발견, 별도 세션 카드)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단
- [Claude 판단] 외부 검토의 수정안과 달리 Map·Set·Promise의 이름을 본문에 쓰지 않았다 — 택하지 않은 대안: `Map.prototype.size` 예. 이유: AGENTS.md의 장 순서 규칙상 이 페이지(order 307)는 뒤 개념(set-map 330, promise 430)을 전제로 쓸 수 없다. 내장 getter의 실패는 concept.test에서 Map으로 확인만 했다.
- [Claude 판단] 본문에 새로 넣은 실행 주장(동결 대상 bind, return 누락 set 트랩, Array.isArray, 취소한 함수 프록시 typeof, SameValue)을 예제 파일로 늘리지 않고 concept.test의 실행 단언으로 뒷받침했다 — 대안: 예제·퀴즈·결과 표 추가. 이유: 예제 9개 구성과 퀴즈·표를 바꾸지 않고, 본문의 각 주장이 `npm test`에서 실제 실행으로 검증되게 하려고.
- [Claude 판단] 예제 4의 오답 모델 이름을 "핸들러를 무시하고 대상 자체를 다룬다"로 바꾸고 퀴즈 1번 선택지에 "메서드 호출이 성공한다는 모델도 같은 출력"을 병기했다 — 이유: 원래 이름("트랩이 없는 것처럼")이 실제 치환 모델과 맞지 않았고, 같은 출력을 내는 다른 모델을 숨기지 않으려고(Opus 리뷰 M3).
- [무검토 승인] getTime의 TypeError 원인을 receiver가 아니라 "호출의 this는 점 앞의 프록시"로 설명하고, Reflect.get으로 넘기는 트랩이 있어도 결과가 같다는 것을 예제 3 넷째 줄로 보인다 — receiver는 getter의 this만 정한다.
- [무검토 승인] 예제 6만 sloppy mode를 전제로 두고, strict mode·ES 모듈에서는 8번 줄이 TypeError라는 것을 본문과 simplifications에 밝혔다 — 대안: 예제 전체를 strict로. 이유: set 트랩 false가 대입에서 조용히 무시되는 경우를 보이려면 sloppy가 필요하다.
- 범위 선택: extras 4개(set false, 불변 조건, has/ownKeys 숨기기, private 필드 TypeError)를 모두 넣고, 시뮬레이터 없이 표 + 퀴즈로, 반응형 패턴과 Reflect.apply/construct는 제외했다(사용자 선택).

#### 배경지식
- 프록시의 내부 메서드는 핸들러에서 대응하는 트랩을 찾고, 없으면 대상의 같은 내부 메서드를 부른다. 이름이 다른 대응이 있다([[HasProperty]]→has, [[OwnPropertyKeys]]→ownKeys).
- 내부 슬롯 확인(RequireInternalSlot)과 private 접근(PrivateGet)은 내부 메서드를 거치지 않고 this 값 자신을 본다. 프록시에는 [[DateValue]]도 대상의 private 요소도 없다. 반대로 IsArray는 프록시이면 대상을 다시 판정한다.
- [[Get]]·[[Set]]의 receiver는 접근자 getter/setter의 this다. 읽어 온 함수를 부를 때의 this는 점 앞의 값이다.
- Proxy [[Set]]은 트랩 결과를 ToBoolean해 false면 false를 돌려주고, PutValue는 strict 코드에서만 TypeError를 던진다. Reflect.set·Reflect.defineProperty는 Boolean을 돌려준다.
- get 불변 조건은 대상의 자기 데이터 프로퍼티가 쓰기 불가·설정 불가일 때만 SameValue로 같은 값을 요구한다.

#### 확인 질문
1. 트랩에서 `Reflect.get(target, key, receiver)`로 넘겨도 `proxy.getTime()`이 TypeError인 이유는 무엇인가?
   <details><summary>답</summary>receiver는 접근자 getter의 this를 정할 뿐이고, 읽어 온 getTime 함수를 부를 때의 this는 점 앞의 값인 프록시다. getTime은 this에 [[DateValue]]가 있는지 확인하므로 실패한다(content.mdx 내부 슬롯 절, 예제 3 넷째 줄).</details>
2. bind 트랩이 메서드는 고치는데 private 필드를 읽는 getter는 못 고치는 이유는? 그때 receiver에 대상을 넘기면 무엇을 잃는가?
   <details><summary>답</summary>getter는 트랩 안의 Reflect.get 단계에서 프록시를 this로 이미 실행되어, 트랩이 값을 받아 bind하기 전에 TypeError가 난다. receiver에 대상을 넘기면 실행은 되지만 예제 5처럼 프록시를 프로토타입으로 둔 객체의 getter가 그 객체를 this로 받는 동작을 잃는다(content.mdx:37, concept.test '본문의 실행 근거').</details>
3. 같은 bind 트랩이 `Object.freeze({ f() {} })`에서는 TypeError인데 동결한 클래스 인스턴스의 메서드에서는 동작하는 이유는?
   <details><summary>답</summary>get 불변 조건은 대상의 자기 데이터 프로퍼티가 쓰기 불가·설정 불가일 때만 같은 값(SameValue)을 요구한다. 객체 리터럴의 f는 자기 프로퍼티라 bind한 새 함수가 다른 값으로 걸리고, 클래스 메서드는 프로토타입에 있어 대상의 자기 프로퍼티가 아니다(content.mdx:33, 변경 이력 4).</details>
4. Map 예가 더 일반적인데 왜 본문에 쓰지 않았나? 이 판단의 근거가 바뀌면 무엇을 바꿔야 하나?
   <details><summary>답</summary>AGENTS.md 장 순서 규칙상 order 307 페이지는 뒤 개념(set-map 330, promise 430)을 전제로 쓸 수 없다. 이 페이지의 order가 330 뒤로 가거나 규칙이 바뀌면, Map 예를 본문에 넣고 set-map을 related에 더할 수 있다(코드 리뷰 절, 변경 이력 3).</details>
5. `return`을 빠뜨린 set 트랩에서 strict mode 대입이 TypeError인데 대상에는 값이 들어가 있는 이유는?
   <details><summary>답</summary>트랩 안의 Reflect.set이 이미 대상에 저장했지만, 트랩의 반환값 undefined를 ToBoolean하면 false라 프록시의 [[Set]]은 false를 돌려주고, strict 코드의 PutValue가 TypeError를 던진다(content.mdx:45, concept.test '본문의 실행 근거').</details>
