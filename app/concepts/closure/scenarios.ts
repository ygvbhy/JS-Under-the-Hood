import type { LineRange, Scenario, Step } from '~/simulator/types'
import bindingCode from './examples/binding-not-value.js?raw'
import counterCode from './examples/counter.js?raw'
import independentCode from './examples/independent.js?raw'
import sharedCode from './examples/shared-env.js?raw'

// 이 개념의 시각화 상태 모델. execution-context의 상태 모델에서 this 바인딩을 빼고 "남아 있음"과 함수 객체의 가리키는 곳을 더했다.
// 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 실행 컨텍스트 스택. 아래(전역)부터 위(지금 실행 중) 순서이고, 마지막 항목이 실행 중인 컨텍스트다.
//   ContextCard.id는 "호출 id"다. 전역이면 'global', 함수 호출이면 그 함수의 이름이다.
//   lexicalEnv·variableEnv는 envs 안의 레코드 id다. phase는 선언 처리('instantiation')와 실행('evaluation')이고
//   컨텍스트를 쌓는 단계가 곧 그 컨텍스트의 선언 처리 단계다(meta.simplifications).
// - envs: 지금 그림에 있는 환경 레코드(생긴 순서).
//   id 규칙: 'global', `${호출 id}-fn`(함수 환경 레코드), `${호출 id}-lex`(sloppy 함수 본문 최상위 let·const용 선언적 레코드,
//   비어 있어도 항상 만든다). 호출 id는 같은 함수의 호출이 동시에 그림에 있어야 할 때만 `${함수 이름}#${n}`(n번째 호출)로 구분한다
//   (independent의 makeCounter#1, makeCounter#2). 함수 이름이 없는 익명 함수를 부르는 호출은 부른 변수 이름(first, second)을 호출 id로 쓴다.
//   같은 함수를 차례로 여러 번 부르는 경우(next()를 두 번)에는 같은 id를 다시 쓴다: 앞 호출의 레코드가 그림에서 빠진 뒤에 새로 생긴다.
//   - global: bindings = 선언적 환경 레코드 칸(let·const), objectBindings = 객체 환경 레코드 칸(var·함수 선언).
//   - function: 매개변수·var·함수 선언. 화살표 함수의 환경 레코드도 같은 모양이다(this 바인딩은 이 페이지에서 그리지 않는다).
//   - declarative: sloppy 함수의 최상위 let·const 레코드. outerId는 [[OuterEnv]]이고, 함수 환경 레코드의 바깥은 그 함수 객체의 [[Environment]]다.
//   - retained: 어떤 실행 컨텍스트도(LexicalEnvironment·VariableEnvironment에서 바깥 연결을 따라) 가리키지 않지만, 그림에 남아 있는
//     함수 객체의 [[Environment]]에서 바깥 연결로 이어져 남은 레코드.
// - functions: 함수 객체. { id, label, environmentId, heldBy }.
//   함수 선언은 선언 처리 때, 함수 식·화살표 함수·메서드는 평가되는 단계에서 나타난다. 같은 호출에서 만든 함수들은 같은 environmentId를 갖는다
//   (함수 선언은 sloppy 함수의 LexicalEnvironment, 곧 -lex 레코드를 [[Environment]]로 갖고 바인딩은 -fn 레코드에 있다).
//   heldBy는 그 함수 객체를 가리키는 곳이다(예: '변수 next', 'counter의 increment 메서드', 'makeCounter 함수 환경 레코드의 increment').
//   익명 함수는 label이 서로 달라야 한다('익명 함수(first)').
// - 그림에서 빼는 기준(도달 가능성): 뿌리는 실행 컨텍스트(lex·var 레코드와 그 바깥 연결)와 전역 바인딩이다.
//   뿌리에서 닿는 레코드의 바인딩이 가리키는 함수 객체(전역 변수가 가리키는 객체의 메서드 포함)가 그림에 있고,
//   그 함수 객체의 environmentId에서 바깥 연결로 닿는 레코드도 그림에 있다(함수 객체를 통해서만 닿으면 retained).
//   어디서도 닿지 않게 되는 단계에서 레코드와 함수 객체를 뺀다.
// - Binding.value는 표시 문자열이다("'Lee'"는 문자열 값, '함수 increment', '익명 함수(first)', '객체 counter'). 초기화 전이면 null이다.
// - lookup: 그 단계에서 이름을 찾는 경로. path는 실행 중 컨텍스트의 LexicalEnvironment부터 [[OuterEnv]]를 따라 처음 찾은 레코드까지다.
//   끝까지 찾지 못하면 foundIn이 null이고 path는 바깥 연결의 끝(전역)까지다(typeof만 에러 없이 'undefined'를 돌려준다).
//   part는 전역 환경 레코드에서 찾았을 때만 어느 칸인지 적는다(선언적 칸을 먼저, 객체 칸을 나중에 본다).
//   경로·result·retained·outerId는 계산하지 않고 손으로 쓴다(테스트가 상태에서 다시 계산해 대조한다).
// - `created`(ContextCard·EnvRecord)와 `changed`(Binding)는 "그 단계에서" 새로 생기거나 초기화되거나 값이 바뀐 항목에만 붙인다.
//   새로 생긴 레코드의 바인딩은 모두 changed다.
// - console.log 호출이 만드는 컨텍스트와 console 이름 탐색은 그리지 않는다.

export type ContextCard = {
  id: string
  label: string
  code: 'global' | 'function'
  phase: 'instantiation' | 'evaluation'
  lexicalEnv: string
  variableEnv: string
  created?: true
}

export type Binding = {
  name: string
  value: string | null
  state: 'uninitialized' | 'initialized'
  changed?: true
}

export type EnvRecord = {
  id: string
  kind: 'global' | 'function' | 'declarative'
  label: string
  outerId: string | null
  bindings: Binding[]
  objectBindings?: Binding[]
  created?: true
  retained?: true
}

export type FnObject = { id: string; label: string; environmentId: string; heldBy: string }

export type Lookup = {
  name: string
  path: string[]
  foundIn: string | null
  part?: 'declarative' | 'object'
  result: string
}

export type ClosureState = {
  stack: ContextCard[]
  envs: EnvRecord[]
  functions: FnObject[]
  lookup: Lookup | null
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string) => `'${s}'`
const fnValue = (name: string) => `함수 ${name}`

const init = (name: string, value: string, changed = false): Binding => ({
  name,
  value,
  state: 'initialized',
  ...(changed && { changed: true as const }),
})
const uninit = (name: string, changed = false): Binding => ({
  name,
  value: null,
  state: 'uninitialized',
  ...(changed && { changed: true as const }),
})

