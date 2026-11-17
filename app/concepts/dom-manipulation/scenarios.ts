import type { Scenario, Step } from '~/simulator/types'
import innerHtmlReplaceCode from './examples/inner-html-replace.html?raw'
import moveCode from './examples/move.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - nodes: 그 시점에 존재하는 모든 노드(부모 ul 포함)의 표시 이름. id는 시각화가 노드를 구분하려고 붙인 이름이다.
// - parents: 자식 목록을 가진 노드와 그 자식 id 목록(순서 있음). 부모는 모두 문서에 연결된 요소다.
// - variables: 코드의 변수 이름과 그 변수가 가리키는 노드 id(선언된 순서)
// 어느 부모의 children에도 없고 부모도 아닌 노드가 "문서에서 떨어진 노드"이며, 시각화가 이를 계산한다.
// 두 시나리오의 부모(ul)는 모두 문서에 연결된 요소이므로 이 계산은 isConnected와 같다는 전제다.

export type NodeId = string

export type NodeMoveState = {
  nodes: Record<NodeId, { label: string }>
  parents: { id: NodeId; children: NodeId[] }[]
  variables: { name: string; nodeId: NodeId }[]
}

type NStep = Step<NodeMoveState>

const at = (n: number) => ({ from: n, to: n })

// --- 시나리오 1: innerHTML += (inner-html-replace.html) ---------------------------------------

const LIST = { label: 'ul#list' }
const FIRST = { label: 'li#first "A"' }
const NEW_FIRST = { label: 'li#first "A"' }
const NEW_B = { label: 'li "B"' }

const O1_1 = 'true true'
const O1_2 = '2 false false'
const O1_3 = 'A true'
const O1_4 = 'first false'

const replaceState = (
  nodes: NodeMoveState['nodes'],
  children: NodeId[],
  variables: NodeMoveState['variables'],
): NodeMoveState => ({ nodes, parents: [{ id: 'list', children }], variables })

const V_LIST = { name: 'list', nodeId: 'list' }
const V_FIRST = { name: 'first', nodeId: 'n1' }

const BEFORE = replaceState({ list: LIST, n1: FIRST }, ['n1'], [])
const HAS_LIST = replaceState({ list: LIST, n1: FIRST }, ['n1'], [V_LIST])
const HAS_FIRST = replaceState({ list: LIST, n1: FIRST }, ['n1'], [V_LIST, V_FIRST])
const REMOVED = replaceState({ list: LIST, n1: FIRST }, [], [V_LIST, V_FIRST])
const REPLACED = replaceState(
  { list: LIST, n1: FIRST, n2: NEW_FIRST, n3: NEW_B },
  ['n2', 'n3'],
  [V_LIST, V_FIRST],
)

