import type { Scenario, Step } from '~/simulator/types'
import mutateCode from './examples/mutate.js?raw'
import passToFunctionCode from './examples/pass-to-function.js?raw'
import reassignCode from './examples/reassign.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(차분 아님).
// `changed: true`는 "그 단계에서" 새로 생기거나 값이 바뀐 항목에만 붙이고, 다음 단계에서는 해제한다.

export type Primitive = {
  kind: 'primitive'
  type: 'number' | 'string' | 'boolean' | 'undefined' | 'null' | 'bigint' | 'symbol'
  // 화면에 보일 값. string은 따옴표 없는 내용만 담고, MemoryView가 큰따옴표를 붙여 보여 준다.
  display: string
}

export type ObjectRef = { kind: 'object'; id: string }

export type Value = Primitive | ObjectRef

export type Binding = {
  name: string
  declaredWith: 'let' | 'const' | 'var' | 'param'
  value: Value
  changed?: boolean
}

export type Prop = { key: string; value: Value; changed?: boolean }

export type Scope = { id: string; label: string; bindings: Binding[] }

export type ObjectEntry = { id: string; label: string; props: Prop[]; changed?: boolean }

export type MemoryState = {
  scopes: Scope[]
  objects: ObjectEntry[]
}

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Primitive => ({ kind: 'primitive', type: 'number', display: String(n) })
const ref = (id: string): ObjectRef => ({ kind: 'object', id })

const bind = (
  name: string,
  declaredWith: Binding['declaredWith'],
  value: Value,
  changed = false,
): Binding => ({ name, declaredWith, value, ...(changed && { changed }) })

const prop = (key: string, value: Value, changed = false): Prop => ({
  key,
  value,
  ...(changed && { changed }),
})

const obj = (id: string, label: string, props: Prop[], changed = false): ObjectEntry => ({
  id,
  label,
  props,
  ...(changed && { changed }),
})

const top = (bindings: Binding[]): Scope => ({ id: 'top', label: '코드 전체', bindings })
const callChange = (bindings: Binding[]): Scope => ({
  id: 'call-change',
  label: 'change(o, x) 호출',
  bindings,
})

const empty: MemoryState = { scopes: [], objects: [] }

type MemStep = Step<MemoryState>

// --- 시나리오 1: 재할당 ------------------------------------------------------------------------

const reassignSteps: MemStep[] = [
  {
    title: '실행 전',
    explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
    state: empty,
    output: [],
  },
  {
    title: 'a에 10을 넣음',
    explanation: 'let a = 10이 실행되어 변수 a의 값은 숫자 10이 됩니다.',
    line: { from: 1, to: 1 },
    state: { scopes: [top([bind('a', 'let', num(10), true)])], objects: [] },
    output: [],
  },
  {
    title: 'b에 a의 값을 넣음',
    explanation:
      '오른쪽의 a를 평가하면 값 10이 나오고, 그 값이 b에 들어갑니다. 이제 a와 b는 각각 10을 값으로 가집니다.',
    line: { from: 2, to: 2 },
    state: {
      scopes: [top([bind('a', 'let', num(10)), bind('b', 'let', num(10), true)])],
      objects: [],
    },
    output: [],
  },
  {
    title: 'b를 재할당',
    explanation: 'b에 20을 재할당합니다. 재할당은 b의 값만 바꿉니다. a는 여전히 10입니다.',
    line: { from: 3, to: 3 },
    state: {
      scopes: [top([bind('a', 'let', num(10)), bind('b', 'let', num(20), true)])],
      objects: [],
    },
    output: [],
  },
  {
    title: '새 객체를 만들어 p에 넣음',
    explanation:
      '객체 리터럴 { n: 1 }을 평가하면 새 객체(객체 A)가 만들어지고, p의 값은 그 객체가 됩니다.',
    line: { from: 5, to: 5 },
    state: {
      scopes: [
        top([
          bind('a', 'let', num(10)),
          bind('b', 'let', num(20)),
          bind('p', 'let', ref('A'), true),
        ]),
      ],
      objects: [obj('A', '객체 A', [prop('n', num(1))], true)],
    },
    output: [],
  },
  {
    title: 'q에 p의 값을 넣음',
    explanation:
      '오른쪽의 p를 평가한 값, 즉 객체 A가 q에 들어갑니다. 새 객체는 만들어지지 않습니다. 이제 p와 q는 같은 객체를 값으로 가집니다.',
    line: { from: 6, to: 6 },
    state: {
      scopes: [
        top([
          bind('a', 'let', num(10)),
          bind('b', 'let', num(20)),
          bind('p', 'let', ref('A')),
          bind('q', 'let', ref('A'), true),
        ]),
      ],
      objects: [obj('A', '객체 A', [prop('n', num(1))])],
    },
    output: [],
  },
  {
    title: 'q를 재할당',
    explanation:
      '새 객체 B를 만들어 q에 재할당합니다. 바뀐 것은 q의 값뿐입니다. p는 여전히 객체 A를 가지며, 객체 A의 내용도 그대로입니다.',
    line: { from: 7, to: 7 },
    state: {
      scopes: [
        top([
          bind('a', 'let', num(10)),
          bind('b', 'let', num(20)),
          bind('p', 'let', ref('A')),
          bind('q', 'let', ref('B'), true),
        ]),
      ],
      objects: [
        obj('A', '객체 A', [prop('n', num(1))]),
        obj('B', '객체 B', [prop('n', num(2))], true),
      ],
    },
    output: [],
  },
  {
    title: '출력',
    explanation:
      'a는 10, b는 20, p.n은 객체 A의 n인 1, q.n은 객체 B의 n인 2입니다. 원시 값이든 객체든, 재할당은 다른 변수에 영향을 주지 않습니다.',
    line: { from: 9, to: 9 },
    state: {
      scopes: [
        top([
          bind('a', 'let', num(10)),
          bind('b', 'let', num(20)),
          bind('p', 'let', ref('A')),
          bind('q', 'let', ref('B')),
        ]),
      ],
      objects: [obj('A', '객체 A', [prop('n', num(1))]), obj('B', '객체 B', [prop('n', num(2))])],
    },
    output: ['10 20 1 2'],
  },
]

