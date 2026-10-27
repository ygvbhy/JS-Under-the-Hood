import type { Scenario, Step } from '~/simulator/types'
import addDeleteCode from './examples/add-delete.js?raw'
import dotVsBracketCode from './examples/dot-vs-bracket.js?raw'
import sameKeyCode from './examples/same-key.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// `changed: true`는 "그 단계에서" 새로 생기거나 값이 바뀐 항목에만 붙이고, 다음 단계에서는 해제한다.
// 객체의 changed는 객체가 새로 만들어진 단계에만 붙는다(프로퍼티 변화는 Prop의 changed로 표시한다).
// access는 그 단계의 줄이 실행한 프로퍼티 접근이다. 선언문이나 JSON.stringify 줄처럼 접근이 없으면 null이다.

export type Val = {
  type: 'number' | 'string' | 'boolean' | 'undefined'
  display: string // string은 따옴표 없는 내용만 담고, 화면에서 큰따옴표를 붙인다
}

export type ObjectRef = { kind: 'object'; id: string }

export type Binding = {
  name: string
  declaredWith: 'const'
  value: Val | ObjectRef
  changed?: boolean
}

export type Prop = { key: string; value: Val; changed?: boolean } // key는 따옴표 없는 문자열

export type ObjectBox = { id: string; label: string; props: Prop[]; changed?: boolean }

export type Access = {
  code: string // 접근 식 원문(예: 'scores[1]'). delete 줄도 'delete box.a'가 아니라 'box.a'
  notation: 'dot' | 'bracket'
  keyExpr: string // bracket: 대괄호 안 식 원문, dot: 점 뒤 이름
  keyValue?: Val // bracket만: 대괄호 안 식의 값
  key: string // 프로퍼티 키(문자열, 따옴표 없이)
  op: 'get' | 'set' | 'delete'
  result: 'found' | 'missing' | 'created' | 'updated' | 'deleted' | 'delete-missing'
  value: Val // get: 읽은 값, set: 넣은 값, delete: delete 식의 값(true)
}

export type PropertyState = { bindings: Binding[]; objects: ObjectBox[]; access: Access | null }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const yes: Val = { type: 'boolean', display: 'true' }
const undef: Val = { type: 'undefined', display: 'undefined' }
const ref = (id: string): ObjectRef => ({ kind: 'object', id })

const bind = (name: string, value: Binding['value'], changed = false): Binding => ({
  name,
  declaredWith: 'const',
  value,
  ...(changed && { changed }),
})

const prop = (key: string, value: Val, changed = false): Prop => ({
  key,
  value,
  ...(changed && { changed }),
})

const box = (props: Prop[], changed = false): ObjectBox => ({
  id: 'A',
  label: '객체 A',
  props,
  ...(changed && { changed }),
})

const dot = (
  code: string,
  key: string,
  op: Access['op'],
  result: Access['result'],
  value: Val,
): Access => ({ code, notation: 'dot', keyExpr: key, key, op, result, value })

const bracket = (
  code: string,
  keyExpr: string,
  keyValue: Val,
  op: Access['op'],
  result: Access['result'],
  value: Val,
): Access => ({
  code,
  notation: 'bracket',
  keyExpr,
  keyValue,
  key: keyValue.display,
  op,
  result,
  value,
})

const at = (n: number) => ({ from: n, to: n })

type PropStep = Step<PropertyState>

const empty: PropertyState = { bindings: [], objects: [], access: null }

// --- 시나리오 1: 숫자 키와 문자열 키 -----------------------------------------------------------

const scoresName = (changed = false): Binding => bind('scores', ref('A'), changed)

