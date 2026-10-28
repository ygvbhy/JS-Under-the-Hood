import type { LineRange, Scenario, Step } from '~/simulator/types'
import freezeShallowCode from './examples/freeze-shallow.js?raw'
import getterCode from './examples/getter.js?raw'
import writableSloppyCode from './examples/writable-sloppy.js?raw'
import writableStrictCode from './examples/writable-strict.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// `changed`는 "그 단계에서" 바뀐 항목에만 붙이고 다음 단계에서는 해제한다.
// - Binding.changed: true는 변수가 새로 생기거나 값이 바뀐 단계에만 붙는다.
// - ObjectBox.changed: 'created'(객체가 새로 만들어진 단계), 'extensible'(확장 가능 여부가 바뀐 단계).
// - 프로퍼티의 changed: 바뀐 필드 이름의 배열. 프로퍼티가 새로 생긴 단계에는 ['created']만 담는다.
// Val.display: 문자열은 따옴표 없는 내용만 담고, 화면에서 큰따옴표를 붙인다(property-keys와 같은 규칙).
// ObjectRef는 ObjectBox.id를 가리킨다. 데이터 프로퍼티의 값도 ObjectRef일 수 있다(freeze-shallow의 limits).
// 접근자 프로퍼티의 get·set은 함수 원문 첫 줄 표시(예: 'get next() { … }')이고 없으면 null이다.
// op는 그 단계의 줄이 실행한 동작이다. 선언문이나 출력만 하는 줄처럼 동작이 없으면 null이다.
// - kind 'assign'의 value는 대입하려던 값이다(ignored·TypeError여도 시도한 값을 담는다).
// - kind 'integrity'는 Object.freeze 같은 변경 방지 호출(result 'applied')과
//   Object.isFrozen 같은 검사(result 'value', value는 boolean)에 쓴다.

export type Val = {
  type: 'number' | 'string' | 'boolean' | 'undefined'
  display: string // string은 따옴표 없는 내용만 담고, 화면에서 큰따옴표를 붙인다
}

export type ObjectRef = { kind: 'object'; id: string }

export type Binding = {
  name: string
  declaredWith: 'const' | 'let'
  value: Val | ObjectRef
  changed?: true
}

export type DataProp = {
  key: string
  kind: 'data'
  value: Val | ObjectRef
  writable: boolean
  enumerable: boolean
  configurable: boolean
  changed?: ('created' | 'value' | 'writable' | 'enumerable' | 'configurable')[]
}

export type AccessorProp = {
  key: string
  kind: 'accessor'
  get: string | null
  set: string | null
  enumerable: boolean
  configurable: boolean
  changed?: ('created' | 'get' | 'set' | 'enumerable' | 'configurable')[]
}

export type ObjectBox = {
  id: string
  label: string
  extensible: boolean
  props: (DataProp | AccessorProp)[]
  changed?: ('created' | 'extensible')[]
}

export type Op = {
  code: string // 동작 식 원문(예: "item.code = 'B2'")
  kind: 'read' | 'assign' | 'delete' | 'define' | 'describe' | 'stringify' | 'integrity'
  objectId: string
  key?: string
  result:
    | 'value'
    | 'created'
    | 'updated'
    | 'ignored' // sloppy mode라 대입이 오류 없이 무시됨
    | 'deleted'
    | 'delete-false' // sloppy mode라 delete가 false를 돌려줌
    | 'TypeError' // strict mode라 무시 대신 오류가 남
    | 'getter-called' // getter가 호출됨(value는 getter가 돌려준 값)
    | 'setter-called'
    | 'applied'
  value?: Val
}

export type AttrState = { bindings: Binding[]; objects: ObjectBox[]; op: Op | null }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const bool = (b: boolean): Val => ({ type: 'boolean', display: String(b) })
const ref = (id: string): ObjectRef => ({ kind: 'object', id })

const bind = (
  name: string,
  declaredWith: Binding['declaredWith'],
  value: Binding['value'],
  changed = false,
): Binding => ({ name, declaredWith, value, ...(changed && { changed: true as const }) })

type Attrs = { writable: boolean; enumerable: boolean; configurable: boolean }
const ALL: Attrs = { writable: true, enumerable: true, configurable: true }
const LOCKED: Attrs = { writable: false, enumerable: true, configurable: false }

