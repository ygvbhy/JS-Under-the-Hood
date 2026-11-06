# ES 모듈 개념 추가 구현 계획

- 상태: 완료
- 작성일: 2026-11-06
- 기준: `main` @ `0eeee09`

## 0. 요약

- 목적: 43~48장 로드맵 7번(마지막). `import`한 이름이 값이 아니라 다른 모듈의 바인딩을 가리킨다는 규칙을 모듈 환경과 간접 바인딩으로 설명하고, 로드·링크·평가, 순환, default, 동적 import, 최상위 await, 브라우저 로딩을 ECMAScript·HTML 원문과 Chromium 실행으로 보이는 50번째 개념 `es-modules`를 추가한다.
- 범위: 새 개념 폴더 1개(브라우저 예제 18개, 2시나리오 바인딩 시뮬레이터), 고정 테스트·e2e·빌드 테스트·content-guide·로드맵, 최상위 await '작성 예정' 4곳. 공통 코드·실행기는 바꾸지 않는다.
- 위험: 시뮬레이터 코드 패널은 파일 하나만 보여 주는데 순환 시나리오는 파일 세 개를 오간다. ES·HTML 경계(모듈 맵은 HTML, 바인딩은 ECMAScript)와 판마다 다른 변수 이름을 틀리기 쉽다.
- 복잡도: 중간 · Consensus: 생략 (새 개념 추가 패턴 그대로, 공통 코드 변경 없음. 명세 정확성은 구현 뒤 리뷰 + Opus 교차 검토로 확인)
- 미확정: 없음(시나리오 단계 수는 구현 때 8·12로 고정)

## 1. 요구사항

### 요구사항 (2026-11-06 사용자 결정)

- 로드맵 7번 개념. slug `es-modules`, 제목 'ES 모듈: import한 변수는 왜 저절로 바뀔까', category `execution`, order 480(50번째·마지막), `reviewedAt: null`.
- 다룰 주제(기본 + 추가 4개 모두):
  - 기본: ① 라이브 바인딩 ② `import`한 이름에 대입하면 TypeError, 같은 객체의 변경은 보임 ③ 모듈은 한 번만 평가 ④ 모듈 스코프 ⑤ 최상위 `this`는 `undefined` ⑥ 항상 strict.
  - 추가: ⑦ 로드·링크·평가와 순환(의존 모듈이 먼저 평가, 없는 이름은 평가 전에 SyntaxError, 순환에서 함수는 호출되고 `let`은 ReferenceError) ⑧ default와 네임스페이스(`export default n`은 고정, `export { n as default }`는 라이브, 이름 있는 함수 선언은 그 이름이 바인딩, `import * as ns`, `export *`는 default 제외) ⑨ 동적 `import()`와 최상위 `await`(의존 모듈은 기다리고 형제 모듈은 기다리지 않음) ⑩ 브라우저 로딩(`type="module"`의 지연 실행, URL을 키로 쓰는 모듈 맵, bare specifier TypeError, `import.meta.url`).
- 시각화: 바인딩 시뮬레이터. 시나리오 2개(라이브 바인딩, 순환과 TDZ). 모듈별 환경과 `import`의 간접 바인딩을 단계별로 보인다.

### 유지해야 하는 기존 동작

- 공통 셸·실행기·레이아웃은 그대로. 기존 e2e·빌드 테스트는 개수·마지막 개념 값만 바꾸고 새 케이스는 추가만 한다. 다른 개념 파일은 최상위 await의 '작성 예정' 문구 4곳만 바꾼다.

### 제외 범위

- Node.js의 모듈 동작과 CommonJS 호환, import map, import attributes와 JSON·CSS 모듈, 번들러, `async` 속성을 준 모듈 스크립트, `nomodule`, 다른 출처 모듈의 CORS, 워커 모듈, `import.meta.resolve`, 모듈 그래프 로드 실패 시 `<script>` 요소의 `error` 이벤트.

## 2. 사실과 추정

### 사실 (코드·명세·실행에서 확인)