const replaceSteps: NStep[] = [
  {
    title: '실행 전',
    explanation:
      '문서에는 ul#list가 있고 그 자식은 li#first 하나(노드 n1)입니다. n1 같은 이름은 시각화가 노드를 구분하려고 붙인 표시입니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
    state: BEFORE,
    output: [],
  },
  {
    title: 'list를 얻음',
    explanation: 'getElementById로 ul 요소를 얻어 변수 list가 가리킵니다. 트리는 바뀌지 않습니다.',
    line: at(9),
    state: HAS_LIST,
    output: [],
  },
  {
    title: 'first를 얻음',
    explanation:
      'getElementById로 li#first를 얻어 변수 first가 노드 n1을 가리킵니다. n1은 list의 자식이라 문서에 있습니다.',
    line: at(10),
    state: HAS_FIRST,
    output: [],
  },
  {
    title: 'list의 첫 자식과 first를 비교해 출력',
    explanation: '변수 first가 가리키는 노드가 list의 첫 자식이고 문서에 있으므로 true true입니다.',
    line: at(11),
    state: HAS_FIRST,
    output: [O1_1],
  },
  {
    title: 'list.innerHTML += ...: ① 읽어서 문자열을 만든다',
    explanation:
      '복합 대입은 먼저 list.innerHTML을 읽습니다. getter는 현재 자식을 직렬화한 문자열 <li id="first">A</li>를 돌려주고, 거기에 <li>B</li>를 이어 붙인 문자열이 만들어집니다. 트리는 아직 그대로입니다.',
    line: at(12),
    state: HAS_FIRST,
    output: [O1_1],
  },
  {
    title: 'list.innerHTML += ...: ② 자식을 모두 제거한다',
    explanation:
      '이어 붙인 문자열이 대입됩니다. 표준의 replace all은 list의 자식을 모두 제거하는 것으로 시작합니다. 노드 n1은 부모가 없어져 문서에서 떨어집니다. 변수 first는 계속 n1을 가리킵니다. 표준은 이 제거에 앞서 문자열을 파싱해 두는데, 그림에는 새 노드를 넣는 다음 단계에서 처음 나타납니다.',
    line: at(12),
    state: REMOVED,
    output: [O1_1],
  },
  {
    title: 'list.innerHTML += ...: ③ 파싱한 새 노드 두 개를 넣는다',
    explanation:
      '문자열을 파싱해 만든 새 노드 n2(li#first)와 n3(li)를 list에 넣습니다. n2는 n1과 id 어트리뷰트가 같지만 다른 노드입니다. first는 여전히 문서에서 떨어진 n1을 가리킵니다.',
    line: at(12),
    state: REPLACED,
    output: [O1_1],
  },
  {
    title: '자식 수와 비교 결과를 출력',
    explanation:
      '자식은 n2, n3 두 개이고, 첫 자식 n2는 first가 가리키는 n1이 아니며, n1은 문서에 연결되어 있지 않아 2 false false입니다.',
    line: at(13),
    state: REPLACED,
    output: [O1_1, O1_2],
  },
  {
    title: 'first.textContent와 부모를 출력',
    explanation:
      '떨어진 n1은 사라진 것이 아니라 변수가 가리키고 있어 텍스트 A가 그대로이고, 부모가 없으므로 first.parentNode === null이 true입니다.',
    line: at(14),
    state: REPLACED,
    output: [O1_1, O1_2, O1_3],
  },
  {
    title: '새 첫 자식의 id와 getElementById 결과를 출력',
    explanation:
      '새 첫 자식 n2의 id는 first로 같습니다. 그러나 getElementById("first")가 찾는 것은 문서에 있는 n2이므로 변수 first(n1)와 같지 않아 first false입니다.',
    line: at(15),
    state: REPLACED,
    output: [O1_1, O1_2, O1_3, O1_4],
  },
]

// --- 시나리오 2: 이미 있는 노드 넣기 (move.html) ---------------------------------------------

const TODO = { label: 'ul#todo' }
const DONE = { label: 'ul#done' }
const A = { label: 'li#a "A"' }
const B = { label: 'li#b "B"' }
const C = { label: 'li "새 노드"' }

const NODES_AB = { todo: TODO, done: DONE, a: A, b: B }
const NODES_ABC = { todo: TODO, done: DONE, a: A, b: B, c: C }

const moveState = (
  nodes: NodeMoveState['nodes'],
  todo: NodeId[],
  done: NodeId[],
  variables: NodeMoveState['variables'],
): NodeMoveState => ({
  nodes,
  parents: [
    { id: 'todo', children: todo },
    { id: 'done', children: done },
  ],
  variables,
})

const vTodo = { name: 'todo', nodeId: 'todo' }
const vDone = { name: 'done', nodeId: 'done' }
const vA = { name: 'a', nodeId: 'a' }
const vReturned = { name: 'returned', nodeId: 'a' }
const vB = { name: 'b', nodeId: 'b' }
const vC = { name: 'c', nodeId: 'c' }

const M1 = '1 1 done true'
const M2 = '1'
const M3 = 'false true'
const M4 = 'true true'
const M5 = '2 true'

const S0 = moveState(NODES_AB, ['a', 'b'], [], [])
const S1 = moveState(NODES_AB, ['a', 'b'], [], [vTodo])
const S2 = moveState(NODES_AB, ['a', 'b'], [], [vTodo, vDone])
const S3 = moveState(NODES_AB, ['a', 'b'], [], [vTodo, vDone, vA])
const S4 = moveState(NODES_AB, ['b'], ['a'], [vTodo, vDone, vA, vReturned])
const S5 = moveState(NODES_AB, ['b'], ['a'], [vTodo, vDone, vA, vReturned, vB])
const S6 = moveState(NODES_ABC, ['b'], ['a'], [vTodo, vDone, vA, vReturned, vB, vC])
const S7 = moveState(NODES_ABC, ['b', 'c'], ['a'], [vTodo, vDone, vA, vReturned, vB, vC])
const S8 = moveState(NODES_ABC, ['c', 'b'], ['a'], [vTodo, vDone, vA, vReturned, vB, vC])

