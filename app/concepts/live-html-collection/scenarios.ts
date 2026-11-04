import type { Scenario, Step } from '~/simulator/types'
import liveLoopCode from './examples/live-loop.html?raw'
import staticLoopCode from './examples/static-loop.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - classes: li 4개(문서 순서)의 class 값
// - collection: todos에 든 li 번호(0부터). todos를 만들기 전(15번 줄 전)에는 null
// - i: 반복 변수. 반복문에 들어가기 전에는 null
// - target: 이번 단계(22번 줄)에서 클래스를 바꾸는 li 번호
// - check: 반복 조건을 평가하는 단계(21번 줄)의 값

export type ClassName = 'todo' | 'done'

export type CollectionState = {
  kind: 'live' | 'static'
  classes: ClassName[]
  collection: number[] | null
  i: number | null
  target: number | null
  check: { i: number; length: number; result: boolean } | null
}

type CStep = Step<CollectionState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

export const TASKS = ['청소', '빨래', '설거지', '장보기']

// 'tdtt' 같은 문자열을 클래스 배열로 바꾼다(t = todo, d = done).
const cls = (s: string): ClassName[] => [...s].map((ch) => (ch === 'd' ? 'done' : 'todo'))

const at = (n: number) => ({ from: n, to: n })

const out = (label: string, length: number, classes: string): string =>
  `${label} ${length} ${JSON.stringify(cls(classes))}`

const ALL_TODO = 'tttt'

const base = (kind: 'live' | 'static'): CollectionState => ({
  kind,
  classes: cls(ALL_TODO),
  collection: null,
  i: null,
  target: null,
  check: null,
})

type Extra = Partial<Omit<CollectionState, 'kind' | 'classes'>>

const make = (kind: 'live' | 'static') => {
  const state = (classes: string, extra: Extra = {}): CollectionState => ({
    ...base(kind),
    classes: cls(classes),
    ...extra,
  })
  return { state }
}

const compare = (i: number, length: number): string =>
  `${i} < ${length} → ${i < length ? '참' : '거짓 (반복 끝)'}`

// --- 공통 앞부분(실행 전 ~ 20번 줄) -------------------------------------------------------------

function head(kind: 'live' | 'static'): CStep[] {
  const { state } = make(kind)
  const all = [0, 1, 2, 3]
  const description =
    kind === 'live'
      ? "getElementsByClassName('todo')는 살아 있는 HTMLCollection을 돌려줍니다. 컬렉션에는 지금 todo 클래스를 가진 li 4개가 모두 들어 있습니다."
      : "querySelectorAll('.todo')는 정적인 NodeList를 돌려줍니다. 호출한 시점에 todo 클래스를 가진 li 4개를 담은 목록이 만들어집니다."
  return [
    {
      title: '실행 전',
      explanation: '아직 코드가 실행되지 않았습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
      state: state(ALL_TODO),
      output: [],
    },
    {
      title: "items에 li 4개를 담음 (querySelectorAll('li'))",
      explanation:
        'items는 출력 줄에서 li 4개의 class를 한꺼번에 보기 위한 목록입니다. 이 시각화의 컬렉션(todos)은 아래 15번 줄에서 만들어집니다.',
      line: at(14),
      state: state(ALL_TODO),
      output: [],
    },
    {
      title: `todos를 만듦 (${kind === 'live' ? 'HTMLCollection' : 'NodeList'})`,
      explanation: description,
      line: at(15),
      state: state(ALL_TODO, { collection: all }),
      output: [],
    },
    {
      title: "show('시작'): todos.length는 4",
      explanation:
        'show는 todos.length와 li 4개의 class를 한 줄로 출력합니다. 아직 아무 class도 바꾸지 않았으므로 length는 4, class는 모두 todo입니다.',
      line: at(20),
      state: state(ALL_TODO, { collection: all }),
      output: [out('시작', 4, ALL_TODO)],
    },
  ]
}

// --- 시나리오 1: 살아 있는 HTMLCollection (live-loop.html) -------------------------------------

const live = make('live')