- 브라우저 실행기: `.html` 예제는 문서 그대로 실행, `resources`는 `/`로 시작하는 `.js` 경로만 허용(`tests/helpers/browser-example.ts:45-50`), 요청 URL의 `#` 뒤는 잘라 찾음(`tests/helpers/run-browser-example.ts`의 `url.split('#')[0]`), 등록했는데 요청되지 않은 resource는 실패. 인라인 모듈의 상대 경로는 문서 주소 `http://example.test/` 기준이다. 실행기는 공통 코드 변경 없이 18개를 모두 실행한다.
- 시뮬레이터 계약: `Scenario.code`는 문자열 하나고 `line`은 선택(`app/simulator/types.ts:3-17`). `CodeView`는 코드 하나만 그린다(`app/simulator/CodeView.tsx:5-9`). `exampleId`는 공통 코드가 쓰지 않는다(grep 결과 테스트의 고정값뿐). `assertScenarioInvariants`는 `code`를 넘겨받은 `exampleSource`와 비교한다(`tests/helpers/scenario-invariants.ts:12`).
- 고정 테스트: `app/lib/concepts.test.ts:104,108,111,112`, `app/components/concept/ConceptPager.test.tsx:18,27,28`, `tests/e2e/navigation.spec.ts`(`49` 전부와 78~86, 139, 165~539의 마지막 개념), `tests/e2e/responsive.spec.ts:1186~1205`, `tests/e2e/a11y.spec.ts:994~1008`, `tests/e2e/helpers.ts:82-83`, `tests/build/build-output.test.ts:1241~`.
- 홈 '객체' 검색 개수를 고정한 e2e가 있다(`tests/e2e/navigation.spec.ts:14~31,90`). 검색은 title·summary·tags를 본다 → summary·tags에 '객체'를 넣지 않는다('네임스페이스 객체'는 '네임스페이스'로).
- 최상위 await '작성 예정' 4곳: `app/concepts/async-await/content.mdx:4`(문단 끝), `:96`, `app/concepts/async-await/meta.ts:104`, `app/concepts/error-handling/content.mdx:85`.
- ECMAScript(현재 초안·ES2026판 사본, 2026-11-06 내려받음). 두 판 공통 문장(문자열 대조 완료):
  - "Accesses to the value of the new binding will indirectly access the bound value of the target binding."(CreateImportBinding)
  - "immutable import bindings which are bindings that provide indirect access to a target binding"(Module Environment Records)
  - "Module Environment Records always provide a this binding."
  - "Module code is always strict mode code."
  - `"*default*" is used within this specification as a synthetic name`
  - 모듈 네임스페이스 `[[Set]]`은 항상 false를 돌려준다(strict 코드의 대입이 TypeError가 됨).
  - 초안 InitializeEnvironment: 간접 export·import를 `ResolveExport`로 풀어 `null`이나 ambiguous면 SyntaxError, 모듈 환경은 `NewModuleEnvironment(realm.[[GlobalEnv]])`로 만들어 바깥이 전역 환경이다.
  - HostLoadImportedModule은 같은 (referrer, moduleRequest) 쌍이면 같은 결과를 요구한다. **URL로 같은 모듈을 찾는 것은 HTML의 모듈 맵이다.**
  - `[[HasTLA]]`: "Having an asynchronous dependency does not mean this field is true."
  - 판마다 변수 이름이 다르다(ES2026 `envRec` vs 초안 `envRecord`) → **알고리즘 단계는 인용하지 않고 풀어 쓴다.** 인용은 설명 문장만, 구현 때 두 사본 모두에 있는지 스크립트로 확인한다.
- HTML 표준(현재 판 사본): "A module map is a map keyed by tuples consisting of a URL record and a string." / "It is intentional that the module map is keyed by the request URL" / bare specifier는 "Throw a TypeError indicating that specifier was a bare specifier" / 모듈 스크립트는 "(The defer attribute has no effect on module scripts.)" / prepare the script element에서 "if el has a defer attribute or el's type is "module"" 면 파싱 완료 후 실행 목록에 넣는다.
- 링크 앵커: 두 판에 있음을 확인 — `sec-module-environment-records`, `sec-createimportbinding`, `sec-module-namespace-exotic-objects`, `sec-source-text-module-records`, `sec-cyclic-module-records`, `sec-HostLoadImportedModule`(대문자), `sec-import-calls`, `sec-imports`, `sec-exports`, `sec-innermoduleevaluation`, `sec-source-text-module-record-initialize-environment`. HTML: `#module-map`, `#resolve-a-module-specifier`, `#hostloadimportedmodule`, `#hostgetimportmetaproperties`, `#the-script-element`.
- 실행 결과(2026-11-06, 부록 파일을 `runBrowserExample`로 3회씩 실행, 모두 같고 실패 없음):

  | 예제 | 출력 |
  | - | - |
  | live-binding | 0, 1 |
  | readonly | TypeError, 0 |
  | shared-object | 2, TypeError |
  | evaluate-once | shared 평가, a, b, main |
  | evaluate-error | boom 평가, 평가 실패, true |
  | module-scope | classic, module의 shared / classic의 shared, false, undefined |
  | module-this-strict | true, true, ReferenceError |
  | evaluation-order | c, a, b, main 첫 줄, main 끝 |
  | missing-export | SyntaxError |
  | cycle-tdz | b 본문 hello, ReferenceError, a 본문 b의 값, main |
  | default-live | 0 1 g |
  | namespace | ["alpha","bump","zeta"], Module true, 1, TypeError, TypeError |
  | reexport-star | ["count","inc","named"], 1 1 |
  | dynamic-import | SyntaxError, 클래식 시작, 클래식 끝, 1 |
  | top-level-await | slow 시작, fast, slow 끝, main 준비됨 |
  | deferred-module | classic false, module true |
  | module-map | map-log 평가, map-log 평가, 끝 |
  | specifier | `http://example.test/`, `http://example.test/where.js`, TypeError |

- 실행으로 알게 된 함정: `#1`·`#2`로 두 번 평가한 모듈에서 `import.meta.url`을 찍으면 두 번째도 `#1`이 나왔다(Chromium, 원인 미확인). 그래서 module-map 예제는 `import.meta.url`을 찍지 않고 평가 횟수만 보인다.
- 순서가 보장되는 근거: evaluation-order·evaluate-once는 깊이 우선 평가(InnerModuleEvaluation). top-level-await는 slow가 `await`로 멈춘 뒤 fast가 같은 평가 안에서 동기로 실행되고, main은 slow가 끝나야 실행된다(타이머 없음). deferred-module은 표준의 파싱 완료 후 실행. specifier의 TypeError는 동기 출력 뒤의 거부 콜백이라 마지막이다.

### 추정

- 없음

## 3. 구현 전략

