// 본문 "모드 비교표"의 데이터. content.mdx와 concept.test.ts가 함께 쓴다(본문 표와 검증이 어긋나지 않게).
// 행마다 evidence는 예제 id와 그 예제의 expectedOutput에 이 순서대로(연속하지 않아도 된다) 나타나야 하는 출력 줄을 가리킨다.
// expectedOutput 자체는 tests/examples.test.ts가 실제 Chromium에서 실행해 대조한다.
// 출력으로 직접 보이지 않는 칸(보통 script·동적 script의 DOMContentLoaded 칸)은 HTML 표준의 단계(prepare the script element, the end)에서 가져왔다.
// mode는 본문에서 <code>로 보이는 코드이고, note는 그 뒤에 붙는 일반 글이다.
export const columns: { key: string; label: string }[] = [
  { key: 'parser', label: '받는 동안 파서는' },
  { key: 'when', label: '실행 시점' },
  { key: 'order', label: '여러 개일 때 순서' },
  { key: 'dcl', label: 'DOMContentLoaded가 기다리나' },
]

export const rows: {
  mode: string
  note?: string
  cells: [string, string, string, string]
  evidence: { example: string; lines: string[] }
}[] = [
  {
    mode: '<script src>',
    cells: ['멈추고 기다린다', '받는 즉시 그 자리에서', '문서 순서', '예 (파싱 중에 실행된다)'],
    evidence: { example: 'parser-blocking', lines: ['head.js true', 'middle.js 1', 'inline 2'] },
  },
  {
    mode: '<script defer src>',
    cells: ['기다리지 않는다', '파싱이 끝난 뒤', '문서 순서 (받은 순서와 무관)', '예'],
    evidence: {
      example: 'defer-order',
      lines: [
        'inline loading',
        'first.js interactive 1',
        'second.js interactive',
        'DOMContentLoaded',
      ],
    },
  },
  {
    mode: '<script async src>',
    cells: ['기다리지 않는다', '받는 대로', '받은 순서', '아니요 (load는 기다린다)'],
    evidence: { example: 'async-order', lines: ['DOMContentLoaded', 'fast.js', 'slow.js', 'load'] },
  },
  {
    mode: '<script async defer src>',
    cells: ['기다리지 않는다', '받는 대로 (async와 같다)', '받은 순서', '아니요'],
    evidence: { example: 'async-and-defer', lines: ['defer-only.js', 'both.js'] },
  },
  {
    mode: '<script defer>',
    note: '인라인',
    cells: ['받을 것이 없어 그 자리에서 실행', '즉시', '문서 순서', '예'],
    evidence: { example: 'inline-defer', lines: ['inline defer loading 0', 'DOMContentLoaded'] },
  },
  {
    mode: "createElement('script')",
    note: '외부 스크립트(src), 기본값',
    cells: ['해당 없음 (파서가 넣지 않는다)', '받는 대로', '받은 순서', '아니요'],
    evidence: { example: 'dynamic-async', lines: ['true true', 'fast.js', 'slow.js'] },
  },
  {
    mode: 'script.async = false',
    note: '동적으로 만든 외부 스크립트',
    cells: ['해당 없음 (파서가 넣지 않는다)', '받은 뒤 넣은 순서대로', '넣은 순서', '아니요'],
    evidence: { example: 'dynamic-in-order', lines: ['false false', 'slow.js', 'fast.js'] },
  },
  {
    mode: 'script.defer = true',
    note: '동적으로 만든 외부 스크립트',
    cells: [
      '해당 없음 (파서가 넣지 않는다)',
      '받는 대로 (defer는 무시된다)',
      '받은 순서',
      '아니요',
    ],
    evidence: { example: 'dynamic-defer', lines: ['true true true true', 'fast.js', 'slow.js'] },
  },
  {
    mode: "createElement('script')",
    note: '인라인 (src 없이 textContent)',
    cells: [
      '해당 없음 (파서가 넣지 않는다)',
      '문서에 붙이는 즉시',
      '붙인 순서 (붙일 때마다 바로 실행)',
      '해당 없음 (붙이는 시점에 실행)',
    ],
    evidence: { example: 'inner-html', lines: ['createElement', 'end'] },
  },
  {
    mode: 'innerHTML',
    note: '로 넣은 script',
    cells: ['실행되지 않는다', '실행되지 않는다', '—', '—'],
    evidence: { example: 'inner-html', lines: ['1', 'end'] },
  },
]
