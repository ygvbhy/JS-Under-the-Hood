import type { Scenario, Step } from '~/simulator/types'
import fallThroughCode from './examples/fall-through.js?raw'
import loopBreakContinueCode from './examples/loop-break-continue.js?raw'
import switchInLoopCode from './examples/switch-in-loop.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// "실행 중인 구조"(blocks)는 바깥 → 안쪽 순서의 for·switch 블록이고, 블록마다 그 안에서 일어난 사건을 한 단계에 하나씩 쌓는다.
// for 블록의 사건은 반복 회차마다 새로 시작한다. break·continue 다음 단계에서는 끝난 블록이 blocks에서 빠진다.
// 출력 단계는 사건을 더하지 않고 output만 늘린다.

export type Val = { type: 'number' | 'string'; display: string } // 문자열은 따옴표 없이 display에 담는다

export type Binding = {
  name: string
  declaredWith: 'let' | 'const'
  value: Val
  changed?: 'created' | 'updated' // 그 단계에서 새로 생김 / 값이 바뀜. 다음 단계에서 해제
}

export type FlowEvent =
  | { kind: 'value'; code: string; value: Val } // switch (code)의 값을 구함
  | { kind: 'compare'; caseCode: string; left: Val; right: Val; result: boolean } // case 비교 (===)
  | { kind: 'default' } // 일치하는 case가 없어 default부터 실행
  | { kind: 'fall-through'; caseCode: string } // break가 없어 caseCode의 문장으로 이어서 실행 (식은 평가하지 않음)
  | { kind: 'condition'; code: string; result: boolean } // for 조건식 또는 if 조건
  | { kind: 'jump'; statement: 'break' | 'continue'; target: 'switch' | 'for' } // 가장 가까운 대상
  | { kind: 'exit'; reason: 'end' | 'no-match' } // switch를 끝까지 실행 / 일치하는 case·default 없음

export type Block = {
  kind: 'switch' | 'for'
  code: string // 블록 머리: 'switch (level)' / 'for (let i = 1; i <= 5; i++)'
  iteration?: number // for만: 현재 회차(1부터)
  events: FlowEvent[]
}

export type FlowState = { bindings: Binding[]; blocks: Block[] } // blocks: 바깥 → 안쪽

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })

const bind = (
  name: string,
  declaredWith: Binding['declaredWith'],
  value: Val,
  changed?: Binding['changed'],
): Binding => ({
  name,
  declaredWith,
  value,
  ...(changed && { changed }),
})

const value = (code: string, v: Val): FlowEvent => ({ kind: 'value', code, value: v })
const compare = (caseCode: string, left: Val, right: Val, result: boolean): FlowEvent => ({
  kind: 'compare',
  caseCode,
  left,
  right,
  result,
})
const fallThrough = (caseCode: string): FlowEvent => ({ kind: 'fall-through', caseCode })
const condition = (code: string, result: boolean): FlowEvent => ({
  kind: 'condition',
  code,
  result,
})
const jump = (statement: 'break' | 'continue', target: 'switch' | 'for'): FlowEvent => ({
  kind: 'jump',
  statement,
  target,
})
const exit = (reason: 'end' | 'no-match'): FlowEvent => ({ kind: 'exit', reason })

// 사건 목록의 앞 count개까지 가진 블록
const switchBlock = (code: string, events: FlowEvent[], count: number): Block => ({
  kind: 'switch',
  code,
  events: events.slice(0, count),
})
const forBlock = (code: string, iteration: number, events: FlowEvent[], count: number): Block => ({
  kind: 'for',
  code,
  iteration,
  events: events.slice(0, count),
})

const state = (bindings: Binding[], blocks: Block[] = []): FlowState => ({ bindings, blocks })

const at = (n: number) => ({ from: n, to: n })

const intro: Step<FlowState> = {
  title: '실행 전',
  explanation:
    '코드를 실행하기 전입니다. 이 시각화는 실행 중인 switch나 반복문과 선언문이 실행된 변수만 보여 줍니다.',
  state: { bindings: [], blocks: [] },
  output: [],
}

// --- 시나리오 1: break가 없을 때 (fall-through) -------------------------------------------------
// const level = 2;
// switch (level) { case 3: …; case 2: console.log('무료 배송'); case 1: console.log('적립'); }
// → case 2가 처음 일치하고, break가 없어 case 1의 문장까지 이어서 실행