- **새 개념 폴더 + 개념 전용 바인딩 시뮬레이터.** 상태 모델(`scenarios.ts`):

  ```ts
  export type Phase = '로드' | '링크' | '평가'
  export type LocalBinding = { name: string; kind: 'local'; value: string | null } // null = 초기화 전
  export type ImportBinding = { name: string; kind: 'import'; from: string; target: string }
  export type ModuleCard = {
    file: string // 'main(인라인)', 'counter.js'
    status: '로드됨' | '링크됨' | '평가 중' | '평가 완료'
    bindings: (LocalBinding | ImportBinding)[]
  }
  export type ModuleState = {
    phase: Phase
    modules: ModuleCard[]
    running: { file: string; code: string } | null // 코드 패널에 없는 파일의 실행 위치
  }
  ```

  - **import 바인딩에는 값 필드가 없다.** 뷰가 `from`·`target`을 따라가 대상 값을 그린다. 그래서 그림이 "값이 두 곳에 있다"는 인상을 주지 않고, 값이 어긋나는 시나리오를 쓸 수도 없다. `(바뀜)`은 local 칸에만 붙인다.
  - 시나리오 1 `live` ← `live-binding.html`: 시작 → 로드(`./counter.js` 요청) → 링크(`count` 초기화 전, `inc` 함수, main의 두 이름은 간접 바인딩) → counter.js 평가(`count = 0`, `running`) → `console.log(count)` 0 → `inc()`(`running`: `count += 1`, counter.js의 값만 1) → `console.log(count)` 1 → 끝.
  - 시나리오 2 `cycle` ← `cycle-tdz.html`, **코드 패널은 `cycle-b.js`**: 시작 → 로드(세 모듈) → 링크(a의 `value`·b의 `fromB` 초기화 전, `hello`는 함수) → 평가 시작(a의 의존인 b가 먼저) → b의 `hello()` 호출 성공 → b의 `console.log(value)`가 초기화 전이라 ReferenceError → catch 출력 → `fromB` 초기화 → a 본문(`line` 없음, `running`) → main → 끝.
  - `running`은 코드 패널에 없는 파일의 현재 코드를 뷰에 보이고, 테스트가 그 코드가 해당 파일에 실제로 있는지 대조한다. `line`이 없는 단계는 `types.ts`가 허용한다. 공통 코드는 바꾸지 않는다.
- **예제는 모두 `runtime: 'browser'` `.html`.** `ecmascript` 런타임은 스크립트로 실행해 `import`/`export`를 쓸 수 없다(`docs/content-guide.md` 3단계). 인라인 `<script type="module">`이 `resources`를 `import`한다. resources 파일은 평평하게 `examples/`에 둔다.
- **`import`한 이름을 "복사"나 "참조 공유"로 설명하지 않는다**(AGENTS.md). 명세가 쓰는 간접 바인딩과 대상 바인딩으로 쓴다.
- **언어와 호스트를 나눈다.** 바인딩·환경·링크 오류·평가 순서·네임스페이스·`import()` 구문·최상위 `await`는 ECMAScript, URL 해석·모듈 맵·fetch·지연 실행·`import.meta.url`의 값·bare specifier TypeError는 HTML. "한 번만 평가"는 ECMAScript의 HostLoadImportedModule 요구 + HTML 모듈 맵의 결과이고, 모듈 맵이 URL을 키로 쓰므로 URL이 다르면 다른 모듈이다(module-map 예제)라고 쓴다.
- **단정 범위.** "default는 라이브가 아니다" 금지. `export default 식`만 `*default*` 바인딩에 값을 담고, `export { n as default }`와 이름 있는 함수 선언은 그 이름의 바인딩이다(default-live 예제). "모듈은 다시 평가되지 않는다"는 evaluate-error로 실패해도 다시 실행되지 않고 같은 에러가 나온다는 데까지 쓴다.
- **본문 구성** (`동작 원리` h3): ① 모듈은 자기 환경을 가진다(스코프, 바깥은 전역 환경, `this`, strict — 예제 module-scope·module-this-strict) ② import는 값이 아니라 바인딩을 가리킨다(간접 바인딩 — live-binding·readonly·shared-object, 시뮬레이터) ③ 로드, 링크, 평가(evaluation-order·missing-export·evaluate-once·evaluate-error) ④ 순환 import와 TDZ(cycle-tdz, [TDZ](/concepts/tdz) 연결) ⑤ default와 네임스페이스(default-live·namespace·reexport-star) ⑥ 동적 import와 최상위 await(dynamic-import·top-level-await, [async/await](/concepts/async-await) 연결) ⑦ 브라우저가 맡는 부분(deferred-module·module-map·specifier, [script](/concepts/script-async-defer) 연결) ⑧ 다루지 않는 것. `예제`(예측 퀴즈 18개 안팎) → `결과와 이유`(결과 표 + 오해 Callout: "import는 값을 복사해 온다", "`const`로 export하면 내용도 못 바꾼다", "`export default`도 언제나 라이브다", "최상위 await는 페이지 전체를 멈춘다", "같은 파일이면 어떤 경로로 불러도 한 번만 평가된다").
- **명세 판 처리.** ECMAScript 링크는 현재 초안, 인용은 ES2026판과 초안 공통 문장만. HTML은 현재 판.
- **버린 대안.** (a) `SimulatorShell`에 파일 탭 추가: 공통 코드 변경이고 모든 시뮬레이터 회귀를 확인해야 한다. (b) 순환 예제의 세 파일을 하나로 합치기: 인라인 모듈은 URL이 없어 다른 모듈이 import할 수 없어 불가능하다. (c) 시나리오 1을 표로 대체: 사용자가 시뮬레이터로 결정. (d) `import.meta.url`로 모듈 맵을 보이기: 위 Chromium 결과 때문에 쓰지 않는다.

## 4. 변경 파일

