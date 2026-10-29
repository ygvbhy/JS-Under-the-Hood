import type { LineRange, Scenario, Step } from '~/simulator/types'
import blockEnvCode from './examples/block-env.js?raw'
import callStackCode from './examples/call-stack.js?raw'
import lookupDefinedCode from './examples/lookup-defined.js?raw'
import thisEnvCode from './examples/this-env.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 실행 컨텍스트 스택. 아래(전역)부터 위(지금 실행 중) 순서이고, 마지막 항목이 실행 중인 컨텍스트다.
//   ContextCard.id는 전역이면 'global', 함수면 그 함수의 이름이다(탐침 대조가 이 이름으로 스택을 비교한다).
//   lexicalEnv·variableEnv는 envs 안의 레코드 id다. 블록 안에서는 lexicalEnv만 블록 레코드로 바뀐다.
//   phase는 선언 처리('instantiation')와 실행('evaluation')이다. 컨텍스트를 쌓는 단계가 곧 그 컨텍스트의 선언 처리 단계다
//   (명세는 컨텍스트 생성·push → 선언 처리를 따로 쓰지만 한 단계로 묶어 보인다: meta.simplifications).
// - envs: 지금 어떤 실행 컨텍스트에서든 닿을 수 있는 환경 레코드(생긴 순서). 어떤 컨텍스트에서도 가리키지 않게 된 레코드는 뺀다.
//   id 규칙: 'global', `${함수 이름}-fn`(함수 환경 레코드), `${함수 이름}-lex`(sloppy 함수 본문 최상위 let·const용 선언적 레코드), 'block'.
//   - global: bindings = 선언적 환경 레코드 칸(let·const), objectBindings = 객체 환경 레코드 칸(var·함수 선언 = 전역 객체 프로퍼티).
//   - function: 매개변수·var·함수 선언과 this 바인딩. 화살표 함수의 레코드는 this 바인딩이 없어 status가 'lexical'이다.
//   - declarative: sloppy 함수의 최상위 let·const 레코드(비어 있어도 항상 만든다)이거나 블록 레코드.
//   - outerId는 [[OuterEnv]]다. 함수 환경 레코드의 바깥은 그 함수 객체의 [[Environment]], 블록은 블록에 들어가기 직전의 LexicalEnvironment다.
// - Binding.value는 표시 문자열이다("'global'"은 문자열 값, '함수 show', '객체 obj', 'undefined'). 초기화 전이면 null이다.
// - functions: 함수 객체와 그 [[Environment]]. 함수 선언은 전역 선언 처리 때, 메서드·화살표 함수는 평가되는 단계에서 나타난다.
//   바인딩을 담은 레코드가 빠지면 그 함수 객체도 뺀다(예: regular가 끝나면 그 안의 arrow).
// - lookup: 그 단계에서 이름(또는 this)을 찾는 경로. path는 실행 중 컨텍스트의 LexicalEnvironment부터 [[OuterEnv]]를 따라 처음 찾은 레코드까지다.
//   part는 전역 환경 레코드에서 찾았을 때만 어느 칸인지 적는다(선언적 칸을 먼저, 객체 칸을 나중에 본다).
//   this는 HasThisBinding이 true인 첫 레코드(전역 또는 화살표가 아닌 함수 환경 레코드)에서 멈춘다.
//   경로·result는 계산하지 않고 손으로 쓴다(테스트가 상태에서 다시 계산해 대조한다).
// - `created`(ContextCard·EnvRecord)와 `changed`(Binding)는 "그 단계에서" 새로 생기거나 초기화되거나 값이 바뀐 항목에만 붙이고 다음 단계에서는 해제한다.
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

export type ThisBinding = { status: 'lexical' } | { status: 'initialized'; value: string }

export type EnvRecord = {
  id: string
  kind: 'global' | 'function' | 'declarative'
  label: string
  outerId: string | null
  bindings: Binding[]
  objectBindings?: Binding[]
  thisBinding?: ThisBinding
  created?: true
}

export type FnObject = { name: string; environmentId: string }

export type Lookup = {
  kind: 'identifier' | 'this'
  name: string
  path: string[]
  foundIn: string
  part?: 'declarative' | 'object'
  result: string
}

