import type { LineRange, Scenario, Step } from '~/simulator/types'
import letBeforeCode from './examples/let-before.js?raw'
import shadowCode from './examples/shadow.js?raw'
import timeNotPlaceCode from './examples/time-not-place.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// scopes는 지금 화면에 있는 스코프(전역 + 실행 중인 함수·블록의 스코프)를 생긴 순서대로 담고,
// 스코프마다 바깥 스코프(outerId)가 담겨 있다. 함수는 정의한 곳, 블록은 블록에 들어가기 직전의 스코프다.
// currentId는 지금 코드가 실행되는 스코프, lookup은 그 단계에서 이름을 찾는 경로다.
// lookup.error는 처음 찾은 이름이 그 단계에서 초기화 전일 때만 붙는다(읽기 단계).
// `changed`는 "그 단계에서" 새로 생기거나 초기화된 이름에만 붙이고, 다음 단계에서는 해제한다.

export type Val =
  | { type: 'string' | 'number'; display: string } // 문자열은 작은따옴표 포함: "'빨강'"
  | { type: 'function'; display: string } // 예: 'function show() { … }'
  | { type: 'uninitialized'; display: '초기화 전' }
export type Binding = {
  name: string
  declaredBy: 'let' | 'const' | 'function'
  value: Val
  changed?: 'created' | 'initialized'
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
  path: { scopeId: string; found: boolean }[] // 지금 스코프부터 바깥으로, 처음 찾은 곳에서 끝남
  error?: 'ReferenceError' // 처음 찾은 이름이 초기화 전이라 오류가 나는 단계
}
export type TdzState = { scopes: Scope[]; currentId: string | null; lookup: Lookup | null }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string): Val => ({ type: 'string', display: `'${s}'` })
const num = (n: number): Val => ({ type: 'number', display: String(n) })
const uninit: Val = { type: 'uninitialized', display: '초기화 전' }
const fn = (name: string): Val => ({ type: 'function', display: `function ${name}() { … }` })

type Changed = Binding['changed']

const lb = (name: string, value: Val, changed?: Changed): Binding => ({
  name,
  declaredBy: 'let',
  value,
  ...(changed && { changed }),
})
const fb = (name: string, changed?: Changed): Binding => ({
  name,
  declaredBy: 'function',
  value: fn(name),
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

const st = (currentId: string, lookup: Lookup | null, ...scopes: Scope[]): TdzState => ({
  scopes,
  currentId,
  lookup,
})

const look = (
  name: string,
  purpose: Lookup['purpose'],
  path: [scopeId: string, found: boolean][],
  error?: 'ReferenceError',
): Lookup => ({
  name,
  purpose,
  path: path.map(([scopeId, found]) => ({ scopeId, found })),
  ...(error && { error }),
})

const at = (n: number): LineRange => ({ from: n, to: n })
const lines = (from: number, to: number): LineRange => ({ from, to })

type TdzStep = Step<TdzState>

const before: TdzState = { scopes: [], currentId: null, lookup: null }

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 스코프(이름을 찾을 수 있는 범위)와 그 안의 이름, 그리고 이름을 만났을 때 찾는 순서를 보여 줍니다. 이름이 아직 값을 갖기 전이면 "초기화 전"이라고 표시합니다.'
const catchExplain =
  '오류를 받은 catch 블록이 실행됩니다. e.name은 오류의 종류를 나타내는 문자열이라 ReferenceError를 출력합니다. try·catch 블록의 스코프는 이 시각화에 그리지 않습니다.'

// --- 시나리오 1: 선언 전에 읽기 ------------------------------------------------------------------

const scoreUninit = lb('score', uninit)
const scoreTen = lb('score', num(10))

const letBeforeSteps: TdzStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation:
      '스크립트를 실행하기 전에 전역 코드의 선언을 처리해 전역 스코프에 let score의 이름을 만듭니다. var와 달리 undefined로 초기화하지 않아서, 6번 줄의 선언문을 실행하기 전까지 score는 초기화 전 상태입니다.',
    state: st('global', null, globalScope(lb('score', uninit, 'created'))),
    output: [],
  },
  {
    title: '2번 줄: score 읽기',
    explanation:
      '2번 줄에서 score의 값을 읽습니다. 처음 찾은 곳인 전역 스코프의 score가 아직 초기화 전이라 값을 읽을 수 없고, ReferenceError가 발생합니다. 오류가 나면 try 블록의 나머지는 건너뛰고 catch 블록으로 갑니다.',
    line: at(2),
    state: st(
      'global',
      look('score', 'read', [['global', true]], 'ReferenceError'),
      globalScope(scoreUninit),
    ),
    output: [],
  },
  {
    title: 'catch 블록: e.name 출력',
    explanation: `4번 줄입니다. ${catchExplain}`,
    line: at(4),
    state: st('global', null, globalScope(scoreUninit)),
    output: ['ReferenceError'],
  },
  {
    title: '6번 줄: score에 10',
    explanation:
      '6번 줄의 let 선언문을 실행합니다. 이름 score를 찾아 10으로 초기화합니다. 이 시점부터 score를 읽을 수 있습니다.',
    line: at(6),
    state: st(
      'global',
      look('score', 'assign', [['global', true]]),
      globalScope(lb('score', num(10), 'initialized')),
    ),
    output: ['ReferenceError'],
  },
  {
    title: '7번 줄: score 읽기',
    explanation:
      '7번 줄에서 score의 값을 읽습니다. 전역 스코프의 score는 이제 10이라 오류 없이 10을 출력합니다.',
    line: at(7),
    state: st('global', look('score', 'read', [['global', true]]), globalScope(scoreTen)),
    output: ['ReferenceError', '10'],
  },
]

