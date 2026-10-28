import type { LineRange, Scenario, Step } from '~/simulator/types'
import blockVarLetCode from './examples/block-var-let.js?raw'
import functionBlockCode from './examples/function-block.js?raw'
import implicitGlobalCode from './examples/implicit-global.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// scopes는 지금 화면에 있는 스코프(전역 + 실행 중인 함수·블록의 스코프)를 생긴 순서대로 담고,
// 스코프마다 바깥 스코프(outerId)가 담겨 있다. 함수는 정의한 곳, 블록은 블록에 들어가기 직전의 스코프다.
// currentId는 지금 코드가 실행되는 스코프, lookup은 그 단계에서 이름을 찾는 경로다.
// `changed`는 "그 단계에서" 새로 생기거나 초기화되거나 값이 바뀐 이름에만 붙이고, 다음 단계에서는 해제한다.

export type Val =
  | { type: 'string' | 'number' | 'undefined'; display: string } // 문자열은 작은따옴표 포함: "'사과'"
  | { type: 'function'; display: string } // 예: 'function pick() { … }'
  | { type: 'uninitialized'; display: '초기화 전' }
export type Binding = {
  name: string
  declaredBy: 'var' | 'let' | 'const' | 'function' | 'implicit'
  value: Val
  onGlobalObject?: true // 전역의 var·함수 선언·암묵적 전역: 전역 객체의 프로퍼티가 된다
  changed?: 'created' | 'initialized' | 'updated'
}
export type Scope = {
  id: string
  label: string
  kind: 'global' | 'function' | 'block'
  outerId: string | null
  bindings: Binding[]
}
export type Lookup = {
  name: string
  purpose: 'read' | 'assign'
  path: { scopeId: string; found: boolean }[] // 지금 스코프부터 바깥으로, 처음 찾은 곳(또는 전역)에서 끝남
}
export type BlockState = { scopes: Scope[]; currentId: string | null; lookup: Lookup | null }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string): Val => ({ type: 'string', display: `'${s}'` })
const num = (n: number): Val => ({ type: 'number', display: String(n) })
const undef: Val = { type: 'undefined', display: 'undefined' }
const uninit: Val = { type: 'uninitialized', display: '초기화 전' }
const fn = (name: string): Val => ({ type: 'function', display: `function ${name}() { … }` })

type Changed = Binding['changed']

// 전역의 var·함수 선언·암묵적 전역은 전역 객체의 프로퍼티다.
const gb = (
  name: string,
  declaredBy: 'var' | 'function' | 'implicit',
  value: Val,
  changed?: Changed,
): Binding => ({ name, declaredBy, value, onGlobalObject: true, ...(changed && { changed }) })
const vb = (name: string, value: Val, changed?: Changed): Binding => ({
  name,
  declaredBy: 'var',
  value,
  ...(changed && { changed }),
})
const lb = (name: string, value: Val, changed?: Changed): Binding => ({
  name,
  declaredBy: 'let',
  value,
  ...(changed && { changed }),
})

const globalScope = (...bindings: Binding[]): Scope => ({
  id: 'global',
  label: '전역 스코프',
  kind: 'global',
  outerId: null,
  bindings,
})
const fnScope = (id: string, outerId: string, ...bindings: Binding[]): Scope => ({
  id,
  label: `${id} 함수 스코프`,
  kind: 'function',
  outerId,
  bindings,
})
const blockScope = (outerId: string, ...bindings: Binding[]): Scope => ({
  id: 'if-block',
  label: 'if 블록 스코프',
  kind: 'block',
  outerId,
  bindings,
})

const st = (currentId: string, lookup: Lookup | null, ...scopes: Scope[]): BlockState => ({
  scopes,
  currentId,
  lookup,
})

const look = (
  name: string,
  purpose: Lookup['purpose'],
  ...path: [scopeId: string, found: boolean][]
): Lookup => ({ name, purpose, path: path.map(([scopeId, found]) => ({ scopeId, found })) })

const at = (n: number): LineRange => ({ from: n, to: n })
const lines = (from: number, to: number): LineRange => ({ from, to })

type BlockStep = Step<BlockState>