// --- 시나리오 2: 변경 --------------------------------------------------------------------------

const mutateSteps: MemStep[] = [
  {
    title: '실행 전',
    explanation: '코드를 실행하기 전입니다.',
    state: empty,
    output: [],
  },
  {
    title: '새 객체를 만들어 p에 넣음',
    explanation:
      '객체 A가 만들어지고 p의 값이 됩니다. p는 const로 선언되었으므로 p에 다른 값을 재할당할 수 없습니다.',
    line: { from: 1, to: 1 },
    state: {
      scopes: [top([bind('p', 'const', ref('A'), true)])],
      objects: [obj('A', '객체 A', [prop('n', num(1))], true)],
    },
    output: [],
  },
  {
    title: 'q에 p의 값을 넣음',
    explanation:
      'q의 값도 객체 A입니다. 객체가 하나 더 생긴 것이 아니라, p와 q가 같은 객체를 값으로 가집니다.',
    line: { from: 2, to: 2 },
    state: {
      scopes: [top([bind('p', 'const', ref('A')), bind('q', 'const', ref('A'), true)])],
      objects: [obj('A', '객체 A', [prop('n', num(1))])],
    },
    output: [],
  },
  {
    title: '객체 A의 n을 변경',
    explanation:
      'q.n = 2는 q를 재할당하지 않습니다. q의 값인 객체 A의 프로퍼티 n을 2로 변경합니다. const는 변수의 재할당만 막을 뿐, 객체의 변경은 막지 않습니다.',
    line: { from: 3, to: 3 },
    state: {
      scopes: [top([bind('p', 'const', ref('A')), bind('q', 'const', ref('A'))])],
      objects: [obj('A', '객체 A', [prop('n', num(2), true)], true)],
    },
    output: [],
  },
  {
    title: '출력',
    explanation:
      'p.n은 객체 A의 n이므로 2입니다. p === q는 두 값이 같은 객체인지 비교하는데, 둘 다 객체 A이므로 true입니다.',
    line: { from: 4, to: 4 },
    state: {
      scopes: [top([bind('p', 'const', ref('A')), bind('q', 'const', ref('A'))])],
      objects: [obj('A', '객체 A', [prop('n', num(2))])],
    },
    output: ['2 true'],
  },
]

// --- 시나리오 3: 함수에 전달 -------------------------------------------------------------------

