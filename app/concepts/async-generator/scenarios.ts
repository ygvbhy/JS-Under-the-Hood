import type { Scenario, Step } from '~/simulator/types'
import breakCode from './examples/for-await-break.js?raw'
import queueCode from './examples/queue.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - genState: 명세의 [[AsyncGeneratorState]] 다섯 값 그대로
// - queue: [[AsyncGeneratorQueue]]. 아직 끝내지 못한 요청(next·return 호출 하나가 요청 하나). 앞이 먼저 처리된다
// - promises: 변수에 담긴 프로미스와, 담기 전의 next·return() 프로미스(이름은 변수 이름 또는 '… 프로미스').
//   result는 표시용 문자열(util.inspect 모양). pending이면 null
// - jobs: 프로미스 Job 큐. 넣은 순서대로, 앞이 먼저. 실행 중인 Job은 jobs에 없다
// - running: 지금 코드를 실행 중인 곳을 부르는 표시용 이름('전역 코드', 'gen 본문', 'Job: …', '없음')
// 상태가 바뀌는 중간 순간(요청을 큐에서 꺼냈지만 상태는 아직 바뀌기 전 등)과 내장 함수의 프레임은 그리지 않는다.
// 그래서 "큐에 요청이 있는 것과 상태가 executing 또는 draining-queue인 것은 같다"는 명세 설명이 모든 단계에서 성립한다.

export type GenState =
  'suspended-start' | 'suspended-yield' | 'executing' | 'draining-queue' | 'completed'

export type AsyncGenState = {
  genState: GenState
  queue: string[]
  promises: {
    name: string
    state: 'pending' | 'fulfilled' | 'rejected'
    result: string | null
  }[]
  jobs: string[]
  running: string
}

type GStep = Step<AsyncGenState>
type Prom = AsyncGenState['promises'][number]

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const at = (n: number) => ({ from: n, to: n })

const pending = (name: string): Prom => ({ name, state: 'pending', result: null })
const fulfilled = (name: string, result: string): Prom => ({ name, state: 'fulfilled', result })

const state = (
  genState: GenState,
  queue: string[],
  promises: Prom[],
  jobs: string[],
  running: string,
): AsyncGenState => ({ genState, queue, promises, jobs, running })

const G = '전역 코드'
const NONE = '없음'

// --- 1. next를 연달아 불러도 결과가 섞이지 않는다 ---------------------------------------------

const R1 = '요청 1'
const R2 = '요청 2'
const R3 = '요청 3'
const DONE_RESULT = '{ value: undefined, done: true }'