const before: BlockState = { scopes: [], currentId: null, lookup: null }

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 스코프(이름을 찾을 수 있는 범위)와 그 안의 이름, 그리고 이름을 만났을 때 찾는 순서를 보여 줍니다.'
const globalDeclare = (names: string) =>
  `스크립트를 실행하기 전에 전역 코드의 선언을 처리해 전역 스코프에 ${names} 이름을 만듭니다. 선언 처리의 세부 규칙은 호이스팅 개념에서 다뤘으므로 여기서는 결과만 보여 줍니다.`

// --- 시나리오 1: 블록 안의 var와 let ---------------------------------------------------------------

const fruitUndef = gb('fruit', 'var', undef)
const fruitDone = gb('fruit', 'var', str('사과'))

const blockVarLetSteps: BlockStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation: globalDeclare('if 블록 안에 쓴 var fruit의'),
    state: st('global', null, globalScope(gb('fruit', 'var', undef, 'created'))),
    output: [],
  },
  {
    title: '블록 진입',
    explanation:
      'if 조건이 true라서 블록에 들어갑니다. 블록 스코프가 만들어지고, 블록 안의 let 이름 drink가 이때 함께 만들어지지만 선언문을 실행하기 전까지는 초기화 전 상태입니다. var로 선언한 fruit은 블록 스코프가 아니라 전역 스코프에 있습니다.',
    line: lines(1, 5),
    state: st(
      'if-block',
      null,
      globalScope(fruitUndef),
      blockScope('global', lb('drink', uninit, 'created')),
    ),
    output: [],
  },
  {
    title: "fruit에 '사과' 대입",
    explanation:
      "2번 줄은 fruit에 '사과'를 대입합니다. 지금 스코프인 if 블록 스코프에는 fruit이 없어서 바깥 전역 스코프에서 찾습니다. var fruit은 블록이 아니라 전역 스코프에 속한 이름이라 값이 '사과'로 바뀝니다.",
    line: at(2),
    state: st(
      'if-block',
      look('fruit', 'assign', ['if-block', false], ['global', true]),
      globalScope(gb('fruit', 'var', str('사과'), 'updated')),
      blockScope('global', lb('drink', uninit)),
    ),
    output: [],
  },
  {
    title: "drink에 '물'이 들어감",
    explanation:
      "3번 줄의 let 선언문을 실행합니다. 지금 스코프인 if 블록 스코프에서 drink를 찾고, 선언문을 실행하는 이 시점에 값이 '물'로 들어갑니다.",
    line: at(3),
    state: st(
      'if-block',
      look('drink', 'assign', ['if-block', true]),
      globalScope(fruitDone),
      blockScope('global', lb('drink', str('물'), 'initialized')),
    ),
    output: [],
  },
  {
    title: 'fruit 이름 찾기',
    explanation:
      "4번 줄에서 fruit의 값을 읽습니다. if 블록 스코프에는 없어서 바깥 전역 스코프로 올라가 찾고, 값은 '사과'입니다.",
    line: at(4),
    state: st(
      'if-block',
      look('fruit', 'read', ['if-block', false], ['global', true]),
      globalScope(fruitDone),
      blockScope('global', lb('drink', str('물'))),
    ),
    output: [],
  },
  {
    title: 'drink 이름 찾기',
    explanation:
      "4번 줄에서 drink의 값을 읽습니다. 지금 스코프인 if 블록 스코프에 있고 값은 '물'이라, console.log가 '사과 물'을 출력합니다.",
    line: at(4),
    state: st(
      'if-block',
      look('drink', 'read', ['if-block', true]),
      globalScope(fruitDone),
      blockScope('global', lb('drink', str('물'))),
    ),
    output: ['사과 물'],
  },
  {
    title: '블록 끝',
    explanation:
      '5번 줄에서 블록 실행이 끝났습니다. 이 시각화는 끝난 블록의 스코프를 표시에서 뺍니다. 지금 스코프는 바깥의 전역 스코프입니다.',
    line: at(5),
    state: st('global', null, globalScope(fruitDone)),
    output: ['사과 물'],
  },
  {
    title: 'fruit 이름 찾기',
    explanation:
      "6번 줄에서 fruit의 값을 읽습니다. 지금 스코프인 전역 스코프에 있고, 값은 '사과'라서 출력합니다.",
    line: at(6),
    state: st('global', look('fruit', 'read', ['global', true]), globalScope(fruitDone)),
    output: ['사과 물', '사과'],
  },
  {
    title: 'typeof drink: 찾지 못함',
    explanation:
      "7번 줄은 typeof drink를 계산합니다. 지금 스코프인 전역 스코프에서 drink를 찾지 못하는데, typeof는 찾지 못한 이름에도 오류 없이 'undefined'를 돌려줍니다. drink는 블록 스코프에 있던 이름이라 블록 밖에서는 찾을 수 없습니다.",
    line: at(7),
    state: st('global', look('drink', 'read', ['global', false]), globalScope(fruitDone)),
    output: ['사과 물', '사과', 'undefined'],
  },
]

