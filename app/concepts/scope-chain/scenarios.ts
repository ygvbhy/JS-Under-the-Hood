import type { LineRange, Scenario, Step } from '~/simulator/types'
import lexicalScopeCode from './examples/lexical-scope.js?raw'
import scopeChainCode from './examples/scope-chain.js?raw'
import shadowHoistingCode from './examples/shadow-hoisting.js?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// scopes는 지금 화면에 있는 스코프(전역 + 실행 중인 함수의 스코프)를 생긴 순서대로 담고,
// 스코프마다 바깥 스코프(outerId)가 함수를 "정의한 곳"으로 정해진 채 들어 있다.
// currentId는 지금 코드가 실행되는 스코프, lookup은 그 단계에서 이름을 찾는 경로다.
// `changed`는 "그 단계에서" 새로 생기거나 값이 바뀐 이름에만 붙이고, 다음 단계에서는 해제한다.

export type Val =
  | { type: 'string' | 'number' | 'undefined'; display: string } // 문자열은 작은따옴표 포함: "'서울'"
  | { type: 'function'; display: string } // 예: 'function outer() { … }'
export type Binding = { name: string; value: Val; changed?: 'created' | 'updated' }
export type Scope = { id: string; label: string; outerId: string | null; bindings: Binding[] }
export type Lookup = {
  name: string
  purpose: 'read' | 'assign'
  path: { scopeId: string; found: boolean }[] // 지금 스코프부터 바깥으로, 처음 찾은 곳에서 끝남
}
export type ScopeState = { scopes: Scope[]; currentId: string | null; lookup: Lookup | null }

// --- 작성용 헬퍼 -------------------------------------------------------------------------------

const str = (s: string): Val => ({ type: 'string', display: `'${s}'` })
const num = (n: number): Val => ({ type: 'number', display: String(n) })
const undef: Val = { type: 'undefined', display: 'undefined' }
const fn = (name: string): Val => ({ type: 'function', display: `function ${name}() { … }` })

const b = (name: string, value: Val, changed?: Binding['changed']): Binding => ({
  name,
  value,
  ...(changed && { changed }),
})

const sc = (id: string, outerId: string | null, ...bindings: Binding[]): Scope => ({
  id,
  label: id === 'global' ? '전역 스코프' : `${id} 함수 스코프`,
  outerId,
  bindings,
})

const st = (currentId: string, lookup: Lookup | null, ...scopes: Scope[]): ScopeState => ({
  scopes,
  currentId,
  lookup,
})

const look = (
  name: string,
  purpose: Lookup['purpose'],
  ...path: [scopeId: string, found: boolean][]
): Lookup => ({ name, purpose, path: path.map(([scopeId, found]) => ({ scopeId, found })) })

const at = (n: number): LineRange => ({ from: n, to: n })
const lines = (from: number, to: number): LineRange => ({ from, to })

type ScopeStep = Step<ScopeState>

const before: ScopeState = { scopes: [], currentId: null, lookup: null }

const intro =
  '코드를 실행하기 전입니다. 이 시각화는 스코프(이름을 찾을 수 있는 범위)와 그 안의 이름, 그리고 이름을 만났을 때 찾는 순서를 보여 줍니다.'
const globalDeclare = (names: string) =>
  `스크립트를 실행하기 전에 전역 코드의 선언을 처리해 전역 스코프에 ${names} 이름을 만듭니다. 선언 처리의 세부 규칙은 호이스팅 개념에서 다뤘으므로 여기서는 결과만 보여 줍니다.`

// --- 시나리오 1: 스코프 체인 ---------------------------------------------------------------------

const outerFn = fn('outer')
const innerFn = fn('inner')

const g1 = (city: Binding, outerChanged?: Binding['changed']) =>
  sc('global', null, b('outer', outerFn, outerChanged), city)
const o1 = (area: Binding, innerChanged?: Binding['changed']) =>
  sc('outer', 'global', b('inner', innerFn, innerChanged), area)
