import type { Scenario, Step } from '~/simulator/types'
import finallyReturnCode from './examples/finally-return.js?raw'
import valueFixedCode from './examples/value-fixed.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 실행 컨텍스트 스택. 아래(먼저 쌓인 것) → 위(지금 실행 중). '전역 코드', '<함수 이름>'
// - vars: 지금 실행 중인 함수의 지역 변수. 값은 표시용 문자열이며 문자열은 따옴표를 붙인다('try')
// - tryResult / finallyResult: try 블록·finally 블록이 끝난 완료. 아직 끝나지 않았으면 null
// - result: try 문 전체의 완료. 아직 정해지지 않았으면 null
// - Completion은 명세가 동작을 설명하려고 쓰는 장치다. kind가 'normal'이면 value는 null이다.
//   함수가 돌아오면 그 함수의 try 문 상태(vars, 완료)는 비운다

export type Completion = { kind: 'normal' | 'return' | 'throw'; value: string | null }

export type TryState = {
  stack: string[]
  vars: { name: string; value: string }[]
  tryResult: Completion | null
  finallyResult: Completion | null
  result: Completion | null
}

type TStep = Step<TryState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const normal: Completion = { kind: 'normal', value: null }
const ret = (value: string): Completion => ({ kind: 'return', value })

const state = (
  stack: string[],
  vars: TryState['vars'],
  tryResult: Completion | null,
  finallyResult: Completion | null,
  result: Completion | null,
): TryState => ({ stack, vars, tryResult, finallyResult, result })

const G = '전역 코드'

// --- 1. finally의 return이 덮는다 --------------------------------------------------------------

const PICK = [G, 'pick']

const overrideSteps: TStep[] = [
  {
    title: '실행 시작',
    explanation:
      '전역 코드가 시작되면 pick 함수 선언의 함수 객체가 만들어집니다. 아직 pick을 부르지 않았으므로 실행 컨텍스트 스택에는 전역 코드만 있고, try 문도 실행되지 않았습니다.',
    line: range(1, 8),
    state: state([G], [], null, null, null),
    output: [],
  },
  {
    title: 'pick() 호출',
    explanation:
      'console.log의 인자 pick()을 평가하려고 pick을 부릅니다. pick의 실행 컨텍스트가 스택에 쌓이고, 본문의 try 문이 실행됩니다.',
    line: at(8),
    state: state(PICK, [], null, null, null),
    output: [],
  },
  {
    title: "return 'try'",
    explanation:
      "try 블록의 return 'try'는 식을 평가한 값 'try'를 담은 return 완료로 try 블록을 끝냅니다. 완료는 명세가 블록이 어떻게 끝났는지를 나타내려고 쓰는 설명 장치입니다. 함수는 아직 돌아가지 않았고, try 문은 finally 블록을 실행하러 갑니다.",
    line: at(3),
    state: state(PICK, [], ret("'try'"), null, null),
    output: [],
  },
  {
    title: 'finally 블록 시작',
    explanation:
      "try 블록이 return 완료로 끝나도 try 문은 finally 블록을 실행합니다. 이때 try 블록의 완료 return 'try'는 그대로 두고, finally 블록이 끝난 뒤 이 완료를 쓸지 정합니다.",
    line: at(4),
    state: state(PICK, [], ret("'try'"), null, null),
    output: [],
  },
  {
    title: "return 'finally'",
    explanation:
      "finally 블록의 return 'finally'는 finally 블록을 return 완료 'finally'로 끝냅니다. 정상 완료가 아닌 완료로 끝났습니다.",
    line: at(5),
    state: state(PICK, [], ret("'try'"), ret("'finally'"), null),
    output: [],
  },
  {
    title: 'try 문의 결과가 정해짐',
    explanation:
      "finally 블록의 완료가 정상 완료가 아니므로, try 문의 결과는 앞선 try 블록의 완료가 아니라 finally 블록의 완료입니다. 그래서 try 블록의 return 'try'는 버려지고 try 문 전체가 return 완료 'finally'로 끝납니다.",
    line: range(2, 6),
    state: state(PICK, [], ret("'try'"), ret("'finally'"), ret("'finally'")),
    output: [],
  },
  {
    title: "pick()이 'finally'를 돌려줌",
    explanation:
      "try 문의 결과가 return 완료이므로 pick은 그 값 'finally'를 돌려주며 끝나고, pick의 실행 컨텍스트가 스택에서 빠집니다. 호출한 쪽인 전역 코드가 이어서 실행됩니다.",
    line: at(8),
    state: state([G], [], null, null, null),
    output: [],
  },
  {
    title: 'console.log(pick())',
    explanation:
      "console.log가 pick()이 돌려준 값을 출력합니다. try의 return 'try'는 결과가 되지 못했으므로 finally가 찍힙니다. console은 ECMAScript 언어가 아니라 호스트가 제공하는 API입니다.",
    line: at(8),
    state: state([G], [], null, null, null),
    output: ['finally'],
  },
]