const sameKeySteps: PropStep[] = [
  {
    title: '실행 전',
    explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
    state: empty,
    output: [],
  },
  {
    title: '빈 객체를 만들어 scores에 넣음',
    explanation:
      '객체 리터럴 {}을 평가하면 프로퍼티가 없는 새 객체(객체 A)가 만들어지고, scores의 값은 그 객체가 됩니다.',
    line: at(1),
    state: { bindings: [scoresName(true)], objects: [box([], true)], access: null },
    output: [],
  },
  {
    title: 'scores[1]에 \'금\'을 대입: 키 "1"을 추가',
    explanation:
      '대괄호 안의 식 1을 평가한 값은 숫자 1입니다. 대괄호 표기는 이 값을 문자열 "1"로 바꿔 프로퍼티 키로 씁니다. 객체 A에는 키 "1"이 없으므로 프로퍼티를 추가하고 값을 "금"으로 둡니다.',
    line: at(2),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('금'), true)])],
      access: bracket('scores[1]', '1', num(1), 'set', 'created', str('금')),
    },
    output: [],
  },
  {
    title: "scores['2']에 '은'을 대입: 키 \"2\"를 추가",
    explanation:
      '대괄호 안의 식 \'2\'를 평가한 값은 이미 문자열 "2"이므로 그대로 프로퍼티 키로 씁니다. 객체 A에는 키 "2"가 없으므로 프로퍼티를 추가합니다.',
    line: at(3),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('금')), prop('2', str('은'), true)])],
      access: bracket("scores['2']", "'2'", str('2'), 'set', 'created', str('은')),
    },
    output: [],
  },
  {
    title: 'scores[\'1\']을 읽음: "금"',
    explanation:
      '대괄호 안의 식 \'1\'의 값은 문자열 "1"이고, 객체 A에 키 "1"의 프로퍼티가 있으므로 그 값 "금"을 읽습니다. 2번째 줄에서 숫자 1로 만든 프로퍼티와 같은 프로퍼티입니다. 둘 다 프로퍼티 키가 문자열 "1"이기 때문입니다. 콘솔에 금이 출력됩니다.',
    line: at(4),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('금')), prop('2', str('은'))])],
      access: bracket("scores['1']", "'1'", str('1'), 'get', 'found', str('금')),
    },
    output: ['금'],
  },
  {
    title: 'scores[2]를 읽음: "은"',
    explanation:
      '대괄호 안의 식 2를 평가한 값은 숫자 2이고, 이 값을 문자열 "2"로 바꿔 프로퍼티 키로 씁니다. 객체 A에 키 "2"의 프로퍼티가 있으므로 그 값 "은"을 읽습니다. 3번째 줄에서 문자열 \'2\'로 추가한 프로퍼티와 같은 프로퍼티입니다.',
    line: at(5),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('금')), prop('2', str('은'))])],
      access: bracket('scores[2]', '2', num(2), 'get', 'found', str('은')),
    },
    output: ['금', '은'],
  },
  {
    title: "scores['1']에 '동'을 대입: 값을 바꿈",
    explanation:
      '대괄호 안의 식 \'1\'의 값은 문자열 "1"입니다. 객체 A에 키 "1"의 프로퍼티가 이미 있으므로 새로 추가하지 않고 그 프로퍼티의 값을 "동"으로 바꿉니다.',
    line: at(6),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('동'), true), prop('2', str('은'))])],
      access: bracket("scores['1']", "'1'", str('1'), 'set', 'updated', str('동')),
    },
    output: ['금', '은'],
  },
  {
    title: 'scores[1]을 읽음: "동"',
    explanation:
      '이번에는 숫자 1을 문자열 "1"로 바꿔 읽습니다. 6번째 줄에서 문자열 \'1\'로 값을 바꾼 프로퍼티와 같은 프로퍼티이므로 바뀐 값 "동"이 나옵니다. 콘솔에 동이 출력됩니다.',
    line: at(7),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('동')), prop('2', str('은'))])],
      access: bracket('scores[1]', '1', num(1), 'get', 'found', str('동')),
    },
    output: ['금', '은', '동'],
  },
  {
    title: 'JSON.stringify(scores)를 출력',
    explanation:
      'JSON.stringify는 객체를 JSON 문자열로 바꾸며, 이 줄에는 프로퍼티 접근 식이 없습니다. 출력은 {"1":"동","2":"은"}입니다. 대괄호 안에 숫자와 문자열을 섞어 대입하고 읽었지만 키는 문자열 "1"과 "2"뿐이라 프로퍼티는 두 개입니다.',
    line: at(8),
    state: {
      bindings: [scoresName()],
      objects: [box([prop('1', str('동')), prop('2', str('은'))])],
      access: null,
    },
    output: ['금', '은', '동', '{"1":"동","2":"은"}'],
  },
]

// --- 시나리오 2: 점 표기와 대괄호 표기 ---------------------------------------------------------

const userName = (changed = false): Binding => bind('user', ref('A'), changed)
const keyName = (changed = false): Binding => bind('key', str('name'), changed)
const userProps = [prop('name', str('민지')), prop('key', str('열쇠'))]

