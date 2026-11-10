import type { Scenario, Step } from '~/simulator/types'
import inputOrderCode from './examples/input-order.js?raw'
import keepsGoingCode from './examples/keeps-going.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// Promise.all 하나의 '장부'만 그린다.
// - running: 지금 실행 중인 것. '동기 코드' / 실행 중인 Job 이름 / '없음'(실행 중인 코드가 없을 때)
// - result: Promise.all이 돌려주는 결과 프로미스 (예제의 변수 all)
//   state: none(Promise.all을 부르기 전) | pending | fulfilled | rejected
//   value: 정해진 값의 표시용 문자열(util.inspect 표기). pending·none이면 null
// - remaining: 남은 개수(remainingElementsCount). Promise.all을 부르기 전이면 null
// - iterationDone: 이터레이터가 끝나 남은 개수에서 1을 뺐는지. 남은 개수 검산에 쓴다
//   (남은 개수 = 1 + 등록한 요소 수 - (iterationDone ? 1 : 0) - 요소 함수가 불린 요소 수)
// - values: 결과 배열이 될 목록. 요소를 등록할 때마다 칸이 하나 늘고, null은 아직 비어 있는 칸(명세의 undefined)
// - elements: 장부의 요소. 등록한 순서(= 자리 번호 index 순서)
//   label: 입력 배열에 쓴 표현(변수 이름 또는 값)
//   state: 그 요소를 Promise.resolve로 바꾼 프로미스의 상태
//   called: 그 요소의 요소 함수가 불렸는지(AlreadyCalled가 true인지)
// - jobs: HostEnqueuePromiseJob으로 넣었고 아직 시작하지 않은 Job. 넣은 순서대로, 앞이 먼저 실행된다
//   실행 중인 Job은 running에 있고 jobs에는 없다
//   then이 내부적으로 만드는, 변수에 담기지 않은 프로미스는 그리지 않는다

export type ElementInfo = {
  index: number
  label: string
  state: 'pending' | 'fulfilled' | 'rejected'
  called: boolean
}

export type AllLedgerState = {
  running: string
  result: { state: 'none' | 'pending' | 'fulfilled' | 'rejected'; value: string | null }
  remaining: number | null
  iterationDone: boolean
  values: (string | null)[]
  elements: ElementInfo[]
  jobs: string[]
}

type LStep = Step<AllLedgerState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const el = (
  index: number,
  label: string,
  state: ElementInfo['state'],
  called = false,
): ElementInfo => ({ index, label, state, called })

const NO_RESULT: AllLedgerState['result'] = { state: 'none', value: null }
const PENDING: AllLedgerState['result'] = { state: 'pending', value: null }

const state = (
  running: string,
  result: AllLedgerState['result'],
  remaining: number | null,
  iterationDone: boolean,
  values: (string | null)[],
  elements: ElementInfo[],
  jobs: string[],
): AllLedgerState => ({ running, result, remaining, iterationDone, values, elements, jobs })

const SYNC = '동기 코드'
const NONE = '없음'

// --- 1. 넣은 순서로 모으기 (input-order.js) -------------------------------------------------------

const JOB_2 = '요소 함수 Job (자리 2)'
const JOB_1 = '요소 함수 Job (자리 1)'
const JOB_0 = '요소 함수 Job (자리 0)'
const JOB_ALL = 'all.then 반응 Job'

const A_DONE = `[ 'A', 'B', 'c' ]`
const fulfilledAll = { state: 'fulfilled', value: A_DONE } as const