// --- 시나리오 2: 안쪽 블록의 가림 ----------------------------------------------------------------

const colorRed = lb('color', str('빨강'))
const blockColorUninit = lb('color', uninit)
const blockColorBlue = lb('color', str('파랑'))

const shadowSteps: TdzStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation:
      '스크립트를 실행하기 전에 전역 코드의 선언을 처리해 전역 스코프에 let color의 이름을 만듭니다. 1번 줄의 선언문을 실행하기 전까지는 초기화 전 상태입니다.',
    state: st('global', null, globalScope(lb('color', uninit, 'created'))),
    output: [],
  },
  {
    title: "1번 줄: color에 '빨강'",
    explanation: "1번 줄의 let 선언문을 실행합니다. 전역 스코프의 color가 '빨강'으로 초기화됩니다.",
    line: at(1),
    state: st(
      'global',
      look('color', 'assign', [['global', true]]),
      globalScope(lb('color', str('빨강'), 'initialized')),
    ),
    output: [],
  },
  {
    title: '블록 진입',
    explanation:
      'if 조건이 true라서 블록에 들어갑니다. 블록 스코프가 만들어지고, 8번 줄의 let color 이름이 이때 함께 만들어지지만 선언문을 실행하기 전까지는 초기화 전 상태입니다. 바깥 전역 스코프에는 이미 color가 있지만, 블록 안에서는 블록의 color가 먼저 찾아집니다.',
    line: lines(2, 10),
    state: st(
      'if-block',
      null,
      globalScope(colorRed),
      blockScope('global', lb('color', uninit, 'created')),
    ),
    output: [],
  },
  {
    title: '4번 줄: color 읽기',
    explanation:
      "4번 줄에서 color의 값을 읽습니다. 지금 스코프인 if 블록 스코프에 color가 이미 있어서 이름 찾기는 거기서 멈춥니다. 그 color가 아직 초기화 전이라 바깥 전역 스코프의 '빨강'을 읽지 않고 ReferenceError가 발생합니다. 8번 줄의 선언문을 아직 실행하지 않았는데도 블록의 color가 바깥 color를 가리고 있다는 증거입니다.",
    line: at(4),
    state: st(
      'if-block',
      look('color', 'read', [['if-block', true]], 'ReferenceError'),
      globalScope(colorRed),
      blockScope('global', blockColorUninit),
    ),
    output: [],
  },
  {
    title: 'catch 블록: e.name 출력',
    explanation: `6번 줄입니다. ${catchExplain}`,
    line: at(6),
    state: st('if-block', null, globalScope(colorRed), blockScope('global', blockColorUninit)),
    output: ['ReferenceError'],
  },
  {
    title: "8번 줄: 블록의 color에 '파랑'",
    explanation:
      "8번 줄의 let 선언문을 실행합니다. 지금 스코프인 if 블록 스코프에서 color를 찾아 '파랑'으로 초기화합니다. 전역 스코프의 color는 그대로 '빨강'입니다.",
    line: at(8),
    state: st(
      'if-block',
      look('color', 'assign', [['if-block', true]]),
      globalScope(colorRed),
      blockScope('global', lb('color', str('파랑'), 'initialized')),
    ),
    output: ['ReferenceError'],
  },
  {
    title: '9번 줄: color 읽기',
    explanation:
      "9번 줄에서 color의 값을 읽습니다. if 블록 스코프의 color가 이제 '파랑'으로 초기화되어 있어서 '파랑'을 출력합니다.",
    line: at(9),
    state: st(
      'if-block',
      look('color', 'read', [['if-block', true]]),
      globalScope(colorRed),
      blockScope('global', blockColorBlue),
    ),
    output: ['ReferenceError', '파랑'],
  },
  {
    title: '블록 끝',
    explanation:
      '10번 줄에서 블록 실행이 끝났습니다. 이 시각화는 끝난 블록의 스코프를 표시에서 뺍니다. 지금 스코프는 바깥의 전역 스코프입니다.',
    line: at(10),
    state: st('global', null, globalScope(colorRed)),
    output: ['ReferenceError', '파랑'],
  },
  {
    title: '11번 줄: color 읽기',
    explanation:
      "11번 줄에서 color의 값을 읽습니다. 지금 스코프인 전역 스코프의 color는 '빨강'이라 그대로 출력합니다. 블록 안의 color는 전역 color를 바꾸지 않았습니다.",
    line: at(11),
    state: st('global', look('color', 'read', [['global', true]]), globalScope(colorRed)),
    output: ['ReferenceError', '파랑', '빨강'],
  },
]