const data = (
  key: string,
  value: DataProp['value'],
  attrs: Attrs,
  changed?: DataProp['changed'],
): DataProp => ({ key, kind: 'data', value, ...attrs, ...(changed && { changed }) })

const accessor = (
  key: string,
  get: string | null,
  set: string | null,
  changed?: AccessorProp['changed'],
): AccessorProp => ({
  key,
  kind: 'accessor',
  get,
  set,
  enumerable: true,
  configurable: true,
  ...(changed && { changed }),
})

const box = (
  id: string,
  props: ObjectBox['props'],
  extensible = true,
  changed?: ObjectBox['changed'],
): ObjectBox => ({ id, label: `객체 ${id}`, extensible, props, ...(changed && { changed }) })

const st = (bindings: Binding[], objects: ObjectBox[], op: Op | null = null): AttrState => ({
  bindings,
  objects,
  op,
})

const op = (
  code: string,
  kind: Op['kind'],
  objectId: string,
  result: Op['result'],
  extra: { key?: string; value?: Val } = {},
): Op => ({ code, kind, objectId, result, ...extra })

const at = (n: number): LineRange => ({ from: n, to: n })
const lines = (from: number, to: number): LineRange => ({ from, to })

type AttrStep = Step<AttrState>

const empty = st([], [])

// --- 시나리오 1·2: 쓰기 금지 (sloppy / strict) ---------------------------------------------------

const itemRef = () => bind('item', 'const', ref('A'))
const itemCreated = () => bind('item', 'const', ref('A'), true)
const codeCreated = () => data('code', str('A1'), LOCKED, ['created'])
const code = () => data('code', str('A1'), LOCKED)

const defineOp = op(
  "Object.defineProperty(item, 'code', { value: 'A1', enumerable: true })",
  'define',
  'A',
  'created',
  { key: 'code', value: str('A1') },
)
const readCodeOp = op('item.code', 'read', 'A', 'value', { key: 'code', value: str('A1') })

const afterCreate = st([itemCreated()], [box('A', [], true, ['created'])])
const afterDefine = st([itemRef()], [box('A', [codeCreated()])], defineOp)
const quiet = (opValue: Op | null) => st([itemRef()], [box('A', [code()])], opValue)

const createExplain =
  '객체 리터럴이 빈 객체 A를 만들고 변수 item이 A를 가리킵니다. 아직 프로퍼티가 없고, 새 프로퍼티를 추가할 수 있는 확장 가능한 객체입니다.'
const defineExplain =
  "Object.defineProperty로 A에 code 프로퍼티를 만듭니다. value와 enumerable만 적었기 때문에 적지 않은 writable과 configurable은 false가 됩니다. 값은 'A1'입니다."

const writableSloppySteps: AttrStep[] = [
  {
    title: '실행 전',
    explanation:
      '아직 아무것도 실행하지 않았습니다. 이 스크립트에는 strict mode 지시어가 없어서 sloppy mode로 실행됩니다.',
    state: empty,
    output: [],
  },
  {
    title: '1번 줄: 빈 객체 만들기',
    explanation: createExplain,
    line: at(1),
    state: afterCreate,
    output: [],
  },
  {
    title: '2번 줄: code 프로퍼티 정의',
    explanation: defineExplain,
    line: at(2),
    state: afterDefine,
    output: [],
  },
  {
    title: '3번 줄: item.code에 대입',
    explanation:
      "code의 writable이 false라서 'B2'를 대입해도 값이 바뀌지 않습니다. 대입은 실패했지만 strict mode가 아니라서 오류 없이 넘어갑니다.",
    line: at(3),
    state: quiet(
      op("item.code = 'B2'", 'assign', 'A', 'ignored', { key: 'code', value: str('B2') }),
    ),
    output: [],
  },
  {
    title: '4번 줄: item.code 읽기',
    explanation: "code를 읽으면 값은 그대로 'A1'입니다. 이 값을 콘솔에 출력합니다.",
    line: at(4),
    state: quiet(readCodeOp),
    output: ['A1'],
  },
  {
    title: '5번 줄: delete item.code',
    explanation:
      'code의 configurable이 false라서 삭제할 수 없습니다. sloppy mode에서는 오류 없이 delete 식의 결과가 false가 되고, 이 false를 콘솔에 출력합니다.',
    line: at(5),
    state: quiet(
      op('delete item.code', 'delete', 'A', 'delete-false', { key: 'code', value: bool(false) }),
    ),
    output: ['A1', 'false'],
  },
  {
    title: '6번 줄: item.code 읽기',
    explanation: "삭제가 실패했으므로 code는 그대로 있고 값은 'A1'입니다.",
    line: at(6),
    state: quiet(readCodeOp),
    output: ['A1', 'false', 'A1'],
  },
]

