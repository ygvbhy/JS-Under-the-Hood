import type { Scenario, Step } from '~/simulator/types'
import inheritEmptyCode from './examples/inherit-empty.js?raw'
import nextOneByOneCode from './examples/next-one-by-one.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - regexes: 정규 표현식 카드. 'original'은 코드에서 이름(re)으로 닿는 정규식, 'clone'은 matchAll이 만든 새 정규식
//   (이 페이지의 호칭 '복제본', 코드에 이름이 없다). 복제본은 matchAll 줄의 단계부터 나타난다.
//   lastIndex는 그 단계가 끝난 시점의 값이고, lastIndexChanged는 이전 단계와 값이 달라진 단계에서만 true다.
// - iterator: matchAll이 돌려준 이터레이터의 내부 슬롯 [[Done]]·[[Global]]·[[Unicode]]. matchAll 줄의 단계부터 나타난다.
// - input: 검색 문자열(matchAll 줄의 단계부터)과 이번 단계의 exec가 찾은 매치 범위(검색이 없거나 실패한 단계는 null).
// - calls: 이번 단계에서 일어난 호출만 담는다. next 한 번은 next → exec(있으면) → advance(있으면) 순서로 담는다.
// - results: 지금까지 next가 value로 돌려준 매치의 문자열과 index.

export type RegexCard = {
  kind: 'original' | 'clone'
  name: string
  literal: string
  lastIndex: number
  lastIndexChanged?: boolean
}

export type IteratorSlots = { done: boolean; global: boolean; unicode: boolean }

export type MatchRange = { start: number; end: number }

// done: [[Done]]이 true라 exec 없이 끝 / miss: exec가 null이라 [[Done]]을 true로 하고 끝 / hit: 매치를 value로
export type NextBranch = 'done' | 'miss' | 'hit'

export type MatchCall =
  | { kind: 'get-iterator' }
  | { kind: 'next'; branch: NextBranch }
  | { kind: 'exec'; before: number; match: MatchRange | null; after: number }
  | { kind: 'advance'; from: number; to: number }

