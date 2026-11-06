import type { Scenario, Step } from '~/simulator/types'
import liveBindingCode from './examples/live-binding.html?raw'
import cycleBCode from './examples/cycle-b.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - phase: 모듈이 지나는 큰 단계. 로드 → 링크 → 평가
// - modules: 모듈마다 카드 하나. file은 'main(인라인)'처럼 사람이 읽는 이름이다
//   - local 바인딩: 그 모듈 환경이 가진 바인딩. value가 null이면 초기화 전(let·const·class의 초기화 전 상태)
//   - import 바인딩: 값 필드가 없다. from 모듈의 target 바인딩을 가리키며, 뷰가 따라가 대상의 값을 그린다
//     (값이 두 곳에 있는 것처럼 보이지 않게 하려는 설계다)
// - running: 코드 패널에 없는 파일에서 지금 실행 중인 코드. 코드 패널의 파일이 실행 중이면 null이고 step.line을 쓴다
//   (live의 inc() 호출 단계는 line이 호출한 줄, running이 호출된 함수 안의 코드다)
// 이 상태는 명세의 간접 바인딩을 설명하는 그림이며, 엔진 내부 구조가 아니다

export type Phase = '로드' | '링크' | '평가'
export type LocalBinding = { name: string; kind: 'local'; value: string | null }
export type ImportBinding = { name: string; kind: 'import'; from: string; target: string }
export type ModuleCard = {
  file: string
  status: '로드됨' | '링크됨' | '평가 중' | '평가 완료'
  bindings: (LocalBinding | ImportBinding)[]
}
export type ModuleState = {
  phase: Phase
  modules: ModuleCard[]
  running: { file: string; code: string } | null
}

type MStep = Step<ModuleState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

const local = (name: string, value: string | null): LocalBinding => ({
  name,
  kind: 'local',
  value,
})
const imp = (name: string, from: string, target: string = name): ImportBinding => ({
  name,
  kind: 'import',
  from,
  target,
})
const card = (
  file: string,
  status: ModuleCard['status'],
  bindings: ModuleCard['bindings'] = [],
): ModuleCard => ({ file, status, bindings })

const MAIN = 'main(인라인)'

// --- 1. 라이브 바인딩 (live-binding.html) ---------------------------------------------------------
// 코드 패널은 live-binding.html. 줄 번호: 6 import, 7 console.log(count), 8 inc(), 9 console.log(count)

const COUNTER = 'counter.js'
const FN_INC = '함수 inc'

