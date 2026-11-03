import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NodeTreeView } from './NodeTreeView'
import { parseNodeLines } from './node-tree'
import { concept } from './meta'

const treeLines = concept.examples.find((e) => e.id === 'tree')!.expectedOutput

function renderTree() {
  return render(<NodeTreeView root={parseNodeLines(treeLines)} label="예제 트리" />)
}

const count = (text: string) =>
  screen.getAllByRole('listitem').filter((li) => {
    const badge = li.querySelector(':scope > div > span')
    return badge?.textContent === text
  }).length

describe('NodeTreeView', () => {
  it('label이 붙은 영역에 노드마다 listitem 하나를 그린다', () => {
    renderTree()
    const region = screen.getByRole('region', { name: '예제 트리' })
    expect(within(region).getAllByRole('listitem')).toHaveLength(23)
  })

  it('종류 배지 개수가 맞다', () => {
    renderTree()
    expect(count('요소')).toBe(8)
    expect(count('텍스트')).toBe(12)
    expect(count('주석')).toBe(1)
    expect(count('문서')).toBe(1)
    expect(count('문서 유형')).toBe(1)
  })

  it('공백만 있는 텍스트 노드에 공백 배지가 붙는다', () => {
    renderTree()
    expect(screen.getAllByText('공백')).toHaveLength(10)
  })

  it('BODY의 마지막 자식 텍스트 값을 JSON 문자열로 보인다', () => {
    renderTree()
    const body = screen
      .getAllByRole('listitem')
      .find((li) => li.querySelector(':scope > div code')?.textContent === 'BODY')!
    const kids = within(body).getAllByRole('listitem')
    const last = Array.from(body.querySelectorAll(':scope > ul > li')).at(-1)!
    expect(kids.length).toBeGreaterThan(0)
    expect(last).toHaveTextContent('#text')
    expect(last).toHaveTextContent('"\\n\\n\\n"')
  })
})
