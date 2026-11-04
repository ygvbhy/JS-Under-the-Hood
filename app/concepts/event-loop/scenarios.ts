import type { Scenario, Step } from '~/simulator/types'
import clickSyncCode from './examples/click-sync.html?raw'
import nestedCode from './examples/nested.html?raw'
import syncAndTimersCode from './examples/sync-and-timers.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 콜 스택. 아래(먼저 쌓인 것) → 위(지금 실행 중). 표시용 이름: '전역 코드', 'a 콜백', 'click 리스너' 등
//   호스트 함수(setTimeout, console.log)의 프레임은 그리지 않는다
// - waiting: 지연이 끝나기를 기다리는 타이머의 콜백 이름(등록 순서)
// - queue: 타이머 태스크 큐. 앞이 먼저 꺼내진다
// - task: 지금 실행 중인 태스크('스크립트' 또는 콜백 이름). 태스크 사이에는 null
//   '스크립트' 태스크의 첫 프레임은 '전역 코드', 콜백 태스크의 첫 프레임은 콜백 이름이다

export type LoopState = {
  stack: string[]
  waiting: string[]
  queue: string[]
  task: string | null
}

type LStep = Step<LoopState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const state = (
  stack: string[],
  waiting: string[],
  queue: string[],
  task: string | null,
): LoopState => ({ stack, waiting, queue, task })

const QUEUE_MOMENT =
  '이 순간은 그림을 위해 고른 것입니다. 지연이 실제로 언제 끝나는지는 관찰할 수 없고, 보장되는 것은 실행 순서뿐입니다.'

// --- 1. 동기 코드와 타이머 ---------------------------------------------------------------------

const syncSteps: LStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트 실행도 태스크 하나 안에서 일어납니다. 이 태스크가 실행되는 동안 콜 스택에는 전역 코드가 올라가 있습니다.',
    line: at(8),
    state: state(['전역 코드'], [], [], '스크립트'),
    output: [],
  },
  {
    title: "console.log('스크립트 시작')",
    explanation: '동기 코드는 위에서부터 차례로 실행되므로 첫 줄의 출력이 먼저 나옵니다.',
    line: at(8),
    state: state(['전역 코드'], [], [], '스크립트'),
    output: ['스크립트 시작'],
  },
  {
    title: 'a 타이머 등록 (0ms)',
    explanation:
      'setTimeout은 콜백을 지금 부르지 않고 대기 중인 타이머로 등록합니다. 등록만 하고 다음 줄로 넘어갑니다.',
    line: range(9, 11),
    state: state(['전역 코드'], ['a 콜백'], [], '스크립트'),
    output: ['스크립트 시작'],
  },
  {
    title: 'b 타이머 등록 (10ms)',
    explanation: '두 번째 타이머도 등록만 합니다. 지금 실행 중인 코드는 계속 전역 코드입니다.',
    line: range(12, 14),
    state: state(['전역 코드'], ['a 콜백', 'b 콜백'], [], '스크립트'),
    output: ['스크립트 시작'],
  },
  {
    title: 'while로 50ms 동안 붙잡기',
    explanation:
      '이 반복문은 50ms가 지날 때까지 끝나지 않습니다. 스크립트 태스크가 끝나지 않으니 이벤트 루프는 다음 태스크를 고르러 가지 못합니다.',
    line: range(15, 16),
    state: state(['전역 코드'], ['a 콜백', 'b 콜백'], [], '스크립트'),
    output: ['스크립트 시작'],
  },
  {
    title: '지연이 끝난 타이머가 태스크 큐로',
    explanation: `붙잡혀 있는 동안 a(0ms)와 b(10ms)의 지연이 끝나 콜백이 태스크 큐에 들어갑니다. 먼저 등록했고 지연이 같거나 짧은 a가 앞에 섭니다. ${QUEUE_MOMENT} 전역 코드는 아직 끝나지 않았으므로 큐의 콜백은 실행되지 못합니다.`,
    line: at(16),
    state: state(['전역 코드'], [], ['a 콜백', 'b 콜백'], '스크립트'),
    output: ['스크립트 시작'],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation:
      '반복문이 끝나고 마지막 줄이 실행됩니다. 큐에 콜백이 기다리고 있어도 동기 코드가 먼저 끝납니다.',
    line: at(17),
    state: state(['전역 코드'], [], ['a 콜백', 'b 콜백'], '스크립트'),
    output: ['스크립트 시작', '스크립트 끝'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation:
      '전역 코드가 끝나 콜 스택이 비고 스크립트 태스크가 끝납니다. 이제야 이벤트 루프가 다음 태스크를 고를 수 있습니다.',
    line: at(17),
    state: state([], [], ['a 콜백', 'b 콜백'], null),
    output: ['스크립트 시작', '스크립트 끝'],
  },
  {
    title: 'a 콜백 태스크 실행',
    explanation:
      '이벤트 루프가 큐 맨 앞의 a 콜백 태스크를 꺼내 실행합니다. a 콜백이 콜 스택에 오르고, b 콜백은 큐에서 계속 기다립니다.',
    line: at(10),
    state: state(['a 콜백'], [], ['b 콜백'], 'a 콜백'),
    output: ['스크립트 시작', '스크립트 끝', 'a 0ms'],
  },
  {
    title: 'a 콜백 끝',
    explanation: 'a 콜백이 끝나 콜 스택이 비고 태스크도 끝납니다.',
    line: at(11),
    state: state([], [], ['b 콜백'], null),
    output: ['스크립트 시작', '스크립트 끝', 'a 0ms'],
  },
  {
    title: 'b 콜백 태스크 실행',
    explanation: '큐에 남은 b 콜백이 꺼내져 실행됩니다. 큐는 비게 됩니다.',
    line: at(13),
    state: state(['b 콜백'], [], [], 'b 콜백'),
    output: ['스크립트 시작', '스크립트 끝', 'a 0ms', 'b 10ms'],
  },
  {
    title: 'b 콜백 끝',
    explanation:
      '모든 태스크가 끝났습니다. 콜 스택, 대기 중인 타이머, 태스크 큐가 모두 비었습니다.',
    line: at(14),
    state: state([], [], [], null),
    output: ['스크립트 시작', '스크립트 끝', 'a 0ms', 'b 10ms'],
  },
]

