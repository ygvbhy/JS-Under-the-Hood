import type { LineRange, Scenario, Step } from '~/simulator/types'
import fieldOverflowCode from './examples/field-overflow.js?raw'
import monthOverflowCode from './examples/month-overflow.js?raw'

// 이 개념의 시각화 상태 모델. 로컬 시각을 가리키는 코드가 만드는 시각 값(밀리초 숫자)은 실행 시간대마다 달라 그리지 않고, 로컬 시간대로 풀어 읽은 연·월·일만 그린다.
// 시나리오는 숫자·문자열 리터럴만 담는다(렌더 중 Date를 부르면 빌드 기계와 독자의 시간대가 달라 하이드레이션이 어긋난다).
// 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - Fields.month는 Date가 세는 0부터의 월이다(0 = 1월). 뷰가 "1 (2월)"처럼 사람이 읽는 월을 함께 쓴다.
// - dates: 지금 변수가 가리키는 Date의 로컬 필드(생긴 순서). 아직 변수에 담기지 않은 Date는 없다.
// - calc: MakeDay가 연·월·일을 다시 계산하는 과정. 계산 중이 아니면 null이다.
//   balancedYear = year + floor(month / 12), balancedMonth = month modulo 12(0~11).
//   firstOfMonth는 (balancedYear, balancedMonth)의 1일, addDays = day - 1, result = firstOfMonth + addDays일.
//   로컬 필드와 UTC 시각 값을 오가는 변환은 한 칸으로 줄여 그리지 않는다.

export type Fields = { year: number; month: number; day: number }

export type DateEntry = { name: string; fields: Fields }

export type DateCalc = {
  label: string
  input: Fields
  balancedYear: number
  balancedMonth: number
  firstOfMonth: Fields
  addDays: number
  result: Fields
}

export type DateFieldsState = {
  dates: DateEntry[]
  calc: DateCalc | null
}

const f = (year: number, month: number, day: number): Fields => ({ year, month, day })

const calc = (
  label: string,
  input: Fields,
  balancedYear: number,
  balancedMonth: number,
  addDays: number,
  result: Fields,
): DateCalc => ({
  label,
  input,
  balancedYear,
  balancedMonth,
  firstOfMonth: f(balancedYear, balancedMonth, 1),
  addDays,
  result,
})

const st = (dates: DateEntry[], c: DateCalc | null = null): DateFieldsState => ({
  dates,
  calc: c,
})

const at = (n: number): LineRange => ({ from: n, to: n })

type S = Step<DateFieldsState>
const step = (
  title: string,
  explanation: string,
  line: LineRange | undefined,
  state: DateFieldsState,
  output: string[] = [],
): S => ({ title, explanation, ...(line && { line }), state, output })

const introText =
  '코드를 실행하기 전입니다. 이 시각화는 변수가 가리키는 Date의 로컬 시간대 기준 연·월·일과, 연·월·일을 다시 계산하는 MakeDay의 단계를 보여 줍니다. 월은 Date가 세는 대로 0부터이고, 괄호 안이 사람이 읽는 월입니다. 생성자(2026, 0, 31)처럼 로컬 자정을 가리키는 코드는 실행 시간대마다 다른 시각 값을 만들므로, 시각 값은 고정된 숫자로 그리지 않습니다.'
const consoleNote =
  '(console.log는 호스트가 제공하는 출력 API이고, 호출이 만드는 컨텍스트는 그리지 않습니다.)'
const utcNote =
  '(로컬 필드와 UTC 시각 값을 오가는 변환은 한 칸으로 줄였고, 시·분·초는 그리지 않습니다.)'

// --- 시나리오 1: 1월 31일에 setMonth(1) -------------------------------------------------------

const d0131 = [{ name: 'd', fields: f(2026, 0, 31) }]
const d0303 = [{ name: 'd', fields: f(2026, 2, 3) }]

