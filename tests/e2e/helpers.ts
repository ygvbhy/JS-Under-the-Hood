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
export const GLOBAL_OBJECT_PATH = '/concepts/global-object'
export const IIFE_MODULE_PATTERN_PATH = '/concepts/iife-module-pattern'

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