const globalEnv = (object: Binding[], declarative: Binding[], created = false): EnvRecord => ({
  id: 'global',
  kind: 'global',
  label: '전역 환경 레코드',
  outerId: null,
  bindings: declarative,
  objectBindings: object,
  ...(created && { created: true as const }),
})
const fnEnv = (
  callId: string,
  name: string,
  outerId: string,
  bindings: Binding[] = [],
  created = false,
): EnvRecord => ({
  id: `${callId}-fn`,
  kind: 'function',
  label: `${name} 함수 환경 레코드`,
  outerId,
  bindings,
  ...(created && { created: true as const }),
})
const lexEnv = (
  callId: string,
  name: string,
  bindings: Binding[] = [],
  created = false,
): EnvRecord => ({
  id: `${callId}-lex`,
  kind: 'declarative',
  label: `${name} 선언적 환경 레코드`,
  outerId: `${callId}-fn`,
  bindings,
  ...(created && { created: true as const }),
})
const retain = (envs: EnvRecord[]): EnvRecord[] =>
  envs.map((e) => ({ ...e, retained: true as const }))

type Phase = ContextCard['phase']
const globalCtx = (phase: Phase, created = false): ContextCard => ({
  id: 'global',
  label: '전역 실행 컨텍스트',
  code: 'global',
  phase,
  lexicalEnv: 'global',
  variableEnv: 'global',
  ...(created && { created: true as const }),
})
const fnCtx = (callId: string, name: string, phase: Phase, created = false): ContextCard => ({
  id: callId,
  label: `${name} 실행 컨텍스트`,
  code: 'function',
  phase,
  lexicalEnv: `${callId}-lex`,
  variableEnv: `${callId}-fn`,
  ...(created && { created: true as const }),
})

const fo = (id: string, label: string, environmentId: string, heldBy: string): FnObject => ({
  id,
  label,
  environmentId,
  heldBy,
})

const st = (
  stack: ContextCard[],
  envs: EnvRecord[],
  functions: FnObject[],
  lookup: Lookup | null = null,
): ClosureState => ({ stack, envs, functions, lookup })

const look = (
  name: string,
  path: string[],
  foundIn: string | null,
  result: string,
  part?: 'declarative' | 'object',
): Lookup => ({
  name,
  path,
  foundIn,
  result,
  ...(part && { part }),
})

const at = (n: number): LineRange => ({ from: n, to: n })

type ClosureStep = Step<ClosureState>

const before: ClosureState = { stack: [], envs: [], functions: [], lookup: null }

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 실행 컨텍스트 스택(위쪽이 지금 실행 중인 컨텍스트)과 환경 레코드, 함수 객체가 가리키는 [[Environment]]를 보여 줍니다. 실행 컨텍스트가 빠진 뒤에도 남아 있는 함수 객체가 가리키는 레코드는 "남아 있음"으로 표시합니다.'

const consoleNote = '(console.log 호출이 만드는 컨텍스트는 이 그림에서 생략합니다.)'

// --- 시나리오 1: 바깥 함수가 끝난 뒤에도 남는 환경 ---------------------------------------------------

const ctrMk = fo('makeCounter', 'makeCounter', 'global', '변수 makeCounter')
const ctrIncDuring = fo(
  'increment',
  'increment',
  'makeCounter-lex',
  'makeCounter 함수 환경 레코드의 increment',
)
const ctrIncAfter = fo('increment', 'increment', 'makeCounter-lex', '변수 next')
const ctrNext = init('next', fnValue('increment'))

const ctrGlobal = (next: Binding, created = false, changedFn = false) =>
  globalEnv([init('makeCounter', fnValue('makeCounter'), changedFn)], [next], created)
const ctrMkRecs = (count: Binding, created = false, retained = false) => {
  const recs = [
    fnEnv(
      'makeCounter',
      'makeCounter',
      'global',
      [init('increment', fnValue('increment'), created)],
      created,
    ),
    lexEnv('makeCounter', 'makeCounter', [count], created),
  ]
  return retained ? retain(recs) : recs
}
const ctrIncRecs = (created: boolean) => [
  fnEnv('increment', 'increment', 'makeCounter-lex', [], created),
  lexEnv('increment', 'increment', [], created),
]
const ctrInCall = (
  count: Binding,
  phase: Phase,
  created: boolean,
  lookup: Lookup | null = null,
): ClosureState =>
  st(
    [globalCtx('evaluation'), fnCtx('increment', 'increment', phase, created)],
    [ctrGlobal(ctrNext), ...ctrMkRecs(count), ...ctrIncRecs(created)],
    [ctrMk, ctrIncAfter],
    lookup,
  )
const ctrBetween = (count: Binding): ClosureState =>
  st(
    [globalCtx('evaluation')],
    [ctrGlobal(ctrNext), ...ctrMkRecs(count, false, true)],
    [ctrMk, ctrIncAfter],
  )

const ctrCountPath = ['increment-lex', 'increment-fn', 'makeCounter-lex']

