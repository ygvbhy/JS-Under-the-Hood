import type { Scenario, Step } from '~/simulator/types'
import styleAttributeCode from './examples/style-attribute.html?raw'
import tokenSetCode from './examples/token-set.html?raw'

// 이 개념의 시각화 상태 모델. 단계마다 전체 스냅샷을 담는다(이전 단계와의 차분 아님).
// - attributes: 요소의 class·style 어트리뷰트 값 문자열. 어트리뷰트가 없으면 null(빈 문자열과 다르다)
// - tokens: classList의 토큰 집합(순서 있음). 이 시나리오에서 쓰지 않으면 null
// - declarations: style의 선언 목록(순서 있음). 이 시나리오에서 쓰지 않으면 null

export type Declaration = { property: string; value: string }

export type AttributeObjectState = {
  attributes: { class: string | null; style: string | null }
  tokens: string[] | null
  declarations: Declaration[] | null
}

type AStep = Step<AttributeObjectState>

const at = (n: number) => ({ from: n, to: n })

const decl = (property: string, value: string): Declaration => ({ property, value })

// --- 시나리오 1: style과 style 어트리뷰트 (style-attribute.html) --------------------------------

const styleState = (style: string | null, declarations: Declaration[]): AttributeObjectState => ({
  attributes: { class: null, style },
  tokens: null,
  declarations,
})

const ORIGINAL = 'font-size:20px'
const WRITTEN = 'font-size: 20px; color: blue;'
const REPLACED = 'margin-top: 4px'

const FONT = [decl('font-size', '20px')]
const FONT_BLUE = [decl('font-size', '20px'), decl('color', 'blue')]
const MARGIN = [decl('margin-top', '4px')]

const OUT_1 = 'font-size:20px 1'
const OUT_2 = 'font-size: 20px; color: blue; 2'
const OUT_3 = '"" 4px 1'
const OUT_4 = '"" 0'

const styleSteps: AStep[] = [
  {
    title: '실행 전',
    explanation:
      '요소에는 style 어트리뷰트 font-size:20px이 적혀 있습니다. 오른쪽 선언 목록은 이 어트리뷰트를 파싱한 결과입니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
    state: styleState(ORIGINAL, FONT),
    output: [],
  },
  {
    title: 'box를 얻음',
    explanation:
      'getElementById로 요소를 얻었습니다. 아직 어트리뷰트도 선언 목록도 바뀌지 않았습니다.',
    line: at(9),
    state: styleState(ORIGINAL, FONT),
    output: [],
  },
  {
    title: "getAttribute('style'), style.length를 출력",
    explanation:
      '어트리뷰트 값은 HTML에 적은 문자열 그대로 font-size:20px이고, style.length는 선언 목록의 길이 1입니다.',
    line: at(10),
    state: styleState(ORIGINAL, FONT),
    output: [OUT_1],
  },
  {
    title: "box.style.color = 'blue'",
    explanation:
      '선언 목록에 color: blue가 더해집니다. 선언이 바뀌었으므로 표준의 update style attribute 단계가 style 어트리뷰트를 선언 블록을 직렬화한 문자열로 다시 씁니다. 그래서 어트리뷰트가 HTML에 적은 원문 뒤에 덧붙은 것이 아니라 font-size: 20px; color: blue; 형태로 바뀝니다.',
    line: at(11),
    state: styleState(WRITTEN, FONT_BLUE),
    output: [OUT_1],
  },
  {
    title: "getAttribute('style'), style.length를 출력",
    explanation: '다시 쓰인 어트리뷰트 문자열과 선언의 개수 2가 출력됩니다.',
    line: at(12),
    state: styleState(WRITTEN, FONT_BLUE),
    output: [OUT_1, OUT_2],
  },
  {
    title: "box.setAttribute('style', 'margin-top: 4px')",
    explanation:
      'style 어트리뷰트가 바뀌었으므로 선언 목록을 새 어트리뷰트 값을 파싱한 결과로 바꿉니다. font-size와 color 선언은 사라지고 margin-top 하나만 남습니다.',
    line: at(13),
    state: styleState(REPLACED, MARGIN),
    output: [OUT_1, OUT_2],
  },
  {
    title: 'style.color, style.marginTop, style.length를 출력',
    explanation: 'color 선언이 없어 빈 문자열이고, marginTop은 4px, 선언은 1개입니다.',
    line: at(14),
    state: styleState(REPLACED, MARGIN),
    output: [OUT_1, OUT_2, OUT_3],
  },
  {
    title: "box.removeAttribute('style')",
    explanation:
      '어트리뷰트가 없어지면 선언 목록을 비웁니다. 어트리뷰트가 없는 것(없음)은 빈 문자열 값과 다릅니다.',
    line: at(15),
    state: styleState(null, []),
    output: [OUT_1, OUT_2, OUT_3],
  },
  {
    title: 'style.marginTop, style.length를 출력',
    explanation: '선언이 하나도 없으므로 marginTop은 빈 문자열이고 length는 0입니다.',
    line: at(16),
    state: styleState(null, []),
    output: [OUT_1, OUT_2, OUT_3, OUT_4],
  },
]

// --- 시나리오 2: classList와 class 어트리뷰트 (token-set.html) ---------------------------------

