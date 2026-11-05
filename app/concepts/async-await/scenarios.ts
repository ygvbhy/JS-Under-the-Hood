import type { Scenario, Step } from '~/simulator/types'
import interleaveCode from './examples/interleave.js?raw'
import syncUntilAwaitCode from './examples/sync-until-await.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 실행 컨텍스트 스택. 아래(먼저 쌓인 것) → 위(지금 실행 중). '전역 코드', '<함수 이름> 본문', '<콜백 이름>'.
//   전역 코드가 끝나면 []이다. 프로미스 Job이 async 함수를 재개하면 그 본문 컨텍스트가 스택에 오른다.
//   내장 함수(then, console.log, Await가 만든 함수)의 프레임은 그리지 않는다
// - calls: async 함수 호출(그 실행 컨텍스트). status는 명세의 슬롯이 아니라 표시용이다
//   (running: 실행 중, awaiting: await에서 멈춘 실행 컨텍스트, completed: 끝남)
// - promises: 변수에 담긴 프로미스(이름은 변수 이름). 변수에 대입되기 전의 프로미스는 'work()의 프로미스'처럼 부른다.
//   result는 표시용 문자열이며 문자열은 따옴표를 붙인다('done'). pending이면 null.
//   reactions는 아직 Job이 되지 않은, 등록만 된 반응
// - jobs: 프로미스 Job 큐. 넣은 순서대로, 앞이 먼저. 실행 중인 Job은 stack에 있고 jobs에는 없다

export type CallStatus = 'running' | 'awaiting' | 'completed'

export type AsyncState = {
  stack: string[]
  calls: { name: string; status: CallStatus }[]
  promises: {
    name: string
    state: 'pending' | 'fulfilled' | 'rejected'
    result: string | null
    reactions: string[]
  }[]
  jobs: string[]
}

type AStep = Step<AsyncState>
type Call = AsyncState['calls'][number]
type Prom = AsyncState['promises'][number]

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const call = (name: string, status: CallStatus): Call => ({ name, status })
const pending = (name: string, reactions: string[] = []): Prom => ({
  name,
  state: 'pending',
  result: null,
  reactions,
})
const fulfilled = (name: string, result: string): Prom => ({
  name,
  state: 'fulfilled',
  result,
  reactions: [],
})

const state = (stack: string[], calls: Call[], promises: Prom[], jobs: string[]): AsyncState => ({
  stack,
  calls,
  promises,
  jobs,
})

const G = '전역 코드'

// --- 1. 첫 await까지는 동기로 ---------------------------------------------------------------

const WORK = 'work 본문'
const WORK_PROMISE = 'work()의 프로미스'