- 추가: `app/concepts/es-modules/` — `meta.ts`, `content.mdx`, `route.tsx`, `examples/*`(부록 전부), `scenarios.ts`, `ModuleGraphView.tsx`, `ModuleGraphView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`, `concept.test.ts`.
- 수정(고정 테스트): `app/lib/concepts.test.ts`(총 50, 마지막 es-modules, 그 앞 error-handling), `app/components/concept/ConceptPager.test.tsx`, `tests/e2e/navigation.spec.ts`(`/ 49`→`/ 50` 전부, 카드 50, 마지막 제목·'50번째', error-handling 다음 링크, es-modules 케이스), `tests/e2e/responsive.spec.ts`(홈 50 + 새 페이지 케이스), `tests/e2e/a11y.spec.ts`(2 케이스), `tests/e2e/helpers.ts`(`ES_MODULES_PATH`, `ES_MODULES_SIMULATOR_NAME`), `tests/build/build-output.test.ts`(`시뮬레이터 프리렌더 (es-modules)`).
- 수정(문서): `docs/content-guide.md`(e2e 목록), `.claude/plans/concept-roadmap-ch43-48.md`(7번 완료, 진행 기록, 상태 완료).
- 수정('작성 예정' 문구 4곳): `async-await/content.mdx:4,96`, `async-await/meta.ts:104`, `error-handling/content.mdx:85` — 최상위 await 부분만 [ES 모듈](/concepts/es-modules) 링크(본문) 또는 "ES 모듈 개념에서 다룹니다"(meta)로. `for await...of`·async 제너레이터는 그대로 둔다.
- 변경하지 않음: `app/simulator/`·`app/components/`·`app/lib/`, `tests/helpers/`(실행기).

## 5. 위험 요소

- 코드 패널이 다른 파일을 강조하는 것처럼 보임 → `line`이 없는 단계는 `running`으로 파일과 코드를 보이고, 테스트가 `running.code`가 해당 파일 원문에 있는지 검사(작업 2·3).
- `cycle` 시나리오의 `code`가 메인 문서가 아니라 resource → `concept.test.ts`가 `cycle-b.js` 원문을 `exampleSource`로 넘겨 불변식 ①을 맞추고 이유를 주석으로 적는다(작업 2).
- 판마다 다른 문장 인용 → 인용 대조 스크립트로 ES 인용은 두 사본 모두, HTML 인용은 현재 판 사본에 있음을 확인하고, 문장이 설명하는 연산에 실제로 있는지도 확인(작업 4).
- 언어·호스트 혼동(특히 "한 번만 평가", `import.meta`) → 3절 분담표를 본문 절 구조로 강제, Opus 교차 검토(작업 4·7).
- Chromium 결과를 표준처럼 단정 → 범위를 Chromium 실행 결과로 밝히고, `#` 조각 동작은 표준(URL record가 키)을 근거로 쓴다(작업 4).
- 상대 경로 예제와 resource 경로 불일치 → 실행기가 등록되지 않은 요청으로 실패해 드러남(작업 1).
- 모듈 링크 실패·평가 실패를 정적 `import`로 쓰면 `pageerror`로 실패 → 해당 예제는 `import()`의 `catch`로 쓴다(부록). 이유를 `simplifications`에 적는다(작업 1).
- 카드 여러 개가 좁은 화면에서 넘침 → responsive e2e(375) 두 시나리오 끝까지(작업 3·6).
- 다른 개념 문구 수정 → 해당 개념 테스트·빌드 테스트(작업 5·6).

## 6. 검증 방법

