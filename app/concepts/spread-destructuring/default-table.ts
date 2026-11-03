// 본문 "기본값 표로 정리" 표의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 칸마다 setup 뒤에 probe(짧은 스크립트)를 붙여 새 vm 컨텍스트에서 실행하고, 완료 값(show가 돌려준 문자열)이 result와 같은지 확인한다.
export type Cell = { result: string; probe: string }

export const setup =
  'function show(v) { return typeof v === \'string\' ? "\'" + v + "\'" : String(v); }'

export const columns = [
  { key: 'object', label: "객체 디스트럭처링 { v = 'D' }" },
  { key: 'array', label: "배열 디스트럭처링 [v = 'D']" },
  { key: 'nullish', label: "값 ?? 'D'" },
  { key: 'or', label: "값 || 'D'" },
]

export const rows: { value: string; cells: [Cell, Cell, Cell, Cell] }[] = [
  {
    value: '없음',
    cells: [
      { result: "'D'", probe: "var { v = 'D' } = {}; show(v)" },
      { result: "'D'", probe: "var [v = 'D'] = []; show(v)" },
      { result: "'D'", probe: "show(({}).v ?? 'D')" },
      { result: "'D'", probe: "show(({}).v || 'D')" },
    ],
  },
  {
    value: 'undefined',
    cells: [
      { result: "'D'", probe: "var { v = 'D' } = { v: undefined }; show(v)" },
      { result: "'D'", probe: "var [v = 'D'] = [undefined]; show(v)" },
      { result: "'D'", probe: "show(undefined ?? 'D')" },
      { result: "'D'", probe: "show(undefined || 'D')" },
    ],
  },
  {
    value: 'null',
    cells: [
      { result: 'null', probe: "var { v = 'D' } = { v: null }; show(v)" },
      { result: 'null', probe: "var [v = 'D'] = [null]; show(v)" },
      { result: "'D'", probe: "show(null ?? 'D')" },
      { result: "'D'", probe: "show(null || 'D')" },
    ],
  },
  {
    value: '0',
    cells: [
      { result: '0', probe: "var { v = 'D' } = { v: 0 }; show(v)" },
      { result: '0', probe: "var [v = 'D'] = [0]; show(v)" },
      { result: '0', probe: "show(0 ?? 'D')" },
      { result: "'D'", probe: "show(0 || 'D')" },
    ],
  },
  {
    value: "''",
    cells: [
      { result: "''", probe: "var { v = 'D' } = { v: '' }; show(v)" },
      { result: "''", probe: "var [v = 'D'] = ['']; show(v)" },
      { result: "''", probe: "show('' ?? 'D')" },
      { result: "'D'", probe: "show('' || 'D')" },
    ],
  },
  {
    value: 'false',
    cells: [
      { result: 'false', probe: "var { v = 'D' } = { v: false }; show(v)" },
      { result: 'false', probe: "var [v = 'D'] = [false]; show(v)" },
      { result: 'false', probe: "show(false ?? 'D')" },
      { result: "'D'", probe: "show(false || 'D')" },
    ],
  },
  {
    value: 'NaN',
    cells: [
      { result: 'NaN', probe: "var { v = 'D' } = { v: NaN }; show(v)" },
      { result: 'NaN', probe: "var [v = 'D'] = [NaN]; show(v)" },
      { result: 'NaN', probe: "show(NaN ?? 'D')" },
      { result: "'D'", probe: "show(NaN || 'D')" },
    ],
  },
]