const basicSteps: AStep[] = [
  {
    title: '실행 시작',
    explanation:
      '전역 코드가 시작되면 async function 선언의 함수 객체가 먼저 만들어집니다. 아직 work를 부르지 않았으므로 async 함수 호출도 프로미스도 없고, 실행 컨텍스트 스택에는 전역 코드만 있습니다.',
    line: range(1, 6),
    state: state([G], [], [], []),
    output: [],
  },
  {
    title: 'var p = work()',
    explanation:
      'async 함수를 부르면 EvaluateAsyncFunctionBody가 먼저 NewPromiseCapability로 새 프로미스를 만들어 두고, 매개변수 처리 뒤 AsyncFunctionStart로 본문을 시작합니다. 이 프로미스는 pending이고 호출이 끝날 때 돌려줄 값입니다. 본문 컨텍스트는 호출한 쪽(전역 코드) 위에 쌓여 지금 바로 실행됩니다. 아직 p에 대입되기 전이라 변수 이름은 없습니다.',
    line: at(7),
    state: state([G, WORK], [call('work()', 'running')], [pending(WORK_PROMISE)], []),
    output: [],
  },
  {
    title: "console.log('a1')",
    explanation:
      '본문은 await를 만나기 전까지 호출이 값을 돌려주기 전에 동기로 실행됩니다. a1이 after call보다 먼저 찍힙니다.',
    line: at(2),
    state: state([G, WORK], [call('work()', 'running')], [pending(WORK_PROMISE)], []),
    output: ['a1'],
  },
  {
    title: 'await null',
    explanation:
      'Await는 null을 PromiseResolve로 감싸 이미 이행된 새 프로미스를 만들고, PerformPromiseThen으로 재개 함수를 그 프로미스의 반응으로 등록합니다. 프로미스가 이미 이행되어 있으므로 반응은 곧바로 프로미스 Job이 되어 큐에 들어갑니다. work의 실행 컨텍스트는 여기서 멈추고 스택에서 빠지며, 호출한 쪽(전역 코드)으로 돌아갑니다. 멈춘 컨텍스트는 큐의 Job이 이어 갑니다.',
    line: at(3),
    state: state([G], [call('work()', 'awaiting')], [pending(WORK_PROMISE)], ['work 재개']),
    output: ['a1'],
  },
  {
    title: 'p에 프로미스 대입',
    explanation:
      '호출 work()가 끝나 돌려준 프로미스가 변수 p에 대입됩니다. 이 프로미스는 본문이 끝나기 전이라 아직 pending입니다.',
    line: at(7),
    state: state([G], [call('work()', 'awaiting')], [pending('p')], ['work 재개']),
    output: ['a1'],
  },
  {
    title: "console.log('after call')",
    explanation:
      '호출한 쪽의 코드가 이어서 실행됩니다. work는 await에서 멈춰 있고, a2는 아직 찍히지 않았습니다.',
    line: at(8),
    state: state([G], [call('work()', 'awaiting')], [pending('p')], ['work 재개']),
    output: ['a1', 'after call'],
  },
  {
    title: 'p.then(...)',
    explanation:
      'p는 아직 pending이므로 PerformPromiseThen은 콜백을 이행 반응으로 p에 등록만 하고 Job을 만들지 않습니다. p가 이행될 때 이 반응이 Job이 됩니다.',
    line: range(9, 11),
    state: state([G], [call('work()', 'awaiting')], [pending('p', ['then 콜백'])], ['work 재개']),
    output: ['a1', 'after call'],
  },
  {
    title: '동기 코드 끝',
    explanation:
      '전역 코드가 끝나 실행 컨텍스트 스택이 비었습니다. ECMAScript는 스택이 비어 있을 때만 Job을 시작하게 하므로, 이제 큐의 프로미스 Job이 넣은 순서대로 하나씩 실행됩니다. work는 아직 멈춘 채이고 p는 pending입니다.',
    state: state([], [call('work()', 'awaiting')], [pending('p', ['then 콜백'])], ['work 재개']),
    output: ['a1', 'after call'],
  },
  {
    title: 'Job: work 재개',
    explanation:
      '큐 맨 앞의 Job이 실행되어 멈춰 있던 work의 실행 컨텍스트를 다시 스택에 올립니다. await null 식의 값은 null이고 본문이 그 뒤부터 이어집니다.',
    line: at(3),
    state: state([WORK], [call('work()', 'running')], [pending('p', ['then 콜백'])], []),
    output: ['a1', 'after call'],
  },
  {
    title: "console.log('a2')",
    explanation:
      '재개된 본문이 await 뒤의 문장을 실행합니다. 호출한 쪽의 코드는 이미 끝난 뒤입니다.',
    line: at(4),
    state: state([WORK], [call('work()', 'running')], [pending('p', ['then 콜백'])], []),
    output: ['a1', 'after call', 'a2'],
  },
  {
    title: "return 'done'",
    explanation:
      "return을 만나면 본문이 끝나 AsyncBlockStart가 본문 컨텍스트를 스택에서 빼고, 프로미스의 [[Resolve]]를 'done'으로 불러 p를 이행시킵니다. p에 등록돼 있던 then 콜백 반응이 Job이 되어 큐에 들어갑니다. 호출 work()는 끝남이 됩니다.",
    line: at(5),
    state: state([], [call('work()', 'completed')], [fulfilled('p', "'done'")], ['then 콜백']),
    output: ['a1', 'after call', 'a2'],
  },
  {
    title: 'Job: then 콜백 실행',
    explanation:
      '큐 맨 앞의 Job이 실행되어 then에 넘긴 콜백이 이행 값 done을 인수로 받아 시작됩니다.',
    line: range(9, 11),
    state: state(['then 콜백'], [call('work()', 'completed')], [fulfilled('p', "'done'")], []),
    output: ['a1', 'after call', 'a2'],
  },
  {
    title: "console.log('then ' + v)",
    explanation: '콜백이 then done을 출력합니다.',
    line: at(10),
    state: state(['then 콜백'], [call('work()', 'completed')], [fulfilled('p', "'done'")], []),
    output: ['a1', 'after call', 'a2', 'then done'],
  },
  {
    title: '끝',
    explanation:
      '콜백이 끝나 스택이 비고 큐도 비었습니다. 출력 순서는 a1, after call, a2, then done입니다. await 뒤의 a2는 호출한 쪽의 코드가 모두 끝난 다음에 실행됐습니다.',
    state: state([], [call('work()', 'completed')], [fulfilled('p', "'done'")], []),
    output: ['a1', 'after call', 'a2', 'then done'],
  },
]