const liveSteps: CStep[] = [
  ...head('live'),
  {
    title: `조건 검사: ${compare(0, 4)}`,
    explanation:
      'for가 i를 0으로 만들고 조건 i < todos.length를 평가합니다. todos.length는 4라서 0 < 4는 참이고 반복 본문으로 들어갑니다.',
    line: at(21),
    state: live.state(ALL_TODO, {
      collection: [0, 1, 2, 3],
      i: 0,
      check: { i: 0, length: 4, result: true },
    }),
    output: [out('시작', 4, ALL_TODO)],
  },
  {
    title: "todos[0].className = 'done': 청소를 done으로 바꿈",
    explanation:
      'todos[0]은 컬렉션의 첫 항목인 청소입니다. class가 done으로 바뀌는 순간 청소는 "todo 클래스를 가진 요소" 조건에서 빠지고, 살아 있는 컬렉션은 그 결과를 바로 반영해 length가 3이 됩니다.',
    line: at(22),
    state: live.state('dttt', { collection: [1, 2, 3], i: 0, target: 0 }),
    output: [out('시작', 4, ALL_TODO)],
  },
  {
    title: "show('i=0'): todos.length는 3",
    explanation:
      '컬렉션이 현재 상태를 그대로 보여 주므로 length는 3입니다. 이제 todos[0]은 청소가 아니라 빨래입니다.',
    line: at(23),
    state: live.state('dttt', { collection: [1, 2, 3], i: 0 }),
    output: [out('시작', 4, ALL_TODO), out('i=0', 3, 'dttt')],
  },
  {
    title: `조건 검사: ${compare(1, 3)}`,
    explanation:
      'i++로 i가 1이 되었고, 살아 있는 컬렉션이라 todos.length는 이미 3입니다. 1 < 3은 참이라 반복이 이어집니다.',
    line: at(21),
    state: live.state('dttt', {
      collection: [1, 2, 3],
      i: 1,
      check: { i: 1, length: 3, result: true },
    }),
    output: [out('시작', 4, ALL_TODO), out('i=0', 3, 'dttt')],
  },
  {
    title: "todos[1].className = 'done': 설거지를 done으로 바꿈",
    explanation:
      '인덱스가 당겨졌으므로 todos[1]은 빨래가 아니라 설거지입니다. 빨래는 todos[0]으로 옮겨 가서 이번 반복에서는 건너뛰어집니다. 설거지가 done이 되면 컬렉션에서 빠져 length는 2가 됩니다.',
    line: at(22),
    state: live.state('dtdt', { collection: [1, 3], i: 1, target: 2 }),
    output: [out('시작', 4, ALL_TODO), out('i=0', 3, 'dttt')],
  },
  {
    title: "show('i=1'): todos.length는 2",
    explanation: '컬렉션에는 todo가 남은 빨래와 장보기, 두 항목만 들어 있어 length는 2입니다.',
    line: at(23),
    state: live.state('dtdt', { collection: [1, 3], i: 1 }),
    output: [out('시작', 4, ALL_TODO), out('i=0', 3, 'dttt'), out('i=1', 2, 'dtdt')],
  },
  {
    title: `조건 검사: ${compare(2, 2)}`,
    explanation:
      'i++로 i가 2가 되었고 todos.length는 2입니다. 2 < 2는 거짓이라 반복이 끝납니다. todo가 두 개 남아 있지만 i가 컬렉션의 length를 따라잡았습니다.',
    line: at(21),
    state: live.state('dtdt', {
      collection: [1, 3],
      i: 2,
      check: { i: 2, length: 2, result: false },
    }),
    output: [out('시작', 4, ALL_TODO), out('i=0', 3, 'dttt'), out('i=1', 2, 'dtdt')],
  },
  {
    title: "show('끝'): 빨래와 장보기는 todo로 남음",
    explanation:
      '4개 중 2개만 done이 되었고, 빨래와 장보기는 todo인 채로 남았습니다. 반복이 항목 4개를 모두 방문하지 않았기 때문입니다.',
    line: at(25),
    state: live.state('dtdt', { collection: [1, 3], i: 2 }),
    output: [
      out('시작', 4, ALL_TODO),
      out('i=0', 3, 'dttt'),
      out('i=1', 2, 'dtdt'),
      out('끝', 2, 'dtdt'),
    ],
  },
]

