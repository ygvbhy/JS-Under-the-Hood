import type { LineRange, Scenario, Step } from '~/simulator/types'
import twoWayCode from './examples/two-way.js?raw'
import unlinkCode from './examples/unlink.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - running: 지금 실행 중인 코드를 가리키는 표시 문자열('실행 전', '전역 코드', 'twoWay 호출' 등).
// - params: 지금 호출 중인 함수의 매개변수 바인딩(호출 중이 아니면 빈 배열). value는 표시 문자열이다.
// - args: 호출 중인 함수의 arguments 객체의 인덱스 프로퍼티(호출 중이 아니면 null). length·callee 등은 그리지 않는다.
//   - key: 프로퍼티 이름('0'). value: 그 프로퍼티를 읽었을 때 나오는 값이다(값을 두 곳에 저장해 둔다는 뜻이 아니다).
//   - mappedTo: 읽기·쓰기가 매개변수 바인딩을 거치는 프로퍼티면 그 매개변수 이름, 아니면 null.
//     mappedTo가 있으면 value는 항상 그 매개변수의 value와 같다(테스트가 검사한다).
// - `changed`는 "그 단계에서" 새로 생기거나 값(또는 연결 상태)이 바뀐 항목에만 붙인다.
// 함수 안의 지역 변수(before, fromParam)는 그리지 않는다.

export type ParamBinding = { name: string; value: string; changed?: true }

export type ArgProperty = {
  key: string
  value: string
  mappedTo: string | null
  changed?: true
}

export type ArgumentsState = {
  running: string
  params: ParamBinding[]
  args: ArgProperty[] | null
}

type S = Step<ArgumentsState>

const param = (value: string, changed = false): ParamBinding => ({
  name: 'a',
  value,
  ...(changed && { changed: true as const }),
})
const arg = (value: string, mappedTo: string | null, changed = false): ArgProperty => ({
  key: '0',
  value,
  mappedTo,
  ...(changed && { changed: true as const }),
})

const state = (
  running: string,
  params: ParamBinding[],
  args: ArgProperty[] | null,
): ArgumentsState => ({ running, params, args })

const step = (
  title: string,
  explanation: string,
  line: LineRange | undefined,
  st: ArgumentsState,
  output: string[],
): S => ({ title, explanation, ...(line && { line }), state: st, output })

const L = (n: number): LineRange => ({ from: n, to: n })

const idle = state('실행 전', [], null)
const global = state('전역 코드', [], null)

const twoWaySteps: S[] = [
  step(
    '실행 전',
    '아직 함수를 호출하기 전입니다. 함수 호출이 없으니 매개변수 바인딩도 arguments 객체도 없습니다.',
    undefined,
    idle,
    [],
  ),
  step(
    'twoWay(1) 호출',
    '이 함수는 sloppy mode이고 매개변수 목록이 단순해서 매핑된 arguments 객체가 만들어집니다. 매개변수 a는 인수 1로 초기화되고, 넘긴 인수가 있는 인덱스 0은 a에 대응합니다.',
    L(7),
    state('twoWay 호출', [param('1', true)], [arg('1', 'a', true)]),
    [],
  ),
  step(
    'a = 2',
    '매개변수 바인딩 a의 값이 2로 바뀝니다. arguments[0]을 읽으면 그 순간 매개변수 바인딩 a의 값을 돌려주므로, 읽히는 값도 2가 됩니다.',
    L(2),
    state('twoWay 호출', [param('2', true)], [arg('2', 'a', true)]),
    [],
  ),
  step(
    'arguments[0]을 읽어 fromParam에 저장',
    '읽을 때는 매개변수 바인딩 a의 값을 돌려줍니다. 지금 a는 2이므로 fromParam에는 2가 담깁니다. 읽기만 했으므로 바뀐 것은 없습니다.',
    L(3),
    state('twoWay 호출', [param('2')], [arg('2', 'a')]),
    [],
  ),
  step(
    'arguments[0] = 9',
    '연결된 프로퍼티에 값을 쓸 때는 프로퍼티에 쓰는 것에 더해 매개변수 바인딩 a에도 같은 값을 씁니다. 그래서 a도 9가 됩니다.',
    L(4),
    state('twoWay 호출', [param('9', true)], [arg('9', 'a', true)]),
    [],
  ),
  step(
    'return fromParam + a',
    'fromParam은 앞에서 읽어 둔 2이고 a는 방금 바뀐 9입니다. 그래서 반환하는 문자열은 "2 9"입니다.',
    L(5),
    state('twoWay 호출', [param('9')], [arg('9', 'a')]),
    [],
  ),
  step(
    'console.log로 출력',
    '함수 호출이 끝나 매개변수 바인딩과 arguments 객체는 그림에서 사라지고, 반환값 "2 9"가 출력됩니다.',
    L(7),
    global,
    ['2 9'],
  ),
]