const counterSteps: ClosureStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '스크립트를 실행하려면 전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. 함수 선언 makeCounter는 전역 환경 레코드의 객체 환경 레코드 칸에 함수 객체로 만들어지고 그 [[Environment]]는 전역 환경 레코드이며, const next는 선언적 칸에 초기화 전 상태로 만들어집니다.',
    state: st(
      [globalCtx('instantiation', true)],
      [ctrGlobal(uninit('next', true), true, true)],
      [ctrMk],
    ),
    output: [],
  },
  {
    title: 'makeCounter() 호출: 컨텍스트 쌓기',
    explanation:
      '9번 줄의 호출로 makeCounter의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 makeCounter의 [[Environment]]인 전역 환경 레코드이고, 함수 안의 함수 선언 increment는 선언 처리 때 함수 환경 레코드에 함수 객체로 만들어지는데 그 [[Environment]]는 이 컨텍스트의 LexicalEnvironment인 선언적 환경 레코드입니다. 선언적 환경 레코드에는 let count가 초기화 전 상태로 만들어집니다.',
    line: at(9),
    state: st(
      [globalCtx('evaluation'), fnCtx('makeCounter', 'makeCounter', 'instantiation', true)],
      [ctrGlobal(uninit('next')), ...ctrMkRecs(uninit('count', true), true)],
      [ctrMk, ctrIncDuring],
    ),
    output: [],
  },
  {
    title: 'count에 0이 들어감',
    explanation:
      '2번 줄의 선언문을 실행해 makeCounter의 선언적 환경 레코드에 있는 count 바인딩이 초기화되고 값은 0이 됩니다.',
    line: at(2),
    state: st(
      [globalCtx('evaluation'), fnCtx('makeCounter', 'makeCounter', 'evaluation')],
      [ctrGlobal(uninit('next')), ...ctrMkRecs(init('count', '0', true))],
      [ctrMk, ctrIncDuring],
    ),
    output: [],
  },
  {
    title: 'makeCounter 반환: 컨텍스트 빠짐, next 초기화',
    explanation:
      'makeCounter가 increment 함수 객체를 돌려주며 끝나면 컨텍스트가 스택에서 빠지고, 9번 줄의 선언문이 실행되어 전역의 next가 그 함수 객체로 초기화됩니다. makeCounter의 두 레코드는 어떤 실행 컨텍스트도 가리키지 않지만, increment 함수 객체가 [[Environment]]로 선언적 환경 레코드를 가리키고 그 바깥 연결로 함수 환경 레코드에도 이어져서 "남아 있음"으로 표시합니다.',
    line: at(9),
    state: st(
      [globalCtx('evaluation')],
      [
        ctrGlobal(init('next', fnValue('increment'), true)),
        ...ctrMkRecs(init('count', '0'), false, true),
      ],
      [ctrMk, ctrIncAfter],
    ),
    output: [],
  },
  {
    title: 'next() 호출: 컨텍스트 쌓기',
    explanation:
      '10번 줄에서 next()를 부르면 increment의 실행 컨텍스트가 쌓입니다. increment 함수 환경 레코드의 바깥은 increment 함수 객체의 [[Environment]]인 makeCounter의 선언적 환경 레코드입니다. 이제 실행 컨텍스트의 바깥 연결로 makeCounter의 레코드에 닿으므로 "남아 있음" 표시는 해제합니다.',
    line: at(10),
    state: ctrInCall(init('count', '0'), 'instantiation', true),
    output: [],
  },
  {
    title: 'count 이름 찾기',
    explanation:
      '4번 줄에서 count를 읽습니다. 실행 중인 increment 컨텍스트의 LexicalEnvironment인 increment의 선언적 환경 레코드부터 [[OuterEnv]]를 따라 increment의 함수 환경 레코드로 올라가도 count가 없고, makeCounter의 선언적 환경 레코드에서 찾아 값 0을 읽습니다.',
    line: at(4),
    state: ctrInCall(
      init('count', '0'),
      'evaluation',
      false,
      look('count', ctrCountPath, 'makeCounter-lex', '0'),
    ),
    output: [],
  },
  {
    title: 'count가 1이 됨',
    explanation:
      '읽은 값에 1을 더해 같은 이름의 바인딩에 대입하므로 makeCounter의 선언적 환경 레코드의 count가 1이 됩니다. makeCounter의 실행은 이미 끝났지만 increment 함수 객체가 [[Environment]]로 이 레코드를 가리켜서 그 바인딩을 읽고 바꿀 수 있습니다.',
    line: at(4),
    state: ctrInCall(init('count', '1', true), 'evaluation', false),
    output: [],
  },
  {
    title: 'next() 반환: 컨텍스트 빠짐, 출력 1',
    explanation: `5번 줄에서 count의 값 1을 돌려주며 increment가 끝나면 컨텍스트가 스택에서 빠지고, 10번 줄의 console.log가 1을 출력합니다. increment의 레코드는 어떤 실행 컨텍스트도, 남아 있는 함수도 가리키지 않아 그림에서 뺍니다. makeCounter의 두 레코드는 다시 increment 함수 객체만 가리키므로 "남아 있음"으로 표시합니다. ${consoleNote}`,
    line: at(10),
    state: ctrBetween(init('count', '1')),
    output: ['1'],
  },
  {
    title: 'next() 두 번째 호출: 컨텍스트 쌓기',
    explanation:
      '11번 줄의 두 번째 호출로 increment의 실행 컨텍스트가 다시 만들어집니다. 새 함수 환경 레코드의 바깥은 이번에도 increment 함수 객체의 [[Environment]]인 makeCounter의 선언적 환경 레코드이고, 그 count에는 첫 호출이 남긴 값 1이 들어 있습니다.',
    line: at(11),
    state: ctrInCall(init('count', '1'), 'instantiation', true),
    output: ['1'],
  },
  {
    title: 'count 이름 찾기',
    explanation:
      '4번 줄에서 count를 읽습니다. 처음과 같은 경로로 increment의 선언적 환경 레코드, 함수 환경 레코드를 거쳐 makeCounter의 선언적 환경 레코드에서 찾아 값 1을 읽습니다.',
    line: at(4),
    state: ctrInCall(
      init('count', '1'),
      'evaluation',
      false,
      look('count', ctrCountPath, 'makeCounter-lex', '1'),
    ),
    output: ['1'],
  },
  {
    title: 'count가 2가 됨',
    explanation:
      '읽은 값에 1을 더해 대입하므로 같은 레코드의 count가 2가 됩니다. increment를 부를 때마다 새 레코드가 생기는 것은 increment의 레코드뿐이고, count가 있는 레코드는 호출 사이에 그대로 이어집니다.',
    line: at(4),
    state: ctrInCall(init('count', '2', true), 'evaluation', false),
    output: ['1'],
  },
  {
    title: 'next() 반환: 컨텍스트 빠짐, 출력 2',
    explanation: `5번 줄에서 2를 돌려주며 increment가 끝나면 컨텍스트가 스택에서 빠지고, 11번 줄의 console.log가 2를 출력합니다. increment의 레코드는 그림에서 빼고 makeCounter의 두 레코드는 increment 함수 객체가 가리켜서 계속 "남아 있음"으로 표시합니다. ${consoleNote}`,
    line: at(11),
    state: ctrBetween(init('count', '2')),
    output: ['1', '2'],
  },
  {
    title: 'typeof count: 전역에서 찾지 못함',
    explanation:
      "12번 줄의 typeof count는 전역 컨텍스트의 LexicalEnvironment인 전역 환경 레코드에서 count를 찾습니다. 선언적 칸에도 객체 칸에도 없고 전역 환경 레코드의 바깥은 없어 찾지 못하는데, 찾지 못한 이름에 typeof를 쓰면 에러 없이 문자열 'undefined'가 되어 출력됩니다. count는 makeCounter의 선언적 환경 레코드에 있지만 전역에서 시작한 바깥 연결로는 닿지 않습니다.",
    line: at(12),
    state: st(
      [globalCtx('evaluation')],
      [ctrGlobal(ctrNext), ...ctrMkRecs(init('count', '2'), false, true)],
      [ctrMk, ctrIncAfter],
      look('count', ['global'], null, str('undefined')),
    ),
    output: ['1', '2', 'undefined'],
  },
]

