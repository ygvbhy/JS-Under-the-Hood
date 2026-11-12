import { join } from 'node:path'
import { runInContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { exampleContext, tableBody } from './helpers/expression-tables'

// 식 → 결과 표 helper 단위 테스트. 개별 표의 대조는 각 concept.test.ts가 맡는다.

const table = (head: string[], rows: string[][]) =>
  [
    '<table>',
    `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`,
    '<tbody>',
    ...rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table>',
  ].join('\n')

const header = ['식', '결과']

describe('tableBody', () => {
  it('머리 행이 같은 표가 하나면 머리 행을 뺀 본문 행을 돌려준다', () => {
    const mdx = [
      table(['다른', '표'], [['x', 'y']]),
      table(header, [
        ['<code>1 + 1</code>', '<code>2</code>'],
        ['<code>2 * 3</code>', '<code>6</code>'],
      ]),
    ].join('\n\n')
    expect(tableBody(mdx, header)).toEqual([
      ['1 + 1', '2'],
      ['2 * 3', '6'],
    ])
  })

  it('머리 행이 같은 표가 없으면 던진다', () => {
    const mdx = table(['식', '값'], [['a', 'b']])
    expect(() => tableBody(mdx, header)).toThrow(/식 \| 결과.*0개/)
  })

  it('머리 행이 같은 표가 둘이면 던진다', () => {
    const mdx = [table(header, [['a', 'b']]), table(header, [['c', 'd']])].join('\n\n')
    expect(() => tableBody(mdx, header)).toThrow(/식 \| 결과.*2개/)
  })

  it('머리 행의 칸 수가 다르면 같은 표로 보지 않는다', () => {
    const mdx = table(['식', '결과', '이유'], [['a', 'b', 'c']])
    expect(() => tableBody(mdx, header)).toThrow(/0개/)
  })

  it('{rows.map(...)}으로 그리는 데이터 표는 세지 않는다', () => {
    const dataTable = [
      '<table>',
      '<thead><tr><th>식</th><th>결과</th></tr></thead>',
      '<tbody>',
      '{rows.map((r) => (<tr key={r.expr}><td>{r.expr}</td><td>{r.result}</td></tr>))}',
      '</tbody>',
      '</table>',
    ].join('\n')
    const mdx = [dataTable, table(header, [['a', 'b']])].join('\n\n')
    expect(tableBody(mdx, header)).toEqual([['a', 'b']])
  })
})

describe('exampleContext', () => {
  it('예제를 실행하고(console.log 호출 포함) 최상위 const를 컨텍스트에 남긴다', () => {
    const dir = join(process.cwd(), 'app/concepts/equality-operators/examples')
    const ctx = exampleContext(dir, ['objects.js'])
    expect(runInContext('p.n', ctx)).toBe(1)
  })
})
