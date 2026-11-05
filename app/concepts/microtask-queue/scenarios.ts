import type { Scenario, Step } from '~/simulator/types'
import basicCode from './examples/basic.html?raw'
import clickListenersCode from './examples/click-listeners.html?raw'
import messageListenersCode from './examples/message-listeners.html?raw'
import nestedCode from './examples/nested.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 콜 스택. 아래(먼저 쌓인 것) → 위(지금 실행 중). 호스트 함수(setTimeout, queueMicrotask, console.log)의 프레임은 그리지 않는다
// - waiting: 지연이 끝나기를 기다리는 타이머의 콜백 이름(등록 순서)
// - tasks: 태스크 큐. 앞이 먼저 꺼내진다(타이머 태스크, message 이벤트 태스크)
// - microtasks: 마이크로태스크 큐. 앞이 먼저 실행된다
// - task: 지금 실행 중인 태스크('스크립트', '타이머 콜백', 'message 이벤트'). 태스크 사이에는 null
// - checkpoint: 마이크로태스크 체크포인트 진행 중. 콜백 안에서 일어나면 그 콜백을 부른 태스크를 task에 그대로 둔다

export type MicroState = {
  stack: string[]
  waiting: string[]
  tasks: string[]
  microtasks: string[]
  task: string | null
  checkpoint: boolean
}

type MStep = Step<MicroState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const state = (
  stack: string[],
  waiting: string[],
  tasks: string[],
  microtasks: string[],
  task: string | null,
  checkpoint: boolean,
): MicroState => ({ stack, waiting, tasks, microtasks, task, checkpoint })

const QUEUE_MOMENT =
  '이 순간은 그림을 위해 고른 것입니다. 지연이 실제로 언제 끝나는지는 관찰할 수 없고, 보장되는 것은 실행 순서뿐입니다.'

const CLEANUP =
  'HTML 표준은 스크립트나 콜백을 실행한 뒤의 정리 단계(clean up after running script)에서 JavaScript 실행 컨텍스트 스택이 비었으면 마이크로태스크 체크포인트를 한다고 서술합니다.'

const AFTER_TASK =
  '태스크의 단계가 끝난 뒤 처리 모델이 체크포인트를 한 번 더 하지만, 이미 큐가 비어 있어 실행할 마이크로태스크가 없으므로 그림에서는 따로 그리지 않습니다.'

const G = '전역 코드'

// --- 1. 동기 코드, 마이크로태스크, 타이머 ------------------------------------------------------

const THEN1 = 'then 1 콜백'
const QM = 'queueMicrotask 콜백'
const THEN2 = 'then 2 콜백'
const TIMER = '타이머 콜백'

