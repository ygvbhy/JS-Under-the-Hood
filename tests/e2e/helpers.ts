import type { ConsoleMessage, Page } from '@playwright/test'

export const CONCEPT_PATH = '/concepts/primitives-and-objects'
export const SIMULATOR_NAME = '원시 값과 객체 시뮬레이터'
export const SHORT_CIRCUIT_PATH = '/concepts/short-circuit-evaluation'
export const SHORT_CIRCUIT_SIMULATOR_NAME = '단축 평가 시뮬레이터'
export const TYPE_COERCION_PATH = '/concepts/type-coercion'
export const TYPE_COERCION_SIMULATOR_NAME = '암묵적 타입 변환 시뮬레이터'
export const EQUALITY_PATH = '/concepts/equality-operators'
export const EQUALITY_SIMULATOR_NAME = '동등 비교 시뮬레이터'
export const NUMBER_TYPE_PATH = '/concepts/number-type'
export const TYPEOF_PATH = '/concepts/typeof-operator'
export const INCREMENT_PATH = '/concepts/increment-decrement'
export const INCREMENT_SIMULATOR_NAME = '증감 연산자 시뮬레이터'
export const SWITCH_PATH = '/concepts/switch-break-continue'
export const SWITCH_SIMULATOR_NAME = 'switch와 break·continue 시뮬레이터'
export const PROPERTY_KEYS_PATH = '/concepts/property-keys'
export const PROPERTY_KEYS_SIMULATOR_NAME = '프로퍼티 키 시뮬레이터'
export const FUNCTION_CALLS_PATH = '/concepts/function-calls'
export const FUNCTION_CALLS_SIMULATOR_NAME = '함수 호출 시뮬레이터'
export const HOISTING_PATH = '/concepts/hoisting'
export const HOISTING_SIMULATOR_NAME = '호이스팅 시뮬레이터'
export const SCOPE_CHAIN_PATH = '/concepts/scope-chain'
export const SCOPE_CHAIN_SIMULATOR_NAME = '스코프 체인 시뮬레이터'
export const BLOCK_SCOPE_PATH = '/concepts/block-scope'
export const BLOCK_SCOPE_SIMULATOR_NAME = '블록 스코프 시뮬레이터'
export const TDZ_PATH = '/concepts/tdz'
export const TDZ_SIMULATOR_NAME = 'TDZ 시뮬레이터'
export const PROPERTY_ATTRIBUTES_PATH = '/concepts/property-attributes'
export const PROPERTY_ATTRIBUTES_SIMULATOR_NAME = '프로퍼티 어트리뷰트 시뮬레이터'
export const NEW_OPERATOR_PATH = '/concepts/new-operator'
export const NEW_OPERATOR_SIMULATOR_NAME = 'new 연산자 시뮬레이터'
export const PROTOTYPE_CHAIN_PATH = '/concepts/prototype-chain'
export const PROTOTYPE_CHAIN_SIMULATOR_NAME = '프로토타입 체인 시뮬레이터'
export const PRIMITIVE_METHODS_PATH = '/concepts/primitive-methods'
export const THIS_BINDING_PATH = '/concepts/this-binding'
export const THIS_BINDING_SIMULATOR_NAME = 'this 결정 시뮬레이터'
export const EXECUTION_CONTEXT_PATH = '/concepts/execution-context'
export const EXECUTION_CONTEXT_SIMULATOR_NAME = '실행 컨텍스트 시뮬레이터'
export const CLOSURE_PATH = '/concepts/closure'
export const CLOSURE_SIMULATOR_NAME = '클로저 시뮬레이터'
export const FOR_LET_PATH = '/concepts/for-let'
export const FOR_LET_SIMULATOR_NAME = 'for 문의 let 시뮬레이터'
export const DEFAULT_PARAMETERS_PATH = '/concepts/default-parameters'
export const DEFAULT_PARAMETERS_SIMULATOR_NAME = '매개변수 기본값 시뮬레이터'
export const GLOBAL_OBJECT_PATH = '/concepts/global-object'
export const IIFE_MODULE_PATTERN_PATH = '/concepts/iife-module-pattern'
export const CLASS_BASICS_PATH = '/concepts/class-basics'
export const CLASS_INHERITANCE_PATH = '/concepts/class-inheritance'
export const CLASS_INHERITANCE_SIMULATOR_NAME = '클래스 상속 시뮬레이터'
export const ARROW_FUNCTIONS_PATH = '/concepts/arrow-functions'
export const ARRAY_INDEX_LENGTH_PATH = '/concepts/array-index-length'
export const ARRAY_INDEX_LENGTH_SIMULATOR_NAME = '배열 length 시뮬레이터'
export const ARRAY_METHOD_PITFALLS_PATH = '/concepts/array-method-pitfalls'
export const REGEXP_LASTINDEX_PATH = '/concepts/regexp-lastindex'
export const REGEXP_LASTINDEX_SIMULATOR_NAME = 'lastIndex 시뮬레이터'
export const STRING_UTF16_PATH = '/concepts/string-utf16'
export const STRING_UTF16_VIEW_NAME = '코드 유닛 보기'
export const NUMBER_PITFALLS_PATH = '/concepts/number-pitfalls'
export const NUMBER_PITFALLS_VIEW_NAME = '반올림 판정 보기'
export const SYMBOL_PATH = '/concepts/symbol'
export const ITERABLE_FOR_OF_PATH = '/concepts/iterable-for-of'
export const ITERABLE_FOR_OF_SIMULATOR_NAME = '이터레이터 시뮬레이터'
export const SPREAD_DESTRUCTURING_PATH = '/concepts/spread-destructuring'
export const SET_MAP_PATH = '/concepts/set-map'
export const SCRIPT_ASYNC_DEFER_PATH = '/concepts/script-async-defer'
export const DOM_TREE_NODES_PATH = '/concepts/dom-tree-nodes'
export const LIVE_HTML_COLLECTION_PATH = '/concepts/live-html-collection'
export const LIVE_HTML_COLLECTION_SIMULATOR_NAME = '컬렉션 시뮬레이터'
export const HTML_ATTRIBUTE_DOM_PROPERTY_PATH = '/concepts/html-attribute-dom-property'
export const EVENT_PROPAGATION_DELEGATION_PATH = '/concepts/event-propagation-delegation'
export const EVENT_PROPAGATION_DELEGATION_SIMULATOR_NAME = '이벤트 전파 시뮬레이터'
export const PREVENT_DEFAULT_STOP_PROPAGATION_PATH = '/concepts/prevent-default-stop-propagation'
export const TIMERS_PATH = '/concepts/timers'
export const EVENT_LOOP_PATH = '/concepts/event-loop'
export const EVENT_LOOP_SIMULATOR_NAME = '이벤트 루프 시뮬레이터'
export const JSON_PATH = '/concepts/json'
export const PROMISE_PATH = '/concepts/promise'
export const PROMISE_SIMULATOR_NAME = '프로미스 시뮬레이터'
export const PROMISE_STATIC_METHODS_PATH = '/concepts/promise-static-methods'
export const PROMISE_STATIC_METHODS_SIMULATOR_NAME = 'Promise.all 장부 시뮬레이터'
export const MICROTASK_QUEUE_PATH = '/concepts/microtask-queue'
export const MICROTASK_QUEUE_SIMULATOR_NAME = '마이크로태스크 큐 시뮬레이터'
export const FETCH_PATH = '/concepts/fetch'
export const GENERATOR_PATH = '/concepts/generator'
export const GENERATOR_SIMULATOR_NAME = '제너레이터 시뮬레이터'
export const ASYNC_AWAIT_PATH = '/concepts/async-await'
export const ASYNC_AWAIT_SIMULATOR_NAME = 'async/await 시뮬레이터'
export const ERROR_HANDLING_PATH = '/concepts/error-handling'
export const ERROR_HANDLING_SIMULATOR_NAME = 'try/catch/finally 시뮬레이터'
export const ASYNC_GENERATOR_PATH = '/concepts/async-generator'
export const ASYNC_GENERATOR_SIMULATOR_NAME = 'async 제너레이터 시뮬레이터'
export const DATE_PATH = '/concepts/date'
export const DATE_SIMULATOR_NAME = 'Date 필드 계산 시뮬레이터'
export const ES_MODULES_PATH = '/concepts/es-modules'
export const ES_MODULES_SIMULATOR_NAME = 'ES 모듈 시뮬레이터'

