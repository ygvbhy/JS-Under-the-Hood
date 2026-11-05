import type { Scenario, Step } from '~/simulator/types'
import nextArgCode from './examples/next-arg.js?raw'
import returnFinallyCode from './examples/return-finally.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - stack: 실행 컨텍스트 스택. 아래(먼저 쌓인 것) → 위(지금 실행 중). '전역 코드', '<함수 이름> 본문'.
//   내장 메서드(next, return)와 console.log의 프레임은 그리지 않는다
// - gens: 제너레이터 객체(이름은 그것을 담은 변수 이름)와 그 본문이 기억하는 변수.
//   값은 표시용 문자열이며 문자열은 따옴표를 붙인다('hi'), undefined는 undefined
// - call: 지금 처리 중인 메서드 호출. arg는 표시용 문자열이라 따옴표를 붙이고("'hi'"), 인수가 없으면 ''.
//   호출을 시작하는 단계부터 결과가 정해지는 단계까지 유지하고, 그 결과를 쓰는 다음 단계(console.log)에서 null로 비운다
// - result: 직전 호출이 돌려준 결과 객체. 호출을 시작하면 null이 되고, 결과가 정해지는 단계에서 채워져 console.log 단계까지 유지된다.
//   새 제너레이터를 만드는 문장(var early = task())에서도 비운다.
//   value는 따옴표 없이 콘솔 출력과 같은 표기로 쓴다(출력이 `value + ' ' + done`이므로 'first', 'undefined', '중단').
//   따라서 결과를 출력하는 단계의 출력 줄은 `${result.value} ${result.done}`와 같다

export type GenStatus = 'suspended-start' | 'suspended-yield' | 'executing' | 'completed'

export type GenState = {
  stack: string[]
  gens: { name: string; status: GenStatus; vars: { name: string; value: string }[] }[]
  call: { target: string; method: 'next' | 'return'; arg: string } | null
  result: { value: string; done: boolean } | null
}

type GStep = Step<GenState>

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })
const range = (from: number, to: number) => ({ from, to })

type Gen = GenState['gens'][number]
const gen = (name: string, status: GenStatus, vars: [string, string][] = []): Gen => ({
  name,
  status,
  vars: vars.map(([n, value]) => ({ name: n, value })),
})
const call = (target: string, method: 'next' | 'return', arg: string): GenState['call'] => ({
  target,
  method,
  arg,
})
const res = (value: string, done: boolean): GenState['result'] => ({ value, done })

const state = (
  stack: string[],
  gens: Gen[],
  callInfo: GenState['call'],
  result: GenState['result'],
): GenState => ({ stack, gens, call: callInfo, result })

const G = '전역 코드'
const TALK = 'talk 본문'
const TASK = 'task 본문'

// --- 1. next와 yield의 왕복 ----------------------------------------------------------------

const UNDEF: [string, string][] = [
  ['a', 'undefined'],
  ['b', 'undefined'],
]
const A_HI: [string, string][] = [
  ['a', "'hi'"],
  ['b', 'undefined'],
]
const AB: [string, string][] = [
  ['a', "'hi'"],
  ['b', "'bye'"],
]

const IGNORED = call('it', 'next', "'ignored'")
const HI = call('it', 'next', "'hi'")
const BYE = call('it', 'next', "'bye'")
const AGAIN = call('it', 'next', "'again'")