const dotBracketSteps: PropStep[] = [
  {
    title: '실행 전',
    explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
    state: empty,
    output: [],
  },
  {
    title: '객체를 만들어 user에 넣음',
    explanation:
      '객체 리터럴 { name: \'민지\', key: \'열쇠\' }를 평가하면 프로퍼티 두 개를 가진 새 객체(객체 A)가 만들어집니다. 리터럴에 쓴 이름 name과 key가 그대로 프로퍼티 키(문자열 "name"과 "key")가 됩니다. user의 값은 그 객체입니다.',
    line: at(1),
    state: {
      bindings: [userName(true)],
      objects: [box([prop('name', str('민지'), true), prop('key', str('열쇠'), true)], true)],
      access: null,
    },
    output: [],
  },
  {
    title: "key에 'name'을 넣음",
    explanation:
      '변수 key의 값은 문자열 "name"이 됩니다. 이 변수는 객체 A의 프로퍼티 key와는 이름만 같을 뿐 서로 다른 것입니다.',
    line: at(2),
    state: {
      bindings: [userName(), keyName(true)],
      objects: [box(userProps)],
      access: null,
    },
    output: [],
  },
  {
    title: 'user.name을 읽음: "민지"',
    explanation:
      '점 표기는 점 뒤의 이름 name을 평가하지 않고 그대로 프로퍼티 키 "name"으로 씁니다. 객체 A에 키 "name"의 프로퍼티가 있으므로 그 값 "민지"를 읽습니다. 콘솔에 민지가 출력됩니다.',
    line: at(3),
    state: {
      bindings: [userName(), keyName()],
      objects: [box(userProps)],
      access: dot('user.name', 'name', 'get', 'found', str('민지')),
    },
    output: ['민지'],
  },
  {
    title: 'user[\'name\']을 읽음: "민지"',
    explanation:
      '대괄호 안의 식 \'name\'을 평가한 값은 문자열 "name"이고, 이 값이 프로퍼티 키가 됩니다. 앞 단계의 user.name과 같은 키 "name"이므로 같은 프로퍼티의 값 "민지"를 읽습니다.',
    line: at(4),
    state: {
      bindings: [userName(), keyName()],
      objects: [box(userProps)],
      access: bracket("user['name']", "'name'", str('name'), 'get', 'found', str('민지')),
    },
    output: ['민지', '민지'],
  },
  {
    title: 'user[key]를 읽음: key의 값 "name"이 키가 됨',
    explanation:
      '대괄호 안의 식 key는 변수이므로, 그 변수의 값 "name"이 평가 결과가 되어 프로퍼티 키로 쓰입니다. 점 표기와 달리 대괄호 안의 이름은 변수로 평가됩니다. 객체 A의 키 "name"의 값 "민지"를 읽습니다.',
    line: at(5),
    state: {
      bindings: [userName(), keyName()],
      objects: [box(userProps)],
      access: bracket('user[key]', 'key', str('name'), 'get', 'found', str('민지')),
    },
    output: ['민지', '민지', '민지'],
  },
  {
    title: 'user.key를 읽음: 키 "key"의 값 "열쇠"',
    explanation:
      '점 표기는 이름 key를 변수로 평가하지 않고 그대로 프로퍼티 키 "key"로 씁니다. 변수 key의 값 "name"과는 관계가 없습니다. 객체 A에 키 "key"의 프로퍼티가 있으므로 그 값 "열쇠"를 읽습니다.',
    line: at(6),
    state: {
      bindings: [userName(), keyName()],
      objects: [box(userProps)],
      access: dot('user.key', 'key', 'get', 'found', str('열쇠')),
    },
    output: ['민지', '민지', '민지', '열쇠'],
  },
]

// --- 시나리오 3: 추가·갱신·삭제 ----------------------------------------------------------------

const boxName = (changed = false): Binding => bind('box', ref('A'), changed)

