import type { Scenario, Step } from '~/simulator/types'
import chainCode from './examples/chain.js?raw'
import returnPromiseCode from './examples/return-promise.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - running: 지금 실행 중인 것. '동기 코드' / 실행 중인 Job 이름 / '없음'(실행 중인 코드가 없을 때)
// - promises: 예제의 전역 변수에 담긴 프로미스. 그 변수가 선언된 단계부터 나타난다(이름 = 변수 이름).
//   state: pending | fulfilled | rejected
//   result: 정해진 값의 표시용 문자열(문자열은 작은따옴표, 에러는 'Error: 메시지'). pending이면 null
//   lockedTo: resolve는 불렸지만 다른 프로미스의 결과를 따라가느라 아직 pending인 프로미스가 따라가는 대상
//   reactions: pending 프로미스에 등록된 PromiseReaction의 요약. 정해지면 Job으로 옮겨져 빈 배열이 된다
// - jobs: HostEnqueuePromiseJob으로 넣었고 아직 시작하지 않은 Job. 넣은 순서대로, 앞이 먼저 실행된다
//   실행 중인 Job은 running에 있고 jobs에는 없다
//   then이 내부적으로 만드는, 변수에 담기지 않은 프로미스는 그리지 않는다

export type PromiseInfo = {
  name: string
  state: 'pending' | 'fulfilled' | 'rejected'
  result: string | null
  lockedTo?: string
  reactions: string[]
}

export type PromiseSimState = {
  running: string
  promises: PromiseInfo[]
  jobs: string[]
}

type PStep = Step<PromiseSimState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const pending = (name: string, reactions: string[] = [], lockedTo?: string): PromiseInfo =>
  lockedTo === undefined
    ? { name, state: 'pending', result: null, reactions }
    : { name, state: 'pending', result: null, lockedTo, reactions }

const fulfilled = (name: string, result: string): PromiseInfo => ({
  name,
  state: 'fulfilled',
  result,
  reactions: [],
})

const rejected = (name: string, result: string): PromiseInfo => ({
  name,
  state: 'rejected',
  result,
  reactions: [],
})

const state = (running: string, promises: PromiseInfo[], jobs: string[]): PromiseSimState => ({
  running,
  promises,
  jobs,
})

const SYNC = '동기 코드'
const NONE = '없음'

const HOST_NOTE = 'Job을 호스트가 언제 처리하는지는 마이크로태스크 큐 개념에서 다룹니다.'

// --- 1. 체인: 이미 이행된 프로미스의 then (chain.js) ----------------------------------------------

const J1 = '반응 Job 1 (p1 → p2)'
const J2 = '반응 Job 2 (p2 → p3)'
const J3 = '반응 Job 3 (p3 → p4)'

const p2Reactions = ['이행되면 콜백 실행 → p3', '거부되면 사유를 그대로 → p3']
const p3Reactions = ['이행되면 값을 그대로 → p4', '거부되면 catch 콜백 실행 → p4']

const E = 'Error: bad 2'

