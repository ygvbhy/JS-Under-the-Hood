// 본문 "어트리뷰트와 프로퍼티 대응 표"의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 행마다 evidence는 예제 id와 그 예제의 expectedOutput에 이 순서대로(연속하지 않아도 된다) 나타나야 하는 출력 줄을 가리킨다.
// expectedOutput 자체는 tests/examples.test.ts가 실제 Chromium에서 실행해 대조한다.
// 출력으로 직접 보이지 않는 칸은 source에 적은 표준 규칙(HTML·DOM 표준의 반영 규칙 등)에서 가져왔다.
// attribute와 property는 본문에서 <code>로 보이는 코드이고, element는 일반 글이다.
export const columns: { key: string; label: string }[] = [
  { key: 'relation', label: '관계' },
  { key: 'type', label: '프로퍼티 값' },
  { key: 'missing', label: '어트리뷰트가 없을 때' },
]

export const rows: {
  attribute: string
  element: string
  property: string
  cells: [string, string, string]
  source: string
  evidence: { example: string; lines: string[] }[]
}[] = [
  {
    attribute: 'value',
    element: '텍스트 입력',
    property: 'value',
    cells: ['기본값일 뿐 (dirty value flag가 false일 때만 따라간다)', '문자열 (현재 값)', "''"],
    source: 'input의 value 어트리뷰트와 dirty value flag',
    evidence: [
      {
        example: 'value-dirty',
        lines: ['value 대입 ["철수","손님","손님"]', 'setAttribute ["철수","영희","영희"]'],
      },
      { example: 'value-clean', lines: ['removeAttribute ["",null,""]'] },
    ],
  },
  {
    attribute: 'value',
    element: '텍스트 입력',
    property: 'defaultValue',
    cells: ['반영', '문자열', "''"],
    source: 'defaultValue의 반영 규칙',
    evidence: [
      { example: 'value-dirty', lines: ['setAttribute ["철수","영희","영희"]'] },
      {
        example: 'value-clean',
        lines: ['defaultValue 대입 ["민수","민수","민수"]', 'removeAttribute ["",null,""]'],
      },
    ],
  },
  {
    attribute: 'checked',
    element: '체크박스',
    property: 'checked',
    cells: [
      '기본값일 뿐 (dirty checkedness가 false일 때만 따라간다)',
      '불리언 (현재 체크 상태)',
      'false',
    ],
    source: 'input의 checked 어트리뷰트와 dirty checkedness flag',
    evidence: [
      {
        example: 'checked',
        lines: ['checked 대입 false true true', '어트리뷰트 다시 추가 false true true'],
      },
      { example: 'reset', lines: ['손님 false'] },
    ],
  },
  {
    attribute: 'checked',
    element: '체크박스',
    property: 'defaultChecked',
    cells: ['반영 (있으면 true)', '불리언', 'false'],
    source: 'defaultChecked의 반영 규칙',
    evidence: [
      {
        example: 'checked',
        lines: ['처음 true true true', '어트리뷰트 다시 추가 false true true'],
      },
    ],
  },
  {
    attribute: 'value',
    element: '체크박스',
    property: 'value',
    cells: ['어트리뷰트를 직접 읽고 쓴다 (default/on 모드)', '문자열', "'on'"],
    source: 'value IDL 어트리뷰트의 default/on 모드',
    evidence: [{ example: 'checked', lines: ['on null', '동의 동의'] }],
  },
  {
    attribute: 'id',
    element: '모든 요소',
    property: 'id',
    cells: ['반영', '문자열', "''"],
    source: 'Element.id의 반영 규칙',
    evidence: [{ example: 'reflect', lines: ['tag hint nick', 'nick-label'] }],
  },
  {
    attribute: 'class',
    element: '모든 요소',
    property: 'className',
    cells: ['반영', '문자열', "''"],
    source: 'Element.className의 반영 규칙',
    evidence: [
      { example: 'reflect', lines: ['tag hint nick', 'hint error email'] },
      { example: 'missing', lines: ['null false ""'] },
    ],
  },
  {
    attribute: 'for',
    element: 'label',
    property: 'htmlFor',
    cells: ['반영', '문자열', "''"],
    source: 'label의 htmlFor 반영 규칙',
    evidence: [{ example: 'reflect', lines: ['tag hint nick', 'hint error email'] }],
  },
  {
    attribute: 'disabled',
    element: 'button',
    property: 'disabled',
    cells: ['반영 (있으면 true, 값은 보지 않는다)', '불리언', 'false'],
    source: '불리언 어트리뷰트의 반영 규칙',
    evidence: [
      { example: 'types', lines: ['true "false"', 'false', '""'] },
      { example: 'missing', lines: ['null false'] },
    ],
  },
  {
    attribute: 'maxlength',
    element: '텍스트 입력',
    property: 'maxLength',
    cells: ['반영 (음이 아닌 정수로 해석)', '숫자', '-1'],
    source: '음이 아닌 정수 반영 규칙',
    evidence: [
      { example: 'types', lines: ['number 4 string', '-1'] },
      { example: 'missing', lines: ['null -1'] },
    ],
  },
  {
    attribute: 'href',
    element: 'a',
    property: 'href',
    cells: [
      '쓰기는 반영, 읽기는 어트리뷰트를 URL로 해석',
      '문자열 (해석할 수 있으면 절대 URL)',
      "''",
    ],
    source: 'HTMLHyperlinkElementUtils.href',
    evidence: [
      { example: 'types', lines: ['help.html http://example.test/help.html'] },
      { example: 'missing', lines: ['null ""'] },
    ],
  },
  {
    attribute: 'data-item-id',
    element: '모든 HTML 요소',
    property: 'dataset.itemId',
    cells: ['DOMStringMap이 이름을 바꿔 어트리뷰트를 읽고 쓴다', '문자열', 'undefined'],
    source: 'dataset과 DOMStringMap의 이름 변환',
    evidence: [{ example: 'dataset', lines: ['42 string', 'false undefined'] }],
  },
  {
    attribute: 'color',
    element: '비표준, div',
    property: '없음',
    cells: ['대응 프로퍼티 없음', '—', 'undefined'],
    source: 'Web IDL 어트리뷰트가 없는 이름은 프로퍼티가 되지 않음',
    evidence: [{ example: 'custom', lines: ['red undefined', 'big false null'] }],
  },
]
