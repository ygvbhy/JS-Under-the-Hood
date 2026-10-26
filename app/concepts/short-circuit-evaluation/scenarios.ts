import type { Scenario, Step } from '~/simulator/types'
import logicalResultCode from './examples/logical-result.js?raw'
import nullishCode from './examples/nullish.js?raw'
import optionalChainingCode from './examples/optional-chaining.js?raw'
import skipRightCode from './examples/skip-right.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// `changed: true`는 "그 단계에서" 새로 생긴 바인딩에만 붙이고, 다음 단계에서는 해제한다.
// 이 예제들에는 재할당이 없으므로 바인딩은 생길 때 한 번만 changed다.

export type Val = {
  type: 'number' | 'string' | 'boolean' | 'undefined' | 'null' | 'object'
  // 화면에 보일 값. string은 따옴표 없는 내용만 담고(EvaluationView가 큰따옴표를 붙인다),
  // number는 String(n), object는 '{ profile: {…} }'처럼 내용을 줄인 표기다.
  display: string
}

export type Binding = {
  name: string
  declaredWith: 'const' | 'let'
  value: Val
  changed?: boolean
}

// 'truthy'·'falsy'는 &&·||, 'nullish'·'not-nullish'는 ??·?.의 판정이다.
// 화면 문구 예: nullish → "null 또는 undefined"
export type Check = 'truthy' | 'falsy' | 'nullish' | 'not-nullish'

export type Part = {
  code: string // 소스 조각: "0", "check('A', 0)", "user", "?.profile", ".age"
  status: 'pending' | 'evaluated' | 'skipped'
  value?: Val // evaluated일 때만
  check?: Check // 판정에 쓰인 조각에만. 표시 문구는 EvaluationView가 매핑한다.
}

// 한 Evaluation = 한 종류의 연산자. a && b || c처럼 섞인 식은 표현하지 않는다(이 페이지 예제에 없음).
// optional-chaining 6번 줄처럼 ?. 결과를 ??가 쓰는 식은 Evaluation 두 개(단계 두 개)로 나눈다.
export type Evaluation = {
  code: string // 평가 중인 식 전체: "0 || 'hello'"
  operator: '&&' | '||' | '??' | '?.'
  parts: Part[]
  result?: Val
}

export type EvalState = { bindings: Binding[]; evaluation?: Evaluation }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------
// 값 표기 규칙(숫자는 String(n), 문자열은 따옴표 없는 내용)을 헬퍼로 강제한다.
// concept.test.ts가 display로 truthiness를 계산하므로 표기가 어긋나면 의미 검사가 실패한다.

const num = (n: number): Val => ({ type: 'number', display: String(n) })
const str = (s: string): Val => ({ type: 'string', display: s })
const undef = (): Val => ({ type: 'undefined', display: 'undefined' })
const nul = (): Val => ({ type: 'null', display: 'null' })
const objv = (display: string): Val => ({ type: 'object', display })

const bind = (name: string, declaredWith: Binding['declaredWith'], value: Val): Binding => ({
  name,
  declaredWith,
  value,
})
const changed = (b: Binding): Binding => ({ ...b, changed: true })

const pending = (code: string): Part => ({ code, status: 'pending' })
const evaluated = (code: string, value: Val, check?: Check): Part => ({
  code,
  status: 'evaluated',
  value,
  ...(check && { check }),
})
const skipped = (code: string): Part => ({ code, status: 'skipped' })

const evaluation = (
  code: string,
  operator: Evaluation['operator'],
  parts: Part[],
  result?: Val,
): Evaluation => ({ code, operator, parts, ...(result && { result }) })

const state = (bindings: Binding[], ev?: Evaluation): EvalState => ({
  bindings,
  ...(ev && { evaluation: ev }),
})

const empty: EvalState = { bindings: [] }

const intro: Step<EvalState> = {
  title: '실행 전',
  explanation: '코드를 실행하기 전입니다. 이 시각화는 선언문이 실행된 변수만 보여 줍니다.',
  state: empty,
  output: [],
}

const at = (n: number) => ({ from: n, to: n })