const chainSteps: PStep[] = [
  {
    title: '실행 시작',
    explanation:
      '스크립트가 시작됩니다. 아직 프로미스가 하나도 없고, 실행을 기다리는 Job도 없습니다.',
    state: state(SYNC, [], []),
    output: [],
  },
  {
    title: 'new Promise: executor를 바로 실행하고 resolve(1)',
    explanation:
      'Promise 생성자는 executor를 그 자리에서 바로 부릅니다. 그래서 executor 안의 console.log가 먼저 출력됩니다. resolve(1)이 불리면 1은 객체가 아니므로 p1은 곧바로 1로 이행(fulfilled)됩니다.',
    line: range(1, 4),
    state: state(SYNC, [fulfilled('p1', '1')], []),
    output: ['executor'],
  },
  {
    title: 'p1.then(...): 이미 이행됐으니 Job을 바로 넣는다',
    explanation:
      'then은 PerformPromiseThen을 실행합니다. p1이 이미 이행된 상태이므로 반응을 목록에 쌓는 대신 NewPromiseReactionJob을 HostEnqueuePromiseJob으로 지금 넣습니다. 콜백은 이 호출 안에서 실행되지 않습니다. then은 새 프로미스 p2(pending)를 만들어 돌려줍니다.',
    line: range(5, 8),
    state: state(SYNC, [fulfilled('p1', '1'), pending('p2')], [J1]),
    output: ['executor'],
  },
  {
    title: 'p2.then(...): p2는 pending이라 반응을 등록한다',
    explanation:
      'p2는 아직 정해지지 않았습니다. PerformPromiseThen은 이행 반응과 거부 반응을 p2의 목록에 넣기만 합니다. 콜백이 없는 거부 반응은 핸들러가 empty라서 거부 사유를 그대로 p3에 넘깁니다. then은 새 프로미스 p3를 돌려줍니다.',
    line: range(9, 11),
    state: state(SYNC, [fulfilled('p1', '1'), pending('p2', p2Reactions), pending('p3')], [J1]),
    output: ['executor'],
  },
  {
    title: 'p3.catch(...): then(undefined, 콜백)과 같다',
    explanation:
      'catch(f)는 p3.then(undefined, f)를 부르는 것과 같습니다. p3도 pending이라 반응 두 개를 등록합니다. 이행 반응은 핸들러가 없어서 값을 그대로 p4에 넘기고, 거부 반응은 catch 콜백을 부릅니다.',
    line: range(12, 14),
    state: state(
      SYNC,
      [fulfilled('p1', '1'), pending('p2', p2Reactions), pending('p3', p3Reactions), pending('p4')],
      [J1],
    ),
    output: ['executor'],
  },
  {
    title: "console.log('sync end', p1 === p2)",
    explanation:
      'p1 === p2는 false입니다. then은 항상 새 프로미스를 돌려주기 때문입니다. 콜백 안의 출력 then 1은 아직 나오지 않았습니다. 동기 코드가 끝나지 않았으니 Job이 시작될 수 없습니다.',
    line: at(15),
    state: state(
      SYNC,
      [fulfilled('p1', '1'), pending('p2', p2Reactions), pending('p3', p3Reactions), pending('p4')],
      [J1],
    ),
    output: ['executor', 'sync end false'],
  },
  {
    title: '동기 코드가 끝났다',
    explanation: `실행 중인 ECMAScript 코드가 없어졌으므로 기다리던 Job을 시작할 수 있습니다. 같은 방식으로 넣은 Job은 넣은 순서대로 실행됩니다. ${HOST_NOTE}`,
    line: at(15),
    state: state(
      NONE,
      [fulfilled('p1', '1'), pending('p2', p2Reactions), pending('p3', p3Reactions), pending('p4')],
      [J1],
    ),
    output: ['executor', 'sync end false'],
  },
  {
    title: 'Job 1: 콜백이 2를 반환 → p2 이행',
    explanation:
      'NewPromiseReactionJob이 p1의 이행 값 1로 콜백을 부릅니다. 콜백은 then 1을 출력하고 2를 반환합니다. 정상 반환이므로 p2를 2로 resolve하고, 2는 객체가 아니라서 p2는 이행됩니다. 이행된 p2의 반응 목록을 TriggerPromiseReactions가 처리해 이행 반응을 Job으로 넣고, 쓰지 않는 거부 반응은 버립니다.',
    line: range(6, 7),
    state: state(
      J1,
      [fulfilled('p1', '1'), fulfilled('p2', '2'), pending('p3', p3Reactions), pending('p4')],
      [J2],
    ),
    output: ['executor', 'sync end false', 'then 1'],
  },
  {
    title: 'Job 2: 콜백이 throw → p3 거부',
    explanation:
      '콜백이 Error를 throw했습니다. NewPromiseReactionJob은 핸들러가 throw로 끝나면(abrupt completion) 미리 만들어 둔 p3를 그 에러로 reject합니다. 거부된 p3의 반응 목록에서 거부 반응이 Job으로 들어가고, 이행 반응은 버려집니다.',
    line: range(9, 11),
    state: state(
      J2,
      [fulfilled('p1', '1'), fulfilled('p2', '2'), rejected('p3', E), pending('p4')],
      [J3],
    ),
    output: ['executor', 'sync end false', 'then 1'],
  },
  {
    title: 'Job 3: catch 콜백이 정상 반환 → p4 이행',
    explanation:
      'catch 콜백이 거부 사유를 받아 catch bad 2를 출력합니다. 콜백은 아무것도 반환하지 않으므로 p4는 undefined로 이행됩니다. 거부를 처리한 콜백이 정상 반환하면 그 뒤 프로미스는 이행됩니다.',
    line: range(12, 14),
    state: state(
      J3,
      [fulfilled('p1', '1'), fulfilled('p2', '2'), rejected('p3', E), fulfilled('p4', 'undefined')],
      [],
    ),
    output: ['executor', 'sync end false', 'then 1', 'catch bad 2'],
  },
  {
    title: '모든 Job이 끝났다',
    explanation:
      '기다리는 Job이 없고 모든 프로미스가 정해졌습니다. 출력 순서 executor, sync end false, then 1, catch bad 2는 코드 순서가 아니라 동기 코드가 끝난 뒤 Job이 하나씩 실행된 결과입니다.',
    line: range(12, 14),
    state: state(
      NONE,
      [fulfilled('p1', '1'), fulfilled('p2', '2'), rejected('p3', E), fulfilled('p4', 'undefined')],
      [],
    ),
    output: ['executor', 'sync end false', 'then 1', 'catch bad 2'],
  },
]

