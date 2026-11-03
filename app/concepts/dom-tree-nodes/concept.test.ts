import { describe, expect, it } from 'vitest'
import { concept } from './meta'
import { isWhitespaceOnly, parseNodeLines, type TreeNode } from './node-tree'

const example = (id: string) => concept.examples.find((e) => e.id === id)!.expectedOutput

function flatten(node: TreeNode): TreeNode[] {
  return [node, ...node.children.flatMap(flatten)]
}

function find(node: TreeNode, name: string): TreeNode {
  const found = flatten(node).find((n) => n.name === name)
  if (!found) throw new Error(`노드 없음: ${name}`)
  return found
}

describe('dom-tree-nodes 트리 예제', () => {
  const root = parseNodeLines(example('tree'))
  const all = flatten(root)

  it('노드 23개와 종류별 개수', () => {
    expect(all).toHaveLength(23)
    const kinds = (k: string) => all.filter((n) => n.kind === k).length
    expect(kinds('document')).toBe(1)
    expect(kinds('doctype')).toBe(1)
    expect(kinds('element')).toBe(8)
    expect(kinds('text')).toBe(12)
    expect(kinds('comment')).toBe(1)
  })

  it('HTML 요소의 자식은 HEAD, 텍스트, BODY', () => {
    expect(find(root, 'HTML').children.map((n) => n.name)).toEqual(['HEAD', '#text', 'BODY'])
  })

  it('HEAD는 텍스트로 시작하고 BODY는 "\\n\\n\\n" 텍스트로 끝난다', () => {
    expect(find(root, 'HEAD').children[0].name).toBe('#text')
    const last = find(root, 'BODY').children.at(-1)!
    expect(last.name).toBe('#text')
    expect(last.value).toBe('\n\n\n')
  })

  it('UL은 텍스트·LI·텍스트·LI·텍스트 5개를 가진다', () => {
    expect(find(root, 'UL').children.map((n) => n.name)).toEqual([
      '#text',
      'LI',
      '#text',
      'LI',
      '#text',
    ])
  })

  it('doctype은 문서의 자식이고 이름은 html', () => {
    expect(root.children[0]).toMatchObject({ name: 'html', kind: 'doctype' })
  })

  it('node-types 예제에서 Attr는 부모가 null이고 childNodes에 없다', () => {
    expect(example('node-types')).toContain('2 class null 1')
  })
})

describe('parseNodeLines 오류', () => {
  it('홀수 들여쓰기에서 throw', () => {
    expect(() => parseNodeLines(['#document', ' html'])).toThrow()
  })

  it('깊이가 2 건너뛰면 throw', () => {
    expect(() => parseNodeLines(['#document', '    HTML'])).toThrow()
  })

  it('깊이 0인 줄이 둘이면 throw', () => {
    expect(() => parseNodeLines(['#document', '#document'])).toThrow()
  })

  it('JSON이 아닌 값에서 throw', () => {
    expect(() => parseNodeLines(['#document', '  #text abc'])).toThrow()
    expect(() => parseNodeLines(['#document', '  #text 123'])).toThrow()
  })

  it('텍스트·주석 노드 아래에 자식이 오면 throw', () => {
    expect(() => parseNodeLines(['#document', '  #text "a"', '    META'])).toThrow()
    expect(() => parseNodeLines(['#document', '  #comment "c"', '    #text "b"'])).toThrow()
  })

  it('첫 줄이 깊이 0이 아니면 throw', () => {
    expect(() => parseNodeLines(['  #document'])).toThrow()
  })
})

describe('isWhitespaceOnly', () => {
  it('공백 문자만 있으면 true', () => {
    expect(isWhitespaceOnly('\n  ')).toBe(true)
    expect(isWhitespaceOnly('사과')).toBe(false)
  })
})
