import type { LineRange, Scenario, Step } from '~/simulator/types'
import findReadsMissingIndexCode from './examples/find-reads-missing-index.js?raw'
import pushDuringForeachCode from './examples/push-during-foreach.js?raw'
import removeDuringForeachCode from './examples/remove-during-foreach.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - call: 지금 실행 중인 메서드 호출(예 'nums.forEach(콜백)'). 루프 밖이면 null이다.
// - method: 'forEach' 또는 'find'. 루프 밖이면 null이다.
// - fixedLength: 시작할 때 LengthOfArrayLike로 한 번 읽어 고정한 길이. 루프 밖이면 null이다.
// - array: 지금 배열(이름, 지금 length, 칸). 선언 전에는 null이고, 선언한 뒤에는 루프 밖에서도
//   마지막으로 본 배열을 그대로 보여 준다(그래서 array만 루프 밖에서도 null이 아니다).
//   cells는 인덱스 0..max(fixedLength, length)-1을 덮는다. 루프 밖에서는 fixedLength가 null이므로 length까지다.
//   'hole'은 length 안쪽인데 프로퍼티가 없는 구멍, 'beyond-length'는 지금 length 밖인 자리다.
//   둘 다 HasProperty가 false다.
// - k: 지금 보는 인덱스. 끝 단계에서는 고정한 길이에 닿은 인덱스를 가리킨다.
// - check: HasProperty 결과. find는 확인하지 않으므로 'not-checked'다. 콜백 단계는 직전 확인 단계의 값을 유지한다.
// - read: Get이 읽은 값(표시용 글자). check가 'absent'면 읽지 않으므로 null이다.
// - callback: 이번 콜백이 한 일. returned: find만, 콜백 반환값과 ToBoolean 판정.
// - visited: 콜백이 값을 모은 배열(seen·seenA·seenB). 선언 전에는 null이다.
// - outcome: 메서드가 끝난 이유와 반환값.

export type Cell = { kind: 'value'; value: string } | { kind: 'hole' } | { kind: 'beyond-length' }

export type Check = 'present' | 'absent' | 'not-checked'

export type LoopState = {
  call: string | null
  method: 'forEach' | 'find' | null
  fixedLength: number | null
  array: { name: string; length: number; cells: Cell[] } | null
  k: number | null
  check: Check | null
  read: string | null
  callback: string | null
  returned: string | null
  visited: { name: string; items: string[] } | null
  outcome: string | null
}

type S = Step<LoopState>

const at = (n: number): LineRange => ({ from: n, to: n })

const idle: LoopState = {
  call: null,
  method: null,
  fixedLength: null,
  array: null,
  k: null,
  check: null,
  read: null,
  callback: null,
  returned: null,
  visited: null,
  outcome: null,
}

// 값 목록(문자열 또는 구멍 null)으로 배열 상태를 만든다. length 뒤 ~ fixedLength 사이는 'beyond-length'다.
function arr(name: string, vals: (string | null)[], fixed: number | null = null) {
  const cells: Cell[] = vals.map((v) =>
    v === null ? { kind: 'hole' } : { kind: 'value', value: v },
  )
  for (let i = vals.length; i < (fixed ?? 0); i++) cells.push({ kind: 'beyond-length' })
  return { name, length: vals.length, cells }
}

const consoleNote = '(console.log는 호스트가 제공하는 출력 API입니다.)'

const intro: S = {
  title: '실행 전',
  explanation:
    '코드를 실행하기 전입니다. 이 시각화는 콜백을 받는 배열 메서드가 시작할 때 length를 한 번만 읽어 고정하고, 인덱스마다 그 시점의 배열을 확인해 값을 읽는 과정을 보여 줍니다. forEach는 HasProperty로 프로퍼티가 있는지 확인한 뒤 Get으로 읽고, find는 확인 없이 Get으로 읽습니다. 확인과 읽기는 한 단계로, 콜백 본문 실행은 다음 한 단계로 묶어 그립니다.',
  state: idle,
  output: [],
}

type Loop = {
  call: string
  method: 'forEach' | 'find'
  name: string
  visitedName: string
}