const nextSteps: GStep[] = [
  {
    title: '실행 시작',
    explanation:
      '전역 코드가 시작되면 function* 선언의 함수 객체가 먼저 만들어집니다. 아직 제너레이터 객체는 없고, 실행 컨텍스트 스택에는 전역 코드만 있습니다.',
    line: range(1, 7),
    state: state([G], [], null, null),
    output: [],
  },
  {
    title: 'var it = talk()',
    explanation:
      '제너레이터 함수를 부르면 FunctionDeclarationInstantiation이 매개변수와 var 변수 a, b를 만들고(값은 undefined) 제너레이터 객체를 돌려줍니다. 본문의 문장은 하나도 실행되지 않았고, 제너레이터는 suspended-start 상태입니다. 이 호출 동안 talk의 실행 컨텍스트가 스택에 올랐다가 빠지는데, 그림은 이 과정을 한 단계로 합쳐 그립니다. 빠진 컨텍스트는 제너레이터가 기억해 두었다가 next에서 다시 올립니다.',
    line: at(8),
    state: state([G], [gen('it', 'suspended-start', UNDEF)], null, null),
    output: [],
  },
  {
    title: "it.next('ignored')",
    explanation:
      "next를 부르면 제너레이터가 executing 상태가 되고 본문 컨텍스트가 스택에 올라 본문이 시작됩니다. 시작 지점은 인수를 받지 않으므로(명세: 본문을 시작하는 클로저는 인수 없이 불린다) 'ignored'는 쓰이지 않습니다.",
    line: at(9),
    state: state([G, TALK], [gen('it', 'executing', UNDEF)], IGNORED, null),
    output: [],
  },
  {
    title: "yield 'first'",
    explanation:
      "yield에 닿으면 { value: 'first', done: false } 결과 객체가 만들어지고, 제너레이터는 suspended-yield 상태로 멈추며 본문 컨텍스트가 스택에서 빠집니다. 호출한 쪽(전역 코드)이 그 결과를 받습니다. a에는 아직 아무것도 대입되지 않았습니다.",
    line: at(2),
    state: state([G], [gen('it', 'suspended-yield', UNDEF)], IGNORED, res('first', false)),
    output: [],
  },
  {
    title: 'r1의 값을 출력',
    explanation: '결과 객체의 value와 done을 출력합니다. 첫 next는 첫 yield 값을 돌려준 것입니다.',
    line: at(10),
    state: state([G], [gen('it', 'suspended-yield', UNDEF)], null, res('first', false)),
    output: ['first false'],
  },
  {
    title: "it.next('hi')",
    explanation:
      "next를 다시 부르면 제너레이터가 executing 상태가 되고 본문 컨텍스트가 다시 스택에 오릅니다. 멈춰 있던 yield 식이 이 호출의 인수 'hi'를 값으로 삼아 이어집니다. 이번에는 멈춘 yield 지점에서 재개되므로 인수가 쓰입니다.",
    line: at(11),
    state: state([G, TALK], [gen('it', 'executing', UNDEF)], HI, null),
    output: ['first false'],
  },
  {
    title: "a에 'hi' 대입",
    explanation:
      "yield 식의 값이 'hi'이므로 var a = yield 'first'의 대입이 끝나 a는 'hi'가 됩니다.",
    line: at(2),
    state: state([G, TALK], [gen('it', 'executing', A_HI)], HI, null),
    output: ['first false'],
  },
  {
    title: "console.log('a = ' + a)",
    explanation: '본문이 이어서 실행되어 a의 값을 출력합니다.',
    line: at(3),
    state: state([G, TALK], [gen('it', 'executing', A_HI)], HI, null),
    output: ['first false', 'a = hi'],
  },
  {
    title: "yield 'second'",
    explanation:
      "두 번째 yield에서 { value: 'second', done: false }를 돌려주고 다시 suspended-yield 상태로 멈춥니다. 본문 컨텍스트는 스택에서 빠지고, a의 'hi'는 그대로 남아 있습니다.",
    line: at(4),
    state: state([G], [gen('it', 'suspended-yield', A_HI)], HI, res('second', false)),
    output: ['first false', 'a = hi'],
  },
  {
    title: 'r2의 값을 출력',
    explanation: '두 번째 결과를 출력합니다.',
    line: at(12),
    state: state([G], [gen('it', 'suspended-yield', A_HI)], null, res('second', false)),
    output: ['first false', 'a = hi', 'second false'],
  },
  {
    title: "it.next('bye')",
    explanation:
      "세 번째 next로 다시 재개됩니다. 멈춰 있던 두 번째 yield 식의 값이 'bye'가 됩니다.",
    line: at(13),
    state: state([G, TALK], [gen('it', 'executing', A_HI)], BYE, null),
    output: ['first false', 'a = hi', 'second false'],
  },
  {
    title: "b에 'bye' 대입",
    explanation: "var b = yield 'second'의 대입이 끝나 b가 'bye'가 됩니다.",
    line: at(4),
    state: state([G, TALK], [gen('it', 'executing', AB)], BYE, null),
    output: ['first false', 'a = hi', 'second false'],
  },
  {
    title: "console.log('b = ' + b)",
    explanation: 'b의 값을 출력합니다.',
    line: at(5),
    state: state([G, TALK], [gen('it', 'executing', AB)], BYE, null),
    output: ['first false', 'a = hi', 'second false', 'b = bye'],
  },
  {
    title: "return 'end'",
    explanation:
      "본문이 return 'end'로 끝나면 제너레이터는 completed 상태가 되고 본문 컨텍스트가 스택에서 빠집니다. 결과는 { value: 'end', done: true }입니다. 명세의 NOTE가 밝히듯 completed 상태에 들어간 제너레이터는 다시 completed가 아닌 상태로 돌아가지 않습니다.",
    line: at(6),
    state: state([G], [gen('it', 'completed', AB)], BYE, res('end', true)),
    output: ['first false', 'a = hi', 'second false', 'b = bye'],
  },
  {
    title: 'r3의 값을 출력',
    explanation: 'return 값은 done이 true인 결과의 value로 나옵니다.',
    line: at(14),
    state: state([G], [gen('it', 'completed', AB)], null, res('end', true)),
    output: ['first false', 'a = hi', 'second false', 'b = bye', 'end true'],
  },
  {
    title: "it.next('again')",
    explanation:
      "completed 상태에서 next를 부르면 GeneratorResume이 곧바로 CreateIteratorResultObject(undefined, true)를 돌려줍니다. 본문 컨텍스트는 스택에 오르지 않으므로 'again'은 쓰일 곳이 없습니다.",
    line: at(15),
    state: state([G], [gen('it', 'completed', AB)], AGAIN, res('undefined', true)),
    output: ['first false', 'a = hi', 'second false', 'b = bye', 'end true'],
  },
  {
    title: 'r4의 값을 출력',
    explanation: '끝난 제너레이터는 계속 value가 undefined이고 done이 true인 결과를 돌려줍니다.',
    line: at(16),
    state: state([G], [gen('it', 'completed', AB)], null, res('undefined', true)),
    output: ['first false', 'a = hi', 'second false', 'b = bye', 'end true', 'undefined true'],
  },
]