// --- 2. 콜백 안에서 예약 -----------------------------------------------------------------------

const nestedSteps: LStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있습니다.',
    line: at(8),
    state: state(['전역 코드'], [], [], '스크립트'),
    output: [],
  },
  {
    title: 'a 타이머 등록 (0ms)',
    explanation:
      'a 콜백을 등록합니다. 콜백 안의 코드는 아직 실행되지 않으므로 그 안의 setTimeout도 아직 불리지 않았습니다.',
    line: range(8, 14),
    state: state(['전역 코드'], ['a 콜백'], [], '스크립트'),
    output: [],
  },
  {
    title: 'b 타이머 등록 (0ms)',
    explanation: 'b 콜백도 a보다 나중에 등록됩니다. 둘 다 지연이 0ms입니다.',
    line: range(15, 17),
    state: state(['전역 코드'], ['a 콜백', 'b 콜백'], [], '스크립트'),
    output: [],
  },
  {
    title: '지연이 끝난 타이머가 태스크 큐로',
    explanation: `0ms 타이머는 지연이 곧 끝나 콜백이 태스크 큐에 들어갑니다. 먼저 등록한 a가 앞에 섭니다. ${QUEUE_MOMENT}`,
    line: at(17),
    state: state(['전역 코드'], [], ['a 콜백', 'b 콜백'], '스크립트'),
    output: [],
  },
  {
    title: "console.log('스크립트 끝')",
    explanation: '전역 코드의 마지막 줄입니다. 큐에 콜백이 있어도 동기 코드가 먼저 끝납니다.',
    line: at(18),
    state: state(['전역 코드'], [], ['a 콜백', 'b 콜백'], '스크립트'),
    output: ['스크립트 끝'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation:
      '콜 스택이 비고 스크립트 태스크가 끝납니다. 이벤트 루프가 큐에서 다음 태스크를 고릅니다.',
    line: at(18),
    state: state([], [], ['a 콜백', 'b 콜백'], null),
    output: ['스크립트 끝'],
  },
  {
    title: 'a 콜백 태스크 실행',
    explanation: '큐 맨 앞의 a 콜백이 꺼내져 실행됩니다. 큐에는 b 콜백이 남습니다.',
    line: at(9),
    state: state(['a 콜백'], [], ['b 콜백'], 'a 콜백'),
    output: ['스크립트 끝', 'a 시작'],
  },
  {
    title: 'a 안에서 c 타이머 등록 (0ms)',
    explanation:
      '실행 중인 a 콜백이 새 타이머 c를 등록합니다. c는 대기 중인 타이머가 되고, b 콜백은 이미 큐에서 기다리고 있습니다.',
    line: range(10, 12),
    state: state(['a 콜백'], ['c 콜백'], ['b 콜백'], 'a 콜백'),
    output: ['스크립트 끝', 'a 시작'],
  },
  {
    title: "console.log('a 끝')",
    explanation:
      'c를 등록한 뒤에도 a 콜백은 끝까지 실행됩니다. c 콜백은 이 코드 안에서 실행되지 않습니다.',
    line: at(13),
    state: state(['a 콜백'], ['c 콜백'], ['b 콜백'], 'a 콜백'),
    output: ['스크립트 끝', 'a 시작', 'a 끝'],
  },
  {
    title: 'c의 지연이 끝나 b 뒤로',
    explanation: `c의 지연도 0ms이므로 콜백이 태스크 큐에 들어가는데, 이미 큐에 있던 b 뒤에 섭니다. c를 b보다 나중에 등록했고 지연이 같기 때문입니다. ${QUEUE_MOMENT}`,
    line: at(14),
    state: state(['a 콜백'], [], ['b 콜백', 'c 콜백'], 'a 콜백'),
    output: ['스크립트 끝', 'a 시작', 'a 끝'],
  },
  {
    title: 'a 콜백 끝',
    explanation: 'a 콜백이 끝나 콜 스택이 비고 a 태스크가 끝납니다.',
    line: at(14),
    state: state([], [], ['b 콜백', 'c 콜백'], null),
    output: ['스크립트 끝', 'a 시작', 'a 끝'],
  },
  {
    title: 'b 콜백 태스크 실행',
    explanation: '큐 맨 앞의 b 콜백이 꺼내져 실행됩니다. c 콜백은 b 뒤에서 기다립니다.',
    line: at(16),
    state: state(['b 콜백'], [], ['c 콜백'], 'b 콜백'),
    output: ['스크립트 끝', 'a 시작', 'a 끝', 'b'],
  },
  {
    title: 'b 콜백 끝',
    explanation: 'b 콜백이 끝나 태스크가 끝납니다.',
    line: at(17),
    state: state([], [], ['c 콜백'], null),
    output: ['스크립트 끝', 'a 시작', 'a 끝', 'b'],
  },
  {
    title: 'c 콜백 태스크 실행',
    explanation: '마지막으로 c 콜백이 꺼내져 실행됩니다. 큐가 비게 됩니다.',
    line: at(11),
    state: state(['c 콜백'], [], [], 'c 콜백'),
    output: ['스크립트 끝', 'a 시작', 'a 끝', 'b', 'c'],
  },
  {
    title: 'c 콜백 끝',
    explanation:
      '모든 태스크가 끝났습니다. 콜 스택, 대기 중인 타이머, 태스크 큐가 모두 비었습니다.',
    line: at(12),
    state: state([], [], [], null),
    output: ['스크립트 끝', 'a 시작', 'a 끝', 'b', 'c'],
  },
]