// 404 문서 자체를 받을 때 브라우저가 남기는 리소스 로드 로그. 앱 오류가 아니므로 무시한다.
const IGNORED_404_LOG = /Failed to load resource: the server responded with a status of 404/

export type ConsoleErrors = { readonly messages: string[] }

// 콘솔 error와 처리되지 않은 예외(pageerror)를 모은다. 하이드레이션 경고·오류도 여기에 잡힌다.
export function collectConsoleErrors(page: Page, options: { ignore404Resource?: boolean } = {}) {
  const messages: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return
    if (options.ignore404Resource && IGNORED_404_LOG.test(msg.text())) return
    messages.push(`console.error: ${msg.text()}`)
  })
  page.on('pageerror', (error) => {
    messages.push(`pageerror: ${error.message}`)
  })
  return { messages } satisfies ConsoleErrors
}

// 프리렌더된 HTML은 JS가 붙기 전에도 보이므로, 클릭·입력 전에 React 하이드레이션이 끝났는지 확인한다.
// React는 하이드레이션 중 DOM 노드에 내부 fiber 키를 붙인다.
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('h1')
    return !!el && Object.keys(el).some((key) => key.startsWith('__reactFiber'))
  })
}
export const PROPERTY_ORDER_PATH = '/concepts/property-order'
export const PROPERTY_ORDER_SIMULATOR_NAME = '키 순서 시뮬레이터'