const SW_LEVEL = 'switch (level)'
const levelEvents: FlowEvent[] = [
  value('level', num(2)),
  compare('case 3', num(2), num(3), false),
  compare('case 2', num(2), num(2), true),
  fallThrough('case 1'),
  exit('end'),
]
const level = (changed?: Binding['changed']) => bind('level', 'const', num(2), changed)
const levelState = (count: number) => state([level()], [switchBlock(SW_LEVEL, levelEvents, count)])

const fallThroughSteps: Step<FlowState>[] = [
  intro,
  {
    title: 'level을 2로 초기화',
    explanation: '1번 줄의 const 선언이 실행되어 level이 2로 초기화됩니다.',
    line: at(1),
    state: state([level('created')]),
    output: [],
  },
  {
    title: 'switch (level): 값을 구함',
    explanation:
      'switch 괄호 안의 식 level의 값 2를 한 번 구합니다. 이 값을 case의 식과 위에서부터 차례로 ===로 비교합니다.',
    line: at(2),
    state: levelState(1),
    output: [],
  },
  {
    title: 'case 3 비교: false',
    explanation:
      '첫 case의 식 3과 ===로 비교합니다. 2 === 3은 false라서 일치하지 않으므로 다음 case로 넘어갑니다.',
    line: at(3),
    state: levelState(2),
    output: [],
  },
  {
    title: 'case 2 비교: true',
    explanation:
      '2 === 2는 true입니다. 처음으로 일치한 case 2의 문장부터 실행합니다. 이 비교 이후에는 아래 case의 식을 평가하지 않습니다.',
    line: at(5),
    state: levelState(3),
    output: [],
  },
  {
    title: '6번 줄 출력',
    explanation:
      'case 2의 문장 console.log가 무료 배송을 출력합니다. break는 아직 만나지 않았습니다.',
    line: at(6),
    state: levelState(3),
    output: ['무료 배송'],
  },
  {
    title: 'case 1로 이어서 실행',
    explanation:
      '위에서 이미 일치했으므로 case 1의 식은 평가하지 않고 비교도 하지 않습니다. break를 만나지 않았기 때문에 case 1의 문장으로 이어서 실행합니다.',
    line: at(7),
    state: levelState(4),
    output: ['무료 배송'],
  },
  {
    title: '8번 줄 출력',
    explanation: 'case 1의 문장 console.log가 적립을 출력합니다.',
    line: at(8),
    state: levelState(4),
    output: ['무료 배송', '적립'],
  },
  {
    title: 'switch 끝',
    explanation: '마지막 문장까지 실행했으므로 switch를 벗어납니다.',
    line: at(9),
    state: levelState(5),
    output: ['무료 배송', '적립'],
  },
]

// --- 시나리오 2: 반복문의 break와 continue (loop-break-continue) --------------------------------
// for (let i = 1; i <= 5; i++) { if (i === 2) continue; if (i === 4) break; console.log(i); }
// console.log('끝');
// → i = 1 출력, i = 2는 continue로 건너뜀, i = 3 출력, i = 4에서 break로 for 끝

const FOR_I = 'for (let i = 1; i <= 5; i++)'
const loopI = (iteration: number, events: FlowEvent[], count: number) =>
  forBlock(FOR_I, iteration, events, count)
const bindI = (n: number, changed?: Binding['changed']) => bind('i', 'let', num(n), changed)

const i1Events: FlowEvent[] = [
  condition('i <= 5', true),
  condition('i === 2', false),
  condition('i === 4', false),
]
const i2Events: FlowEvent[] = [
  condition('i <= 5', true),
  condition('i === 2', true),
  jump('continue', 'for'),
]
const i4Events: FlowEvent[] = [
  condition('i <= 5', true),
  condition('i === 2', false),
  condition('i === 4', true),
  jump('break', 'for'),
]