export type ExecState = {
  stack: ContextCard[]
  envs: EnvRecord[]
  functions: FnObject[]
  lookup: Lookup | null
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const GLOBAL_OBJECT = '전역 객체'
const OBJ = '객체 obj'
const UNDEFINED = 'undefined'
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
  thisBinding: { status: 'initialized', value: GLOBAL_OBJECT },
  ...(created && { created: true as const }),
})
const fnEnv = (
  name: string,
  outerId: string,
  thisBinding: ThisBinding,
  bindings: Binding[] = [],
  created = false,
): EnvRecord => ({
  id: `${name}-fn`,
  kind: 'function',
  label: `${name} 함수 환경 레코드`,
  outerId,
  bindings,
  thisBinding,
  ...(created && { created: true as const }),
})
const lexEnv = (name: string, bindings: Binding[] = [], created = false): EnvRecord => ({
  id: `${name}-lex`,
  kind: 'declarative',
  label: `${name} 선언적 환경 레코드`,
  outerId: `${name}-fn`,
  bindings,
  ...(created && { created: true as const }),
})
const blockEnv = (outerId: string, bindings: Binding[], created = false): EnvRecord => ({
  id: 'block',
  kind: 'declarative',
  label: '블록 환경 레코드',
  outerId,
  bindings,
  ...(created && { created: true as const }),
})

const plainThis: ThisBinding = { status: 'initialized', value: GLOBAL_OBJECT }
const objThis: ThisBinding = { status: 'initialized', value: OBJ }
const lexicalThis: ThisBinding = { status: 'lexical' }

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
const fnCtx = (
  name: string,
  phase: Phase,
  created = false,
  lexicalEnv = `${name}-lex`,
): ContextCard => ({
  id: name,
  label: `${name} 실행 컨텍스트`,
  code: 'function',
  phase,
  lexicalEnv,
  variableEnv: `${name}-fn`,
  ...(created && { created: true as const }),
})

const fo = (name: string, environmentId: string): FnObject => ({ name, environmentId })

const st = (
  stack: ContextCard[],
  envs: EnvRecord[],
  functions: FnObject[],
  lookup: Lookup | null = null,
): ExecState => ({ stack, envs, functions, lookup })

const look = (
  name: string,
  path: string[],
  foundIn: string,
  result: string,
  part?: 'declarative' | 'object',
): Lookup => ({
  kind: 'identifier',
  name,
  path,
  foundIn,
  result,
  ...(part && { part }),
})
const lookThis = (path: string[], foundIn: string, result: string): Lookup => ({
  kind: 'this',
  name: 'this',
  path,
  foundIn,
  result,
})

const at = (n: number): LineRange => ({ from: n, to: n })
const lines = (from: number, to: number): LineRange => ({ from, to })

type ExecStep = Step<ExecState>

const before: ExecState = { stack: [], envs: [], functions: [], lookup: null }

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 실행 컨텍스트 스택(위쪽이 지금 실행 중인 컨텍스트)과 환경 레코드(이름과 값을 담는 레코드), 그리고 함수 객체가 기억하는 [[Environment]]를 보여 줍니다.'

const consoleNote = '(console.log 호출이 만드는 컨텍스트는 이 그림에서 생략합니다.)'

// --- 시나리오 1: 호출 스택 -----------------------------------------------------------------------

const csFns = [fo('first', 'global'), fo('second', 'global')]
const csGlobal = (changed = false, created = false) =>
  globalEnv(
    [init('first', fnValue('first'), changed), init('second', fnValue('second'), changed)],
    [],
    created,
  )