// --- 2. return()과 finally -----------------------------------------------------------------

const itGen = (status: GenStatus) => gen('it', status)
const NEXT_EMPTY = call('it', 'next', '')
const RETURN_STOP = call('it', 'return', "'중단'")
const RETURN_EARLY = call('early', 'return', "'시작 전'")
const RETURN_AGAIN = call('it', 'return', "'또'")

const returnSteps: GStep[] = [
  {
    title: '실행 시작',
    explanation:
      '전역 코드가 시작되면 function* 선언의 함수 객체가 먼저 만들어집니다. 아직 제너레이터 객체는 없고, 실행 컨텍스트 스택에는 전역 코드만 있습니다.',
    line: range(1, 8),
    state: state([G], [], null, null),
    output: [],
  },
  {
    title: 'var it = task()',
    explanation:
      '제너레이터 함수를 부르면 본문은 실행되지 않고 제너레이터 객체만 돌아옵니다. 이 제너레이터는 suspended-start 상태이며, task의 본문 변수는 없습니다. 호출 동안 task의 실행 컨텍스트가 스택에 올랐다 빠지는 과정은 한 단계로 합쳐 그립니다.',
    line: at(9),
    state: state([G], [itGen('suspended-start')], null, null),
    output: [],
  },
  {
    title: 'it.next()',
    explanation:
      'next를 부르면 제너레이터가 executing 상태가 되고 본문 컨텍스트가 스택에 올라 본문이 시작됩니다.',
    line: at(10),
    state: state([G, TASK], [itGen('executing')], NEXT_EMPTY, null),
    output: [],
  },
  {
    title: "yield 'step 1'",
    explanation:
      "첫 yield에서 { value: 'step 1', done: false }를 돌려주고 suspended-yield 상태로 멈춥니다. 본문 컨텍스트는 스택에서 빠집니다.",
    line: at(3),
    state: state([G], [itGen('suspended-yield')], NEXT_EMPTY, res('step 1', false)),
    output: [],
  },
  {
    title: 'r1의 값을 출력',
    explanation: '첫 결과를 출력합니다.',
    line: at(11),
    state: state([G], [itGen('suspended-yield')], null, res('step 1', false)),
    output: ['step 1 false'],
  },
  {
    title: "it.return('중단')",
    explanation:
      "멈춰 있는 제너레이터에 return을 부르면 GeneratorResumeAbrupt가 제너레이터를 executing 상태로 바꾸고 본문 컨텍스트를 스택에 올립니다. 이번에는 멈춘 yield 지점에서 그 자리에서 return '중단'이 일어난 것처럼 재개되므로, 두 번째 yield는 실행되지 않고 본문을 빠져나가는 쪽으로 진행합니다.",
    line: at(12),
    state: state([G, TASK], [itGen('executing')], RETURN_STOP, null),
    output: ['step 1 false'],
  },
  {
    title: 'finally 블록 실행',
    explanation:
      '멈춰 있던 yield가 finally가 있는 try 블록 안에 있으므로, 빠져나가는 길에 finally 블록이 실행됩니다. 본문 컨텍스트가 스택에 올라 있는 상태에서 출력합니다.',
    line: at(6),
    state: state([G, TASK], [itGen('executing')], RETURN_STOP, null),
    output: ['step 1 false', '정리'],
  },
  {
    title: '본문이 끝나 completed',
    explanation:
      "finally 블록이 끝나면 본문을 빠져나갑니다. 제너레이터는 completed 상태가 되고 본문 컨텍스트가 스택에서 빠지며, 결과는 { value: '중단', done: true }입니다.",
    line: at(7),
    state: state([G], [itGen('completed')], RETURN_STOP, res('중단', true)),
    output: ['step 1 false', '정리'],
  },
  {
    title: 'r2의 값을 출력',
    explanation:
      'return()의 인수가 done이 true인 결과의 value로 나옵니다. step 2의 yield는 실행되지 않았습니다.',
    line: at(13),
    state: state([G], [itGen('completed')], null, res('중단', true)),
    output: ['step 1 false', '정리', '중단 true'],
  },
  {
    title: 'it.next()',
    explanation:
      'completed 상태에서 next를 부르면 본문을 재개하지 않고 곧바로 value가 undefined이고 done이 true인 결과를 돌려줍니다. 스택에는 아무것도 오르지 않습니다.',
    line: at(14),
    state: state([G], [itGen('completed')], NEXT_EMPTY, res('undefined', true)),
    output: ['step 1 false', '정리', '중단 true'],
  },
  {
    title: 'r3의 값을 출력',
    explanation: '끝난 제너레이터는 계속 undefined와 true를 돌려줍니다.',
    line: at(15),
    state: state([G], [itGen('completed')], null, res('undefined', true)),
    output: ['step 1 false', '정리', '중단 true', 'undefined true'],
  },
  {
    title: 'var early = task()',
    explanation:
      '같은 제너레이터 함수를 다시 부르면 새 제너레이터 객체가 suspended-start 상태로 만들어집니다. 앞의 it은 completed 그대로입니다.',
    line: at(16),
    state: state([G], [itGen('completed'), gen('early', 'suspended-start')], null, null),
    output: ['step 1 false', '정리', '중단 true', 'undefined true'],
  },
  {
    title: "early.return('시작 전')",
    explanation:
      "시작 전(suspended-start)인 제너레이터에 return을 부르면 GeneratorResumeAbrupt가 본문을 재개하지 않고 곧바로 completed 상태로 바꿉니다. 본문 컨텍스트가 스택에 오르지 않고 본문이 재개되지 않으므로 finally 블록도 실행되지 않습니다. 결과는 { value: '시작 전', done: true }입니다.",
    line: at(17),
    state: state(
      [G],
      [itGen('completed'), gen('early', 'completed')],
      RETURN_EARLY,
      res('시작 전', true),
    ),
    output: ['step 1 false', '정리', '중단 true', 'undefined true'],
  },
  {
    title: 'r4의 값을 출력',
    explanation:
      '시작도 하지 않은 제너레이터가 return()의 인수를 value로 가진 완료 결과를 돌려주었습니다.',
    line: at(18),
    state: state([G], [itGen('completed'), gen('early', 'completed')], null, res('시작 전', true)),
    output: ['step 1 false', '정리', '중단 true', 'undefined true', '시작 전 true'],
  },
  {
    title: "it.return('또')",
    explanation:
      "이미 completed인 it에 return을 부르면 GeneratorResumeAbrupt의 completed 갈래로 갑니다. 본문 컨텍스트가 스택에 오르지 않고 finally 블록도 실행되지 않으며, 곧바로 { value: '또', done: true }를 돌려줍니다. 같은 completed라도 next는 undefined를, return(v)는 v를 value로 돌려줍니다.",
    line: at(19),
    state: state(
      [G],
      [itGen('completed'), gen('early', 'completed')],
      RETURN_AGAIN,
      res('또', true),
    ),
    output: ['step 1 false', '정리', '중단 true', 'undefined true', '시작 전 true'],
  },
  {
    title: 'r5의 값을 출력',
    explanation: 'completed 뒤의 return()도 인수를 value로 가진 완료 결과를 돌려주었습니다.',
    line: at(20),
    state: state([G], [itGen('completed'), gen('early', 'completed')], null, res('또', true)),
    output: ['step 1 false', '정리', '중단 true', 'undefined true', '시작 전 true', '또 true'],
  },
]

export const scenarios: Scenario<GenState>[] = [
  {
    id: 'next',
    label: 'next와 yield의 왕복',
    exampleId: 'next-arg',
    code: nextArgCode,
    steps: nextSteps,
  },
  {
    id: 'return',
    label: 'return()과 finally',
    exampleId: 'return-finally',
    code: returnFinallyCode,
    steps: returnSteps,
  },
]
