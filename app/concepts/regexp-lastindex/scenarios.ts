import type { Scenario, Step } from '~/simulator/types'
import execLoopCode from './examples/exec-loop.js?raw'
import filterTrapCode from './examples/filter-trap.js?raw'
import testAlternatesCode from './examples/test-alternates.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - regexes: 변수가 선언된 줄의 단계부터 나타나는 정규 표현식 카드. lastIndex는 그 단계가 끝난 시점의 값이다.
//   lastIndexChanged는 이전 단계와 값이 달라진 단계에서만 true다(카드가 처음 나타나는 단계는 아님).
// - calls: 이 단계에서 일어난 검색(RegExpBuiltinExec 호출)만 담는다. 선언·출력 줄은 빈 배열이다.

export type RegexCard = {
  name: string
  literal: string
  lastIndex: number
  lastIndexChanged?: boolean
}

export type ExecCall = {
  regex: string // RegexCard.name
  method: 'test' | 'exec'
  input: string
  before: number // 호출 직전 lastIndex
  match: { start: number; end: number } | null
  after: number // 호출 직후 lastIndex
}

export type RegexState = { regexes: RegexCard[]; calls: ExecCall[] }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const rx = (name: string, literal: string, lastIndex: number, changed = false): RegexCard => ({
  name,
  literal,
  lastIndex,
  ...(changed && { lastIndexChanged: true }),
})

const hit = (
  regex: string,
  method: 'test' | 'exec',
  input: string,
  before: number,
  start: number,
  end: number,
  after: number,
): ExecCall => ({ regex, method, input, before, match: { start, end }, after })

const miss = (
  regex: string,
  method: 'test' | 'exec',
  input: string,
  before: number,
  after: number,
): ExecCall => ({ regex, method, input, before, match: null, after })

const at = (n: number) => ({ from: n, to: n })

type RxStep = Step<RegexState>

const before: RxStep = {
  title: '실행 전',
  explanation: '아직 코드가 실행되지 않았습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
  state: { regexes: [], calls: [] },
  output: [],
}

// --- 시나리오 1: test 결과가 번갈아 (test-alternates.js) ---------------------------------------

const testAlternatesSteps: RxStep[] = [
  before,
  {
    title: 're에 /a/g를 담은 정규 표현식 만듦',
    explanation:
      '정규 표현식 리터럴을 평가하면 정규 표현식 객체가 만들어집니다. 이 객체는 lastIndex 프로퍼티를 가지며 처음 값은 0입니다.',
    line: at(1),
    state: { regexes: [rx('re', '/a/g', 0)], calls: [] },
    output: [],
  },
  {
    title: "re.test('a'): 0에서 찾아 성공, lastIndex는 1",
    explanation:
      'g 플래그가 있어서 검색은 lastIndex 0부터 시작합니다. 검색에 성공하면 lastIndex를 매치 끝(1)으로 바꾸고, test는 true를 돌려줍니다.',
    line: at(2),
    state: {
      regexes: [rx('re', '/a/g', 1, true)],
      calls: [hit('re', 'test', 'a', 0, 0, 1, 1)],
    },
    output: ['true 1'],
  },
  {
    title: "re.test('a'): 1에서 시작해 실패, lastIndex는 0",
    explanation:
      '같은 호출이지만 lastIndex가 1이라 글자 칸 1(문자열 끝)부터 찾습니다. 찾지 못하면 lastIndex를 0으로 되돌리고, test는 false를 돌려줍니다.',
    line: at(3),
    state: {
      regexes: [rx('re', '/a/g', 0, true)],
      calls: [miss('re', 'test', 'a', 1, 0)],
    },
    output: ['true 1', 'false 0'],
  },
  {
    title: "re.test('a'): 다시 0에서 성공",
    explanation:
      '앞 호출이 실패하며 lastIndex를 0으로 되돌렸으므로 첫 호출과 같은 상황이 됩니다. 그래서 결과가 true, 1로 첫 호출과 같습니다.',
    line: at(4),
    state: {
      regexes: [rx('re', '/a/g', 1, true)],
      calls: [hit('re', 'test', 'a', 0, 0, 1, 1)],
    },
    output: ['true 1', 'false 0', 'true 1'],
  },
]

// --- 시나리오 2: exec로 모두 찾기 (exec-loop.js) ----------------------------------------------

const TEXT = 'cat bat'