// --- 시나리오 2: 정적인 NodeList (static-loop.html) --------------------------------------------

const stat = make('static')
const ALL = [0, 1, 2, 3]

// 정적 목록의 반복 하나(조건 검사, 대입, 출력)를 만든다. before는 이 반복 직전의 class, after는 직후의 class.
function staticRound(n: number, before: string, after: string, prevOutput: string[]): CStep[] {
  const name = TASKS[n]
  const printed = [...prevOutput, out(`i=${n}`, 4, after)]
  return [
    {
      title: `조건 검사: ${compare(n, 4)}`,
      explanation:
        n === 0
          ? 'for가 i를 0으로 만들고 조건 i < todos.length를 평가합니다. 정적인 목록의 length는 4이므로 0 < 4는 참입니다.'
          : `i++로 i가 ${n}이 되었습니다. 정적인 목록은 스냅숏이라 class를 바꿔도 length가 4 그대로이므로 ${n} < 4는 참입니다.`,
      line: at(21),
      state: stat.state(before, {
        collection: ALL,
        i: n,
        check: { i: n, length: 4, result: true },
      }),
      output: prevOutput,
    },
    {
      title: `todos[${n}].className = 'done': ${name}의 class를 done으로 바꿈`,
      explanation: `정적인 목록의 인덱스는 처음 만들어진 순서 그대로라서 todos[${n}]은 ${name}입니다. ${name}의 class를 바꿔도 목록에서 빠지지 않습니다.`,
      line: at(22),
      state: stat.state(after, { collection: ALL, i: n, target: n }),
      output: prevOutput,
    },
    {
      title: `show('i=${n}'): todos.length는 여전히 4`,
      explanation: `목록은 호출 시점의 결과이므로 class가 바뀐 뒤에도 length는 4입니다. done이 된 li가 ${n + 1}개로 늘었습니다.`,
      line: at(23),
      state: stat.state(after, { collection: ALL, i: n }),
      output: printed,
    },
  ]
}

const staticOutputs = (rounds: string[]): string[][] => {
  const result: string[][] = [[out('시작', 4, ALL_TODO)]]
  rounds.forEach((classes, n) => {
    result.push([...result[n], out(`i=${n}`, 4, classes)])
  })
  return result
}

const ROUND_CLASSES = ['dttt', 'ddtt', 'dddt', 'dddd']
const outputsByRound = staticOutputs(ROUND_CLASSES)

const staticSteps: CStep[] = [
  ...head('static'),
  ...ROUND_CLASSES.flatMap((after, n) =>
    staticRound(n, n === 0 ? ALL_TODO : ROUND_CLASSES[n - 1], after, outputsByRound[n]),
  ),
  {
    title: `조건 검사: ${compare(4, 4)}`,
    explanation:
      'i++로 i가 4가 되었고 정적인 목록의 length는 4입니다. 4 < 4는 거짓이라 반복이 끝납니다. 항목 4개를 모두 방문한 뒤입니다.',
    line: at(21),
    state: stat.state('dddd', { collection: ALL, i: 4, check: { i: 4, length: 4, result: false } }),
    output: outputsByRound[4],
  },
  {
    title: "show('끝'): 4개 모두 done",
    explanation:
      '정적인 목록을 돌았으므로 항목이 하나도 건너뛰어지지 않아 li 4개가 모두 done이 되었습니다.',
    line: at(25),
    state: stat.state('dddd', { collection: ALL, i: 4 }),
    output: [...outputsByRound[4], out('끝', 4, 'dddd')],
  },
]

export const scenarios: Scenario<CollectionState>[] = [
  {
    id: 'live',
    label: '살아 있는 HTMLCollection',
    exampleId: 'live-loop',
    code: liveLoopCode,
    steps: liveSteps,
  },
  {
    id: 'static',
    label: '정적인 NodeList',
    exampleId: 'static-loop',
    code: staticLoopCode,
    steps: staticSteps,
  },
]