// --- 시나리오 2: 호출마다 새 환경 ---------------------------------------------------------------

const ind1 = 'makeCounter#1'
const ind2 = 'makeCounter#2'
const indName = (n: 1 | 2) => `makeCounter(${n}번째 호출)`
const indMk = fo('makeCounter', 'makeCounter', 'global', '변수 makeCounter')
const indFirst = fo('first', '익명 함수(first)', `${ind1}-lex`, '변수 first')
const indSecond = fo('second', '익명 함수(second)', `${ind2}-lex`, '변수 second')
const anonFirst = '익명 함수(first)'
const anonSecond = '익명 함수(second)'

const indGlobal = (first: Binding, second: Binding, created = false) =>
  globalEnv([init('makeCounter', fnValue('makeCounter'), created)], [first, second], created)
const indSet = (n: 1 | 2, count: Binding, created = false, retained = false) => {
  const id = n === 1 ? ind1 : ind2
  const recs = [
    fnEnv(id, indName(n), 'global', [], created),
    lexEnv(id, indName(n), [count], created),
  ]
  return retained ? retain(recs) : recs
}
const indCallRecs = (who: 'first' | 'second', created: boolean) => {
  const outer = who === 'first' ? `${ind1}-lex` : `${ind2}-lex`
  const name = `${who}(익명 함수)`
  return [fnEnv(who, name, outer, [], created), lexEnv(who, name, [], created)]
}
const indCallCtx = (who: 'first' | 'second', phase: Phase, created: boolean) =>
  fnCtx(who, `${who}(익명 함수)`, phase, created)

// 두 makeCounter 호출이 끝난 뒤(둘 다 first·second가 초기화됨)의 상태. 호출 중이면 who로 지정한다.
const indDone = (
  count1: Binding,
  count2: Binding,
  o: {
    secondChanged?: boolean
    retain1: boolean
    retain2: boolean
    call?: { who: 'first' | 'second'; phase: Phase; created: boolean }
    lookup?: Lookup
  },
): ClosureState =>
  st(
    [
      globalCtx('evaluation'),
      ...(o.call ? [indCallCtx(o.call.who, o.call.phase, o.call.created)] : []),
    ],
    [
      indGlobal(init('first', anonFirst), init('second', anonSecond, o.secondChanged)),
      ...indSet(1, count1, false, o.retain1),
      ...indSet(2, count2, false, o.retain2),
      ...(o.call ? indCallRecs(o.call.who, o.call.created) : []),
    ],
    [indMk, indFirst, indSecond],
    o.lookup ?? null,
  )

const indFirstPath = ['first-lex', 'first-fn', `${ind1}-lex`]
const indSecondPath = ['second-lex', 'second-fn', `${ind2}-lex`]