const execLoopSteps: RxStep[] = [
  before,
  {
    title: 're에 /at/g를 담은 정규 표현식 만듦',
    explanation: '정규 표현식 객체가 만들어지고 lastIndex는 0입니다.',
    line: at(1),
    state: { regexes: [rx('re', '/at/g', 0)], calls: [] },
    output: [],
  },
  {
    title: "text에 'cat bat'을 담음",
    explanation: 'text는 문자열입니다. lastIndex는 text가 아니라 re 객체의 프로퍼티입니다.',
    line: at(2),
    state: { regexes: [rx('re', '/at/g', 0)], calls: [] },
    output: [],
  },
  {
    title: 'm을 선언함',
    explanation: 'm은 값을 지정하지 않았으므로 undefined입니다.',
    line: at(3),
    state: { regexes: [rx('re', '/at/g', 0)], calls: [] },
    output: [],
  },
  {
    title: '첫 re.exec(text): 1번 칸부터 at에 매치, lastIndex는 3',
    explanation:
      '조건 안의 대입식은 대입한 값(exec의 결과)을 돌려줍니다. lastIndex 0부터 찾아 1번과 2번 칸의 at에 매치하고, 성공했으므로 lastIndex를 매치가 끝난 위치 3으로 바꿉니다. 결과가 null이 아니라 반복문 본문이 실행됩니다.',
    line: at(4),
    state: {
      regexes: [rx('re', '/at/g', 3, true)],
      calls: [hit('re', 'exec', TEXT, 0, 1, 3, 3)],
    },
    output: [],
  },
  {
    title: 'at 1 3 출력',
    explanation: 'm[0]은 매치한 문자열 at, m.index는 매치 시작 위치 1, lastIndex는 3입니다.',
    line: at(5),
    state: { regexes: [rx('re', '/at/g', 3)], calls: [] },
    output: ['at 1 3'],
  },
  {
    title: '두 번째 re.exec(text): 3부터 찾아 5번 칸부터 at에 매치',
    explanation:
      'lastIndex가 3이라 글자 칸 3부터 찾습니다. 5번과 6번 칸의 at에 매치하고 lastIndex를 7로 바꿉니다. 호출할 때마다 lastIndex가 다음 위치로 옮겨 가므로 같은 자리를 다시 찾지 않습니다.',
    line: at(4),
    state: {
      regexes: [rx('re', '/at/g', 7, true)],
      calls: [hit('re', 'exec', TEXT, 3, 5, 7, 7)],
    },
    output: ['at 1 3'],
  },
  {
    title: 'at 5 7 출력',
    explanation: 'm.index는 5, lastIndex는 7입니다.',
    line: at(5),
    state: { regexes: [rx('re', '/at/g', 7)], calls: [] },
    output: ['at 1 3', 'at 5 7'],
  },
  {
    title: '세 번째 re.exec(text): 7에서 시작해 실패, lastIndex는 0',
    explanation:
      'lastIndex 7은 문자열의 끝이라 그 자리에서 시도해도 매치가 없고, 더 나아갈 자리도 없습니다. 찾지 못하면 lastIndex를 0으로 되돌리고 null을 돌려주므로 반복문이 끝납니다.',
    line: at(4),
    state: {
      regexes: [rx('re', '/at/g', 0, true)],
      calls: [miss('re', 'exec', TEXT, 7, 0)],
    },
    output: ['at 1 3', 'at 5 7'],
  },
  {
    title: 're.lastIndex 출력: 0',
    explanation: '마지막 검색이 실패하면서 lastIndex가 0으로 돌아왔으므로 0이 출력됩니다.',
    line: at(7),
    state: { regexes: [rx('re', '/at/g', 0)], calls: [] },
    output: ['at 1 3', 'at 5 7', '0'],
  },
]

// --- 시나리오 3: filter와 test (filter-trap.js) ------------------------------------------------

const withG = '/^a/g'
const noG = '/^a/'