const writableStrictSteps: AttrStep[] = [
  {
    title: '실행 전',
    explanation:
      "1번 줄의 'use strict'; 지시어 때문에 이 스크립트 전체가 strict mode로 실행됩니다. 같은 동작이 sloppy mode에서는 어떻게 다른지 '쓰기 금지: sloppy mode' 시나리오와 비교해 보세요.",
    state: empty,
    output: [],
  },
  {
    title: '2번 줄: 빈 객체 만들기',
    explanation: createExplain,
    line: at(2),
    state: afterCreate,
    output: [],
  },
  {
    title: '3번 줄: code 프로퍼티 정의',
    explanation: defineExplain,
    line: at(3),
    state: afterDefine,
    output: [],
  },
  {
    title: '5번 줄: item.code에 대입',
    explanation:
      "code의 writable이 false라서 'B2'를 대입할 수 없습니다. strict mode에서는 실패한 대입이 무시되지 않고 TypeError가 발생합니다. 값은 바뀌지 않고, 실행은 catch 블록으로 넘어갑니다.",
    line: at(5),
    state: quiet(
      op("item.code = 'B2'", 'assign', 'A', 'TypeError', { key: 'code', value: str('B2') }),
    ),
    output: [],
  },
  {
    title: '7번 줄: e.name 출력',
    explanation: '잡은 오류의 name은 TypeError입니다. 이 이름을 콘솔에 출력합니다.',
    line: at(7),
    state: quiet(null),
    output: ['TypeError'],
  },
  {
    title: '10번 줄: delete item.code',
    explanation:
      'code의 configurable이 false라서 삭제할 수 없습니다. strict mode에서는 delete가 false를 돌려주는 대신 TypeError가 발생하고, 실행은 catch 블록으로 넘어갑니다.',
    line: at(10),
    state: quiet(op('delete item.code', 'delete', 'A', 'TypeError', { key: 'code' })),
    output: ['TypeError'],
  },
  {
    title: '12번 줄: e.name 출력',
    explanation: '이번에도 잡은 오류의 name은 TypeError이고, 이를 콘솔에 출력합니다.',
    line: at(12),
    state: quiet(null),
    output: ['TypeError', 'TypeError'],
  },
  {
    title: '14번 줄: item.code 읽기',
    explanation: "대입도 삭제도 실패했으므로 code는 그대로 있고 값은 'A1'입니다.",
    line: at(14),
    state: quiet(readCodeOp),
    output: ['TypeError', 'TypeError', 'A1'],
  },
]

// --- 시나리오 3: getter ---------------------------------------------------------------------------

const getText = 'get next() { … }'
const getterReads = (n: number, changed = false) => bind('reads', 'let', num(n), changed)
const counterBinding = () => bind('counter', 'const', ref('A'))
const nextProp = () => accessor('next', getText, null)
const getterState = (reads: number, changedReads: boolean, opValue: Op | null) =>
  st([getterReads(reads, changedReads), counterBinding()], [box('A', [nextProp()])], opValue)