const independentSteps: ClosureStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '스크립트를 실행하려면 전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. 함수 선언 makeCounter는 객체 환경 레코드 칸에 함수 객체로 만들어지고 [[Environment]]는 전역 환경 레코드이며, const first와 second는 선언적 칸에 초기화 전 상태로 만들어집니다.',
    state: st(
      [globalCtx('instantiation', true)],
      [indGlobal(uninit('first', true), uninit('second', true), true)],
      [indMk],
    ),
    output: [],
  },
  {
    title: 'makeCounter() 첫 번째 호출: 컨텍스트 쌓기',
    explanation:
      '8번 줄의 호출로 makeCounter의 실행 컨텍스트가 쌓이고, 새 함수 환경 레코드와 선언적 환경 레코드가 만들어집니다. 이 호출의 레코드는 id를 makeCounter#1로 구분하고, 선언적 환경 레코드에는 let count가 초기화 전 상태로 만들어집니다.',
    line: at(8),
    state: st(
      [globalCtx('evaluation'), fnCtx(ind1, indName(1), 'instantiation', true)],
      [indGlobal(uninit('first'), uninit('second')), ...indSet(1, uninit('count', true), true)],
      [indMk],
    ),
    output: [],
  },
  {
    title: '첫 번째 호출의 count에 0이 들어감',
    explanation:
      '2번 줄의 선언문을 실행해 첫 번째 호출의 선언적 환경 레코드에 있는 count가 초기화되고 값은 0이 됩니다.',
    line: at(2),
    state: st(
      [globalCtx('evaluation'), fnCtx(ind1, indName(1), 'evaluation')],
      [indGlobal(uninit('first'), uninit('second')), ...indSet(1, init('count', '0', true))],
      [indMk],
    ),
    output: [],
  },
  {
    title: '첫 번째 반환: 컨텍스트 빠짐, first 초기화',
    explanation:
      '3~6번 줄의 함수 식을 평가해 만들어진 익명 함수 객체는 그때 실행 중이던 컨텍스트의 LexicalEnvironment, 곧 첫 번째 호출의 선언적 환경 레코드를 [[Environment]]로 가집니다. makeCounter가 그 함수 객체를 돌려주며 끝나면 컨텍스트가 스택에서 빠지고 전역의 first가 초기화되며, 첫 번째 호출의 두 레코드는 이 함수 객체가 가리켜서 "남아 있음"으로 표시합니다.',
    line: at(8),
    state: st(
      [globalCtx('evaluation')],
      [
        indGlobal(init('first', anonFirst, true), uninit('second')),
        ...indSet(1, init('count', '0'), false, true),
      ],
      [indMk, indFirst],
    ),
    output: [],
  },
  {
    title: 'makeCounter() 두 번째 호출: 컨텍스트 쌓기',
    explanation:
      '9번 줄에서 같은 makeCounter를 한 번 더 부르면 컨텍스트가 다시 쌓이고 이번에는 새 함수 환경 레코드와 선언적 환경 레코드가 따로 만들어집니다(makeCounter#2). 첫 번째 호출의 레코드는 그대로 남아 있습니다.',
    line: at(9),
    state: st(
      [globalCtx('evaluation'), fnCtx(ind2, indName(2), 'instantiation', true)],
      [
        indGlobal(init('first', anonFirst), uninit('second')),
        ...indSet(1, init('count', '0'), false, true),
        ...indSet(2, uninit('count', true), true),
      ],
      [indMk, indFirst],
    ),
    output: [],
  },
  {
    title: '두 번째 호출의 count에 0이 들어감',
    explanation:
      '2번 줄의 선언문을 실행해 두 번째 호출의 선언적 환경 레코드에 있는 count가 초기화되고 값은 0이 됩니다. 첫 번째 호출의 count는 별개의 바인딩입니다.',
    line: at(2),
    state: st(
      [globalCtx('evaluation'), fnCtx(ind2, indName(2), 'evaluation')],
      [
        indGlobal(init('first', anonFirst), uninit('second')),
        ...indSet(1, init('count', '0'), false, true),
        ...indSet(2, init('count', '0', true)),
      ],
      [indMk, indFirst],
    ),
    output: [],
  },
  {
    title: '두 번째 반환: 컨텍스트 빠짐, second 초기화',
    explanation:
      '이번에 만들어진 익명 함수 객체의 [[Environment]]는 두 번째 호출의 선언적 환경 레코드이므로 first의 함수 객체와 다릅니다. makeCounter가 끝나 컨텍스트가 빠지고 전역의 second가 초기화되며, 두 번째 호출의 레코드도 이 함수 객체가 가리켜서 "남아 있음"으로 표시합니다.',
    line: at(9),
    state: indDone(init('count', '0'), init('count', '0'), {
      retain1: true,
      retain2: true,
      secondChanged: true,
    }),
    output: [],
  },
  {
    title: 'first() 호출: 컨텍스트 쌓기',
    explanation:
      '10번 줄에서 first()를 부르면 익명 함수의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 first의 함수 객체의 [[Environment]]인 첫 번째 호출의 선언적 환경 레코드입니다. 그 레코드는 이제 실행 컨텍스트의 바깥 연결로 닿으므로 "남아 있음" 표시를 해제하고, 두 번째 호출의 레코드는 그대로 표시합니다.',
    line: at(10),
    state: indDone(init('count', '0'), init('count', '0'), {
      retain1: false,
      retain2: true,
      call: { who: 'first', phase: 'instantiation', created: true },
    }),
    output: [],
  },
  {
    title: 'count 이름 찾기 (첫 번째 호출)',
    explanation:
      '4번 줄에서 count를 읽습니다. 실행 중인 컨텍스트의 LexicalEnvironment부터 [[OuterEnv]]를 따라 올라가 첫 번째 호출의 선언적 환경 레코드에서 count를 찾아 값 0을 읽습니다. 두 번째 호출의 레코드는 이 경로에 없습니다.',
    line: at(4),
    state: indDone(init('count', '0'), init('count', '0'), {
      retain1: false,
      retain2: true,
      call: { who: 'first', phase: 'evaluation', created: false },
      lookup: look('count', indFirstPath, `${ind1}-lex`, '0'),
    }),
    output: [],
  },
  {
    title: '첫 번째 호출의 count가 1이 됨',
    explanation:
      '읽은 값에 1을 더해 대입하므로 첫 번째 호출의 선언적 환경 레코드의 count가 1이 됩니다. 두 번째 호출의 count는 그대로 0입니다.',
    line: at(4),
    state: indDone(init('count', '1', true), init('count', '0'), {
      retain1: false,
      retain2: true,
      call: { who: 'first', phase: 'evaluation', created: false },
    }),
    output: [],
  },
  {
    title: 'first() 반환: 컨텍스트 빠짐, 출력 1',
    explanation: `5번 줄에서 1을 돌려주며 익명 함수가 끝나면 컨텍스트가 스택에서 빠지고 10번 줄의 console.log가 1을 출력합니다. 익명 함수 호출의 레코드는 어떤 실행 컨텍스트도, 남아 있는 함수도 가리키지 않아 그림에서 빼고, 첫 번째 호출의 두 레코드는 first의 함수 객체가 가리켜서 다시 "남아 있음"으로 표시합니다. ${consoleNote}`,
    line: at(10),
    state: indDone(init('count', '1'), init('count', '0'), { retain1: true, retain2: true }),
    output: ['1'],
  },
  {
    title: 'first() 두 번째 호출: 컨텍스트 쌓기',
    explanation:
      '11번 줄의 호출로 익명 함수의 실행 컨텍스트가 다시 쌓이고, 새 함수 환경 레코드의 바깥은 이번에도 첫 번째 호출의 선언적 환경 레코드입니다. 그 레코드의 count에는 앞선 호출이 남긴 값 1이 들어 있습니다.',
    line: at(11),
    state: indDone(init('count', '1'), init('count', '0'), {
      retain1: false,
      retain2: true,
      call: { who: 'first', phase: 'instantiation', created: true },
    }),
    output: ['1'],
  },
  {
    title: 'count 이름 찾기 (첫 번째 호출)',
    explanation:
      '4번 줄에서 count를 읽습니다. 같은 경로로 첫 번째 호출의 선언적 환경 레코드에서 찾아 값 1을 읽습니다.',
    line: at(4),
    state: indDone(init('count', '1'), init('count', '0'), {
      retain1: false,
      retain2: true,
      call: { who: 'first', phase: 'evaluation', created: false },
      lookup: look('count', indFirstPath, `${ind1}-lex`, '1'),
    }),
    output: ['1'],
  },
  {
    title: '첫 번째 호출의 count가 2가 됨',
    explanation:
      '읽은 값에 1을 더해 대입하므로 첫 번째 호출의 선언적 환경 레코드의 count가 2가 됩니다. 두 번째 호출의 count는 여전히 0입니다.',
    line: at(4),
    state: indDone(init('count', '2', true), init('count', '0'), {
      retain1: false,
      retain2: true,
      call: { who: 'first', phase: 'evaluation', created: false },
    }),
    output: ['1'],
  },
  {
    title: 'first() 반환: 컨텍스트 빠짐, 출력 2',
    explanation: `5번 줄에서 2를 돌려주며 끝나면 컨텍스트가 스택에서 빠지고 11번 줄의 console.log가 2를 출력합니다. 익명 함수 호출의 레코드는 그림에서 빼고, 두 호출의 레코드는 각자의 함수 객체가 가리켜서 "남아 있음"으로 표시합니다. ${consoleNote}`,
    line: at(11),
    state: indDone(init('count', '2'), init('count', '0'), { retain1: true, retain2: true }),
    output: ['1', '2'],
  },
  {
    title: 'second() 호출: 컨텍스트 쌓기',
    explanation:
      '12번 줄에서 second()를 부르면 익명 함수의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 second의 함수 객체의 [[Environment]]인 두 번째 호출의 선언적 환경 레코드이고, 이제 그 레코드의 "남아 있음" 표시를 해제합니다.',
    line: at(12),
    state: indDone(init('count', '2'), init('count', '0'), {
      retain1: true,
      retain2: false,
      call: { who: 'second', phase: 'instantiation', created: true },
    }),
    output: ['1', '2'],
  },
  {
    title: 'count 이름 찾기 (두 번째 호출)',
    explanation:
      '4번 줄에서 count를 읽습니다. 실행 중인 컨텍스트의 LexicalEnvironment부터 [[OuterEnv]]를 따라 올라가 두 번째 호출의 선언적 환경 레코드에서 count를 찾아 값 0을 읽습니다. first가 올려 둔 2는 첫 번째 호출의 레코드에 있어서 보이지 않습니다.',
    line: at(4),
    state: indDone(init('count', '2'), init('count', '0'), {
      retain1: true,
      retain2: false,
      call: { who: 'second', phase: 'evaluation', created: false },
      lookup: look('count', indSecondPath, `${ind2}-lex`, '0'),
    }),
    output: ['1', '2'],
  },
  {
    title: '두 번째 호출의 count가 1이 됨',
    explanation:
      '읽은 값에 1을 더해 대입하므로 두 번째 호출의 선언적 환경 레코드의 count가 1이 됩니다. 첫 번째 호출의 count는 2 그대로입니다.',
    line: at(4),
    state: indDone(init('count', '2'), init('count', '1', true), {
      retain1: true,
      retain2: false,
      call: { who: 'second', phase: 'evaluation', created: false },
    }),
    output: ['1', '2'],
  },
  {
    title: 'second() 반환: 컨텍스트 빠짐, 출력 1',
    explanation: `5번 줄에서 1을 돌려주며 끝나면 컨텍스트가 스택에서 빠지고 12번 줄의 console.log가 1을 출력합니다. 두 호출의 레코드는 각자의 함수 객체가 가리켜서 "남아 있음"으로 표시하고, 호출마다 새 레코드가 만들어졌기 때문에 count가 2와 1로 따로 있습니다. ${consoleNote}`,
    line: at(12),
    state: indDone(init('count', '2'), init('count', '1'), { retain1: true, retain2: true }),
    output: ['1', '2', '1'],
  },
]