const basicSteps: MStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트 실행도 태스크 하나 안에서 일어납니다. 이 태스크가 실행되는 동안 콜 스택에는 전역 코드가 올라가 있고, 태스크 큐와 마이크로태스크 큐는 비어 있습니다.',
    line: at(6),
    state: state([G], [], [], [], '스크립트', false),
    output: [],
  },
  {
    title: "console.log('스크립트 시작')",
    explanation: '동기 코드는 위에서부터 차례로 실행되므로 첫 줄의 출력이 먼저 나옵니다.',
    line: at(6),
    state: state([G], [], [], [], '스크립트', false),
    output: ['스크립트 시작'],
  },
  {
    title: '타이머 등록 (0ms)',
    explanation:
      'setTimeout은 콜백을 지금 부르지 않고 대기 중인 타이머로 등록합니다. 콜백은 아직 어느 큐에도 들어가지 않았습니다.',
    line: range(7, 9),
    state: state([G], [TIMER], [], [], '스크립트', false),
    output: ['스크립트 시작'],
  },
  {
    title: 'then 1 등록',
    explanation:
      'then은 콜백을 그 자리에서 부르지 않습니다. Promise.resolve()가 만든 프로미스는 이미 이행된 상태이므로, then은 콜백을 부르는 Job을 만들어 바로 호스트에 맡깁니다(HostEnqueuePromiseJob). HTML 표준에서 호스트는 이 Job을 마이크로태스크 큐에 넣습니다. 그림에서는 그 Job을 그 콜백 이름으로 표시합니다.',
    line: range(10, 12),
    state: state([G], [TIMER], [], [THEN1], '스크립트', false),
    output: ['스크립트 시작'],
  },
  {
    title: 'queueMicrotask 등록',
    explanation:
      'queueMicrotask는 콜백을 마이크로태스크로 큐에 넣습니다. 프로미스 Job도 같은 마이크로태스크 큐에 들어가므로, 두 종류는 넣은 순서대로 한 줄로 섭니다.',
    line: range(13, 15),
    state: state([G], [TIMER], [], [THEN1, QM], '스크립트', false),
    output: ['스크립트 시작'],
  },
  {
    title: 'then 2 등록',
    explanation: '두 번째 then의 Job도 마이크로태스크 큐의 맨 뒤에 붙습니다.',
    line: range(16, 18),
    state: state([G], [TIMER], [], [THEN1, QM, THEN2], '스크립트', false),
    output: ['스크립트 시작'],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation:
      '마지막 동기 코드입니다. 마이크로태스크 큐에 콜백 세 개가 기다리고 있지만 전역 코드가 아직 끝나지 않았으므로 하나도 실행되지 않습니다.',
    line: at(19),
    state: state([G], [TIMER], [], [THEN1, QM, THEN2], '스크립트', false),
    output: ['스크립트 시작', '스크립트 끝'],
  },
  {
    title: '전역 코드 끝: 체크포인트 시작',
    explanation: `전역 코드가 끝나 콜 스택이 비었습니다. ${CLEANUP} 체크포인트는 마이크로태스크 큐가 빌 때까지 맨 앞의 마이크로태스크를 하나씩 꺼내 실행합니다. 그림은 이 체크포인트를 스크립트 태스크 안에 그립니다.`,
    line: at(19),
    state: state([], [TIMER], [], [THEN1, QM, THEN2], '스크립트', true),
    output: ['스크립트 시작', '스크립트 끝'],
  },
  {
    title: 'then 1 콜백 실행',
    explanation:
      '큐 맨 앞의 then 1 콜백이 꺼내져 콜 스택에 오릅니다. 큐에 남은 두 콜백은 기다립니다.',
    line: range(10, 12),
    state: state([THEN1], [TIMER], [], [QM, THEN2], '스크립트', true),
    output: ['스크립트 시작', '스크립트 끝', 'then 1'],
  },
  {
    title: 'queueMicrotask 콜백 실행',
    explanation:
      '그다음은 queueMicrotask 콜백입니다. 프로미스 Job이든 queueMicrotask든 큐에 넣은 순서대로 실행됩니다.',
    line: range(13, 15),
    state: state([QM], [TIMER], [], [THEN2], '스크립트', true),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask'],
  },
  {
    title: 'then 2 콜백 실행',
    explanation: '마지막 마이크로태스크입니다. 꺼내고 나면 마이크로태스크 큐가 비게 됩니다.',
    line: range(16, 18),
    state: state([THEN2], [TIMER], [], [], '스크립트', true),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask', 'then 2'],
  },
  {
    title: '체크포인트 끝',
    explanation:
      '마이크로태스크 큐가 비었으므로 체크포인트가 끝납니다. 이 동안 대기 중인 타이머는 건드려지지 않았습니다.',
    line: at(18),
    state: state([], [TIMER], [], [], '스크립트', false),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask', 'then 2'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: `스크립트 태스크가 끝납니다. ${AFTER_TASK} 이제야 이벤트 루프가 다음 태스크를 고를 수 있습니다.`,
    line: at(20),
    state: state([], [TIMER], [], [], null, false),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask', 'then 2'],
  },
  {
    title: '지연이 끝난 타이머가 태스크 큐로',
    explanation: `0ms 타이머의 콜백이 태스크 큐에 들어갑니다. ${QUEUE_MOMENT}`,
    line: range(7, 9),
    state: state([], [], [TIMER], [], null, false),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask', 'then 2'],
  },
  {
    title: '타이머 콜백 태스크 실행',
    explanation:
      '이벤트 루프가 태스크 큐의 타이머 콜백을 꺼내 실행합니다. 타이머를 먼저 등록했는데도 마이크로태스크가 앞선 것은, 마이크로태스크 체크포인트가 스크립트가 끝나는 자리에서 일어나 이 태스크를 고르기 전에 큐를 비웠기 때문입니다.',
    line: range(7, 9),
    state: state([TIMER], [], [], [], TIMER, false),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask', 'then 2', '타이머 0ms'],
  },
  {
    title: '타이머 콜백 끝',
    explanation:
      '모든 일이 끝났습니다. 콜 스택, 대기 중인 타이머, 태스크 큐, 마이크로태스크 큐가 모두 비었습니다.',
    line: at(9),
    state: state([], [], [], [], null, false),
    output: ['스크립트 시작', '스크립트 끝', 'then 1', 'queueMicrotask', 'then 2', '타이머 0ms'],
  },
]