// 한 메서드 호출의 루프 상태를 만든다. 배열과 visited는 단계마다 넘긴다.
function loopState(
  l: Loop,
  fixed: number,
  array: LoopState['array'],
  visited: string[],
  extra: Partial<LoopState>,
): LoopState {
  return {
    ...idle,
    call: l.call,
    method: l.method,
    fixedLength: fixed,
    array,
    visited: { name: l.visitedName, items: visited },
    ...extra,
  }
}

const afterLoop = (array: LoopState['array'], visited: string[], name: string): LoopState => ({
  ...idle,
  array,
  visited: { name, items: visited },
})

// --- 시나리오 A: push한 요소는 방문하지 않는다 ------------------------------------------------

const LA: Loop = {
  call: 'nums.forEach(콜백)',
  method: 'forEach',
  name: 'nums',
  visitedName: 'seen',
}

const pushSteps: S[] = [
  intro,
  {
    title: 'nums 만들기',
    explanation: '1번 줄에서 nums는 [1, 2]입니다. 아직 순회를 시작하지 않았습니다.',
    line: at(1),
    state: { ...idle, array: arr('nums', ['1', '2']) },
    output: [],
  },
  {
    title: 'seen 만들기',
    explanation: '2번 줄에서 콜백이 방문한 값을 모을 빈 배열 seen을 만듭니다.',
    line: at(2),
    state: { ...idle, array: arr('nums', ['1', '2']), visited: { name: 'seen', items: [] } },
    output: [],
  },
  {
    title: 'forEach 시작: length를 한 번 읽는다',
    explanation:
      '3번 줄의 forEach는 먼저 LengthOfArrayLike로 nums의 length 2를 읽어 고정합니다. 이 고정한 길이는 순회가 끝날 때까지 바뀌지 않고, 이후 nums.length가 달라져도 다시 읽지 않습니다.',
    line: at(3),
    state: loopState(LA, 2, arr('nums', ['1', '2']), [], {}),
    output: [],
  },
  {
    title: '인덱스 0: 확인하고 읽기',
    explanation:
      '인덱스 0은 고정한 길이 2보다 작으므로 루프가 이 인덱스를 봅니다. HasProperty가 true이고 Get이 그 순간의 값 1을 읽습니다.',
    line: at(3),
    state: loopState(LA, 2, arr('nums', ['1', '2']), [], { k: 0, check: 'present', read: '1' }),
    output: [],
  },
  {
    title: '인덱스 0: 콜백 실행',
    explanation:
      '콜백이 x = 1로 불립니다. seen에 1을 넣고, 1 < 3이므로 nums.push(3)을 실행해 nums는 [1, 2, 3], 지금 length는 3이 됩니다. 고정한 길이는 그대로 2입니다.',
    line: { from: 4, to: 5 },
    state: loopState(LA, 2, arr('nums', ['1', '2', '3'], 2), ['1'], {
      k: 0,
      check: 'present',
      read: '1',
      callback: 'seen.push(1), nums.push(3)',
    }),
    output: [],
  },
  {
    title: '인덱스 1: 확인하고 읽기',
    explanation:
      '인덱스 1도 고정한 길이 2보다 작아 루프가 봅니다. HasProperty가 true이고 값 2를 읽습니다.',
    line: at(3),
    state: loopState(LA, 2, arr('nums', ['1', '2', '3'], 2), ['1'], {
      k: 1,
      check: 'present',
      read: '2',
    }),
    output: [],
  },
  {
    title: '인덱스 1: 콜백 실행',
    explanation:
      '콜백이 x = 2로 불립니다. seen에 2를 넣고 nums.push(4)를 실행해 nums는 [1, 2, 3, 4], 지금 length는 4가 됩니다. 늘어난 인덱스 2·3은 고정한 길이 2 밖에 있습니다.',
    line: { from: 4, to: 5 },
    state: loopState(LA, 2, arr('nums', ['1', '2', '3', '4'], 2), ['1', '2'], {
      k: 1,
      check: 'present',
      read: '2',
      callback: 'seen.push(2), nums.push(4)',
    }),
    output: [],
  },
  {
    title: '인덱스 2: 고정한 길이에 닿아 끝',
    explanation:
      '다음 인덱스 2는 고정한 길이 2에 닿았으므로 더 방문하지 않습니다. 지금 length는 4이고 인덱스 2·3에는 값이 있지만 확인도 읽기도 하지 않습니다. forEach는 undefined를 돌려줍니다.',
    line: at(3),
    state: loopState(LA, 2, arr('nums', ['1', '2', '3', '4'], 2), ['1', '2'], {
      k: 2,
      outcome: '인덱스 2가 고정한 길이 2에 닿아 끝, undefined 반환',
    }),
    output: [],
  },
  {
    title: '출력: [1,2] [1,2,3,4]',
    explanation: `7번 줄은 방문한 값 seen이 [1,2]이고 nums는 [1,2,3,4]임을 출력합니다. push한 3과 4는 배열에는 들어갔지만 방문하지 않았습니다. ${consoleNote}`,
    line: at(7),
    state: afterLoop(arr('nums', ['1', '2', '3', '4']), ['1', '2'], 'seen'),
    output: ['[1,2] [1,2,3,4]'],
  },
]