const inputOrderSteps: LStep[] = [
  {
    title: '실행 시작',
    explanation:
      '스크립트가 시작됩니다. 결과 프로미스도 요소 장부도 아직 없고, 기다리는 Job도 없습니다.',
    state: state(SYNC, NO_RESULT, null, false, [], [], []),
    output: [],
  },
  {
    title: '대기 중인 프로미스 a와 b 만들기',
    explanation:
      'a와 b는 아직 정해지지 않은 pending 프로미스입니다. resolve 함수는 나중에 부를 수 있도록 resolveA, resolveB 변수에 담아 둡니다. 아직 Promise.all을 부르지 않았으므로 장부는 비어 있습니다.',
    line: range(1, 3),
    state: state(SYNC, NO_RESULT, null, false, [], [], []),
    output: [],
  },
  {
    title: 'Promise.all 호출: 결과 프로미스와 장부를 만든다',
    explanation:
      'Promise.all은 먼저 결과 프로미스를 만들고(pending), 비어 있는 values 목록과 남은 개수를 만듭니다. 남은 개수는 0이 아니라 1에서 시작합니다. 이유는 반복이 끝나는 단계에서 설명합니다. 이어서 배열을 이터레이터로 하나씩 돌며 요소를 장부에 올립니다.',
    line: at(4),
    state: state(SYNC, PENDING, 1, false, [], [], []),
    output: [],
  },
  {
    title: '요소 a 등록: 자리 0번, 남은 개수 2',
    explanation:
      'values 목록 끝에 빈 칸을 하나 추가합니다. a는 constructor가 Promise인 프로미스라서 Promise.resolve(a)가 a를 그대로 돌려줍니다. 이어 자리 번호 0을 기억하고 아직 불리지 않은 상태인 요소 함수를 만들고, 남은 개수를 1 올린 뒤 a.then(요소 함수, 결과 프로미스의 reject)를 부릅니다. a는 pending이라 반응은 등록만 됩니다.',
    line: at(4),
    state: state(SYNC, PENDING, 2, false, [null], [el(0, 'a', 'pending')], []),
    output: [],
  },
  {
    title: '요소 b 등록: 자리 1번, 남은 개수 3',
    explanation:
      'b도 같은 순서로 장부에 올립니다. 자리 번호는 1이고 남은 개수는 3이 됩니다. b도 pending이라 반응만 등록됩니다.',
    line: at(4),
    state: state(
      SYNC,
      PENDING,
      3,
      false,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending')],
      [],
    ),
    output: [],
  },
  {
    title: "요소 'c' 등록: 이미 이행된 프로미스라 Job이 바로 들어간다",
    explanation:
      "'c'는 프로미스가 아니므로 Promise.resolve('c')가 이미 이행된 새 프로미스를 만듭니다. 자리 번호 2의 요소 함수를 붙이는 then이 불릴 때 이 프로미스는 이미 이행된 상태라서, 반응을 쌓지 않고 Job을 그 자리에서 넣습니다. Job이 Promise.all 호출 안에서 대기열에 들어가지만, 요소 함수는 동기 코드가 끝난 뒤에 실행됩니다. 남은 개수는 4가 됩니다.",
    line: at(4),
    state: state(
      SYNC,
      PENDING,
      4,
      false,
      [null, null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending'), el(2, "'c'", 'fulfilled')],
      [JOB_2],
    ),
    output: [],
  },
  {
    title: '반복이 끝났다: 남은 개수에서 1을 뺀다',
    explanation:
      '이터레이터가 더 이상 값을 주지 않으면 Promise.all은 남은 개수를 1 줄입니다(3). 0이면 그 자리에서 결과를 이행시키지만 지금은 0이 아닙니다. 개수를 1에서 시작한 이유는 명세 NOTE에 있습니다. 입력을 다 돌기 전에 then이 콜백을 미리 불러 버리는 경우에도 결과 프로미스의 resolve가 한 번만 불리게 하려는 것입니다. 표준 프로미스에서는 그런 일이 없으므로 이 예제에서는 이 1이 결과를 바꾸지 않습니다. 이제 Promise.all이 결과 프로미스를 돌려줍니다.',
    line: at(4),
    state: state(
      SYNC,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending'), el(2, "'c'", 'fulfilled')],
      [JOB_2],
    ),
    output: [],
  },
  {
    title: 'all.then: 결과 프로미스에 반응 등록',
    explanation:
      'all은 아직 pending이라 콜백은 반응으로 등록만 됩니다. 장부와 남은 개수는 그대로입니다.',
    line: at(5),
    state: state(
      SYNC,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending'), el(2, "'c'", 'fulfilled')],
      [JOB_2],
    ),
    output: [],
  },
  {
    title: "resolveB('B'): b가 이행되고 요소 함수 Job이 들어간다",
    explanation:
      "b가 'B'로 이행되고, b에 등록해 둔 이행 반응(자리 1의 요소 함수)이 Job으로 대기열에 들어갑니다. 'c'의 Job이 이미 앞에 있으므로 b의 Job은 그 뒤에 붙습니다. 요소 함수는 아직 불리지 않았으니 values와 남은 개수는 그대로입니다.",
    line: at(6),
    state: state(
      SYNC,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'fulfilled'), el(2, "'c'", 'fulfilled')],
      [JOB_2, JOB_1],
    ),
    output: [],
  },
  {
    title: "console.log('B resolved')",
    explanation:
      '동기 코드가 아직 실행 중이라 Job은 시작되지 않습니다. 그래서 B resolved가 먼저 출력됩니다.',
    line: at(7),
    state: state(
      SYNC,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'fulfilled'), el(2, "'c'", 'fulfilled')],
      [JOB_2, JOB_1],
    ),
    output: ['B resolved'],
  },
  {
    title: "resolveA('A'): a가 이행되고 요소 함수 Job이 들어간다",
    explanation:
      "a가 'A'로 이행되고 자리 0의 요소 함수가 Job으로 들어갑니다. 이 Job은 대기열의 맨 뒤입니다.",
    line: at(8),
    state: state(
      SYNC,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'fulfilled'), el(1, 'b', 'fulfilled'), el(2, "'c'", 'fulfilled')],
      [JOB_2, JOB_1, JOB_0],
    ),
    output: ['B resolved'],
  },
  {
    title: "console.log('A resolved')",
    explanation: '아직 동기 코드 실행 중이라 Job은 시작되지 않고, A resolved가 출력됩니다.',
    line: at(9),
    state: state(
      SYNC,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'fulfilled'), el(1, 'b', 'fulfilled'), el(2, "'c'", 'fulfilled')],
      [JOB_2, JOB_1, JOB_0],
    ),
    output: ['B resolved', 'A resolved'],
  },
  {
    title: '동기 코드가 끝났다',
    explanation:
      "실행 중인 코드가 없어졌으므로 Job을 시작할 수 있습니다. Job은 대기열에 넣은 순서대로 실행됩니다. 'c'는 Promise.all 호출 안에서, b는 resolveB에서, a는 resolveA에서 들어갔으므로 순서는 'c', b, a입니다.",
    line: at(9),
    state: state(
      NONE,
      PENDING,
      3,
      true,
      [null, null, null],
      [el(0, 'a', 'fulfilled'), el(1, 'b', 'fulfilled'), el(2, "'c'", 'fulfilled')],
      [JOB_2, JOB_1, JOB_0],
    ),
    output: ['B resolved', 'A resolved'],
  },
  {
    title: "Job 자리 2: values[2]에 'c'",
    explanation:
      "요소 함수는 이미 불렸는지 확인하고(아니오), 불렸다고 표시한 뒤, 기억해 둔 자리 번호 2번 칸에 값 'c'를 넣습니다. 남은 개수를 1 줄여 2가 됩니다. 0이 아니므로 결과 프로미스는 그대로입니다.",
    line: at(4),
    state: state(
      JOB_2,
      PENDING,
      2,
      true,
      [null, null, "'c'"],
      [el(0, 'a', 'fulfilled'), el(1, 'b', 'fulfilled'), el(2, "'c'", 'fulfilled', true)],
      [JOB_1, JOB_0],
    ),
    output: ['B resolved', 'A resolved'],
  },
  {
    title: "Job 자리 1: values[1]에 'B'",
    explanation:
      "자리 번호 1번 칸에 'B'를 넣습니다. 앞쪽 values[0]이 아직 비어 있어도 이 요소는 자기 자리 번호의 칸에 넣기 때문에 다른 칸의 순서와 상관이 없습니다. 남은 개수는 1입니다.",
    line: at(4),
    state: state(
      JOB_1,
      PENDING,
      1,
      true,
      [null, "'B'", "'c'"],
      [el(0, 'a', 'fulfilled'), el(1, 'b', 'fulfilled', true), el(2, "'c'", 'fulfilled', true)],
      [JOB_0],
    ),
    output: ['B resolved', 'A resolved'],
  },
  {
    title: "Job 자리 0: values[0]에 'A', 남은 개수 0이라 결과가 이행된다",
    explanation:
      "자리 번호 0번 칸에 'A'를 넣고 남은 개수를 1 줄이면 0이 됩니다. 0이 되면 values 목록으로 만든 배열로 결과 프로미스를 resolve합니다. 배열에 then이 없으므로 결과 프로미스는 바로 이행되고, 등록해 둔 all.then의 반응이 Job으로 들어갑니다.",
    line: at(4),
    state: state(
      JOB_0,
      fulfilledAll,
      0,
      true,
      ["'A'", "'B'", "'c'"],
      [
        el(0, 'a', 'fulfilled', true),
        el(1, 'b', 'fulfilled', true),
        el(2, "'c'", 'fulfilled', true),
      ],
      [JOB_ALL],
    ),
    output: ['B resolved', 'A resolved'],
  },
  {
    title: 'all.then 반응 Job: 배열을 출력',
    explanation:
      "콜백이 values를 받아 JSON 문자열로 출력합니다. 요소 함수가 불린 순서는 요소 'c', b, a였지만 배열은 자리 번호 순서인 A, B, c입니다.",
    line: at(5),
    state: state(
      JOB_ALL,
      fulfilledAll,
      0,
      true,
      ["'A'", "'B'", "'c'"],
      [
        el(0, 'a', 'fulfilled', true),
        el(1, 'b', 'fulfilled', true),
        el(2, "'c'", 'fulfilled', true),
      ],
      [],
    ),
    output: ['B resolved', 'A resolved', 'all ["A","B","c"]'],
  },
  {
    title: '모든 Job이 끝났다',
    explanation:
      '기다리는 Job이 없습니다. 결과의 순서를 정한 것은 값이 정해진 순서가 아니라 요소마다 기억해 둔 자리 번호입니다.',
    line: at(5),
    state: state(
      NONE,
      fulfilledAll,
      0,
      true,
      ["'A'", "'B'", "'c'"],
      [
        el(0, 'a', 'fulfilled', true),
        el(1, 'b', 'fulfilled', true),
        el(2, "'c'", 'fulfilled', true),
      ],
      [],
    ),
    output: ['B resolved', 'A resolved', 'all ["A","B","c"]'],
  },
]