// --- 2. return 값은 이미 정해져 있다 -----------------------------------------------------------

const KEEP = [G, 'keep']

const fixedSteps: TStep[] = [
  {
    title: '실행 시작',
    explanation:
      '전역 코드가 시작되면 keep 함수 선언의 함수 객체가 만들어집니다. 아직 keep을 부르지 않았으므로 실행 컨텍스트 스택에는 전역 코드만 있고, 지역 변수도 없고 try 문도 실행되지 않았습니다.',
    line: range(1, 10),
    state: state([G], [], null, null, null),
    output: [],
  },
  {
    title: 'keep() 호출',
    explanation:
      'console.log의 인자 keep()을 평가하려고 keep을 부릅니다. keep의 실행 컨텍스트가 쌓이고, var로 선언한 x는 본문을 실행하기 전에 undefined로 만들어져 있습니다.',
    line: at(10),
    state: state(KEEP, [{ name: 'x', value: 'undefined' }], null, null, null),
    output: [],
  },
  {
    title: 'var x = 1',
    explanation: 'x에 1을 대입합니다. 지역 변수 x의 값이 1이 됩니다.',
    line: at(2),
    state: state(KEEP, [{ name: 'x', value: '1' }], null, null, null),
    output: [],
  },
  {
    title: 'return x',
    explanation:
      'return x는 식 x를 평가해 얻은 값 1을 담은 return 완료로 try 블록을 끝냅니다. 완료에는 변수 x가 아니라 평가한 값 1이 들어 있습니다. 완료는 명세의 설명 장치입니다.',
    line: at(4),
    state: state(KEEP, [{ name: 'x', value: '1' }], ret('1'), null, null),
    output: [],
  },
  {
    title: 'finally 블록 시작',
    explanation:
      'try 블록이 return 완료로 끝나도 try 문은 finally 블록을 실행합니다. try 블록의 완료 return 1은 그대로 두고 finally 블록을 실행합니다.',
    line: at(5),
    state: state(KEEP, [{ name: 'x', value: '1' }], ret('1'), null, null),
    output: [],
  },
  {
    title: 'x = 2',
    explanation:
      '재할당은 변수 x의 값만 2로 바꿉니다. 이미 정해진 try 블록의 완료 return 1은 바뀌지 않습니다.',
    line: at(6),
    state: state(KEEP, [{ name: 'x', value: '2' }], ret('1'), null, null),
    output: [],
  },
  {
    title: "console.log('finally x = ' + x)",
    explanation: '변수 x는 이제 2이므로 finally x = 2가 출력됩니다. 완료의 값은 여전히 1입니다.',
    line: at(7),
    state: state(KEEP, [{ name: 'x', value: '2' }], ret('1'), null, null),
    output: ['finally x = 2'],
  },
  {
    title: 'finally 블록이 정상 완료',
    explanation:
      'finally 블록은 정상이 아닌 완료를 만들지 않고 끝났으므로 정상 완료입니다. finally 블록의 완료가 정상 완료이면 try 문의 결과는 앞선 try 블록의 완료이므로, try 문 전체가 return 완료 1로 끝납니다.',
    line: range(5, 8),
    state: state(KEEP, [{ name: 'x', value: '2' }], ret('1'), normal, ret('1')),
    output: ['finally x = 2'],
  },
  {
    title: 'keep()이 1을 돌려줌',
    explanation:
      'try 문의 결과가 return 완료 1이므로 keep은 1을 돌려주며 끝나고, keep의 실행 컨텍스트가 스택에서 빠집니다. 지역 변수 x가 2로 바뀌었어도 돌려준 값은 완료에 담긴 1입니다.',
    line: at(10),
    state: state([G], [], null, null, null),
    output: ['finally x = 2'],
  },
  {
    title: 'console.log(keep())',
    explanation:
      'console.log가 keep()이 돌려준 값 1을 출력합니다. 재할당 x = 2는 반환값에 영향을 주지 못했습니다.',
    line: at(10),
    state: state([G], [], null, null, null),
    output: ['finally x = 2', '1'],
  },
]

export const scenarios: Scenario<TryState>[] = [
  {
    id: 'override',
    label: 'finally의 return이 덮는다',
    exampleId: 'finally-return',
    code: finallyReturnCode,
    steps: overrideSteps,
  },
  {
    id: 'fixed',
    label: 'return 값은 이미 정해져 있다',
    exampleId: 'value-fixed',
    code: valueFixedCode,
    steps: fixedSteps,
  },
]