// --- 시나리오 3: 시점이 정한다 -------------------------------------------------------------------

const showFn = fb('show')
const countUninit = lb('count', uninit)
const countThree = lb('count', num(3))

const timeNotPlaceSteps: TdzStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation:
      '스크립트를 실행하기 전에 전역 코드의 선언을 처리해 전역 스코프에 함수 선언 show와 let count의 이름을 만듭니다. show는 함수로 초기화되지만, count는 9번 줄의 선언문을 실행하기 전까지 초기화 전 상태입니다.',
    state: st('global', null, globalScope(fb('show', 'created'), lb('count', uninit, 'created'))),
    output: [],
  },
  {
    title: '5번 줄: show 찾기',
    explanation:
      '5번 줄에서 show()를 호출하려면 먼저 show라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(5),
    state: st('global', look('show', 'read', [['global', true]]), globalScope(showFn, countUninit)),
    output: [],
  },
  {
    title: 'show 호출 시작',
    explanation:
      'show 호출 시작입니다. show 함수 스코프가 만들어지고, 바깥 스코프는 show를 정의한 전역 스코프입니다. 이 함수 안에는 선언한 이름이 없어서 함수 스코프는 비어 있습니다.',
    line: lines(1, 3),
    state: st('show', null, globalScope(showFn, countUninit), fnScope('show', 'global')),
    output: [],
  },
  {
    title: '2번 줄: count 읽기',
    explanation:
      '2번 줄에서 count의 값을 읽습니다. 지금 스코프인 show 함수 스코프에는 없어서 바깥 전역 스코프로 올라가 찾습니다. 그런데 이 시점에는 9번 줄의 선언문을 아직 실행하지 않아 count가 초기화 전이라 ReferenceError가 발생합니다.',
    line: at(2),
    state: st(
      'show',
      look(
        'count',
        'read',
        [
          ['show', false],
          ['global', true],
        ],
        'ReferenceError',
      ),
      globalScope(showFn, countUninit),
      fnScope('show', 'global'),
    ),
    output: [],
  },
  {
    title: 'catch 블록: e.name 출력',
    explanation: `7번 줄입니다. 오류가 나서 show 호출은 값을 돌려주지 못하고 끝났고, 이 시각화는 끝난 함수의 스코프를 표시에서 뺍니다. ${catchExplain}`,
    line: at(7),
    state: st('global', null, globalScope(showFn, countUninit)),
    output: ['ReferenceError'],
  },
  {
    title: '9번 줄: count에 3',
    explanation: '9번 줄의 let 선언문을 실행합니다. 전역 스코프의 count를 찾아 3으로 초기화합니다.',
    line: at(9),
    state: st(
      'global',
      look('count', 'assign', [['global', true]]),
      globalScope(showFn, lb('count', num(3), 'initialized')),
    ),
    output: ['ReferenceError'],
  },
  {
    title: '10번 줄: show 찾기',
    explanation:
      '10번 줄에서 show()를 호출하려면 먼저 show라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(10),
    state: st('global', look('show', 'read', [['global', true]]), globalScope(showFn, countThree)),
    output: ['ReferenceError'],
  },
  {
    title: 'show 호출 시작',
    explanation:
      'show를 다시 호출합니다. show 함수 스코프가 새로 만들어지고, 바깥 스코프는 이번에도 show를 정의한 전역 스코프입니다.',
    line: lines(1, 3),
    state: st('show', null, globalScope(showFn, countThree), fnScope('show', 'global')),
    output: ['ReferenceError'],
  },
  {
    title: '2번 줄: count 읽기',
    explanation:
      '2번 줄에서 count의 값을 읽습니다. show 함수 스코프에는 없어서 전역 스코프에서 찾고, 이번에는 9번 줄이 이미 실행되어 count가 3입니다. show는 count 선언문보다 위에 정의되어 있지만, 오류를 정하는 것은 코드의 위치가 아니라 호출해서 읽는 시점입니다.',
    line: at(2),
    state: st(
      'show',
      look('count', 'read', [
        ['show', false],
        ['global', true],
      ]),
      globalScope(showFn, countThree),
      fnScope('show', 'global'),
    ),
    output: ['ReferenceError'],
  },
  {
    title: '10번 줄: 3 출력',
    explanation:
      'show 함수 실행이 끝났습니다. 이 시각화는 끝난 함수의 스코프를 표시에서 뺍니다. show가 돌려준 3을 10번 줄의 console.log가 출력합니다.',
    line: at(10),
    state: st('global', null, globalScope(showFn, countThree)),
    output: ['ReferenceError', '3'],
  },
]

// --- 시나리오 목록 -------------------------------------------------------------------------------

export const scenarios: Scenario<TdzState>[] = [
  {
    id: 'let-before',
    label: '선언 전에 읽기',
    exampleId: 'let-before',
    code: letBeforeCode,
    steps: letBeforeSteps,
  },
  {
    id: 'shadow',
    label: '안쪽 블록의 가림',
    exampleId: 'shadow',
    code: shadowCode,
    steps: shadowSteps,
  },
  {
    id: 'time-not-place',
    label: '시점이 정한다',
    exampleId: 'time-not-place',
    code: timeNotPlaceCode,
    steps: timeNotPlaceSteps,
  },
]