// --- 시나리오 3: 같은 호출의 함수들은 환경을 공유 ---------------------------------------------------

const shMk = fo('makeCounter', 'makeCounter', 'global', '변수 makeCounter')
const shInc = fo('increment', 'increment', 'makeCounter-lex', 'counter의 increment 메서드')
const shGet = fo('get', 'get', 'makeCounter-lex', 'counter의 get 메서드')
const shCounter = init('counter', '객체 counter')

const shGlobal = (counter: Binding, created = false) =>
  globalEnv([init('makeCounter', fnValue('makeCounter'), created)], [counter], created)
const shMkRecs = (count: Binding, created = false, retained = false) => {
  const recs = [
    fnEnv('makeCounter', 'makeCounter', 'global', [], created),
    lexEnv('makeCounter', 'makeCounter', [count], created),
  ]
  return retained ? retain(recs) : recs
}
const shCallRecs = (method: 'increment' | 'get', created: boolean) => [
  fnEnv(method, method, 'makeCounter-lex', [], created),
  lexEnv(method, method, [], created),
]
const shInCall = (
  method: 'increment' | 'get',
  count: Binding,
  phase: Phase,
  created: boolean,
  lookup: Lookup | null = null,
): ClosureState =>
  st(
    [globalCtx('evaluation'), fnCtx(method, method, phase, created)],
    [shGlobal(shCounter), ...shMkRecs(count), ...shCallRecs(method, created)],
    [shMk, shInc, shGet],
    lookup,
  )
const shBetween = (count: Binding): ClosureState =>
  st(
    [globalCtx('evaluation')],
    [shGlobal(shCounter), ...shMkRecs(count, false, true)],
    [shMk, shInc, shGet],
  )
const shPath = (method: 'increment' | 'get') => [`${method}-lex`, `${method}-fn`, 'makeCounter-lex']