const liveSteps: MStep[] = [
  {
    title: '실행 시작',
    explanation:
      '인라인 type="module" 스크립트가 모듈로 처리됩니다. 이 모듈은 ./counter.js에서 count와 inc를 import합니다. 아직 어느 모듈의 코드도 실행되지 않았고, 모듈 환경도 만들어지지 않았습니다.',
    line: range(6, 9),
    state: { phase: '로드', modules: [card(MAIN, '로드됨')], running: null },
    output: [],
  },
  {
    title: 'counter.js 로드',
    explanation:
      '로드 단계에서 main이 요청한 ./counter.js를 불러와 모듈로 만듭니다. URL로 같은 모듈을 찾아 주는 것은 HTML의 모듈 맵이 맡습니다. 이 단계에서는 어느 코드도 실행하지 않습니다.',
    line: at(6),
    state: {
      phase: '로드',
      modules: [card(MAIN, '로드됨'), card(COUNTER, '로드됨')],
      running: null,
    },
    output: [],
  },
  {
    title: '링크: 바인딩 만들기',
    explanation:
      '링크 단계에서 각 모듈의 환경에 바인딩이 만들어집니다. counter.js의 count는 let으로 선언되어 바인딩은 있지만 아직 초기화 전이고, 함수 선언 inc는 이 단계에서 함수로 초기화됩니다. main의 count와 inc는 값을 가진 바인딩이 아니라 counter.js의 같은 이름 바인딩을 가리키는 간접 바인딩입니다. 값은 counter.js의 바인딩에만 있습니다.',
    line: at(6),
    state: {
      phase: '링크',
      modules: [
        card(MAIN, '링크됨', [imp('count', COUNTER), imp('inc', COUNTER)]),
        card(COUNTER, '링크됨', [local('count', null), local('inc', FN_INC)]),
      ],
      running: null,
    },
    output: [],
  },
  {
    title: 'counter.js 평가: count = 0',
    explanation:
      '평가 단계에서는 main이 import한 counter.js가 먼저 평가됩니다. counter.js의 export let count = 0; 가 실행되어 count 바인딩이 초기화 전에서 0이 됩니다. main의 count는 이 바인딩을 가리키고 있으므로, 읽으면 0이 보입니다.',
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 중', [imp('count', COUNTER), imp('inc', COUNTER)]),
        card(COUNTER, '평가 완료', [local('count', '0'), local('inc', FN_INC)]),
      ],
      running: { file: COUNTER, code: 'export let count = 0;' },
    },
    output: [],
  },
  {
    title: 'console.log(count)',
    explanation:
      'main이 count를 읽으면 간접 바인딩을 따라 counter.js의 count 바인딩 값을 읽습니다. 지금 값은 0이므로 0이 출력됩니다.',
    line: at(7),
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 중', [imp('count', COUNTER), imp('inc', COUNTER)]),
        card(COUNTER, '평가 완료', [local('count', '0'), local('inc', FN_INC)]),
      ],
      running: null,
    },
    output: ['0'],
  },
  {
    title: 'inc() 호출: count += 1',
    explanation:
      'main이 inc()를 부르면 inc는 counter.js 안에서 count += 1을 실행합니다. 바뀐 것은 counter.js의 count 바인딩 하나뿐입니다. main의 count는 여전히 같은 바인딩을 가리킬 뿐이어서 따로 바뀌는 칸이 없습니다.',
    line: at(8),
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 중', [imp('count', COUNTER), imp('inc', COUNTER)]),
        card(COUNTER, '평가 완료', [local('count', '1'), local('inc', FN_INC)]),
      ],
      running: { file: COUNTER, code: 'count += 1;' },
    },
    output: ['0'],
  },
  {
    title: 'console.log(count) 다시',
    explanation:
      '같은 count를 다시 읽으면 대상 바인딩의 지금 값 1이 보입니다. main이 대입한 것이 아니라(import한 이름에 대입하면 TypeError입니다) export한 모듈 안에서 값이 바뀐 것입니다. 이처럼 바뀐 값이 보이는 성질을 라이브 바인딩이라고 부릅니다.',
    line: at(9),
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 중', [imp('count', COUNTER), imp('inc', COUNTER)]),
        card(COUNTER, '평가 완료', [local('count', '1'), local('inc', FN_INC)]),
      ],
      running: null,
    },
    output: ['0', '1'],
  },
  {
    title: '평가 끝',
    explanation:
      'main의 평가가 끝나 모든 모듈이 평가 완료 상태가 되었습니다. 출력은 0, 1입니다. 각 모듈은 한 번만 평가되고, 이후에도 count를 읽을 때마다 counter.js의 count 바인딩 값이 보입니다.',
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 완료', [imp('count', COUNTER), imp('inc', COUNTER)]),
        card(COUNTER, '평가 완료', [local('count', '1'), local('inc', FN_INC)]),
      ],
      running: null,
    },
    output: ['0', '1'],
  },
]

// --- 2. 순환 import와 초기화 전 (cycle-tdz.html) ---------------------------------------------------
// 코드 패널은 cycle-b.js (줄 번호: 1 import, 2 console.log('b 본문', hello()), 3~7 try/catch, 8 export const fromB)
// 다른 파일(main(인라인), cycle-a.js)이 실행되는 단계는 line을 생략하고 running으로 그 코드를 보인다

const A = 'cycle-a.js'
const B = 'cycle-b.js'
const HELLO = '함수 hello'

const cyclePending: ModuleCard[] = [card(MAIN, '로드됨'), card(A, '로드됨'), card(B, '로드됨')]

const aLinked = (value: string | null, status: ModuleCard['status']): ModuleCard =>
  card(A, status, [local('value', value), local('hello', HELLO), imp('fromB', B)])