// --- 시나리오 1: 값을 돌려줌 (logical-result) ---------------------------------------------------

const a = bind('a', 'const', str('hello'))
const b = bind('b', 'const', str('hi'))
const c = bind('c', 'const', num(0))
const d = bind('d', 'const', str('hello'))

const logicalResultSteps: Step<EvalState>[] = [
  intro,
  {
    title: "0 || 'hello'의 왼쪽 평가",
    explanation:
      "1번 줄의 0 || 'hello'를 평가합니다. 왼쪽 0을 평가하고 truthy인지 falsy인지 판정하면 falsy입니다. ||는 왼쪽이 falsy이면 오른쪽을 평가합니다.",
    line: at(1),
    state: state(
      [],
      evaluation("0 || 'hello'", '||', [evaluated('0', num(0), 'falsy'), pending("'hello'")]),
    ),
    output: [],
  },
  {
    title: "a를 'hello'로 초기화",
    explanation:
      "왼쪽이 falsy이므로 오른쪽 'hello'를 평가하고, 그 값이 식의 결과입니다. 결과는 false가 아니라 오른쪽 피연산자의 값 자체이고, a는 이 값으로 초기화됩니다.",
    line: at(1),
    state: state(
      [changed(a)],
      evaluation(
        "0 || 'hello'",
        '||',
        [evaluated('0', num(0), 'falsy'), evaluated("'hello'", str('hello'))],
        str('hello'),
      ),
    ),
    output: [],
  },
  {
    title: "'hi' || 'hello'의 왼쪽 평가",
    explanation:
      "2번 줄의 'hi' || 'hello'를 평가합니다. 왼쪽 'hi'는 비어 있지 않은 문자열이므로 truthy입니다. ||는 왼쪽이 truthy이면 왼쪽 값을 결과로 합니다.",
    line: at(2),
    state: state(
      [a],
      evaluation("'hi' || 'hello'", '||', [
        evaluated("'hi'", str('hi'), 'truthy'),
        pending("'hello'"),
      ]),
    ),
    output: [],
  },
  {
    title: "b를 'hi'로 초기화",
    explanation:
      "왼쪽이 truthy이므로 ||는 왼쪽 값 'hi'를 결과로 하고 오른쪽 'hello'를 평가하지 않습니다. 결과는 true가 아니라 왼쪽 피연산자의 값 자체이고, b는 이 값으로 초기화됩니다.",
    line: at(2),
    state: state(
      [a, changed(b)],
      evaluation(
        "'hi' || 'hello'",
        '||',
        [evaluated("'hi'", str('hi'), 'truthy'), skipped("'hello'")],
        str('hi'),
      ),
    ),
    output: [],
  },
  {
    title: "0 && 'hello'의 왼쪽 평가",
    explanation:
      "3번 줄의 0 && 'hello'를 평가합니다. 왼쪽 0은 falsy입니다. &&는 왼쪽이 falsy이면 왼쪽 값을 결과로 하고 오른쪽을 평가하지 않습니다.",
    line: at(3),
    state: state(
      [a, b],
      evaluation("0 && 'hello'", '&&', [evaluated('0', num(0), 'falsy'), pending("'hello'")]),
    ),
    output: [],
  },
  {
    title: 'c를 0으로 초기화',
    explanation:
      "왼쪽이 falsy이므로 &&는 왼쪽 값 0을 결과로 하고 오른쪽 'hello'를 평가하지 않습니다. 결과는 false가 아니라 숫자 0이고, c는 이 값으로 초기화됩니다.",
    line: at(3),
    state: state(
      [a, b, changed(c)],
      evaluation(
        "0 && 'hello'",
        '&&',
        [evaluated('0', num(0), 'falsy'), skipped("'hello'")],
        num(0),
      ),
    ),
    output: [],
  },
  {
    title: "'hi' && 'hello'의 왼쪽 평가",
    explanation:
      "4번 줄의 'hi' && 'hello'를 평가합니다. 왼쪽 'hi'는 truthy입니다. &&는 왼쪽이 truthy이면 오른쪽을 평가해 그 값을 결과로 합니다.",
    line: at(4),
    state: state(
      [a, b, c],
      evaluation("'hi' && 'hello'", '&&', [
        evaluated("'hi'", str('hi'), 'truthy'),
        pending("'hello'"),
      ]),
    ),
    output: [],
  },
  {
    title: "d를 'hello'로 초기화",
    explanation:
      "왼쪽이 truthy이므로 오른쪽 'hello'를 평가하고, 그 값이 식의 결과입니다. d는 이 값으로 초기화됩니다.",
    line: at(4),
    state: state(
      [a, b, c, changed(d)],
      evaluation(
        "'hi' && 'hello'",
        '&&',
        [evaluated("'hi'", str('hi'), 'truthy'), evaluated("'hello'", str('hello'))],
        str('hello'),
      ),
    ),
    output: [],
  },
  {
    title: 'console.log 출력',
    explanation:
      'console.log(a, b, c, d)가 네 변수의 값을 공백으로 이어 출력합니다. 콘솔 출력은 호스트의 console.log가 하는 일이며, 문자열은 따옴표 없이 출력됩니다.',
    line: at(5),
    state: state([a, b, c, d]),
    output: ['hello hi 0 hello'],
  },
]

