import type { LineRange, Scenario, Step } from '~/simulator/types'
import paramScopeCode from './examples/param-scope.js?raw'
import sameNameVarCode from './examples/same-name-var.js?raw'

// 이 개념의 시각화 상태 모델. for-let의 상태 모델을 줄여, 함수 호출이 만드는 환경 레코드 두 개(매개변수 레코드, 본문 var 레코드)를 더했다.
// 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - running: 지금 실행 중인 코드를 가리키는 표시 문자열('실행 전', '전역 코드', 'read 호출', 'demo 호출', 'get 호출').
// - lexicalEnv: 지금 실행 중인 컨텍스트의 LexicalEnvironment가 가리키는 레코드 id.
//   실행 전과 'get 호출' 중에는 null이다(get 호출이 만드는 환경 레코드는 그리지 않는다).
//   전역 코드 'global', 매개변수 평가 중 'params', 본문 실행 중 'vars'.
// - envs: 지금 그림에 있는 환경 레코드(생긴 순서). id 규칙: 'global' | 'params' | 'vars'. 바깥 연결은 vars → params → global이다.
//   - global: 스크립트의 var와 함수 선언은 전역 환경 레코드의 객체 칸(objectBindings)에 있다. 함수 선언 이름의 값은 표시 문자열 '함수'다.
//   - params: 매개변수 목록에 식이 있는 함수 호출이 만드는 매개변수 레코드.
//   - vars: 본문의 var 이름을 담는 레코드. 매개변수 이름과 같은 var는 매개변수의 값으로 초기화된다(별도 바인딩).
//   sloppy 함수의 함수 환경 레코드와 렉시컬 레코드, 매개변수 레코드의 arguments 바인딩은 그리지 않는다.
// - functions: 기본값 식이 만든 익명 함수 객체. 항상 environmentId = 'params'(그 식을 평가할 때의 LexicalEnvironment).
//   호출이 끝나면 get을 붙드는 것이 없으므로 params·vars 레코드와 함께 그림에서 뺀다.
// - Binding.value는 표시 문자열이다("'outer'", 'undefined', '함수'). 초기화 전이면 null이다.
// - lookup: 그 단계에서 x를 찾는 경로. path는 start 쪽 레코드부터 바깥 연결을 따라 처음 찾은 레코드까지이고, result는 그 바인딩의 값이다.
//   part는 전역에서 찾았을 때만 어느 칸인지 적는다. start가 함수 id이면 그 함수의 [[Environment]]에서 시작한다.
//   경로·result는 계산하지 않고 손으로 쓴다(테스트가 상태에서 다시 계산해 대조한다).
// - `created`(EnvRecord)와 `changed`(Binding)는 "그 단계에서" 새로 생기거나 초기화되거나 값이 바뀐 항목에만 붙인다.
//   새로 생긴 레코드의 바인딩은 모두 changed다.

export type Binding = {
  name: string
  value: string | null
  state: 'uninitialized' | 'initialized'
  changed?: true
}

export type EnvRecord = {
  id: 'global' | 'params' | 'vars'
  kind: 'global' | 'params' | 'vars'
  label: string
  outerId: string | null
  bindings: Binding[]
  objectBindings?: Binding[]
  created?: true
}

export type FnObject = { id: string; label: string; environmentId: string; heldBy: string }

export type Lookup = {
  name: string
  start: 'context' | string
  path: string[]
  foundIn: string | null
  part?: 'declarative' | 'object'
  result: string
}