const i1 = (street: Binding) => sc('inner', 'outer', street)

const city1 = b('city', str('서울'))
const area1 = b('area', str('마포'))
const street1 = b('street', str('합정'))

const scopeChainSteps: ScopeStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation: globalDeclare('outer와 city'),
    state: st('global', null, g1(b('city', undef, 'created'), 'created')),
    output: [],
  },
  {
    title: "city에 '서울' 대입",
    explanation:
      "1번 줄은 city에 '서울'을 대입합니다. 대입할 city를 지금 스코프인 전역 스코프에서 찾고, 거기에 있으므로 값을 '서울'로 바꿉니다.",
    line: at(1),
    state: st(
      'global',
      look('city', 'assign', ['global', true]),
      g1(b('city', str('서울'), 'updated')),
    ),
    output: [],
  },
  {
    title: 'outer 이름 찾기',
    explanation:
      '14번 줄에서 outer를 호출하려면 먼저 outer라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(14),
    state: st('global', look('outer', 'read', ['global', true]), g1(city1)),
    output: [],
  },
  {
    title: '호출 시작: outer',
    explanation:
      'outer 호출 시작입니다. outer 함수 스코프가 만들어지고, 바깥 스코프는 outer를 정의한 곳의 스코프인 전역 스코프입니다. 본문을 실행하기 전에 함수 안의 선언을 처리해 inner는 함수로, area는 undefined로 만듭니다.',
    line: lines(3, 12),
    state: st('outer', null, g1(city1), o1(b('area', undef, 'created'), 'created')),
    output: [],
  },
  {
    title: "area에 '마포' 대입",
    explanation:
      "4번 줄은 area에 '마포'를 대입합니다. 지금 스코프인 outer 함수 스코프에서 area를 찾고, 거기에 있으므로 값을 '마포'로 바꿉니다.",
    line: at(4),
    state: st(
      'outer',
      look('area', 'assign', ['outer', true]),
      g1(city1),
      o1(b('area', str('마포'), 'updated')),
    ),
    output: [],
  },
  {
    title: 'inner 이름 찾기',
    explanation:
      '11번 줄에서 inner를 호출하려면 먼저 inner라는 이름을 찾습니다. 지금 스코프인 outer 함수 스코프에 있으므로 거기서 멈춥니다.',
    line: at(11),
    state: st('outer', look('inner', 'read', ['outer', true]), g1(city1), o1(area1)),
    output: [],
  },
  {
    title: '호출 시작: inner',
    explanation:
      'inner 호출 시작입니다. inner 함수 스코프가 만들어지고, 바깥 스코프는 inner를 정의한 곳의 스코프인 outer 함수 스코프입니다. 본문을 실행하기 전에 street를 undefined로 만듭니다.',
    line: lines(6, 9),
    state: st('inner', null, g1(city1), o1(area1), i1(b('street', undef, 'created'))),
    output: [],
  },
  {
    title: "street에 '합정' 대입",
    explanation:
      "7번 줄은 street에 '합정'을 대입합니다. 지금 스코프인 inner 함수 스코프에서 street를 찾고, 거기에 있으므로 값을 '합정'으로 바꿉니다.",
    line: at(7),
    state: st(
      'inner',
      look('street', 'assign', ['inner', true]),
      g1(city1),
      o1(area1),
      i1(b('street', str('합정'), 'updated')),
    ),
    output: [],
  },
  {
    title: 'street 읽기',
    explanation:
      '8번 줄은 street, area, city를 차례로 읽습니다. street는 지금 스코프인 inner 함수 스코프에 있으므로 바깥 스코프까지 올라가지 않습니다.',
    line: at(8),
    state: st('inner', look('street', 'read', ['inner', true]), g1(city1), o1(area1), i1(street1)),
    output: [],
  },
  {
    title: 'area 읽기',
    explanation:
      "inner 함수 스코프에는 area가 없으므로 바깥 스코프인 outer 함수 스코프에서 찾습니다. 거기에 있으므로 거기서 멈추고 값 '마포'를 읽습니다.",
    line: at(8),
    state: st(
      'inner',
      look('area', 'read', ['inner', false], ['outer', true]),
      g1(city1),
      o1(area1),
      i1(street1),
    ),
    output: [],
  },
  {
    title: 'city 읽기',
    explanation:
      "inner 함수 스코프와 outer 함수 스코프에 city가 없어서 바깥 스코프를 따라 전역 스코프까지 올라가 찾습니다. 세 값을 이어 붙여 console.log에 넘기므로 '합정 마포 서울'이 출력됩니다.",
    line: at(8),
    state: st(
      'inner',
      look('city', 'read', ['inner', false], ['outer', false], ['global', true]),
      g1(city1),
      o1(area1),
      i1(street1),
    ),
    output: ['합정 마포 서울'],
  },
  {
    title: 'inner 함수 끝',
    explanation:
      'inner 함수의 본문을 모두 실행해 함수가 끝났습니다. 이 시각화는 끝난 함수의 스코프를 화면에서 뺍니다. 실행은 inner를 호출했던 outer 함수 스코프로 돌아갑니다.',
    line: at(9),
    state: st('outer', null, g1(city1), o1(area1)),
    output: ['합정 마포 서울'],
  },
  {
    title: 'outer 함수 끝',
    explanation:
      'outer 함수의 본문을 모두 실행해 함수가 끝났습니다. 이 시각화는 끝난 함수의 스코프를 화면에서 빼고, 실행은 전역 스코프로 돌아갑니다.',
    line: at(12),
    state: st('global', null, g1(city1)),
    output: ['합정 마포 서울'],
  },
  {
    title: 'typeof area 읽기',
    explanation:
      "15번 줄은 전역 스코프에서 area를 찾습니다. 전역 스코프에서 시작하면 바깥 방향으로만 찾으므로 outer 안의 area는 찾지 못하고, typeof는 찾지 못한 이름에 대해 오류 없이 'undefined'를 돌려줍니다.",
    line: at(15),
    state: st('global', look('area', 'read', ['global', false]), g1(city1)),
    output: ['합정 마포 서울', 'undefined'],
  },
]