// --- 3. click()은 그 자리에서 ------------------------------------------------------------------

const clickSteps: LStep[] = [
  {
    title: '스크립트 태스크 시작',
    explanation:
      '스크립트가 태스크 하나로 실행되기 시작합니다. 콜 스택에는 전역 코드가 올라가 있습니다.',
    line: at(9),
    state: state(['전역 코드'], [], [], '스크립트'),
    output: [],
  },
  {
    title: 'click 리스너 등록',
    explanation:
      'addEventListener는 리스너를 등록할 뿐 실행하지 않습니다. 이 그림에서는 리스너가 어디 있는지 따로 그리지 않고, 실행될 때 콜 스택에 나타납니다.',
    line: range(10, 12),
    state: state(['전역 코드'], [], [], '스크립트'),
    output: [],
  },
  {
    title: '타이머 등록 (0ms)',
    explanation: '0ms 타이머를 등록하면 콜백이 대기 중인 타이머가 됩니다.',
    line: range(13, 15),
    state: state(['전역 코드'], ['타이머 콜백'], [], '스크립트'),
    output: [],
  },
  {
    title: "console.log('click() 전')",
    explanation: '아직 click()을 부르기 전이므로 이 줄이 먼저 출력됩니다.',
    line: at(16),
    state: state(['전역 코드'], ['타이머 콜백'], [], '스크립트'),
    output: ['click() 전'],
  },
  {
    title: 'save.click() 호출',
    explanation:
      'click()은 그 자리에서 click 이벤트를 디스패치합니다. 태스크 큐에 넣지 않으므로 리스너가 전역 코드 위에 바로 올라가고, 태스크는 여전히 스크립트입니다. 큐는 쓰이지 않았습니다.',
    line: at(17),
    state: state(['전역 코드', 'click 리스너'], ['타이머 콜백'], [], '스크립트'),
    output: ['click() 전'],
  },
  {
    title: "리스너 안의 console.log('click 리스너')",
    explanation:
      '리스너가 실행되어 한 줄을 출력합니다. 아직 click() 다음 줄로 돌아가지 못했습니다.',
    line: at(11),
    state: state(['전역 코드', 'click 리스너'], ['타이머 콜백'], [], '스크립트'),
    output: ['click() 전', 'click 리스너'],
  },
  {
    title: 'click 리스너 끝, click()에서 돌아옴',
    explanation:
      '리스너가 끝나 콜 스택에서 내려가고, 실행은 click()을 부른 전역 코드로 돌아옵니다.',
    line: at(12),
    state: state(['전역 코드'], ['타이머 콜백'], [], '스크립트'),
    output: ['click() 전', 'click 리스너'],
  },
  {
    title: "console.log('click() 뒤')",
    explanation:
      '리스너가 이미 실행된 뒤이므로 click() 다음 줄의 출력은 리스너의 출력 다음에 나옵니다.',
    line: at(18),
    state: state(['전역 코드'], ['타이머 콜백'], [], '스크립트'),
    output: ['click() 전', 'click 리스너', 'click() 뒤'],
  },
  {
    title: '지연이 끝난 타이머가 태스크 큐로',
    explanation: `0ms 타이머의 콜백이 태스크 큐에 들어갑니다. ${QUEUE_MOMENT} 큐에 언제 들어가든 전역 코드가 끝나기 전에는 실행되지 못합니다.`,
    line: at(18),
    state: state(['전역 코드'], [], ['타이머 콜백'], '스크립트'),
    output: ['click() 전', 'click 리스너', 'click() 뒤'],
  },
  {
    title: '스크립트 태스크 끝',
    explanation: '전역 코드가 끝나 콜 스택이 비고 스크립트 태스크가 끝납니다.',
    line: at(18),
    state: state([], [], ['타이머 콜백'], null),
    output: ['click() 전', 'click 리스너', 'click() 뒤'],
  },
  {
    title: '타이머 콜백 태스크 실행',
    explanation: '큐의 타이머 콜백이 꺼내져 실행됩니다. 큐를 거친 것은 이 타이머 콜백뿐입니다.',
    line: at(14),
    state: state(['타이머 콜백'], [], [], '타이머 콜백'),
    output: ['click() 전', 'click 리스너', 'click() 뒤', '타이머 0ms'],
  },
  {
    title: '타이머 콜백 끝',
    explanation:
      '모든 태스크가 끝났습니다. 콜 스택, 대기 중인 타이머, 태스크 큐가 모두 비었습니다.',
    line: at(15),
    state: state([], [], [], null),
    output: ['click() 전', 'click 리스너', 'click() 뒤', '타이머 0ms'],
  },
]

export const scenarios: Scenario<LoopState>[] = [
  {
    id: 'sync',
    label: '동기 코드와 타이머',
    exampleId: 'sync-and-timers',
    code: syncAndTimersCode,
    steps: syncSteps,
  },
  {
    id: 'nested',
    label: '콜백 안에서 예약',
    exampleId: 'nested',
    code: nestedCode,
    steps: nestedSteps,
  },
  {
    id: 'click',
    label: 'click()은 그 자리에서',
    exampleId: 'click-sync',
    code: clickSyncCode,
    steps: clickSteps,
  },
]