const sharedSteps: ClosureStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '스크립트를 실행하려면 전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. 함수 선언 makeCounter는 객체 환경 레코드 칸에 함수 객체로 만들어지고 [[Environment]]는 전역 환경 레코드이며, const counter는 선언적 칸에 초기화 전 상태로 만들어집니다.',
    state: st(
      [globalCtx('instantiation', true)],
      [shGlobal(uninit('counter', true), true)],
      [shMk],
    ),
    output: [],
  },
  {
    title: 'makeCounter() 호출: 컨텍스트 쌓기',
    explanation:
      '12번 줄의 호출로 makeCounter의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 makeCounter의 [[Environment]]인 전역 환경 레코드이고, 이 예제에는 함수 안의 var나 함수 선언이 없어 비어 있습니다. 선언적 환경 레코드에는 let count가 초기화 전 상태로 만들어집니다.',
    line: at(12),
    state: st(
      [globalCtx('evaluation'), fnCtx('makeCounter', 'makeCounter', 'instantiation', true)],
      [shGlobal(uninit('counter')), ...shMkRecs(uninit('count', true), true)],
      [shMk],
    ),
    output: [],
  },
  {
    title: 'count에 0이 들어감',
    explanation:
      '2번 줄의 선언문을 실행해 makeCounter의 선언적 환경 레코드에 있는 count 바인딩이 초기화되고 값은 0이 됩니다.',
    line: at(2),
    state: st(
      [globalCtx('evaluation'), fnCtx('makeCounter', 'makeCounter', 'evaluation')],
      [shGlobal(uninit('counter')), ...shMkRecs(init('count', '0', true))],
      [shMk],
    ),
    output: [],
  },
  {
    title: 'makeCounter 반환: 컨텍스트 빠짐, counter 초기화',
    explanation:
      '3~10번 줄의 객체 리터럴을 평가할 때 메서드 increment와 get의 함수 객체가 만들어지고, 둘 다 [[Environment]]는 그때 실행 중이던 컨텍스트의 LexicalEnvironment, 곧 makeCounter의 선언적 환경 레코드입니다. makeCounter가 그 객체를 돌려주며 끝나 컨텍스트가 빠지고 12번 줄에서 counter가 초기화되며, makeCounter의 두 레코드는 어떤 실행 컨텍스트도 가리키지 않지만 두 메서드가 가리켜서 "남아 있음"으로 표시합니다.',
    line: at(12),
    state: st(
      [globalCtx('evaluation')],
      [
        shGlobal(init('counter', '객체 counter', true)),
        ...shMkRecs(init('count', '0'), false, true),
      ],
      [shMk, shInc, shGet],
    ),
    output: [],
  },
  {
    title: 'counter.increment() 첫 번째 호출: 컨텍스트 쌓기',
    explanation:
      '13번 줄의 호출로 increment의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 increment의 [[Environment]]인 makeCounter의 선언적 환경 레코드이고, 이제 실행 컨텍스트의 바깥 연결로 닿으므로 "남아 있음" 표시를 해제합니다.',
    line: at(13),
    state: shInCall('increment', init('count', '0'), 'instantiation', true),
    output: [],
  },
  {
    title: 'count 이름 찾기',
    explanation:
      '5번 줄에서 count를 읽습니다. increment의 선언적 환경 레코드부터 [[OuterEnv]]를 따라 함수 환경 레코드를 지나 makeCounter의 선언적 환경 레코드에서 찾아 값 0을 읽습니다.',
    line: at(5),
    state: shInCall(
      'increment',
      init('count', '0'),
      'evaluation',
      false,
      look('count', shPath('increment'), 'makeCounter-lex', '0'),
    ),
    output: [],
  },
  {
    title: 'count가 1이 됨',
    explanation:
      '읽은 값에 1을 더해 대입하므로 makeCounter의 선언적 환경 레코드의 count가 1이 됩니다.',
    line: at(5),
    state: shInCall('increment', init('count', '1', true), 'evaluation', false),
    output: [],
  },
  {
    title: 'increment 반환: 컨텍스트 빠짐',
    explanation:
      'increment가 끝나면 컨텍스트가 스택에서 빠집니다. increment의 레코드는 어떤 실행 컨텍스트도, 남아 있는 함수도 가리키지 않아 그림에서 빼고, makeCounter의 두 레코드는 두 메서드가 가리켜서 "남아 있음"으로 표시합니다.',
    line: at(13),
    state: shBetween(init('count', '1')),
    output: [],
  },
  {
    title: 'counter.increment() 두 번째 호출: 컨텍스트 쌓기',
    explanation:
      '14번 줄의 호출로 increment의 실행 컨텍스트가 다시 쌓입니다. 새 함수 환경 레코드의 바깥은 이번에도 makeCounter의 선언적 환경 레코드이고, 그 count에는 첫 호출이 남긴 값 1이 들어 있습니다.',
    line: at(14),
    state: shInCall('increment', init('count', '1'), 'instantiation', true),
    output: [],
  },
  {
    title: 'count 이름 찾기',
    explanation:
      '5번 줄에서 count를 읽습니다. 같은 경로로 makeCounter의 선언적 환경 레코드에서 찾아 값 1을 읽습니다.',
    line: at(5),
    state: shInCall(
      'increment',
      init('count', '1'),
      'evaluation',
      false,
      look('count', shPath('increment'), 'makeCounter-lex', '1'),
    ),
    output: [],
  },
  {
    title: 'count가 2가 됨',
    explanation:
      '읽은 값에 1을 더해 대입하므로 makeCounter의 선언적 환경 레코드의 count가 2가 됩니다.',
    line: at(5),
    state: shInCall('increment', init('count', '2', true), 'evaluation', false),
    output: [],
  },
  {
    title: 'increment 반환: 컨텍스트 빠짐',
    explanation:
      'increment가 끝나면 컨텍스트가 스택에서 빠지고 increment의 레코드는 그림에서 뺍니다. makeCounter의 두 레코드는 두 메서드가 가리켜서 계속 "남아 있음"으로 표시합니다.',
    line: at(14),
    state: shBetween(init('count', '2')),
    output: [],
  },
  {
    title: 'counter.get() 호출: 컨텍스트 쌓기',
    explanation:
      '15번 줄의 호출로 get의 실행 컨텍스트가 쌓입니다. get의 함수 환경 레코드의 바깥은 get의 [[Environment]]이고, 이것은 increment의 [[Environment]]와 같은 makeCounter의 선언적 환경 레코드입니다.',
    line: at(15),
    state: shInCall('get', init('count', '2'), 'instantiation', true),
    output: [],
  },
  {
    title: 'count 이름 찾기',
    explanation:
      '8번 줄에서 count를 읽습니다. get의 선언적 환경 레코드부터 [[OuterEnv]]를 따라 올라가 makeCounter의 선언적 환경 레코드에서 찾아 값 2를 읽습니다. increment가 바꾼 바로 그 바인딩입니다.',
    line: at(8),
    state: shInCall(
      'get',
      init('count', '2'),
      'evaluation',
      false,
      look('count', shPath('get'), 'makeCounter-lex', '2'),
    ),
    output: [],
  },
  {
    title: 'get 반환: 컨텍스트 빠짐, 출력 2',
    explanation: `get이 2를 돌려주며 끝나면 컨텍스트가 스택에서 빠지고, 15번 줄의 console.log가 2를 출력합니다. get의 레코드는 그림에서 뺍니다. ${consoleNote}`,
    line: at(15),
    state: shBetween(init('count', '2')),
    output: ['2'],
  },
]

// --- 시나리오 4: 값이 아니라 바인딩 ---------------------------------------------------------------

const bdMk = fo('makeGreeter', 'makeGreeter', 'global', '변수 makeGreeter')
const bdArrowDuring = fo(
  'greet',
  'greet',
  'makeGreeter-lex',
  'makeGreeter 선언적 환경 레코드의 greet',
)
const bdArrowAfter = fo('greet', 'greet', 'makeGreeter-lex', '변수 sayHi')
const arrowValue = fnValue('greet')

const bdGlobal = (sayHi: Binding, created = false) =>
  globalEnv([init('makeGreeter', fnValue('makeGreeter'), created)], [sayHi], created)
const bdMkRecs = (name: Binding, greet: Binding, created = false, retained = false) => {
  const recs = [
    fnEnv('makeGreeter', 'makeGreeter', 'global', [], created),
    lexEnv('makeGreeter', 'makeGreeter', [name, greet], created),
  ]
  return retained ? retain(recs) : recs
}
const bdCallRecs = (created: boolean) => [
  fnEnv('greet', 'greet', 'makeGreeter-lex', [], created),
  lexEnv('greet', 'greet', [], created),
]
const bdInMake = (
  phase: Phase,
  created: boolean,
  name: Binding,
  greet: Binding,
  functions: FnObject[],
): ClosureState =>
  st(
    [globalCtx('evaluation'), fnCtx('makeGreeter', 'makeGreeter', phase, created)],
    [bdGlobal(uninit('sayHi')), ...bdMkRecs(name, greet, created)],
    functions,
  )
const bdKimLee = (name: string) => init('name', str(name))
const bdInCall = (phase: Phase, created: boolean, lookup: Lookup | null = null): ClosureState =>
  st(
    [globalCtx('evaluation'), fnCtx('greet', 'greet', phase, created)],
    [
      bdGlobal(init('sayHi', arrowValue)),
      ...bdMkRecs(bdKimLee('Lee'), init('greet', arrowValue)),
      ...bdCallRecs(created),
    ],
    [bdMk, bdArrowAfter],
    lookup,
  )