const callStackSteps: ExecStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '스크립트를 실행하려면 전역 실행 컨텍스트를 만들어 스택에 쌓고, 본문을 실행하기 전에 전역 선언 처리를 합니다. 함수 선언 first와 second는 전역 환경 레코드의 객체 환경 레코드 칸에 함수 객체로 만들어지고, 두 함수 객체의 [[Environment]]는 전역 환경 레코드입니다.',
    state: st([globalCtx('instantiation', true)], [csGlobal(true, true)], csFns),
    output: [],
  },
  {
    title: 'first() 호출: 컨텍스트 쌓기',
    explanation:
      '10번 줄의 호출로 first의 실행 컨텍스트가 만들어져 스택 맨 위에 쌓이고, 이제 이 컨텍스트가 실행 중입니다. 새 함수 환경 레코드의 바깥은 first 함수 객체의 [[Environment]]인 전역 환경 레코드이고, sloppy mode 함수를 그냥 호출했으므로 this는 전역 객체입니다. 본문 최상위의 let·const를 담을 선언적 환경 레코드도 만들어지는데, 이 예제에는 그런 이름이 없어 비어 있습니다.',
    line: at(10),
    state: st(
      [globalCtx('evaluation'), fnCtx('first', 'instantiation', true)],
      [csGlobal(), fnEnv('first', 'global', plainThis, [], true), lexEnv('first', [], true)],
      csFns,
    ),
    output: [],
  },
  {
    title: '출력: first start',
    explanation: `선언 처리를 마친 first의 컨텍스트가 본문의 2번 줄을 실행하고, console.log가 first start를 출력합니다. ${consoleNote}`,
    line: at(2),
    state: st(
      [globalCtx('evaluation'), fnCtx('first', 'evaluation')],
      [csGlobal(), fnEnv('first', 'global', plainThis), lexEnv('first')],
      csFns,
    ),
    output: ['first start'],
  },
  {
    title: 'second() 호출: 컨텍스트 쌓기',
    explanation:
      '3번 줄의 호출로 second의 실행 컨텍스트가 first 위에 쌓입니다. 이제 맨 위인 second가 실행 중이고, first는 second가 끝날 때까지 실행을 멈춘 채 스택에 남아 있습니다. second의 함수 환경 레코드도 바깥은 second 함수 객체의 [[Environment]]인 전역 환경 레코드입니다.',
    line: at(3),
    state: st(
      [
        globalCtx('evaluation'),
        fnCtx('first', 'evaluation'),
        fnCtx('second', 'instantiation', true),
      ],
      [
        csGlobal(),
        fnEnv('first', 'global', plainThis),
        lexEnv('first'),
        fnEnv('second', 'global', plainThis, [], true),
        lexEnv('second', [], true),
      ],
      csFns,
    ),
    output: ['first start'],
  },
  {
    title: '출력: second start',
    explanation: `second의 컨텍스트가 7번 줄을 실행해 second start를 출력합니다. 스택 맨 위의 컨텍스트가 실행 중인 코드입니다.`,
    line: at(7),
    state: st(
      [globalCtx('evaluation'), fnCtx('first', 'evaluation'), fnCtx('second', 'evaluation')],
      [
        csGlobal(),
        fnEnv('first', 'global', plainThis),
        lexEnv('first'),
        fnEnv('second', 'global', plainThis),
        lexEnv('second'),
      ],
      csFns,
    ),
    output: ['first start', 'second start'],
  },
  {
    title: '출력: second end',
    explanation: 'second의 컨텍스트가 8번 줄을 실행해 second end를 출력합니다.',
    line: at(8),
    state: st(
      [globalCtx('evaluation'), fnCtx('first', 'evaluation'), fnCtx('second', 'evaluation')],
      [
        csGlobal(),
        fnEnv('first', 'global', plainThis),
        lexEnv('first'),
        fnEnv('second', 'global', plainThis),
        lexEnv('second'),
      ],
      csFns,
    ),
    output: ['first start', 'second start', 'second end'],
  },
  {
    title: 'second 반환: 컨텍스트 빠짐',
    explanation:
      'second의 본문 실행이 끝나면 그 컨텍스트가 스택에서 빠지고, 멈춰 있던 first의 컨텍스트가 다시 맨 위가 되어 3번 줄 호출이 끝납니다. second의 환경 레코드는 이제 어떤 실행 컨텍스트도 가리키지 않아 그림에서 뺍니다.',
    line: at(3),
    state: st(
      [globalCtx('evaluation'), fnCtx('first', 'evaluation')],
      [csGlobal(), fnEnv('first', 'global', plainThis), lexEnv('first')],
      csFns,
    ),
    output: ['first start', 'second start', 'second end'],
  },
  {
    title: '출력: first end',
    explanation: 'first의 컨텍스트가 4번 줄을 실행해 first end를 출력합니다.',
    line: at(4),
    state: st(
      [globalCtx('evaluation'), fnCtx('first', 'evaluation')],
      [csGlobal(), fnEnv('first', 'global', plainThis), lexEnv('first')],
      csFns,
    ),
    output: ['first start', 'second start', 'second end', 'first end'],
  },
  {
    title: 'first 반환: 컨텍스트 빠짐',
    explanation:
      'first의 본문 실행이 끝나면 그 컨텍스트가 스택에서 빠지고, 전역 컨텍스트가 다시 맨 위가 되어 10번 줄 호출이 끝납니다. first의 환경 레코드도 그림에서 뺍니다.',
    line: at(10),
    state: st([globalCtx('evaluation')], [csGlobal()], csFns),
    output: ['first start', 'second start', 'second end', 'first end'],
  },
  {
    title: '출력: global end',
    explanation:
      '전역 컨텍스트가 11번 줄을 실행해 global end를 출력합니다. 스택에는 전역 컨텍스트만 남았습니다.',
    line: at(11),
    state: st([globalCtx('evaluation')], [csGlobal()], csFns),
    output: ['first start', 'second start', 'second end', 'first end', 'global end'],
  },
]