const getterSteps: AttrStep[] = [
  {
    title: '실행 전',
    explanation: '아직 아무것도 실행하지 않았습니다.',
    state: empty,
    output: [],
  },
  {
    title: '1번 줄: reads를 0으로',
    explanation:
      '바깥 변수 reads를 0으로 만듭니다. 뒤에서 getter가 이 변수를 올려서, getter가 몇 번 호출됐는지 알려 줍니다.',
    line: at(1),
    state: st([getterReads(0, true)], []),
    output: [],
  },
  {
    title: '2~7번 줄: getter가 있는 객체',
    explanation:
      '객체 리터럴이 객체 A를 만들고 변수 counter가 A를 가리킵니다. next는 값을 저장한 프로퍼티가 아니라 getter 함수를 가진 접근자 프로퍼티입니다. 아직 getter는 한 번도 호출되지 않았습니다.',
    line: lines(2, 7),
    state: st(
      [getterReads(0), bind('counter', 'const', ref('A'), true)],
      [box('A', [accessor('next', getText, null, ['created'])], true, ['created'])],
    ),
    output: [],
  },
  {
    title: '8번 줄: counter.next 읽기',
    explanation:
      'counter.next를 읽으면 저장된 값을 꺼내는 대신 getter 함수가 호출됩니다. 함수가 reads를 1로 올리고 1을 돌려줘서 1을 출력합니다.',
    line: at(8),
    state: getterState(
      1,
      true,
      op('counter.next', 'read', 'A', 'getter-called', { key: 'next', value: num(1) }),
    ),
    output: ['1'],
  },
  {
    title: '9번 줄: counter.next 다시 읽기',
    explanation:
      '같은 프로퍼티를 다시 읽으면 getter가 또 호출됩니다. 값을 저장해 두지 않고 읽을 때마다 함수를 실행하므로 reads가 2가 되고 2를 출력합니다.',
    line: at(9),
    state: getterState(
      2,
      true,
      op('counter.next', 'read', 'A', 'getter-called', { key: 'next', value: num(2) }),
    ),
    output: ['1', '2'],
  },
  {
    title: '10번 줄: 디스크립터의 get',
    explanation:
      'Object.getOwnPropertyDescriptor는 getter를 호출하지 않고 get 필드에 getter 함수 자체를 담아 돌려줍니다. typeof가 "function"이라 이를 출력하고, reads는 2 그대로입니다.',
    line: at(10),
    state: getterState(
      2,
      false,
      op("Object.getOwnPropertyDescriptor(counter, 'next').get", 'describe', 'A', 'value', {
        key: 'next',
        value: str('function'),
      }),
    ),
    output: ['1', '2', 'function'],
  },
  {
    title: '11번 줄: JSON.stringify(counter)',
    explanation:
      'JSON.stringify가 enumerable한 next의 값을 읽으려고 getter를 다시 호출합니다. reads가 3이 되고, 돌려받은 3이 JSON 문자열에 들어가 {"next":3}을 출력합니다.',
    line: at(11),
    state: getterState(
      3,
      true,
      op('JSON.stringify(counter)', 'stringify', 'A', 'getter-called', {
        key: 'next',
        value: num(3),
      }),
    ),
    output: ['1', '2', 'function', '{"next":3}'],
  },
]

// --- 시나리오 4: freeze는 얕다 --------------------------------------------------------------------

const configBinding = (changed = false) => bind('config', 'const', ref('A'), changed)
const limitsProp = (attrs: Attrs, changed?: DataProp['changed']) =>
  data('limits', ref('B'), attrs, changed)
const levelProp = (value: number, attrs: Attrs, changed?: DataProp['changed']) =>
  data('level', num(value), attrs, changed)
const maxProp = (value: number, changed?: DataProp['changed']) =>
  data('max', num(value), ALL, changed)

const frozenA = (levelValue: number) =>
  box('A', [levelProp(levelValue, LOCKED), limitsProp(LOCKED)], false)
const boxB = (maxValue: number) => box('B', [maxProp(maxValue)])
const frozenState = (maxValue: number, opValue: Op | null, levelValue = 1) =>
  st([configBinding()], [frozenA(levelValue), boxB(maxValue)], opValue)

const readOp = (codeText: string, objectId: string, key: string, value: Val) =>
  op(codeText, 'read', objectId, 'value', { key, value })