const bindingSteps: ClosureStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '스크립트를 실행하려면 전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. 함수 선언 makeGreeter는 객체 환경 레코드 칸에 함수 객체로 만들어지고 [[Environment]]는 전역 환경 레코드이며, const sayHi는 선언적 칸에 초기화 전 상태로 만들어집니다.',
    state: st([globalCtx('instantiation', true)], [bdGlobal(uninit('sayHi', true), true)], [bdMk]),
    output: [],
  },
  {
    title: 'makeGreeter() 호출: 컨텍스트 쌓기',
    explanation:
      '7번 줄의 호출로 makeGreeter의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 makeGreeter의 [[Environment]]인 전역 환경 레코드이고, 선언적 환경 레코드에는 let name과 const greet가 초기화 전 상태로 만들어집니다.',
    line: at(7),
    state: bdInMake('instantiation', true, uninit('name', true), uninit('greet', true), [bdMk]),
    output: [],
  },
  {
    title: "name에 'Kim'이 들어감",
    explanation:
      "2번 줄의 선언문을 실행해 makeGreeter의 선언적 환경 레코드에 있는 name이 초기화되고 값은 'Kim'이 됩니다.",
    line: at(2),
    state: bdInMake('evaluation', false, init('name', str('Kim'), true), uninit('greet'), [bdMk]),
    output: [],
  },
  {
    title: 'greet에 화살표 함수가 들어감',
    explanation:
      "3번 줄의 선언문에서 화살표 함수 식을 평가해 함수 객체를 만들고, 그 [[Environment]]는 실행 중인 컨텍스트의 LexicalEnvironment인 makeGreeter의 선언적 환경 레코드입니다. 이 함수 객체가 가리키는 것은 name의 값 'Kim'이 아니라 name 바인딩이 들어 있는 레코드입니다. 그 함수 객체로 선언적 환경 레코드의 greet가 초기화됩니다.",
    line: at(3),
    state: bdInMake(
      'evaluation',
      false,
      init('name', str('Kim')),
      init('greet', arrowValue, true),
      [bdMk, bdArrowDuring],
    ),
    output: [],
  },
  {
    title: "name에 'Lee'가 들어감",
    explanation:
      "4번 줄의 대입으로 같은 선언적 환경 레코드의 name 바인딩 값이 'Kim'에서 'Lee'로 바뀝니다. greet의 함수 객체는 이 레코드를 가리킬 뿐이므로, 바뀐 값은 같은 레코드를 통해 그대로 보입니다.",
    line: at(4),
    state: bdInMake(
      'evaluation',
      false,
      init('name', str('Lee'), true),
      init('greet', arrowValue),
      [bdMk, bdArrowDuring],
    ),
    output: [],
  },
  {
    title: 'makeGreeter 반환: 컨텍스트 빠짐, sayHi 초기화',
    explanation:
      'makeGreeter가 5번 줄에서 greet의 함수 객체를 돌려주며 끝나면 컨텍스트가 스택에서 빠지고, 7번 줄의 선언문이 실행되어 전역의 sayHi가 그 함수 객체로 초기화됩니다. makeGreeter의 두 레코드는 어떤 실행 컨텍스트도 가리키지 않지만 함수 객체가 [[Environment]]로 가리켜서 "남아 있음"으로 표시합니다.',
    line: at(7),
    state: st(
      [globalCtx('evaluation')],
      [
        bdGlobal(init('sayHi', arrowValue, true)),
        ...bdMkRecs(bdKimLee('Lee'), init('greet', arrowValue), false, true),
      ],
      [bdMk, bdArrowAfter],
    ),
    output: [],
  },
  {
    title: 'sayHi() 호출: 컨텍스트 쌓기',
    explanation:
      '8번 줄의 sayHi()는 변수 sayHi가 가리키는 함수 객체(greet)를 호출하므로 그 화살표 함수의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 함수 객체의 [[Environment]]인 makeGreeter의 선언적 환경 레코드이고, 실행 컨텍스트의 바깥 연결로 닿으므로 "남아 있음" 표시를 해제합니다.',
    line: at(8),
    state: bdInCall('instantiation', true),
    output: [],
  },
  {
    title: 'name 이름 찾기',
    explanation:
      "3번 줄의 화살표 함수 본문에서 name을 읽습니다. greet의 선언적 환경 레코드와 함수 환경 레코드에는 name이 없어 [[OuterEnv]]를 따라 올라가고, makeGreeter의 선언적 환경 레코드에서 찾아 그 바인딩의 지금 값 'Lee'를 읽습니다. 함수 객체는 만들 때의 값 'Kim'을 따로 가지지 않고 레코드만 가리킵니다.",
    line: at(3),
    state: bdInCall(
      'evaluation',
      false,
      look('name', ['greet-lex', 'greet-fn', 'makeGreeter-lex'], 'makeGreeter-lex', str('Lee')),
    ),
    output: [],
  },
  {
    title: 'sayHi() 반환: 컨텍스트 빠짐, 출력 Hi, Lee',
    explanation: `'Hi, ' + name의 결과 'Hi, Lee'를 돌려주며 끝나면 컨텍스트가 스택에서 빠지고, 8번 줄의 console.log가 Hi, Lee를 출력합니다. greet의 레코드는 그림에서 빼고, makeGreeter의 두 레코드는 함수 객체가 가리켜서 다시 "남아 있음"으로 표시합니다. ${consoleNote}`,
    line: at(8),
    state: st(
      [globalCtx('evaluation')],
      [
        bdGlobal(init('sayHi', arrowValue)),
        ...bdMkRecs(bdKimLee('Lee'), init('greet', arrowValue), false, true),
      ],
      [bdMk, bdArrowAfter],
    ),
    output: ['Hi, Lee'],
  },
]

// --- 시나리오 목록 -------------------------------------------------------------------------------

export const scenarios: Scenario<ClosureState>[] = [
  {
    id: 'counter',
    label: '바깥 함수가 끝난 뒤에도 남는 환경',
    exampleId: 'counter',
    code: counterCode,
    steps: counterSteps,
  },
  {
    id: 'independent',
    label: '호출마다 새 환경',
    exampleId: 'independent',
    code: independentCode,
    steps: independentSteps,
  },
  {
    id: 'shared',
    label: '같은 호출의 함수들은 환경을 공유',
    exampleId: 'shared-env',
    code: sharedCode,
    steps: sharedSteps,
  },
  {
    id: 'binding',
    label: '값이 아니라 바인딩',
    exampleId: 'binding-not-value',
    code: bindingCode,
    steps: bindingSteps,
  },
]