const monthOverflowSteps: S[] = [
  step('실행 전', introText, undefined, st([])),
  step(
    '생성자: MakeDay(2026, 0, 31)',
    `1번째 줄에서 생성자에 (2026, 0, 31)을 넘기면, 인수가 2개 이상이므로 연을 MakeFullYear로 맞춘 뒤(2026은 그대로) 연·월·일을 MakeDay에 넘겨 하루를 정합니다. 월 0은 12로 나눈 몫이 0, 나머지가 0이라 연도는 그대로 2026, 월은 0(1월)입니다. 그 달의 1일에 (31 - 1)일을 더하면 1월 31일이 됩니다. ${utcNote}`,
    at(1),
    st([], calc('MakeDay(2026, 0, 31)', f(2026, 0, 31), 2026, 0, 30, f(2026, 0, 31))),
  ),
  step(
    'd 초기화',
    '계산한 1월 31일이 새 Date의 시각 값이 되고, 변수 d가 그 Date를 가리킵니다.',
    at(1),
    st(d0131),
  ),
  step(
    '출력: 0 31',
    `d.getMonth()는 0, d.getDate()는 31입니다. 월은 1월이 0입니다. ${consoleNote}`,
    at(2),
    st(d0131),
    ['0 31'],
  ),
  step(
    'setMonth: 로컬 필드 읽기',
    `3번째 줄의 d.setMonth(1)은 월만 새로 받습니다. 일을 주지 않았으므로 명세는 현재 시각 값을 로컬 시간대로 풀어 읽은 일(31)을 getDate()를 부른 것처럼 씁니다. 연도 2026도 그 현재 값입니다. 월 1은 2월이지만 일은 31 그대로입니다.`,
    at(3),
    st(d0131),
    ['0 31'],
  ),
  step(
    'MakeDay(2026, 1, 31)',
    `읽은 연 2026, 새 월 1, 일 31을 MakeDay에 넘깁니다. 월 1은 맞춘 뒤에도 2026년 1(2월)입니다. 2월 1일에 (31 - 1) = 30일을 더하면, 2월은 28일까지이므로 2월 말일을 지나 3월 3일이 됩니다. 일 31을 2월의 날수에 맞추거나 3월 1일로 옮기는 규칙은 없고, 계산에 일 31이 그대로 들어갑니다. ${utcNote}`,
    at(3),
    st(d0131, calc('MakeDay(2026, 1, 31)', f(2026, 1, 31), 2026, 1, 30, f(2026, 2, 3))),
    ['0 31'],
  ),
  step(
    '[[DateValue]] 저장',
    'MakeDay가 돌려준 3월 3일을 하루 안의 시각과 합쳐 UTC 시각 값으로 되돌리고, 범위를 확인(TimeClip)한 뒤 d의 [[DateValue]]에 넣습니다. d가 가리키는 Date 자체가 바뀌었으므로 같은 Date를 가리키는 변수는 모두 3월 3일을 봅니다.',
    at(3),
    st(d0303, calc('MakeDay(2026, 1, 31)', f(2026, 1, 31), 2026, 1, 30, f(2026, 2, 3))),
    ['0 31'],
  ),
  step(
    '출력: 2 3',
    `d.getMonth()는 2(3월), d.getDate()는 3입니다. 1월 31일에 setMonth(1)을 하면 일 31이 그대로 MakeDay에 들어가 3월 3일이 됩니다. ${consoleNote}`,
    at(4),
    st(d0303),
    ['0 31', '2 3'],
  ),
]

// --- 시나리오 2: 생성자 인수 넘침 --------------------------------------------------------------

const lastOfFeb = { name: 'lastOfFeb', fields: f(2026, 1, 28) }
const nextYear = { name: 'nextYear', fields: f(2027, 0, 1) }
const back = { name: 'back', fields: f(2025, 11, 30) }