// --- 시나리오 2: 식별자 탐색은 정의한 곳을 따른다 ---------------------------------------------------

const luFns = [fo('show', 'global'), fo('run', 'global')]
const luGlobal = (label: Binding, changedFns = false, created = false): EnvRecord =>
  globalEnv(
    [init('show', fnValue('show'), changedFns), init('run', fnValue('run'), changedFns)],
    [label],
    created,
  )
const labelGlobal = str('global')
const labelRun = str('run')

const lookupSteps: ExecStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. 함수 선언 show와 run은 객체 환경 레코드 칸에 만들어지고 [[Environment]]는 전역 환경 레코드입니다. const label은 선언적 환경 레코드 칸에 바인딩이 만들어지지만 선언문을 실행하기 전이라 초기화 전 상태입니다.',
    state: st(
      [globalCtx('instantiation', true)],
      [luGlobal(uninit('label', true), true, true)],
      luFns,
    ),
    output: [],
  },
  {
    title: "label에 'global'이 들어감",
    explanation:
      "1번 줄의 선언문을 실행하면 전역 환경 레코드의 label 바인딩이 초기화되어 값 'global'을 갖습니다.",
    line: at(1),
    state: st([globalCtx('evaluation')], [luGlobal(init('label', labelGlobal, true))], luFns),
    output: [],
  },
  {
    title: 'run() 호출: 컨텍스트 쌓기',
    explanation:
      '9번 줄의 호출로 run의 실행 컨텍스트가 쌓입니다. run의 함수 환경 레코드의 바깥은 run 함수 객체의 [[Environment]]인 전역 환경 레코드입니다. run의 선언적 환경 레코드에는 const label의 바인딩이 만들어지지만 아직 초기화 전입니다.',
    line: at(9),
    state: st(
      [globalCtx('evaluation'), fnCtx('run', 'instantiation', true)],
      [
        luGlobal(init('label', labelGlobal)),
        fnEnv('run', 'global', plainThis, [], true),
        lexEnv('run', [uninit('label', true)], true),
      ],
      luFns,
    ),
    output: [],
  },
  {
    title: "run의 label에 'run'이 들어감",
    explanation:
      "6번 줄의 선언문을 실행해 run의 선언적 환경 레코드에 있는 label이 초기화되고 값은 'run'이 됩니다. 전역의 label은 그대로 'global'입니다.",
    line: at(6),
    state: st(
      [globalCtx('evaluation'), fnCtx('run', 'evaluation')],
      [
        luGlobal(init('label', labelGlobal)),
        fnEnv('run', 'global', plainThis),
        lexEnv('run', [init('label', labelRun, true)]),
      ],
      luFns,
    ),
    output: [],
  },
  {
    title: 'show() 호출: 컨텍스트 쌓기',
    explanation:
      '7번 줄의 호출로 show의 실행 컨텍스트가 run 위에 쌓입니다. show의 함수 환경 레코드의 바깥은 show 함수 객체의 [[Environment]], 곧 show를 정의한 전역 환경 레코드입니다. show를 호출한 run의 레코드는 바깥이 아닙니다.',
    line: at(7),
    state: st(
      [globalCtx('evaluation'), fnCtx('run', 'evaluation'), fnCtx('show', 'instantiation', true)],
      [
        luGlobal(init('label', labelGlobal)),
        fnEnv('run', 'global', plainThis),
        lexEnv('run', [init('label', labelRun)]),
        fnEnv('show', 'global', plainThis, [], true),
        lexEnv('show', [], true),
      ],
      luFns,
    ),
    output: [],
  },
  {
    title: 'label 이름 찾기',
    explanation:
      "3번 줄에서 label을 읽습니다. 실행 중인 show 컨텍스트의 LexicalEnvironment인 show의 선언적 환경 레코드부터 시작해 [[OuterEnv]]를 따라 show의 함수 환경 레코드, 전역 환경 레코드로 올라갑니다. 전역 환경 레코드는 선언적 칸을 먼저 확인하고, 거기서 label을 찾아 값 'global'을 읽습니다.",
    line: at(3),
    state: st(
      [globalCtx('evaluation'), fnCtx('run', 'evaluation'), fnCtx('show', 'evaluation')],
      [
        luGlobal(init('label', labelGlobal)),
        fnEnv('run', 'global', plainThis),
        lexEnv('run', [init('label', labelRun)]),
        fnEnv('show', 'global', plainThis),
        lexEnv('show'),
      ],
      luFns,
      look('label', ['show-lex', 'show-fn', 'global'], 'global', labelGlobal, 'declarative'),
    ),
    output: [],
  },
  {
    title: 'show 반환: 컨텍스트 빠짐',
    explanation:
      "show가 'global'을 돌려주며 끝나면 show의 컨텍스트가 스택에서 빠지고, run의 컨텍스트가 다시 맨 위가 되어 7번 줄이 이어집니다. show의 환경 레코드는 그림에서 뺍니다.",
    line: at(7),
    state: st(
      [globalCtx('evaluation'), fnCtx('run', 'evaluation')],
      [
        luGlobal(init('label', labelGlobal)),
        fnEnv('run', 'global', plainThis),
        lexEnv('run', [init('label', labelRun)]),
      ],
      luFns,
    ),
    output: [],
  },
  {
    title: 'run 반환: 컨텍스트 빠짐',
    explanation:
      'run도 그 값을 돌려주며 끝나면 컨텍스트가 스택에서 빠지고 전역 컨텍스트가 다시 맨 위가 됩니다. run의 환경 레코드도 그림에서 뺍니다.',
    line: at(9),
    state: st([globalCtx('evaluation')], [luGlobal(init('label', labelGlobal))], luFns),
    output: [],
  },
  {
    title: '출력: global',
    explanation:
      "9번 줄의 console.log가 run()이 돌려준 값 'global'을 출력합니다. run 안에 label이 있었지만 show가 읽은 것은 show를 정의한 곳의 label이라서 'run'이 아닙니다.",
    line: at(9),
    state: st([globalCtx('evaluation')], [luGlobal(init('label', labelGlobal))], luFns),
    output: ['global'],
  },
]

