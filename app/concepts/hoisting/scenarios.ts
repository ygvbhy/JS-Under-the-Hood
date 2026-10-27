import type { LineRange, Scenario, Step } from '~/simulator/types'
import declVsExprCode from './examples/decl-vs-expr.js?raw'
import sameNameCode from './examples/same-name.js?raw'
import varBeforeCode from './examples/var-before.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// phase는 진행 단계(실행 전 / 선언 처리 / 실행), bindings는 선언으로 만들어진 바인딩을 생긴 순서대로 담는다.
// `changed`는 "그 단계에서" 새로 생기거나 값이 바뀐 이름에만 붙이고, 다음 단계에서는 해제한다.

export type Val =
  | { type: 'undefined' | 'number'; display: string }
  | { type: 'function'; display: string; source: LineRange } // display: 원문 첫 줄 + ' … }'(한 줄 함수는 원문 그대로), source: 함수 원문이 있는 줄 범위
export type Binding = {
  name: string
  declaredBy: 'var' | 'function' // 이 이름을 만든 선언
  value: Val
  changed?: 'created' | 'updated' // 그 단계에서 새로 생김 / 값이 바뀜(다음 단계에서 해제)
}
export type HoistState = { phase: 'before' | 'declare' | 'run'; bindings: Binding[] }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const undef: Val = { type: 'undefined', display: 'undefined' }
const fn = (display: string, source: LineRange): Val => ({ type: 'function', display, source })

const bind = (
  name: string,
  declaredBy: Binding['declaredBy'],
  value: Val,
  changed?: Binding['changed'],
): Binding => ({
  name,
  declaredBy,
  value,
  ...(changed && { changed }),
})

const at = (n: number): LineRange => ({ from: n, to: n })
const lines = (from: number, to: number): LineRange => ({ from, to })

type HoistStep = Step<HoistState>

const before: HoistState = { phase: 'before', bindings: [] }
const declare = (...bindings: Binding[]): HoistState => ({ phase: 'declare', bindings })
const run = (...bindings: Binding[]): HoistState => ({ phase: 'run', bindings })

const intro =
  '코드를 실행하기 전입니다. 스크립트를 실행하면 먼저 선언을 처리해 바인딩(이름과 값의 연결)을 만들고, 그다음 코드를 위에서부터 실행합니다. 이 시각화는 선언으로 만들어진 바인딩과 그 값을 보여 줍니다.'

// --- 시나리오 1: var 선언 전 참조 ---------------------------------------------------------------

const varBeforeSteps: HoistStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '선언 처리: var score',
    explanation:
      '선언 처리 단계에서 var score 선언으로 score 바인딩을 만들고 undefined로 초기화합니다. = 10 대입은 이 단계에서 하지 않습니다.',
    line: at(2),
    state: declare(bind('score', 'var', undef, 'created')),
    output: [],
  },
  {
    title: '실행: score 출력',
    explanation:
      '이제 실행 단계입니다. 1번 줄은 score의 값을 읽어 console.log에 넘깁니다. score는 선언 처리에서 undefined로 초기화되었고 아직 대입이 일어나지 않았으므로 undefined가 출력됩니다.',
    line: at(1),
    state: run(bind('score', 'var', undef)),
    output: ['undefined'],
  },
  {
    title: '실행: score에 10 대입',
    explanation:
      'var score = 10의 바인딩은 선언 처리에서 이미 만들어졌으므로, 실행 단계에서는 10을 score에 대입하기만 합니다. 대입은 실행이 이 줄에 도달해야 일어납니다.',
    line: at(2),
    state: run(bind('score', 'var', num(10), 'updated')),
    output: ['undefined'],
  },
  {
    title: '실행: score 출력',
    explanation: '3번 줄은 score를 읽습니다. 이제 score는 10이므로 10이 출력됩니다.',
    line: at(3),
    state: run(bind('score', 'var', num(10))),
    output: ['undefined', '10'],
  },
]

// --- 시나리오 2: 함수 선언과 함수 표현식 --------------------------------------------------------

const doubleFn = fn('function double(n) { … }', lines(4, 6))
const tripleFn = fn('function (n) { … }', lines(8, 10))