export type DefaultParametersState = {
  running: string
  lexicalEnv: string | null
  envs: EnvRecord[]
  functions: FnObject[]
  lookup: Lookup | null
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const init = (name: string, value: string, changed = false): Binding => ({
  name,
  value,
  state: 'initialized',
  ...(changed && { changed: true as const }),
})
const uninit = (name: string, changed = false): Binding => ({
  name,
  value: null,
  state: 'uninitialized',
  ...(changed && { changed: true as const }),
})

const globalRec = (objectBindings: Binding[], created = false): EnvRecord => ({
  id: 'global',
  kind: 'global',
  label: '전역 환경 레코드',
  outerId: null,
  bindings: [],
  objectBindings,
  ...(created && { created: true as const }),
})
const paramsRec = (bindings: Binding[], created = false): EnvRecord => ({
  id: 'params',
  kind: 'params',
  label: '매개변수 레코드',
  outerId: 'global',
  bindings,
  ...(created && { created: true as const }),
})
const varsRec = (bindings: Binding[], created = false): EnvRecord => ({
  id: 'vars',
  kind: 'vars',
  label: '본문 var 레코드',
  outerId: 'params',
  bindings,
  ...(created && { created: true as const }),
})

const getFn: FnObject = {
  id: 'fn',
  label: '익명 함수(get의 기본값)',
  environmentId: 'params',
  heldBy: '매개변수 get',
}

const look = (
  start: string,
  path: string[],
  foundIn: string,
  result: string,
  part?: 'declarative' | 'object',
): Lookup => ({
  name: 'x',
  start,
  path,
  foundIn,
  result,
  ...(part && { part }),
})

const st = (
  running: string,
  lexicalEnv: string | null,
  envs: EnvRecord[],
  functions: FnObject[] = [],
  lookup: Lookup | null = null,
): DefaultParametersState => ({ running, lexicalEnv, envs, functions, lookup })

const at = (n: number): LineRange => ({ from: n, to: n })

type S = Step<DefaultParametersState>
const step = (
  title: string,
  explanation: string,
  line: LineRange | undefined,
  state: DefaultParametersState,
  output: string[] = [],
): S => ({ title, explanation, ...(line && { line }), state, output })

const introText =
  '코드를 실행하기 전입니다. 이 시각화는 지금 실행 중인 코드, 그 코드의 LexicalEnvironment(이름을 찾기 시작하는 환경 레코드), 환경 레코드와 그 안의 바인딩, 함수 객체가 가리키는 [[Environment]]를 보여 줍니다. 레코드 사이의 바깥 연결은 이름을 찾을 때 따라가는 길입니다.'
const consoleNote = '(console.log 호출이 만드는 컨텍스트는 이 그림에서 생략합니다.)'
const callNote =
  '(get 함수를 호출하면 만들어지는 환경 레코드에는 찾는 이름 x가 없어 그리지 않고, 이름 탐색을 함수 객체의 [[Environment]]부터 보여 줍니다.)'
const recordNote =
  '(이 그림은 sloppy 함수의 함수 환경 레코드와 렉시컬 레코드, 매개변수 레코드의 arguments 바인딩을 생략합니다.)'

// --- 시나리오 1: 기본값 안의 함수와 본문 var --------------------------------------------------

const g1 = (x: string, changed = false, created = false) =>
  globalRec([init('x', x, changed), init('read', '함수', created)], created)
const gx = "'outer'"

const paramScopeSteps: S[] = [
  step(
    '실행 전',
    `${introText} 전역 환경 레코드의 객체 칸에는 var x가 undefined로, 함수 선언 read가 함수 객체로 이미 만들어져 있습니다(스크립트의 var와 함수 선언은 코드를 실행하기 전에 처리됩니다).`,
    undefined,
    st('실행 전', null, [g1('undefined', true, true)]),
  ),
  step(
    "x = 'outer'",
    "1번째 줄을 실행해 전역의 x에 'outer'를 대입합니다.",
    at(1),
    st('전역 코드', 'global', [g1(gx, true)]),
  ),
  step(
    'read() 호출: 매개변수 레코드',
    `6번째 줄에서 read()를 호출합니다. 매개변수 목록에 기본값 식이 있고 함수가 sloppy mode이므로, 명세는 함수 환경 레코드와 별도로 매개변수를 담을 레코드를 새로 만들어(직접 eval을 처리하기 위한 분리입니다) 매개변수 이름 get의 바인딩을 초기화 전 상태로 둡니다. 인수가 없어 get의 값은 undefined이므로 기본값 식을 평가해야 합니다. ${recordNote}`,
    at(6),
    st('read 호출', 'params', [g1(gx), paramsRec([uninit('get', true)], true)]),
  ),
  step(
    '기본값 식 평가: 함수 생성',
    '2번째 줄의 기본값 식 function () { return x; }를 평가합니다. 이때 LexicalEnvironment는 매개변수 레코드이므로, 만들어지는 함수 객체의 [[Environment]]는 매개변수 레코드입니다. 본문의 var 레코드는 아직 없고, 있더라도 이 함수의 [[Environment]]가 아닙니다.',
    at(2),
    st('read 호출', 'params', [g1(gx), paramsRec([uninit('get')])], [getFn]),
  ),
  step(
    'get 초기화',
    '평가한 함수 객체로 매개변수 get의 바인딩을 초기화합니다. 이것으로 매개변수 초기화가 끝났습니다.',
    at(2),
    st('read 호출', 'params', [g1(gx), paramsRec([init('get', '함수', true)])], [getFn]),
  ),
  step(
    '본문 var 레코드 생성',
    `매개변수 초기화가 끝나면 명세는 본문의 var 이름을 담을 새 레코드를 만들고, 그 바깥을 매개변수 레코드로 잇습니다. x는 매개변수 이름이 아니므로 undefined로 시작합니다. 이 레코드는 본문 실행 전에 만들어지므로 3번째 줄이 실행되기 전부터 있습니다. ${recordNote}`,
    at(3),
    st(
      'read 호출',
      'vars',
      [g1(gx), paramsRec([init('get', '함수')]), varsRec([init('x', 'undefined', true)], true)],
      [getFn],
    ),
  ),
  step(
    "x = 'body'",
    "3번째 줄이 본문 var 레코드의 x에 'body'를 대입합니다. 전역의 x와 매개변수 레코드는 바뀌지 않습니다.",
    at(3),
    st(
      'read 호출',
      'vars',
      [g1(gx), paramsRec([init('get', '함수')]), varsRec([init('x', "'body'", true)])],
      [getFn],
    ),
  ),
  step(
    'get() 호출: 안의 x 탐색',
    `4번째 줄에서 get()을 호출합니다. 함수 안의 x는 get의 [[Environment]]인 매개변수 레코드부터 찾습니다. 매개변수 레코드에는 x가 없어 바깥인 전역 환경 레코드로 가고, 객체 칸에서 x('outer')를 찾습니다. 함수의 [[Environment]]가 매개변수 레코드이기 때문에 본문 var 레코드는 길에 들어 있지 않습니다. ${callNote}`,
    at(4),
    st(
      'get 호출',
      null,
      [g1(gx), paramsRec([init('get', '함수')]), varsRec([init('x', "'body'")])],
      [getFn],
      look('fn', ['params', 'global'], 'global', gx, 'object'),
    ),
  ),
  step(
    '본문의 x 탐색',
    "get이 돌아온 뒤 4번째 줄의 x를 찾습니다. 본문 코드에서 시작한 이름 탐색은 그림의 첫 레코드인 본문 var 레코드에서 x('body')를 찾습니다.",
    at(4),
    st(
      'read 호출',
      'vars',
      [g1(gx), paramsRec([init('get', '함수')]), varsRec([init('x', "'body'")])],
      [getFn],
      look('context', ['vars'], 'vars', "'body'"),
    ),
  ),
  step(
    'read 반환: 출력',
    `read가 'outer body'를 돌려주고 호출이 끝납니다. 매개변수 레코드, 본문 var 레코드, get 함수 객체는 더 이상 이 그림에서 닿을 곳이 없어 사라집니다. 6번째 줄의 console.log가 반환값을 출력합니다. ${consoleNote}`,
    at(6),
    st('전역 코드', 'global', [g1(gx)]),
    ['outer body'],
  ),
  step('실행 끝', '코드가 모두 실행되었습니다.', undefined, st('전역 코드', 'global', [g1(gx)]), [
    'outer body',
  ]),
]

// --- 시나리오 2: 같은 이름의 var ---------------------------------------------------------------

const g2 = (created = false) => globalRec([init('demo', '함수', created)], created)
const arg = "'arg'"
const body = "'body'"
const dFn = (x: Binding, get: Binding, created = false) => paramsRec([x, get], created)

const sameNameSteps: S[] = [
  step(
    '실행 전',
    `${introText} 전역 환경 레코드의 객체 칸에는 함수 선언 demo가 함수 객체로 이미 만들어져 있습니다.`,
    undefined,
    st('실행 전', null, [g2(true)]),
  ),
  step(
    "demo('arg') 호출: 매개변수 레코드",
    `7번째 줄에서 demo('arg')를 호출합니다. 매개변수 목록에 기본값 식이 있고 함수가 sloppy mode이므로 매개변수 레코드를 따로 만들고, 매개변수 x와 get의 바인딩을 모두 초기화 전 상태로 둡니다. ${recordNote}`,
    at(7),
    st('demo 호출', 'params', [g2(), dFn(uninit('x', true), uninit('get', true), true)]),
  ),
  step(
    'x를 인수로 초기화',
    "매개변수는 왼쪽부터 초기화합니다. 첫 번째 인수 'arg'가 있으므로 x를 'arg'로 초기화합니다.",
    at(1),
    st('demo 호출', 'params', [g2(), dFn(init('x', arg, true), uninit('get'))]),
  ),
  step(
    'get 기본값 평가·초기화',
    '두 번째 인수가 없어 get의 값은 undefined이므로 기본값 식을 평가합니다. 이때 LexicalEnvironment는 매개변수 레코드이므로 만들어진 함수 객체의 [[Environment]]는 매개변수 레코드입니다. 그 함수 객체로 get을 초기화합니다.',
    at(1),
    st('demo 호출', 'params', [g2(), dFn(init('x', arg), init('get', '함수', true))], [getFn]),
  ),
  step(
    '본문 var 레코드 생성',
    `본문의 var x에 대해 명세는 본문 var 레코드에 x 바인딩을 따로 만듭니다. 같은 이름의 매개변수가 있으면 그 매개변수의 값으로 초기화하므로, 새 x는 'arg'로 시작합니다. 같은 이름이어도 매개변수 레코드의 x와는 별도 바인딩입니다. 이 레코드는 본문 실행 전에 만들어지고, 2번째 줄의 var x; 문장은 값을 바꾸지 않습니다. ${recordNote}`,
    at(2),
    st(
      'demo 호출',
      'vars',
      [g2(), dFn(init('x', arg), init('get', '함수')), varsRec([init('x', arg, true)], true)],
      [getFn],
    ),
  ),
  step(
    'console.log(x): 본문의 x 탐색',
    `3번째 줄의 x를 찾습니다. 본문 코드에서 시작한 이름 탐색은 그림의 첫 레코드인 본문 var 레코드에서 x('arg')를 찾습니다. ${consoleNote}`,
    at(3),
    st(
      'demo 호출',
      'vars',
      [g2(), dFn(init('x', arg), init('get', '함수')), varsRec([init('x', arg)])],
      [getFn],
      look('context', ['vars'], 'vars', arg),
    ),
    ['arg'],
  ),
  step(
    "x = 'body'",
    "4번째 줄이 대입하는 x는 본문 var 레코드의 x입니다. 그래서 이 레코드의 x만 'body'로 바뀌고, 매개변수 레코드의 x는 'arg' 그대로입니다.",
    at(4),
    st(
      'demo 호출',
      'vars',
      [g2(), dFn(init('x', arg), init('get', '함수')), varsRec([init('x', body, true)])],
      [getFn],
    ),
    ['arg'],
  ),
  step(
    '5번째 줄: 본문의 x 탐색',
    "5번째 줄의 인수를 왼쪽부터 평가합니다. 먼저 x는 본문 var 레코드에서 찾아 'body'입니다.",
    at(5),
    st(
      'demo 호출',
      'vars',
      [g2(), dFn(init('x', arg), init('get', '함수')), varsRec([init('x', body)])],
      [getFn],
      look('context', ['vars'], 'vars', body),
    ),
    ['arg'],
  ),
  step(
    'get() 호출: 안의 x 탐색',
    `다음 인수 get()을 호출합니다. 함수 안의 x는 get의 [[Environment]]인 매개변수 레코드에서 바로 찾아 'arg'입니다. 본문 var 레코드의 x('body')와는 다른 바인딩입니다. ${callNote}`,
    at(5),
    st(
      'get 호출',
      null,
      [g2(), dFn(init('x', arg), init('get', '함수')), varsRec([init('x', body)])],
      [getFn],
      look('fn', ['params'], 'params', arg),
    ),
    ['arg'],
  ),
  step(
    'console.log 출력',
    `두 인수의 값 'body'와 'arg'가 정해져 console.log가 'body arg'를 출력합니다. ${consoleNote}`,
    at(5),
    st(
      'demo 호출',
      'vars',
      [g2(), dFn(init('x', arg), init('get', '함수')), varsRec([init('x', body)])],
      [getFn],
    ),
    ['arg', 'body arg'],
  ),
  step(
    'demo 호출 끝',
    '함수 본문이 끝나 호출이 끝납니다. 매개변수 레코드, 본문 var 레코드, get 함수 객체는 이 그림에서 닿을 곳이 없어 사라집니다.',
    at(7),
    st('전역 코드', 'global', [g2()]),
    ['arg', 'body arg'],
  ),
  step('실행 끝', '코드가 모두 실행되었습니다.', undefined, st('전역 코드', 'global', [g2()]), [
    'arg',
    'body arg',
  ]),
]

export const scenarios: Scenario<DefaultParametersState>[] = [
  {
    id: 'param-scope',
    label: '기본값 안의 함수와 본문 var',
    exampleId: 'param-scope',
    code: paramScopeCode,
    steps: paramScopeSteps,
  },
  {
    id: 'same-name-var',
    label: '같은 이름의 var',
    exampleId: 'same-name-var',
    code: sameNameVarCode,
    steps: sameNameSteps,
  },
]