// --- 시나리오 2: 오른쪽 건너뛰기 (skip-right) ---------------------------------------------------

const x = bind('x', 'const', num(0))
const y = bind('y', 'const', str('ok'))
const z = bind('z', 'const', num(2))

const skipRightSteps: Step<EvalState>[] = [
  intro,
  {
    title: "check('A', 0) 호출과 && 판정",
    explanation:
      "6번 줄을 실행합니다. 왼쪽 check('A', 0)을 호출하면 콘솔에 '평가: A'가 출력되고 0이 돌아옵니다. 0은 falsy이므로 &&는 멈춥니다. 1~4번 줄의 check 함수는 이 시각화에 표시하지 않고, 함수 호출 하나를 한 단계로 묶어 보여 줍니다.",
    line: at(6),
    state: state(
      [],
      evaluation("check('A', 0) && check('B', 1)", '&&', [
        evaluated("check('A', 0)", num(0), 'falsy'),
        pending("check('B', 1)"),
      ]),
    ),
    output: ['평가: A'],
  },
  {
    title: "check('B', 1)을 평가하지 않음",
    explanation:
      "왼쪽이 falsy이므로 &&는 왼쪽 값 0을 결과로 하고 오른쪽 check('B', 1)을 평가하지 않습니다. check('B', 1)이 호출되지 않았으므로 '평가: B'는 출력되지 않습니다. x는 결과 0으로 초기화됩니다.",
    line: at(6),
    state: state(
      [changed(x)],
      evaluation(
        "check('A', 0) && check('B', 1)",
        '&&',
        [evaluated("check('A', 0)", num(0), 'falsy'), skipped("check('B', 1)")],
        num(0),
      ),
    ),
    output: ['평가: A'],
  },
  {
    title: 'x 출력',
    explanation: 'console.log(x)가 x의 값 0을 출력합니다.',
    line: at(7),
    state: state([x]),
    output: ['평가: A', '0'],
  },
  {
    title: "check('C', 'ok') 호출과 || 판정",
    explanation:
      "8번 줄을 실행합니다. 왼쪽 check('C', 'ok')를 호출하면 '평가: C'가 출력되고 'ok'가 돌아옵니다. 'ok'는 truthy이므로 ||는 멈춥니다.",
    line: at(8),
    state: state(
      [x],
      evaluation("check('C', 'ok') || check('D', 2)", '||', [
        evaluated("check('C', 'ok')", str('ok'), 'truthy'),
        pending("check('D', 2)"),
      ]),
    ),
    output: ['평가: A', '0', '평가: C'],
  },
  {
    title: "check('D', 2)를 평가하지 않음",
    explanation:
      "왼쪽이 truthy이므로 ||는 왼쪽 값 'ok'를 결과로 하고 오른쪽 check('D', 2)를 평가하지 않습니다. '평가: D'는 출력되지 않고, y는 결과 'ok'로 초기화됩니다.",
    line: at(8),
    state: state(
      [x, changed(y)],
      evaluation(
        "check('C', 'ok') || check('D', 2)",
        '||',
        [evaluated("check('C', 'ok')", str('ok'), 'truthy'), skipped("check('D', 2)")],
        str('ok'),
      ),
    ),
    output: ['평가: A', '0', '평가: C'],
  },
  {
    title: 'y 출력',
    explanation: 'console.log(y)가 y의 값 ok를 출력합니다.',
    line: at(9),
    state: state([x, y]),
    output: ['평가: A', '0', '평가: C', 'ok'],
  },
  {
    title: "check('E', 1) 호출과 && 판정",
    explanation:
      "10번 줄을 실행합니다. 왼쪽 check('E', 1)을 호출하면 '평가: E'가 출력되고 1이 돌아옵니다. 1은 truthy이므로 &&는 오른쪽을 평가합니다.",
    line: at(10),
    state: state(
      [x, y],
      evaluation("check('E', 1) && check('F', 2)", '&&', [
        evaluated("check('E', 1)", num(1), 'truthy'),
        pending("check('F', 2)"),
      ]),
    ),
    output: ['평가: A', '0', '평가: C', 'ok', '평가: E'],
  },
  {
    title: "check('F', 2) 평가와 z 초기화",
    explanation:
      "오른쪽 check('F', 2)를 호출하면 '평가: F'가 출력되고 2가 돌아옵니다. 식의 결과는 오른쪽 값 2이고, z는 이 값으로 초기화됩니다.",
    line: at(10),
    state: state(
      [x, y, changed(z)],
      evaluation(
        "check('E', 1) && check('F', 2)",
        '&&',
        [evaluated("check('E', 1)", num(1), 'truthy'), evaluated("check('F', 2)", num(2))],
        num(2),
      ),
    ),
    output: ['평가: A', '0', '평가: C', 'ok', '평가: E', '평가: F'],
  },
  {
    title: 'z 출력',
    explanation: 'console.log(z)가 z의 값 2를 출력합니다.',
    line: at(11),
    state: state([x, y, z]),
    output: ['평가: A', '0', '평가: C', 'ok', '평가: E', '평가: F', '2'],
  },
]

