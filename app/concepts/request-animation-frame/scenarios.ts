import type { Scenario, Step } from '~/simulator/types'
import cancelCode from './examples/cancel.html?raw'
import microtaskBetweenCode from './examples/microtask-between.html?raw'
import nextFrameCode from './examples/next-frame.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 콜 스택. 아래(먼저 쌓인 것) → 위(지금 실행 중). 호스트 함수(requestAnimationFrame, console.log)의 스택 프레임은 그리지 않는다
// - callbacks: 애니메이션 프레임 콜백 맵(handle 순서). 실행이 시작된 콜백의 handle은 이미 여기에 없다(Remove 뒤 Invoke)
// - frameHandles: 이번 run이 시작할 때 얻은 handle 목록. 렌더링 갱신 중에만 있고(그 밖에서는 null), 같은 run 안에서 바뀌지 않는다
// - current: 지금 검사하거나 실행 중인 handle(frameHandles 안의 한 값). 콜백이 끝난 뒤에도 다음 handle로 넘어가기 전까지 그대로 둔다
// - microtasks: 마이크로태스크 큐. 앞이 먼저 실행된다
// - task: 지금 실행 중인 태스크('스크립트', '렌더링 갱신 (프레임 1)', '렌더링 갱신 (프레임 2)'). 태스크 사이에는 null
// - frameTime: 이번 프레임의 타임스탬프를 나타내는 기호('T1', 'T2'). 실제 ms는 쓰지 않는다. 렌더링 갱신 중에만 있다
// - checkpoint: 마이크로태스크 체크포인트 진행 중

export type RafCallback = { handle: number; name: string }

export type RafState = {
  stack: string[]
  callbacks: RafCallback[]
  frameHandles: number[] | null
  current: number | null
  microtasks: string[]
  task: string | null
  frameTime: string | null
  checkpoint: boolean
}

type RStep = Step<RafState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const cb = (handle: number, name: string): RafCallback => ({ handle, name })

const state = (
  stack: string[],
  callbacks: RafCallback[],
  frameHandles: number[] | null,
  current: number | null,
  microtasks: string[],
  task: string | null,
  frameTime: string | null,
  checkpoint: boolean,
): RafState => ({
  stack,
  callbacks,
  frameHandles,
  current,
  microtasks,
  task,
  frameTime,
  checkpoint,
})

const G = '전역 코드'
const SCRIPT = '스크립트'
const FRAME1 = '렌더링 갱신 (프레임 1)'
const FRAME2 = '렌더링 갱신 (프레임 2)'

const FRAME_MOMENT =
  '이 순간은 그림을 위해 고른 것입니다. 렌더링 기회가 실제로 언제 올지는 표준이 정하지 않으며, 보장되는 것은 그림에 나온 콜백의 실행 순서입니다. 그림은 렌더링 갱신의 다른 단계를 그리지 않고 애니메이션 프레임 콜백을 실행하는 단계만 보여 줍니다.'

const RUN_START =
  '이 태스크에서 애니메이션 프레임 콜백을 실행하는 단계(run the animation frame callbacks)가 시작되면 먼저 콜백 맵의 handle을 모은 목록을 얻습니다. 이 목록이 이번 실행에서 처리할 handle을 정하고, 이 뒤에 맵에 새로 생기는 handle은 목록에 들어가지 않습니다. 같은 실행의 콜백은 모두 같은 타임스탬프를 받습니다.'

const REMOVE_THEN_INVOKE =
  '목록의 handle이 아직 맵에 있으면 콜백을 꺼내 맵에서 그 handle을 지운 다음 콜백을 부릅니다. 그래서 콜백이 실행되는 동안 그 handle은 목록에는 있지만 맵에는 없습니다.'

const CLEANUP =
  'HTML 표준은 스크립트나 콜백을 실행한 뒤의 정리 단계(clean up after running script)에서 JavaScript 실행 컨텍스트 스택이 비었으면 마이크로태스크 체크포인트를 한다고 서술합니다.'