- 정적: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run test:build`.
- e2e: `npx playwright test tests/e2e/navigation.spec.ts && npx playwright test -g "es-modules|ES 모듈|홈 학습 순서 보기|try/catch/finally|async/await"`.
- 브라우저(빌드 serve): 1280 라이트·375 다크에서 두 시나리오를 끝까지 넘기며 `scrollWidth` = 창 너비, 링크 단계에서 main의 `count`가 counter.js의 값을 가리키는지, `inc()` 뒤 counter.js 칸에만 `(바뀜)`이 있는지, 순환 시나리오의 ReferenceError 단계에서 `value`가 초기화 전으로 보이는지 확인. JS를 끈 상태에서 `<details>` 수 = 퀴즈 수와 시뮬레이터 첫 단계. error-handling 페이지 '다음' 링크가 `/concepts/es-modules`.
- 명세: 인용 대조 스크립트, Opus 명세 정확성 교차 검토(이전 개념과 같은 방식, 사본 경로 전달).

## 7. 미확정 사항

- 시나리오 단계 수는 live 8·cycle 12로 고정했다(작업 2).

## 8. 작업 순서

### 1. 예제·meta·route

- 대상: `app/concepts/es-modules/examples/*`, `meta.ts`, `route.tsx`
- 현재: 없음
- 변경: 부록 파일을 그대로 만든다. meta: slug·제목·category `execution`·order 480·`reviewedAt: null`, summary(160자 이하, '객체' 없이), tags('객체' 없이), goals 7개 안팎, prerequisites(TDZ·스코프 체인·실행 컨텍스트·script async/defer·async/await·프로미스), related, examples 18개(`resources` 경로는 부록, `.html`), references(2절 앵커 + MDN import·export·import()·import.meta·script type=module), simplifications(간접 바인딩은 명세의 설명 장치, 시뮬레이터의 생략, 코드 패널이 파일 하나, Chromium만 실행, 정적 import 실패를 예제로 보이지 않는 이유, 제외 범위, 판 인용 방침).
- 이유: 실행 주장을 먼저 고정한다.
- 주의사항: meta.ts → content.mdx → route.tsx 순(dev 서버가 `./meta` 실패를 캐시하지 않게). references 라벨에 절 번호 없음. 예제 파일은 Prettier·ESLint 대상이 아니다.
- 완료 조건: `npx vitest run tests/examples.test.ts -t es-modules` 18개 통과, `npx vitest run tests/content-integrity.test.ts` 통과, summary·tags에 '객체' 없음(grep).

### 2. 시나리오와 대조 테스트

- 대상: `scenarios.ts`, `concept.test.ts`
- 현재: 없음
- 변경: 3절 상태 모델로 두 시나리오. 테스트: `assertScenarioInvariants`(`cycle`은 `cycle-b.js` 원문), 고정 줄 번호, 첫 단계('실행 시작', 로드, 바인딩 없음), 마지막 단계(출력 = expectedOutput), 단계 phase가 로드→링크→평가로만 진행, 링크 전에는 바인딩 없음, 모든 `import` 바인딩의 `from`·`target`이 존재하는 local 바인딩을 가리킴, 출력 단계에서 찍힌 값 = 그 시점 대상 바인딩 값(ReferenceError 단계는 대상이 `null`), `live`에서 `count`가 바뀌는 곳은 counter.js 카드뿐, `running.code`가 `running.file` 원문에 있음, 설명에 '복사' 없음.
- 이유: 그림이 실제 실행과 어긋나지 않게 묶는다.
- 주의사항: `cycle` 평가 순서는 b → a → main(예제 출력과 일치).
- 완료 조건: `npx vitest run app/concepts/es-modules/concept.test.ts` 통과, 음성 확인(`live` 마지막 출력 전 counter.js 값을 0으로 되돌리면 실패 후 원복).

### 3. 뷰·시뮬레이터

- 대상: `ModuleGraphView.tsx`, `ModuleGraphView.test.tsx`, `Simulator.tsx`, `Simulator.test.tsx`
- 현재: 없음
- 변경: 단계 띠(로드/링크/평가, 현재 단계는 글자로도 표시), 모듈 카드(파일 이름·상태, 바인딩 행: local은 값 또는 `초기화 전`, import는 `→ counter.js의 count` + 대상 값), `running` 줄, `grid-cols-1 sm:grid-cols-2`, `(바뀜)`. label 'ES 모듈 시뮬레이터'.
- 이유: 간접 바인딩을 글자와 값으로 함께 보인다(색만으로 구분하지 않음).
- 주의사항: `renderState`에 `prevState`를 넘겨 `(바뀜)`을 local 바인딩에만 계산한다.
- 완료 조건: `npx vitest run app/concepts/es-modules` 통과, typecheck·eslint·prettier 통과.

### 4. 본문

- 대상: `content.mdx`
- 현재: 없음
- 변경: 3절 구성. 필수 h2 3개, 퀴즈 18개 안팎, 결과 표, 오해 Callout. 코드 블록은 `file=`로 `.html`과 resource `.js`를 함께 보인다. 시뮬레이터는 live-binding 예제 뒤 독립 줄.
- 이유: 페이지 본체.
- 주의사항: PredictQuiz 문자열 prop 안 작은따옴표 금지(`npm test`가 못 잡고 test:build만 잡음). 첫 문단에 `**` 포함 코드 금지. 인라인 코드 공백 주의. 지시어·접속어 대상 확인.
- 완료 조건: `npx vitest run tests/content-integrity.test.ts` 통과, `npm run test:build` 통과, 인용 대조 스크립트가 모든 영문 인용을 사본에서 찾음.

### 5. '작성 예정' 연결

- 대상: 4절의 4곳
- 현재: 최상위 await를 '별도 개념(작성 예정)'으로 표시
- 변경: 최상위 await 부분만 연결. `grep -rn "작성 예정"` 뒤 문장 단위로 확인해 놓치지 않는다.
- 이유: 로드맵이 약속한 연결.
- 주의사항: 같은 문장의 다른 항목은 건드리지 않는다.
- 완료 조건: 최상위 await를 포함한 '작성 예정' grep 0건, 해당 개념 테스트 통과.

### 6. 고정 테스트·문서

- 대상: 4절 고정 테스트, `docs/content-guide.md`, 로드맵
- 현재: 49개·마지막 error-handling
- 변경: 값 갱신과 새 케이스 추가. 로드맵은 finalize 때 완료로 표시.
- 이유: 새 개념이 마지막이 되면 고정값이 바뀐다.
- 주의사항: 기존 케이스 내용은 고치지 않고 추가만 한다.
- 완료 조건: 6절 정적·e2e 명령 통과, `/ 49` 잔여 grep 0건.

### 7. 브라우저 확인·교차 검토

- 대상: 빌드 결과, 본문
- 현재: -
- 변경: 6절 브라우저 시나리오, Opus 명세 정확성 교차 검토 후 지적을 메인이 원문으로 확인해 반영.
- 이유: 명세 정확성은 최우선 원칙이다.
- 주의사항: 교차 검토 지적도 실행·원문으로 확인한 뒤 반영한다.
- 완료 조건: 스크린샷(1280 라이트·375 다크), JS 끈 상태 확인, 교차 검토 HIGH 없음.

## 9. 추가 개선 후보

- ES 모듈을 '별도 개념'으로 언급만 한 페이지(`global-object`, `iife-module-pattern`, `script-async-defer`, `hoisting`, `block-scope` 등)의 역방향 링크. 사용자 결정대로 나중에 일괄 처리한다.
- `error-handling`의 '다른 페이지 3곳 결과 열 문구' 후속은 이 작업과 무관하게 남아 있다.

## 부록: 예제 파일

`meta.examples`의 `id`는 `.html` 파일 이름과 같고 `runtime: 'browser'`다. `resources`는 `{ path: '/<이름>.js', file: '<이름>.js' }`이고 `delayMs`는 쓰지 않는다. 모두 2026-11-06에 실행한 파일 그대로다.

예제별 resources:
- `live-binding`: `counter.js`
- `readonly`: `counter.js`
- `shared-object`: `settings.js`, `read-settings.js`
- `evaluate-once`: `once-shared.js`, `once-a.js`, `once-b.js`
- `evaluate-error`: `boom.js`
- `module-scope`: 없음
- `module-this-strict`: 없음
- `evaluation-order`: `order-a.js`, `order-b.js`, `order-c.js`
- `missing-export`: `bad-import.js`, `logger.js`, `counter.js`
- `cycle-tdz`: `cycle-a.js`, `cycle-b.js`
- `default-live`: `default-expr.js`, `default-alias.js`, `default-decl.js`
- `namespace`: `ns-target.js`
- `reexport-star`: `star-index.js`, `star-source.js`, `counter.js`
- `dynamic-import`: `counter.js`
- `top-level-await`: `tla-slow.js`, `tla-fast.js`
- `deferred-module`: 없음
- `module-map`: `map-log.js`
- `specifier`: `where.js`

### .html

`live-binding.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { count, inc } from './counter.js';
console.log(count);
inc();
console.log(count);
</script>
</body>
</html>
```

`readonly.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { count } from './counter.js';
try {
  count = 5;
} catch (e) {
  console.log(e.name);
}
console.log(count);
</script>
</body>
</html>
```

`shared-object.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { settings } from './settings.js';
import { readSize } from './read-settings.js';
settings.size = 2;
console.log(readSize());
try {
  settings = {};
} catch (e) {
  console.log(e.name);
}
</script>
</body>
</html>
```

`evaluate-once.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import './once-a.js';
import './once-b.js';
console.log('main');
</script>
</body>
</html>
```

`evaluate-error.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script>
import('./boom.js').catch((first) => {
  console.log(first.message);
  return import('./boom.js').catch((second) => {
    console.log(first === second);
  });
});
</script>
</body>
</html>
```

`module-scope.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script>
var fromClassic = 'classic';
var shared = 'classic의 shared';
</script>
<script type="module">
var shared = 'module의 shared';
let onlyHere = 1;
console.log(fromClassic);
console.log(shared, '/', window.shared);
console.log('onlyHere' in window);
</script>
<script type="module">
console.log(typeof onlyHere);
</script>
</body>
</html>
```

`module-this-strict.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
console.log(this === undefined);
function whoAmI() {
  return this === undefined;
}
console.log(whoAmI());
try {
  undeclared = 1;
} catch (e) {
  console.log(e.name);
}
</script>
</body>
</html>
```

`evaluation-order.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
console.log('main 첫 줄');
import './order-a.js';
import './order-b.js';
console.log('main 끝');
</script>
</body>
</html>
```

`missing-export.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script>
import('./bad-import.js').catch((e) => {
  console.log(e.name);
});
</script>
</body>
</html>
```

`cycle-tdz.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import './cycle-a.js';
console.log('main');
</script>
</body>
</html>
```

`default-live.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import exprValue, { bump as bumpExpr } from './default-expr.js';
import aliasValue, { bump as bumpAlias } from './default-alias.js';
import declValue, { swap } from './default-decl.js';
bumpExpr();
bumpAlias();
swap();
console.log(exprValue, aliasValue, declValue());
</script>
</body>
</html>
```

`namespace.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import * as ns from './ns-target.js';
console.log(JSON.stringify(Object.keys(ns)));
console.log(ns[Symbol.toStringTag], Object.getPrototypeOf(ns) === null);
ns.bump();
console.log(ns.zeta);
try {
  ns.zeta = 9;
} catch (e) {
  console.log(e.name);
}
try {
  ns.extra = 9;
} catch (e) {
  console.log(e.name);
}
</script>
</body>
</html>
```

`reexport-star.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import * as ns from './star-index.js';
import { count, inc } from './star-index.js';
console.log(JSON.stringify(Object.keys(ns)));
inc();
console.log(count, ns.count);
</script>
</body>
</html>
```

`dynamic-import.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script>
try {
  eval("import { count } from './counter.js';");
} catch (e) {
  console.log(e.name);
}
console.log('클래식 시작');
import('./counter.js').then((module) => {
  module.inc();
  console.log(module.count);
});
console.log('클래식 끝');
</script>
</body>
</html>
```

`top-level-await.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { value } from './tla-slow.js';
import './tla-fast.js';
console.log('main', value);
</script>
</body>
</html>
```

`deferred-module.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
console.log('module', document.getElementById('below') !== null);
</script>
<script>
console.log('classic', document.getElementById('below') !== null);
</script>
<div id="below"></div>
</body>
</html>
```

`module-map.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import './map-log.js';
import './map-log.js';
import './map-log.js#again';
console.log('끝');
</script>
</body>
</html>
```

`specifier.html`

<!-- prettier-ignore -->
```html
<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { where } from './where.js';
console.log(import.meta.url);
console.log(where);
import('counter.js').catch((e) => {
  console.log(e.name);
});
</script>
</body>
</html>
```

### resources (.js)

`counter.js`

```js
export let count = 0;
export function inc() {
  count += 1;
}
```

`settings.js`

```js
export const settings = { size: 1 };
```

`read-settings.js`

```js
import { settings } from './settings.js';
export function readSize() {
  return settings.size;
}
```

`once-shared.js`

```js
console.log('shared 평가');
```

`once-a.js`

```js
import './once-shared.js';
console.log('a');
```

`once-b.js`

```js
import './once-shared.js';
console.log('b');
```

`boom.js`

```js
console.log('boom 평가');
throw new Error('평가 실패');
```

`order-a.js`

```js
import './order-c.js';
console.log('a');
```

`order-b.js`

```js
console.log('b');
```

`order-c.js`

```js
console.log('c');
```

`bad-import.js`

```js
import './logger.js';
import { missing } from './counter.js';
console.log('bad-import 평가');
```

`logger.js`

```js
console.log('logger 평가');
```

`cycle-a.js`

```js
import { fromB } from './cycle-b.js';
export let value = 'a의 값';
export function hello() {
  return 'hello';
}
console.log('a 본문', fromB);
```

`cycle-b.js`

```js
import { value, hello } from './cycle-a.js';
console.log('b 본문', hello());
try {
  console.log(value);
} catch (e) {
  console.log(e.name);
}
export const fromB = 'b의 값';
```

`default-expr.js`

```js
let n = 0;
export default n;
export function bump() {
  n += 1;
}
```

`default-alias.js`

```js
let n = 0;
export { n as default };
export function bump() {
  n += 1;
}
```

`default-decl.js`

```js
export default function f() {
  return 'f';
}
export function swap() {
  f = () => 'g';
}
```

`ns-target.js`

```js
export let zeta = 0;
export const alpha = 1;
export function bump() {
  zeta += 1;
}
```

`star-index.js`

```js
export * from './star-source.js';
export { count, inc } from './counter.js';
```

`star-source.js`

```js
export default 'default 값';
export const named = 'named 값';
```

`tla-slow.js`

```js
console.log('slow 시작');
export const value = await Promise.resolve('준비됨');
console.log('slow 끝');
```

`tla-fast.js`

```js
console.log('fast');
```

`map-log.js`

```js
console.log('map-log 평가');
```

`where.js`

```js
export const where = import.meta.url;
```

## 변경 이력

- 2026-11-06 (교차 검토): 예제 13 `reexport-star.html`에 `import * as source`와 키 출력 한 줄을 더해 출력이 `["default","named"]`, `["count","inc","named"]`, `1 1`이 됨 — 네임스페이스에 `default` 키가 들어가는 것을 목표대로 실행으로 보임. 영향 단계 1·4. 부록의 원본은 처음 계획 그대로이고 실제 파일이 기준이다.

- 2026-11-06 (사용자 검토 1차, 외부 검토 8건): 모두 원문·Chromium으로 확인해 반영. 예제 17의 두 번째 `import`를 `'/map-log.js'`로 교체(같은 지정자는 ECMAScript ModuleRequests가 합쳐 모듈 맵까지 가지 않음, 출력 동일). 학습 목표 3의 `let`, 거부를 잡은 최상위 await, `export *`의 모호성 조건과 직접 내보낸 이름 우선, `eval`은 Script 목표, `export * as ns from` 예외, 오해 제목과 예제 18 제목의 표현. 영향 단계 1·4.

- 2026-11-06 (사용자 검토 2차, 외부 검토 2건): 예제 17의 두 지정자가 같은 URL인 조건(문서가 루트)을 본문·예제 설명·퀴즈에 명시, 결과 표 예제 4를 모듈 맵 층 표현으로 수정. 영향 단계 4.

## 구현 진행

- baseline (2026-11-06, `0eeee09`): lint·format·typecheck 통과, `npm test` 134파일 4132개 통과
- [x] 1. 예제·meta·route — 예제 18개 Chromium 실행 통과, MDN 링크 2개는 404여서 교체(import()는 en-US, script type=module은 JavaScript 모듈 가이드)
- [x] 2. 시나리오와 대조 테스트 — live 8·cycle 12단계, 음성 확인 후 원복. live의 `inc()` 호출 단계는 `line`(호출한 줄)과 `running`(호출된 함수 안)을 함께 쓰도록 메인이 수정
- [x] 3. 뷰·시뮬레이터 — `npx vitest run app/concepts/es-modules` 42개 통과
- [x] 4. 본문 — 퀴즈 18개, `<details>` 18개, 첫 빌드 MDX 오류(문단 첫 단어 `import`가 ESM으로 파싱됨)는 문장을 고쳐 해결. 표 안 `*default*`가 강조로 파싱되지 않게 `<code>`로
- [x] 5. '작성 예정' 연결 — 4곳, 남은 '작성 예정'은 async 제너레이터·`for await...of`뿐
- [x] 6. 고정 테스트·문서 — `/ 49` 잔여 0건
- [x] 7. 브라우저·교차 검토 — 1280 라이트·1024·375 다크 가로 넘침 없음, 콘솔 에러 없음. Opus 교차 검토 HIGH 2·MEDIUM 2·LOW 8 모두 원문·Chromium 실행으로 확인해 반영(default 형태 열거, goals의 '의존 모듈' 방향, 네임스페이스는 간접 바인딩이 아님, 최상위 await의 거부·순환 예외 등). 본문에만 쓴 경계 사례는 Chromium에서 확인했고 예제로 등록하지 않았음을 `simplifications`에 밝힘
- 전체 검증(마지막 수정 후): lint·format·typecheck 통과, `npm test` 137파일 4205개, `test:build` 403개, navigation e2e 16개, 관련 e2e 36개 통과
- 리뷰 1차: Critical·High 없음, Low 1(링크 단계에서 새로 생긴 바인딩에도 `(바뀜)`이 붙음, 보고만)

- 사용자 콘텐츠 검토 2회(8건, 2건) 모두 반영 후 최종 승인, `reviewedAt` 2026-11-06 기록

## 구현 결과

### 계획 대비 실제 구현

- 계획대로 구현했다. 공통 코드와 실행기는 바꾸지 않았다.
- 달라진 점: 예제 13에 `default` 키 비교 출력 추가, 예제 17의 두 번째 `import`를 `'/map-log.js'`로 교체(`변경 이력`). MDN 링크 2개가 404여서 교체. `live`의 `inc()` 호출 단계는 `line`과 `running`을 함께 쓴다.

### 코드 리뷰

- Critical·High 없음. Opus 교차 검토 HIGH 2·MEDIUM 2·LOW 8과 사용자 검토 10건은 서술 문제로 모두 수정했다. 링크 단계에서 새로 생긴 바인딩에도 `(바뀜)`이 붙는 Low 1건은 사용자에게 보고한 뒤 그대로 두었다.

### 후속 작업

- [ ] ES 모듈을 '별도 개념'으로 언급한 페이지의 역방향 링크 일괄 처리(`global-object`, `iife-module-pattern`, `script-async-defer`, `hoisting`, `block-scope` 등)
- [ ] 다음 로드맵 범위 결정(49장 Babel·Webpack은 범위 밖, 남은 '작성 예정'은 async 제너레이터·`for await...of`)

### 이해 확인

#### 설명할 수 있어야 하는 기술적 판단

- [Claude 판단] 시뮬레이터의 import 바인딩에 값 필드를 두지 않았다 — 뷰가 `from`·`target`을 따라가 대상 값을 그린다. 값을 복제해 두는 방식은 버렸다. 값이 두 곳에 있다는 인상을 주지 않고, 값이 어긋나는 시나리오를 쓸 수도 없게 하기 위해서다.
- [Claude 판단] 순환 시나리오의 코드 패널은 `cycle-b.js` 하나만 보이고 다른 파일은 `running`으로 보인다 — 파일 탭을 셸에 더하는 공통 코드 변경은 버렸다. 인라인 모듈은 URL이 없어 다른 모듈이 import할 수 없으므로 파일을 합칠 수도 없다.
- [Claude 판단] 링크 실패·평가 실패 예제는 정적 `import`가 아니라 `import()`의 `catch`로 보인다 — 실행기가 잡히지 않은 오류를 실패로 처리하기 때문이다.
- [Claude 판단] 경계 사례(이름 없는 default, 순환 안의 최상위 await, 모호한 이름 등)는 예제로 등록하지 않고 명세의 규칙으로 적었다 — Chromium에서 확인만 하고 페이지를 더 키우지 않았으며 `simplifications`에 밝혔다.
- [무검토 승인] 공통 코드를 바꾸지 않고 Consensus 검토를 생략한다 — 새 개념 추가 패턴 그대로이고, 명세 정확성은 구현 뒤 Opus 교차 검토로 확인했다.
- 추가 주제 4개 모두, 바인딩 시뮬레이터, 제목은 사용자가 직접 결정했다.
- 예제 17을 같은 지정자 두 번에서 `./map-log.js`와 `/map-log.js`로 바꿨다 — 같은 모듈 안의 같은 지정자는 ECMAScript가 합쳐 모듈 맵을 보여 주지 못한다는 사용자 검토를 원문으로 확인했다.

#### 배경지식

- 명세의 간접 바인딩: 이름을 지정한 import는 `CreateImportBinding`으로 만들어지고, 읽을 때 대상 바인딩의 값을 읽는다. `import * as ns`는 네임스페이스 객체로 초기화된 바인딩이다.
- 링크가 평가보다 먼저 끝나고, 링크에서 함수는 함수로, `var`는 `undefined`로 초기화되며 `let`·`const`·`class`는 초기화 전이다.
- 모듈 레코드의 한 번 평가는 두 층이다. ModuleRequests와 HostLoadImportedModule은 ECMAScript, URL과 모듈 유형을 키로 쓰는 모듈 맵은 HTML이다.

#### 확인 질문

1. 시뮬레이터의 `ImportBinding`에 값 필드가 없으면 무엇이 좋아지고, 값을 어떻게 그리는가?
   <details><summary>답</summary>값이 대상 바인딩 한 곳에만 있어 어긋날 수 없고 간접 바인딩의 의미가 구조로 드러난다. `ModuleGraphView.tsx`의 `resolve`가 from·target을 따라간다. 근거: 이 문서 3절, `scenarios.ts`의 타입.</details>
2. 순환에서 `hello()`는 되는데 `value`는 왜 ReferenceError인가? `value`가 `var`였다면 어떻게 되는가?
   <details><summary>답</summary>함수 선언은 링크에서 초기화되고 `let`은 선언이 평가되기 전까지 초기화 전이다. `var`면 링크에서 `undefined`로 초기화되어 에러 없이 `undefined`로 읽힌다. 근거: `content.mdx`의 순환 절, InitializeEnvironment.</details>
3. 예제 17이 같은 지정자를 두 번 쓰면 왜 모듈 맵의 증거가 되지 못하고, `/map-log.js`로 바꿔도 조건이 하나 필요한 이유는 무엇인가?
   <details><summary>답</summary>같은 지정자는 ModuleRequests가 한 요청으로 합쳐 호스트까지 가지 않는다. `./`와 `/`는 문서가 루트에 있을 때만 같은 URL이다. 근거: `content.mdx` 예제 17, 이 문서 변경 이력.</details>
4. `export default n`과 `export { n as default }`는 왜 결과가 다른가? 이름 없는 `export default function () {}`는 어느 쪽과 비슷한가?
   <details><summary>답</summary>전자는 `*default*` 바인딩에 그 시점의 값을 담고 후자는 `n` 바인딩을 내보낸다. 이름 없는 함수는 `*default*`를 쓰지만 선언이라 링크에서 함수로 초기화된다는 점이 식과 다르다. 근거: `content.mdx`의 default 절.</details>
5. 최상위 await가 있는 모듈을 import해도 기다리지 않는 경우는 언제인가?
   <details><summary>답</summary>형제 모듈은 원래 기다리지 않고, import한 모듈도 같은 순환 안에서 이미 평가 중인 모듈로 되돌아온 경우에는 대기가 적용되지 않는다. 근거: `content.mdx`의 최상위 await 절, InnerModuleEvaluation.</details>