// --- 시나리오 3: ?? 와 || (nullish) -------------------------------------------------------------
// 이 시나리오는 연산자 하나를 한 단계(왼쪽 판정 + 결과)로 묶는다.

const count = bind('count', 'const', num(0))
const title = bind('title', 'const', str(''))
const memo = bind('memo', 'let', undef())
const nullishBindings = [count, title, memo]

const nullishSteps: Step<EvalState>[] = [
  intro,
  {
    title: '변수 세 개를 선언',
    explanation:
      '1~3번 줄이 실행되어 count는 0, title은 빈 문자열이 됩니다. let memo;는 값을 주지 않고 선언했으므로 memo의 값은 undefined입니다. 빈 문자열은 따옴표만 있는 ""로 표시합니다.',
    line: { from: 1, to: 3 },
    state: state(nullishBindings.map(changed)),
    output: [],
  },
  {
    title: 'count || 10의 평가',
    explanation:
      '5번 줄의 첫 번째 식입니다. 왼쪽 count는 0이라 falsy이므로 ||는 오른쪽 10을 평가하고, 결과는 10입니다.',
    line: at(5),
    state: state(
      nullishBindings,
      evaluation(
        'count || 10',
        '||',
        [evaluated('count', num(0), 'falsy'), evaluated('10', num(10))],
        num(10),
      ),
    ),
    output: [],
  },
  {
    title: 'count ?? 10의 평가',
    explanation:
      '두 번째 식입니다. ??는 왼쪽이 null 또는 undefined일 때만 오른쪽을 평가합니다. count는 0이라 null도 undefined도 아니므로 오른쪽 10을 평가하지 않고 왼쪽 값 0이 결과입니다.',
    line: at(5),
    state: state(
      nullishBindings,
      evaluation(
        'count ?? 10',
        '??',
        [evaluated('count', num(0), 'not-nullish'), skipped('10')],
        num(0),
      ),
    ),
    output: [],
  },
  {
    title: '5번 줄 출력',
    explanation: 'console.log가 두 결과를 공백으로 이어 10 0을 출력합니다.',
    line: at(5),
    state: state(nullishBindings),
    output: ['10 0'],
  },
  {
    title: "title || '제목 없음'의 평가",
    explanation:
      "6번 줄의 첫 번째 식입니다. 왼쪽 title은 빈 문자열이라 falsy이므로 ||는 오른쪽 '제목 없음'을 평가하고, 결과는 '제목 없음'입니다.",
    line: at(6),
    state: state(
      nullishBindings,
      evaluation(
        "title || '제목 없음'",
        '||',
        [evaluated('title', str(''), 'falsy'), evaluated("'제목 없음'", str('제목 없음'))],
        str('제목 없음'),
      ),
    ),
    output: ['10 0'],
  },
  {
    title: "title ?? '제목 없음'의 평가",
    explanation:
      '두 번째 식입니다. title은 빈 문자열이지만 null도 undefined도 아니므로 ??는 오른쪽을 평가하지 않고 왼쪽 값인 빈 문자열이 결과입니다.',
    line: at(6),
    state: state(
      nullishBindings,
      evaluation(
        "title ?? '제목 없음'",
        '??',
        [evaluated('title', str(''), 'not-nullish'), skipped("'제목 없음'")],
        str(''),
      ),
    ),
    output: ['10 0'],
  },
  {
    title: '6번 줄 출력',
    explanation:
      '두 결과를 JSON.stringify로 감싸 출력합니다. 빈 문자열은 그대로 출력하면 아무것도 보이지 않으므로, JSON.stringify로 큰따옴표를 붙여 ""로 보이게 한 것입니다. 이 큰따옴표는 값이 아니라 출력용입니다.',
    line: at(6),
    state: state(nullishBindings),
    output: ['10 0', '"제목 없음" ""'],
  },
  {
    title: "memo ?? '메모 없음'의 평가",
    explanation:
      "7번 줄입니다. 왼쪽 memo의 값은 undefined이므로 ??는 오른쪽 '메모 없음'을 평가하고, 결과는 '메모 없음'입니다.",
    line: at(7),
    state: state(
      nullishBindings,
      evaluation(
        "memo ?? '메모 없음'",
        '??',
        [evaluated('memo', undef(), 'nullish'), evaluated("'메모 없음'", str('메모 없음'))],
        str('메모 없음'),
      ),
    ),
    output: ['10 0', '"제목 없음" ""'],
  },
  {
    title: '7번 줄 출력',
    explanation: 'console.log가 결과 메모 없음을 출력합니다.',
    line: at(7),
    state: state(nullishBindings),
    output: ['10 0', '"제목 없음" ""', '메모 없음'],
  },
]