const bLinked = (fromB: string | null, status: ModuleCard['status']): ModuleCard =>
  card(B, status, [imp('value', A), imp('hello', A), local('fromB', fromB)])

const cycleSteps: MStep[] = [
  {
    title: '실행 시작',
    explanation:
      '메인 모듈은 ./cycle-a.js를 import합니다. cycle-a.js는 cycle-b.js를 import하고, cycle-b.js는 다시 cycle-a.js를 import하는 순환입니다. 코드 패널에는 cycle-b.js를 보입니다. 아직 어느 코드도 실행되지 않았습니다.',
    state: { phase: '로드', modules: [card(MAIN, '로드됨')], running: null },
    output: [],
  },
  {
    title: '세 모듈 로드',
    explanation:
      '로드 단계에서 main이 cycle-a.js를, cycle-a.js가 cycle-b.js를 요청합니다. cycle-b.js의 import가 가리키는 cycle-a.js는 이미 요청된 같은 모듈이어서 다시 만들지 않습니다. 이 단계에서는 코드를 실행하지 않습니다.',
    line: at(1),
    state: { phase: '로드', modules: cyclePending, running: null },
    output: [],
  },
  {
    title: '링크: 바인딩 만들기',
    explanation:
      '링크 단계에서 환경이 만들어집니다. cycle-a.js의 let value와 cycle-b.js의 const fromB는 바인딩만 있고 초기화 전이며, 함수 선언 hello는 이 단계에서 함수로 초기화됩니다. cycle-b.js의 value와 hello는 cycle-a.js의 바인딩을 가리키는 간접 바인딩이고, cycle-a.js의 fromB도 cycle-b.js의 바인딩을 가리킵니다. 순환이어도 링크는 끝납니다.',
    line: at(1),
    state: {
      phase: '링크',
      modules: [card(MAIN, '링크됨'), aLinked(null, '링크됨'), bLinked(null, '링크됨')],
      running: null,
    },
    output: [],
  },
  {
    title: '평가 시작: cycle-b.js가 먼저',
    explanation:
      '평가는 import 의존을 따라 깊이 우선으로 내려갑니다. main에서 cycle-a.js로, cycle-a.js에서 cycle-b.js로 내려가고, cycle-b.js의 의존인 cycle-a.js는 이미 평가 중이라 다시 내려가지 않습니다. 그래서 가장 안쪽인 cycle-b.js의 본문이 먼저 실행됩니다. 이 시점에 cycle-a.js의 value는 아직 초기화 전입니다.',
    state: {
      phase: '평가',
      modules: [card(MAIN, '평가 중'), aLinked(null, '평가 중'), bLinked(null, '평가 중')],
      running: null,
    },
    output: [],
  },
  {
    title: "console.log('b 본문', hello())",
    explanation:
      'hello는 링크 단계에서 이미 함수로 초기화되어 있으므로 cycle-a.js의 평가가 끝나기 전에도 호출할 수 있습니다. hello()는 문자열 hello를 돌려주고 b 본문 hello가 출력됩니다.',
    line: at(2),
    state: {
      phase: '평가',
      modules: [card(MAIN, '평가 중'), aLinked(null, '평가 중'), bLinked(null, '평가 중')],
      running: null,
    },
    output: ['b 본문 hello'],
  },
  {
    title: 'console.log(value): 초기화 전',
    explanation:
      'value는 cycle-a.js의 let 바인딩을 가리키는데, 그 바인딩은 아직 초기화 전입니다. 초기화 전 바인딩을 읽으면 ReferenceError가 던져집니다. 이 try 블록의 console.log(value)는 값을 찍지 못하고 예외로 끝납니다.',
    line: at(4),
    state: {
      phase: '평가',
      modules: [card(MAIN, '평가 중'), aLinked(null, '평가 중'), bLinked(null, '평가 중')],
      running: null,
    },
    output: ['b 본문 hello'],
  },
  {
    title: 'catch: 에러 이름 출력',
    explanation:
      'catch 블록이 예외를 받아 e.name을 출력합니다. 대상 바인딩이 아직 초기화 전이라서 난 ReferenceError이고, 링크는 이미 성공했습니다.',
    line: at(6),
    state: {
      phase: '평가',
      modules: [card(MAIN, '평가 중'), aLinked(null, '평가 중'), bLinked(null, '평가 중')],
      running: null,
    },
    output: ['b 본문 hello', 'ReferenceError'],
  },
  {
    title: "export const fromB = 'b의 값'",
    explanation:
      'cycle-b.js의 마지막 줄이 실행되어 fromB 바인딩이 초기화 전에서 b의 값이 됩니다. cycle-b.js의 평가가 끝납니다.',
    line: at(8),
    state: {
      phase: '평가',
      modules: [card(MAIN, '평가 중'), aLinked(null, '평가 중'), bLinked("'b의 값'", '평가 완료')],
      running: null,
    },
    output: ['b 본문 hello', 'ReferenceError'],
  },
  {
    title: "cycle-a.js: value = 'a의 값'",
    explanation:
      '이제 cycle-a.js의 본문이 실행됩니다. export let value 선언이 실행되어 value 바인딩이 초기화 전에서 a의 값이 됩니다. cycle-b.js가 이 바인딩을 가리키고 있으므로 이제부터는 value를 읽을 수 있습니다. 코드 패널은 cycle-b.js이므로 이 줄은 아래 실행 중인 코드로 보입니다.',
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 중'),
        aLinked("'a의 값'", '평가 중'),
        bLinked("'b의 값'", '평가 완료'),
      ],
      running: { file: A, code: "export let value = 'a의 값';" },
    },
    output: ['b 본문 hello', 'ReferenceError'],
  },
  {
    title: "cycle-a.js: console.log('a 본문', fromB)",
    explanation:
      'cycle-a.js의 fromB는 cycle-b.js의 바인딩을 가리키고, 그 바인딩은 이미 초기화되었으므로 b의 값을 읽습니다. a 본문 b의 값이 출력되고 cycle-a.js의 평가가 끝납니다.',
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 중'),
        aLinked("'a의 값'", '평가 완료'),
        bLinked("'b의 값'", '평가 완료'),
      ],
      running: { file: A, code: "console.log('a 본문', fromB);" },
    },
    output: ['b 본문 hello', 'ReferenceError', 'a 본문 b의 값'],
  },
  {
    title: "main: console.log('main')",
    explanation:
      '마지막으로 main 자신의 본문이 실행되어 main이 출력됩니다. 평가 순서는 cycle-b.js, cycle-a.js, main입니다.',
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 완료'),
        aLinked("'a의 값'", '평가 완료'),
        bLinked("'b의 값'", '평가 완료'),
      ],
      running: { file: MAIN, code: "console.log('main');" },
    },
    output: ['b 본문 hello', 'ReferenceError', 'a 본문 b의 값', 'main'],
  },
  {
    title: '평가 끝',
    explanation:
      '모든 모듈의 평가가 끝났습니다. 순환 import에서도 함수 선언은 링크 단계에서 초기화되어 먼저 호출할 수 있었고, let·const는 자기 모듈의 선언이 평가되기 전에는 초기화 전이어서 읽으면 ReferenceError가 났습니다.',
    state: {
      phase: '평가',
      modules: [
        card(MAIN, '평가 완료'),
        aLinked("'a의 값'", '평가 완료'),
        bLinked("'b의 값'", '평가 완료'),
      ],
      running: null,
    },
    output: ['b 본문 hello', 'ReferenceError', 'a 본문 b의 값', 'main'],
  },
]

export const scenarios: Scenario<ModuleState>[] = [
  {
    id: 'live',
    label: '라이브 바인딩',
    exampleId: 'live-binding',
    code: liveBindingCode,
    steps: liveSteps,
  },
  {
    id: 'cycle',
    label: '순환 import와 초기화 전',
    exampleId: 'cycle-tdz',
    // 코드 패널은 순환 모듈 중 cycle-b.js 하나만 보인다(main은 인라인이고 cycle-a.js는 running으로 보인다)
    code: cycleBCode,
    steps: cycleSteps,
  },
]