const freezeShallowSteps: AttrStep[] = [
  {
    title: '실행 전',
    explanation:
      '아직 아무것도 실행하지 않았습니다. 이 스크립트에는 strict mode 지시어가 없어서 sloppy mode로 실행됩니다.',
    state: empty,
    output: [],
  },
  {
    title: '1번 줄: 객체 두 개 만들기',
    explanation:
      '객체 리터럴이 두 개 있으므로 객체가 둘 만들어집니다. 바깥 객체 A는 level과 limits를 가지고, limits의 값은 안쪽 객체 B를 가리킵니다. 리터럴로 만든 프로퍼티는 어트리뷰트가 모두 true입니다.',
    line: at(1),
    state: st(
      [configBinding(true)],
      [
        box('A', [levelProp(1, ALL, ['created']), limitsProp(ALL, ['created'])], true, ['created']),
        box('B', [maxProp(10, ['created'])], true, ['created']),
      ],
    ),
    output: [],
  },
  {
    title: '2번 줄: Object.freeze(config)',
    explanation:
      'freeze는 A를 확장 불가로 만들고, A의 데이터 프로퍼티를 writable false, configurable false로 바꿉니다. A의 limits가 가리키는 B는 다른 객체라서 바뀌지 않고 그대로입니다.',
    line: at(2),
    state: st(
      [configBinding()],
      [
        box(
          'A',
          [
            levelProp(1, LOCKED, ['writable', 'configurable']),
            limitsProp(LOCKED, ['writable', 'configurable']),
          ],
          false,
          ['extensible'],
        ),
        boxB(10),
      ],
      op('Object.freeze(config)', 'integrity', 'A', 'applied'),
    ),
    output: [],
  },
  {
    title: '3번 줄: config.level에 대입',
    explanation:
      'level의 writable이 false라서 2를 대입해도 값이 바뀌지 않습니다. 대입은 실패했지만 strict mode가 아니라서 오류 없이 넘어갑니다.',
    line: at(3),
    state: frozenState(
      10,
      op('config.level = 2', 'assign', 'A', 'ignored', { key: 'level', value: num(2) }),
    ),
    output: [],
  },
  {
    title: '4번 줄: config.limits.max에 대입',
    explanation:
      'config.limits는 B를 가리키고, 대입 대상은 B의 max입니다. B는 얼려지지 않았고 max의 writable이 true라서 값이 20으로 바뀝니다.',
    line: at(4),
    state: st(
      [configBinding()],
      [frozenA(1), box('B', [maxProp(20, ['value'])])],
      op('config.limits.max = 20', 'assign', 'B', 'updated', { key: 'max', value: num(20) }),
    ),
    output: [],
  },
  {
    title: '5번 줄: config.level 읽기',
    explanation: 'level은 대입이 무시되어 처음 값 1 그대로입니다. 1을 출력합니다.',
    line: at(5),
    state: frozenState(20, readOp('config.level', 'A', 'level', num(1))),
    output: ['1'],
  },
  {
    title: '6번 줄: config.limits.max 읽기',
    explanation: 'B의 max는 20으로 바뀌었습니다. 20을 출력합니다.',
    line: at(6),
    state: frozenState(20, readOp('config.limits.max', 'B', 'max', num(20))),
    output: ['1', '20'],
  },
  {
    title: '7번 줄: Object.isFrozen(config)',
    explanation:
      'A는 확장 불가이고 모든 프로퍼티가 configurable false, 데이터 프로퍼티는 writable false라서 isFrozen이 true입니다.',
    line: at(7),
    state: frozenState(
      20,
      op('Object.isFrozen(config)', 'integrity', 'A', 'value', { value: bool(true) }),
    ),
    output: ['1', '20', 'true'],
  },
  {
    title: '8번 줄: Object.isFrozen(config.limits)',
    explanation:
      'B는 freeze를 거치지 않아 확장 가능하고 프로퍼티도 쓰기 가능이라서 isFrozen이 false입니다. freeze는 A의 프로퍼티에만 적용되고, 그 값이 가리키는 B까지 얼리지 않습니다.',
    line: at(8),
    state: frozenState(
      20,
      op('Object.isFrozen(config.limits)', 'integrity', 'B', 'value', { value: bool(false) }),
    ),
    output: ['1', '20', 'true', 'false'],
  },
]

// --- 시나리오 목록 --------------------------------------------------------------------------------

export const scenarios: Scenario<AttrState>[] = [
  {
    id: 'writable-sloppy',
    label: '쓰기 금지: sloppy mode',
    exampleId: 'writable-sloppy',
    code: writableSloppyCode,
    steps: writableSloppySteps,
  },
  {
    id: 'writable-strict',
    label: '쓰기 금지: strict mode',
    exampleId: 'writable-strict',
    code: writableStrictCode,
    steps: writableStrictSteps,
  },
  {
    id: 'getter',
    label: 'getter는 읽을 때 호출된다',
    exampleId: 'getter',
    code: getterCode,
    steps: getterSteps,
  },
  {
    id: 'freeze-shallow',
    label: 'freeze는 얕다',
    exampleId: 'freeze-shallow',
    code: freezeShallowCode,
    steps: freezeShallowSteps,
  },
]