const moveSteps: NStep[] = [
  {
    title: '실행 전',
    explanation:
      '문서에는 ul#todo(자식 li#a, li#b)와 비어 있는 ul#done이 있습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
    state: S0,
    output: [],
  },
  {
    title: 'todo를 얻음',
    explanation: '변수 todo가 ul#todo를 가리킵니다. 트리는 바뀌지 않습니다.',
    line: at(10),
    state: S1,
    output: [],
  },
  {
    title: 'done을 얻음',
    explanation: '변수 done이 ul#done을 가리킵니다.',
    line: at(11),
    state: S2,
    output: [],
  },
  {
    title: 'a를 얻음',
    explanation: '변수 a가 li#a를 가리킵니다. li#a는 todo의 자식입니다.',
    line: at(12),
    state: S3,
    output: [],
  },
  {
    title: 'done.appendChild(a)',
    explanation:
      'appendChild는 insert를 하고, insert는 노드마다 adopt를 실행합니다. adopt는 노드에 부모가 있으면 먼저 remove합니다. 그래서 li#a는 todo의 자식에서 빠지고 done의 맨 뒤에 들어갑니다. 반환값은 li#a이고 변수 returned가 가리킵니다.',
    line: at(13),
    state: S4,
    output: [],
  },
  {
    title: 'todo와 done의 자식 수 등을 출력',
    explanation:
      'todo의 자식은 b 하나로 줄고 done의 자식은 a 하나이며, a의 부모의 id는 done이고, 반환값은 a이므로 1 1 done true입니다.',
    line: at(14),
    state: S4,
    output: [M1],
  },
  {
    title: 'done.appendChild(a)를 한 번 더',
    explanation:
      '이미 done의 자식인 a도 adopt가 먼저 remove한 뒤 다시 넣으므로 done의 자식은 여전히 a 하나입니다.',
    line: at(15),
    state: S4,
    output: [M1],
  },
  {
    title: 'done의 자식 수를 출력',
    explanation: 'done의 자식은 1개 그대로입니다.',
    line: at(16),
    state: S4,
    output: [M1, M2],
  },
  {
    title: 'b를 얻음',
    explanation: '변수 b가 li#b를 가리킵니다. li#b는 todo의 자식입니다.',
    line: at(17),
    state: S5,
    output: [M1, M2],
  },
  {
    title: "c = document.createElement('li')",
    explanation:
      '새 li가 만들어져 변수 c가 가리킵니다. 만든 노드는 부모가 없어 어느 자식 목록에도 들어 있지 않고 문서에 연결되지 않습니다.',
    line: at(18),
    state: S6,
    output: [M1, M2],
  },
  {
    title: 'c의 연결 여부와 부모를 출력',
    explanation: 'c는 문서에 없고 부모가 null이므로 false true입니다.',
    line: at(19),
    state: S6,
    output: [M1, M2, M3],
  },
  {
    title: 'todo.appendChild(c)',
    explanation: 'c가 todo의 맨 뒤에 들어가 부모가 생기고 문서에 연결됩니다.',
    line: at(20),
    state: S7,
    output: [M1, M2, M3],
  },
  {
    title: '마지막 자식과 연결 여부를 출력',
    explanation: 'todo의 마지막 자식이 c이고 c는 문서에 연결되었으므로 true true입니다.',
    line: at(21),
    state: S7,
    output: [M1, M2, M3, M4],
  },
  {
    title: 'todo.insertBefore(c, b)',
    explanation:
      '이미 todo의 자식인 c를 b 앞에 넣습니다. adopt가 c를 먼저 remove하므로 새 노드가 늘지 않고 c의 자리만 바뀝니다.',
    line: at(22),
    state: S8,
    output: [M1, M2, M3, M4],
  },
  {
    title: 'todo의 자식 수와 첫 자식을 출력',
    explanation: 'todo의 자식은 c, b 둘이고 첫 자식이 c이므로 2 true입니다.',
    line: at(23),
    state: S8,
    output: [M1, M2, M3, M4, M5],
  },
]

export const scenarios: Scenario<NodeMoveState>[] = [
  {
    id: 'inner-html-replace',
    label: '예제 1: innerHTML +=',
    exampleId: 'inner-html-replace',
    code: innerHtmlReplaceCode,
    steps: replaceSteps,
  },
  {
    id: 'move',
    label: '예제 3: 이미 있는 노드 넣기',
    exampleId: 'move',
    code: moveCode,
    steps: moveSteps,
  },
]