// --- 2. 채택: 콜백이 프로미스를 반환 (return-promise.js) -------------------------------------------

const A1 = '반응 Job 1 (start → outer)'
const A2 = 'thenable Job 2 (outer ← inner)'
const A3 = '반응 Job 3 (inner → outer)'
const A4 = '반응 Job 4 (outer → last)'

const outerReactions = ['이행되면 콜백 실행 → last', '거부되면 사유를 그대로 → last']

const INNER = "'inner value'"

const adoptSteps: PStep[] = [
  {
    title: '실행 시작',
    explanation:
      '스크립트가 시작됩니다. 아직 프로미스가 하나도 없고, 실행을 기다리는 Job도 없습니다.',
    state: state(SYNC, [], []),
    output: [],
  },
  {
    title: 'inner: executor에서 바로 이행',
    explanation:
      'executor는 바로 실행되고, resolve에 문자열을 넘기면 inner는 그 값으로 곧바로 이행됩니다.',
    line: range(1, 3),
    state: state(SYNC, [fulfilled('inner', INNER)], []),
    output: [],
  },
  {
    title: 'start: Promise.resolve로 이미 이행된 프로미스',
    explanation: 'Promise.resolve("start")는 이미 이행된 프로미스를 돌려줍니다.',
    line: at(4),
    state: state(SYNC, [fulfilled('inner', INNER), fulfilled('start', "'start'")], []),
    output: [],
  },
  {
    title: 'start.then(...): 이미 이행됐으니 Job을 바로 넣는다',
    explanation:
      'start는 이미 이행됐으므로 PerformPromiseThen이 NewPromiseReactionJob을 바로 넣습니다. 콜백은 아직 실행되지 않고, then은 새 프로미스 outer(pending)를 돌려줍니다.',
    line: range(5, 7),
    state: state(
      SYNC,
      [fulfilled('inner', INNER), fulfilled('start', "'start'"), pending('outer')],
      [A1],
    ),
    output: [],
  },
  {
    title: 'outer.then(...): outer는 pending이라 반응을 등록한다',
    explanation:
      'outer가 아직 정해지지 않았으므로 반응 두 개를 목록에 넣기만 하고, then은 새 프로미스 last를 돌려줍니다.',
    line: range(8, 10),
    state: state(
      SYNC,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        pending('outer', outerReactions),
        pending('last'),
      ],
      [A1],
    ),
    output: [],
  },
  {
    title: 'console.log(outer === inner, Promise.resolve(inner) === inner)',
    explanation:
      'outer === inner는 false입니다. outer는 then이 새로 만든 프로미스이고 inner와 다른 프로미스입니다. Promise.resolve(inner)는 inner가 같은 생성자의 프로미스라서 새로 감싸지 않고 inner를 그대로 돌려주므로 true입니다.',
    line: at(11),
    state: state(
      SYNC,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        pending('outer', outerReactions),
        pending('last'),
      ],
      [A1],
    ),
    output: ['false true'],
  },
  {
    title: '동기 코드가 끝났다',
    explanation: `실행 중인 ECMAScript 코드가 없어졌으므로 기다리던 Job을 시작할 수 있습니다. ${HOST_NOTE}`,
    line: at(11),
    state: state(
      NONE,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        pending('outer', outerReactions),
        pending('last'),
      ],
      [A1],
    ),
    output: ['false true'],
  },
  {
    title: 'Job 1: 콜백이 inner를 반환 → outer는 따라가기 시작',
    explanation:
      '콜백이 반환한 값으로 outer의 resolve 함수가 불립니다. 그 값은 객체이고 then이 함수이므로 outer를 바로 이행하지 않고 NewPromiseResolveThenableJob을 넣습니다. outer는 resolve가 이미 불렸지만 아직 pending입니다. inner의 결과를 따라가기로 묶인(locked in) 상태입니다.',
    line: range(5, 7),
    state: state(
      A1,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        pending('outer', outerReactions, 'inner'),
        pending('last'),
      ],
      [A2],
    ),
    output: ['false true'],
  },
  {
    title: 'Job 2: inner.then(resolve, reject)를 호출',
    explanation:
      'NewPromiseResolveThenableJob이 outer의 새 resolve·reject 함수를 만들어 inner의 then을 부릅니다. inner는 이미 이행됐으므로 이 then도 반응 Job을 바로 넣습니다. (이 then이 돌려주는 프로미스는 아무 변수에도 담기지 않아 그림에 그리지 않았습니다.) outer는 여전히 pending입니다.',
    line: range(5, 7),
    state: state(
      A2,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        pending('outer', outerReactions, 'inner'),
        pending('last'),
      ],
      [A3],
    ),
    output: ['false true'],
  },
  {
    title: 'Job 3: outer가 inner의 값으로 이행',
    explanation:
      '반응 Job이 inner의 이행 값으로 outer의 resolve 함수를 부릅니다. 문자열은 객체가 아니므로 outer가 이행되고, 쌓여 있던 반응이 Job으로 넘어갑니다. 콜백이 프로미스를 반환하면 outer가 정해지기까지 Job이 이렇게 여러 번 지나야 합니다.',
    line: range(5, 7),
    state: state(
      A3,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        fulfilled('outer', INNER),
        pending('last'),
      ],
      [A4],
    ),
    output: ['false true'],
  },
  {
    title: 'Job 4: outer의 콜백이 inner의 값을 출력',
    explanation:
      'outer의 이행 반응 Job이 콜백을 부릅니다. 콜백은 outer got inner value를 출력하고 아무것도 반환하지 않으므로 last는 undefined로 이행됩니다.',
    line: range(8, 10),
    state: state(
      A4,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        fulfilled('outer', INNER),
        fulfilled('last', 'undefined'),
      ],
      [],
    ),
    output: ['false true', 'outer got inner value'],
  },
  {
    title: '모든 Job이 끝났다',
    explanation:
      '기다리는 Job이 없고 모든 프로미스가 정해졌습니다. outer는 inner와 다른 프로미스지만 inner의 결과를 따라가 같은 값으로 이행됐습니다.',
    line: range(8, 10),
    state: state(
      NONE,
      [
        fulfilled('inner', INNER),
        fulfilled('start', "'start'"),
        fulfilled('outer', INNER),
        fulfilled('last', 'undefined'),
      ],
      [],
    ),
    output: ['false true', 'outer got inner value'],
  },
]

export const scenarios: Scenario<PromiseSimState>[] = [
  {
    id: 'chain',
    label: '이미 이행된 프로미스와 then 체인',
    exampleId: 'chain',
    code: chainCode,
    steps: chainSteps,
  },
  {
    id: 'adopt',
    label: '콜백이 프로미스를 반환할 때',
    exampleId: 'return-promise',
    code: returnPromiseCode,
    steps: adoptSteps,
  },
]