const loopSteps: Step<FlowState>[] = [
  intro,
  // 1회차
  {
    title: 'i를 1로 초기화, 조건 검사',
    explanation:
      'for 문이 시작됩니다. i를 1로 초기화하고 조건식 i <= 5를 검사하면 true라서 본문을 실행합니다.',
    line: at(1),
    state: state([bindI(1, 'created')], [loopI(1, i1Events, 1)]),
    output: [],
  },
  {
    title: 'if (i === 2): false',
    explanation: '1 === 2는 false이므로 continue를 실행하지 않고 다음 문장으로 갑니다.',
    line: at(2),
    state: state([bindI(1)], [loopI(1, i1Events, 2)]),
    output: [],
  },
  {
    title: 'if (i === 4): false',
    explanation: '1 === 4는 false이므로 break를 실행하지 않고 다음 문장으로 갑니다.',
    line: at(3),
    state: state([bindI(1)], [loopI(1, i1Events, 3)]),
    output: [],
  },
  {
    title: '4번 줄 출력',
    explanation: 'console.log가 i의 값 1을 출력합니다. 본문이 끝나면 증감식으로 갑니다.',
    line: at(4),
    state: state([bindI(1)], [loopI(1, i1Events, 3)]),
    output: ['1'],
  },
  // 2회차
  {
    title: 'i++로 i가 2, 조건 검사',
    explanation:
      '증감식 i++가 실행되어 i가 2가 되고 2회차가 시작됩니다. 조건식 i <= 5는 true입니다.',
    line: at(1),
    state: state([bindI(2, 'updated')], [loopI(2, i2Events, 1)]),
    output: ['1'],
  },
  {
    title: 'if (i === 2): true',
    explanation: '2 === 2는 true이므로 이 if 문의 continue를 실행합니다.',
    line: at(2),
    state: state([bindI(2)], [loopI(2, i2Events, 2)]),
    output: ['1'],
  },
  {
    title: 'continue: 다음 반복으로',
    explanation:
      'continue는 가장 가까운 반복문의 이번 반복을 끝내고 다음 반복으로 넘어갑니다. 이번 반복의 남은 문장인 3번과 4번 줄은 건너뛰고 증감식으로 갑니다.',
    line: at(2),
    state: state([bindI(2)], [loopI(2, i2Events, 3)]),
    output: ['1'],
  },
  // 3회차
  {
    title: 'i++로 i가 3, 조건 검사',
    explanation:
      '증감식 i++가 실행되어 i가 3이 되고 3회차가 시작됩니다. 조건식 i <= 5는 true입니다.',
    line: at(1),
    state: state([bindI(3, 'updated')], [loopI(3, i1Events, 1)]),
    output: ['1'],
  },
  {
    title: 'if (i === 2): false',
    explanation: '3 === 2는 false이므로 continue를 실행하지 않습니다.',
    line: at(2),
    state: state([bindI(3)], [loopI(3, i1Events, 2)]),
    output: ['1'],
  },
  {
    title: 'if (i === 4): false',
    explanation: '3 === 4는 false이므로 break를 실행하지 않습니다.',
    line: at(3),
    state: state([bindI(3)], [loopI(3, i1Events, 3)]),
    output: ['1'],
  },
  {
    title: '4번 줄 출력',
    explanation: 'console.log가 i의 값 3을 출력합니다.',
    line: at(4),
    state: state([bindI(3)], [loopI(3, i1Events, 3)]),
    output: ['1', '3'],
  },
  // 4회차
  {
    title: 'i++로 i가 4, 조건 검사',
    explanation:
      '증감식 i++가 실행되어 i가 4가 되고 4회차가 시작됩니다. 조건식 i <= 5는 true입니다.',
    line: at(1),
    state: state([bindI(4, 'updated')], [loopI(4, i4Events, 1)]),
    output: ['1', '3'],
  },
  {
    title: 'if (i === 2): false',
    explanation: '4 === 2는 false이므로 continue를 실행하지 않습니다.',
    line: at(2),
    state: state([bindI(4)], [loopI(4, i4Events, 2)]),
    output: ['1', '3'],
  },
  {
    title: 'if (i === 4): true',
    explanation: '4 === 4는 true이므로 이 if 문의 break를 실행합니다.',
    line: at(3),
    state: state([bindI(4)], [loopI(4, i4Events, 3)]),
    output: ['1', '3'],
  },
  {
    title: 'break: 반복문을 끝냄',
    explanation:
      'break는 가장 가까운 반복문이나 switch를 끝냅니다. 여기서는 for 문이 끝나므로 5회차 조건 검사도 하지 않습니다.',
    line: at(3),
    state: state([bindI(4)], [loopI(4, i4Events, 4)]),
    output: ['1', '3'],
  },
  {
    title: '6번 줄 출력',
    explanation:
      'for 문이 끝났으므로 그 다음 문장인 6번 줄이 실행되어 끝을 출력합니다. i는 for 문 밖에서는 쓸 수 없어 표시에서 뺍니다.',
    line: at(6),
    state: state([]),
    output: ['1', '3', '끝'],
  },
]

// --- 시나리오 3: 반복문 안의 switch (switch-in-loop) -------------------------------------------
// for (let n = 1; n <= 3; n++) {
//   switch (n) { case 1: 하나; break;  case 2: 둘; continue; }
//   console.log(n + '번 끝');
// }
// → n = 1: break는 switch만 끝냄 / n = 2: continue는 for의 다음 반복으로 / n = 3: 일치하는 case 없음