// --- 시나리오 2: 렉시컬 스코프 -------------------------------------------------------------------

const showFn = fn('show')
const runFn = fn('run')

const g2 = (level: Binding) => sc('global', null, b('show', showFn), b('run', runFn), level)
const gDeclared2 = (level: Binding) =>
  sc('global', null, b('show', showFn, 'created'), b('run', runFn, 'created'), level)
const r2 = (level: Binding) => sc('run', 'global', level)
const s2 = () => sc('show', 'global')

const level1 = b('level', str('전역'))
const runLevel1 = b('level', str('run 안'))

const lexicalScopeSteps: ScopeStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation: globalDeclare('show, run, level'),
    state: st('global', null, gDeclared2(b('level', undef, 'created'))),
    output: [],
  },
  {
    title: "level에 '전역' 대입",
    explanation:
      "1번 줄은 level에 '전역'을 대입합니다. 지금 스코프인 전역 스코프에서 level을 찾고, 거기에 있으므로 값을 '전역'으로 바꿉니다.",
    line: at(1),
    state: st(
      'global',
      look('level', 'assign', ['global', true]),
      g2(b('level', str('전역'), 'updated')),
    ),
    output: [],
  },
  {
    title: 'run 이름 찾기',
    explanation:
      '12번 줄에서 run을 호출하려면 먼저 run이라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(12),
    state: st('global', look('run', 'read', ['global', true]), g2(level1)),
    output: [],
  },
  {
    title: '호출 시작: run',
    explanation:
      'run 호출 시작입니다. run 함수 스코프가 만들어지고, 바깥 스코프는 run을 정의한 곳의 스코프인 전역 스코프입니다. 본문을 실행하기 전에 run 안의 var level을 undefined로 만들어, 전역의 level과 같은 이름이 안쪽에도 생깁니다.',
    line: lines(7, 10),
    state: st('run', null, g2(level1), r2(b('level', undef, 'created'))),
    output: [],
  },
  {
    title: "level에 'run 안' 대입",
    explanation:
      "8번 줄은 level에 'run 안'을 대입합니다. 지금 스코프인 run 함수 스코프에서 level을 찾고, 거기에 있으므로 이 값을 바꿉니다. 전역의 level은 그대로입니다.",
    line: at(8),
    state: st(
      'run',
      look('level', 'assign', ['run', true]),
      g2(level1),
      r2(b('level', str('run 안'), 'updated')),
    ),
    output: [],
  },
  {
    title: 'show 이름 찾기',
    explanation:
      '9번 줄에서 show를 호출하려면 먼저 show라는 이름을 찾습니다. run 함수 스코프에는 show가 없으므로 바깥 스코프인 전역 스코프에서 찾습니다.',
    line: at(9),
    state: st(
      'run',
      look('show', 'read', ['run', false], ['global', true]),
      g2(level1),
      r2(runLevel1),
    ),
    output: [],
  },
  {
    title: '호출 시작: show',
    explanation:
      'show 호출 시작입니다. show는 전역 코드에서 정의되었으므로 바깥 스코프는 전역 스코프입니다. run 안에서 호출했다는 사실은 바깥 스코프에 영향을 주지 않습니다.',
    line: lines(3, 5),
    state: st('show', null, g2(level1), r2(runLevel1), s2()),
    output: [],
  },
  {
    title: 'level 읽기',
    explanation:
      "4번 줄은 level을 읽습니다. show 함수 스코프에는 level이 없으므로 바깥 스코프인 전역 스코프에서 찾아 '전역'을 읽습니다. run 함수 스코프는 지금 있지만 show의 바깥 스코프가 아니므로 찾지 않습니다.",
    line: at(4),
    state: st(
      'show',
      look('level', 'read', ['show', false], ['global', true]),
      g2(level1),
      r2(runLevel1),
      s2(),
    ),
    output: ['전역'],
  },
  {
    title: 'show 함수 끝',
    explanation:
      'show 함수의 본문을 모두 실행해 함수가 끝났습니다. 이 시각화는 끝난 함수의 스코프를 화면에서 빼고, 실행은 show를 호출했던 run 함수 스코프로 돌아갑니다.',
    line: at(5),
    state: st('run', null, g2(level1), r2(runLevel1)),
    output: ['전역'],
  },
  {
    title: 'run 함수 끝',
    explanation:
      'run 함수의 본문을 모두 실행해 함수가 끝났습니다. 이 시각화는 끝난 함수의 스코프를 화면에서 빼고, 실행은 전역 스코프로 돌아갑니다.',
    line: at(10),
    state: st('global', null, g2(level1)),
    output: ['전역'],
  },
]