// --- 2. 체크포인트는 큐가 빌 때까지 ------------------------------------------------------------

const M1 = 'm1 콜백'
const M2 = 'm2 콜백'
const M3 = 'm3 콜백'

const nestedSteps: MStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있습니다.',
    line: at(6),
    state: state([G], [], [], [], '스크립트', false),
    output: [],
  },
  {
    title: '타이머 등록 (0ms)',
    explanation: '타이머 콜백을 대기 중인 타이머로 등록합니다.',
    line: range(6, 8),
    state: state([G], [TIMER], [], [], '스크립트', false),
    output: [],
  },
  {
    title: 'm1 등록',
    explanation:
      'queueMicrotask가 m1 콜백을 마이크로태스크 큐에 넣습니다. m1 콜백 안의 코드는 아직 실행되지 않았으므로 m2, m3도 아직 없습니다.',
    line: range(9, 17),
    state: state([G], [TIMER], [], [M1], '스크립트', false),
    output: [],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation: '동기 코드의 마지막 줄입니다. 마이크로태스크는 아직 실행되지 않습니다.',
    line: at(18),
    state: state([G], [TIMER], [], [M1], '스크립트', false),
    output: ['스크립트 끝'],
  },
  {
    title: '전역 코드 끝: 체크포인트 시작',
    explanation: `전역 코드가 끝나 콜 스택이 비었습니다. ${CLEANUP}`,
    line: at(18),
    state: state([], [TIMER], [], [M1], '스크립트', true),
    output: ['스크립트 끝'],
  },
  {
    title: 'm1 콜백 실행',
    explanation:
      'm1 콜백이 꺼내져 실행됩니다. 큐는 잠시 비었지만 m1 콜백이 아직 끝나지 않았습니다.',
    line: range(9, 10),
    state: state([M1], [TIMER], [], [], '스크립트', true),
    output: ['스크립트 끝', 'm1'],
  },
  {
    title: 'm1 안에서 m2 등록',
    explanation:
      'm1 콜백 안에서 부른 queueMicrotask는 m2 콜백을 마이크로태스크 큐의 맨 뒤에 넣습니다. 체크포인트는 큐가 빌 때까지 계속되므로 m2도 같은 체크포인트에서 실행됩니다.',
    line: range(11, 16),
    state: state([M1], [TIMER], [], [M2], '스크립트', true),
    output: ['스크립트 끝', 'm1'],
  },
  {
    title: 'm2 콜백 실행',
    explanation:
      'm1 콜백이 끝나고 큐 맨 앞의 m2 콜백이 실행됩니다. 타이머 콜백은 아직 대기 중입니다.',
    line: range(11, 12),
    state: state([M2], [TIMER], [], [], '스크립트', true),
    output: ['스크립트 끝', 'm1', 'm2'],
  },
  {
    title: 'm2 안에서 m3 등록',
    explanation: 'm2 콜백도 m3 콜백을 큐에 넣습니다. 같은 체크포인트가 계속됩니다.',
    line: range(13, 15),
    state: state([M2], [TIMER], [], [M3], '스크립트', true),
    output: ['스크립트 끝', 'm1', 'm2'],
  },
  {
    title: 'm3 콜백 실행',
    explanation: 'm3 콜백이 실행됩니다. 더 이상 새 마이크로태스크를 넣지 않습니다.',
    line: range(13, 14),
    state: state([M3], [TIMER], [], [], '스크립트', true),
    output: ['스크립트 끝', 'm1', 'm2', 'm3'],
  },
  {
    title: '체크포인트 끝',
    explanation:
      '마이크로태스크 큐가 비었으므로 체크포인트가 끝납니다. 마이크로태스크가 계속 새 마이크로태스크를 넣으면 큐가 비지 않아 체크포인트도 끝나지 않고, 그동안 타이머 콜백은 실행되지 못합니다.',
    line: at(15),
    state: state([], [TIMER], [], [], '스크립트', false),
    output: ['스크립트 끝', 'm1', 'm2', 'm3'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: `스크립트 태스크가 끝납니다. ${AFTER_TASK}`,
    line: at(19),
    state: state([], [TIMER], [], [], null, false),
    output: ['스크립트 끝', 'm1', 'm2', 'm3'],
  },
  {
    title: '지연이 끝난 타이머가 태스크 큐로',
    explanation: `0ms 타이머의 콜백이 태스크 큐에 들어갑니다. ${QUEUE_MOMENT}`,
    line: range(6, 8),
    state: state([], [], [TIMER], [], null, false),
    output: ['스크립트 끝', 'm1', 'm2', 'm3'],
  },
  {
    title: '타이머 콜백 태스크 실행',
    explanation:
      '마이크로태스크 큐가 빈 뒤에야 이벤트 루프가 타이머 콜백 태스크를 꺼내 실행합니다.',
    line: range(6, 8),
    state: state([TIMER], [], [], [], TIMER, false),
    output: ['스크립트 끝', 'm1', 'm2', 'm3', '타이머 0ms'],
  },
  {
    title: '타이머 콜백 끝',
    explanation:
      '모든 일이 끝났습니다. 콜 스택, 대기 중인 타이머, 태스크 큐, 마이크로태스크 큐가 모두 비었습니다.',
    line: at(8),
    state: state([], [], [], [], null, false),
    output: ['스크립트 끝', 'm1', 'm2', 'm3', '타이머 0ms'],
  },
]