// --- 시나리오 2: 함수 안의 블록 ------------------------------------------------------------------

const pickFn = gb('pick', 'function', fn('pick'))

const functionBlockSteps: BlockStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation: globalDeclare('함수 선언 pick'),
    state: st('global', null, globalScope(gb('pick', 'function', fn('pick'), 'created'))),
    output: [],
  },
  {
    title: 'pick 이름 찾기',
    explanation:
      '8번 줄에서 pick을 호출하려면 먼저 pick이라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(8),
    state: st('global', look('pick', 'read', ['global', true]), globalScope(pickFn)),
    output: [],
  },
  {
    title: '호출 시작: pick',
    explanation:
      'pick 호출 시작입니다. pick 함수 스코프가 만들어지고, 바깥 스코프는 pick을 정의한 전역 스코프입니다. 본문을 실행하기 전에 함수 안의 var 선언을 처리해 item을 undefined로 만드는데, if 블록 안에 쓴 var item도 블록이 아니라 pick 함수 스코프에 속합니다.',
    line: lines(1, 6),
    state: st(
      'pick',
      null,
      globalScope(pickFn),
      fnScope('pick', 'global', vb('item', undef, 'created')),
    ),
    output: [],
  },
  {
    title: '블록 진입',
    explanation:
      'if 조건이 true라서 블록에 들어갑니다. 문장이 들어 있는 블록은 let·const가 없어도 블록 스코프가 만들어집니다. 이 블록에는 let·const가 없어서 블록 스코프는 비어 있고, var item은 바깥 pick 함수 스코프에 있습니다.',
    line: lines(2, 4),
    state: st(
      'if-block',
      null,
      globalScope(pickFn),
      fnScope('pick', 'global', vb('item', undef)),
      blockScope('pick'),
    ),
    output: [],
  },
  {
    title: "item에 '연필' 대입",
    explanation:
      "3번 줄은 item에 '연필'을 대입합니다. 지금 스코프인 if 블록 스코프에는 item이 없어서 바깥 pick 함수 스코프에서 찾고, 거기 있는 item의 값이 '연필'로 바뀝니다.",
    line: at(3),
    state: st(
      'if-block',
      look('item', 'assign', ['if-block', false], ['pick', true]),
      globalScope(pickFn),
      fnScope('pick', 'global', vb('item', str('연필'), 'updated')),
      blockScope('pick'),
    ),
    output: [],
  },
  {
    title: '블록 끝',
    explanation:
      '4번 줄에서 블록 실행이 끝났습니다. 이 시각화는 끝난 블록의 스코프를 표시에서 뺍니다. 지금 스코프는 바깥의 pick 함수 스코프입니다.',
    line: at(4),
    state: st(
      'pick',
      null,
      globalScope(pickFn),
      fnScope('pick', 'global', vb('item', str('연필'))),
    ),
    output: [],
  },
  {
    title: 'item 이름 찾기',
    explanation:
      "5번 줄에서 item의 값을 읽습니다. 지금 스코프인 pick 함수 스코프에 있고 값은 '연필'입니다. 블록이 끝났어도 var item은 함수 스코프에 속해 있어서 찾을 수 있습니다.",
    line: at(5),
    state: st(
      'pick',
      look('item', 'read', ['pick', true]),
      globalScope(pickFn),
      fnScope('pick', 'global', vb('item', str('연필'))),
    ),
    output: [],
  },
  {
    title: 'pick 함수 끝',
    explanation:
      "pick 함수 실행이 끝났습니다. 이 시각화는 끝난 함수의 스코프를 표시에서 뺍니다. pick은 '연필'을 돌려주고, 8번 줄의 console.log가 그 값을 출력합니다.",
    line: at(6),
    state: st('global', null, globalScope(pickFn)),
    output: ['연필'],
  },
  {
    title: 'typeof item: 찾지 못함',
    explanation:
      "9번 줄은 typeof item을 계산합니다. 지금 스코프인 전역 스코프에서 item을 찾지 못하는데, typeof는 찾지 못한 이름에도 오류 없이 'undefined'를 돌려줍니다. item은 pick 함수 스코프의 이름이라 함수 밖에서는 찾을 수 없습니다.",
    line: at(9),
    state: st('global', look('item', 'read', ['global', false]), globalScope(pickFn)),
    output: ['연필', 'undefined'],
  },
]