// --- 2. 하나가 거부될 때 (keeps-going.js) ---------------------------------------------------------

const JOB_REJECT = 'b의 거부 반응 Job (결과의 reject 호출)'
const JOB_CATCH = 'all.catch 반응 Job'
const JOB_A_THEN = 'a.then 반응 Job'

const REJECTED_ALL = { state: 'rejected', value: 'Error: b failed' } as const

const keepsGoingSteps: LStep[] = [
  {
    title: '실행 시작',
    explanation:
      '스크립트가 시작됩니다. 결과 프로미스도 요소 장부도 아직 없고, 기다리는 Job도 없습니다.',
    state: state(SYNC, NO_RESULT, null, false, [], [], []),
    output: [],
  },
  {
    title: '대기 중인 프로미스 a와 b 만들기',
    explanation:
      'a와 b는 pending 프로미스입니다. resolve 함수와 reject 함수를 나중에 부를 수 있도록 resolveA, rejectB 변수에 담아 둡니다.',
    line: range(1, 3),
    state: state(SYNC, NO_RESULT, null, false, [], [], []),
    output: [],
  },
  {
    title: 'Promise.all 호출: 결과 프로미스와 장부를 만든다',
    explanation:
      'Promise.all은 결과 프로미스(pending)와 비어 있는 values 목록, 1에서 시작하는 남은 개수를 만듭니다. 이어서 배열의 요소를 하나씩 장부에 올립니다.',
    line: at(4),
    state: state(SYNC, PENDING, 1, false, [], [], []),
    output: [],
  },
  {
    title: '요소 a 등록: 자리 0번, 남은 개수 2',
    explanation:
      'values에 빈 칸을 추가하고, 자리 번호 0을 기억하는 요소 함수를 만들고, 남은 개수를 올린 뒤 a.then(요소 함수, 결과 프로미스의 reject)를 부릅니다. a는 pending이라 반응만 등록됩니다.',
    line: at(4),
    state: state(SYNC, PENDING, 2, false, [null], [el(0, 'a', 'pending')], []),
    output: [],
  },
  {
    title: '요소 b 등록: 자리 1번, 남은 개수 3',
    explanation:
      'b도 같은 순서로 올립니다. b.then에 넘기는 두 번째 인수는 요소 함수가 아니라 결과 프로미스의 reject 함수입니다. 그래서 b가 거부되면 그 reject를 부르는 Job이 들어가게 됩니다.',
    line: at(4),
    state: state(
      SYNC,
      PENDING,
      3,
      false,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending')],
      [],
    ),
    output: [],
  },
  {
    title: '반복이 끝났다: 남은 개수에서 1을 뺀다',
    explanation:
      '이터레이터가 끝나면 남은 개수를 1 줄여 2가 됩니다. 이 개수가 0이 되려면 a와 b의 요소 함수가 모두 불려야 합니다. 이제 Promise.all이 결과 프로미스를 돌려줍니다.',
    line: at(4),
    state: state(
      SYNC,
      PENDING,
      2,
      true,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending')],
      [],
    ),
    output: [],
  },
  {
    title: 'all.catch와 a.then: 반응 등록',
    explanation:
      'all.catch의 콜백은 결과 프로미스에, a.then의 콜백은 a에 반응으로 등록됩니다. a에는 Promise.all이 먼저 등록한 요소 함수의 반응이 앞에 있고, a.then의 반응은 그 뒤입니다. 둘 다 pending이라 등록만 되고 장부는 그대로입니다.',
    line: range(5, 9),
    state: state(
      SYNC,
      PENDING,
      2,
      true,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'pending')],
      [],
    ),
    output: [],
  },
  {
    title: 'rejectB(new Error): b가 거부되고 Job이 들어간다',
    explanation:
      'b가 거부되면 b에 등록해 둔 거부 반응이 Job으로 대기열에 들어갑니다. 이 반응은 결과 프로미스의 reject 함수를 부르는 것입니다. 자리 1의 요소 함수는 이행 반응이라 b가 거부된 뒤에는 쓰이지 않습니다.',
    line: at(10),
    state: state(
      SYNC,
      PENDING,
      2,
      true,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'rejected')],
      [JOB_REJECT],
    ),
    output: [],
  },
  {
    title: "console.log('sync end')",
    explanation:
      '동기 코드가 아직 실행 중이라 Job은 시작되지 않습니다. sync end가 먼저 출력됩니다.',
    line: at(11),
    state: state(
      SYNC,
      PENDING,
      2,
      true,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'rejected')],
      [JOB_REJECT],
    ),
    output: ['sync end'],
  },
  {
    title: '동기 코드가 끝났다',
    explanation: '실행 중인 코드가 없어졌으므로 대기열의 Job을 시작할 수 있습니다.',
    line: at(11),
    state: state(
      NONE,
      PENDING,
      2,
      true,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'rejected')],
      [JOB_REJECT],
    ),
    output: ['sync end'],
  },
  {
    title: '거부 반응 Job: 결과 프로미스가 거부된다',
    explanation:
      '결과 프로미스의 reject가 불려 all이 b의 사유로 거부됩니다. all.catch의 반응이 Job으로 들어갑니다. values 칸과 남은 개수는 건드리지 않습니다.',
    line: at(4),
    state: state(
      JOB_REJECT,
      REJECTED_ALL,
      2,
      true,
      [null, null],
      [el(0, 'a', 'pending'), el(1, 'b', 'rejected')],
      [JOB_CATCH],
    ),
    output: ['sync end'],
  },
  {
    title: "all.catch 콜백 Job: 출력하고 resolveA('A')",
    explanation:
      "콜백이 all rejected b failed를 출력하고 resolveA('A')를 부릅니다. a는 결과 프로미스와 별개의 프로미스라서 이행되고, a에 등록된 반응이 등록한 순서대로 Job이 됩니다. 자리 0의 요소 함수가 먼저, a.then의 콜백이 그 뒤입니다.",
    line: range(5, 8),
    state: state(
      JOB_CATCH,
      REJECTED_ALL,
      2,
      true,
      [null, null],
      [el(0, 'a', 'fulfilled'), el(1, 'b', 'rejected')],
      [JOB_0, JOB_A_THEN],
    ),
    output: ['sync end', 'all rejected b failed'],
  },
  {
    title: "요소 함수 Job 자리 0: 결과가 거부된 뒤에도 values[0]에 'A'",
    explanation:
      "요소 함수는 결과 프로미스가 거부됐는지 확인하지 않습니다. 자리 0번 칸에 'A'를 넣고 남은 개수를 1 줄여 1이 됩니다. b의 요소 함수는 불리지 않으므로 개수는 0이 되지 못하고, 결과 프로미스에는 아무 일도 일어나지 않습니다.",
    line: at(4),
    state: state(
      JOB_0,
      REJECTED_ALL,
      1,
      true,
      ["'A'", null],
      [el(0, 'a', 'fulfilled', true), el(1, 'b', 'rejected')],
      [JOB_A_THEN],
    ),
    output: ['sync end', 'all rejected b failed'],
  },
  {
    title: 'a.then 반응 Job: 출력',
    explanation:
      'a.then의 콜백이 a의 값 A를 받아 출력합니다. all이 거부됐다고 해서 a에 걸린 반응이 취소되지는 않습니다.',
    line: at(9),
    state: state(
      JOB_A_THEN,
      REJECTED_ALL,
      1,
      true,
      ["'A'", null],
      [el(0, 'a', 'fulfilled', true), el(1, 'b', 'rejected')],
      [],
    ),
    output: ['sync end', 'all rejected b failed', 'a still fulfilled A'],
  },
  {
    title: '모든 Job이 끝났다',
    explanation:
      '기다리는 Job이 없습니다. 결과 프로미스는 rejected이고, 장부에는 values[0]이 채워지고 남은 개수가 1로 남았습니다. 결과 프로미스가 정해진 뒤에도 a의 요소 함수와 a.then의 반응은 그대로 실행되었습니다.',
    line: at(9),
    state: state(
      NONE,
      REJECTED_ALL,
      1,
      true,
      ["'A'", null],
      [el(0, 'a', 'fulfilled', true), el(1, 'b', 'rejected')],
      [],
    ),
    output: ['sync end', 'all rejected b failed', 'a still fulfilled A'],
  },
]

export const scenarios: Scenario<AllLedgerState>[] = [
  {
    id: 'input-order',
    label: '넣은 순서로 모으기',
    exampleId: 'input-order',
    code: inputOrderCode,
    steps: inputOrderSteps,
  },
  {
    id: 'keeps-going',
    label: '하나가 거부될 때',
    exampleId: 'keeps-going',
    code: keepsGoingCode,
    steps: keepsGoingSteps,
  },
]