// --- 시나리오 3: 블록의 환경 교체와 복원 ----------------------------------------------------------

const blFns = [fo('test', 'global')]
const xGlobal = str('global')
const xFunction = str('function')
const xBlock = str('block')
const blGlobal = (x: Binding, changedFn = false, created = false) =>
  globalEnv([init('test', fnValue('test'), changedFn)], [x], created)

const blockSteps: ExecStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. 함수 선언 test는 객체 환경 레코드 칸에, let x는 선언적 환경 레코드 칸에 초기화 전 상태로 만들어집니다.',
    state: st([globalCtx('instantiation', true)], [blGlobal(uninit('x', true), true, true)], blFns),
    output: [],
  },
  {
    title: "전역 x에 'global'이 들어감",
    explanation:
      "1번 줄의 선언문을 실행해 전역 환경 레코드의 x가 초기화되고 값은 'global'이 됩니다.",
    line: at(1),
    state: st([globalCtx('evaluation')], [blGlobal(init('x', xGlobal, true))], blFns),
    output: [],
  },
  {
    title: 'test() 호출: 컨텍스트 쌓기',
    explanation:
      '12번 줄의 호출로 test의 실행 컨텍스트가 쌓입니다. 선언 처리에서 함수 안의 var y는 함수 환경 레코드에 undefined로 만들어지고(블록 안에 쓴 var도 마찬가지입니다), 본문 최상위의 let x는 선언적 환경 레코드에 초기화 전 상태로 만들어집니다. 이 컨텍스트의 LexicalEnvironment는 선언적 환경 레코드, VariableEnvironment는 함수 환경 레코드입니다.',
    line: at(12),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'instantiation', true)],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', UNDEFINED, true)], true),
        lexEnv('test', [uninit('x', true)], true),
      ],
      blFns,
    ),
    output: [],
  },
  {
    title: "test의 x에 'function'이 들어감",
    explanation:
      "3번 줄의 선언문을 실행해 test의 선언적 환경 레코드에 있는 x가 초기화되고 값은 'function'이 됩니다. 전역 x는 그대로입니다.",
    line: at(3),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', UNDEFINED)]),
        lexEnv('test', [init('x', xFunction, true)]),
      ],
      blFns,
    ),
    output: [],
  },
  {
    title: '블록 진입: LexicalEnvironment 교체',
    explanation:
      '4번 줄에서 블록에 들어갑니다. 블록의 선언 처리로 새 선언적 환경 레코드가 만들어지는데 바깥은 들어가기 직전의 LexicalEnvironment인 test의 선언적 환경 레코드이고, let x는 초기화 전 상태입니다. 그리고 실행 컨텍스트의 LexicalEnvironment가 이 블록 레코드로 바뀝니다(새 실행 컨텍스트는 만들어지지 않고 VariableEnvironment는 그대로입니다).',
    line: at(4),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation', false, 'block')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', UNDEFINED)]),
        lexEnv('test', [init('x', xFunction)]),
        blockEnv('test-lex', [uninit('x', true)], true),
      ],
      blFns,
    ),
    output: [],
  },
  {
    title: "블록의 x에 'block'이 들어감",
    explanation:
      "5번 줄의 선언문을 실행해 블록 환경 레코드의 x가 초기화되고 값은 'block'이 됩니다. test의 x는 그대로 'function'입니다.",
    line: at(5),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation', false, 'block')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', UNDEFINED)]),
        lexEnv('test', [init('x', xFunction)]),
        blockEnv('test-lex', [init('x', xBlock, true)]),
      ],
      blFns,
    ),
    output: [],
  },
  {
    title: "var y에 'var'가 들어감",
    explanation:
      "6번 줄을 실행하면 y의 값이 'var'가 됩니다. y의 바인딩은 블록 레코드가 아니라 선언 처리 때 만들어진 test의 함수 환경 레코드(VariableEnvironment)에 있어서, 그 레코드의 값이 바뀝니다.",
    line: at(6),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation', false, 'block')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', str('var'), true)]),
        lexEnv('test', [init('x', xFunction)]),
        blockEnv('test-lex', [init('x', xBlock)]),
      ],
      blFns,
    ),
    output: [],
  },
  {
    title: '블록 안에서 x 찾기',
    explanation:
      "7번 줄에서 x를 읽습니다. 실행 컨텍스트의 LexicalEnvironment가 블록 환경 레코드이므로 거기서 시작하고, 바로 x를 찾아 값 'block'을 읽어 출력합니다.",
    line: at(7),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation', false, 'block')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', str('var'))]),
        lexEnv('test', [init('x', xFunction)]),
        blockEnv('test-lex', [init('x', xBlock)]),
      ],
      blFns,
      look('x', ['block'], 'block', xBlock),
    ),
    output: ['block'],
  },
  {
    title: '블록 끝: LexicalEnvironment 복원',
    explanation:
      '8번 줄에서 블록 실행이 끝나면 LexicalEnvironment를 블록에 들어가기 전 값인 test의 선언적 환경 레코드로 되돌립니다. 이 블록 레코드는 어떤 실행 컨텍스트도 가리키지 않아 그림에서 뺍니다.',
    line: at(8),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', str('var'))]),
        lexEnv('test', [init('x', xFunction)]),
      ],
      blFns,
    ),
    output: ['block'],
  },
  {
    title: '블록 뒤에서 x 찾기',
    explanation:
      "9번 줄에서 x를 읽습니다. LexicalEnvironment가 test의 선언적 환경 레코드로 돌아왔으므로 거기서 x를 찾아 값 'function'을 읽습니다.",
    line: at(9),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', str('var'))]),
        lexEnv('test', [init('x', xFunction)]),
      ],
      blFns,
      look('x', ['test-lex'], 'test-lex', xFunction),
    ),
    output: ['block', 'function'],
  },
  {
    title: 'y 찾기',
    explanation:
      "10번 줄에서 y를 읽습니다. test의 선언적 환경 레코드에는 y가 없어서 [[OuterEnv]]를 따라 test의 함수 환경 레코드로 올라가고, 거기서 찾아 값 'var'를 읽습니다. 블록 안에서 쓴 var였지만 블록과 상관없이 함수 환경 레코드에 있습니다.",
    line: at(10),
    state: st(
      [globalCtx('evaluation'), fnCtx('test', 'evaluation')],
      [
        blGlobal(init('x', xGlobal)),
        fnEnv('test', 'global', plainThis, [init('y', str('var'))]),
        lexEnv('test', [init('x', xFunction)]),
      ],
      blFns,
      look('y', ['test-lex', 'test-fn'], 'test-fn', str('var')),
    ),
    output: ['block', 'function', 'var'],
  },
  {
    title: 'test 반환: 컨텍스트 빠짐',
    explanation:
      'test의 본문 실행이 끝나면 그 컨텍스트가 스택에서 빠지고 전역 컨텍스트가 다시 맨 위가 되어 12번 줄 호출이 끝납니다. test의 환경 레코드는 그림에서 뺍니다.',
    line: at(12),
    state: st([globalCtx('evaluation')], [blGlobal(init('x', xGlobal))], blFns),
    output: ['block', 'function', 'var'],
  },
  {
    title: '전역 x 찾기',
    explanation:
      "13번 줄에서 x를 읽습니다. 실행 중인 전역 컨텍스트의 LexicalEnvironment인 전역 환경 레코드의 선언적 칸에서 x를 찾아 값 'global'을 읽어 출력합니다.",
    line: at(13),
    state: st(
      [globalCtx('evaluation')],
      [blGlobal(init('x', xGlobal))],
      blFns,
      look('x', ['global'], 'global', xGlobal, 'declarative'),
    ),
    output: ['block', 'function', 'var', 'global'],
  },
]

