import type { LineRange, Scenario, Step } from '~/simulator/types'
import copyTimingCode from './examples/copy-timing.js?raw'
import letLoopCode from './examples/let-loop.js?raw'
import varLoopCode from './examples/var-loop.js?raw'

// 이 개념의 시각화 상태 모델. closure의 상태 모델에서 실행 컨텍스트 스택을 빼고, 전역 실행 컨텍스트의 LexicalEnvironment 하나와
// for 문이 만드는 레코드 종류(머리·반복·본문 블록)를 더했다. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - lexicalEnv: 전역 실행 컨텍스트의 LexicalEnvironment가 가리키는 레코드 id(실행 전에는 null).
//   그리는 컨텍스트는 전역 하나뿐이다. 함수 호출이 만드는 실행 컨텍스트와 그 함수 환경 레코드(바인딩 없음)는 그리지 않고,
//   호출한 함수 안의 이름 탐색은 그 함수 객체의 environmentId([[Environment]])에서 시작하는 것으로 그린다(lookup.start = 함수 객체 id).
//   start가 'context'이면 탐색은 lexicalEnv에서 시작한다.
// - envs: 지금 그림에 있는 환경 레코드(생긴 순서). id 규칙: 'global' | 'loop' | `iter${n}` | `block${n}`.
//   - global: bindings = 선언적 칸(let·const), objectBindings = 객체 칸(var). var 시나리오에서만 객체 칸을 쓴다.
//   - loop(머리 레코드): for (let …) 머리의 바인딩. 바깥은 'global'이다.
//   - iteration(n번째 반복 레코드): CreatePerIterationEnvironment가 만든다. 바깥은 직전 반복 레코드(또는 머리 레코드)가 아니라
//     그 레코드의 [[OuterEnv]], 곧 'global'이다. 새 레코드에 i 바인딩을 만들고 직전 레코드의 값으로 초기화한다.
//   - block(n번째 본문 블록 레코드): 문장이 있는 본문 { … }을 실행할 때마다 만드는 빈 선언적 레코드.
//     바깥은 블록에 들어가는 시점의 LexicalEnvironment다(let이면 반복 레코드, var이면 'global'). 본문에서 만든 함수의 [[Environment]]는 이 레코드다.
//   - retained: 어떤 실행 컨텍스트의 LexicalEnvironment에서도(바깥 연결을 따라) 닿지 않지만, 함수 객체의 environmentId에서 바깥 연결로
//     이어져 그림에 남은 레코드.
// - 제거 규칙(도달 가능성): 전역과 lexicalEnv에서 outerId를 따라 닿는 레코드, 그리고 함수 객체의 environmentId에서 outerId를 따라 닿는 레코드만 그린다.
//   함수는 전역 const fns가 붙들고 있으므로 만든 함수 객체는 계속 남는다. 닿지 않게 되는 단계에서 레코드를 뺀다.
// - functions: { id: `fn${k}`, label: `익명 함수(fns[${k}])`, heldBy: `fns의 ${k} 프로퍼티`, environmentId }. k는 fns에 넣은 키다.
// - Binding.value는 표시 문자열이다('0', 'undefined', '객체'). 초기화 전이면 null이다.
// - lookup: 그 단계에서 i를 찾는 경로. path는 start 쪽 레코드부터 [[OuterEnv]]를 따라 처음 찾은 레코드까지이고, result는 그 단계 상태에서의 바인딩 값이다
//   (i++처럼 값을 바꾸는 단계에서는 바꾼 뒤의 값). part는 전역에서 찾았을 때만 어느 칸인지 적는다(선언적 칸 먼저, 객체 칸 나중).
//   경로·result·retained·outerId는 계산하지 않고 손으로 쓴다(테스트가 상태에서 다시 계산해 대조한다).
// - `created`(EnvRecord)와 `changed`(Binding)는 "그 단계에서" 새로 생기거나 초기화되거나 값이 바뀐 항목에만 붙인다.
//   새로 생긴 레코드의 바인딩은 모두 changed다.
// - 조건(test) 단계의 제목은 '조건'으로 시작한다. 그 단계의 lookup.result가 그 시점의 i 값이고, 테스트가 실제 실행의 i 값과 대조한다.