const addDeleteSteps: PropStep[] = [
  {
    title: '실행 전',
    explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
    state: empty,
    output: [],
  },
  {
    title: '객체를 만들어 box에 넣음',
    explanation:
      '객체 리터럴 { a: 1 }을 평가하면 프로퍼티 하나(키 "a", 값 1)를 가진 새 객체(객체 A)가 만들어지고, box의 값은 그 객체가 됩니다.',
    line: at(1),
    state: {
      bindings: [boxName(true)],
      objects: [box([prop('a', num(1), true)], true)],
      access: null,
    },
    output: [],
  },
  {
    title: 'box.b를 읽음: 없어서 undefined',
    explanation:
      '점 표기의 키는 "b"입니다. 객체 A에는 키 "b"의 프로퍼티가 없어서 읽은 결과는 undefined입니다. 프로퍼티가 없어도 오류는 나지 않습니다. 콘솔에 undefined가 출력됩니다.',
    line: at(2),
    state: {
      bindings: [boxName()],
      objects: [box([prop('a', num(1))])],
      access: dot('box.b', 'b', 'get', 'missing', undef),
    },
    output: ['undefined'],
  },
  {
    title: 'box.b에 2를 대입: 프로퍼티를 추가',
    explanation:
      '객체 A에 키 "b"의 프로퍼티가 없으므로 대입은 새 프로퍼티를 추가하고 값을 2로 둡니다.',
    line: at(3),
    state: {
      bindings: [boxName()],
      objects: [box([prop('a', num(1)), prop('b', num(2), true)])],
      access: dot('box.b', 'b', 'set', 'created', num(2)),
    },
    output: ['undefined'],
  },
  {
    title: 'box.a에 10을 대입: 값을 바꿈',
    explanation:
      '객체 A에 키 "a"의 프로퍼티가 이미 있으므로 새로 추가하지 않고 그 프로퍼티의 값을 1에서 10으로 바꿉니다.',
    line: at(4),
    state: {
      bindings: [boxName()],
      objects: [box([prop('a', num(10), true), prop('b', num(2))])],
      access: dot('box.a', 'a', 'set', 'updated', num(10)),
    },
    output: ['undefined'],
  },
  {
    title: 'JSON.stringify(box)를 출력',
    explanation:
      'JSON.stringify는 객체를 JSON 문자열로 바꾸며, 이 줄에는 프로퍼티 접근 식이 없습니다. 객체 A의 현재 프로퍼티 a: 10, b: 2가 키를 따옴표 문자열로 감싼 {"a":10,"b":2}로 출력됩니다.',
    line: at(5),
    state: {
      bindings: [boxName()],
      objects: [box([prop('a', num(10)), prop('b', num(2))])],
      access: null,
    },
    output: ['undefined', '{"a":10,"b":2}'],
  },
  {
    title: 'delete box.a: 프로퍼티를 지움',
    explanation:
      'delete 연산자는 객체 A에서 키 "a"의 프로퍼티를 지웁니다. 지우는 데 성공해서 delete 식의 값은 true이고, 콘솔에 true가 출력됩니다.',
    line: at(6),
    state: {
      bindings: [boxName()],
      objects: [box([prop('b', num(2))])],
      access: dot('box.a', 'a', 'delete', 'deleted', yes),
    },
    output: ['undefined', '{"a":10,"b":2}', 'true'],
  },
  {
    title: 'box.a를 읽음: 지워져서 undefined',
    explanation:
      '객체 A에서 키 "a"의 프로퍼티를 지웠으므로 이제 없는 프로퍼티를 읽는 것과 같고, 결과는 undefined입니다. 값이 undefined인 프로퍼티가 남아 있는 것이 아니라 프로퍼티 자체가 없습니다.',
    line: at(7),
    state: {
      bindings: [boxName()],
      objects: [box([prop('b', num(2))])],
      access: dot('box.a', 'a', 'get', 'missing', undef),
    },
    output: ['undefined', '{"a":10,"b":2}', 'true', 'undefined'],
  },
  {
    title: 'delete box.c: 없는 프로퍼티도 true',
    explanation:
      '객체 A에는 키 "c"의 프로퍼티가 없어서 지울 것이 없습니다. 그래도 오류 없이 delete 식의 값은 true이고, 객체는 그대로입니다. true는 지웠다는 뜻이 아니라 지우려던 프로퍼티가 이제 없다는 뜻입니다.',
    line: at(8),
    state: {
      bindings: [boxName()],
      objects: [box([prop('b', num(2))])],
      access: dot('box.c', 'c', 'delete', 'delete-missing', yes),
    },
    output: ['undefined', '{"a":10,"b":2}', 'true', 'undefined', 'true'],
  },
  {
    title: 'JSON.stringify(box)를 출력',
    explanation:
      '이 줄에는 프로퍼티 접근 식이 없습니다. 객체 A에는 프로퍼티 b만 남아 있으므로 {"b":2}가 출력됩니다.',
    line: at(9),
    state: {
      bindings: [boxName()],
      objects: [box([prop('b', num(2))])],
      access: null,
    },
    output: ['undefined', '{"a":10,"b":2}', 'true', 'undefined', 'true', '{"b":2}'],
  },
]

export const scenarios: Scenario<PropertyState>[] = [
  {
    id: 'same-key',
    label: '숫자 키와 문자열 키',
    exampleId: 'same-key',
    code: sameKeyCode,
    steps: sameKeySteps,
  },
  {
    id: 'dot-vs-bracket',
    label: '점 표기와 대괄호 표기',
    exampleId: 'dot-vs-bracket',
    code: dotVsBracketCode,
    steps: dotBracketSteps,
  },
  {
    id: 'add-delete',
    label: '추가·갱신·삭제',
    exampleId: 'add-delete',
    code: addDeleteCode,
    steps: addDeleteSteps,
  },
]