// --- 시나리오 3: 가려진 이름과 선언 처리 ---------------------------------------------------------

const reportFn = fn('report')

const g3 = (total: Binding, reportChanged?: Binding['changed']) =>
  sc('global', null, b('report', reportFn, reportChanged), total)
const p3 = (total: Binding) => sc('report', 'global', total)

const total10 = b('total', num(10))

const shadowHoistingSteps: ScopeStep[] = [
  { title: '실행 전', explanation: intro, state: before, output: [] },
  {
    title: '전역 선언 처리',
    explanation: globalDeclare('report와 total'),
    state: st('global', null, g3(b('total', undef, 'created'), 'created')),
    output: [],
  },
  {
    title: 'total에 10 대입',
    explanation:
      '1번 줄은 total에 10을 대입합니다. 지금 스코프인 전역 스코프에서 total을 찾고, 거기에 있으므로 값을 10으로 바꿉니다.',
    line: at(1),
    state: st(
      'global',
      look('total', 'assign', ['global', true]),
      g3(b('total', num(10), 'updated')),
    ),
    output: [],
  },
  {
    title: 'report 이름 찾기',
    explanation:
      '9번 줄에서 report를 호출하려면 먼저 report라는 이름을 찾습니다. 지금 스코프인 전역 스코프에 있으므로 거기서 멈춥니다.',
    line: at(9),
    state: st('global', look('report', 'read', ['global', true]), g3(total10)),
    output: [],
  },
  {
    title: '호출 시작: report',
    explanation:
      'report 호출 시작입니다. report 함수 스코프가 만들어지고, 바깥 스코프는 전역 스코프입니다. 본문을 실행하기 전에 함수 안의 var total을 처리해 undefined로 만듭니다.',
    line: lines(3, 7),
    state: st('report', null, g3(total10), p3(b('total', undef, 'created'))),
    output: [],
  },
  {
    title: 'total 읽기 (첫 번째)',
    explanation:
      '4번 줄은 total을 읽습니다. 지금 스코프인 report 함수 스코프에 total이 이미 있으므로 거기서 멈추고 undefined를 읽습니다. 바깥 스코프의 total(10)은 가려져 찾지 않습니다.',
    line: at(4),
    state: st(
      'report',
      look('total', 'read', ['report', true]),
      g3(total10),
      p3(b('total', undef)),
    ),
    output: ['undefined'],
  },
  {
    title: 'total에 20 대입',
    explanation:
      '5번 줄은 total에 20을 대입합니다. total을 report 함수 스코프에서 찾고, 거기에 있으므로 이 값을 바꿉니다. 전역의 total은 그대로 10입니다.',
    line: at(5),
    state: st(
      'report',
      look('total', 'assign', ['report', true]),
      g3(total10),
      p3(b('total', num(20), 'updated')),
    ),
    output: ['undefined'],
  },
  {
    title: 'total 읽기 (두 번째)',
    explanation:
      '6번 줄은 total을 읽습니다. report 함수 스코프의 total이 이제 20이므로 20이 출력됩니다.',
    line: at(6),
    state: st(
      'report',
      look('total', 'read', ['report', true]),
      g3(total10),
      p3(b('total', num(20))),
    ),
    output: ['undefined', '20'],
  },
  {
    title: 'report 함수 끝',
    explanation:
      'report 함수의 본문을 모두 실행해 함수가 끝났습니다. 이 시각화는 끝난 함수의 스코프를 화면에서 빼고, 실행은 전역 스코프로 돌아갑니다.',
    line: at(7),
    state: st('global', null, g3(total10)),
    output: ['undefined', '20'],
  },
  {
    title: '전역 total 읽기',
    explanation:
      '10번 줄은 전역 스코프에서 total을 찾습니다. 전역 스코프에 있으므로 값 10을 읽습니다. report 안의 대입은 report 함수 스코프의 total만 바꿨습니다.',
    line: at(10),
    state: st('global', look('total', 'read', ['global', true]), g3(total10)),
    output: ['undefined', '20', '10'],
  },
]

// --- 시나리오 목록 -------------------------------------------------------------------------------

export const scenarios: Scenario<ScopeState>[] = [
  {
    id: 'scope-chain',
    label: '스코프 체인',
    exampleId: 'scope-chain',
    code: scopeChainCode,
    steps: scopeChainSteps,
  },
  {
    id: 'lexical-scope',
    label: '렉시컬 스코프',
    exampleId: 'lexical-scope',
    code: lexicalScopeCode,
    steps: lexicalScopeSteps,
  },
  {
    id: 'shadow-hoisting',
    label: '가려진 이름과 선언 처리',
    exampleId: 'shadow-hoisting',
    code: shadowHoistingCode,
    steps: shadowHoistingSteps,
  },
]