export type MatchAllState = {
  regexes: RegexCard[]
  iterator: IteratorSlots | null
  input: { text: string; match: MatchRange | null } | null
  calls: MatchCall[]
  results: { text: string; index: number }[]
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const orig = (literal: string, lastIndex: number, changed = false): RegexCard => ({
  kind: 'original',
  name: 're',
  literal,
  lastIndex,
  ...(changed && { lastIndexChanged: true }),
})

const clone = (literal: string, lastIndex: number, changed = false): RegexCard => ({
  kind: 'clone',
  name: '복제본',
  literal,
  lastIndex,
  ...(changed && { lastIndexChanged: true }),
})

const slots = (done: boolean): IteratorSlots => ({ done, global: true, unicode: false })

const nextCall = (branch: NextBranch): MatchCall => ({ kind: 'next', branch })

const execHit = (before: number, start: number, end: number, after: number): MatchCall => ({
  kind: 'exec',
  before,
  match: { start, end },
  after,
})

const execMiss = (before: number, after: number): MatchCall => ({
  kind: 'exec',
  before,
  match: null,
  after,
})

const advance = (from: number, to: number): MatchCall => ({ kind: 'advance', from, to })

const at = (n: number) => ({ from: n, to: n })

type MaStep = Step<MatchAllState>

const before: MaStep = {
  title: '실행 전',
  explanation: '아직 코드가 실행되지 않았습니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
  state: { regexes: [], iterator: null, input: null, calls: [], results: [] },
  output: [],
}

// --- 시나리오 1: 다음 매치를 하나씩 (next-one-by-one.js) --------------------------------------

const RE1 = '/[0-9]+/g'
const TEXT1 = 'a1b22'

const nextOneByOneSteps: MaStep[] = [
  before,
  {
    title: 're에 /[0-9]+/g를 담은 정규 표현식 만듦',
    explanation:
      '정규 표현식 리터럴을 평가하면 정규 표현식 객체가 만들어지고, 이 객체의 lastIndex 프로퍼티는 처음에 0입니다.',
    line: at(1),
    state: {
      regexes: [orig(RE1, 0)],
      iterator: null,
      input: null,
      calls: [],
      results: [],
    },
    output: [],
  },
  {
    title: "'a1b22'.matchAll(re): 새 정규 표현식과 이터레이터를 만들고 검색은 하지 않음",
    explanation:
      "re는 g 플래그가 있어서 matchAll의 g 검사를 통과하고, 일은 re의 Symbol.matchAll 메서드로 넘어갑니다. 이 메서드는 re의 패턴과 flags로 새 정규 표현식(이 페이지는 복제본이라 부름)을 만들고, re의 lastIndex(0)를 그 복제본에 옮긴 뒤, 복제본과 문자열 'a1b22'를 가진 이터레이터를 돌려줍니다. 이 줄에서는 검색이 일어나지 않습니다. 이후 검색은 복제본에서만 일어납니다.",
    line: at(2),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 0)],
      iterator: slots(false),
      input: { text: TEXT1, match: null },
      calls: [],
      results: [],
    },
    output: [],
  },
  {
    title: 'it.next() 첫 번째: 복제본에서 exec, 1번 칸의 1에 매치',
    explanation:
      'next는 복제본에 exec를 한 번 부릅니다. exec는 복제본의 lastIndex 0부터 찾아 1번 칸의 1에 매치하고, 성공했으므로 복제본의 lastIndex를 매치 끝 2로 바꿉니다. 매치가 빈 문자열이 아니라서 next는 lastIndex를 더 옮기지 않고, 그 매치를 value로 담은 { done: false } 결과를 돌려줍니다. re의 lastIndex는 그대로 0입니다.',
    line: at(3),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 2, true)],
      iterator: slots(false),
      input: { text: TEXT1, match: { start: 1, end: 2 } },
      calls: [nextCall('hit'), execHit(0, 1, 2, 2)],
      results: [{ text: '1', index: 1 }],
    },
    output: [],
  },
  {
    title: '1 1 false 0 출력',
    explanation:
      "r1.value[0]은 매치한 문자열 '1', index는 1, done은 false입니다. re.lastIndex는 0입니다. 검색은 복제본에서 일어났으므로 re의 lastIndex는 바뀌지 않았습니다.",
    line: at(4),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 2)],
      iterator: slots(false),
      input: { text: TEXT1, match: null },
      calls: [],
      results: [{ text: '1', index: 1 }],
    },
    output: ['1 1 false 0'],
  },
  {
    title: 'it.next() 두 번째: 복제본의 lastIndex 2부터 찾아 3~4번 칸의 22에 매치',
    explanation:
      '복제본의 lastIndex가 2라서 2번 칸부터 찾습니다. exec는 3번과 4번 칸의 22에 매치하고 복제본의 lastIndex를 매치 끝 5로 바꿉니다. 이번에도 { done: false } 결과를 돌려줍니다.',
    line: at(5),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 5, true)],
      iterator: slots(false),
      input: { text: TEXT1, match: { start: 3, end: 5 } },
      calls: [nextCall('hit'), execHit(2, 3, 5, 5)],
      results: [
        { text: '1', index: 1 },
        { text: '22', index: 3 },
      ],
    },
    output: ['1 1 false 0'],
  },
  {
    title: '22 3 false 출력',
    explanation: "r2.value[0]은 '22', index는 3, done은 false입니다.",
    line: at(6),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 5)],
      iterator: slots(false),
      input: { text: TEXT1, match: null },
      calls: [],
      results: [
        { text: '1', index: 1 },
        { text: '22', index: 3 },
      ],
    },
    output: ['1 1 false 0', '22 3 false'],
  },
  {
    title: 'it.next() 세 번째: 복제본이 5(문자열 끝)에서 시작해 null, [[Done]]이 true',
    explanation:
      '복제본의 lastIndex 5부터는 남은 글자가 없어 [0-9]+가 매치하지 못합니다. exec는 매치에 실패하면 g 정규 표현식인 복제본의 lastIndex를 0으로 되돌리고 null을 돌려주며, next는 이터레이터의 [[Done]]을 true로 바꾼 뒤 { value: undefined, done: true }를 돌려줍니다.',
    line: at(7),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 0, true)],
      iterator: slots(true),
      input: { text: TEXT1, match: null },
      calls: [nextCall('miss'), execMiss(5, 0)],
      results: [
        { text: '1', index: 1 },
        { text: '22', index: 3 },
      ],
    },
    output: ['1 1 false 0', '22 3 false'],
  },
  {
    title: 'undefined true 출력',
    explanation: 'r3.value는 undefined, r3.done은 true입니다.',
    line: at(8),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 0)],
      iterator: slots(true),
      input: { text: TEXT1, match: null },
      calls: [],
      results: [
        { text: '1', index: 1 },
        { text: '22', index: 3 },
      ],
    },
    output: ['1 1 false 0', '22 3 false', 'undefined true'],
  },
  {
    title: 'it.next() 네 번째: [[Done]]이 true라서 exec를 부르지 않고 끝',
    explanation:
      'next는 먼저 [[Done]]을 확인합니다. 이미 true이면 exec를 부르지 않고 { value: undefined, done: true }를 돌려줍니다. 끝난 뒤에 다시 꺼내면 비어 있는 이유는 복제본의 lastIndex 때문이 아니라 이 [[Done]]입니다.',
    line: at(9),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 0)],
      iterator: slots(true),
      input: { text: TEXT1, match: null },
      calls: [nextCall('done')],
      results: [
        { text: '1', index: 1 },
        { text: '22', index: 3 },
      ],
    },
    output: ['1 1 false 0', '22 3 false', 'undefined true'],
  },
  {
    title: 'true 0 출력',
    explanation:
      'r4.done은 true입니다. re.lastIndex는 0입니다. 검색이 re에서 일어났다면 첫 next 직후(4번 줄 출력)에 re.lastIndex가 2였을 텐데 0이었으므로, 검색은 re가 아닌 복제본에서 일어났습니다.',
    line: at(10),
    state: {
      regexes: [orig(RE1, 0), clone(RE1, 0)],
      iterator: slots(true),
      input: { text: TEXT1, match: null },
      calls: [],
      results: [
        { text: '1', index: 1 },
        { text: '22', index: 3 },
      ],
    },
    output: ['1 1 false 0', '22 3 false', 'undefined true', 'true 0'],
  },
]