// --- 3. click()의 리스너 -----------------------------------------------------------------------

const L1 = '리스너 1'
const L2 = '리스너 2'
const C1 = '마이크로태스크 1 콜백'
const C2 = '마이크로태스크 2 콜백'

const clickSteps: MStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있습니다.',
    line: at(7),
    state: state([G], [], [], [], '스크립트', false),
    output: [],
  },
  {
    title: '리스너 두 개 등록',
    explanation:
      'addEventListener는 click 리스너 두 개를 버튼에 등록할 뿐, 아직 아무것도 실행하지 않습니다.',
    line: range(8, 19),
    state: state([G], [], [], [], '스크립트', false),
    output: [],
  },
  {
    title: 'save.click(): 리스너 1 실행',
    explanation:
      'save.click()은 스크립트 실행 도중에 click 이벤트를 그 자리에서 디스패치하므로 리스너가 바로 불립니다. 리스너 1이 전역 코드 위에 쌓이므로 콜 스택에는 전역 코드가 그대로 남아 있습니다.',
    line: range(8, 9),
    state: state([G, L1], [], [], [], '스크립트', false),
    output: ['리스너 1'],
  },
  {
    title: '리스너 1이 마이크로태스크 1 등록',
    explanation: '리스너 1 안의 queueMicrotask가 마이크로태스크 1 콜백을 큐에 넣습니다.',
    line: range(10, 12),
    state: state([G, L1], [], [], [C1], '스크립트', false),
    output: ['리스너 1'],
  },
  {
    title: '리스너 1 끝: 체크포인트 없음',
    explanation: `리스너 1이 끝났지만 콜 스택에는 전역 코드가 남아 있습니다. ${CLEANUP} 스택이 비지 않았으므로 체크포인트는 일어나지 않고, 마이크로태스크 1 콜백은 큐에서 기다립니다.`,
    line: at(13),
    state: state([G], [], [], [C1], '스크립트', false),
    output: ['리스너 1'],
  },
  {
    title: '리스너 2 실행',
    explanation: '같은 click() 호출이 두 번째 리스너를 부릅니다. 다시 전역 코드 위에 쌓입니다.',
    line: range(14, 15),
    state: state([G, L2], [], [], [C1], '스크립트', false),
    output: ['리스너 1', '리스너 2'],
  },
  {
    title: '리스너 2가 마이크로태스크 2 등록',
    explanation: '마이크로태스크 2 콜백이 마이크로태스크 큐의 맨 뒤에 붙습니다.',
    line: range(16, 18),
    state: state([G, L2], [], [], [C1, C2], '스크립트', false),
    output: ['리스너 1', '리스너 2'],
  },
  {
    title: '리스너 2 끝: 체크포인트 없음',
    explanation:
      '리스너 2도 끝났지만 전역 코드가 남아 있어 체크포인트는 일어나지 않습니다. save.click()이 반환되고 다음 줄로 넘어갑니다.',
    line: at(19),
    state: state([G], [], [], [C1, C2], '스크립트', false),
    output: ['리스너 1', '리스너 2'],
  },
  {
    title: "console.log('click() 뒤')",
    explanation:
      'click() 다음 줄이 실행됩니다. 마이크로태스크 콜백 두 개가 큐에 있지만 아직 하나도 실행되지 않았으므로 이 출력이 먼저 나옵니다.',
    line: at(21),
    state: state([G], [], [], [C1, C2], '스크립트', false),
    output: ['리스너 1', '리스너 2', 'click() 뒤'],
  },
  {
    title: '전역 코드 끝: 체크포인트 시작',
    explanation: `전역 코드가 끝나 콜 스택이 비었습니다. ${CLEANUP} 이제야 체크포인트가 시작됩니다.`,
    line: at(21),
    state: state([], [], [], [C1, C2], '스크립트', true),
    output: ['리스너 1', '리스너 2', 'click() 뒤'],
  },
  {
    title: '마이크로태스크 1 콜백 실행',
    explanation: '큐 맨 앞의 마이크로태스크 1 콜백이 실행됩니다.',
    line: range(10, 12),
    state: state([C1], [], [], [C2], '스크립트', true),
    output: ['리스너 1', '리스너 2', 'click() 뒤', '마이크로태스크 1'],
  },
  {
    title: '마이크로태스크 2 콜백 실행',
    explanation: '이어서 마이크로태스크 2 콜백이 실행되고 큐가 빕니다.',
    line: range(16, 18),
    state: state([C2], [], [], [], '스크립트', true),
    output: ['리스너 1', '리스너 2', 'click() 뒤', '마이크로태스크 1', '마이크로태스크 2'],
  },
  {
    title: '체크포인트 끝',
    explanation: '마이크로태스크 큐가 비었으므로 체크포인트가 끝납니다.',
    line: at(18),
    state: state([], [], [], [], '스크립트', false),
    output: ['리스너 1', '리스너 2', 'click() 뒤', '마이크로태스크 1', '마이크로태스크 2'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: `스크립트 태스크가 끝납니다. ${AFTER_TASK} 콜 스택, 대기 중인 타이머, 태스크 큐, 마이크로태스크 큐가 모두 비었습니다.`,
    line: at(22),
    state: state([], [], [], [], null, false),
    output: ['리스너 1', '리스너 2', 'click() 뒤', '마이크로태스크 1', '마이크로태스크 2'],
  },
]