const passSteps: MemStep[] = [
  {
    title: '실행 전',
    explanation:
      '코드를 실행하기 전입니다. 이 시각화에서는 함수 선언으로 만들어지는 변수 change를 생략합니다.',
    state: empty,
    output: [],
  },
  {
    title: '새 객체를 만들어 o에 넣음',
    explanation: '객체 A가 만들어지고 o의 값이 됩니다.',
    line: { from: 7, to: 7 },
    state: {
      scopes: [top([bind('o', 'const', ref('A'), true)])],
      objects: [obj('A', '객체 A', [prop('n', num(1))], true)],
    },
    output: [],
  },
  {
    title: 'x에 1을 넣음',
    explanation: 'x의 값은 숫자 1입니다.',
    line: { from: 8, to: 8 },
    state: {
      scopes: [top([bind('o', 'const', ref('A')), bind('x', 'let', num(1), true)])],
      objects: [obj('A', '객체 A', [prop('n', num(1))])],
    },
    output: [],
  },
  {
    title: 'change 호출: 인수를 매개변수에 넣음',
    explanation:
      '함수를 호출하면 인수 o와 x를 평가한 값이 매개변수 obj와 num에 들어갑니다. obj의 값은 객체 A, num의 값은 1입니다. obj와 num은 호출한 쪽의 o, x와 별개의 변수입니다.',
    line: { from: 9, to: 9 },
    state: {
      scopes: [
        top([bind('o', 'const', ref('A')), bind('x', 'let', num(1))]),
        callChange([bind('obj', 'param', ref('A'), true), bind('num', 'param', num(1), true)]),
      ],
      objects: [obj('A', '객체 A', [prop('n', num(1))])],
    },
    output: [],
  },
  {
    title: '객체 A의 n을 변경',
    explanation:
      'obj의 값인 객체 A의 프로퍼티 n을 99로 변경합니다. o도 같은 객체 A를 값으로 가지므로, 이 변경은 o를 통해서도 보입니다.',
    line: { from: 2, to: 2 },
    state: {
      scopes: [
        top([bind('o', 'const', ref('A')), bind('x', 'let', num(1))]),
        callChange([bind('obj', 'param', ref('A')), bind('num', 'param', num(1))]),
      ],
      objects: [obj('A', '객체 A', [prop('n', num(99), true)], true)],
    },
    output: [],
  },
  {
    title: '매개변수 num을 재할당',
    explanation: 'num에 99를 재할당합니다. 바뀌는 것은 num뿐이고, 호출한 쪽의 x는 여전히 1입니다.',
    line: { from: 3, to: 3 },
    state: {
      scopes: [
        top([bind('o', 'const', ref('A')), bind('x', 'let', num(1))]),
        callChange([bind('obj', 'param', ref('A')), bind('num', 'param', num(99), true)]),
      ],
      objects: [obj('A', '객체 A', [prop('n', num(99))])],
    },
    output: [],
  },
  {
    title: '매개변수 obj를 재할당',
    explanation:
      '새 객체 B를 만들어 obj에 재할당합니다. obj가 가진 값이 바뀌었을 뿐, o와 객체 A에는 영향이 없습니다.',
    line: { from: 4, to: 4 },
    state: {
      scopes: [
        top([bind('o', 'const', ref('A')), bind('x', 'let', num(1))]),
        callChange([bind('obj', 'param', ref('B'), true), bind('num', 'param', num(99))]),
      ],
      objects: [
        obj('A', '객체 A', [prop('n', num(99))]),
        obj('B', '객체 B', [prop('n', num(0))], true),
      ],
    },
    output: [],
  },
  {
    title: '호출 종료',
    explanation:
      '함수 본문이 끝나 호출이 종료됩니다. 매개변수 obj와 num은 이제 쓰이지 않고, 객체 B를 값으로 가진 변수도 더 이상 없습니다.',
    line: { from: 5, to: 5 },
    state: {
      scopes: [top([bind('o', 'const', ref('A')), bind('x', 'let', num(1))])],
      objects: [obj('A', '객체 A', [prop('n', num(99))]), obj('B', '객체 B', [prop('n', num(0))])],
    },
    output: [],
  },
  {
    title: '출력',
    explanation:
      'o.n은 객체 A의 n이므로 99이고, x는 1입니다. 객체를 함수에 전달하면 프로퍼티 변경은 호출한 쪽에서도 보이지만, 매개변수 재할당은 보이지 않습니다.',
    line: { from: 10, to: 10 },
    state: {
      scopes: [top([bind('o', 'const', ref('A')), bind('x', 'let', num(1))])],
      objects: [obj('A', '객체 A', [prop('n', num(99))]), obj('B', '객체 B', [prop('n', num(0))])],
    },
    output: ['99 1'],
  },
]

export const scenarios: Scenario<MemoryState>[] = [
  {
    id: 'reassign',
    label: '재할당',
    exampleId: 'reassign',
    code: reassignCode,
    steps: reassignSteps,
  },
  { id: 'mutate', label: '변경', exampleId: 'mutate', code: mutateCode, steps: mutateSteps },
  {
    id: 'pass-to-function',
    label: '함수에 전달',
    exampleId: 'pass-to-function',
    code: passToFunctionCode,
    steps: passSteps,
  },
]