const declVsExprSteps: HoistStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '선언 처리: function double',
    explanation:
      '함수 선언은 선언 처리 단계에서 함수 객체를 만들고, double 바인딩을 만들어 그 함수로 초기화합니다.',
    line: lines(4, 6),
    state: declare(bind('double', 'function', doubleFn, 'created')),
    output: [],
  },
  {
    title: '선언 처리: var triple',
    explanation:
      'var triple 선언으로 triple 바인딩을 만들고 undefined로 초기화합니다. = 뒤의 함수 표현식은 아직 평가하지 않으므로 triple에는 함수가 들어 있지 않습니다.',
    line: lines(8, 10),
    state: declare(bind('double', 'function', doubleFn), bind('triple', 'var', undef, 'created')),
    output: [],
  },
  {
    title: '실행: double(4) 호출',
    explanation:
      '실행 단계입니다. double은 선언 처리에서 이미 함수로 초기화되었으므로 선언문보다 앞에서도 호출할 수 있고, 결과 8이 출력됩니다. 호출 내부 과정은 한 단계로 묶어 보여 줍니다.',
    line: at(1),
    state: run(bind('double', 'function', doubleFn), bind('triple', 'var', undef)),
    output: ['8'],
  },
  {
    title: '실행: typeof triple 출력',
    explanation:
      '이 시점의 triple은 undefined입니다. 함수 표현식을 아직 평가하지 않았으므로 typeof triple은 문자열 undefined이고, 그것이 출력됩니다.',
    line: at(2),
    state: run(bind('double', 'function', doubleFn), bind('triple', 'var', undef)),
    output: ['8', 'undefined'],
  },
  {
    title: '실행: 함수 선언문 지나감',
    explanation:
      '맨 바깥의 함수 선언문은 실행 단계에서 아무 일도 하지 않고 지나갑니다. double 바인딩은 선언 처리에서 이미 함수로 초기화되었습니다.',
    line: lines(4, 6),
    state: run(bind('double', 'function', doubleFn), bind('triple', 'var', undef)),
    output: ['8', 'undefined'],
  },
  {
    title: '실행: triple에 함수 대입',
    explanation:
      '이 줄에 도달하면 함수 표현식을 평가해 함수 객체를 만들고 triple에 대입합니다. 이제 triple의 값은 함수입니다.',
    line: lines(8, 10),
    state: run(bind('double', 'function', doubleFn), bind('triple', 'var', tripleFn, 'updated')),
    output: ['8', 'undefined'],
  },
  {
    title: '실행: triple(3) 호출',
    explanation: 'triple은 이제 함수이므로 triple(3)을 호출할 수 있고, 결과 9가 출력됩니다.',
    line: at(12),
    state: run(bind('double', 'function', doubleFn), bind('triple', 'var', tripleFn)),
    output: ['8', 'undefined', '9'],
  },
]

// --- 시나리오 3: 같은 이름의 var와 함수 ---------------------------------------------------------

const itemFn = fn('function item() {}', at(3))

const sameNameSteps: HoistStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '선언 처리: function item',
    explanation:
      '선언 처리에서 함수 선언 item은 함수 객체를 만들고, item 바인딩을 그 함수로 초기화합니다. 명세는 함수 선언과 이름이 같은 var 선언(2번 줄의 var item)을 바인딩을 만들 목록에서 빼므로, item을 undefined로 초기화하는 일은 일어나지 않습니다.',
    line: at(3),
    state: declare(bind('item', 'function', itemFn, 'created')),
    output: [],
  },
  {
    title: '실행: typeof item 출력',
    explanation:
      '실행 단계에서 1번 줄은 item의 값을 읽습니다. 아직 대입이 일어나지 않아 item의 값은 함수이므로 typeof item은 문자열 function입니다.',
    line: at(1),
    state: run(bind('item', 'function', itemFn)),
    output: ['function'],
  },
  {
    title: '실행: item에 1 대입',
    explanation:
      'var item = 1의 대입이 실행됩니다. var item 선언이 바인딩을 따로 만들지 않았어도, 대입은 같은 이름의 item 바인딩에 일어납니다. 이제 item의 값은 함수 대신 숫자 1입니다.',
    line: at(2),
    state: run(bind('item', 'function', num(1), 'updated')),
    output: ['function'],
  },
  {
    title: '실행: 함수 선언문 지나감',
    explanation:
      '맨 바깥의 함수 선언문은 실행 단계에서 아무 일도 하지 않습니다. 그래서 item의 값은 1 그대로입니다.',
    line: at(3),
    state: run(bind('item', 'function', num(1))),
    output: ['function'],
  },
  {
    title: '실행: typeof item 출력',
    explanation: '4번 줄에서 item은 숫자 1이므로 typeof item은 문자열 number입니다.',
    line: at(4),
    state: run(bind('item', 'function', num(1))),
    output: ['function', 'number'],
  },
]

export const scenarios: Scenario<HoistState>[] = [
  {
    id: 'var-before',
    label: 'var 선언 전 참조',
    exampleId: 'var-before',
    code: varBeforeCode,
    steps: varBeforeSteps,
  },
  {
    id: 'decl-vs-expr',
    label: '함수 선언과 함수 표현식',
    exampleId: 'decl-vs-expr',
    code: declVsExprCode,
    steps: declVsExprSteps,
  },
  {
    id: 'same-name',
    label: '같은 이름의 var와 함수',
    exampleId: 'same-name',
    code: sameNameCode,
    steps: sameNameSteps,
  },
]