const calcFeb = calc('MakeDay(2026, 2, 0)', f(2026, 2, 0), 2026, 2, -1, f(2026, 1, 28))
const calcYear = calc('MakeDay(2026, 12, 1)', f(2026, 12, 1), 2027, 0, 0, f(2027, 0, 1))
const calcBack = calc('MakeDay(2026, 0, -1)', f(2026, 0, -1), 2026, 0, -2, f(2025, 11, 30))

const fieldOverflowSteps: S[] = [
  step('실행 전', introText, undefined, st([])),
  step(
    '생성자(2026, 2, 0): 일 0',
    `1번째 줄은 3월(월 2)의 0일을 요청합니다. 월은 그대로 2026년 2(3월)이고, 3월 1일에 (0 - 1) = -1일을 더하면 하루 전인 2월 28일입니다. 일이 0이어도 오류가 아니라 앞 달의 말일이 됩니다. ${utcNote}`,
    at(1),
    st([], calcFeb),
  ),
  step(
    'lastOfFeb 초기화',
    '계산한 2월 28일이 새 Date의 시각 값이 되고, 변수 lastOfFeb가 그 Date를 가리킵니다.',
    at(1),
    st([lastOfFeb]),
  ),
  step(
    '출력: 1 28',
    `월 1은 2월입니다. 2026년 2월은 28일까지이고 getDate()는 28입니다. ${consoleNote}`,
    at(2),
    st([lastOfFeb]),
    ['1 28'],
  ),
  step(
    '생성자(2026, 12, 1): 월 12',
    `3번째 줄은 월 12를 줍니다. MakeDay는 연도에 floor(12 / 12) = 1을 더해 2027, 월은 12 modulo 12 = 0으로 맞춥니다. 2027년 1월 1일에 (1 - 1) = 0일을 더하므로 결과는 2027년 1월 1일입니다. ${utcNote}`,
    at(3),
    st([lastOfFeb], calcYear),
    ['1 28'],
  ),
  step(
    'nextYear 초기화',
    '계산한 2027년 1월 1일이 새 Date의 시각 값이 되고, 변수 nextYear가 그 Date를 가리킵니다.',
    at(3),
    st([lastOfFeb, nextYear]),
    ['1 28'],
  ),
  step(
    '출력: 2027 0',
    `getFullYear()는 2027, getMonth()는 0입니다. 월이 12여서 해가 넘어갔습니다. ${consoleNote}`,
    at(4),
    st([lastOfFeb, nextYear]),
    ['1 28', '2027 0'],
  ),
  step(
    '생성자(2026, 0, -1): 일 -1',
    `5번째 줄은 1월(월 0)의 -1일을 요청합니다. 1월 1일에 (-1 - 1) = -2일을 더하면 1월 1일의 이틀 전인 2025년 12월 30일입니다(12월 31일이 하루 전, 12월 30일이 이틀 전). 월 11은 12월입니다. ${utcNote}`,
    at(5),
    st([lastOfFeb, nextYear], calcBack),
    ['1 28', '2027 0'],
  ),
  step(
    'back 초기화',
    '계산한 2025년 12월 30일이 새 Date의 시각 값이 되고, 변수 back이 그 Date를 가리킵니다.',
    at(5),
    st([lastOfFeb, nextYear, back]),
    ['1 28', '2027 0'],
  ),
  step(
    '출력: 2025 11 30',
    `getFullYear()는 2025, getMonth()는 11(12월), getDate()는 30입니다. 일이 음수여도 앞 달과 앞 해로 넘어갑니다. ${consoleNote}`,
    at(6),
    st([lastOfFeb, nextYear, back]),
    ['1 28', '2027 0', '2025 11 30'],
  ),
]

export const scenarios: Scenario<DateFieldsState>[] = [
  {
    id: 'month-overflow',
    label: '1월 31일에 setMonth(1)',
    exampleId: 'month-overflow',
    code: monthOverflowCode,
    steps: monthOverflowSteps,
  },
  {
    id: 'field-overflow',
    label: '생성자 인수 넘침',
    exampleId: 'field-overflow',
    code: fieldOverflowCode,
    steps: fieldOverflowSteps,
  },
]