const classState = (cls: string | null, tokens: string[]): AttributeObjectState => ({
  attributes: { class: cls, style: null },
  tokens,
  declarations: null,
})

const C0 = 'a b a'
const C_AB = 'a b'
const C_A = 'a'

const T_AB = ['a', 'b']
const T_A = ['a']

const O1 = '2 a b a'
const O2 = '2 a b'
const O3 = 'false a'
const O4 = 'true a b'
const O5 = 'InvalidCharacterError false a b'
const O6 = 'true ""'

const tokenSteps: AStep[] = [
  {
    title: '실행 전',
    explanation:
      '요소의 class 어트리뷰트는 a b a입니다. 오른쪽 토큰 집합은 이 값을 ASCII 공백으로 나눈 결과로, 중복은 한 번만 남아 a와 b 두 개입니다. 다음 단계를 누르면 한 줄씩 실행됩니다.',
    state: classState(C0, T_AB),
    output: [],
  },
  {
    title: 'tag를 얻음',
    explanation: 'getElementById로 요소를 얻었습니다. 어트리뷰트는 아직 그대로입니다.',
    line: at(9),
    state: classState(C0, T_AB),
    output: [],
  },
  {
    title: 'list = tag.classList',
    explanation:
      'classList는 이 요소의 class 어트리뷰트에 대한 토큰 집합을 가진 객체를 돌려줍니다. 어트리뷰트는 바뀌지 않습니다.',
    line: at(10),
    state: classState(C0, T_AB),
    output: [],
  },
  {
    title: 'list.length, tag.className을 출력',
    explanation:
      '집합의 길이는 중복이 빠진 2이고, className은 어트리뷰트 원문 a b a 그대로입니다. 집합은 어트리뷰트를 파싱한 결과이지 어트리뷰트 자체가 아닙니다.',
    line: at(11),
    state: classState(C0, T_AB),
    output: [O1],
  },
  {
    title: "list.add('a')",
    explanation:
      '이미 있는 토큰이라 집합은 그대로입니다. 그래도 add는 집합이 바뀌었는지와 관계없이 어트리뷰트를 집합을 직렬화한 문자열로 다시 쓰는 단계를 실행하므로, 어트리뷰트에서 중복이 정리됩니다.',
    line: at(12),
    state: classState(C_AB, T_AB),
    output: [O1],
  },
  {
    title: 'list.length, tag.className을 출력',
    explanation: '집합은 그대로 2개이고, className이 a b로 정리되었습니다.',
    line: at(13),
    state: classState(C_AB, T_AB),
    output: [O1, O2],
  },
  {
    title: "list.toggle('b')를 출력",
    explanation:
      'b가 집합에 있으므로 제거하고 false를 돌려줍니다. 어트리뷰트는 남은 토큰 a로 다시 쓰입니다. 한 줄이 변경과 출력을 함께 합니다.',
    line: at(14),
    state: classState(C_A, T_A),
    output: [O1, O2, O3],
  },
  {
    title: "list.toggle('b')를 다시 출력",
    explanation:
      'b가 집합에 없으므로 추가하고 true를 돌려줍니다. 어트리뷰트는 a b로 다시 쓰입니다.',
    line: at(15),
    state: classState(C_AB, T_AB),
    output: [O1, O2, O3, O4],
  },
  {
    title: "list.add('c', 'd e')가 예외를 던짐",
    explanation:
      "토큰 'd e'에는 ASCII 공백이 있어 InvalidCharacterError입니다. 표준은 집합을 바꾸기 전에 모든 토큰을 먼저 검사하므로, 앞의 c도 추가되지 않고 집합과 어트리뷰트가 그대로입니다.",
    line: at(17),
    state: classState(C_AB, T_AB),
    output: [O1, O2, O3, O4],
  },
  {
    title: 'catch에서 e.name, contains, className을 출력',
    explanation:
      '예외 이름은 InvalidCharacterError이고, 집합에 c가 없어 contains는 false이며, className은 a b 그대로입니다.',
    line: at(19),
    state: classState(C_AB, T_AB),
    output: [O1, O2, O3, O4, O5],
  },
  {
    title: "list.remove('a', 'b')",
    explanation:
      '두 토큰을 모두 제거해 집합이 비었습니다. 이 요소에는 class 어트리뷰트가 있으므로 어트리뷰트는 비어 있는 집합의 직렬화인 빈 문자열로 다시 쓰입니다. 어트리뷰트가 없어지는 것이 아닙니다.',
    line: at(21),
    state: classState('', []),
    output: [O1, O2, O3, O4, O5],
  },
  {
    title: "hasAttribute('class'), getAttribute('class')를 출력",
    explanation: '어트리뷰트는 남아 있고(true) 값은 빈 문자열입니다.',
    line: at(22),
    state: classState('', []),
    output: [O1, O2, O3, O4, O5, O6],
  },
]

export const scenarios: Scenario<AttributeObjectState>[] = [
  {
    id: 'style-attribute',
    label: '예제 2: style과 style 어트리뷰트',
    exampleId: 'style-attribute',
    code: styleAttributeCode,
    steps: styleSteps,
  },
  {
    id: 'token-set',
    label: '예제 5: classList와 class 어트리뷰트',
    exampleId: 'token-set',
    code: tokenSetCode,
    steps: tokenSteps,
  },
]