const filterTrapSteps: RxStep[] = [
  before,
  {
    title: 'startsWithA에 /^a/g를 담은 정규 표현식 만듦',
    explanation:
      '정규 표현식 객체가 하나 만들어지고 lastIndex는 0입니다. ^는 문자열의 시작을 뜻합니다.',
    line: at(1),
    state: { regexes: [rx('startsWithA', withG, 0)], calls: [] },
    output: [],
  },
  {
    title: 'words에 문자열 네 개를 담은 배열 만듦',
    explanation: 'words는 배열이라 정규 표현식 상태와 관계가 없습니다.',
    line: at(2),
    state: { regexes: [rx('startsWithA', withG, 0)], calls: [] },
    output: [],
  },
  {
    title: "filter 콜백 1: 'apple'은 0에서 매치, lastIndex는 1",
    explanation:
      'filter는 요소마다 콜백을 부르고, 콜백이 참인 요소를 모읍니다. 모든 콜백이 같은 startsWithA 객체를 씁니다. 0부터 찾아 성공했으므로 lastIndex를 1로 바꿉니다.',
    line: at(3),
    state: {
      regexes: [rx('startsWithA', withG, 1, true)],
      calls: [hit('startsWithA', 'test', 'apple', 0, 0, 1, 1)],
    },
    output: [],
  },
  {
    title: "filter 콜백 2: 'avocado'는 1에서 시작해 실패, lastIndex는 0",
    explanation:
      'avocado는 a로 시작하지만 lastIndex가 1이라 글자 칸 1부터 찾습니다. ^는 문자열의 시작에서만 맞으므로 실패하고, lastIndex를 0으로 되돌립니다. avocado는 결과에서 빠집니다.',
    line: at(3),
    state: {
      regexes: [rx('startsWithA', withG, 0, true)],
      calls: [miss('startsWithA', 'test', 'avocado', 1, 0)],
    },
    output: [],
  },
  {
    title: "filter 콜백 3: 'banana'는 0에서 시작해 실패, lastIndex는 0",
    explanation:
      'lastIndex가 0이라 처음부터 찾지만 banana는 a로 시작하지 않아 실패합니다. 실패해도 lastIndex는 0입니다.',
    line: at(3),
    state: {
      regexes: [rx('startsWithA', withG, 0)],
      calls: [miss('startsWithA', 'test', 'banana', 0, 0)],
    },
    output: [],
  },
  {
    title: "filter 콜백 4: 'apricot'은 0에서 매치, lastIndex는 1",
    explanation:
      '앞 호출이 lastIndex를 0으로 둔 상태라 apricot은 성공하고 lastIndex는 다시 1이 됩니다.',
    line: at(3),
    state: {
      regexes: [rx('startsWithA', withG, 1, true)],
      calls: [hit('startsWithA', 'test', 'apricot', 0, 0, 1, 1)],
    },
    output: [],
  },
  {
    title: 'picked와 lastIndex 출력',
    explanation:
      'picked는 apple과 apricot만 담고, startsWithA.lastIndex는 마지막 성공 뒤의 1입니다. avocado가 빠진 것은 앞선 호출이 정규 표현식 객체의 lastIndex를 바꿔 놓았기 때문입니다.',
    line: at(4),
    state: { regexes: [rx('startsWithA', withG, 1)], calls: [] },
    output: ['["apple","apricot"] 1'],
  },
  {
    title: 'noFlag에 /^a/를 담은 정규 표현식 만듦',
    explanation:
      'g 플래그가 없는 새 정규 표현식 객체입니다. startsWithA의 lastIndex는 그대로 1입니다.',
    line: at(5),
    state: {
      regexes: [rx('startsWithA', withG, 1), rx('noFlag', noG, 0)],
      calls: [],
    },
    output: ['["apple","apricot"] 1'],
  },
  {
    title: 'g 없는 정규 표현식으로 네 단어 검사: 모두 0에서 시작',
    explanation:
      'g도 y도 없으면 검색은 항상 0부터 시작하고 lastIndex 프로퍼티에 값을 쓰지 않습니다. 그래서 apple, avocado, apricot이 모두 통과합니다.',
    line: at(6),
    state: {
      regexes: [rx('startsWithA', withG, 1), rx('noFlag', noG, 0)],
      calls: [
        hit('noFlag', 'test', 'apple', 0, 0, 1, 0),
        hit('noFlag', 'test', 'avocado', 0, 0, 1, 0),
        miss('noFlag', 'test', 'banana', 0, 0),
        hit('noFlag', 'test', 'apricot', 0, 0, 1, 0),
      ],
    },
    output: ['["apple","apricot"] 1', '["apple","avocado","apricot"]'],
  },
]

export const scenarios: Scenario<RegexState>[] = [
  {
    id: 'test-alternates',
    label: 'test 결과가 번갈아',
    exampleId: 'test-alternates',
    code: testAlternatesCode,
    steps: testAlternatesSteps,
  },
  {
    id: 'exec-loop',
    label: 'exec로 모두 찾기',
    exampleId: 'exec-loop',
    code: execLoopCode,
    steps: execLoopSteps,
  },
  {
    id: 'filter-trap',
    label: 'filter와 test',
    exampleId: 'filter-trap',
    code: filterTrapCode,
    steps: filterTrapSteps,
  },
]