// --- 시나리오 B: pop·shift 뒤의 인덱스 -------------------------------------------------------

const LBa: Loop = { call: 'a.forEach(콜백)', method: 'forEach', name: 'a', visitedName: 'seenA' }
const LBb: Loop = { call: 'b.forEach(콜백)', method: 'forEach', name: 'b', visitedName: 'seenB' }

const A0 = arr('a', ['1', '2', '3'])
const A1 = arr('a', ['1', '2'], 3)
const B0 = arr('b', ['1', '2', '3'])
const B1 = arr('b', ['2', '3'], 3)

const removeSteps: S[] = [
  intro,
  {
    title: 'a 만들기',
    explanation: '1번 줄에서 a는 [1, 2, 3]입니다.',
    line: at(1),
    state: { ...idle, array: A0 },
    output: [],
  },
  {
    title: 'seenA 만들기',
    explanation: '2번 줄에서 방문한 값을 모을 빈 배열 seenA를 만듭니다.',
    line: at(2),
    state: { ...idle, array: A0, visited: { name: 'seenA', items: [] } },
    output: [],
  },
  {
    title: 'a.forEach 시작: length를 한 번 읽는다',
    explanation: '3번 줄의 forEach는 a의 length 3을 읽어 고정합니다.',
    line: at(3),
    state: loopState(LBa, 3, A0, [], {}),
    output: [],
  },
  {
    title: 'a 인덱스 0: 확인하고 읽기',
    explanation: '인덱스 0은 HasProperty가 true이고 값 1을 읽습니다.',
    line: at(3),
    state: loopState(LBa, 3, A0, [], { k: 0, check: 'present', read: '1' }),
    output: [],
  },
  {
    title: 'a 인덱스 0: 콜백 실행 (pop)',
    explanation:
      '콜백이 x = 1로 불립니다. seenA에 1을 넣고, x === 1이므로 a.pop()을 실행해 마지막 요소 3을 지웁니다. a는 [1, 2], 지금 length는 2가 되고, pop은 인덱스 2의 프로퍼티를 지운 뒤 length를 2로 줄이므로, 인덱스 2는 프로퍼티가 없는 length 밖 자리가 됩니다. 고정한 길이는 그대로 3입니다.',
    line: { from: 4, to: 5 },
    state: loopState(LBa, 3, A1, ['1'], {
      k: 0,
      check: 'present',
      read: '1',
      callback: 'seenA.push(1), a.pop()',
    }),
    output: [],
  },
  {
    title: 'a 인덱스 1: 확인하고 읽기',
    explanation: '인덱스 1은 HasProperty가 true이고 값 2를 읽습니다.',
    line: at(3),
    state: loopState(LBa, 3, A1, ['1'], { k: 1, check: 'present', read: '2' }),
    output: [],
  },
  {
    title: 'a 인덱스 1: 콜백 실행',
    explanation:
      '콜백이 x = 2로 불립니다. seenA에 2를 넣고, x === 1이 아니므로 pop은 하지 않습니다.',
    line: { from: 4, to: 5 },
    state: loopState(LBa, 3, A1, ['1', '2'], {
      k: 1,
      check: 'present',
      read: '2',
      callback: 'seenA.push(2)',
    }),
    output: [],
  },
  {
    title: 'a 인덱스 2: 프로퍼티가 없어 콜백을 부르지 않는다',
    explanation:
      '인덱스 2는 고정한 길이 3보다 작아 루프가 닿지만, HasProperty가 false(pop이 지워 프로퍼티가 없음)이므로 값을 읽지 않고 콜백도 부르지 않습니다.',
    line: at(3),
    state: loopState(LBa, 3, A1, ['1', '2'], { k: 2, check: 'absent' }),
    output: [],
  },
  {
    title: 'a.forEach 끝',
    explanation:
      '인덱스 3이 고정한 길이 3에 닿아 순회가 끝납니다. 방문한 값은 [1, 2]이고 forEach는 undefined를 돌려줍니다.',
    line: at(3),
    state: loopState(LBa, 3, A1, ['1', '2'], {
      k: 3,
      outcome: '인덱스 3이 고정한 길이 3에 닿아 끝, undefined 반환',
    }),
    output: [],
  },
  {
    title: '출력: [1,2] 2',
    explanation: `7번 줄은 seenA가 [1,2]이고 a.length가 2임을 출력합니다. 고정한 길이가 3이었지만 마지막 인덱스는 프로퍼티가 없어 건너뛰었습니다. ${consoleNote}`,
    line: at(7),
    state: afterLoop(arr('a', ['1', '2']), ['1', '2'], 'seenA'),
    output: ['[1,2] 2'],
  },
  {
    title: 'b 만들기',
    explanation: '8번 줄에서 b는 [1, 2, 3]입니다.',
    line: at(8),
    state: { ...idle, array: B0 },
    output: ['[1,2] 2'],
  },
  {
    title: 'seenB 만들기',
    explanation: '9번 줄에서 방문한 값을 모을 빈 배열 seenB를 만듭니다.',
    line: at(9),
    state: { ...idle, array: B0, visited: { name: 'seenB', items: [] } },
    output: ['[1,2] 2'],
  },
  {
    title: 'b.forEach 시작: length를 한 번 읽는다',
    explanation: '10번 줄의 forEach는 b의 length 3을 읽어 고정합니다.',
    line: at(10),
    state: loopState(LBb, 3, B0, [], {}),
    output: ['[1,2] 2'],
  },
  {
    title: 'b 인덱스 0: 확인하고 읽기',
    explanation: '인덱스 0은 HasProperty가 true이고 값 1을 읽습니다.',
    line: at(10),
    state: loopState(LBb, 3, B0, [], { k: 0, check: 'present', read: '1' }),
    output: ['[1,2] 2'],
  },
  {
    title: 'b 인덱스 0: 콜백 실행 (shift)',
    explanation:
      '콜백이 x = 1로 불립니다. seenB에 1을 넣고 b.shift()를 실행합니다. shift는 값을 한 칸씩 앞으로 옮긴 뒤 마지막 인덱스 2의 프로퍼티를 지우고 length를 2로 줄여 b는 [2, 3]이 됩니다. 값 2는 지금 콜백이 실행 중인 인덱스 0으로 옮겨졌는데, 인덱스 0의 Get은 콜백을 부르기 전에 끝났으므로 다시 읽지 않습니다. 3은 인덱스 1로 옮겨져 다음에 방문합니다. 인덱스 2는 length 밖 자리가 됩니다.',
    line: { from: 11, to: 12 },
    state: loopState(LBb, 3, B1, ['1'], {
      k: 0,
      check: 'present',
      read: '1',
      callback: 'seenB.push(1), b.shift()',
    }),
    output: ['[1,2] 2'],
  },
  {
    title: 'b 인덱스 1: 확인하고 읽기',
    explanation:
      '인덱스 1은 지금 3을 가지고 있습니다. HasProperty가 true이고 Get이 그 순간의 값 3을 읽습니다. 원래 인덱스 1에 있던 2는 이미 값을 읽은 인덱스 0으로 옮겨져 다시 읽지 않습니다.',
    line: at(10),
    state: loopState(LBb, 3, B1, ['1'], { k: 1, check: 'present', read: '3' }),
    output: ['[1,2] 2'],
  },
  {
    title: 'b 인덱스 1: 콜백 실행',
    explanation:
      '콜백이 x = 3으로 불립니다. seenB에 3을 넣고, x === 1이 아니므로 shift는 하지 않습니다.',
    line: { from: 11, to: 12 },
    state: loopState(LBb, 3, B1, ['1', '3'], {
      k: 1,
      check: 'present',
      read: '3',
      callback: 'seenB.push(3)',
    }),
    output: ['[1,2] 2'],
  },
  {
    title: 'b 인덱스 2: 프로퍼티가 없어 콜백을 부르지 않는다',
    explanation:
      '인덱스 2는 고정한 길이 3보다 작아 루프가 닿지만, HasProperty가 false(shift가 지워 프로퍼티가 없음)이므로 콜백을 부르지 않습니다.',
    line: at(10),
    state: loopState(LBb, 3, B1, ['1', '3'], { k: 2, check: 'absent' }),
    output: ['[1,2] 2'],
  },
  {
    title: 'b.forEach 끝',
    explanation: '인덱스 3이 고정한 길이 3에 닿아 순회가 끝납니다. 방문한 값은 [1, 3]입니다.',
    line: at(10),
    state: loopState(LBb, 3, B1, ['1', '3'], {
      k: 3,
      outcome: '인덱스 3이 고정한 길이 3에 닿아 끝, undefined 반환',
    }),
    output: ['[1,2] 2'],
  },
  {
    title: '출력: [1,3] [2,3]',
    explanation: `14번 줄은 seenB가 [1,3]이고 b가 [2,3]임을 출력합니다. 지운 1은 이미 방문했고 2는 당겨져 방문하지 않았습니다. ${consoleNote}`,
    line: at(14),
    state: afterLoop(arr('b', ['2', '3']), ['1', '3'], 'seenB'),
    output: ['[1,2] 2', '[1,3] [2,3]'],
  },
]