const SCRIPT_END =
  '스크립트 태스크가 끝납니다. 마이크로태스크 큐가 비어 있어 체크포인트가 실행할 것이 없으므로 그림에서는 따로 그리지 않습니다. 콜백 맵의 콜백은 아직 하나도 실행되지 않았습니다.'

const FRAME_END =
  '목록의 handle을 모두 처리해 이번 실행이 끝납니다. 이 그림은 렌더링 갱신의 다른 단계를 그리지 않으므로 곧바로 태스크가 끝나는 것으로 보여 줍니다.'

// --- 1. 콜백 안에서 다시 등록하면 다음 프레임 ---------------------------------------------------

const RAF1 = 'raf1 콜백'
const RAF2 = 'raf2 콜백'
const RAF3 = 'raf3 콜백'

const nextFrameSteps: RStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '그림은 스크립트 실행을 태스크 하나로 그립니다. 콜 스택에는 전역 코드가 올라가 있고, 콜백 맵은 비어 있습니다.',
    line: at(6),
    state: state([G], [], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'requestAnimationFrame 등록 (handle 1)',
    explanation:
      'requestAnimationFrame은 콜백을 부르지 않습니다. 콜백을 맵에 넣고 handle 번호를 돌려줍니다. 새 문서에서 첫 handle은 1입니다. 이 콜백은 t1이라는 매개변수로 타임스탬프를 받습니다.',
    line: range(6, 11),
    state: state([G], [cb(1, RAF1)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'requestAnimationFrame 등록 (handle 2)',
    explanation: '두 번째 콜백도 맵에 들어가고 handle 번호는 하나 늘어난 2입니다.',
    line: range(12, 14),
    state: state([G], [cb(1, RAF1), cb(2, RAF2)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation:
      '마지막 동기 코드입니다. 맵에 콜백이 둘 있지만 스크립트가 끝나지 않았으므로 하나도 실행되지 않고 스크립트 끝이 먼저 찍힙니다.',
    line: at(15),
    state: state([G], [cb(1, RAF1), cb(2, RAF2)], null, null, [], SCRIPT, null, false),
    output: ['스크립트 끝'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: SCRIPT_END,
    line: at(15),
    state: state([], [cb(1, RAF1), cb(2, RAF2)], null, null, [], null, null, false),
    output: ['스크립트 끝'],
  },
  {
    title: '렌더링 갱신 태스크 시작 (프레임 1)',
    explanation: `렌더링 기회가 오면 렌더링 갱신 태스크가 실행됩니다. 이 페이지는 이 태스크 한 번(그 안의 콜백 실행 한 번)을 프레임이라고 부릅니다. ${FRAME_MOMENT} ${RUN_START} 목록은 [1, 2]이고 이 프레임의 타임스탬프를 T1이라고 부르겠습니다.`,
    line: range(6, 14),
    state: state([], [cb(1, RAF1), cb(2, RAF2)], [1, 2], null, [], FRAME1, 'T1', false),
    output: ['스크립트 끝'],
  },
  {
    title: 'handle 1: 맵에서 지우고 콜백 호출',
    explanation: `${REMOVE_THEN_INVOKE} raf1 콜백이 T1을 t1로 받고 콜 스택에 오릅니다.`,
    line: at(6),
    state: state([RAF1], [cb(2, RAF2)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝'],
  },
  {
    title: "console.log('raf1')",
    explanation: '첫 콜백이 실행되어 raf1이 찍힙니다.',
    line: at(7),
    state: state([RAF1], [cb(2, RAF2)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: '콜백 안에서 다시 등록 (handle 3)',
    explanation:
      'raf1 콜백 안에서 부른 requestAnimationFrame도 콜백을 맵에 넣고 handle 3을 돌려줍니다. 그런데 이번 실행의 목록은 이미 [1, 2]로 정해졌으므로 handle 3은 이번 실행에서 처리되지 않습니다. 맵에는 있지만 목록에는 없습니다.',
    line: range(8, 10),
    state: state([RAF1], [cb(2, RAF2), cb(3, RAF3)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: 'raf1 콜백 끝',
    explanation: `raf1 콜백이 끝나 스택이 비었습니다. ${CLEANUP} 마이크로태스크 큐가 비어 있어 실행할 것이 없으므로 체크포인트는 따로 그리지 않습니다.`,
    line: at(11),
    state: state([], [cb(2, RAF2), cb(3, RAF3)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: 'handle 2: 맵에서 지우고 콜백 호출',
    explanation: `목록의 다음 handle입니다. ${REMOVE_THEN_INVOKE} raf2 콜백도 같은 타임스탬프 T1을 받습니다. 맵에는 이번 실행의 목록에 없는 handle 3만 남습니다.`,
    line: at(12),
    state: state([RAF2], [cb(3, RAF3)], [1, 2], 2, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: "console.log('raf2')",
    explanation: '두 번째 콜백이 같은 프레임에서 실행되어 raf2가 찍힙니다.',
    line: at(13),
    state: state([RAF2], [cb(3, RAF3)], [1, 2], 2, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1', 'raf2'],
  },
  {
    title: 'raf2 콜백 끝',
    explanation:
      'raf2 콜백이 끝나 스택이 비었습니다. 목록의 handle을 모두 처리했지만 맵에는 handle 3이 남아 있습니다.',
    line: at(14),
    state: state([], [cb(3, RAF3)], [1, 2], 2, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1', 'raf2'],
  },
  {
    title: '렌더링 갱신 태스크 끝 (프레임 1)',
    explanation: `${FRAME_END} 다시 등록한 raf3 콜백은 이 프레임에서 실행되지 않고 맵에 남아 다음 렌더링 갱신을 기다립니다.`,
    line: at(14),
    state: state([], [cb(3, RAF3)], null, null, [], null, null, false),
    output: ['스크립트 끝', 'raf1', 'raf2'],
  },
  {
    title: '렌더링 갱신 태스크 시작 (프레임 2)',
    explanation: `다음 렌더링 기회에 렌더링 갱신 태스크가 다시 실행됩니다. ${FRAME_MOMENT} 새 실행이 시작되므로 맵의 handle을 모아 목록 [3]을 얻고, 이 프레임의 타임스탬프는 T2입니다.`,
    line: range(8, 10),
    state: state([], [cb(3, RAF3)], [3], null, [], FRAME2, 'T2', false),
    output: ['스크립트 끝', 'raf1', 'raf2'],
  },
  {
    title: 'handle 3: 맵에서 지우고 콜백 호출',
    explanation: `${REMOVE_THEN_INVOKE} raf3 콜백이 T2를 t3로 받습니다.`,
    line: at(8),
    state: state([RAF3], [], [3], 3, [], FRAME2, 'T2', false),
    output: ['스크립트 끝', 'raf1', 'raf2'],
  },
  {
    title: "console.log('raf3', t3 > t1)",
    explanation:
      'raf3이 다음 프레임에서 실행되어 t3 > t1을 비교합니다. 표준이 정하는 것은 이 콜백이 다음 실행에서 실행된다는 것까지입니다. t3가 t1보다 크다는 true는 Chromium에서 관찰한 값입니다.',
    line: at(9),
    state: state([RAF3], [], [3], 3, [], FRAME2, 'T2', false),
    output: ['스크립트 끝', 'raf1', 'raf2', 'raf3 true'],
  },
  {
    title: 'raf3 콜백 끝, 렌더링 갱신 태스크 끝 (프레임 2)',
    explanation: `raf3 콜백이 끝나 스택이 비었고 맵도 비었습니다. ${FRAME_END} 이 콜백은 다시 등록하지 않았으므로 더 이어지는 프레임은 없습니다.`,
    line: at(10),
    state: state([], [], null, null, [], null, null, false),
    output: ['스크립트 끝', 'raf1', 'raf2', 'raf3 true'],
  },
]

// --- 2. 콜백 사이의 마이크로태스크 체크포인트 ---------------------------------------------------

const THEN = 'then 콜백'

const microtaskBetweenSteps: RStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있고, 콜백 맵과 마이크로태스크 큐는 비어 있습니다.',
    line: at(6),
    state: state([G], [], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'requestAnimationFrame 등록 (handle 1)',
    explanation: '콜백을 맵에 넣고 handle 1을 돌려줍니다. 콜백은 아직 실행되지 않습니다.',
    line: range(6, 11),
    state: state([G], [cb(1, RAF1)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'requestAnimationFrame 등록 (handle 2)',
    explanation: '두 번째 콜백이 handle 2로 맵에 들어갑니다.',
    line: range(12, 14),
    state: state([G], [cb(1, RAF1), cb(2, RAF2)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation: '마지막 동기 코드입니다. 콜백은 하나도 실행되지 않았습니다.',
    line: at(15),
    state: state([G], [cb(1, RAF1), cb(2, RAF2)], null, null, [], SCRIPT, null, false),
    output: ['스크립트 끝'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: SCRIPT_END,
    line: at(15),
    state: state([], [cb(1, RAF1), cb(2, RAF2)], null, null, [], null, null, false),
    output: ['스크립트 끝'],
  },
  {
    title: '렌더링 갱신 태스크 시작 (프레임 1)',
    explanation: `렌더링 기회가 오면 렌더링 갱신 태스크가 실행됩니다. ${FRAME_MOMENT} ${RUN_START} 목록은 [1, 2]입니다.`,
    line: range(6, 14),
    state: state([], [cb(1, RAF1), cb(2, RAF2)], [1, 2], null, [], FRAME1, 'T1', false),
    output: ['스크립트 끝'],
  },
  {
    title: 'handle 1: 맵에서 지우고 콜백 호출',
    explanation: REMOVE_THEN_INVOKE,
    line: at(6),
    state: state([RAF1], [cb(2, RAF2)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝'],
  },
  {
    title: "console.log('raf1')",
    explanation: '첫 콜백이 실행되어 raf1이 찍힙니다.',
    line: at(7),
    state: state([RAF1], [cb(2, RAF2)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: 'then 등록',
    explanation:
      '이미 이행된 프로미스의 then은 콜백을 부르는 Job을 만들어 호스트에 맡기고, HTML 표준에서 호스트는 이 Job을 마이크로태스크 큐에 넣습니다. 콜백은 아직 실행되지 않고, raf2 콜백도 아직 시작하지 않았습니다.',
    line: range(8, 10),
    state: state([RAF1], [cb(2, RAF2)], [1, 2], 1, [THEN], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: 'raf1 콜백 끝: 체크포인트 시작',
    explanation: `raf1 콜백이 끝나 콜 스택이 비었습니다. ${CLEANUP} 콜백 하나가 끝날 때마다 이 확인이 일어나므로, 같은 실행의 다음 콜백이 시작되기 전에 체크포인트가 먼저 일어납니다.`,
    line: at(11),
    state: state([], [cb(2, RAF2)], [1, 2], 1, [THEN], FRAME1, 'T1', true),
    output: ['스크립트 끝', 'raf1'],
  },
  {
    title: 'then 콜백 실행',
    explanation:
      '마이크로태스크 큐 맨 앞의 then 콜백이 꺼내져 실행됩니다. 맵에서 handle 2의 콜백은 아직 기다리고 있습니다.',
    line: range(8, 10),
    state: state([THEN], [cb(2, RAF2)], [1, 2], 1, [], FRAME1, 'T1', true),
    output: ['스크립트 끝', 'raf1', 'then'],
  },
  {
    title: '체크포인트 끝',
    explanation:
      '마이크로태스크 큐가 비었으므로 체크포인트가 끝납니다. 이제 이번 실행의 다음 handle로 넘어갈 수 있습니다.',
    line: at(11),
    state: state([], [cb(2, RAF2)], [1, 2], 1, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1', 'then'],
  },
  {
    title: 'handle 2: 맵에서 지우고 콜백 호출',
    explanation: `${REMOVE_THEN_INVOKE} 이 시점에 마이크로태스크 큐는 비어 있습니다. 앞 콜백이 넣은 then이 이 콜백보다 먼저 실행된 것입니다.`,
    line: at(12),
    state: state([RAF2], [], [1, 2], 2, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1', 'then'],
  },
  {
    title: "console.log('raf2')",
    explanation:
      '두 번째 콜백이 실행되어 raf2가 찍힙니다. then이 raf1과 raf2 사이에 끼어들었습니다.',
    line: at(13),
    state: state([RAF2], [], [1, 2], 2, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1', 'then', 'raf2'],
  },
  {
    title: 'raf2 콜백 끝',
    explanation: `raf2 콜백이 끝나 스택이 비었습니다. ${CLEANUP} 마이크로태스크 큐가 비어 있어 실행할 것이 없으므로 체크포인트는 따로 그리지 않습니다.`,
    line: at(14),
    state: state([], [], [1, 2], 2, [], FRAME1, 'T1', false),
    output: ['스크립트 끝', 'raf1', 'then', 'raf2'],
  },
  {
    title: '렌더링 갱신 태스크 끝 (프레임 1)',
    explanation: FRAME_END,
    line: at(14),
    state: state([], [], null, null, [], null, null, false),
    output: ['스크립트 끝', 'raf1', 'then', 'raf2'],
  },
]

// --- 3. cancelAnimationFrame ---------------------------------------------------------------------

const A = 'A 콜백'
const B = 'B 콜백'
const C = 'C 콜백'
const D = 'D 콜백'

const cancelSteps: RStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있고, 콜백 맵은 비어 있습니다.',
    line: at(6),
    state: state([G], [], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'A 등록 (handle 1)',
    explanation: 'A 콜백이 handle 1로 맵에 들어가고, 변수 a에 1이 담깁니다.',
    line: range(6, 8),
    state: state([G], [cb(1, A)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'cancelAnimationFrame(a)',
    explanation:
      'cancelAnimationFrame은 맵에서 그 handle을 지웁니다. A 콜백은 실행되기 전에 맵에서 사라졌으므로 앞으로도 실행되지 않습니다. 이미 지워진 handle을 다시 취소해도 아무 일도 일어나지 않습니다.',
    line: at(9),
    state: state([G], [], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'B 등록 (handle 2)',
    explanation:
      'B 콜백이 맵에 들어갑니다. 취소로 맵이 비었어도 handle 번호는 되돌아가지 않고 계속 늘어나므로 2입니다.',
    line: range(11, 14),
    state: state([G], [cb(2, B)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'C 등록 (handle 3)',
    explanation: 'C 콜백이 handle 3으로 맵에 들어가고, 변수 c에 3이 담깁니다.',
    line: range(15, 17),
    state: state([G], [cb(2, B), cb(3, C)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: 'D 등록 (handle 4)',
    explanation: 'D 콜백이 handle 4로 맵에 들어갑니다. 맵에는 handle 2, 3, 4가 있습니다.',
    line: range(18, 20),
    state: state([G], [cb(2, B), cb(3, C), cb(4, D)], null, null, [], SCRIPT, null, false),
    output: [],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: SCRIPT_END,
    line: at(20),
    state: state([], [cb(2, B), cb(3, C), cb(4, D)], null, null, [], null, null, false),
    output: [],
  },
  {
    title: '렌더링 갱신 태스크 시작 (프레임 1)',
    explanation: `렌더링 기회가 오면 렌더링 갱신 태스크가 실행됩니다. ${FRAME_MOMENT} ${RUN_START} 목록은 [2, 3, 4]입니다.`,
    line: range(11, 20),
    state: state([], [cb(2, B), cb(3, C), cb(4, D)], [2, 3, 4], null, [], FRAME1, 'T1', false),
    output: [],
  },
  {
    title: 'handle 2: 맵에서 지우고 콜백 호출',
    explanation: REMOVE_THEN_INVOKE,
    line: at(11),
    state: state([B], [cb(3, C), cb(4, D)], [2, 3, 4], 2, [], FRAME1, 'T1', false),
    output: [],
  },
  {
    title: "console.log('B')",
    explanation: 'B 콜백이 실행되어 B가 찍힙니다.',
    line: at(12),
    state: state([B], [cb(3, C), cb(4, D)], [2, 3, 4], 2, [], FRAME1, 'T1', false),
    output: ['B'],
  },
  {
    title: 'B 안에서 cancelAnimationFrame(c)',
    explanation:
      '실행 중인 프레임 안에서도 취소는 효력이 있습니다. 맵에서 handle 3이 지워집니다. 이번 실행의 목록은 이미 [2, 3, 4]로 정해져 있어 handle 3이 목록에는 그대로 남습니다.',
    line: at(13),
    state: state([B], [cb(4, D)], [2, 3, 4], 2, [], FRAME1, 'T1', false),
    output: ['B'],
  },
  {
    title: 'B 콜백 끝',
    explanation: `B 콜백이 끝나 스택이 비었습니다. ${CLEANUP} 마이크로태스크 큐가 비어 있어 실행할 것이 없으므로 체크포인트는 따로 그리지 않습니다.`,
    line: at(14),
    state: state([], [cb(4, D)], [2, 3, 4], 2, [], FRAME1, 'T1', false),
    output: ['B'],
  },
  {
    title: 'handle 3: 맵에 없어서 건너뜀',
    explanation:
      '목록의 다음 handle 3을 검사합니다. 표준은 목록의 handle이 아직 맵에 있을 때만 콜백을 부르라고 서술합니다. handle 3은 맵에서 이미 지워졌으므로 C 콜백은 호출되지 않고, 콜 스택은 비어 있는 채로 다음 handle로 넘어갑니다.',
    line: range(15, 17),
    state: state([], [cb(4, D)], [2, 3, 4], 3, [], FRAME1, 'T1', false),
    output: ['B'],
  },
  {
    title: 'handle 4: 맵에서 지우고 콜백 호출',
    explanation: REMOVE_THEN_INVOKE,
    line: at(18),
    state: state([D], [], [2, 3, 4], 4, [], FRAME1, 'T1', false),
    output: ['B'],
  },
  {
    title: "console.log('D')",
    explanation: 'D 콜백이 실행되어 D가 찍힙니다. A와 C는 한 번도 찍히지 않았습니다.',
    line: at(19),
    state: state([D], [], [2, 3, 4], 4, [], FRAME1, 'T1', false),
    output: ['B', 'D'],
  },
  {
    title: 'D 콜백 끝',
    explanation: 'D 콜백이 끝나 스택이 비었습니다. 목록의 handle을 모두 처리했습니다.',
    line: at(20),
    state: state([], [], [2, 3, 4], 4, [], FRAME1, 'T1', false),
    output: ['B', 'D'],
  },
  {
    title: '렌더링 갱신 태스크 끝 (프레임 1)',
    explanation: FRAME_END,
    line: at(20),
    state: state([], [], null, null, [], null, null, false),
    output: ['B', 'D'],
  },
]

export const scenarios: Scenario<RafState>[] = [
  {
    id: 'next-frame',
    label: '콜백 안에서 다시 등록',
    exampleId: 'next-frame',
    code: nextFrameCode,
    steps: nextFrameSteps,
  },
  {
    id: 'microtask-between',
    label: '콜백 사이의 마이크로태스크',
    exampleId: 'microtask-between',
    code: microtaskBetweenCode,
    steps: microtaskBetweenSteps,
  },
  {
    id: 'cancel',
    label: 'cancelAnimationFrame',
    exampleId: 'cancel',
    code: cancelCode,
    steps: cancelSteps,
  },
]