const unlinkSteps: S[] = [
  step(
    '실행 전',
    '아직 함수를 호출하기 전입니다. 함수 호출이 없으니 매개변수 바인딩도 arguments 객체도 없습니다.',
    undefined,
    idle,
    [],
  ),
  step(
    'afterDelete(1) 호출',
    '매핑된 arguments 객체가 만들어지고 인덱스 0이 매개변수 a에 대응합니다.',
    L(14),
    state('afterDelete 호출', [param('1', true)], [arg('1', 'a', true)]),
    [],
  ),
  step(
    'a = 2',
    '매개변수 바인딩 a가 2로 바뀌고, 연결되어 있으므로 arguments[0]을 읽으면 2가 나옵니다.',
    L(2),
    state('afterDelete 호출', [param('2', true)], [arg('2', 'a', true)]),
    [],
  ),
  step(
    'arguments[0]을 읽어 before에 저장',
    '지우기 전에는 연결되어 있어 읽으면 매개변수 바인딩 a의 값 2를 돌려줍니다. before에는 2가 담깁니다.',
    L(3),
    state('afterDelete 호출', [param('2')], [arg('2', 'a')]),
    [],
  ),
  step(
    'delete arguments[0]',
    '프로퍼티를 지우는 데 성공하면 연결도 함께 사라집니다. arguments 객체에서 인덱스 0 프로퍼티가 없어지고, 매개변수 a는 그대로 2입니다.',
    L(4),
    state('afterDelete 호출', [param('2')], []),
    [],
  ),
  step(
    'arguments[0] = 9',
    '지운 뒤에 다시 쓰면 연결 없는 평범한 프로퍼티가 새로 생깁니다. 쓰기가 매개변수 바인딩 a에는 닿지 않으므로 a는 2 그대로입니다.',
    L(5),
    state('afterDelete 호출', [param('2')], [arg('9', null, true)]),
    [],
  ),
  step(
    'return before + a + arguments[0]',
    'before는 지우기 전에 읽어 둔 2, a는 2, arguments[0]은 평범한 프로퍼티의 값 9입니다. 반환하는 문자열은 "2 2 9"입니다.',
    L(6),
    state('afterDelete 호출', [param('2')], [arg('9', null)]),
    [],
  ),
  step(
    'console.log로 첫 줄 출력',
    '호출이 끝나 매개변수 바인딩과 arguments 객체가 그림에서 사라지고 "2 2 9"가 출력됩니다.',
    L(14),
    global,
    ['2 2 9'],
  ),
  step(
    'afterReadonly(1) 호출',
    '새 호출에서도 매핑된 arguments 객체가 만들어지고 인덱스 0이 매개변수 a에 대응합니다.',
    L(15),
    state('afterReadonly 호출', [param('1', true)], [arg('1', 'a', true)]),
    ['2 2 9'],
  ),
  step(
    'a = 2',
    '매개변수 바인딩 a가 2로 바뀌고, 아직 연결되어 있으므로 arguments[0]을 읽으면 2가 나옵니다.',
    L(9),
    state('afterReadonly 호출', [param('2', true)], [arg('2', 'a', true)]),
    ['2 2 9'],
  ),
  step(
    'writable: false로 바꾸기',
    '값 없이 writable만 false로 바꾸면, 그 시점의 매개변수 값 2가 프로퍼티의 값으로 남고 연결이 끊어집니다.',
    L(10),
    state('afterReadonly 호출', [param('2')], [arg('2', null, true)]),
    ['2 2 9'],
  ),
  step(
    'a = 3',
    '매개변수 바인딩 a만 3으로 바뀝니다. 연결이 없으므로 arguments[0]을 읽으면 프로퍼티에 남은 2가 나옵니다.',
    L(11),
    state('afterReadonly 호출', [param('3', true)], [arg('2', null)]),
    ['2 2 9'],
  ),
  step(
    'return a + arguments[0]',
    'a는 3이고 arguments[0]은 연결이 끊긴 프로퍼티의 값 2입니다. 반환하는 문자열은 "3 2"입니다.',
    L(12),
    state('afterReadonly 호출', [param('3')], [arg('2', null)]),
    ['2 2 9'],
  ),
  step(
    'console.log로 둘째 줄 출력',
    '호출이 끝나 매개변수 바인딩과 arguments 객체가 그림에서 사라지고 "3 2"가 출력됩니다.',
    L(15),
    global,
    ['2 2 9', '3 2'],
  ),
]

export const scenarios: Scenario<ArgumentsState>[] = [
  {
    id: 'two-way',
    label: '예제 1: 양방향',
    exampleId: 'two-way',
    code: twoWayCode,
    steps: twoWaySteps,
  },
  {
    id: 'unlink',
    label: '예제 3: 연결이 끊기는 조작',
    exampleId: 'unlink',
    code: unlinkCode,
    steps: unlinkSteps,
  },
]