// --- 2. await 뒤의 코드와 then 콜백의 순서 -----------------------------------------------------

const TASK = 'task 본문'

const interleaveSteps: AStep[] = [
  {
    title: '실행 시작',
    explanation:
      '전역 코드가 시작되면 async function 선언의 함수 객체가 먼저 만들어집니다. 아직 task를 부르지 않았으므로 async 함수 호출도 Job도 없습니다. 이 예제는 프로미스를 변수에 담지 않아서 프로미스 칸이 계속 비어 있습니다.',
    line: range(1, 4),
    state: state([G], [], [], []),
    output: [],
  },
  {
    title: 'task()',
    explanation:
      'task를 부르면 새 프로미스를 만들고 본문 컨텍스트를 스택에 올려 await를 만날 때까지 동기로 실행합니다. 첫 줄이 곧바로 await라서 출력할 것은 아직 없습니다.',
    line: at(5),
    state: state([G, TASK], [call('task()', 'running')], [], []),
    output: [],
  },
  {
    title: "await 'not a promise'",
    explanation:
      '프로미스가 아닌 값도 Await의 PromiseResolve가 이행된 새 프로미스로 감쌉니다. 이미 이행된 프로미스에 PerformPromiseThen으로 재개 함수를 등록하므로 곧바로 Job이 큐에 들어가고, task의 실행 컨텍스트는 멈춰 호출한 쪽으로 돌아갑니다. 프로미스가 아닌 값이어도 멈춥니다.',
    line: at(2),
    state: state([G], [call('task()', 'awaiting')], [], ['task 재개']),
    output: [],
  },
  {
    title: 'Promise.resolve().then(...)',
    explanation:
      'Promise.resolve()가 이미 이행된 프로미스를 돌려주므로 첫 then의 콜백은 곧바로 Job으로 큐에 들어갑니다. 큐의 순서는 task 재개 다음에 then 1 콜백입니다.',
    line: range(6, 9),
    state: state([G], [call('task()', 'awaiting')], [], ['task 재개', 'then 1 콜백']),
    output: [],
  },
  {
    title: '.then(...) 두 번째 등록',
    explanation:
      '첫 then이 돌려준 새 프로미스는 아직 pending입니다. 두 번째 then의 콜백은 그 프로미스의 이행 반응으로 등록만 되고 Job은 되지 않습니다. 그 프로미스는 변수에 담기지 않아 그림에서 생략했고, 큐는 그대로입니다.',
    line: range(10, 12),
    state: state([G], [call('task()', 'awaiting')], [], ['task 재개', 'then 1 콜백']),
    output: [],
  },
  {
    title: "console.log('sync')",
    explanation: '호출한 쪽의 코드가 이어서 실행되어 sync가 가장 먼저 찍힙니다.',
    line: at(13),
    state: state([G], [call('task()', 'awaiting')], [], ['task 재개', 'then 1 콜백']),
    output: ['sync'],
  },
  {
    title: '동기 코드 끝',
    explanation:
      '전역 코드가 끝나 실행 컨텍스트 스택이 비었습니다. ECMAScript는 스택이 비어 있을 때만 Job을 시작하게 하므로, 이제 큐 맨 앞부터 프로미스 Job이 하나씩 실행됩니다. 큐의 순서는 Job이 들어간 순서입니다.',
    state: state([], [call('task()', 'awaiting')], [], ['task 재개', 'then 1 콜백']),
    output: ['sync'],
  },
  {
    title: 'Job: task 재개',
    explanation:
      '먼저 들어간 Job이 먼저 실행됩니다. 멈춰 있던 task의 실행 컨텍스트가 다시 스택에 오릅니다.',
    line: at(2),
    state: state([TASK], [call('task()', 'running')], [], ['then 1 콜백']),
    output: ['sync'],
  },
  {
    title: "console.log('task after await')",
    explanation:
      'await 뒤의 문장이 실행됩니다. task 재개 Job이 then 1 콜백 Job보다 먼저 큐에 들어갔기 때문에 이 줄이 then 1보다 앞섭니다.',
    line: at(3),
    state: state([TASK], [call('task()', 'running')], [], ['then 1 콜백']),
    output: ['sync', 'task after await'],
  },
  {
    title: 'task 끝',
    explanation:
      '본문 끝에 이르면 AsyncBlockStart가 본문 컨텍스트를 스택에서 빼고, task가 돌려준 프로미스를 undefined로 이행시킵니다. task 호출은 끝남이 됩니다. 이 프로미스에 등록된 반응이 없으므로 새 Job은 생기지 않습니다.',
    line: at(4),
    state: state([], [call('task()', 'completed')], [], ['then 1 콜백']),
    output: ['sync', 'task after await'],
  },
  {
    title: 'Job: then 1 콜백 실행',
    explanation: '다음 Job인 첫 then의 콜백이 스택에 올라 실행을 시작합니다.',
    line: range(7, 9),
    state: state(['then 1 콜백'], [call('task()', 'completed')], [], []),
    output: ['sync', 'task after await'],
  },
  {
    title: "console.log('then 1')",
    explanation: '콜백이 then 1을 출력합니다.',
    line: at(8),
    state: state(['then 1 콜백'], [call('task()', 'completed')], [], []),
    output: ['sync', 'task after await', 'then 1'],
  },
  {
    title: 'then 1 콜백 끝',
    explanation:
      '콜백이 undefined를 반환하며 끝나 첫 then이 돌려준 프로미스가 이행되고, 거기 등록돼 있던 두 번째 then의 반응이 Job이 되어 큐에 들어갑니다.',
    line: at(9),
    state: state([], [call('task()', 'completed')], [], ['then 2 콜백']),
    output: ['sync', 'task after await', 'then 1'],
  },
  {
    title: 'Job: then 2 콜백 실행',
    explanation: '큐의 마지막 Job인 두 번째 then의 콜백이 스택에 올라 실행을 시작합니다.',
    line: range(10, 12),
    state: state(['then 2 콜백'], [call('task()', 'completed')], [], []),
    output: ['sync', 'task after await', 'then 1'],
  },
  {
    title: "console.log('then 2')",
    explanation: '콜백이 then 2를 출력합니다.',
    line: at(11),
    state: state(['then 2 콜백'], [call('task()', 'completed')], [], []),
    output: ['sync', 'task after await', 'then 1', 'then 2'],
  },
  {
    title: '끝',
    explanation:
      '스택도 큐도 비었습니다. 출력 순서는 sync, task after await, then 1, then 2입니다. await 뒤의 코드와 then 콜백은 같은 큐에서 들어간 순서대로 실행됩니다.',
    state: state([], [call('task()', 'completed')], [], []),
    output: ['sync', 'task after await', 'then 1', 'then 2'],
  },
]

export const scenarios: Scenario<AsyncState>[] = [
  {
    id: 'basic',
    label: '첫 await까지는 동기로',
    exampleId: 'sync-until-await',
    code: syncUntilAwaitCode,
    steps: basicSteps,
  },
  {
    id: 'interleave',
    label: 'await 뒤의 코드와 then 콜백',
    exampleId: 'interleave',
    code: interleaveCode,
    steps: interleaveSteps,
  },
]