// --- 시나리오 2: lastIndex 이어받기와 빈 매치 (inherit-empty.js) ------------------------------

const RE2 = '/(?=[0-9])/g'
const TEXT2 = 'a1b2c3'

const inheritEmptySteps: MaStep[] = [
  before,
  {
    title: 're에 /(?=[0-9])/g를 담은 정규 표현식 만듦',
    explanation:
      '(?=[0-9])는 바로 뒤에 숫자가 오는 위치에서 빈 문자열에 매치합니다. 패턴 문법은 이 페이지에서 다루지 않고, 빈 문자열에 매치하는 정규식이라는 점만 쓰입니다. lastIndex는 0입니다.',
    line: at(1),
    state: {
      regexes: [orig(RE2, 0)],
      iterator: null,
      input: null,
      calls: [],
      results: [],
    },
    output: [],
  },
  {
    title: 're.lastIndex에 2를 대입',
    explanation: 'lastIndex는 쓰기 가능한 프로퍼티라 직접 2를 대입할 수 있습니다.',
    line: at(2),
    state: {
      regexes: [orig(RE2, 2, true)],
      iterator: null,
      input: null,
      calls: [],
      results: [],
    },
    output: [],
  },
  {
    title: "'a1b2c3'.matchAll(re): 복제본이 re의 lastIndex 2를 이어받음",
    explanation:
      'Symbol.matchAll 메서드는 re의 패턴과 flags로 만든 새 정규 표현식(복제본)에 re의 현재 lastIndex(2)를 ToLength로 바꿔 대입합니다. 그래서 복제본의 lastIndex는 0이 아니라 2입니다. 이 줄에서도 검색은 일어나지 않습니다.',
    line: at(3),
    state: {
      regexes: [orig(RE2, 2), clone(RE2, 2)],
      iterator: slots(false),
      input: { text: TEXT2, match: null },
      calls: [],
      results: [],
    },
    output: [],
  },
  {
    title: 're.lastIndex에 0을 대입해도 복제본은 2 그대로',
    explanation:
      '복제본은 matchAll이 이미 만들어 이터레이터에 넣어 둔 별개의 정규 표현식입니다. re의 lastIndex를 바꿔도 복제본의 lastIndex에는 영향이 없습니다.',
    line: at(4),
    state: {
      regexes: [orig(RE2, 0, true), clone(RE2, 2)],
      iterator: slots(false),
      input: { text: TEXT2, match: null },
      calls: [],
      results: [],
    },
    output: [],
  },
  {
    title: 'for...of 시작: it[Symbol.iterator]()가 it 자기 자신을 돌려줌',
    explanation:
      'for...of는 먼저 it의 Symbol.iterator 메서드를 부릅니다. 이 이터레이터는 %Iterator.prototype%에서 상속한 메서드로 this를 그대로 돌려주므로, 이터레이터 it 자신이 반복에 쓰입니다.',
    line: at(5),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 2)],
      iterator: slots(false),
      input: { text: TEXT2, match: null },
      calls: [{ kind: 'get-iterator' }],
      results: [],
    },
    output: [],
  },
  {
    title: '첫 next: 복제본이 2에서 시작해 3번 위치의 빈 매치, lastIndex는 3에서 4로',
    explanation:
      '복제본의 lastIndex 2부터 찾습니다. 2번 위치 바로 뒤의 글자는 b라 매치가 없고, 3번 위치 바로 뒤의 글자는 숫자 2라 그 위치에서 빈 문자열에 매치합니다. 성공한 g 정규 표현식의 exec는 lastIndex를 매치 끝으로 두는데, 빈 매치의 끝은 시작 위치와 같은 3입니다. 그래서 exec는 lastIndex를 2에서 3으로 옮깁니다. 그대로 두면 다음 검색이 같은 자리에서 같은 빈 매치를 다시 찾으므로, 매치한 문자열이 빈 문자열일 때 next가 lastIndex를 AdvanceStringIndex로 한 칸 더 옮겨 4로 만듭니다.',
    line: at(5),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 4, true)],
      iterator: slots(false),
      input: { text: TEXT2, match: { start: 3, end: 3 } },
      calls: [nextCall('hit'), execHit(2, 3, 3, 3), advance(3, 4)],
      results: [{ text: '', index: 3 }],
    },
    output: [],
  },
  {
    title: '"" 3 출력',
    explanation:
      '루프 변수 m은 방금 받은 매치입니다. m[0]은 빈 문자열이라 JSON.stringify가 ""로 찍고, m.index는 3입니다. re의 lastIndex를 0으로 바꾼 4번 줄이 영향을 줬다면 처음 출력이 "" 1이었을 것입니다.',
    line: at(6),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 4)],
      iterator: slots(false),
      input: { text: TEXT2, match: null },
      calls: [],
      results: [{ text: '', index: 3 }],
    },
    output: ['"" 3'],
  },
  {
    title: '두 번째 next: 4에서 시작해 5번 위치의 빈 매치, lastIndex는 5에서 6으로',
    explanation:
      '복제본의 lastIndex 4부터 찾습니다. 4번 위치 바로 뒤의 글자는 c라 매치가 없고, 5번 위치 바로 뒤의 글자는 숫자 3이라 그 위치에서 빈 문자열에 매치합니다. exec가 lastIndex를 매치 시작이자 끝인 5로 옮기고, 빈 매치이므로 next가 한 칸 더 옮겨 6으로 만듭니다.',
    line: at(5),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 6, true)],
      iterator: slots(false),
      input: { text: TEXT2, match: { start: 5, end: 5 } },
      calls: [nextCall('hit'), execHit(4, 5, 5, 5), advance(5, 6)],
      results: [
        { text: '', index: 3 },
        { text: '', index: 5 },
      ],
    },
    output: ['"" 3'],
  },
  {
    title: '"" 5 출력',
    explanation: '두 번째 매치도 빈 문자열이고 index는 5입니다.',
    line: at(6),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 6)],
      iterator: slots(false),
      input: { text: TEXT2, match: null },
      calls: [],
      results: [
        { text: '', index: 3 },
        { text: '', index: 5 },
      ],
    },
    output: ['"" 3', '"" 5'],
  },
  {
    title: '세 번째 next: 6(문자열 끝)에서 null, [[Done]]이 true가 되어 반복이 끝남',
    explanation:
      '복제본의 lastIndex 6은 문자열 끝이고 그 뒤에 숫자가 없어 매치가 없습니다. exec는 매치에 실패하면 복제본의 lastIndex를 0으로 되돌리고 null을 돌려주며, next는 [[Done]]을 true로 바꿔 done: true를 돌려주므로 for...of가 끝납니다.',
    line: at(5),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 0, true)],
      iterator: slots(true),
      input: { text: TEXT2, match: null },
      calls: [nextCall('miss'), execMiss(6, 0)],
      results: [
        { text: '', index: 3 },
        { text: '', index: 5 },
      ],
    },
    output: ['"" 3', '"" 5'],
  },
  {
    title: 're.lastIndex 출력: 0',
    explanation:
      're의 lastIndex는 4번 줄에서 0으로 바꾼 뒤 한 번도 바뀌지 않았습니다. 반복 중의 검색은 모두 복제본에서 일어났습니다.',
    line: at(8),
    state: {
      regexes: [orig(RE2, 0), clone(RE2, 0)],
      iterator: slots(true),
      input: { text: TEXT2, match: null },
      calls: [],
      results: [
        { text: '', index: 3 },
        { text: '', index: 5 },
      ],
    },
    output: ['"" 3', '"" 5', '0'],
  },
]

export const scenarios: Scenario<MatchAllState>[] = [
  {
    id: 'next-one-by-one',
    label: '다음 매치를 하나씩',
    exampleId: 'next-one-by-one',
    code: nextOneByOneCode,
    steps: nextOneByOneSteps,
  },
  {
    id: 'inherit-empty',
    label: 'lastIndex 이어받기와 빈 매치',
    exampleId: 'inherit-empty',
    code: inheritEmptyCode,
    steps: inheritEmptySteps,
  },
]