const queueSteps: GStep[] = [
  {
    title: 'var it = gen()',
    explanation:
      'async 제너레이터를 부르면 본문은 실행되지 않고 async 제너레이터 객체만 돌려받습니다. 상태는 suspended-start이고 요청 큐는 비어 있습니다.',
    line: at(9),
    state: state('suspended-start', [], [], [], G),
    output: [],
  },
  {
    title: 'var p1 = it.next() 호출',
    explanation:
      'next는 새 프로미스를 만들고 요청 1을 큐에 넣습니다. 상태가 suspended-start이므로 곧바로 본문을 재개해 상태는 executing이 됩니다. 아직 p1에 대입되기 전이라 이 프로미스에는 변수 이름이 없습니다.',
    line: at(10),
    state: state('executing', [R1], [pending('1번 next의 프로미스')], [], 'gen 본문'),
    output: [],
  },
  {
    title: "console.log('본문 시작')",
    explanation:
      '본문이 next를 부른 코드가 값을 돌려받기 전에 시작되어 본문 시작이 찍힙니다. 일반 제너레이터와 달리 next가 돌려줄 프로미스는 아직 pending입니다.',
    line: at(2),
    state: state('executing', [R1], [pending('1번 next의 프로미스')], [], 'gen 본문'),
    output: ['본문 시작'],
  },
  {
    title: 'await null',
    explanation:
      '본문이 await에서 멈추고 재개 Job이 큐에 들어갑니다. 호출한 쪽으로 돌아가 next가 돌려준 프로미스가 p1에 대입됩니다. 본문은 멈췄지만 상태는 여전히 executing이고 요청 1은 큐에 남아 있습니다.',
    line: at(3),
    state: state('executing', [R1], [pending('p1')], ['gen 재개'], G),
    output: ['본문 시작'],
  },
  {
    title: 'p1.then 등록, var p2 = it.next()',
    explanation:
      'p1은 pending이므로 then 콜백은 반응으로 등록만 되고 Job이 되지 않습니다. 이 시뮬레이터는 등록된 반응을 칸으로 그리지 않고, 프로미스가 이행될 때 반응이 Job으로 들어가는 모습만 보입니다. 이어서 두 번째 next가 새 프로미스를 만들고 요청 2를 큐에 넣습니다. 상태가 executing이므로 재개하지 않고 큐에 넣기만 합니다.',
    line: { from: 11, to: 12 },
    state: state('executing', [R1, R2], [pending('p1'), pending('p2')], ['gen 재개'], G),
    output: ['본문 시작'],
  },
  {
    title: 'p2.then 등록, var p3 = it.next()',
    explanation:
      'p2에도 then 콜백이 반응으로 등록됩니다. 세 번째 next도 큐에 넣기만 합니다. 요청이 3개 쌓였고, 프로미스는 요청마다 하나씩 따로 만들어져 있습니다.',
    line: { from: 13, to: 14 },
    state: state(
      'executing',
      [R1, R2, R3],
      [pending('p1'), pending('p2'), pending('p3')],
      ['gen 재개'],
      G,
    ),
    output: ['본문 시작'],
  },
  {
    title: 'p3.then 등록',
    explanation:
      '세 프로미스에 모두 then 콜백이 등록되었습니다. p1의 콜백은 두 번째 next보다 먼저 걸어 두었습니다. p1이 이행되는 순간 이 반응이 Job이 되어 큐에 들어갑니다.',
    line: at(15),
    state: state(
      'executing',
      [R1, R2, R3],
      [pending('p1'), pending('p2'), pending('p3')],
      ['gen 재개'],
      G,
    ),
    output: ['본문 시작'],
  },
  {
    title: "console.log('동기 코드 끝')",
    explanation:
      '전역 코드가 끝납니다. 본문은 아직 await에서 멈춘 채이고 세 프로미스는 모두 pending입니다. 이제 큐의 Job이 실행됩니다.',
    line: at(16),
    state: state(
      'executing',
      [R1, R2, R3],
      [pending('p1'), pending('p2'), pending('p3')],
      ['gen 재개'],
      G,
    ),
    output: ['본문 시작', '동기 코드 끝'],
  },
  {
    title: 'Job: await null 이후 재개',
    explanation:
      'Job이 본문을 재개합니다. await null 식의 값은 null이고, 본문은 그 뒤의 yield로 이어집니다. 상태는 executing 그대로입니다.',
    line: at(3),
    state: state(
      'executing',
      [R1, R2, R3],
      [pending('p1'), pending('p2'), pending('p3')],
      [],
      'Job: gen 본문',
    ),
    output: ['본문 시작', '동기 코드 끝'],
  },
  {
    title: "yield 'a'의 await",
    explanation:
      "async 제너레이터의 yield는 값을 먼저 await합니다. yield 'a'에서 본문이 다시 멈추고 재개 Job이 큐에 들어갑니다. 요청이 처리되기 전이므로 p1은 pending입니다.",
    line: at(4),
    state: state(
      'executing',
      [R1, R2, R3],
      [pending('p1'), pending('p2'), pending('p3')],
      ['gen 재개'],
      NONE,
    ),
    output: ['본문 시작', '동기 코드 끝'],
  },
  {
    title: 'Job: 재개, 요청 1 완료',
    explanation:
      "await가 끝나 본문이 재개되고, AsyncGeneratorYield가 큐의 첫 요청인 요청 1을 끝냅니다. p1이 { value: 'a', done: false }로 이행되고, p1에 등록된 반응이 Job이 됩니다. 큐에 요청 2와 3이 남아 있어서 본문은 yield에서 멈추지 않고 이어 갑니다(명세 NOTE: Execution continues without suspending the generator). 상태는 executing 그대로입니다.",
    line: at(4),
    state: state(
      'executing',
      [R2, R3],
      [fulfilled('p1', "{ value: 'a', done: false }"), pending('p2'), pending('p3')],
      ['1번 콜백'],
      'Job: gen 본문',
    ),
    output: ['본문 시작', '동기 코드 끝'],
  },
  {
    title: "console.log('a 뒤')",
    explanation:
      "멈추지 않고 이어 간 본문이 a 뒤를 찍습니다. 1번 콜백은 아직 실행되기 전이므로 '1번: …'보다 a 뒤가 먼저입니다.",
    line: at(5),
    state: state(
      'executing',
      [R2, R3],
      [fulfilled('p1', "{ value: 'a', done: false }"), pending('p2'), pending('p3')],
      ['1번 콜백'],
      'Job: gen 본문',
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤'],
  },
  {
    title: "yield 'b'의 await",
    explanation:
      "yield 'b'도 값을 먼저 await하므로 본문이 멈추고 재개 Job이 1번 콜백 Job 뒤에 들어갑니다.",
    line: at(6),
    state: state(
      'executing',
      [R2, R3],
      [fulfilled('p1', "{ value: 'a', done: false }"), pending('p2'), pending('p3')],
      ['1번 콜백', 'gen 재개'],
      NONE,
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤'],
  },
  {
    title: 'Job: 1번 콜백',
    explanation:
      '큐 맨 앞의 Job인 p1의 콜백이 실행되어 1번 결과를 찍습니다. 요청 순서대로 p1이 먼저 이행되었으므로 1번 결과가 a입니다.',
    line: at(11),
    state: state(
      'executing',
      [R2, R3],
      [fulfilled('p1', "{ value: 'a', done: false }"), pending('p2'), pending('p3')],
      ['gen 재개'],
      'Job: 1번 콜백',
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤', '1번: {"value":"a","done":false}'],
  },
  {
    title: 'Job: 재개, 요청 2 완료',
    explanation:
      "await가 끝나 본문이 재개되고, 이번에는 큐의 첫 요청인 요청 2가 끝납니다. p2가 { value: 'b', done: false }로 이행되고 p2의 반응이 Job이 됩니다. 요청 3이 남아 있으므로 본문은 이번에도 멈추지 않고 이어 갑니다.",
    line: at(6),
    state: state(
      'executing',
      [R3],
      [
        fulfilled('p1', "{ value: 'a', done: false }"),
        fulfilled('p2', "{ value: 'b', done: false }"),
        pending('p3'),
      ],
      ['2번 콜백'],
      'Job: gen 본문',
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤', '1번: {"value":"a","done":false}'],
  },
  {
    title: "console.log('b 뒤')",
    explanation: '이어 가던 본문이 b 뒤를 찍습니다. 이번에도 2번 콜백보다 먼저입니다.',
    line: at(7),
    state: state(
      'executing',
      [R3],
      [
        fulfilled('p1', "{ value: 'a', done: false }"),
        fulfilled('p2', "{ value: 'b', done: false }"),
        pending('p3'),
      ],
      ['2번 콜백'],
      'Job: gen 본문',
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤', '1번: {"value":"a","done":false}', 'b 뒤'],
  },
  {
    title: '본문 끝',
    explanation:
      '본문의 마지막 줄까지 실행되어 끝나면 상태가 draining-queue가 됩니다. 요청 3이 아직 큐에 남아 있습니다. (이 시뮬레이터는 상태가 바뀌는 중간 순간을 단계로 그리지 않고, 상태가 정해진 뒤의 모습만 보입니다.)',
    line: at(8),
    state: state(
      'draining-queue',
      [R3],
      [
        fulfilled('p1', "{ value: 'a', done: false }"),
        fulfilled('p2', "{ value: 'b', done: false }"),
        pending('p3'),
      ],
      ['2번 콜백'],
      'Job: gen 본문',
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤', '1번: {"value":"a","done":false}', 'b 뒤'],
  },
  {
    title: '요청 3 완료, 큐가 비어 completed',
    explanation:
      '남은 요청 3은 본문이 끝난 결과로 끝납니다. p3이 { value: undefined, done: true }로 이행되고 p3의 반응이 Job이 됩니다. 큐가 비면 상태는 completed입니다.',
    line: at(8),
    state: state(
      'completed',
      [],
      [
        fulfilled('p1', "{ value: 'a', done: false }"),
        fulfilled('p2', "{ value: 'b', done: false }"),
        fulfilled('p3', DONE_RESULT),
      ],
      ['2번 콜백', '3번 콜백'],
      NONE,
    ),
    output: ['본문 시작', '동기 코드 끝', 'a 뒤', '1번: {"value":"a","done":false}', 'b 뒤'],
  },
  {
    title: 'Job: 2번 콜백',
    explanation: '큐의 Job이 차례로 실행됩니다. p2의 콜백이 2번 결과 b를 찍습니다.',
    line: at(13),
    state: state(
      'completed',
      [],
      [
        fulfilled('p1', "{ value: 'a', done: false }"),
        fulfilled('p2', "{ value: 'b', done: false }"),
        fulfilled('p3', DONE_RESULT),
      ],
      ['3번 콜백'],
      'Job: 2번 콜백',
    ),
    output: [
      '본문 시작',
      '동기 코드 끝',
      'a 뒤',
      '1번: {"value":"a","done":false}',
      'b 뒤',
      '2번: {"value":"b","done":false}',
    ],
  },
  {
    title: 'Job: 3번 콜백',
    explanation:
      '마지막 Job이 3번 결과를 찍습니다. JSON.stringify는 value가 undefined인 속성을 빼므로 {"done":true}로 보입니다. next 세 번의 결과가 요청 순서대로 a, b, 끝이 되었습니다.',
    line: at(15),
    state: state(
      'completed',
      [],
      [
        fulfilled('p1', "{ value: 'a', done: false }"),
        fulfilled('p2', "{ value: 'b', done: false }"),
        fulfilled('p3', DONE_RESULT),
      ],
      [],
      'Job: 3번 콜백',
    ),
    output: [
      '본문 시작',
      '동기 코드 끝',
      'a 뒤',
      '1번: {"value":"a","done":false}',
      'b 뒤',
      '2번: {"value":"b","done":false}',
      '3번: {"done":true}',
    ],
  },
]

// --- 2. for await의 break가 정리를 기다린다 ---------------------------------------------------

const RUN_P = 'run()의 프로미스'
const NEXT1 = '요청 1(next)'
const RET = '요청 2(return)'
const NEXT_P = '1번 next의 프로미스'
const RET_P = 'return()의 프로미스'
const ONE_RESULT = '{ value: 1, done: false }'

const breakSteps: GStep[] = [
  {
    title: 'run() 호출, gen() 호출',
    explanation:
      'run은 async 함수라 본문이 호출한 쪽이 값을 돌려받기 전에 시작됩니다. for await의 대상인 gen()이 평가되어 async 제너레이터 객체가 만들어지지만 본문은 실행되지 않아 상태는 suspended-start입니다. run()의 프로미스는 아직 변수에 대입되기 전입니다.',
    line: at(11),
    state: state('suspended-start', [], [pending(RUN_P)], [], 'run 본문'),
    output: [],
  },
  {
    title: 'GetIterator와 next 호출',
    explanation:
      'for await는 GetIterator로 Symbol.asyncIterator 메서드를 찾아 이터레이터를 얻습니다. async 제너레이터 객체의 Symbol.asyncIterator 메서드는 자기 자신을 돌려주므로 이 객체가 곧 이터레이터입니다. 이어서 next를 부르면 요청 1이 큐에 들어가고, 상태가 suspended-start이므로 본문이 재개되어 executing이 됩니다.',
    line: at(11),
    state: state('executing', [NEXT1], [pending(RUN_P), pending(NEXT_P)], [], 'gen 본문'),
    output: [],
  },
  {
    title: 'yield 1의 await',
    explanation:
      '본문이 try 안으로 들어가 yield 1을 만나 값 1을 await하며 멈춥니다. 재개 Job이 큐에 들어가고, 제어는 next를 부른 for await로 돌아갑니다. 요청 1은 아직 큐에 있고 next의 프로미스는 pending입니다.',
    line: at(3),
    state: state('executing', [NEXT1], [pending(RUN_P), pending(NEXT_P)], ['gen 재개'], 'run 본문'),
    output: [],
  },
  {
    title: 'next의 프로미스를 Await',
    explanation:
      'for await는 next가 돌려준 프로미스를 Await합니다. Await에서 run의 본문이 멈추고, 호출한 쪽으로 돌아가 run()의 프로미스가 p에 대입됩니다.',
    line: at(17),
    state: state('executing', [NEXT1], [pending('p'), pending(NEXT_P)], ['gen 재개'], G),
    output: [],
  },
  {
    title: 'Job: 재개, 요청 1 완료',
    explanation:
      'await가 끝나 본문이 재개되고 요청 1이 끝납니다. next의 프로미스가 { value: 1, done: false }로 이행되고, run이 기다리던 반응이 Job이 됩니다. 큐가 비었으므로 본문은 yield에서 멈추고 상태는 suspended-yield가 됩니다.',
    line: at(3),
    state: state(
      'suspended-yield',
      [],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT)],
      ['run 재개'],
      NONE,
    ),
    output: [],
  },
  {
    title: 'Job: run 재개',
    explanation:
      'Job이 run의 본문을 재개합니다. 결과가 객체이므로 value 1을 v에 받고 반복문 본문으로 들어갑니다. 제너레이터는 suspended-yield로 멈춰 있습니다.',
    line: at(11),
    state: state(
      'suspended-yield',
      [],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT)],
      [],
      'run 본문',
    ),
    output: [],
  },
  {
    title: 'console.log(v)',
    explanation: '반복문 본문이 1을 찍습니다.',
    line: at(12),
    state: state(
      'suspended-yield',
      [],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT)],
      [],
      'run 본문',
    ),
    output: ['1'],
  },
  {
    title: 'break, return() 호출',
    explanation:
      'break로 반복문을 일찍 벗어나면 AsyncIteratorClose가 이터레이터의 return을 부릅니다. 요청 2가 큐에 들어가고, 상태가 suspended-yield이므로 본문이 재개되어 executing이 됩니다. 재개 값이 return 완료여서 yield 1 자리에서 return 값 undefined를 await하며 다시 멈춥니다. for await는 return()이 돌려준 프로미스를 Await하며 run의 본문을 멈춥니다.',
    line: at(13),
    state: state(
      'executing',
      [RET],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT), pending(RET_P)],
      ['gen 재개'],
      NONE,
    ),
    output: ['1'],
  },
  {
    title: 'Job: 재개, finally 진입과 await null',
    explanation:
      '재개된 본문은 return 완료를 이어 가며 finally 블록을 실행합니다. finally 안의 await null에서 본문이 다시 멈춥니다. return()이 돌려준 프로미스는 아직 pending이고 run도 그것을 기다리는 중입니다.',
    line: at(6),
    state: state(
      'executing',
      [RET],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT), pending(RET_P)],
      ['gen 재개'],
      NONE,
    ),
    output: ['1'],
  },
  {
    title: "Job: 재개, console.log('정리')",
    explanation: 'finally의 await가 끝나 본문이 재개되고 정리를 찍습니다.',
    line: at(7),
    state: state(
      'executing',
      [RET],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT), pending(RET_P)],
      [],
      'Job: gen 본문',
    ),
    output: ['1', '정리'],
  },
  {
    title: '본문 끝',
    explanation:
      'finally 블록이 끝나면 return 완료가 본문 밖으로 나가 본문이 끝나고, 상태가 draining-queue가 됩니다. 요청 2가 아직 큐에 있습니다. (이 시뮬레이터는 상태가 바뀌는 중간 순간을 단계로 그리지 않고, 상태가 정해진 뒤의 모습만 보입니다.)',
    line: at(9),
    state: state(
      'draining-queue',
      [RET],
      [pending('p'), fulfilled(NEXT_P, ONE_RESULT), pending(RET_P)],
      [],
      'Job: gen 본문',
    ),
    output: ['1', '정리'],
  },
  {
    title: '요청 2 완료, 큐가 비어 completed',
    explanation:
      'return()의 요청이 끝납니다. return()이 돌려준 프로미스가 { value: undefined, done: true }로 이행되고, run이 기다리던 반응이 Job이 됩니다. 큐가 비어 상태는 completed입니다.',
    line: at(9),
    state: state(
      'completed',
      [],
      [
        pending('p'),
        fulfilled(NEXT_P, ONE_RESULT),
        fulfilled(RET_P, '{ value: undefined, done: true }'),
      ],
      ['run 재개'],
      NONE,
    ),
    output: ['1', '정리'],
  },
  {
    title: 'Job: run 재개',
    explanation:
      'return()의 결과를 Await하던 run이 재개됩니다. 정리가 끝난 뒤에야 for await가 끝납니다.',
    line: at(14),
    state: state(
      'completed',
      [],
      [
        pending('p'),
        fulfilled(NEXT_P, ONE_RESULT),
        fulfilled(RET_P, '{ value: undefined, done: true }'),
      ],
      [],
      'run 본문',
    ),
    output: ['1', '정리'],
  },
  {
    title: "console.log('반복문 뒤')",
    explanation: '반복문 다음 줄이 실행됩니다. 정리가 반복문 뒤보다 먼저 찍혔습니다.',
    line: at(15),
    state: state(
      'completed',
      [],
      [
        pending('p'),
        fulfilled(NEXT_P, ONE_RESULT),
        fulfilled(RET_P, '{ value: undefined, done: true }'),
      ],
      [],
      'run 본문',
    ),
    output: ['1', '정리', '반복문 뒤'],
  },
  {
    title: 'run 본문 끝',
    explanation: 'run 본문이 끝나 run()의 프로미스 p가 이행됩니다. 이 예제는 p를 쓰지 않습니다.',
    line: at(16),
    state: state(
      'completed',
      [],
      [
        fulfilled('p', 'undefined'),
        fulfilled(NEXT_P, ONE_RESULT),
        fulfilled(RET_P, '{ value: undefined, done: true }'),
      ],
      [],
      NONE,
    ),
    output: ['1', '정리', '반복문 뒤'],
  },
]

export const scenarios: Scenario<AsyncGenState>[] = [
  {
    id: 'queue',
    label: 'next를 연달아 부르면',
    exampleId: 'queue',
    code: queueCode,
    steps: queueSteps,
  },
  {
    id: 'break',
    label: 'for await의 break',
    exampleId: 'for-await-break',
    code: breakCode,
    steps: breakSteps,
  },
]