export type Binding = {
  name: string
  value: string | null
  state: 'uninitialized' | 'initialized'
  changed?: true
}

export type EnvRecord = {
  id: string
  kind: 'global' | 'loop' | 'iteration' | 'block'
  label: string
  outerId: string | null
  bindings: Binding[]
  objectBindings?: Binding[]
  created?: true
  retained?: true
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

export type ForLetState = {
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

type Flags = { c?: boolean; ch?: boolean; r?: boolean } // 새로 생김 / i가 이 단계에서 바뀜 / 남아 있음

const flag = (f: Flags): Pick<EnvRecord, 'created' | 'retained'> => ({
  ...(f.c && { created: true as const }),
  ...(f.r && { retained: true as const }),
})

const globalRec = (
  bindings: Binding[],
  objectBindings?: Binding[],
  created = false,
): EnvRecord => ({
  id: 'global',
  kind: 'global',
  label: '전역 환경 레코드',
  outerId: null,
  bindings,
  ...(objectBindings && { objectBindings }),
  ...(created && { created: true as const }),
})
const loopRec = (v: string, f: Flags = {}): EnvRecord => ({
  id: 'loop',
  kind: 'loop',
  label: '반복 머리 레코드',
  outerId: 'global',
  bindings: [init('i', v, f.c || f.ch)],
  ...flag(f),
})
const iterRec = (n: number, v: string, f: Flags = {}): EnvRecord => ({
  id: `iter${n}`,
  kind: 'iteration',
  label: `${n}번째 반복 레코드`,
  outerId: 'global',
  bindings: [init('i', v, f.c || f.ch)],
  ...flag(f),
})
const blockRec = (n: number, outerId: string, f: Flags = {}): EnvRecord => ({
  id: `block${n}`,
  kind: 'block',
  label: `${n}번째 본문 블록 레코드`,
  outerId,
  bindings: [],
  ...flag(f),
})
const fnObj = (k: number, environmentId: string): FnObject => ({
  id: `fn${k}`,
  label: `익명 함수(fns[${k}])`,
  environmentId,
  heldBy: `fns의 ${k} 프로퍼티`,
})

const look = (
  start: string,
  path: string[],
  foundIn: string,
  result: string,
  part?: 'declarative' | 'object',
): Lookup => ({
  name: 'i',
  start,
  path,
  foundIn,
  result,
  ...(part && { part }),
})

const st = (
  lexicalEnv: string | null,
  envs: EnvRecord[],
  functions: FnObject[] = [],
  lookup: Lookup | null = null,
): ForLetState => ({ lexicalEnv, envs, functions, lookup })

const at = (n: number): LineRange => ({ from: n, to: n })
const span = (from: number, to: number): LineRange => ({ from, to })

type S = Step<ForLetState>
const step = (
  title: string,
  explanation: string,
  line: LineRange | undefined,
  state: ForLetState,
  output: string[] = [],
): S => ({ title, explanation, ...(line && { line }), state, output })

const introText =
  '코드를 실행하기 전입니다. 이 시각화는 전역 실행 컨텍스트의 LexicalEnvironment(지금 코드가 이름을 찾기 시작하는 환경 레코드), for 문이 만드는 환경 레코드, 함수 객체가 가리키는 [[Environment]]를 보여 줍니다. 레코드 안의 [[OuterEnv]]는 바깥 레코드로 이어지는 연결입니다.'
const callNote =
  '(fns 함수를 호출하면 실행 컨텍스트와 바인딩이 없는 함수 환경 레코드가 만들어지지만 이 그림에서는 생략하고, 이름 탐색을 함수 객체의 [[Environment]]부터 보여 줍니다. console.log 호출이 만드는 컨텍스트도 생략합니다.)'
const consoleNote = '(console.log 호출이 만드는 컨텍스트는 이 그림에서 생략합니다.)'

const before = st(null, [])

// --- 시나리오 1: var — 함수들이 같은 i를 가리킴 ------------------------------------------------

const vGlobal = (i: Binding, fns: Binding, created = false) => globalRec([fns], [i], created)
const vFns = '객체'
const vi = (v: string, changed = false) => init('i', v, changed)
const vf = init('fns', vFns)

const varSteps: S[] = [
  step('실행 전', introText, undefined, before),
  step(
    '전역 코드의 선언 처리',
    '코드를 실행하기 전에 전역 코드의 선언을 처리합니다. var i는 전역 환경 레코드의 객체 칸에 undefined로 만들어지고, const fns는 선언적 칸에 만들어지지만 아직 초기화되지 않았습니다.',
    undefined,
    st('global', [vGlobal(vi('undefined', true), uninit('fns', true), true)]),
  ),
  step(
    'fns 초기화',
    '1번째 줄에서 빈 객체를 만들어 fns를 초기화합니다. 함수들은 이 객체의 프로퍼티로 담기므로 함수 객체는 전역 const fns를 통해 계속 닿을 수 있습니다.',
    at(1),
    st('global', [vGlobal(vi('undefined'), init('fns', vFns, true))]),
  ),
  step(
    'for 머리: var i = 0',
    'for (var …) 문은 반복마다 새 레코드를 만들 이름 목록이 비어 있습니다. 그래서 머리를 실행해도 새 환경 레코드가 생기지 않고, 이미 선언 처리에서 만들어진 전역의 i에 0을 대입합니다.',
    at(2),
    st(
      'global',
      [vGlobal(vi('0', true), vf)],
      [],
      look('context', ['global'], 'global', '0', 'object'),
    ),
  ),
  step(
    '조건 i < 3: 참',
    '조건식은 LexicalEnvironment인 전역 환경 레코드에서 i를 찾아 0 < 3을 평가하고, 결과는 참입니다.',
    at(2),
    st('global', [vGlobal(vi('0'), vf)], [], look('context', ['global'], 'global', '0', 'object')),
  ),
  step(
    '본문 실행: fns[0]에 함수',
    '본문 { … }에는 문장이 있어 실행할 때마다 새 선언적 환경 레코드를 만듭니다. 바깥은 지금의 LexicalEnvironment인 전역이고, 이 레코드가 LexicalEnvironment가 됩니다. 함수 식을 평가하면 현재 LexicalEnvironment인 이 블록 레코드를 [[Environment]]로 가진 함수 객체가 만들어져 fns[0]에 담깁니다.',
    at(3),
    st(
      'block1',
      [vGlobal(vi('0'), vf), blockRec(1, 'global', { c: true })],
      [fnObj(0, 'block1')],
      look('context', ['block1', 'global'], 'global', '0', 'object'),
    ),
  ),
  step(
    '증가식 i++',
    '본문이 끝나 LexicalEnvironment가 전역으로 돌아옵니다. 1번째 블록 레코드는 실행 컨텍스트에서는 닿지 않지만 fns[0]의 [[Environment]]가 가리켜 남습니다. 증가식 i++는 전역의 i를 1로 바꿉니다.',
    at(2),
    st(
      'global',
      [vGlobal(vi('1', true), vf), blockRec(1, 'global', { r: true })],
      [fnObj(0, 'block1')],
      look('context', ['global'], 'global', '1', 'object'),
    ),
  ),
  step(
    '조건 i < 3 · 본문 실행',
    '조건식은 i가 1이므로 참이고, 본문을 실행하면 2번째 블록 레코드가 생겨 LexicalEnvironment가 됩니다. fns[1]에 담기는 함수의 [[Environment]]는 이 블록 레코드입니다. 두 블록 레코드의 바깥은 모두 전역이어서, 두 함수가 찾는 i는 같은 전역 바인딩입니다.',
    span(2, 3),
    st(
      'block2',
      [
        vGlobal(vi('1'), vf),
        blockRec(1, 'global', { r: true }),
        blockRec(2, 'global', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2')],
      look('context', ['block2', 'global'], 'global', '1', 'object'),
    ),
  ),
  step(
    '증가식 i++',
    '본문이 끝나고 증가식 i++가 전역의 i를 2로 바꿉니다. 2번째 블록 레코드도 fns[1]이 가리켜 남습니다.',
    at(2),
    st(
      'global',
      [
        vGlobal(vi('2', true), vf),
        blockRec(1, 'global', { r: true }),
        blockRec(2, 'global', { r: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2')],
      look('context', ['global'], 'global', '2', 'object'),
    ),
  ),
  step(
    '조건 i < 3 · 본문 실행',
    '조건식은 i가 2이므로 참이고, 3번째 블록 레코드가 생겨 fns[2]의 [[Environment]]가 됩니다.',
    span(2, 3),
    st(
      'block3',
      [
        vGlobal(vi('2'), vf),
        blockRec(1, 'global', { r: true }),
        blockRec(2, 'global', { r: true }),
        blockRec(3, 'global', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
      look('context', ['block3', 'global'], 'global', '2', 'object'),
    ),
  ),
  step(
    '증가식 i++',
    '본문이 끝나고 증가식 i++가 전역의 i를 3으로 바꿉니다.',
    at(2),
    st(
      'global',
      [
        vGlobal(vi('3', true), vf),
        blockRec(1, 'global', { r: true }),
        blockRec(2, 'global', { r: true }),
        blockRec(3, 'global', { r: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
      look('context', ['global'], 'global', '3', 'object'),
    ),
  ),
  step(
    '조건 i < 3: 거짓, for 문 끝',
    '조건식은 3 < 3이어서 거짓이므로 for 문이 끝납니다. var i는 전역 하나뿐이고 지금 값은 3입니다.',
    at(2),
    st(
      'global',
      [
        vGlobal(vi('3'), vf),
        blockRec(1, 'global', { r: true }),
        blockRec(2, 'global', { r: true }),
        blockRec(3, 'global', { r: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
      look('context', ['global'], 'global', '3', 'object'),
    ),
  ),
]

const vAll = [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')]
const vEnvs = [
  vGlobal(vi('3'), vf),
  blockRec(1, 'global', { r: true }),
  blockRec(2, 'global', { r: true }),
  blockRec(3, 'global', { r: true }),
]
varSteps.push(
  step(
    'fns[0]() 호출',
    `fns[0]을 호출하면 함수 안의 i를 fns[0]의 [[Environment]]인 1번째 블록 레코드부터 찾습니다. 블록 레코드에는 i가 없어 바깥인 전역으로 가서 객체 칸의 i(값 3)를 찾습니다. ${callNote}`,
    at(5),
    st('global', vEnvs, vAll, look('fn0', ['block1', 'global'], 'global', '3', 'object')),
  ),
  step(
    'fns[1]() 호출',
    `fns[1]은 2번째 블록 레코드에서 시작하지만 역시 전역의 같은 i를 찾아 3입니다. ${consoleNote}`,
    at(5),
    st('global', vEnvs, vAll, look('fn1', ['block2', 'global'], 'global', '3', 'object')),
  ),
  step(
    'fns[2]() 호출',
    `fns[2]도 전역의 i를 찾아 3입니다. 세 함수가 같은 바인딩을 읽으므로 console.log가 "3 3 3"을 출력합니다. ${consoleNote}`,
    at(5),
    st('global', vEnvs, vAll, look('fn2', ['block3', 'global'], 'global', '3', 'object')),
    ['3 3 3'],
  ),
)

// --- 시나리오 2: let — 반복마다 새 레코드 -------------------------------------------------------

const lg = init('fns', '객체')
const lGlobalPlain = globalRec([lg])
const lHead = (title: string, explanation: string, state: ForLetState): S =>
  step(title, explanation, at(2), state)

const letSteps: S[] = [
  step('실행 전', introText, undefined, before),
  step(
    '전역 코드의 선언 처리',
    '코드를 실행하기 전에 전역 코드의 선언을 처리합니다. const fns가 전역 환경 레코드의 선언적 칸에 만들어지지만 아직 초기화되지 않았습니다. for 문의 let i는 for 문을 실행할 때 만들어집니다.',
    undefined,
    st('global', [globalRec([uninit('fns', true)], undefined, true)]),
  ),
  step(
    'fns 초기화',
    '1번째 줄에서 빈 객체를 만들어 fns를 초기화합니다. 함수들은 이 객체의 프로퍼티로 담기므로 함수 객체는 계속 닿을 수 있습니다.',
    at(1),
    st('global', [globalRec([init('fns', '객체', true)])]),
  ),
  step(
    'for 머리: let i = 0',
    'for (let …) 문은 먼저 지금의 LexicalEnvironment(전역)를 바깥으로 하는 머리 레코드를 만들고 i 바인딩을 만든 뒤 0으로 초기화합니다. 이 레코드가 LexicalEnvironment가 됩니다.',
    at(2),
    st('loop', [lGlobalPlain, loopRec('0', { c: true })]),
  ),
  lHead(
    '첫 반복 레코드',
    '첫 반복 전에 CreatePerIterationEnvironment가 새 반복 레코드를 만들어 i 바인딩을 만들고 머리 레코드의 값 0으로 초기화합니다. 이 반복 레코드의 바깥은 머리 레코드가 아니라 머리 레코드의 [[OuterEnv]], 곧 전역입니다. LexicalEnvironment가 이 레코드로 바뀌면 머리 레코드는 어디에서도 닿지 않아 그림에서 뺍니다.',
    st('iter1', [lGlobalPlain, iterRec(1, '0', { c: true })]),
  ),
  step(
    '조건 i < 3: 참',
    '첫 조건식부터 1번째 반복 레코드에서 평가합니다. i를 이 레코드에서 찾아 0 < 3이 참입니다.',
    at(2),
    st('iter1', [lGlobalPlain, iterRec(1, '0')], [], look('context', ['iter1'], 'iter1', '0')),
  ),
  step(
    '본문 실행: fns[0]에 함수',
    '본문 { … }을 실행하면 새 블록 레코드가 생깁니다. 바깥은 지금의 LexicalEnvironment인 1번째 반복 레코드입니다. 함수 식을 평가하면 이 블록 레코드를 [[Environment]]로 가진 함수 객체가 fns[0]에 담깁니다. 이 함수가 찾는 i는 1번째 반복 레코드의 i입니다.',
    at(3),
    st(
      'block1',
      [lGlobalPlain, iterRec(1, '0'), blockRec(1, 'iter1', { c: true })],
      [fnObj(0, 'block1')],
      look('context', ['block1', 'iter1'], 'iter1', '0'),
    ),
  ),
  step(
    '새 반복 레코드',
    '본문이 끝나면 증가식을 평가하기 전에 CreatePerIterationEnvironment가 2번째 반복 레코드를 만듭니다. 새 레코드에 i 바인딩을 만들고 직전 반복 레코드의 값 0으로 초기화합니다. 바깥은 역시 전역입니다. 1번째 반복 레코드와 1번째 블록 레코드는 LexicalEnvironment에서 닿지 않지만 fns[0]이 가리켜 남습니다.',
    at(2),
    st(
      'iter2',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '0', { c: true }),
      ],
      [fnObj(0, 'block1')],
    ),
  ),
  step(
    '증가식 i++',
    '증가식 i++는 지금의 LexicalEnvironment인 2번째 반복 레코드의 i를 1로 바꿉니다. 1번째 반복 레코드의 i는 그대로 0입니다.',
    at(2),
    st(
      'iter2',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { ch: true }),
      ],
      [fnObj(0, 'block1')],
      look('context', ['iter2'], 'iter2', '1'),
    ),
  ),
  step(
    '조건 i < 3 · 본문 실행',
    '조건식은 2번째 반복 레코드의 i가 1이므로 참이고, 본문 실행으로 2번째 블록 레코드가 생겨 fns[1]의 [[Environment]]가 됩니다. 바깥은 2번째 반복 레코드입니다.',
    span(2, 3),
    st(
      'block2',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1'),
        blockRec(2, 'iter2', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2')],
      look('context', ['block2', 'iter2'], 'iter2', '1'),
    ),
  ),
  step(
    '새 반복 레코드',
    '증가식 전에 3번째 반복 레코드가 생겨 i 바인딩이 직전 반복 레코드의 값 1로 초기화됩니다. 2번째 반복 레코드와 2번째 블록 레코드는 fns[1]이 가리켜 남습니다.',
    at(2),
    st(
      'iter3',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '1', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2')],
    ),
  ),
  step(
    '증가식 i++',
    '증가식 i++가 3번째 반복 레코드의 i를 2로 바꿉니다.',
    at(2),
    st(
      'iter3',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '2', { ch: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2')],
      look('context', ['iter3'], 'iter3', '2'),
    ),
  ),
  step(
    '조건 i < 3 · 본문 실행',
    '조건식은 i가 2이므로 참이고, 3번째 블록 레코드가 생겨 fns[2]의 [[Environment]]가 됩니다.',
    span(2, 3),
    st(
      'block3',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '2'),
        blockRec(3, 'iter3', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
      look('context', ['block3', 'iter3'], 'iter3', '2'),
    ),
  ),
  step(
    '새 반복 레코드',
    '증가식 전에 4번째 반복 레코드가 생겨 i 바인딩이 직전 반복 레코드의 값 2로 초기화됩니다.',
    at(2),
    st(
      'iter4',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '2', { r: true }),
        blockRec(3, 'iter3', { r: true }),
        iterRec(4, '2', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
    ),
  ),
  step(
    '증가식 i++',
    '증가식 i++가 4번째 반복 레코드의 i를 3으로 바꿉니다. 앞의 세 반복 레코드의 i는 0, 1, 2 그대로입니다.',
    at(2),
    st(
      'iter4',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '2', { r: true }),
        blockRec(3, 'iter3', { r: true }),
        iterRec(4, '3', { ch: true }),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
      look('context', ['iter4'], 'iter4', '3'),
    ),
  ),
  step(
    '조건 i < 3: 거짓, for 문 끝',
    '조건식은 4번째 반복 레코드의 i가 3이므로 3 < 3이 거짓이어서 for 문이 끝납니다. for 문이 끝나면 LexicalEnvironment가 for 문에 들어오기 전의 환경(전역)으로 돌아가는데, 이는 다음 단계에 반영됩니다.',
    at(2),
    st(
      'iter4',
      [
        lGlobalPlain,
        iterRec(1, '0', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '2', { r: true }),
        blockRec(3, 'iter3', { r: true }),
        iterRec(4, '3'),
      ],
      [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')],
      look('context', ['iter4'], 'iter4', '3'),
    ),
  ),
]

const lAll = [fnObj(0, 'block1'), fnObj(1, 'block2'), fnObj(2, 'block3')]
const lEnvs = [
  lGlobalPlain,
  iterRec(1, '0', { r: true }),
  blockRec(1, 'iter1', { r: true }),
  iterRec(2, '1', { r: true }),
  blockRec(2, 'iter2', { r: true }),
  iterRec(3, '2', { r: true }),
  blockRec(3, 'iter3', { r: true }),
]
letSteps.push(
  step(
    'fns[0]() 호출',
    `for 문이 끝나 LexicalEnvironment가 전역으로 돌아왔습니다. 4번째 반복 레코드는 어디에서도 닿지 않아 그림에서 뺍니다. fns[0]을 호출하면 함수 안의 i를 fns[0]의 [[Environment]]인 1번째 블록 레코드부터 찾고, 바깥인 1번째 반복 레코드에서 i(값 0)를 찾습니다. ${callNote}`,
    at(5),
    st('global', lEnvs, lAll, look('fn0', ['block1', 'iter1'], 'iter1', '0')),
  ),
  step(
    'fns[1]() 호출',
    `fns[1]은 2번째 블록 레코드와 2번째 반복 레코드를 거쳐 그 반복 레코드의 i, 곧 1을 찾습니다. ${consoleNote}`,
    at(5),
    st('global', lEnvs, lAll, look('fn1', ['block2', 'iter2'], 'iter2', '1')),
  ),
  step(
    'fns[2]() 호출',
    `fns[2]는 3번째 반복 레코드의 i, 곧 2를 찾습니다. 함수마다 가리키는 반복 레코드가 달라 console.log가 "0 1 2"를 출력합니다. ${consoleNote}`,
    at(5),
    st('global', lEnvs, lAll, look('fn2', ['block3', 'iter3'], 'iter3', '2')),
    ['0 1 2'],
  ),
)

// --- 시나리오 3: 새 바인딩은 본문 뒤, 증가식 앞 ------------------------------------------------

const timingSteps: S[] = [
  step('실행 전', introText, undefined, before),
  step(
    '전역 코드의 선언 처리',
    '코드를 실행하기 전에 전역 코드의 선언을 처리합니다. const fns가 전역 환경 레코드의 선언적 칸에 만들어지지만 아직 초기화되지 않았습니다.',
    undefined,
    st('global', [globalRec([uninit('fns', true)], undefined, true)]),
  ),
  step(
    'fns 초기화',
    '1번째 줄에서 빈 객체를 만들어 fns를 초기화합니다.',
    at(1),
    st('global', [globalRec([init('fns', '객체', true)])]),
  ),
  step(
    'for 머리: let i = 0',
    '머리 레코드를 만들고 i 바인딩을 만든 뒤 0으로 초기화합니다. 이 레코드가 LexicalEnvironment가 됩니다.',
    at(2),
    st('loop', [lGlobalPlain, loopRec('0', { c: true })]),
  ),
  lHead(
    '첫 반복 레코드',
    '첫 반복 전에 1번째 반복 레코드가 만들어져 i 바인딩이 머리 레코드의 값 0으로 초기화됩니다. 바깥은 머리 레코드의 [[OuterEnv]], 곧 전역이고, 머리 레코드는 그림에서 빠집니다.',
    st('iter1', [lGlobalPlain, iterRec(1, '0', { c: true })]),
  ),
  step(
    '조건 i < 4: 참',
    '1번째 반복 레코드에서 i를 찾아 0 < 4가 참입니다.',
    at(2),
    st('iter1', [lGlobalPlain, iterRec(1, '0')], [], look('context', ['iter1'], 'iter1', '0')),
  ),
  step(
    '본문 실행: fns[0]에 함수',
    '본문 블록 레코드가 생기고(바깥은 1번째 반복 레코드), fns[0]에 이 블록 레코드를 [[Environment]]로 가진 함수가 담깁니다. 키는 지금의 i 값 0입니다.',
    at(3),
    st(
      'block1',
      [lGlobalPlain, iterRec(1, '0'), blockRec(1, 'iter1', { c: true })],
      [fnObj(0, 'block1')],
      look('context', ['block1', 'iter1'], 'iter1', '0'),
    ),
  ),
  step(
    '본문의 i++',
    '본문 안의 i++는 LexicalEnvironment인 블록 레코드에서 i를 찾지 못하고 바깥인 1번째 반복 레코드의 i를 1로 바꿉니다. 새 반복 레코드는 아직 만들어지지 않았고, fns[0]이 가리키는 레코드 사슬에 바로 이 i가 있으므로 fns[0]이 읽는 값도 1이 됩니다.',
    at(4),
    st(
      'block1',
      [lGlobalPlain, iterRec(1, '1', { ch: true }), blockRec(1, 'iter1')],
      [fnObj(0, 'block1')],
      look('context', ['block1', 'iter1'], 'iter1', '1'),
    ),
  ),
  step(
    '새 반복 레코드',
    '본문이 끝난 뒤, 증가식 전에 2번째 반복 레코드가 만들어집니다. 새 레코드에 i 바인딩을 만들고 직전 반복 레코드의 지금 값 1로 초기화합니다. 이후 두 레코드의 i는 서로 따로 바뀝니다.',
    at(2),
    st(
      'iter2',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '1', { c: true }),
      ],
      [fnObj(0, 'block1')],
    ),
  ),
  step(
    '증가식 i++',
    '증가식 i++는 2번째 반복 레코드의 i를 2로 바꿉니다. 1번째 반복 레코드의 i는 1 그대로입니다.',
    at(2),
    st(
      'iter2',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '2', { ch: true }),
      ],
      [fnObj(0, 'block1')],
      look('context', ['iter2'], 'iter2', '2'),
    ),
  ),
  step(
    '조건 i < 4 · 본문 실행',
    '조건식은 i가 2이므로 참입니다. 본문 블록 레코드가 생기고, 지금의 i 값이 2이므로 fns[2]에 함수가 담깁니다(fns[1]은 만들어지지 않습니다).',
    span(2, 3),
    st(
      'block2',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '2'),
        blockRec(2, 'iter2', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(2, 'block2')],
      look('context', ['block2', 'iter2'], 'iter2', '2'),
    ),
  ),
  step(
    '본문의 i++',
    '본문 안의 i++가 2번째 반복 레코드의 i를 3으로 바꿉니다.',
    at(4),
    st(
      'block2',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '3', { ch: true }),
        blockRec(2, 'iter2'),
      ],
      [fnObj(0, 'block1'), fnObj(2, 'block2')],
      look('context', ['block2', 'iter2'], 'iter2', '3'),
    ),
  ),
  step(
    '새 반복 레코드',
    '본문이 끝난 뒤 3번째 반복 레코드가 만들어져 i 바인딩이 직전 반복 레코드의 값 3으로 초기화됩니다.',
    at(2),
    st(
      'iter3',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '3', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '3', { c: true }),
      ],
      [fnObj(0, 'block1'), fnObj(2, 'block2')],
    ),
  ),
  step(
    '증가식 i++',
    '증가식 i++가 3번째 반복 레코드의 i를 4로 바꿉니다.',
    at(2),
    st(
      'iter3',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '3', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '4', { ch: true }),
      ],
      [fnObj(0, 'block1'), fnObj(2, 'block2')],
      look('context', ['iter3'], 'iter3', '4'),
    ),
  ),
  step(
    '조건 i < 4: 거짓, for 문 끝',
    '조건식은 3번째 반복 레코드의 i가 4이므로 4 < 4가 거짓이어서 for 문이 끝납니다. LexicalEnvironment가 전역으로 돌아가는 것은 다음 단계에 반영됩니다.',
    at(2),
    st(
      'iter3',
      [
        lGlobalPlain,
        iterRec(1, '1', { r: true }),
        blockRec(1, 'iter1', { r: true }),
        iterRec(2, '3', { r: true }),
        blockRec(2, 'iter2', { r: true }),
        iterRec(3, '4'),
      ],
      [fnObj(0, 'block1'), fnObj(2, 'block2')],
      look('context', ['iter3'], 'iter3', '4'),
    ),
  ),
]

const tAll = [fnObj(0, 'block1'), fnObj(2, 'block2')]
const tEnvs = [
  lGlobalPlain,
  iterRec(1, '1', { r: true }),
  blockRec(1, 'iter1', { r: true }),
  iterRec(2, '3', { r: true }),
  blockRec(2, 'iter2', { r: true }),
]
timingSteps.push(
  step(
    'fns[0]() 호출',
    `LexicalEnvironment가 전역으로 돌아왔고 3번째 반복 레코드는 어디에서도 닿지 않아 그림에서 뺍니다. fns[0]을 호출하면 1번째 블록 레코드에서 시작해 1번째 반복 레코드의 i를 찾습니다. 그 i는 본문의 i++로 이미 1로 바뀌어 있어서 1입니다. ${callNote}`,
    at(6),
    st('global', tEnvs, tAll, look('fn0', ['block1', 'iter1'], 'iter1', '1')),
  ),
  step(
    'fns[2]() 호출',
    `fns[2]는 2번째 블록 레코드에서 시작해 2번째 반복 레코드의 i를 찾고, 본문의 i++로 바뀐 3입니다. console.log가 "1 3"을 출력합니다. ${consoleNote}`,
    at(6),
    st('global', tEnvs, tAll, look('fn2', ['block2', 'iter2'], 'iter2', '3')),
    ['1 3'],
  ),
)

export const scenarios: Scenario<ForLetState>[] = [
  {
    id: 'var',
    label: 'var: 함수들이 같은 i를 가리킴',
    exampleId: 'var-loop',
    code: varLoopCode,
    steps: varSteps,
  },
  {
    id: 'let',
    label: 'let: 반복마다 새 레코드',
    exampleId: 'let-loop',
    code: letLoopCode,
    steps: letSteps,
  },
  {
    id: 'timing',
    label: '새 바인딩은 본문 뒤, 증가식 앞',
    exampleId: 'copy-timing',
    code: copyTimingCode,
    steps: timingSteps,
  },
]