// --- 시나리오 4: ?. 체인 (optional-chaining) ----------------------------------------------------

const user = bind('user', 'const', objv('{ profile: {…} }'))
const guest = bind('guest', 'const', nul())
const profileObj = objv('{ age: 30 }')

const optionalChainingSteps: Step<EvalState>[] = [
  intro,
  {
    title: 'user와 guest를 선언',
    explanation:
      '1~2번 줄이 실행되어 user는 profile 프로퍼티를 가진 객체가 되고, guest는 null이 됩니다. user의 값은 내용을 줄여 { profile: {…} }로 표시합니다.',
    line: { from: 1, to: 2 },
    state: state([changed(user), changed(guest)]),
    output: [],
  },
  {
    title: 'user?.profile.age의 user 판정',
    explanation:
      '4번 줄의 user?.profile.age를 평가합니다. 먼저 ?. 바로 왼쪽의 user를 평가하면 null도 undefined도 아닙니다. 그러면 ?.는 체인의 나머지를 계속 평가합니다.',
    line: at(4),
    state: state(
      [user, guest],
      evaluation('user?.profile.age', '?.', [
        evaluated('user', objv('{ profile: {…} }'), 'not-nullish'),
        pending('?.profile'),
        pending('.age'),
      ]),
    ),
    output: [],
  },
  {
    title: '?.profile과 .age의 평가',
    explanation:
      '?.profile을 평가하면 { age: 30 }이 나오고, 이어서 .age를 평가하면 30입니다. 체인 끝까지 평가한 값 30이 식의 결과입니다.',
    line: at(4),
    state: state(
      [user, guest],
      evaluation(
        'user?.profile.age',
        '?.',
        [
          evaluated('user', objv('{ profile: {…} }'), 'not-nullish'),
          evaluated('?.profile', profileObj),
          evaluated('.age', num(30)),
        ],
        num(30),
      ),
    ),
    output: [],
  },
  {
    title: '4번 줄 출력',
    explanation: 'console.log가 결과 30을 출력합니다.',
    line: at(4),
    state: state([user, guest]),
    output: ['30'],
  },
  {
    title: 'guest?.profile.age의 평가',
    explanation:
      '5번 줄입니다. ?. 바로 왼쪽의 guest가 null이므로 ?.는 체인의 나머지 ?.profile과 .age를 평가하지 않고, 식의 결과는 undefined입니다. 왼쪽 값 null이 결과가 되는 것이 아닙니다. ?.가 없었다면 null에서 프로퍼티를 읽으려 해서 TypeError가 발생합니다.',
    line: at(5),
    state: state(
      [user, guest],
      evaluation(
        'guest?.profile.age',
        '?.',
        [evaluated('guest', nul(), 'nullish'), skipped('?.profile'), skipped('.age')],
        undef(),
      ),
    ),
    output: ['30'],
  },
  {
    title: '5번 줄 출력',
    explanation: 'console.log가 결과 undefined를 출력합니다.',
    line: at(5),
    state: state([user, guest]),
    output: ['30', 'undefined'],
  },
  {
    title: 'guest?.profile.age의 평가(??의 왼쪽)',
    explanation:
      '6번 줄은 ?. 체인과 ??가 이어진 식입니다. 먼저 guest?.profile.age를 평가하면 앞 단계와 같이 guest가 null이라 나머지를 평가하지 않고 undefined가 됩니다. 이 결과를 다음 단계에서 ??가 사용합니다.',
    line: at(6),
    state: state(
      [user, guest],
      evaluation(
        'guest?.profile.age',
        '?.',
        [evaluated('guest', nul(), 'nullish'), skipped('?.profile'), skipped('.age')],
        undef(),
      ),
    ),
    output: ['30', 'undefined'],
  },
  {
    title: "??가 '나이 정보 없음'을 고름",
    explanation:
      "??의 왼쪽은 방금 구한 undefined입니다. ??는 왼쪽이 null 또는 undefined이면 오른쪽을 평가하므로 '나이 정보 없음'을 평가하고, 이 값이 식의 결과입니다.",
    line: at(6),
    state: state(
      [user, guest],
      evaluation(
        "guest?.profile.age ?? '나이 정보 없음'",
        '??',
        [
          evaluated('guest?.profile.age', undef(), 'nullish'),
          evaluated("'나이 정보 없음'", str('나이 정보 없음')),
        ],
        str('나이 정보 없음'),
      ),
    ),
    output: ['30', 'undefined'],
  },
  {
    title: '6번 줄 출력',
    explanation: 'console.log가 결과 나이 정보 없음을 출력합니다.',
    line: at(6),
    state: state([user, guest]),
    output: ['30', 'undefined', '나이 정보 없음'],
  },
]

export const scenarios: Scenario<EvalState>[] = [
  {
    id: 'logical-result',
    label: '값을 돌려줌',
    exampleId: 'logical-result',
    code: logicalResultCode,
    steps: logicalResultSteps,
  },
  {
    id: 'skip-right',
    label: '오른쪽 건너뛰기',
    exampleId: 'skip-right',
    code: skipRightCode,
    steps: skipRightSteps,
  },
  {
    id: 'nullish',
    label: '?? 와 ||',
    exampleId: 'nullish',
    code: nullishCode,
    steps: nullishSteps,
  },
  {
    id: 'optional-chaining',
    label: '?. 체인',
    exampleId: 'optional-chaining',
    code: optionalChainingCode,
    steps: optionalChainingSteps,
  },
]