const FOR_N = 'for (let n = 1; n <= 3; n++)'
const SW_N = 'switch (n)'
const loopN = (iteration: number, events: FlowEvent[], count: number) =>
  forBlock(FOR_N, iteration, events, count)
const switchN = (events: FlowEvent[], count: number) => switchBlock(SW_N, events, count)
const bindN = (n: number, changed?: Binding['changed']) => bind('n', 'let', num(n), changed)

const nForEvents: FlowEvent[] = [condition('n <= 3', true)]
const n1Switch: FlowEvent[] = [
  value('n', num(1)),
  compare('case 1', num(1), num(1), true),
  jump('break', 'switch'),
]
const n2Switch: FlowEvent[] = [
  value('n', num(2)),
  compare('case 1', num(2), num(1), false),
  compare('case 2', num(2), num(2), true),
  jump('continue', 'for'),
]
const n3Switch: FlowEvent[] = [
  value('n', num(3)),
  compare('case 1', num(3), num(1), false),
  compare('case 2', num(3), num(2), false),
  exit('no-match'),
]
const n4ForEvents: FlowEvent[] = [condition('n <= 3', false)]

const switchInLoopSteps: Step<FlowState>[] = [
  intro,
  // 1회차: break는 switch만 끝낸다
  {
    title: 'n을 1로 초기화, 조건 검사',
    explanation:
      'for 문이 시작됩니다. n을 1로 초기화하고 조건식 n <= 3을 검사하면 true라서 본문을 실행합니다.',
    line: at(1),
    state: state([bindN(1, 'created')], [loopN(1, nForEvents, 1)]),
    output: [],
  },
  {
    title: 'switch (n): 값을 구함',
    explanation: 'switch 괄호 안의 식 n의 값 1을 한 번 구합니다.',
    line: at(2),
    state: state([bindN(1)], [loopN(1, nForEvents, 1), switchN(n1Switch, 1)]),
    output: [],
  },
  {
    title: 'case 1 비교: true',
    explanation: '1 === 1은 true입니다. 처음으로 일치한 case 1의 문장부터 실행합니다.',
    line: at(3),
    state: state([bindN(1)], [loopN(1, nForEvents, 1), switchN(n1Switch, 2)]),
    output: [],
  },
  {
    title: '4번 줄 출력',
    explanation: 'case 1의 문장 console.log가 하나를 출력합니다.',
    line: at(4),
    state: state([bindN(1)], [loopN(1, nForEvents, 1), switchN(n1Switch, 2)]),
    output: ['하나'],
  },
  {
    title: 'break: switch를 끝냄',
    explanation:
      'break는 가장 가까운 반복문이나 switch를 끝냅니다. 여기서 가장 가까운 것은 switch이므로 switch만 끝나고 for 문은 계속됩니다.',
    line: at(5),
    state: state([bindN(1)], [loopN(1, nForEvents, 1), switchN(n1Switch, 3)]),
    output: ['하나'],
  },
  {
    title: '10번 줄 출력',
    explanation:
      'break는 가장 가까운 switch만 끝냈으므로, for 본문에서 switch 다음 문장인 10번 줄이 실행되어 1번 끝을 출력합니다.',
    line: at(10),
    state: state([bindN(1)], [loopN(1, nForEvents, 1)]),
    output: ['하나', '1번 끝'],
  },
  // 2회차: continue는 switch를 지나 for에 적용된다
  {
    title: 'n++로 n이 2, 조건 검사',
    explanation:
      '증감식 n++가 실행되어 n이 2가 되고 2회차가 시작됩니다. 조건식 n <= 3은 true입니다.',
    line: at(1),
    state: state([bindN(2, 'updated')], [loopN(2, nForEvents, 1)]),
    output: ['하나', '1번 끝'],
  },
  {
    title: 'switch (n): 값을 구함',
    explanation: '이번에는 n이 2이므로 switch 괄호 안의 식 n의 값은 2입니다.',
    line: at(2),
    state: state([bindN(2)], [loopN(2, nForEvents, 1), switchN(n2Switch, 1)]),
    output: ['하나', '1번 끝'],
  },
  {
    title: 'case 1 비교: false',
    explanation: '2 === 1은 false라서 일치하지 않으므로 다음 case로 넘어갑니다.',
    line: at(3),
    state: state([bindN(2)], [loopN(2, nForEvents, 1), switchN(n2Switch, 2)]),
    output: ['하나', '1번 끝'],
  },
  {
    title: 'case 2 비교: true',
    explanation: '2 === 2는 true입니다. case 2의 문장부터 실행합니다.',
    line: at(6),
    state: state([bindN(2)], [loopN(2, nForEvents, 1), switchN(n2Switch, 3)]),
    output: ['하나', '1번 끝'],
  },
  {
    title: '7번 줄 출력',
    explanation: 'case 2의 문장 console.log가 둘을 출력합니다.',
    line: at(7),
    state: state([bindN(2)], [loopN(2, nForEvents, 1), switchN(n2Switch, 3)]),
    output: ['하나', '1번 끝', '둘'],
  },
  {
    title: 'continue: 다음 반복으로',
    explanation:
      'continue는 switch가 아니라 가장 가까운 반복문에 적용됩니다. switch를 벗어나 for 문의 이번 반복을 끝내고 다음 반복으로 넘어가므로 10번 줄은 건너뜁니다.',
    line: at(8),
    state: state([bindN(2)], [loopN(2, nForEvents, 1), switchN(n2Switch, 4)]),
    output: ['하나', '1번 끝', '둘'],
  },
  // 3회차: 일치하는 case도 default도 없다
  {
    title: 'n++로 n이 3, 조건 검사',
    explanation:
      '증감식 n++가 실행되어 n이 3이 되고 3회차가 시작됩니다. 조건식 n <= 3은 true입니다. 2회차의 10번 줄은 실행되지 않았습니다.',
    line: at(1),
    state: state([bindN(3, 'updated')], [loopN(3, nForEvents, 1)]),
    output: ['하나', '1번 끝', '둘'],
  },
  {
    title: 'switch (n): 값을 구함',
    explanation: '이번에는 n이 3이므로 switch 괄호 안의 식 n의 값은 3입니다.',
    line: at(2),
    state: state([bindN(3)], [loopN(3, nForEvents, 1), switchN(n3Switch, 1)]),
    output: ['하나', '1번 끝', '둘'],
  },
  {
    title: 'case 1 비교: false',
    explanation: '3 === 1은 false라서 일치하지 않으므로 다음 case로 넘어갑니다.',
    line: at(3),
    state: state([bindN(3)], [loopN(3, nForEvents, 1), switchN(n3Switch, 2)]),
    output: ['하나', '1번 끝', '둘'],
  },
  {
    title: 'case 2 비교: false',
    explanation: '3 === 2도 false입니다. 모든 case가 일치하지 않았습니다.',
    line: at(6),
    state: state([bindN(3)], [loopN(3, nForEvents, 1), switchN(n3Switch, 3)]),
    output: ['하나', '1번 끝', '둘'],
  },
  {
    title: '일치하는 case 없음: switch 끝',
    explanation:
      '일치하는 case도 default도 없으므로 switch의 문장은 하나도 실행하지 않고 switch를 벗어납니다.',
    line: at(9),
    state: state([bindN(3)], [loopN(3, nForEvents, 1), switchN(n3Switch, 4)]),
    output: ['하나', '1번 끝', '둘'],
  },
  {
    title: '10번 줄 출력',
    explanation: 'switch를 벗어나 for 본문의 다음 문장인 10번 줄이 실행되어 3번 끝을 출력합니다.',
    line: at(10),
    state: state([bindN(3)], [loopN(3, nForEvents, 1)]),
    output: ['하나', '1번 끝', '둘', '3번 끝'],
  },
  // 4회차: 조건이 false라서 끝
  {
    title: 'n++로 n이 4, 조건 검사: false',
    explanation:
      '증감식 n++가 실행되어 n이 4가 되고 조건식 n <= 3을 검사하면 false입니다. 조건이 false라서 반복문이 끝납니다.',
    line: at(1),
    state: state([bindN(4, 'updated')], [loopN(4, n4ForEvents, 1)]),
    output: ['하나', '1번 끝', '둘', '3번 끝'],
  },
  {
    title: '실행 끝',
    explanation:
      'for 문이 끝났고 더 실행할 문장이 없습니다. n은 for 문 밖에서는 쓸 수 없어 표시에서 뺍니다.',
    state: state([]),
    output: ['하나', '1번 끝', '둘', '3번 끝'],
  },
]

export const scenarios: Scenario<FlowState>[] = [
  {
    id: 'fall-through',
    label: 'break가 없을 때',
    exampleId: 'fall-through',
    code: fallThroughCode,
    steps: fallThroughSteps,
  },
  {
    id: 'loop-break-continue',
    label: '반복문의 break와 continue',
    exampleId: 'loop-break-continue',
    code: loopBreakContinueCode,
    steps: loopSteps,
  },
  {
    id: 'switch-in-loop',
    label: '반복문 안의 switch',
    exampleId: 'switch-in-loop',
    code: switchInLoopCode,
    steps: switchInLoopSteps,
  },
]