// --- 시나리오 C: find는 프로퍼티가 없는 인덱스도 읽는다 ---------------------------------------

const LCa: Loop = { call: 'a.find(콜백)', method: 'find', name: 'a', visitedName: 'seenA' }
const LCb: Loop = { call: 'b.find(콜백)', method: 'find', name: 'b', visitedName: 'seenB' }

const CA = arr('a', ['1', null, '3'])
const CB0 = arr('b', ['1', '2', '3'])
const CB1 = arr('b', ['1', '2'], 3)
const FALSE_CONT = 'undefined → false → 계속'
const NC = 'not-checked' as const

const findSteps: S[] = [
  intro,
  {
    title: 'a 만들기 (구멍 있음)',
    explanation:
      '1번 줄의 [1, , 3]은 인덱스 1에 프로퍼티가 없는 구멍을 가진 배열입니다. length는 3입니다.',
    line: at(1),
    state: { ...idle, array: CA },
    output: [],
  },
  {
    title: 'seenA 만들기',
    explanation: '2번 줄에서 콜백이 본 값을 모을 빈 배열 seenA를 만듭니다.',
    line: at(2),
    state: { ...idle, array: CA, visited: { name: 'seenA', items: [] } },
    output: [],
  },
  {
    title: 'a.find 시작: length를 한 번 읽는다',
    explanation: '3번 줄의 find도 먼저 length 3을 읽어 고정합니다.',
    line: at(3),
    state: loopState(LCa, 3, CA, [], {}),
    output: [],
  },
  {
    title: 'a 인덱스 0: 확인 없이 읽기',
    explanation:
      'find는 HasProperty로 확인하지 않고 곧바로 Get으로 읽습니다. 인덱스 0의 값은 1입니다.',
    line: at(3),
    state: loopState(LCa, 3, CA, [], { k: 0, check: NC, read: '1' }),
    output: [],
  },
  {
    title: 'a 인덱스 0: 콜백 실행',
    explanation:
      "콜백이 (1, 0)으로 불려 seenA에 '0:1'을 넣습니다. 콜백은 아무것도 돌려주지 않으므로 undefined이고 ToBoolean은 false여서 find는 계속합니다.",
    line: at(4),
    state: loopState(LCa, 3, CA, ['0:1'], {
      k: 0,
      check: NC,
      read: '1',
      callback: "seenA.push('0:1')",
      returned: FALSE_CONT,
    }),
    output: [],
  },
  {
    title: 'a 인덱스 1: 확인 없이 읽기 (구멍)',
    explanation:
      '인덱스 1은 구멍이라 프로퍼티가 없지만 find는 확인하지 않고 Get을 합니다. 프로퍼티가 없으면 Get은 undefined를 돌려주고, 그 undefined가 콜백에 그대로 넘어갑니다.',
    line: at(3),
    state: loopState(LCa, 3, CA, ['0:1'], { k: 1, check: NC, read: 'undefined' }),
    output: [],
  },
  {
    title: 'a 인덱스 1: 콜백 실행',
    explanation:
      "구멍인데도 콜백이 (undefined, 1)로 불려 seenA에 '1:undefined'를 넣습니다. forEach였다면 이 인덱스에서 콜백을 부르지 않았을 것입니다. 반환값이 없으므로 계속합니다.",
    line: at(4),
    state: loopState(LCa, 3, CA, ['0:1', '1:undefined'], {
      k: 1,
      check: NC,
      read: 'undefined',
      callback: "seenA.push('1:undefined')",
      returned: FALSE_CONT,
    }),
    output: [],
  },
  {
    title: 'a 인덱스 2: 확인 없이 읽기',
    explanation: '인덱스 2의 값은 3입니다.',
    line: at(3),
    state: loopState(LCa, 3, CA, ['0:1', '1:undefined'], { k: 2, check: NC, read: '3' }),
    output: [],
  },
  {
    title: 'a 인덱스 2: 콜백 실행',
    explanation: "콜백이 (3, 2)로 불려 seenA에 '2:3'을 넣습니다. 반환값이 없으므로 계속합니다.",
    line: at(4),
    state: loopState(LCa, 3, CA, ['0:1', '1:undefined', '2:3'], {
      k: 2,
      check: NC,
      read: '3',
      callback: "seenA.push('2:3')",
      returned: FALSE_CONT,
    }),
    output: [],
  },
  {
    title: 'a.find 끝',
    explanation:
      '인덱스 3이 고정한 길이 3에 닿았고 콜백이 한 번도 truthy를 돌려주지 않았으므로 find는 undefined를 돌려줍니다.',
    line: at(3),
    state: loopState(LCa, 3, CA, ['0:1', '1:undefined', '2:3'], {
      k: 3,
      outcome: '인덱스 3이 고정한 길이 3에 닿아 끝, 못 찾아 undefined 반환',
    }),
    output: [],
  },
  {
    title: '출력: 0:1 1:undefined 2:3',
    explanation: `6번 줄은 seenA를 공백으로 이어 출력합니다. 구멍인 인덱스 1도 방문했습니다. ${consoleNote}`,
    line: at(6),
    state: afterLoop(CA, ['0:1', '1:undefined', '2:3'], 'seenA'),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 만들기',
    explanation: '7번 줄에서 b는 [1, 2, 3]입니다.',
    line: at(7),
    state: { ...idle, array: CB0 },
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'seenB 만들기',
    explanation: '8번 줄에서 콜백이 본 값을 모을 빈 배열 seenB를 만듭니다.',
    line: at(8),
    state: { ...idle, array: CB0, visited: { name: 'seenB', items: [] } },
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b.find 시작: length를 한 번 읽는다',
    explanation: '9번 줄의 find는 b의 length 3을 읽어 고정합니다.',
    line: at(9),
    state: loopState(LCb, 3, CB0, [], {}),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 인덱스 0: 확인 없이 읽기',
    explanation: '인덱스 0의 값은 1입니다.',
    line: at(9),
    state: loopState(LCb, 3, CB0, [], { k: 0, check: NC, read: '1' }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 인덱스 0: 콜백 실행 (pop)',
    explanation:
      "콜백이 x = 1로 불립니다. seenB에 '1'을 넣고 b.pop()으로 인덱스 2의 프로퍼티를 지우고 length를 2로 줄입니다. b는 [1, 2]이고 인덱스 2는 length 밖 자리가 됩니다. 반환값이 없으므로 계속합니다.",
    line: { from: 10, to: 11 },
    state: loopState(LCb, 3, CB1, ['1'], {
      k: 0,
      check: NC,
      read: '1',
      callback: "seenB.push('1'), b.pop()",
      returned: FALSE_CONT,
    }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 인덱스 1: 확인 없이 읽기',
    explanation: '인덱스 1의 값은 2입니다.',
    line: at(9),
    state: loopState(LCb, 3, CB1, ['1'], { k: 1, check: NC, read: '2' }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 인덱스 1: 콜백 실행',
    explanation: "콜백이 x = 2로 불립니다. seenB에 '2'를 넣고 계속합니다.",
    line: { from: 10, to: 11 },
    state: loopState(LCb, 3, CB1, ['1', '2'], {
      k: 1,
      check: NC,
      read: '2',
      callback: "seenB.push('2')",
      returned: FALSE_CONT,
    }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 인덱스 2: 확인 없이 읽기 (length 밖)',
    explanation:
      '인덱스 2는 pop이 지워 프로퍼티가 없고 length 밖이지만 find는 확인하지 않고 Get을 하므로 undefined를 읽습니다. forEach였다면 이 인덱스에서 HasProperty가 false라 콜백을 부르지 않습니다(「pop·shift 뒤의 인덱스」 시나리오).',
    line: at(9),
    state: loopState(LCb, 3, CB1, ['1', '2'], { k: 2, check: NC, read: 'undefined' }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b 인덱스 2: 콜백 실행',
    explanation:
      "콜백이 x = undefined로 불려 String(x)인 'undefined'를 seenB에 넣습니다. 반환값이 없으므로 계속합니다.",
    line: { from: 10, to: 11 },
    state: loopState(LCb, 3, CB1, ['1', '2', 'undefined'], {
      k: 2,
      check: NC,
      read: 'undefined',
      callback: "seenB.push('undefined')",
      returned: FALSE_CONT,
    }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: 'b.find 끝',
    explanation:
      '인덱스 3이 고정한 길이 3에 닿았고 truthy를 돌려준 콜백이 없으므로 undefined를 돌려줍니다.',
    line: at(9),
    state: loopState(LCb, 3, CB1, ['1', '2', 'undefined'], {
      k: 3,
      outcome: '인덱스 3이 고정한 길이 3에 닿아 끝, 못 찾아 undefined 반환',
    }),
    output: ['0:1 1:undefined 2:3'],
  },
  {
    title: '출력: 1 2 undefined',
    explanation: `13번 줄은 seenB를 공백으로 이어 출력합니다. 지금 length가 2인데도 세 번 방문했습니다. ${consoleNote}`,
    line: at(13),
    state: afterLoop(arr('b', ['1', '2']), ['1', '2', 'undefined'], 'seenB'),
    output: ['0:1 1:undefined 2:3', '1 2 undefined'],
  },
]

export const scenarios: Scenario<LoopState>[] = [
  {
    id: 'push-during-foreach',
    label: 'push한 요소는 방문하지 않는다',
    exampleId: 'push-during-foreach',
    code: pushDuringForeachCode,
    steps: pushSteps,
  },
  {
    id: 'remove-during-foreach',
    label: 'pop·shift 뒤의 인덱스',
    exampleId: 'remove-during-foreach',
    code: removeDuringForeachCode,
    steps: removeSteps,
  },
  {
    id: 'find-reads-missing-index',
    label: 'find는 프로퍼티가 없는 인덱스도 읽는다',
    exampleId: 'find-reads-missing-index',
    code: findReadsMissingIndexCode,
    steps: findSteps,
  },
]