// --- 4. message 이벤트의 리스너 ----------------------------------------------------------------

const MSG = 'message 이벤트'

const messageSteps: MStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있습니다.',
    line: at(6),
    state: state([G], [], [], [], '스크립트', false),
    output: [],
  },
  {
    title: '리스너 두 개 등록',
    explanation:
      'addEventListener는 message 리스너 두 개를 window에 등록할 뿐, 아직 아무것도 실행하지 않습니다.',
    line: range(6, 17),
    state: state([G], [], [], [], '스크립트', false),
    output: [],
  },
  {
    title: 'postMessage 호출',
    explanation:
      'postMessage는 리스너를 지금 부르지 않습니다. 표준에 따르면 posted message 태스크 소스의 태스크를 큐에 넣고, 브라우저가 나중에 그 태스크에서 message 이벤트를 디스패치합니다. 그래서 대기 칸을 거치지 않고 태스크 큐에 바로 들어갑니다.',
    line: at(18),
    state: state([G], [], [MSG], [], '스크립트', false),
    output: [],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation: '동기 코드의 마지막 줄입니다. message 이벤트 태스크는 큐에서 기다립니다.',
    line: at(19),
    state: state([G], [], [MSG], [], '스크립트', false),
    output: ['스크립트 끝'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation:
      '전역 코드가 끝나 콜 스택이 비었습니다. 이때 마이크로태스크 큐는 비어 있어서 체크포인트가 있어도 실행할 마이크로태스크가 없으므로 그림에서는 그리지 않습니다. 스크립트 태스크가 끝납니다.',
    line: at(20),
    state: state([], [], [MSG], [], null, false),
    output: ['스크립트 끝'],
  },
  {
    title: 'message 이벤트 태스크: 리스너 1 실행',
    explanation:
      '이벤트 루프가 태스크 큐에서 message 이벤트 태스크를 꺼냅니다. 이 태스크가 message 이벤트를 디스패치해 리스너를 부르므로, 콜 스택에는 스크립트가 남아 있지 않고 맨 아래가 리스너 1입니다.',
    line: range(6, 7),
    state: state([L1], [], [], [], MSG, false),
    output: ['스크립트 끝', '리스너 1'],
  },
  {
    title: '리스너 1이 마이크로태스크 1 등록',
    explanation: '리스너 1 안의 queueMicrotask가 마이크로태스크 1 콜백을 큐에 넣습니다.',
    line: range(8, 10),
    state: state([L1], [], [], [C1], MSG, false),
    output: ['스크립트 끝', '리스너 1'],
  },
  {
    title: '리스너 1 끝: 체크포인트 시작',
    explanation: `리스너 1이 끝나 콜 스택이 비었습니다. 아래에 깔린 전역 코드가 없습니다. ${CLEANUP} 이 체크포인트는 message 이벤트 태스크 안에서 일어납니다.`,
    line: at(11),
    state: state([], [], [], [C1], MSG, true),
    output: ['스크립트 끝', '리스너 1'],
  },
  {
    title: '마이크로태스크 1 콜백 실행',
    explanation: '마이크로태스크 1 콜백이 실행됩니다. 리스너 2는 아직 호출되지 않았습니다.',
    line: range(8, 10),
    state: state([C1], [], [], [], MSG, true),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1'],
  },
  {
    title: '체크포인트 끝',
    explanation:
      '마이크로태스크 큐가 비었으므로 체크포인트가 끝납니다. 같은 message 이벤트의 나머지 리스너는 아직 남아 있습니다.',
    line: at(10),
    state: state([], [], [], [], MSG, false),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1'],
  },
  {
    title: '리스너 2 실행',
    explanation:
      '브라우저가 같은 이벤트의 다음 리스너를 부릅니다. 다시 리스너 2가 스택의 맨 아래입니다.',
    line: range(12, 13),
    state: state([L2], [], [], [], MSG, false),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1', '리스너 2'],
  },
  {
    title: '리스너 2가 마이크로태스크 2 등록',
    explanation: '마이크로태스크 2 콜백이 마이크로태스크 큐에 들어갑니다.',
    line: range(14, 16),
    state: state([L2], [], [], [C2], MSG, false),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1', '리스너 2'],
  },
  {
    title: '리스너 2 끝: 체크포인트 시작',
    explanation: `리스너 2가 끝나 콜 스택이 비었습니다. ${CLEANUP} 다시 체크포인트가 시작됩니다.`,
    line: at(17),
    state: state([], [], [], [C2], MSG, true),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1', '리스너 2'],
  },
  {
    title: '마이크로태스크 2 콜백 실행',
    explanation: '마이크로태스크 2 콜백이 실행되고 큐가 빕니다.',
    line: range(14, 16),
    state: state([C2], [], [], [], MSG, true),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1', '리스너 2', '마이크로태스크 2'],
  },
  {
    title: '체크포인트 끝',
    explanation: '마이크로태스크 큐가 비었으므로 체크포인트가 끝납니다.',
    line: at(16),
    state: state([], [], [], [], MSG, false),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1', '리스너 2', '마이크로태스크 2'],
  },
  {
    title: 'message 이벤트 태스크 끝',
    explanation: `message 이벤트 태스크가 끝납니다. ${AFTER_TASK} 콜 스택, 대기 중인 타이머, 태스크 큐, 마이크로태스크 큐가 모두 비었습니다.`,
    line: at(17),
    state: state([], [], [], [], null, false),
    output: ['스크립트 끝', '리스너 1', '마이크로태스크 1', '리스너 2', '마이크로태스크 2'],
  },
]

export const scenarios: Scenario<MicroState>[] = [
  {
    id: 'basic',
    label: '동기 코드, 마이크로태스크, 타이머',
    exampleId: 'basic',
    code: basicCode,
    steps: basicSteps,
  },
  {
    id: 'nested',
    label: '체크포인트는 큐가 빌 때까지',
    exampleId: 'nested',
    code: nestedCode,
    steps: nestedSteps,
  },
  {
    id: 'click',
    label: 'click()의 리스너',
    exampleId: 'click-listeners',
    code: clickListenersCode,
    steps: clickSteps,
  },
  {
    id: 'message',
    label: 'message 이벤트의 리스너',
    exampleId: 'message-listeners',
    code: messageListenersCode,
    steps: messageSteps,
  },
]