// --- 시나리오 4: this 바인딩의 위치 ----------------------------------------------------------------

const thGlobal = (obj: Binding, created = false) => globalEnv([], [obj], created)
const thRegularEnvs = (arrow: Binding, created = false) => [
  fnEnv('regular', 'global', objThis, [], created),
  lexEnv('regular', [arrow], created),
]
const thFnsRegular = [fo('regular', 'global')]
const thFnsArrow = [fo('regular', 'global'), fo('arrow', 'regular-lex')]
const arrowValue = fnValue('arrow')

const thisSteps: ExecStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 코드의 선언 처리',
    explanation:
      '전역 실행 컨텍스트를 만들어 스택에 쌓고 전역 선언 처리를 합니다. const obj는 선언적 환경 레코드 칸에 초기화 전 상태로 만들어집니다. 이 예제에는 전역 var나 함수 선언이 없어 객체 환경 레코드 칸은 비어 있습니다.',
    state: st([globalCtx('instantiation', true)], [thGlobal(uninit('obj', true), true)], []),
    output: [],
  },
  {
    title: 'obj에 객체가 들어감',
    explanation:
      '1~7번 줄의 선언문을 실행합니다. 객체 리터럴을 평가하면서 메서드 regular의 함수 객체가 만들어지고, 그 [[Environment]]는 이때 실행 중인 컨텍스트의 LexicalEnvironment인 전역 환경 레코드입니다. 그 객체로 obj가 초기화됩니다.',
    line: lines(1, 7),
    state: st([globalCtx('evaluation')], [thGlobal(init('obj', OBJ, true))], thFnsRegular),
    output: [],
  },
  {
    title: 'obj.regular() 호출: 컨텍스트 쌓기',
    explanation:
      '8번 줄의 호출로 regular의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 regular의 [[Environment]]인 전역 환경 레코드이고, obj.regular()처럼 메서드로 불렸으므로 this 바인딩은 obj로 정해져 이 함수 환경 레코드에 들어갑니다. 선언적 환경 레코드에는 const arrow가 초기화 전 상태로 만들어집니다.',
    line: at(8),
    state: st(
      [globalCtx('evaluation'), fnCtx('regular', 'instantiation', true)],
      [thGlobal(init('obj', OBJ)), ...thRegularEnvs(uninit('arrow', true), true)],
      thFnsRegular,
    ),
    output: [],
  },
  {
    title: 'arrow에 화살표 함수가 들어감',
    explanation:
      '4번 줄의 선언문을 실행합니다. 화살표 함수 식을 평가해 함수 객체를 만들 때 [[Environment]]는 실행 중인 컨텍스트의 LexicalEnvironment, 곧 regular의 선언적 환경 레코드가 됩니다. 그 함수 객체로 arrow가 초기화됩니다.',
    line: at(4),
    state: st(
      [globalCtx('evaluation'), fnCtx('regular', 'evaluation')],
      [thGlobal(init('obj', OBJ)), ...thRegularEnvs(init('arrow', arrowValue, true))],
      thFnsArrow,
    ),
    output: [],
  },
  {
    title: 'arrow() 호출: 컨텍스트 쌓기',
    explanation:
      '5번 줄의 호출로 arrow의 실행 컨텍스트가 쌓입니다. 함수 환경 레코드의 바깥은 arrow의 [[Environment]]인 regular의 선언적 환경 레코드입니다. 화살표 함수의 환경 레코드에는 this 바인딩이 없습니다.',
    line: at(5),
    state: st(
      [
        globalCtx('evaluation'),
        fnCtx('regular', 'evaluation'),
        fnCtx('arrow', 'instantiation', true),
      ],
      [
        thGlobal(init('obj', OBJ)),
        ...thRegularEnvs(init('arrow', arrowValue)),
        fnEnv('arrow', 'regular-lex', lexicalThis, [], true),
        lexEnv('arrow', [], true),
      ],
      thFnsArrow,
    ),
    output: [],
  },
  {
    title: 'this 찾기',
    explanation:
      '4번 줄의 this.name에서 this의 값을 찾습니다. arrow의 선언적 환경 레코드부터 [[OuterEnv]]를 따라 올라가며 this 바인딩이 있는 첫 레코드를 찾습니다. arrow의 함수 환경 레코드와 regular의 선언적 환경 레코드에는 this 바인딩이 없고, regular의 함수 환경 레코드에서 찾아 obj를 얻습니다.',
    line: at(4),
    state: st(
      [globalCtx('evaluation'), fnCtx('regular', 'evaluation'), fnCtx('arrow', 'evaluation')],
      [
        thGlobal(init('obj', OBJ)),
        ...thRegularEnvs(init('arrow', arrowValue)),
        fnEnv('arrow', 'regular-lex', lexicalThis),
        lexEnv('arrow'),
      ],
      thFnsArrow,
      lookThis(['arrow-lex', 'arrow-fn', 'regular-lex', 'regular-fn'], 'regular-fn', OBJ),
    ),
    output: [],
  },
  {
    title: 'arrow 반환: 컨텍스트 빠짐',
    explanation:
      "obj의 name 'obj'를 돌려주며 arrow가 끝나면 컨텍스트가 스택에서 빠지고, regular의 컨텍스트가 다시 맨 위가 되어 5번 줄이 이어집니다. arrow의 환경 레코드는 그림에서 뺍니다. arrow 함수 객체는 regular의 선언적 환경 레코드의 arrow 바인딩이 가리키고 있어 아직 남아 있습니다.",
    line: at(5),
    state: st(
      [globalCtx('evaluation'), fnCtx('regular', 'evaluation')],
      [thGlobal(init('obj', OBJ)), ...thRegularEnvs(init('arrow', arrowValue))],
      thFnsArrow,
    ),
    output: [],
  },
  {
    title: 'regular 반환: 컨텍스트 빠짐',
    explanation:
      'regular도 그 값을 돌려주며 끝나면 컨텍스트가 스택에서 빠지고 전역 컨텍스트가 다시 맨 위가 됩니다. regular의 환경 레코드를 그림에서 빼고, 그 레코드 안의 arrow 바인딩이 가리키던 함수 객체도 함께 뺍니다.',
    line: at(8),
    state: st([globalCtx('evaluation')], [thGlobal(init('obj', OBJ))], thFnsRegular),
    output: [],
  },
  {
    title: '출력: obj',
    explanation:
      "8번 줄의 console.log가 obj.regular()가 돌려준 값 'obj'를 출력합니다. 화살표 함수의 this는 자기 레코드가 아니라 바깥 regular의 this 바인딩에서 찾은 값입니다.",
    line: at(8),
    state: st([globalCtx('evaluation')], [thGlobal(init('obj', OBJ))], thFnsRegular),
    output: ['obj'],
  },
]

// --- 시나리오 목록 -------------------------------------------------------------------------------

export const scenarios: Scenario<ExecState>[] = [
  {
    id: 'stack',
    label: '호출 스택',
    exampleId: 'call-stack',
    code: callStackCode,
    steps: callStackSteps,
  },
  {
    id: 'lookup',
    label: '이름 찾기와 정의한 곳',
    exampleId: 'lookup-defined',
    code: lookupDefinedCode,
    steps: lookupSteps,
  },
  {
    id: 'block',
    label: '블록의 환경 교체와 복원',
    exampleId: 'block-env',
    code: blockEnvCode,
    steps: blockSteps,
  },
  {
    id: 'this',
    label: 'this 바인딩의 위치',
    exampleId: 'this-env',
    code: thisEnvCode,
    steps: thisSteps,
  },
]