// --- 시나리오 3: 암묵적 전역 ---------------------------------------------------------------------

const setScoreFn = gb('setScore', 'function', fn('setScore'))
const scoreImplicit = (changed?: Changed) => gb('score', 'implicit', num(100), changed)

const implicitGlobalSteps: BlockStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation: globalDeclare('함수 선언 setScore'),
    state: st('global', null, globalScope(gb('setScore', 'function', fn('setScore'), 'created'))),
    output: [],
  },
  {
    title: 'setScore 이름 찾기',
    explanation:
      '5번 줄에서 setScore를 호출하려면 먼저 setScore라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(5),
    state: st('global', look('setScore', 'read', ['global', true]), globalScope(setScoreFn)),
    output: [],
  },
  {
    title: '호출 시작: setScore',
    explanation:
      'setScore 호출 시작입니다. setScore 함수 스코프가 만들어지고, 바깥 스코프는 setScore를 정의한 전역 스코프입니다. 이 함수 안에는 선언한 이름이 없어서 함수 스코프는 비어 있습니다.',
    line: lines(1, 3),
    state: st('setScore', null, globalScope(setScoreFn), fnScope('setScore', 'global')),
    output: [],
  },
  {
    title: '암묵적 전역: score에 100 대입',
    explanation:
      '2번 줄은 score에 100을 대입합니다. setScore 함수 스코프에서도 전역 스코프에서도 score를 찾지 못합니다. strict mode가 아니라서 오류 대신 전역 객체에 score라는 프로퍼티가 만들어지고 값은 100입니다. 이것은 선언이 아니라 대입이 만든 프로퍼티입니다.',
    line: at(2),
    state: st(
      'setScore',
      look('score', 'assign', ['setScore', false], ['global', false]),
      globalScope(setScoreFn, scoreImplicit('created')),
      fnScope('setScore', 'global'),
    ),
    output: [],
  },
  {
    title: 'setScore 함수 끝',
    explanation:
      'setScore 함수 실행이 끝났습니다. 이 시각화는 끝난 함수의 스코프를 표시에서 뺍니다. 전역 객체에 만들어진 score는 그대로 남아 있습니다.',
    line: at(3),
    state: st('global', null, globalScope(setScoreFn, scoreImplicit())),
    output: [],
  },
  {
    title: 'score 이름 찾기',
    explanation:
      '6번 줄에서 score의 값을 읽습니다. 지금 스코프인 전역 스코프에서 score를 찾고, 값은 100이라 출력합니다.',
    line: at(6),
    state: st(
      'global',
      look('score', 'read', ['global', true]),
      globalScope(setScoreFn, scoreImplicit()),
    ),
    output: ['100'],
  },
  {
    title: 'globalThis.score 읽기',
    explanation:
      'globalThis는 전역 객체의 프로퍼티를 읽고 쓸 때 쓸 수 있는 이름입니다. 7번 줄은 globalThis로 전역 객체의 score 프로퍼티를 읽고, 2번 줄의 대입이 만든 값 100을 출력합니다. 이 단계에서는 globalThis라는 이름 자체를 찾는 과정은 보여 주지 않습니다.',
    line: at(7),
    state: st('global', null, globalScope(setScoreFn, scoreImplicit())),
    output: ['100', '100'],
  },
]

// --- 시나리오 목록 -------------------------------------------------------------------------------

export const scenarios: Scenario<BlockState>[] = [
  {
    id: 'block-var-let',
    label: '블록 안의 var와 let',
    exampleId: 'block-var-let',
    code: blockVarLetCode,
    steps: blockVarLetSteps,
  },
  {
    id: 'function-block',
    label: '함수 안의 블록',
    exampleId: 'function-block',
    code: functionBlockCode,
    steps: functionBlockSteps,
  },
  {
    id: 'implicit-global',
    label: '암묵적 전역',
    exampleId: 'implicit-global',
    code: implicitGlobalCode,
    steps: implicitGlobalSteps,
  },
]
